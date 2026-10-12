import { type Dokument, loftNetz } from '@ee/shape';
import { useEffect, useRef } from 'react';
import { useRahmen } from '../layout/animation';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { Renderer3D } from './Renderer3D';
import { szene } from './instanz';
import { versuchAktiv, versuchNetz } from '../versuch/subdivision';
import { tigerSchritt } from '../versuch/tigerSchritte';

declare global {
  interface Window {
    __editor?: { backend: string; vertices: () => number };
  }
}

/** Vollfenster-Canvas zwischen Viewport-Grund und Viewport-Oberfläche (pointer-events: none). */
export function Szene3D() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const r = new Renderer3D(canvas);
    let aus = false;
    const abmelden: (() => void)[] = [];
    void r.init().then(() => {
      if (aus) return;
      szene.aktuell = r;
      window.__editor = { backend: r.backend, vertices: () => r.vertexAnzahl };
      console.info(`[editor] 3D-Backend: ${r.backend}`);
      const versuch = versuchAktiv();
      if (versuch?.modus === 'tigerkaefig') {
        r.setzeKamera(useUi.getState().kamera);
        r.setzeRect(useRahmen.getState().rects?.creation ?? null);
        abmelden.push(
          useUi.subscribe((s, v) => s.kamera !== v.kamera && r.setzeKamera(s.kamera)),
          useRahmen.subscribe((s) => r.setzeRect(s.rects?.creation ?? null)),
        );
        void tigerSchritt(versuch.schritt, () => r);
        return;
      }
      const bauen = (d: Dokument) => {
        if (!versuch || versuch.modus !== 'subd') return r.setzeNetz(loftNetz(d));
        const n = versuchNetz(d, versuch.fall);
        r.setzeDreiecke(n.positionen, n.normalen);
      };
      bauen(useEditor.getState().dok);
      r.setzeKamera(useUi.getState().kamera);
      r.setzeRect(useRahmen.getState().rects?.creation ?? null);
      abmelden.push(
        useEditor.subscribe((s, v) => {
          if (s.dok.profile !== v.dok.profile || s.dok.skalierung !== v.dok.skalierung) bauen(s.dok);
        }),
        useUi.subscribe((s, v) => {
          if (s.kamera !== v.kamera) r.setzeKamera(s.kamera);
        }),
        useRahmen.subscribe((s) => r.setzeRect(s.rects?.creation ?? null)),
      );
      const groesse = () => r.groesseAnpassen();
      window.addEventListener('resize', groesse);
      abmelden.push(() => window.removeEventListener('resize', groesse));
    });
    return () => {
      aus = true;
      abmelden.forEach((f) => f());
      if (szene.aktuell === r) szene.aktuell = null;
      r.renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} className="szene3d" />;
}
