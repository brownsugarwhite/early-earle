// Bühne (Plan 5.2: „Gelenklage als Griff im 3D verschiebbar“; Plan 9: Blender auf der Bühne): Gelenk und Knochen der
// Fressen-Pose in der Stufe „Posen & Leben“. Knochen als Linien in der Mittelebene (immer sichtbar wie Blenders Knochen
// im Röntgen), Griffe als Perlen; gezogen wird in der Bildebene durch den Griff, wirksam ist seine Lage in der Seite
// (x, y) — dieselbe Rechnung wie in der Seite (`griffZug`), ein Undo-Schritt je Zug, ohne Umbau.
import type { V2 } from '@ee/shape';
import { aktuellesNetz } from '../kern/netzStand';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import type { Renderer3D } from '../three/Renderer3D';
import { szene } from '../three/instanz';
import { setzeMaulOptionen } from './kieferOptionen';
import { type KieferGriff, aktuellesRig, griffZug, istKnochenGriff, knochenBei } from './knochen';

type V3 = [number, number, number];
const FANG = 12;
type Griff3 = { art: KieferGriff; pos: V3; perle: 'gelenk' | 'spitze' | 'zug' };

/** Griff unter dem Zeiger (für Farbe und Mauszeiger) */
let schwebend: KieferGriff | null = null;

/** Griffe und Knochenlinien (Szene-Koordinaten), nur Bauweise Kern, Stufe „Posen & Leben“, mit Maul. */
function griffe3d(): { griffe: Griff3[]; linien: number[] } | null {
  const ui = useUi.getState();
  const m = aktuellesRig();
  const n = aktuellesNetz();
  if (!m || !n || ui.ebene !== 'posen') return null;
  const sk = n.skalierung;
  const kn = knochenBei(m, ui.oeffnung);
  const w = (p: V2): V3 => [p.x * sk, p.y * sk, 0];
  const griffe: Griff3[] = [{ art: 'gelenk', pos: w(m.rig.gelenk), perle: 'gelenk' }, { art: 'schaedel-gelenk', pos: w(kn.schaedelBasis), perle: 'gelenk' }, { art: 'schaedel-dreh', pos: w(kn.schaedelSpitze), perle: 'spitze' }];
  if (m.knochen.kippen) griffe.push({ art: 'kiefer-dreh', pos: w(kn.kieferSpitze), perle: 'spitze' }, { art: 'kiefer-zug', pos: w(kn.kieferMitte), perle: 'zug' });
  return { griffe, linien: [...w(kn.kieferBasis), ...w(kn.kieferSpitze), ...w(kn.schaedelBasis), ...w(kn.schaedelSpitze)] };
}

/** Knochen und Griffe zeigen (nach jedem Bau, bei Stufenwechsel und Hover) oder ausblenden. */
export function knochen3dAnzeigen(r: Renderer3D): void {
  const g = griffe3d();
  const n = aktuellesNetz();
  if (!g || !n) return r.setzeRig(null, null);
  r.setzeRig(Float32Array.from(g.linien), g.griffe.map((x) => ({ pos: x.pos, art: x.perle, aktiv: x.art === schwebend })), n.netz.hoehe * n.skalierung);
}

/** Griffe in Feldpixeln der Bühne (E2E und Trefferprüfung): Art, px, py; hinter der Kamera fehlt der Griff. */
export function knochen3dPixel(): { art: KieferGriff; px: number; py: number }[] {
  const r = szene.aktuell;
  const g = griffe3d();
  if (!r || !g) return [];
  const pp = r.projizierenViele('creation', Float32Array.from(g.griffe.flatMap((x) => x.pos)));
  const out: { art: KieferGriff; px: number; py: number }[] = [];
  g.griffe.forEach((x, i) => {
    if (pp[3 * i + 2]! > 0) out.push({ art: x.art, px: pp[3 * i]!, py: pp[3 * i + 1]! });
  });
  return out;
}

/** Nächster Griff unter dem Zeiger (≤ 12 px), sonst null. */
export function knochen3dUnter(px: number, py: number): KieferGriff | null {
  let best: KieferGriff | null = null;
  let bd = FANG;
  for (const g of knochen3dPixel()) {
    const d = Math.hypot(g.px - px, g.py - py);
    if (d < bd) {
      bd = d;
      best = g.art;
    }
  }
  return best;
}

/** Hover: Griff unter dem Zeiger merken und gelb zeichnen; true, wenn einer getroffen ist (Mauszeiger). */
export function knochen3dSchweben(px: number, py: number): boolean {
  const neu = useUi.getState().ebene === 'posen' ? knochen3dUnter(px, py) : null;
  if (neu !== schwebend) {
    schwebend = neu;
    const r = szene.aktuell;
    if (r) knochen3dAnzeigen(r);
  }
  return neu !== null;
}

/** Griff auf der Bühne fassen und ziehen; true, wenn ein Griff getroffen wurde. */
export function knochen3dZeiger(e: React.PointerEvent, px: number, py: number, el: HTMLElement): boolean {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  const m = aktuellesRig();
  const art = knochen3dUnter(px, py);
  const g = art ? griffe3d()?.griffe.find((x) => x.art === art) : undefined;
  if (!r || !n || !m || !art || !g) return false;
  const start = r.strahlFuer('creation', px, py);
  if (!start) return false;
  const sk = n.skalierung;
  // Bildebene durch den Griff: Normale = Blickrichtung beim Greifen
  const nrm = start.d;
  const schnitt = (qx: number, qy: number): V2 | null => {
    const s = r.strahlFuer('creation', qx, qy);
    if (!s) return null;
    const nen = s.d[0] * nrm[0] + s.d[1] * nrm[1] + s.d[2] * nrm[2];
    if (Math.abs(nen) < 1e-6) return null;
    const t = ((g.pos[0] - s.o[0]) * nrm[0] + (g.pos[1] - s.o[1]) * nrm[1] + (g.pos[2] - s.o[2]) * nrm[2]) / nen;
    return { x: (s.o[0] + t * s.d[0]) / sk, y: (s.o[1] + t * s.d[1]) / sk };
  };
  const p0 = schnitt(px, py);
  if (!p0) return false;
  e.preventDefault();
  // Knochen greifen bearbeitet die Fressen-Pose bei voller Öffnung (relativ zum Griff, siehe `griffZug`)
  // Knochen gehören zur Fressen-Pose (B1): im Editor-Tab erst in den Fressen-Tab wechseln, statt still die Öffnung zu setzen
  if (istKnochenGriff(art)) {
    const ed = useEditor.getState();
    if (ed.modus === 'editor') ed.setzeZiel('fressen');
    else useUi.getState().setzeOeffnung(1);
  }
  const zug = griffZug(m, art, p0);
  useEditor.getState().beginGeste();
  el.setPointerCapture(e.pointerId);
  const rect = el.getBoundingClientRect();
  const bewegen = (ev: PointerEvent) => {
    const p = schnitt(ev.clientX - rect.left, ev.clientY - rect.top);
    if (p) setzeMaulOptionen(zug(p));
  };
  const auf = () => {
    window.removeEventListener('pointermove', bewegen);
    window.removeEventListener('pointerup', auf);
    window.removeEventListener('pointercancel', auf);
    useEditor.getState().endeGeste();
  };
  window.addEventListener('pointermove', bewegen);
  window.addEventListener('pointerup', auf);
  window.addEventListener('pointercancel', auf);
  return true;
}
