// Wesen-Editor 2, Beweis 2 „Maul mit Haps“ (13.10.2026): das Maul im Käfig.
//
// Die Maullinie (Seitenansicht, rechte Hälfte, von der Schnauzenspitze zum Mundwinkel) wird ein Kantenpfad des Käfigs:
// die Kappenzeile b_L durch die Spitze und die Längsschleife j_L = 3c/2 − b_L bis zum Winkelring k. Jeder Ring und jeder
// Quadratring der Kappe wird so umparametrisiert, dass sein Lippenpunkt auf der Linie liegt („Schleife einrasten“, Plan
// 4.2); die übrigen Punkte verteilen sich nach Bogenlänge ober- und unterhalb. Dann wird der Pfad geschlitzt (obere und
// untere Kopie je Pfadpunkt, der Mundwinkel bleibt ein Punkt), die Tasche entsteht als K Inset-Reihen nach innen
// (Lippe, Zahnfleisch, Rachen), und ein m×m-Gitter schließt den Rachen: nur Vierecke, spiegelsymmetrisch über die
// Gegendiagonale, die Naht bleibt eine Schleife. Die Lippenkanten sind scharfe Falten.
// Kiefer: zwei starre Drehungen um die Achse durch die Mundwinkel (Schädel kippt zurück, Unterkiefer fällt), Gewichte
// aus der Lage zum Schlitz, weiches Band über die Ringe hinter dem Winkel. Posen laufen auf dem Käfig, die Matrix
// liefert das feine Netz (Plan 4.4, 5.2).

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { type Kaefig, alleFlaechen, kaefigAusFlaechen, kanteZwischen, pruefeKaefig } from '../kaefig/halbkanten';
import { type Roehre, roehre } from '../kaefig/roehre';
import { luLoesen, luZerlegen } from '../loeser/lu';
import { anwenden3 } from '../subdivision/matrix';
import { type Leiter, WIRBEL_STANDARD, leiter } from '../versuch/wirbelsaeule';
import {
  ABLEIT_STANDARD,
  type AbleitOptionen,
  type Ableitung,
  type SchlitzLage,
  type Stationen,
  faltenSetzen,
  fertigstellen,
  quadratRing,
  stationenAusLeiter,
  stationenWaehlen,
  zieleBerechnen,
  zugBei,
} from './ableiten';
import { silhouettenBreite } from './breite';

/**
 * Maullinie in Wirbelsäulen-Koordinaten: Anteil f der Wirbelsäulenlänge (0 = Spitze) und Höhe v auf der Sprosse
 * (0 Bauch … 1 Rücken), aufsteigend in f, letzter Punkt = Mundwinkel. So liegt die Lippe immer auf der Fläche, auch wo
 * die Sprossen fächern (Hinterkopf, Halsansatz). Eine gezeichnete 2D-Linie wird mit `maulLinieAusPunkten` übersetzt.
 */
export type MaulLinie = { fv: { f: number; v: number }[] };

export type MaulOptionen = {
  /** Inset-Reihen der Tasche (Lippe → Rachen) */
  reihen: number;
  /** Anteil des Wegs Lippe → Rachenlinie, den die letzte Reihe geht */
  tiefe: number;
  /** halbe Dicke der geschlossenen Tasche (Linse), Anteil der Körperhöhe */
  linse: number;
  /** Rachenziel je Lippenpunkt: Ringmitte bei der Station Lippe + rachenTiefe · (Winkel − Lippe) (nie hinter dem Scharnier, sonst schwingt die Tasche beim Öffnen durch); seitlich Anteil der Winkelbreite */
  rachenTiefe: number;
  rachenInnen: number;
  /** Schädelgelenk hinter dem Winkelring: Anteil der Maullänge nach hinten (Werkstatt: der Schädel kippt um ein Gelenk am Hinterkopf) */
  schaedelHinter: number;
  /** Kantenschärfe der Lippen */
  lippenSchaerfe: number;
  /** Ringe hinter dem Winkelring, über die das Gewicht ausläuft: Unterkiefer (Kehle) und Schädel (Nacken) */
  band: number;
  bandOben: number;
  /** Hinter dem Winkel folgt der ganze Ring dem Schädelband (Nacken biegt als Ganzes) statt nur die obere Hälfte */
  nackenGanz: boolean;
  /** größte Winkel (Grad) von Unterkiefer und Schädel bei Öffnung 1 */
  winkelUnten: number;
  winkelOben: number;
  /** Öffnungsart (Plan 5.2): „kippen“ = Unterkiefer dreht um die Mundwinkel (Rex, Schnabel); „ziehen“ = Unterkiefer
   * gleitet wie ein Vorhang vom Rachen weg (Robbe, Drache mit Maul bis zum Hals), Weite als Anteil der Maullänge */
  oeffnungsart: 'kippen' | 'ziehen';
  zugWeite: number;
  /** Rille: beide Lippenketten geschlossen um diesen Anteil der Körperhöhe nach innen (dunkle Maullinie wie auf den Bögen; Ober- und Unterhaut treffen sich im Winkel statt tangential), zum Winkel auslaufend */
  rille: number;
  /** Kieferplatte: bis zu diesem Anteil der Maullänge unter der Lippe dreht die Haut starr mit; darunter folgt die Kehlhaut der Plattenkante als Verschiebung, auslaufend über `beutel` Maullängen */
  platte: number;
  beutel: number;
};

export const MAUL_STANDARD: MaulOptionen = { reihen: 3, tiefe: 0.9, linse: 0.03, rachenTiefe: 0.7, rachenInnen: 0.55, schaedelHinter: 0.45, lippenSchaerfe: 1e6, band: 2, bandOben: 8, nackenGanz: false, winkelUnten: 58, winkelOben: 15, oeffnungsart: 'kippen', zugWeite: 0.5, rille: 0.012, platte: 10, beutel: 0.5 };

/** Maul-Optionen je vorgefertigter Lage: vorn/unten kippen (Rex), hals zieht (Drache) mit ruhigem Schädel. */
export function maulOptionenVorlage(art: 'vorn' | 'unten' | 'hals'): Partial<MaulOptionen> {
  return art === 'hals' ? { oeffnungsart: 'ziehen', winkelOben: 4, band: 3, nackenGanz: true } : {};
}

/** Lage des Schlitzes im Gitter samt Lippenhöhen (für die Umparametrisierung) und Mundwinkel. */
export type MaulLage = SchlitzLage & { m: number; winkel: V2; start: V2 };

/** Art je Käfigpunkt: 0 Haut, 1 Lippe oben, 2 Lippe unten, 3 Tasche oben, 4 Tasche unten, 6 Winkelsäule */
export type MaulAbleitung = {
  lage: MaulLage;
  opt: MaulOptionen;
  /** Pfadpunkte (obere Kopie = Vorlagen-Index), 0 = Naht … m = Mundwinkel; rechts und links */
  pfad: number[];
  pfadLinks: number[];
  /** untere Kopien (t = 0 … m − 1; Index 0 geteilt) */
  unten: number[];
  untenLinks: number[];
  /** Taschenreihen r = 1 … K: Index [r − 1][t] für t = 0 … m − 1; Winkelsäule [r − 1] */
  tasche: { oben: number[][]; unten: number[][]; obenLinks: number[][]; untenLinks: number[][]; winkel: number[]; winkelLinks: number[] };
  art: Uint8Array;
  /** Tiefe 0 (Lippe) … 1 (Rachenwand) für Tasche und Rachen */
  tiefe: Float64Array;
  /** Abstand zur Lippenkante (Welt) je Käfigpunkt, Unterlippenseite 0/1 */
  lippenAbstand: Float64Array;
  untenSeite: Float64Array;
  /** Herkunft (Vorlagen-Index) je Käfigpunkt, für Deskriptoren */
  quelle: Int32Array;
  /** Kiefergewichte, Scharnier des Unterkiefers (Achse z durch den Mundwinkel) und Schädelgelenk (hinten) */
  gewichtUnten: Float64Array;
  gewichtOben: Float64Array;
  scharnier: V2;
  schaedel: V2;
  /** Vorzeichen: +1 wenn die Schnauze bei kleinerem x liegt */
  vorn: number;
  hoehe: number;
  /** Zugrichtung (Welt, Seitenansicht) für „ziehen“: mittlere Richtung vom Rachen zur Lippe */
  zug: V2;
  /** Maullänge (Welt, x) */
  laenge: number;
  /** Kehlhaut unter der Kieferplatte: Gewicht je Käfigpunkt (0 = keine) und Ring, dessen Plattenkante sie folgt */
  beutelGewicht: Float64Array;
  beutelRing: Int16Array;
  /** Plattenkante je Ring (3 Werte): Lippenpunkt um die Plattendicke nach unten */
  plattenKante: Float64Array;
};

export type MaulErgebnis = Ableitung & { maul: MaulAbleitung };

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

// ---------- Lage ----------

/** Wirbelsäulen-Anteil f (0 … 1) je Station: Umkehrung von `stationenAusLeiter` über die Rückenanteile der Leiter. */
export function spineAnteile(l: Leiter, st: readonly { a: number; b: number }[]): number[] {
  const mitten = l.paare.map((pr) => {
    const o = zugBei(l.ruecken, pr.a);
    const u = zugBei(l.bauch, pr.b);
    return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 };
  });
  const cum = [0];
  for (let k = 1; k < mitten.length; k++) cum.push(cum[k - 1]! + Math.hypot(mitten[k]!.x - mitten[k - 1]!.x, mitten[k]!.y - mitten[k - 1]!.y));
  const L = cum[cum.length - 1]! || 1;
  return st.map((s) => {
    const a = s.a;
    let k = 0;
    while (k + 2 < l.paare.length && l.paare[k + 1]!.a < a) k++;
    const a0 = l.paare[k]!.a;
    const a1 = l.paare[k + 1]!.a;
    const t = a1 > a0 ? Math.min(1, Math.max(0, (a - a0) / (a1 - a0))) : 0;
    return (cum[k]! + (cum[k + 1]! - cum[k]!) * t) / L;
  });
}

/** Höhe v der Maullinie beim Anteil f (linear zwischen den Stützen, außen festgehalten). */
function lippenHoehe(linie: MaulLinie, f: number): number {
  const fv = linie.fv;
  if (f <= fv[0]!.f) return fv[0]!.v;
  for (let i = 0; i + 1 < fv.length; i++) {
    const a = fv[i]!;
    const b = fv[i + 1]!;
    if (f >= a.f && f <= b.f) return b.f > a.f ? a.v + ((b.v - a.v) * (f - a.f)) / (b.f - a.f) : b.v;
  }
  return fv[fv.length - 1]!.v;
}

/** Punkt (Welt, Seitenansicht) der Sprosse beim Anteil f auf Höhe v. */
function punktBei(l: Leiter, f: number, v: number): V2 {
  const st = stationenAusLeiter(l, [f])[0]!;
  const o = zugBei(l.ruecken, st.a);
  const u = zugBei(l.bauch, st.b);
  return { x: u.x + (o.x - u.x) * v, y: u.y + (o.y - u.y) * v };
}

/** Maullinie dicht als Welt-Polygonzug (Seitenansicht), z. B. zum Zeichnen und Messen. */
export function maulLiniePunkte(dok: Dokument, linie: MaulLinie, n = 64): V2[] {
  const l = leiter(dok, WIRBEL_STANDARD);
  const f0 = 0;
  const f1 = linie.fv[linie.fv.length - 1]!.f;
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const f = f0 + ((f1 - f0) * i) / n;
    out.push(punktBei(l, f, lippenHoehe(linie, f)));
  }
  return out;
}

/** Gezeichnete 2D-Linie (Welt) → Wirbelsäulen-Koordinaten: je Punkt die nächste Sprosse der Leiter und die Höhe darauf. */
export function maulLinieAusPunkten(dok: Dokument, punkte: readonly V2[]): MaulLinie {
  const l = leiter(dok, WIRBEL_STANDARD);
  const fv: { f: number; v: number }[] = [];
  for (const p of punkte) {
    let best = { k: 0, d: Infinity, v: 0.5 };
    l.paare.forEach((pr, k) => {
      const o = zugBei(l.ruecken, pr.a);
      const u = zugBei(l.bauch, pr.b);
      const dx = o.x - u.x;
      const dy = o.y - u.y;
      const l2 = dx * dx + dy * dy || 1;
      const v = Math.min(1, Math.max(0, ((p.x - u.x) * dx + (p.y - u.y) * dy) / l2));
      const d = Math.hypot(u.x + dx * v - p.x, u.y + dy * v - p.y);
      if (d < best.d) best = { k, d, v };
    });
    const f = spineAnteile(l, [l.paare[best.k]!])[0]!;
    if (fv.length === 0 || f > fv[fv.length - 1]!.f) fv.push({ f, v: best.v });
  }
  if (fv.length < 2) throw new Error('Maullinie: zu kurz');
  return { fv };
}

/**
 * Lage des Schlitzes: Kappenzeile durch die Spitze, Längsschleife j_L, Lippenhöhe je Ring und Quadratring aus der Linie,
 * Winkelring = Ring mit dem Wirbelsäulen-Anteil des Mundwinkels; seine Station wird auf den Winkel gelegt (der Ring
 * rastet auf den Winkel, nicht der Winkel auf den Ring), solange die Reihenfolge der Stationen bleibt.
 */
export function maulLage(v: Roehre, l: Leiter, st: Stationen, linie: MaulLinie): MaulLage {
  const { R, c } = v;
  if (linie.fv.length < 2) throw new Error('Maullinie braucht mindestens zwei Stützen');
  const bL = c / 2;
  const jL = (3 * c) / 2 - bL;
  const ende = linie.fv[linie.fv.length - 1]!;
  const fRinge = spineAnteile(l, st.ringe);
  let k = 1;
  for (let i = 1; i <= R - 2; i++) if (Math.abs(fRinge[i]! - ende.f) < Math.abs(fRinge[k]! - ende.f)) k = i;
  const vorher = fRinge[k - 1]!;
  const nachher = fRinge[k + 1]!;
  if (ende.f > vorher && ende.f < nachher) {
    st.ringe[k] = stationenAusLeiter(l, [ende.f])[0]!;
    fRinge[k] = ende.f;
  }
  const vRing = new Float64Array(R).fill(NaN);
  for (let i = 0; i < k; i++) vRing[i] = lippenHoehe(linie, fRinge[i]!);
  vRing[k] = ende.v;
  const fKappen = spineAnteile(l, st.kappen.vorn);
  const vKappe = new Float64Array(c / 2).fill(NaN);
  for (let r = 1; r < c / 2; r++) vKappe[r] = lippenHoehe(linie, fKappen[r - 1]!);
  const spitze = l.ruecken[0]!;
  return { bL, jL, k, m: c / 2 + k, vRing, vKappe, winkel: punktBei(l, ende.f, ende.v), start: { x: spitze.x, y: spitze.y } };
}

// ---------- Topologie ----------

type Lage3 = { art: 'ring'; i: number; j: number } | { art: 'vorn' | 'hinten'; a: number; b: number };

/** Gitterstelle eines Vorlagen-Index (Ring i, j oder Kappe a, b); Ring-0/R−1-Punkte bleiben Ringe. */
function gitterLage(v: Roehre, idx: number): Lage3 {
  const { R, N, c } = v;
  const innen = (c - 1) * (c - 1);
  const vornStart = R * N;
  if (idx < vornStart) return { art: 'ring', i: Math.floor(idx / N), j: idx % N };
  const seite = idx < vornStart + innen ? 'vorn' : 'hinten';
  const q = idx - (seite === 'vorn' ? vornStart : vornStart + innen);
  return { art: seite, a: (q % (c - 1)) + 1, b: Math.floor(q / (c - 1)) + 1 };
}

/** Umkehrung von randJ: Ringindex j von Ring 0 → Kappenrand (a, b). */
function randAB(c: number, j: number): [number, number] {
  if (j <= c / 2) return [c / 2 + j, c];
  if (j <= (3 * c) / 2) return [c, (3 * c) / 2 - j];
  if (j <= (5 * c) / 2) return [(5 * c) / 2 - j, 0];
  if (j <= (7 * c) / 2) return [0, j - (5 * c) / 2];
  return [j - (7 * c) / 2, c];
}

const lerp3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * Käfig mit Maul aus der Vorlage: Schlitz entlang des Pfads, Tasche, Rachengitter; Ziele für alle Punkte (geschlossen).
 * Die Vorlagen-Indizes bleiben gültig (obere Kopien), neue Punkte hängen an.
 */
export function maulKaefig(v: Roehre, st: Stationen, lage: MaulLage, zieleV: Float64Array, hoeheV: Float64Array, opt: MaulOptionen): { kaefig: Kaefig; ziele: Float64Array; hoehe: Float64Array; info: MaulAbleitung } {
  const { N, c } = v;
  const n0 = v.kaefig.n;
  const { bL, jL, k, m } = lage;
  const K = Math.max(1, opt.reihen);
  // Pfad (obere Kopie = Vorlagenindex)
  const pfad: number[] = [];
  const pfadLinks: number[] = [];
  for (let t = 0; t <= c / 2; t++) {
    pfad.push(v.kappe('vorn', c / 2 + t, bL));
    pfadLinks.push(v.kappe('vorn', c / 2 - t, bL));
  }
  for (let i = 1; i <= k; i++) {
    pfad.push(v.ringPunkt(i, jL));
    pfadLinks.push(v.ringPunkt(i, N - jL));
  }
  if (pfad.length !== m + 1) throw new Error('Maul: Pfadlänge passt nicht');
  let naechster = n0;
  const neu = () => naechster++;
  const unten: number[] = [];
  const untenLinks: number[] = [];
  for (let t = 0; t < m; t++) unten.push(neu());
  untenLinks.push(unten[0]!);
  for (let t = 1; t < m; t++) untenLinks.push(neu());
  const tOben = new Map<number, { t: number; links: boolean }>();
  for (let t = 0; t < m; t++) {
    tOben.set(pfad[t]!, { t, links: false });
    if (t > 0) tOben.set(pfadLinks[t]!, { t, links: true });
  }
  // Flächen der Vorlage: unterhalb des Schlitzes auf die unteren Kopien umschreiben
  const flaechen = alleFlaechen(v.kaefig).map((f) => [...f]);
  const seiteVon = (f: readonly number[]): 'oben' | 'unten' => {
    const lagen = f.map((idx) => gitterLage(v, idx));
    const kappe = lagen.some((x) => x.art === 'vorn');
    if (kappe) {
      let bMin = Infinity;
      let bMax = -Infinity;
      for (const x of lagen) {
        const b = x.art === 'vorn' ? x.b : x.art === 'ring' ? randAB(c, x.j)[1] : NaN;
        bMin = Math.min(bMin, b);
        bMax = Math.max(bMax, b);
      }
      if (bMin >= bL) return 'oben';
      if (bMax <= bL) return 'unten';
      throw new Error('Maul: Kappenfläche kreuzt die Lippenzeile');
    }
    // Ringfläche: j-Bereich im kleineren Ring
    const ringe = lagen.filter((x): x is { art: 'ring'; i: number; j: number } => x.art === 'ring');
    const i0 = Math.min(...ringe.map((x) => x.i));
    const js = ringe.filter((x) => x.i === i0).map((x) => x.j);
    const j0 = js.includes(0) && js.includes(N - 1) ? N - 1 : Math.min(...js);
    if (j0 < N / 2) return j0 >= jL ? 'unten' : 'oben';
    return j0 >= N - jL ? 'oben' : 'unten';
  };
  for (const f of flaechen) {
    if (!f.some((idx) => tOben.has(idx))) continue;
    if (seiteVon(f) !== 'unten') continue;
    for (let q = 0; q < f.length; q++) {
      const o = tOben.get(f[q]!);
      if (o) f[q] = o.links ? untenLinks[o.t]! : unten[o.t]!;
    }
  }
  // Tasche: Reihen 1 … K
  const tasche = { oben: [] as number[][], unten: [] as number[][], obenLinks: [] as number[][], untenLinks: [] as number[][], winkel: [] as number[], winkelLinks: [] as number[] };
  for (let r = 1; r <= K; r++) {
    const o: number[] = [];
    const u: number[] = [];
    const oL: number[] = [];
    const uL: number[] = [];
    for (let t = 0; t < m; t++) {
      o.push(neu());
      u.push(neu());
    }
    oL.push(o[0]!);
    uL.push(u[0]!);
    for (let t = 1; t < m; t++) {
      oL.push(neu());
      uL.push(neu());
    }
    tasche.oben.push(o);
    tasche.unten.push(u);
    tasche.obenLinks.push(oL);
    tasche.untenLinks.push(uL);
    tasche.winkel.push(neu());
    tasche.winkelLinks.push(neu());
  }
  const O = (r: number, t: number, links: boolean): number => (t === m ? (r === 0 ? (links ? pfadLinks[m]! : pfad[m]!) : links ? tasche.winkelLinks[r - 1]! : tasche.winkel[r - 1]!) : r === 0 ? (links ? pfadLinks[t]! : pfad[t]!) : links ? tasche.obenLinks[r - 1]![t]! : tasche.oben[r - 1]![t]!);
  const U = (r: number, t: number, links: boolean): number => (t === m ? O(r, t, links) : r === 0 ? (links ? untenLinks[t]! : unten[t]!) : links ? tasche.untenLinks[r - 1]![t]! : tasche.unten[r - 1]![t]!);
  // Umlaufsinn aus der Haut: Die obere Hautfläche an der Lippenkante (pfad[0] → pfad[1]) läuft in Richtung s;
  // das obere rechte Taschenblatt muss die Kante entgegengesetzt durchlaufen (d = −s), das untere rechte mit +s,
  // links jeweils gespiegelt; das Rachengitter in seiner Standardreihenfolge passt zu d = −1.
  let s = 0;
  for (const f of flaechen) {
    const i0 = f.indexOf(pfad[0]!);
    const i1 = f.indexOf(pfad[1]!);
    if (i0 < 0 || i1 < 0) continue;
    s = (i0 + 1) % f.length === i1 ? 1 : -1;
    break;
  }
  if (s === 0) throw new Error('Maul: Hautfläche an der Lippe nicht gefunden');
  const d = -s;
  const streifen = (A: (t: number) => number, B: (t: number) => number, w: number): number[][] => {
    const out: number[][] = [];
    for (let t = 0; t < m; t++) out.push(w > 0 ? [A(t), A(t + 1), B(t + 1), B(t)] : [A(t + 1), A(t), B(t), B(t + 1)]);
    return out;
  };
  const taschenFlaechen: number[][] = [];
  for (let r = 1; r <= K; r++) {
    taschenFlaechen.push(...streifen((t) => O(r - 1, t, false), (t) => O(r, t, false), d));
    taschenFlaechen.push(...streifen((t) => U(r - 1, t, false), (t) => U(r, t, false), -d));
    taschenFlaechen.push(...streifen((t) => O(r - 1, t, true), (t) => O(r, t, true), -d));
    taschenFlaechen.push(...streifen((t) => U(r - 1, t, true), (t) => U(r, t, true), d));
  }
  // Rachenwand: Vorhang zwischen oberer und unterer Reihe K je Spalte t (Vierecke), in den Mundwinkeln ein Dreieck
  // (die Winkelsäule ist ein Punkt). Umlaufsinn wie die Blätter: zu d = +1 passt [U(K,t), U(K,t+1), L(K,t+1), L(K,t)].
  const vorhang = (links: boolean): number[][] => {
    const out: number[][] = [];
    for (let t = 0; t + 1 < m; t++) {
      const f = [O(K, t, links), O(K, t + 1, links), U(K, t + 1, links), U(K, t, links)];
      out.push((d > 0) !== links ? f : f.reverse());
    }
    const dreieck = [O(K, m - 1, links), O(K, m, links), U(K, m - 1, links)];
    out.push((d > 0) !== links ? dreieck : dreieck.reverse());
    return out;
  };
  taschenFlaechen.push(...vorhang(false), ...vorhang(true));
  const n = naechster;

  // ----- Ziele (geschlossen) -----
  const ziele = new Float64Array(3 * n);
  const hoehe = new Float64Array(n);
  ziele.set(zieleV);
  hoehe.set(hoeheV);
  const quelle = new Int32Array(n);
  for (let i = 0; i < n0; i++) quelle[i] = i;
  const P = (idx: number): [number, number, number] => [ziele[3 * idx]!, ziele[3 * idx + 1]!, ziele[3 * idx + 2]!];
  const spiegel = (p: [number, number, number]): [number, number, number] => [p[0], p[1], -p[2]];
  const setze = (idx: number, p: [number, number, number]) => {
    ziele[3 * idx] = p[0];
    ziele[3 * idx + 1] = p[1];
    ziele[3 * idx + 2] = p[2];
  };
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < n0; i++) {
    yMin = Math.min(yMin, zieleV[3 * i + 1]!);
    yMax = Math.max(yMax, zieleV[3 * i + 1]!);
  }
  const H = Math.max(1e-6, yMax - yMin);
  // „oben“ je Pfadpunkt: Richtung der Haut längs der Schleife an der Lippe, von der Unterseite zur Oberseite (Ring:
  // Nachbarn j_L − 1 und j_L + 1; Kappe: Zeile b_L + 1 und b_L − 1). Trennt Ober- und Unterblatt der Tasche und ist an
  // der Naht in der Spiegelebene.
  const obenBei = (t: number): [number, number, number] => {
    const g = gitterLage(v, pfad[t]!);
    let a: [number, number, number];
    let b: [number, number, number];
    if (g.art === 'ring') {
      a = P(v.ringPunkt(g.i, g.j - 1));
      b = P(v.ringPunkt(g.i, g.j + 1));
    } else if (g.art === 'vorn') {
      a = P(v.kappe('vorn', g.a, g.b + 1));
      b = P(v.kappe('vorn', g.a, g.b - 1));
    } else return [0, 1, 0];
    const d3: [number, number, number] = [a[0] - b[0], a[1] - b[1], t === 0 ? 0 : a[2] - b[2]];
    const l = Math.hypot(...d3) || 1;
    return [d3[0] / l, d3[1] / l, d3[2] / l];
  };
  // Überbiss-Richtung: zur Ringmitte, ohne den Anteil längs „oben“ (= Hautnormale nach innen)
  const innenRichtung = (t: number): [number, number, number] => {
    const g = gitterLage(v, pfad[t]!);
    const p = P(pfad[t]!);
    const ring = g.art === 'ring' ? g.i : 0;
    const c3: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < N; j++) for (let d = 0; d < 3; d++) c3[d] = c3[d]! + zieleV[3 * v.ringPunkt(ring, j) + d]! / N;
    const o = obenBei(t);
    const d3: [number, number, number] = [c3[0] - p[0], c3[1] - p[1], c3[2] - p[2]];
    const dot = d3[0] * o[0] + d3[1] * o[1] + d3[2] * o[2];
    const r3: [number, number, number] = [d3[0] - dot * o[0], d3[1] - dot * o[1], d3[2] - dot * o[2]];
    const l = Math.hypot(...r3) || 1;
    return [r3[0] / l, r3[1] / l, t === 0 ? 0 : r3[2] / l];
  };
  // Rille: beide Ketten nach innen (Hautnormale), zum Winkel auslaufend; obere und untere Kette bleiben gleich
  for (let t = 0; t < m; t++) {
    const p = P(pfad[t]!);
    const r3 = innenRichtung(t);
    const e = opt.rille * H * (1 - (t / m) * (t / m));
    const q: [number, number, number] = [p[0] + r3[0] * e, p[1] + r3[1] * e, t === 0 ? 0 : p[2] + r3[2] * e];
    setze(pfad[t]!, q);
    setze(unten[t]!, q);
    quelle[unten[t]!] = pfad[t]!;
    hoehe[unten[t]!] = hoeheV[pfad[t]!]!;
    if (t > 0) {
      setze(pfadLinks[t]!, spiegel(q));
      setze(untenLinks[t]!, spiegel(q));
      quelle[untenLinks[t]!] = pfadLinks[t]!;
      hoehe[untenLinks[t]!] = hoeheV[pfadLinks[t]!]!;
    }
  }
  // Rachenlinie: von der Mitte (hinter dem Winkel, auf der Lippenhöhe des Winkels) zum Punkt hinter dem Winkel innen
  const S = P(pfad[0]!);
  const M = P(pfad[m]!);
  const vorn = Math.sign(S[0] - M[0]) || -1;
  const L = Math.max(1e-6, Math.abs(M[0] - S[0]));
  // Rachenziel je Pfadpunkt: auf der Wirbelsäule (Ringmitten) bei der Station zwischen Lippenstation und Winkelring,
  // seitlich anteilig zur Winkelbreite. So bleibt die Tasche im Körper, auch wenn das Maul um den Hinterkopf in den
  // Hals läuft (Drache), und sie reicht nie hinter das Scharnier (sonst schwingt sie beim Öffnen durch).
  const ringMitte = (i: number): [number, number, number] => {
    const c3: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < N; j++) for (let d = 0; d < 3; d++) c3[d] = c3[d]! + zieleV[3 * v.ringPunkt(i, j) + d]! / N;
    return c3;
  };
  const mitten: [number, number, number][] = [];
  for (let i = 0; i <= k; i++) mitten.push(ringMitte(i));
  const stationVon = (t: number): number => {
    const g = gitterLage(v, pfad[t]!);
    return g.art === 'ring' ? g.i : 0;
  };
  const Tvon = (t: number): [number, number, number] => {
    const i0 = stationVon(t);
    const ic = Math.min(k, i0 + opt.rachenTiefe * (k - i0));
    const a = Math.floor(ic);
    const b = Math.min(k, a + 1);
    const f = ic - a;
    const c3 = lerp3(mitten[a]!, mitten[b]!, f);
    return [c3[0], c3[1], (M[2] * opt.rachenInnen * t) / m];
  };
  // lokale Dicke je Pfadpunkt: Abstand der Lippe zur Haut darüber und darunter (Ring bzw. Quadratring), Linse höchstens ein Drittel davon
  const dickeBei = (t: number): number => {
    const g = gitterLage(v, pfad[t]!);
    let yMinR = Infinity;
    let yMaxR = -Infinity;
    if (g.art === 'ring') {
      for (let j = 0; j < N; j++) {
        const y = zieleV[3 * v.ringPunkt(g.i, j) + 1]!;
        yMinR = Math.min(yMinR, y);
        yMaxR = Math.max(yMaxR, y);
      }
    } else if (g.art === 'vorn') {
      const r = Math.max(Math.abs(g.a - c / 2), Math.abs(g.b - c / 2));
      if (r === 0) return dickeBei(1);
      for (let q = 0; q <= 4 * r; q++) {
        const [a, b] = quadratRing(c, r, q);
        const y = zieleV[3 * v.kappe('vorn', a, b) + 1]!;
        yMinR = Math.min(yMinR, y);
        yMaxR = Math.max(yMaxR, y);
      }
    } else return 0.05 * H;
    const y = P(pfad[t]!)[1];
    return Math.max(1e-6, Math.min(y - yMinR, yMaxR - y));
  };
  const linseBei = (t: number): number => Math.min(opt.linse * H, 0.2 * dickeBei(t));
  const normale = obenBei;
  const art = new Uint8Array(n);
  const tiefe = new Float64Array(n);
  const untenSeite = new Float64Array(n);
  for (let t = 0; t < m; t++) {
    art[pfad[t]!] = 1;
    art[unten[t]!] = 2;
    untenSeite[unten[t]!] = 1;
    if (t > 0) {
      art[pfadLinks[t]!] = 1;
      art[untenLinks[t]!] = 2;
      untenSeite[untenLinks[t]!] = 1;
    }
  }
  art[pfad[m]!] = 6;
  art[pfadLinks[m]!] = 6;
  untenSeite[pfad[m]!] = 0.5;
  untenSeite[pfadLinks[m]!] = 0.5;
  for (let r = 1; r <= K; r++) {
    const s = (opt.tiefe * r) / K;
    for (let t = 0; t < m; t++) {
      const p = P(pfad[t]!);
      const pu = P(unten[t]!);
      const T = Tvon(t);
      const basisO = lerp3(p, T, s);
      const basisU = lerp3(pu, T, s);
      const nrm = normale(t);
      const linse = linseBei(t) * (0.4 + (0.6 * r) / K);
      const o: [number, number, number] = [basisO[0] + nrm[0] * linse, basisO[1] + nrm[1] * linse, t === 0 ? 0 : basisO[2] + nrm[2] * linse];
      const u: [number, number, number] = [basisU[0] - nrm[0] * linse, basisU[1] - nrm[1] * linse, t === 0 ? 0 : basisU[2] - nrm[2] * linse];
      setze(tasche.oben[r - 1]![t]!, o);
      setze(tasche.unten[r - 1]![t]!, u);
      quelle[tasche.oben[r - 1]![t]!] = pfad[t]!;
      quelle[tasche.unten[r - 1]![t]!] = pfad[t]!;
      hoehe[tasche.oben[r - 1]![t]!] = hoeheV[pfad[t]!]!;
      hoehe[tasche.unten[r - 1]![t]!] = hoeheV[pfad[t]!]!;
      art[tasche.oben[r - 1]![t]!] = 3;
      art[tasche.unten[r - 1]![t]!] = 4;
      tiefe[tasche.oben[r - 1]![t]!] = r / K;
      tiefe[tasche.unten[r - 1]![t]!] = r / K;
      untenSeite[tasche.unten[r - 1]![t]!] = 1;
      if (t > 0) {
        setze(tasche.obenLinks[r - 1]![t]!, spiegel(o));
        setze(tasche.untenLinks[r - 1]![t]!, spiegel(u));
        quelle[tasche.obenLinks[r - 1]![t]!] = pfadLinks[t]!;
        quelle[tasche.untenLinks[r - 1]![t]!] = pfadLinks[t]!;
        hoehe[tasche.obenLinks[r - 1]![t]!] = hoeheV[pfadLinks[t]!]!;
        hoehe[tasche.untenLinks[r - 1]![t]!] = hoeheV[pfadLinks[t]!]!;
        art[tasche.obenLinks[r - 1]![t]!] = 3;
        art[tasche.untenLinks[r - 1]![t]!] = 4;
        tiefe[tasche.obenLinks[r - 1]![t]!] = r / K;
        tiefe[tasche.untenLinks[r - 1]![t]!] = r / K;
        untenSeite[tasche.untenLinks[r - 1]![t]!] = 1;
      }
    }
    const w = lerp3(M, Tvon(m), s);
    setze(tasche.winkel[r - 1]!, w);
    setze(tasche.winkelLinks[r - 1]!, spiegel(w));
    for (const idx of [tasche.winkel[r - 1]!, tasche.winkelLinks[r - 1]!]) {
      quelle[idx] = idx === tasche.winkel[r - 1] ? pfad[m]! : pfadLinks[m]!;
      hoehe[idx] = hoeheV[pfad[m]!]!;
      art[idx] = 6;
      tiefe[idx] = r / K;
      untenSeite[idx] = 0.5;
    }
  }

  // ----- Taschenpunkte im Körper halten -----
  // Stationen (Spitze, Quadratringe der Kappe, Ringe): Mitte, Sprossenrichtung, halbe Höhe und das rechte Halbprofil
  // (Höhe a längs der Sprosse → Breite z). Ein Taschenpunkt bleibt in der mittleren Höhe (±(0,5 − Rand) · H) und
  // innerhalb von 80 % der Breite seiner nächsten Station; die Klammer ist monoton, Ober- und Unterblatt kreuzen sich nicht.
  type Stn = { cx: number; cy: number; dx: number; dy: number; H: number; profil: { a: number; z: number }[] };
  const stationAus = (punkte: number[]): Stn => {
    let cx = 0;
    let cy = 0;
    for (const q of punkte) {
      cx += zieleV[3 * q]! / punkte.length;
      cy += zieleV[3 * q + 1]! / punkte.length;
    }
    const o = punkte[0]!;
    const u = punkte[punkte.length - 1]!;
    let dx = zieleV[3 * o]! - zieleV[3 * u]!;
    let dy = zieleV[3 * o + 1]! - zieleV[3 * u + 1]!;
    const H = Math.hypot(dx, dy) || 1e-9;
    dx /= H;
    dy /= H;
    const profil = punkte.map((q) => ({ a: (zieleV[3 * q]! - cx) * dx + (zieleV[3 * q + 1]! - cy) * dy, z: Math.abs(zieleV[3 * q + 2]!) }));
    return { cx, cy, dx, dy, H, profil };
  };
  const stationen: Stn[] = [];
  for (let r = 1; r < c / 2; r++) {
    const pts: number[] = [];
    for (let q = 0; q <= 4 * r; q++) {
      const [a, b] = quadratRing(c, r, q);
      pts.push(v.kappe('vorn', a, b));
    }
    stationen.push(stationAus(pts));
  }
  for (let i = 0; i < v.R; i++) {
    const pts: number[] = [];
    for (let j = 0; j <= N / 2; j++) pts.push(v.ringPunkt(i, j));
    stationen.push(stationAus(pts));
  }
  const RAND = 0.3;
  const innenHalten = (idx: number) => {
    const p = P(idx);
    let best = stationen[0]!;
    let bestD = Infinity;
    for (const st of stationen) {
      const d = Math.hypot(p[0] - st.cx, p[1] - st.cy);
      if (d < bestD) {
        bestD = d;
        best = st;
      }
    }
    let a = (p[0] - best.cx) * best.dx + (p[1] - best.cy) * best.dy;
    const grenze = (0.5 - RAND) * best.H;
    a = Math.min(grenze, Math.max(-grenze, a));
    // Breite bei Höhe a aus dem Halbprofil (a fällt von oben nach unten)
    let w = 0;
    const pr = best.profil;
    for (let q = 0; q + 1 < pr.length; q++) {
      const p0 = pr[q]!;
      const p1 = pr[q + 1]!;
      if ((p0.a >= a && a >= p1.a) || (p1.a >= a && a >= p0.a)) {
        const f = Math.abs(p0.a - p1.a) > 1e-12 ? (p0.a - a) / (p0.a - p1.a) : 0;
        w = Math.max(w, p0.z + (p1.z - p0.z) * f);
      }
    }
    const zMax = 0.8 * w;
    const quer = (p[0] - best.cx) * -best.dy + (p[1] - best.cy) * best.dx;
    const x = best.cx + best.dx * a - best.dy * quer;
    const y = best.cy + best.dy * a + best.dx * quer;
    const z = Math.min(zMax, Math.max(-zMax, p[2]));
    setze(idx, [x, y, z]);
  };
  for (let i = n0; i < n; i++) if (art[i] === 3 || art[i] === 4 || art[i] === 6) innenHalten(i);

  // ----- Käfig bauen, Orientierung der Taschenflächen prüfen -----
  const kaefig = kaefigAusFlaechen(ziele, [...flaechen, ...taschenFlaechen]);
  const pr = pruefeKaefig(kaefig);
  if (!pr.ok) throw new Error(`Maul: Käfig nicht konsistent: ${pr.fehler.slice(0, 3).join('; ')}`);
  // Falten der Vorlage übernehmen (Kanten können nun an unteren Kopien hängen), Lippen scharf
  const vk = v.kaefig;
  const kopie = (idx: number): number[] => {
    const o = tOben.get(idx);
    return o ? [idx, o.links ? untenLinks[o.t]! : unten[o.t]!] : [idx];
  };
  for (let e = 0; e < vk.nE; e++) {
    const sch = vk.eSchaerfe[e]!;
    if (sch <= 0) continue;
    for (const a of kopie(vk.eA[e]!)) for (const b of kopie(vk.eB[e]!)) {
      const ke = kanteZwischen(kaefig, a, b);
      if (ke >= 0) kaefig.eSchaerfe[ke] = Math.max(kaefig.eSchaerfe[ke]!, sch);
    }
  }
  for (let i = 0; i < vk.n; i++) {
    const sch = vk.vSchaerfe[i]!;
    if (sch > 0) for (const a of kopie(i)) kaefig.vSchaerfe[a] = sch;
  }
  for (let t = 0; t < m; t++) {
    for (const [a, b] of [
      [pfad[t]!, pfad[t + 1]!],
      [pfadLinks[t]!, pfadLinks[t + 1]!],
      [unten[t]!, U(0, t + 1, false)],
      [untenLinks[t]!, U(0, t + 1, true)],
    ]) {
      const ke = kanteZwischen(kaefig, a!, b!);
      if (ke >= 0) kaefig.eSchaerfe[ke] = opt.lippenSchaerfe;
    }
  }
  // Lippenabstand je Käfigpunkt (Welt): nächster Pfadpunkt beider Seiten
  const lippenAbstand = new Float64Array(n).fill(10);
  const lippen = [...pfad, ...pfadLinks.slice(1)].map((idx) => P(idx));
  for (let i = 0; i < n; i++) {
    if (art[i] !== 0) {
      lippenAbstand[i] = art[i] === 1 || art[i] === 2 || art[i] === 6 ? 0 : 0;
      continue;
    }
    const p = P(i);
    let best = Infinity;
    for (const q of lippen) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
    lippenAbstand[i] = best;
  }
  // Kiefergewichte: Lage zum Schlitz, Band über die Ringe hinter dem Winkel
  const gewichtUnten = new Float64Array(n);
  const gewichtOben = new Float64Array(n);
  const glatt = (x: number) => {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
  };
  const bandRing = (i: number, band: number) => (i <= k ? 1 : 1 - glatt((i - k) / Math.max(1, band)));
  // Kieferplatte: bis `platte` Maullängen unter der Lippe dreht die Haut starr mit dem Unterkiefer; die Kehlhaut darunter
  // (Beutel) folgt der Plattenkante ihres Rings als Verschiebung, auslaufend (sonst schwingt ein Kinnboden in den Bauch)
  const beutelGewicht = new Float64Array(n);
  const beutelRing = new Int16Array(n).fill(-1);
  const plattenKante = new Float64Array(3 * v.R);
  const plattenDicke = opt.platte * L;
  for (let i = 0; i < v.R; i++) {
    const lp = v.ringPunkt(i, jL);
    plattenKante[3 * i] = zieleV[3 * lp]!;
    plattenKante[3 * i + 1] = zieleV[3 * lp + 1]! - plattenDicke;
    plattenKante[3 * i + 2] = zieleV[3 * lp + 2]!;
  }
  const plattenGewicht = (i: number, idx: number): number => {
    const d = zieleV[3 * v.ringPunkt(i, jL) + 1]! - zieleV[3 * idx + 1]!;
    if (d <= plattenDicke) return 1;
    beutelGewicht[idx] = 1 - glatt((d - plattenDicke) / Math.max(1e-9, opt.beutel * L));
    beutelRing[idx] = i;
    return 0;
  };
  for (let i = 0; i < n0; i++) {
    const g = gitterLage(v, i);
    let o = 0;
    let u = 0;
    let f = 1;
    let fo = 1;
    if (g.art === 'ring') {
      f = bandRing(g.i, opt.band);
      fo = bandRing(g.i, opt.bandOben);
      const jr = g.j <= N / 2 ? g.j : N - g.j;
      if (g.i > k && opt.nackenGanz) {
        // hinter dem Winkel: der ganze Ring folgt dem Schädel (Nacken biegt), die untere Hälfte zusätzlich der Kehle
        o = 1;
        if (jr > jL) u = 1;
      } else if (jr < jL) o = 1;
      else if (jr > jL) u = plattenGewicht(g.i, i);
      else if (g.i === k) {
        o = 0.5;
        u = 0.5;
      } else o = 1; // obere Kopie auf dem Pfad
    } else if (g.art === 'vorn') {
      if (g.b > bL) o = 1;
      else if (g.b < bL) u = 1;
      else o = 1;
    } else {
      f = 0;
      fo = 0;
    }
    gewichtOben[i] = o * fo;
    gewichtUnten[i] = u * f;
  }
  for (let i = n0; i < n; i++) {
    switch (art[i]) {
      case 2:
      case 4:
        gewichtUnten[i] = 1;
        break;
      case 3:
        gewichtOben[i] = 1;
        break;
      case 6:
        gewichtOben[i] = 0.5;
        gewichtUnten[i] = 0.5;
        break;
      default:
        break;
    }
  }
  // Schädelgelenk: hinter dem Mundwinkel auf der Wirbelsäulenhöhe des Rings am Bandende
  const ringHinten = Math.min(v.R - 1, k + Math.max(1, opt.band));
  let yMitte = 0;
  for (let j = 0; j < N; j++) yMitte += zieleV[3 * v.ringPunkt(ringHinten, j) + 1]!;
  yMitte /= N;
  const schaedel: V2 = { x: M[0] - vorn * opt.schaedelHinter * L, y: yMitte };
  // Zugrichtung: Mittel der Richtungen Rachen → Lippe (Seitenansicht), für die Öffnungsart „ziehen“
  let zx = 0;
  let zy = 0;
  for (let t = 0; t <= m; t++) {
    const p = P(pfad[t]!);
    const T = Tvon(t);
    const dx = p[0] - T[0];
    const dy = p[1] - T[1];
    const l = Math.hypot(dx, dy) || 1;
    zx += dx / l;
    zy += dy / l;
  }
  const zl = Math.hypot(zx, zy) || 1;
  const zug: V2 = { x: zx / zl, y: zy / zl };
  const info: MaulAbleitung = {
    lage,
    opt,
    pfad,
    pfadLinks,
    unten,
    untenLinks,
    tasche,
    art,
    tiefe,
    lippenAbstand,
    untenSeite,
    quelle,
    gewichtUnten,
    gewichtOben,
    scharnier: { x: M[0], y: M[1] },
    schaedel,
    vorn,
    hoehe: H,
    zug,
    laenge: L,
    beutelGewicht,
    beutelRing,
    plattenKante,
  };
  return { kaefig, ziele, hoehe, info };
}

// ---------- Ableitung mit Maul ----------

/** Ableitung wie `ableiten`, mit Maul: Umparametrisierung der Schleifen, Schlitz, Tasche, Rachen; Naht-Ausgleich nur auf der Haut. */
export function ableitenMitMaul(dok: Dokument, linie: MaulLinie, optionen: Partial<AbleitOptionen> = {}, maulOptionen: Partial<MaulOptionen> = {}): MaulErgebnis {
  const opt = { ...ABLEIT_STANDARD, glaettung: 0.15, ...optionen };
  const mopt = { ...MAUL_STANDARD, ...maulOptionen };
  const t0 = jetzt();
  const l = leiter(dok, WIRBEL_STANDARD);
  const t1 = jetzt();
  const breiten = silhouettenBreite(dok);
  const t2 = jetzt();
  const vorlage = roehre(opt.ringe, opt.ring);
  const st = stationenWaehlen(l, opt, dok);
  faltenSetzen(vorlage, st, l, dok, breiten, opt);
  const lage = maulLage(vorlage, l, st, linie);
  const { ziele, hoehe } = zieleBerechnen(vorlage, l, st, breiten, dok, opt, lage);
  const mk = maulKaefig(vorlage, st, lage, ziele, hoehe, mopt);
  const haut = new Uint8Array(mk.kaefig.n);
  const zielGewicht = new Float64Array(mk.kaefig.n).fill(1);
  for (let i = 0; i < mk.kaefig.n; i++) {
    const a = mk.info.art[i]!;
    haut[i] = a === 0 ? 1 : 0; // Lippen liegen in der Rille, nicht auf dem Umriss
    if (a === 1 || a === 2 || a === 6) zielGewicht[i] = opt.nahtGewicht;
  }
  // Nahtrundgang startet am Hautpunkt über der Spitze (die Spitze selbst liegt auf der Lippe)
  const nahtStart = vorlage.kappe('vorn', vorlage.c / 2, vorlage.c / 2 + 1);
  const abl = fertigstellen({ opt, vorlage, kaefig: mk.kaefig, ziele: mk.ziele, hoehe: mk.hoehe, l, st, breiten, dok, haut, zielGewicht, nahtStart, zeiten: { t0, t1, t2 } });
  const xyz = abl.kaefig.xyz;
  const info = mk.info;
  // Untere Kette bitgleich auf die obere (gleiche Ziele, scharfe Falten: die Grenzlage hängt nur von der Kette ab)
  for (let t = 0; t < info.lage.m; t++) {
    for (const [o, u] of [
      [info.pfad[t]!, info.unten[t]!],
      [info.pfadLinks[t]!, info.untenLinks[t]!],
    ]) {
      xyz[3 * u!] = xyz[3 * o!]!;
      xyz[3 * u! + 1] = xyz[3 * o! + 1]!;
      xyz[3 * u! + 2] = xyz[3 * o! + 2]!;
    }
  }
  // Taschenpunkte gegen die Lippenketten nachlösen, mit Glättung: Ihre Grenzlagen hängen nur von Tasche und Ketten ab (scharfe Falten).
  taschenNachloesen(abl, info, mk.ziele, opt.glaettung);
  const fein = anwenden3(abl.unterteilung.grenze, xyz);
  return { ...abl, fein, maul: info };
}

/**
 * Kontrollpunkte der Tasche (Reihen, Winkelsäulen) im Ausgleich lösen: Grenzlagen treffen die Ziele (Gewicht 1), dazu
 * Laplace-Glattheit je Taschenpunkt (Gewicht λ) gegen das Überschwingen neben der scharfen Lippenfalte; Kette und Haut bleiben.
 */
function taschenNachloesen(abl: Ableitung, info: MaulAbleitung, ziele: Float64Array, lambda: number): void {
  const k = abl.kaefig;
  const n = k.n;
  const n0 = abl.vorlage.kaefig.n;
  const G = abl.unterteilung.grenze;
  const xyz = k.xyz;
  const P: number[] = [];
  for (let i = 0; i < n; i++) if (info.art[i] === 3 || info.art[i] === 4 || (info.art[i] === 6 && i >= n0)) P.push(i);
  const np = P.length;
  if (np === 0) return;
  const pos = new Int32Array(n).fill(-1);
  P.forEach((v, q) => (pos[v] = q));
  // Zeilen: (Index-Liste, Gewichte, Ziel 3) → Normalgleichungen
  const N = new Float64Array(np * np);
  const rhs = new Float64Array(3 * np);
  const zeile = (idx: number[], w: number[], gew: number, ziel: [number, number, number]) => {
    // bekannte Spalten auf die rechte Seite
    const t: [number, number, number] = [ziel[0], ziel[1], ziel[2]];
    const ui: number[] = [];
    const uw: number[] = [];
    idx.forEach((j, q) => {
      if (pos[j]! >= 0) {
        ui.push(pos[j]!);
        uw.push(w[q]!);
      } else for (let d = 0; d < 3; d++) t[d] = t[d]! - w[q]! * xyz[3 * j + d]!;
    });
    for (let a = 0; a < ui.length; a++) {
      const ra = ui[a]! * np;
      const ga = gew * uw[a]!;
      for (let b = 0; b < ui.length; b++) N[ra + ui[b]!]! += ga * uw[b]!;
      for (let d = 0; d < 3; d++) rhs[3 * ui[a]! + d]! += ga * t[d]!;
    }
  };
  for (const i of P) {
    const idx: number[] = [];
    const w: number[] = [];
    for (let c = G.start[i]!; c < G.start[i + 1]!; c++) {
      idx.push(G.index[c]!);
      w.push(G.wert[c]!);
    }
    zeile(idx, w, 1, [ziele[3 * i]!, ziele[3 * i + 1]!, ziele[3 * i + 2]!]);
    if (lambda > 0) {
      const nb: number[] = [];
      for (let q = k.vKStart[i]!; q < k.vKStart[i + 1]!; q++) {
        const e = k.vKanten[q]!;
        nb.push(k.eA[e] === i ? k.eB[e]! : k.eA[e]!);
      }
      if (nb.length >= 2) zeile([i, ...nb], [1, ...nb.map(() => -1 / nb.length)], lambda, [0, 0, 0]);
    }
  }
  const x = luLoesen(luZerlegen(N, np), rhs, 3);
  for (let q = 0; q < np; q++) for (let d = 0; d < 3; d++) xyz[3 * P[q]! + d] = x[3 * q + d]!;
}

/** Maullinie aus Stützen (f, v); die erste Stütze gilt ab der Spitze. */
export function maulLinieAus(stuetzen: readonly { f: number; v: number }[]): MaulLinie {
  return { fv: stuetzen.map((s) => ({ f: s.f, v: s.v })) };
}

/** Vorgefertigte Maullinien je Lage: vorn (Rex), unten (tief am Kinn), hals (bis zum Halsansatz). */
export function maulLinieVorlage(_dok: Dokument, art: 'vorn' | 'unten' | 'hals'): MaulLinie {
  if (art === 'vorn') return maulLinieAus([{ f: 0.02, v: 0.45 }, { f: 0.2, v: 0.42 }, { f: 0.34, v: 0.45 }]);
  if (art === 'unten') return maulLinieAus([{ f: 0.02, v: 0.3 }, { f: 0.16, v: 0.14 }, { f: 0.28, v: 0.22 }]);
  return maulLinieAus([{ f: 0.02, v: 0.42 }, { f: 0.2, v: 0.38 }, { f: 0.4, v: 0.25 }, { f: 0.6, v: 0.28 }]);
}

// ---------- Pose ----------

/**
 * Maul öffnen: Unterkiefer dreht um die Achse durch die Mundwinkel (fällt), Schädel kippt zurück; Winkel je Punkt aus
 * den Gewichten (Öffnung 0 … 1). Liefert Käfiglagen und feines Netz.
 */
export function maulPose(abl: MaulErgebnis, oeffnung: number): { xyz: Float64Array; fein: Float64Array } {
  const m = abl.maul;
  const n = abl.kaefig.n;
  const xyz = new Float64Array(abl.kaefig.xyz);
  const aU = (oeffnung * m.opt.winkelUnten * Math.PI) / 180;
  const aO = (oeffnung * m.opt.winkelOben * Math.PI) / 180;
  const drehe = (i: number, cx: number, cy: number, winkel: number) => {
    const c = Math.cos(winkel);
    const s = Math.sin(winkel);
    const x = xyz[3 * i]! - cx;
    const y = xyz[3 * i + 1]! - cy;
    xyz[3 * i] = cx + x * c - y * s;
    xyz[3 * i + 1] = cy + x * s + y * c;
  };
  const zieht = m.opt.oeffnungsart === 'ziehen';
  const weite = oeffnung * m.opt.zugWeite * m.laenge;
  const kiefer = (i: number, w: number) => {
    if (zieht) {
      xyz[3 * i] = xyz[3 * i]! + w * weite * m.zug.x;
      xyz[3 * i + 1] = xyz[3 * i + 1]! + w * weite * m.zug.y;
    } else drehe(i, m.scharnier.x, m.scharnier.y, -m.vorn * w * aU);
  };
  // Verschiebung der Plattenkante je Ring (für die Kehlhaut darunter)
  const kantenZug = new Float64Array(2 * abl.vorlage.R);
  for (let r = 0; r < abl.vorlage.R; r++) {
    const ex = m.plattenKante[3 * r]!;
    const ey = m.plattenKante[3 * r + 1]!;
    if (zieht) {
      kantenZug[2 * r] = weite * m.zug.x;
      kantenZug[2 * r + 1] = weite * m.zug.y;
    } else {
      const w = -m.vorn * aU;
      const c = Math.cos(w);
      const sn = Math.sin(w);
      const x = ex - m.scharnier.x;
      const y = ey - m.scharnier.y;
      kantenZug[2 * r] = m.scharnier.x + x * c - y * sn - ex;
      kantenZug[2 * r + 1] = m.scharnier.y + x * sn + y * c - ey;
    }
  }
  for (let i = 0; i < n; i++) {
    const wu = m.gewichtUnten[i]!;
    const wo = m.gewichtOben[i]!;
    // Schnauze bei kleinerem x (vorn = +1): Unterkiefer dreht mathematisch positiv (Spitze nach unten) um den Mundwinkel,
    // der Schädel negativ um das Gelenk hinten (die Schnauze hebt sich, der Hinterkopf taucht nicht in den Nacken).
    // „Ziehen“: der Unterkiefer gleitet entlang der Zugrichtung vom Rachen weg (Vorhang), die Kehle läuft über das Band aus.
    if (wu > 0) kiefer(i, wu);
    const wb = m.beutelGewicht[i]!;
    if (wb > 0) {
      const r = m.beutelRing[i]!;
      xyz[3 * i] = xyz[3 * i]! + wb * kantenZug[2 * r]!;
      xyz[3 * i + 1] = xyz[3 * i + 1]! + wb * kantenZug[2 * r + 1]!;
    }
    if (wo > 0) drehe(i, m.schaedel.x, m.schaedel.y, m.vorn * wo * aO);
  }
  const fein = anwenden3(abl.unterteilung.grenze, xyz);
  return { xyz, fein };
}
