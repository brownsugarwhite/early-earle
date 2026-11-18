// Plan vom 12.11.2026, Schritt 4: der kleine Beweis „Donut“ vor dem Umbau auf die halbe Haut, im Kern ohne Fenster.
// Kugel mit drei Loops; der Punkt an ihrer Seite (Kreuzung der beiden Ringe) wird durch die Spiegelebene gezogen. Verglichen wird:
//   heute       die ganze Haut gerechnet, beide Hälften laufen durcheinander; gezeigt wird jede Hälfte bis zur Ebene (so zeigt es
//               das Fenster seit dem 11.11.): Wie sieht der Rand des Lochs aus?
//   verschmolzen  die Hälfte ist die Wahrheit: an der Ebene abgeschnitten, mit ihrem Spiegelbild zu einer Haut verbunden (der Rand
//               des Lochs sind Punkte der Mittelebene), dann rechnet die heutige Rechnung auf dieser Haut weiter
//               · frei: der Rand ist keine Linie   · als Linie der Mittelebene   · als Linie, die keine Wölbung vorgibt (Ecken)
//   zurück      den Punkt wieder an seinen Ort: Ist die Form die von vorher?
// Ergebnis vom 13.11. (`docs/UEBERGABE.md`, Abschnitt 7; Bild `docs/progress/editor/schritt4-donut-2026-11-13.jpg`): Der Rand des
// Lochs ist heute eine scharfe Kante (Knick im Mittel 97°) und bleibt verschmolzen eine (im Mittel 22° bis 77°, größter 84° bis
// 150°); mit freiem Rand verzieht sich das Loch. Zurückgezogen ist die Kugel wieder da (im Mittel 0,11, größter 0,4).
// Aufruf aus packages/shape: BLATT=<pfad ohne Endung> npx vite-node ../../apps/editor/scripts/pruefen/form-donut.ts
//   TIEF=190 (so weit wird der Punkt gezogen; die Kugel hat Radius 150)   DREIECKE=2000
import { type V3, hautSeiten } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, festlegen, mittlereKante, verschiebungLaengs } from '../../../../packages/shape/src/dicht/loops';
import { flaechenAbstand } from './flaechenabstand';
import { type BlattBild, blattSchreiben } from './form-direkt-blatt';
import { R, kugelMit, nachVerdichten } from './form-direkt-faelle';
import { fz, heute, kopie, lochMass, loopsKopie, randKnick, schnittY, verschmelzen, z1, z2 } from './form-donut-teile';

const TIEF = Number(process.env.TIEF ?? 190);
const DREIECKE = Number(process.env.DREIECKE ?? 2000);

const start = kugelMit('drei', DREIECKE);
const mk = mittlereKante(start.h);
// der Punkt an der Seite: die Kreuzung mit dem größten z
let wahl: { kreuzung: number; z: number } | null = null;
for (const l of start.loops) for (const p of l.punkte) if (p.kreuzung !== undefined && (!wahl || p.ref.z > wahl.z)) wahl = { kreuzung: p.kreuzung, z: p.ref.z };
const kz = wahl!.kreuzung;
const lagenBei = (loops: readonly Loop[], tief: number): Float64Array[] =>
  loops.map((l) => {
    let irgend = false;
    const D: V3[] = l.punkte.map((p) => {
      const mit = p.kreuzung === kz;
      if (mit) irgend = true;
      return mit ? { x: 0, y: 0, z: -tief } : { x: 0, y: 0, z: 0 };
    });
    if (!irgend) return Float64Array.from(l.ruhe);
    const d = verschiebungLaengs(l, D);
    return Float64Array.from(l.ruhe, (x, k) => x + d[k]!);
  });
console.log(`Kugel mit drei Loops (${start.h.n} Punkte, Radius ${R}); der Punkt an der Seite (z = ${z1(wahl!.z)}) wird um ${TIEF} durch die Spiegelebene gezogen (bis z = ${z1(wahl!.z - TIEF)})`);

// heute: die ganze Haut gerechnet
const wahr = { h: kopie(start.h), loops: loopsKopie(start.loops) };
const lagen = lagenBei(wahr.loops, TIEF);
const rH = heute(wahr.h, wahr.loops, lagen);
let unter = 0;
const seiten = hautSeiten(wahr.h)!;
for (let v = 0; v < wahr.h.n; v++) if (seiten[v]! > 0 && wahr.h.pos[3 * v + 2]! < 0) unter++;
console.log(`heute: ${rH.runden} Runden bis zur Ruhe${rH.steht ? '' : ' (steht nicht)'}; ${unter} Punkte der einen Hälfte liegen auf der Seite der anderen; an der gerechneten Haut ${fz(wahr.h)}`);
for (const l of wahr.loops) festlegen(wahr.h, l);

// gezeigt wie im Fenster: an der Ebene abgeschnitten und zusammengesetzt, nichts weiter gerechnet
const gezeigt = verschmelzen(wahr.h, wahr.loops, false);
const kH = randKnick(gezeigt.h, gezeigt.rand);
console.log(`   gezeigt (jede Hälfte bis zur Ebene): ${gezeigt.h.n} Punkte, ${lochMass(gezeigt.h, gezeigt.rand)}, ${gezeigt.rand.length} Punkte am Rand; Knick quer über den Rand im Mittel ${z1(kH.mittel)}°, größter ${z1(kH.max)}°`);

const bilder: BlattBild[] = [
  { name: 'vorher', h: start.h, loops: start.loops, schnitt: { titel: 'Schnitt quer durch die Mitte (von oben gesehen)', strecken: schnittY(start.h), mass: 420 } },
  {
    name: 'heute: jede Hälfte wird bis zur Mitte gezeigt',
    h: gezeigt.h,
    loops: gezeigt.loops,
    notiz: `${lochMass(gezeigt.h, gezeigt.rand)}. Knick quer über den Rand: im Mittel ${z1(kH.mittel)}°, größter ${z1(kH.max)}°.`,
    schnitt: { titel: 'Schnitt quer durch die Mitte (von oben gesehen)', strecken: schnittY(gezeigt.h), mass: 420 },
  },
];

// verschmolzen: die heutige Rechnung auf der verbundenen Haut (Rand frei / Rand als Linie)
for (const [randLinie, weich, randName] of [
  [false, false, 'frei (keine Linie)'],
  [true, false, 'als Linie der Mittelebene'],
  [true, true, 'als Linie, die keine Wölbung vorgibt'],
] as const) {
  let v = verschmelzen(wahr.h, wahr.loops, randLinie, weich);
  const vor = kopie(v.h);
  let text = '';
  try {
    const r = heute(v.h, v.loops, v.loops.map((l) => l.ruhe), 0, 200);
    // was das Schneiden an schmalen Dreiecken hinterlässt, räumt das Verdichten auf; danach noch einmal bis zur Ruhe
    for (const l of v.loops) festlegen(v.h, l);
    const randOrte = v.rand.map((i) => [v.h.pos[3 * i]!, v.h.pos[3 * i + 1]!] as const);
    const d = nachVerdichten(v.h, v.loops, mk);
    v = { h: d.h, loops: d.loops, rand: [], von: v.von };
    const r2 = heute(v.h, v.loops, v.loops.map((l) => l.ruhe), 0, 200);
    // der Rand danach: die Punkte der Ebene nahe den alten Randpunkten
    const rand: number[] = [];
    for (let i = 0; i < v.h.n; i++) {
      if (v.h.spiegel[i] !== i) continue;
      if (randLinie ? v.loops.some((l, li) => li >= v.loops.length - 1 && l.art === 'mitte' && l.proben.some((p) => p.ecken[0] === i)) : randOrte.some(([x, y]) => Math.hypot(v.h.pos[3 * i]! - x, v.h.pos[3 * i + 1]! - y) < 0.75 * mk) && Math.hypot(v.h.pos[3 * i]!, v.h.pos[3 * i + 1]!) < 0.8 * R) rand.push(i);
    }
    v.rand = rand;
    const k = randKnick(v.h, rand);
    const d0 = Array.from(flaechenAbstand(Array.from({ length: v.h.n }, (_, i) => [v.h.pos[3 * i]!, v.h.pos[3 * i + 1]!, v.h.pos[3 * i + 2]!] as [number, number, number]), Array.from({ length: vor.n }, (_, i) => [vor.pos[3 * i]!, vor.pos[3 * i + 1]!, vor.pos[3 * i + 2]!] as [number, number, number]), Array.from({ length: vor.tri.length / 3 }, (_, t) => [vor.tri[3 * t]!, vor.tri[3 * t + 1]!, vor.tri[3 * t + 2]!]), 30));
    const weit = Math.max(...d0);
    text = `${r.runden} + ${r2.runden} Runden bis zur Ruhe${r.steht && r2.steht ? '' : ' (steht nicht)'}; ${v.h.n} Punkte, ${lochMass(v.h, rand)}; Knick quer über den Rand im Mittel ${z1(k.mittel)}°, größter ${z1(k.max)}°; die Haut liegt bis ${z1(weit)} neben der gezeigten von heute; ${fz(v.h)}`;
  } catch (e) {
    text = `die heutige Rechnung hält auf der verbundenen Haut nicht: ${(e as Error).message}`;
  }
  console.log(`verschmolzen, Rand ${randName}: ${text}`);
  bilder.push({
    name: `verschmolzen, Rand ${randName}`,
    h: v.h,
    loops: v.loops,
    notiz: text,
    schnitt: { titel: 'Schnitt quer durch die Mitte (von oben gesehen)', strecken: schnittY(v.h), mass: 420 },
  });
}

// zurück: den Punkt wieder an seinen Ort (die Wahrheit ist die ganze Haut von heute; die Verschmelzung ist nur abgeleitet)
{
  const zurueck = lagenBei(start.loops, 0);
  const r = heute(wahr.h, wahr.loops, zurueck);
  const d = flaechenAbstand(Array.from({ length: wahr.h.n }, (_, i) => [wahr.h.pos[3 * i]!, wahr.h.pos[3 * i + 1]!, wahr.h.pos[3 * i + 2]!] as [number, number, number]), Array.from({ length: start.h.n }, (_, i) => [start.h.pos[3 * i]!, start.h.pos[3 * i + 1]!, start.h.pos[3 * i + 2]!] as [number, number, number]), Array.from({ length: start.h.tri.length / 3 }, (_, t) => [start.h.tri[3 * t]!, start.h.tri[3 * t + 1]!, start.h.tri[3 * t + 2]!]), 30);
  let m = 0;
  let s = 0;
  for (const x of d) {
    m = Math.max(m, x);
    s += x;
  }
  const text = `${r.runden} Runden${r.steht ? '' : ' (steht nicht)'}; gegen die Kugel von vorher: im Mittel ${z2(s / d.length)}, größter ${z1(m)}; ${fz(wahr.h)}`;
  console.log(`zurückgezogen (heutige Rechnung, ganze Haut): ${text}`);
  bilder.push({ name: 'zurückgezogen', h: wahr.h, loops: wahr.loops, notiz: text, schnitt: { titel: 'Schnitt quer durch die Mitte (von oben gesehen)', strecken: schnittY(wahr.h), mass: 420 } });
}

if (process.env.BLATT) {
  blattSchreiben(`${process.env.BLATT}.html`, 'Schritt 4, kleiner Beweis: der Donut (ein Punkt der Seite durch die Mitte gezogen)', [
    {
      titel: `Kugel mit drei Loops, der Punkt an der Seite um ${TIEF} durch die Spiegelebene gezogen`,
      blicke: [
        ['schräg von vorn', -40, 20, 0.8],
        ['von der Seite auf die Mitte', 0, 0, 0.8],
      ],
      bilder,
    },
  ]);
  console.log(`${process.env.BLATT}.html`);
}
