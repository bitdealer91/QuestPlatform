/**
 * Мобильная карусель — Figma iPhone `146:3556` / Frame 13 `482:1086` (390×500).
 */
export const ODYSSEY_MOBILE_FRAME_W = 390;

export const ODYSSEY_MOBILE_HEADER_ZONE_H = 125;

/** Высота области карусели (Frame 13 h=500). */
export const ODYSSEY_MOBILE_CAROUSEL_H = 500;

/** Макс. ширина карточки (неделя 3 — 361.35px). */
export const ODYSSEY_MOBILE_ISLAND_CARD_W = 361.35;

/** Референсная высота недели 1. */
export const ODYSSEY_MOBILE_ISLAND_CARD_H = 262.32;

/** Левый край группы в полосе Frame 13. */
export const ODYSSEY_MOBILE_ISLAND_STRIP_X = {
	1: 0,
	2: 324,
	3: 621,
	4: 910,
} as const;

/** Верхний край группы в Frame 13 (выравнивание по макету). */
export const ODYSSEY_MOBILE_ISLAND_STRIP_Y = {
	1: 72,
	2: 79,
	3: 47,
	4: 107,
} as const;

export const ODYSSEY_MOBILE_CAROUSEL_INNER_W = ODYSSEY_MOBILE_FRAME_W;

export const ODYSSEY_MOBILE_BUTTON_W = 114;
export const ODYSSEY_MOBILE_BUTTON_H = 37;
export const ODYSSEY_MOBILE_BUTTON_GAP = 8;

export const ODYSSEY_MOBILE_SOCIAL_BOTTOM = 16;

export const ODYSSEY_MOBILE_ISLAND_VISUAL_SCALE = 1;

/** Лёгкое свечение для мобилки (мягче десктопа, без «прямоугольника» на @2x PNG). */
export function odysseyMobileIslandGlow(r: number, g: number, b: number): string {
	return [
		`drop-shadow(0 10px 28px rgba(${r}, ${g}, ${b}, 0.26))`,
		`drop-shadow(0 4px 14px rgba(0, 0, 0, 0.16))`,
	].join(' ');
}

export const ODYSSEY_MOBILE_WEEK_GLOW: Record<1 | 2 | 3 | 4, string> = {
	1: odysseyMobileIslandGlow(230, 180, 104),
	2: odysseyMobileIslandGlow(103, 181, 167),
	3: odysseyMobileIslandGlow(237, 200, 119),
	4: odysseyMobileIslandGlow(138, 139, 32),
};
