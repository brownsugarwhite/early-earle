import { POSEN, type PoseName } from '@ee/shape';
import { useEffect, useRef, useState } from 'react';
import { neuesWesen, speichern } from '../aktionen';
import { type Modus, useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { Groessenregler } from './Groessenregler';

export const POSE_NAMEN: Record<Modus, string> = { editor: 'Editor', fressen: 'Fressen', ruhen: 'Ruhen', laufen: 'Laufen', inklusion: 'Inklusion' };

function Tab({ modus }: { modus: Modus }) {
  const aktiv = useEditor((s) => s.modus === modus);
  const entfernbar = modus !== 'editor' && modus !== 'fressen';
  return (
    <button
      className={aktiv ? 'pille aktiv' : 'pille'}
      onClick={() => {
        useEditor.getState().setzeModus(modus);
        // Editor-Tab = Maul zu, Fressen-Tab = Maul auf (12.10. nachts: sonst zeigt das 3D die bearbeitete Pose-Form nicht)
        if (modus === 'editor' || modus === 'fressen') useUi.getState().setzeOeffnung(modus === 'fressen' ? 1 : 0);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!entfernbar) return;
        useUi.getState().oeffneMenue({ x: e.clientX, y: e.clientY, eintraege: [{ label: 'Pose entfernen', aktion: () => useEditor.getState().poseEntfernen(modus as PoseName) }] });
      }}
    >
      {POSE_NAMEN[modus]}
    </button>
  );
}

function NeuePose() {
  const [offen, setOffen] = useState(false);
  const posen = useEditor((s) => s.dok.posen);
  const ref = useRef<HTMLDivElement>(null);
  const frei = POSEN.filter((p) => !posen.includes(p));

  useEffect(() => {
    if (!offen) return;
    const weg = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOffen(false);
    };
    window.addEventListener('pointerdown', weg);
    return () => window.removeEventListener('pointerdown', weg);
  }, [offen]);

  return (
    <div className="dropdown" ref={ref}>
      <button className={offen ? 'pille offen' : 'pille'} onClick={() => setOffen(!offen)}>
        Neue Pose
        <svg className="dreieck" width="9" height="8" viewBox="0 0 10 8" aria-hidden="true">
          <path d="M0 0H10L5 8Z" fill="currentColor" />
        </svg>
      </button>
      <div className={offen ? 'aufklapp glas offen' : 'aufklapp glas'}>
        {frei.length === 0 && <div className="eintrag aus">Alle Posen angelegt</div>}
        {frei.map((p) => (
          <button
            key={p}
            className="eintrag"
            onClick={() => {
              useEditor.getState().poseHinzu(p);
              setOffen(false);
            }}
          >
            {POSE_NAMEN[p]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MenuBar() {
  const posen = useEditor((s) => s.dok.posen);
  const library = useUi((s) => s.library);
  return (
    <header className="menueleiste">
      <div className="gruppe">
        <Tab modus="editor" />
        <Tab modus="fressen" />
        {posen.map((p) => (
          <Tab key={p} modus={p} />
        ))}
        <NeuePose />
      </div>
      <div className="gruppe">
        <Groessenregler />
        <button className="pille" onClick={neuesWesen}>
          Neues Wesen
        </button>
        <button className="pille" onClick={speichern}>
          Speichern
        </button>
        <button className={library ? 'pille aktiv' : 'pille'} onClick={() => useUi.getState().libraryUmschalten()}>
          Library
        </button>
      </div>
    </header>
  );
}
