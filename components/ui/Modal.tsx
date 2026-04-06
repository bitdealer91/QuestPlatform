'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/** Согласовано с `Drawer`: поверх Odyssey UI, без влияния transform сцены. */
const MODAL_Z = 8000;

export default function Modal({ open, onClose, title, subtitle, children, size = 'lg', footer, headerAdornment }: { open: boolean; onClose: () => void; title?: string | React.ReactNode; subtitle?: string; children: React.ReactNode; size?: 'sm'|'md'|'lg'|'xl'|'profile'; footer?: React.ReactNode; headerAdornment?: React.ReactNode }){
	const panelRef = useRef<HTMLDivElement | null>(null);
	const [mounted, setMounted] = useState(false);
	useLayoutEffect(() => setMounted(true), []);
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'Tab') trapFocus(e); };
		document.addEventListener('keydown', onKey);
		const toFocus = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
		toFocus?.focus();
		return () => document.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	const trapFocus = (e: KeyboardEvent) => {
		const root = panelRef.current; if (!root) return;
		const focusables = Array.from(root.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")).filter(el => !el.hasAttribute('disabled'));
		if (focusables.length === 0) return;
		const first = focusables[0] as HTMLElement;
		const last = (focusables[focusables.length - 1] ?? first) as HTMLElement;
		if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
		else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
	};

	const sizes = {
		sm: 'w-[min(420px,92vw)]',
		md: 'w-[min(560px,92vw)]',
		lg: 'w-[min(720px,92vw)]',
		xl: 'w-[min(920px,94vw)]',
		profile: 'w-[min(668px,92vw)]',
	};
	const layer = (
		<AnimatePresence>
			{open && (
				<motion.div
					role="dialog"
					aria-modal="true"
					aria-label={typeof title === 'string' ? title : undefined}
					className="fixed inset-0 flex min-h-0 items-center justify-center"
					style={{ zIndex: MODAL_Z }}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<motion.div className="absolute inset-0 bg-black/55 backdrop-blur-[14px]" onClick={onClose} />
					<motion.div
						ref={panelRef}
						className={clsx(
							'relative modal-card rounded-[var(--radius-lg)] shadow-elevated',
							size === 'profile'
								? 'border border-white/10 bg-[color:var(--odyssey-panel)] backdrop-blur-xl backdrop-saturate-150'
								: 'border border-[color:var(--outline)] bg-[color:var(--card-elev)]',
							sizes[size],
						)}
						initial={{ scale: 0.96, opacity: 0 }}
						animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 220, damping: 22 } }}
						exit={{ scale: 0.98, opacity: 0, transition: { duration: 0.2 } }}
					>
						{(title || headerAdornment) && (
							<div
								className={clsx(
									'flex items-center justify-between border-b px-5 py-4',
									size === 'profile' ? 'border-white/10' : 'border-[color:var(--outline)]',
								)}
							>
								<div className="min-w-0">
									{typeof title === 'string' ? (
										<h2
											className={
												size === 'profile'
													? 'truncate text-[15px] font-normal tracking-[-0.345px] text-white'
													: 'text-lg font-semibold truncate'
											}
										>
											{title}
										</h2>
									) : (
										title
									)}
									{subtitle && (
										<p
											className={
												size === 'profile'
													? 'mt-0.5 text-[12px] tracking-[-0.276px] text-[color:var(--odyssey-task-muted)]'
													: 'mt-0.5 text-sm text-[color:var(--muted)]'
											}
										>
											{subtitle}
										</p>
									)}
								</div>
								<div className="flex items-center gap-3">
									{headerAdornment}
									<button aria-label="Close"
										className={clsx(
											'inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
											size === 'profile' ? 'border border-white/15' : 'border border-[color:var(--outline)]',
										)}
										onClick={onClose}
									>
										<X className="h-4 w-4" />
									</button>
								</div>
							</div>
						)}
						<div className="p-5">{children}</div>
						{footer && <div className="px-5 py-4 border-t border-[color:var(--outline)] flex items-center justify-end gap-2">{footer}</div>}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);

	if (!mounted) return null;
	return createPortal(layer, document.body);
}
