import { z } from 'zod';

export const updateToolSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateToolSchemaInput = z.infer<typeof updateToolSchema>;
