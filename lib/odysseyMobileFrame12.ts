/**
 * Мобильная карусель — Frame 13 `482:1086` (390×500), 4 недели.
 */
import type { OdysseyMobileIslandWeek } from '@/lib/odysseyMobileIslands';

const BEAR_PX = 123.2;
const HALF = BEAR_PX / 2;

function islandAndBear(
	group: { x: number; y: number; w: number; h: number },
	bear: { x: number; y: number },
) {
	const { x: gx, y: gy, w: gw, h: gh } = group;
	const { x: bx, y: by } = bear;
	return {
		islandW: gw,
		islandH: gh,
		stripX: gx,
		stripY: gy,
		bearCxPct: (bx + HALF - gx) / gw,
		bearCyPct: (by + HALF - gy) / gh,
		bearSidePct: (BEAR_PX / gw) * 100,
	};
}

/** Группы недель 1–4 в полосе карусели (Frame 13). */
const RAW: Record<
	OdysseyMobileIslandWeek,
	{ group: { x: number; y: number; w: number; h: number }; bear: { x: number; y: number } }
> = {
	1: { group: { x: 0, y: 72, w: 340.7, h: 262.32 }, bear: { x: 123.2, y: 72 } },
	2: { group: { x: 324, y: 79, w: 328.14, h: 328.14 }, bear: { x: 420, y: 120 } },
	3: { group: { x: 621, y: 47, w: 361.35, h: 251.75 }, bear: { x: 689, y: 86 } },
	4: { group: { x: 910, y: 107, w: 343.59, h: 240 }, bear: { x: 1037, y: 149 } },
};

export const ODYSSEY_MOBILE_FRAME12_ISLAND: Record<
	OdysseyMobileIslandWeek,
	{
		islandW: number;
		islandH: number;
		stripX: number;
		stripY: number;
		bearCxPct: number;
		bearCyPct: number;
		bearSidePct: number;
	}
> = {
	1: islandAndBear(RAW[1].group, RAW[1].bear),
	2: islandAndBear(RAW[2].group, RAW[2].bear),
	3: islandAndBear(RAW[3].group, RAW[3].bear),
	4: islandAndBear(RAW[4].group, RAW[4].bear),
};
