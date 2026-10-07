import { Vector3, Vector4 } from 'three';
import { MeshBasicNodeMaterial, type UniformNode } from 'three/webgpu';
import { Fn, abs, attribute, cameraPosition, clamp, cross, dot, exp, float, length, max, min, mix, modelWorldMatrixInverse, normalView, normalize, positionGeometry, positionView, positionWorld, pow, reflect, smoothstep, sqrt, uniform, uniformArray, vec2, vec3, vec4, viewportSharedTexture, viewportUV } from 'three/tsl';
import type { FloatNode, Vec2Node, Vec3Node, Vec4Node } from '../../common/tsl';
import { MAX_SLIT_EYES, type CreatureMaterialUniforms } from './earleCreature';
import { farbRolle, hexToOklch, oklchToLinear, STIL_STANDARD, type WesenStil } from './stil';

/**
 * Jelly (Stufe 1, pezenpez): Port des Look-Beweises der Cloud-Session auf den Mesh-Weg. Dicke je Pixel aus der gebackenen
 * Innenlänge (`eeThick`, mit dem Blickwinkel skaliert), Absorption nach Beer-Lambert (dünner Rand hell, Mitte satt),
 * Brechung des Hintergrunds (geteilte Viewport-Textur), dunklerer Innenkern und Bodenschicht als Strahlschnitte durch
 * Ellipsoide im Körperraum, Bläschen als Strahlnähe, zwei Softbox-Glanzlichter und ein Sonnenpunkt (Licht rechts oben),
 * dünner dunkler Glasrand, Schlitzauge. Keine Szenenlichter.
 */
export interface JellyUniforms {
  /** Absorption je Kanal (aus der Grundfarbe), Kern und Boden stärker. */
  sigma: UniformNode<'vec3', Vector3>;
  coreSigma: UniformNode<'vec3', Vector3>;
  coreTint: UniformNode<'vec3', Vector3>;
  scatter: UniformNode<'vec3', Vector3>;
  /** Eigenfarbe des Körpers (gestreutes Licht im Inneren). */
  body: UniformNode<'vec3', Vector3>;
  /** Deckkraft-Steilheit über die Dicke. */
  opacity: UniformNode<'float', number>;
  rimColor: UniformNode<'vec3', Vector3>;
  /** Kern: Mitte (xyz) und Radien (xyz) relativ zur Körperhöhe. */
  coreCenter: UniformNode<'vec3', Vector3>;
  coreRadius: UniformNode<'vec3', Vector3>;
  refr: UniformNode<'float', number>;
  /** Bläschen: Mitte (xyz) + Radius (w), Körperraum. */
  bubbles: ReturnType<typeof uniformArray>;
  bubbleCount: UniformNode<'float', number>;
  /** Softbox-Richtungen im Blickraum. */
  boxDir: UniformNode<'vec3', Vector3>;
  box2Dir: UniformNode<'vec3', Vector3>;
}

export const MAX_BUBBLES = 10;

export function createJellyUniforms(): JellyUniforms {
  return {
    sigma: uniform(new Vector3(2.5, 0.4, 0.6)),
    coreSigma: uniform(new Vector3(1.2, 0.2, 0.3)),
    coreTint: uniform(new Vector3(0.2, 0.6, 0.6)),
    scatter: uniform(new Vector3(0.05, 0.1, 0.1)),
    body: uniform(new Vector3(0.2, 0.7, 0.65)),
    opacity: uniform(3.4),
    rimColor: uniform(new Vector3(0.02, 0.1, 0.1)),
    coreCenter: uniform(new Vector3(0, 0.42, 0.04)),
    coreRadius: uniform(new Vector3(0.36, 0.3, 0.34)),
    refr: uniform(0.035),
    bubbles: uniformArray(Array.from({ length: MAX_BUBBLES }, () => new Vector4(0, 0, 0, 0)), 'vec4'),
    bubbleCount: uniform(0),
    boxDir: uniform(new Vector3(0.78, 0.62, 0.42).normalize()),
    box2Dir: uniform(new Vector3(-0.85, 0.5, 0.2).normalize()),
  };
}

/** Leitet Absorption, Kern- und Streufarbe aus der Grund- und Innenfarbe des Bauplans ab. */
export function applyJellyColors(j: JellyUniforms, grundHex: string, innenHex: string, stil: WesenStil = STIL_STANDARD): void {
  const g = farbRolle(grundHex, stil).base;
  // Absorption: komplementär zur Grundfarbe (viel Absorption, wo die Farbe wenig reflektiert)
  const s = (c: number): number => Math.max(0.08, -Math.log(Math.max(0.03, Math.min(0.97, c)))) * 2.6 + 0.35;
  j.sigma.value.set(s(g[0]), s(g[1]), s(g[2]));
  j.coreSigma.value.copy(j.sigma.value).multiplyScalar(0.5);
  const inner = farbRolle(innenHex, stil).base;
  j.coreTint.value.set(inner[0], inner[1], inner[2]);
  const [L, C, h] = hexToOklch(grundHex);
  const light = oklchToLinear(Math.min(0.98, L + 0.18), Math.max(0, C - 0.03), h);
  j.scatter.value.set(light[0] * 0.3, light[1] * 0.3, light[2] * 0.3);
  j.body.value.set(g[0], g[1], g[2]);
  const dark = oklchToLinear(Math.max(0.05, L - 0.45), Math.max(0, C + 0.02), h + 8);
  j.rimColor.value.set(dark[0], dark[1], dark[2]);
}

/** Setzt Bläschen deterministisch im Körper (Positionen relativ: x,z in ±0.3·H, y in 0.15…0.85·H). */
export function placeBubbles(j: JellyUniforms, bodyScale: number, count: number, seed: number): void {
  let a = (seed * 1103515245 + 12345) >>> 0;
  const rnd = (): number => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
  const n = Math.min(MAX_BUBBLES, Math.max(0, count));
  j.bubbleCount.value = n;
  for (let i = 0; i < MAX_BUBBLES; i++) {
    const v = j.bubbles.array[i] as Vector4;
    if (i >= n) {
      v.set(0, 0, 0, 0);
      continue;
    }
    const ang = rnd() * Math.PI * 2;
    const r = (0.1 + 0.25 * rnd()) * bodyScale;
    v.set(Math.cos(ang) * r, (0.18 + 0.65 * rnd()) * bodyScale, Math.sin(ang) * r * 0.8 + 0.08 * bodyScale, (0.012 + 0.022 * rnd()) * bodyScale);
  }
}

/** Weiche Rechteck-Lichtquelle in Richtung k, gesehen über die Reflexionsrichtung d (Softbox). */
function softbox(d: Vec3Node, k: Vec3Node, size: Vec2Node, rr: FloatNode): FloatNode {
  const kx = normalize(cross(vec3(0, 1, 0), k));
  const ky = cross(k, kx);
  const cz = dot(d, k);
  const uv = vec2(dot(d, kx), dot(d, ky)).div(max(cz, 0.05));
  const q = abs(uv).sub(size);
  const sd = length(max(q, 0)).add(min(max(q.x, q.y), 0)).sub(rr);
  return float(1).sub(smoothstep(-0.02, 0.035, sd)).mul(smoothstep(0.05, 0.12, cz));
}

function envCol(d: Vec3Node): Vec3Node {
  const sky = mix(vec3(0.8, 0.84, 0.9), vec3(1, 1, 1), smoothstep(0, 0.85, d.y));
  return mix(vec3(0.45, 0.45, 0.48), sky, smoothstep(-0.3, 0.06, d.y));
}

/** Strahllänge innerhalb eines Ellipsoids (Mitte c, Radien r), begrenzt auf [0, maxLen]. */
function raySegment(ro: Vec3Node, rd: Vec3Node, c: Vec3Node, r: Vec3Node, maxLen: FloatNode): FloatNode {
  const oc = ro.sub(c).div(r);
  const dd = rd.div(r);
  const a = dot(dd, dd);
  const b = dot(oc, dd);
  const cc = dot(oc, oc).sub(1);
  const disc = b.mul(b).sub(a.mul(cc));
  const sq = sqrt(max(disc, 0));
  const t0 = b.negate().sub(sq).div(a);
  const t1 = b.negate().add(sq).div(a);
  const len = max(min(t1, maxLen).sub(max(t0, 0)), 0);
  return mix(float(0), len, smoothstep(0, 0.0001, disc));
}

export function createJellyMaterial(u: CreatureMaterialUniforms, j: JellyUniforms): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.name = 'ee-jelly';
  material.fog = false;
  material.transparent = true;
  material.depthWrite = true;
  material.colorNode = Fn(() => {
    const rest = positionGeometry as unknown as Vec3Node;
    const N = normalize(normalView as unknown as Vec3Node).toVar();
    const V = normalize(positionView.negate() as unknown as Vec3Node).toVar();
    const NdV = clamp(dot(N, V), 0, 1).toVar();
    const H = u.bodyScale;
    const thickAttr = attribute('eeThick', 'float') as FloatNode;
    // Dicke entlang des Blicks: gebackene Innenlänge, am Rand (flacher Blick) länger
    const thickObj = thickAttr.div(float(0.3).add(NdV.mul(0.7)));
    const thickN = thickObj.div(H).add(float(0.45).mul(float(1).sub(smoothstep(0, 0.18, rest.y.div(H))))).toVar();
    // Brechung des Hintergrunds
    const off = N.xy.mul(j.refr).mul(clamp(thickN, 0, 0.7));
    const uv = (viewportUV as unknown as Vec2Node).sub(off);
    const bg = (viewportSharedTexture(uv) as unknown as Vec4Node).rgb;
    // Strahl im Körperraum (Ruheraum ≈ Objektraum)
    const worldDir = normalize((positionWorld as unknown as Vec3Node).sub(cameraPosition as unknown as Vec3Node));
    const rd = normalize((modelWorldMatrixInverse as unknown as { mul(v: Vec4Node): Vec4Node }).mul(vec4(worldDir, 0)).xyz);
    const coreLen = raySegment(rest, rd, j.coreCenter.mul(H), j.coreRadius.mul(H), thickObj);
    const floorLen = raySegment(rest, rd, vec3(0, H.mul(0.08), 0), vec3(H.mul(0.6), H.mul(0.14), H.mul(0.45)), thickObj);
    const coreN = coreLen.div(H);
    const floorN = floorLen.div(H);
    const Tr = exp(j.sigma.negate().mul(thickN.add(0.06)).sub(j.coreSigma.mul(coreN.add(floorN)))).toVar();
    // klare Kante an Kern und Bodenschicht (gemalte Innenform)
    Tr.assign(Tr.mul(mix(vec3(1), j.coreTint, smoothstep(0.004, 0.025, coreN).mul(0.9))));
    Tr.assign(Tr.mul(mix(vec3(1), j.coreTint, smoothstep(0.004, 0.025, floorN).mul(0.7))));
    const lit = clamp(dot(N, u.lightDir).mul(0.5).add(0.5), 0, 1);
    // Eigenfarbe: je dicker, desto mehr Körperton (gestreut, von Kern und Bodenschicht getönt); dünner Rand zeigt den Hintergrund
    const alpha = float(1).sub(exp(j.opacity.negate().mul(thickN.add(0.05))));
    const coreMix = max(smoothstep(0.004, 0.025, coreN).mul(0.75), smoothstep(0.004, 0.025, floorN).mul(0.6));
    const bodyCol = mix(j.body, j.body.mul(j.coreTint).mul(1.6), coreMix).mul(lit.mul(0.55).add(0.6));
    const col = mix(bg.mul(Tr).add(j.scatter.mul(float(1).sub(Tr)).mul(lit.mul(0.6).add(0.6))), bodyCol, alpha.mul(0.82)).toVar();
    // Bodenkontakt dunkler
    col.assign(col.mul(mix(float(0.74), float(1), smoothstep(0, 0.1, rest.y.div(H)))));
    // Glanz: Umgebung, zwei Softboxen, harter Sonnenpunkt
    const R = reflect(V.negate(), N);
    const F = float(0.03).add(pow(float(1).sub(NdV), 5).mul(0.97));
    col.assign(col.mul(float(1).sub(F.mul(0.35))).add(envCol(R).mul(F).mul(0.25)));
    const box = softbox(R, j.boxDir, vec2(0.09, 0.36), float(0.05));
    const box2 = softbox(R, j.box2Dir, vec2(0.06, 0.35), float(0.04));
    const dots = softbox(R, normalize(j.boxDir.add(vec3(-0.25, 0.25, 0.1))), vec2(0.035, 0.035), float(0.02));
    col.assign(col.add(vec3(box.mul(0.95).add(box2.mul(0.3)).add(dots.mul(0.9)))));
    // Bläschen: Strahlnähe zu kleinen Kugeln im Körper, helle Scheibe mit dunklem Rand
    const bub = float(0).toVar();
    const bubRim = float(0).toVar();
    for (let i = 0; i < MAX_BUBBLES; i++) {
      const b4 = (j.bubbles as unknown as { element(i: number): Vec4Node }).element(i);
      const active = smoothstep(float(i).sub(0.5), float(i).add(0.5), j.bubbleCount.sub(0.5)).mul(min(b4.w.mul(1000), 1));
      const toB = b4.xyz.sub(rest);
      const tAlong = dot(toB, rd);
      const dRay = length(toB.sub(rd.mul(tAlong)));
      const inside = smoothstep(0, 0.01, tAlong).mul(float(1).sub(smoothstep(thickObj, thickObj.add(0.02), tAlong)));
      const disc = float(1).sub(smoothstep(b4.w.mul(0.55), b4.w.mul(0.8), dRay));
      const ring = smoothstep(b4.w.mul(0.6), b4.w.mul(0.85), dRay).mul(float(1).sub(smoothstep(b4.w.mul(0.95), b4.w.mul(1.15), dRay)));
      bub.assign(max(bub, disc.mul(inside).mul(active)));
      bubRim.assign(max(bubRim, ring.mul(inside).mul(active)));
    }
    col.assign(mix(col, j.scatter.mul(9).add(0.35), bub.mul(0.65)));
    col.assign(mix(col, j.rimColor, bubRim.mul(0.35)));
    // dunkler Glasrand
    const rim = smoothstep(0.84, 0.98, float(1).sub(NdV));
    col.assign(mix(col, j.rimColor, rim.mul(0.85)));
    // Schlitzaugen (wie im festen Material)
    const eyeMask = float(0).toVar();
    for (let i = 0; i < MAX_SLIT_EYES; i++) {
      const ep = (u.eyePos as unknown as { element(i: number): Vec4Node }).element(i);
      const eu = (u.eyeUp as unknown as { element(i: number): Vec4Node }).element(i);
      const active = smoothstep(float(i).sub(0.5), float(i).add(0.5), u.eyeCount.sub(0.5)).mul(min(ep.w.mul(1000), 1));
      const d = rest.sub(ep.xyz);
      const up = eu.xyz;
      const dy = dot(d, up);
      const dxz = d.sub(up.mul(dy));
      const dx = dxz.length();
      const hs = ep.w.mul(0.5);
      const open = max(float(1).sub(u.blink).mul(eu.w), 0.08);
      const rr = vec2(dx.div(hs.mul(0.42)), dy.div(hs.mul(open)));
      const dist = pow(pow(abs(rr.x), 2.6).add(pow(abs(rr.y), 2.6)), float(1).div(2.6)).sub(1);
      eyeMask.assign(max(eyeMask, float(1).sub(smoothstep(float(-0.08), float(0.08), dist)).mul(active)));
    }
    col.assign(mix(col, u.auge, eyeMask));
    return vec4(col, 1);
  })();
  return material;
}
