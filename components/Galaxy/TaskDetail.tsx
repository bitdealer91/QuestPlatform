'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import TaskDetailHeader from './TaskDetailHeader';
import RewardSummary from './RewardSummary';
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
		week?: number;
		tags?: string[];
		brand?: string;
		logo?: string;
		brand_color?: string;
		logo_variant?: 'light'|'dark';
		category?: string;
	};
	walletAddress?: string;
	onVerified: (taskId: string) => void;
	alreadyVerified?: boolean;
};

export default function TaskDetail({ task, walletAddress, onVerified, alreadyVerified }: TaskDetailProps){
	const [status, setStatus] = useState<'idle'|'pending'|'verified'|'error'>(alreadyVerified ? 'verified' : 'idle');
	const [loading, setLoading] = useState(false);
	const [cooldownSec, setCooldownSec] = useState<number | null>(null);
	const canVerify = !!walletAddress && !loading && status !== 'verified' && !alreadyVerified;
	const liveRegionRef = useRef<HTMLDivElement | null>(null);

	// Ensure per-task isolation: reset state when switching to another task
	useEffect(() => {
		setStatus(alreadyVerified ? 'verified' : 'idle');
		setCooldownSec(null);
		setLoading(false);
	}, [task.id, alreadyVerified]);

	useEffect(() => {
		if (!liveRegionRef.current) return;
		const msg = status === 'pending' ? 'Verification in progress…' : status === 'verified' ? 'Verified. Reward granted.' : status === 'error' ? 'Couldn\'t verify yet. Complete the action and try again.' : '';
		if (msg) liveRegionRef.current.textContent = msg;
	}, [status]);

	const handleVerify = useCallback(async () => {
		if (!canVerify) return;
		if (status === 'error') { setStatus('idle'); }
		setCooldownSec(null);
		setStatus('pending');
		setLoading(true);
		try {
			const res = await verifyExternal(walletAddress!, task.id, undefined, status === 'error');
			if (res?.completed) {
				setStatus('verified');
				onVerified?.(task.id);
				// Если у таска есть звезда, запускаем эффект полёта звезды к планете недели
				if (task.star) {
					try {
						const btn = document.querySelector('[aria-label="Verify"]') as HTMLElement | null;
						const anchor = document.querySelector(`[data-week-anchor="${task.week ?? 1}"]`) as HTMLElement | null; // target planet by week
						if (btn && anchor) {
							const b = btn.getBoundingClientRect();
							const a = anchor.getBoundingClientRect();
							const dot = document.createElement('div');
							dot.style.position = 'fixed';
							dot.style.left = `${b.left + b.width / 2}px`;
							dot.style.top = `${b.top + b.height / 2}px`;
							dot.style.width = '10px';
							dot.style.height = '10px';
							dot.style.borderRadius = '9999px';
							dot.style.background = 'gold';
							dot.style.boxShadow = '0 0 12px 4px rgba(255,215,0,.7)';
							dot.style.zIndex = '2147483646';
							document.body.appendChild(dot);
							const anim = dot.animate([
								{ transform: 'translate(0,0)', offset: 0 },
								{ transform: `translate(${a.left + a.width/2 - (b.left + b.width/2)}px, ${a.top + a.height/2 - (b.top + b.height/2)}px)` , offset: 1 }
							], { duration: 900, easing: 'cubic-bezier(.22,.61,.36,1)' });
							anim.onfinish = () => dot.remove();
						}
					} catch {}
				}
				try { (await import('canvas-confetti')).default({ particleCount: 40, spread: 48, startVelocity: 28, scalar: .6, origin: { y: .88, x: .85 } }); } catch {}
				toast.success('Verified ✅', `+${task.xp} XP${task.star ? ' · Core Star' : ''}`);
			} else if (res?.error) {
				setStatus('error');
				if (typeof res.retryAfter === 'number' && res.retryAfter > 0){
					setCooldownSec(res.retryAfter);
					// простой таймер обратного отсчёта
					const startedAt = Date.now();
					const duration = res.retryAfter * 1000;
					const tick = () => {
						const remain = Math.max(0, Math.ceil((duration - (Date.now() - startedAt)) / 1000));
						setCooldownSec(remain > 0 ? remain : null);
						if (remain > 0) requestAnimationFrame(tick);
					};
					requestAnimationFrame(tick);
				}
				toast.info('Not verified yet', res.retryAfter ? `Try again in ${res.retryAfter}s.` : 'Complete the action and try again.');
			} else {
				setStatus('error');
				toast.info('Not verified yet', 'Complete the action and try again.');
			}
		} catch {
			setStatus('error');
			toast.error('Verification failed', 'Please try again.');
		} finally { setLoading(false); }
	}, [canVerify, onVerified, task.id, task.star, task.xp, walletAddress, status]);

	const tips = useMemo(() => [
		'Ensure you used the connected wallet.',
		'Wait ~10–30s after completing on-chain actions.',
		'Refresh and try Verify again.',
	], []);

	return (
		<motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[color:var(--outline)] bg-[color:var(--card-elev)] shadow-elevated p-5">
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

			<div className="mt-auto" />

			{status !== 'idle' && (
				<div className={`rounded-[var(--radius)] border px-3 py-2 text-sm ${status === 'verified' ? 'bg-[color:var(--ok)]/14 border-[color:var(--outline)]' : status === 'pending' ? 'bg-[color:var(--accent)]/14 border-[color:var(--outline)]' : 'bg-[color:var(--danger)]/16 border-[color:var(--outline)]'}`} role="status" aria-live="polite">
					{status === 'pending' && 'Verification in progress…'}
					{status === 'verified' && 'Verified. Reward granted.'}
					{status === 'error' && (
						<div className="flex items-center justify-between">
							<span>Couldn&apos;t verify yet. Complete the action and try again.</span>
						</div>
					)}
				</div>
			)}

			<div ref={liveRegionRef} className="sr-only" aria-live="polite" />

			<div className="flex items-center justify-between gap-3 sticky bottom-[max(env(safe-area-inset-bottom),12px)] lg:static bg-transparent">
				<TaskActions goHref={task.href} canVerify={!!walletAddress && status !== 'verified'} loading={loading} onVerify={handleVerify} taskId={task.id} cooldownSec={cooldownSec ?? undefined as unknown as number | null} isVerified={status === 'verified' || alreadyVerified} />
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
