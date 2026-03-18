import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseSpec } from '../src/parse.js';
import { transformSpec } from '../src/transform.js';
import type { TransformResult } from '../src/types.js';

const FIXTURES_DIR = join(__dirname, 'fixtures');
const SNAPSHOTS_DIR = join(__dirname, 'snapshots');
const UPDATE_SNAPSHOTS = process.env['UPDATE_SNAPSHOTS'] === '1';

function loadFixture(name: string): unknown {
  const filePath = join(FIXTURES_DIR, name);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function serializeResult(result: TransformResult): string {
  const serializable = {
    tools: result.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      _meta: t._meta,
    })),
    metadata: {
      specTitle: result.metadata.specTitle,
      specVersion: result.metadata.specVersion,
      openApiVersion: result.metadata.openApiVersion,
      totalOperations: result.metadata.totalOperations,
      transformedCount: result.metadata.transformedCount,
      skippedCount: result.metadata.skippedCount,
    },
    warningCodes: result.warnings.map((w) => w.code).sort(),
  };
  return JSON.stringify(serializable, null, 2);
}

function snapshotTest(fixtureName: string) {
  const snapshotName = fixtureName.replace(/\.(json|yaml)$/, '.snap.json');
  const snapshotPath = join(SNAPSHOTS_DIR, snapshotName);

  const raw = loadFixture(fixtureName);
  const parsed = parseSpec({ spec: raw });
  const result = transformSpec({ spec: parsed.spec });
  const serialized = serializeResult(result);

  if (UPDATE_SNAPSHOTS) {
    writeFileSync(snapshotPath, serialized, 'utf-8');
    return;
  }

  if (!existsSync(snapshotPath)) {
    throw new Error(
      `Snapshot missing: ${snapshotName}. Run with UPDATE_SNAPSHOTS=1 to create it.`,
    );
  }

  const existing = readFileSync(snapshotPath, 'utf-8');
  expect(serialized).toBe(existing);
}

const FIXTURE_FILES = [
  'petstore-3.0.json',
  'petstore-3.1.json',
  'minimal.json',
  'no-operation-ids.json',
  'circular-refs.json',
  'stripe.json',
  'github.json',
  'twilio.json',
  'sendgrid.json',
  'openai.json',
  'hubspot.json',
  'slack.json',
  'cloudflare.json',
  'large-spec.json',
];

describe('snapshot tests', () => {
  for (const fixture of FIXTURE_FILES) {
    it(`${fixture} matches snapshot`, () => {
      snapshotTest(fixture);
    });
  }
});
