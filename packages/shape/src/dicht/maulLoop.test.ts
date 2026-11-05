import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, hautAus } from './kurven';
import { type Loop, formAusZeichnung } from './loops';
import { maulOeffnen } from './maul';
import { type MaulAmLoop, maulAmLoop, mundwinkelProbe } from './maulLoop';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);
const jetzt = () => (globalThis as unknown as { performance: { now: () => number } }).performance.now();
const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
const kugel = (): Haut => {
  const netz = rundAusSeite(kreis(150), { dreiecke: 6000 });
  return hautAus(netz.positionen, netz.indizes);
};

/** schmale Form (Ellipse) in Blattkoordinaten (u, v), dicht abgetastet, jede achte Probe ein Punkt */
const linse = (cu: number, cv: number, au: number, av: number, n = 64): { uv: [number, number][]; knoten: number[] } => ({
  uv: Array.from({ length: n }, (_, i): [number, number] => [cu + au * Math.cos((2 * Math.PI * i) / n), cv + av * Math.sin((2 * Math.PI * i) / n)]),
  knoten: Array.from({ length: n / 8 }, (_, i) => 8 * i),
});

const eingesetzt = (h: Haut, l: Loop): { haut: Haut; loop: Loop } => {
  const r = loopEinsetzen(h, [l], 0)!;
  return { haut: r.haut, loop: r.loops[0]! };
};

/** Kanten mit mehr oder weniger als zwei Dreiecken (Haut und Inneres zusammen, Punkte nach Lage zusammengefasst) */
function offeneKanten(m: MaulAmLoop, pos: Float32Array, innenPos: Float32Array): number {
  const id = new Map<string, number>();
  const nr = (x: number, y: number, z: number) => {
    const k = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
    let i = id.get(k);
    if (i === undefined) {
      i = id.size;
      id.set(k, i);
    }
    return i;
  };
  const zahl = new Map<string, number>();
  const dazu = (P: Float32Array, I: Uint32Array) => {
    for (let t = 0; t < I.length; t += 3) {
      const e = [0, 1, 2].map((k) => nr(P[3 * I[t + k]!]!, P[3 * I[t + k]! + 1]!, P[3 * I[t + k]! + 2]!));
      for (let k = 0; k < 3; k++) {
        const a = Math.min(e[k]!, e[(k + 1) % 3]!);
        const b = Math.max(e[k]!, e[(k + 1) % 3]!);
        if (a === b) continue;
        zahl.set(`${a},${b}`, (zahl.get(`${a},${b}`) ?? 0) + 1);
      }
    }
  };
  dazu(pos, m.indizes);
  dazu(innenPos, m.innen.indizes);
  return [...zahl.values()].filter((z) => z !== 2).length;
}

/** umgeschlagene Dreiecke: Normale gegen die mittlere Normale ihrer Ecken */
function umgeschlagen(P: Float32Array, I: Uint32Array): number {
  const vn = new Float64Array(P.length);
  const fn: number[][] = [];
  for (let t = 0; t < I.length; t += 3) {
    const [a, b, c] = [I[t]!, I[t + 1]!, I[t + 2]!];
    const ab = [0, 1, 2].map((k) => P[3 * b + k]! - P[3 * a + k]!);
    const ac = [0, 1, 2].map((k) => P[3 * c + k]! - P[3 * a + k]!);
    const f = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
    fn.push(f);
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] = vn[3 * v + k]! + f[k]!;
  }
  let z = 0;
  for (let t = 0; t < I.length; t += 3) {
    const f = fn[t / 3]!;
    const mm = [0, 1, 2].map((k) => vn[3 * I[t]! + k]! + vn[3 * I[t + 1]! + k]! + vn[3 * I[t + 2]! + k]!);
    if (f[0]! * mm[0]! + f[1]! * mm[1]! + f[2]! * mm[2]! < 0) z++;
  }
  return z;
}

function oeffnen(m: MaulAmLoop, winkel: number) {
  const ziel = {
    positionen: new Float32Array(m.positionen.length),
    normalen: new Float32Array(m.normalen.length),
    innenPositionen: new Float32Array(m.innen.positionen.length),
    innenNormalen: new Float32Array(m.innen.normalen.length),
  };
  maulOeffnen(m, winkel, ziel);
  return ziel;
}

describe('Maul als Loop', () => {
  const faelle: [string, () => { haut: Haut; loop: Loop }][] = [
    [
      'Front: schmale Form über die Mitte',
      () => {
        const h = kugel();
        const { uv, knoten } = linse(0, -20, 90, 10);
        return eingesetzt(h, formAusZeichnung(h, 'front', uv, knoten, 1)!);
      },
    ],
    [
      'Seite: schmale Form vorn über den Umriss',
      () => {
        const h = kugel();
        const { uv, knoten } = linse(-115, -20, 60, 9);
        return eingesetzt(h, formAusZeichnung(h, 'seite', uv, knoten, 1)!);
      },
    ],
  ];
  for (const [name, bau] of faelle) {
    it(name, () => {
      const { haut, loop } = bau();
      expect(loop.art).toBe('ring');
      const e = mundwinkelProbe(loop);
      const t0 = jetzt();
      const m = maulAmLoop(haut, loop, e, { zelle: 4.3 })!;
      const ms = jetzt() - t0;
      expect(m).not.toBeNull();
      const M = m.gelenk;
      // zu: die Haut genau wie vorher (nur ohne die Öffnung), dicht mit dem Inneren
      const zu = oeffnen(m, 0);
      let weg = 0;
      for (let i = 0; i < haut.pos.length; i++) weg = Math.max(weg, Math.abs(zu.positionen[i]! - haut.pos[i]!));
      expect(weg).toBeLessThan(1e-3);
      expect(offeneKanten(m, zu.positionen, zu.innenPositionen)).toBe(0);
      const zeilen: string[] = [];
      for (const w of [20, 40, 55]) {
        const o = oeffnen(m, w);
        const offenK = offeneKanten(m, o.positionen, o.innenPositionen);
        const umH = umgeschlagen(o.positionen, m.indizes);
        const umI = umgeschlagen(o.innenPositionen, m.innen.indizes);
        // Unterlippe ganz gedreht, Oberlippe steht
        let unten = 0;
        let oben = 0;
        const th = (m.drehsinn * w * Math.PI) / 180;
        for (const v of m.lippeUnten) {
          const x = m.positionen[3 * v]! - M.x;
          const y = m.positionen[3 * v + 1]! - M.y;
          const sx = M.x + Math.cos(th) * x - Math.sin(th) * y;
          const sy = M.y + Math.sin(th) * x + Math.cos(th) * y;
          unten = Math.max(unten, Math.hypot(o.positionen[3 * v]! - sx, o.positionen[3 * v + 1]! - sy));
        }
        for (const v of m.lippeOben) oben = Math.max(oben, Math.hypot(o.positionen[3 * v]! - m.positionen[3 * v]!, o.positionen[3 * v + 1]! - m.positionen[3 * v + 1]!));
        // spiegelgleich
        let schief = 0;
        for (let v = 0; v < haut.n; v++) {
          const s = haut.spiegel[v]!;
          if (s < 0) continue;
          schief = Math.max(schief, Math.abs(o.positionen[3 * v]! - o.positionen[3 * s]!) + Math.abs(o.positionen[3 * v + 1]! - o.positionen[3 * s + 1]!));
        }
        // die vordere Mitte der Unterlippe geht vom Oberkiefer weg (nach unten)
        const vorne = m.lippeUnten[(m.lippeUnten.length - 1) / 2]!;
        const runter = m.positionen[3 * vorne + 1]! - o.positionen[3 * vorne + 1]!;
        zeilen.push(`${w}°: offen ${offenK}, umgeschlagen Haut ${umH} / innen ${umI}, Unterlippe ${unten.toExponential(1)}, Oberlippe ${oben.toExponential(1)}, schief ${schief.toExponential(1)}, vorn ${runter.toFixed(1)} runter`);
        expect(offenK).toBe(0);
        // Vor dem Auslauf nach dem Hebel (`kieferFeld` mit `hebel`) klappten bei 55° am Maul vorn Dreiecke am Kinn um
        expect(umH).toBe(0);
        expect(umI).toBe(0);
        expect(unten).toBeLessThan(1e-3);
        expect(oben).toBeLessThan(1e-3);
        expect(schief).toBeLessThan(1e-3);
        expect(runter).toBeGreaterThan(0);
      }
      log(
        `${name}: Mundwinkel (${M.x.toFixed(1)}, ${M.y.toFixed(1)}), Lippen ${m.lippeOben.length}/${m.lippeUnten.length}, Öffnung ${m.offen.reduce((a, b) => a + b, 0)} Dreiecke, ` +
          `Inneres ${m.innen.indizes.length / 3}, ${ms.toFixed(0)} ms\n  ${zeilen.join('\n  ')}`,
      );
    });
  }
});
