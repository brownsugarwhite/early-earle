import { POSEN, POSE_TITEL } from '@ee/shape';
import { useEffect, useRef, useState } from 'react';
import { neuesWesen, speichern } from '../aktionen';
import { type Modus, poseTitel, useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { Groessenregler } from './Groessenregler';

function Tab({ modus }: { modus: Modus }) {
  const aktiv = useEditor((s) => s.modus === modus);
  const titel = useEditor((s) => poseTitel(s.dok, modus));
  const entfernbar = modus !== 'editor' && modus !== 'fressen' && modus !== 'idle';
  return (
    <button
      className={aktiv ? 'pille aktiv' : 'pille'}
      // Editor-Tab = Grundform, Fressen-Tab = volle Pose, weitere Pose = Stärke 1 — in einem Zug (B1, `setzeZiel`)
      onClick={() => useEditor.getState().setzeZiel(modus)}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!entfernbar) return;
        useUi.getState().oeffneMenue({ x: e.clientX, y: e.clientY, eintraege: [{ label: 'Pose entfernen', aktion: () => useEditor.getState().poseEntfernen(modus) }] });
      }}
      data-tab={modus}
    >
      {titel}
    </button>
  );
}

function NeuePose() {
  const [offen, setOffen] = useState(false);
  const posen = useEditor((s) => s.dok.posen);
  const ref = useRef<HTMLDivElement>(null);
  const frei = POSEN.filter((p) => !posen.some((q) => q.id === p));
  // leere Pose mit eigener Id: „Pose 3“, „Pose 4“ …
  const leer = () => {
    let k = posen.length + 1;
    while (posen.some((q) => q.name === `Pose ${k}`)) k++;
    useEditor.getState().poseHinzu(`p_${Date.now().toString(36)}`, `Pose ${k}`);
  };

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
        {frei.map((p) => (
          <button
            key={p}
            className="eintrag"
            onClick={() => {
              useEditor.getState().poseHinzu(p);
              setOffen(false);
            }}
          >
            {POSE_TITEL[p] ?? p}
          </button>
        ))}
        <button
          className="eintrag"
          data-pose-leer=""
          onClick={() => {
            leer();
            setOffen(false);
          }}
        >
          Leere Pose
        </button>
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
        {posen.map((p) => (
          <Tab key={p.id} modus={p.id} />
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
