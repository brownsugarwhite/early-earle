import { useUi } from '../state/uiStore';

const TEXTE = {
  stift: ['Zeichenstift', 'Klick auf die Kurve setzt einen Punkt, Klick auf einen Punkt löscht ihn, ⌥-Klick wandelt um. Klick auf freie Fläche beginnt eine Kante, Enter beendet'],
  plus: ['Ankerpunkt hinzufügen', 'Klick auf die Kurve setzt einen Punkt'],
  minus: ['Ankerpunkt löschen', 'Klick auf einen Punkt löscht ihn'],
  breite: ['Breitenwerkzeug', 'An einer Kante ziehen: breiter = härter, schmaler = weicher (schwarz 3 px = scharf, gestrichelt = glatt)'],
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
