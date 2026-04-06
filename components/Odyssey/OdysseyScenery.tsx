'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';
import Image from 'next/image';
import {
	ISLAND1_ART_NUDGE_Y,
	ISLAND1_BASE_REL,
	ISLAND1_GLOW_REL,
	ISLAND1_PATH_EXTRA_TOP_PX,
	ISLAND1_PATH_REL,
	ISLAND1_ROTATE_DEG,
	ODYSSEY_ISLANDS,
	ODYSSEY_STAGE_H,
	ODYSSEY_STAGE_W,
	Z,
} from '@/lib/odysseyLayout';

type IslandKey = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Подсветка материка при hover по неделе (см. PlanetNode → PlanetsRail). */
function IslandLift({
	highlighted,
	children,
}: {
	highlighted: boolean;
	children: ReactNode;
}) {
	return (
		<div
			className={clsx(
				'h-full w-full overflow-visible transition-[transform,filter] duration-200 ease-out',
				highlighted && 'relative'
			)}
			style={{
				transform: highlighted ? 'scale(1.06)' : 'scale(1)',
				transformOrigin: 'center center',
				filter: highlighted ? 'drop-shadow(0 0 24px rgba(120, 163, 200, 0.88))' : undefined,
			}}
		>
			{children}
		</div>
	);
}

/** Свечение из Figma (Layer blur / drop shadow) — через drop-shadow по альфе PNG, не box-shadow на overflow:hidden (даёт тёмный прямоугольник). */
const GLOW = {
	6: 'drop-shadow(0 28px 55px rgba(87, 253, 253, 0.55)) drop-shadow(0 12px 28px rgba(87, 253, 253, 0.35))',
	7: 'drop-shadow(0 18px 48px rgba(195, 141, 78, 0.5)) drop-shadow(0 8px 20px rgba(195, 141, 78, 0.3))',
	8: 'drop-shadow(0 18px 48px rgba(232, 158, 98, 0.5)) drop-shadow(0 8px 20px rgba(232, 158, 98, 0.28))',
	4: 'drop-shadow(0 18px 48px rgba(251, 180, 0, 0.45)) drop-shadow(0 8px 22px rgba(251, 180, 0, 0.28))',
	3: 'drop-shadow(0 18px 48px rgba(208, 138, 82, 0.48)) drop-shadow(0 8px 20px rgba(208, 138, 82, 0.28))',
	2: 'drop-shadow(0 18px 48px rgba(193, 231, 241, 0.5)) drop-shadow(0 8px 22px rgba(193, 231, 241, 0.3))',
	'5main': 'drop-shadow(0 14px 36px rgba(120, 200, 255, 0.25))',
	'1base': 'drop-shadow(0 16px 40px rgba(232, 158, 98, 0.35)) drop-shadow(0 8px 18px rgba(200, 140, 90, 0.22))',
} as const;

/**
 * Слои и геометрия из Figma `12:18` (get_metadata + get_design_context по фреймам материков).
 * Пунктир — дочерний слой «1» и крутится вместе с −4.15°; отдельный глобальный слой ломал совпадение.
 */
export function OdysseyScenery({ highlightedWeek = null }: { highlightedWeek?: number | null }) {
	const f = ODYSSEY_ISLANDS;
	const hi = (k: IslandKey) => highlightedWeek === k;

	return (
		<>
			{/* 6 — Figma 41:5 (−0.93° на фрейме, внутри −7.21°). */}
			<IslandChrome frame={f[6]} z={Z.island6} bumpZ={hi(6)}>
				<IslandLift highlighted={hi(6)}>
					<div
						className="relative h-full w-full overflow-visible"
						style={{ transform: 'rotate(-0.93deg)', transformOrigin: 'center center' }}
					>
						<div
							className="absolute flex items-center justify-center overflow-visible"
							style={{ left: -9.36, top: -16.94, width: 342.301, height: 299.237 }}
						>
							<div style={{ transform: 'rotate(-7.21deg)' }}>
								<div className="relative overflow-visible" style={{ width: 311.864, height: 262.17, filter: GLOW[6] }}>
									<Image src="/assets/odyssey/island-6.png" alt="" fill className="object-cover" sizes="320px" />
								</div>
							</div>
						</div>
					</div>
				</IslandLift>
			</IslandChrome>

			{/* 7 — 74:221 */}
			<IslandChrome frame={f[7]} z={Z.island7} bumpZ={hi(7)}>
				<IslandLift highlighted={hi(7)}>
					<div className="absolute overflow-visible" style={{ left: 0, top: 0, width: 492.264404296875, height: 350, filter: GLOW[7] }}>
						<div className="relative h-full w-full">
							<Image src="/assets/odyssey/island-7.png" alt="" fill className="object-cover" sizes="520px" />
						</div>
					</div>
				</IslandLift>
			</IslandChrome>

			{/* 5 — 68:200 */}
			<IslandChrome frame={f[5]} z={Z.island5} bumpZ={hi(5)}>
				<IslandLift highlighted={hi(5)}>
					<div
						className="absolute flex items-center justify-center overflow-visible"
						style={{ left: 35.88, top: 95.39, width: 249.155, height: 192.819 }}
					>
						<div style={{ transform: 'rotate(-4.15deg)' }}>
							<div className="relative" style={{ width: 237.025, height: 176.119 }}>
								<img
									src="/assets/odyssey/island-5-glow.svg"
									alt=""
									className="absolute inset-0 h-full w-full object-contain"
									draggable={false}
								/>
							</div>
						</div>
					</div>
					<div className="absolute flex items-center justify-center overflow-visible" style={{ left: 0, top: 0, width: 324.712, height: 337.646 }}>
						<div style={{ transform: 'rotate(-0.29deg)' }}>
							<div className="relative overflow-visible" style={{ width: 323, height: 336, filter: GLOW['5main'] }}>
								<Image src="/assets/odyssey/island-5-main.png" alt="" fill className="object-cover" sizes="360px" />
							</div>
						</div>
					</div>
				</IslandLift>
			</IslandChrome>

			{/* 8 — 91:4 */}
			<IslandChrome frame={f[8]} z={Z.island8} bumpZ={hi(8)}>
				<IslandLift highlighted={hi(8)}>
					<div className="absolute flex items-center justify-center overflow-visible" style={{ left: 0, top: 0, width: 363.296, height: 258.416 }}>
						<div style={{ transform: 'rotate(-0.07deg)' }}>
							<div className="relative overflow-visible" style={{ width: 363, height: 258, filter: GLOW[8] }}>
								<Image src="/assets/odyssey/island-8.png" alt="" fill className="object-cover" sizes="380px" />
							</div>
						</div>
					</div>
				</IslandLift>
			</IslandChrome>

			{/* 4 — 74:222 */}
			<IslandChrome frame={f[4]} z={Z.island4} bumpZ={hi(4)}>
				<IslandLift highlighted={hi(4)}>
					<div className="absolute overflow-visible" style={{ left: 0, top: 0, width: 316, height: 247, filter: GLOW[4] }}>
						<div className="relative h-full w-full">
							<Image src="/assets/odyssey/island-4.png" alt="" fill className="object-cover" sizes="340px" />
						</div>
					</div>
				</IslandLift>
			</IslandChrome>

			{/* 3 — 41:2 (тень на контейнере) */}
			<IslandChrome frame={f[3]} z={Z.island3} bumpZ={hi(3)}>
				<IslandLift highlighted={hi(3)}>
					<div className="absolute overflow-visible" style={{ left: -10, top: 8, width: 525, height: 274, filter: GLOW[3] }}>
						<div className="relative h-full w-full">
							<Image src="/assets/odyssey/island-3.png" alt="" fill className="object-cover" sizes="540px" />
						</div>
					</div>
				</IslandLift>
			</IslandChrome>

			{/* 2 — 68:201 */}
			<IslandChrome frame={f[2]} z={Z.island2} bumpZ={hi(2)}>
				<IslandLift highlighted={hi(2)}>
					<div className="absolute overflow-visible" style={{ left: 0, top: 0, width: 441, height: 343, filter: GLOW[2] }}>
						<div className="relative h-full w-full">
							<Image src="/assets/odyssey/island-2.png" alt="" fill className="object-cover" sizes="460px" />
						</div>
					</div>
				</IslandLift>
			</IslandChrome>

			{/* 1 — 41:6: общий поворот; база+свечение масштабируются при hover, пунктир — нет. */}
			<div
				className="absolute overflow-visible"
				style={{
					left: f[1].x,
					top: f[1].y,
					width: f[1].w,
					height: f[1].h,
					zIndex: hi(1) ? 24 : Z.island1,
				}}
				data-figma-node="41:6"
			>
				<div
					className="absolute left-0 top-0 h-full w-full overflow-visible"
					style={{
						transform: `rotate(${ISLAND1_ROTATE_DEG}deg)`,
						transformOrigin: '50% 50%',
						isolation: 'isolate',
					}}
				>
					<div
						className="absolute left-0 top-0 h-full w-full overflow-visible transition-[transform,filter] duration-200 ease-out"
						style={{
							transform: hi(1) ? 'scale(1.06)' : 'scale(1)',
							transformOrigin: '50% 50%',
							filter: hi(1) ? 'drop-shadow(0 0 24px rgba(120, 163, 200, 0.88))' : undefined,
							/* При hover арт выше пунктира — линия скрыта под материком, как у остальных островов. */
							zIndex: hi(1) ? 2 : 0,
						}}
					>
						<div
							className="absolute left-0 top-0 h-full w-full overflow-visible"
							style={{ transform: `translateY(${ISLAND1_ART_NUDGE_Y}px)` }}
						>
							<div
								className="pointer-events-none absolute"
								style={{
									left: ISLAND1_GLOW_REL.x,
									top: ISLAND1_GLOW_REL.y,
									width: ISLAND1_GLOW_REL.w,
									height: ISLAND1_GLOW_REL.h,
								}}
							>
								<div className="relative h-full w-full">
									<img
										src="/assets/odyssey/island-1-glow.svg"
										alt=""
										className="absolute inset-0 h-full w-full object-contain"
										draggable={false}
									/>
								</div>
							</div>
							<div
								className="absolute overflow-visible"
								style={{
									left: ISLAND1_BASE_REL.x,
									top: ISLAND1_BASE_REL.y,
									width: ISLAND1_BASE_REL.w,
									height: ISLAND1_BASE_REL.h,
									filter: GLOW['1base'],
								}}
							>
								<div className="relative h-full w-full">
									<Image src="/assets/odyssey/island-1-base.png" alt="" fill className="object-cover" sizes="500px" />
								</div>
							</div>
						</div>
					</div>
					<div
						className="pointer-events-none absolute overflow-visible"
						style={{
							left: ISLAND1_PATH_REL.x,
							top: ISLAND1_PATH_REL.y + ISLAND1_PATH_EXTRA_TOP_PX,
							width: ISLAND1_PATH_REL.w,
							height: ISLAND1_PATH_REL.h,
							zIndex: hi(1) ? 0 : 1,
						}}
						data-figma-node="113:208"
					>
						<div className="relative h-full w-full">
							<Image src="/assets/odyssey/path-dots.svg" alt="" fill className="object-fill object-left object-top" sizes="900px" />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

function IslandChrome({
	frame,
	z,
	className,
	children,
	bumpZ,
}: {
	frame: { x: number; y: number; w: number; h: number };
	z: number;
	className?: string;
	children: ReactNode;
	/** Поверх соседних материков при hover, но ниже HUD недель (z-26). */
	bumpZ?: boolean;
}) {
	return (
		<div
			className={`absolute overflow-visible ${className ?? ''}`}
			style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h, zIndex: bumpZ ? 24 : z }}
		>
			{children}
		</div>
	);
}

export const OdysseyStageSize = { w: ODYSSEY_STAGE_W, h: ODYSSEY_STAGE_H };
