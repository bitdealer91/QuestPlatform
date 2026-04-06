'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';

export type TaskDetailHeaderProps = {
	task: {
		id: string;
		title: string;
		description?: string;
		type: 'action' | 'social' | 'info';
		href?: string;
		xp: number;
		star?: boolean;
		tags?: string[];
		brand?: string;
		logo?: string;
		brand_color?: string;
		logo_variant?: 'light'|'dark';
		category?: string;
	};
};

export default function TaskDetailHeader({ task }: TaskDetailHeaderProps){
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } }}
			className="space-y-4"
		>
			{/* Брендинг партнера - логотип и название */}
			{task.brand && task.logo && (
				<motion.div
					initial={{ opacity: 0, y: 4 }}
					animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 20, delay: 0.02 } }}
					className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-white/10 bg-black p-3 shadow-sm"
				>
					<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] bg-white/5">
						<Image
							src={task.logo}
							alt={`${task.brand} logo`}
							width={48}
							height={48}
							className="object-contain"
						/>
					</div>

					<div className="min-w-0">
						<h4
							className="text-lg font-semibold leading-tight text-white"
							style={{
								color: task.brand_color || undefined,
								textShadow: task.brand_color ? `0 0 20px ${task.brand_color}40` : undefined,
							}}
						>
							{task.brand}
						</h4>
						{task.category && (
							<div className="mt-0.5 text-xs text-[color:var(--odyssey-task-muted)]">
								{task.category}
							</div>
						)}
					</div>
				</motion.div>
			)}

			<div className="min-w-0">
				<h3 className="line-clamp-2 text-xl font-semibold leading-snug text-white">
					{task.title}
				</h3>
			</div>
		</motion.div>
	);
}









