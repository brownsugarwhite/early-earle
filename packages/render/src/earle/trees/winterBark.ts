import { abs, cos, float, floor, fract, fwidth, hash, max, select, sin, smoothstep, step, vec3 } from 'three/tsl';
import type { FloatNode, Vec3Node } from '../tsl';
import { valueNoise3 } from './patterns';
import { MAPLE_SNOW_LEVEL, MAPLE_WEATHER_U } from './maple';

/**
 * Winterrinde des Schnee-Ahorns (Bild 01 „Rote Scheune“): feine, wellige weiße Linien auf dem schwarzen Stamm, wie
 * gekämmt — sie laufen in Büscheln (je Büschel ein Dutzend Linien, die gemeinsam schwingen), brechen abschnittsweise ab,
 * einzelne leuchten weiß, andere stehen grau. Zwischen den Büscheln bleibt der Stamm reine Tinte; die Äste sind fast
 * nur Tinte mit Schnee obenauf. Der Schnee liegt in großen, ruhigen Formen (Oberseiten, eine Wetterseite des Stamms),
 * nur ihr Rand ist gespritzt: zwei Körnungen Tüpfel vor der Kante und dunkle Löcher knapp dahinter — Earles
 * Siebdruck-Rand statt einer glatten Linie, aber kein Fleckenmuster über den ganzen Stamm.
 *
 * Alles im Baumraum (u rundum, v längs in Welteinheiten, Objektposition in Welteinheiten), nie Screen-Space; Linien und
 * Tüpfel unter ≈ 2–3 px blenden aus (kein Flimmern).
 */
export interface WinterLines {
  /** Deckung der Linien 0..1. */
  mask: FloatNode;
  /** 1 = weiße Linie, 0 = graue. */
  bright: FloatNode;
}

export function winterLines(u: FloatNode, v: FloatNode, level: FloatNode, objPos: Vec3Node): WinterLines {
  // Linien rundum: am Stamm dicht (in einem Büschel liegen die Linien eng, Bild 01); die Äste bleiben Tinte mit Schnee
  const isTrunk = level.lessThan(0.5);
  const lines = float(132);
  const phase = u.mul(6.2831853);
  // gekämmter Fluss: benachbarte Linien schwingen gemeinsam (Einheit: Linienabstände) in langen S-Bögen, dazu ein
  // Nachzittern — die Phase ändert sich rundum langsam, so bleiben die Linien eines Büschels parallel
  const flow = sin(v.mul(3.4).add(sin(phase.mul(2.0).add(v.mul(1.2))).mul(1.6)))
    .mul(4.2)
    .add(sin(v.mul(8.5).add(phase.mul(3.0))).mul(0.9));
  const wave = u.mul(lines).add(flow);
  const raw = floor(wave);
  const idx = raw.sub(floor(raw.div(lines)).mul(lines)); // Index modulo Linienzahl (nahtlos rundum)
  const dist = abs(fract(wave).sub(0.5));
  // Striche: jede Linie in Stücken längs, etwa drei Viertel gezeichnet
  const seg = floor(v.mul(2.2).add(hash(idx.mul(13.1).add(55.0)).mul(3.0)));
  const keep = step(hash(idx.mul(31.0).add(seg.mul(7.0)).add(9123.0)), float(0.7));
  const hw = float(0.22).mul(float(0.55).add(hash(idx.mul(97.0).add(seg.mul(13.0)).add(4321.0)).mul(0.9))).mul(0.5);
  const fw = fwidth(wave).max(1e-5);
  const line = smoothstep(hw.add(fw), hw.sub(fw), dist);
  const fade = smoothstep(0.42, 0.22, fw);
  // Büschel: Rauschen im Baumraum — Linien nur in Gruppen, dazwischen reine Tinte
  const tuft = smoothstep(0.48, 0.58, valueNoise3(objPos.mul(vec3(3.8, 1.6, 3.8)), 13));
  const bright = step(0.4, hash(idx.mul(17.0).add(seg.mul(3.0)).add(777.0)));
  return { mask: line.mul(keep).mul(fade).mul(tuft).mul(select(isTrunk, float(1), float(0))), bright };
}

export interface WinterSnowInput {
  /** Normale · Lot (1 = Oberseite). */
  up: FloatNode;
  /** Rinde: u rundum, v längs (Welteinheiten), Ebene (0 Stamm, 1 Ast, 2 Zweig). */
  u: FloatNode;
  v: FloatNode;
  level: FloatNode;
  /** Objektposition in Welteinheiten. */
  p: Vec3Node;
  /** Schnee der Welt 0..1. */
  snow: FloatNode;
}

/**
 * Schnee auf der Winterrinde (Bild 01): Oberseiten von Stamm, Ästen und (als Saum) Zweigen, eine Wetterseite des
 * Stamms und der steilen Äste; große Formen (grobes Rauschen), der Rand fein verbeult und gespritzt. Rückgabe: Maske.
 */
export function winterSnow(o: WinterSnowInput): FloatNode {
  const { up, u, v, level, p } = o;
  // grobe Formen (Flecken so groß wie ein Viertel Stamm), feiner Rand
  const broad = valueNoise3(p.mul(vec3(2.2, 1.1, 2.2)), 21).sub(0.5);
  const fine = valueNoise3(p.mul(vec3(11.0, 5.0, 11.0)), 23).sub(0.5);
  const isTrunk = level.lessThan(0.5);
  const isTwig = level.greaterThan(1.5);
  // Oberseiten: Äste durchgehend (der Schnee liegt als Band obenauf), Zweige als Saum
  const perLevel = select(isTwig, float(0.6), float(1));
  const topSide = smoothstep(0.12, 0.55, up.add(broad.mul(0.3))).mul(perLevel);
  // Wetterseite: fest im Archetyp (dorthin läuft auch der Schneehügel aus, maple.ts), an den steilen Ästen schmaler,
  // nie an der Unterseite
  const windward = cos(u.sub(MAPLE_WEATHER_U).mul(6.2831853)).add(broad.mul(1.1));
  const weatherW = select(isTrunk, float(0.95), select(isTwig, float(0), smoothstep(-0.15, 0.35, up).mul(0.72)));
  // Am Stamm klettert der Schnee vom Fuß auf (Bild 01: die Wetterseite ist unten ganz weiß und läuft bis etwa zur
  // halben Stammhöhe aus), an den Ästen liegt er auf ihrer ganzen Länge
  const climb = select(isTrunk, smoothstep(3.6, 1.9, v.add(broad.mul(0.9))), smoothstep(0.3, 1.2, v));
  const weather = smoothstep(0.1, 0.6, windward).mul(weatherW).mul(climb);
  // Spritzer: die Kante schneidet ein fraktales Rauschen (drei Oktaven) — Inseln aus Schnee vor ihr, Löcher aus Tinte
  // dahinter, groß und klein gemischt wie gespritzte Farbe; feine Oktaven blenden aus, bevor sie flimmern
  const octave = (freq: number, salt: number, amp: number): FloatNode => {
    const q = p.mul(freq);
    const px = fwidth(q.x).add(fwidth(q.y)).add(fwidth(q.z));
    return valueNoise3(q, salt).sub(0.5).mul(amp).mul(smoothstep(0.9, 0.35, px));
  };
  const splat = fine.mul(0.12).add(octave(24, 25, 0.2)).add(octave(55, 27, 0.16));
  const side = max(topSide, weather).mul(step(0.01, o.snow)).add(splat);
  const thr = float(1.08).sub(o.snow.mul(0.5));
  const fw = fwidth(side).max(1e-4);
  const cover = smoothstep(thr.sub(fw), thr.add(fw), side);
  // Am Stamm klebt der Schnee in Flecken (Bild 01): dunkle Inseln im Weiß, fern der Kante, groß und klein
  const holeNoise = valueNoise3(p.mul(vec3(7.0, 3.2, 7.0)), 29).add(octave(19, 31, 0.3));
  const fwh = fwidth(holeNoise).max(1e-4);
  const holes = smoothstep(float(0.66).sub(fwh), float(0.66).add(fwh), holeNoise).mul(smoothstep(thr.add(0.12), thr.add(0.3), side)).mul(select(isTrunk, float(1), float(0)));
  // Schneehügel am Fuß: ganz Schnee
  return select(level.greaterThan(MAPLE_SNOW_LEVEL - 0.5), float(1), cover.mul(float(1).sub(holes)));
}
