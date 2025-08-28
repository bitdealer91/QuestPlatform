import { z } from 'zod';

export const TaskZ = z.object({
  week: z.number().int().min(1).max(8),
  day: z.number().int().min(1).max(7),
  id: z.string().min(2).max(40),
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(600).optional(),
  type: z.enum(["action","social","info"]),
  href: z.string().url().optional(),
  xp: z.number().int().min(0).default(10),
  star: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  verify_method: z.union([z.literal('onchain'), z.literal('api')]).optional(),
  verify_params: z.record(z.unknown()).optional(),
  brand: z.string().optional(),
  logo: z.string().optional(),
  brand_color: z.string().optional(),
  logo_variant: z.union([z.literal('light'), z.literal('dark')]).optional()
});

export const TaskSpecZ = z.object({
  programStart: z.string().datetime().optional(),
  weeks: z.number().int().min(1).max(8).optional(),
  tasks: z.array(TaskZ)
});

export type Task = z.infer<typeof TaskZ>;
export type TaskSpec = z.infer<typeof TaskSpecZ>;










