import { flattenSchema } from './schema.js';
import type {
  JSONSchema,
  MCPNotificationDefinition,
  MCPResourceDefinition,
  OpenAPIOperation,
  OpenAPIPathItem,
  ResolvedOpenAPISpec,
  TransformWarning,
  WebhookTransformResult,
} from './types.js';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

export interface WebhookTransformOptions {
  readonly spec: ResolvedOpenAPISpec;
  readonly serverSlug: string;
}

export function transformWebhooks(options: WebhookTransformOptions): WebhookTransformResult {
  const { spec, serverSlug } = options;
  const webhooks = spec.webhooks;

  if (!webhooks || Object.keys(webhooks).length === 0) {
    return { resources: [], notifications: [], warnings: [] };
  }

  if (!spec.openapi.startsWith('3.1')) {
    return {
      resources: [],
      notifications: [],
      warnings: [{
        code: 'WEBHOOKS_UNSUPPORTED_VERSION',
        message: 'Webhooks require OpenAPI 3.1+; found ' + spec.openapi,
      }],
    };
  }

  const resources: MCPResourceDefinition[] = [];
  const notifications: MCPNotificationDefinition[] = [];
  const warnings: TransformWarning[] = [];

  for (const [eventName, pathItem] of Object.entries(webhooks)) {
    const operation = resolveWebhookOperation(pathItem);
    if (!operation) {
      warnings.push({
        code: 'WEBHOOK_NO_OPERATION',
        message: `Webhook "${eventName}" has no usable HTTP method`,
        path: eventName,
      });
      continue;
    }

    const bodySchema = extractWebhookBodySchema(operation);
    if (!bodySchema) {
      warnings.push({
        code: 'WEBHOOK_NO_BODY',
        message: `Webhook "${eventName}" has no JSON request body schema`,
        path: eventName,
      });
      continue;
    }

    const description = operation.description ?? operation.summary ?? `Webhook event: ${eventName}`;
    const operationId = operation.operationId ?? eventName;

    resources.push({
      uri: `webhook://${serverSlug}/${eventName}`,
      name: eventName,
      description,
      mimeType: 'application/json',
      schema: bodySchema,
    });

    notifications.push({
      method: `notifications/webhook/${operationId}`,
      description,
      params: bodySchema,
    });
  }

  return { resources, notifications, warnings };
}

function resolveWebhookOperation(pathItem: OpenAPIPathItem): OpenAPIOperation | undefined {
  // Webhooks are typically POST, but check all methods
  if (pathItem.post) return pathItem.post;
  for (const method of HTTP_METHODS) {
    const op = pathItem[method];
    if (op) return op;
  }
  return undefined;
}

function extractWebhookBodySchema(operation: OpenAPIOperation): JSONSchema | undefined {
  const content = operation.requestBody?.content;
  if (!content) return undefined;

  const jsonContent = content['application/json'];
  if (jsonContent?.schema) {
    return flattenSchema(jsonContent.schema);
  }

  // Check for +json vendor types
  for (const [mediaType, entry] of Object.entries(content)) {
    if (!entry?.schema) continue;
    const lower = mediaType.toLowerCase();
    if (lower.startsWith('application/json') || lower.endsWith('+json')) {
      return flattenSchema(entry.schema);
    }
  }

  return undefined;
}
