import { PROGRAM_WEEKS } from "@/lib/weeks";

/**
 * Maximum % unlocked per calendar program week when all mandatory tasks in that week are done.
 * 4-week Odyssey: 20% × 4 = 80% program max (remaining % if any lives off-chain / partner).
 */
export const ELIGIBILITY_UNLOCK_CAP_PER_WEEK = 20;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function maxProgramUnlockForWeeks(programWeekCount: number): number {
  const n = Math.max(0, Math.floor(programWeekCount));
  return n * ELIGIBILITY_UNLOCK_CAP_PER_WEEK;
}

/** Default max for the capped program length (see `PROGRAM_WEEKS`). */
export const DEFAULT_MAX_PROGRAM_UNLOCK = maxProgramUnlockForWeeks(PROGRAM_WEEKS);

export type WeekDropSchedule = {
  weekDropUnlocks?: string[];
  weekDropUnlockTime?: string;
  weekDropUnlockTimezone?: string;
};

function parseTimeOfDay(raw: string): { h: number; m: number; s: number } | null {
  const m = String(raw || "").trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = Number(m[3] || "0");
  if (h > 23 || min > 59 || s > 59) return null;
  return { h, m: min, s };
}

function getTzOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(at);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const mins = Number(match[3] || "0");
  return sign * (hours * 60 + mins);
}

/** Wall-clock local time in `timeZone` → UTC ms (approx.; fine for scheduled unlocks). */
function zonedLocalToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  timeZone: string,
): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const offsetMin = getTzOffsetMinutes(timeZone, new Date(guess));
  return guess - offsetMin * 60 * 1000;
}

function unlockCalendarDayUtc(programStart: Date, weekIndex0: number): { y: number; m: number; d: number } {
  const ms = programStart.getTime() + (weekIndex0 + 1) * WEEK_MS;
  const day = new Date(ms);
  return { y: day.getUTCFullYear(), m: day.getUTCMonth() + 1, d: day.getUTCDate() };
}

function parseExplicitUnlocks(raw: string): string[] | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { /* fall through */ }
  }
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Env overrides tasks.json for ops tweaks without redeploying the catalog file. */
export function resolveWeekDropSchedule(spec: WeekDropSchedule = {}): WeekDropSchedule {
  const envUnlocks = process.env.ELIGIBILITY_DROP_UNLOCKS;
  const envTime = process.env.ELIGIBILITY_DROP_UNLOCK_TIME?.trim();
  const envTz = process.env.ELIGIBILITY_DROP_UNLOCK_TZ?.trim();

  return {
    weekDropUnlocks: envUnlocks ? parseExplicitUnlocks(envUnlocks) : spec.weekDropUnlocks,
    weekDropUnlockTime: envTime || spec.weekDropUnlockTime,
    weekDropUnlockTimezone: envTz || spec.weekDropUnlockTimezone || "UTC",
  };
}

/**
 * Unix ms when a week's drop % becomes visible in the eligibility API.
 * Week 1 (idx 0) unlocks on programStart + 7d (date) at configured time / explicit ISO.
 */
export function weekDropUnlockAtMs(
  programStart: Date | null,
  weekIndex0: number,
  schedule: WeekDropSchedule = {},
): number | null {
  if (!programStart || Number.isNaN(programStart.getTime())) return null;

  const resolved = resolveWeekDropSchedule(schedule);
  const explicit = resolved.weekDropUnlocks?.[weekIndex0];
  if (explicit) {
    const t = new Date(explicit).getTime();
    if (!Number.isNaN(t)) return t;
  }

  const { y, m, d } = unlockCalendarDayUtc(programStart, weekIndex0);
  const tod = parseTimeOfDay(resolved.weekDropUnlockTime || "00:00:00");
  if (!tod) return programStart.getTime() + (weekIndex0 + 1) * WEEK_MS;

  const tz = resolved.weekDropUnlockTimezone || "UTC";
  if (tz === "UTC") return Date.UTC(y, m - 1, d, tod.h, tod.m, tod.s);
  return zonedLocalToUtc(y, m, d, tod.h, tod.m, tod.s, tz);
}

export function weekDropUnlockAtIso(
  programStart: Date | null,
  weekIndex0: number,
  schedule: WeekDropSchedule = {},
): string | null {
  const ms = weekDropUnlockAtMs(programStart, weekIndex0, schedule);
  return ms == null ? null : new Date(ms).toISOString();
}

/** True once the quest week has ended and that week's % may be reported to partners. */
export function isWeekDropUnlocked(
  programStart: Date | null,
  weekIndex0: number,
  now: Date = new Date(),
  schedule: WeekDropSchedule = {},
): boolean {
  const at = weekDropUnlockAtMs(programStart, weekIndex0, schedule);
  if (at == null) return true;
  return now.getTime() >= at;
}
