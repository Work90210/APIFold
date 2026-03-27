import type { Logger } from '../observability/logger.js';
import type { SessionManager } from '../mcp/session-manager.js';

export interface WebhookNotifierDeps {
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
}

export class WebhookNotifier {
  private readonly logger: Logger;
  private readonly sessionManager: SessionManager;

  constructor(deps: WebhookNotifierDeps) {
    this.logger = deps.logger;
    this.sessionManager = deps.sessionManager;
  }

  notify(serverSlug: string, eventName: string, payload: unknown): void {
    const notification = Object.freeze({
      jsonrpc: '2.0' as const,
      method: `notifications/webhook/${eventName}`,
      params: { eventName, payload },
    });

    const data = JSON.stringify(notification);
    let sent = 0;

    this.sessionManager.forEachSession(serverSlug, (session) => {
      this.sessionManager.sendEvent(session, 'message', data);
      sent++;
    });

    if (sent > 0) {
      this.logger.info({ slug: serverSlug, eventName, recipients: sent }, 'Webhook notification pushed');
    }
  }
}
