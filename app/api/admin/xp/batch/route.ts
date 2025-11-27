import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";

export const runtime = "nodejs";

type Body = { token?: string; addresses?: string[] };

function parseArrayResults(res: unknown): unknown[] {
  try {
    const r = res as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
    if (Array.isArray(r)) return r.map((x) => (x as any)?.result);
    if (r && Array.isArray((r as any).result)){
      const bucket = (r as any).result[0]?.result as unknown;
      if (Array.isArray(bucket)) return bucket as unknown[];
    }
  } catch {}
  return [];
}

export async function POST(req: Request){
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const token = String(body.token || "");
    const required = process.env.ADMIN_TOKEN;
    if (required && token !== required){
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const addrsIn = Array.isArray(body.addresses) ? body.addresses : [];
    if (!addrsIn.length){
      return NextResponse.json({ items: [] });
    }
    // normalize and dedupe
    const addrs = Array.from(new Set(addrsIn.map((a) => String(a || "").trim().toLowerCase()).filter(Boolean)));
    const items: Array<{ address: string; xp: number }> = [];

    // chunk commands to avoid oversized payloads
    const CHUNK = 2000;
    for (let i = 0; i < addrs.length; i += CHUNK){
      const slice = addrs.slice(i, i + CHUNK);
      const cmds = slice.map((a) => ["GET", `user:xp:${a}`] as (string|number)[]);
      const res = await pipeline(cmds);
      const vals = parseArrayResults(res);
      for (let j = 0; j < slice.length; j++){
        const addr = slice[j]!;
        const raw = vals[j];
        const xp = typeof raw === "number" ? raw : (Number(raw || 0) || 0);
        items.push({ address: addr, xp });
      }
    }
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}




