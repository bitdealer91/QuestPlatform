import { useLayoutEffect, useState } from 'react';

export type Pt = { x: number; y: number };

export function useAnchors(container: HTMLElement | null) {
	const [pts, setPts] = useState<Pt[]>([]);

	useLayoutEffect(() => {
		if (!container) return;

		const calc = () => {
			const c = container.getBoundingClientRect();
			const nodes = Array.from(container.querySelectorAll('[data-planet-anchor]')) as HTMLElement[];
			nodes.sort((a, b) => Number(a.dataset.pathOrder || 0) - Number(b.dataset.pathOrder || 0));
			const list = nodes.map((el) => {
				const r = el.getBoundingClientRect();
				const cx = ((r.left + r.width / 2) - c.left) / Math.max(1, c.width) * 100;
				let cy = ((r.top + r.height / 2) - c.top) / Math.max(1, c.height) * 100;
				const order = Number((el as HTMLElement).dataset.pathOrder || 0);
				if (order === 5) cy -= 4;
				if (order === 7) cy -= 4;
				if (order === 8) cy -= 4;
				return { x: cx, y: cy } as Pt;
			});
			setPts(list);
		};

		calc();
		const ro = new ResizeObserver(calc);
		ro.observe(container);
		Array.from(container.querySelectorAll('[data-planet-anchor]')).forEach((n) => ro.observe(n));
		window.addEventListener('load', calc);

		return () => {
			ro.disconnect();
			window.removeEventListener('load', calc);
		};
	}, [container]);

	return pts;
}


