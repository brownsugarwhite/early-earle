// Wesen-Editor 2, Kern (13.10.2026): Catmull-Clark-Unterteilung mit halbscharfen Falten als lineare Abbildung.
//
// Semantik wie `versuch/catmullClark.ts` (DeRose/Kass/Truong 1998, Schärfe je Stufe −1, Chaikin entlang der
// Kantenzüge, Punktschärfe wie Blenders Vertex Crease). Neu: Die Stufe wird als dünn besetzte Matrix erzeugt
// (Kindlagen = Matrix · Elternlagen). Solange die Topologie und die Schärfen gleich bleiben, ist das feine Netz eine
// feste lineare Abbildung des Käfigs; jeder Zugschritt ist dann eine Matrix-Vektor-Multiplikation (Plan 4.4).
// Dazu die Grenzflächen-Maske (Halstead/Kass/DeRose 1993): Lage auf der Grenzfläche je Punkt, ebenfalls linear.

import { type Kaefig, kaefigAusFlaechen, kanteZwischen } from '../kaefig/halbkanten';
import { type DuennMatrix, MatrixBauer, anwenden3, multiplizieren } from './matrix';

export type Stufe = { kaefig: Kaefig; matrix: DuennMatrix };

/** Eine Unterteilungsstufe: Kind-Käfig (mit Lagen und Kindschärfen) und die Matrix Kind ← Eltern. */
export function verfeinern(k: Kaefig): Stufe {
  const nV = k.n;
  const nE = k.nE;
  const nF = k.nF;
  const bau = new MatrixBauer(nV);
  const fGroesse = (f: number) => k.fStart[f + 1]! - k.fStart[f]!;
  const s = (e: number) => k.eSchaerfe[e]!;
  const anderer = (e: number, v: number) => (k.eA[e] === v ? k.eB[e]! : k.eA[e]!);

  // Flächenpunkt-Gewichte (als Funktion, mehrfach gebraucht)
  const flaechenGewichte = (f: number, g: number) => {
    const m = fGroesse(f);
    for (let h = k.fStart[f]!; h < k.fStart[f + 1]!; h++) bau.add(k.fVerts[h]!, g / m);
  };

  // 1. Punktpunkte (Index wie Eltern)
  for (let v = 0; v < nV; v++) {
    const k0 = k.vKStart[v]!;
    const k1 = k.vKStart[v + 1]!;
    const n = k1 - k0;
    const f0 = k.vFStart[v]!;
    const f1 = k.vFStart[v + 1]!;
    const m = f1 - f0;
    const es = k.vSchaerfe[v]!;
    // scharfe Kanten
    let scharf = 0;
    let sSumme = 0;
    let o1 = -1;
    let o2 = -1;
    for (let i = k0; i < k1; i++) {
      const e = k.vKanten[i]!;
      if (s(e) > 0) {
        if (scharf === 0) o1 = anderer(e, v);
        else if (scharf === 1) o2 = anderer(e, v);
        scharf++;
        sSumme += s(e);
      }
    }
    // Gewichte: glatt = (Q + 2R + (n−3)P)/n; hart (2 scharfe) = (6P + o1 + o2)/8; Ecke = P
    const glattGewichte = (g: number) => {
      if (n === 0) {
        bau.add(v, g);
        return;
      }
      for (let i = f0; i < f1; i++) flaechenGewichte(k.vFlaechen[i]!, g / (n * Math.max(1, m)));
      // 2R/n = (1/n²) · Σ (P + O_e)
      for (let i = k0; i < k1; i++) {
        const e = k.vKanten[i]!;
        bau.add(v, g / (n * n));
        bau.add(anderer(e, v), g / (n * n));
      }
      bau.add(v, (g * (n - 3)) / n);
    };
    const hartGewichte = (g: number) => {
      if (scharf === 2) {
        bau.add(v, (6 * g) / 8);
        bau.add(o1, g / 8);
        bau.add(o2, g / 8);
      } else bau.add(v, g);
    };
    if (scharf < 2) {
      if (es <= 0) glattGewichte(1);
      else if (es >= 1) bau.add(v, 1);
      else {
        glattGewichte(1 - es);
        bau.add(v, es);
      }
    } else {
      const vs = sSumme / scharf;
      const ergebnis = (g: number) => {
        if (vs >= 1) hartGewichte(g);
        else {
          glattGewichte(g * (1 - vs));
          hartGewichte(g * vs);
        }
      };
      if (es <= 0) ergebnis(1);
      else if (es >= 1) bau.add(v, 1);
      else {
        ergebnis(1 - es);
        bau.add(v, es);
      }
    }
    bau.zeileFertig();
  }

  // 2. Kantenpunkte (Index nV + e)
  for (let e = 0; e < nE; e++) {
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    const h = k.eHalb[e]!;
    const t = k.hTwin[h]!;
    const sh = s(e);
    if (k.eFlaechen[e] !== 2 || t < 0 || sh >= 1) {
      bau.add(a, 0.5);
      bau.add(b, 0.5);
    } else {
      const fa = k.hFace[h]!;
      const fb = k.hFace[t]!;
      const gm = sh <= 0 ? 0 : sh; // Anteil Mitte
      const gg = 1 - gm; // Anteil glatt
      bau.add(a, gg / 4 + gm / 2);
      bau.add(b, gg / 4 + gm / 2);
      if (gg > 0) {
        flaechenGewichte(fa, gg / 4);
        flaechenGewichte(fb, gg / 4);
      }
    }
    bau.zeileFertig();
  }

  // 3. Flächenpunkte (Index nV + nE + f)
  for (let f = 0; f < nF; f++) {
    flaechenGewichte(f, 1);
    bau.zeileFertig();
  }
  const matrix = bau.fertig();

  // 4. Kindflächen: je Ecke ein Viereck [v, Kante(v, vor), Fläche, Kante(nach, v)]
  const flaechen: number[][] = [];
  for (let f = 0; f < nF; f++) {
    const h0 = k.fStart[f]!;
    const m = fGroesse(f);
    for (let i = 0; i < m; i++) {
      const h = h0 + i;
      const hv = h0 + ((i - 1 + m) % m);
      const v = k.fVerts[h]!;
      flaechen.push([v, nV + k.hEdge[h]!, nV + nE + f, nV + k.hEdge[hv]!]);
    }
  }
  const kind = kaefigAusFlaechen(anwenden3(matrix, k.xyz), flaechen);

  // 5. Kindschärfen: Chaikin entlang der Kantenzüge, dann −1
  const nachbar = (e: number, v: number) => {
    let andere = -1;
    let anzahl = 0;
    for (let i = k.vKStart[v]!; i < k.vKStart[v + 1]!; i++) {
      const x = k.vKanten[i]!;
      if (x !== e && s(x) > 0) {
        anzahl++;
        andere = x;
      }
    }
    return anzahl === 1 ? s(andere) : s(e);
  };
  for (let e = 0; e < nE; e++) {
    const sh = s(e);
    if (sh <= 0) continue;
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    const mitte = nV + e;
    const sa = Math.max(0, (3 * sh + nachbar(e, a)) / 4 - 1);
    const sb = Math.max(0, (3 * sh + nachbar(e, b)) / 4 - 1);
    if (sa > 0) kind.eSchaerfe[kanteZwischen(kind, a, mitte)] = sa;
    if (sb > 0) kind.eSchaerfe[kanteZwischen(kind, mitte, b)] = sb;
  }
  for (let v = 0; v < nV; v++) kind.vSchaerfe[v] = Math.max(0, k.vSchaerfe[v]! - 1);
  return { kaefig: kind, matrix };
}

/**
 * Grenzflächen-Maske: Lage jedes Punkts auf der Grenzfläche (Halstead/Kass/DeRose 1993) als Matrix auf die Lagen
 * derselben Stufe. Glatt: (n²·P + 4·Σ Nachbarn + Σ Diagonalpunkte) / (n(n+5)); Falte (zwei scharfe Kanten):
 * (4P + o1 + o2)/6; Ecke (≥ 3 scharfe Kanten oder Punktschärfe): P. Teilschärfen werden überblendet.
 */
export function grenzMaske(k: Kaefig): DuennMatrix {
  const bau = new MatrixBauer(k.n);
  const s = (e: number) => k.eSchaerfe[e]!;
  const anderer = (e: number, v: number) => (k.eA[e] === v ? k.eB[e]! : k.eA[e]!);
  for (let v = 0; v < k.n; v++) {
    const k0 = k.vKStart[v]!;
    const k1 = k.vKStart[v + 1]!;
    const n = k1 - k0;
    const es = Math.min(1, Math.max(0, k.vSchaerfe[v]!));
    let scharf = 0;
    let sSumme = 0;
    let o1 = -1;
    let o2 = -1;
    for (let i = k0; i < k1; i++) {
      const e = k.vKanten[i]!;
      if (s(e) > 0) {
        if (scharf === 0) o1 = anderer(e, v);
        else if (scharf === 1) o2 = anderer(e, v);
        scharf++;
        sSumme += Math.min(1, s(e));
      }
    }
    const glatt = (g: number) => {
      if (n < 3) {
        bau.add(v, g);
        return;
      }
      const d = n * (n + 5);
      bau.add(v, (g * n * n) / d);
      for (let i = k0; i < k1; i++) bau.add(anderer(k.vKanten[i]!, v), (4 * g) / d);
      for (let i = k.vFStart[v]!; i < k.vFStart[v + 1]!; i++) {
        const f = k.vFlaechen[i]!;
        const h0 = k.fStart[f]!;
        const m = k.fStart[f + 1]! - h0;
        if (m === 4) {
          // Diagonalpunkt: zwei Ecken weiter
          let p = 0;
          while (k.fVerts[h0 + p] !== v) p++;
          bau.add(k.fVerts[h0 + ((p + 2) % 4)]!, g / d);
        } else {
          for (let h = h0; h < h0 + m; h++) bau.add(k.fVerts[h]!, g / (d * m));
        }
      }
    };
    const falte = (g: number) => {
      bau.add(v, (4 * g) / 6);
      bau.add(o1, g / 6);
      bau.add(o2, g / 6);
    };
    const kern = (g: number) => {
      if (scharf >= 3) bau.add(v, g);
      else if (scharf === 2) {
        const vs = sSumme / 2;
        if (vs >= 1) falte(g);
        else {
          glatt(g * (1 - vs));
          falte(g * vs);
        }
      } else glatt(g);
    };
    if (es >= 1) bau.add(v, 1);
    else if (es <= 0) kern(1);
    else {
      kern(1 - es);
      bau.add(v, es);
    }
    bau.zeileFertig();
  }
  return bau.fertig();
}

export type Unterteilung = {
  /** Stufen 1 … L (Käfig je Stufe mit Lagen für die Eingabe) */
  stufen: Stufe[];
  /** Lagen der Stufe L ← Käfig */
  matrix: DuennMatrix;
  /** Grenzflächen-Lagen der Stufe L ← Käfig */
  grenze: DuennMatrix;
};

/** L Stufen unterteilen; Matrizen zusammenmultipliziert, dazu die Grenzflächen-Maske der letzten Stufe. */
export function unterteilung(k: Kaefig, L: number): Unterteilung {
  const stufen: Stufe[] = [];
  let matrix: DuennMatrix | null = null;
  let aktuell = k;
  for (let i = 0; i < L; i++) {
    const st = verfeinern(aktuell);
    stufen.push(st);
    matrix = matrix ? multiplizieren(st.matrix, matrix) : st.matrix;
    aktuell = st.kaefig;
  }
  const maske = grenzMaske(aktuell);
  const m = matrix ?? maske;
  return { stufen, matrix: matrix ?? einheitFuer(k.n), grenze: matrix ? multiplizieren(maske, matrix) : maske };
  function einheitFuer(n: number): DuennMatrix {
    const start = new Uint32Array(n + 1);
    const index = new Uint32Array(n);
    const wert = new Float64Array(n).fill(1);
    for (let i = 0; i < n; i++) {
      start[i + 1] = i + 1;
      index[i] = i;
    }
    void m;
    return { zeilen: n, spalten: n, start, index, wert };
  }
}
