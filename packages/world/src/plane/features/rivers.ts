import { segmentDist2, smoothstep } from './geometry';
import { BORDER_MARGIN, regionHalfWidth, type PlaneFeatureHost, type RegionSite } from './host';
import { carve, isFree, lakeAt, lakeFits, lakeLateralReach, lakeWobble, makeLake, type Occupied } from './lakes';
import type { Lake, LakeSpec, River, RiverSpec } from './types';

const STEP = 0.6;

/**
 * Seitliche Lage der Pfad-Mittellinie auf der Seite `side` bei z (Versatz zum Rückgrat, + = in Richtung `side`):
 * äußerste Lage im Fenster ±4 (Makroform, auch Kehren und Schnecke), über ±2 gemittelt — nie innerhalb der Linie.
 */
function pathEdge(host: PlaneFeatureHost, z: number, side: number): number {
  let acc = 0;
  for (let j = -2; j <= 2; j++) acc += host.pathEnvelope(z + j, side, 4);
  return acc / 5;
}

/**
 * Punkt neben dem Pfad bzw. am Bildfokus bei z mit seitlichem Versatz: Pfadregion — `lateral` gemessen vom äußeren
 * Rand der Pfad-Mittellinie auf seiner Seite (W3: Makroform statt Rückgrat), Zelle — vom Fokus.
 */
function bandPoint(host: PlaneFeatureHost, site: RegionSite, z: number, lateral: number): [number, number] {
  if (site.region.kind !== 'path') return [site.focus[0] + lateral, z];
  const side = lateral >= 0 ? 1 : -1;
  return [host.backbone(z) + side * (pathEdge(host, z, side) + Math.abs(lateral)), z];
}

/**
 * Flüsse einer Region, jeweils mit einem See an der Mündung: Der Fluss läuft längs des Pfads (Pfadregion: im freien
 * Streifen außen neben der Pfad-Mittellinie — Makroform, W3; Seitenzelle: seitlich am Bildfokus vorbei) und mäandert, fließt zum tieferen
 * Ende. Wasserspiegel = laufendes Geländeminimum (monoton fallend), geglättet; die Breite wächst zur Mündung.
 */
export function generateRivers(
  host: PlaneFeatureHost,
  site: RegionSite,
  world: number,
  spec: RiverSpec,
  lakeSpec: (LakeSpec & { swamp?: boolean }) | undefined,
  rand: () => number,
  occupied: Occupied[],
  lakeOffset: number,
): { rivers: River[]; lakes: Lake[] } {
  const rivers: River[] = [];
  const lakes: Lake[] = [];
  const onPath = site.region.kind === 'path';
  const meander = spec.meander ?? 0.5;
  const seg = site.segment;
  const zHi = onPath && seg ? seg.zStart : site.focus[1] + site.cellRadius;
  const zLo = onPath && seg ? seg.zEnd : site.focus[1] - site.cellRadius;
  for (let n = 0; n < spec.count; n++) {
    let done = false;
    for (let tries = 0; tries < 40 && !done; tries++) {
      const length = spec.length[0] + (spec.length[1] - spec.length[0]) * rand();
      const width = spec.width[0] + (spec.width[1] - spec.width[0]) * rand();
      let zMid: number;
      if (onPath) zMid = zLo + (zHi - zLo) * (0.1 + 0.8 * rand());
      else {
        const [dMin, dMax] = spec.focusDistance ?? [0, 8];
        zMid = site.focus[1] + (dMin + (dMax - dMin) * rand()) * (rand() < 0.5 ? -1 : 1);
      }
      const half = regionHalfWidth(host, site, zMid);
      const sign = rand() < 0.5 ? -1 : 1;
      const zA = zMid + length * 0.5;
      const zB = zMid - length * 0.5;
      // Pfadregion: der Fluss läuft außen an der Pfad-Mittellinie entlang — der Platz zum Bandrand schrumpft um ihren
      // größten Ausschlag auf dieser Seite
      let edgeMax = 0;
      if (onPath) for (let z = zB; z <= zA + 1e-6; z += 1) edgeMax = Math.max(edgeMax, pathEdge(host, z, sign));
      const lMax = half - BORDER_MARGIN - width * 0.5 - 0.2 - edgeMax;
      const pathGap = (spec.pathDistance?.[0] ?? 2) + width * 0.5 + 0.3;
      const lMin = onPath ? pathGap : -lMax;
      if (lMax - lMin < 0.6) {
        if (onPath) continue;
        break;
      }
      const farInner = 2.2;
      const lMid = onPath ? (lMin + lMax) * 0.5 : farInner + rand() * Math.max(0, lMax - farInner - 1.2);
      const amp = onPath ? Math.min(lMax - lMid, lMid - lMin) * (0.35 + 0.65 * meander) : Math.min(lMax - lMid, lMid - 1.0, lMax * 0.4) * (0.35 + 0.65 * meander);
      if (zA > zHi - 0.5 || zB < zLo + 0.5) continue;
      const k = 0.8 + rand() * 1.1;
      const phase = rand() * Math.PI * 2;
      const steps = Math.max(8, Math.round(length / STEP));
      const pts: Array<[number, number]> = [];
      let ok = true;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const env = Math.sin(Math.PI * Math.min(1, t * 1.15));
        const lat = sign * (lMid + amp * env * Math.sin(Math.PI * 2 * k * t + phase));
        const p = bandPoint(host, site, zA + (zB - zA) * t, lat);
        if (host.regionKeyAt(p[0], p[1]) !== site.region.key || !isFree(occupied, p[0], p[1], width * 0.5, 0.6) || (onPath && host.pathDistance(p[0], p[1]) < pathGap * 0.9)) {
          ok = false;
          break;
        }
        pts.push(p);
      }
      if (!ok || pts.length < 8) continue;
      let base = pts.map((p) => host.baseHeightAt(p[0], p[1]));
      if (base[0]! < base[base.length - 1]!) {
        pts.reverse();
        base = base.reverse();
      }
      const stretch = lakeSpec?.stretch ?? (onPath ? 2.2 : 1.1);
      const wobble = lakeWobble(rand);
      const room = Math.min(half - BORDER_MARGIN - edgeMax - Math.abs(sign * lMid), onPath ? Math.abs(lMid) - (spec.pathDistance?.[0] ?? 2) * 0.8 : Infinity);
      const lr = lakeSpec?.radius ?? [width * 1.3, width * 2.0];
      let radius = lr[0] + (lr[1] - lr[0]) * rand();
      while (radius > 0.8 && lakeLateralReach(radius, stretch, wobble) > room) radius *= 0.9;
      const mouth = pts[pts.length - 1]!;
      const made = makeLake(host, site, world, `${site.region.key}-lake-${lakeOffset + lakes.length}`, mouth[0], mouth[1], radius, stretch, spec.frozen ?? lakeSpec?.frozen ?? false, wobble, lakeSpec?.swamp ?? false);
      if (!made) continue;
      const lake = made.lake;
      if (!lakeFits(host, site, lake, onPath ? (spec.pathDistance?.[0] ?? 2) * 0.7 : 0)) continue;
      if (!isFree(occupied, mouth[0], mouth[1], lake.reach, 0.8)) continue;
      const levels = new Array<number>(pts.length);
      let run = base[0]! - 0.12;
      for (let i = 0; i < pts.length; i++) {
        run = Math.min(run, base[i]! - 0.12);
        levels[i] = run;
      }
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 1; i < pts.length - 1; i++) levels[i] = (levels[i - 1]! + levels[i]! * 2 + levels[i + 1]!) / 4;
        for (let i = 1; i < pts.length; i++) levels[i] = Math.min(levels[i]!, levels[i - 1]!);
      }
      const hit = { e: 0, theta: 0 };
      for (let i = 0; i < pts.length; i++) {
        levels[i] = Math.max(levels[i]!, lake.level);
        if (lakeAt(lake, pts[i]![0], pts[i]![1], hit) && hit.e < 0.4) levels[i] = lake.level;
      }
      const tip = [0.15, 0.5, 0.8];
      const widths = pts.map((_, i) => width * (0.45 + 0.55 * smoothstep(0, 1, i / Math.max(1, pts.length - 1))) * (tip[i] ?? 1));
      let acc = 0;
      const along = pts.map((p, i) => {
        if (i > 0) acc += Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1]);
        return acc;
      });
      lakes.push(lake);
      rivers.push({
        id: `${site.region.key}-river-${n}`,
        world,
        region: site.region.key,
        points: pts,
        levels,
        widths,
        shore: Math.max(0.9, width * 0.8),
        frozen: spec.frozen ?? lake.frozen,
        lake: lakeOffset + lakes.length - 1,
        along,
      });
      for (let i = 0; i < pts.length; i += 3) occupied.push({ x: pts[i]![0], z: pts[i]![1], radius: width * 0.5 + 0.6 });
      occupied.push({ x: lake.cx, z: lake.cz, radius: lake.reach });
      done = true;
    }
  }
  return { rivers, lakes };
}

const _seg = { t: 0 };

/** Nächster Punkt eines Flusssegments: Uferabstand e (< 0 im Wasser), Spiegel und Bogenlänge. */
export function riverSegmentAt(river: River, i: number, x: number, z: number, out: { e: number; level: number; along: number }): void {
  const a = river.points[i]!;
  const b = river.points[i + 1]!;
  const d = Math.sqrt(segmentDist2(x, z, a[0], a[1], b[0], b[1], _seg));
  const t = _seg.t;
  const w = river.widths[i]! + (river.widths[i + 1]! - river.widths[i]!) * t;
  out.e = d - w * 0.5;
  out.level = river.levels[i]! + (river.levels[i + 1]! - river.levels[i]!) * t;
  out.along = river.along[i]! + (river.along[i + 1]! - river.along[i]!) * t;
}

/** Höhe mit Flussrinne. */
export function riverHeight(river: River, e: number, level: number, h: number, levee = true): number {
  return carve(level, river.shore, e, h, levee);
}
