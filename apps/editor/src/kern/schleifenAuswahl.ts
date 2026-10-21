// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V6.3: Loops auf der Bühne sehen und wählen. Jeder Loop ist ein Ring
// auf dem Körper (orange; unter dem Zeiger pink, gewählt weiß). ⌥-Klick auf den Ring wählt den Loop — dazu seine Knoten in
// Seite (Rücken, Bauch) und Top, so dass G/S/R auch in den Blättern auf ihn wirken. Auf der Bühne formen G/S/R den gewählten
// Loop (`schleifenGrs.ts`).

import type { RingDaten, WesenNetz } from '@ee/shape/kern';
import { useEffect } from 'react';
import { create } from 'zustand';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import type { Renderer3D } from '../three/Renderer3D';
import { szene } from '../three/instanz';
import { aktuellesNetz } from './netzStand';

/** Fangradius in Pixeln */
const FANG = 7;
const FARBE: [number, number, number] = [0.93, 0.55, 0.15];
const FARBE_HOVER: [number, number, number] = [1, 0.18, 0.604];
const FARBE_GEWAEHLT: [number, number, number] = [0.98, 0.97, 0.92];

/** Gewählter Loop, Loop unter dem Zeiger (Kennungen) und die Zeile einer laufenden G/S/R-Operation auf ihm (Dock). */
export const useSchleife = create<{ gewaehlt: string | null; hover: string | null; text: string | null }>(() => ({ gewaehlt: null, hover: null, text: null }));

/** Punkte eines Rings auf der Fläche (Welt, mit Maßstab), geschlossen. */
export function ringPunkte(rd: RingDaten, ring: number, sk: number): Float32Array {
  const P = rd.proRing;
  const out = new Float32Array(3 * P);
  for (let q = 0; q < 3 * P; q++) out[q] = rd.verlauf[3 * ring * P + q]! * sk;
  return out;
}

/** Mitte eines Rings (Welt, mit Maßstab). */
export function ringMitte(rd: RingDaten, ring: number, sk: number): [number, number, number] {
  const p = ringPunkte(rd, ring, sk);
  const m: [number, number, number] = [0, 0, 0];
  for (let q = 0; q < p.length; q += 3) for (let c = 0; c < 3; c++) m[c]! += p[q + c]! / (p.length / 3);
  return m;
}

/** Loops anzeigen (nach jedem Bau, bei Auswahl und Hover) oder ausblenden (andere Stufe, keine Loops). */
export function schleifenAnzeigen(r: Renderer3D, netz: WesenNetz | null, sk: number): void {
  const ui = useUi.getState();
  const rd = netz?.ringe;
  if (!rd || !rd.schleifen.length || ui.ebene !== 'form' || ui.bauweise !== 'kern' || useEditor.getState().modus !== 'editor') {
    r.setzeSchleifen(null, null);
    return;
  }
  // ein gewählter Loop, den es nicht mehr gibt (⌘Z, gelöscht), ist nicht mehr gewählt
  if (useSchleife.getState().gewaehlt && !rd.schleifen.some((s) => s.id === useSchleife.getState().gewaehlt)) useSchleife.setState({ gewaehlt: null });
  const { gewaehlt, hover } = useSchleife.getState();
  const segs: number[] = [];
  const farben: number[] = [];
  for (const s of rd.schleifen) {
    const p = ringPunkte(rd, s.ring, sk);
    const f = s.id === gewaehlt ? FARBE_GEWAEHLT : s.id === hover ? FARBE_HOVER : FARBE;
    const n = p.length / 3;
    for (let q = 0; q < n; q++) {
      const q2 = (q + 1) % n;
      segs.push(p[3 * q]!, p[3 * q + 1]!, p[3 * q + 2]!, p[3 * q2]!, p[3 * q2 + 1]!, p[3 * q2 + 2]!);
      farben.push(...f, ...f);
    }
  }
  r.setzeSchleifen(Float32Array.from(segs), Float32Array.from(farben));
}

/** Farben auffrischen (Auswahl oder Hover geändert). */
export function schleifenFaerben(): void {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  if (r) schleifenAnzeigen(r, n?.netz ?? null, n?.skalierung ?? 1);
}

function abstandStrecke(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const ex = bx - ax;
  const ey = by - ay;
  const l2 = ex * ex + ey * ey;
  const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * ex + (py - ay) * ey) / l2)) : 0;
  return Math.hypot(ax + t * ex - px, ay + t * ey - py);
}

/** Loop unter dem Zeiger (Feldpixel der Bühne): der nächste Ring innerhalb des Fangradius. */
export function schleifeUnter(px: number, py: number): string | null {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  const rd = n?.netz.ringe;
  if (!r || !rd || !rd.schleifen.length || useUi.getState().ebene !== 'form' || useEditor.getState().modus !== 'editor') return null;
  let best = FANG;
  let wahl: string | null = null;
  for (const s of rd.schleifen) {
    const q = r.projizierenViele('creation', ringPunkte(rd, s.ring, n.skalierung));
    const m = q.length / 3;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      if (!q[3 * i + 2] || !q[3 * j + 2]) continue;
      const d = abstandStrecke(px, py, q[3 * i]!, q[3 * i + 1]!, q[3 * j]!, q[3 * j + 1]!);
      if (d < best) {
        best = d;
        wahl = s.id;
      }
    }
  }
  return wahl;
}

/** Hover auf der Bühne setzen (aus dem Schweben der Steuerung); true, wenn ein Loop unter dem Zeiger liegt. */
export function schleifenSchweben(px: number, py: number): boolean {
  const h = schleifeUnter(px, py);
  if (h !== useSchleife.getState().hover) {
    useSchleife.setState({ hover: h });
    schleifenFaerben();
  }
  return h !== null;
}

/**
 * Loop wählen (null: keinen): seine Knoten in Seite und Top werden die Auswahl der Blätter, damit G/S/R dort auf ihn wirken.
 */
export function schleifeWaehlen(id: string | null): void {
  useSchleife.setState({ gewaehlt: id });
  const ui = useUi.getState();
  if (id) {
    const pr = useEditor.getState().dok.profile;
    const seite = pr.seite.knoten.flatMap((k, i) => (k.schleife === id ? [i] : []));
    const top = pr.top.knoten.flatMap((k, i) => (k.schleife === id ? [i] : []));
    const front = pr.front.knoten.flatMap((k, i) => (k.schleife === id ? [i] : []));
    ui.setzeAuswahl({ seite, front, top }, 'seite');
  }
  schleifenFaerben();
}

/** ⌥-Klick auf der Bühne: Loop wählen (true = übernommen). Ein Klick neben die Loops hebt die Wahl auf (ohne zu übernehmen). */
export function schleifenZeiger(e: { altKey: boolean }, px: number, py: number): boolean {
  const id = schleifeUnter(px, py);
  if (e.altKey && id) {
    schleifeWaehlen(id);
    useUi.getState().zeigeHinweis('Loop gewählt: G verschieben, S skalieren, R kippen (Zeiger auf der Bühne) — oder in den Blättern');
    return true;
  }
  return false;
}

/** Dauerhaft: Ändert sich die Auswahl der Blätter so, dass die Knoten des Loops nicht mehr dabei sind, ist er nicht mehr gewählt. */
export function useSchleifenAuswahlAbgleich() {
  useEffect(
    () =>
      useUi.subscribe((s, v) => {
        const id = useSchleife.getState().gewaehlt;
        if (!id || s.auswahl === v.auswahl) return;
        const pr = useEditor.getState().dok.profile;
        const seite = pr.seite.knoten.flatMap((k, i) => (k.schleife === id ? [i] : []));
        if (!seite.length || !seite.every((i) => s.auswahl.seite.includes(i))) {
          useSchleife.setState({ gewaehlt: null });
          schleifenFaerben();
        }
      }),
    [],
  );
}
