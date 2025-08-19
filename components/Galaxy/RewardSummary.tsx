'use client';
import Progress from '@/components/ui/Progress';

export type RewardSummaryProps = {
	xp: number;
	star?: boolean;
};

export default function RewardSummary({ xp, star }: RewardSummaryProps){
	return (
		<div className="rounded-[var(--radius-lg)] border border-[color:var(--outline)] bg-[color:var(--card)] p-3">
			<div className="flex items-center justify-between text-sm">
				<span className="text-[color:var(--muted)]">Reward</span>
				<span className="font-medium">+{xp} XP{star ? ' · Core Star' : ''}</span>
			</div>
			<Progress value={0} />
		</div>
	);
}



