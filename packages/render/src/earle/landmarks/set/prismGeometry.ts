import { ShapeUtils, Vector2 } from 'three/webgpu';
import { wallAxis, wallPoint, type Prism, type PrismCap, type PrismSurface, type WallSpec } from '@ee/world';
import { earClip } from '../rocks';
import { GeoBuffer, frameDir, framePoint, hash01, type LandmarkFrame } from './buffers';
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
  /**
   * Per face (the facet is one serigraph layer): (distance below the face's top edge [world units] — the lit gold
   * edge of stone, height share 0 at the face's foot … 1 at its top — the facet's own gradient, the face centre's
   * height over the landmark 0..1 — its step up the monolith, a key 0..1 per face).
   */
  lc: 4,
  /** Painted lancet window of the face: (across from the window's centre line, half width, sill, apex) [world units]. */
  ld: 4,
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
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Wall and cap rows for a surface; cut stone and rubble take their moss (caps, dots on worn tops) from the moss row. */
function rowsFor(surface: PrismSurface, rows: LandmarkRows): [number, number] {
  switch (surface) {
    case 'stone':
    case 'rubble':
      return [rows.stone, rows.moss];
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

const NO_LANCET = [0, 0, 0, 0];
/** Roles without the golden lichen edge. */
const NO_LICHEN = new Set(['stair', 'landing', 'step', 'rubble', 'rim']);

/**
 * Faceted prisms (flat shaded, own vertices per face) into `out`: walls from the sunk foot to the top ring (taper,
 * tilt, jag), a flat/tilted cap (ear-clipped) or an apex fan (spires). Positions in the set's space via `frame`.
 * `refHeight`: height of the landmark (the faces' step up the monolith, `lc.z`); 0 = per prism.
 */
export function addPrisms(out: GeoBuffer, prisms: readonly Prism[], frame: LandmarkFrame, rows: LandmarkRows, refHeight = 0): void {
  for (const p of prisms) {
    const n = p.base.length;
    if (n < 3) continue;
    const [rowWall, rowCap] = rowsFor(p.surface, rows);
    // treads, rubble and rim stones carry no lichen edge (it would read as a nosing on every step)
    const lichen = !NO_LICHEN.has(p.role);
    const sc = SURFACE_CODE[p.surface];
    const [cx, cz] = centroidOf(p.top);
    const topY = p.top.map(([x, z], i) => p.y1 + p.tilt[0] * (x - cx) + p.tilt[1] * (z - cz) + (p.jag[i] ?? 0));
    const yMin = p.y0;
    const yMax = Math.max(...topY) + p.apex;
    const span = Math.max(0.5, yMax - Math.max(yMin, 0));
    const grad = (y: number) => Math.min(1, Math.max(0, y / span));
    const ref = refHeight > 0 ? refHeight : span;
    const step = (y: number) => clamp01(y / ref);
    const P = (x: number, y: number, z: number): V3 => framePoint(frame, x, y, z);
    const vtx = (pos: V3, nrm: V3, u: number, y: number, face: number, row: number, lc: readonly number[], ld: readonly number[] = NO_LANCET) =>
      out.vertex({ position: pos, normal: nrm, la: [u, y, grad(y), p.variant], lb: [sc, face, row, rowCap], lc, ld });
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
      const edgeTop = Math.hypot(tb[0] - ta[0], tb[1] - ta[1]);
      // the facet: its own gradient (foot → top), its step up the landmark, its key
      const centre = step((Math.max(p.y0, 0) + (topY[i]! + topY[i1]!) * 0.5) * 0.5);
      const key = hash01(p.variant * 97 + 3, i, 0.29);
      const lancet = p.lancets?.find((l) => l.face === i);
      const ld = (half: number, side: number): number[] => (lancet ? [side * half - lancet.s, lancet.width * 0.5, lancet.sill, lancet.apex] : NO_LANCET);
      const far = lichen ? 0 : 99;
      const i0 = vtx(A, nrm, perim, p.y0, FACE_WALL, rowWall, [topY[i]! - p.y0 + far, 0, centre, key], ld(edge * 0.5, -1));
      const i1v = vtx(B, nrm, perim + edge, p.y0, FACE_WALL, rowWall, [topY[i1]! - p.y0 + far, 0, centre, key], ld(edge * 0.5, 1));
      const i2 = vtx(TB, nrm, perim + edge, topY[i1]!, FACE_WALL, rowWall, [far, 1, centre, key], ld(edgeTop * 0.5, 1));
      const i3 = vtx(TA, nrm, perim, topY[i]!, FACE_WALL, rowWall, [far, 1, centre, key], ld(edgeTop * 0.5, -1));
      out.triFacing(i0, i1v, i2, nrm);
      out.triFacing(i0, i2, i3, nrm);
      perim += edge;
    }
    const up = frameDir(frame, 0, 1, 0) as V3;
    const capLc = [0, 1, step(yMax), hash01(p.variant * 53 + 1, 0.61)];
    // a cap's base row: moss caps and level tops print in the cap row, cut stone tops in the wall's own stone
    const capBase = CAP_FACE[p.cap] === FACE_CUT ? rowWall : rowCap;
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
        const lc = [0, 0, step((topY[i]! + ay) * 0.5), hash01(p.variant * 31 + 7, i, 0.83)];
        const a0 = vtx(TA, nrm, i * e, topY[i]!, FACE_FACET, rowWall, lc);
        const a1 = vtx(TB, nrm, (i + 1) * e, topY[i1]!, FACE_FACET, rowWall, lc);
        const a2 = vtx(C, nrm, (i + 0.5) * e, ay, FACE_FACET, rowWall, [0, 1, lc[2]!, lc[3]!]);
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
          const a0 = vtx(TA, nrm, ta[0], topY[i]!, face, capBase, capLc);
          const a1 = vtx(TB, nrm, tb[0], topY[i1]!, face, capBase, capLc);
          const a2 = vtx(C, nrm, cx, cy, face, capBase, capLc);
          out.triFacing(a0, a1, a2, nrm);
        }
      } else {
        const T0 = P(p.top[0]![0], topY[0]!, p.top[0]![1]);
        const T1 = P(p.top[1]![0], topY[1]!, p.top[1]![1]);
        const Cc = P(cx, p.y1, cz);
        let nrm = norm(cross(sub(T0, Cc), sub(T1, Cc)));
        if (dot(nrm, up) < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
        // cap coordinates: plane (x, z) of the landmark (moss dots, flagstones stay glued to the top)
        const ring = p.top.map(([x, z], i) => vtx(P(x, topY[i]!, z), nrm, x, z, face, capBase, capLc));
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

function signedArea2(poly: ReadonlyArray<readonly [number, number]>): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a * 0.5;
}

/** Highest point of an outline above `s` (its top edge there). */
function topAt(outline: ReadonlyArray<readonly [number, number]>, s: number): number {
  let best = -Infinity;
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i]!;
    const q = outline[(i + 1) % outline.length]!;
    const lo = Math.min(p[0], q[0]);
    const hi = Math.max(p[0], q[0]);
    if (s < lo - 1e-6 || s > hi + 1e-6) continue;
    const t = hi - lo < 1e-6 ? 1 : (s - p[0]) / (q[0] - p[0]);
    best = Math.max(best, hi - lo < 1e-6 ? Math.max(p[1], q[1]) : p[1] + (q[1] - p[1]) * t);
  }
  return best === -Infinity ? 0 : best;
}

/**
 * Tracery walls (ruin): each slab extruded from its outline in the wall's own plane — front and back faces
 * triangulated around the lancet holes (earcut), the thickness as flat side faces (jambs, sills, the arches'
 * intrados, the broken top as cut stone). Leaning with the wall; one facet per face like the prisms.
 */
export function addWalls(out: GeoBuffer, walls: readonly WallSpec[], frame: LandmarkFrame, rows: LandmarkRows, refHeight: number): void {
  const sc = SURFACE_CODE.stone;
  for (const w of walls) {
    if (w.outline.length < 3) continue;
    const { ux, uz } = wallAxis(w);
    const ref = Math.max(0.5, refHeight);
    const hMin = Math.min(...w.outline.map((p) => p[1]));
    const P = (s: number, h: number, side: number): V3 => {
      const q = wallPoint(w, s, h, side);
      return framePoint(frame, q[0], q[1], q[2]);
    };
    const la = (s: number, h: number) => [s, w.y + h, clamp01((w.y + h) / ref), w.variant];
    const lcOf = (s: number, h: number, centre: number, key: number) => {
      const top = topAt(w.outline, s);
      return [Math.max(0, top - h), clamp01((h - hMin) / Math.max(0.3, top - hMin)), centre, key];
    };
    // in-plane basis (local): along the foot line, up with the lean
    const along: V3 = [ux, 0, uz];
    const upL: V3 = [w.normal[0] * w.lean, 1, w.normal[1] * w.lean];
    const toSet = (v: V3): V3 => norm(frameDir(frame, v[0], v[1], v[2]) as V3);
    const meanTop = w.outline.reduce((s, p) => s + Math.max(p[1], 0), 0) / w.outline.length;
    const faceCentre = clamp01((w.y + (Math.max(hMin, 0) + meanTop) * 0.5) / ref);
    // front (outer, +normal) and back faces around the holes
    const contour = w.outline.map(([s, h]) => new Vector2(s, h));
    const holes = w.holes.map((hole) => hole.map(([s, h]) => new Vector2(s, h)));
    const tris = ShapeUtils.triangulateShape(contour, holes);
    // (after triangulating: it drops a repeated end point, the indices follow the arrays it kept)
    const flat = [...contour, ...holes.flat()].map((v) => [v.x, v.y] as const);
    for (const side of [1, -1]) {
      const nrm = toSet([w.normal[0] * side, -w.lean * side, w.normal[1] * side]);
      const key = hash01(w.variant * 71 + 5, side, 0.4);
      const idx = flat.map(([s, h]) => out.vertex({ position: P(s, h, side), normal: nrm, la: la(s, h), lb: [sc, FACE_WALL, rows.stone, rows.moss], lc: lcOf(s, h, faceCentre, key), ld: NO_LANCET }));
      for (const t of tris) out.triFacing(idx[t[0]!]!, idx[t[1]!]!, idx[t[2]!]!, nrm);
    }
    // the thickness: one flat face per edge of the outline and the holes
    const rings: Array<{ pts: ReadonlyArray<readonly [number, number]>; into: boolean }> = [{ pts: w.outline, into: false }, ...w.holes.map((h) => ({ pts: h, into: true }))];
    let e = 0;
    for (const ring of rings) {
      const ccwRing = signedArea2(ring.pts) > 0;
      // outward from the solid: right of the edge for a counter-clockwise outline, the opposite into a hole
      const sign = (ccwRing ? 1 : -1) * (ring.into ? -1 : 1);
      for (let i = 0; i < ring.pts.length; i++) {
        const p = ring.pts[i]!;
        const q = ring.pts[(i + 1) % ring.pts.length]!;
        const ds = q[0] - p[0];
        const dh = q[1] - p[1];
        const l = Math.hypot(ds, dh);
        if (l < 1e-5) continue;
        const ns = (dh / l) * sign;
        const nh = (-ds / l) * sign;
        const nLocal: V3 = [along[0] * ns + upL[0] * nh, along[1] * ns + upL[1] * nh, along[2] * ns + upL[2] * nh];
        const nrm = toSet(nLocal);
        const up = nLocal[1] > 0.55;
        const face = up ? FACE_CUT : FACE_WALL;
        const key = hash01(w.variant * 13 + 11, e++, 0.7);
        const centre = clamp01((w.y + (p[1] + q[1]) * 0.5) / ref);
        // (no lichen edge on the thickness: along a broken top it would gild the whole flank of every tooth)
        const lc = (s: number, h: number) => (up ? [0, 1, centre, key] : [99, lcOf(s, h, centre, key)[1]!, centre, key]);
        // cut tops carry plane coordinates like the prism caps; the sides run along the edge
        const u0 = up ? p[0] : 0;
        const u1 = up ? q[0] : l;
        const v = (s: number, h: number, side: number, u: number) =>
          out.vertex({ position: P(s, h, side), normal: nrm, la: up ? [u, side * w.depth * 0.5, clamp01((w.y + h) / ref), w.variant] : [u, w.y + h, clamp01((w.y + h) / ref), w.variant], lb: [sc, face, rows.stone, rows.moss], lc: lc(s, h), ld: NO_LANCET });
        const a = v(p[0], p[1], 1, u0);
        const b = v(q[0], q[1], 1, u1);
        const c = v(q[0], q[1], -1, u1);
        const d = v(p[0], p[1], -1, u0);
        out.triFacing(a, b, c, nrm);
        out.triFacing(a, c, d, nrm);
      }
    }
  }
}
