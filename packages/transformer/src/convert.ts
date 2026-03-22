import type { ConvertOutputOptions } from 'swagger2openapi';

export interface ConvertResult {
  readonly spec: unknown;
  readonly converted: boolean;
  readonly originalVersion?: string;
  readonly warnings: readonly string[];
}

function isSwagger2(spec: unknown): boolean {
  if (spec === null || typeof spec !== 'object') return false;
  const obj = spec as Record<string, unknown>;
  return typeof obj['swagger'] === 'string' && obj['swagger'].startsWith('2');
}

/**
 * Auto-detect Swagger 2.0 specs and convert them to OpenAPI 3.0.
 *
 * This is the only async function in the transformer package.
 * It is a separate export to preserve the library's synchronous
 * pure-function contract for parseSpec/transformSpec.
 */
export async function autoConvert(spec: unknown): Promise<ConvertResult> {
  if (!isSwagger2(spec)) {
    return Object.freeze({ spec, converted: false, warnings: [] });
  }

  const warnings: string[] = [];

  // Dynamic import to keep swagger2openapi out of the sync bundle path
  const { convertObj } = await import('swagger2openapi');

  // structuredClone neutralizes prototype pollution vectors (__proto__, constructor.prototype)
  // that could exist in user-supplied specs before swagger2openapi processes them.
  const result: ConvertOutputOptions = await convertObj(structuredClone(spec) as never, {
    patch: true,
    warnOnly: true,
    warnFunc: (message: string) => {
      warnings.push(message);
    },
  } as never);

  return Object.freeze({
    spec: result.openapi,
    converted: true,
    originalVersion: '2.0',
    warnings,
  });
}
