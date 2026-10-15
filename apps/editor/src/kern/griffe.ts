// Phase 1 / M3: Griffe am Körper — Kieferknopf (Plan 9.6: bohnenförmiger Griff am Mundwinkel, ziehen öffnet 0 … 100 %,
// Doppelklick rastet) und Augenrand (Stufe Augen: am Rand des Auges ziehen = Größe). Beide leben im Hauptthread aus dem
// zuletzt gebauten Netz; die Öffnung ist eine Pose (`ui.oeffnung`, ≈ 3 ms), die Augengröße steht in der Ausstattung.

import { pruefwesenBauplan } from '@ee/shape/kern';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import type { Renderer3D } from '../three/Renderer3D';
import { szene } from '../three/instanz';
import { aktuellesNetz } from './kernBau';

type V3 = [number, number, number];
const FANG_KIEFER = 14;
const AUGE_RAND = 6;

/** Kieferknopf anzeigen (Maul vorhanden, Stufen Körper/Maul/Zähne) oder ausblenden. */
export function griffeAnzeigen(r: Renderer3D): void {
  const n = aktuellesNetz();
  const ui = useUi.getState();
  const m = n?.netz.maul;
  if (!n || !m || ui.bauweise !== 'kern' || (ui.ebene !== 'form' && ui.ebene !== 'maul' && ui.ebene !== 'zaehne')) return r.setzeKiefer(null);
  const sk = n.skalierung;
  r.setzeKiefer([m.winkel[0] * sk, m.winkel[1] * sk, m.winkel[2] * sk], n.netz.hoehe * sk);
}

/** Kieferknopf in Feldpixeln der Bühne (rechter Mundwinkel), dazu die Maullänge in Pixeln; null ohne Maul. */
export function kieferPixel(): { px: number; py: number; laengePx: number } | null {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  const m = n?.netz.maul;
  if (!r || !n || !m) return null;
  const sk = n.skalierung;
  const p = r.projizierenViele('creation', Float32Array.from([m.winkel[0] * sk, m.winkel[1] * sk, m.winkel[2] * sk, m.winkel[0] * sk, m.winkel[1] * sk + m.laenge * sk, m.winkel[2] * sk]));
  if (p[2]! <= 0) return null;
  return { px: p[0]!, py: p[1]!, laengePx: Math.max(20, Math.hypot(p[3]! - p[0]!, p[4]! - p[1]!)) };
}

export function kieferUnter(px: number, py: number): boolean {
  const k = kieferPixel();
  return !!k && Math.hypot(k.px - px, k.py - py) < FANG_KIEFER;
}

function ziehen(e: React.PointerEvent, el: HTMLElement, bewegen: (ev: PointerEvent) => void, ende: () => void): void {
  el.setPointerCapture(e.pointerId);
  const auf = () => {
    window.removeEventListener('pointermove', bewegen);
    window.removeEventListener('pointerup', auf);
    window.removeEventListener('pointercancel', auf);
    ende();
  };
  window.addEventListener('pointermove', bewegen);
  window.addEventListener('pointerup', auf);
  window.addEventListener('pointercancel', auf);
}

/** letzter Klick auf den Kieferknopf (Zeit, Ort): Doppelklick erkennen (Pointer-Ereignisse zählen keine Klicks) */
let letzterKlick: { t: number; x: number; y: number } | null = null;

/** Kieferknopf fassen: Ziehen nach unten öffnet (Maullänge = 100 %), Doppelklick rastet auf 100 % bzw. 0 %. */
export function kieferZeiger(e: React.PointerEvent, px: number, py: number, el: HTMLElement): boolean {
  const k = kieferPixel();
  if (!k || Math.hypot(k.px - px, k.py - py) >= FANG_KIEFER) return false;
  const ui = useUi.getState();
  const jetzt = performance.now();
  if (letzterKlick && jetzt - letzterKlick.t < 400 && Math.hypot(letzterKlick.x - e.clientX, letzterKlick.y - e.clientY) < 6) {
    letzterKlick = null;
    // Doppelklick wechselt Editor ↔ Fressen (B1): der Editor-Tab zeigt immer die Grundform
    const ed = useEditor.getState();
    ed.setzeZiel(ed.modus === 'fressen' ? 'editor' : 'fressen');
    el.setPointerCapture(e.pointerId);
    return true;
  }
  letzterKlick = { t: jetzt, x: e.clientX, y: e.clientY };
  const start = ui.oeffnung;
  const y0 = e.clientY;
  ziehen(
    e,
    el,
    (ev) => {
      if (Math.abs(ev.clientY - y0) > 3) letzterKlick = null;
      useUi.getState().setzeOeffnung(start + (ev.clientY - y0) / k.laengePx);
    },
    () => undefined,
  );
  return true;
}

/**
 * Augen in Feldpixeln: Mitte und Radius je Auge (rechts zuerst), an der posierten Stelle (offenes Maul: das Auge sitzt mit
 * dem Schädel höher); der Radius ist die halbe Größe = Rand der gemalten Form bzw. der Augenkugel (Mitte um die Tiefe
 * längs der Normalen versetzt).
 */
export function augenPixel(): { px: number; py: number; radius: number; vorn: boolean }[] {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  if (!r || !n) return [];
  const sk = n.skalierung;
  return n.netz.augen.map((a) => {
    const R = a.groesse / 2;
    const v = a.art === 'glubsch' || a.art === 'augapfel' ? R * (1 - 2 * a.tiefe) : 0;
    const q = a.posiert.pos.map((x, k) => (x + a.posiert.normale[k]! * v) * sk);
    const p = r.projizierenViele('creation', Float32Array.from([q[0]!, q[1]!, q[2]!, q[0]!, q[1]! + R * sk, q[2]!]));
    return { px: p[0]!, py: p[1]!, radius: Math.hypot(p[3]! - p[0]!, p[4]! - p[1]!), vorn: p[2]! > 0 && p[5]! > 0 };
  });
}

/** Augenrand unter dem Zeiger (Stufe Augen): Abstand zur Mitte nahe dem Radius. */
export function augenRandUnter(px: number, py: number): boolean {
  return augenPixel().some((a) => a.vorn && Math.abs(Math.hypot(a.px - px, a.py - py) - a.radius) < AUGE_RAND);
}

/** Augenrand fassen: der Abstand des Zeigers zur Augenmitte wird die neue Größe (Anteil der Körperhöhe), ein Undo-Schritt. */
export function augeZeiger(e: React.PointerEvent, px: number, py: number, el: HTMLElement): boolean {
  const augen = augenPixel();
  const a = augen.find((x) => x.vorn && Math.abs(Math.hypot(x.px - px, x.py - py) - x.radius) < AUGE_RAND);
  const n = aktuellesNetz();
  if (!a || !n || a.radius < 1e-6) return false;
  const ed = useEditor.getState();
  // Prüfwesen ohne Ausstattung: die Augen des Bauplans (sonst Standard) werden beim ersten Zug Teil des Dokuments
  const alt = ed.dok.ausstattung?.augen ?? pruefwesenBauplan(ed.dok.name).augen ?? { ring: 2, j: 2, groesse: 0.11 };
  const proWelt = alt.groesse / a.radius; // Anteil der Höhe je Pixel
  const rr = el.getBoundingClientRect();
  ed.beginGeste();
  ziehen(
    e,
    el,
    (ev) => {
      const d = Math.hypot(ev.clientX - rr.left - a.px, ev.clientY - rr.top - a.py);
      const groesse = Math.min(0.4, Math.max(0.02, d * proWelt));
      const s = useEditor.getState();
      const aus = s.dok.ausstattung ?? {};
      s.setzeDokument({ ...s.dok, ausstattung: { ...aus, augen: { ...(aus.augen ?? alt), groesse } } });
    },
    () => useEditor.getState().endeGeste(),
  );
  return true;
}

export type V3Griff = V3;
