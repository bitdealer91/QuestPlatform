import { PROGRAM_WEEKS } from "@/lib/weeks";

/**
 * Maximum % unlocked per calendar program week when all mandatory tasks in that week are done.
 * 4-week Odyssey: 20% × 4 = 80% program max (remaining % if any lives off-chain / partner).
 */
export const ELIGIBILITY_UNLOCK_CAP_PER_WEEK = 20;

export function maxProgramUnlockForWeeks(programWeekCount: number): number {
  const n = Math.max(0, Math.floor(programWeekCount));
  return n * ELIGIBILITY_UNLOCK_CAP_PER_WEEK;
}

/** Default max for the capped program length (see `PROGRAM_WEEKS`). */
export const DEFAULT_MAX_PROGRAM_UNLOCK = maxProgramUnlockForWeeks(PROGRAM_WEEKS);
