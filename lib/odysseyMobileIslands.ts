/**
 * Мобильные острова — PNG @2x из Frame 13, без bear.
 * `npm run figma:odyssey-mobile`
 */
export type OdysseyMobileIslandWeek = 1 | 2 | 3 | 4;

export type OdysseyMobileIslandLayer = {
	src: string;
	left: string;
	top: string;
	width: string;
	height: string;
	objectFit?: 'fill' | 'cover';
	objectPosition?: string;
	transform?: string;
	/** CSS glow на слое (только остров, не декор). */
	glow?: boolean;
};

export const ODYSSEY_MOBILE_ISLAND_LAYERS: Record<OdysseyMobileIslandWeek, OdysseyMobileIslandLayer[]> = {
	1: [
		{
			src: '/assets/odyssey/mobile-islands/week-1.png',
			left: '0',
			top: '0',
			width: '100%',
			height: '100%',
			objectFit: 'fill',
			glow: true,
		},
	],
	2: [
		{
			src: '/assets/odyssey/mobile-islands/week-2.png',
			left: '0',
			top: '0',
			width: '100%',
			height: '100%',
			objectFit: 'fill',
			glow: true,
		},
	],
	3: [
		{
			src: '/assets/odyssey/mobile-islands/week-3-base.png',
			left: '0',
			top: '0',
			width: '100%',
			height: '100%',
			objectFit: 'fill',
			objectPosition: 'bottom',
			glow: true,
		},
		{
			src: '/assets/odyssey/mobile-islands/week-3-rocks.png',
			left: '28.92%',
			top: '36.15%',
			width: '36.42%',
			height: '39.05%',
			objectFit: 'fill',
			glow: false,
		},
	],
	4: [
		{
			src: '/assets/odyssey/mobile-islands/week-4.png',
			left: '0',
			top: '0',
			width: '100%',
			height: '100%',
			objectFit: 'fill',
			objectPosition: 'bottom',
			glow: true,
		},
	],
};

export const ODYSSEY_MOBILE_ISLAND_WEEKS: OdysseyMobileIslandWeek[] = [1, 2, 3, 4];
