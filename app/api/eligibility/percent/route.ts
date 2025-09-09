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

    // Precompute week XP totals from task spec
    const weekTotalXp: number[] = Array.from({ length: totalWeeks }, () => 0);
    for (const t of allTasks){
      const w = (t as { week?: number }).week;
      const xp = (t as { xp?: number }).xp ?? 0;
      if (typeof w === 'number' && w >= 1 && w <= totalWeeks){
        const idx = w - 1;
        weekTotalXp[idx] = (weekTotalXp[idx] ?? 0) + xp;
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

    // Sum verified XP per week
    const weekVerifiedXp: number[] = Array.from({ length: totalWeeks }, () => 0);
    for (const t of allTasks){
      const id = (t as { id?: string }).id || "";
      if (!id || !verifiedSet.has(id)) continue;
      const w = (t as { week?: number }).week;
      const xp = (t as { xp?: number }).xp ?? 0;
      if (typeof w === 'number' && w >= 1 && w <= totalWeeks){
        const idx = w - 1;
        weekVerifiedXp[idx] = (weekVerifiedXp[idx] ?? 0) + xp;
      }
    }

    // Each week caps at 10%
    const capPerWeek = 10;
    const weeks = weekTotalXp.map((total, idx) => {
      const totalXp = total ?? 0;
      const got = weekVerifiedXp[idx] ?? 0;
      const pct = totalXp > 0 ? Math.min(capPerWeek, Math.floor((got / totalXp) * capPerWeek)) : 0;
      return { unlockedPercentage: pct };
    });
    const totalUnlockedPercentage = weeks.reduce((s, w) => s + (w.unlockedPercentage || 0), 0);

    return NextResponse.json({ totalUnlockedPercentage, currentWeek, endAt, weeks });
  } catch {
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } }, { status: 500 });
  }
}


