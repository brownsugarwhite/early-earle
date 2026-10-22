// Wesen-Editor 2, Kern (13.10.2026): Vorlagen-Käfig „Röhre“: R Ringe × N Punkte entlang der Wirbelsäule, vorn und hinten
// eine Kappe aus (N/4)² Vierecken (Rand = Ring, keine Pole, nur Vierecke). Ring j = 0 oben, N/4 rechts (+z),
// N/2 unten, 3N/4 links. Die Lagen setzt die Ableitung (kern/ableiten.ts); hier zählt nur die Topologie.

import { type Kaefig, kaefigAusFlaechen, pruefeKaefig, volumen } from './halbkanten';

export type Roehre = {
  R: number;
  N: number;
  /** Vierecke je Kappenseite (N/4) */
  c: number;
  kaefig: Kaefig;
  ringPunkt: (i: number, j: number) => number;
  /** innerer Kappenpunkt (a = 1 … c−1 quer, b = 1 … c−1 hoch); Randpunkte sind Ringpunkte */
  kappe: (seite: 'vorn' | 'hinten', a: number, b: number) => number;
  /** Punkte der Naht (z = 0): vom Schnauzen-Scheitel über den Rücken … Hinter-Kappe … Bauch … zurück; je Eintrag Punktindex */
  naht: { ruecken: number[]; bauch: number[]; spitzeVorn: number; spitzeHinten: number };
};

/** Nur Topologie; Lagen vorläufig auf einem Zylinder der Länge 1. */
export function roehre(R: number, N: number): Roehre {
  if (N % 4 !== 0) throw new Error('N muss durch 4 teilbar sein');
  const c = N / 4;
  const ringPunkt = (i: number, j: number) => i * N + (((j % N) + N) % N);
  const innen = (c - 1) * (c - 1);
  const vornStart = R * N;
  const hintenStart = vornStart + innen;
  const n = hintenStart + innen;
  const kappeInnen = (start: number, a: number, b: number) => start + (b - 1) * (c - 1) + (a - 1);
  // Kappen-Rand (a, b) → Ringpunkt j: Umlauf ab (c/2, c) oben nach +z (rechts)
  const randJ = (a: number, b: number): number => {
    if (b === c) return a >= c / 2 ? a - c / 2 : N - (c / 2 - a); // oben: (c/2 → 0), (c → c/2), (0 → N − c/2)
    if (a === c) return c / 2 + (c - b); // rechts: hinunter
    if (b === 0) return c / 2 + c + (c - a); // unten: nach links
    return c / 2 + 2 * c + c - (c - b); // links: hinauf (a = 0)
  };
  const kappenPunkt = (seite: 'vorn' | 'hinten', a: number, b: number): number => {
    const start = seite === 'vorn' ? vornStart : hintenStart;
    const ring = seite === 'vorn' ? 0 : R - 1;
    if (a === 0 || a === c || b === 0 || b === c) return ringPunkt(ring, randJ(a, b));
    return kappeInnen(start, a, b);
  };
  const flaechen: number[][] = [];
  for (let i = 0; i + 1 < R; i++) for (let j = 0; j < N; j++) flaechen.push([ringPunkt(i, j), ringPunkt(i, j + 1), ringPunkt(i + 1, j + 1), ringPunkt(i + 1, j)]);
  const kappenFlaechen = (seite: 'vorn' | 'hinten', drehen: boolean) => {
    const out: number[][] = [];
    for (let a = 0; a < c; a++) {
      for (let b = 0; b < c; b++) {
        const q = [kappenPunkt(seite, a, b), kappenPunkt(seite, a + 1, b), kappenPunkt(seite, a + 1, b + 1), kappenPunkt(seite, a, b + 1)];
        out.push(drehen ? q.reverse() : q);
      }
    }
    return out;
  };
  // Lagen: Zylinder entlang x (vorn = −x), Kappen flach mit leichter Wölbung
  const xyz = new Float64Array(3 * n);
  for (let i = 0; i < R; i++) {
    const x = -0.5 + i / (R - 1);
    for (let j = 0; j < N; j++) {
      const t = (2 * Math.PI * j) / N;
      const p = ringPunkt(i, j);
      xyz[3 * p] = x;
      xyz[3 * p + 1] = 0.5 + 0.5 * Math.cos(t);
      xyz[3 * p + 2] = 0.5 * Math.sin(t);
    }
  }
  for (const seite of ['vorn', 'hinten'] as const) {
    for (let a = 1; a < c; a++) {
      for (let b = 1; b < c; b++) {
        const p = kappenPunkt(seite, a, b);
        const u = (a - c / 2) / (c / 2);
        const v = (b - c / 2) / (c / 2);
        const r = Math.max(Math.abs(u), Math.abs(v));
        xyz[3 * p] = (seite === 'vorn' ? -0.5 - 0.15 * (1 - r) : 0.5 + 0.15 * (1 - r));
        xyz[3 * p + 1] = 0.5 + 0.5 * v;
        xyz[3 * p + 2] = 0.5 * u;
      }
    }
  }
  // Orientierung der Kappen so wählen, dass der Käfig geschlossen und orientiert ist und das Volumen positiv
  let kaefig: Kaefig | null = null;
  for (const dv of [false, true]) {
    for (const dh of [false, true]) {
      const k = kaefigAusFlaechen(xyz, [...flaechen, ...kappenFlaechen('vorn', dv), ...kappenFlaechen('hinten', dh)]);
      const pr = pruefeKaefig(k);
      if (pr.ok) {
        kaefig = k;
        break;
      }
    }
    if (kaefig) break;
  }
  if (!kaefig) throw new Error('Röhre: keine konsistente Orientierung gefunden');
  if (volumen(kaefig) < 0) {
    // alle Flächen umdrehen
    const fl = [];
    for (let f = 0; f < kaefig.nF; f++) {
      const q = [];
      for (let h = kaefig.fStart[f]!; h < kaefig.fStart[f + 1]!; h++) q.push(kaefig.fVerts[h]!);
      fl.push(q.reverse());
    }
    kaefig = kaefigAusFlaechen(xyz, fl);
  }
  const ruecken: number[] = [];
  const bauch: number[] = [];
  for (let b = c - 1; b >= 1; b--) ruecken.push(kappenPunkt('vorn', c / 2, b)); // von der Spitze (Mitte) hoch zum Ring 0 oben
  ruecken.reverse(); // jetzt: nahe Scheitel … nahe Spitze; wir wollen Spitze → Scheitel → Rücken → Hinten
  const spitzeVorn = kappenPunkt('vorn', c / 2, c / 2);
  const spitzeHinten = kappenPunkt('hinten', c / 2, c / 2);
  // Rücken: Spitze vorn, Kappe vorn (b von c/2+1 … c−1), Ringe oben, Kappe hinten (b c−1 … c/2+1), Spitze hinten
  const rueckenZug: number[] = [spitzeVorn];
  for (let b = c / 2 + 1; b < c; b++) rueckenZug.push(kappenPunkt('vorn', c / 2, b));
  for (let i = 0; i < R; i++) rueckenZug.push(ringPunkt(i, 0));
  for (let b = c - 1; b > c / 2; b--) rueckenZug.push(kappenPunkt('hinten', c / 2, b));
  rueckenZug.push(spitzeHinten);
  const bauchZug: number[] = [spitzeVorn];
  for (let b = c / 2 - 1; b > 0; b--) bauchZug.push(kappenPunkt('vorn', c / 2, b));
  for (let i = 0; i < R; i++) bauchZug.push(ringPunkt(i, N / 2));
  for (let b = 1; b < c / 2; b++) bauchZug.push(kappenPunkt('hinten', c / 2, b));
  bauchZug.push(spitzeHinten);
  void ruecken;
  void bauch;
  return { R, N, c, kaefig, ringPunkt, kappe: kappenPunkt, naht: { ruecken: rueckenZug, bauch: bauchZug, spitzeVorn, spitzeHinten } };
}
