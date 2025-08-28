export type Pt = { x:number; y:number };

const VW = 1000, VH = 562;

const toPx = (p:Pt) => ({ x:(p.x/100)*VW, y:(p.y/100)*VH });
const dist = (a:{x:number;y:number}, b:{x:number;y:number}) => Math.hypot(b.x-a.x, b.y-a.y) || 1;

function rng(seed:number){ return function(){ let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t>>>15, t|1); t ^= t + Math.imul(t ^ t>>>7, t|61); return ((t ^ t>>>14)>>>0)/4294967296; }; }

/** Build cubic Bézier path that EXACTLY passes through pts (alpha=0.5 centripetal CR) */
export function bezierThrough(pts: Pt[], alpha=0.5, chaos=0.35){
	if (pts.length < 2) return '';
	const P = pts.map(toPx);
	const pStart = P[0]!;
	let d = `M ${pStart.x},${pStart.y}`;
	const rand = rng(12345);
	for (let i=0;i<P.length-1;i++){
		const p0 = P[Math.max(0,i-1)]!, p1 = P[i]!, p2 = P[i+1]!, p3 = P[Math.min(P.length-1,i+2)]!;
		const t0 = 0;
		const t1 = t0 + Math.pow(dist(p0,p1), alpha);
		const t2 = t1 + Math.pow(dist(p1,p2), alpha);
		const t3 = t2 + Math.pow(dist(p2,p3), alpha);

		const m1x = (p2.x - p0.x) / (t2 - t0);
		const m1y = (p2.y - p0.y) / (t2 - t0);
		const m2x = (p3.x - p1.x) / (t3 - t1);
		const m2y = (p3.y - p1.y) / (t3 - t1);

		let c1x = p1.x + m1x * (t2 - t1) / 3;
		let c1y = p1.y + m1y * (t2 - t1) / 3;
		let c2x = p2.x - m2x * (t2 - t1) / 3;
		let c2y = p2.y - m2y * (t2 - t1) / 3;

		// chaos in handles only (perpendicular to p1→p2)
		if (chaos > 0){
			const dx = p2.x - p1.x, dy = p2.y - p1.y;
			const L = Math.hypot(dx,dy) || 1;
			const nx = -dy / L, ny = dx / L;
			const a1 = (rand()-0.5)*2*chaos*8;
			const a2 = (rand()-0.5)*2*chaos*8;
			c1x += nx * a1; c1y += ny * a1;
			c2x += nx * a2; c2y += ny * a2;
		}

		d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
	}
	return d;
}

export const VIEWBOX = { VW, VH };


