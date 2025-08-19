import { z } from 'zod';

export type Task = {
	id: string;
	type: "action" | "social" | "info";
	title: string;
	desc?: string;
	href?: string;
	reward: { xp: number; star?: boolean };
	status: "todo" | "pending" | "done";
};

export type WeekSummary = {
	id: number; // 1..8
	title: string;
	percent: number; // 0..100
	stars: 0 | 1 | 2 | 3;
	status: "locked" | "available" | "completed";
};

export const TaskSchema = z.object({
	id: z.string(),
	type: z.union([z.literal('action'), z.literal('social'), z.literal('info')]),
	title: z.string(),
	desc: z.string().optional(),
	href: z.string().url().optional(),
	reward: z.object({ xp: z.number().int().min(0), star: z.boolean().optional() }),
	status: z.union([z.literal('todo'), z.literal('pending'), z.literal('done')]),
});

export const TasksSchema = z.array(TaskSchema);
