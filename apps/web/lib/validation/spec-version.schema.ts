import { z } from 'zod';

export const createSpecVersionSchema = z.object({
  versionLabel: z.string().max(100).trim().optional(),
  rawSpec: z.record(z.string(), z.unknown()).refine(
    (val) => new TextEncoder().encode(JSON.stringify(val)).byteLength <= 5_000_000,
    'rawSpec must be under 5MB when serialized',
  ),
  toolSnapshot: z.array(z.record(z.string(), z.unknown())).max(500, 'Maximum 500 tools per spec'),
  sourceUrl: z
    .string()
    .max(2000)
    .regex(/^https?:\/\//, 'sourceUrl must start with http:// or https://')
    .optional(),
});

export const promoteVersionSchema = z.object({
  serverId: z.string().uuid(),
  environment: z.enum(['production', 'preview', 'staging']).default('production'),
  endpointUrl: z
    .string()
    .max(2000)
    .regex(/^https?:\/\//, 'endpointUrl must start with http:// or https://')
    .optional(),
});

export type CreateSpecVersionSchemaInput = z.infer<typeof createSpecVersionSchema>;
export type PromoteVersionSchemaInput = z.infer<typeof promoteVersionSchema>;
