import { type Dokument, loftNetz } from '@ee/shape';
import { useEffect, useRef } from 'react';
import { useRahmen } from '../layout/animation';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { Renderer3D } from './Renderer3D';
import { szene } from './instanz';
import { versuchAktiv, versuchNetz } from '../versuch/subdivision';
import { tigerSchritt } from '../versuch/tigerSchritte';
import { maulVersuch } from '../versuch/maulVersuch';
import { maulBauen, maulDreiecke } from '../maul/maulKoerper';
import { zahnListe, zahnMeldungen } from '../maul/zahnKoerper';
import { kantenBauen, kantenDreiecke, kantenVerlauf, mitKanten } from '../kanten/kantenKoerper';

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
      if (versuch?.modus === 'tigerkaefig' || versuch?.modus === 'maul') {
        r.setzeKamera(useUi.getState().kamera);
        r.setzeRect(useRahmen.getState().rects?.creation ?? null);
        abmelden.push(
          useUi.subscribe((s, v) => s.kamera !== v.kamera && r.setzeKamera(s.kamera)),
          useRahmen.subscribe((s) => r.setzeRect(s.rects?.creation ?? null)),
        );
        if (versuch.modus === 'maul') void maulVersuch(versuch, () => r);
        else void tigerSchritt(versuch.schritt, () => r);
        return;
      }
      /** Gewählte Kantenlinie im 3D nachzeichnen (türkis, immer sichtbar). */
      const verlauf = () => {
        const d = useEditor.getState().dok;
        const a = useUi.getState().kantenAuswahl;
        if (!a || d.maul || !mitKanten(d) || versuch) return r.setzeLinien(null);
        const seg = kantenVerlauf(kantenBauen(d), a.kante);
        if (!seg) return r.setzeLinien(null);
        if (d.skalierung !== 1) for (let i = 0; i < seg.length; i++) seg[i]! *= d.skalierung;
        const farben = new Float32Array(seg.length);
        for (let i = 0; i < farben.length; i += 3) farben.set([0, 1, 0.88], i);
        r.setzeLinien(seg, farben);
      };
      const bauen = (d: Dokument, schnell = false) => {
        if (!d.maul && !versuch && mitKanten(d)) {
          // Versuch 12.10.: Kanten im Käfig (Linien und Ecken der Silhouetten), Shapes → Loft → Käfig
          const t = kantenDreiecke(kantenBauen(d, schnell));
          const s = d.skalierung;
          if (s !== 1) for (let i = 0; i < t.positionen.length; i++) t.positionen[i]! *= s;
          r.setzeDreiecke(t.positionen, t.normalen);
          verlauf();
          return;
        }
        r.setzeLinien(null);
        if (d.maul) {
          // Versuch 12.10.: Körper mit Maul (Käfig, Naht, Tasche), Öffnung aus der Seitenleiste
          const b = maulBauen(d);
          if (b) {
            // Zähne, die geschlossen stören, rot (Prüfung des Zahn-Versuchs, gemerkt je Käfig und Zahnreihen)
            const rot = new Set(d.zaehne ? zahnMeldungen(b.mk, b.zu, d.zaehne).flatMap((m) => m.listenIndizes) : []);
            const t = maulDreiecke(b, useUi.getState().oeffnung, 3, zahnListe(d.zaehne).map((q) => q.zahn), rot);
            const s = d.skalierung;
            if (s !== 1) for (let i = 0; i < t.positionen.length; i++) t.positionen[i]! *= s;
            r.setzeDreiecke(t.positionen, t.normalen, t.farben);
            return;
          }
        }
        if (!versuch || versuch.modus !== 'subd') return r.setzeNetz(loftNetz(d));
        const n = versuchNetz(d, versuch.fall);
        r.setzeDreiecke(n.positionen, n.normalen);
      };
      bauen(useEditor.getState().dok);
      r.setzeKamera(useUi.getState().kamera);
      r.setzeRect(useRahmen.getState().rects?.creation ?? null);
      abmelden.push(
        useEditor.subscribe((s, v) => {
          const geaendert =
            s.dok.profile !== v.dok.profile ||
            s.dok.skalierung !== v.dok.skalierung ||
            s.dok.maul !== v.dok.maul ||
            s.dok.zaehne !== v.dok.zaehne ||
            s.dok.kanten !== v.dok.kanten ||
            s.dok.spanten !== v.dok.spanten ||
            s.dok.hauptspant !== v.dok.hauptspant;
          // mit Maul dauert der Bau ≈ 0,4 s: während einer Geste nicht neu bauen, sondern beim Loslassen
          if (s.dok.maul && s.gesteStart) return;
          // Kanten-Käfig: während einer Geste schnell (weniger Anpass-Durchgänge), beim Loslassen genau
          if (geaendert) bauen(s.dok, !!s.gesteStart && mitKanten(s.dok));
          else if (v.gesteStart && !s.gesteStart && (s.dok.maul || mitKanten(s.dok))) bauen(s.dok);
        }),
        useUi.subscribe((s, v) => {
          if (s.kamera !== v.kamera) r.setzeKamera(s.kamera);
          if (s.zebra !== v.zebra) r.setzeZebra(s.zebra);
          if (s.oeffnung !== v.oeffnung && useEditor.getState().dok.maul) bauen(useEditor.getState().dok);
          if (s.kantenAuswahl !== v.kantenAuswahl) verlauf();
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
