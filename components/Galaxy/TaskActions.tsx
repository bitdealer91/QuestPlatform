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
	const label = typeof cooldownSec === 'number' && cooldownSec > 0
		? `Verify in ${cooldownSec}s`
		: 'Verify';

	return (
		<div className="flex flex-wrap items-center gap-2">
			{goHref ? (
				<a href={goHref} target="_blank" rel="noopener noreferrer" aria-label="Go" onClick={() => {
					try { window.dispatchEvent(new CustomEvent('analytics:event', { detail: { name: 'task_go_click', taskId, href: goHref } })); } catch {}
				}}>
					<Button variant="primary">Go</Button>
				</a>
			) : null}
			{canVerify ? (
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
			)}
		</div>
	);
}


