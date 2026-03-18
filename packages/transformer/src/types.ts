export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options' | 'trace';

export type JSONSchema = Readonly<Record<string, unknown>>;

// --- Parse Types ---

export interface ParseInput {
  readonly spec: unknown;
}

export interface ParseWarning {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export interface ParseResult {
  readonly spec: ResolvedOpenAPISpec;
  readonly version: '3.0' | '3.1';
  readonly warnings: readonly ParseWarning[];
}

// --- OpenAPI Types ---

export interface OpenAPIParameter {
  readonly name: string;
  readonly in: 'path' | 'query' | 'header' | 'cookie';
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly description?: string;
  readonly schema?: JSONSchema;
  readonly $ref?: string;
}

export interface OpenAPIRequestBody {
  readonly required?: boolean;
  readonly description?: string;
  readonly content?: Readonly<Record<string, { readonly schema?: JSONSchema }>>;
  readonly $ref?: string;
}

export interface OpenAPIOperation {
  readonly operationId?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly deprecated?: boolean;
  readonly parameters?: readonly OpenAPIParameter[];
  readonly requestBody?: OpenAPIRequestBody;
  readonly responses?: Readonly<Record<string, unknown>>;
}

export interface OpenAPIPathItem {
  readonly parameters?: readonly OpenAPIParameter[];
  readonly get?: OpenAPIOperation;
  readonly post?: OpenAPIOperation;
  readonly put?: OpenAPIOperation;
  readonly delete?: OpenAPIOperation;
  readonly patch?: OpenAPIOperation;
  readonly head?: OpenAPIOperation;
  readonly options?: OpenAPIOperation;
  readonly trace?: OpenAPIOperation;
}

export interface OpenAPIInfo {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
}

export interface ResolvedOpenAPISpec {
  readonly openapi: string;
  readonly info: OpenAPIInfo;
  readonly paths: Readonly<Record<string, OpenAPIPathItem>>;
  readonly components?: Readonly<Record<string, unknown>>;
}

// --- Transform Types ---

export interface TransformOptions {
  readonly spec: ResolvedOpenAPISpec;
  readonly filterMethods?: readonly HttpMethod[];
  readonly filterPaths?: readonly string[];
  readonly filterTags?: readonly string[];
  readonly nameStrategy?: 'operationId' | 'method_path';
  readonly includeDeprecated?: boolean;
}

export interface TransformWarning {
  readonly code: string;
  readonly message: string;
  readonly operationId?: string;
  readonly path?: string;
  readonly method?: string;
}

export interface MCPToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: {
    readonly type: 'object';
    readonly properties: Readonly<Record<string, JSONSchema>>;
    readonly required: readonly string[];
  };
  readonly _meta: {
    readonly method: HttpMethod;
    readonly pathTemplate: string;
    readonly paramMap: Readonly<Record<string, 'path' | 'query' | 'header'>>;
    readonly tags: readonly string[];
    readonly deprecated: boolean;
  };
}

export interface TransformResult {
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
