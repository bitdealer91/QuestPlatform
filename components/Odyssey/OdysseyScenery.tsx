'use client';

import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import {
	ODYSSEY_BRIDGES,
	ODYSSEY_PATH,
	ODYSSEY_STAGE_H,
	ODYSSEY_STAGE_W,
	ODYSSEY_WEEK_COUNT,
	ODYSSEY_WEEKS,
	type OdysseyBridgeDef,
	type OdysseyImageInset,
	type OdysseyWeekKey,
} from '@/lib/odysseyLayout';

function insetToStyle(inset?: OdysseyImageInset): CSSProperties | undefined {
	if (!inset) return undefined;
	const style: CSSProperties = {
		position: 'absolute',
		height: inset.height,
		width: inset.width,
		top: inset.top,
		left: inset.left,
		right: inset.right,
		bottom: inset.bottom,
	};
	if (inset.objectFit) style.objectFit = inset.objectFit;
	if (inset.objectPosition) style.objectPosition = inset.objectPosition;
	return style;
}

function IslandLift({ highlighted, children }: { highlighted: boolean; children: ReactNode }) {
	return (
		<div
			className={clsx(
				'h-full w-full overflow-visible transition-transform duration-200 ease-out',
				highlighted && 'relative',
			)}
			style={{
				transform: highlighted ? 'scale(1.06)' : 'scale(1)',
				transformOrigin: 'center center',
			}}
		>
			{children}
		</div>
	);
}

/** Свечение только на img — повторяет альфу, без прямоугольника контейнера. */
function LayerImage({
	src,
	inset,
	glow,
	highlighted,
	objectFit = 'fill',
	objectPosition = 'center',
}: {
	src: string;
	inset?: OdysseyImageInset;
	glow: string;
	highlighted?: boolean;
	objectFit?: 'cover' | 'fill';
	objectPosition?: string;
}) {
	const highlight =
		highlighted ? ' drop-shadow(0 0 22px rgba(120, 163, 200, 0.75))' : '';
	const filter = `${glow}${highlight}`;

	if (inset?.height || inset?.width || inset?.top || inset?.left) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={src}
				alt=""
				draggable={false}
				className="max-w-none"
				style={{ ...insetToStyle(inset), filter }}
			/>
		);
	}
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={src}
			alt=""
			draggable={false}
			className="pointer-events-none absolute inset-0 h-full w-full max-w-none"
			style={{
				objectFit: inset?.objectFit ?? objectFit,
				objectPosition: inset?.objectPosition ?? objectPosition,
				filter,
			}}
		/>
	);
}

function WeekIsland({
	week,
	zIndex,
	highlighted,
}: {
	week: OdysseyWeekKey;
	zIndex: number;
	highlighted: boolean;
}) {
	const def = ODYSSEY_WEEKS[week];

	return (
		<div
			className="absolute overflow-visible"
			style={{
				left: def.x,
				top: def.y,
				width: def.w,
				height: def.h,
				zIndex,
			}}
			data-figma-week={week}
		>
			<IslandLift highlighted={highlighted}>
				<div className="relative h-full w-full overflow-visible">
					<LayerImage
						src={def.image}
						inset={def.inset}
						glow={def.glow}
						highlighted={highlighted}
						objectFit={def.objectFit}
						objectPosition={def.objectPosition}
					/>
				</div>
			</IslandLift>
		</div>
	);
}

function BridgeLayer({ bridge }: { bridge: OdysseyBridgeDef }) {
	return (
		<div
			className="pointer-events-none absolute overflow-visible"
			style={{
				left: bridge.rect.x,
				top: bridge.rect.y,
				width: bridge.rect.w,
				height: bridge.rect.h,
				zIndex: bridge.z,
			}}
			data-figma-bridge={bridge.id}
		>
			<div className="relative h-full w-full">
				<LayerImage
					src={bridge.src}
					inset={bridge.inset}
					glow={bridge.glow}
					objectFit={bridge.objectFit}
					objectPosition={bridge.objectPosition}
				/>
			</div>
		</div>
	);
}

/** Пунктир — `452:547`: SVG на весь bbox группы, без rotate (в макете rot = 0). */
function PathLayer() {
	const { wrapper, src, z } = ODYSSEY_PATH;
	return (
		<div
			className="pointer-events-none absolute overflow-visible"
			style={{
				left: wrapper.x,
				top: wrapper.y,
				width: wrapper.w,
				height: wrapper.h,
				zIndex: z,
			}}
			data-figma-node="452:547"
		>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={src}
				alt=""
				draggable={false}
				className="pointer-events-none absolute inset-0 h-full w-full max-w-none"
				style={{ objectFit: 'fill' }}
			/>
		</div>
	);
}

/** Порядок слоёв = Figma `432:2`. */
export function OdysseyScenery({ highlightedWeek = null }: { highlightedWeek?: number | null }) {
	const bump = (week: OdysseyWeekKey, baseZ: number) => (highlightedWeek === week ? 24 : baseZ);
	const bridge = (id: string) => ODYSSEY_BRIDGES.find((b) => b.id === id);

	return (
		<>
			<WeekIsland week={1} zIndex={bump(1, ODYSSEY_WEEKS[1].z)} highlighted={highlightedWeek === 1} />
			{bridge('bridge-3') ? <BridgeLayer bridge={bridge('bridge-3')!} /> : null}
			<WeekIsland week={2} zIndex={bump(2, ODYSSEY_WEEKS[2].z)} highlighted={highlightedWeek === 2} />
			{bridge('bridge-2') ? <BridgeLayer bridge={bridge('bridge-2')!} /> : null}
			{bridge('bridge-1') ? <BridgeLayer bridge={bridge('bridge-1')!} /> : null}
			<WeekIsland week={3} zIndex={bump(3, ODYSSEY_WEEKS[3].z)} highlighted={highlightedWeek === 3} />
			<WeekIsland week={4} zIndex={bump(4, ODYSSEY_WEEKS[4].z)} highlighted={highlightedWeek === 4} />
			{bridge('bridge-center') ? <BridgeLayer bridge={bridge('bridge-center')!} /> : null}
			<PathLayer />
		</>
	);
}

export const OdysseyStageSize = { w: ODYSSEY_STAGE_W, h: ODYSSEY_STAGE_H, weeks: ODYSSEY_WEEK_COUNT };
