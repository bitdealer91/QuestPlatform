'use client';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { X } from 'lucide-react';

/** Выше OdysseyHeader (50), OdysseySocial (60), ui-fixed-layer (60); ниже полноэкранного VideoLoader. */
const DRAWER_Z = 8000;

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
	const [mounted, setMounted] = useState(false);
	useLayoutEffect(() => setMounted(true), []);

	const sizes = {
		md: 'w-[min(520px,92vw)]',
		lg: 'w-[min(720px,92vw)]',
		xl: 'w-[min(980px,96vw)]',
		task: 'w-[min(660px,96vw)]',
	};
	const layer = (
		<AnimatePresence>
			{open && (
				<motion.div
					className="fixed left-0 right-0 top-0 flex min-h-0 flex-row justify-end overflow-hidden"
					style={{
						zIndex: DRAWER_Z,
						/* Явная высота: иначе при only-abs children + Framer слой иногда схлопывается по контенту. */
						height: '100dvh',
						maxHeight: '100dvh',
					}}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<motion.div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-md" onClick={onClose} aria-hidden />
					<motion.aside
						className={clsx(
							'relative z-10 flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l shadow-elevated',
							panel === 'black'
								? 'border-white/10 bg-[color:var(--odyssey-panel)] backdrop-blur-xl backdrop-saturate-150'
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
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
					</motion.aside>
				</motion.div>
			)}
		</AnimatePresence>
	);

	if (!mounted) return null;
	return createPortal(layer, document.body);
}


