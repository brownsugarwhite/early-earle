import { hash32, mulberry32 } from '../../rng';
import type { PathSegment, Region } from '../layout';
import type { PlacementSpec } from './types';

/** Nächster Punkt der Pfad-Mittellinie: Lage, Normale (rechts der Laufrichtung), Abstand und Seite (+1 rechts). */
export interface PathNear {
  x: number;
  z: number;
  nx: number;
  nz: number;
  d: number;
  side: number;
}

/** Was die Merkmalsplanung von der Ebene braucht (ohne Zirkelimport auf field.ts). */
export interface PlaneFeatureHost {
  readonly seed: number;
  worldId(world: number): string;
  /** Regionsschlüssel am Punkt. */
  regionKeyAt(x: number, z: number): string;
  /** Höhe ohne Merkmale (natürliches Gelände). */
  baseHeightAt(x: number, z: number): number;
  amplitudeAt(x: number, z: number): number;
  /** Achse des Pfadbands (Rückgrat): Bandrand, Küste, Felswände am Rand. Der Pfad selbst folgt der Makroform. */
  backbone(z: number): number;
  backboneSlope(z: number): number;
  bandHalf(z: number): number;
  /** Abstand zur Pfad-Mittellinie (Makroform des Abschnitts bei z und seiner Nachbarn, W3). */
  pathDistance(x: number, z: number): number;
  /** Nächster Punkt der Pfad-Mittellinie. */
  pathNearest(x: number, z: number): PathNear;
  /** Punkt und Normale der Mittellinie des Abschnitts k beim Bogenanteil t (0 … 1). */
  pathPoint(k: number, t: number): { x: number; z: number; nx: number; nz: number };
  /** Bogenanteil (0 … 1) der Mittellinie des Abschnitts k an der Stelle z (gefaltete Linie: die `pick`-te Lage, 0 ≤ pick < 1). */
  pathTAtZ(k: number, z: number, pick: number): number;
  /** Äußerste seitliche Lage der Mittellinie auf der Seite `side` nahe z (Versatz zum Rückgrat). */
  pathEnvelope(z: number, side: number, window?: number): number;
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

/** Abstand eines Punkts zur Pfad-Mittellinie (Makroform; früher: seitlich zum Rückgrat). */
export function pathDistance(host: Pick<PlaneFeatureHost, 'pathDistance'>, x: number, z: number): number {
  return host.pathDistance(x, z);
}

/**
 * Richtung des Weltbands am Punkt als Winkel in der Ebene (0 = +x, π/2 = +z): Pfadregionen längs der Pfad-Mittellinie
 * an ihrer nächsten Stelle (Seen strecken sich am Pfad entlang, auch an Kehren), Zellen längs z.
 */
export function bandAxisAngle(host: PlaneFeatureHost, site: RegionSite, x: number, z: number): number {
  if (site.region.kind === 'cell') return -Math.PI / 2;
  const n = host.pathNearest(x, z);
  // Laufrichtung t aus der Normalen n = (−t_z, t_x)
  return Math.atan2(-n.nx, n.nz);
}

/** Halbe Breite der Region quer zum Pfad (Pfadband bzw. grobe Zellhälfte). */
export function regionHalfWidth(host: PlaneFeatureHost, site: RegionSite, z: number): number {
  return site.region.kind === 'path' ? host.bandHalf(z) : site.cellRadius;
}

/**
 * Längsbereich [Mindest-, Höchstabstand] zum Bildfokus, der in den Abschnitt passt: kurze Abschnitte (Serpentine,
 * Schnecke: z-Länge ≈ 30) drängen `focusDistance` zusammen, statt das Merkmal zu verlieren.
 */
export function focusRange(site: RegionSite, range: readonly [number, number], margin = 0.5): [number, number] {
  const seg = site.segment;
  if (!seg) return [range[0], range[1]];
  const room = Math.max(site.focus[1] - (seg.zEnd + margin), seg.zStart - margin - site.focus[1]);
  if (range[0] <= room * 0.8) return [range[0], Math.min(range[1], Math.max(range[0], room))];
  return [room * 0.45, room * 0.95];
}

/**
 * Kandidat für ein Merkmal mit Reichweite `reach`: Pfadregionen neben der Pfad-Mittellinie (Kante im Abstand
 * `pathDistance`, längs der Normalen der Makroform) längs des Abschnitts oder um den Bildfokus (`focusDistance`),
 * Seitenzellen um ihren Fokus. Das Merkmal muss in der Region liegen und darf keiner anderen Schleife der Linie näher
 * kommen; sonst null.
 */
export function placementCandidate(host: PlaneFeatureHost, site: RegionSite, spec: PlacementSpec, reach: number, rand: () => number, out: [number, number] = [0, 0]): [number, number] | null {
  const seg = site.segment;
  if (site.region.kind === 'path' && seg) {
    let t: number;
    if (spec.focusDistance) {
      const [dMin, dMax] = focusRange(site, spec.focusDistance);
      const sgn = rand() < 0.5 ? -1 : 1;
      let z = site.focus[1] + (dMin + (dMax - dMin) * rand()) * sgn;
      if (z > seg.zStart - 0.5 || z < seg.zEnd + 0.5) z = site.focus[1] - (z - site.focus[1]);
      if (z > seg.zStart - 0.5 || z < seg.zEnd + 0.5) return null;
      t = host.pathTAtZ(seg.k, z, rand());
    } else t = 0.06 + 0.88 * rand();
    const p = host.pathPoint(seg.k, t);
    const [eMin, eMax] = spec.pathDistance ?? [2, 4];
    const r = rand();
    // feste Seite (z. B. Felsstümpfe im Nebelmeer links vom Pfad, gegenüber dem Steilhang), sonst zufällig
    const side = spec.side ?? (r < 0.5 ? -1 : 1);
    // Bandrand auf dieser Seite, gemessen vom Punkt der Mittellinie längs ihrer Normalen (≈ seitlich)
    const lateral = p.x - host.backbone(p.z);
    const toEdge = host.bandHalf(p.z) - side * lateral * Math.sign(p.nx || 1);
    const lo = eMin + reach;
    const hi = Math.min(eMax + reach, toEdge - BORDER_MARGIN - reach);
    if (hi < lo) return null;
    const d = lo + (hi - lo) * rand();
    out[0] = p.x + p.nx * side * d;
    out[1] = p.z + p.nz * side * d;
    // Gefaltete Linien (Kehren, Schnecke): keiner anderen Schleife näher als der Mindestabstand
    if (host.pathDistance(out[0], out[1]) < lo - 0.25) return null;
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
