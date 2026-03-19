# @apifold/transformer

## 0.2.0

### Minor Changes

- [#27](https://github.com/Work90210/apifold/pull/27) [`3d7b09d`](https://github.com/Work90210/apifold/commit/3d7b09db316dfd62ccee90ff022e271340cb7cd3) Thanks [@Work90210](https://github.com/Work90210)! - feat: implement OpenAPI to MCP transformer engine
  - Parse and validate OpenAPI 3.0.x and 3.1.x specs
  - Transform operations into MCP tool definitions with full parameter mapping
  - Deep $ref resolution with circular reference detection
  - allOf merging, oneOf/anyOf preservation
  - Filtering by methods, paths (glob), and tags
  - Security hardened against prototype pollution, ReDoS, stack overflow, and memory bombs
  - ESM + CJS dual output via tsup
  - 163 tests at 96.54% coverage across 14 real-world API fixtures

## 0.1.0

### Minor Changes

- Initial release: OpenAPI 3.0/3.1 to MCP tool definition transformer
- Pure-function library with zero runtime dependencies
- Deep `$ref` resolution with circular reference detection
- `allOf` merging, `oneOf`/`anyOf` preservation
- Filtering by HTTP methods, path globs, and tags
- Security hardened against prototype pollution, ReDoS, stack overflow, and memory bombs
- ESM + CJS dual output
