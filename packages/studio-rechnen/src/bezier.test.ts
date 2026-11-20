// Bézier-Hilfen (Plan 3.5, 4.1): de Casteljau und Bernstein bitgleich zu `teilen` und `punktAuf` des Prototyps, Stückzahl nach Wang
// hält ihre Toleranz, Abstand an Kurvenpunkten bei t = 0, 1/8, …, 1.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bernstein, casteljau, kurvenAbstand, wangStueckzahl } from './bezier';

// ---- wörtliche Kopien aus apps/editor/src/ozzy-figur/form.ts (Stand 20.11.2026): Bezug der Bitgleichheit, nie ändern -------------

type Punkt = [number, number];
interface Anker {
  p: Punkt;
  i: Punkt;
  o: Punkt;
}
type Form = Anker[];

const ankerKopie = (a: Anker): Anker => ({ p: [a.p[0], a.p[1]], i: [a.i[0], a.i[1]], o: [a.o[0], a.o[1]] });
const formKopie = (f: Form): Form => f.map(ankerKopie);

/** Punkt auf Stück k bei t */
function punktAuf(f: Form, k: number, t: number): Punkt {
  const a = f[k]!;
  const b = f[(k + 1) % f.length]!;
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return [w0 * a.p[0] + w1 * a.o[0] + w2 * b.i[0] + w3 * b.p[0], w0 * a.p[1] + w1 * a.o[1] + w2 * b.i[1] + w3 * b.p[1]];
}

/** Stück k bei t formtreu teilen (de Casteljau): ein Anker mehr, die Kurve bleibt dieselbe */
function teilen(f: Form, k: number, t: number): Form {
  const n = f.length;
  const a = f[k]!;
  const b = f[(k + 1) % n]!;
  const mix = (u: Punkt, v: Punkt): Punkt => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
  const q0 = mix(a.p, a.o);
  const q1 = mix(a.o, b.i);
  const q2 = mix(b.i, b.p);
  const r0 = mix(q0, q1);
  const r1 = mix(q1, q2);
  const s = mix(r0, r1);
  const neu = formKopie(f);
  neu[k]!.o = q0;
  neu[(k + 1) % n]!.i = q2;
  neu.splice(k + 1, 0, { p: s, i: r0, o: r1 });
  return neu;
}

// ---- Hilfen ---------------------------------------------------------------------------------------------------------------------

const koordinate = fc.double({ min: -500, max: 500, noNaN: true });
const stueckArb = fc.array(koordinate, { minLength: 8, maxLength: 8 });

/** Form mit je Anker 6 Zahlen (p, Ein-Griff, Aus-Griff) als Form des Prototyps */
function alsForm(z: ArrayLike<number>): Form {
  const f: Form = [];
  for (let i = 0; i < z.length; i += 6) f.push({ p: [z[i]!, z[i + 1]!], i: [z[i + 2]!, z[i + 3]!], o: [z[i + 4]!, z[i + 5]!] });
  return f;
}

/** Stück als Kurvenpunkt bei t in Bernstein-Form */
function punkt(s: ArrayLike<number>, t: number): Punkt {
  const u = 1 - t;
  return [
    u * u * u * s[0]! + 3 * u * u * t * s[2]! + 3 * u * t * t * s[4]! + t * t * t * s[6]!,
    u * u * u * s[1]! + 3 * u * u * t * s[3]! + 3 * u * t * t * s[5]! + t * t * t * s[7]!,
  ];
}

const abstand = (a: Punkt, b: Punkt): number => Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]));

// ---- casteljau ------------------------------------------------------------------------------------------------------------------

describe('casteljau', () => {
  it('bitgleich zu `teilen` des Prototyps (fast-check)', () => {
    fc.assert(
      fc.property(stueckArb, fc.double({ min: 0, max: 1, noNaN: true }), (s, t) => {
        const aus = new Float64Array(16);
        casteljau(s, t, aus);
        const f: Form = [
          { p: [s[0]!, s[1]!], i: [0, 0], o: [s[2]!, s[3]!] },
          { p: [s[6]!, s[7]!], i: [s[4]!, s[5]!], o: [0, 0] },
        ];
        const [a, mitte, b] = teilen(f, 0, t) as [Anker, Anker, Anker];
        const erwartet = [...a.p, ...a.o, ...mitte.i, ...mitte.p, ...mitte.p, ...mitte.o, ...b.i, ...b.p];
        erwartet.forEach((x, i) => expect(Object.is(aus[i], x)).toBe(true));
      }),
      { numRuns: 2000 },
    );
  });

  it('beide Hälften ergeben dieselbe Kurve; Enden und Teilungspunkt exakt geteilt', () => {
    fc.assert(
      fc.property(stueckArb, fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), (s, t, v) => {
        const aus = new Float64Array(16);
        casteljau(s, t, aus);
        expect([aus[0], aus[1], aus[14], aus[15]]).toEqual([s[0], s[1], s[6], s[7]]);
        expect([aus[6], aus[7]]).toEqual([aus[8], aus[9]]);
        const links = aus.subarray(0, 8);
        const rechts = aus.subarray(8, 16);
        expect(abstand(punkt(links, v), punkt(s, t * v))).toBeLessThan(1e-9);
        expect(abstand(punkt(rechts, v), punkt(s, t + (1 - t) * v))).toBeLessThan(1e-9);
        expect(abstand([aus[6]!, aus[7]!], punkt(s, t))).toBeLessThan(1e-9);
      }),
      { numRuns: 2000 },
    );
  });

  it('meldet zu kurze Felder', () => {
    expect(() => casteljau([0, 0, 1, 1, 2, 2, 3], 0.5, new Float64Array(16))).toThrow(RangeError);
    expect(() => casteljau([0, 0, 1, 1, 2, 2, 3, 3], 0.5, new Float64Array(15))).toThrow(RangeError);
  });
});

// ---- wangStueckzahl -------------------------------------------------------------------------------------------------------------

describe('wangStueckzahl', () => {
  it('eine Gerade braucht ein Stück; M = 150 bei 0,2 braucht 24 (Bericht 14c, 5.2)', () => {
    expect(wangStueckzahl([0, 0, 10, 5, 20, 10, 30, 15], 0.25)).toBe(1);
    expect(wangStueckzahl([3, 3, 3, 3, 3, 3, 3, 3], 0.25)).toBe(1);
    expect(wangStueckzahl([0, 0, 0, 0, 150, 0, 300, 0], 0.2)).toBe(24);
  });

  it('die Strecken liegen nirgends weiter als die Toleranz von der Kurve (fast-check)', () => {
    fc.assert(
      fc.property(stueckArb, fc.double({ min: 0.05, max: 5, noNaN: true }), (s, toleranz) => {
        const n = wangStueckzahl(s, toleranz);
        expect(Number.isInteger(n) && n >= 1).toBe(true);
        let groesster = 0;
        for (let j = 0; j < n; j++) {
          const a = punkt(s, j / n);
          const b = punkt(s, (j + 1) / n);
          for (let q = 1; q < 16; q++) {
            const u = q / 16;
            const kurve = punkt(s, (j + u) / n);
            groesster = Math.max(groesster, abstand(kurve, [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]));
          }
        }
        expect(groesster).toBeLessThanOrEqual(toleranz * (1 + 1e-9) + 1e-9);
      }),
      { numRuns: 300 },
    );
  });

  it('kleinere Toleranz, nie weniger Stücke', () => {
    fc.assert(
      fc.property(stueckArb, fc.double({ min: 0.01, max: 10, noNaN: true }), (s, t) => {
        expect(wangStueckzahl(s, t / 2)).toBeGreaterThanOrEqual(wangStueckzahl(s, t));
      }),
    );
  });

  it('meldet ungültige Toleranz und nicht endliche Stücke', () => {
    const s = [0, 0, 1, 2, 3, 2, 4, 0];
    for (const t of [0, -1, NaN, Infinity]) expect(() => wangStueckzahl(s, t)).toThrow(RangeError);
    expect(() => wangStueckzahl([0, 0, NaN, 2, 3, 2, 4, 0], 0.25)).toThrow(RangeError);
    expect(() => wangStueckzahl([0, 0, 1e300, 2, -1e300, 2, 4, 0], 0.25)).toThrow(RangeError);
  });
});

// ---- bernstein ------------------------------------------------------------------------------------------------------------------

describe('bernstein', () => {
  it('(stufen + 1) · 4 Gewichte, an den Enden genau, Summe 1', () => {
    for (const stufen of [1, 2, 3, 8, 24, 64]) {
      const b = bernstein(stufen);
      expect(b.length).toBe((stufen + 1) * 4);
      expect(Array.from(b.subarray(0, 4))).toEqual([1, 0, 0, 0]);
      expect(Array.from(b.subarray(4 * stufen))).toEqual([0, 0, 0, 1]);
      for (let j = 0; j <= stufen; j++) expect(Math.abs(b[4 * j]! + b[4 * j + 1]! + b[4 * j + 2]! + b[4 * j + 3]! - 1)).toBeLessThan(1e-15);
    }
  });

  it('Kurvenpunkte bitgleich zu `punktAuf` des Prototyps (fast-check)', () => {
    fc.assert(
      fc.property(stueckArb, fc.integer({ min: 1, max: 64 }), (s, stufen) => {
        const b = bernstein(stufen);
        const f: Form = [
          { p: [s[0]!, s[1]!], i: [0, 0], o: [s[2]!, s[3]!] },
          { p: [s[6]!, s[7]!], i: [s[4]!, s[5]!], o: [0, 0] },
        ];
        for (let j = 0; j <= stufen; j++) {
          const w = b.subarray(4 * j, 4 * j + 4);
          const x = w[0]! * s[0]! + w[1]! * s[2]! + w[2]! * s[4]! + w[3]! * s[6]!;
          const y = w[0]! * s[1]! + w[1]! * s[3]! + w[2]! * s[5]! + w[3]! * s[7]!;
          const [px, py] = punktAuf(f, 0, j / stufen);
          expect(Object.is(x, px) && Object.is(y, py)).toBe(true);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('meldet ungültige Stufenzahlen', () => {
    for (const s of [0, -1, 1.5, NaN, Infinity]) expect(() => bernstein(s)).toThrow(RangeError);
  });
});

// ---- kurvenAbstand --------------------------------------------------------------------------------------------------------------

/** Form mit n Ankern, je 6 Zahlen */
const formArb = (min: number, max: number) =>
  fc.integer({ min, max }).chain((n) => fc.array(koordinate, { minLength: 6 * n, maxLength: 6 * n }).map((z) => Float64Array.from(z)));

describe('kurvenAbstand', () => {
  it('gleich dem größten Abstand der Kurvenpunkte aus `punktAuf` bei t = j/8, offen und geschlossen (fast-check)', () => {
    fc.assert(
      fc.property(formArb(2, 8).chain((a) => fc.tuple(fc.constant(a), formArb(a.length / 6, a.length / 6))), fc.boolean(), ([a, b], geschlossen) => {
        const fa = alsForm(a);
        const fb = alsForm(b);
        const stuecke = geschlossen ? fa.length : fa.length - 1;
        let erwartet = 0;
        for (let k = 0; k < stuecke; k++)
          for (let j = 0; j <= 8; j++) erwartet = Math.max(erwartet, abstand(punktAuf(fa, k, j / 8), punktAuf(fb, k, j / 8)));
        expect(Object.is(kurvenAbstand(a, b, geschlossen), erwartet)).toBe(true);
        expect(Object.is(kurvenAbstand(b, a, geschlossen), erwartet)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('gleiche Formen 0, verschobene Formen um die Verschiebung', () => {
    fc.assert(
      fc.property(formArb(1, 6), koordinate, koordinate, fc.boolean(), (a, dx, dy, geschlossen) => {
        expect(kurvenAbstand(a, a, geschlossen)).toBe(0);
        const b = a.map((z, i) => z + (i % 2 === 0 ? dx : dy));
        expect(Math.abs(kurvenAbstand(a, b, geschlossen) - Math.sqrt(dx * dx + dy * dy))).toBeLessThan(1e-9);
      }),
    );
  });

  it('zwei Griffe um v verschoben: 3/4 |v| bei t = 1/2; das Schlussstück zählt nur geschlossen', () => {
    // drei Anker auf einer Linie, Griffe auf den Ankern
    const a = Float64Array.from([0, 0, 0, 0, 0, 0, 100, 0, 100, 0, 100, 0, 200, 0, 200, 0, 200, 0]);
    const b = a.slice();
    b[4] = 0; // Aus-Griff von Anker 0
    b[5] = 8;
    b[9] = 8; // Ein-Griff von Anker 1
    expect(kurvenAbstand(a, b, false)).toBeCloseTo(6, 12);
    const c = a.slice();
    c[3] = 10; // Ein-Griff von Anker 0 liegt nur auf dem Schlussstück (Anker 2 → Anker 0)
    expect(kurvenAbstand(a, c, false)).toBe(0);
    // Gewicht des Ein-Griffs 3t²(1 − t), unter den Achteln am größten bei t = 5/8: 225/512
    expect(kurvenAbstand(a, c, true)).toBeCloseTo((225 / 512) * 10, 12);
  });

  it('Randfälle: leer, ein Anker, NaN, ungleiche Ankerzahl', () => {
    expect(kurvenAbstand([], [], true)).toBe(0);
    expect(kurvenAbstand([0, 0, 1, 1, 2, 2], [3, 4, 1, 1, 2, 2], false)).toBe(5);
    expect(kurvenAbstand([0, 0, 1, 1, 2, 2], [0, 0, 1, 1, 2, 2], true)).toBe(0);
    expect(kurvenAbstand([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0, 1, NaN, 1, 1, 1, 1], false)).toBeNaN();
    expect(() => kurvenAbstand([0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1], true)).toThrow(RangeError);
    expect(() => kurvenAbstand([0, 0, 0, 0, 0], [0, 0, 0, 0, 0], true)).toThrow(RangeError);
  });
});
