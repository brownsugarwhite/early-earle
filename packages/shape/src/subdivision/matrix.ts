// Wesen-Editor 2, Kern (13.10.2026): dünn besetzte Matrizen (CSR) für Subdivision, Grenzflächen-Masken und Löser.
// Eine Matrix bildet Punktvektoren ab: y = M · x, wobei x und y je Punkt drei Werte (x, y, z) tragen.

export type DuennMatrix = {
  zeilen: number;
  spalten: number;
  start: Uint32Array;
  index: Uint32Array;
  wert: Float64Array;
};

/** Zeilenweiser Aufbau: je Zeile Gewichte je Spalte sammeln (Doppelte werden addiert). */
export class MatrixBauer {
  private readonly starts: number[] = [0];
  private readonly idx: number[] = [];
  private readonly w: number[] = [];
  private readonly akku: Float64Array;
  private readonly markiert: Int32Array;
  private readonly aktiv: number[] = [];
  private zeile = 0;

  constructor(readonly spalten: number) {
    this.akku = new Float64Array(spalten);
    this.markiert = new Int32Array(spalten).fill(-1);
  }

  /** Gewicht `g` für Spalte `j` in der aktuellen Zeile. */
  add(j: number, g: number): void {
    if (this.markiert[j] !== this.zeile) {
      this.markiert[j] = this.zeile;
      this.akku[j] = 0;
      this.aktiv.push(j);
    }
    this.akku[j]! += g;
  }

  /** Zeile abschließen. */
  zeileFertig(): void {
    this.aktiv.sort((a, b) => a - b);
    for (const j of this.aktiv) {
      const g = this.akku[j]!;
      if (g !== 0) {
        this.idx.push(j);
        this.w.push(g);
      }
    }
    this.aktiv.length = 0;
    this.zeile++;
    this.starts.push(this.idx.length);
  }

  fertig(): DuennMatrix {
    return { zeilen: this.zeile, spalten: this.spalten, start: Uint32Array.from(this.starts), index: Uint32Array.from(this.idx), wert: Float64Array.from(this.w) };
  }
}

export function einheit(n: number): DuennMatrix {
  const start = new Uint32Array(n + 1);
  const index = new Uint32Array(n);
  const wert = new Float64Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    start[i + 1] = i + 1;
    index[i] = i;
  }
  return { zeilen: n, spalten: n, start, index, wert };
}

/** y = M · x für Punktvektoren (3 Werte je Punkt). */
export function anwenden3(M: DuennMatrix, x: Float64Array, out?: Float64Array): Float64Array {
  const y = out ?? new Float64Array(3 * M.zeilen);
  const { start, index, wert } = M;
  for (let i = 0; i < M.zeilen; i++) {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (let k = start[i]!; k < start[i + 1]!; k++) {
      const j = 3 * index[k]!;
      const g = wert[k]!;
      sx += g * x[j]!;
      sy += g * x[j + 1]!;
      sz += g * x[j + 2]!;
    }
    y[3 * i] = sx;
    y[3 * i + 1] = sy;
    y[3 * i + 2] = sz;
  }
  return y;
}

/** y = M · x für Skalare. */
export function anwenden1(M: DuennMatrix, x: ArrayLike<number>): Float64Array {
  const y = new Float64Array(M.zeilen);
  for (let i = 0; i < M.zeilen; i++) {
    let s = 0;
    for (let k = M.start[i]!; k < M.start[i + 1]!; k++) s += M.wert[k]! * x[M.index[k]!]!;
    y[i] = s;
  }
  return y;
}

/** C = A · B. */
export function multiplizieren(A: DuennMatrix, B: DuennMatrix): DuennMatrix {
  if (A.spalten !== B.zeilen) throw new Error(`Matrizen passen nicht: ${A.zeilen}×${A.spalten} · ${B.zeilen}×${B.spalten}`);
  const bau = new MatrixBauer(B.spalten);
  for (let i = 0; i < A.zeilen; i++) {
    for (let k = A.start[i]!; k < A.start[i + 1]!; k++) {
      const j = A.index[k]!;
      const a = A.wert[k]!;
      for (let l = B.start[j]!; l < B.start[j + 1]!; l++) bau.add(B.index[l]!, a * B.wert[l]!);
    }
    bau.zeileFertig();
  }
  return bau.fertig();
}

/** Zeilenauswahl. */
export function zeilenAuswahl(M: DuennMatrix, auswahl: ArrayLike<number>): DuennMatrix {
  const bau = new MatrixBauer(M.spalten);
  for (let r = 0; r < auswahl.length; r++) {
    const i = auswahl[r]!;
    for (let k = M.start[i]!; k < M.start[i + 1]!; k++) bau.add(M.index[k]!, M.wert[k]!);
    bau.zeileFertig();
  }
  return bau.fertig();
}

/** Dichte Kopie der Zeilen `auswahl` als n×m-Feld (zeilenweise). */
export function dicht(M: DuennMatrix, auswahl: ArrayLike<number>): Float64Array {
  const n = auswahl.length;
  const out = new Float64Array(n * M.spalten);
  for (let r = 0; r < n; r++) {
    const i = auswahl[r]!;
    for (let k = M.start[i]!; k < M.start[i + 1]!; k++) out[r * M.spalten + M.index[k]!] = M.wert[k]!;
  }
  return out;
}

export const nichtNull = (M: DuennMatrix): number => M.wert.length;
