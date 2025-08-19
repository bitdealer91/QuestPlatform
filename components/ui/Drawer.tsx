'use client';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';

export default function Drawer({ open, onClose, children, size = 'xl', title, subtitle }: { open: boolean; onClose: () => void; children: React.ReactNode; size?: 'md'|'lg'|'xl'; title?: string; subtitle?: string }){
	const sizes = { md: 'w-[min(520px,92vw)]', lg: 'w-[min(720px,92vw)]', xl: 'w-[min(980px,96vw)]' };
	return (
		<AnimatePresence>
			{open && (
				<motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
					<motion.div className="absolute inset-0 bg-black/55 backdrop-blur-[14px]" onClick={onClose} />
					<motion.aside
						className={clsx('absolute right-0 top-0 h-full bg-[color:var(--card-elev)] border-l border-[color:var(--outline)] shadow-elevated', sizes[size])}
						initial={{ x: '100%' }}
						animate={{ x: 0, transition: { type: 'spring', stiffness: 220, damping: 22 } }}
						exit={{ x: '100%', transition: { duration: 0.2 } }}
					>
						{(title || subtitle) && (
							<header className="p-4 border-b border-[color:var(--outline)]">
								<h2 className="text-lg font-semibold">{title}</h2>
								{subtitle && <p className="text-sm text-[color:var(--muted)]">{subtitle}</p>}
							</header>
						)}
						<div className="h-[calc(100%-64px)] overflow-auto">{children}</div>
					</motion.aside>
				</motion.div>
			)}
		</AnimatePresence>
	);
}


