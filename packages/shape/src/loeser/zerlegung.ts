// Form zuerst (06.11.2026): dünn besetzte Cholesky-Zerlegung der Normalgleichungen für die dichte Haut. Die Hülle
// (`normalSystem`, Cuthill-McKee) wächst auf einer geschlossenen Haut etwa mit dem Quadrat der Punktzahl: beim Greifen einer Kugel
// mit drei Loops 0,4 s bei 7 900 Punkten, 1,4 s bei 15 400, 4,9 s bei 27 800. Hier wird in verschachtelter Zerlegung geordnet
// (nested dissection: eine Ebene einer Breitensuche trennt den Graphen der Matrix in zwei Hälften, beide Hälften zuerst, der Trenner
// zuletzt, das Ganze rekursiv) und Zeile für Zeile zerlegt (wie `cs_chol` in CSparse, Davis 2006: Eliminationsbaum, Muster jeder
// Zeile über den Baum, dann Werte). Dieselbe Schnittstelle wie `normalSystem`; die Ergebnisse gleichen ihm bis auf Rundung (10⁻¹²).
// Gemessen (Laplace-Zeilen und Bindungen wie die Haut): 7 900 Punkte 0,37 → 0,23 s, 15 400 1,3 → 0,5 s, 27 800 4,1 → 1,2 s.
// Weil die Matrix nur vom Netz, den Gewichten und den Bindungen abhängt, nicht von den Lagen, können Systeme gemerkt werden
// (`merken`): Wer dieselben Zeilen noch einmal zerlegen lässt, bekommt das gemerkte System sofort. DOM-frei.

import type { NormalSystem, NormalZeile } from './normalSystem';

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Teile bis zu dieser Größe werden nicht weiter zerlegt */
const BLATT = 16;

/** gemerkte Systeme (Fingerabdruck der Zeilen → System), die jüngsten zuerst */
const gemerkt: { schluessel: string; sys: NormalSystem }[] = [];
const MERKEN = 2;

/** Fingerabdruck von n, Dämpfung und allen Zeilen (zwei unabhängige 32-Bit-Streuwerte über Indizes und die Bits der Zahlen) */
function fingerabdruck(n: number, zeilen: readonly NormalZeile[], daempfung: number): string {
  let a = 2166136261;
  let b = 0x9e3779b9;
  const f = new Float64Array(1);
  const u = new Uint32Array(f.buffer);
  const mische = (x: number) => {
    a = Math.imul(a ^ x, 16777619) >>> 0;
    b = Math.imul(b ^ x, 2246822519) >>> 0;
    b = (b ^ (b >>> 13)) >>> 0;
  };
  const zahl = (x: number) => {
    f[0] = x;
    mische(u[0]!);
    mische(u[1]!);
  };
  zahl(daempfung);
  for (const z of zeilen) {
    mische(z.index.length);
    for (let t = 0; t < z.index.length; t++) {
      mische(z.index[t]!);
      zahl(z.wert[t]!);
    }
    zahl(z.gewicht);
  }
  return `${n}:${zeilen.length}:${a}:${b}`;
}

/**
 * Σ g·aᵀa (+ ε auf der Diagonale) für n Unbekannte aus dünnen Zeilen, zerlegt als L·Lᵀ in verschachtelter Reihenfolge. Der Graph
 * der Matrix (zwei Unbekannte sind Nachbarn, wenn sie in einer Zeile stehen) bestimmt die Reihenfolge. `merken`: das System merken
 * bzw. ein gemerktes mit genau denselben Zeilen zurückgeben (dann ist `zeitZerlegen` 0).
 */
export function normalSystemZerlegt(n: number, zeilen: readonly NormalZeile[], daempfung = 0, merken = false): NormalSystem {
  if (merken) {
    const schluessel = fingerabdruck(n, zeilen, daempfung);
    const i = gemerkt.findIndex((g) => g.schluessel === schluessel);
    if (i >= 0) {
      const [g] = gemerkt.splice(i, 1);
      gemerkt.unshift(g!);
      return { ...g!.sys, zeitAufbau: 0, zeitZerlegen: 0 };
    }
    const sys = normalSystemZerlegt(n, zeilen, daempfung);
    gemerkt.unshift({ schluessel, sys });
    if (gemerkt.length > MERKEN) gemerkt.length = MERKEN;
    return sys;
  }
  return systemAusDaten(zerlegungsDaten(n, zeilen, daempfung));
}

/**
 * Die Zerlegung selbst als Daten (Reihenfolge neu → alt, L spaltenweise), ohne Funktionen: So kann sie in einem Worker entstehen und
 * im Fenster gelöst werden (08.11., Zerlegung im Hintergrund). Dieselbe Rechnung wie `normalSystemZerlegt`.
 */
export type ZerlegungsDaten = {
  n: number;
  perm: Int32Array;
  Lp: Int32Array;
  Li: Int32Array;
  Lx: Float64Array;
  zeitAufbau: number;
  zeitZerlegen: number;
};

/** Zeilen als flache Felder (zum Übertragen an einen Worker): Zeile r hat die Einträge start[r] … start[r + 1] − 1 */
export type FlacheZeilen = { start: Int32Array; index: Int32Array; wert: Float64Array; gewicht: Float64Array };

export function flacheZeilen(zeilen: readonly NormalZeile[]): FlacheZeilen {
  const start = new Int32Array(zeilen.length + 1);
  zeilen.forEach((z, r) => (start[r + 1] = start[r]! + z.index.length));
  const index = new Int32Array(start[zeilen.length]!);
  const wert = new Float64Array(start[zeilen.length]!);
  const gewicht = new Float64Array(zeilen.length);
  zeilen.forEach((z, r) => {
    for (let t = 0; t < z.index.length; t++) {
      index[start[r]! + t] = z.index[t]!;
      wert[start[r]! + t] = z.wert[t]!;
    }
    gewicht[r] = z.gewicht;
  });
  return { start, index, wert, gewicht };
}

export function zeilenAusFlach(f: FlacheZeilen): NormalZeile[] {
  const out: NormalZeile[] = [];
  for (let r = 0; r + 1 < f.start.length; r++)
    out.push({ index: f.index.subarray(f.start[r]!, f.start[r + 1]!), wert: f.wert.subarray(f.start[r]!, f.start[r + 1]!), gewicht: f.gewicht[r]! });
  return out;
}

export function zerlegungsDaten(n: number, zeilen: readonly NormalZeile[], daempfung = 0): ZerlegungsDaten {
  const t0 = jetzt();
  // Graph der Matrix: je Unbekannte ihre Nachbarn, sortiert, ohne Doppelte
  const grad = new Int32Array(n);
  for (const z of zeilen) {
    const m = z.index.length;
    for (let t = 0; t < m; t++) grad[z.index[t]!] = grad[z.index[t]!]! + m - 1;
  }
  const roh = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) roh[i + 1] = roh[i]! + grad[i]!;
  const nb = new Int32Array(roh[n]!);
  const fuell = roh.slice(0, n);
  for (const z of zeilen) {
    const m = z.index.length;
    for (let s = 0; s < m; s++) {
      const a = z.index[s]!;
      for (let t = 0; t < m; t++) if (t !== s) nb[fuell[a]!++] = z.index[t]!;
    }
  }
  const st = new Int32Array(n + 1);
  let w = 0;
  for (let i = 0; i < n; i++) {
    const teil = nb.subarray(roh[i]!, roh[i + 1]!);
    teil.sort();
    st[i] = w;
    let letzte = -1;
    // gelesen wird nie vor der Schreibstelle (w ≤ roh[i] + q)
    for (let q = 0; q < teil.length; q++) {
      const j = teil[q]!;
      if (j === letzte || j === i) continue;
      nb[w++] = j;
      letzte = j;
    }
  }
  st[n] = w;

  // Reihenfolge: neu → alt (`perm`), alt → neu (`ip`)
  const perm = verschachtelt(n, st, nb);
  const ip = new Int32Array(n);
  for (let k = 0; k < n; k++) ip[perm[k]!] = k;

  // obere Hälfte der umgeordneten Matrix spaltenweise: Spalte k enthält die Zeilen i ≤ k, sortiert
  const Cp = new Int32Array(n + 1);
  for (let k = 0; k < n; k++) {
    const a = perm[k]!;
    let c = 1;
    for (let p = st[a]!; p < st[a + 1]!; p++) if (ip[nb[p]!]! < k) c++;
    Cp[k + 1] = Cp[k]! + c;
  }
  const Ci = new Int32Array(Cp[n]!);
  for (let k = 0; k < n; k++) {
    const a = perm[k]!;
    let q = Cp[k]!;
    for (let p = st[a]!; p < st[a + 1]!; p++) {
      const i = ip[nb[p]!]!;
      if (i < k) Ci[q++] = i;
    }
    Ci[q++] = k;
    Ci.subarray(Cp[k]!, q).sort();
  }
  const Cx = new Float64Array(Cp[n]!);
  /** Stelle von Zeile i in Spalte k (binäre Suche) */
  const stelle = (k: number, i: number): number => {
    let lo = Cp[k]!;
    let hi = Cp[k + 1]! - 1;
    while (lo < hi) {
      const mi = (lo + hi) >> 1;
      if (Ci[mi]! < i) lo = mi + 1;
      else hi = mi;
    }
    return lo;
  };
  const ks: number[] = [];
  const ws: number[] = [];
  for (const z of zeilen) {
    ks.length = 0;
    ws.length = 0;
    for (let t = 0; t < z.index.length; t++) {
      ks.push(ip[z.index[t]!]!);
      ws.push(z.wert[t]!);
    }
    const g = z.gewicht;
    for (let s = 0; s < ks.length; s++) {
      const ka = ks[s]!;
      const ga = g * ws[s]!;
      for (let t = 0; t < ks.length; t++) {
        const kb = ks[t]!;
        if (kb <= ka) {
          const p = stelle(ka, kb);
          Cx[p] = Cx[p]! + ga * ws[t]!;
        }
      }
    }
  }
  if (daempfung > 0) for (let k = 0; k < n; k++) Cx[Cp[k + 1]! - 1] = Cx[Cp[k + 1]! - 1]! + daempfung;
  const t1 = jetzt();

  // Eliminationsbaum
  const eltern = new Int32Array(n).fill(-1);
  const vorfahr = new Int32Array(n).fill(-1);
  for (let k = 0; k < n; k++)
    for (let p = Cp[k]!; p < Cp[k + 1]! - 1; p++) {
      let i = Ci[p]!;
      while (i !== -1 && i < k) {
        const weiter = vorfahr[i]!;
        vorfahr[i] = k;
        if (weiter === -1) eltern[i] = k;
        i = weiter;
      }
    }
  // Spaltenlängen von L: je Zeile k ihr Muster über den Baum
  const merk = new Int32Array(n).fill(-1);
  const anzahl = new Int32Array(n).fill(1);
  for (let k = 0; k < n; k++) {
    merk[k] = k;
    for (let p = Cp[k]!; p < Cp[k + 1]! - 1; p++) {
      let i = Ci[p]!;
      while (merk[i] !== k) {
        anzahl[i] = anzahl[i]! + 1;
        merk[i] = k;
        i = eltern[i]!;
      }
    }
  }
  const Lp = new Int32Array(n + 1);
  for (let j = 0; j < n; j++) Lp[j + 1] = Lp[j]! + anzahl[j]!;
  const Li = new Int32Array(Lp[n]!);
  const Lx = new Float64Array(Lp[n]!);
  // Werte Zeile für Zeile (CSparse `cs_chol`): Zeile k von L aus Spalte k von A und den fertigen Spalten, Muster aus dem Baum
  const frei = Lp.slice(0, n);
  const x = new Float64Array(n);
  const muster = new Int32Array(n);
  const pfad = new Int32Array(n);
  merk.fill(-1);
  for (let k = 0; k < n; k++) {
    let oben = n;
    merk[k] = k;
    for (let p = Cp[k]!; p < Cp[k + 1]!; p++) {
      let i = Ci[p]!;
      x[i] = Cx[p]!;
      if (i === k) continue;
      let len = 0;
      while (merk[i] !== k) {
        pfad[len++] = i;
        merk[i] = k;
        i = eltern[i]!;
      }
      while (len > 0) muster[--oben] = pfad[--len]!;
    }
    let d = x[k]!;
    x[k] = 0;
    for (; oben < n; oben++) {
      const i = muster[oben]!;
      const lki = x[i]! / Lx[Lp[i]!]!;
      x[i] = 0;
      for (let p = Lp[i]! + 1; p < frei[i]!; p++) x[Li[p]!] = x[Li[p]!]! - Lx[p]! * lki;
      d -= lki * lki;
      const p = frei[i]!;
      frei[i] = p + 1;
      Li[p] = k;
      Lx[p] = lki;
    }
    if (!(d > 0)) throw new Error(`Zerlegung: nicht positiv definit in Zeile ${k} (${d})`);
    const p = frei[k]!;
    frei[k] = p + 1;
    Li[p] = k;
    Lx[p] = Math.sqrt(d);
  }
  const t2 = jetzt();
  return { n, perm, Lp, Li, Lx, zeitAufbau: t1 - t0, zeitZerlegen: t2 - t1 };
}

/** Das lösbare System zu einer Zerlegung */
export function systemAusDaten(daten: ZerlegungsDaten): NormalSystem {
  const { n, perm, Lp, Li, Lx } = daten;
  /** L·Lᵀ·X = B für k Spalten (k Werte je Unbekannte, verschachtelt, in neuer Reihenfolge), an Ort und Stelle */
  const einsetzen = (B: Float64Array, k: number): void => {
    for (let j = 0; j < n; j++) {
      const d = Lx[Lp[j]!]!;
      const bj = k * j;
      for (let c = 0; c < k; c++) B[bj + c] = B[bj + c]! / d;
      for (let p = Lp[j]! + 1; p < Lp[j + 1]!; p++) {
        const l = Lx[p]!;
        const bi = k * Li[p]!;
        for (let c = 0; c < k; c++) B[bi + c] = B[bi + c]! - l * B[bj + c]!;
      }
    }
    for (let j = n - 1; j >= 0; j--) {
      const bj = k * j;
      for (let p = Lp[j]! + 1; p < Lp[j + 1]!; p++) {
        const l = Lx[p]!;
        const bi = k * Li[p]!;
        for (let c = 0; c < k; c++) B[bj + c] = B[bj + c]! - l * B[bi + c]!;
      }
      const d = Lx[Lp[j]!]!;
      for (let c = 0; c < k; c++) B[bj + c] = B[bj + c]! / d;
    }
  };
  const allgemein = (rhs: Float64Array, k: number): Float64Array => {
    const B = new Float64Array(k * n);
    for (let j = 0; j < n; j++) for (let c = 0; c < k; c++) B[k * j + c] = rhs[k * perm[j]! + c]!;
    einsetzen(B, k);
    const out = new Float64Array(k * n);
    for (let j = 0; j < n; j++) for (let c = 0; c < k; c++) out[k * perm[j]! + c] = B[k * j + c]!;
    return out;
  };
  // 10.11.2026 (Gegenprüfung, Schritt G1): Eine und drei Spalten sind die Fälle jeder Löserrunde (Krümmung verteilen, Lagen lösen).
  // Für sie ist das Einsetzen ausgeschrieben: je Spalte ein eigenes Feld, in der innersten Schleife keine Schleife über die Spalten,
  // die Arbeitsfelder je Zerlegung einmal angelegt. Es sind dieselben Rechenschritte in derselben Reihenfolge wie in `einsetzen`,
  // das Ergebnis ist bitgleich (`zerlegung.test.ts`). Gemessen bei drei Spalten und 5 200 Punkten: 6,0 → 1,6 ms.
  const a0 = new Float64Array(n);
  let a1: Float64Array | null = null;
  let a2: Float64Array | null = null;
  const loesenDrei = (rhs: Float64Array): Float64Array => {
    const b1 = (a1 ??= new Float64Array(n));
    const b2 = (a2 ??= new Float64Array(n));
    for (let j = 0; j < n; j++) {
      const q = 3 * perm[j]!;
      a0[j] = rhs[q]!;
      b1[j] = rhs[q + 1]!;
      b2[j] = rhs[q + 2]!;
    }
    for (let j = 0; j < n; j++) {
      const von = Lp[j]!;
      const bis = Lp[j + 1]!;
      const d = Lx[von]!;
      const y0 = a0[j]! / d;
      const y1 = b1[j]! / d;
      const y2 = b2[j]! / d;
      a0[j] = y0;
      b1[j] = y1;
      b2[j] = y2;
      for (let p = von + 1; p < bis; p++) {
        const l = Lx[p]!;
        const i = Li[p]!;
        a0[i] = a0[i]! - l * y0;
        b1[i] = b1[i]! - l * y1;
        b2[i] = b2[i]! - l * y2;
      }
    }
    for (let j = n - 1; j >= 0; j--) {
      const von = Lp[j]!;
      const bis = Lp[j + 1]!;
      let s0 = a0[j]!;
      let s1 = b1[j]!;
      let s2 = b2[j]!;
      for (let p = von + 1; p < bis; p++) {
        const l = Lx[p]!;
        const i = Li[p]!;
        s0 -= l * a0[i]!;
        s1 -= l * b1[i]!;
        s2 -= l * b2[i]!;
      }
      const d = Lx[von]!;
      a0[j] = s0 / d;
      b1[j] = s1 / d;
      b2[j] = s2 / d;
    }
    const out = new Float64Array(3 * n);
    for (let j = 0; j < n; j++) {
      const q = 3 * perm[j]!;
      out[q] = a0[j]!;
      out[q + 1] = b1[j]!;
      out[q + 2] = b2[j]!;
    }
    return out;
  };
  const loesenEine = (rhs: Float64Array): Float64Array => {
    for (let j = 0; j < n; j++) a0[j] = rhs[perm[j]!]!;
    for (let j = 0; j < n; j++) {
      const von = Lp[j]!;
      const bis = Lp[j + 1]!;
      const y = a0[j]! / Lx[von]!;
      a0[j] = y;
      for (let p = von + 1; p < bis; p++) {
        const i = Li[p]!;
        a0[i] = a0[i]! - Lx[p]! * y;
      }
    }
    for (let j = n - 1; j >= 0; j--) {
      const von = Lp[j]!;
      const bis = Lp[j + 1]!;
      let s = a0[j]!;
      for (let p = von + 1; p < bis; p++) s -= Lx[p]! * a0[Li[p]!]!;
      a0[j] = s / Lx[von]!;
    }
    const out = new Float64Array(n);
    for (let j = 0; j < n; j++) out[perm[j]!] = a0[j]!;
    return out;
  };
  // 11.11.2026 (Normalfluss): Sechs Spalten sind eine Löserrunde, in der die Haut den Linien folgt und die Korrektur der Krümmung
  // für sich gelöst wird (zweimal drei Spalten). Ausgeschrieben wie `loesenDrei`: dieselben Rechenschritte je Spalte in derselben
  // Reihenfolge (bitgleich zu zwei Aufrufen mit drei Spalten), die Zerlegung wird nur einmal gelesen.
  let a3: Float64Array | null = null;
  let a4: Float64Array | null = null;
  let a5: Float64Array | null = null;
  const loesenSechs = (rhs: Float64Array): Float64Array => {
    const b1 = (a1 ??= new Float64Array(n));
    const b2 = (a2 ??= new Float64Array(n));
    const b3 = (a3 ??= new Float64Array(n));
    const b4 = (a4 ??= new Float64Array(n));
    const b5 = (a5 ??= new Float64Array(n));
    for (let j = 0; j < n; j++) {
      const q = 6 * perm[j]!;
      a0[j] = rhs[q]!;
      b1[j] = rhs[q + 1]!;
      b2[j] = rhs[q + 2]!;
      b3[j] = rhs[q + 3]!;
      b4[j] = rhs[q + 4]!;
      b5[j] = rhs[q + 5]!;
    }
    for (let j = 0; j < n; j++) {
      const von = Lp[j]!;
      const bis = Lp[j + 1]!;
      const d = Lx[von]!;
      const y0 = a0[j]! / d;
      const y1 = b1[j]! / d;
      const y2 = b2[j]! / d;
      const y3 = b3[j]! / d;
      const y4 = b4[j]! / d;
      const y5 = b5[j]! / d;
      a0[j] = y0;
      b1[j] = y1;
      b2[j] = y2;
      b3[j] = y3;
      b4[j] = y4;
      b5[j] = y5;
      for (let p = von + 1; p < bis; p++) {
        const l = Lx[p]!;
        const i = Li[p]!;
        a0[i] = a0[i]! - l * y0;
        b1[i] = b1[i]! - l * y1;
        b2[i] = b2[i]! - l * y2;
        b3[i] = b3[i]! - l * y3;
        b4[i] = b4[i]! - l * y4;
        b5[i] = b5[i]! - l * y5;
      }
    }
    for (let j = n - 1; j >= 0; j--) {
      const von = Lp[j]!;
      const bis = Lp[j + 1]!;
      let s0 = a0[j]!;
      let s1 = b1[j]!;
      let s2 = b2[j]!;
      let s3 = b3[j]!;
      let s4 = b4[j]!;
      let s5 = b5[j]!;
      for (let p = von + 1; p < bis; p++) {
        const l = Lx[p]!;
        const i = Li[p]!;
        s0 -= l * a0[i]!;
        s1 -= l * b1[i]!;
        s2 -= l * b2[i]!;
        s3 -= l * b3[i]!;
        s4 -= l * b4[i]!;
        s5 -= l * b5[i]!;
      }
      const d = Lx[von]!;
      a0[j] = s0 / d;
      b1[j] = s1 / d;
      b2[j] = s2 / d;
      b3[j] = s3 / d;
      b4[j] = s4 / d;
      b5[j] = s5 / d;
    }
    const out = new Float64Array(6 * n);
    for (let j = 0; j < n; j++) {
      const q = 6 * perm[j]!;
      out[q] = a0[j]!;
      out[q + 1] = b1[j]!;
      out[q + 2] = b2[j]!;
      out[q + 3] = b3[j]!;
      out[q + 4] = b4[j]!;
      out[q + 5] = b5[j]!;
    }
    return out;
  };
  const loesenSpalten = (rhs: Float64Array, k: number): Float64Array =>
    k === 3 ? loesenDrei(rhs) : k === 1 ? loesenEine(rhs) : k === 6 ? loesenSechs(rhs) : allgemein(rhs, k);
  return {
    n,
    loesen: loesenDrei,
    loesenSpalte: loesenEine,
    loesenSpalten,
    huelle: Lp[n]!,
    zeitAufbau: daten.zeitAufbau,
    zeitZerlegen: daten.zeitZerlegen,
  };
}

/**
 * Reihenfolge nach verschachtelter Zerlegung (neu → alt): Ein Teil wird an der mittleren Ebene einer Breitensuche ab einem
 * fernen Knoten getrennt (nur die Knoten dieser Ebene, die die nächste berühren), beide Seiten zuerst, der Trenner zuletzt.
 * Unzusammenhängende Teile einzeln, kleine Teile wie sie sind.
 */
function verschachtelt(n: number, st: Int32Array, nb: Int32Array): Int32Array {
  const ordnung = new Int32Array(n);
  let frei = 0;
  const teil = new Int32Array(n);
  let teile = 0;
  const besucht = new Int32Array(n).fill(-1);
  let stempel = 0;
  const ebene = new Int32Array(n);
  const q = new Int32Array(n);
  /** Breitensuche im Teil t ab r: Knoten in q[0, m), Ebenen in `ebene`; [m, tiefste Ebene] */
  const breite = (r: number, t: number): [number, number] => {
    const s = ++stempel;
    let kopf = 0;
    let ende = 0;
    q[ende++] = r;
    besucht[r] = s;
    ebene[r] = 0;
    let tief = 0;
    while (kopf < ende) {
      const v = q[kopf++]!;
      const e = ebene[v]! + 1;
      for (let p = st[v]!; p < st[v + 1]!; p++) {
        const u = nb[p]!;
        if (teil[u] !== t || besucht[u] === s) continue;
        besucht[u] = s;
        ebene[u] = e;
        if (e > tief) tief = e;
        q[ende++] = u;
      }
    }
    return [ende, tief];
  };
  const zerlegen = (knoten: Int32Array): void => {
    if (knoten.length <= BLATT) {
      ordnung.set(knoten, frei);
      frei += knoten.length;
      return;
    }
    const t = ++teile;
    for (let i = 0; i < knoten.length; i++) teil[knoten[i]!] = t;
    const [m] = breite(knoten[0]!, t);
    if (m < knoten.length) {
      // zusammenhängende Stücke einzeln (aus dem Teil genommen, sobald gefunden)
      const stuecke: Int32Array[] = [];
      for (let i = 0; i < knoten.length; i++) {
        const v = knoten[i]!;
        if (teil[v] !== t) continue;
        const stueck = q.slice(0, breite(v, t)[0]);
        for (let j = 0; j < stueck.length; j++) teil[stueck[j]!] = -1;
        stuecke.push(stueck);
      }
      for (const s of stuecke) zerlegen(s);
      return;
    }
    // ein ferner Knoten: so lange vom fernsten aus suchen, wie die Tiefe wächst
    let r = q[m - 1]!;
    let tief = breite(r, t)[1];
    for (let runde = 0; runde < 4; runde++) {
      const r2 = q[m - 1]!;
      const t2 = breite(r2, t)[1];
      if (t2 > tief) {
        r = r2;
        tief = t2;
      } else {
        breite(r, t);
        break;
      }
    }
    if (tief < 2) {
      ordnung.set(knoten, frei);
      frei += knoten.length;
      return;
    }
    // mittlere Ebene
    const zahl = new Int32Array(tief + 1);
    for (let i = 0; i < m; i++) zahl[ebene[q[i]!]!] = zahl[ebene[q[i]!]!]! + 1;
    let k = 0;
    for (let summe = 0; k <= tief; k++) {
      summe += zahl[k]!;
      if (2 * summe >= m) break;
    }
    k = Math.max(1, Math.min(tief - 1, k));
    const vorn: number[] = [];
    const hinten: number[] = [];
    const trenner: number[] = [];
    for (let i = 0; i < m; i++) {
      const v = q[i]!;
      const e = ebene[v]!;
      if (e > k) hinten.push(v);
      else if (e < k) vorn.push(v);
      else {
        let trennt = false;
        for (let p = st[v]!; p < st[v + 1]! && !trennt; p++) {
          const u = nb[p]!;
          if (teil[u] === t && ebene[u] === k + 1) trennt = true;
        }
        (trennt ? trenner : vorn).push(v);
      }
    }
    zerlegen(Int32Array.from(vorn));
    zerlegen(Int32Array.from(hinten));
    ordnung.set(trenner, frei);
    frei += trenner.length;
  };
  const alle = new Int32Array(n);
  for (let i = 0; i < n; i++) alle[i] = i;
  zerlegen(alle);
  return ordnung;
}
