import { centroid, distanceToPolygonEdge, pointInPolygon, polygonArea, regularPolygon, type Poly } from './geometry';
import { BORDER_MARGIN, pathDistance, placementCandidate, regionHalfWidth, type PlaneFeatureHost, type RegionSite } from './host';
import { isFree, type Occupied } from './lakes';
import { buildMonolith } from './monolith';
import type { LedgeAnchor, RockColumn, RockFormation, RockKind, RockSpec } from './types';

/**
 * Felsformationen nach Earle auf der Ebene (Port der Kugel-Version): Basaltsäulen-Stufen mit Moosbänken, Turm-Monolith,
 * schräger Tafelfels, Felsnadeln und die riesige Felswand am Regionsrand. Grundrisse relativ zum Formationsmittelpunkt
 * (a = x, b = z), Höhen absolut. Die Schauseite zeigt zum Pfad (Pfadregionen) bzw. zum Bildfokus (Seitenzellen).
 */

/** Versenkung der Säulenfüße unter den tiefsten Geländepunkt ihres Grundrisses (nichts schwebt). */
const SINK = 0.55;
const TERRACE_DEPTH = 0.44;
const WALL_SEGMENT = 5.2;

interface Frame {
  cx: number;
  cz: number;
}

interface Built {
  columns: RockColumn[];
  ledges: Array<{ x: number; y: number; z: number; step: number; radius: number }>;
  footprint: number;
}

interface ColumnOpts {
  taper?: number;
  bevel?: number;
  apex?: number;
  apexOffset?: [number, number];
  tilt?: [number, number];
  capStyle?: number;
  tier?: number;
  part?: number;
}

function column(poly: Poly, base: number, top: number, o: ColumnOpts = {}): RockColumn {
  const [cx, cy] = centroid(poly);
  let r = 0;
  for (const [x, y] of poly) r = Math.max(r, Math.hypot(x - cx, y - cy));
  return {
    polygon: poly,
    cx,
    cy,
    r,
    base,
    top,
    taper: o.taper ?? 1,
    bevel: o.bevel ?? 0,
    apex: o.apex ?? 0,
    apexOffset: o.apexOffset ?? [0, 0],
    tilt: o.tilt ?? [0, 0],
    capStyle: o.capStyle ?? 0,
    tier: o.tier ?? 0,
    part: o.part ?? 0,
  };
}

/** Höhe der Deckfläche einer Säule an (a, b) (Neigung eingerechnet). */
export function columnTopAt(c: RockColumn, a: number, b: number): number {
  return c.top + c.tilt[0] * (a - c.cx) + c.tilt[1] * (b - c.cy);
}

/** Höchster Punkt einer Säule (Deckfläche inkl. Neigung und Spitze). */
export function columnPeak(c: RockColumn): number {
  let hi = c.top;
  for (const [x, y] of c.polygon) hi = Math.max(hi, columnTopAt(c, c.cx + (x - c.cx) * c.taper, c.cy + (y - c.cy) * c.taper));
  return hi + c.apex;
}

function lateralReachOf(kind: RockKind, size: number): number {
  switch (kind) {
    case 'terraces':
    case 'wall':
      return size * TERRACE_DEPTH * 0.5 + 0.35;
    case 'tower':
      return size * 0.5 * 1.9 + 0.3;
    case 'mesa':
      return size * 0.44;
    case 'spires':
      return size * 0.62;
    case 'monolith':
      return size * 0.62;
  }
}

/** Schauseite (Einheitsvektor in (a, b)): Pfadregion → zum Rückgrat, Seitenzelle → zum Bildfokus bzw. zur Kamera (+z). */
function frontOf(host: PlaneFeatureHost, site: RegionSite, f: Frame): [number, number] {
  if (site.region.kind === 'path') {
    const dx = host.backbone(f.cz) - f.cx;
    return Math.abs(dx) < 0.3 ? [0, 1] : [Math.sign(dx), 0];
  }
  const dx = site.focus[0] - f.cx;
  const dz = site.focus[1] - f.cz;
  const l = Math.hypot(dx, dz);
  return l < 2 ? [0, 1] : [dx / l, dz / l];
}

function fitsRegion(host: PlaneFeatureHost, site: RegionSite, f: Frame, columns: RockColumn[], minPath: number): boolean {
  const key = site.region.key;
  for (const c of columns) {
    for (let i = 0; i < c.polygon.length; i += 2) {
      const [a, b] = c.polygon[i]!;
      const x = f.cx + a;
      const z = f.cz + b;
      if (host.regionKeyAt(x, z) !== key) return false;
      // Rand zur Grenze: auch die Nachbarpunkte um die Ecke liegen in der Region
      for (const [ox, oz] of [[BORDER_MARGIN * 0.8, 0], [-BORDER_MARGIN * 0.8, 0], [0, BORDER_MARGIN * 0.8], [0, -BORDER_MARGIN * 0.8]] as const) {
        if (host.regionKeyAt(x + ox, z + oz) !== key) return false;
      }
      if (site.region.kind === 'path' && minPath > 0 && pathDistance(host, x, z) < minPath) return false;
    }
  }
  return true;
}

function ground(host: PlaneFeatureHost, f: Frame, a: number, b: number): number {
  return host.baseHeightAt(f.cx + a, f.cz + b);
}

function footBase(host: PlaneFeatureHost, f: Frame, poly: Poly): number {
  let lo = Infinity;
  for (const [a, b] of poly) lo = Math.min(lo, ground(host, f, a, b));
  const [ca, cb] = centroid(poly);
  lo = Math.min(lo, ground(host, f, ca, cb));
  return lo - SINK;
}

/** Gerippte Felsstufen (Ebene_12, Ebene_7): Blöcke mit gefalteter Front, Moosbänke als Anker. */
function buildTerraces(
  host: PlaneFeatureHost,
  f: Frame,
  front: [number, number],
  size: number,
  height: number,
  steps: number,
  rand: () => number,
  opts: { rubble?: boolean; depth?: number; blocks?: [number, number]; jitter?: number } = {},
): Built {
  const L = size;
  const D = opts.depth ?? size * TERRACE_DEPTH;
  const [fx, fy] = front;
  const gx = -fy;
  const gy = fx;
  const toLocal = (a: number, b: number): [number, number] => [gx * a - fx * (b - D * 0.5), gy * a - fy * (b - D * 0.5)];
  const stepDepth = D / steps;
  const z0 = ground(host, f, 0, 0);
  const stepH = height / steps;
  const stepTop = (s: number): number => z0 + stepH * (s + 1);
  const columns: RockColumn[] = [];
  const ledges: Built['ledges'] = [];
  const rib = 0.6;
  const endR = 3;
  for (let s = 0; s < steps; s++) {
    const b0 = s * stepDepth;
    const b1 = s === steps - 1 ? D : (s + 1) * stepDepth + stepDepth * 0.35;
    const half0 = (L / 2) * (1 - 0.34 * (s / steps) ** 1.5) * (0.94 + 0.06 * rand());
    const half1 = half0 * (0.9 - 0.1 * rand());
    const cuts = [-half0];
    const [bw0, bw1] = opts.blocks ?? [1.1, 2.3];
    while (cuts[cuts.length - 1]! < half0 - bw0 * 1.4) cuts.push(cuts[cuts.length - 1]! + bw0 + rand() * (bw1 - bw0));
    cuts[cuts.length - 1] = half0;
    let bestLedge: { x: number; y: number; z: number; d: number } | null = null;
    for (let k = 0; k + 1 < cuts.length; k++) {
      const aL = cuts[k]!;
      const aR = cuts[k + 1]!;
      const first = k === 0;
      const last = k + 2 === cuts.length;
      const n = Math.max(2, Math.round((aR - aL) / rib));
      const ribs: Array<{ t: number; b: number }> = [];
      for (let i = 0; i <= n; i++) {
        const inner = i > 0 && i < n;
        const t = (i + (inner ? (rand() - 0.5) * 0.3 : 0)) / n;
        const gully = inner && rand() < 0.12;
        const out = (i + k) % 2 === 0 ? 0.16 + rand() * 0.08 : 0.02 + rand() * 0.04;
        ribs.push({ t, b: gully ? 0.28 : 0.2 - out });
      }
      const outline = (inset: number): Poly => {
        const h0 = half0 - inset;
        const h1 = half1 - inset;
        const l = first ? -h0 : aL + inset * 0.5;
        const r = last ? h0 : aR - inset * 0.5;
        const poly: Poly = [];
        for (const rb of ribs) poly.push(toLocal(l + (r - l) * rb.t, b0 + rb.b + inset));
        if (last) {
          for (let q = 1; q <= endR; q++) {
            const t = q / (endR + 1);
            const ang = t * Math.PI * 0.5;
            poly.push(toLocal(h0 + (h1 - h0) * t + Math.sin(ang) * 0.25 * (1 - t), b0 + inset + (b1 - b0 - inset) * (1 - Math.cos(ang))));
          }
          poly.push(toLocal(h1, b1));
        } else poly.push(toLocal(r * (half1 / half0), b1));
        if (first) {
          poly.push(toLocal(-h1, b1));
          for (let q = endR; q >= 1; q--) {
            const t = q / (endR + 1);
            const ang = t * Math.PI * 0.5;
            poly.push(toLocal(-(h0 + (h1 - h0) * t + Math.sin(ang) * 0.25 * (1 - t)), b0 + inset + (b1 - b0 - inset) * (1 - Math.cos(ang))));
          }
        } else poly.push(toLocal(l * (half1 / half0), b1));
        return poly;
      };
      const batter = Math.min(0.42, stepH * 0.22);
      const bevel = 0.14;
      let poly = outline(0);
      let shoulder = outline(batter);
      let cap = outline(batter + bevel);
      if (polygonArea(poly) < 0) {
        poly = poly.reverse();
        shoulder = shoulder.reverse();
        cap = cap.reverse();
      }
      const mid = (aL + aR) * 0.5;
      const endDrop = (first || last ? 0.28 : 0) * stepH;
      const jit = opts.jitter ?? 0.32;
      const top = stepTop(s) - endDrop + (rand() - 0.5) * jit * stepH + (rand() < 0.18 ? jit * 0.7 * stepH : 0);
      const slope = (rand() - 0.5) * 0.14;
      const tilt: [number, number] = [gx * slope, gy * slope];
      const col = column(poly, footBase(host, f, poly), top, { bevel, tier: s, tilt });
      col.shoulder = shoulder;
      col.cap = cap;
      columns.push(col);
      const [lx, ly] = toLocal(mid, b0 + Math.min(stepDepth * 0.62, stepDepth - 0.35));
      const d = Math.abs(mid);
      if (!bestLedge || d < bestLedge.d) bestLedge = { x: lx, y: ly, z: columnTopAt(col, lx, ly), d };
    }
    if (bestLedge) ledges.push({ x: bestLedge.x, y: bestLedge.y, z: bestLedge.z, step: s, radius: Math.min(stepDepth * 0.42, 0.8) });
  }
  if (opts.rubble !== false) {
    const rubble = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < rubble; i++) {
      const a = (rand() - 0.5) * L * 0.8;
      const b = -0.4 - rand() * 0.5;
      const [px, py] = toLocal(a, b);
      const poly = regularPolygon(px, py, 0.25 + rand() * 0.18, 5 + Math.floor(rand() * 2), rand() * Math.PI);
      const top = ground(host, f, px, py) + (height / steps) * (0.2 + rand() * 0.25);
      columns.push(column(poly, footBase(host, f, poly), top, { taper: 0.8, part: 3, capStyle: 1 }));
    }
  }
  let footprint = 0;
  for (const c of columns) footprint = Math.max(footprint, Math.hypot(c.cx, c.cy) + c.r);
  return { columns, ledges, footprint };
}

function chamferedRect(g: [number, number], fr: [number, number], a: number, b: number, c: number): Poly {
  const pts: Array<[number, number]> = [
    [a, b * (1 - c)],
    [a * (1 - c), b],
    [-a * (1 - c), b],
    [-a, b * (1 - c)],
    [-a, -b * (1 - c)],
    [-a * (1 - c), -b],
    [a * (1 - c), -b],
    [a, -b * (1 - c)],
  ];
  const poly: Poly = pts.map(([u, v]) => [g[0] * u + fr[0] * v, g[1] * u + fr[1] * v]);
  if (polygonArea(poly) < 0) poly.reverse();
  return poly;
}

/** Turm-Monolith (Ebene_44/45): Sockel, Plattform (Anker), verjüngter Schaft, Krone. */
function buildTower(host: PlaneFeatureHost, f: Frame, front: [number, number], size: number, height: number, rand: () => number): Built {
  const W = size * 0.5;
  const fr: [number, number] = [front[0], front[1]];
  const g: [number, number] = [-front[1], front[0]];
  const z0 = ground(host, f, 0, 0);
  const columns: RockColumn[] = [];
  const ledges: Built['ledges'] = [];
  const base = chamferedRect(g, fr, W * 3.2, W * 1.9, 0.3 + rand() * 0.15);
  const baseTop = z0 + height * 0.14;
  columns.push(column(base, footBase(host, f, base), baseTop, { taper: 0.6, tier: 0, part: 1, capStyle: 1 }));
  const plat = chamferedRect(g, fr, W * 2.0, W * 1.2, 0.2);
  const platTop = baseTop + height * 0.045;
  columns.push(column(plat, baseTop - 0.3, platTop, { taper: 0.98, tier: 1, part: 1, capStyle: 1 }));
  const end = rand() < 0.5 ? 1 : -1;
  ledges.push({ x: g[0] * W * 1.5 * end, y: g[1] * W * 1.5 * end, z: platTop, step: 0, radius: W * 0.42 });
  const shaft = regularPolygon(0, 0, W * Math.SQRT2, 4, Math.atan2(fr[1], fr[0]) + Math.PI / 4 + (rand() - 0.5) * 0.2);
  columns.push(column(shaft, platTop - 0.3, z0 + height * 0.93, { taper: 0.66 }));
  const crown = regularPolygon(0, 0, W * Math.SQRT2 * 0.6, 4, Math.atan2(fr[1], fr[0]) + Math.PI / 4);
  columns.push(column(crown, z0 + height * 0.9, z0 + height, { taper: 0.88, part: 2, capStyle: 1 }));
  let footprint = 0;
  for (const c of columns) footprint = Math.max(footprint, Math.hypot(c.cx, c.cy) + c.r);
  return { columns, ledges, footprint };
}

/**
 * Schräger Tafelfels (Ebene_27): gelehnte Platten, deren Oberseite als steile Rampe zur Kamera hin abfällt (die Karte
 * blickt entlang −z, die Sonne steht rechts vorn); gestaffelte Platten, davor ein Sockelstein (Anker). Gebaut im alten
 * Rahmen (x Ost = Blickrichtung, y Nord = links) und in die Ebene gedreht: a = −y, b = −x.
 */
function buildMesa(host: PlaneFeatureHost, f: Frame, size: number, height: number, rand: () => number): Built {
  const L = size * 0.5;
  const D = size * 0.19;
  const z0 = ground(host, f, 0, 0);
  const toPlane = (p: Poly): Poly => {
    const out: Poly = p.map(([x, y]) => [-y, -x]);
    if (polygonArea(out) < 0) out.reverse();
    return out;
  };
  const slab = (cx: number, cy: number, l: number, d: number): Poly => [
    [cx + d * 0.55, cy - l],
    [cx + d * (0.95 + rand() * 0.05), cy - l * 0.1],
    [cx + d, cy + l * 0.94],
    [cx + d * 0.8, cy + l],
    [cx - d * 0.85, cy + l],
    [cx - d, cy + l * 0.9],
    [cx - d * (0.92 + rand() * 0.08), cy - l * 0.3],
    [cx - d * 0.5, cy - l],
  ];
  const columns: RockColumn[] = [];
  const plates = [
    { x: 0, y: 0, l: L, d: D, h: 1.0 },
    { x: -D * 1.25, y: -L * 0.3, l: L * 0.76, d: D * 0.8, h: 0.68 },
    { x: -D * 2.3, y: -L * 0.55, l: L * 0.55, d: D * 0.65, h: 0.42 },
  ];
  const nPlates = rand() < 0.3 ? 2 : 3;
  for (let k = 0; k < nPlates; k++) {
    const pl = plates[k]!;
    const poly = toPlane(slab(pl.x, pl.y, pl.l, pl.d));
    const hMax = height * pl.h * (0.94 + rand() * 0.1);
    const s = (hMax - 0.35) / (2 * pl.l);
    // alter Rahmen: tilt = [dh/dx, dh/dy] = [−0.06, s] → Ebene: dh/da = −dh/dy, dh/db = −dh/dx
    const tilt: [number, number] = [-s, 0.06];
    columns.push(column(poly, footBase(host, f, poly), z0 + (hMax + 0.35) * 0.5, { taper: 0.98, tilt, capStyle: 1, tier: k, part: k === 0 ? 0 : 3 }));
  }
  const px = -D * (nPlates === 3 ? 3.4 : 2.3);
  const py = -L * 0.05;
  const ped = regularPolygon(-py, -px, 0.75 + rand() * 0.2, 7, rand() * Math.PI);
  const pedTop = ground(host, f, -py, -px) + height * 0.16;
  columns.push(column(ped, footBase(host, f, ped), pedTop, { taper: 0.9, tier: 0, part: 3, bevel: 0.08 }));
  const ledges: Built['ledges'] = [{ x: -py, y: -px, z: pedTop, step: 0, radius: 0.5 }];
  let footprint = 0;
  for (const c of columns) footprint = Math.max(footprint, Math.hypot(c.cx, c.cy) + c.r);
  return { columns, ledges, footprint };
}

/** Felsnadeln (Ebene_46, Ebene_7): 4–7 schiefe, scharf facettierte Nadeln, die mittleren am höchsten. */
function buildSpires(host: PlaneFeatureHost, f: Frame, size: number, height: number, rand: () => number): Built {
  const n = 4 + Math.floor(rand() * 4);
  const columns: RockColumn[] = [];
  const lean = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const d = i === 0 ? 0 : size * 0.5 * Math.sqrt(0.2 + 0.8 * rand());
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const rr = (0.42 + rand() * 0.4) * (1 - (0.4 * d) / Math.max(1e-3, size * 0.5));
    const poly = regularPolygon(x, y, rr, 4 + Math.floor(rand() * 2), rand() * Math.PI);
    const h = height * (1 - (d / Math.max(1e-3, size * 0.5)) * 0.5) * (0.72 + rand() * 0.28);
    const body = h * 0.58;
    const tip = h - body;
    const leanR = rr * (0.25 + rand() * 0.3);
    const la = lean + (rand() - 0.5) * 0.8;
    columns.push(
      column(poly, footBase(host, f, poly), ground(host, f, x, y) + body, {
        taper: 0.5 + rand() * 0.12,
        apex: tip,
        apexOffset: [Math.cos(la) * leanR, Math.sin(la) * leanR],
        capStyle: 1,
      }),
    );
  }
  let footprint = 0;
  for (const c of columns) footprint = Math.max(footprint, Math.hypot(c.cx, c.cy) + c.r);
  return { columns, ledges: [], footprint };
}

function pushLedges(host: PlaneFeatureHost, out: LedgeAnchor[], built: Built, world: number, region: string, id: string, kind: RockKind, f: Frame): void {
  for (let li = 0; li < built.ledges.length; li++) {
    const l = built.ledges[li]!;
    const x = f.cx + l.x;
    const z = f.cz + l.y;
    out.push({
      id: `${id}-ledge${li}`,
      world,
      region,
      formation: id,
      kind,
      step: l.step,
      position: [x, l.z, z],
      normal: [0, 1, 0],
      height: l.z,
      radius: l.radius,
      pathDistance: pathDistance(host, x, z),
    });
  }
}

/** Felswand längs des Regionsrands (Kulisse): Segmente je ~5 Einheiten, Stufen steigen zum Rand an. */
function buildWall(host: PlaneFeatureHost, site: RegionSite, world: number, spec: RockSpec, id: string, rand: () => number, occupied: Occupied[]): { formations: RockFormation[]; ledges: LedgeAnchor[] } | null {
  const onPath = site.region.kind === 'path';
  const length = spec.size[0] + (spec.size[1] - spec.size[0]) * rand();
  const height = spec.height[0] + (spec.height[1] - spec.height[0]) * rand();
  const steps = Math.max(1, spec.steps ?? 2);
  const seg = site.segment;
  const zHi = onPath && seg ? seg.zStart : site.focus[1] + site.cellRadius;
  const zLo = onPath && seg ? seg.zEnd : site.focus[1] - site.cellRadius;
  const segs = Math.max(2, Math.round(length / WALL_SEGMENT));
  for (let tries = 0; tries < 24; tries++) {
    let zMid: number;
    if (onPath && !spec.focusDistance) zMid = zLo + (zHi - zLo) * (0.15 + 0.7 * rand());
    else {
      const [dMin, dMax] = spec.focusDistance ?? [0, 8];
      zMid = site.focus[1] + (dMin + (dMax - dMin) * rand()) * (rand() < 0.5 ? -1 : 1);
    }
    const zA = zMid + length / 2;
    const zB = zMid - length / 2;
    if (zA > zHi - 0.5 || zB < zLo + 0.5) continue;
    const sgn = spec.side ?? (site.region.kind === 'cell' ? (site.region.c > 0 ? 1 : -1) : rand() < 0.5 ? 1 : -1);
    const formations: RockFormation[] = [];
    const ledges: LedgeAnchor[] = [];
    const minPath = onPath ? 2.2 : 0;
    for (let j = 0; j < segs; j++) {
      const t = (j + 0.5) / segs;
      const z = zA + (zB - zA) * t;
      const half = regionHalfWidth(host, site, z);
      const depth = Math.min(3.6, Math.max(2.2, half * 0.34));
      const h = height * (0.55 + 0.45 * Math.sin(Math.PI * t)) * (0.85 + 0.3 * rand());
      for (let inset = 0; inset <= 2.4; inset += 0.6) {
        const lateral = sgn * (half - BORDER_MARGIN - depth * 0.55 - 0.3 - inset);
        if (onPath && Math.abs(lateral) - depth * 0.5 < minPath) break;
        const x0 = onPath ? host.backbone(z) : site.focus[0];
        const f: Frame = { cx: x0 + lateral, cz: z };
        if (host.regionKeyAt(f.cx, f.cz) !== site.region.key || !isFree(occupied, f.cx, f.cz, WALL_SEGMENT * 0.45, 0.2)) continue;
        const front = onPath ? frontOf(host, site, f) : ([-sgn, 0] as [number, number]);
        const built = buildTerraces(host, f, front, WALL_SEGMENT * 1.04, h, steps, rand, { rubble: !onPath && j % 2 === 0, depth, blocks: [2.2, 3.6], jitter: 0.16 });
        if (built.columns.length === 0 || !fitsRegion(host, site, f, built.columns, minPath)) continue;
        const segId = `${id}-seg${j}`;
        let top = -Infinity;
        for (const col of built.columns) top = Math.max(top, columnPeak(col));
        formations.push({ id: segId, world, region: site.region.key, kind: 'wall', cx: f.cx, cz: f.cz, columns: built.columns, footprint: built.footprint, height: top, variant: rand() });
        pushLedges(host, ledges, built, world, site.region.key, segId, 'wall', f);
        break;
      }
    }
    if (formations.length < Math.max(2, Math.ceil(segs * 0.6))) continue;
    for (const f of formations) occupied.push({ x: f.cx, z: f.cz, radius: f.footprint });
    return { formations, ledges };
  }
  return null;
}

/**
 * Monolith (Ebene 45) im Bildfokus der Region (Fokus-Slot der Welt, sonst die Mitte), ganz in der Region; gelingt es
 * dort nicht, rückt er in kleinen Schritten zur Regionsmitte bzw. vom Pfad weg.
 */
function placeMonolith(host: PlaneFeatureHost, site: RegionSite, world: number, spec: RockSpec, id: string, rand: () => number, occupied: Occupied[]): { formation: RockFormation; ledges: LedgeAnchor[] } | null {
  const size = spec.size[0] + (spec.size[1] - spec.size[0]) * rand();
  const height = spec.height[0] + (spec.height[1] - spec.height[0]) * rand();
  const [fx, fz] = site.focus;
  const minPath = (spec.pathDistance?.[0] ?? 2) * 0.75;
  const away = site.region.kind === 'path' ? Math.sign(fx - host.backbone(fz)) || 1 : 0;
  for (let t = 0; t < 12; t++) {
    const f: Frame = { cx: fx + away * t * 0.6, cz: fz + (t % 2 === 0 ? 1 : -1) * Math.floor((t + 1) / 2) * 0.8 };
    const built = buildMonolith(host, f.cx, f.cz, size, height, rand);
    if (!fitsRegion(host, site, f, built.columns, minPath)) continue;
    if (!isFree(occupied, f.cx, f.cz, built.footprint * 0.8, 0.5)) continue;
    let top = -Infinity;
    for (const col of built.columns) top = Math.max(top, columnPeak(col));
    const formation: RockFormation = { id, world, region: site.region.key, kind: 'monolith', cx: f.cx, cz: f.cz, columns: built.columns, footprint: built.footprint, height: top, variant: rand(), ground: built.ground };
    occupied.push({ x: f.cx, z: f.cz, radius: built.footprint });
    const ledges: LedgeAnchor[] = [];
    pushLedges(host, ledges, { columns: built.columns, ledges: built.ledges, footprint: built.footprint }, world, site.region.key, id, 'monolith', f);
    return { formation, ledges };
  }
  return null;
}

/**
 * Felsformationen einer Region nach Spezifikation: neben dem Pfad (Pfadregionen, Frontkante im Abstand
 * `pathDistance`) bzw. um den Bildfokus (Seitenzellen), ganz in der Region, frei von Seen und anderen Formationen.
 */
export function generateRocks(host: PlaneFeatureHost, site: RegionSite, world: number, specs: readonly RockSpec[], rand: () => number, occupied: Occupied[]): { formations: RockFormation[]; ledges: LedgeAnchor[] } {
  const formations: RockFormation[] = [];
  const ledges: LedgeAnchor[] = [];
  let counter = 0;
  for (const spec of specs) {
    const minPath = (spec.pathDistance?.[0] ?? 2) * 0.75;
    for (let n = 0; n < spec.count; n++) {
      if (spec.kind === 'monolith') {
        const m = placeMonolith(host, site, world, spec, `${site.region.key}-monolith-${counter++}`, rand, occupied);
        if (m) {
          formations.push(m.formation);
          ledges.push(...m.ledges);
        }
        continue;
      }
      if (spec.kind === 'wall') {
        const wall = buildWall(host, site, world, spec, `${site.region.key}-wall-${counter++}`, rand, occupied);
        if (wall) {
          formations.push(...wall.formations);
          ledges.push(...wall.ledges);
        }
        continue;
      }
      let placed = false;
      for (let tries = 0; tries < 80 && !placed; tries++) {
        const size = spec.size[0] + (spec.size[1] - spec.size[0]) * rand();
        const height = spec.height[0] + (spec.height[1] - spec.height[0]) * rand();
        const reach = lateralReachOf(spec.kind, size);
        const c = placementCandidate(host, site, spec, reach, rand);
        if (!c) continue;
        if (!isFree(occupied, c[0], c[1], reach, 1.2)) continue;
        const f: Frame = { cx: c[0], cz: c[1] };
        const front = frontOf(host, site, f);
        const built =
          spec.kind === 'terraces'
            ? buildTerraces(host, f, front, size, height, Math.max(2, spec.steps ?? 3), rand)
            : spec.kind === 'tower'
              ? buildTower(host, f, front, size, height, rand)
              : spec.kind === 'mesa'
                ? buildMesa(host, f, size, height, rand)
                : buildSpires(host, f, size, height, rand);
        if (built.columns.length === 0) continue;
        if (!fitsRegion(host, site, f, built.columns, minPath)) continue;
        if (!isFree(occupied, c[0], c[1], built.footprint * 0.8, 1.0)) continue;
        const id = `${site.region.key}-${spec.kind}-${counter++}`;
        let top = -Infinity;
        for (const col of built.columns) top = Math.max(top, columnPeak(col));
        formations.push({ id, world, region: site.region.key, kind: spec.kind, cx: f.cx, cz: f.cz, columns: built.columns, footprint: built.footprint, height: top, variant: rand() });
        occupied.push({ x: f.cx, z: f.cz, radius: built.footprint });
        pushLedges(host, ledges, built, world, site.region.key, id, spec.kind, f);
        placed = true;
      }
    }
  }
  return { formations, ledges };
}

/** Säule einer Formation an einem Punkt (mit Rand `margin`), die höchste getroffene, oder null. */
export function columnAt(f: RockFormation, x: number, z: number, margin: number): RockColumn | null {
  const a = x - f.cx;
  const b = z - f.cz;
  if (Math.hypot(a, b) > f.footprint + margin) return null;
  let best: RockColumn | null = null;
  let bestTop = -Infinity;
  for (const c of f.columns) {
    if (Math.hypot(a - c.cx, b - c.cy) > c.r + margin) continue;
    const hit = margin > 0 ? pointInPolygon(c.polygon, a, b) || distanceToPolygonEdge(c.polygon, a, b) < margin : pointInPolygon(c.polygon, a, b);
    if (!hit) continue;
    const top = columnTopAt(c, a, b);
    if (top > bestTop) {
      bestTop = top;
      best = c;
    }
  }
  return best;
}
