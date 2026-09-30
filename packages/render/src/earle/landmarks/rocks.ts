import { BufferAttribute, BufferGeometry } from 'three/webgpu';
import { abs, attribute, float, floor, fract, fwidth, hash, max, mix, positionLocal, positionView, select, sin, smoothstep, step, vec2, vec3 } from 'three/tsl';
import { columnTopAt, framePoint, type RockColumn, type RockFormation, type RockKind } from '@ee/world';
import { EarleMaterial } from '../EarleMaterial';
import { aaStep, arrayElement, hatchMask, patternTime, periodFade, stripeMask, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type UniformArrayLike, type Vec3Node } from '../tsl';

/** Art-Code im Vertex-Attribut (Welt·16 + Art·4 + Fläche). Wand = Basalt wie die Terrassen. */
const KIND_CODE: Record<RockKind, number> = { terraces: 0, wall: 0, tower: 1, mesa: 2, spires: 3 };
/** Flächentypen: 0 Wand, 1 Deckfläche (Deckfarbe), 2 Facette (geneigte Deckfläche/Spitze, Lichtbänder), 3 Sockelwand. */
const FACE_WALL = 0;
const FACE_CAP = 1;
const FACE_FACET = 2;
const FACE_TIER = 3;

export interface RockGeometryData {
  positions: Float32Array;
  normals: Float32Array;
  /** (u Umfang/Hanglinie, z Rahmenhöhe, Code, Variante) je Vertex. */
  rk: Float32Array;
  indices: Uint32Array;
  /** Höchste Deckfläche (über dem Grundradius) für die Schattenkamera. */
  maxHeight: number;
}

type V3 = [number, number, number];

/**
 * Säulen-Geometrie aller Formationen (flach schattiert: eigene Vertices je Fläche): Wände als Quads vom versenkten
 * Fuß zur (verjüngten, ggf. geneigten) Deckfläche, Deckfläche als Fächer, Nadeln mit versetzter Spitze. Rahmen der
 * Formation (Oben = Normale am Mittelpunkt), Positionen im Planetenraum.
 */
export function buildRockGeometry(formations: readonly RockFormation[], radius: number, worldOf: (f: RockFormation) => number): RockGeometryData {
  const pos: number[] = [];
  const nor: number[] = [];
  const rk: number[] = [];
  const idx: number[] = [];
  let maxHeight = 0;
  const vtx = (p: V3, n: V3, u: number, z: number, code: number, variant: number): number => {
    pos.push(p[0], p[1], p[2]);
    nor.push(n[0], n[1], n[2]);
    rk.push(u, z, code, variant);
    return pos.length / 3 - 1;
  };
  for (const f of formations) {
    const world = worldOf(f);
    const kind = KIND_CODE[f.kind] ?? 0;
    const up = f.frame.c;
    const P = (x: number, y: number, z: number): V3 => framePoint(f.frame, radius, x, y, z, [0, 0, 0]);
    f.columns.forEach((col, ci) => {
      const n = col.polygon.length;
      if (n < 3) return;
      const variant = fract1(f.variant * 7.13 + ci * 0.618);
      const wallFace = col.part === 1 || col.part === 2 || (col.part === 3 && f.kind === 'mesa') ? FACE_TIER : FACE_WALL;
      const code = world * 16 + kind * 4;
      // Deckfläche: Spitze (Nadel), geneigte Facette oder flacher Kopf in Deckfarbe
      const capFace = col.capStyle === 1 ? FACE_FACET : FACE_CAP;
      // Oberer Wandring: Böschung (Versatz nach innen) oder Verjüngung zum Schwerpunkt
      const shoulder: Array<[number, number]> =
        col.shoulder && col.shoulder.length === n
          ? col.shoulder
          : col.polygon.map(([x, y]) => [col.cx + (x - col.cx) * col.taper, col.cy + (y - col.cy) * col.taper] as [number, number]);
      // Moosbank: Fase vom Wandring zur eingerückten Deckfläche (nur mit explizitem Deckring)
      const hasCap = !!col.cap && col.cap.length === n;
      const bevel = hasCap && capFace === FACE_CAP && col.apex <= 1e-3 ? Math.min(col.bevel, (col.top - col.base) * 0.2) : 0;
      const topPoly: Array<[number, number]> = bevel > 0 ? col.cap! : shoulder;
      const shoulderZ = shoulder.map(([x, y]) => columnTopAt(col, x, y) - bevel);
      const topZ = topPoly.map(([x, y]) => columnTopAt(col, x, y));
      for (const z of topZ) maxHeight = Math.max(maxHeight, z + col.apex);
      // Wände (Fuß → Wandring) und Fase (Wandring → Deckfläche)
      let perim = variant * 3;
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n;
        const a = col.polygon[i]!;
        const b = col.polygon[i1]!;
        const ta = shoulder[i]!;
        const tb = shoulder[i1]!;
        const edge = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const A = P(a[0], a[1], col.base);
        const B = P(b[0], b[1], col.base);
        const TA = P(ta[0], ta[1], shoulderZ[i]!);
        const TB = P(tb[0], tb[1], shoulderZ[i1]!);
        const nrm = normalize(cross(sub(B, A), sub(TA, A)));
        const mx = (a[0] + b[0]) * 0.5 - col.cx;
        const my = (a[1] + b[1]) * 0.5 - col.cy;
        const out: V3 = [f.frame.east[0] * mx + f.frame.north[0] * my, f.frame.east[1] * mx + f.frame.north[1] * my, f.frame.east[2] * mx + f.frame.north[2] * my];
        if (dot(nrm, out) < 0) scale(nrm, -1);
        const i0 = vtx(A, nrm, perim, col.base, code + wallFace, variant);
        const i1v = vtx(B, nrm, perim + edge, col.base, code + wallFace, variant);
        const i2 = vtx(TB, nrm, perim + edge, shoulderZ[i1]!, code + wallFace, variant);
        const i3 = vtx(TA, nrm, perim, shoulderZ[i]!, code + wallFace, variant);
        tri(idx, pos, i0, i1v, i2, nrm);
        tri(idx, pos, i0, i2, i3, nrm);
        if (bevel > 0) {
          const ca = topPoly[i]!;
          const cb = topPoly[i1]!;
          const CA = P(ca[0], ca[1], topZ[i]!);
          const CB = P(cb[0], cb[1], topZ[i1]!);
          const bn = normalize(cross(sub(TB, TA), sub(CA, TA)));
          if (dot(bn, up) < 0) scale(bn, -1);
          const j0 = vtx(TA, bn, ta[0], ta[1], code + FACE_CAP, variant);
          const j1 = vtx(TB, bn, tb[0], tb[1], code + FACE_CAP, variant);
          const j2 = vtx(CB, bn, cb[0], cb[1], code + FACE_CAP, variant);
          const j3 = vtx(CA, bn, ca[0], ca[1], code + FACE_CAP, variant);
          tri(idx, pos, j0, j1, j2, bn);
          tri(idx, pos, j0, j2, j3, bn);
        }
        perim += edge;
      }
      if (col.apex > 1e-3) {
        const ax = col.cx + col.apexOffset[0];
        const ay = col.cy + col.apexOffset[1];
        const C = P(ax, ay, columnTopAt(col, ax, ay) + col.apex);
        for (let i = 0; i < n; i++) {
          const i1 = (i + 1) % n;
          const ta = topPoly[i]!;
          const tb = topPoly[i1]!;
          const TA = P(ta[0], ta[1], topZ[i]!);
          const TB = P(tb[0], tb[1], topZ[i1]!);
          const nrm = normalize(cross(sub(TB, TA), sub(C, TA)));
          if (dot(nrm, up) < 0) scale(nrm, -1);
          const e = Math.hypot(tb[0] - ta[0], tb[1] - ta[1]);
          const zc = columnTopAt(col, ax, ay) + col.apex;
          const a0 = vtx(TA, nrm, i * e, topZ[i]!, code + FACE_FACET, variant);
          const a1 = vtx(TB, nrm, (i + 1) * e, topZ[i1]!, code + FACE_FACET, variant);
          const a2 = vtx(C, nrm, (i + 0.5) * e, zc, code + FACE_FACET, variant);
          tri(idx, pos, a0, a1, a2, nrm);
        }
      } else {
        const tiltLen = Math.hypot(col.tilt[0], col.tilt[1]);
        // Linien einer Facette laufen die Falllinie hinab: u = Koordinate quer zur Neigung
        const qx = tiltLen > 1e-4 ? -col.tilt[1] / tiltLen : 1;
        const qy = tiltLen > 1e-4 ? col.tilt[0] / tiltLen : 0;
        const C = P(col.cx, col.cy, col.top);
        const T0 = P(topPoly[0]![0], topPoly[0]![1], topZ[0]!);
        const T1 = P(topPoly[1]![0], topPoly[1]![1], topZ[1]!);
        const nrm = normalize(cross(sub(T0, C), sub(T1, C)));
        if (dot(nrm, up) < 0) scale(nrm, -1);
        const uOf = (x: number, y: number) => (capFace === FACE_CAP ? x : x * qx + y * qy);
        const ring: number[] = [];
        for (let i = 0; i < n; i++) {
          const t = topPoly[i]!;
          ring.push(vtx(P(t[0], t[1], topZ[i]!), nrm, uOf(t[0], t[1]), capFace === FACE_CAP ? t[1] : topZ[i]!, code + capFace, variant));
        }
        // Ohrenschneiden: Deckflächen der gerippten Stufen sind nicht konvex
        for (const [a, b, c] of earClip(topPoly)) tri(idx, pos, ring[a]!, ring[b]!, ring[c]!, nrm);
        void C;
      }
    });
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(nor), rk: new Float32Array(rk), indices: new Uint32Array(idx), maxHeight };
}

export function rockGeometry(data: RockGeometryData): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(data.positions, 3));
  g.setAttribute('normal', new BufferAttribute(data.normals, 3));
  g.setAttribute('rk', new BufferAttribute(data.rk, 4));
  g.setIndex(new BufferAttribute(data.indices, 1));
  g.computeBoundingSphere();
  return g;
}

export interface RockMaterialOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  bands: TSLUniform;
  /** Felszeile je Welt-Index. */
  rockRows: UniformArrayLike;
  /** Zusatz-Nebeldistanz (Schleier) je Welt-Index. */
  veil: (world: FloatNode) => FloatNode;
  warp: (p: Vec3Node) => Vec3Node;
}

/**
 * Fels-Material (Earle-Monolithe): harte Facetten in 4 Lichtbändern, Schattenseite Tinte; Ornament je Art (Linie in
 * etwas drin, nie drum herum):
 * - Basalt (Terrassen, Wand): dichte senkrechte Riefen (Ebene_12), im Schatten als dunkle Linien sichtbar (Ebene_7),
 *   Moosköpfe mit feinen hellen Tupfen;
 * - Turm: gebrochene senkrechte Striche und wandernde Zickzack-Glyphenbänder, dichter am Sockel (Ebene_44/45);
 * - Tafelfels: lange Risse und Schichtlinien, auf den geneigten Facetten die Falllinie hinab (Ebene_27);
 * - Nadeln: feine Tüpfelung auf den Lichtflächen und einzelne Risse (Ebene_46).
 */
export function createRockMaterial(o: RockMaterialOptions): EarleMaterial {
  const rk = attribute('rk', 'vec4');
  const u = rk.x;
  const z = rk.y;
  const code = rk.z;
  const variant = rk.w;
  const world = floor(code.add(0.5).div(16));
  const local = code.sub(world.mul(16));
  const kind = floor(local.add(0.5).div(4));
  const face = local.sub(kind.mul(4));
  const row = arrayElement(o.rockRows, world);
  const isKind = (k: number) => step(abs(kind.sub(k)), float(0.5));
  const isFace = (k: number) => step(abs(face.sub(k)), float(0.5));
  const isCap = isFace(FACE_CAP);
  const isTier = isFace(FACE_TIER);
  // Basalt: dichte senkrechte Riefen mit leichter Unruhe
  const jitter = hash(floor(u.mul(5.5)).add(variant.mul(31.0))).mul(0.35);
  const basalt = stripeMask(u.mul(5.5).add(jitter).add(sin(z.mul(2.3).add(variant.mul(9.0))).mul(0.08)), 0.18);
  // Turm: gebrochene senkrechte Striche (verschiedene Längen) + Zickzack-Glyphenbänder
  const strokes = hatchMask(u.mul(3.2).add(variant.mul(3.0)), z.mul(1.6).add(hash(floor(u.mul(3.2))).mul(3.0)), 0.2, 0.3);
  const rowY = z.mul(2.2).add(variant.mul(2.0)).sub(patternTime.mul(0.006));
  const zig = abs(fract(u.mul(2.6)).mul(2.0).sub(1.0));
  const zigD = abs(fract(rowY).mul(2.2).sub(zig.mul(0.9)).sub(0.08));
  const glyphLine = smoothstep(fwidth(zigD).add(0.1), float(0.1).sub(fwidth(zigD)), zigD).mul(periodFade(rowY, 3.0));
  // Glyphenbänder: am Sockel jede Reihe, am Schaft jede dritte Reihe (Bänder wie bei Ebene_44)
  const bandGate = max(isTier, step(fract(floor(rowY).mul(0.334).add(0.05)), float(0.3)));
  const glyphs = glyphLine.mul(bandGate);
  // Tafelfels: lange Risse (gewellt, gebrochen) und Schichtlinien
  const crackCoord = u.mul(2.4).add(sin(z.mul(1.2).add(u.mul(0.6)).add(variant.mul(5.0))).mul(0.35));
  const crackGate = step(hash(floor(crackCoord).add(variant.mul(17.0))), float(0.72));
  const cracks = stripeMask(crackCoord, 0.07).mul(crackGate);
  // Nadeln: Tüpfel (Punktraster in u/z) und einzelne Risse
  const sp = vec2(u.mul(9.0), z.mul(9.0));
  const cell = floor(sp);
  const fr = fract(sp).sub(vec2(hash(cell.x.add(cell.y.mul(57.0))).mul(0.5).add(0.25), hash(cell.x.mul(13.0).add(cell.y.mul(7.0))).mul(0.5).add(0.25)));
  const stipple = aaStep(fr.length(), float(0.14)).mul(step(hash(cell.x.mul(7.0).add(cell.y.mul(131.0))), float(0.45))).mul(periodFade(sp.x, 2.2));
  const spireMask = max(stipple, cracks.mul(0.7));
  const wallMask = select(
    isKind(0).greaterThan(0.5),
    basalt,
    select(isKind(1).greaterThan(0.5), max(strokes.mul(0.85), glyphs), select(isKind(2).greaterThan(0.5), cracks, spireMask)),
  );
  const mask = wallMask.mul(isCap.oneMinus());
  const line = o.lookup.pal(6, row).rgb;
  const glyph = o.lookup.pal(7, row).rgb;
  const lineColor = select(isKind(1).greaterThan(0.5), mix(line, glyph, glyphs), line);
  const ink = o.lookup.pal(0, row).rgb;
  const capColor = o.lookup.pal(5, row).rgb;
  // Moosköpfe: feine hellere Tupfen (Earle-Moos), Kopfkanten im Licht
  const mp = vec2(u.mul(6.0), z.mul(6.0));
  const mcell = floor(mp);
  const mf = fract(mp).sub(vec2(hash(mcell.x.add(mcell.y.mul(91.0))).mul(0.5).add(0.25), hash(mcell.x.mul(17.0).add(mcell.y.mul(3.0))).mul(0.5).add(0.25)));
  const moss = aaStep(mf.length(), float(0.16)).mul(step(hash(mcell.x.mul(5.0).add(mcell.y.mul(23.0))), float(0.55))).mul(periodFade(mp.x, 2.2)).mul(isKind(0));
  const capLit = mix(capColor, mix(capColor, vec3(1, 1, 1), 0.35), moss);
  return new EarleMaterial({
    lookup: o.lookup,
    row: 0,
    rowNode: row,
    fog: o.fog,
    bands: o.bands,
    bandScale: 1.35,
    terminator: 0.04,
    // Turm-Schaft heller (Glut, Ebene_45), Sockel eine Spur dunkler
    lift: isKind(1).mul(float(0.12).sub(isTier.mul(0.16))),
    // Linien im Licht dunkel (Stufe 6), im Schatten hell (Stufe 3 halb in Tinte): die Riefen lesen sich auch auf der
    // Tintenseite (Ebene_7: türkise Striche auf schwarzem Fels)
    pattern: { mask, color: lineColor, shadowColor: mix(ink, o.lookup.pal(3, row).rgb, 0.42) },
    layers: [{ mask: isCap, color: capLit, shadowColor: mix(ink, capColor, 0.34) }],
    positionNode: o.warp(positionLocal),
    fogDistNode: positionView.length().add(o.veil(world)),
  });
}

// --- kleine Vektorhelfer ------------------------------------------------------------------------------------

function sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: V3, b: readonly number[]): number {
  return a[0] * b[0]! + a[1] * b[1]! + a[2] * b[2]!;
}
function normalize(a: V3): V3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  a[0] /= l;
  a[1] /= l;
  a[2] /= l;
  return a;
}
function scale(a: V3, s: number): void {
  a[0] *= s;
  a[1] *= s;
  a[2] *= s;
}
function fract1(x: number): number {
  return x - Math.floor(x);
}

/**
 * Ohrenschneiden für einfache Polygone (2D, beliebige Windung): liefert Dreiecke als Index-Tripel. O(n²), reicht für
 * Grundrisse mit ≤ 40 Ecken.
 */
export function earClip(poly: ReadonlyArray<readonly [number, number]>): Array<[number, number, number]> {
  const n = poly.length;
  const out: Array<[number, number, number]> = [];
  if (n < 3) return out;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % n]!;
    area += p[0] * q[1] - q[0] * p[1];
  }
  const ccw = area > 0;
  const idx = Array.from({ length: n }, (_, i) => i);
  const cross2 = (a: readonly [number, number], b: readonly [number, number], c: readonly [number, number]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inTri = (p: readonly [number, number], a: readonly [number, number], b: readonly [number, number], c: readonly [number, number]) => {
    const d1 = cross2(a, b, p);
    const d2 = cross2(b, c, p);
    const d3 = cross2(c, a, p);
    return ccw ? d1 >= 0 && d2 >= 0 && d3 >= 0 : d1 <= 0 && d2 <= 0 && d3 <= 0;
  };
  let guard = n * n;
  while (idx.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const ia = idx[(k + idx.length - 1) % idx.length]!;
      const ib = idx[k]!;
      const ic = idx[(k + 1) % idx.length]!;
      const a = poly[ia]!;
      const b = poly[ib]!;
      const c = poly[ic]!;
      const cr = cross2(a, b, c);
      if (ccw ? cr <= 1e-12 : cr >= -1e-12) continue; // spiegelnde Ecke
      let inside = false;
      for (const j of idx) {
        if (j === ia || j === ib || j === ic) continue;
        if (inTri(poly[j]!, a, b, c)) {
          inside = true;
          break;
        }
      }
      if (inside) continue;
      out.push([ia, ib, ic]);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) out.push([idx[0]!, idx[1]!, idx[2]!]);
  else if (idx.length > 3) for (let k = 1; k + 1 < idx.length; k++) out.push([idx[0]!, idx[k]!, idx[k + 1]!]);
  return out;
}
/** Dreieck mit Windung passend zur Normale (gegen den Uhrzeigersinn von außen). */
function tri(idx: number[], pos: number[], a: number, b: number, c: number, n: readonly number[]): void {
  const ax = pos[a * 3]!;
  const ay = pos[a * 3 + 1]!;
  const az = pos[a * 3 + 2]!;
  const ux = pos[b * 3]! - ax;
  const uy = pos[b * 3 + 1]! - ay;
  const uz = pos[b * 3 + 2]! - az;
  const vx = pos[c * 3]! - ax;
  const vy = pos[c * 3 + 1]! - ay;
  const vz = pos[c * 3 + 2]! - az;
  const cx = uy * vz - uz * vy;
  const cy = uz * vx - ux * vz;
  const cz = ux * vy - uy * vx;
  if (cx * n[0]! + cy * n[1]! + cz * n[2]! >= 0) idx.push(a, b, c);
  else idx.push(a, c, b);
}

export type { RockColumn };
