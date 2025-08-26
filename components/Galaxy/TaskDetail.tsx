'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import TaskDetailHeader from './TaskDetailHeader';
import RewardSummary from './RewardSummary';
import Checklist from './Checklist';
import TaskActions from './TaskActions';
import { verifyExternal } from '@/lib/verify';
import { toast } from '@/components/ui/Toast';
import Tooltip from '@/components/ui/Tooltip';

export type TaskDetailProps = {
	task: {
		id: string;
		title: string;
		description?: string;
		type: 'action' | 'social' | 'info';
		href?: string;
		xp: number;
		star?: boolean;
		tags?: string[];
		brand?: string;
		logo?: string;
		brand_color?: string;
		logo_variant?: 'light'|'dark';
		category?: string;
		verify_api?: {
			url: string;
			method: 'GET'|'POST';
			headers?: Record<string,string>;
			body?: Record<string, any>;
			success: { path: string; equals: any };
		};
	};
	walletAddress?: string;
	currentWeek: number;
	onVerified: (taskId: string) => void;
};

export default function TaskDetail({ task, walletAddress, currentWeek, onVerified }: TaskDetailProps){
	const [status, setStatus] = useState<'idle'|'pending'|'verified'|'error'>('idle');
	const [loading, setLoading] = useState(false);
	const [lastError, setLastError] = useState<string | null>(null);
	const canVerify = !!walletAddress && !loading && status !== 'verified';
	const liveRegionRef = useRef<HTMLDivElement | null>(null);

	// Проверяем, был ли таск уже верифицирован
	useEffect(() => {
		if (walletAddress && task?.id) {
			// Проверяем localStorage на наличие верифицированного таска
			const verifiedTasks = JSON.parse(localStorage.getItem(`somnia:verified:${walletAddress.toLowerCase()}`) || '[]') as string[];
			if (verifiedTasks.includes(task.id)) {
				setStatus('verified');
			} else {
				setStatus('idle');
				setLastError(null);
			}
		}
	}, [task?.id, walletAddress]);

	useEffect(() => {
		if (!liveRegionRef.current) return;
		const msg = status === 'pending' ? 'Verification in progress…' : status === 'verified' ? 'Verified. Reward granted.' : status === 'error' ? 'Couldn\'t verify yet. Complete the action and try again.' : '';
		if (msg) liveRegionRef.current.textContent = msg;
	}, [status]);

	const handleVerify = useCallback(async () => {
		if (!canVerify) return;
		
		// Сбрасываем статус error при повторной попытке
		if (status === 'error') {
			setStatus('idle');
			setLastError(null);
		}
		
		setStatus('pending');
		setLoading(true); 
		
		try {
			// При повторной попытке после ошибки принудительно обновляем
			const force = status === 'error';
			const res = await verifyExternal(walletAddress!, task.id, undefined, force);
			if (res?.completed) {
				setStatus('verified');
				onVerified?.(task.id);
				try { (await import('canvas-confetti')).default({ particleCount: 40, spread: 48, startVelocity: 28, scalar: .6, origin: { y: .88, x: .85 } }); } catch {}
				toast.success('Verified ✅', `+${task.xp} XP${task.star ? ' · Core Star' : ''}`);
			} else {
				setStatus('error');
				toast.info('Not verified yet', 'Complete the action and try again.');
			}
		} catch (e: any) {
			setStatus('error');
			setLastError(e?.message || 'Verification failed');
			toast.error('Verification failed', 'Please try again.');
		} finally { setLoading(false); }
	}, [canVerify, onVerified, task.id, task.star, task.xp, walletAddress, status]);

	const tips = useMemo(() => [
		'Ensure you used the connected wallet.',
		'Wait ~10–30s after completing on-chain actions.',
		'Refresh and try Verify again.',
	], []);

	return (
		<motion.section
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			className="h-full flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[color:var(--outline)] bg-[color:var(--card-elev)] shadow-elevated p-5"
		>
			<TaskDetailHeader task={{
				id: task.id,
				title: task.title,
				description: task.description,
				type: task.type,
				href: task.href,
				xp: task.xp,
				star: task.star,
				tags: task.tags,
				brand: task.brand,
				logo: task.logo,
				brand_color: task.brand_color,
				logo_variant: task.logo_variant,
				category: task.category,
			}} />

			<RewardSummary xp={task.xp} star={task.star} status={status} />

			{task.description && (
				<p className="text-sm text-[color:var(--muted)] leading-relaxed max-w-[65ch]">
					{task.description}
				</p>
			)}

			{/* Теги задачи */}
			{task.tags && task.tags.length > 0 && (
				<div className="flex items-center gap-2 flex-wrap">
					{task.tags.map((tag) => (
						<span
							key={tag}
							className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[color:var(--accent)]/10 text-[color:var(--accent)] border border-[color:var(--accent)]/20"
						>
							{tag}
						</span>
					))}
				</div>
			)}

			{/* Optional checklist placeholder; hook up when steps exist on task */}
			{/* <Checklist items={["Open Somnia DEX","Make a swap","Wait for confirmation"]} /> */}

			<div className="mt-auto" />

			{/* Status banner */}
			{status !== 'idle' && (
				<div
					className={
						`rounded-[var(--radius)] border px-3 py-2 text-sm ${status === 'verified' ? 'bg-[color:var(--ok)]/14 border-[color:var(--outline)]' : status === 'pending' ? 'bg-[color:var(--accent)]/14 border-[color:var(--outline)]' : 'bg-[color:var(--danger)]/16 border-[color:var(--outline)]'}`
					}
					role="status"
					aria-live="polite"
				>
					{status === 'pending' && 'Verification in progress…'}
					{status === 'verified' && 'Verified. Reward granted.'}
					{status === 'error' && (
						<div className="flex items-center justify-between">
							<span>Couldn't verify yet. Complete the action and try again.</span>
							{walletAddress && (
								<button
									onClick={() => {
										setStatus('idle');
										setLastError(null);
									}}
									className="text-xs bg-[color:var(--accent)] text-white px-3 py-1.5 rounded-md hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] transition-opacity"
								>
									🔄 Try Again
								</button>
							)}
						</div>
					)}
				</div>
			)}

			<div ref={liveRegionRef} className="sr-only" aria-live="polite" />

			<div className="flex items-center justify-between gap-3 sticky bottom-[max(env(safe-area-inset-bottom),12px)] lg:static bg-transparent">
				<TaskActions goHref={task.href} canVerify={!!walletAddress && status !== 'verified'} loading={loading} onVerify={handleVerify} taskId={task.id} />
				<Tooltip content={<div className="max-w-[220px]">
					<div className="font-medium mb-1">Having trouble verifying?</div>
					<ul className="list-disc pl-4 space-y-0.5 text-xs text-[color:var(--muted)]">
						{tips.map((t, i) => <li key={i}>{t}</li>)}
					</ul>
				</div>}>
					<button className="text-xs underline decoration-dotted hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" aria-label="Help verifying">Having trouble verifying?</button>
				</Tooltip>
			</div>
		</motion.section>
	);
}
