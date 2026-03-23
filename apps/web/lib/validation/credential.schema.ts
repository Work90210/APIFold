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

const tokenEndpointSchema = z
  .string()
  .url()
  .max(2000)
  .refine((url) => url.startsWith('https://'), { message: 'tokenEndpoint must use HTTPS' })
  .refine(
    (url) => {
      try {
        return !isPrivateHostname(new URL(url).hostname);
      } catch {
        return false;
      }
    },
    { message: 'tokenEndpoint must not point to a private or internal address' },
  );

export const createCredentialSchema = z.object({
  label: z.string().trim().min(1).max(200),
  plaintextKey: z.string().trim().min(1).max(10000),
  authType: z.enum(['api_key', 'bearer', 'oauth2_authcode', 'oauth2_client_creds']),
  expiresAt: z.coerce.date().optional(),
  refreshToken: z.string().trim().min(1).max(10000).optional(),
  scopes: z.array(z.string().max(200)).max(50).optional(),
  tokenEndpoint: tokenEndpointSchema.optional(),
  clientId: z.string().trim().min(1).max(500).optional(),
  clientSecret: z.string().trim().min(1).max(10000).optional(),
  tokenExpiresAt: z.coerce.date().optional(),
  provider: z.string().trim().min(1).max(100).optional(),
});

export const updateCredentialSchema = z.object({
  label: z.string().trim().min(1).max(200).optional(),
  plaintextKey: z.string().trim().min(1).max(10000).optional(),
  authType: z.enum(['api_key', 'bearer', 'oauth2_authcode', 'oauth2_client_creds']).optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  refreshToken: z.string().trim().min(1).max(10000).nullable().optional(),
  scopes: z.array(z.string().max(200)).max(50).optional(),
  tokenEndpoint: tokenEndpointSchema.nullable().optional(),
  clientId: z.string().trim().min(1).max(500).nullable().optional(),
  clientSecret: z.string().trim().min(1).max(10000).nullable().optional(),
  tokenExpiresAt: z.coerce.date().nullable().optional(),
  provider: z.string().trim().min(1).max(100).nullable().optional(),
});

export type CreateCredentialSchemaInput = z.infer<typeof createCredentialSchema>;
export type UpdateCredentialSchemaInput = z.infer<typeof updateCredentialSchema>;
