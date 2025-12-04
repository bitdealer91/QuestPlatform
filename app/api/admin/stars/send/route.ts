import { NextResponse } from 'next/server';
import { pipeline } from '@/lib/redis';
import { somniaMainnet } from '@/lib/chains';
import { STARS_1155_ADDRESS, STARS_ABI } from '@/lib/contracts';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const runtime = 'nodejs';

type Body = {
  token?: string;
  address?: string;
  amount?: number;
  id?: number;
  wait?: boolean;
};

function isLowercaseAddress(a: string): boolean {
  return /^0x[0-9a-f]{40}$/.test(a);
}

export async function POST(req: Request){
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const token = String(body.token || '');
    const required = process.env.ADMIN_TOKEN;
    if (required && token !== required){
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const toRaw = String(body.address || '').toLowerCase();
    const id = Number.isInteger(body.id) && (body.id as number) > 0 ? Math.floor(body.id as number) : 1;
    const amtIn = Number(body.amount || 0);
    const amount = Number.isFinite(amtIn) && amtIn > 0 ? Math.min(Math.floor(amtIn), 50) : 0;
    const wait = Boolean(body.wait);
    if (!isLowercaseAddress(toRaw) || amount <= 0){
      return NextResponse.json({ error: 'bad_params' }, { status: 400 });
    }
    if (!STARS_1155_ADDRESS){
      return NextResponse.json({ error: 'no_contract' }, { status: 400 });
    }

    const signerPk = String(process.env.SIGNER_PRIVATE_KEY || '').trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(signerPk)){
      return NextResponse.json({ error: 'bad_signer_pk' }, { status: 400 });
    }
    const relayerPk = String(process.env.RELAYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || '').trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(relayerPk)){
      return NextResponse.json({ error: 'bad_relayer_pk' }, { status: 400 });
    }

    // Note: do not block if minted_total > 0 — caller (batch) computes delta to reach total entitlement.

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.infra.mainnet.somnia.network/';
    const publicClient = createPublicClient({ chain: somniaMainnet, transport: http(rpcUrl) });

    // Build EIP-712 signature (same as intent)
    const signer = privateKeyToAccount(signerPk as `0x${string}`);
    const domain = {
      name: 'OdysseyStars',
      version: '1',
      chainId: somniaMainnet.id,
      verifyingContract: STARS_1155_ADDRESS as `0x${string}`,
    } as const;
    const types = {
      Mint: [
        { name: 'to', type: 'address' },
        { name: 'id', type: 'uint256' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    } as const;
    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 300; // 5 min
    const nonce = Number(BigInt.asUintN(32, BigInt(`0x${Buffer.from(`${toRaw}:${id}:${amount}:${now}`).toString('hex')}`)));
    const message = {
      to: toRaw as `0x${string}`,
      id: BigInt(id),
      amount: BigInt(amount),
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
      chainId: BigInt(somniaMainnet.id),
      verifyingContract: STARS_1155_ADDRESS as `0x${string}`,
    } as const;
    const signature = await signer.signTypedData({ domain, types, primaryType: 'Mint', message });

    // Prepare relayer and send tx
    const relayer = privateKeyToAccount(relayerPk as `0x${string}`);
    const walletClient = createWalletClient({
      chain: somniaMainnet,
      transport: http(rpcUrl),
      account: relayer,
    });

    // Optional: simulate for clearer errors
    await publicClient.simulateContract({
      abi: STARS_ABI,
      address: STARS_1155_ADDRESS as `0x${string}`,
      functionName: 'mintWithSig',
      args: [toRaw as `0x${string}`, BigInt(id), BigInt(amount), BigInt(nonce), BigInt(deadline), signature as `0x${string}`],
      account: relayer.address as `0x${string}`,
    });

    const hash = await walletClient.writeContract({
      abi: STARS_ABI,
      address: STARS_1155_ADDRESS as `0x${string}`,
      functionName: 'mintWithSig',
      args: [toRaw as `0x${string}`, BigInt(id), BigInt(amount), BigInt(nonce), BigInt(deadline), signature as `0x${string}`],
      account: relayer,
    });

    if (wait) {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      if (!receipt || receipt.status !== 'success'){
        return NextResponse.json({ error: 'tx_failed', hash }, { status: 500 });
      }
    }

    // Update Redis records
    try {
      await pipeline([
        ["SADD", `user:stars_tx:${toRaw}`, hash],
        ["INCRBY", `user:stars_minted:${toRaw}`, String(amount)],
        ["DEL", `user:stars_signed_once:${toRaw}`],
        ["DEL", `user:stars_last_intent:${toRaw}`],
      ]);
    } catch { /* ignore */ }

    return NextResponse.json({ ok: true, hash, to: toRaw, amount, id, deadline, nonce });
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : 'failed';
    return NextResponse.json({ error: 'failed', detail: msg }, { status: 500 });
  }
}


