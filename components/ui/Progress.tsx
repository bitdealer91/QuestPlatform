'use client';

export default function Progress({ value, label }: { value: number; label?: string }){
	const v = Math.max(0, Math.min(100, Math.round(value)));
	return (
		<div>
			<div className="h-2 rounded-full bg-white/10 overflow-hidden">
				<div className="h-full rounded-full" style={{ width: `${v}%`, background: 'linear-gradient(90deg, var(--primary), var(--accent))', boxShadow: 'inset 0 0 6px rgba(255,255,255,.2)' }} />
			</div>
			{label && <div className="mt-1 text-xs text-[color:var(--muted)]">{label} · {v}%</div>}
		</div>
	);
}

