import { NextResponse } from "next/server";
import { findTask } from "@/lib/store";
import { dotGet } from "@/lib/jsonPath";
import { getCache as globalGetCache, setCache as globalSetCache } from "@/lib/cache";
import { coalesce } from "@/lib/inflight";
import { limitIp, limitPair } from "@/lib/rateLimit";

export const runtime = "nodejs";

function getNow() { return Date.now(); }


// Rate limiting (very simple token buckets in-memory). For production add Redis.
const rlPerIp = new Map<string, { tokens: number; resetAt: number }>();
const rlPerPair = new Map<string, { tokens: number; resetAt: number }>();
function checkRl(map: Map<string, { tokens: number; resetAt: number }>, key: string, limit: number){
  const now = getNow();
  let b = map.get(key);
  if (!b || b.resetAt <= now){ b = { tokens: limit, resetAt: now + 60_000 }; map.set(key, b); }
  if (b.tokens <= 0) return { limited: true, retryAfter: Math.ceil((b.resetAt - now)/1000) };
  b.tokens -= 1; return { limited: false, retryAfter: Math.ceil((b.resetAt - now)/1000) };
}

function tmpl(obj:any, ctx:Record<string,string>) {
  if (!obj) return undefined;
  const s = JSON.stringify(obj);
  return JSON.parse(
    s.replace(/{{address}}/g, ctx.address)
     .replace(/{{taskId}}/g,  ctx.taskId)
     .replace(/{{txHash}}/g,  ctx.txHash || "")
     .replace(/{{API_BEARER}}/g, process.env.API_BEARER || "")
  );
}
function withAddressInUrl(url:string, addr:string){
  if (url.includes("{{address}}")) return url.replace(/{{address}}/g, addr);
  const hasQuery = url.includes("?");
  return `${url}${hasQuery ? "&" : "?"}wallet=${addr}`;
}

async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number }){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 5000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally { clearTimeout(timeout); }
}

async function fetchPartner({ api, lower, taskId, txHash }:{ api:any; lower:string; taskId:string; txHash?:string }){
  const method = api.method || "GET";
  const headers = tmpl(api.headers, { address: lower, taskId, txHash });
  let url = api.url;
  if (method === "GET"){
    url = withAddressInUrl(api.url, lower);
  } else if (api.url.includes("{{address}}")){
    url = api.url.replace(/{{address}}/g, lower);
  }
  const body = api.body ? JSON.stringify(tmpl(api.body, { address: lower, taskId, txHash })) : undefined;
  const res = await fetchWithTimeout(url, { method, headers, body, timeoutMs: 5000 });
  if (res.status === 429 || res.status >= 500){
    const err = new Error(`Upstream ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  let data: any = {};
  try { data = await res.json(); } catch { data = {}; }
  const ok = api.success
    ? dotGet(data, api.success.path) === api.success.equals
    : dotGet(data, "completed") === true;
  const wallet = data.wallet ?? lower;
  const score  = data.score;
  return { wallet, score, completed: !!ok, raw: data };
}

// Circuit breaker (simple, per upstream URL)
const cb = new Map<string, { failures: number; lastReset: number; openUntil: number }>();
function isCircuitOpen(url: string){
  const s = cb.get(url); if (!s) return false;
  return s.openUntil > getNow();
}
function markSuccess(url: string){ cb.set(url, { failures: 0, lastReset: getNow(), openUntil: 0 }); }
function markFailure(url: string){
  const now = getNow();
  const s = cb.get(url) || { failures: 0, lastReset: now, openUntil: 0 };
  if (now - s.lastReset > 60_000){ s.failures = 0; s.lastReset = now; }
  s.failures += 1;
  if (s.failures >= 10){ s.openUntil = now + 45_000; s.failures = 0; s.lastReset = now; }
  cb.set(url, s);
}

// Optional Redis (Upstash) for global cache
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
async function redisGet(key: string){
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const r = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([["GET", key]])
    });
    const j = await r.json();
    const arr = j?.result || j;
    const res = Array.isArray(arr) ? arr[0]?.result : undefined;
    if (!res) return null;
    return JSON.parse(res);
  } catch { return null; }
}
async function redisSet(key: string, value: any, ttlSec: number){
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([["SET", key, JSON.stringify(value), "EX", String(ttlSec)]])
    });
  } catch {}
}

export async function POST(req: Request){
  const started = getNow();
  const ip = (req.headers as any).get?.("x-forwarded-for") || (req as any).ip || "unknown";
  const { address, taskId, txHash } = await req.json().catch(()=> ({}));
  const lower = String(address || "").toLowerCase();
  if (!lower || !taskId){
    const resp = { wallet: lower, completed: false };
    console.log(JSON.stringify({ key: `verify:${taskId}:${lower}`, source: "invalid", latency_ms: getNow()-started, status: 200, retries: 0, cache_hit: false }));
    return NextResponse.json(resp);
  }

  const task = await findTask(taskId);
  if (!task || !task.verify_api) {
    const resp = { wallet: lower, completed: false };
    console.log(JSON.stringify({ key: `verify:${taskId}:${lower}`, source: "notfound", latency_ms: getNow()-started, status: 200, retries: 0, cache_hit: false }));
    return NextResponse.json(resp);
  }
  const key = `verify:${taskId}:${lower}`;

  // Rate limit checks
  const rlIp = await limitIp(String(ip), 60);
  if (rlIp.limited) return NextResponse.json({ rateLimited: true }, { status: 429, headers: { "Retry-After": String(rlIp.retryAfter) } });
  const rlKey = await limitPair(key, 10);
  if (rlKey.limited) return NextResponse.json({ rateLimited: true }, { status: 429, headers: { "Retry-After": String(rlKey.retryAfter) } });

  // Global cache (Redis) → Memory
  const redisHit = await globalGetCache(key);
  if (redisHit){
    const ttl = redisHit.completed ? 86400 : 60;
    console.log(JSON.stringify({ key, source: "cache:redis", latency_ms: getNow()-started, status: 200, retries: 0, cache_hit: true }));
    return NextResponse.json({ ...redisHit, source: "cache" }, { headers: { "Cache-Control": `private, max-age=${ttl}${redisHit.completed ? ", immutable" : ""}` } });
  }
  // globalGetCache already checks local first with small TTL, then Redis

  if (isCircuitOpen(task.verify_api.url)){
    const resp = { wallet: lower, completed: false };
    console.log(JSON.stringify({ key, source: "circuit", latency_ms: getNow()-started, status: 200, retries: 0, cache_hit: false }));
    return NextResponse.json({ ...resp, source: "circuit" }, { headers: { "Cache-Control": "private, max-age=30" } });
  }

  // Coalesce in-flight
  let attempts = 0; let result: any;
  try {
    result = await coalesce(key, async () => {
      // retries with backoff
      let attempt = 0; let last: any = null;
      const maxAttempts = 3;
      while (attempt < maxAttempts){
        try {
          const res = await fetchPartner({ api: task.verify_api, lower, taskId, txHash });
          return res;
        } catch (e: any){
          last = e; attempt++;
          if (attempt >= maxAttempts) throw last;
          const backoff = Math.floor(200 * Math.pow(2, attempt-1) + Math.random()*200);
          await new Promise(r => setTimeout(r, backoff));
        }
      }
      throw last;
    });
    markSuccess(task.verify_api.url);
    attempts = 0;
  } catch (e:any){
    markFailure(task.verify_api.url);
    attempts = 2;
    const resp = { wallet: lower, completed: false };
    console.log(JSON.stringify({ key, source: "error", latency_ms: getNow()-started, status: 200, retries: attempts, cache_hit: false }));
    return NextResponse.json(resp, { headers: { "Cache-Control": "private, max-age=15" } });
  }

  const ttl = result.completed ? 86400 : 60;
  await globalSetCache(key, result, ttl);
  console.log(JSON.stringify({ key, source: "live", latency_ms: getNow()-started, status: 200, retries: attempts, cache_hit: false }));
  return NextResponse.json({ ...result, source: "live" }, { headers: { "Cache-Control": `private, max-age=${ttl}${result.completed ? ", immutable" : ""}` } });
}


