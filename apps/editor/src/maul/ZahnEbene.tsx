// Zahn-Tab (Versuch 12.10.): Zähne in Seite und Front als Umrisse, gebaut wie im 3D (Zahn-Versuch am Zahnfleisch des
// Maul-Käfigs). Klick wählt einen Zahn (Untermenü in der Seitenleiste), Ziehen verschiebt ihn längs des Zahnfleischs.
// Der Spiegelpartner folgt, weil das Dokument nur die rechte Hälfte speichert; der Mittelzahn bleibt auf der Achse.
// Editor-Tab = zu (α = 0), Fressen-Tab = offen (α = 1, mit den Werten für „auf“).

import type { Ansicht, Dokument, V2 } from '@ee/shape';
import { type Kiefer, type V3, type Zahnfleisch, inAnsicht2, zahnGitter } from '@ee/shape/versuch';
import { type Modus, useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { maulZuletzt, useMaulInfo } from './maulKoerper';
import { fleischVon, zahnListe, zahnMeldungen, zahnMeldungenZuletzt } from './zahnKoerper';

const ZAHN = '#f4ecd8';
const RAND = '#a67f2c';
/** stört geschlossen (Prüfung des Zahn-Versuchs) */
const ROT = '#f0403a';
const ROT_FLAECHE = '#ffd6d2';

/** Befunde der Prüfung im geschlossenen Maul; während einer Geste der letzte Stand (die Prüfung dauert 75–185 ms). */
export function useZahnMeldungen() {
  const dok = useEditor((s) => s.dok);
  const geste = useEditor((s) => s.gesteStart);
  useMaulInfo((s) => s.info);
  const b = maulZuletzt(dok);
  if (!b || !dok.zaehne) return [];
  return geste ? zahnMeldungenZuletzt() : zahnMeldungen(b.mk, b.zu, dok.zaehne);
}

/** Lage der Zähne im aktuellen Tab: Käfig, Öffnung und Zahnfleisch beider Kiefer. */
function zahnLage(dok: Dokument, modus: Modus) {
  const b = maulZuletzt(dok);
  if (!b) return null;
  const alpha = modus === 'editor' ? 0 : 1;
  return { alpha, fleisch: fleischVon(b.mk, alpha ? b.auf : b.zu) };
}

/** Konvexe Hülle (Andrew): Umriss eines Zahns in der Ansicht. */
function huelle(punkte: V2[]): V2[] {
  const p = punkte.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const kreuz = (o: V2, a: V2, b: V2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const unten: V2[] = [];
  for (const q of p) {
    while (unten.length >= 2 && kreuz(unten[unten.length - 2]!, unten[unten.length - 1]!, q) <= 0) unten.pop();
    unten.push(q);
  }
  const oben: V2[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]!;
    while (oben.length >= 2 && kreuz(oben[oben.length - 2]!, oben[oben.length - 1]!, q) <= 0) oben.pop();
    oben.push(q);
  }
  return [...unten.slice(0, -1), ...oben.slice(0, -1)];
}

const zu3 = (p: V3): [number, number, number] => [p[0], p[1], p[2]];

export function ZahnZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const dok = useEditor((s) => s.dok);
  const modus = useEditor((s) => s.modus);
  const auswahl = useUi((s) => s.zahnAuswahl);
  useMaulInfo((s) => s.info); // nach jedem Bau des Mauls neu zeichnen
  const meldungen = useZahnMeldungen();
  if (ansicht === 'top' || !dok.zaehne) return null;
  const lage = zahnLage(dok, modus);
  if (!lage) return null;
  const liste = zahnListe(dok.zaehne);
  // Seite: nur die rechte Hälfte (die linke liegt dahinter); Front: beide, die Spiegelhälfte blass
  const sichtbar = liste.filter((q) => ansicht === 'front' || q.zahn.seite >= 0);
  return (
    <g className="zaehne">
      {sichtbar.map((q, k) => {
        const g = zahnGitter(q.zahn, lage.fleisch[q.kiefer], lage.alpha);
        const pts = [...g.ringe.slice(1).flat(), g.spitze].map((p) => bild(inAnsicht2(zu3(p), ansicht)));
        const h = huelle(pts);
        const d = h.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('') + 'Z';
        const gewaehlt = auswahl?.kiefer === q.kiefer && auswahl.index === q.index;
        const spiegel = q.zahn.seite < 0;
        const stoert = meldungen.some((m) => m.kiefer === q.kiefer && m.index === q.index);
        return (
          <path
            key={k}
            data-zahn={`${q.kiefer}:${q.index}`}
            {...(stoert ? { 'data-stoert': '' } : {})}
            d={d}
            fill={stoert ? ROT_FLAECHE : ZAHN}
            fillOpacity={spiegel ? 0.55 : 1}
            stroke={gewaehlt ? 'var(--punkt)' : stoert ? ROT : RAND}
            strokeWidth={gewaehlt ? 3 : 1.5}
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  );
}

/** Zahnfleisch in der Ansicht abgetastet (beide Hälften), für das Ziehen längs des Zahnfleischs. */
function fleischKurve(f: Zahnfleisch, ansicht: Ansicht, aussen: boolean): { u: number; q: V2 }[] {
  const out: { u: number; q: V2 }[] = [];
  for (const seite of [1, -1] as const) {
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      out.push({ u, q: inAnsicht2(zu3(f(u, seite, aussen).p), ansicht) });
    }
  }
  return out;
}

function naechstesU(kurve: { u: number; q: V2 }[], p: V2): number {
  let best = kurve[0]!;
  let bd = Infinity;
  for (const k of kurve) {
    const d = (k.q.x - p.x) ** 2 + (k.q.y - p.y) ** 2;
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return best.u;
}

/** Zeiger im Zahn-Tab: Klick auf einen Zahn wählt ihn, Ziehen verschiebt ihn längs des Zahnfleischs. */
export function zahnZeiger(
  e: React.PointerEvent,
  h: { ansicht: Ansicht; lokal: (x: number, y: number) => V2; ziehen: (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: (ev: PointerEvent) => void) => void },
) {
  const ui = useUi.getState();
  const el = (e.target as Element).closest('[data-zahn]');
  if (!el) {
    ui.setzeZahnAuswahl(null);
    return;
  }
  const [kiefer, iStr] = el.getAttribute('data-zahn')!.split(':') as [Kiefer, string];
  const index = Number(iStr);
  ui.setzeZahnAuswahl({ kiefer, index });
  const ed = useEditor.getState();
  const reihe = ed.dok.zaehne?.[kiefer];
  const eintrag = reihe?.zaehne[index];
  if (!reihe || !eintrag || (reihe.anzahl % 2 === 1 && index === 0)) return; // Mittelzahn bleibt auf der Achse
  const lage = zahnLage(ed.dok, ed.modus);
  if (!lage) return;
  const offen = ed.modus !== 'editor';
  const kurve = fleischKurve(lage.fleisch[kiefer], h.ansicht, eintrag.aussen);
  const start = h.lokal(e.clientX, e.clientY);
  let bewegt = false;
  ed.beginGeste();
  h.ziehen(
    e,
    (ev) => {
      const p = h.lokal(ev.clientX, ev.clientY);
      if (!bewegt && Math.hypot(p.x - start.x, p.y - start.y) < 0.002) return;
      bewegt = true;
      const u = Math.min(1, Math.max(0, naechstesU(kurve, p)));
      const d = useEditor.getState().dok;
      const r = d.zaehne?.[kiefer];
      const z = r?.zaehne[index];
      if (!d.zaehne || !r || !z) return;
      const liste = r.zaehne.slice();
      liste[index] = offen ? { ...z, auf: { ...z.auf, u } } : { ...z, u };
      useEditor.getState().setzeZaehne({ ...d.zaehne, [kiefer]: { ...r, zaehne: liste } });
    },
    () => useEditor.getState().endeGeste(),
  );
}
