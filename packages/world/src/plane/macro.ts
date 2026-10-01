import type { RouteShape, RouteShapeParams } from '@ee/core';
import { hash2 } from './noise2';

/**
 * Makroformen des Pfads (W3, Florians Entscheidung 3: „Zonen in sich verschlungen — vor und zurück, Schnecke, seitwärts
 * auf einem Gipfel“). Je Pfadabschnitt eine parametrische Mittellinie im Pfadband, an der der Viterbi-Lauf des Pfads
 * (`PlanePath.buildRoute`) nur noch lokal verfeinert (±3,2). Die Mittellinie beginnt bei `zStart` und endet bei `zEnd`
 * **auf dem Rückgrat mit dessen Tangente** (C¹ zum Nachbarabschnitt, der ebenso beginnt) und bleibt im Band
 * (`bandHalf − 6`) und im z-Bereich ihres Abschnitts.
 *
 * Formen (kanonischer Rahmen: a = Strecke vorwärts 0 … Z, u = seitlich, + = rechts/+x; Ebene: z = zStart − a,
 * x = Rückgrat(z) + u):
 * - `meander`: Sinus seitlich (Standard zwei Halbwellen = ein S, ±7); mit `side` einseitige Bögen (Welt 12: weg vom
 *   Steilhang, Welt 14: weg von der Küste).
 * - `climb`: kleiner Mäander (drei Halbwellen, ±4) — der Klippen-Run kommt in W4.
 * - `serpentine`: zwei Kehren (Radius 4) mit rückläufigem Mittelschenkel — der Weg geht vor und zurück.
 * - `spiral`: „Schnecke“ um ein Zentrum (Fokus-Element bzw. Wahrzeichen): ausholen, Bogen um das Zentrum (Radius ≥
 *   Freiraum + 2), zurück auf das Rückgrat.
 * - `ridge`: Gratweg — seitlich auf eine Kammlinie der Hügelstaffel, längs des Kamms, auf der nächsten zurück.
 *
 * Bogenlänge = `levels × nodeSpacing` (der Knotenabstand bleibt 4,2): ein Formparameter (Amplitude, Schenkel, Bogen)
 * wird je Abschnitt so gelöst, dass die Länge in der Ebene stimmt. Die z-Länge des Abschnitts folgt aus der Form
 * (`macroZLength`, im geraden Rahmen) und steht ausdrücklich in `route.json` (`length`).
 *
 * Alles deterministisch aus Seed, Abschnitt und Parametern (beliebiger Zugriff, auch Abschnitt 10 000).
 */

export type MacroShape = RouteShape | 'straight';

/** Abschnitt der Weltenlage (nur die Lage). */
export interface MacroSegment {
  k: number;
  zStart: number;
  zEnd: number;
}

/** Freizuhaltender Kreis in der Ebene (Fokus-Element, Begleiter). */
export interface MacroCircle {
  x: number;
  z: number;
  radius: number;
}

export interface MacroInput {
  /** Bogenlänge der Mittellinie (Welteinheiten), in der Regel `levels × nodeSpacing`. */
  arc: number;
  /** Freizuhaltende Kreise: die Form wählt Seite/Vorzeichen so, dass sie `radius + KEEP_GAP` hält (soweit möglich). */
  keepClear?: readonly MacroCircle[];
  /** Freiraum am Spiralzentrum (Radius des Fokus-Elements); der Bogen hält mindestens `+ 2`. */
  centreClear?: number;
  /** Gratweg: z der nächsten Kammlinie bei (x, nahe z) — die Schenkel liegen auf den Kämmen. */
  crestAt?: (x: number, z: number) => number;
  /** Abtastschritt längs der Mittellinie (Standard 0,3 — die Zeilen des Viterbi). */
  step?: number;
}

/** Abstand, den die Mittellinie zu freizuhaltenden Kreisen über deren Radius hinaus hält (Viterbi-Spielraum ±3,2). */
export const KEEP_GAP = 2.2;
/** Abstand zum Bandrand (die Mittellinie bleibt in `bandHalf − BAND_MARGIN`). */
export const BAND_MARGIN = 6;
/** Seitlicher Spielraum des Viterbi um die Mittellinie (Standard). */
export const ROUTE_HALF_WIDTH = 3.2;

/** Standardparameter je Form (route.json kann jeden überschreiben). */
export const MACRO_DEFAULTS: Readonly<Record<RouteShape, Readonly<RouteShapeParams>>> = {
  meander: { amplitude: 7, turns: 2 },
  climb: { amplitude: 4, turns: 3 },
  serpentine: { amplitude: 7, turns: 2, radius: 4 },
  spiral: { radius: 8, turns: 0.6 },
  ridge: { amplitude: 10 },
};

/** Radius der Ein- und Ausläufe (Viertelbögen von und zum Rückgrat). */
const ENTRY_RADIUS = 3;
/** Rücklauf des Mittelschenkels der Serpentine (Grad): die Kehren schließen über 180°. */
const SLANT = (15 * Math.PI) / 180;
/** Dichte der kanonischen Abtastung (Welteinheiten). */
const DENSE = 0.1;

// --- kanonische Formen ---------------------------------------------------------------------------------------

interface Canon {
  a: number[];
  u: number[];
  /** Zentrum des Spiralbogens (kanonisch) oder null. */
  centre: [number, number] | null;
}

/** Schildkröte im kanonischen Rahmen: Geraden und Kreisbögen, dicht abgetastet (Kurswinkel θ: 0 = vorwärts, + = zu +u). */
class Turtle {
  a = 0;
  u = 0;
  th = 0;
  readonly A: number[] = [0];
  readonly U: number[] = [0];

  straight(l: number): void {
    if (l <= 1e-9) return;
    const n = Math.max(1, Math.ceil(l / DENSE));
    const ca = Math.cos(this.th);
    const sa = Math.sin(this.th);
    const a0 = this.a;
    const u0 = this.u;
    for (let i = 1; i <= n; i++) {
      this.A.push(a0 + (ca * l * i) / n);
      this.U.push(u0 + (sa * l * i) / n);
    }
    this.a = a0 + ca * l;
    this.u = u0 + sa * l;
  }

  /** Kreisbogen mit Radius r um den Winkel d (+ = zu +u drehen). Liefert das Zentrum. */
  turn(r: number, d: number): [number, number] {
    const sg = d >= 0 ? 1 : -1;
    const ca = this.a + sg * r * -Math.sin(this.th);
    const cu = this.u + sg * r * Math.cos(this.th);
    if (Math.abs(d) < 1e-12 || r <= 0) return [ca, cu];
    const n = Math.max(2, Math.ceil((Math.abs(d) * r) / DENSE));
    for (let i = 1; i <= n; i++) {
      const phi = this.th + (d * i) / n;
      this.A.push(ca - sg * r * -Math.sin(phi));
      this.U.push(cu - sg * r * Math.cos(phi));
    }
    this.th += d;
    this.a = this.A[this.A.length - 1]!;
    this.u = this.U[this.U.length - 1]!;
    return [ca, cu];
  }
}

/** Verschiebung eines Kreisbogens (Radius r, Winkel d) ab Kurs th (geschlossen, ohne Abtastung). */
function arcDelta(th: number, r: number, d: number): [number, number] {
  const sg = d >= 0 ? 1 : -1;
  return [sg * r * (Math.sin(th + d) - Math.sin(th)), sg * r * (Math.cos(th) - Math.cos(th + d))];
}

function smooth01(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Aufgelöste Einstellungen einer Form (aus Parametern und Abschnitt). */
interface ShapeCfg {
  shape: MacroShape;
  turns: number;
  /** Seite (±1): einseitiger Mäander, erste Kehre der Serpentine, Seite der Schnecke und des Grats. */
  side: number;
  /** Einseitiger Mäander (Seite aus den Parametern). */
  oneSided: boolean;
  radius: number;
  /** Gratweg: Vorlauf bis zum ersten Kamm und Abstand der Kämme (null = mittig). */
  ridgeLead: number | null;
  ridgeGap: number;
}

/** Nominaler Formparameter p (Amplitude, Bogenwinkel) aus den Routenparametern. */
function nominalP(shape: MacroShape, params: RouteShapeParams): number {
  const d = shape === 'straight' ? {} : MACRO_DEFAULTS[shape];
  switch (shape) {
    case 'spiral':
      return (params.turns ?? d.turns ?? 0.6) * Math.PI * 2;
    case 'straight':
      return 0;
    default:
      return params.amplitude ?? d.amplitude ?? 6;
  }
}

/**
 * Kanonische Form mit z-Länge Z und Formparameter p, oder null, wenn sie mit diesen Werten nicht schließt (zu kurz,
 * keine Lösung). Beginnt bei (0, 0) mit Kurs 0 und endet bei (Z, 0) mit Kurs 0.
 */
function canon(cfg: ShapeCfg, Z: number, p: number): Canon | null {
  switch (cfg.shape) {
    case 'straight': {
      const n = Math.max(2, Math.ceil(Z / DENSE));
      const a: number[] = [];
      const u: number[] = [];
      for (let i = 0; i <= n; i++) {
        a.push((Z * i) / n);
        u.push(0);
      }
      return { a, u, centre: null };
    }
    case 'meander':
    case 'climb': {
      const n = Math.max(1, Math.round(cfg.turns));
      const N = Math.max(8, Math.ceil(Z / DENSE));
      const r = Math.min(0.25, 0.5 / n);
      const a: number[] = [];
      const u: number[] = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        let f: number;
        if (cfg.oneSided) {
          const s = Math.sin(n * Math.PI * t);
          f = cfg.side * s * s;
        } else f = cfg.side * Math.sin(n * Math.PI * t) * smooth01(0, r, t) * smooth01(0, r, 1 - t);
        a.push(Z * t);
        u.push(p * f);
      }
      return { a, u, centre: null };
    }
    case 'serpentine': {
      // S(e) T(q, s·90°) S(l1) T(ρ, −s(180°+β)) S(l2) T(ρ, s(180°+β)) S(l1) T(q, −s·90°) S(e): punktsymmetrisch um die
      // Mitte des rückläufigen Mittelschenkels; p = seitliche Ausdehnung (Kehrenscheitel)
      // Einlauf enger, wenn die Ausdehnung kleiner als Einlauf + Kehre ist (kurze Abschnitte, steiles Rückgrat)
      const rho = cfg.radius;
      const q = Math.min(ENTRY_RADIUS, p - rho);
      const b = SLANT;
      if (q < 1.2) return null;
      const l1 = p - q - rho;
      if (l1 < -1e-9) return null;
      const l2 = (2 * (Math.max(0, l1) + q - rho * Math.sin(b))) / Math.cos(b);
      const e = Z / 2 - q - rho * (1 + Math.cos(b)) + (l2 / 2) * Math.sin(b);
      if (e < -1e-9 || l2 < 0) return null;
      const s = cfg.side;
      const t = new Turtle();
      t.straight(e);
      t.turn(q, s * (Math.PI / 2));
      t.straight(l1);
      t.turn(rho, -s * (Math.PI + b));
      t.straight(l2);
      t.turn(rho, s * (Math.PI + b));
      t.straight(l1);
      t.turn(q, -s * (Math.PI / 2));
      t.straight(e);
      return { a: t.A, u: t.U, centre: null };
    }
    case 'spiral': {
      // S(e) T(q, s·α) T(r, −s·Φ) T(q, s·(Φ − α)) S(e): ausholen, Bogen um das Zentrum, zurück; α schließt seitlich
      const q = ENTRY_RADIUS;
      const r = cfg.radius;
      const s = cfg.side;
      const phi = p;
      const uEnd = (alpha: number): number => {
        let th = 0;
        let uu = 0;
        for (const [rad, d] of [
          [q, s * alpha],
          [r, -s * phi],
          [q, s * (phi - alpha)],
        ] as const) {
          uu += arcDelta(th, rad, d)[1];
          th += d;
        }
        return uu;
      };
      // Seitlicher Schluss: Nullstelle von uEnd(α) in [0, min(Φ, 150°)]
      const hiA = Math.min(phi, (150 * Math.PI) / 180);
      let lo = 0;
      let hi = hiA;
      let flo = uEnd(lo);
      const fhi = uEnd(hi);
      if (flo === 0) hi = lo;
      else if (Math.sign(flo) === Math.sign(fhi)) return null;
      for (let it = 0; it < 60 && hi - lo > 1e-10; it++) {
        const m = (lo + hi) / 2;
        const fm = uEnd(m);
        if (Math.sign(fm) === Math.sign(flo)) {
          lo = m;
          flo = fm;
        } else hi = m;
      }
      const alpha = (lo + hi) / 2;
      let th = 0;
      let span = 0;
      for (const [rad, d] of [
        [q, s * alpha],
        [r, -s * phi],
        [q, s * (phi - alpha)],
      ] as const) {
        span += arcDelta(th, rad, d)[0];
        th += d;
      }
      const e = (Z - span) / 2;
      if (e < -1e-9) return null;
      const t = new Turtle();
      t.straight(e);
      t.turn(q, s * alpha);
      const c = t.turn(r, -s * phi);
      t.turn(q, s * (phi - alpha));
      t.straight(e);
      return { a: t.A, u: t.U, centre: c };
    }
    case 'ridge': {
      // S(e1) T(q, s·90°) S(w) T(q, −s·90°) S(m) T(q, −s·90°) S(w) T(q, s·90°) S(e2): auf dem ersten Kamm hinaus, auf dem
      // nächsten zurück; p = seitliche Ausdehnung (Kammweg + zwei Bögen)
      const q = ENTRY_RADIUS;
      const w = p - 2 * q;
      if (w < -1e-9) return null;
      const m = Math.max(0, cfg.ridgeGap);
      const free = Z - 4 * q - m;
      if (free < -1e-9) return null;
      const e1 = cfg.ridgeLead === null ? free / 2 : Math.min(free, Math.max(0, cfg.ridgeLead));
      const e2 = free - e1;
      const s = cfg.side;
      const t = new Turtle();
      t.straight(e1);
      t.turn(q, s * (Math.PI / 2));
      t.straight(Math.max(0, w));
      t.turn(q, -s * (Math.PI / 2));
      t.straight(m);
      t.turn(q, -s * (Math.PI / 2));
      t.straight(Math.max(0, w));
      t.turn(q, s * (Math.PI / 2));
      t.straight(e2);
      return { a: t.A, u: t.U, centre: null };
    }
  }
}

/** Bogenlänge einer kanonischen Form in der Ebene (Rückgrat `backbone`, Beginn `zStart`; gerade: backbone ≡ 0). */
function planeLength(c: Canon, zStart: number, backbone: ((z: number) => number) | null): number {
  let len = 0;
  let px = 0;
  let pz = 0;
  for (let i = 0; i < c.a.length; i++) {
    const z = zStart - c.a[i]!;
    const x = (backbone ? backbone(z) : 0) + c.u[i]!;
    if (i > 0) len += Math.hypot(x - px, z - pz);
    px = x;
    pz = z;
  }
  return len;
}

/** Schließt die Form? (Ende auf dem Rückgrat, im z-Bereich, keine Selbstüberschneidung.) */
function wellFormed(c: Canon, Z: number): boolean {
  const n = c.a.length;
  if (Math.abs(c.u[n - 1]!) > 1e-4 || Math.abs(c.a[n - 1]! - Z) > 1e-4) return false;
  for (let i = 0; i < n; i++) if (c.a[i]! < -0.05 || c.a[i]! > Z + 0.05) return false;
  // Selbstüberschneidung auf einer groben Abtastung (Schritt ≈ 0,8)
  const stride = Math.max(1, Math.round(0.8 / DENSE));
  const xa: number[] = [];
  const xu: number[] = [];
  for (let i = 0; i < n; i += stride) {
    xa.push(c.a[i]!);
    xu.push(c.u[i]!);
  }
  xa.push(c.a[n - 1]!);
  xu.push(c.u[n - 1]!);
  const m = xa.length;
  for (let i = 0; i + 1 < m; i++) {
    for (let j = i + 2; j + 1 < m; j++) {
      if (segmentsCross(xa[i]!, xu[i]!, xa[i + 1]!, xu[i + 1]!, xa[j]!, xu[j]!, xa[j + 1]!, xu[j + 1]!)) return false;
    }
  }
  return true;
}

function segmentsCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Größte seitliche Ausdehnung |u|. */
function maxLateral(c: Canon): number {
  let m = 0;
  for (const v of c.u) m = Math.max(m, Math.abs(v));
  return m;
}

function resolveCfg(shape: MacroShape, params: RouteShapeParams, side: number): ShapeCfg {
  const d = shape === 'straight' ? {} : MACRO_DEFAULTS[shape];
  return {
    shape,
    turns: params.turns ?? d.turns ?? 2,
    side,
    oneSided: (shape === 'meander' || shape === 'climb') && params.side !== undefined,
    radius: params.radius ?? d.radius ?? 4,
    ridgeLead: null,
    ridgeGap: 6,
  };
}

/** Bereich des Formparameters p (für die Lösung der Bogenlänge). */
function pRange(cfg: ShapeCfg, limit: number): [number, number] {
  switch (cfg.shape) {
    case 'spiral':
      return [Math.PI / 3, Math.PI * 1.65];
    case 'serpentine':
      return [cfg.radius + 1.2, Math.max(cfg.radius + 1.3, limit)];
    case 'ridge':
      return [2 * ENTRY_RADIUS, Math.max(2 * ENTRY_RADIUS + 0.1, limit)];
    case 'straight':
      return [0, 0];
    default:
      return [0, Math.max(0.1, limit)];
  }
}

/**
 * Löst den Formparameter p so, dass die Bogenlänge (`len(c)`) das Ziel trifft: grobe Suche über den Bereich, dann
 * Bisektion zwischen der letzten zu kurzen und der ersten zu langen gültigen Form. Ohne Treffer die nächstbeste.
 */
function solveP(cfg: ShapeCfg, Z: number, target: number, len: (c: Canon) => number, range: [number, number], limit: number): { p: number; c: Canon } | null {
  const [p0, p1] = range;
  if (p1 <= p0) {
    const c = canon(cfg, Z, p0);
    return c ? { p: p0, c } : null;
  }
  const N = 24;
  let below: { p: number; c: Canon; l: number } | null = null;
  let above: { p: number; c: Canon; l: number } | null = null;
  let best: { p: number; c: Canon; err: number } | null = null;
  for (let i = 0; i <= N; i++) {
    const p = p0 + ((p1 - p0) * i) / N;
    const c = canon(cfg, Z, p);
    if (!c || !wellFormed(c, Z) || maxLateral(c) > limit + 1e-6) continue;
    const l = len(c);
    const err = Math.abs(l - target);
    if (!best || err < best.err) best = { p, c, err };
    if (l < target) below = { p, c, l };
    else if (!above) {
      above = { p, c, l };
      break;
    }
  }
  if (below && above) {
    let lo = below.p;
    let hi = above.p;
    let out = Math.abs(below.l - target) < Math.abs(above.l - target) ? { p: below.p, c: below.c } : { p: above.p, c: above.c };
    for (let it = 0; it < 40 && hi - lo > 1e-7; it++) {
      const m = (lo + hi) / 2;
      const c = canon(cfg, Z, m);
      if (!c || !wellFormed(c, Z)) {
        // ungültig zwischen zwei gültigen Formen: die nähere behalten
        break;
      }
      const l = len(c);
      out = { p: m, c };
      if (Math.abs(l - target) < 1e-4) break;
      if (l < target) lo = m;
      else hi = m;
    }
    return out;
  }
  return best ? { p: best.p, c: best.c } : null;
}

/**
 * z-Länge eines Abschnitts mit Makroform: die Länge Z, bei der die Form mit ihren nominalen Parametern im geraden
 * Rahmen (Rückgrat gerade) die Bogenlänge `arc` hat — auf 0,1 gerundet. Steht ausdrücklich in `route.json` (`length`).
 */
export function macroZLength(shape: MacroShape, arc: number, params: RouteShapeParams = {}): number {
  if (shape === 'straight') return Math.round(arc * 10) / 10;
  const cfg = resolveCfg(shape, params, params.side ?? 1);
  if (shape === 'ridge') cfg.ridgeGap = 6;
  const p = nominalP(shape, params);
  const f = (Z: number): number => {
    const c = canon(cfg, Z, p);
    if (!c || !wellFormed(c, Z)) return Number.NEGATIVE_INFINITY;
    return planeLength(c, 0, null) - arc;
  };
  let lo = arc * 0.1;
  let hi = arc;
  if (f(hi) < 0) return Math.round(arc * 10) / 10;
  for (let it = 0; it < 80 && hi - lo > 1e-7; it++) {
    const m = (lo + hi) / 2;
    if (f(m) < 0) lo = m;
    else hi = m;
  }
  return Math.round(((lo + hi) / 2) * 10) / 10;
}

// --- Mittellinie in der Ebene -------------------------------------------------------------------------------

/** Nächster Punkt der Mittellinie (Ergebnis von `MacroLine.nearest`). */
export interface MacroHit {
  /** Index der Probe vor dem Lotfußpunkt und Anteil bis zur nächsten. */
  i: number;
  t: number;
  x: number;
  z: number;
  /** Normale (rechts der Laufrichtung) am Lotfußpunkt. */
  nx: number;
  nz: number;
  /** Abstand und Seite (+1 rechts der Laufrichtung, −1 links). */
  d: number;
  side: number;
  /** Bogenlänge am Lotfußpunkt. */
  s: number;
}

const CHUNK = 12;

/**
 * Mittellinie eines Pfadabschnitts in der Ebene: Proben gleichabständig längs der Bogenlänge (Schritt ≈ 0,3),
 * Normalen (rechts der Laufrichtung), seitlicher Spielraum des Viterbi je Probe, Abstandsabfragen.
 */
export class MacroLine {
  readonly shape: MacroShape;
  readonly k: number;
  readonly zStart: number;
  readonly zEnd: number;
  readonly pts: Array<[number, number]>;
  readonly normals: Array<[number, number]>;
  readonly s: number[];
  readonly length: number;
  /** Seitlicher Versatz zum Rückgrat je Probe (x − Rückgrat(z)). */
  readonly lateral: number[];
  /** Spielraum des Viterbi je Probe (≤ `ROUTE_HALF_WIDTH`): Abstand zu anderen Schleifen der eigenen Linie. */
  readonly room: number[];
  /** Spiralzentrum in der Ebene (x, z) oder null. */
  readonly centre: [number, number] | null;
  /** Gelöster Formparameter (Amplitude, Ausdehnung bzw. Bogenwinkel) und gewählte Seite. */
  readonly p: number;
  readonly side: number;
  private readonly chunkC: Array<[number, number, number]> = [];

  constructor(init: {
    shape: MacroShape;
    k: number;
    zStart: number;
    zEnd: number;
    pts: Array<[number, number]>;
    lateral: number[];
    centre: [number, number] | null;
    p: number;
    side: number;
    halfWidth?: number;
  }) {
    this.shape = init.shape;
    this.k = init.k;
    this.zStart = init.zStart;
    this.zEnd = init.zEnd;
    this.pts = init.pts;
    this.lateral = init.lateral;
    this.centre = init.centre;
    this.p = init.p;
    this.side = init.side;
    const M = this.pts.length;
    this.s = [0];
    for (let i = 1; i < M; i++) this.s.push(this.s[i - 1]! + Math.hypot(this.pts[i]![0] - this.pts[i - 1]![0], this.pts[i]![1] - this.pts[i - 1]![1]));
    this.length = this.s[M - 1]!;
    this.normals = this.pts.map((_, i) => {
      const a = this.pts[Math.max(0, i - 1)]!;
      const b = this.pts[Math.min(M - 1, i + 1)]!;
      const tx = b[0] - a[0];
      const tz = b[1] - a[1];
      const l = Math.hypot(tx, tz) || 1;
      // rechts der Laufrichtung t: (−t_z, t_x)
      return [-tz / l, tx / l] as [number, number];
    });
    for (let c = 0; c < M; c += CHUNK) {
      const end = Math.min(M - 1, c + CHUNK);
      let mx = 0;
      let mz = 0;
      for (let i = c; i <= end; i++) {
        mx += this.pts[i]![0];
        mz += this.pts[i]![1];
      }
      mx /= end - c + 1;
      mz /= end - c + 1;
      let r = 0;
      for (let i = c; i <= end; i++) r = Math.max(r, Math.hypot(this.pts[i]![0] - mx, this.pts[i]![1] - mz));
      this.chunkC.push([mx, mz, r]);
    }
    this.room = this.computeRoom(init.halfWidth ?? ROUTE_HALF_WIDTH);
  }

  /** Spielraum je Probe: 0,45 × Abstand zu Proben, die längs der Linie weiter als 6 entfernt sind, und ≤ 0,8 × Krümmungsradius. */
  private computeRoom(W: number): number[] {
    const M = this.pts.length;
    const out = new Array<number>(M).fill(W);
    if (this.shape === 'straight') return out;
    for (let i = 0; i < M; i++) {
      const [xi, zi] = this.pts[i]!;
      let dmin = Infinity;
      for (let j = 0; j < M; j++) {
        if (Math.abs(this.s[j]! - this.s[i]!) < 6) continue;
        const d = Math.hypot(this.pts[j]![0] - xi, this.pts[j]![1] - zi);
        if (d < dmin) dmin = d;
      }
      // Krümmungsradius über ±1 Einheit Bogen
      const a = this.pts[Math.max(0, i - 3)]!;
      const b = this.pts[Math.min(M - 1, i + 3)]!;
      const na = this.normals[Math.max(0, i - 3)]!;
      const nb = this.normals[Math.min(M - 1, i + 3)]!;
      const ang = Math.acos(Math.min(1, Math.max(-1, na[0] * nb[0] + na[1] * nb[1])));
      const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const rc = ang > 1e-6 ? chord / ang : Infinity;
      out[i] = Math.max(0.4, Math.min(W, 0.45 * dmin, 0.8 * rc));
    }
    return out;
  }

  /** Nächster Punkt der Mittellinie zu (x, z). */
  nearest(x: number, z: number, out?: MacroHit): MacroHit {
    const o = out ?? ({} as MacroHit);
    let best = Infinity;
    let bi = 0;
    let bt = 0;
    const M = this.pts.length;
    // Brocken nach Abstand der Hüllkreise; nur Brocken, die besser sein können
    for (let c = 0; c < this.chunkC.length; c++) {
      const [cx, cz, cr] = this.chunkC[c]!;
      const dc = Math.hypot(x - cx, z - cz) - cr;
      if (dc >= best) continue;
      const i0 = c * CHUNK;
      const i1 = Math.min(M - 1, i0 + CHUNK);
      for (let i = i0; i < i1; i++) {
        const [ax, az] = this.pts[i]!;
        const [bx, bz] = this.pts[i + 1]!;
        const ex = bx - ax;
        const ez = bz - az;
        const l2 = ex * ex + ez * ez;
        let t = l2 > 1e-12 ? ((x - ax) * ex + (z - az) * ez) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(ax + ex * t - x, az + ez * t - z);
        if (d < best) {
          best = d;
          bi = i;
          bt = t;
        }
      }
    }
    const a = this.pts[bi]!;
    const b = this.pts[Math.min(M - 1, bi + 1)]!;
    o.i = bi;
    o.t = bt;
    o.x = a[0] + (b[0] - a[0]) * bt;
    o.z = a[1] + (b[1] - a[1]) * bt;
    const na = this.normals[bi]!;
    const nb = this.normals[Math.min(M - 1, bi + 1)]!;
    const nx = na[0] + (nb[0] - na[0]) * bt;
    const nz = na[1] + (nb[1] - na[1]) * bt;
    const nl = Math.hypot(nx, nz) || 1;
    o.nx = nx / nl;
    o.nz = nz / nl;
    o.d = best;
    o.side = (x - o.x) * o.nx + (z - o.z) * o.nz >= 0 ? 1 : -1;
    o.s = this.s[bi]! + (this.s[Math.min(M - 1, bi + 1)]! - this.s[bi]!) * bt;
    return o;
  }

  /** Abstand zur Mittellinie. */
  distance(x: number, z: number): number {
    return this.nearest(x, z, this.hit).d;
  }

  private readonly hit = {} as MacroHit;

  /** Punkt und Normale bei Bogenlänge s (geklemmt). */
  at(s: number): { x: number; z: number; nx: number; nz: number } {
    const M = this.pts.length;
    const t = Math.min(this.length, Math.max(0, s));
    let lo = 0;
    let hi = M - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.s[mid]! <= t) lo = mid;
      else hi = mid;
    }
    const f = this.s[hi]! > this.s[lo]! ? (t - this.s[lo]!) / (this.s[hi]! - this.s[lo]!) : 0;
    const a = this.pts[lo]!;
    const b = this.pts[hi]!;
    const na = this.normals[lo]!;
    const nb = this.normals[hi]!;
    const nx = na[0] + (nb[0] - na[0]) * f;
    const nz = na[1] + (nb[1] - na[1]) * f;
    const l = Math.hypot(nx, nz) || 1;
    return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, nx: nx / l, nz: nz / l };
  }

  /**
   * Äußerste seitliche Lage der Mittellinie auf der Seite `side` (±1) nahe z (|z_i − z| ≤ `window`): max side·(x − Rückgrat)
   * der Proben, oder null, wenn keine Probe in der Nähe liegt. Merkmale „neben dem Pfad“ messen ihren Seitenabstand von
   * hier aus (Flüsse, Wahrzeichen) — sie schneiden auch gefaltete Linien (Serpentine, Schnecke) nicht.
   */
  envelope(z: number, side: number, window = 4): number | null {
    let best: number | null = null;
    for (let i = 0; i < this.pts.length; i++) {
      if (Math.abs(this.pts[i]![1] - z) > window) continue;
      const v = side * this.lateral[i]!;
      if (best === null || v > best) best = v;
    }
    return best;
  }

  /** Probe mit z am nächsten an `z` (bei mehreren Lagen — gefaltete Linie — die `pick`-te von vorn, 0 ≤ pick < 1). */
  indexAtZ(z: number, pick = 0): number {
    const cands: number[] = [];
    for (let i = 0; i + 1 < this.pts.length; i++) {
      const a = this.pts[i]![1];
      const b = this.pts[i + 1]![1];
      if ((a - z) * (b - z) <= 0 && a !== b) cands.push(Math.abs(a - z) <= Math.abs(b - z) ? i : i + 1);
    }
    if (cands.length > 0) return cands[Math.min(cands.length - 1, Math.floor(pick * cands.length))]!;
    let best = 0;
    for (let i = 1; i < this.pts.length; i++) if (Math.abs(this.pts[i]![1] - z) < Math.abs(this.pts[best]![1] - z)) best = i;
    return best;
  }
}

/** Standard-Freiraum eines Fokus-Elements bzw. Begleiters nach Art (Scheune 4.5, Eiche und Schnee-Ahorn nach Größe). */
export function focalClearRadius(kind: string | undefined, scale: number): number {
  if (!kind) return 0;
  if (kind === 'barn') return 4.5;
  if (kind === 'oak' || kind === 'winterOak') return 2.4 * scale;
  if (kind === 'maple') return 1.6 * scale;
  return 3.2;
}

/**
 * Mittellinie des Abschnitts `seg` mit der Makroform `shape`: beginnt und endet auf dem Rückgrat (Tangente des
 * Rückgrats), bleibt in `bandHalf − 6` und im z-Bereich; Bogenlänge = `input.arc` (ein Formparameter wird gelöst). Die
 * Seite (bzw. das Vorzeichen des ersten Bogens) folgt den Parametern, sonst dem größeren Abstand zu freizuhaltenden
 * Kreisen, bei Gleichstand dem Seed.
 */
export function macroCenterline(
  seg: MacroSegment,
  backbone: (z: number) => number,
  bandHalf: (z: number) => number,
  seed: number,
  shape: MacroShape,
  params: RouteShapeParams = {},
  input: MacroInput = { arc: seg.zStart - seg.zEnd },
): MacroLine {
  const Z = seg.zStart - seg.zEnd;
  const step = input.step ?? 0.3;
  let limit = Infinity;
  for (let a = 0; a <= Z + 1e-9; a += 1) limit = Math.min(limit, bandHalf(seg.zStart - a) - BAND_MARGIN);
  limit = Math.max(0, limit);
  const len = (c: Canon): number => planeLength(c, seg.zStart, backbone);
  const keep = input.keepClear ?? [];
  // Kandidaten der Seite: aus den Parametern fest, sonst beide (Wahl nach Freiraum, dann Seed)
  const fixed = params.side;
  const seedSide = hash2(seg.k, 31, seed) < 0.5 ? -1 : 1;
  const sides = shape === 'straight' ? [1] : fixed !== undefined ? [fixed] : [seedSide, -seedSide];
  let chosen: { c: Canon; p: number; side: number; clear: number } | null = null;
  for (const side of sides) {
    // Die erste Seite (Parameter bzw. Seed) genügt, wenn sie den Freiraum hält
    if (chosen && chosen.clear >= KEEP_GAP) break;
    const cfg = resolveCfg(shape, params, side);
    if (shape === 'ridge' && input.crestAt) alignRidge(cfg, seg, backbone, input.crestAt, nominalP(shape, params), Z);
    let sol: { p: number; c: Canon } | null = null;
    if (shape === 'spiral') {
      // Schnecke: der Bogen hält in der Ebene mindestens den Radius (bzw. Freiraum + 2) vom Zentrum — die seitliche
      // Abbildung am schrägen Rückgrat schert den Kreis zur Ellipse, darum den Radius nachführen
      const want = Math.max(cfg.radius, (input.centreClear ?? 0) + 2);
      cfg.radius = want;
      for (let it = 0; it < 5; it++) {
        sol = solveP(cfg, Z, input.arc, len, pRange(cfg, limit), limit);
        if (!sol || !sol.c.centre) break;
        const near = centreDistance(sol.c, seg.zStart, backbone);
        if (near >= want - 0.05) break;
        cfg.radius += want - near + 0.1;
      }
    } else sol = solveP(cfg, Z, input.arc, len, pRange(cfg, limit), limit);
    if (!sol) continue;
    let clear = Infinity;
    for (const k of keep) clear = Math.min(clear, canonClearance(sol.c, seg.zStart, backbone, k) - k.radius);
    if (!chosen || clear > chosen.clear + 1e-6) chosen = { c: sol.c, p: sol.p, side, clear };
  }
  const c = chosen?.c ?? canon(resolveCfg('straight', {}, 1), Z, 0)!;
  // Ebene: z = zStart − a, x = Rückgrat(z) + u; gleichabständig nach Bogenlänge abgetastet
  const n = c.a.length;
  const X = new Float64Array(n);
  const Zs = new Float64Array(n);
  const S = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    Zs[i] = seg.zStart - c.a[i]!;
    X[i] = backbone(Zs[i]!) + c.u[i]!;
    if (i > 0) S[i] = S[i - 1]! + Math.hypot(X[i]! - X[i - 1]!, Zs[i]! - Zs[i - 1]!);
  }
  const total = S[n - 1]!;
  const M = Math.max(8, Math.round(total / step) + 1);
  const pts: Array<[number, number]> = [];
  const lateral: number[] = [];
  let j = 0;
  for (let m = 0; m < M; m++) {
    const target = (total * m) / (M - 1);
    while (j < n - 2 && S[j + 1]! < target) j++;
    const f = S[j + 1]! > S[j]! ? Math.min(1, Math.max(0, (target - S[j]!) / (S[j + 1]! - S[j]!))) : 0;
    const z = Zs[j]! + (Zs[j + 1]! - Zs[j]!) * f;
    const u = c.u[j]! + (c.u[j + 1]! - c.u[j]!) * f;
    // Enden exakt auf dem Rückgrat
    const x = m === 0 || m === M - 1 ? backbone(z) : X[j]! + (X[j + 1]! - X[j]!) * f;
    pts.push([x, z]);
    lateral.push(m === 0 || m === M - 1 ? 0 : u);
  }
  const centre: [number, number] | null = c.centre ? [backbone(seg.zStart - c.centre[0]) + c.centre[1], seg.zStart - c.centre[0]] : null;
  return new MacroLine({ shape: chosen ? shape : 'straight', k: seg.k, zStart: seg.zStart, zEnd: seg.zEnd, pts, lateral, centre, p: chosen?.p ?? 0, side: chosen?.side ?? 1 });
}

/** Kleinster Abstand einer kanonischen Schnecke (in der Ebene) zu ihrem Zentrum. */
function centreDistance(c: Canon, zStart: number, backbone: (z: number) => number): number {
  if (!c.centre) return Infinity;
  const zc = zStart - c.centre[0];
  return canonClearance(c, zStart, backbone, { x: backbone(zc) + c.centre[1], z: zc, radius: 0 });
}

/** Kleinster Abstand einer kanonischen Form (in der Ebene) zu einem Punkt. */
function canonClearance(c: Canon, zStart: number, backbone: (z: number) => number, k: MacroCircle): number {
  let best = Infinity;
  for (let i = 0; i < c.a.length; i += 3) {
    const z = zStart - c.a[i]!;
    const x = backbone(z) + c.u[i]!;
    best = Math.min(best, Math.hypot(x - k.x, z - k.z));
  }
  return best;
}

/**
 * Gratweg: Vorlauf und Kammabstand so, dass beide Querschenkel auf Kammlinien der Hügelstaffel liegen (Kamm an der
 * Mitte des Schenkels). Ohne passenden Kamm bleibt die Form mittig.
 */
function alignRidge(cfg: ShapeCfg, seg: MacroSegment, backbone: (z: number) => number, crestAt: (x: number, z: number) => number, W: number, Z: number): void {
  const q = ENTRY_RADIUS;
  const mid = cfg.side * Math.max(q, W / 2);
  // erster Schenkel nahe einem Drittel des Abschnitts
  const a1Want = Z * 0.3;
  const z1 = seg.zStart - a1Want;
  const c1 = crestAt(backbone(z1) + mid, z1);
  const a1 = seg.zStart - c1;
  // nächster Kamm vorwärts, mindestens 2q weiter
  const z2want = c1 - Math.max(2 * q + 1, Z * 0.35);
  const c2 = crestAt(backbone(z2want) + mid, z2want);
  const a2 = seg.zStart - c2;
  const lead = a1 - q;
  const gap = a2 - a1 - 2 * q;
  if (lead >= 0.5 && gap >= 0 && lead + 4 * q + gap <= Z - 0.5) {
    cfg.ridgeLead = lead;
    cfg.ridgeGap = gap;
  }
}
