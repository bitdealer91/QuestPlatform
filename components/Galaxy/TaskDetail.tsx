'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import TaskDetailHeader from './TaskDetailHeader';
import RewardSummary from './RewardSummary';
import TaskActions from './TaskActions';
import { verifyExternal } from '@/lib/verify';
import { toast } from '@/components/ui/Toast';
import Tooltip from '@/components/ui/Tooltip';
import SocialConnectPanel from '@/components/Galaxy/SocialConnectPanel';
import {
	type SocialAccounts,
	type SocialPlatform,
	isPlatformConnected,
	parseSocialAction,
	platformForAction,
	platformLabel,
} from '@/lib/social';
import { ODYSSEY_SOCIAL_OAUTH_EVENT } from '@/lib/socialOAuthClient';

export type TaskDetailProps = {
	task: {
		id: string;
		title: string;
		description?: string;
		type: 'action' | 'social' | 'info';
		href?: string;
		xp: number;
		week?: number;
		tags?: string[];
		brand?: string;
		logo?: string;
		brand_color?: string;
		logo_variant?: 'light'|'dark';
		category?: string;
		verify_method?: 'onchain' | 'api' | 'social';
		verify_params?: Record<string, unknown>;
	};
	walletAddress?: string;
	onVerified: (taskId: string) => void;
	alreadyVerified?: boolean;
};

export default function TaskDetail({ task, walletAddress, onVerified, alreadyVerified }: TaskDetailProps){
	const [status, setStatus] = useState<'idle'|'pending'|'verified'|'error'>(alreadyVerified ? 'verified' : 'idle');
	const [loading, setLoading] = useState(false);
	const [cooldownSec, setCooldownSec] = useState<number | null>(null);
	const forceVerify = (walletAddress || '').toLowerCase() === '0x938ed0c13ab2df31c89ee187ca8726cb12ae01b0' && task.id === 'quills-migrate';
	const liveRegionRef = useRef<HTMLDivElement | null>(null);
	const isSocial = task.type === 'social' || task.verify_method === 'social';
	const socialAction = parseSocialAction(task.verify_params);
	const requiredPlatform: SocialPlatform | undefined = socialAction
		? platformForAction(socialAction)
		: undefined;
	const [socialAccounts, setSocialAccounts] = useState<SocialAccounts>({});
	const [oauth, setOauth] = useState<{ twitter: boolean; discord: boolean }>({
		twitter: false,
		discord: false,
	});
	const [goClicked, setGoClicked] = useState(false);
	const hasGoLink = Boolean(String(task.href || '').trim());

	const socialReady =
		!isSocial ||
		(requiredPlatform != null &&
			oauth[requiredPlatform] &&
			isPlatformConnected(socialAccounts, requiredPlatform));

	const baseCanVerify =
		!!walletAddress && !loading && status !== 'verified' && (!alreadyVerified || forceVerify);
	const canVerify = baseCanVerify && socialReady;

	useEffect(() => {
		if (!walletAddress) {
			setSocialAccounts({});
			return;
		}
		const addr = walletAddress.toLowerCase();
		fetch(`/api/social/accounts?address=${addr}`, { cache: 'no-store' })
			.then((r) => r.json())
			.then((j) => setSocialAccounts((j?.accounts as SocialAccounts) || {}))
			.catch(() => setSocialAccounts({}));
	}, [walletAddress, task.id]);

	const reloadSocialAccounts = useCallback(() => {
		if (!walletAddress) {
			setSocialAccounts({});
			return;
		}
		const addr = walletAddress.toLowerCase();
		fetch(`/api/social/accounts?address=${addr}`, { cache: 'no-store' })
			.then((r) => r.json())
			.then((j) => setSocialAccounts((j?.accounts as SocialAccounts) || {}))
			.catch(() => setSocialAccounts({}));
	}, [walletAddress]);

	useEffect(() => {
		const onOAuthDone = (ev: Event) => {
			const payload = (ev as CustomEvent<{ ok?: boolean }>).detail;
			if (!payload?.ok) return;
			reloadSocialAccounts();
			let tries = 0;
			const id = setInterval(() => {
				tries += 1;
				reloadSocialAccounts();
				if (tries >= 8) clearInterval(id);
			}, 500);
		};
		window.addEventListener(ODYSSEY_SOCIAL_OAUTH_EVENT, onOAuthDone);
		return () => window.removeEventListener(ODYSSEY_SOCIAL_OAUTH_EVENT, onOAuthDone);
	}, [reloadSocialAccounts]);

	useEffect(() => {
		fetch('/api/social/config', { cache: 'no-store' })
			.then((r) => r.json())
			.then((j) => setOauth({ twitter: Boolean(j?.twitter), discord: Boolean(j?.discord) }))
			.catch(() => setOauth({ twitter: false, discord: false }));
	}, []);

	// Ensure per-task isolation: reset state when switching to another task
	useEffect(() => {
		setStatus(alreadyVerified ? 'verified' : 'idle');
		setCooldownSec(null);
		setLoading(false);
		setGoClicked(false);
	}, [task.id, alreadyVerified]);

	useEffect(() => {
		if (!liveRegionRef.current) return;
		const msg = status === 'pending' ? 'Verification in progress…' : status === 'verified' ? 'Verified. Reward granted.' : status === 'error' ? 'Couldn\'t verify yet. Complete the action and try again.' : '';
		if (msg) liveRegionRef.current.textContent = msg;
	}, [status]);

	const handleGoClick = useCallback(() => {
		setGoClicked(true);
	}, []);

	const verifyDisabledReason = useMemo(() => {
		if (!walletAddress) return 'Connect wallet to verify';
		if (isSocial && requiredPlatform) {
			if (!oauth[requiredPlatform]) {
				return `${platformLabel(requiredPlatform)} login is not configured on this environment`;
			}
			if (!isPlatformConnected(socialAccounts, requiredPlatform)) {
				return `Connect your ${platformLabel(requiredPlatform)} account first`;
			}
		}
		if (hasGoLink && !goClicked) return 'Press Go to open the task, then verify';
		return 'Verify unavailable';
	}, [walletAddress, isSocial, requiredPlatform, oauth, socialAccounts, hasGoLink, goClicked]);

	const handleVerify = useCallback(async () => {
		if (!canVerify || (hasGoLink && !goClicked)) return;
		if (status === 'error') { setStatus('idle'); }
		setCooldownSec(null);
		setStatus('pending');
		setLoading(true);
		try {
			const res = await verifyExternal(walletAddress!, task.id, undefined, status === 'error');
			if (res?.completed) {
				setStatus('verified');
				onVerified?.(task.id);
				try { (await import('canvas-confetti')).default({ particleCount: 40, spread: 48, startVelocity: 28, scalar: .6, origin: { y: .88, x: .85 } }); } catch {}
				toast.success('Verified ✅', `+${task.xp} XP`);
			} else if (res?.error === 'social_not_linked') {
				setStatus('error');
				toast.info(
					'Connect account',
					res.message || 'Link your X or Discord account first.',
				);
			} else if (res?.error) {
				setStatus('error');
				if (typeof res.retryAfter === 'number' && res.retryAfter > 0){
					setCooldownSec(res.retryAfter);
					const startedAt = Date.now();
					const duration = res.retryAfter * 1000;
					const tick = () => {
						const remain = Math.max(0, Math.ceil((duration - (Date.now() - startedAt)) / 1000));
						setCooldownSec(remain > 0 ? remain : null);
						if (remain > 0) requestAnimationFrame(tick);
					};
					requestAnimationFrame(tick);
				}
				toast.info(
					'Not verified yet',
					res.message || (res.retryAfter ? `Try again in ${res.retryAfter}s.` : 'Complete the action and try again.'),
				);
			} else {
				setStatus('error');
				toast.info('Not verified yet', 'Complete the action and try again.');
			}
		} catch {
			setStatus('error');
			toast.error('Verification failed', 'Please try again.');
		} finally { setLoading(false); }
	}, [canVerify, goClicked, hasGoLink, onVerified, task.id, task.xp, walletAddress, status]);

	const tips = useMemo(() => {
		if (isSocial) {
			return [
				'Press Go to open the task link.',
				'Connect the required X or Discord account.',
				'Complete the action on the platform, then use Verify.',
			];
		}
		return [
			'Press Go to open the task link first.',
			'Ensure you used the connected wallet.',
			'Wait ~10–30s after completing on-chain actions, then Verify.',
		];
	}, [isSocial]);

	return (
		<motion.section
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex h-full flex-col gap-4 rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--odyssey-task-surface)] p-5 shadow-elevated"
		>
			<TaskDetailHeader task={{
				id: task.id,
				title: task.title,
				description: task.description,
				type: task.type,
				href: task.href,
				xp: task.xp,
				tags: task.tags,
				brand: task.brand,
				logo: task.logo,
				brand_color: task.brand_color,
				logo_variant: task.logo_variant,
				category: task.category,
			}} />

			<RewardSummary xp={task.xp} status={status} odysseyStyle />

			{isSocial ? (
				<SocialConnectPanel
					address={walletAddress}
					accounts={socialAccounts}
					requiredPlatform={requiredPlatform}
					onUpdated={setSocialAccounts}
					compact
				/>
			) : null}

			{task.description && (
				<p className="max-w-[65ch] text-sm leading-relaxed text-[color:var(--odyssey-task-muted)]">
					{task.description}
				</p>
			)}

			<div className="mt-auto" />

			{status !== 'idle' && (
				<div
					className={`rounded-[var(--radius-lg)] border px-3 py-2 text-sm ${status === 'verified' ? 'border-[color:var(--odyssey-task-active)]/50 bg-[color:var(--odyssey-task-active)]/12 text-[color:var(--odyssey-task-active)]' : status === 'pending' ? 'border-white/10 bg-[color:var(--odyssey-task-surface)] text-[color:var(--odyssey-task-muted)]' : 'border-[color:var(--danger)]/40 bg-[color:var(--danger)]/12 text-[color:var(--danger)]'}`}
					role="status"
					aria-live="polite"
				>
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
				<TaskActions
					goHref={task.href}
					canVerify={canVerify}
					verifyDisabledReason={verifyDisabledReason}
					goClicked={goClicked}
					onGoClick={handleGoClick}
					loading={loading}
					onVerify={handleVerify}
					taskId={task.id}
					cooldownSec={cooldownSec ?? undefined as unknown as number | null}
					isVerified={status === 'verified' || (alreadyVerified && !forceVerify)}
					odysseyStyle
				/>
				<Tooltip content={<div className="max-w-[220px]">
					<div className="font-medium mb-1">Having trouble verifying?</div>
					<ul className="list-disc pl-4 space-y-0.5 text-xs text-[color:var(--muted)]">
						{tips.map((t, i) => <li key={i}>{t}</li>)}
					</ul>
				</div>}>
					<button
						type="button"
						className="text-xs text-white/90 underline decoration-dotted underline-offset-2 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
						aria-label="Help verifying"
					>
						Having trouble verifying?
					</button>
				</Tooltip>
			</div>
		</motion.section>
	);
}
