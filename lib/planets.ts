export type Planet = { id: 1 | 2 | 3 | 4; title: string; img: string; x: number; y: number };

export const START = { x: 6, y: 24, img: '/assets/mascot.png', title: 'Mascot' } as const;

export const PLANETS: Planet[] = [
	{ id: 1, title: 'Week 1', img: '/assets/odyssey/week-1.png', x: 22, y: 22 },
	{ id: 2, title: 'Week 2', img: '/assets/odyssey/week-2.png', x: 62, y: 18 },
	{ id: 3, title: 'Week 3', img: '/assets/odyssey/week-3.png', x: 22, y: 66 },
	{ id: 4, title: 'Week 4', img: '/assets/odyssey/week-4.png', x: 82, y: 62 },
];
