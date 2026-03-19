import { describe, it, expect } from 'vitest';
import { GET } from '../../app/api/health/route.js';

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const response = GET();
    const body = await response.json();

    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});
