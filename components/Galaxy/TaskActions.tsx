'use client';
import Tooltip from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';

export type TaskActionsProps = {
	goHref?: string;
	canVerify: boolean;
	loading: boolean;
	onVerify: () => void;
	taskId?: string;
	cooldownSec?: number | null;
	isVerified?: boolean;
};

export default function TaskActions({ goHref, canVerify, loading, onVerify, taskId, cooldownSec, isVerified }: TaskActionsProps){
	const DEADLINE_ISO = '2025-12-01T15:00:00Z';
	const endedByTime = (() => {
		const d = new Date(DEADLINE_ISO);
		return !isNaN(d.getTime()) && Date.now() >= d.getTime();
	})();
	const ended = process.env.NEXT_PUBLIC_FORCE_ENDED === '1' || endedByTime;
	const label = typeof cooldownSec === 'number' && cooldownSec > 0
		? `Verify in ${cooldownSec}s`
		: 'Verify';

	return (
		<div className="flex flex-wrap items-center gap-2">
			{goHref ? (
				ended ? (
					<Tooltip content={<span aria-label="Ended">Ended</span>}>
						<span>
							<Button variant="primary" disabled aria-label="Go ended">Go</Button>
						</span>
					</Tooltip>
				) : (
					<a href={goHref} target="_blank" rel="noopener noreferrer" aria-label="Go" onClick={() => {
						try { window.dispatchEvent(new CustomEvent('analytics:event', { detail: { name: 'task_go_click', taskId, href: goHref } })); } catch {}
					}}>
						<Button variant="primary">Go</Button>
					</a>
				)
			) : null}
			{ended ? (
				<Tooltip content={<span aria-label="Ended">Ended</span>}>
					<span>
						<Button variant="glass" disabled aria-label="Verify ended">{isVerified ? 'Verified' : 'Verify'}</Button>
					</span>
				</Tooltip>
			) : (
				canVerify ? (
					<Button variant="glass" onClick={onVerify} loading={loading} aria-label="Verify" disabled={typeof cooldownSec === 'number' && cooldownSec > 0}>{label}</Button>
				) : (
					isVerified ? (
						<span>
							<Button variant="glass" disabled aria-label="Task already verified">Verified</Button>
						</span>
					) : (
						<Tooltip content={<span aria-label="Connect wallet to verify">Connect wallet to verify</span>}>
							<span>
								<Button variant="glass" disabled aria-label="Verify disabled">Verify</Button>
							</span>
						</Tooltip>
					)
				)
			)}
		</div>
	);
}


