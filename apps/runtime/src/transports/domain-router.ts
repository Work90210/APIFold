import type { Request, Response, NextFunction } from 'express';
import type { Logger } from '../observability/logger.js';
import type { ServerRegistry } from '../registry/server-registry.js';

export interface DomainRouterDeps {
  readonly logger: Logger;
  readonly registry: ServerRegistry;
  readonly platformDomain: string;
}

/**
 * Express middleware that intercepts requests on custom domains.
 *
 * When a request comes in on a verified custom domain (e.g., mcp.mycompany.com),
 * this middleware resolves the server via `registry.getByDomain(hostname)` and
 * rewrites the URL to the standard `/mcp/:endpointId` path so the existing
 * transport routers handle it normally.
 *
 * Requests on the platform domain pass through untouched.
 */
export function createDomainRouter(deps: DomainRouterDeps) {
  const { logger, registry, platformDomain } = deps;

  return (req: Request, res: Response, next: NextFunction): void => {
    const hostname = req.hostname?.toLowerCase();

    // Skip if no hostname, or if it's the platform domain or localhost
    if (
      !hostname ||
      hostname === platformDomain ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith(`.${platformDomain}`)
    ) {
      next();
      return;
    }

    // Look up server by custom domain
    const server = registry.getByDomain(hostname);
    if (!server) {
      res.status(404).json({ error: 'Unknown domain' });
      return;
    }

    // Rewrite the URL to use the server's endpoint ID
    // Custom domain requests come in as:
    //   GET /sse          → rewrite to /mcp/{endpointId}/sse
    //   POST /message     → rewrite to /mcp/{endpointId}/message
    //   POST /            → rewrite to /mcp/{endpointId} (streamable HTTP)
    const originalPath = req.path;

    if (originalPath === '/sse' || originalPath === '/') {
      req.url = `/mcp/${server.endpointId}${originalPath === '/' ? '' : originalPath}`;
    } else if (originalPath === '/message') {
      req.url = `/mcp/${server.endpointId}/message`;
    } else if (originalPath.startsWith('/mcp/')) {
      // Already has /mcp/ prefix — pass through
      next();
      return;
    } else {
      req.url = `/mcp/${server.endpointId}${originalPath}`;
    }

    logger.debug(
      { hostname, endpointId: server.endpointId, original: originalPath, rewritten: req.url },
      'Custom domain request rewritten',
    );

    next();
  };
}
