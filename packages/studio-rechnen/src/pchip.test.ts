// PCHIP (Plan 4.1, Befund 1): `pchipSteigungen` und `pchipWert` rechnen bitgleich zu `pchip` des Prototyps, geprüft mit Object.is
// für jeden Wert, an vielen zufälligen, auch ungleichmäßigen Stützstellen, an den Stellen selbst, dicht daneben und außerhalb.
// Dazu die periodische Fortsetzung für Kreisregler.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { pchipSteigungen, pchipWert } from './pchip';

/** wörtliche Kopie von `pchip` aus apps/editor/src/ozzy-figur/form.ts:308–338 (Stand 20.11.2026): Bezug der Bitgleichheit, nie ändern */
/** monotone kubische Interpolation (Fritsch–Carlson) durch (xs, ys); außerhalb festgehalten */
function pchip(xs: readonly number[], ys: readonly number[], x: number): number {
  const n = xs.length;
  if (n === 1 || x <= xs[0]!) return ys[0]!;
  if (x >= xs[n - 1]!) return ys[n - 1]!;
  const h: number[] = [];
  const del: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    h.push(xs[k + 1]! - xs[k]!);
    del.push((ys[k + 1]! - ys[k]!) / h[k]!);
  }
  const m = new Array<number>(n).fill(0);
  m[0] = del[0]!;
  m[n - 1] = del[n - 2]!;
  for (let k = 1; k < n - 1; k++) {
    const a = del[k - 1]!;
    const b = del[k]!;
    if (a * b <= 0) m[k] = 0;
    else {
      const w1 = 2 * h[k]! + h[k - 1]!;
      const w2 = h[k]! + 2 * h[k - 1]!;
      m[k] = (w1 + w2) / (w1 / a + w2 / b);
    }
  }
  let k = 0;
  while (k < n - 2 && x > xs[k + 1]!) k++;
  const t = (x - xs[k]!) / h[k]!;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[k]! + (t3 - 2 * t2 + t) * h[k]! * m[k]! + (-2 * t3 + 3 * t2) * ys[k + 1]! + (t3 - t2) * h[k]! * m[k + 1]!;
}

// ---- Hilfen ------------------------------------------------------------------------------------------------------------------

const bitsFeld = new Float64Array(1);
const bitsWort = new BigInt64Array(bitsFeld.buffer);

/** nächste darstellbare Zahl über x */
function darueber(x: number): number {
  if (Number.isNaN(x) || x === Infinity) return x;
  if (x === 0) return Number.MIN_VALUE;
  bitsFeld[0] = x;
  bitsWort[0] = x > 0 ? bitsWort[0]! + 1n : bitsWort[0]! - 1n;
  return bitsFeld[0];
}
const darunter = (x: number): number => -darueber(-x);

const aufsteigend = (werte: readonly number[]): number[] => [...new Set(werte.map((x) => (x === 0 ? 0 : x)))].sort((a, b) => a - b);

/** streng steigende Stützstellen: frei verteilt, im Halbgrad-Raster, dicht gedrängt (Faltschlüssel) oder sehr weit gespannt */
const stellen = (max: number): fc.Arbitrary<number[]> =>
  fc
    .oneof(
      fc.array(fc.double({ min: -1e4, max: 1e4, noNaN: true }), { minLength: 1, maxLength: max }),
      fc.array(fc.integer({ min: 0, max: 719 }), { minLength: 1, maxLength: max }).map((ks) => ks.map((k) => k / 2)),
      fc.array(fc.integer({ min: 0, max: 400 }), { minLength: 1, maxLength: max }).map((ks) => ks.map((k) => 52 + k * 0.07)),
      fc.array(fc.double({ min: -1e12, max: 1e12, noNaN: true }), { minLength: 1, maxLength: max }),
    )
    .map(aufsteigend);

/** Werte: gewöhnlich, ganz, mit Nullen beider Vorzeichen und gleichen Nachbarn (flache Sekanten) */
const wert = fc.oneof(
  { weight: 6, arbitrary: fc.double({ min: -1e3, max: 1e3, noNaN: true }) },
  { weight: 2, arbitrary: fc.integer({ min: -3, max: 3 }) },
  { weight: 1, arbitrary: fc.constantFrom(0, -0, 1, -1, 0.5, 1e-9) },
);

/** alles, auch NaN, ±∞ und Riesen */
const wilderWert = fc.oneof({ weight: 3, arbitrary: wert }, { weight: 1, arbitrary: fc.double() });

const fall = (werte: fc.Arbitrary<number>, max = 40) =>
  stellen(max).chain((xs) =>
    fc.record({
      xs: fc.constant(xs),
      ys: fc.array(werte, { minLength: xs.length, maxLength: xs.length }),
      innen: fc.array(fc.double({ min: xs[0]!, max: xs[xs.length - 1]!, noNaN: true }), { maxLength: 30 }),
      ueberall: fc.array(fc.double(), { maxLength: 10 }),
    }),
  );

/** Abfragen: an jeder Stelle, dicht daneben, Mitten, zufällig innen, außerhalb und Sonderwerte */
function abfragen(xs: readonly number[], innen: readonly number[], ueberall: readonly number[]): number[] {
  const a: number[] = [...innen, ...ueberall, -Infinity, Infinity, NaN, 0, -0];
  for (let k = 0; k < xs.length; k++) {
    const x = xs[k]!;
    a.push(x, darueber(x), darunter(x), x - 1, x + 1);
    if (k + 1 < xs.length) a.push(x + (xs[k + 1]! - x) / 2, x + (xs[k + 1]! - x) / 3);
  }
  return a;
}

function vergleichen(xs: readonly number[], ys: readonly number[], qs: readonly number[]): void {
  const m = new Float64Array(xs.length);
  pchipSteigungen(xs, ys, m);
  for (const x of qs) {
    const studio = pchipWert(xs, ys, m, x);
    const prototyp = pchip(xs, ys, x);
    if (!Object.is(studio, prototyp))
      throw new Error(`x = ${String(x)}: Studio ${String(studio)}, Prototyp ${String(prototyp)} (xs ${JSON.stringify(xs)}, ys ${JSON.stringify(ys)})`);
  }
}

// ---- Bitgleichheit mit dem Prototyp ------------------------------------------------------------------------------------------

describe('pchipSteigungen und pchipWert: bitgleich zum Prototyp', () => {
  it('gewöhnliche Werte an zufälligen, ungleichmäßigen Stützstellen (fast-check)', () => {
    fc.assert(
      fc.property(fall(wert), ({ xs, ys, innen, ueberall }) => vergleichen(xs, ys, abfragen(xs, innen, ueberall))),
      { numRuns: 3000 },
    );
  });

  it('auch mit NaN, ±∞ und riesigen Werten (fast-check)', () => {
    fc.assert(
      fc.property(fall(wilderWert, 12), ({ xs, ys, innen, ueberall }) => vergleichen(xs, ys, abfragen(xs, innen, ueberall))),
      { numRuns: 2000 },
    );
  });

  it('auch mit gleichen Stellen (nicht fallend, Breite 0): dasselbe Stück wie die lineare Suche (fast-check)', () => {
    const gleicheStellen = fc
      .array(fc.integer({ min: -4, max: 4 }), { minLength: 1, maxLength: 12 })
      .map((ks) => ks.map((k) => k / 4).sort((a, b) => a - b));
    fc.assert(
      fc.property(
        gleicheStellen.chain((xs) => fc.tuple(fc.constant(xs), fc.array(wert, { minLength: xs.length, maxLength: xs.length }))),
        fc.array(fc.double({ min: -2, max: 2 }), { maxLength: 20 }),
        ([xs, ys], qs) => vergleichen(xs, ys, [...qs, ...abfragen(xs, [], [])]),
      ),
      { numRuns: 2000 },
    );
  });

  it('typisierte Felder als Stützstellen geben dieselben Werte wie Listen', () => {
    fc.assert(
      fc.property(fall(wert, 20), ({ xs, ys, innen }) => {
        const m = new Float64Array(xs.length);
        pchipSteigungen(Float64Array.from(xs), Float64Array.from(ys), m);
        for (const x of abfragen(xs, innen, [])) expect(Object.is(pchipWert(Float64Array.from(xs), Float64Array.from(ys), m, x), pchip(xs, ys, x))).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('feste Fälle: eine Stelle, zwei Stellen, Stützstellen wie Kopfversatz und Faltschlüssel', () => {
    const faelle: [number[], number[]][] = [
      [[5], [7]],
      [[0, 1], [0, 1]],
      [[0, 90, 180, 270], [0, 12.5, -3, 0]],
      [[0, 52, 52.07, 82, 145, 180], [1, 2, 2, 2.5, -1, -1]],
      [[-1e-9, 0, 1e-9], [-0, 0, -0]],
    ];
    for (const [xs, ys] of faelle) vergleichen(xs, ys, abfragen(xs, [], []));
  });
});

// ---- Eigenschaften ------------------------------------------------------------------------------------------------------------

describe('pchipWert: Eigenschaften', () => {
  it('exakt an den Stützstellen (bis auf das Vorzeichen einer Null), außerhalb festgehalten', () => {
    fc.assert(
      fc.property(fall(wert), ({ xs, ys }) => {
        const m = new Float64Array(xs.length);
        pchipSteigungen(xs, ys, m);
        fc.pre(m.every(Number.isFinite));
        xs.forEach((x, k) => expect(pchipWert(xs, ys, m, x) === ys[k]).toBe(true));
        expect(pchipWert(xs, ys, m, xs[0]! - 1)).toBe(ys[0]);
        expect(pchipWert(xs, ys, m, -Infinity)).toBe(ys[0]);
        expect(pchipWert(xs, ys, m, xs[xs.length - 1]! + 1)).toBe(ys[ys.length - 1]);
        expect(pchipWert(xs, ys, m, Infinity)).toBe(ys[ys.length - 1]);
      }),
      { numRuns: 500 },
    );
  });

  it('kein Überschwingen: jeder Wert liegt zwischen den Werten seines Stücks', () => {
    fc.assert(
      fc.property(fall(wert), ({ xs, ys, innen }) => {
        const m = new Float64Array(xs.length);
        pchipSteigungen(xs, ys, m);
        fc.pre(m.every(Number.isFinite));
        for (const x of innen) {
          let k = 0;
          while (k < xs.length - 2 && x > xs[k + 1]!) k++;
          const lo = Math.min(ys[k]!, ys[Math.min(k + 1, ys.length - 1)]!);
          const hi = Math.max(ys[k]!, ys[Math.min(k + 1, ys.length - 1)]!);
          const spiel = 1e-12 * Math.max(1, Math.abs(lo), Math.abs(hi));
          const v = pchipWert(xs, ys, m, x);
          expect(v).toBeGreaterThanOrEqual(lo - spiel);
          expect(v).toBeLessThanOrEqual(hi + spiel);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it('ohne Stützstellen NaN, mit einer die Steigung 0 und überall ihr Wert', () => {
    const leer = new Float64Array(0);
    pchipSteigungen([], [], leer);
    expect(pchipWert([], [], leer, 1)).toBeNaN();
    const m = new Float64Array([9]);
    pchipSteigungen([3], [4], m);
    expect(Array.from(m)).toEqual([0]);
    for (const x of [-Infinity, 2, 3, 4, NaN]) expect(pchipWert([3], [4], m, x)).toBe(4);
  });

  it('meldet zu kurze Werte oder zu wenig Platz', () => {
    expect(() => pchipSteigungen([0, 1, 2], [0, 1], new Float64Array(3))).toThrow(RangeError);
    expect(() => pchipSteigungen([0, 1, 2], [0, 1, 2], new Float64Array(2))).toThrow(RangeError);
  });
});

// ---- Periodisch (Kreisregler) -------------------------------------------------------------------------------------------------

/** Stützstellen im Halbgrad-Raster in [0°, 360°): Summen und Differenzen sind exakt, Vergleiche bitgenau möglich */
const kreisFall = fc
  .uniqueArray(fc.integer({ min: 0, max: 719 }), { minLength: 1, maxLength: 24 })
  .map((ks) => ks.sort((a, b) => a - b).map((k) => k / 2))
  .chain((xs) => fc.tuple(fc.constant(xs), fc.array(wert, { minLength: xs.length, maxLength: xs.length })));

/** Abfragen auf 1/64° über drei Umläufe */
const kreisAbfragen = fc.array(fc.integer({ min: -720 * 64, max: 1080 * 64 }).map((k) => k / 64), { minLength: 1, maxLength: 40 });

function kreis(xs: readonly number[], ys: readonly number[]): Float64Array {
  const m = new Float64Array(xs.length);
  pchipSteigungen(xs, ys, m, 360);
  return m;
}

describe('periodisch: Steigungen über die Naht, Werte im Umlauf', () => {
  it('innen gleich den Steigungen ohne Periode, nur die Enden sehen über die Naht', () => {
    fc.assert(
      fc.property(kreisFall, ([xs, ys]) => {
        const p = kreis(xs, ys);
        const o = new Float64Array(xs.length);
        pchipSteigungen(xs, ys, o);
        for (let k = 1; k < xs.length - 1; k++) expect(Object.is(p[k], o[k])).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('gleich den inneren Steigungen der fortgesetzten Folge (zwei je Seite)', () => {
    fc.assert(
      fc.property(kreisFall, ([xs, ys]) => {
        const n = xs.length;
        if (n < 2) return;
        // fortgesetzt: zwei Schlüssel je Seite, im Halbgrad-Raster exakt
        const fx = [xs[n - 2]! - 360, xs[n - 1]! - 360, ...xs, xs[0]! + 360, xs[1]! + 360];
        const fy = [ys[n - 2]!, ys[n - 1]!, ...ys, ys[0]!, ys[1]!];
        const fm = new Float64Array(fx.length);
        pchipSteigungen(fx, fy, fm);
        const p = kreis(xs, ys);
        for (let k = 0; k < n; k++) expect(Object.is(p[k], fm[k + 2])).toBe(true);
        // und die Werte über einen Umlauf gleich denen der fortgesetzten Folge (an Stützstellen bis auf das Vorzeichen einer Null)
        for (let q = 0; q < 360 * 8; q++) {
          const x = q / 8;
          expect(pchipWert(xs, ys, p, x, 360) === pchipWert(fx, fy, fm, x < xs[0]! ? x + 360 : x)).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('exakt an jeder Stützstelle, auch eine oder mehrere Perioden weiter', () => {
    fc.assert(
      fc.property(kreisFall, fc.integer({ min: -3, max: 3 }), ([xs, ys], umlauf) => {
        const m = kreis(xs, ys);
        xs.forEach((x, k) => expect(pchipWert(xs, ys, m, x + 360 * umlauf, 360) === ys[k]).toBe(true));
      }),
      { numRuns: 500 },
    );
  });

  it('periodisch: f(x + 360) = f(x), bitgleich', () => {
    fc.assert(
      fc.property(kreisFall, kreisAbfragen, ([xs, ys], qs) => {
        const m = kreis(xs, ys);
        for (const x of qs) expect(Object.is(pchipWert(xs, ys, m, x + 360, 360), pchipWert(xs, ys, m, x, 360))).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('kein ausgezeichneter Anfang: mit dem ersten Schlüssel ans Ende gedreht, bitgleich dieselbe Kurve', () => {
    fc.assert(
      fc.property(kreisFall, kreisAbfragen, ([xs, ys], qs) => {
        const n = xs.length;
        const m = kreis(xs, ys);
        const xs2 = [...xs.slice(1), xs[0]! + 360];
        const ys2 = [...ys.slice(1), ys[0]!];
        const m2 = new Float64Array(n);
        pchipSteigungen(xs2, ys2, m2, 360);
        for (let k = 0; k < n; k++) expect(Object.is(m2[k], m[(k + 1) % n])).toBe(true);
        // an Stützstellen bis auf das Vorzeichen einer Null (einmal festgehalten, einmal t = 1), sonst bitgleich
        for (const x of qs) expect(pchipWert(xs2, ys2, m2, x, 360) === pchipWert(xs, ys, m, x, 360)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('stetig mit stetiger Steigung über die Naht', () => {
    fc.assert(
      fc.property(kreisFall, ([xs, ys]) => {
        const n = xs.length;
        if (n < 2) return;
        const m = kreis(xs, ys);
        const x0 = xs[0]!;
        const kleinsterAbstand = Math.min(...xs.slice(1).map((x, k) => x - xs[k]!), x0 + 360 - xs[n - 1]!);
        const d = kleinsterAbstand * 1e-6;
        const f = (x: number): number => pchipWert(xs, ys, m, x, 360);
        const skala = Math.max(1, ...ys.map(Math.abs), ...Array.from(m, Math.abs));
        // von links (Nahtstück) und von rechts (erstes Stück) dieselbe Steigung m₀
        expect(Math.abs((f(x0) - f(x0 - d)) / d - m[0]!)).toBeLessThan(1e-3 * skala);
        expect(Math.abs((f(x0 + d) - f(x0)) / d - m[0]!)).toBeLessThan(1e-3 * skala);
        expect(Math.abs(f(x0 - d) - ys[0]!)).toBeLessThan(1e-3 * skala);
      }),
      { numRuns: 500 },
    );
  });

  it('zwei Schlüssel: beide sind Extremwerte, Steigung 0; einer: konstant', () => {
    const m = kreis([10, 100], [1, 5]);
    expect(Array.from(m)).toEqual([0, 0]);
    const eins = kreis([30], [2]);
    expect(Array.from(eins)).toEqual([0]);
    for (const x of [-500, 0, 30, 359.5, 1000]) expect(pchipWert([30], [2], eins, x, 360)).toBe(2);
    expect(pchipWert([], [], new Float64Array(0), 1, 360)).toBeNaN();
    expect(pchipWert([10, 100], [1, 5], m, NaN, 360)).toBeNaN();
  });

  it('meldet eine ungültige Periode und Stützstellen, die nicht in eine Periode passen', () => {
    const m = new Float64Array(3);
    for (const p of [0, -360, NaN, Infinity]) expect(() => pchipSteigungen([0, 1, 2], [0, 1, 2], m, p)).toThrow(RangeError);
    expect(() => pchipSteigungen([0, 180, 360], [0, 1, 0], m, 360)).toThrow(RangeError);
    expect(() => pchipSteigungen([0, 180, 359.5], [0, 1, 0], m, 360)).not.toThrow();
  });

  it('die Periode gehört zu Steigungen und Wert: ohne sie hält der Wert hinter dem letzten Schlüssel fest', () => {
    const xs = [0, 90, 180, 270];
    const ys = [0, 10, 0, -10];
    const m = kreis(xs, ys);
    // über die Naht von 270° nach 360°: von −10 zurück zu 0, an 360° genau der Schlüssel bei 0°
    expect(pchipWert(xs, ys, m, 359, 360)).toBeCloseTo(-0.1123, 4);
    expect(pchipWert(xs, ys, m, 360, 360)).toBe(0);
    expect(pchipWert(xs, ys, m, 359)).toBe(-10);
    // innen, wo keine Naht im Spiel ist, rechnen beide Aufrufe bitgleich
    for (let q = 0; q <= 270 * 4; q++) expect(Object.is(pchipWert(xs, ys, m, q / 4, 360), pchipWert(xs, ys, m, q / 4))).toBe(true);
    // ausdrücklich ohne Periode ist dasselbe wie ohne
    for (const x of [-5, 0, 45, 359, 400]) expect(Object.is(pchipWert(xs, ys, m, x, undefined), pchipWert(xs, ys, m, x))).toBe(true);
  });
});
