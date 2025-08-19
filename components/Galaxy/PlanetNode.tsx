'use client';
import Image from 'next/image';
import { useState, memo } from 'react';
import clsx from 'clsx';
import { Lock } from 'lucide-react';

export type PlanetNodeProps = {
	id: number;
	imgSrc: string;
	title: string;
	stars: 0|1|2|3;
	locked?: boolean;
	onView?: (id: number) => void;
	onClaim?: (id: number) => void;
	sizePx?: number;
};

function PlanetNodeImpl({ id, imgSrc, title, stars, sizePx = 120, onView, onClaim, locked }: PlanetNodeProps) {
	const [hover, setHover] = useState(false);
	const canInteract = !locked;

	return (
		<div
			role="button"
			tabIndex={0}
			aria-label={`${title} — ${stars} stars${locked ? ' (locked)' : ''}`}
			aria-disabled={locked}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			onFocus={() => setHover(true)}
			onBlur={() => setHover(false)}
			className={clsx('group outline-none', 'relative flex flex-col items-center', locked && 'cursor-not-allowed')}
		>
			<div className={clsx('relative transition-transform duration-200', hover ? 'scale-[1.06] drop-shadow-[0_0_24px_var(--ring)]' : 'scale-100')} style={{ width: sizePx, height: sizePx }}>
				<Image
					src={imgSrc}
					alt={title}
					width={sizePx}
					height={sizePx}
					priority={id <= 2}
					className={clsx('select-none pointer-events-none object-contain')}
				/>
				{/* center anchor */}
				<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-0.5 rounded-full bg-transparent" aria-hidden />

				{/* Locked hover effect: dim + big lock */}
				{locked && hover && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<div className="absolute inset-0 rounded-full bg-black/45" />
						<div className={clsx(
							'grid place-items-center rounded-full border border-[color:var(--outline)]',
							'bg-[radial-gradient(60%_60%_at_30%_35%,rgba(178,108,255,.45),rgba(69,214,255,.25))]',
							'w-16 h-16 transition-transform duration-200',
							hover ? 'scale-110 drop-shadow-glow' : 'scale-100'
						)}>
							<Lock className="h-7 w-7 text-white" />
						</div>
					</div>
				)}
			</div>

			<div className="mt-2 flex gap-1">
				{[0,1,2].map(i => (
					<span key={i} aria-hidden className={clsx('inline-block w-4 h-4 bg-contain bg-no-repeat', i < stars ? 'bg-[url("/assets/icons/star-full.svg")] animate-pop' : 'bg-[url("/assets/icons/star-empty.svg")]')} />
				))}
			</div>

			{canInteract && (
				<div className={clsx('pointer-events-none absolute left-1/2 -translate-x-1/2 mt-3 w-[220px]', 'transition-all duration-200', hover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')}>
					<div className="pointer-events-auto grid grid-cols-2 gap-2">
						<button
							onClick={() => onView?.(id)}
							className="px-3 py-2 rounded-xl bg-[var(--primary)] text-black hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
							aria-label={`View tasks for ${title}`}
						>
							View Tasks
						</button>
						<button
							onClick={() => onClaim?.(id)}
							className="px-3 py-2 rounded-xl bg-[var(--card)] text-[var(--text)] border border-[var(--outline)] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
							aria-label={`Claim reward for ${title}`}
						>
							Claim
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

export const PlanetNode = memo(PlanetNodeImpl);
