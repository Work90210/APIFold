import { z } from 'zod';

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^0\./,
  /^\[::1\]$/,
  /^\[f[cd][0-9a-f]{2}:/i,
  /^\[fe[89ab][0-9a-f]:/i,
  /^0\.0\.0\.0$/,
];

function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_HOSTNAME_PATTERNS.some((p) => p.test(hostname));
}

const baseUrlSchema = z
  .string()
  .max(2000)
  .regex(/^https?:\/\//, 'baseUrl must start with http:// or https://')
  .refine(
    (url) => {
      try {
        const { hostname } = new URL(url);
        return !isPrivateHostname(hostname);
      } catch {
        return false;
      }
    },
    { message: 'baseUrl must not point to a private or internal address' },
  );

export const createServerSchema = z.object({
  specId: z.string().uuid(),
  name: z.string().min(1).max(200).trim(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  authMode: z.enum(['none', 'api_key', 'bearer', 'oauth2_authcode', 'oauth2_client_creds']),
  baseUrl: baseUrlSchema,
  rateLimitPerMinute: z.number().int().min(1).max(10000).default(100),
});

export const updateServerSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  authMode: z.enum(['none', 'api_key', 'bearer', 'oauth2_authcode', 'oauth2_client_creds']).optional(),
  baseUrl: baseUrlSchema.optional(),
  rateLimitPerMinute: z.number().int().min(1).max(10000).optional(),
  isActive: z.boolean().optional(),
});

export type CreateServerSchemaInput = z.infer<typeof createServerSchema>;
export type UpdateServerSchemaInput = z.infer<typeof updateServerSchema>;
