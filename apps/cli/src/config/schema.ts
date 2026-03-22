import { z } from 'zod';
import type { HttpMethod } from '@apifold/transformer';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'] as const;

const authSchema = z.object({
  type: z.enum(['bearer', 'api_key', 'none']).default('none'),
  token: z.string().optional(),
  header: z.string().optional(),
});

const filtersSchema = z.object({
  tags: z.array(z.string()).optional(),
  methods: z.array(z.enum(HTTP_METHODS)).optional(),
  paths: z.array(z.string()).optional(),
});

export const configSchema = z.object({
  spec: z.string(),
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  transport: z.enum(['sse', 'streamable-http']).default('sse'),
  baseUrl: z.string().optional(),
  auth: authSchema.default({ type: 'none' }),
  filters: filtersSchema.default({}),
  includeDeprecated: z.boolean().default(false),
  logLevel: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type CliConfig = z.infer<typeof configSchema>;

export type FilterMethods = readonly HttpMethod[];

export function interpolateEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, key: string) => {
    const envValue = process.env[key.trim()];
    if (envValue === undefined) {
      throw new Error(`Environment variable "${key.trim()}" is not set`);
    }
    return envValue;
  });
}
