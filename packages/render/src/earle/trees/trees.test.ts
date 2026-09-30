import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three/webgpu';
import { createBareCard } from './bare';
import { LACE_ROSETTES, PINE_TIERS, createColumnCrown, createDomeCrown, createLaceShell, createPineCrown } from './crowns';
import { createFanTrunk, createForkTrunk, createOakTrunk } from './trunks';

function positions(g: BufferGeometry): Float32Array {
  return g.getAttribute('position').array as Float32Array;
}

function minY(g: BufferGeometry): number {
  const p = positions(g);
  let m = Infinity;
  for (let i = 1; i < p.length; i += 3) m = Math.min(m, p[i]!);
  return m;
}

function allFinite(g: BufferGeometry): boolean {
  for (const name of Object.keys(g.attributes)) {
    const a = g.getAttribute(name).array as ArrayLike<number>;
    for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i]!)) return false;
  }
  return true;
}

describe('Bäume v3: Stämme', () => {
  const trunks = { fork: createForkTrunk(11), fan: createFanTrunk(5), oak: createOakTrunk(3).geometry };

  it('sind deterministisch je Seed', () => {
    expect(Array.from(positions(createForkTrunk(11)))).toEqual(Array.from(positions(trunks.fork)));
    expect(Array.from(positions(createOakTrunk(3).geometry))).toEqual(Array.from(positions(trunks.oak)));
    expect(Array.from(positions(createForkTrunk(12)))).not.toEqual(Array.from(positions(trunks.fork)));
  });

  it('sinken mit dem Wurzelanlauf in den Boden (kein Schweben)', () => {
    for (const [name, g] of Object.entries(trunks)) expect(minY(g), name).toBeLessThan(-0.05);
  });

  it('tragen Rindenkoordinaten, Normalen und keine NaN', () => {
    for (const [name, g] of Object.entries(trunks)) {
      expect(g.getAttribute('bark')?.itemSize, name).toBe(4);
      expect(g.getAttribute('normal')?.count, name).toBe(g.getAttribute('position').count);
      expect(allFinite(g), name).toBe(true);
      const idx = g.getIndex()!;
      const n = g.getAttribute('position').count;
      for (let i = 0; i < idx.count; i++) expect(idx.getX(i)).toBeLessThan(n);
    }
  });

  it('bleiben im Vertex-Budget (Instanzen im Haupt- und Schattenpass)', () => {
    for (const [name, g] of Object.entries(trunks)) console.info(`Stamm ${name}: ${g.getAttribute('position').count} Vertices`);
    expect(trunks.fork.getAttribute('position').count).toBeLessThanOrEqual(160);
    expect(trunks.fan.getAttribute('position').count).toBeLessThanOrEqual(420);
    expect(trunks.oak.getAttribute('position').count).toBeLessThanOrEqual(9000);
  });

  it('Eiche: Äste laden weit aus und hängen, Sternbüschel an den Zweigen', () => {
    const oak = createOakTrunk(3);
    expect(oak.spread).toBeGreaterThan(1.2);
    expect(oak.top).toBeGreaterThan(1.3);
    expect(oak.tips.length).toBeGreaterThan(40);
    // Hängende Zweige: ein guter Teil der Büschel liegt unter der Verzweigungshöhe
    const low = oak.tips.filter((t) => t.p[1] < 1).length;
    expect(low).toBeGreaterThan(oak.tips.length * 0.2);
  });
});

describe('Bäume v3: Kronen', () => {
  it('Kuppel-Masse: Hülle ≈ Einheitskugel (abgeflacht), Proben auf der Oberfläche mit Einheitsnormalen', () => {
    for (const detail of ['hoch', 'mobil'] as const) {
      const c = createDomeCrown(detail);
      const p = positions(c.geometry);
      let rMax = 0;
      for (let i = 0; i < p.length; i += 3) rMax = Math.max(rMax, Math.hypot(p[i]!, p[i + 1]! / 0.86, p[i + 2]!));
      expect(rMax).toBeGreaterThan(0.95);
      expect(rMax).toBeLessThan(1.25);
      expect(c.samples.length % 6).toBe(0);
      expect(c.samples.length / 6).toBeGreaterThan(200);
      for (let i = 0; i < c.samples.length; i += 6) {
        expect(Math.hypot(c.samples[i + 3]!, c.samples[i + 4]!, c.samples[i + 5]!)).toBeCloseTo(1, 4);
      }
      expect(allFinite(c.geometry)).toBe(true);
    }
    console.info(`Kuppel hoch ${createDomeCrown('hoch').geometry.getAttribute('position').count}, mobil ${createDomeCrown('mobil').geometry.getAttribute('position').count}, Säule ${createColumnCrown('hoch').geometry.getAttribute('position').count}, Kiefer ${createPineCrown().geometry.getAttribute('position').count}, Karte ${createBareCard(3).getAttribute('position').count}`);
    expect(createDomeCrown('mobil').geometry.getAttribute('position').count).toBeLessThanOrEqual(320);
    expect(createDomeCrown('hoch').geometry.getAttribute('position').count).toBeLessThanOrEqual(480);
  });

  it('Kronenproben sind deterministisch (Punkte ploppen nicht beim Neuaufbau)', () => {
    expect(Array.from(createDomeCrown('hoch').samples)).toEqual(Array.from(createDomeCrown('hoch').samples));
    expect(Array.from(createColumnCrown('mobil').samples)).toEqual(Array.from(createColumnCrown('mobil').samples));
  });

  it('Stufenkiefer: Sägezahn-Stufen, Spitze oben, Schneepunkte an den Stufenkanten', () => {
    const c = createPineCrown();
    const p = positions(c.geometry);
    let top = 0;
    for (let i = 1; i < p.length; i += 3) top = Math.max(top, p[i]!);
    expect(top).toBeCloseTo(1, 5);
    expect(minY(c.geometry)).toBeLessThan(0);
    expect(c.samples.length / 6).toBeGreaterThan(PINE_TIERS.length * 8);
  });

  it('Spitzenschleier: Rosetten aus sieben Punkten auf der unteren Schale', () => {
    const shell = createLaceShell();
    expect(shell.length).toBe(LACE_ROSETTES * 7 * 6);
    for (let i = 0; i < shell.length; i += 6) {
      expect(shell[i + 1]!).toBeLessThan(0.3);
      expect(Math.hypot(shell[i]!, shell[i + 1]!, shell[i + 2]!)).toBeLessThan(1.05);
    }
  });
});

describe('Bäume v3: kahle Linienbäume', () => {
  it('Karte in der XY-Ebene, Fuß unter dem Boden, Krone in der Hülle', () => {
    const g = createBareCard(3);
    const p = positions(g);
    let maxY = 0;
    let maxX = 0;
    for (let i = 0; i < p.length; i += 3) {
      expect(p[i + 2]).toBe(0);
      maxY = Math.max(maxY, p[i + 1]!);
      maxX = Math.max(maxX, Math.abs(p[i]!));
    }
    expect(minY(g)).toBeLessThan(0);
    expect(maxY).toBeGreaterThan(2.4);
    expect(maxY).toBeLessThan(3.4);
    expect(maxX).toBeLessThan(1.5);
    expect(g.getAttribute('position').count).toBeLessThanOrEqual(1000);
  });

  it('ist deterministisch je Seed, andere Seeds zeichnen andere Bäume', () => {
    expect(Array.from(positions(createBareCard(3)))).toEqual(Array.from(positions(createBareCard(3))));
    expect(Array.from(positions(createBareCard(4)))).not.toEqual(Array.from(positions(createBareCard(3))));
  });
});
