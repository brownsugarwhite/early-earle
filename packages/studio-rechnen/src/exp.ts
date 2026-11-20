// Exponentialfunktionen des Simulationspfads (Plan 2.3 Nr. 2, 4.1).
//
// VORLÄUFIG (M0): wie `winkel.ts` noch über `Math`. Nach M1 Welle A stellt die Integration diese Datei auf den Port der fdlibm um
// (`e_exp`, `e_log`, `e_pow`; M1.1) und nimmt sie aus der Ausnahme in `eslint.config.js`. Namen und Signaturen bleiben dabei, kein
// Aufrufer merkt etwas.

export function exp(x: number): number {
  return Math.exp(x);
}

export function log(x: number): number {
  return Math.log(x);
}

export function pow(x: number, y: number): number {
  return Math.pow(x, y);
}

// `hypot` liegt in winkel.ts; der Vertrag (4.1) nennt für sie keine Datei, darum ist sie auch von hier erreichbar.
export { hypot } from './winkel';
