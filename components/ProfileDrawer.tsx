'use client';
import Modal from '@/components/ui/Modal';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getUserStats, resetUserProgress } from '@/lib/progress';

export default function ProfileDrawer({ open, onClose, address }: { open: boolean; onClose: () => void; address?: string }){
	const short = address ? `${address.slice(0,6)}…${address.slice(-4)}` : 'Not connected';
	const [stats, setStats] = useState<ReturnType<typeof getUserStats> | null>(null);
	
	// Загружаем статистику при открытии профиля
	useEffect(() => {
		if (open && address) {
			const userStats = getUserStats(address);
			setStats(userStats);
		}
	}, [open, address]);
	
	// Значения по умолчанию
	const level = stats?.level || 1;
	const xp = stats?.xp || 0;
	const nextLevelXP = stats?.nextLevelXP || 100;
	const levelProgress = stats?.levelProgress || 0;
	const completedQuests = stats?.completedQuests || 0;
	
	return (
		<Modal open={open} onClose={onClose} title="Profile" subtitle={short} size="lg">
			<div className="grid gap-4">
				<div className="flex items-center gap-3">
					<Image src="/assets/mascot.png" alt="Mascot" width={56} height={56} className="rounded-xl" />
					<div>
						<div className="text-sm text-[color:var(--muted)]">Level</div>
						<div className="text-xl font-semibold">{level}</div>
					</div>
				</div>
				<div>
					<div className="flex justify-between text-sm mb-2">
						<span>XP</span>
						<span>{xp} / {nextLevelXP}</span>
					</div>
					<div className="h-2 rounded bg-white/10 overflow-hidden">
						<div 
							className="h-full bg-[color:var(--primary)]" 
							style={{ width: `${levelProgress}%` }} 
						/>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]">
						<div className="text-sm text-[color:var(--muted)]">Completed quests</div>
						<div className="text-lg font-semibold">{completedQuests}</div>
					</div>
					<div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]">
						<div className="text-sm text-[color:var(--muted)]">Total XP</div>
						<div className="text-lg font-semibold">{xp} XP</div>
					</div>
				</div>
				<div className="flex items-center justify-between gap-3">
					<div className="text-sm text-[color:var(--muted)]">Next level</div>
					<div className="text-xl font-semibold">
						{nextLevelXP - xp} XP needed
					</div>
				</div>
				<div className="flex justify-between items-center">
					{address && (
						<button 
							onClick={() => {
								if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
									resetUserProgress(address);
									setStats(null);
									alert('Progress reset! Please refresh the page to see changes.');
								}
							}} 
							className="px-3 py-2 rounded-xl bg-[color:var(--danger)] text-white text-sm hover:opacity-90"
						>
							Reset Progress
						</button>
					)}
					<button onClick={onClose} className="px-4 py-2 rounded-xl bg-[color:var(--primary)] text-black">
						Close
					</button>
				</div>
			</div>
		</Modal>
	);
}


