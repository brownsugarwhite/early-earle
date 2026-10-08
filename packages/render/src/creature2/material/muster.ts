import { Vector3, Vector4 } from 'three';
import type { UniformNode } from 'three/webgpu';
import { If, abs, clamp, cos, dot, float, floor, fract, fwidth, hash, length, max, min, mix, select, sin, smoothstep, sqrt, step, uniform, vec2, vec3 } from 'three/tsl';
import type { FloatNode, Vec3Node, Vec4Node } from '../../common/tsl';
import { MUSTER_TYPEN, ZONEN_ARTEN, ZONEN_MUSTER } from '@ee/creature';

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

/**
 * Hash für beliebige Zahlen: `hash` aus three/tsl wandelt den Startwert in eine vorzeichenlose Ganzzahl — negative Werte
 * werden dabei 0, alle Zellen mit negativer Kennung bekämen denselben Zufall (gleichförmiges Gitter auf der Rückseite,
 * an den Beinen). Der Versatz hält die Kennung positiv; bis ±10⁶ bleiben Ganzzahlen in float exakt.
 */
export function hashPos(x: FloatNode): FloatNode {
  return hash(x.add(1048576));
}

/**
 * Hash einer ganzzahligen 3D-Zelle, verkettet (z → y → x). Die frühere lineare Kennung x + 57y + 113z kollidiert entlang
 * kurzer Gittervektoren (z. B. (−1, 2, −1)): bei feinem Korn wurden daraus Streifen und Webmuster.
 */
export function hash3(i: Vec3Node): FloatNode {
  const a = hashPos(i.z);
  const b = hashPos(i.y.add(floor(a.mul(65536))));
  return hashPos(i.x.add(floor(b.mul(65536))));
}

/** Wertrauschen 3D (0…1). */
function noise3(p: Vec3Node): FloatNode {
  const i = floor(p);
  const f = fract(p);
  const w = f.mul(f).mul(float(3).sub(f.mul(2)));
  const h = (ox: number, oy: number, oz: number): FloatNode => hash3(i.add(vec3(ox, oy, oz)));
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
        const h = hash3(i.add(o).add(floor(seed)));
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
  // Falle (TSL): ein Knoten, den mehrere `If`-Zweige benutzen, wird dort berechnet, wo er zuerst gebaut wird — im ersten
  // Zweig. Läuft dieser Zweig nicht, bleibt der Wert in den anderen 0 (Schuppen, Platten, Punkte waren darum unsichtbar,
  // nur Streifen als erster Zweig gingen). Gemeinsame Werte deshalb vor den Zweigen als Variable festhalten (`toVar`).
  const scale = float(1).div(bodyScale).toVar();
  // gemalte Unruhe: Koordinaten mit niederfrequentem Rauschen verschieben (nur mit Muster — spart das Rauschen bei „uni“)
  const jit = float(0).toVar();
  If(typ.greaterThan(0.5), () => {
    jit.assign(noise3(rest.mul(scale).mul(5.1).add(u.seed)).sub(0.5).mul(u.zittern).mul(0.12));
  });
  const uArc = spine.x.mul(scale).add(jit).toVar();
  const vArc = spine.y.div(6.2831853).mul(spine.z).mul(scale).add(jit.mul(0.6)).toVar();
  const dorsal = spine.w.toVar();
  const size = mix(float(0.06), float(0.3), u.groesse); // Grundgröße in Körpereinheiten
  const freq = float(1).div(size).toVar();
  const soft = mix(float(0.06), float(0.3), u.spitze).toVar();

  // 1 Streifen (Tiger, Bild 9/17): gemalte Pinselstriche quer zur Wirbelsäule — an Rücken und Flanken breit, zum Bauch in
  // Spitzen auslaufend (Länge je Strich zufällig), die Breite schwankt entlang des Strichs wie Pinseldruck; Kante
  // weich-hart (kurz gefedert, pixelscharf geglättet)
  If(typ.equal(1), () => {
    const k = uArc.mul(freq).mul(mix(float(0.7), float(1.6), u.dichte)).add(u.drehung.mul(vArc).mul(2));
    const idx = floor(k);
    const len = hashPos(idx.add(u.seed)).mul(0.6).add(0.6); // Strichlänge zufällig
    const taper = smoothstep(float(-1).add(len.oneMinus().mul(1.6)), float(0.25), dorsal);
    const druck = noise3(rest.mul(scale).mul(freq).mul(1.3).add(idx.mul(3.1))).mul(0.6).add(0.7);
    const w = mix(float(0.05), float(0.46), u.dichte).mul(taper).mul(druck);
    const d = abs(fract(k).sub(0.5));
    const aaS = max(fwidth(k).mul(0.7), soft.mul(0.12));
    mask.assign(float(1).sub(smoothstep(w.sub(aaS), w.add(aaS), d)).mul(smoothstep(0.015, 0.08, w)));
  });
  // 8 Ringel (Clownfisch, Zuckerstange): volle Ringe ohne Spitzen, Kante weich-hart
  If(typ.equal(8), () => {
    const k = uArc.mul(freq).mul(mix(float(0.7), float(1.6), u.dichte)).add(u.drehung.mul(vArc).mul(2));
    const d = abs(fract(k).sub(0.5));
    const w = mix(float(0.12), float(0.42), u.dichte);
    const aaR = max(fwidth(k).mul(0.7), soft.mul(0.1));
    mask.assign(float(1).sub(smoothstep(w.sub(aaR), w.add(aaR), d)));
  });
  // 5 Punkte (Walhai, Drachenfisch): runde Punkte überall außer der Bauchmitte (die hellen Bäuche machen Zonen)
  If(typ.equal(5), () => {
    const c = cells3(rest.mul(scale).mul(freq).mul(1.5), u.seed);
    const r = mix(float(0.18), float(0.4), u.dichte).mul(hash(c.z.mul(91)).mul(0.5).add(0.6));
    const d = c.x;
    const present = smoothstep(float(-0.95), float(-0.5), dorsal).mul(step01(hash(c.z.mul(17).add(u.seed)), float(1).sub(u.dichte.mul(0.6))));
    const aaP = max(fwidth(d).mul(0.8), soft.mul(0.06));
    mask.assign(float(1).sub(smoothstep(r.sub(aaP), r.add(aaP), d)).mul(present));
  });
  // 2 Rosetten (Leopard, Bild 3/17): unterbrochene Ringe aus 3–5 Tupfern um eine etwas dunklere, wärmere Mitte (Akzent),
  // dazwischen kleine volle Punkte
  If(typ.equal(2), () => {
    const c = cells3(rest.mul(scale).mul(freq).mul(1.4), u.seed);
    const d = c.x;
    const rr = hash(c.z.mul(91)).mul(0.12).add(0.27);
    const bw = mix(float(0.07), float(0.13), u.dichte);
    const aaR = max(fwidth(d).mul(0.8), 0.012);
    const ring = smoothstep(rr.sub(bw).sub(aaR), rr.sub(bw).add(aaR), d).mul(float(1).sub(smoothstep(rr.add(bw).sub(aaR), rr.add(bw).add(aaR), d)));
    const luecken = smoothstep(0.36, 0.44, noise3(rest.mul(scale).mul(freq).mul(3.4).add(c.z.mul(10))));
    const istPunkt = step(hash(c.z.mul(53).add(u.seed)), 0.28);
    const punkt = float(1).sub(smoothstep(float(0.15).sub(aaR), float(0.15).add(aaR), d));
    const present = smoothstep(float(-0.95), float(-0.5), dorsal);
    mask.assign(mix(ring.mul(luecken), punkt, istPunkt).mul(present));
    akzent.assign(float(1).sub(smoothstep(rr.sub(bw).sub(0.06), rr.sub(bw), d)).mul(float(1).sub(istPunkt)).mul(present).mul(0.55));
  });
  // 3 Platten (Giraffe, Bild 6): Zellen mit schmalen hellen Fugen, Kante weich-hart
  If(typ.equal(3), () => {
    const c = cells3(rest.mul(scale).mul(freq).mul(0.6), u.seed);
    const fuge = c.y.sub(c.x);
    const w = mix(float(0.02), float(0.12), float(1).sub(u.dichte));
    const platte = smoothstep(w, w.add(max(fwidth(fuge).mul(1.2), soft.mul(0.1))), fuge);
    // Flecken bis fast zum Bauch (Bild 6: nur die Bauchmitte bleibt frei)
    const present = smoothstep(float(-1.0), float(-0.75), dorsal);
    mask.assign(platte.mul(present));
    relief.assign(hash(c.z.mul(31)).sub(0.5).mul(0.5));
  });
  // 4 Schuppen (Bild 13/17): gerundete Sechsecke in (u, v) — der Umfang skaliert mit, die Schuppen bleiben gleich groß
  // und verzerren nicht. Jede Schuppe ein dunklerer Fleck mit eigenem Ton, dazwischen helle Fugen in der Grundfarbe; zum
  // Bauch hin werden die Schuppen kleiner und die Fugen breiter (Aal, Bild 13), oben ein Hauch Licht je Schuppe.
  // (Die erste Fassung zeichnete die Fuge erst ab Abstand 0,44 — größer, als er im Gitter je wird: keine Schuppen sichtbar.)
  If(typ.equal(4), () => {
    const sc = freq.mul(mix(float(1.2), float(3), u.dichte));
    const p = vec2(uArc.mul(sc), vArc.mul(sc));
    // Sechseckkachelung: zwei versetzte Rechteckgitter (Breite 1, Höhe √3), nächste Mitte gewinnt
    const sx = 1, sy = 1.7320508;
    const ca = floor(vec2(p.x.div(sx), p.y.div(sy))).add(0.5);
    const cb = floor(vec2(p.x.sub(0.5).div(sx), p.y.sub(1).div(sy))).add(0.5);
    const ha = p.sub(vec2(ca.x.mul(sx), ca.y.mul(sy)));
    const hb = p.sub(vec2(cb.x.add(0.5).mul(sx), cb.y.add(0.5).mul(sy)));
    const nimmA = dot(ha, ha).lessThan(dot(hb, hb));
    const lokal = select(nimmA, ha, hb);
    const zelle = select(nimmA, ca, cb.add(0.5));
    const q = abs(lokal);
    // Sechseckabstand (0 Mitte … 0,5 Kante), zum Kreis hin gerundet
    const hexR = max(q.x.mul(0.5).add(q.y.mul(sy * 0.5)), q.x);
    const dS = mix(hexR, length(lokal).mul(0.93), 0.45);
    const radius = mix(float(0.24), float(0.43), smoothstep(-0.7, 0.35, dorsal));
    const kanteS = max(fwidth(dS).mul(0.9), soft.mul(0.12));
    const schuppe = float(1).sub(smoothstep(radius.sub(kanteS), radius.add(kanteS), dS));
    const tone = hash3(vec3(zelle.x, zelle.y, u.seed.mul(7))).mul(0.35).add(0.65);
    relief.assign(lokal.y.mul(-0.9).mul(schuppe));
    mask.assign(schuppe.mul(tone).mul(smoothstep(float(-0.92), float(-0.5), dorsal)));
  });
  // 7 Flecken (Kuh, Dalmatiner): unregelmäßige Flächen aus Rauschen, Kante weich-hart (Bild 17)
  If(typ.equal(7), () => {
    const n = noise3(rest.mul(scale).mul(freq).mul(0.35).add(u.seed)).mul(0.6).add(noise3(rest.mul(scale).mul(freq).mul(0.9).add(u.seed.mul(3))).mul(0.4));
    const thr = mix(float(0.62), float(0.42), u.dichte);
    const aaF = max(fwidth(n).mul(0.8), soft.mul(0.03));
    mask.assign(smoothstep(thr.sub(aaF), thr.add(aaF), n));
  });
  // 9 Salamander (Bild 17): längliche Flecken und Bänder, entlang der Körperhöhe gestreckt, klare Kante
  If(typ.equal(9), () => {
    const q = rest.mul(scale).mul(freq).mul(vec3(1.1, 0.4, 1.1));
    const n = noise3(q.add(u.seed)).mul(0.65).add(noise3(q.mul(2.3).add(u.seed.mul(3))).mul(0.35));
    const thr = mix(float(0.6), float(0.44), u.dichte);
    const aaF = max(fwidth(n).mul(0.8), soft.mul(0.025));
    mask.assign(smoothstep(thr.sub(aaF), thr.add(aaF), n));
  });
  // 10 Koi (Bild 17): wenige große Flächen mit klarer, leicht gewellter Kante
  If(typ.equal(10), () => {
    const n = noise3(rest.mul(scale).mul(freq).mul(0.3).add(u.seed)).mul(0.75).add(noise3(rest.mul(scale).mul(freq).mul(0.8).add(u.seed.mul(5))).mul(0.25));
    const thr = mix(float(0.52), float(0.4), u.dichte);
    const aaF = max(fwidth(n).mul(0.8), soft.mul(0.025));
    mask.assign(smoothstep(thr.sub(aaF), thr.add(aaF), n));
  });
  const freiW = clamp(frei, 0, 1);
  return { mask: mask.mul(freiW), akzent: akzent.mul(freiW), relief: relief.mul(freiW) };
}

/** 1 wenn x < edge (weich). */
function step01(x: FloatNode, edge: FloatNode): FloatNode {
  return float(1).sub(smoothstep(edge.sub(0.02), edge.add(0.02), x));
}

export const _musterUnused = { cos, sin, Vector3 };

// --- Zonen ----------------------------------------------------------------------------------------------------------

/**
 * Zonen (Bild 17): benannte Farbflächen mit gemalter Grenze über Bauch/Rücken hinaus. Jede Zone rechnet einen
 * Abstand zur Grenze in Körpereinheiten (negativ innen) aus Ruheposition, Ruhenormale, Wirbelsäulen-Koordinaten,
 * Augen und Teil-Koordinate (Beine/Schwanz); die Grenze ist leicht gewellt (`zittern`) und weich-hart gefedert — nie
 * eine Linie, immer eine Fläche (Konturen-Regel).
 */
export const ZONEN_ANZAHL = 3;
export const ZONE_ART_INDEX: Record<(typeof ZONEN_ARTEN)[number], number> = Object.fromEntries(ZONEN_ARTEN.map((t, i) => [t, i])) as Record<(typeof ZONEN_ARTEN)[number], number>;
export const ZONE_MUSTER_INDEX: Record<(typeof ZONEN_MUSTER)[number], number> = Object.fromEntries(ZONEN_MUSTER.map((t, i) => [t, i])) as Record<(typeof ZONEN_MUSTER)[number], number>;

export interface ZonenUniforms {
  /** Je Zone: Art (Index in `ZONEN_ARTEN`), Lage, Breite, Federung. */
  form: Array<UniformNode<'vec4', Vector4>>;
  /** Je Zone: Musterbezug (Index in `ZONEN_MUSTER`). */
  modus: Array<UniformNode<'float', number>>;
  /** Gesamthöhe des Wesens im Körperraum (Boden bis Scheitel), für Latz und Band. */
  hoehe: UniformNode<'float', number>;
}

export interface ZoneDaten {
  art: (typeof ZONEN_ARTEN)[number];
  lage: number;
  breite: number;
  federung: number;
  muster: (typeof ZONEN_MUSTER)[number];
}

export function createZonenUniforms(): ZonenUniforms {
  return {
    form: Array.from({ length: ZONEN_ANZAHL }, () => uniform(new Vector4(0, 0.5, 0.5, 0.3))),
    modus: Array.from({ length: ZONEN_ANZAHL }, () => uniform(0)),
    hoehe: uniform(1),
  };
}

export function applyZonen(z: ZonenUniforms, zonen: readonly ZoneDaten[]): void {
  for (let i = 0; i < ZONEN_ANZAHL; i++) {
    const d = zonen[i];
    if (!d) {
      z.form[i]!.value.set(0, 0.5, 0.5, 0.3);
      z.modus[i]!.value = 0;
      continue;
    }
    z.form[i]!.value.set(ZONE_ART_INDEX[d.art] ?? 0, d.lage, d.breite, d.federung);
    z.modus[i]!.value = ZONE_MUSTER_INDEX[d.muster] ?? 0;
  }
}

export interface ZonenKontext {
  /** Ruheposition (Körperraum). */
  rest: Vec3Node;
  /** Ruhenormale (Einheit, Körperraum). */
  normal: Vec3Node;
  /** Bogenlänge, Winkel, Umfang, Bauch/Rücken. */
  spine: Vec4Node;
  bodyScale: FloatNode;
  /** Teil-Koordinate: Schwanz/Schlange +t (0 Wurzel … 1 Spitze), Beine −t (0 Hüfte … 1 Fuß), sonst 0. */
  teil: FloatNode;
  /** Augen: Mitte (xyz) + Größe (w) bzw. oben (xyz); Anzahl. */
  eyePos: { element(i: number): Vec4Node };
  eyeUp: { element(i: number): Vec4Node };
  eyeCount: FloatNode;
  zittern: FloatNode;
  seed: FloatNode;
}

/** Glattes Minimum (quadratisch). */
function smin(a: FloatNode, b: FloatNode, k: FloatNode): FloatNode {
  const h = max(k.sub(abs(a.sub(b))), 0).div(max(k, 1e-5));
  return min(a, b).sub(h.mul(h).mul(k).mul(0.25));
}

/**
 * Maske der Zone `i` (0…1). Abstände in Körpereinheiten; die Kante federt um `federung` (0 → pixelscharf geglättet,
 * 1 → ≈ 7 % der Körperhöhe) und wellt sich leicht mit `zittern`.
 */
export function zonenMaske(zu: ZonenUniforms, i: number, k: ZonenKontext): FloatNode {
  const f = zu.form[i]!;
  const art = f.x;
  const lage = f.y;
  const breite = f.z;
  const federung = f.w;
  const H = k.bodyScale;
  // gemeinsame Werte vor den Zweigen festhalten (siehe Falle in `musterMasks`)
  const Ht = max(zu.hoehe, H.mul(0.5)).toVar();
  const P = k.rest;
  const nR = k.normal;
  const sp = k.spine;
  // Ortsradius aus dem Umfang: seitliche Koordinate xn ≈ sin(Umfangswinkel) auf runden Querschnitten (0 Mitte … 1 Seite)
  const r = max(sp.z.div(6.2831853), H.mul(0.03)).toVar();
  const xn = abs(P.x).div(r).toVar();
  const d = float(1e3).toVar();
  // 1 Bauch: Bauch/Rücken-Koordinate unter der Linie, seitlich begrenzbar (Breite 1 = ganz herum)
  If(art.equal(1), () => {
    const L = lage.sub(0.5).mul(2.2);
    const d1 = sp.w.sub(L).mul(r).mul(1.2);
    const d2 = select(breite.greaterThan(0.98), H.negate(), xn.sub(mix(float(0.15), float(1.2), breite)).mul(r));
    d.assign(max(d1, d2));
  });
  // 2 Latz/Kehle (Bild 17 Krokodile, Wale; Bild 9 Brust): vorn, vom Boden bis zur Lage, oben als runder Bogen
  If(art.equal(2), () => {
    const top = max(lage, 0.04).mul(Ht);
    const hw = mix(float(0.12), float(1.0), breite);
    const a = 0.45;
    const uu = xn.div(hw);
    const vt = max(P.y.div(top).sub(a).div(1 - a), 0);
    const e = sqrt(uu.mul(uu).add(vt.mul(vt)));
    // Abstand erster Ordnung: (e − 1) / |∇e| — die Kante ist oben und seitlich gleich weich
    const gx = uu.div(hw.mul(r));
    const gy = vt.div(top.mul(1 - a));
    const grad = sqrt(gx.mul(gx).add(gy.mul(gy))).div(max(e, 1e-4));
    const dA = e.sub(1).div(max(grad, 1e-4));
    // nur die Vorderseite (Ruhenormale zeigt nach vorn oder seitlich)
    const dF = float(-0.25).sub(nR.z).mul(r).mul(0.6);
    d.assign(max(dA, dF));
  });
  // 3 Rückenstreifen: entlang der Rückenmitte, läuft nach unten in eine Pinselspitze aus
  If(art.equal(3), () => {
    const hw = mix(float(0.06), float(0.6), breite);
    const yEnd = float(1).sub(lage).mul(Ht);
    const taper = smoothstep(yEnd, yEnd.add(Ht.mul(0.22)), P.y);
    const dS = xn.sub(hw.mul(taper)).mul(r);
    const dB = float(0.05).sub(dot(nR, vec3(0, 0.8, -0.6))).mul(r).mul(0.6);
    d.assign(max(dS, dB));
  });
  // 4 Band (Gürtel, Clownfisch): waagerecht um den Körper in der Höhe `lage`
  If(art.equal(4), () => {
    const c = lage.mul(Ht);
    const hw = mix(float(0.015), float(0.26), breite).mul(Ht);
    d.assign(abs(P.y.sub(c)).sub(hw));
  });
  // 5 Augenmaske (Orca-Fleck, Waschbär-Band, Brauenpunkte): Ovale um die Augen, verschmelzen bei großer Breite zum Band
  If(art.equal(5), () => {
    const dE = float(1e3).toVar();
    for (let e = 0; e < 4; e++) {
      const ep = k.eyePos.element(e);
      const eu = k.eyeUp.element(e).xyz;
      const aktiv = float(e).lessThan(k.eyeCount.sub(0.5)).and(ep.w.greaterThan(1e-5));
      const re = max(ep.w.div(2.2), H.mul(0.01));
      const cen = ep.xyz.add(eu.mul(lage.sub(0.5).mul(3.2).mul(re)));
      const rh = re.mul(mix(float(1.15), float(3.8), breite));
      const rv = re.mul(mix(float(0.95), float(2.3), breite));
      const q = P.sub(cen);
      const qy = dot(q, eu);
      const qh = length(q.sub(eu.mul(qy)));
      const e2 = sqrt(qh.div(rh).mul(qh.div(rh)).add(qy.div(rv).mul(qy.div(rv))));
      const gh = qh.div(rh.mul(rh));
      const gv = qy.div(rv.mul(rv));
      const grad = sqrt(gh.mul(gh).add(gv.mul(gv))).div(max(e2, 1e-4));
      const di = select(aktiv, e2.sub(1).div(max(grad, 1e-4)), float(1e3));
      dE.assign(smin(dE, di, re.mul(0.9)));
    }
    d.assign(dE);
  });
  // 6 Socken: unterer Teil der Beine (Teil-Koordinate −t), Länge = Lage
  If(art.equal(6), () => {
    const t = k.teil.negate();
    d.assign(select(t.greaterThan(0.01), float(1).sub(lage).sub(t).mul(H).mul(0.5), float(1e3)));
  });
  // 7 Schwanzspitze (auch Schlangenende): Teil-Koordinate +t, Länge = Lage
  If(art.equal(7), () => {
    const t = k.teil;
    d.assign(select(t.greaterThan(0.01), float(1).sub(lage).sub(t).mul(H).mul(0.5), float(1e3)));
  });
  // gemalte Unruhe der Grenze (Körperraum, wandert nicht) und weich-harte Federung, pixelscharf geglättet — nur für eine
  // gewählte Zone (unbenutzte Zonen kosten kein Rauschen)
  const m = float(0).toVar();
  If(art.greaterThan(0.5), () => {
    const welle = noise3(P.div(H).mul(3.7).add(k.seed.mul(1.7))).sub(0.5).mul(float(0.025).add(k.zittern.mul(0.06))).mul(H);
    const dd = d.add(welle);
    const soft = max(float(0.004).add(federung.mul(0.07)).mul(H), fwidth(dd).mul(0.75));
    m.assign(float(1).sub(smoothstep(soft.negate(), soft, dd)));
  });
  return m;
}
