import { useEffect, useRef } from 'react';
import { aktuellesNetz } from '../kern/kernBau';
import { trefferDeuten, useTreffer } from '../kern/treffer';
import { useUi } from '../state/uiStore';
import { drehen, verschieben3d, zoomen } from '../three/kamera';
import { FOV } from '../three/Renderer3D';
import { szene } from '../three/instanz';
import { istTrackpad, radFaktor } from './ansicht2d';

/** Treffer unter dem Zeiger auf der Bühne (M2): Strahl → Dreieck → Käfigfläche; Marke am Trefferpunkt. */
export function treffenAuf(feld: 'creation', px: number, py: number): void {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  if (!r || !n || useUi.getState().bauweise !== 'kern') return;
  const h = r.treffen(feld, px, py);
  const t = h ? trefferDeuten(n.netz, h.dreieck, h.punkt, n.skalierung) : null;
  r.setzeMarke(t ? t.punkt : null, n.netz.hoehe * n.skalierung);
  useTreffer.setState({ treffer: t, feld: t ? feld : null });
}

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

  // Hover (M2): Treffer unter dem Zeiger, nur ohne gedrückte Taste (beim Drehen bleibt die Marke stehen)
  const schweben = (e: React.PointerEvent) => {
    if (e.buttons !== 0) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    treffenAuf('creation', e.clientX - r.left, e.clientY - r.top);
  };
  const verlassen = () => {
    szene.aktuell?.setzeMarke(null);
    useTreffer.setState({ treffer: null, feld: null });
  };
  return <div ref={ref} className="steuerung3d" onPointerDown={unten} onPointerMove={schweben} onPointerLeave={verlassen} onContextMenu={(e) => e.preventDefault()} onAuxClick={(e) => e.preventDefault()} />;
}
