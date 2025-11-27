import { NextResponse } from 'next/server';
import { pipeline } from '@/lib/redis';
import { keccak256, toHex, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaMainnet } from '@/lib/chains';
import { STARS_1155_ADDRESS } from '@/lib/contracts';

export const runtime = 'nodejs';

function isLowercaseHexAddress(a: string): boolean { return /^0x[0-9a-f]{40}$/.test(a); }

export async function POST(req: Request){
  try {
    const body = await req.json().catch(() => ({}));
    const addressRaw = String(body?.address || '').trim();
    const address = addressRaw.toLowerCase();
    const id = Number(body?.id || 1); // token id for stars, default 1
    const debug = /^(1|true)$/i.test(String((body?.debug ?? '') || ''));
    const capRaw = Number(body?.cap ?? NaN);
    const cap = Number.isFinite(capRaw) && capRaw > 0 ? Math.floor(capRaw) : undefined;
    if (!isLowercaseHexAddress(address) || !Number.isInteger(id) || id < 1){
      return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 });
    }

    // Compute total stars from Redis (SCARD across weeks 1..8)
    const cmds: (string|number)[][] = [];
    for (let w = 1; w <= 8; w++){ cmds.push(["SCARD", `user:stars:${address}:${w}`]); }
    const res = await pipeline(cmds);
    let totalStars = 0;
    try {
      const raw = (res as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
      if (Array.isArray(raw)) {
        for (let i = 0; i < 8; i++){
          const v = raw[i]?.result as unknown;
          totalStars += (typeof v === 'number' ? v : Number(v || 0) || 0);
        }
      } else if (raw && Array.isArray(raw.result)) {
        const bucket = raw.result[0]?.result as unknown;
        if (Array.isArray(bucket)) {
          for (let i = 0; i < 8; i++){
            const v = bucket[i] as unknown;
            totalStars += (typeof v === 'number' ? v : Number(v || 0) || 0);
          }
        }
      }
    } catch { totalStars = 0; }

    // Subtract already minted on-chain balance to avoid over-mint and large amounts
    let chainBal = 0n;
    try {
      if (STARS_1155_ADDRESS) {
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.infra.mainnet.somnia.network/';
        const client = createPublicClient({ transport: http(rpcUrl) });
        // minimal ABI
        const balanceAbi = [{ type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] }] as const;
        chainBal = await client.readContract({ abi: balanceAbi, address: STARS_1155_ADDRESS as `0x${string}`, functionName: 'balanceOf', args: [address as `0x${string}`, 1n] }) as unknown as bigint;
      }
    } catch { chainBal = 0n; }

    let remaining = Math.max(0, totalStars - Number(chainBal));
    // Defensive clamp to prevent pathological amounts due to parsing errors
    const CLAMP_MAX = 50;
    if (remaining > CLAMP_MAX) remaining = CLAMP_MAX;
    if (cap !== undefined) remaining = Math.min(remaining, cap);

    if (remaining <= 0){
      const payload: Record<string, unknown> = { error: 'NOT_ELIGIBLE' };
      if (debug) payload.debug = { source: 'redis+chain', totalStars, chainBal: chainBal.toString(), remaining };
      return NextResponse.json(payload, { status: 400 });
    }

    const useRealSign = Boolean(process.env.SIGNER_PRIVATE_KEY && STARS_1155_ADDRESS);

    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 300; // 5 min
    const nonceBig = BigInt.asUintN(32, BigInt(keccak256(toHex(`${address}:${id}:${remaining}:${now}`))));
    const nonce = Number(nonceBig);

    if (!useRealSign){
      const payload: Record<string, unknown> = { id, amount: remaining, nonce, deadline, signature: '0x' };
      if (debug) payload.debug = { mode: 'dev', contract: STARS_1155_ADDRESS, chainId: somniaMainnet.id };
      return NextResponse.json(payload);
    }

    const pkRaw = String(process.env.SIGNER_PRIVATE_KEY || '').trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(pkRaw)){
      return NextResponse.json({ error: 'BAD_SIGNER_PRIVATE_KEY' }, { status: 400 });
    }
    const pk = pkRaw as `0x${string}`;
    let account;
    try {
      account = privateKeyToAccount(pk);
    } catch (e) {
      const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : 'signer_init_failed';
      return NextResponse.json({ error: 'SIGNER_INIT_FAILED', detail: msg }, { status: 500 });
    }

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
    const message = {
      to: address as `0x${string}`,
      id: BigInt(id),
      amount: BigInt(remaining),
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
      chainId: BigInt(somniaMainnet.id),
      verifyingContract: STARS_1155_ADDRESS as `0x${string}`,
    } as const;

    const signature = await account.signTypedData({ domain, types, primaryType: 'Mint', message });
    const payload: Record<string, unknown> = { id, amount: remaining, nonce, deadline, signature };
    if (debug) payload.debug = { mode: 'prod', signer: account.address, contract: STARS_1155_ADDRESS, chainId: somniaMainnet.id, totalStars, chainBal: chainBal.toString(), remaining };
    return NextResponse.json(payload);
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : 'unknown_error';
    console.error('stars/intent error:', msg);
    return NextResponse.json({ error: 'INTERNAL', detail: msg }, { status: 500 });
  }
}


