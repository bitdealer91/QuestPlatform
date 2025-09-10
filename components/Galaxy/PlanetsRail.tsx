'use client';
import Image from 'next/image';
import { START, PLANETS } from '@/lib/planets';
import { PlanetNode } from './PlanetNode';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CosmicPath } from '@/components/Galaxy/CosmicPath';
import ProfileDrawer from '@/components/ProfileDrawer';
import { useAccount } from 'wagmi';
import { useAnchors } from '../../hooks/useAnchors';

export function PlanetsRail({ getStarsForWeek, openTasks }: { getStarsForWeek: (id: number) => 0|1|2|3; openTasks: (id: number) => void }){
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [dims, setDims] = useState<{ w: number; h: number }>(() => ({ w: 1440, h: 810 }));
	useEffect(() => {
		if (!containerRef.current) return;
		const el = containerRef.current;
		const ro = new ResizeObserver((entries) => {
			const e = entries[0]; if (!e) return;
			const cr = e.contentRect as DOMRectReadOnly;
			setDims({ w: cr.width || window.innerWidth, h: cr.height || Math.max(1, Math.floor((cr.width || 1) / (16/9))) });
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	const ratio = dims.w / Math.max(1, dims.h);
	// Lock desktop padding to stabilize positions; keep a bit larger padding on narrow screens
	const isDesktop = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true;
	const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false;
	const PAD_X = isDesktop ? 6 : (ratio > 1.6 ? 8 : 6);
	const PAD_Y = isDesktop ? 6 : (ratio < 1.4 ? 8 : 6);
	const normalize = (v: number, pad: number) => pad + (v * (100 - pad * 2)) / 100;
	// Raise mascot higher so its center sits above the original
	const normStart = useMemo(() => {
		if (isMobile) return { x: normalize(10, PAD_X), y: normalize(10, PAD_Y) };
		return { x: normalize(START.x, PAD_X), y: normalize(START.y, PAD_Y) - 3 };
	}, [PAD_X, PAD_Y, isMobile]);
	const points = useAnchors(containerRef.current);
	const [profileOpen, setProfileOpen] = useState(false);
	const [mascotHover, setMascotHover] = useState(false);
	const { address } = useAccount();

	// By default, unlock all planets unless explicitly limited via env
	const UNLOCK_ENV = Number(process.env.NEXT_PUBLIC_UNLOCKED_COUNT || String(PLANETS.length));
	const unlockedCount = Number.isFinite(UNLOCK_ENV) ? Math.max(1, Math.min(PLANETS.length, Math.floor(UNLOCK_ENV))) : PLANETS.length;

	// Precomputed mobile positions (checkerboard)
	const mobilePositions = useMemo(() => {
		if (!isMobile) return null as Record<number, { x:number; y:number }> | null;
		const leftX = 24, rightX = 76; const yStart = 20, yStep = 11;
		const map: Record<number, { x:number; y:number }> = {};
		// Start on the right for the first planet, then alternate
		PLANETS.forEach((p, idx) => {
			const x = idx % 2 === 0 ? rightX : leftX;
			let y = yStart + idx * yStep;
			if (p.id === 2) y += 4; // lower the 2nd planet to avoid mascot overlap
			map[p.id] = { x, y };
		});
		return map;
	}, [isMobile]);

	// Build path points for mobile from our computed positions so the curve crosses centers exactly
	const pathPoints = useMemo(() => {
		if (!isMobile) return points as { x:number;y:number }[];
		const pts: { x:number; y:number }[] = [];
		pts.push({ x: normStart.x, y: normStart.y });
		PLANETS.forEach((p) => {
			const pos = mobilePositions ? mobilePositions[p.id]! : { x: p.x, y: p.y };
			pts.push({ x: normalize(pos.x, PAD_X), y: normalize(pos.y, PAD_Y) });
		});
		return pts;
	}, [isMobile, points, normStart.x, normStart.y, mobilePositions, PAD_X, PAD_Y]);

	return (
		<div ref={containerRef} className="relative w-full h-full overflow-hidden">
			<Image src="/assets/background.png" alt="Galaxy background" fill priority className="object-cover" />

			{!isMobile && (
				<CosmicPath points={points} chaos={0.2} />
			)}

			{/* Mascot anchor (visual only) */}
			<div className="absolute pointer-events-none" style={{ left: `${normStart.x}%`, top: `${normStart.y}%`, transform: 'translate(-50%,-50%)' }}>
				<div
					data-planet-anchor
					data-path-order={0}
					className={`relative transition-transform duration-200 ${mascotHover ? 'scale-[1.06] drop-shadow-[0_0_24px_var(--ring)]' : 'scale-100'} animate-[bob_2.6s_ease-in-out_infinite]`}
					style={{ width: 140, height: 140 }}
					onMouseEnter={() => setMascotHover(true)}
					onMouseLeave={() => setMascotHover(false)}
					onFocus={() => setMascotHover(true)}
					onBlur={() => setMascotHover(false)}
				>
					<Image src={START.img} alt={START.title} width={140} height={140} priority className="select-none pointer-events-none object-contain" />
				</div>
			</div>

			{/* Clickable overlay to open Profile */}
			<div className="absolute" style={{ left: `${normStart.x}%`, top: `${normStart.y}%`, transform: 'translate(-50%,-50%)' }}>
				<button
					aria-label="Open profile"
					onClick={() => setProfileOpen(true)}
					onMouseEnter={() => setMascotHover(true)}
					onMouseLeave={() => setMascotHover(false)}
					onFocus={() => setMascotHover(true)}
					onBlur={() => setMascotHover(false)}
					className="relative z-40 block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
					style={{ width: 140, height: 140 }}
				/>
			</div>

			{PLANETS.map(p => {
				const locked = p.id > unlockedCount; // unlock first N by env
				const claimEnabled = false; // temporarily disabled until further notice
				const claimUrl = 'https://claims.somnia.network/';
				return (
					<div key={p.id} className="absolute hover:z-50 focus-within:z-50" style={{ left: `${normalize(mobilePositions ? mobilePositions[p.id]?.x ?? p.x : p.x, PAD_X)}%`, top: `${normalize(mobilePositions ? mobilePositions[p.id]?.y ?? p.y : p.y, PAD_Y)}%`, transform: 'translate(-50%,-50%)' }}>
						<div data-week-anchor={p.id} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-px" />
						<PlanetNode
							id={p.id}
							imgSrc={p.img}
							title={p.title}
							stars={getStarsForWeek(p.id)}
							locked={locked}
							onView={locked ? undefined : (id) => openTasks(id)}
							onClaim={claimEnabled ? () => { if (typeof window !== 'undefined') window.location.href = claimUrl; } : undefined}
							claimEnabled={claimEnabled}
							sizePx={110}
						/>
					</div>
				);
			})}

			<ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} address={address || undefined} />
		</div>
	);
}
