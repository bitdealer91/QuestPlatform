'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import Tag from '@/components/ui/Tag';

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
	};
};

export default function TaskDetailHeader({ task }: TaskDetailHeaderProps){
	const typeLabel = task.type === 'action' ? 'On-chain' : task.type === 'social' ? 'Social' : 'Info';
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } }}
			className="flex items-start justify-between gap-4"
		>
			<div className="min-w-0">
				<h3 className="text-lg leading-snug font-semibold line-clamp-2">{task.title}</h3>
				<div className="mt-1 flex items-center gap-2 flex-wrap">
					{task.brand && (
						<Badge variant="outline">{task.brand}</Badge>
					)}
					<Tag>{typeLabel}</Tag>
					{task.tags?.slice(0,3).map((t) => (
						<Tag key={t}>{t}</Tag>
					))}
				</div>
			</div>
			{task.logo && (
				<motion.div
					initial={{ opacity: 0, scale: .96 }}
					animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 20, delay: 0.02 } }}
					className="shrink-0 rounded-[12px] p-2 border border-[color:var(--outline)] bg-[color:var(--card)] shadow-sm"
					aria-label="Brand logo"
				>
					<Image src={task.logo} alt={`${task.brand ?? 'App'} logo`} width={28} height={28} />
				</motion.div>
			)}
		</motion.div>
	);
}



