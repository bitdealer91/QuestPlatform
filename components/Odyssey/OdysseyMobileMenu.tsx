'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { OdysseySocial } from '@/components/Odyssey/OdysseySocial';
import { OdysseyMobileHeader } from '@/components/Odyssey/OdysseyMobileHeader';
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
	const [preferStaticBear, setPreferStaticBear] = useState(true);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const ua = navigator.userAgent ?? '';
		const isIOS =
			/iPad|iPhone|iPod/i.test(ua) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
		setPreferStaticBear(isIOS);
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
			className="pointer-events-auto fixed inset-0 z-[100] flex flex-col bg-[#03040c] md:hidden"
			role="dialog"
			aria-modal="true"
			aria-label="Menu"
		>
			<div className="mx-auto flex h-full min-h-0 w-full max-w-[390px] flex-col">
				<OdysseyMobileHeader menuOpen onMenuPress={onClose} className="shrink-0" />
				<div className="flex min-h-0 flex-1 flex-col items-center px-6 pt-6">
					<div className="flex min-h-0 flex-1 flex-col items-center justify-center">
						<div
							className="relative shrink-0 overflow-hidden rounded-[var(--radius-lg)]"
							style={{ width: 179, height: 179 }}
						>
							{preferStaticBear ? (
								<Image
									src="/assets/mascot.png"
									alt=""
									fill
									className="object-contain object-center"
									sizes="179px"
									draggable={false}
								/>
							) : (
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
							)}
						</div>
						<button
							type="button"
							onClick={() => {
								onSignIn();
								onClose();
							}}
							disabled={isConnecting}
							className="mt-10 inline-flex shrink-0 items-center justify-center rounded-[19px] bg-[#78a3c8] text-[15px] font-normal leading-none tracking-[-0.345px] text-black transition-colors duration-200 hover:brightness-105 hover:shadow-[0_0_16px_rgba(120,163,200,0.42)] disabled:opacity-60"
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
		</div>
	);

	return createPortal(content, document.body);
}
