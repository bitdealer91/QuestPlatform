import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";
import { loadTasks } from "@/lib/store";

export const runtime = "nodejs";

function toUnixSeconds(d: Date): number { return Math.floor(d.getTime() / 1000); }

function isLowercaseHexAddress(a: string): boolean {
  return /^0x[0-9a-f]{40}$/.test(a);
}

export async function GET(req: Request){
  try {
    const url = new URL(req.url);
    const addressRaw = String(url.searchParams.get("address") || "").trim();
    const address = addressRaw.toLowerCase();
    const debug = /^(1|true)$/i.test(String(url.searchParams.get("debug") || ""));
    if (!isLowercaseHexAddress(address)){
      return NextResponse.json({ error: { code: "INVALID_ADDRESS", message: "Invalid Ethereum address format" } }, { status: 400 });
    }

    // Load spec (tasks + program timing)
    const spec = await loadTasks();
    const allTasks = spec.tasks || [];
    const totalWeeks = Math.max(1, Number(spec.weeks || 8));

    // Compute quest timeline
    const startIso = spec.programStart;
    const start = startIso ? new Date(startIso) : null;
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const weeksMs = 7 * dayMs;
    let currentWeek = 0; // 0-based
    if (start && !isNaN(start.getTime())){
      const elapsedMs = Math.max(0, now.getTime() - start.getTime());
      currentWeek = Math.min(totalWeeks - 1, Math.floor(elapsedMs / weeksMs));
    }
    const endAt = start ? toUnixSeconds(new Date(start.getTime() + totalWeeks * weeksMs)) : toUnixSeconds(new Date(now.getTime() + totalWeeks * weeksMs));

    // Collect mandatory task ids per week
    const mandatoryByWeek: string[][] = Array.from({ length: totalWeeks }, () => []);
    for (const t of allTasks){
      const w = (t as { week?: number }).week;
      const id = (t as { id?: string }).id || "";
      const isMandatory = ((t as unknown as Record<string, unknown>)?.["mandatory"] === true) || ((t as unknown as Record<string, unknown>)?.["mandatory task"] === true);
      if (!id) continue;
      if (typeof w === 'number' && w >= 1 && w <= totalWeeks){
        const idx = w - 1;
        if (isMandatory) {
          const bucket = mandatoryByWeek[idx] || [];
          bucket.push(id);
          mandatoryByWeek[idx] = bucket;
        }
      }
    }

    // Read verified task ids for address from Redis
    const verifiedRes = await pipeline([["SMEMBERS", `user:verified:${address}`]]);
    let verified: string[] = [];
    try {
      const raw = (verifiedRes as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
      if (Array.isArray(raw)) verified = Array.isArray(raw[0]?.result) ? (raw[0]!.result as unknown[]).map(String) : [];
      else if (raw && Array.isArray(raw.result)) {
        const bucket = raw.result[0]?.result as unknown;
        verified = Array.isArray(bucket) ? (bucket as unknown[]).map(String) : [];
      }
    } catch { verified = []; }

    const verifiedSet = new Set(verified);

    // Each week gives 10% only if ALL mandatory tasks of that week are verified
    const capPerWeek = 10;
    const weeks = mandatoryByWeek.map((ids) => {
      const list = Array.isArray(ids) ? ids : [];
      if (list.length === 0) return { unlockedPercentage: 0 };
      const allDone = list.every((id) => verifiedSet.has(id));
      return { unlockedPercentage: allDone ? capPerWeek : 0 };
    });
    const totalUnlockedPercentage = weeks.reduce((s, w) => s + (w.unlockedPercentage || 0), 0);

    const payload: Record<string, unknown> = { totalUnlockedPercentage, currentWeek, endAt, weeks };
    if (debug) {
      payload.debug = {
        mandatoryByWeek,
        verifiedIds: Array.from(verifiedSet),
      };
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } }, { status: 500 });
  }
}


