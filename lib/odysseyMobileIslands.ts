/**
 * Мобильные «материки» из Figma `146:3556` (карусель `203:1674`).
 * Файлы: `public/assets/odyssey/mobile-islands/week-1.png` … `week-8.png`.
 * Экспорт слоёв (Picsart / остров): 203:111, 203:814, 203:920, 203:1033, 203:1140, 203:1352, 203:1459, 203:1565.
 * Опционально: `npm run figma:mobile-islands` (нужен FIGMA_ACCESS_TOKEN).
 */
export const ODYSSEY_MOBILE_ISLAND_PATH = {
	1: '/assets/odyssey/mobile-islands/week-1.png',
	2: '/assets/odyssey/mobile-islands/week-2.png',
	3: '/assets/odyssey/mobile-islands/week-3.png',
	4: '/assets/odyssey/mobile-islands/week-4.png',
	5: '/assets/odyssey/mobile-islands/week-5.png',
	6: '/assets/odyssey/mobile-islands/week-6.png',
	7: '/assets/odyssey/mobile-islands/week-7.png',
	8: '/assets/odyssey/mobile-islands/week-8.png',
} as const;

export type OdysseyMobileIslandWeek = keyof typeof ODYSSEY_MOBILE_ISLAND_PATH;

export const ODYSSEY_MOBILE_ISLAND_WEEKS: OdysseyMobileIslandWeek[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** Тени с карточек Figma (Picsart frames). */
export const ODYSSEY_MOBILE_ISLAND_GLOW: Record<OdysseyMobileIslandWeek, string> = {
	1: '0px 20px 100px 0px rgba(230, 180, 104, 0.6)',
	2: '0px 20px 100px 0px rgba(208, 158, 99, 0.6)',
	3: '0px 20px 100px 0px rgba(178, 68, 208, 0.6)',
	4: '0px 20px 100px 0px rgba(237, 200, 119, 0.6)',
	5: '0px 20px 100px 0px rgba(138, 139, 32, 0.6)',
	6: '0px 20px 100px 0px rgba(178, 68, 208, 0.6)',
	7: '0px 20px 100px 0px rgba(237, 200, 119, 0.6)',
	8: '0px 20px 100px 0px rgba(138, 139, 32, 0.6)',
};
