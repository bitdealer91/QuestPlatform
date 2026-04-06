/** Figma: frame `Odyssey 1` node `12:18` — 1280×832. Порядок слоёв = порядок детей во фрейме (снизу вверх). */

export const ODYSSEY_STAGE_W = 1280;
export const ODYSSEY_STAGE_H = 832;

export const ODYSSEY_BG_ART_W = 1514;
export const ODYSSEY_BG_ART_H = 852;

export type OdysseyRect = { x: number; y: number; w: number; h: number };

/**
 * Рамки материков (родительские frame в 12:18) — координаты из Figma metadata.
 * Имена 1–8 = слои «1»…«8» в файле, не порядок недель квеста.
 */
export const ODYSSEY_ISLANDS: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, OdysseyRect> = {
	6: { x: 383, y: 101.7900390625, w: 299.99066811427474, h: 253.75739791989326 },
	7: { x: 290, y: 264, w: 491, h: 350 },
	5: { x: 655.744384765625, y: 55, w: 347.6528432273308, h: 359.64471367978035 },
	8: { x: 55, y: 141, w: 363.2957763671875, h: 258.4163513183594 },
	4: { x: 868, y: 243, w: 316, h: 247 },
	3: { x: 701, y: 439, w: 525, h: 274 },
	2: { x: 371, y: 485, w: 441, h: 343 },
	/** Как в Figma metadata: якорь поворота и геометрии пути; арт визуально выше — `ISLAND1_ART_NUDGE_Y`. */
	1: { x: 57, y: 514.247314453125, w: 489.5990278517247, h: 280.16912732860396 },
};

/** Сдвиг только арта (glow/base) вверх в локальных координатах после поворота (−30 ≈ прежний подъём без двига пути). */
export const ISLAND1_ART_NUDGE_Y = -30;

/** Доп. сдвиг слоя пунктира вниз внутри фрейма «1» (путь не привязан к сдвигу арта). */
export const ISLAND1_PATH_EXTRA_TOP_PX = 3;

/** Z-index по порядку слоёв Figma (первый в списке = ниже). После bg идёт social, затем 6→7→5→8→4→3→2→1. */
export const Z = {
	social: 5,
	island6: 10,
	island7: 11,
	island5: 12,
	island8: 13,
	island4: 14,
	island3: 15,
	island2: 16,
	/** Старт + пунктир внутри (путь — последний ребёнок в «1», поверх базы). */
	island1: 17,
} as const;

/** Фрейм «1»: поворот группы (Figma MCP). Пунктир и база вращаются вместе с ним. */
export const ISLAND1_ROTATE_DEG = -4.15;

/** Figma `5:10` (ellipse) внутри `41:6`. */
export const ISLAND1_GLOW_REL: OdysseyRect = {
	x: 73.5402603149414,
	y: 69.15111541748047,
	w: 326.90222743718414,
	h: 182.280684353816,
};

/** Figma `4:4` (base) внутри `41:6`. */
export const ISLAND1_BASE_REL: OdysseyRect = {
	x: 8.525622367858887,
	y: 20.67156982421875,
	w: 489.4335088611051,
	h: 280.157111138735,
};

/**
 * Group 2 `113:208` внутри `41:6` (get_metadata): (137.58, −301.23), 878.87×596.97.
 * viewBox `path-dots.svg`: 862.58×557.399. Пропорции разные → object-fill на 879×597 искажает путь.
 * Берём ширину = ширине группы Figma, высоту = w·(viewBoxH/viewBoxW) — тогда object-fill даёт
 * одинаковый scale по осям; по вертикали центрируем в рамке группы (лишняя высота — поля под фильтры).
 */
const PATH_VIEWBOX_W = 862.58;
const PATH_VIEWBOX_H = 557.399;
const PATH_GROUP_X = 137.58030700683594;
const PATH_GROUP_Y = -301.2300109863281;
const PATH_GROUP_W = 878.8701403999175;
const PATH_GROUP_H = 596.9670173203426;
const PATH_CONTAINER_H = (PATH_GROUP_W * PATH_VIEWBOX_H) / PATH_VIEWBOX_W;
const PATH_VERTICAL_INSET = (PATH_GROUP_H - PATH_CONTAINER_H) / 2;
/** Отрицательное — сдвиг вверх относительно центрирования в группе Figma (визуальная подгонка к макету). */
const PATH_VERTICAL_NUDGE_PX = -40;

export const ISLAND1_PATH_REL: OdysseyRect = {
	x: PATH_GROUP_X,
	y: PATH_GROUP_Y + PATH_VERTICAL_INSET + PATH_VERTICAL_NUDGE_PX,
	w: PATH_GROUP_W,
	h: PATH_CONTAINER_H,
};

/** Figma `106:142` — в координатах сцены (не внутри поворота «1»). */
export const ODYSSEY_BEAR_FRAME: OdysseyRect = { x: 245, y: 532, w: 114, h: 114 };

export const QUILLS_ANCHORS: Record<number, { x: number; y: number }> = {
	1: {
		x: ODYSSEY_BEAR_FRAME.x + ODYSSEY_BEAR_FRAME.w / 2,
		y: ODYSSEY_BEAR_FRAME.y + ODYSSEY_BEAR_FRAME.h / 2,
	},
	2: {
		x: ODYSSEY_ISLANDS[2].x + ODYSSEY_ISLANDS[2].w / 2,
		y: ODYSSEY_ISLANDS[2].y + ODYSSEY_ISLANDS[2].h / 2,
	},
	3: {
		x: ODYSSEY_ISLANDS[3].x + ODYSSEY_ISLANDS[3].w / 2,
		y: ODYSSEY_ISLANDS[3].y + ODYSSEY_ISLANDS[3].h / 2,
	},
	4: {
		x: ODYSSEY_ISLANDS[4].x + ODYSSEY_ISLANDS[4].w / 2,
		y: ODYSSEY_ISLANDS[4].y + ODYSSEY_ISLANDS[4].h / 2,
	},
	5: {
		x: ODYSSEY_ISLANDS[5].x + ODYSSEY_ISLANDS[5].w / 2,
		y: ODYSSEY_ISLANDS[5].y + ODYSSEY_ISLANDS[5].h / 2,
	},
	6: {
		x: ODYSSEY_ISLANDS[6].x + ODYSSEY_ISLANDS[6].w / 2,
		y: ODYSSEY_ISLANDS[6].y + ODYSSEY_ISLANDS[6].h / 2,
	},
	7: {
		x: ODYSSEY_ISLANDS[7].x + ODYSSEY_ISLANDS[7].w / 2,
		y: ODYSSEY_ISLANDS[7].y + ODYSSEY_ISLANDS[7].h / 2,
	},
	8: {
		x: ODYSSEY_ISLANDS[8].x + ODYSSEY_ISLANDS[8].w / 2,
		y: ODYSSEY_ISLANDS[8].y + ODYSSEY_ISLANDS[8].h / 2,
	},
};

export const ODYSSEY_SOCIAL: OdysseyRect = { x: 1126, y: 774, w: 140, h: 40 };

export const WEEK_TO_ISLAND: Record<number, keyof typeof ODYSSEY_ISLANDS> = {
	1: 1,
	2: 2,
	3: 3,
	4: 4,
	5: 5,
	6: 6,
	7: 7,
	8: 8,
};
