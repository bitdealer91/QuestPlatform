import Redis from 'ioredis';

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_URL = process.env.REDIS_URL; // e.g. redis://default:pass@host:6379

export type PipelineCmd = (string | number)[];
export type PipelineResult = { result?: { result?: unknown }[] } | null;

let nativeClient: Redis | null = null;

function getNative(): Redis | null {
  if (!REDIS_URL) return null;
  if (nativeClient) return nativeClient;
  // Upstash redis-cli URL already implies TLS; ioredis will handle rediss:// and redis:// with tls option
  // If the provided URL starts with redis://, Upstash still requires TLS, but their CLI uses --tls flag.
  // ioredis supports rediss:// for TLS. Convert if needed.
  const url = REDIS_URL.startsWith('redis://') ? REDIS_URL.replace('redis://', 'rediss://') : REDIS_URL;
  nativeClient = new Redis(url, {
    // Upstash recommends enabling TLS; rediss:// enforces it
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  return nativeClient;
}

export async function pipeline(cmds: PipelineCmd[]): Promise<PipelineResult> {
  // Prefer REST if configured (serverless-friendly, no long-lived sockets)
  if (REST_URL && REST_TOKEN) {
    try {
      const res = await fetch(`${REST_URL}/pipeline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(cmds),
      });
      if (!res.ok) return null;
      return await res.json().catch(() => null);
    } catch {
      return null;
    }
  }

  // Fallback to native client using REDIS_URL
  const client = getNative();
  if (!client) return null;
  try {
    await client.connect();
  } catch {}
  try {
    const pipe = client.pipeline();
    for (const cmd of cmds) {
      const [name, ...args] = cmd as [string, ...unknown[]];
      // @ts-expect-error dynamic pipeline invocation
      pipe[name.toLowerCase()](...args);
    }
    const res = await pipe.exec();
    // Normalize to REST-like shape
    return { result: [{ result: res?.map(([, v]) => v) }] } as PipelineResult;
  } catch {
    return null;
  }
}

