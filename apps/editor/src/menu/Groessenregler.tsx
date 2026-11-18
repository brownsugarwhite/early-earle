import { SKALIERUNG_MAX, SKALIERUNG_MIN } from '@ee/shape';
import { useRef } from 'react';
import { useEditor } from '../state/editorStore';

/** Größe des ganzen Wesens auf der Kachel (25–300 %). Doppelklick setzt auf 100 %. */
export function Groessenregler() {
  const wert = useEditor((s) => s.dok.skalierung);
  const bahn = useRef<HTMLDivElement>(null);
  const anteil = (wert - SKALIERUNG_MIN) / (SKALIERUNG_MAX - SKALIERUNG_MIN);

  const setzeAus = (clientX: number) => {
    const r = bahn.current!.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const v = SKALIERUNG_MIN + f * (SKALIERUNG_MAX - SKALIERUNG_MIN);
    // auf 5 % rasten, 100 % leicht magnetisch
    const gerastet = Math.abs(v - 1) < 0.04 ? 1 : Math.round(v * 20) / 20;
    useEditor.getState().setzeSkalierung(gerastet);
  };

  const unten = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    useEditor.getState().beginGeste();
    setzeAus(e.clientX);
    const bewegen = (ev: PointerEvent) => setzeAus(ev.clientX);
    const los = () => {
      window.removeEventListener('pointermove', bewegen);
      window.removeEventListener('pointerup', los);
      useEditor.getState().endeGeste();
    };
    window.addEventListener('pointermove', bewegen);
    window.addEventListener('pointerup', los);
  };

  return (
    <div className="regler pille" title="Größe des Wesens auf der Kachel (Doppelklick: 100 %)" onPointerDown={unten} onDoubleClick={() => useEditor.getState().setzeSkalierung(1)}>
      <span className="regler-text">Größe</span>
      <div className="regler-bahn" ref={bahn}>
        <div className="regler-fuellung" style={{ width: `${anteil * 100}%` }} />
        <div className="regler-knopf" style={{ left: `${anteil * 100}%` }} />
      </div>
      <span className="regler-wert">{Math.round(wert * 100)} %</span>
    </div>
  );
}
