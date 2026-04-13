/**
 * Макет `146:3556` — iPhone 13/14 frame 390×844 (логические px).
 * Карусель островов: Figma **Frame 12** `333:33` — 390×450; Picsart недели 1 — 326×251, x=32.
 * Значения из Figma metadata; на узких экранах масштабируем через min(..., 100vw).
 */
export const ODYSSEY_MOBILE_FRAME_W = 390;

/**
 * Референсная высота верхней «полосы» в полном экране Figma `146:3556` (до карусели).
 * Сам хедер в коде компактный (~кнопка 45px + отступы), без фиксированных 125px.
 */
export const ODYSSEY_MOBILE_HEADER_ZONE_H = 125;

/** Высота области карусели (Frame 12 h=450). */
export const ODYSSEY_MOBILE_CAROUSEL_H = 450;

/** Макс. ширина карточки острова в карусели (Figma: неделя 6 — 346px). */
export const ODYSSEY_MOBILE_ISLAND_CARD_W = 346;
/** Референсная высота для первой недели (326×251). */
export const ODYSSEY_MOBILE_ISLAND_CARD_H = 251;

/** Горизонтальные поля у карточки: (390-326)/2 ≈ 32 (Frame 12 / 333:33). */
export const ODYSSEY_MOBILE_ISLAND_SIDE_PAD = 32;

/**
 * Левый край группы острова в Frame 12 (`333:33`) — как в макете карусели, не равномерный ряд.
 * Между 1→2 перекрытие ~18px, из‑за этого виден больший «peek» соседа, чем при flex+gap.
 */
export const ODYSSEY_MOBILE_ISLAND_STRIP_X = {
	1: 32,
	2: 340,
	3: 614,
	4: 924,
	5: 1165,
	6: 1379,
	7: 1662,
	8: 1931,
} as const;

/** Внутренняя ширина под остров в Frame 12: 390 − 2×32 = 326. */
export const ODYSSEY_MOBILE_CAROUSEL_INNER_W =
	ODYSSEY_MOBILE_FRAME_W - 2 * ODYSSEY_MOBILE_ISLAND_SIDE_PAD;

/** Кнопки Tasks / Profile (203:773, 203:770). */
export const ODYSSEY_MOBILE_BUTTON_W = 114;
export const ODYSSEY_MOBILE_BUTTON_H = 37;
export const ODYSSEY_MOBILE_BUTTON_GAP = 8;

/** Нижний ряд соц-иконок (203:742): от низа экрана ~16px в макете. */
export const ODYSSEY_MOBILE_SOCIAL_BOTTOM = 16;
