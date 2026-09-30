import type { Vec3 } from '../capPatch';
import { segmentDist2, smoothstep } from './geometry';
import { BORDER_MARGIN, bandHalfWidth, bandPoint, sPerUnit, spiralRangeFor, spiralS, type FeatureHost } from './host';
import { carve, isFree, lakeAt, lakeFits, lakeLateralReach, lakeWobble, makeLake, type Occupied } from './lakes';
import type { Lake, LakeSpec, River, RiverSpec } from './types';

const STEP = 0.6;

/**
 * Flüsse einer Welt, jeweils mit einem See an der Mündung: Der Fluss läuft längs des Weltbands (parallel zum Pfad bzw.
 * zur Bandmitte ferner Welten) und mäandert seitlich im freien Streifen neben dem Pfadkorridor; fließt zum tieferen
 * Ende. Wasserspiegel = laufendes Geländeminimum (monoton fallend), geglättet, bis zum Seespiegel; die Breite wächst
 * von der Quelle zur Mündung. Nichts kreuzt den Pfad, Felsen oder die Weltgrenze.
 */
export function generateRivers(
  host: FeatureHost,
  world: number,
  spec: RiverSpec,
  lakeSpec: LakeSpec | undefined,
  rand: () => number,
  occupied: Occupied[],
  lakeOffset: number,
): { rivers: River[]; lakes: Lake[] } {
  const R = host.radius;
  const rivers: River[] = [];
  const lakes: Lake[] = [];
  const side = host.worldSide(world);
  const near = side === 'near';
  const half = bandHalfWidth(host, side);
  const meander = spec.meander ?? 0.5;
  const [sLo, sHi] = spiralRangeFor(host, world);
  for (let n = 0; n < spec.count; n++) {
    let done = false;
    for (let tries = 0; tries < 40 && !done; tries++) {
      const length = spec.length[0] + (spec.length[1] - spec.length[0]) * rand();
      const width = spec.width[0] + (spec.width[1] - spec.width[0]) * rand();
      const lMax = half - BORDER_MARGIN - width * 0.5 - 0.2;
      const lMin = near ? (spec.pathDistance?.[0] ?? 2) + width * 0.5 + 0.3 : -lMax;
      if (lMax - lMin < 0.6) break;
      const sign = near ? (rand() < 0.5 ? -1 : 1) : 1;
      const lMid = near ? (lMin + lMax) * 0.5 : (rand() - 0.5) * lMax * 0.6;
      const amp = Math.min(lMax - Math.abs(lMid), Math.abs(lMid - lMin), lMax - lMid, near ? Infinity : lMax * 0.4) * (0.35 + 0.65 * meander);
      // Abschnitt längs des Bands: nahe Welten irgendwo im Weltbereich, ferne um den Bildfokus
      let sMid: number;
      if (near) sMid = sLo + (sHi - sLo) * (0.1 + 0.8 * rand());
      else {
        const focus = host.focusDir(world) ?? host.worldCenterDir(world);
        const sF = spiralS(host, Math.asin(Math.max(-1, Math.min(1, focus[1]))));
        const [dMin, dMax] = spec.focusDistance ?? [0, 10];
        sMid = sF + (dMin + (dMax - dMin) * rand()) * (rand() < 0.5 ? -1 : 1) * sPerUnit(host, sF);
      }
      const ds = length * sPerUnit(host, sMid);
      const sA = sMid - ds * 0.5;
      const sB = sMid + ds * 0.5;
      if (sA < sLo || sB > sHi) continue;
      const k = 0.8 + rand() * 1.1; // Mäanderbögen
      const phase = rand() * Math.PI * 2;
      const steps = Math.max(8, Math.round(length / STEP));
      const pts: Vec3[] = [];
      let ok = true;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Enden zur Streifenmitte (Mündungssee hat dort am meisten Platz)
        const env = Math.sin(Math.PI * Math.min(1, t * 1.15));
        const lat = sign * (lMid + amp * env * Math.sin(Math.PI * 2 * k * t + phase));
        const p = bandPoint(host, world, sA + (sB - sA) * t, lat);
        if (host.worldAt(p[0], p[1], p[2]) !== world || !isFree(occupied, p, width * 0.5, R, 0.6)) {
          ok = false;
          break;
        }
        pts.push(p);
      }
      if (!ok || pts.length < 8) continue;
      // Fließrichtung: zum tieferen Ende
      let base = pts.map((p) => host.baseHeightAt(p[0], p[1], p[2]));
      if (base[0]! < base[base.length - 1]!) {
        pts.reverse();
        base = base.reverse();
      }
      // Mündungssee am tieferen Ende (Mitte des Streifens), längs des Bands gestreckt
      const stretch = lakeSpec?.stretch ?? (near ? 2.2 : 1.1);
      const wobble = lakeWobble(rand);
      const room = Math.min(half - BORDER_MARGIN - Math.abs(sign * lMid), near ? Math.abs(lMid) - (spec.pathDistance?.[0] ?? 2) * 0.8 : Infinity);
      const lr = lakeSpec?.radius ?? [width * 1.3, width * 2.0];
      let radius = lr[0] + (lr[1] - lr[0]) * rand();
      while (radius > 0.8 && lakeLateralReach(radius, stretch, wobble) > room) radius *= 0.9;
      const mouth = pts[pts.length - 1]!;
      const made = makeLake(host, world, `${host.worldId(world)}-lake-${lakeOffset + lakes.length}`, mouth, radius, stretch, spec.frozen ?? lakeSpec?.frozen ?? false, wobble);
      if (!made) continue;
      const lake = made.lake;
      if (!lakeFits(host, world, lake, near ? (spec.pathDistance?.[0] ?? 2) * 0.7 : 0)) continue;
      if (!isFree(occupied, mouth, lake.reach, R, 0.8)) continue;
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
        if (lakeAt(lake, R, pts[i]![0], pts[i]![1], pts[i]![2], hit) && hit.e < 0.4) levels[i] = lake.level;
      }
      // Breite wächst zur Mündung; die Quelle läuft spitz aus (Rinne und Wasser-Mesh teilen dieselbe Breite)
      const tip = [0.15, 0.5, 0.8];
      const widths = pts.map((_, i) => width * (0.45 + 0.55 * smoothstep(0, 1, i / Math.max(1, pts.length - 1))) * (tip[i] ?? 1));
      let acc = 0;
      const along = pts.map((p, i) => {
        if (i > 0) {
          const q = pts[i - 1]!;
          acc += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) * R;
        }
        return acc;
      });
      lakes.push(lake);
      rivers.push({
        id: `${host.worldId(world)}-river-${n}`,
        world,
        points: pts,
        levels,
        widths,
        shore: Math.max(0.9, width * 0.8),
        frozen: spec.frozen ?? lake.frozen,
        lake: lakeOffset + lakes.length - 1,
        along,
      });
      // Belegung: Flussband (grob über Stützpunkte) und See
      for (let i = 0; i < pts.length; i += 3) occupied.push({ dir: pts[i]!, radius: width * 0.5 + 0.6 });
      occupied.push({ dir: lake.frame.c, radius: lake.reach });
      done = true;
    }
  }
  return { rivers, lakes };
}

const _seg = { t: 0 };

/** Nächster Punkt eines Flusssegments: Uferabstand e (< 0 im Wasser), Spiegel und Bogenlänge. */
export function riverSegmentAt(river: River, i: number, R: number, dx: number, dy: number, dz: number, out: { e: number; level: number; along: number }): void {
  const a = river.points[i]!;
  const b = river.points[i + 1]!;
  const d = Math.sqrt(segmentDist2(dx, dy, dz, a, b, _seg)) * R;
  const t = _seg.t;
  const w = river.widths[i]! + (river.widths[i + 1]! - river.widths[i]!) * t;
  out.e = d - w * 0.5;
  out.level = river.levels[i]! + (river.levels[i + 1]! - river.levels[i]!) * t;
  out.along = river.along[i]! + (river.along[i + 1]! - river.along[i]!) * t;
}

/** Höhe mit Flussrinne: unter dem Spiegel gegraben, Uferwall (außer `levee` aus), Böschung zum Gelände. */
export function riverHeight(river: River, e: number, level: number, h: number, levee = true): number {
  return carve(level, river.shore, e, h, levee);
}
