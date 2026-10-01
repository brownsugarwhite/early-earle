import { Box3, Group, Matrix4, Mesh, PerspectiveCamera, Quaternion, SphereGeometry, Vector3 } from 'three/webgpu';
import type { Object3D, Scene } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { EarleMaterial, PaletteAtlas, PaletteLookup, SunRig, createFogSettings, createSkyDome } from '@ee/render';
import { NodePath, type NodePathWorld } from '../../flow/NodePath';
import { Hero } from '../../flow/Hero';
import { MAP_VIEW } from '../../flow/MapWorld';
import type { PathDot, PathLayout, PathNode } from '../../flow/path';

const R = 32;
const GROUND = ['#606e4f', '#7f8b58', '#9aa463', '#b3bb6d', '#cfd58a'];
const SKY = ['#caf5e4', '#a8eedb', '#7ce6d5', '#58cbbf', '#3aa9a5', '#2a8a93'];
const FOG = ['#7ce6d5', '#8fe0cf', '#a8e8d8', '#c2f0e2', '#d8f6ea'];

export interface MockMap {
  group: Group;
  /** World positions of the path nodes and the index of the current one. */
  nodes: Vector3[];
  current: number;
  hero: Hero;
  nodePath: NodePath;
  sun: SunRig;
  update(dt: number, elapsed: number, camera: PerspectiveCamera): void;
  dispose(): void;
}

const _m = new Matrix4();

/** Tangent frame at `p` on the sphere (normal = up), facing `toward` — like MapWorld.tangentFrame. */
function tangentQuaternion(normal: Vector3, toward: Vector3): Quaternion {
  const up = normal.clone().normalize();
  const fwd = toward.clone().sub(up.clone().multiplyScalar(toward.dot(up))).normalize();
  const right = new Vector3().crossVectors(up, fwd).normalize();
  _m.makeBasis(right, up, fwd);
  return new Quaternion().setFromRotationMatrix(_m);
}

/**
 * The map in miniature for the phone preview: a planet cap under the flow's map camera (MAP_VIEW), the real
 * NodePath with a serpentine mock path whose current node sits on the flow's lower-third line (NDC y −0.36),
 * the hero blob on it. REX's map placement is tested against these nodes exactly as in the flow.
 */
export function createMockMap(scene: Scene, camera: PerspectiveCamera, aspect: number): MockMap {
  const group = new Group();
  group.name = 'rex-mock-map';
  const planet = new Group();
  planet.position.set(0, -R, 0);
  group.add(planet);

  const atlas = new PaletteAtlas();
  const lookup = new PaletteLookup(atlas.texture, atlas.width, atlas.height);
  const groundRow = atlas.addRow({ name: 'rexmap/ground', steps: ['#242c0b', ...GROUND] });
  const skyRow = atlas.addRow({ name: 'rexmap/sky', steps: [...SKY, '#f7f6d8', '#eef7e4'] });
  const fogRow = atlas.addRow({ name: 'rexmap/fog', steps: FOG, alphas: [0, 0.25, 0.45, 0.62, 0.78] });
  const fog = createFogSettings({ row: fogRow, steps: 5, start: 18, range: 40 });
  const geo = new SphereGeometry(R, 160, 96);
  const mat = new EarleMaterial({ lookup, row: groundRow, fog, bands: uniform(4), bandScale: 1.8, terminator: 0.0 });
  const sphere = new Mesh(geo, mat);
  sphere.receiveShadow = true;
  sphere.name = 'rex-mock-planet';
  planet.add(sphere);

  const sun = new SunRig({ mapSize: 1024, sharpen: true, elevationDeg: 34, azimuthDeg: 25, distance: 40 });
  sun.root.position.set(0, 0, -4);
  group.add(sun.root);
  const sunDirWorld = uniform(new Vector3(0, 1, 0));
  const sky = createSkyDome({ lookup, skyRow, steps: SKY.length, sunIndex: SKY.length, ringIndex: SKY.length + 1, sunDirWorld, spread: 0.45, radius: 300, horizonY: -0.35 });
  group.add(sky);

  // Camera like the flow's map view (rig at the apex).
  camera.fov = MAP_VIEW.fov;
  camera.aspect = aspect;
  camera.position.copy(MAP_VIEW.offset);
  camera.lookAt(MAP_VIEW.look);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  // Current node: the sphere point under NDC (0, −0.36).
  const origin = camera.position.clone();
  const dir = new Vector3(0, -0.36, 0.5).unproject(camera).sub(origin).normalize();
  const center = new Vector3(0, -R, 0);
  const oc = origin.clone().sub(center);
  const b = oc.dot(dir);
  const c = oc.lengthSq() - R * R;
  const t = -b - Math.sqrt(Math.max(0, b * b - c));
  const currentDir = origin.clone().addScaledVector(dir, t).sub(center).normalize();

  // Serpentine: step away from the camera (−z) along the sphere, swinging sideways.
  const current = 5;
  const count = 14;
  const stepAngle = 2.4 / R;
  const axisX = new Vector3(1, 0, 0);
  const axisZ = new Vector3(0, 0, 1);
  const nodeDirs: Vector3[] = [];
  for (let k = 0; k < count; k++) {
    const s = k - current;
    const swing = 0.085 * Math.sin(s * 0.85 + 0.7) - 0.085 * Math.sin(0.7);
    const d = currentDir.clone().applyAxisAngle(axisX, -s * stepAngle).applyAxisAngle(axisZ, swing);
    nodeDirs.push(d.normalize());
  }
  const pathNodes: PathNode[] = nodeDirs.map((d, index) => ({ index, position: [d.x * R, d.y * R, d.z * R], normal: [d.x, d.y, d.z] }));
  const dots: PathDot[] = [];
  for (let k = 0; k < count - 1; k++) {
    for (let j = 1; j <= 3; j++) {
      const d = nodeDirs[k]!.clone().lerp(nodeDirs[k + 1]!, j / 4).normalize();
      dots.push({ position: [d.x * R, d.y * R, d.z * R], normal: [d.x, d.y, d.z], seg: k, u: j / 4 });
    }
  }
  const layout: PathLayout = {
    node: (i) => pathNodes[Math.max(0, Math.min(count - 1, Math.floor(i)))]!,
    window: (first, last) => {
      const a = Math.max(0, first);
      const b = Math.min(count - 1, last);
      return { first: a, nodes: pathNodes.slice(a, b + 1), dots: dots.filter((d) => (d.seg ?? 0) >= a - 1 && (d.seg ?? 0) <= b), ribbon: [] };
    },
    nearestNode: () => current,
    lastPlayable: count - 1,
  };
  // The miniature has no plane: the path lies directly in the cap's space (no display mapping)
  const host: NodePathWorld = {
    plane: planet,
    focus: { x: 0, z: 0 },
    mapping: { warp: (p: never) => p },
    anchorObject: (o: Object3D, x: number, z: number) => o.position.set(x, o.position.y, z),
    releaseObject: () => undefined,
    toDisplay: (p, out = new Vector3()) => {
      planet.updateMatrixWorld(true);
      return (Array.isArray(p) ? out.set(p[0], p[1], p[2]) : out.copy(p)).applyMatrix4(planet.matrixWorld);
    },
  };
  sun.directionWorld(sunDirWorld.value);
  const nodePath = new NodePath({ planet: host, layout, sunDirWorld: sunDirWorld.value.clone() });
  nodePath.setProgress(current, current);

  const hero = new Hero('tjorizo', { octaves: 1 });
  planet.add(hero.root);
  const camLocal = planet.worldToLocal(camera.position.clone());
  const pos = currentDir.clone().multiplyScalar(R);
  hero.setPose({ position: pos, quaternion: tangentQuaternion(currentDir, camLocal.sub(pos)), scale: 0.48 });

  scene.add(group);
  group.updateMatrixWorld(true);
  sun.fitShadow(new Box3(new Vector3(-12, -3, -26), new Vector3(12, 3, 8)), group.matrixWorld, 3);
  sun.requestUpdate();

  const nodes = nodeDirs.map((d) => d.clone().multiplyScalar(R).add(center));
  return {
    group,
    nodes,
    current,
    hero,
    nodePath,
    sun,
    update(dt: number, elapsed: number, cam: PerspectiveCamera): void {
      hero.update(dt, cam);
      nodePath.update(elapsed);
    },
    dispose(): void {
      hero.dispose();
      nodePath.dispose();
      geo.dispose();
      mat.dispose();
      sky.geometry.dispose();
      (sky.material as unknown as { dispose(): void }).dispose();
      atlas.dispose();
      sun.dispose();
      group.removeFromParent();
    },
  };
}
