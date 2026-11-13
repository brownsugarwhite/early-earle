// Eine gesicherte Form lesen, wie Florian sie gebaut hat: je Loop Art und Kante, je Punkt Ort, Griffe (Richtung und Länge), Angaben
// (Kreuzung, Kante, Ecke, Mundwinkel) und der Knick der Linie am Punkt. An einer Kreuzung dazu: der Knick jeder Linie für sich und
// der Winkel des Griffs gegen die kreuzende Linie, von der Seite gesehen (x, y).
//
// Dazu der Knick der Haut quer über jede Linie (an ihren Enden, an ihren Punkten, im Mittel) und, wo eine Linie auf der Mittelebene
// endet, der Knick der Haut dort von der Seite (im Schnitt durch die Mitte).
//
// Aufruf aus packages/shape: NAME=simple_mouth npx vite-node ../../apps/editor/scripts/pruefen/form-linien.ts
//   KLEIN=0: nicht auf das kleine Rechennetz vergröbern
import type { V3 } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, griffeBei, istEcke, istEckeVonSelbst, kanteBei, knickAm, knickWinkel } from '../../../../packages/shape/src/dicht/loops';
import { formLaden } from './form-direkt-faelle';

const NAME = process.env.NAME ?? 'simple_mouth';
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const ort = (p: V3): string => `(${z1(p.x)}, ${z1(p.y)}, ${z1(p.z)})`;
const laenge = (v: V3): number => Math.hypot(v.x, v.y, v.z);
const griff = (v: V3 | undefined): string => (v ? `${ort(v)} L ${z1(laenge(v))}` : '–');
/** Winkel zwischen zwei Richtungen in der Seite (x, y), Grad */
const winkelSeite = (a: V3, b: V3): number => {
  const la = Math.hypot(a.x, a.y);
  const lb = Math.hypot(b.x, b.y);
  if (!(la > 1e-9 && lb > 1e-9)) return NaN;
  return (Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (la * lb)))) * 180) / Math.PI;
};

const { h, loops, mk } = formLaden(NAME, process.env.KLEIN !== '0');
console.log(`Form „${NAME}“: ${h.n} Punkte, ${loops.length} Loops, Maschenweite ${z1(mk)}`);
const an = new Map<number, { l: Loop; i: number }[]>();
loops.forEach((l) =>
  l.punkte.forEach((p, i) => {
    if (p.kreuzung === undefined) return;
    an.set(p.kreuzung, [...(an.get(p.kreuzung) ?? []), { l, i }]);
  }),
);
for (const l of loops) {
  const k = kanteBei(l, loops);
  const hart = k.reduce((s, x) => s + x, 0);
  const weitere = Object.keys(l).filter((x) => !['id', 'art', 'proben', 's', 'laenge', 'ruhe', 'punkte', 'kante', 'pfad'].includes(x));
  console.log(
    `\nLoop ${l.id}: ${l.art}, Kante des Loops ${l.kante ?? '–'}, ${l.proben.length} Proben (davon ${hart} hart gerechnet), Länge ${z1(l.laenge)}` +
      `${weitere.length ? `, dazu ${weitere.join(', ')}` : ''}`,
  );
  l.punkte.forEach((p, i) => {
    const g = griffeBei(l, i);
    const angaben = [
      p.kreuzung !== undefined ? `Kreuzung ${p.kreuzung}` : '',
      p.kante !== undefined ? `Kante ${p.kante}` : '',
      p.ecke !== undefined ? `Ecke von Hand ${p.ecke}` : '',
      istEckeVonSelbst(p) ? 'Ecke von selbst' : '',
      p.mundwinkel ? 'Mundwinkel' : '',
      p.vonSelbst ? 'von selbst (Ringende)' : '',
    ].filter(Boolean);
    console.log(`  Punkt ${i}: s ${z1(p.s)}, Ort ${ort(p.ref)}${istEcke(p) ? `, Knick ${z1(knickAm(l, i))}°` : ', glatt'}${angaben.length ? `; ${angaben.join(', ')}` : ''}`);
    console.log(`      Griff hinein ${griff(g.ein)}   Griff hinaus ${griff(g.aus)}`);
    if (g.ein && g.aus) console.log(`      von der Seite: zwischen beiden Griffen ${z1(winkelSeite(g.ein, g.aus))}°`);
    if (p.kreuzung === undefined) return;
    for (const x of an.get(p.kreuzung) ?? []) {
      if (x.l === l) continue;
      const g2 = griffeBei(x.l, x.i);
      const zeilen: string[] = [];
      for (const [name, a] of [
        ['hinein', g.ein],
        ['hinaus', g.aus],
      ] as const) {
        for (const [name2, b] of [
          ['hinein', g2.ein],
          ['hinaus', g2.aus],
        ] as const) {
          if (a && b) zeilen.push(`${name} gegen ${name2} ${z1(winkelSeite(a, b))}°`);
        }
      }
      console.log(`      von der Seite gegen die Griffe von Loop ${x.l.id}: ${zeilen.join(', ')}`);
    }
  });
}

// der Knick der Haut quer über jede Linie, und an den Enden eines Rings im Schnitt durch die Mitte
console.log('\nKnick der Haut quer über die Linien (Grad):');
for (const l of loops) {
  const kw = knickWinkel(h, l);
  const n = l.proben.length;
  const sortiert = Array.from(kw).sort((a, b) => a - b);
  const anPunkten = l.punkte
    .map((p, i) => {
      let best = 0;
      for (let j = 1; j < n; j++) if (Math.abs(l.s[j]! - p.s) < Math.abs(l.s[best]! - p.s)) best = j;
      return `Punkt ${i}${p.mundwinkel ? ' (Mundwinkel)' : ''} ${z1(kw[best]!)}`;
    })
    .join(', ');
  console.log(`  Loop ${l.id}: Median ${z1(sortiert[n >> 1]!)}, kleinster ${z1(sortiert[0]!)}, größter ${z1(sortiert[n - 1]!)}; ${anPunkten}`);
  if (l.art !== 'ring') continue;
  for (const [name, j] of [
    ['Anfang', 0],
    ['Ende', n - 1],
  ] as const) {
    const v = l.proben[j]!.ecken[0];
    const p = { x: h.pos[3 * v]!, y: h.pos[3 * v + 1]!, z: h.pos[3 * v + 2]! };
    // Nachbarn in der Mittelebene: einer außen, einer im Inneren
    const richtungen = h.nachbarn[v]!
      .filter((u) => Math.abs(h.pos[3 * u + 2]!) < 1e-6)
      .map((u) => ({ x: h.pos[3 * u]! - p.x, y: h.pos[3 * u + 1]! - p.y, z: 0 }));
    if (richtungen.length !== 2) {
      console.log(`    ${name} ${ort(p)}: ${richtungen.length} Nachbarn in der Mittelebene`);
      continue;
    }
    const w = winkelSeite(richtungen[0]!, richtungen[1]!);
    console.log(`    ${name} ${ort(p)}: im Schnitt durch die Mitte stehen die beiden Seiten der Haut ${z1(w)}° zueinander (Knick ${z1(180 - w)}°)`);
  }
}
