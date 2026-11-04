// Versuch 13.10. nachmittags: Bauweise „rund“ in den 2D-Ansichten. Alle Ansichten zeigen den Umriss des 3D-Körpers
// gestrichelt (Vergleich mit der Zeichnung): Wo er abweicht, widersprechen sich die Ansichten oder die Rundung kann die
// Form nicht (flache Unterseite, Haken im Top).

import type { Ansicht, V2 } from '@ee/shape';
import { useUi } from '../state/uiStore';
import { useRundAnzeige } from './rundBau';

export const RUND_UMRISS = '#1d3f8f';

export function RundZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const bauweise = useUi((s) => s.bauweise);
  const umrisse = useRundAnzeige((s) => s.umrisse);
  if (bauweise !== 'rund') return null;
  const zug = (pts: readonly V2[]) =>
    pts
      .map((p, k) => {
        const q = bild(p);
        return `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      })
      .join('') + 'Z';
  return (
    <g className="rund-ebene" pointerEvents="none" data-rund={ansicht}>
      {(umrisse?.[ansicht] ?? []).map((z, i) => (
        <path key={i} d={zug(z)} fill="none" stroke={RUND_UMRISS} strokeWidth={1.5} strokeDasharray="6 4" data-rundumriss="" />
      ))}
    </g>
  );
}
