/**
 * seed-public-tools.ts
 *
 * Populates mcp_tools for all public (is_public = true) servers by loading
 * their OpenAPI specs from the registry, running them through the transformer,
 * and inserting the resulting tool definitions — including http_method, http_path,
 * and param_map so the runtime can route tool calls directly to the upstream API.
 *
 * Run once after deploying migrations 0017 and 0018:
 *   pnpm tsx apps/web/scripts/seed-public-tools.ts
 */

import postgres from 'postgres';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSpec, parseSpec } from '@apifold/transformer';
import { listAll } from '../../../packages/registry/src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_SPECS_DIR = path.resolve(__dirname, '../../../packages/registry/specs');

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  process.stderr.write('DATABASE_URL is required\n');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 5 });

interface PublicServerRow {
  id: string;
  slug: string;
  spec_id: string;
}

async function main(): Promise<void> {
  process.stdout.write('Seeding tools for public MCP servers...\n');

  // Fetch all public server records
  const servers = await sql<PublicServerRow[]>`
    SELECT id, slug, spec_id
    FROM mcp_servers
    WHERE is_public = true AND is_active = true
  `;

  if (servers.length === 0) {
    process.stdout.write('No public servers found. Run migration 0017 first.\n');
    await sql.end();
    return;
  }

  process.stdout.write(`Found ${servers.length} public servers.\n`);

  const registryEntries = new Map(listAll().map((e) => [e.id, e]));

  let totalTools = 0;
  let totalErrors = 0;

  for (const server of servers) {
    const entry = registryEntries.get(server.slug);
    if (!entry) {
      process.stderr.write(`  [SKIP] ${server.slug}: not found in registry catalog\n`);
      continue;
    }

    const specPath = path.join(REGISTRY_SPECS_DIR, entry.specPath);
    if (!fs.existsSync(specPath)) {
      process.stderr.write(`  [SKIP] ${server.slug}: spec file not found at ${specPath}\n`);
      continue;
    }

    let rawSpec: unknown;
    try {
      rawSpec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    } catch (err) {
      process.stderr.write(`  [ERROR] ${server.slug}: failed to parse spec — ${err}\n`);
      totalErrors++;
      continue;
    }

    let tools;
    try {
      const parsed = parseSpec({ spec: rawSpec });
      const result = transformSpec({ spec: parsed.spec });
      tools = result.tools;
    } catch (err) {
      process.stderr.write(`  [ERROR] ${server.slug}: transformer failed — ${err}\n`);
      totalErrors++;
      continue;
    }

    if (tools.length === 0) {
      process.stderr.write(`  [WARN] ${server.slug}: transformer produced 0 tools\n`);
      continue;
    }

    // Upsert tools (insert, skip conflicts on server_id + name)
    let inserted = 0;
    for (const tool of tools) {
      try {
        await sql`
          INSERT INTO mcp_tools
            (server_id, name, description, input_schema, http_method, http_path, param_map, is_active)
          VALUES (
            ${server.id},
            ${tool.name},
            ${tool.description ?? null},
            ${sql.json(tool.inputSchema as unknown as Parameters<typeof sql.json>[0])},
            ${tool._meta.method ?? null},
            ${tool._meta.pathTemplate ?? null},
            ${sql.json((tool._meta.paramMap ?? {}) as unknown as Parameters<typeof sql.json>[0])},
            true
          )
          ON CONFLICT (server_id, name) DO UPDATE SET
            description = EXCLUDED.description,
            input_schema = EXCLUDED.input_schema,
            http_method = EXCLUDED.http_method,
            http_path = EXCLUDED.http_path,
            param_map = EXCLUDED.param_map,
            updated_at = NOW()
        `;
        inserted++;
      } catch (err) {
        process.stderr.write(`  [ERROR] ${server.slug}/${tool.name}: insert failed — ${err}\n`);
        totalErrors++;
      }
    }

    // Update tool_count on the sentinel spec
    await sql`
      UPDATE specs SET tool_count = ${inserted}, updated_at = NOW()
      WHERE id = ${server.spec_id}
    `;

    process.stdout.write(`  [OK] ${server.slug}: ${inserted}/${tools.length} tools seeded\n`);
    totalTools += inserted;
  }

  process.stdout.write(`\nDone. ${totalTools} tools seeded across ${servers.length} servers. ${totalErrors} errors.\n`);
  await sql.end();
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
