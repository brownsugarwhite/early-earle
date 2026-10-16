// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S3 „Umrisse berühren“: Wo der Körper in einer Höhe hinter der Front
// zurückbleibt, wird der Ring, der dort am weitesten kommen kann (größte Sichthülle an seinem eigenen Punkt), örtlich
// hinausgeschoben. Das geschieht als weiches Wachstumsfeld je Ring und Höhe: Glocken in der Höhe v längs der Sprosse und
// über die Nachbarringe, als Maximum zusammengesetzt (keine Summen, kein Überschießen).
// Begrenzt wird es durch die Sichthülle an der eigenen Stelle jedes Punkts (Top bei x, Front bei y) und durch die gewählte
// Fülle: Die Form darf höchstens die Superellipse der Stufe um die eigene größte Breite sein (rund 2, mittel 4, genau 24).
// Ohne Fehlbetrag bleibt alles, wie es war. Florian 16.10.: Fülle „mittel“.
// Zwei Befunde aus dem Versuch „Fülle je Ring“ stecken darin: Der Fehlbetrag der Vase ist eine Breite (die Ringbreite W
// ist an der Ringmitte gerechnet, die Hülle am Punkt erlaubt mehr), nicht eine Fülle. Und ganze Ringe voller zu machen
// gab der Robbe einen flachen Bauch. DOM-frei.

import type { Breiten } from './breite';
import { type FuelleArt, FUELLE_EXPONENT, type Sprosse, type Vorlage, dicht, reichweite } from './fuelle';

/** Toleranz beim Berühren: 0,5 px bei 461 px je Einheit */
const TOLERANZ = 0.5 / 461;
/** Höhen, an denen der Front-Umriss geprüft wird */
const HOEHEN = 64;
/** Glockenbreite des Wachstums in der Höhe (Anteil der Sprosse) und über die Ringe */
const SIGMA_V = 0.12;
const SIGMA_R = 3.0;
/**
 * Größtes Wachstum, das noch als Berührung gilt (darüber: anderes Teil oder unpassende Vorlage, kein Wachstum). Gemessen
 * 1,35 / 1,5 / 1,6 / 2: Fisch +10 / 17 / 21 / 33 % Volumen ohne Gewinn in der Front, einfache Form Front 8,3 / 7,8 / 6,1 / 6,1 px.
 */
const G_MAX = 1.35;
/** Abstand der gewachsenen Punkte zum Top (2 px bei 461 px je Einheit) */
const TOP_ABSTAND = 2 / 461;
/** Sprossen, die (fast) waagerecht liegen (stehende Ringe, Hälse), gelten nur auf ihrer eigenen Höhe ± diesem Maß */
const WAAGERECHT = 1e-3;
const STEHEND_UM = 0.01;

/** Wunsch eines Rings: auf der Höhe v (Anteil der Sprosse) um den Faktor g breiter. */
export type Nachfrage = { i: number; v: number; g: number };

/** Halbe Breite (Anteil von W) einer dichten Halbkurve auf der Höhe v der Sprosse (größte, falls mehrere). */
function breiteBei(k: { w: number[]; v: number[] }, v: number): number {
  let best = 0;
  for (let j = 0; j + 1 < k.v.length; j++) {
    const v0 = k.v[j]!;
    const v1 = k.v[j + 1]!;
    if ((v0 - v) * (v1 - v) > 0) continue;
    const f = Math.abs(v1 - v0) > 1e-12 ? (v - v0) / (v1 - v0) : 0;
    best = Math.max(best, k.w[j]! + (k.w[j + 1]! - k.w[j]!) * f);
  }
  return best;
}

/** Superellipse auf der Höhe s (−1…1): halbe Breite (1 − |s|^p)^(1/p). */
const superellipse = (s: number, p: number) => Math.max(0, 1 - Math.min(1, Math.abs(s)) ** p) ** (1 / p);

/**
 * Front berühren: neue Vorlagen je Ring (Breiten w dürfen über 1 gehen, wo die Hülle am Punkt breiter ist als W), das
 * größte Wachstum je Ring und die Wünsche. `huelle(y)` = erreichbarer Teil der Front (Widersprüche blähen nichts auf).
 */
export function frontBeruehren(sprossen: readonly Sprosse[], vorlagen: readonly Vorlage[], W: readonly number[], breiten: Breiten, art: FuelleArt, huelle?: (y: number) => number): { vorlagen: Vorlage[]; wachstum: number[]; nachfrage: Nachfrage[]; punkte: { i: number; j: number }[] } {
  const R = sprossen.length;
  const kurven = vorlagen.map((q) => dicht(q));
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const sp of sprossen) {
    y0 = Math.min(y0, sp.o.y, sp.u.y);
    y1 = Math.max(y1, sp.o.y, sp.u.y);
  }
  // Höhe v eines Rings auf der Welt-Höhe y (oder null, wenn die Sprosse dort nicht hinreicht)
  const hoeheV = (sp: Sprosse, y: number): number | null => {
    const dy = sp.o.y - sp.u.y;
    if (Math.abs(dy) < WAAGERECHT) return Math.abs(y - sp.u.y) <= STEHEND_UM ? 0.5 : null;
    const v = (y - sp.u.y) / dy;
    return v > 0.02 && v < 0.98 ? v : null;
  };
  const nachfrage: Nachfrage[] = [];
  for (let h = 0; h < HOEHEN; h++) {
    const y = y0 + ((h + 0.5) / HOEHEN) * (y1 - y0);
    const front = breiten.front(y);
    if (!(front > 0)) continue;
    const ziel = huelle ? Math.min(front, huelle(y)) : front;
    let heute = 0;
    const reich: number[] = [];
    for (let i = 0; i < R; i++) {
      const r = reichweite(kurven[i]!, sprossen[i]!, W[i]!, y, front, breiten.top);
      reich.push(r);
      heute = Math.max(heute, r);
    }
    if (heute >= ziel - TOLERANZ) continue;
    // Plan S3: der Ring, der dort ohnehin am weitesten reicht und dessen Hülle an seinem Punkt das Ziel erlaubt; erlaubt
    // keiner das Ziel ganz, der mit der größten Hülle (Rest bleibt Abweichung). Ein Ring, der auf dieser Höhe kaum Breite
    // hat (Sprossenende), müsste sich vervielfachen (Giraffe: × 2 bis × 4, +27 % Volumen).
    let wahl = -1;
    let wahlA = 0;
    let wahlV = 0.5;
    let wahlVoll = false;
    for (let i = 0; i < R; i++) {
      const sp = sprossen[i]!;
      const v = hoeheV(sp, y);
      if (v === null) continue;
      const t = breiten.top(sp.u.x + (sp.o.x - sp.u.x) * v);
      const A = Math.min(front, t > 0 ? t : 0);
      const voll = A >= ziel - TOLERANZ;
      const besser = wahl < 0 || (voll && !wahlVoll) || (voll === wahlVoll && (voll ? reich[i]! > reich[wahl]! : A > wahlA));
      if (besser) {
        wahl = i;
        wahlA = A;
        wahlV = v;
        wahlVoll = voll;
      }
    }
    if (wahl < 0) continue;
    const soll = Math.min(ziel, wahlA);
    const w0 = breiteBei(kurven[wahl]!, wahlV) * W[wahl]!;
    if (!(w0 > 1e-6) || soll <= w0 + TOLERANZ) continue;
    // Verlangt die Front mehr als × G_MAX, ist es keine Berührung, sondern ein anderes Teil (Flosse, Flügel; S6) oder eine
    // Vorlage, die zum geneigten Ring nicht passt (Giraffe; S5): dann bleibt der Ring (gekappt blähte es den Rumpf auf,
    // Fisch +24 %, ungekappt +44 %)
    if (soll / w0 > G_MAX) continue;
    nachfrage.push({ i: wahl, v: wahlV, g: soll / w0 });
  }
  const pMax = FUELLE_EXPONENT[art];
  const wachstum = new Array<number>(R).fill(1);
  const neu = vorlagen.map((q, i) => {
    const sp = sprossen[i]!;
    const Wi = W[i]!;
    const n = q.v.length;
    const z = new Array<number>(n);
    const basis = new Array<number>(n);
    let zMax = 0;
    for (let j = 0; j < n; j++) {
      let g = 1;
      for (const d of nachfrage) {
        const dr = (i - d.i) / SIGMA_R;
        if (Math.abs(dr) > 4) continue;
        const dv = (q.v[j]! - d.v) / SIGMA_V;
        g = Math.max(g, 1 + (d.g - 1) * Math.exp(-0.5 * (dr * dr + dv * dv)));
      }
      basis[j] = q.w[j]! * Wi;
      let zj = basis[j]! * g;
      // Sichthülle an der eigenen Stelle: Top bei x, Front bei y (nie enger als die Vorlage heute)
      const v = q.v[j]!;
      const x = sp.u.x + (sp.o.x - sp.u.x) * v;
      const yj = sp.u.y + (sp.o.y - sp.u.y) * v;
      const t = breiten.top(x);
      const f = breiten.front(yj);
      // zum Top ein kleiner Abstand: die glatte Fläche bauscht zwischen den Punkten etwas nach außen (Rex +2 px übers Top)
      if (t > 0) zj = Math.min(zj, Math.max(basis[j]!, t - TOP_ABSTAND));
      if (f > 0) zj = Math.min(zj, Math.max(basis[j]!, f));
      z[j] = zj;
      zMax = Math.max(zMax, zj);
      wachstum[i] = Math.max(wachstum[i]!, basis[j]! > 1e-9 ? zj / basis[j]! : 1);
    }
    if (wachstum[i]! <= 1 + 1e-9) return q;
    // Fülle: höchstens die Superellipse der Stufe um die eigene größte Breite (nie schmaler als die Vorlage heute)
    const w = q.w.slice();
    for (let j = 0; j < n; j++) {
      const s = 2 * q.v[j]! - 1;
      const deckel = Math.max(basis[j]!, zMax * superellipse(s, pMax));
      w[j] = Math.min(z[j]!, deckel) / Wi;
    }
    return { ...q, w };
  });
  // Berührpunkte: je Wunsch der Vorlagenpunkt seines Rings, der der gewünschten Höhe am nächsten liegt (die Nachbarn
  // folgen weich über das Wachstum; als Bedingung hätte jeder gewachsene Punkt die Haut gefaltet — einfache Form 26°)
  const gesehen = new Set<string>();
  const punkte: { i: number; j: number }[] = [];
  for (const d of nachfrage) {
    const q = vorlagen[d.i]!;
    let jBest = -1;
    for (let j = 1; j + 1 < q.v.length; j++) if (jBest < 0 || Math.abs(q.v[j]! - d.v) < Math.abs(q.v[jBest]! - d.v)) jBest = j;
    const schluessel = `${d.i}:${jBest}`;
    if (jBest > 0 && !gesehen.has(schluessel)) {
      gesehen.add(schluessel);
      punkte.push({ i: d.i, j: jBest });
    }
  }
  return { vorlagen: neu, wachstum, nachfrage, punkte };
}
