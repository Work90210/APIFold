# Contributing to the APIFold Registry

Want to add an API to the registry? Here's how.

## Adding a New Spec

1. **Fork the repo** and create a branch: `git checkout -b registry/add-<api-name>`

2. **Create the spec directory**:
   ```
   packages/registry/specs/<api-id>/
     spec.json    # OpenAPI 3.0 spec (JSON)
     meta.json    # Metadata (see schema below)
   ```

3. **Add a `meta.json`** with this schema:
   ```json
   {
     "id": "your-api",
     "name": "Your API",
     "description": "One-line description of what the API does",
     "category": "developer-tools",
     "authType": "bearer",
     "docsUrl": "https://docs.your-api.com",
     "tags": ["relevant", "search", "terms"]
   }
   ```

   Valid categories: `payments`, `developer-tools`, `communication`, `crm`, `ai`, `productivity`, `demo`
   Valid authTypes: `bearer`, `api_key`, `oauth`, `basic`, `none`

4. **Add the spec.json** — must be a valid OpenAPI 3.0 document. Swagger 2.0 specs will not be accepted (convert first using `swagger2openapi`).

5. **Add the catalog entry** in `src/index.ts` — add your entry to the `CATALOG` array.

6. **Validate**: Run `pnpm --filter @apifold/registry validate` to ensure the spec parses cleanly.

7. **Submit a PR** with the title: `registry: add <API Name>`

## Guidelines

- Keep specs minimal but representative (include the most useful operations)
- All operations must have an `operationId`
- Remove internal/admin-only endpoints
- Test that `@apifold/transformer` generates useful MCP tools from the spec
- One spec per API provider (not per API version)

## What We Look For

- Popular APIs that developers frequently integrate with
- Clean, well-structured OpenAPI specs
- Accurate metadata and descriptions
- Appropriate auth type classification
