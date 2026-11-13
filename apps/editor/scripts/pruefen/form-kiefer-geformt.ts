// Plan vom 12.11.2026, Schritt 6, Etappe 2 (13.11. nachts): Kieferknochen am geformten Maul. Florian: „Dann mache mal Kieferknochen.“
//
// Am geformten Maul ist das, was die Maullinie umschließt, echte Haut (Gaumen und Boden). Die Knochen schneiden nichts weg und setzen
// nichts ein: Gelenk am Mundwinkel und die Gewichte außen wie beim Maul bisher (`maulAmLoop`), innen laufen die Gewichte weich vom
// Boden (an der Unterlippe 1) zum Gaumen (an der Oberlippe 0): `maulGeformtAmLoop`.
//
// Die Probe öffnet den Unterkiefer an einer Form mit geformtem Maul (Kugel mit „Maul formen“, oder eine gesicherte Form) um die
// Winkel KIEFER und meldet je Winkel: umgeschlagene Dreiecke und Knicke über 60° gegen die Ruhe, den Knick der Haut an den Lippen
// (er soll bleiben: Die Lippen drehen starr mit), und wie weit die Lippen vorn auseinander sind. Mit AUS ein Bildblatt zu und offen.
//
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-kiefer-geformt.ts
//   NAME=<gesicherte Form> RING=<Nummer des Loops der Lippen; sonst die Linie mit dem Mundwinkel>   KIEFER=20,40   SCHAEDEL=0
//   DREIECKE=2000 (Kugel)   AUS=<datei.html>
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { knickQuer, knickReihe } from '../../../../packages/shape/src/dicht/kantenWinkel';
import { type Haut, type V3, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, formAusZeichnung, griffeAnlegen, hautLagen, istSichtbar, kanteBei, mittlereKante } from '../../../../packages/shape/src/dicht/loops';
import { maulFormen } from '../../../../packages/shape/src/dicht/maulFormen';
import { maulGeformtAmLoop, mundwinkelProbe } from '../../../../packages/shape/src/dicht/maulLoop';
import { knochenDrehen, knochenWinkel } from '../../../../packages/shape/src/dicht/poseLoop';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import { type BlattBild, type BlattLinie, type BlattSchnitt, blattSchreiben } from './form-direkt-blatt';
import { formLaden, verdichtenWieImFenster } from './form-direkt-faelle';

const NAME = process.env.NAME ?? '';
const DREIECKE = Number(process.env.DREIECKE ?? 2000);
const WINKEL = (process.env.KIEFER ?? '20,40').split(',').map(Number);
const SCHAEDEL = Number(process.env.SCHAEDEL ?? 0);
const AUS = process.env.AUS ?? '';
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });

let haut: Haut;
let loops: Loop[];
let mk: number;
let L: Loop;
if (NAME) {
  const g = formLaden(NAME);
  haut = g.h;
  loops = g.loops;
  mk = g.mk;
  const ring = process.env.RING ? loops.find((l) => l.id === Number(process.env.RING)) : loops.find((l) => l.art === 'ring' && l.punkte.some((p) => p.mundwinkel));
  if (!ring) throw new Error(`in „${NAME}“ ist keine Linie mit einem Mundwinkel (RING=<Nummer> wählt eine)`);
  L = ring;
} else {
  const netz = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke: DREIECKE },
  );
  let h = hautAus(netz.positionen, netz.indizes);
  mk = mittlereKante(h);
  const n = 64;
  const uv = Array.from({ length: n }, (_, i): [number, number] => [-115 + 60 * Math.cos((2 * Math.PI * i) / n), -20 + 14 * Math.sin((2 * Math.PI * i) / n)]);
  const knoten = Array.from({ length: n / 8 }, (_, i) => 8 * i);
  const r0 = loopEinsetzen(h, [formAusZeichnung(h, 'seite', uv, knoten, 1)!], 0)!;
  h = r0.haut;
  griffeAnlegen(r0.loops[0]!, r0.loops[0]!.ruhe, true);
  const r = maulFormen(h, r0.loops, 1, { naechsteId: 2, naechsteKreuzung: 1, verdichten: { maxKante: 1.75 * mk, opt: verdichtenWieImFenster(mk) } });
  if ('fehler' in r) throw new Error(r.fehler);
  haut = r.haut;
  loops = r.loops;
  L = loops.find((l) => l.id === 1)!;
}
const sW = L.punkte.find((p) => p.mundwinkel)?.s ?? L.s[mundwinkelProbe(L)]!;
let ecke = 1;
for (let j = 1; j < L.proben.length - 1; j++) if (Math.abs(L.s[j]! - sW) < Math.abs(L.s[ecke]! - sW)) ecke = j;
const m = maulGeformtAmLoop(haut, L, ecke, { zelle: mk / 2 });
if (!m) throw new Error('das Maul lässt sich an dieser Linie nicht anlegen');
const G = m.gelenk;
const R = knickReihe(haut, L);
// Gewichte innen: von Boden (1) zu Gaumen (0)
{
  const innen: number[] = [];
  if (R) for (let v = 0; v < haut.n; v++) if (R.innen[v]) innen.push(m.gewicht[v]!);
  const sort = [...innen].sort((a, b) => a - b);
  console.log(
    `${NAME ? `Form „${NAME}“` : 'Kugel mit geformtem Maul'}: ${haut.n} Punkte; Lippenlinie Loop ${L.id}; Gelenk (${z1(G.x)}, ${z1(G.y)}), Drehsinn ${m.drehsinn}; ` +
      `im Maul ${innen.length} Punkte, Gewicht von ${z2(sort[0] ?? NaN)} bis ${z2(sort[sort.length - 1] ?? NaN)}, Mittel ${z2(innen.reduce((a, b) => a + b, 0) / Math.max(1, innen.length))}`,
  );
}

/** Knick der Haut an beiden Enden des Rings im Schnitt durch die Mitte (Grad), und der Abstand der beiden Enden (Lippen vorn) */
function lippen(h: Haut): { knick: number[]; auf: number } {
  const enden = [L.proben[0]!.ecken[0], L.proben[L.proben.length - 1]!.ecken[0]];
  const inMitte = (v: number): number[] => h.nachbarn[v]!.filter((u) => Math.abs(h.pos[3 * u + 2]!) < 1e-6);
  const knick = enden.map((v) => {
    const p = lage(h.pos, v);
    const r = inMitte(v).map((u) => ({ x: h.pos[3 * u]! - p.x, y: h.pos[3 * u + 1]! - p.y }));
    if (r.length !== 2) return NaN;
    const c = (r[0]!.x * r[1]!.x + r[0]!.y * r[1]!.y) / (Math.hypot(r[0]!.x, r[0]!.y) * Math.hypot(r[1]!.x, r[1]!.y));
    return 180 - (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  });
  const a = lage(h.pos, enden[0]!);
  const b = lage(h.pos, enden[1]!);
  return { knick, auf: Math.hypot(a.x - b.x, a.y - b.y) };
}
const amMundwinkel = (h: Haut): number => {
  if (!R) return NaN;
  const RR = { ...R };
  const w: number[] = [];
  for (let j = 0; j < L.proben.length; j++) {
    if (j === ecke || Math.abs(L.s[j]! - L.s[ecke]!) > 2.5 * mk) continue;
    const x = knickQuer(h, RR, j);
    if (Number.isFinite(x)) w.push(x);
  }
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : NaN;
};

const f0 = falten(haut);
const l0 = lippen(haut);
console.log(`   zu: Lippen vorn ${z1(l0.auf)} auseinander, Knick an den Lippen ${z1(l0.knick[0]!)}° und ${z1(l0.knick[1]!)}°, am Mundwinkel ${z1(amMundwinkel(haut))}°; umgeschlagen ${f0.umgeklappt}, Knicke über 60° ${f0.ueber60}`);
const staende: { winkel: number; h: Haut; text: string }[] = [];
for (const winkel of WINKEL) {
  const pos = knochenDrehen(haut.pos, knochenWinkel(m, { kiefer: winkel, schaedel: SCHAEDEL }), G);
  const h: Haut = { ...haut, pos };
  const f = falten(h);
  const li = lippen(h);
  const text = `Lippen vorn ${z1(li.auf)} auseinander, Knick an den Lippen ${z1(li.knick[0]!)}° und ${z1(li.knick[1]!)}°, am Mundwinkel ${z1(amMundwinkel(h))}°; umgeschlagen ${f.umgeklappt} (zu: ${f0.umgeklappt}), Knicke über 60° ${f.ueber60} (zu: ${f0.ueber60})`;
  console.log(`   Unterkiefer ${winkel}°${SCHAEDEL ? `, Schädel ${SCHAEDEL}°` : ''}: ${text}`);
  staende.push({ winkel, h, text });
}

if (AUS) {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const st of [{ h: haut }, ...staende])
    for (let v = 0; v < st.h.n; v++) {
      const q = lage(st.h.pos, v);
      xMin = Math.min(xMin, q.x);
      xMax = Math.max(xMax, q.x);
      yMin = Math.min(yMin, q.y);
      yMax = Math.max(yMax, q.y);
    }
  const mitte: [number, number, number] = [(xMin + xMax) / 2, (yMin + yMax) / 2, 0];
  const mass = 1.15 * Math.max(xMax - xMin, yMax - yMin);
  const schnitt = (H: Haut): BlattSchnitt => {
    const strecken: number[] = [];
    for (let k = 0; k < H.tri.length; k += 3) {
      const pkt: [number, number][] = [];
      for (let e = 0; e < 3; e++) {
        const a = lage(H.pos, H.tri[k + e]!);
        const b = lage(H.pos, H.tri[k + ((e + 1) % 3)]!);
        if (Math.abs(a.z) < 1e-9) pkt.push([a.x, a.y]);
        else if (Math.abs(b.z) > 1e-9 && a.z * b.z < 0) {
          const g = a.z / (a.z - b.z);
          pkt.push([a.x + g * (b.x - a.x), a.y + g * (b.y - a.y)]);
        }
      }
      if (pkt.length === 2) strecken.push(pkt[0]![0] - mitte[0], pkt[0]![1] - mitte[1], pkt[1]![0] - mitte[0], pkt[1]![1] - mitte[1]);
    }
    return { titel: 'Schnitt durch die Mitte', strecken, mass, hoch: 0.6 };
  };
  const bild = (name: string, H: Haut, notiz: string): BlattBild => {
    const linien: BlattLinie[] = loops.flatMap((l) => {
      const p = Array.from(hautLagen(H, l));
      const zu = l.art !== 'ring';
      const K = kanteBei(l, loops);
      const hart = K.reduce((a, b) => a + b, 0) > K.length / 2 ? 1 : 0;
      return l.art === 'mitte' ? [{ p, zu, hart }] : [{ p, zu, hart }, { p: p.map((x, k) => (k % 3 === 2 ? -x : x)), zu, hart }];
    });
    // die sichtbaren Punkte der Linien, mit den Knochen mitgedreht (an ihrem nächsten Netzpunkt)
    const punkte = loops.flatMap((l) =>
      l.punkte.filter(istSichtbar).flatMap((p) => {
        let j = 0;
        for (let i = 1; i < l.s.length; i++) if (Math.abs(l.s[i]! - p.s) < Math.abs(l.s[j]! - p.s)) j = i;
        const q = lage(H.pos, l.proben[j]!.ecken[0]);
        return Math.abs(q.z) < 1e-6 ? [[q.x, q.y, q.z]] : [[q.x, q.y, q.z], [q.x, q.y, -q.z]];
      }),
    );
    return { name, h: H, loops: [], notiz, fertig: { linien, punkte }, schnitt: schnitt(H) };
  };
  blattSchreiben(
    AUS,
    'Schritt 6, Etappe 2: Kieferknochen am geformten Maul (13.11.2026)',
    [
      {
        titel: `${NAME ? `Florians Form „${NAME}“` : 'Kugel, das Maul mit „Maul formen“ geformt'}: Der Unterkiefer dreht um den Mundwinkel; nichts wird geschnitten, nichts eingesetzt`,
        bilder: [bild('zu (wie geformt)', haut, `umgeschlagen ${f0.umgeklappt}`), ...staende.map((st) => bild(`Unterkiefer ${st.winkel}°`, st.h, st.text))],
        blicke: [
          ['Seite', 0, 0, 0.9],
          ['schräg von vorn', 50, 12, 0.9],
        ],
        mass,
        mitte,
      },
    ],
    1560,
    'Blaue Linien: Loops, schwarz: Kante an. Rot: eine Fläche, deren Rückseite man sieht. Flach schattiert, damit jeder Knick zu sehen ist (das übertreibt gegenüber dem Fenster).',
  );
  console.log(`Bildblatt: ${AUS}`);
}
