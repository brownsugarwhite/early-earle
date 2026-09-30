import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three/webgpu';
import type { BufferGeometry, Object3D } from 'three/webgpu';
import { coverFromBoxes, MAX_VOLUME_CELLS, PlanetVolumeCollector } from './volumes';
import type { ReceiverVolume } from './fit';
import { planetShadowReceivers, PLANET_COVER_TOLERANCE, type ShadowPlanetLike } from '../earle/hardShadow';

const R = 32;
const mat = new MeshBasicMaterial();
const planet = { surfaceRadius: () => R };

function receiver<T extends Object3D>(o: T, name = ''): T {
  (o as unknown as Mesh).receiveShadow = true;
  o.name = name;
  return o;
}

function vertices(geometry: BufferGeometry, world: Matrix4): Vector3[] {
  const pos = geometry.getAttribute('position');
  const out: Vector3[] = [];
  for (let i = 0; i < pos.count; i++) out.push(new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(world));
  return out;
}

function inVolumes(p: Vector3, vols: ReceiverVolume[]): boolean {
  return vols.some((v) => v.center.distanceTo(p) <= v.radius + 1e-5);
}

/** Planet: Gruppe mit Rotation und Versatz (Welt ≠ Planetenraum). */
function planetGroup(): Group {
  const g = new Group();
  g.position.set(3, -2, 5);
  g.quaternion.setFromAxisAngle(new Vector3(1, 0.4, -0.2).normalize(), 0.7);
  return g;
}

describe('coverFromBoxes', () => {
  it('fasst viele Boxen in höchstens 64 Kugeln zusammen, jede Box ganz enthalten', () => {
    const boxes: Array<[Vector3, Vector3]> = [];
    for (let i = 0; i < 300; i++) {
      const c = new Vector3(Math.sin(i * 1.7) * 9, (i % 17) * 0.7, Math.cos(i * 0.9) * 6);
      const h = new Vector3(0.2 + (i % 3) * 0.3, 0.4, 0.3);
      boxes.push([c.clone().sub(h), c.clone().add(h)]);
    }
    const cover = coverFromBoxes(boxes.length, (i, mn, mx) => {
      mn.copy(boxes[i]![0]);
      mx.copy(boxes[i]![1]);
      return true;
    })!;
    expect(cover.count).toBeGreaterThan(4);
    expect(cover.count).toBeLessThanOrEqual(MAX_VOLUME_CELLS);
    for (const [mn, mx] of boxes) {
      const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => new Vector3(k & 1 ? mx.x : mn.x, k & 2 ? mx.y : mn.y, k & 4 ? mx.z : mn.z));
      const inside = Array.from({ length: cover.count }, (_, s) => s).some((s) =>
        corners.every((p) => Math.hypot(p.x - cover.data[s * 4]!, p.y - cover.data[s * 4 + 1]!, p.z - cover.data[s * 4 + 2]!) <= cover.data[s * 4 + 3]! + 1e-5),
      );
      expect(inside).toBe(true);
    }
  });
});

describe('PlanetVolumeCollector (Schatten v3, Empfänger-Volumen)', () => {
  const build = () => {
    const g = planetGroup();
    const chunk = receiver(new Mesh(new BoxGeometry(4, 4, 4, 4, 4, 4), mat), 'chunk-3');
    chunk.position.set(0, R + 3, 0);
    // hoher Stamm, Fuß am Boden
    const trunkGeo = new BoxGeometry(1, 10, 1, 1, 20, 1);
    const trunk = receiver(new Mesh(trunkGeo, mat), 'hero-wood');
    trunk.position.set(0, R + 5, 0);
    // flache, der Krümmung folgende Schicht (Pfadband, Wasser): Kappe knapp über dem Boden
    const flat = receiver(new Mesh(new SphereGeometry(R + 0.2, 48, 24, 0, Math.PI * 2, 0, 0.6), mat), 'path-ribbon');
    // Instanzen, die erst der Shader platziert (Matrizen ohne Versatz → Planetenmitte)
    const shaderPlaced = receiver(new InstancedMesh(new SphereGeometry(0.5, 6, 4), mat, 100), 'planet-crown-dome');
    // Kuppeln hoch über dem Boden
    const domes = receiver(new InstancedMesh(new SphereGeometry(1, 8, 6), mat, 20), 'hero-domes');
    const m = new Matrix4();
    for (let i = 0; i < 20; i++) domes.setMatrixAt(i, m.makeTranslation(Math.cos(i) * 3, R + 9 + (i % 4), Math.sin(i) * 3));
    // klein und im Bodenband
    const stone = receiver(new Mesh(new BoxGeometry(0.5, 0.5, 0.5), mat), 'stone');
    stone.position.set(3, R + 0.3, 0);
    // ausgeschlossen, zu viele Instanzen, kein Empfänger
    const excluded = receiver(new Mesh(trunkGeo, mat), 'excluded');
    excluded.position.set(6, R + 5, 0);
    excluded.userData.shadowVolume = false;
    const forest = receiver(new InstancedMesh(new SphereGeometry(1, 6, 4), mat, 600), 'forest');
    for (let i = 0; i < 600; i++) forest.setMatrixAt(i, m.makeTranslation(i * 0.01, R + 6, 0));
    const noReceive = new Mesh(trunkGeo, mat);
    noReceive.position.set(-6, R + 5, 0);
    g.add(chunk, trunk, flat, shaderPlaced, domes, stone, excluded, forest, noReceive);
    g.updateMatrixWorld(true);
    return { g, trunk, trunkGeo, flat, domes };
  };

  it('sammelt nur Aufragendes (Stamm über dem Band, Kuppeln), eng und vollständig', () => {
    const { g, trunk, trunkGeo, domes } = build();
    const collector = new PlanetVolumeCollector();
    const vols = collector.collect(g, planet, PLANET_COVER_TOLERANCE);
    expect(collector.objects).toBe(2);
    expect(vols.length).toBeGreaterThan(2);
    // jeder Stammpunkt über dem Bodenband liegt in einem Volumen
    const toPlanet = g.matrixWorld.clone().invert();
    for (const v of vertices(trunkGeo, trunk.matrixWorld)) {
      const h = v.clone().applyMatrix4(toPlanet).length() - R;
      if (h > PLANET_COVER_TOLERANCE) expect(inVolumes(v, vols)).toBe(true);
    }
    // jede Kuppel ganz
    const m = new Matrix4();
    const geo = domes.geometry;
    geo.computeBoundingSphere();
    for (let i = 0; i < domes.count; i++) {
      domes.getMatrixAt(i, m);
      const c = geo.boundingSphere!.center.clone().applyMatrix4(m).applyMatrix4(domes.matrixWorld);
      expect(vols.some((v) => v.center.distanceTo(c) + geo.boundingSphere!.radius <= v.radius + 1e-4)).toBe(true);
    }
    // eng: der Stamm allein wird zu Kugeln weit unter seiner Hüllkugel (r ≈ 5)
    const solo = planetGroup();
    const lone = receiver(new Mesh(trunkGeo, mat), 'hero-wood');
    lone.position.set(0, R + 5, 0);
    solo.add(lone);
    solo.updateMatrixWorld(true);
    const trunkVols = new PlanetVolumeCollector().collect(solo, planet, PLANET_COVER_TOLERANCE);
    expect(trunkVols.length).toBeGreaterThanOrEqual(4);
    for (const v of trunkVols) expect(v.radius).toBeLessThan(2.5);
  });

  it('vermisst nur bei Änderungen neu, folgt Bewegung, erzwingt per userData, ohne Planet leer', () => {
    const { g, trunk, flat, domes } = build();
    const collector = new PlanetVolumeCollector(undefined, false);
    const a = collector.collect(g, planet, PLANET_COVER_TOLERANCE).map((v) => v.center.clone());
    const measured = collector.classifications;
    expect(collector.collect(g, planet, PLANET_COVER_TOLERANCE).map((v) => v.center.clone())).toEqual(a);
    // Kuppeln umsortiert (wie beim Sortieren nach der Kamera): gleicher Inhalt, keine Neuvermessung
    const m0 = new Matrix4();
    const m1 = new Matrix4();
    domes.getMatrixAt(0, m0);
    domes.getMatrixAt(5, m1);
    domes.setMatrixAt(0, m1);
    domes.setMatrixAt(5, m0);
    domes.instanceMatrix.needsUpdate = true;
    collector.collect(g, planet, PLANET_COVER_TOLERANCE);
    expect(collector.classifications).toBe(measured);
    // Planet dreht sich: Volumen drehen mit, ohne Neuvermessung
    g.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.3));
    g.updateMatrixWorld(true);
    const b = collector.collect(g, planet, PLANET_COVER_TOLERANCE).map((v) => v.center.clone());
    expect(b.length).toBe(a.length);
    expect(b[0]!.distanceTo(a[0]!)).toBeGreaterThan(0.1);
    expect(collector.classifications).toBe(measured);
    // Stamm wandert: seine Volumen wandern mit
    trunk.position.x += 2;
    g.updateMatrixWorld(true);
    const moved = collector.collect(g, planet, PLANET_COVER_TOLERANCE).map((v) => v.center.clone());
    expect(collector.classifications).toBe(measured + 1);
    expect(moved.some((c) => !b.some((o) => o.distanceTo(c) < 1e-6))).toBe(true);
    // flache Schicht nur auf Wunsch
    flat.userData.shadowVolume = true;
    collector.collect(g, planet, PLANET_COVER_TOLERANCE);
    expect(collector.objects).toBe(3);
    expect(collector.collect(g, null, PLANET_COVER_TOLERANCE)).toEqual([]);
  });

  it('drosselt die Neuvermessung bewegter Objekte (Volumen hinken höchstens 0,1 s nach)', () => {
    const { g, trunk } = build();
    const collector = new PlanetVolumeCollector();
    collector.collect(g, planet, PLANET_COVER_TOLERANCE);
    const measured = collector.classifications;
    trunk.position.x += 1;
    g.updateMatrixWorld(true);
    collector.collect(g, planet, PLANET_COVER_TOLERANCE);
    expect(collector.classifications).toBe(measured);
  });

  it('planetShadowReceivers liefert die Volumen und die Bandtoleranz', () => {
    const { g } = build();
    const fake: ShadowPlanetLike = {
      options: { radius: R },
      field: { hMax: 2 },
      curvature: { value: 0 },
      lookDirLocal: { value: new Vector3(0, 1, 0) },
      surfaceRadius: () => R,
    };
    const r = planetShadowReceivers(fake, g, { coverTolerance: 2 });
    expect(r.sphere?.coverTolerance).toBe(2);
    expect(r.volumes!().length).toBeGreaterThan(2);
    expect(r.sphere?.coverAbove).toBe(0);
    expect(planetShadowReceivers(() => null, g).volumes!()).toEqual([]);
  });

  it('liest Höhen-Hinweise verteilter Schichten (Wald: kein Volumen, aber coverAbove)', () => {
    const { g } = build();
    const forest = g.getObjectByName('forest')!;
    forest.userData.shadowHeight = 3.5;
    const fake: ShadowPlanetLike = {
      options: { radius: R },
      field: { hMax: 2 },
      curvature: { value: 0 },
      lookDirLocal: { value: new Vector3(0, 1, 0) },
      surfaceRadius: () => R,
    };
    const r = planetShadowReceivers(fake, g, { coverAbove: 1.5 });
    r.volumes!();
    expect(r.sphere?.coverAbove).toBe(3.5);
    forest.visible = false;
    r.volumes!();
    expect(r.sphere?.coverAbove).toBe(1.5);
  });
});
