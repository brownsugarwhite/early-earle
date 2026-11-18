// Plan vom 12.11.2026, Schritt 6, Gegenprobe (13.11., Florian zum Beweis `form-maul-haut.ts`: „Ich kann doch jedes beliebige Maul
// auch mit dem jetzigen Mesh von Hand formen und es kollabiert nichts und es wird nichts komisch aufgeblasen“).
//
// Geprüft wird sein Weg statt meiner Konstruktion: Ein Maul wird geformt wie jede andere Form, durch Ziehen an Linien, die Haut
// folgt in der Rechnung der Grundform Schritt für Schritt. Kugel mit drei Loops (Ring waagerecht, Mittellinie, Ring senkrecht); auf
// der Mittellinie und auf dem waagerechten Ring kommen Punkte für die Lippen dazu, dann wird der Punkt vorn nach innen gezogen
// (in Schritten, wie mit der Maus). Gemessen: kommt die Rechnung zur Ruhe, schlägt etwas um, wie tief ist die Bucht.
//
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-maul-geformt.ts
//   AUS=<datei.html> (Bildblatt)   TIEF=110 (so weit wird der Punkt vorn nach innen gezogen)   LIPPE=22 (Grad über und unter der Mitte)
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, griffeAnlegen, hautLagen, istSichtbar, kanteBei, pfadLagen, punktEinfuegen } from '../../../../packages/shape/src/dicht/loops';
import { type BlattBild, type BlattLinie, type BlattSchnitt, blattSchreiben } from './form-direkt-blatt';
import { R, kugelMit } from './form-direkt-faelle';

const AUS = process.env.AUS ?? '';
const TIEF = Number(process.env.TIEF ?? 110);
const LIPPE = (Number(process.env.LIPPE ?? 22) * Math.PI) / 180;
const SCHRITTE = 40;
const RUHE = 0.02;
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });

const { h, loops } = kugelMit('drei', 3000);
// Punkte für die Lippen: auf der Mittellinie über und unter der Mitte vorn, auf dem waagerechten Ring seitlich davon
const naechste = (l: Loop, ziel: V3): number => {
  let best = Infinity;
  let wo = 0;
  for (let j = 0; j < l.proben.length; j++) {
    const q = lage(l.ruhe, j);
    const d = Math.hypot(q.x - ziel.x, q.y - ziel.y, q.z - ziel.z);
    if (d < best) {
      best = d;
      wo = j;
    }
  }
  return wo;
};
const mitte = loops.find((l) => l.art === 'mitte')!;
const ringW = loops.find((l) => l.art === 'ring' && Math.abs(l.ruhe[1]!) < 1)!;
for (const vz of [1, -1]) punktEinfuegen(mitte, mitte.s[naechste(mitte, { x: -R * Math.cos(LIPPE), y: vz * R * Math.sin(LIPPE), z: 0 })]!);
punktEinfuegen(ringW, ringW.s[naechste(ringW, { x: -R * Math.cos(LIPPE), y: 0, z: R * Math.sin(LIPPE) })]!);
for (const l of loops) griffeAnlegen(l, l.ruhe, true);

const kopie = (H: Haut): Haut => ({ ...H, pos: Float64Array.from(H.pos) });
const vorher = kopie(h);
const loopsVorher = loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) }));

// der Punkt vorn (Kreuzung von Mittellinie und waagerechtem Ring)
let vornK: number | undefined;
for (const p of mitte.punkte) if (p.kreuzung !== undefined && p.ref.x < -R + 5 && Math.abs(p.ref.y) < 5) vornK = p.kreuzung;
if (vornK === undefined) throw new Error('kein Punkt vorn');

const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { halb: true });
const ziel = loops.map((l) => {
  const P = l.punkte.map((p) => {
    if (p.kreuzung !== vornK) return p.ref;
    p.cur = { x: p.ref.x + TIEF, y: p.ref.y, z: p.ref.z };
    return p.cur;
  });
  return pfadLagen(l, P) ?? Float64Array.from(l.ruhe);
});
const versch = loops.map((l, i) => Float64Array.from(ziel[i]!, (x, k) => x - l.ruhe[k]!));
for (let s = 1; s <= SCHRITTE; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / SCHRITTE)), 2);
let runden = 2 * SCHRITTE;
let letzte = Infinity;
const vor = new Float64Array(h.pos.length);
for (let r = 0; r < 400 && letzte > RUHE; r++) {
  vor.set(h.pos);
  z.schritt(versch, 1);
  runden++;
  letzte = 0;
  for (let k = 0; k < vor.length; k += 3) letzte = Math.max(letzte, Math.hypot(h.pos[k]! - vor[k]!, h.pos[k + 1]! - vor[k + 1]!, h.pos[k + 2]! - vor[k + 2]!));
}
let linie = 0;
loops.forEach((l, i) => {
  const L = hautLagen(h, l);
  for (let k = 0; k < L.length; k += 3) linie = Math.max(linie, Math.hypot(L[k]! - ziel[i]![k]!, L[k + 1]! - ziel[i]![k + 1]!, L[k + 2]! - ziel[i]![k + 2]!));
  for (const p of l.punkte) p.ref = { ...p.cur };
  l.ruhe = L;
});
const f0 = falten(vorher);
const f1 = falten(h);
// Tiefe der Bucht: wie weit liegt die Haut auf der Mittelebene vorn hinter der Kugel
let tief = 0;
for (let v = 0; v < h.n; v++) {
  if (Math.abs(vorher.pos[3 * v + 2]!) > 1e-6 || vorher.pos[3 * v]! > -R * 0.9) continue;
  tief = Math.max(tief, h.pos[3 * v]! - vorher.pos[3 * v]!);
}
const u = z.unruhe;
console.log(
  `Kugel mit drei Loops, ${h.n} Punkte: Punkt vorn ${TIEF} nach innen gezogen (${SCHRITTE} Schritte): ${letzte <= RUHE ? `steht nach ${runden} Runden` : `steht nach ${runden} Runden nicht (letzte ${z2(letzte)})`}; ` +
    `Bucht ${z1(tief)} tief; Linien bis ${z2(linie)} neben ihrem Pfad; Knicke über 60° ${f0.ueber60} → ${f1.ueber60}, umgeschlagen ${f0.umgeklappt} → ${f1.umgeklappt}; Vorsicht ${u.stufen}${u.fest ? ', steht fest' : ''}`,
);

if (AUS) {
  const schnitt = (H: Haut): BlattSchnitt => {
    const strecken: number[] = [];
    for (let t = 0; t < H.tri.length; t += 3) {
      const pkt: [number, number][] = [];
      for (let e = 0; e < 3; e++) {
        const a = lage(H.pos, H.tri[t + e]!);
        const b = lage(H.pos, H.tri[t + ((e + 1) % 3)]!);
        if (Math.abs(a.z) < 1e-9) pkt.push([a.x, a.y]);
        else if (Math.abs(b.z) > 1e-9 && a.z * b.z < 0) {
          const g = a.z / (a.z - b.z);
          pkt.push([a.x + g * (b.x - a.x), a.y + g * (b.y - a.y)]);
        }
      }
      if (pkt.length === 2) strecken.push(pkt[0]![0], pkt[0]![1], pkt[1]![0], pkt[1]![1]);
    }
    return { titel: 'Schnitt durch die Mitte', strecken, mass: 430, hoch: 0.7 };
  };
  const bild = (name: string, H: Haut, L: readonly Loop[], notiz: string): BlattBild => {
    const linien: BlattLinie[] = L.flatMap((l) => {
      const p = Array.from(hautLagen(H, l));
      const zu = l.art !== 'ring';
      const hart = Math.max(0, ...kanteBei(l, L));
      return l.art === 'mitte' ? [{ p, zu, hart }] : [{ p, zu, hart }, { p: p.map((x, k) => (k % 3 === 2 ? -x : x)), zu, hart }];
    });
    const punkte = L.flatMap((l) => l.punkte.filter(istSichtbar).flatMap((p) => (Math.abs(p.ref.z) < 1e-6 ? [[p.ref.x, p.ref.y, p.ref.z]] : [[p.ref.x, p.ref.y, p.ref.z], [p.ref.x, p.ref.y, -p.ref.z]])));
    return { name, h: H, loops: [], notiz, fertig: { linien, punkte }, schnitt: schnitt(H) };
  };
  blattSchreiben(
    AUS,
    'Schritt 6, Gegenprobe: ein Maul mit Linien geformt, wie von Hand (13.11.2026)',
    [
      {
        titel: `Der Punkt vorn wird ${TIEF} nach innen gezogen; die Punkte darüber, darunter und seitlich bleiben als Lippen stehen`,
        bilder: [
          bild('vorher', vorher, loopsVorher, 'Kugel mit drei Loops und den Punkten für die Lippen'),
          bild('nachher: mit der Rechnung der Grundform, Schritt für Schritt', h, loops, `${letzte <= RUHE ? `steht nach ${runden} Runden` : 'steht nicht'}; Bucht ${z1(tief)} tief; umgeschlagen ${f1.umgeklappt}; Linien bis ${z2(linie)} neben ihrem Pfad`),
        ],
        blicke: [
          ['Seite', 0, 0, 0.75],
          ['schräg von vorn', 50, 12, 0.75],
        ],
        mass: 430,
        mitte: [0, 0, 0],
      },
    ],
    1300,
    'Blaue Linien: Loops. Rot: eine Fläche, deren Rückseite man sieht. Flach schattiert, damit jeder Knick zu sehen ist. Unter jedem Bild der Schnitt durch die Mitte.',
  );
  console.log(`Bildblatt: ${AUS}`);
}
