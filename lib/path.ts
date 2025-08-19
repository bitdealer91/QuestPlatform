export type Pt = { x: number; y: number };

export const VIEW_W = 1000;
export const VIEW_H = 562;
export const VIEWBOX = { VIEW_W, VIEW_H } as const;

const px = (p: Pt) => `${(p.x / 100) * VIEW_W},${(p.y / 100) * VIEW_H}`;

export function buildSmoothPath(points: Pt[]): string {
	if (!points || points.length < 2) return '';
	const pts = points.slice();
	const d: string[] = [];
	d.push(`M ${px(pts[0] as Pt)}`);
	const n = pts.length;
	for (let i = 0; i < n - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)] as Pt;
		const p1 = pts[i] as Pt;
		const p2 = pts[i + 1] as Pt;
		const p3 = pts[Math.min(n - 1, i + 2)] as Pt;
		// Catmull-Rom to cubic Bezier approximation
		const c1: Pt = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
		const c2: Pt = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
		d.push(`C ${px(c1)} ${px(c2)} ${px(p2)}`);
	}
	return d.join(' ');
}

export function getDash(totalLen: number){
	return { dashArray: `${totalLen/60} ${totalLen/14}`, speed: totalLen/6 };
}
