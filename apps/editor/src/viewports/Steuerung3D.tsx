import { useEffect, useRef } from 'react';
import { aktuellesNetz, werkzeugGesperrt } from '../kern/kernBau';
import { augeZeiger, augenRandUnter, kieferUnter, kieferZeiger } from '../kern/griffe';
import { knochen3dSchweben, knochen3dZeiger } from '../kiefer/knochen3d';
import { pinselRing, pinselStufe, pinselZeiger } from '../kern/pinsel';
import { zahnUnter, zahnZeiger } from '../kern/zahnGriffe';
import { reifenNeu, reifenUnter, reifenZeiger, useReifen } from '../kern/reifen';
import { schleifenSchweben, schleifenZeiger } from '../kern/schleifenAuswahl';
import { trefferDeuten, useTreffer } from '../kern/treffer';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { drehen, verschieben3d, zoomen } from '../three/kamera';
import { FOV } from '../three/Renderer3D';
import { szene } from '../three/instanz';
import { istTrackpad, radFaktor } from './ansicht2d';
import { wirksameAugen } from '../leiste/AugenFeld';

/**
 * Auge setzen (Stufe „Augen“; M3, Phase 2 M5): Klick auf den Körper → Punkt der Ruhelage am Treffer (baryzentrisch im
 * getroffenen Dreieck, in Profileinheiten; mit „Mitte“ auf die Naht) in die Ausstattung, dazu Ring und Winkel des nächsten
 * Vorlagen-Ringpunkts (rechts gespiegelt), wenn es einer ist. Form, Größe und die übrigen Werte bleiben.
 */
export function augeSetzen(px: number, py: number): boolean {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  if (!r || !n || useUi.getState().bauweise !== 'kern') return false;
  // B7: während einer Vorschau beendet der Klick nur sie (der Treffer läge auf dem Körper der Vorschau)
  if (werkzeugGesperrt()) return false;
  const h = r.treffen('creation', px, py);
  if (!h) return false;
  const w = n.netz;
  const t = trefferDeuten(w, h.dreieck, h.punkt, n.skalierung);
  const tr = w.treffer;
  const ed = useEditor.getState();
  const alt = wirksameAugen(ed.dok);
  // Punkt der Ruhelage: baryzentrisch im getroffenen Dreieck der Pose, angewandt auf dasselbe Dreieck der Ruhelage
  const P = w.positionen;
  const R = w.ruhe ?? w.positionen;
  const o = 9 * h.dreieck;
  const ecke = (A: Float32Array, k: number): [number, number, number] => [A[o + 3 * k]!, A[o + 3 * k + 1]!, A[o + 3 * k + 2]!];
  const [a0, a1, a2] = [ecke(P, 0), ecke(P, 1), ecke(P, 2)];
  const v0 = [a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]];
  const v1 = [a2[0] - a0[0], a2[1] - a0[1], a2[2] - a0[2]];
  const v2 = [h.punkt[0] - a0[0], h.punkt[1] - a0[1], h.punkt[2] - a0[2]];
  const dp = (x: number[], y: number[]) => x[0]! * y[0]! + x[1]! * y[1]! + x[2]! * y[2]!;
  const d00 = dp(v0, v0);
  const d01 = dp(v0, v1);
  const d11 = dp(v1, v1);
  const d20 = dp(v2, v0);
  const d21 = dp(v2, v1);
  const nenner = d00 * d11 - d01 * d01 || 1;
  const bv = (d11 * d20 - d01 * d21) / nenner;
  const bw = (d00 * d21 - d01 * d20) / nenner;
  const bu = 1 - bv - bw;
  const [r0, r1, r2] = [ecke(R, 0), ecke(R, 1), ecke(R, 2)];
  const s = n.skalierung || 1;
  const punkt: [number, number, number] = [0, 1, 2].map((k) => (bu * r0[k]! + bv * r1[k]! + bw * r2[k]!) / s) as [number, number, number];
  if (alt.mitte) punkt[2] = 0;
  // Ring und Winkel, wenn der nächste Käfigpunkt ein Vorlagen-Ringpunkt ist (sonst bleiben die alten)
  let ring = alt.ring;
  let j = alt.j;
  if (t && tr && t.kaefigPunkt >= 0 && t.kaefigPunkt < tr.vorlage.R * tr.vorlage.N) {
    const { N } = tr.vorlage;
    ring = Math.floor(t.kaefigPunkt / N);
    j = t.kaefigPunkt % N;
    if (j > N / 2) j = N - j;
    j = Math.max(1, Math.min(N / 2 - 1, j));
  }
  ed.setzeDokument({ ...ed.dok, ausstattung: { ...(ed.dok.ausstattung ?? {}), augen: { ...alt, ring, j, punkt } } });
  return true;
}

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
    // M3: Griffe auf der Bühne (Bauweise kern): Kieferknopf, Augenrand (Stufe Augen), Reifen (Stufe Körper: Perle,
    // Band, ⌥ = Ecke)
    // Pinsel (M3): G ziehen, I aufblasen, ⇧ dabei glättet — auf dem Körper, Stufe Körper; in Fressen und den weiteren
    // Posen auch in „Posen & Leben“ (Florian 15.10.: dort formt man den Blendshape samt Knochen)
    if (knopf === 0 && !e.ctrlKey && ref.current && useUi.getState().bauweise === 'kern' && pinselStufe() && (useUi.getState().werkzeug === 'ziehen' || useUi.getState().werkzeug === 'aufblasen')) {
      if (useUi.getState().ebene === 'posen' && useEditor.getState().modus === 'editor') {
        useUi.getState().zeigeHinweis('Pinsel in „Posen & Leben“ formt eine Pose: erst Fressen (oder eine weitere Pose) wählen');
        return;
      }
      const rr = ref.current.getBoundingClientRect();
      if (pinselZeiger(e, e.clientX - rr.left, e.clientY - rr.top, ref.current)) return;
    }
    if (knopf === 0 && !e.ctrlKey && !e.shiftKey && ref.current && useUi.getState().bauweise === 'kern' && useUi.getState().werkzeug === 'auswahl') {
      const rr = ref.current.getBoundingClientRect();
      const px = e.clientX - rr.left;
      const py = e.clientY - rr.top;
      const ebene = useUi.getState().ebene;
      // Rig und Fressen-Pose (Plan 5.2): Gelenk und Knochen auf der Bühne greifen
      if (ebene === 'posen' && knochen3dZeiger(e, px, py, ref.current)) return;
      if (kieferZeiger(e, px, py, ref.current)) return;
      if (ebene === 'augen' && augeZeiger(e, px, py, ref.current)) return;
      // V6.3: ⌥-Klick auf einen Loop wählt ihn (vor den Reifen: ⌥ auf einer Perle schaltet dort die Ecke)
      if (ebene === 'form' && e.altKey && schleifenZeiger(e, px, py)) return;
      if (ebene === 'form' && reifenZeiger(e, px, py, ref.current)) return;
      // Stufe Zähne (Phase 2 M4): Zahn wählen, längs des Zahnfleischs ziehen
      if (ebene === 'zaehne' && zahnZeiger(e, px, py, ref.current)) return;
    }
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
      // Werkzeug S (M3): Klick ohne Bewegung auf den Körper setzt einen Reifen an der Stelle
      if (knopf === 0 && !e.ctrlKey && weg < 4 && useUi.getState().werkzeug === 'spant' && useUi.getState().bauweise === 'kern') {
        const rr = ref.current?.getBoundingClientRect();
        if (rr && reifenNeu(ev.clientX - rr.left, ev.clientY - rr.top)) useUi.getState().setzeWerkzeug('auswahl');
        return;
      }
      // Stufe „Zähne“: Klick ohne Bewegung neben die Zähne hebt die Auswahl auf
      if (knopf === 0 && !e.ctrlKey && weg < 4 && useUi.getState().ebene === 'zaehne' && useUi.getState().bauweise === 'kern') {
        useUi.getState().setzeZahnAuswahl(null);
        return;
      }
      // Stufe „Augen“ (M3): Klick ohne Bewegung setzt das Auge an den Trefferpunkt
      if (knopf === 0 && !e.ctrlKey && weg < 4 && useUi.getState().ebene === 'augen') {
        const rr = ref.current?.getBoundingClientRect();
        if (rr) augeSetzen(ev.clientX - rr.left, ev.clientY - rr.top);
        return;
      }
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
    // M3: Perle oder Band unter dem Zeiger (nur Stufe Körper)
    const ui = useUi.getState();
    const h = ui.ebene === 'form' && ui.bauweise === 'kern' ? reifenUnter(e.clientX - r.left, e.clientY - r.top) : null;
    const alt = useReifen.getState().hover;
    if ((h?.reifen ?? -1) !== (alt?.reifen ?? -1) || (h?.knoten ?? -2) !== (alt?.knoten ?? -2)) useReifen.setState({ hover: h });
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    pinselRing(px, py);
    // V6.3: Loop unter dem Zeiger (pink)
    const schleife = ui.ebene === 'form' && ui.bauweise === 'kern' && schleifenSchweben(px, py);
    const kiefer = ui.bauweise === 'kern' && kieferUnter(px, py);
    const auge = ui.bauweise === 'kern' && ui.ebene === 'augen' && augenRandUnter(px, py);
    const knochen = ui.bauweise === 'kern' && knochen3dSchweben(px, py);
    const zahn = ui.bauweise === 'kern' && ui.ebene === 'zaehne' && !kiefer && zahnUnter(px, py);
    if (ref.current) ref.current.style.cursor = knochen ? 'grab' : kiefer ? 'ns-resize' : auge ? 'nwse-resize' : zahn ? 'grab' : h ? (h.knoten === null ? 'ew-resize' : 'pointer') : schleife ? 'pointer' : '';
  };
  const verlassen = () => {
    szene.aktuell?.setzeMarke(null);
    useTreffer.setState({ treffer: null, feld: null });
    if (useReifen.getState().hover) useReifen.setState({ hover: null });
    szene.aktuell?.setzeRadiusRing(null);
    if (ref.current) ref.current.style.cursor = '';
  };
  return <div ref={ref} className="steuerung3d" onPointerDown={unten} onPointerMove={schweben} onPointerLeave={verlassen} onContextMenu={(e) => e.preventDefault()} onAuxClick={(e) => e.preventDefault()} />;
}
