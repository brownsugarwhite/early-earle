// Phase 2 M5 (Plan 5.4, Schritte 2 und 3): Augenkugel — Glubschauge (eine Kugel je Auge auf dem Kopf angedockt, Bild 10) und
// Augapfel (tief in der Haut, Bild 11). Helle oder farbige Lederhaut, beim Augapfel eine Iris mit dunklerem Rand, die Pupille
// in der Grundform (`pupillenAbstand`: Knopf rund, Schlitz senkrecht, Mandel quer; beim Augapfel kleiner) und als Zustand
// (X, Spirale, Schlitz), ein scharfer Glanzpunkt zur Lichtseite. Zu, Blinzeln und Sichel deckt das Lid: Haut (Grundfarbe in
// den Wertstufen des Körpers) über der Kugel bis zu einer Ebene im Rahmen der Kugel. Das obere Lid kommt von oben, seine
// Kante hängt von vorn gesehen in der Mitte durch (∪); das untere Lid der Sichel steigt von unten, seine Kante wölbt sich (∩).
// Das Lid liegt im Material (Plan 5.4: „Pupille und Lid im Shader“): Es deckt aus jeder Richtung (das Glubschauge steht weit
// heraus und wird auch von der Seite gesehen), muss in Ruhe nicht versteckt werden und liegt ohne Flimmern auf der Kugel.
// Rahmen der Kugel: +z Blick (Flächennormale), +y oben, +x rechts — gedreht wie die gemalte Form, links gespiegelt.

import { Vector3, Vector4 } from 'three';
import { MeshBasicNodeMaterial, type UniformNode } from 'three/webgpu';
import { Fn, abs, clamp, dot, float, fwidth, length, max, min, mix, normalGeometry, normalView, normalize, positionView, reflect, select, smoothstep, step, uniform, vec2, vec3, vec4 } from 'three/tsl';
import type { Vec3Node } from '../../common/tsl';
import { pupillenAbstand } from './augenFormen';
import { type CreatureMaterialUniforms, stepShade } from './earleCreature';

export interface AugenKugelUniforms {
  lederhaut: UniformNode<'vec3', Vector3>;
  /** Pupillenfarbe, wenn die Iris die Augenfarbe trägt (Augapfel); beim Glubschauge ist die Pupille die Augenfarbe */
  pupille: UniformNode<'vec3', Vector3>;
  /** Irisradius (Einheit Kugelradius); 0 = keine Iris (Glubschauge, Pupille in der Augenfarbe) */
  irisRadius: UniformNode<'float', number>;
  /** Maßstab der offenen Pupille (1 = groß wie Bild 10, 2 = halb so groß wie Bild 11); Zustände bleiben groß */
  pupillenMass: UniformNode<'float', number>;
  /** Glanzpunkt: Kosinus seines Winkelradius (0,905 groß wie Bild 10, näher an 1 = kleiner) */
  glanz: UniformNode<'float', number>;
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

export function createAugenKugelUniforms(): AugenKugelUniforms {
  return {
    lederhaut: uniform(new Vector3(0.96, 0.95, 0.9)),
    pupille: uniform(new Vector3(0.05, 0.055, 0.065)),
    irisRadius: uniform(0),
    pupillenMass: uniform(1),
    glanz: uniform(0.905),
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

export function createAugenKugelMaterial(u: CreatureMaterialUniforms, g: AugenKugelUniforms): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.name = 'ee-augenkugel';
  material.fog = false;
  material.colorNode = Fn(() => {
    // Richtung vom Kugelmittelpunkt im Rahmen der Kugel (Einheitskugel): x, y quer zur Blickachse, z = Blick
    const nl = normalize(normalGeometry as unknown as Vec3Node).toVar();
    const vorn = nl.z.greaterThan(0);
    // Pupille nur vorn (sonst stünde ihr Spiegelbild hinten); die offene Pupille im Maßstab, die Zustände X, Spirale und
    // Schlitz groß. Kantenbreite begrenzt, damit der Sprung am Rand keine Linie zieht
    const m = select(g.form.y.greaterThan(2.5), float(1), g.pupillenMass);
    const dPup = select(vorn, pupillenAbstand(nl.x.mul(m), nl.y.mul(m), g.form.x, g.form.y, g.form.z, g.zeit.mul(2.4)).div(m), float(1));
    const aaP = min(fwidth(dPup).mul(0.8), 0.05).add(1e-4);
    const pupille = float(1).sub(smoothstep(aaP.negate(), aaP, dPup));
    // Iris (Augapfel): Scheibe in der Augenfarbe, zum Rand dunkler; ohne Iris trägt die Pupille die Augenfarbe
    const mitIris = step(1e-3, g.irisRadius);
    const r = length(vec2(nl.x, nl.y));
    const dIris = select(vorn, r.sub(g.irisRadius), float(1));
    const aaI = min(fwidth(dIris).mul(0.8), 0.05).add(1e-4);
    const iris = float(1).sub(smoothstep(aaI.negate(), aaI, dIris)).mul(mitIris);
    const irisFarbe = mix(u.auge, u.auge.mul(0.55), smoothstep(g.irisRadius.mul(0.55), g.irisRadius, r));
    const pupillenFarbe = mix(u.auge, g.pupille, mitIris);
    // Licht wie am Körper (Figurenlicht im Blickraum): weiche Rundung der Lederhaut, Lid in den Wertstufen der Haut
    const N = normalize(normalView as unknown as Vec3Node).toVar();
    const V = normalize(positionView.negate() as unknown as Vec3Node);
    const wrap = clamp(dot(N, u.lightDir).mul(0.5).add(0.5), 0, 1).toVar();
    const schatten = mix(float(0.74), float(1.03), smoothstep(0.22, 0.78, wrap));
    const col = mix(mix(g.lederhaut, irisFarbe, iris), pupillenFarbe, pupille).mul(schatten).toVar();
    // Glanzpunkt: scharfe Scheibe, wo der gespiegelte Blick zum Licht zeigt (wandert mit der Ansicht wie gemalt); nur bei
    // runder oder Mandel-Pupille (am schmalen Schlitz bisse er eine Kerbe in die Pupille, X und Spirale sind matt)
    const gl = dot(reflect(V.negate(), N), u.lightDir);
    const aaG = min(fwidth(gl), 0.05).add(1e-4);
    const glanzAn = step(0.5, g.form.x).mul(step(g.form.y, 2.5));
    col.assign(mix(col, vec3(1, 0.99, 0.96), smoothstep(g.glanz.sub(aaG), g.glanz.add(aaG), gl).mul(glanzAn)));
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
