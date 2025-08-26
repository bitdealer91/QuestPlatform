'use client';
import clsx from 'clsx';

type Variant = 'neutral' | 'primary' | 'accent' | 'ok' | 'warn' | 'danger' | 'outline';

export default function Badge({ children, variant = 'neutral', className }: { children: React.ReactNode; variant?: Variant; className?: string }){
  const styles: Record<Variant, string> = {
    neutral: 'bg-[color:var(--card)] text-[color:var(--text)]/90 border border-[color:var(--outline)]',
    primary: 'bg-[color:var(--primary)]/18 text-[color:var(--text)] border border-[color:var(--primary)]/60',
    accent: 'bg-[color:var(--accent)]/14 text-[color:var(--text)] border border-[color:var(--accent)]/60',
    ok: 'bg-[color:var(--ok)]/14 text-[color:var(--text)] border border-[color:var(--ok)]/60',
    warn: 'bg-[color:var(--warn)]/14 text-[color:var(--text)] border border-[color:var(--warn)]/60',
    danger: 'bg-[color:var(--danger)]/16 text-[color:var(--text)] border border-[color:var(--danger)]/60',
    outline: 'bg-transparent text-[color:var(--text)]/85 border border-[color:var(--outline)]',
  };
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-[999px] px-2.5 py-1 text-xs', styles[variant], className)}>{children}</span>
  );
}










