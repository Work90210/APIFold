import fs from 'node:fs/promises';
import path from 'node:path';
import { load as yamlLoad, JSON_SCHEMA } from 'js-yaml';
import { configSchema, interpolateEnvVars, type CliConfig } from './schema.js';

const DEFAULT_CONFIG_FILES = [
  'apifold.config.yaml',
  'apifold.config.yml',
  'apifold.config.json',
] as const;

export interface CliFlags {
  readonly spec?: string;
  readonly port?: number;
  readonly transport?: string;
  readonly baseUrl?: string;
  readonly authHeader?: string;
  readonly filterTags?: readonly string[];
  readonly filterMethods?: readonly string[];
  readonly filterPaths?: readonly string[];
  readonly includeDeprecated?: boolean;
  readonly config?: string;
  readonly logLevel?: string;
}

export async function loadConfig(flags: CliFlags): Promise<CliConfig> {
  const fileConfig = await loadConfigFile(flags.config);
  const cliOverrides = buildCliOverrides(flags);

  const merged = deepMerge(fileConfig, cliOverrides);
  const interpolated = interpolateDeep(merged);

  const result = configSchema.safeParse(interpolated);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${formatted}`);
  }

  return Object.freeze(result.data);
}

async function loadConfigFile(explicitPath?: string): Promise<Record<string, unknown>> {
  const candidates = explicitPath
    ? [path.resolve(process.cwd(), explicitPath)]
    : DEFAULT_CONFIG_FILES.map((f) => path.resolve(process.cwd(), f));

  for (const filePath of candidates) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = filePath.endsWith('.json')
        ? (JSON.parse(content) as Record<string, unknown>)
        : (yamlLoad(content, { schema: JSON_SCHEMA }) as Record<string, unknown>);
      return parsed ?? {};
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        if (explicitPath) {
          throw new Error(`Config file not found: ${explicitPath}`);
        }
        continue;
      }
      throw err;
    }
  }

  return {};
}

function buildCliOverrides(flags: CliFlags): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};

  if (flags.spec !== undefined) overrides['spec'] = flags.spec;
  if (flags.port !== undefined) overrides['port'] = flags.port;
  if (flags.transport !== undefined) overrides['transport'] = flags.transport;
  if (flags.baseUrl !== undefined) overrides['baseUrl'] = flags.baseUrl;
  if (flags.logLevel !== undefined) overrides['logLevel'] = flags.logLevel;
  if (flags.includeDeprecated !== undefined) overrides['includeDeprecated'] = flags.includeDeprecated;

  if (flags.authHeader !== undefined) {
    const [headerName, ...rest] = flags.authHeader.split(':');
    const headerValue = rest.join(':').trim();
    if (headerName?.toLowerCase() === 'authorization' && headerValue.toLowerCase().startsWith('bearer ')) {
      overrides['auth'] = { type: 'bearer', token: headerValue.slice(7) };
    } else {
      overrides['auth'] = { type: 'api_key', header: headerName, token: headerValue };
    }
  }

  const filters: Record<string, unknown> = {};
  if (flags.filterTags !== undefined) filters['tags'] = flags.filterTags;
  if (flags.filterMethods !== undefined) filters['methods'] = flags.filterMethods;
  if (flags.filterPaths !== undefined) filters['paths'] = flags.filterPaths;
  if (Object.keys(filters).length > 0) overrides['filters'] = filters;

  return overrides;
}

function deepMerge(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(overrides)) {
    const baseVal = base[key];
    const overVal = overrides[key];

    if (
      baseVal !== null && overVal !== null &&
      typeof baseVal === 'object' && typeof overVal === 'object' &&
      !Array.isArray(baseVal) && !Array.isArray(overVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overVal as Record<string, unknown>,
      );
    } else {
      result[key] = overVal;
    }
  }

  return result;
}

function interpolateDeep(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.includes('${') ? interpolateEnvVars(obj) : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(interpolateDeep);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateDeep(value);
    }
    return result;
  }
  return obj;
}
