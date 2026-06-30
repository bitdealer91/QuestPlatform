'use client';

import { PlanetNode } from './PlanetNode';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import ProfileDrawer from '@/components/ProfileDrawer';
import { useAccount } from 'wagmi';
import { PLANETS, type Planet } from '@/lib/planets';
import {
	ODYSSEY_MOBILE_ISLAND_LAYERS,
	type OdysseyMobileIslandLayer,
	type OdysseyMobileIslandWeek,
} from '@/lib/odysseyMobileIslands';
import { ODYSSEY_MOBILE_FRAME12_ISLAND } from '@/lib/odysseyMobileFrame12';
import {
	ODYSSEY_MOBILE_BUTTON_GAP,
	ODYSSEY_MOBILE_BUTTON_H,
	ODYSSEY_MOBILE_BUTTON_W,
	ODYSSEY_MOBILE_FRAME_W,
	ODYSSEY_MOBILE_ISLAND_CARD_W,
	ODYSSEY_MOBILE_ISLAND_STRIP_X,
	ODYSSEY_MOBILE_ISLAND_STRIP_Y,
	ODYSSEY_MOBILE_ISLAND_VISUAL_SCALE,
	ODYSSEY_MOBILE_SOCIAL_BOTTOM,
	ODYSSEY_MOBILE_WEEK_GLOW,
} from '@/lib/odysseyMobileLayout';
import {
	getOdysseyDesktopStageScale,
	ODYSSEY_STAGE_H,
	ODYSSEY_STAGE_W,
	ODYSSEY_HUD_TOP_PCT,
	ODYSSEY_WEEK_COUNT,
	ODYSSEY_WEEK_HUD_NUDGE_Y,
	WEEK_TO_ISLAND,
	ODYSSEY_WEEK_ISLANDS,
} from '@/lib/odysseyLayout';
import { OdysseyScenery } from '@/components/Odyssey/OdysseyScenery';
import { OdysseyHeader } from '@/components/Odyssey/OdysseyHeader';
import { OdysseyMobileHeader } from '@/components/Odyssey/OdysseyMobileHeader';
import { OdysseyMobileMenu } from '@/components/Odyssey/OdysseyMobileMenu';
import { OdysseyQuills } from '@/components/Odyssey/OdysseyQuills';
import { OdysseySocial } from '@/components/Odyssey/OdysseySocial';
import { isPlanetWeekUnlocked, highestUnlockedPlanetWeek } from '@/lib/useWeekIslandUnlock';
import { useReown } from '@/lib/reown';

/**
 * Микросдвиг вверх всего блока (остров + кнопки + точки), если нужен добор к макету.
 */
const MOBILE_ISLAND_BLOCK_LIFT_PX = 0;

/** Мобилка: лёгкий drop-shadow на `<img>` (@2x PNG из Figma). */
function MobileIslandLayerImage({
	layer,
	glow,
	priority,
}: {
	layer: OdysseyMobileIslandLayer;
	glow?: string;
	priority: boolean;
}) {
	const boxStyle = {
		position: 'absolute' as const,
		left: layer.left,
		top: layer.top,
		width: layer.width,
		height: layer.height,
		transform: layer.transform,
		transformOrigin: layer.transform ? 'center center' : undefined,
	};

	const imgStyle = {
		objectFit: layer.objectFit ?? 'fill',
		objectPosition: layer.objectPosition ?? 'center',
		filter: glow,
	};

	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={layer.src}
			alt=""
			draggable={false}
			fetchPriority={priority ? 'high' : 'auto'}
			className="pointer-events-none max-w-none"
			style={{ ...boxStyle, ...imgStyle }}
		/>
	);
}

/**
 * Остров (PNG) + медведь (видео) по Frame 13 `482:1055`: размеры группы и центр bear из Figma,
 * см. `odysseyMobileFrame12.ts`.
 */
function MobileIslandCard({
	weekId,
	bearVisible,
	priority,
}: {
	weekId: OdysseyMobileIslandWeek;
	bearVisible: boolean;
	priority: boolean;
}) {
	const [preferStaticBear, setPreferStaticBear] = useState(true);
	const fig = ODYSSEY_MOBILE_FRAME12_ISLAND[weekId];
	const layers = ODYSSEY_MOBILE_ISLAND_LAYERS[weekId];
	const weekGlow = ODYSSEY_MOBILE_WEEK_GLOW[weekId];

	useEffect(() => {
		const ua = navigator.userAgent ?? '';
		const isIOS =
			/iPad|iPhone|iPod/i.test(ua) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
		setPreferStaticBear(isIOS);
	}, []);

	return (
		<div className="relative w-full select-none bg-transparent">
			<div
				className="relative w-full overflow-visible bg-transparent"
				style={{ aspectRatio: `${fig.islandW} / ${fig.islandH}` }}
			>
				<div
					className="absolute inset-0 overflow-visible bg-transparent [backface-visibility:hidden]"
					style={{
						/* translateZ(0): меньше «серой рамки» у scaled слоя в WebKit/GPU */
						transform: `scale(${ODYSSEY_MOBILE_ISLAND_VISUAL_SCALE}) translateZ(0)`,
						transformOrigin: 'center center',
					}}
				>
					{layers.map((layer) => (
						<MobileIslandLayerImage
							key={`${weekId}-${layer.src}`}
							layer={layer}
							glow={layer.glow !== false ? weekGlow : undefined}
							priority={priority}
						/>
					))}
				</div>
				{bearVisible ? (
					<div
						className="pointer-events-none absolute z-[1]"
						style={{
							left: `${fig.bearCxPct * 100}%`,
							top: `${fig.bearCyPct * 100}%`,
							/* 118×118 в px макета → доля от ширины группы острова (без VISUAL_SCALE). */
							width: `${fig.bearSidePct}%`,
							aspectRatio: '1',
							transform: 'translate(-50%, -50%)',
						}}
					>
						{preferStaticBear ? (
							<Image
								src="/assets/mascot.png"
								alt=""
								fill
								className="object-contain"
								sizes="(max-width: 768px) 30vw, 120px"
								draggable={false}
							/>
						) : (
							<video
								className="h-full w-full object-cover"
								autoPlay
								muted
								loop
								playsInline
								preload="auto"
								aria-hidden
							>
								<source src="/assets/bear.webm" type="video/webm" />
							</video>
						)}
					</div>
				) : null}
			</div>
		</div>
	);
}

function islandCenterForWeek(weekId: number): { x: number; y: number } {
	const k = WEEK_TO_ISLAND[weekId] ?? 1;
	const r = ODYSSEY_WEEK_ISLANDS[k];
	return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Optional dev override; when unset, quills follow island unlock schedule. */
function parseQuillsWeekOverride(): number | null {
	const raw = process.env.NEXT_PUBLIC_ODYSSEY_QUILLS_WEEK;
	if (raw === undefined || raw === '') return null;
	const n = Number(raw);
	if (!Number.isFinite(n)) return null;
	return Math.min(ODYSSEY_WEEK_COUNT, Math.max(1, Math.floor(n)));
}

function resolveQuillsWeek(
	islandUnlockedByWeek: Record<number, boolean>,
	envUnlockedCount: number,
): number {
	const override = parseQuillsWeekOverride();
	if (override != null) return override;
	return highestUnlockedPlanetWeek(islandUnlockedByWeek, envUnlockedCount, ODYSSEY_WEEK_COUNT);
}

type StagePlanetsProps = {
	highlightedWeek: number | null;
	envUnlockedCount: number;
	mandatoryDoneByWeek: Record<number, boolean>;
	dropUnlockedByWeek: Record<number, boolean>;
	islandUnlockedByWeek: Record<number, boolean>;
	openTasks: (id: number) => void;
	onPlanetHoverChange: (id: number, hovering: boolean) => void;
	quillsWeek: number;
	hideHud?: boolean;
};

function StagePlanets({
	highlightedWeek,
	envUnlockedCount,
	mandatoryDoneByWeek,
	dropUnlockedByWeek,
	islandUnlockedByWeek,
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
				const locked = !isPlanetWeekUnlocked(p.id, islandUnlockedByWeek, envUnlockedCount);
				const mandatoryDone = mandatoryDoneByWeek?.[p.id] === true;
				const dropUnlocked = dropUnlockedByWeek?.[p.id] === true;
				const claimEnabled =
					p.id >= 1 &&
					p.id <= ODYSSEY_WEEK_COUNT &&
					!locked &&
					dropUnlocked &&
					mandatoryDone;
				const claimUrl = 'https://claims.somnia.network/';
				const c = islandCenterForWeek(p.id);
				const islandKey = WEEK_TO_ISLAND[p.id] ?? 1;
				const island = ODYSSEY_WEEK_ISLANDS[islandKey];
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
							hudTopPct={ODYSSEY_HUD_TOP_PCT}
							hudNudgeYPx={ODYSSEY_WEEK_HUD_NUDGE_Y[p.id as 1 | 2 | 3 | 4] ?? 0}
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
	envUnlockedCount,
	mandatoryDoneByWeek,
	dropUnlockedByWeek,
	islandUnlockedByWeek,
	openTasks,
	onPlanetHoverChange,
	hideHud,
	hitSizePx,
}: {
	p: Planet;
	envUnlockedCount: number;
	mandatoryDoneByWeek: Record<number, boolean>;
	dropUnlockedByWeek: Record<number, boolean>;
	islandUnlockedByWeek: Record<number, boolean>;
	openTasks: (id: number) => void;
	onPlanetHoverChange: (id: number, hovering: boolean) => void;
	hideHud?: boolean;
	/** Зона тапа под ширину слайда карусели. */
	hitSizePx?: number;
}) {
	const locked = !isPlanetWeekUnlocked(p.id, islandUnlockedByWeek, envUnlockedCount);
	const mandatoryDone = mandatoryDoneByWeek?.[p.id] === true;
	const dropUnlocked = dropUnlockedByWeek?.[p.id] === true;
	const claimEnabled =
		p.id >= 1 &&
		p.id <= ODYSSEY_WEEK_COUNT &&
		!locked &&
		dropUnlocked &&
		mandatoryDone;
	const claimUrl = 'https://claims.somnia.network/';
	const hitPx =
		hitSizePx ?? Math.min(280, Math.round(ODYSSEY_MOBILE_ISLAND_CARD_W * 0.82));
	return (
		<PlanetNode
			id={p.id}
			imgSrc={p.img}
			title={p.title}
			locked={locked}
			hidePlanetArt
			hideHud={hideHud}
			hudTopPct={ODYSSEY_HUD_TOP_PCT}
			hudNudgeYPx={ODYSSEY_WEEK_HUD_NUDGE_Y[p.id as 1 | 2 | 3 | 4] ?? 0}
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
	dropUnlockedByWeek,
	islandUnlockedByWeek,
}: {
	openTasks: (id: number) => void;
	mandatoryDoneByWeek: Record<number, boolean>;
	dropUnlockedByWeek: Record<number, boolean>;
	islandUnlockedByWeek: Record<number, boolean>;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [scale, setScale] = useState(1);
	const [profileOpen, setProfileOpen] = useState(false);
	const [highlightedWeek, setHighlightedWeek] = useState<number | null>(null);
	const { address, isConnected, isConnecting } = useAccount();
	const ctx = useReown();

	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [mobileIndex, setMobileIndex] = useState(0);
	const touchStartX = useRef<number | null>(null);
	const mobileColumnRef = useRef<HTMLDivElement | null>(null);
	/** Ширина всей мобильной колонки (max-w 390): клип карусели без сужающего padding — иначе нет peek соседей. */
	const [carouselClipW, setCarouselClipW] = useState(ODYSSEY_MOBILE_FRAME_W);

	const onPlanetHoverChange = useCallback((id: number, hovering: boolean) => {
		setHighlightedWeek((prev) => {
			if (hovering) return id;
			return prev === id ? null : prev;
		});
	}, []);

	const UNLOCK_ENV = Number(process.env.NEXT_PUBLIC_UNLOCKED_COUNT || '1');
	const envUnlockedCount = Number.isFinite(UNLOCK_ENV)
		? Math.max(1, Math.min(PLANETS.length, Math.floor(UNLOCK_ENV)))
		: 1;

	const quillsWeek = useMemo(
		() => resolveQuillsWeek(islandUnlockedByWeek, envUnlockedCount),
		[islandUnlockedByWeek, envUnlockedCount],
	);

	const handleWallet = useCallback(() => {
		if (!ctx?.appKit) {
			alert('Wallet is not configured. Set NEXT_PUBLIC_REOWN_PROJECT_ID and reload.');
			return;
		}
		ctx.appKit.open?.();
	}, [ctx?.appKit]);

	const mobileWeekId = PLANETS[mobileIndex]?.id ?? 1;
	const mobileWeekLocked = !isPlanetWeekUnlocked(mobileWeekId, islandUnlockedByWeek, envUnlockedCount);

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const measure = () => {
			const rw = el.clientWidth;
			const rh = el.clientHeight;
			setScale(getOdysseyDesktopStageScale(rw, rh));
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useLayoutEffect(() => {
		const el = mobileColumnRef.current;
		if (!el) return;
		const measure = () => {
			const w = el.getBoundingClientRect().width;
			// md:hidden: на десктопе ширина 0 — не затираем значение
			if (w < 64) return;
			setCarouselClipW(Math.max(260, Math.round(w)));
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		window.visualViewport?.addEventListener('resize', measure);
		window.addEventListener('orientationchange', measure);
		return () => {
			ro.disconnect();
			window.visualViewport?.removeEventListener('resize', measure);
			window.removeEventListener('orientationchange', measure);
		};
	}, []);

	const { slideLayout, trackX, trackWidthPx, trackMinHPx } = useMemo(() => {
		const clipW = Math.max(260, carouselClipW);
		const scale = clipW / ODYSSEY_MOBILE_FRAME_W;
		const originX = ODYSSEY_MOBILE_ISLAND_STRIP_X[1];
		const minStripY = Math.min(...Object.values(ODYSSEY_MOBILE_ISLAND_STRIP_Y));

		const slideLayout = PLANETS.map((p) => {
			const wk = p.id as OdysseyMobileIslandWeek;
			const fw = ODYSSEY_MOBILE_FRAME12_ISLAND[wk].islandW;
			const xFig = ODYSSEY_MOBILE_ISLAND_STRIP_X[wk];
			const yFig = ODYSSEY_MOBILE_ISLAND_STRIP_Y[wk];
			return {
				leftPx: (xFig - originX) * scale,
				widthPx: fw * scale,
				topPx: (yFig - minStripY) * scale,
			};
		});

		const activePlanet = PLANETS[mobileIndex] ?? PLANETS[0]!;
		const activeWk = activePlanet.id as OdysseyMobileIslandWeek;
		const ax = ODYSSEY_MOBILE_ISLAND_STRIP_X[activeWk];
		const aw = ODYSSEY_MOBILE_FRAME12_ISLAND[activeWk].islandW;
		const centerFig = ax + aw / 2;
		const trackX = clipW / 2 - scale * (centerFig - originX);

		const last = PLANETS[PLANETS.length - 1]!;
		const lastWk = last.id as OdysseyMobileIslandWeek;
		const trackWidthPx =
			scale *
			(ODYSSEY_MOBILE_ISLAND_STRIP_X[lastWk] +
				ODYSSEY_MOBILE_FRAME12_ISLAND[lastWk].islandW -
				originX);

		const trackMinHPx = Math.max(
			200,
			...PLANETS.map((p, i) => {
				const wk = p.id as OdysseyMobileIslandWeek;
				const fig = ODYSSEY_MOBILE_FRAME12_ISLAND[wk];
				const w = slideLayout[i]?.widthPx ?? 0;
				const topPx = slideLayout[i]?.topPx ?? 0;
				const h = w > 0 ? (fig.islandH / fig.islandW) * w : 0;
				return topPx + h;
			}),
		);

		return { slideLayout, trackX, trackWidthPx, trackMinHPx };
	}, [carouselClipW, mobileIndex]);

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
					className="absolute inset-0 hidden h-full w-full object-cover object-center md:block"
					autoPlay
					muted
					loop
					playsInline
					preload="auto"
					aria-hidden
				>
					<source src="/assets/background.mp4" type="video/mp4" />
				</video>
				<Image
					src="/assets/background.png"
					alt=""
					fill
					priority
					className="object-cover object-center md:hidden"
					sizes="100vw"
				/>
			</div>
			{/* Десктоп: сцена 1280×832 по центру; scale ≤ 1 только если не влезает; фон — отдельный cover-слой */}
			<div
				ref={containerRef}
				className="relative z-10 hidden h-full w-full min-h-0 items-center justify-center overflow-visible md:flex"
			>
				<div
					className="relative shrink-0 overflow-visible"
					style={{
						width: ODYSSEY_STAGE_W,
						height: ODYSSEY_STAGE_H,
						transform: `scale(${scale})`,
						transformOrigin: 'center center',
					}}
					data-figma-node="12:18"
				>
					<StagePlanets
						highlightedWeek={highlightedWeek}
						envUnlockedCount={envUnlockedCount}
						mandatoryDoneByWeek={mandatoryDoneByWeek}
						dropUnlockedByWeek={dropUnlockedByWeek}
						islandUnlockedByWeek={islandUnlockedByWeek}
						openTasks={openTasks}
						onPlanetHoverChange={onPlanetHoverChange}
						quillsWeek={quillsWeek}
					/>
				</div>
			</div>

			<div
				ref={mobileColumnRef}
				className="relative z-10 mx-auto flex h-full w-full min-h-0 max-w-[390px] flex-col md:hidden"
			>
				<OdysseyMobileHeader
					menuOpen={mobileMenuOpen}
					onMenuPress={() => setMobileMenuOpen((v) => !v)}
				/>
				{!mobileMenuOpen ? (
					<>
						<div className="flex min-h-0 min-w-0 flex-1 flex-col">
							<div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
								<div
									className="flex w-full shrink-0 flex-col"
									style={{
										transform:
											MOBILE_ISLAND_BLOCK_LIFT_PX !== 0
												? `translateY(-${MOBILE_ISLAND_BLOCK_LIFT_PX}px)`
												: undefined,
									}}
								>
									<div
										className="relative w-full shrink-0 touch-pan-y overflow-hidden"
										onTouchStart={onTouchStart}
										onTouchEnd={onTouchEnd}
										role="region"
										aria-label="Week islands carousel"
									>
										<div className="relative w-full overflow-hidden" style={{ minHeight: trackMinHPx }}>
											<motion.div
												className="relative shrink-0"
												style={{
													width: trackWidthPx,
													minHeight: trackMinHPx,
													willChange: 'transform',
												}}
												animate={{ x: trackX }}
												transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.88 }}
											>
												{PLANETS.map((p, i) => {
													const wk = p.id as OdysseyMobileIslandWeek;
													const active = i === mobileIndex;
													const { leftPx, widthPx, topPx } = slideLayout[i] ?? {
														leftPx: 0,
														widthPx: 0,
														topPx: 0,
													};
													return (
														<motion.div
															key={p.id}
															role="presentation"
															className={`absolute flex items-start justify-center ${active ? '' : 'cursor-pointer'}`}
															style={{ left: leftPx, top: topPx, width: widthPx }}
															animate={{
																scale: active ? 1 : 0.97,
																opacity: active ? 1 : 0.58,
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
																			envUnlockedCount={envUnlockedCount}
																			mandatoryDoneByWeek={mandatoryDoneByWeek}
																			dropUnlockedByWeek={dropUnlockedByWeek}
																			islandUnlockedByWeek={islandUnlockedByWeek}
																			openTasks={openTasks}
																			onPlanetHoverChange={onPlanetHoverChange}
																			hideHud
																			hitSizePx={Math.min(360, Math.round(widthPx * 0.72))}
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
											paddingTop: 4,
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
								</div>
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
					</>
				) : null}
			</div>

			<OdysseyHeader className="hidden md:block" onProfileClick={() => setProfileOpen(true)} />
			<OdysseySocial className="hidden md:flex" />

			<ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} address={address || undefined} />

			<OdysseyMobileMenu
				open={mobileMenuOpen}
				onClose={() => setMobileMenuOpen(false)}
				onSignIn={handleWallet}
				isConnecting={isConnecting}
				isConnected={isConnected}
				address={address || undefined}
			/>
		</div>
	);
}
