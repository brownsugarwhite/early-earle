// Versuch 12.10. abends: Wirbelsäule in den 2D-Ansichten, solange die Bauweise „Wirbelsäule“ gewählt ist.
// Seite: Wirbelsäule (dunkelrot) und Sprossen (orange = liegt, Breite aus dem Top; blau = steht, Breite aus der Front).
// Alle Ansichten: Umriss des 3D-Körpers gestrichelt zum Vergleich mit der Zeichnung.

import type { Ansicht, V2 } from '@ee/shape';
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
