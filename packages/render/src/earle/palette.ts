import { ClampToEdgeWrapping, DataTexture, NearestFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType } from 'three/webgpu';

/**
 * Paletten-Atlas: eine kleine RGBA8-Textur mit Nearest-Filter. Zeile = Rampe (Terrain-Welt, Kronen, Himmel,
 * Nebel, Akzente), x = Stufe. Konvention für Terrain/Kronen: x = 0 Tinte, x = 1.. Lichtstufen (dunkel → hell).
 * Nebelzeile: x = 0 kein Nebel (Alpha 0), dann Stufen mit steigendem Alpha. Himmelszeile: x = 0 Horizont … Zenit.
 */
export interface PaletteRowSpec {
  name: string;
  /** Hex-Farben `#rrggbb`, max. 8 Stufen. */
  steps: string[];
  /** Optionales Alpha je Stufe (0..1), Standard 1. Für Nebel = Nebelanteil. */
  alphas?: number[];
}

export class PaletteAtlas {
  static readonly WIDTH = 8;
  static readonly HEIGHT = 128;
  readonly texture: DataTexture;
  private readonly data: Uint8Array;
  private readonly rows = new Map<string, { index: number; steps: number }>();
  private nextRow = 0;

  constructor() {
    this.data = new Uint8Array(PaletteAtlas.WIDTH * PaletteAtlas.HEIGHT * 4);
    this.texture = new DataTexture(this.data, PaletteAtlas.WIDTH, PaletteAtlas.HEIGHT, RGBAFormat, UnsignedByteType);
    this.texture.magFilter = NearestFilter;
    this.texture.minFilter = NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.wrapS = ClampToEdgeWrapping;
    this.texture.wrapT = ClampToEdgeWrapping;
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.name = 'EarlePaletteAtlas';
    this.texture.needsUpdate = true;
  }

  get width(): number {
    return PaletteAtlas.WIDTH;
  }

  get height(): number {
    return PaletteAtlas.HEIGHT;
  }

  /** Fügt eine Rampe hinzu (oder ersetzt sie, wenn der Name existiert) und liefert den Zeilenindex. */
  addRow(spec: PaletteRowSpec): number {
    if (spec.steps.length === 0 || spec.steps.length > PaletteAtlas.WIDTH) {
      throw new Error(`Palette row "${spec.name}" needs 1..${PaletteAtlas.WIDTH} steps`);
    }
    const existing = this.rows.get(spec.name);
    const index = existing ? existing.index : this.nextRow++;
    if (index >= PaletteAtlas.HEIGHT) throw new Error('Palette atlas is full');
    for (let x = 0; x < PaletteAtlas.WIDTH; x++) {
      // Überzählige Stufen wiederholen die letzte Farbe, damit Band-Lookups nie ins Leere greifen
      const hex = spec.steps[Math.min(x, spec.steps.length - 1)]!;
      const a = spec.alphas?.[Math.min(x, spec.steps.length - 1)] ?? 1;
      const o = (index * PaletteAtlas.WIDTH + x) * 4;
      const [r, g, b] = hexToRgb8(hex);
      this.data[o] = r;
      this.data[o + 1] = g;
      this.data[o + 2] = b;
      this.data[o + 3] = Math.round(Math.min(1, Math.max(0, a)) * 255);
    }
    this.rows.set(spec.name, { index, steps: spec.steps.length });
    this.texture.needsUpdate = true;
    return index;
  }

  row(name: string): number {
    const r = this.rows.get(name);
    if (!r) throw new Error(`Unknown palette row "${name}"`);
    return r.index;
  }

  steps(name: string): number {
    const r = this.rows.get(name);
    if (!r) throw new Error(`Unknown palette row "${name}"`);
    return r.steps;
  }

  get rowCount(): number {
    return this.nextRow;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

export function hexToRgb8(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Zonenpalette: Tinte, Terrain-Lichtstufen, Kronen (Tinte, 2 Lichtstufen, 3 Punktfarben), Himmel, Nebel. */
export interface ZonePalette {
  ink: string;
  terrain: string[];
  canopy: string[];
  sky: string[];
  sun: string;
  sunRing: string;
  fog: string[];
  fogAlpha: number[];
}

/**
 * Weltpalette (zehn Welten, je eine Earle-Serigrafie): wie die Zonenpalette plus
 * - `canopy` mit 7 Einträgen: 2 Lichtbänder, 3 Punktfarben (Schattenseite, Lichtseite ×2), 2 Motivfarben (Rauten/Kreuze),
 * - `canopyVariants`: weitere Kronenzeilen (Juwelenwald: rot, blau, türkis) mit derselben Struktur,
 * - `accent` (8): 0 Stamm hell, 1–3 Stammstreifen, 4–5 Flechten, 6 Requisit A (Scheunenrot, Rost), 7 Requisit B (Schraffur, Ölreflex),
 * - optionale Requisitenzeilen `monolith` und `barn` (Tinte + 4 Lichtstufen).
 */
export interface WorldPalette extends ZonePalette {
  canopyVariants?: string[][];
  accent: string[];
  monolith?: string[];
  barn?: string[];
  /**
   * Wasser (8): 0 Tiefe/Spiegelung im Schatten, 1 dunkel, 2 Grundton, 3 hell (Flachwasser), 4 Glanzstreifen,
   * 5 Gischt/Eis-Hell, 6 Linien (Eisrisse), 7 Reserve. Fehlt → aus dem Himmel abgeleitet (Wasser spiegelt den Himmel).
   */
  water?: string[];
  /** Fels (8): 0 Tinte, 1–4 Lichtstufen, 5 Deckfläche (Moos/Schnee), 6 Schraffurlinien, 7 Glyphen. Fehlt → aus Terrain. */
  rock?: string[];
  /** Schneefelder (≤ 8): 0 Schatten (gesättigtes Blau), 1.. Lichtstufen bis Creme. Fehlt → keine eigene Schneezeile. */
  snow?: string[];
}

/** Tjorizo (aus dem Plan und Florians Draft): Neongrün-Himmel, Khaki-Hügel, olive Tinte. */
export const TJORIZO_PALETTE: ZonePalette = {
  ink: '#242c0b',
  terrain: ['#606e4f', '#7f8f5a', '#9daa63', '#b3bb6d', '#d9d77f'],
  // x=1..2 Lichtbänder der Krone, x=3 Punkte Schattenseite, x=4..5 Punkte Lichtseite (zwei hellste Stufen)
  canopy: ['#33421a', '#4e6224', '#5f7530', '#a3b368', '#dfdc86'],
  // Horizont → Zenit
  sky: ['#e2f9ef', '#caf5e4', '#a6efda', '#7ce6d5', '#8eeea0', '#b8ff2a'],
  sun: '#f7f6d8',
  sunRing: '#e9f9d6',
  // nah → fern (x=0 = kein Nebel)
  fog: ['#7ce6d5', '#3f8f83', '#5fbcb0', '#8fdccd', '#b8ecdd', '#d6f6ea'],
  fogAlpha: [0, 0.35, 0.55, 0.72, 0.85, 0.94],
};

export interface ZoneRows {
  terrain: number;
  canopy: number;
  sky: number;
  fog: number;
}

export interface WorldRows extends ZoneRows {
  /** Alle Kronenzeilen (Hauptzeile zuerst). */
  canopyRows: number[];
  accent: number;
  monolith: number;
  barn: number;
  /** Wasserzeile (Seen, Flüsse). */
  water: number;
  /** Felszeile (Formationen, Steilwände). */
  rock: number;
  /** Schneefeldzeile oder die Terrainzeile, wenn die Welt keine eigene hat. */
  snow: number;
}

/** Schreibt eine Zonenpalette als vier Zeilen in den Atlas (Prefix erlaubt mehrere Zonen im selben Atlas). */
export function addZonePalette(atlas: PaletteAtlas, zone: ZonePalette, prefix = 'tjorizo'): ZoneRows {
  const terrain = atlas.addRow({ name: `${prefix}/terrain`, steps: [zone.ink, ...zone.terrain] });
  const canopy = atlas.addRow({ name: `${prefix}/canopy`, steps: [zone.ink, ...zone.canopy] });
  const sky = atlas.addRow({ name: `${prefix}/sky`, steps: [...zone.sky, zone.sun, zone.sunRing] });
  const fog = atlas.addRow({ name: `${prefix}/fog`, steps: zone.fog, alphas: zone.fogAlpha });
  return { terrain, canopy, sky, fog };
}

/**
 * Schreibt eine Weltpalette (5–10 Zeilen) in den Atlas. `need` spart Atlaszeilen: ohne Gewässer bzw. Felsen in der
 * Welt fallen die abgeleiteten Wasser-/Felszeilen weg (die Zeile zeigt dann auf die Terrainzeile).
 */
export function addWorldPalette(atlas: PaletteAtlas, world: WorldPalette, prefix: string, need: { water?: boolean; rock?: boolean } = {}): WorldRows {
  const base = addZonePalette(atlas, world, prefix);
  const canopyRows = [base.canopy];
  (world.canopyVariants ?? []).forEach((steps, i) => canopyRows.push(atlas.addRow({ name: `${prefix}/canopy${i + 1}`, steps: [world.ink, ...steps] })));
  const accent = atlas.addRow({ name: `${prefix}/accent`, steps: world.accent.slice(0, 8) });
  const monolith = world.monolith ? atlas.addRow({ name: `${prefix}/monolith`, steps: world.monolith }) : base.terrain;
  const barn = world.barn ? atlas.addRow({ name: `${prefix}/barn`, steps: world.barn }) : base.terrain;
  const water = world.water || need.water !== false ? atlas.addRow({ name: `${prefix}/water`, steps: (world.water ?? waterFromSky(world)).slice(0, 8) }) : base.terrain;
  const rock = world.rock || need.rock !== false ? atlas.addRow({ name: `${prefix}/rock`, steps: (world.rock ?? rockFromTerrain(world)).slice(0, 8) }) : base.terrain;
  const snow = world.snow ? atlas.addRow({ name: `${prefix}/snow`, steps: world.snow.slice(0, 8) }) : base.terrain;
  return { ...base, canopyRows, accent, monolith, barn, water, rock, snow };
}

/**
 * Wasser spiegelt den Himmel, eine Stufe tiefer als er (hebt sich vom Terrain ab): Tiefe, dunkel, Grundton, hell,
 * Glanz, Sonne, Linien, Horizont. Die Tiefe bleibt ein erkennbarer Farbton (nicht die Terrain-Tinte).
 */
export function waterFromSky(p: WorldPalette): string[] {
  const s = p.sky;
  const zenith = s[s.length - 1] ?? p.ink;
  const horizon = s[0] ?? zenith;
  const mid = s[Math.floor(s.length / 2)] ?? zenith;
  return [
    mixRgb(zenith, p.ink, 0.45),
    mixRgb(zenith, p.ink, 0.2),
    mixRgb(zenith, mid, 0.4),
    mixRgb(mid, horizon, 0.5),
    mixRgb(horizon, '#ffffff', 0.25),
    p.sun,
    mixRgb(zenith, p.ink, 0.3),
    horizon,
  ];
}

/** Fels aus dem Terrain: Tinte, zwei dunkle und zwei helle Stufen, Deckfläche = hellste Terrainstufe, Linien, Akzent. */
export function rockFromTerrain(p: WorldPalette): string[] {
  const t = p.terrain;
  const dark = t[0] ?? p.ink;
  const light = t[t.length - 1] ?? dark;
  return [p.ink, mixRgb(p.ink, dark, 0.55), dark, t[2] ?? light, light, t[3] ?? light, mixRgb(p.ink, dark, 0.3), p.accent[6] ?? light];
}

/** Index der Sonnenscheibe bzw. des Sonnenrings in der Himmelszeile. */
export function skySunIndices(zone: ZonePalette): { sun: number; ring: number; steps: number } {
  return { sun: zone.sky.length, ring: zone.sky.length + 1, steps: zone.sky.length };
}

/** Minimale Zonenbeschreibung aus `content/zones/*.json`. */
export interface ZoneContentPalette {
  sky: string[];
  terrainLight: string;
  terrainDark: string;
  ink: string;
  accents?: string[];
}

function rgb(hex: string): [number, number, number] {
  return hexToRgb8(hex);
}
function hex(c: [number, number, number]): string {
  return '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
}
export function mixRgb(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}
function luma(h: string): number {
  const c = rgb(h);
  return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
}

/**
 * Leitet eine vollständige Serigrafie-Palette (Terrain 5 Stufen, Kronen, Himmel 6 Stufen, Nebel) aus den vier
 * Farben der Zonendatei ab. Horizont = hellere der beiden Himmelsfarben, Zenit = dunklere; ein drittes Akzent-Neon
 * (Tjorizo) sitzt als oberste Himmelsstufe.
 */
export function zonePaletteFromContent(content: ZoneContentPalette): ZonePalette {
  const { terrainLight: light, terrainDark: dark, ink } = content;
  const [s0, s1] = [content.sky[0] ?? light, content.sky[1] ?? light];
  const horizon = luma(s0) >= luma(s1) ? s0 : s1;
  const zenith = luma(s0) >= luma(s1) ? s1 : s0;
  const neon = content.accents?.[2];
  const white = '#ffffff';
  return {
    ink,
    terrain: [dark, mixRgb(dark, light, 0.38), mixRgb(dark, light, 0.72), light, mixRgb(light, white, 0.2)],
    canopy: [mixRgb(ink, dark, 0.3), mixRgb(ink, dark, 0.6), mixRgb(dark, light, 0.3), mixRgb(light, white, 0.08), mixRgb(light, white, 0.4)],
    sky: [mixRgb(horizon, white, 0.35), horizon, mixRgb(horizon, zenith, 0.35), mixRgb(horizon, zenith, 0.7), zenith, neon ?? mixRgb(zenith, ink, 0.12)],
    sun: '#f7f6d8',
    sunRing: mixRgb(horizon, white, 0.5),
    fog: [zenith, mixRgb(zenith, dark, 0.45), mixRgb(zenith, horizon, 0.3), mixRgb(zenith, horizon, 0.6), horizon, mixRgb(horizon, white, 0.3)],
    fogAlpha: [0, 0.35, 0.55, 0.72, 0.85, 0.94],
  };
}

/** Weltpalette aus einer Zonenpalette (Altformat) — Akzente aus Tinte/Terrain abgeleitet. */
export function worldPaletteFromZone(zone: ZonePalette): WorldPalette {
  const canopy = zone.canopy.length >= 7 ? zone.canopy : [...zone.canopy, zone.canopy[zone.canopy.length - 1] ?? zone.ink, zone.canopy[zone.canopy.length - 2] ?? zone.ink];
  const light = zone.terrain[zone.terrain.length - 1] ?? zone.ink;
  return {
    ...zone,
    canopy,
    accent: [light, zone.terrain[1] ?? zone.ink, zone.ink, zone.ink, zone.canopy[3] ?? light, zone.canopy[4] ?? light, zone.terrain[0] ?? zone.ink, light],
  };
}
