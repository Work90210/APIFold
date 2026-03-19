import { z } from 'zod';

export const createServerSchema = z.object({
  specId: z.string().uuid(),
  name: z.string().min(1).max(200).trim(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  authMode: z.enum(['none', 'api_key', 'bearer']),
  baseUrl: z.string().max(2000).regex(/^https?:\/\//, 'baseUrl must start with http:// or https://'),
  rateLimitPerMinute: z.number().int().min(1).max(10000).default(100),
});

export const updateServerSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  authMode: z.enum(['none', 'api_key', 'bearer']).optional(),
  baseUrl: z.string().max(2000).regex(/^https?:\/\//, 'baseUrl must start with http:// or https://').optional(),
  rateLimitPerMinute: z.number().int().min(1).max(10000).optional(),
  isActive: z.boolean().optional(),
});

export type CreateServerSchemaInput = z.infer<typeof createServerSchema>;
export type UpdateServerSchemaInput = z.infer<typeof updateServerSchema>;
