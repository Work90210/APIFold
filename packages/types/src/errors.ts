export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  AUTH_ERROR: 'AUTH_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
  FORBIDDEN: 'FORBIDDEN',
  CREDENTIAL_EXPIRED: 'CREDENTIAL_EXPIRED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const HttpStatusByErrorCode: Record<ErrorCode, number> = {
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.AUTH_ERROR]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.RATE_LIMIT]: 429,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.UPSTREAM_ERROR]: 502,
  [ErrorCodes.CREDENTIAL_EXPIRED]: 401,
} as const;
