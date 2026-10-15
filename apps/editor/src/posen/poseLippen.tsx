// B5 (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B): Rot und Blau der Pose in den Blättern (Stufe Maul).
// Die gezeigte Linie ist die Lippe der Pose selbst (`netz.pose.lippen`, Kern-Koordinaten ohne Hebung); Knoten sitzen auf
// ihr beim Lippenanteil s, die Griffe zeigen die Tangente der natürlichen Lippe plus den Griffversatz. Ziehen an Knoten
// oder Griffen schreibt das Versatzfeld der Pose (`pose.linien`, Ruheraum), der Worker legt die Lippen genau darauf.
// In Fressen immer Rot und Blau (eigene Anfänge, gemeinsamer Mundwinkel); liegen die Ketten geschlossen aufeinander
// (Idle, gleiche Versätze), eine türkise Linie, die beide schreibt. Stift auf der Linie fügt formneutral ein, Stift oder
// Minus auf einem inneren Knoten löscht ihn (nur in dieser Pose).
import type { Ansicht, LinienKnoten, Pose, PoseLinien, V2, V3T } from '@ee/shape';
import { type KettenName, type PoseLippen, linieEinfuegen, linienAnteilBei, linienGriffAus, linienKnotenVerschieben, linienWirksam, poseLinieAnzeige } from '@ee/shape/kern';
import { ANSICHT_ACHSEN, griffZiehen3, inAnsicht2 } from '@ee/shape/versuch';
import { aktuellesNetz, useNetzStand } from '../kern/netzStand';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

const FARBE = { tuerkis: '#3fd6c0', rot: '#e0306a', blau: '#1832e6', ecke: '#000000' } as const;
const PUNKT_R = 5;
const GRIFF = 6;

/** Rot und Blau der Pose im Tab, wenn der Worker sie für genau diese Pose geliefert hat (Bauweise Kern), sonst null. */
export function poseLippenJetzt(): PoseLippen | null {
  const ui = useUi.getState();
  const ed = useEditor.getState();
  if (ui.bauweise !== 'kern' || ed.modus === 'editor') return null;
  const b = aktuellesNetz()?.netz.pose;
  return b && b.id === ed.modus ? b.lippen : null;
}

/** Hook: Rot und Blau der Pose (neu bei jedem Netz, Tab- und Bauweisenwechsel). */
export function usePoseLippen(): PoseLippen | null {
  useNetzStand((s) => s.version);
  useEditor((s) => s.modus);
  useUi((s) => s.bauweise);
  return poseLippenJetzt();
}

const namen = (l: PoseLippen): KettenName[] => (l.zu ? ['oben'] : ['oben', 'unten']);
const farbe = (l: PoseLippen, n: KettenName) => (l.zu ? FARBE.tuerkis : n === 'oben' ? FARBE.rot : FARBE.blau);

/** Linien, Knoten und Griffe von Rot und Blau der Pose in einem Blatt. */
export function PoseLippenZeichnung({ ansicht, bild, aktiv, l }: { ansicht: Ansicht; bild: (p: V2) => V2; aktiv: boolean; l: PoseLippen }) {
  const auswahl = useUi((s) => s.maulAuswahl);
  const skal = useEditor((s) => s.dok.skalierung);
  const B = (p: readonly number[]) => bild(inAnsicht2([p[0]! / skal, p[1]! / skal, p[2]! / skal], ansicht));
  const pfad = (a: Float32Array) => {
    let d = '';
    for (let j = 0; j < a.length; j += 3) {
      const q = B([a[j]!, a[j + 1]!, a[j + 2]!]);
      d += `${j ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    }
    return d;
  };
  return (
    <g className={aktiv ? 'maul aktiv' : 'maul'} pointerEvents={aktiv ? 'auto' : 'none'} data-pose-lippen={l.zu ? 'zu' : 'getrennt'}>
      {namen(l).map((n) => (
        <g key={n}>
          {ansicht !== 'seite' && <path d={pfad(l[n].links.ist)} fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" opacity={0.85} />}
          <path d={pfad(l[n].rechts.ist)} fill="none" stroke={farbe(l, n)} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {aktiv && <path data-pose-maullinie={n} d={pfad(l[n].rechts.ist)} fill="none" stroke="transparent" strokeWidth={14} />}
        </g>
      ))}
      {aktiv &&
        namen(l).map((n) => {
          const anzeige = poseLinieAnzeige(l, n);
          const gewaehlt = auswahl?.linie === n ? auswahl.indizes : [];
          const K = anzeige.knoten.length;
          return (
            <g key={`k-${n}`}>
              {gewaehlt.map((i) => {
                const k = anzeige.knoten[i];
                if (!k) return null;
                const p = B(k.p);
                return (['ein', 'aus'] as const).map((seite) => {
                  if ((seite === 'ein' && i === 0) || (seite === 'aus' && i === K - 1)) return null;
                  const q = B([k.p[0] + k[seite][0], k.p[1] + k[seite][1], k.p[2] + k[seite][2]]);
                  return (
                    <g key={`${i}-${seite}`} data-pose-maulgriff={`${n}:${i}:${seite}`} className="griff">
                      <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={farbe(l, n)} strokeWidth={1} />
                      <rect x={q.x - 8} y={q.y - 8} width={16} height={16} fill="transparent" />
                      <rect x={q.x - GRIFF / 2} y={q.y - GRIFF / 2} width={GRIFF} height={GRIFF} fill={farbe(l, n)} />
                    </g>
                  );
                });
              })}
              {anzeige.knoten.map((k, i) => {
                const ecke = i === K - 1;
                // gemeinsamer Mundwinkel: einmal zeichnen (gehört Rot)
                if (ecke && n === 'unten' && !gewaehlt.includes(i)) return null;
                const q = B(k.p);
                return (
                  <g key={i} data-pose-maulknoten={`${n}:${i}`} className={gewaehlt.includes(i) ? 'knoten gewaehlt' : 'knoten'}>
                    <circle cx={q.x} cy={q.y} r={10} fill="transparent" />
                    <circle className="maul-punkt" cx={q.x} cy={q.y} r={PUNKT_R} fill={ecke ? FARBE.ecke : farbe(l, n)} stroke={gewaehlt.includes(i) ? '#ffffff' : 'none'} strokeWidth={2} />
                  </g>
                );
              })}
            </g>
          );
        })}
    </g>
  );
}

type Kontext = { ansicht: Ansicht; lokal: (clientX: number, clientY: number) => V2; ziehen: (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: (ev: PointerEvent) => void) => void };

/**
 * Pose-Linien schreiben: Rot oder Blau (geschlossen beide), der Mundwinkel von Blau geht an Rot (gemeinsamer Punkt), alles
 * in der wirksamen Form (Anfang auf der Naht, Mundwinkel aus Rot).
 */
function schreiben(l: PoseLippen, name: KettenName, neu: LinienKnoten[]): void {
  const ed = useEditor.getState();
  const id = ed.modus;
  ed.poseSetzen(id, (p: Pose) => {
    const basis: PoseLinien = p.linien ?? l.knoten;
    let oben = basis.oben;
    let unten = basis.unten;
    if (l.zu) {
      oben = neu;
      unten = neu;
    } else if (name === 'oben') oben = neu;
    else {
      unten = neu;
      const ecke = neu[neu.length - 1]!;
      oben = oben.map((q, i) => (i === oben.length - 1 ? { ...q, d: [...ecke.d] as V3T } : q));
    }
    return { ...p, linien: linienWirksam({ oben, unten }) };
  });
}

/** Zeigereingabe für Rot und Blau der Pose (Stufe Maul); true = verarbeitet. */
export function poseLippenZeiger(e: React.PointerEvent, ctx: Kontext): boolean {
  const l = poseLippenJetzt();
  if (!l) return false;
  const ui = useUi.getState();
  const ed = useEditor.getState();
  const skal = ed.dok.skalierung;
  const achsen = ANSICHT_ACHSEN[ctx.ansicht];
  const kern = (q: V2): V2 => ({ x: q.x * skal, y: q.y * skal });
  const ziel = e.target as Element;
  const knotenEl = ziel.closest('[data-pose-maulknoten]');
  const griffEl = ziel.closest('[data-pose-maulgriff]');
  const linieEl = ziel.closest('[data-pose-maullinie]');
  if (!knotenEl && !griffEl && !linieEl) {
    ui.setzeMaulAuswahl(null);
    return false;
  }
  e.preventDefault();
  e.stopPropagation();
  const knotenVon = (n: KettenName) => l.knoten[n];

  // Stift / Plus / Minus: einfügen (formneutral) und innere Knoten löschen
  if (ui.werkzeug !== 'auswahl' && !e.metaKey) {
    if (knotenEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'minus')) {
      const [n, iStr] = knotenEl.getAttribute('data-pose-maulknoten')!.split(':') as [KettenName, string];
      const i = Number(iStr);
      const ks = knotenVon(n);
      if (i === 0 || i === ks.length - 1) ui.zeigeHinweis('Anfang und Mundwinkel bleiben');
      else {
        schreiben(l, n, ks.filter((_, j) => j !== i));
        ui.setzeMaulAuswahl(null);
      }
    } else if (!knotenEl && linieEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'plus')) {
      const n = linieEl.getAttribute('data-pose-maullinie') as KettenName;
      const s = linienAnteilBei(l, n, achsen, kern(ctx.lokal(e.clientX, e.clientY))).s;
      const r = linieEinfuegen(knotenVon(n), s);
      if (r.index >= 0) {
        schreiben(l, n, r.knoten);
        ui.setzeMaulAuswahl({ linie: n, indizes: [r.index] });
      }
    }
    return true;
  }

  if (griffEl) {
    const [n, iStr, seite] = griffEl.getAttribute('data-pose-maulgriff')!.split(':') as [KettenName, string, 'ein' | 'aus'];
    const i = Number(iStr);
    const basis = knotenVon(n);
    const anzeige0 = poseLinieAnzeige(l, n, basis);
    let brechen = e.altKey;
    ed.beginGeste();
    ctx.ziehen(
      e,
      (ev) => {
        brechen ||= ev.altKey;
        const q = kern(ctx.lokal(ev.clientX, ev.clientY));
        const gezogen = griffZiehen3(anzeige0, i, seite, ctx.ansicht, q, brechen);
        schreiben(l, n, linienGriffAus(l, n, basis, i, gezogen));
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }

  if (knotenEl) {
    const [n, iStr] = knotenEl.getAttribute('data-pose-maulknoten')!.split(':') as [KettenName, string];
    const i = Number(iStr);
    const bisher = ui.maulAuswahl?.linie === n ? ui.maulAuswahl.indizes : [];
    const sel = e.shiftKey ? (bisher.includes(i) ? bisher.filter((x) => x !== i) : [...bisher, i]) : bisher.includes(i) ? bisher : [i];
    ui.setzeMaulAuswahl({ linie: n, indizes: sel });
    if (!sel.includes(i)) return true;
    const basis = knotenVon(n);
    const q0 = kern(ctx.lokal(e.clientX, e.clientY));
    ed.beginGeste();
    ctx.ziehen(
      e,
      (ev) => {
        const q = kern(ctx.lokal(ev.clientX, ev.clientY));
        const delta = [0, 0, 0];
        delta[achsen[0]] = q.x - q0.x;
        delta[achsen[1]] = q.y - q0.y;
        schreiben(l, n, linienKnotenVerschieben(l, n, basis, sel, delta));
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }

  // Linie ohne Werkzeug: wählt die Linie (kein Zug)
  ui.setzeMaulAuswahl(null);
  return true;
}
