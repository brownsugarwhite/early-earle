/** JSON with 2-space indent, but arrays of primitives (coordinates, masks) stay on one line — matches prettier. */
export function formatJson(value: unknown, indent = ''): string {
  if (Array.isArray(value)) {
    const isPrimitive = (v: unknown) => v === null || typeof v !== 'object';
    if (value.every(isPrimitive)) {
      return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
    }
    // A single primitive array (e.g. one spawn source) stays on one line, like prettier.
    if (value.length === 1 && Array.isArray(value[0]) && value[0].every(isPrimitive)) {
      return `[${formatJson(value[0])}]`;
    }
    const inner = indent + '  ';
    return `[\n${value.map((v) => inner + formatJson(v, inner)).join(',\n')}\n${indent}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    );
    if (entries.length === 0) return '{}';
    const inner = indent + '  ';
    return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${formatJson(v, inner)}`).join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}
