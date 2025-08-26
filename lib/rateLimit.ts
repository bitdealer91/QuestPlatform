// Global rate limiter: Redis (Upstash) fixed window, fallback to in-memory token bucket.

type Bucket = { tokens: number; resetAt: number };
const memIp = new Map<string, Bucket>();
const memKey = new Map<string, Bucket>();

function now(){ return Date.now(); }

function checkLocal(map: Map<string, Bucket>, key: string, limit: number){
  const t = now();
  let b = map.get(key);
  if (!b || b.resetAt <= t){ b = { tokens: limit, resetAt: t + 60_000 }; map.set(key, b); }
  if (b.tokens <= 0) return { limited: true, retryAfter: Math.ceil((b.resetAt - t)/1000) };
  b.tokens -= 1; return { limited: false, retryAfter: Math.ceil((b.resetAt - t)/1000) };
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisInc(key: string){
  const url = REDIS_URL;
  const token = REDIS_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key]])
    });
    const j = await r.json();
    const res = Array.isArray(j?.result) ? j.result[0]?.result : undefined;
    return typeof res === 'number' ? res : Number(res);
  } catch { return null; }
}

async function redisExpire(key: string, ttlSec: number){
  const url = REDIS_URL;
  const token = REDIS_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["EXPIRE", key, String(ttlSec)]])
    });
  } catch {}
}

export async function limitIp(ip: string, limitPerMin: number){
  const key = `rl:ip:${ip}`;
  const c = await redisInc(key);
  if (c == null){
    return checkLocal(memIp, ip, limitPerMin);
  }
  if (c === 1){ await redisExpire(key, 60); }
  const limited = c > limitPerMin;
  return { limited, retryAfter: 60 };
}

export async function limitPair(addrTaskKey: string, limitPerMin: number){
  const key = `rl:key:${addrTaskKey}`;
  const c = await redisInc(key);
  if (c == null){
    return checkLocal(memKey, addrTaskKey, limitPerMin);
  }
  if (c === 1){ await redisExpire(key, 60); }
  const limited = c > limitPerMin;
  return { limited, retryAfter: 60 };
}










