"use client";
import { useReown } from "@/lib/reown";
import { Button } from "@/components/ui/Button";
import { ChevronDown, User, Wallet2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useAccount, useBalance } from "wagmi";
import { useDomain } from "@/hooks/useDomain";
// Full-screen About overlay (no modal chrome)

const SOMNIA_MAINNET_ID = 5031;

export default function Header(){
	const ctx = useReown();
	const { address, isConnected, isConnecting } = useAccount();
	const domain = useDomain({ registry: (process.env.NEXT_PUBLIC_SOMNIA_NAME_REGISTRY as `0x${string}` | undefined) });
	const [profileOpen, setProfileOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [aboutOpen, setAboutOpen] = useState(false);
	useEffect(() => setMounted(true), []);

	const handleWallet = () => {
		if (!ctx?.appKit) { 
			alert("Wallet is not configured. Set NEXT_PUBLIC_REOWN_PROJECT_ID and reload."); 
			return; 
		}
		ctx.appKit.open?.();
	};

	// Always show mainnet balance regardless of current wallet network
	const { data: nativeBal } = useBalance({ address, chainId: SOMNIA_MAINNET_ID, query: { enabled: !!address } });
	const formattedBal = nativeBal ? `${Number(nativeBal.formatted).toFixed(2)} ${nativeBal.symbol || "SOMI"}` : undefined;

	const short = (a?: string) => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "0x0000…0000";

	return (
		<header className="absolute top-[var(--safe-top)] left-[var(--safe-left)] right-[var(--safe-right)] z-40 pt-3">
			<div className="mx-auto w-full px-4">
				<div className="h-[72px] w-full rounded-[var(--radius-lg)] border border-[color:var(--outline)] bg-[color:var(--card)]/70 backdrop-blur-xl shadow-elevated flex items-center justify-between">
					<div className="flex items-center gap-3 pl-3">
						<Image src="/assets/somnia-logo.svg" alt="Somnia" width={24} height={24} />
						<span className="font-semibold tracking-tight">The Somnia Odyssey</span>
						<button
							type="button"
							aria-label="About The Somnia Odyssey"
							onClick={() => setAboutOpen(true)}
							className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--outline)] bg-[color:var(--card)] text-xs transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] hover:scale-105 active:scale-95"
						>
							About
							<span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] animate-pulse" />
						</button>
					</div>
					<nav className="hidden md:flex items-center gap-8" aria-label="Main navigation" />
					<div className="flex items-center gap-3 pr-3">
						<span className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--outline)] bg-[color:var(--card)] text-xs">Somnia Mainnet</span>
						{formattedBal && (
							<span className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--outline)] bg-[color:var(--card)] text-xs">
								<Image src="/assets/somnia-logo.svg" alt="SOMI" width={14} height={14} />
								{formattedBal}
							</span>
						)}
						{!mounted ? (
							<Button variant="glass" className="pl-3 pr-2 gap-2" aria-hidden>
								<span className="inline-block h-2 w-2 rounded-full bg-[color:var(--muted)]" />
								<span className="tabular-nums">0x0000…0000</span>
								<ChevronDown className="h-4 w-4 opacity-80" />
							</Button>
						) : isConnected && address ? (
							<Button variant="glass" onClick={handleWallet} className="pl-3 pr-2 gap-2">
								<span className="inline-block h-2 w-2 rounded-full bg-[color:var(--ok)]" />
								<span className="tabular-nums">{domain || short(address)}</span>
								<ChevronDown className="h-4 w-4 opacity-80" />
							</Button>
						) : (
							<Button variant="primary" onClick={handleWallet} className="gap-2" disabled={isConnecting}>
								<Wallet2 className="h-4 w-4" />
								{isConnecting ? 'Connecting…' : 'Connect'}
							</Button>
						)}
						<button aria-label="Profile" onClick={() => setProfileOpen(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--outline)] bg-[color:var(--card)] hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
							<User className="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>
			<ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} address={address || undefined} />

			{aboutOpen && (
				<div className="fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
					<div className="relative z-10 h-full w-full flex items-center justify-center p-4">
						<div className="w-[min(980px,94vw)] max-h-[90vh] mx-auto flex flex-col items-center gap-4">
							<div className="w-full max-h-[80vh] overflow-auto rounded-[var(--radius-lg)] border border-[color:var(--outline)] bg-[color:var(--card)]/10">
								<img src="/assets/Scroll (1).png" alt="About scroll" className="block w-full h-auto" />
							</div>
							<button
								data-autofocus
								onClick={() => setAboutOpen(false)}
								className="group relative overflow-hidden inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[color:var(--accent)] text-white font-medium shadow transition transform hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
							>
								<span className="pointer-events-none absolute -inset-10 rounded-full bg-[conic-gradient(from_0deg,rgba(255,215,0,0.3),rgba(99,102,241,0.3),rgba(255,215,0,0.3))] blur-2xl opacity-0 group-hover:opacity-70 animate-[spin_6s_linear_infinite]" />
								<span className="relative z-10">Ok</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</header>
	);
}
