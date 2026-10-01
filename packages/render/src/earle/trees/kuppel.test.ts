import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three/webgpu';
import { SPRAWL_FORK, createKuppelCrown, createSprawlTrunk } from './kuppel';
import { CROWN_EDGE_PACK } from './cushionEdge';

function positions(g: BufferGeometry): Float32Array {
  return g.getAttribute('position').array as Float32Array;
}

function allFinite(g: BufferGeometry): boolean {
  for (const name of Object.keys(g.attributes)) {
    const a = g.getAttribute(name).array as ArrayLike<number>;
    for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i]!)) return false;
  }
  return true;
}

describe('Kuppelbaum (Ebene 33): Kissenkrone', () => {
  it('breit und niedrig: etwa doppelt so breit wie hoch, Unterseite flach unter der Mitte', () => {
    for (const detail of ['hoch', 'mobil'] as const) {
      const c = createKuppelCrown(detail);
      const p = positions(c.geometry);
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (let i = 0; i < p.length; i += 3) {
        x0 = Math.min(x0, p[i]!);
        x1 = Math.max(x1, p[i]!);
        y0 = Math.min(y0, p[i + 1]!);
        y1 = Math.max(y1, p[i + 1]!);
      }
      const width = x1 - x0;
      const height = y1 - y0;
      console.info(`Kissenkrone ${detail}: ${c.geometry.getAttribute('position').count} Vertices, Breite ${width.toFixed(2)}, Höhe ${height.toFixed(2)}, unten ${y0.toFixed(2)}, oben ${y1.toFixed(2)}, Proben ${c.samples.length / 6}, Bögen ${c.rims.length / 6}`);
      expect(width / height).toBeGreaterThan(1.7);
      expect(width).toBeGreaterThan(1.9);
      expect(width).toBeLessThan(2.6);
      expect(y0).toBeLessThan(-0.3);
      expect(y1).toBeGreaterThan(0.45);
      expect(allFinite(c.geometry)).toBe(true);
      expect(c.geometry.getAttribute('position').count).toBeLessThanOrEqual(detail === 'hoch' ? 2100 : 1000);
    }
  });

  it('Kantenwert je Vertex (im Bruchteil von crownCast): 0 im Kern, hoch an den Oberkanten der Kissen', () => {
    const c = createKuppelCrown('hoch');
    // höchstens acht Vertex-Puffer je Pipeline (WebGPU): kein eigenes Attribut für die Kante
    expect(Object.keys(c.geometry.attributes).sort()).toEqual(['crownCast', 'normal', 'position']);
    const packed = c.geometry.getAttribute('crownCast').array as Float32Array;
    const rim = Array.from(packed, (v) => (v - Math.floor(v)) / CROWN_EDGE_PACK);
    expect(rim.length).toBe(c.geometry.getAttribute('position').count);
    let high = 0;
    for (let i = 0; i < rim.length; i++) {
      expect(rim[i]!).toBeGreaterThanOrEqual(0);
      expect(rim[i]!).toBeLessThanOrEqual(1 + 1e-5);
      if (rim[i]! > 0.6) high++;
    }
    // ein guter Teil der Kissen-Vertices liegt an einer Oberkante (Tupfenbögen), der Rest ist dunkles Kisseninneres
    expect(high / rim.length).toBeGreaterThan(0.15);
    expect(high / rim.length).toBeLessThan(0.6);
  });

  it('Bögen: viele Punkte an den Oberkanten, Einheitsnormalen, deterministisch', () => {
    const c = createKuppelCrown('hoch');
    expect(c.rims.length / 6).toBeGreaterThan(400);
    for (let i = 0; i < c.rims.length; i += 6) expect(Math.hypot(c.rims[i + 3]!, c.rims[i + 4]!, c.rims[i + 5]!)).toBeCloseTo(1, 4);
    expect(c.rimCast.length).toBe(c.rims.length / 6);
    expect(c.sampleCast.length).toBe(c.samples.length / 6);
    expect(Array.from(createKuppelCrown('hoch').rims)).toEqual(Array.from(c.rims));
    // Die Bögen sitzen überwiegend oben auf den Kissen (Normale nach oben)
    let upward = 0;
    for (let i = 0; i < c.rims.length; i += 6) if (c.rims[i + 4]! > 0.2) upward++;
    expect(upward / (c.rims.length / 6)).toBeGreaterThan(0.6);
  });

  it('Schlagschatten je Kissen ganz oder gar nicht: der Randkranz nimmt ihn an, der Scheitel nicht', () => {
    const c = createKuppelCrown('hoch');
    // Schlagschatten = ganzzahliger Teil (der Shader liest step(0.5, …)), der Bruchteil trägt die Kante
    const cast = Array.from(c.geometry.getAttribute('crownCast').array as Float32Array, (v) => (v >= 0.5 ? 1 : 0));
    const p = positions(c.geometry);
    let top = -Infinity;
    for (let i = 0; i < cast.length; i++) top = Math.max(top, p[i * 3 + 1]!);
    let high = 0;
    let highCast = 0;
    for (let i = 0; i < cast.length; i++) {
      if (p[i * 3 + 1]! > top * 0.7) {
        high++;
        highCast += cast[i]!;
      }
    }
    expect(highCast / high).toBeLessThan(0.15);
  });
});

describe('Kuppelbaum (Ebene 33): Ausleger-Stamm', () => {
  const s = createSprawlTrunk(9);

  it('ist deterministisch je Seed und sinkt mit den Wurzeln in den Boden', () => {
    expect(Array.from(positions(createSprawlTrunk(9).geometry))).toEqual(Array.from(positions(s.geometry)));
    expect(Array.from(positions(createSprawlTrunk(10).geometry))).not.toEqual(Array.from(positions(s.geometry)));
    const p = positions(s.geometry);
    let minY = Infinity;
    for (let i = 1; i < p.length; i += 3) minY = Math.min(minY, p[i]!);
    expect(minY).toBeLessThan(-0.05);
    expect(allFinite(s.geometry)).toBe(true);
  });

  it('Äste greifen fast waagrecht weit hinaus und bleiben unter der Kissenkrone', () => {
    // Krone: Hüllzentrum 0.86 r über dem Fuß, Unterseite ≈ 0.38–0.54 r
    expect(s.spread).toBeGreaterThan(1.0);
    expect(s.top).toBeLessThan(0.62);
    const bark = s.geometry.getAttribute('bark').array as Float32Array;
    const p = positions(s.geometry);
    let far = 0;
    let farLow = 0;
    for (let i = 0; i < p.length / 3; i++) {
      if (bark[i * 4 + 2] !== 1) continue;
      const rho = Math.hypot(p[i * 3]!, p[i * 3 + 2]!);
      if (rho > 0.5) {
        far++;
        if (p[i * 3 + 1]! < SPRAWL_FORK + 0.3) farLow++;
      }
    }
    // Weit draußen liegen die Hauptäste flach (höchstens 0.3 r über der Gabel)
    expect(far).toBeGreaterThan(50);
    expect(farLow / far).toBeGreaterThan(0.9);
    console.info(`Ausleger-Stamm: ${s.geometry.getAttribute('position').count} Vertices, Ausladung ${s.spread.toFixed(2)}, oben ${s.top.toFixed(2)}`);
    expect(s.geometry.getAttribute('position').count).toBeLessThanOrEqual(1400);
  });
});
