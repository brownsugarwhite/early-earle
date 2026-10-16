// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S5 „Mittelebenen-Baum“: Topologie eines Käfigs aus mehreren Streifen.
//
// Ein Körper aus Mittelteilen ist ein Höhenfeld über seiner Seitenfläche; sein Käfig ist ein 2D-Vierecksnetz der Seite,
// verdoppelt (rechte Kopie z > 0, linke z < 0), die Randpunkte bilden die Naht (z = 0). Die Röhre (`roehre.ts`) ist der Fall
// eines Streifens: Ring i, Punkt j (0 oben, N/4 rechts, N/2 unten, 3N/4 links; j und N − j sind Spiegelpaare) und an jeder
// Spitze eine c × c-Kappe (c = N/4), deren Spalte a = c/2 auf der Naht liegt.
//
// Mehrere Streifen:
// - **Seitlich angesetzt:** Der erste Ring eines Kindstreifens ist ein Stück der Naht seines Elternstreifens — die Enden der
//   Ringe iA … iB auf der Seite a (Punkt 0) oder b (Punkt N/2). Die inneren dieser Punkte liegen danach nicht mehr auf der
//   Naht und werden verdoppelt (rechte Kopie = bisheriger Index, linke Kopie neu). Kindring 0: j = 0 ↔ Ring iA, j = k ↔ Ring
//   iA + k (rechts), j = H ↔ Ring iB, j = N_k − k ↔ linke Kopie; H = N_k / 2 = iB − iA.
// - **Kragen** (S5-Reste R1): Kindring 0 ist eine U-Schleife auf der Haut des Elternstreifens — vom Sehnenende A (Ring iA,
//   Punkt 0 bzw. N/2) den Ring iA hinab bis zur Zeile m (`tiefe`), die Zeile m entlang bis Ring iB = iA + w und den Ring iB
//   hinauf zum Sehnenende B (H = N_k / 2 = 2m + w). Die Elternflächen innerhalb des U und die Punkte darin entfallen, das Kind
//   füllt das Feld. A und B bleiben gewöhnliche Nahtpunkte (vier Kanten), die Ecken des U haben fünf Kanten; keine Kopien.
// - **Fortsetzung mit Übergang 2:1:** Die Endkappe des Elternstreifens bekommt ein Kind an ihrer Nahtspalte (a = c/2, von
//   b = c oben bis b = 0 unten): Die Spalte wird Kindring 0 (N_k = 2c = N/2), ihre inneren Punkte werden verdoppelt.
//
// Nummerierung (ein Streifen ohne Kinder = genau `roehre(R, N)`): erst alle Ringpunkte (je Streifen, je Ring, j = 0 … N − 1;
// angesetzte Kindringe 0 gehören dem Elternstreifen, Punkte innerhalb eines Kragens entfallen), dann die inneren Punkte der Übergangskappen, dann die linken Kopien,
// zuletzt die inneren Punkte der Spitzenkappen (`kappeAb`, für das Glättungsmaß der Kappen). Flächen: Ringvierecke, dann
// Kappenvierecke (a, b); die Orientierung wird von der ersten Fläche aus über gemeinsame Kanten weitergegeben. DOM-frei.

import { type Kaefig, kaefigAusFlaechen, volumen } from './halbkanten';

export type AnfangTopo =
  | { art: 'kappe' }
  | { art: 'uebergang' }
  | { art: 'seitlich'; eltern: number; seite: 'a' | 'b'; ring: number }
  | { art: 'kragen'; eltern: number; seite: 'a' | 'b'; ring: number; tiefe: number }
  | { art: 'fortsetzung'; eltern: number; ende: 'anfang' | 'ende' };

export type EndeTopo = { art: 'kappe' } | { art: 'uebergang' };

export type StreifenTopo = { R: number; N: number; anfang: AnfangTopo; ende: EndeTopo };

export type FlaechenArt = 'ring' | 'kappe' | 'uebergang';

export type BaumKaefig = {
  kaefig: Kaefig;
  streifen: readonly StreifenTopo[];
  /** Index des Ringpunkts (Streifen s, Ring i, j = 0 … N − 1); verdoppelte Punkte: rechte Kopie */
  ring: (s: number, i: number, j: number) => number;
  /** false für Punkte, die ein Kragen entfernt hat */
  existiert: (s: number, i: number, j: number) => boolean;
  /** innerer Kappenpunkt (a, b = 1 … c − 1) bzw. Randpunkt über den End-Ring; `wo` = Kappe am Anfang oder am Ende */
  kappe: (s: number, wo: 'anfang' | 'ende', a: number, b: number) => number;
  /** linke Kopie eines verdoppelten Punkts (sonst der Punkt selbst) */
  links: (p: number) => number;
  /** Spiegelpartner je Punkt (Naht: sich selbst) */
  spiegel: Int32Array;
  /** 1 = Nahtpunkt (z = 0) */
  naht: Uint8Array;
  /** ab diesem Index nur innere Punkte von Spitzenkappen */
  kappeAb: number;
  /** je Käfigfläche: Streifen und Art; Ringflächen: Ring i und Spalte j (sonst −1) */
  flaecheStreifen: Int32Array;
  flaecheArt: FlaechenArt[];
  flaecheRing: Int32Array;
  flaecheJ: Int32Array;
};

/** Ort eines Kragenpunkts (Kindring 0, Punkt j) im Elternstreifen: Ring und Spalte. */
export function kragenOrt(eltern: StreifenTopo, a: { seite: 'a' | 'b'; ring: number; tiefe: number }, N: number, j: number): { i: number; j: number } {
  const H = N / 2;
  const m = a.tiefe;
  const w = H - 2 * m;
  const jj = ((j % N) + N) % N;
  const rechts = jj <= H;
  const k = rechts ? jj : N - jj;
  let i: number;
  let zeile: number;
  if (k <= m) {
    i = a.ring;
    zeile = k;
  } else if (k <= m + w) {
    i = a.ring + (k - m);
    zeile = m;
  } else {
    i = a.ring + w;
    zeile = H - k;
  }
  const h = eltern.N / 2;
  let jp = a.seite === 'a' ? zeile : h - zeile;
  if (!rechts && jp !== 0 && jp !== h) jp = eltern.N - jp;
  return { i, j: jp };
}

const c4 = (N: number) => N / 4;

/** Topologie bauen. `lagen` (3 je Punkt in der Nummerierung oben) entscheidet die Orientierung (positives Volumen). */
export function baumKaefig(streifen: readonly StreifenTopo[], lagen?: (p: number) => [number, number, number]): BaumKaefig {
  for (const s of streifen) if (s.N % 4 !== 0 || s.N < 8 || s.R < 2) throw new Error('baumKaefig: N durch 4 teilbar und ≥ 8, R ≥ 2');
  const S = streifen.length;
  // Kinder je Elternstreifen prüfen
  streifen.forEach((st, s) => {
    const a = st.anfang;
    if (a.art === 'seitlich') {
      const p = streifen[a.eltern];
      if (!p || a.eltern >= s) throw new Error('baumKaefig: Elternstreifen muss vorher kommen');
      if (a.ring < 1 || a.ring + st.N / 2 > p.R - 2) throw new Error('baumKaefig: Ansatz muss zwischen den Endringen liegen');
    }
    if (a.art === 'kragen') {
      const p = streifen[a.eltern];
      if (!p || a.eltern >= s) throw new Error('baumKaefig: Elternstreifen muss vorher kommen');
      const w = st.N / 2 - 2 * a.tiefe;
      if (a.tiefe < 1 || w < 1) throw new Error('baumKaefig: Kragen braucht Tiefe ≥ 1 und Breite ≥ 1');
      if (a.tiefe >= p.N / 2) throw new Error('baumKaefig: Kragen tiefer als der halbe Elternring');
      if (a.ring < 1 || a.ring + w > p.R - 2) throw new Error('baumKaefig: Kragen muss zwischen den Endringen liegen');
    }
    if (a.art === 'fortsetzung') {
      const p = streifen[a.eltern];
      if (!p || a.eltern >= s) throw new Error('baumKaefig: Elternstreifen muss vorher kommen');
      if (st.N * 2 !== p.N) throw new Error('baumKaefig: Fortsetzung halbiert die Punktzahl');
      const ende = a.ende === 'anfang' ? p.anfang : p.ende;
      if (ende.art !== 'uebergang') throw new Error('baumKaefig: Elternende muss ein Übergang sein');
    }
  });
  // 0. Kragen: Elternpunkte und -flächen innerhalb des U entfallen (Schlüssel i · N + j)
  const entfernt = streifen.map(() => new Set<number>());
  const flaecheWeg = streifen.map(() => new Set<number>());
  const kragenPunkte = streifen.map(() => new Set<number>());
  for (let s = 0; s < S; s++) {
    const a = streifen[s]!.anfang;
    if (a.art !== 'kragen') continue;
    const p = streifen[a.eltern]!;
    const Np = p.N;
    const h = Np / 2;
    const m = a.tiefe;
    const iB = a.ring + streifen[s]!.N / 2 - 2 * m;
    for (let i = a.ring; i < iB; i++) {
      for (let j = 0; j < Np; j++) {
        const innen = a.seite === 'a' ? j < m || j >= Np - m : j >= h - m && j < h + m;
        if (innen) flaecheWeg[a.eltern]!.add(i * Np + j);
      }
    }
    for (let i = a.ring + 1; i < iB; i++) {
      for (let j = 0; j < Np; j++) {
        const innen = a.seite === 'a' ? j < m || j > Np - m : j > h - m && j < h + m;
        if (innen) entfernt[a.eltern]!.add(i * Np + j);
      }
    }
    for (let j = 0; j < streifen[s]!.N; j++) {
      const o = kragenOrt(p, a, streifen[s]!.N, j);
      kragenPunkte[a.eltern]!.add(o.i * Np + o.j);
    }
  }
  for (let s = 0; s < S; s++) for (const q of kragenPunkte[s]!) if (entfernt[s]!.has(q)) throw new Error('baumKaefig: Kragen überschneiden sich');
  // 1. Ringpunkte
  const eigen: Int32Array[] = [];
  let n = 0;
  for (let s = 0; s < S; s++) {
    const st = streifen[s]!;
    const t = new Int32Array(st.R * st.N).fill(-1);
    const ab = st.anfang.art === 'seitlich' || st.anfang.art === 'fortsetzung' || st.anfang.art === 'kragen' ? 1 : 0;
    for (let i = ab; i < st.R; i++) for (let j = 0; j < st.N; j++) if (!entfernt[s]!.has(i * st.N + j)) t[i * st.N + j] = n++;
    eigen.push(t);
  }
  const eigenerRing = (s: number, i: number, j: number) => {
    const N = streifen[s]!.N;
    const p = eigen[s]![i * N + (((j % N) + N) % N)];
    if (p === undefined || p < 0) throw new Error(`baumKaefig: Ringpunkt ${s}/${i}/${j} gibt es nicht`);
    return p;
  };
  // 2. innere Punkte der Übergangskappen
  const kappenBasis = new Map<string, number>();
  for (let s = 0; s < S; s++) {
    const st = streifen[s]!;
    const c = c4(st.N);
    for (const wo of ['anfang', 'ende'] as const) {
      if ((wo === 'anfang' ? st.anfang : st.ende).art !== 'uebergang') continue;
      kappenBasis.set(`${s}/${wo}`, n);
      n += (c - 1) * (c - 1);
    }
  }
  // 3. linke Kopien: Sprossenenden unter seitlichen Ansätzen und Nahtspalten der Übergangskappen
  const linkeKopie = new Map<number, number>();
  const kappeInnen = (s: number, wo: 'anfang' | 'ende', a: number, b: number) => kappenBasis.get(`${s}/${wo}`)! + (b - 1) * (c4(streifen[s]!.N) - 1) + (a - 1);
  for (let s = 0; s < S; s++) {
    const a = streifen[s]!.anfang;
    if (a.art === 'seitlich') {
      const p = streifen[a.eltern]!;
      const jp = a.seite === 'a' ? 0 : p.N / 2;
      for (let i = a.ring + 1; i < a.ring + streifen[s]!.N / 2; i++) linkeKopie.set(eigenerRing(a.eltern, i, jp), n++);
    }
  }
  // (die Nahtspalte einer Übergangskappe wird erst verdoppelt, wenn ihr Kind existiert)
  for (let s = 0; s < S; s++) {
    const a = streifen[s]!.anfang;
    if (a.art !== 'fortsetzung') continue;
    const c = c4(streifen[a.eltern]!.N);
    for (let b = 1; b < c; b++) linkeKopie.set(kappeInnen(a.eltern, a.ende, c / 2, b), n++);
  }
  // 4. innere Punkte der Spitzenkappen
  const kappeAb = n;
  for (let s = 0; s < S; s++) {
    const st = streifen[s]!;
    const c = c4(st.N);
    for (const wo of ['anfang', 'ende'] as const) {
      if ((wo === 'anfang' ? st.anfang : st.ende).art !== 'kappe') continue;
      kappenBasis.set(`${s}/${wo}`, n);
      n += (c - 1) * (c - 1);
    }
  }
  const links = (p: number) => linkeKopie.get(p) ?? p;

  // Ringpunkt mit angesetzten Kindringen 0
  const ring = (s: number, i: number, j: number): number => {
    const st = streifen[s]!;
    const N = st.N;
    const jj = ((j % N) + N) % N;
    const a = st.anfang;
    if (i === 0 && a.art === 'seitlich') {
      const p = streifen[a.eltern]!;
      const jp = a.seite === 'a' ? 0 : p.N / 2;
      const H = N / 2;
      if (jj <= H) return ring(a.eltern, a.ring + jj, jp);
      return links(ring(a.eltern, a.ring + (N - jj), jp));
    }
    if (i === 0 && a.art === 'fortsetzung') {
      const c = c4(streifen[a.eltern]!.N);
      if (jj <= c) return kappe(a.eltern, a.ende, c / 2, c - jj);
      return links(kappe(a.eltern, a.ende, c / 2, jj - c));
    }
    if (i === 0 && a.art === 'kragen') {
      const o = kragenOrt(streifen[a.eltern]!, a, N, jj);
      return ring(a.eltern, o.i, o.j);
    }
    return eigenerRing(s, i, jj);
  };
  const existiert = (s: number, i: number, j: number): boolean => {
    const st = streifen[s]!;
    if (i === 0 && (st.anfang.art === 'seitlich' || st.anfang.art === 'fortsetzung' || st.anfang.art === 'kragen')) return true;
    const N = st.N;
    return (eigen[s]![i * N + (((j % N) + N) % N)] ?? -1) >= 0;
  };
  // Kappen-Rand (a, b) → Ringpunkt j wie in der Röhre: oben (b = c) von a = c/2 nach rechts, rechts hinunter, unten nach links, links hinauf
  const randJ = (c: number, a: number, b: number): number => {
    const N = 4 * c;
    if (b === c) return a >= c / 2 ? a - c / 2 : N - (c / 2 - a);
    if (a === c) return c / 2 + (c - b);
    if (b === 0) return c / 2 + c + (c - a);
    return c / 2 + 2 * c + c - (c - b);
  };
  const kappe = (s: number, wo: 'anfang' | 'ende', a: number, b: number): number => {
    const st = streifen[s]!;
    const c = c4(st.N);
    if (a === 0 || a === c || b === 0 || b === c) return ring(s, wo === 'anfang' ? 0 : st.R - 1, randJ(c, a, b));
    return kappenBasis.get(`${s}/${wo}`)! + (b - 1) * (c - 1) + (a - 1);
  };

  // Flächen
  const flaechen: number[][] = [];
  const fStreifen: number[] = [];
  const fArt: FlaechenArt[] = [];
  const fRing: number[] = [];
  const fJ: number[] = [];
  for (let s = 0; s < S; s++) {
    const st = streifen[s]!;
    const N = st.N;
    for (let i = 0; i + 1 < st.R; i++) {
      for (let j = 0; j < N; j++) {
        if (flaecheWeg[s]!.has(i * N + j)) continue;
        const rechts = j < N / 2;
        const P = (ii: number, jj: number) => {
          const p = ring(s, ii, jj);
          return rechts ? p : links(p);
        };
        flaechen.push([P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j)]);
        fStreifen.push(s);
        fArt.push('ring');
        fRing.push(i);
        fJ.push(j);
      }
    }
  }
  for (let s = 0; s < S; s++) {
    const st = streifen[s]!;
    const c = c4(st.N);
    for (const wo of ['anfang', 'ende'] as const) {
      const art = (wo === 'anfang' ? st.anfang : st.ende).art;
      if (art !== 'kappe' && art !== 'uebergang') continue;
      for (let a = 0; a < c; a++) {
        for (let b = 0; b < c; b++) {
          const rechts = a >= c / 2;
          const K = (aa: number, bb: number) => {
            const p = kappe(s, wo, aa, bb);
            return rechts ? p : links(p);
          };
          flaechen.push([K(a, b), K(a + 1, b), K(a + 1, b + 1), K(a, b + 1)]);
          fStreifen.push(s);
          fArt.push(art === 'kappe' ? 'kappe' : 'uebergang');
          fRing.push(-1);
          fJ.push(-1);
        }
      }
    }
  }
  orientieren(flaechen);

  // Spiegel und Naht
  const spiegel = new Int32Array(n).fill(-1);
  const naht = new Uint8Array(n);
  const paar = (p: number, q: number) => {
    spiegel[p] = q;
    spiegel[q] = p;
  };
  for (let s = 0; s < S; s++) {
    const st = streifen[s]!;
    const N = st.N;
    const c = c4(N);
    for (let i = 0; i < st.R; i++) {
      for (let j = 0; j <= N / 2; j++) {
        if (!existiert(s, i, j)) continue;
        const p = ring(s, i, j);
        if (j === 0 || j === N / 2) {
          const q = links(p);
          if (q === p) {
            spiegel[p] = p;
            naht[p] = 1;
          } else paar(p, q);
        } else paar(p, ring(s, i, N - j));
      }
    }
    for (const wo of ['anfang', 'ende'] as const) {
      const art = (wo === 'anfang' ? st.anfang : st.ende).art;
      if (art !== 'kappe' && art !== 'uebergang') continue;
      for (let b = 1; b < c; b++) {
        for (let a = 1; a < c; a++) {
          const p = kappe(s, wo, a, b);
          if (a === c / 2) {
            const q = links(p);
            if (q === p) {
              spiegel[p] = p;
              naht[p] = 1;
            } else paar(p, q);
          } else paar(p, kappe(s, wo, c - a, b));
        }
      }
    }
  }
  for (let p = 0; p < n; p++) if (spiegel[p]! < 0) throw new Error(`baumKaefig: Punkt ${p} ohne Spiegelpartner`);

  // Lagen nur für die Orientierung (positives Volumen); ohne Angabe ein Zylinder je Streifen
  const xyz = new Float64Array(3 * n);
  if (lagen) {
    for (let p = 0; p < n; p++) {
      const q = lagen(p);
      xyz[3 * p] = q[0];
      xyz[3 * p + 1] = q[1];
      xyz[3 * p + 2] = q[2];
    }
  }
  let kaefig = kaefigAusFlaechen(xyz, flaechen);
  if (lagen && volumen(kaefig) < 0) {
    for (const f of flaechen) f.reverse();
    kaefig = kaefigAusFlaechen(xyz, flaechen);
  }
  return { kaefig, streifen, ring, existiert, kappe, links, spiegel, naht, kappeAb, flaecheStreifen: Int32Array.from(fStreifen), flaecheArt: fArt, flaecheRing: Int32Array.from(fRing), flaecheJ: Int32Array.from(fJ) };
}

/**
 * Orientierung von der ersten Fläche aus weitergeben: Teilen zwei Flächen eine Kante, durchlaufen sie sie gegenläufig;
 * sonst wird die Nachbarfläche umgedreht (`reverse`, wie die Kappen der Röhre). Wirft, wenn das Netz nicht orientierbar ist.
 */
export function orientieren(flaechen: number[][]): void {
  const kante = new Map<string, { f: number; k: number }[]>();
  const schluessel = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
  flaechen.forEach((fl, f) => {
    for (let k = 0; k < fl.length; k++) {
      const key = schluessel(fl[k]!, fl[(k + 1) % fl.length]!);
      (kante.get(key) ?? kante.set(key, []).get(key)!).push({ f, k });
    }
  });
  for (const [key, l] of kante) if (l.length !== 2) throw new Error(`orientieren: Kante ${key} mit ${l.length} Flächen`);
  const fertig = new Uint8Array(flaechen.length);
  for (let start = 0; start < flaechen.length; start++) {
    if (fertig[start]) continue;
    fertig[start] = 1;
    const schlange = [start];
    while (schlange.length) {
      const f = schlange.pop()!;
      const fl = flaechen[f]!;
      for (let k = 0; k < fl.length; k++) {
        const a = fl[k]!;
        const b = fl[(k + 1) % fl.length]!;
        for (const nb of kante.get(schluessel(a, b))!) {
          if (nb.f === f) continue;
          const g = flaechen[nb.f]!;
          const gleich = g.findIndex((x, t) => x === a && g[(t + 1) % g.length] === b) >= 0;
          if (fertig[nb.f]) {
            if (gleich) throw new Error('orientieren: nicht orientierbar');
            continue;
          }
          if (gleich) g.reverse();
          fertig[nb.f] = 1;
          schlange.push(nb.f);
        }
      }
    }
  }
}
