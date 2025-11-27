import { NextResponse } from 'next/server';
import { pipeline } from '@/lib/redis';
import { STARS_1155_ADDRESS } from '@/lib/contracts';
import { createPublicClient, http, decodeEventLog } from 'viem';
import { somniaMainnet } from '@/lib/chains';

export const runtime = 'nodejs';

type Body = { address?: string; txHash?: string };

const ERC1155_ABI = [
  {
    type: 'event',
    name: 'TransferSingle',
    inputs: [
      { name: 'operator', type: 'address', indexed: true },
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'id', type: 'uint256', indexed: false },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;

function isHexLike(s: string): boolean {
  return /^0x[0-9a-fA-F]+$/.test(s);
}

export async function POST(req: Request){
  try {
    const raw = await req.json().catch(() => ({}));
    const address = String(raw?.address || '').toLowerCase();
    const txHash = String(raw?.txHash || '');
    if (!/^0x[0-9a-f]{40}$/.test(address) || !isHexLike(txHash) || !STARS_1155_ADDRESS){
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    // Avoid double counting
    try {
      const seen = await pipeline([["SISMEMBER", `user:stars_tx:${address}`, txHash]]);
      const sraw = (seen as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
      let already = false;
      if (Array.isArray(sraw)) {
        already = Boolean(Number((sraw[0]?.result as number | string | undefined) || 0));
      } else if (sraw && Array.isArray(sraw.result)) {
        const bucket = sraw.result[0]?.result as unknown;
        already = Boolean(Number((bucket as number | string | undefined) || 0));
      }
      if (already) {
        return NextResponse.json({ ok: true, note: 'already_confirmed' });
      }
    } catch { /* ignore */ }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.infra.mainnet.somnia.network/';
    const client = createPublicClient({ chain: somniaMainnet, transport: http(rpcUrl) });
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt || receipt.status !== 'success') {
      return NextResponse.json({ error: 'not_success' }, { status: 400 });
    }

    // Sum value for TransferSingle with to==address, id==1, contract==STARS_1155_ADDRESS
    let minted = 0n;
    for (const log of receipt.logs) {
      if ((log.address?.toLowerCase() || '') !== String(STARS_1155_ADDRESS).toLowerCase()) continue;
      try {
        const parsed = decodeEventLog({ abi: ERC1155_ABI, data: log.data, topics: log.topics as unknown as `0x${string}`[] });
        if (parsed.eventName === 'TransferSingle') {
          const { from, to, id, value } = parsed.args as unknown as { operator: `0x${string}`; from: `0x${string}`; to: `0x${string}`; id: bigint; value: bigint };
          if (to.toLowerCase() === address && from.toLowerCase() === '0x0000000000000000000000000000000000000000' && id === 1n) {
            minted += value;
          }
        }
      } catch { /* non-matching log */ }
    }

    if (minted <= 0n) {
      return NextResponse.json({ error: 'no_mint_found' }, { status: 400 });
    }

    // Record minted_total and tx hash
    await pipeline([
      ["SADD", `user:stars_tx:${address}`, txHash],
      ["INCRBY", `user:stars_minted:${address}`, String(minted)],
    ]);

    return NextResponse.json({ ok: true, minted: Number(minted) });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


