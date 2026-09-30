import { Box3, BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicNodeMaterial, SphereGeometry, Vector3 } from 'three/webgpu';
import type { Scene, UniformNode } from 'three/webgpu';
import { color, uniform } from 'three/tsl';
import { EarleMaterial, PaletteAtlas, PaletteLookup, SunRig, createFogSettings, createSkyDome } from '@ee/render';

/** Tjorizo meadow (Florian's draft): khaki hills, tinted ink, teal sky, one rust accent. */
const GROUND_STEPS = ['#606e4f', '#7f8b58', '#9aa463', '#b3bb6d', '#cfd58a'];
const GROUND_INK = '#242c0b';
const BUSH_STEPS = ['#1f4a3f', '#2d6b58', '#3f8a6d'];
const BUSH_INK = '#10231c';
const RUST_STEPS = ['#7a2f18', '#a8421f', '#c8542a', '#e0703f'];
const SKY_STEPS = ['#caf5e4', '#a8eedb', '#7ce6d5', '#58cbbf', '#3aa9a5', '#2a8a93'];
const FOG_STEPS = ['#7ce6d5', '#8fe0cf', '#a8e8d8', '#c2f0e2', '#d8f6ea'];
const FOG_ALPHA = [0, 0.25, 0.45, 0.62, 0.78];

export interface Meadow {
  group: Group;
  sun: SunRig;
  sunDirWorld: UniformNode<'vec3', Vector3>;
  target: Mesh;
  dispose(): void;
}

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Height of the meadow: flat around REX, gentle chiselled hills further out. */
export function meadowHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const w = smooth01((r - 5) / 14);
  const h = 1.2 * Math.sin(x * 0.12 + 1.2) * Math.cos(z * 0.1 - 0.4) + 0.8 * Math.sin((x + z) * 0.16 + 2) + 1.6 * Math.sin(r * 0.07 - 1.1);
  return w * (h + 1.4 * smooth01((r - 20) / 30));
}

function groundGeometry(radius: number, rings: number, segments: number): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const r = radius * Math.pow(i / rings, 1.6);
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      pos.push(x, i === 0 ? 0 : meadowHeight(x, z), z);
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
  // Check a vertex off the degenerate centre ring (ring 1): the winding must face up.
  if (g.getAttribute('normal').getY(segments + 2) < 0) {
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

/**
 * REX's stage in the lab: an Earle meadow (banded EarleMaterial, stepped fog and sky, flat 10° sun with
 * sharpened hard shadows), a few dark dome bushes and one rust monolith, plus a pink target puck for `point()`.
 */
export function createMeadow(scene: Scene, quality: 'hoch' | 'mobil'): Meadow {
  const group = new Group();
  group.name = 'rex-meadow';
  const atlas = new PaletteAtlas();
  const lookup = new PaletteLookup(atlas.texture, atlas.width, atlas.height);
  const groundRow = atlas.addRow({ name: 'rex/ground', steps: [GROUND_INK, ...GROUND_STEPS] });
  const bushRow = atlas.addRow({ name: 'rex/bush', steps: [BUSH_INK, ...BUSH_STEPS] });
  const rustRow = atlas.addRow({ name: 'rex/rust', steps: ['#2a0f08', ...RUST_STEPS] });
  const skyRow = atlas.addRow({ name: 'rex/sky', steps: [...SKY_STEPS, '#f7f6d8', '#eef7e4'] });
  const fogRow = atlas.addRow({ name: 'rex/fog', steps: FOG_STEPS, alphas: FOG_ALPHA });
  const fog = createFogSettings({ row: fogRow, steps: 5, start: 26, range: 80 });
  const bands = uniform(4);
  const disposables: Array<{ dispose(): void }> = [atlas];

  const sun = new SunRig({ mapSize: quality === 'mobil' ? 1024 : 2048, sharpen: true, elevationDeg: 10, azimuthDeg: 62, distance: 60 });
  scene.add(sun.root);

  const ground = groundGeometry(90, quality === 'mobil' ? 60 : 96, quality === 'mobil' ? 72 : 120);
  const groundMat = new EarleMaterial({ lookup, row: groundRow, fog, bands, bandScale: 1.7, terminator: 0.0 });
  const groundMesh = new Mesh(ground, groundMat);
  groundMesh.name = 'meadow-ground';
  groundMesh.receiveShadow = true;
  groundMesh.frustumCulled = false;
  group.add(groundMesh);
  disposables.push(ground, groundMat);

  const bushMat = new EarleMaterial({ lookup, row: bushRow, fog, bands: uniform(3), bandScale: 1.4, terminator: 0.05 });
  const bushGeo = new SphereGeometry(1, 20, 12);
  disposables.push(bushMat, bushGeo);
  const bushes: Array<[number, number, number, number]> = [
    [-3.4, -2.6, 0.9, 0.7],
    [-4.3, -2.0, 0.6, 0.55],
    [3.8, -4.2, 1.1, 0.72],
    [5.2, -3.4, 0.7, 0.6],
    [-7.5, -9, 1.6, 0.66],
    [9, -12, 2.2, 0.6],
    [-12, -16, 2.6, 0.62],
    [2.2, -8.5, 0.8, 0.7],
  ];
  for (const [x, z, r, sy] of bushes) {
    const m = new Mesh(bushGeo, bushMat);
    m.position.set(x, meadowHeight(x, z) + r * sy * 0.35, z);
    m.scale.set(r, r * sy, r);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  const rustMat = new EarleMaterial({ lookup, row: rustRow, fog, bands: uniform(4), bandScale: 1.5, terminator: 0.0 });
  const mono = new BoxGeometry(0.9, 6, 0.9);
  disposables.push(rustMat, mono);
  const monolith = new Mesh(mono, rustMat);
  monolith.position.set(-6.5, meadowHeight(-6.5, -7) + 2.6, -7);
  monolith.rotation.set(0.12, 0.5, -0.18);
  monolith.castShadow = true;
  group.add(monolith);

  const sunDirWorld = uniform(new Vector3(0, 1, 0));
  const sky = createSkyDome({ lookup, skyRow, steps: SKY_STEPS.length, sunIndex: SKY_STEPS.length, ringIndex: SKY_STEPS.length + 1, sunDirWorld, spread: 0.5, radius: 300 });
  group.add(sky);
  disposables.push(sky.geometry, sky.material as unknown as { dispose(): void });

  // Target puck for point(): a small stone with the pink of the level nodes.
  const puckGeo = new CylinderGeometry(0.16, 0.16, 0.05, 24);
  const puckMat = new MeshBasicNodeMaterial();
  puckMat.colorNode = color(new Color('#e5aed4'));
  disposables.push(puckGeo, puckMat);
  const target = new Mesh(puckGeo, puckMat);
  target.name = 'rex-target';
  target.position.set(1.25, 0.03, 0.35);
  group.add(target);

  scene.add(group);
  group.updateMatrixWorld(true);
  sun.fitShadow(new Box3(new Vector3(-16, -1, -18), new Vector3(12, 7, 6)), group.matrixWorld, 7);
  sun.requestUpdate();
  return {
    group,
    sun,
    sunDirWorld,
    target,
    dispose(): void {
      for (const d of disposables) d.dispose();
      sun.dispose();
      group.removeFromParent();
    },
  };
}
