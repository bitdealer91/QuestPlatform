'use client';
import Modal from '@/components/ui/Modal';
import { useEffect, useState } from 'react';

type LedgerEvent = { ts: number; type: 'attempt'|'success'|'failure'; taskId: string; detail?: string };

type ProfileDto = {
	address: string;
	totalXp: number;
	verified: string[];
	ledger?: LedgerEvent[];
};

/** Персонаж Odyssey из макета (тот же ролик, что на квестах) — замена старого статичного `mascot.png`. */
function ProfileMascot() {
	return (
		<video
			className="size-[89px] shrink-0 rounded-[var(--radius-lg)] bg-[color:var(--odyssey-task-surface)] object-cover"
			autoPlay
			playsInline
			muted
			loop
			aria-label="Mascot"
		>
			<source src="/assets/bear.webm" type="video/webm" />
		</video>
	);
}

export default function ProfileDrawer({ open, onClose, address }: { open: boolean; onClose: () => void; address?: string }){
	const short = address ? `${address.slice(0,6)}…${address.slice(-4)}` : 'Not connected';
	const [profile, setProfile] = useState<ProfileDto | null>(null);

	useEffect(() => {
		if (!open || !address) { setProfile(null); return; }
		const ctrl = new AbortController();
		fetch(`/api/profile?address=${address}`, { signal: ctrl.signal })
			.then(r => r.json())
			.then(setProfile)
			.catch(() => setProfile(null));
		return () => ctrl.abort();
	}, [open, address]);

	const xp = profile?.totalXp ?? 0;

	return (
		<Modal open={open} onClose={onClose} title="Profile" subtitle={short} size="profile">
			<div className="grid gap-4">
				<div className="flex items-start gap-4">
					<ProfileMascot />
					<div className="min-w-0 pt-1">
						<div className="text-xs text-[color:var(--odyssey-task-muted)]">Address</div>
						<div className="mt-0.5 font-mono text-sm text-white/90">{short}</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--odyssey-task-surface)] p-3">
						<div className="text-xs text-[color:var(--odyssey-task-muted)]">Total XP</div>
						<div className="mt-0.5 text-lg font-semibold text-white">{xp} XP</div>
					</div>
					<div className="rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--odyssey-task-surface)] p-3">
						<div className="text-xs text-[color:var(--odyssey-task-muted)]">Verified tasks</div>
						<div className="mt-0.5 text-lg font-semibold text-white">{profile?.verified?.length ?? 0}</div>
					</div>
				</div>

				<div>
					<div className="mb-2 text-xs text-[color:var(--odyssey-task-muted)]">Recent activity</div>
					<div className="max-h-64 overflow-auto rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--odyssey-task-surface)] divide-y divide-white/10">
						{(profile?.ledger ?? []).slice(0, 20).map((ev, i) => (
							<div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-white/90">
								<span className="shrink-0 font-mono text-xs opacity-80">{new Date(ev.ts).toLocaleString()}</span>
								<span className="shrink-0 opacity-90">{ev.type.toUpperCase()}</span>
								<span className="min-w-0 truncate opacity-80">{ev.taskId}</span>
							</div>
						))}
						{(profile?.ledger ?? []).length === 0 && (
							<div className="px-3 py-8 text-center text-sm text-[color:var(--odyssey-task-muted)]">
								No activity yet
							</div>
						)}
					</div>
				</div>

				<div className="flex justify-center pt-1">
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-[23px] min-w-[66px] items-center justify-center rounded-full bg-[color:var(--odyssey-go)] px-4 text-xs font-medium text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
					>
						Close
					</button>
				</div>
			</div>
		</Modal>
	);
}
