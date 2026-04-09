'use client';

import { PlanetNode } from './PlanetNode';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
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
	ODYSSEY_MOBILE_ISLAND_CARD_H,
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
	const mobilePlanet = PLANETS[mobileIndex];
	const mobileIslandKey = mobileWeekId as OdysseyMobileIslandWeek;

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
					className="relative flex min-h-0 w-full flex-1 touch-pan-y flex-col items-center justify-center overflow-hidden px-0"
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
					{mobilePlanet ? (
						<div
							className="relative w-full"
							style={{
								maxWidth: ODYSSEY_MOBILE_ISLAND_CARD_W,
								margin: '0 auto',
							}}
						>
							<div
								className="relative w-full overflow-visible"
								style={{
									aspectRatio: `${ODYSSEY_MOBILE_ISLAND_CARD_W} / ${ODYSSEY_MOBILE_ISLAND_CARD_H}`,
									boxShadow: ODYSSEY_MOBILE_ISLAND_GLOW[mobileIslandKey],
								}}
							>
								<Image
									src={ODYSSEY_MOBILE_ISLAND_PATH[mobileIslandKey]}
									alt=""
									fill
									className="object-contain object-center"
									priority={mobileIndex < 2}
									sizes="(max-width: 768px) 326px, 326px"
									draggable={false}
								/>
							</div>
							<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
								<div className="pointer-events-auto">
									<MobilePlanetHit
										p={mobilePlanet}
										unlockedCount={unlockedCount}
										mandatoryDoneByWeek={mandatoryDoneByWeek}
										openTasks={openTasks}
										onPlanetHoverChange={onPlanetHoverChange}
										hideHud
									/>
								</div>
							</div>
						</div>
					) : null}
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
