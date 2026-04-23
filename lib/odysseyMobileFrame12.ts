/**
 * Мобильная карусель — **Frame 12** в Figma `333:33` (метаданные узла).
 * Здесь логические размеры группы острова (как «Picsart» / карточка недели) и позиция слоя `bear N`
 * в координатах того же фрейма; центр медведя переведён в доли ширины/высоты группы.
 *
 * Медведь в макете: 118×118. Координаты групп и bear — из XML `get_metadata` для `333:33`.
 */
import type { OdysseyMobileIslandWeek } from '@/lib/odysseyMobileIslands';

const BEAR_PX = 118;
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
		bearCxPct: (bx + HALF - gx) / gw,
		bearCyPct: (by + HALF - gy) / gh,
		/** Ширина квадрата медведя в % от ширины группы острова. */
		bearSidePct: (BEAR_PX / gw) * 100,
	};
}

/** Группы 1…8 и bear 1…8 — абсолютные x,y в Frame 12. */
const RAW: Record<
	OdysseyMobileIslandWeek,
	{ group: { x: number; y: number; w: number; h: number }; bear: { x: number; y: number } }
> = {
	1: { group: { x: 32, y: 129, w: 326, h: 251 }, bear: { x: 97, y: 136 } },
	2: { group: { x: 340, y: 101, w: 307, h: 279 }, bear: { x: 391, y: 150 } },
	3: { group: { x: 614, y: 136, w: 334, h: 196 }, bear: { x: 677, y: 145 } },
	4: { group: { x: 924, y: 88, w: 273, h: 281 }, bear: { x: 983, y: 128 } },
	5: { group: { x: 1165, y: 69, w: 293, h: 293 }, bear: { x: 1240, y: 146 } },
	6: { group: { x: 1379, y: 106, w: 346, h: 241 }, bear: { x: 1478, y: 151 } },
	7: { group: { x: 1662, y: 106, w: 333, h: 232 }, bear: { x: 1752, y: 125 } },
	8: { group: { x: 1931, y: 86, w: 335, h: 234 }, bear: { x: 2081, y: 140 } },
};

export const ODYSSEY_MOBILE_FRAME12_ISLAND: Record<
	OdysseyMobileIslandWeek,
	{
		islandW: number;
		islandH: number;
		bearCxPct: number;
		bearCyPct: number;
		bearSidePct: number;
	}
> = {
	1: islandAndBear(RAW[1].group, RAW[1].bear),
	2: islandAndBear(RAW[2].group, RAW[2].bear),
	3: islandAndBear(RAW[3].group, RAW[3].bear),
	4: islandAndBear(RAW[4].group, RAW[4].bear),
	5: islandAndBear(RAW[5].group, RAW[5].bear),
	6: islandAndBear(RAW[6].group, RAW[6].bear),
	7: islandAndBear(RAW[7].group, RAW[7].bear),
	8: islandAndBear(RAW[8].group, RAW[8].bear),
};
