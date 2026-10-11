import { useEffect, useRef } from 'react';
import { useUi } from '../state/uiStore';
import { drehen, verschieben3d, zoomen } from '../three/kamera';
import { FOV } from '../three/Renderer3D';
import { radFaktor } from './ansicht2d';

/**
 * Eingabefläche des 3D-Viewports (wie Blender): rechte Taste ziehen = drehen, mittlere Taste = verschieben,
 * Rad = zoomen. Rechtsklick ohne Bewegung öffnet ein kleines Menü.
 */
export function Steuerung3D({ hoehe }: { hoehe: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const hoeheRef = useRef(hoehe);
  hoeheRef.current = hoehe;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rad = (e: WheelEvent) => {
      e.preventDefault();
      const ui = useUi.getState();
      ui.setzeKamera(zoomen(ui.kamera, radFaktor(e)));
    };
    el.addEventListener('wheel', rad, { passive: false });
    return () => el.removeEventListener('wheel', rad);
  }, []);

  const unten = (e: React.PointerEvent) => {
    if (e.button !== 1 && e.button !== 2) return;
    e.preventDefault();
    const knopf = e.button;
    let lx = e.clientX;
    let ly = e.clientY;
    let weg = 0;
    const el = ref.current;
    el?.setPointerCapture(e.pointerId);
    const bewegen = (ev: PointerEvent) => {
      const dx = ev.clientX - lx;
      const dy = ev.clientY - ly;
      lx = ev.clientX;
      ly = ev.clientY;
      weg += Math.abs(dx) + Math.abs(dy);
      const ui = useUi.getState();
      ui.setzeKamera(knopf === 2 ? drehen(ui.kamera, dx, dy) : verschieben3d(ui.kamera, dx, dy, hoeheRef.current, FOV));
    };
    const loslassen = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', bewegen);
      window.removeEventListener('pointerup', loslassen);
      if (knopf === 2 && weg < 4) {
        useUi.getState().oeffneMenue({
          x: ev.clientX,
          y: ev.clientY,
          eintraege: [{ label: 'Ansicht zurücksetzen', aktion: () => useUi.getState().ansichtZuruecksetzen('creation') }],
        });
      }
    };
    window.addEventListener('pointermove', bewegen);
    window.addEventListener('pointerup', loslassen);
  };

  return <div ref={ref} className="steuerung3d" onPointerDown={unten} onContextMenu={(e) => e.preventDefault()} onAuxClick={(e) => e.preventDefault()} />;
}
