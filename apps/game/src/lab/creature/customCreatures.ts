import { validateCustomCreature, type CustomCreature } from '@ee/genome';

/**
 * Eigene Wesen aus Blender (`content/genome/custom/*.json`, exportiert mit „early earle: Wesen exportieren“,
 * siehe docs/BLENDER.md). Vite bündelt die Dateien; im Dev-Server lädt eine neu exportierte Datei sofort neu.
 * Ungültige Dateien bleiben in der Liste — mit den Meldungen der zod-Prüfung, damit man sie im Lab sieht.
 */
export interface CustomCreatureEntry {
  id: string;
  name: string;
  file: string;
  def: CustomCreature | null;
  issues: string[];
}

const files = import.meta.glob<{ default: unknown }>('@content/genome/custom/*.json', { eager: true });

export const CUSTOM_CREATURES: readonly CustomCreatureEntry[] = Object.entries(files)
  .map(([path, mod]) => {
    const file = path.split('/').pop() ?? path;
    const v = validateCustomCreature(mod.default);
    if (v.ok) return { id: v.def.id, name: v.def.name, file, def: v.def, issues: [] };
    const raw = mod.default as { id?: unknown; name?: unknown } | null;
    const id = typeof raw?.id === 'string' ? raw.id : file.replace(/\.json$/, '');
    return { id, name: typeof raw?.name === 'string' ? raw.name : id, file, def: null, issues: v.issues.map((i) => `${i.path}: ${i.message}`) };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'de'));

export function customCreatureById(id: string | null | undefined): CustomCreatureEntry | null {
  if (!id) return null;
  return CUSTOM_CREATURES.find((c) => c.id === id) ?? null;
}

/** Seed-Marke, mit der das Lab ein eigenes Wesen im Genom trägt (`custom:<id>`). */
export const CUSTOM_SEED_PREFIX = 'custom:';
