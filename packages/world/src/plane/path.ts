import type { Vec3 } from '../capPatch';
import type { LandmarkAnchor, LandmarkInstance, LandmarkWaypoint } from '../landmarks/types';
import type { PlaneField } from './field';
import type { RegionSample } from './layout';

/**
 * Der unendliche Levelpfad der Ebene (ADR 0002). Je Pfadabschnitt (eine Welt) gibt die Makroform (W3, `macro.ts`:
 * Mäander, Serpentine, Schnecke, Gratweg, Kletterweg; sonst das Rückgrat `x_b(z)`) die Mittellinie vor; ein Viterbi-Lauf
 * über seitliche Versätze längs ihrer Normalen wählt darum die günstigste glatte Linie (Hänge und Talsohlen statt
 * Kuppen und Mulden — bevorzugte Höhe je Welt, `WorldSpec.path` —, sanftes Gelände, kleine Mäander, weg von Wasser,
 * Felsfüßen und Fokus-Elementen, Felsanker ziehen an; an Kehren und Schleifen enger). Die Abschnittsgrenzen liegen auf
 * dem Rückgrat (Versatz 0, weich eingeblendet) — jeder Abschnitt ist unabhängig und deterministisch, beliebiger Zugriff
 * (auch Level 10 000). z ist längs des Pfads nicht mehr monoton (Serpentinen, Schnecken), die Bogenlänge `s` der
 * Knoten schon. Knoten gleichabständig je Abschnitt, auf dem flachsten Boden in der Nähe, mit ihrem Element (Wiese,
 * Hain, Felsvorsprung, Müllfeld, Ufer).
 *
 * Reine Daten (kein three.js). Positionen in Ebenenkoordinaten `[x, h, z]`.
 */

/** Das Element unter einem Knoten — Kartenelement unter dem Stein und das Plateau seines Levels. */
export type NodeSite = 'meadow' | 'grove' | 'ledge' | 'trash' | 'shore' | 'snow' | 'bark' | 'crown';

export interface PlanePathNode {
  /** 0-basiert (Level = index + 1). */
  index: number;
  segment: number;
  /** Wo der Stein ruht (auf dem Element). */
  position: Vec3;
  normal: Vec3;
  /** Bogenlänge (monoton, abschnittsweise auf die z-Länge skaliert). */
  s: number;
  site: NodeSite;
  world: number;
  /** Höhe des Elements über dem Gelände (Felsvorsprung, Müllhügel, Sandbank). */
  rise: number;
  /**
   * Der Knoten liegt auf einem Wahrzeichen (Felsplateau, Ruinenterrasse, Sumpfinsel): das Level wird dort oben gespielt
   * (`anchor.position`, die Levelkamera kommt von `anchor.facing`); der Weg steigt über `route` hinauf und hinab.
   */
  landmark?: { id: string; kind: LandmarkInstance['placement']['kind']; world: number; anchor: LandmarkAnchor };
}

export interface PlanePathDot {
  position: Vec3;
  normal: Vec3;
  /** Knoten vor dem Punkt (global) und Anteil 0..1 bis zum nächsten. */
  seg: number;
  u: number;
  on: 'ground';
}

export interface PlaneRibbonSample {
  position: Vec3;
  normal: Vec3;
  /** Quer zum Band (Ebene, Einheitsvektor, rechts der Laufrichtung). */
  side: Vec3;
  width: number;
  seg: number;
  u: number;
  world: number;
  heightNorm: number;
  left: Vec3;
  right: Vec3;
}

export interface PlaneRouteSample {
  position: Vec3;
  normal: Vec3;
  side: Vec3;
  /** Abschnitts-lokale Bogenlänge. */
  s: number;
}

export interface PlanePathSegment {
  k: number;
  world: number;
  /** Globaler Index des ersten Knotens und Anzahl (Vorland: 0 Knoten). */
  firstIndex: number;
  count: number;
  nodes: PlanePathNode[];
  /** Punkte zwischen den Knoten des Abschnitts und zum ersten Knoten des nächsten Abschnitts. */
  dots: PlanePathDot[];
  /** Lichtband von der Abschnittsgrenze bis zur nächsten. */
  ribbon: PlaneRibbonSample[];
  samples: PlaneRouteSample[];
  /** Routenlänge (Welteinheiten) und z-Länge des Abschnitts. */
  length: number;
  zLength: number;
  /** Seitlicher Versatz je Probe gegenüber der Mittellinie der Makroform (Diagnose). */
  offsets: number[];
}

/** Ein Element, das der Pfad besuchen soll (Felsvorsprung), bzw. Kosten, die ihn fernhalten (Wasser, Felsfüße). */
export interface PlanePathProvider {
  /** Anker in einem z-Bereich (Ebene). */
  anchors?(zHi: number, zLo: number): Array<{ position: Vec3; kind: NodeSite; reach?: number }>;
  cost?(x: number, z: number): number;
}

export interface PlanePathOptions {
  seed?: number;
  /** Seitlicher Spielraum der Route um die Mittellinie der Makroform (Standard 3.2; an Kehren enger). */
  halfWidth?: number;
  /** Schrittweite des Rückgrats (Standard 0.3). */
  step?: number;
  meander?: { amplitude?: number; wavelength?: number };
  dotSpacing?: number;
  dotClearance?: number;
  provider?: PlanePathProvider | null;
  /** Level (1-basiert) mit dramatischem Felsvorsprung (Standard 13, 38, 63, 88; danach jeder 25.). */
  spikes?: readonly number[];
  /** Knotenindizes (0-basiert), die flacher Boden bleiben (z. B. beim Riesenbaum). */
  keepGround?: readonly number[];
  /** Wahrzeichen besuchen (Level auf Fels, Ruine, Sumpfinsel; Standard true). */
  landmarks?: boolean;
  /** Cache der Abschnitte (Obergrenze). */
  capacity?: number;
}

type V2 = [number, number];

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function hash01(i: number, salt: number): number {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function gaussSmooth(values: number[], sigma: number): number[] {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const w: number[] = [];
  for (let k = -r; k <= r; k++) w.push(Math.exp(-(k * k) / (2 * sigma * sigma)));
  return values.map((_, i) => {
    let acc = 0;
    let ws = 0;
    for (let k = -r; k <= r; k++) {
      const v = values[Math.min(values.length - 1, Math.max(0, i + k))]!;
      acc += v * w[k + r]!;
      ws += w[k + r]!;
    }
    return acc / ws;
  });
}

interface Route {
  /** Mittellinie (x, z) je Probe und seitliche Einheitsvektoren (x, z). */
  pts: V2[];
  sides: V2[];
  /** Bogenlänge je Probe. */
  s: number[];
  length: number;
  offsets: number[];
  zStart: number;
  zEnd: number;
}

export class PlanePath {
  readonly field: PlaneField;
  private readonly opts: Required<Omit<PlanePathOptions, 'provider' | 'keepGround' | 'spikes' | 'meander' | 'landmarks'>> & { meanderA: number; meanderL: number };
  private readonly provider: PlanePathProvider | null;
  private readonly keep: Set<number>;
  private readonly spikes: Set<number>;
  private readonly routes = new Map<number, Route>();
  private readonly segments = new Map<number, PlanePathSegment>();
  private readonly phase0: number;
  private readonly rs = {} as RegionSample;
  private readonly visitLandmarks: boolean;

  constructor(field: PlaneField, options: PlanePathOptions = {}) {
    this.field = field;
    const W = options.halfWidth ?? 3.2;
    this.opts = {
      seed: options.seed ?? 7,
      halfWidth: W,
      step: options.step ?? 0.3,
      dotSpacing: options.dotSpacing ?? 0.46,
      dotClearance: options.dotClearance ?? 0.6,
      capacity: options.capacity ?? 48,
      meanderA: (options.meander?.amplitude ?? 0.78) * W,
      meanderL: options.meander?.wavelength ?? 12,
    };
    this.provider = options.provider ?? null;
    this.keep = new Set(options.keepGround ?? []);
    this.spikes = new Set((options.spikes ?? [13, 38, 63, 88]).map((l) => l - 1));
    this.phase0 = hash01(this.opts.seed, 11) * Math.PI * 2;
    this.visitLandmarks = options.landmarks ?? true;
  }

  /** Letzter Knoten (0-basiert): der Torknoten am Ende der Route (Route 15 + 1); mit `procedural` ∞. */
  get lastNode(): number {
    return this.field.layout.lastLevel - 1;
  }

  /** Knoten mit globalem Index (0-basiert), geklemmt auf [0, lastNode] (hinter dem Tor gibt es keine Knoten). */
  node(index: number): PlanePathNode {
    const i = Math.max(0, Math.min(Math.floor(index), this.lastNode));
    const k = this.field.layout.segmentOfLevel(i + 1);
    const seg = this.segment(k);
    const n = seg.nodes[i - seg.firstIndex];
    if (!n) throw new Error(`no path node ${i}`);
    return n;
  }

  /** Knoten [i0, i1] (inklusive, geklemmt auf den letzten Knoten). */
  nodes(i0: number, i1: number): PlanePathNode[] {
    const out: PlanePathNode[] = [];
    const last = Math.min(i1, this.lastNode);
    for (let i = Math.max(0, i0); i <= last; i++) out.push(this.node(i));
    return out;
  }

  /** Abschnitt k (Route, Knoten, Punkte, Lichtband), im Cache. */
  segment(k: number): PlanePathSegment {
    const hit = this.segments.get(k);
    if (hit) return hit;
    const seg = this.buildSegment(k);
    this.segments.set(k, seg);
    while (this.segments.size > this.opts.capacity) {
      const oldest = this.segments.keys().next().value;
      if (oldest === undefined) break;
      this.segments.delete(oldest);
    }
    return seg;
  }

  /** Cache verwerfen (Merkmale oder Wahrzeichen haben sich geändert). */
  invalidate(): void {
    this.routes.clear();
    this.segments.clear();
    this.arcs.clear();
  }

  /** Abschnitt, in dem z liegt (ohne Grenzrauschen). */
  segmentAtZ(z: number): number {
    return this.field.layout.segmentAtDistance(-z);
  }

  /**
   * Nächster Knoten (global) zu einem Punkt der Ebene, gesucht in den Abschnitten um z (hinter dem Tor: um den
   * Torabschnitt, dort liegen die nächsten Knoten).
   */
  nearestNode(x: number, z: number): number {
    const k0 = Math.min(this.segmentAtZ(z), this.field.layout.lastSegment);
    let best = -1;
    let bestD = Infinity;
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      if (k < 0) continue;
      for (const n of this.segment(k).nodes) {
        const d = Math.hypot(n.position[0] - x, n.position[2] - z);
        if (d < bestD) {
          bestD = d;
          best = n.index;
        }
      }
    }
    return Math.max(0, best);
  }

  // --- Route je Abschnitt --------------------------------------------------------------------------------

  private route(k: number): Route {
    const hit = this.routes.get(k);
    if (hit) return hit;
    const r = this.buildRoute(k);
    this.routes.set(k, r);
    while (this.routes.size > this.opts.capacity * 2) {
      const oldest = this.routes.keys().next().value;
      if (oldest === undefined) break;
      this.routes.delete(oldest);
    }
    return r;
  }

  /** Kleiner Mäander der Verfeinerung an der Stelle d (Bogenlänge ab dem Abschnittsbeginn, versetzt um dessen Lage). */
  private meanderAt(d: number, meanderA = this.opts.meanderA): number {
    const { meanderL } = this.opts;
    const p = this.phase0;
    const lam = meanderL * (1 + 0.28 * Math.sin(d / 41 + p) + 0.12 * Math.sin(d / 17 + 2.1));
    const amp = meanderA * (0.75 + 0.25 * Math.sin(d / 29 + 1.3 + p));
    // Phase über die Strecke integriert wäre exakt; die langsame Drift der Wellenlänge genügt für organische Bögen
    return amp * Math.sin((d / lam) * Math.PI * 2 + p + 0.9 * Math.sin(d / 23));
  }

  private buildRoute(k: number): Route {
    const field = this.field;
    const layout = field.layout;
    const seg = layout.segment(k);
    const W = this.opts.halfWidth;
    const zStart = seg.zStart;
    const zEnd = seg.zEnd;
    // Mittellinie der Makroform (W3): Proben gleichabständig längs der Bogenlänge, Normalen rechts der Laufrichtung; der
    // Viterbi verfeinert seitlich darum (±W, an Kehren und Schleifen enger: `room`)
    const macro = layout.macro(k);
    const M = macro.pts.length;
    const step = macro.length / Math.max(1, M - 1);
    const bb: Array<{ x: number; z: number; bx: number; bz: number; room: number; s: number }> = macro.pts.map((p, i) => ({
      x: p[0],
      z: p[1],
      bx: macro.normals[i]![0],
      bz: macro.normals[i]![1],
      room: Math.min(W, macro.room[i]!),
      s: macro.s[i]!,
    }));
    // Einbettung je Welt (`WorldSpec.path`): bevorzugte Höhe, Gewicht der Neigung, kleiner Mäander
    const tune = field.spec(seg.world).path ?? {};
    const hTarget = tune.height ?? 0.32;
    const slopeW = tune.slope ?? 2.4;
    const meanderA = tune.meander !== undefined ? tune.meander * W : this.opts.meanderA;
    // Fokus-Element und Begleiter des Abschnitts bleiben frei (die Makroform hält Abstand, die Verfeinerung auch)
    const keep: Array<{ x: number; z: number; r: number }> = [];
    const regionKey = `p${k}`;
    for (const slot of [field.focalSlot(regionKey), ...field.companionSlots(regionKey)]) {
      if (slot && slot.instance && slot.clearRadius > 0) keep.push({ x: slot.position[0], z: slot.position[2], r: slot.clearRadius + 0.6 });
    }
    const K = 29;
    const mid = (K - 1) / 2;
    const offsets = Array.from({ length: K }, (_, j) => -W + (2 * W * j) / (K - 1));
    const dO = offsets[1]! - offsets[0]!;
    const heights = new Float32Array(M * K);
    const amps = new Float32Array(M * K);
    const extra = new Float32Array(M * K);
    const anchors = this.provider?.anchors?.(zStart + 2, zEnd - 2) ?? [];
    const rs = this.rs;
    for (let i = 0; i < M; i++) {
      const b = bb[i]!;
      for (let j = 0; j < K; j++) {
        const cx = b.x + b.bx * offsets[j]!;
        const cz = b.z + b.bz * offsets[j]!;
        field.sample(cx, cz, rs);
        const sh = field.shapeAt(cx, cz, rs);
        heights[i * K + j] = field.heightWithShape(cx, cz, sh, rs.region.key);
        amps[i * K + j] = Math.max(0.2, sh.amplitude);
        let e = 0;
        // Außerhalb des Spielraums (Kehre, andere Schleife der Linie): ausgeschlossen
        if (Math.abs(offsets[j]!) > b.room + 1e-6) e += 1e3;
        for (const c of keep) if (Math.hypot(cx - c.x, cz - c.z) < c.r) e += 4;
        // Seitliche Weltgrenzen (Risse) meiden; Abschnittsgrenzen quert der Pfad ohnehin
        if (rs.borderId < 0) e += 2.2 * Math.pow(Math.max(0, 1 - rs.border / 1.8), 2);
        if (this.provider?.cost) e += 3 * Math.max(0, this.provider.cost(cx, cz));
        for (const an of anchors) {
          const reach = an.reach ?? 3;
          const dd = Math.hypot(an.position[0] - cx, an.position[2] - cz);
          if (dd < reach) e -= 1.6 * (1 - dd / reach);
        }
        extra[i * K + j] = e;
      }
    }
    const cost = new Float32Array(M * K);
    for (let i = 0; i < M; i++) {
      // Mäander über die Bogenlänge (die Mittellinie läuft auch quer und zurück)
      const target = Math.max(-bb[i]!.room, Math.min(bb[i]!.room, this.meanderAt(-zStart + bb[i]!.s, meanderA)));
      for (let j = 0; j < K; j++) {
        const h = heights[i * K + j]!;
        const hn = h / amps[i * K + j]!;
        const jm = Math.max(0, j - 1);
        const jp = Math.min(K - 1, j + 1);
        const im = Math.max(0, i - 1);
        const ip = Math.min(M - 1, i + 1);
        const gx = (heights[i * K + jp]! - heights[i * K + jm]!) / ((jp - jm) * dO);
        const gy = (heights[ip * K + j]! - heights[im * K + j]!) / ((ip - im) * step);
        const slope = Math.hypot(gx, gy);
        const o = offsets[j]!;
        let c = 0;
        c += 1.1 * (hn - hTarget) * (hn - hTarget);
        c += slopeW * slope * slope;
        c += 0.9 * Math.pow(Math.abs(o - target) / W, 1.5);
        c += 0.9 * Math.pow(Math.abs(o) / W, 6);
        c += extra[i * K + j]!;
        cost[i * K + j] = c;
      }
    }
    // Viterbi, Enden auf dem Rückgrat festgehalten
    const acc = new Float32Array(M * K);
    const from = new Int16Array(M * K);
    for (let j = 0; j < K; j++) acc[j] = j === mid ? cost[j]! : 1e9;
    for (let i = 1; i < M; i++) {
      for (let j = 0; j < K; j++) {
        let best = Infinity;
        let arg = j;
        for (let dj = -2; dj <= 2; dj++) {
          const q = j + dj;
          if (q < 0 || q >= K) continue;
          const v = acc[(i - 1) * K + q]! + 0.012 * dj * dj;
          if (v < best) {
            best = v;
            arg = q;
          }
        }
        acc[i * K + j] = best + cost[i * K + j]!;
        from[i * K + j] = arg;
      }
    }
    const pick = new Array<number>(M);
    pick[M - 1] = mid;
    for (let i = M - 1; i > 0; i--) pick[i - 1] = from[i * K + pick[i]!]!;
    let off = gaussSmooth(gaussSmooth(pick.map((j) => offsets[j]!), 3.2), 2);
    // Enden weich auf 0 (C¹-Übergang in den Nachbarabschnitt)
    const ramp = Math.max(2, Math.round(3.2 / step));
    off = off.map((v, i) => {
      const e = Math.min(i, M - 1 - i);
      const r = bb[i]!.room;
      return Math.max(-r, Math.min(r, v)) * smoothstep(0, ramp, e);
    });
    const pts: V2[] = [];
    const s: number[] = [];
    let acc2 = 0;
    for (let i = 0; i < M; i++) {
      const b = bb[i]!;
      const p: V2 = [b.x + b.bx * off[i]!, b.z + b.bz * off[i]!];
      if (i > 0) acc2 += Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1]);
      pts.push(p);
      s.push(acc2);
    }
    const sides: V2[] = pts.map((_, i) => {
      const a = pts[Math.max(0, i - 1)]!;
      const c = pts[Math.min(M - 1, i + 1)]!;
      const tx = c[0] - a[0];
      const tz = c[1] - a[1];
      const l = Math.hypot(tx, tz) || 1;
      // rechts der Laufrichtung t: (−t_z, t_x)
      return [-tz / l, tx / l];
    });
    return { pts, sides, s, length: acc2, offsets: off, zStart, zEnd };
  }

  /** Punkt der Mittellinie bei Bogenlänge s (Abschnitt k), mit Querrichtung. */
  private at(route: Route, s: number): { x: number; z: number; sx: number; sz: number } {
    const M = route.pts.length;
    const t = Math.min(route.length, Math.max(0, s));
    let lo = 0;
    let hi = M - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (route.s[mid]! <= t) lo = mid;
      else hi = mid;
    }
    const a = route.s[lo]!;
    const b = route.s[hi]!;
    const f = b > a ? (t - a) / (b - a) : 0;
    const p = route.pts[lo]!;
    const q = route.pts[hi]!;
    const sp = route.sides[lo]!;
    const sq = route.sides[hi]!;
    const sx = sp[0] + (sq[0] - sp[0]) * f;
    const sz = sp[1] + (sq[1] - sp[1]) * f;
    const l = Math.hypot(sx, sz) || 1;
    return { x: p[0] + (q[0] - p[0]) * f, z: p[1] + (q[1] - p[1]) * f, sx: sx / l, sz: sz / l };
  }

  // --- Abschnitt: Knoten, Punkte, Lichtband ------------------------------------------------------------------

  private readonly arcs = new Map<number, number[]>();

  /** Höhenspanne und Relief auf einem Ring (Plateau-Fußabdruck) um (x, z) — kleiner = flacher. */
  private ring(x: number, z: number): { spread: number; relief: number } {
    const field = this.field;
    const h0 = field.heightAt(x, z);
    let lo = Infinity;
    let hi = -Infinity;
    let sum = 0;
    for (let q = 0; q < 8; q++) {
      const a = (q / 8) * Math.PI * 2;
      const h = field.heightAt(x + Math.cos(a) * 1.8, z + Math.sin(a) * 1.8);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
      sum += h;
    }
    return { spread: hi - lo, relief: h0 - sum / 8 };
  }

  /** Bogenlängen der Knoten eines Abschnitts: gleichabständig, dann der flachste Boden in der Nähe (Cache). */
  private nodeArcs(k: number): number[] {
    const hit = this.arcs.get(k);
    if (hit) return hit;
    const lseg = this.field.layout.segment(k);
    const route = this.route(k);
    const n = lseg.levels;
    const firstIndex = Math.max(0, lseg.firstLevel - 1);
    const spacing = n > 0 ? route.length / n : route.length;
    const nodeS: number[] = [];
    for (let i = 0; i < n; i++) nodeS.push((i + 0.5) * spacing);
    for (let i = 0; i < n; i++) {
      const s0 = nodeS[i]!;
      const lo = i > 0 ? nodeS[i - 1]! : 0;
      const hi = i < n - 1 ? nodeS[i + 1]! : route.length;
      const win = Math.min(spacing * 0.22, (s0 - lo) * 0.3, (hi - s0) * 0.3);
      let bestS = s0;
      let bestC = Infinity;
      if (!this.keep.has(firstIndex + i)) {
        for (let s = s0 - win; s <= s0 + win + 1e-6; s += Math.max(0.12, win / 5)) {
          const p = this.at(route, s);
          const c = this.ring(p.x, p.z).spread + 0.15 * Math.abs(s - s0);
          if (c < bestC) {
            bestC = c;
            bestS = s;
          }
        }
      }
      nodeS[i] = bestS;
    }
    this.arcs.set(k, nodeS);
    while (this.arcs.size > this.opts.capacity * 2) {
      const oldest = this.arcs.keys().next().value;
      if (oldest === undefined) break;
      this.arcs.delete(oldest);
    }
    return nodeS;
  }

  /**
   * Welches Wahrzeichen der Abschnitt besucht (höchstens eines): ein Held (Fels, Ruine) mit Plateau nahe der Route,
   * sonst gelegentlich eine Sumpfinsel. Liefert den ersetzten Knoten (lokal), das Wahrzeichen und den Anker.
   */
  private landmarkVisit(k: number, route: Route, nodeS: number[], firstIndex: number): { j: number; inst: LandmarkInstance; anchor: LandmarkAnchor } | null {
    const lm = this.field.landmarks;
    const n = nodeS.length;
    if (!lm || !this.visitLandmarks || n < 4) return null;
    let x0 = Infinity;
    let x1 = -Infinity;
    for (const p of route.pts) {
      x0 = Math.min(x0, p[0]);
      x1 = Math.max(x1, p[0]);
    }
    const list = lm.inRect(x0 - 24, route.zEnd, x1 + 24, route.zStart);
    let best: { j: number; inst: LandmarkInstance; anchor: LandmarkAnchor; score: number } | null = null;
    for (const inst of list) {
      const anchor = inst.anchors[0];
      if (!anchor || inst.route.ascent.length === 0 || inst.route.descent.length === 0) continue;
      // nächste Stelle der Route und Abstand
      let bi = 0;
      let bd = Infinity;
      for (let i = 0; i < route.pts.length; i++) {
        const d = Math.hypot(route.pts[i]![0] - anchor.position[0], route.pts[i]![1] - anchor.position[2]);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      }
      const swamp = inst.placement.kind === 'swamp';
      if (bd > (swamp ? 16 : 22)) continue;
      // Knoten am nächsten (nicht erster/letzter des Abschnitts, nicht die ersten Level, keine Bodenpflicht)
      const sAt = route.s[bi]!;
      let j = -1;
      let dj = Infinity;
      for (let i = 1; i < n - 1; i++) {
        const idx = firstIndex + i;
        if (idx < 3 || this.keep.has(idx) || this.keep.has(idx - 1) || this.keep.has(idx + 1)) continue;
        const d = Math.abs(nodeS[i]! - sAt);
        if (d < dj) {
          dj = d;
          j = i;
        }
      }
      if (j < 0) continue;
      const r = hash01(k * 31 + (swamp ? 7 : 3), this.opts.seed + 41);
      if (swamp && r > 0.6) continue;
      const score = (swamp ? 10 : 0) + bd * 0.2 + dj * 0.1;
      if (!best || score < best.score) best = { j, inst, anchor, score };
    }
    return best ? { j: best.j, inst: best.inst, anchor: best.anchor } : null;
  }

  private buildSegment(k: number): PlanePathSegment {
    const field = this.field;
    const layout = field.layout;
    const lseg = layout.segment(k);
    // Hinter dem Tor (Route 15 + 1): kein Weg, keine Knoten, kein Lichtband — nur die angedeutete Zone
    if (k > layout.lastSegment) {
      const firstIndex = Math.max(0, layout.lastLevel);
      return { k, world: lseg.world, firstIndex, count: 0, nodes: [], dots: [], ribbon: [], samples: [], length: 0, zLength: lseg.zStart - lseg.zEnd, offsets: [] };
    }
    const route = this.route(k);
    const n = lseg.levels;
    const firstIndex = Math.max(0, lseg.firstLevel - 1);
    const zLen = lseg.zStart - lseg.zEnd;
    const sScale = zLen / Math.max(1e-6, route.length);
    const sBase = -lseg.zStart;
    const pos: Vec3 = [0, 0, 0];
    const nor: Vec3 = [0, 0, 0];
    const samples: PlaneRouteSample[] = route.pts.map((p, i) => {
      field.surfaceAt(p[0], p[1], pos, nor);
      return { position: [pos[0], pos[1], pos[2]], normal: [nor[0], nor[1], nor[2]], side: [route.sides[i]![0], 0, route.sides[i]![1]], s: route.s[i]! };
    });
    const nodeS = this.nodeArcs(k);
    const visit = lseg.hinted ? null : this.landmarkVisit(k, route, nodeS, firstIndex);
    const ring = (x: number, z: number): { spread: number; relief: number } => this.ring(x, z);
    const nodes: PlanePathNode[] = [];
    const sites: NodeSite[] = [];
    const seed = this.opts.seed;
    for (let i = 0; i < n; i++) {
      const index = firstIndex + i;
      const p = this.at(route, nodeS[i]!);
      field.surfaceAt(p.x, p.z, pos, nor);
      const r = ring(p.x, p.z);
      field.sample(p.x, p.z, this.rs);
      const w = this.rs.world;
      const props = field.spec(w).props ?? {};
      const trash = field.spec(w).trash;
      const forest = field.forestAt(p.x, p.z);
      const rnd = hash01(index, seed + 3);
      const spike = this.spikes.has(index) || (index >= 100 && index % 25 === 12);
      let site: NodeSite = 'meadow';
      if (!this.keep.has(index) && index >= 2) {
        if (spike || r.spread > 1.25 || r.relief > 0.55) site = 'ledge';
        else if (((props.trash ?? 0) > 0.02 || (trash?.debris ?? 0) > 0.5) && rnd < 0.42) site = 'trash';
        else if ((props.pools ?? 0) > 0.004 && rnd > 0.72) site = 'shore';
        else if (forest > 0.56) site = 'grove';
        const last = sites[sites.length - 1];
        if (site !== 'meadow' && site !== 'grove' && last === site && !spike) site = forest > 0.5 ? 'grove' : 'meadow';
        if (site === 'meadow' && index % 7 === 3 && r.spread < 0.9) site = 'ledge';
      }
      if (visit && visit.j === i) {
        // Level auf dem Wahrzeichen: der Stein liegt auf dem Plateau (Moos, Terrasse, Insel), ohne Sockel
        const a = visit.anchor;
        sites.push('meadow');
        nodes.push({
          index,
          segment: k,
          position: [a.position[0], a.position[1], a.position[2]],
          normal: [0, 1, 0],
          s: sBase + nodeS[i]! * sScale,
          site: 'meadow',
          world: visit.inst.placement.world >= 0 ? visit.inst.placement.world : w,
          rise: 0,
          landmark: { id: visit.inst.placement.id, kind: visit.inst.placement.kind, world: visit.inst.placement.world, anchor: a },
        });
        continue;
      }
      let rise = 0;
      if (lseg.hinted) {
        // Torknoten der angedeuteten Zone: ein Stein knapp über dem Nebelmeer (Spiegel der Welt), kein Wahrzeichen
        site = 'ledge';
        const sea = field.spec(w).mist?.sea;
        const level = sea ? (sea.height ?? sea.level * field.spec(w).terrain.amplitude) : -Infinity;
        rise = Math.min(1.6, Math.max(0.5, level + 0.3 - pos[1]));
      }
      sites.push(site);
      if (!lseg.hinted) rise = site === 'ledge' ? 0.42 + 0.3 * hash01(index, seed + 5) : site === 'trash' ? 0.15 : site === 'shore' ? 0.07 : 0;
      nodes.push({ index, segment: k, position: [pos[0], pos[1] + rise, pos[2]], normal: [nor[0], nor[1], nor[2]], s: sBase + nodeS[i]! * sScale, site, world: w, rise });
    }
    // Punkte: zwischen den Knoten und vom letzten Knoten bis zum ersten des nächsten Abschnitts
    const dots: PlanePathDot[] = [];
    const clearance = this.opts.dotClearance;
    const dotSpacing = this.opts.dotSpacing;
    const pushDots = (sa: number, sb: number, seg: number, sample: (s: number) => { x: number; z: number; sx: number; sz: number }, uOf: (s: number) => number): void => {
      const inner = sb - sa - 2 * clearance;
      if (inner <= 0) return;
      const count = Math.max(1, Math.round(inner / dotSpacing) + 1);
      for (let j = 0; j < count; j++) {
        const s = count > 1 ? sa + clearance + (inner * j) / (count - 1) : (sa + sb) / 2;
        const wob = 0.07 * Math.sin(s * 2.3 + seg * 1.7);
        const p = sample(s);
        const x = p.x + p.sx * wob;
        const z = p.z + p.sz * wob;
        field.surfaceAt(x, z, pos, nor);
        dots.push({ position: [pos[0], pos[1], pos[2]], normal: [nor[0], nor[1], nor[2]], seg, u: uOf(s), on: 'ground' });
      }
    };
    /** Punkte auf einem Wegstück aus Bodenlinie und Wegpunkten des Wahrzeichens (Stufen, Treppe, Steine). */
    const pushPolyline = (pts: Array<{ p: Vec3; ground: boolean }>, seg: number): void => {
      // Länge und Bogenparameter; Bodenstücke dazwischen in Schritten von `dotSpacing`
      const out: Array<{ p: Vec3; n: Vec3 }> = [];
      for (let q = 0; q + 1 < pts.length; q++) {
        const a = pts[q]!;
        const b = pts[q + 1]!;
        if (a.ground && b.ground) {
          const d = Math.hypot(b.p[0] - a.p[0], b.p[2] - a.p[2]);
          const m = Math.max(1, Math.round(d / dotSpacing));
          for (let t = q === 0 ? 0 : 1; t <= m; t++) {
            const f = t / m;
            field.surfaceAt(a.p[0] + (b.p[0] - a.p[0]) * f, a.p[2] + (b.p[2] - a.p[2]) * f, pos, nor);
            out.push({ p: [pos[0], pos[1], pos[2]], n: [nor[0], nor[1], nor[2]] });
          }
        } else {
          if (q === 0) out.push({ p: a.p, n: [0, 1, 0] });
          out.push({ p: b.p, n: [0, 1, 0] });
        }
      }
      // Freihaltung an den Enden (Knotensteine), gleichmäßiger Bogenparameter
      const first = pts[0]!.p;
      const last = pts[pts.length - 1]!.p;
      const kept = out.filter((o) => Math.hypot(o.p[0] - first[0], o.p[2] - first[2]) >= clearance && Math.hypot(o.p[0] - last[0], o.p[2] - last[2]) >= clearance);
      kept.forEach((o, qi) => dots.push({ position: o.p, normal: o.n, seg, u: kept.length > 1 ? qi / (kept.length - 1) : 0.5, on: 'ground' }));
    };
    const way = (w: LandmarkWaypoint): { p: Vec3; ground: boolean } => ({ p: [w.position[0], w.position[1], w.position[2]], ground: w.kind === 'ground' });
    for (let i = 0; i + 1 < n; i++) {
      const a = nodeS[i]!;
      const b = nodeS[i + 1]!;
      if (visit && (visit.j === i + 1 || visit.j === i)) {
        // Hinauf: Bodenlinie vom Knoten zum Fuß der Treppe, dann die Wegpunkte bis aufs Plateau; hinab umgekehrt
        const r = visit.inst.route;
        if (visit.j === i + 1) {
          const from = nodes[i]!.position;
          pushPolyline([{ p: from, ground: true }, { p: r.ascent[0]!.position, ground: true }, ...r.ascent.slice(1).map(way), { p: nodes[i + 1]!.position, ground: false }], firstIndex + i);
        } else {
          const to = nodes[i + 1]!.position;
          pushPolyline([{ p: nodes[i]!.position, ground: false }, ...r.descent.slice(0, -1).map(way), { p: r.descent[r.descent.length - 1]!.position, ground: true }, { p: to, ground: true }], firstIndex + i);
        }
        continue;
      }
      pushDots(a, b, firstIndex + i, (s) => this.at(route, s), (s) => (s - a) / Math.max(1e-6, b - a));
    }
    const next = n > 0 ? this.nextWithNodes(k) : null;
    if (n > 0 && next) {
      // Übergang in den nächsten Abschnitt (dessen Route beginnt am selben Rückgratpunkt); hinter dem Tor keiner
      const a = nodeS[n - 1]!;
      const restA = route.length - a;
      const nextRoute = this.route(next.k);
      const nextFirst = next.firstS;
      const total = restA + next.gap + nextFirst;
      const sample = (s: number) => {
        if (s <= route.length) return this.at(route, s);
        const t = s - route.length;
        if (t <= next.gap) return this.at(this.route(k + 1), t);
        return this.at(nextRoute, t - next.gap);
      };
      pushDots(a, a + total, firstIndex + n - 1, sample, (s) => (s - a) / Math.max(1e-6, total));
    }
    // Lichtband: von der Abschnittsgrenze bis zur nächsten, Lichtung um jeden Knoten
    const ribbon: PlaneRibbonSample[] = [];
    const rStep = 0.26;
    const edge: Vec3 = [0, 0, 0];
    const edgeN: Vec3 = [0, 0, 0];
    const segOf = (s: number): { seg: number; u: number } => {
      if (n === 0) return { seg: Math.max(0, firstIndex - 1), u: 0.5 };
      if (s <= nodeS[0]!) return { seg: firstIndex - 1, u: 0.5 + 0.5 * (s / Math.max(1e-6, nodeS[0]!)) };
      for (let i = 0; i + 1 < n; i++) if (s <= nodeS[i + 1]!) return { seg: firstIndex + i, u: (s - nodeS[i]!) / Math.max(1e-6, nodeS[i + 1]! - nodeS[i]!) };
      return { seg: firstIndex + n - 1, u: 0.5 * ((s - nodeS[n - 1]!) / Math.max(1e-6, route.length - nodeS[n - 1]!)) };
    };
    // Am Torknoten endet das Band 1,5 Einheiten hinter dem letzten Knoten (dahinter liegt nur die angedeutete Zone)
    const ribbonEnd = k >= layout.lastSegment && n > 0 ? Math.min(route.length, nodeS[n - 1]! + 1.5) : route.length;
    for (let s = 0; s <= ribbonEnd + 1e-6; s += rStep) {
      const p = this.at(route, s);
      field.surfaceAt(p.x, p.z, pos, nor);
      let near = Infinity;
      for (const ns of nodeS) near = Math.min(near, Math.abs(ns - s));
      const breathe = 0.62 + 0.16 * Math.sin((sBase + s) * 0.53 + 1.1) + 0.09 * Math.sin((sBase + s) * 1.37 + 0.4);
      const clearing = 1.55 * Math.exp(-Math.pow(near / 0.95, 2));
      const width = Math.max(breathe, clearing);
      const su = segOf(s);
      field.sample(p.x, p.z, this.rs);
      const w = this.rs.world;
      const amp = Math.max(0.2, field.shapeAt(p.x, p.z, this.rs).amplitude);
      field.surfaceAt(p.x + p.sx * width * 0.5, p.z + p.sz * width * 0.5, edge, edgeN);
      const left: Vec3 = [edge[0], edge[1], edge[2]];
      field.surfaceAt(p.x - p.sx * width * 0.5, p.z - p.sz * width * 0.5, edge, edgeN);
      const right: Vec3 = [edge[0], edge[1], edge[2]];
      ribbon.push({ position: [pos[0], pos[1], pos[2]], normal: [nor[0], nor[1], nor[2]], side: [p.sx, 0, p.sz], width, seg: su.seg, u: su.u, world: w, heightNorm: Math.min(1, Math.max(0, pos[1] / amp)), left, right });
    }
    return { k, world: lseg.world, firstIndex, count: n, nodes, dots, ribbon, samples, length: route.length, zLength: zLen, offsets: route.offsets };
  }

  /**
   * Nächster Abschnitt mit Knoten nach k (Vorland-Abschnitte haben keine) und der Weg dorthin; `null` am Tor (hinter
   * dem letzten Abschnitt mit Knoten folgt keiner mehr).
   */
  private nextWithNodes(k: number): { k: number; gap: number; firstS: number } | null {
    if (k >= this.field.layout.lastSegment) return null;
    let gap = 0;
    let j = k + 1;
    for (let guard = 0; guard < 64; guard++, j++) {
      const lseg = this.field.layout.segment(j);
      if (lseg.levels > 0) {
        const r = this.route(j);
        void r;
        return { k: j, gap, firstS: this.nodeArcs(j)[0] ?? 0 };
      }
      gap += this.route(j).length;
    }
    return { k: j, gap, firstS: 0 };
  }
}
