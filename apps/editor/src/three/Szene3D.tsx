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
import { aktuellesNetz, kernAnimieren, kernBauen, useKernAnzeige } from '../kern/kernBau';
import { perlenVon, reifenAnzeigen, reifenFaerben, useReifen } from '../kern/reifen';
import { trefferDeuten } from '../kern/treffer';
import { PALETTEN } from './wesenLook';

declare global {
  interface Window {
    __editor?: { backend: string; vertices: () => number; treffen?: (px: number, py: number) => unknown; wesen?: () => unknown; reifenPixel?: () => unknown };
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
      window.__editor = {
        backend: r.backend,
        vertices: () => r.vertexAnzahl,
        // M2: Treffer in Feldpixeln (E2E): Käfigfläche, (u, v), Käfigpunkt
        treffen: (px: number, py: number) => {
          const n = aktuellesNetz();
          const h = r.treffen('creation', px, py);
          return h && n ? trefferDeuten(n.netz, h.dreieck, h.punkt, n.skalierung) : null;
        },
        // M3: Kennzahlen des zuletzt gebauten Netzes (E2E): Vorlage, Augen, Maul, Eckenzahl
        wesen: () => {
          const n = aktuellesNetz();
          if (!n) return null;
          const w = n.netz;
          return { vorlage: w.treffer?.vorlage ?? null, augen: w.augen, zaehne: w.zaehne !== null, lippenBand: w.lippenBand, ecken: w.positionen.length / 3, ableitung: w.info.ableitung, reifen: w.reifen ? { liste: w.reifen.liste, knoten: w.reifen.knoten } : null };
        },
        // M3: Perlen und Bänder der Reifen in Feldpixeln der Bühne (E2E)
        reifenPixel: () => {
          const n = aktuellesNetz();
          const rf = n?.netz.reifen;
          if (!n || !rf) return null;
          const perlen = perlenVon(n.netz, n.skalierung);
          const lagen = new Float32Array(perlen.length * 3);
          perlen.forEach((p, i) => lagen.set(p.pos, 3 * i));
          const pp = r.projizierenViele('creation', lagen);
          const verlauf = new Float32Array(rf.verlauf.length);
          for (let i = 0; i < verlauf.length; i++) verlauf[i] = rf.verlauf[i]! * n.skalierung;
          const vp = r.projizierenViele('creation', verlauf);
          const baender = rf.liste.map((_, i) => {
            const aus: [number, number][] = [];
            for (let k = rf.verlaufStart[i]! / 3; k < rf.verlaufStart[i + 1]! / 3; k += 16) if (vp[3 * k + 2]! > 0) aus.push([vp[3 * k]!, vp[3 * k + 1]!]);
            return aus;
          });
          return { perlen: perlen.map((p, i) => ({ reifen: p.reifen, spant: p.spant, knoten: p.knoten, j: p.j, px: pp[3 * i], py: pp[3 * i + 1], vorn: pp[3 * i + 2] })), baender };
        },
      };
      console.info(`[editor] 3D-Backend: ${r.backend}`);
      const versuch = versuchAktiv();
      if (versuch?.modus === 'tigerkaefig' || versuch?.modus === 'maul' || versuch?.modus === 'wirbel') {
        r.setzeKamera(useUi.getState().kamera);
        r.setzeZebra(useUi.getState().zebra);
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
      let klingenUhr: number | null = null;
      abmelden.push(() => {
        if (klingenUhr !== null) window.clearInterval(klingenUhr);
      });
      const bauen = (dRoh: Dokument, schnell = false) => {
        // Fressen-Tab mit eigener Seitenform (Versuch 12.10. nachts): Körper ohne Maul aus der Pose-Form; mit Maul legt
        // sich die offene Haut im Maul-Bau an sie
        const pose = dRoh.posenProfile?.fressen?.seite;
        const d: Dokument = useEditor.getState().modus === 'fressen' && !dRoh.maul && pose && pose.knoten.length === dRoh.profile.seite.knoten.length ? { ...dRoh, profile: { ...dRoh.profile, seite: pose } } : dRoh;
        if (!versuch && useUi.getState().bauweise === 'kern') {
          // Wesen-Editor 2: Käfig als Wahrheit, Seitenumriss als Griff; der Bau läuft im Worker (Phase 1 / M1), das
          // Ergebnis kommt zurück, der neueste Auftrag gewinnt
          kernBauen(d, schnell, (t) => {
          if (aus) return;
          const s = d.skalierung;
          if (s !== 1) for (let i = 0; i < t.positionen.length; i++) t.positionen[i]! *= s;
          if (t.kaefigLinien) {
            if (s !== 1) for (let i = 0; i < t.kaefigLinien.length; i++) t.kaefigLinien[i]! *= s;
            r.setzeLinien(t.kaefigLinien, t.kaefigFarben ?? undefined);
          } else r.setzeLinien(null);
          const augen = t.augen.map((a) => ({ ...a, pos: [a.pos[0] * s, a.pos[1] * s, a.pos[2] * s] as [number, number, number], groesse: a.groesse * s }));
          if (t.stil === 'feuer' || t.stil === 'gas') r.setzeFeuer(t.positionen, t.normalen, t.hoehe * s, [t.mitte[0] * s, t.mitte[1] * s, t.mitte[2] * s], t.stil, augen);
          else if (t.deskriptoren) {
            r.setzePalette(PALETTEN[useKernAnzeige.getState().palette] ?? PALETTEN.tiger!);
            const sk = (p: [number, number, number]): [number, number, number] => [p[0] * s, p[1] * s, p[2] * s];
            const gesicht = t.gesicht ? { ...t.gesicht, nase: sk(t.gesicht.nase), philtrumA: sk(t.gesicht.philtrumA), philtrumB: sk(t.gesicht.philtrumB), radius: t.gesicht.radius * s, hoehe: t.gesicht.hoehe * s, breite: t.gesicht.breite * s } : null;
            if (t.ruhe && s !== 1) for (let i = 0; i < t.ruhe.length; i++) t.ruhe[i]! *= s;
            r.setzeFell(t.stil === 'fell' ? 0.45 : 0, 0.055);
            r.setzeWesen(t.positionen, t.normalen, t.deskriptoren, t.hoehe * s, augen, t.lippenBand * s, t.ruhe, gesicht, t.atlas);
          } else r.setzeDreiecke(t.positionen, t.normalen);
          if (t.zaehne) {
            if (s !== 1) for (let i = 0; i < t.zaehne.positionen.length; i++) t.zaehne.positionen[i]! *= s;
            r.setzeZaehne(t.zaehne.positionen, t.zaehne.normalen, t.zaehne.anteil);
          } else r.setzeZaehne(null, null, null);
          // M3: Reifen (Spanten als Ringe mit Perlen) auf dem Körper
          reifenAnzeigen(r, t, s);
          // Beweis 5: Klingen wehen (Käfig-Pose je Bild, ≈ 14 Bilder je Sekunde)
          if (klingenUhr !== null) window.clearInterval(klingenUhr);
          klingenUhr = null;
          if (t.stil !== 'fest') {
            const start = performance.now();
            klingenUhr = window.setInterval(() => {
              kernAnimieren((performance.now() - start) / 1000, (a) => {
                if (a && !aus) r.aktualisiereNetz(a.positionen, a.normalen);
              });
            }, 70);
          }
          });
          return;
        }
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
      r.setzeZebra(useUi.getState().zebra);
      r.setzeRect(useRahmen.getState().rects?.creation ?? null);
      // Blätter (M2): Seite, Front, Top zeigen denselben Körper orthografisch hinter den Kurven (nur Bauweise „kern“)
      const blaetter = () => {
        const rects = useRahmen.getState().rects;
        const ui = useUi.getState();
        if (!rects || ui.bauweise !== 'kern') return r.setzeBlaetter({});
        r.setzeBlaetter({
          seite: { rect: rects.seite, ansicht: ui.ansichten.seite, blick: 'seite' },
          front: { rect: rects.front, ansicht: ui.ansichten.front, blick: ui.blick.front },
          top: { rect: rects.top, ansicht: ui.ansichten.top, blick: ui.blick.top },
        });
      };
      blaetter();
      abmelden.push(
        useRahmen.subscribe(blaetter),
        useUi.subscribe((s, v) => (s.ansichten !== v.ansichten || s.blick !== v.blick || s.bauweise !== v.bauweise) && blaetter()),
      );
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
            s.dok.ausstattung !== v.dok.ausstattung ||
            s.modus !== v.modus;
          const wirbel = useUi.getState().bauweise === 'wirbel';
          const schnitte = useUi.getState().bauweise === 'schnitte' || useUi.getState().bauweise === 'rund' || useUi.getState().bauweise === 'kern';
          // mit Maul dauert der Bau ≈ 0,4 s: während einer Geste nicht neu bauen, sondern beim Loslassen (Schnitte ohne Maul)
          if (s.dok.maul && s.gesteStart && !schnitte) return;
          // Kanten-Käfig, Wirbelsäule und Schnitte: während einer Geste schnell (gröber), beim Loslassen genau
          if (geaendert) bauen(s.dok, !!s.gesteStart && (wirbel || schnitte || mitKanten(s.dok)));
          else if (v.gesteStart && !s.gesteStart && (wirbel || schnitte || s.dok.maul || mitKanten(s.dok))) bauen(s.dok);
        }),
        useUi.subscribe((s, v) => {
          if (s.kamera !== v.kamera) r.setzeKamera(s.kamera);
          if (s.zebra !== v.zebra) r.setzeZebra(s.zebra);
          if (s.oeffnung !== v.oeffnung && (useEditor.getState().dok.maul || (s.bauweise === 'kern' && useKernAnzeige.getState().maul !== 'aus'))) bauen(useEditor.getState().dok);
          if (s.bauweise !== v.bauweise) bauen(useEditor.getState().dok);
          if ((s.schnittRegel !== v.schnittRegel || s.schnittUeberblenden !== v.schnittUeberblenden) && s.bauweise === 'schnitte') bauen(useEditor.getState().dok);
          if (s.wirbelBiegung !== v.wirbelBiegung && s.bauweise === 'wirbel') bauen(useEditor.getState().dok, !!useEditor.getState().gesteStart || useWirbelAnzeige.getState().zieht);
          if (s.kantenAuswahl !== v.kantenAuswahl) verlauf();
          if (s.spantAuswahl !== v.spantAuswahl || s.ebene !== v.ebene) reifenFaerben(r);
        }),
        useRahmen.subscribe((s) => r.setzeRect(s.rects?.creation ?? null)),
        // M3: Perle oder Band unter dem Zeiger → Farben der Reifen
        useReifen.subscribe(() => reifenFaerben(r)),
        // Beweis 4: Look oder Palette gewechselt → Kern neu bauen
        useKernAnzeige.subscribe((s, v) => (s.look !== v.look || s.palette !== v.palette || s.maul !== v.maul || s.kaefig !== v.kaefig || s.beine !== v.beine || s.schwung !== v.schwung || s.stil !== v.stil) && useUi.getState().bauweise === 'kern' && bauen(useEditor.getState().dok)),
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
