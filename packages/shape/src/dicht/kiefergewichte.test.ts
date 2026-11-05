// Form zuerst (05.11.2026): Gewichte des Unterkiefers ohne Knick. Florian sah beim Öffnen einen Knick unten am Körper: Der Kiefer lief
// auf einer festen halben Kieferdicke aus, auf einer Kugel mitten im Kinn, weit vom Gelenk. Jetzt läuft er so lang aus, wie die Haut
// dort beim größten Winkel wandert (`kieferFeld` mit `hebel`, höchstens zwei Kieferdicken). Gemessen wird, um wie viel der Winkel
// zwischen Nachbardreiecken beim Öffnen zunimmt (ohne die Kanten an der Lippe), und an der Bohne, wie weit der Bauch mitgeht.
// Vorher bei 40°: Kugel Seite p99 10,1° / max 49,3°, Kugel Front p99 15,4° / max 116,9°.
import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, hautAus } from './kurven';
import { type Loop, formAusZeichnung } from './loops';
import { maulOeffnen } from './maul';
import { type MaulAmLoop, maulAmLoop, mundwinkelProbe } from './maulLoop';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);
const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
const BOHNE: UmrissPunkt[] = [
  { x: 150, y: 0 },
  { x: 80, y: 130 },
  { x: -40, y: 150 },
  { x: -150, y: 120 },
  { x: -200, y: 60 },
  { x: -170, y: 22 },
  { x: -110, y: 24 },
  { x: -50, y: 15 },
  { x: -110, y: 4 },
  { x: -180, y: -40 },
  { x: -120, y: -130 },
  { x: 0, y: -150 },
  { x: 110, y: -110 },
];
const haut = (u: UmrissPunkt[]): Haut => {
  const netz = rundAusSeite(u, { dreiecke: 6000 });
  return hautAus(netz.positionen, netz.indizes);
};
const linse = (cu: number, cv: number, au: number, av: number, n = 64): { uv: [number, number][]; knoten: number[] } => ({
  uv: Array.from({ length: n }, (_, i): [number, number] => [cu + au * Math.cos((2 * Math.PI * i) / n), cv + av * Math.sin((2 * Math.PI * i) / n)]),
  knoten: Array.from({ length: n / 8 }, (_, i) => 8 * i),
});

function normale(P: ArrayLike<number>, a: number, b: number, c: number): [number, number, number] {
  const ab = [P[3 * b]! - P[3 * a]!, P[3 * b + 1]! - P[3 * a + 1]!, P[3 * b + 2]! - P[3 * a + 2]!];
  const ac = [P[3 * c]! - P[3 * a]!, P[3 * c + 1]! - P[3 * a + 1]!, P[3 * c + 2]! - P[3 * a + 2]!];
  const n: [number, number, number] = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
  const l = Math.hypot(...n) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

/** Zunahme des Knicks zwischen Nachbardreiecken gegen die Ruhe (Grad), ohne Kanten an der Lippe; dazu der Ort des größten */
function knick(rest: ArrayLike<number>, pos: ArrayLike<number>, I: Uint32Array, lippe: ReadonlySet<number>): { p99: number; max: number; wo: string } {
  const kanten = new Map<string, number[]>();
  for (let t = 0; t < I.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = I[t + e]!;
      const b = I[t + ((e + 1) % 3)]!;
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      const l = kanten.get(k);
      if (l) l.push(t / 3);
      else kanten.set(k, [t / 3]);
    }
  }
  const werte: number[] = [];
  let max = 0;
  let wo = '';
  for (const [k, ts] of kanten) {
    if (ts.length !== 2) continue;
    const [a, b] = k.split(',').map(Number) as [number, number];
    if (lippe.has(a) || lippe.has(b)) continue;
    const winkel = (P: ArrayLike<number>) => {
      const n1 = normale(P, I[3 * ts[0]!]!, I[3 * ts[0]! + 1]!, I[3 * ts[0]! + 2]!);
      const n2 = normale(P, I[3 * ts[1]!]!, I[3 * ts[1]! + 1]!, I[3 * ts[1]! + 2]!);
      return (Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]))) * 180) / Math.PI;
    };
    const d = winkel(pos) - winkel(rest);
    werte.push(d);
    if (d > max) {
      max = d;
      wo = `(${rest[3 * a]!.toFixed(0)}, ${rest[3 * a + 1]!.toFixed(0)}, ${rest[3 * a + 2]!.toFixed(0)})`;
    }
  }
  werte.sort((x, y) => x - y);
  return { p99: werte[Math.floor(0.99 * (werte.length - 1))]!, max, wo };
}

function umgeschlagen(P: Float32Array, I: Uint32Array): number {
  const vn = new Float64Array(P.length);
  const fn: number[][] = [];
  for (let t = 0; t < I.length; t += 3) {
    const n = normale(P, I[t]!, I[t + 1]!, I[t + 2]!);
    fn.push(n);
    for (const v of [I[t]!, I[t + 1]!, I[t + 2]!]) for (let k = 0; k < 3; k++) vn[3 * v + k] = vn[3 * v + k]! + n[k]!;
  }
  let z = 0;
  for (let t = 0; t < I.length; t += 3) {
    const f = fn[t / 3]!;
    const mm = [0, 1, 2].map((k) => vn[3 * I[t]! + k]! + vn[3 * I[t + 1]! + k]! + vn[3 * I[t + 2]! + k]!);
    if (f[0]! * mm[0]! + f[1]! * mm[1]! + f[2]! * mm[2]! < 0) z++;
  }
  return z;
}

describe('Gewichte des Unterkiefers ohne Knick', () => {
  /** Grenzen bei 40°: Knick p99 und max (Grad), Bauch der Bohne (Einheiten) */
  const grenzen: Record<string, { p99: number; max: number; bauch?: number }> = {
    'Kugel Seite': { p99: 2, max: 15 },
    'Kugel Front': { p99: 8, max: 25 },
    'Bohne Kopf': { p99: 3, max: 25, bauch: 6 },
  };
  const faelle: [string, () => { haut: Haut; loop: Loop }][] = [
    ['Kugel Seite', () => {
      const h = haut(kreis(150));
      const { uv, knoten } = linse(-115, -20, 60, 9);
      const r = loopEinsetzen(h, [formAusZeichnung(h, 'seite', uv, knoten, 1)!], 0)!;
      return { haut: r.haut, loop: r.loops[0]! };
    }],
    ['Kugel Front', () => {
      const h = haut(kreis(150));
      const { uv, knoten } = linse(0, -20, 90, 10);
      const r = loopEinsetzen(h, [formAusZeichnung(h, 'front', uv, knoten, 1)!], 0)!;
      return { haut: r.haut, loop: r.loops[0]! };
    }],
    ['Bohne Kopf', () => {
      const h = haut(BOHNE);
      const { uv, knoten } = linse(-165, 75, 50, 7);
      const r = loopEinsetzen(h, [formAusZeichnung(h, 'seite', uv, knoten, 1)!], 0)!;
      return { haut: r.haut, loop: r.loops[0]! };
    }],
  ];
  for (const [name, bau] of faelle) {
    it(name, () => {
      const { haut: h, loop } = bau();
      const m = maulAmLoop(h, loop, mundwinkelProbe(loop), { zelle: 4.3 }) as MaulAmLoop;
      const lippe = new Set([...m.lippeOben, ...m.lippeUnten]);
      const zeilen: string[] = [];
      for (const w of [20, 40, 55]) {
        const ziel = {
          positionen: new Float32Array(m.positionen.length),
          normalen: new Float32Array(m.normalen.length),
          innenPositionen: new Float32Array(m.innen.positionen.length),
          innenNormalen: new Float32Array(m.innen.normalen.length),
        };
        maulOeffnen(m, w, ziel);
        const k = knick(m.positionen, ziel.positionen, m.indizes, lippe);
        let bauch = 0;
        for (let v = 0; v < h.n; v++) if (m.positionen[3 * v + 1]! < 0 && name.startsWith('Bohne')) bauch = Math.max(bauch, Math.hypot(ziel.positionen[3 * v]! - m.positionen[3 * v]!, ziel.positionen[3 * v + 1]! - m.positionen[3 * v + 1]!));
        const um = umgeschlagen(ziel.positionen, m.indizes);
        zeilen.push(`${w}°: Knick p99 ${k.p99.toFixed(1)}°, max ${k.max.toFixed(1)}° bei ${k.wo}, umgeschlagen ${um}${name.startsWith('Bohne') ? `, Bauch bis ${bauch.toFixed(1)}` : ''}`);
        expect(um).toBe(0);
        if (w !== 40) continue;
        const g = grenzen[name]!;
        expect(k.p99).toBeLessThan(g.p99);
        expect(k.max).toBeLessThan(g.max);
        if (g.bauch !== undefined) expect(bauch).toBeLessThan(g.bauch);
      }
      log(`${name}: Mundwinkel (${m.gelenk.x.toFixed(0)}, ${m.gelenk.y.toFixed(0)})\n  ${zeilen.join('\n  ')}`);
    });
  }
});
