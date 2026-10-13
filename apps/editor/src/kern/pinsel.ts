// Phase 1 / M3: Pinsel auf der Bühne (Plan 4.3, Blender-Gefühl): G ziehen (weich, Radius F bzw. [ ]), I aufblasen,
// ⇧ beim Ziehen glättet, immer gespiegelt. Die Pinsel wirken auf Käfigpunkte der Vorlage; ihre Versätze stehen als
// `kaefig.deltas` im Dokument (ein Undo-Schritt je Strich), der Kern addiert sie nach der Ableitung (Worker, kein Umbau).

import type { KaefigDelta } from '@ee/shape';
import { deltaKarte, deltaListe, kaefigNachbarn, kaefigNormalen, pinselGewichte, spiegelIndex } from '@ee/shape/kern';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { szene } from '../three/instanz';
import { aktuellesNetz } from './kernBau';
import { useTreffer } from './treffer';

type V3 = [number, number, number];

function schnittMitEbene(strahl: { o: V3; d: V3 } | null, mitte: V3, normale: V3): V3 | null {
  if (!strahl) return null;
  const nenner = strahl.d[0] * normale[0] + strahl.d[1] * normale[1] + strahl.d[2] * normale[2];
  if (Math.abs(nenner) < 1e-9) return null;
  const t = ((mitte[0] - strahl.o[0]) * normale[0] + (mitte[1] - strahl.o[1]) * normale[1] + (mitte[2] - strahl.o[2]) * normale[2]) / nenner;
  if (t < 0) return null;
  return [strahl.o[0] + strahl.d[0] * t, strahl.o[1] + strahl.d[1] * t, strahl.o[2] + strahl.d[2] * t];
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

/** Normale des getroffenen Dreiecks (Mittel der drei Eckennormalen), Welt. */
function dreiecksNormale(normalen: Float32Array, dreieck: number): V3 {
  const o = 9 * dreieck;
  const n: V3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    n[0] += normalen[o + 3 * k]!;
    n[1] += normalen[o + 3 * k + 1]!;
    n[2] += normalen[o + 3 * k + 2]!;
  }
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

/** Radiusring am Zeiger zeigen (Pinselwerkzeug aktiv, Treffer vorhanden) oder ausblenden. */
export function pinselRing(_px: number, _py: number): void {
  const r = szene.aktuell;
  const ui = useUi.getState();
  const n = aktuellesNetz();
  const t = useTreffer.getState();
  if (!r) return;
  if (!n || ui.bauweise !== 'kern' || ui.ebene !== 'form' || (ui.werkzeug !== 'ziehen' && ui.werkzeug !== 'aufblasen') || !t.treffer || t.feld !== 'creation') return r.setzeRadiusRing(null);
  r.setzeRadiusRing(t.treffer.punkt, dreiecksNormale(n.netz.normalen, t.treffer.dreieck), ui.pinselRadius * n.netz.hoehe * n.skalierung);
}

/**
 * Pinselstrich auf dem Körper: Treffer → Gewichte der Vorlagenpunkte um den Treffer und sein Spiegelbild → je Bewegung
 * neue Deltas (ziehen: Versatz in der Ebene zur Kamera; aufblasen: entlang der Punktnormalen, Zug nach rechts/oben =
 * nach außen; ⇧: Glätten zum Nachbarmittel, Stärke aus dem Zugweg). true = Geste läuft.
 */
export function pinselZeiger(e: React.PointerEvent, px: number, py: number, el: HTMLElement): boolean {
  const ui = useUi.getState();
  const werkzeug = ui.werkzeug;
  if (werkzeug !== 'ziehen' && werkzeug !== 'aufblasen') return false;
  const r = szene.aktuell;
  const n = aktuellesNetz();
  const tr = n?.netz.treffer;
  if (!r || !n || !tr) return false;
  const h = r.treffen('creation', px, py);
  if (!h) return false;
  const sk = n.skalierung;
  const n0 = Math.min(tr.vorlage.n, tr.kaefig.n);
  const xyz = tr.kaefig.xyz;
  const mitte: V3 = [h.punkt[0] / sk, h.punkt[1] / sk, h.punkt[2] / sk];
  const radius = ui.pinselRadius * n.netz.hoehe;
  const gewichte = pinselGewichte(xyz, n0, mitte, radius);
  if (!gewichte.length) return false;
  const ed = useEditor.getState();
  const basis = deltaKarte(ed.dok.kaefig?.deltas);
  const spiegel = spiegelIndex(xyz, n0);
  const normalen = kaefigNormalen(xyz, tr.kaefig.fStart, tr.kaefig.fVerts, n0);
  const nachbarn = kaefigNachbarn(tr.kaefig.fStart, tr.kaefig.fVerts, n0);
  const blick = r.blickrichtung('creation') ?? [0, 0, 1];
  const ebene: V3 = [-blick[0], -blick[1], -blick[2]];
  const rr = el.getBoundingClientRect();
  const x0 = e.clientX;
  const y0 = e.clientY;
  const lage = (p: number, karte: Map<number, V3>): V3 => {
    // Lage eines Punkts mit Deltas (rechts direkt, links gespiegelt vom Partner)
    const q = spiegel[p]!;
    const rechts = xyz[3 * p + 2]! >= -1e-9;
    const d = karte.get(rechts ? p : q) ?? [0, 0, 0];
    return [xyz[3 * p]! + d[0], xyz[3 * p + 1]! + d[1], xyz[3 * p + 2]! + (rechts ? d[2] : -d[2])];
  };
  ed.beginGeste();
  ziehen(
    e,
    el,
    (ev) => {
      const karte = new Map<number, V3>();
      for (const [k, v] of basis) karte.set(k, [v[0], v[1], v[2]]);
      const setze = (p: number, d: V3) => {
        // nur rechte Hälfte und Naht speichern; linke Punkte landen gespiegelt beim Partner
        if (xyz[3 * p + 2]! >= -1e-9) karte.set(p, d);
        else if (spiegel[p]! >= 0) karte.set(spiegel[p]!, [d[0], d[1], -d[2]]);
      };
      const alt = (p: number): V3 => {
        const rechts = xyz[3 * p + 2]! >= -1e-9;
        const d = basis.get(rechts ? p : spiegel[p]!) ?? [0, 0, 0];
        return rechts ? [d[0], d[1], d[2]] : [d[0], d[1], -d[2]];
      };
      if (ev.shiftKey) {
        // Glätten: Laplace-Entspannung im Radius, Schritte aus dem Zugweg (bis 12), jeder Schritt auf dem vorigen
        const schritte = Math.min(12, Math.ceil(Math.hypot(ev.clientX - x0, ev.clientY - y0) / 10));
        const lagen = new Map<number, V3>();
        const lageJetzt = (p: number): V3 => lagen.get(p) ?? lage(p, basis);
        for (let s = 0; s < schritte; s++) {
          const neu = new Map<number, V3>();
          for (const g of gewichte) {
            const w = Math.max(g.w, g.wSpiegel) * 0.5;
            const nb = nachbarn[g.punkt]!;
            if (w <= 0 || !nb.length) continue;
            const p0 = lageJetzt(g.punkt);
            const m: V3 = [0, 0, 0];
            for (const q of nb) {
              const l = lageJetzt(q);
              m[0] += l[0] / nb.length;
              m[1] += l[1] / nb.length;
              m[2] += l[2] / nb.length;
            }
            neu.set(g.punkt, [p0[0] + w * (m[0] - p0[0]), p0[1] + w * (m[1] - p0[1]), p0[2] + w * (m[2] - p0[2])]);
          }
          for (const [k, v] of neu) lagen.set(k, v);
        }
        for (const g of gewichte) {
          const l = lagen.get(g.punkt);
          if (!l) continue;
          // Delta = neue Lage − unveränderter Käfig (ohne Deltas), für linke Punkte gespiegelt über `setze`
          setze(g.punkt, [l[0] - xyz[3 * g.punkt]!, l[1] - xyz[3 * g.punkt + 1]!, l[2] - xyz[3 * g.punkt + 2]!]);
        }
      } else if (werkzeug === 'ziehen') {
        const hit = schnittMitEbene(r.strahlFuer('creation', ev.clientX - rr.left, ev.clientY - rr.top), h.punkt, ebene);
        if (!hit) return;
        const D: V3 = [(hit[0] - h.punkt[0]) / sk, (hit[1] - h.punkt[1]) / sk, (hit[2] - h.punkt[2]) / sk];
        for (const g of gewichte) {
          const a = alt(g.punkt);
          setze(g.punkt, [a[0] + (g.w + g.wSpiegel) * D[0], a[1] + (g.w + g.wSpiegel) * D[1], a[2] + (g.w - g.wSpiegel) * D[2]]);
        }
      } else {
        const betrag = ((ev.clientX - x0 - (ev.clientY - y0)) / 300) * radius;
        for (const g of gewichte) {
          const a = alt(g.punkt);
          const w = (g.w + g.wSpiegel) * betrag;
          setze(g.punkt, [a[0] + w * normalen[3 * g.punkt]!, a[1] + w * normalen[3 * g.punkt + 1]!, a[2] + w * normalen[3 * g.punkt + 2]!]);
        }
      }
      const s = useEditor.getState();
      const deltas: KaefigDelta[] = deltaListe(karte);
      s.setzeDokument({ ...s.dok, kaefig: { deltas } });
    },
    () => useEditor.getState().endeGeste(),
  );
  return true;
}
