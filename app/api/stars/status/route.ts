import { NextResponse } from 'next/server';
import { pipeline } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET(req: Request){
  try {
    const url = new URL(req.url);
    const address = (url.searchParams.get('address') || '').toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(address)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }
    let mintedTotal = 0;
    try {
      const res = await pipeline([["GET", `user:stars_minted:${address}`]]);
      const raw = (res as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
      if (Array.isArray(raw)) {
        const v = raw[0]?.result as unknown;
        mintedTotal = typeof v === 'number' ? v : Number(v || 0) || 0;
      } else if (raw && Array.isArray(raw.result)) {
        const bucket = raw.result[0]?.result as unknown;
        mintedTotal = typeof bucket === 'number' ? bucket : Number(bucket || 0) || 0;
      }
    } catch { mintedTotal = 0; }
    return NextResponse.json({ mintedOnce: mintedTotal > 0, mintedTotal });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


