'use client';

import Image from 'next/image';
import clsx from 'clsx';

const linkClass =
	'group relative h-10 w-10 shrink-0 transition-all duration-200 hover:scale-105 hover:drop-shadow-[0_0_14px_rgba(120,163,200,0.45)] active:scale-[0.97] active:translate-y-[1px]';

export function OdysseySocial({
	variant = 'corner',
	className,
}: {
	/** `corner` — desktop dock; `inline` — centered row (mobile). */
	variant?: 'corner' | 'inline';
	className?: string;
}) {
	const links = (
		<>
			<a
				href="https://x.com/Somnia_Network"
				target="_blank"
				rel="noopener noreferrer"
				className={linkClass}
				aria-label="Somnia on X"
			>
				<Image src="/assets/odyssey/social-x-figma.png" alt="" fill className="object-contain" />
			</a>

			<a
				href="https://discord.com/invite/somnia"
				target="_blank"
				rel="noopener noreferrer"
				className={linkClass}
				aria-label="Somnia Discord"
			>
				<Image src="/assets/odyssey/social-discord-figma.png" alt="" fill className="object-contain" />
			</a>

			<a
				href="https://browser.somnia.network/"
				target="_blank"
				rel="noopener noreferrer"
				className={linkClass}
				aria-label="Somnia Browser"
			>
				<Image src="/assets/odyssey/social-site-figma.png" alt="" fill className="object-contain" />
			</a>
		</>
	);

	if (variant === 'inline') {
		return (
			<div className={clsx('pointer-events-auto z-[60] flex shrink-0 items-center justify-center gap-[10px] py-2', className)}>
				{links}
			</div>
		);
	}

	return (
		<div
			className={clsx('pointer-events-auto absolute z-[60] flex items-end gap-[10px]', className)}
			style={{
				right: 14,
				bottom: 18,
				width: 140,
				height: 40,
			}}
		>
			{links}
		</div>
	);
}

