// Versuch 13.10. nachmittags: Seitenleiste der Bauweise „rund“ mit dem Umschalter zum Schnitt-Loft vom Vormittag.

import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { useRundAnzeige } from './rundBau';

export function RundBereich() {
  const bauweise = useUi((s) => s.bauweise);
  const info = useRundAnzeige((s) => s.info);
  const hatMaul = useEditor((s) => !!s.dok.maul);
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
          <p className="hilfe">
            Noch nicht in dieser Bauweise: Spanten, Kanten, Maul{hatMaul ? ' (hier ausgeblendet)' : ''}. Flache Ober- und Unterseiten der Front werden rund.
          </p>
        </>
      )}
      {bauweise === 'schnitte' && <p className="hilfe">Schnitt-Loft vom Vormittag (13.10.) zum Vergleichen: echte Schnitte je Stelle, gerundet im Hüllkasten.</p>}
    </section>
  );
}
