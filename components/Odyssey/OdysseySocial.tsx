'use client';

import Image from 'next/image';
import { Globe } from 'lucide-react';

export function OdysseySocial() {
	return (
		<div
			className="pointer-events-auto absolute z-[5] flex items-end gap-[10px]"
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
				className="relative h-10 w-10 shrink-0"
				aria-label="Somnia on X"
			>
				<Image src="/assets/odyssey/social-x.svg" alt="" fill className="object-contain" />
			</a>

			<a
				href="https://discord.com/invite/somnia"
				target="_blank"
				rel="noopener noreferrer"
				className="relative h-10 w-10 shrink-0"
				aria-label="Somnia Discord"
			>
				<Image src="/assets/odyssey/social-discord.svg" alt="" fill className="object-contain" />
			</a>

			<a
				href="https://browser.somnia.network/"
				target="_blank"
				rel="noopener noreferrer"
				className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#1a2744]/80 text-white backdrop-blur-[2px] hover:bg-[#243352]/90"
				aria-label="Somnia Browser"
			>
				<Globe className="h-[18px] w-[18px]" strokeWidth={2} />
			</a>
		</div>
	);
}

