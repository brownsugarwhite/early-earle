import { abs, cos, float, floor, fract, fwidth, hash, max, mix, select, sin, smoothstep, step, vec3 } from 'three/tsl';
import { aaStep, periodFade, type FloatNode, type Vec3Node } from '../tsl';
import { stipple, valueNoise3 } from './patterns';
import { MAPLE_SNOW_LEVEL, MAPLE_WEATHER_U } from './maple';

/**
 * Winterrinde des Schnee-Ahorns (Ebene 6, Bild 01 „Rote Scheune“): der Stamm ist Tinte, seine Lichtseite ein flaches Grau
 * (materials.ts), darauf feine weiße und graue Linien wie gekämmt — in deterministischen Bündeln (je Bündel ≈ zehn
 * Linien, die gemeinsam schwingen und zu ihren Enden zusammenlaufen), nur am Stamm und nur auf seiner Lichtseite, nie auf
 * den Ästen. Der Schnee liegt in harten Formen (Oberseiten, eine Wetterseite des Stamms) mit einem feinen Tüpfelsaum vor
 * der Kante; seine Unterseite ist eine flache graue Stufe (materials.ts).
 *
 * Alles im Baumraum (u rundum, v längs in Welteinheiten, Objektposition in Welteinheiten), nie Screen-Space; Linien sind
 * 1 px breit (`fwidth`), unter ≈ 2,5 px Abstand blenden sie zu ihrer mittleren Deckung über (kein Flimmern).
 */
export interface WinterLines {
  /** Deckung der Linien 0..1 (vor der Lichtseite; materials.ts multipliziert das Licht hinein). */
  mask: FloatNode;
  /** 1 = weiße Linie, 0 = graue. */
  bright: FloatNode;
}

/** Bündel rundum (ganzzahlig → nahtlos) und Linien je Bündel. */
const BUNDLE_CELLS = 13;
const BUNDLE_LINES = 10;

export function winterLines(u: FloatNode, v: FloatNode, level: FloatNode): WinterLines {
  const isTrunk = select(level.lessThan(0.5), float(1), float(0));
  // Zelle rundum (Bündel) und Abschnitt längs (jedes Bündel bricht nach 0,5–1 Einheiten ab, versetzt je Zelle)
  const cu = u.mul(BUNDLE_CELLS);
  const raw = floor(cu);
  const cell = raw.sub(floor(raw.div(BUNDLE_CELLS)).mul(BUNDLE_CELLS));
  const segLen = hash(cell.mul(3.7).add(11.0)).mul(0.5).add(0.5);
  const sv = v.div(segLen).add(hash(cell.mul(5.3).add(7.0)).mul(3.0));
  const seg = floor(sv);
  const t = fract(sv);
  const present = step(hash(cell.mul(17.0).add(seg.mul(31.0)).add(901.0)), float(0.45));
  // gekämmter Fluss: das ganze Bündel schwingt in langen S-Bögen (alle Linien parallel), zu den Enden laufen sie zusammen
  const sway = sin(v.mul(1.9).add(cell.mul(2.3))).mul(0.1).add(sin(v.mul(4.7).add(cell.mul(0.9))).mul(0.04));
  const local = fract(cu).sub(0.5).sub(sway);
  const pinch = float(1).add(abs(t.sub(0.5)).mul(1.4));
  const wv = local.mul(BUNDLE_LINES).mul(pinch);
  const idx = floor(wv);
  const fw = fwidth(wv).max(1e-5);
  const line = smoothstep(float(1.0), float(0.0), abs(fract(wv).sub(0.5)).div(fw));
  // Breite des Bündels (Linien) atmet zu den Enden hin auf null; jede Linie beginnt und endet etwas versetzt
  const halfW = float(BUNDLE_LINES * 0.3).mul(smoothstep(0.0, 0.3, t)).mul(smoothstep(1.0, 0.7, t));
  const inside = step(abs(idx.add(0.5)), halfW);
  const lk = hash(idx.mul(13.1).add(seg.mul(7.3)).add(cell.mul(3.1)).add(17.0));
  const span = step(lk.mul(0.3), t).mul(step(t, float(1).sub(fract(lk.mul(7.7)).mul(0.3))));
  const keep = step(fract(lk.mul(3.3)), float(0.85));
  // aus der Ferne: mittlere Deckung des Bündels (ein grauer Strich statt flimmernder Linien)
  const mean = fw.clamp(0, 1).mul(halfW.div(BUNDLE_LINES * 0.3)).mul(0.45);
  const mask = mix(mean, line.mul(inside).mul(span).mul(keep), periodFade(wv, 2.5)).mul(present).mul(isTrunk);
  const bright = step(0.4, hash(idx.mul(17.0).add(seg.mul(3.0)).add(cell.mul(5.0)).add(777.0)));
  return { mask, bright };
}

export interface WinterSnowInput {
  /** Normale · Lot (1 = Oberseite). */
  up: FloatNode;
  /** Rinde: u rundum, v längs (Welteinheiten), Ebene (0 Stamm, 1 Ast, 2 Zweig, 5.x Schneesaum). */
  u: FloatNode;
  v: FloatNode;
  level: FloatNode;
  /** Objektposition in Welteinheiten. */
  p: Vec3Node;
  /** Schnee der Welt 0..1. */
  snow: FloatNode;
}

export interface WinterSnow {
  /** Schnee 0..1 (harte Form mit 1 px Kante plus Tüpfelsaum). */
  cover: FloatNode;
  /** 1 = Oberseite (weiß im Licht), 0 = Unterseite (flache graue Stufe). */
  top: FloatNode;
}

/**
 * Schnee auf der Winterrinde (Ebene 6): Oberseiten von Ästen (durchgehend als Kappe) und Zweigen (als Saum), eine
 * Wetterseite des Stamms, die vom Fuß aufsteigt. Harte Formen — die Kante ist eine 1-px-Stufe (`aaStep`) einer ruhigen,
 * leicht verbeulten Grenze; davor ein Saum feiner Tüpfel, die nach außen kleiner und seltener werden (Siebdruck-Spritzer
 * statt eines Fleckenmusters). Die Kappe teilt sich in Oberseite und Unterseite (flache graue Stufe).
 */
export function winterSnow(o: WinterSnowInput): WinterSnow {
  const { up, u, v, level, p } = o;
  // ruhige Formen (Flecken so groß wie ein Viertel Stamm), die Kante nur leicht verbeult
  const broad = valueNoise3(p.mul(vec3(2.2, 1.1, 2.2)), 21).sub(0.5);
  const fine = valueNoise3(p.mul(vec3(9.0, 4.0, 9.0)), 23).sub(0.5);
  const isTrunk = level.lessThan(0.5);
  const isTwig = level.greaterThan(1.5);
  // Oberseiten: Äste durchgehend (der Schnee liegt als Kappe obenauf), Zweige als Saum
  const perLevel = select(isTwig, float(0.6), float(1));
  const topSide = smoothstep(0.12, 0.55, up.add(broad.mul(0.3))).mul(perLevel);
  // Wetterseite: fest im Archetyp (dorthin läuft auch der Schneehügel aus, maple.ts), an den steilen Ästen schmaler
  const windward = cos(u.sub(MAPLE_WEATHER_U).mul(6.2831853)).add(broad.mul(1.1));
  const weatherW = select(isTrunk, float(0.95), select(isTwig, float(0), smoothstep(-0.15, 0.35, up).mul(0.72)));
  // Am Stamm klettert der Schnee vom Fuß auf (Ebene 6: die Wetterseite ist unten ganz weiß und läuft bis etwa zur
  // halben Stammhöhe aus), an den Ästen liegt er auf ihrer ganzen Länge
  const climb = select(isTrunk, smoothstep(1.8, 0.8, v.add(broad.mul(0.6))), smoothstep(0.3, 1.2, v));
  const weather = smoothstep(0.1, 0.6, windward).mul(weatherW).mul(climb);
  const side = max(topSide, weather).mul(step(0.01, o.snow)).add(fine.mul(0.08));
  const thr = float(1.08).sub(o.snow.mul(0.5));
  // harte Kante (1 px)
  const core = aaStep(thr, side);
  // Tüpfelsaum vor der Kante: feine Punkte (Zelle 0,03 Einheiten ≈ 1–2 px auf Kartendistanz), nach außen kleiner
  const band = 0.16;
  const near = smoothstep(thr.sub(band), thr, side).mul(float(1).sub(core));
  const dots = stipple(p, 0.03, 0.34, near, 0.75).mask;
  const cover = max(core, dots);
  // Oberseite der Kappe weiß, ihre Flanke (zur Seite, nach unten) eine flache graue Stufe; die Wetterseite des Stamms
  // zählt als Oberseite (sie steht im Licht des Schneehügels)
  const top = max(aaStep(0.42, up.add(fine.mul(0.15))), select(isTrunk, aaStep(0.5, weather), float(0)));
  // Schneehügel am Fuß: ganz Schnee, ganz Oberseite
  const mound = level.greaterThan(MAPLE_SNOW_LEVEL - 0.5);
  return { cover: select(mound, float(1), cover), top: select(mound, float(1), top) };
}
