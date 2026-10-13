// Plan 9.4: das Dock — kleine Glasleiste unten mit den Werkzeugen der Stufe (höchstens sieben), dazu der Name des
// aktiven Werkzeugs und sein Hinweis. In den Blättern gilt Illustrator (A, P, +, −, ⇧W), auf der Bühne Blender (G, I,
// S für Reifen); die Tasten setzen dasselbe Werkzeug wie die Knöpfe.

import { type Ebene, type Werkzeug, useUi } from '../state/uiStore';
import { TEXTE } from '../ui/WerkzeugHinweis';
import { stufe } from '../stamm/stufen';

type Knopf = { werkzeug: Werkzeug; taste: string; name: string };

const AUSWAHL: Knopf = { werkzeug: 'auswahl', taste: 'A', name: 'Auswahl' };
const STIFT: Knopf = { werkzeug: 'stift', taste: 'P', name: 'Stift' };

/** Werkzeuge je Stufe (Plan 9.4, Spalte „Dock“); Stufen ohne Werkzeuge haben nur die Auswahl. */
const DOCK: Partial<Record<Ebene, Knopf[]>> = {
  form: [AUSWAHL, STIFT, { werkzeug: 'ziehen', taste: 'G', name: 'Ziehen' }, { werkzeug: 'aufblasen', taste: 'I', name: 'Aufblasen' }, { werkzeug: 'spant', taste: 'S', name: 'Reifen' }, { werkzeug: 'breite', taste: '⇧W', name: 'Härte' }],
  maul: [AUSWAHL, STIFT],
  zaehne: [AUSWAHL],
  augen: [AUSWAHL],
};

export function Dock() {
  const ebene = useUi((s) => s.ebene);
  const werkzeug = useUi((s) => s.werkzeug);
  const knoepfe = DOCK[ebene] ?? [AUSWAHL];
  const text = werkzeug === 'auswahl' ? null : TEXTE[werkzeug];
  const st = stufe(ebene);
  return (
    <div className="dock glas" data-dock="" style={{ '--stufe': st.farbe } as React.CSSProperties}>
      <div className="dock-knoepfe" role="toolbar" aria-label={`Werkzeuge ${st.name}`}>
        {knoepfe.map((k) => (
          <button key={k.werkzeug} type="button" className={`dock-knopf${werkzeug === k.werkzeug ? ' aktiv' : ''}`} data-werkzeug={k.werkzeug} title={`${k.name} (${k.taste})`} tabIndex={-1} onClick={() => useUi.getState().setzeWerkzeug(k.werkzeug)}>
            <span className="dock-taste">{k.taste}</span>
            <span className="dock-name">{k.name}</span>
          </button>
        ))}
      </div>
      {text && (
        <div className="dock-hinweis" key={werkzeug}>
          <b>{text[0]}</b> · {text[1]} · A oder Esc: Auswahl
        </div>
      )}
    </div>
  );
}
