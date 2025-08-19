'use client';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'glass' | 'ghost' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: Variant;
	loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
	{ className, variant = 'primary', disabled, loading, children, ...rest }, ref
) {
	const base = 'inline-flex items-center justify-center rounded-[var(--radius)] px-4 py-2 text-sm font-medium transition-all duration-[var(--duration,200ms)] ease-fluent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60 disabled:cursor-not-allowed active:-translate-y-0.5 hover:drop-shadow-glow';
	const variants: Record<Variant, string> = {
		primary: 'bg-[color:var(--primary)] text-black shadow-elevated hover:brightness-110',
		secondary: 'bg-[color:var(--card)] text-[color:var(--text)] border border-[color:var(--outline)] hover:bg-white/5',
		glass: 'bg-[color:var(--card)]/70 text-[color:var(--text)] backdrop-blur border border-[color:var(--outline)] hover:bg-white/5',
		ghost: 'bg-transparent text-[color:var(--text)] hover:bg-white/5',
		danger: 'bg-[color:var(--danger)] text-black hover:brightness-110',
	};
	return (
		<button ref={ref} className={clsx(base, variants[variant], className)} disabled={disabled || loading} {...rest}>
			{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
			{children}
		</button>
	);
});
