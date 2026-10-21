// Teil A (Plan „Maul als Einsatz“), Schritt A3: Feldwahl auf dem verfeinerten Käfig. Das Feld M ist eine spiegelsymmetrische
// Scheibe aus Flächen der Stufe 1 um die Linie; der Einsatz ersetzt M durch ein geordnetes Gitter aus Vierecken. Ein Randpunkt
// v mit f_v Flächen von M hat danach die Valenz val_v − f_v + 2: gerade Randstücke (f = 2) bleiben regulär, konvexe Ecken
// (f = 1) werden Fünferpole, konkave Ecken (f = 3) Dreier. Nach Gauß–Bonnet braucht eine Scheibe aus Vierecken mindestens vier
// Fünferpole (weniger, wenn Dreier-Punkte des Käfigs, z. B. Kappenecken, im Feld liegen); das Feld wird deshalb so lange
// begradigt (Flächen an konkaven Ecken dazu, spiegelgleich), bis es keine konkaven Ecken mehr hat — dann sitzen genau die
// vorhergesagten Pole an seinen Ecken. Dazu der Kragen (Flächen außen am Rand), der Rand ab der vorderen Mittellinie und die
// Lippenauflösung m = E/2 (E = Kanten des halben Rands). DOM-frei, deterministisch.
import type { Kaefig } from '../../kaefig/halbkanten';
import { spiegelIndex } from '../pinsel';

type V3 = [number, number, number];

export type FeldSpec = {
  /** Flächen von M (Stufe 1), aufsteigend */
  feld: Int32Array;
  /** Kragen: Flächen außerhalb von M, die einen Randpunkt von M berühren */
  kragen: Int32Array;
  /** Rand von M als Punktschleife, beginnend an einem Nahtpunkt (z = 0) */
  rand: Int32Array;
  /** Valenz je Randpunkt nach dem Einsetzen (gleiche Reihenfolge wie `rand`) */
  valenz: Int32Array;
  /** vorhergesagte Summe Σ(Valenz − 4) über den Rand (Gauß–Bonnet) und die gemessene */
  polSummeSoll: number;
  polSumme: number;
  /** konkave Randpunkte (Valenz < 4) — 0, wenn das Begradigen gelang */
  konkav: number;
  /** Kanten des halben Rands (Naht bis Naht) und die Lippenauflösung m = E/2 (NaN bei ungeradem E) */
  halbKanten: number;
  m: number;
  runden: number;
};

/** Spiegelpartner je Fläche (über die Spiegelpartner ihrer Ecken). */
function flaechenSpiegel(k: Kaefig, sp: Int32Array): Int32Array {
  const schl = (ecken: number[]) => [...ecken].sort((a, b) => a - b).join(',');
  const nach = new Map<string, number>();
  for (let f = 0; f < k.nF; f++) nach.set(schl(Array.from(k.fVerts.subarray(k.fStart[f]!, k.fStart[f + 1]!))), f);
  const out = new Int32Array(k.nF).fill(-1);
  for (let f = 0; f < k.nF; f++) {
    const ecken = Array.from(k.fVerts.subarray(k.fStart[f]!, k.fStart[f + 1]!)).map((v) => sp[v]!);
    if (ecken.some((v) => v < 0)) continue;
    out[f] = nach.get(schl(ecken)) ?? -1;
  }
  return out;
}

/**
 * Feld wählen: `abstand` je Fläche der Stufe 1 (Weg auf der Haut zur Linie, z. B. aus den feinen Blöcken), Radius; das Feld
 * enthält alle Flächen im Radius samt Spiegelbildern (die Komponente mit der Linie, Löcher gefüllt) und wird begradigt.
 */
export function feldWaehlen(k1: Kaefig, abstand: Float64Array, radius: number): FeldSpec {
  const sp = spiegelIndex(k1.xyz, k1.n);
  const fsp = flaechenSpiegel(k1, sp);
  const inM = new Uint8Array(k1.nF);
  const nimm = (f: number) => {
    inM[f] = 1;
    if (fsp[f]! >= 0) inM[fsp[f]!] = 1;
  };
  for (let f = 0; f < k1.nF; f++) if (abstand[f]! <= radius) nimm(f);
  // Nachbarschaft über Kanten
  const nachbarFlaechen = (f: number): number[] => {
    const out: number[] = [];
    for (let h = k1.fStart[f]!; h < k1.fStart[f + 1]!; h++) {
      const t = k1.hTwin[h]!;
      if (t >= 0) out.push(k1.hFace[t]!);
    }
    return out;
  };
  // Komponente mit der Linie (kleinster Abstand) behalten
  let start = -1;
  for (let f = 0; f < k1.nF; f++) if (inM[f] && (start < 0 || abstand[f]! < abstand[start]!)) start = f;
  const komp = new Uint8Array(k1.nF);
  if (start >= 0) {
    const st = [start];
    komp[start] = 1;
    while (st.length) {
      const f = st.pop()!;
      for (const g of nachbarFlaechen(f)) if (inM[g] && !komp[g]) {
        komp[g] = 1;
        st.push(g);
      }
    }
  }
  for (let f = 0; f < k1.nF; f++) inM[f] = komp[f]!;
  const lochFuellen = () => {
    // außen = von einer Fläche mit größtem Abstand aus erreichbar ohne M
    let fern = 0;
    for (let f = 0; f < k1.nF; f++) if (!inM[f] && abstand[f]! > abstand[fern]!) fern = f;
    const aussen = new Uint8Array(k1.nF);
    const st = [fern];
    aussen[fern] = 1;
    while (st.length) {
      const f = st.pop()!;
      for (const g of nachbarFlaechen(f)) if (!inM[g] && !aussen[g]) {
        aussen[g] = 1;
        st.push(g);
      }
    }
    for (let f = 0; f < k1.nF; f++) if (!inM[f] && !aussen[f]) inM[f] = 1;
  };
  lochFuellen();
  // Begradigen: Flächen an konkaven Randpunkten (neue Valenz < 4) dazu, spiegelgleich, bis keine mehr da sind
  const valenzVon = (v: number) => k1.vKStart[v + 1]! - k1.vKStart[v]!;
  const flaechenAn = (v: number) => Array.from(k1.vFlaechen.subarray(k1.vFStart[v]!, k1.vFStart[v + 1]!));
  let runden = 0;
  for (; runden < 60; runden++) {
    let neu = 0;
    for (let v = 0; v < k1.n; v++) {
      const fs = flaechenAn(v);
      const f = fs.filter((x) => inM[x]).length;
      if (f === 0 || f === fs.length) continue;
      if (valenzVon(v) - f + 2 < 4) for (const x of fs) if (!inM[x]) {
        nimm(x);
        neu++;
      }
    }
    if (!neu) break;
    lochFuellen();
  }
  // Rand: gerichtete Randkanten (Halbkanten von M ohne Zwilling in M), Schleife ab einem Nahtpunkt
  const naechste = new Map<number, number>();
  for (let f = 0; f < k1.nF; f++) {
    if (!inM[f]) continue;
    for (let h = k1.fStart[f]!; h < k1.fStart[f + 1]!; h++) {
      const t = k1.hTwin[h]!;
      if (t >= 0 && inM[k1.hFace[t]!]) continue;
      // Halbkante h läuft von fVerts[h] zu fVerts[nächste]
      const a = k1.fVerts[h]!;
      const nx = h + 1 < k1.fStart[f + 1]! ? h + 1 : k1.fStart[f]!;
      naechste.set(a, k1.fVerts[nx]!);
    }
  }
  let anfang = -1;
  for (const a of naechste.keys()) if (Math.abs(k1.xyz[3 * a + 2]!) < 1e-9 && (anfang < 0 || k1.xyz[3 * a]! < k1.xyz[3 * anfang]!)) anfang = a;
  if (anfang < 0) anfang = naechste.keys().next().value ?? -1;
  const rand: number[] = [];
  for (let a = anfang, s = 0; a >= 0 && s <= naechste.size; s++) {
    rand.push(a);
    a = naechste.get(a) ?? -1;
    if (a === anfang) break;
  }
  const valenz = rand.map((v) => valenzVon(v) - flaechenAn(v).filter((x) => inM[x]).length + 2);
  let konkav = 0;
  let polSumme = 0;
  for (const n of valenz) {
    if (n < 4) konkav++;
    polSumme += n - 4;
  }
  // Gauß–Bonnet: Σ_Rand (n − 4) = 4 − Σ_{Punkte von M, innen und Rand} (4 − val) … über die Punkte von M
  const punkteM = new Set<number>();
  for (let f = 0; f < k1.nF; f++) if (inM[f]) for (let h = k1.fStart[f]!; h < k1.fStart[f + 1]!; h++) punkteM.add(k1.fVerts[h]!);
  const randSet = new Set(rand);
  let innenSumme = 0;
  for (const v of punkteM) if (!randSet.has(v)) innenSumme += 4 - valenzVon(v);
  const polSummeSoll = 4 - innenSumme;
  // halber Rand: vom Anfang (Naht) bis zum nächsten Nahtpunkt
  let halbKanten = 0;
  for (let i = 1; i < rand.length; i++) {
    halbKanten++;
    if (Math.abs(k1.xyz[3 * rand[i]! + 2]!) < 1e-9) break;
  }
  const kragen = new Set<number>();
  for (const v of rand) for (const x of flaechenAn(v)) if (!inM[x]) kragen.add(x);
  const feld: number[] = [];
  for (let f = 0; f < k1.nF; f++) if (inM[f]) feld.push(f);
  return {
    feld: Int32Array.from(feld),
    kragen: Int32Array.from([...kragen].sort((a, b) => a - b)),
    rand: Int32Array.from(rand),
    valenz: Int32Array.from(valenz),
    polSummeSoll,
    polSumme,
    konkav,
    halbKanten,
    m: halbKanten % 2 === 0 ? halbKanten / 2 : NaN,
    runden,
  };
}

/** Abstand je Fläche der Stufe 1 zur Linie: kleinster Abstand der feinen Punkte ihres Blocks (Stufe L−1) zum Polygonzug. */
export function flaechenAbstand(feinPunkte: ArrayLike<number>, feinFlaechen: readonly (readonly number[])[], nF1: number, linie: readonly V3[]): Float64Array {
  const block = feinFlaechen.length / nF1;
  const dPunkt = new Map<number, number>();
  const abstandZu = (i: number) => {
    const g = dPunkt.get(i);
    if (g !== undefined) return g;
    const p: V3 = [feinPunkte[3 * i]!, feinPunkte[3 * i + 1]!, feinPunkte[3 * i + 2]!];
    let best = Infinity;
    for (let k = 0; k + 1 < linie.length; k++) {
      const a = linie[k]!;
      const b = linie[k + 1]!;
      const e: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const l2 = e[0] * e[0] + e[1] * e[1] + e[2] * e[2] || 1e-18;
      const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * e[0] + (p[1] - a[1]) * e[1] + (p[2] - a[2]) * e[2]) / l2));
      best = Math.min(best, Math.hypot(a[0] + e[0] * u - p[0], a[1] + e[1] * u - p[1], a[2] + e[2] * u - p[2]));
    }
    // gespiegelte Linie (das Feld ist symmetrisch)
    for (let k = 0; k + 1 < linie.length; k++) {
      const a: V3 = [linie[k]![0], linie[k]![1], -linie[k]![2]];
      const b: V3 = [linie[k + 1]![0], linie[k + 1]![1], -linie[k + 1]![2]];
      const e: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const l2 = e[0] * e[0] + e[1] * e[1] + e[2] * e[2] || 1e-18;
      const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * e[0] + (p[1] - a[1]) * e[1] + (p[2] - a[2]) * e[2]) / l2));
      best = Math.min(best, Math.hypot(a[0] + e[0] * u - p[0], a[1] + e[1] * u - p[1], a[2] + e[2] * u - p[2]));
    }
    dPunkt.set(i, best);
    return best;
  };
  const out = new Float64Array(nF1).fill(Infinity);
  for (let f = 0; f < nF1; f++)
    for (let b = f * block; b < (f + 1) * block; b++) for (const i of feinFlaechen[b]!) out[f] = Math.min(out[f]!, abstandZu(i));
  return out;
}

/** Größte Lippenauflösung (Plan 2.3) */
export const M_MAX = 20;

/**
 * Feld mit gerader Kantenzahl am halben Rand (m = E/2 ganz) und m ≤ M_MAX: der Radius wächst in Vierteln einer Kante
 * (höchstens zwei Kanten mehr), dann schrumpft er (bis zwei Kanten), bis beides stimmt; sonst das erste Feld ohne konkave
 * Ecken.
 */
export function feldMitGerademRand(k1: Kaefig, abstand: Float64Array, radius: number, kante: number, mMax = M_MAX): FeldSpec & { radius: number } {
  let erstes: (FeldSpec & { radius: number }) | null = null;
  // erst wachsen (bis zwei Kanten mehr), dann schrumpfen (bis zwei Kanten Radius): lange Linien (tiefer Rex-Mund) gaben
  // sonst m = 22 > M_MAX
  const radien: number[] = [];
  for (let s = 0; s <= 8; s++) radien.push(radius + 0.25 * s * kante);
  for (let s = 1; radius - 0.25 * s * kante >= 2 * kante; s++) radien.push(radius - 0.25 * s * kante);
  for (const r of radien) {
    const f = feldWaehlen(k1, abstand, r);
    if (!erstes && f.konkav === 0) erstes = { ...f, radius: r };
    if (f.konkav === 0 && Number.isFinite(f.m) && f.m <= mMax) return { ...f, radius: r };
  }
  return erstes ?? { ...feldWaehlen(k1, abstand, radius), radius };
}
