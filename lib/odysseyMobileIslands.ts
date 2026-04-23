/**
 * Мобильные острова (только арт карты / Picsart), без медведя — медведь накладывается в коде
 * по координатам Frame 12 (`lib/odysseyMobileFrame12.ts`).
 * Файлы: `public/assets/odyssey/mobile-islands/week-1.png` … `week-8.png`.
 * Желательно экспорт 1:1 к размеру группы в Figma, чтобы не было лишних полей при `object-contain`.
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
