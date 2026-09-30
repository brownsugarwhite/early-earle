import { describe, expect, it } from 'vitest';
import { composeGroveTree, groundSink, groveMask, pickTreeKind, type GroveFieldLike, type GroveSpec } from './scatterTrees';
import { PlanetField, chunkList, scatterChunkTrees, type PlanetParams, type PlanetVegetationFamily } from './planet';

// Bäume v3: Earle-Komposition (Haine an Höhenlinien, Wiesen, Solitäre, freie Felswände)

/** Analytisches Feld: Höhe aus Sinuswellen, flach (Normale = Richtung) außer der "Felswand" z > 0.8. */
const fakeField: GroveFieldLike = {
  params: { radius: 32, seed: 7 },
  heightNormAt: (x, _y, z) => 0.5 + 0.5 * Math.sin(x * 9) * Math.cos(z * 7),
  surfaceAt: (dx, dy, dz, pos, nor) => {
    pos[0] = dx * 32;
    pos[1] = dy * 32;
    pos[2] = dz * 32;
    if (dz > 0.8) {
      // Wand: Normale fast tangential (0.2·Radial + Tangente d × y)
      const tx = -dz;
      const tz = dx;
      const l = Math.hypot(tx, tz) || 1;
      const nx = 0.2 * dx + tx / l;
      const ny = 0.2 * dy;
      const nz = 0.2 * dz + tz / l;
      const nl = Math.hypot(nx, ny, nz);
      nor[0] = nx / nl;
      nor[1] = ny / nl;
      nor[2] = nz / nl;
    } else {
      nor[0] = dx;
      nor[1] = dy;
      nor[2] = dz;
    }
    return 0;
  },
};

function fibDir(i: number, n: number): [number, number, number] {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(1 - y * y);
  const phi = i * Math.PI * (3 - Math.sqrt(5));
  return [r * Math.cos(phi), y, r * Math.sin(phi)];
}

const fam = (grove: GroveSpec): PlanetVegetationFamily => ({ density: 1, clumpiness: 0, kinds: { dome: 1 }, scale: [0.8, 1.4], grove }) as PlanetVegetationFamily;

function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('Earle-Komposition (grove)', () => {
  it('groveMask ist deterministisch und trifft den Flächenanteil `cover` grob', () => {
    for (const cover of [0.15, 0.35, 0.6]) {
      let inside = 0;
      const n = 4000;
      for (let i = 0; i < n; i++) {
        const d = fibDir(i, n);
        const m = groveMask(fakeField, d, { cover, wavelength: 8 });
        expect(m).toBe(groveMask(fakeField, d, { cover, wavelength: 8 }));
        if (m >= 0.5) inside++;
      }
      expect(inside / n).toBeGreaterThan(cover - 0.12);
      expect(inside / n).toBeLessThan(cover + 0.12);
    }
  });

  it('Höhenlinien ziehen Haine an sich; `invert` tauscht Hain und Wiese', () => {
    const n = 4000;
    let onLine = 0;
    let onLineTotal = 0;
    for (let i = 0; i < n; i++) {
      const d = fibDir(i, n);
      const h = fakeField.heightNormAt(d[0], d[1], d[2]);
      const spec: GroveSpec = { cover: 0, contours: [0.5], contourWidth: 0.1 };
      const m = groveMask(fakeField, d, spec);
      if (Math.abs(h - 0.5) < 0.02) {
        onLineTotal++;
        if (m >= 0.5) onLine++;
      }
      expect(groveMask(fakeField, d, { ...spec, invert: true })).toBeCloseTo(Math.min(1, Math.max(0, 1 - m)), 6);
    }
    expect(onLineTotal).toBeGreaterThan(20);
    expect(onLine / onLineTotal).toBeGreaterThan(0.8);
  });

  it('composeGroveTree: ohne `grove` unverändert; mit `grove` Haine voll, Wiesen fast leer, Solitäre groß', () => {
    const plain: PlanetVegetationFamily = { density: 1, clumpiness: 0, kinds: { dome: 1 }, scale: [0.8, 1.4] };
    expect(composeGroveTree(fakeField, [0, 1, 0], plain, 'dome', 1.1, () => 0.5)).toEqual({ kind: 'dome', scale: 1.1 });
    const spec: GroveSpec = { cover: 0.35, wavelength: 8, fill: 0.9, specimens: 0.05, specimenKinds: { umbrella: 1 }, specimenScale: [1.5, 2] };
    const rand = lcg(1);
    let grove = 0;
    let groveHit = 0;
    let meadow = 0;
    let meadowHit = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) {
      const d = fibDir(i, n);
      if (d[2] > 0.8) continue;
      const m = groveMask(fakeField, d, spec);
      const r = composeGroveTree(fakeField, d, fam(spec), 'dome', 1, rand);
      if (m > 0.6) {
        grove++;
        if (r) groveHit++;
      } else if (m < 0.3) {
        meadow++;
        if (r) {
          meadowHit++;
          expect(r.kind).toBe('umbrella');
          expect(r.scale).toBeGreaterThanOrEqual(1.5);
        }
      }
    }
    expect(grove).toBeGreaterThan(100);
    expect(meadow).toBeGreaterThan(100);
    expect(groveHit / grove).toBeGreaterThan(0.8);
    expect(meadowHit / meadow).toBeLessThan(0.1);
    expect(meadowHit).toBeGreaterThan(0);
  });

  it('Steilhänge (Felswände) bleiben frei', () => {
    const spec: GroveSpec = { cover: 1, fill: 1, maxSlope: 0.35 };
    const l = Math.hypot(0.1, 0.3, 0.95);
    const d: [number, number, number] = [0.1 / l, 0.3 / l, 0.95 / l];
    for (let i = 0; i < 50; i++) expect(composeGroveTree(fakeField, d, fam(spec), 'dome', 1, () => i / 50)).toBeNull();
  });

  it('pickTreeKind folgt den Gewichten und ignoriert Nullgewichte', () => {
    expect(pickTreeKind({ dome: 0, pine: 1 }, 0.01)).toBe('pine');
    expect(pickTreeKind({ dome: 1, pine: 1 }, 0.25)).toBe('dome');
    expect(pickTreeKind({ dome: 1, pine: 1 }, 0.75)).toBe('pine');
  });

  it('Planet: Chunk-Streuung mit Komposition ist deterministisch, Bäume stehen auf der Oberfläche', () => {
    const veg: PlanetVegetationFamily = { density: 0.8, clumpiness: 0, kinds: { dome: 0.7, umbrella: 0.3 }, scale: [0.8, 1.4], grove: { cover: 0.3, contours: [0.5] } } as PlanetVegetationFamily;
    const params: PlanetParams = { radius: 32, seed: 7, chunksPerFace: 3, zones: [{ id: 'a', hillAmplitude: 2, vegetation: veg }] };
    const field = new PlanetField(params);
    let total = 0;
    for (const id of chunkList(3).slice(0, 12)) {
      const a = scatterChunkTrees(field, id, { densityScale: 1 });
      const b = scatterChunkTrees(field, id, { densityScale: 1 });
      expect(a).toEqual(b);
      for (const t of a) {
        const r = Math.hypot(...t.position);
        expect(r).toBeGreaterThanOrEqual(32 - 1e-4);
        expect(r).toBeLessThanOrEqual(32 + 2 + 1e-4);
        expect(['dome', 'umbrella']).toContain(t.kind);
      }
      total += a.length;
    }
    expect(total).toBeGreaterThan(50);
  });
});

describe('Bodenhaftung (groundSink)', () => {
  const base = { params: { radius: 32, seed: 1 }, heightNormAt: () => 0, surfaceAt: () => 0 };
  const d: [number, number, number] = [0, 1, 0];

  it('Kuppe: der Baum sinkt bis zur Netz-Sehne', () => {
    const crest = { ...base, heightAt: (dx: number) => 3 * (1 - Math.abs(dx) * 20) };
    expect(groundSink(crest, d, 0.8)).toBeGreaterThan(0.2);
    expect(groundSink(crest, d, 0.8)).toBeLessThanOrEqual(1.5);
  });

  it('Ebene und Mulde: kein Absenken; ohne Höhenfunktion 0', () => {
    expect(groundSink({ ...base, heightAt: () => 1 }, d, 0.8)).toBeCloseTo(0, 6);
    expect(groundSink({ ...base, heightAt: (dx: number) => Math.abs(dx) * 20 }, d, 0.8)).toBe(0);
    expect(groundSink(base, d, 0.8)).toBe(0);
  });
});
