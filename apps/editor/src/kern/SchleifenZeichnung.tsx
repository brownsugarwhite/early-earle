// Plan 20.10., V6.2: Vorschau von ⌘R im Blatt — in der Seite die Sprosse jedes geplanten Loops (gelb, mit seinen beiden
// künftigen Knoten), im Top ein Strich quer über den Körper an der Stelle des Loops.

import type { Ansicht, V2 } from '@ee/shape';
import { silhouettenBreite } from '@ee/shape/kern';
import { useEditor } from '../state/editorStore';
import { useSchleifenVorschau } from './schleifenWerkzeug';

const GELB = '#ffd400';

export function SchleifenZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const sprossen = useSchleifenVorschau((s) => s.sprossen);
  const dok = useEditor((s) => s.dok);
  if (!sprossen?.length || (ansicht !== 'seite' && ansicht !== 'top')) return null;
  if (ansicht === 'seite') {
    return (
      <g className="schleifen-vorschau" data-schleifen-vorschau={sprossen.length} pointerEvents="none">
        {sprossen.map((sp, i) => {
          const a = bild(sp.o);
          const b = bild(sp.u);
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={GELB} strokeWidth={2} />
              <circle cx={a.x} cy={a.y} r={4} fill={GELB} stroke="#19232b" strokeWidth={1} />
              <circle cx={b.x} cy={b.y} r={4} fill={GELB} stroke="#19232b" strokeWidth={1} />
            </g>
          );
        })}
      </g>
    );
  }
  // Top: Strich bei x der Sprossenmitte über die ganze Breite des Tops dort
  const br = silhouettenBreite(dok);
  const s = dok.skalierung;
  return (
    <g className="schleifen-vorschau" data-schleifen-vorschau={sprossen.length} pointerEvents="none">
      {sprossen.map((sp, i) => {
        const x = (sp.o.x + sp.u.x) / 2;
        const w = br.top(x * s) / s;
        if (!(w > 0)) return null;
        const a = bild({ x, y: -w });
        const b = bild({ x, y: w });
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={GELB} strokeWidth={2} />;
      })}
    </g>
  );
}
