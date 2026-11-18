// Plan 20.10., V6.2: Vorschau von ⌘R im Blatt — in der Seite die Sprosse jedes geplanten Loops (gelb, mit seinen beiden
// künftigen Knoten); dazu ein Strich quer über den Körper dort, wo sein Breitenknoten entsteht: im Top bei x (liegender Ring)
// bzw. in der Front auf seiner Höhe (stehender Ring).
// V6.4: die Loops selbst in jedem Blatt (`SchleifenLinien`) — dieselben Farben wie auf der Bühne, verdeckte Stücke blass
// gestrichelt; mit der Auswahl greifbar (Klick wählt, ⇧ hinzu, Ziehen verschiebt), dazu das Kreuz einer laufenden G/S/R.

import type { Ansicht, V2 } from '@ee/shape';
import { ringSteht, silhouettenBreite } from '@ee/shape/kern';
import { useEditor } from '../state/editorStore';
import { blickVon, useUi } from '../state/uiStore';
import { useNetzStand } from './netzStand';
import { SCHLEIFE_FARBE, type SchleifenAnzeige, gewaehlteSchleifen, schleifeAmZeiger, schleifeHover, schleifenImBlatt, useSchleife } from './schleifenAuswahl';
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

/** Kreuz in der Mitte einer laufenden G/S/R auf einem Loop, bei S und R die gestrichelte Linie zum Zeiger (wie V3). */
function SchleifenKreuz({ a, bild }: { a: SchleifenAnzeige; bild: (p: V2) => V2 }) {
  const c = bild(a.mitte);
  const z = bild(a.zeiger);
  return (
    <g className="schleifen-modal" data-schleifen-modal={a.art} pointerEvents="none">
      {a.art !== 'g' && <line x1={c.x} y1={c.y} x2={z.x} y2={z.y} stroke="#19232b" strokeOpacity={0.7} strokeWidth={1} strokeDasharray="3 3" />}
      <g stroke="#19232b" strokeWidth={1.5}>
        <line x1={c.x - 6} y1={c.y} x2={c.x + 6} y2={c.y} />
        <line x1={c.x} y1={c.y - 6} x2={c.x} y2={c.y + 6} />
      </g>
    </g>
  );
}

/**
 * Die Loops im Blatt: Seite = die nahe Hälfte des Rings (von Rücken- zu Bauchknoten), sonst der ganze Ring; sichtbare Stücke
 * kräftig, verdeckte blass gestrichelt. Orange, unter dem Zeiger pink, gewählt türkis mit dunklem Grund (lesbar auf jedem
 * Grund). `aktiv` (Stufe Körper, Grundform): mit der Auswahl greifbar über eine unsichtbare, 10 px breite Trefferlinie.
 */
export function SchleifenLinien({ ansicht, bild, aktiv }: { ansicht: Ansicht; bild: (p: V2) => V2; aktiv: boolean }) {
  useNetzStand((s) => s.version);
  const blick = useUi((s) => blickVon(ansicht, s.blick));
  const ebene = useUi((s) => s.ebene);
  const bauweise = useUi((s) => s.bauweise);
  const werkzeug = useUi((s) => s.werkzeug);
  // die Farbe „gewählt“ hängt an der Auswahl der Knoten
  useUi((s) => s.auswahl);
  const modus = useEditor((s) => s.modus);
  const hover = useSchleife((s) => s.hover);
  const anzeige = useSchleife((s) => s.anzeige);
  if (ebene !== 'form' || bauweise !== 'kern' || modus !== 'editor') return null;
  const loops = schleifenImBlatt(ansicht, blick);
  if (!loops.length) return null;
  const gewaehlt = gewaehlteSchleifen();
  const pfad = (pts: V2[]) =>
    pts
      .map((p, k) => {
        const q = bild(p);
        return `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      })
      .join('');
  return (
    <g
      className="schleifen-linien"
      data-schleifen-linien={loops.length}
      // Hover über die Gruppe: die nächste Linie leuchtet (die Trefferlinien dichter Loops überlappen)
      onPointerMove={(e) => schleifeHover(schleifeAmZeiger(ansicht, e.clientX, e.clientY))}
      onPointerLeave={() => schleifeHover(null)}
    >
      {loops.map((s) => {
        const zustand = s.id === hover ? 'hover' : gewaehlt.has(s.id) ? 'gewaehlt' : 'normal';
        const breite = zustand === 'normal' ? 1.75 : 2.5;
        return (
          <g key={s.id} data-schleife={s.id} data-zustand={zustand}>
            {s.stuecke.map((st, i) => {
              const d = pfad(st.punkte);
              return (
                <g key={i} pointerEvents="none">
                  {zustand === 'gewaehlt' && st.sicht && <path d={d} fill="none" stroke="#19232b" strokeOpacity={0.55} strokeWidth={breite + 2} strokeLinejoin="round" strokeLinecap="round" />}
                  <path
                    data-sicht={st.sicht ? 1 : 0}
                    d={d}
                    fill="none"
                    stroke={SCHLEIFE_FARBE[zustand]}
                    strokeWidth={st.sicht ? breite : 1.25}
                    strokeDasharray={st.sicht ? undefined : '3 4'}
                    strokeOpacity={st.sicht ? 1 : 0.45}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
            {aktiv && werkzeug === 'auswahl' && (
              <path
                data-schleife-linie={s.id}
                d={pfad(s.alle)}
                fill="none"
                stroke="transparent"
                strokeWidth={10}
                pointerEvents="stroke"
                style={{ cursor: 'pointer' }}
              />
            )}
          </g>
        );
      })}
      {anzeige && anzeige.feld === ansicht && <SchleifenKreuz a={anzeige} bild={bild} />}
    </g>
  );
}
