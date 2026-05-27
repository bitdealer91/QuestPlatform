/** Active Odyssey program length (UI + quest timeline). */
export const PROGRAM_WEEKS = 4;

export function resolveProgramWeeks(specWeeks?: number): number {
	const n = Number(specWeeks);
	if (Number.isFinite(n) && n >= 1) {
		return Math.min(PROGRAM_WEEKS, Math.floor(n));
	}
	return PROGRAM_WEEKS;
}

export function isValidProgramWeek(week: number): boolean {
	return Number.isInteger(week) && week >= 1 && week <= PROGRAM_WEEKS;
}
