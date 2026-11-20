// Zufall mit Strömen (Plan 4.1; Konzept 8): xoshiro128** mit 128 Bit Zustand (Blackman und Vigna). Jeder Strom bekommt seinen
// Anfang aus der Saat des Laufs und seiner Kennung, gemischt nach dem Vorbild von MurmurHash3 (x86, 128 Bit). Alles rechnet nur mit
// ganzen 32-Bit-Zahlen (Math.imul, Verschiebungen, `| 0`, `>>> 0`): auf jedem Gerät dieselbe Folge. Der Zustand lässt sich in vier
// Zahlen eines Uint32Array sichern und zurücksetzen (Lauf.stroeme, Schlüsselstände).

export interface Strom {
  /** Zahl in [0, 1) mit der Auflösung 2⁻³²; verbraucht eine Zahl des Stroms */
  zahl(): number;
  /** ganze Zahl in [0, n) für ganzes n von 1 bis 2³², gleich verteilt ohne Modulo-Schieflage (zu große Zahlen werden verworfen) */
  ganz(n: number): number;
  /** Zustand nach aus[i … i + 3] */
  stand(aus: Uint32Array, i: number): void;
  /** Zustand aus von[i … i + 3]; alle vier null ist kein Zustand */
  setzen(von: Uint32Array, i: number): void;
}

const ZWEI_HOCH_32 = 4294967296;

function dreheLinks(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

/** Schlussmischung von MurmurHash3: Jedes Bit wirkt auf jedes */
function vermengen(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h;
}

class Xoshiro implements Strom {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(s0: number, s1: number, s2: number, s3: number) {
    this.s0 = s0 | 0;
    this.s1 = s1 | 0;
    this.s2 = s2 | 0;
    this.s3 = s3 | 0;
  }

  /** nächste Zahl des Stroms, ganz in [0, 2³²) */
  private naechste(): number {
    const s1 = this.s1;
    const ergebnis = Math.imul(dreheLinks(Math.imul(s1, 5), 7), 9) >>> 0;
    const t = s1 << 9;
    this.s2 ^= this.s0;
    this.s3 ^= s1;
    this.s1 = s1 ^ this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = dreheLinks(this.s3, 11);
    return ergebnis;
  }

  zahl(): number {
    return this.naechste() / ZWEI_HOCH_32;
  }

  ganz(n: number): number {
    if (!Number.isInteger(n) || n < 1 || n > ZWEI_HOCH_32) throw new RangeError(`ganz: ${String(n)} ist keine ganze Zahl von 1 bis 2³²`);
    // größtes Vielfaches von n bis 2³²: Zahlen darüber verwerfen, sonst kämen kleine Ergebnisse öfter
    const grenze = ZWEI_HOCH_32 - (ZWEI_HOCH_32 % n);
    for (;;) {
      const x = this.naechste();
      if (x < grenze) return x % n;
    }
  }

  stand(aus: Uint32Array, i: number): void {
    if (!Number.isInteger(i) || i < 0 || i + 4 > aus.length) throw new RangeError(`stand: kein Platz für vier Zahlen ab ${String(i)}`);
    aus[i] = this.s0;
    aus[i + 1] = this.s1;
    aus[i + 2] = this.s2;
    aus[i + 3] = this.s3;
  }

  setzen(von: Uint32Array, i: number): void {
    if (!Number.isInteger(i) || i < 0 || i + 4 > von.length) throw new RangeError(`setzen: keine vier Zahlen ab ${String(i)}`);
    const s0 = von[i]!;
    const s1 = von[i + 1]!;
    const s2 = von[i + 2]!;
    const s3 = von[i + 3]!;
    if ((s0 | s1 | s2 | s3) === 0) throw new RangeError('setzen: Zustand aus vier Nullen');
    this.s0 = s0 | 0;
    this.s1 = s1 | 0;
    this.s2 = s2 | 0;
    this.s3 = s3 | 0;
  }
}

/**
 * Strom aus der Saat des Laufs und seiner Kennung (etwa `<Ding>.<Regel>`). Gleiche Saat und Kennung geben immer dieselbe Folge,
 * jede andere Kennung oder Saat eine unabhängige. Die Saat ist eine ganze Zahl bis ±(2⁵³ − 1).
 */
export function strom(saat: number, kennung: string): Strom {
  if (!Number.isSafeInteger(saat)) throw new RangeError(`strom: Saat ${String(saat)} ist keine sichere ganze Zahl`);
  // Wörter: untere und obere 32 Bit der Saat, Länge der Kennung, ihre UTF-16-Einheiten; in Blöcken zu vier, der letzte mit Nullen
  const tief = saat >>> 0;
  const hoch = Math.floor(saat / ZWEI_HOCH_32) | 0;
  const laenge = kennung.length;
  const woerter = 3 + laenge;
  const wort = (w: number): number => (w === 0 ? tief : w === 1 ? hoch : w === 2 ? laenge : w < woerter ? kennung.charCodeAt(w - 3) : 0);
  let h1 = 0x6a09e667 | 0;
  let h2 = 0xbb67ae85 | 0;
  let h3 = 0x3c6ef372 | 0;
  let h4 = 0xa54ff53a | 0;
  for (let w = 0; w < woerter; w += 4) {
    h1 ^= Math.imul(dreheLinks(Math.imul(wort(w), 0x239b961b), 15), 0xab0e9789);
    h1 = dreheLinks(h1, 19);
    h1 = (h1 + h2) | 0;
    h1 = (Math.imul(h1, 5) + 0x561ccd1b) | 0;
    h2 ^= Math.imul(dreheLinks(Math.imul(wort(w + 1), 0xab0e9789), 16), 0x38b34ae5);
    h2 = dreheLinks(h2, 17);
    h2 = (h2 + h3) | 0;
    h2 = (Math.imul(h2, 5) + 0x0bcaa747) | 0;
    h3 ^= Math.imul(dreheLinks(Math.imul(wort(w + 2), 0x38b34ae5), 17), 0xa1e38b93);
    h3 = dreheLinks(h3, 15);
    h3 = (h3 + h4) | 0;
    h3 = (Math.imul(h3, 5) + 0x96cd1c35) | 0;
    h4 ^= Math.imul(dreheLinks(Math.imul(wort(w + 3), 0xa1e38b93), 18), 0x239b961b);
    h4 = dreheLinks(h4, 13);
    h4 = (h4 + h1) | 0;
    h4 = (Math.imul(h4, 5) + 0x32ac3b17) | 0;
  }
  h1 ^= woerter;
  h2 ^= woerter;
  h3 ^= woerter;
  h4 ^= woerter;
  h1 = (h1 + h2 + h3 + h4) | 0;
  h2 = (h2 + h1) | 0;
  h3 = (h3 + h1) | 0;
  h4 = (h4 + h1) | 0;
  h1 = vermengen(h1);
  h2 = vermengen(h2);
  h3 = vermengen(h3);
  h4 = vermengen(h4);
  h1 = (h1 + h2 + h3 + h4) | 0;
  h2 = (h2 + h1) | 0;
  h3 = (h3 + h1) | 0;
  h4 = (h4 + h1) | 0;
  // vier Nullen sind kein Zustand von xoshiro (Wahrscheinlichkeit 2⁻¹²⁸)
  if ((h1 | h2 | h3 | h4) === 0) h1 = 1;
  return new Xoshiro(h1, h2, h3, h4);
}
