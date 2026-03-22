import fs from 'node:fs/promises';
import path from 'node:path';
import type { CommandModule } from 'yargs';
import { load as yamlLoad, JSON_SCHEMA } from 'js-yaml';
import { parseSpec } from '@apifold/transformer';

export const validateCommand: CommandModule = {
  command: 'validate <spec>',
  describe: 'Validate an OpenAPI spec for MCP compatibility (parse-only with detailed warnings)',
  builder: (yargs) =>
    yargs.positional('spec', { type: 'string', demandOption: true, describe: 'Path to OpenAPI spec' }),
  handler: async (argv) => {
    const specPath = path.resolve(process.cwd(), argv['spec'] as string);

    process.stdout.write(`Validating ${specPath}...\n`);

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

    const result = parseSpec({ spec: raw as Record<string, unknown> });

    process.stdout.write(`\nSpec: ${result.spec.info.title} v${result.spec.info.version}\n`);
    process.stdout.write(`OpenAPI version: ${result.version}\n`);

    const pathCount = Object.keys(result.spec.paths ?? {}).length;
    process.stdout.write(`Paths: ${pathCount}\n`);

    if (result.warnings.length > 0) {
      process.stdout.write(`\nWarnings (${result.warnings.length}):\n`);
      for (const w of result.warnings) {
        process.stdout.write(`  - [${w.code}] ${w.message}\n`);
      }
    } else {
      process.stdout.write('\nNo warnings — spec is clean.\n');
    }

    process.stdout.write('\nValidation passed.\n');
  },
};
