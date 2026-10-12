import type { CSSProperties } from 'react';
import { useRahmen } from '../layout/animation';
import { useEditor } from '../state/editorStore';
import { type Ebene, useUi } from '../state/uiStore';
import { BLICK_TEXTE, VIEW_TEXTE, type ViewId } from '../types';
import { versuchAktiv } from '../versuch/subdivision';
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
function TabKnopf({ ebene, farbe, titel }: { ebene: Ebene; farbe: string; titel: string }) {
  const aktiv = useUi((s) => s.ebene === ebene);
  return <button className={`eckknopf ${farbe}${aktiv ? ' aktiv' : ''}`} data-tab={ebene} title={aktiv ? `${titel} (zurück zur Form)` : titel} tabIndex={-1} onClick={() => useUi.getState().setzeEbene(ebene)} />;
}

const POSE_TEXT: Record<string, string> = { fressen: 'Fressen', ruhen: 'Ruhen', laufen: 'Laufen', inklusion: 'Inklusion' };

/** Titel als Tab (Florian 12.10.): Front ↔ Back, Top ↔ Bottom; Seite und 3D bleiben ein Titel. */
function Titel({ id }: { id: ViewId }) {
  const blick = useUi((s) => (id === 'front' || id === 'top' ? s.blick[id] : null));
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
  if (!r) return null;
  const t = VIEW_TEXTE[id];
  const ui = useUi.getState();
  // Back: links und rechts tauschen (waagerecht gespiegelt)
  const links = zurueck ? t.rechts : t.links;
  const rechts = zurueck ? t.links : t.rechts;
  return (
    <div className="vp-ober" data-view={id} style={{ ...lage(r, oben), zIndex: oben ? 11 : 10 }} onPointerEnter={() => ui.setzeHover(id)} onPointerLeave={() => useUi.getState().hover === id && ui.setzeHover(null)}>
      <Titel id={id} />
      <div className="vp-inhalt">
        {id === 'creation' ? <Steuerung3D hoehe={r.h} /> : <View2D ansicht={id} w={r.w} h={r.h} />}
        {links && <div className="vp-label links">{links}</div>}
        {rechts && <div className="vp-label rechts">{rechts}</div>}
        {id === 'creation' && <div className="vp-label links platzhalter">{versuchAktiv()?.modus === 'maul' || hatMaul ? 'Versuch: Maul im Netz' : versuchAktiv()?.modus === 'subd' || versuchAktiv()?.modus === 'tigerkaefig' ? 'Versuch: Subdivision' : 'Platzhalter-Körper'}</div>}
        {id === 'creation' && modus !== 'editor' && !hatMaul && versuchAktiv()?.modus !== 'tiger' && versuchAktiv()?.modus !== 'maul' && <div className="pose-hinweis glas">Pose „{POSE_TEXT[modus]}“: Bearbeiten kommt mit der Bauweise</div>}
      </div>
      <div className="eckknoepfe">
        {id !== 'creation' && (
          <>
            <TabKnopf ebene="zaehne" farbe="braun" titel="Zähne" />
            <TabKnopf ebene="maul" farbe="blau" titel="Maul" />
            <TabKnopf ebene="augen" farbe="weiss" titel="Augen (folgt)" />
          </>
        )}
        <TabKnopf ebene="rig" farbe="orange" titel="Rig" />
        <button className="eckknopf pink" data-maximieren={id} title={maximiert ? 'Zurück ins Raster (⌃Leertaste)' : 'Vergrößern (⌃Leertaste)'} tabIndex={-1} onClick={() => useUi.getState().maximieren(id)} />
      </div>
    </div>
  );
}
