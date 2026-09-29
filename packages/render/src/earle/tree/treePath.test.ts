import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import { computeTreeShape } from './shape';
import { heroTreePath, transformHeroTreePath } from './treePath';

function insideDomes(p: ArrayLike<number>, domes: ReturnType<typeof computeTreeShape>['domes'], pad: number): boolean {
  for (const d of domes) {
    const rh = d.r + pad;
    const rv = d.r * d.sy + pad;
    if (((p[0]! - d.center.x) / rh) ** 2 + ((p[1]! - d.center.y) / rv) ** 2 + ((p[2]! - d.center.z) / rh) ** 2 < 1) return true;
  }
  return false;
}

describe('heroTreePath', () => {
  const shape = computeTreeShape();
  const path = heroTreePath({ nodes: 24, shape });

  it('liefert mit Standardwerten denselben Pfad wie mit der vorberechneten Form (deterministisch)', () => {
    const again = heroTreePath({ nodes: 24 });
    expect(again.nodes.map((n) => n.position)).toEqual(path.nodes.map((n) => n.position));
    expect(again.length).toBeCloseTo(path.length, 6);
  });

  it('klettert den Stamm spiralig hinauf, steigt durchs Tal aufs Dach und wandert am Kronenrand', () => {
    expect(path.nodes).toHaveLength(24);
    const phases = path.nodes.map((n) => n.phase);
    expect(phases[0]).toBe('trunk');
    expect(phases.at(-1)).toBe('crown');
    const trunkNodes = path.nodes.filter((n) => n.phase === 'trunk');
    const crownNodes = path.nodes.filter((n) => n.phase === 'crown');
    expect(trunkNodes.length).toBeGreaterThanOrEqual(6);
    expect(crownNodes.length).toBeGreaterThanOrEqual(10);
    // Stamm: Höhe steigt monoton
    for (let i = 1; i < trunkNodes.length; i++) expect(trunkNodes[i]!.position[1]).toBeGreaterThan(trunkNodes[i - 1]!.position[1]);
    // Krone: alle Knoten oberhalb der Kronenunterkante, in der Nähe des Gratradius
    for (const n of crownNodes) {
      expect(n.position[1]).toBeGreaterThan(shape.crownBottom);
      const r = Math.hypot(n.position[0] - shape.crownCenter.x, n.position[2] - shape.crownCenter.z);
      expect(r).toBeGreaterThan(shape.plan.ridgeRadius * 0.85);
      expect(r).toBeLessThan(shape.plan.ridgeRadius * 1.15);
    }
  });

  it('kein Knoten und kein Pfadpunkt steckt in einer Kuppel, die Kamera nie in der Krone', () => {
    for (const n of path.nodes) expect(insideDomes(n.position, shape.domes, -0.05)).toBe(false);
    for (const d of path.dots) expect(insideDomes(d.position, shape.domes, -0.05)).toBe(false);
    for (const s of path.rail) expect(insideDomes(s.position, shape.domes, 0.5)).toBe(false);
  });

  it('Kamerafahrt: stetig, Knoten i liegt bei railTForNode(i)', () => {
    const a = new Vector3();
    const b = new Vector3();
    const la = new Vector3();
    const lb = new Vector3();
    let maxStep = 0;
    for (let i = 0; i < 400; i++) {
      path.sampleRail(i / 400, a, la);
      path.sampleRail((i + 1) / 400, b, lb);
      maxStep = Math.max(maxStep, a.distanceTo(b));
      expect(Number.isFinite(a.x + a.y + a.z + la.x + la.y + la.z)).toBe(true);
    }
    // keine Sprünge: je 1/400 der Fahrt höchstens ~3 Einheiten (Krone ≈ 0,7, Stamm ≈ 2)
    expect(maxStep).toBeLessThan(3);
    expect(path.railTForNode(0)).toBe(0);
    expect(path.railTForNode(23)).toBe(1);
  });

  it('transformHeroTreePath überträgt Knoten, Normalen und Schiene in einen Slot-Raum', () => {
    const m = new Matrix4().compose(new Vector3(10, 40, -3), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.4), new Vector3(0.5, 0.5, 0.5));
    const t = transformHeroTreePath(path, m);
    const p0 = new Vector3(...path.nodes[5]!.position).applyMatrix4(m);
    expect(t.nodes[5]!.position[0]).toBeCloseTo(p0.x, 5);
    expect(t.nodes[5]!.position[1]).toBeCloseTo(p0.y, 5);
    expect(Math.hypot(...t.nodes[5]!.normal)).toBeCloseTo(1, 5);
    expect(t.length).toBeCloseTo(path.length * 0.5, 4);
    const c = t.curveAt(0.5, new Vector3());
    const c0 = path.curveAt(0.5, new Vector3()).applyMatrix4(m);
    expect(c.distanceTo(c0)).toBeLessThan(1e-6);
  });
});
