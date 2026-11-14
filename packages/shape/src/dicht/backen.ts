// Form zuerst (04.11.2026): das Spielnetz backen.
//
// Die dichte Form hat so viele Dreiecke wie nötig (50 000 und mehr); fürs Spiel wird sie auf ein Budget ausgedünnt (höchstens
// 8 000 Dreiecke je Wesen). Ausgedünnt wird mit Kantenkollaps nach dem Quadrikenfehler (meshoptimizer, MIT): Es bleiben Punkte
// der dichten Form stehen, nur weniger. Alles, was je Punkt gerechnet ist (Normalen, das Drehgewicht des Mauls, später Posen),
// gilt deshalb unverändert auch im Spielnetz; gebacken wird nur eine neue Dreiecksliste.
//
// Mit Maul wird in geöffneter Lage gebacken: Dann liegen Ober- und Unterlippe auseinander, und an jeder Lippe treffen Haut und
// Maulinneres als Naht zusammen (gleiche Lage, eigene Normalen). Der Ausdünner nimmt eine Naht auf beiden Seiten gleich mit,
// das Spielnetz bleibt dicht. Geschlossen gebacken lagen beide Lippen aufeinander und wurden als eine Naht zugenäht; mit
// festgehaltenen Lippen zog er Punkte auf sie und ließ Splitterdreiecke längs der Lippe (beides gemessen).

import { MeshoptSimplifier } from 'meshoptimizer/simplifier';
import { type MaulSchnitt, maulOeffnen } from './maul';

/** Der Ausdünner lädt sein WebAssembly einmal; vorher kann nicht gebacken werden. */
export const backenBereit: Promise<void> = MeshoptSimplifier.ready;

/** `knochen`: je Punkt die Gewichte von Unterkiefer und Schädel (zwei Zahlen); mit ihnen gebacken trägt das Netz jede Pose. */
export type Netzteil = { positionen: Float32Array; normalen: Float32Array; indizes: Uint32Array; knochen?: Float32Array };

export type Spielnetz = {
  /** Dreiecke des Körpers (Nummern der dichten Punkte) */
  indizes: Uint32Array;
  /** Dreiecke des Maulinneren (Nummern seiner dichten Punkte); leer ohne Maul */
  innenIndizes: Uint32Array;
  /** Dreiecke und benutzte Punkte zusammen */
  dreiecke: number;
  punkte: number;
  /** Abweichung von der dichten Form, wie der Ausdünner sie schätzt (Welteinheiten) */
  fehler: number;
};

/** Gewicht der Normalen beim Ausdünnen: hält Knicke und Farbstufen, wo die Fläche sich schnell dreht */
const NORMALEN_GEWICHT = 0.5;
/**
 * Gewicht der Knochengewichte beim Ausdünnen: Ein großes Dreieck über einem Übergang dreht in einer Pose an seinen Ecken
 * verschieden weit und klappt um (gemessen: oben auf dem Kopf beim Kippen des Schädels). Ein Fehler δ im Gewicht verschiebt
 * einen Punkt um δ · Winkel · Hebel, also bis etwa δ · Ausdehnung bei 40° bis 55°.
 */
const KNOCHEN_GEWICHT = 1;
/** Öffnung beim Backen (Grad): weit genug, dass die Lippen sicher auseinander liegen */
const BACK_WINKEL = 30;

/**
 * Körper (und Maulinneres) auf höchstens `budget` Dreiecke ausdünnen, so wie sie übergeben werden. Gibt nur neue Dreieckslisten
 * zurück; die Punkte bleiben die der dichten Form. Erst nach `backenBereit` aufrufen.
 */
export function backen(koerper: Netzteil, innen: Netzteil | null, budget = 8000): Spielnetz {
  const nK = koerper.positionen.length / 3;
  const nI = innen ? innen.positionen.length / 3 : 0;
  const mitKnochen = !!koerper.knochen && (!innen || !!innen.knochen);
  // je Punkt die Normale und (wenn da) die Knochengewichte
  const na = mitKnochen ? 5 : 3;
  const P = new Float32Array(3 * (nK + nI));
  const A = new Float32Array(na * (nK + nI));
  const merkmale = (t: Netzteil, v0: number, n: number): void => {
    for (let v = 0; v < n; v++) {
      for (let k = 0; k < 3; k++) A[na * (v0 + v) + k] = t.normalen[3 * v + k]!;
      if (mitKnochen) {
        A[na * (v0 + v) + 3] = t.knochen![2 * v]!;
        A[na * (v0 + v) + 4] = t.knochen![2 * v + 1]!;
      }
    }
  };
  P.set(koerper.positionen);
  merkmale(koerper, 0, nK);
  const I = new Uint32Array(koerper.indizes.length + (innen ? innen.indizes.length : 0));
  I.set(koerper.indizes);
  if (innen) {
    P.set(innen.positionen, 3 * nK);
    merkmale(innen, nK, nI);
    for (let i = 0; i < innen.indizes.length; i++) I[koerper.indizes.length + i] = innen.indizes[i]! + nK;
  }
  const gewichte = [NORMALEN_GEWICHT, NORMALEN_GEWICHT, NORMALEN_GEWICHT, ...(mitKnochen ? [KNOCHEN_GEWICHT, KNOCHEN_GEWICHT] : [])];
  // das Budget zählt, nicht der Fehler (er wird gemeldet)
  const [neu, fehler] = MeshoptSimplifier.simplifyWithAttributes(
    I,
    P,
    3,
    A,
    na,
    gewichte,
    null,
    Math.min(I.length, 3 * budget),
    1e9,
    ['ErrorAbsolute'],
  );
  const k: number[] = [];
  const m: number[] = [];
  const benutzt = new Set<number>();
  for (let t = 0; t < neu.length; t += 3) {
    const a = neu[t]!;
    const b = neu[t + 1]!;
    const c = neu[t + 2]!;
    benutzt.add(a).add(b).add(c);
    if (a < nK) k.push(a, b, c);
    else m.push(a - nK, b - nK, c - nK);
  }
  return {
    indizes: new Uint32Array(k),
    innenIndizes: new Uint32Array(m),
    dreiecke: neu.length / 3,
    punkte: benutzt.size,
    fehler,
  };
}

/** Körper mit Maul backen: in geöffneter Lage ausgedünnt, die Dreieckslisten gelten für jede Öffnung. */
export function maulBacken(m: MaulSchnitt, budget = 8000): Spielnetz {
  const offen = {
    positionen: new Float32Array(m.positionen.length),
    normalen: new Float32Array(m.normalen.length),
    innenPositionen: new Float32Array(m.innen.positionen.length),
    innenNormalen: new Float32Array(m.innen.normalen.length),
  };
  maulOeffnen(m, BACK_WINKEL, offen);
  // Knochen: der Körper nach seinen Gewichten, das Innere starr (der Boden mit dem Unterkiefer, der Gaumen mit dem Schädel)
  const knochen = new Float32Array(2 * m.gewicht.length);
  for (let v = 0; v < m.gewicht.length; v++) {
    knochen[2 * v] = m.gewicht[v]!;
    knochen[2 * v + 1] = m.gewichtOben[v]!;
  }
  const innenKnochen = new Float32Array(2 * m.innenUnten.length);
  for (let v = 0; v < m.innenUnten.length; v++) {
    innenKnochen[2 * v] = m.innenUnten[v]!;
    innenKnochen[2 * v + 1] = 1 - m.innenUnten[v]!;
  }
  return backen(
    { positionen: offen.positionen, normalen: offen.normalen, indizes: m.indizes, knochen },
    { positionen: offen.innenPositionen, normalen: offen.innenNormalen, indizes: m.innen.indizes, knochen: innenKnochen },
    budget,
  );
}
