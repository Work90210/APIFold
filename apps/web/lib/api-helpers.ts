import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createErrorResponse } from '@apifold/types';
import { ErrorCodes, HttpStatusByErrorCode } from '@apifold/types';
import { checkRateLimit } from './rate-limit';

export async function getUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new ApiError(ErrorCodes.AUTH_ERROR, 'Authentication required', 401);
  }
  return userId;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(ErrorCodes.NOT_FOUND, message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(ErrorCodes.CONFLICT, message, 409);
    this.name = 'ConflictError';
  }
}

export function errorResponse(code: string, message: string, status?: number): NextResponse {
  const httpStatus = status ?? HttpStatusByErrorCode[code as keyof typeof HttpStatusByErrorCode] ?? 500;
  return NextResponse.json(createErrorResponse(code, message), { status: httpStatus });
}

export async function withRateLimit(userId: string): Promise<NextResponse | null> {
  const result = await checkRateLimit(userId);
  if (!result.allowed) {
    const res = NextResponse.json(
      createErrorResponse(ErrorCodes.RATE_LIMIT, 'Rate limit exceeded'),
      { status: 429 },
    );
    res.headers.set('Retry-After', String(result.resetAt - Math.floor(Date.now() / 1000)));
    res.headers.set('X-RateLimit-Remaining', '0');
    return res;
  }
  return null;
}

export function withErrorHandler(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return handler().catch((err: unknown) => {
    if (err instanceof ApiError) {
      return errorResponse(err.code, err.message, err.status);
    }

    // Don't leak internal error details
    console.error('Unhandled API error:', err);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  });
}
