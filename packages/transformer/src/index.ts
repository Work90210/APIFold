export { parseSpec } from './parse.js';
export { transformSpec } from './transform.js';

export type {
  ParseInput,
  ParseResult,
  ParseWarning,
  TransformOptions,
  TransformResult,
  TransformWarning,
  MCPToolDefinition,
  ResolvedOpenAPISpec,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIPathItem,
  OpenAPIInfo,
  HttpMethod,
  JSONSchema,
} from './types.js';

export {
  TransformerError,
  ParseError,
  ValidationError,
  ResolveError,
  TransformError,
} from './errors.js';
