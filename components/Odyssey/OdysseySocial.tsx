'use client';

import Image from 'next/image';

export function OdysseySocial() {
	return (
		<div
			className="pointer-events-auto absolute z-[60] flex items-end gap-[10px]"
			style={{
				right: 14,
				bottom: 18,
				width: 140,
				height: 40,
			}}
		>
			<a
				href="https://x.com/Somnia_Network"
				target="_blank"
				rel="noopener noreferrer"
				className="group relative h-10 w-10 shrink-0 transition-all duration-200 hover:scale-105 hover:drop-shadow-[0_0_14px_rgba(120,163,200,0.45)] active:scale-[0.97] active:translate-y-[1px]"
				aria-label="Somnia on X"
			>
				<Image src="/assets/odyssey/social-x-figma.svg" alt="" fill className="object-contain" />
			</a>

			<a
				href="https://discord.com/invite/somnia"
				target="_blank"
				rel="noopener noreferrer"
				className="group relative h-10 w-10 shrink-0 transition-all duration-200 hover:scale-105 hover:drop-shadow-[0_0_14px_rgba(120,163,200,0.45)] active:scale-[0.97] active:translate-y-[1px]"
				aria-label="Somnia Discord"
			>
				<Image src="/assets/odyssey/social-discord-figma.svg" alt="" fill className="object-contain" />
			</a>

			<a
				href="https://browser.somnia.network/"
				target="_blank"
				rel="noopener noreferrer"
				className="group relative h-10 w-10 shrink-0 transition-all duration-200 hover:scale-105 hover:drop-shadow-[0_0_14px_rgba(120,163,200,0.45)] active:scale-[0.97] active:translate-y-[1px]"
				aria-label="Somnia Browser"
			>
				<Image src="/assets/odyssey/social-site-figma.svg" alt="" fill className="object-contain" />
			</a>
		</div>
	);
}

