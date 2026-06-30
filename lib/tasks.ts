import { z } from 'zod';

export type Task = {
	id: string;
	type: "action" | "social" | "info";
	title: string;
	desc?: string;
	href?: string;
	status: "todo" | "pending" | "done";
	mandatory?: boolean;
	brand?: string;
	logo?: string;
	brand_color?: string;
	logo_variant?: 'light' | 'dark';
	tags?: string[];
	category?: string;
	verify_method?: "onchain" | "api" | "social";
	verify_params?: Record<string, unknown>;
};

export type WeekSummary = {
	id: number;
	title: string;
	percent: number;
	status: "locked" | "available" | "completed";
};

const optionalUrl = z
	.union([z.string().url(), z.literal('')])
	.optional()
	.transform((v) => (v === '' ? undefined : v));

export const TaskSchema = z.object({
	id: z.string(),
	type: z.union([z.literal('action'), z.literal('social'), z.literal('info')]),
	title: z.string(),
	desc: z.string().optional(),
	href: optionalUrl,
	status: z.union([z.literal('todo'), z.literal('pending'), z.literal('done')]),
	mandatory: z.boolean().optional(),
	brand: z.string().optional(),
	logo: z.string().optional(),
	brand_color: z.string().optional(),
	logo_variant: z.union([z.literal('light'), z.literal('dark')]).optional(),
	tags: z.array(z.string()).optional(),
	category: z.string().optional(),
	verify_method: z.union([z.literal('onchain'), z.literal('api'), z.literal('social')]).optional(),
	verify_params: z.record(z.unknown()).optional(),
});

export const TasksSchema = z.array(TaskSchema);
