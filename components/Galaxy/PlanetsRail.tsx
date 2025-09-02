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
	const PAD_X = ratio > 1.6 ? 8 : 6; // slight responsive padding
	const PAD_Y = ratio < 1.4 ? 8 : 6;
	const normalize = (v: number, pad: number) => pad + (v * (100 - pad * 2)) / 100;
	// Raise mascot higher so its center sits above the original
	const normStart = useMemo(() => ({ x: normalize(START.x, PAD_X), y: normalize(START.y, PAD_Y) - 3 }), [PAD_X, PAD_Y]);
	const points = useAnchors(containerRef.current);
	const [profileOpen, setProfileOpen] = useState(false);
	const [mascotHover, setMascotHover] = useState(false);
	const { address } = useAccount();

	const UNLOCK_ENV = Number(process.env.NEXT_PUBLIC_UNLOCKED_COUNT || '1');
	const unlockedCount = Number.isFinite(UNLOCK_ENV) ? Math.max(1, Math.min(PLANETS.length, Math.floor(UNLOCK_ENV))) : 1;

	return (
		<div ref={containerRef} className="relative w-full h-full overflow-hidden">
			<Image src="/assets/background.png" alt="Galaxy background" fill priority className="object-cover" />

			<CosmicPath points={points} />

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
				return (
					<div key={p.id} className="absolute" style={{ left: `${normalize(p.x, PAD_X)}%`, top: `${normalize(p.y, PAD_Y)}%`, transform: 'translate(-50%,-50%)' }}>
						<div data-week-anchor={p.id} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-px" />
						<PlanetNode
							id={p.id}
							imgSrc={p.img}
							title={p.title}
							stars={getStarsForWeek(p.id)}
							locked={locked}
							onView={locked ? undefined : (id) => openTasks(id)}
							onClaim={locked ? undefined : (id) => alert(`Claim for week ${id}`)}
							sizePx={110}
						/>
					</div>
				);
			})}

			<ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} address={address || undefined} />
		</div>
	);
}
