// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1: Strahlraster auf dem echten Kern-Körper (Ruhelage, Profil-Einheiten).
// Kantenlinien holen beim Setzen ihre Tiefe von der Haut, gezogene Knoten bleiben stetig darauf, die Sichtbarkeit kommt
// von hier — statt von der alten Versuchsfläche S0 (`strahlen()`), die beim Langhals oder bei Überhängen woanders lag.
import type { Ansicht } from '@ee/shape';
import { type Dreiecksflaeche, type Strahlraster, strahlRaster } from '@ee/shape/versuch';
import { aktuellesNetz } from '../kern/netzStand';
import { useEditor } from '../state/editorStore';
import { netzJetzt } from './netzLage';

let merk: { netz: object; raster: Record<Ansicht, Strahlraster> } | null = null;

/**
 * Raster des zuletzt gebauten Kern-Netzes; null, wenn die Blätter kein Liniennetz zeigen (andere Bauweise, Pose, Beine).
 * Gemerkt je Netz; während einer Geste bleibt das Raster vom Gestenbeginn (die Haut ändert sich dabei kaum, ein Neubau
 * kostet einige 10 ms je Zug).
 */
export function kernRaster(): Record<Ansicht, Strahlraster> | null {
  if (!netzJetzt()) return null;
  const n = aktuellesNetz();
  if (!n) return null;
  if (merk && (merk.netz === n.netz || useEditor.getState().gesteStart)) return merk.raster;
  // Lagen je Dreiecksecke (Welt, × Maßstab), in Ruhe; zurück in Profil-Einheiten
  const P = n.netz.ruhe ?? n.netz.positionen;
  const sk = n.skalierung || 1;
  const punkte = new Float64Array(P.length);
  for (let i = 0; i < P.length; i++) punkte[i] = P[i]! / sk;
  const nP = P.length / 3;
  const dreiecke = new Uint32Array(nP);
  for (let i = 0; i < nP; i++) dreiecke[i] = i;
  const fl: Dreiecksflaeche = { punkte, normalen: Float64Array.from(n.netz.normalen), dreiecke };
  const raster = { seite: strahlRaster(fl, 'seite', 96), front: strahlRaster(fl, 'front', 96), top: strahlRaster(fl, 'top', 96) };
  merk = { netz: n.netz, raster };
  return raster;
}
