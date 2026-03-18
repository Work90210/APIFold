import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSpec } from '../src/parse.js';
import { transformSpec } from '../src/transform.js';

function loadFixture(name: string): unknown {
  const filePath = join(__dirname, 'fixtures', name);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function parseAndTransform(fixtureName: string) {
  const raw = loadFixture(fixtureName);
  const parsed = parseSpec({ spec: raw });
  return transformSpec({ spec: parsed.spec });
}

describe('integration: petstore-3.0', () => {
  it('transforms petstore spec into 5 tools', () => {
    const result = parseAndTransform('petstore-3.0.json');
    expect(result.tools).toHaveLength(5);

    const names = result.tools.map((t) => t.name);
    expect(names).toContain('listpets');
    expect(names).toContain('createpet');
    expect(names).toContain('showpetbyid');
    expect(names).toContain('updatepet');
    expect(names).toContain('deletepet');
  });

  it('resolves $ref schemas in petstore', () => {
    const raw = loadFixture('petstore-3.0.json');
    const parsed = parseSpec({ spec: raw });

    expect(parsed.warnings.every((w) => w.code !== 'UNRESOLVED_REF')).toBe(true);
  });

  it('petstore tools have correct metadata', () => {
    const result = parseAndTransform('petstore-3.0.json');
    expect(result.metadata.specTitle).toBe('Petstore');
    expect(result.metadata.totalOperations).toBe(5);
    expect(result.metadata.transformedCount).toBe(5);
  });
});

describe('integration: minimal', () => {
  it('transforms minimal spec into 1 tool', () => {
    const result = parseAndTransform('minimal.json');
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]!.name).toBe('healthcheck');
  });
});

describe('integration: no-operation-ids', () => {
  it('generates tool names from method+path', () => {
    const result = parseAndTransform('no-operation-ids.json');
    expect(result.tools).toHaveLength(3);

    const names = result.tools.map((t) => t.name);
    expect(names).toContain('get_users');
    expect(names).toContain('post_users');
    expect(names).toContain('get_users_userid');
  });

  it('emits MISSING_OPERATION_ID warnings', () => {
    const result = parseAndTransform('no-operation-ids.json');
    const missingIds = result.warnings.filter((w) => w.code === 'MISSING_OPERATION_ID');
    expect(missingIds).toHaveLength(3);
  });
});

describe('integration: circular-refs', () => {
  it('handles circular refs without crashing', () => {
    const raw = loadFixture('circular-refs.json');
    const parsed = parseSpec({ spec: raw });

    expect(parsed.warnings.some((w) => w.code === 'CIRCULAR_REF')).toBe(true);

    const result = transformSpec({ spec: parsed.spec });
    expect(result.tools).toHaveLength(1);
  });
});

describe('integration: petstore-3.1', () => {
  it('parses as OpenAPI 3.1', () => {
    const raw = loadFixture('petstore-3.1.json');
    const parsed = parseSpec({ spec: raw });
    expect(parsed.version).toBe('3.1');
  });

  it('produces tools', () => {
    const result = parseAndTransform('petstore-3.1.json');
    expect(result.tools.length).toBeGreaterThan(0);
    expect(result.metadata.openApiVersion).toBe('3.1');
  });
});

describe('integration: stripe', () => {
  it('transforms Stripe subset into 30+ tools', () => {
    const result = parseAndTransform('stripe.json');
    expect(result.tools.length).toBeGreaterThanOrEqual(30);
  });

  it('resolves all $refs in Stripe spec', () => {
    const raw = loadFixture('stripe.json');
    const parsed = parseSpec({ spec: raw });
    expect(parsed.warnings.filter((w) => w.code === 'UNRESOLVED_REF')).toHaveLength(0);
  });
});

describe('integration: github', () => {
  it('transforms GitHub subset into 25+ tools', () => {
    const result = parseAndTransform('github.json');
    expect(result.tools.length).toBeGreaterThanOrEqual(20);
  });

  it('handles path parameters correctly', () => {
    const result = parseAndTransform('github.json');
    const getRepo = result.tools.find((t) => t.name === 'repos_get');
    expect(getRepo).toBeDefined();
    expect(getRepo!._meta.paramMap['owner']).toBe('path');
    expect(getRepo!._meta.paramMap['repo']).toBe('path');
  });
});

describe('integration: twilio', () => {
  it('transforms Twilio subset into 15+ tools', () => {
    const result = parseAndTransform('twilio.json');
    expect(result.tools.length).toBeGreaterThanOrEqual(14);
  });

  it('handles form-urlencoded request bodies', () => {
    const result = parseAndTransform('twilio.json');
    const createMessage = result.tools.find((t) => t.name === 'createmessage');
    expect(createMessage).toBeDefined();
    expect(createMessage!.inputSchema.properties['body']).toBeDefined();
  });
});

describe('integration: sendgrid', () => {
  it('transforms SendGrid subset into 15+ tools', () => {
    const result = parseAndTransform('sendgrid.json');
    expect(result.tools.length).toBeGreaterThanOrEqual(15);
  });

  it('skips Authorization header', () => {
    const result = parseAndTransform('sendgrid.json');
    const mailSend = result.tools.find((t) => t.name === 'post_mail_send');
    expect(mailSend).toBeDefined();
    expect(mailSend!.inputSchema.properties['Authorization']).toBeUndefined();
  });
});

describe('integration: openai', () => {
  it('transforms OpenAI subset into 10+ tools', () => {
    const result = parseAndTransform('openai.json');
    expect(result.tools.length).toBeGreaterThanOrEqual(10);
  });

  it('skips deprecated multipart operation', () => {
    const result = parseAndTransform('openai.json');
    const names = result.tools.map((t) => t.name);
    expect(names).not.toContain('createimageedit');
  });

  it('handles oneOf schemas', () => {
    const result = parseAndTransform('openai.json');
    const embedding = result.tools.find((t) => t.name === 'createembedding');
    expect(embedding).toBeDefined();
  });
});

describe('integration: hubspot', () => {
  it('transforms HubSpot subset into 15+ tools', () => {
    const result = parseAndTransform('hubspot.json');
    expect(result.tools.length).toBeGreaterThanOrEqual(15);
  });

  it('resolves $ref to shared schemas', () => {
    const raw = loadFixture('hubspot.json');
    const parsed = parseSpec({ spec: raw });
    expect(parsed.warnings.filter((w) => w.code === 'UNRESOLVED_REF')).toHaveLength(0);
  });
});

describe('integration: slack', () => {
  it('transforms Slack subset into 15+ tools', () => {
    const result = parseAndTransform('slack.json');
    expect(result.tools.length).toBeGreaterThanOrEqual(15);
  });
});

describe('integration: cloudflare', () => {
  it('transforms Cloudflare subset into 14+ tools', () => {
    const result = parseAndTransform('cloudflare.json');
    expect(result.tools.length).toBeGreaterThanOrEqual(14);
  });

  it('handles nested path parameters', () => {
    const result = parseAndTransform('cloudflare.json');
    const dnsGet = result.tools.find((t) => t.name.includes('dns_records') && t.name.includes('get'));
    expect(dnsGet).toBeDefined();
    expect(dnsGet!._meta.paramMap['zone_id']).toBe('path');
  });
});

describe('integration: large-spec', () => {
  it('transforms 1000-operation spec successfully', () => {
    const result = parseAndTransform('large-spec.json');
    expect(result.tools.length).toBeGreaterThanOrEqual(950);
    expect(result.metadata.totalOperations).toBe(1000);
  });
});
