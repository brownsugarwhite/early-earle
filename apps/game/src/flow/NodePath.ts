import { Color, CylinderGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshBasicNodeMaterial, Quaternion, Raycaster, Vector3 } from 'three/webgpu';
import type { BufferGeometry, Camera } from 'three/webgpu';
import { color, mix, positionLocal, smoothstep } from 'three/tsl';
import type { PathLayout } from './path';

/** Small inlaid stones (Earle: tiny scale figures in a big landscape), not coins that dominate the map. */
export const NODE_RADIUS = 0.3;
const NODE_HEIGHT = 0.07;
const RING_WIDTH = 0.085; // ≈ 11 % of the ring's outer diameter: the one allowed fat outline
/** Invisible pick disc: the tap target stays generous (≈ the old 0.55 puck) although the stone is small. */
const PICK_RADIUS = 0.6;
const PICK_LAYER = 30;
const PINK = '#e5aed4';
const PAPER = '#f7f6d8';
const INK = '#242c0b';
const GRADIENT_A = '#ff77ae'; // splash outline top
const GRADIENT_B = '#b668d9'; // splash outline bottom

const _Y = new Vector3(0, 1, 0);
const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _n = new Vector3();

/**
 * Level nodes on the map: small inlaid stones (instanced, flush with the ground), an ink offset shadow per stone in
 * the sun direction, a fine dotted path between them and — only on the current node — the fat pink→violet ring.
 * Tap targets stay generous through invisible pick discs on a layer the camera never renders.
 * No outlines anywhere else; edges come from value contrast alone.
 */
export class NodePath {
  readonly group = new Group();
  readonly discs: InstancedMesh;
  private readonly shadows: InstancedMesh;
  private readonly dots: InstancedMesh;
  private readonly ring: Mesh;
  /** Pick proxies on a layer the camera never renders (no draw call). */
  private readonly hits: InstancedMesh;
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Array<{ dispose(): void }> = [];
  private readonly raycaster = new Raycaster();
  private current = 0;
  private done = 0;

  constructor(
    readonly layout: PathLayout,
    /** Direction to the sun in the group's local space (for the offset shadows). */
    sunDirLocal: Vector3,
    /** Optional hooks, e.g. to drive the planet's growth from the completed node count. */
    private readonly hooks: { onProgress?: (current: number, done: number) => void } = {},
  ) {
    this.group.name = 'NodePath';
    const n = Math.max(1, layout.nodes.length);

    const discGeo = new CylinderGeometry(NODE_RADIUS, NODE_RADIUS, NODE_HEIGHT, 24);
    discGeo.translate(0, NODE_HEIGHT / 2 + 0.015, 0);
    const discMat = new MeshBasicMaterial({ color: '#ffffff' });
    this.discs = new InstancedMesh(discGeo, discMat, n);
    this.discs.name = 'nodes';
    this.discs.frustumCulled = false;

    const shadowGeo = new CylinderGeometry(NODE_RADIUS * 1.02, NODE_RADIUS * 1.02, 0.03, 24);
    shadowGeo.translate(0, 0.02, 0);
    const shadowMat = new MeshBasicMaterial({ color: INK });
    this.shadows = new InstancedMesh(shadowGeo, shadowMat, n);
    this.shadows.name = 'node-shadows';
    this.shadows.frustumCulled = false;

    const sun = sunDirLocal.clone().normalize();
    layout.nodes.forEach((node, i) => {
      _n.set(node.normal[0], node.normal[1], node.normal[2]).normalize();
      _q.setFromUnitVectors(_Y, _n);
      _p.set(node.position[0], node.position[1], node.position[2]);
      _s.setScalar(1);
      _m.compose(_p, _q, _s);
      this.discs.setMatrixAt(i, _m);
      // Shadow: offset away from the sun along the tangent plane (echoes the world's long shadows).
      const away = sun.clone().addScaledVector(_n, -sun.dot(_n)).normalize().multiplyScalar(-NODE_RADIUS * 0.55);
      _p.add(away);
      _m.compose(_p, _q, _s);
      this.shadows.setMatrixAt(i, _m);
    });
    this.discs.instanceMatrix.needsUpdate = true;
    this.shadows.instanceMatrix.needsUpdate = true;

    const dotGeo = new CylinderGeometry(0.06, 0.06, 0.04, 8);
    dotGeo.translate(0, 0.03, 0);
    const dotMat = new MeshBasicMaterial({ color: PAPER });
    this.dots = new InstancedMesh(dotGeo, dotMat, Math.max(1, layout.dots.length));
    this.dots.name = 'path-dots';
    this.dots.frustumCulled = false;
    layout.dots.forEach((dot, i) => {
      _n.set(dot.normal[0], dot.normal[1], dot.normal[2]);
      _q.setFromUnitVectors(_Y, _n);
      _p.set(dot.position[0], dot.position[1], dot.position[2]);
      _m.compose(_p, _q, _s.setScalar(1));
      this.dots.setMatrixAt(i, _m);
    });
    this.dots.count = layout.dots.length;
    this.dots.instanceMatrix.needsUpdate = true;

    // Ring: a wider puck under the current disc. Only the annulus and its side show → a fat, hard-edged,
    // two-colour gradient outline (pink → violet along the path direction).
    const ringGeo = new CylinderGeometry(NODE_RADIUS + RING_WIDTH, NODE_RADIUS + RING_WIDTH, NODE_HEIGHT, 40);
    ringGeo.translate(0, NODE_HEIGHT / 2 + 0.01, 0);
    const ringMat = new MeshBasicNodeMaterial();
    const t = smoothstep(-(NODE_RADIUS + RING_WIDTH), NODE_RADIUS + RING_WIDTH, positionLocal.z.negate().add(positionLocal.x.mul(0.35)));
    ringMat.colorNode = mix(color(GRADIENT_A), color(GRADIENT_B), t);
    this.ring = new Mesh(ringGeo, ringMat);
    this.ring.name = 'current-ring';
    this.ring.frustumCulled = false;

    const hitGeo = new CylinderGeometry(PICK_RADIUS, PICK_RADIUS, 0.3, 12);
    hitGeo.translate(0, 0.15, 0);
    const hitMat = new MeshBasicMaterial();
    this.hits = new InstancedMesh(hitGeo, hitMat, n);
    this.hits.name = 'node-hits';
    this.hits.frustumCulled = false;
    this.hits.layers.set(PICK_LAYER);
    this.raycaster.layers.enable(PICK_LAYER);
    layout.nodes.forEach((node, i) => {
      _n.set(node.normal[0], node.normal[1], node.normal[2]).normalize();
      _q.setFromUnitVectors(_Y, _n);
      _p.set(node.position[0], node.position[1], node.position[2]);
      _m.compose(_p, _q, _s.setScalar(1));
      this.hits.setMatrixAt(i, _m);
    });
    this.hits.instanceMatrix.needsUpdate = true;

    this.geometries.push(discGeo, shadowGeo, dotGeo, ringGeo, hitGeo);
    this.materials.push(discMat, shadowMat, dotMat, ringMat, hitMat);
    this.group.add(this.hits);
    this.group.add(this.shadows, this.dots, this.ring, this.discs);
    this.setProgress(0, 0);
  }

  /** `current` = node with the ring; nodes < `done` are coloured as completed. */
  setProgress(current: number, done: number): void {
    this.current = current;
    this.done = done;
    const c = new Color();
    this.layout.nodes.forEach((_, i) => {
      c.set(i < done || i === current ? PINK : PAPER);
      this.discs.setColorAt(i, c);
    });
    if (this.discs.instanceColor) this.discs.instanceColor.needsUpdate = true;
    const node = this.layout.nodes[current];
    if (node) {
      _n.set(node.normal[0], node.normal[1], node.normal[2]).normalize();
      this.ring.quaternion.setFromUnitVectors(_Y, _n);
      this.ring.position.set(node.position[0], node.position[1], node.position[2]);
    }
    this.hooks.onProgress?.(current, done);
  }

  get currentIndex(): number {
    return this.current;
  }

  get doneCount(): number {
    return this.done;
  }

  /** Slow breathing of the ring (always alive). */
  update(elapsed: number): void {
    const s = 1 + 0.035 * Math.sin(elapsed * 2.4);
    this.ring.scale.set(s, 1, s);
  }

  /** Node index under a screen position (NDC), or null. */
  pick(ndcX: number, ndcY: number, camera: Camera): number | null {
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY } as never, camera);
    // Generous tap target: the ring around the current node counts as the node too.
    const hits = this.raycaster.intersectObjects([this.hits, this.ring], false);
    for (const hit of hits) {
      if (hit.object === this.ring) return this.current;
      if (hit.instanceId !== undefined) return hit.instanceId;
    }
    return null;
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.group.removeFromParent();
  }
}
