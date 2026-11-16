// Ozzy als 2,5D-Puppe aus wenigen Bézier-Ankern. Kopfteile morphen über den Blickwinkel θ, Rumpf, Kehle und Schwanz über die
// Richtung ψ; die Gipsbeine sind Säulen mit runder Hüfte (der dunkle Schatten daneben ist das ferne Bein, Florian 16.11.).
// Die Teile hängen an 3D-Ankern (Hüften, Hals, Schwanzwurzel), werden gedreht, projiziert und nach Tiefe gezeichnet.
// Ohren, Schopf und Schwanz werden gebogen (Wurzel fest, Spitze schwingt), nie wie Pappe gedreht oder gequetscht.
import { type AnkerForm, ankerAffin, ankerDrehen, ankerFormenAnlegen } from './anker';
import { koerperAnker, kopfAnker } from './daten/anker';
import type { Pose } from './pose';

export const BODEN_Y = 1573;
const RAD = Math.PI / 180;

export interface Zeichenteil {
  name: string;
  farbe: 'schwarz' | 'weiss';
  /** 'bezier': je Anker [x, y, einX, einY, ausX, ausY] (Griffe relativ); 'vieleck': x, y je Punkt */
  art: 'bezier' | 'vieleck';
  p: Float32Array;
  n: number;
  tiefe: number;
}

// ---- Maße (aus dem Logo und Florians Ansichten) ------------------------------------------------------------------------
export const ANKER = { x: 800, y: 1180 };
/** Kopfanker relativ zum Körperanker, im Körper (X vorn, Y unten, Z zur linken Seite des Hundes) */
const KOPF = { X: 350, Y: -480, Z: 0 };
/** Halsgelenk relativ zum Kopfanker (Drehpunkt für Nicken und Neigen) */
const HALS = { x: 0, y: 230 };
const SCHWANZ = { X: -400, Y: -230, Z: 0 };

interface Bein {
  name: 'VN' | 'VF' | 'HN' | 'HF';
  /** vorn–hinten, wenn das Bein zum Betrachter steht; steht es fern, rückt es um `versatz` nach vorn (Florians Schatten) */
  X: number;
  versatz: number;
  Z: number;
}
export const BEINE: Bein[] = [
  { name: 'HF', X: -323.5, versatz: 110, Z: 264.5 },
  { name: 'VF', X: 214, versatz: 113, Z: 207.5 },
  { name: 'HN', X: -323.5, versatz: 110, Z: -265.5 },
  { name: 'VN', X: 214, versatz: 113, Z: -202.5 },
];
/** Gips: Breite, Länge Hüfte–Sohle, Eckradius der Sohle, Fenster */
export const KASTEN = { B: 326, H: 393, r: 59, fensterB: 190, fensterOben: 28, fensterUnten: 325 };

/** Lage eines Beins vorn–hinten je Blickrichtung: das ferne Bein steht immer um den Versatz weiter vorn (wie gezeichnet) */
function beinX(b: Bein, sPsi: number): number {
  const rechts = b.Z < 0;
  return b.X + b.versatz * (rechts ? (1 - sPsi) / 2 : (1 + sPsi) / 2);
}

/** Stützen des Rumpfs (Sitzen, Kippen, Hinfallen): Körperlage X, Y */
const STUETZEN = [
  { X: -470, Y: 205 },
  { X: -380, Y: 230 },
  { X: 470, Y: 150 },
];

// ---- Rückseite und fehlende Ansichten -----------------------------------------------------------------------------------
/** affine Hilfe für Anker-Arrays (relativ zum Teil-Anker): um (cx, cy) skalieren */
function zusammen(p: Float32Array, n: number, cx: number, cy: number, sx: number, sy: number): Float32Array {
  const q = p.slice();
  ankerAffin(q, n, sx, 0, 0, sy, cx - cx * sx, cy - cy * sy);
  return q;
}

/** Was Florians Zeichnungen nicht haben (90° → 180°). Das Gesicht wird zur rechten Kante hin schmal (der schwarze Kopf dahinter
 *  ist dann der Hinterkopf); die Kuppel oben schließt glatt; Ohren und Schopf zeigen hinten ihren gespiegelten Umriss. */
function rueckseiten(name: string, eigen: Record<number, Float32Array>, form: AnkerForm): void {
  const n = form.n;
  if (name === 'gesicht') {
    eigen[135] = zusammen(eigen[90]!, n, 470, 30, 0.2, 0.72);
    eigen[180] = zusammen(eigen[90]!, n, 500, 30, 0.02, 0.5);
  } else if (name === 'nase') {
    eigen[135] = eigen[90]!.slice();
    eigen[180] = eigen[90]!.slice();
  } else if (name === 'kopf') {
    const h = eigen[0]!.slice(); // nicht gespiegelt: jeder Anker bleibt auf seiner Bildseite
    const von = form.marken['eV']!;
    for (let i = von; i < n; i++) {
      const x = h[i * 6]!;
      const u = Math.min(1, Math.abs(x) / 551);
      h[i * 6 + 1] = Math.min(h[i * 6 + 1]!, -72 - 263 * Math.sqrt(1 - u * u));
    }
    eigen[180] = h;
    const s = eigen[90]!;
    const k = new Float32Array(s.length);
    for (let i = 0; i < n; i++) {
      const sx = s[i * 6]! > 120 ? 120 + (s[i * 6]! - 120) * 0.35 : s[i * 6]!;
      k[i * 6] = (sx + h[i * 6]!) / 2;
      k[i * 6 + 1] = (s[i * 6 + 1]! + h[i * 6 + 1]!) / 2;
      for (let o = 2; o < 6; o++) k[i * 6 + o] = (s[i * 6 + o]! + h[i * 6 + o]!) / 2;
    }
    eigen[135] = k;
  }
  if (name === 'schopf') {
    // im Profil: dieselbe Flamme (nur wenig kleiner), hinter das vordere Ohr geschoben; sie gleitet, statt zu schrumpfen
    let cx = 0;
    let cy = 0;
    const q = eigen[15]!;
    for (let i = 0; i < n; i++) {
      cx += q[i * 6]!;
      cy += q[i * 6 + 1]!;
    }
    cx /= n;
    cy /= n;
    const k = 0.6;
    const ziel = [1108 - 1150, 168 - 700];
    const p = q.slice();
    ankerAffin(p, n, k, 0, 0, k, ziel[0]! - cx * k, ziel[1]! - cy * k);
    eigen[90] = p;
  }
  if (name === 'schopf' || name === 'ohrH' || name === 'ohrV') {
    // hinten wie vorn: Ohren und Schopf gehen beim Weiterdrehen denselben Weg zurück (von hinten sieht man nicht, welches Ohr
    // welches ist). Nichts kreuzt, nichts klappt um, keine Form wird dünn.
    eigen[180] = eigen[0]!.slice();
  }
}

const ART_KOPF = (name: string) => (name === 'ohrH' || name === 'ohrV' || name === 'schopf' || name === 'nase' ? 'dreh' : 'gerade');
const ART_KOERPER = (name: string) => (name === 'schwanz' || name === 'schwanzloch' ? 'dreh' : 'gerade');

export class Figur {
  readonly kopf: Map<string, AnkerForm>;
  readonly koerper: Map<string, AnkerForm>;
  private puffer = new Map<string, Float32Array>();
  ferneBeineSchwarz = true;

  constructor() {
    this.kopf = ankerFormenAnlegen(kopfAnker, ART_KOPF, rueckseiten, (name) => name === 'schopf');
    this.koerper = ankerFormenAnlegen(koerperAnker, ART_KOERPER);
  }

  private buf(name: string, laenge: number): Float32Array {
    let b = this.puffer.get(name);
    if (!b || b.length !== laenge) {
      b = new Float32Array(laenge);
      this.puffer.set(name, b);
    }
    return b;
  }

  /** Körperlage (X, Y, Z) → Welt (x, y) und Tiefe (zum Betrachter +) */
  koerperPunkt(pose: Pose, X: number, Y: number, Z: number): [number, number, number] {
    const p = pose.nicken * RAD;
    const q = pose.rollen * RAD;
    const s = pose.psi * RAD;
    const x1 = X * Math.cos(p) - Y * Math.sin(p);
    const y1 = X * Math.sin(p) + Y * Math.cos(p);
    const y2 = y1 * Math.cos(q) - Z * Math.sin(q);
    const z2 = y1 * Math.sin(q) + Z * Math.cos(q);
    const sx = x1 * Math.sin(s) + z2 * Math.cos(s);
    const tiefe = x1 * Math.cos(s) - z2 * Math.sin(s);
    return [pose.x + sx, pose.y + y2 - pose.heben, tiefe];
  }

  /** Kopfanker in Weltkoordinaten (für Federn und Blicke) */
  kopfPunkt(pose: Pose): [number, number] {
    const [x, y] = this.koerperPunkt(pose, KOPF.X, KOPF.Y, KOPF.Z);
    return [x + pose.kopfX, y + pose.kopfY];
  }

  /** tiefster Punkt eines Gipses unter der Hüfte bei Kippung β (Grad) */
  static fussTiefe(beta: number): number {
    const b = Math.abs(beta) * RAD;
    return (KASTEN.H - KASTEN.r) * Math.cos(b) + (KASTEN.B / 2 - KASTEN.r) * Math.sin(b) + KASTEN.r;
  }

  /** Reichweite (Abstand nach unten vom Körperanker) der tiefsten Stütze bei Nicken p */
  private reichweiten(pose: Pose, p: number): number {
    const sp = Math.sin(p * RAD);
    const cp = Math.cos(p * RAD);
    const q = pose.rollen * RAD;
    const sPsi = Math.sin(pose.psi * RAD);
    let max = -Infinity;
    for (const b of BEINE) {
      const winkel = (pose[`bein${b.name}` as const] as number) - p;
      const hub = pose[`hub${b.name}` as const] as number;
      const hy = beinX(b, sPsi) * sp;
      const hy2 = hy * Math.cos(q) - b.Z * Math.sin(q);
      const r = hy2 + Figur.fussTiefe(winkel) - hub;
      if (r > max) max = r;
    }
    for (const s of STUETZEN) {
      const r = s.X * sp + s.Y * cp;
      if (r > max) max = r;
    }
    return max;
  }

  /** Boden-Löser: Höhe (und mit `frei` auch das Nicken), so dass Ozzy auf seinen tiefsten Stützen ruht */
  boden(pose: Pose, frei = 0): void {
    if (pose.boden <= 0) return;
    let p = pose.nicken;
    if (frei > 0) {
      let best = p;
      let bestY = -Infinity;
      for (let d = -25; d <= 25; d += 1) {
        const y = -this.reichweiten(pose, pose.nicken + d);
        if (y > bestY + 1e-6) {
          bestY = y;
          best = pose.nicken + d;
        }
      }
      for (let schritt = 0.5; schritt > 0.02; schritt /= 2)
        for (const d of [-schritt, schritt]) {
          const y = -this.reichweiten(pose, best + d);
          if (y > bestY) {
            bestY = y;
            best += d;
          }
        }
      p = pose.nicken + (best - pose.nicken) * frei;
    }
    const y = BODEN_Y - this.reichweiten(pose, p) + pose.heben;
    pose.y = pose.y + (y - pose.y) * pose.boden;
    pose.nicken = p;
  }

  /** Alle Teile für eine Pose, nach Tiefe sortiert */
  zeichenteile(pose: Pose): Zeichenteil[] {
    const teile: Zeichenteil[] = [];
    const psi = pose.psi;
    const sPsi = Math.sin(psi * RAD);
    const cPsi = Math.cos(psi * RAD);
    this.rumpfTeile(pose, sPsi, cPsi, teile);
    this.schwanzTeile(pose, sPsi, teile);
    for (const b of BEINE) this.bein(pose, b, sPsi, cPsi, teile);
    this.kopfTeile(pose, teile);
    teile.sort((a, b) => a.tiefe - b.tiefe);
    return teile;
  }

  private rumpfTeile(pose: Pose, sPsi: number, cPsi: number, teile: Zeichenteil[]): void {
    const winkel = (pose.nicken * sPsi + pose.rollen * cPsi) * RAD;
    const c = Math.cos(winkel);
    const s = Math.sin(winkel);
    const [ax, ay] = this.koerperPunkt(pose, 0, 0, 0);
    const at = pose.atmen * 0.012;
    const st = pose.stauchen;
    const sx = 1 + at - st * 0.5;
    const sy = 1 + at + st;
    const my = -150;
    for (const name of ['rumpf', 'kehle'] as const) {
      const f = this.koerper.get(name)!;
      const p = this.buf(name, f.n * 6);
      f.auswerten(pose.psi, p);
      // Atmen/Stauchen um die Mitte des Rumpfs, dann drehen und an den Anker
      ankerAffin(p, f.n, sx, 0, 0, sy, 0, my - my * sy);
      ankerAffin(p, f.n, c, -s, s, c, ax, ay);
      teile.push({ name, farbe: 'schwarz', art: 'bezier', p, n: f.n, tiefe: name === 'kehle' ? 0.02 : 0 });
    }
  }

  private schwanzTeile(pose: Pose, sPsi: number, teile: Zeichenteil[]): void {
    const [sx, sy, st] = this.koerperPunkt(pose, SCHWANZ.X, SCHWANZ.Y, SCHWANZ.Z);
    // Seitenansicht des Rings; zeigt Ozzy nach links, gespiegelt. Gewechselt wird vorn (dort liegt der Schwanz hinter dem Rumpf).
    const seite = sPsi >= 0 ? 1 : -1;
    const ring = this.koerper.get('schwanz')!;
    const loch = this.koerper.get('schwanzloch')!;
    const pr = this.buf('schwanz', ring.n * 6);
    const pl = this.buf('schwanzloch', loch.n * 6);
    ring.auswerten(90, pr);
    loch.auswerten(90, pl);
    // Biegen: Wurzel (Mitte zwischen TT und TB) fest, je weiter weg, desto mehr Drehung
    const [tx, ty] = ring.marke(pr, 'TT');
    const [bx, by] = ring.marke(pr, 'TB');
    const wx = (tx + bx) / 2;
    const wy = (ty + by) / 2;
    const biege = (p: Float32Array, n: number) => {
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(p[i * 6]! - wx, p[i * 6 + 1]! - wy);
        const g = Math.min(1, Math.max(0, (d - 60) / 220));
        ankerDrehen(p, i, wx, wy, -pose.schwanz * RAD * g * g * (3 - 2 * g));
      }
    };
    biege(pr, ring.n);
    biege(pl, loch.n);
    const w = pose.nicken * sPsi * RAD;
    const c = Math.cos(w);
    const s = Math.sin(w);
    for (const [name, f, p] of [
      ['schwanz', ring, pr],
      ['schwanzloch', loch, pl],
    ] as const) {
      ankerAffin(p, f.n, seite * c, -s, seite * s, c, sx, sy);
      teile.push({ name, farbe: f.farbe, art: 'bezier', p, n: f.n, tiefe: st + 1 + (name === 'schwanzloch' ? 0.01 : 0) });
    }
  }

  private bein(pose: Pose, b: Bein, sPsi: number, cPsi: number, teile: Zeichenteil[]): void {
    const alpha = pose[`bein${b.name}` as const] as number;
    const hub = pose[`hub${b.name}` as const] as number;
    const [hx, hy0, tiefe] = this.koerperPunkt(pose, beinX(b, sPsi), 0, b.Z);
    const hy = hy0 - hub;
    const a = (alpha - pose.nicken) * RAD;
    const q = pose.rollen * RAD;
    const dX = Math.sin(a);
    const dY = Math.cos(a) * Math.cos(q);
    const dZ = Math.cos(a) * Math.sin(q);
    const dx = dX * sPsi + dZ * cPsi;
    const dy = dY;
    const lang = Math.hypot(dx, dy) || 1;
    const phi = Math.atan2(-dx, dy);
    const cf = Math.cos(phi);
    const sf = Math.sin(phi);
    const setze = (pts: number[], breite = 1): Float32Array => {
      const out = new Float32Array(pts.length);
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i]! * breite;
        const y = pts[i + 1]! * lang;
        out[i] = hx + x * cf - y * sf;
        out[i + 1] = hy + x * sf + y * cf;
      }
      return out;
    };
    const k = setze(saeuleUmriss());
    teile.push({ name: `bein${b.name}`, farbe: 'schwarz', art: 'vieleck', p: k, n: k.length / 2, tiefe });
    const sicht = this.ferneBeineSchwarz ? Math.min(1, Math.max(0, (tiefe + 30) / 60)) : 1;
    if (sicht <= 0.001) return;
    const f = setze(fensterUmriss(sicht));
    teile.push({ name: `fenster${b.name}`, farbe: 'weiss', art: 'vieleck', p: f, n: f.length / 2, tiefe: tiefe + 0.01 });
  }

  private kopfTeile(pose: Pose, teile: Zeichenteil[]): void {
    const th = pose.theta;
    const [ax, ay, tiefeHals] = this.koerperPunkt(pose, KOPF.X, KOPF.Y, KOPF.Z);
    const sPsi = Math.sin(pose.psi * RAD);
    const tiefe = tiefeHals + 400 * Math.max(0, Math.abs(sPsi)) ** 2;
    const sTh = Math.sin(th * RAD);
    const cTh = Math.cos(th * RAD);
    const winkel = (pose.kopfNeigen * cTh + pose.kopfNicken * sTh) * RAD;
    const c = Math.cos(winkel);
    const s = Math.sin(winkel);
    const kx = ax + pose.kopfX;
    const ky = ay + pose.kopfY + pose.kopfNicken * cTh * 2.2;
    const wink = ((((th + 180) % 360) + 360) % 360) - 180;
    const weg = Math.abs(wink);
    // hinten herum: die Nase wandert hinter den Kopf (wird verdeckt, nicht kleiner)
    const reihe = weg > 100 ? ['ohrH', 'ohrV', 'schopf', 'nase', 'kopf', 'gesicht'] : ['ohrH', 'ohrV', 'schopf', 'kopf', 'gesicht', 'nase'];
    reihe.forEach((name, k) => {
      const f = this.kopf.get(name)!;
      const p = this.buf(name, f.n * 6);
      f.auswerten(th, p);
      this.ortlich(name, f, p, pose);
      // um das Halsgelenk drehen, an den Kopfanker
      ankerAffin(p, f.n, c, -s, s, c, kx + HALS.x - (HALS.x * c - HALS.y * s), ky + HALS.y - (HALS.x * s + HALS.y * c));
      teile.push({ name, farbe: f.farbe, art: 'bezier', p, n: f.n, tiefe: tiefe + k * 0.01 });
    });
  }

  /** Örtliche Verformungen an den Ankern: Ohren und Schopf biegen, Schlitze heben/kippen, Nase schnüffeln, Bart schwingen */
  private ortlich(name: string, f: AnkerForm, p: Float32Array, pose: Pose): void {
    const n = f.n;
    if (name === 'ohrH' || name === 'ohrV' || name === 'schopf') {
      const wert = name === 'schopf' ? pose.schopf : (pose[name] as number);
      if (!wert) return;
      // Wurzel = Mitte zwischen c (innen) und e (außen); Achse zur Spitze b; je weiter zur Spitze, desto mehr Drehung
      const [cx, cy] = f.marke(p, 'c');
      const [ex, ey] = f.marke(p, 'e');
      const wx = (cx + ex) / 2;
      const wy = (cy + ey) / 2;
      const [bx, by] = f.marke(p, 'b');
      const ax = bx - wx;
      const ay = by - wy;
      const l2 = ax * ax + ay * ay || 1;
      const seite = bx < wx ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const u = ((p[i * 6]! - wx) * ax + (p[i * 6 + 1]! - wy) * ay) / l2;
        const g = Math.min(1, Math.max(0, u));
        ankerDrehen(p, i, wx, wy, wert * seite * RAD * g * g * (3 - 2 * g));
      }
      return;
    }
    if (name === 'gesicht' && (pose.brauen || pose.brauenKipp)) {
      // Schlitze sind Kerben im Gesicht: links K → L (Spitze) → M (Ecke), rechts D (Ecke) → E (Spitze) → F
      const kerbe = (von: string, spitze: string, bis: string, ecke: string) => {
        const a = f.marken[von]!;
        const sp = f.marken[spitze]!;
        const b = f.marken[bis]!;
        const [mx, my] = f.marke(p, ecke);
        const [sx] = f.marke(p, spitze);
        const seite = sx > mx ? 1 : -1;
        for (let i = a; i <= b; i++) {
          const g = i <= sp ? (i - a) / Math.max(1, sp - a) : (b - i) / Math.max(1, b - sp);
          const gw = Math.sin((g * Math.PI) / 2) ** 2;
          ankerDrehen(p, i, mx, my, pose.brauenKipp * seite * RAD * gw);
          p[i * 6 + 1] = p[i * 6 + 1]! - pose.brauen * 2.2 * gw;
        }
      };
      kerbe('K', 'L', 'M', 'M');
      kerbe('D', 'E', 'F', 'D');
    }
    if (name === 'gesicht' && pose.bart) {
      const [hx, hy] = f.marke(p, 'H');
      for (let i = f.marken['G2']!; i <= f.marken['I']!; i++) {
        const d = Math.max(0, 1 - Math.hypot(p[i * 6]! - hx, p[i * 6 + 1]! - hy) / 320);
        p[i * 6] = p[i * 6]! + pose.bart * 1.6 * d * d;
      }
    }
    if (name === 'nase' && pose.nase) {
      let cx = 0;
      let cy = 0;
      for (let i = 0; i < n; i++) {
        cx += p[i * 6]!;
        cy += p[i * 6 + 1]!;
      }
      cx /= n;
      cy /= n;
      const k = 1 + pose.nase * 0.1;
      ankerAffin(p, n, k, 0, 0, 2 - k, cx - cx * k, cy - cy * (2 - k) - pose.nase * 6);
    }
  }
}

// ---- Gips und Fenster ---------------------------------------------------------------------------------------------------
/** Säule mit runder Hüfte (Halbkreis um die Hüfte, dreht ohne Ecken) und runden Sohlenecken; Hüfte im Ursprung, unten = +y */
function saeuleUmriss(): number[] {
  const { B, H, r } = KASTEN;
  const halb = B / 2;
  const pts: number[] = [];
  // Hüfte: Halbkreis oben (von links über oben nach rechts)
  for (let k = 0; k <= 16; k++) {
    const a = Math.PI + (Math.PI * k) / 16;
    pts.push(halb * Math.cos(a), halb * Math.sin(a));
  }
  const bogen = (cx: number, cy: number, a0: number, a1: number) => {
    for (let k = 0; k <= 10; k++) {
      const a = a0 + ((a1 - a0) * k) / 10;
      pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
  };
  bogen(halb - r, H - r, 0, Math.PI / 2);
  bogen(-halb + r, H - r, Math.PI / 2, Math.PI);
  return pts;
}
function fensterUmriss(s: number): number[] {
  const { fensterB, fensterOben, fensterUnten } = KASTEN;
  const rx = (fensterB / 2) * s;
  const ry = fensterB / 2;
  const cy = fensterOben + ry;
  const pts: number[] = [-rx, fensterUnten];
  for (let k = 0; k <= 24; k++) {
    const a = Math.PI + (Math.PI * k) / 24;
    pts.push(rx * Math.cos(a), cy + ry * Math.sin(a));
  }
  pts.push(rx, fensterUnten);
  return pts;
}
