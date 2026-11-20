// Attrappe der Welt (Plan 4.5, 5.3): erfüllt jede Funktion von `WeltAdapter` einfach, ohne Reibung und deterministisch, damit Laufzeit
// und Bausteine ohne Box2D testen können und die gemeinsame Testreihe von M2.1 gegen beide läuft. Die Festlegungen stehen in
// `vertrag/welt.ts`; hier steht nur, wie die Attrappe sie erfüllt.
//
// Wie sie rechnet (nach dem Vorbild von Box2D 3.2, „Soft Step“): je Teilschritt h zuerst Federbeine (Strahl, Federkraft) und Kräfte,
// dann Kontakte suchen, dann einige Durchgänge der Bedingungen mit weicher Korrektur (Scharnier, Motor, Grenzen, Ziel-Gelenk, Finger,
// Kontakte), dann die Lagen fortschreiben, dann ein Durchgang ohne Korrektur (Entspannen) und der Abprall. Kontakte haben keine
// Reibung, keinen Rollwiderstand und keinen Warmstart; `haftung` und `rollwiderstand` werden nur gemerkt. Vielecke zählen für die
// Masse ohne ihre Rundung. Ketten sind einseitig wie im Vertrag; ob eine Hülle hinter einem Kettenstück liegt, entscheidet die Mitte
// ihres umfassenden Kreises (bei Vielecken das Mittel der Ecken, nicht der Schwerpunkt) und nur das Stück selbst, ohne Nachbarn.
//
// Determinismus: Alle Zahlen liegen in Tabellen aus Float64Array; jede Schleife läuft in fester Reihenfolge; Winkel nur über
// `@ee/studio-rechnen/winkel`. Ein Schlüsselstand ist eine Kopie der Tabellen, darum rechnet die Welt nach `zuruecksetzen` bitgleich
// weiter. Abgeleitetes (Drehungen, Weltpunkte, Kontaktpunkte, Löserdaten) entsteht stets neu aus dem Zustand.
import type { Punkt } from '@ee/studio-format/typen/grund';
import { pruefsumme } from '@ee/studio-rechnen/pruefsumme';
import { cos, gradZuRad, radZuGrad, sin } from '@ee/studio-rechnen/winkel';
import {
  BEIN_FELDER, KONTAKT_FELDER, LAGE_FELDER, STRAHL_FELDER, TEMPO_FELDER, VIELECK_PUNKTE, ZONE_FELDER,
  type FederMass, type Huelle, type KoerperArt, type Lage, type Masse, type StoffWerte, type WeltAdapter, type WeltPuffer,
} from './welt';

// ---------- Festwerte (wie Box2D 3.2, in L statt Metern) ----------

const PI = 3.141592653589793;
const ZWEI_PI = 6.283185307179586;
/** so nah gilt als berührt; so viel Eindringen bleibt ohne Korrektur */
const SCHLUPF = 0.005;
/** Kontakte entstehen schon in diesem Abstand, damit schnelle Annäherung nicht durchschlägt */
const SPEKULATIV = 4 * SCHLUPF;
/** höchstens so schnell wird Überlappung auseinandergeschoben (L/s) */
const SCHIEBETEMPO = 3;
const KONTAKT_HERTZ = 30;
const KONTAKT_DAEMPFUNG = 10;
const GELENK_DAEMPFUNG = 2;
const DURCHGAENGE = 4;
/** Abprall erst ab diesem Annäherungstempo (L/s) */
const ABPRALL_SCHWELLE = 1;
/** zwei Strecken gelten als parallel (zwei Kontaktpunkte), wenn der Sinus ihres Winkels darunter liegt */
const PARALLEL = 0.005;
/** Quadrat einer Länge, unter dem eine Strecke ein Punkt ist */
const WINZIG = 1e-20;
/** unter diesem Abstand ist die Richtung zwischen zwei Punkten unbestimmt */
const KEIN_ABSTAND = 1e-12;
/** Kennzahl und Fassung eines Schlüsselstands der Attrappe */
const KENNZAHL = 20261120;
const FASSUNG = 1;

// Arten der Körper und Hüllen in den Tabellen
const FEST = 0, BEWEGLICH = 1, GEFUEHRT = 2;
const KREIS = 0, KAPSEL = 1, VIELECK = 2, KETTE = 3;
const SCHARNIER = 0, ZIEL = 1;
// Seite eines Kerns beim Stoßen: ohne Seite (Kreis, Kapsel), mit Seite (Vieleck-Kante außen, Kettenstück vorn), Kettenstück von hinten
const OHNE_SEITE = 0, MIT_SEITE = 1, HINTEN = -1;

// Körper: Art, an, entfernt, Ursprung und Winkel (Bogenmaß), Schwerpunkt in der Welt und lokal, Tempo des Schwerpunkts, Winkeltempo,
// Masse, Trägheit und Kehrwerte, Masse von Hand, Kräfte für den nächsten Schritt, Ziel der Führung, schnell
const K_ART = 0, K_AKTIV = 1, K_WEG = 2, K_X = 3, K_Y = 4, K_W = 5, K_CX = 6, K_CY = 7, K_LX = 8, K_LY = 9, K_VX = 10, K_VY = 11,
  K_OM = 12, K_M = 13, K_IM = 14, K_I = 15, K_II = 16, K_MFEST = 17, K_FX = 18, K_FY = 19, K_TQ = 20, K_FUEHREN = 21, K_ZX = 22,
  K_ZY = 23, K_ZW = 24, K_SCHNELL = 25, KB = 26;
// Hüllen: Körper, Art, Radius (Rundung), erster Punkt, Punktzahl, Schleife, Stoff, schnell
const H_KOERPER = 0, H_ART = 1, H_R = 2, H_ANFANG = 3, H_ZAHL = 4, H_SCHLEIFE = 5, H_HAFTUNG = 6, H_ABPRALL = 7, H_ROLL = 8,
  H_DICHTE = 9, H_SCHNELL = 10, HB = 11;
// Zonen: Art, Radius, erster Punkt (in der Welt), Punktzahl, Schleife
const Z_ART = 0, Z_R = 1, Z_ANFANG = 2, Z_ZAHL = 3, Z_SCHLEIFE = 4, ZB = 5;
// Gelenke: Art, Körper a und b, entfernt, Anker in a und b (lokal vom Ursprung; Ziel-Gelenk: Ziel des Ursprungs von b im Rahmen von
// a, Anker in b ist sein Ursprung), Bezugswinkel (Ziel-Gelenk: Zielwinkel), Motor, Grenzen, Feder, Höchstkraft
const G_ART = 0, G_A = 1, G_B = 2, G_WEG = 3, G_AX = 4, G_AY = 5, G_BX = 6, G_BY = 7, G_REF = 8, G_MOTOR = 9, G_MTEMPO = 10,
  G_MMOMENT = 11, G_GRENZEN = 12, G_UNTEN = 13, G_OBEN = 14, G_F = 15, G_ZETA = 16, G_KRAFT = 17, GB = 18;
// Federbeine des nächsten Schritts: Körper, Beinpunkt und Richtung (lokal), gezeichnete Länge, Feder, Anteil (NaN: selbst)
const B_KOERPER = 0, B_VX = 1, B_VY = 2, B_RX = 3, B_RY = 4, B_LAENGE = 5, B_F = 6, B_ZETA = 7, B_ANTEIL = 8, BB = 9;
// Welt: Schwerkraft und der Finger (an, Körper, Anker lokal, Ziel, Feder, Höchstkraft)
const W_GX = 0, W_GY = 1, W_FAN = 2, W_FK = 3, W_FAX = 4, W_FAY = 5, W_FZX = 6, W_FZY = 7, W_FF = 8, W_FZETA = 9, W_FKRAFT = 10,
  WB = 11;
// Kontaktpunkte eines Teilschritts: Hüllen, Körper, Normale, Hebel, Abstand, Normalmasse, Impuls, größter Impuls, Annäherung vorher,
// Abprall, gegen nicht Bewegliches, Punkt
const P_HA = 0, P_HB = 1, P_A = 2, P_B = 3, P_NX = 4, P_NY = 5, P_RAX = 6, P_RAY = 7, P_RBX = 8, P_RBY = 9, P_S = 10, P_MASSE = 11,
  P_L = 12, P_LMAX = 13, P_VN0 = 14, P_E = 15, P_FEST = 16, P_PX = 17, P_PY = 18, PB = 19;
// Löserdaten je Gelenk: an, Achsmasse, Impulse (linear x, y, Motor, unten, oben, Winkel), Grenzen der Impulse, Weichheit der Feder
const L_AKTIV = 0, L_AXIAL = 1, L_LX = 2, L_LY = 3, L_LM = 4, L_LU = 5, L_LO = 6, L_LW = 7, L_MAXF = 8, L_MAXT = 9, L_WEICH = 10,
  JL = 13;
// Löserdaten des Fingers: an, Weichheit, Impuls, Grenze
const F_AKTIV = 0, F_WEICH = 1, F_LX = 4, F_LY = 5, F_MAXF = 6, FL = 7;

// ---------- Tabellen ----------

/** wachsende Tabelle aus Zeilen fester Breite in einem Float64Array */
class Tabelle {
  d: Float64Array;
  n = 0;
  readonly breite: number;
  constructor(breite: number, zeilen = 8) {
    this.breite = breite;
    this.d = new Float64Array(breite * zeilen);
  }
  /** neue Zeile voller Nullen; gibt ihre Nummer */
  zeile(): number {
    this.platz(this.n + 1);
    this.d.fill(0, this.n * this.breite, (this.n + 1) * this.breite);
    return this.n++;
  }
  /** Platz für so viele Zeilen; der Inhalt bleibt */
  platz(zeilen: number): void {
    if (zeilen * this.breite <= this.d.length) return;
    let laenge = Math.max(this.d.length, this.breite);
    while (laenge < zeilen * this.breite) laenge *= 2;
    const neu = new Float64Array(laenge);
    neu.set(this.d.subarray(0, this.n * this.breite));
    this.d = neu;
  }
  sicht(): Float64Array {
    return this.d.subarray(0, this.n * this.breite);
  }
}

function genug(a: Float64Array, laenge: number): Float64Array {
  return a.length >= laenge ? a : new Float64Array(Math.max(laenge, 2 * a.length));
}

// ---------- Rechnen ----------

/** Winkel im Bogenmaß nach (−π, π] */
function bogenNormal(x: number): number {
  let y = x - ZWEI_PI * Math.floor((x + PI) / ZWEI_PI);
  if (y <= -PI) y += ZWEI_PI;
  else if (y > PI) y -= ZWEI_PI;
  return y;
}

function klemmen(x: number, unten: number, oben: number): number {
  return x < unten ? unten : x > oben ? oben : x;
}

/** weiche Bedingung wie b2MakeSoft: Biasrate, Massenfaktor, Impulsfaktor nach aus[i …]; 0 Hz heißt starr ohne Korrektur */
function weich(hertz: number, zeta: number, h: number, aus: Float64Array, i: number): void {
  if (hertz === 0) {
    aus[i] = 0;
    aus[i + 1] = 1;
    aus[i + 2] = 0;
    return;
  }
  const omega = ZWEI_PI * hertz;
  const a1 = 2 * zeta + h * omega;
  const a2 = h * omega * a1;
  const a3 = 1 / (1 + a2);
  aus[i] = omega / a1;
  aus[i + 1] = a2 * a3;
  aus[i + 2] = a3;
}

/** konvexe Hülle (Andrew), gegen den Uhrzeigersinn im Sinn von x·y′ − y·x′ > 0, als flache Liste */
function konvexeHuelle(punkte: readonly Punkt[]): number[] {
  const p = punkte.map((q): Punkt => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const kreuz = (o: Punkt, a: Punkt, b: Punkt): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const unten: Punkt[] = [];
  for (const q of p) {
    while (unten.length >= 2 && kreuz(unten[unten.length - 2]!, unten[unten.length - 1]!, q) <= 0) unten.pop();
    unten.push(q);
  }
  const oben: Punkt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]!;
    while (oben.length >= 2 && kreuz(oben[oben.length - 2]!, oben[oben.length - 1]!, q) <= 0) oben.pop();
    oben.push(q);
  }
  unten.pop();
  oben.pop();
  return unten.concat(oben).flat();
}

/** nächste Punkte der Strecken p0–p1 und q0–q1 (Ericson 5.1.9) nach aus[0 … 3] */
function naechste(
  p0x: number, p0y: number, p1x: number, p1y: number, q0x: number, q0y: number, q1x: number, q1y: number, aus: Float64Array,
): void {
  const d1x = p1x - p0x, d1y = p1y - p0y, d2x = q1x - q0x, d2y = q1y - q0y, rx = p0x - q0x, ry = p0y - q0y;
  const a = d1x * d1x + d1y * d1y, e = d2x * d2x + d2y * d2y, f = d2x * rx + d2y * ry;
  let s = 0, t = 0;
  if (a <= WINZIG) {
    t = e <= WINZIG ? 0 : klemmen(f / e, 0, 1);
  } else {
    const c = d1x * rx + d1y * ry;
    if (e <= WINZIG) {
      s = klemmen(-c / a, 0, 1);
    } else {
      const b = d1x * d2x + d1y * d2y;
      const nenner = a * e - b * b;
      s = nenner > 1e-12 * a * e ? klemmen((b * f - c * e) / nenner, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = klemmen(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = klemmen((b - c) / a, 0, 1);
      }
    }
  }
  aus[0] = p0x + s * d1x;
  aus[1] = p0y + s * d1y;
  aus[2] = q0x + t * d2x;
  aus[3] = q0y + t * d2y;
}

/** Quadrat des Abstands von (px, py) zur Strecke k[0 … 3] */
function abstandQuadrat(px: number, py: number, k: Float64Array): number {
  const ax = k[0]!, ay = k[1]!, ex = k[2]! - ax, ey = k[3]! - ay;
  const ee = ex * ex + ey * ey;
  const t = ee <= WINZIG ? 0 : klemmen(((px - ax) * ex + (py - ay) * ey) / ee, 0, 1);
  const dx = px - (ax + t * ex), dy = py - (ay + t * ey);
  return dx * dx + dy * dy;
}

/** Eintritt des Strahls s + t·d in den Kreis (Mitte c, Radius r), t in [0, 1], sonst ∞ */
function strahlKreis(sx: number, sy: number, dx: number, dy: number, cx: number, cy: number, r: number): number {
  const mx = sx - cx, my = sy - cy;
  const a = dx * dx + dy * dy;
  if (a === 0) return Infinity;
  const b = mx * dx + my * dy, c = mx * mx + my * my - r * r;
  if (c < 0) return Infinity;
  const diskriminante = b * b - a * c;
  if (diskriminante < 0) return Infinity;
  const t = (-b - Math.sqrt(diskriminante)) / a;
  return t >= 0 && t <= 1 ? t : Infinity;
}

/** Schnitt des Strahls s + t·d mit der Strecke q0–q1 (beide Seiten), t in [0, 1], sonst ∞ */
function strahlStrecke(sx: number, sy: number, dx: number, dy: number, q0x: number, q0y: number, q1x: number, q1y: number): number {
  const ex = q1x - q0x, ey = q1y - q0y;
  const nenner = dx * ey - dy * ex;
  if (nenner === 0) return Infinity;
  const wx = q0x - sx, wy = q0y - sy;
  const t = (wx * ey - wy * ex) / nenner;
  const u = (wx * dy - wy * dx) / nenner;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : Infinity;
}

// ---------- Prüfen der Eingaben ----------

function endlich(x: number, was: string): void {
  if (!Number.isFinite(x)) throw new RangeError(`WeltAttrappe: ${was} ist keine endliche Zahl (${String(x)})`);
}

function nichtNegativ(x: number, was: string): void {
  endlich(x, was);
  if (x < 0) throw new RangeError(`WeltAttrappe: ${was} ist negativ (${x})`);
}

function punktPruefen(p: Punkt, was: string): void {
  endlich(p[0], `${was} x`);
  endlich(p[1], `${was} y`);
}

function lagePruefen(l: Lage, was: string): void {
  endlich(l.x, `${was}: Lage x`);
  endlich(l.y, `${was}: Lage y`);
  endlich(l.w, `${was}: Lage w`);
}

function federPruefen(f: FederMass, was: string): void {
  nichtNegativ(f.f, `${was}: Frequenz`);
  nichtNegativ(f.zeta, `${was}: Dämpfung`);
}

function kraftPruefen(k: number, was: string): void {
  if (!(k >= 0)) throw new RangeError(`WeltAttrappe: ${was} ist keine Kraft ≥ 0 (${String(k)})`);
}

/** Hülle in Tabellenform: Art, Radius, Punkte flach (lokal), Schleife */
function formEinlesen(h: Huelle, was: string): { art: number; r: number; punkte: number[]; schleife: boolean } {
  let f: { art: number; r: number; punkte: number[]; schleife: boolean };
  if ('kreis' in h) {
    f = { art: KREIS, r: h.kreis.r, punkte: [h.kreis.mitte[0], h.kreis.mitte[1]], schleife: false };
  } else if ('kapsel' in h) {
    const { a, b } = h.kapsel;
    f = { art: KAPSEL, r: h.kapsel.r, punkte: [a[0], a[1], b[0], b[1]], schleife: false };
  } else if ('vieleck' in h) {
    if (h.vieleck.punkte.length > VIELECK_PUNKTE)
      throw new RangeError(`WeltAttrappe: ${was}: Vieleck mit ${h.vieleck.punkte.length} Punkten (höchstens ${VIELECK_PUNKTE})`);
    for (const p of h.vieleck.punkte) punktPruefen(p, `${was}: Vieleck`);
    const punkte = konvexeHuelle(h.vieleck.punkte);
    if (punkte.length < 6) throw new RangeError(`WeltAttrappe: ${was}: Vieleck mit weniger als drei Ecken`);
    f = { art: VIELECK, r: h.vieleck.rundung, punkte, schleife: false };
  } else if ('kette' in h) {
    if (h.kette.punkte.length < (h.kette.schleife ? 3 : 2))
      throw new RangeError(`WeltAttrappe: ${was}: Kette mit ${h.kette.punkte.length} Punkten (offen mindestens zwei, Schleife drei)`);
    f = { art: KETTE, r: 0, punkte: h.kette.punkte.flat(), schleife: h.kette.schleife };
  } else {
    throw new RangeError(`WeltAttrappe: ${was}: unbekannte Hülle`);
  }
  nichtNegativ(f.r, `${was}: Radius`);
  for (const x of f.punkte) endlich(x, `${was}: Punkt`);
  return f;
}

/** Sicht auf eine Hülle oder Zone; `mx`, `my`: Mitte ihres umfassenden Kreises */
interface FormSicht { art: number; anfang: number; zahl: number; schleife: boolean; r: number; mx: number; my: number }

function leereForm(): FormSicht {
  return { art: KREIS, anfang: 0, zahl: 0, schleife: false, r: 0, mx: 0, my: 0 };
}

// ---------- die Attrappe ----------

export class WeltAttrappe implements WeltAdapter {
  // Zustand: alles, was merken sichert und pruefsumme zählt
  private readonly welt = new Float64Array(WB);
  private readonly koerperT = new Tabelle(KB);
  private readonly huellenT = new Tabelle(HB);
  private readonly punkteT = new Tabelle(2, 32);
  private readonly zonenT = new Tabelle(ZB);
  private readonly gelenkeT = new Tabelle(GB);
  private readonly beineT = new Tabelle(BB);
  private readonly beinErgT = new Tabelle(BEIN_FELDER);
  private readonly kontaktErgT = new Tabelle(KONTAKT_FELDER);
  private readonly beruehrtT = new Tabelle(2);
  private readonly zonenErgT = new Tabelle(ZONE_FELDER);
  private readonly drinT = new Tabelle(2);

  // Abgeleitetes: aus dem Zustand neu gerechnet, nie gesichert
  private schmutzig = true;
  private rot: Float64Array = new Float64Array(16);       // je Körper cos w, sin w
  private rot0: Float64Array = new Float64Array(16);      // dieselben am Anfang des Teilschritts
  private dc: Float64Array = new Float64Array(16);        // je Körper Weg des Schwerpunkts im Teilschritt
  private beinJe: Float64Array = new Float64Array(8);     // je Körper Zahl seiner Federbeine im Schritt
  private beinStoss: Float64Array = new Float64Array(32); // je Bein Beinpunkt und Stoß des Teilschritts
  private weltP: Float64Array = new Float64Array(64);     // je Punkt x, y in der Welt
  private kreisH: Float64Array = new Float64Array(24);    // je Hülle umfassender Kreis: Mitte, Radius
  private gl: Float64Array = new Float64Array(JL * 8);    // Löserdaten je Gelenk
  private readonly fl = new Float64Array(FL);
  private readonly weichT = new Float64Array(9);   // Kontakt beweglich, Kontakt gegen Festes, Gelenk
  private readonly kp = new Tabelle(PB, 32);       // Kontaktpunkte des Teilschritts
  private readonly neuT = new Tabelle(6);          // berührte Paare nach dem Schritt: Hüllen, Mitte, Normale
  private readonly neuDrinT = new Tabelle(2);      // Zone und Körper nach dem Schritt
  private readonly summen = new Map<number, number>();   // Hüllenpaar → Zeile in summenT
  private readonly summenT = new Tabelle(2, 16);         // je Paar Normalimpuls, Annäherungstempo
  private readonly np = new Float64Array(4);
  private readonly ka = new Float64Array(4);
  private readonly kb = new Float64Array(4);
  private readonly mh = new Float64Array(4);
  private readonly nrm = new Float64Array(2);
  private readonly treffer = new Float64Array(STRAHL_FELDER);
  private readonly fa = leereForm();
  private readonly fb = leereForm();

  constructor() {
    this.neu([0, 0]);
  }

  // ---------- Aufbau ----------

  laden(): Promise<void> {
    return Promise.resolve();
  }

  neu(schwerkraft: Punkt): void {
    punktPruefen(schwerkraft, 'neu: Schwerkraft');
    for (const t of this.tabellen()) t.n = 0;
    this.welt.fill(0);
    this.welt[W_GX] = schwerkraft[0];
    this.welt[W_GY] = schwerkraft[1];
    this.welt[W_FK] = -1;
    this.schmutzig = true;
  }

  koerper(art: KoerperArt, lage: Lage, masse?: Masse): number {
    const code = art === 'fest' ? FEST : art === 'beweglich' ? BEWEGLICH : art === 'gefuehrt' ? GEFUEHRT : -1;
    if (code < 0) throw new RangeError(`WeltAttrappe: koerper: unbekannte Art ${String(art)}`);
    lagePruefen(lage, 'koerper');
    if (masse !== undefined) {
      nichtNegativ(masse.masse, 'koerper: Masse');
      nichtNegativ(masse.traegheit, 'koerper: Trägheit');
      punktPruefen(masse.schwerpunkt, 'koerper: Schwerpunkt');
    }
    const k = this.koerperT.zeile();
    const d = this.koerperT.d, o = k * KB;
    d[o + K_ART] = code;
    d[o + K_AKTIV] = 1;
    d[o + K_X] = lage.x;
    d[o + K_Y] = lage.y;
    d[o + K_W] = bogenNormal(gradZuRad(lage.w));
    if (masse !== undefined) {
      d[o + K_MFEST] = 1;
      d[o + K_M] = masse.masse;
      d[o + K_I] = masse.traegheit;
      d[o + K_LX] = masse.schwerpunkt[0];
      d[o + K_LY] = masse.schwerpunkt[1];
    }
    this.schwerpunktSetzen(k);
    this.masseRechnen(k);
    this.schmutzig = true;
    return k;
  }

  aktiv(k: number, an: boolean): void {
    this.koerperPruefen(k, 'aktiv');
    this.koerperT.d[k * KB + K_AKTIV] = an ? 1 : 0;
    this.schmutzig = true;
  }

  entfernen(k: number): void {
    this.koerperPruefen(k, 'entfernen');
    const d = this.koerperT.d;
    d[k * KB + K_WEG] = 1;
    d[k * KB + K_AKTIV] = 0;
    const G = this.gelenkeT.d;
    for (let g = 0; g < this.gelenkeT.n; g++) {
      if (G[g * GB + G_A] === k || G[g * GB + G_B] === k) G[g * GB + G_WEG] = 1;
    }
    if (this.welt[W_FK] === k) this.welt[W_FK] = -1;
    this.schmutzig = true;
  }

  huelle(k: number, h: Huelle, s: StoffWerte, schnell = false): number {
    this.koerperPruefen(k, 'huelle');
    nichtNegativ(s.haftung, 'huelle: Haftung');
    nichtNegativ(s.abprall, 'huelle: Abprall');
    nichtNegativ(s.rollwiderstand, 'huelle: Rollwiderstand');
    nichtNegativ(s.dichte, 'huelle: Dichte');
    const f = formEinlesen(h, 'huelle');
    const anfang = this.punkteAnhaengen(f.punkte);
    const i = this.huellenT.zeile();
    const H = this.huellenT.d, o = i * HB;
    H[o + H_KOERPER] = k;
    H[o + H_ART] = f.art;
    H[o + H_R] = f.r;
    H[o + H_ANFANG] = anfang;
    H[o + H_ZAHL] = f.punkte.length / 2;
    H[o + H_SCHLEIFE] = f.schleife ? 1 : 0;
    H[o + H_HAFTUNG] = s.haftung;
    H[o + H_ABPRALL] = s.abprall;
    H[o + H_ROLL] = s.rollwiderstand;
    H[o + H_DICHTE] = s.dichte;
    H[o + H_SCHNELL] = schnell ? 1 : 0;
    if (schnell) this.koerperT.d[k * KB + K_SCHNELL] = 1;
    this.masseRechnen(k);
    this.schmutzig = true;
    return i;
  }

  scharnier(a: number, b: number, punkt: Punkt, motor?: { tempo: number; moment: number }, grenzen?: [number, number]): number {
    punktPruefen(punkt, 'scharnier: Punkt');
    if (motor !== undefined) {
      endlich(motor.tempo, 'scharnier: Motortempo');
      nichtNegativ(motor.moment, 'scharnier: Motormoment');
    }
    if (grenzen !== undefined) {
      endlich(grenzen[0], 'scharnier: untere Grenze');
      endlich(grenzen[1], 'scharnier: obere Grenze');
      if (grenzen[0] > grenzen[1]) throw new RangeError('WeltAttrappe: scharnier: untere Grenze über der oberen');
    }
    const g = this.gelenkAnlegen(SCHARNIER, a, b);
    const G = this.gelenkeT.d, o = g * GB;
    this.lokalNach(a, punkt[0], punkt[1], G, o + G_AX);
    this.lokalNach(b, punkt[0], punkt[1], G, o + G_BX);
    if (motor !== undefined) {
      G[o + G_MOTOR] = 1;
      G[o + G_MTEMPO] = gradZuRad(motor.tempo);
      G[o + G_MMOMENT] = motor.moment;
    }
    if (grenzen !== undefined) {
      G[o + G_GRENZEN] = 1;
      G[o + G_UNTEN] = gradZuRad(grenzen[0]);
      G[o + G_OBEN] = gradZuRad(grenzen[1]);
    }
    return g;
  }

  ziel(a: number, b: number, feder: FederMass, hoechstkraft: number): number {
    federPruefen(feder, 'ziel');
    kraftPruefen(hoechstkraft, 'ziel: Höchstkraft');
    const g = this.gelenkAnlegen(ZIEL, a, b);
    const G = this.gelenkeT.d, o = g * GB, K = this.koerperT.d;
    this.lokalNach(a, K[b * KB + K_X]!, K[b * KB + K_Y]!, G, o + G_AX);
    G[o + G_F] = feder.f;
    G[o + G_ZETA] = feder.zeta;
    G[o + G_KRAFT] = hoechstkraft;
    return g;
  }

  zielSetzen(gelenk: number, lage: Lage, hoechstkraft?: number, feder?: FederMass): void {
    const G = this.gelenkeT.d, o = gelenk * GB;
    if (!Number.isInteger(gelenk) || gelenk < 0 || gelenk >= this.gelenkeT.n || G[o + G_WEG] === 1 || G[o + G_ART] !== ZIEL)
      throw new RangeError(`WeltAttrappe: zielSetzen: ${gelenk} ist kein Motor-Gelenk`);
    lagePruefen(lage, 'zielSetzen');
    if (hoechstkraft !== undefined) kraftPruefen(hoechstkraft, 'zielSetzen: Höchstkraft');
    if (feder !== undefined) federPruefen(feder, 'zielSetzen');
    G[o + G_AX] = lage.x;
    G[o + G_AY] = lage.y;
    G[o + G_REF] = bogenNormal(gradZuRad(lage.w));
    if (hoechstkraft !== undefined) G[o + G_KRAFT] = hoechstkraft;
    if (feder !== undefined) {
      G[o + G_F] = feder.f;
      G[o + G_ZETA] = feder.zeta;
    }
  }

  finger(an: boolean, punkt: Punkt, feder: FederMass, hoechstkraft: number): void {
    const W = this.welt;
    if (!an) {
      W[W_FAN] = 0;
      W[W_FK] = -1;
      return;
    }
    punktPruefen(punkt, 'finger');
    federPruefen(feder, 'finger');
    kraftPruefen(hoechstkraft, 'finger: Höchstkraft');
    if (W[W_FAN] !== 1) {
      this.geometrie();
      const k = this.koerperUnter(punkt[0], punkt[1]);
      W[W_FAN] = 1;
      W[W_FK] = k;
      if (k >= 0) this.lokalNach(k, punkt[0], punkt[1], W, W_FAX);
    }
    W[W_FZX] = punkt[0];
    W[W_FZY] = punkt[1];
    W[W_FF] = feder.f;
    W[W_FZETA] = feder.zeta;
    W[W_FKRAFT] = hoechstkraft;
  }

  federbein(k: number, von: Punkt, richtung: Punkt, laenge: number, feder: FederMass, anteil?: number): number {
    this.koerperPruefen(k, 'federbein');
    punktPruefen(von, 'federbein: von');
    punktPruefen(richtung, 'federbein: Richtung');
    nichtNegativ(laenge, 'federbein: Länge');
    federPruefen(feder, 'federbein');
    if (!(feder.f > 0)) throw new RangeError('WeltAttrappe: federbein: die Frequenz muss größer als 0 sein');
    if (anteil !== undefined) nichtNegativ(anteil, 'federbein: Anteil');
    const rl = Math.sqrt(richtung[0] * richtung[0] + richtung[1] * richtung[1]);
    if (!(rl > 0)) throw new RangeError('WeltAttrappe: federbein: Richtung der Länge 0');
    const b = this.beineT.zeile();
    const B = this.beineT.d, o = b * BB, K = this.koerperT.d, w = K[k * KB + K_W]!, c = cos(w), s = sin(w);
    this.lokalNach(k, von[0], von[1], B, o + B_VX);
    const rx = richtung[0] / rl, ry = richtung[1] / rl;
    B[o + B_KOERPER] = k;
    B[o + B_RX] = c * rx + s * ry;
    B[o + B_RY] = -s * rx + c * ry;
    B[o + B_LAENGE] = laenge;
    B[o + B_F] = feder.f;
    B[o + B_ZETA] = feder.zeta;
    B[o + B_ANTEIL] = anteil ?? NaN;
    return b;
  }

  kraftpaar(a: number, b: number, punkt: Punkt, kraft: Punkt): void {
    this.koerperPruefen(a, 'kraftpaar');
    this.koerperPruefen(b, 'kraftpaar');
    punktPruefen(punkt, 'kraftpaar: Punkt');
    punktPruefen(kraft, 'kraftpaar: Kraft');
    this.kraftAddieren(a, punkt, kraft[0], kraft[1]);
    this.kraftAddieren(b, punkt, -kraft[0], -kraft[1]);
  }

  fuehren(k: number, lage: Lage): void {
    this.koerperPruefen(k, 'fuehren');
    lagePruefen(lage, 'fuehren');
    const d = this.koerperT.d, o = k * KB;
    if (d[o + K_ART] === FEST) return;
    d[o + K_FUEHREN] = 1;
    d[o + K_ZX] = lage.x;
    d[o + K_ZY] = lage.y;
    d[o + K_ZW] = bogenNormal(gradZuRad(lage.w));
  }

  zone(h: Huelle, lage: Lage): number {
    lagePruefen(lage, 'zone');
    const f = formEinlesen(h, 'zone');
    const w = gradZuRad(lage.w), c = cos(w), s = sin(w), p = f.punkte;
    for (let i = 0; i < p.length; i += 2) {
      const x = p[i]!, y = p[i + 1]!;
      p[i] = lage.x + c * x - s * y;
      p[i + 1] = lage.y + s * x + c * y;
    }
    const anfang = this.punkteAnhaengen(p);
    const z = this.zonenT.zeile();
    const Z = this.zonenT.d, o = z * ZB;
    Z[o + Z_ART] = f.art;
    Z[o + Z_R] = f.r;
    Z[o + Z_ANFANG] = anfang;
    Z[o + Z_ZAHL] = p.length / 2;
    Z[o + Z_SCHLEIFE] = f.schleife ? 1 : 0;
    this.schmutzig = true;
    return z;
  }

  // ---------- Abfragen ----------

  strahl(von: Punkt, nach: Punkt, aus: Float64Array): boolean {
    if (aus.length < STRAHL_FELDER) throw new RangeError(`WeltAttrappe: strahl: aus braucht ${STRAHL_FELDER} Zahlen`);
    punktPruefen(von, 'strahl: von');
    punktPruefen(nach, 'strahl: nach');
    this.geometrie();
    if (!this.strahlSuchen(von[0], von[1], nach[0] - von[0], nach[1] - von[1], -1, false, 0)) return false;
    aus.set(this.treffer);
    return true;
  }

  lesen(aus: WeltPuffer): void {
    const n = this.koerperT.n, d = this.koerperT.d;
    if (aus.lagen.length < LAGE_FELDER * n || aus.tempi.length < TEMPO_FELDER * n)
      throw new RangeError(`WeltAttrappe: lesen: lagen und tempi brauchen Platz für ${n} Körper`);
    for (let k = 0; k < n; k++) {
      const o = k * KB, l = LAGE_FELDER * k, t = TEMPO_FELDER * k;
      if (d[o + K_WEG] === 1) {
        aus.lagen.fill(NaN, l, l + LAGE_FELDER);
        aus.tempi.fill(NaN, t, t + TEMPO_FELDER);
        continue;
      }
      const x = d[o + K_X]!, y = d[o + K_Y]!, om = d[o + K_OM]!;
      aus.lagen[l] = x;
      aus.lagen[l + 1] = y;
      aus.lagen[l + 2] = radZuGrad(d[o + K_W]!);
      // Tempo des Ursprungs aus dem Tempo des Schwerpunkts und der Drehung
      aus.tempi[t] = d[o + K_VX]! - om * (y - d[o + K_CY]!);
      aus.tempi[t + 1] = d[o + K_VY]! + om * (x - d[o + K_CX]!);
      aus.tempi[t + 2] = radZuGrad(om);
    }
    aus.kontaktZahl = this.kopieren(this.kontaktErgT, aus.kontakte);
    aus.zonenZahl = this.kopieren(this.zonenErgT, aus.zonen);
    if (aus.beine !== undefined) aus.beinZahl = this.kopieren(this.beinErgT, aus.beine);
  }

  pruefsumme(): number {
    return pruefsumme([this.welt, ...this.tabellen().map((t) => t.sicht())]);
  }

  merken(): Uint8Array {
    const tabellen = this.tabellen();
    const kopf = 3 + 2 * tabellen.length;
    let laenge = kopf + WB;
    for (const t of tabellen) laenge += t.n * t.breite;
    const f = new Float64Array(laenge);
    f[0] = KENNZAHL;
    f[1] = FASSUNG;
    f[2] = tabellen.length;
    tabellen.forEach((t, i) => {
      f[3 + 2 * i] = t.n;
      f[4 + 2 * i] = t.breite;
    });
    let o = kopf;
    f.set(this.welt, o);
    o += WB;
    for (const t of tabellen) {
      f.set(t.sicht(), o);
      o += t.n * t.breite;
    }
    return new Uint8Array(f.buffer);
  }

  zuruecksetzen(stand: Uint8Array): void {
    if (stand.byteLength % 8 !== 0) throw new RangeError('WeltAttrappe: zuruecksetzen: kein Schlüsselstand der Attrappe');
    const f = stand.byteOffset % 8 === 0
      ? new Float64Array(stand.buffer, stand.byteOffset, stand.byteLength / 8)
      : new Float64Array(stand.slice().buffer);
    const tabellen = this.tabellen();
    const kopf = 3 + 2 * tabellen.length;
    if (f.length < kopf || f[0] !== KENNZAHL || f[1] !== FASSUNG || f[2] !== tabellen.length)
      throw new RangeError('WeltAttrappe: zuruecksetzen: kein Schlüsselstand dieser Fassung der Attrappe');
    let laenge = kopf + WB;
    tabellen.forEach((t, i) => {
      const n = f[3 + 2 * i]!;
      if (f[4 + 2 * i] !== t.breite || !Number.isInteger(n) || n < 0)
        throw new RangeError('WeltAttrappe: zuruecksetzen: Tabellen passen nicht');
      laenge += n * t.breite;
    });
    if (f.length !== laenge) throw new RangeError('WeltAttrappe: zuruecksetzen: Länge passt nicht');
    let o = kopf;
    this.welt.set(f.subarray(o, o + WB));
    o += WB;
    tabellen.forEach((t, i) => {
      const n = f[3 + 2 * i]!;
      t.platz(n);
      t.n = n;
      t.d.set(f.subarray(o, o + n * t.breite));
      o += n * t.breite;
    });
    this.schmutzig = true;
  }

  // ---------- der Schritt ----------

  schritt(dt: number, teilschritte: number): void {
    if (!(dt > 0) || !Number.isFinite(dt)) throw new RangeError(`WeltAttrappe: schritt: dt ${String(dt)} ist nicht positiv`);
    if (!Number.isInteger(teilschritte) || teilschritte < 1)
      throw new RangeError(`WeltAttrappe: schritt: ${String(teilschritte)} Teilschritte`);
    const h = dt / teilschritte;
    this.geometrie();
    this.fuehrenAnwenden(dt);
    this.schrittBeginnen();
    const kh = Math.min(KONTAKT_HERTZ, 0.25 / h);
    weich(kh, KONTAKT_DAEMPFUNG, h, this.weichT, 0);
    weich(2 * kh, KONTAKT_DAEMPFUNG, h, this.weichT, 3);
    weich(2 * kh, GELENK_DAEMPFUNG, h, this.weichT, 6);
    for (let s = 0; s < teilschritte; s++) {
      this.geometrie();
      this.teilschrittBeginnen();
      this.beineRechnen(h);
      this.tempoRechnen(h);
      this.kontakteSuchen(SPEKULATIV);
      this.gelenkeVorbereiten(h);
      this.fingerVorbereiten(h);
      for (let i = 0; i < DURCHGAENGE; i++) {
        this.gelenkeLoesen(h, true);
        this.fingerLoesen();
        this.kontakteLoesen(h, true);
      }
      this.lageRechnen(h);
      this.gelenkeLoesen(h, false);
      this.kontakteLoesen(h, false);
      this.abprallen();
      this.kontakteSummieren();
    }
    this.geometrie();
    this.ereignisseRechnen();
    // was nur für diesen Schritt galt
    const d = this.koerperT.d;
    for (let k = 0; k < this.koerperT.n; k++) d.fill(0, k * KB + K_FX, k * KB + K_TQ + 1);
    this.beineT.n = 0;
  }

  private fuehrenAnwenden(dt: number): void {
    const d = this.koerperT.d;
    for (let k = 0; k < this.koerperT.n; k++) {
      const o = k * KB;
      if (d[o + K_FUEHREN] !== 1) continue;
      d[o + K_FUEHREN] = 0;
      if (d[o + K_WEG] === 1) continue;
      const zw = d[o + K_ZW]!, c = cos(zw), s = sin(zw), lx = d[o + K_LX]!, ly = d[o + K_LY]!;
      const zx = d[o + K_ZX]! + c * lx - s * ly, zy = d[o + K_ZY]! + s * lx + c * ly;
      d[o + K_VX] = (zx - d[o + K_CX]!) / dt;
      d[o + K_VY] = (zy - d[o + K_CY]!) / dt;
      d[o + K_OM] = bogenNormal(zw - d[o + K_W]!) / dt;
    }
  }

  private schrittBeginnen(): void {
    const nK = this.koerperT.n;
    this.beinJe = genug(this.beinJe, nK);
    this.beinJe.fill(0, 0, nK);
    const B = this.beineT.d;
    for (let b = 0; b < this.beineT.n; b++) {
      const k = B[b * BB + B_KOERPER]!;
      this.beinJe[k] = this.beinJe[k]! + 1;
    }
    this.beinErgT.n = 0;
    for (let b = 0; b < this.beineT.n; b++) this.beinErgT.zeile();
    this.summen.clear();
    this.summenT.n = 0;
  }

  private teilschrittBeginnen(): void {
    const n = 2 * this.koerperT.n;
    this.rot0 = genug(this.rot0, n);
    this.dc = genug(this.dc, n);
    this.rot0.set(this.rot.subarray(0, n));
    this.dc.fill(0, 0, n);
  }

  /**
   * Federbeine: Strahl, Federkraft längs der Normale am Treffer, gegengleich auf den getroffenen Körper. Alle Beine rechnen aus
   * demselben Stand und wirken erst danach (sonst sähe jedes Bein den Stoß des vorigen, und zwei gleiche Beine gäben ein Moment).
   */
  private beineRechnen(h: number): void {
    const B = this.beineT.d, E = this.beinErgT.d, K = this.koerperT.d, R = this.rot, T = this.treffer;
    const g = Math.sqrt(this.welt[W_GX]! * this.welt[W_GX]! + this.welt[W_GY]! * this.welt[W_GY]!);
    this.beinStoss = genug(this.beinStoss, 4 * this.beineT.n);
    const S = this.beinStoss;
    for (let b = 0; b < this.beineT.n; b++) {
      const o = b * BB, e = b * BEIN_FELDER, k = B[o + B_KOERPER]!, ok = k * KB;
      S[4 * b + 2] = 0;
      S[4 * b + 3] = 0;
      if (!this.lebt(k)) {
        E[e] = 0;
        E[e + 1] = NaN;
        E[e + 2] = 0;
        E[e + 3] = -1;
        E[e + 4] = NaN;
        E[e + 5] = NaN;
        continue;
      }
      const c = R[2 * k]!, s = R[2 * k + 1]!, lvx = B[o + B_VX]!, lvy = B[o + B_VY]!;
      const vx = K[ok + K_X]! + c * lvx - s * lvy, vy = K[ok + K_Y]! + s * lvx + c * lvy;
      const rx = c * B[o + B_RX]! - s * B[o + B_RY]!, ry = s * B[o + B_RX]! + c * B[o + B_RY]!;
      const om = ZWEI_PI * B[o + B_F]!, zeta = B[o + B_ZETA]!;
      const ruhe = B[o + B_LAENGE]! + g / (om * om);
      if (!this.strahlSuchen(vx, vy, rx * ruhe, ry * ruhe, k, false, 0)) {
        E[e] = 0;
        E[e + 1] = ruhe;
        E[e + 2] = 0;
        E[e + 3] = -1;
        E[e + 4] = vx + rx * ruhe;
        E[e + 5] = vy + ry * ruhe;
        continue;
      }
      const hx = T[0]!, hy = T[1]!, nx = T[2]!, ny = T[3]!, abstand = T[4]! * ruhe, kh = T[5]!, oh = kh * KB;
      const wk = K[ok + K_OM]!, wh = K[oh + K_OM]!;
      const ukx = K[ok + K_VX]! - wk * (vy - K[ok + K_CY]!), uky = K[ok + K_VY]! + wk * (vx - K[ok + K_CX]!);
      const uhx = K[oh + K_VX]! - wh * (hy - K[oh + K_CY]!), uhy = K[oh + K_VY]! + wh * (hx - K[oh + K_CX]!);
      const u = (ukx - uhx) * nx + (uky - uhy) * ny;
      let anteil = B[o + B_ANTEIL]!;
      if (Number.isNaN(anteil)) anteil = K[ok + K_M]! / this.beinJe[k]!;
      let kraft = anteil * (om * om * (ruhe - abstand) - 2 * zeta * om * u);
      if (!(kraft > 0)) kraft = 0;
      S[4 * b] = vx;
      S[4 * b + 1] = vy;
      S[4 * b + 2] = kraft * h * nx;
      S[4 * b + 3] = kraft * h * ny;
      E[e] = 1;
      E[e + 1] = abstand;
      E[e + 2] = kraft;
      E[e + 3] = kh;
      E[e + 4] = hx;
      E[e + 5] = hy;
    }
    for (let b = 0; b < this.beineT.n; b++) {
      const jx = S[4 * b + 2]!, jy = S[4 * b + 3]!;
      if (jx === 0 && jy === 0) continue;
      const k = B[b * BB + B_KOERPER]!, kh = E[b * BEIN_FELDER + 3]!;
      if (K[k * KB + K_ART] === BEWEGLICH) this.impuls(k, S[4 * b]!, S[4 * b + 1]!, jx, jy);
      if (K[kh * KB + K_ART] === BEWEGLICH) this.impuls(kh, E[b * BEIN_FELDER + 4]!, E[b * BEIN_FELDER + 5]!, -jx, -jy);
    }
  }

  /** Schwerkraft und Kräfte der Kräftepaare */
  private tempoRechnen(h: number): void {
    const d = this.koerperT.d, gx = this.welt[W_GX]!, gy = this.welt[W_GY]!;
    for (let k = 0; k < this.koerperT.n; k++) {
      const o = k * KB;
      if (d[o + K_ART] !== BEWEGLICH || !this.lebt(k)) continue;
      const im = d[o + K_IM]!;
      d[o + K_VX] = d[o + K_VX]! + h * (gx + im * d[o + K_FX]!);
      d[o + K_VY] = d[o + K_VY]! + h * (gy + im * d[o + K_FY]!);
      d[o + K_OM] = d[o + K_OM]! + h * d[o + K_II]! * d[o + K_TQ]!;
    }
  }

  /** Lagen fortschreiben; schnelle Körper halten vor festen und geführten Hüllen an */
  private lageRechnen(h: number): void {
    const d = this.koerperT.d;
    for (let k = 0; k < this.koerperT.n; k++) {
      const o = k * KB;
      if (d[o + K_ART] === FEST || !this.lebt(k)) continue;
      let dx = h * d[o + K_VX]!, dy = h * d[o + K_VY]!;
      if (d[o + K_ART] === BEWEGLICH && d[o + K_SCHNELL] === 1) {
        const t = this.schweifen(k, dx, dy);
        dx *= t;
        dy *= t;
      }
      const cx = d[o + K_CX]! + dx, cy = d[o + K_CY]! + dy;
      const w = bogenNormal(d[o + K_W]! + h * d[o + K_OM]!);
      d[o + K_CX] = cx;
      d[o + K_CY] = cy;
      d[o + K_W] = w;
      const c = cos(w), s = sin(w), lx = d[o + K_LX]!, ly = d[o + K_LY]!;
      this.rot[2 * k] = c;
      this.rot[2 * k + 1] = s;
      d[o + K_X] = cx - (c * lx - s * ly);
      d[o + K_Y] = cy - (s * lx + c * ly);
      this.dc[2 * k] = dx;
      this.dc[2 * k + 1] = dy;
    }
    this.schmutzig = true;
  }

  /** Anteil des Wegs (0 bis 1), den ein schneller Körper gehen darf, bevor eine seiner Hüllen eine feste oder geführte trifft */
  private schweifen(k: number, dx: number, dy: number): number {
    const weg = Math.sqrt(dx * dx + dy * dy);
    if (weg === 0) return 1;
    const H = this.huellenT.d, P = this.weltP;
    let t = 1;
    for (let h = 0; h < this.huellenT.n; h++) {
      const o = h * HB;
      if (H[o + H_KOERPER] !== k || H[o + H_ART] === KETTE) continue;
      const a = H[o + H_ANFANG]!, z = H[o + H_ZAHL]!, r = H[o + H_R]!;
      for (let i = a; i < a + z; i++) {
        if (this.strahlSuchen(P[2 * i]!, P[2 * i + 1]!, dx, dy, k, true, r) && this.treffer[4]! < t) t = this.treffer[4]!;
      }
    }
    return t >= 1 ? 1 : Math.max(0, t - SCHLUPF / weg);
  }

  // ---------- Gelenke und Finger ----------

  private gelenkeVorbereiten(h: number): void {
    const G = this.gelenkeT.d, K = this.koerperT.d;
    this.gl = genug(this.gl, JL * this.gelenkeT.n);
    const L = this.gl;
    for (let g = 0; g < this.gelenkeT.n; g++) {
      const o = g * GB, l = g * JL, a = G[o + G_A]!, b = G[o + G_B]!;
      L.fill(0, l, l + JL);
      if (G[o + G_WEG] === 1 || !this.lebt(a) || !this.lebt(b)) continue;
      const ima = K[a * KB + K_IM]!, iia = K[a * KB + K_II]!, imb = K[b * KB + K_IM]!, iib = K[b * KB + K_II]!;
      if (ima + imb === 0 && iia + iib === 0) continue;
      L[l + L_AKTIV] = 1;
      L[l + L_AXIAL] = iia + iib > 0 ? 1 / (iia + iib) : 0;
      if (G[o + G_ART] === ZIEL) {
        const kraft = G[o + G_KRAFT]!, f = G[o + G_F]!;
        if (!(kraft > 0 && f > 0)) {
          L[l + L_AKTIV] = 0;
          continue;
        }
        weich(f, G[o + G_ZETA]!, h, L, l + L_WEICH);
        L[l + L_MAXF] = kraft * h;
        L[l + L_MAXT] = iia + iib > 0 ? kraft * Math.sqrt((ima + imb) / (iia + iib)) * h : 0;
      }
    }
  }

  private gelenkeLoesen(h: number, mitKorrektur: boolean): void {
    const G = this.gelenkeT.d, L = this.gl, K = this.koerperT.d, R = this.rot, Wt = this.weichT;
    for (let g = 0; g < this.gelenkeT.n; g++) {
      const o = g * GB, l = g * JL;
      if (L[l + L_AKTIV] !== 1) continue;
      const art = G[o + G_ART]!;
      if (art === ZIEL && !mitKorrektur) continue;   // Federn wirken nur im Hauptdurchgang
      const a = G[o + G_A]!, b = G[o + G_B]!, oa = a * KB, ob = b * KB;
      const ima = K[oa + K_IM]!, iia = K[oa + K_II]!, imb = K[ob + K_IM]!, iib = K[ob + K_II]!;
      let vax = K[oa + K_VX]!, vay = K[oa + K_VY]!, wa = K[oa + K_OM]!;
      let vbx = K[ob + K_VX]!, vby = K[ob + K_VY]!, wb = K[ob + K_OM]!;
      const ca = R[2 * a]!, sa = R[2 * a + 1]!, cb = R[2 * b]!, sb = R[2 * b + 1]!;
      const lax = G[o + G_AX]! - K[oa + K_LX]!, lay = G[o + G_AY]! - K[oa + K_LY]!;
      const lbx = G[o + G_BX]! - K[ob + K_LX]!, lby = G[o + G_BY]! - K[ob + K_LY]!;
      const rax = ca * lax - sa * lay, ray = sa * lax + ca * lay, rbx = cb * lbx - sb * lby, rby = sb * lbx + cb * lby;
      const axial = L[l + L_AXIAL]!;
      const winkel = bogenNormal(K[ob + K_W]! - K[oa + K_W]! - G[o + G_REF]!);
      let bias = 0, ms = 1, is = 0;
      if (art === SCHARNIER) {
        if (G[o + G_MOTOR] === 1 && axial > 0) {
          const grenze = G[o + G_MMOMENT]! * h, alt = L[l + L_LM]!;
          const neu = klemmen(alt - axial * (wb - wa - G[o + G_MTEMPO]!), -grenze, grenze);
          wa -= iia * (neu - alt);
          wb += iib * (neu - alt);
          L[l + L_LM] = neu;
        }
        if (G[o + G_GRENZEN] === 1 && axial > 0) {
          // unten: winkel ≥ unten
          let c = winkel - G[o + G_UNTEN]!;
          bias = 0; ms = 1; is = 0;
          if (c > 0) bias = c / h;
          else if (mitKorrektur) { bias = Wt[6]! * c; ms = Wt[7]!; is = Wt[8]!; }
          let alt = L[l + L_LU]!;
          let neu = Math.max(alt - axial * ms * (wb - wa + bias) - is * alt, 0);
          wa -= iia * (neu - alt);
          wb += iib * (neu - alt);
          L[l + L_LU] = neu;
          // oben: winkel ≤ oben
          c = G[o + G_OBEN]! - winkel;
          bias = 0; ms = 1; is = 0;
          if (c > 0) bias = c / h;
          else if (mitKorrektur) { bias = Wt[6]! * c; ms = Wt[7]!; is = Wt[8]!; }
          alt = L[l + L_LO]!;
          neu = Math.max(alt - axial * ms * (wa - wb + bias) - is * alt, 0);
          wa += iia * (neu - alt);
          wb -= iib * (neu - alt);
          L[l + L_LO] = neu;
        }
        bias = 0; ms = 1; is = 0;
        if (mitKorrektur) { bias = Wt[6]!; ms = Wt[7]!; is = Wt[8]!; }
      } else {
        bias = L[l + L_WEICH]!;
        ms = L[l + L_WEICH + 1]!;
        is = L[l + L_WEICH + 2]!;
        // Winkelfeder, Moment begrenzt
        if (axial > 0 && L[l + L_MAXT]! > 0) {
          const grenze = L[l + L_MAXT]!, alt = L[l + L_LW]!;
          const neu = klemmen(alt - axial * ms * (wb - wa + bias * winkel) - is * alt, -grenze, grenze);
          wa -= iia * (neu - alt);
          wb += iib * (neu - alt);
          L[l + L_LW] = neu;
        }
      }
      // Punkt (Scharnier) oder Linearfeder (Ziel-Gelenk): Anker von b auf den von a
      const sx = K[ob + K_CX]! + rbx - (K[oa + K_CX]! + rax), sy = K[ob + K_CY]! + rby - (K[oa + K_CY]! + ray);
      const cdx = vbx - wb * rby - (vax - wa * ray) + bias * sx, cdy = vby + wb * rbx - (vay + wa * rax) + bias * sy;
      const k11 = ima + imb + ray * ray * iia + rby * rby * iib;
      const k12 = -ray * rax * iia - rby * rbx * iib;
      const k22 = ima + imb + rax * rax * iia + rbx * rbx * iib;
      const det = k11 * k22 - k12 * k12;
      if (det !== 0) {
        const altx = L[l + L_LX]!, alty = L[l + L_LY]!;
        let nx = altx - ms * (k22 * cdx - k12 * cdy) / det - is * altx;
        let ny = alty - ms * (k11 * cdy - k12 * cdx) / det - is * alty;
        if (art === ZIEL) {
          const betrag = Math.sqrt(nx * nx + ny * ny), grenze = L[l + L_MAXF]!;
          if (betrag > grenze) {
            nx *= grenze / betrag;
            ny *= grenze / betrag;
          }
        }
        const px = nx - altx, py = ny - alty;
        vax -= ima * px;
        vay -= ima * py;
        wa -= iia * (rax * py - ray * px);
        vbx += imb * px;
        vby += imb * py;
        wb += iib * (rbx * py - rby * px);
        L[l + L_LX] = nx;
        L[l + L_LY] = ny;
      }
      K[oa + K_VX] = vax;
      K[oa + K_VY] = vay;
      K[oa + K_OM] = wa;
      K[ob + K_VX] = vbx;
      K[ob + K_VY] = vby;
      K[ob + K_OM] = wb;
    }
  }

  private fingerVorbereiten(h: number): void {
    const W = this.welt, F = this.fl, k = W[W_FK]!;
    F.fill(0);
    if (W[W_FAN] !== 1 || k < 0 || !this.lebt(k) || this.koerperT.d[k * KB + K_ART] !== BEWEGLICH) return;
    if (!(W[W_FF]! > 0 && W[W_FKRAFT]! > 0)) return;
    F[F_AKTIV] = 1;
    weich(W[W_FF]!, W[W_FZETA]!, h, F, F_WEICH);
    F[F_MAXF] = W[W_FKRAFT]! * h;
  }

  private fingerLoesen(): void {
    const F = this.fl;
    if (F[F_AKTIV] !== 1) return;
    const W = this.welt, K = this.koerperT.d, k = W[W_FK]!, o = k * KB;
    const im = K[o + K_IM]!, ii = K[o + K_II]!, c = this.rot[2 * k]!, s = this.rot[2 * k + 1]!;
    const lx = W[W_FAX]! - K[o + K_LX]!, ly = W[W_FAY]! - K[o + K_LY]!;
    const rx = c * lx - s * ly, ry = s * lx + c * ly;
    let vx = K[o + K_VX]!, vy = K[o + K_VY]!, w = K[o + K_OM]!;
    const bias = F[F_WEICH]!, ms = F[F_WEICH + 1]!, is = F[F_WEICH + 2]!;
    const sx = K[o + K_CX]! + rx - W[W_FZX]!, sy = K[o + K_CY]! + ry - W[W_FZY]!;
    const cdx = vx - w * ry + bias * sx, cdy = vy + w * rx + bias * sy;
    const k11 = im + ry * ry * ii, k12 = -ry * rx * ii, k22 = im + rx * rx * ii;
    const det = k11 * k22 - k12 * k12;
    if (det === 0) return;
    const altx = F[F_LX]!, alty = F[F_LY]!;
    let nx = altx - ms * (k22 * cdx - k12 * cdy) / det - is * altx;
    let ny = alty - ms * (k11 * cdy - k12 * cdx) / det - is * alty;
    const betrag = Math.sqrt(nx * nx + ny * ny), grenze = F[F_MAXF]!;
    if (betrag > grenze) {
      nx *= grenze / betrag;
      ny *= grenze / betrag;
    }
    const px = nx - altx, py = ny - alty;
    vx += im * px;
    vy += im * py;
    w += ii * (rx * py - ry * px);
    K[o + K_VX] = vx;
    K[o + K_VY] = vy;
    K[o + K_OM] = w;
    F[F_LX] = nx;
    F[F_LY] = ny;
  }

  // ---------- Kontakte ----------

  /** alle Kontaktpunkte zwischen Hüllen, deren Abstand unter `grenze` liegt, Paar für Paar aufsteigend */
  private kontakteSuchen(grenze: number): void {
    this.kp.n = 0;
    const H = this.huellenT.d, K = this.koerperT.d, C = this.kreisH, nH = this.huellenT.n;
    for (let ha = 0; ha < nH; ha++) {
      const ka = H[ha * HB + H_KOERPER]!;
      if (!this.lebt(ka)) continue;
      const artA = K[ka * KB + K_ART]!, ketteA = H[ha * HB + H_ART] === KETTE;
      for (let hb = ha + 1; hb < nH; hb++) {
        const kb = H[hb * HB + H_KOERPER]!;
        if (kb === ka || !this.lebt(kb)) continue;
        if (artA !== BEWEGLICH && K[kb * KB + K_ART] !== BEWEGLICH) continue;
        if (ketteA && H[hb * HB + H_ART] === KETTE) continue;
        const dx = C[3 * hb]! - C[3 * ha]!, dy = C[3 * hb + 1]! - C[3 * ha + 1]!, rr = C[3 * ha + 2]! + C[3 * hb + 2]! + grenze;
        if (dx * dx + dy * dy > rr * rr) continue;
        if (this.verbunden(ka, kb)) continue;
        this.huelleLaden(ha, this.fa);
        this.huelleLaden(hb, this.fb);
        this.paarKontakte(ha, hb, grenze);
      }
    }
  }

  /**
   * Kontaktpunkte zwischen fa (Hülle ha) und fb (Hülle hb). Je Paar ihrer Kerne der nächste Punkt, bei parallelen Strecken zwei. Kanten
   * von Vielecken und Ketten haben eine Seite (Vieleck: außen; Kette: vorn): Liegt der andere Kern auf der Seite dahinter oder schneidet
   * er die Kante, zählt nicht der ungerichtete Abstand, sondern die Tiefe dahinter (Kette: Endpunkte hinter der Kette; Vieleck: Punkte
   * im Inneren über die Kante mit der kleinsten Tiefe). So kippt die Normale nicht, wenn Kanten ohne Dicke einander leicht durchdringen.
   * Liegt die Mitte der anderen Hülle hinter einem Kettenstück, stößt dieses Stück nicht (einseitig, vertrag/welt.ts).
   */
  private paarKontakte(ha: number, hb: number, grenze: number): void {
    const fa = this.fa, fb = this.fb, A = this.ka, Bk = this.kb, np = this.np, nrm = this.nrm;
    const nA = this.kernZahl(fa), nB = this.kernZahl(fb), ra = fa.r, rb = fb.r;
    for (let i = 0; i < nA; i++) {
      this.kern(fa, i, A);
      const p0x = A[0]!, p0y = A[1]!, p1x = A[2]!, p1y = A[3]!;
      const seiteA = this.seite(fa, A, fb), nax = nrm[0]!, nay = nrm[1]!;
      if (seiteA === HINTEN) continue;
      for (let j = 0; j < nB; j++) {
        this.kern(fb, j, Bk);
        const q0x = Bk[0]!, q0y = Bk[1]!, q1x = Bk[2]!, q1y = Bk[3]!;
        const seiteB = this.seite(fb, Bk, fa), nbx = nrm[0]!, nby = nrm[1]!;
        if (seiteB === HINTEN) continue;
        naechste(p0x, p0y, p1x, p1y, q0x, q0y, q1x, q1y, np);
        const dx = np[2]! - np[0]!, dy = np[3]! - np[1]!, abstand = Math.sqrt(dx * dx + dy * dy);
        const aussenA = seiteA === OHNE_SEITE || (abstand > KEIN_ABSTAND && dx * nax + dy * nay > 0);
        const aussenB = seiteB === OHNE_SEITE || (abstand > KEIN_ABSTAND && dx * nbx + dy * nby < 0);
        if (!aussenA || !aussenB) {
          if (!aussenA && fa.art === KETTE) this.tiefe(A, nax, nay, ra, Bk, rb, ha, hb, false);
          else if (!aussenB && fb.art === KETTE) this.tiefe(Bk, nbx, nby, rb, A, ra, ha, hb, true);
          continue;   // hinter einer Vieleck-Kante: das rechnet vieleckKontakte
        }
        const s = abstand - ra - rb;
        if (s >= grenze) continue;
        let nx: number, ny: number;
        if (abstand > KEIN_ABSTAND) {
          nx = dx / abstand;
          ny = dy / abstand;
        } else {
          this.ersatzNormale(p0x, p0y, p1x, p1y, q0x, q0y, q1x, q1y);
          nx = nrm[0]!;
          ny = nrm[1]!;
        }
        // parallele Strecken mit Überdeckung: zwei Punkte an den Enden der Überdeckung
        const d1x = p1x - p0x, d1y = p1y - p0y, d2x = q1x - q0x, d2y = q1y - q0y;
        const a = d1x * d1x + d1y * d1y, e = d2x * d2x + d2y * d2y;
        if (a > WINZIG && e > WINZIG && Math.abs(d1x * d2y - d1y * d2x) <= PARALLEL * Math.sqrt(a * e)) {
          const u0 = ((q0x - p0x) * d1x + (q0y - p0y) * d1y) / a, u1 = ((q1x - p0x) * d1x + (q1y - p0y) * d1y) / a;
          const unten = Math.max(0, Math.min(u0, u1)), oben = Math.min(1, Math.max(u0, u1));
          if (oben - unten > 1e-9) {
            const la = Math.sqrt(a);
            let qx = -d1y / la, qy = d1x / la;
            if (qx * nx + qy * ny < 0) {
              qx = -qx;
              qy = -qy;
            }
            for (let m = 0; m < 2; m++) {
              const u = m === 0 ? unten : oben;
              const ax = p0x + u * d1x, ay = p0y + u * d1y;
              const t = klemmen(((ax - q0x) * d2x + (ay - q0y) * d2y) / e, 0, 1);
              const bx = q0x + t * d2x, by = q0y + t * d2y;
              const sm = (bx - ax) * qx + (by - ay) * qy - ra - rb;
              if (sm < grenze) this.punktHinzu(ha, hb, qx, qy, ax + qx * ra, ay + qy * ra, bx - qx * rb, by - qy * rb, sm);
            }
            continue;
          }
        }
        this.punktHinzu(ha, hb, nx, ny, np[0]! + nx * ra, np[1]! + ny * ra, np[2]! - nx * rb, np[3]! - ny * rb, s);
      }
    }
    if (fa.art === VIELECK) this.vieleckKontakte(fa, fb, ha, hb, false);
    if (fb.art === VIELECK) this.vieleckKontakte(fb, fa, ha, hb, true);
  }

  /**
   * Seite eines Kerns, ihre Normale nach this.nrm: Vieleck-Kante nach außen, Kettenstück nach vorn (beide ((b − a).y, −(b − a).x)
   * normiert; ein Vieleck läuft gegen den Uhrzeigersinn im Sinn von x·y′ − y·x′ > 0). OHNE_SEITE: Kreis, Kapsel oder ein Stück der
   * Länge 0; HINTEN: die Mitte der anderen Form liegt hinter diesem Kettenstück, es stößt nicht.
   */
  private seite(f: FormSicht, k: Float64Array, andere: FormSicht): number {
    if (f.art !== VIELECK && f.art !== KETTE) return OHNE_SEITE;
    const ex = k[2]! - k[0]!, ey = k[3]! - k[1]!, l = Math.sqrt(ex * ex + ey * ey);
    if (!(l > 0)) return OHNE_SEITE;
    const nx = ey / l, ny = -ex / l;
    this.nrm[0] = nx;
    this.nrm[1] = ny;
    if (f.art === KETTE && nx * (andere.mx - k[0]!) + ny * (andere.my - k[1]!) < 0) return HINTEN;
    return MIT_SEITE;
  }

  /** liegt (cx, cy) nicht hinter allen Kettenstücken, die am Punkt i der Kette f enden oder beginnen? (sonst stößt der Punkt nicht) */
  private ketteVorn(f: FormSicht, i: number, cx: number, cy: number): boolean {
    const n = f.zahl;
    if ((i > 0 || f.schleife) && this.stueckVorn(f, (i - 1 + n) % n, i, cx, cy)) return true;
    return (i < n - 1 || f.schleife) && this.stueckVorn(f, i, (i + 1) % n, cx, cy);
  }

  /** liegt (cx, cy) nicht hinter dem Kettenstück von Punkt a nach Punkt b der Kette f? kreuz(c − a, b − a) ≥ 0 */
  private stueckVorn(f: FormSicht, a: number, b: number, cx: number, cy: number): boolean {
    const W = this.weltP, ax = W[2 * (f.anfang + a)]!, ay = W[2 * (f.anfang + a) + 1]!;
    return (cx - ax) * (W[2 * (f.anfang + b) + 1]! - ay) - (cy - ay) * (W[2 * (f.anfang + b)]! - ax) >= 0;
  }

  /**
   * Endpunkte des Kerns `inc` (Radius rI), die hinter der Kette `ref` (Seite n, Radius rR) liegen und auf sie fallen: je ein Kontakt
   * mit der Normale der Kette. `umkehren`: die Kette gehört zu B (Normale von A nach B ist dann −n).
   */
  private tiefe(ref: Float64Array, nx: number, ny: number, rR: number, inc: Float64Array, rI: number, ha: number, hb: number, umkehren: boolean): void {
    const r0x = ref[0]!, r0y = ref[1]!, dRx = ref[2]! - r0x, dRy = ref[3]! - r0y, l2 = dRx * dRx + dRy * dRy;
    if (l2 <= WINZIG) return;
    const punkte = inc[0] === inc[2] && inc[1] === inc[3] ? 1 : 2;
    for (let m = 0; m < punkte; m++) {
      const ex = inc[2 * m]!, ey = inc[2 * m + 1]!;
      const u = ((ex - r0x) * dRx + (ey - r0y) * dRy) / l2;
      if (u < 0 || u > 1) continue;
      const vorne = (ex - r0x) * nx + (ey - r0y) * ny;
      if (vorne >= 0) continue;
      const lx = ex - nx * vorne, ly = ey - ny * vorne;   // Fußpunkt auf der Kette
      const refX = lx + nx * rR, refY = ly + ny * rR, incX = ex - nx * rI, incY = ey - ny * rI, s = vorne - rR - rI;
      if (umkehren) this.punktHinzu(ha, hb, -nx, -ny, incX, incY, refX, refY, s);
      else this.punktHinzu(ha, hb, nx, ny, refX, refY, incX, incY, s);
    }
  }

  /**
   * Punkte der Form `fo` im Inneren des Vielecks `fp` (Rand eingeschlossen): je ein Kontakt über die Kante mit der kleinsten Tiefe
   * (wie die Trennachse). `polyIstB`: das Vieleck gehört zu B. Ein Punkt einer Kette zählt nur, wenn die Mitte des Vielecks vor einem
   * seiner Kettenstücke liegt (einseitig).
   */
  private vieleckKontakte(fp: FormSicht, fo: FormSicht, ha: number, hb: number, polyIstB: boolean): void {
    const W = this.weltP;
    for (let p = fo.anfang; p < fo.anfang + fo.zahl; p++) {
      if (fo.art === KETTE && !this.ketteVorn(fo, p - fo.anfang, fp.mx, fp.my)) continue;
      const ex = W[2 * p]!, ey = W[2 * p + 1]!;
      let tief = -Infinity, nx = 0, ny = 0, innen = true;
      for (let i = 0; i < fp.zahl && innen; i++) {
        const a = fp.anfang + i, b = fp.anfang + ((i + 1) % fp.zahl);
        const ax = W[2 * a]!, ay = W[2 * a + 1]!, kx = W[2 * b]! - ax, ky = W[2 * b + 1]! - ay, l = Math.sqrt(kx * kx + ky * ky);
        if (!(l > 0)) continue;
        const d = ((ex - ax) * ky - (ey - ay) * kx) / l;
        if (d > 0) innen = false;
        else if (d > tief) {
          tief = d;
          nx = ky / l;
          ny = -kx / l;
        }
      }
      if (!innen || tief === -Infinity) continue;
      const lx = ex - nx * tief, ly = ey - ny * tief;   // Fußpunkt auf der Kante
      const polyX = lx + nx * fp.r, polyY = ly + ny * fp.r, andX = ex - nx * fo.r, andY = ey - ny * fo.r, s = tief - fp.r - fo.r;
      if (polyIstB) this.punktHinzu(ha, hb, -nx, -ny, andX, andY, polyX, polyY, s);
      else this.punktHinzu(ha, hb, nx, ny, polyX, polyY, andX, andY, s);
    }
  }

  /** Normale, wenn sich die Kerne berühren: senkrecht auf einer Strecke, zur Mitte von fb hin */
  private ersatzNormale(p0x: number, p0y: number, p1x: number, p1y: number, q0x: number, q0y: number, q1x: number, q1y: number): void {
    let nx = 0, ny = -1;
    const d1x = p1x - p0x, d1y = p1y - p0y, d2x = q1x - q0x, d2y = q1y - q0y;
    const a = d1x * d1x + d1y * d1y, e = d2x * d2x + d2y * d2y;
    const mx = this.fb.mx - this.fa.mx, my = this.fb.my - this.fa.my, mm = mx * mx + my * my;
    if (a > WINZIG) {
      const l = Math.sqrt(a);
      nx = -d1y / l;
      ny = d1x / l;
    } else if (e > WINZIG) {
      const l = Math.sqrt(e);
      nx = -d2y / l;
      ny = d2x / l;
    } else if (mm > WINZIG) {
      const l = Math.sqrt(mm);
      nx = mx / l;
      ny = my / l;
    }
    if (nx * mx + ny * my < 0) {
      nx = -nx;
      ny = -ny;
    }
    this.nrm[0] = nx;
    this.nrm[1] = ny;
  }

  /** Kontaktpunkt in der Mitte zwischen den Oberflächen sa (Hülle ha) und sb (Hülle hb), Normale von a nach b */
  private punktHinzu(ha: number, hb: number, nx: number, ny: number, sax: number, say: number, sbx: number, sby: number, s: number): void {
    const H = this.huellenT.d, K = this.koerperT.d;
    const a = H[ha * HB + H_KOERPER]!, b = H[hb * HB + H_KOERPER]!, oa = a * KB, ob = b * KB;
    const px = (sax + sbx) / 2, py = (say + sby) / 2;
    const rax = px - K[oa + K_CX]!, ray = py - K[oa + K_CY]!, rbx = px - K[ob + K_CX]!, rby = py - K[ob + K_CY]!;
    const rna = rax * ny - ray * nx, rnb = rbx * ny - rby * nx;
    const kn = K[oa + K_IM]! + K[ob + K_IM]! + K[oa + K_II]! * rna * rna + K[ob + K_II]! * rnb * rnb;
    const wa = K[oa + K_OM]!, wb = K[ob + K_OM]!;
    const dvx = K[ob + K_VX]! - wb * rby - (K[oa + K_VX]! - wa * ray), dvy = K[ob + K_VY]! + wb * rbx - (K[oa + K_VY]! + wa * rax);
    const i = this.kp.zeile(), P = this.kp.d, o = i * PB;
    P[o + P_HA] = ha;
    P[o + P_HB] = hb;
    P[o + P_A] = a;
    P[o + P_B] = b;
    P[o + P_NX] = nx;
    P[o + P_NY] = ny;
    P[o + P_RAX] = rax;
    P[o + P_RAY] = ray;
    P[o + P_RBX] = rbx;
    P[o + P_RBY] = rby;
    P[o + P_S] = s;
    P[o + P_MASSE] = kn > 0 ? 1 / kn : 0;
    P[o + P_VN0] = dvx * nx + dvy * ny;
    P[o + P_E] = Math.max(H[ha * HB + H_ABPRALL]!, H[hb * HB + H_ABPRALL]!);
    P[o + P_FEST] = K[oa + K_ART] !== BEWEGLICH || K[ob + K_ART] !== BEWEGLICH ? 1 : 0;
    P[o + P_PX] = px;
    P[o + P_PY] = py;
  }

  private kontakteLoesen(h: number, mitKorrektur: boolean): void {
    const P = this.kp.d, K = this.koerperT.d, Wt = this.weichT;
    for (let i = 0; i < this.kp.n; i++) {
      const o = i * PB, a = P[o + P_A]!, b = P[o + P_B]!, oa = a * KB, ob = b * KB;
      const nx = P[o + P_NX]!, ny = P[o + P_NY]!, rax = P[o + P_RAX]!, ray = P[o + P_RAY]!, rbx = P[o + P_RBX]!, rby = P[o + P_RBY]!;
      // Abstand jetzt: im Hauptdurchgang der gesuchte, danach aus dem Weg der Körper im Teilschritt nachgeführt (wie Box2D)
      const s = mitKorrektur ? P[o + P_S]! : this.abstandJetzt(a, b, P[o + P_S]!, nx, ny, rax, ray, rbx, rby);
      const vax = K[oa + K_VX]!, vay = K[oa + K_VY]!, wa = K[oa + K_OM]!, vbx = K[ob + K_VX]!, vby = K[ob + K_VY]!, wb = K[ob + K_OM]!;
      const vn = (vbx - wb * rby - (vax - wa * ray)) * nx + (vby + wb * rbx - (vay + wa * rax)) * ny;
      let bias = 0, ms = 1, is = 0;
      if (s > 0) {
        bias = s / h;   // spekulativ: nur so schnell annähern, dass die Lücke sich gerade schließt
      } else if (mitKorrektur) {
        const w = P[o + P_FEST] === 1 ? 3 : 0;
        bias = Math.max(Wt[w]! * s, -SCHIEBETEMPO);
        ms = Wt[w + 1]!;
        is = Wt[w + 2]!;
      }
      this.normalImpuls(o, -P[o + P_MASSE]! * ms * (vn + bias) - is * P[o + P_L]!);
    }
  }

  /** Abstand eines Kontaktpunkts nach dem Weg der Körper in diesem Teilschritt */
  private abstandJetzt(a: number, b: number, s0: number, nx: number, ny: number, rax: number, ray: number, rbx: number, rby: number): number {
    const R = this.rot, R0 = this.rot0, dc = this.dc;
    const cA = R[2 * a]! * R0[2 * a]! + R[2 * a + 1]! * R0[2 * a + 1]!, sA = R[2 * a + 1]! * R0[2 * a]! - R[2 * a]! * R0[2 * a + 1]!;
    const cB = R[2 * b]! * R0[2 * b]! + R[2 * b + 1]! * R0[2 * b + 1]!, sB = R[2 * b + 1]! * R0[2 * b]! - R[2 * b]! * R0[2 * b + 1]!;
    const pax = cA * rax - sA * ray, pay = sA * rax + cA * ray, pbx = cB * rbx - sB * rby, pby = sB * rbx + cB * rby;
    const dx = dc[2 * b]! - dc[2 * a]! + pbx - pax, dy = dc[2 * b + 1]! - dc[2 * a + 1]! + pby - pay;
    return dx * nx + dy * ny + s0 - ((rbx - rax) * nx + (rby - ray) * ny);
  }

  /** Normalimpuls eines Kontaktpunkts aufaddieren (nie ziehend) und auf beide Körper geben */
  private normalImpuls(o: number, zuwachs: number): void {
    const P = this.kp.d, K = this.koerperT.d;
    const alt = P[o + P_L]!, neu = Math.max(alt + zuwachs, 0), j = neu - alt;
    P[o + P_L] = neu;
    if (neu > P[o + P_LMAX]!) P[o + P_LMAX] = neu;
    const a = P[o + P_A]!, b = P[o + P_B]!, oa = a * KB, ob = b * KB, px = j * P[o + P_NX]!, py = j * P[o + P_NY]!;
    const ima = K[oa + K_IM]!, iia = K[oa + K_II]!, imb = K[ob + K_IM]!, iib = K[ob + K_II]!;
    K[oa + K_VX] = K[oa + K_VX]! - ima * px;
    K[oa + K_VY] = K[oa + K_VY]! - ima * py;
    K[oa + K_OM] = K[oa + K_OM]! - iia * (P[o + P_RAX]! * py - P[o + P_RAY]! * px);
    K[ob + K_VX] = K[ob + K_VX]! + imb * px;
    K[ob + K_VY] = K[ob + K_VY]! + imb * py;
    K[ob + K_OM] = K[ob + K_OM]! + iib * (P[o + P_RBX]! * py - P[o + P_RBY]! * px);
  }

  /** Abprall wie Box2D: nur bei Annäherung über der Schwelle und wenn der Punkt gedrückt hat */
  private abprallen(): void {
    const P = this.kp.d, K = this.koerperT.d;
    for (let i = 0; i < this.kp.n; i++) {
      const o = i * PB, e = P[o + P_E]!, vn0 = P[o + P_VN0]!;
      if (e === 0 || vn0 > -ABPRALL_SCHWELLE || P[o + P_LMAX] === 0) continue;
      const oa = P[o + P_A]! * KB, ob = P[o + P_B]! * KB, nx = P[o + P_NX]!, ny = P[o + P_NY]!;
      const wa = K[oa + K_OM]!, wb = K[ob + K_OM]!;
      const vn = (K[ob + K_VX]! - wb * P[o + P_RBY]! - (K[oa + K_VX]! - wa * P[o + P_RAY]!)) * nx
        + (K[ob + K_VY]! + wb * P[o + P_RBX]! - (K[oa + K_VY]! + wa * P[o + P_RAX]!)) * ny;
      this.normalImpuls(o, -P[o + P_MASSE]! * (vn + e * vn0));
    }
  }

  /** Impulse und Annäherung je Hüllenpaar über die Teilschritte summieren (für die Kontakte in `lesen`) */
  private kontakteSummieren(): void {
    const P = this.kp.d;
    for (let i = 0; i < this.kp.n; i++) {
      const o = i * PB, schluessel = P[o + P_HA]! * 1048576 + P[o + P_HB]!;
      let z = this.summen.get(schluessel);
      if (z === undefined) {
        z = this.summenT.zeile();
        this.summen.set(schluessel, z);
      }
      const S = this.summenT.d;
      S[2 * z] = S[2 * z]! + P[o + P_L]!;
      S[2 * z + 1] = Math.max(S[2 * z + 1]!, -P[o + P_VN0]!);
    }
  }

  // ---------- nach dem Schritt: Kontakte und Zonen ----------

  private ereignisseRechnen(): void {
    const H = this.huellenT.d;
    // berührte Paare jetzt: Mitte ihrer Punkte, Normale des tiefsten
    this.kontakteSuchen(SCHLUPF);
    const P = this.kp.d, N = this.neuT;
    N.n = 0;
    for (let i = 0; i < this.kp.n;) {
      const ha = P[i * PB + P_HA]!, hb = P[i * PB + P_HB]!;
      let sx = 0, sy = 0, z = 0, tief = Infinity, nx = 0, ny = 0, j = i;
      for (; j < this.kp.n && P[j * PB + P_HA] === ha && P[j * PB + P_HB] === hb; j++) {
        const o = j * PB;
        sx += P[o + P_PX]!;
        sy += P[o + P_PY]!;
        z++;
        if (P[o + P_S]! < tief) {
          tief = P[o + P_S]!;
          nx = P[o + P_NX]!;
          ny = P[o + P_NY]!;
        }
      }
      const r = N.zeile(), D = N.d;
      D[6 * r] = ha;
      D[6 * r + 1] = hb;
      D[6 * r + 2] = sx / z;
      D[6 * r + 3] = sy / z;
      D[6 * r + 4] = nx;
      D[6 * r + 5] = ny;
      i = j;
    }
    // mit dem vorigen Stand zusammenlegen: begonnen, dauert an, beendet
    const alt = this.beruehrtT, E = this.kontaktErgT;
    E.n = 0;
    let ia = 0, ib = 0;
    while (ia < alt.n || ib < N.n) {
      const aha = ia < alt.n ? alt.d[2 * ia]! : Infinity, ahb = ia < alt.n ? alt.d[2 * ia + 1]! : Infinity;
      const nha = ib < N.n ? N.d[6 * ib]! : Infinity, nhb = ib < N.n ? N.d[6 * ib + 1]! : Infinity;
      const r = E.zeile(), D = E.d, o = r * KONTAKT_FELDER;
      if (nha < aha || (nha === aha && nhb < ahb)) {
        this.kontaktSchreiben(o, ib, 1);
        ib++;
      } else if (nha === aha && nhb === ahb) {
        this.kontaktSchreiben(o, ib, 0);
        ia++;
        ib++;
      } else {
        D[o] = H[aha * HB + H_KOERPER]!;
        D[o + 1] = H[ahb * HB + H_KOERPER]!;
        D[o + 2] = aha;
        D[o + 3] = ahb;
        D[o + 10] = -1;
        ia++;
      }
    }
    alt.n = 0;
    for (let i = 0; i < N.n; i++) {
      const r = alt.zeile();
      alt.d[2 * r] = N.d[6 * i]!;
      alt.d[2 * r + 1] = N.d[6 * i + 1]!;
    }
    // Zonen: welche beweglichen und geführten Körper eine Zone überlappen
    const ND = this.neuDrinT, K = this.koerperT.d;
    ND.n = 0;
    for (let z = 0; z < this.zonenT.n; z++) {
      this.zoneLaden(z, this.fa);
      for (let k = 0; k < this.koerperT.n; k++) {
        if (!this.lebt(k) || K[k * KB + K_ART] === FEST) continue;
        for (let h = 0; h < this.huellenT.n; h++) {
          if (H[h * HB + H_KOERPER] !== k) continue;
          this.huelleLaden(h, this.fb);
          if (this.ueberlappen(this.fa, this.fb)) {
            const r = ND.zeile();
            ND.d[2 * r] = z;
            ND.d[2 * r + 1] = k;
            break;
          }
        }
      }
    }
    const D = this.drinT, ZE = this.zonenErgT;
    ZE.n = 0;
    ia = 0;
    ib = 0;
    while (ia < D.n || ib < ND.n) {
      const az = ia < D.n ? D.d[2 * ia]! : Infinity, ak = ia < D.n ? D.d[2 * ia + 1]! : Infinity;
      const nz = ib < ND.n ? ND.d[2 * ib]! : Infinity, nk = ib < ND.n ? ND.d[2 * ib + 1]! : Infinity;
      const r = ZE.zeile(), o = r * ZONE_FELDER;
      if (nz < az || (nz === az && nk < ak)) {
        ZE.d[o] = nz;
        ZE.d[o + 1] = nk;
        ZE.d[o + 2] = 1;
        ib++;
      } else if (nz === az && nk === ak) {
        ZE.d[o] = nz;
        ZE.d[o + 1] = nk;
        ZE.d[o + 2] = 0;
        ia++;
        ib++;
      } else {
        ZE.d[o] = az;
        ZE.d[o + 1] = ak;
        ZE.d[o + 2] = -1;
        ia++;
      }
    }
    D.n = 0;
    for (let i = 0; i < ND.n; i++) {
      const r = D.zeile();
      D.d[2 * r] = ND.d[2 * i]!;
      D.d[2 * r + 1] = ND.d[2 * i + 1]!;
    }
  }

  /** eine Zeile der Kontakte aus Paar ib der neuen Liste */
  private kontaktSchreiben(o: number, ib: number, art: number): void {
    const N = this.neuT.d, H = this.huellenT.d, D = this.kontaktErgT.d, S = this.summenT.d;
    const ha = N[6 * ib]!, hb = N[6 * ib + 1]!;
    const z = this.summen.get(ha * 1048576 + hb);
    D[o] = H[ha * HB + H_KOERPER]!;
    D[o + 1] = H[hb * HB + H_KOERPER]!;
    D[o + 2] = ha;
    D[o + 3] = hb;
    D[o + 4] = N[6 * ib + 2]!;
    D[o + 5] = N[6 * ib + 3]!;
    D[o + 6] = N[6 * ib + 4]!;
    D[o + 7] = N[6 * ib + 5]!;
    D[o + 8] = art === 1 && z !== undefined ? S[2 * z + 1]! : 0;
    D[o + 9] = z !== undefined ? S[2 * z]! : 0;
    D[o + 10] = art;
  }

  // ---------- Geometrie ----------

  /** Drehungen, Weltpunkte und umfassende Kreise aus dem Zustand, wenn sich etwas bewegt hat */
  private geometrie(): void {
    if (!this.schmutzig) return;
    const nK = this.koerperT.n, K = this.koerperT.d;
    this.rot = genug(this.rot, 2 * nK);
    for (let k = 0; k < nK; k++) {
      if (K[k * KB + K_WEG] === 1) continue;
      const w = K[k * KB + K_W]!;
      this.rot[2 * k] = cos(w);
      this.rot[2 * k + 1] = sin(w);
    }
    const nP = this.punkteT.n, P = this.punkteT.d;
    this.weltP = genug(this.weltP, 2 * nP);
    const W = this.weltP;
    W.set(P.subarray(0, 2 * nP));   // Zonen stehen schon in der Welt; Hüllen werden unten gedreht
    const H = this.huellenT.d, nH = this.huellenT.n;
    this.kreisH = genug(this.kreisH, 3 * nH);
    for (let h = 0; h < nH; h++) {
      const o = h * HB, k = H[o + H_KOERPER]!, ok = k * KB;
      if (K[ok + K_WEG] === 1) continue;
      const c = this.rot[2 * k]!, s = this.rot[2 * k + 1]!, X = K[ok + K_X]!, Y = K[ok + K_Y]!;
      const a = H[o + H_ANFANG]!, z = H[o + H_ZAHL]!;
      let mx = 0, my = 0;
      for (let i = a; i < a + z; i++) {
        const px = P[2 * i]!, py = P[2 * i + 1]!, wx = X + c * px - s * py, wy = Y + s * px + c * py;
        W[2 * i] = wx;
        W[2 * i + 1] = wy;
        mx += wx;
        my += wy;
      }
      mx /= z;
      my /= z;
      let rr = 0;
      for (let i = a; i < a + z; i++) {
        const dx = W[2 * i]! - mx, dy = W[2 * i + 1]! - my;
        rr = Math.max(rr, dx * dx + dy * dy);
      }
      this.kreisH[3 * h] = mx;
      this.kreisH[3 * h + 1] = my;
      this.kreisH[3 * h + 2] = Math.sqrt(rr) + H[o + H_R]!;
    }
    this.schmutzig = false;
  }

  private huelleLaden(h: number, f: FormSicht): void {
    const H = this.huellenT.d, o = h * HB;
    f.art = H[o + H_ART]!;
    f.anfang = H[o + H_ANFANG]!;
    f.zahl = H[o + H_ZAHL]!;
    f.schleife = H[o + H_SCHLEIFE] === 1;
    f.r = H[o + H_R]!;
    f.mx = this.kreisH[3 * h]!;
    f.my = this.kreisH[3 * h + 1]!;
  }

  private zoneLaden(z: number, f: FormSicht): void {
    const Z = this.zonenT.d, o = z * ZB, W = this.weltP;
    f.art = Z[o + Z_ART]!;
    f.anfang = Z[o + Z_ANFANG]!;
    f.zahl = Z[o + Z_ZAHL]!;
    f.schleife = Z[o + Z_SCHLEIFE] === 1;
    f.r = Z[o + Z_R]!;
    let mx = 0, my = 0;
    for (let i = f.anfang; i < f.anfang + f.zahl; i++) {
      mx += W[2 * i]!;
      my += W[2 * i + 1]!;
    }
    f.mx = mx / f.zahl;
    f.my = my / f.zahl;
  }

  private kernZahl(f: FormSicht): number {
    if (f.art === KREIS || f.art === KAPSEL) return 1;
    if (f.art === VIELECK) return f.zahl;
    return f.schleife ? f.zahl : f.zahl - 1;
  }

  /** Kern i einer Form (Strecke in der Welt, ein Kreis ist eine Strecke der Länge 0) nach k[0 … 3] */
  private kern(f: FormSicht, i: number, k: Float64Array): void {
    let a = f.anfang, b = f.anfang;
    if (f.art === KAPSEL) b = f.anfang + 1;
    else if (f.art === VIELECK || f.art === KETTE) {
      a = f.anfang + i;
      b = f.anfang + ((i + 1) % f.zahl);
    }
    const W = this.weltP;
    k[0] = W[2 * a]!;
    k[1] = W[2 * a + 1]!;
    k[2] = W[2 * b]!;
    k[3] = W[2 * b + 1]!;
  }

  /** liegt (px, py) in der Form? `flaeche`: eine geschlossene Kette enthält ihr Inneres (Finger, Zonen), sonst nur ihre Dicke */
  private innen(f: FormSicht, px: number, py: number, flaeche: boolean): boolean {
    const W = this.weltP;
    if (f.art === VIELECK) {
      let drin = true;
      for (let i = 0; i < f.zahl && drin; i++) {
        const a = f.anfang + i, b = f.anfang + ((i + 1) % f.zahl);
        const ax = W[2 * a]!, ay = W[2 * a + 1]!;
        drin = (W[2 * b]! - ax) * (py - ay) - (W[2 * b + 1]! - ay) * (px - ax) > 0;
      }
      if (drin) return true;
    } else if (f.art === KETTE && flaeche && f.schleife) {
      let drin = false;
      for (let i = 0, j = f.zahl - 1; i < f.zahl; j = i++) {
        const xi = W[2 * (f.anfang + i)]!, yi = W[2 * (f.anfang + i) + 1]!, xj = W[2 * (f.anfang + j)]!, yj = W[2 * (f.anfang + j) + 1]!;
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) drin = !drin;
      }
      if (drin) return true;
    }
    if (!(f.r > 0)) return false;
    const n = this.kernZahl(f), k = this.kb;
    for (let i = 0; i < n; i++) {
      this.kern(f, i, k);
      if (abstandQuadrat(px, py, k) < f.r * f.r) return true;
    }
    return false;
  }

  /** überlappen zwei Formen (Zone und Hülle)? */
  private ueberlappen(fa: FormSicht, fb: FormSicht): boolean {
    const A = this.ka, Bk = this.kb, np = this.np, nA = this.kernZahl(fa), nB = this.kernZahl(fb);
    for (let i = 0; i < nA; i++) {
      this.kern(fa, i, A);
      for (let j = 0; j < nB; j++) {
        this.kern(fb, j, Bk);
        naechste(A[0]!, A[1]!, A[2]!, A[3]!, Bk[0]!, Bk[1]!, Bk[2]!, Bk[3]!, np);
        const dx = np[2]! - np[0]!, dy = np[3]! - np[1]!;
        if (Math.sqrt(dx * dx + dy * dy) - fa.r - fb.r < 0) return true;
      }
    }
    // ganz innen: ein Punkt der einen liegt in der Fläche der anderen
    const W = this.weltP;
    return this.innen(fa, W[2 * fb.anfang]!, W[2 * fb.anfang + 1]!, true) || this.innen(fb, W[2 * fa.anfang]!, W[2 * fa.anfang + 1]!, true);
  }

  /** erster Treffer des Strahls s + t·d (t in [0, 1]) auf eine Form, Normale nach this.nrm; sonst ∞. Ein Kettenstück zählt nur, wenn
   *  der Strahl nicht hinter ihm beginnt (einseitig, vertrag/welt.ts); seine Normale ist dann die vordere */
  private strahlForm(f: FormSicht, sx: number, sy: number, dx: number, dy: number): number {
    const k = this.kb, r = f.r, n = this.kernZahl(f), kette = f.art === KETTE;
    let best = Infinity, bx = 0, by = 0;
    for (let i = 0; i < n; i++) {
      this.kern(f, i, k);
      const p0x = k[0]!, p0y = k[1]!, p1x = k[2]!, p1y = k[3]!, ex = p1x - p0x, ey = p1y - p0y, el = Math.sqrt(ex * ex + ey * ey);
      if (kette && (sx - p0x) * ey - (sy - p0y) * ex < 0) continue;
      if (r > 0) {
        let t = strahlKreis(sx, sy, dx, dy, p0x, p0y, r);
        if (t < best) {
          best = t;
          bx = (sx + t * dx - p0x) / r;
          by = (sy + t * dy - p0y) / r;
        }
        t = strahlKreis(sx, sy, dx, dy, p1x, p1y, r);
        if (t < best) {
          best = t;
          bx = (sx + t * dx - p1x) / r;
          by = (sy + t * dy - p1y) / r;
        }
        if (el > 0) {
          const qx = -ey / el, qy = ex / el;
          for (let seite = -1; seite <= 1; seite += 2) {
            const ox = seite * r * qx, oy = seite * r * qy;
            const ts = strahlStrecke(sx, sy, dx, dy, p0x + ox, p0y + oy, p1x + ox, p1y + oy);
            if (ts < best) {
              best = ts;
              bx = seite * qx;
              by = seite * qy;
            }
          }
        }
      } else if (el > 0) {
        const t = strahlStrecke(sx, sy, dx, dy, p0x, p0y, p1x, p1y);
        if (t < best) {
          best = t;
          bx = -ey / el;
          by = ex / el;
          if (bx * dx + by * dy > 0) {
            bx = -bx;
            by = -by;
          }
        }
      }
    }
    this.nrm[0] = bx;
    this.nrm[1] = by;
    return best;
  }

  /**
   * erster Treffer auf eine Hülle eines eingeschalteten Körpers nach this.treffer (wie STRAHL_FELDER). `ausser`: dieser Körper und
   * seine Gelenkpartner zählen nicht (−1: keiner); `nurStarr`: nur feste und geführte Körper; `dicke`: Zuschlag zum Radius jeder
   * Hülle (Schweifen einer runden Hülle). Hüllen, in denen der Anfang liegt, zählen nicht.
   */
  private strahlSuchen(sx: number, sy: number, dx: number, dy: number, ausser: number, nurStarr: boolean, dicke: number): boolean {
    const H = this.huellenT.d, K = this.koerperT.d, T = this.treffer, f = this.fa;
    let best = Infinity;
    for (let h = 0; h < this.huellenT.n; h++) {
      const k = H[h * HB + H_KOERPER]!;
      if (!this.lebt(k) || (nurStarr && K[k * KB + K_ART] === BEWEGLICH)) continue;
      if (ausser >= 0 && (k === ausser || this.verbunden(ausser, k))) continue;
      this.huelleLaden(h, f);
      f.r += dicke;
      if (this.innen(f, sx, sy, false)) continue;
      const t = this.strahlForm(f, sx, sy, dx, dy);
      if (t < best) {
        best = t;
        T[0] = sx + t * dx;
        T[1] = sy + t * dy;
        T[2] = this.nrm[0]!;
        T[3] = this.nrm[1]!;
        T[4] = t;
        T[5] = k;
        T[6] = h;
      }
    }
    return best <= 1;
  }

  /** beweglicher, eingeschalteter Körper mit der höchsten Nummer, dessen Hülle den Punkt enthält; −1: keiner */
  private koerperUnter(px: number, py: number): number {
    const H = this.huellenT.d, K = this.koerperT.d;
    let best = -1;
    for (let h = 0; h < this.huellenT.n; h++) {
      const k = H[h * HB + H_KOERPER]!;
      if (k <= best || !this.lebt(k) || K[k * KB + K_ART] !== BEWEGLICH) continue;
      this.huelleLaden(h, this.fa);
      if (this.innen(this.fa, px, py, true)) best = k;
    }
    return best;
  }

  // ---------- Hilfen ----------

  private tabellen(): Tabelle[] {
    return [this.koerperT, this.huellenT, this.punkteT, this.zonenT, this.gelenkeT, this.beineT, this.beinErgT, this.kontaktErgT,
      this.beruehrtT, this.zonenErgT, this.drinT];
  }

  private lebt(k: number): boolean {
    const d = this.koerperT.d;
    return d[k * KB + K_WEG] !== 1 && d[k * KB + K_AKTIV] === 1;
  }

  private koerperPruefen(k: number, was: string): void {
    if (!Number.isInteger(k) || k < 0 || k >= this.koerperT.n || this.koerperT.d[k * KB + K_WEG] === 1)
      throw new RangeError(`WeltAttrappe: ${was}: ${String(k)} ist kein Körper dieser Welt`);
  }

  private gelenkAnlegen(art: number, a: number, b: number): number {
    this.koerperPruefen(a, 'Gelenk');
    this.koerperPruefen(b, 'Gelenk');
    if (a === b) throw new RangeError('WeltAttrappe: ein Gelenk braucht zwei verschiedene Körper');
    const g = this.gelenkeT.zeile();
    const G = this.gelenkeT.d, o = g * GB, K = this.koerperT.d;
    G[o + G_ART] = art;
    G[o + G_A] = a;
    G[o + G_B] = b;
    G[o + G_REF] = bogenNormal(K[b * KB + K_W]! - K[a * KB + K_W]!);
    this.schmutzig = true;
    return g;
  }

  private verbunden(a: number, b: number): boolean {
    const G = this.gelenkeT.d;
    for (let g = 0; g < this.gelenkeT.n; g++) {
      const o = g * GB;
      if (G[o + G_WEG] === 1) continue;
      const ga = G[o + G_A], gb = G[o + G_B];
      if ((ga === a && gb === b) || (ga === b && gb === a)) return true;
    }
    return false;
  }

  /** Weltpunkt (x, y) in die Koordinaten von Körper k (vom Ursprung aus) nach aus[i], aus[i + 1] */
  private lokalNach(k: number, x: number, y: number, aus: Float64Array, i: number): void {
    const d = this.koerperT.d, o = k * KB, w = d[o + K_W]!, c = cos(w), s = sin(w);
    const dx = x - d[o + K_X]!, dy = y - d[o + K_Y]!;
    aus[i] = c * dx + s * dy;
    aus[i + 1] = -s * dx + c * dy;
  }

  private schwerpunktSetzen(k: number): void {
    const d = this.koerperT.d, o = k * KB, w = d[o + K_W]!, c = cos(w), s = sin(w), lx = d[o + K_LX]!, ly = d[o + K_LY]!;
    d[o + K_CX] = d[o + K_X]! + c * lx - s * ly;
    d[o + K_CY] = d[o + K_Y]! + s * lx + c * ly;
  }

  /** Masse, Schwerpunkt und Trägheit aus den Hüllen (wenn nicht von Hand), Kehrwerte nach der Art; der Ursprung bleibt */
  private masseRechnen(k: number): void {
    const d = this.koerperT.d, o = k * KB, H = this.huellenT.d, mh = this.mh;
    let m = d[o + K_M]!, traegheit = d[o + K_I]!, lx = d[o + K_LX]!, ly = d[o + K_LY]!;
    if (d[o + K_MFEST] !== 1) {
      m = 0;
      let sx = 0, sy = 0;
      for (let h = 0; h < this.huellenT.n; h++) {
        if (H[h * HB + H_KOERPER] !== k) continue;
        this.huellenMasse(h, mh);
        m += mh[0]!;
        sx += mh[0]! * mh[1]!;
        sy += mh[0]! * mh[2]!;
      }
      lx = m > 0 ? sx / m : 0;
      ly = m > 0 ? sy / m : 0;
      traegheit = 0;
      for (let h = 0; h < this.huellenT.n; h++) {
        if (H[h * HB + H_KOERPER] !== k) continue;
        this.huellenMasse(h, mh);
        const ex = mh[1]! - lx, ey = mh[2]! - ly;
        traegheit += mh[3]! + mh[0]! * (ex * ex + ey * ey);
      }
    }
    let im = 0, ii = 0;
    if (d[o + K_ART] === BEWEGLICH) {
      if (m > 0) {
        im = 1 / m;
        ii = traegheit > 0 ? 1 / traegheit : 0;
      } else {
        m = 1;
        im = 1;
        traegheit = 0;
      }
    }
    d[o + K_M] = m;
    d[o + K_IM] = im;
    d[o + K_I] = traegheit;
    d[o + K_II] = ii;
    // neuer Schwerpunkt: der Ursprung bleibt, das Tempo des Schwerpunkts folgt der Drehung
    const altX = d[o + K_CX]!, altY = d[o + K_CY]!;
    d[o + K_LX] = lx;
    d[o + K_LY] = ly;
    this.schwerpunktSetzen(k);
    const om = d[o + K_OM]!;
    d[o + K_VX] = d[o + K_VX]! - om * (d[o + K_CY]! - altY);
    d[o + K_VY] = d[o + K_VY]! + om * (d[o + K_CX]! - altX);
  }

  /** Masse, Schwerpunkt (lokal) und Trägheit um ihn einer Hülle nach aus[0 … 3]; Vielecke ohne Rundung, Ketten ohne Masse */
  private huellenMasse(h: number, aus: Float64Array): void {
    const H = this.huellenT.d, o = h * HB, P = this.punkteT.d;
    const art = H[o + H_ART]!, r = H[o + H_R]!, a = H[o + H_ANFANG]!, z = H[o + H_ZAHL]!, dichte = H[o + H_DICHTE]!;
    aus.fill(0);
    if (art === KREIS) {
      const m = dichte * PI * r * r;
      aus[0] = m;
      aus[1] = P[2 * a]!;
      aus[2] = P[2 * a + 1]!;
      aus[3] = 0.5 * m * r * r;
    } else if (art === KAPSEL) {
      // wie b2ComputeCapsuleMass
      const ax = P[2 * a]!, ay = P[2 * a + 1]!, bx = P[2 * a + 2]!, by = P[2 * a + 3]!;
      const laenge = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
      const kreisMasse = dichte * PI * r * r, kastenMasse = dichte * 2 * r * laenge;
      const lc = (4 * r) / (3 * PI), hl = 0.5 * laenge;
      aus[0] = kreisMasse + kastenMasse;
      aus[1] = (ax + bx) / 2;
      aus[2] = (ay + by) / 2;
      aus[3] = kreisMasse * (0.5 * r * r + hl * hl + 2 * hl * lc) + (kastenMasse * (4 * r * r + laenge * laenge)) / 12;
    } else if (art === VIELECK) {
      // Fächer aus Dreiecken um die erste Ecke (wie b2ComputePolygonMass ohne Rundung)
      const ox = P[2 * a]!, oy = P[2 * a + 1]!;
      let flaeche = 0, cx = 0, cy = 0, traeg = 0;
      for (let i = 1; i + 1 < z; i++) {
        const e1x = P[2 * (a + i)]! - ox, e1y = P[2 * (a + i) + 1]! - oy, e2x = P[2 * (a + i + 1)]! - ox, e2y = P[2 * (a + i + 1) + 1]! - oy;
        const kreuz = e1x * e2y - e1y * e2x, dreieck = 0.5 * kreuz;
        flaeche += dreieck;
        cx += (dreieck * (e1x + e2x)) / 3;
        cy += (dreieck * (e1y + e2y)) / 3;
        traeg += ((0.25 * kreuz) / 3) * (e1x * e1x + e2x * e1x + e2x * e2x + (e1y * e1y + e2y * e1y + e2y * e2y));
      }
      if (flaeche > 0) {
        const m = dichte * flaeche;
        cx /= flaeche;
        cy /= flaeche;
        aus[0] = m;
        aus[1] = ox + cx;
        aus[2] = oy + cy;
        aus[3] = dichte * traeg - m * (cx * cx + cy * cy);
      }
    }
  }

  private punkteAnhaengen(p: readonly number[]): number {
    const anfang = this.punkteT.n;
    for (let i = 0; i < p.length; i += 2) {
      const z = this.punkteT.zeile();
      this.punkteT.d[2 * z] = p[i]!;
      this.punkteT.d[2 * z + 1] = p[i + 1]!;
    }
    return anfang;
  }

  private kraftAddieren(k: number, punkt: Punkt, fx: number, fy: number): void {
    const d = this.koerperT.d, o = k * KB;
    d[o + K_FX] = d[o + K_FX]! + fx;
    d[o + K_FY] = d[o + K_FY]! + fy;
    d[o + K_TQ] = d[o + K_TQ]! + (punkt[0] - d[o + K_CX]!) * fy - (punkt[1] - d[o + K_CY]!) * fx;
  }

  /** Impuls (jx, jy) am Weltpunkt (px, py) auf einen beweglichen Körper */
  private impuls(k: number, px: number, py: number, jx: number, jy: number): void {
    const d = this.koerperT.d, o = k * KB, im = d[o + K_IM]!;
    d[o + K_VX] = d[o + K_VX]! + im * jx;
    d[o + K_VY] = d[o + K_VY]! + im * jy;
    d[o + K_OM] = d[o + K_OM]! + d[o + K_II]! * ((px - d[o + K_CX]!) * jy - (py - d[o + K_CY]!) * jx);
  }

  /** Tabelle in ein Feld kopieren, so viele Zeilen wie passen; gibt ihre Zahl */
  private kopieren(t: Tabelle, aus: Float64Array | Int32Array): number {
    const n = Math.min(t.n, Math.floor(aus.length / t.breite));
    for (let i = 0; i < n * t.breite; i++) aus[i] = t.d[i]!;
    return n;
  }
}
