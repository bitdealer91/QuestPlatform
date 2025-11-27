import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";

export const runtime = "nodejs";

type Body = { token?: string; batch?: number; cursor?: string };

function parseScanResult(res: unknown): { cursor: string; keys: string[] } {
  try {
    const r = res as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
    let bucket: unknown;
    if (Array.isArray(r)) bucket = r[0]?.result;
    else if (r && Array.isArray(r.result)) bucket = r.result[0]?.result;
    if (Array.isArray(bucket) && Array.isArray((bucket as unknown[])[0])){
      const first = (bucket as unknown[])[0] as unknown[];
      const cur = String(first?.[0] ?? "0");
      const arr = Array.isArray(first?.[1]) ? (first?.[1] as unknown[]).map(String) : [];
      return { cursor: cur, keys: arr };
    }
    if (Array.isArray(bucket)){
      const cur = String((bucket as unknown[])[0] ?? "0");
      const arrRaw = (bucket as unknown[])[1];
      const arr = Array.isArray(arrRaw) ? (arrRaw as unknown[]).map(String) : [];
      return { cursor: cur, keys: arr };
    }
  } catch {}
  return { cursor: "0", keys: [] };
}

function parseArrayResults(res: unknown): unknown[] {
  try {
    const r = res as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
    if (Array.isArray(r)) return r.map((x) => x?.result);
    if (r && Array.isArray(r.result)){
      const bucket = r.result[0]?.result as unknown;
      if (Array.isArray(bucket)) return bucket as unknown[];
    }
  } catch {}
  return [];
}

export async function POST(req: Request){
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const token = String(body.token || "");
    const batch = Math.max(1, Math.min(2000, Number(body.batch || 500)));
    const cursorIn = (body.cursor ?? "0").toString();

    const required = process.env.ADMIN_TOKEN;
    if (required && token !== required){
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Scan a page of star set keys
    const scan = await pipeline([["SCAN", cursorIn, "MATCH", "user:stars:*", "COUNT", String(batch)]]);
    if (!scan){
      return NextResponse.json({ error: "redis_unavailable" }, { status: 503 });
    }
    const { cursor, keys } = parseScanResult(scan);
    if (!keys.length){
      return NextResponse.json({ cursor, keysCount: 0, items: [] });
    }

    // SCARD each key in batch
    const cmds = keys.map((k) => ["SCARD", k] as (string|number)[]);
    const res = await pipeline(cmds);
    const vals = parseArrayResults(res);

    const items: Array<{ address: string; week: number; count: number }> = [];
    for (let i = 0; i < keys.length; i++){
      const key = keys[i] || "";
      const parts = key.split(":");
      const address = (parts[2] || "").toLowerCase();
      const weekNum = Number(parts[3] || 0) || 0;
      const raw = vals[i];
      const count = typeof raw === 'number' ? raw : Number(raw || 0) || 0;
      if (address && weekNum >= 1 && weekNum <= 8){
        items.push({ address, week: weekNum, count });
      }
    }

    return NextResponse.json({ cursor, keysCount: keys.length, items });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}



