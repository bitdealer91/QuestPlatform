export const runtime = 'edge';

function isLowercaseHexAddress(a: string): boolean {
  return /^0x[0-9a-f]{40}$/.test(a);
}

export async function GET(_: Request, context: { params: { address: string } }) {
  try {
    const raw = String(context?.params?.address || '').trim();
    const addr = raw.toLowerCase();
    if (!isLowercaseHexAddress(addr)) {
      return new Response(JSON.stringify({ error: 'INVALID_ADDRESS' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const target = `https://api.capyagent.com/api/user/task/${addr}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(target, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Somnia-Odyssey/1.0',
          'Origin': 'https://odyssey.somnia.network'
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      const text = await res.text().catch(() => '');
      return new Response(text, { status: res.status, headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' } });
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : String(e);
    return new Response(JSON.stringify({ error: 'proxy_error', detail: msg }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}


