import { CylinderGeometry, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial, Vector3 } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import {
  abs,
  attribute,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  cos,
  cross,
  float,
  length,
  max,
  mix,
  modelViewMatrix,
  modelWorldMatrix,
  normalize,
  positionGeometry,
  screenSize,
  select,
  sin,
  step,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from '../tsl';
import { createBarkShade } from './bark';
import { InkMaterial } from './inkMaterial';
import type { BranchSegment } from './lsystem';

/** Gemeinsame Kamera-/Sonnen-Uniforms der Billboards (Punkte, Glyphen, Sterne, Blüten). */
export interface BillboardUniforms {
  camRight: UniformNode<'vec3', Vector3>;
  camUp: UniformNode<'vec3', Vector3>;
  projScaleY: TSLUniform;
  sunDirWorld: UniformNode<'vec3', Vector3>;
  collapsePx: TSLUniform;
  /** Kronenwachstum 0..1 (Instanzen erscheinen nach Rang). */
  crown: TSLUniform;
  clock: TSLUniform;
}

/** Pop-Skalierung nach Rang: erscheint, sobald das Kronenwachstum den Rang überschreitet (kurzes Aufskalieren). */
export function popScale(rank: FloatNode, crown: TSLUniform): FloatNode {
  return clamp(crown.mul(1.15).sub(rank).div(0.15), 0, 1);
}

export interface BranchMeshOptions {
  segments: BranchSegment[];
  lookup: PaletteLookup;
  fog: FogSettings;
  /** Atlas der Nebelzeile (Standard: `lookup`). */
  fogLookup?: PaletteLookup;
  rows: { bark: number; lichen: number };
  clock: TSLUniform;
  seed: number;
}

/**
 * Äste als ein instanziertes, konisches Segment: Position und Normale entstehen im Vertex-Shader aus
 * Anfang/Ende/Radien je Instanz (kein Instanz-Matrix-Umweg, glatte Verjüngung über Segmentketten hinweg).
 * Rindenshader wie der Stamm, mit einer Flechtenader und Versatz je Segment.
 */
export function createBranchMesh(o: BranchMeshOptions): { mesh: Mesh; count: number; dispose(): void } {
  const n = Math.max(1, o.segments.length);
  const cyl = new CylinderGeometry(1, 1, 1, 7, 1, true);
  cyl.translate(0, 0.5, 0);
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', cyl.getAttribute('position'));
  geometry.setAttribute('uv', cyl.getAttribute('uv'));
  geometry.setIndex(cyl.getIndex());
  const a = new Float32Array(n * 3);
  const b = new Float32Array(n * 3);
  const r = new Float32Array(n * 2);
  const data = new Float32Array(n * 4);
  let vAcc = 0;
  o.segments.forEach((s, i) => {
    a[i * 3] = s.a.x;
    a[i * 3 + 1] = s.a.y;
    a[i * 3 + 2] = s.a.z;
    b[i * 3] = s.b.x;
    b[i * 3 + 1] = s.b.y;
    b[i * 3 + 2] = s.b.z;
    r[i * 2] = s.r0;
    r[i * 2 + 1] = s.r1;
    const len = s.a.distanceTo(s.b);
    // u-Versatz je Segment (Bänder laufen nicht identisch), v skaliert mit der Länge relativ zu ~4 Einheiten
    data[i * 4] = ((i * 0.618) % 1) * 0.5;
    data[i * 4 + 1] = len / 4;
    data[i * 4 + 2] = (vAcc % 7) / 7;
    data[i * 4 + 3] = s.level;
    vAcc += len;
  });
  geometry.setAttribute('segA', new InstancedBufferAttribute(a, 3));
  geometry.setAttribute('segB', new InstancedBufferAttribute(b, 3));
  geometry.setAttribute('segR', new InstancedBufferAttribute(r, 2));
  geometry.setAttribute('segData', new InstancedBufferAttribute(data, 4));
  geometry.instanceCount = o.segments.length;
  geometry.boundingSphere = null;

  const A = attribute('segA', 'vec3') as unknown as Vec3Node;
  const B = attribute('segB', 'vec3') as unknown as Vec3Node;
  const R = attribute('segR', 'vec2');
  const D = attribute('segData', 'vec4');
  const dv = B.sub(A);
  const len = length(dv).max(1e-4);
  const d = dv.div(len);
  const ref = select(abs(d.y).lessThan(0.9), vec3(0, 1, 0), vec3(1, 0, 0));
  const right = normalize(cross(ref, d));
  const fwd = cross(d, right);
  const pg = positionGeometry;
  const radius = mix(R.x, R.y, pg.y);
  const nLocal = right.mul(pg.x).add(fwd.mul(pg.z));
  const p = A.add(d.mul(pg.y.mul(len))).add(nLocal.mul(radius));
  const bark = varying(vec2(uv().x.add(D.x), uv().y.mul(D.y).add(D.z)), 'vBranchBark');
  const circumference = varying(radius.mul(Math.PI * 2), 'vBranchCirc');
  const thick = varying(step(D.w, float(2.5)), 'vBranchThick'); // Ebene 1–2 gebändert, dünne Zweige reine Tinte
  const barkShade = createBarkShade({
    lookup: o.lookup,
    barkRow: o.rows.bark,
    lichenRow: o.rows.lichen,
    bark,
    circumference,
    length: 4,
    clock: o.clock,
    bands: 9,
    lichenStrips: 1,
    hairlines: 12,
    seed: o.seed + 3,
  });
  const ink = o.lookup.pal(0, o.rows.bark).rgb;
  const inkLit = o.lookup.pal(1, o.rows.bark).rgb;
  const material = new InkMaterial({
    shade: (lit, ndl) => mix(mix(ink, inkLit, lit.mul(0.35)), barkShade(lit, ndl), thick),
    terminator: 0.05,
    fog: o.fog,
    lookup: o.fogLookup ?? o.lookup,
    positionNode: p,
    normalNode: modelViewMatrix.mul(vec4(nLocal, 0)).xyz.normalize(),
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'hero-branches';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return {
    mesh,
    count: o.segments.length,
    dispose: () => {
      geometry.dispose();
      cyl.dispose();
      material.dispose();
    },
  };
}

export interface StarInstance {
  pos: Vector3;
  /** Richtung von der Stammachse weg (Sonnenseite → helleres Bronze). */
  normal: Vector3;
  size: number;
  rank: number;
}

export interface StarMeshOptions {
  stars: StarInstance[];
  lookup: PaletteLookup;
  fog: FogSettings;
  fogLookup?: PaletteLookup;
  starRow: number;
  bb: BillboardUniforms;
  seed: number;
}

/** Sternglyph: 8 lange und 8 kurze Zacken als dünne Dreiecke (48 Vertices), Radius 1, XY-Ebene. */
export function createStarGlyph(): { position: Float32BufferAttribute; index: number[] } {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const long = i % 2 === 0;
    const len = long ? 1 : 0.55;
    const half = long ? 0.045 : 0.035;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const base = pos.length / 3;
    // gegen den Uhrzeigersinn (vom Betrachter aus) → Vorderseite zeigt zur Kamera
    pos.push(0, 0, 0, c * len + s * half, s * len - c * half, 0, c * len - s * half, s * len + c * half, 0);
    idx.push(base, base + 1, base + 2);
  }
  return { position: new Float32BufferAttribute(pos, 3), index: idx };
}

/**
 * Sternnadeln (Ebene 11/24): kamerazugewandte Sternglyphen an den kahlen Zweigenden, Bronze nach Sonnenseite,
 * kaum merkliche Drehung, kollabieren unter der Pixelschwelle.
 */
export function createStarMesh(o: StarMeshOptions): { mesh: Mesh; count: number; dispose(): void } {
  const n = Math.max(1, o.stars.length);
  const glyph = createStarGlyph();
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', glyph.position);
  geometry.setIndex(glyph.index);
  const pos = new Float32Array(n * 3);
  const nrm = new Float32Array(n * 3);
  const data = new Float32Array(n * 4);
  o.stars.forEach((s, i) => {
    pos[i * 3] = s.pos.x;
    pos[i * 3 + 1] = s.pos.y;
    pos[i * 3 + 2] = s.pos.z;
    nrm[i * 3] = s.normal.x;
    nrm[i * 3 + 1] = s.normal.y;
    nrm[i * 3 + 2] = s.normal.z;
    data[i * 4] = s.size;
    data[i * 4 + 1] = s.rank;
    data[i * 4 + 2] = ((i * 0.7548776662) % 1) + 0.001;
    data[i * 4 + 3] = 0;
  });
  geometry.setAttribute('starPos', new InstancedBufferAttribute(pos, 3));
  geometry.setAttribute('starNormal', new InstancedBufferAttribute(nrm, 3));
  geometry.setAttribute('starData', new InstancedBufferAttribute(data, 4));
  geometry.instanceCount = o.stars.length;
  geometry.boundingSphere = null;

  const bb = o.bb;
  const P = attribute('starPos', 'vec3') as unknown as Vec3Node;
  const N = attribute('starNormal', 'vec3') as unknown as Vec3Node;
  const D = attribute('starData', 'vec4');
  const s = popScale(D.y, bb.crown);
  const worldC = modelWorldMatrix.mul(vec4(P, 1)).xyz;
  const nW = modelWorldMatrix.mul(vec4(N, 0)).xyz.normalize();
  const ndl = varying(nW.dot(bb.sunDirWorld), 'vStarNdl');
  const viewC = cameraViewMatrix.mul(vec4(worldC, 1));
  const depth = viewC.z.negate().max(0.05);
  const pxPerUnit = bb.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
  const sizeW = D.x.mul(s);
  const px = sizeW.mul(pxPerUnit);
  const sizeEff = max(sizeW, float(1.4).div(pxPerUnit));
  // Schattenseite spärlich (wie der Punktrand): etwa die Hälfte der abgewandten Sterne entfällt
  const sparse = select(ndl.lessThan(-0.15).and(D.z.greaterThan(0.5)), float(0), float(1));
  const visible = step(bb.collapsePx.mul(1.5), px).mul(sparse);
  const ang = D.z.mul(Math.PI * 2).add(bb.clock.mul(D.z.sub(0.5)).mul(0.06));
  const ca = cos(ang);
  const sa = sin(ang);
  const gx = positionGeometry.x.mul(ca).sub(positionGeometry.y.mul(sa));
  const gy = positionGeometry.x.mul(sa).add(positionGeometry.y.mul(ca));
  const offset = bb.camRight.mul(gx).add(bb.camUp.mul(gy)).mul(sizeEff.mul(visible));
  const world = worldC.add(offset);
  const material = new MeshBasicNodeMaterial();
  material.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(world, 1)));
  const idx = select(ndl.greaterThan(0.45), float(3), select(ndl.greaterThan(0.05), float(2), select(ndl.greaterThan(-0.4), float(1), float(0))));
  material.colorNode = steppedFog(o.lookup.pal(idx, o.starRow).rgb, o.fog, o.fogLookup ?? o.lookup);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'hero-stars';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return {
    mesh,
    count: o.stars.length,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
