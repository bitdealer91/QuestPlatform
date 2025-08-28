import { NextResponse } from "next/server";
import { limitIp, limitPair } from "@/lib/rateLimit";
import { coalesce } from "@/lib/inflight";
import { getCache, setCache } from "@/lib/cache";
import { findTask } from "@/lib/store";
import { writeAttempt, writeFailure, writeSuccess } from "@/lib/ledger";

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

async function persistSuccess(address: string, taskId: string, xp: number){
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["SADD", `user:verified:${address}`, taskId],
        ["INCRBY", `user:xp:${address}`, String(xp)],
        ["SET", `user:last:${address}:${taskId}`, String(Date.now()), "EX", "2592000"],
      ])
    });
  } catch {/* ignore */}
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
      const base = getBaseUrl();
      const url = `${base}/verify`;
      if (addr && taskId) { writeAttempt(addr, taskId).catch(() => {}); }
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
      }

      if (completed && addr && taskId){
        try {
          const task = await findTask(taskId);
          const xpValue = (task as { xp?: unknown } | null)?.xp;
          const xp = typeof xpValue === 'number' ? xpValue : 0;
          writeSuccess(addr, taskId).catch(() => {});
          persistSuccess(addr, taskId, xp).catch(() => {});
        } catch {}
      }

      return NextResponse.json(obj);
    };

    if (addr && taskId){
      return await coalesce(`verify:${addr}:${taskId}`, doVerify);
    }
    return await doVerify();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}


