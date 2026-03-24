export const MARKETPLACE_CATEGORIES = {
  payments: { slug: 'payments', name: 'Payments & Billing', examples: 'Stripe, PayPal, Square' },
  communication: { slug: 'communication', name: 'Communication', examples: 'Twilio, Resend, SendGrid' },
  'developer-tools': { slug: 'developer-tools', name: 'Developer Tools', examples: 'GitHub, GitLab, Vercel' },
  productivity: { slug: 'productivity', name: 'Productivity', examples: 'Notion, Linear, Asana' },
  data: { slug: 'data', name: 'Data & Analytics', examples: 'PlanetScale, Supabase, Mixpanel' },
  commerce: { slug: 'commerce', name: 'Commerce', examples: 'Shopify, WooCommerce' },
  'ai-ml': { slug: 'ai-ml', name: 'AI & Machine Learning', examples: 'OpenAI, Replicate, Hugging Face' },
  infrastructure: { slug: 'infrastructure', name: 'Infrastructure', examples: 'Cloudflare, AWS, DigitalOcean' },
  crm: { slug: 'crm', name: 'CRM & Sales', examples: 'Salesforce, HubSpot' },
  monitoring: { slug: 'monitoring', name: 'Monitoring', examples: 'Datadog, PagerDuty, Sentry' },
  other: { slug: 'other', name: 'Other', examples: 'Everything else' },
} as const;

export type CategorySlug = keyof typeof MARKETPLACE_CATEGORIES;

export const CATEGORY_SLUGS = Object.keys(MARKETPLACE_CATEGORIES) as readonly CategorySlug[];

export function isValidCategory(slug: string): slug is CategorySlug {
  return slug in MARKETPLACE_CATEGORIES;
}
