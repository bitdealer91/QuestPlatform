'use client';
import clsx from 'clsx';
import Tooltip from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

export type TaskActionsProps = {
	goHref?: string;
	canVerify: boolean;
	loading: boolean;
	onVerify: () => void;
	taskId?: string;
	cooldownSec?: number | null;
	isVerified?: boolean;
	/** Кнопки Go / Verify как в Figma `130:155` (23px, #78a3c8). */
	odysseyStyle?: boolean;
};

const odysseyPill = 'h-[23px] min-h-[23px] rounded-[20px] text-[12px] font-normal tracking-[-0.276px] inline-flex items-center justify-center transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed';

export default function TaskActions({
	goHref,
	canVerify,
	loading,
	onVerify,
	taskId,
	cooldownSec,
	isVerified,
	odysseyStyle = false,
}: TaskActionsProps) {
	const DEADLINE_ISO = '2025-12-01T15:00:00Z';
	const endedByTime = (() => {
		const d = new Date(DEADLINE_ISO);
		return !isNaN(d.getTime()) && Date.now() >= d.getTime();
	})();
	const ended = process.env.NEXT_PUBLIC_FORCE_ENDED === '1' || endedByTime;
	const label = typeof cooldownSec === 'number' && cooldownSec > 0
		? `Verify in ${cooldownSec}s`
		: 'Verify';

	if (odysseyStyle) {
		const goClass = clsx(odysseyPill, 'min-w-[38px] bg-[color:var(--odyssey-go)] text-black px-2');
		const verifyOutline = clsx(odysseyPill, 'min-w-[70px] border-[0.3px] border-white bg-transparent text-white px-3');
		const verifiedOutline = clsx(
			odysseyPill,
			'min-w-[70px] border-[0.3px] border-[color:var(--odyssey-task-active)] bg-transparent text-[color:var(--odyssey-task-active)] px-3',
		);
		return (
			<div className="flex flex-wrap items-center gap-2">
				{goHref ? (
					ended ? (
						<Tooltip content={<span aria-label="Ended">Ended</span>}>
							<button type="button" disabled className={goClass} aria-label="Go ended">
								Go
							</button>
						</Tooltip>
					) : (
						<a
							href={goHref}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Go"
							className={goClass}
							onClick={() => {
								try {
									window.dispatchEvent(new CustomEvent('analytics:event', { detail: { name: 'task_go_click', taskId, href: goHref } }));
								} catch {}
							}}
						>
							Go
						</a>
					)
				) : null}
				{ended ? (
					<Tooltip content={<span aria-label="Ended">Ended</span>}>
						<button type="button" disabled className={isVerified ? verifiedOutline : verifyOutline} aria-label="Verify ended">
							{isVerified ? 'Verified' : 'Verify'}
						</button>
					</Tooltip>
				) : canVerify ? (
					<button
						type="button"
						onClick={onVerify}
						disabled={loading || (typeof cooldownSec === 'number' && cooldownSec > 0)}
						className={verifyOutline}
						aria-label="Verify"
					>
						{loading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
						{label}
					</button>
				) : isVerified ? (
					<button type="button" disabled className={verifiedOutline} aria-label="Task already verified">
						Verified
					</button>
				) : (
					<Tooltip content={<span aria-label="Connect wallet to verify">Connect wallet to verify</span>}>
						<button type="button" disabled className={verifyOutline} aria-label="Verify disabled">
							Verify
						</button>
					</Tooltip>
				)}
			</div>
		);
	}

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


