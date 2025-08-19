export type Stars = 0 | 1 | 2 | 3;

export function percentToStars(percent: number): Stars {
	if (percent >= 67) return 3;
	if (percent >= 34) return 2;
	if (percent > 0) return 1;
	return 0;
}

export function clampPercent(p: number): number {
	return Math.max(0, Math.min(100, Math.round(p)));
}
