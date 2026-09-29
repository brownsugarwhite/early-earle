import { mixHex, shiftHex } from '@ee/genome';

/** The four colours of a zone file (`content/zones/*.json` → `palette`), plus optional accents. */
export interface BoardZoneInput {
  sky: string[];
  terrainLight: string;
  terrainDark: string;
  ink: string;
  accents?: string[] | undefined;
}

/**
 * Board palette derived from the zone: the plateau is the zone's meadow (lit top, value-banded skirt), the
 * plates a cooler stone step of the terrain, the elements use the zone accents (rust / teal / neon in
 * Tjorizo) plus a few fixed jewel tones (ice, violet, sick green) that read the same in every zone.
 * All hex, sRGB; materials convert once.
 */
export interface BoardPalette {
  ink: string;
  paper: string;
  /** Plateau top (golden meadow) and the skirt bands from the top ledge down. */
  top: string;
  skirt: string[];
  /** What the plateau looks like in the sun's shadow (dark terrain, not pure ink). */
  plateauShade: string;
  /** Stone plates and their hatch lines. */
  plate: string;
  plateLine: string;
  plateShade: string;
  /** Withered soil, deep withered soil, crack lines, healed green. */
  soil: string;
  soilDeep: string;
  crack: string;
  healed: string;
  healedLine: string;
  /** Oil pool ink and its light band. */
  oil: string;
  oilBand: string;
  /** Element accents. */
  rust: string;
  rustDeep: string;
  teal: string;
  neon: string;
  sky: string;
  ice: string;
  iceDeep: string;
  violet: string;
  pink: string;
  scrap: string;
  scrapLine: string;
  rot: string;
  rotDot: string;
  toxic: string;
  toxicRing: string;
  vine: string;
  fog: string;
  stem: string;
  /** Dome bushes around the meadow: dark body (two tones) and the light dots on their lit edges. */
  bush: string;
  bushLight: string;
  bushDot: string;
}

function luma(hex: string): number {
  const v = parseInt(hex.replace('#', ''), 16);
  return (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
}

export function boardPaletteFor(zone: BoardZoneInput): BoardPalette {
  const { terrainLight: light, terrainDark: dark, ink } = zone;
  const accents = zone.accents ?? [];
  // Scrap is rust in every zone (Earle's red monoliths); the zone's first accent only tints it.
  const rust = mixHex('#c8542a', accents[0] ?? '#c8542a', 0.15);
  const teal = accents[1] ?? '#22baa9';
  const neon = accents[2] ?? '#b8ff2a';
  const skyA = zone.sky[0] ?? '#7ce6d5';
  const skyB = zone.sky[1] ?? skyA;
  const sky = luma(skyA) >= luma(skyB) ? skyB : skyA;
  const paper = '#f7f6d8';
  // Meadow: the light terrain step warmed and lifted a touch (Earle's sunlit fields), never white.
  const top = mixHex(mixHex(light, '#f3e27a', 0.22), paper, 0.1);
  const plate = mixHex(light, dark, 0.34);
  return {
    ink,
    paper,
    top,
    skirt: [mixHex(light, dark, 0.12), mixHex(light, dark, 0.48), mixHex(dark, ink, 0.12), mixHex(dark, ink, 0.45)],
    plateauShade: mixHex(dark, ink, 0.55),
    plate,
    plateLine: mixHex(plate, dark, 0.7),
    plateShade: mixHex(ink, plate, 0.18),
    soil: mixHex(mixHex(dark, '#6a4b2e', 0.5), ink, 0.3),
    soilDeep: mixHex(mixHex(dark, '#4a3320', 0.6), ink, 0.55),
    crack: mixHex(ink, '#2a1c12', 0.4),
    healed: mixHex(mixHex(light, '#6fd45a', 0.5), paper, 0.08),
    healedLine: mixHex(light, '#2f7f3a', 0.45),
    oil: mixHex(ink, '#0f1c22', 0.6),
    oilBand: mixHex(sky, '#5f7fa0', 0.35),
    rust,
    rustDeep: mixHex(rust, ink, 0.55),
    teal,
    neon,
    sky,
    ice: '#dbf8fa',
    iceDeep: '#84c9df',
    violet: '#937cc2',
    pink: '#e5aed4',
    scrap: mixHex(dark, ink, 0.5),
    scrapLine: mixHex(dark, ink, 0.85),
    rot: mixHex('#2a1a2e', ink, 0.3),
    rotDot: '#937cc2',
    toxic: '#8fd14f',
    toxicRing: neon,
    vine: mixHex(shiftHex(dark, 20, 0.9, 1.2), ink, 0.35),
    fog: mixHex(paper, sky, 0.18),
    stem: mixHex(dark, ink, 0.3),
    bush: mixHex(dark, ink, 0.62),
    bushLight: mixHex(dark, ink, 0.45),
    bushDot: mixHex(light, paper, 0.35),
  };
}
