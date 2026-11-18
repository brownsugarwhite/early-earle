// Rundmaul in den Blättern (Phase 2 M6, Florian 15.10.: „fertig wie im Plan“): der Lippenring als geschlossene Linie in
// Front, Seite und Top (Stufe Maul). Rand ziehen = Größe — bei geschlossenem Maul (Öffnung unter 50 %) das O zu, sonst
// das O offen, so dass der Ring dem Zeiger folgt; nach innen bis zum Punkt gezogen wird das geschlossene Maul unsichtbar.
// Mitte ziehen = Lage: rastet auf die Käfigpunkte der Spiegelebene vorn, die das Rundmaul tragen (`netz.rundmaul.kandidaten`).
// Ist das Maul gerade unsichtbar (O zu = 0, geschlossen), zeigt ein gestrichelter Ring die offene Größe; er stellt das O offen.
// Alle Lagen kommen aus dem letzten Bau (Profileinheiten); ein Zug ist ein Undo-Schritt.
import { type Ansicht, type V2 } from '@ee/shape';
import { RUNDMAUL_STANDARD, type WesenNetz } from '@ee/shape/kern';
import { aktuellesNetz, useNetzStand } from '../kern/netzStand';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import type { Ebene2DKontext } from './MaulEbene';

type V3 = [number, number, number];
type Rundmaul = NonNullable<WesenNetz['rundmaul']>;
const FARBE = '#e0306a';
/** Greifweite an Ring und Mitte (Bildpunkte) */
const GREIF = 7;

/** Weltpunkt → Blattkoordinaten (Profileinheiten): Seite (x, y), Front (z, y), Top (x, z) */
function inBlatt(p: V3, ansicht: Ansicht): V2 {
  if (ansicht === 'front') return { x: p[2], y: p[1] };
  if (ansicht === 'top') return { x: p[0], y: p[2] };
  return { x: p[0], y: p[1] };
}

/** Wirksames Rundmaul des letzten Baus (nur Bauweise Kern, nur wenn der Bau ein Rundmaul hatte). */
function aktuellesRundmaul(): Rundmaul | null {
  if (useUi.getState().bauweise !== 'kern') return null;
  return aktuellesNetz()?.netz.rundmaul ?? null;
}

/** Ring als Punktfolge im Blatt; unsichtbar: die offene Größe (gestrichelt). */
function ringImBlatt(m: Rundmaul, ansicht: Ansicht, n = 48): { punkte: V2[]; radius: number; offenVorschau: boolean } {
  const offenVorschau = m.radius < 1e-6;
  const r = offenVorschau ? m.auf * m.hoehe : m.radius;
  const punkte: V2[] = [];
  for (let k = 0; k < n; k++) {
    const w = (2 * Math.PI * k) / n;
    const c = Math.cos(w) * r;
    const s = Math.sin(w) * r;
    punkte.push(inBlatt([m.mitte[0] + m.e1[0] * c + m.e2[0] * s, m.mitte[1] + m.e1[1] * c + m.e2[1] * s, m.mitte[2] + m.e1[2] * c + m.e2[2] * s], ansicht));
  }
  return { punkte, radius: r, offenVorschau };
}

export function RundmaulZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  useNetzStand((s) => s.version);
  const oeffnung = useUi((s) => s.oeffnung);
  const m = aktuellesRundmaul();
  if (!m) return null;
  const { punkte, offenVorschau } = ringImBlatt(m, ansicht);
  const q = punkte.map(bild);
  const d = `M${q.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}Z`;
  const c = bild(inBlatt(m.mitte, ansicht));
  const offen = !offenVorschau && oeffnung >= 0.5;
  const titel = offenVorschau ? 'O offen (geschlossen unsichtbar): Rand ziehen' : offen ? 'O offen: Rand ziehen' : 'O zu: Rand ziehen (bis zur Mitte = geschlossen unsichtbar)';
  return (
    <g className="rundmaul-ebene" data-rundmaul-ebene={offenVorschau ? 'unsichtbar' : offen ? 'offen' : 'zu'}>
      <path d={d} fill="none" stroke={FARBE} strokeWidth={2.5} strokeOpacity={0.9} strokeDasharray={offenVorschau ? '5 4' : undefined} data-rundmaul-griff="rand" style={{ cursor: 'nwse-resize' }}>
        <title>{titel}</title>
      </path>
      {/* breiter unsichtbarer Saum zum Greifen */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={2 * GREIF} data-rundmaul-griff="rand" style={{ cursor: 'nwse-resize' }} />
      <circle cx={c.x} cy={c.y} r={6} fill="#fff" stroke={FARBE} strokeWidth={2} data-rundmaul-griff="mitte" style={{ cursor: 'move' }}>
        <title>Mitte ziehen: Lage des Rundmauls (rastet auf die Käfigpunkte vorn auf der Spiegelebene)</title>
      </circle>
    </g>
  );
}

/** Ausstattung.rundmaul mit einer Änderung setzen (Prüfwesen ohne eigene Ausstattung: deren Rundmaul als Basis). */
function rundmaulSetzen(patch: { zu?: number; auf?: number; punkt?: V3 }): void {
  const s = useEditor.getState();
  const aus = s.dok.ausstattung ?? {};
  s.setzeDokument({ ...s.dok, ausstattung: { ...aus, rundmaul: { ...(aus.rundmaul ?? {}), ...patch } } });
}

/**
 * Zeiger auf dem Ring (Rand: Größe) oder der Mitte (Lage); true, wenn ein Griff getroffen wurde. Die Größe folgt dem
 * Verhältnis der Abstände zur Mitte (im Blatt ist der Ring eine Ellipse), die Lage rastet auf den nächsten Kandidaten.
 */
export function rundmaulZeiger(e: React.PointerEvent, ctx: Ebene2DKontext): boolean {
  const m = aktuellesRundmaul();
  if (!m) return false;
  const el = (e.target as Element).closest('[data-rundmaul-griff]');
  if (!el) return false;
  const art = el.getAttribute('data-rundmaul-griff');
  e.preventDefault();
  e.stopPropagation();
  const { ansicht } = ctx;
  const c0 = inBlatt(m.mitte, ansicht);
  const start = ctx.lokal(e.clientX, e.clientY);
  useEditor.getState().beginGeste();
  if (art === 'mitte') {
    let zuletzt = -1;
    ctx.ziehen(
      e,
      (ev) => {
        const p = ctx.lokal(ev.clientX, ev.clientY);
        // Mitte folgt dem Zeiger: der Kandidat, dessen Lage im Blatt dem Zeiger (samt Griffversatz) am nächsten ist
        const ziel = { x: c0.x + (p.x - start.x), y: c0.y + (p.y - start.y) };
        let best = -1;
        let bestD = Infinity;
        m.kandidaten.forEach((k, i) => {
          const q = inBlatt(k, ansicht);
          const dd = Math.hypot(q.x - ziel.x, q.y - ziel.y);
          if (dd < bestD) {
            bestD = dd;
            best = i;
          }
        });
        if (best < 0 || best === zuletzt) return;
        zuletzt = best;
        const k = m.kandidaten[best]!;
        rundmaulSetzen({ punkt: [k[0], k[1], 0] });
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }
  // Rand: Größe im Verhältnis der Abstände zur Mitte im Blatt
  const { radius: r0, offenVorschau } = ringImBlatt(m, ansicht);
  const d0 = Math.max(1e-6, Math.hypot(start.x - c0.x, start.y - c0.y));
  const o = useUi.getState().oeffnung;
  const H = m.hoehe;
  ctx.ziehen(
    e,
    (ev) => {
      const p = ctx.lokal(ev.clientX, ev.clientY);
      const v = (r0 * Math.hypot(p.x - c0.x, p.y - c0.y)) / d0 / H;
      if (offenVorschau || o >= 0.5) {
        // O offen so, dass der Ring bei dieser Öffnung (bzw. offen) dem Zeiger folgt
        const auf = offenVorschau ? v : (v - m.zu * (1 - o)) / o;
        rundmaulSetzen({ auf: Math.round(Math.min(0.25, Math.max(0.05, auf)) * 1000) / 1000 });
      } else {
        const zu = (v - m.auf * o) / (1 - o);
        // nah an der Mitte rastet es auf 0: geschlossen unsichtbar
        rundmaulSetzen({ zu: zu < 0.25 * RUNDMAUL_STANDARD.zu ? 0 : Math.round(Math.min(0.1, zu) * 1000) / 1000 });
      }
    },
    () => useEditor.getState().endeGeste(),
  );
  return true;
}
