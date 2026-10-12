import { useUi } from '../state/uiStore';

const TEXTE = {
  stift: ['Zeichenstift', 'Klick auf die Kurve setzt einen Punkt, Klick auf einen Punkt löscht ihn, ⌥-Klick wandelt um. Klick auf freie Fläche beginnt eine Kante, Enter beendet'],
  plus: ['Ankerpunkt hinzufügen', 'Klick auf die Kurve setzt einen Punkt'],
  minus: ['Ankerpunkt löschen', 'Klick auf einen Punkt löscht ihn'],
  breite: ['Breitenwerkzeug', 'Kante oder Ecke greifen und ziehen: Der Abstand ist die Härte (Kreis), nah = glatt, außen = scharf'],
  spant: ['Spant', 'Klick in der Seite oder im Top setzt einen Querschnitt an dieser Stelle; bearbeitet wird er in Front (vorn) bzw. Back (hinten)'],
} as const;

/** Zeigt in der unteren Lücke, welches Werkzeug aktiv ist (in der Direktauswahl unsichtbar). */
export function WerkzeugHinweis() {
  const w = useUi((s) => s.werkzeug);
  if (w === 'auswahl') return null;
  const [name, text] = TEXTE[w];
  return (
    <div className="werkzeug-hinweis glas" key={w}>
      <b>{name}</b> · {text} · A oder Esc: Direktauswahl
    </div>
  );
}
