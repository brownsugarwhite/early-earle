// Posen (Plan Teil B, B5): Rot und Blau einer Pose und die Lippenprojektion. Bezug ist die natürliche Lippe der Pose (die
// Lippenkette von Skin(A + Saat + Form; θ) ohne Projektion); gespeichert ist ein Versatzfeld längs der Lippe: Knoten mit
// Lippenanteil s (0 = Anfang auf der Naht, 1 = Mundwinkel), Versatz d und Griffversätze ein/aus im Ruheraum (H je Segment
// eine kubische Bézier über u = (s − s_k)/(s_{k+1} − s_k)). Die Projektion legt die feinen Lippenpunkte im Ruheraum genau
// um H(s) zur Seite (glatter Ausgleich `loeser/glattLoeser.ts`, beide Hälften, außerhalb 0); die Knochen nehmen die
// Korrektur mit wie die Form, posiert ist die Linie der Pose genau die gezeigte Lippe N + G·(R·C). Weil der Bezug die
// natürliche Lippe ist, folgen die Linien dem Pinsel, der schwarzen Linie, dem Haps und jeder Änderung der Grundform von
// selbst; ohne Versätze bleibt die Pose bitgleich (Plan, Stand „B5 Zuschnitt“).
import type { Dokument, LinienKnoten, PoseLinien, V3T } from '../../dokument';
import { type GlattLoeser, glattLoeserBauen } from '../../loeser/glattLoeser';
import type { DuennMatrix } from '../../subdivision/matrix';
import { abtasten3 } from '../../versuch/linie3d';
import type { MaulErgebnis } from '../maul';
import { kaefigNachbarn } from '../pinsel';
import { feinKette } from '../reifen';
import type { Skin } from './skin';

type V3 = [number, number, number];

/** Eine Lippenkette auf einer Seite: Käfigpunkte t = 0 … m, feine Punkte der letzten Stufe und ihr Lippenanteil s. */
export type LippenKette = { kaefig: Int32Array; fein: Int32Array; s: Float64Array };
/** Ober- und Unterkette, je rechts (z ≥ 0 in Ruhe) und links; m Segmente je Kette. */
export type LippenKetten = { m: number; oben: { rechts: LippenKette; links: LippenKette }; unten: { rechts: LippenKette; links: LippenKette } };
export type KettenName = 'oben' | 'unten';
export type Seite = 'rechts' | 'links';

const PX = 461;
/** Gewichte der Lippenbedingungen: alle feinen Lippenpunkte, Anfänge und Mundwinkel stärker */
const GEWICHT_LIPPE = 1e3;
const GEWICHT_ENDE = 1e4;
/** Einflussbereich: Kanten des Käfigs um die Lippenketten (Haut und Tasche) */
const BEREICH_KANTEN = 3;

const kettenMerk = new WeakMap<object, LippenKetten>();

/**
 * Lippenketten einer Maul-Ableitung: Oberkette = `pfad` (Anfang auf der Naht … Mundwinkel), Unterkette = `unten` + Mundwinkel;
 * links die gespiegelten Ketten. „Rechts“ ist die Seite mit z ≥ 0 in Ruhe (wie die Form). Gemerkt je Unterteilung.
 */
export function lippenKetten(abl: MaulErgebnis): LippenKetten {
  const gemerkt = kettenMerk.get(abl.unterteilung);
  if (gemerkt && gemerkt.m === abl.maul.lage.m) return gemerkt;
  const mm = abl.maul;
  const m = mm.lage.m;
  const kette = (kaefig: number[]): LippenKette => {
    const fein: number[] = [];
    const s: number[] = [];
    for (let t = 0; t + 1 < kaefig.length; t++) {
      const k = feinKette(abl.unterteilung, abl.kaefig, kaefig[t]!, kaefig[t + 1]!);
      if (k.length < 2) throw new Error('Lippenkette: Kante fehlt im Käfig');
      const L = k.length - 1;
      for (let j = t ? 1 : 0; j <= L; j++) {
        fein.push(k[j]!);
        s.push((t + j / L) / m);
      }
    }
    return { kaefig: Int32Array.from(kaefig), fein: Int32Array.from(fein), s: Float64Array.from(s) };
  };
  const oR = kette(mm.pfad);
  const oL = kette(mm.pfadLinks);
  const uR = kette([...mm.unten, mm.pfad[m]!]);
  const uL = kette([...mm.untenLinks, mm.pfadLinks[m]!]);
  // „rechts“ = z ≥ 0 am Mundwinkel in Ruhe
  const X = abl.kaefig.xyz;
  const tausch = X[3 * mm.pfad[m]! + 2]! < X[3 * mm.pfadLinks[m]! + 2]!;
  const out: LippenKetten = tausch ? { m, oben: { rechts: oL, links: oR }, unten: { rechts: uL, links: uR } } : { m, oben: { rechts: oR, links: oL }, unten: { rechts: uR, links: uL } };
  kettenMerk.set(abl.unterteilung, out);
  return out;
}

const nullV = (): V3T => [0, 0, 0];

/**
 * Standardknoten einer Pose-Linie aus der Grundlinie: s = nächster feiner Punkt der Ruhe-Lippe (Abstand in x, y, |z|),
 * Anfang 0, Mundwinkel 1, streng steigend; Versätze 0. Rot (Oberkette) aus `maul.zu.oben`, Blau (Unterkette) aus
 * `maul.zu.unten` bzw. bei gleichen Kiefern aus der türkisen Linie. Ohne gezeichnete Linie drei Knoten (0, ½, 1).
 */
export function linienGrundKnoten(abl: MaulErgebnis, ketten: LippenKetten, dok: Dokument | null, name: KettenName): LinienKnoten[] {
  const linie = name === 'oben' ? dok?.maul?.zu.oben : (dok?.maul?.zu.unten ?? dok?.maul?.zu.oben);
  const kette = ketten[name].rechts;
  const leer = (s: number, art?: 'glatt' | 'ecke'): LinienKnoten => ({ s, d: nullV(), ein: nullV(), aus: nullV(), ...(art ? { art } : {}) });
  if (!linie || linie.knoten.length < 2 || !dok) return [leer(0), leer(0.5), leer(1)];
  const sk = dok.skalierung;
  const R = abl.fein;
  const sVon = (p: V3T): number => {
    let best = 0;
    let bd = Infinity;
    for (let j = 0; j < kette.fein.length; j++) {
      const f = kette.fein[j]!;
      const d = Math.hypot(R[3 * f]! - p[0] * sk, R[3 * f + 1]! - p[1] * sk, Math.abs(R[3 * f + 2]!) - Math.abs(p[2] * sk));
      if (d < bd) {
        bd = d;
        best = kette.s[j]!;
      }
    }
    return best;
  };
  const K = linie.knoten.length;
  const knoten: LinienKnoten[] = [leer(0, linie.knoten[0]!.art)];
  for (let k = 1; k + 1 < K; k++) {
    const s = sVon(linie.knoten[k]!.p);
    if (s > knoten[knoten.length - 1]!.s + 0.02 && s < 0.98) knoten.push(leer(s, linie.knoten[k]!.art));
  }
  knoten.push(leer(1, linie.knoten[K - 1]!.art));
  return knoten;
}

/** Versatz H(s) im Ruheraum (kubische Bézier je Segment, Griffe relativ zum Knoten wie in `Linie3`). */
export function versatzBei(knoten: readonly LinienKnoten[], s: number): V3 {
  const K = knoten.length;
  if (K === 0) return [0, 0, 0];
  if (s <= knoten[0]!.s) return [...knoten[0]!.d] as V3;
  if (s >= knoten[K - 1]!.s) return [...knoten[K - 1]!.d] as V3;
  let k = 0;
  while (k + 2 < K && s > knoten[k + 1]!.s) k++;
  const a = knoten[k]!;
  const b = knoten[k + 1]!;
  const u = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
  const v = 1 - u;
  const w0 = v * v * v;
  const w1 = 3 * v * v * u;
  const w2 = 3 * v * u * u;
  const w3 = u * u * u;
  const o: V3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) o[c] = w0 * a.d[c]! + w1 * (a.d[c]! + a.aus[c]!) + w2 * (b.d[c]! + b.ein[c]!) + w3 * b.d[c]!;
  return o;
}

/** Hat ein Satz Pose-Linien überhaupt einen Versatz? (sonst bleibt die Pose bitgleich ohne Projektion) */
export function linienAktiv(l: PoseLinien | undefined): boolean {
  if (!l) return false;
  for (const ks of [l.oben, l.unten]) for (const k of ks) for (let c = 0; c < 3; c++) if (k.d[c] !== 0 || k.ein[c] !== 0 || k.aus[c] !== 0) return true;
  return false;
}

/**
 * Knoten für die Auswertung: Mundwinkel aus Rot für beide (gemeinsamer Punkt), Anfang auf der Naht (z des Versatzes 0),
 * s auf [0, 1] mit Anfang 0 und Mundwinkel 1.
 */
export function linienWirksam(l: PoseLinien): PoseLinien {
  const fest = (ks: readonly LinienKnoten[], ecke: V3T | null): LinienKnoten[] =>
    ks.map((k, i) => {
      const erster = i === 0;
      const letzter = i === ks.length - 1;
      const d: V3T = letzter && ecke ? [...ecke] : erster ? [k.d[0], k.d[1], 0] : k.d;
      return { ...k, s: erster ? 0 : letzter ? 1 : k.s, d };
    });
  const oben = fest(l.oben, null);
  return { oben, unten: fest(l.unten, oben[oben.length - 1]!.d) };
}

type LoeserDaten = { loeser: GlattLoeser; zeilen: { fein: number; name: KettenName; seite: Seite; s: number }[]; bereich: Int32Array };
const loeserMerk = new WeakMap<DuennMatrix, LoeserDaten>();

/**
 * Drehung der Pose am Lippenanteil s einer Kette (9 Werte, zeilenweise): zwischen den beiden benachbarten Kettenpunkten
 * überblendet und orthonormiert. Mit der Drehung des nächsten Kettenpunkts sprang sie kurz vor dem Mundwinkel zwischen
 * Ober- und Unterkette (Schädel gegen Kiefer, dicht beieinanderliegende Punkte mit 10 px verschiedenen Zielen): 4–5 px Rest.
 */
export function drehungBei(sk: Skin, k: LippenKette, m: number, s: number): Float64Array {
  const t = Math.max(0, Math.min(m, s * m));
  const t0 = Math.min(m - 1, Math.floor(t));
  const f = t - t0;
  const a = 9 * k.kaefig[t0]!;
  const b = 9 * k.kaefig[t0 + 1]!;
  const r = sk.r;
  const M = new Float64Array(9);
  for (let c = 0; c < 9; c++) M[c] = (1 - f) * r[a + c]! + f * r[b + c]!;
  // Spalten orthonormieren (Gram-Schmidt), dritte = Kreuzprodukt
  const c0 = [M[0]!, M[3]!, M[6]!];
  const l0 = Math.hypot(c0[0]!, c0[1]!, c0[2]!) || 1;
  for (let i = 0; i < 3; i++) c0[i] = c0[i]! / l0;
  const c1 = [M[1]!, M[4]!, M[7]!];
  const p = c0[0]! * c1[0]! + c0[1]! * c1[1]! + c0[2]! * c1[2]!;
  for (let i = 0; i < 3; i++) c1[i] = c1[i]! - p * c0[i]!;
  const l1 = Math.hypot(c1[0]!, c1[1]!, c1[2]!) || 1;
  for (let i = 0; i < 3; i++) c1[i] = c1[i]! / l1;
  const c2 = [c0[1]! * c1[2]! - c0[2]! * c1[1]!, c0[2]! * c1[0]! - c0[0]! * c1[2]!, c0[0]! * c1[1]! - c0[1]! * c1[0]!];
  for (let i = 0; i < 3; i++) {
    M[3 * i] = c0[i]!;
    M[3 * i + 1] = c1[i]!;
    M[3 * i + 2] = c2[i]!;
  }
  return M;
}

/** Löser der Lippenprojektion je Topologie (gemerkt an der Grenzmatrix): Bereich, Zeilen aller feinen Lippenpunkte. */
function lippenLoeser(abl: MaulErgebnis, ketten: LippenKetten): LoeserDaten {
  const G = abl.unterteilung.grenze;
  const gemerkt = loeserMerk.get(G);
  if (gemerkt) return gemerkt;
  const k = abl.kaefig;
  const n = k.n;
  const nachbarn = kaefigNachbarn(k.fStart, k.fVerts, n);
  // Bereich: Käfigpunkte bis BEREICH_KANTEN Kanten um die Lippenketten
  const abstand = new Int32Array(n).fill(-1);
  let rand: number[] = [];
  for (const name of ['oben', 'unten'] as const)
    for (const seite of ['rechts', 'links'] as const)
      for (const i of ketten[name][seite].kaefig) {
        if (abstand[i]! < 0) {
          abstand[i] = 0;
          rand.push(i);
        }
      }
  for (let d = 1; d <= BEREICH_KANTEN; d++) {
    const neu: number[] = [];
    for (const i of rand)
      for (const j of nachbarn[i]!)
        if (abstand[j]! < 0) {
          abstand[j] = d;
          neu.push(j);
        }
    rand = neu;
  }
  const bereich: number[] = [];
  for (let i = 0; i < n; i++) if (abstand[i]! >= 0) bereich.push(i);
  // Zeilen: feine Lippenpunkte (jeder einmal; Naht- und Winkelpunkte gehören zwei Ketten mit gleichem Ziel)
  const zeilen: LoeserDaten['zeilen'] = [];
  const gesehen = new Set<number>();
  for (const name of ['oben', 'unten'] as const)
    for (const seite of ['rechts', 'links'] as const) {
      const kt = ketten[name][seite];
      for (let j = 0; j < kt.fein.length; j++) {
        const f = kt.fein[j]!;
        if (gesehen.has(f)) continue;
        gesehen.add(f);
        zeilen.push({ fein: f, name, seite, s: kt.s[j]! });
      }
    }
  const loeser = glattLoeserBauen({
    n,
    nachbarn,
    bereich,
    zeilen: zeilen.map((z) => ({ index: G.index.subarray(G.start[z.fein]!, G.start[z.fein + 1]!), wert: G.wert.subarray(G.start[z.fein]!, G.start[z.fein + 1]!), gewicht: z.s === 0 || z.s === 1 ? GEWICHT_ENDE : GEWICHT_LIPPE })),
  });
  const daten = { loeser, zeilen, bereich: Int32Array.from(bereich) };
  loeserMerk.set(G, daten);
  return daten;
}

/**
 * Lippenprojektion einer Pose im Ruheraum: Korrektur C (3n), deren Grenzlagen an allen feinen Lippenpunkten das Versatzfeld
 * H(s) treffen (links gespiegelt; glatter Auslauf im Bereich, außerhalb exakt 0). Die Knochen nehmen C mit wie die Form —
 * posiert liegt die Lippe genau auf N + G·(R·C). Gemessen am 15.10.: Fit im Ruheraum ≤ 0,1 px (Kugel gleich, Über-,
 * Unterbiss, 20 Zufallsfälle bis ±14 px); dieselbe Projektion im posierten Raum gegen N + R(s)·H(s) ließ am Mundwinkel
 * 0,65–0,8 px stehen (Ober- und Unterkette drehen dort verschieden, das Ziel knickt). C hängt weder an Form noch Stellung.
 */
export function lippenKorrektur(abl: MaulErgebnis, linien: PoseLinien): Float64Array {
  const ketten = lippenKetten(abl);
  const { loeser, zeilen } = lippenLoeser(abl, ketten);
  const l = linienWirksam(linien);
  const ziele = new Float64Array(3 * zeilen.length);
  zeilen.forEach((z, q) => {
    const h = versatzBei(l[z.name], z.s);
    ziele[3 * q] = h[0];
    ziele[3 * q + 1] = h[1];
    ziele[3 * q + 2] = z.seite === 'links' ? -h[2] : h[2];
  });
  return loeser.loesen(ziele);
}

/** Eine Kette der bearbeiteten Pose für den Editor: Lippenanteile, natürliche und gezeigte Lagen, Drehung je Punkt. */
export type PoseLippenKette = { s: Float32Array; natuerlich: Float32Array; ist: Float32Array; dreh: Float32Array };
/**
 * Rot und Blau der bearbeiteten Pose (Kern-Koordinaten ohne Hebung, wie die Blätter): je Kette und Seite die feinen
 * Lippenpunkte, die wirksamen Knoten (gespeichert oder aus der Grundlinie), die größte Abweichung der Lippe von der Linie
 * nach der Projektion (px bei 461, 3D) und ob die Ketten geschlossen aufeinanderliegen (eine türkise Linie).
 */
export type PoseLippen = {
  oben: Record<Seite, PoseLippenKette>;
  unten: Record<Seite, PoseLippenKette>;
  knoten: PoseLinien;
  gespeichert: boolean;
  abweichung: { oben: number; unten: number };
  zu: boolean;
};

/** Zeile der Grenzmatrix auf Lagen anwenden (ein feiner Punkt). */
function grenzLage(G: DuennMatrix, xyz: ArrayLike<number>, f: number): V3 {
  const o: V3 = [0, 0, 0];
  for (let q = G.start[f]!; q < G.start[f + 1]!; q++) {
    const j = G.index[q]!;
    const w = G.wert[q]!;
    o[0] += w * xyz[3 * j]!;
    o[1] += w * xyz[3 * j + 1]!;
    o[2] += w * xyz[3 * j + 2]!;
  }
  return o;
}

/**
 * Daten für Rot und Blau der bearbeiteten Pose: natürliche Lippe (`natuerlichXyz` = Käfig der vollen Pose ohne Projektion),
 * gezeigte Lippe (`istXyz` = Käfig mit Projektion; sie ist die Linie der Pose), Drehung je Lippenpunkt aus der Skin der
 * vollen Pose (für Griffe und das Umrechnen von Zügen), Abweichung = Fit der Korrektur `C` gegen H(s) im Ruheraum (px).
 */
export function poseLippenDaten(abl: MaulErgebnis, dok: Dokument | null, linien: PoseLinien | undefined, C: Float64Array | null, sk: Skin, natuerlichXyz: ArrayLike<number>, istXyz: ArrayLike<number>, immerGetrennt: boolean): PoseLippen {
  const ketten = lippenKetten(abl);
  const G = abl.unterteilung.grenze;
  const knoten: PoseLinien = linien ? linienWirksam(linien) : { oben: linienGrundKnoten(abl, ketten, dok, 'oben'), unten: linienGrundKnoten(abl, ketten, dok, 'unten') };
  const abw = { oben: 0, unten: 0 };
  const kette = (name: KettenName, seite: Seite): PoseLippenKette => {
    const kt = ketten[name][seite];
    const N = kt.fein.length;
    const out: PoseLippenKette = { s: new Float32Array(N), natuerlich: new Float32Array(3 * N), ist: new Float32Array(3 * N), dreh: new Float32Array(9 * N) };
    for (let j = 0; j < N; j++) {
      const s = kt.s[j]!;
      const R = drehungBei(sk, kt, ketten.m, s);
      const nat = grenzLage(G, natuerlichXyz, kt.fein[j]!);
      const ist = grenzLage(G, istXyz, kt.fein[j]!);
      out.s[j] = s;
      out.natuerlich.set(nat, 3 * j);
      out.ist.set(ist, 3 * j);
      out.dreh.set(R, 9 * j);
      if (C) {
        const h = versatzBei(knoten[name], s);
        if (seite === 'links') h[2] = -h[2];
        const c = grenzLage(G, C, kt.fein[j]!);
        const d = Math.hypot(c[0] - h[0], c[1] - h[1], c[2] - h[2]) * PX;
        if (d > abw[name]) abw[name] = d;
      }
    }
    return out;
  };
  const oben = { rechts: kette('oben', 'rechts'), links: kette('oben', 'links') };
  const unten = { rechts: kette('unten', 'rechts'), links: kette('unten', 'links') };
  // geschlossen: natürliche Ketten fallen zusammen und beide Linien haben dieselben Versätze
  let zu = !immerGetrennt;
  if (zu) {
    const a = oben.rechts.natuerlich;
    const b = unten.rechts.natuerlich;
    for (let q = 0; q < a.length && zu; q++) if (Math.abs(a[q]! - b[q]!) > 1e-6) zu = false;
    if (zu) zu = JSON.stringify(knoten.oben) === JSON.stringify(knoten.unten);
  }
  return { oben, unten, knoten, gespeichert: !!linien, abweichung: abw, zu };
}

/**
 * Formneutral einfügen: neuer Knoten bei s (de Casteljau im Versatzfeld); das Feld H bleibt als Funktion von s gleich.
 * Gibt die neue Liste und die Nummer des neuen Knotens zurück (−1, wenn s auf einem Knoten oder außerhalb liegt).
 */
export function linieEinfuegen(knoten: readonly LinienKnoten[], s: number): { knoten: LinienKnoten[]; index: number } {
  const K = knoten.length;
  let k = -1;
  for (let i = 0; i + 1 < K; i++) if (s > knoten[i]!.s + 1e-6 && s < knoten[i + 1]!.s - 1e-6) k = i;
  if (k < 0) return { knoten: knoten.map((q) => ({ ...q })), index: -1 };
  const a = knoten[k]!;
  const b = knoten[k + 1]!;
  const u = (s - a.s) / (b.s - a.s);
  const P0 = a.d;
  const P1: V3T = [a.d[0] + a.aus[0], a.d[1] + a.aus[1], a.d[2] + a.aus[2]];
  const P2: V3T = [b.d[0] + b.ein[0], b.d[1] + b.ein[1], b.d[2] + b.ein[2]];
  const P3 = b.d;
  const lerp = (p: V3T, q: V3T): V3T => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
  const Q0 = lerp(P0, P1);
  const Q1 = lerp(P1, P2);
  const Q2 = lerp(P2, P3);
  const R0 = lerp(Q0, Q1);
  const R1 = lerp(Q1, Q2);
  const S = lerp(R0, R1);
  const rel = (p: V3T, o: V3T): V3T => [p[0] - o[0], p[1] - o[1], p[2] - o[2]];
  const neuA: LinienKnoten = { ...a, aus: rel(Q0, P0) };
  const neuM: LinienKnoten = { s, d: S, ein: rel(R0, S), aus: rel(R1, S), art: 'glatt' };
  const neuB: LinienKnoten = { ...b, ein: rel(Q2, P3) };
  const out = knoten.map((q) => ({ ...q }));
  out.splice(k, 2, neuA, neuM, neuB);
  return { knoten: out, index: k + 1 };
}

/** Gerade gezeichnete Grundlinie in Kern-Einheiten (für Tests und Skripte). */
export function grundLinieKern(dok: Dokument, name: KettenName, n = 24): V3[] {
  const l = name === 'oben' ? dok.maul?.zu.oben : (dok.maul?.zu.unten ?? dok.maul?.zu.oben);
  if (!l) return [];
  const sk = dok.skalierung;
  return abtasten3(l, n).map((p) => [p[0] * sk, p[1] * sk, p[2] * sk] as V3);
}
