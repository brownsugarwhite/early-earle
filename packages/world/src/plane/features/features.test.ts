import { describe, expect, it } from 'vitest';
import { WorldCatalog } from '../catalog';
import { PlaneField } from '../field';
import { AUTHORED_ROUTE, ROUTE, authoredSpecs, testLayout } from '../testWorlds';
import type { WorldFeatureSpec } from '../types';
import { DEFAULT_LAKE_BAND, DEFAULT_RIVER_BAND, lakeAt, shoreValue } from './lakes';
import type { FeatureSample, Lake, River } from './types';

/**
 * Wasser W7 (Müll v3): Uferband (`FeatureSample.shore`) und Gift (`Lake.toxic`, `River.toxic`, `FeatureSample.toxic`)
 * auf der Ebene. Die Startwelt (Abschnitt 0) bekommt hier eine eigene Merkmalsangabe, damit die Prüfungen nicht am
 * Inhalt der Weltdateien hängen.
 */
function fieldWith(features: WorldFeatureSpec, seed = 7): PlaneField {
  const specs = authoredSpecs();
  const world = AUTHORED_ROUTE[0]!.world;
  specs[world] = { ...specs[world]!, features };
  const catalog = new WorldCatalog(specs, seed, { hinted: ROUTE.beyondWorld });
  return new PlaneField({ seed, layout: testLayout(seed), catalog });
}

const TOXIC: WorldFeatureSpec = {
  lakes: { count: 2, radius: [3.6, 5.2], stretch: 1.5, pathDistance: [3.5, 9], toxic: true, shore: 2.2 },
  rivers: { count: 2, width: [1.4, 2.2], length: [18, 26], meander: 0.55, pathDistance: [2.6, 4], toxic: true, shore: 1.8 },
};

const sample = (): FeatureSample => ({ water: 0, frozen: 0, along: 0, snow: -1 });

describe('Uferband und Giftwasser (Ebene, W7)', () => {
  it('shoreValue: 0 im Wasser und an der Uferlinie, linear bis 1 am Bandrand, ohne Band 1 an Land', () => {
    expect(shoreValue(-0.5, 2)).toBe(0);
    expect(shoreValue(0, 2)).toBe(0);
    expect(shoreValue(1, 2)).toBeCloseTo(0.5, 6);
    expect(shoreValue(2, 2)).toBe(1);
    expect(shoreValue(5, 2)).toBe(1);
    expect(shoreValue(0.3, 0)).toBe(1);
    expect(shoreValue(-0.3, 0)).toBe(0);
  });

  it('Giftflaggen und Bandbreiten werden durchgereicht; jeder Giftfluss endet in einem Giftsee', () => {
    const field = fieldWith(TOXIC);
    const r = field.features.region('p0');
    expect(r.rivers.length).toBe(2);
    expect(r.lakes.length).toBe(2);
    for (const lake of r.lakes) {
      expect(lake.toxic, lake.id).toBe(true);
      expect(lake.band).toBe(2.2);
    }
    for (const river of r.rivers) {
      expect(river.toxic, river.id).toBe(true);
      expect(river.band).toBe(1.8);
      const mouth = r.lakes[river.lake];
      expect(mouth, `${river.id} ohne Mündungssee`).toBeDefined();
      expect(mouth!.toxic, `${river.id} mündet in klares Wasser`).toBe(true);
      const end = river.points[river.points.length - 1]!;
      const hit = { e: 0, theta: 0 };
      expect(lakeAt(mouth!, end[0], end[1], hit)).toBe(true);
      expect(hit.e, `${river.id} endet nicht im See`).toBeLessThan(0.5);
    }
  });

  it('shore: 0 im Wasser, wächst landseits stetig und erreicht 1 am Bandrand; Gift nur im Band', () => {
    const field = fieldWith(TOXIC);
    const key = 'p0';
    const r = field.features.region(key);
    // freier See (kein Fluss mündet hinein) — sonst überlagern sich zwei Bänder
    const fed = new Set(r.rivers.map((v) => v.lake));
    const lake: Lake = r.lakes.find((_, i) => !fed.has(i)) ?? r.lakes[0]!;
    const band = lake.band!;
    const s = sample();
    let checked = 0;
    let ends = 0;
    for (let a = 0; a < 8; a++) {
      const th = (a / 8) * Math.PI * 2;
      let prev = -1;
      let last: [number, number] | null = null;
      for (let d = 0; d <= lake.reach + band + 1; d += 0.25) {
        const x = lake.cx + Math.cos(th) * d;
        const z = lake.cz + Math.sin(th) * d;
        if (field.sample(x, z).region.key !== key) {
          last = null;
          break;
        }
        last = [x, z];
        field.features.sample(key, x, z, 0.3, s);
        const hit = { e: Infinity, theta: 0 };
        if (!lakeAt(lake, x, z, hit, band)) hit.e = Infinity;
        if (hit.e < 0) {
          expect(s.shore, `im Wasser (${x.toFixed(2)}, ${z.toFixed(2)})`).toBe(0);
          expect(s.toxic).toBe(1);
        }
        // Flüsse und andere Seen können das Band nur verkleinern
        if (hit.e >= 0 && hit.e < band) expect(s.shore!).toBeLessThanOrEqual(shoreValue(hit.e, band) + 1e-9);
        if (s.shore! >= 1) expect(s.toxic).toBe(0);
        else expect(s.toxic).toBe(1);
        // stetig: kein Sprung größer als die Schrittweite über die Bandbreite (plus Rundung)
        if (prev >= 0) expect(Math.abs(s.shore! - prev)).toBeLessThan(0.25 / Math.min(band, DEFAULT_RIVER_BAND) + 0.05);
        prev = s.shore!;
        checked++;
      }
      // weit draußen: kein Band mehr (außer ein anderes Gewässer liegt dort)
      if (last && !field.features.isWater(key, last[0], last[1], 2.6)) {
        expect(prev).toBe(1);
        ends++;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(ends).toBeGreaterThanOrEqual(3);
  });

  it('`lakes.toxic` als Zahl vergiftet nur die letzten n Seen; ohne Angaben gelten die Standardbänder', () => {
    const field = fieldWith({ lakes: { count: 2, radius: [1.8, 2.4], stretch: 2, pathDistance: [3, 5], toxic: 1 } });
    const lakes = field.features.region('p0').lakes;
    expect(lakes.length).toBe(2);
    expect(lakes.map((l) => l.toxic === true)).toEqual([false, true]);
    expect(lakes.every((l) => l.band === DEFAULT_LAKE_BAND)).toBe(true);
    const clean = fieldWith({ rivers: { count: 1, width: [1.2, 1.6], length: [14, 18], pathDistance: [2.6, 4] } }).features.region('p0');
    const rivers: River[] = clean.rivers;
    expect(rivers.length).toBe(1);
    expect(rivers[0]!.toxic).toBeUndefined();
    expect(rivers[0]!.band).toBe(DEFAULT_RIVER_BAND);
    expect(clean.lakes.every((l) => !l.toxic)).toBe(true);
  });

  it('Giftufer-Abstand für den Müll: endlich am Giftsee, unendlich an klarem Wasser; deterministisch', () => {
    const toxic = fieldWith(TOXIC);
    const lake = toxic.features.region('p0').lakes[0]!;
    const hit = { e: 0, theta: 0 };
    // ein Punkt knapp außerhalb des Ufers in Richtung der Längsachse
    let x = lake.cx;
    let z = lake.cz;
    for (let d = 0; d < lake.reach + 2; d += 0.1) {
      x = lake.cx + Math.cos(lake.axis) * d;
      z = lake.cz + Math.sin(lake.axis) * d;
      lakeAt(lake, x, z, hit, 3);
      if (hit.e > 1) break;
    }
    const d = toxic.features.toxicShoreDistance('p0', x, z, 1.8);
    expect(d).toBeGreaterThan(0.5);
    expect(d).toBeLessThanOrEqual(1.8);
    const clean = fieldWith({ ...TOXIC, lakes: { ...TOXIC.lakes!, toxic: false }, rivers: { ...TOXIC.rivers!, toxic: false } });
    expect(clean.features.toxicShoreDistance('p0', x, z, 1.8)).toBe(Infinity);
    // erneute Planung: gleiche Seen, gleiche Flaggen
    const again = fieldWith(TOXIC).features.region('p0');
    expect(again.lakes.map((l) => [l.id, l.cx, l.cz, l.toxic, l.band])).toEqual(toxic.features.region('p0').lakes.map((l) => [l.id, l.cx, l.cz, l.toxic, l.band]));
  });
});
