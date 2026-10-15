// Phase 2 M5 (Plan 5.4, Schritt 2): Glubschauge — eine Kugel je Auge, auf dem Kopf angedockt (Bild 10): helle Lederhaut,
// große dunkle Pupille in der Grundform (`pupillenAbstand`: Knopf rund, Schlitz senkrecht, Mandel quer) und als Zustand
// (X, Spirale, Schlitz), ein scharfer Glanzpunkt zur Lichtseite. Zu, Blinzeln und Sichel deckt das Lid: Haut (Grundfarbe in
// den Wertstufen des Körpers) über der Kugel bis zu einer Ebene im Rahmen der Kugel. Das obere Lid kommt von oben, seine
// Kante hängt von vorn gesehen in der Mitte durch (∪); das untere Lid der Sichel steigt von unten, seine Kante wölbt sich (∩).
// Ein Lid im Material statt einer eigenen Kappe: Es deckt aus jeder Richtung (das Glubschauge steht weit heraus und wird
// auch von der Seite gesehen), muss in Ruhe nicht versteckt werden und liegt ohne Flimmern genau auf der Kugel.
// Rahmen der Kugel: +z Blick (Flächennormale), +y oben, +x rechts — gedreht wie die gemalte Form, links gespiegelt.

import { Vector3, Vector4 } from 'three';
import { MeshBasicNodeMaterial, type UniformNode } from 'three/webgpu';
import { Fn, abs, clamp, dot, float, fwidth, max, min, mix, normalGeometry, normalView, normalize, positionView, reflect, select, smoothstep, step, uniform, vec3, vec4 } from 'three/tsl';
import type { Vec3Node } from '../../common/tsl';
import { pupillenAbstand } from './augenFormen';
import { type CreatureMaterialUniforms, stepShade } from './earleCreature';

export interface GlubschUniforms {
  lederhaut: UniformNode<'vec3', Vector3>;
  /** Form (x), Zustand (y), Breite (z): Codes wie `eyeForm` (AUGEN_FORM, AUGEN_ZUSTAND) */
  form: UniformNode<'vec4', Vector4>;
  /** Lider als Ebenen im Rahmen der Kugel: Normale (xyz) und Abstand (w); bedeckt, wo dot(Richtung, Normale) > w (`lidEbene`) */
  lidOben: UniformNode<'vec4', Vector4>;
  lidUnten: UniformNode<'vec4', Vector4>;
  /** Lidspalt des geschlossenen Auges: Ebene wie die Lider (w = 2: aus), als dunkler Strich auf dem Lid */
  linie: UniformNode<'vec4', Vector4>;
  /** Uhr der Spirale (s) */
  zeit: UniformNode<'float', number>;
}

export function createGlubschUniforms(): GlubschUniforms {
  return {
    lederhaut: uniform(new Vector3(0.96, 0.95, 0.9)),
    form: uniform(new Vector4(1, 0, 1, 0)),
    lidOben: uniform(new Vector4(0, 1, 0, 2)),
    lidUnten: uniform(new Vector4(0, -1, 0, 2)),
    linie: uniform(new Vector4(0, 1, 0, 2)),
    zeit: uniform(0),
  };
}

/** Neigung der Lidebenen nach vorn bei geschlossenem Lid (Bogenmaß): oben flacher Durchhang, unten deutliche Wölbung. */
export const LID_NEIGUNG = { oben: 0.6, unten: 0.75 } as const;

/**
 * Lidebene für einen Lidwert (0 offen … 1 zu) im Rahmen der Kugel. Die Mitte der Lidkante wandert, von vorn gesehen,
 * gleichmäßig vom Rand (oben bzw. unten) zum Gegenrand; die Ebene neigt sich dabei nach vorn (bis `neigung`), so hängt die
 * obere Kante durch und die untere wölbt sich. Herleitung: Normale p = (0, ±cos a, sin a), Abstand h = cos ψ; der vorderste
 * Punkt der Kante liegt auf Höhe ±cos(ψ + a) — also ψ = acos(Höhe) − a. Offen: h = 2 (deckt nichts). Zum Schluss rückt die
 * Ebene über den Rest der Kugel (sonst bliebe hinten unten ein Streifen Lederhaut, den man am vorstehenden Auge sieht).
 */
export function lidEbene(lid: number, oben: boolean, neigung: number, out = new Vector4()): Vector4 {
  const l = Math.min(1, Math.max(0, lid));
  if (l < 1e-3) return out.set(0, oben ? 1 : -1, 0, 2);
  const hoehe = 1 - 2 * l;
  const a = neigung * l;
  const psi = Math.max(Math.acos(Math.max(-1, Math.min(1, hoehe))) - a, 0);
  const t = Math.min(1, Math.max(0, (l - 0.85) / 0.15));
  return out.set(0, (oben ? 1 : -1) * Math.cos(a), Math.sin(a), Math.cos(psi) - 0.35 * t * t * (3 - 2 * t));
}

/** Lidspalt des geschlossenen Auges (‿ wie das gemalte „zu“): die Kante des oberen Lids bei 72 %; aus = w 2. */
export function lidLinie(an: boolean, out = new Vector4()): Vector4 {
  return an ? lidEbene(0.72, true, LID_NEIGUNG.oben, out) : out.set(0, 1, 0, 2);
}

export function createGlubschMaterial(u: CreatureMaterialUniforms, g: GlubschUniforms): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.name = 'ee-glubsch';
  material.fog = false;
  material.colorNode = Fn(() => {
    // Richtung vom Kugelmittelpunkt im Rahmen der Kugel (Einheitskugel): x, y quer zur Blickachse, z = Blick
    const nl = normalize(normalGeometry as unknown as Vec3Node).toVar();
    // Pupille nur vorn (sonst stünde ihr Spiegelbild hinten); Kantenbreite begrenzt, damit der Sprung am Rand keine Linie zieht
    const dPup = select(nl.z.greaterThan(0), pupillenAbstand(nl.x, nl.y, g.form.x, g.form.y, g.form.z, g.zeit.mul(2.4)), float(1));
    const aaP = min(fwidth(dPup).mul(0.8), 0.05).add(1e-4);
    const pupille = float(1).sub(smoothstep(aaP.negate(), aaP, dPup));
    // Licht wie am Körper (Figurenlicht im Blickraum): weiche Rundung der Lederhaut, Lid in den Wertstufen der Haut
    const N = normalize(normalView as unknown as Vec3Node).toVar();
    const V = normalize(positionView.negate() as unknown as Vec3Node);
    const wrap = clamp(dot(N, u.lightDir).mul(0.5).add(0.5), 0, 1).toVar();
    const schatten = mix(float(0.74), float(1.03), smoothstep(0.22, 0.78, wrap));
    const col = mix(g.lederhaut, u.auge, pupille).mul(schatten).toVar();
    // Glanzpunkt: scharfe Scheibe, wo der gespiegelte Blick zum Licht zeigt (wandert mit der Ansicht wie gemalt); nur bei
    // runder oder Mandel-Pupille (am schmalen Schlitz bisse er eine Kerbe in die Pupille, X und Spirale sind matt)
    const gl = dot(reflect(V.negate(), N), u.lightDir);
    const aaG = min(fwidth(gl), 0.05).add(1e-4);
    const glanzAn = step(0.5, g.form.x).mul(step(g.form.y, 2.5));
    col.assign(mix(col, vec3(1, 0.99, 0.96), smoothstep(float(0.905).sub(aaG), float(0.905).add(aaG), gl).mul(glanzAn)));
    // Lider: Abstand zur Ebene (positiv = bedeckt); ein dunkler Saum unter der Kante (Schatten des Lids auf der Kugel)
    const sO = dot(nl, g.lidOben.xyz).sub(g.lidOben.w);
    const sU = dot(nl, g.lidUnten.xyz).sub(g.lidUnten.w);
    const s = max(sO, sU);
    const aaL = min(fwidth(s), 0.05).add(1e-4);
    const saum = smoothstep(float(-0.07), float(-0.01), s).mul(float(1).sub(smoothstep(aaL.negate(), aaL, s)));
    col.assign(col.mul(float(1).sub(saum.mul(0.45))));
    const v = stepShade(wrap, u.stufen, u.federung, u.verlauf);
    const haut = mix(mix(u.grund.schatten, u.grund.base, smoothstep(0, 0.5, v)), u.grund.licht, smoothstep(0.5, 1, v)).mul(0.97).toVar();
    // Lidspalt: dunkler Strich auf dem geschlossenen Lid, nur vorn
    const sL = abs(dot(nl, g.linie.xyz).sub(g.linie.w));
    const aaS = min(fwidth(sL), 0.05).add(1e-4);
    const strich = float(1).sub(smoothstep(float(0.028).sub(aaS), float(0.028).add(aaS), sL)).mul(smoothstep(0.05, 0.25, nl.z));
    haut.assign(mix(haut, u.grund.schatten.mul(0.42), strich));
    col.assign(mix(col, haut, smoothstep(aaL.negate(), aaL, s)));
    return vec4(col, 1);
  })();
  return material;
}
