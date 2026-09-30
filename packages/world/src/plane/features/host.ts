import { hash32, mulberry32 } from '../../rng';
import type { PathSegment, Region } from '../layout';
import type { PlacementSpec } from './types';

/** Was die Merkmalsplanung von der Ebene braucht (ohne Zirkelimport auf field.ts). */
export interface PlaneFeatureHost {
  readonly seed: number;
  worldId(world: number): string;
  /** Regionsschlüssel am Punkt. */
  regionKeyAt(x: number, z: number): string;
  /** Höhe ohne Merkmale (natürliches Gelände). */
  baseHeightAt(x: number, z: number): number;
  amplitudeAt(x: number, z: number): number;
  backbone(z: number): number;
  backboneSlope(z: number): number;
  bandHalf(z: number): number;
}

/** Eine Region in der Planung: Geometrie, Bildfokus und Freiräume. */
export interface RegionSite {
  region: Region;
  /** Pfadabschnitt (nur Pfadregionen). */
  segment: PathSegment | null;
  /** Bildfokus der Region (Fokus-Slot oder Mitte), Ebene. */
  focus: [number, number];
  /** Halbe Ausdehnung einer Seitenzelle (Welteinheiten), grob. */
  cellRadius: number;
  /** Freizuhaltende Kreise (Fokus-Element, externe Wahrzeichen). */
  keepClear: Array<{ x: number; z: number; radius: number }>;
}

/** Abstand zur Regionsgrenze, den Merkmale mindestens halten. */
export const BORDER_MARGIN = 1.1;

/** Seitlicher Abstand eines Punkts zum Pfad-Rückgrat. */
export function pathDistance(host: Pick<PlaneFeatureHost, 'backbone'>, x: number, z: number): number {
  return Math.abs(x - host.backbone(z));
}

/** Richtung des Weltbands (Pfad vorwärts, −z) als Winkel in der Ebene (0 = +x, π/2 = +z); Zellen: längs z. */
export function bandAxisAngle(host: PlaneFeatureHost, site: RegionSite, z: number): number {
  if (site.region.kind === 'cell') return -Math.PI / 2;
  return Math.atan2(-1, -host.backboneSlope(z));
}

/** Halbe Breite der Region quer zum Pfad (Pfadband bzw. grobe Zellhälfte). */
export function regionHalfWidth(host: PlaneFeatureHost, site: RegionSite, z: number): number {
  return site.region.kind === 'path' ? host.bandHalf(z) : site.cellRadius;
}

/**
 * Kandidat für ein Merkmal mit Reichweite `reach`: Pfadregionen seitlich des Rückgrats (Kante im Abstand
 * `pathDistance`) längs des Abschnitts oder um den Bildfokus (`focusDistance`), Seitenzellen um ihren Fokus. Das
 * Merkmal muss in der Region liegen; sonst null.
 */
export function placementCandidate(host: PlaneFeatureHost, site: RegionSite, spec: PlacementSpec, reach: number, rand: () => number, out: [number, number] = [0, 0]): [number, number] | null {
  const seg = site.segment;
  if (site.region.kind === 'path' && seg) {
    let z: number;
    const len = seg.zStart - seg.zEnd;
    if (spec.focusDistance) {
      const [dMin, dMax] = spec.focusDistance;
      z = site.focus[1] + (dMin + (dMax - dMin) * rand()) * (rand() < 0.5 ? -1 : 1);
      if (z > seg.zStart - 0.5 || z < seg.zEnd + 0.5) return null;
    } else z = seg.zStart - len * (0.06 + 0.88 * rand());
    const [eMin, eMax] = spec.pathDistance ?? [2, 4];
    const half = host.bandHalf(z);
    const lo = eMin + reach;
    const hi = Math.min(eMax + reach, half - BORDER_MARGIN - reach);
    if (hi < lo) return null;
    const d = lo + (hi - lo) * rand();
    const r = rand();
    // feste Seite (z. B. Felsstümpfe im Nebelmeer links vom Pfad, gegenüber dem Steilhang), sonst zufällig
    const u = d * (spec.side ?? (r < 0.5 ? -1 : 1));
    out[0] = host.backbone(z) + u;
    out[1] = z;
  } else {
    const [dMin, dMax] = spec.focusDistance ?? [0, site.cellRadius * 0.8];
    const a = rand() * Math.PI * 2;
    const r = dMin + (dMax - dMin) * Math.sqrt(rand());
    out[0] = site.focus[0] + Math.cos(a) * r;
    out[1] = site.focus[1] + Math.sin(a) * r;
  }
  return host.regionKeyAt(out[0], out[1]) === site.region.key ? out : null;
}

/** Liegt ein Kreis (Mittelpunkt, Radius) vollständig in der Region? Prüft 12 Randpunkte und die Mitte. */
export function circleInRegion(host: PlaneFeatureHost, site: RegionSite, x: number, z: number, radius: number): boolean {
  const key = site.region.key;
  if (host.regionKeyAt(x, z) !== key) return false;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    if (host.regionKeyAt(x + Math.cos(a) * radius, z + Math.sin(a) * radius) !== key) return false;
  }
  return true;
}

/** Deterministischer Zufall je Region und Merkmalsart. */
export function featureRandom(seed: number, ...salt: Array<string | number>): () => number {
  return mulberry32(hash32('plane-features', seed, ...salt));
}
