import type { RegistryEntry, RegistrySearchOptions } from './types.js';

export type { RegistryEntry, RegistryMeta, RegistrySearchOptions, Category, AuthType } from './types.js';

// Static catalog — each entry references a spec file in the specs/ directory.
// The specs themselves are loaded on demand via getSpec().
const CATALOG: readonly RegistryEntry[] = Object.freeze([
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing, subscriptions, and billing management',
    category: 'payments',
    authType: 'bearer',
    docsUrl: 'https://stripe.com/docs/api',
    tags: ['payments', 'billing', 'subscriptions', 'invoices'],
    specPath: 'stripe/spec.json',
    operationCount: 300,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repositories, issues, pull requests, and Git operations',
    category: 'developer-tools',
    authType: 'bearer',
    docsUrl: 'https://docs.github.com/en/rest',
    tags: ['git', 'repositories', 'issues', 'ci-cd'],
    specPath: 'github/spec.json',
    operationCount: 900,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Messaging, channels, users, and workspace management',
    category: 'communication',
    authType: 'oauth',
    docsUrl: 'https://api.slack.com/methods',
    tags: ['messaging', 'channels', 'teams', 'bots'],
    specPath: 'slack/spec.json',
    operationCount: 200,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'CRM contacts, deals, companies, and marketing automation',
    category: 'crm',
    authType: 'oauth',
    docsUrl: 'https://developers.hubspot.com/docs/api/overview',
    tags: ['crm', 'contacts', 'deals', 'marketing'],
    specPath: 'hubspot/spec.json',
    operationCount: 400,
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS, voice calls, video, and communication APIs',
    category: 'communication',
    authType: 'basic',
    docsUrl: 'https://www.twilio.com/docs/usage/api',
    tags: ['sms', 'voice', 'video', 'phone'],
    specPath: 'twilio/spec.json',
    operationCount: 150,
  },
  {
    id: 'petstore',
    name: 'Petstore',
    description: 'Demo API for testing — classic Swagger Petstore example',
    category: 'demo',
    authType: 'api_key',
    docsUrl: 'https://petstore3.swagger.io',
    tags: ['demo', 'testing', 'example'],
    specPath: 'petstore/spec.json',
    operationCount: 18,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Chat completions, embeddings, images, and model management',
    category: 'ai',
    authType: 'bearer',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    tags: ['ai', 'llm', 'chat', 'embeddings', 'images'],
    specPath: 'openai/spec.json',
    operationCount: 40,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Pages, databases, blocks, and workspace content management',
    category: 'productivity',
    authType: 'oauth',
    docsUrl: 'https://developers.notion.com/reference',
    tags: ['productivity', 'notes', 'databases', 'wiki'],
    specPath: 'notion/spec.json',
    operationCount: 30,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy projects, manage domains, and inspect deployments on Vercel',
    category: 'developer-tools',
    authType: 'bearer',
    docsUrl: 'https://vercel.com/docs/rest-api',
    tags: ['deployments', 'hosting', 'domains', 'ci-cd', 'nextjs'],
    specPath: 'vercel/spec.json',
    operationCount: 14,
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Read, create, update, and delete records across any Airtable base',
    category: 'productivity',
    authType: 'bearer',
    docsUrl: 'https://airtable.com/developers/web/api/introduction',
    tags: ['database', 'spreadsheet', 'records', 'bases', 'no-code'],
    specPath: 'airtable/spec.json',
    operationCount: 12,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'Manage DNS records, zones, cache, and Cloudflare settings',
    category: 'developer-tools',
    authType: 'bearer',
    docsUrl: 'https://developers.cloudflare.com/api',
    tags: ['dns', 'cdn', 'security', 'zones', 'cache'],
    specPath: 'cloudflare/spec.json',
    operationCount: 15,
  },
  {
    id: 'resend',
    name: 'Resend',
    description: 'Send transactional emails, manage domains, and track delivery',
    category: 'communication',
    authType: 'bearer',
    docsUrl: 'https://resend.com/docs/api-reference/introduction',
    tags: ['email', 'transactional', 'smtp', 'domains', 'templates'],
    specPath: 'resend/spec.json',
    operationCount: 12,
  },
  {
    id: 'calcom',
    name: 'Cal.com',
    description: 'Manage bookings, event types, availability slots, and schedules',
    category: 'productivity',
    authType: 'bearer',
    docsUrl: 'https://cal.com/docs/api-reference',
    tags: ['calendar', 'scheduling', 'bookings', 'availability', 'meetings'],
    specPath: 'calcom/spec.json',
    operationCount: 15,
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Read design files, export images, and manage comments in Figma',
    category: 'design',
    authType: 'oauth',
    docsUrl: 'https://www.figma.com/developers/api',
    tags: ['design', 'ui', 'prototyping', 'components', 'assets'],
    specPath: 'figma/spec.json',
    operationCount: 14,
  },
  {
    id: 'intercom',
    name: 'Intercom',
    description: 'Manage contacts, conversations, and support tickets in Intercom',
    category: 'communication',
    authType: 'bearer',
    docsUrl: 'https://developers.intercom.com/docs/references/rest-api',
    tags: ['support', 'chat', 'contacts', 'crm', 'customer-success'],
    specPath: 'intercom/spec.json',
    operationCount: 15,
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Manage email audiences, campaigns, and subscriber lists',
    category: 'marketing',
    authType: 'bearer',
    docsUrl: 'https://mailchimp.com/developer/marketing/api',
    tags: ['email', 'marketing', 'campaigns', 'subscribers', 'newsletters'],
    specPath: 'mailchimp/spec.json',
    operationCount: 15,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Manage Supabase projects, run SQL queries, and configure services',
    category: 'developer-tools',
    authType: 'bearer',
    docsUrl: 'https://supabase.com/docs/reference/api',
    tags: ['database', 'postgres', 'backend', 'auth', 'storage'],
    specPath: 'supabase/spec.json',
    operationCount: 14,
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Manage issues, projects, and teams via the Linear GraphQL API',
    category: 'developer-tools',
    authType: 'bearer',
    docsUrl: 'https://developers.linear.app/docs',
    tags: ['issues', 'project-management', 'sprints', 'engineering', 'graphql'],
    specPath: 'linear/spec.json',
    operationCount: 12,
  },
]);

export function listAll(): readonly RegistryEntry[] {
  return CATALOG;
}

export function getById(id: string): RegistryEntry | undefined {
  return CATALOG.find((entry) => entry.id === id);
}

export function search(options: RegistrySearchOptions = {}): readonly RegistryEntry[] {
  const { query, category, authType } = options;

  return CATALOG.filter((entry) => {
    if (category && entry.category !== category) return false;
    if (authType && entry.authType !== authType) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.tags.some((tag) => tag.includes(q))
      );
    }
    return true;
  });
}

export function getCategories(): readonly string[] {
  const categories = new Set(CATALOG.map((e) => e.category));
  return [...categories].sort();
}
