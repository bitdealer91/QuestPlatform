'use client';

import { ODYSSEY_BEAR_FRAME, QUILLS_ANCHORS } from '@/lib/odysseyLayout';

type Props = {
	/** 1–4 — bear anchor week 1 matches Figma `441:192`. */
	week: number;
};

export function OdysseyQuills({ week }: Props) {
	const w = Math.min(4, Math.max(1, Math.floor(week)));
	const a = QUILLS_ANCHORS[w] ?? QUILLS_ANCHORS[1]!;

	return (
		<div
			className="pointer-events-none absolute z-[35]"
			style={{ left: a.x, top: a.y, transform: 'translate(-50%, -50%)' }}
			data-node-id="106:142"
		>
			<video
				className="block object-contain"
				width={ODYSSEY_BEAR_FRAME.w}
				height={ODYSSEY_BEAR_FRAME.h}
				style={{ width: ODYSSEY_BEAR_FRAME.w, height: ODYSSEY_BEAR_FRAME.h }}
				autoPlay
				muted
				loop
				playsInline
				preload="metadata"
			>
				<source src="/assets/bear.webm" type="video/webm" />
			</video>
		</div>
	);
}
