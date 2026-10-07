import { nearestOnPolyline } from '../math/curve';
import { clamp, clamp01, dist, dot, smoothstep, sub, type Vec3 } from '../math/vec';
import { REGION, evalScene, evalSceneDetailed, type SceneSample } from '../sdf/scene';
import type { Construction } from '../sdf/build';

/**
 * Oberflächendeskriptoren je Vertex — speziesunabhängige Werte, aus denen Skinning, Muster, Fell und Materialmasken lesen:
 * Knochengewichte (aus den Teilabständen, Körper nach Höhe auf drei Knochen verteilt, Kieferzone auf den Kieferknochen),
 * Wirbelsäulen-Koordinaten (Bogenlänge s, Umfangswinkel, Umfang, Bauch/Rücken) der nächsten Teilkurve, Regionen
 * (Rachen, Lippe, Gesicht, Augenhöhle) und Höhlung (AO aus dem SDF).
 */
export interface Descriptors {
  /** 4 Knochenindizes je Vertex. */
  skinIndex: Float32Array;
  /** 4 Gewichte je Vertex (Summe 1). */
  skinWeight: Float32Array;
  /** Bogenlänge (Körpereinheiten), Winkel (−π…π), Umfang, Bauch/Rücken (−1…1) je Vertex. */
  spine: Float32Array;
  /** Rachen, Lippe, Gesicht, Augenhöhle (0…1) je Vertex. */
  region: Float32Array;
  /** Höhlung 0 (frei) … 1 (tief in einer Falte). */
  ao: Float32Array;
  /** Teilgruppe je Vertex. */
  group: Uint8Array;
}

export function computeDescriptors(c: Construction, positions: Float32Array, normals: Float32Array): Descriptors {
  const n = positions.length / 3;
  const { scene, bones, groups } = c;
  const H = c.bodyScale;
  const skinIndex = new Float32Array(n * 4);
  const skinWeight = new Float32Array(n * 4);
  const spine = new Float32Array(n * 4);
  const region = new Float32Array(n * 4);
  const ao = new Float32Array(n);
  const group = new Uint8Array(n);
  const prims = scene.prims;
  const unionIdx: number[] = [];
  const lipIdx: number[] = [];
  const socketIdx: number[] = [];
  prims.forEach((p, i) => {
    if (p.op === 'union') unionIdx.push(i);
    if (p.region === REGION.lippe) lipIdx.push(i);
    if (p.op === 'subtract' && p.region === REGION.hoehle) socketIdx.push(i);
  });
  const bodyGroup = groups.findIndex((g) => g.kind === 'koerper');
  const bodyBones = bodyGroup >= 0 ? groups[bodyGroup]!.bones : [];
  const boneWeights = new Float64Array(bones.length);
  const sample: SceneSample = { d: 0, dUnion: 0, dSubtract: 0, nearestSubtract: -1, per: new Float64Array(prims.length) };
  const order = unionIdx.slice();
  const p: Vec3 = [0, 0, 0];
  const nrm: Vec3 = [0, 0, 0];
  const aoRadii = [0.05, 0.16].map((r) => r * H);
  const aoW = [0.6, 0.4];
  const mouth = c.mouth;
  const cavityK = mouth ? prims.find((pr) => pr.name === 'maulhoehle')?.k ?? 0.05 * H : 0.05 * H;

  for (let v = 0; v < n; v++) {
    p[0] = positions[v * 3]!;
    p[1] = positions[v * 3 + 1]!;
    p[2] = positions[v * 3 + 2]!;
    nrm[0] = normals[v * 3]!;
    nrm[1] = normals[v * 3 + 1]!;
    nrm[2] = normals[v * 3 + 2]!;
    evalSceneDetailed(scene, p, sample, 0.35 * H);
    const per = sample.per;

    // --- Gewichte aus den Teilabständen ----------------------------------------------------------------------------
    boneWeights.fill(0);
    order.sort((a, b) => per[a]! - per[b]!);
    const dmin = per[order[0]!]!;
    let owner = order[0]!;
    for (let q = 0; q < Math.min(4, order.length); q++) {
      const i = order[q]!;
      const pr = prims[i]!;
      const blend = 0.6 * pr.k + 0.02 * H;
      const u = Math.max(0, 1 - (per[i]! - dmin) / blend);
      const w = u * u;
      if (w <= 0) continue;
      boneWeights[pr.part]! += w;
    }
    // Körper: ein Primitiv, drei Knochen — nach Höhe verteilen
    if (bodyBones.length === 3) {
      let wBody = 0;
      for (const bi of bodyBones) {
        wBody += boneWeights[bi]!;
        boneWeights[bi] = 0;
      }
      if (wBody > 0) {
        const y0 = bones[bodyBones[0]!]!.pos[1];
        const t = clamp((p[1] - y0) / H, 0, 1);
        const wU = clamp01(1 - t / 0.45);
        const wM = clamp01(1 - Math.abs(t - 0.45) / 0.45);
        const wO = clamp01((t - 0.45) / 0.4);
        const s = wU + wM + wO || 1;
        boneWeights[bodyBones[0]!]! += (wBody * wU) / s;
        boneWeights[bodyBones[1]!]! += (wBody * wM) / s;
        boneWeights[bodyBones[2]!]! += (wBody * wO) / s;
      }
    }
    // Kieferzone: Anteil der Trägerknochen auf den Unterkiefer
    if (mouth) {
      const jw = mouth.jawWeight(p, H);
      if (jw > 0.001) {
        const hostGroup = bones[c.hostBone]!.group;
        let moved = 0;
        for (let bi = 0; bi < bones.length; bi++) {
          if (bi === c.jawBone) continue;
          if (bones[bi]!.group !== hostGroup) continue;
          const take = boneWeights[bi]! * jw;
          boneWeights[bi]! -= take;
          moved += take;
        }
        boneWeights[c.jawBone]! += moved;
      }
    }
    // Top 4 normieren
    const top: number[] = [];
    for (let bi = 0; bi < bones.length; bi++) if (boneWeights[bi]! > 1e-6) top.push(bi);
    top.sort((a, b) => boneWeights[b]! - boneWeights[a]!);
    let sum = 0;
    for (let q = 0; q < 4; q++) {
      const bi = top[q];
      const w = bi === undefined ? 0 : boneWeights[bi]!;
      skinIndex[v * 4 + q] = bi ?? 0;
      skinWeight[v * 4 + q] = w;
      sum += w;
    }
    if (sum <= 0) {
      skinIndex[v * 4] = c.hostBone;
      skinWeight[v * 4] = 1;
      sum = 1;
    }
    for (let q = 0; q < 4; q++) skinWeight[v * 4 + q] = skinWeight[v * 4 + q]! / sum;

    // --- Wirbelsäulen-Koordinaten der Gruppe des stärksten Knochens ------------------------------------------------
    const mainBone = skinIndex[v * 4]!;
    let gi = bones[mainBone]!.group;
    if (groups[gi]!.kind === 'kiefer') gi = bones[c.hostBone]!.group;
    const g = groups[gi]!;
    group[v] = gi;
    const hit = nearestOnPolyline(g.polyline, p);
    const rel = sub(p, hit.point);
    const radius = Math.max(hit.radius, 1e-3);
    spine[v * 4] = hit.s * g.polyline.total;
    spine[v * 4 + 1] = hit.angle;
    spine[v * 4 + 2] = 2 * Math.PI * Math.max(radius, hit.d);
    spine[v * 4 + 3] = clamp(dot(rel, g.dorsal) / Math.max(radius, hit.d, 1e-3), -1, 1);
    void owner;
    owner = order[0]!;

    // --- Regionen -----------------------------------------------------------------------------------------------------
    // Rachen: Fläche entstand aus der Subtraktion (innerhalb der Vereinigung)
    region[v * 4] = smoothstep(0, 0.7 * cavityK, -sample.dUnion);
    let lip = 0;
    for (const li of lipIdx) {
      const pr = prims[li]!;
      const r = pr.kind === 'capsule' ? Math.max(pr.ra, pr.rb) : 0.03 * H;
      lip = Math.max(lip, clamp01(1 - per[li]! / (1.6 * r + 1e-6)));
    }
    region[v * 4 + 1] = lip;
    let face = 0;
    if (mouth) {
      const dC = dist(p, mouth.center);
      face = clamp01(1.2 - dC / (0.75 * mouth.host.halfWidth));
    }
    for (const e of c.eyes) {
      face = Math.max(face, clamp01(1.3 - dist(p, e.pos) / (2.4 * e.radius)));
    }
    region[v * 4 + 2] = face;
    let socket = 0;
    for (const si of socketIdx) socket = Math.max(socket, clamp01(1 - per[si]! / (0.5 * (prims[si]!.k + 1e-6) + 0.02 * H)));
    region[v * 4 + 3] = socket;

    // --- Höhlung (AO) ---------------------------------------------------------------------------------------------------
    let occ = 0;
    for (let i = 0; i < aoRadii.length; i++) {
      const r = aoRadii[i]!;
      const d = evalScene(scene, [p[0] + nrm[0] * r, p[1] + nrm[1] * r, p[2] + nrm[2] * r]);
      occ += clamp01((r - d) / r) * aoW[i]!;
    }
    ao[v] = clamp01(occ);
  }
  return { skinIndex, skinWeight, spine, region, ao, group };
}

/** Glättet Gewichte über die Nachbarschaft (gegen Scherung an Teilgrenzen). */
export function smoothWeights(desc: Descriptors, adj: { offsets: Uint32Array; neighbours: Uint32Array }, boneCount: number, iterations = 2): void {
  const n = desc.skinIndex.length / 4;
  const acc = new Float64Array(boneCount);
  const outIdx = new Float32Array(desc.skinIndex.length);
  const outW = new Float32Array(desc.skinWeight.length);
  for (let it = 0; it < iterations; it++) {
    for (let v = 0; v < n; v++) {
      acc.fill(0);
      const s = adj.offsets[v]!, e = adj.offsets[v + 1]!;
      const selfW = 1;
      for (let q = 0; q < 4; q++) acc[desc.skinIndex[v * 4 + q]!]! += desc.skinWeight[v * 4 + q]! * selfW;
      const nw = e > s ? 1 / (e - s) : 0;
      for (let k = s; k < e; k++) {
        const u = adj.neighbours[k]!;
        for (let q = 0; q < 4; q++) acc[desc.skinIndex[u * 4 + q]!]! += desc.skinWeight[u * 4 + q]! * nw;
      }
      const top: number[] = [];
      for (let b = 0; b < boneCount; b++) if (acc[b]! > 1e-6) top.push(b);
      top.sort((a, b) => acc[b]! - acc[a]!);
      let sum = 0;
      for (let q = 0; q < 4; q++) {
        const b = top[q];
        const w = b === undefined ? 0 : acc[b]!;
        outIdx[v * 4 + q] = b ?? 0;
        outW[v * 4 + q] = w;
        sum += w;
      }
      for (let q = 0; q < 4; q++) outW[v * 4 + q] = outW[v * 4 + q]! / (sum || 1);
    }
    desc.skinIndex.set(outIdx);
    desc.skinWeight.set(outW);
  }
}
