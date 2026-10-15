// B4 (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B): schwarze Linie im Seitenblatt einer Pose. Sie ist
// der posierte Umriss des Körpers (`netz.poseSeite` aus dem Worker); Florians Knoten des Seitenprofils sitzen auf ihren
// Hautpunkten und wandern mit der Pose. Ziehen an einem Knoten oder an der Linie bewegt diesen Hautpunkt in der Seite
// (x, y); der Löser im posierten Raum (`posenLoeserBauen`) formt den Körper örtlich (Bi-Laplace, Radius wie der Pinsel,
// außerhalb exakt 0, entferntere Knoten als weiche Anker) und schreibt Ruhe-Deltas in die Form der Pose — ein Undo-Schritt je Zug.
// B6: dasselbe in Front (z, y) und Top (x, z) — Umriss der Pose in diesem Blatt, Knoten der Front- bzw. Top-Kurve und ihre
// Spiegelbilder auf Hautpunkten, Ziehen bindet die zwei Achsen des Blatts.
import type { KaefigDelta, Pose, V2 } from '@ee/shape';
import { ankerVon, bezugAus, formAusFeld, kaefigNachbarn, posenLoeserBauen, spiegelIndex } from '@ee/shape/kern';
import type { Ansicht } from '@ee/shape';
import { aktuellesNetz, useNetzStand } from '../kern/netzStand';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

const FANG_KNOTEN = 9;
const FANG_LINIE = 7;
/** Gewichte: Griff fast hart, übrige Knoten weich gehalten */
const GEWICHT_GRIFF = 1e3;
const GEWICHT_ANKER = 1e2;

/** Achsen der Blätter (Seite x, y; Front z, y; Top x, z) */
const ACHSEN: Record<'seite' | 'front' | 'top', [0 | 1 | 2, 0 | 1 | 2]> = { seite: [0, 1], front: [2, 1], top: [0, 2] };
const blattVon = (a: Ansicht): 'seite' | 'front' | 'top' | null => (a === 'seite' || a === 'front' || a === 'top' ? a : null);

/** Griffdaten der Pose-Linie eines Blatts aus dem zuletzt gebauten Netz. */
function poseBlatt(ansicht: Ansicht) {
  const n = aktuellesNetz()?.netz;
  if (!n) return null;
  return ansicht === 'seite' ? n.poseSeite : ansicht === 'front' ? n.poseFront : ansicht === 'top' ? n.poseTop : null;
}

/** Ist die Pose-Linie in diesem Blatt aktiv? (Bauweise Kern, Seite/Front/Top, Ziel = Pose, Stufe Körper oder Posen & Leben) */
export function poseLinieAktiv(ansicht: Ansicht): boolean {
  const ui = useUi.getState();
  const ed = useEditor.getState();
  return blattVon(ansicht) !== null && ui.bauweise === 'kern' && ed.modus !== 'editor' && (ui.ebene === 'form' || ui.ebene === 'posen');
}

/**
 * Umriss und Knoten der Pose im Seitenblatt (Kern-Koordinaten über `bild` in Profil-Einheiten). Ohne `aktiv` (andere
 * Stufen) nur die Linie als Bezug, ohne Knoten und ohne Zeiger.
 */
export function PoseLinieZeichnung({ ansicht, bild, skal, aktiv }: { ansicht: Ansicht; bild: (p: V2) => V2; skal: number; aktiv: boolean }) {
  useNetzStand((s) => s.version);
  useEditor((s) => s.modus);
  useUi((s) => s.ebene);
  const ps = poseBlatt(ansicht);
  const blatt = blattVon(ansicht);
  if (!ps || !blatt || ps.umriss.length < 6) return null;
  const [a0, a1] = ACHSEN[blatt];
  const B = (x: number, y: number) => bild({ x: x / skal, y: y / skal });
  let d = '';
  for (let k = 0; k < ps.umriss.length; k += 2) {
    const q = B(ps.umriss[k]!, ps.umriss[k + 1]!);
    d += `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  }
  return (
    <g data-pose-linie="" pointerEvents={aktiv ? 'auto' : 'none'}>
      <path d={d + 'Z'} fill="none" stroke="var(--kurve)" strokeWidth={3} strokeLinejoin="round" />
      {aktiv && Array.from(ps.knoten).map((k, i) => {
        if (k < 0) return null;
        const q = B(ps.lage[3 * k + a0]!, ps.lage[3 * k + a1]!);
        return (
          <g key={i} data-pose-knoten={i} className="knoten">
            <circle cx={q.x} cy={q.y} r={10} fill="transparent" />
            <circle className="knoten-punkt" cx={q.x} cy={q.y} r={5} fill="var(--punkt)" />
          </g>
        );
      })}
    </g>
  );
}

type Kontext = { ansicht: Ansicht; lokal: (clientX: number, clientY: number) => V2; ziehen: (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: (ev: PointerEvent) => void) => void };

/** Knoten oder Linie der Pose greifen und ziehen; true, wenn etwas getroffen wurde. */
export function poseLinieZeiger(e: React.PointerEvent, ctx: Kontext): boolean {
  if (!poseLinieAktiv(ctx.ansicht)) return false;
  const n = aktuellesNetz();
  const ps = poseBlatt(ctx.ansicht);
  const blatt = blattVon(ctx.ansicht);
  if (!blatt) return false;
  const [a0, a1] = ACHSEN[blatt];
  const b = n?.netz.pose;
  const tr = n?.netz.treffer;
  if (!n || !ps || !b || !tr) return false;
  const skal = useEditor.getState().dok.skalierung;
  const kern = (cx: number, cy: number): V2 => {
    const q = ctx.lokal(cx, cy);
    return { x: q.x * skal, y: q.y * skal };
  };
  const p0 = kern(e.clientX, e.clientY);
  // Fangweiten in Kern-Einheiten (Pixel des Blatts)
  const px = Math.hypot(kern(e.clientX + 10, e.clientY).x - p0.x, kern(e.clientX, e.clientY + 10).y - p0.y) / Math.SQRT2 / 10;
  const lage = (k: number): V2 => ({ x: ps.lage[3 * k + a0]!, y: ps.lage[3 * k + a1]! });
  let ziel = -1;
  let bd = FANG_KNOTEN * px;
  ps.knoten.forEach((k) => {
    if (k < 0) return;
    const d = Math.hypot(lage(k).x - p0.x, lage(k).y - p0.y);
    if (d < bd) {
      bd = d;
      ziel = k;
    }
  });
  if (ziel < 0) {
    bd = FANG_LINIE * px;
    for (let k = 0; k < ps.punkte.length; k++) {
      const d = Math.hypot(lage(k).x - p0.x, lage(k).y - p0.y);
      if (d < bd) {
        bd = d;
        ziel = k;
      }
    }
  }
  if (ziel < 0) return false;
  e.preventDefault();
  e.stopPropagation();
  const nR = b.ruhe.length / 3;
  const zeile = (k: number) => ({ index: ps.zeilenIndex.subarray(ps.zeilenStart[k]!, ps.zeilenStart[k + 1]!), wert: ps.zeilenWert.subarray(ps.zeilenStart[k]!, ps.zeilenStart[k + 1]!) });
  const ruhePunkt = (k: number): [number, number, number] => {
    const z = zeile(k);
    const o: [number, number, number] = [0, 0, 0];
    for (let t = 0; t < z.index.length; t++) {
      const j = z.index[t]!;
      o[0] += z.wert[t]! * b.ruhe[3 * j]!;
      o[1] += z.wert[t]! * b.ruhe[3 * j + 1]!;
      o[2] += z.wert[t]! * b.ruhe[3 * j + 2]!;
    }
    return o;
  };
  // Einflussbereich wie beim Pinsel ([ ] ändert ihn): Käfigpunkte (Ruhe) im Radius um den Griff. Knoten näher als der
  // halbe Radius gehen mit (verankert gäben sie eine spitze Beule — gemessen am Rex: 5 Käfigpunkte, Horn an der
  // Schnauze), weiter entfernte im Bereich bleiben weich verankert, außerhalb ist alles fest.
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 1; i < b.ruhe.length; i += 3) {
    yMin = Math.min(yMin, b.ruhe[i]!);
    yMax = Math.max(yMax, b.ruhe[i]!);
  }
  const H = yMax - yMin;
  const mitte = ruhePunkt(ziel);
  const radius = Math.max(0.12, useUi.getState().pinselRadius) * H;
  const anker = Array.from(new Set(Array.from(ps.knoten).filter((k) => k >= 0 && k !== ziel))).filter((k) => {
    const q = ruhePunkt(k);
    return Math.hypot(q[0] - mitte[0], q[1] - mitte[1], q[2] - mitte[2]) > 0.5 * radius;
  });
  const bereich: number[] = [];
  for (let i = 0; i < nR; i++) if (Math.hypot(b.ruhe[3 * i]! - mitte[0], b.ruhe[3 * i + 1]! - mitte[1], b.ruhe[3 * i + 2]! - mitte[2]) < radius) bereich.push(i);
  const loeser = posenLoeserBauen({
    n: nR,
    nachbarn: kaefigNachbarn(tr.kaefig.fStart, tr.kaefig.fVerts, nR),
    ruhe: b.ruhe,
    dreh: b.dreh,
    spiegel: spiegelIndex(b.ruhe, nR),
    bereich,
    bedingungen: [{ ...zeile(ziel), achsen: [a0, a1], gewicht: GEWICHT_GRIFF }, ...anker.map((k) => ({ ...zeile(k), achsen: [a0, a1], gewicht: GEWICHT_ANKER }))],
  });
  const formStart = new Float64Array(b.form);
  const bezug = bezugAus(b.ruhe);
  const ankerFeld = n.netz.anker;
  const ed = useEditor.getState();
  ed.beginGeste();
  ctx.ziehen(
    e,
    (ev) => {
      const p = kern(ev.clientX, ev.clientY);
      const d = loeser.loesen([[p.x - p0.x, p.y - p0.y], ...anker.map(() => [0, 0])]);
      const form = new Float64Array(formStart.length);
      for (let k = 0; k < form.length; k++) form[k] = formStart[k]! + d[k]!;
      const deltas: KaefigDelta[] = formAusFeld(b.ruhe, nR, form).map((q) => {
        const a = ankerVon(ankerFeld, q.punkt);
        return a ? { ...q, anker: a } : q;
      });
      useEditor.getState().poseSetzen(b.id, (pose: Pose) => {
        const neu: Pose = { ...pose, form: deltas, bezug };
        delete neu.formAlt;
        return neu;
      });
    },
    () => useEditor.getState().endeGeste(),
  );
  return true;
}
