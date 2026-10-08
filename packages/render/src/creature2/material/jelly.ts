import { Vector3, Vector4 } from 'three';
import { MeshBasicNodeMaterial, type UniformNode } from 'three/webgpu';
import { Break, Fn, If, Loop, abs, attribute, cameraPosition, clamp, cross, dot, exp, float, fwidth, length, max, min, mix, modelWorldMatrixInverse, normalView, normalize, positionGeometry, positionLocal, positionView, positionWorld, pow, reflect, sin, smoothstep, sqrt, uniform, uniformArray, vec2, vec3, vec4, viewportSharedTexture, viewportUV } from 'three/tsl';
import type { FloatNode, Vec2Node, Vec3Node, Vec4Node } from '../../common/tsl';
import { MAX_SLIT_EYES, type CreatureMaterialUniforms } from './earleCreature';
import { farbRolle, hexToOklch, oklchToLinear, STIL_STANDARD, type WesenStil } from './stil';

/**
 * Jelly (Stufe 1, pezenpez, Bild 1): Dicke je Pixel aus der gebackenen Innenlänge (`eeThick`, mit dem Blickwinkel
 * skaliert), Absorption nach Beer-Lambert (dünner Rand hell, Mitte satt), Brechung des Hintergrunds (geteilte
 * Viewport-Textur). Zwei dunklere, halbtransparente Innenformen wie in Bild 1: oben ein **Lavalampen-Klumpen** (drei
 * weich verschmolzene Tropfen, die langsam steigen, sinken, sich dehnen und lösen — Abstandsfeld, entlang des Blicks
 * abgetastet, scharfe gemalte Kante) und unten der große **Bodenlappen**, dessen Maße aus der Grundfläche des Körpers
 * kommen, damit er immer Abstand zum Rand hält (der Rand bleibt hell, die Unterseite wirkt von oben gerundet).
 * Bläschen als weiche helle Scheiben ohne Kontur, Glanzlichter rechts oben (Softboxen), heller Saum zur Lichtseite statt
 * dunklem Glasrand (Konturen-Regel), Schlitzauge. Keine Szenenlichter.
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
  /** Lavalampe: Ruhemitte (xyz) und Radien (xyz) des Hauptklumpens relativ zur Körperhöhe. */
  coreCenter: UniformNode<'vec3', Vector3>;
  coreRadius: UniformNode<'vec3', Vector3>;
  /** Bodenlappen: Mitte (x, z) und Halbachsen (x, z) der Körpergrundfläche bei ≈ ¼ Höhe (Körperraum, aus dem Mesh). */
  boden: UniformNode<'vec4', Vector4>;
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
    coreCenter: uniform(new Vector3(0.02, 0.62, 0.05)),
    coreRadius: uniform(new Vector3(0.22, 0.155, 0.2)),
    boden: uniform(new Vector4(0, 0, 0.4, 0.35)),
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
    v.set(Math.cos(ang) * r, (0.18 + 0.65 * rnd()) * bodyScale, Math.sin(ang) * r * 0.8 + 0.08 * bodyScale, (0.018 + 0.026 * rnd()) * bodyScale);
  }
}

/**
 * Grundfläche des Körpers für den Bodenlappen: Mitte und Halbachsen (x, z) der Vertices zwischen 18 % und 34 % der
 * Körperhöhe — dort, wo der Lappen am breitesten ist. So passt er in jede Grundform und hält Abstand zum Rand.
 */
export function measureJellyFloor(j: JellyUniforms, positions: ArrayLike<number>, bodyScale: number): void {
  const y0 = 0.18 * bodyScale, y1 = 0.34 * bodyScale;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const y = positions[i + 1]!;
    if (y < y0 || y > y1) continue;
    const x = positions[i]!, z = positions[i + 2]!;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) {
    j.boden.value.set(0, 0, 0.4 * bodyScale, 0.35 * bodyScale);
    return;
  }
  j.boden.value.set((minX + maxX) / 2, (minZ + maxZ) / 2, (maxX - minX) / 2, (maxZ - minZ) / 2);
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
  return mix(vec3(0.7, 0.72, 0.74), sky, smoothstep(-0.3, 0.06, d.y));
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

/** Abstand zu einem Ellipsoid (Schranke nach Quílez: genau genug für eine Kante, nie zu groß). */
function ellipsoidSdf(p: Vec3Node, r: Vec3Node): FloatNode {
  const k0 = length(p.div(r));
  const k1 = length(p.div(r.mul(r)));
  return k0.mul(k0.sub(1)).div(max(k1, 1e-5));
}

function sminJ(a: FloatNode, b: FloatNode, k: number): FloatNode {
  const h = max(float(k).sub(abs(a.sub(b))), 0).div(k);
  return min(a, b).sub(h.mul(h).mul(k * 0.25));
}

/**
 * Lavalampe (Raum in Körperhöhen): ein Hauptklumpen, der langsam steigt und sinkt und dabei atmet (breiter ↔ höher), zwei
 * Tropfen kreisen auf eigenen, unrunden Bahnen (Perioden 50–90 s), verschmelzen weich mit ihm und lösen sich wieder; eine
 * leise Wellung macht die Oberfläche organisch. Nie hektisch: alle Bewegungen unter 0,05 Körperhöhen je Sekunde.
 */
function lava(q: Vec3Node, t: FloatNode, c0: Vec3Node, r0: Vec3Node): FloatNode {
  const drift = vec3(sin(t.mul(0.21)).mul(0.035), sin(t.mul(0.13).add(1)).mul(0.05), sin(t.mul(0.17).add(2)).mul(0.025));
  const c = c0.add(drift);
  const atem = sin(t.mul(0.29)).mul(0.09);
  const r = r0.mul(vec3(float(1).add(atem), float(1).sub(atem.mul(0.8)), float(1).add(atem.mul(0.6))));
  const d0 = ellipsoidSdf(q.sub(c), r);
  const a1 = t.mul(0.11);
  const c1 = c.add(vec3(sin(a1).mul(0.16), sin(t.mul(0.071)).mul(0.1).sub(0.05), sin(a1.add(1.57)).mul(0.09)));
  const d1 = length(q.sub(c1)).sub(sin(t.mul(0.23)).mul(0.015).add(0.08));
  const a2 = t.mul(0.087).add(2.4);
  const c2 = c.add(vec3(sin(a2.add(1.57)).mul(-0.14), sin(t.mul(0.12).add(0.5)).mul(0.09), sin(a2).mul(-0.08)));
  const d2 = length(q.sub(c2)).sub(0.066);
  const d = sminJ(sminJ(d0, d1, 0.1), d2, 0.09);
  const welle = sin(q.x.mul(9).add(t.mul(0.4))).mul(sin(q.y.mul(7).sub(t.mul(0.33)))).mul(sin(q.z.mul(8).add(t.mul(0.27)))).mul(0.012);
  return d.add(welle);
}

export function createJellyMaterial(u: CreatureMaterialUniforms, j: JellyUniforms): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.name = 'ee-jelly';
  material.fog = false;
  material.transparent = true;
  material.depthWrite = true;
  material.positionNode = Fn(() => {
    const pucker = attribute('eePucker', 'vec3') as Vec3Node;
    return (positionLocal as unknown as Vec3Node).add(pucker.mul(u.spitzmund));
  })();
  material.colorNode = Fn(() => {
    const rest = positionGeometry as unknown as Vec3Node;
    const N = normalize(normalView as unknown as Vec3Node).toVar();
    const V = normalize(positionView.negate() as unknown as Vec3Node).toVar();
    const NdV = clamp(dot(N, V), 0, 1).toVar();
    const H = u.bodyScale;
    const thickAttr = (attribute('eeExtra', 'vec4') as Vec4Node).y;
    // Dicke entlang des Blicks: gebackene Innenlänge, am Rand (flacher Blick) länger
    const thickObj = thickAttr.div(float(0.3).add(NdV.mul(0.7)));
    const thickN = thickObj.div(H).toVar();
    // Brechung des Hintergrunds
    const off = N.xy.mul(j.refr).mul(clamp(thickN, 0, 0.7));
    const uv = (viewportUV as unknown as Vec2Node).sub(off);
    const bg = (viewportSharedTexture(uv) as unknown as Vec4Node).rgb;
    // Strahl im Körperraum (Ruheraum ≈ Objektraum)
    const worldDir = normalize((positionWorld as unknown as Vec3Node).sub(cameraPosition as unknown as Vec3Node));
    const rd = normalize((modelWorldMatrixInverse as unknown as { mul(v: Vec4Node): Vec4Node }).mul(vec4(worldDir, 0)).xyz).toVar();

    // Lavalampe: das Abstandsfeld entlang des Blicks abtasten (Kugelschritte, auch innen weiter), kleinster Abstand längs
    // des Strahls → Silhouette des Klumpens: außen der knappste Vorbeiflug, innen die tiefste Stelle — stetig über die
    // Kante, darum scharf und doch geglättet (ein Abbruch beim ersten Treffer zeichnete Höhenlinien)
    const ro = rest.div(H);
    const lenN = thickObj.div(H);
    const t = float(0.004).toVar();
    const minD = float(1e3).toVar();
    Loop(28, () => {
      const d = lava(ro.add(rd.mul(t)), u.zeit, j.coreCenter, j.coreRadius);
      minD.assign(min(minD, d));
      t.addAssign(max(abs(d).mul(0.8), 0.006));
      If(t.greaterThan(lenN), () => {
        Break();
      });
    });
    const eK = max(fwidth(minD).mul(0.8), 0.0025);
    const coreMask = float(1).sub(smoothstep(eK.negate(), eK, minD));
    // Bodenlappen: Ellipsoid aus der Grundfläche (73 % der Breite, 6 … 46 % der Höhe) — immer innen, Rand bleibt frei
    const atemB = sin(u.zeit.mul(0.19)).mul(0.03);
    const bodenC = vec3(j.boden.x, H.mul(0.29), j.boden.y);
    const bodenR = vec3(j.boden.z.mul(0.72), H.mul(float(0.175).add(atemB.mul(0.2))), j.boden.w.mul(0.72));
    const floorLen = raySegment(rest, rd, bodenC, bodenR, thickObj).div(H);
    const eB = max(fwidth(floorLen).mul(0.8), 0.002);
    const floorMask = smoothstep(eB.mul(0.5), eB.mul(2.5), floorLen);
    // Bild 1: der Bodenlappen ist deutlich dunkler als der Klumpen oben (gemessen L 106 gegen 148)
    const innen = max(coreMask.mul(0.62), floorMask);

    const Tr = exp(j.sigma.negate().mul(thickN.add(0.06))).toVar();
    // klare Kante der Innenformen (gemalt, halbtransparent dunkler)
    Tr.assign(Tr.mul(mix(vec3(1), j.coreTint, innen.mul(0.9))));
    const lit = clamp(dot(N, u.lightDir).mul(0.5).add(0.5), 0, 1);
    // Eigenfarbe: je dicker, desto mehr Körperton (gestreut, von den Innenformen getönt); dünner Rand zeigt den Hintergrund
    const alpha = float(1).sub(exp(j.opacity.negate().mul(thickN.add(0.05))));
    const bodyCol = mix(j.body, j.body.mul(j.coreTint).mul(1.6), innen.mul(0.8)).mul(lit.mul(0.72).add(0.48));
    const col = mix(bg.mul(Tr).add(j.scatter.mul(float(1).sub(Tr)).mul(lit.mul(0.6).add(0.6))), bodyCol, alpha.mul(0.82)).toVar();
    // Glanz: Umgebung, zwei Softboxen, harter Sonnenpunkt — nur auf der oberen Rundung (Bild 1: Glanzlichter rechts oben)
    const R = reflect(V.negate(), N);
    const F = float(0.03).add(pow(float(1).sub(NdV), 5).mul(0.97));
    col.assign(col.mul(float(1).sub(F.mul(0.35))).add(envCol(R).mul(F).mul(0.25)));
    const oben = smoothstep(0.05, 0.3, N.y).mul(smoothstep(0.56, 0.7, rest.y.div(H)));
    const box = softbox(R, j.boxDir, vec2(0.09, 0.36), float(0.05));
    const box2 = softbox(R, j.box2Dir, vec2(0.06, 0.35), float(0.04));
    const dots = softbox(R, normalize(j.boxDir.add(vec3(-0.25, 0.25, 0.1))), vec2(0.035, 0.035), float(0.02));
    col.assign(col.add(vec3(box.mul(0.95).add(box2.mul(0.12)).add(dots.mul(0.9)).mul(oben))));
    // Saum statt Glasrand (Konturen-Regel): zur Lichtseite heller, zur Schattenseite etwas satter — breit, nie als Linie
    const saum = smoothstep(0.45, 0.97, float(1).sub(NdV));
    const lichtSeite = smoothstep(-0.25, 0.45, dot(N, u.lightDir));
    col.assign(mix(col, col.mul(1.12).add(j.scatter.mul(0.9)), saum.mul(lichtSeite).mul(0.55)));
    col.assign(mix(col, col.mul(0.86), saum.mul(float(1).sub(lichtSeite)).mul(smoothstep(-0.55, -0.1, N.y)).mul(0.35)));
    // Bläschen: Strahlnähe zu kleinen Kugeln im Körper — weiche helle Scheiben ohne Kontur (Bild 1)
    const bub = float(0).toVar();
    for (let i = 0; i < MAX_BUBBLES; i++) {
      const b4 = (j.bubbles as unknown as { element(i: number): Vec4Node }).element(i);
      const active = smoothstep(float(i).sub(0.5), float(i).add(0.5), j.bubbleCount.sub(0.5)).mul(min(b4.w.mul(1000), 1));
      const toB = b4.xyz.sub(rest);
      const tAlong = dot(toB, rd);
      const dRay = length(toB.sub(rd.mul(tAlong)));
      const inside = smoothstep(0, 0.01, tAlong).mul(float(1).sub(smoothstep(thickObj, thickObj.add(0.02), tAlong)));
      const disc = float(1).sub(smoothstep(b4.w.mul(0.62), b4.w.mul(1.0), dRay));
      bub.assign(max(bub, disc.mul(inside).mul(active)));
    }
    // hell und leicht getönt (Bild 1: helles Türkis, gemessen L 192 auf L 155), nicht grellweiß
    const bubCol = mix(j.body.mul(1.15), vec3(1), 0.55);
    col.assign(mix(col, bubCol, bub.mul(0.62)));
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
