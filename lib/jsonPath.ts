export function dotGet(obj: unknown, path: string): unknown {
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' && k in o ? (o as Record<string, unknown>)[k] : undefined), obj);
}










