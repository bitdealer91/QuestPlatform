'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { bezierThrough, VIEWBOX, Pt } from '@/lib/curves';

export function CosmicPath({ points }:{
	points: Pt[];
}){
	const d = useMemo(() => bezierThrough(points, 0.5, 0.35), [points]);
	const pathRef = useRef<SVGPathElement|null>(null);
	const [len, setLen] = useState(0);
	useEffect(()=>{ if (pathRef.current) setLen(pathRef.current.getTotalLength()); }, [d]);

	const pattern = useMemo(()=> '0.6 12 1.2 18 0.6 14 1 22 0.6 16', []);

	return (
		<svg className="absolute inset-0 pointer-events-none mix-blend-screen"
			 viewBox={`0 0 ${VIEWBOX.VW} ${VIEWBOX.VH}`} preserveAspectRatio="none" aria-hidden>
			<defs>
				<linearGradient id="g-core" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%"  stopColor="var(--accent)" />
					<stop offset="100%" stopColor="var(--primary)" />
				</linearGradient>
				<filter id="glow-soft"><feGaussianBlur stdDeviation="6"/></filter>
				<filter id="glow-strong"><feGaussianBlur stdDeviation="14"/></filter>
			</defs>

			{/* hidden clone for motion path */}
			<path id="mpath-cosmic" d={d} fill="none" />

			{/* Outer nebula underlay */}
			<path d={d}
				fill="none"
				stroke="rgba(255,255,255,.08)"
				strokeWidth={20}
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
				filter="url(#glow-strong)"
				style={{ opacity:.9 }}
			/>

			{/* Core ribbon */}
			<path ref={pathRef} d={d}
				fill="none"
				stroke="url(#g-core)"
				strokeWidth={8}
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
				filter="url(#glow-soft)"
				style={{ opacity:.95 }}
			/>

			{/* Stardust */}
			<g>
				<path d={d}
					fill="none"
					stroke="white"
					strokeWidth={2}
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
					strokeDasharray={pattern}
					style={{ opacity:.28 }}
				/>
			</g>

			{/* comet */}
			{len>0 && (
				<g>
					<circle r="3.5" fill="white" opacity="0.95" />
					<circle r="8" fill="white" opacity="0.18" />
					<animateMotion dur="12s" repeatCount="indefinite" rotate="auto">
						<mpath href="#mpath-cosmic" />
					</animateMotion>
				</g>
			)}
		</svg>
	);
}


