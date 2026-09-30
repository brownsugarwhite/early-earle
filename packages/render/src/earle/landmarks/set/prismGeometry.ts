import { lancetHeight, type ArcadeSpec, type Prism, type PrismCap, type PrismSurface } from '@ee/world';
import { earClip } from '../rocks';
import { GeoBuffer, frameDir, framePoint, type LandmarkFrame } from './buffers';
import type { LandmarkRows } from './palette';

/** Surface codes of the rock/stone material (`lb.x`). */
export const SURFACE_CODE: Record<PrismSurface, number> = { basalt: 0, crag: 1, wet: 2, stone: 3, rubble: 4, roof: 5, island: 6, bark: 7 };
/** Face codes (`lb.y`): walls, moss cap, rock facet, level top, cut stone top. */
export const FACE_WALL = 0;
export const FACE_MOSS = 1;
export const FACE_FACET = 2;
export const FACE_PLATEAU = 3;
export const FACE_CUT = 4;

const CAP_FACE: Record<PrismCap, number> = { moss: FACE_MOSS, plateau: FACE_PLATEAU, facet: FACE_FACET, cut: FACE_CUT, broken: FACE_CUT };

/** Vertex layout of the rock/stone geometry. */
export const ROCK_LAYOUT = {
  position: 3,
  normal: 3,
  /** (u perimeter/along [world units], y local height, gradient 0..1 over the prism's height, variant) */
  la: 4,
  /** (surface code, face code, wall row, cap row) */
  lb: 4,
  /** (distance below the top edge of the face [world units], 0, 0, 0): the lit gold edge of stone faces */
  lc: 4,
};

type V3 = [number, number, number];

function sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a: V3): V3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
function dot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Wall and cap rows for a surface. */
function rowsFor(surface: PrismSurface, rows: LandmarkRows): [number, number] {
  switch (surface) {
    case 'stone':
    case 'rubble':
      return [rows.stone, rows.stone];
    case 'roof':
      return [rows.roof, rows.roof];
    case 'bark':
      return [rows.vine, rows.vine];
    case 'island':
      return [rows.earth, rows.moss];
    default:
      return [rows.rock, rows.moss];
  }
}

/**
 * Faceted prisms (flat shaded, own vertices per face) into `out`: walls from the sunk foot to the top ring (taper,
 * tilt, jag), a flat/tilted cap (ear-clipped) or an apex fan (spires). Positions in the set's space via `frame`.
 */
export function addPrisms(out: GeoBuffer, prisms: readonly Prism[], frame: LandmarkFrame, rows: LandmarkRows): void {
  for (const p of prisms) {
    const n = p.base.length;
    if (n < 3) continue;
    const [rowWall, rowCap] = rowsFor(p.surface, rows);
    const sc = SURFACE_CODE[p.surface];
    const [cx, cz] = centroidOf(p.top);
    const topY = p.top.map(([x, z], i) => p.y1 + p.tilt[0] * (x - cx) + p.tilt[1] * (z - cz) + (p.jag[i] ?? 0));
    const yMin = p.y0;
    const yMax = Math.max(...topY) + p.apex;
    const span = Math.max(0.5, yMax - Math.max(yMin, 0));
    const grad = (y: number) => Math.min(1, Math.max(0, y / span));
    const P = (x: number, y: number, z: number): V3 => framePoint(frame, x, y, z);
    const vtx = (pos: V3, nrm: V3, u: number, y: number, face: number, row: number, td = 0) =>
      out.vertex({ position: pos, normal: nrm, la: [u, y, grad(y), p.variant], lb: [sc, face, row, rowCap], lc: [td, 0, 0, 0] });
    const [bcx, bcz] = centroidOf(p.base);
    // walls
    let perim = p.variant * 7;
    for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % n;
      const a = p.base[i]!;
      const b = p.base[i1]!;
      const ta = p.top[i]!;
      const tb = p.top[i1]!;
      const A = P(a[0], p.y0, a[1]);
      const B = P(b[0], p.y0, b[1]);
      const TA = P(ta[0], topY[i]!, ta[1]);
      const TB = P(tb[0], topY[i1]!, tb[1]);
      let nrm = norm(cross(sub(B, A), sub(TA, A)));
      const mid = frameDir(frame, (a[0] + b[0]) * 0.5 - bcx, 0, (a[1] + b[1]) * 0.5 - bcz);
      if (dot(nrm, mid) < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
      const edge = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const i0 = vtx(A, nrm, perim, p.y0, FACE_WALL, rowWall, topY[i]! - p.y0);
      const i1v = vtx(B, nrm, perim + edge, p.y0, FACE_WALL, rowWall, topY[i1]! - p.y0);
      const i2 = vtx(TB, nrm, perim + edge, topY[i1]!, FACE_WALL, rowWall);
      const i3 = vtx(TA, nrm, perim, topY[i]!, FACE_WALL, rowWall);
      out.triFacing(i0, i1v, i2, nrm);
      out.triFacing(i0, i2, i3, nrm);
      perim += edge;
    }
    const up = frameDir(frame, 0, 1, 0) as V3;
    if (p.apex > 1e-3) {
      const ax = cx + p.apexOffset[0];
      const az = cz + p.apexOffset[1];
      const ay = p.y1 + p.tilt[0] * (ax - cx) + p.tilt[1] * (az - cz) + p.apex;
      const C = P(ax, ay, az);
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n;
        const ta = p.top[i]!;
        const tb = p.top[i1]!;
        const TA = P(ta[0], topY[i]!, ta[1]);
        const TB = P(tb[0], topY[i1]!, tb[1]);
        let nrm = norm(cross(sub(TB, TA), sub(C, TA)));
        if (dot(nrm, up) < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
        const e = Math.hypot(tb[0] - ta[0], tb[1] - ta[1]);
        const a0 = vtx(TA, nrm, i * e, topY[i]!, FACE_FACET, rowWall);
        const a1 = vtx(TB, nrm, (i + 1) * e, topY[i1]!, FACE_FACET, rowWall);
        const a2 = vtx(C, nrm, (i + 0.5) * e, ay, FACE_FACET, rowWall);
        out.triFacing(a0, a1, a2, nrm);
      }
    } else {
      const face = CAP_FACE[p.cap];
      const jagged = p.jag.length > 0;
      if (jagged) {
        // broken tops: a fan from the centroid (each wedge its own facet) — the jagged ring stays readable
        const cy = topY.reduce((s, v) => s + v, 0) / n - 0.15;
        const C = P(cx, cy, cz);
        for (let i = 0; i < n; i++) {
          const i1 = (i + 1) % n;
          const ta = p.top[i]!;
          const tb = p.top[i1]!;
          const TA = P(ta[0], topY[i]!, ta[1]);
          const TB = P(tb[0], topY[i1]!, tb[1]);
          let nrm = norm(cross(sub(TB, TA), sub(C, TA)));
          if (dot(nrm, up) < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
          const a0 = vtx(TA, nrm, ta[0], topY[i]!, face, rowCap);
          const a1 = vtx(TB, nrm, tb[0], topY[i1]!, face, rowCap);
          const a2 = vtx(C, nrm, cx, cy, face, rowCap);
          out.triFacing(a0, a1, a2, nrm);
        }
      } else {
        const T0 = P(p.top[0]![0], topY[0]!, p.top[0]![1]);
        const T1 = P(p.top[1]![0], topY[1]!, p.top[1]![1]);
        const Cc = P(cx, p.y1, cz);
        let nrm = norm(cross(sub(T0, Cc), sub(T1, Cc)));
        if (dot(nrm, up) < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
        // cap coordinates: plane (x, z) of the landmark (moss dots, flagstones stay glued to the top)
        const ring = p.top.map(([x, z], i) => vtx(P(x, topY[i]!, z), nrm, x, z, face, rowCap));
        for (const [a, b, c] of earClip(p.top)) out.triFacing(ring[a]!, ring[b]!, ring[c]!, nrm);
      }
    }
  }
}

function centroidOf(poly: ReadonlyArray<readonly [number, number]>): [number, number] {
  let x = 0;
  let z = 0;
  for (const p of poly) {
    x += p[0];
    z += p[1];
  }
  return [x / poly.length, z / poly.length];
}

/**
 * Lancet arcade (ruin): piers and pointed arches as one stone wall with openings — front and back faces between the
 * intrados and the outer rectangle, the intrados surface, pier sides and the top. Broken bays keep only the lower
 * part of their arch (the spandrel above breaks off in a jagged line).
 */
export function addArcade(out: GeoBuffer, a: ArcadeSpec, frame: LandmarkFrame, rows: LandmarkRows): void {
  const sc = 3; // stone
  const dx = a.to[0] - a.from[0];
  const dz = a.to[1] - a.from[1];
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  // front normal: toward the plateau centre side (local −(wall normal) … pick the side facing +z of the landmark)
  let nx = -uz;
  let nz = ux;
  if (nz < 0) {
    nx = -nx;
    nz = -nz;
  }
  const half = a.depth / 2;
  const topY = a.y + a.pierHeight + a.rise + 0.45;
  const bayW = (len - a.pier) / a.bays;
  const span = bayW - a.pier;
  const P = (s: number, y: number, side: number): V3 => framePoint(frame, a.from[0] + ux * s + nx * half * side, y, a.from[1] + uz * s + nz * half * side);
  const N = (x: number, y: number, z: number): V3 => norm(frameDir(frame, x, y, z) as V3);
  const grad = (y: number) => Math.min(1, Math.max(0, (y - a.y) / (topY - a.y)));
  const vtx = (pos: V3, nrm: V3, u: number, y: number, face = 0) => out.vertex({ position: pos, normal: nrm, la: [u, y, grad(y) * 0.6 + 0.4, 0.37], lb: [sc, face, rows.stone, rows.stone], lc: [Math.max(0, topY - y), 0, 0, 0] });
  const quad = (p0: V3, p1: V3, p2: V3, p3: V3, nrm: V3, u0: number, u1: number, y0: number, y1: number, y2: number, y3: number, face = 0) => {
    const i0 = vtx(p0, nrm, u0, y0, face);
    const i1 = vtx(p1, nrm, u1, y1, face);
    const i2 = vtx(p2, nrm, u1, y2, face);
    const i3 = vtx(p3, nrm, u0, y3, face);
    out.triFacing(i0, i1, i2, nrm);
    out.triFacing(i0, i2, i3, nrm);
  };
  const SEG = 10;
  // end piers next to a broken bay lost their upper courses
  const pierH = (b: number) => ((b === 0 && a.broken[0] !== undefined) || (b === a.bays && a.broken[a.bays - 1] !== undefined) ? topY - 0.9 : topY);
  /** Spandrel top over bay `b` at u (jagged where the bay broke). */
  const spandrelTop = (b: number, u: number, arch: number): number => {
    const keep = a.broken[b];
    if (keep === undefined) return topY;
    return Math.max(arch + 0.02, topY - (u / Math.max(0.01, keep)) * 0.9);
  };
  for (const side of [1, -1]) {
    const nrm = N(nx * side, 0, nz * side);
    // piers (full height rectangles) and spandrels above each opening
    for (let b = 0; b <= a.bays; b++) {
      const s0 = b * bayW;
      const s1 = s0 + a.pier;
      const h = pierH(b);
      quad(P(s0, a.y - 0.3, side), P(s1, a.y - 0.3, side), P(s1, h, side), P(s0, h, side), nrm, s0, s1, a.y, a.y, h, h);
    }
    for (let b = 0; b < a.bays; b++) {
      const s0 = b * bayW + a.pier;
      const keep = a.broken[b] ?? 1;
      for (let k = 0; k < SEG; k++) {
        const u0 = k / SEG;
        const u1 = (k + 1) / SEG;
        if (u0 >= keep) continue;
        const y0 = a.y + a.pierHeight + lancetHeight(u0, span, a.rise);
        const y1 = a.y + a.pierHeight + lancetHeight(u1, span, a.rise);
        const t0 = spandrelTop(b, u0, y0);
        const t1 = spandrelTop(b, u1, y1);
        quad(P(s0 + u0 * span, y0, side), P(s0 + u1 * span, y1, side), P(s0 + u1 * span, t1, side), P(s0 + u0 * span, t0, side), nrm, s0 + u0 * span, s0 + u1 * span, y0, y1, t1, t0);
      }
    }
  }
  const up = N(0, 1, 0);
  // intrados (arch undersides), jagged tops of broken spandrels and the jamb faces of the piers
  for (let b = 0; b < a.bays; b++) {
    const s0 = b * bayW + a.pier;
    const keep = a.broken[b];
    for (let k = 0; k < SEG; k++) {
      const u0 = k / SEG;
      const u1 = (k + 1) / SEG;
      if (keep !== undefined && u0 >= keep) continue;
      const y0 = a.y + a.pierHeight + lancetHeight(u0, span, a.rise);
      const y1 = a.y + a.pierHeight + lancetHeight(u1, span, a.rise);
      const ts = (u1 - u0) * span;
      const ty = y1 - y0;
      // normal points down/in toward the opening (perpendicular to the arch tangent, in the arch plane)
      let n: V3 = N(ux * ty, -ts, uz * ty);
      if (n[1] > 0) n = [-n[0], -n[1], -n[2]];
      quad(P(s0 + u0 * span, y0, 1), P(s0 + u1 * span, y1, 1), P(s0 + u1 * span, y1, -1), P(s0 + u0 * span, y0, -1), n, s0 + u0 * span, s0 + u1 * span, y0, y1, y1, y0);
      if (keep !== undefined) {
        const t0 = spandrelTop(b, u0, y0);
        const t1 = spandrelTop(b, u1, y1);
        let tn: V3 = N(-ux * (t1 - t0), ts, -uz * (t1 - t0));
        if (tn[1] < 0) tn = [-tn[0], -tn[1], -tn[2]];
        quad(P(s0 + u0 * span, t0, 1), P(s0 + u1 * span, t1, 1), P(s0 + u1 * span, t1, -1), P(s0 + u0 * span, t0, -1), tn, s0 + u0 * span, s0 + u1 * span, t0, t1, t1, t0, 4);
      }
    }
    if (keep !== undefined) {
      // the broken end of the spandrel: a vertical cut from the arch to the jagged top
      const u = keep;
      const y = a.y + a.pierHeight + lancetHeight(u, span, a.rise);
      const t = spandrelTop(b, u, y);
      const n = N(ux, 0, uz);
      quad(P(s0 + u * span, y, 1), P(s0 + u * span, y, -1), P(s0 + u * span, t, -1), P(s0 + u * span, t, 1), n, 0, a.depth, y, y, t, t);
    }
    const jamb = (s: number, dir: number) => {
      const n = N(ux * dir, 0, uz * dir);
      const yTop = a.y + a.pierHeight;
      quad(P(s, a.y - 0.3, 1), P(s, a.y - 0.3, -1), P(s, yTop, -1), P(s, yTop, 1), n, 0, a.depth, a.y, a.y, yTop, yTop);
    };
    jamb(s0, 1);
    jamb(s0 + span, -1);
  }
  // tops: pier tops, intact spandrels (one strip over pier + bay), then the two ends
  for (let b = 0; b <= a.bays; b++) {
    const s0 = b * bayW;
    const h = pierH(b);
    const intact = b < a.bays && a.broken[b] === undefined && h === topY;
    const s1 = s0 + a.pier + (intact ? span : 0);
    quad(P(s0, h, 1), P(s1, h, 1), P(s1, h, -1), P(s0, h, -1), up, s0, s1, h, h, h, h, 4);
    if (!intact && b < a.bays && a.broken[b] === undefined) {
      // pier lowered but its bay intact: the bay's top strip on its own
      quad(P(s0 + a.pier, topY, 1), P(s0 + a.pier + span, topY, 1), P(s0 + a.pier + span, topY, -1), P(s0 + a.pier, topY, -1), up, s0 + a.pier, s0 + a.pier + span, topY, topY, topY, topY, 4);
    }
  }
  for (const [s, dir, b] of [
    [0, -1, 0],
    [len, 1, a.bays],
  ] as const) {
    const n = N(ux * dir, 0, uz * dir);
    const h = pierH(b);
    quad(P(s, a.y - 0.3, 1), P(s, a.y - 0.3, -1), P(s, h, -1), P(s, h, 1), n, 0, a.depth, a.y, a.y, h, h);
  }
}
