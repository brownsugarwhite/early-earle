import { Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial } from 'three/webgpu';
import {
  attribute,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  cos,
  float,
  fract,
  max,
  mix,
  modelWorldMatrix,
  positionGeometry,
  screenSize,
  sin,
  smoothstep,
  sqrt,
  step,
  varying,
  vec4,
} from 'three/tsl';
import type { Vec3 } from '@ee/world';
import { steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from '../tsl';
import { popScale, type BillboardUniforms } from '../tree/branches';

/** Goldener Winkel (rad) und goldener Schnitt. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const PHI = (1 + Math.sqrt(5)) / 2;
/** Periode einer Drehung um den goldenen Winkel (s) und der Atmung (s). */
export const SPIN_PERIOD = 21;
export const BREATH_PERIOD = 9;

export interface BlossomSeed {
  /** Position relativ zum Hüllzentrum (Baumkoordinaten). */
  rel: Vec3;
  hull: Vec3;
  normal: Vec3;
  size: number;
  /** Wachstumsrang der Kuppel (0 = sofort sichtbar). */
  rank: number;
  hash: number;
  /** Blütenblätter 5–8. */
  petals: number;
  /** Farbindex 0..7 (Blüte und Mitte teilen den Index). */
  color: number;
}

export interface BlossomMeshOptions {
  seeds: BlossomSeed[];
  lookup: PaletteLookup;
  fog: FogSettings;
  /** Atlas der Nebelzeile (Standard: `lookup`). */
  fogLookup?: PaletteLookup;
  petalRow: number;
  centerRow: number;
  bb: BillboardUniforms;
  /** Blütezeit 0 (Knospen) .. 1 (volle Blüte). */
  bloom: TSLUniform;
}

/** Blütengeometrie: 8 Blätter à 6 Vertices (Fächer) plus Sechseck-Mitte; `petal` = Blattindex, 8 = Mitte. */
export function createBlossomGeometry(): { position: Float32BufferAttribute; petal: Float32BufferAttribute; index: number[] } {
  const pos: number[] = [];
  const petal: number[] = [];
  const idx: number[] = [];
  const shape: Array<[number, number]> = [
    [0.1, 0],
    [0.36, 0.27],
    [0.72, 0.3],
    [1.0, 0],
    [0.72, -0.3],
    [0.36, -0.27],
  ];
  for (let i = 0; i < 8; i++) {
    const b = pos.length / 3;
    for (const [x, y] of shape) {
      pos.push(x, y, 0);
      petal.push(i);
    }
    // Umriss läuft im Uhrzeigersinn → Fächer umgekehrt indizieren, damit die Vorderseite zur Kamera zeigt
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2, b, b + 4, b + 3, b, b + 5, b + 4);
  }
  const b = pos.length / 3;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    pos.push(Math.cos(a), Math.sin(a), 0);
    petal.push(8);
  }
  idx.push(b, b + 1, b + 2, b, b + 2, b + 3, b, b + 3, b + 4, b, b + 4, b + 5);
  return { position: new Float32BufferAttribute(pos, 3), petal: new Float32BufferAttribute(petal, 1), index: idx };
}

/**
 * Alle Blüten in einem Draw Call: kamerazugewandte Rosetten aus 5–8 Blättern in Juwelentönen. Zen-Loops:
 * - **Phyllotaxis-Öffnung**: in der Knospe sitzen die Blätter auf der Vogel-Spirale (Winkel i·137,5°, Radius ∝ √i)
 *   und erscheinen in dieser Reihenfolge; mit der Blütezeit wandern sie in den regelmäßigen Kranz.
 * - **Drehung um den goldenen Winkel** je 21 s, Tempo je Blüte über φ verstimmt.
 * - **Lissajous-Schwingen** der Mitte mit Frequenzverhältnis 1 : φ (quasiperiodisch, nie synchron).
 * - **Atmen** der Größe mit Phasen `fract(i·φ)` → die ganze Krone liest sich als ein ruhiger Loop ohne Schwebung.
 */
export function createBlossomMesh(o: BlossomMeshOptions): { mesh: Mesh; count: number; dispose(): void } {
  const n = Math.max(1, o.seeds.length);
  const glyph = createBlossomGeometry();
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', glyph.position);
  geometry.setAttribute('petal', glyph.petal);
  geometry.setIndex(glyph.index);
  const rel = new Float32Array(n * 3);
  const hull = new Float32Array(n * 3);
  const nrm = new Float32Array(n * 3);
  const data = new Float32Array(n * 4);
  const col = new Float32Array(n);
  o.seeds.forEach((s, i) => {
    rel.set(s.rel, i * 3);
    hull.set(s.hull, i * 3);
    nrm.set(s.normal, i * 3);
    data[i * 4] = s.size;
    data[i * 4 + 1] = s.rank;
    data[i * 4 + 2] = s.hash;
    data[i * 4 + 3] = s.petals;
    col[i] = s.color;
  });
  if (o.seeds.length === 0) nrm[1] = 1;
  geometry.setAttribute('bRel', new InstancedBufferAttribute(rel, 3));
  geometry.setAttribute('bHull', new InstancedBufferAttribute(hull, 3));
  geometry.setAttribute('bNormal', new InstancedBufferAttribute(nrm, 3));
  geometry.setAttribute('bData', new InstancedBufferAttribute(data, 4));
  geometry.setAttribute('bColor', new InstancedBufferAttribute(col, 1));
  geometry.instanceCount = o.seeds.length;
  geometry.boundingSphere = null;

  const bb = o.bb;
  const R = attribute('bRel', 'vec3') as unknown as Vec3Node;
  const Hc = attribute('bHull', 'vec3') as unknown as Vec3Node;
  const N = attribute('bNormal', 'vec3') as unknown as Vec3Node;
  const D = attribute('bData', 'vec4');
  const C = attribute('bColor', 'float') as unknown as FloatNode;
  const petal = attribute('petal', 'float') as unknown as FloatNode;
  const size = D.x;
  const h = D.z;
  const nPetals = D.w;
  const t = bb.clock;

  const s = popScale(D.y, bb.crown);
  const centre = Hc.add(R.mul(s));
  const worldC = modelWorldMatrix.mul(vec4(centre, 1)).xyz;
  const nW = modelWorldMatrix.mul(vec4(N, 0)).xyz.normalize();
  const ndl = nW.dot(bb.sunDirWorld);
  const viewC = cameraViewMatrix.mul(vec4(worldC, 1));
  const depth = viewC.z.negate().max(0.05);
  const pxPerUnit = bb.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
  const px = size.mul(s).mul(pxPerUnit);
  const visible = step(bb.collapsePx.mul(1.8), px);

  // Blütezeit je Blüte (Hash verschiebt den Einsatz), weich
  const b = smoothstep(0, 1, clamp(o.bloom.sub(h.mul(0.35)).div(0.65), 0, 1));
  const breath = sin(t.mul((Math.PI * 2) / BREATH_PERIOD).add(fract(h.mul(PHI)).mul(Math.PI * 2))).mul(0.07).add(1);
  const spin = t.mul(GOLDEN_ANGLE / SPIN_PERIOD).mul(fract(h.mul(PHI * PHI)).mul(0.3).add(1)).add(h.mul(Math.PI * 2));
  const i = petal;
  const isCenter = step(7.5, i);
  const exists = step(i, nPetals.sub(0.5)); // i < n
  const reveal = clamp(b.mul(nPetals.sub(1.5)).add(2).sub(i).mul(1.6), 0, 1).mul(exists);
  const angle = mix(i.mul(GOLDEN_ANGLE), i.mul(float(Math.PI * 2).div(nPetals)), b).add(spin);
  const rad = size.mul(mix(sqrt(i.add(1)).div(sqrt(nPetals)).mul(0.28), float(0.1), b));
  const len = size.mul(mix(float(0.35), float(1), b)).mul(reveal).mul(breath);
  const wid = size.mul(mix(float(0.6), float(1), b)).mul(reveal).mul(breath);
  const pg = positionGeometry;
  const qxPetal = rad.add(pg.x.mul(len));
  const qyPetal = pg.y.mul(wid);
  const cSize = size.mul(0.22).mul(mix(float(0.6), float(1), b)).mul(breath);
  const qx = mix(qxPetal, pg.x.mul(cSize), isCenter);
  const qy = mix(qyPetal, pg.y.mul(cSize), isCenter);
  const ca = cos(angle);
  const sa = sin(angle);
  const ox = qx.mul(ca).sub(qy.mul(sa));
  const oy = qx.mul(sa).add(qy.mul(ca));
  const swx = sin(t.mul(0.53).add(h.mul(Math.PI * 2))).mul(size.mul(0.12));
  const swy = sin(t.mul(0.53 * PHI).add(h.mul(3))).mul(size.mul(0.12));
  const sizeGuard = max(s, float(0)); // Rang-Pop wirkt bereits über `s` in rel; Größe folgt
  const offset = bb.camRight.mul(ox.add(swx)).add(bb.camUp.mul(oy.add(swy))).mul(visible).mul(sizeGuard);
  const world = worldC.add(offset);

  const material = new MeshBasicNodeMaterial();
  material.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(world, 1)));
  const vCenter = varying(isCenter, 'vBlossomCenter');
  const vShade = varying(mix(float(0.5), float(1), smoothstep(-0.2, 0.4, ndl)), 'vBlossomShade');
  const vColor = varying(C, 'vBlossomColor');
  const petalCol = o.lookup.pal(vColor, o.petalRow).rgb;
  const centerCol = o.lookup.pal(vColor, o.centerRow).rgb;
  material.colorNode = steppedFog(mix(petalCol, centerCol, vCenter).mul(vShade), o.fog, o.fogLookup ?? o.lookup);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'hero-blossoms';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return {
    mesh,
    count: o.seeds.length,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
