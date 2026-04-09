'use client';

import Image from 'next/image';
import { Menu } from 'lucide-react';
import clsx from 'clsx';
import { ODYSSEY_MOBILE_HEADER_ZONE_H } from '@/lib/odysseyMobileLayout';

/** Figma `146:3556` — зона 0…125px: лого, двухстрочный заголовок, меню 45×45 @ y≈16. */
export function OdysseyMobileHeader({
	onMenuPress,
	className,
}: {
	onMenuPress: () => void;
	className?: string;
}) {
	return (
		<header
			className={clsx(
				'pointer-events-auto z-50 flex shrink-0 select-none flex-col border-b border-white/10',
				className,
			)}
			style={{
				height: ODYSSEY_MOBILE_HEADER_ZONE_H,
				paddingTop: 'max(16px, env(safe-area-inset-top, 0px))',
				paddingLeft: 21,
				paddingRight: 21,
			}}
		>
			<div className="flex min-w-0 items-start justify-between">
				<div className="flex min-w-0 items-start gap-3">
					<div className="relative mt-px h-[24.285px] w-[25.297px] shrink-0">
						<Image src="/assets/odyssey/header-logo-fill.svg" alt="" fill className="object-contain" priority />
					</div>
					<div
						className="min-w-0 pt-px text-[15px] font-normal leading-[1.5] tracking-[-0.345px] text-white"
						style={{ fontFamily: 'var(--font-mooli), system-ui, sans-serif' }}
					>
						<p className="whitespace-nowrap">The Somnia</p>
						<p className="whitespace-nowrap">Odyssey 2.0</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onMenuPress}
					className="inline-flex h-[45px] w-[45px] shrink-0 items-center justify-center rounded-full bg-[#78a3c8] text-black shadow-[0_0_20px_rgba(120,163,200,0.35)] transition-all duration-200 hover:brightness-105 active:scale-[0.97]"
					aria-label="Open wallet"
				>
					<Menu className="h-[22px] w-[22px]" strokeWidth={2.25} />
				</button>
			</div>
		</header>
	);
}
