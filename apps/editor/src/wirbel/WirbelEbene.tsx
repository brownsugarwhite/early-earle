// Versuch 12.10. abends: Wirbelsäule in den 2D-Ansichten, solange die Bauweise „Wirbelsäule“ gewählt ist.
// Seite: Wirbelsäule (dunkelrot) und Sprossen (orange = liegt, Breite aus dem Top; blau = steht, Breite aus der Front).
// Alle Ansichten: Umriss des 3D-Körpers gestrichelt zum Vergleich mit der Zeichnung.

import type { Ansicht, Linie3, V2, V3T } from '@ee/shape';
import { abtasten3, linieDurch, naechsterInAnsicht } from '@ee/shape/versuch';
import { useEffect } from 'react';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { useWirbelAnzeige } from './wirbelKoerper';

export const WIRBEL_FARBEN = { wirbel: '#8a1020', liegend: '#d9730d', stehend: '#1f5fd1', umriss: '#7a1f3d' } as const;

export function WirbelZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const bauweise = useUi((s) => s.bauweise);
  const { sprossen, wirbel, umrisse } = useWirbelAnzeige();
  if (bauweise !== 'wirbel') return null;
  const zug = (pts: readonly V2[], zu = false) =>
    pts
      .map((p, k) => {
        const q = bild(p);
        return `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      })
      .join('') + (zu ? 'Z' : '');
  const umriss = umrisse?.[ansicht];
  return (
    <g className="wirbel-ebene" pointerEvents="none" data-wirbel={ansicht}>
      {umriss && <path d={zug(umriss, true)} fill="none" stroke={WIRBEL_FARBEN.umriss} strokeWidth={1.5} strokeDasharray="6 4" data-wirbelumriss="" />}
      {ansicht === 'seite' && sprossen && (
        <g data-sprossen={sprossen.length}>
          {sprossen.map((s, i) => (
            <path key={i} d={zug([s.oben, s.unten])} stroke={s.liegend >= 0.5 ? WIRBEL_FARBEN.liegend : WIRBEL_FARBEN.stehend} strokeWidth={1.2} opacity={0.85} />
          ))}
        </g>
      )}
      {ansicht === 'seite' && wirbel && <path d={zug(wirbel)} fill="none" stroke={WIRBEL_FARBEN.wirbel} strokeWidth={3} strokeLinecap="round" data-wirbelsaeule="" />}
    </g>
  );
}

// ---------- Wirbelsäule selbst zeichnen (Florian 12.10. nachts: „Kann ich die Wirbelsäule auch selbst einzeichnen?“) ----------
// Punkte in der Seite, eine glatte Linie hindurch (Griffe automatisch). Ziehen verlegt die Ringe, der Umriss bleibt.
// Zeichnen: Klicks setzen Punkte, Enter oder Doppelklick beendet, Esc bricht ab. Zeichenstift auf der Linie fügt einen
// Punkt ein, auf einem Punkt (oder −) löscht er ihn.

export type WirbelKontext = {
  lokal: (clientX: number, clientY: number) => V2;
  ziehen: (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: (ev: PointerEvent) => void) => void;
};

const linieAus = (pts: readonly V2[]): Linie3 => linieDurch(pts.map((p) => [p.x, p.y, 0] as V3T));
const punkteVon = (l: Linie3): V2[] => l.knoten.map((k) => ({ x: k.p[0], y: k.p[1] }));

/** Ist die Bearbeitung der Wirbelsäule gerade aktiv (Bauweise Wirbelsäule, Tab Form, Seite)? */
export function wirbelBearbeitbar(ansicht: Ansicht): boolean {
  const ui = useUi.getState();
  return ansicht === 'seite' && ui.bauweise === 'wirbel' && ui.ebene === 'form';
}

/** Punkte und Linie der gezeichneten Wirbelsäule (ziehbar) und die Vorschau beim Zeichnen. */
export function WirbelPunkte({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const bauweise = useUi((s) => s.bauweise);
  const ebene = useUi((s) => s.ebene);
  const zeichnen = useUi((s) => s.wirbelZeichnen);
  const linie = useEditor((s) => s.dok.wirbelsaeule);
  if (ansicht !== 'seite' || bauweise !== 'wirbel' || ebene !== 'form') return null;
  const zug = (pts: readonly V2[]) =>
    pts
      .map((p, k) => {
        const q = bild(p);
        return `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      })
      .join('');
  return (
    <g className="wirbel-punkte">
      {linie && (
        <>
          <path data-wirbellinie="" d={zug(abtasten3(linie, 16).map((q) => ({ x: q[0], y: q[1] })))} fill="none" stroke="transparent" strokeWidth={14} />
          {linie.knoten.map((k, i) => {
            const q = bild({ x: k.p[0], y: k.p[1] });
            return (
              <g key={i} data-wirbelknoten={i}>
                <circle cx={q.x} cy={q.y} r={10} fill="transparent" />
                <circle cx={q.x} cy={q.y} r={5.5} fill={WIRBEL_FARBEN.wirbel} stroke="#ffffff" strokeWidth={1.5} />
              </g>
            );
          })}
        </>
      )}
      {zeichnen && zeichnen.length > 0 && (
        <g pointerEvents="none" data-wirbelzeichnen={zeichnen.length}>
          <path d={zug(zeichnen)} fill="none" stroke={WIRBEL_FARBEN.wirbel} strokeWidth={3} strokeDasharray="6 5" strokeLinecap="round" />
          {zeichnen.map((p, i) => {
            const q = bild(p);
            return <circle key={i} cx={q.x} cy={q.y} r={5} fill={WIRBEL_FARBEN.wirbel} />;
          })}
        </g>
      )}
    </g>
  );
}

/** Zeichnen beenden: mindestens zwei Punkte werden die Wirbelsäule. */
export function wirbelZeichnenBeenden(abbrechen = false) {
  const ui = useUi.getState();
  const pts = ui.wirbelZeichnen;
  if (!pts) return;
  ui.setzeWirbelZeichnen(null);
  if (abbrechen || pts.length < 2) return;
  useEditor.getState().setzeWirbelsaeule(linieAus(pts));
}

/** Vorschlag aus dem Umriss als ziehbare Wirbelsäule übernehmen (6 Punkte gleichmäßig, ohne die geraden Enden). */
export function wirbelVorschlagUebernehmen() {
  const w = useWirbelAnzeige.getState().wirbel;
  if (!w || w.length < 4) return;
  const lang = [0];
  for (let i = 1; i < w.length; i++) lang.push(lang[i - 1]! + Math.hypot(w[i]!.x - w[i - 1]!.x, w[i]!.y - w[i - 1]!.y));
  const L = lang[lang.length - 1]!;
  const bei = (s: number): V2 => {
    let k = 1;
    while (k < w.length - 1 && lang[k]! < s) k++;
    const t = (s - lang[k - 1]!) / (lang[k]! - lang[k - 1]! || 1);
    return { x: w[k - 1]!.x + (w[k]!.x - w[k - 1]!.x) * t, y: w[k - 1]!.y + (w[k]!.y - w[k - 1]!.y) * t };
  };
  const pts = [0.1, 0.26, 0.42, 0.58, 0.74, 0.9].map((a) => bei(a * L));
  useEditor.getState().setzeWirbelsaeule(linieAus(pts));
}

/** Zeigereingabe für die Wirbelsäule in der Seite; true = verarbeitet. */
export function wirbelZeiger(e: React.PointerEvent, ctx: WirbelKontext): boolean {
  const ui = useUi.getState();
  const ed = useEditor.getState();
  const q = ctx.lokal(e.clientX, e.clientY);
  if (ui.wirbelZeichnen) {
    const pts = ui.wirbelZeichnen;
    if (pts.length && e.detail >= 2) {
      wirbelZeichnenBeenden();
      return true;
    }
    ui.setzeWirbelZeichnen([...pts, q]);
    return true;
  }
  const linie = ed.dok.wirbelsaeule;
  if (!linie) return false;
  const ziel = e.target as Element;
  const knotenEl = ziel.closest('[data-wirbelknoten]');
  const linieEl = ziel.closest('[data-wirbellinie]');
  if (!knotenEl && !linieEl) return false;
  const pts = punkteVon(linie);
  if (knotenEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'minus')) {
    const i = Number(knotenEl.getAttribute('data-wirbelknoten'));
    if (pts.length <= 2) ui.zeigeHinweis('Die Wirbelsäule braucht mindestens zwei Punkte');
    else ed.setzeWirbelsaeule(linieAus(pts.filter((_, j) => j !== i)));
    return true;
  }
  if (!knotenEl && linieEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'plus')) {
    const t = naechsterInAnsicht(linie, 'seite', q);
    if (t) {
      const neu = pts.slice();
      const p = abtasten3({ knoten: linie.knoten.slice(t.segment, t.segment + 2) }, 32)[Math.round(t.t * 32)]!;
      neu.splice(t.segment + 1, 0, { x: p[0], y: p[1] });
      ed.setzeWirbelsaeule(linieAus(neu));
    }
    return true;
  }
  if (!knotenEl) return false;
  const i = Number(knotenEl.getAttribute('data-wirbelknoten'));
  const p0 = pts[i]!;
  ed.beginGeste();
  ctx.ziehen(
    e,
    (ev) => {
      const p = ctx.lokal(ev.clientX, ev.clientY);
      const neu = pts.slice();
      neu[i] = { x: p0.x + p.x - q.x, y: p0.y + p.y - q.y };
      useEditor.getState().setzeWirbelsaeule(linieAus(neu));
    },
    () => useEditor.getState().endeGeste(),
  );
  return true;
}

/** Enter beendet die neue Wirbelsäule, Esc bricht ab. */
export function useWirbelTasten() {
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (!useUi.getState().wirbelZeichnen) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        wirbelZeichnenBeenden();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        wirbelZeichnenBeenden(true);
      }
    };
    window.addEventListener('keydown', taste, true);
    return () => window.removeEventListener('keydown', taste, true);
  }, []);
}
