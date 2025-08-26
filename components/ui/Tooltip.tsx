'use client';
import * as React from 'react';

export default function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }){
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  return (
    <div className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} ref={ref}>
      {children}
      {open && (
        <div role="tooltip" className="absolute z-50 -top-2 left-1/2 -translate-y-full -translate-x-1/2 rounded-[var(--radius)] border border-[color:var(--outline)] bg-[color:var(--card-elev)] px-2.5 py-1.5 text-xs text-[color:var(--text)] shadow-elevated">
          {content}
        </div>
      )}
    </div>
  );
}










