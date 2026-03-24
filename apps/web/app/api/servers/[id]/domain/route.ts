import { randomBytes } from 'node:crypto';
import { promises as dns } from 'node:dns';

import { createSuccessResponse, ErrorCodes } from '@apifold/types';
import { eq, and } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getUserId, withErrorHandler, withRateLimit, errorResponse, ApiError } from '../../../../../lib/api-helpers';
import { getDb } from '../../../../../lib/db/index';
import { ServerRepository } from '../../../../../lib/db/repositories/server.repository';
import { mcpServers } from '../../../../../lib/db/schema/servers';
import { uuidParam } from '../../../../../lib/validation/common.schema';


type RouteParams = { params: Promise<{ id: string }> };

const PLATFORM_DOMAINS = new Set(['apifold.dev', 'apifold.com', 'localhost']);
const VERIFICATION_PREFIX = '_apifold-verify';

const setDomainSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(253)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i,
      'Invalid domain format',
    )
    .refine(
      (domain) => !PLATFORM_DOMAINS.has(domain.toLowerCase()),
      'Cannot use a platform domain',
    ),
});

// GET — Get current domain status
export function GET(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const server = await serverRepo.findById(userId, serverId);

    if (!server) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Server not found', 404);
    }

    // For verified domains, do a quick CNAME health check
    let dnsHealthy: boolean | null = null;
    if (server.customDomain && server.domainVerifiedAt) {
      try {
        const cnameRecords = await dns.resolveCname(server.customDomain);
        dnsHealthy = cnameRecords.some((r) =>
          r.toLowerCase().includes(PLATFORM_DOMAINS.values().next().value ?? ''),
        );
      } catch {
        dnsHealthy = false;
      }
    }

    return NextResponse.json(
      createSuccessResponse({
        customDomain: server.customDomain,
        domainVerifiedAt: server.domainVerifiedAt,
        dnsHealthy,
        verificationRecord: server.customDomain
          ? `${VERIFICATION_PREFIX}.${server.customDomain}`
          : null,
      }),
    );
  });
}

// PUT — Set custom domain (generates verification token)
export function PUT(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const body = await request.json();
    const { domain } = setDomainSchema.parse(body);
    const normalizedDomain = domain.toLowerCase();

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const server = await serverRepo.findById(userId, serverId);

    if (!server) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Server not found', 404);
    }

    // Generate verification token
    const verificationToken = randomBytes(16).toString('hex');

    // Update server with domain and token, clear verification
    await db
      .update(mcpServers)
      .set({
        customDomain: normalizedDomain,
        domainVerificationToken: verificationToken,
        domainVerifiedAt: null,
      })
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.userId, userId)));

    return NextResponse.json(
      createSuccessResponse({
        customDomain: normalizedDomain,
        domainVerifiedAt: null,
        verificationRecord: `${VERIFICATION_PREFIX}.${normalizedDomain}`,
        verificationValue: verificationToken,
        instructions: `Add a TXT record for ${VERIFICATION_PREFIX}.${normalizedDomain} with value ${verificationToken}`,
      }),
    );
  });
}

// POST — Verify domain via DNS TXT lookup
export function POST(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const db = getDb();

    // Read server with verification token
    const rows = await db
      .select({
        customDomain: mcpServers.customDomain,
        domainVerificationToken: mcpServers.domainVerificationToken,
      })
      .from(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.userId, userId)))
      .limit(1);

    const server = rows[0];
    if (!server?.customDomain || !server.domainVerificationToken) {
      throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'No domain configured or missing verification token', 400);
    }

    // DNS TXT lookup
    const lookupHost = `${VERIFICATION_PREFIX}.${server.customDomain}`;
    let txtRecords: string[][];
    try {
      txtRecords = await dns.resolveTxt(lookupHost);
    } catch {
      throw new ApiError(
        ErrorCodes.VALIDATION_ERROR,
        `DNS lookup failed for ${lookupHost}. Ensure the TXT record is configured and DNS has propagated.`,
        400,
      );
    }

    // Check if any TXT record matches
    const flatRecords = txtRecords.map((parts) => parts.join(''));
    const verified = flatRecords.includes(server.domainVerificationToken);

    if (!verified) {
      throw new ApiError(
        ErrorCodes.VALIDATION_ERROR,
        `TXT record not found. Expected value: ${server.domainVerificationToken}. Found: ${flatRecords.join(', ') || 'none'}`,
        400,
      );
    }

    // Mark as verified
    await db
      .update(mcpServers)
      .set({ domainVerifiedAt: new Date() })
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.userId, userId)));

    return NextResponse.json(
      createSuccessResponse({
        customDomain: server.customDomain,
        domainVerifiedAt: new Date(),
        verified: true,
      }),
    );
  });
}

// DELETE — Remove custom domain
export function DELETE(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const db = getDb();

    await db
      .update(mcpServers)
      .set({
        customDomain: null,
        domainVerifiedAt: null,
        domainVerificationToken: null,
      })
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.userId, userId)));

    return NextResponse.json(createSuccessResponse({ deleted: true }));
  });
}
