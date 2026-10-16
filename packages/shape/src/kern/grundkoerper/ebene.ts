// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S5 „Mittelebenen-Baum“: Auslegung der Seitenfläche in Streifen.
//
// Ein Körper aus Mittelteilen ist ein Höhenfeld über seiner Seitenfläche; sein Käfig ist ein 2D-Vierecksnetz der Seite,
// verdoppelt (`kaefig/baumKaefig.ts`). Hier entsteht die 2D-Auslegung aus dem eingefrorenen S4-Baum:
// - **Seitlich angesetzt** ist ein Mittelteil, wenn der Rumpf über beide Sehnenenden hinaus weiterläuft — beide Spitzen des
//   Rumpfs (nach dem Schneiden) liegen mindestens eine halbe Sehnenlänge von der Sehne entfernt (Ente, Giraffe mit Bauch,
//   S-Hals, Überhang, Flossen). Sein Bereich wird an der Sehne abgeschnitten und bekommt einen eigenen Streifen, dessen
//   Ketten an den Sehnenenden beginnen; Ring 0 ist die Sehne.
// - Sonst bleibt das Teil im Streifen des Rumpfs (Fortsetzung, wie heute; der Übergang 2:1 folgt in S5.3).
// - Je Streifen: zwei Ketten vom Anfang zum Ende (a: Ringpunkt 0, b: Ringpunkt N/2), die kürzeste Leiter dazwischen, dann die
//   Ringe (`ringeAuslegen`): unter einer Sehne enden genau H + 1 Sprossen auf den Punkten des ersten Kindrings (gleiche
//   Winkel auf dem Kindring), ihre Fußpunkte gleichmäßig auf der Gegenseite (Fächer); dazwischen Ringe nach der örtlichen
//   Kantenlänge (Umfang / Punktzahl), damit die Vierecke etwa quadratisch werden.
// Kern-Einheiten, DOM-frei.

import type { V2 } from '../../bezier';
import type { Dokument } from '../../dokument';
import { type Leiter, WIRBEL_STANDARD, leiterAusKetten, nachBogen } from '../../versuch/wirbelsaeule';
import { leiterEntfaechern, leiterInnenEntfaechern, spineAnteilFuer, stationenAusLeiter, zugBei } from '../ableiten';
import { type Breiten, silhouettenBreite } from '../breite';
import { huelle } from './huelle';
import { innenWege } from './mittelachse';
import { type Teilbaum, teilbaum, teilenBei } from './teilbaum';

export type EbenenAnsatz = {
  /** seitlich angesetzt (Verbindungsstück) oder Fortsetzung am Ende des Elternstreifens (Übergang 2:1) */
  art: 'seitlich' | 'fortsetzung';
  /** Elternstreifen */
  eltern: number;
  /** Kette des Elternstreifens, auf der die Sehne liegt (a: Ringpunkt 0, b: Ringpunkt N/2) */
  seite: 'a' | 'b';
  /** Sehnenenden in der Reihenfolge der Elternkette */
  A: V2;
  B: V2;
};

export type EbenenStreifen = {
  /** Teile des S4-Baums (Indizes), die dieser Streifen trägt */
  teile: number[];
  ansatz: EbenenAnsatz | null;
  /** Bereich (geschlossen, ohne doppelten Endpunkt) */
  umriss: V2[];
  /** Ketten a/b vom Anfang zum Ende (ungeglättet, mit genauen Sehnenenden) und die Leiter auf ihren Abtastungen */
  ketten: { a: V2[]; b: V2[] };
  leiter: Leiter;
  /** Punkte je Ring */
  N: number;
  /** seitlich angesetzte Kindstreifen */
  kinder: number[];
  /** Kindstreifen, der das Ende dieses Streifens mit halber Punktzahl fortsetzt (Übergangskappe), sonst null */
  uebergang: number | null;
};

export type Ebene = {
  streifen: EbenenStreifen[];
  baum: Teilbaum;
  /** Seitenumriss (wie die Hülle aus S0/S4) */
  seite: V2[];
  /** Mittelteile, die im Streifen ihres Elternteils bleiben (Fortsetzung) */
  fortsetzung: number[];
  /** davon wegen überlappender Sehnenblöcke (Flosse ohne eigenen Streifen mitten am Rumpf) */
  ueberlappt: number[];
  /** gezeichnete Ecken der Seite (Welt; ohne Lippenanfänge) */
  ecken: V2[];
};

const abstand = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y);

/** Abstand eines Punkts zur Strecke a–b. */
function streckenAbstand(p: V2, a: V2, b: V2): number {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const f = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
  return Math.hypot(a.x + ab.x * f - p.x, a.y + ab.y * f - p.y);
}

/** Abstand eines Punkts zu einem offenen Zug. */
function zugAbstand(p: V2, zug: readonly V2[]): number {
  let d = Infinity;
  for (let i = 0; i + 1 < zug.length; i++) d = Math.min(d, streckenAbstand(p, zug[i]!, zug[i + 1]!));
  return d;
}

/** Bogenlänge je Punkt eines offenen Zugs (Anteile 0 … 1). */
function bogenAnteile(zug: readonly V2[]): number[] {
  const s = [0];
  for (let i = 1; i < zug.length; i++) s.push(s[i - 1]! + abstand(zug[i - 1]!, zug[i]!));
  const L = s[s.length - 1]! || 1;
  return s.map((x) => x / L);
}

/** Anteil eines Punkts auf einem offenen Zug (Bogenlänge des nächsten Punkts). */
export function anteilAufZug(zug: readonly V2[], p: V2): number {
  const s = bogenAnteile(zug);
  let best = Infinity;
  let t = 0;
  for (let i = 0; i + 1 < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const f = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
    const d = Math.hypot(a.x + ab.x * f - p.x, a.y + ab.y * f - p.y);
    if (d < best) {
      best = d;
      t = s[i]! + (s[i + 1]! - s[i]!) * f;
    }
  }
  return t;
}

/**
 * Enden eines geschlossenen Umrisses wie `endenAutomatisch` (G2), für ein Polygon: der vorderste und der hinterste Punkt,
 * außer ein anderer Punkt liegt innen um 15 % weiter vom anderen Ende und hinter einer Biegung.
 */
export function polygonEnden(pts: readonly V2[]): { vorn: number; hinten: number } {
  const n = pts.length;
  const s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1]! + abstand(pts[i]!, pts[i - 1]!));
  const umfang = s[n - 1]! + abstand(pts[0]!, pts[n - 1]!);
  let iA = 0;
  let iB = 0;
  pts.forEach((p, i) => {
    if (p.x < pts[iA]!.x) iA = i;
    if (p.x > pts[iB]!.x) iB = i;
  });
  const bogen = (i: number, j: number) => {
    const d = Math.abs(s[i]! - s[j]!);
    return Math.min(d, umfang - d) / umfang;
  };
  const verlaesst = (a: V2, b: V2) => {
    for (let k = 1; k < 40; k++) {
      const q = { x: a.x + ((b.x - a.x) * k) / 40, y: a.y + ((b.y - a.y) * k) / 40 };
      let drin = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const p1 = pts[i]!;
        const p2 = pts[j]!;
        if (p1.y > q.y !== p2.y > q.y && q.x < ((p2.x - p1.x) * (q.y - p1.y)) / (p2.y - p1.y || 1e-12) + p1.x) drin = !drin;
      }
      if (!drin) return true;
    }
    return false;
  };
  const anderes = (iVon: number, iAlt: number, richtung: -1 | 1): number => {
    const weg = innenWege(pts, pts[iVon]!);
    const d = pts.map((p) => weg(p));
    const dAlt = d[iAlt]!;
    let dMax = dAlt;
    for (const x of d) if (x > dMax) dMax = x;
    let iF = iAlt;
    d.forEach((x, i) => {
      if (x >= 0.95 * dMax && (iF === iAlt ? x > dAlt : richtung * pts[i]!.x > richtung * pts[iF]!.x)) iF = i;
    });
    if (iF === iAlt || bogen(iF, iAlt) <= 0.08) return iAlt;
    return d[iF]! > 1.15 * dAlt && verlaesst(pts[iVon]!, pts[iF]!) ? iF : iAlt;
  };
  const iV = anderes(iB, iA, -1);
  const iH = anderes(iV, iB, 1);
  return { vorn: iV, hinten: iH };
}

/** Geschlossenes Polygon an zwei Punktindizes in zwei Ketten teilen (beide von i nach j); die obere zuerst. */
function teilenInKetten(poly: readonly V2[], i: number, j: number): { a: V2[]; b: V2[] } {
  const n = poly.length;
  const vor: V2[] = [];
  for (let k = i; ; k = (k + 1) % n) {
    vor.push(poly[k]!);
    if (k === j) break;
  }
  const rueck: V2[] = [];
  for (let k = i; ; k = (k - 1 + n) % n) {
    rueck.push(poly[k]!);
    if (k === j) break;
  }
  const mittelY = (z: V2[]) => z.reduce((sum, p) => sum + p.y, 0) / z.length;
  return mittelY(vor) >= mittelY(rueck) ? { a: vor, b: rueck } : { a: rueck, b: vor };
}

/**
 * Ketten eines Streifens, der an einer Sehne X–Y endet (Übergangskappe): Anfang ist der Punkt, der innen am weitesten von der
 * Sehnenmitte liegt; die eine Kette läuft zu X, die andere zu Y (die obere zuerst).
 */
function kettenZurSehne(poly: readonly V2[], X: V2, Y: V2): { a: V2[]; b: V2[] } {
  const n = poly.length;
  let iX = 0;
  let iY = 0;
  poly.forEach((q, j) => {
    if (abstand(q, X) < abstand(poly[iX]!, X)) iX = j;
    if (abstand(q, Y) < abstand(poly[iY]!, Y)) iY = j;
  });
  const m = { x: (X.x + Y.x) / 2, y: (X.y + Y.y) / 2 };
  const weg = innenWege(poly, m);
  let iE = 0;
  poly.forEach((q, j) => {
    if (weg(q) > weg(poly[iE]!)) iE = j;
  });
  // vom Anfang in beiden Richtungen um den Umriss; die Richtung, die X zuerst erreicht, endet an X
  const lauf = (schritt: 1 | -1, ziel: number, sperre: number): V2[] | null => {
    const out: V2[] = [];
    for (let k = iE, t = 0; t <= n; k = (k + schritt + n) % n, t++) {
      out.push(poly[k]!);
      if (k === ziel) return out;
      if (k === sperre) return null;
    }
    return null;
  };
  const zuX = lauf(1, iX, iY) ?? lauf(-1, iX, iY)!;
  const zuY = lauf(-1, iY, iX) ?? lauf(1, iY, iX)!;
  const mittelY = (z: V2[]) => z.reduce((sum, p) => sum + p.y, 0) / z.length;
  return mittelY(zuX) >= mittelY(zuY) ? { a: zuX, b: zuY } : { a: zuY, b: zuX };
}

/** Leiter eines Streifens aus seinen Ketten (abgetastet wie die Leiter des Kerns, an den Enden und Kehlen entfächert). */
function streifenLeiter(a: readonly V2[], b: readonly V2[]): Leiter {
  const P = WIRBEL_STANDARD.proben;
  return leiterInnenEntfaechern(leiterEntfaechern(leiterAusKetten(nachBogen(a, P), nachBogen(b, P), WIRBEL_STANDARD)));
}

/** Doppelte Endpunkte und Nullstrecken entfernen. */
function bereinigt(poly: readonly V2[]): V2[] {
  const out: V2[] = [];
  for (const p of poly) if (!out.length || abstand(out[out.length - 1]!, p) > 1e-12) out.push(p);
  while (out.length > 1 && abstand(out[0]!, out[out.length - 1]!) < 1e-12) out.pop();
  return out;
}

/** Spitze eines Teils: Ende seiner Wirbelsäule (S4) in der Seite. */
function teilSpitze(b: Teilbaum, t: number): V2 {
  const achse = b.teile[t]!.achse;
  const e = achse[achse.length - 1]!;
  return { x: e[0], y: e[1] };
}

/** Umfang über die Paare der Leiter (Quantil, Standard Median): Ellipse aus halber Sprosse und Breite (Top/Front an der Sprossenmitte). */
function mittlererUmfang(l: Leiter, breiten: Breiten, quantil = 0.5): number {
  const werte = l.paare.map((p) => {
    const o = zugBei(l.ruecken, p.a);
    const u = zugBei(l.bauch, p.b);
    const halb = abstand(o, u) / 2;
    let W = Math.min(breiten.top((o.x + u.x) / 2), breiten.front((o.y + u.y) / 2));
    if (!(W > 0)) W = halb;
    return umfang(halb, Math.min(W, 4 * halb));
  });
  werte.sort((x, y) => x - y);
  return werte[Math.floor(werte.length * quantil)] ?? 0;
}

/** Anteile der Wirbelsäule, die eine Sehne auf ihrer Kette des Elternstreifens einnimmt. */
function sehnenBereich(l: Leiter, kette: readonly V2[], seite: 'a' | 'b', A: V2, B: V2): [number, number] {
  const fA = spineAnteilFuer(l, anteilAufZug(kette, A), seite === 'a');
  const fB = spineAnteilFuer(l, anteilAufZug(kette, B), seite === 'a');
  return [Math.min(fA, fB), Math.max(fA, fB)];
}

/** Abstand, den zwei Sehnenbereiche auf der Wirbelsäule mindestens halten (Anteil): dazwischen ein freier Ring. */
const BLOCK_ABSTAND = 0.03;
/** Ab diesem Anteil des Rumpfumfangs (Median des Kinds) ist ein Kind dick: Fortsetzung statt Verbindungsstück */
const DICK_ANTEIL = 0.5;
/** Unter diesem Anteil setzt ein Teil am Rumpfende mit halber Punktzahl fort (Übergang 2:1), sonst im selben Streifen */
const UEBERGANG_ANTEIL = 0.4;

/**
 * Auslegung der Seitenfläche. Ohne seitlich angesetzte Mittelteile ein Streifen (der Rumpf); dann baut der Kern wie heute.
 * Punkte je Kindring aus dem Umfang (Vielfache von 8, Kanten wie im Rumpf). Überlappen sich die Sehnenbereiche zweier
 * Kinder auf der Wirbelsäule (Rücken- und Bauchflosse übereinander), bleibt das kleinere im Elternstreifen: ein Ring kann
 * nicht zugleich auf beiden Sehnen enden, ohne dass beide Kinder dieselbe Punktzahl und Lage haben (S5.4).
 */
export function ebene(dok: Dokument, baum?: Teilbaum, breitenVorgabe?: Breiten): Ebene {
  const b = baum ?? teilbaum(dok, dok.kaefig?.stationen?.teile ?? null);
  const breiten = breitenVorgabe ?? silhouettenBreite(dok);
  const seite = bereinigt(huelle(dok).seite);
  const mitte = b.teile.map((t, i) => ({ t, i })).filter(({ t }) => t.art === 'mitte' && t.erkannt.seite);
  // Rumpf nach dem Schneiden aller Mittelteile: liegt eine seiner Spitzen an einer Sehne, setzt das Teil den Rumpf fort
  const schneide = (teile: readonly number[]) => {
    let rest = seite;
    const stuecke = new Map<number, { ast: V2[]; schnitt: [V2, V2] }>();
    for (const i of teile) {
      const s = b.teile[i]!.erkannt.seite!.schnitt;
      const t = teilenBei(rest, s[0], s[1], teilSpitze(b, i));
      if (!t) continue;
      rest = bereinigt(t.rest);
      stuecke.set(i, { ast: t.ast, schnitt: t.schnitt });
    }
    return { rest, stuecke };
  };
  const alle = schneide(mitte.map((m) => m.i));
  const e0 = polygonEnden(alle.rest);
  const spitzen = [alle.rest[e0.vorn]!, alle.rest[e0.hinten]!];
  const k0 = teilenInKetten(alle.rest, e0.vorn, e0.hinten);
  const umfangRumpf = mittlererUmfang(streifenLeiter(k0.a, k0.b), breiten);
  // je Teil: Spitze (innen am weitesten von der Sehnenmitte) und mittlerer Umfang
  const kindSpitze = new Map<number, V2>();
  const seitlich: number[] = [];
  const fortsetzung: number[] = [];
  /** Fortsetzungen, die ein Ende des Rumpfstreifens bilden (Spitze am Rumpfende oder dickes Kind) */
  const endTeile: number[] = [];
  let uebergangTeil = -1;
  for (const { i } of mitte) {
    const st = alle.stuecke.get(i);
    if (!st) {
      fortsetzung.push(i);
      continue;
    }
    const [X, Y] = st.schnitt;
    const m = { x: (X.x + Y.x) / 2, y: (X.y + Y.y) / 2 };
    const weg = innenWege(bereinigt([...st.ast]), m);
    let iT = 1;
    for (let k = 1; k + 1 < st.ast.length; k++) if (weg(st.ast[k]!) > weg(st.ast[iT]!)) iT = k;
    kindSpitze.set(i, st.ast[iT]!);
    const L = abstand(X, Y);
    const nah = spitzen.some((p) => streckenAbstand(p, X, Y) < 0.5 * L);
    // dick: Umfang des Kinds mindestens halb so groß wie der des Rumpfs (Vasenhals) — ein Verbindungsstück wird dort ein
    // Splitter zwischen dem runden Ring durch das Sehnenende und dem nächsten Sehnenpunkt (Vase 62°); dann ein Streifen
    // durch Rumpf und Kind (Fortsetzung, Plan S5.3)
    const kette = st.ast;
    const kA = kette.slice(0, iT + 1);
    const kB = kette.slice(iT).reverse();
    // Median des Kind-Umfangs gegen den Rumpf (gemessen 16.10.: Giraffe 0,36, Ente 0,40, S-Hals 0,27, Überhang 0,57,
    // Vase 0,76, Langhals und Drache 0,53, Fisch-Schwanzlappen 0,21); als ein Streifen waren Langhals, Drache und Überhang
    // besser (mit Übergang lag die S4-Sehne tief in der Brust, Top 4,4 → 6,8 px; als Verbindungsstück faltete der
    // überhängende Kopf, 173°)
    const anteil = mittlererUmfang(streifenLeiter(kA, kB), breiten) / umfangRumpf;
    const dick = anteil >= DICK_ANTEIL;
    const sehrDuenn = anteil < UEBERGANG_ANTEIL;
    // dünnes Teil am Rumpfende: eigener Streifen mit halber Punktzahl über die Übergangskappe (Plan S5.3); nur eines
    if (nah && sehrDuenn && uebergangTeil < 0) uebergangTeil = i;
    else if (nah || dick) {
      fortsetzung.push(i);
      endTeile.push(i);
    } else seitlich.push(i);
  }
  // Rumpfstreifen: nur seitlich angesetzte Teile werden abgeschnitten; überlappende Sehnenbereiche → das kleinere Teil bleibt
  let rest: V2[];
  let stuecke: Map<number, { ast: V2[]; schnitt: [V2, V2] }>;
  let kRumpf: { a: V2[]; b: V2[] };
  let lRumpf: Leiter;
  const ueberlappt: number[] = [];
  // Enden des Rumpfstreifens: ohne Fortsetzung wie bisher; sonst die Spitze der (ersten) Fortsetzung und die einer zweiten
  // bzw. der Punkt, der innen am weitesten von ihr entfernt liegt (Vase: Rand und Boden)
  const naechster = (poly: readonly V2[], p: V2) => {
    let k = 0;
    poly.forEach((q, j) => {
      if (abstand(q, p) < abstand(poly[k]!, p)) k = j;
    });
    return k;
  };
  const rumpfEnden = (poly: V2[]): { vorn: number; hinten: number } => {
    if (!endTeile.length) return polygonEnden(poly);
    const e1 = naechster(poly, kindSpitze.get(endTeile[0]!)!);
    if (endTeile.length >= 2) return { vorn: e1, hinten: naechster(poly, kindSpitze.get(endTeile[1]!)!) };
    const weg = innenWege(poly, poly[e1]!);
    let e2 = 0;
    poly.forEach((q, j) => {
      if (weg(q) > weg(poly[e2]!)) e2 = j;
    });
    return poly[e1]!.x <= poly[e2]!.x ? { vorn: e1, hinten: e2 } : { vorn: e2, hinten: e1 };
  };
  for (;;) {
    ({ rest, stuecke } = schneide(uebergangTeil >= 0 ? [...seitlich, uebergangTeil] : seitlich));
    const ue = uebergangTeil >= 0 ? stuecke.get(uebergangTeil) : undefined;
    if (ue) kRumpf = kettenZurSehne(rest, ue.schnitt[0], ue.schnitt[1]);
    else {
      const e = rumpfEnden(rest);
      kRumpf = teilenInKetten(rest, e.vorn, e.hinten);
    }
    lRumpf = streifenLeiter(kRumpf.a, kRumpf.b);
    const bereiche = seitlich
      .filter((i) => stuecke.has(i))
      .map((i) => {
        const [X, Y] = stuecke.get(i)!.schnitt;
        const m = { x: (X.x + Y.x) / 2, y: (X.y + Y.y) / 2 };
        const sa: 'a' | 'b' = zugAbstand(m, kRumpf.a) <= zugAbstand(m, kRumpf.b) ? 'a' : 'b';
        return { i, f: sehnenBereich(lRumpf, sa === 'a' ? kRumpf.a : kRumpf.b, sa, X, Y), laenge: abstand(X, Y) };
      })
      .sort((x, y) => x.f[0] - y.f[0]);
    let weg = -1;
    for (let k = 0; k + 1 < bereiche.length && weg < 0; k++) {
      const p = bereiche[k]!;
      const q = bereiche[k + 1]!;
      if (q.f[0] < p.f[1] + BLOCK_ABSTAND) weg = p.laenge < q.laenge ? p.i : q.i;
    }
    if (weg < 0) break;
    seitlich.splice(seitlich.indexOf(weg), 1);
    fortsetzung.push(weg);
    ueberlappt.push(weg);
  }
  const eUmfang = mittlererUmfang(lRumpf, breiten) / 16;
  const streifen: EbenenStreifen[] = [{ teile: [0, ...fortsetzung], ansatz: null, umriss: rest, ketten: kRumpf, leiter: lRumpf, N: 16, kinder: [], uebergang: null }];
  // Fortsetzung mit Übergang: Ketten von den Sehnenenden zur Spitze, halbe Punktzahl
  if (uebergangTeil >= 0 && stuecke.has(uebergangTeil)) {
    const st = stuecke.get(uebergangTeil)!;
    const A = kRumpf.a[kRumpf.a.length - 1]!;
    const B = kRumpf.b[kRumpf.b.length - 1]!;
    const m = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const ast = st.ast;
    const weg = innenWege(bereinigt([...ast]), m);
    let iT = 1;
    for (let k = 1; k + 1 < ast.length; k++) if (weg(ast[k]!) > weg(ast[iT]!)) iT = k;
    const vonX = ast.slice(0, iT + 1);
    const vonY = ast.slice(iT).reverse();
    const xIstA = abstand(ast[0]!, A) < abstand(ast[0]!, B);
    const ka = xIstA ? vonX : vonY;
    const kb = xIstA ? vonY : vonX;
    streifen.push({ teile: [uebergangTeil], ansatz: { art: 'fortsetzung', eltern: 0, seite: 'a', A, B }, umriss: bereinigt([...ast]), ketten: { a: ka, b: kb }, leiter: streifenLeiter(ka, kb), N: 8, kinder: [], uebergang: null });
    streifen[0]!.uebergang = streifen.length - 1;
  }
  for (const i of seitlich) {
    const st = stuecke.get(i);
    if (!st) continue;
    const [X, Y] = st.schnitt;
    // Seite und Reihenfolge der Sehne auf den Ketten des Rumpfs
    const mitteS = { x: (X.x + Y.x) / 2, y: (X.y + Y.y) / 2 };
    const seiteAB: 'a' | 'b' = zugAbstand(mitteS, kRumpf.a) <= zugAbstand(mitteS, kRumpf.b) ? 'a' : 'b';
    const kette = seiteAB === 'a' ? kRumpf.a : kRumpf.b;
    const xVorn = anteilAufZug(kette, X) <= anteilAufZug(kette, Y);
    const A = xVorn ? X : Y;
    const B = xVorn ? Y : X;
    // Ketten des Kinds: von A bzw. B den Teilumriss entlang zur Spitze (ast läuft von X über die Spitze nach Y). Spitze =
    // der Punkt, der innen am weitesten von der Sehnenmitte liegt (das Ende der S4-Wirbelsäule lag bei der Ente am Hinterkopf,
    // der Schnabel lag dann ganz auf einer Kette)
    const ast = st.ast;
    const weg = innenWege(bereinigt([...ast]), mitteS);
    let iT = 1;
    for (let k = 1; k + 1 < ast.length; k++) if (weg(ast[k]!) > weg(ast[iT]!)) iT = k;
    iT = Math.min(ast.length - 2, Math.max(1, iT));
    const vonX = ast.slice(0, iT + 1);
    const vonY = ast.slice(iT).reverse();
    const ka = xVorn ? vonX : vonY;
    const kb = xVorn ? vonY : vonX;
    const umriss = bereinigt([...ast]);
    const lKind = streifenLeiter(ka, kb);
    // Punkte je Ring aus dem Umfang: Kanten etwa so lang wie im Rumpf (Vasenhals 16, dünne Hälse und Flossen 8)
    const N = 8 * Math.min(4, Math.max(1, Math.round(mittlererUmfang(lKind, breiten) / (8 * eUmfang))));
    streifen.push({ teile: [i], ansatz: { art: 'seitlich', eltern: 0, seite: seiteAB, A, B }, umriss, ketten: { a: ka, b: kb }, leiter: lKind, N, kinder: [], uebergang: null });
    streifen[0]!.kinder.push(streifen.length - 1);
  }
  const sk = dok.skalierung;
  const ecken = dok.profile.seite.knoten.filter((kn) => kn.art === 'ecke' && !kn.marke).map((kn) => ({ x: kn.p.x * sk, y: kn.p.y * sk }));
  return { streifen, baum: b, seite, fortsetzung, ueberlappt, ecken };
}

// ---------- Ringe ----------

export type StreifenRinge = {
  /** Stationen (Anteile der Ketten a/b) und Sprossen (o auf Kette a, u auf Kette b) je Ring */
  stationen: { a: number; b: number }[];
  sprossen: { o: V2; u: V2 }[];
  /** Wirbelsäulen-Anteil je Ring (zum Ordnen) */
  f: number[];
  /** Kappenstationen an Spitzen (r = 1 … c/2 − 1, r klein = nahe der Spitze) und die Spitzen selbst */
  kappen: { anfang: { o: V2; u: V2 }[]; ende: { o: V2; u: V2 }[] };
  spitzen: { anfang: V2 | null; ende: V2 };
  /** angesetzte Kinder: Streifen, Seite, erster Ring; Sehnenpunkte (Anteil t von A nach B) */
  kinder: { streifen: number; seite: 'a' | 'b'; ring: number; t: number[] }[];
  /** Ringe auf gezeichneten Ecken (Ringfalte auf der Seite der Ecke) und Ecken an den Spitzen (Punktschärfe) */
  ecken: { ring: number; seite: 'a' | 'b' | 'beide' }[];
  spitzenEcke: { anfang: boolean; ende: boolean };
  /** Ende mit Übergangskappe: der letzte Ring ist ein U um die Sehne A–B (Tiefe in Welt-Einheiten), das Kind beginnt an ihr */
  uebergang: { A: V2; B: V2; tiefe: number; kind: number } | null;
};

export type RingOptionen = {
  /** Kappenanteil der Wirbelsäule an Spitzen */
  kappe: number;
  /** Ringabstand = Kantenlänge × Faktor */
  abstand: number;
  /** Ringvierecke je Streifen höchstens (Ringe ≈ Budget / Punktzahl; Käfig ≤ ≈ 600 Vierecke = 40 000 auf Stufe 3) */
  ringBudget: number;
  /** harte Obergrenze der Ringe je Streifen (Fehler) */
  maxRinge: number;
  /** Kappenanteil an einer gezeichneten Spitze (Ecke): kleine Kappe, die Ringe tragen die Krümmung (wie in der Röhre) */
  kappeSpitze: number;
};

export const RING_STANDARD: RingOptionen = { kappe: 0.05, abstand: 1, ringBudget: 480, maxRinge: 64, kappeSpitze: 0.025 };

/** Sehnenpunkte des ersten Kindrings: gleiche Winkel auf einem runden Ring (Anteil von A nach B). */
export function sehnenAnteile(H: number): number[] {
  return Array.from({ length: H + 1 }, (_, j) => (1 - Math.cos((Math.PI * j) / H)) / 2);
}

/** b-Anteil der Leiter bei einem a-Anteil (bzw. umgekehrt), linear zwischen den Paaren. */
function gegenAnteil(l: Leiter, wert: number, seite: 'a' | 'b'): number {
  const p = l.paare;
  const von = seite === 'a' ? 'a' : 'b';
  const zu = seite === 'a' ? 'b' : 'a';
  if (wert <= p[0]![von]) return p[0]![zu];
  for (let k = 0; k + 1 < p.length; k++) {
    const x0 = p[k]![von];
    const x1 = p[k + 1]![von];
    if (wert >= x0 && wert <= x1) return x1 > x0 ? p[k]![zu] + ((p[k + 1]![zu] - p[k]![zu]) * (wert - x0)) / (x1 - x0) : p[k]![zu];
  }
  return p[p.length - 1]![zu];
}

/** Ellipsenumfang (Ramanujan) aus halber Sprosse und halber Breite. */
function umfang(a: number, b: number): number {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/**
 * Ringe aller Streifen. Reihenfolge der Bestimmung: zuerst die Sehnenpunkte der Kinder (gleiche Winkel), dann je Streifen
 * die festen Ringe unter den Sehnen, dann die freien Abschnitte nach der Kantenlänge.
 */
export function ringeAuslegen(e: Ebene, breiten: Breiten, opt: RingOptionen = RING_STANDARD): StreifenRinge[] {
  const out: StreifenRinge[] = [];
  e.streifen.forEach((st, s) => {
    const l = st.leiter;
    const angesetzt = !!st.ansatz;
    // Wirbelsäulenlänge (Mitten der Sprossen)
    const M = 400;
    const probe = stationenAusLeiter(l, Array.from({ length: M + 1 }, (_, k) => k / M));
    const mitten = probe.map((q) => {
      const o = zugBei(l.ruecken, q.a);
      const u = zugBei(l.bauch, q.b);
      return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2, o, u };
    });
    let L = 0;
    for (let k = 1; k <= M; k++) L += abstand(mitten[k]!, mitten[k - 1]!);
    // örtliche Kantenlänge je Probe, begrenzt auf das 0,5- bis 2-Fache ihres Medians (an dünnen Enden drängten sich sonst die
    // Ringe), dann so gestreckt, dass das Ringbudget des Streifens reicht
    const roh = mitten.map((m) => {
      const halb = abstand(m.o, m.u) / 2;
      let W = Math.min(breiten.top(m.x), breiten.front(m.y));
      if (!(W > 0)) W = halb;
      return Math.max(1e-4, umfang(halb, Math.min(W, 4 * halb)) / st.N);
    });
    const median = [...roh].sort((x, y) => x - y)[Math.floor(roh.length / 2)]!;
    const kante = roh.map((x) => Math.min(2 * median, Math.max(0.5 * median, x)));
    let ringeGesamt = 0;
    for (let k = 1; k <= M; k++) ringeGesamt += abstand(mitten[k]!, mitten[k - 1]!) / (opt.abstand * (kante[k - 1]! + kante[k]!) * 0.5);
    const budget = Math.round(opt.ringBudget / st.N);
    const streckung = ringeGesamt > budget ? ringeGesamt / budget : 1;
    const kanteBei = (f: number) => streckung * kante[Math.min(M, Math.max(0, Math.round(f * M)))]!;
    // feste Ringe unter den Sehnen der Kinder
    type Fest = { f: number; a: number; b: number; o?: V2; u?: V2 };
    const bloecke: { kind: number; seite: 'a' | 'b'; ringe: Fest[]; t: number[] }[] = [];
    for (const k of st.kinder) {
      const kind = e.streifen[k]!;
      const an = kind.ansatz!;
      const H = kind.N / 2;
      const t = sehnenAnteile(H);
      const kette = an.seite === 'a' ? st.ketten.a : st.ketten.b;
      const sA = anteilAufZug(kette, an.A);
      const sB = anteilAufZug(kette, an.B);
      const gA = gegenAnteil(l, sA, an.seite);
      const gB = gegenAnteil(l, sB, an.seite);
      const ringe: Fest[] = t.map((tj, j) => {
        const sj = sA + tj * (sB - sA);
        const gj = gA + ((gB - gA) * j) / H;
        const P = { x: an.A.x + tj * (an.B.x - an.A.x), y: an.A.y + tj * (an.B.y - an.A.y) };
        const f = spineAnteilFuer(l, sj, an.seite === 'a');
        return an.seite === 'a' ? { f, a: sj, b: gj, o: P } : { f, a: gj, b: sj, u: P };
      });
      bloecke.push({ kind: k, seite: an.seite, ringe, t });
    }
    bloecke.sort((x, y) => x.ringe[0]!.f - y.ringe[0]!.f);
    // gezeichnete Ecken auf den Ketten dieses Streifens (nicht die Sehnenenden): an den Spitzen Punktschärfe und kleine
    // Kappe, sonst rückt ein freier Ring auf die Ecke (Ringfalte), wie `stationenWaehlen` in der Röhre
    const sehnenEnden: V2[] = [];
    if (st.ansatz) sehnenEnden.push(st.ansatz.A, st.ansatz.B);
    for (const k of st.kinder) sehnenEnden.push(e.streifen[k]!.ansatz!.A, e.streifen[k]!.ansatz!.B);
    const spitzenEcke = { anfang: false, ende: false };
    const innenEcken: { f: number; seite: 'a' | 'b'; p: V2; t: number }[] = [];
    for (const p of e.ecken) {
      if (sehnenEnden.some((q) => abstand(p, q) < 1e-3)) continue;
      const da = zugAbstand(p, st.ketten.a);
      const db = zugAbstand(p, st.ketten.b);
      if (Math.min(da, db) > 1e-3) continue;
      const seite: 'a' | 'b' = da <= db ? 'a' : 'b';
      const t = anteilAufZug(seite === 'a' ? st.ketten.a : st.ketten.b, p);
      const f = spineAnteilFuer(l, t, seite === 'a');
      if (!angesetzt && f < 0.4 * opt.kappe) spitzenEcke.anfang = true;
      else if (f > 1 - 0.4 * opt.kappe) spitzenEcke.ende = true;
      else innenEcken.push({ f, seite, p, t });
    }
    const kappeAnfang = spitzenEcke.anfang ? opt.kappeSpitze : opt.kappe;
    const kappeEnde = spitzenEcke.ende ? opt.kappeSpitze : opt.kappe;
    // Übergang am Ende: der letzte gewöhnliche Ring liegt eine U-Tiefe (ein Viertel der Sehne) und gut eine Kantenlänge vor
    // der Sehnenmitte; danach kommt das U (Ring R − 1) und die Übergangskappe
    const ue = st.uebergang !== null ? (() => {
      const k = st.uebergang!;
      const an = e.streifen[k]!.ansatz!;
      const tiefe = abstand(an.A, an.B) / 4;
      return { A: an.A, B: an.B, tiefe, kind: k };
    })() : null;
    // Grenzen: Anfang (Kappe oder Sehne), Blöcke, Ende (Kappe oder Übergang)
    const f0 = angesetzt ? 0 : kappeAnfang;
    const f1 = ue ? Math.max(f0 + 0.05, 1 - (ue.tiefe + 0.8 * kanteBei(1)) / L) : 1 - kappeEnde;
    const frei = (fa: number, fb: number): number[] => {
      // Ringe strikt zwischen fa und fb nach der Kantenlänge
      if (!(fb > fa)) return [];
      const K = 60;
      const cum = [0];
      for (let k = 1; k <= K; k++) {
        const x0 = fa + ((fb - fa) * (k - 1)) / K;
        const x1 = fa + ((fb - fa) * k) / K;
        cum.push(cum[k - 1]! + (L * (x1 - x0)) / (opt.abstand * kanteBei((x0 + x1) / 2)));
      }
      const n = Math.max(1, Math.round(cum[K]!));
      const out2: number[] = [];
      for (let r = 1; r < n; r++) {
        const ziel = (cum[K]! * r) / n;
        let k = 0;
        while (k < K - 1 && cum[k + 1]! < ziel) k++;
        const d = cum[k + 1]! - cum[k]!;
        out2.push(fa + ((fb - fa) * (k + (d > 0 ? (ziel - cum[k]!) / d : 0))) / K);
      }
      return out2;
    };
    const ringe: Fest[] = [];
    const ausF = (f: number): Fest => {
      const q = stationenAusLeiter(l, [f])[0]!;
      return { f, a: q.a, b: q.b };
    };
    let fa = f0;
    ringe.push(angesetzt ? { f: 0, a: 0, b: 0, o: st.ansatz!.A, u: st.ansatz!.B } : ausF(f0));
    const kinderRinge: StreifenRinge['kinder'] = [];
    for (const bl of bloecke) {
      const erster = bl.ringe[0]!.f;
      // mindestens ein freier Ring zwischen Anfang und Block
      const zw = frei(fa, erster);
      for (const f of zw.length ? zw : [(fa + erster) / 2]) ringe.push(ausF(f));
      kinderRinge.push({ streifen: bl.kind, seite: bl.seite, ring: ringe.length, t: bl.t });
      for (const r of bl.ringe) ringe.push(r);
      fa = bl.ringe[bl.ringe.length - 1]!.f;
    }
    // nach dem letzten Block mindestens ein freier Ring vor dem Endring (der Ansatz liegt zwischen den Endringen)
    const zw = frei(fa, f1);
    for (const f of zw.length || !bloecke.length ? zw : [(fa + f1) / 2]) ringe.push(ausF(f));
    ringe.push(ausF(f1));
    if (ue) ringe.push({ f: 1, a: 1, b: 1, o: ue.A, u: ue.B });
    // innere Ecken: der nächste freie Ring (nicht Anfang/Ende, nicht unter einer Sehne) rückt genau auf die Ecke
    const fest = new Set<number>([0, ringe.length - 1]);
    for (const kr of kinderRinge) for (let j = 0; j <= e.streifen[kr.streifen]!.N / 2; j++) fest.add(kr.ring + j);
    const eckRinge: StreifenRinge['ecken'] = [];
    for (const ec of innenEcken.sort((x, y) => x.f - y.f)) {
      // gegenüberliegende Ecken (Hinterkopf und Innenecke unter dem Kopf) teilen sich einen Ring: Falte auf beiden Seiten
      const da = eckRinge.find((x) => x.seite !== ec.seite && x.seite !== 'beide' && Math.abs(ringe[x.ring]!.f - ec.f) < 0.5 * Math.min(ringe[x.ring]!.f - ringe[x.ring - 1]!.f, ringe[x.ring + 1]!.f - ringe[x.ring]!.f));
      if (da) {
        const r = ringe[da.ring]!;
        ringe[da.ring] = ec.seite === 'a' ? { f: r.f, a: ec.t, b: r.b, o: ec.p, ...(r.u ? { u: r.u } : {}) } : { f: r.f, a: r.a, b: ec.t, u: ec.p, ...(r.o ? { o: r.o } : {}) };
        da.seite = 'beide';
        continue;
      }
      let best = -1;
      for (let i = 1; i + 1 < ringe.length; i++) {
        if (fest.has(i)) continue;
        if (best < 0 || Math.abs(ringe[i]!.f - ec.f) < Math.abs(ringe[best]!.f - ec.f)) best = i;
      }
      if (best < 0) continue;
      // Reihenfolge und Abstand zu den Nachbarn müssen erhalten bleiben (sonst kreuzen sich Sprossen bzw. fallen zwei Ringe
      // fast zusammen: Fisch, Ecke am Schwanzansatz neben dem Sehnenring, 172°)
      const luecke = 0.3 * Math.min(ringe[best]!.f - ringe[best - 1]!.f, ringe[best + 1]!.f - ringe[best]!.f);
      if (!(ringe[best - 1]!.f + luecke < ec.f && ec.f < ringe[best + 1]!.f - luecke)) {
        const schon = eckRinge.find((x) => x.ring === best);
        if (schon && schon.seite !== ec.seite) schon.seite = 'beide';
        continue;
      }
      const g = gegenAnteil(l, ec.t, ec.seite);
      ringe[best] = ec.seite === 'a' ? { f: ec.f, a: ec.t, b: g, o: ec.p } : { f: ec.f, a: g, b: ec.t, u: ec.p };
      fest.add(best);
      eckRinge.push({ ring: best, seite: ec.seite });
    }
    // Fächer spreizen: Laufen mehrere Sprossen auf einer Kette in einem Punkt zusammen (Innenecke einer Kehrtwende, Ente:
    // Hals → Kopf), werden ihre Enden dort entlang der Kette auseinandergeschoben, bis jedes mindestens ein Drittel des
    // mittleren Abstands von seinen Nachbarn hat; feste Enden (Sehnen, Ecken, Endringe) bleiben
    for (const kette of ['a', 'b'] as const) {
      const fix = new Set<number>([0, ringe.length - 1]);
      for (const kr of kinderRinge) if (kr.seite === kette) for (let j = 0; j <= e.streifen[kr.streifen]!.N / 2; j++) fix.add(kr.ring + j);
      for (const er of eckRinge) if (er.seite === kette || er.seite === 'beide') fix.add(er.ring);
      const wert = ringe.map((r) => r[kette]);
      const abst = wert.slice(1).map((x, i) => x - wert[i]!).sort((x, y) => x - y);
      const gap = abst.length ? (abst.reduce((x, y) => x + y, 0) / abst.length) / 3 : 0;
      let geaendert = false;
      for (let it = 0; it < 80; it++) {
        let neu = false;
        for (let i = 1; i + 1 < wert.length; i++) {
          if (fix.has(i)) continue;
          if (wert[i]! - wert[i - 1]! < gap || wert[i + 1]! - wert[i]! < gap) {
            const mid = (wert[i - 1]! + wert[i + 1]!) / 2;
            if (Math.abs(mid - wert[i]!) > 1e-9) {
              wert[i] = mid;
              neu = true;
            }
          }
        }
        if (!neu) break;
        geaendert = true;
      }
      if (!geaendert) continue;
      wert.forEach((w, i) => {
        if (fix.has(i) || ringe[i]![kette] === w) return;
        const r = ringe[i]!;
        // das verschobene Ende liegt danach auf der Kette (ein fester Punkt gilt nur für das andere Ende)
        ringe[i] = kette === 'a' ? { f: r.f, a: w, b: r.b, ...(r.u ? { u: r.u } : {}) } : { f: r.f, a: r.a, b: w, ...(r.o ? { o: r.o } : {}) };
      });
    }
    // Kappenstationen an Spitzen (c/2 − 1 je Kappe)
    const c = st.N / 4;
    const kappeVon = (seite: 'anfang' | 'ende') =>
      Array.from({ length: c / 2 - 1 }, (_, r) => {
        const kp = seite === 'anfang' ? kappeAnfang : kappeEnde;
        const f = seite === 'anfang' ? (kp * (r + 1)) / (c / 2) : 1 - (kp * (r + 1)) / (c / 2);
        const q = stationenAusLeiter(l, [f])[0]!;
        return { o: zugBei(l.ruecken, q.a), u: zugBei(l.bauch, q.b) };
      });
    out.push({
      stationen: ringe.map((r) => ({ a: r.a, b: r.b })),
      sprossen: ringe.map((r) => ({ o: r.o ?? zugBei(l.ruecken, r.a), u: r.u ?? zugBei(l.bauch, r.b) })),
      f: ringe.map((r) => r.f),
      kappen: { anfang: angesetzt ? [] : kappeVon('anfang'), ende: ue ? [] : kappeVon('ende') },
      spitzen: { anfang: angesetzt ? null : l.ruecken[0]!, ende: ue ? { x: (ue.A.x + ue.B.x) / 2, y: (ue.A.y + ue.B.y) / 2 } : l.ruecken[l.ruecken.length - 1]! },
      kinder: kinderRinge,
      ecken: eckRinge,
      spitzenEcke,
      uebergang: ue,
    });
    if (ringe.length > opt.maxRinge) throw new Error(`ringeAuslegen: Streifen ${s} mit ${ringe.length} Ringen`);
  });
  return out;
}
