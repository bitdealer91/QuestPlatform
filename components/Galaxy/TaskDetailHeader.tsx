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
					className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border border-[color:var(--outline)] bg-[color:var(--card-elev)] shadow-sm"
				>
					{/* Логотип */}
					<div className="shrink-0 w-12 h-12 rounded-[var(--radius)] overflow-hidden bg-white/5 flex items-center justify-center">
						<Image 
							src={task.logo} 
							alt={`${task.brand} logo`} 
							width={48} 
							height={48}
							className="object-contain"
						/>
					</div>
					
					{/* Название в цветах партнера */}
					<div className="min-w-0">
						<h4 
							className="text-lg font-semibold leading-tight"
							style={{ 
								color: task.brand_color || 'var(--foreground)',
								textShadow: task.brand_color ? `0 0 20px ${task.brand_color}40` : 'none'
							}}
						>
							{task.brand}
						</h4>
						{task.category && (
							<div className="text-xs text-[color:var(--muted)] mt-0.5">
								{task.category}
							</div>
						)}
					</div>
				</motion.div>
			)}

			{/* Заголовок задачи - без маркировок */}
			<div className="min-w-0">
				<h3 className="text-xl leading-snug font-semibold line-clamp-2 text-[color:var(--foreground)]">
					{task.title}
				</h3>
			</div>
		</motion.div>
	);
}









