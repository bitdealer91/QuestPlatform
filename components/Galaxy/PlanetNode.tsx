'use client';
import Image from 'next/image';
import { useState, memo, useEffect } from 'react';
import clsx from 'clsx';
import { Lock } from 'lucide-react';

export type PlanetNodeProps = {
	id: number;
	imgSrc: string;
	title: string;
	locked?: boolean;
	onView?: (id: number) => void;
	onClaim?: (id: number) => void;
	sizePx?: number;
	claimEnabled?: boolean;
	/** Odyssey map: island art is in the scenery layer; keep only HUD + hit area. */
	hidePlanetArt?: boolean;
	/** Сообщает родителю о hover по зоне недели (для подсветки материка на карте). */
	onHoverChange?: (id: number, hovering: boolean) => void;
	/** Доля высоты hit-зоны для верха HUD (по умолчанию из `odysseyLayout`). */
	hudTopPct?: number;
	/** Доп. сдвиг HUD по Y в px (отрицательный — выше). */
	hudNudgeYPx?: number;
	/** Скрыть HUD «View Tasks / Claim» (мобильная карта — отдельные кнопки снизу). */
	hideHud?: boolean;
};

/** Figma mobile `203:774` — кнопка Tasks при фокусе на карте ([Odyssey mobile](https://www.figma.com/design/mxf1NvhmBdHC85lg9M0AWD/Odyssey?node-id=146-3556&m=dev)). */
const ODYSSEY_ISLAND_HOVER_FILL = '#78a3c8';

function PlanetNodeImpl({
	id,
	imgSrc,
	title,
	sizePx = 120,
	onView,
	onClaim,
	locked,
	claimEnabled = false,
	hidePlanetArt = false,
	onHoverChange,
	hudTopPct,
	hudNudgeYPx = 0,
	hideHud = false,
}: PlanetNodeProps) {
    const [hover, setHover] = useState(false);
    const canInteract = !locked;
	const claimUnlocked = claimEnabled;
	const tasksExplicitlyOff = /^(0|false)$/i.test(String(process.env.NEXT_PUBLIC_ENABLE_TASKS ?? ''));
	const viewTasksEnabled = !tasksExplicitlyOff && !!onView;
	// Для новой фазы оставляем только ручной флаг завершения.
	const ended = process.env.NEXT_PUBLIC_FORCE_ENDED === '1';

	useEffect(() => {
		onHoverChange?.(id, hover);
	}, [id, hover, onHoverChange]);

	return (
		<div className={clsx('group outline-none', 'relative', locked && 'cursor-not-allowed')}
			aria-label={`${title}${locked ? ' (locked)' : ''}`}
			aria-disabled={locked}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			onFocus={() => setHover(true)}
			onBlur={() => setHover(false)}
		>
			{/* ANCHOR: centered art, used for pathing */}
			<div
				data-planet-anchor
				data-path-order={id}
				className={clsx(
					'relative transition-transform duration-200',
					hidePlanetArt
						? 'scale-100'
						: hover
							? 'scale-[1.06] drop-shadow-[0_0_24px_var(--ring)]'
							: 'scale-100'
				)}
				style={{ width: sizePx, height: sizePx }}
			>
				{hidePlanetArt ? (
					<div className="select-none" style={{ width: sizePx, height: sizePx }} aria-hidden />
				) : (
				<Image
					src={imgSrc}
					alt={title}
					width={sizePx}
					height={sizePx}
					priority={id <= 2}
					className={clsx('select-none pointer-events-none object-contain')}
					draggable={false}
				/>
				)}
				{locked && hover && (
					<div className="pointer-events-none absolute inset-0 grid place-items-center z-50">
						<div className={clsx('grid place-items-center rounded-full border border-[color:var(--outline)]', 'bg-[radial-gradient(60%_60%_at_30%_35%,rgba(178,108,255,.45),rgba(69,214,255,.25))]', 'w-16 h-16 transition-transform duration-200', hover ? 'scale-110 drop-shadow-glow' : 'scale-100')}>
							<Lock className="h-7 w-7 text-white" />
						</div>
					</div>
				)}
			</div>

			{/* HUD: positioned outside so it never shifts the center */}
			{!hideHud && (
			<div
				className="absolute left-1/2 -translate-x-1/2 w-max z-50"
				style={{
					top: `calc(${hudTopPct ?? 68}% + ${hudNudgeYPx}px)`,
				}}
			>
                {canInteract && (
                    <div className={clsx('pointer-events-none w-[292px] z-50', 'transition-all duration-200', hover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')}>
						<div className="pointer-events-auto">
							<div className="flex gap-3">
								<button
									onClick={() => viewTasksEnabled && onView?.(id)}
									disabled={!viewTasksEnabled}
									style={{
										width: 140,
										...(viewTasksEnabled && hover ? { backgroundColor: ODYSSEY_ISLAND_HOVER_FILL } : {}),
									}}
									className={clsx(
										'inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-[transform,background-color,border-color,color,filter,box-shadow] duration-200 active:scale-[0.985] active:translate-y-[1px]',
										viewTasksEnabled
											? hover
												? 'border-[#78a3c8] text-black cursor-pointer shadow-[0_0_16px_rgba(120,163,200,0.42)]'
												: 'border-[color:var(--outline)] bg-[var(--primary)] text-black hover:brightness-110 hover:shadow-[0_0_14px_rgba(120,163,200,0.35)] cursor-pointer'
											: 'bg-[color:var(--card)]/60 text-[color:var(--muted)] border-[color:var(--outline)]/60 cursor-not-allowed'
									)}
									aria-label={`View tasks for ${title}`}
								>
									View Tasks
								</button>
								{ended ? (
									<div title="Ended">
										<button disabled style={{ width: 140 }} className={clsx('inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]', 'bg-[color:var(--card)]/60 text-[color:var(--muted)] border-[color:var(--outline)]/60 cursor-not-allowed')} aria-label={`Claim ended for ${title}`}>Claim</button>
									</div>
								) : (
									<button
										onClick={() => claimUnlocked && onClaim?.(id)}
										disabled={!claimUnlocked}
										style={{ width: 140 }}
										className={clsx(
											'inline-flex flex-none items-center justify-center whitespace-nowrap h-12 px-6 rounded-full border focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-[transform,background-color,border-color,color,box-shadow] duration-200 active:scale-[0.985] active:translate-y-[1px]',
											claimUnlocked
												? hover
													? 'bg-transparent text-white border-white/90 cursor-pointer shadow-[0_0_16px_rgba(120,163,200,0.38)]'
													: 'bg-[var(--card)] text-[var(--text)] border-[var(--outline)] hover:brightness-110 hover:shadow-[0_0_14px_rgba(120,163,200,0.32)] cursor-pointer'
												: 'bg-[color:var(--card)]/60 text-[color:var(--muted)] border-[color:var(--outline)]/60 cursor-not-allowed'
										)}
										aria-label={`Claim reward for ${title}`}
									>
										{claimUnlocked ? 'Claim' : 'Claim (locked)'}
									</button>
								)}
							</div>
						</div>
					</div>
                )}
				{locked && hover && null}
			</div>
			)}
		</div>
	);
}

export const PlanetNode = memo(PlanetNodeImpl);
