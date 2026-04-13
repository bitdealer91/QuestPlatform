'use client';

import { PlanetNode } from './PlanetNode';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import ProfileDrawer from '@/components/ProfileDrawer';
import { useAccount } from 'wagmi';
import { PLANETS, type Planet } from '@/lib/planets';
import {
	ODYSSEY_MOBILE_ISLAND_GLOW,
	ODYSSEY_MOBILE_ISLAND_PATH,
	type OdysseyMobileIslandWeek,
} from '@/lib/odysseyMobileIslands';
import {
	ODYSSEY_MOBILE_BUTTON_GAP,
	ODYSSEY_MOBILE_BUTTON_H,
	ODYSSEY_MOBILE_BUTTON_W,
	ODYSSEY_MOBILE_CAROUSEL_H,
	ODYSSEY_MOBILE_CAROUSEL_INNER_W,
	ODYSSEY_MOBILE_ISLAND_CARD_W,
	ODYSSEY_MOBILE_ISLAND_SIDE_PAD,
	ODYSSEY_MOBILE_SOCIAL_BOTTOM,
} from '@/lib/odysseyMobileLayout';
import {
	ISLAND1_ART_NUDGE_Y,
	ODYSSEY_STAGE_H,
	ODYSSEY_STAGE_W,
	WEEK_TO_ISLAND,
	ODYSSEY_ISLANDS,
} from '@/lib/odysseyLayout';
import { OdysseyScenery } from '@/components/Odyssey/OdysseyScenery';
import { OdysseyHeader } from '@/components/Odyssey/OdysseyHeader';
import { OdysseyMobileHeader } from '@/components/Odyssey/OdysseyMobileHeader';
import { OdysseyQuills } from '@/components/Odyssey/OdysseyQuills';
import { OdysseySocial } from '@/components/Odyssey/OdysseySocial';
import { useReown } from '@/lib/reown';

/** Figma groups 203:777, 1683, 1031, 1246, 1247, 1458, 1566, 1672 — размер Picsart + центр медведя 118×118. */
const MOBILE_ISLAND_FRAME: Record<
	OdysseyMobileIslandWeek,
	{
		w: number;
		h: number;
		shadow: string;
		bear: { cxPct: number; cyPct: number; sizePctOfW: number };
	}
> = {
	1: {
		w: 326,
		h: 251,
		shadow: ODYSSEY_MOBILE_ISLAND_GLOW[1],
		bear: { cxPct: (65 + 59) / 326, cyPct: (7 + 59) / 251, sizePctOfW: 118 / 326 },
	},
	2: {
		w: 307,
		h: 279,
		shadow: ODYSSEY_MOBILE_ISLAND_GLOW[2],
		bear: { cxPct: (51 + 59) / 307, cyPct: (49 + 59) / 279, sizePctOfW: 118 / 307 },
	},
	3: {
		w: 334,
		h: 196,
		shadow: ODYSSEY_MOBILE_ISLAND_GLOW[3],
		bear: { cxPct: (63 + 59) / 334, cyPct: (9 + 59) / 196, sizePctOfW: 118 / 334 },
	},
	4: {
		w: 273,
		h: 281,
		shadow: ODYSSEY_MOBILE_ISLAND_GLOW[4],
		bear: { cxPct: (59 + 59) / 273, cyPct: (40 + 59) / 281, sizePctOfW: 118 / 273 },
	},
	5: {
		w: 293,
		h: 293,
		shadow: ODYSSEY_MOBILE_ISLAND_GLOW[5],
		bear: { cxPct: (75 + 59) / 293, cyPct: (77 + 59) / 293, sizePctOfW: 118 / 293 },
	},
	6: {
		w: 346,
		h: 241,
		shadow: ODYSSEY_MOBILE_ISLAND_GLOW[6],
		bear: { cxPct: (99 + 59) / 346, cyPct: (45 + 59) / 241, sizePctOfW: 118 / 346 },
	},
	7: {
		w: 333,
		h: 232,
		shadow: ODYSSEY_MOBILE_ISLAND_GLOW[7],
		bear: { cxPct: (90 + 59) / 333, cyPct: (19 + 59) / 232, sizePctOfW: 118 / 333 },
	},
	8: {
		w: 335,
		h: 234,
		shadow: ODYSSEY_MOBILE_ISLAND_GLOW[8],
		bear: { cxPct: (150 + 59) / 335, cyPct: (54 + 59) / 234, sizePctOfW: 118 / 335 },
	},
};

/** Расстояние между слайдами в горизонтальном треке. */
const MOBILE_CAROUSEL_GAP_PX = 8;

function MobileIslandCard({
	weekId,
	bearVisible,
	priority,
}: {
	weekId: OdysseyMobileIslandWeek;
	bearVisible: boolean;
	priority: boolean;
}) {
	const frame = MOBILE_ISLAND_FRAME[weekId];
	return (
		<div className="relative w-full select-none" style={{ maxWidth: frame.w, margin: '0 auto' }}>
			<div
				className="relative w-full overflow-visible"
				style={{ aspectRatio: `${frame.w} / ${frame.h}` }}
			>
				<Image
					src={ODYSSEY_MOBILE_ISLAND_PATH[weekId]}
					alt=""
					fill
					className="object-contain object-center"
					style={{ filter: `drop-shadow(${frame.shadow})` }}
					priority={priority}
					loading={priority ? undefined : 'lazy'}
					sizes="(max-width: 768px) 346px, 346px"
					draggable={false}
				/>
				{bearVisible ? (
					<video
						className="pointer-events-none absolute object-contain"
						style={{
							left: `${frame.bear.cxPct * 100}%`,
							top: `${frame.bear.cyPct * 100}%`,
							width: `${frame.bear.sizePctOfW * 100}%`,
							aspectRatio: '1',
							height: 'auto',
							transform: 'translate(-50%, -50%)',
						}}
						autoPlay
						muted
						loop
						playsInline
						preload="metadata"
						aria-hidden
					>
						<source src="/assets/bear.webm" type="video/webm" />
					</video>
				) : null}
			</div>
		</div>
	);
}

function islandCenterForWeek(weekId: number): { x: number; y: number } {
	const k = WEEK_TO_ISLAND[weekId] ?? 1;
	const r = ODYSSEY_ISLANDS[k];
	const cx = r.x + r.w / 2;
	const cy = r.y + r.h / 2;
	if (weekId === 1) return { x: cx, y: cy + ISLAND1_ART_NUDGE_Y };
	return { x: cx, y: cy };
}

function parseQuillsWeek(): number {
	const raw = process.env.NEXT_PUBLIC_ODYSSEY_QUILLS_WEEK;
	if (raw === undefined || raw === '') return 1;
	const n = Number(raw);
	if (!Number.isFinite(n)) return 1;
	return Math.min(8, Math.max(1, Math.floor(n)));
}

type StagePlanetsProps = {
	highlightedWeek: number | null;
	unlockedCount: number;
	mandatoryDoneByWeek: Record<number, boolean>;
	openTasks: (id: number) => void;
	onPlanetHoverChange: (id: number, hovering: boolean) => void;
	quillsWeek: number;
	hideHud?: boolean;
};

function StagePlanets({
	highlightedWeek,
	unlockedCount,
	mandatoryDoneByWeek,
	openTasks,
	onPlanetHoverChange,
	quillsWeek,
	hideHud = false,
}: StagePlanetsProps) {
	return (
		<>
			<OdysseyScenery highlightedWeek={highlightedWeek} />
			<OdysseyQuills week={quillsWeek} />

			{PLANETS.map((p) => {
				const locked = p.id > unlockedCount;
				const mandatoryDone = mandatoryDoneByWeek?.[p.id] === true;
				const claimEnabled = p.id >= 1 && p.id <= 8 && !locked && mandatoryDone;
				const claimUrl = 'https://claims.somnia.network/';
				const c = islandCenterForWeek(p.id);
				const islandKey = WEEK_TO_ISLAND[p.id] ?? 1;
				const island = ODYSSEY_ISLANDS[islandKey];
				const hitPx = Math.min(340, Math.round(Math.min(island.w, island.h) * 0.9));
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
							locked={locked}
							hidePlanetArt
							hideHud={hideHud}
							hudNudgeYPx={p.id === 2 ? -40 : 0}
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
							sizePx={hitPx}
							onHoverChange={onPlanetHoverChange}
						/>
					</div>
				);
			})}
		</>
	);
}

function MobilePlanetHit({
	p,
	unlockedCount,
	mandatoryDoneByWeek,
	openTasks,
	onPlanetHoverChange,
	hideHud,
}: {
	p: Planet;
	unlockedCount: number;
	mandatoryDoneByWeek: Record<number, boolean>;
	openTasks: (id: number) => void;
	onPlanetHoverChange: (id: number, hovering: boolean) => void;
	hideHud?: boolean;
}) {
	const locked = p.id > unlockedCount;
	const mandatoryDone = mandatoryDoneByWeek?.[p.id] === true;
	const claimEnabled = p.id >= 1 && p.id <= 8 && !locked && mandatoryDone;
	const claimUrl = 'https://claims.somnia.network/';
	const hitPx = Math.min(280, Math.round(ODYSSEY_MOBILE_ISLAND_CARD_W * 0.82));
	return (
		<PlanetNode
			id={p.id}
			imgSrc={p.img}
			title={p.title}
			locked={locked}
			hidePlanetArt
			hideHud={hideHud}
			hudNudgeYPx={p.id === 2 ? -40 : 0}
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
			sizePx={hitPx}
			onHoverChange={onPlanetHoverChange}
		/>
	);
}

export function PlanetsRail({
	openTasks,
	mandatoryDoneByWeek,
}: {
	openTasks: (id: number) => void;
	mandatoryDoneByWeek: Record<number, boolean>;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [scale, setScale] = useState(1);
	const [profileOpen, setProfileOpen] = useState(false);
	const [highlightedWeek, setHighlightedWeek] = useState<number | null>(null);
	const { address } = useAccount();
	const quillsWeek = parseQuillsWeek();
	const ctx = useReown();

	const [mobileIndex, setMobileIndex] = useState(0);
	const touchStartX = useRef<number | null>(null);
	const carouselViewportRef = useRef<HTMLDivElement | null>(null);
	const [carouselVw, setCarouselVw] = useState(ODYSSEY_MOBILE_CAROUSEL_INNER_W);

	const onPlanetHoverChange = useCallback((id: number, hovering: boolean) => {
		setHighlightedWeek((prev) => {
			if (hovering) return id;
			return prev === id ? null : prev;
		});
	}, []);

	const UNLOCK_ENV = Number(process.env.NEXT_PUBLIC_UNLOCKED_COUNT || '1');
	const unlockedCountFromEnv = Number.isFinite(UNLOCK_ENV)
		? Math.max(1, Math.min(PLANETS.length, Math.floor(UNLOCK_ENV)))
		: 1;
	const unlockedCount = Math.max(8, unlockedCountFromEnv);

	const handleWallet = useCallback(() => {
		if (!ctx?.appKit) {
			alert('Wallet is not configured. Set NEXT_PUBLIC_REOWN_PROJECT_ID and reload.');
			return;
		}
		ctx.appKit.open?.();
	}, [ctx?.appKit]);

	const mobileWeekId = PLANETS[mobileIndex]?.id ?? 1;
	const mobileWeekLocked = mobileWeekId > unlockedCount;

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const measure = () => {
			const rw = el.clientWidth;
			const rh = el.clientHeight;
			const s = Math.min(1, rw / ODYSSEY_STAGE_W, rh / ODYSSEY_STAGE_H);
			setScale(s || 1);
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useLayoutEffect(() => {
		const el = carouselViewportRef.current;
		if (!el) return;
		const measure = () =>
			setCarouselVw(el.clientWidth || ODYSSEY_MOBILE_CAROUSEL_INNER_W);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const { slideWs, trackX } = useMemo(() => {
		// Figma Frame 12 (333:33): контент 326px при ширине 390 и полях 32 — не масштабируем все острова от max(346).
		const usableW = Math.max(200, carouselVw);
		const widths = PLANETS.map((p) => {
			const fw = MOBILE_ISLAND_FRAME[p.id as OdysseyMobileIslandWeek].w;
			return Math.round(Math.min(fw, usableW));
		});
		const activeWidth = widths[mobileIndex] ?? widths[0] ?? usableW;
		const before = widths.slice(0, mobileIndex).reduce((sum, w) => sum + w, 0) + mobileIndex * MOBILE_CAROUSEL_GAP_PX;
		const x = usableW / 2 - before - activeWidth / 2;
		return { slideWs: widths, trackX: x };
	}, [carouselVw, mobileIndex]);

	const onTouchStart = (e: React.TouchEvent) => {
		touchStartX.current = e.changedTouches[0]?.clientX ?? null;
	};

	const onTouchEnd = (e: React.TouchEvent) => {
		const start = touchStartX.current;
		touchStartX.current = null;
		if (start == null) return;
		const end = e.changedTouches[0]?.clientX;
		if (end == null) return;
		const dx = end - start;
		if (Math.abs(dx) < 56) return;
		if (dx < 0) {
			setMobileIndex((i) => Math.min(PLANETS.length - 1, i + 1));
		} else {
			setMobileIndex((i) => Math.max(0, i - 1));
		}
	};

	return (
		<div className="relative h-full w-full min-h-0 overflow-hidden">
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

			<div
				ref={containerRef}
				className="relative z-10 hidden h-full w-full min-h-0 items-end justify-center md:flex"
			>
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
						<StagePlanets
							highlightedWeek={highlightedWeek}
							unlockedCount={unlockedCount}
							mandatoryDoneByWeek={mandatoryDoneByWeek}
							openTasks={openTasks}
							onPlanetHoverChange={onPlanetHoverChange}
							quillsWeek={quillsWeek}
						/>
					</div>
				</div>
			</div>

			<div className="relative z-10 mx-auto flex h-full w-full min-h-0 max-w-[390px] flex-col md:hidden">
				<OdysseyMobileHeader onMenuPress={handleWallet} />
				<div
					className="relative flex min-h-0 w-full flex-1 touch-pan-y flex-col items-stretch justify-center overflow-hidden px-0"
					style={{
						maxHeight: `min(${ODYSSEY_MOBILE_CAROUSEL_H}px, calc(100dvh - 248px))`,
						paddingLeft: ODYSSEY_MOBILE_ISLAND_SIDE_PAD,
						paddingRight: ODYSSEY_MOBILE_ISLAND_SIDE_PAD,
					}}
					onTouchStart={onTouchStart}
					onTouchEnd={onTouchEnd}
					role="region"
					aria-label="Week islands carousel"
				>
					<div
						ref={carouselViewportRef}
						className="relative flex min-h-0 w-full min-w-0 flex-1 self-stretch items-center overflow-hidden"
					>
						<motion.div
							className="flex flex-row items-center"
							style={{
								gap: MOBILE_CAROUSEL_GAP_PX,
								willChange: 'transform',
							}}
							animate={{ x: trackX }}
							transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.88 }}
						>
							{PLANETS.map((p, i) => {
								const wk = p.id as OdysseyMobileIslandWeek;
								const active = i === mobileIndex;
								return (
									<motion.div
										key={p.id}
										role="presentation"
										className={`flex shrink-0 items-center justify-center ${active ? '' : 'cursor-pointer'}`}
										style={{ width: slideWs[i] }}
										animate={{
											scale: active ? 1 : 0.94,
											opacity: active ? 1 : 0.52,
										}}
										transition={{ type: 'spring', stiffness: 440, damping: 35 }}
										onClick={() => {
											if (!active) setMobileIndex(i);
										}}
									>
										<div className="relative w-full max-w-full">
											<MobileIslandCard
												weekId={wk}
												bearVisible={active}
												priority={i < 2}
											/>
											<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
												<div className={active ? 'pointer-events-auto' : 'pointer-events-none'}>
													<MobilePlanetHit
														p={p}
														unlockedCount={unlockedCount}
														mandatoryDoneByWeek={mandatoryDoneByWeek}
														openTasks={openTasks}
														onPlanetHoverChange={onPlanetHoverChange}
														hideHud
													/>
												</div>
											</div>
										</div>
									</motion.div>
								);
							})}
						</motion.div>
					</div>
				</div>
				<div
					className="flex shrink-0 items-center justify-center px-4"
					style={{
						gap: ODYSSEY_MOBILE_BUTTON_GAP,
						paddingTop: 9,
						paddingBottom: 10,
					}}
				>
					<button
						type="button"
						onClick={() => openTasks(mobileWeekId)}
						disabled={mobileWeekLocked}
						className="inline-flex shrink-0 items-center justify-center rounded-[19px] bg-[#78a3c8] text-[15px] font-normal leading-none tracking-[-0.345px] text-black transition-all duration-200 hover:brightness-105 hover:shadow-[0_0_16px_rgba(120,163,200,0.42)] active:scale-[0.985] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
						style={{
							fontFamily: 'var(--font-mooli), system-ui, sans-serif',
							width: ODYSSEY_MOBILE_BUTTON_W,
							height: ODYSSEY_MOBILE_BUTTON_H,
						}}
					>
						Tasks
					</button>
					<button
						type="button"
						onClick={() => setProfileOpen(true)}
						className="inline-flex shrink-0 items-center justify-center rounded-[19px] border border-[#78a3c8] bg-transparent text-[15px] font-normal leading-none tracking-[-0.345px] text-[#78a3c8] transition-all duration-200 hover:bg-white/5 active:scale-[0.985] active:translate-y-px"
						style={{
							fontFamily: 'var(--font-mooli), system-ui, sans-serif',
							width: ODYSSEY_MOBILE_BUTTON_W,
							height: ODYSSEY_MOBILE_BUTTON_H,
						}}
					>
						Profile
					</button>
				</div>
				<div
					className="flex shrink-0 justify-center gap-1.5 pt-1"
					style={{ paddingBottom: 10 }}
					aria-hidden
				>
					{PLANETS.map((_, i) => (
						<button
							key={i}
							type="button"
							onClick={() => setMobileIndex(i)}
							className={`h-1.5 rounded-full transition-all ${i === mobileIndex ? 'w-6 bg-[#78a3c8]' : 'w-1.5 bg-white/25'}`}
							aria-label={`Week ${i + 1}`}
							aria-current={i === mobileIndex}
						/>
					))}
				</div>
				<div
					className="flex shrink-0 justify-center"
					style={{
						paddingBottom: `max(${ODYSSEY_MOBILE_SOCIAL_BOTTOM}px, env(safe-area-inset-bottom, 0px))`,
					}}
				>
					<OdysseySocial variant="inline" />
				</div>
			</div>

			<OdysseyHeader className="hidden md:block" onProfileClick={() => setProfileOpen(true)} />
			<OdysseySocial className="hidden md:flex" />

			<ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} address={address || undefined} />
		</div>
	);
}
