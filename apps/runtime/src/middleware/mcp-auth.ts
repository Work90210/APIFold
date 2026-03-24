// DEPRECATED: This file is replaced by server-token-auth.ts
// Kept for backward compatibility reference only.
// The createServerTokenAuth middleware in server-token-auth.ts provides
// per-server access token authentication instead of a single global key.

export { createServerTokenAuth as createMcpAuth } from './server-token-auth.js';
