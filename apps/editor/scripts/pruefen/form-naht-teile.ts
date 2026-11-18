// Plan „Objekte, Spiegel und Nähte“ (18.11.2026), Etappe 4: Teile der Probe `form-naht.ts`.
//
// Das Verbinden selbst (der Schnitt zweier Netze mit der Bibliothek Manifold, die Linien an der Naht) ist seit dem 18.11. abends der
// Baustein von Ozzy, `src/form/naht.ts`; die Probe misst an ihm. Hier bleibt nur, was die Probe zum Aufstellen ihrer zwei Formen
// braucht: eine Form drehen, skalieren und verschieben.
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import type { Loop, LoopPunkt } from '../../../../packages/shape/src/dicht/loops';

/** um die x-Achse gedreht (Grad) */
const gedreht = (p: { x: number; y: number; z: number }, grad: number): { x: number; y: number; z: number } => {
  const c = Math.cos((grad * Math.PI) / 180);
  const sn = Math.sin((grad * Math.PI) / 180);
  return { x: p.x, y: p.y * c - p.z * sn, z: p.y * sn + p.z * c };
};

/** eine Haut um die x-Achse gedreht (`drehX`, Grad), gleichmäßig skaliert (um den Ursprung) und verschoben, als neue Haut derselben Art */
export function hautVersetzt(h: Haut, k: number, d: { x: number; y: number; z: number }, drehX = 0): Haut {
  const pos = Float64Array.from(h.pos);
  for (let v = 0; v < h.n; v++) {
    const q = gedreht({ x: pos[3 * v]!, y: pos[3 * v + 1]!, z: pos[3 * v + 2]! }, drehX);
    pos[3 * v] = q.x * k + d.x;
    pos[3 * v + 1] = q.y * k + d.y;
    pos[3 * v + 2] = q.z * k + d.z;
  }
  return { ...h, pos };
}

/** eine Linie wie `hautVersetzt` (Lagen, Griffe, Stellen längs der Linie); ihre Kreuzungen bekommen `kreuzungPlus` dazu (zwei Formen zählen ihre Kreuzungen jede für sich) */
export function loopVersetzt(l: Loop, k: number, d: { x: number; y: number; z: number }, kreuzungPlus = 0, drehX = 0): Loop {
  const ort = (p: V3): V3 => {
    const q = gedreht(p, drehX);
    return { x: q.x * k + d.x, y: q.y * k + d.y, z: q.z * k + d.z };
  };
  const griff = (g: V3): V3 => {
    const q = gedreht(g, drehX);
    return { x: q.x * k, y: q.y * k, z: q.z * k };
  };
  const ruhe = Float64Array.from(l.ruhe);
  for (let j = 0; j < ruhe.length; j += 3) {
    const q = ort({ x: ruhe[j]!, y: ruhe[j + 1]!, z: ruhe[j + 2]! });
    ruhe[j] = q.x;
    ruhe[j + 1] = q.y;
    ruhe[j + 2] = q.z;
  }
  return {
    ...l,
    s: Float64Array.from(l.s, (x) => x * k),
    laenge: l.laenge * k,
    ruhe,
    punkte: l.punkte.map((p) => {
      const q: LoopPunkt = { ...p, s: p.s * k, ref: ort(p.ref), cur: ort(p.cur) };
      if (p.ein) q.ein = griff(p.ein);
      if (p.aus) q.aus = griff(p.aus);
      if (p.kreuzung !== undefined) q.kreuzung = p.kreuzung + kreuzungPlus;
      return q;
    }),
  };
}
