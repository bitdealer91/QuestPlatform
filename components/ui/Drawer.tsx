'use client';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { X } from 'lucide-react';

export default function Drawer({ open, onClose, children, size = 'xl', title, subtitle, headerAdornment }: { open: boolean; onClose: () => void; children: React.ReactNode; size?: 'md'|'lg'|'xl'; title?: string; subtitle?: string; headerAdornment?: React.ReactNode }){
	const sizes = { md: 'w-[min(520px,92vw)]', lg: 'w-[min(720px,92vw)]', xl: 'w-[min(980px,96vw)]' };
	return (
		<AnimatePresence>
			{open && (
				<motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
					<motion.div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
					<motion.aside
						className={clsx('absolute right-0 top-0 h-full bg-[color:var(--card-elev)] border-l border-[color:var(--outline)] shadow-elevated flex flex-col', sizes[size])}
						initial={{ x: '100%' }}
						animate={{ x: 0, transition: { type: 'spring', stiffness: 220, damping: 22 } }}
						exit={{ x: '100%', transition: { duration: 0.2 } }}
					>
						{(title || subtitle || headerAdornment) && (
							<header className="flex items-center gap-3 px-4 pb-4 border-b border-[color:var(--outline)]" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
								<div className="min-w-0 flex-1">
									{title && <h2 className="text-lg font-semibold truncate">{title}</h2>}
									{subtitle && <p className="text-sm text-[color:var(--muted)]">{subtitle}</p>}
								</div>
								{headerAdornment}
								<button aria-label="Close"
									className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-[color:var(--outline)] hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
									onClick={onClose}
								>
									<X className="h-4 w-4" />
								</button>
							</header>
						)}
						<div className="flex-1 min-h-0 overflow-auto">{children}</div>
					</motion.aside>
				</motion.div>
			)}
		</AnimatePresence>
	);
}


