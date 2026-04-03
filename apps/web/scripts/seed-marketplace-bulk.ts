/**
 * Bulk-import ~2,500 APIs from the APIs.guru public catalog into the marketplace.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx apps/web/scripts/seed-marketplace-bulk.ts
 *
 * Safe to re-run (idempotent via ON CONFLICT). Never overwrites official listings.
 */
import postgres from 'postgres';
import { createHash } from 'node:crypto';
import { autoConvert, parseSpec, transformSpec } from '@apifold/transformer';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApisGuruEntry {
  readonly preferred: string;
  readonly versions: Record<
    string,
    {
      readonly swaggerUrl?: string;
      readonly openapiUrl?: string;
      readonly openapiVer?: string;
    }
  >;
  readonly info: {
    readonly title?: string;
    readonly description?: string;
    readonly 'x-logo'?: { readonly url?: string };
    readonly 'x-apisguru-categories'?: readonly string[];
    readonly contact?: { readonly url?: string; readonly email?: string };
  };
}

interface FlatEntry {
  readonly provider: string;
  readonly service: string | null;
  readonly entry: ApisGuruEntry;
}

interface Stats {
  total: number;
  processed: number;
  inserted: number;
  skippedFetch: number;
  skippedParse: number;
  skippedZeroTools: number;
  skippedOfficial: number;
  skippedTooLarge: number;
  errors: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const APIS_GURU_CATALOG = 'https://api.apis.guru/v2/list.json';
const AUTHOR_ID = 'system_apisguru_bulk';
const MAX_SPEC_BYTES = 10 * 1024 * 1024; // 10 MB
const FETCH_DELAY_MS = 200;
const FETCH_TIMEOUT_MS = 30_000;

const FEATURED_PROVIDERS = new Set([
  'stripe.com',
  'github.com',
  'googleapis.com',
  'slack.com',
  'twilio.com',
  'openai.com',
  'notion.so',
  'shopify.com',
  'hubspot.com',
  'atlassian.com',
  'microsoft.com',
  'salesforce.com',
  'discord.com',
  'spotify.com',
  'dropbox.com',
  'zoom.us',
  'sendgrid.com',
  'mailchimp.com',
  'cloudflare.com',
  'digitalocean.com',
]);

const CATEGORY_MAP: Record<string, string> = {
  payment: 'payments',
  financial: 'payments',
  messaging: 'communication',
  email: 'communication',
  social: 'communication',
  telecom: 'communication',
  developer_tools: 'developer-tools',
  tools: 'developer-tools',
  open_data: 'data',
  analytics: 'data',
  text: 'data',
  search: 'data',
  ecommerce: 'commerce',
  shopping: 'commerce',
  machine_learning: 'ai-ml',
  ai: 'ai-ml',
  cloud: 'infrastructure',
  hosting: 'infrastructure',
  iot: 'infrastructure',
  storage: 'infrastructure',
  backend: 'infrastructure',
  security: 'infrastructure',
  project_management: 'productivity',
  collaboration: 'productivity',
  support: 'crm',
  customer: 'crm',
  monitoring: 'monitoring',
  media: 'other',
  entertainment: 'other',
  location: 'data',
  transport: 'other',
  medical: 'other',
  education: 'other',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function computeSpecHash(spec: Record<string, unknown>): string {
  const canonical = JSON.stringify(spec, Object.keys(spec).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateSlug(provider: string, service: string | null): string {
  const base = provider.replace(/\.[a-z]+$/i, '');
  const parts = service ? `${base}-${service}` : base;
  const slug = toKebab(parts);
  const suffix = '-api';
  const maxBase = 80 - suffix.length;
  return slug.slice(0, maxBase) + suffix;
}

const KEYWORD_CATEGORY: ReadonlyArray<[RegExp, string]> = [
  [/\b(payment|billing|invoice|subscription|checkout|stripe|paypal|square)\b/i, 'payments'],
  [/\b(sms|email|messag\w*|chat|slack|twilio|sendgrid|mailchimp|notif\w*|voice|telecom)\b/i, 'communication'],
  [/\b(github|gitlab|bitbucket|ci.?cd|deploy|build|docker|kubernetes|npm|package|devops|repository)\b/i, 'developer-tools'],
  [/\b(notion|asana|linear|jira|trello|project.?management|task|calendar|todo|productivity|workspace)\b/i, 'productivity'],
  [/\b(analytics|data|database|sql|query|search|elastic|big.?query|dataset|warehouse)\b/i, 'data'],
  [/\b(shop|commerce|product|order|inventory|cart|merchant|catalog|retail)\b/i, 'commerce'],
  [/\b(ai|machine.?learn|llm|gpt|openai|model|neural|nlp|vision|speech|embedding)\b/i, 'ai-ml'],
  [/\b(cloud|aws|azure|gcp|server|host|dns|cdn|storage|bucket|s3|lambda|compute|infrastructure)\b/i, 'infrastructure'],
  [/\b(crm|salesforce|hubspot|customer|lead|contact|deal|pipeline|sales)\b/i, 'crm'],
  [/\b(monitor|alert|incident|log|metric|uptime|observ|apm|sentry|datadog|pagerduty)\b/i, 'monitoring'],
];

function mapCategory(guruCats: readonly string[] | undefined, title?: string, description?: string): string {
  // Try APIs.guru categories first
  if (guruCats) {
    for (const cat of guruCats) {
      const mapped = CATEGORY_MAP[cat];
      if (mapped) return mapped;
    }
  }
  // Fall back to keyword matching on title + description
  const text = `${title ?? ''} ${description ?? ''}`;
  for (const [pattern, category] of KEYWORD_CATEGORY) {
    if (pattern.test(text)) return category;
  }
  return 'other';
}

function detectAuthMode(
  spec: Record<string, unknown>,
): 'none' | 'api_key' | 'bearer' {
  const components = spec.components as Record<string, unknown> | undefined;
  const schemes = (components?.securitySchemes ??
    (spec as Record<string, unknown>).securityDefinitions) as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!schemes) return 'none';

  let hasApiKey = false;
  for (const scheme of Object.values(schemes)) {
    if (
      scheme.type === 'http' &&
      (scheme.scheme as string)?.toLowerCase() === 'bearer'
    )
      return 'bearer';
    if (scheme.type === 'oauth2') return 'bearer';
    if (scheme.type === 'apiKey') hasApiKey = true;
    if (
      scheme.type === 'http' &&
      (scheme.scheme as string)?.toLowerCase() === 'basic'
    )
      hasApiKey = true;
  }
  return hasApiKey ? 'api_key' : 'none';
}

function resolveServerUrl(spec: Record<string, unknown>): string {
  const servers = spec.servers as
    | Array<{
        url: string;
        variables?: Record<string, { default?: string }>;
      }>
    | undefined;
  if (!servers?.[0]?.url) return '';

  let url = servers[0].url;
  const vars = servers[0].variables;
  if (vars) {
    for (const [name, def] of Object.entries(vars)) {
      if (def.default) {
        url = url.replace(`{${name}}`, def.default);
      }
    }
  }
  return url;
}

function extractApiDocsUrl(
  spec: Record<string, unknown>,
  contactUrl: string | undefined,
): string | null {
  const docs = spec.externalDocs as { url?: string } | undefined;
  return docs?.url ?? contactUrl ?? null;
}

function generateShortDescription(
  title: string,
  description: string | undefined,
): string {
  if (description) {
    const clean = description.replace(/[#*_`\[\]]/g, '').trim();
    const first = clean.split(/[.\n]/)[0]?.trim() ?? clean;
    if (first.length <= 200) return first || `Access the ${title} API through MCP tools.`;
    return first.slice(0, 197) + '...';
  }
  return `Access the ${title} API through MCP tools.`;
}

function generateLongDescription(
  name: string,
  description: string | undefined,
  toolCount: number,
  category: string,
  tags: readonly string[],
): string {
  const desc =
    description?.trim() || `Connect your AI agent to the ${name} API.`;

  return `# ${name}

${desc}

## Capabilities

This MCP server exposes **${toolCount} tools** from the ${name} API, giving your AI agent direct access to its functionality.

**Category:** ${category}${tags.length > 0 ? `\n**Tags:** ${tags.join(', ')}` : ''}

## Getting started

Deploy this server with one click, configure your credentials, and start using the API through any MCP client (Claude, Cursor, Copilot, etc.).`.slice(
    0,
    10_000,
  );
}

function generateSetupGuide(
  authMode: 'none' | 'api_key' | 'bearer',
  name: string,
): string {
  switch (authMode) {
    case 'bearer':
      return `1. Sign up at the ${name} developer portal\n2. Generate an API key or access token\n3. Paste it as the Bearer token in your server credentials`;
    case 'api_key':
      return `1. Sign up at the ${name} developer portal\n2. Generate an API key\n3. Paste it as the API key in your server credentials`;
    case 'none':
      return 'No authentication required. This API is publicly accessible.';
  }
}

function extractTags(
  spec: Record<string, unknown>,
  guruCats: readonly string[] | undefined,
  provider: string,
): string[] {
  const tagSet = new Set<string>();

  const specTags = spec.tags as Array<{ name?: string }> | undefined;
  if (specTags) {
    for (const t of specTags.slice(0, 10)) {
      if (t.name) tagSet.add(t.name.toLowerCase());
    }
  }

  if (guruCats) {
    for (const c of guruCats) tagSet.add(c.toLowerCase());
  }

  const baseName = provider.replace(/\.[a-z]+$/i, '').toLowerCase();
  if (baseName.length > 1) tagSet.add(baseName);

  return [...tagSet].slice(0, 15);
}

// ─── Catalog Processing ─────────────────────────────────────────────────────

function flattenCatalog(
  catalog: Record<string, unknown>,
): FlatEntry[] {
  const entries: FlatEntry[] = [];

  for (const [provider, value] of Object.entries(catalog)) {
    const obj = value as Record<string, unknown>;

    if (typeof obj.preferred === 'string' && obj.versions) {
      entries.push({
        provider,
        service: null,
        entry: obj as unknown as ApisGuruEntry,
      });
    } else {
      for (const [service, svcVal] of Object.entries(obj)) {
        const svc = svcVal as Record<string, unknown>;
        if (typeof svc.preferred === 'string' && svc.versions) {
          entries.push({
            provider,
            service,
            entry: svc as unknown as ApisGuruEntry,
          });
        }
      }
    }
  }

  return entries;
}

// ─── Spec Fetching ───────────────────────────────────────────────────────────

async function fetchSpec(
  url: string,
): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Accept: 'application/json, application/yaml' },
      });

      if (res.status === 429 || res.status >= 500) {
        if (attempt === 0) {
          await sleep(2000);
          continue;
        }
        return null;
      }

      if (!res.ok) return null;

      const text = await res.text();
      if (text.length > MAX_SPEC_BYTES) return null;

      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (attempt === 0) {
        await sleep(1000);
        continue;
      }
      return null;
    }
  }
  return null;
}

// ─── Transformer Pipeline ────────────────────────────────────────────────────

async function processSpec(rawSpec: unknown): Promise<{
  toolCount: number;
  specVersion: string;
} | null> {
  const convertResult = await autoConvert(rawSpec);
  const parseResult = parseSpec({ spec: convertResult.spec });
  const transformResult = transformSpec({ spec: parseResult.spec });

  if (transformResult.tools.length === 0) return null;

  return {
    toolCount: transformResult.tools.length,
    specVersion: parseResult.version,
  };
}

// ─── Progress Logging ────────────────────────────────────────────────────────

function logProgress(stats: Stats): void {
  const pct = ((stats.processed / stats.total) * 100).toFixed(1);
  console.log(
    `[${stats.processed}/${stats.total}] (${pct}%) inserted=${stats.inserted} ` +
      `skip_fetch=${stats.skippedFetch} skip_parse=${stats.skippedParse} ` +
      `skip_0tools=${stats.skippedZeroTools} skip_official=${stats.skippedOfficial} ` +
      `skip_large=${stats.skippedTooLarge} errors=${stats.errors}`,
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL required');

  const needsSsl = process.env['DATABASE_SSL'] === 'true';
  const sql = postgres(url, {
    ssl: needsSsl
      ? {
          rejectUnauthorized:
            process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false',
        }
      : false,
  });

  // 1. Load official slugs to skip
  const officialRows = await sql`
    SELECT slug FROM marketplace_listings WHERE author_type = 'official'
  `;
  const officialSlugs = new Set(officialRows.map((r) => r.slug));
  console.log(`Found ${officialSlugs.size} official listings to protect.\n`);

  // 2. Fetch APIs.guru catalog
  console.log('Fetching APIs.guru catalog...');
  const catalogRes = await fetch(APIS_GURU_CATALOG, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!catalogRes.ok)
    throw new Error(`Catalog fetch failed: HTTP ${catalogRes.status}`);
  const catalog = (await catalogRes.json()) as Record<string, unknown>;

  // 3. Flatten
  const entries = flattenCatalog(catalog);
  console.log(`Catalog contains ${entries.length} API entries.\n`);

  const stats: Stats = {
    total: entries.length,
    processed: 0,
    inserted: 0,
    skippedFetch: 0,
    skippedParse: 0,
    skippedZeroTools: 0,
    skippedOfficial: 0,
    skippedTooLarge: 0,
    errors: 0,
  };

  const seenSlugs = new Set<string>();

  // 4. Process each entry
  for (const { provider, service, entry } of entries) {
    stats.processed++;

    const slug = generateSlug(provider, service);
    const label = service ? `${provider}/${service}` : provider;

    // Skip duplicates within this run
    if (seenSlugs.has(slug)) {
      stats.errors++;
      if (stats.processed % 50 === 0) logProgress(stats);
      continue;
    }
    seenSlugs.add(slug);

    // Skip official listings
    if (officialSlugs.has(slug)) {
      stats.skippedOfficial++;
      if (stats.processed % 50 === 0) logProgress(stats);
      continue;
    }

    // Get spec URL for preferred version
    const preferred = entry.versions[entry.preferred];
    const specUrl = preferred?.openapiUrl ?? preferred?.swaggerUrl;
    if (!specUrl) {
      stats.skippedFetch++;
      if (stats.processed % 50 === 0) logProgress(stats);
      continue;
    }

    try {
      // Fetch spec
      const rawSpec = await fetchSpec(specUrl);
      if (!rawSpec) {
        stats.skippedFetch++;
        await sleep(FETCH_DELAY_MS);
        if (stats.processed % 50 === 0) logProgress(stats);
        continue;
      }

      // Check size
      const specJson = JSON.stringify(rawSpec);
      if (specJson.length > MAX_SPEC_BYTES) {
        stats.skippedTooLarge++;
        console.log(`  SKIP (too large): ${label} — ${(specJson.length / 1024 / 1024).toFixed(1)}MB`);
        await sleep(FETCH_DELAY_MS);
        if (stats.processed % 50 === 0) logProgress(stats);
        continue;
      }

      // Transform pipeline
      let result: { toolCount: number; specVersion: string } | null;
      try {
        result = await processSpec(rawSpec);
      } catch (err) {
        stats.skippedParse++;
        await sleep(FETCH_DELAY_MS);
        if (stats.processed % 50 === 0) logProgress(stats);
        continue;
      }

      if (!result) {
        stats.skippedZeroTools++;
        await sleep(FETCH_DELAY_MS);
        if (stats.processed % 50 === 0) logProgress(stats);
        continue;
      }

      // Build listing fields — prefer spec's own info over catalog entry
      const catalogInfo = entry.info ?? {};
      const specInfo = (rawSpec.info ?? {}) as Record<string, unknown>;
      const name = (specInfo.title as string) ?? catalogInfo.title ?? provider.replace(/\.[a-z]+$/i, '');
      const description = (specInfo.description as string) ?? catalogInfo.description;
      const guruCats = catalogInfo['x-apisguru-categories'];
      const specTags = (specInfo['x-apisguru-categories'] ?? guruCats) as readonly string[] | undefined;
      const category = mapCategory(specTags ?? guruCats, name, description);
      const tags = extractTags(rawSpec, specTags ?? guruCats, provider);
      const authMode = detectAuthMode(rawSpec);
      const baseUrl = resolveServerUrl(rawSpec);
      const specLogo = (specInfo['x-logo'] as Record<string, string> | undefined)?.url;
      const iconUrl = specLogo ?? catalogInfo['x-logo']?.url ?? null;
      const specDocs = (rawSpec.externalDocs as Record<string, string> | undefined)?.url;
      const contactUrl = (specInfo.contact as Record<string, string> | undefined)?.url ?? catalogInfo.contact?.url;
      const docsUrl = specDocs ?? contactUrl ?? null;
      const specHash = computeSpecHash(rawSpec);
      const featured = FEATURED_PROVIDERS.has(provider);
      const shortDesc = generateShortDescription(name, description);
      const longDesc = generateLongDescription(
        name,
        description,
        result.toolCount,
        category,
        tags,
      );
      const setupGuide = generateSetupGuide(authMode, name);

      // Upsert
      await sql`
        INSERT INTO marketplace_listings (
          slug, name, short_description, long_description, category, tags,
          icon_url, author_id, author_type, raw_spec, spec_version,
          recommended_base_url, recommended_auth_mode, setup_guide,
          api_docs_url, status, featured, spec_hash
        ) VALUES (
          ${slug}, ${name}, ${shortDesc}, ${longDesc}, ${category},
          ${tags as unknown as string[]},
          ${iconUrl}, ${AUTHOR_ID}, 'community',
          ${specJson}, ${result.specVersion},
          ${baseUrl}, ${authMode}, ${setupGuide},
          ${docsUrl}, 'published', ${featured}, ${specHash}
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          short_description = EXCLUDED.short_description,
          long_description = EXCLUDED.long_description,
          category = EXCLUDED.category,
          icon_url = EXCLUDED.icon_url,
          tags = EXCLUDED.tags,
          raw_spec = EXCLUDED.raw_spec,
          spec_version = EXCLUDED.spec_version,
          spec_hash = EXCLUDED.spec_hash,
          setup_guide = EXCLUDED.setup_guide,
          api_docs_url = EXCLUDED.api_docs_url,
          recommended_base_url = EXCLUDED.recommended_base_url,
          recommended_auth_mode = EXCLUDED.recommended_auth_mode,
          featured = EXCLUDED.featured,
          status = 'published'
        WHERE marketplace_listings.author_type != 'official'
      `;

      stats.inserted++;
    } catch (err) {
      stats.errors++;
      console.error(`  ERROR: ${label} — ${err instanceof Error ? err.message : err}`);
    }

    await sleep(FETCH_DELAY_MS);
    if (stats.processed % 50 === 0) logProgress(stats);
  }

  // Final report
  console.log('\n─── Done ───────────────────────────────────────');
  logProgress(stats);
  console.log(`\nMarketplace now has ${stats.inserted} new/updated community listings.`);

  await sql.end();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
