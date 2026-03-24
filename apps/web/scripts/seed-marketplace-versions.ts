import postgres from 'postgres';
import { createHash } from 'node:crypto';

interface VersionSeed {
  readonly listingSlug: string;
  readonly version: string;
  readonly changelog: string | null;
  readonly toolCount: number;
  readonly daysAgo: number;
}

const VERSIONS: readonly VersionSeed[] = [
  // Stripe
  { listingSlug: 'stripe-api', version: '1.0.0', changelog: null, toolCount: 42, daysAgo: 90 },
  { listingSlug: 'stripe-api', version: '1.1.0', changelog: '- Added PaymentIntent endpoints\n- Added Subscription lifecycle tools\n- Fixed refund partial amount handling', toolCount: 56, daysAgo: 60 },
  { listingSlug: 'stripe-api', version: '2.0.0', changelog: '- Breaking: Migrated from Charges to PaymentIntents as default\n- Added Invoice finalization tools\n- Added Product and Price management\n- Removed deprecated token-based charge flow', toolCount: 78, daysAgo: 30 },
  { listingSlug: 'stripe-api', version: '3.1.0', changelog: '- Added Payout management tools\n- Added Customer portal session creation\n- Added Tax rate management\n- Improved error messages for declined payments', toolCount: 95, daysAgo: 0 },

  // GitHub
  { listingSlug: 'github-api', version: '1.0.0', changelog: null, toolCount: 35, daysAgo: 85 },
  { listingSlug: 'github-api', version: '2.0.0', changelog: '- Added Actions workflow triggers\n- Added PR review request tools\n- Added file content read/write\n- Breaking: Renamed repo endpoints for consistency', toolCount: 68, daysAgo: 45 },
  { listingSlug: 'github-api', version: '3.1.0', changelog: '- Added code search across repos\n- Added release asset upload\n- Added branch protection rules\n- Added Dependabot alert management', toolCount: 112, daysAgo: 0 },

  // Notion
  { listingSlug: 'notion-api', version: '1.0.0', changelog: null, toolCount: 18, daysAgo: 75 },
  { listingSlug: 'notion-api', version: '2.0.0', changelog: '- Added database query with complex filters\n- Added block append and update\n- Added page property updates\n- Breaking: Changed page creation payload format', toolCount: 34, daysAgo: 30 },
  { listingSlug: 'notion-api', version: '3.0.0', changelog: '- Added comment creation and listing\n- Added user lookup\n- Added workspace-wide search\n- Improved database sort options', toolCount: 45, daysAgo: 0 },

  // Linear
  { listingSlug: 'linear-api', version: '1.0.0', changelog: null, toolCount: 22, daysAgo: 70 },
  { listingSlug: 'linear-api', version: '2.0.0', changelog: '- Added cycle management\n- Added project milestones\n- Added label management\n- Breaking: Issue state transitions now use state IDs', toolCount: 38, daysAgo: 25 },
  { listingSlug: 'linear-api', version: '3.0.0', changelog: '- Added team workload views\n- Added comment threading\n- Added custom workflow automations\n- Improved bulk issue updates', toolCount: 52, daysAgo: 0 },

  // OpenAI
  { listingSlug: 'openai-api', version: '1.0.0', changelog: null, toolCount: 8, daysAgo: 80 },
  { listingSlug: 'openai-api', version: '2.0.0', changelog: '- Added GPT-4o support\n- Added DALL-E 3 image generation\n- Added text-embedding-3 models\n- Breaking: Removed legacy completions endpoint', toolCount: 15, daysAgo: 40 },
  { listingSlug: 'openai-api', version: '3.0.0', changelog: '- Added Whisper transcription\n- Added TTS voice generation\n- Added fine-tuning job management\n- Added file upload for training data\n- Added batch API support', toolCount: 24, daysAgo: 0 },

  // Resend
  { listingSlug: 'resend-api', version: '1.0.0', changelog: null, toolCount: 5, daysAgo: 60 },
  { listingSlug: 'resend-api', version: '2.0.0', changelog: '- Added batch email sending\n- Added domain management\n- Added API key management\n- Improved delivery status tracking', toolCount: 12, daysAgo: 15 },
  { listingSlug: 'resend-api', version: '3.0.0', changelog: '- Added audience/contact management\n- Added email scheduling\n- Added webhook configuration', toolCount: 18, daysAgo: 0 },

  // Twilio
  { listingSlug: 'twilio-api', version: '1.0.0', changelog: null, toolCount: 12, daysAgo: 65 },
  { listingSlug: 'twilio-api', version: '2.0.0', changelog: '- Added messaging service pools\n- Added phone number search and purchase\n- Improved voice call management', toolCount: 22, daysAgo: 20 },
  { listingSlug: 'twilio-api', version: '3.0.0', changelog: '- Added WhatsApp messaging\n- Added conversation API\n- Added call recording management', toolCount: 30, daysAgo: 0 },

  // Shopify
  { listingSlug: 'shopify-admin-api', version: '1.0.0', changelog: null, toolCount: 28, daysAgo: 55 },
  { listingSlug: 'shopify-admin-api', version: '2.0.0', changelog: '- Added inventory management across locations\n- Added collection management\n- Added discount code creation\n- Breaking: Order endpoints use new fulfillment API', toolCount: 48, daysAgo: 15 },
  { listingSlug: 'shopify-admin-api', version: '3.0.0', changelog: '- Added metafield management\n- Added draft order creation\n- Added customer segmentation queries', toolCount: 62, daysAgo: 0 },

  // Sentry
  { listingSlug: 'sentry-api', version: '1.0.0', changelog: null, toolCount: 15, daysAgo: 50 },
  { listingSlug: 'sentry-api', version: '3.0.0', changelog: '- Added performance transaction queries\n- Added release deploy tracking\n- Added alert rule management\n- Added bulk issue triage', toolCount: 35, daysAgo: 0 },

  // HubSpot
  { listingSlug: 'hubspot-api', version: '1.0.0', changelog: null, toolCount: 20, daysAgo: 45 },
  { listingSlug: 'hubspot-api', version: '3.0.0', changelog: '- Added deal pipeline management\n- Added ticket creation\n- Added engagement logging (calls, emails, meetings)\n- Added custom property creation\n- Added list segmentation', toolCount: 55, daysAgo: 0 },
];

function computeHash(slug: string, version: string): string {
  return createHash('sha256').update(`${slug}:${version}`).digest('hex');
}

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL required');

  const needsSsl = process.env['DATABASE_SSL'] === 'true';
  const sql = postgres(url, {
    ssl: needsSsl ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' } : false,
  });

  for (const v of VERSIONS) {
    const [listing] = await sql`SELECT id FROM marketplace_listings WHERE slug = ${v.listingSlug}`;
    if (!listing) {
      console.log(`  Skipped: ${v.listingSlug} (listing not found)`);
      continue;
    }

    const createdAt = new Date(Date.now() - v.daysAgo * 86400000).toISOString();
    const specHash = computeHash(v.listingSlug, v.version);
    const rawSpec = JSON.stringify({
      openapi: v.version.startsWith('3.1') ? '3.1.0' : '3.0.0',
      info: { title: v.listingSlug, version: v.version },
      paths: {},
    });

    await sql`
      INSERT INTO marketplace_versions (listing_id, version, spec_hash, raw_spec, changelog, tool_count, created_at)
      VALUES (${listing.id}, ${v.version}, ${specHash}, ${rawSpec}, ${v.changelog}, ${v.toolCount}, ${createdAt})
      ON CONFLICT (listing_id, version) DO UPDATE SET
        changelog = EXCLUDED.changelog,
        tool_count = EXCLUDED.tool_count
    `;

    console.log(`  ${v.listingSlug} v${v.version} (${v.toolCount} tools)`);
  }

  console.log(`\nSeeded ${VERSIONS.length} versions.`);
  await sql.end();
}

main();
