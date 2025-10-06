import { NextResponse } from 'next/server';
import { loadTasks } from '@/lib/store';
import { pipeline } from '@/lib/redis';
import { keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaMainnet } from '@/lib/chains';
import { KEYS_1155_ADDRESS } from '@/lib/contracts';

export const runtime = 'nodejs';

function isLowercaseHexAddress(a: string): boolean { return /^0x[0-9a-f]{40}$/.test(a); }

export async function POST(req: Request){
  try {
    const body = await req.json().catch(() => ({}));
    const addressRaw = String(body?.address || '').trim();
    const address = addressRaw.toLowerCase();
    const week = Number(body?.week || 0);
    const debug = /^(1|true)$/i.test(String((body?.debug ?? '') || ''));
    if (!isLowercaseHexAddress(address) || !Number.isInteger(week) || week < 1){
      return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 });
    }

    const useRealSign = Boolean(process.env.SIGNER_PRIVATE_KEY && KEYS_1155_ADDRESS);
    const useProd = /^(1|true)$/i.test(String(process.env.MINT_USE_PROD_AIRDROP || '1'));
    const prodUrlTmpl = String(process.env.AIRDROP_PERCENT_URL || '').trim();

    // Eligibility via prod airdrop API (preferred)
    let eligible = false;
    let pct = 0;
    if (useProd && prodUrlTmpl) {
      try {
        const finalUrl = prodUrlTmpl.includes(':address')
          ? prodUrlTmpl.replace(':address', addressRaw || address)
          : (prodUrlTmpl.includes('?') ? `${prodUrlTmpl}&address=${addressRaw || address}` : `${prodUrlTmpl}?address=${addressRaw || address}`);
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(finalUrl, { headers: { 'Accept': 'application/json' }, signal: controller.signal });
        clearTimeout(t);
        const j = await res.json().catch(() => ({}));
        const weeks = Array.isArray(j?.weeks) ? j.weeks : [];
        const slot = weeks[week - 1] || { unlockedPercentage: 0 };
        pct = Number(slot?.unlockedPercentage || 0);
        eligible = pct >= 10;
      } catch { /* ignore and fallback */ }
    }
    // Fallback to local mandatory+redis if prod is unavailable
    if (!eligible) {
      const spec = await loadTasks();
      const tasks = (spec.tasks || []).filter(t => (t as any).week === week);
      const mandatoryIds = tasks.filter(t => (t as any).mandatory === true || (t as any)["mandatory task"] === true).map(t => String((t as any).id));
      const redisRes = await pipeline([["SMEMBERS", `user:verified:${address}`]]);
      let verified: string[] = [];
      try {
        const raw = (redisRes as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
        if (Array.isArray(raw)) {
          const bucket = raw[0]?.result as unknown;
          if (Array.isArray(bucket)) verified = (bucket as unknown[]).map(String);
          else if (typeof bucket === 'string') verified = bucket.split(',').map(s => s.trim()).filter(Boolean);
        } else if (raw && Array.isArray(raw.result)) {
          const bucket = raw.result[0]?.result as unknown;
          if (Array.isArray(bucket)) verified = (bucket as unknown[]).map(String);
          else if (typeof bucket === 'string') verified = bucket.split(',').map(s => s.trim()).filter(Boolean);
        }
      } catch { verified = []; }
      const set = new Set(verified);
      eligible = mandatoryIds.length > 0 && mandatoryIds.every(id => set.has(id));
    }
    if (!eligible){
      const payload: Record<string, unknown> = { error: 'NOT_ELIGIBLE' };
      if (debug) payload.debug = { source: useProd && prodUrlTmpl ? 'prod' : 'local', pct };
      return NextResponse.json(payload, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 300; // 5 min
    const nonce = Number(BigInt.asUintN(32, BigInt(keccak256(toHex(`${address}:${week}:${now}`))))) & 0xffffffff;

    if (!useRealSign){
      return NextResponse.json({ id: week, nonce, deadline, signature: '0x' });
    }

    // Real EIP-712 sign using SIGNER_PRIVATE_KEY
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
      name: 'SomniaKeys',
      version: '1',
      chainId: somniaMainnet.id,
      verifyingContract: KEYS_1155_ADDRESS as `0x${string}`,
    } as const;
    const types = {
      Mint: [
        { name: 'to', type: 'address' },
        { name: 'id', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    } as const;
    const message = {
      to: address as `0x${string}`,
      id: BigInt(week),
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
      chainId: BigInt(somniaMainnet.id),
      verifyingContract: KEYS_1155_ADDRESS as `0x${string}`,
    } as const;

    const signature = await account.signTypedData({ domain, types, primaryType: 'Mint', message });
    return NextResponse.json({ id: week, nonce, deadline, signature });
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : 'unknown_error';
    console.error('mint/intent error:', msg);
    return NextResponse.json({ error: 'INTERNAL', detail: msg }, { status: 500 });
  }
}


