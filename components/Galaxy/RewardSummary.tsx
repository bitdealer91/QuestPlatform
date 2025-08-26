'use client';
import Progress from '@/components/ui/Progress';

export type RewardSummaryProps = {
	xp: number;
	star?: boolean;
	status?: 'idle' | 'pending' | 'verified' | 'error';
};

export default function RewardSummary({ xp, star, status = 'idle' }: RewardSummaryProps){
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

	return (
		<div className="rounded-[var(--radius-lg)] border border-[color:var(--outline)] bg-[color:var(--card)] p-3">
			<div className="flex items-center justify-between text-sm mb-2">
				<span className="text-[color:var(--muted)]">Reward</span>
				<span className="font-medium">+{xp} XP{star ? ' · Core Star' : ''}</span>
			</div>
			<Progress value={getProgressValue()} label={getStatusText()} />
			<div className="mt-2 text-xs text-center">
				<span className={getStatusColor()}>{getStatusText()}</span>
			</div>
		</div>
	);
}










