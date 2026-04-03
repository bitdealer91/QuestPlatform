'use client';

import { PlanetNode } from './PlanetNode';
import { useLayoutEffect, useRef, useState } from 'react';
import ProfileDrawer from '@/components/ProfileDrawer';
import { useAccount } from 'wagmi';
import { PLANETS } from '@/lib/planets';
import { ODYSSEY_STAGE_H, ODYSSEY_STAGE_W, WEEK_TO_ISLAND, ODYSSEY_ISLANDS } from '@/lib/odysseyLayout';
import { OdysseyScenery } from '@/components/Odyssey/OdysseyScenery';
import { OdysseyHeader } from '@/components/Odyssey/OdysseyHeader';
import { OdysseyQuills } from '@/components/Odyssey/OdysseyQuills';

function islandCenterForWeek(weekId: number): { x: number; y: number } {
	const k = WEEK_TO_ISLAND[weekId] ?? 1;
	const r = ODYSSEY_ISLANDS[k];
	return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

function parseQuillsWeek(): number {
	const raw = process.env.NEXT_PUBLIC_ODYSSEY_QUILLS_WEEK;
	if (raw === undefined || raw === '') return 1;
	const n = Number(raw);
	if (!Number.isFinite(n)) return 1;
	return Math.min(8, Math.max(1, Math.floor(n)));
}

export function PlanetsRail({
	getStarsForWeek,
	openTasks,
	mandatoryDoneByWeek,
}: {
	getStarsForWeek: (id: number) => 0 | 1 | 2 | 3;
	openTasks: (id: number) => void;
	mandatoryDoneByWeek: Record<number, boolean>;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [scale, setScale] = useState(1);
	const [profileOpen, setProfileOpen] = useState(false);
	const { address } = useAccount();
	const quillsWeek = parseQuillsWeek();

	const UNLOCK_ENV = Number(process.env.NEXT_PUBLIC_UNLOCKED_COUNT || '1');
	const unlockedCountFromEnv = Number.isFinite(UNLOCK_ENV)
		? Math.max(1, Math.min(PLANETS.length, Math.floor(UNLOCK_ENV)))
		: 1;
	const unlockedCount = Math.max(8, unlockedCountFromEnv);

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const measure = () => {
			const rw = el.clientWidth;
			const rh = el.clientHeight;
			// Раньше мы жёстко ограничивали scale <= 1, из-за этого на широких экранах
			// сцена (и хедер внутри неё) не доходили до краёв viewport.
			// Теперь сцена может масштабироваться и вверх, чтобы заполнить доступную область.
			const s = Math.min(rw / ODYSSEY_STAGE_W, rh / ODYSSEY_STAGE_H);
			setScale(s || 1);
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	return (
		<div className="relative h-full w-full min-h-0 overflow-hidden">
			{/* Full-bleed video background — `object-cover` под любой размер экрана. */}
			<div className="pointer-events-none fixed inset-0 z-0 bg-[#03040c]" aria-hidden>
				<video
					className="absolute inset-0 h-full w-full object-cover object-center"
					autoPlay
					muted
					loop
					playsInline
					preload="auto"
					aria-hidden
				>
					<source src="/assets/background.mp4" type="video/mp4" />
				</video>
			</div>
			{/* Облака поверх фона, под материками (сцена z-10). */}
			<div className="pointer-events-none fixed inset-0 z-[1] mix-blend-normal" aria-hidden>
				<video
					className="absolute inset-0 h-full w-full object-cover object-center"
					autoPlay
					muted
					loop
					playsInline
					preload="auto"
					aria-hidden
				>
					<source src="/assets/31-moon.webm" type="video/webm" />
				</video>
			</div>

			<div ref={containerRef} className="relative z-10 flex h-full w-full min-h-0 items-center justify-center">
				<div
					className="relative overflow-visible"
					style={{
						width: ODYSSEY_STAGE_W * scale,
						height: ODYSSEY_STAGE_H * scale,
					}}
				>
					<div
						className="absolute left-0 top-0 origin-top-left"
						style={{
							width: ODYSSEY_STAGE_W,
							height: ODYSSEY_STAGE_H,
							transform: `scale(${scale})`,
						}}
						data-figma-node="12:18"
					>
						<OdysseyScenery />
						<OdysseyQuills week={quillsWeek} />
						<OdysseyHeader onProfileClick={() => setProfileOpen(true)} />

						{PLANETS.map((p) => {
							const locked = p.id > unlockedCount;
							const mandatoryDone = mandatoryDoneByWeek?.[p.id] === true;
							const claimEnabled = p.id >= 1 && p.id <= 8 && !locked && mandatoryDone;
							const claimUrl = 'https://claims.somnia.network/';
							const c = islandCenterForWeek(p.id);
							return (
								<div
									key={p.id}
									className="absolute z-[26] hover:z-50 focus-within:z-50"
									style={{ left: c.x, top: c.y, transform: 'translate(-50%, -50%)' }}
								>
									<div
										data-week-anchor={p.id}
										className="absolute left-1/2 top-1/2 h-px w-px -translate-x-1/2 -translate-y-1/2"
									/>
									<PlanetNode
										id={p.id}
										imgSrc={p.img}
										title={p.title}
										stars={getStarsForWeek(p.id)}
										locked={locked}
										hidePlanetArt
										onView={locked ? undefined : (id) => openTasks(id)}
										onClaim={
											claimEnabled
												? () => {
														if (typeof window !== 'undefined') window.location.href = claimUrl;
													}
												: undefined
										}
										claimEnabled={claimEnabled}
										mandatoryDone={mandatoryDone}
										sizePx={110}
									/>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			<ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} address={address || undefined} />
		</div>
	);
}
