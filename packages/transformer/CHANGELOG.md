# @model-translator/transformer

## 0.1.0

### Minor Changes

- Initial release: OpenAPI 3.0/3.1 to MCP tool definition transformer
- Pure-function library with zero runtime dependencies
- Deep `$ref` resolution with circular reference detection
- `allOf` merging, `oneOf`/`anyOf` preservation
- Filtering by HTTP methods, path globs, and tags
- Security hardened against prototype pollution, ReDoS, stack overflow, and memory bombs
- ESM + CJS dual output
