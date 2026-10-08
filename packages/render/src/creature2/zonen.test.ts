import { describe, expect, it } from 'vitest';
import { buildCreature, parseBauplan, ZONEN_ARTEN } from '@ee/creature';
import { teilKoordinate } from './CreatureMesh';
import { applyZonen, createZonenUniforms, ZONE_ART_INDEX, ZONE_MUSTER_INDEX } from './material/muster';

describe('Teil-Koordinate für Socken und Schwanzspitze', () => {
  it('Beine laufen von 0 (Hüfte) bis −1 (Sohle), der Schwanz von 0 bis +1 (Spitze), der Rumpf bleibt 0', () => {
    const b = parseBauplan({ maul: { sichtbar: false }, unterkoerper: { typ: 'beine', beine: { anzahl: 4, laenge: 0.9 } }, schwanz: { typ: 'anhang', laenge: 1.2, dicke: 0.4 } });
    const build = buildCreature(b, { resolution: 40 });
    const t = teilKoordinate(build);
    const n = build.positions.length / 3;
    expect(t.length).toBe(n);
    let minT = 0, maxT = 0, sohleMin = 0;
    let tiefsterBoden = Infinity;
    for (let v = 0; v < n; v++) {
      minT = Math.min(minT, t[v]!);
      maxT = Math.max(maxT, t[v]!);
      const y = build.positions[v * 3 + 1]!;
      if (y < tiefsterBoden) {
        tiefsterBoden = y;
        sohleMin = t[v]!;
      }
    }
    expect(minT).toBeCloseTo(-1, 3);
    expect(maxT).toBeCloseTo(1, 3);
    // der tiefste Vertex liegt an einer Sohle
    expect(sohleMin).toBeLessThan(-0.8);
    // Rumpf (hoch oben, in der Mitte) hat 0
    let oben = 0, obenT = 1;
    for (let v = 0; v < n; v++) {
      const y = build.positions[v * 3 + 1]!;
      if (y > oben && Math.abs(build.positions[v * 3]!) < 0.05 * build.bodyScale) {
        oben = y;
        obenT = t[v]!;
      }
    }
    expect(obenT).toBe(0);
  });

  it('ohne Beine und Schwanz überall 0', () => {
    const build = buildCreature(parseBauplan({ maul: { sichtbar: false } }), { resolution: 28 });
    expect(teilKoordinate(build).every((x) => x === 0)).toBe(true);
  });
});

describe('Zonen-Uniforms', () => {
  it('Art und Musterbezug als Index, fehlende Zonen aus', () => {
    const z = createZonenUniforms();
    applyZonen(z, [{ art: 'band', lage: 0.62, breite: 0.16, federung: 0.15, muster: 'nurTon' }]);
    expect(z.form[0]!.value.toArray()).toEqual([ZONE_ART_INDEX.band, 0.62, 0.16, 0.15]);
    expect(z.modus[0]!.value).toBe(ZONE_MUSTER_INDEX.nurTon);
    expect(z.form[1]!.value.x).toBe(0);
    expect(ZONE_ART_INDEX.keine).toBe(0);
    expect(Object.keys(ZONE_ART_INDEX)).toEqual([...ZONEN_ARTEN]);
  });
});
