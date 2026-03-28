const NAMESPACE_SEPARATOR = '__';

export function prefixToolName(namespace: string, toolName: string): string {
  if (namespace.includes(NAMESPACE_SEPARATOR)) {
    throw new Error(`Namespace "${namespace}" must not contain the separator "${NAMESPACE_SEPARATOR}"`);
  }
  return `${namespace}${NAMESPACE_SEPARATOR}${toolName}`;
}

export function stripNamespace(namespacedName: string): { namespace: string; toolName: string } | null {
  const idx = namespacedName.indexOf(NAMESPACE_SEPARATOR);
  if (idx < 0) return null;
  return {
    namespace: namespacedName.slice(0, idx),
    toolName: namespacedName.slice(idx + NAMESPACE_SEPARATOR.length),
  };
}

export function isNamespaced(name: string): boolean {
  return name.includes(NAMESPACE_SEPARATOR);
}

export { NAMESPACE_SEPARATOR };
