// Plan „Formgerechte Topologie“ (16.10.2026), Beweis 1: Ansatz eines Asts als Knoten. Der Wirbelsäulen-Baum entsteht aus
// der Zerlegung der Seite (`zerlegung.ts`): Der Rumpf bekommt seine eigene Wirbelsäule (Umriss mit Brücke unter jedem Ast),
// jeder Ast wächst aus einem Fenster im Rumpf. Anders als der angehaltene Schritt 3 (`baum.ts`):
// - Das Fenster deckt den Fußabdruck des Asts: Ringe unter der Brücke, Spalten bis zur Breite des Asts am Ansatz (Front).
// - Der Ast wird über die Sehne hinaus in den Rumpf verlängert abgeleitet; so sind seine Ringe am Ansatz reguläre Sprossen
//   zwischen seinen beiden Linien (keine Kappe, kein Fächer an der Sehne).
// - Der erste Astring ist der erste, der ganz außerhalb des Rumpfs liegt; zwischen Fensterrand und ihm liegen Übergangsringe
//   auf einer Hohlkehle (kubische Kurve je Spalte: am Rumpf tangential zur Rumpffläche, am Ast entlang der Astlinie).
// Gelöst wird das ganze Netz mit der Naht auf dem vollen Seitenumriss. Ohne Äste: `ableiten` (bitgleich). DOM-frei.
import type { V2 } from '../../bezier';
import type { Dokument } from '../../dokument';
import { pfadAbtasten, vollerPfad } from '../../profil';
import { type V3, alleFlaechen, kaefigAusFlaechen, kanteZwischen, pruefeKaefig } from '../../kaefig/halbkanten';
import { type Roehre, roehre } from '../../kaefig/roehre';
import { ABLEIT_STANDARD, type AbleitOptionen, type Ableitung, ableiten, faltenSetzen, fertigstellen, kernLeiter, stationenWaehlen, zieleBerechnen } from '../ableiten';
import { silhouettenBreite } from '../breite';
import { feldRechteck, innenPoly, profilAusUmriss, teilDokument } from './baum';
import { rumpfDokument } from './teilBau';
import { type ZerlegterAst, type Zerlegung, seiteZerlegen } from './zerlegung';

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Verlängerung des Asts in den Rumpf (Anteil der Sehnenlänge) */
const VERLAENGERUNG = 0.6;
/** Abstand des ersten Astrings vom Rumpf (Anteil des Ringabstands des Rumpfs an der Naht) */
const MARGE = 0.3;
/** Ringe, über die die Verteilung des Fensterrands in die eigene des Asts übergeht */
const AUSLAUF = 4;
/** Henkel der Hohlkehle (Anteil des Abstands Fensterrand → erster Astring) */
const HENKEL = 0.4;

export type KnotenInfo = {
  art: ZerlegterAst['art'];
  fenster: { i0: number; i1: number; spalte: number; b: number };
  punkteJeRing: number;
  /** Übergangsringe (Hohlkehle) und behaltene Astringe */
  uebergang: number;
  ringe: number;
  /** übersprungene Astringe am Ansatz (im Rumpf) */
  ab: number;
};
export type KnotenErgebnis = Ableitung & { zerlegung: Zerlegung; knoten: KnotenInfo[] };

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));

/** Hermite-Brücke von P0 nach P1 (ohne die Enden) mit den Richtungen m0, m1 (Länge = Sehne). */
function brueckenKurve(P0: V2, P1: V2, vor: V2, nach: V2): V2[] {
  const L = Math.hypot(P1.x - P0.x, P1.y - P0.y);
  const richt = (p: V2, q: V2) => {
    const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    return { x: ((q.x - p.x) / l) * L, y: ((q.y - p.y) / l) * L };
  };
  const m0 = richt(vor, P0);
  const m1 = richt(P1, nach);
  const out: V2[] = [];
  const m = Math.max(8, Math.round(L / 0.004));
  for (let t = 1; t < m; t++) {
    const u = t / m;
    const h00 = 2 * u * u * u - 3 * u * u + 1;
    const h10 = u * u * u - 2 * u * u + u;
    const h01 = -2 * u * u * u + 3 * u * u;
    const h11 = u * u * u - u * u;
    out.push({ x: h00 * P0.x + h10 * m0.x + h01 * P1.x + h11 * m1.x, y: h00 * P0.y + h10 * m0.y + h01 * P1.y + h11 * m1.y });
  }
  return out;
}

/** Rumpfumriss: die Sehne jedes Asts durch eine Brücke ersetzt; dazu je Ast die Brückenpunkte (für die Fensterwahl). */
function rumpfMitBruecken(z: Zerlegung): { umriss: V2[]; bruecken: V2[][] } {
  let poly = z.rumpf.umriss.slice();
  const bruecken: V2[][] = [];
  const gleich = (p: V2, q: V2) => Math.abs(p.x - q.x) < 1e-12 && Math.abs(p.y - q.y) < 1e-12;
  for (const a of z.aeste) {
    const n = poly.length;
    let fertig = false;
    for (let i = 0; i < n && !fertig; i++) {
      const j = (i + 1) % n;
      const passt = (gleich(poly[i]!, a.schnitt[0]) && gleich(poly[j]!, a.schnitt[1])) || (gleich(poly[i]!, a.schnitt[1]) && gleich(poly[j]!, a.schnitt[0]));
      if (!passt) continue;
      const kurve = brueckenKurve(poly[i]!, poly[j]!, poly[(i - 1 + n) % n]!, poly[(j + 1) % n]!);
      poly = [...poly.slice(0, i + 1), ...kurve, ...poly.slice(i + 1)];
      bruecken.push([poly[i]!, ...kurve, poly[(i + 1 + kurve.length) % poly.length]!]);
      fertig = true;
    }
    if (!fertig) bruecken.push([]);
  }
  return { umriss: poly, bruecken };
}

/**
 * Ast-Umriss über die Sehne hinaus verlängert: an beiden Sehnenenden die Astlinie geradeaus weiter (Richtung über ein
 * kurzes Stück gemittelt), dann eine Brücke zwischen den verlängerten Enden. Die Ringe des Asts am Ansatz sind damit
 * Sprossen zwischen seinen beiden Linien statt einer Kappe.
 */
function astVerlaengert(a: ZerlegterAst): V2[] {
  const u = a.umriss;
  const n = u.length;
  const E0 = u[0]!;
  const E1 = u[n - 1]!;
  const sehne = Math.hypot(E1.x - E0.x, E1.y - E0.y);
  const richtung = (von: V2, schritt: 1 | -1, start: number): V2 => {
    // Mittel der Richtung über ein Stück von 0,3 Sehnen
    let k = start;
    while (k + schritt >= 0 && k + schritt < n && Math.hypot(u[k]!.x - von.x, u[k]!.y - von.y) < 0.3 * sehne) k += schritt;
    const q = u[k]!;
    const l = Math.hypot(von.x - q.x, von.y - q.y) || 1;
    return { x: (von.x - q.x) / l, y: (von.y - q.y) / l };
  };
  const d0 = richtung(E0, 1, 0);
  const d1 = richtung(E1, -1, n - 1);
  let e = VERLAENGERUNG * sehne;
  // Die Verlängerungen dürfen sich nicht kreuzen
  for (let k = 0; k < 6; k++) {
    const A0 = { x: E0.x + d0.x * e, y: E0.y + d0.y * e };
    const A1 = { x: E1.x + d1.x * e, y: E1.y + d1.y * e };
    const kreuz = (p: V2, q: V2, r: V2, s: V2) => {
      const d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
      if (Math.abs(d) < 1e-15) return false;
      const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
      const v = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
      return t > 0 && t < 1 && v > 0 && v < 1;
    };
    if (!kreuz(E0, A0, E1, A1) && Math.hypot(A1.x - A0.x, A1.y - A0.y) > 0.3 * sehne) break;
    e *= 0.6;
  }
  const A0 = { x: E0.x + d0.x * e, y: E0.y + d0.y * e };
  const A1 = { x: E1.x + d1.x * e, y: E1.y + d1.y * e };
  // Polygon: A0, E0 … E1, A1, Brücke A1 → A0
  const vor = { x: A1.x - d1.x, y: A1.y - d1.y };
  const nach = { x: A0.x - d0.x, y: A0.y - d0.y };
  return [A0, ...u, A1, ...brueckenKurve(A1, A0, vor, nach)];
}

/** Abstand Punkt → Polygonzug (geschlossen). */
function abstandZumUmriss(poly: readonly V2[], q: V2): number {
  let d = Infinity;
  for (let i = 0, n = poly.length; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((q.x - a.x) * abx + (q.y - a.y) * aby) / (abx * abx + aby * aby || 1)));
    d = Math.min(d, Math.hypot(a.x + abx * t - q.x, a.y + aby * t - q.y));
  }
  return d;
}

/** Halbe Breite des Rumpfs bei (x, y) aus seinen Ringzielen: je Ring die Breite auf Höhe y, zwischen den zwei nächsten Sprossen gemittelt. */
function rumpfBreite(v: Roehre, ziele: Float64Array): (x: number, y: number) => number {
  const { R, N } = v;
  const P = (p: number): V3 => [ziele[3 * p]!, ziele[3 * p + 1]!, ziele[3 * p + 2]!];
  const ringe = Array.from({ length: R }, (_, i) => {
    const halb: V3[] = [];
    for (let j = 0; j <= N / 2; j++) halb.push(P(v.ringPunkt(i, j)));
    return { o: halb[0]!, u: halb[N / 2]!, halb };
  });
  const breiteImRing = (i: number, y: number) => {
    const h = ringe[i]!.halb;
    let w = 0;
    for (let j = 0; j + 1 < h.length; j++) {
      const a = h[j]!;
      const b = h[j + 1]!;
      if ((a[1] - y) * (b[1] - y) > 0) continue;
      const f = Math.abs(b[1] - a[1]) > 1e-12 ? (y - a[1]) / (b[1] - a[1]) : 0.5;
      w = Math.max(w, Math.abs(a[2] + (b[2] - a[2]) * f));
    }
    return w;
  };
  const sprossenAbstand = (i: number, x: number, y: number) => {
    const { o, u } = ringe[i]!;
    const abx = u[0] - o[0];
    const aby = u[1] - o[1];
    const t = Math.max(0, Math.min(1, ((x - o[0]) * abx + (y - o[1]) * aby) / (abx * abx + aby * aby || 1)));
    return Math.hypot(o[0] + abx * t - x, o[1] + aby * t - y);
  };
  return (x, y) => {
    let i1 = -1;
    let d1 = Infinity;
    for (let i = 0; i < R; i++) {
      const d = sprossenAbstand(i, x, y);
      if (d < d1) {
        d1 = d;
        i1 = i;
      }
    }
    if (i1 < 0) return 0;
    // Nachbarring auf der anderen Seite des Punkts
    const nb = [i1 - 1, i1 + 1].filter((i) => i >= 0 && i < R);
    let i2 = -1;
    let d2 = Infinity;
    for (const i of nb) {
      const d = sprossenAbstand(i, x, y);
      if (d < d2) {
        d2 = d;
        i2 = i;
      }
    }
    const w1 = breiteImRing(i1, y);
    if (i2 < 0 || d1 + d2 < 1e-12) return w1;
    return (w1 * d2 + breiteImRing(i2, y) * d1) / (d1 + d2);
  };
}

/** Rohbau eines Röhrenteils (Leiter, Stationen, Falten, Ziele) — wie `ableiten` ohne Löser. */
function rohteil(dok: Dokument, opt: AbleitOptionen) {
  const l = kernLeiter(dok);
  const breiten = silhouettenBreite(dok);
  const v = roehre(opt.ringe, opt.ring);
  const st = stationenWaehlen(l, opt, dok);
  faltenSetzen(v, st, l, dok, breiten, opt);
  const roh = zieleBerechnen(v, l, st, breiten, dok, opt);
  return { l, breiten, v, st, roh };
}

/** Bogenlängen-Anteile eines geschlossenen Zugs ab Index `ab` (Anteil je Punkt, ab-Punkt = 0). */
function anteileAb(pos: readonly V3[], ab: number): number[] {
  const M = pos.length;
  const L: number[] = [0];
  for (let k = 1; k <= M; k++) L.push(L[k - 1]! + len(sub(pos[(ab + k) % M]!, pos[(ab + k - 1) % M]!)));
  const g = L[M]! || 1;
  const out = new Array<number>(M);
  for (let k = 0; k < M; k++) out[(ab + k) % M] = L[k]! / g;
  return out;
}

/** Punkt bei Anteil f auf dem geschlossenen Zug `pos` (Anteile `ant` ab Index `ab`). */
function beiAnteil(pos: readonly V3[], ant: readonly number[], ab: number, f: number): V3 {
  const M = pos.length;
  for (let k = 0; k < M; k++) {
    const a = (ab + k) % M;
    const b = (ab + k + 1) % M;
    const fa = ant[a]!;
    const fb = k + 1 === M ? 1 : ant[b]!;
    if (f <= fb || k + 1 === M) {
      const t = fb > fa ? Math.min(1, Math.max(0, (f - fa) / (fb - fa))) : 0;
      return add(pos[a]!, mul(sub(pos[b]!, pos[a]!), t));
    }
  }
  return pos[ab]!;
}

/**
 * Wirbelsäulen-Baum mit Knoten-Ansätzen (Beweis 1). Ohne Äste in der Seite: `ableiten` unverändert.
 */
export function knotenAbleiten(dok: Dokument, optionen: Partial<AbleitOptionen> = {}): KnotenErgebnis {
  const sk = dok.skalierung;
  const poly = pfadAbtasten(vollerPfad(dok.profile.seite), 32).map((p) => ({ x: p.x * sk, y: p.y * sk }));
  const zerlegung = seiteZerlegen(poly);
  if (!zerlegung.aeste.length) return { ...ableiten(dok, optionen), zerlegung, knoten: [] };
  const opt = { ...ABLEIT_STANDARD, ...optionen };
  const t0 = jetzt();
  const { umriss: rumpfUmriss, bruecken } = rumpfMitBruecken(zerlegung);
  const rumpfDok = teilDokument(rumpfDokument(dok), profilAusUmriss(rumpfUmriss, sk));
  const t1 = jetzt();
  const rumpf = rohteil(rumpfDok, opt);
  const t2 = jetzt();
  const { v, roh } = rumpf;
  const { N, R } = v;
  const P = (i: number): V3 => [roh.ziele[3 * i]!, roh.ziele[3 * i + 1]!, roh.ziele[3 * i + 2]!];
  const wRumpf = rumpfBreite(v, roh.ziele);
  const flaechenAlt = alleFlaechen(v.kaefig).map((f) => [...f]);
  const schluessel = (f: readonly number[]) => [...f].sort((x, y) => x - y).join(',');
  const entfernen = new Set<string>();
  const neueFlaechen: number[][] = [];
  const zielNeu: V3[] = [];
  const hoeheNeu: number[] = [];
  let naechster = v.kaefig.n;
  const knoten: KnotenInfo[] = [];
  const scharfAst: { a: number; b: number; s: number }[] = [];
  const ohneHaut = new Set<number>();
  // Ringabstand des Rumpfs an der Naht (Median) als Maß für Marge und Übergang
  const abst: number[] = [];
  for (let i = 0; i + 1 < R; i++) abst.push(len(sub(P(v.ringPunkt(i + 1, 0)), P(v.ringPunkt(i, 0)))), len(sub(P(v.ringPunkt(i + 1, N / 2)), P(v.ringPunkt(i, N / 2)))));
  abst.sort((a, b) => a - b);
  const hR = abst[Math.floor(abst.length / 2)]!;

  zerlegung.aeste.forEach((ast, astNr) => {
    const bruecke = bruecken[astNr]!;
    if (bruecke.length < 2) return;
    const A = ast.schnitt[0];
    const B = ast.schnitt[1];
    const mitte = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    // Naht-Spalte: oben (0) oder unten (N/2), je nachdem, welche Naht der Sehne näher liegt
    let dOben = Infinity;
    let dUnten = Infinity;
    for (let i = 0; i < R; i++) {
      const o = P(v.ringPunkt(i, 0));
      const u = P(v.ringPunkt(i, N / 2));
      dOben = Math.min(dOben, Math.hypot(o[0] - mitte.x, o[1] - mitte.y));
      dUnten = Math.min(dUnten, Math.hypot(u[0] - mitte.x, u[1] - mitte.y));
    }
    const spalte = dOben <= dUnten ? 0 : N / 2;
    // Fensterringe: Nahtpunkt auf der Brücke (Bogenlänge auf der Brücke zwischen 10 % und 90 %)
    const bL: number[] = [0];
    for (let k = 1; k < bruecke.length; k++) bL.push(bL[k - 1]! + Math.hypot(bruecke[k]!.x - bruecke[k - 1]!.x, bruecke[k]!.y - bruecke[k - 1]!.y));
    const bGes = bL[bL.length - 1]!;
    const aufBruecke = (q: V3): boolean => {
      let best = Infinity;
      let s = 0;
      for (let k = 0; k + 1 < bruecke.length; k++) {
        const a = bruecke[k]!;
        const b = bruecke[k + 1]!;
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((q[0] - a.x) * abx + (q[1] - a.y) * aby) / (abx * abx + aby * aby || 1)));
        const d = Math.hypot(a.x + abx * t - q[0], a.y + aby * t - q[1]);
        if (d < best) {
          best = d;
          s = bL[k]! + t * (bL[k + 1]! - bL[k]!);
        }
      }
      return best < 0.25 * hR && s > 0.1 * bGes && s < 0.9 * bGes;
    };
    const innen: number[] = [];
    for (let i = 1; i < R - 1; i++) if (aufBruecke(P(v.ringPunkt(i, spalte)))) innen.push(i);
    let i0: number;
    let i1: number;
    if (innen.length) {
      i0 = Math.max(1, innen[0]! - 1);
      i1 = Math.min(R - 2, innen[innen.length - 1]! + 1);
    } else {
      // keine Ringmitte auf der Brücke: die zwei Ringe um die Sehnenmitte
      let best = 1;
      for (let i = 1; i < R - 1; i++) if (Math.hypot(P(v.ringPunkt(i, spalte))[0] - mitte.x, P(v.ringPunkt(i, spalte))[1] - mitte.y) < Math.hypot(P(v.ringPunkt(best, spalte))[0] - mitte.x, P(v.ringPunkt(best, spalte))[1] - mitte.y)) best = i;
      i0 = Math.max(1, best - 1);
      i1 = Math.min(R - 2, best + 1);
    }
    // Breite des Asts am Ansatz: Front auf der Höhe der Sehnenmitte
    const astDokRoh = teilDokument(dok, profilAusUmriss(astVerlaengert(ast), sk));
    const breitenAst = silhouettenBreite(astDokRoh);
    const wAst = Math.max(1e-4, breitenAst.front(mitte.y) > 0 ? breitenAst.front(mitte.y) : 0.5 * Math.hypot(B.x - A.x, B.y - A.y));
    // Spalten: kleinstes b, bei dem die Rumpfspalte am mittleren Fensterring mindestens so breit liegt wie der Ast
    const iMitte = Math.round((i0 + i1) / 2);
    let b = 1;
    while (b < N / 4 - 1 && Math.abs(P(v.ringPunkt(iMitte, spalte + b))[2]) < wAst) b++;
    // Punkte je Ring durch 8 teilbar (Kappe des Asts mit gerader Kantenzahl): Δi + 2b durch 4 teilbar; das Fenster wächst
    // dafür um Ringe (abwechselnd hinten und vorn), höchstens um 3
    for (let k = 0; (i1 - i0 + 2 * b) % 4 !== 0 && k < 6; k++) {
      if (k % 2 === 0 && i1 + 1 < R - 1) i1++;
      else if (i0 - 1 > 0) i0--;
      else if (i1 + 1 < R - 1) i1++;
    }
    if ((i1 - i0 + 2 * b) % 4 !== 0) return;
    const M = 2 * (i1 - i0 + 2 * b);
    const feld = feldRechteck(v, i0, i1, spalte - b, spalte + b);
    for (const k of feld.flaechen) {
      if (entfernen.has(k)) return; // überlappt ein anderes Fenster
    }
    for (const k of feld.flaechen) entfernen.add(k);
    // Ast mit M Punkten je Ring (verlängert in den Rumpf)
    const optA = { ...opt, ring: M };
    const ast0 = rohteil(astDokRoh, optA);
    const vA = ast0.v;
    const rohA = ast0.roh;
    const PA = (i: number): V3 => [rohA.ziele[3 * i]!, rohA.ziele[3 * i + 1]!, rohA.ziele[3 * i + 2]!];
    const ringMitte = (r: number): V3 => {
      let s: V3 = [0, 0, 0];
      for (let j = 0; j < M; j++) s = add(s, PA(vA.ringPunkt(r, j)));
      return mul(s, 1 / M);
    };
    // Basis: das Ende, dessen Ring der Sehnenmitte näher liegt
    const basisVorn = Math.hypot(ringMitte(0)[0] - mitte.x, ringMitte(0)[1] - mitte.y) <= Math.hypot(ringMitte(vA.R - 1)[0] - mitte.x, ringMitte(vA.R - 1)[1] - mitte.y);
    const folge = Array.from({ length: vA.R }, (_, k) => (basisVorn ? k : vA.R - 1 - k));
    // erster Astring außerhalb des Rumpfs (mit Marge): jeder Ringpunkt außerhalb des Rumpfumrisses oder seitlich außerhalb
    const marge = MARGE * hR;
    const aussen = (q: V3): boolean => {
      const p2 = { x: q[0], y: q[1] };
      if (!innenPoly(rumpfUmriss, p2)) return abstandZumUmriss(rumpfUmriss, p2) >= marge || Math.abs(q[2]) >= marge;
      return Math.abs(q[2]) >= wRumpf(q[0], q[1]) + marge;
    };
    let kStart = 0;
    while (kStart < folge.length - 3) {
      const r = folge[kStart]!;
      let ok = true;
      for (let j = 0; j < M && ok; j++) ok = aussen(PA(vA.ringPunkt(r, j)));
      if (ok) break;
      kStart++;
    }
    const behalten = folge.slice(kStart);
    // Zuordnung: Nahtpunkt des Fensterrands (i0, Spalte) ↔ nächster Nahtpunkt des ersten Astrings, Umlauf nach der z-Seite
    const iS0 = b;
    const r0 = behalten[0]!;
    const randPos = feld.rand.map((i) => P(i));
    const nahtA = [vA.ringPunkt(r0, 0), vA.ringPunkt(r0, M / 2)];
    const jS = len(sub(PA(nahtA[0]!), randPos[iS0]!)) <= len(sub(PA(nahtA[1]!), randPos[iS0]!)) ? 0 : M / 2;
    const zR = randPos[(iS0 + 1) % M]![2];
    const zA = PA(vA.ringPunkt(r0, jS + 1))[2];
    const s = Math.sign(zR) === Math.sign(zA) ? 1 : -1;
    const astIndex = (q: number) => (((jS + s * (q - iS0)) % M) + M) % M; // Randindex q → Astring-Spalte
    const randAnteile = anteileAb(randPos, iS0);
    // behaltene Ringe: M Punkte in Randreihenfolge; Verteilung vom Fensterrand in die eigene über AUSLAUF Ringe
    const ringPos: V3[][] = [];
    const ringHoehe: number[][] = [];
    for (const [kr, r] of behalten.entries()) {
      const roh0 = Array.from({ length: M }, (_, q) => PA(vA.ringPunkt(r, astIndex(q))));
      const eigen = anteileAb(roh0, iS0);
      const w = Math.max(0, 1 - kr / AUSLAUF);
      ringPos.push(Array.from({ length: M }, (_, q) => beiAnteil(roh0, eigen, iS0, w * randAnteile[q]! + (1 - w) * eigen[q]!)));
      ringHoehe.push(Array.from({ length: M }, (_, q) => rohA.hoehe[vA.ringPunkt(r, astIndex(q))] ?? 0));
    }
    // Hohlkehle: je Spalte eine kubische Kurve vom Fensterrand (tangential zum Rumpf, ins Fenster) zum ersten Astring
    // (entlang der Astlinie); Anzahl der Übergangsringe nach dem größten Abstand
    const innenNachbar = (q: number): number => {
      // Punkt des Fensters, der vom Randpunkt q ins Innere führt (Ecken: diagonal)
      const p = feld.rand[q]!;
      const i = Math.floor(p / N);
      const j = p - i * N;
      const di = i === i0 ? 1 : i === i1 ? -1 : 0;
      const jRel = (((j - (spalte - b)) % N) + N) % N;
      const dj = jRel === 0 ? 1 : jRel === 2 * b ? -1 : 0;
      return v.ringPunkt(i + di, j + dj);
    };
    let dMax = 0;
    for (let q = 0; q < M; q++) dMax = Math.max(dMax, len(sub(ringPos[0]![q]!, randPos[q]!)));
    const T = Math.max(1, Math.min(3, Math.round(dMax / hR) - 1));
    const uebergang: V3[][] = Array.from({ length: T }, () => new Array<V3>(M));
    for (let q = 0; q < M; q++) {
      const p0 = randPos[q]!;
      const p3 = ringPos[0]![q]!;
      const d = len(sub(p3, p0));
      const tR = norm(sub(P(innenNachbar(q)), p0));
      const tA = ringPos.length > 1 ? norm(sub(ringPos[1]![q]!, p3)) : norm(sub(p3, p0));
      const p1 = add(p0, mul(tR, HENKEL * d));
      const p2 = sub(p3, mul(tA, HENKEL * d));
      for (let k = 1; k <= T; k++) {
        const t = k / (T + 1);
        const a = (1 - t) ** 3;
        const bb = 3 * t * (1 - t) ** 2;
        const c = 3 * t * t * (1 - t);
        const dd = t ** 3;
        uebergang[k - 1]![q] = add(add(mul(p0, a), mul(p1, bb)), add(mul(p2, c), mul(p3, dd)));
      }
    }
    // neue Punkte: Übergangsringe, dann behaltene Ringe
    const ringeNeu: number[][] = [];
    const neuerRing = (pos: readonly V3[], hoehe: readonly number[]) => {
      const ring: number[] = [];
      for (let q = 0; q < M; q++) {
        ring.push(naechster++);
        zielNeu.push(pos[q]!);
        hoeheNeu.push(hoehe[q]!);
      }
      ringeNeu.push(ring);
    };
    for (let k = 0; k < T; k++) neuerRing(uebergang[k]!, ringHoehe[0]!);
    for (let k = 0; k < ringPos.length; k++) neuerRing(ringPos[k]!, ringHoehe[k]!);
    // Falten des Asts (Längsfalten an Ecken) auf die neuen Kanten übertragen
    for (let k = 0; k + 1 < behalten.length; k++)
      for (let q = 0; q < M; q++) {
        const e = kanteZwischen(vA.kaefig, vA.ringPunkt(behalten[k]!, astIndex(q)), vA.ringPunkt(behalten[k + 1]!, astIndex(q)));
        const sch = e >= 0 ? vA.kaefig.eSchaerfe[e]! : 0;
        if (sch > 0) scharfAst.push({ a: ringeNeu[T + k]![q]!, b: ringeNeu[T + k + 1]![q]!, s: sch });
      }
    // Umlaufsinn aus der Rumpffläche am Rand
    let richtung = 1;
    for (const f of flaechenAlt) {
      if (entfernen.has(schluessel(f))) continue;
      const a0 = f.indexOf(feld.rand[0]!);
      const a1 = f.indexOf(feld.rand[1]!);
      if (a0 < 0 || a1 < 0) continue;
      richtung = (a0 + 1) % f.length === a1 ? -1 : 1;
      break;
    }
    const Rg = (k: number, q: number) => (k === 0 ? feld.rand[q % M]! : ringeNeu[k - 1]![q % M]!);
    for (let k = 0; k < ringeNeu.length; k++)
      for (let q = 0; q < M; q++) {
        const f = [Rg(k, q), Rg(k, q + 1), Rg(k + 1, q + 1), Rg(k + 1, q)];
        neueFlaechen.push(richtung > 0 ? f : f.reverse());
      }
    // Kappe an der Spitze: die eigene Kappe des Asts, ihr Rand ist der letzte Ring
    const letzter = ringeNeu[ringeNeu.length - 1]!;
    const spitzeRing = behalten[behalten.length - 1]!;
    const spitzeSeite: 'vorn' | 'hinten' = spitzeRing === 0 ? 'vorn' : 'hinten';
    const ringZuQ = (j: number) => (((iS0 + s * (j - jS)) % M) + M) % M; // Astring-Spalte → Randindex
    const kappeNeu = new Map<number, number>();
    for (let a = 1; a < vA.c; a++)
      for (let c = 1; c < vA.c; c++) {
        const alt = vA.kappe(spitzeSeite, a, c);
        const idx = naechster++;
        kappeNeu.set(alt, idx);
        zielNeu.push(PA(alt));
        hoeheNeu.push(rohA.hoehe[alt] ?? 0);
      }
    const abbild = (alt: number): number => {
      const k = kappeNeu.get(alt);
      if (k !== undefined) return k;
      const ring = Math.floor(alt / M);
      if (ring === spitzeRing && alt < vA.R * M) return letzter[ringZuQ(alt - ring * M)]!;
      return -1;
    };
    const kappenFlaechen: number[][] = [];
    for (const f of alleFlaechen(vA.kaefig)) {
      if (!f.some((x) => kappeNeu.has(x))) continue;
      const g = f.map(abbild);
      if (g.some((x) => x < 0)) continue;
      kappenFlaechen.push(g);
    }
    const roehrenKante = new Set<string>();
    for (let q = 0; q < M; q++) {
      const f = [Rg(ringeNeu.length - 1, q), Rg(ringeNeu.length - 1, q + 1), Rg(ringeNeu.length, q + 1), Rg(ringeNeu.length, q)];
      const g = richtung > 0 ? f : f.slice().reverse();
      for (let t = 0; t < 4; t++) roehrenKante.add(`${g[t]},${g[(t + 1) % 4]}`);
    }
    let gleichlaeufig = false;
    for (const f of kappenFlaechen) for (let t = 0; t < f.length; t++) if (roehrenKante.has(`${f[t]},${f[(t + 1) % f.length]}`)) gleichlaeufig = true;
    for (const f of kappenFlaechen) neueFlaechen.push(gleichlaeufig ? f.slice().reverse() : f);
    for (const { punkt } of feld.innen) ohneHaut.add(punkt);
    knoten.push({ art: ast.art, fenster: { i0, i1, spalte, b }, punkteJeRing: M, uebergang: T, ringe: behalten.length, ab: kStart });
  });
  const n = naechster;
  const ziele = new Float64Array(3 * n);
  ziele.set(roh.ziele);
  zielNeu.forEach((p, k) => ziele.set(p, 3 * (v.kaefig.n + k)));
  const hoehe = new Float64Array(n);
  hoehe.set(roh.hoehe);
  hoeheNeu.forEach((h, k) => (hoehe[v.kaefig.n + k] = h));
  const koerper = flaechenAlt.filter((f) => !entfernen.has(schluessel(f)));
  const kaefig = kaefigAusFlaechen(ziele, [...koerper, ...neueFlaechen]);
  const pr = pruefeKaefig(kaefig);
  if (!pr.ok) throw new Error(`Knoten: Käfig nicht konsistent: ${pr.fehler.slice(0, 3).join('; ')}`);
  for (let e = 0; e < v.kaefig.nE; e++) {
    const sch = v.kaefig.eSchaerfe[e]!;
    if (sch <= 0) continue;
    const ke = kanteZwischen(kaefig, v.kaefig.eA[e]!, v.kaefig.eB[e]!);
    if (ke >= 0) kaefig.eSchaerfe[ke] = sch;
  }
  for (const { a, b, s } of scharfAst) {
    const ke = kanteZwischen(kaefig, a, b);
    if (ke >= 0) kaefig.eSchaerfe[ke] = s;
  }
  for (let i = 0; i < v.kaefig.n; i++) if (v.kaefig.vSchaerfe[i]! > 0) kaefig.vSchaerfe[i] = v.kaefig.vSchaerfe[i]!;
  const haut = new Uint8Array(n).fill(1);
  for (const p of ohneHaut) haut[p] = 0;
  const abl = fertigstellen({ opt, vorlage: v, kaefig, ziele, hoehe, l: rumpf.l, st: rumpf.st, breiten: rumpf.breiten, dok, haut, zeiten: { t0, t1, t2 } });
  return { ...abl, zerlegung, knoten };
}
