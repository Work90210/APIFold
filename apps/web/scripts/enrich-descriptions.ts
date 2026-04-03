/**
 * Enrich thin marketplace listing descriptions with actual tool names from the spec.
 * Replaces generic "Access the X API through MCP tools" with real capability lists.
 *
 * Usage: DATABASE_URL=... DATABASE_SSL=true npx tsx apps/web/scripts/enrich-descriptions.ts
 */
import postgres from 'postgres';

interface SpecInfo {
  readonly title?: string;
  readonly description?: string;
}

interface SpecPath {
  readonly [method: string]: {
    readonly summary?: string;
    readonly operationId?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
  };
}

function extractToolNames(rawSpec: Record<string, unknown>): string[] {
  const paths = rawSpec.paths as Record<string, SpecPath> | undefined;
  if (!paths) return [];

  const tools: string[] = [];
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (method === 'parameters' || method === 'summary' || method === 'description') continue;
      const name = op.operationId ?? op.summary ?? `${method.toUpperCase()} ${path}`;
      if (name) tools.push(name);
    }
  }
  return tools;
}

function extractTags(rawSpec: Record<string, unknown>): string[] {
  const tags = rawSpec.tags as Array<{ name?: string; description?: string }> | undefined;
  if (!tags) return [];
  return tags.map((t) => t.name).filter(Boolean) as string[];
}

function generateRichShortDescription(
  name: string,
  currentDesc: string,
  toolCount: number,
  specDesc: string | undefined,
): string {
  // Keep good descriptions, only replace generic fallbacks
  if (!currentDesc.startsWith('Access the ') || !currentDesc.endsWith('through MCP tools.')) {
    return currentDesc;
  }
  if (specDesc) {
    const clean = specDesc.replace(/[#*_`\[\]]/g, '').trim();
    const first = clean.split(/[.\n]/)[0]?.trim() ?? clean;
    if (first.length > 5 && first.length <= 200) return first;
    if (first.length > 200) return first.slice(0, 197) + '...';
  }
  return `Connect to ${name} with ${toolCount} MCP tools for AI-powered API automation.`;
}

function generateRichLongDescription(
  name: string,
  specDesc: string | undefined,
  tools: string[],
  tags: string[],
  category: string,
  toolCount: number,
): string {
  const desc = specDesc?.trim() || `Connect your AI agent to the ${name} API.`;

  // Pick up to 15 representative tool names
  const sampleTools = tools.slice(0, 15);
  const toolSection =
    sampleTools.length > 0
      ? `## Available Tools\n\nThis server exposes **${toolCount} tools** including:\n\n${sampleTools.map((t) => `- \`${t}\``).join('\n')}${toolCount > 15 ? `\n- ...and ${toolCount - 15} more` : ''}`
      : `## Capabilities\n\nThis MCP server exposes **${toolCount} tools** from the ${name} API.`;

  const tagSection =
    tags.length > 0
      ? `\n\n**Tags:** ${tags.join(', ')}`
      : '';

  return `# ${name}

${desc}

${toolSection}

**Category:** ${category}${tagSection}

## Getting Started

1. Click **Deploy** to add this server to your account
2. Configure your API credentials
3. Connect from Claude, Cursor, or any MCP client

Deploy takes seconds — no code required.`.slice(0, 10_000);
}

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL required');

  const needsSsl = process.env['DATABASE_SSL'] === 'true';
  const sql = postgres(url, {
    ssl: needsSsl
      ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
      : false,
  });

  // Fetch all community listings with their specs
  const listings = await sql`
    SELECT id, slug, name, short_description, long_description, category, raw_spec
    FROM marketplace_listings
    WHERE author_type = 'community' AND status = 'published'
    ORDER BY slug
  `;

  console.log(`Processing ${listings.length} community listings...\n`);

  let updated = 0;
  let skipped = 0;

  for (const listing of listings) {
    const rawSpec = listing.raw_spec as Record<string, unknown>;
    const specInfo = (rawSpec.info ?? {}) as SpecInfo;
    const tools = extractToolNames(rawSpec);
    const tags = extractTags(rawSpec);
    const toolCount = tools.length || 1;

    const newShort = generateRichShortDescription(
      listing.name,
      listing.short_description,
      toolCount,
      specInfo.description,
    );
    const newLong = generateRichLongDescription(
      listing.name,
      specInfo.description,
      tools,
      tags,
      listing.category,
      toolCount,
    );

    // Only update if something changed
    if (newShort === listing.short_description && newLong === listing.long_description) {
      skipped++;
      continue;
    }

    await sql`
      UPDATE marketplace_listings
      SET short_description = ${newShort}, long_description = ${newLong}
      WHERE id = ${listing.id}
    `;
    updated++;

    if (updated % 100 === 0) {
      console.log(`[${updated} updated, ${skipped} skipped]`);
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
  await sql.end();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
