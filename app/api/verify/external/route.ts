import { NextResponse } from "next/server";
import { limitIp, limitPair } from "@/lib/rateLimit";
import { coalesce } from "@/lib/inflight";
import { getCache, setCache } from "@/lib/cache";
import { findTask } from "@/lib/store";
import { writeAttempt, writeFailure, writeSuccess } from "@/lib/ledger";
import { pipeline } from "@/lib/redis";
import { dotGet } from "@/lib/jsonPath";
import { createPublicClient, http, parseAbi } from "viem";

export const runtime = "nodejs";

type VerifyBody = { address?: string; taskId?: string; txHash?: string; force?: boolean };

function getBaseUrl(){
  return process.env.W3US_BASE_URL || "https://mainnet.somnia.w3us.site/api/v2";
}

async function postJson(url: string, body: unknown, timeoutMs = 8000){
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return res;
  } finally { clearTimeout(t); }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000){
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally { clearTimeout(t); }
}

// (W3US path uses postJson with timeout)

async function persistSuccess(address: string, taskId: string, xp: number, starWeek?: number){
  // Check if task already verified to avoid double XP
  let already = false;
  try {
    const check = await pipeline([["SISMEMBER", `user:verified:${address}`, taskId]]);
    if (check && Array.isArray(check.result)){
      const maybe = (check.result[0] as { result?: unknown } | undefined)?.result as unknown;
      if (Array.isArray(maybe)) {
        already = Boolean(Number(maybe[0] ?? 0));
      } else {
        already = Boolean(Number(maybe as number | string | undefined || 0));
      }
    }
  } catch {}

  const cmds: (string | number)[][] = [];
  // Always ensure membership and last-seen timestamp
  cmds.push(["SADD", `user:verified:${address}`, taskId]);
  cmds.push(["SET", `user:last:${address}:${taskId}`, String(Date.now()), "EX", "2592000"]);
  // Only grant XP once
  if (!already && xp > 0) {
    cmds.push(["INCRBY", `user:xp:${address}`, String(xp)]);
  }
  if (typeof starWeek === 'number' && starWeek > 0 && starWeek <= 8){
    cmds.push(["SADD", `user:stars:${address}:${starWeek}`, taskId]);
  }
  if (cmds.length > 0) await pipeline(cmds);
}

function cooldownKey(addr: string, taskId?: string){
  return taskId ? `cooldown:${addr}:${taskId}` : `cooldown:${addr}`;
}

export async function POST(req: Request){
  try {
    const raw = await req.json().catch(() => ({}));
    const body = (raw ?? {}) as VerifyBody;
    const addrRaw = String(body.address || "");
    const addr = addrRaw.toLowerCase();
    const taskId = String(body.taskId || "").trim();

    const ipHeader = (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown");
    const ip = (ipHeader.split(",")[0]?.trim() ?? "unknown");
    const ipCheck = await limitIp(ip, 120);
    if (ipCheck.limited){
      return NextResponse.json({ error: "rate_limited", scope: "ip", retryAfter: ipCheck.retryAfter }, { status: 429 });
    }

    if (addr && taskId){
      const pairCheck = await limitPair(`${addr}:${taskId}`, 30);
      if (pairCheck.limited){
        return NextResponse.json({ error: "rate_limited", scope: "pair", retryAfter: pairCheck.retryAfter }, { status: 429 });
      }
      const cd = await getCache(cooldownKey(addr, taskId));
      if (cd != null){
        return NextResponse.json({ error: "cooldown", retryAfter: 60 }, { status: 429 });
      }
    }

    const doVerify = async () => {
      if (addr && taskId) { writeAttempt(addr, taskId).catch(() => {}); }

      // Preload task and verify params if available
      let task: Record<string, unknown> | null = null;
      let vp: Record<string, unknown> = {};
      try {
        task = taskId ? await findTask(taskId) as unknown as Record<string, unknown> : null;
        vp = (task as { verify_params?: Record<string, unknown> } | null)?.verify_params || {} as Record<string, unknown>;
      } catch {}

      // If task defines external verify API, use it first
      try {
        const cfg = (vp as Record<string, unknown>)['verify_api'] as Record<string, unknown> | undefined;
        if (cfg && typeof cfg === 'object'){
          const rawUrl = String(cfg['url'] || '').trim();
          const method = String(cfg['method'] || 'GET').toUpperCase();
          const success = (cfg['success'] || {}) as { path?: string; equals?: unknown };
          // Use the ORIGINAL address casing for external APIs (some providers are case-sensitive)
          const extAddr = addrRaw || addr;
          const url = rawUrl.replace(':userAddress', extAddr || '');
          const init: RequestInit = { headers: { 'Content-Type': 'application/json' } };
          if (method === 'POST') init.method = 'POST'; else init.method = 'GET';
          const bodyCfg = cfg['body'];
          if (init.method === 'POST' && bodyCfg && typeof bodyCfg === 'object'){
            init.body = JSON.stringify(bodyCfg);
          }
          const res = await fetchWithTimeout(url, init, 8000);
          if (!res.ok){
            if (addr && taskId){ await setCache(cooldownKey(addr, taskId), true, 60); writeFailure(addr, taskId, String(res.status)).catch(() => {}); }
            const text = await res.text().catch(() => '');
            return NextResponse.json({ error: 'upstream_error', status: res.status, detail: text || res.statusText }, { status: res.status });
          }
          const dataUnknown: unknown = await res.json().catch(() => ({}));
          const obj = (dataUnknown ?? {}) as Record<string, unknown>;
          let completed = false;
          if (success && typeof success === 'object'){
            // Support compound checks: success.all = [ { path, equals? }, ... ]
            const all = (success as Record<string, unknown>)['all'];
            if (Array.isArray(all)){
              completed = all.every((cond) => {
                if (!cond || typeof cond !== 'object') return false;
                const p = String((cond as Record<string, unknown>)['path'] || '').trim();
                if (!p) return false;
                const v = dotGet(obj, p);
                if ((cond as Record<string, unknown>)['equals'] !== undefined) {
                  return v === (cond as Record<string, unknown>)['equals'];
                }
                return Boolean(v);
              });
            } else if ((success as Record<string, unknown>)['path']){
              const val = dotGet(obj, String((success as Record<string, unknown>)['path']));
              const equals = (success as Record<string, unknown>)['equals'];
              const lengthGtRaw = (success as Record<string, unknown>)['length_gt'];
              const lengthGt = typeof lengthGtRaw === 'number' ? lengthGtRaw : Number(lengthGtRaw);
              if (!Number.isNaN(lengthGt) && Array.isArray(val)){
                completed = val.length > lengthGt;
              } else if (equals !== undefined){
                completed = val === equals;
              } else {
                completed = Boolean(val);
              }
            } else {
              completed = Boolean(obj['completed'] === true || obj['ok'] === true || obj['verified'] === true);
            }
          } else {
            completed = Boolean(obj['completed'] === true || obj['ok'] === true || obj['verified'] === true);
          }

          if (!completed && addr && taskId){
            await setCache(cooldownKey(addr, taskId), true, 60);
            writeFailure(addr, taskId, 'not_completed').catch(() => {});
            // Immediately inform client about cooldown so UI can show timer on first miss
            return NextResponse.json({ error: 'cooldown', retryAfter: 60 }, { status: 429 });
          }

          if (completed && addr && taskId){
            try {
              const xpValue = (task as { xp?: unknown } | null)?.xp;
              const xp = typeof xpValue === 'number' ? xpValue : 0;
              const weekVal = (task as { week?: unknown } | null)?.week;
              const starFlag = (task as { star?: unknown } | null)?.star;
              const starWeek = starFlag === true && typeof weekVal === 'number' ? weekVal : undefined;
              writeSuccess(addr, taskId).catch(() => {});
              persistSuccess(addr, taskId, xp, starWeek).catch(() => {});
            } catch {}
          }
          return NextResponse.json({ ...obj, completed });
        }
      } catch { /* fall through */ }

      // If task asks for on-chain read call verification (domains or similar)
      try {
        const check = String((vp as Record<string, unknown>)['check'] || '').trim();
        if (check === 'call'){
          const rpcUrl = String((vp as Record<string, unknown>)['rpcUrl'] || process.env.NEXT_PUBLIC_RPC_URL || "").trim();
          const contract = String((vp as Record<string, unknown>)['contract'] || '').trim();
          const fnRaw = String((vp as Record<string, unknown>)['function'] || '').trim();
          const fnSigRaw = String((vp as Record<string, unknown>)['functionSignature'] || '').trim();
          const args = Array.isArray((vp as Record<string, unknown>)['args']) ? (vp as Record<string, unknown>)['args'] as unknown[] : [];
          const success = (vp as Record<string, unknown>)['success'] as Record<string, unknown> | undefined;

          if (!rpcUrl || !contract || (!fnRaw && !fnSigRaw)){
            return NextResponse.json({ error: 'bad_verify_params' }, { status: 400 });
          }

          const functionSignature = fnSigRaw || (fnRaw.includes('returns') ? fnRaw : '');
          if (!functionSignature){
            // Default to a common Domains shape if only name provided
            // Example: getDomainsOf(address) -> string[]
            // Projects can pass full signature via functionSignature for custom cases
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const fallbackSig = `function ${fnRaw}(address) view returns (string[])`;
          }

          const usedSignature = functionSignature || `function ${fnRaw}(address) view returns (string[])`;
          const abi = parseAbi([usedSignature]);

          const client = createPublicClient({ transport: http(rpcUrl) });
          // viem readContract infers functionName from signature
          const functionName = (usedSignature.match(/function\s+(\w+)/)?.[1] || fnRaw) as string;

          let completed = false;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result: any = await client.readContract({ address: contract as `0x${string}`, abi, functionName, args });
            if (success && typeof success === 'object'){
              const lenGt = Number((success as Record<string, unknown>)['length_gt'] ?? NaN);
              if (!Number.isNaN(lenGt) && Array.isArray(result)){
                completed = result.length > lenGt;
              } else if ((success as Record<string, unknown>)['equals'] !== undefined){
                completed = result === (success as Record<string, unknown>)['equals'];
              } else {
                completed = Boolean(result);
              }
            } else {
              completed = Boolean(result);
            }
          } catch (err) {
            if (addr && taskId){ await setCache(cooldownKey(addr, taskId), true, 60); writeFailure(addr, taskId, 'call_failed').catch(() => {}); }
            return NextResponse.json({ error: 'call_failed' }, { status: 502 });
          }

          if (!completed && addr && taskId){
            await setCache(cooldownKey(addr, taskId), true, 60);
            writeFailure(addr, taskId, 'not_completed').catch(() => {});
            return NextResponse.json({ error: 'cooldown', retryAfter: 60 }, { status: 429 });
          }

          if (completed && addr && taskId){
            try {
              const xpValue = (task as { xp?: unknown } | null)?.xp;
              const xp = typeof xpValue === 'number' ? xpValue : 0;
              const weekVal = (task as { week?: unknown } | null)?.week;
              const starFlag = (task as { star?: unknown } | null)?.star;
              const starWeek = starFlag === true && typeof weekVal === 'number' ? weekVal : undefined;
              writeSuccess(addr, taskId).catch(() => {});
              persistSuccess(addr, taskId, xp, starWeek).catch(() => {});
            } catch {}
          }

          return NextResponse.json({ completed });
        }
      } catch { /* fall through */ }

      // Fallback to W3US verify
      const base = getBaseUrl();
      const url = `${base}/verify`;
      const res = await postJson(url, body);

      if (!res.ok){
        if (addr && taskId){ await setCache(cooldownKey(addr, taskId), true, 60); writeFailure(addr, taskId, String(res.status)).catch(() => {}); }
        const text = await res.text().catch(() => "");
        return NextResponse.json({ error: "upstream_error", status: res.status, detail: text || res.statusText }, { status: res.status });
      }

      const dataUnknown: unknown = await res.json().catch(() => ({}));
      const obj = (dataUnknown ?? {}) as Record<string, unknown>;
      const completed = Boolean(obj['completed'] === true || obj['ok'] === true || obj['verified'] === true);

      if (!completed && addr && taskId){
        await setCache(cooldownKey(addr, taskId), true, 60);
        writeFailure(addr, taskId, 'not_completed').catch(() => {});
        return NextResponse.json({ error: 'cooldown', retryAfter: 60 }, { status: 429 });
      }

      if (completed && addr && taskId){
        try {
          const task = await findTask(taskId);
          const xpValue = (task as { xp?: unknown } | null)?.xp;
          const xp = typeof xpValue === 'number' ? xpValue : 0;
          const weekVal = (task as { week?: unknown } | null)?.week;
          const starFlag = (task as { star?: unknown } | null)?.star;
          const starWeek = starFlag === true && typeof weekVal === 'number' ? weekVal : undefined;
          writeSuccess(addr, taskId).catch(() => {});
          persistSuccess(addr, taskId, xp, starWeek).catch(() => {});
        } catch {}
      }

      return NextResponse.json({ ...obj, completed });
    };

    if (addr && taskId){
      return await coalesce(`verify:${addr}:${taskId}`, doVerify);
    }
    return await doVerify();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}


