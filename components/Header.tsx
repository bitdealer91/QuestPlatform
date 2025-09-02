"use client";
import { useReown } from "@/lib/reown";
import { Button } from "@/components/ui/Button";
import { ChevronDown, User, Wallet2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useAccount, useBalance } from "wagmi";
import { useDomain } from "@/hooks/useDomain";

const SOMNIA_MAINNET_ID = 5031;

export default function Header(){
	const ctx = useReown();
	const { address, isConnected, isConnecting } = useAccount();
	const domain = useDomain({ registry: (process.env.NEXT_PUBLIC_SOMNIA_NAME_REGISTRY as `0x${string}` | undefined) });
	const [profileOpen, setProfileOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
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
		</header>
	);
}
