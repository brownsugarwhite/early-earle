import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUi } from '../state/uiStore';

/** Rechtsklickmenü als Liquid Glass; schließt bei Klick daneben, Esc oder Auswahl. */
export function KontextMenue() {
  const menue = useUi((s) => s.menue);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!menue || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: Math.min(menue.x, window.innerWidth - r.width - 8), y: Math.min(menue.y, window.innerHeight - r.height - 8) });
  }, [menue]);

  useEffect(() => {
    if (!menue) return;
    const weg = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) useUi.getState().oeffneMenue(null);
    };
    const timer = window.setTimeout(() => window.addEventListener('pointerdown', weg), 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', weg);
    };
  }, [menue]);

  if (!menue) return null;
  return (
    <div ref={ref} className="kontextmenue glas" style={{ left: pos?.x ?? menue.x, top: pos?.y ?? menue.y }} onContextMenu={(e) => e.preventDefault()}>
      {menue.eintraege.map((e, i) =>
        e === 'trenner' ? (
          <div key={i} className="trenner" />
        ) : (
          <button
            key={i}
            className={e.aus ? 'eintrag aus' : 'eintrag'}
            disabled={e.aus}
            onClick={() => {
              useUi.getState().oeffneMenue(null);
              e.aktion();
            }}
          >
            {e.label}
          </button>
        ),
      )}
    </div>
  );
}
