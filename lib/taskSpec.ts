import { z } from "zod";

export const VerifyApiZ = z.object({
  url: z.string().url(),
  method: z.enum(["GET","POST"]).default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.record(z.any()).optional(),
  success: z.object({
    path: z.string().min(1),
    equals: z.any()
  }).optional()
});

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
  verify_method: z.string(),
  verify_params: z.record(z.any()).default({}),
  verify_api: VerifyApiZ.optional(),
  brand: z.string().optional(),
  logo: z.string().url().or(z.string().startsWith("/")).optional(),
  brand_color: z.string().regex(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i).optional(),
  logo_variant: z.enum(["light","dark"]).optional()
});

export const TaskSpecZ = z.object({
  programStart: z.string().datetime().optional(),
  weeks: z.number().int().min(1).max(8).optional(),
  tasks: z.array(TaskZ)
});

export type Task = z.infer<typeof TaskZ>;










