import { describe, expect, it } from 'vitest';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

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
});
