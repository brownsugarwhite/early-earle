// Plan 9.4: das Dock — kleine Glasleiste unten mit den Werkzeugen der Stufe (höchstens sieben), dazu der Name des
// aktiven Werkzeugs und sein Hinweis. In den Blättern gilt Illustrator (A, P, +, −, ⇧W), auf der Bühne Blender (G, I,
// S für Reifen); die Tasten setzen dasselbe Werkzeug wie die Knöpfe. Plan 20.10., V3: Mit einer Auswahl im Blatt greifen
// G/S/R sie (modal wie Blender), die Zeile zeigt dann die laufende Operation.

import { useSchleife } from '../kern/schleifenAuswahl';
import { useSchleifenVorschau } from '../kern/schleifenWerkzeug';
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
  // Posen & Leben: Knochen mit der Auswahl, den Blendshape der Pose mit den Pinseln (Florian 15.10.)
  posen: [AUSWAHL, { werkzeug: 'ziehen', taste: 'G', name: 'Ziehen' }, { werkzeug: 'aufblasen', taste: 'I', name: 'Aufblasen' }],
};

const ABFALL = { glatt: 'glatt', kugel: 'Kugel', wurzel: 'Wurzel', spitz: 'spitz', linear: 'linear', konstant: 'konstant' } as const;

export function Dock() {
  const ebene = useUi((s) => s.ebene);
  const werkzeug = useUi((s) => s.werkzeug);
  // Plan 20.10., V3: laufende Operation G/S/R wie Blenders Kopfzeile; sonst der Zustand von O und, solange im Blatt etwas
  // gewählt ist, was G/S/R damit tun
  const modal = useUi((s) => s.modal?.text ?? null);
  // V6: ⌘R (Loops) zeigt hier, wie viele Loops wo entstehen
  const schleifen = useSchleifenVorschau((s) => s.text);
  // gleitet der Loop, setzen Esc und Rechtsklick ihn in die Mitte
  const gleiten = useSchleifenVorschau((s) => s.gleiten);
  // V6.3/V6.4: G/S/R auf einem Loop (Bühne oder Blatt; im Blatt auch als Ziehen an der Linie) und der gewählte Loop
  const loopGrs = useSchleife((s) => s.text);
  const loopZiehen = useSchleife((s) => s.anzeige?.ziehen ?? false);
  const loopGewaehlt = useSchleife((s) => s.gewaehlt !== null);
  const prop = useUi((s) => s.proportional);
  const gewaehlt = useUi((s) => s.auswahl.seite.length + s.auswahl.front.length + s.auswahl.top.length + (s.kantenAuswahl?.indizes.length ?? 0) + (s.spantAuswahl?.knoten.length ?? 0) > 0);
  const knoepfe = DOCK[ebene] ?? [AUSWAHL];
  const text = werkzeug === 'auswahl' ? null : TEXTE[werkzeug];
  const st = stufe(ebene);
  const propText = prop.an ? ` · O proportional ${ABFALL[prop.abfall]}${prop.verbunden ? ', verbunden' : ''} (Rad, [ ])` : '';
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
      {loopGrs ? (
        <div className="dock-hinweis dock-modal" data-schleife-grs={loopGrs}>
          <b>{loopGrs}</b> · X/Y/Z Achse (S: Y Höhe, Z Breite) · Zahl · O proportional · {loopZiehen ? 'loslassen: fertig · Esc: zurück' : 'Enter oder Klick: fertig · Esc oder Rechtsklick: zurück'}
        </div>
      ) : schleifen ? (
        <div className="dock-hinweis dock-modal" data-schleifen-text={schleifen}>
          <b>{schleifen}</b> · Rad, Bild↑↓ oder Ziffer: Anzahl · Klick: setzen (ein Loop gleitet danach, zweiter Klick: fertig) · Esc oder Rechtsklick: {gleiten ? 'in die Mitte' : 'zurück'}
        </div>
      ) : modal ? (
        <div className="dock-hinweis dock-modal" data-modal-text={modal}>
          <b>{modal}</b> · X/Y/Z Achse · Zahl · Enter oder Klick: fertig · Esc oder Rechtsklick: zurück
        </div>
      ) : text ? (
        <div className="dock-hinweis" key={werkzeug}>
          <b>{text[0]}</b> · {text[1]} · A oder Esc: Auswahl{propText}
        </div>
      ) : ebene === 'form' && (gewaehlt || prop.an) ? (
        <div className="dock-hinweis" data-proportional={prop.an ? prop.abfall : 'aus'}>
          {loopGewaehlt ? <><b>Loop</b> · G verschieben, G G gleiten, S skalieren, R kippen (Zeiger über der Bühne oder einem Blatt) · im Blatt ziehen · ⇧-Klick: weitere Loops</> : gewaehlt ? <><b>G/S/R</b> · Auswahl verschieben, skalieren, drehen (Zeiger über dem Blatt)</> : <b>Auswahl</b>}
          {propText}
        </div>
      ) : null}
    </div>
  );
}
