import { describe, it, expect } from 'vitest';
import { transformWebhooks } from '../src/webhooks.js';
import type { ResolvedOpenAPISpec } from '../src/types.js';

function createSpec(webhooks: Record<string, unknown>, version = '3.1.0'): ResolvedOpenAPISpec {
  return {
    openapi: version,
    info: { title: 'Test API', version: '1.0.0' },
    paths: {},
    webhooks: webhooks as ResolvedOpenAPISpec['webhooks'],
  };
}

describe('transformWebhooks', () => {
  it('returns empty results when spec has no webhooks', () => {
    const spec = createSpec({});
    const result = transformWebhooks({ spec, serverSlug: 'test-server' });
    expect(result.resources).toHaveLength(0);
    expect(result.notifications).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('returns warning for non-3.1 specs', () => {
    const spec = createSpec(
      { petAdopted: { post: { operationId: 'petAdopted', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } } } } },
      '3.0.3',
    );
    const result = transformWebhooks({ spec, serverSlug: 'test-server' });
    expect(result.resources).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.code).toBe('WEBHOOKS_UNSUPPORTED_VERSION');
  });

  it('transforms a webhook with POST operation', () => {
    const spec = createSpec({
      'payment_intent.succeeded': {
        post: {
          operationId: 'paymentSucceeded',
          description: 'A payment was successful',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    amount: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    });

    const result = transformWebhooks({ spec, serverSlug: 'stripe' });

    expect(result.resources).toHaveLength(1);
    expect(result.notifications).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);

    const resource = result.resources[0]!;
    expect(resource.uri).toBe('webhook://stripe/payment_intent.succeeded');
    expect(resource.name).toBe('payment_intent.succeeded');
    expect(resource.mimeType).toBe('application/json');
    expect(resource.schema).toEqual({
      type: 'object',
      properties: {
        id: { type: 'string' },
        amount: { type: 'integer' },
      },
    });

    const notification = result.notifications[0]!;
    expect(notification.method).toBe('notifications/webhook/paymentSucceeded');
    expect(notification.description).toBe('A payment was successful');
  });

  it('uses event name as operationId fallback', () => {
    const spec = createSpec({
      'order.created': {
        post: {
          summary: 'New order created',
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    });

    const result = transformWebhooks({ spec, serverSlug: 'shop' });
    expect(result.notifications[0]!.method).toBe('notifications/webhook/order.created');
  });

  it('warns when webhook has no operation', () => {
    const spec = createSpec({
      'empty-webhook': {},
    });

    const result = transformWebhooks({ spec, serverSlug: 'test' });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.code).toBe('WEBHOOK_NO_OPERATION');
  });

  it('warns when webhook has no JSON body', () => {
    const spec = createSpec({
      'no-body': {
        post: {
          operationId: 'noBody',
        },
      },
    });

    const result = transformWebhooks({ spec, serverSlug: 'test' });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.code).toBe('WEBHOOK_NO_BODY');
  });

  it('handles multiple webhooks', () => {
    const spec = createSpec({
      'event.a': {
        post: {
          operationId: 'eventA',
          description: 'Event A',
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        },
      },
      'event.b': {
        post: {
          operationId: 'eventB',
          description: 'Event B',
          requestBody: { content: { 'application/json': { schema: { type: 'string' } } } },
        },
      },
    });

    const result = transformWebhooks({ spec, serverSlug: 'multi' });
    expect(result.resources).toHaveLength(2);
    expect(result.notifications).toHaveLength(2);
  });

  it('handles vendor +json media types', () => {
    const spec = createSpec({
      'custom.event': {
        post: {
          operationId: 'customEvent',
          requestBody: {
            content: {
              'application/vnd.github.v3+json': {
                schema: { type: 'object', properties: { action: { type: 'string' } } },
              },
            },
          },
        },
      },
    });

    const result = transformWebhooks({ spec, serverSlug: 'github' });
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]!.schema).toEqual({
      type: 'object',
      properties: { action: { type: 'string' } },
    });
  });
});
