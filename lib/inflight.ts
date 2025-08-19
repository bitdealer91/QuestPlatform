const inflight = new Map<string, Promise<any>>();

export function coalesce<T>(key: string, fn: () => Promise<T>) {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = Promise.resolve().then(fn).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}



