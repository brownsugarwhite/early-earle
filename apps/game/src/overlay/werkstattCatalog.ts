import type { GlyphName } from './glyphs';

/** One entry of the Werkstatt: German name, ≤ 8-word description, route, glyph and a jewel tone for its block. */
export interface WerkstattEntry {
  id: string;
  name: string;
  desc: string;
  to: string;
  glyph: GlyphName;
  color: string;
  /** Prototype code from the plan (P1 … P8), shown small. */
  code?: string;
}

/** Editors write into `content/` (on the Mac, or locally when it is not reachable). */
export const WERKSTATT_EDITORS: WerkstattEntry[] = [
  { id: 'level-editor', name: 'Level-Editor', desc: 'Level malen, testen, vom Solver prüfen', to: '/editor/levels', glyph: 'levels', color: '#b8ff2a' },
  { id: 'wesen-editor', name: 'Wesen-Editor', desc: 'Stufen, Körper, Sockel und Paletten', to: '/editor/creatures', glyph: 'creature', color: '#e5aed4' },
  { id: 'map-editor', name: 'Map-Editor', desc: 'Zonen und zehn Welten einfärben', to: '/editor/map', glyph: 'map', color: '#7ce6d5' },
];

/** Labs: one prototype per route, each with its perf badge. New labs: add them here (and in App.tsx). */
export const WERKSTATT_LABS: WerkstattEntry[] = [
  { id: 'earle-lab', name: 'Earle-Lab', desc: 'Zehn Welten auf dem Planeten', to: '/lab/earle', glyph: 'earle', color: '#937cc2', code: 'P2c' },
  { id: 'baum-lab', name: 'Baum-Lab', desc: 'Riesenbaum: Stamm, Krone, Blüten, Pfad', to: '/lab/tree', glyph: 'tree', color: '#22baa9', code: 'P2d' },
  { id: 'schatten-lab', name: 'Schatten-Lab', desc: 'Harte Earle-Schatten im Vergleich', to: '/lab/shadow', glyph: 'shadow', color: '#b3bb6d', code: 'P2e' },
  { id: 'spielfeld-lab', name: 'Spielfeld-Lab', desc: 'Spielkern: alle 100 Level spielen', to: '/lab/grid', glyph: 'grid', color: '#ddd042', code: 'P3' },
  { id: 'genom-lab', name: 'Genom-Lab', desc: 'Wesen: Arten, Gang, Fell, Maul', to: '/lab/creature', glyph: 'genome', color: '#f0a07a', code: 'P4' },
  { id: 'blob-lab', name: 'Blob-Lab', desc: 'Materialien, Muster und Verschmelzen', to: '/lab/blob', glyph: 'blob', color: '#2de5f8', code: 'P1' },
  { id: 'rex-lab', name: 'REX-Lab', desc: 'REX: Animationen und Platzierung', to: '/lab/rex', glyph: 'rex', color: '#7ce6d5', code: 'P7' },
  { id: 'audio-lab', name: 'Audio-Lab', desc: 'Alle Klänge und Musik zum Antippen', to: '/lab/audio', glyph: 'audio', color: '#c8542a', code: 'P8' },
];
