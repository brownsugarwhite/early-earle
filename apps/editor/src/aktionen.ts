// Befehle der Menüleiste und Tastenkürzel (an einer Stelle, damit Menü, Knöpfe und Kürzel gleich handeln).

import { angleichen, dokumentLesen, loeschenMehrere, verschiebeKnoten } from '@ee/shape';
import { setzeGekoppelt } from './editing/gekoppelt';
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
    useUi.getState().auswahlLeeren();
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
        const gelesen = dokumentLesen(JSON.parse(await bibliothekLaden(datei)));
        // ältere Speicherstände stimmig machen (ein Objekt, drei Ansichten)
        const dok = { ...gelesen, profile: angleichen(gelesen.profile) };
        useEditor.getState().laden(dok, datei);
        useUi.getState().auswahlLeeren();
      } catch (e) {
        useUi.getState().zeigeHinweis(`Laden fehlgeschlagen: ${(e as Error).message}`);
      }
    })();
  });
}

/** Ansicht für Tastenbefehle: der 2D-Viewport unter der Maus, sonst der zuletzt bearbeitete. */
function tastenAnsicht() {
  const ui = useUi.getState();
  if (ui.hover && ui.hover !== 'creation' && ui.auswahl[ui.hover].length) return ui.hover;
  return ui.aktiv;
}

export function gewaehltePunkteLoeschen() {
  const ansicht = tastenAnsicht();
  if (!ansicht) return;
  const sel = useUi.getState().auswahl[ansicht];
  if (!sel.length) return;
  const pr = useEditor.getState().dok.profile[ansicht];
  const neu = loeschenMehrere(pr, sel);
  if (neu === pr) {
    useUi.getState().zeigeHinweis('Achspunkte bleiben – sie halten die Spiegelung');
    return;
  }
  setzeGekoppelt(ansicht, neu, []);
}

/** Tastaturschritt wie Illustrator (1 pt ≈ 1/500 Kachel ≈ 1 px in der Grundansicht), mit ⇧ das Zehnfache. */
export const TASTEN_SCHRITT = 0.002;

export function gewaehltePunkteVerschieben(rx: number, ry: number, gross: boolean) {
  const ansicht = tastenAnsicht();
  if (!ansicht) return;
  const sel = useUi.getState().auswahl[ansicht];
  if (!sel.length) return;
  const { dok } = useEditor.getState();
  const s = ((gross ? 10 : 1) * TASTEN_SCHRITT) / dok.skalierung;
  setzeGekoppelt(ansicht, verschiebeKnoten(dok.profile[ansicht], sel, { x: rx * s, y: ry * s }), sel);
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
