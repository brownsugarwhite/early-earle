// B1 (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B): Der Editor-Tab zeigt die Grundform. Eine Vorschau
// der Öffnung (Regler, Kieferknopf) ist dort erlaubt, endet aber von selbst — beim Stufenwechsel und sobald etwas
// bearbeitet wird (Gestenbeginn), damit niemand die Grundform bearbeitet, während die Pose zu sehen ist.
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

let angemeldet = false;

export function zielAnmelden(): void {
  if (angemeldet) return;
  angemeldet = true;
  useUi.subscribe((s, v) => {
    if (s.ebene !== v.ebene && useEditor.getState().modus === 'editor' && s.oeffnung > 0) useUi.getState().setzeOeffnung(0);
  });
  useEditor.subscribe((s, v) => {
    if (s.gesteStart && !v.gesteStart && s.modus === 'editor' && useUi.getState().oeffnung > 0) useUi.getState().setzeOeffnung(0);
  });
}
