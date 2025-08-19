'use client';
import Image from 'next/image';
import { START, PLANETS } from '@/lib/planets';
import { buildSmoothPath, VIEWBOX } from '@/lib/path';
import { PlanetNode } from './PlanetNode';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';

export function PlanetsRail({
  getStarsForWeek,
  openTasks,
}: {
  getStarsForWeek: (id: number) => 0 | 1 | 2 | 3;
  openTasks: (id: number) => void;
}) {
  const router = useRouter();
  const pts = [START, ...PLANETS].map((p) => ({ x: p.x, y: p.y }));
  const d = buildSmoothPath(pts);
  const [len, setLen] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
  }, [d]);

  return (
    <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden">
      <Image src="/assets/background.png" alt="Galaxy background" fill priority className="object-cover" />

      <svg
        className="absolute inset-0 pointer-events-none"
        viewBox={`0 0 ${VIEWBOX.VIEW_W} ${VIEWBOX.VIEW_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="g-path" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
          <filter id="f-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>
        <path
          d={d}
          fill="none"
          stroke="rgba(255,255,255,.08)"
          strokeWidth="10"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          ref={pathRef}
          d={d}
          fill="none"
          stroke="url(#g-path)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1 18"
          vectorEffect="non-scaling-stroke"
          filter="url(#f-glow)"
          style={{ strokeOpacity: 0.9 }}
        />
        <path id="animPath" d={d} fill="none" />
        {isClient && len > 0 && (
          <circle r="6" fill="white">
            <animateMotion dur="9s" repeatCount="indefinite" rotate="auto">
              <mpath href="#animPath" />
            </animateMotion>
          </circle>
        )}
      </svg>

      {/* Mascot rendered like a planet anchor (no outline) */}
      <div
        className="absolute z-50"
        style={{ left: `${START.x}%`, top: `${START.y}%`, transform: 'translate(-50%,-50%)' }}
      >
        <button
          role="button"
          aria-label="Mascot profile"
          onClick={() => setProfileOpen(true)}
          className="group outline-none"
        >
          <div
            className="relative transition-transform duration-200 group-hover:scale-[1.06] drop-shadow-[0_0_24px_var(--ring)] animate-[bob_2.6s_ease-in-out_infinite]"
            style={{ width: 140, height: 140 }}
          >
            <Image
              src={START.img}
              alt={START.title}
              fill
              sizes="140px"
              priority
              className="select-none pointer-events-none object-contain"
            />
          </div>
        </button>
      </div>

      {PLANETS.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%,-50%)' }}
        >
          <PlanetNode
            id={p.id}
            imgSrc={p.img}
            title={p.title}
            stars={getStarsForWeek(p.id)}
            locked={false}
            onView={(id) => openTasks(id)}
            onClaim={(id) => router.push(`/claim?week=${id}`)}
            sizePx={110}
          />
        </div>
      ))}

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Profile">
        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <Image src="/assets/mascot.png" alt="Mascot" width={56} height={56} className="rounded-xl" />
            <div>
              <div className="text-sm text-[color:var(--muted)]">Level</div>
              <div className="text-xl font-semibold">3</div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>XP</span>
              <span>420 / 600</span>
            </div>
            <div className="h-2 rounded bg-white/10 overflow-hidden">
              <div className="h-full bg-[color:var(--primary)]" style={{ width: `70%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]">
              <div className="text-xs text-[color:var(--muted)]">Completed quests</div>
              <div className="text-lg font-semibold">5</div>
            </div>
            <div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]">
              <div className="text-xs text-[color:var(--muted)]">Claimable</div>
              <div className="text-lg font-semibold">1234 STT</div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-[color:var(--muted)]">Total to receive</div>
            <div className="text-xl font-semibold">1234 STT</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}


