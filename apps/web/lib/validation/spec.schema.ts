import { z } from 'zod';

export const createSpecSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  version: z.string().min(1).max(50).trim().default('1.0.0'),
  sourceUrl: z.string().max(2000).regex(/^https?:\/\//, 'sourceUrl must start with http:// or https://').optional(),
  rawSpec: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => data.sourceUrl !== undefined || data.rawSpec !== undefined,
  { message: 'Either sourceUrl or rawSpec must be provided' },
);

export const updateSpecSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  version: z.string().min(1).max(50).trim().optional(),
});

export type CreateSpecInput = z.infer<typeof createSpecSchema>;
export type UpdateSpecInput = z.infer<typeof updateSpecSchema>;
