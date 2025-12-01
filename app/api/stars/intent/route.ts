import { NextResponse } from 'next/server';
import { pipeline } from '@/lib/redis';
import { keccak256, toHex, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaMainnet } from '@/lib/chains';
import { STARS_1155_ADDRESS } from '@/lib/contracts';

export const runtime = 'nodejs';

function isLowercaseHexAddress(a: string): boolean { return /^0x[0-9a-f]{40}$/.test(a); }

// Quick-response denylist (extendable via env var STARS_MINT_DENYLIST=0xabc,...)
const ENV_DENY = String(process.env.STARS_MINT_DENYLIST || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
const DENYLIST = new Set<string>([
  // Abusive wallet reported
  '0x47feb547a5ce00e2c9cbb89d97bbac9cc9b5942c',
  '0xe93cb912eac49170fed9e2cdbd3eaca780130200',
  '0x2907d5eed42a9d7f3723aa3aa1e32bb707708150',
  ...ENV_DENY,
]);

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

    // Immediate block for denylisted addresses
    if (DENYLIST.has(address)) {
      return NextResponse.json({ error: 'NOT_ELIGIBLE' }, { status: 403 });
    }

    // Soft lock: if a recent signature was already issued, reuse the last intent payload (idempotency window)
    try {
      const signedOnceRes = await pipeline([
        ["GET", `user:stars_signed_once:${address}`],
        ["GET", `user:stars_last_intent:${address}`],
      ]);
      const norm = (signedOnceRes as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
      let hasLock = false;
      let lastIntentJson: string | null = null;
      if (Array.isArray(norm)) {
        const v0 = norm[0]?.result as unknown;
        const v1 = norm[1]?.result as unknown;
        hasLock = String(v0 || '').length > 0;
        lastIntentJson = (typeof v1 === 'string') ? v1 : (v1 != null ? String(v1) : null);
      } else if (norm && Array.isArray(norm.result)) {
        const bucket = norm.result[0]?.result as unknown;
        if (Array.isArray(bucket)) {
          const v0 = bucket?.[0] as unknown;
          const v1 = bucket?.[1] as unknown;
          hasLock = String(v0 || '').length > 0;
          lastIntentJson = (typeof v1 === 'string') ? v1 : (v1 != null ? String(v1) : null);
        }
      }
      if (hasLock) {
        try {
          if (lastIntentJson) {
            const parsed = JSON.parse(lastIntentJson) as { id: number; amount: number; nonce: number; deadline: number; signature: string };
            const payload: Record<string, unknown> = { id: parsed.id, amount: parsed.amount, nonce: parsed.nonce, deadline: parsed.deadline, signature: parsed.signature };
            if (debug) payload.debug = { mode: 'reuse', reason: 'signed_once_flag', source: 'last_intent' };
            return NextResponse.json(payload);
          }
        } catch { /* fallthrough to not eligible */ }
        const payload: Record<string, unknown> = { error: 'NOT_ELIGIBLE' };
        if (debug) payload.debug = { reason: 'signed_once_flag' };
        return NextResponse.json(payload, { status: 400 });
      }
    } catch { /* ignore */ }

    // Read server-side minted_total first; if >0 — block immediately
    let mintedTotal = 0;
    try {
      const m = await pipeline([["GET", `user:stars_minted:${address}`]]);
      const rawM = (m as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
      if (Array.isArray(rawM)) {
        const v = rawM[0]?.result as unknown;
        mintedTotal = typeof v === 'number' ? v : Number(v || 0) || 0;
      } else if (rawM && Array.isArray(rawM.result)) {
        const bucket = rawM.result[0]?.result as unknown;
        mintedTotal = typeof bucket === 'number' ? bucket : Number(bucket || 0) || 0;
      }
    } catch { mintedTotal = 0; }
    if (mintedTotal > 0){
      const payload: Record<string, unknown> = { error: 'NOT_ELIGIBLE' };
      if (debug) payload.debug = { reason: 'minted_once', mintedTotal };
      return NextResponse.json(payload, { status: 400 });
    }

    // On-chain history check (minted once by logs), resilient to transfers-out
    if (STARS_1155_ADDRESS) {
      try {
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.infra.mainnet.somnia.network/';
        const client = createPublicClient({ chain: somniaMainnet, transport: http(rpcUrl) });
        const fromBlockEnv = String(process.env.MINT_SCAN_FROM_BLOCK || '').trim();
        const fromBlock = (/^\d+$/.test(fromBlockEnv) ? BigInt(fromBlockEnv) : 0n);
        const ZERO = '0x0000000000000000000000000000000000000000';
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
        const logs = await client.getLogs({
          address: STARS_1155_ADDRESS as `0x${string}`,
          event: ERC1155_TS[0],
          args: { from: ZERO as `0x${string}`, to: address as `0x${string}` },
          fromBlock,
        });
        let mintedFromLogs = 0n;
        for (const l of logs) {
          // id is non-indexed; viem parsed args available when using event filter
          const id = (l as any)?.args?.id as bigint | undefined;
          const val = (l as any)?.args?.value as bigint | undefined;
          if (typeof id === 'bigint' && id === 1n && typeof val === 'bigint' && val > 0n){
            mintedFromLogs += val;
          }
        }
        if (mintedFromLogs > 0n) {
          try {
            await pipeline([
              ["SET", `user:stars_onchain_minted:${address}`, "1"],
              ["SET", `user:stars_minted:${address}`, String(mintedFromLogs)],
            ]);
          } catch {}
          const payload: Record<string, unknown> = { error: 'NOT_ELIGIBLE' };
          if (debug) payload.debug = { reason: 'onchain_minted_history', amount: mintedFromLogs.toString() };
          return NextResponse.json(payload, { status: 400 });
        }
      } catch { /* ignore RPC errors */ }
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

    // Sum active reservations to prevent concurrent intents (keys with TTL per nonce)
    let reservedTotal = 0;
    try {
      // read active nonce set
      const members = await pipeline([["SMEMBERS", `user:stars_resv_nonces:${address}`]]);
      const rawM = (members as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
      let nonces: string[] = [];
      if (Array.isArray(rawM)) {
        const arr = rawM[0]?.result as unknown;
        if (Array.isArray(arr)) nonces = (arr as unknown[]).map(String);
      } else if (rawM && Array.isArray(rawM.result)) {
        const bucket = rawM.result[0]?.result as unknown;
        if (Array.isArray(bucket)) nonces = (bucket as unknown[]).map(String);
      }
      if (nonces.length > 0) {
        const cmds: (string|number)[][] = nonces.map((n) => ["GET", `user:stars_resv:${address}:${n}`]);
        const vals = await pipeline(cmds);
        // normalize results array
        const normalize = (vals as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
        const expired: string[] = [];
        if (Array.isArray(normalize)) {
          for (let i = 0; i < nonces.length; i++) {
            const v = normalize[i]?.result as unknown;
            const ni = nonces[i];
            if (v == null) { if (ni) expired.push(ni); continue; }
            const n = typeof v === 'number' ? v : Number(v || 0) || 0;
            reservedTotal += n;
          }
        } else if (normalize && Array.isArray(normalize.result)) {
          const bucket = normalize.result[0]?.result as unknown;
          if (Array.isArray(bucket)) {
            for (let i = 0; i < nonces.length; i++) {
              const v = bucket[i] as unknown;
              const ni = nonces[i];
              if (v == null) { if (ni) expired.push(ni); continue; }
              const n = typeof v === 'number' ? v : Number(v || 0) || 0;
              reservedTotal += n;
            }
          }
        }
        // cleanup expired
        if (expired.length > 0) {
          const delCmds: (string|number)[][] = expired.map((n) => ["SREM", `user:stars_resv_nonces:${address}`, n]);
          await pipeline(delCmds);
        }
      }
    } catch { reservedTotal = 0; }

    // If минт уже был хотя бы раз — блокируем повторный
    if (mintedTotal > 0){
      const payload: Record<string, unknown> = { error: 'NOT_ELIGIBLE' };
      if (debug) payload.debug = { reason: 'minted_once', totalStars, mintedTotal };
      return NextResponse.json(payload, { status: 400 });
    }

    let remaining = Math.max(0, totalStars - reservedTotal);
    // Defensive clamp to prevent pathological amounts due to parsing errors
    const CLAMP_MAX = 50;
    if (remaining > CLAMP_MAX) remaining = CLAMP_MAX;
    if (cap !== undefined) remaining = Math.min(remaining, cap);

    if (remaining <= 0){
      const payload: Record<string, unknown> = { error: 'NOT_ELIGIBLE' };
      if (debug) payload.debug = { source: 'redis+minted_total', totalStars, mintedTotal, remaining };
      return NextResponse.json(payload, { status: 400 });
    }

    const useRealSign = Boolean(process.env.SIGNER_PRIVATE_KEY && STARS_1155_ADDRESS);

    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 300; // 5 min
    const nonceBig = BigInt.asUintN(32, BigInt(keccak256(toHex(`${address}:${id}:${remaining}:${now}`))));
    const nonce = Number(nonceBig);

    // Reserve remaining for this nonce for the duration of the deadline (+ grace)
    try {
      const ttl = Math.max(60, Math.min(900, (deadline - now) + 60));
      await pipeline([
        ["SADD", `user:stars_resv_nonces:${address}`, String(nonce)],
        ["SET", `user:stars_resv:${address}:${nonce}`, String(remaining), "EX", String(ttl)],
      ]);
    } catch { /* non-fatal */ }

    if (!useRealSign){
      const payload: Record<string, unknown> = { id, amount: remaining, nonce, deadline, signature: '0x' };
      if (debug) payload.debug = { mode: 'dev', contract: STARS_1155_ADDRESS, chainId: somniaMainnet.id, totalStars, mintedTotal, reservedTotal, remaining };
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
    // Mark that a signature was issued for this wallet (temporary lock) and store last intent for idempotent reuse
    try {
      const nowTs = Math.floor(Date.now() / 1000);
      const ttl = Math.max(120, Math.min(1800, (Number(message.deadline) - nowTs) + 120)); // deadline + 2m grace, bounded
      const payloadToStore = JSON.stringify({ id, amount: remaining, nonce, deadline, signature });
      await pipeline([
        ["SET", `user:stars_signed_once:${address}`, "1", "EX", String(ttl)],
        ["SET", `user:stars_last_intent:${address}`, payloadToStore, "EX", String(ttl)],
      ]);
    } catch {}
    const payload: Record<string, unknown> = { id, amount: remaining, nonce, deadline, signature };
    if (debug) payload.debug = { mode: 'prod', signer: account.address, contract: STARS_1155_ADDRESS, chainId: somniaMainnet.id, totalStars, mintedTotal, reservedTotal, remaining };
    return NextResponse.json(payload);
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : 'unknown_error';
    console.error('stars/intent error:', msg);
    return NextResponse.json({ error: 'INTERNAL', detail: msg }, { status: 500 });
  }
}


