import { z } from 'zod';

export type Task = {
	id: string;
	type: "action" | "social" | "info";
	title: string;
	desc?: string;
	href?: string;
	reward: { xp: number; star?: boolean };
	status: "todo" | "pending" | "done";
	// Брендинг
	brand?: string;
	logo?: string;
	brand_color?: string;
	logo_variant?: 'light' | 'dark';
	// Теги
	tags?: string[];
	// Категория
	category?: string;
	// Верификация
	verify_method?: "onchain" | "api";
	verify_params?: Record<string, unknown>;
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
	// Брендинг
	brand: z.string().optional(),
	logo: z.string().optional(),
	brand_color: z.string().optional(),
	logo_variant: z.union([z.literal('light'), z.literal('dark')]).optional(),
	// Теги
	tags: z.array(z.string()).optional(),
	// Категория
	category: z.string().optional(),
	// Верификация
	verify_method: z.union([z.literal('onchain'), z.literal('api')]).optional(),
	verify_params: z.record(z.unknown()).optional(),
});

export const TasksSchema = z.array(TaskSchema);
