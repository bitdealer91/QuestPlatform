'use client';
import Progress from '@/components/ui/Progress';

export type RewardSummaryProps = {
	xp: number;
	star?: boolean;
	status?: 'idle' | 'pending' | 'verified' | 'error';
	/** Стили карточки награды как в Figma `136:1451`. */
	odysseyStyle?: boolean;
};

export default function RewardSummary({ xp, star, status = 'idle', odysseyStyle = false }: RewardSummaryProps) {
	// Вычисляем прогресс на основе статуса
	const getProgressValue = () => {
		switch (status) {
			case 'verified':
				return 100; // Таск выполнен
			case 'pending':
				return 50; // В процессе верификации
			case 'error':
				return 25; // Ошибка верификации
			default:
				return 0; // Не начат
		}
	};

	// Получаем текст статуса
	const getStatusText = () => {
		switch (status) {
			case 'verified':
				return 'Completed';
			case 'pending':
				return 'Verifying...';
			case 'error':
				return 'Failed';
			default:
				return 'Not started';
		}
	};

	// Получаем цвет статуса
	const getStatusColor = () => {
		switch (status) {
			case 'verified':
				return 'text-[color:var(--ok)]';
			case 'pending':
				return 'text-[color:var(--accent)]';
			case 'error':
				return 'text-[color:var(--danger)]';
			default:
				return 'text-[color:var(--muted)]';
		}
	};

	const shell = odysseyStyle
		? 'rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--odyssey-task-surface)] p-3'
		: 'rounded-[var(--radius-lg)] border border-[color:var(--outline)] bg-[color:var(--card)] p-3';

	return (
		<div className={shell}>
			<div className={`flex items-center justify-between mb-2 ${odysseyStyle ? 'text-[12px] tracking-[-0.276px]' : 'text-sm'}`}>
				<span className={odysseyStyle ? 'text-[color:var(--odyssey-task-muted)]' : 'text-[color:var(--muted)]'}>Reward</span>
				<span className={odysseyStyle ? 'text-[12px] text-white' : 'font-medium'}>
					+{xp} XP{star ? ' · Core Star' : ''}
				</span>
			</div>
			<Progress
				value={getProgressValue()}
				label={getStatusText()}
				variant={odysseyStyle ? 'odyssey' : 'default'}
			/>
			<div className="mt-2 text-center text-[12px] tracking-[-0.276px]">
				<span className={odysseyStyle ? (status === 'verified' ? 'text-[color:var(--odyssey-task-active)]' : 'text-[color:var(--odyssey-task-muted)]') : getStatusColor()}>
					{getStatusText()}
				</span>
			</div>
		</div>
	);
}










