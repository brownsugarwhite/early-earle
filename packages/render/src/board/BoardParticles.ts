import { CircleGeometry, DynamicDrawUsage, Group, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, MeshBasicNodeMaterial, type BufferGeometry } from 'three/webgpu';
import { attribute, clamp, float, mix, positionGeometry, sin, step, vec3 } from 'three/tsl';
import { aaStep, type FloatNode, type Vec3Node, type Vec4Node } from '../earle/tsl';
import { hexToLinear } from '../common/tsl';

export type ParticleKind = 'droplet' | 'spore';

interface ParticlePool {
  mesh: InstancedMesh;
  start: InstancedBufferAttribute;
  vel: InstancedBufferAttribute;
  info: InstancedBufferAttribute;
  color: InstancedBufferAttribute;
  next: number;
  capacity: number;
  dirty: boolean;
  lastEnd: number;
}

/**
 * Two instanced particle systems, one draw call each: droplets (ballistic, shrink as they fall) for merges,
 * splats and bursts, and spores (slow drifting hexagons that fade in and out) for heals, collects and
 * puffs. The CPU only writes start/velocity/time into a ring buffer; the GPU integrates against the
 * board's wall clock, so a hitch never stalls the fountain.
 */
export class BoardParticles {
  readonly group = new Group();
  private readonly pools: Record<ParticleKind, ParticlePool>;
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: MeshBasicNodeMaterial[] = [];
  enabled = true;

  constructor(
    private readonly clock: FloatNode,
    capacity: { droplet: number; spore: number } = { droplet: 320, spore: 224 },
  ) {
    this.group.name = 'board-particles';
    const dropletGeo = new IcosahedronGeometry(0.5, 0);
    const sporeGeo = new CircleGeometry(0.5, 6).rotateX(-Math.PI / 2);
    this.geometries.push(dropletGeo, sporeGeo);
    this.pools = {
      droplet: this.createPool('droplet', dropletGeo, capacity.droplet),
      spore: this.createPool('spore', sporeGeo, capacity.spore),
    };
  }

  private createPool(kind: ParticleKind, geometry: BufferGeometry, capacity: number): ParticlePool {
    const start = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(DynamicDrawUsage);
    const vel = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(DynamicDrawUsage);
    const info = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(DynamicDrawUsage);
    const color = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(DynamicDrawUsage);
    // Never born: t0 far in the future keeps every slot collapsed until it is emitted.
    for (let i = 0; i < capacity; i++) (info.array as Float32Array)[i * 4] = 1e9;
    geometry.setAttribute('pStart', start);
    geometry.setAttribute('pVel', vel);
    geometry.setAttribute('pInfo', info);
    geometry.setAttribute('pColor', color);

    const s = attribute('pStart', 'vec3') as Vec3Node;
    const v = attribute('pVel', 'vec3') as Vec3Node;
    const inf = attribute('pInfo', 'vec4') as Vec4Node;
    const c = attribute('pColor', 'vec3') as Vec3Node;
    const t = this.clock;
    const age = t.sub(inf.x);
    const tau = clamp(age.div(inf.y.max(0.01)), 0, 1);
    const alive = step(float(0), age).mul(step(tau, float(0.999)));
    const ts = tau.mul(inf.y);
    const pg = positionGeometry as unknown as Vec3Node;
    const material = new MeshBasicNodeMaterial();
    if (kind === 'droplet') {
      const pos = s.add(v.mul(ts)).add(vec3(0, ts.mul(ts).mul(-4.8), 0));
      const scale = inf.z.mul(tau.oneMinus().pow(0.55)).mul(alive);
      material.positionNode = pos.add(pg.mul(scale));
      // Lower half a value step darker so the drops read as little spheres.
      material.colorNode = mix(c.mul(0.55), c, aaStep(0.0, pg.y));
    } else {
      const sway = vec3(sin(ts.mul(5).add(inf.w)).mul(0.06), 0, sin(ts.mul(4.2).add(inf.w.mul(1.7))).mul(0.06));
      const pos = s.add(v.mul(ts)).add(sway);
      const scale = inf.z.mul(sin(tau.mul(Math.PI)).pow(0.6)).mul(alive);
      material.positionNode = pos.add(pg.mul(scale));
      material.colorNode = c.mul(1.08);
    }
    material.transparent = false;
    material.depthWrite = true;
    const mesh = new InstancedMesh(geometry, material, capacity);
    mesh.name = `board-particles-${kind}`;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.count = 0;
    mesh.visible = false;
    this.group.add(mesh);
    this.materials.push(material);
    return { mesh, start, vel, info, color, next: 0, capacity, dirty: false, lastEnd: -1 };
  }

  /** Emits one particle at `now` (board clock seconds). */
  emit(kind: ParticleKind, now: number, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: string, phase = 0): void {
    if (!this.enabled) return;
    const p = this.pools[kind];
    const i = p.next;
    p.next = (i + 1) % p.capacity;
    (p.start.array as Float32Array).set([x, y, z], i * 3);
    (p.vel.array as Float32Array).set([vx, vy, vz], i * 3);
    (p.info.array as Float32Array).set([now, life, size, phase], i * 4);
    const [r, g, b] = hexToLinear(color);
    (p.color.array as Float32Array).set([r, g, b], i * 3);
    p.dirty = true;
    p.lastEnd = Math.max(p.lastEnd, now + life);
  }

  /**
   * Fountain of `n` particles from a point (`up` = launch speed, `spread` = sideways speed). `ring` > 0 emits
   * from a circle of that radius around the point, each particle moving outward (splashes around a body).
   */
  burst(kind: ParticleKind, now: number, x: number, y: number, z: number, n: number, opts: { up?: number; spread?: number; life?: number; size?: number; colors: string[]; seed?: number; ring?: number }): void {
    const up = opts.up ?? 1.6;
    const spread = opts.spread ?? 0.9;
    const life = opts.life ?? 0.7;
    const size = opts.size ?? 0.05;
    let seed = (opts.seed ?? 1) * 9301 + 49297;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const sp = spread * (0.3 + rnd() * 0.7);
      const vy = up * (0.5 + rnd() * 0.5);
      const col = opts.colors[Math.floor(rnd() * opts.colors.length)] ?? '#ffffff';
      const ring = opts.ring ?? 0;
      this.emit(kind, now, x + Math.cos(a) * ring, y, z + Math.sin(a) * ring, Math.cos(a) * sp, vy, Math.sin(a) * sp, life * (0.7 + rnd() * 0.6), size * (0.6 + rnd() * 0.8), col, rnd() * 6.28);
    }
  }

  /** Uploads dirty buffers; hides a system once every particle in it has died. */
  update(now: number): void {
    for (const p of Object.values(this.pools)) {
      if (p.dirty) {
        p.start.needsUpdate = true;
        p.vel.needsUpdate = true;
        p.info.needsUpdate = true;
        p.color.needsUpdate = true;
        p.dirty = false;
        p.mesh.count = p.capacity;
      }
      const alive = now <= p.lastEnd;
      p.mesh.visible = alive;
      if (!alive) p.mesh.count = 0;
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.group.removeFromParent();
  }
}
