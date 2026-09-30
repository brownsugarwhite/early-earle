import { Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial, Vector3 } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import {
  attribute,
  cameraPosition,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  cos,
  cross,
  float,
  max,
  mix,
  modelWorldMatrix,
  normalize,
  positionGeometry,
  screenSize,
  select,
  sin,
  smoothstep,
  varying,
  vec4,
} from 'three/tsl';
import { steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from '../tsl';
import type { NeedleSite, Twig } from './shape';

/** Shared camera/sun uniforms of the billboards (dots, stars, blossoms, lace). */
export interface BillboardUniforms {
  camRight: UniformNode<'vec3', Vector3>;
  camUp: UniformNode<'vec3', Vector3>;
  projScaleY: TSLUniform;
  sunDirWorld: UniformNode<'vec3', Vector3>;
  collapsePx: TSLUniform;
  /** Crown growth 0..1 (instances appear by rank). */
  crown: TSLUniform;
  clock: TSLUniform;
}

/** Growth scale by rank: an instance grows in once the crown growth passes its rank (short, smooth). */
export function popScale(rank: FloatNode, crown: TSLUniform): FloatNode {
  const x = clamp(crown.mul(1.15).sub(rank).div(0.15), 0, 1);
  return x.mul(x).mul(x.mul(-2).add(3));
}

export interface LaceMeshOptions {
  twigs: Twig[];
  lookup: PaletteLookup;
  fog: FogSettings;
  fogLookup?: PaletteLookup;
  laceRow: number;
  bb: BillboardUniforms;
  /** Centre of the crown (outward direction of a twig → its lit side). */
  centre: Vector3;
  /** Position warp in tree space (planet curvature bend). */
  warp?: (p: Vec3Node) => Vec3Node;
}

export interface CountLodMesh {
  mesh: Mesh;
  count: number;
  /** Share of instances drawn 0..1 (instances are sorted: main structure first). */
  setShare(share: number): void;
  dispose(): void;
}

/**
 * Twig lace (image 04): every twig segment is one camera-facing ribbon (4 vertices), width tapering from r0 to r1
 * and never thinner than a hairline (0.75 px) → the lace stays a fine line drawing at any distance. Ink navy, a
 * shade lighter on the sun side. One draw call; the instance count is the LOD.
 */
export function createLaceMesh(o: LaceMeshOptions): CountLodMesh {
  const n = Math.max(1, o.twigs.length);
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const a = new Float32Array(n * 3);
  const b = new Float32Array(n * 3);
  const d = new Float32Array(n * 4);
  o.twigs.forEach((t, i) => {
    a.set([t.a.x, t.a.y, t.a.z], i * 3);
    b.set([t.b.x, t.b.y, t.b.z], i * 3);
    const out = Math.atan2(t.a.z - o.centre.z, t.a.x - o.centre.x);
    d.set([t.r0, t.r1, t.rank, out], i * 4);
  });
  geometry.setAttribute('twigA', new InstancedBufferAttribute(a, 3));
  geometry.setAttribute('twigB', new InstancedBufferAttribute(b, 3));
  geometry.setAttribute('twigData', new InstancedBufferAttribute(d, 4));
  const total = o.twigs.length;
  geometry.instanceCount = total;
  geometry.boundingSphere = null;

  const bb = o.bb;
  const A = attribute('twigA', 'vec3') as unknown as Vec3Node;
  const B = attribute('twigB', 'vec3') as unknown as Vec3Node;
  const D = attribute('twigData', 'vec4');
  const s = popScale(D.z as unknown as FloatNode, bb.crown);
  const along = positionGeometry.x;
  const warp = o.warp ?? ((p: Vec3Node) => p);
  const Aw = modelWorldMatrix.mul(vec4(warp(A), 1)).xyz;
  const Bw = modelWorldMatrix.mul(vec4(warp(A.add(B.sub(A).mul(s))), 1)).xyz;
  const P = mix(Aw, Bw, along);
  const seg = Bw.sub(Aw);
  const view = normalize(cameraPosition.sub(P));
  const side = normalize(cross(seg, view));
  const depth = cameraViewMatrix.mul(vec4(P, 1)).z.negate().max(0.05);
  const pxPerUnit = bb.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
  const worldScale = modelWorldMatrix.mul(vec4(1, 0, 0, 0)).xyz.length();
  const w = mix(D.x, D.y, along).mul(worldScale).mul(s);
  // a hairline at least (0.75 px), at most 0.25 % of the screen height: twigs close to the lens stay fine lines
  const width = max(w.min(screenSize.y.mul(0.0025).div(pxPerUnit)), float(0.75).div(pxPerUnit));
  const world = P.add(side.mul(width.mul(positionGeometry.y)));
  const material = new MeshBasicNodeMaterial();
  material.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(world, 1)));
  const outDir = modelWorldMatrix.mul(vec4(cos(D.w), 0.2, sin(D.w), 0)).xyz.normalize();
  const ndl = varying(outDir.dot(bb.sunDirWorld), 'vLaceNdl');
  const idx = smoothstep(-0.2, 0.5, ndl).mul(2.4);
  const col = mix(o.lookup.pal(idx.floor(), o.laceRow).rgb, o.lookup.pal(idx.floor().add(1), o.laceRow).rgb, select(idx.fract().greaterThan(0.5), float(1), float(0)));
  material.colorNode = steppedFog(col, o.fog, o.fogLookup ?? o.lookup);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'hero-lace';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return {
    mesh,
    count: total,
    setShare: (share) => {
      geometry.instanceCount = Math.max(0, Math.min(total, Math.round(total * share)));
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Starburst glyph: `rays` needles as thin triangles in three length classes (radius 1, XY plane). */
export function createStarGlyph(rays = 22): { position: Float32BufferAttribute; index: number[] } {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + (i % 3) * 0.07;
    const len = i % 3 === 0 ? 1 : i % 3 === 1 ? 0.72 : 0.5;
    const half = 0.026;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const base = pos.length / 3;
    // counter-clockwise seen from the viewer → front face towards the camera
    pos.push(c * 0.08 + s * half, s * 0.08 - c * half, 0, c * len, s * len, 0, c * 0.08 - s * half, s * 0.08 + c * half, 0);
    idx.push(base, base + 1, base + 2);
  }
  return { position: new Float32BufferAttribute(pos, 3), index: idx };
}

export interface StarMeshOptions {
  stars: NeedleSite[];
  lookup: PaletteLookup;
  fog: FogSettings;
  fogLookup?: PaletteLookup;
  starRow: number;
  bb: BillboardUniforms;
  seed: number;
  /** Position warp in tree space (planet curvature bend). */
  warp?: (p: Vec3Node) => Vec3Node;
}

/**
 * Golden needle stars (image 04/24): camera-facing starbursts at twig tips and forks. Colour runs continuously from
 * navy in the shade through bronze to pale gold in the sun; in the shade they also shrink (to 55 %) — every factor
 * is smooth, nothing pops. A barely visible drift of the rotation keeps them alive. One draw call; LOD by count.
 */
export function createStarMesh(o: StarMeshOptions): CountLodMesh {
  const n = Math.max(1, o.stars.length);
  const glyph = createStarGlyph();
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', glyph.position);
  geometry.setIndex(glyph.index);
  const pos = new Float32Array(n * 3);
  const nrm = new Float32Array(n * 3);
  const data = new Float32Array(n * 4);
  o.stars.forEach((s, i) => {
    pos.set([s.pos.x, s.pos.y, s.pos.z], i * 3);
    nrm.set([s.normal.x, s.normal.y, s.normal.z], i * 3);
    data.set([s.size, s.rank, ((i * 0.7548776662 + o.seed * 0.1) % 1) + 0.001, 0], i * 4);
  });
  geometry.setAttribute('starPos', new InstancedBufferAttribute(pos, 3));
  geometry.setAttribute('starNormal', new InstancedBufferAttribute(nrm, 3));
  geometry.setAttribute('starData', new InstancedBufferAttribute(data, 4));
  const total = o.stars.length;
  geometry.instanceCount = total;
  geometry.boundingSphere = null;

  const bb = o.bb;
  const P = attribute('starPos', 'vec3') as unknown as Vec3Node;
  const N = attribute('starNormal', 'vec3') as unknown as Vec3Node;
  const D = attribute('starData', 'vec4');
  const s = popScale(D.y as unknown as FloatNode, bb.crown);
  const worldC = modelWorldMatrix.mul(vec4((o.warp ?? ((p: Vec3Node) => p))(P), 1)).xyz;
  const nW = modelWorldMatrix.mul(vec4(N, 0)).xyz.normalize();
  const ndl = nW.dot(bb.sunDirWorld);
  const depth = cameraViewMatrix.mul(vec4(worldC, 1)).z.negate().max(0.05);
  const pxPerUnit = bb.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
  const worldScale = modelWorldMatrix.mul(vec4(1, 0, 0, 0)).xyz.length();
  const light = smoothstep(-0.35, 0.3, ndl);
  const sizeW = D.x.mul(worldScale).mul(s).mul(mix(float(0.55), float(1), light));
  const px = sizeW.mul(pxPerUnit);
  const collapse = smoothstep(bb.collapsePx.mul(1.2), bb.collapsePx.mul(2.6), px);
  // near fade: a star that would cover more than ~3 % of the screen height shrinks smoothly to nothing (the lens
  // passes through the lace without bursts in its face)
  const frac = px.div(screenSize.y);
  const near = float(1).sub(smoothstep(0.028, 0.055, frac));
  const ang = D.z.mul(Math.PI * 2).add(bb.clock.mul(D.z.sub(0.5)).mul(0.05));
  const ca = cos(ang);
  const sa = sin(ang);
  const gx = positionGeometry.x.mul(ca).sub(positionGeometry.y.mul(sa));
  const gy = positionGeometry.x.mul(sa).add(positionGeometry.y.mul(ca));
  const offset = bb.camRight.mul(gx).add(bb.camUp.mul(gy)).mul(sizeW.mul(collapse).mul(near));
  const material = new MeshBasicNodeMaterial();
  material.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(worldC.add(offset), 1)));
  const vLight = varying(light, 'vStarLight');
  const x = vLight.mul(4.99);
  const i0 = x.floor();
  const col = mix(o.lookup.pal(i0, o.starRow).rgb, o.lookup.pal(i0.add(1).min(5), o.starRow).rgb, select(x.fract().greaterThan(0.5), float(1), float(0)));
  material.colorNode = steppedFog(col, o.fog, o.fogLookup ?? o.lookup);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'hero-stars';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return {
    mesh,
    count: total,
    setShare: (share) => {
      geometry.instanceCount = Math.max(0, Math.min(total, Math.round(total * share)));
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
