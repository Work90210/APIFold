import { describe, it, expect, vi } from 'vitest';
import { createServiceAuth } from '../../src/middleware/service-auth.js';

function createMockReqRes(headerValue?: string) {
  const req = {
    headers: headerValue !== undefined ? { 'x-runtime-secret': headerValue } : {},
  } as never;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as never;
  const next = vi.fn();
  return { req, res, next };
}

describe('createServiceAuth', () => {
  const SECRET = 'a'.repeat(32);
  const middleware = createServiceAuth(SECRET);

  it('allows request with valid secret', () => {
    const { req, res, next } = createMockReqRes(SECRET);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects request with missing header', () => {
    const { req, res, next } = createMockReqRes(undefined);
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(401);
  });

  it('rejects request with wrong secret', () => {
    const { req, res, next } = createMockReqRes('wrong-secret-value-that-is-32chars!');
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(401);
  });

  it('rejects request with wrong length secret', () => {
    const { req, res, next } = createMockReqRes('short');
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(401);
  });

  it('rejects empty string secret', () => {
    const { req, res, next } = createMockReqRes('');
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });
});
