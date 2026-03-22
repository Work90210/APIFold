import fs from 'node:fs/promises';
import path from 'node:path';
import type { CommandModule } from 'yargs';
import { load as yamlLoad, JSON_SCHEMA } from 'js-yaml';
import { parseSpec, transformSpec, type HttpMethod } from '@apifold/transformer';

export const transformCommand: CommandModule = {
  command: 'transform <spec>',
  describe: 'Transform an OpenAPI spec into MCP tool definitions (JSON output)',
  builder: (yargs) =>
    yargs
      .positional('spec', { type: 'string', demandOption: true, describe: 'Path to OpenAPI spec' })
      .option('output', { alias: 'o', type: 'string', describe: 'Output file path (default: stdout)' })
      .option('filter-tags', { type: 'array', string: true, describe: 'Filter by tags' })
      .option('filter-methods', { type: 'array', string: true, describe: 'Filter by HTTP methods' })
      .option('include-deprecated', { type: 'boolean', default: false, describe: 'Include deprecated' }),
  handler: async (argv) => {
    const specPath = path.resolve(process.cwd(), argv['spec'] as string);

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
      filterTags: argv['filterTags'] as string[] | undefined,
      filterMethods: argv['filterMethods'] as HttpMethod[] | undefined,
      includeDeprecated: argv['includeDeprecated'] as boolean,
    });

    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        process.stderr.write(`warning: ${w.message}\n`);
      }
    }

    const output = JSON.stringify(result.tools, null, 2);

    if (argv['output']) {
      await fs.writeFile(argv['output'] as string, output, 'utf-8');
      process.stderr.write(`Wrote ${result.tools.length} tools to ${argv['output']}\n`);
    } else {
      process.stdout.write(output + '\n');
    }
  },
};
