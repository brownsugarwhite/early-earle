// B1 (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B): Der Editor-Tab zeigt die Grundform. Eine Vorschau
// der Öffnung (Regler, Kieferknopf) ist dort erlaubt, endet aber von selbst — beim Stufenwechsel und sobald etwas
// bearbeitet wird (Gestenbeginn), damit niemand die Grundform bearbeitet, während die Pose zu sehen ist.
// B7: Das gilt für jede Vorschau (Regler der Posenliste, Überblenden) und jedes Ziel; Gestenbeginn und Bearbeiten beenden
// sie im Store (`beginGeste`, `aendern`), Zielwechsel in `setzeZiel`, der Stufenwechsel hier.
import { useEditor, vorschauBeenden, vorschauLaeuft } from '../state/editorStore';
import { useUi } from '../state/uiStore';

let angemeldet = false;

export function zielAnmelden(): void {
  if (angemeldet) return;
  angemeldet = true;
  useUi.subscribe((s, v) => {
    const m = useEditor.getState().modus;
    if (s.ebene !== v.ebene && vorschauLaeuft(m)) vorschauBeenden(m);
  });
  // B7: Der Geist im Editor-Tab zeigt die zuletzt bearbeitete Pose; Überblenden standardmäßig von Idle zu ihr
  useEditor.subscribe((s, v) => {
    if (s.modus === v.modus || s.modus === 'editor') return;
    const ui = useUi.getState();
    if (ui.geistPose !== s.modus) ui.setzeGeist(ui.geist, s.modus);
    if (s.modus !== 'idle' && ui.ueberblenden.nach !== s.modus && !ui.ueberblenden.spielt) ui.setzeUeberblenden({ nach: s.modus });
  });
}
