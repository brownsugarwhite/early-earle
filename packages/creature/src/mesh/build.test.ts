import { describe, expect, it } from 'vitest';
import { BAUPLAN_REGLER, defaultBauplan, parseBauplan, setAt } from '../bauplan/schema';
import { shapeHash, styleHash } from '../bauplan/hash';
import { evalScene } from '../sdf/scene';
import { construct } from '../sdf/build';
import { buildCreature } from './build';

describe('Bauplan', () => {
  it('füllt alle Vorgaben und kennt jeden Regler', () => {
    const b = defaultBauplan();
    expect(b.schemaVersion).toBe(1);
    expect(b.koerper.querschnitte).toHaveLength(5);
    expect(BAUPLAN_REGLER.length).toBeGreaterThan(40);
    for (const r of BAUPLAN_REGLER) {
      const v = r.pfad.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], b) as number;
      expect(typeof v, r.pfad).toBe('number');
      expect(v).toBeGreaterThanOrEqual(r.min);
      expect(v).toBeLessThanOrEqual(r.max);
    }
  });
  it('trennt Form- und Stil-Hash', () => {
    const a = defaultBauplan();
    const b = setAt(a, 'muster.farben.grund', '#ff0000');
    const c = setAt(a, 'maul.hoehe', 0.8);
    expect(shapeHash(a, 48)).toBe(shapeHash(b, 48));
    expect(styleHash(a)).not.toBe(styleHash(b));
    expect(shapeHash(a, 48)).not.toBe(shapeHash(c, 48));
  });
  it('weist ungültige Werte ab', () => {
    expect(() => parseBauplan({ maul: { hoehe: 3 } })).toThrow();
  });
});

describe('Konstruktion', () => {
  it('baut Skelett, Maul und Augen des Grundblobs', () => {
    const c = construct(defaultBauplan());
    expect(c.bones.map((b) => b.name)).toContain('unterkiefer');
    expect(c.mouth).not.toBeNull();
    expect(c.eyes).toHaveLength(2);
    // Maulzentrum liegt vorn auf der Fläche (SDF ≈ 0 ohne die Höhle), Mundwinkel seitlich
    const m = c.mouth!;
    expect(m.center[2]).toBeGreaterThan(0.2);
    expect(m.corners[0][0]).toBeLessThan(-0.1);
    expect(m.corners[1][0]).toBeGreaterThan(0.1);
    expect(m.teeth.length).toBeGreaterThan(4);
    // Zähne oben und unten, keine Durchdringung im Bauzustand (Abstand ≥ 60 % der Größe)
    const up = m.teeth.filter((t) => t.upper), lo = m.teeth.filter((t) => !t.upper);
    expect(up.length).toBeGreaterThan(1);
    expect(lo.length).toBeGreaterThan(1);
    for (const a of up) for (const b of lo) expect(Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2])).toBeGreaterThan(0.6 * Math.min(a.size, b.size));
  });
  it('setzt das Maul stufenlos in der Höhe', () => {
    const lo = construct(setAt(defaultBauplan(), 'maul.hoehe', 0.15)).mouth!;
    const hi = construct(setAt(defaultBauplan(), 'maul.hoehe', 0.85)).mouth!;
    expect(hi.center[1]).toBeGreaterThan(lo.center[1] + 0.4);
  });
  it('ohne Unterkiefer liegt die Öffnung tiefer als mit', () => {
    const mit = construct(defaultBauplan());
    const ohne = construct(setAt(defaultBauplan(), 'maul.unterkiefer', 0));
    // unterhalb der Lippe, vorn: ohne Unterkiefer ist dort Luft (SDF > 0)
    const p = mit.mouth!.center;
    const probe = [p[0], p[1] - 0.12, p[2] - 0.05] as [number, number, number];
    expect(evalScene(ohne.scene, probe)).toBeGreaterThan(evalScene(mit.scene, probe));
  });
});

describe('Mesh', () => {
  it('erzeugt eine geschlossene Fläche mit normierten Gewichten und Rachen-Region', () => {
    const r = buildCreature(defaultBauplan(), { resolution: 28 });
    expect(r.stats.vertexCount).toBeGreaterThan(300);
    expect(r.stats.nonManifold).toBeLessThanOrEqual(6);
    const d = r.descriptors;
    for (let v = 0; v < r.stats.vertexCount; v += 7) {
      let s = 0;
      for (let q = 0; q < 4; q++) s += d.skinWeight[v * 4 + q]!;
      expect(Math.abs(s - 1)).toBeLessThan(1e-4);
    }
    let rachen = 0, jaw = 0;
    for (let v = 0; v < r.stats.vertexCount; v++) {
      if (d.region[v * 4]! > 0.5) rachen++;
      for (let q = 0; q < 4; q++) if (d.skinIndex[v * 4 + q] === r.jawBone && d.skinWeight[v * 4 + q]! > 0.5) jaw++;
    }
    expect(rachen).toBeGreaterThan(10);
    expect(jaw).toBeGreaterThan(10);
    // Normalen zeigen nach außen (SDF steigt entlang der Normale)
    let outward = 0;
    for (let v = 0; v < r.stats.vertexCount; v += 11) {
      const p: [number, number, number] = [r.positions[v * 3]!, r.positions[v * 3 + 1]!, r.positions[v * 3 + 2]!];
      const q: [number, number, number] = [p[0] + r.normals[v * 3]! * 0.02, p[1] + r.normals[v * 3 + 1]! * 0.02, p[2] + r.normals[v * 3 + 2]! * 0.02];
      const c = construct(defaultBauplan());
      if (evalScene(c.scene, q) > evalScene(c.scene, p)) outward++;
    }
    expect(outward).toBeGreaterThan(Math.floor(r.stats.vertexCount / 11) * 0.9);
  });
  it('Narrow-Band ändert die Fläche nicht (Buckel, Neigung, breite Standfläche)', () => {
    const b = parseBauplan({ koerper: { hoehe: 1.5, bauch: 0.9, buckel: 0.8, neigung: 0.8, boden: 0.9 }, maul: { sichtbar: false } });
    const band = buildCreature(b, { resolution: 36 });
    const exakt = buildCreature(b, { resolution: 36, narrowBand: false });
    expect(Math.abs(band.stats.vertexCount - exakt.stats.vertexCount)).toBeLessThan(exakt.stats.vertexCount * 0.03);
    expect(band.stats.nonManifold).toBeLessThanOrEqual(6);
    // Hüllquader der Vertices stimmen überein (keine Ausreißer durch falsch interpolierte Blöcke)
    const bb = (p: Float32Array): number[] => { let my = -Infinity; for (let i = 1; i < p.length; i += 3) my = Math.max(my, p[i]!); return [my]; };
    expect(Math.abs(bb(band.positions)[0]! - bb(exakt.positions)[0]!)).toBeLessThan(0.05);
  });
  it('ist deterministisch', () => {
    const a = buildCreature(defaultBauplan(), { resolution: 20 });
    const b = buildCreature(defaultBauplan(), { resolution: 20 });
    expect(a.positions).toEqual(b.positions);
    expect(a.shapeHash).toBe(b.shapeHash);
  });
  it('baut Hals, Schlange und Beine ohne Splitter', () => {
    const giraffe = buildCreature(parseBauplan({ hals: { laenge: 1.2 }, kopf: { groesse: 0.6 }, unterkoerper: { typ: 'beine', beine: { anzahl: 4, laenge: 0.8 } }, schwanz: { typ: 'anhang' } }), { resolution: 28 });
    expect(giraffe.stats.nonManifold).toBeLessThanOrEqual(6);
    expect(giraffe.bones.some((b) => b.name === 'kopf')).toBe(true);
    expect(giraffe.bones.filter((b) => b.name.startsWith('bein')).length).toBe(12);
    const schlange = buildCreature(parseBauplan({ unterkoerper: { typ: 'schlange' }, maul: { form: 0.2 } }), { resolution: 28 });
    expect(schlange.stats.nonManifold).toBeLessThanOrEqual(6);
    expect(schlange.bones.filter((b) => b.name.startsWith('schlange')).length).toBe(8);
  });
});
