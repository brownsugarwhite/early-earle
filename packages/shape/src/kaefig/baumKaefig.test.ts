// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S5.1: Topologie des Mittelebenen-Baums.
import { describe, expect, it } from 'vitest';
import { type StreifenTopo, baumKaefig } from './baumKaefig';
import { roehre } from './roehre';
import { pruefeKaefig } from './halbkanten';

/** Valenzen (Kanten je Punkt) als Häufigkeiten. */
function valenzen(k: ReturnType<typeof baumKaefig>['kaefig']): Map<number, number> {
  const v = new Map<number, number>();
  for (let p = 0; p < k.n; p++) {
    const val = k.vKStart[p + 1]! - k.vKStart[p]!;
    v.set(val, (v.get(val) ?? 0) + 1);
  }
  return v;
}

describe('S5.1 Baum-Käfig', () => {
  it('ein Streifen ist genau die Röhre (Nummerierung, Flächen, Orientierung)', () => {
    for (const [R, N] of [
      [24, 16],
      [7, 8],
      [10, 24],
    ] as const) {
      const r = roehre(R, N);
      const b = baumKaefig([{ R, N, anfang: { art: 'kappe' }, ende: { art: 'kappe' } }], (p) => [r.kaefig.xyz[3 * p]!, r.kaefig.xyz[3 * p + 1]!, r.kaefig.xyz[3 * p + 2]!]);
      expect(b.kaefig.n).toBe(r.kaefig.n);
      expect(Array.from(b.kaefig.fVerts)).toEqual(Array.from(r.kaefig.fVerts));
      expect(Array.from(b.kaefig.fStart)).toEqual(Array.from(r.kaefig.fStart));
      for (let i = 0; i < R; i++) for (let j = 0; j < N; j++) expect(b.ring(0, i, j)).toBe(r.ringPunkt(i, j));
      const c = N / 4;
      for (const seite of ['vorn', 'hinten'] as const) for (let a = 0; a <= c; a++) for (let bb = 0; bb <= c; bb++) expect(b.kappe(0, seite === 'vorn' ? 'anfang' : 'ende', a, bb)).toBe(r.kappe(seite, a, bb));
      expect(b.kappeAb).toBe(R * N);
    }
  });

  const pruefe = (streifen: StreifenTopo[], erwartet: Record<number, number>) => {
    const b = baumKaefig(streifen);
    const k = b.kaefig;
    expect(pruefeKaefig(k).ok).toBe(true);
    expect(k.n - k.nE + k.nF).toBe(2);
    const v = valenzen(k);
    const sonder = [...v.entries()].filter(([val]) => val !== 4).sort((x, y) => x[0] - y[0]);
    expect(Object.fromEntries(sonder)).toEqual(erwartet);
    // Spiegel: Naht auf sich, sonst Paare
    for (let p = 0; p < k.n; p++) expect(b.spiegel[b.spiegel[p]!]).toBe(p);
    return b;
  };

  it('seitlich angesetzt oben (Hals auf dem Rumpf): Hose mit zwei Sattelpunkten auf der Naht', () => {
    const b = pruefe(
      [
        { R: 12, N: 16, anfang: { art: 'kappe' }, ende: { art: 'kappe' } },
        { R: 6, N: 8, anfang: { art: 'seitlich', eltern: 0, seite: 'a', ring: 4 }, ende: { art: 'kappe' } },
      ],
      { 3: 12, 6: 2 },
    );
    // Sehnenenden auf der Naht, innere Sprossenenden verdoppelt
    expect(b.naht[b.ring(0, 4, 0)]).toBe(1);
    expect(b.naht[b.ring(0, 8, 0)]).toBe(1);
    for (let i = 5; i < 8; i++) {
      expect(b.naht[b.ring(0, i, 0)]).toBe(0);
      expect(b.links(b.ring(0, i, 0))).not.toBe(b.ring(0, i, 0));
    }
    // Kindring 0 = Sprossenenden des Elternstreifens
    expect(b.ring(1, 0, 0)).toBe(b.ring(0, 4, 0));
    expect(b.ring(1, 0, 2)).toBe(b.ring(0, 6, 0));
    expect(b.ring(1, 0, 6)).toBe(b.links(b.ring(0, 6, 0)));
  });

  it('seitlich angesetzt unten (Bauchflosse) und zwei Kinder an einem Streifen', () => {
    pruefe(
      [
        { R: 16, N: 16, anfang: { art: 'kappe' }, ende: { art: 'kappe' } },
        { R: 4, N: 8, anfang: { art: 'seitlich', eltern: 0, seite: 'b', ring: 3 }, ende: { art: 'kappe' } },
        { R: 5, N: 16, anfang: { art: 'seitlich', eltern: 0, seite: 'a', ring: 6 }, ende: { art: 'kappe' } },
      ],
      { 3: 16, 6: 4 },
    );
  });

  it('Fortsetzung mit Übergang 2:1 (Hals am Ende des Rumpfs)', () => {
    const b = pruefe(
      [
        { R: 10, N: 16, anfang: { art: 'kappe' }, ende: { art: 'uebergang' } },
        { R: 6, N: 8, anfang: { art: 'fortsetzung', eltern: 0, ende: 'ende' }, ende: { art: 'kappe' } },
      ],
      { 3: 12, 6: 2 },
    );
    // Übergangskappe ist kein Spitzenkappen-Bereich
    expect(b.kappe(0, 'ende', 2, 2)).toBeLessThan(b.kappeAb);
    expect(b.naht[b.kappe(0, 'ende', 2, 2)]).toBe(0);
  });

  it('Kind eines Kinds (Flosse am Hals)', () => {
    pruefe(
      [
        { R: 12, N: 16, anfang: { art: 'kappe' }, ende: { art: 'kappe' } },
        { R: 10, N: 8, anfang: { art: 'seitlich', eltern: 0, seite: 'a', ring: 3 }, ende: { art: 'kappe' } },
        { R: 3, N: 8, anfang: { art: 'seitlich', eltern: 1, seite: 'b', ring: 2 }, ende: { art: 'kappe' } },
      ],
      { 3: 16, 6: 4 },
    );
  });
});
