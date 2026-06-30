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
import { addVerifiedTask } from '@/lib/progress';

export default function TaskDrawer({ weekId, onClose }: { weekId: number | null; onClose: () => void }){
	const open = weekId != null;
	const title = open ? `Week ${weekId} - Tasks` : undefined;
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

	useEffect(() => {
		if (!open || !address) return;
		const addr = address.toLowerCase();
		(async () => {
			try {
				const res = await fetch(`/api/profile?address=${addr}`, { cache: 'no-store' });
				if (!res.ok) return;
				const json = await res.json().catch(() => null) as { verified?: unknown } | null;
				const serverVerified = Array.isArray(json?.verified) ? (json!.verified as unknown[]).map(String) : [];
				setVerifiedIds(new Set(serverVerified));
				localStorage.setItem(`somnia:verified:${addr}`, JSON.stringify(serverVerified));
				setTasks(prev => prev?.map(t => serverVerified.includes(t.id) ? { ...t, status: 'done' as const } : t) || prev);
			} catch {
				/* noop */
			}
		})();
	}, [open, address]);

	const handleVerified = (taskId: string) => {
		setTasks(prev => prev?.map(t => t.id === taskId ? { ...t, status: 'done' as const } : t) || prev);
		setVerifiedIds(prev => {
			const next = new Set(prev); next.add(taskId);
			if (address) localStorage.setItem(`somnia:verified:${address.toLowerCase()}`, JSON.stringify(Array.from(next)));
			return next;
		});
		if (address) {
			const newProgress = addVerifiedTask(address, taskId);
			window.dispatchEvent(new CustomEvent('galaxy:progress-updated', { detail: { address, verifiedIds: Array.from(newProgress.verifiedTasks || new Set<string>()) } }));
		}
		toast.success('Verified', 'Task completed.');
	};

	return (
		<>
			<Drawer
				open={open}
				onClose={onClose}
				size="xl"
				panel="black"
				tone="odyssey"
				title={title}
				headerAdornment={
					<div className="min-w-0 md:min-w-[260px]">
						<Progress
							value={tasks ? Math.round((tasks.filter(t => t.status === 'done').length / (tasks.length || 1)) * 100) : 0}
							label="Progress"
							variant="odyssey"
						/>
					</div>
				}
			>
				<div className="flex min-h-0 flex-1 flex-col md:flex-row">
					<aside
						className="max-h-[38vh] w-full shrink-0 overflow-y-auto border-b border-white/10 md:max-h-none md:w-[38%] md:border-b-0 md:border-r"
						role="listbox"
						aria-label="Task list"
					>
						<div className="p-3">
							{loading && (
								<div className="space-y-3">
									<div className="text-center text-sm text-[color:var(--odyssey-task-muted)]">Loading tasks...</div>
									{[1, 2, 3].map(i => (
										<div key={i} className="animate-pulse">
											<div className="h-16 rounded-[var(--radius)] border border-white/10 bg-[color:var(--odyssey-task-surface)] p-3">
												<div className="mb-2 h-4 w-3/4 rounded bg-white/10" />
												<div className="h-3 w-1/2 rounded bg-white/10" />
											</div>
										</div>
									))}
								</div>
							)}
							{error && <div className="text-sm text-[color:var(--danger)]">{error}</div>}
							{!loading && !error && tasks?.map((t) => {
								const isActive = active?.id === t.id;
								return (
									<button
										key={t.id}
										type="button"
										role="option"
										aria-selected={isActive}
										onClick={() => setActiveId(t.id)}
										className={`mb-2 w-full rounded-[var(--radius-lg)] border bg-[color:var(--odyssey-task-surface)] px-3 py-3 text-left transition-colors hover:bg-white/[0.06] ${isActive ? 'border-[color:var(--odyssey-task-active)] ring-1 ring-[color:var(--odyssey-task-active)]' : 'border-white/10'} `}
									>
										<div className="flex items-center justify-between gap-2">
											<div className={`truncate font-medium ${isActive ? 'text-[color:var(--odyssey-task-active)]' : t.mandatory ? 'text-[color:var(--odyssey-task-active)]' : 'text-white'}`}>
												{t.title}
											</div>
											{t.status === 'done' && (
												<span className="shrink-0 rounded-full border border-[color:var(--odyssey-task-active)] px-2 py-0.5 text-xs text-[color:var(--odyssey-task-active)]">
													Verified
												</span>
											)}
										</div>
										<div className="mt-2 flex items-center gap-2 text-xs">
											{t.type === 'social' && (
												<Badge className="border-[#78a3c8]/50 bg-transparent text-[#78a3c8]" variant="outline">Social</Badge>
											)}
										</div>
									</button>
								);
							})}
						</div>
					</aside>
					<section className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
						{!active && <div className="text-sm text-[color:var(--odyssey-task-muted)]">Choose a task from the list to see details.</div>}
						{active && (
							<TaskDetail
								task={{
									id: active.id,
									title: active.title,
									description: active.desc,
									type: active.type,
									href: active.href,
									verify_method: active.verify_method,
									verify_params: active.verify_params,
									week: weekId || undefined,
									brand: active.brand,
									logo: active.logo,
									brand_color: active.brand_color,
									logo_variant: active.logo_variant,
									tags: active.tags,
									category: active.category,
								}}
								walletAddress={address || undefined}
								onVerified={handleVerified}
								alreadyVerified={active.status === 'done'}
							/>
						)}
					</section>
				</div>
			</Drawer>
		</>
	);
}
