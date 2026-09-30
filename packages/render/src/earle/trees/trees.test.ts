import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three/webgpu';
import { createBareCard } from './bare';
import { PINE_TIERS, createColumnCrown, createDomeCrown, createPineCrown } from './crowns';
import { FORK_TOP, FORK_Y, LACE_ENVELOPE, LACE_VEIL_LEVEL, createFanTrunk, createForkTrunk, createOakTrunk } from './trunks';

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

describe('Bäume v4: Stämme', () => {
  const trunks = { fork: createForkTrunk(11), fan: createFanTrunk(5).geometry, oak: createOakTrunk(3).geometry };

  it('sind deterministisch je Seed', () => {
    expect(Array.from(positions(createForkTrunk(11)))).toEqual(Array.from(positions(trunks.fork)));
    expect(Array.from(positions(createFanTrunk(5).geometry))).toEqual(Array.from(positions(trunks.fan)));
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
    expect(trunks.fork.getAttribute('position').count).toBeLessThanOrEqual(320);
    expect(trunks.fan.getAttribute('position').count).toBeLessThanOrEqual(1900);
    expect(trunks.oak.getAttribute('position').count).toBeLessThanOrEqual(9000);
  });

  it('Gabel: Schaft bis FORK_Y, alle Äste darüber und unter FORK_TOP, schmale Vase (keine Stäbe)', () => {
    const g = trunks.fork;
    const p = positions(g);
    const bark = g.getAttribute('bark').array as Float32Array;
    let top = 0;
    let spread = 0;
    for (let i = 0; i < p.length / 3; i++) {
      const level = bark[i * 4 + 2]!;
      if (level === 1 || level === 2) {
        expect(p[i * 3 + 1]!).toBeGreaterThan(FORK_Y - 0.12);
        top = Math.max(top, p[i * 3 + 1]!);
        spread = Math.max(spread, Math.hypot(p[i * 3]!, p[i * 3 + 2]!));
      }
    }
    expect(top).toBeLessThanOrEqual(FORK_TOP + 0.02);
    expect(top).toBeGreaterThan(FORK_TOP - 0.2);
    // steil: das Netz bleibt schmal (in Säulen- und Kuppelkronen)
    expect(spread).toBeLessThan(0.42);
  });

  it('Spitzenbaum: Rosetten an Zweigspitzen auf der Schale, jede Spitze am Ende eines Zweigs (nichts schwebt)', () => {
    const fan = createFanTrunk(5);
    expect(fan.tips.length).toBeGreaterThan(40);
    expect(fan.beads.length).toBeGreaterThan(30);
    const E = LACE_ENVELOPE;
    for (const t of fan.tips) {
      // auf der unteren Schale
      const k = Math.hypot(t.p[0] / E.rx, (t.p[1] - E.cy) / E.ry, t.p[2] / E.rx);
      expect(Math.abs(k - 1)).toBeLessThan(0.06);
      expect(t.p[1]).toBeLessThan(E.cy + 0.12);
    }
    // jede Spitze und jede Perle liegt auf dem Skelett (Abstand zur Mittellinie eines Asts oder Zweigs)
    const onPath = (q: readonly number[]): number => {
      let best = Infinity;
      for (const path of fan.paths) {
        for (let i = 0; i + 1 < path.length; i++) {
          const a = path[i]!;
          const b = path[i + 1]!;
          const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
          const aq = [q[0]! - a[0], q[1]! - a[1], q[2]! - a[2]];
          const t = Math.max(0, Math.min(1, (aq[0]! * ab[0]! + aq[1]! * ab[1]! + aq[2]! * ab[2]!) / Math.max(1e-9, ab[0]! ** 2 + ab[1]! ** 2 + ab[2]! ** 2)));
          best = Math.min(best, Math.hypot(aq[0]! - ab[0]! * t, aq[1]! - ab[1]! * t, aq[2]! - ab[2]! * t));
        }
      }
      return best;
    };
    for (const t of [...fan.tips, ...fan.beads]) expect(onPath(t.p)).toBeLessThan(0.01);
    const g = fan.geometry;
    const p = positions(g);
    const bark = g.getAttribute('bark').array as Float32Array;
    // Schleier-Grund: untere Halbscheibe (Ebene 4), die der Shader hinter die Baummitte stellt
    let veil = 0;
    for (let i = 0; i < p.length / 3; i++) {
      if (bark[i * 4 + 2] !== LACE_VEIL_LEVEL) continue;
      veil++;
      expect(p[i * 3 + 1]!).toBeLessThanOrEqual(1e-6);
      expect(Math.hypot(p[i * 3]!, p[i * 3 + 1]!)).toBeLessThanOrEqual(1 + 1e-6);
    }
    expect(veil).toBeGreaterThan(20);
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

describe('Bäume v4: Kronen', () => {
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
    expect(createColumnCrown('hoch').geometry.getAttribute('position').count).toBeLessThanOrEqual(480);
  });

  it('Schlagschatten je Teilkuppel ganz oder gar nicht: untere Kränze nehmen ihn an, Scheitel bleiben frei', () => {
    for (const c of [createDomeCrown('hoch'), createColumnCrown('hoch')]) {
      const cast = c.geometry.getAttribute('crownCast').array as Float32Array;
      const p = positions(c.geometry);
      let lowCast = 0;
      let low = 0;
      let highCast = 0;
      let high = 0;
      let top = -Infinity;
      for (let i = 0; i < cast.length; i++) {
        expect(cast[i] === 0 || cast[i] === 1).toBe(true);
        top = Math.max(top, p[i * 3 + 1]!);
      }
      for (let i = 0; i < cast.length; i++) {
        const y = p[i * 3 + 1]!;
        if (y < 0) {
          low++;
          lowCast += cast[i]!;
        } else if (y > top * 0.6) {
          high++;
          highCast += cast[i]!;
        }
      }
      expect(lowCast / low).toBeGreaterThan(0.7);
      expect(highCast / high).toBeLessThan(0.15);
      expect(c.sampleCast.length).toBe(c.samples.length / 6);
      expect(c.rimCast.length).toBe(c.rims.length / 6);
    }
  });

  it('Bögen: Punkte entlang der oberen Kanten der Teilkuppeln', () => {
    const c = createDomeCrown('hoch');
    expect(c.rims.length / 6).toBeGreaterThan(80);
    for (let i = 0; i < c.rims.length; i += 6) expect(Math.hypot(c.rims[i + 3]!, c.rims[i + 4]!, c.rims[i + 5]!)).toBeCloseTo(1, 4);
  });

  it('Kronenproben sind deterministisch (Punkte ploppen nicht beim Neuaufbau)', () => {
    expect(Array.from(createDomeCrown('hoch').samples)).toEqual(Array.from(createDomeCrown('hoch').samples));
    expect(Array.from(createDomeCrown('hoch').rims)).toEqual(Array.from(createDomeCrown('hoch').rims));
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
});

describe('Bäume v4: kahle Linienbäume', () => {
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
    expect(g.getAttribute('position').count).toBeLessThanOrEqual(1400);
  });

  it('ist deterministisch je Seed, andere Seeds zeichnen andere Bäume', () => {
    expect(Array.from(positions(createBareCard(3)))).toEqual(Array.from(positions(createBareCard(3))));
    expect(Array.from(positions(createBareCard(4)))).not.toEqual(Array.from(positions(createBareCard(3))));
  });
});
