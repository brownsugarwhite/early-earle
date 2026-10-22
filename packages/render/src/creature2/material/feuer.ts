import { Color, Vector3, Vector4 } from 'three';
import { MeshBasicNodeMaterial, type UniformNode } from 'three/webgpu';
import { Fn, abs, atan, clamp, dot, float, floor, fract, hash, max, min, mix, modelViewMatrix, mx_fractal_noise_float, mx_noise_float, normalize, positionGeometry, positionView, pow, sin, smoothstep, uniform, uniformArray, vec2, vec3, vec4 } from 'three/tsl';
import type { FloatNode, Vec3Node, Vec4Node } from '../../common/tsl';
import { MAX_SLIT_EYES } from './earleCreature';

/**
 * Feuer- und Gas-Wesen (Beweis 5, Plan 8.5/8.6, Bogen `substance gas:fire`): unbeleuchtetes Material mit **Bändern wie
 * gemalt**: Ein Wert aus Höhe im Körper, seitlichem Abstand zur Flammenachse im Blickraum (die Bänder schachteln sich
 * um die Achse wie in einer gezeichneten Flamme, nie entlang von Falten) und nach oben strömendem Rauschen wird in vier
 * Bänder posterisiert (außen dunkel/rot … innen hell/Kern). Feuer: harte Bandgrenzen, schnelles Strömen; Gas: weiche
 * Grenzen (hart → weich), langsames Strömen, kühle Palette. Dazu Papierkorn und die Schlitzaugen des Earle-Materials.
 * Keine Transparenz, keine Partikel: Zungen, Flämmchen und Schwaden sind Klingen (Käfige) mit demselben Material.
 */
export interface FeuerUniforms {
  /** vier Bandfarben (linear), außen → innen */
  palette: ReturnType<typeof uniformArray<Vector3>>;
  zeit: UniformNode<'float', number>;
  bodyScale: UniformNode<'float', number>;
  /** Körpermitte (Körperraum) und Fußhöhe */
  mitte: UniformNode<'vec3', Vector3>;
  /** Strömung (Einheiten je Sekunde, nach oben), Rauschstärke, Bandweichheit (0 hart … 0,6 weich), Korn */
  fluss: UniformNode<'float', number>;
  rauschen: UniformNode<'float', number>;
  weich: UniformNode<'float', number>;
  korn: UniformNode<'float', number>;
  /** Bandverteilung: Wert im Kern (bei Kernhöhe, auf der Achse), Abfall je Höhenabstand und je seitlichem Abstand (in Körperhöhen), Kernhöhe (0 Fuß … 1 Scheitel) */
  kernWert: UniformNode<'float', number>;
  hoehenAbfall: UniformNode<'float', number>;
  seitenAbfall: UniformNode<'float', number>;
  /** Welle: seitliche Verschiebung der Bandgrenzen durch senkrecht gestrecktes Rauschen (Anteil der Höhe), geschichtete Flammenzungen */
  welle: UniformNode<'float', number>;
  /** Wirbel: Spiralarme um die Achse (Stärke), für Gas */
  wirbel: UniformNode<'float', number>;
  kernHoehe: UniformNode<'float', number>;
  /** Augen wie im Earle-Material */
  eyePos: ReturnType<typeof uniformArray<Vector4>>;
  eyeUp: ReturnType<typeof uniformArray<Vector4>>;
  eyeCount: UniformNode<'float', number>;
  blink: UniformNode<'float', number>;
  augeFarbe: UniformNode<'vec3', Vector3>;
}

export type FeuerArt = 'feuer' | 'gas';

/** Paletten je Art für Stufe 7 des Bogens (außen → innen), sRGB-Hex. */
export const FEUER_PALETTEN: Record<FeuerArt, [string, string, string, string]> = {
  feuer: ['#d8432c', '#f0812c', '#f7bd3a', '#fde9a0'],
  gas: ['#3d9c93', '#86cf78', '#c9e86a', '#eef7b0'],
};

export function createFeuerUniforms(): FeuerUniforms {
  return {
    palette: uniformArray([new Vector3(0.6, 0.1, 0.05), new Vector3(0.9, 0.3, 0.05), new Vector3(0.95, 0.55, 0.05), new Vector3(1, 0.85, 0.4)]),
    zeit: uniform(0),
    bodyScale: uniform(1),
    mitte: uniform(new Vector3(0, 0.25, 0)),
    fluss: uniform(0.35),
    rauschen: uniform(0.4),
    weich: uniform(0.0),
    korn: uniform(0.05),
    kernWert: uniform(2.9),
    hoehenAbfall: uniform(2.2),
    seitenAbfall: uniform(3.2),
    welle: uniform(0.25),
    wirbel: uniform(0),
    kernHoehe: uniform(0.4),
    eyePos: uniformArray(Array.from({ length: MAX_SLIT_EYES }, () => new Vector4(0, 0, 0, 0))),
    eyeUp: uniformArray(Array.from({ length: MAX_SLIT_EYES }, () => new Vector4(0, 1, 0, 1))),
    eyeCount: uniform(0),
    blink: uniform(0),
    augeFarbe: uniform(new Vector3(0.05, 0.03, 0.06)),
  };
}

/** Art anwenden: Palette, Strömung, Bandweichheit. */
export function applyFeuerArt(u: FeuerUniforms, art: FeuerArt): void {
  FEUER_PALETTEN[art].forEach((hex, i) => {
    const c = new Color(hex);
    (u.palette.array[i] as Vector3).set(c.r, c.g, c.b);
  });
  u.fluss.value = art === 'feuer' ? 0.45 : 0.12;
  u.rauschen.value = art === 'feuer' ? 0.42 : 0.55;
  u.weich.value = art === 'feuer' ? 0.04 : 0.45;
  // Feuer: heller Kern in der unteren Körpermitte, Orange als Körper, Rot an Rändern und Spitzen; Gas: flacher, mehr vom Rauschen
  u.kernWert.value = art === 'feuer' ? 2.9 : 2.5;
  u.hoehenAbfall.value = art === 'feuer' ? 2.2 : 1.2;
  u.seitenAbfall.value = art === 'feuer' ? 3.2 : 1.8;
  u.welle.value = art === 'feuer' ? 0.28 : 0.12;
  u.wirbel.value = art === 'feuer' ? 0 : 0.45;
  u.kernHoehe.value = art === 'feuer' ? 0.4 : 0.45;
  u.augeFarbe.value.set(0.05, 0.03, 0.06);
}

export function createFeuerMaterial(u: FeuerUniforms): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.fog = false;
  material.colorNode = Fn(() => {
    const rest = positionGeometry as unknown as Vec3Node;
    const H = max(u.bodyScale, 0.001);
    // Höhe 0 (Fuß) … 1 (Scheitel) über der Körpermitte
    const h = clamp(rest.y.sub(u.mitte.y).div(H).add(0.5), 0, 1.4).toVar();
    // seitlicher Abstand zur Flammenachse im Blickraum (Achse = Lot durch die Körpermitte)
    const mitteView = (modelViewMatrix as unknown as { mul(v: Vec4Node): Vec4Node }).mul(vec4(u.mitte, 1));
    const xView = abs((positionView as unknown as Vec3Node).x.sub(mitteView.x)).div(H);
    // Strömen: Rauschen im Körperraum, nach oben wandernd; eine grobe und eine feine Oktave
    const q = rest.sub(u.mitte).div(H);
    const grob = mx_fractal_noise_float(q.mul(vec3(2.2, 0.8, 2.2)).add(vec3(0, u.zeit.mul(u.fluss).negate(), 0)), 2, 2.0, 0.5, 1.0);
    const fein = mx_noise_float(q.mul(vec3(5, 2.5, 5)).add(vec3(u.zeit.mul(u.fluss).mul(0.3), u.zeit.mul(u.fluss).mul(-1.6), 0)));
    const noise = grob.mul(0.75).add(fein.mul(0.25));
    // Welle (Bogen Feuer: geschichtete, wellige Flammenzungen): die Bandgrenzen werden seitlich von einem senkrecht
    // gestreckten, nach oben strömenden Rauschen verschoben; nach oben hin stärker, am Fuß ruhig. Die Bänder werden
    // nach oben schmaler (Seitenabfall wächst mit der Höhe): verschachtelte Flammen statt Schalen.
    const wq = q.mul(vec3(1.6, 3.2, 1.6)).add(vec3(0, u.zeit.mul(u.fluss).mul(-1.3), 0.7));
    const welle = mx_noise_float(wq).mul(u.welle).mul(float(0.35).add(h.mul(0.9)));
    const xW = abs(xView.add(welle));
    // Wirbel (Bogen Nebel): Spiralarme um die Achse, langsam drehend
    const r2 = q.xz.length();
    const phi = atan(q.z, q.x).add(r2.mul(3.5)).sub(u.zeit.mul(0.25));
    const wirbel = sin(phi.mul(2).add(q.y.mul(3))).mul(u.wirbel).mul(smoothstep(0.05, 0.35, r2));
    // Bandwert: im Kern (Achse, Kernhöhe) hoch, mit Höhenabstand und seitlichem Abstand fallend, vom Rauschen gewellt;
    // über dem Scheitel (Zungen) läuft er zu den Spitzen hin aus
    const seite = xW.mul(u.seitenAbfall).mul(float(0.7).add(h.mul(0.6)));
    const hoehe = max(h.sub(u.kernHoehe), 0).mul(u.hoehenAbfall).mul(0.8).add(max(u.kernHoehe.sub(h), 0).mul(u.hoehenAbfall));
    const v = u.kernWert.sub(seite).sub(hoehe).add(noise.mul(u.rauschen).mul(0.6)).add(wirbel).toVar();
    const vb = clamp(v, 0.001, 3.999).toVar();
    const b = floor(vb);
    const f = fract(vb);
    const w = max(u.weich, 0.02);
    const t = smoothstep(float(1).sub(w), float(1), f);
    const pal = u.palette as unknown as { element(i: FloatNode): Vec3Node };
    const c0 = pal.element(b);
    const c1 = pal.element(min(b.add(1), 3));
    const farbe = mix(c0, c1, t).toVar();
    // Papierkorn (Look-Vertrag 5): getupft, im Körperraum
    const k = hash(floor(rest.mul(float(260).div(H))).xyz.dot(vec3(1, 57, 113)));
    farbe.assign(farbe.mul(float(1).sub(u.korn).add(u.korn.mul(2).mul(k))));
    // Schlitzaugen wie im Earle-Material (Pille, Blinzeln staucht senkrecht)
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
      const px = float(0.08);
      eyeMask.assign(max(eyeMask, float(1).sub(smoothstep(px.negate(), px, dist)).mul(active)));
    }
    farbe.assign(mix(farbe, u.augeFarbe, eyeMask));
    void normalize;
    return vec4(farbe, 1);
  })();
  return material;
}
