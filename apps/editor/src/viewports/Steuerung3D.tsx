import { useEffect, useRef } from 'react';
import { useUi } from '../state/uiStore';
import { drehen, verschieben3d, zoomen } from '../three/kamera';
import { FOV } from '../three/Renderer3D';
import { istTrackpad, radFaktor } from './ansicht2d';

/**
 * Eingabefläche des 3D-Viewports, wie Blender und trackpadtauglich:
 * - linke oder rechte Taste ziehen = drehen (⌃-Klick der Mac-Rechtsklick ebenso), mit ⇧ = verschieben
 * - mittlere Taste ziehen = verschieben
 * - Mausrad und Pinch = zoomen, Zwei-Finger-Wischen auf dem Trackpad = drehen (mit ⇧ verschieben)
 * Rechtsklick ohne Bewegung öffnet ein kleines Menü.
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
      if (istTrackpad(e)) {
        // Inhalt folgt den Fingern (natürliches Scrollen)
        ui.setzeKamera(e.shiftKey ? verschieben3d(ui.kamera, -e.deltaX, -e.deltaY, hoeheRef.current, FOV) : drehen(ui.kamera, -e.deltaX, -e.deltaY));
      } else {
        ui.setzeKamera(zoomen(ui.kamera, radFaktor(e)));
      }
    };
    el.addEventListener('wheel', rad, { passive: false });
    return () => el.removeEventListener('wheel', rad);
  }, []);

  const unten = (e: React.PointerEvent) => {
    if (e.button > 2) return;
    e.preventDefault();
    const knopf = e.button;
    const verschiebe = knopf === 1 || e.shiftKey;
    const menueMoeglich = knopf === 2 || (knopf === 0 && e.ctrlKey);
    let lx = e.clientX;
    let ly = e.clientY;
    let weg = 0;
    ref.current?.setPointerCapture(e.pointerId);
    const bewegen = (ev: PointerEvent) => {
      const dx = ev.clientX - lx;
      const dy = ev.clientY - ly;
      lx = ev.clientX;
      ly = ev.clientY;
      weg += Math.abs(dx) + Math.abs(dy);
      const ui = useUi.getState();
      ui.setzeKamera(verschiebe ? verschieben3d(ui.kamera, dx, dy, hoeheRef.current, FOV) : drehen(ui.kamera, dx, dy));
    };
    const loslassen = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', bewegen);
      window.removeEventListener('pointerup', loslassen);
      window.removeEventListener('pointercancel', loslassen);
      if (menueMoeglich && weg < 4) {
        useUi.getState().oeffneMenue({
          x: ev.clientX,
          y: ev.clientY,
          eintraege: [{ label: 'Ansicht zurücksetzen', aktion: () => useUi.getState().ansichtZuruecksetzen('creation') }],
        });
      }
    };
    window.addEventListener('pointermove', bewegen);
    window.addEventListener('pointerup', loslassen);
    window.addEventListener('pointercancel', loslassen);
  };

  return <div ref={ref} className="steuerung3d" onPointerDown={unten} onContextMenu={(e) => e.preventDefault()} onAuxClick={(e) => e.preventDefault()} />;
}
