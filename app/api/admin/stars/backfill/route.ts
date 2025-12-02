import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";
import { createPublicClient, http } from "viem";
import { somniaMainnet } from "@/lib/chains";

export const runtime = "nodejs";

type Body = {
  token?: string;
  fromBlock?: number;
  toBlock?: number;
  batchBlocks?: number;
  contract?: `0x${string}`;
};

const ERC1155_TS = [{
  type: 'event',
  name: 'TransferSingle',
  inputs: [
    { name: 'operator', type: 'address', indexed: true },
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'id', type: 'uint256', indexed: false },
    { name: 'value', type: 'uint256', indexed: false },
  ],
}] as const;

export async function POST(req: Request){
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const token = String(body.token || "");
    const required = process.env.ADMIN_TOKEN;
    if (required && token !== required){
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const envAddr = (process.env.NEXT_PUBLIC_STARS_1155_ADDRESS || "") as `0x${string}` | "";
    const contract = (body.contract || envAddr || "") as `0x${string}` | "";
    if (!/^0x[0-9a-fA-F]{40}$/.test(contract)){
      return NextResponse.json({ error: "bad_contract_address" }, { status: 400 });
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.infra.mainnet.somnia.network/';
    const client = createPublicClient({ chain: somniaMainnet, transport: http(rpcUrl) });
    const latest = await client.getBlockNumber();
    const fromBlock = BigInt(Number.isFinite(body.fromBlock) && (body.fromBlock as number) >= 0 ? Math.floor(body.fromBlock as number) : 0);
    const toBlock = BigInt(Number.isFinite(body.toBlock) && (body.toBlock as number) > 0 ? Math.floor(body.toBlock as number) : Number(latest));
    const step = BigInt(Math.max(10000, Math.min(200000, Math.floor((body.batchBlocks as number) || 50000))));
    const ZERO = '0x0000000000000000000000000000000000000000' as const;

    const totals = new Map<string, bigint>();
    let scanned = 0n;
    let rangeStart = fromBlock;
    while (rangeStart <= toBlock) {
      const rangeEnd = rangeStart + step - 1n <= toBlock ? (rangeStart + step - 1n) : toBlock;
      // Fetch all mints in this range (from=0x0), any recipient; id/value parsed in args
      const logs = await client.getLogs({
        address: contract,
        event: ERC1155_TS[0],
        args: { from: ZERO },
        fromBlock: rangeStart,
        toBlock: rangeEnd,
      });
      for (const l of logs) {
        const args = (l as any)?.args as { to?: `0x${string}`; id?: bigint; value?: bigint } | undefined;
        const to = (args?.to || "").toLowerCase();
        const id = args?.id;
        const value = args?.value;
        if (!/^0x[0-9a-f]{40}$/.test(to)) continue;
        if (typeof id !== "bigint" || id !== 1n) continue;
        if (typeof value !== "bigint" || value <= 0n) continue;
        totals.set(to, (totals.get(to) || 0n) + value);
      }
      scanned += (rangeEnd - rangeStart + 1n);
      rangeStart = rangeEnd + 1n;
    }

    // Write results to Redis: mark minted and set minted_total
    const cmds: (string|number)[][] = [];
    for (const [addr, amount] of totals.entries()){
      cmds.push(["SET", `user:stars_onchain_minted:${addr}`, "1"]);
      cmds.push(["SET", `user:stars_minted:${addr}`, amount.toString()]);
    }
    if (cmds.length > 0){
      await pipeline(cmds);
    }

    return NextResponse.json({
      ok: true,
      contract,
      fromBlock: Number(fromBlock),
      toBlock: Number(toBlock),
      scannedBlocks: Number(scanned),
      uniqueMinters: totals.size,
      totalMinted: Array.from(totals.values()).reduce((a, b) => a + Number(b), 0),
      sample: Array.from(totals.entries()).slice(0, 10).map(([a, v]) => ({ address: a, amount: v.toString() })),
    });
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : 'failed';
    return NextResponse.json({ error: 'failed', detail: msg }, { status: 500 });
  }
}


