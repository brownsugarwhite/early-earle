import { describe, expect, it } from 'vitest';
import { parseBauplan } from '../bauplan/schema';
import { construct } from './build';
import { evalScene, sceneGradient } from './scene';
import { buildCreature } from '../mesh/build';

describe('Würfeliger Körper', () => {
  it('legt alle Vertices auf die Fläche (stetiges Feld am Deckelrand)', () => {
    const b = parseBauplan({ koerper: { kubik: 1 }, maul: { sichtbar: false } });
    const c = construct(b);
    for (const smooth of [0, 6]) {
      const r = buildCreature(b, { resolution: 40, smoothIterations: smooth });
      const rows: Array<{ d: number; p: number[]; g: number[] }> = [];
      for (let i = 0; i < r.positions.length; i += 3) {
        const p: [number, number, number] = [r.positions[i]!, r.positions[i + 1]!, r.positions[i + 2]!];
        const d = evalScene(c.scene, p);
        const g: [number, number, number] = [0, 0, 0];
        sceneGradient(c.scene, p, 0.004, g);
        rows.push({ d, p, g });
      }
      rows.sort((a, z) => Math.abs(z.d) - Math.abs(a.d));
      const off = rows.filter((x) => Math.abs(x.d) > r.stats.cell * 0.5).length;
      console.log(`\nGlättung ${smooth}: ${off} von ${rows.length} Vertices > Zelle/2 (Zelle ${r.stats.cell.toFixed(4)})`);
      for (const x of rows.slice(0, 3)) console.log(`  d=${x.d.toFixed(4)} p=(${x.p.map((v) => v.toFixed(3)).join(', ')}) |g|=${Math.hypot(...x.g).toFixed(3)}`);
      expect(off).toBeLessThan(rows.length * 0.01);
      expect(Math.abs(rows[0]!.d)).toBeLessThan(r.stats.cell * 1.5);
    }
  }, 60000);
});
