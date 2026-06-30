import { z } from 'zod';

export const TaskZ = z.object({
  week: z.number().int().min(1).max(4),
  day: z.number().int().min(1).max(28),
  id: z.string().min(2).max(40),
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(600).optional(),
  type: z.enum(["action","social","info"]),
  href: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  mandatory: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  verify_method: z.union([z.literal('onchain'), z.literal('api'), z.literal('social')]).optional(),
  verify_params: z.record(z.unknown()).optional(),
  brand: z.string().optional(),
  logo: z.string().optional(),
  brand_color: z.string().optional(),
  logo_variant: z.union([z.literal('light'), z.literal('dark')]).optional()
});

export const TaskSpecZ = z.object({
  programStart: z.string().datetime().optional(),
  weeks: z.number().int().min(1).max(4).optional(),
  /** Full ISO timestamps per week (week 1..N). Overrides computed unlock time. */
  weekDropUnlocks: z.array(z.string().datetime()).optional(),
  /** Local time on unlock day, e.g. "12:00" or "12:00:00". Default 00:00:00 UTC. */
  weekDropUnlockTime: z.string().optional(),
  /** IANA timezone for weekDropUnlockTime, e.g. "Europe/Berlin". Default UTC. */
  weekDropUnlockTimezone: z.string().optional(),
  tasks: z.array(TaskZ)
});

export type Task = z.infer<typeof TaskZ>;
export type TaskSpec = z.infer<typeof TaskSpecZ>;

/** Tasks count toward unlock unless explicitly marked optional. */
export function isTaskMandatory(task: { mandatory?: boolean; [key: string]: unknown }): boolean {
  if (task["mandatory task"] === true || task.mandatory === true) return true;
  if (task["mandatory task"] === false || task.mandatory === false) return false;
  return true;
}










