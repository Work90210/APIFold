import { randomBytes, createHash } from 'node:crypto';

import { transformSpec } from '@apifold/transformer';
import { eq, and } from 'drizzle-orm';

import { ApiError, NotFoundError } from '../api-helpers';
import type { DrizzleClient } from '../db/index';
import { getDb } from '../db/index';
import { MarketplaceInstallRepository } from '../db/repositories/marketplace-install.repository';
import { MarketplaceListingRepository } from '../db/repositories/marketplace-listing.repository';
import { marketplaceInstalls } from '../db/schema/marketplace-installs';
import { mcpServers } from '../db/schema/servers';
import { specs } from '../db/schema/specs';
import { mcpTools } from '../db/schema/tools';
import * as marketplaceCache from '../marketplace/cache';
import { serverTrackDeploy, serverTrackUninstall } from '../analytics/events.server';

export interface DeployResult {
  readonly serverId: string;
  readonly serverSlug: string;
  readonly specId: string;
  readonly installId: string;
  readonly toolCount: number;
  readonly redirectUrl: string;
  readonly accessToken: string | null;
}

export async function deployListing(
  slug: string,
  userId: string,
): Promise<DeployResult> {
  const db = getDb();
  const listingRepo = new MarketplaceListingRepository(db);
  const installRepo = new MarketplaceInstallRepository(db);

  // 1. Validate listing exists and is published
  const listing = await listingRepo.findPublishedBySlug(slug);
  if (!listing) {
    throw new NotFoundError('Listing not found or not published');
  }

  // 2. Idempotency check — return existing install if present
  // Note: accessToken is null for existing installs — the token was shown only once at deploy time
  const existing = await installRepo.findByListingAndUser(listing.id, userId);
  if (existing) {
    return Object.freeze({
      serverId: existing.serverId,
      serverSlug: slug,
      specId: existing.specId,
      installId: existing.id,
      toolCount: 0,
      accessToken: null,
      redirectUrl: `/dashboard/servers/${existing.serverId}`,
    });
  }

  // 3. Transform spec BEFORE transaction (CPU-heavy work outside tx)
  const transformResult = transformSpec({
    spec: listing.rawSpec as unknown as Parameters<typeof transformSpec>[0]['spec'],
  });

  if (transformResult.tools.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'Listing spec produces no tools', 422);
  }

  // 4. Generate unique server slug (with random suffix for security)
  const serverSlug = await generateUniqueSlug(db, listing.slug, userId);
  const endpointId = randomBytes(6).toString('hex');

  // 5. Generate per-server access token
  const accessToken = `af_${randomBytes(32).toString('hex')}`;
  const tokenHash = createHash('sha256').update(accessToken).digest('hex');

  // 6. Single transaction for all writes
  const result = await db.transaction(async (tx) => {
    // Create spec row
    const [spec] = await tx
      .insert(specs)
      .values({
        userId,
        name: listing.name,
        version: listing.specVersion,
        sourceUrl: `marketplace:${listing.id}`,
        rawSpec: listing.rawSpec,
        toolCount: transformResult.tools.length,
      })
      .returning();

    // Create server row with access token hash
    const [server] = await tx
      .insert(mcpServers)
      .values({
        userId,
        specId: spec!.id,
        slug: serverSlug,
        endpointId,
        name: listing.name,
        authMode: listing.recommendedAuthMode,
        baseUrl: listing.recommendedBaseUrl,
        isActive: true,
        tokenHash,
      })
      .returning();

    // Create tool rows
    const toolValues = transformResult.tools.map((tool) => ({
      serverId: server!.id,
      name: tool.name,
      description: tool.description ?? null,
      inputSchema: tool.inputSchema,
      isActive: listing.defaultToolFilter?.[tool.name] ?? true,
    }));

    if (toolValues.length > 0) {
      await tx.insert(mcpTools).values(toolValues);
    }

    // Record install
    const [install] = await tx
      .insert(marketplaceInstalls)
      .values({
        listingId: listing.id,
        userId,
        serverId: server!.id,
        specId: spec!.id,
        installedVersionHash: listing.specHash,
      })
      .returning();

    // Increment install_count atomically
    await listingRepo.incrementInstallCount(tx, listing.id);

    return {
      serverId: server!.id,
      serverSlug,
      specId: spec!.id,
      installId: install!.id,
      toolCount: transformResult.tools.length,
    };
  });

  // 7. Cache invalidation (outside transaction)
  await marketplaceCache.invalidateListing(slug);
  await marketplaceCache.invalidateUserInstalls(userId);

  // 8. Analytics
  serverTrackDeploy({
    userId,
    listingSlug: slug,
    serverId: result.serverId,
    toolCount: result.toolCount,
  });

  // Return the plaintext access token ONCE — it's not stored, only the hash is
  return Object.freeze({
    ...result,
    accessToken,
    redirectUrl: `/dashboard/servers/${result.serverId}`,
  });
}

export async function uninstallByInstallId(
  installId: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  const installRepo = new MarketplaceInstallRepository(db);

  const install = await installRepo.findById(installId);
  if (!install || install.userId !== userId) {
    throw new NotFoundError('Install not found');
  }

  // Delete server (cascades to tools, credentials, logs, and install row via ON DELETE CASCADE)
  await db
    .delete(mcpServers)
    .where(and(eq(mcpServers.id, install.serverId), eq(mcpServers.userId, userId)));

  // Delete spec (not cascaded from server deletion)
  await db
    .delete(specs)
    .where(and(eq(specs.id, install.specId), eq(specs.userId, userId)));

  // The DB trigger handles install_count decrement on install row deletion
  serverTrackUninstall({ userId, serverId: install.serverId });
  await marketplaceCache.invalidateUserInstalls(userId);
}

async function generateUniqueSlug(
  db: DrizzleClient,
  baseSlug: string,
  userId: string,
): Promise<string> {
  // Always append a random suffix for marketplace deploys to prevent slug guessing
  const suffix = randomBytes(3).toString('hex');
  const preferred = `${baseSlug}-${suffix}`;

  const [existing] = await db
    .select({ id: mcpServers.id })
    .from(mcpServers)
    .where(and(eq(mcpServers.slug, preferred), eq(mcpServers.userId, userId)))
    .limit(1);

  if (!existing) return preferred;

  // Collision: retry with fresh random suffixes (never sequential)
  for (let i = 0; i < 5; i++) {
    const candidate = `${baseSlug}-${randomBytes(3).toString('hex')}`;
    const [conflict] = await db
      .select({ id: mcpServers.id })
      .from(mcpServers)
      .where(and(eq(mcpServers.slug, candidate), eq(mcpServers.userId, userId)))
      .limit(1);

    if (!conflict) return candidate;
  }

  // Final fallback: longer random suffix
  return `${baseSlug}-${randomBytes(6).toString('hex')}`;
}

export function computeSpecHash(spec: Record<string, unknown>): string {
  const canonical = JSON.stringify(spec, Object.keys(spec).sort());
  return createHash('sha256').update(canonical).digest('hex');
}
