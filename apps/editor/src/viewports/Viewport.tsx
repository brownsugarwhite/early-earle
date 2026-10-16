import type { CSSProperties } from 'react';
import { useRahmen } from '../layout/animation';
import { poseTitel, useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { BLICK_TEXTE, VIEW_TEXTE, type ViewId } from '../types';
import { versuchAktiv } from '../versuch/subdivision';
import { mitKanten } from '../kanten/kantenKoerper';
import { Pauspapier, pauspapierAusDatei } from './Pauspapier';
import { Steuerung3D } from './Steuerung3D';
import { View2D } from './View2D';
import { useKernAnzeige } from '../kern/kernBau';
import { usePoseLippen } from '../posen/poseLippen';
import { ZielChips } from '../posen/ZielChips';

const px = (d: number) => d.toFixed(1).replace('.', ',');

/**
 * Abweichung der Lippenkanten von Rot und Blau (Phase 2 M2, Florian: „exakt die Lippenkante“), nur in der Stufe Maul, Seite
 * und Front. In einer Pose (B5): Abweichung der Lippen von Rot und Blau der Pose (3D, in beiden Blättern dieselbe Zahl).
 */
function Lippen({ id }: { id: 'seite' | 'front' }) {
  const basis = useKernAnzeige((s) => s.info?.maul);
  const ebene = useUi((s) => s.ebene);
  const pose = usePoseLippen();
  const maul = pose ? { oben: { seite: pose.abweichung.oben, front: pose.abweichung.oben }, unten: pose.zu ? null : { seite: pose.abweichung.unten, front: pose.abweichung.unten } } : basis;
  if (ebene !== 'maul' || !maul) return null;
  const wert = (w: { seite: number; front: number | null }) => (id === 'seite' ? w.seite : w.front);
  const eintrag = (name: 'rot' | 'blau', w: { seite: number; front: number | null }) => {
    const d = wert(w);
    return (
      <span key={name} className={`vp-lippe ${name} ${d === null ? '' : d <= 1 ? 'gut' : d <= 3 ? 'mittel' : 'schlecht'}`} data-lippe={name} data-px={d === null ? '' : d.toFixed(1)} title={`größte Abweichung der ${name === 'rot' ? 'Oberlippenkante' : 'Unterkieferkante'} von der ${name === 'rot' ? 'roten' : 'blauen'} Linie in diesem Blatt (px bei 461 px je Kachel)`}>
        {name} {d === null ? '–' : `${px(d)} px`}
      </span>
    );
  };
  return (
    <span className="vp-lippen">
      {eintrag('rot', maul.oben)}
      {maul.unten && eintrag('blau', maul.unten)}
    </span>
  );
}

/** Abweichung Körper ↔ Kurve des Blatts (Plan 9.8: Zahl im Titel; grün ≤ 2, ocker ≤ 6, sonst pink; px bei 461 px je Kachel). */
function Delta({ id }: { id: 'seite' | 'front' | 'top' }) {
  const d = useKernAnzeige((s) => s.info?.blatt?.[id]?.max);
  const kern = useUi((s) => s.bauweise === 'kern');
  if (!kern || d === undefined) return null;
  const stufe = d <= 2 ? 'gut' : d <= 6 ? 'mittel' : 'schlecht';
  return (
    <>
      <span className={`vp-delta ${stufe}`} data-delta={d.toFixed(1)} title="größte Abweichung zwischen Körper und Kurve in diesem Blatt (px bei 461 px je Kachel)">
        Δ {px(d)} px
      </span>
      {id !== 'top' && <Lippen id={id} />}
    </>
  );
}

/** Versuchs-Tabs am 3D-Fenster (creation · wirbelsäule · rund · kern) nur mit `?versuche=1` oder in einem Versuch */
const VERSUCHE_ZEIGEN = new URLSearchParams(location.search).get('versuche') === '1' || new URLSearchParams(location.search).has('versuch');

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
    // Versuch 12.10. abends: Bauweise zum Vergleichen umschalten (wie „front · back“); seit M3 ist der Kern Standard,
    // die Versuchs-Tabs erscheinen nur noch mit `?versuche=1` (M4 räumt sie auf)
    if (!VERSUCHE_ZEIGEN) return <div className="vp-titel">bühne</div>;
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
  if (id !== 'front' && id !== 'top')
    return (
      <div className="vp-titel">
        {VIEW_TEXTE[id].titel}
        {id === 'seite' && <Delta id="seite" />}
      </div>
    );
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
      <Delta id={id} />
    </div>
  );
}

/** Ebene 2: Titel, Richtungslabels, Eckknöpfe, Kurven bzw. 3D-Steuerung (liegt über dem Canvas). */
export function ViewportOber({ id }: { id: ViewId }) {
  const r = useRect(id);
  const oben = useUi((s) => s.oben === id);
  const maximiert = useUi((s) => s.maximiert === id);
  const modus = useEditor((s) => s.modus);
  const poseName = useEditor((s) => poseTitel(s.dok, s.modus));
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
    <div className={id === 'creation' && modus !== 'editor' && bauweise === 'kern' ? 'vp-ober pose-ziel' : 'vp-ober'} data-view={id} style={{ ...lage(r, oben), zIndex: oben ? 11 : 10 }} onPointerEnter={() => ui.setzeHover(id)} onPointerLeave={() => useUi.getState().hover === id && ui.setzeHover(null)}>
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
              ? ''
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
        {/* Pose-Hinweis: in der Bauweise Kern formen die Pinsel die Pose (Posenliste, 15.10.); in den Versuchen gibt es das noch nicht */}
        {/* Fressen (Florian 15.10.): Blendshape mit den Pinseln, Knochen in „Posen & Leben“ */}
        {/* B7: Ziel und Vorschau als Chips (Bauweise Kern); in den Versuchen bleibt der alte Hinweis */}
        {id === 'creation' && bauweise === 'kern' && <ZielChips />}
        {id === 'creation' && modus !== 'editor' && bauweise !== 'kern' && !hatMaul && versuchAktiv()?.modus !== 'tiger' && versuchAktiv()?.modus !== 'maul' && <div className="pose-hinweis glas">Pose „{poseName}“: Bearbeiten kommt mit der Bauweise</div>}
      </div>
      {/* Plan 9.3: die Stufe wählt der Stamm; am Viewport bleiben Zebra (Prüfansicht) und Vergrößern */}
      <div className="eckknoepfe">
        {id === 'creation' && <ZebraKnopf />}
        <button className="eckknopf pink" data-maximieren={id} title={maximiert ? 'Zurück ins Raster (⌃Leertaste)' : 'Vergrößern (⌃Leertaste)'} tabIndex={-1} onClick={() => useUi.getState().maximieren(id)} />
      </div>
    </div>
  );
}
