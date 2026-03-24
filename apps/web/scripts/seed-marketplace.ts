import postgres from 'postgres';
import { createHash } from 'node:crypto';

interface SeedListing {
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly longDescription: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly iconUrl: string;
  readonly authorType: 'official' | 'community' | 'verified';
  readonly specVersion: string;
  readonly recommendedBaseUrl: string;
  readonly recommendedAuthMode: 'none' | 'api_key' | 'bearer';
  readonly setupGuide: string;
  readonly apiDocsUrl: string;
  readonly featured: boolean;
}

const SEED_LISTINGS: readonly SeedListing[] = [
  {
    slug: 'stripe-api',
    name: 'Stripe',
    shortDescription: 'Process payments, manage customers, subscriptions, invoices, and payouts through the Stripe API.',
    longDescription: `# Stripe

Give your AI agent full control over Stripe's payment infrastructure. This MCP server exposes Stripe's core API as callable tools.

## What your agent can do

- **Create and manage customers** — look up customers by email, create new ones, update metadata
- **Process payments** — create PaymentIntents, confirm charges, capture authorized payments
- **Subscriptions** — create, update, pause, resume, and cancel subscriptions on any pricing plan
- **Invoices** — generate, send, void, and mark invoices as paid
- **Refunds** — issue full or partial refunds on any charge or PaymentIntent
- **Payment methods** — attach, detach, and list cards, bank accounts, and wallets for a customer
- **Products & Prices** — create product catalog entries and pricing tiers programmatically
- **Payouts** — trigger and list payouts to connected bank accounts

## Example prompts

- "Create a customer for jane@example.com and subscribe them to the Pro plan"
- "Refund the last charge for customer cus_abc123"
- "List all invoices from this month that are still unpaid"
- "Create a new product called 'Enterprise Plan' at $299/month"`,
    category: 'payments',
    tags: ['payments', 'billing', 'subscriptions', 'invoices'],
    iconUrl: '/marketplace/logos/stripe.svg',
    authorType: 'official',
    specVersion: '3.1.0',
    recommendedBaseUrl: 'https://api.stripe.com',
    recommendedAuthMode: 'bearer',
    setupGuide: `1. Go to [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret Key** (starts with \`sk_live_\` or \`sk_test_\`)
3. Paste it as the Bearer token in your server credentials
4. Use test mode keys (\`sk_test_\`) for development`,
    apiDocsUrl: 'https://stripe.com/docs/api',
    featured: true,
  },
  {
    slug: 'github-api',
    name: 'GitHub',
    shortDescription: 'Manage repositories, issues, pull requests, actions, and releases through the GitHub REST API.',
    longDescription: `# GitHub

Connect your AI agent to GitHub's REST API v3. Full read/write access to repositories, issues, pull requests, and CI/CD workflows.

## What your agent can do

- **Repositories** — list, create, delete repos; manage branches, tags, and releases
- **Issues** — create, update, close, label, and assign issues; add comments
- **Pull Requests** — open PRs, request reviews, merge, list changed files, add comments
- **Actions** — trigger workflow runs, list workflow status, download artifacts
- **Contents** — read and write files directly in a repository
- **Users & Orgs** — look up users, list org members, manage team membership
- **Releases** — create releases, upload assets, manage release notes
- **Search** — search code, issues, repositories, and users across all of GitHub

## Example prompts

- "Create an issue in my-org/backend titled 'Fix login timeout' with the bug label"
- "List all open PRs in the frontend repo that are awaiting review"
- "Trigger the deploy workflow on the main branch"
- "What files changed in PR #142?"`,
    category: 'developer-tools',
    tags: ['git', 'repositories', 'ci-cd', 'issues', 'pull-requests'],
    iconUrl: '/marketplace/logos/github.svg',
    authorType: 'official',
    specVersion: '3.1.0',
    recommendedBaseUrl: 'https://api.github.com',
    recommendedAuthMode: 'bearer',
    setupGuide: `1. Go to [GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Generate a new token with the repository and organization scopes you need
3. Paste the token (starts with \`github_pat_\`) as the Bearer token`,
    apiDocsUrl: 'https://docs.github.com/en/rest',
    featured: true,
  },
  {
    slug: 'notion-api',
    name: 'Notion',
    shortDescription: 'Create pages, query databases, manage blocks, and search across your Notion workspace.',
    longDescription: `# Notion

Give your AI agent structured access to your Notion workspace. Read and write pages, query databases, and manage content blocks.

## What your agent can do

- **Pages** — create, update, archive pages; set properties, icons, and covers
- **Databases** — query with filters and sorts, create entries, update properties
- **Blocks** — append, update, and delete content blocks (text, headings, lists, code, etc.)
- **Search** — full-text search across all pages and databases in the workspace
- **Users** — list workspace members and their roles
- **Comments** — create and list comments on pages and discussions

## Example prompts

- "Find all tasks in the Sprint Board database that are marked 'In Progress'"
- "Create a new page in the Engineering Wiki titled 'Deployment Guide'"
- "Add a code block to the API Reference page with this Python example"
- "Search for any page mentioning 'authentication flow'"`,
    category: 'productivity',
    tags: ['notes', 'databases', 'wiki', 'knowledge-base'],
    iconUrl: '/marketplace/logos/notion.svg',
    authorType: 'official',
    specVersion: '3.0.0',
    recommendedBaseUrl: 'https://api.notion.com',
    recommendedAuthMode: 'bearer',
    setupGuide: `1. Go to [Notion → My Integrations](https://www.notion.so/my-integrations)
2. Create a new internal integration
3. Copy the **Internal Integration Secret** (starts with \`ntn_\`)
4. Share your Notion pages/databases with the integration (click ••• → Connections)`,
    apiDocsUrl: 'https://developers.notion.com',
    featured: true,
  },
  {
    slug: 'linear-api',
    name: 'Linear',
    shortDescription: 'Create issues, manage projects and cycles, track team workload, and automate workflows in Linear.',
    longDescription: `# Linear

Connect your AI agent to Linear for issue tracking and project management. Create, update, and query issues, projects, and cycles.

## What your agent can do

- **Issues** — create, update, assign, label, and transition issues through workflow states
- **Projects** — list projects, track milestones, manage project updates
- **Cycles** — view current and upcoming cycles, add/remove issues from cycles
- **Teams** — list teams, view team members and their workload
- **Labels** — create and manage issue labels
- **Comments** — add comments and activity to issues
- **Workflows** — trigger automations and state transitions

## Example prompts

- "Create a high-priority bug in the Backend team: 'API returns 500 on /users endpoint'"
- "What issues are assigned to me in the current cycle?"
- "Move issue LIN-423 to 'In Review' and assign it to Sarah"
- "List all issues labeled 'P0' that are still in Backlog"`,
    category: 'productivity',
    tags: ['project-management', 'issues', 'agile', 'tracking'],
    iconUrl: '/marketplace/logos/linear.svg',
    authorType: 'official',
    specVersion: '3.0.0',
    recommendedBaseUrl: 'https://api.linear.app',
    recommendedAuthMode: 'bearer',
    setupGuide: `1. Go to Linear → Settings → API → Personal API keys
2. Create a new API key
3. Paste it as the Bearer token`,
    apiDocsUrl: 'https://developers.linear.app',
    featured: true,
  },
  {
    slug: 'resend-api',
    name: 'Resend',
    shortDescription: 'Send transactional and marketing emails, manage domains, and track delivery status via Resend.',
    longDescription: `# Resend

Give your AI agent the ability to send emails programmatically. Transactional emails, domain management, and delivery tracking.

## What your agent can do

- **Send emails** — send HTML or plain text emails with attachments, CC, BCC, reply-to
- **Batch sending** — send up to 100 emails in a single API call
- **Domains** — add, verify, and manage sending domains
- **API keys** — create and revoke API keys programmatically
- **Emails** — retrieve email status, list sent emails

## Example prompts

- "Send a welcome email to kyle@example.com from hello@myapp.com"
- "Check the delivery status of the last email sent to that address"
- "List all verified sending domains"`,
    category: 'communication',
    tags: ['email', 'transactional', 'smtp'],
    iconUrl: '/marketplace/logos/resend.svg',
    authorType: 'official',
    specVersion: '3.0.0',
    recommendedBaseUrl: 'https://api.resend.com',
    recommendedAuthMode: 'bearer',
    setupGuide: `1. Go to [Resend Dashboard → API Keys](https://resend.com/api-keys)
2. Create a new API key with the appropriate permissions
3. Paste it as the Bearer token (starts with \`re_\`)`,
    apiDocsUrl: 'https://resend.com/docs/api-reference',
    featured: false,
  },
  {
    slug: 'openai-api',
    name: 'OpenAI',
    shortDescription: 'Access GPT-4o, DALL-E 3, Whisper, TTS, embeddings, and fine-tuning through the OpenAI API.',
    longDescription: `# OpenAI

Give your AI agent access to OpenAI's full model suite. Generate text, create images, transcribe audio, compute embeddings, and manage fine-tuned models.

## What your agent can do

- **Chat completions** — call GPT-4o, GPT-4o-mini, o1, o3 with system prompts and tool use
- **Image generation** — create images with DALL-E 3, edit existing images
- **Embeddings** — compute vector embeddings with text-embedding-3-small/large
- **Audio** — transcribe audio with Whisper, generate speech with TTS
- **Fine-tuning** — create fine-tuning jobs, list models, upload training data
- **Files** — upload and manage files for fine-tuning and assistants
- **Models** — list available models, check capabilities

## Example prompts

- "Generate an embedding for this product description using text-embedding-3-small"
- "Create a DALL-E 3 image of a minimalist logo for a coffee shop"
- "Transcribe this audio file using Whisper"
- "Start a fine-tuning job on GPT-4o-mini with the uploaded training data"`,
    category: 'ai-ml',
    tags: ['ai', 'llm', 'gpt', 'embeddings', 'image-generation'],
    iconUrl: '/marketplace/logos/openai.svg',
    authorType: 'official',
    specVersion: '3.0.0',
    recommendedBaseUrl: 'https://api.openai.com',
    recommendedAuthMode: 'bearer',
    setupGuide: `1. Go to [OpenAI Platform → API Keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Paste it as the Bearer token (starts with \`sk-\`)
4. Ensure your account has billing enabled and sufficient credits`,
    apiDocsUrl: 'https://platform.openai.com/docs/api-reference',
    featured: true,
  },
  {
    slug: 'twilio-api',
    name: 'Twilio',
    shortDescription: 'Send SMS messages, make voice calls, manage phone numbers, and handle messaging services via Twilio.',
    longDescription: `# Twilio

Give your AI agent the ability to communicate via SMS, voice, and messaging channels through Twilio's programmable communications platform.

## What your agent can do

- **SMS** — send and receive text messages, manage conversations
- **Voice** — initiate outbound calls, manage call routing
- **Phone numbers** — search, purchase, and configure phone numbers
- **Messaging services** — create and manage messaging service pools
- **Message status** — check delivery status and read receipts

## Example prompts

- "Send an SMS to +1234567890 saying 'Your order has shipped'"
- "List all phone numbers in my account"
- "Check the delivery status of message SID SM_abc123"`,
    category: 'communication',
    tags: ['sms', 'voice', 'messaging', 'phone'],
    iconUrl: '/marketplace/logos/twilio.svg',
    authorType: 'official',
    specVersion: '3.0.0',
    recommendedBaseUrl: 'https://api.twilio.com',
    recommendedAuthMode: 'api_key',
    setupGuide: `1. Go to [Twilio Console](https://console.twilio.com)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Use Account SID as the API key username and Auth Token as the secret`,
    apiDocsUrl: 'https://www.twilio.com/docs/usage/api',
    featured: false,
  },
  {
    slug: 'shopify-admin-api',
    name: 'Shopify',
    shortDescription: 'Manage products, orders, customers, inventory, and collections through the Shopify Admin API.',
    longDescription: `# Shopify

Connect your AI agent to your Shopify store. Full admin access to products, orders, customers, and inventory management.

## What your agent can do

- **Products** — create, update, delete products; manage variants, images, and metafields
- **Orders** — list, create, fulfill, cancel, and refund orders
- **Customers** — create, search, and update customer records
- **Inventory** — track and adjust inventory levels across locations
- **Collections** — manage manual and automated product collections
- **Discounts** — create and manage discount codes and automatic discounts

## Example prompts

- "Create a new product 'Summer T-Shirt' with sizes S, M, L at $29.99"
- "List all unfulfilled orders from this week"
- "Update inventory for SKU TSHIRT-BLK-M to 150 units at the main warehouse"
- "How many customers placed their first order this month?"`,
    category: 'commerce',
    tags: ['ecommerce', 'orders', 'products', 'inventory'],
    iconUrl: '/marketplace/logos/shopify.svg',
    authorType: 'official',
    specVersion: '3.0.0',
    recommendedBaseUrl: 'https://your-store.myshopify.com',
    recommendedAuthMode: 'bearer',
    setupGuide: `1. Go to Shopify Admin → Settings → Apps and sales channels → Develop apps
2. Create a new app and configure the Admin API scopes you need
3. Install the app and copy the **Admin API access token**
4. Update the base URL to your store: \`https://your-store.myshopify.com\``,
    apiDocsUrl: 'https://shopify.dev/docs/api/admin-rest',
    featured: false,
  },
  {
    slug: 'sentry-api',
    name: 'Sentry',
    shortDescription: 'Query errors, track performance, manage releases, and resolve issues through the Sentry API.',
    longDescription: `# Sentry

Give your AI agent access to your application monitoring data. Query errors, track performance, and manage your release pipeline.

## What your agent can do

- **Issues** — list, resolve, ignore, and assign error issues; bulk triage
- **Events** — query error events with stack traces and breadcrumbs
- **Performance** — list slow transactions, query performance metrics
- **Releases** — create releases, associate commits, track deploy status
- **Projects** — list projects, update settings, manage alert rules
- **Teams** — manage team membership and notification rules

## Example prompts

- "What are the top 5 unresolved issues in the production project this week?"
- "Resolve all issues tagged as 'handled' in the backend project"
- "Create a release v2.3.1 and associate it with the latest deploy"
- "Show me the stack trace for the most recent TypeError"`,
    category: 'monitoring',
    tags: ['errors', 'performance', 'monitoring', 'observability'],
    iconUrl: '/marketplace/logos/sentry.svg',
    authorType: 'official',
    specVersion: '3.0.0',
    recommendedBaseUrl: 'https://sentry.io/api/0',
    recommendedAuthMode: 'bearer',
    setupGuide: `1. Go to Sentry → Settings → Auth Tokens → [Create New Token](https://sentry.io/settings/auth-tokens/)
2. Select the required scopes: \`project:read\`, \`event:read\`, \`org:read\`
3. Paste the token as the Bearer token`,
    apiDocsUrl: 'https://docs.sentry.io/api/',
    featured: false,
  },
  {
    slug: 'hubspot-api',
    name: 'HubSpot',
    shortDescription: 'Manage contacts, deals, companies, tickets, and marketing campaigns through the HubSpot CRM API.',
    longDescription: `# HubSpot

Connect your AI agent to HubSpot CRM. Full access to contacts, deals, companies, and the marketing automation pipeline.

## What your agent can do

- **Contacts** — create, update, search, and merge contact records
- **Deals** — create deals, move through pipeline stages, update amounts and close dates
- **Companies** — manage company records, associate with contacts and deals
- **Tickets** — create support tickets, update status, assign to team members
- **Engagements** — log calls, emails, meetings, and notes against records
- **Lists** — create and manage contact lists for segmentation
- **Properties** — create custom properties on any CRM object

## Example prompts

- "Create a contact for Sarah Chen (sarah@acme.com) at Acme Corp"
- "Move deal 'Enterprise License' to 'Contract Sent' stage"
- "List all deals closing this quarter worth over $10,000"
- "How many new contacts were created this week?"`,
    category: 'crm',
    tags: ['crm', 'contacts', 'deals', 'marketing'],
    iconUrl: '/marketplace/logos/hubspot.svg',
    authorType: 'official',
    specVersion: '3.0.0',
    recommendedBaseUrl: 'https://api.hubapi.com',
    recommendedAuthMode: 'bearer',
    setupGuide: `1. Go to HubSpot → Settings → Integrations → Private Apps
2. Create a private app with the CRM scopes you need
3. Copy the access token and paste it as the Bearer token`,
    apiDocsUrl: 'https://developers.hubspot.com/docs/api/overview',
    featured: false,
  },
];

function computeHash(spec: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(spec)).digest('hex');
}

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL required');

  const needsSsl = process.env['DATABASE_SSL'] === 'true';
  const sql = postgres(url, {
    ssl: needsSsl ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' } : false,
  });

  const systemAuthorId = 'system_apifold_official';

  for (const listing of SEED_LISTINGS) {
    const dummySpec = {
      openapi: listing.specVersion,
      info: { title: listing.name, version: '1.0.0' },
      paths: {},
    };

    const specHash = computeHash(dummySpec);

    await sql`
      INSERT INTO marketplace_listings (
        slug, name, short_description, long_description, category, tags,
        icon_url, author_id, author_type, raw_spec, spec_version,
        recommended_base_url, recommended_auth_mode, setup_guide,
        api_docs_url, status, featured, spec_hash
      ) VALUES (
        ${listing.slug}, ${listing.name}, ${listing.shortDescription},
        ${listing.longDescription}, ${listing.category},
        ${listing.tags as unknown as string[]},
        ${listing.iconUrl}, ${systemAuthorId}, ${listing.authorType},
        ${JSON.stringify(dummySpec)}, ${listing.specVersion},
        ${listing.recommendedBaseUrl}, ${listing.recommendedAuthMode},
        ${listing.setupGuide}, ${listing.apiDocsUrl},
        'published', ${listing.featured}, ${specHash}
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        short_description = EXCLUDED.short_description,
        long_description = EXCLUDED.long_description,
        icon_url = EXCLUDED.icon_url,
        tags = EXCLUDED.tags,
        setup_guide = EXCLUDED.setup_guide,
        api_docs_url = EXCLUDED.api_docs_url,
        featured = EXCLUDED.featured,
        spec_version = EXCLUDED.spec_version,
        status = 'published'
    `;

    console.log(`  Seeded: ${listing.name}`);
  }

  console.log(`\nSeeded ${SEED_LISTINGS.length} marketplace listings.`);
  await sql.end();
}

main();
