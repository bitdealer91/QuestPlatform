'use client';
import Drawer from '@/components/ui/Drawer';
import { useEffect, useMemo, useState } from 'react';
import { getJson } from '@/lib/api';
import { TasksSchema, Task as TTask } from '@/lib/tasks';
import Progress from '@/components/ui/Progress';
import Badge from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import TaskDetail from '@/components/Galaxy/TaskDetail';
import { useAccount } from 'wagmi';

export default function TaskDrawer({ weekId, onClose }: { weekId: number | null; onClose: () => void }){
	const open = weekId != null;
	const title = open ? `Week ${weekId} · Tasks` : undefined;
	const [tasks, setTasks] = useState<TTask[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const active = useMemo(() => tasks?.find(t => t.id === activeId) || tasks?.[0] || null, [tasks, activeId]);
    const { address } = useAccount();
    const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		setActiveId(null);
	}, [weekId]);

	useEffect(() => {
		if (!open) return;
		setLoading(true);
		setError(null);
		setTasks(null);
		getJson(`/api/week/${weekId}/tasks`, TasksSchema)
			.then((data) => {
				const stored = address ? JSON.parse(localStorage.getItem(`somnia:verified:${address.toLowerCase()}`) || '[]') as string[] : [];
				setVerifiedIds(new Set(stored));
				const withStatus = data.map(t => stored.includes(t.id) ? { ...t, status: 'done' as const } : t);
				setTasks(withStatus);
				const first = withStatus[0]; if (first) setActiveId(first.id);
			})
			.catch((e) => setError(e?.message || 'Failed to load tasks'))
			.finally(() => setLoading(false));
	}, [open, weekId, address]);

	const handleVerified = (taskId: string) => {
		setTasks(prev => prev?.map(t => t.id === taskId ? { ...t, status: 'done' as const } : t) || prev);
		setVerifiedIds(prev => {
			const next = new Set(prev); next.add(taskId);
			if (address) localStorage.setItem(`somnia:verified:${address.toLowerCase()}`, JSON.stringify(Array.from(next)));
			return next;
		});
		toast.success('Verified ✅', 'Reward granted.');
	};

	return (
		<>
			<Drawer open={open} onClose={onClose} size="xl" title={title} headerAdornment={<div className="min-w-[260px]"><Progress value={tasks ? Math.round((tasks.filter(t=>t.status==='done').length/(tasks.length||1))*100) : 0} label="Progress" /></div>}>
				<div className="flex h-full">
					<aside className="w-[38%] shrink-0 border-r border-[color:var(--outline)] overflow-y-auto" role="listbox" aria-label="Task list">
						<div className="p-3">
							{loading && <div className="text-sm text-[color:var(--muted)]">Loading tasks…</div>}
							{error && <div className="text-sm text-[color:var(--danger)]">{error}</div>}
							{!loading && !error && tasks?.map((t) => {
								const isActive = active?.id === t.id;
								return (
									<button key={t.id} role="option" aria-selected={isActive}
										onClick={() => setActiveId(t.id)}
										className={`w-full text-left rounded-[var(--radius)] border border-[color:var(--outline)] bg-[color:var(--card)]/70 backdrop-blur hover:bg-white/5 transition-colors mb-2 px-3 py-3 ${isActive ? 'ring-1 ring-[color:var(--ring)]' : ''}`}
									>
										<div className="flex items-center justify-between">
											<div className="font-medium truncate">{t.title}</div>
											<span className={`text-xs rounded px-2 py-0.5 border ${t.status==='done' ? 'border-[color:var(--ok)] text-[color:var(--ok)]' : t.status==='pending' ? 'border-[color:var(--warn)] text-[color:var(--warn)]' : 'border-[color:var(--outline)] text-[color:var(--muted)]'}`}>{t.status === 'done' ? 'Verified' : t.status === 'pending' ? 'Pending' : 'To do'}</span>
										</div>
										<div className="mt-2 flex items-center gap-2 text-xs">
											<Badge variant="outline">+{t.reward.xp} XP</Badge>
											{t.reward.star && <Badge variant="primary">+★ Star</Badge>}
										</div>
									</button>
								);
							})}
						</div>
					</aside>
					<section className="w-[62%] overflow-y-auto px-5 py-5">
						{!active && <div className="text-sm text-[color:var(--muted)]">Choose a task from the list to see details.</div>}
						{active && (
							<TaskDetail
								task={{
									id: active.id,
									title: active.title,
									description: active.desc,
									type: active.type,
									href: active.href,
									xp: active.reward.xp,
									star: active.reward.star,
								}}
								walletAddress={address || undefined}
								currentWeek={weekId || 0}
								onVerified={handleVerified}
							/>
						)}
					</section>
				</div>
			</Drawer>
		</>
	);
}
