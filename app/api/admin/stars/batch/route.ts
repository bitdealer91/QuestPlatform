import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";

export const runtime = "nodejs";

type Body = { token?: string; addresses?: string[] };

export async function POST(req: Request){
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const token = String(body.token || "");
    const addressesIn = Array.isArray(body.addresses) ? body.addresses : [];

    const required = process.env.ADMIN_TOKEN;
    if (required && token !== required){
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (addressesIn.length === 0){
      return NextResponse.json({ items: [] });
    }

    // Cap batch to avoid oversized payloads
    const addrs = addressesIn.slice(0, 300).map((a) => String(a || "").toLowerCase()).filter(Boolean);
    const cmds: (string|number)[][] = [];
    for (const a of addrs){ for (let w = 1; w <= 8; w++){ cmds.push(["SCARD", `user:stars:${a}:${w}`]); } }
    const res = await pipeline(cmds);
    const items: Array<{ address: string; total: number; weeks: number[] }> = [];
    if (res && Array.isArray((res as any).result)){
      for (let i = 0; i < addrs.length; i++){
        const weeks: number[] = [];
        let total = 0;
        for (let w = 0; w < 8; w++){
          const idx = i * 8 + w;
          let v: unknown = undefined;
          try {
            const r = (res as any).result[idx];
            v = r?.result;
          } catch {}
          const n = typeof v === 'number' ? v : Number(v || 0) || 0;
          weeks.push(n); total += n;
        }
        items.push({ address: addrs[i], total, weeks });
      }
    }
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}



