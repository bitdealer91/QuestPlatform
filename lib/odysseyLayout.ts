/** Figma: frame `Odyssey 6` node `432:2` — 1280×832. */

import { PROGRAM_WEEKS } from '@/lib/weeks';

export const ODYSSEY_STAGE_W = 1280;
export const ODYSSEY_STAGE_H = 832;

/** Высота десктоп-хедера (Figma bar), вычитается из viewport при fit сцены. */
export const ODYSSEY_DESKTOP_TOP_CHROME_H = 73;

/**
 * Масштаб десктоп-сцены: только уменьшение (≤1), чтобы острова/мосты/путь не «расползались».
 * На широких экранах сцена остаётся 1280×832 по центру; растёт только фон (object-cover).
 */
export function getOdysseyDesktopStageScale(
	viewportWidth: number,
	viewportHeight: number,
	topChromePx = ODYSSEY_DESKTOP_TOP_CHROME_H,
): number {
	const innerH = Math.max(0, viewportHeight - topChromePx);
	if (viewportWidth <= 0 || innerH <= 0) return 1;
	return Math.min(1, viewportWidth / ODYSSEY_STAGE_W, innerH / ODYSSEY_STAGE_H);
}

export const ODYSSEY_BG_ART_W = 1514;
export const ODYSSEY_BG_ART_H = 852;

export type OdysseyRect = { x: number; y: number; w: number; h: number };

export type OdysseyWeekKey = 1 | 2 | 3 | 4;

export type OdysseyImageInset = {
	height?: string;
	width?: string;
	top?: string;
	left?: string;
	right?: string;
	bottom?: string;
	objectFit?: 'cover' | 'contain' | 'fill';
	objectPosition?: string;
};

export type OdysseyGlow = string;

export type OdysseyWeekDef = OdysseyRect & {
	image: string;
	glow: OdysseyGlow;
	z: number;
	inset?: OdysseyImageInset;
	/** fill = PNG @2x в размер фрейма; cover = исходник imageRef в рамке */
	objectFit?: 'cover' | 'fill';
	objectPosition?: string;
	imageClip?: boolean;
};

export type OdysseyBridgeDef = {
	id: string;
	rect: OdysseyRect;
	src: string;
	glow: OdysseyGlow;
	z: number;
	inset?: OdysseyImageInset;
	objectFit?: 'cover' | 'fill';
	objectPosition?: string;
};

const islandGlow = (r: number, g: number, b: number) =>
	[
		`drop-shadow(0 18px 56px rgba(${r}, ${g}, ${b}, 0.42))`,
		`drop-shadow(0 6px 28px rgba(0, 0, 0, 0.28))`,
	].join(' ');

const bridgeGlow = (r: number, g: number, b: number) =>
	[
		`drop-shadow(0 10px 32px rgba(${r}, ${g}, ${b}, 0.38))`,
		`drop-shadow(0 4px 16px rgba(0, 0, 0, 0.22))`,
	].join(' ');

/**
 * PNG @2x + absolute_bounds из Figma → object-fit: fill в фрейм.
 * `npm run figma:odyssey-desktop`
 */
export const ODYSSEY_WEEKS: Record<OdysseyWeekKey, OdysseyWeekDef> = {
	1: {
		x: 114,
		y: 124,
		w: 448,
		h: 344.933,
		image: '/assets/odyssey/week-1.png',
		glow: islandGlow(230, 180, 104),
		z: 10,
		objectFit: 'fill',
	},
	2: {
		x: 763,
		y: 83,
		w: 410.688,
		h: 410.688,
		image: '/assets/odyssey/week-2.png',
		glow: islandGlow(103, 181, 167),
		z: 12,
		objectFit: 'fill',
	},
	3: {
		x: 683,
		y: 416,
		w: 456,
		h: 318,
		image: '/assets/odyssey/week-3.png',
		glow: islandGlow(237, 200, 119),
		z: 15,
		objectFit: 'fill',
	},
	4: {
		x: 60,
		y: 394,
		w: 468,
		h: 327,
		image: '/assets/odyssey/week-4.png',
		glow: islandGlow(138, 139, 32),
		z: 16,
		objectFit: 'fill',
	},
};

export const ODYSSEY_WEEK_ISLANDS: Record<OdysseyWeekKey, OdysseyRect> = {
	1: ODYSSEY_WEEKS[1],
	2: ODYSSEY_WEEKS[2],
	3: ODYSSEY_WEEKS[3],
	4: ODYSSEY_WEEKS[4],
};

export const ODYSSEY_ISLANDS = ODYSSEY_WEEK_ISLANDS;

export const ODYSSEY_BRIDGES: OdysseyBridgeDef[] = [
	{
		id: 'bridge-3',
		rect: { x: 509, y: 165, w: 330, h: 220 },
		src: '/assets/odyssey/bridge-3.png',
		glow: bridgeGlow(170, 140, 101),
		z: 11,
		objectFit: 'fill',
	},
	{
		id: 'bridge-2',
		rect: { x: 1020, y: 319, w: 151, h: 227 },
		src: '/assets/odyssey/bridge-2.png',
		glow: bridgeGlow(235, 186, 121),
		z: 13,
		objectFit: 'fill',
	},
	{
		id: 'bridge-1',
		rect: { x: 100, y: 323, w: 151, h: 227 },
		src: '/assets/odyssey/bridge-1.png',
		glow: bridgeGlow(235, 186, 121),
		z: 14,
		objectFit: 'fill',
	},
	{
		id: 'bridge-center',
		rect: { x: 405, y: 511, w: 442, h: 294 },
		src: '/assets/odyssey/bridge-center.png',
		glow: bridgeGlow(229, 196, 156),
		z: 17,
		objectFit: 'fill',
	},
];

/** Пунктир — группа `452:547` (без rotate в Figma), SVG = bounds группы. */
export const ODYSSEY_PATH = {
	wrapper: { x: 200.0556640625, y: 200.1353117262588, w: 929.743096062286, h: 490.70504417430493 },
	src: '/assets/odyssey/path-dots-v6.svg',
	z: 18,
} as const;

export const ODYSSEY_BEAR_FRAME: OdysseyRect = { x: 276, y: 124, w: 162, h: 162 };

function islandCenter(k: OdysseyWeekKey) {
	const r = ODYSSEY_WEEKS[k];
	return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export const QUILLS_ANCHORS: Record<number, { x: number; y: number }> = {
	1: {
		x: ODYSSEY_BEAR_FRAME.x + ODYSSEY_BEAR_FRAME.w / 2,
		y: ODYSSEY_BEAR_FRAME.y + ODYSSEY_BEAR_FRAME.h / 2,
	},
	2: islandCenter(2),
	3: islandCenter(3),
	4: islandCenter(4),
};

export const ODYSSEY_SOCIAL: OdysseyRect = { x: 1126, y: 774, w: 140, h: 40 };

export const WEEK_TO_ISLAND: Record<number, OdysseyWeekKey> = {
	1: 1,
	2: 2,
	3: 3,
	4: 4,
};

/**
 * HUD «View Tasks / Claim» — доля высоты hit-зоны от верха (не 100%, иначе кнопки уезжают под остров).
 * Доп. сдвиг по неделям в `ODYSSEY_WEEK_HUD_NUDGE_Y` (px, отрицательный — ещё выше).
 */
export const ODYSSEY_HUD_TOP_PCT = 68;

/** px, от `ODYSSEY_HUD_TOP_PCT`; подогнано под форму каждого материка. */
export const ODYSSEY_WEEK_HUD_NUDGE_Y: Record<OdysseyWeekKey, number> = {
	1: -8,
	2: -24,
	3: -4,
	4: -12,
};

export const ODYSSEY_WEEK_COUNT = PROGRAM_WEEKS;
