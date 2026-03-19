# @apifold/transformer

Transform OpenAPI 3.0/3.1 specifications into [MCP (Model Context Protocol)](https://modelcontextprotocol.io) tool definitions.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)

## Features

- Pure functions — no side effects, no network calls, no filesystem access
- Supports OpenAPI 3.0.x and 3.1.x
- Deep `$ref` resolution with circular reference detection
- `allOf` merging, `oneOf`/`anyOf` preservation
- Flexible filtering by methods, paths (glob), and tags
- Security hardened against prototype pollution, ReDoS, and stack overflow
- ESM + CJS dual output

## Install

```bash
npm install @apifold/transformer
# or
pnpm add @apifold/transformer
```

## Quick Start

```typescript
import { parseSpec, transformSpec } from '@apifold/transformer';

// 1. Parse an OpenAPI spec (raw JSON/YAML object)
const parsed = parseSpec({ spec: myOpenApiSpec });

// 2. Transform into MCP tool definitions
const result = transformSpec({ spec: parsed.spec });

console.log(`Generated ${result.tools.length} tools`);
for (const tool of result.tools) {
  console.log(`  ${tool.name}: ${tool.description}`);
}
```

## API Reference

### `parseSpec(input: ParseInput): ParseResult`

Parse and validate an OpenAPI specification. Resolves all `$ref` references, detects the OpenAPI version, and validates the document structure.

```typescript
interface ParseInput {
  readonly spec: unknown; // Raw JSON/YAML parsed object
}

interface ParseResult {
  readonly spec: ResolvedOpenAPISpec; // Fully resolved spec
  readonly version: '3.0' | '3.1';   // Detected OpenAPI version
  readonly warnings: readonly ParseWarning[];
}
```

### `transformSpec(options: TransformOptions): TransformResult`

Transform a parsed OpenAPI spec into MCP tool definitions.

```typescript
interface TransformOptions {
  readonly spec: ResolvedOpenAPISpec;
  readonly filterMethods?: readonly HttpMethod[];  // e.g. ['get', 'post']
  readonly filterPaths?: readonly string[];        // Glob patterns: ['/pets/**']
  readonly filterTags?: readonly string[];         // e.g. ['pets', 'users']
  readonly nameStrategy?: 'operationId' | 'method_path'; // Default: 'operationId'
  readonly includeDeprecated?: boolean;            // Default: false
}

interface TransformResult {
  readonly tools: readonly MCPToolDefinition[];
  readonly warnings: readonly TransformWarning[];
  readonly metadata: {
    readonly specTitle: string;
    readonly specVersion: string;
    readonly openApiVersion: '3.0' | '3.1';
    readonly totalOperations: number;
    readonly transformedCount: number;
    readonly skippedCount: number;
    readonly skippedReasons: ReadonlyMap<string, string>;
  };
}
```

### `MCPToolDefinition`

Each generated tool has the following shape:

```typescript
interface MCPToolDefinition {
  readonly name: string;        // Sanitized tool name (max 64 chars)
  readonly description: string; // From summary/description or generated
  readonly inputSchema: {
    readonly type: 'object';
    readonly properties: Record<string, JSONSchema>;
    readonly required: readonly string[];
  };
  readonly _meta: {
    readonly method: HttpMethod;
    readonly pathTemplate: string;   // e.g. '/pets/{petId}'
    readonly paramMap: Record<string, 'path' | 'query' | 'header'>;
    readonly tags: readonly string[];
    readonly deprecated: boolean;
  };
}
```

## Mapping Rules

| OpenAPI Field | MCP Field | Logic |
|---|---|---|
| `operationId` | `tool.name` | Sanitized to lowercase, underscores. Falls back to `{method}_{path_slug}`. |
| `summary` | `tool.description` | Falls back to `description`, then `"GET /path"`. |
| Path parameters | `inputSchema.properties` | Always required. Mapped in `_meta.paramMap`. |
| Query parameters | `inputSchema.properties` | Required only if `parameter.required=true`. |
| Header parameters | `inputSchema.properties` | `Authorization` and `Content-Type` are skipped. |
| `requestBody` (JSON) | `inputSchema.properties.body` | Full schema inlined. |
| `$ref` | Resolved inline | Deep resolution with cycle detection. |
| `allOf` | Merged schema | Properties merged, last-writer-wins. |
| `oneOf`/`anyOf` | Preserved as-is | Passed through to MCP clients. |

## Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| Missing `operationId` | Generated from `{method}_{path_slug}`, warning emitted |
| Duplicate tool names | Numeric suffix appended (`_2`, `_3`, ...) |
| Circular `$ref` | Cycle broken with `{ type: 'object' }`, warning emitted |
| Empty `paths` | Empty tools array returned |
| Deprecated operations | Skipped by default (configurable via `includeDeprecated`) |
| Binary/multipart body | Operation skipped, warning emitted |
| Reserved param names | Prefixed with `param_` (e.g., `body` becomes `param_body`) |
| Long operation names | Truncated at 64 characters |

## Supported Versions

- OpenAPI 3.0.x (all minor versions)
- OpenAPI 3.1.x (all minor versions)

OpenAPI 2.0 (Swagger) is **not supported**. Convert to 3.x first using tools like [swagger2openapi](https://github.com/Mermade/oas-kit/tree/main/packages/swagger2openapi).

## Error Handling

The package exports typed error classes for precise error handling:

```typescript
import { ParseError, ValidationError, TransformError } from '@apifold/transformer';

try {
  const parsed = parseSpec({ spec: untrustedInput });
} catch (err) {
  if (err instanceof ParseError) {
    // Invalid input (null, array, non-object)
  }
  if (err instanceof ValidationError) {
    // Structural issues (missing openapi field, unsupported version)
  }
}
```

## Security

This package processes untrusted input and includes hardening against:

- **Prototype pollution** — `__proto__`/`constructor`/`prototype` keys are filtered
- **Stack overflow** — Recursion depth capped at 50 levels
- **ReDoS** — Glob patterns use bounded regex alternatives
- **Memory bombs** — Arrays capped at 10K items, objects at 10K keys
- **Exponential blowup** — `$ref` resolution memoized, capped at 1000 resolutions

## License

MIT
