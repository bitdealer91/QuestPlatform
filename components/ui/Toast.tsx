'use client';
import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

type Kind = 'success' | 'info' | 'error';
type Toast = { id: string; kind: Kind; title: string; desc?: string; timeout?: number };

type Store = {
  items: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
};

export const useToast = create<Store>((set, get) => ({
  items: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    const item: Toast = { id, ...t };
    set({ items: [...get().items, item] });
    const ms = t.timeout ?? 3200;
    window.setTimeout(() => get().remove(id), ms);
  },
  remove: (id) => set({ items: get().items.filter(i => i.id !== id) }),
}));

export function ToastViewport(){
  const items = useToast(s => s.items);
  const remove = useToast(s => s.remove);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {items.map(t => (
          <motion.div key={t.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="pointer-events-auto min-w-[280px] max-w-[360px] rounded-[var(--radius)] border border-[color:var(--outline)] bg-[color:var(--card-elev)] shadow-elevated backdrop-blur-md"
          >
            <div className="flex items-start gap-3 p-4">
              {t.kind === 'success' && <CheckCircle2 className="h-5 w-5 text-[color:var(--ok)]" />}
              {t.kind === 'info' && <Info className="h-5 w-5 text-[color:var(--accent)]" />}
              {t.kind === 'error' && <AlertTriangle className="h-5 w-5 text-[color:var(--danger)]" />}
              <div className="min-w-0">
                <div className="font-medium leading-tight">{t.title}</div>
                {t.desc && <div className="mt-0.5 text-sm text-[color:var(--muted)]">{t.desc}</div>}
              </div>
              <button aria-label="Dismiss" onClick={() => remove(t.id)} className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export const toast = {
  success: (title: string, desc?: string) => useToast.getState().push({ kind: 'success', title, desc }),
  info: (title: string, desc?: string) => useToast.getState().push({ kind: 'info', title, desc }),
  error: (title: string, desc?: string) => useToast.getState().push({ kind: 'error', title, desc }),
};



