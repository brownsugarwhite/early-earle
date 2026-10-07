import { Vector3 } from 'three';
import type { UniformNode } from 'three/webgpu';
import { If, abs, clamp, cos, dot, float, floor, fract, hash, length, max, min, mix, sin, smoothstep, uniform, vec2, vec3 } from 'three/tsl';
import type { FloatNode, Vec3Node, Vec4Node } from '../../common/tsl';
import { MUSTER_TYPEN } from '@ee/creature';

/**
 * Musterebene (Look-Vertrag Regel 7/8): Muster rechnen in Wirbelsäulen-Koordinaten (Bogenlänge u, Umfangsbogen v,
 * Bauch/Rücken) oder im Körperraum (3D-Rauschen, nahtlos) — nie in UVs, deshalb verzerrt nichts. Striche laufen in Spitzen
 * aus (`spitze`), `zittern` gibt gemalte Unruhe, Gesicht, Lippen und Rachen bleiben frei.
 * Liefert Maske (0…1), Akzentmaske und eine Schattierung je Schuppe/Platte.
 */
export interface MusterUniforms {
  typ: UniformNode<'float', number>;
  dichte: UniformNode<'float', number>;
  groesse: UniformNode<'float', number>;
  drehung: UniformNode<'float', number>;
  spitze: UniformNode<'float', number>;
  zittern: UniformNode<'float', number>;
  seed: UniformNode<'float', number>;
}

export function createMusterUniforms(): MusterUniforms {
  return { typ: uniform(0), dichte: uniform(0.5), groesse: uniform(0.5), drehung: uniform(0), spitze: uniform(0.6), zittern: uniform(0.3), seed: uniform(1) };
}

export const MUSTER_INDEX: Record<(typeof MUSTER_TYPEN)[number], number> = Object.fromEntries(MUSTER_TYPEN.map((t, i) => [t, i])) as Record<(typeof MUSTER_TYPEN)[number], number>;

export function applyMuster(u: MusterUniforms, m: { typ: (typeof MUSTER_TYPEN)[number]; dichte: number; groesse: number; drehung: number; spitze: number; zittern: number; seed: number }): void {
  u.typ.value = MUSTER_INDEX[m.typ];
  u.dichte.value = m.dichte;
  u.groesse.value = m.groesse;
  u.drehung.value = m.drehung;
  u.spitze.value = m.spitze;
  u.zittern.value = m.zittern;
  u.seed.value = m.seed;
}

/** Wertrauschen 3D (0…1). */
function noise3(p: Vec3Node): FloatNode {
  const i = floor(p);
  const f = fract(p);
  const w = f.mul(f).mul(float(3).sub(f.mul(2)));
  const h = (ox: number, oy: number, oz: number): FloatNode => hash(i.add(vec3(ox, oy, oz)).dot(vec3(1, 57, 113)));
  const x00 = mix(h(0, 0, 0), h(1, 0, 0), w.x), x10 = mix(h(0, 1, 0), h(1, 1, 0), w.x);
  const x01 = mix(h(0, 0, 1), h(1, 0, 1), w.x), x11 = mix(h(0, 1, 1), h(1, 1, 1), w.x);
  return mix(mix(x00, x10, w.y), mix(x01, x11, w.y), w.z);
}

/** Zellrauschen 3D: F1, F2 und Zellkennung über die 27 Nachbarzellen (ein Hash je Zelle, drei Jitter daraus). */
function cells3(p: Vec3Node, seed: FloatNode): Vec3Node {
  const i = floor(p);
  const f = fract(p);
  const f1 = float(9).toVar();
  const f2 = float(9).toVar();
  const id = float(0).toVar();
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const o = vec3(x, y, z);
        const h = hash(i.add(o).add(seed).dot(vec3(1, 57, 113)));
        const jit = vec3(h, fract(h.mul(97.13)), fract(h.mul(311.7)));
        const c = o.add(jit).sub(f);
        const d = length(c);
        If(d.lessThan(f1), () => {
          f2.assign(f1);
          f1.assign(d);
          id.assign(h);
        }).Else(() => {
          If(d.lessThan(f2), () => f2.assign(d));
        });
      }
  return vec3(f1, f2, id);
}

export interface MusterOut {
  /** Musterfarbe-Anteil. */
  mask: FloatNode;
  /** Akzent-Anteil (Rosettenkern, Plattenfugen). */
  akzent: FloatNode;
  /** Schattierung je Schuppe/Platte (−1…1), 0 = keine. */
  relief: FloatNode;
}

/**
 * Berechnet die Mustermasken. `spine` = (Bogenlänge, Winkel, Umfang, Bauch/Rücken), `rest` = Ruheposition im
 * Körperraum, `bodyScale` = Körperhöhe, `frei` = 1 wo Muster erlaubt ist (Gesicht/Lippen/Rachen → 0).
 */
export function musterMasks(u: MusterUniforms, spine: Vec4Node, rest: Vec3Node, bodyScale: FloatNode, frei: FloatNode): MusterOut {
  const mask = float(0).toVar();
  const akzent = float(0).toVar();
  const relief = float(0).toVar();
  const typ = u.typ;
  const scale = float(1).div(bodyScale);
  // gemalte Unruhe: Koordinaten mit niederfrequentem Rauschen verschieben
  const jit = noise3(rest.mul(scale).mul(5.1).add(u.seed)).sub(0.5).mul(u.zittern).mul(0.12);
  const uArc = spine.x.mul(scale).add(jit);
  const vArc = spine.y.div(6.2831853).mul(spine.z).mul(scale).add(jit.mul(0.6));
  const dorsal = spine.w;
  const size = mix(float(0.06), float(0.3), u.groesse); // Grundgröße in Körpereinheiten
  const freq = float(1).div(size);
  const soft = mix(float(0.06), float(0.3), u.spitze);

  // 1 Streifen (Tiger): Ringe quer zur Wirbelsäule, am Rücken breit, zum Bauch in Spitzen auslaufend
  If(typ.equal(1), () => {
    const k = uArc.mul(freq).mul(mix(float(0.7), float(1.6), u.dichte)).add(u.drehung.mul(vArc).mul(2));
    const idx = floor(k);
    const len = hash(idx.add(u.seed)).mul(0.6).add(0.6); // Stripe-Länge zufällig
    const taper = smoothstep(float(-1).add(len.oneMinus().mul(1.6)), float(0.9), dorsal);
    const w = mix(float(0.05), float(0.46), u.dichte).mul(taper);
    const d = abs(fract(k).sub(0.5));
    mask.assign(float(1).sub(smoothstep(w.sub(soft.mul(0.5)), w.add(soft.mul(0.5)), d)).mul(smoothstep(0.02, 0.2, w)));
  });
  // 8 Ringel: volle Ringe ohne Spitzen
  If(typ.equal(8), () => {
    const k = uArc.mul(freq).mul(mix(float(0.7), float(1.6), u.dichte));
    const d = abs(fract(k).sub(0.5));
    const w = mix(float(0.12), float(0.42), u.dichte);
    mask.assign(float(1).sub(smoothstep(w.sub(soft.mul(0.4)), w.add(soft.mul(0.4)), d)));
  });
  // 5 Punkte (Drachenfisch): weiche Punkte, auf dem Rücken dichter
  If(typ.equal(5), () => {
    const c = cells3(rest.mul(scale).mul(freq).mul(0.9), u.seed);
    const r = mix(float(0.18), float(0.4), u.dichte).mul(hash(c.z.mul(91)).mul(0.5).add(0.6));
    const d = c.x;
    const present = smoothstep(float(-0.9), float(0.2), dorsal).mul(step01(hash(c.z.mul(17).add(u.seed)), float(1).sub(u.dichte.mul(0.6))));
    mask.assign(float(1).sub(smoothstep(r.sub(soft.mul(0.3)), r.add(soft.mul(0.3)), d)).mul(present));
  });
  // 2 Rosetten (Leopard): Ring mit hellerem Kern, Lücken im Ring
  If(typ.equal(2), () => {
    const c = cells3(rest.mul(scale).mul(freq).mul(0.8), u.seed);
    const d = c.x;
    const ring = smoothstep(float(0.28), float(0.36), d).mul(float(1).sub(smoothstep(float(0.5), float(0.6), d)));
    const gaps = step01(noise3(rest.mul(scale).mul(freq).mul(3.1).add(c.z.mul(10))), float(0.35));
    const present = smoothstep(float(-0.8), float(0.1), dorsal);
    mask.assign(ring.mul(gaps).mul(present));
    akzent.assign(float(1).sub(smoothstep(float(0.2), float(0.3), d)).mul(present).mul(0.7));
  });
  // 3 Platten (Giraffe): Zellen mit schmalen hellen Fugen
  If(typ.equal(3), () => {
    const c = cells3(rest.mul(scale).mul(freq).mul(0.6), u.seed);
    const fuge = c.y.sub(c.x);
    const w = mix(float(0.02), float(0.12), float(1).sub(u.dichte));
    const platte = smoothstep(w, w.add(soft.mul(0.3)), fuge);
    // Flecken bis fast zum Bauch (Bild 6: nur die Bauchmitte bleibt frei)
    const present = smoothstep(float(-1.0), float(-0.75), dorsal);
    mask.assign(platte.mul(present));
    relief.assign(hash(c.z.mul(31)).sub(0.5).mul(0.5));
  });
  // 4 Schuppen: Sechseckkacheln in (u, v), Umfang skaliert mit — Schuppen bleiben gleich groß
  If(typ.equal(4), () => {
    const sc = freq.mul(mix(float(1.2), float(3), u.dichte));
    const uv = vec2(uArc.mul(sc), vArc.mul(sc).mul(1.1547));
    // Sechseckgitter: zwei versetzte Rechteckgitter, nächste Mitte
    const a = uv;
    const b = uv.add(vec2(0.5, 0.5));
    const fa = fract(a).sub(0.5), fb = fract(b).sub(0.5);
    const da = length(vec2(fa.x, fa.y.mul(1.2)));
    const db = length(vec2(fb.x, fb.y.mul(1.2)));
    const nearA = da.lessThan(db);
    const d = min(da, db);
    const cell = floor(mix(b, a, nearA.toFloat()));
    const edge = smoothstep(float(0.44), float(0.5), d); // Schuppenrand
    // Schuppe hängt nach unten: oben hell, unten dunkler (Relief), Rand als dünne dunkle Fuge
    const localY = mix(fb.y, fa.y, nearA.toFloat());
    relief.assign(localY.mul(1.6).sub(edge.mul(0.8)));
    const tone = hash(cell.dot(vec2(1, 57)).add(u.seed)).sub(0.5).mul(0.5).add(0.5);
    mask.assign(mix(tone.mul(0.6), float(1), edge).mul(smoothstep(float(-0.95), float(-0.4), dorsal)));
  });
  // 7 Flecken (Koi, Kuh, Salamander 9, Koi 10): große weiche Flächen aus Rauschen
  If(typ.equal(7).or(typ.equal(9)).or(typ.equal(10)), () => {
    const n = noise3(rest.mul(scale).mul(freq).mul(0.35).add(u.seed)).mul(0.6).add(noise3(rest.mul(scale).mul(freq).mul(0.9).add(u.seed.mul(3))).mul(0.4));
    const thr = mix(float(0.62), float(0.42), u.dichte);
    mask.assign(smoothstep(thr.sub(soft.mul(0.15)), thr.add(soft.mul(0.15)), n));
  });
  const freiW = clamp(frei, 0, 1);
  return { mask: mask.mul(freiW), akzent: akzent.mul(freiW), relief: relief.mul(freiW) };
}

/** 1 wenn x < edge (weich). */
function step01(x: FloatNode, edge: FloatNode): FloatNode {
  return float(1).sub(smoothstep(edge.sub(0.02), edge.add(0.02), x));
}

export const _musterUnused = { dot, cos, sin, max, Vector3 };
