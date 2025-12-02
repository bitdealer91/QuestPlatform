'use client';
import Image from 'next/image';
import { useState, memo, useEffect } from 'react';
import clsx from 'clsx';
import { Lock } from 'lucide-react';
import { useAccount, useReadContract } from 'wagmi';
import KeyMintModal from './KeyMintModal';
import StarMintModal from './StarMintModal';
import { ERC1155_MIN_ABI, KEYS_1155_ADDRESS, hasKeysContractConfigured } from '@/lib/contracts';

export type PlanetNodeProps = {
	id: number;
	imgSrc: string;
	title: string;
	stars: 0|1|2|3;
	locked?: boolean;
	onView?: (id: number) => void;
	onClaim?: (id: number) => void;
	sizePx?: number;
	claimEnabled?: boolean;
};

function PlanetNodeImpl({ id, imgSrc, title, stars, sizePx = 120, onView, onClaim, locked, claimEnabled = false }: PlanetNodeProps) {
    const [hover, setHover] = useState(false);
	const { address } = useAccount();
    const canInteract = !locked;
	const [mintOpen, setMintOpen] = useState(false);
	const [starOpen, setStarOpen] = useState(false);
	const [eligible, setEligible] = useState<boolean | null>(null);
	const [starAvailable, setStarAvailable] = useState<boolean>(false);
	const [starMintedOnce, setStarMintedOnce] = useState<boolean>(false);
	const DEADLINE_ISO = '2025-12-01T15:00:00Z';
	const endedByTime = (() => {
		const d = new Date(DEADLINE_ISO);
		return !isNaN(d.getTime()) && Date.now() >= d.getTime();
	})();
	const ended = process.env.NEXT_PUBLIC_FORCE_ENDED === '1' || endedByTime;

	// Optional on-chain check to hide Mint if already minted
	const hasContract = hasKeysContractConfigured();
	const { data: bal } = useReadContract({
		abi: ERC1155_MIN_ABI,
		address: hasContract ? (KEYS_1155_ADDRESS as `0x${string}`) : undefined,
		functionName: 'balanceOf',
		args: [address as `0x${string}`, BigInt(id)],
		query: { enabled: hasContract && !!address && canInteract },
	});

	const alreadyMinted = typeof bal === 'bigint' && bal > 0n;
	// Do not use on-chain balance to decide if user "already minted" — a user may have bought on secondary.
	// Rely on server-side mintedOnce flag instead (set after successful mint via our flow and on-chain scan).
	const alreadyStarMinted = starMintedOnce === true;

	// Check if user has any stars available to mint (sum from /api/profile minus on-chain balance)
	useEffect(() => {
		if (id !== 8) return;
		if (!address || !canInteract) { setStarAvailable(false); return; }
		let cancelled = false;
		const run = async () => {
			try {
				const res = await fetch(`/api/profile?address=${address}`);
				const j = await res.json().catch(() => ({}));
				const byWeek = (j?.starsByWeek || {}) as Record<string, number>;
				const total = Object.values(byWeek).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
				const statusRes = await fetch(`/api/stars/status?address=${address}`).then(r => r.json()).catch(() => ({ mintedOnce: false, mintedTotal: 0 }));
				const mintedOnce = Boolean((statusRes as any)?.mintedOnce);
				// Remaining is based only on collected stars and server-side mintedOnce lock.
				const remaining = mintedOnce ? 0 : Math.max(0, total);
				if (!cancelled) {
					setStarMintedOnce(mintedOnce);
					setStarAvailable(remaining > 0 && !mintedOnce);
				}
			} catch {
				if (!cancelled) {
					setStarMintedOnce(false);
					setStarAvailable(false);
				}
			}
		};
		// Fetch only on hover to reduce calls
		if (hover) { run(); }
		return () => { cancelled = true; };
	}, [id, address, hover, canInteract]);

	// Fetch eligibility when user hovers and when address changes
	useEffect(() => {
		if (!address) { setEligible(null); return; }
		if (!canInteract) { setEligible(null); return; }
		const envVal = String(process.env.NEXT_PUBLIC_ENABLE_MINT_DEV || '0').toLowerCase();
		const flag = envVal === '1' || envVal === 'true';
		if (!flag) { setEligible(null); return; }
		if (!hover) return; // fetch lazily on hover to reduce calls
		let cancelled = false;
		fetch(`/api/mint/eligibility?address=${address}&week=${id}`)
			.then(r => r.json())
			.then(j => { if (!cancelled) setEligible(Boolean(j?.eligible)); })
			.catch(() => { if (!cancelled) setEligible(null); });
		return () => { cancelled = true; };
	}, [address, id, canInteract, hover]);

	return (
		<div className={clsx('group outline-none', 'relative', locked && 'cursor-not-allowed')}
			aria-label={`${title} — ${stars} stars${locked ? ' (locked)' : ''}`}
			aria-disabled={locked}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			onFocus={() => setHover(true)}
			onBlur={() => setHover(false)}
		>
			{/* ANCHOR: centered art, used for pathing */}
			<div
				data-planet-anchor
				data-path-order={id}
				className={clsx('relative transition-transform duration-200', hover ? 'scale-[1.06] drop-shadow-[0_0_24px_var(--ring)]' : 'scale-100')}
				style={{ width: sizePx, height: sizePx }}
			>
				<Image
					src={imgSrc}
					alt={title}
					width={sizePx}
					height={sizePx}
					priority={id <= 2}
					className={clsx('select-none pointer-events-none object-contain')}
					draggable={false}
				/>
				{locked && hover && (
					<div className="pointer-events-none absolute inset-0 grid place-items-center z-50">
						<div className={clsx('grid place-items-center rounded-full border border-[color:var(--outline)]', 'bg-[radial-gradient(60%_60%_at_30%_35%,rgba(178,108,255,.45),rgba(69,214,255,.25))]', 'w-16 h-16 transition-transform duration-200', hover ? 'scale-110 drop-shadow-glow' : 'scale-100')}>
							<Lock className="h-7 w-7 text-white" />
						</div>
					</div>
				)}
			</div>

			{/* HUD: positioned outside so it never shifts the center */}
			<div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+6px)] w-max z-50">
				<div className="mx-auto mb-2 flex justify-center gap-1">
					{[0,1,2].map(i => (
						<span key={i} aria-hidden className={clsx('inline-block w-4 h-4 bg-contain bg-no-repeat', i < stars ? 'bg-[url("/assets/icons/star-full.svg")] animate-pop' : 'bg-[url("/assets/icons/star-empty.svg")]')} />
					))}
				</div>
                {canInteract && (
                    <div className={clsx('pointer-events-none w-[292px] z-50', 'transition-all duration-200', hover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')}>
						<div className="pointer-events-auto">
							<div className="flex gap-3">
								{(() => { const v = String(process.env.NEXT_PUBLIC_ENABLE_MINT_DEV || '0').toLowerCase(); const flag = v === '1' || v === 'true'; return (flag && address && eligible && !alreadyMinted); })() ? (
									<button onClick={() => setMintOpen(true)} style={{ width: 140 }} className="inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border border-[color:var(--outline)] bg-[var(--primary)] text-black hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer" aria-label={`Mint key for ${title}`}>Mint</button>
								) : ((() => { const v = String(process.env.NEXT_PUBLIC_ENABLE_MINT_DEV || '0').toLowerCase(); const flag = v === '1' || v === 'true'; return (flag && address && eligible && alreadyMinted); })() ? (
									<button disabled style={{ width: 140 }} className="inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border bg-[color:var(--card)] text-[color:var(--muted)] border-[color:var(--outline)] cursor-not-allowed" aria-label={`Key minted for ${title}`}>Minted</button>
								) : (
									<button onClick={() => onView?.(id)} style={{ width: 140 }} className="inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border border-[color:var(--outline)] bg-[var(--primary)] text-black hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer" aria-label={`View tasks for ${title}`}>View Tasks</button>
								))}
								{ended ? (
									<div title="Ended">
										<button disabled style={{ width: 140 }} className={clsx('inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]', 'bg-[color:var(--card)]/60 text-[color:var(--muted)] border-[color:var(--outline)]/60 cursor-not-allowed')} aria-label={`Claim ended for ${title}`}>Claim</button>
									</div>
								) : (
									<button onClick={() => claimEnabled && onClaim?.(id)} disabled={!claimEnabled} style={{ width: 140 }} className={clsx('inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]', claimEnabled ? 'bg-[var(--card)] text-[var(--text)] border-[var(--outline)] hover:brightness-110 cursor-pointer' : 'bg-[color:var(--card)]/60 text-[color:var(--muted)] border-[color:var(--outline)]/60 cursor-not-allowed')} aria-label={`Claim reward for ${title}`}>{claimEnabled ? 'Claim' : 'Claim (locked)'}</button>
								)}
							</div>
                            {id === 8 && starAvailable && (
                                <div className="mt-4 flex justify-center">
                                    <div className="premium-wrap">
											<button
												onClick={() => !alreadyStarMinted && setStarOpen(true)}
												className={clsx(
													'relative overflow-hidden inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border',
													'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
													'bg-[var(--card)] text-[var(--text)] border-[var(--outline)]',
													'transition-all duration-200',
													alreadyStarMinted ? 'opacity-80 cursor-not-allowed' : 'hover:brightness-110 cursor-pointer'
												)}
												style={{ width: 120 }}
												aria-label={`Mint stars for ${title}`}
												disabled={alreadyStarMinted}
											>
												{alreadyStarMinted ? 'Minted' : 'Star'}
												<span className="premium-border" />
												<span className="premium-sheen" style={{ zIndex: 2 }} />
												<span className="premium-twinkle" style={{ left: '6px', top: '8px', zIndex: 2, animationDelay: '0ms' }} />
												<span className="premium-twinkle" style={{ right: '6px', top: '4px', zIndex: 2, animationDelay: '300ms' }} />
											</button>
                                    </div>
                                </div>
                            )}
						</div>
					</div>
                )}
				{locked && hover && null}
			</div>
			<KeyMintModal open={mintOpen} onClose={() => setMintOpen(false)} weekId={id} address={address || undefined} initialEligible={eligible ?? undefined} />
			{ id === 8 && <StarMintModal open={starOpen} onClose={() => setStarOpen(false)} address={address || undefined} /> }
		</div>
	);
}

export const PlanetNode = memo(PlanetNodeImpl);
