// Phase 2 M5 (Plan 5.4, 8.7a): gemalte Augenformen als 2D-Abstandsfelder im Augenrahmen — x nach rechts, y nach oben,
// Einheit = halbe Augengröße, negativ innen. Grundformen offen: Schlitz (Superellipse wie das bisherige Schlitzauge),
// Knopf (Kreis), Mandel (Vesica, spitze Winkel). Zustände: zu (Bogen ‿), Sichel („freuen“, Bogen ∩, in der Mitte dicker),
// X (abgerundet), Spirale (Archimedes, dreht mit der Zeit), Schlitz (schmal). Das Lid staucht die offenen Formen senkrecht
// (Blinzeln). Gewählt wird mit `select`, nicht mit `If`-Zweigen (Falle: Werte, die mehrere Zweige teilen, entstehen nur im
// ersten). Formeln nach dem Katalog von Inigo Quilez (Vesica, Strecke, Bogen), die Spirale wie `spiralEye` im REX-Material.

import { PI, abs, atan, clamp, dot, float, fract, length, max, min, pow, select, sqrt, vec2 } from 'three/tsl';
import type { FloatNode, Vec2Node } from '../../common/tsl';

/** Grundform des offenen Auges (Code im Uniform) */
export const AUGEN_FORM = { schlitz: 0, knopf: 1, mandel: 2 } as const;
/** Zustand (Code im Uniform): offen = Grundform */
export const AUGEN_ZUSTAND = { offen: 0, zu: 1, sichel: 2, x: 3, spirale: 4, schlitz: 5 } as const;

/** Superellipse mit Halbachsen (ax, ay), Exponent p; ungefährer Abstand (Einheit der kleineren Halbachse). */
function superellipse(x: FloatNode, y: FloatNode, ax: FloatNode, ay: FloatNode, p: number): FloatNode {
  const q = pow(pow(abs(x.div(ax)), float(p)).add(pow(abs(y.div(ay)), float(p))), float(1 / p));
  return q.sub(1).mul(min(ax, ay));
}

/** Vesica (Mandel) waagerecht: halbe Breite w, halbe Höhe h; Schnitt zweier Kreise über und unter der Mitte. */
function mandel(x: FloatNode, y: FloatNode, w: FloatNode, h: FloatNode): FloatNode {
  const R = w.mul(w).add(h.mul(h)).div(h.mul(2));
  const c = R.sub(h);
  const oben = length(vec2(x, y.add(c))).sub(R);
  const unten = length(vec2(x, y.sub(c))).sub(R);
  return max(oben, unten);
}

/** Abstand zur Strecke a → b. */
function strecke(p: Vec2Node, a: Vec2Node, b: Vec2Node): FloatNode {
  const pa = p.sub(a);
  const ba = b.sub(a);
  const h = clamp(dot(pa, ba).div(dot(ba, ba)), 0, 1);
  return length(pa.sub(ba.mul(h)));
}

/**
 * Bogen als Strich durch (0, 0): Kreis mit Radius R um (0, R) (‿, nach unten offen gezeichnet) bzw. um (0, −R) (∩), halbe
 * Breite w, Strichdicke `dick` (darf mit x laufen); runde Kappen an den Enden.
 */
function bogen(x: FloatNode, y: FloatNode, R: number, w: FloatNode, dick: FloatNode, nachOben: boolean): FloatNode {
  const cy = float(nachOben ? -R : R);
  const r = length(vec2(x, y.sub(cy)));
  const yEnde = cy.add(sqrt(max(float(R * R).sub(w.mul(w)), 0)).mul(nachOben ? 1 : -1));
  const strich = abs(r.sub(R)).sub(dick);
  const kappe = length(vec2(abs(x).sub(w), y.sub(yEnde))).sub(dick);
  // nur die nahe Hälfte des Kreises (sonst zeichnet die Gegenseite einen zweiten Bogen in 2R Abstand)
  const nah = nachOben ? y.greaterThan(cy) : y.lessThan(cy);
  return select(abs(x).lessThan(w), select(nah, strich, kappe), kappe);
}

/** Abgerundetes X mit Seitenverhältnis b (Arme bis ±0,48, Strich 0,11). */
function formX(x: FloatNode, y: FloatNode, b: FloatNode): FloatNode {
  const p = vec2(x.div(b), y);
  const a = 0.48;
  return min(strecke(p, vec2(-a, -a), vec2(a, a)), strecke(p, vec2(-a, a), vec2(a, -a))).sub(0.11).mul(min(b, 1));
}

/** Spirale (Archimedes, ≈ 2,3 Windungen bis Radius 0,78, Mittelpunkt als Punkt), dreht mit `drall`. */
function formSpirale(x: FloatNode, y: FloatNode, drall: FloatNode): FloatNode {
  const r = length(vec2(x, y));
  const R = 0.78;
  const abstand = R / 2.3;
  const s = r.div(abstand).sub(atan(y, x).add(drall).div(PI.mul(2)));
  const dLinie = abs(fract(s).sub(0.5)).sub(0.2).mul(abstand);
  return min(max(dLinie, r.sub(R)), r.sub(0.12));
}

/**
 * Abstand der Augenform an (x, y) (Einheit halbe Augengröße). `form`/`zustand` als Codes (AUGEN_FORM, AUGEN_ZUSTAND),
 * `breite` = Seitenverhältnis (1 = Grundform), `offen` = Lidöffnung (1 offen … ≈ 0 zu; staucht die offenen Formen),
 * `drall` = Drehwinkel der Spirale (Bogenmaß, läuft mit der Zeit).
 */
export function augenFormAbstand(x: FloatNode, y: FloatNode, form: FloatNode, zustand: FloatNode, breite: FloatNode, offen: FloatNode, drall: FloatNode): FloatNode {
  const b = max(breite, 0.1);
  const yo = y.div(max(offen, 0.08));
  // offene Grundformen (mit dem Lid gestaucht: Abstand in der gestauchten Ebene, mal Öffnung zurück)
  const dSchlitz = superellipse(x, yo, b.mul(0.42), float(1), 2.6);
  const dKnopf = superellipse(x, yo, b.mul(0.55), float(0.55), 2);
  const dMandel = mandel(x, yo, b.mul(0.75), float(0.42));
  const dOffen = select(form.lessThan(0.5), dSchlitz, select(form.lessThan(1.5), dKnopf, dMandel));
  // Zustände
  const wB = b.mul(0.7);
  const dZu = bogen(x, y.add(0.12), 1.3, wB, float(0.075), false);
  const t = clamp(abs(x).div(wB), 0, 1);
  const dSichel = bogen(x, y.add(0.2), 1.1, wB, float(0.05).add(float(1).sub(t.mul(t)).mul(0.11)), true);
  const dX = formX(x, y, b);
  const dSpirale = formSpirale(x, y, drall);
  const dSchmal = superellipse(x, yo, b.mul(0.16), float(1), 2.6);
  return select(
    zustand.lessThan(0.5),
    dOffen,
    select(zustand.lessThan(1.5), dZu, select(zustand.lessThan(2.5), dSichel, select(zustand.lessThan(3.5), dX, select(zustand.lessThan(4.5), dSpirale, dSchmal)))),
  );
}

/**
 * Pupille des Glubschauges (Phase 2 M5, Schritt 2) an (x, y): Lage der Kugelrichtung quer zur Blickachse, Einheit
 * Kugelradius. Offen die Grundform als Pupille — Knopf rund und groß wie in Bild 10, Schlitz senkrecht mit spitzen Enden
 * (Katze, Schlange), Mandel quer —, dazu die Zustände X, Spirale und Schlitz (schmal). Zu und Sichel zeigen die offene
 * Pupille: dort deckt das Lid (`glubsch.ts`).
 */
export function pupillenAbstand(x: FloatNode, y: FloatNode, form: FloatNode, zustand: FloatNode, breite: FloatNode, drall: FloatNode): FloatNode {
  const b = max(breite, 0.1);
  const dKnopf = superellipse(x, y, b.mul(0.6), float(0.6), 2);
  // senkrechte Mandel: Breite und Höhe getauscht
  const dSchlitz = mandel(y, x, float(0.7), b.mul(0.2));
  const dMandel = mandel(x, y, b.mul(0.66), float(0.34));
  const dOffen = select(form.lessThan(0.5), dSchlitz, select(form.lessThan(1.5), dKnopf, dMandel));
  const dSchmal = mandel(y, x, float(0.72), b.mul(0.07));
  return select(zustand.lessThan(2.5), dOffen, select(zustand.lessThan(3.5), formX(x, y, b), select(zustand.lessThan(4.5), formSpirale(x, y, drall), dSchmal)));
}
