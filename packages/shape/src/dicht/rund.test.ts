import { describe, expect, it } from 'vitest';
import type { KantenLinie } from './kanten';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

/** Größter Winkel zwischen Nachbardreiecken (Grad), nur Dreiecke, deren Ecken alle die Bedingung erfüllen. */
function groessterKnick(indizes: Uint32Array, pos: Float32Array, nahe: (x: number, y: number, z: number) => boolean): number {
  const fn: number[] = [];
  for (let t = 0; t < indizes.length; t += 3) {
    const a = indizes[t]!;
    const b = indizes[t + 1]!;
    const c = indizes[t + 2]!;
    const abx = pos[3 * b]! - pos[3 * a]!;
    const aby = pos[3 * b + 1]! - pos[3 * a + 1]!;
    const abz = pos[3 * b + 2]! - pos[3 * a + 2]!;
    const acx = pos[3 * c]! - pos[3 * a]!;
    const acy = pos[3 * c + 1]! - pos[3 * a + 1]!;
    const acz = pos[3 * c + 2]! - pos[3 * a + 2]!;
    const x = aby * acz - abz * acy;
    const y = abz * acx - abx * acz;
    const z = abx * acy - aby * acx;
    const l = Math.hypot(x, y, z) || 1;
    fn.push(x / l, y / l, z / l);
  }
  const kante = new Map<string, number>();
  let groesst = 0;
  for (let t = 0; t < indizes.length / 3; t++) {
    const ecken = [indizes[3 * t]!, indizes[3 * t + 1]!, indizes[3 * t + 2]!];
    if (!ecken.every((v) => nahe(pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!))) continue;
    for (let e = 0; e < 3; e++) {
      const a = ecken[e]!;
      const b = ecken[(e + 1) % 3]!;
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      const u = kante.get(k);
      if (u === undefined) {
        kante.set(k, t);
        continue;
      }
      const d = fn[3 * t]! * fn[3 * u]! + fn[3 * t + 1]! * fn[3 * u + 1]! + fn[3 * t + 2]! * fn[3 * u + 2]!;
      groesst = Math.max(groesst, (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI);
    }
  }
  return groesst;
}

const kreis = (r: number, n = 4): UmrissPunkt[] => Array.from({ length: n }, (_, i) => ({ x: r * Math.cos((2 * Math.PI * i) / n), y: r * Math.sin((2 * Math.PI * i) / n) }));

/** Jede Kante gehört zu genau zwei Dreiecken. */
function geschlossen(indizes: Uint32Array): boolean {
  const kanten = new Map<string, number>();
  for (let t = 0; t < indizes.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = indizes[t + e]!;
      const b = indizes[t + ((e + 1) % 3)]!;
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      kanten.set(k, (kanten.get(k) ?? 0) + 1);
    }
  }
  for (const n of kanten.values()) if (n !== 2) return false;
  return true;
}

describe('runder Körper aus dem Seitenumriss', () => {
  it('ein Kreis wird eine Kugel', () => {
    const netz = rundAusSeite(kreis(100), { dreiecke: 20000 });
    const n = netz.positionen.length / 3;
    let fehler = 0;
    for (let v = 0; v < n; v++) {
      const r = Math.hypot(netz.positionen[3 * v]!, netz.positionen[3 * v + 1]!, netz.positionen[3 * v + 2]!);
      fehler = Math.max(fehler, Math.abs(r - 100));
    }
    expect(fehler).toBeLessThan(1);
    expect(geschlossen(netz.indizes)).toBe(true);
  });

  it('ein Streifen wird eine runde Röhre', () => {
    // Stadion: Länge 400, Halbbreite 40
    const s: UmrissPunkt[] = [
      { x: -200, y: -40, ecke: true },
      { x: 0, y: -40, ecke: true },
      { x: 200, y: -40, ecke: true },
      { x: 200, y: 40, ecke: true },
      { x: 0, y: 40, ecke: true },
      { x: -200, y: 40, ecke: true },
    ];
    const netz = rundAusSeite(s, { dreiecke: 30000 });
    const n = netz.positionen.length / 3;
    let fehler = 0;
    let gezaehlt = 0;
    for (let v = 0; v < n; v++) {
      const x = netz.positionen[3 * v]!;
      if (Math.abs(x) > 60) continue;
      const r = Math.hypot(netz.positionen[3 * v + 1]!, netz.positionen[3 * v + 2]!);
      fehler = Math.max(fehler, Math.abs(r - 40));
      gezaehlt++;
    }
    expect(gezaehlt).toBeGreaterThan(50);
    expect(fehler).toBeLessThan(1);
    expect(geschlossen(netz.indizes)).toBe(true);
  });

  it('eine harte Linie wird ein Grat, eine weiche bleibt rund', () => {
    // senkrechte Linie quer über die Flanke der Kugel
    const linie = (breite: number): KantenLinie => ({
      punkte: [
        { x: 0, y: -80, breite },
        { x: 0, y: 0, breite },
        { x: 0, y: 80, breite },
      ],
    });
    const naheLinie = (x: number, y: number, z: number) => Math.abs(x) < 12 && Math.abs(y) < 40 && z > 0;
    const hart = rundAusSeite(kreis(100), { dreiecke: 20000, linien: [linie(3)] });
    const weich = rundAusSeite(kreis(100), { dreiecke: 20000, linien: [linie(0)] });
    const knickHart = groessterKnick(hart.indizes, hart.positionen, naheLinie);
    const knickWeich = groessterKnick(weich.indizes, weich.positionen, naheLinie);
    expect(knickHart).toBeGreaterThan(20);
    expect(knickWeich).toBeLessThan(8);
    // die Linie bleibt auf der Kugel: der Punkt auf der Linie liegt weiter auf r = 100
    let naechster = Infinity;
    let r = 0;
    for (let v = 0; v < hart.positionen.length / 3; v++) {
      const x = hart.positionen[3 * v]!;
      const y = hart.positionen[3 * v + 1]!;
      const z = hart.positionen[3 * v + 2]!;
      const d = Math.hypot(x, y);
      if (z > 0 && d < naechster) {
        naechster = d;
        r = Math.hypot(x, y, z);
      }
    }
    expect(Math.abs(r - 100)).toBeLessThan(1.5);
    expect(hart.kanten.length).toBe(2);
    expect(geschlossen(hart.indizes)).toBe(true);
  });
});
