'use client';
import Modal from '@/components/ui/Modal';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type LedgerEvent = { ts: number; type: 'attempt'|'success'|'failure'; taskId: string; detail?: string };

type ProfileDto = {
  address: string;
  totalXp: number;
  verified: string[];
  ledger?: LedgerEvent[];
};

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
		<Modal open={open} onClose={onClose} title="Profile" subtitle={short} size="lg">
			<div className="grid gap-4">
				<div className="flex items-center gap-3">
					<Image src="/assets/mascot.png" alt="Mascot" width={56} height={56} className="rounded-xl" />
					<div>
						<div className="text-sm text-[color:var(--muted)]">Address</div>
						<div className="text-sm font-mono opacity-80">{short}</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]">
						<div className="text-sm text-[color:var(--muted)]">Total XP</div>
						<div className="text-lg font-semibold">{xp} XP</div>
					</div>
					<div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]">
						<div className="text-sm text-[color:var(--muted)]">Verified tasks</div>
						<div className="text-lg font-semibold">{profile?.verified?.length ?? 0}</div>
					</div>
				</div>

				<div>
					<div className="text-sm text-[color:var(--muted)] mb-2">Recent activity</div>
					<div className="max-h-64 overflow-auto rounded-xl border border-[color:var(--outline)] divide-y divide-white/10 bg-black/20">
						{(profile?.ledger ?? []).slice(0, 20).map((ev, i) => (
							<div key={i} className="px-3 py-2 text-sm flex items-center justify-between">
								<span className="font-mono opacity-80">{new Date(ev.ts).toLocaleString()}</span>
								<span className="opacity-90">{ev.type.toUpperCase()}</span>
								<span className="opacity-80">{ev.taskId}</span>
							</div>
						))}
						{(profile?.ledger ?? []).length === 0 && (
							<div className="px-3 py-6 text-sm text-[color:var(--muted)] text-center">No activity yet</div>
						)}
					</div>
				</div>

				<div className="flex justify-end">
					<button onClick={onClose} className="px-4 py-2 rounded-xl bg-[color:var(--primary)] text-black">Close</button>
				</div>
			</div>
		</Modal>
	);
}


