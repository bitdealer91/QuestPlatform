// Rate limiting with Redis + in-memory fallback

type RateLimitRecord = { tokens: number; resetAt: number };

const MAX_ENTRIES = Number(process.env.SOMNIA_RATE_LIMIT_MAX_ENTRIES || 10000);
const memMap: Map<string, RateLimitRecord> = new Map();

function getCurrentTime(): number { return Date.now(); }

function gcIfNeeded(){
  if (memMap.size <= MAX_ENTRIES) return;
  const toEvict = memMap.size - MAX_ENTRIES;
  let n = 0;
  for (const k of memMap.keys()){
    memMap.delete(k);
    n += 1; if (n >= toEvict) break;
  }
}

function getLocal(key: string): RateLimitRecord | null {
  const rec = memMap.get(key);
  if (!rec) return null;
  if (rec.resetAt <= getCurrentTime()) { memMap.delete(key); return null; }
  return rec;
}

function setLocal(key: string, record: RateLimitRecord): void {
  memMap.set(key, record);
  gcIfNeeded();
}

export async function limitIp(ip: string, limitPerMin: number): Promise<{ limited: boolean; retryAfter: number }> {
  const key = `rl:ip:${ip}`;
  const currentTime = getCurrentTime();
  
  // Проверяем локальный кеш
  let record = getLocal(key);
  
  if (!record || record.resetAt <= currentTime) {
    record = { tokens: limitPerMin, resetAt: currentTime + 60_000 };
    setLocal(key, record);
  }
  
  if (record.tokens <= 0) {
    return { limited: true, retryAfter: Math.ceil((record.resetAt - currentTime) / 1000) };
  }
  
  record.tokens -= 1;
  setLocal(key, record);
  
  return { limited: false, retryAfter: 0 };
}

export async function limitPair(addrTaskKey: string, limitPerMin: number): Promise<{ limited: boolean; retryAfter: number }> {
  const key = `rl:pair:${addrTaskKey}`;
  const currentTime = getCurrentTime();
  
  // Проверяем локальный кеш
  let record = getLocal(key);
  
  if (!record || record.resetAt <= currentTime) {
    record = { tokens: limitPerMin, resetAt: currentTime + 60_000 };
    setLocal(key, record);
  }
  
  if (record.tokens <= 0) {
    return { limited: true, retryAfter: Math.ceil((record.resetAt - currentTime) / 1000) };
  }
  
  record.tokens -= 1;
  setLocal(key, record);
  
  return { limited: false, retryAfter: 0 };
}










