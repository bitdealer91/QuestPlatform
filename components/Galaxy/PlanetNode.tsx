'use client';
import Image from 'next/image';
import { useState, memo, useEffect } from 'react';
import clsx from 'clsx';
import { Lock } from 'lucide-react';
import { useAccount } from 'wagmi';
import StarMintModal from './StarMintModal';

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
	mandatoryDone?: boolean;
};

function PlanetNodeImpl({ id, imgSrc, title, stars, sizePx = 120, onView, onClaim, locked, claimEnabled = false, mandatoryDone = false }: PlanetNodeProps) {
    const [hover, setHover] = useState(false);
	const { address } = useAccount();
    const canInteract = !locked;
	const [starOpen, setStarOpen] = useState(false);
	const [starAvailable, setStarAvailable] = useState<boolean>(false);
	const [starMintedOnce, setStarMintedOnce] = useState<boolean>(false);
	const DEADLINE_ISO = '2025-12-01T15:00:00Z';
	const claimUnlocked = claimEnabled && mandatoryDone;
	const starCtaVisible = id === 8 && starAvailable && mandatoryDone;
	const endedByTime = (() => {
		const d = new Date(DEADLINE_ISO);
		return !isNaN(d.getTime()) && Date.now() >= d.getTime();
	})();
	const ended = process.env.NEXT_PUBLIC_FORCE_ENDED === '1' || endedByTime;

	const alreadyStarMinted = starMintedOnce === true;

	// Check if user has any stars available to mint (sum from /api/profile minus on-chain balance)
	useEffect(() => {
		if (id !== 8) return;
		if (!mandatoryDone) { setStarAvailable(false); return; }
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
	}, [id, address, hover, canInteract, mandatoryDone]);

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
								<button onClick={() => onView?.(id)} style={{ width: 140 }} className="inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border border-[color:var(--outline)] bg-[var(--primary)] text-black hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer" aria-label={`View tasks for ${title}`}>View Tasks</button>
								{ended ? (
									<div title="Ended">
										<button disabled style={{ width: 140 }} className={clsx('inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]', 'bg-[color:var(--card)]/60 text-[color:var(--muted)] border-[color:var(--outline)]/60 cursor-not-allowed')} aria-label={`Claim ended for ${title}`}>Claim</button>
									</div>
								) : (
									<button onClick={() => claimUnlocked && onClaim?.(id)} disabled={!claimUnlocked} style={{ width: 140 }} className={clsx('inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]', claimUnlocked ? 'bg-[var(--card)] text-[var(--text)] border-[var(--outline)] hover:brightness-110 cursor-pointer' : 'bg-[color:var(--card)]/60 text-[color:var(--muted)] border-[color:var(--outline)]/60 cursor-not-allowed')} aria-label={`Claim reward for ${title}`}>{claimUnlocked ? 'Claim' : 'Claim (locked)'}</button>
								)}
							</div>
                            {starCtaVisible && (
                                <div className="mt-4 flex justify-center">
                                    <div className="premium-wrap">
											{ended ? (
												<div title="Ended">
													<button
														disabled
														className={clsx(
															'relative overflow-hidden inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border',
															'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
															'bg-[var(--card)] text-[var(--muted)] border-[var(--outline)]/60',
															'transition-all duration-200',
															'opacity-80 cursor-not-allowed'
														)}
														style={{ width: 120 }}
														aria-label={`Star ended for ${title}`}
													>
														Star
														<span className="premium-border" />
														<span className="premium-sheen" style={{ zIndex: 2 }} />
														<span className="premium-twinkle" style={{ left: '6px', top: '8px', zIndex: 2, animationDelay: '0ms' }} />
														<span className="premium-twinkle" style={{ right: '6px', top: '4px', zIndex: 2, animationDelay: '300ms' }} />
													</button>
												</div>
											) : (
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
											)}
                                    </div>
                                </div>
                            )}
						</div>
					</div>
                )}
				{locked && hover && null}
			</div>
			{ id === 8 && <StarMintModal open={starOpen} onClose={() => setStarOpen(false)} address={address || undefined} /> }
		</div>
	);
}

export const PlanetNode = memo(PlanetNodeImpl);
