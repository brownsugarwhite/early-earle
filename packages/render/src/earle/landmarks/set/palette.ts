import { mixRgb, rockFromTerrain, waterFromSky, type PaletteAtlas, type WorldPalette } from '../../palette';

/**
 * Colours of the landmarks — one ramp per role, 8 stops each, all serigraph steps (the renderer never invents a
 * colour). Convention (like the terrain/rock rows): stop 0 = tinted ink (shadow side), stops 1–4 = light bands
 * (dark → light), stops 5–7 = role-specific accents.
 *
 * **Colour hooks for gradients**: every surface picks its fill from these stops only, and every material adds its
 * gradient through `lift` on a per-vertex gradient coordinate (height share of the prism, fall length, pool radius) —
 * a gradient pass can re-map a role's stops (e.g. 1 → 4 over the height) without touching the geometry.
 */
export interface LandmarkPalette {
  /** Basalt/crag: 0 ink, 1–4 light, 5 moss cap, 6 striation lines, 7 glyph bands (the world's rock row). */
  rock: string[];
  /** Cut stone (ruin): 0 ink, 1–4 light, 5 lichen (lit edges), 6 mortar lines, 7 wet streak. */
  stone: string[];
  /** Tower spire slate: 0 ink, 1–4 light, 5 ridge glint, 6 shingle lines, 7 finial. */
  roof: string[];
  /** Level tops and moss (plateau, steps, island turf): 0 ink, 1–4 meadow light, 5 moss dots, 6 dark tufts, 7 flower. */
  moss: string[];
  /** Island walls / swamp bank soil: 0 ink, 1–4 earth light, 5 roots, 6 wet soil, 7 neon speck. */
  earth: string[];
  /** Water (pools, streams, falls): the world's water row (0 depth … 3 light, 4 glint, 5 foam, 6 lines, 7 horizon). */
  water: string[];
  /** Mist and spray: 0 shade (cool), 1–4 light (cream), 5 foam white, 6 cool dot, 7 warm dot. */
  mist: string[];
  /** Swamp water: 0 ink, 1 deep, 2 base, 3 light band, 4 neon scallops, 5 pad light, 6 duckweed, 7 gas neon. */
  swamp: string[];
  /** Lily pads, reeds, hummocks: 0 ink, 1–4 greens, 5 pad rim light, 6 flower, 7 reed tip. */
  marsh: string[];
  /** Dome bushes on the ruin (canopy family): 0 ink, 1–2 light bands, 3 dot shade, 4–5 dot light, 6–7 motif. */
  bush: string[];
  /** Vines and snags (thorn ink): 0 ink, 1–4 dark greens, 5 thorn light, 6–7 tips. */
  vine: string[];
}

/** Atlas rows of a landmark palette (one per role). */
export type LandmarkRows = Record<keyof LandmarkPalette, number>;

export const LANDMARK_ROLES: ReadonlyArray<keyof LandmarkPalette> = ['rock', 'stone', 'roof', 'moss', 'earth', 'water', 'mist', 'swamp', 'marsh', 'bush', 'vine'];

const WHITE = '#ffffff';
const CREAM = '#f7f4e2';

function eight(steps: string[]): string[] {
  const out = steps.slice(0, 8);
  while (out.length < 8) out.push(out[out.length - 1] ?? '#808080');
  return out;
}

/**
 * Landmark palette derived from a world palette (Earle serigraph of the world): rocks and water from the world's own
 * rows, the ruin's stone a cool teal-grey from the rock/terrain (Ebene 22), the swamp from Tjorizo's neon (the
 * gas-born blobs) darkened into the world's ink, mist from the sky's horizon into cream.
 */
export function landmarkPaletteFromWorld(w: WorldPalette): LandmarkPalette {
  const ink = w.ink;
  const t = w.terrain;
  const rock = eight(w.rock ?? rockFromTerrain(w));
  const water = eight(w.water ?? waterFromSky(w));
  const sky = w.sky;
  const horizon = sky[0] ?? CREAM;
  const zenith = sky[sky.length - 1] ?? horizon;
  const canopy = w.canopy;
  // Ebene 22: teal stone blocks with yellow lichen on the lit edges
  const stoneBase = mixRgb(mixRgb(rock[3] ?? t[2] ?? '#6f8f8a', '#4f9a92', 0.5), horizon, 0.12);
  const stone = [
    mixRgb(ink, stoneBase, 0.18),
    mixRgb(ink, stoneBase, 0.62),
    stoneBase,
    mixRgb(stoneBase, horizon, 0.28),
    mixRgb(stoneBase, CREAM, 0.5),
    mixRgb('#e2d84a', w.accent[6] ?? '#e2d84a', 0.25),
    mixRgb(ink, stoneBase, 0.4),
    mixRgb(ink, '#1f4a52', 0.5),
  ];
  const slate = mixRgb('#28467e', zenith, 0.25);
  const roof = [mixRgb(ink, slate, 0.2), mixRgb(ink, slate, 0.6), slate, mixRgb(slate, '#5a86c8', 0.45), mixRgb(slate, horizon, 0.45), mixRgb(horizon, WHITE, 0.4), mixRgb(ink, slate, 0.35), w.accent[6] ?? '#e2d84a'];
  const meadow = t[3] ?? t[2] ?? '#9daa63';
  const moss = [
    ink,
    mixRgb(t[1] ?? meadow, ink, 0.2),
    t[2] ?? meadow,
    mixRgb(meadow, rock[5] ?? meadow, 0.35),
    mixRgb(t[4] ?? meadow, CREAM, 0.2),
    mixRgb(rock[5] ?? meadow, CREAM, 0.35),
    mixRgb(t[0] ?? ink, ink, 0.35),
    w.accent[4] ?? '#d92f2b',
  ];
  const soil = mixRgb(t[0] ?? '#4a3a2a', '#4a3322', 0.45);
  const earth = [mixRgb(ink, soil, 0.15), mixRgb(ink, soil, 0.55), soil, mixRgb(soil, t[1] ?? soil, 0.45), mixRgb(soil, meadow, 0.5), mixRgb(ink, soil, 0.35), mixRgb(ink, '#1f3a2a', 0.5), '#b8ff2a'];
  const mistShade = mixRgb(mixRgb(zenith, '#a9bdd6', 0.62), horizon, 0.18);
  const mist = [mistShade, mixRgb(mistShade, horizon, 0.45), mixRgb(horizon, CREAM, 0.35), mixRgb(horizon, CREAM, 0.7), mixRgb(CREAM, WHITE, 0.5), '#fffdf2', mixRgb(mistShade, horizon, 0.25), mixRgb(CREAM, '#f2d98a', 0.35)];
  // Tjorizo's neon swamp (#b8ff2a), deepened into the world's ink
  const deep = mixRgb('#123a22', ink, 0.35);
  const swamp = [mixRgb(ink, '#07140d', 0.5), deep, mixRgb('#1f5a2e', water[2] ?? '#1f5a2e', 0.18), mixRgb('#2f7a3a', water[3] ?? '#2f7a3a', 0.15), '#b8ff2a', '#7fbf3a', mixRgb('#8fd23a', '#b8ff2a', 0.3), '#d4ff5a'];
  const marsh = [mixRgb(ink, '#0b2414', 0.5), '#1d4a26', '#2f6b30', '#4f8f38', '#7fb640', '#b8e05a', w.accent[4] ?? '#e5aed4', '#d9f07a'];
  const bush = eight([ink, ...canopy]);
  const vineBase = mixRgb(canopy[0] ?? ink, '#10261a', 0.4);
  const vine = [mixRgb(ink, '#050805', 0.3), mixRgb(ink, vineBase, 0.5), vineBase, mixRgb(vineBase, canopy[1] ?? vineBase, 0.5), canopy[1] ?? vineBase, mixRgb(vineBase, CREAM, 0.35), canopy[2] ?? vineBase, canopy[3] ?? vineBase];
  return { rock, stone: eight(stone), roof: eight(roof), moss: eight(moss), earth: eight(earth), water, mist: eight(mist), swamp: eight(swamp), marsh: eight(marsh), bush, vine: eight(vine) };
}

/** Writes a landmark palette into the atlas (11 rows, prefix per world) and returns the row indices. */
export function addLandmarkPalette(atlas: PaletteAtlas, p: LandmarkPalette, prefix: string): LandmarkRows {
  const rows = {} as LandmarkRows;
  for (const role of LANDMARK_ROLES) rows[role] = atlas.addRow({ name: `${prefix}/lm-${role}`, steps: eight(p[role]) });
  return rows;
}
