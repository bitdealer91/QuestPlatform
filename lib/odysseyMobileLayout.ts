/**
 * Макет `146:3556` — iPhone 13/14 frame 390×844 (логические px).
 * Значения из Figma metadata; на узких экранах масштабируем через min(..., 100vw).
 */
export const ODYSSEY_MOBILE_FRAME_W = 390;

/** Высота зоны над каруселью (Frame 12 начинается с y=125). */
export const ODYSSEY_MOBILE_HEADER_ZONE_H = 125;

/** Высота области карусели (Frame 12 h=450). */
export const ODYSSEY_MOBILE_CAROUSEL_H = 450;

/** Макс. ширина карточки острова в карусели (Figma: неделя 6 — 346px). */
export const ODYSSEY_MOBILE_ISLAND_CARD_W = 346;
/** Референсная высота для первой недели (326×251). */
export const ODYSSEY_MOBILE_ISLAND_CARD_H = 251;

/** Горизонтальные поля у карточки: (390-326)/2 ≈ 32. */
export const ODYSSEY_MOBILE_ISLAND_SIDE_PAD = 32;

/** Кнопки Tasks / Profile (203:773, 203:770). */
export const ODYSSEY_MOBILE_BUTTON_W = 114;
export const ODYSSEY_MOBILE_BUTTON_H = 37;
export const ODYSSEY_MOBILE_BUTTON_GAP = 8;

/** Нижний ряд соц-иконок (203:742): от низа экрана ~16px в макете. */
export const ODYSSEY_MOBILE_SOCIAL_BOTTOM = 16;
