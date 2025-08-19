'use client';
import clsx from 'clsx';

export default function Card({ children, className, elevated }: { children: React.ReactNode; className?: string; elevated?: boolean }){
	return (
		<div className={clsx('rounded-[var(--radius-lg)] border border-[color:var(--outline)] bg-[color:var(--card)]/80 backdrop-blur-md', elevated && 'shadow-elevated', className)}>
			{children}
		</div>
	);
}

