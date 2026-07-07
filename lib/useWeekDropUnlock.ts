'use client';

import { useEffect, useState } from 'react';

export type WeekDropUnlockMap = Record<number, boolean>;

function mapFromUnlockAt(unlockAt: Array<string | null | undefined>): WeekDropUnlockMap {
	const now = Date.now();
	const map: WeekDropUnlockMap = {};
	unlockAt.forEach((iso, idx) => {
		if (!iso) return;
		const ms = new Date(iso).getTime();
		if (!Number.isNaN(ms) && now >= ms) map[idx + 1] = true;
	});
	return map;
}

/** Timestamps are source of truth; server flags only add extra `true` (never force locked). */
function mergeDropUnlock(
	unlockAt: Array<string | null | undefined>,
	flags?: boolean[],
): WeekDropUnlockMap {
	const map = mapFromUnlockAt(unlockAt);
	if (!flags?.length) return map;
	flags.forEach((unlocked, idx) => {
		if (unlocked) map[idx + 1] = true;
	});
	return map;
}

/** Client schedule for Claim gating — mirrors `/api/eligibility/percent` drop unlock times. */
export function useWeekDropUnlock(): WeekDropUnlockMap {
	const [dropUnlockedByWeek, setDropUnlockedByWeek] = useState<WeekDropUnlockMap>({});

	useEffect(() => {
		const timers: ReturnType<typeof setTimeout>[] = [];
		let cancelled = false;

		const apply = (unlockAt: Array<string | null | undefined>, flags?: boolean[]) => {
			if (cancelled) return;
			setDropUnlockedByWeek(mergeDropUnlock(unlockAt, flags));
		};

		const scheduleNext = (unlockAt: Array<string | null | undefined>) => {
			const now = Date.now();
			for (const iso of unlockAt) {
				if (!iso) continue;
				const ms = new Date(iso).getTime() - now;
				if (ms > 0 && ms < 366 * 24 * 60 * 60 * 1000) {
					timers.push(setTimeout(() => apply(unlockAt), ms + 50));
				}
			}
		};

		(async () => {
			try {
				const res = await fetch('/api/config', { cache: 'no-store' });
				const json = (await res.json().catch(() => null)) as {
					weekDropUnlockAt?: Array<string | null>;
					weekDropUnlocked?: boolean[];
				} | null;
				if (!json) return;
				const unlockAt = json.weekDropUnlockAt ?? [];
				apply(unlockAt, json.weekDropUnlocked);
				scheduleNext(unlockAt);
			} catch {
				/* keep previous */
			}
		})();

		return () => {
			cancelled = true;
			timers.forEach(clearTimeout);
		};
	}, []);

	return dropUnlockedByWeek;
}
