import { smoothstep } from './geometry';
import { BORDER_MARGIN, bandAxisAngle, pathDistance, placementCandidate, regionHalfWidth, type PlaneFeatureHost, type RegionSite } from './host';
import type { Lake, LakeSpec } from './types';

/** Belegte Kreise (Ebene, Radius in Welteinheiten) anderer Merkmale — Mindestabstand bei der Platzierung. */
export interface Occupied {
  x: number;
  z: number;
  radius: number;
}

export function isFree(occupied: readonly Occupied[], x: number, z: number, radius: number, gap: number): boolean {
  for (const o of occupied) if (Math.hypot(x - o.x, z - o.z) < radius + o.radius + gap) return false;
  return true;
}

/** Uferradius eines Sees in Richtung θ (Winkel im gestreckten Seeraum). */
export function lakeRadiusAt(lake: Lake, theta: number): number {
  const w = lake.wobble;
  return lake.radius * (1 + w[0] * Math.cos(theta + w[1]) + w[2] * Math.cos(2 * theta + w[3]) + w[4] * Math.cos(3 * theta + w[5]));
}

/** Ufer-Böschungsbreite eines Sees mit Radius r. */
export function lakeShore(radius: number): number {
  return Math.max(0.8, radius * 0.38);
}

/** Welligkeit (1.–3. Harmonische) eines Seeufers; Summe der Amplituden ≤ 0.34. */
export function lakeWobble(rand: () => number): Lake['wobble'] {
  return [0.03 + rand() * 0.08, rand() * 6.28, 0.07 + rand() * 0.12, rand() * 6.28, rand() * 0.07, rand() * 6.28];
}

function wobbleAmp(w: Lake['wobble']): number {
  return 1 + w[0] + w[2] + w[4];
}

/** Halbe Ausdehnung quer zur Streckung (Wasser + Ufer). */
export function lakeLateralReach(radius: number, stretch: number, wobble: Lake['wobble']): number {
  return (radius * wobbleAmp(wobble)) / Math.sqrt(stretch) + lakeShore(radius);
}

/** Lokaler Punkt (u längs, v quer im gestreckten Raum) → Ebene. */
function lakePoint(lake: Lake, th: number, r: number, scale = 1): [number, number] {
  const k = Math.sqrt(lake.stretch);
  const ca = Math.cos(lake.axis);
  const sa = Math.sin(lake.axis);
  const u = Math.cos(th) * r * k * scale;
  const v = ((Math.sin(th) * r) / k) * scale;
  return [lake.cx + u * ca - v * sa, lake.cz + u * sa + v * ca];
}

/**
 * See an einer Stelle anlegen (Spiegel knapp unter dem tiefsten Randpunkt → das Ufer liegt überall über dem Wasser).
 * Liefert null auf zu steilem Gelände (der See gräbe sich tief in den Hang).
 */
export function makeLake(
  host: PlaneFeatureHost,
  site: RegionSite,
  world: number,
  id: string,
  x: number,
  z: number,
  radius: number,
  stretch: number,
  frozen: boolean,
  wobble: Lake['wobble'],
  swamp = false,
): { lake: Lake; relief: number } | null {
  const shore = lakeShore(radius);
  const k = Math.sqrt(stretch);
  const reach = radius * wobbleAmp(wobble) * Math.max(k, 1 / k) + shore;
  const lake: Lake = { id, world, region: site.region.key, cx: x, cz: z, radius, stretch, axis: bandAxisAngle(host, site, z), wobble, level: 0, shore, frozen, reach, ...(swamp ? { swamp: true } : {}) };
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < 28; i++) {
    const th = (i / 28) * Math.PI * 2;
    const [px, pz] = lakePoint(lake, th, lakeRadiusAt(lake, th) + 0.15);
    const h = host.baseHeightAt(px, pz);
    lo = Math.min(lo, h);
    hi = Math.max(hi, h);
  }
  if (hi - lo > Math.max(1.8, radius * 0.75)) return null;
  lake.level = lo - 0.04;
  return { lake, relief: hi - lo };
}

/**
 * Seen einer Region: in Mulden (niedrig, flacher Rand), seitlich des Pfads bzw. um den Bildfokus einer Seitenzelle,
 * ganz in der Region. Pfadwelten: lange Weiher neben dem Pfad; Seitenzellen: Wasserbänder quer durchs Bild.
 */
export function generateLakes(host: PlaneFeatureHost, site: RegionSite, world: number, spec: LakeSpec & { swamp?: boolean }, count: number, rand: () => number, occupied: Occupied[], idOffset = 0): Lake[] {
  const out: Lake[] = [];
  const onPath = site.region.kind === 'path';
  const minPath = spec.pathDistance?.[0] ?? 2;
  const stretch = spec.stretch ?? (onPath ? 2.2 : 0.55);
  for (let n = 0; n < count; n++) {
    let best: { lake: Lake; score: number } | null = null;
    for (let tries = 0; tries < 96; tries++) {
      const radius = spec.radius[0] + (spec.radius[1] - spec.radius[0]) * rand();
      const wobble = lakeWobble(rand);
      const lateral = lakeLateralReach(radius, stretch, wobble);
      const c = placementCandidate(host, site, spec, lateral, rand);
      if (!c) continue;
      const made = makeLake(host, site, world, `${site.region.key}-lake-${idOffset + n}`, c[0], c[1], radius, stretch, spec.frozen ?? false, wobble, spec.swamp ?? false);
      if (!made) continue;
      const lake = made.lake;
      if (!lakeFits(host, site, lake, onPath ? minPath * 0.8 : 0)) continue;
      if (!isFree(occupied, c[0], c[1], lake.reach, 1.0)) continue;
      const centre = host.baseHeightAt(c[0], c[1]);
      const score = made.relief * 1.4 + Math.max(0, centre - lake.level) * 0.5 + rand() * 0.6;
      if (!best || score < best.score) best = { lake, score };
    }
    if (best) {
      out.push(best.lake);
      occupied.push({ x: best.lake.cx, z: best.lake.cz, radius: best.lake.reach });
    }
  }
  return out;
}

/** Liegt das ganze Seeufer (plus Böschung) in der Region und außerhalb des Pfadkorridors? */
export function lakeFits(host: PlaneFeatureHost, site: RegionSite, lake: Lake, minPath: number): boolean {
  const key = site.region.key;
  for (let i = 0; i < 20; i++) {
    const th = (i / 20) * Math.PI * 2;
    const r = lakeRadiusAt(lake, th);
    const k = Math.sqrt(lake.stretch);
    const l = Math.hypot(Math.cos(th) * r * k, (Math.sin(th) * r) / k) || 1;
    const s = (l + lake.shore * 0.8) / l;
    const [px, pz] = lakePoint(lake, th, r, s);
    if (host.regionKeyAt(px, pz) !== key) return false;
    if (minPath > 0 && site.region.kind === 'path' && pathDistance(host, px, pz) < minPath) return false;
  }
  // Abstand zum Rand quer zur Streckung
  const pad = BORDER_MARGIN * 0.6;
  const ca = Math.cos(lake.axis);
  const sa = Math.sin(lake.axis);
  const k = Math.sqrt(lake.stretch);
  for (const sgn of [-1, 1]) {
    const r = lakeRadiusAt(lake, (sgn * Math.PI) / 2) / k + lake.shore + pad;
    if (host.regionKeyAt(lake.cx - sa * r * sgn, lake.cz + ca * r * sgn) !== key) return false;
  }
  void regionHalfWidth;
  return true;
}

/** Standardbreite des Uferbands an Land (Seen bzw. Flüsse), siehe `LakeSpec.shore`/`RiverSpec.shore`. */
export const DEFAULT_LAKE_BAND = 2.0;
export const DEFAULT_RIVER_BAND = 1.6;

/**
 * Uferband-Wert an einem Punkt mit Uferabstand `e` (< 0 im Wasser): 0 im Wasser und an der Uferlinie, linear bis 1 am
 * Bandrand `band`; ohne Band (0) überall an Land 1.
 */
export function shoreValue(e: number, band: number): number {
  if (e <= 0) return 0;
  if (band <= 0) return 1;
  return e >= band ? 1 : e / band;
}

/**
 * Wirkung eines Sees an einem Punkt: Uferabstand e (Welteinheiten, < 0 im Wasser), Winkel im gestreckten Raum und
 * Koordinate längs der Achse. Liefert false außerhalb der Reichweite (plus `pad`, z. B. die Breite des Uferbands).
 */
export function lakeAt(lake: Lake, x: number, z: number, out: { e: number; theta: number; u?: number }, pad = 0): boolean {
  const dx = x - lake.cx;
  const dz = z - lake.cz;
  const reach = lake.reach + pad;
  if (dx * dx + dz * dz > reach * reach) return false;
  const ca = Math.cos(lake.axis);
  const sa = Math.sin(lake.axis);
  const k = Math.sqrt(lake.stretch);
  const along = dx * ca + dz * sa;
  const u = along / k;
  const v = (-dx * sa + dz * ca) * k;
  const d = Math.hypot(u, v);
  const theta = Math.atan2(v, u);
  out.theta = theta;
  out.u = along;
  const g = Math.hypot(Math.cos(theta) / k, Math.sin(theta) * k) || 1;
  out.e = (d - lakeRadiusAt(lake, theta)) / g;
  return true;
}

/**
 * Becken und Ufer wie bisher (siehe alte `features/lakes.ts`): lineare Uferrampe, das Wasser-Mesh reicht bis
 * `WATER_OVERLAP` und verschwindet unter der Rampe.
 */
export const WATER_BED = 0.1;
export const SHORE_E = 0.1;
export const WATER_OVERLAP = 0.35;
const RAMP = 0.25;
export const WET = WATER_OVERLAP + 0.15;

/** Becken/Rinne mit Uferrampe: natürliches Gelände `h`, Spiegel `level`, Böschungsbreite `shore`, Uferabstand `e`. */
export function carve(level: number, shore: number, e: number, h: number, ramp: boolean): number {
  const bed = level - WATER_BED;
  const r = Math.max(bed, level + RAMP * (e - SHORE_E));
  const start = SHORE_E + WATER_OVERLAP * 0.9;
  const outer = start + shore;
  if (e >= outer) return h;
  const w = smoothstep(start, outer, e);
  if (!ramp) return Math.min(h, r + (h - r) * w);
  return r + (h - r) * w;
}
