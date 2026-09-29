import { ClampToEdgeWrapping, DataTexture, NearestFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType } from 'three/webgpu';

/**
 * Paletten-Atlas: eine kleine RGBA8-Textur mit Nearest-Filter. Zeile = Rampe (Terrain-Zone, Kronen, Himmel,
 * Nebel), x = Stufe. Konvention für Terrain/Kronen: x = 0 Tinte, x = 1.. Lichtstufen (dunkel → hell).
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
  static readonly HEIGHT = 32;
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

/** Schreibt eine Zonenpalette als vier Zeilen in den Atlas (Prefix erlaubt mehrere Zonen im selben Atlas). */
export function addZonePalette(atlas: PaletteAtlas, zone: ZonePalette, prefix = 'tjorizo'): ZoneRows {
  const terrain = atlas.addRow({ name: `${prefix}/terrain`, steps: [zone.ink, ...zone.terrain] });
  const canopy = atlas.addRow({ name: `${prefix}/canopy`, steps: [zone.ink, ...zone.canopy] });
  const sky = atlas.addRow({ name: `${prefix}/sky`, steps: [...zone.sky, zone.sun, zone.sunRing] });
  const fog = atlas.addRow({ name: `${prefix}/fog`, steps: zone.fog, alphas: zone.fogAlpha });
  return { terrain, canopy, sky, fog };
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
function mixRgb(a: string, b: string, t: number): string {
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
