import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";
import { findTask } from "@/lib/store";
import { createPublicClient, http, parseAbi } from "viem";

export const runtime = "nodejs";

type Body = {
  token?: string;
  taskId?: string;
  batch?: number;
  cursor?: string;
  rpcUrl?: string;
};

function parseScanResult(res: unknown): { cursor: string; keys: string[] } {
  // Accept shapes like { result: [{ result: [[cursor, [keys...]]] }] } or REST array
  try {
    const r = res as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
    let bucket: unknown;
    if (Array.isArray(r)) {
      bucket = r[0]?.result;
    } else if (r && Array.isArray(r.result)) {
      bucket = r.result[0]?.result;
    }
    // bucket is expected to be an array like [cursor, [keys...]] or nested once more
    if (Array.isArray(bucket) && Array.isArray((bucket as unknown[])[0])) {
      // native normalization wraps results of pipeline into an array of command results
      const first = (bucket as unknown[])[0] as unknown[];
      const cur = String(first?.[0] ?? "0");
      const arr = Array.isArray(first?.[1]) ? (first?.[1] as unknown[]).map(String) : [];
      return { cursor: cur, keys: arr };
    }
    if (Array.isArray(bucket)) {
      const cur = String((bucket as unknown[])[0] ?? "0");
      const arrRaw = (bucket as unknown[])[1];
      const arr = Array.isArray(arrRaw) ? (arrRaw as unknown[]).map(String) : [];
      return { cursor: cur, keys: arr };
    }
  } catch {}
  return { cursor: "0", keys: [] };
}

function parseArrayResults(res: unknown): unknown[] {
  // Normalize pipeline results for multi-command responses into a flat array of per-command results
  try {
    const r = res as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
    if (Array.isArray(r)) {
      // REST shape: array of { result }
      return r.map((x) => x?.result);
    }
    if (r && Array.isArray(r.result)) {
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
    const taskId = String(body.taskId || "").trim();
    const batch = Math.max(1, Math.min(5000, Number(body.batch || 1000)));
    const cursorIn = (body.cursor ?? "0").toString();

    const required = process.env.ADMIN_TOKEN;
    if (required && token !== required){
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!taskId){
      return NextResponse.json({ error: "taskId_required" }, { status: 400 });
    }

    // 1) Scan a page of verified sets
    const scan = await pipeline([["SCAN", cursorIn, "MATCH", "user:verified:*", "COUNT", String(batch)]]);
    if (!scan){
      return NextResponse.json({ error: "redis_unavailable" }, { status: 503 });
    }
    const { cursor, keys } = parseScanResult(scan);

    if (!keys.length){
      return NextResponse.json({ taskId, totalVerifiedOld: 0, passedNew: 0, failedNew: 0, sample: { ok: [], fail: [] }, cursor });
    }

    // 2) Filter keys that actually have the taskId in their set
    const sisCmds = keys.map((k) => ["SISMEMBER", k, taskId] as (string|number)[]);
    const sisRes = await pipeline(sisCmds);
    const sisArr = parseArrayResults(sisRes);
    const candidateKeys: string[] = [];
    for (let i = 0; i < keys.length; i++){
      const v = sisArr[i];
      const num = typeof v === 'number' ? v : Number(v || 0) || 0;
      if (num === 1) candidateKeys.push(keys[i]);
    }

    const totalVerifiedOld = candidateKeys.length;
    if (totalVerifiedOld === 0){
      return NextResponse.json({ taskId, totalVerifiedOld, passedNew: 0, failedNew: 0, sample: { ok: [], fail: [] }, cursor });
    }

    // 3) Load task to get contract/function
    const task = await findTask(taskId) as unknown as { verify_params?: Record<string, unknown> } | null;
    const vp = (task?.verify_params || {}) as Record<string, unknown>;
    const contract = String(vp['contract'] || '').trim();
    const fnSig = String(vp['functionSignature'] || 'function isSomniacMinted(address) view returns (bool)');
    const rpcUrl = String((body.rpcUrl || process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || '').toString() || '').trim();
    const client = createPublicClient({ transport: http(rpcUrl || undefined) });
    const abi = parseAbi([fnSig]);
    const functionName = (fnSig.match(/function\s+(\w+)/)?.[1] || 'isSomniacMinted') as string;

    const addresses = candidateKeys.map(k => k.replace('user:verified:', '').toLowerCase());
    const sampleOk: string[] = [];
    const sampleFail: string[] = [];
    let passedNew = 0;
    let failedNew = 0;

    // Limit concurrency to avoid rate limits
    const concurrency = 10;
    for (let i = 0; i < addresses.length; i += concurrency){
      const slice = addresses.slice(i, i + concurrency);
      const results = await Promise.all(slice.map(async (addr) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res: any = await client.readContract({ address: contract as `0x${string}`, abi, functionName, args: [addr] });
          return Boolean(res);
        } catch {
          return false;
        }
      }));
      results.forEach((ok, idx) => {
        const addr = slice[idx];
        if (ok){
          passedNew++;
          if (sampleOk.length < 50) sampleOk.push(addr);
        } else {
          failedNew++;
          if (sampleFail.length < 50) sampleFail.push(addr);
        }
      });
    }

    return NextResponse.json({ taskId, totalVerifiedOld, passedNew, failedNew, sample: { ok: sampleOk, fail: sampleFail }, cursor });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


