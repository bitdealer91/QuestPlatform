export type Planet = { id: 1|2|3|4|5|6|7|8; title: string; img: string; x: number; y: number };

export const START = { x: 6, y: 24, img: '/assets/mascot.png', title: 'Mascot' } as const;

export const PLANETS: Planet[] = [
  { id: 1, title: 'Week 1', img: '/assets/1.png', x: 22, y: 22 },
  { id: 2, title: 'Week 2', img: '/assets/2.png', x: 52, y: 18 },
  { id: 3, title: 'Week 3', img: '/assets/3.png', x: 82, y: 22 },
  { id: 4, title: 'Week 4', img: '/assets/4.png', x: 84, y: 62 },
  { id: 5, title: 'Week 5', img: '/assets/5.png', x: 54, y: 88 },
  { id: 6, title: 'Week 6', img: '/assets/6.png', x: 22, y: 66 },
  { id: 7, title: 'Week 7', img: '/assets/7.png', x: 44, y: 49 },
  { id: 8, title: 'Week 8', img: '/assets/8.png', x: 64, y: 56 },
];
