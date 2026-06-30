/** New quest `day` values unlock daily at 12:00 UTC (see `/api/week/[id]/tasks`). */
export const PROGRAM_DAY_UNLOCK_NOON_UTC_MS = 12 * 60 * 60 * 1000;
export const PROGRAM_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Highest `day` number visible now. Day 1 unlocks at programStart 12:00 UTC,
 * day 2 on the next calendar day at 12:00 UTC, etc.
 */
export function getProgramElapsedDay(programStart: Date | null, now: Date = new Date()): number {
  if (!programStart || Number.isNaN(programStart.getTime())) return Number.POSITIVE_INFINITY;
  const firstUnlockMs = programStart.getTime() + PROGRAM_DAY_UNLOCK_NOON_UTC_MS;
  if (now.getTime() < firstUnlockMs) return 0;
  return Math.floor((now.getTime() - firstUnlockMs) / PROGRAM_DAY_MS) + 1;
}

export function getMinDayByWeek(
  tasks: Array<{ week?: number; day?: number }>,
): Record<number, number> {
  const map: Record<number, number> = {};
  for (const t of tasks) {
    if (typeof t.week !== "number" || typeof t.day !== "number") continue;
    const prev = map[t.week];
    map[t.week] = prev == null ? t.day : Math.min(prev, t.day);
  }
  return map;
}

/** Island week N is accessible when the first task day in that week is live. */
export function isWeekIslandUnlocked(
  weekId: number,
  programStart: Date | null,
  minDayByWeek: Record<number, number>,
  now: Date = new Date(),
): boolean {
  if (weekId < 1) return false;
  const minDay = minDayByWeek[weekId];
  if (minDay == null) return weekId === 1;
  return getProgramElapsedDay(programStart, now) >= minDay;
}

export function dayUnlockAtIso(programStart: Date, day: number): string {
  const ms =
    programStart.getTime() +
    (day - 1) * PROGRAM_DAY_MS +
    PROGRAM_DAY_UNLOCK_NOON_UTC_MS;
  return new Date(ms).toISOString();
}
