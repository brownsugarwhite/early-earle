// Plan 20.10., V6.2: Vorschau von ⌘R im Blatt — in der Seite die Sprosse jedes geplanten Loops (gelb, mit seinen beiden
// künftigen Knoten); dazu ein Strich quer über den Körper dort, wo sein Breitenknoten entsteht: im Top bei x (liegender Ring)
// bzw. in der Front auf seiner Höhe (stehender Ring).

import type { Ansicht, V2 } from '@ee/shape';
import { ringSteht, silhouettenBreite } from '@ee/shape/kern';
import { useEditor } from '../state/editorStore';
import { useSchleifenVorschau } from './schleifenWerkzeug';

const GELB = '#ffd400';

export function SchleifenZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const sprossen = useSchleifenVorschau((s) => s.sprossen);
  const dok = useEditor((s) => s.dok);
  if (!sprossen?.length) return null;
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
  // Top (liegende Ringe): Strich bei x der Sprossenmitte über die ganze Breite; Front (stehende): auf der Höhe der Mitte
  const br = silhouettenBreite(dok);
  const s = dok.skalierung;
  const striche = sprossen.flatMap((sp, i) => {
    const steht = ringSteht(sp.o, sp.u);
    if ((ansicht === 'top') === steht) return [];
    if (ansicht === 'top') {
      const x = (sp.o.x + sp.u.x) / 2;
      const w = br.top(x * s) / s;
      return w > 0 ? [{ i, a: bild({ x, y: -w }), b: bild({ x, y: w }) }] : [];
    }
    const y = (sp.o.y + sp.u.y) / 2;
    const w = br.front(y * s) / s;
    return w > 0 ? [{ i, a: bild({ x: -w, y }), b: bild({ x: w, y }) }] : [];
  });
  if (!striche.length) return null;
  return (
    <g className="schleifen-vorschau" data-schleifen-vorschau={striche.length} pointerEvents="none">
      {striche.map(({ i, a, b }) => (
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={GELB} strokeWidth={2} />
      ))}
    </g>
  );
}
