import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseSpec, transformSpec } from '@apifold/transformer';

import { listAll } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = resolve(__dirname, '../specs');

async function validate(): Promise<void> {
  const entries = listAll();
  let passed = 0;
  let failed = 0;

  for (const entry of entries) {
    const specFile = resolve(SPECS_DIR, entry.specPath);

    try {
      const raw = await readFile(specFile, 'utf-8');
      const spec = JSON.parse(raw) as Record<string, unknown>;

      const parseResult = parseSpec({ spec });
      const transformResult = transformSpec({ spec: parseResult.spec });

      if (transformResult.tools.length === 0) {
        process.stderr.write(`  WARN: ${entry.id} — no tools generated\n`);
      }

      process.stdout.write(
        `  PASS: ${entry.id} — ${transformResult.tools.length} tools, ${parseResult.warnings.length} warnings\n`,
      );
      passed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`  FAIL: ${entry.id} — ${msg}\n`);
      failed++;
    }
  }

  process.stdout.write(`\n${passed} passed, ${failed} failed out of ${entries.length} specs\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

validate().catch((err) => {
  process.stderr.write(`Validation error: ${err}\n`);
  process.exit(1);
});
