'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { OdysseySocial } from '@/components/Odyssey/OdysseySocial';
import { ODYSSEY_MOBILE_BUTTON_H, ODYSSEY_MOBILE_BUTTON_W, ODYSSEY_MOBILE_SOCIAL_BOTTOM } from '@/lib/odysseyMobileLayout';

type Props = {
	open: boolean;
	onClose: () => void;
	onSignIn: () => void;
	isConnecting?: boolean;
	isConnected?: boolean;
	address?: string;
};

function shortAddr(a: string) {
	return `${a.slice(0, 6)}…${a.slice(-3)}`;
}

/** Figma `173:20` — полноэкранное меню: шапка, персонаж, Sign in, соцсети. */
export function OdysseyMobileMenu({
	open,
	onClose,
	onSignIn,
	isConnecting = false,
	isConnected = false,
	address,
}: Props) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open || !mounted) return null;

	const walletLabel =
		isConnecting ? '…' : isConnected && address ? shortAddr(address) : 'Sign in';

	const content = (
		<div
			className="pointer-events-auto fixed inset-0 z-[999] flex flex-col bg-black md:hidden"
			role="dialog"
			aria-modal="true"
			aria-label="Menu"
		>
			<header
				className={clsx(
					'flex shrink-0 select-none items-center justify-between border-b border-white/10',
				)}
				style={{
					paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
					paddingBottom: 10,
					paddingLeft: 21,
					paddingRight: 21,
				}}
			>
				<div className="flex min-w-0 items-center gap-3">
					<div className="relative h-[24.285px] w-[25.297px] shrink-0">
						<Image src="/assets/odyssey/header-logo-fill.svg" alt="" fill className="object-contain" priority />
					</div>
					<div
						className="min-w-0 text-[15px] font-normal leading-[1.5] tracking-[-0.345px] text-white"
						style={{ fontFamily: 'var(--font-mooli), system-ui, sans-serif' }}
					>
						<p className="whitespace-nowrap">The Somnia</p>
						<p className="whitespace-nowrap">Odyssey 2.0</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="inline-flex h-[45px] w-[45px] shrink-0 items-center justify-center rounded-full bg-[#78a3c8] text-black shadow-[0_0_20px_rgba(120,163,200,0.35)] transition-all duration-200 hover:brightness-105 active:scale-[0.97]"
					aria-label="Close menu"
				>
					<X className="h-[22px] w-[22px]" strokeWidth={2.25} />
				</button>
			</header>

			<div className="flex min-h-0 flex-1 flex-col items-center px-6 pt-6">
				<div className="flex min-h-0 flex-1 flex-col items-center justify-center">
					<div
						className="relative shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-[color:var(--odyssey-task-surface)]"
						style={{ width: 179, height: 179 }}
					>
						<video
							className="h-full w-full object-cover object-center"
							autoPlay
							muted
							loop
							playsInline
							preload="metadata"
							aria-hidden
						>
							<source src="/assets/bear.webm" type="video/webm" />
						</video>
					</div>
					<button
						type="button"
						onClick={() => {
							onClose();
							queueMicrotask(() => onSignIn());
						}}
						disabled={isConnecting}
						className="mt-10 inline-flex shrink-0 items-center justify-center rounded-[19px] bg-[#78a3c8] text-[15px] font-normal leading-none tracking-[-0.345px] text-black transition-all duration-200 hover:brightness-105 hover:shadow-[0_0_16px_rgba(120,163,200,0.42)] active:scale-[0.985] active:translate-y-px disabled:opacity-60"
						style={{
							fontFamily: 'var(--font-mooli), system-ui, sans-serif',
							width: ODYSSEY_MOBILE_BUTTON_W,
							height: ODYSSEY_MOBILE_BUTTON_H,
						}}
					>
						{walletLabel}
					</button>
				</div>
				<div
					className="shrink-0 pt-4"
					style={{
						paddingBottom: `max(${ODYSSEY_MOBILE_SOCIAL_BOTTOM}px, env(safe-area-inset-bottom, 0px))`,
					}}
				>
					<OdysseySocial variant="inline" />
				</div>
			</div>
		</div>
	);

	return createPortal(content, document.body);
}
