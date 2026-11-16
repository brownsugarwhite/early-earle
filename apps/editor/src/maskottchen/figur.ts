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

/** Stützen des Rumpfs (Sitzen, Liegen, Kippen): Punkte seines Umrisses unten (Körperlage X, Y). Der Rumpf ist weich: Er darf um
 *  `WEICH` in den Boden sinken, die Haut drückt sich dort platt und quillt zur Seite. */
const STUETZEN = [
  { X: -512, Y: 100 },
  { X: -485, Y: 154 },
  { X: -400, Y: 141 },
  { X: -150, Y: 174 },
  { X: -50, Y: 210 },
  { X: 50, Y: 210 },
  { X: 150, Y: 174 },
  { X: 400, Y: 141 },
  { X: 485, Y: 154 },
  { X: 535, Y: 70 },
];
const WEICH = 42;

// ---- Biegen der Bohne ---------------------------------------------------------------------------------------------------
/** Die Wirbelsäule biegt sich zwischen den Hüften der nahen Beine wie eine Parabel (die Hüften bleiben, wo sie sind); davor und
 *  dahinter läuft die Biegung sanft aus, so dass Kopf und Schwanz mitgehen, ohne zu peitschen. Stetig in Lage und Steigung. */
const BIEGE_MITTE = (-323.5 + 214) / 2;
const BIEGE_HALB = (214 + 323.5) / 2;
/** Versatz nach unten (+) an der Stelle X und die Steigung dy/dX; `biegen` > 0: Rücken rund nach oben, < 0: hängt durch */
export function biegung(biegen: number, X: number): [number, number] {
  if (!biegen) return [0, 0];
  const u = (X - BIEGE_MITTE) / BIEGE_HALB;
  const a = Math.abs(u);
  if (a <= 1) return [-biegen * (1 - u * u), (2 * biegen * u) / BIEGE_HALB];
  const v = a - 1;
  return [(2 * biegen * v) / (1 + v), (2 * biegen * Math.sign(u)) / ((1 + v) * (1 + v) * BIEGE_HALB)];
}

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
    // Der ferne Schlitz (Kerbe D … E … F) verschwindet im Profil. Lagen seine Anker dort auf einer Linie, drehten sich ihre Griffe
    // beim Drehen anders als die Anker wanderten, und die Kante zackte. Jetzt ist er im Profil eine winzige Kopie der Logo-Ansicht
    // an seiner Mündung D: Beim Drehen schrumpft die Kerbe nur (Anker und Griffe im selben Maß), nichts verwindet sich.
    const D = form.marken['D']!;
    const F = form.marken['F']!;
    const q15 = eigen[15]!;
    const q90 = eigen[90]!;
    const k = 0.03;
    for (let i = D + 1; i < F; i++) {
      q90[i * 6] = q90[D * 6]! + k * (q15[i * 6]! - q15[D * 6]!);
      q90[i * 6 + 1] = q90[D * 6 + 1]! + k * (q15[i * 6 + 1]! - q15[D * 6 + 1]!);
      for (let o = 2; o < 6; o++) q90[i * 6 + o] = k * q15[i * 6 + o]!;
    }
    q90[D * 6 + 4] = k * q15[D * 6 + 4]!;
    q90[D * 6 + 5] = k * q15[D * 6 + 5]!;
    // das letzte Stück der Kerbe bis F trägt im Profil die Kante der Schnauze: gerade auf F zu
    const l = F - 1;
    q90[l * 6 + 4] = (q90[F * 6]! - q90[l * 6]!) / 3;
    q90[l * 6 + 5] = (q90[F * 6 + 1]! - q90[l * 6 + 1]!) / 3;
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
    // Im Profil (Florians Seitenansicht) gibt es keinen eigenen Schopf: Er steckt im Haar. Dort ist er eine winzige Kopie der
    // Logo-Flamme an seinem Ansatz a, und der sitzt am oberen Rand des Gesichts (B, siehe Anhänge). Beim Drehen sinkt er also nur
    // in den Haaransatz, ohne sich zu verbiegen oder Kerben zu reißen.
    const q = eigen[15]!;
    const k = 0.04;
    const p = new Float32Array(q.length);
    const [ax, ay] = [q[0]!, q[1]!];
    const [zx, zy] = [74.2, -454.48]; // B des Gesichts im Profil
    for (let i = 0; i < n; i++) {
      p[i * 6] = zx + k * (q[i * 6]! - ax);
      p[i * 6 + 1] = zy + k * (q[i * 6 + 1]! - ay);
      for (let o = 2; o < 6; o++) p[i * 6 + o] = k * q[i * 6 + o]!;
    }
    eigen[90] = p;
  }
  if (name === 'schopf' || name === 'ohrH' || name === 'ohrV') {
    // hinten wie vorn: Ohren und Schopf gehen beim Weiterdrehen denselben Weg zurück (von hinten sieht man nicht, welches Ohr
    // welches ist). Nichts kreuzt, nichts klappt um, keine Form wird dünn.
    eigen[180] = eigen[0]!.slice();
  }
}

const ART_KOPF = (name: string) => (name === 'ohrH' || name === 'ohrV' || name === 'schopf' || name === 'nase' ? 'dreh' : 'gerade');

/** Anhänge: Teile, die in den Ansichten an einem Punkt eines anderen Teils sitzen (Ohrwurzel am Kopf, Schopf am oberen Rand des
 *  Gesichts). Gemorpht wird jedes Teil für sich; damit die Naht dazwischen nicht wandert (Kerben, Lücken), folgt der Punkt des
 *  Kinds dem des Elternteils, mit einem Versatz, der zwischen den Ansichten weich übergeht (in den Ansichten selbst ändert sich
 *  nichts). Hinten herum (ab 90°) läuft das aus. */
interface Anhang {
  kind: string;
  punkt: string;
  eltern: string;
  an: string;
}
const ANHAENGE: Anhang[] = [
  { kind: 'ohrH', punkt: 'e', eltern: 'kopf', an: 'eH' },
  { kind: 'ohrV', punkt: 'e', eltern: 'kopf', an: 'eV' },
  { kind: 'schopf', punkt: 'a', eltern: 'gesicht', an: 'B' },
];
const ANHANG_W = [-90, -15, 0, 15, 90];
const glatt01 = (x: number) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * (3 - 2 * u);
};
const ART_KOERPER = (name: string) => (name === 'schwanz' || name === 'schwanzloch' ? 'dreh' : 'gerade');

export class Figur {
  readonly kopf: Map<string, AnkerForm>;
  readonly koerper: Map<string, AnkerForm>;
  private puffer = new Map<string, Float32Array>();
  ferneBeineSchwarz = true;
  /** zur Fehlersuche: Teile, die nicht gezeichnet werden */
  ausblenden = new Set<string>();

  private anhangVersatz = new Map<string, { x: number[]; y: number[] }>();

  constructor() {
    this.kopf = ankerFormenAnlegen(kopfAnker, ART_KOPF, rueckseiten, (name) => name === 'schopf');
    this.koerper = ankerFormenAnlegen(koerperAnker, ART_KOERPER);
    // Versatz der Anhänge in den Ansichten (dort stimmt die Zeichnung)
    for (const a of ANHAENGE) {
      const kind = this.kopf.get(a.kind)!;
      const eltern = this.kopf.get(a.eltern)!;
      const pk = new Float32Array(kind.n * 6);
      const pe = new Float32Array(eltern.n * 6);
      const x: number[] = [];
      const y: number[] = [];
      for (const w of ANHANG_W) {
        kind.auswerten(w, pk);
        eltern.auswerten(w, pe);
        const [kx, ky] = kind.marke(pk, a.punkt);
        const [ex, ey] = eltern.marke(pe, a.an);
        x.push(kx - ex);
        y.push(ky - ey);
      }
      this.anhangVersatz.set(a.kind, { x, y });
    }
  }

  /** Das Kind so verschieben, dass sein Ansatzpunkt dem des Elternteils folgt (siehe ANHAENGE) */
  private anhaengen(a: Anhang, th: number, werte: Map<string, Float32Array>): void {
    const pk = werte.get(a.kind);
    const pe = werte.get(a.eltern);
    if (!pk || !pe) return;
    const w = ((((th + 180) % 360) + 360) % 360) - 180;
    const g = 1 - glatt01((Math.abs(w) - 90) / 30);
    if (g <= 0) return;
    const v = this.anhangVersatz.get(a.kind)!;
    const wc = Math.max(-90, Math.min(90, w));
    let j = 0;
    while (j < ANHANG_W.length - 2 && wc > ANHANG_W[j + 1]!) j++;
    const t = glatt01((wc - ANHANG_W[j]!) / (ANHANG_W[j + 1]! - ANHANG_W[j]!));
    const ox = v.x[j]! + (v.x[j + 1]! - v.x[j]!) * t;
    const oy = v.y[j]! + (v.y[j + 1]! - v.y[j]!) * t;
    const kind = this.kopf.get(a.kind)!;
    const [kx, ky] = kind.marke(pk, a.punkt);
    const [ex, ey] = this.kopf.get(a.eltern)!.marke(pe, a.an);
    const dx = (ex + ox - kx) * g;
    const dy = (ey + oy - ky) * g;
    for (let i = 0; i < kind.n; i++) {
      pk[i * 6] = pk[i * 6]! + dx;
      pk[i * 6 + 1] = pk[i * 6 + 1]! + dy;
    }
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

  /** Ein Punkt am Rumpf (Kopfansatz, Schwanzwurzel): mit Atmen, Strecken/Stauchen (um die Hüftlinie) und Biegen */
  static amRumpf(pose: Pose, X: number, Y: number): [number, number] {
    const at = pose.atmen * 0.012;
    const sx = 1 + at - pose.stauchen * 0.5;
    const sy = 1 + at + pose.stauchen;
    const [dy] = biegung(pose.biegen, Math.min(X, KOPF.X));
    return [X * sx, Y * sy + dy];
  }

  /** Kopfanker in Weltkoordinaten (für Federn und Blicke) */
  kopfPunkt(pose: Pose): [number, number] {
    const [X, Y] = Figur.amRumpf(pose, KOPF.X, KOPF.Y);
    const [x, y] = this.koerperPunkt(pose, X, Y, KOPF.Z);
    return [x + pose.kopfX, y + pose.kopfY];
  }

  /** tiefster Punkt eines Gipses unter der Hüfte bei Kippung β (Grad); zeigt er waagerecht oder höher, liegt die runde Hüfte unten */
  static fussTiefe(beta: number): number {
    const b = Math.abs(beta) * RAD;
    return Math.max(KASTEN.B / 2, (KASTEN.H - KASTEN.r) * Math.cos(b) + (KASTEN.B / 2 - KASTEN.r) * Math.sin(b) + KASTEN.r);
  }

  /** Reichweite (Abstand nach unten vom Körperanker) der tiefsten Stütze bei Nicken p */
  private reichweiten(pose: Pose, p: number): number {
    const sp = Math.sin(p * RAD);
    const cp = Math.cos(p * RAD);
    const q = pose.rollen * RAD;
    let max = -Infinity;
    const cq = Math.cos(q);
    for (const b of BEINE) {
      const winkel = (pose[`bein${b.name}` as const] as number) - p;
      const hub = pose[`hub${b.name}` as const] as number;
      // gerechnet am wahren Ort des Beins (der Schatten-Versatz des fernen Beins ist nur eine Zeichnung)
      const [dy] = biegung(pose.biegen, b.X);
      const hy = b.X * sp + dy * cp;
      const hy2 = hy * cq - b.Z * Math.sin(q);
      // Kippung des Gipses aus Nicken und Wiegen zusammen
      const kipp = Math.acos(Math.max(-1, Math.min(1, Math.cos(winkel * RAD) * cq))) / RAD;
      const r = hy2 + Figur.fussTiefe(kipp) - hub;
      if (r > max) max = r;
    }
    // der Rumpf (weich): seine Unterseite, gestaucht und gebogen wie gezeichnet
    for (const s of STUETZEN) {
      const [X, Y] = Figur.amRumpf(pose, s.X, s.Y);
      const r = (X * sp + Y * cp) * Math.cos(q) - WEICH;
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
    if (this.ausblenden.size) return teile.filter((t) => !this.ausblenden.has(t.name));
    return teile;
  }

  /**
   * Haut des Rumpfs (die Bohne). Vier Verformungen, alle stetig und glatt, auf Anker und Griff-Endpunkte gleich angewandt (so
   * bleiben die Kurven Kurven, es entsteht kein Knick):
   *   1. Atmen und Strecken/Stauchen um die Hüftlinie,
   *   2. Biegen der Wirbelsäule (vorn sanft auslaufend, damit Brust und Kehle mit dem Kopf gehen),
   *   3. um jede Hüfte dreht die Haut ein Stück mit dem Bein mit (wie Muskel und Fell über dem Gelenk), weich auslaufend,
   *   4. was unter den Boden käme, drückt sich platt und quillt zur Seite (Hinsetzen, Hinlegen, Aufprall).
   * Rechnet im Raum der Ansicht relativ zum Körperanker, vor dem Kippen um `cw`/`sw`.
   */
  private rumpfHaut(
    pose: Pose,
    sPsi: number,
    cPsi: number,
    ay: number,
    cw: number,
    sw: number,
  ): (x: number, y: number) => [number, number] {
    const at = pose.atmen * 0.012;
    const st = pose.stauchen;
    const sx = 1 + at - st * 0.5;
    const sy = 1 + at + st;
    const R = 380;
    const q = pose.rollen * RAD;
    const huefte = BEINE.map((b) => {
      const a = (pose[`bein${b.name}` as const] as number) * RAD;
      const dx = Math.sin(a) * sPsi + Math.cos(a) * Math.sin(q) * cPsi;
      const dy = Math.cos(a) * Math.cos(q);
      const bx = beinX(b, sPsi);
      const nah = b.Z < 0 === sPsi >= 0;
      return {
        hx: bx * sPsi + b.Z * cPsi,
        hy: biegung(pose.biegen, bx)[0],
        w: Math.atan2(-dx, dy) * (nah ? 0.55 : 0.3),
      };
    });
    // Biegung vorn: ab dem Kopfansatz läuft die Steigung in ~60 Bildpunkten aus
    const [kopfDy, kopfSteig] = biegung(pose.biegen, KOPF.X);
    const biegeDy = (X: number) => (X <= KOPF.X ? biegung(pose.biegen, X)[0] : kopfDy + kopfSteig * 60 * (1 - Math.exp(-(X - KOPF.X) / 60)));
    const K = 22;
    return (x0: number, y0: number) => {
      let x = x0 * sx;
      let y = y0 * sy;
      // die Lage längs des Körpers: in der Seite ist es x, von vorn liegt alles in der Mitte
      y += biegeDy(x * sPsi);
      let gx = 0;
      let gy = 0;
      for (const h of huefte) {
        if (!h.w) continue;
        const ddx = x - h.hx;
        const ddy = y - h.hy;
        const d = Math.hypot(ddx, ddy);
        if (d >= R) continue;
        const u = 1 - d / R;
        const w = h.w * u * u * (3 - 2 * u);
        gx += ddx * Math.cos(w) - ddy * Math.sin(w) - ddx;
        gy += ddx * Math.sin(w) + ddy * Math.cos(w) - ddy;
      }
      x += gx;
      y += gy;
      // Boden (weich): Eindringtiefe in Welt-y, sanft begrenzt
      const pen = ay + sw * x + cw * y - BODEN_Y;
      if (pen > -7 * K) {
        const druck = K * Math.log1p(Math.exp(pen / K));
        const wx = cw * x - sw * y;
        const dxw = 0.32 * druck * Math.tanh(wx / 220);
        const dyw = -druck;
        x += cw * dxw + sw * dyw;
        y += -sw * dxw + cw * dyw;
      }
      return [x, y];
    };
  }

  private rumpfTeile(pose: Pose, sPsi: number, cPsi: number, teile: Zeichenteil[]): void {
    const winkel = (pose.nicken * sPsi + pose.rollen * cPsi) * RAD;
    const c = Math.cos(winkel);
    const s = Math.sin(winkel);
    const [ax, ay] = this.koerperPunkt(pose, 0, 0, 0);
    const haut = this.rumpfHaut(pose, sPsi, cPsi, ay, c, s);
    for (const name of ['rumpf', 'kehle'] as const) {
      const f = this.koerper.get(name)!;
      const p = this.buf(name, f.n * 6);
      f.auswerten(pose.psi, p);
      const roh = name === 'kehle' ? p.slice() : null;
      // Haut verformen: Anker und Griff-Endpunkte durch dasselbe Feld (so bleiben die Kurven glatt)
      verformen(p, f.n, haut);
      ankerAffin(p, f.n, c, -s, s, c, ax, ay);
      if (roh) this.kehleAmKopf(pose, sPsi, roh, p, f.n);
      teile.push({ name, farbe: 'schwarz', art: 'bezier', p, n: f.n, tiefe: name === 'kehle' ? 0.02 : 0 });
    }
  }

  /**
   * Das Stück am Kinn (von der Seite der schwarze Haken unter der Schnauze, im Logo die Locke rechts unter dem Gesicht) ist Haar
   * am Kinn: Seine Spitze geht mit dem Kopf (Nicken, Neigen, Federn), sein Fuß bleibt an der Brust; dazwischen weich gemischt.
   * `roh`: Anker im Raum der Ansicht vor der Haut, `p`: schon in Weltlage mit dem Körper. Die Spitze schwingt dazu wie der Bart.
   */
  private kehleAmKopf(pose: Pose, sPsi: number, roh: Float32Array, p: Float32Array, n: number): void {
    const k = this.kopfLage(pose);
    const hx = 350 * sPsi;
    const hy = -480;
    const th = pose.theta * RAD;
    const pendel = 26 * Math.tanh((pose.bartDreh * Math.sin(th) + pose.bart * Math.cos(th)) / 26) * RAD;
    const amKopf = (x: number, y: number): [number, number] => {
      const rx = x - hx - HALS.x;
      const ry = y - hy - HALS.y;
      return [k.kx + HALS.x + k.c * rx - k.s * ry, k.ky + HALS.y + k.s * rx + k.c * ry];
    };
    for (let i = 0; i < n; i++) {
      const y = roh[i * 6 + 1]!;
      const w = glatt01((60 - y) / 230);
      if (w <= 0) continue;
      // Pendel: je weiter oben (zur Spitze), desto mehr seitwärts
      const sw = Math.sin(pendel) * 70 * w;
      const neu: number[] = [];
      for (const o of [0, 2, 4]) {
        const lx = roh[i * 6]! + (o ? roh[i * 6 + o]! : 0);
        const ly = y + (o ? roh[i * 6 + o + 1]! : 0);
        const [kx, ky] = amKopf(lx, ly);
        const bx = p[i * 6]! + (o ? p[i * 6 + o]! : 0);
        const by = p[i * 6 + 1]! + (o ? p[i * 6 + o + 1]! : 0);
        neu.push(bx + (kx + sw - bx) * w, by + (ky - by) * w);
      }
      p[i * 6] = neu[0]!;
      p[i * 6 + 1] = neu[1]!;
      p[i * 6 + 2] = neu[2]! - neu[0]!;
      p[i * 6 + 3] = neu[3]! - neu[1]!;
      p[i * 6 + 4] = neu[4]! - neu[0]!;
      p[i * 6 + 5] = neu[5]! - neu[1]!;
    }
  }

  private schwanzTeile(pose: Pose, sPsi: number, teile: Zeichenteil[]): void {
    const [SX, SY] = Figur.amRumpf(pose, SCHWANZ.X, SCHWANZ.Y);
    const [sx, sy, st] = this.koerperPunkt(pose, SX, SY, SCHWANZ.Z);
    // die Wurzel sitzt auf dem gebogenen Rücken: Der Ring kippt mit der Steigung dort
    const steigung = Math.atan(biegung(pose.biegen, SCHWANZ.X)[1]) / RAD;
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
    const w = (pose.nicken + steigung) * sPsi * RAD;
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
    // am wahren Ort gerechnet (Höhe, Tiefe), um den Schatten-Versatz nur im Bild verschoben
    const [hx0, hy0, tiefe] = this.koerperPunkt(pose, b.X, biegung(pose.biegen, b.X)[0], b.Z);
    const hx = hx0 + (beinX(b, sPsi) - b.X) * sPsi;
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

  /** Lage des Kopfs: Anker (kx, ky), Drehung (c, s) um das Halsgelenk, Tiefe */
  private kopfLage(pose: Pose): { kx: number; ky: number; c: number; s: number; tiefe: number } {
    const th = pose.theta;
    const [KX, KY] = Figur.amRumpf(pose, KOPF.X, KOPF.Y);
    const [ax, ay, tiefeHals] = this.koerperPunkt(pose, KX, KY, KOPF.Z);
    const sPsi = Math.sin(pose.psi * RAD);
    const sTh = Math.sin(th * RAD);
    const cTh = Math.cos(th * RAD);
    const winkel = (pose.kopfNeigen * cTh + pose.kopfNicken * sTh) * RAD;
    return {
      kx: ax + pose.kopfX,
      ky: ay + pose.kopfY + pose.kopfNicken * cTh * 2.2,
      c: Math.cos(winkel),
      s: Math.sin(winkel),
      tiefe: tiefeHals + 400 * Math.max(0, Math.abs(sPsi)) ** 2,
    };
  }

  private kopfTeile(pose: Pose, teile: Zeichenteil[]): void {
    const th = pose.theta;
    const { kx, ky, c, s, tiefe } = this.kopfLage(pose);
    const wink = ((((th + 180) % 360) + 360) % 360) - 180;
    const weg = Math.abs(wink);
    // hinten herum: die Nase wandert hinter den Kopf (wird verdeckt, nicht kleiner)
    const reihe = weg > 100 ? ['ohrH', 'ohrV', 'schopf', 'nase', 'kopf', 'gesicht'] : ['ohrH', 'ohrV', 'schopf', 'kopf', 'gesicht', 'nase'];
    // erst alle Teile auswerten, dann die Anhänge nachführen (Nähte bleiben, wo sie hingehören)
    const werte = new Map<string, Float32Array>();
    for (const name of reihe) {
      const f = this.kopf.get(name)!;
      const p = this.buf(name, f.n * 6);
      f.auswerten(th, p);
      werte.set(name, p);
    }
    for (const a of ANHAENGE) this.anhaengen(a, th, werte);
    reihe.forEach((name, k) => {
      const f = this.kopf.get(name)!;
      const p = werte.get(name)!;
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
    if (name === 'gesicht' && (pose.bart || pose.bartDreh)) {
      // Das Kinnstück (Bart) hängt wie ein Vorhang am Kiefer: Was unter der Kieferlinie liegt, schwingt, je tiefer, desto weiter,
      // und hebt sich dabei so, dass seine Länge bleibt. Von der Seite sieht man das Vor und Zurück (bartDreh), von vorn das
      // Seitwärts (bart). Anker und Griffe gehen durch dieselbe Abbildung: Der Umriss bleibt glatt.
      const th = pose.theta * RAD;
      // weich begrenzt: Ein Bart schwingt, er klappt nicht um
      const roh = pose.bartDreh * Math.sin(th) + pose.bart * Math.cos(th);
      // das weiße Kinn schwingt halb so weit wie die schwarze Locke davor (die ist leichter)
      const phi = 0.5 * 26 * Math.tanh(roh / 26) * RAD;
      const y0 = f.marke(p, 'G1')[1] + 10;
      const sp = Math.sin(phi);
      const cp = 1 - Math.cos(phi);
      verformen(p, n, (x, y) => {
        const d = y - y0;
        if (d <= 0) return [x, y];
        const g = Math.min(1, d / 170);
        const gw = g * g * (3 - 2 * g);
        return [x + d * sp * gw, y - d * cp * gw];
      });
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

/** Eine Abbildung auf Anker und Griff-Endpunkte anwenden (die Griffe bleiben relativ): so folgt die ganze Kurve der Verformung */
function verformen(p: Float32Array, n: number, fn: (x: number, y: number) => [number, number]): void {
  for (let i = 0; i < n; i++) {
    const x = p[i * 6]!;
    const y = p[i * 6 + 1]!;
    const [nx, ny] = fn(x, y);
    const [ix, iy] = fn(x + p[i * 6 + 2]!, y + p[i * 6 + 3]!);
    const [ox, oy] = fn(x + p[i * 6 + 4]!, y + p[i * 6 + 5]!);
    p[i * 6] = nx;
    p[i * 6 + 1] = ny;
    p[i * 6 + 2] = ix - nx;
    p[i * 6 + 3] = iy - ny;
    p[i * 6 + 4] = ox - nx;
    p[i * 6 + 5] = oy - ny;
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
