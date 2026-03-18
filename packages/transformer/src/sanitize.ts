const MAX_NAME_LENGTH = 64;

const RESERVED_PARAM_NAMES = new Set(['body']);

export function sanitizeName(input: string): string {
  const lowered = input.toLowerCase();
  const replaced = lowered.replace(/[^a-z0-9]/g, '_');
  const collapsed = replaced.replace(/_+/g, '_');
  const trimmed = collapsed.replace(/^_|_$/g, '');
  return trimmed.slice(0, MAX_NAME_LENGTH);
}

export function pathToSlug(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/[{}]/g, ''))
    .join('_');
}

export function generateToolName(method: string, path: string): string {
  const slug = pathToSlug(path);
  return sanitizeName(`${method}_${slug}`);
}

export function deduplicateNames(names: readonly string[]): readonly string[] {
  const used = new Set<string>();
  const result: string[] = [];

  for (const name of names) {
    const baseName = name || 'unnamed';
    let candidate = baseName;
    let suffix = 2;

    while (used.has(candidate)) {
      candidate = truncateWithSuffix(baseName, `_${suffix}`);
      suffix++;
    }

    used.add(candidate);
    result.push(candidate);
  }

  return result;
}

function truncateWithSuffix(name: string, suffix: string): string {
  const maxBase = Math.max(0, MAX_NAME_LENGTH - suffix.length);
  const base = name.slice(0, maxBase);
  return `${base}${suffix}`;
}

export function sanitizeParamName(name: string): string {
  if (RESERVED_PARAM_NAMES.has(name)) {
    return `param_${name}`;
  }
  return name;
}
