// Plan 20.10., V3: Anzeige einer laufenden Operation G/S/R im Blatt — Mitte als Kreuz, gestrichelte Linie Mitte–Zeiger
// (S, R), Achsenlinie durch die Mitte in Blender-Farben (X rot, Y grün, Z blau), Einflusskreis (proportional).

import type { Ansicht, V2 } from '@ee/shape';
import { useUi } from '../../state/uiStore';
import { BLATT_ACHSEN } from './abbildung';

const ACHSEN_FARBE = { x: '#e5484d', y: '#3fae4f', z: '#3b6fe0' } as const;

export function ModalZeichnung({ ansicht, bild, w, h }: { ansicht: Ansicht; bild: (p: V2) => V2; w: number; h: number }) {
  const m = useUi((s) => s.modal);
  if (!m || m.ansicht !== ansicht) return null;
  const c = bild(m.mitte);
  const z = bild(m.zeiger);
  const r = m.radius > 0 ? Math.hypot(bild({ x: m.mitte.x + m.radius, y: m.mitte.y }).x - c.x, bild({ x: m.mitte.x + m.radius, y: m.mitte.y }).y - c.y) : 0;
  // Achsenlinie: genau eine freie Richtung → Linie durch die Mitte über das ganze Blatt
  const nurU = m.frei && m.frei.u && !m.frei.v;
  const nurV = m.frei && m.frei.v && !m.frei.u;
  const [au, av] = BLATT_ACHSEN[ansicht];
  return (
    <g className="modal-zeichnung" data-modal={m.art} pointerEvents="none">
      {nurU && <line data-achsenlinie={au} x1={0} y1={c.y} x2={w} y2={c.y} stroke={ACHSEN_FARBE[au]} strokeWidth={1.5} />}
      {nurV && <line data-achsenlinie={av} x1={c.x} y1={0} x2={c.x} y2={h} stroke={ACHSEN_FARBE[av]} strokeWidth={1.5} />}
      {r > 0 && <circle data-einfluss={r.toFixed(1)} cx={c.x} cy={c.y} r={r} fill="rgba(25,35,43,0.05)" stroke="#19232b" strokeOpacity={0.55} strokeWidth={1.2} strokeDasharray="4 3" />}
      {m.art !== 'g' && <line x1={c.x} y1={c.y} x2={z.x} y2={z.y} stroke="#19232b" strokeOpacity={0.7} strokeWidth={1} strokeDasharray="3 3" />}
      <g stroke="#19232b" strokeWidth={1.5}>
        <line x1={c.x - 6} y1={c.y} x2={c.x + 6} y2={c.y} />
        <line x1={c.x} y1={c.y - 6} x2={c.x} y2={c.y + 6} />
      </g>
    </g>
  );
}
