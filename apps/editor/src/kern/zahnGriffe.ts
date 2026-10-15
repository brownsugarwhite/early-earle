// Phase 2 / M4 (Plan 5.3, 9.4): Zähne auf der Bühne wählen und längs des Zahnfleischs ziehen. Ein Klick auf einen Zahn
// wählt ihn (die Tafel zeigt seine Werte), Ziehen verschiebt ihn längs der Zahnfleischlinie: das Dokument speichert die
// rechte Hälfte, der Spiegelpartner folgt; der Mittelzahn bleibt auf der Achse. Im Fressen-Modus gilt die Stelle für das
// offene Maul (`auf.u`). Verdeckte Zähne (geschlossen hinter den Lippen) sind nicht greifbar: liegt der Körper vor dem
// Zahn, gilt der Körper.

import type { Ansicht, Zaehne } from '@ee/shape';
import type { ZahnBau } from '@ee/shape/kern';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import type { Renderer3D } from '../three/Renderer3D';
import { szene } from '../three/instanz';
import { aktuellesNetz } from './netzStand';

type Kiefer = 'oben' | 'unten';
/** Zahnfarbe ohne Angabe in der Ausstattung (Creme, Bild 5/11) */
export const ZAHN_FARBE = '#f3e6c8';
/** Körper so viel näher als der Zahn (Welt längs des Strahls): Zahn verdeckt */
const ZAHN_VERDECKT = 0.004;

/** Feld der Szene: Bühne oder ein Blatt (dieselbe Szene, orthografisch) */
type Feld = 'creation' | Ansicht;

/** Zahn unter dem Zeiger (Feldpixel; Index in `zaehne.liste`), null ohne Zahn oder wenn der Körper davor liegt. */
export function zahnUnter(px: number, py: number, feld: Feld = 'creation'): { liste: number; kiefer: Kiefer; index: number; seite: -1 | 0 | 1 } | null {
  const r = szene.aktuell;
  const z = aktuellesNetz()?.netz.zaehne;
  if (!r || !z) return null;
  const t = r.treffenZahn(feld, px, py);
  if (!t) return null;
  // der Zahn steckt mit der Wurzel im Zahnfleisch: dicht darüber treffen Zahn und Körper fast gleich weit (gemessen bis
  // 0,012 näher am Körper); verdeckt ist ein Zahn erst, wenn der Körper deutlich davor liegt (Lippe, ≥ 0,004 Welt)
  const k = r.treffen(feld, px, py);
  if (k && k.abstand < t.abstand - ZAHN_VERDECKT) return null;
  const i = z.zahn[3 * t.dreieck];
  const info = i === undefined ? undefined : z.liste[i];
  return info ? { liste: i!, kiefer: info.kiefer, index: info.index, seite: info.seite } : null;
}

/** Dreiecke (Welt) der Zähne eines Dokument-Eintrags (beide Seiten) bzw. einer Menge von Einträgen. */
function zahnDreiecke(z: ZahnBau, passt: (kiefer: Kiefer, index: number) => boolean): { positionen: Float32Array; normalen: Float32Array } | null {
  const n = z.zahn.length;
  let anzahl = 0;
  for (let v = 0; v < n; v++) {
    const q = z.liste[z.zahn[v]!];
    if (q && passt(q.kiefer, q.index)) anzahl++;
  }
  if (!anzahl) return null;
  const positionen = new Float32Array(3 * anzahl);
  const normalen = new Float32Array(3 * anzahl);
  let o = 0;
  for (let v = 0; v < n; v++) {
    const q = z.liste[z.zahn[v]!];
    if (!q || !passt(q.kiefer, q.index)) continue;
    positionen.set(z.positionen.subarray(3 * v, 3 * v + 3), o);
    normalen.set(z.normalen.subarray(3 * v, 3 * v + 3), o);
    o += 3;
  }
  return { positionen, normalen };
}

/** Marken des gewählten Zahns (nur in der Stufe Zähne); die Lagen im Netz sind schon im Maßstab der Bühne. */
export function zahnMarkenAnzeigen(r: Renderer3D): void {
  const ui = useUi.getState();
  const z = aktuellesNetz()?.netz.zaehne;
  const a = ui.zahnAuswahl;
  if (!z || ui.ebene !== 'zaehne' || ui.bauweise !== 'kern' || !a) {
    r.setzeZahnMarken(null, null);
    return;
  }
  r.setzeZahnMarken(
    zahnDreiecke(z, (k, i) => k === a.kiefer && i === a.index),
    null,
  );
}

/** Nächste Stelle der Zahnfleischlinie eines Kiefers zum Zeiger (Feldpixel): u und Seite. */
function stelleAmZeiger(r: Renderer3D, z: ZahnBau, kiefer: Kiefer, skalierung: number, px: number, py: number, feld: Feld): { u: number; seite: -1 | 1 } | null {
  const linie = kiefer === 'oben' ? z.fleisch.oben : z.fleisch.unten;
  const uL = kiefer === 'oben' ? z.fleisch.uOben : z.fleisch.uUnten;
  const welt = new Float32Array(linie.length);
  for (let i = 0; i < linie.length; i++) welt[i] = linie[i]! * skalierung;
  const s = r.projizierenViele(feld, welt);
  const n = linie.length / 3;
  const mitte = (n - 1) / 2;
  let best = Infinity;
  let bestJ = 0;
  for (let j = 0; j + 1 < n; j++) {
    const ax = s[3 * j]!;
    const ay = s[3 * j + 1]!;
    const bx = s[3 * j + 3]!;
    const by = s[3 * j + 4]!;
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const f = l2 > 1e-9 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    const d = Math.hypot(ax + dx * f - px, ay + dy * f - py);
    if (d < best) {
      best = d;
      bestJ = j + f;
    }
  }
  if (!Number.isFinite(best)) return null;
  const j0 = Math.min(n - 2, Math.floor(bestJ));
  const u = uL[j0]! + (bestJ - j0) * (uL[j0 + 1]! - uL[j0]!);
  return { u: Math.min(1, Math.max(0, u)), seite: bestJ < mitte ? -1 : 1 };
}

/**
 * Zeiger in der Stufe Zähne (Bühne oder Blatt): Klick auf einen Zahn wählt ihn, Ziehen verschiebt ihn längs des
 * Zahnfleischs (ein Undo-Schritt). `px`, `py` relativ zum Feld, `el` fängt den Zeiger. true = Geste übernommen.
 */
export function zahnZeiger(e: React.PointerEvent, px: number, py: number, el: Element, feld: Feld = 'creation'): boolean {
  const ui = useUi.getState();
  const n = aktuellesNetz();
  const r = szene.aktuell;
  const z = n?.netz.zaehne;
  if (!n || !r || !z) return false;
  const h = zahnUnter(px, py, feld);
  if (!h) return false;
  ui.setzeZahnAuswahl({ kiefer: h.kiefer, index: h.index });
  if (h.seite === 0) return true; // Mittelzahn: nur wählen
  // Feldpixel aus Clientkoordinaten: derselbe Versatz wie beim Drücken
  const dx = e.clientX - px;
  const dy = e.clientY - py;
  const x0 = e.clientX;
  const y0 = e.clientY;
  const offen = useEditor.getState().modus === 'fressen';
  let bewegt = false;
  el.setPointerCapture(e.pointerId);
  const bewegen = (ev: PointerEvent) => {
    if (!bewegt && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 3) return;
    if (!bewegt) {
      bewegt = true;
      useEditor.getState().beginGeste();
    }
    const netz = aktuellesNetz();
    const zz = netz?.netz.zaehne;
    if (!netz || !zz) return;
    const st = stelleAmZeiger(r, zz, h.kiefer, netz.skalierung, ev.clientX - dx, ev.clientY - dy, feld);
    if (!st) return;
    const ed = useEditor.getState();
    const basis: Zaehne | null = ed.dok.zaehne ?? zz.reihen;
    const reihe = basis?.[h.kiefer];
    const eintrag = reihe?.zaehne[h.index];
    if (!basis || !reihe || !eintrag) return;
    const liste = reihe.zaehne.slice();
    liste[h.index] = offen ? { ...eintrag, auf: { ...eintrag.auf, u: st.u } } : { ...eintrag, u: st.u };
    ed.setzeZaehne({ ...basis, [h.kiefer]: { ...reihe, zaehne: liste } });
  };
  const auf = () => {
    window.removeEventListener('pointermove', bewegen);
    window.removeEventListener('pointerup', auf);
    window.removeEventListener('pointercancel', auf);
    if (bewegt) useEditor.getState().endeGeste();
  };
  window.addEventListener('pointermove', bewegen);
  window.addEventListener('pointerup', auf);
  window.addEventListener('pointercancel', auf);
  return true;
}
