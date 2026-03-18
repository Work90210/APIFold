---
"@model-translator/transformer": minor
---

feat: implement OpenAPI to MCP transformer engine

- Parse and validate OpenAPI 3.0.x and 3.1.x specs
- Transform operations into MCP tool definitions with full parameter mapping
- Deep $ref resolution with circular reference detection
- allOf merging, oneOf/anyOf preservation
- Filtering by methods, paths (glob), and tags
- Security hardened against prototype pollution, ReDoS, stack overflow, and memory bombs
- ESM + CJS dual output via tsup
- 163 tests at 96.54% coverage across 14 real-world API fixtures
