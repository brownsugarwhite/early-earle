// Versuch 13.10. nachmittags: Seitenleiste der Bauweise „rund“ mit dem Umschalter zum Schnitt-Loft vom Vormittag.

import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { useRundAnzeige } from './rundBau';
import { RUND_SPANT, rundSpantLoeschen, rundSpantName, spantenAnKante } from './RundSpantEbene';

export function RundBereich() {
  const bauweise = useUi((s) => s.bauweise);
  const info = useRundAnzeige((s) => s.info);
  const hatMaul = useEditor((s) => !!s.dok.maul);
  const spanten = useEditor((s) => s.dok.rundSpanten);
  const spantAuswahl = useUi((s) => s.rundSpantAuswahl);
  const werkzeug = useUi((s) => s.werkzeug);
  const kantenAuswahl = useUi((s) => s.kantenAuswahl);
  const kantenZahl = useEditor((s) => s.dok.kanten?.length ?? 0);
  const zahl = (n: number) => n.toLocaleString('de-DE');
  return (
    <section className="leiste-bereich rund-bereich" data-rundbereich="">
      <div className="feld">
        <span>Bauweise</span>
      </div>
      <div className="umschalter">
        <button className={bauweise === 'rund' ? 'chip aktiv' : 'chip'} data-bauweisewahl="rund" onClick={() => useUi.getState().setzeBauweise('rund')}>
          rund
        </button>
        <button className={bauweise === 'schnitte' ? 'chip aktiv' : 'chip'} data-bauweisewahl="schnitte" onClick={() => useUi.getState().setzeBauweise('schnitte')}>
          Schnitt-Loft
        </button>
      </div>
      {bauweise === 'rund' && (
        <>
          <div className="feld">
            <span>Rund</span>
            <b data-rundinfo={info?.dreiecke ?? 0} data-rundgrob={info?.grob ? '1' : '0'}>
              {info ? `${info.grob ? 'grob' : 'fein'} · ${Math.round(info.millisekunden)} ms · ${zahl(info.dreiecke)} Dreiecke` : '…'}
            </b>
          </div>
          <p className="hilfe">
            Die Seite wird rund aufgeblasen wie ein Kissen: Hälse, Schnauzen und Überhänge werden runde Röhren, ohne Wirbelsäule. Top und Front geben die Breite. Die
            Seite stimmt immer genau. Gestrichelt: Umriss des 3D-Körpers. Wo er von deiner Linie abweicht, widersprechen sich die Ansichten (oder die Rundung kann es
            nicht).
          </p>
          {info && (
            <div className="feld">
              <span>Abweichung</span>
              <b data-rundrest="">
                Top {Math.round(info.restTop)} px · Front {Math.round(info.restFront)} px
              </b>
            </div>
          )}
          {info && info.seitenteile > 0 && (
            <div className="feld">
              <span>Seitenteile</span>
              <b data-rundseitenteile={info.seitenteile}>{info.seitenteile === 1 ? '1 Haken (je Seite)' : `${info.seitenteile} Haken (je Seite)`}</b>
            </div>
          )}
          <p className="hilfe">
            Haken im Top (Luft zwischen Körper und Widerhaken) werden von selbst eigene Teile: rund aufgeblasen aus dem Top, Dicke aus Seite und Front, am Ansatz
            weich mit dem Körper verbunden. Beim Ziehen liegen sie nur an, beim Loslassen wachsen sie an.
          </p>
          <div className="feld">
            <span>Spanten</span>
            <b data-rundspanten={spanten?.length ?? 0} style={{ color: RUND_SPANT }}>
              {spanten?.length ? `${spanten.length} quer zum Körper` : 'keine'}
            </b>
          </div>
          {!!spanten?.length && (
            <div className="umschalter">
              {spanten.map((_, i) => (
                <button
                  key={i}
                  className={spantAuswahl?.spant === i ? 'chip aktiv' : 'chip'}
                  data-rundspanteintrag={i}
                  onClick={() => useUi.getState().setzeRundSpantAuswahl({ spant: i, knoten: [] })}
                >
                  {rundSpantName(i)}
                </button>
              ))}
              {spantAuswahl && (
                <button className="chip" data-rundspantloeschen="" onClick={() => rundSpantLoeschen()}>
                  löschen
                </button>
              )}
            </div>
          )}
          <p className="hilfe">
            {werkzeug === 'spant'
              ? 'Spant setzen: in der Seite in ein Teil klicken (quer zum Körper, beim senkrechten Hals waagerecht) oder eine Linie ziehen (über mehrere Teile: je Teil ein Spant).'
              : 'Spant: S drücken, dann in der Seite klicken oder eine Linie ziehen.'}{' '}
            Der gewählte Spant erscheint in der Front an seiner Höhe: Punkte und Griffe ziehen, ⌥ macht eine Ecke, Zeichenstift, + und − fügen Punkte in allen Spanten
            ein. Breite 1 ist der runde Körper. Punkte bleiben auf ihrer Hälfte. Zwischen zwei Spanten desselben Teils wird Punkt für Punkt überblendet.
          </p>
          <div className="feld">
            <span>Kanten</span>
            <b data-rundkanten={kantenZahl}>{kantenZahl ? `${kantenZahl} Linien` : 'keine'}</b>
          </div>
          {kantenAuswahl && (
            <div className="umschalter">
              <button className="chip" data-rundkantenspanten="" onClick={() => spantenAnKante(kantenAuswahl.kante)}>
                Spanten an den Punkten der Kante
              </button>
            </div>
          )}
          <p className="hilfe">
            Kante: Zeichenstift (P) in der Seite auf freier Fläche, Enter beendet. An jedem Punkt entsteht ein Spant quer zur Linie, der Kantenpunkt (türkis)
            liegt genau darin. In der Front knickt ⌥ ihn zur Ecke, die Griffe geben die Rundung (kurz = scharf); zwischen den Spanten läuft die Kante weiter.
          </p>
          <p className="hilfe">Noch nicht in dieser Bauweise: Maul{hatMaul ? ' (hier ausgeblendet)' : ''}. Flache Ober- und Unterseiten der Front werden rund (oder mit einem Spant flach).</p>
        </>
      )}
      {bauweise === 'schnitte' && <p className="hilfe">Schnitt-Loft vom Vormittag (13.10.) zum Vergleichen: echte Schnitte je Stelle, gerundet im Hüllkasten.</p>}
    </section>
  );
}
