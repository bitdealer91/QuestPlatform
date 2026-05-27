export type VerifyResult = {
  wallet?: string;
  score?: number;
  completed?: boolean;
  message?: string;
  attempt?: number;
  platform?: string;
  socialAction?: string;
  // error fields
  error?: string;
  status?: number;
  detail?: unknown;
  retryAfter?: number;
};

export async function verifyExternal(address: string, taskId: string, txHash?: string, force?: boolean): Promise<VerifyResult> {
  const res = await fetch('/api/verify/external', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, taskId, txHash, force })
  });

  let json: unknown = null;
  try { json = await res.json(); } catch { json = null; }

  const j = (json as VerifyResult | null) || null;
  if (!res.ok) {
    return {
      error: j?.error || 'verify_failed',
      status: res.status,
      detail: j?.detail,
      retryAfter: typeof j?.retryAfter === 'number' ? j.retryAfter : undefined,
      message: j?.message,
    };
  }

  return j ?? { completed: false };
}









