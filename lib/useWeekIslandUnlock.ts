'use client';

import { useEffect, useState } from 'react';

export type WeekIslandUnlockMap = Record<number, boolean>;

function mapFromFlags(flags: boolean[] | undefined): WeekIslandUnlockMap {
	const map: WeekIslandUnlockMap = {};
	if (!Array.isArray(flags)) return map;
	flags.forEach((unlocked, idx) => {
		if (unlocked) map[idx + 1] = true;
	});
	return map;
}

/** Island access by first task `day` in each week — mirrors `/api/week/[id]/tasks` gating. */
export function useWeekIslandUnlock(): WeekIslandUnlockMap {
	const [islandUnlockedByWeek, setIslandUnlockedByWeek] = useState<WeekIslandUnlockMap>({ 1: true });

	useEffect(() => {
		const timers: ReturnType<typeof setTimeout>[] = [];
		let cancelled = false;

		const apply = (flags?: boolean[]) => {
			if (cancelled || !flags?.length) return;
			setIslandUnlockedByWeek(mapFromFlags(flags));
		};

		const scheduleNext = (unlockAt: Array<string | null | undefined>) => {
			const now = Date.now();
			for (const iso of unlockAt) {
				if (!iso) continue;
				const ms = new Date(iso).getTime() - now;
				if (ms > 0 && ms < 366 * 24 * 60 * 60 * 1000) {
					timers.push(
						setTimeout(() => {
							fetch('/api/config', { cache: 'no-store' })
								.then((r) => r.json())
								.then((json) => apply(json?.weekIslandUnlocked))
								.catch(() => {});
						}, ms + 50),
					);
				}
			}
		};

		(async () => {
			try {
				const res = await fetch('/api/config', { cache: 'no-store' });
				const json = (await res.json().catch(() => null)) as {
					weekIslandUnlocked?: boolean[];
					weekIslandUnlockAt?: Array<string | null>;
				} | null;
				if (!json) return;
				apply(json.weekIslandUnlocked);
				scheduleNext(json.weekIslandUnlockAt ?? []);
			} catch {
				/* keep previous */
			}
		})();

		return () => {
			cancelled = true;
			timers.forEach(clearTimeout);
		};
	}, []);

	return islandUnlockedByWeek;
}

export function isPlanetWeekUnlocked(
	weekId: number,
	islandUnlockedByWeek: WeekIslandUnlockMap,
	envUnlockedCount: number,
): boolean {
	if (weekId <= envUnlockedCount) return true;
	return islandUnlockedByWeek[weekId] === true;
}

/** Bear / quills anchor follows the latest accessible program week. */
export function highestUnlockedPlanetWeek(
	islandUnlockedByWeek: WeekIslandUnlockMap,
	envUnlockedCount: number,
	maxWeek = 4,
): number {
	let highest = 1;
	for (let w = 1; w <= maxWeek; w++) {
		if (isPlanetWeekUnlocked(w, islandUnlockedByWeek, envUnlockedCount)) {
			highest = w;
		}
	}
	return highest;
}
