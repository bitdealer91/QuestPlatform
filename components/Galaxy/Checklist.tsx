'use client';
import { CheckCircle2 } from 'lucide-react';

export default function Checklist({ items }: { items: string[] }){
	if (!items || items.length === 0) return null as unknown as JSX.Element;
	return (
		<ul className="mt-1 space-y-2" aria-label="Checklist">
			{items.slice(0,3).map((it, idx) => (
				<li key={idx} className="flex items-start gap-2 text-sm">
					<CheckCircle2 className="mt-0.5 h-4 w-4 text-[color:var(--ok)]" aria-hidden />
					<span className="text-[color:var(--text)]/90">{it}</span>
				</li>
			))}
		</ul>
	);
}



















