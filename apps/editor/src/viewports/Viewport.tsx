import type { CSSProperties } from 'react';
import { useRahmen } from '../layout/animation';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { VIEW_TEXTE, type ViewId } from '../types';
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

const POSE_TEXT: Record<string, string> = { fressen: 'Fressen', ruhen: 'Ruhen', laufen: 'Laufen', inklusion: 'Inklusion' };

/** Ebene 2: Titel, Richtungslabels, Eckknöpfe, Kurven bzw. 3D-Steuerung (liegt über dem Canvas). */
export function ViewportOber({ id }: { id: ViewId }) {
  const r = useRect(id);
  const oben = useUi((s) => s.oben === id);
  const maximiert = useUi((s) => s.maximiert === id);
  const modus = useEditor((s) => s.modus);
  if (!r) return null;
  const t = VIEW_TEXTE[id];
  const ui = useUi.getState();
  return (
    <div className="vp-ober" data-view={id} style={{ ...lage(r, oben), zIndex: oben ? 11 : 10 }} onPointerEnter={() => ui.setzeHover(id)} onPointerLeave={() => useUi.getState().hover === id && ui.setzeHover(null)}>
      <div className="vp-titel">{t.titel}</div>
      <div className="vp-inhalt">
        {id === 'creation' ? <Steuerung3D hoehe={r.h} /> : <View2D ansicht={id} w={r.w} h={r.h} />}
        {t.links && <div className="vp-label links">{t.links}</div>}
        {t.rechts && <div className="vp-label rechts">{t.rechts}</div>}
        {id === 'creation' && <div className="vp-label links platzhalter">{versuchAktiv()?.modus === 'subd' ? 'Versuch: Subdivision' : 'Platzhalter-Körper'}</div>}
        {id === 'creation' && modus !== 'editor' && <div className="pose-hinweis glas">Pose „{POSE_TEXT[modus]}“: Bearbeiten kommt mit der Bauweise</div>}
      </div>
      <div className="eckknoepfe">
        {id !== 'creation' && (
          <>
            <button className="eckknopf braun" title="noch frei" tabIndex={-1} />
            <button className="eckknopf blau" title="noch frei" tabIndex={-1} />
          </>
        )}
        <button className="eckknopf pink" data-maximieren={id} title={maximiert ? 'Zurück ins Raster (⌃Leertaste)' : 'Vergrößern (⌃Leertaste)'} tabIndex={-1} onClick={() => useUi.getState().maximieren(id)} />
      </div>
    </div>
  );
}
