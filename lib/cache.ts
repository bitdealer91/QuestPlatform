// Redis (Upstash) + in-memory LRU fallback with TTL

type CacheRecord = { value: any; expiresAt: number };

const MAX_ENTRIES = Number(process.env.SOMNIA_CACHE_MAX_ENTRIES || 20000);
const memMap: Map<string, CacheRecord> = new Map();

function now(){ return Date.now(); }

function gcIfNeeded(){
  // Simple size-based eviction (LRU-ish via Map iteration order): remove oldest while size > MAX
  if (memMap.size <= MAX_ENTRIES) return;
  const toEvict = memMap.size - MAX_ENTRIES;
  let n = 0;
  for (const k of memMap.keys()){
    memMap.delete(k);
    n += 1; if (n >= toEvict) break;
  }
}

function getLocal(key: string){
  const rec = memMap.get(key);
  if (!rec) return null;
  if (rec.expiresAt <= now()) { memMap.delete(key); return null; }
  // touch to keep recent ordering
  memMap.delete(key); memMap.set(key, rec);
  return rec.value;
}

function setLocal(key: string, val: any, ttlSec: number){
  const expiresAt = now() + ttlSec * 1000;
  memMap.set(key, { value: val, expiresAt });
  gcIfNeeded();
}

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

export async function getCache(key: string){
  const local = getLocal(key);
  if (local != null) return local;
  const remote = await redisGet(key);
  if (remote != null){
    // set short local TTL to shield per-instance
    setLocal(key, remote, 30);
    return remote;
  }
  return null;
}

export async function setCache(key: string, val: any, ttlSec: number){
  setLocal(key, val, ttlSec);
  await redisSet(key, val, ttlSec);
}



