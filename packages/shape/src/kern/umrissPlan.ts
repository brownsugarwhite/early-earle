// Prüfplan P1 „Ansichten als Illustration“, Tag 1 (03.11.2026): Umrissschleifen zuerst.
//
// Die Umrisslinie einer Ansicht wird nicht mehr aus dem fertigen Körper geschnitten („Körper zuerst“: auf flachen Flanken
// in der Tiefe schlecht bestimmt, daher die wilden Linien der V2), sondern **geplant** — allein aus den drei Zeichnungen:
// 1. Jede Probe der gezeichneten Linie bekommt aus der Sichthülle die erlaubte Tiefe (Intervalle: Seite × Front × Top in 2D,
//    `grundkoerper/huelle.ts`); leer = Widerspruch (Weg nach innen in px, wie `erreichbarkeit`).
// 2. Die Tiefe wird glatt gewählt: erst je Probe das Intervall mit den wenigsten Sprüngen (Viterbi), dann die Kurve mit der
//    kleinsten Biegung innerhalb der Intervalle (Ausgleich mit aktiver Menge) — „so rund wie möglich“ in der Tiefe.
// 3. T-Stöße sind die konkaven Ecken der Zeichnung: Sehnen zwischen ihnen (kürzeste zuerst, im Umriss, beidseits ein echter
//    Bogen) zerlegen die gezeichnete Fläche in Teile (Kopf über dem Rumpf im Top, Hals auf dem Rumpf in der Front). Jedes
//    Teil wird eine geschlossene Schleife: seine gezeichneten Bögen, dazu über jede Sehne ein tangentenstetiger Vorschlag —
//    beim ferneren Teil die **verdeckte Fortsetzung** (blass), beim näheren die **sichtbare Schlusskontur** (dünn; in der
//    Seite liegen alle Schleifen in der Spiegelebene, dort ist jeder Schluss verdeckt). Keine Zusatzpunkte der Vereinigung —
//    die gezeichnete Linie bleibt, wie sie ist (Florian, Klarstellung 02.11.). Die Tiefe wird je Teil geglättet.
// Ergebnis: je Ansicht geschlossene 3D-Schleifen mit Proben (Lage, Kurvenparameter, Art gezeichnet/verdeckt/Schluss,
// erlaubte Tiefe, Widerspruch). Hängt nur an der Zeichnung — ruhig bei jedem Wackeln des Körpers. DOM-frei.
import { type Kubik, type V2, ableitung, punktAuf } from '../bezier';
import type { Dokument } from '../dokument';
import { vollerPfad } from '../profil';
import { type Huelle, type Intervalle, huelle } from './grundkoerper/huelle';
import { silhouettenBreite } from './breite';
import type { V3 } from '../versuch/catmullClark';

const PX = 461;
type Blatt = 'seite' | 'front' | 'top';

/** Probe einer geplanten Schleife: 0 = gezeichnet, 1 = verdeckte Fortsetzung (Vorschlag), 2 = sichtbare Schlusskontur (Vorschlag) */
export type PlanArt = 0 | 1 | 2;
export type PlanProbe = {
  /** 3D (Profil-Einheiten × Maßstab) */
  p: V3;
  /** Blattkoordinaten (Welt) */
  q: V2;
  /** Kurvenparameter der Zeichnung (Segment + Anteil); Vorschläge: −1 */
  s: number;
  art: PlanArt;
  /** erlaubte Tiefe (gewähltes Intervall); bei Widerspruch NaN */
  lo: number;
  hi: number;
  /** Widerspruch in px (0 = erreichbar) */
  widerspruch: number;
};
export type PlanSchleife = {
  ansicht: Blatt;
  id: string;
  /** Fläche der Zerlegung je Ansicht (0 = Wurzel außerhalb aller Sehnen, sonst der kürzere Bogen einer Sehne) */
  teil: number;
  proben: PlanProbe[];
  /** mittlere Tiefe (zur Zuordnung) */
  tiefe: number;
};
export type UmrissPlan = {
  schleifen: PlanSchleife[];
  /** T-Stöße je Ansicht (Blattkoordinaten) */
  tStoesse: { ansicht: Blatt; q: V2 }[];
  /** größter Widerspruch je Ansicht (px) */
  widerspruch: Record<Blatt, number>;
  /** Maßstab, mit dem die Proben gerechnet sind (Profil-Einheiten × Maßstab) */
  skalierung: number;
  ms: number;
};

/** Abstand der Proben entlang der Zeichnung (px) */
const ABSTAND = 2.5 / PX;
/** Reichweite einer Tiefe zum nächsten erlaubten Intervall eines Vorschlags (px) */
const SPRUNG = 6 / PX;
/** Strafe (Welt) für den Wechsel in ein nicht überlappendes Intervall (Viterbi) */
const WECHSEL = 3 / PX;
/** Zug zur Intervallmitte bei der Biegeminimierung (Gewicht je Probe gegen die Biegung mit Gewicht 1) */
const MITTE = 0.00001;
/** Zug zur Soll-Tiefe der Front (Stützfunktion elliptischer Querschnitte) — stärker, die Lage ist dort bestimmt */
const MITTE_SOLL = 0.1;
/** Mittelungsfenster der Soll-Tiefe längs der Schleife (Proben, ± ) */
const SOLL_FENSTER = 8;
/** Plateau der Berührung: Stationen, deren f höchstens so viel über dem Minimum liegt, gelten als gleich (Kasten, Zylinder) */
const FRONT_PLATEAU = 0.02;
/** Stationen längs x für die Stützfunktion */
const STATIONEN = 240;
/** Runden der aktiven Menge (verletzte Schranken festklemmen) */
const AKTIV_RUNDEN = 80;
/** Gewicht einer festgeklemmten Schranke */
const KLEMME = 1e6;
/** Überlappung (Proben) beim Aufschneiden einer geschlossenen Folge */
const UEBERLAPPUNG = 16;
/** Mindestzahl der Proben eines Bogens zwischen zwei konkaven Ecken, damit er ein Teil ist */
const STRECKE_MIN = 8;
/** Abtastung der Intervalle innen neben der Linie (px): genau auf der Linie liegen Kanten eines Kastens auf der Grenzlage der anderen Ansicht (Splitter) */
const INNEN = 2;
/** Schritte (je 1 px) eines Vorschlagspunkts zur Sehne hin, wenn kein Intervall in Reichweite liegt */
const ZUG_SCHRITTE = 12;
/** Winkel, ab dem eine Zeichnung an einer Probe als Ecke gilt */
const ECKE = (25 * Math.PI) / 180;
/** Suche nach innen bei Widerspruch (px) */
const WIDERSPRUCH_BIS = 300;

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

type Probe2 = { q: V2; s: number; tangente: V2; ecke: boolean; konkav: boolean };

/** Zeichnung einer Ansicht dicht abgetastet (geschlossen, letzte ≠ erste), mit Tangente, Ecken und ihrer Konkavität. */
function abtasten(segs: readonly Kubik[], sk: number): Probe2[] {
  const out: Probe2[] = [];
  segs.forEach((seg, si) => {
    let len = 0;
    let vorher = punktAuf(seg, 0);
    for (let k = 1; k <= 16; k++) {
      const p = punktAuf(seg, k / 16);
      len += Math.hypot(p.x - vorher.x, p.y - vorher.y) * sk;
      vorher = p;
    }
    const n = Math.max(4, Math.ceil(len / ABSTAND));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const p = punktAuf(seg, t);
      let d = ableitung(seg, t);
      // Knoten ohne Griff (gerade Kante): die Ableitung ist dort 0 — Richtung aus der Sehne zur nächsten Probe
      if (Math.hypot(d.x, d.y) < 1e-9) {
        const p2 = punktAuf(seg, Math.min(1, t + 0.5 / n));
        d = { x: p2.x - p.x, y: p2.y - p.y };
      }
      const l = Math.hypot(d.x, d.y) || 1;
      out.push({ q: { x: p.x * sk, y: p.y * sk }, s: si + t, tangente: { x: d.x / l, y: d.y / l }, ecke: false, konkav: false });
    }
  });
  // Ecken: Knick der Tangente zwischen Nachbarproben; konkav, wenn die Drehung gegen den Umlaufsinn geht (T-Stoß-Kandidat)
  const n = out.length;
  const sg = umlauf(out);
  for (let i = 0; i < n; i++) {
    const a = out[(i - 1 + n) % n]!.tangente;
    const b = out[i]!.tangente;
    const w = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y)));
    if (w > ECKE) {
      out[i]!.ecke = true;
      out[i]!.konkav = (a.x * b.y - a.y * b.x) * sg < 0;
    }
  }
  return out;
}

/** Erlaubte Tiefen einer Probe je Ansicht (Blattkoordinaten → Hülle). */
function tiefen(h: Huelle, a: Blatt, q: V2): Intervalle {
  return a === 'seite' ? h.zBei(q.x, q.y) : a === 'front' ? h.xBei(q.x, q.y) : h.yBei(q.x, q.y);
}

/** 3D-Punkt aus Blattkoordinaten und Tiefe. */
export function punkt3(a: Blatt, q: V2, tiefe: number): V3 {
  return a === 'seite' ? [q.x, q.y, tiefe] : a === 'front' ? [tiefe, q.y, q.x] : [q.x, tiefe, q.y];
}

/** Umlaufsinn eines Polygons (+1 gegen den Uhrzeigersinn). */
function umlauf(pts: readonly { q: V2 }[]): number {
  let f = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!.q;
    const r = pts[(i + 1) % pts.length]!.q;
    f += p.x * r.y - r.x * p.y;
  }
  return f >= 0 ? 1 : -1;
}

/** Punkt im Polygon der Proben (Strahltest). */
function imPolygon(poly: readonly Probe2[], p: V2): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!.q;
    const b = poly[j]!.q;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** Widerspruch einer unerreichbaren Probe: Weg nach innen (px) bis zur ersten erreichbaren Stelle (wie `erreichbarkeit`). */
function widerspruchBei(h: Huelle, a: Blatt, q: V2, innen: V2): number {
  const reicht = (s: number) => tiefen(h, a, { x: q.x + (innen.x * s) / PX, y: q.y + (innen.y * s) / PX }).length > 0;
  let lo = 0;
  let hi = -1;
  for (let s = 1; s <= WIDERSPRUCH_BIS; s++) {
    if (reicht(s)) {
      hi = s;
      lo = s - 1;
      break;
    }
  }
  if (hi < 0) return WIDERSPRUCH_BIS;
  while (hi - lo > 0.05) {
    const m = (lo + hi) / 2;
    if (reicht(m)) hi = m;
    else lo = m;
  }
  return hi;
}

/** Je Probe das Intervall mit den wenigsten Sprüngen (Viterbi über die geschlossene Folge; leere Proben tragen durch). */
function intervalleWaehlen(iv: Intervalle[]): number[] {
  const n = iv.length;
  const wahl = new Array<number>(n).fill(-1);
  // Start an einer Probe mit genau einem Intervall (sonst der ersten mit Intervallen)
  let start = iv.findIndex((v) => v.length === 1);
  if (start < 0) start = iv.findIndex((v) => v.length > 0);
  if (start < 0) return wahl;
  const abstand = (a: [number, number], b: [number, number]) => Math.max(0, a[0] - b[1], b[0] - a[1]);
  // Kosten je Zustand, Rückverweise
  let kosten = iv[start]!.map(() => 0);
  let letzte = iv[start]!;
  const rueck: number[][] = [];
  const reihenfolge: number[] = [];
  for (let step = 1; step <= n; step++) {
    const i = (start + step) % n;
    const akt = iv[i]!;
    reihenfolge.push(i);
    if (!akt.length) {
      rueck.push(kosten.map((_, k) => k));
      continue;
    }
    const neu = akt.map(() => Infinity);
    const r = akt.map(() => 0);
    akt.forEach((b, k) => {
      letzte.forEach((a, j) => {
        const c = kosten[j]! + abstand(a, b) + (abstand(a, b) > 1e-9 ? WECHSEL : 0);
        if (c < neu[k]!) {
          neu[k] = c;
          r[k] = j;
        }
      });
    });
    kosten = neu;
    letzte = akt;
    rueck.push(r);
  }
  // Rückverfolgung ab dem besten Endzustand (Zustand der Startprobe am Ende des Rundgangs)
  let k = 0;
  for (let j = 1; j < kosten.length; j++) if (kosten[j]! < kosten[k]!) k = j;
  for (let step = reihenfolge.length - 1; step >= 0; step--) {
    const i = reihenfolge[step]!;
    if (iv[i]!.length) {
      wahl[i] = k;
      k = rueck[step]![k]!;
    } else k = rueck[step]![k] ?? k;
  }
  if (wahl[start]! < 0) wahl[start] = 0;
  return wahl;
}

/**
 * Symmetrische, positiv definite Bandmatrix (Diagonale `d0`, Nebendiagonalen `d1` (i, i+1) und `d2` (i, i+2)) lösen:
 * Zerlegung L·D·Lᵀ mit Bandbreite 2, O(n).
 */
function pentaLoesen(d0: Float64Array, d1: Float64Array, d2: Float64Array, rhs: Float64Array): Float64Array {
  const n = d0.length;
  const D = new Float64Array(n);
  const l1 = new Float64Array(n);
  const l2 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    l2[i] = i >= 2 ? d2[i - 2]! / D[i - 2]! : 0;
    l1[i] = i >= 1 ? (d1[i - 1]! - (i >= 2 ? l2[i]! * D[i - 2]! * l1[i - 1]! : 0)) / D[i - 1]! : 0;
    D[i] = d0[i]! - (i >= 1 ? l1[i]! * l1[i]! * D[i - 1]! : 0) - (i >= 2 ? l2[i]! * l2[i]! * D[i - 2]! : 0);
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = rhs[i]! - (i >= 1 ? l1[i]! * y[i - 1]! : 0) - (i >= 2 ? l2[i]! * y[i - 2]! : 0);
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) x[i] = y[i]! / D[i]! - (i + 1 < n ? l1[i + 1]! * x[i + 1]! : 0) - (i + 2 < n ? l2[i + 2]! * x[i + 2]! : 0);
  return x;
}

/**
 * Offene Folge: kleinste Biegung (Summe der quadrierten zweiten Differenzen) mit schwachem Zug zur Intervallmitte, innerhalb
 * der Intervalle — als Ausgleich mit aktiver Menge: lösen, verletzte Schranken festklemmen, wieder lösen (höchstens
 * AKTIV_RUNDEN Runden). `fest` = Probe hat ein Intervall, `mitte` = Startwert (Intervallmitte bzw. Lückenfüllung).
 */
function biegungMinimieren(lo: Float64Array, hi: Float64Array, fest: Uint8Array, mitte: Float64Array, zug = MITTE): Float64Array {
  const m = lo.length;
  if (m < 3) return Float64Array.from(mitte);
  // Biegematrix (1, −2, 1)ᵀ(1, −2, 1) über alle inneren Proben + Zug zur Mitte
  const b0 = new Float64Array(m).fill(zug);
  const b1 = new Float64Array(m);
  const b2 = new Float64Array(m);
  for (let i = 1; i + 1 < m; i++) {
    b0[i - 1] = b0[i - 1]! + 1;
    b0[i] = b0[i]! + 4;
    b0[i + 1] = b0[i + 1]! + 1;
    b1[i - 1] = b1[i - 1]! - 2;
    b1[i] = b1[i]! - 2;
    b2[i - 1] = b2[i - 1]! + 1;
  }
  // Klemme je Probe: 0 frei, −1 untere Schranke, +1 obere
  const klemme = new Int8Array(m);
  let d: Float64Array = Float64Array.from(mitte);
  for (let runde = 0; runde < AKTIV_RUNDEN; runde++) {
    const d0 = Float64Array.from(b0);
    const rhs = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      rhs[i] = zug * mitte[i]!;
      if (klemme[i]) {
        d0[i] = d0[i]! + KLEMME;
        rhs[i] = rhs[i]! + KLEMME * (klemme[i]! < 0 ? lo[i]! : hi[i]!);
      }
    }
    d = pentaLoesen(d0, b1, b2, rhs);
    // Gradient des Ziels (ohne Klemmen): will er eine geklemmte Probe von der Schranke weg ins Innere, ist die Klemme unnötig
    let geaendert = 0;
    for (let i = 0; i < m; i++) {
      if (!klemme[i]) continue;
      let g = b0[i]! * d[i]! - zug * mitte[i]!;
      if (i >= 1) g += b1[i - 1]! * d[i - 1]!;
      if (i + 1 < m) g += b1[i]! * d[i + 1]!;
      if (i >= 2) g += b2[i - 2]! * d[i - 2]!;
      if (i + 2 < m) g += b2[i]! * d[i + 2]!;
      // untere Schranke: aktiv nur, wenn das Ziel d weiter senken will (g > 0); obere: wenn es heben will (g < 0)
      if ((klemme[i]! < 0 && g < -1e-12) || (klemme[i]! > 0 && g > 1e-12)) {
        klemme[i] = 0;
        geaendert++;
      }
    }
    for (let i = 0; i < m; i++) {
      if (!fest[i] || klemme[i]) continue;
      if (d[i]! < lo[i]! - 1e-9) {
        klemme[i] = -1;
        geaendert++;
      } else if (d[i]! > hi[i]! + 1e-9) {
        klemme[i] = 1;
        geaendert++;
      }
    }
    if (!geaendert) break;
  }
  for (let i = 0; i < m; i++) if (fest[i]) d[i] = Math.min(hi[i]!, Math.max(lo[i]!, d[i]!));
  return d;
}

/**
 * Tiefe glatt innerhalb der gewählten Intervalle längs einer Probenfolge (geschlossen oder offen): „so rund wie möglich“ =
 * kleinste Biegung innerhalb der Schranken; Lücken (Widerspruch) linear aus den Nachbarn. Geschlossene Folgen werden an der
 * engsten Stelle aufgeschnitten und mit Überlappung an beiden Enden gelöst (die Überlappung trägt die Stetigkeit über den Schnitt).
 */
/**
 * Tiefe einer Schleife mit kleinster Biegung innerhalb der Intervalle (aktive Menge); `soll` zieht zur Soll-Tiefe, sonst schwach
 * zur Intervallmitte. Auch der Schleifen-Käfig nutzt sie (ohne `soll`: die Vorlage der berührenden Station gilt für
 * Rotationskörper und Kästen nicht — Vase 80 px, Würfel 100 px Wanderung der Front-Tiefe).
 */
export function tiefeGlaetten(lo: Float64Array, hi: Float64Array, fest: Uint8Array, zyklisch: boolean, soll?: Float64Array): Float64Array {
  const n = lo.length;
  const mitte = new Float64Array(n);
  const zug = soll ? MITTE_SOLL : MITTE;
  for (let i = 0; i < n; i++) mitte[i] = fest[i] ? (soll && Number.isFinite(soll[i]!) ? Math.min(hi[i]!, Math.max(lo[i]!, soll[i]!)) : (lo[i]! + hi[i]!) / 2) : NaN;
  for (let i = 0; i < n; i++) {
    if (fest[i]) continue;
    let a = i;
    let b = i;
    while (!fest[((a % n) + n) % n] && a > i - n) a--;
    while (!fest[b % n] && b < i + n) b++;
    const ia = ((a % n) + n) % n;
    const ib = b % n;
    const w = b - a > 0 ? (i - a) / (b - a) : 0;
    mitte[i] = fest[ia] && fest[ib] ? (lo[ia]! + hi[ia]!) / 2 + w * ((lo[ib]! + hi[ib]!) / 2 - (lo[ia]! + hi[ia]!) / 2) : 0;
  }
  if (n < 3) return mitte;
  if (!zyklisch) return biegungMinimieren(lo, hi, fest, mitte, zug);
  // geschlossen: Schnitt an der engsten festen Probe, Überlappung K an beiden Enden
  let schnitt = 0;
  let eng = Infinity;
  for (let i = 0; i < n; i++) {
    if (!fest[i]) continue;
    const b = hi[i]! - lo[i]!;
    if (b < eng) {
      eng = b;
      schnitt = i;
    }
  }
  const K = Math.min(UEBERLAPPUNG, Math.floor(n / 4));
  const m = n + 2 * K;
  const idx = (k: number) => (((schnitt - K + k) % n) + n) % n;
  const l = new Float64Array(m);
  const h = new Float64Array(m);
  const f = new Uint8Array(m);
  const mi = new Float64Array(m);
  for (let k = 0; k < m; k++) {
    const i = idx(k);
    l[k] = lo[i]!;
    h[k] = hi[i]!;
    f[k] = fest[i]!;
    mi[k] = mitte[i]!;
  }
  const g = biegungMinimieren(l, h, f, mi, zug);
  const d = new Float64Array(n);
  for (let k = K; k < K + n; k++) d[idx(k)] = g[k]!;
  return d;
}

/** Stationen längs x für die Soll-Tiefe der Front: je Station die Seiten-Intervalle (Mitte, halbe Höhe) und die halbe Breite aus dem Top. */
type FrontStationen = { x: Float64Array; b: Float64Array; schnitte: { c: number; h: number }[][] };

function frontStationen(h: Huelle, breiten: ReturnType<typeof silhouettenBreite>, xVon: number, xBis: number): FrontStationen {
  const x = new Float64Array(STATIONEN + 1);
  const b = new Float64Array(STATIONEN + 1);
  const schnitte: { c: number; h: number }[][] = [];
  for (let k = 0; k <= STATIONEN; k++) {
    x[k] = xVon + ((xBis - xVon) * k) / STATIONEN;
    b[k] = breiten.top(x[k]!);
    schnitte.push(b[k]! > 0 ? h.yBei(x[k]!, 0).map(([lo, hi]) => ({ c: (lo + hi) / 2, h: Math.max(1e-9, (hi - lo) / 2) })) : []);
  }
  return { x, b, schnitte };
}

/**
 * Soll-Tiefe einer Front-Probe (Tag 2–3): die Station, deren elliptischer Querschnitt (Höhe und Mitte aus der Seite, Breite
 * aus dem Top) die Probe berührt — f(x) = ((q_y − c)/h)² + (q_z/b)² am kleinsten (1 = Berührung), zwischen den Stationen
 * parabolisch verfeinert; bei einem Plateau (Kasten, Zylinder: f überall gleich) die Mitte des Plateaus. Die Mitte des
 * erlaubten Intervalls war für einen Kegel falsch (die Hülle erlaubt bei 45° jede Tiefe zwischen 71 % und 100 % der Länge;
 * das runde Bild hat sie am Rand, wo f minimal ist). Stützpunkt-Regeln (nächster Stützpunkt; größte Stützfunktion mit
 * Filter längs) sprangen beim Ei zwischen fast gleich nahen Stationen (±30 px) — f ist glatt in x und eindeutig.
 */
function frontSoll(st: FrontStationen, q: V2, iv: Intervalle): number {
  const f = new Float64Array(STATIONEN + 1).fill(Infinity);
  let fMin = Infinity;
  let kMin = -1;
  for (let k = 0; k <= STATIONEN; k++) {
    const b = st.b[k]!;
    for (const s of st.schnitte[k]!) {
      const v = ((q.y - s.c) / s.h) ** 2 + (q.x / b) ** 2;
      if (v < f[k]!) f[k] = v;
    }
    if (f[k]! < fMin) {
      fMin = f[k]!;
      kMin = k;
    }
  }
  if (kMin < 0) return NaN;
  // Plateau: alle Stationen nahe dem Minimum, davon die Mitte; sonst Parabel durch die drei Stationen um das Minimum
  const nahe: number[] = [];
  for (let k = 0; k <= STATIONEN; k++) if (f[k]! <= fMin * (1 + FRONT_PLATEAU)) nahe.push(k);
  let kSoll = nahe.length > 2 ? nahe[Math.floor(nahe.length / 2)]! : kMin;
  if (nahe.length <= 2 && kMin > 0 && kMin < STATIONEN && Number.isFinite(f[kMin - 1]!) && Number.isFinite(f[kMin + 1]!)) {
    const a = f[kMin - 1]!;
    const b = f[kMin]!;
    const c = f[kMin + 1]!;
    const nenner = a - 2 * b + c;
    if (nenner > 1e-18) kSoll = kMin + Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / nenner));
  }
  const soll = st.x[0]! + ((st.x[STATIONEN]! - st.x[0]!) * kSoll) / STATIONEN;
  // in das Intervall der Probe klemmen (außerhalb ist die Probe dort nicht erreichbar)
  let aus = soll;
  let ad = Infinity;
  for (const [lo, hi] of iv) {
    const c = Math.min(hi, Math.max(lo, soll));
    const d = Math.abs(c - soll);
    if (d < ad) {
      ad = d;
      aus = c;
    }
  }
  return aus;
}

/** Kubische Hermite-Kurve zwischen zwei Proben (Tangenten in Laufrichtung), dicht abgetastet (ohne Endpunkte). */
function hermite(a: V2, ta: V2, b: V2, tb: V2): V2[] {
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  const m = Math.max(2, Math.ceil(l / ABSTAND));
  const out: V2[] = [];
  for (let k = 1; k < m; k++) {
    const t = k / m;
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
    const h10 = t ** 3 - 2 * t ** 2 + t;
    const h01 = -2 * t ** 3 + 3 * t ** 2;
    const h11 = t ** 3 - t ** 2;
    out.push({ x: h00 * a.x + h10 * l * ta.x + h01 * b.x + h11 * l * tb.x, y: h00 * a.y + h10 * l * ta.y + h01 * b.y + h11 * l * tb.y });
  }
  return out;
}

/** Intervall, das einer Tiefe am nächsten liegt (Index), −1 ohne Intervalle. */
function naechstesIntervall(iv: Intervalle, t: number): number {
  let best = -1;
  let bd = Infinity;
  iv.forEach((v, k) => {
    const d = Math.max(0, v[0] - t, t - v[1]);
    if (d < bd) {
      bd = d;
      best = k;
    }
  });
  return best;
}

/** Sehne zwischen zwei konkaven Ecken (T-Stoß): a → b vorwärts ist der kürzere Bogen (Indizes der Proben, einschließlich). */
type Sehne = { a: number; b: number };

/**
 * Sehnen zwischen konkaven Ecken: Paare, deren Sehne im Umriss liegt und auf beiden Seiten einen echten Bogen abtrennt
 * (Bogen ≥ 1,25 × Sehne — die Seite eines Halses ist kein Teil), kürzeste zuerst, ohne Kreuzung, jede Ecke einmal.
 */
function sehnenWaehlen(proben: readonly Probe2[]): Sehne[] {
  const n = proben.length;
  const reflex: number[] = [];
  proben.forEach((p, i) => p.ecke && p.konkav && reflex.push(i));
  if (reflex.length < 2) return [];
  const abstand = (i: number, j: number) => Math.hypot(proben[i]!.q.x - proben[j]!.q.x, proben[i]!.q.y - proben[j]!.q.y);
  const bogen = (a: number, b: number) => {
    let l = 0;
    for (let i = a; i !== b; i = (i + 1) % n) l += abstand(i, (i + 1) % n);
    return l;
  };
  const kandidaten: { a: number; b: number; l: number }[] = [];
  for (let x = 0; x < reflex.length; x++) {
    for (let y = x + 1; y < reflex.length; y++) {
      const i = reflex[x]!;
      const j = reflex[y]!;
      const l = abstand(i, j);
      if (l < 1e-9) continue;
      const vor = (j - i + n) % n;
      const [a, b] = vor <= n - vor ? [i, j] : [j, i];
      if (Math.min(vor, n - vor) < STRECKE_MIN) continue;
      if (bogen(a, b) < 1.25 * l || bogen(b, a) < 1.25 * l) continue;
      let drin = true;
      for (let t = 0.1; t < 0.95 && drin; t += 0.2) drin = imPolygon(proben, { x: proben[i]!.q.x + t * (proben[j]!.q.x - proben[i]!.q.x), y: proben[i]!.q.y + t * (proben[j]!.q.y - proben[i]!.q.y) });
      if (!drin) continue;
      kandidaten.push({ a, b, l });
    }
  }
  kandidaten.sort((p, q) => p.l - q.l);
  const out: Sehne[] = [];
  const benutzt = new Set<number>();
  const innerhalb = (s: Sehne, i: number) => {
    const k = (i - s.a + n) % n;
    return k > 0 && k < (s.b - s.a + n) % n;
  };
  for (const k of kandidaten) {
    if (benutzt.has(k.a) || benutzt.has(k.b)) continue;
    if (out.some((s) => innerhalb(s, k.a) !== innerhalb(s, k.b))) continue;
    out.push({ a: k.a, b: k.b });
    benutzt.add(k.a);
    benutzt.add(k.b);
  }
  return out;
}

/** Fläche der Zerlegung: Wurzel (ohne Sehne) oder der kürzere Bogen einer Sehne, abzüglich der Kinder. */
type Flaeche = { nr: number; sehne: Sehne | null; kinder: Flaeche[]; eltern: Flaeche | null; laenge: number };

/** Geplante Umrissschleifen aller drei Ansichten aus den Zeichnungen (Profil-Einheiten × Maßstab). */
export function umrissPlan(dok: Dokument): UmrissPlan {
  const t0 = jetzt();
  const h = huelle(dok);
  const sk = dok.skalierung;
  const breiten = silhouettenBreite(dok);
  // x-Bereich der Seite (Stationen der Stützfunktion)
  let xVon = Infinity;
  let xBis = -Infinity;
  for (const seg of vollerPfad(dok.profile.seite)) {
    for (const c of seg) {
      xVon = Math.min(xVon, c.x * sk);
      xBis = Math.max(xBis, c.x * sk);
    }
  }
  const schleifen: PlanSchleife[] = [];
  const tStoesse: UmrissPlan['tStoesse'] = [];
  const widerspruchMax: Record<Blatt, number> = { seite: 0, front: 0, top: 0 };
  for (const a of ['seite', 'front', 'top'] as const) {
    const proben = abtasten(vollerPfad(dok.profile[a]), sk);
    const stationen = a === 'front' ? frontStationen(h, breiten, xVon, xBis) : null;
    const n = proben.length;
    if (n < 3) continue;
    const sg = umlauf(proben);
    const innenVon = (t: V2): V2 => ({ x: -t.y * sg, y: t.x * sg });
    // an einer Ecke die Winkelhalbierende der beiden Kanten: längs nur einer Kante nach innen gerückt bleibt die Probe auf der
    // Grenze der anderen und bekommt ein Splitter-Intervall (scharfer Würfel: Höhe 0,006 statt 0,4; die Tiefe wanderte 100 px)
    const innen = (p: Probe2, i: number): V2 => {
      const n1 = innenVon(p.tangente);
      if (!p.ecke) return n1;
      const n0 = innenVon(proben[(i - 1 + n) % n]!.tangente);
      const m = { x: n0.x + n1.x, y: n0.y + n1.y };
      const l = Math.hypot(m.x, m.y);
      return l > 1e-9 ? { x: m.x / l, y: m.y / l } : n1;
    };
    // Intervalle zwei Pixel innen abgetastet: genau auf der Linie berührt die Probe die Grenzlage der anderen Ansichten
    // nur tangential (Kanten eines Kastens, Scheitel), und die Intervalle zerfallen in Splitter
    const iv = proben.map((p, i) => {
      const nn = innen(p, i);
      return tiefen(h, a, { x: p.q.x + (nn.x * INNEN) / PX, y: p.q.y + (nn.y * INNEN) / PX });
    });
    // Seite: Tiefe 0 (Naht in der Spiegelebene) — das Intervall, das 0 enthält, sonst Widerspruch
    const ivGewaehlt: Intervalle[] = a === 'seite' ? iv.map((v) => v.filter(([lo, hi]) => lo <= 1e-9 && hi >= -1e-9)) : iv;
    const wahl = a === 'seite' ? ivGewaehlt.map((v) => (v.length ? 0 : -1)) : intervalleWaehlen(ivGewaehlt);
    const lo = new Float64Array(n);
    const hi = new Float64Array(n);
    const fest = new Uint8Array(n);
    const wid = new Float64Array(n);
    proben.forEach((p, i) => {
      const k = wahl[i]!;
      if (k >= 0 && ivGewaehlt[i]![k]) {
        lo[i] = a === 'seite' ? 0 : ivGewaehlt[i]![k]![0];
        hi[i] = a === 'seite' ? 0 : ivGewaehlt[i]![k]![1];
        fest[i] = 1;
      } else {
        lo[i] = NaN;
        hi[i] = NaN;
        wid[i] = widerspruchBei(h, a, p.q, innen(p, i));
        widerspruchMax[a] = Math.max(widerspruchMax[a], wid[i]!);
      }
    });
    // Zerlegung an den Sehnen konkaver Ecken: Flächenbaum über den kürzeren Bögen
    const sehnen = sehnenWaehlen(proben);
    const laenge = (s: Sehne) => (s.b - s.a + n) % n;
    const flaechen: Flaeche[] = [{ nr: 0, sehne: null, kinder: [], eltern: null, laenge: n }];
    const enthaelt = (aussen: Sehne, innenS: Sehne) => (innenS.a - aussen.a + n) % n <= laenge(aussen) && (innenS.b - aussen.a + n) % n <= laenge(aussen);
    for (const s of [...sehnen].sort((p, q) => laenge(q) - laenge(p))) {
      let eltern = flaechen[0]!;
      for (const f of flaechen) if (f.sehne && enthaelt(f.sehne, s) && f.laenge < eltern.laenge) eltern = f;
      const f: Flaeche = { nr: flaechen.length, sehne: s, kinder: [], eltern, laenge: laenge(s) };
      eltern.kinder.push(f);
      flaechen.push(f);
    }
    // Lauf je Fläche: Probenfolge mit Sprüngen über die Sehnen der Kinder, bei einer Sehne am Ende der Schluss zurück
    type Element = { art: 'probe'; i: number } | { art: 'sehne'; von: number; bis: number; nachbar: Flaeche };
    const laeufe = new Map<number, Element[]>();
    for (const f of flaechen) {
      const el: Element[] = [];
      const start = f.sehne ? f.sehne.a : flaechen.length > 1 ? flaechen[1]!.sehne!.b : 0;
      const ende = f.sehne ? f.sehne.b : start;
      let i = start;
      let schritte = 0;
      for (;;) {
        el.push({ art: 'probe', i });
        if (f.sehne && i === ende) {
          el.push({ art: 'sehne', von: ende, bis: f.sehne.a, nachbar: f.eltern! });
          break;
        }
        const kind = f.kinder.find((k) => k.sehne!.a === i);
        if (kind) {
          el.push({ art: 'sehne', von: i, bis: kind.sehne!.b, nachbar: kind });
          i = kind.sehne!.b;
        } else i = (i + 1) % n;
        if (!f.sehne && i === start) break;
        if (++schritte > 2 * n) break;
      }
      laeufe.set(f.nr, el);
    }
    // Tiefe je Fläche: ihre gezeichneten Strecken einzeln geglättet (offen; ohne Sehnen die ganze Schleife geschlossen)
    const tiefeJe = new Map<number, Map<number, number>>();
    const grenzenJe = new Map<number, Map<number, [number, number]>>();
    const reichweite = new Map<number, { nah: number; fern: number }>();
    const ecken = new Set<number>();
    for (const s of sehnen) {
      ecken.add(s.a);
      ecken.add(s.b);
    }
    for (const f of flaechen) {
      const el = laeufe.get(f.nr)!;
      const d = new Map<number, number>();
      const grenzen = new Map<number, [number, number]>();
      let strecke: number[] = [];
      const fertig = () => {
        if (!strecke.length) return;
        const m = strecke.length;
        const l = new Float64Array(m);
        const hh = new Float64Array(m);
        const fe = new Uint8Array(m);
        strecke.forEach((i, k) => {
          l[k] = lo[i]!;
          hh[k] = hi[i]!;
          fe[k] = fest[i]!;
        });
        // Ecke einer Sehne (die Probe gehört beiden Flächen): hier gilt das Intervall ihres Nachbarn in dieser Strecke — der
        // Viterbi über die ganze Zeichnung kann an der Ecke nur eine Seite bedienen, und die Innen-Abtastung liegt an einer
        // konkaven Ecke leicht im Nachbarteil
        const eckeWahl = (k: number, nachbar: number) => {
          const i = strecke[k]!;
          const j = strecke[nachbar]!;
          if (!ecken.has(i) || !fest[j]) return;
          l[k] = lo[j]!;
          hh[k] = hi[j]!;
          fe[k] = 1;
          grenzen.set(i, [l[k]!, hh[k]!]);
        };
        if (m >= 2 && a !== 'seite') {
          eckeWahl(0, 1);
          eckeWahl(m - 1, m - 2);
        }
        let soll: Float64Array | undefined;
        if (a === 'front') {
          const s = new Float64Array(m);
          strecke.forEach((i, k) => {
            const p = proben[i]!;
            s[k] = fe[k] ? frontSoll(stationen!, p.q, [[l[k]!, hh[k]!]]) : NaN;
          });
          // längs der Strecke gemittelt (Fenster ± SOLL_FENSTER Proben): Wo f flach ist (Äquator des Eis), springt die
          // berührende Station zwischen Nachbarn, die Mittelung glättet das vor dem Zug
          const geglaettet = new Float64Array(m);
          const zyklisch = !f.sehne && !f.kinder.length;
          for (let k = 0; k < m; k++) {
            let summe = 0;
            let zahl = 0;
            for (let d = -SOLL_FENSTER; d <= SOLL_FENSTER; d++) {
              let j = k + d;
              if (zyklisch) j = ((j % m) + m) % m;
              else if (j < 0 || j >= m) continue;
              const v = s[j]!;
              if (!Number.isFinite(v)) continue;
              summe += v;
              zahl++;
            }
            geglaettet[k] = zahl ? summe / zahl : NaN;
          }
          soll = geglaettet;
        }
        const g = a === 'seite' ? new Float64Array(m) : tiefeGlaetten(l, hh, fe, !f.sehne && !f.kinder.length, soll);
        strecke.forEach((i, k) => d.set(i, g[k]!));
        strecke = [];
      };
      for (const e of el) {
        if (e.art === 'probe') strecke.push(e.i);
        else fertig();
      }
      fertig();
      tiefeJe.set(f.nr, d);
      grenzenJe.set(f.nr, grenzen);
      // Reichweite zum Betrachter (Top: oben = großes y, Front: vorn = kleines x) über die gezeichneten Proben der Fläche
      let nah = a === 'top' ? -Infinity : Infinity;
      let fern = a === 'top' ? Infinity : -Infinity;
      for (const [i] of d) {
        if (!fest[i]) continue;
        if (a === 'top') {
          nah = Math.max(nah, hi[i]!);
          fern = Math.min(fern, lo[i]!);
        } else {
          nah = Math.min(nah, lo[i]!);
          fern = Math.max(fern, hi[i]!);
        }
      }
      reichweite.set(f.nr, { nah, fern });
    }
    const naeher = (f: Flaeche, g: Flaeche) => {
      const rf = reichweite.get(f.nr)!;
      const rg = reichweite.get(g.nr)!;
      if (a === 'top') return rf.nah > rg.nah + 1e-9 || (Math.abs(rf.nah - rg.nah) <= 1e-9 && f.laenge < g.laenge);
      return rf.nah < rg.nah - 1e-9 || (Math.abs(rf.nah - rg.nah) <= 1e-9 && f.laenge < g.laenge);
    };
    const probe = (i: number, d: number, g?: [number, number]): PlanProbe => ({ p: punkt3(a, proben[i]!.q, d), q: proben[i]!.q, s: proben[i]!.s, art: 0, lo: g ? g[0] : lo[i]!, hi: g ? g[1] : hi[i]!, widerspruch: wid[i]! });
    // Vorschlag über eine Sehne (tangentenstetig an den Enden der eigenen Strecken); Tiefe interpoliert und in das nächste
    // erlaubte Intervall geklemmt — fehlt eines in Reichweite, rückt der Punkt zur Sehne hin, bis eines da ist
    const vorschlag = (von: number, bis: number, ta: V2, tb: V2, tiefeVon: number, tiefeBis: number, art: PlanArt): PlanProbe[] => {
      const qa = proben[von]!.q;
      const qb = proben[bis]!.q;
      const mitte = { x: (qa.x + qb.x) / 2, y: (qa.y + qb.y) / 2 };
      const pts = hermite(qa, ta, qb, tb);
      return pts.map((q0, k) => {
        const w = (k + 1) / (pts.length + 1);
        const soll = tiefeVon + w * (tiefeBis - tiefeVon);
        let q = q0;
        let t = soll;
        let l = NaN;
        let hh = NaN;
        for (let schritt = 0; schritt <= ZUG_SCHRITTE; schritt++) {
          const alle = tiefen(h, a, q);
          const ni = naechstesIntervall(alle, soll);
          const dist = ni >= 0 ? Math.max(0, alle[ni]![0] - soll, soll - alle[ni]![1]) : Infinity;
          if (dist <= SPRUNG || schritt === ZUG_SCHRITTE) {
            if (ni >= 0 && dist <= SPRUNG) {
              l = alle[ni]![0];
              hh = alle[ni]![1];
              t = Math.min(hh, Math.max(l, soll));
            } else q = q0;
            break;
          }
          const r = Math.hypot(mitte.x - q.x, mitte.y - q.y) || 1;
          q = { x: q.x + ((mitte.x - q.x) / r) * (1 / PX), y: q.y + ((mitte.y - q.y) / r) * (1 / PX) };
        }
        return { p: punkt3(a, q, t), q, s: -1, art, lo: l, hi: hh, widerspruch: 0 };
      });
    };
    const richtung = (von: number, nach: number): V2 => {
      const d = { x: proben[nach]!.q.x - proben[von]!.q.x, y: proben[nach]!.q.y - proben[von]!.q.y };
      const l = Math.hypot(d.x, d.y) || 1;
      return { x: d.x / l, y: d.y / l };
    };
    for (const s of sehnen) tStoesse.push({ ansicht: a, q: proben[s.a]!.q }, { ansicht: a, q: proben[s.b]!.q });
    for (const f of flaechen) {
      const el = laeufe.get(f.nr)!;
      const d = tiefeJe.get(f.nr)!;
      const gr = grenzenJe.get(f.nr)!;
      const liste: PlanProbe[] = [];
      let summe = 0;
      let zahl = 0;
      for (const e of el) {
        if (e.art === 'probe') {
          const t = d.get(e.i) ?? 0;
          liste.push(probe(e.i, t, gr.get(e.i)));
          if (fest[e.i]) {
            summe += t;
            zahl++;
          }
          continue;
        }
        // Tangenten aus den eigenen Nachbarproben der Fläche: am Anfang einlaufend, am Ende auslaufend
        const ta = richtung((e.von - 1 + n) % n, e.von);
        const tb = richtung(e.bis, (e.bis + 1) % n);
        const art: PlanArt = a === 'seite' ? 1 : naeher(f, e.nachbar) ? 2 : 1;
        liste.push(...vorschlag(e.von, e.bis, ta, tb, d.get(e.von) ?? 0, d.get(e.bis) ?? 0, art));
      }
      if (liste.length < 3) continue;
      schleifen.push({ ansicht: a, id: `${a}:${f.nr}`, teil: f.nr, proben: liste, tiefe: zahl ? summe / zahl : 0 });
    }
  }
  return { schleifen, tStoesse, widerspruch: widerspruchMax, skalierung: sk, ms: jetzt() - t0 };
}

/** Zahl der Krümmungswechsel der Tiefe längs einer Schleife (gezeichnete Proben, geschlossen). */
export function tiefenWechsel(s: PlanSchleife): number {
  const a = s.ansicht;
  const t = (p: V3) => (a === 'seite' ? p[2] : a === 'front' ? p[0] : p[1]);
  const pr = s.proben.filter((p) => p.art === 0);
  const n = pr.length;
  if (n < 5) return 0;
  // zweite Differenz über 3 Proben, Vorzeichenwechsel zählen (kleine Werte unter 0,05 px übergehen)
  let wechsel = 0;
  let letztes = 0;
  for (let i = 0; i < n; i++) {
    const k = t(pr[(i - 1 + n) % n]!.p) - 2 * t(pr[i]!.p) + t(pr[(i + 1) % n]!.p);
    const sgn = Math.abs(k) < 0.05 / PX ? 0 : Math.sign(k);
    if (sgn && letztes && sgn !== letztes) wechsel++;
    if (sgn) letztes = sgn;
  }
  return wechsel;
}

/** Blattkoordinaten eines 3D-Punkts (Umkehrung von `punkt3`; dieselben Achsen wie `inAnsicht2` der Blätter). */
export function blattKoord(a: Blatt, p: V3): V2 {
  return a === 'seite' ? { x: p[0], y: p[1] } : a === 'front' ? { x: p[2], y: p[1] } : { x: p[0], y: p[2] };
}

/** Lauf einer geplanten Schleife in einem Blatt: zusammenhängende Proben gleicher Art und Sichtbarkeit (Indizes in `proben`). */
export type PlanLauf = { indizes: number[]; sicht: boolean; art: PlanArt };

/**
 * Läufe einer Schleife (zyklisch über n Proben). Im eigenen Blatt (`eigenes`) zählen nur die Vorschläge — die gezeichneten
 * Proben sind die schwarze Linie; ein Vorschlag beginnt und endet auf der gezeichneten Nachbarprobe (am T-Stoß). In fremden
 * Blättern alle Proben, getrennt nach Sichtbarkeit und Art; aufeinanderfolgende Läufe teilen ihren Grenzpunkt (keine Lücke).
 * Blatt und SVG zerlegen damit gleich.
 */
export function planLaeufe(n: number, art: (i: number) => PlanArt, sicht: (i: number) => boolean, eigenes: boolean): PlanLauf[] {
  const out: PlanLauf[] = [];
  let akt: PlanLauf | null = null;
  const schliessen = () => {
    if (akt && akt.indizes.length >= 2) out.push(akt);
    akt = null;
  };
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    const a = art(k);
    if (eigenes && a === 0) {
      // gezeichnete Probe: kein Lauf; ein laufender Vorschlag endet auf ihr
      if (akt) {
        akt.indizes.push(k);
        schliessen();
      }
      if (i === n) break;
      continue;
    }
    const s = eigenes ? true : sicht(k);
    if (!akt || akt.sicht !== s || akt.art !== a) {
      const vorher: number = akt ? (akt as PlanLauf).indizes[(akt as PlanLauf).indizes.length - 1]! : eigenes && i > 0 ? (k - 1 + n) % n : -1;
      schliessen();
      akt = { indizes: vorher >= 0 ? [vorher] : [], sicht: s, art: a };
    }
    akt.indizes.push(k);
    if (i === n) break;
  }
  schliessen();
  return out;
}

/** Strichbild der Schleifen (Blatt und SVG gleich): verdeckte Fortsetzung blass, Ansatz gestrichelt; fremde Schleifen verdeckt gestrichelt. */
export const PLAN_STIL = {
  gezeichnet: { breite: 1.5 },
  verdeckt: { breite: 2, deckung: 0.3 },
  /** sichtbare Schlusskontur des näheren Teils über dem anderen (dünner als die Zeichnung, durchgezogen) */
  ansatz: { breite: 1.25, strich: undefined as string | undefined },
  fremd: { breite: 1.5, deckung: 0.9, verdecktBreite: 1.25, verdecktStrich: '3 4' },
} as const;

/** Zahl der Vorzeichenwechsel der zweiten Differenz einer offenen Folge (kleine Werte unter der Schwelle übergangen). */
function wechselZaehlen(t: readonly number[], schwelle: number): number {
  let wechsel = 0;
  let letztes = 0;
  for (let i = 1; i + 1 < t.length; i++) {
    const k = t[i - 1]! - 2 * t[i]! + t[i + 1]!;
    const sgn = Math.abs(k) < schwelle ? 0 : Math.sign(k);
    if (sgn && letztes && sgn !== letztes) wechsel++;
    if (sgn) letztes = sgn;
  }
  return wechsel;
}

/**
 * Krümmungswechsel der Tiefe je Stück zwischen Kreuzungen (Tor P1 Tag 1 b: höchstens zwei). Kreuzungen einer Front- oder
 * Top-Schleife: die Naht (Nulldurchgang der Blattkoordinate quer zur Mittelebene) und die Umrissschleife der dritten
 * Ansicht (Extrema dieser Koordinate, die breiteste Stelle). Alle Proben zählen, auch Vorschläge; Seite: keine Stücke.
 */
export function tiefenWechselStuecke(s: PlanSchleife): number[] {
  if (s.ansicht === 'seite') return [];
  const n = s.proben.length;
  if (n < 5) return [];
  const quer = (p: PlanProbe) => (s.ansicht === 'front' ? p.q.x : p.q.y);
  const tiefe = (p: PlanProbe) => (s.ansicht === 'front' ? p.p[0] : p.p[1]);
  // Nulldurchgänge der Querkoordinate (Naht), dazwischen je Hälfte die breiteste Stelle (Umriss der dritten Ansicht)
  const naht: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = quer(s.proben[(i - 1 + n) % n]!);
    const b = quer(s.proben[i]!);
    if ((b >= 0 && a < 0) || (b <= 0 && a > 0)) naht.push(i);
  }
  const kreuz: number[] = [];
  for (let k = 0; k < naht.length; k++) {
    const von = naht[k]!;
    const bis = naht[(k + 1) % naht.length]!;
    kreuz.push(von);
    let best = von;
    for (let i = von; i !== bis; i = (i + 1) % n) if (Math.abs(quer(s.proben[i]!)) > Math.abs(quer(s.proben[best]!))) best = i;
    if (best !== von && best !== bis) kreuz.push(best);
  }
  if (kreuz.length < 2) return [wechselZaehlen(s.proben.map(tiefe), 0.05 / PX)];
  const out: number[] = [];
  for (let k = 0; k < kreuz.length; k++) {
    const von = kreuz[k]!;
    const bis = kreuz[(k + 1) % kreuz.length]!;
    const t: number[] = [];
    for (let i = von; ; i = (i + 1) % n) {
      t.push(tiefe(s.proben[i]!));
      if (i === bis) break;
    }
    out.push(wechselZaehlen(t, 0.05 / PX));
  }
  return out;
}

export type SvgOptionen = {
  /** Pixel je Welteinheit (Standard 461 wie die Blätter) */
  px?: number;
  /** Rand in px */
  rand?: number;
  /** fremde Schleifen (Umrisse der anderen Ansichten) als Konstruktionslinien mit zeichnen (grau) */
  fremde?: boolean;
};

/**
 * Das Blatt als SVG — die Vektor-Ausgabe (Tor P1 Tag 1 d: dasselbe Bild wie das Blatt). Die gezeichnete Umrisslinie als
 * kubische Kurven (schwarz), die Vorschläge der eigenen Schleifen (verdeckte Fortsetzung blass, Ansatz gestrichelt) als
 * Linienzüge aus denselben Läufen wie im Blatt (`planLaeufe`), auf Wunsch die fremden Schleifen grau. y wie im Blatt nach
 * oben (Spiegelung in der Abbildung). Eingabe in Profil-Einheiten × `plan.skalierung`; der Rahmen steht in den Attributen
 * `data-px`, `data-x0`, `data-y1`, `data-rand` (Umkehrung: x = (X − rand) / px + x0, y = y1 − (Y − rand) / px).
 */
export function umrissSvg(dok: Dokument, plan: UmrissPlan, blatt: Blatt, opt: SvgOptionen = {}): string {
  const px = opt.px ?? PX;
  const rand = opt.rand ?? 12;
  const sk = plan.skalierung;
  const segs = vollerPfad(dok.profile[blatt]);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const nimm = (q: V2) => {
    x0 = Math.min(x0, q.x);
    y0 = Math.min(y0, q.y);
    x1 = Math.max(x1, q.x);
    y1 = Math.max(y1, q.y);
  };
  for (const s of segs) for (const c of s) nimm({ x: c.x * sk, y: c.y * sk });
  const eigene = plan.schleifen.filter((s) => s.ansicht === blatt);
  const fremde = opt.fremde ? plan.schleifen.filter((s) => s.ansicht !== blatt) : [];
  for (const s of [...eigene, ...fremde]) for (const pr of s.proben) nimm(blattKoord(blatt, pr.p));
  if (!Number.isFinite(x0)) return '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"></svg>';
  const B = (x1 - x0) * px + 2 * rand;
  const H = (y1 - y0) * px + 2 * rand;
  const X = (x: number) => ((x - x0) * px + rand).toFixed(2);
  const Y = (y: number) => ((y1 - y) * px + rand).toFixed(2);
  const pfade: string[] = [];
  if (segs.length) {
    let d = `M${X(segs[0]![0].x * sk)} ${Y(segs[0]![0].y * sk)}`;
    for (const s of segs) d += `C${X(s[1].x * sk)} ${Y(s[1].y * sk)} ${X(s[2].x * sk)} ${Y(s[2].y * sk)} ${X(s[3].x * sk)} ${Y(s[3].y * sk)}`;
    pfade.push(`<path data-art="umriss" d="${d}Z" fill="none" stroke="#000" stroke-width="${PLAN_STIL.gezeichnet.breite}" stroke-linejoin="round"/>`);
  }
  const zug = (s: PlanSchleife, l: PlanLauf) =>
    l.indizes
      .map((k, m) => {
        const q = blattKoord(blatt, s.proben[k]!.p);
        return `${m ? 'L' : 'M'}${X(q.x)} ${Y(q.y)}`;
      })
      .join('');
  for (const s of eigene) {
    for (const l of planLaeufe(s.proben.length, (i) => s.proben[i]!.art, () => true, true)) {
      const stil = l.art === 1 ? `stroke-width="${PLAN_STIL.verdeckt.breite}" stroke-opacity="${PLAN_STIL.verdeckt.deckung}"` : `stroke-width="${PLAN_STIL.ansatz.breite}"${PLAN_STIL.ansatz.strich ? ` stroke-dasharray="${PLAN_STIL.ansatz.strich}"` : ''}`;
      pfade.push(`<path data-art="${l.art === 1 ? 'verdeckt' : 'ansatz'}" data-schleife="${s.id}" d="${zug(s, l)}" fill="none" stroke="#000" ${stil} stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  }
  // fremde Schleifen: ihre Sichtbarkeit kennt nur der Körper (Liniennetz) — hier ganz, als Konstruktionslinie
  for (const s of fremde) {
    for (const l of planLaeufe(s.proben.length, (i) => s.proben[i]!.art, () => true, false)) {
      pfade.push(`<path data-art="fremd" data-schleife="${s.id}" d="${zug(s, l)}" fill="none" stroke="#888" stroke-width="${PLAN_STIL.fremd.verdecktBreite}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${B.toFixed(0)}" height="${H.toFixed(0)}" viewBox="0 0 ${B.toFixed(2)} ${H.toFixed(2)}" data-blatt="${blatt}" data-px="${px}" data-x0="${x0}" data-y1="${y1}" data-rand="${rand}">${pfade.join('')}</svg>`;
}
