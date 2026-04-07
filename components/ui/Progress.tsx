'use client';

export default function Progress({
	value,
	label,
	variant = 'default',
}: {
	value: number;
	label?: string;
	/** Figma `130:155` / `136:1113`: трек #8e8e8e, высота 6px, ширина до 173px. */
	variant?: 'default' | 'odyssey';
}) {
	const v = Math.max(0, Math.min(100, Math.round(value)));
	if (variant === 'odyssey') {
		const fill = 'linear-gradient(90deg, var(--odyssey-task-active), var(--odyssey-go))';
		return (
			<div className="w-full">
				<div className="h-[6px] w-full rounded-full bg-[color:var(--odyssey-task-muted)] overflow-hidden">
					<div className="h-full rounded-full" style={{ width: `${v}%`, background: fill }} />
				</div>
				{label && (
					<div className="mt-1 text-[12px] leading-normal tracking-[-0.276px] text-[color:var(--odyssey-task-muted)]">
						{label} - {v}%
					</div>
				)}
			</div>
		);
	}
	return (
		<div>
			<div className="h-2 rounded-full bg-white/10 overflow-hidden">
				<div
					className="h-full rounded-full"
					style={{
						width: `${v}%`,
						background: 'linear-gradient(90deg, var(--primary), var(--accent))',
						boxShadow: 'inset 0 0 6px rgba(255,255,255,.2)',
					}}
				/>
			</div>
			{label && (
				<div className="mt-1 text-xs text-[color:var(--muted)]">
					{label} · {v}%
				</div>
			)}
		</div>
	);
}

