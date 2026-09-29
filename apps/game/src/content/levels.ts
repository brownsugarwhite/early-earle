import { parseLevel, type LevelDef } from '@ee/core';

/** Alle Level aus content/levels/*.json (Dateien mit _-Präfix sind Entwürfe/Kalibrierung und werden übersprungen). */
const modules = import.meta.glob<{ default: unknown }>('@content/levels/*.json', { eager: true });

export const LEVELS: LevelDef[] = Object.entries(modules)
  .filter(([path]) => !/\/_[^/]*\.json$/.test(path))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, m]) => parseLevel(m.default));

export function levelByIndex(i: number): LevelDef | undefined {
  return LEVELS[i];
}
