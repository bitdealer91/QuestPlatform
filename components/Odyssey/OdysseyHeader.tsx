'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { User, Wallet2 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useReown } from '@/lib/reown';
import { useDomain } from '@/hooks/useDomain';
import clsx from 'clsx';

const SOMNIA_MAINNET_ID = 5031;
const HEADER_H = 73;

/** Figma nodes 68:161 (disconnected) and 153:3809 (connected), bar width matches stage 1280px. */

type Props = {
	onProfileClick: () => void;
};

export function OdysseyHeader({ onProfileClick }: Props) {
	const ctx = useReown();
	const { address, isConnected, isConnecting } = useAccount();
	const domain = useDomain({ registry: (process.env.NEXT_PUBLIC_SOMNIA_NAME_REGISTRY as `0x${string}` | undefined) });
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const handleWallet = () => {
		if (!ctx?.appKit) {
			alert('Wallet is not configured. Set NEXT_PUBLIC_REOWN_PROJECT_ID and reload.');
			return;
		}
		ctx.appKit.open?.();
	};

	const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '0x0000…0000');

	const showConnectedChrome = mounted && isConnected && !!address;

	return (
		<header
			className="pointer-events-auto absolute left-0 top-0 z-50 w-full select-none"
			style={{ height: HEADER_H }}
			data-node-id={showConnectedChrome ? '153:3809' : '68:161'}
		>
			<div className="relative h-full w-full">
				<Image
					src={showConnectedChrome ? '/assets/odyssey/header-connected-bg.svg' : '/assets/odyssey/header-disconnected.svg'}
					alt=""
					fill
					priority
					className="object-fill"
					sizes="1280px"
				/>

				{/* Logo — Figma clip group ~13.83,24.3 25.3×24.28 */}
				<div className="absolute" style={{ left: 13.83, top: 24.3, width: 25.3, height: 24.28 }}>
					<Image
						src={showConnectedChrome ? '/assets/odyssey/header-connected-logo.svg' : '/assets/odyssey/header-logo-fill.svg'}
						alt=""
						width={26}
						height={25}
						className="block max-h-full max-w-full object-contain"
						priority
					/>
				</div>

				{/* Title — Figma 68:183 / 153:3811 */}
				<p
					className={clsx(
						'absolute text-[15px] font-normal leading-[1.5] tracking-[-0.345px] text-white',
						'left-[51px] top-[25px] whitespace-nowrap'
					)}
					style={{ fontFamily: 'var(--font-mooli), system-ui, sans-serif' }}
				>
					The Somnia Odyssey 2.0
				</p>

				{!showConnectedChrome && (
					<>
						<button
							type="button"
							onClick={handleWallet}
							disabled={isConnecting}
							className="absolute overflow-hidden rounded-[19px] transition-all duration-200 hover:scale-[1.02] hover:brightness-105 hover:drop-shadow-[0_0_18px_rgba(120,163,200,0.45)] active:scale-[0.985] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
							// Позиционируем относительно правого края (как в Figma: right ~14px)
							style={{ right: 14, top: 18, width: 114, height: 37 }}
							aria-label="Sign in"
						>
							<Image src="/assets/odyssey/header-signin.svg" alt="" width={114} height={37} className="pointer-events-none object-fill" />
							<span
								className="pointer-events-none absolute left-[33px] top-[7px] z-[1] text-[15px] font-normal leading-[1.5] tracking-[-0.345px] text-black"
								style={{ fontFamily: 'var(--font-mooli), system-ui, sans-serif' }}
							>
								{isConnecting ? '…' : 'Sign in'}
							</span>
						</button>
					</>
				)}

				{showConnectedChrome && (
					<>
						<p
							className="absolute text-[12px] font-normal leading-[1.5] tracking-[-0.276px] text-white"
							style={{ left: 985, top: 25, fontFamily: 'var(--font-mooli), system-ui, sans-serif' }}
						>
							Somnia Mainnet
						</p>

						<button
							type="button"
							onClick={handleWallet}
							className="absolute flex items-center justify-center gap-1 rounded-[19px] bg-[#7eb8d9] px-2 text-black transition-all duration-200 hover:scale-[1.02] hover:brightness-105 hover:drop-shadow-[0_0_18px_rgba(120,163,200,0.45)] active:scale-[0.985] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
							style={{ right: 62, top: 18, width: 114, height: 37, fontFamily: 'var(--font-mooli), system-ui, sans-serif' }}
							aria-label="Wallet"
						>
							<Wallet2 className="h-[15px] w-[15px] shrink-0 opacity-90" />
							<span className="max-w-[78px] truncate text-[15px] font-normal leading-none tracking-[-0.345px]">
								{domain || short(address)}
							</span>
						</button>

						<button
							type="button"
							onClick={onProfileClick}
							className="absolute flex items-center justify-center rounded-full border border-white/85 bg-black/20 transition-all duration-200 hover:scale-105 hover:border-white hover:bg-black/35 hover:drop-shadow-[0_0_16px_rgba(120,163,200,0.4)] active:scale-[0.97] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
							style={{ right: 14, top: 19, width: 35, height: 35 }}
							aria-label="Profile"
						>
							<User className="h-4 w-4 text-white" />
						</button>
					</>
				)}
			</div>

		</header>
	);
}
