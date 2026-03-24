import { TransformError } from './errors.js';
import { sanitizeName, generateToolName, deduplicateNames, sanitizeParamName } from './sanitize.js';
import { flattenSchema } from './schema.js';
import type {
  HttpMethod,
  JSONSchema,
  MCPToolDefinition,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIRequestBody,
  TransformOptions,
  TransformResult,
  TransformWarning,
} from './types.js';

const HTTP_METHODS: readonly HttpMethod[] = [
  'get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace',
];

const SKIPPED_HEADERS = new Set(['authorization', 'content-type']);

const MAX_PATHS = 10_000;

const BINARY_MEDIA_TYPES = new Set([
  'multipart/form-data',
  'application/octet-stream',
]);

export function transformSpec(options: TransformOptions): TransformResult {
  const {
    spec,
    filterMethods,
    filterPaths,
    filterTags,
    nameStrategy = 'operationId',
    includeDeprecated = false,
  } = options;

  const warnings: TransformWarning[] = [];
  const skippedReasons = new Map<string, string>();
  const toolEntries: { readonly name: string; readonly tool: MCPToolDefinition }[] = [];
  let totalOperations = 0;

  const compiledPathPatterns = filterPaths ? compilePatterns(filterPaths) : undefined;
  const paths = spec.paths ?? {};

  const pathEntries = Object.entries(paths);
  if (pathEntries.length > MAX_PATHS) {
    warnings.push({
      code: 'PATHS_TRUNCATED',
      message: `Spec has ${pathEntries.length} paths, truncated to ${MAX_PATHS}`,
    });
  }

  for (const [path, pathItem] of pathEntries.slice(0, MAX_PATHS)) {
    if (compiledPathPatterns && !matchesAnyPattern(path, compiledPathPatterns)) {
      continue;
    }

    const pathLevelParams = (pathItem.parameters ?? []) as readonly OpenAPIParameter[];

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as OpenAPIOperation | undefined;
      if (!operation) continue;

      if (filterMethods && !filterMethods.includes(method)) {
        continue;
      }

      if (filterTags && filterTags.length > 0) {
        const opTags = operation.tags ?? [];
        if (!opTags.some((tag) => filterTags.includes(tag))) {
          continue;
        }
      }

      totalOperations++;

      if (operation.deprecated && !includeDeprecated) {
        const opId = operation.operationId ?? generateToolName(method, path);
        skippedReasons.set(opId, 'deprecated');
        continue;
      }

      if (hasBinaryRequestBody(operation)) {
        const opId = operation.operationId ?? generateToolName(method, path);
        skippedReasons.set(opId, 'binary/multipart request body not supported');
        warnings.push({
          code: 'UNSUPPORTED_BODY',
          message: `Skipping ${method.toUpperCase()} ${path}: binary/multipart request body`,
          operationId: opId,
          path,
          method,
        });
        continue;
      }

      const rawName = resolveToolName(operation, method, path, nameStrategy, warnings);
      const tool = operationToTool(operation, method, path, rawName, pathLevelParams);
      toolEntries.push({ name: rawName, tool });
    }
  }

  const rawNames = toolEntries.map((e) => e.name);
  const dedupedNames = deduplicateNames(rawNames);

  const tools: MCPToolDefinition[] = toolEntries.map((entry, i) => {
    const finalName = dedupedNames[i]!;
    if (finalName !== entry.name) {
      warnings.push({
        code: 'DUPLICATE_NAME',
        message: `Duplicate tool name "${entry.name}" renamed to "${finalName}"`,
        operationId: entry.name,
      });
    }
    return { ...entry.tool, name: finalName };
  });

  return {
    tools,
    warnings,
    metadata: {
      specTitle: spec.info.title,
      specVersion: spec.info.version,
      openApiVersion: spec.openapi.startsWith('3.1') ? '3.1' : '3.0',
      totalOperations,
      transformedCount: tools.length,
      skippedCount: totalOperations - tools.length,
      skippedReasons,
    },
  };
}

function resolveToolName(
  operation: OpenAPIOperation,
  method: string,
  path: string,
  strategy: 'operationId' | 'method_path',
  warnings: TransformWarning[],
): string {
  if (strategy === 'method_path') {
    return generateToolName(method, path);
  }

  if (!operation.operationId) {
    warnings.push({
      code: 'MISSING_OPERATION_ID',
      message: `No operationId for ${method.toUpperCase()} ${path}, generating from method+path`,
      path,
      method,
    });
    return generateToolName(method, path);
  }

  const sanitized = sanitizeName(operation.operationId);
  if (sanitized.length === 0) {
    warnings.push({
      code: 'INVALID_OPERATION_ID',
      message: `operationId "${operation.operationId}" sanitized to empty string, generating from method+path`,
      operationId: operation.operationId,
      path,
      method,
    });
    return generateToolName(method, path);
  }

  return sanitized;
}

function operationToTool(
  operation: OpenAPIOperation,
  method: HttpMethod,
  path: string,
  name: string,
  pathLevelParams: readonly OpenAPIParameter[],
): MCPToolDefinition {
  const description = resolveDescription(operation, method, path);
  const properties = Object.create(null) as Record<string, JSONSchema>;
  const required: string[] = [];
  const paramMap = Object.create(null) as Record<string, 'path' | 'query' | 'header'>;

  const allParams = mergeParameters(pathLevelParams, operation.parameters ?? []);
  const usedParamNames = new Set<string>();

  // Reserve 'body' for request body to prevent collisions
  if (operation.requestBody?.content) {
    usedParamNames.add('body');
  }

  for (const param of allParams) {
    if (param.in === 'cookie') continue;
    if (param.in === 'header' && SKIPPED_HEADERS.has(param.name.toLowerCase())) continue;

    let paramName = sanitizeParamName(param.name);

    // Deduplicate if sanitized name collides with another param or 'body'
    if (usedParamNames.has(paramName)) {
      let suffix = 2;
      while (usedParamNames.has(`${paramName}_${suffix}`)) {
        suffix++;
      }
      paramName = `${paramName}_${suffix}`;
    }
    usedParamNames.add(paramName);

    const schema = param.schema ? flattenSchema(param.schema) : { type: 'string' };

    properties[paramName] = param.description
      ? { ...schema, description: param.description }
      : schema;

    if (param.in === 'path' || param.required) {
      required.push(paramName);
    }

    paramMap[paramName] = param.in as 'path' | 'query' | 'header';
  }

  const bodyResult = extractRequestBody(operation.requestBody);
  if (bodyResult) {
    properties['body'] = bodyResult.schema;
    if (bodyResult.required) {
      required.push('body');
    }
  }

  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      required,
    },
    _meta: {
      method,
      pathTemplate: path,
      paramMap,
      tags: operation.tags ?? [],
      deprecated: operation.deprecated ?? false,
    },
  };
}

function resolveDescription(
  operation: OpenAPIOperation,
  method: string,
  path: string,
): string {
  if (operation.description) return operation.description;
  if (operation.summary) return operation.summary;
  return `${method.toUpperCase()} ${path}`;
}

function extractRequestBody(
  requestBody: OpenAPIRequestBody | undefined,
): { readonly schema: JSONSchema; readonly required: boolean } | null {
  if (!requestBody?.content) return null;

  const jsonContent = requestBody.content['application/json'];
  if (jsonContent?.schema) {
    return {
      schema: flattenSchema(jsonContent.schema),
      required: requestBody.required ?? false,
    };
  }

  const formContent = requestBody.content['application/x-www-form-urlencoded'];
  if (formContent?.schema) {
    return {
      schema: flattenSchema(formContent.schema),
      required: requestBody.required ?? false,
    };
  }

  return null;
}

function hasBinaryRequestBody(operation: OpenAPIOperation): boolean {
  const content = operation.requestBody?.content;
  if (!content) return false;

  const mediaTypes = Object.keys(content);
  return mediaTypes.length > 0 && mediaTypes.every((mt) => BINARY_MEDIA_TYPES.has(mt));
}

function mergeParameters(
  pathLevel: readonly OpenAPIParameter[],
  operationLevel: readonly OpenAPIParameter[],
): readonly OpenAPIParameter[] {
  const merged = new Map<string, OpenAPIParameter>();

  for (const param of pathLevel) {
    merged.set(`${param.in}:${param.name}`, param);
  }

  for (const param of operationLevel) {
    merged.set(`${param.in}:${param.name}`, param);
  }

  return [...merged.values()];
}

const MAX_PATTERN_LENGTH = 256;

function compileGlob(pattern: string): RegExp {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new TransformError(`filterPaths pattern exceeds ${MAX_PATTERN_LENGTH} chars`);
  }
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\0GLOBSTAR\0')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\0GLOBSTAR\0/g, '(?:[^/]+/)*[^/]*');
  return new RegExp(`^${regexStr}$`);
}

function compilePatterns(patterns: readonly string[]): readonly RegExp[] {
  return patterns.map(compileGlob);
}

function matchesAnyPattern(path: string, compiled: readonly RegExp[]): boolean {
  return compiled.some((regex) => regex.test(path));
}
