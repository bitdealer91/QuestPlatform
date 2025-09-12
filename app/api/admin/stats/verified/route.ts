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
    const batch = Math.max(1, Math.min(5000, Number(body.batch || 1000)));
    const cursorIn = (body.cursor ?? "0").toString();

    const required = process.env.ADMIN_TOKEN;
    if (required && token !== required){
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 1) Scan a page of user:verified:* keys
    const scan = await pipeline([["SCAN", cursorIn, "MATCH", "user:verified:*", "COUNT", String(batch)]]);
    if (!scan){
      return NextResponse.json({ error: "redis_unavailable" }, { status: 503 });
    }
    const { cursor, keys } = parseScanResult(scan);
    if (!keys.length){
      return NextResponse.json({ counts: {}, cursor, keysCount: 0 });
    }

    // 2) SMEMBERS for each key in batch
    const smems = keys.map((k) => ["SMEMBERS", k] as (string|number)[]);
    const res = await pipeline(smems);
    const arr = parseArrayResults(res);

    // 3) Aggregate counts per taskId
    const counts: Record<string, number> = {};
    for (let i = 0; i < arr.length; i++){
      const bucket = arr[i];
      if (Array.isArray(bucket)){
        for (const v of bucket){
          const id = String(v || "").trim();
          if (!id) continue;
          counts[id] = (counts[id] || 0) + 1;
        }
      } else if (typeof bucket === 'string' && bucket.includes(',')){
        // Defensive: some backends may return a comma-joined string
        for (const part of bucket.split(',')){
          const id = part.trim(); if (!id) continue;
          counts[id] = (counts[id] || 0) + 1;
        }
      } else if (typeof bucket === 'string'){
        const id = bucket.trim(); if (id) counts[id] = (counts[id] || 0) + 1;
      }
    }

    return NextResponse.json({ counts, cursor, keysCount: keys.length });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


