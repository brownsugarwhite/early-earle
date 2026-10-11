// Befehle der Menüleiste und Tastenkürzel (an einer Stelle, damit Menü, Knöpfe und Kürzel gleich handeln).

import { dokumentLesen, kannLoeschen, loeschen } from '@ee/shape';
import { bibliothekLaden, bibliothekSpeichern, useBibliothek } from './library/speicher';
import { useEditor } from './state/editorStore';
import { useUi } from './state/uiStore';
import { szene } from './three/instanz';

function nachRueckfrage(titel: string, weiter: () => void) {
  if (!useEditor.getState().geaendert) {
    weiter();
    return;
  }
  useUi.getState().oeffneDialog({
    titel,
    text: 'Die Änderungen am aktuellen Wesen sind noch nicht gespeichert.',
    knoepfe: [
      { label: 'Abbrechen', aktion: () => undefined },
      { label: 'Verwerfen', primaer: true, aktion: weiter },
    ],
  });
}

export function neuesWesen() {
  nachRueckfrage('Neues Wesen anlegen?', () => {
    useEditor.getState().neu();
    useUi.getState().waehle(null);
  });
}

async function schreiben(name: string) {
  const editor = useEditor.getState();
  if (editor.dok.name !== name) editor.setzeName(name);
  const { dok, datei } = useEditor.getState();
  try {
    const vorschau = szene.aktuell?.vorschau() ?? null;
    const r = await bibliothekSpeichern({ datei, name, json: `${JSON.stringify(dok, null, 2)}\n`, vorschau });
    useEditor.getState().gespeichert(r.datei);
    useUi.getState().zeigeHinweis(`„${name}“ gespeichert`);
    void useBibliothek.getState().neuLaden();
  } catch (e) {
    useUi.getState().zeigeHinweis(`Speichern fehlgeschlagen: ${(e as Error).message}`);
  }
}

export function speichern() {
  const { dok, datei } = useEditor.getState();
  if (datei) {
    void schreiben(dok.name);
    return;
  }
  useUi.getState().oeffneDialog({
    titel: 'Wesen speichern',
    eingabe: dok.name === 'Neues Wesen' ? '' : dok.name,
    knoepfe: [
      { label: 'Abbrechen', aktion: () => undefined },
      { label: 'Speichern', primaer: true, aktion: (wert) => void schreiben(wert.trim() || 'Wesen') },
    ],
  });
}

export function ladeAusBibliothek(datei: string) {
  nachRueckfrage('Anderes Wesen laden?', () => {
    void (async () => {
      try {
        const dok = dokumentLesen(JSON.parse(await bibliothekLaden(datei)));
        useEditor.getState().laden(dok, datei);
        useUi.getState().waehle(null);
      } catch (e) {
        useUi.getState().zeigeHinweis(`Laden fehlgeschlagen: ${(e as Error).message}`);
      }
    })();
  });
}

export function gewaehltenPunktLoeschen() {
  const a = useUi.getState().auswahl;
  if (!a) return;
  const pr = useEditor.getState().dok.profile[a.ansicht];
  if (!kannLoeschen(pr, a.index)) return;
  useEditor.getState().setzeProfil(a.ansicht, loeschen(pr, a.index));
  useUi.getState().waehle(null);
}

export function maximiereUnterMaus() {
  const ui = useUi.getState();
  const id = ui.hover ?? ui.maximiert ?? 'creation';
  ui.maximieren(id);
}

export function ansichtUnterMausZuruecksetzen() {
  const ui = useUi.getState();
  if (ui.hover) ui.ansichtZuruecksetzen(ui.hover);
}
