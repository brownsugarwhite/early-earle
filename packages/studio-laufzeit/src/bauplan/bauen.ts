// Zusammenbau des Bauplans (Plan 4.3, 2.2): setzt die Teilpläne zusammen und baut nur neu, was sich änderte. Zusammenbau-Datei: Nur die
// Integration ändert sie und verdrahtet nach jeder Welle, was gebaut ist; Teilpläne, die noch niemand baut, bleiben leer
// (`leererBauplan`). Den Gesamttest `bauen.test.ts` (voll = schrittweise nach zufälligen Diffs) führt die Integration nach jeder Welle fort.
//
// Stand M0: Ordnung und Regler sind gebaut (gemeinsame Dateien); Form, Knochen, Abflachung, Posen, Physik, Logik und Zeichen sind leer.
import type { Diff, Dokument } from '@ee/studio-format/typen/dokument';
import { type Bauplan, leererBauplan } from '../vertrag/bauplan';
import { ordnungPlanBauen } from './ordnung';
import { reglerPlanBauen } from './regler';

/**
 * Bauplan eines Dokuments. Mit `alt` und `diff` (Diff vom Dokument von `alt` zu `dok`) baut es nur die Teilpläne neu, deren Quellen sich
 * änderten, die Abflachung auch beim Wechsel der Zoomstufe (16 k); ändert sich nichts, kommt `alt` zurück. Ohne `diff` baut es alles neu.
 */
export function bauen(dok: Dokument, alt?: Bauplan, diff?: Diff, o?: { zoomstufe?: number }): Bauplan {
  const zoomstufe = o?.zoomstufe ?? alt?.abflach.zoomstufe ?? 0;
  const ordnung = ordnungPlanBauen(dok, alt?.ordnung, diff);
  const regler = reglerPlanBauen(dok, ordnung, alt, diff);
  if (alt !== undefined && ordnung === alt.ordnung && regler === alt.regler && zoomstufe === alt.abflach.zoomstufe) return alt;
  const leer = alt ?? leererBauplan(zoomstufe);
  return {
    stand: (alt?.stand ?? 0) + 1,
    ordnung,
    regler,
    form: leer.form,
    knochen: leer.knochen,
    abflach: leer.abflach.zoomstufe === zoomstufe ? leer.abflach : leererBauplan(zoomstufe).abflach,
    posen: leer.posen,
    physik: leer.physik,
    logik: leer.logik,
    zeichen: leer.zeichen,
  };
}
