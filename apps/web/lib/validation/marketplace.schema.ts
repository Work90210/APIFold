import { z } from 'zod';

import { CATEGORY_SLUGS } from '../marketplace/categories';

const slugSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

const baseUrlSchema = z
  .string()
  .max(2000)
  .regex(/^https:\/\//, 'Base URL must use HTTPS');

export const browseMarketplaceSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().optional(),
  author_type: z.enum(['official', 'community', 'verified']).optional(),
  sort: z.enum(['popular', 'newest', 'name']).default('popular'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type BrowseMarketplaceInput = z.infer<typeof browseMarketplaceSchema>;

export const listingSlugParamsSchema = z.object({
  slug: slugSchema,
});

export const createListingSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(100).trim(),
  shortDescription: z.string().min(1).max(200).trim(),
  longDescription: z.string().min(1).max(10_000).trim(),
  category: z.enum(CATEGORY_SLUGS as unknown as [string, ...string[]]),
  tags: z.array(z.string().min(1).max(30).regex(/^[a-z0-9-]+$/)).max(10).default([]),
  iconUrl: z.string().url().max(200).startsWith('https://').optional().nullable(),
  rawSpec: z.record(z.string(), z.unknown()),
  specVersion: z.string().min(1).max(20),
  recommendedBaseUrl: baseUrlSchema,
  recommendedAuthMode: z.enum(['none', 'api_key', 'bearer']),
  defaultToolFilter: z.record(z.string(), z.boolean()).optional().nullable(),
  setupGuide: z.string().max(10_000).optional().nullable(),
  apiDocsUrl: z.string().url().max(500).optional().nullable(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = createListingSchema.partial().omit({ slug: true });

export type UpdateListingInput = z.infer<typeof updateListingSchema>;

export const reportListingSchema = z.object({
  reason: z.enum(['broken', 'misleading', 'security', 'spam', 'other']),
  details: z.string().min(1).max(2000).trim(),
});

export type ReportListingInput = z.infer<typeof reportListingSchema>;

export const adminActionSchema = z.object({
  reason: z.string().min(1).max(2000).trim(),
});

export type AdminActionInput = z.infer<typeof adminActionSchema>;
