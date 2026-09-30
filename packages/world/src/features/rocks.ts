import type { Vec3 } from '../capPatch';
import { centroid, distanceToPolygonEdge, framePoint, frameAt, groundZ, localOf, offsetDir, pointInPolygon, polygonArea, regularPolygon, type Poly } from './geometry';
import { BORDER_MARGIN, bandDistance, bandHalfWidth, bandPoint, nearestSpiralS, pathDistance, placementCandidate, sPerUnit, spiralDir, spiralRangeFor, spiralS, type FeatureHost } from './host';
import { isFree, type Occupied } from './lakes';
import type { FeatureFrame, LedgeAnchor, RockColumn, RockFormation, RockKind, RockSpec } from './types';

/** Versenkung der Säulenfüße unter den tiefsten Geländepunkt ihres Grundrisses (nichts schwebt). */
const SINK = 0.55;
/** Tiefe der Terrassen relativ zur Frontlänge. */
const TERRACE_DEPTH = 0.44;
/** Länge eines Wandsegments (Welteinheiten). */
const WALL_SEGMENT = 5.2;

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

/** Höhe der Deckfläche einer Säule an (x, y) (Rahmen-z, Neigung eingerechnet). */
export function columnTopAt(c: RockColumn, x: number, y: number): number {
  return c.top + c.tilt[0] * (x - c.cx) + c.tilt[1] * (y - c.cy);
}

/** Höchster Punkt einer Säule (Deckfläche inkl. Neigung und Spitze). */
export function columnPeak(c: RockColumn): number {
  let hi = c.top;
  for (const [x, y] of c.polygon) hi = Math.max(hi, columnTopAt(c, c.cx + (x - c.cx) * c.taper, c.cy + (y - c.cy) * c.taper));
  return hi + c.apex;
}

/** Seitliche Ausdehnung (quer zum Band) je Art bei Maß `size` (für die Platzierung vor dem Bau). */
function lateralReachOf(kind: RockKind, size: number): number {
  switch (kind) {
    case 'terraces':
    case 'wall':
      return size * TERRACE_DEPTH * 0.5 + 0.35;
    case 'tower':
      return size * 1.1;
    case 'mesa':
      return size * 0.45;
    case 'spires':
      return size * 0.62;
  }
}

/**
 * Richtung zur Bandmitte im lokalen Rahmen (nahe Welten: der Pfad, ferne Welten: die Mitte ihres Bands) — dorthin zeigt
 * die Schauseite der Formation (Terrassen steigen vom Pfad weg an, Sockelstufen und Anker liegen auf dieser Seite).
 */
function frontOf(host: FeatureHost, world: number, frame: FeatureFrame): [number, number] {
  const R = host.radius;
  const xy: [number, number] = [0, 0];
  const far = host.worldSide(world) === 'far';
  const target = spiralDir(host, nearestSpiralS(host, frame.c, far), [0, 0, 0], far);
  if (!localOf(frame, R, target[0], target[1], target[2], xy) || Math.hypot(xy[0], xy[1]) < 0.3) return frame.c[1] >= 0 ? [0, -1] : [0, 1];
  const l = Math.hypot(xy[0], xy[1]);
  return [xy[0] / l, xy[1] / l];
}

/** Liegen alle Grundrissecken im Band der Welt (Abstand zum Riss) und außerhalb des Pfadkorridors? */
function fitsBand(host: FeatureHost, world: number, frame: FeatureFrame, columns: RockColumn[], minPath: number): boolean {
  const far = host.worldSide(world) === 'far';
  const half = bandHalfWidth(host, far ? 'far' : 'near');
  const p: Vec3 = [0, 0, 0];
  for (const c of columns) {
    for (let i = 0; i < c.polygon.length; i += 2) {
      const [x, y] = c.polygon[i]!;
      offsetDir(frame, host.radius, x, y, p);
      if (host.worldAt(p[0], p[1], p[2]) !== world) return false;
      if (bandDistance(host, p[0], p[1], p[2], far) > half - BORDER_MARGIN * 0.8) return false;
      if (!far && pathDistance(host, p[0], p[1], p[2]) < minPath) return false;
    }
  }
  return true;
}

/** Höhe (Rahmen-z) des Geländes an einer lokalen Stelle. */
function ground(host: FeatureHost, frame: FeatureFrame, x: number, y: number): number {
  const d = offsetDir(frame, host.radius, x, y);
  return groundZ(host.radius, x, y, host.baseHeightAt(d[0], d[1], d[2]));
}

/** Tiefster Geländepunkt unter einem Grundriss (Ecken + Mitte), minus Versenkung. */
function footBase(host: FeatureHost, frame: FeatureFrame, poly: Poly): number {
  let lo = Infinity;
  for (const [x, y] of poly) lo = Math.min(lo, ground(host, frame, x, y));
  const [cx, cy] = centroid(poly);
  lo = Math.min(lo, ground(host, frame, cx, cy));
  return lo - SINK;
}

/**
 * Gerippte Felsstufen (Ebene_12, Ebene_7): jede Stufe ein massiver Block mit gefalteter Front — Säulenrippen im
 * Abstand ~0.6 treten abwechselnd vor und zurück, hin und wieder eine tiefe Rinne; jede Rippe fängt das Streiflicht
 * anders (senkrechte Wertstreifen wie Earles kannelierte Felswände). Stufen steigen von der Front weg an, Deckflächen
 * sind durchgehende Moosbänke (Anker für Levelknoten), Enden abgerundet. Davor ein paar Geröllstümpfe.
 */
function buildTerraces(
  host: FeatureHost,
  frame: FeatureFrame,
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
  // a = längs der Front, b = Tiefe (0 an der Front, D hinten)
  const toLocal = (a: number, b: number): [number, number] => [gx * a - fx * (b - D * 0.5), gy * a - fy * (b - D * 0.5)];
  const stepDepth = D / steps;
  const z0 = ground(host, frame, 0, 0);
  const stepH = height / steps;
  const stepTop = (s: number): number => z0 + stepH * (s + 1);
  const columns: RockColumn[] = [];
  const ledges: Built['ledges'] = [];
  const rib = 0.6;
  const endR = 3;
  for (let s = 0; s < steps; s++) {
    const b0 = s * stepDepth;
    const b1 = s === steps - 1 ? D : (s + 1) * stepDepth + stepDepth * 0.35; // Überlappung: keine Fuge zur nächsten Stufe
    const half0 = (L / 2) * (1 - 0.34 * (s / steps) ** 1.5) * (0.94 + 0.06 * rand());
    const half1 = half0 * (0.9 - 0.1 * rand());
    // Blöcke längs der Front (1.1–2.3 breit) mit eigener Höhe: unruhige Oberkante wie Orgelpfeifen (Ebene_12)
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
      // Rippen einmal auswürfeln, dann drei Ringe daraus bauen (Fuß, Wandoberkante, Deckfläche) — Ecke für Ecke
      // zugeordnet, ohne allgemeines Polygon-Versetzen (keine Selbstüberschneidungen an den Rippen)
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
        // Schnittkanten zwischen Blöcken nur halb einrücken: schmale Kerben zwischen den Blöcken
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
      // Höhe: Enden niedriger, Mitte mit Ausreißern nach oben/unten; Oberkante leicht geneigt
      const mid = (aL + aR) * 0.5;
      const endDrop = (first || last ? 0.28 : 0) * stepH;
      const jit = opts.jitter ?? 0.32;
      const top = stepTop(s) - endDrop + (rand() - 0.5) * jit * stepH + (rand() < 0.18 ? jit * 0.7 * stepH : 0);
      const slope = (rand() - 0.5) * 0.14;
      const tilt: [number, number] = [gx * slope, gy * slope];
      // Wände lehnen sich zurück (Böschung ~12°), Moosbank mit abgerundeter Kante
      const col = column(poly, footBase(host, frame, poly), top, { bevel, tier: s, tilt });
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
      const top = ground(host, frame, px, py) + (height / steps) * (0.2 + rand() * 0.25);
      columns.push(column(poly, footBase(host, frame, poly), top, { taper: 0.8, part: 3, capStyle: 1 }));
    }
  }
  let footprint = 0;
  for (const c of columns) footprint = Math.max(footprint, Math.hypot(c.cx, c.cy) + c.r);
  return { columns, ledges, footprint };
}

/** Turm-Monolith (Ebene_44/45): gestufter Sockel, verjüngter Schaft, kleine Krone. Kante zur Front. */
function buildTower(host: FeatureHost, frame: FeatureFrame, front: [number, number], size: number, height: number, rand: () => number): Built {
  const W = size * 0.5;
  const rot = Math.atan2(front[1], front[0]) + Math.PI / 4 + (rand() - 0.5) * 0.3;
  const sides = rand() < 0.75 ? 4 : 6;
  const k = sides === 4 ? Math.SQRT2 : 1.15;
  const z0 = ground(host, frame, 0, 0);
  const columns: RockColumn[] = [];
  const ledges: Built['ledges'] = [];
  const tiers = [
    { r: 2.1, h: 0.075 },
    { r: 1.68, h: 0.135 },
    { r: 1.32, h: 0.19 },
  ];
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i]!;
    const poly = regularPolygon(0, 0, W * t.r * k, sides, rot);
    const top = z0 + height * t.h;
    columns.push(column(poly, footBase(host, frame, poly), top, { taper: 0.97, tier: i, part: 1 }));
    const inner = i + 1 < tiers.length ? tiers[i + 1]!.r : 1;
    const rr = W * (t.r + inner) * 0.5 * (sides === 4 ? 1.08 : 0.95);
    ledges.push({ x: front[0] * rr, y: front[1] * rr, z: top, step: i, radius: W * (t.r - inner) * 0.55 + 0.2 });
  }
  const shaft = regularPolygon(0, 0, W * k, sides, rot);
  columns.push(column(shaft, z0 + height * tiers[tiers.length - 1]!.h - 0.3, z0 + height * 0.93, { taper: 0.72 }));
  const crown = regularPolygon(0, 0, W * k * 0.66, sides, rot);
  columns.push(column(crown, z0 + height * 0.89, z0 + height, { taper: 0.9, part: 2, capStyle: 1 }));
  return { columns, ledges, footprint: W * tiers[0]!.r * k };
}

/**
 * Schräger Tafelfels (Ebene_27): ein Felsblock, der zu einer Seite steil ansteigt — drei hintereinander gestaffelte,
 * schräg abgeschnittene Platten (hinten die höchste), stark verjüngt, jede Deckfläche eine geneigte Facette im
 * Streiflicht. Die oberste Platte trägt am flachen Ende eine kleine begehbare Kante (Anker).
 */
function buildMesa(host: FeatureHost, frame: FeatureFrame, front: [number, number], size: number, height: number, rand: () => number): Built {
  const Lh = size * 0.5;
  const Dh = size * 0.26;
  const z0 = ground(host, frame, 0, 0);
  // Längsachse quer zur Front (längs des Bands), hohe Seite zufällig
  const ax = -front[1];
  const ay = front[0];
  const hi = rand() < 0.5 ? 1 : -1;
  const shape = (cx: number, cy: number, l: number, d: number, n: number): Poly => {
    const poly: Poly = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.2;
      const rr = 0.9 + rand() * 0.16;
      // Zur hohen Seite spitz zulaufend (Keil)
      const c = Math.cos(t);
      const u = c * l * rr;
      const v = Math.sin(t) * d * rr * (1 - 0.45 * Math.max(0, c * hi));
      poly.push([cx + ax * u - front[0] * v, cy + ay * u - front[1] * v]);
    }
    if (polygonArea(poly) < 0) poly.reverse();
    return poly;
  };
  const columns: RockColumn[] = [];
  const ledges: Built['ledges'] = [];
  // Platten: hinten hoch, vorne niedriger, gegeneinander längs versetzt
  const plates = [
    { back: 0.55, along: 0.12, l: 1.0, d: 0.62, h: 1.0 },
    { back: 0.05, along: -0.1, l: 0.86, d: 0.55, h: 0.74 },
    { back: -0.5, along: -0.26, l: 0.64, d: 0.45, h: 0.46 },
  ];
  plates.forEach((pl, k) => {
    const cx = ax * pl.along * Lh * hi - front[0] * pl.back * Dh;
    const cy = ay * pl.along * Lh * hi - front[1] * pl.back * Dh;
    const l = Lh * pl.l * (0.94 + rand() * 0.12);
    const poly = shape(cx, cy, l, Dh * pl.d * 1.6, 10);
    const h = height * pl.h * (0.94 + rand() * 0.1);
    // Neigung längs: vom flachen Ende (−hi) zum hohen Ende (+hi) um 70 % der Höhe; etwas zur Front abfallend
    const s = (h * 0.7) / (2 * l);
    const tilt: [number, number] = [ax * s * hi - front[0] * 0.12, ay * s * hi - front[1] * 0.12];
    columns.push(column(poly, footBase(host, frame, poly), z0 + h * 0.62, { taper: 0.8, tilt, capStyle: 1, tier: k }));
    if (k === 0) {
      // Anker am flachen Ende der obersten Platte
      const ex = cx - ax * l * 0.45 * hi;
      const ey = cy - ay * l * 0.45 * hi;
      const col = columns[columns.length - 1]!;
      ledges.push({ x: ex, y: ey, z: columnTopAt(col, ex, ey), step: 1, radius: 0.5 });
    }
  });
  let footprint = 0;
  for (const c of columns) footprint = Math.max(footprint, Math.hypot(c.cx, c.cy) + c.r);
  return { columns, ledges, footprint };
}

/** Felsnadeln (Ebene_46, Ebene_7): 4–7 schiefe, scharf facettierte Nadeln, die mittleren am höchsten. */
function buildSpires(host: FeatureHost, frame: FeatureFrame, size: number, height: number, rand: () => number): Built {
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
      column(poly, footBase(host, frame, poly), ground(host, frame, x, y) + body, {
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

function pushLedges(out: LedgeAnchor[], built: Built, world: number, id: string, kind: RockKind, frame: FeatureFrame, R: number): void {
  for (let li = 0; li < built.ledges.length; li++) {
    const l = built.ledges[li]!;
    const position = framePoint(frame, R, l.x, l.y, l.z);
    const len = Math.hypot(position[0], position[1], position[2]) || 1;
    out.push({
      id: `${id}-ledge${li}`,
      world,
      formation: id,
      kind,
      step: l.step,
      position,
      normal: [frame.c[0], frame.c[1], frame.c[2]],
      dir: [position[0] / len, position[1] / len, position[2] / len],
      height: len - R,
      radius: l.radius,
    });
  }
}

/**
 * Riesige Felswand längs des Weltbands am abgewandten Rand (Kulisse): Basaltblöcke in Segmenten zu je ~5 Einheiten,
 * jedes in seinem eigenen Rahmen (senkrecht auf der Kugel), Höhenprofil in der Mitte am höchsten, Stufen steigen zum
 * Bandrand an. Liefert die Segmente als eigene Formationen.
 */
function buildWall(host: FeatureHost, world: number, spec: RockSpec, id: string, rand: () => number, occupied: Occupied[]): { formations: RockFormation[]; ledges: LedgeAnchor[] } | null {
  const R = host.radius;
  const side = host.worldSide(world);
  const half = bandHalfWidth(host, side);
  const length = spec.size[0] + (spec.size[1] - spec.size[0]) * rand();
  const height = spec.height[0] + (spec.height[1] - spec.height[0]) * rand();
  const steps = Math.max(1, spec.steps ?? 2);
  const depth = Math.min(3.6, Math.max(2.2, half * 0.34));
  const [s0, s1] = spiralRangeFor(host, world);
  const segs = Math.max(2, Math.round(length / WALL_SEGMENT));
  for (let tries = 0; tries < 24; tries++) {
    let sMid: number;
    if (side === 'near' && !spec.focusDistance) sMid = s0 + (s1 - s0) * (0.15 + 0.7 * rand());
    else {
      const focus = host.focusDir(world) ?? host.worldCenterDir(world);
      const sF = spiralS(host, Math.asin(Math.max(-1, Math.min(1, focus[1]))));
      const [dMin, dMax] = spec.focusDistance ?? [0, 8];
      sMid = sF + (dMin + (dMax - dMin) * rand()) * (rand() < 0.5 ? -1 : 1) * sPerUnit(host, sF);
    }
    const ds = sPerUnit(host, sMid);
    const sA = sMid - (length / 2) * ds;
    const sB = sMid + (length / 2) * ds;
    if (sA < s0 || sB > s1) continue;
    const sgn = spec.side ?? (rand() < 0.5 ? 1 : -1);
    const formations: RockFormation[] = [];
    const ledges: LedgeAnchor[] = [];
    const minPath = side === 'near' ? 2.2 : 0;
    // Je Segment: so nah wie möglich an den Bandrand (die Grenze ist verrauscht), sonst ein Stück nach innen; passt
    // nichts, bleibt eine Lücke in der Wand
    for (let j = 0; j < segs; j++) {
      const t = (j + 0.5) / segs;
      const h = height * (0.55 + 0.45 * Math.sin(Math.PI * t)) * (0.85 + 0.3 * rand());
      for (let inset = 0; inset <= 2.4; inset += 0.6) {
        const lateral = sgn * (half - BORDER_MARGIN - depth * 0.55 - 0.3 - inset);
        if (Math.abs(lateral) - depth * 0.5 < minPath) break;
        const c = bandPoint(host, world, sA + (sB - sA) * t, lateral);
        if (host.worldAt(c[0], c[1], c[2]) !== world || !isFree(occupied, c, WALL_SEGMENT * 0.45, R, 0.2)) continue;
        const frame = frameAt(c);
        const front = frontOf(host, world, frame);
        const built = buildTerraces(host, frame, front, WALL_SEGMENT * 1.04, h, steps, rand, { rubble: side === 'far' && j % 2 === 0, depth, blocks: [2.2, 3.6], jitter: 0.16 });
        if (built.columns.length === 0 || !fitsBand(host, world, frame, built.columns, minPath)) continue;
        const segId = `${id}-seg${j}`;
        let top = -Infinity;
        for (const col of built.columns) top = Math.max(top, columnPeak(col));
        formations.push({ id: segId, world, kind: 'wall', frame, columns: built.columns, footprint: built.footprint, height: top, variant: rand() });
        pushLedges(ledges, built, world, segId, 'wall', frame, R);
        break;
      }
    }
    if (formations.length < Math.max(2, Math.ceil(segs * 0.6))) continue;
    for (const f of formations) occupied.push({ dir: f.frame.c, radius: f.footprint });
    return { formations, ledges };
  }
  return null;
}

/**
 * Felsformationen einer Welt nach Spezifikation: Platz neben dem Pfad (nahe Welten, Frontkante im Abstand
 * `pathDistance`) bzw. um den Bildfokus (ferne Welten), ganz im Weltband, frei von Seen und anderen Formationen.
 * Liefert Formationen und ihre Anker (Planetenraum).
 */
export function generateRocks(host: FeatureHost, world: number, specs: readonly RockSpec[], rand: () => number, occupied: Occupied[]): { formations: RockFormation[]; ledges: LedgeAnchor[] } {
  const R = host.radius;
  const formations: RockFormation[] = [];
  const ledges: LedgeAnchor[] = [];
  let counter = 0;
  for (const spec of specs) {
    const minPath = (spec.pathDistance?.[0] ?? 2) * 0.75;
    for (let n = 0; n < spec.count; n++) {
      if (spec.kind === 'wall') {
        const wall = buildWall(host, world, spec, `${host.worldId(world)}-wall-${counter++}`, rand, occupied);
        if (wall) {
          formations.push(...wall.formations);
          ledges.push(...wall.ledges);
        }
        continue;
      }
      let placed = false;
      for (let tries = 0; tries < 60 && !placed; tries++) {
        const size = spec.size[0] + (spec.size[1] - spec.size[0]) * rand();
        const height = spec.height[0] + (spec.height[1] - spec.height[0]) * rand();
        const reach = lateralReachOf(spec.kind, size);
        const c = placementCandidate(host, world, spec, reach, rand);
        if (!c) continue;
        if (!isFree(occupied, c, reach, R, 1.2)) continue;
        const frame = frameAt(c);
        const front = frontOf(host, world, frame);
        const built =
          spec.kind === 'terraces'
            ? buildTerraces(host, frame, front, size, height, Math.max(2, spec.steps ?? 3), rand)
            : spec.kind === 'tower'
              ? buildTower(host, frame, front, size, height, rand)
              : spec.kind === 'mesa'
                ? buildMesa(host, frame, front, size, height, rand)
                : buildSpires(host, frame, size, height, rand);
        if (built.columns.length === 0) continue;
        if (!fitsBand(host, world, frame, built.columns, minPath)) continue;
        if (!isFree(occupied, c, built.footprint * 0.8, R, 1.0)) continue;
        const id = `${host.worldId(world)}-${spec.kind}-${counter++}`;
        let top = -Infinity;
        for (const col of built.columns) top = Math.max(top, columnPeak(col));
        formations.push({ id, world, kind: spec.kind, frame, columns: built.columns, footprint: built.footprint, height: top, variant: rand() });
        occupied.push({ dir: frame.c, radius: built.footprint });
        pushLedges(ledges, built, world, id, spec.kind, frame, R);
        placed = true;
      }
    }
  }
  return { formations, ledges };
}

const _xy: [number, number] = [0, 0];

/** Säule einer Formation an einer Richtung (mit Rand `margin` in Welteinheiten), die höchste getroffene, oder null. */
export function columnAt(f: RockFormation, R: number, dx: number, dy: number, dz: number, margin: number): RockColumn | null {
  if (!localOf(f.frame, R, dx, dy, dz, _xy)) return null;
  const [x, y] = _xy;
  if (Math.hypot(x, y) > f.footprint + margin) return null;
  let best: RockColumn | null = null;
  let bestTop = -Infinity;
  for (const c of f.columns) {
    if (Math.hypot(x - c.cx, y - c.cy) > c.r + margin) continue;
    const hit = margin > 0 ? pointInPolygon(c.polygon, x, y) || distanceToPolygonEdge(c.polygon, x, y) < margin : pointInPolygon(c.polygon, x, y);
    if (!hit) continue;
    const top = columnTopAt(c, x, y);
    if (top > bestTop) {
      bestTop = top;
      best = c;
    }
  }
  return best;
}
