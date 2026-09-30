import { rexScene } from '../lab/grid/rex';

/**
 * Zeilen einer REX-Szene: die Inhalte (content/rex/lines.json → `scenes`) über `rexScene(id)`; fehlt die Szene dort,
 * gelten die Zeilen hier (damit der Flow auch mit älteren Inhalten erzählt).
 */
const FALLBACK: Record<string, string[]> = {
  afterLevel1: ['Schau, es bleibt bei uns.', 'Die Erde ist zerbrochen.', 'Jeder Stein heilt ein Stück.', 'Da vorne wartet der nächste.'],
};

export function storyLines(id: string): string[] {
  const lines = rexScene(id).filter((l) => l.trim().length > 0);
  return lines.length > 0 ? lines : (FALLBACK[id] ?? []);
}
