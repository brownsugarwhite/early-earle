// Ozzy als 2,5D-Puppe aus wenigen Bézier-Ankern. Kopfteile morphen über den Blickwinkel θ, Rumpf, Kehle und Schwanz über die
// Richtung ψ; die Gipsbeine sind Säulen mit runder Hüfte (der dunkle Schatten daneben ist das ferne Bein, Florian 16.11.).
// Die Teile hängen an 3D-Ankern (Hüften, Hals, Schwanzwurzel), werden gedreht, projiziert und nach Tiefe gezeichnet.
// Ohren, Schopf und Schwanz werden gebogen (Wurzel fest, Spitze schwingt), nie wie Pappe gedreht oder gequetscht.
import { AnkerForm, ankerAffin, ankerDrehen, ankerFormenAnlegen } from './anker';
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
  /** über dem Gesicht zeichnen (nicht nur in der flüssigen Maske), mit weißem Rand dieser Breite (Welt-Einheiten) */
  rand?: number;
  /** scharf zeichnen (nicht in der flüssigen Maske), vor dem Gesicht: der Kinnhaken mit seiner spitzen Ecke */
  scharf?: boolean;
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
    // bei 60° ist die Kerbe schon fast zu (sonst blieben bis 75° Reste neben der Nase stehen)
    const q60 = new Float32Array(q15.length);
    for (let i = 0; i < q15.length; i++) q60[i] = q15[i]! + (q90[i]! - q15[i]!) * 0.6;
    for (let i = D + 1; i < F; i++) {
      q60[i * 6] = q60[D * 6]! + k * 2 * (q15[i * 6]! - q15[D * 6]!);
      q60[i * 6 + 1] = q60[D * 6 + 1]! + k * 2 * (q15[i * 6 + 1]! - q15[D * 6 + 1]!);
      for (let o = 2; o < 6; o++) q60[i * 6 + o] = k * 2 * q15[i * 6 + o]!;
    }
    q60[D * 6 + 4] = k * 2 * q15[D * 6 + 4]!;
    q60[D * 6 + 5] = k * 2 * q15[D * 6 + 5]!;
    q60[l * 6 + 4] = (q60[F * 6]! - q60[l * 6]!) / 3;
    q60[l * 6 + 5] = (q60[F * 6 + 1]! - q60[l * 6 + 1]!) / 3;
    eigen[60] = q60;
    // von hinten verschwindet das Gesicht ganz im schwarzen Kopf (kein weißer Streifen am Rand)
    // dreht er sich weg, wird es zur schmalen Wange am rechten Rand und verschwindet (ab 145° gar nicht mehr gezeichnet)
    eigen[135] = zusammen(eigen[90]!, n, 455, 40, 0.07, 0.62);
    eigen[180] = zusammen(eigen[90]!, n, 455, 40, 0, 0.3);
  } else if (name === 'nase') {
    // dreht er sich weg, rückt die Nase mit der Schnauze hinter den Kopf (sie schwebt nicht vor ihm in der Luft)
    eigen[135] = zusammen(eigen[90]!, n, 120, 0, 0.35, 1);
    eigen[180] = zusammen(eigen[90]!, n, 120, 0, 0.2, 0.8);
  } else if (name === 'kopf') {
    // Im Profil endet die Strähne über der Schnauze in der Nase (wie bei Florian), nicht als Keil, der sie nur berührt
    const F = form.marken['F']!;
    const X2 = form.marken['X2']!;
    const k90 = eigen[90]!;
    k90[F * 6] = 360;
    k90[F * 6 + 1] = 60;
    // der Rand vom Kinn (X2) herauf bleibt unter dem Gesicht: gerade auf F zu
    k90[F * 6 + 2] = (k90[X2 * 6]! - 360) / 3;
    k90[F * 6 + 3] = (k90[X2 * 6 + 1]! - 60) / 3;
    k90[X2 * 6 + 4] = (360 - k90[X2 * 6]!) / 3;
    k90[X2 * 6 + 5] = (60 - k90[X2 * 6 + 1]!) / 3;
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
    // Von vorn steht der Schopf aufrecht und spiegelgleich (zur Seite geneigt wie im Logo erst ab 15°): So ist Ozzy nach dem
    // Umdrehen genau gespiegelt, und der Schopf legt sich beim Drehen durch die Front sanft auf die andere Seite.
    const q0 = eigen[0]!;
    const sig = [2, 1, 0, 4, 3];
    const bx = (q0[3 * 6]! + q0[4 * 6]!) / 2;
    const by = (q0[3 * 6 + 1]! + q0[4 * 6 + 1]!) / 2;
    const w = -Math.atan2(q0[6]! - bx, -(q0[7]! - by));
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const r = q0.slice();
    for (let i = 0; i < n; i++) {
      const x = r[i * 6]! - bx;
      const y = r[i * 6 + 1]! - by;
      r[i * 6] = bx + x * cw - y * sw;
      r[i * 6 + 1] = by + x * sw + y * cw;
      for (const o of [2, 4]) {
        const hx = r[i * 6 + o]!;
        const hy = r[i * 6 + o + 1]!;
        r[i * 6 + o] = hx * cw - hy * sw;
        r[i * 6 + o + 1] = hx * sw + hy * cw;
      }
    }
    const u = new Float32Array(r.length);
    for (let i = 0; i < n; i++) {
      const j = sig[i]!;
      u[i * 6] = (r[i * 6]! + (2 * bx - r[j * 6]!)) / 2 - bx;
      u[i * 6 + 1] = (r[i * 6 + 1]! + r[j * 6 + 1]!) / 2;
      // gespiegelt läuft der Umriss andersherum: Griff hinein des Partners wird Griff hinaus
      u[i * 6 + 2] = (r[i * 6 + 2]! - r[j * 6 + 4]!) / 2;
      u[i * 6 + 3] = (r[i * 6 + 3]! + r[j * 6 + 5]!) / 2;
      u[i * 6 + 4] = (r[i * 6 + 4]! - r[j * 6 + 2]!) / 2;
      u[i * 6 + 5] = (r[i * 6 + 5]! + r[j * 6 + 3]!) / 2;
    }
    eigen[0] = u;
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
  private scheiben: Scheibe[];
  /** Kinnhaken nach dem Blick des Kopfs: im Logo (15°) die Locke, im Profil (90°) Florians schlanker Sporn */
  private kehleSeite: AnkerForm;

  constructor() {
    // Der Schopf wird gespiegelt wie alles andere (Paare a–c und d–e), nicht mehr nur verschoben
    const kopfRoh = kopfAnker.map((r) => (r.name === 'schopf' ? { ...r, sigma: [2, 1, 0, 4, 3] } : r));
    this.kopf = ankerFormenAnlegen(kopfRoh, ART_KOPF, rueckseiten);
    this.koerper = ankerFormenAnlegen(koerperAnker, ART_KOERPER);
    this.scheiben = rumpfScheiben(this.koerper.get('rumpf')!);
    // Kinnhaken von der Seite: Florians Seitenansicht (spur-seite.json) zeigt einen schlanken Sporn, der vor dem weißen Kinn
    // fast senkrecht aufsteigt, die Spitze unter der Schnauze, unten eine scharfe Ecke und darunter eine Kerbe zur Brust.
    // Körperkoordinaten; Reihenfolge wie die Kehle: Spitze t, zwei Punkte der Vorderkante, Ecke o, innen i (in der Brust), u
    // (unter dem Gesicht).
    const kehle = koerperAnker.find((r) => r.name === 'kehle')!;
    const sporn = [
      689, -244, -58, 48, -0.7, 31.3,
      687, -150, 4.3, -30.7, -7.1, 50.5,
      655, 0, 13.4, -49.2, -7.2, 26.5,
      625, 77, 10, -25.7, -51.7, -2.3,
      470, 70, 51.7, 2.3, 15, -56.7,
      515, -100, -15, 56.7, 58, -48,
    ];
    this.kehleSeite = new AnkerForm(
      { ...kehle, ansichten: { 15: kehle.ansichten['90']!, 90: sporn }, ecken: { 15: kehle.ecken['90']!, 90: [[0, 1], [3, 1], [4, 1], [5, 1]] } },
      'gerade',
    );
    this.kehleSeite.anlegen({ 15: Float32Array.from(kehle.ansichten['90']!), 90: Float32Array.from(sporn) }, null, false);
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

  /** Wie tief reicht ein Bein unter die Hüfte bei Kippung β: steht es (bis 40°), ist die Sohle flach und das Bein biegt sich
   *  (Länge mal cos β); weiter gekippt (Sitzen, Liegen) ist es steif, die Kante der Sohle oder die runde Hüfte liegt unten. */
  static beinTiefe(beta: number): number {
    const steif = Figur.fussTiefe(beta);
    return steif + (KASTEN.H * Math.cos(beta * RAD) - steif) * beinFlach(beta);
  }

  /**
   * Stützen bei Nicken p. Stehende Beine sind weich (der Gips biegt und streckt sich ein wenig): Sie tragen gemeinsam, der Körper
   * steht auf ihrer mittleren Länge (`weich`), `streu` sagt, wie ungleich sie dafür sein müssten. Steif liegende Beine und der
   * weiche Rumpf (Hintern, Bauch) sind harte Stützen (`hart`): Tiefer als sie kann der Körper nicht.
   */
  private stuetzen(pose: Pose, p: number): { hart: number; weich: number; streu: number } {
    const sp = Math.sin(p * RAD);
    const cp = Math.cos(p * RAD);
    const q = pose.rollen * RAD;
    const cq = Math.cos(q);
    let hart = -Infinity;
    let wSumme = 0;
    let rSumme = 0;
    let r2Summe = 0;
    const rs: number[] = [];
    const ws: number[] = [];
    let rOben = -Infinity;
    for (const b of BEINE) {
      const winkel = (pose[`bein${b.name}` as const] as number) - p;
      const hub = pose[`hub${b.name}` as const] as number;
      // gerechnet am wahren Ort des Beins (der Schatten-Versatz des fernen Beins ist nur eine Zeichnung)
      const [dy] = biegung(pose.biegen, b.X);
      const hy = (b.X * sp + dy * cp) * cq - b.Z * Math.sin(q);
      // Kippung des Gipses aus Nicken und Wiegen zusammen
      const kipp = Math.acos(Math.max(-1, Math.min(1, Math.cos(winkel * RAD) * cq))) / RAD;
      const r = hy + Figur.beinTiefe(kipp) - hub + (pose[`stufe${b.name}` as const] as number);
      const flach = beinFlach(winkel);
      const w = flach * (1 - glatt01(hub / 2.5));
      rs.push(r);
      ws.push(w);
      if (w > 0 && r > rOben) rOben = r;
      if (flach < 0.5 && r > hart) hart = r;
    }
    // ein Fuß, der weit über den anderen hängt (Hinterbeine beim Stolpern), steht nicht: er trägt nicht mit
    let aSumme = 0;
    let a1 = 0;
    let a2 = 0;
    for (let i = 0; i < rs.length; i++) {
      // für die Streuung zählen alle stehenden Beine (sonst lohnte es sich, so zu kippen, dass nur noch zwei tragen)
      if (ws[i]! > 0) {
        aSumme += ws[i]!;
        a1 += ws[i]! * rs[i]!;
        a2 += ws[i]! * rs[i]! * rs[i]!;
      }
      const w = ws[i]! * (1 - glatt01((rOben - rs[i]! - 25) / 45));
      if (w <= 0) continue;
      wSumme += w;
      rSumme += w * rs[i]!;
      r2Summe += w * rs[i]! * rs[i]!;
    }
    void r2Summe;
    // der Rumpf (weich): seine Unterseite, gestaucht und gebogen wie gezeichnet
    for (const s of STUETZEN) {
      const [X, Y] = Figur.amRumpf(pose, s.X, s.Y);
      const r = (X * sp + Y * cp) * cq - WEICH + (BODEN_Y - bodenUnter(pose, s.X));
      if (r > hart) hart = r;
    }
    const weich = wSumme > 0 ? rSumme / wSumme : -Infinity;
    const mittel = aSumme > 0 ? a1 / aSumme : 0;
    const streu = aSumme > 0 ? Math.sqrt(Math.max(0, a2 / aSumme - mittel * mittel)) : 0;
    return { hart, weich, streu };
  }

  /** Reichweite (Abstand nach unten vom Körperanker bis zum Grundboden) bei Nicken p */
  private reichweiten(pose: Pose, p: number): number {
    const s = this.stuetzen(pose, p);
    return Math.max(s.hart, s.weich);
  }

  /** Boden-Löser: Höhe (und mit `frei` auch das Nicken), so dass Ozzy auf seinen Beinen und Stützen ruht */
  boden(pose: Pose, frei = 0): void {
    if (pose.boden <= 0) return;
    let p = pose.nicken;
    if (frei > 0) {
      // so tief wie möglich (Schwerkraft), aber die stehenden Beine möglichst gleich lang
      const guete = (pp: number) => {
        const s = this.stuetzen(pose, pp);
        return Math.max(s.hart, s.weich) + 3 * s.streu;
      };
      let best = p;
      let bestG = Infinity;
      for (let d = -25; d <= 25; d += 1) {
        const g = guete(pose.nicken + d);
        if (g < bestG - 1e-6) {
          bestG = g;
          best = pose.nicken + d;
        }
      }
      for (let schritt = 0.5; schritt > 0.02; schritt /= 2)
        for (const d of [-schritt, schritt]) {
          const g = guete(best + d);
          if (g < bestG) {
            bestG = g;
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
    // die Kehle (Locke am Kinn) bleibt eine Bézier-Form mit Haut
    const haut = this.rumpfHaut(pose, sPsi, cPsi, ay, c, s);
    const f = this.koerper.get('kehle')!;
    const p = this.buf('kehle', f.n * 6);
    f.auswerten(pose.psi, p);
    // von der Seite bestimmt der Blick des Kopfs die Form (Locke im Logo, Sporn im Profil); von vorn und hinten die Körperrichtung
    const seitlich = sPsi * sPsi;
    if (seitlich > 0.001) {
      const q = this.buf('kehleSeite', f.n * 6);
      const blick = Math.min(90, Math.max(15, Math.abs(((((pose.theta + 180) % 360) + 360) % 360) - 180)));
      this.kehleSeite.auswerten(sPsi >= 0 ? blick : -blick, q);
      for (let i = 0; i < p.length; i++) p[i] = p[i]! + (q[i]! - p[i]!) * seitlich;
    }
    const roh = p.slice();
    verformen(p, f.n, haut);
    ankerAffin(p, f.n, c, -s, s, c, ax, ay);
    this.kehleAmKopf(pose, sPsi, roh, p, f.n);
    teile.push({ name: 'kehle', farbe: 'schwarz', art: 'bezier', p, n: f.n, tiefe: 0.02, scharf: true });
    // der Rumpf aus Querschnitten: je zwei benachbarte als konvexe Hülle, zusammen die Bohne in jeder Richtung
    const ringe = this.querschnitte(pose);
    for (let k = 0; k + 1 < ringe.length; k++) {
      const h = konvexeHuelle(ringe[k]!.concat(ringe[k + 1]!));
      const q = new Float32Array(h.length * 2);
      h.forEach(([x, y], i) => {
        q[i * 2] = x;
        q[i * 2 + 1] = y;
      });
      teile.push({ name: 'rumpf', farbe: 'schwarz', art: 'vieleck', p: q, n: h.length, tiefe: 0 });
    }
  }

  /**
   * Die Bohne im Raum: Querschnitte (Superellipsen) entlang des Körpers, oben und unten genau Florians Seitenansicht. Jeder Punkt
   * wird verformt wie die Haut (Atmen, Strecken/Stauchen, Biegen, an steif gekippten Beinen mitdrehen), dann gedreht und
   * projiziert wie der Körper (Nicken, Wiegen, Blickrichtung ψ) und am Boden weich platt gedrückt. Weil es dieselbe Form im Raum
   * ist, stimmt die Silhouette in jeder Richtung: von der Seite, schräg, von vorn und von hinten.
   */
  private querschnitte(pose: Pose): [number, number][][] {
    const at = pose.atmen * 0.012;
    const st = pose.stauchen;
    const sx = 1 + at - st * 0.5;
    const sy = 1 + at + st;
    const p = pose.nicken * RAD;
    const q = pose.rollen * RAD;
    const ps = pose.psi * RAD;
    const cp = Math.cos(p);
    const sp = Math.sin(p);
    const cq = Math.cos(q);
    const sq = Math.sin(q);
    const cs = Math.cos(ps);
    const ss = Math.sin(ps);
    const ax = pose.x;
    const ay = pose.y - pose.heben;
    const R = 400;
    // stehende Beine (flache Sohle) lassen die Naht, wo sie ist (das Bein biegt sich); steif gekippte nehmen die Haut mit
    const huefte = BEINE.map((b) => {
      const a = pose[`bein${b.name}` as const] as number;
      return { X: b.X, Z: b.Z, w: -a * RAD * 0.5 };
    });
    const [kopfDy, kopfSteig] = biegung(pose.biegen, KOPF.X);
    const biegeDy = (X: number) => (X <= KOPF.X ? biegung(pose.biegen, X)[0] : kopfDy + kopfSteig * 60 * (1 - Math.exp(-(X - KOPF.X) / 60)));
    const K = 22;
    const e = 2 / QUER_N;
    // Lücke zwischen den Beinen (von der Seite): von der Vorderkante der Hinterbeine bis zur Hinterkante der Vorderbeine auf
    // Bauchhöhe (200 unter der Hüfte); darüber spannt sich in jedem Bild ein runder Bogen, Scheitel wie im Logo. So zeigt die
    // Lücke nie Buckel, wenn die Beine schwingen.
    const sPsi = Math.sin(ps);
    let links = -Infinity;
    let rechts = Infinity;
    for (const b of BEINE) {
      const a = ((pose[`bein${b.name}` as const] as number) - pose.nicken) * RAD;
      const xb = beinX(b, sPsi) + 200 * Math.sin(a);
      const halb = (KASTEN.B / 2) * Math.cos(a);
      if (b.name[0] === 'H') links = Math.max(links, xb + halb);
      else rechts = Math.min(rechts, xb - halb);
    }
    const mitte = (links + rechts) / 2;
    const breit = Math.max(30, (rechts - links) / 2);
    const lueckeBogen = (X: number) => {
      const u = (X - mitte) / breit;
      return Math.abs(u) <= 1 ? 138 + 62 * u * u : 232;
    };
    const out: [number, number][][] = [];
    for (const sc of this.scheiben) {
      const unten = sc.bauch ? lueckeBogen(sc.X) : sc.unten;
      const yc = (sc.oben + unten) / 2;
      const h = (unten - sc.oben) / 2;
      const ring: [number, number][] = [];
      for (let j = 0; j < QUER; j++) {
        const th = (2 * Math.PI * j) / QUER;
        const c = Math.cos(th);
        const s = Math.sin(th);
        let X = sc.X * sx;
        let Y = (yc + h * Math.sign(s) * Math.abs(s) ** e) * sy;
        const Z = sc.breite * Math.sign(c) * Math.abs(c) ** e * sx;
        Y += biegeDy(X);
        for (const hf of huefte) {
          if (!hf.w) continue;
          const dX = X - hf.X;
          const d = Math.hypot(dX, Y, Z - hf.Z);
          if (d >= R) continue;
          const u = 1 - d / R;
          const w = hf.w * u * u * (3 - 2 * u);
          const cw = Math.cos(w);
          const sw = Math.sin(w);
          const nY = dX * sw + Y * cw;
          X = hf.X + dX * cw - Y * sw;
          Y = nY;
        }
        const x1 = X * cp - Y * sp;
        const y1 = X * sp + Y * cp;
        const y2 = y1 * cq - Z * sq;
        const z2 = y1 * sq + Z * cq;
        let wx = ax + x1 * ss + z2 * cs;
        let wy = ay + y2;
        // Boden (weich): was darunter käme, drückt sich platt und quillt zur Seite
        const pen = wy - bodenUnter(pose, sc.X);
        if (pen > -7 * K) {
          const druck = K * Math.log1p(Math.exp(pen / K));
          wy -= druck;
          wx += 0.32 * druck * Math.tanh((wx - ax) / 220);
        }
        ring.push([wx, wy]);
      }
      out.push(ring);
    }
    return out;
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
    // von hinten liegt der Ring vor dem Rumpf und verschmilzt mit ihm (Florian: kein Rand): Dafür wird das Loch größer, so liest
    // man den Ring trotzdem
    const vorne = glatt01((st - 60) / 200);
    if (vorne > 0) {
      let mx = 0;
      let my = 0;
      for (let i = 0; i < loch.n; i++) {
        mx += pl[i * 6]!;
        my += pl[i * 6 + 1]!;
      }
      mx /= loch.n;
      my /= loch.n;
      const k = 1 + 0.4 * vorne;
      ankerAffin(pl, loch.n, k, 0, 0, k, mx - mx * k, my - my * k);
    }
    for (const [name, f, p] of [
      ['schwanz', ring, pr],
      ['schwanzloch', loch, pl],
    ] as const) {
      ankerAffin(p, f.n, seite * c, -s, seite * s, c, sx, sy);
      teile.push({ name, farbe: f.farbe, art: 'bezier', p, n: f.n, tiefe: st + 1 + (name === 'schwanzloch' ? 0.01 : 0) });
    }
  }

  /**
   * Ein Gipsbein. Steht es (bis 40° gekippt), bleibt die Sohle flach am Boden und der Gips biegt sich weich zwischen Hüfte und
   * Fuß (oben bleibt er am Körper ausgerichtet, so ändert sich die Naht nie); er streckt oder staucht sich ein wenig, damit der
   * Fuß genau auf seinem Boden steht (Stufen). Weiter gekippt (Sitzen, Liegen, Kratzen) ist er steif wie ein Brett.
   */
  private bein(pose: Pose, b: Bein, sPsi: number, cPsi: number, teile: Zeichenteil[]): void {
    const alpha = pose[`bein${b.name}` as const] as number;
    const hub = pose[`hub${b.name}` as const] as number;
    // am wahren Ort gerechnet (Höhe, Tiefe), um den Schatten-Versatz nur im Bild verschoben
    const [hx0, hy, tiefe] = this.koerperPunkt(pose, b.X, biegung(pose.biegen, b.X)[0], b.Z);
    const hx = hx0 + (beinX(b, sPsi) - b.X) * sPsi;
    const aWelt = alpha - pose.nicken;
    const a = aWelt * RAD;
    const q = pose.rollen * RAD;
    const dX = Math.sin(a);
    const dY = Math.cos(a) * Math.cos(q);
    const dZ = Math.cos(a) * Math.sin(q);
    const dx = dX * sPsi + dZ * cPsi;
    const dy = dY;
    const lang = Math.hypot(dx, dy) || 1;
    const phi = Math.atan2(-dx, dy);
    const flach = beinFlach(aWelt);
    const L = KASTEN.H;
    // Fuß: wo das steife Bein ihn hätte. Ist er nah an seinem Boden, steht er genau darauf oder schwebt `hub` darüber (der Gips
    // streckt oder staucht sich dafür, so steigt er auch auf Stufen); hängt er weit darüber (Stolpern), bleibt er, wo er ist.
    const fx = hx - L * lang * Math.sin(phi);
    const natuerlich = hy + L * lang * Math.cos(phi);
    const boden = BODEN_Y - (pose[`stufe${b.name}` as const] as number);
    const luecke = boden - natuerlich;
    const nah = flach * Math.min(1, Math.max(0, pose.boden)) * (1 - glatt01((luecke - 25) / 45));
    const fy = natuerlich - hub + (boden - natuerlich) * nah;
    const koerperW = (pose.nicken * sPsi + pose.rollen * cPsi) * RAD;
    // oben dreht der Gips gut halb mit (die Haut geht mit), unten steht die Sohle flach: Die Biegung verteilt sich weich
    void koerperW;
    const weg = beinWeg(hx, hy, fx, fy, phi, phi * (1 - flach));
    const setze = (pts: number[]): Float32Array => {
      const out = new Float32Array(pts.length);
      for (let i = 0; i < pts.length; i += 2) {
        const [x, y] = weg(pts[i]!, pts[i + 1]!);
        out[i] = x;
        out[i + 1] = y;
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
      // von hinten ist das Gesicht ganz verdeckt (nicht einmal ein Punkt bleibt)
      if (name === 'gesicht' && weg > 145) return;
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

/** Wie sehr ein Bein „steht“ (Sohle flach, Gips biegt sich) statt steif zu kippen: bis 40° ganz, ab 70° gar nicht */
export function beinFlach(winkel: number): number {
  return 1 - glatt01((Math.abs(winkel) - 40) / 30);
}

/** Höhe des Bodens (Welt-y) unter der Stelle X des Körpers: zwischen dem Boden unter den Hinter- und den Vorderfüßen */
function bodenUnter(pose: Pose, X: number): number {
  const h = (pose.stufeHN + pose.stufeHF) / 2;
  const v = (pose.stufeVN + pose.stufeVF) / 2;
  return BODEN_Y - (h + (v - h) * glatt01((X + 323.5) / 537.5));
}

/**
 * Weg eines Beins von der Hüfte zum Fuß: eine kubische Kurve, oben in Richtung `phiH`, unten in Richtung `phiF` (0 = senkrecht,
 * dann liegt die Sohle flach). Ein Punkt der Ruheform (u quer, v längs, Hüfte bei v = 0, Sohle bei v = H) wird an die Stelle
 * v/H der Kurve gesetzt, um u entlang ihrer Normalen verschoben. Die runde Kappe über der Hüfte dreht mit `phiH`.
 */
function beinWeg(hx: number, hy: number, fx: number, fy: number, phiH: number, phiF: number): (u: number, v: number) => [number, number] {
  const len = Math.hypot(fx - hx, fy - hy) || 1;
  // der Gips bleibt lange gerade (kräftige Tangente oben) und wird erst kurz vor der Sohle flach (schwache Tangente unten)
  const t0x = -Math.sin(phiH) * len * 1.25;
  const t0y = Math.cos(phiH) * len * 1.25;
  const t1x = -Math.sin(phiF) * len * 0.45;
  const t1y = Math.cos(phiF) * len * 0.45;
  const ch = Math.cos(phiH);
  const sh = Math.sin(phiH);
  return (u, v) => {
    if (v <= 0) return [hx + u * ch - v * sh, hy + u * sh + v * ch];
    const t = Math.min(1, v / KASTEN.H);
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    const cx = h00 * hx + h10 * t0x + h01 * fx + h11 * t1x;
    const cy = h00 * hy + h10 * t0y + h01 * fy + h11 * t1y;
    const d00 = 6 * t2 - 6 * t;
    const d10 = 3 * t2 - 4 * t + 1;
    const d01 = -6 * t2 + 6 * t;
    const d11 = 3 * t2 - 2 * t;
    let tx = d00 * hx + d10 * t0x + d01 * fx + d11 * t1x;
    let ty = d00 * hy + d10 * t0y + d01 * fy + d11 * t1y;
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    return [cx + u * ty, cy - u * tx];
  };
}

/** Konvexe Hülle (monotone Kette), Punkte als [x, y] */
function konvexeHuelle(pts: [number, number][]): [number, number][] {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const kreuz = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const unten: [number, number][] = [];
  for (const q of p) {
    while (unten.length >= 2 && kreuz(unten[unten.length - 2]!, unten[unten.length - 1]!, q) <= 0) unten.pop();
    unten.push(q);
  }
  const oben: [number, number][] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]!;
    while (oben.length >= 2 && kreuz(oben[oben.length - 2]!, oben[oben.length - 1]!, q) <= 0) oben.pop();
    oben.push(q);
  }
  oben.pop();
  unten.pop();
  return unten.concat(oben);
}

// ---- Rumpf aus Querschnitten ---------------------------------------------------------------------------------------------
/** Querschnitt des Rumpfs an der Stelle X (Körper vorn–hinten): oben/unten aus Florians Seitenansicht, Breite daraus abgeleitet */
interface Scheibe {
  X: number;
  oben: number;
  unten: number;
  breite: number;
  /** liegt zwischen den Beinen: unten der Bogen der Lücke (je Bild neu) */
  bauch: boolean;
}
const SCHEIBEN = 58;
const QUER = 18;
/** Exponent der Querschnitte (Superellipse): 2 wäre eine Ellipse, größer wird es kastiger */
const QUER_N = 2.5;
/** größte halbe Breite (von vorn), passt zu Florians Frontansicht */
const RUMPF_BREIT = 470;

/** Querschnitte aus dem Umriss der Seitenansicht (90°): je Stelle X der höchste und der tiefste Punkt des Umrisses */
function rumpfScheiben(f: AnkerForm): Scheibe[] {
  const p = new Float32Array(f.n * 6);
  f.auswerten(90, p);
  const pts: [number, number][] = [];
  for (let i = 0; i < f.n; i++) {
    const j = (i + 1) % f.n;
    const x0 = p[i * 6]!;
    const y0 = p[i * 6 + 1]!;
    const x3 = p[j * 6]!;
    const y3 = p[j * 6 + 1]!;
    const x1 = x0 + p[i * 6 + 4]!;
    const y1 = y0 + p[i * 6 + 5]!;
    const x2 = x3 + p[j * 6 + 2]!;
    const y2 = y3 + p[j * 6 + 3]!;
    for (let k = 0; k < 48; k++) {
      const t = k / 48;
      const u = 1 - t;
      pts.push([
        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      ]);
    }
  }
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [x] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  const out: Scheibe[] = [];
  let hMax = 0;
  for (let k = 0; k < SCHEIBEN; k++) {
    // an den Enden dichter (dort ändert sich der Umriss am schnellsten)
    const s = k / (SCHEIBEN - 1);
    const X = minX + 1.5 + (maxX - minX - 3) * (0.5 - 0.5 * Math.cos(Math.PI * s));
    let oben = Infinity;
    let unten = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [xa, ya] = pts[i]!;
      const [xb, yb] = pts[(i + 1) % pts.length]!;
      if ((xa - X) * (xb - X) <= 0 && xa !== xb) {
        const y = ya + ((yb - ya) * (X - xa)) / (xb - xa);
        oben = Math.min(oben, y);
        unten = Math.max(unten, y);
      }
    }
    if (!Number.isFinite(oben)) continue;
    // Bauch zwischen den Beinen: In der Zeichnung hängt er dort als W mit zwei Tropfen, die in Ruhe genau hinter den Gipsen
    // verschwinden. Im Gang schauen sie als Buckel heraus. Darum ein runder Bogen über der Lücke (Scheitel wie im Logo), der
    // nach außen steil abfällt; unter den Gipsen reicht der Bauch tiefer (dort verdeckt). Gehen die Beine auseinander, wird die
    // Lücke nur breiter.
    // Bauch zwischen den Beinen: wird je Bild als Bogen zwischen die Innenkanten der Beine gespannt (siehe querschnitte);
    // unter den Gipsen reicht er tief (dort verdeckt)
    const bauch = Math.abs(X - 2) < 480;
    if (bauch) unten = Math.max(unten, 232);
    out.push({ X, oben, unten, breite: 0, bauch });
    hMax = Math.max(hMax, unten - oben);
  }
  // Breite: über die ganze Länge fast gleich (so breit wie in Florians Frontansicht, die Gipse sitzen innen), zu den Enden hin
  // rundet sie sich wie eine Bohne von oben gesehen. (Die Höhe taugt dafür nicht: Über den Beinen ist der Umriss der Seite hoch,
  // weil dort die Gipse ansetzen.)
  void hMax;
  const mitte = (minX + maxX) / 2;
  const halb = (maxX - minX) / 2;
  for (const sc of out) {
    const u = Math.min(1, Math.abs(sc.X - mitte) / halb);
    sc.breite = RUMPF_BREIT * Math.pow(Math.max(0, 1 - u ** 4), 0.25);
  }
  return out;
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
/** Ruheform des Gipses (Hüfte im Ursprung, unten = +y): runde Kappe, Seiten fein unterteilt (sie biegen sich), runde Sohlenecken */
const SAEULE: number[] = (() => {
  const { B, H, r } = KASTEN;
  const halb = B / 2;
  const pts: number[] = [];
  for (let k = 0; k <= 16; k++) {
    const a = Math.PI + (Math.PI * k) / 16;
    pts.push(halb * Math.cos(a), halb * Math.sin(a));
  }
  for (let j = 1; j < 12; j++) pts.push(halb, ((H - r) * j) / 12);
  const bogen = (cx: number, cy: number, a0: number, a1: number) => {
    for (let k = 0; k <= 10; k++) {
      const a = a0 + ((a1 - a0) * k) / 10;
      pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
  };
  bogen(halb - r, H - r, 0, Math.PI / 2);
  bogen(-halb + r, H - r, Math.PI / 2, Math.PI);
  for (let j = 11; j >= 1; j--) pts.push(-halb, ((H - r) * j) / 12);
  return pts;
})();
function saeuleUmriss(): number[] {
  return SAEULE;
}
function fensterUmriss(s: number): number[] {
  const { fensterB, fensterOben, fensterUnten } = KASTEN;
  const rx = (fensterB / 2) * s;
  const ry = fensterB / 2;
  const cy = fensterOben + ry;
  const pts: number[] = [];
  for (let j = 0; j < 8; j++) pts.push(-rx, fensterUnten - ((fensterUnten - cy) * j) / 8);
  for (let k = 0; k <= 24; k++) {
    const a = Math.PI + (Math.PI * k) / 24;
    pts.push(rx * Math.cos(a), cy + ry * Math.sin(a));
  }
  for (let j = 7; j >= 0; j--) pts.push(rx, fensterUnten - ((fensterUnten - cy) * j) / 8);
  return pts;
}
