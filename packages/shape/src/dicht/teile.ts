// Form zuerst (05.11.2026): Teile — ein Umriss wird an einer Einbuchtung oder an einer Naht in zwei geschlossene Umrisse geteilt.
//
// Florian: „Ein Über- bzw. Unterbiss ist ja dasselbe wie ein Bauch und ein darüberhängender Kopf … Die Outlines sollten nicht
// wieder verschmelzen.“ Ein Teil ist ein Lappen der Form mit eigenem Umriss. Hängt ein Kopf über dem Bauch, liegt zwischen
// ihnen eine Einbuchtung; ihr innerster Punkt ist die Spitze, und die kürzeste Sehne von dort quer durch die Form ist die Naht.
// Der Umriss zerfällt an der Naht in zwei Bögen; jeder wird mit einer verdeckten Fortsetzung zu einem eigenen Umriss
// geschlossen. Die Fortsetzung läuft am Gegenpunkt in der Richtung des alten Umrisses weiter, ragt also rund in das andere Teil
// hinein (beide Teile überdecken sich an der Naht, keine Rille) und bleibt in der alten Form (die Seite zeigt danach genau den
// alten Umriss). An der Spitze enden beide Teile als Ecke, die zu ihrer Flanke die alte Richtung behält; dort bleibt die Linie
// bitgleich, und die Einbuchtung teilt nicht noch einmal (sie trägt das Ende einer Naht). Von Hand: Eine gezogene Naht quer über
// den Umriss teilt ihn genauso an ihren beiden Kreuzungen.

import type { V2 } from '../bezier';
import { type UmrissPunkt, punktAufStueck, umrissStuecke } from './umriss';

/** Eine Einbuchtung: Spitze (innerster Punkt), Öffnung (die Sehne der Hülle davor), Tiefe und das Verhältnis Tiefe / Öffnung. */
export type Einbuchtung = { spitze: V2; oeffnung: [V2, V2]; tiefe: number; breite: number; verhaeltnis: number };

/** Ergebnis einer Teilung: der größere Teil (Körper), der kleinere (das neue Teil) und die Naht. */
export type Teilung = { koerper: UmrissPunkt[]; teil: UmrissPunkt[]; naht: [V2, V2] };

type Probe = { p: V2; k: number; t: number };

/** Proben des geschlossenen Umrisses in der Reihenfolge seiner Punkte, je Probe Stück k und Parameter t. */
function proben(punkte: readonly UmrissPunkt[], s: number): Probe[] {
  const aus: Probe[] = [];
  umrissStuecke(punkte).forEach((st, k) => {
    const grob = Math.hypot(st[1].x - st[0].x, st[1].y - st[0].y) + Math.hypot(st[2].x - st[1].x, st[2].y - st[1].y) + Math.hypot(st[3].x - st[2].x, st[3].y - st[2].y);
    if (grob < 1e-9) return;
    const n = Math.max(2, Math.ceil(grob / s));
    for (let j = 0; j < n; j++) aus.push({ p: punktAufStueck(st, j / n), k, t: j / n });
  });
  return aus;
}

function innen(P: readonly V2[], x: number, y: number): boolean {
  let drin = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i]!;
    const b = P[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) drin = !drin;
  }
  return drin;
}

/** Umfang und eine Probenweite: etwa 400 Proben am Umriss */
function weite(punkte: readonly UmrissPunkt[]): number {
  let l = 0;
  for (const st of umrissStuecke(punkte)) l += Math.hypot(st[3].x - st[0].x, st[3].y - st[0].y);
  return Math.max(l / 400, 1e-3);
}

/** Konvexe Hülle (Andrew): Nummern der Proben auf ihr. */
function huelle(P: readonly V2[]): Set<number> {
  const ord = P.map((_, i) => i).sort((a, b) => P[a]!.x - P[b]!.x || P[a]!.y - P[b]!.y);
  const kreuz = (o: number, a: number, b: number) =>
    (P[a]!.x - P[o]!.x) * (P[b]!.y - P[o]!.y) - (P[a]!.y - P[o]!.y) * (P[b]!.x - P[o]!.x);
  const unten: number[] = [];
  for (const i of ord) {
    while (unten.length >= 2 && kreuz(unten[unten.length - 2]!, unten[unten.length - 1]!, i) <= 0) unten.pop();
    unten.push(i);
  }
  const oben: number[] = [];
  for (let q = ord.length - 1; q >= 0; q--) {
    const i = ord[q]!;
    while (oben.length >= 2 && kreuz(oben[oben.length - 2]!, oben[oben.length - 1]!, i) <= 0) oben.pop();
    oben.push(i);
  }
  return new Set([...unten, ...oben]);
}

/** Eine Tasche: die Einbuchtung, die Proben der Hüllpunkte davor und dahinter (a, b) und die tiefste Probe (i). */
type Tasche = { e: Einbuchtung; a: number; b: number; i: number };

/** Abstand eines Punkts von der Geraden durch A und B (Länge w). */
const abstand = (A: V2, B: V2, w: number, p: V2): number => Math.abs((B.x - A.x) * (p.y - A.y) - (B.y - A.y) * (p.x - A.x)) / w;

/**
 * Die Taschen eines Umrisses gegen seine Hülle, die tiefste zuerst (nach dem Verhältnis Tiefe / Öffnung). Endet in einer Tasche
 * eine Naht, ist sie schon geteilt und zählt nicht mehr.
 */
function taschen(punkte: readonly UmrissPunkt[], pr: readonly Probe[]): Tasche[] {
  const P = pr.map((q) => q.p);
  const h = [...huelle(P)].sort((a, b) => a - b);
  const aus: Tasche[] = [];
  for (let q = 0; q < h.length; q++) {
    const a = h[q]!;
    const b = h[(q + 1) % h.length]!;
    const n = (b - a + P.length) % P.length;
    if (n < 3) continue;
    const A = P[a]!;
    const B = P[b]!;
    const w = Math.hypot(B.x - A.x, B.y - A.y);
    if (w < 1e-9) continue;
    let tiefe = 0;
    let it = a;
    let genaeht = false;
    for (let j = 1; j < n; j++) {
      const i = (a + j) % P.length;
      genaeht ||= pr[i]!.t === 0 && !!punkte[pr[i]!.k]?.naht;
      const d = abstand(A, B, w, P[i]!);
      if (d > tiefe) {
        tiefe = d;
        it = i;
      }
    }
    if (!genaeht) aus.push({ e: { spitze: P[it]!, oeffnung: [A, B], tiefe, breite: w, verhaeltnis: tiefe / w }, a, b, i: it });
  }
  return aus.sort((x, y) => y.e.verhaeltnis - x.e.verhaeltnis);
}

/** Die Einbuchtungen eines Umrisses (gegen die Hülle), an denen noch nicht geteilt wurde, die tiefste zuerst. */
export function einbuchtungen(punkte: readonly UmrissPunkt[]): Einbuchtung[] {
  if (punkte.length < 3) return [];
  return taschen(punkte, proben(punkte, weite(punkte))).map((t) => t.e);
}

/** Richtung des Umrisses (in der Reihenfolge seiner Punkte) bei Stück k, Parameter t. */
function richtung(st: readonly [V2, V2, V2, V2][], k: number, t: number): V2 {
  const s = st[k]!;
  const u = 1 - t;
  let x = 3 * u * u * (s[1].x - s[0].x) + 6 * u * t * (s[2].x - s[1].x) + 3 * t * t * (s[3].x - s[2].x);
  let y = 3 * u * u * (s[1].y - s[0].y) + 6 * u * t * (s[2].y - s[1].y) + 3 * t * t * (s[3].y - s[2].y);
  let l = Math.hypot(x, y);
  if (l < 1e-9) {
    x = s[3].x - s[0].x;
    y = s[3].y - s[0].y;
    l = Math.hypot(x, y) || 1;
  }
  return { x: x / l, y: y / l };
}

/**
 * Den Umriss zwischen zwei seiner Stellen P1, P2 teilen (die Naht). Jedes Teil ist ein Bogen der alten Linie, der über die Naht
 * hinaus ein Stück am alten Umriss entlang weiterläuft (bis zu 0,6 Nahtlängen) und dann gerade quer durch das andere Teil
 * schließt. So überdecken sich die Teile breit (an der Naht beide voll, keine Rille), und die Seite zeigt genau den alten
 * Umriss: Die Ecken der geraden Schließung liegen im anderen Teil. Neue Punkte (Naht, Enden) und ihre Nachbarn behalten die
 * Richtung des alten Umrisses, sonst drehte mit dem neuen Nachbarn der ganze Bogen. Liegt P1 an der Spitze einer Einbuchtung
 * (`spitze`), enden dort beide Teile als Ecke: Die Fortsetzung liefe sonst die andere Flanke entlang, und das Teil behielte die
 * Einbuchtung (bei kleiner Schwelle würde es dort noch einmal geteilt).
 */
function teilen(punkte: readonly UmrissPunkt[], s1: { k: number; t: number }, s2: { k: number; t: number }, spitze = false): Teilung | null {
  const n = punkte.length;
  const st = umrissStuecke(punkte);
  const pr = proben(punkte, weite(punkte));
  const N = pr.length;
  const alt = pr.map((q) => q.p);
  const lage = (s: { k: number; t: number }) => punktAufStueck(st[s.k]!, s.t);
  const P1 = lage(s1);
  const P2 = lage(s2);
  const L = Math.hypot(P2.x - P1.x, P2.y - P1.y);
  if (L < 1e-6) return null;
  const c = (s: { k: number; t: number }) => s.k + s.t;
  const probeAb = (s: { k: number; t: number }) => {
    const i = pr.findIndex((q) => c(q) >= c(s) - 1e-9);
    return i < 0 ? 0 : i;
  };
  const i1 = probeAb(s1);
  const i2 = probeAb(s2);
  const seg = (i: number) => Math.hypot(pr[(i + 1) % N]!.p.x - pr[i]!.p.x, pr[(i + 1) % N]!.p.y - pr[i]!.p.y);
  // Punkte des Umrisses zwischen zwei Stellen (vorwärts, zyklisch), ohne die Stellen selbst; ein Teil trägt keine Lippe. Der
  // erste und der letzte behalten die Richtung des alten Umrisses (ihr Nachbar ist neu)
  const bogen = (a: { k: number; t: number }, b: { k: number; t: number }): UmrissPunkt[] => {
    const ca = c(a);
    let rb = (c(b) - ca + n) % n;
    if (rb < 1e-9) rb = n;
    const aus: UmrissPunkt[] = [];
    const nr: number[] = [];
    for (let j = 0; j < n; j++) {
      const k = (Math.floor(ca) + 1 + j) % n;
      const rk = (k - ca + n) % n;
      if (rk > 1e-6 && rk < rb - 1e-6) {
        const q = punkte[k]!;
        const r: UmrissPunkt = { x: q.x, y: q.y };
        if (q.ecke) r.ecke = true;
        if (q.richtung) r.richtung = q.richtung;
        if (q.naht) r.naht = true;
        aus.push(r);
        nr.push(k);
      }
    }
    for (const j of new Set([0, aus.length - 1])) {
      const q = aus[j];
      if (q && !q.ecke && !q.richtung) aus[j] = { ...q, richtung: richtung(st, nr[j]!, 0) };
    }
    return aus;
  };
  // ein Ende der Naht bzw. einer Verlängerung: eine Ecke, an der die Linie zu ihrem Bogen hin in der alten Richtung läuft (zur
  // anderen Ecke gerade). Auf einem Punkt, der schon eine Ecke war, bleibt sie, wie sie war.
  const ecke = (s: { k: number; t: number }): UmrissPunkt => {
    const q = lage(s);
    if (s.t === 0 && punkte[s.k]?.ecke) return { x: q.x, y: q.y, ecke: true, naht: true };
    return { x: q.x, y: q.y, ecke: true, naht: true, richtung: richtung(st, s.k, s.t) };
  };
  // ein Teil über den Bogen von sa (Probe ia) bis sb (Probe ib), an jedem Ende einzeln in den anderen Bogen verlängert (nAnders
  // Proben). An der Spitze einer Einbuchtung (festA, festB) wird nicht verlängert, ebenso, wo die Schließung sonst über eine
  // Lücke liefe: Das Teil endet dann an der Naht.
  const teilUeber = (
    sa: { k: number; t: number },
    sb: { k: number; t: number },
    ia: number,
    ib: number,
    nAnders: number,
    festA: boolean,
    festB: boolean,
  ): UmrissPunkt[] => {
    const vorher = (m: number): { k: number; t: number } => {
      if (m <= 0) return sa;
      let e = ia;
      for (let z = 0, l = 0; l < m && z < 0.4 * nAnders; z++) {
        e = (e - 1 + N) % N;
        l += seg(e);
      }
      return pr[e]!;
    };
    const nachher = (m: number): { k: number; t: number } => {
      if (m <= 0) return sb;
      let e = ib;
      for (let z = 0, l = 0; l < m && z < 0.4 * nAnders; z++) {
        l += seg(e);
        e = (e + 1) % N;
      }
      return pr[e]!;
    };
    const umriss = (ma: number, mb: number): UmrissPunkt[] => {
      const a = vorher(ma);
      const b = nachher(mb);
      return [ecke(a), ...bogen(a, b), ecke(b)];
    };
    const geschlossen = (u: readonly UmrissPunkt[]) => {
      const a = u[0]!;
      const e = u[u.length - 1]!;
      for (let j = 1; j < 16; j++) {
        const f = j / 16;
        if (!innen(alt, e.x + f * (a.x - e.x), e.y + f * (a.y - e.y))) return false;
      }
      return true;
    };
    for (let m = 0.6 * L; m > 0.05 * L; m *= 0.7) {
      const paare: (readonly [number, number])[] =
        festA || festB
          ? [[festA ? 0 : m, festB ? 0 : m]]
          : [
              [m, m],
              [0, m],
              [m, 0],
            ];
      for (const [ma, mb] of paare) {
        const u = umriss(ma, mb);
        if (geschlossen(u)) return u;
      }
    }
    return umriss(0, 0);
  };
  const nA = (i2 - i1 + N) % N;
  const umrissA = teilUeber(s1, s2, i1, i2, N - nA, spitze, false);
  const umrissB = teilUeber(s2, s1, i2, i1, nA, false, spitze);
  if (umrissA.length < 3 || umrissB.length < 3) return null;
  // Körper ist der größere Bogen (Fläche von Bogen und Naht)
  const flaeche = (von: number, zahl: number) => {
    let f = 0;
    for (let j = 0; j < zahl; j++) {
      const a = alt[(von + j) % N]!;
      const b = alt[(von + j + 1) % N]!;
      f += a.x * b.y - b.x * a.y;
    }
    const a = alt[(von + zahl) % N]!;
    const b = alt[von]!;
    return Math.abs(f + a.x * b.y - b.x * a.y) / 2;
  };
  const [koerper, teil] = flaeche(i1, nA) >= flaeche(i2, N - nA) ? [umrissA, umrissB] : [umrissB, umrissA];
  return { koerper, teil, naht: [P1, P2] };
}

/**
 * An der tiefsten Einbuchtung teilen, wenn sie mindestens `schwelle`-mal so tief wie breit ist. Die Naht ist die kürzeste Sehne
 * von ihrer Spitze quer durch die Form.
 */
export function anEinbuchtungTeilen(punkte: readonly UmrissPunkt[], schwelle: number): Teilung | null {
  if (punkte.length < 3) return null;
  const pr = proben(punkte, weite(punkte));
  const ta = taschen(punkte, pr)[0];
  if (!ta || ta.e.verhaeltnis < schwelle) return null;
  const P = pr.map((q) => q.p);
  // die Spitze: der tiefste Punkt der Tasche, den Florian gesetzt hat, wenn er (fast) so tief liegt wie die tiefste Stelle; dort
  // bleibt die Linie genau, wie sie war (die Ecke behält zu beiden Seiten die alte Richtung)
  const [A, B] = ta.e.oeffnung;
  let iK = -1;
  let dK = -1;
  for (let j = 1; j < (ta.b - ta.a + P.length) % P.length; j++) {
    const i = (ta.a + j) % P.length;
    const d = abstand(A, B, ta.e.breite, P[i]!);
    if (pr[i]!.t === 0 && d > dK) {
      dK = d;
      iK = i;
    }
  }
  const iT = iK >= 0 && dK >= 0.9 * ta.e.tiefe ? iK : ta.i;
  const T = P[iT]!;
  let umfang = 0;
  for (let i = 0; i < P.length; i++) umfang += Math.hypot(P[(i + 1) % P.length]!.x - P[i]!.x, P[(i + 1) % P.length]!.y - P[i]!.y);
  const bogenAb = new Float64Array(P.length);
  for (let j = 1; j < P.length; j++) {
    const a = P[(iT + j - 1) % P.length]!;
    const b = P[(iT + j) % P.length]!;
    bogenAb[(iT + j) % P.length] = bogenAb[(iT + j - 1) % P.length]! + Math.hypot(b.x - a.x, b.y - a.y);
  }
  let best = -1;
  let dBest = Infinity;
  for (let i = 0; i < P.length; i++) {
    const s = Math.min(bogenAb[i]!, umfang - bogenAb[i]!);
    if (s < 0.08 * umfang) continue;
    const Q = P[i]!;
    const d = Math.hypot(Q.x - T.x, Q.y - T.y);
    if (d >= dBest) continue;
    // die Sehne muss durch die Form gehen (über die Einbuchtung hinweg zählt nicht)
    let drin = true;
    for (let j = 1; j < 12 && drin; j++) {
      const f = j / 12;
      if (!innen(P, T.x + f * (Q.x - T.x), T.y + f * (Q.y - T.y))) drin = false;
    }
    if (drin) {
      dBest = d;
      best = i;
    }
  }
  if (best < 0) return null;
  return teilen(punkte, pr[iT]!, pr[best]!, true);
}

/**
 * An einer gezogenen Naht teilen (Strecke a → b in der Seite): an den beiden Kreuzungen mit dem Umriss, die das Stück der
 * Strecke in der Form einschließen, das ihrer Mitte am nächsten liegt.
 */
export function anNahtTeilen(punkte: readonly UmrissPunkt[], a: V2, b: V2): Teilung | null {
  const pr = proben(punkte, weite(punkte));
  const P = pr.map((q) => q.p);
  // Kreuzungen der Strecke mit dem abgetasteten Umriss, längs der Strecke geordnet
  const kreuz: { f: number; i: number; u: number }[] = [];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (let i = 0; i < P.length; i++) {
    const p = P[i]!;
    const q = P[(i + 1) % P.length]!;
    const ex = q.x - p.x;
    const ey = q.y - p.y;
    const nenner = dx * ey - dy * ex;
    if (Math.abs(nenner) < 1e-12) continue;
    const f = ((p.x - a.x) * ey - (p.y - a.y) * ex) / nenner;
    const u = ((p.x - a.x) * dy - (p.y - a.y) * dx) / nenner;
    if (f >= 0 && f <= 1 && u >= 0 && u < 1) kreuz.push({ f, i, u });
  }
  if (kreuz.length < 2) return null;
  kreuz.sort((x, y) => x.f - y.f);
  // Paare (innen zwischen zwei aufeinanderfolgenden Kreuzungen): das, dessen Mitte der Mitte der Strecke am nächsten ist
  let wahl = -1;
  let dBest = Infinity;
  for (let q = 0; q + 1 < kreuz.length; q++) {
    const fm = (kreuz[q]!.f + kreuz[q + 1]!.f) / 2;
    if (!innen(P, a.x + fm * dx, a.y + fm * dy)) continue;
    const d = Math.abs(fm - 0.5);
    if (d < dBest) {
      dBest = d;
      wahl = q;
    }
  }
  if (wahl < 0) return null;
  const stelle = (c: { i: number; u: number }) => {
    const p0 = pr[c.i]!;
    const p1 = pr[(c.i + 1) % pr.length]!;
    // Parameter zwischen zwei Proben (im selben Stück linear, sonst die nähere Probe)
    if (p1.k === p0.k) return { k: p0.k, t: p0.t + c.u * (p1.t - p0.t) };
    return c.u < 0.5 ? { k: p0.k, t: p0.t } : { k: p1.k, t: p1.t };
  };
  return teilen(punkte, stelle(kreuz[wahl]!), stelle(kreuz[wahl + 1]!));
}
