import { NextResponse } from "next/server";
import { loadTasks } from "@/lib/store";
import {
  isWeekDropUnlocked,
  resolveWeekDropSchedule,
  weekDropUnlockAtIso,
} from "@/lib/eligibilityPercent";
import {
  dayUnlockAtIso,
  getMinDayByWeek,
  isWeekIslandUnlocked,
} from "@/lib/programDay";
import { resolveProgramWeeks } from "@/lib/weeks";

export const dynamic = "force-dynamic";

export async function GET(){
	const spec = await loadTasks();
	const weeks = resolveProgramWeeks(spec.weeks);
	const start = spec.programStart ? new Date(spec.programStart) : null;
	const dropSchedule = resolveWeekDropSchedule({
		weekDropUnlocks: spec.weekDropUnlocks,
		weekDropUnlockTime: spec.weekDropUnlockTime,
		weekDropUnlockTimezone: spec.weekDropUnlockTimezone,
	});
	const now = new Date();
	const minDayByWeek = getMinDayByWeek(spec.tasks || []);
	const weekDropUnlockAt = Array.from({ length: weeks }, (_, idx) =>
		weekDropUnlockAtIso(start, idx, dropSchedule),
	);
	const weekDropUnlocked = Array.from({ length: weeks }, (_, idx) =>
		isWeekDropUnlocked(start, idx, now, dropSchedule),
	);
	const weekIslandUnlockAt = Array.from({ length: weeks }, (_, idx) => {
		const weekId = idx + 1;
		const minDay = minDayByWeek[weekId];
		if (!start || minDay == null) return null;
		return dayUnlockAtIso(start, minDay);
	});
	const weekIslandUnlocked = Array.from({ length: weeks }, (_, idx) =>
		isWeekIslandUnlocked(idx + 1, start, minDayByWeek, now),
	);

	return NextResponse.json(
		{
			programStart: spec.programStart,
			weeks,
			minDayByWeek,
			weekDropUnlockSchedule: dropSchedule,
			weekDropUnlockAt,
			weekDropUnlocked,
			weekIslandUnlockAt,
			weekIslandUnlocked,
		},
		{
			headers: {
				"Cache-Control": "no-store, max-age=0",
			},
		},
	);
}
