'use client';

export default function Kbd({ children }: { children: React.ReactNode }){
  return (
    <kbd className="rounded-md border border-[color:var(--outline)] bg-[color:var(--card)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--muted)] shadow-[inset_0_-1px_0_rgba(255,255,255,.04)]">
      {children}
    </kbd>
  );
}



