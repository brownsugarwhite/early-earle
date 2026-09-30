import type { Vec3 } from '../capPatch';
import { hash32, mulberry32 } from '../rng';
import { frameAt, offsetDir } from './geometry';
import type { PlacementSpec } from './types';

/** Was die Merkmalsgenerierung vom Planetenfeld braucht (ohne Zirkelimport auf planet.ts). */
export interface FeatureHost {
  readonly radius: number;
  readonly seed: number;
  readonly worldCount: number;
  worldId(index: number): string;
  worldSide(index: number): 'near' | 'far';
  worldAt(dx: number, dy: number, dz: number): number;
  /** Höhe ohne Merkmale (natürliches Gelände). */
  baseHeightAt(dx: number, dy: number, dz: number): number;
  amplitudeAt(dx: number, dy: number, dz: number): number;
  /** Breitenspanne [latHi, latLo] einer Welt (rad). */
  worldLatRange(index: number): [number, number];
  worldCenterDir(index: number): Vec3;
  /** Fokus-Richtung der Weltkomposition (Fokus-Slot) oder null. */
  focusDir(index: number): Vec3 | null;
  /** Freizuhaltende Stellen (Wahrzeichen): Richtung und Radius in Welteinheiten. */
  keepClear(): Array<{ dir: Vec3; radius: number }>;
  /** Spirale: Umdrehungen und Polkappen-Marge (rad). */
  readonly turns: number;
  readonly polarMargin: number;
  /** Halbe Längenbreite (rad) des nahen Streifens um den Pfad (Standard π/2). */
  readonly nearHalfWidth: number;
}

/** Abstand zur Weltgrenze (Riss), den Merkmale mindestens halten. */
export const BORDER_MARGIN = 1.1;

/** Richtung des Spiralpfads beim Parameter s ∈ [0, 1] (Nordpol → Südpol); `far` = Gegenseite (Mitte der fernen Bänder). */
export function spiralDir(host: Pick<FeatureHost, 'turns' | 'polarMargin'>, s: number, out: Vec3 = [0, 0, 0], far = false): Vec3 {
  const lat = Math.PI / 2 - host.polarMargin - s * (Math.PI - 2 * host.polarMargin);
  const lon = s * host.turns * Math.PI * 2 + (far ? Math.PI : 0);
  out[0] = Math.cos(lat) * Math.cos(lon);
  out[1] = Math.sin(lat);
  out[2] = Math.cos(lat) * Math.sin(lon);
  return out;
}

/** Spiralparameter s einer Breite (rad), geklemmt auf [0, 1]. */
export function spiralS(host: Pick<FeatureHost, 'polarMargin'>, lat: number): number {
  const span = Math.PI - 2 * host.polarMargin;
  return Math.min(1, Math.max(0, (Math.PI / 2 - host.polarMargin - lat) / span));
}

/**
 * Halbe Breite (Welteinheiten, senkrecht zum Band) eines Weltbands: Nahe Welten liegen innerhalb ±`nearHalfWidth`
 * Länge um den Pfad — bei 2.75 Umdrehungen sind das ±14.7° Breite ≈ ±8.2 Einheiten; ferne Bänder dazwischen.
 */
export function bandHalfWidth(host: Pick<FeatureHost, 'turns' | 'polarMargin' | 'radius' | 'nearHalfWidth'>, side: 'near' | 'far'): number {
  const lonHalf = side === 'near' ? host.nearHalfWidth : Math.PI - host.nearHalfWidth;
  const dLat = (lonHalf / (host.turns * Math.PI * 2)) * (Math.PI - 2 * host.polarMargin);
  return dLat * host.radius * 0.985;
}

/** Bogenlänge (Welteinheiten) der Spirale je Einheit s bei Breite lat. */
function spiralSpeed(host: Pick<FeatureHost, 'turns' | 'polarMargin' | 'radius'>, lat: number): number {
  const dLon = host.turns * Math.PI * 2 * Math.max(0.05, Math.cos(lat));
  const dLat = Math.PI - 2 * host.polarMargin;
  return Math.hypot(dLon, dLat) * host.radius;
}

/**
 * Seitlicher Abstand (Welteinheiten) einer Richtung zur Mittellinie ihres Bands: nahe Seite = Spiralpfad, ferne Seite =
 * Gegenspirale. Die Spirale läuft fast ostwärts (≈ 9° Steigung), der nächste Punkt liegt also fast auf demselben
 * Längengrad → Breitenabstand zur nächsten Windung, korrigiert um die Steigung.
 */
export function bandDistance(host: Pick<FeatureHost, 'turns' | 'polarMargin' | 'radius'>, dx: number, dy: number, dz: number, far = false): number {
  const R = host.radius;
  const lat = Math.asin(Math.max(-1, Math.min(1, dy)));
  let lon = Math.atan2(dz, dx) - (far ? Math.PI : 0);
  lon = ((lon % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const span = Math.PI - 2 * host.polarMargin;
  const total = host.turns * Math.PI * 2;
  let best = Infinity;
  const kMax = Math.ceil(host.turns) + 1;
  for (let k = -1; k <= kMax; k++) {
    const s = (lon + k * Math.PI * 2) / total;
    if (s < 0 || s > 1) continue;
    const latP = Math.PI / 2 - host.polarMargin - s * span;
    const cosLat = Math.max(0.05, Math.cos(latP));
    const alpha = Math.atan(span / (total * cosLat));
    best = Math.min(best, Math.abs(lat - latP) * R * Math.cos(alpha));
  }
  // Pfadenden (Polkappen): Großkreisabstand zu den Endpunkten
  const a = spiralDir(host, 0, [0, 0, 0], far);
  const b = spiralDir(host, 1, [0, 0, 0], far);
  best = Math.min(best, Math.acos(Math.min(1, dx * a[0] + dy * a[1] + dz * a[2])) * R, Math.acos(Math.min(1, dx * b[0] + dy * b[1] + dz * b[2])) * R);
  return best;
}

/**
 * Spiralparameter des nächsten Punkts der Spirale (bzw. Gegenspirale) zu einer Richtung: je Windung der Parameter bei
 * derselben Länge, die Windung mit der nächsten Breite gewinnt, dann kurz lokal verfeinert.
 */
export function nearestSpiralS(host: Pick<FeatureHost, 'turns' | 'polarMargin'>, d: Vec3, far = false): number {
  const lat = Math.asin(Math.max(-1, Math.min(1, d[1])));
  let lon = Math.atan2(d[2], d[0]) - (far ? Math.PI : 0);
  lon = ((lon % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const total = host.turns * Math.PI * 2;
  const span = Math.PI - 2 * host.polarMargin;
  let bestS = 0;
  let best = Infinity;
  const kMax = Math.ceil(host.turns) + 1;
  for (let k = -1; k <= kMax; k++) {
    const s = Math.min(1, Math.max(0, (lon + k * Math.PI * 2) / total));
    const latP = Math.PI / 2 - host.polarMargin - s * span;
    const dl = Math.abs(lat - latP);
    if (dl < best) {
      best = dl;
      bestS = s;
    }
  }
  // Lokal verfeinern (die Spirale ist leicht geneigt)
  const p: Vec3 = [0, 0, 0];
  let bestDot = -2;
  let refined = bestS;
  for (let i = -24; i <= 24; i++) {
    const s = Math.min(1, Math.max(0, bestS + i * 0.0006));
    spiralDir(host, s, p, far);
    const dot = p[0] * d[0] + p[1] * d[1] + p[2] * d[2];
    if (dot > bestDot) {
      bestDot = dot;
      refined = s;
    }
  }
  return refined;
}

/** Seitlicher Abstand zum Levelpfad (Spirale). */
export function pathDistance(host: Pick<FeatureHost, 'turns' | 'polarMargin' | 'radius'>, dx: number, dy: number, dz: number): number {
  return bandDistance(host, dx, dy, dz, false);
}

/** Richtung des Weltbands (Spiraltangente) als Winkel im lokalen Rahmen bei `c` (0 = Ost, leicht nach Süd geneigt). */
export function bandAxisAngle(host: Pick<FeatureHost, 'turns' | 'polarMargin'>, c: Vec3): number {
  const lat = Math.asin(Math.max(-1, Math.min(1, c[1])));
  return Math.atan2(-(Math.PI - 2 * host.polarMargin), host.turns * Math.PI * 2 * Math.max(0.05, Math.cos(lat)));
}

/** Parameterbereich [s0, s1] der Spirale innerhalb der Breitenspanne einer Welt. */
export function spiralRangeFor(host: FeatureHost, world: number): [number, number] {
  const [latHi, latLo] = host.worldLatRange(world);
  return [spiralS(host, latHi), spiralS(host, latLo)];
}

/** Stelle auf der Mittellinie eines Weltbands (Parameter s) mit seitlichem Versatz (Welteinheiten, + = Nord). */
export function bandPoint(host: FeatureHost, world: number, s: number, lateral: number, out: Vec3 = [0, 0, 0]): Vec3 {
  const far = host.worldSide(world) === 'far';
  const p = spiralDir(host, s, [0, 0, 0], far);
  // Senkrecht zum Band ≈ Nord/Süd (die Spirale läuft fast ostwärts)
  return offsetDir(frameAt(p), host.radius, 0, lateral, out);
}

/**
 * Längs des Bands: Spiralparameter-Schritt je Welteinheit an der Stelle s (für Wege parallel zum Pfad).
 */
export function sPerUnit(host: FeatureHost, s: number): number {
  const lat = Math.PI / 2 - host.polarMargin - s * (Math.PI - 2 * host.polarMargin);
  return 1 / spiralSpeed(host, lat);
}

/**
 * Kandidat für ein Merkmal der Welt `world` mit Reichweite `reach` (Radius inkl. Ufer/Grundriss): nahe Welten seitlich
 * des Pfads (Kante im Abstand `pathDistance`), ferne Welten längs ihres Bands um den Bildfokus (`focusDistance`). Das
 * Merkmal muss ganz ins Band passen (Abstand `BORDER_MARGIN` zum Riss). Liefert null, wenn nichts passt.
 */
export function placementCandidate(host: FeatureHost, world: number, spec: PlacementSpec, reach: number, rand: () => number, out: Vec3 = [0, 0, 0]): Vec3 | null {
  const side = host.worldSide(world);
  const half = bandHalfWidth(host, side);
  const [s0, s1] = spiralRangeFor(host, world);
  if (s1 <= s0) return null;
  let s: number;
  let lateral: number;
  if (side === 'near') {
    if (spec.focusDistance) {
      // Nahe Welt mit Bildbezug: längs des Pfads um den Fokus der Weltkomposition (sichtbar im Weltblick)
      const focus = host.focusDir(world) ?? host.worldCenterDir(world);
      const sF = Math.min(s1, Math.max(s0, spiralS(host, Math.asin(Math.max(-1, Math.min(1, focus[1]))))));
      const [dMin, dMax] = spec.focusDistance;
      s = sF + (dMin + (dMax - dMin) * rand()) * (rand() < 0.5 ? -1 : 1) * sPerUnit(host, sF);
      if (s < s0 || s > s1) return null;
    } else s = s0 + (s1 - s0) * (0.06 + 0.88 * rand());
    // Innenkante im Abstand [eMin, eMax] vom Pfad, Außenkante mit Abstand zum Riss
    const [eMin, eMax] = spec.pathDistance ?? [2, 4];
    const lo = eMin + reach;
    const hi = Math.min(eMax + reach, half - BORDER_MARGIN - reach);
    if (hi < lo) return null;
    lateral = (lo + (hi - lo) * rand()) * (rand() < 0.5 ? -1 : 1);
  } else {
    const focus = host.focusDir(world) ?? host.worldCenterDir(world);
    const sF = Math.min(s1, Math.max(s0, spiralS(host, Math.asin(Math.max(-1, Math.min(1, focus[1]))))));
    const [dMin, dMax] = spec.focusDistance ?? [3, 14];
    const along = (dMin + (dMax - dMin) * rand()) * (rand() < 0.5 ? -1 : 1);
    s = sF + along * sPerUnit(host, sF);
    if (s < s0 || s > s1) return null;
    const room = half - BORDER_MARGIN - reach;
    if (room < 0) return null;
    lateral = (rand() * 2 - 1) * room;
  }
  bandPoint(host, world, s, lateral, out);
  return host.worldAt(out[0], out[1], out[2]) === world ? out : null;
}

/** Liegt ein Kreis (Mittelpunkt, Radius) vollständig in der Welt? Prüft 12 Randpunkte und die Mitte. */
export function circleInWorld(host: FeatureHost, world: number, c: Vec3, radius: number): boolean {
  if (host.worldAt(c[0], c[1], c[2]) !== world) return false;
  const f = frameAt(c);
  const p: Vec3 = [0, 0, 0];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    offsetDir(f, host.radius, Math.cos(a) * radius, Math.sin(a) * radius, p);
    if (host.worldAt(p[0], p[1], p[2]) !== world) return false;
  }
  return true;
}

/** Deterministischer Zufall je Welt und Merkmalsart. */
export function featureRandom(seed: number, ...salt: Array<string | number>): () => number {
  return mulberry32(hash32('features', seed, ...salt));
}
