const inflight = new Map<string, Promise<unknown>>();

export function coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  
  const promise = fn();
  inflight.set(key, promise);
  
  promise.finally(() => inflight.delete(key));
  return promise;
}










