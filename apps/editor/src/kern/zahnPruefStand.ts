// Phase 2 M4 (Plan 5.3, 9.6 „Glut“): Zahnprüfung im Editor. Nach einem Bau in der Stufe Zähne (ohne laufende Geste,
// 350 ms Ruhe) rechnet der Worker die Prüfung bei zu, 25 %, 50 % und offen; die Befunde gelten nur für das Dokument, für
// das sie gerechnet wurden (sonst verworfen, die nächste Prüfung folgt). Die Szene lässt störende Zähne glimmen, die Tafel
// zeigt Befunde und Vorschläge.

import type { Dokument } from '@ee/shape';
import type { ZahnMeldung } from '@ee/shape/kern';
import { create } from 'zustand';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { kernMaulAktiv, kernZahnPruefen, useKernAnzeige } from './kernBau';

/** Befunde, Dokument, für das sie gelten, ob gerade geprüft wird, Zahl der abgeschlossenen Prüfungen (Skripte warten darauf) */
export const useZahnPruefung = create<{ meldungen: ZahnMeldung[]; dok: Dokument | null; laeuft: boolean; fertig: number }>(() => ({ meldungen: [], dok: null, laeuft: false, fertig: 0 }));

/** Ruhe nach dem letzten Bau, bevor geprüft wird (ms) */
const RUHE = 350;
let uhr: ReturnType<typeof setTimeout> | null = null;

function aktiv(): boolean {
  const ui = useUi.getState();
  return ui.bauweise === 'kern' && ui.ebene === 'zaehne' && kernMaulAktiv(useEditor.getState().dok);
}

/** Prüfung planen (nach einem Bau oder beim Betreten der Stufe); eine neue Planung ersetzt die alte. */
export function zahnPruefungPlanen(): void {
  if (uhr) clearTimeout(uhr);
  uhr = null;
  if (!aktiv()) return;
  uhr = setTimeout(() => {
    uhr = null;
    const ed = useEditor.getState();
    if (!aktiv() || ed.gesteStart) return;
    const dok = ed.basis;
    useZahnPruefung.setState({ laeuft: true });
    kernZahnPruefen(dok, (meldungen) => {
      const jetzt = useEditor.getState().basis;
      useZahnPruefung.setState((st) => (meldungen && jetzt === dok ? { meldungen, dok, laeuft: false, fertig: st.fertig + 1 } : { laeuft: false, fertig: st.fertig + 1 }));
    });
  }, RUHE);
}

// nach jedem Bau (neues Info-Objekt) und beim Betreten der Stufe Zähne
useKernAnzeige.subscribe((s, v) => s.info !== v.info && zahnPruefungPlanen());
useUi.subscribe((s, v) => s.ebene !== v.ebene && s.ebene === 'zaehne' && zahnPruefungPlanen());
// am Gestenende (der letzte Bau lief während der Geste)
useEditor.subscribe((s, v) => !s.gesteStart && v.gesteStart && zahnPruefungPlanen());
