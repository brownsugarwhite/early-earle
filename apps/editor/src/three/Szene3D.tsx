import { type Dokument, loftNetz } from '@ee/shape';
import { abtasten3, unterteilenMehrfach, zuDreiecken } from '@ee/shape/versuch';
import { useEffect, useRef } from 'react';
import { useRahmen } from '../layout/animation';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { Renderer3D } from './Renderer3D';
import { szene } from './instanz';
import { versuchAktiv, versuchNetz } from '../versuch/subdivision';
import { tigerSchritt } from '../versuch/tigerSchritte';
import { maulVersuch } from '../versuch/maulVersuch';
import { wirbelVersuch } from '../versuch/wirbelVersuch';
import { maulBauen, maulDreiecke } from '../maul/maulKoerper';
import { zahnListe, zahnMeldungen } from '../maul/zahnKoerper';
import { kantenBauen, kantenDreiecke, kantenVerlauf, mitKanten } from '../kanten/kantenKoerper';
import { maulUmrisseSetzen, useWirbelAnzeige, wirbelBauen } from '../wirbel/wirbelKoerper';
import { schnittBauen } from '../schnitte/schnittKoerper';
import { rundBauen } from '../rund/rundBau';

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
      if (versuch?.modus === 'tigerkaefig' || versuch?.modus === 'maul' || versuch?.modus === 'wirbel') {
        r.setzeKamera(useUi.getState().kamera);
        r.setzeRect(useRahmen.getState().rects?.creation ?? null);
        abmelden.push(
          useUi.subscribe((s, v) => s.kamera !== v.kamera && r.setzeKamera(s.kamera)),
          useRahmen.subscribe((s) => r.setzeRect(s.rects?.creation ?? null)),
        );
        if (versuch.modus === 'maul') void maulVersuch(versuch, () => r);
        else if (versuch.modus === 'wirbel') void wirbelVersuch(versuch, () => r);
        else void tigerSchritt(versuch.schritt, () => r);
        return;
      }
      /** Gewählte Kantenlinie im 3D nachzeichnen (türkis, immer sichtbar). */
      const verlauf = () => {
        const d = useEditor.getState().dok;
        const a = useUi.getState().kantenAuswahl;
        if (!a || d.maul || !mitKanten(d) || versuch || useUi.getState().bauweise !== 'bisher') return r.setzeLinien(null);
        const seg = kantenVerlauf(kantenBauen(d), a.kante);
        if (!seg) return r.setzeLinien(null);
        if (d.skalierung !== 1) for (let i = 0; i < seg.length; i++) seg[i]! *= d.skalierung;
        const farben = new Float32Array(seg.length);
        for (let i = 0; i < farben.length; i += 3) farben.set([0, 1, 0.88], i);
        r.setzeLinien(seg, farben);
      };
      const bauen = (dRoh: Dokument, schnell = false) => {
        // Fressen-Tab mit eigener Seitenform (Versuch 12.10. nachts): Körper ohne Maul aus der Pose-Form; mit Maul legt
        // sich die offene Haut im Maul-Bau an sie
        const pose = dRoh.posenProfile?.fressen?.seite;
        const d: Dokument = useEditor.getState().modus === 'fressen' && !dRoh.maul && pose && pose.knoten.length === dRoh.profile.seite.knoten.length ? { ...dRoh, profile: { ...dRoh.profile, seite: pose } } : dRoh;
        if (!versuch && useUi.getState().bauweise === 'rund') {
          // Versuch 13.10. nachmittags: Seite rund aufgeblasen, Breite aus Top und Front; Maul und Kanten fehlen hier noch
          const rk = rundBauen(d, schnell);
          const k = d.skalierung;
          r.setzeFlaeche(k !== 1 ? rk.positionen.map((v) => v * k) : rk.positionen, rk.normalen, rk.indizes);
          // Kantenlinien auf der runden Fläche (beide Seiten), türkis; leicht über der Fläche, verdeckte Teile ausgeblendet
          const seg: number[] = [];
          for (const kante of d.kanten ?? []) {
            const pts = abtasten3(kante, 16);
            for (const seite of [1, -1]) {
              for (let i = 0; i + 1 < pts.length; i++) {
                const a = pts[i]!;
                const b = pts[i + 1]!;
                const za = rk.dickeBei({ x: a[0], y: a[1] }) + 0.002;
                const zb = rk.dickeBei({ x: b[0], y: b[1] }) + 0.002;
                seg.push(a[0] * k, a[1] * k, seite * za * k, b[0] * k, b[1] * k, seite * zb * k);
              }
            }
          }
          if (seg.length) {
            const farben = new Float32Array(seg.length);
            for (let i = 0; i < farben.length; i += 3) farben.set([0, 1, 0.88], i);
            r.setzeLinien(Float32Array.from(seg), farben, true);
          } else r.setzeLinien(null);
          return;
        }
        if (!versuch && useUi.getState().bauweise === 'schnitte') {
          // Versuch 13.10.: echte Schnitte (Schnauze über Bauch, Acht, Haken im Top); Maul und Kanten-Härte fehlen hier noch
          const sl = schnittBauen(d, schnell, useUi.getState().schnittRegel, useUi.getState().schnittUeberblenden);
          const k = d.skalierung;
          r.setzeLinien(null);
          r.setzeFlaeche(k !== 1 ? sl.positionen.map((v) => v * k) : sl.positionen, sl.normalen, sl.indizes);
          return;
        }
        if (!versuch && useUi.getState().bauweise === 'wirbel' && d.maul) {
          // Versuch 12.10. nachts: Maul auf der Wirbelsäule (Maul-Käfig im gestreckten Raum)
          const b = maulBauen(d, true);
          if (b) {
            const rot = new Set(d.zaehne ? zahnMeldungen(b.mk, b.zu, d.zaehne).flatMap((m) => m.listenIndizes) : []);
            const t = maulDreiecke(b, useUi.getState().oeffnung, 3, zahnListe(d.zaehne).map((q) => q.zahn), rot);
            const s = d.skalierung;
            if (s !== 1) for (let i = 0; i < t.positionen.length; i++) t.positionen[i]! *= s;
            r.setzeLinien(null);
            r.setzeDreiecke(t.positionen, t.normalen, t.farben);
            // Wirbelsäule und Sprossen in der Seite bleiben sichtbar; gestrichelt der Umriss mit Maul (nur Haut)
            wirbelBauen(d, true, useUi.getState().wirbelBiegung);
            if (!schnell) maulUmrisseSetzen(b.mk, t.kaefig, useUi.getState().oeffnung);
            return;
          }
        }
        if (!versuch && useUi.getState().bauweise === 'wirbel') {
          // Versuch 12.10. abends: Wirbelsäule zum Vergleichen (Tab am 3D-Fenster); Kanten-Härte fehlt hier noch
          const t = zuDreiecken(unterteilenMehrfach(wirbelBauen(d, schnell, useUi.getState().wirbelBiegung), schnell ? 2 : 3), 40);
          const s = d.skalierung;
          if (s !== 1) for (let i = 0; i < t.positionen.length; i++) t.positionen[i]! *= s;
          r.setzeLinien(null);
          r.setzeDreiecke(t.positionen, t.normalen);
          return;
        }
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
            s.dok.hauptspant !== v.dok.hauptspant ||
            s.dok.wirbelsaeule !== v.dok.wirbelsaeule ||
            s.dok.posenProfile !== v.dok.posenProfile ||
            s.dok.rundSpanten !== v.dok.rundSpanten ||
            s.modus !== v.modus;
          const wirbel = useUi.getState().bauweise === 'wirbel';
          const schnitte = useUi.getState().bauweise === 'schnitte' || useUi.getState().bauweise === 'rund';
          // mit Maul dauert der Bau ≈ 0,4 s: während einer Geste nicht neu bauen, sondern beim Loslassen (Schnitte ohne Maul)
          if (s.dok.maul && s.gesteStart && !schnitte) return;
          // Kanten-Käfig, Wirbelsäule und Schnitte: während einer Geste schnell (gröber), beim Loslassen genau
          if (geaendert) bauen(s.dok, !!s.gesteStart && (wirbel || schnitte || mitKanten(s.dok)));
          else if (v.gesteStart && !s.gesteStart && (wirbel || schnitte || s.dok.maul || mitKanten(s.dok))) bauen(s.dok);
        }),
        useUi.subscribe((s, v) => {
          if (s.kamera !== v.kamera) r.setzeKamera(s.kamera);
          if (s.zebra !== v.zebra) r.setzeZebra(s.zebra);
          if (s.oeffnung !== v.oeffnung && useEditor.getState().dok.maul) bauen(useEditor.getState().dok);
          if (s.bauweise !== v.bauweise) bauen(useEditor.getState().dok);
          if ((s.schnittRegel !== v.schnittRegel || s.schnittUeberblenden !== v.schnittUeberblenden) && s.bauweise === 'schnitte') bauen(useEditor.getState().dok);
          if (s.wirbelBiegung !== v.wirbelBiegung && s.bauweise === 'wirbel') bauen(useEditor.getState().dok, !!useEditor.getState().gesteStart || useWirbelAnzeige.getState().zieht);
          if (s.kantenAuswahl !== v.kantenAuswahl) verlauf();
        }),
        useRahmen.subscribe((s) => r.setzeRect(s.rects?.creation ?? null)),
        // Biege-Regler losgelassen: genau bauen
        useWirbelAnzeige.subscribe((s, v) => v.zieht && !s.zieht && useUi.getState().bauweise === 'wirbel' && bauen(useEditor.getState().dok)),
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
