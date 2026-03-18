import type { ParseInput, ParseResult, ParseWarning, ResolvedOpenAPISpec } from './types.js';
import { ParseError } from './errors.js';
import { resolveRefs } from './resolve.js';
import { validateSpec, detectVersion } from './validate.js';

export function parseSpec(input: ParseInput): ParseResult {
  const { spec } = input;

  if (spec === null || spec === undefined) {
    throw new ParseError('Spec input is null or undefined');
  }

  if (typeof spec !== 'object' || Array.isArray(spec)) {
    throw new ParseError('Spec must be a non-null object');
  }

  const warnings: ParseWarning[] = [];

  const { warnings: validationWarnings } = validateSpec(spec);
  warnings.push(...validationWarnings);

  const { resolved, warnings: resolveWarnings } = resolveRefs(spec);
  warnings.push(...resolveWarnings);

  const resolvedSpec = resolved as ResolvedOpenAPISpec;
  const version = detectVersion(resolvedSpec);

  return {
    spec: resolvedSpec,
    version,
    warnings,
  };
}
