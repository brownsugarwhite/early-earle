// Silhouette ohne Canvas (für Tests und Node): dieselben Schritte wie `nachzeichnen.ts`.
import { erweitern, groessteFigur, tinteAusPixeln, umrissPunkte, umrissVerfolgen } from './umriss';

export function silhouette(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): { punkte: [number, number][]; flaeche: number; hoehePx: number } {
  const maske = erweitern(tinteAusPixeln(rgba, w, h));
  const figur = groessteFigur(maske);
  const umriss = umrissVerfolgen(figur.figur, w, h);
  return { punkte: umrissPunkte(umriss, h, 2), flaeche: figur.flaeche, hoehePx: figur.box[3] - figur.box[1] + 1 };
}
