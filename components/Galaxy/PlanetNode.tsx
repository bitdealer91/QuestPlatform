'use client';
import Image from 'next/image';
import { useState, memo, useEffect } from 'react';
import clsx from 'clsx';
import { Lock } from 'lucide-react';
import { useAccount, useReadContract } from 'wagmi';
import KeyMintModal from './KeyMintModal';
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
	const [eligible, setEligible] = useState<boolean | null>(null);

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
                    <div className={clsx('pointer-events-none w-[260px] z-50', 'transition-all duration-200', hover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')}>
                        <div className="pointer-events-auto grid grid-cols-2 gap-2">
                            <button onClick={() => onView?.(id)} className="px-3 py-2 rounded-xl bg-[var(--primary)] text-black hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" aria-label={`View tasks for ${title}`}>View Tasks</button>
                            <button onClick={() => claimEnabled && onClaim?.(id)} disabled={!claimEnabled} className={clsx('px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]', claimEnabled ? 'bg-[var(--card)] text-[var(--text)] border-[var(--outline)] hover:brightness-110' : 'bg-[color:var(--card)]/60 text-[color:var(--muted)] border-[color:var(--outline)]/60 cursor-not-allowed')} aria-label={`Claim reward for ${title}`}>{claimEnabled ? 'Claim' : 'Claim (locked)'}</button>
                        </div>
						{(() => { const v = String(process.env.NEXT_PUBLIC_ENABLE_MINT_DEV || '0').toLowerCase(); return v === '1' || v === 'true'; })() && eligible && !alreadyMinted && (
							<div className="mt-2 flex justify-center pointer-events-auto">
								<button onClick={() => setMintOpen(true)} className="px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[var(--ring)] bg-[var(--card)] text-[var(--text)] border-[var(--outline)] hover:brightness-110 cursor-pointer" aria-label={`Mint key for ${title}`}>Mint</button>
							</div>
						)}
                    </div>
                )}
				{locked && hover && null}
			</div>
			<KeyMintModal open={mintOpen} onClose={() => setMintOpen(false)} weekId={id} address={address || undefined} initialEligible={eligible ?? undefined} />
		</div>
	);
}

export const PlanetNode = memo(PlanetNodeImpl);
