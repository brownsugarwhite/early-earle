import formatsJson from '@content/klassik/formats.json';
import { isFormatUnlocked, parseKlassikFormats, type KlassikFormat } from '@ee/core';

/** Rasterformate des Klassik-Modus (content/klassik/formats.json) in Freischalt-Reihenfolge. */
export const KLASSIK_FORMATS: readonly KlassikFormat[] = [...parseKlassikFormats(formatsJson).formats].sort((a, b) => a.unlockAfterLevel - b.unlockAfterLevel);

export function formatById(id: string): KlassikFormat | undefined {
  return KLASSIK_FORMATS.find((f) => f.id === id);
}

/**
 * Ist das Format im aktiven Stand offen? Frei (Entwicklung): alle; echt: ab dem Sieg über Level `unlockAfterLevel`
 * (`reached` = höchster freigeschalteter Knoten = Zahl der gewonnenen Level in Folge).
 */
export function formatOpen(format: KlassikFormat, mode: 'real' | 'free', reached: number): boolean {
  return mode === 'free' || isFormatUnlocked(format, reached);
}

/** IDs der offenen Formate im Stand. */
export function openFormatIds(mode: 'real' | 'free', reached: number): string[] {
  return KLASSIK_FORMATS.filter((f) => formatOpen(f, mode, reached)).map((f) => f.id);
}

/**
 * Seed-Basis des `run`-ten Durchgangs eines Formats (0 = erster). Jeder Start aus dem Blatt zählt hoch, so bringt
 * jede Runde ein neues Brett und bleibt doch nachspielbar (frischer Speicher → immer dasselbe erste Brett).
 */
export function classicSeedFor(formatId: string, run = 0): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < formatId.length; i++) h = Math.imul(h ^ formatId.charCodeAt(i), 0x01000193);
  return ((h >>> 1) + Math.imul(run, 7919)) % 1_000_000_007;
}
