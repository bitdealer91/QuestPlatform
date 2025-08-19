'use client';
import Image from 'next/image';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { START } from '@/lib/planets';
import clsx from 'clsx';

export default function MascotButton(){
	const [open, setOpen] = useState(false);
	const [hover, setHover] = useState(false);
	return (
		<>
			<button
				onClick={() => setOpen(true)}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
				onFocus={() => setHover(true)}
				onBlur={() => setHover(false)}
				aria-label="Open profile"
				className="group absolute outline-none z-50"
				style={{ left: `${START.x}%`, top: `${START.y}%`, transform: 'translate(-50%,-50%)' }}
			>
				<span className={clsx('relative block rounded-full transition-transform duration-200 w-[clamp(96px,14vw,180px)] h-[clamp(96px,14vw,180px)]', hover ? 'scale-[1.06] drop-shadow-[0_0_24px_var(--ring)]' : 'scale-100')}>
					<Image src={START.img} alt="Mascot" fill priority className="object-contain animate-[bob_2.6s_ease-in-out_infinite]" />
					<span className={clsx('absolute inset-0 rounded-full border', hover ? 'border-[rgba(182,112,255,.65)]' : 'border-transparent')} />
				</span>
			</button>
			<ProfileModal open={open} onClose={() => setOpen(false)} />
		</>
	);
}

function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }){
	const level = 3;
	const xp = 420;
	const nextLevelXp = 600;
	const completed = 5;
	const claimable = 1234;
	return (
		<Modal open={open} onClose={onClose} title="Profile">
			<div className="grid gap-4">
				<div className="flex items-center gap-3">
					<Image src="/assets/mascot.png" alt="Mascot" width={56} height={56} className="rounded-xl" />
					<div>
						<div className="text-sm text-[color:var(--muted)]">Level</div>
						<div className="text-xl font-semibold">{level}</div>
					</div>
				</div>
				<div>
					<div className="flex justify-between text-sm mb-2"><span>XP</span><span>{xp} / {nextLevelXp}</span></div>
					<div className="h-2 rounded bg-white/10 overflow-hidden">
						<div className="h-full bg-[color:var(--primary)]" style={{ width: `${Math.min(100, Math.round((xp/nextLevelXp)*100))}%` }} />
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]">
						<div className="text-sm text-[color:var(--muted)]">Completed quests</div>
						<div className="text-lg font-semibold">{completed}</div>
					</div>
					<div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]">
						<div className="text-sm text-[color:var(--muted)]">Claimable</div>
						<div className="flex items-center gap-2 text-lg font-semibold">
							<Image src="/assets/somnia-logo.svg" alt="STT" width={18} height={18} />
							<span>{claimable} STT</span>
						</div>
					</div>
				</div>
				<div className="flex items-center justify-between gap-3">
					<div className="text-sm text-[color:var(--muted)]">Total to receive</div>
					<div className="flex items-center gap-2 text-xl font-semibold">
						<Image src="/assets/somnia-logo.svg" alt="STT" width={18} height={18} />
						<span>{claimable} STT</span>
					</div>
				</div>
				<div className="flex justify-end">
					<button onClick={onClose} className="px-4 py-2 rounded-xl bg-[color:var(--primary)] text-black">Withdraw</button>
				</div>
			</div>
		</Modal>
	);
}
