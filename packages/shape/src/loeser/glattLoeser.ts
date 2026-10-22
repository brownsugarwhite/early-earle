// Posen (Plan Teil B, B5): glatter Ausgleich im posierten Raum für die Lippenprojektion. Unbekannte = Verschiebung der
// Käfigpunkte eines Bereichs (alle drei Achsen getrennt, dieselbe Matrix), Energie = Bi-Laplace (gleichförmiger Laplace an
// den Punkten des Bereichs und ihren Nachbarn) + Dämpfung + gewichtete Bedingungen an Zeilen der Grenzmatrix; außerhalb
// des Bereichs exakt 0. Die Matrix hängt weder an der Stellung noch an den Zielen: einmal zerlegen je Topologie (Hülle nach
// Cuthill-McKee, Cholesky in Zeilen der Hülle), je Auswertung nur Vorwärts- und Rückwärtseinsetzen für drei rechte Seiten.

export type GlattZeile = {
  /** Zeile der Grenzmatrix: Käfigpunkte und Gewichte (feiner Punkt = Σ w·Käfigpunkt) */
  index: ArrayLike<number>;
  wert: ArrayLike<number>;
  /** Gewicht (groß = fast hart) */
  gewicht: number;
};

export type GlattLoeserEingabe = {
  n: number;
  /** Nachbarn je Käfigpunkt (Kanten des Käfigs) */
  nachbarn: readonly (readonly number[])[];
  /** Käfigpunkte, die sich bewegen dürfen */
  bereich: readonly number[];
  zeilen: readonly GlattZeile[];
  /** Gewicht des Bi-Laplace (Standard 1) */
  glatt?: number;
  /** Dämpfung ε (Standard 1e-6) */
  daempfung?: number;
};

export type GlattLoeser = {
  /** Verschiebung aller Käfigpunkte (3n) für Zielversätze je Zeile (3 je Zeile) */
  loesen(ziele: ArrayLike<number>): Float64Array;
  /** Punkte im Bereich, Einträge der Hülle */
  punkte: number;
  huelle: number;
  zeitZerlegen: number;
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Reverse Cuthill-McKee über einen Graphen (Nachbarlisten); liefert die neue Reihenfolge der Knoten. */
export function cuthillMcKee(adj: readonly (readonly number[])[]): number[] {
  const K = adj.length;
  const reihenfolge: number[] = [];
  const besucht = new Uint8Array(K);
  const grad = (k: number) => adj[k]!.length;
  const offen = Array.from({ length: K }, (_, k) => k).sort((a, b) => grad(a) - grad(b));
  for (const s of offen) {
    if (besucht[s]) continue;
    besucht[s] = 1;
    const schlange = [s];
    for (let q = 0; q < schlange.length; q++) {
      const k = schlange[q]!;
      reihenfolge.push(k);
      const nb = adj[k]!.filter((x) => !besucht[x]).sort((a, b) => grad(a) - grad(b));
      for (const x of nb) {
        besucht[x] = 1;
        schlange.push(x);
      }
    }
  }
  return reihenfolge.reverse();
}

export function glattLoeserBauen(e: GlattLoeserEingabe): GlattLoeser {
  const t0 = jetzt();
  const { n, nachbarn } = e;
  const glatt = e.glatt ?? 1;
  const eps = e.daempfung ?? 1e-6;
  const varVon = new Int32Array(n).fill(-1);
  const punkte: number[] = [];
  for (const i of e.bereich) {
    if (i < 0 || i >= n || varVon[i]! >= 0) continue;
    varVon[i] = punkte.length;
    punkte.push(i);
  }
  const K = punkte.length;
  // dünne Zeilen über die Unbekannten (Variable → Wert)
  type Zeile = Map<number, number>;
  const add = (z: Zeile, i: number, w: number) => {
    const v = varVon[i]!;
    if (v < 0) return;
    z.set(v, (z.get(v) ?? 0) + w);
  };
  const glattZeilen: Zeile[] = [];
  const energie = new Uint8Array(n);
  for (const i of punkte) {
    energie[i] = 1;
    for (const j of nachbarn[i]!) energie[j] = 1;
  }
  for (let v = 0; v < n; v++) {
    if (!energie[v]) continue;
    const nb = nachbarn[v]!;
    if (!nb.length) continue;
    const z: Zeile = new Map();
    for (const w of nb) add(z, w, 1 / nb.length);
    add(z, v, -1);
    if (z.size) glattZeilen.push(z);
  }
  const bedZeilen = e.zeilen.map((b) => {
    const z: Zeile = new Map();
    for (let t = 0; t < b.index.length; t++) add(z, b.index[t]!, b.wert[t]!);
    return { z, w: b.gewicht };
  });
  // Graph der Kopplungen → Reihenfolge
  const adjSet: Set<number>[] = Array.from({ length: K }, () => new Set<number>());
  const koppeln = (z: Zeile) => {
    const ks = [...z.keys()];
    for (const a of ks) for (const b of ks) if (a !== b) adjSet[a]!.add(b);
  };
  for (const z of glattZeilen) koppeln(z);
  for (const { z } of bedZeilen) koppeln(z);
  const reihenfolge = cuthillMcKee(adjSet.map((s) => [...s]));
  const pos = new Int32Array(K);
  reihenfolge.forEach((k, p) => (pos[k] = p));
  // Hülle: erste Spalte je Zeile (untere Hälfte)
  const erste = new Int32Array(K);
  for (let p = 0; p < K; p++) erste[p] = p;
  const huelleAus = (z: Zeile) => {
    const ps = [...z.keys()].map((k) => pos[k]!);
    let lo = Infinity;
    for (const p of ps) lo = Math.min(lo, p);
    for (const p of ps) if (lo < erste[p]!) erste[p] = lo;
  };
  for (const z of glattZeilen) huelleAus(z);
  for (const { z } of bedZeilen) huelleAus(z);
  const start = new Int32Array(K + 1);
  for (let p = 0; p < K; p++) start[p + 1] = start[p]! + (p - erste[p]! + 1);
  const H = new Float64Array(start[K]!);
  const at = (i: number, j: number) => start[i]! + (j - erste[i]!);
  const aufaddieren = (z: Zeile, w: number) => {
    const ein = [...z].map(([k, v]) => [pos[k]!, v] as const);
    for (const [i, vi] of ein) for (const [j, vj] of ein) if (j <= i) H[at(i, j)] = H[at(i, j)]! + w * vi * vj;
  };
  for (const z of glattZeilen) aufaddieren(z, glatt);
  for (const { z, w } of bedZeilen) aufaddieren(z, w);
  for (let i = 0; i < K; i++) H[at(i, i)] = H[at(i, i)]! + eps;
  // Cholesky in der Hülle (Zeile für Zeile)
  for (let i = 0; i < K; i++) {
    const fi = erste[i]!;
    for (let j = fi; j <= i; j++) {
      let s = H[at(i, j)]!;
      const von = Math.max(fi, erste[j]!);
      const oi = start[i]! - fi;
      const oj = start[j]! - erste[j]!;
      for (let k = von; k < j; k++) s -= H[oi + k]! * H[oj + k]!;
      if (j < i) H[at(i, j)] = s / H[at(j, j)]!;
      else H[at(i, i)] = Math.sqrt(Math.max(s, 1e-300));
    }
  }
  const bedVar = bedZeilen.map(({ z, w }) => ({ w, ein: [...z].map(([k, v]) => [pos[k]!, v] as const) }));
  const zeitZerlegen = jetzt() - t0;
  const b = new Float64Array(K);
  const loesen = (ziele: ArrayLike<number>): Float64Array => {
    const d = new Float64Array(3 * n);
    for (let a = 0; a < 3; a++) {
      b.fill(0);
      bedVar.forEach(({ w, ein }, k) => {
        const t = ziele[3 * k + a]!;
        if (t === 0) return;
        for (const [i, v] of ein) b[i] = b[i]! + w * t * v;
      });
      // L·y = b
      for (let i = 0; i < K; i++) {
        const fi = erste[i]!;
        const oi = start[i]! - fi;
        let s = b[i]!;
        for (let k = fi; k < i; k++) s -= H[oi + k]! * b[k]!;
        b[i] = s / H[at(i, i)]!;
      }
      // Lᵀ·x = y (spaltenweise)
      for (let i = K - 1; i >= 0; i--) {
        b[i] = b[i]! / H[at(i, i)]!;
        const xi = b[i]!;
        const fi = erste[i]!;
        const oi = start[i]! - fi;
        for (let k = fi; k < i; k++) b[k] = b[k]! - H[oi + k]! * xi;
      }
      for (let p = 0; p < K; p++) d[3 * punkte[reihenfolge[p]!]! + a] = b[p]!;
    }
    return d;
  };
  return { loesen, punkte: K, huelle: start[K]!, zeitZerlegen };
}
