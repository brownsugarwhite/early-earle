import { BufferAttribute, BufferGeometry, FrontSide, Group, InstancedBufferAttribute, InstancedMesh, InterleavedBuffer, InterleavedBufferAttribute, type DataTexture } from 'three';
import { MeshBasicNodeMaterial, type Node } from 'three/webgpu';
import { Fn, attribute, buffer, cameraPosition, clamp, cross, dot, float, fwidth, int, max, modelWorldMatrixInverse, normalGeometry, normalize, positionGeometry, sin, smoothstep, sqrt, step, texture, time, varyingProperty, vec2, vec3, vec4 } from 'three/tsl';
import { BREATH_AMPLITUDE, faceCapFor, type BlobParams, type CreatureSpec, type FaceCap, type Rot3, type Vec3 } from '@ee/genome';
import { elementOf, type FloatNode, type IntNode, type Vec3Node, type Vec4Node } from '../common/tsl';
import { BLOB_STRIDE, BLOB_STYLE_STRIDE, BlobField, BlobStyleField, type BlobParamBlock } from '../blob/blobParamsUniforms';
import { compileSdf, createBlobQualityUniforms, type BlobQualityUniforms } from '../blob/compileSdf';
import { eyeFrame, shadeBlob, type BlobShadingUniforms } from '../blob/blobShading';
import { createEyeGlyphTexture } from '../blob/faceGlyph';
import { chainRotations, meshBody, skinChainsFor, type BodyMesh, type SkinChains } from './bodyMesh';

/**
 * Mesh path for the species (Kreaturen v3, iPhone/Mobil and the board): every species shape is meshed
 * once (`meshBody`, surface nets on the rest SDF) and drawn as one instanced mesh per species, skinned on
 * the GPU to the creature's posed spheres — per sphere a translation, a rotation about its centre (chain
 * spheres swing with their chain: snake spines, necks, trunks — `chainRotations`) and the radius change
 * (exact on sphere surfaces, blended across the fillets), then the body rotation, the squash and the
 * jiggle wave. Shading is the shared blob shading (`shadeBlob`) on the
 * same `BlobParamBlock` slot the fur/feather/particle passes read, so materials, species skins, the face
 * mask, ripples and coats look the same as on the other paths. Patterns are laid out on the *rest* body
 * (body-fixed like a texture: they ride along a bending snake), with the pattern frame chosen
 * internally (`frame`): bare animals shade in rest space (every pattern, the giraffe's patches too),
 * coated ones in the posed frame the fur/feather passes use. `add` rewrites the slot's pattern forward
 * axis, face mask and pattern rotation for that frame, so callers write the block exactly as for a
 * raymarched body (no `patternYaw`, no frame arguments).
 *
 * Meshes are cached per species shape and tier (`meshBodyKey`) at two sizes: `board` (≈ 900 vertices —
 * at board size a finer mesh only multiplies the 2×2-quad over-shading of tiny triangles) and `near`
 * (≈ 2 600, close-ups). Bodies are opaque (no alpha-to-coverage) so the tile GPU's hidden-surface
 * removal keeps working; gas stays on the raymarcher (`meshBodyEligible`).
 */

/** vec4 slots per instance in the skin block. 36 × 21 × 16 B = 12 096 B (< 16 KB UBO on WebGL2/iOS). */
export const SKIN_STRIDE = 21;
export const SkinField = {
  /** 0..15: xyz = posed − canonical rest centre (body frame), w = radius change (blob units). */
  DELTA: 0,
  /** 16..18: rows of the body rotation. */
  ROT: 16,
  /** 19: canonical rest centre of sphere 0 (xyz), w = 1 when patterns shade in the posed frame. */
  S0: 19,
  /** 20: the x/z shift `BlobParamBlock.write` applied to centre the instance box. */
  SHIFT: 20,
} as const;

/** Spheres per instance (the block's GPU limit); the rotation block holds one quaternion per sphere. */
const MAX_SPHERES = 16;

/** Vertex budget of a species mesh per level of detail. */
export const MESH_BODY_BUDGET = { board: 900, near: 2600 } as const;
export type MeshBodyLod = keyof typeof MESH_BODY_BUDGET;

export interface MeshBodyVariant {
  key: string;
  mesh: BodyMesh;
  chains: SkinChains;
  instanced: InstancedMesh;
  slots: InstancedBufferAttribute;
  count: number;
  /** Frames (`end` calls) since the variant last drew an instance. */
  idle: number;
}

export interface MeshBodiesOptions {
  uniforms: BlobShadingUniforms;
  quality?: BlobQualityUniforms;
  glyph?: DataTexture;
  /** Instances per species mesh (default: the block capacity). */
  capacity?: number;
}

/** Everything `add` needs about one creature this frame. */
export interface MeshBodyInstance {
  spec: CreatureSpec;
  /** Posed body parameters as written to the block (spheres rotated and displaced, not box-shifted). */
  params: BlobParams;
  /** Body rotation baked into `params.spheres` (chain bends are read from the posed spheres themselves). */
  rotation: Readonly<Rot3>;
  /** Pattern frame: 'rest' (bare bodies) or 'posed' (coats — the fur/feather passes work posed). Default `meshBodyFrame(spec)`. */
  frame?: 'rest' | 'posed' | undefined;
  /** Mesh size: 'board' (default, crowds and the board) or 'near' (large on screen). */
  lod?: MeshBodyLod | undefined;
}

/**
 * Shape key of a species mesh: species, leg style, sphere count and tier (proportions grow with the
 * tier; per-seed proportions become skin deltas) plus the level of detail.
 */
export function meshBodyKey(spec: CreatureSpec, lod: MeshBodyLod = 'board'): string {
  return `${spec.species}|${spec.legStyle}|${spec.body.spheres.length}|t${spec.tier}|${lod}`;
}

/** Bodies the mesh path draws: species animals with a solid body (gas and fire keep the raymarcher). */
export function meshBodyEligible(spec: CreatureSpec): boolean {
  return spec.species !== 'blob' && (spec.material === 'jelly' || spec.material === 'liquid');
}

/** Pattern frame of a creature on the mesh path: coats need the posed frame (fur/feather passes). */
export function meshBodyFrame(spec: CreatureSpec): 'rest' | 'posed' {
  return spec.skin.coat === 'bare' ? 'rest' : 'posed';
}

const _b: Vec3 = [0, 0, 0];

export class CreatureMeshBodies {
  readonly group = new Group();
  readonly data: Float32Array;
  readonly node: Node;
  /** Per slot and sphere the chain rotation (quaternion xyzw, body frame): 36 × 16 × 16 B = 9 216 B. */
  readonly rotData: Float32Array;
  readonly rotNode: Node;
  readonly material: MeshBasicNodeMaterial;
  readonly capacity: number;
  private readonly variants = new Map<string, MeshBodyVariant>();
  private readonly caps = new WeakMap<CreatureSpec, FaceCap | null>();
  private readonly bodyPosed: Vec3[] = Array.from({ length: MAX_SPHERES }, () => [0, 0, 0] as Vec3);

  constructor(
    readonly block: BlobParamBlock,
    opts: MeshBodiesOptions,
  ) {
    this.capacity = opts.capacity ?? block.capacity;
    this.data = new Float32Array(block.capacity * SKIN_STRIDE * 4);
    this.node = buffer(this.data, 'vec4', block.capacity * SKIN_STRIDE) as unknown as Node;
    this.rotData = new Float32Array(block.capacity * MAX_SPHERES * 4);
    this.rotNode = buffer(this.rotData, 'vec4', block.capacity * MAX_SPHERES) as unknown as Node;
    this.material = createMeshBodyMaterial(block, this.node, this.rotNode, opts.uniforms, opts.quality ?? createBlobQualityUniforms(), opts.glyph ?? createEyeGlyphTexture());
    this.group.name = 'creature-mesh-bodies';
  }

  /** The mesh variant of a spec — meshed on first use (≈ 5–30 ms), then shared by every creature of that shape. */
  variantFor(spec: CreatureSpec, lod: MeshBodyLod = 'board'): MeshBodyVariant {
    const key = meshBodyKey(spec, lod);
    let v = this.variants.get(key);
    if (v) return v;
    const mesh = meshBody(spec.body.spheres, spec.body.sminK, { maxVertices: MESH_BODY_BUDGET[lod] });
    // One interleaved vertex buffer (WebGPU allows 8 buffers; attributes are cheap): position, normal,
    // sphere indices + weights, the four rest offsets.
    const STRIDE = 26;
    const nv = mesh.vertexCount;
    const inter = new Float32Array(nv * STRIDE);
    for (let i = 0; i < nv; i++) {
      const o = i * STRIDE;
      inter.set(mesh.positions.subarray(i * 3, i * 3 + 3), o);
      inter.set(mesh.normals.subarray(i * 3, i * 3 + 3), o + 3);
      inter.set(mesh.skinIndex.subarray(i * 4, i * 4 + 4), o + 6);
      inter.set(mesh.skinWeight.subarray(i * 4, i * 4 + 4), o + 10);
      inter.set(mesh.skinOffset.subarray(i * 12, i * 12 + 12), o + 14);
    }
    const ib = new InterleavedBuffer(inter, STRIDE);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new InterleavedBufferAttribute(ib, 3, 0));
    geo.setAttribute('normal', new InterleavedBufferAttribute(ib, 3, 3));
    geo.setAttribute('skinIndex', new InterleavedBufferAttribute(ib, 4, 6));
    geo.setAttribute('skinWeight', new InterleavedBufferAttribute(ib, 4, 10));
    for (let q = 0; q < 4; q++) geo.setAttribute(`skinOffset${q}`, new InterleavedBufferAttribute(ib, 3, 14 + q * 3));
    geo.setIndex(new BufferAttribute(mesh.index, 1));
    geo.boundingSphere = null;
    const slots = new InstancedBufferAttribute(new Float32Array(this.capacity), 1);
    geo.setAttribute('skinSlot', slots);
    const instanced = new InstancedMesh(geo, this.material, this.capacity);
    instanced.frustumCulled = false;
    instanced.count = 0;
    instanced.name = `creature-body:${key}`;
    this.group.add(instanced);
    v = { key, mesh, chains: skinChainsFor(spec.skeleton, mesh.spheres), instanced, slots, count: 0, idle: 0 };
    this.variants.set(key, v);
    return v;
  }

  /**
   * Pre-meshes the shape of a spec so the first frame does not hitch — call it while loading a level for
   * every species/tier on the board and the tiers their merges produce.
   */
  prepare(spec: CreatureSpec, lod: MeshBodyLod = 'board'): void {
    this.variantFor(spec, lod);
  }

  begin(): void {
    for (const v of this.variants.values()) v.count = 0;
  }

  /**
   * Draws the creature whose posed body the caller wrote into block slot `slot` this frame (call it after
   * `block.write`): fills the slot's skin data (deltas against the species mesh, chain rotations, the body
   * rotation, the box shift), sets the slot's pattern frame (forward axis, face mask, pattern rotation) and adds an
   * instance to the species mesh. Returns false when the species mesh is full.
   */
  add(slot: number, inst: MeshBodyInstance): boolean {
    const v = this.variantFor(inst.spec, inst.lod);
    if (v.count >= this.capacity || slot < 0 || slot >= this.block.capacity) return false;
    const rest = v.mesh.spheres;
    const posed = inst.params.spheres;
    const r = inst.rotation;
    const n = Math.min(rest.length, posed.length, MAX_SPHERES);
    const d = this.data;
    const o = slot * SKIN_STRIDE * 4;
    // Body-frame posed centres (Rᵀ c') and their deltas against the canonical rest shape.
    const bp = this.bodyPosed;
    for (let i = 0; i < MAX_SPHERES; i++) {
      const k = o + (SkinField.DELTA + i) * 4;
      if (i >= n) {
        d[k] = d[k + 1] = d[k + 2] = d[k + 3] = 0;
        continue;
      }
      const c = posed[i]!.center;
      const b = bp[i]!;
      b[0] = r[0] * c[0] + r[3] * c[1] + r[6] * c[2];
      b[1] = r[1] * c[0] + r[4] * c[1] + r[7] * c[2];
      b[2] = r[2] * c[0] + r[5] * c[1] + r[8] * c[2];
      d[k] = b[0] - rest[i]!.center[0];
      d[k + 1] = b[1] - rest[i]!.center[1];
      d[k + 2] = b[2] - rest[i]!.center[2];
      d[k + 3] = posed[i]!.r - rest[i]!.r;
    }
    // Chain rotations (quaternion per sphere): spines, necks and trunks turn their spheres' surfaces.
    const ro = slot * MAX_SPHERES * 4;
    this.rotData.fill(0, ro, ro + MAX_SPHERES * 4);
    for (let i = 0; i < MAX_SPHERES; i++) this.rotData[ro + i * 4 + 3] = 1;
    chainRotations(v.chains, rest, bp, this.rotData, ro);
    for (let row = 0; row < 3; row++) {
      const k = o + (SkinField.ROT + row) * 4;
      d[k] = r[row * 3]!;
      d[k + 1] = r[row * 3 + 1]!;
      d[k + 2] = r[row * 3 + 2]!;
      d[k + 3] = 0;
    }
    const s0 = rest[0]!;
    const k0 = o + SkinField.S0 * 4;
    d[k0] = s0.center[0];
    d[k0 + 1] = s0.center[1];
    d[k0 + 2] = s0.center[2];
    const posedFrame = (inst.frame ?? meshBodyFrame(inst.spec)) === 'posed';
    d[k0 + 3] = posedFrame ? 1 : 0;
    this.patternFrame(slot, inst, posedFrame);
    // The same x/z box centre `BlobParamBlock.write` shifts the spheres by (posed spheres, breath margin).
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const s of posed) {
      const rr = s.r * (1 + BREATH_AMPLITUDE);
      minX = Math.min(minX, s.center[0] - rr);
      maxX = Math.max(maxX, s.center[0] + rr);
      minZ = Math.min(minZ, s.center[2] - rr);
      maxZ = Math.max(maxZ, s.center[2] + rr);
    }
    const ks = o + SkinField.SHIFT * 4;
    d[ks] = Number.isFinite(minX) ? (minX + maxX) / 2 : 0;
    d[ks + 1] = 0;
    d[ks + 2] = Number.isFinite(minZ) ? (minZ + maxZ) / 2 : 0;
    d[ks + 3] = 0;
    (v.slots.array as Float32Array)[v.count] = slot;
    v.count++;
    return true;
  }

  end(): void {
    for (const v of this.variants.values()) {
      v.instanced.count = v.count;
      // Empty species meshes leave the render list (no pipeline switch, no empty draw).
      v.instanced.visible = v.count > 0;
      v.idle = v.count > 0 ? 0 : v.idle + 1;
      if (v.count > 0) v.slots.needsUpdate = true;
    }
  }

  /**
   * Frees the species meshes that have not drawn for `maxIdleFrames` frames (e.g. after a level change);
   * returns how many were released. Prepared meshes count as idle from the first `end`.
   */
  prune(maxIdleFrames = 600): number {
    let n = 0;
    for (const [key, v] of this.variants) {
      if (v.idle <= maxIdleFrames) continue;
      this.group.remove(v.instanced);
      v.instanced.geometry.dispose();
      this.variants.delete(key);
      n++;
    }
    return n;
  }

  /** Instances drawn this frame. */
  get instanceCount(): number {
    let n = 0;
    for (const v of this.variants.values()) n += v.count;
    return n;
  }

  /** Vertices of all species meshes drawn this frame (perf HUD). */
  get vertexCount(): number {
    let n = 0;
    for (const v of this.variants.values()) n += v.count * v.mesh.vertexCount;
    return n;
  }

  get variantCount(): number {
    return this.variants.size;
  }

  dispose(): void {
    for (const v of this.variants.values()) {
      this.group.remove(v.instanced);
      v.instanced.geometry.dispose();
    }
    this.variants.clear();
    this.material.dispose();
  }

  /**
   * Pattern frame of the slot: the mesh shades patterns at the rest body (M = I) or the rigidly turned
   * rest body (M = R, coats), so the forward axis (EYE), the face mask and the pattern rotation must be
   * given in that frame — whatever the caller wrote (posed eye, neck-bent face mask, heading yaw).
   */
  private patternFrame(slot: number, inst: MeshBodyInstance, posedFrame: boolean): void {
    const spec = inst.spec;
    const r = inst.rotation;
    const turn = (x: number, y: number, z: number, out: Vec3): Vec3 => {
      if (posedFrame) {
        out[0] = r[0] * x + r[1] * y + r[2] * z;
        out[1] = r[3] * x + r[4] * y + r[5] * z;
        out[2] = r[6] * x + r[7] * y + r[8] * z;
      } else {
        out[0] = x;
        out[1] = y;
        out[2] = z;
      }
      const l = Math.hypot(out[0], out[1], out[2]) || 1;
      out[0] /= l;
      out[1] /= l;
      out[2] /= l;
      return out;
    };
    const bd = this.block.data;
    const e = spec.body.eye.dir;
    turn(e[0], e[1], e[2], _b);
    const ke = (slot * BLOB_STRIDE + BlobField.EYE) * 4;
    bd[ke] = _b[0];
    bd[ke + 1] = _b[1];
    bd[ke + 2] = _b[2];
    const sd = this.block.styleData;
    const so = slot * BLOB_STYLE_STRIDE;
    let cap = this.caps.get(spec);
    if (cap === undefined) {
      cap = faceCapFor(spec);
      this.caps.set(spec, cap);
    }
    if (cap) {
      turn(cap.dir[0], cap.dir[1], cap.dir[2], _b);
      const kf = (so + BlobStyleField.FACE) * 4;
      sd[kf] = _b[0];
      sd[kf + 1] = _b[1];
      sd[kf + 2] = _b[2];
      sd[kf + 3] = cap.radius;
    }
    // The pattern's own rotation: the mesh keeps patterns body-fixed itself (no heading yaw on top).
    sd[(so + BlobStyleField.MAT) * 4 + 3] = spec.skin.patternRotation;
  }
}

/**
 * The skinned body material: vertex skinning against the posed spheres (block) and the skin block, then
 * the shared blob shading. One material for every species mesh (the geometry differs, the program not).
 */
function createMeshBodyMaterial(block: BlobParamBlock, skin: Node, rot: Node, uniforms: BlobShadingUniforms, quality: BlobQualityUniforms, glyph: DataTexture): MeshBasicNodeMaterial {
  const sdf = compileSdf(block, quality);
  const material = new MeshBasicNodeMaterial();
  const vPos = varyingProperty('vec3', 'vCreatureBodyPos') as unknown as Vec3Node;
  const vQ = varyingProperty('vec3', 'vCreatureBodyQ') as unknown as Vec3Node;
  const vN = varyingProperty('vec3', 'vCreatureBodyN') as unknown as Vec3Node;
  const vCam = varyingProperty('vec3', 'vCreatureBodyCam') as unknown as Vec3Node;
  const vBase = varyingProperty('float', 'vCreatureBodyBase') as unknown as FloatNode;

  const skinAt = (sbase: IntNode, field: IntNode | number): Vec4Node => elementOf(skin, sbase.add(field as never));
  // v turned by the unit quaternion q: t = 2 q×v, v' = v + w t + q×t.
  const turnBy = (q: Vec4Node, v: Vec3Node): Vec3Node => {
    const t = cross(q.xyz, v).mul(2);
    return v.add(t.mul(q.w)).add(cross(q.xyz, t)) as unknown as Vec3Node;
  };

  material.positionNode = Fn(() => {
    const slotF = attribute('skinSlot', 'float') as unknown as FloatNode;
    const slot = int(slotF.add(0.5)).toVar();
    const base = slot.mul(BLOB_STRIDE).toVar();
    const sbase = slot.mul(SKIN_STRIDE).toVar();
    const rbase = slot.mul(MAX_SPHERES).toVar();
    const pRest = positionGeometry.toVar();
    const nRest = normalGeometry.toVar();
    const si = attribute('skinIndex', 'vec4') as unknown as Vec4Node;
    const sw = attribute('skinWeight', 'vec4') as unknown as Vec4Node;
    const shape = elementOf(block.node, base.add(BlobField.SHAPE)).toVar();
    const bub = elementOf(block.node, base.add(BlobField.BUBBLE)).toVar();
    const breath = sin(time.mul(shape.w.mul(Math.PI * 2)).add(bub.w)).mul(BREATH_AMPLITUDE).toVar();
    const disp = vec3(0, 0, 0).toVar();
    const dr = float(0).toVar();
    const nAcc = vec3(0, 0, 0).toVar();
    const lanes: Array<[FloatNode, FloatNode, number]> = [
      [si.x, sw.x, 0],
      [si.y, sw.y, 1],
      [si.z, sw.z, 2],
      [si.w, sw.w, 3],
    ];
    for (const [idxF, w, q] of lanes) {
      const idx = int(idxF.add(0.5));
      const dl = skinAt(sbase, idx.add(SkinField.DELTA));
      const sp = elementOf(block.node, base.add(idx));
      // Rotation skinning: the rest offset from this sphere turns with the sphere's chain rotation (tight
      // snake coils, neck arcs and a curled trunk tip keep round cross-sections and their caps).
      const off = attribute(`skinOffset${q}`, 'vec3') as unknown as Vec3Node;
      const qr = elementOf(rot, rbase.add(idx)).toVar();
      disp.addAssign(dl.xyz.add(turnBy(qr, off)).sub(off).mul(w));
      nAcc.addAssign(turnBy(qr, nRest).mul(w));
      // Radius change + breathing (the SDF scales every radius by the breath).
      dr.addAssign(dl.w.add(sp.w.mul(breath)).mul(w));
    }
    const nBody = normalize(nAcc.add(vec3(0, 1e-6, 0))).toVar();
    const pBody = pRest.add(disp).add(nBody.mul(dr)).toVar();
    const r0 = skinAt(sbase, SkinField.ROT).xyz;
    const r1 = skinAt(sbase, SkinField.ROT + 1).xyz;
    const r2 = skinAt(sbase, SkinField.ROT + 2).xyz;
    const shift = skinAt(sbase, SkinField.SHIFT).xyz;
    const pPosed = vec3(dot(r0, pBody), dot(r1, pBody), dot(r2, pBody)).sub(shift).toVar();
    const nPosed = normalize(vec3(dot(r0, nBody), dot(r1, nBody), dot(r2, nBody))).toVar();
    // Jiggle wave along the normal (same term as the SDF bodies).
    const anim = elementOf(block.node, base.add(BlobField.ANIM));
    pPosed.addAssign(nPosed.mul(sin(pRest.y.mul(7).sub(time.mul(16)).add(bub.w)).mul(anim.x).mul(0.05)));
    // Forward volume-preserving squash with the teardrop taper (inverse of `unsquash`).
    const sq = elementOf(block.node, base.add(BlobField.SQUASH)).toVar();
    const misc = elementOf(block.node, base.add(BlobField.MISC));
    const axis = normalize(sq.xyz.add(vec3(0, 1e-6, 0))).toVar();
    const along = max(float(1).add(sq.w), 0.2).toVar();
    const par = dot(pPosed, axis).toVar();
    const behind = clamp(par.negate(), 0, 1).toVar();
    const taperK = misc.y.mul(max(sq.w, 0));
    const perpS = sqrt(along).mul(float(1).add(taperK.mul(behind).mul(behind).mul(float(3).sub(behind.mul(2))))).toVar();
    const perp = pPosed.sub(axis.mul(par));
    const pSq = axis.mul(par.mul(along)).add(perp.div(perpS)).toVar();
    const nd = dot(nPosed, axis);
    const nSq = normalize(axis.mul(nd.div(along)).add(nPosed.sub(axis.mul(nd)).mul(perpS)));
    // Pattern space: the rest body (turned into the posed frame for coats), anchored at the drawn sphere 0.
    const s0rest = skinAt(sbase, SkinField.S0).toVar();
    const s0 = elementOf(block.node, base.add(BlobField.SPHERES));
    const rel = pRest.sub(s0rest.xyz).toVar();
    const relPosed = vec3(dot(r0, rel), dot(r1, rel), dot(r2, rel));
    const qShade = s0.xyz.add(relPosed.mul(s0rest.w).add(rel.mul(float(1).sub(s0rest.w))));
    const place = elementOf(block.node, base.add(BlobField.PLACE)).toVar();
    vPos.assign(pSq);
    vQ.assign(qShade);
    vN.assign(nSq);
    vBase.assign(float(base));
    const camObj = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz;
    vCam.assign(camObj.sub(place.xyz).div(place.w));
    return pSq.mul(place.w).add(place.xyz);
  })();

  const glyphNode = texture(glyph);
  const shaded = Fn(() => {
    const base = int(vBase.add(0.5)).toVar();
    const pos = vPos.toVar();
    const q = vQ.toVar();
    const n = normalize(normalize(vN).add(sdf.rippleSlope(q, base))).toVar();
    const rd = normalize(pos.sub(vCam)).toVar();
    // Painted eye (bodies whose eye modules were dropped): the same SDF glyph as the jiggle mesh.
    const f = eyeFrame(block, base, pos);
    const uv = vec2(f.u, f.v).div(f.size.mul(2.4)).add(0.5);
    const inRange = step(0, uv.x).mul(step(uv.x, 1)).mul(step(0, uv.y)).mul(step(uv.y, 1));
    const g = glyphNode.sample(uv).x;
    const w = fwidth(g).add(0.002);
    const eye = smoothstep(float(0.5).sub(w), float(0.5).add(w), g).mul(inRange).mul(f.facing);
    const eyeRing = smoothstep(float(0.36).sub(w), float(0.36).add(w), g).mul(float(1).sub(eye)).mul(inRange).mul(f.facing);
    const ripple = sdf.ripple(q, base).y;
    return shadeBlob(block, uniforms, { pos, q, n, rd, base, organ: float(0), bubble: float(0), eye, eyeRing, gas: float(0), ripple });
  })();
  // Opaque (solid bodies only, see `meshBodyEligible`): alpha-to-coverage would switch off the tile
  // GPU's hidden-surface removal and cost ≈ 1 ms for a full board.
  material.colorNode = shaded.xyz;
  material.transparent = false;
  material.depthWrite = true;
  material.side = FrontSide;
  material.name = 'ee-creature-mesh-body';
  return material;
}
