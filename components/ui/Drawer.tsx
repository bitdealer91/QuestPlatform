'use client';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { X } from 'lucide-react';

export default function Drawer({
	open,
	onClose,
	children,
	size = 'xl',
	title,
	subtitle,
	headerAdornment,
	tone = 'default',
	panel = 'default',
}: {
	open: boolean;
	onClose: () => void;
	children: React.ReactNode;
	size?: 'md' | 'lg' | 'xl' | 'task';
	title?: string;
	subtitle?: string;
	headerAdornment?: React.ReactNode;
	/** `odyssey` — типографика шапки как в Figma `130:155` (Week N - Tasks). */
	tone?: 'default' | 'odyssey';
	/** Чёрная панель как на скринах Odyssey (не `card-elev`). */
	panel?: 'default' | 'black';
}){
	const sizes = {
		md: 'w-[min(520px,92vw)]',
		lg: 'w-[min(720px,92vw)]',
		xl: 'w-[min(980px,96vw)]',
		task: 'w-[min(660px,96vw)]',
	};
	return (
		<AnimatePresence>
			{open && (
				<motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
					<motion.div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
					<motion.aside
						className={clsx(
							'drawer-panel absolute right-0 top-0 flex h-full flex-col border-l shadow-elevated',
							panel === 'black'
								? 'border-white/10 bg-[color:var(--odyssey-panel)]'
								: 'border-[color:var(--outline)] bg-[color:var(--card-elev)]',
							sizes[size],
						)}
						initial={{ x: '100%' }}
						animate={{ x: 0, transition: { type: 'spring', stiffness: 220, damping: 22 } }}
						exit={{ x: '100%', transition: { duration: 0.2 } }}
					>
						{(title || subtitle || headerAdornment) && (
							<header
								className={clsx(
									'flex items-center gap-3 border-b px-4 pb-4',
									panel === 'black' ? 'border-white/10' : 'border-[color:var(--outline)]',
								)}
								style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
							>
								<div className="min-w-0 flex-1">
									{title && (
										<h2
											className={clsx(
												'truncate',
												tone === 'odyssey'
													? 'text-[15px] font-normal leading-normal tracking-[-0.345px] text-white'
													: 'text-lg font-semibold'
											)}
										>
											{title}
										</h2>
									)}
									{subtitle && (
										<p
											className={clsx(
												tone === 'odyssey' ? 'text-[12px] tracking-[-0.276px] text-[color:var(--odyssey-task-muted)]' : 'text-sm text-[color:var(--muted)]'
											)}
										>
											{subtitle}
										</p>
									)}
								</div>
								{headerAdornment}
								<button aria-label="Close"
									className={clsx(
										'ml-auto inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
										panel === 'black' ? 'border border-white/15' : 'border border-[color:var(--outline)]',
									)}
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


