import type { CSSProperties } from 'react';
import { useRahmen } from '../layout/animation';
import { useEditor } from '../state/editorStore';
import { type Ebene, useUi } from '../state/uiStore';
import { BLICK_TEXTE, VIEW_TEXTE, type ViewId } from '../types';
import { versuchAktiv } from '../versuch/subdivision';
import { mitKanten } from '../kanten/kantenKoerper';
import { Pauspapier, pauspapierAusDatei } from './Pauspapier';
import { Steuerung3D } from './Steuerung3D';
import { View2D } from './View2D';

function useRect(id: ViewId) {
  return useRahmen((s) => s.rects?.[id] ?? null);
}

function lage(r: { x: number; y: number; w: number; h: number }, oben: boolean): CSSProperties {
  return { left: r.x, top: r.y, width: r.w, height: r.h, zIndex: oben ? 2 : 1 };
}

/** Ebene 0: Fläche mit dem gemeinsamen Verlauf (liegt unter dem 3D-Canvas). */
export function ViewportGrund({ id }: { id: ViewId }) {
  const r = useRect(id);
  const oben = useUi((s) => s.oben === id);
  if (!r) return null;
  return <div className="vp-grund" data-view={id} style={lage(r, oben)} />;
}

/** Eckpunkt als Tab (Florian 12.10.): Klick schaltet die Ebene in allen Viewports um, zweiter Klick zurück zur Form. */
const POSE_TEXT: Record<string, string> = { fressen: 'Fressen', ruhen: 'Ruhen', laufen: 'Laufen', inklusion: 'Inklusion' };

/** Zebrastreifen im 3D an/aus (Prüfen der Kanten: Streifen springen an einem Knick, fließen über glatte Flächen). */
function ZebraKnopf() {
  const an = useUi((s) => s.zebra);
  return <button className={`eckknopf zebra${an ? ' aktiv' : ''}`} data-zebra="" title={an ? 'Zebrastreifen aus' : 'Zebrastreifen: Kanten prüfen'} tabIndex={-1} onClick={() => useUi.getState().setzeZebra(!an)} />;
}

/** Titel als Tab (Florian 12.10.): Front ↔ Back, Top ↔ Bottom; Seite und 3D bleiben ein Titel. */
function Titel({ id }: { id: ViewId }) {
  const blick = useUi((s) => (id === 'front' || id === 'top' ? s.blick[id] : null));
  const bauweise = useUi((s) => s.bauweise);
  if (id === 'creation') {
    // Versuch 12.10. abends: Bauweise zum Vergleichen umschalten (wie „front · back“)
    return (
      <div className="vp-titel blick-tabs" role="tablist">
        {(
          [
            ['bisher', VIEW_TEXTE.creation.titel],
            ['wirbel', 'wirbelsäule'],
            ['rund', 'rund'],
            ['kern', 'kern'],
          ] as const
        ).map(([wert, text]) => {
          // Versuch 13.10. nachmittags: Der dritte Tab ist „rund“; der Schnitt-Loft vom Vormittag ist dort ein Umschalter in der Leiste
          const aktiv = bauweise === wert || (wert === 'rund' && bauweise === 'schnitte');
          return (
            <button key={wert} role="tab" aria-selected={aktiv} className={aktiv ? 'aktiv' : ''} data-bauweise={wert} tabIndex={-1} onClick={() => useUi.getState().setzeBauweise(wert)}>
              {text}
            </button>
          );
        })}
      </div>
    );
  }
  if (id !== 'front' && id !== 'top') return <div className="vp-titel">{VIEW_TEXTE[id].titel}</div>;
  const [a, b] = BLICK_TEXTE[id];
  const werte = id === 'front' ? (['front', 'hinten'] as const) : (['top', 'unten'] as const);
  return (
    <div className="vp-titel blick-tabs" role="tablist">
      {[a, b].map((text, i) => {
        const wert = werte[i]!;
        const aktiv = blick === wert;
        return (
          <button
            key={text}
            role="tab"
            aria-selected={aktiv}
            className={aktiv ? 'aktiv' : ''}
            data-blick={wert}
            tabIndex={-1}
            onClick={() => (id === 'front' ? useUi.getState().setzeBlick('front', wert as 'front' | 'hinten') : useUi.getState().setzeBlick('top', wert as 'top' | 'unten'))}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

/** Ebene 2: Titel, Richtungslabels, Eckknöpfe, Kurven bzw. 3D-Steuerung (liegt über dem Canvas). */
export function ViewportOber({ id }: { id: ViewId }) {
  const r = useRect(id);
  const oben = useUi((s) => s.oben === id);
  const maximiert = useUi((s) => s.maximiert === id);
  const modus = useEditor((s) => s.modus);
  const hatMaul = useEditor((s) => !!s.dok.maul);
  const zurueck = useUi((s) => id === 'front' && s.blick.front === 'hinten');
  const kantenKoerper = useEditor((s) => id === 'creation' && mitKanten(s.dok));
  const bauweise = useUi((s) => s.bauweise);
  if (!r) return null;
  const t = VIEW_TEXTE[id];
  const ui = useUi.getState();
  // Back: links und rechts tauschen (waagerecht gespiegelt)
  const links = zurueck ? t.rechts : t.links;
  const rechts = zurueck ? t.links : t.rechts;
  return (
    <div className="vp-ober" data-view={id} style={{ ...lage(r, oben), zIndex: oben ? 11 : 10 }} onPointerEnter={() => ui.setzeHover(id)} onPointerLeave={() => useUi.getState().hover === id && ui.setzeHover(null)}>
      <Titel id={id} />
      <div
        className="vp-inhalt"
        onDragOver={(e) => {
          if (id !== 'creation' && e.dataTransfer.types.includes('Files')) e.preventDefault();
        }}
        onDrop={(e) => {
          if (id === 'creation') return;
          const datei = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
          if (!datei) return;
          e.preventDefault();
          pauspapierAusDatei(datei, id);
        }}
      >
        {id !== 'creation' && <Pauspapier ansicht={id} w={r.w} h={r.h} />}
        {id === 'creation' ? <Steuerung3D hoehe={r.h} /> : <View2D ansicht={id} w={r.w} h={r.h} />}
        {links && <div className="vp-label links">{links}</div>}
        {rechts && <div className="vp-label rechts">{rechts}</div>}
        {id === 'creation' && (
          <div className="vp-label links platzhalter">
            {bauweise === 'kern' && !versuchAktiv()
              ? 'Wesen-Editor 2: Kern (Beweis 1)'
              : bauweise === 'rund' && !versuchAktiv()
              ? 'Versuch: rund'
              : bauweise === 'schnitte' && !versuchAktiv()
              ? 'Versuch: Schnitte'
              : versuchAktiv()?.modus === 'wirbel' || (bauweise === 'wirbel' && !versuchAktiv())
              ? 'Versuch: Wirbelsäule'
              : versuchAktiv()?.modus === 'maul' || hatMaul
              ? 'Versuch: Maul im Netz'
              : versuchAktiv()?.modus === 'subd' || versuchAktiv()?.modus === 'tigerkaefig'
                ? 'Versuch: Subdivision'
                : kantenKoerper
                  ? 'Versuch: Kanten im Käfig'
                  : 'Platzhalter-Körper'}
          </div>
        )}
        {id === 'creation' && modus !== 'editor' && modus !== 'fressen' && !hatMaul && versuchAktiv()?.modus !== 'tiger' && versuchAktiv()?.modus !== 'maul' && <div className="pose-hinweis glas">Pose „{POSE_TEXT[modus]}“: Bearbeiten kommt mit der Bauweise</div>}
      </div>
      {/* Plan 9.3: die Stufe wählt der Stamm; am Viewport bleiben Zebra (Prüfansicht) und Vergrößern */}
      <div className="eckknoepfe">
        {id === 'creation' && <ZebraKnopf />}
        <button className="eckknopf pink" data-maximieren={id} title={maximiert ? 'Zurück ins Raster (⌃Leertaste)' : 'Vergrößern (⌃Leertaste)'} tabIndex={-1} onClick={() => useUi.getState().maximieren(id)} />
      </div>
    </div>
  );
}
