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

function parseMembersResults(res: unknown): string[][] {
  try {
    const r = res as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
    if (Array.isArray(r)) return r.map((x) => Array.isArray(x?.result as unknown[]) ? (x?.result as unknown[]).map(String) : []);
    if (r && Array.isArray(r.result)){
      const bucket = r.result[0]?.result as unknown;
      if (Array.isArray(bucket)) return bucket.map((x) => Array.isArray((x as any)) ? (x as unknown[]).map(String) : []);
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

    // Scan a page of verified sets
    const scan = await pipeline([["SCAN", cursorIn, "MATCH", "user:verified:*", "COUNT", String(batch)]]);
    if (!scan){
      return NextResponse.json({ error: "redis_unavailable" }, { status: 503 });
    }
    const { cursor, keys } = parseScanResult(scan);
    if (!keys.length){
      return NextResponse.json({ cursor, keysCount: 0, items: [] });
    }

    // Fetch members for each key
    const cmds = keys.map((k) => ["SMEMBERS", k] as (string|number)[]);
    const res = await pipeline(cmds);
    const lists = parseMembersResults(res);

    // Build results
    const items: Array<{ address: string; verified: string[] }> = [];
    for (let i = 0; i < keys.length; i++){
      const key = keys[i] || "";
      const parts = key.split(":");
      const address = parts[2] || "";
      const verified = Array.isArray(lists[i]) ? (lists[i] as string[]).map((s) => String(s)) : [];
      if (!address) continue;
      items.push({ address, verified });
    }

    return NextResponse.json({ cursor, keysCount: keys.length, items });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}




