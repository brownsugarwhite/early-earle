import { BufferGeometry, Float32BufferAttribute } from 'three/webgpu';

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/**
 * Terrain of the lab patch (plane coordinates): gentle chiselled hills, calmer in the middle where the landmark
 * stands, rising a little toward the rim so the patch reads as a valley under the low sun.
 */
export function labHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const near = 0.35 * Math.sin(x * 0.13 + 1.2) * Math.cos(z * 0.11 - 0.4) + 0.25 * Math.sin((x - z) * 0.09 + 0.7);
  const far = 1.6 * Math.sin(x * 0.045 + 1.2) * Math.cos(z * 0.05 - 0.4) + 1.1 * Math.sin((x + z) * 0.06 + 2) + 2.2 * Math.sin(r * 0.03 - 1.1);
  const w = smooth01((r - 22) / 40);
  return near * (1 - w) + (far + 2.4 * smooth01((r - 60) / 80)) * w;
}

/**
 * Radial grid (denser in the middle) with heights from `height(x, z)` (the carved landmark ground), winding up.
 */
export function createPatchGeometry(radius: number, rings: number, segments: number, height: (x: number, z: number) => number): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const q = i / rings;
    const r = radius * Math.pow(q, 1.55);
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      pos.push(x, height(x, z), z);
    }
  }
  const rv = segments + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * rv + j;
      const b = a + rv;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // the winding must face up (check a vertex off the degenerate centre ring)
  if (g.getAttribute('normal').getY(segments + 3) < 0) {
    const index = g.getIndex()!;
    for (let k = 0; k < index.count; k += 3) {
      const t = index.getX(k + 1);
      index.setX(k + 1, index.getX(k + 2));
      index.setX(k + 2, t);
    }
    g.computeVertexNormals();
  }
  return g;
}
