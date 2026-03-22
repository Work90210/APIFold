import fs from 'node:fs/promises';
import path from 'node:path';
import type { CommandModule } from 'yargs';
import { load as yamlLoad, JSON_SCHEMA } from 'js-yaml';
import { parseSpec, transformSpec } from '@apifold/transformer';
import { loadConfig } from '../config/loader.js';
import { startServer } from '../server/lightweight.js';

export const serveCommand: CommandModule = {
  command: 'serve [spec]',
  describe: 'Start an MCP server from an OpenAPI spec',
  builder: (yargs) =>
    yargs
      .positional('spec', { type: 'string', describe: 'Path to OpenAPI spec (JSON or YAML)' })
      .option('port', { alias: 'p', type: 'number', describe: 'Port to listen on' })
      .option('transport', { choices: ['sse', 'streamable-http'] as const, describe: 'Transport mode' })
      .option('base-url', { type: 'string', describe: 'Upstream API base URL' })
      .option('auth-header', { type: 'string', describe: 'Auth header (e.g. "Authorization: Bearer sk_xxx")' })
      .option('filter-tags', { type: 'array', string: true, describe: 'Only include operations with these tags' })
      .option('filter-methods', { type: 'array', string: true, describe: 'Only include these HTTP methods' })
      .option('filter-paths', { type: 'array', string: true, describe: 'Only include matching path patterns' })
      .option('include-deprecated', { type: 'boolean', describe: 'Include deprecated operations' })
      .option('config', { alias: 'c', type: 'string', describe: 'Path to config file' })
      .option('log-level', { type: 'string', describe: 'Log level' }),
  handler: async (argv) => {
    const config = await loadConfig({
      spec: argv['spec'] as string | undefined,
      port: argv['port'] as number | undefined,
      transport: argv['transport'] as string | undefined,
      baseUrl: argv['baseUrl'] as string | undefined,
      authHeader: argv['authHeader'] as string | undefined,
      filterTags: argv['filterTags'] as string[] | undefined,
      filterMethods: argv['filterMethods'] as string[] | undefined,
      filterPaths: argv['filterPaths'] as string[] | undefined,
      includeDeprecated: argv['includeDeprecated'] as boolean | undefined,
      config: argv['config'] as string | undefined,
      logLevel: argv['logLevel'] as string | undefined,
    });

    if (!config.spec) {
      process.stderr.write('Error: No specification file provided. Pass a spec path or set it in config.\n');
      process.exit(1);
    }

    const specPath = path.resolve(process.cwd(), config.spec);
    let content: string;
    try {
      content = await fs.readFile(specPath, 'utf-8');
    } catch {
      process.stderr.write(`Error: Cannot read spec file: ${specPath}\n`);
      process.exit(1);
    }

    let raw: unknown;
    try {
      raw = specPath.endsWith('.json')
        ? JSON.parse(content)
        : yamlLoad(content, { schema: JSON_SCHEMA });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Error: Failed to parse spec: ${msg}\n`);
      process.exit(1);
    }

    const parsed = parseSpec({ spec: raw as Record<string, unknown> });
    const result = transformSpec({
      spec: parsed.spec,
      filterTags: config.filters.tags,
      filterMethods: config.filters.methods,
      filterPaths: config.filters.paths,
      includeDeprecated: config.includeDeprecated,
    });

    if (result.tools.length === 0) {
      process.stderr.write('Warning: No tools generated from spec. Check your filters.\n');
    }

    process.stdout.write(
      `Transformed ${result.metadata.transformedCount}/${result.metadata.totalOperations} operations into MCP tools\n`,
    );

    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        process.stderr.write(`  warning: ${w.message}\n`);
      }
    }

    await startServer(config, result.tools);
  },
};
