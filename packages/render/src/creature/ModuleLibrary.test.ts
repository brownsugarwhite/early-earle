import { BoxGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { ModuleLibrary, moduleFromScene } from './ModuleLibrary';

/** Builds a scene like GLTFLoader does from the starter library: root mesh, chain children, sockets. */
function fakeTrunk(): Group {
  const scene = new Group();
  const tint = new MeshStandardMaterial({ color: '#2f7f7a' });
  tint.name = 'Tint';
  const seg0 = new Mesh(new BoxGeometry(0.1, 0.2, 0.1), tint);
  seg0.name = 'trunk_test_seg0';
  seg0.userData['name'] = 'trunk_test_seg0';
  seg0.userData['slot'] = 'trunk';
  seg0.userData['chain'] = true;
  const socket = new Object3D();
  socket.name = 'SOCKET_root010'; // sanitised by three
  socket.userData['name'] = 'SOCKET_root.010'; // original glTF name
  seg0.add(socket);
  const seg1 = new Mesh(new BoxGeometry(0.1, 0.2, 0.1), tint);
  seg1.name = 'trunk_test_seg1';
  seg1.userData['name'] = 'trunk_test_seg1';
  seg1.position.set(0, 0.2, 0);
  seg0.add(seg1);
  const tip = new Object3D();
  tip.name = 'SOCKET_tip006';
  tip.userData['name'] = 'SOCKET_tip.006';
  tip.position.set(0, 0.2, 0);
  seg1.add(tip);
  scene.add(seg0);
  return scene;
}

describe('moduleFromScene', () => {
  it('finds segments in chain order, strips socket suffixes and keeps extras', () => {
    const def = moduleFromScene('trunk_test', fakeTrunk());
    expect(def.slot).toBe('trunk');
    expect(def.extras['chain']).toBe(true);
    expect(def.segments.map((s) => s.name)).toEqual(['trunk_test_seg0', 'trunk_test_seg1']);
    expect(def.segments[1]!.parent).toBe(0);
    expect(new Vector3().setFromMatrixPosition(def.segments[1]!.local).y).toBeCloseTo(0.2);
    expect(def.tip?.segment).toBe(1);
    expect(new Vector3().setFromMatrixPosition(def.tip!.local).y).toBeCloseTo(0.2);
    expect(def.rootSocketInverse.equals(new Matrix4())).toBe(true);
    expect(def.faces).toBe(24); // two boxes × 12 triangles
    expect(def.segments[0]!.prims[0]!.materialName).toBe('Tint');
  });

  it('handles a root socket with an offset (inverse maps it back to the origin)', () => {
    const scene = fakeTrunk();
    const socket = scene.getObjectByName('SOCKET_root010')!;
    socket.position.set(0, -0.1, 0);
    const def = moduleFromScene('trunk_test', scene);
    expect(new Vector3().setFromMatrixPosition(def.rootSocketInverse).y).toBeCloseTo(0.1);
  });

  it('splits multi-material primitives into prims of one segment', () => {
    const scene = new Group();
    const group = new Group();
    group.name = 'eye_round';
    group.userData['name'] = 'eye_round';
    group.userData['slot'] = 'eye';
    const a = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    a.name = 'eye_round_1';
    const b = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    b.name = 'eye_round_2';
    group.add(a, b);
    const pupil = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    pupil.name = 'eye_round_pupil';
    pupil.userData['name'] = 'eye_round_pupil';
    group.add(pupil);
    scene.add(group);
    const def = moduleFromScene('eye_round', scene);
    expect(def.segments).toHaveLength(2);
    expect(def.segments[0]!.prims).toHaveLength(2);
    expect(def.segments[1]!.pupil).toBe(true);
  });
});

describe('ModuleLibrary', () => {
  it('caches loads, reports missing ids and survives loader errors', async () => {
    let loads = 0;
    const loader = {
      loadAsync: async (url: string) => {
        loads++;
        if (url.endsWith('broken.glb')) throw new Error('nope');
        return { scene: fakeTrunk() } as unknown as Awaited<ReturnType<import('three/addons/loaders/GLTFLoader.js').GLTFLoader['loadAsync']>>;
      },
    };
    const lib = new ModuleLibrary({ trunk_test: '/trunk_test.glb', broken: '/broken.glb' }, loader);
    const [a, b] = await Promise.all([lib.load('trunk_test'), lib.load('trunk_test')]);
    expect(a).toBe(b);
    expect(loads).toBe(1);
    expect(await lib.load('broken')).toBeNull();
    expect(lib.errors.has('broken')).toBe(true);
    expect(await lib.load('unknown')).toBeNull();
    expect(lib.missing.has('unknown')).toBe(true);
    expect((await lib.loadAll()).map((d) => d.id)).toEqual(['trunk_test']);
  });
});
