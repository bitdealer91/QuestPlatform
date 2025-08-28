// Redis (Upstash) + in-memory LRU fallback with TTL

type CacheRecord = { value: unknown; expiresAt: number };

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

function setLocal(key: string, val: unknown, ttlSec: number){
  const expiresAt = now() + ttlSec * 1000;
  memMap.set(key, { value: val, expiresAt });
  gcIfNeeded();
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Оптимизированная функция Redis get с таймаутом
async function redisGet(key: string): Promise<unknown | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 секунды таймаут
    
    const r = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([["GET", key]]),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!r.ok) return null;
    
    const j = await r.json();
    const arr = j?.result || j;
    const res = Array.isArray(arr) ? arr[0]?.result : undefined;
    if (!res) return null;
    return JSON.parse(res);
  } catch { 
    return null; 
  }
}

// Оптимизированная функция Redis set с таймаутом
async function redisSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 секунды таймаут
    
    await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([["SET", key, JSON.stringify(value), "EX", String(ttlSec)]]),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
  } catch {
    // Игнорируем ошибки Redis для production
  }
}

export async function getCache(key: string): Promise<unknown | null> {
  // Сначала проверяем локальный кеш
  const local = getLocal(key);
  if (local != null) return local;
  
  // Если нет в локальном, пробуем Redis (с таймаутом)
  try {
    const remote = await redisGet(key);
    if (remote != null){
      // set short local TTL to shield per-instance
      setLocal(key, remote, 30);
      return remote;
    }
  } catch {
    // Если Redis недоступен, возвращаем null
  }
  
  return null;
}

export async function setCache(key: string, val: unknown, ttlSec: number): Promise<void> {
  // Сначала устанавливаем локально для быстрого доступа
  setLocal(key, val, ttlSec);
  
  // Затем асинхронно в Redis (не блокируем)
  redisSet(key, val, ttlSec).catch(() => {
    // Игнорируем ошибки Redis
  });
}










