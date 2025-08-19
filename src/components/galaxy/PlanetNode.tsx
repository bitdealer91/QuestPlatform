'use client';
import Image from 'next/image';
import { useState, memo } from 'react';
import clsx from 'clsx';

export type PlanetNodeProps = {
  id: number;
  imgSrc: string;
  title: string;
  stars: 0 | 1 | 2 | 3;
  locked?: boolean;
  onView?: (id: number) => void;
  onClaim?: (id: number) => void;
  sizePx?: number;
};

function PlanetNodeImpl({
  id,
  imgSrc,
  title,
  stars,
  locked,
  onView,
  onClaim,
  sizePx = 120,
}: PlanetNodeProps) {
  const [hover, setHover] = useState(false);
  const canClaim = stars === 3 && !locked;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title} — ${stars} stars`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={clsx('group outline-none', 'relative flex flex-col items-center')}
    >
      <div
        className={clsx(
          'relative transition-transform duration-200',
          hover ? 'scale-[1.06] drop-shadow-[0_0_24px_var(--ring)]' : 'scale-100',
        )}
        style={{ width: sizePx, height: sizePx }}
      >
        <Image
          src={imgSrc}
          alt={title}
          fill
          sizes={`${sizePx}px`}
          priority={id <= 2}
          className="select-none pointer-events-none object-contain"
        />
      </div>

      <div className="mt-2 flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className={clsx(
              'inline-block w-4 h-4 bg-contain bg-no-repeat',
              i < stars
                ? 'bg-[url("/assets/icons/star-full.svg")] animate-pop'
                : 'bg-[url("/assets/icons/star-empty.svg")]',
            )}
          />
        ))}
      </div>

      <div
        className={clsx(
          'pointer-events-none absolute left-1/2 -translate-x-1/2 mt-3 w-[220px]',
          'transition-all duration-200',
          hover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        )}
      >
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
            disabled={!canClaim}
            className={clsx(
              'px-3 py-2 rounded-xl bg-[var(--card)] text-[var(--text)] border border-[var(--outline)]',
              canClaim
                ? 'hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]'
                : 'opacity-60 cursor-not-allowed',
            )}
            aria-label={`Claim reward for ${title}`}
          >
            Claim Reward
          </button>
        </div>
      </div>
    </div>
  );
}

export const PlanetNode = memo(PlanetNodeImpl);


