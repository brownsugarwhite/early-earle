import { describe, expect, it } from 'vitest';
import { createBigTrashGeometry, createBlockGeometry, createRingGeometry, createTubeGeometry } from './geometry';

/** Anteil der Dreiecke, deren Normale nach außen zeigt (weg von der Achse bzw. vom Schwerpunkt der Teilform). */
function outwardShare(g: ReturnType<typeof createBigTrashGeometry>, partFilter?: (part: number) => boolean): { share: number; count: number; windingOk: number } {
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  const seg = g.getAttribute('seg');
  const index = g.getIndex();
  const tri = index ? index.count / 3 : p.count / 3;
  let ok = 0;
  let count = 0;
  let winding = 0;
  let considered = 0;
  for (let t = 0; t < tri; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    if (partFilter && seg && !partFilter(seg.getX(i0))) continue;
    considered++;
    const cx = (p.getX(i0) + p.getX(i1) + p.getX(i2)) / 3;
    const cz = (p.getZ(i0) + p.getZ(i1) + p.getZ(i2)) / 3;
    const nx = n.getX(i0);
    const ny = n.getY(i0);
    const nz = n.getZ(i0);
    // Seitenflächen: Normale zeigt vom Mittelpunkt weg
    if (Math.abs(ny) < 0.5 && Math.hypot(cx, cz) > 0.05) {
      count++;
      if (nx * cx + nz * cz > 0) ok++;
    }
    // Winding passt zur Normale (Vorderseite gegen den Uhrzeigersinn)
    const ax = p.getX(i1) - p.getX(i0);
    const ay = p.getY(i1) - p.getY(i0);
    const az = p.getZ(i1) - p.getZ(i0);
    const bx = p.getX(i2) - p.getX(i0);
    const by = p.getY(i2) - p.getY(i0);
    const bz = p.getZ(i2) - p.getZ(i0);
    const gx = ay * bz - az * by;
    const gy = az * bx - ax * bz;
    const gz = ax * by - ay * bx;
    if (gx * nx + gy * ny + gz * nz > 0) winding++;
  }
  return { share: count > 0 ? ok / count : 1, count, windingOk: winding / Math.max(1, considered) };
}

describe('Müll-Geometrie', () => {
  it('Müllberge: Seitenflächen zeigen nach außen, Winding passt zur Normale', () => {
    const g = createBigTrashGeometry();
    const heaps = outwardShare(g, (part) => part < 2.5);
    expect(heaps.count).toBeGreaterThan(50);
    // Sporne und versetzte Terrassen zeigen teils schräg nach innen → nicht 100 %
    expect(heaps.share).toBeGreaterThan(0.9);
    expect(heaps.windingOk).toBeGreaterThan(0.99);
  });
  it('Ruinen: Winding passt zur Normale', () => {
    const g = createBigTrashGeometry();
    const ruins = outwardShare(g, (part) => part > 2.5);
    expect(ruins.windingOk).toBeGreaterThan(0.99);
  });
  it('Kleinteile: Röhre und Block außen, Ring mit passendem Winding', () => {
    for (const g of [createTubeGeometry(), createBlockGeometry()]) {
      const r = outwardShare(g);
      expect(r.share).toBeGreaterThan(0.99);
      expect(r.windingOk).toBeGreaterThan(0.99);
    }
    // Torus: die Innenseite schaut zur Achse, nur das Winding zählt
    expect(outwardShare(createRingGeometry()).windingOk).toBeGreaterThan(0.95);
  });
});
