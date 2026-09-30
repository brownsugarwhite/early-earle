import * as rexContent from '../lab/grid/rex';

/**
 * Zeilen einer REX-Szene. Die Inhalte (content/rex/lines.json) liefern sie über `rexScene(id)` aus lab/grid/rex.ts,
 * sobald die Tutorial-Baustelle sie ergänzt hat; bis dahin (und für unbekannte Szenen) gelten die Zeilen hier.
 */
const FALLBACK: Record<string, string[]> = {
  afterLevel1: ['Schau, es bleibt bei uns.', 'Die Erde ist zerbrochen.', 'Jeder Stein heilt ein Stück.', 'Da vorne wartet der nächste.'],
};

/** Liefert, was `rexScene` zurückgibt, als Zeilenliste (Liste, `{ lines }` oder eine einzelne Zeile). */
function asLines(v: unknown): string[] {
  if (typeof v === 'string') return v.trim() ? [v] : [];
  if (Array.isArray(v)) return v.flatMap((x) => asLines(x));
  if (v && typeof v === 'object' && 'lines' in v) return asLines((v as { lines: unknown }).lines);
  return [];
}

export function storyLines(id: string): string[] {
  const scene = (rexContent as unknown as { rexScene?: (id: string) => unknown }).rexScene;
  const lines = typeof scene === 'function' ? asLines(scene(id)) : [];
  return lines.length > 0 ? lines : (FALLBACK[id] ?? []);
}
