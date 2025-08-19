"use client";
import { useAppKit } from "@/lib/reown";
import { Button } from "@/components/ui/Button";
import { ChevronDown, Loader2, User, Wallet2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useAccount, useChainId, useBalance } from "wagmi";

export default function Header(){
	const ctx = useAppKit();
	const { address, isConnected, isConnecting } = useAccount();
	const chainId = useChainId();
	const [profileOpen, setProfileOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const { data: nativeBal } = useBalance({ address, chainId, query: { enabled: !!address } });
	const formattedBal = nativeBal ? `${Number(nativeBal.formatted).toFixed(2)} ${nativeBal.symbol || "STT"}` : undefined;

	const handleWallet = () => {
		if (!ctx) { alert("Set NEXT_PUBLIC_REOWN_PROJECT_ID in .env.local and restart dev server."); return; }
		ctx?.appKit?.open?.();
	};

	return (
		<header className="sticky top-0 z-40">
			<div className="mx-auto w-full px-4">
				<div className="mt-3 h-[72px] w-full rounded-[var(--radius-lg)] border border-[color:var(--outline)] bg-[color:var(--card)]/70 backdrop-blur-xl shadow-elevated flex items-center justify-between">
					<div className="flex items-center gap-3 pl-3">
						<Image src="/assets/somnia-logo.svg" alt="Somnia" width={24} height={24} />
						<span className="font-semibold tracking-tight">Somnia Quests</span>
					</div>
					<nav className="hidden md:flex items-center gap-8" aria-label="Main navigation" />
					<div className="flex items-center gap-3 pr-3">
						<span className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--outline)] bg-[color:var(--card)] text-xs">Somnia Testnet</span>
						{formattedBal && (
							<span className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--outline)] bg-[color:var(--card)] text-xs">
								<Image src="/assets/somnia-logo.svg" alt="STT" width={14} height={14} />
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
								<span className={`inline-block h-2 w-2 rounded-full ${chainId === 50312 ? 'bg-[color:var(--ok)]' : 'bg-[color:var(--warn)]'}`} />
								<span className="tabular-nums">{address.slice(0,6)}…{address.slice(-4)}</span>
								<ChevronDown className="h-4 w-4 opacity-80" />
							</Button>
						) : (
							<Button variant="primary" onClick={handleWallet} className="gap-2" disabled={isConnecting}>
								{isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet2 className="h-4 w-4" />}
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
		</header>
	);
}
