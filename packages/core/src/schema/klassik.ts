/**
 * KlassikSchema — Rasterformate des Klassik-Modus (freies 2048), `content/klassik/formats.json`.
 *
 * Ein Format ist offen, sobald Level `unlockAfterLevel` (globale Levelnummer, 1-basiert) gewonnen
 * ist; 0 = von Anfang an. Die Maske folgt der Level-Maske: `.` spielbar, `#` Riss, `P` Pfeiler.
 * `classicLevel(format, zone)` baut daraus das spielbare Level im Modus `classic`.
 */

import { z } from 'zod';
import type { LevelDef, ZoneId } from './level';

/** Höchstens so viele spielbare Zellen (Blob-Kapazität des Bretts: 6 × 6). */
export const KLASSIK_MAX_CELLS = 36;
/** Mindestens so viele spielbare Zellen (darunter ist es kein 2048 mehr). */
export const KLASSIK_MIN_CELLS = 6;

const Int = z.number().int();

export const KlassikFormatSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Kurzer Anzeigename („4×4“, „Kreuz“). */
  name: z.string().min(1).max(12),
  grid: z.object({
    w: Int.min(3).max(8),
    h: Int.min(3).max(8),
    mask: z
      .array(z.string().regex(/^[.#P]+$/))
      .min(3)
      .max(8),
  }),
  /** Globale Levelnummer, nach deren Sieg das Format offen ist (0 = sofort). */
  unlockAfterLevel: Int.min(0).max(999),
});

export const KlassikFormatsSchema = z
  .object({
    schemaVersion: z.literal(1),
    formats: z.array(KlassikFormatSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    file.formats.forEach((f, i) => {
      const issue = (message: string, path: (string | number)[] = []) =>
        ctx.addIssue({ code: 'custom', message, path: ['formats', i, ...path] });
      if (ids.has(f.id)) issue(`duplicate format id '${f.id}'`, ['id']);
      ids.add(f.id);
      const { w, h, mask } = f.grid;
      if (mask.length !== h) issue(`mask must have ${h} rows`, ['grid', 'mask']);
      mask.forEach((row, y) => {
        if (row.length !== w) issue(`mask row ${y} must have ${w} chars`, ['grid', 'mask', y]);
      });
      const cells = playableCells(mask);
      if (cells > KLASSIK_MAX_CELLS)
        issue(`at most ${KLASSIK_MAX_CELLS} playable cells (has ${cells})`, ['grid', 'mask']);
      if (cells < KLASSIK_MIN_CELLS)
        issue(`at least ${KLASSIK_MIN_CELLS} playable cells (has ${cells})`, ['grid', 'mask']);
    });
  });

export type KlassikFormat = z.infer<typeof KlassikFormatSchema>;
export type KlassikFormats = z.infer<typeof KlassikFormatsSchema>;

/** Parst und prüft die Formatdatei; wirft einen ZodError mit Pfaden. */
export function parseKlassikFormats(input: unknown): KlassikFormats {
  return KlassikFormatsSchema.parse(input);
}

/** Anzahl der spielbaren Zellen (`.`) einer Maske. */
export function playableCells(mask: readonly string[]): number {
  let n = 0;
  for (const row of mask) for (const ch of row) if (ch === '.') n++;
  return n;
}

/** Offen bei `reached` (höchster freigeschalteter Knoten, 0-basiert = Zahl gewonnener Level)? */
export function isFormatUnlocked(
  format: Pick<KlassikFormat, 'unlockAfterLevel'>,
  reached: number,
): boolean {
  return reached >= format.unlockAfterLevel;
}

/**
 * Das spielbare Klassik-Level eines Formats: ohne Elemente und Ziele, Spawn überall (90 % Stufe 1,
 * 10 % Stufe 2), Spezialteile aus. `moves` und `cap` stehen nur für das Schema da, die
 * Klassik-Regeln lesen sie nicht. Die Zone bestimmt Musik und Klang der Umgebung; die Blobs sind
 * in jeder Zone Gelee (siehe applyMove).
 */
export function classicLevel(format: KlassikFormat, zone: ZoneId = 'tjorizo'): LevelDef {
  return {
    schemaVersion: 1,
    id: `klassik-${format.id}`,
    zone,
    mode: 'classic',
    name: `Klassik ${format.name}`,
    grid: { w: format.grid.w, h: format.grid.h, mask: [...format.grid.mask] },
    fences: [],
    floors: [],
    blockers: [],
    threats: [],
    start: [],
    spawn: {
      sources: [],
      table: [
        { tier: 1, weight: 9 },
        { tier: 2, weight: 1 },
      ],
      preview: false,
      fallback: 'anyEmpty',
    },
    goals: [],
    moves: 99,
    cap: 12,
    specials: { lineAt: 16, burstAt: 16 },
    difficulty: { targetAttempts: [1, 1] },
  };
}
