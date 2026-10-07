import { clamp, lerp, smax, smin, type Quat, type Vec3 } from '../math/vec';

/**
 * Implizite Szene eines Wesens: eine Liste von Primitiven, die weich vereinigt (Körper, Hals, Kopf, Beine, Schwanz …)
 * oder weich abgezogen werden (Maulhöhle, Augenhöhlen). Jedes Primitiv kennt sein **Teil** (Knochen) für Gewichte und
 * seine **Region** (Haut, Lippe, Rachen, Höhle) für Materialmasken. Dieselbe Mathematik läuft im Renderer als TSL.
 */

export const REGION = { haut: 0, lippe: 1, rachen: 2, hoehle: 3, keratin: 4 } as const;
export type Region = (typeof REGION)[keyof typeof REGION];

interface PrimBase {
  /** Knochen-/Teilindex für Gewichte und Deskriptoren. */
  part: number;
  /** Blendradius der weichen Vereinigung bzw. Subtraktion. */
  k: number;
  region: Region;
  op: 'union' | 'subtract';
  /** Optionaler Name (Debug, Tests). */
  name?: string;
}

/** Rundkegel: Kapsel mit zwei Radien. */
export interface CapsulePrim extends PrimBase {
  kind: 'capsule';
  a: Vec3;
  b: Vec3;
  ra: number;
  rb: number;
}

/** Ellipsoid, optional gedreht und zum gerundeten Quader hin verwürfelt. */
export interface EllipsoidPrim extends PrimBase {
  kind: 'ellipsoid';
  c: Vec3;
  r: Vec3;
  q?: Quat;
  kubik?: number;
}

/**
 * Rotationskörper aus einer glatten Radiusfunktion r(y) (dichte Tabelle über die Höhe), anisotrop in x/z, mit
 * Superellipsen-Querschnitt (n = 2 rund … 8 würfelig), Scherung (Neigung), flacher Standfläche unten und gerundeter Kante.
 * Abstand ≈ (q − r(y)) · cos(Steigung) — exakt für gerade Profilstücke, glatt (C1) für die Kuppel.
 */
export interface RevolvePrim extends PrimBase {
  kind: 'revolve';
  /** Radius je Höhenstützstelle, radii[0] bei y = 0, radii[n−1] bei y = height (letzter Wert ≈ 0 = Scheitel). */
  radii: Float64Array;
  height: number;
  c: Vec3;
  sx: number;
  sz: number;
  /** Superellipsen-Exponent (2 = Kreis). */
  n: number;
  /** z-Versatz je Höheneinheit (vornüber > 0). */
  shear: number;
  /** Rundung der Standkante. */
  round: number;
  /** Rundung der Deckelkante (0 = Scheitel läuft über die Radiusfunktion aus). */
  topRound?: number;
}

/**
 * Glatter Schlauch entlang einer dichten Polylinie (Lippen, später Hals/Schwanz): Abstand zum nächsten Segment minus dem
 * dort interpolierten Radius — ein Primitiv statt einer Kapselkette, deshalb keine Nahtbeulen durch Smooth-Min.
 */
export interface TubePrim extends PrimBase {
  kind: 'tube';
  /** xyz je Punkt. */
  points: Float64Array;
  /** Radius je Punkt. */
  radii: Float64Array;
  /** Geschlossener Ring (letzter Punkt verbindet zum ersten). */
  closed?: boolean;
}

/** Freies Primitiv (z. B. Maulhöhle) mit eigener Abstandsfunktion und Hüllquader. */
export interface CustomPrim extends PrimBase {
  kind: 'custom';
  eval: (p: Readonly<Vec3>) => number;
  bounds: { min: Vec3; max: Vec3 };
}

/**
 * **Profil-Loft**: die gezeichnete Form. Eine dichte Mittellinie (Stationen) mit Rahmen (right, up, tangent); je Station
 * ein **Ei-Querschnitt** aus vier Halbachsen (Breite `wx` symmetrisch, Höhe oben `wyT` und unten `wyB` getrennt) mit
 * Superellipsen-Exponent `n`. So entstehen Körper (Rücken- und Bauchlinie getrennt), Kopf (Schädel oben, Kiefer unten),
 * Hals, Beine (Hüfte breit, Fuß als Saugnapf), Schwanz — als **eine** glatte Fläche je Masse, ohne Nahtbeulen. Der
 * Knochen je Station (`part`) steuert die Gewichte. Kappen: 0 = Profil läuft aus (Kuppel), > 0 = flache Schnittfläche
 * mit dieser Kantenrundung (Standfläche, Deckel).
 */
export interface LoftStation {
  p: Vec3;
  right: Vec3;
  up: Vec3;
  tangent: Vec3;
  wx: number;
  wyT: number;
  wyB: number;
  n: number;
  arc: number;
  part: number;
}

export interface LoftPrim extends PrimBase {
  kind: 'loft';
  stations: LoftStation[];
  capStart: number;
  capEnd: number;
  /**
   * Gerade Bezugsachse (Einheitsvektor): die Station wird nach der Höhe entlang dieser Achse gewählt, die Querschnitte
   * liegen senkrecht zur Achse, der Mittenversatz verschiebt nur die Scheibe. Stetig per Konstruktion — die Projektion
   * auf eine gekrümmte Mittellinie springt dagegen überall dort, wo ein Punkt zwei Abschnitten gleich nah ist (im
   * Rumpf, am Knie). Ohne Achse: Nächster-Punkt-Suche (Schwanz, Schlange — Biegeradius groß gegen die Dicke).
   */
  axis?: Vec3;
}

export type Prim = CapsulePrim | EllipsoidPrim | RevolvePrim | TubePrim | CustomPrim | LoftPrim;

/** Knochen eines Primitivs an der Stelle p (Lofts: Knochen der nächsten Station). */
export function primPart(prim: Prim, p: Readonly<Vec3>): number {
  if (prim.kind !== 'loft') return prim.part;
  return prim.stations[nearestStation(prim, p)]!.part;
}

function nearestStation(prim: LoftPrim, p: Readonly<Vec3>): number {
  const st = prim.stations;
  const n = st.length;
  let bi = 0;
  let bd = Infinity;
  for (let i = 0; i < n; i += 3) {
    const q = st[i]!.p;
    const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
    if (d < bd) {
      bd = d;
      bi = i;
    }
  }
  for (let i = Math.max(0, bi - 3); i <= Math.min(n - 1, bi + 3); i++) {
    const q = st[i]!.p;
    const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
    if (d < bd) {
      bd = d;
      bi = i;
    }
  }
  return bi;
}

/** Radius des Ei-Querschnitts einer Station in Richtung (ca, cb) der Querschnittsebene. */
function sectionRadius(s: LoftStation, ca: number, cb: number): number {
  const wy = cb >= 0 ? s.wyT : s.wyB;
  if (s.wx < 1e-6 || wy < 1e-6) return 0;
  const n = s.n;
  const ax = Math.abs(ca) / s.wx, ay = Math.abs(cb) / wy;
  if (n <= 2.001) return 1 / Math.sqrt(ax * ax + ay * ay);
  return Math.pow(Math.pow(ax, n) + Math.pow(ay, n), -1 / n);
}

/**
 * Abstand zum Loft: Rahmen der nächsten Station, darin Radialabstand ρ und Richtung; dann der exakte 2D-Abstand von
 * (ρ, s) zur Profil-Polylinie (Radius in dieser Richtung je Nachbarstation über der Bogenlänge) — dieselbe Konstruktion wie
 * beim Rotationskörper, aber für beliebige Mittellinien und Ei-Querschnitte. Kappen als gerundete Halbraum-Schnitte.
 */
export function sdLoft(p: Readonly<Vec3>, prim: LoftPrim): number {
  const st = prim.stations;
  const n = st.length;
  let seg = 0;
  let bestD = Infinity;
  let bestF = 0;
  if (prim.axis) {
    // Achsenmodus: Station nach Höhe (Bogenlänge = Höhe entlang der Achse, monoton), binäre Suche
    const ax = prim.axis;
    const s = (p[0] - st[0]!.p[0]) * ax[0] + (p[1] - st[0]!.p[1]) * ax[1] + (p[2] - st[0]!.p[2]) * ax[2] + st[0]!.arc;
    let lo = 0, hi = n - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (st[mid]!.arc <= s) lo = mid;
      else hi = mid - 1;
    }
    seg = lo;
    const a0 = st[seg]!.arc, a1 = st[seg + 1]!.arc;
    bestF = a1 > a0 ? Math.max(0, Math.min(1, (s - a0) / (a1 - a0))) : 0;
    bestD = 0;
  } else
  // 1. Nächster Punkt auf der **stetigen** Mittellinie: erschöpfende Segmentprojektion (ein Fenster um die nächste
  //    Station übersah bei gekrümmten Linien das wahre Segment → Sprung im Feld → Risse im Netz)
  for (let j = 0; j <= n - 2; j++) {
    const a = st[j]!.p, b = st[j + 1]!.p;
    const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
    const l2 = ex * ex + ey * ey + ez * ez || 1e-12;
    const f = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey + (p[2] - a[2]) * ez) / l2));
    const qx = a[0] + ex * f - p[0], qy = a[1] + ey * f - p[1], qz = a[2] + ez * f - p[2];
    const d = qx * qx + qy * qy + qz * qz;
    if (d < bestD) {
      bestD = d;
      seg = j;
      bestF = f;
    }
  }
  const sA = st[seg]!, sB = st[seg + 1]!;
  const f = bestF;
  const cx = sA.p[0] + (sB.p[0] - sA.p[0]) * f, cy = sA.p[1] + (sB.p[1] - sA.p[1]) * f, cz = sA.p[2] + (sB.p[2] - sA.p[2]) * f;
  let rx = sA.right[0] + (sB.right[0] - sA.right[0]) * f, ry = sA.right[1] + (sB.right[1] - sA.right[1]) * f, rz = sA.right[2] + (sB.right[2] - sA.right[2]) * f;
  let ux = sA.up[0] + (sB.up[0] - sA.up[0]) * f, uy = sA.up[1] + (sB.up[1] - sA.up[1]) * f, uz = sA.up[2] + (sB.up[2] - sA.up[2]) * f;
  const rl = Math.hypot(rx, ry, rz) || 1, ul = Math.hypot(ux, uy, uz) || 1;
  rx /= rl;
  ry /= rl;
  rz /= rl;
  ux /= ul;
  uy /= ul;
  uz /= ul;
  const vx = p[0] - cx, vy = p[1] - cy, vz = p[2] - cz;
  const a = vx * rx + vy * ry + vz * rz;
  const b = vx * ux + vy * uy + vz * uz;
  const sArc = sA.arc + (sB.arc - sA.arc) * f;
  // vor dem Anfang / hinter dem Ende: Anteil entlang der Tangente für Kappen und Profilauslauf
  let over = 0;
  if (prim.axis) {
    const ax = prim.axis;
    const s = (p[0] - st[0]!.p[0]) * ax[0] + (p[1] - st[0]!.p[1]) * ax[1] + (p[2] - st[0]!.p[2]) * ax[2] + st[0]!.arc;
    if (s < st[0]!.arc) over = s - st[0]!.arc;
    else if (s > st[n - 1]!.arc) over = s - st[n - 1]!.arc;
  } else if (seg === 0 && f <= 0) over = vx * sA.tangent[0] + vy * sA.tangent[1] + vz * sA.tangent[2];
  else if (seg === n - 2 && f >= 1) over = vx * sB.tangent[0] + vy * sB.tangent[1] + vz * sB.tangent[2];
  const sEff = sArc + over;
  const rho = Math.hypot(a, b);
  const ca = rho > 1e-9 ? a / rho : 1, cb = rho > 1e-9 ? b / rho : 0;
  // 2. Exakter 2D-Abstand von (ρ, s) zur Profil-Polylinie in dieser Richtung. Das Fenster wächst mit dem radialen
  //    Abstand zur Fläche: weit innen oder außen liegt der nächste Profilpunkt viele Stationen entfernt — ein festes
  //    Fenster sprang beim Verschieben (Risse im Netz)
  const rAt = sectionRadius(sA, ca, cb) * (1 - f) + sectionRadius(sB, ca, cb) * f;
  // Profilsuche vom nächsten Segment nach außen in beide Richtungen; Abbruch, sobald allein der Bogenabstand den
  // besten Treffer übersteigt (der 2D-Abstand ist nie kleiner als |Δs|) — exakt und nahe der Fläche sehr billig
  let best = Infinity;
  const segDist = (j: number): number => {
    const ar = sectionRadius(st[j]!, ca, cb), as = st[j]!.arc;
    const br = sectionRadius(st[j + 1]!, ca, cb), bs = st[j + 1]!.arc;
    const ex = br - ar, ey = bs - as;
    const wx = rho - ar, wy = sEff - as;
    const tt = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-12)));
    const dx = wx - ex * tt, dy = wy - ey * tt;
    return dx * dx + dy * dy;
  };
  best = segDist(seg);
  for (let j = seg - 1; j >= 0; j--) {
    const gap = sEff - st[j + 1]!.arc;
    if (gap > 0 && gap * gap >= best) break;
    best = Math.min(best, segDist(j));
  }
  for (let j = seg + 1; j <= n - 2; j++) {
    const gap = st[j]!.arc - sEff;
    if (gap > 0 && gap * gap >= best) break;
    best = Math.min(best, segDist(j));
  }
  let d = Math.sqrt(best);
  // Vorzeichen nur über den Radius (wie beim Rotationskörper): hält das Feld am Deckel-/Standflächenrand stetig
  if (rho < rAt) d = -d;
  // 3. Kappen: flache Schnitte mit gerundeter Kante (Standfläche, Deckel)
  if (prim.capStart > 0) {
    const bottom = st[0]!.arc - sEff;
    const k = prim.capStart;
    const h = Math.max(k - Math.abs(d - bottom), 0) / k;
    d = Math.max(d, bottom) + h * h * k * 0.25;
  }
  if (prim.capEnd > 0) {
    const top = sEff - st[n - 1]!.arc;
    const k = prim.capEnd;
    const h = Math.max(k - Math.abs(d - top), 0) / k;
    d = Math.max(d, top) + h * h * k * 0.25;
  }
  return d;
}

export interface LoftSpec {
  /** Punkte der Mittellinie (dicht, z. B. aus Catmull-Rom). */
  points: Vec3[];
  /** Bezugsrichtung für „oben“ der Querschnitte (wird je Station orthogonalisiert). */
  upRef: Readonly<Vec3>;
  wx: number[];
  wyT: number[];
  wyB: number[];
  n: number[] | number;
  parts: number[] | number;
  capStart?: number;
  capEnd?: number;
  /** Gerade Bezugsachse (siehe `LoftPrim.axis`); die Punkte müssen entlang der Achse monoton sein. */
  axis?: Readonly<Vec3>;
}

/** Loft aus dichten Stationswerten; Rahmen aus den Tangenten der Mittellinie und einer Bezugsrichtung. */
export function makeLoft(spec: LoftSpec, base: Omit<PrimBase, 'part'> & { part?: number }): LoftPrim {
  // Enden ohne flache Kappe rund schließen: zusätzliche Stationen mit Viertelkreis-Profil (Hals-Ende, Beinansatz im
  // Körper, Schwanzspitze) — sonst liefe die Fläche als Zylinder weiter
  const closeEnd = (atStart: boolean): void => {
    const i = atStart ? 0 : spec.points.length - 1;
    const j = atStart ? 1 : spec.points.length - 2;
    const r = Math.max(spec.wx[i] ?? 0, spec.wyT[i] ?? 0, spec.wyB[i] ?? 0);
    if (r < 1e-4 || spec.points.length < 2) return;
    const a = spec.points[i]!, b = spec.points[j]!;
    let dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl;
    dy /= dl;
    dz /= dl;
    const steps = [0.38, 0.71, 0.92, 1.0];
    const fac = [0.925, 0.7, 0.39, 0];
    const extraP: Vec3[] = [], exW: number[] = [], exT: number[] = [], exB: number[] = [], exN: number[] = [], exPart: number[] = [];
    for (let q = 0; q < steps.length; q++) {
      const t = steps[q]! * r;
      extraP.push([a[0] + dx * t, a[1] + dy * t, a[2] + dz * t]);
      exW.push((spec.wx[i] ?? 0) * fac[q]!);
      exT.push((spec.wyT[i] ?? 0) * fac[q]!);
      exB.push((spec.wyB[i] ?? 0) * fac[q]!);
      exN.push(typeof spec.n === 'number' ? spec.n : (spec.n[i] ?? 2));
      exPart.push(typeof spec.parts === 'number' ? spec.parts : (spec.parts[i] ?? 0));
    }
    if (atStart) {
      spec.points = [...extraP.reverse(), ...spec.points];
      spec.wx = [...exW.reverse(), ...spec.wx];
      spec.wyT = [...exT.reverse(), ...spec.wyT];
      spec.wyB = [...exB.reverse(), ...spec.wyB];
      if (typeof spec.n !== 'number') spec.n = [...exN.reverse(), ...spec.n];
      if (typeof spec.parts !== 'number') spec.parts = [...exPart.reverse(), ...spec.parts];
    } else {
      spec.points = [...spec.points, ...extraP];
      spec.wx = [...spec.wx, ...exW];
      spec.wyT = [...spec.wyT, ...exT];
      spec.wyB = [...spec.wyB, ...exB];
      if (typeof spec.n !== 'number') spec.n = [...spec.n, ...exN];
      if (typeof spec.parts !== 'number') spec.parts = [...spec.parts, ...exPart];
    }
  };
  spec = { ...spec, points: spec.points.slice(), wx: spec.wx.slice(), wyT: spec.wyT.slice(), wyB: spec.wyB.slice(), n: typeof spec.n === 'number' ? spec.n : spec.n.slice(), parts: typeof spec.parts === 'number' ? spec.parts : spec.parts.slice() };
  // (fast) doppelte Nachbarpunkte entfernen: Nullsegmente machen Tangente, Rahmen und Profil unstetig
  {
    let total = 0;
    for (let i = 1; i < spec.points.length; i++) total += Math.hypot(spec.points[i]![0] - spec.points[i - 1]![0], spec.points[i]![1] - spec.points[i - 1]![1], spec.points[i]![2] - spec.points[i - 1]![2]);
    const minSeg = (total / Math.max(1, spec.points.length - 1)) * 0.2;
    for (let i = spec.points.length - 1; i >= 1; i--) {
      const a = spec.points[i]!, b = spec.points[i - 1]!;
      if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < minSeg) {
        spec.points.splice(i, 1);
        spec.wx.splice(i, 1);
        spec.wyT.splice(i, 1);
        spec.wyB.splice(i, 1);
        if (typeof spec.n !== 'number') spec.n.splice(i, 1);
        if (typeof spec.parts !== 'number') spec.parts.splice(i, 1);
      }
    }
  }
  if (!(spec.capEnd && spec.capEnd > 0)) closeEnd(false);
  if (!(spec.capStart && spec.capStart > 0)) closeEnd(true);
  const pts = spec.points;
  const m = pts.length;
  const stations: LoftStation[] = [];
  let arc = 0;
  let axis: Vec3 | null = null;
  if (spec.axis) {
    const al = Math.hypot(spec.axis[0], spec.axis[1], spec.axis[2]) || 1;
    axis = [spec.axis[0] / al, spec.axis[1] / al, spec.axis[2] / al];
  }
  for (let i = 0; i < m; i++) {
    const prev = pts[Math.max(0, i - 1)]!, next = pts[Math.min(m - 1, i + 1)]!;
    let tx = next[0] - prev[0], ty = next[1] - prev[1], tz = next[2] - prev[2];
    if (axis) {
      tx = axis[0];
      ty = axis[1];
      tz = axis[2];
    }
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl;
    ty /= tl;
    tz /= tl;
    // up orthogonal zur Tangente, right = up × tangent
    const u = spec.upRef;
    const du = u[0] * tx + u[1] * ty + u[2] * tz;
    let ux = u[0] - tx * du, uy = u[1] - ty * du, uz = u[2] - tz * du;
    let ul = Math.hypot(ux, uy, uz);
    if (ul < 1e-5) {
      ux = 1 - tx * tx;
      uy = -tx * ty;
      uz = -tx * tz;
      ul = Math.hypot(ux, uy, uz) || 1;
    }
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const rx = uy * tz - uz * ty, ry = uz * tx - ux * tz, rz = ux * ty - uy * tx;
    if (i > 0) arc += axis ? Math.max(1e-6, (pts[i]![0] - pts[i - 1]![0]) * axis[0] + (pts[i]![1] - pts[i - 1]![1]) * axis[1] + (pts[i]![2] - pts[i - 1]![2]) * axis[2]) : Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1], pts[i]![2] - pts[i - 1]![2]);
    stations.push({
      p: [pts[i]![0], pts[i]![1], pts[i]![2]],
      right: [rx, ry, rz],
      up: [ux, uy, uz],
      tangent: [tx, ty, tz],
      wx: Math.max(0, spec.wx[i] ?? 0),
      wyT: Math.max(0, spec.wyT[i] ?? 0),
      wyB: Math.max(0, spec.wyB[i] ?? 0),
      n: typeof spec.n === 'number' ? spec.n : (spec.n[i] ?? 2),
      arc,
      part: typeof spec.parts === 'number' ? spec.parts : (spec.parts[i] ?? 0),
    });
  }
  const prim: LoftPrim = { kind: 'loft', stations, capStart: spec.capStart ?? 0, capEnd: spec.capEnd ?? 0, part: base.part ?? stations[0]!.part, k: base.k, region: base.region, op: base.op };
  if (base.name !== undefined) prim.name = base.name;
  if (axis) prim.axis = axis;
  return prim;
}

export interface SdfScene {
  prims: Prim[];
}

const dot2 = (x: number, y: number, z: number): number => x * x + y * y + z * z;

/** Exakter Abstand zum Rundkegel (Quilez). */
export function sdRoundCone(p: Readonly<Vec3>, a: Readonly<Vec3>, b: Readonly<Vec3>, r1: number, r2: number): number {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  if (l2 < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]) - Math.max(r1, r2);
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = p[0] - a[0], pay = p[1] - a[1], paz = p[2] - a[2];
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const x2 = dot2(pax * l2 - bax * y, pay * l2 - bay * y, paz * l2 - baz * y);
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

/** Ellipsoid-Näherung (Quilez), im lokalen Raum. */
export function sdEllipsoidLocal(x: number, y: number, z: number, r: Readonly<Vec3>): number {
  const rx = Math.max(r[0], 1e-4), ry = Math.max(r[1], 1e-4), rz = Math.max(r[2], 1e-4);
  const k0 = Math.hypot(x / rx, y / ry, z / rz);
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return k1 > 1e-12 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}

/** Gerundeter Quader im lokalen Raum. */
export function sdRoundBoxLocal(x: number, y: number, z: number, b: Readonly<Vec3>, round: number): number {
  const qx = Math.abs(x) - b[0], qy = Math.abs(y) - b[1], qz = Math.abs(z) - b[2];
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qy, qz), 0) - round;
}

export function sdEllipsoid(p: Readonly<Vec3>, prim: EllipsoidPrim): number {
  let x = p[0] - prim.c[0], y = p[1] - prim.c[1], z = p[2] - prim.c[2];
  if (prim.q) {
    // in den lokalen Raum drehen (inverse Rotation, ohne Allokation)
    const qx = -prim.q[0], qy = -prim.q[1], qz = -prim.q[2], qw = prim.q[3];
    const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
    const nx = x + qw * tx + (qy * tz - qz * ty), ny = y + qw * ty + (qz * tx - qx * tz), nz = z + qw * tz + (qx * ty - qy * tx);
    x = nx;
    y = ny;
    z = nz;
  }
  const d = sdEllipsoidLocal(x, y, z, prim.r);
  const kubik = prim.kubik ?? 0;
  if (kubik <= 0) return d;
  const rho = 0.35 * Math.min(prim.r[0], prim.r[1], prim.r[2]);
  const b: Vec3 = [prim.r[0] - rho, prim.r[1] - rho, prim.r[2] - rho];
  return lerp(d, sdRoundBoxLocal(x, y, z, b, rho), kubik);
}

/** Vorzeichenbehafteter Abstand zum geschlossenen 2D-Polygon (Quilez), negativ innen. */
export function sdPolygon2(poly: ReadonlyArray<readonly [number, number]>, px: number, py: number): number {
  const n = poly.length;
  let d = Infinity;
  let s = 1;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [ax, ay] = poly[i]!;
    const [bx, by] = poly[j]!;
    const ex = bx - ax, ey = by - ay;
    const wx = px - ax, wy = py - ay;
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-12), 0, 1);
    const bxp = wx - ex * t, byp = wy - ey * t;
    d = Math.min(d, bxp * bxp + byp * byp);
    const c1 = py >= ay, c2 = py < by, c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}

/** Radius und Steigung der Tabelle an Höhe y (Catmull-Rom zwischen den Stützstellen). */
function radiusAt(prim: RevolvePrim, y: number): { r: number; dr: number } {
  const n = prim.radii.length;
  const t = (Math.max(0, Math.min(prim.height, y)) / prim.height) * (n - 1);
  const i = Math.min(n - 2, Math.max(0, Math.floor(t)));
  const f = t - i;
  const r0 = prim.radii[Math.max(0, i - 1)]!, r1 = prim.radii[i]!, r2 = prim.radii[i + 1]!, r3 = prim.radii[Math.min(n - 1, i + 2)]!;
  const f2 = f * f, f3 = f2 * f;
  const r = 0.5 * (2 * r1 + (-r0 + r2) * f + (2 * r0 - 5 * r1 + 4 * r2 - r3) * f2 + (-r0 + 3 * r1 - 3 * r2 + r3) * f3);
  const drdf = 0.5 * ((-r0 + r2) + 2 * (2 * r0 - 5 * r1 + 4 * r2 - r3) * f + 3 * (-r0 + 3 * r1 - 3 * r2 + r3) * f2);
  const dr = (drdf * (n - 1)) / prim.height;
  return { r, dr };
}

export function sdRevolve(p: Readonly<Vec3>, prim: RevolvePrim): number {
  const y = p[1] - prim.c[1];
  const x = p[0] - prim.c[0];
  const z = p[2] - prim.c[2] - prim.shear * y;
  const sm = Math.sqrt(prim.sx * prim.sz);
  let q: number;
  if (prim.n <= 2.001) q = Math.hypot(x / prim.sx, z / prim.sz) * sm;
  else {
    const ax = Math.abs(x / prim.sx), az = Math.abs(z / prim.sz);
    q = Math.pow(Math.pow(ax, prim.n) + Math.pow(az, prim.n), 1 / prim.n) * sm;
  }
  const H = prim.height;
  // Exakter 2D-Abstand von (q, y) zur Profil-Polylinie in der Nähe der Höhe y (vier Segmente), Vorzeichen aus r(y).
  // Die reine Steigungskorrektur versagte am Scheitel (Steigung → ∞ machte alle Abstände ≈ 0 → ausgefranste Kante).
  const n = prim.radii.length;
  const step = H / (n - 1);
  const yc = Math.max(0, Math.min(H, y));
  const i0 = Math.min(n - 2, Math.max(0, Math.floor(yc / step)));
  let best = Infinity;
  for (let i = Math.max(0, i0 - 3); i <= Math.min(n - 2, i0 + 2); i++) {
    const ay = i * step, ar = prim.radii[i]!;
    const by = (i + 1) * step, br = prim.radii[i + 1]!;
    const ex = br - ar, ey = by - ay;
    const wx = q - ar, wy = y - ay;
    const tt = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-12)));
    const dx = wx - ex * tt, dy = wy - ey * tt;
    best = Math.min(best, dx * dx + dy * dy);
  }
  const { r } = radiusAt(prim, yc);
  let side = Math.sqrt(best);
  // innen = innerhalb des (nach oben und unten verlängerten) Seitenprofils; Deckel und Standfläche schließen es unten
  // über max() ab. Nur nach q zu entscheiden hält das Feld auf y = H und y = 0 stetig (sonst Spitzen am Deckelrand).
  if (q < r) side = -side;
  // Standfläche: Schnitt mit dem Halbraum y ≥ 0, Kante gerundet
  const bottom = -y;
  const k = prim.round;
  const h = Math.max(k - Math.abs(side - bottom), 0) / (k || 1e-6);
  let d = Math.max(side, bottom) + h * h * k * 0.25;
  // Deckel: Schnitt mit y ≤ H (bei Würfeligkeit bleibt der Radius oben erhalten, die Kante wird gerundet)
  const kt = prim.topRound ?? 0;
  if (kt > 0) {
    const top = y - H;
    const ht = Math.max(kt - Math.abs(d - top), 0) / kt;
    d = Math.max(d, top) + ht * ht * kt * 0.25;
  }
  return d - prim.round * 0.35;
}

export function sdTube(p: Readonly<Vec3>, prim: TubePrim): number {
  const pts = prim.points, rr = prim.radii;
  const n = rr.length;
  const segs = prim.closed ? n : n - 1;
  let best = Infinity;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    const ax = pts[i * 3]!, ay = pts[i * 3 + 1]!, az = pts[i * 3 + 2]!;
    const bx = pts[j * 3]!, by = pts[j * 3 + 1]!, bz = pts[j * 3 + 2]!;
    const ex = bx - ax, ey = by - ay, ez = bz - az;
    const wx = p[0] - ax, wy = p[1] - ay, wz = p[2] - az;
    const l2 = ex * ex + ey * ey + ez * ez || 1e-12;
    const tt = Math.max(0, Math.min(1, (wx * ex + wy * ey + wz * ez) / l2));
    const dx = wx - ex * tt, dy = wy - ey * tt, dz = wz - ez * tt;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) - (rr[i]! + (rr[j]! - rr[i]!) * tt);
    if (d < best) best = d;
  }
  return best;
}

export function sdPrim(p: Readonly<Vec3>, prim: Prim): number {
  switch (prim.kind) {
    case 'tube':
      return sdTube(p, prim);
    case 'capsule':
      return sdRoundCone(p, prim.a, prim.b, prim.ra, prim.rb);
    case 'ellipsoid':
      return sdEllipsoid(p, prim);
    case 'revolve':
      return sdRevolve(p, prim);
    case 'loft':
      return sdLoft(p, prim);
    case 'custom':
      return prim.eval(p);
  }
}

interface CompiledScene {
  n: number;
  bmin: Float64Array;
  bmax: Float64Array;
  k: Float64Array;
  isUnion: Uint8Array;
  unionIdx: Int32Array;
  subIdx: Int32Array;
}

const compiledCache = new WeakMap<SdfScene, CompiledScene>();

/** Hüllquader und Reihenfolgen einmal je Szene (Primitive gelten als unveränderlich). */
export function compileScene(scene: SdfScene): CompiledScene {
  let c = compiledCache.get(scene);
  if (c && c.n === scene.prims.length) return c;
  const n = scene.prims.length;
  const bmin = new Float64Array(n * 3), bmax = new Float64Array(n * 3), k = new Float64Array(n), isUnion = new Uint8Array(n);
  const u: number[] = [], s: number[] = [];
  scene.prims.forEach((pr, i) => {
    const b = primBounds(pr);
    bmin[i * 3] = b.min[0];
    bmin[i * 3 + 1] = b.min[1];
    bmin[i * 3 + 2] = b.min[2];
    bmax[i * 3] = b.max[0];
    bmax[i * 3 + 1] = b.max[1];
    bmax[i * 3 + 2] = b.max[2];
    k[i] = pr.k;
    isUnion[i] = pr.op === 'union' ? 1 : 0;
    (pr.op === 'union' ? u : s).push(i);
  });
  c = { n, bmin, bmax, k, isUnion, unionIdx: Int32Array.from(u), subIdx: Int32Array.from(s) };
  compiledCache.set(scene, c);
  return c;
}

/** Untere Schranke des Abstands von p zum Hüllquader i (0 innerhalb). */
function boundsDistanceAt(c: CompiledScene, i: number, p: Readonly<Vec3>): number {
  const o = i * 3;
  const dx = Math.max(c.bmin[o]! - p[0], 0, p[0] - c.bmax[o]!);
  const dy = Math.max(c.bmin[o + 1]! - p[1], 0, p[1] - c.bmax[o + 1]!);
  const dz = Math.max(c.bmin[o + 2]! - p[2], 0, p[2] - c.bmax[o + 2]!);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Gesamtabstand der Szene: weiche Vereinigung aller `union`-Primitive, dann weiche Subtraktion der `subtract`.
 * Primitive, deren Hüllquader weiter als d + k entfernt liegt, können das Smooth-Min nicht mehr ändern und werden
 * übersprungen (Lippenkapseln, Zehen …).
 */
export function evalScene(scene: SdfScene, p: Readonly<Vec3>): number {
  const c = compileScene(scene);
  const prims = scene.prims;
  let d = 1e9;
  const ui = c.unionIdx;
  for (let q = 0; q < ui.length; q++) {
    const i = ui[q]!;
    // nur außerhalb des Quaders culln: innen ist die Schranke 0 und sagt nichts über ein tiefer liegendes Primitiv
    // (sonst wird bei negativem d ein weiter innen liegendes Teil übersprungen → Sprung im Feld, Risse im Netz)
    if (d < 1e8) {
      const bd = boundsDistanceAt(c, i, p);
      if (bd > 0 && bd >= d + c.k[i]!) continue;
    }
    d = smin(d, sdPrim(p, prims[i]!), c.k[i]!);
  }
  const si = c.subIdx;
  for (let q = 0; q < si.length; q++) {
    const i = si[q]!;
    const bd = boundsDistanceAt(c, i, p);
    if (bd > 0 && bd >= c.k[i]! + Math.abs(d) + 1e-3) continue;
    d = smax(d, -sdPrim(p, prims[i]!), c.k[i]!);
  }
  return d;
}

export interface SceneSample {
  d: number;
  /** Abstand der reinen Vereinigung (ohne Subtraktionen). */
  dUnion: number;
  /** Kleinster Abstand zu einer Subtraktion (negativ = innerhalb einer Höhle). */
  dSubtract: number;
  /** Index der nächsten Subtraktion oder −1. */
  nearestSubtract: number;
  /** Abstand je Primitiv (Index wie `scene.prims`). */
  per: Float64Array;
}

/** Wie `evalScene`, zusätzlich mit allen Einzelabständen (für Gewichte, Regionen, Teilzuordnung). */
export function evalSceneDetailed(scene: SdfScene, p: Readonly<Vec3>, out?: SceneSample, farCull = Infinity): SceneSample {
  const prims = scene.prims;
  const c = compileScene(scene);
  const per = out?.per && out.per.length === prims.length ? out.per : new Float64Array(prims.length);
  let dU = 1e9;
  let dS = 1e9;
  let nearestSubtract = -1;
  for (let i = 0; i < prims.length; i++) {
    const pr = prims[i]!;
    const bd = boundsDistanceAt(c, i, p);
    const di = bd > farCull ? bd : sdPrim(p, pr);
    per[i] = di;
    if (pr.op === 'union') dU = smin(dU, di, pr.k);
    else if (di < dS) {
      dS = di;
      nearestSubtract = i;
    }
  }
  let d = dU;
  for (let i = 0; i < prims.length; i++) {
    const pr = prims[i]!;
    if (pr.op !== 'subtract') continue;
    d = smax(d, -per[i]!, pr.k);
  }
  const res = out ?? ({ d, dUnion: dU, dSubtract: dS, nearestSubtract, per } as SceneSample);
  res.d = d;
  res.dUnion = dU;
  res.dSubtract = dS;
  res.nearestSubtract = nearestSubtract;
  res.per = per;
  return res;
}

/** Gradient per Tetraeder-Differenz (vier Auswertungen; Normale = normalize(grad)). */
export function sceneGradient(scene: SdfScene, p: Readonly<Vec3>, e: number, out: Vec3): Vec3 {
  return tetraGradient((q) => evalScene(scene, q), p, e, out);
}

const _t0: Vec3 = [0, 0, 0];
/** Tetraeder-Gradient einer beliebigen Abstandsfunktion (4 Auswertungen). */
export function tetraGradient(f: (p: Readonly<Vec3>) => number, p: Readonly<Vec3>, e: number, out: Vec3): Vec3 {
  _t0[0] = p[0] + e; _t0[1] = p[1] - e; _t0[2] = p[2] - e;
  const a = f(_t0);
  _t0[0] = p[0] - e; _t0[1] = p[1] - e; _t0[2] = p[2] + e;
  const b = f(_t0);
  _t0[0] = p[0] - e; _t0[1] = p[1] + e; _t0[2] = p[2] - e;
  const c = f(_t0);
  _t0[0] = p[0] + e; _t0[1] = p[1] + e; _t0[2] = p[2] + e;
  const d = f(_t0);
  out[0] = (a - b - c + d) / (4 * e);
  out[1] = (-a - b + c + d) / (4 * e);
  out[2] = (-a + b - c + d) / (4 * e);
  return out;
}

/** Hüllquader eines Primitivs (grob, mit Blendrand). */
export function primBounds(prim: Prim): { min: Vec3; max: Vec3 } {
  switch (prim.kind) {
    case 'capsule': {
      const r = Math.max(prim.ra, prim.rb);
      return {
        min: [Math.min(prim.a[0], prim.b[0]) - r, Math.min(prim.a[1], prim.b[1]) - r, Math.min(prim.a[2], prim.b[2]) - r],
        max: [Math.max(prim.a[0], prim.b[0]) + r, Math.max(prim.a[1], prim.b[1]) + r, Math.max(prim.a[2], prim.b[2]) + r],
      };
    }
    case 'ellipsoid': {
      const r = Math.max(prim.r[0], prim.r[1], prim.r[2]);
      return { min: [prim.c[0] - r, prim.c[1] - r, prim.c[2] - r], max: [prim.c[0] + r, prim.c[1] + r, prim.c[2] + r] };
    }
    case 'revolve': {
      let rmax = 0;
      for (let i = 0; i < prim.radii.length; i++) rmax = Math.max(rmax, prim.radii[i]!);
      const sm = Math.sqrt(prim.sx * prim.sz);
      const rx = (rmax / sm) * prim.sx + prim.round;
      const rz = (rmax / sm) * prim.sz + prim.round + Math.abs(prim.shear) * prim.height;
      return { min: [prim.c[0] - rx, prim.c[1] - prim.round, prim.c[2] - rz], max: [prim.c[0] + rx, prim.c[1] + prim.height + prim.round, prim.c[2] + rz] };
    }
    case 'tube': {
      const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
      let rmax = 0;
      for (let i = 0; i < prim.radii.length; i++) {
        rmax = Math.max(rmax, prim.radii[i]!);
        for (let c = 0; c < 3; c++) {
          min[c] = Math.min(min[c]!, prim.points[i * 3 + c]!);
          max[c] = Math.max(max[c]!, prim.points[i * 3 + c]!);
        }
      }
      return { min: [min[0] - rmax, min[1] - rmax, min[2] - rmax], max: [max[0] + rmax, max[1] + rmax, max[2] + rmax] };
    }
    case 'loft': {
      const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
      for (const s of prim.stations) {
        const r = Math.max(s.wx, s.wyT, s.wyB) + Math.max(prim.capStart, prim.capEnd);
        for (let c = 0; c < 3; c++) {
          min[c] = Math.min(min[c]!, s.p[c]! - r);
          max[c] = Math.max(max[c]!, s.p[c]! + r);
        }
      }
      return { min, max };
    }
    case 'custom':
      return prim.bounds;
  }
}

/** Hüllquader der Vereinigung (Subtraktionen vergrößern nichts). */
export function sceneBounds(scene: SdfScene): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const pr of scene.prims) {
    if (pr.op !== 'union') continue;
    const b = primBounds(pr);
    for (let c = 0; c < 3; c++) {
      min[c] = Math.min(min[c]!, b.min[c]! - pr.k * 0.5);
      max[c] = Math.max(max[c]!, b.max[c]! + pr.k * 0.5);
    }
  }
  return { min, max };
}
