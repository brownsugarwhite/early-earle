// Winkelfunktionen des Simulationspfads (Plan 2.3 Nr. 2, 4.1).
//
// VORLÄUFIG (M0): Die Funktionen rufen noch `Math` auf, dessen Winkelfunktionen nicht auf jedem Gerät bitgleich rechnen. Nach M1
// Welle A stellt die Integration diese Datei auf den Port der fdlibm um (`fdlibm/*.ts`, M1.1) und nimmt sie aus der Ausnahme in
// `eslint.config.js`. Namen und Signaturen bleiben dabei, kein Aufrufer merkt etwas. Bis dahin gehört diese Datei (wie `exp.ts`) zu
// den beiden Ausnahmen der Regel „kein Math.sin & Co. im Simulationspfad“; überall sonst wird von hier importiert.

/** π als feste Zahl (gleich `Math.PI`) */
const PI = 3.141592653589793;

export function sin(x: number): number {
  return Math.sin(x);
}

export function cos(x: number): number {
  return Math.cos(x);
}

export function tan(x: number): number {
  return Math.tan(x);
}

export function asin(x: number): number {
  return Math.asin(x);
}

export function acos(x: number): number {
  return Math.acos(x);
}

export function atan(x: number): number {
  return Math.atan(x);
}

export function atan2(y: number, x: number): number {
  return Math.atan2(y, x);
}

/** Länge von (x, y) ohne Überlauf; der Vertrag (4.1) nennt keine Datei, darum auch aus `exp.ts` erreichbar */
export function hypot(x: number, y: number): number {
  return Math.hypot(x, y);
}

/** Grad in Bogenmaß mit fester Konstante, in derselben Rechenfolge wie der Prototyp: (g · π) / 180; bitgleich auf jedem Gerät */
export function gradZuRad(g: number): number {
  return (g * PI) / 180;
}

/** Bogenmaß in Grad, wie der Prototyp: (r · 180) / π; bitgleich auf jedem Gerät */
export function radZuGrad(r: number): number {
  return (r * 180) / PI;
}
