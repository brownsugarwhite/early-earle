// Ankerzeilen (Bauplan 3.2, 3.4, 3.5, Befund 11): Umrechnung zwischen den Punkten eines Ankers (Anker, Ein-Griff, Aus-Griff, absolut)
// und seiner Zeile im Format, dazu die Glätte-Regel. Glatt: [x, y, w, lEin, lAus] (5 Zahlen), der Aus-Griff in Richtung w, der Ein-Griff
// in Richtung w + 180°. Ecke: [x, y, wEin, lEin, wAus, lAus] (6 Zahlen), jeder Griff mit eigener Richtung vom Anker aus. Winkel in Grad
// im Bereich (−180, 180], Längen ≥ 0. Nichts wird gerundet; Zeile → Punkte → Zeile ändert Kurvenpunkte um weniger als 1e-9.
import { atan2, cos, gradZuRad, sin } from '@ee/studio-rechnen/winkel';
import type { AnkerEcke, AnkerGlatt, AnkerZeile, Form } from './typen/form';
import type { Punkt } from './typen/grund';

/** Glätte-Regel: glatt nur, wenn die Richtung des Ein-Griffs (umgedreht) höchstens so viel Grad neben der des Aus-Griffs liegt … */
export const GLAETTE_WINKEL = 0.2;
/** … und sich dabei kein Kurvenpunkt um mehr als so viel ändert (Figur-Einheiten, gemessen an t = 0, 1/8, …, 1; 3.5) */
export const GLAETTE_KURVE = 0.0002;
/**
 * Verschiebt sich ein Griff um δ, verschiebt sich jeder Punkt seines Kurvenstücks um 3(1 − t)²t·δ (Aus-Griff, Stück danach) oder
 * 3(1 − t)t²·δ (Ein-Griff, Stück davor); Anker und Nachbarn bleiben. An den Messstellen t = 0, 1/8, …, 1 ist das höchstens
 * 225/512·|δ| (bei t = 3/8 bzw. 5/8), ganz gleich, wo die Nachbarn liegen. So misst die Regel genau an Kurvenpunkten, obwohl eine
 * Zeile ihre Nachbarn nicht kennt.
 */
export const KURVENPUNKT_GEWICHT = 225 / 512;

/** Maße der Glätte-Regel für einen Anker */
export interface Glaette {
  /** Richtung, die der Anker glatt bekäme: vom Ein-Griff zum Aus-Griff (Grad) */
  w: number;
  /** Abweichung der Griffe von einer Geraden (Grad, 0 bis 180; 0, wenn ein Griff die Länge 0 hat) */
  winkel: number;
  /** größte Änderung eines Kurvenpunkts, wenn der Anker glatt würde */
  aenderung: number;
  /** beide Bedingungen erfüllt */
  glatt: boolean;
}

/** Winkel in den Bereich (−180, 180]; Werte darin bleiben bitgleich (−0 wird 0) */
export function winkelNormal(w: number): number {
  let r = w > -180 && w <= 180 ? w : w - 360 * Math.ceil((w - 180) / 360);
  if (r <= -180) r += 360;
  else if (r > 180) r -= 360;
  return r === 0 ? 0 : r;
}

/** Richtung des Vektors (dx, dy) in Grad im Bereich (−180, 180] */
export function richtung(dx: number, dy: number): number {
  return winkelNormal((atan2(dy, dx) * 180) / Math.PI);
}

/**
 * Glätte-Regel (Befund 11) für einen Anker aus absoluten Punkten. Glatt gemacht ist w die Richtung vom Ein-Griff zum Aus-Griff
 * (längengewichtetes Mittel beider Richtungen; ist ein Griff 0, die Richtung des anderen); die Längen bleiben. Die Änderung an
 * Kurvenpunkten ist `KURVENPUNKT_GEWICHT` mal die größere Verschiebung eines Griffs, so wie `ankerPunkte` ihn aus der glatten Zeile
 * zurückrechnet. Ein Griff der Länge 0 hat keine Richtung und liegt auf jeder Geraden durch den Anker.
 */
export function glaetteMass(p: Punkt, ein: Punkt, aus: Punkt): Glaette {
  pruefeEndlich(p, ein, aus);
  const ex = ein[0] - p[0];
  const ey = ein[1] - p[1];
  const ax = aus[0] - p[0];
  const ay = aus[1] - p[1];
  const lEin = Math.sqrt(ex * ex + ey * ey);
  const lAus = Math.sqrt(ax * ax + ay * ay);
  const dx = ax - ex;
  const dy = ay - ey;
  // beide Griffe 0: glatt in Richtung 0; gleich lang in dieselbe Richtung (Spitze): keine Richtung, nie glatt
  const w = dx !== 0 || dy !== 0 ? richtung(dx, dy) : lAus > 0 ? richtung(ax, ay) : 0;
  const winkel = lEin > 0 && lAus > 0 ? Math.abs((atan2(ey * ax - ex * ay, -ex * ax - ey * ay) * 180) / Math.PI) : 0;
  const r = gradZuRad(w);
  const c = cos(r);
  const s = sin(r);
  const dEinX = -lEin * c - ex;
  const dEinY = -lEin * s - ey;
  const dAusX = lAus * c - ax;
  const dAusY = lAus * s - ay;
  const aenderung = KURVENPUNKT_GEWICHT * Math.max(Math.sqrt(dEinX * dEinX + dEinY * dEinY), Math.sqrt(dAusX * dAusX + dAusY * dAusY));
  return { w, winkel, aenderung, glatt: winkel <= GLAETTE_WINKEL && aenderung <= GLAETTE_KURVE };
}

/**
 * Zeile eines Ankers aus seinen Punkten (absolut). Mit der Glätte-Regel (Standard: beim Einlesen neuer SVGs) wird er glatt, wenn
 * `glaetteMass` es erlaubt. `glaetten: false` (Übernahme, Migrationen; 3.4): immer eine Ecke mit genau seinen Winkeln.
 *
 * Ein Griff der Länge 0 hat keine eigene Richtung. Er bleibt Länge 0 und bekommt den Winkel der Geraden seines Gegengriffs, als
 * Richtung vom Anker aus also die gegenüber (wEin = wAus + 180° oder wAus = wEin + 180°); sind beide 0, gilt Ein 180°, Aus 0°. So
 * liest diese Datei „mit dem Winkel des Gegengriffs“ aus 3.4: Dieselbe Ecke macht `alsEcke` aus der glatten Zeile mit diesem Griff 0,
 * und ein Anker, der in einem Schlüssel glatt und in einem anderen eine Ecke ist, dreht beim Mischen keinen Griff um 180°.
 * Beim Mischen zählt der Winkel eines Griffs der Länge 0 ohnehin nicht (raster.ts:61–71), und an Kurvenpunkten ändert er nichts.
 */
export function ankerZeile(p: Punkt, ein: Punkt, aus: Punkt, o?: { glaetten?: boolean }): AnkerZeile {
  pruefeEndlich(p, ein, aus);
  const x = p[0];
  const y = p[1];
  const ex = ein[0] - x;
  const ey = ein[1] - y;
  const ax = aus[0] - x;
  const ay = aus[1] - y;
  const lEin = Math.sqrt(ex * ex + ey * ey);
  const lAus = Math.sqrt(ax * ax + ay * ay);
  if (o?.glaetten !== false) {
    const g = glaetteMass(p, ein, aus);
    if (g.glatt) return [x, y, g.w, lEin, lAus];
  }
  if (lEin === 0 && lAus === 0) return [x, y, 180, 0, 0, 0];
  const wAus = lAus > 0 ? richtung(ax, ay) : winkelNormal(richtung(ex, ey) + 180);
  const wEin = lEin > 0 ? richtung(ex, ey) : winkelNormal(wAus + 180);
  return [x, y, wEin, lEin, wAus, lAus];
}

/** Zeile eines Ankers aus 6 Zahlen ab der Stelle i (p, Ein-Griff, Aus-Griff absolut; Gegenstück zu `ankerPunkte`, i wie dort) */
export function ankerZeileAus(f: ArrayLike<number>, i: number, o?: { glaetten?: boolean }): AnkerZeile {
  return ankerZeile([f[i]!, f[i + 1]!], [f[i + 2]!, f[i + 3]!], [f[i + 4]!, f[i + 5]!], o);
}

/**
 * schreibt die Punkte einer Zeile nach `aus[i … i + 5]`: p, Ein-Griff, Aus-Griff absolut (6 Zahlen). `i` ist die Stelle der ersten
 * Zahl in `aus`, nicht die Nummer des Ankers: Anker k einer Form steht ab 6·k (so füllt `formPunkte` den Puffer für `kurvenAbstand`).
 */
export function ankerPunkte(z: AnkerZeile, aus: Float64Array, i: number): void {
  const x = z[0];
  const y = z[1];
  aus[i] = x;
  aus[i + 1] = y;
  if (z.length === 5) {
    const r = gradZuRad(z[2]);
    const c = cos(r);
    const s = sin(r);
    aus[i + 2] = x - z[3] * c;
    aus[i + 3] = y - z[3] * s;
    aus[i + 4] = x + z[4] * c;
    aus[i + 5] = y + z[4] * s;
  } else {
    const rEin = gradZuRad(z[2]);
    const rAus = gradZuRad(z[4]);
    aus[i + 2] = x + z[3] * cos(rEin);
    aus[i + 3] = y + z[3] * sin(rEin);
    aus[i + 4] = x + z[5] * cos(rAus);
    aus[i + 5] = y + z[5] * sin(rAus);
  }
}

/** Punkte einer ganzen Form, 6 Zahlen je Anker (die Schreibweise von `kurvenAbstand` in studio-rechnen) */
export function formPunkte(form: Form): Float64Array {
  const aus = new Float64Array(6 * form.length);
  form.forEach((z, a) => ankerPunkte(z, aus, 6 * a));
  return aus;
}

export function istGlatt(z: AnkerZeile): z is AnkerGlatt {
  return z.length === 5;
}

/** glatt im Bauplan (3.2, TeilPlan.glatt): ein Anker, dessen Zeilen in allen Schlüsseln aller Bindungen seines Teils und in Teil.form
 *  glatt sind; sonst mischt der Bauplan jede seiner glatten Zeilen als Ecke (`alsEcke`) */
export function ueberallGlatt(zeilen: Iterable<AnkerZeile>): boolean {
  for (const z of zeilen) if (z.length !== 5) return false;
  return true;
}

/** eine glatte Zeile als Ecke mit wEin = w + 180° (3.2); eine Ecke bleibt, wie sie ist (als Kopie) */
export function alsEcke(z: AnkerZeile): AnkerEcke {
  if (z.length === 6) return [z[0], z[1], z[2], z[3], z[4], z[5]];
  return [z[0], z[1], winkelNormal(z[2] + 180), z[3], z[2], z[4]];
}

/** macht einen Anker glatt, ohne Schwelle (⇧C, seine Entscheidung): w vom Ein-Griff zum Aus-Griff wie in `glaetteMass`, Längen bleiben */
export function glattMachen(z: AnkerZeile): AnkerGlatt {
  if (z.length === 5) return [z[0], z[1], z[2], z[3], z[4]];
  const f = new Float64Array(6);
  ankerPunkte(z, f, 0);
  const g = glaetteMass([f[0]!, f[1]!], [f[2]!, f[3]!], [f[4]!, f[5]!]);
  return [z[0], z[1], g.w, z[3], z[5]];
}

function pruefeEndlich(p: Punkt, ein: Punkt, aus: Punkt): void {
  if (![p[0], p[1], ein[0], ein[1], aus[0], aus[1]].every(Number.isFinite))
    throw new RangeError(`Anker mit ungültiger Zahl: ${JSON.stringify([p, ein, aus])}`);
}
