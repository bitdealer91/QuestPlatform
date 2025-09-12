import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";
import { findTask } from "@/lib/store";
import { createPublicClient, http, parseAbi } from "viem";
import { writeFailure } from "@/lib/ledger";

export const runtime = "nodejs";

type Body = {
  token?: string;
  taskId?: string;
  batch?: number;
  cursor?: string;
  apply?: boolean;
  rpcUrl?: string;
};

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
    const taskId = String(body.taskId || "").trim();
    const batch = Math.max(1, Math.min(5000, Number(body.batch || 1000)));
    const cursorIn = (body.cursor ?? "0").toString();
    const apply = Boolean(body.apply);
    const revokeEnabled = String(process.env.ADMIN_REVOKE_ENABLED || '').toLowerCase() === 'true';

    const required = process.env.ADMIN_TOKEN;
    if (required && token !== required){
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!taskId){
      return NextResponse.json({ error: "taskId_required" }, { status: 400 });
    }

    const scan = await pipeline([["SCAN", cursorIn, "MATCH", "user:verified:*", "COUNT", String(batch)]]);
    if (!scan){
      return NextResponse.json({ error: "redis_unavailable" }, { status: 503 });
    }
    const { cursor, keys } = parseScanResult(scan);
    if (!keys.length){
      return NextResponse.json({ taskId, checkedOld: 0, revoked: 0, kept: 0, sample: { revoked: [], kept: [] }, cursor });
    }

    // Filter only those who have this taskId verified
    const sisCmds = keys.map((k) => ["SISMEMBER", k, taskId] as (string|number)[]);
    const sisRes = await pipeline(sisCmds);
    const sisArr = parseArrayResults(sisRes);
    const candidateKeys: string[] = [];
    for (let i = 0; i < keys.length; i++){
      const v = sisArr[i];
      const num = typeof v === 'number' ? v : Number(v || 0) || 0;
      const key = keys[i];
      if (num === 1 && key) candidateKeys.push(key);
    }

    const checkedOld = candidateKeys.length;
    if (checkedOld === 0){
      return NextResponse.json({ taskId, checkedOld, revoked: 0, kept: 0, sample: { revoked: [], kept: [] }, cursor });
    }

    const task = await findTask(taskId) as unknown as { verify_params?: Record<string, unknown>; xp?: number; week?: number; star?: boolean } | null;
    const vp = (task?.verify_params || {}) as Record<string, unknown>;
    const contract = String(vp['contract'] || '').trim();
    const fnSig = String(vp['functionSignature'] || 'function isSomniacMinted(address) view returns (bool)');
    const rpcUrl = String((body.rpcUrl || process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || '').toString() || '').trim();
    const client = createPublicClient({ transport: http(rpcUrl || undefined) });
    const abi = parseAbi([fnSig]);
    const functionName = (fnSig.match(/function\s+(\w+)/)?.[1] || 'isSomniacMinted') as string;

    const addresses = candidateKeys.map(k => k.replace('user:verified:', '').toLowerCase());
    const xpPerTask = typeof task?.xp === 'number' ? task!.xp : 0;
    const starWeek = task?.star === true && typeof task?.week === 'number' ? task!.week as number : undefined;

    let revoked = 0;
    let kept = 0;
    const sampleRevoked: string[] = [];
    const sampleKept: string[] = [];

    const concurrency = 10;
    for (let i = 0; i < addresses.length; i += concurrency){
      const slice = addresses.slice(i, i + concurrency);
      const checks = await Promise.all(slice.map(async (addr) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res: any = await client.readContract({ address: contract as `0x${string}`, abi, functionName, args: [addr] });
          return Boolean(res);
        } catch { return false; }
      }));

      // Apply revocations for those who failed
      for (let j = 0; j < slice.length; j++){
        const addr = slice[j] as string;
        const ok = checks[j];
        if (ok){
          kept++;
          if (sampleKept.length < 50) sampleKept.push(addr);
          continue;
        }
        // need to revoke
        revoked++;
        if (sampleRevoked.length < 50) sampleRevoked.push(addr);
        if (!apply || !revokeEnabled) continue;

        // read current xp for the slice address
        const xpRes = await pipeline([["GET", `user:xp:${addr}`]]);
        let currentXp = 0;
        try {
          const r = (xpRes as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
          if (Array.isArray(r)) currentXp = Number(r[0]?.result || 0) || 0;
          else if (r && Array.isArray(r.result)){
            const bucket = r.result[0]?.result as unknown;
            if (Array.isArray(bucket)) currentXp = Number((bucket[0] as unknown) || 0) || 0;
          }
        } catch { currentXp = 0; }

        const newXp = Math.max(0, currentXp - xpPerTask);
        const cmds: (string|number)[][] = [];
        cmds.push(["SREM", `user:verified:${addr}`, taskId]);
        cmds.push(["SET", `user:xp:${addr}`, String(newXp)]);
        if (typeof starWeek === 'number' && starWeek > 0) cmds.push(["SREM", `user:stars:${addr}:${starWeek}`, taskId]);
        // best-effort ledger mark
        try { writeFailure(addr, taskId, 'admin_revoke').catch(() => {}); } catch {}
        await pipeline(cmds);
      }
    }

    return NextResponse.json({ taskId, checkedOld, revoked, kept, sample: { revoked: sampleRevoked, kept: sampleKept }, cursor, apply, revokeEnabled });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}






