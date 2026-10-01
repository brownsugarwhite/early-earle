import { describe, expect, it } from 'vitest';
import {
  CURVE_LAST_LEVEL,
  LEGACY_LAST_LEVEL,
  NEW_ELEMENTS,
  ZONE_LENGTHS,
  ZONE_RANGES,
  curveBand,
  curveSpec,
  curveSpecs,
  spikeLevels,
  zoneCap,
  zoneOfLevel,
  zoneRamp,
} from './curve';
import { generateLevel } from './generateLevel';
import { LAST_LEVEL, levelSpec, zoneSetOf } from './index';
import { CURVE_LIMITS, validateCurve, type CurveLevelInfo } from './validate';

function levelInfos(): CurveLevelInfo[] {
  return Array.from({ length: LAST_LEVEL }, (_, k) => {
    const index = k + 1;
    const spec = levelSpec(index);
    const info: CurveLevelInfo = {
      index,
      level: generateLevel(spec),
      fixed: spec.board !== undefined,
    };
    if (index > LEGACY_LAST_LEVEL) info.zoneSet = zoneSetOf(index);
    return info;
  });
}

describe('Schwierigkeitskurve (curveSpec)', () => {
  it('teilt 184 Level in 15 Kartenzonen (14, 12 × 7, 16, 10, 12 × 5)', () => {
    expect(ZONE_LENGTHS).toEqual([14, 12, 12, 12, 12, 12, 12, 12, 16, 10, 12, 12, 12, 12, 12]);
    expect(CURVE_LAST_LEVEL).toBe(184);
    expect(LAST_LEVEL).toBe(184);
    expect(ZONE_RANGES.map(([a]) => a)).toEqual([
      1, 15, 27, 39, 51, 63, 75, 87, 99, 115, 125, 137, 149, 161, 173,
    ]);
    expect(zoneOfLevel(114)).toEqual({ zoneIndex: 9, positionInZone: 16, zoneLength: 16 });
    expect(zoneOfLevel(115)).toEqual({ zoneIndex: 10, positionInZone: 1, zoneLength: 10 });
    expect(() => curveSpec(185)).toThrow();
    expect(() => curveSpec(0)).toThrow();
  });

  it('folgt der Zonenschablone 12 (Lehren · Üben · Normal · Spaß · Hart · Atempause · Kombi · Normal · Hart · Spaß · Normal · Boss)', () => {
    const z = (zone: number) =>
      curveSpecs()
        .filter((c) => c.zoneIndex === zone)
        .map((c) => c.type);
    expect(z(5)).toEqual([
      'intro',
      'practice',
      'normal',
      'fun',
      'hard',
      'intro',
      'combine',
      'normal',
      'hard',
      'fun',
      'normal',
      'boss',
    ]);
    expect(z(11)).toEqual([
      'fun',
      'practice',
      'normal',
      'fun',
      'hard',
      'normal',
      'combine',
      'normal',
      'hard',
      'fun',
      'normal',
      'boss',
    ]);
    // Riesenbaum (16): Superhart auf Knoten 13, Boss vor dem Aufzug.
    expect(z(9).slice(11)).toEqual(['normal', 'superhard', 'fun', 'combine', 'boss']);
    expect(curveSpec(111).type).toBe('superhard');
    expect(curveSpec(111).landmark).toContain('Riesenbaum');
    // Kuppelbaum (10): zwei Spitzen.
    expect(z(10)).toEqual([
      'fun',
      'practice',
      'normal',
      'hard',
      'normal',
      'combine',
      'normal',
      'fun',
      'normal',
      'boss',
    ]);
    for (const c of curveSpecs().filter((x) => !x.legacy && x.type === 'boss'))
      expect(c.positionInZone, `Boss ${c.index}`).toBe(c.zoneLength);
    expect(curveSpec(160).landmark).toContain('Monolith');
    expect(curveSpec(184).landmark).toContain('Klippe');
  });

  it('rampt die Bänder global und deckelt sie (hi ≤ 5, bis Zone 10 ≤ 4,5; Zonenstart ≤ 1,2; Atempause ≤ 1,35)', () => {
    expect(zoneRamp(1)).toBe(1);
    expect(zoneRamp(15)).toBeCloseTo(1.63, 10);
    expect(zoneCap(10)).toBe(4.5);
    expect(zoneCap(11)).toBe(5);
    expect(curveSpec(55).targetAttempts).toEqual([1.94, 3.24]);
    expect(curveSpec(177).targetAttempts).toEqual([2.3, 4.1]);
    expect(curveSpec(184).targetAttempts).toEqual([3.45, 5]);
    for (const c of curveSpecs()) {
      if (c.legacy) continue;
      const [lo, hi] = c.targetAttempts;
      expect(lo, `${c.index}`).toBeLessThan(hi);
      expect(hi, `${c.index}`).toBeLessThanOrEqual(zoneCap(c.zoneIndex));
      expect(1 / lo - 1 / hi, `${c.index} pWin-Breite`).toBeGreaterThanOrEqual(0.08 - 0.005);
      if (c.positionInZone === 1) expect(hi, `${c.index}`).toBeLessThanOrEqual(1.2);
      if (c.breather) expect(hi, `${c.index}`).toBeLessThanOrEqual(1.35);
    }
    // Zugfaktor: Rampe bis × 0,8 in Zone 15, harte Level kürzer als normale.
    expect(curveSpec(173).moveBudgetFactor).toBeLessThan(curveSpec(63).moveBudgetFactor);
    expect(curveSpec(177).moveBudgetFactor).toBeLessThan(curveSpec(175).moveBudgetFactor);
    // Entwürfe hinter der Kurve bekommen das Band ihres Typs in Zone 15.
    expect(curveBand('hard', 15)).toEqual(curveSpec(177).targetAttempts);
  });

  it('führt neue Elementarten nur in den Zonen 5–8 ein (zwei je Zone, Position 1 und die Atempause 6)', () => {
    const intros = curveSpecs().filter((c) => !c.legacy && c.newElement);
    expect(intros.map((c) => [c.index, c.newElement])).toEqual([
      [51, 'sleeper'],
      [56, 'rot'],
      [63, 'toxic'],
      [68, 'scrapMound'],
      [75, 'portal'],
      [80, 'fog'],
      [87, 'current'],
      [92, 'stray'],
    ]);
    for (const c of intros) {
      expect(c.zoneIndex).toBeLessThanOrEqual(8);
      expect(NEW_ELEMENTS[c.zoneIndex]).toContain(c.newElement);
    }
  });

  it('beschreibt Level 1–50 rückwirkend mit ihren alten Bändern', () => {
    expect(curveSpec(13).type).toBe('hard');
    expect(curveSpec(13).targetAttempts).toEqual([1.6, 2]);
    expect(curveSpec(14).type).toBe('intro');
    expect(curveSpec(3).type).toBe('tutorial');
    expect(curveSpec(50).legacy).toBe(true);
    expect(curveSpec(51).legacy).toBe(false);
  });

  it('liefert die Spitzen für die Karte', () => {
    expect(spikeLevels()).toEqual([
      13, 19, 25, 28, 36, 39, 45, 49, 55, 59, 62, 67, 71, 74, 79, 83, 86, 91, 95, 98, 103, 107, 111,
      114, 118, 124, 129, 133, 136, 141, 145, 148, 153, 157, 160, 165, 169, 172, 177, 181, 184,
    ]);
  });

  it('besteht die Kurven-Checks 1–6, 11–13 ohne Fehler (1–50 nur Warnungen)', () => {
    const report = validateCurve(curveSpecs(), null, levelInfos());
    for (const w of report.warnings) console.log(`warn [${w.check}] ${w.message}`);
    expect(report.errors.map((e) => `[${e.check}] ${e.message}`)).toEqual([]);
    // Die Warnungen betreffen nur eingefrorene Level (1–50) oder Einführungen mit Werkzeug.
    for (const w of report.warnings)
      if (w.check !== '12' && w.check !== '10' && w.check !== '8')
        expect(w.index ?? w.zone ?? 0).toBeLessThanOrEqual(LEGACY_LAST_LEVEL);
    expect(CURVE_LIMITS.spikeDistance).toBe(3);
  });

  it('meldet Verstöße (Prüfung der Prüfung)', () => {
    const specs = curveSpecs().map((c) => ({
      ...c,
      targetAttempts: [...c.targetAttempts] as [number, number],
    }));
    // zwei Spitzen nebeneinander, Atempause zu schwer, Boss nicht am Ende
    specs[55] = { ...specs[55]!, type: 'hard', spike: true };
    specs[55]!.targetAttempts = [2, 3];
    const report = validateCurve(specs, null, null);
    const checks = new Set(report.errors.map((e) => e.check));
    expect(checks.has('1')).toBe(true);
    expect(checks.has('2')).toBe(true);
    expect(checks.has('6')).toBe(true);
  });
});
