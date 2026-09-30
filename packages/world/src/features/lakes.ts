import type { Vec3 } from '../capPatch';
import { frameAt, localOf, offsetDir, smoothstep } from './geometry';
import { BORDER_MARGIN, bandAxisAngle, pathDistance, placementCandidate, type FeatureHost } from './host';
import type { Lake, LakeSpec } from './types';

/** Belegte Kreise (Richtung, Radius in Welteinheiten) anderer Merkmale — Mindestabstand bei der Platzierung. */
export interface Occupied {
  dir: Vec3;
  radius: number;
}

export function isFree(occupied: readonly Occupied[], dir: Vec3, radius: number, R: number, gap: number): boolean {
  for (const o of occupied) {
    const d = Math.acos(Math.min(1, Math.max(-1, dir[0] * o.dir[0] + dir[1] * o.dir[1] + dir[2] * o.dir[2]))) * R;
    if (d < radius + o.radius + gap) return false;
  }
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

/** Halbe Ausdehnung quer zum Band (Wasser + Ufer), für die Platzierung im schmalen Weltband. */
export function lakeLateralReach(radius: number, stretch: number, wobble: Lake['wobble']): number {
  return (radius * wobbleAmp(wobble)) / Math.sqrt(stretch) + lakeShore(radius);
}

/**
 * See an einer Stelle anlegen (Spiegel knapp unter dem tiefsten Randpunkt → das Ufer liegt überall über dem Wasser).
 * Liefert null auf zu steilem Gelände (der See gräbe sich tief in den Hang).
 */
export function makeLake(host: FeatureHost, world: number, id: string, c: Vec3, radius: number, stretch: number, frozen: boolean, wobble: Lake['wobble']): { lake: Lake; relief: number } | null {
  const R = host.radius;
  const shore = lakeShore(radius);
  const k = Math.sqrt(stretch);
  const reach = radius * wobbleAmp(wobble) * Math.max(k, 1 / k) + shore;
  const frame = frameAt(c);
  const lake: Lake = { id, world, frame, radius, stretch, axis: bandAxisAngle(host, c), wobble, level: 0, shore, frozen, reach };
  let lo = Infinity;
  let hi = -Infinity;
  const p: Vec3 = [0, 0, 0];
  const ca = Math.cos(lake.axis);
  const sa = Math.sin(lake.axis);
  for (let i = 0; i < 28; i++) {
    const th = (i / 28) * Math.PI * 2;
    const r = lakeRadiusAt(lake, th) + 0.15;
    // gestreckter Raum → lokal: längs × k, quer ÷ k, dann um die Bandachse drehen
    const u = Math.cos(th) * r * k;
    const v = (Math.sin(th) * r) / k;
    offsetDir(frame, R, u * ca - v * sa, u * sa + v * ca, p);
    const h = host.baseHeightAt(p[0], p[1], p[2]);
    lo = Math.min(lo, h);
    hi = Math.max(hi, h);
  }
  if (hi - lo > Math.max(1.8, radius * 0.75)) return null;
  lake.level = lo - 0.04;
  return { lake, relief: hi - lo };
}

/**
 * Seen einer Welt: in Mulden (niedrig, flacher Rand), seitlich des Pfads bzw. längs des Bands um den Bildfokus, ganz
 * im Weltband (die Bänder sind ≈ 16 Einheiten breit): nahe Welten als lange Weiher neben dem Pfad, ferne als
 * Wasserbänder quer durchs Bild.
 */
export function generateLakes(host: FeatureHost, world: number, spec: LakeSpec, count: number, rand: () => number, occupied: Occupied[], idOffset = 0): Lake[] {
  const R = host.radius;
  const out: Lake[] = [];
  const near = host.worldSide(world) === 'near';
  const minPath = spec.pathDistance?.[0] ?? 2;
  const stretch = spec.stretch ?? (near ? 2.2 : 0.55);
  for (let n = 0; n < count; n++) {
    let best: { lake: Lake; score: number } | null = null;
    for (let tries = 0; tries < 48; tries++) {
      const radius = spec.radius[0] + (spec.radius[1] - spec.radius[0]) * rand();
      const wobble = lakeWobble(rand);
      const lateral = lakeLateralReach(radius, stretch, wobble);
      const c = placementCandidate(host, world, spec, lateral, rand);
      if (!c) continue;
      const made = makeLake(host, world, `${host.worldId(world)}-lake-${idOffset + n}`, c, radius, stretch, spec.frozen ?? false, wobble);
      if (!made) continue;
      const lake = made.lake;
      if (!lakeFits(host, world, lake, near ? minPath * 0.8 : 0)) continue;
      if (!isFree(occupied, c, lake.reach, R, 1.0)) continue;
      const centre = host.baseHeightAt(c[0], c[1], c[2]);
      const score = made.relief * 1.4 + Math.max(0, centre - lake.level) * 0.5 + rand() * 0.6;
      if (!best || score < best.score) best = { lake, score };
    }
    if (best) {
      out.push(best.lake);
      occupied.push({ dir: best.lake.frame.c, radius: best.lake.reach });
    }
  }
  return out;
}

/** Liegt das ganze Seeufer (plus Böschung) in der Welt und außerhalb des Pfadkorridors? */
export function lakeFits(host: FeatureHost, world: number, lake: Lake, minPath: number): boolean {
  const R = host.radius;
  const k = Math.sqrt(lake.stretch);
  const ca = Math.cos(lake.axis);
  const sa = Math.sin(lake.axis);
  const p: Vec3 = [0, 0, 0];
  for (let i = 0; i < 20; i++) {
    const th = (i / 20) * Math.PI * 2;
    const r = lakeRadiusAt(lake, th);
    const u = Math.cos(th) * r * k;
    const v = (Math.sin(th) * r) / k;
    const l = Math.hypot(u, v) || 1;
    // Uferpunkt plus Böschung nach außen
    const s = (l + lake.shore * 0.8) / l;
    offsetDir(lake.frame, R, (u * ca - v * sa) * s, (u * sa + v * ca) * s, p);
    if (host.worldAt(p[0], p[1], p[2]) !== world) return false;
    if (minPath > 0 && pathDistance(host, p[0], p[1], p[2]) < minPath) return false;
  }
  // Abstand zum Riss (Bandrand) über die Querachse
  const pad = BORDER_MARGIN * 0.6;
  for (const sgn of [-1, 1]) {
    const r = lakeRadiusAt(lake, (sgn * Math.PI) / 2) / k + lake.shore + pad;
    offsetDir(lake.frame, R, -sa * r * sgn, ca * r * sgn, p);
    if (host.worldAt(p[0], p[1], p[2]) !== world) return false;
  }
  return true;
}

const _xy: [number, number] = [0, 0];

/**
 * Wirkung eines Sees an einer Richtung: Uferabstand e (Welteinheiten, < 0 im Wasser) und Winkel im gestreckten Raum.
 * Liefert false außerhalb der Reichweite.
 */
export function lakeAt(lake: Lake, R: number, dx: number, dy: number, dz: number, out: { e: number; theta: number; u?: number }): boolean {
  if (!localOf(lake.frame, R, dx, dy, dz, _xy)) return false;
  const x = _xy[0];
  const y = _xy[1];
  if (x * x + y * y > lake.reach * lake.reach) return false;
  const ca = Math.cos(lake.axis);
  const sa = Math.sin(lake.axis);
  const k = Math.sqrt(lake.stretch);
  const along = x * ca + y * sa;
  const u = along / k;
  const v = (-x * sa + y * ca) * k;
  const d = Math.hypot(u, v);
  const theta = Math.atan2(v, u);
  out.theta = theta;
  out.u = along;
  // Abstand im gestreckten Raum → Welteinheiten (Gradientenbetrag der Streckung in Richtung θ)
  const g = Math.hypot(Math.cos(theta) / k, Math.sin(theta) * k) || 1;
  out.e = (d - lakeRadiusAt(lake, theta)) / g;
  return true;
}

/**
 * Becken und Ufer: Das Gelände steigt über die Uferlinie als lineare Rampe (Neigung `RAMP`) — linear, damit die
 * Schnittlinie mit dem flachen Wasserspiegel auch auf dem groben Chunk-Gitter glatt bleibt (keine Zickzack-Ufer).
 * Die sichtbare Uferlinie liegt bei `SHORE_E` außerhalb der nominellen Uferlinie; das Wasser-Mesh reicht bis
 * `WATER_OVERLAP` und verschwindet dort unter der Rampe. Im Wasser liegt das Gelände `WATER_BED` unter dem Spiegel,
 * außen geht die Rampe weich ins natürliche Gelände über (auch talwärts: ein kleiner Uferwall hält das Wasser).
 */
export const WATER_BED = 0.1;
export const SHORE_E = 0.1;
export const WATER_OVERLAP = 0.35;
const RAMP = 0.25;
/** Innerhalb dieses Uferabstands gilt ein Punkt als „nass“ (unter einem Wasser-Mesh): dort keine fremde Rampe. */
export const WET = WATER_OVERLAP + 0.15;

/** Höhe mit See (Uferabstand e in Welteinheiten, < 0 im Wasser). */
export function lakeHeight(lake: Lake, e: number, h: number): number {
  return carve(lake.level, lake.shore, e, h, true);
}

/**
 * Becken/Rinne mit Uferrampe: natürliches Gelände `h`, Spiegel `level`, Böschungsbreite `shore`, Uferabstand `e`
 * (< 0 im Wasser). `ramp` aus (an Mündungen, wo ein anderes Gewässer anschließt): nur graben, nie heben.
 */
export function carve(level: number, shore: number, e: number, h: number, ramp: boolean): number {
  const bed = level - WATER_BED;
  const r = Math.max(bed, level + RAMP * (e - SHORE_E));
  const start = SHORE_E + WATER_OVERLAP * 0.9;
  const outer = start + shore;
  if (e >= outer) return h;
  // Gewicht des natürlichen Geländes: 0 an der Uferlinie, 1 außerhalb der Böschung
  const w = smoothstep(start, outer, e);
  if (!ramp) return Math.min(h, r + (h - r) * w);
  return r + (h - r) * w;
}
