'use client';
import clsx from 'clsx';

export default function Tag({ children, className }: { children: React.ReactNode; className?: string }){
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-[999px] border border-[color:var(--outline)] bg-[color:var(--card)]/70 px-2 py-0.5 text-[11px] text-[color:var(--muted)]', className)}>
      {children}
    </span>
  );
}










