import { describe, expect, it } from 'vitest';
import { benchPlan, computePosten, fitReplay, stat, type MapBenchRow, type MapBenchStat } from './mapBench';

const s = (med: number): MapBenchStat => ({ med, p99: med, max: med });

function row(szene: MapBenchRow['szene'], variante: MapBenchRow['variante'], dpr: number, k: { bild: number; cpu: number; gpu: number | null; gpuRest: number }, kontrolle = false): MapBenchRow {
  return {
    szene,
    variante,
    kontrolle,
    dpr,
    canvas: [786, 1704],
    bilder: 120,
    bild: s(k.bild),
    cpu: s(k.cpu),
    gpuRest: s(k.gpuRest),
    warten: s(0),
    gpu: k.gpu,
    gpuSync: 2.5,
    replayEncode: 1,
    teile: { update: s(0), bau: s(0), inhalt: s(0), inhaltAnteil: 0, fit: s(0), encode: s(0), szene: s(0) },
    drawCalls: { med: 50, max: 60 },
    schattenPaesseProS: 0,
    kaskadenProS: 0,
    refitsProBild: 0,
    chunksGebaut: 0,
    welt: 9,
    dauerMs: 1000,
  };
}

describe('mapBench', () => {
  it('stat: Median, p99 (nächster Rang), Maximum', () => {
    expect(stat([])).toEqual({ med: 0, p99: 0, max: 0 });
    expect(stat([3, 1, 2])).toEqual({ med: 2, p99: 3, max: 3 });
    expect(stat([4, 1, 3, 2])).toEqual({ med: 2.5, p99: 4, max: 4 });
    // 200 Werte 1…200: p99 = Rang ceil(0,99·200) = 198
    const v = Array.from({ length: 200 }, (_, i) => i + 1);
    expect(stat(v)).toEqual({ med: 100.5, p99: 198, max: 200 });
  });

  it('fitReplay: Kosten je Bild und feste Rückmeldezeit aus zwei Stapelgrößen', () => {
    // g = 2,1 ms, L = 2,5 ms: T(2) = 6,7, T(8) = 19,3
    const f = fitReplay(2, 6.7, 8, 19.3);
    expect(f.gpu).toBeCloseTo(2.1, 6);
    expect(f.sync).toBeCloseTo(2.5, 6);
    // Rauschen darf nichts negativ machen
    expect(fitReplay(2, 10, 8, 9)).toEqual({ gpu: 0, sync: 10 });
    expect(fitReplay(2, 1, 8, 20).sync).toBe(0);
  });

  it('benchPlan: A/B bei der Basis-DPR, DPR-Stufen, kalter Schwenk vorne, Kontrolle am Ende', () => {
    const plan = benchPlan([2, 1.75, 1.5], true);
    expect(plan).toHaveLength(15);
    expect(plan[0]).toEqual({ szene: 'leerlauf', variante: 'alles', dpr: 2, kontrolle: false });
    expect(plan.slice(1, 4).map((p) => p.variante)).toEqual(['ohne-schatten', 'ohne-punkte', 'ohne-vegetation']);
    expect(plan.slice(4, 6).map((p) => p.dpr)).toEqual([1.75, 1.5]);
    expect(plan[6]).toEqual({ szene: 'leerlauf', variante: 'alles', dpr: 2, kontrolle: true });
    expect(plan[7]).toEqual({ szene: 'schwenken-kalt', variante: 'alles', dpr: 2, kontrolle: false });
    expect(plan[14]).toEqual({ szene: 'schwenken', variante: 'alles', dpr: 2, kontrolle: true });
    expect(benchPlan([2], false, ['schwenken']).map((p) => p.szene)).toEqual(['schwenken-kalt', 'schwenken', 'schwenken', 'schwenken', 'schwenken']);
  });

  it('computePosten: Basis = Mittel aus Start und Kontrolle, Posten = Basis − Reihe ohne ihn, Rest, DPR, Drift', () => {
    const rows = [
      row('schwenken', 'alles', 2, { bild: 10, cpu: 4, gpu: 8, gpuRest: 5 }),
      row('schwenken', 'ohne-schatten', 2, { bild: 7, cpu: 3, gpu: 5, gpuRest: 4 }),
      row('schwenken', 'ohne-punkte', 2, { bild: 9, cpu: 4, gpu: 7, gpuRest: 4.5 }),
      row('schwenken', 'ohne-vegetation', 2, { bild: 6, cpu: 3.5, gpu: 4, gpuRest: 2.5 }),
      row('schwenken', 'alles', 1.5, { bild: 8, cpu: 4, gpu: 6, gpuRest: 4 }),
      row('schwenken', 'alles', 2, { bild: 12, cpu: 4, gpu: 10, gpuRest: 5 }, true),
    ];
    const p = Object.fromEntries(computePosten(rows, 2).map((x) => [x.posten, x]));
    expect(p['gesamt (alles)']).toMatchObject({ szene: 'schwenken', gpu: 9, bild: 11, cpu: 4, gpuRest: 5 });
    expect(p['Schattenpässe']).toMatchObject({ gpu: 4, bild: 4, cpu: 1, gpuRest: 1 });
    expect(p['Punkte']).toMatchObject({ gpu: 2, bild: 2 });
    expect(p['Vegetation inkl. Punkte']).toMatchObject({ gpu: 5, bild: 5, cpu: 0.5 });
    expect(p['Vegetation ohne Punkte']).toMatchObject({ gpu: 3, bild: 3 });
    // Rest = Basis − Schatten − Vegetation inkl. Punkte
    expect(p['Rest (Gelände, Himmel, Nebel, Weg, Held …)']).toMatchObject({ gpu: 0, bild: 2, cpu: 2.5 });
    expect(p['DPR 2 → 1,5 (Ersparnis)']).toMatchObject({ gpu: 3, bild: 3 });
    expect(p['Drift (Kontrolle − Start)']).toMatchObject({ gpu: 2, bild: 2, cpu: 0 });
    // Ohne Leerlauf-Reihen keine Leerlauf-Posten; fehlendes Replay bleibt null
    expect(computePosten(rows, 2).every((x) => x.szene === 'schwenken')).toBe(true);
    const noGpu = computePosten([row('leerlauf', 'alles', 2, { bild: 5, cpu: 2, gpu: null, gpuRest: 3 }), row('leerlauf', 'ohne-punkte', 2, { bild: 4, cpu: 2, gpu: 3, gpuRest: 2 })], 2);
    expect(noGpu.find((x) => x.posten === 'Punkte')?.gpu).toBeNull();
  });
});
