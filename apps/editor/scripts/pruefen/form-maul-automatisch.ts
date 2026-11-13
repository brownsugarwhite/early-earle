// Plan vom 12.11.2026, Schritt 6 (13.11., Florian): „Das Maul soll aber an einem gewählten Edgeloop immer noch automatisch
// entstehen. […] Im Grunde machst du ja nur die Kante hart und verbindest von der Seite die gegenüberliegenden Seiten. Das sollte
// automatisch passieren können. Das Maul ist dann einfach eine Form wie von Hand gemacht, nur automatisiert. […] Die Spiegelkante
// ist zur Stabilisation der Form ja sowieso schon von Anfang an gegeben.“
//
// Geprüft wird genau das, und zwar so, wie eine Hand es täte: nichts wird eingeschweißt, es wird nur an Linien gezogen, die Haut
// folgt in der Rechnung der Grundform Schritt für Schritt.
//   1  die gewählte Maullinie wird eine Kante (die Lippen)
//   2  die Mittellinie (falls sie fehlt) und eine Querlinie durch beide Mundwinkel: ein Ring um den Kopf in der Ebene des Mauls. Er
//      kreuzt die Mittellinie vorn zwischen den Lippen und die Maullinie in den Mundwinkeln; sein Stück zwischen diesen Kreuzungen ist
//      die Verbindung der gegenüberliegenden Seiten
//   3  die Kreuzung vorn zwischen den Lippen wird nach innen gezogen, bis zwischen die Mundwinkel: Aus der Fläche zwischen den Lippen
//      werden Gaumen und Boden
// Form: die Kugel mit Ring und Maullinie aus `formen/pose-maul-kugel.eewesen`.
//
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-maul-automatisch.ts
//   AUS=<datei.html> (Bildblatt)   SCHRITTE=60   TIEF=0.97 (Anteil des Wegs bis zwischen die Mundwinkel)   QUER=hart|weich
import { fileURLToPath } from 'node:url';
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, eckenAuto, griffeAnlegen, hatPfad, hautLagen, istSichtbar, kanteBei, kreuzungenZwischen, loopAusSchnitt, mittlereKante, pfadLagen, punktEinfuegen } from '../../../../packages/shape/src/dicht/loops';
import { maulAmLoop, mundwinkelProbe } from '../../../../packages/shape/src/dicht/maulLoop';
import { type BlattBild, type BlattLinie, type BlattSchnitt, type BlattZeile, blattSchreiben } from './form-direkt-blatt';
import { formLadenDatei } from './form-direkt-faelle';

const DATEI = process.env.FORM ?? fileURLToPath(new URL('./formen/pose-maul-kugel.eewesen', import.meta.url));
const AUS = process.env.AUS ?? '';
const SCHRITTE = Number(process.env.SCHRITTE ?? 60);
const TIEF = Number(process.env.TIEF ?? 0.97);
const QUER_HART = process.env.QUER !== 'weich';
const RUHE = 0.02;
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });
const kopieLoops = (L: readonly Loop[]): Loop[] => L.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) }));

type Stand = { h: Haut; loops: Loop[] };
const geladen = formLadenDatei(DATEI);
let st: Stand = { h: { ...geladen.h, pos: Float64Array.from(geladen.h.pos) }, loops: kopieLoops(geladen.loops) };

/** Runden zu den Zielen (sonst: jede Linie auf ihrem Pfad), bis die Haut steht; `schritte`: der Weg in so vielen Schritten zu je 2 Runden */
function rechnen(s: Stand, ziel?: readonly Float64Array[], schritte = 0): { runden: number; steht: boolean; letzte: number; unruhe: { stufen: number; fest: boolean } } {
  const z = new LoopZug(s.h, s.loops, null, true, 'kurven', 'geometrie', { halb: true });
  const Z = ziel ?? s.loops.map((l) => pfadLagen(l) ?? Float64Array.from(l.ruhe));
  const versch = s.loops.map((l, i) => Float64Array.from(Z[i]!, (x, k) => x - l.ruhe[k]!));
  for (let k = 1; k <= schritte; k++) z.schritt(versch.map((d) => d.map((x) => (x * k) / schritte)), 2);
  let runden = 2 * schritte;
  let letzte = Infinity;
  const vor = new Float64Array(s.h.pos.length);
  for (let r = 0; r < 400 && letzte > RUHE; r++) {
    vor.set(s.h.pos);
    z.schritt(versch, 1);
    runden++;
    letzte = 0;
    for (let k = 0; k < vor.length; k += 3) letzte = Math.max(letzte, Math.hypot(s.h.pos[k]! - vor[k]!, s.h.pos[k + 1]! - vor[k + 1]!, s.h.pos[k + 2]! - vor[k + 2]!));
  }
  for (const l of s.loops) {
    l.ruhe = hautLagen(s.h, l);
    for (const p of l.punkte) p.ref = { ...p.cur };
  }
  return { runden, steht: letzte <= RUHE, letzte, unruhe: z.unruhe };
}
for (const l of st.loops) for (const p of l.punkte) p.cur = { ...p.ref };
rechnen(st);

// ---------- die Maullinie: Mundwinkel, Achse des Mauls ----------
const maulNr = st.loops.findIndex((l) => l.punkte.some((p) => p.mundwinkel));
if (maulNr < 0) throw new Error('Die Form hat keine Maullinie (kein Punkt „Mundwinkel“)');
const maulId = st.loops[maulNr]!.id;
const maul = (): Loop => st.loops.find((l) => l.id === maulId)!;
const mw = maul().punkte.find((p) => p.mundwinkel)!;
const G = { x: mw.ref.x, y: mw.ref.y, z: mw.ref.z };
const eA = lage(maul().ruhe, 0);
const eB = lage(maul().ruhe, maul().proben.length - 1);
const vorn = { x: (eA.x + eB.x) / 2, y: (eA.y + eB.y) / 2 };
console.log(`Form: ${st.h.n} Punkte, ${st.loops.length} Loops; Maullinie Loop ${maulId}: Lippen vorn bei (${z1(eA.x)}, ${z1(eA.y)}) und (${z1(eB.x)}, ${z1(eB.y)}), Mundwinkel bei (${z1(G.x)}, ${z1(G.y)}, ${z1(G.z)})`);

// 1. die Lippen hart
maul().kante = true;

/** eine Linie schneiden und einsetzen, Kreuzungen als Punkte, Griffe anlegen */
function linie(a: 'top' | 'seite', P: [number, number], Q: [number, number]): number | null {
  const id = Math.max(...st.loops.map((l) => l.id)) + 1;
  const l = loopAusSchnitt(st.h, a, P, Q, id, 8);
  if (!l) return null;
  const loops = [...st.loops, l];
  const r = loopEinsetzen(st.h, loops, loops.length - 1);
  if (!r) return null;
  st = { h: r.haut, loops: r.loops };
  const nr = st.loops.length - 1;
  const tol = 0.25 * mittlereKante(st.h);
  let k = Math.max(0, ...st.loops.flatMap((x) => x.punkte.map((p) => p.kreuzung ?? 0))) + 1;
  for (let i = 0; i < nr; i++)
    for (const f of kreuzungenZwischen(st.loops[i]!, st.loops[i]!.ruhe, st.loops[nr]!, st.loops[nr]!.ruhe, tol)) {
      punktEinfuegen(st.loops[i]!, f.sa, k, hatPfad(st.loops[i]!));
      punktEinfuegen(st.loops[nr]!, f.sb, k);
      k++;
    }
  eckenAuto(st.loops);
  griffeAnlegen(st.loops[nr]!, st.loops[nr]!.ruhe, true);
  for (const x of st.loops) for (const p of x.punkte) p.cur = { ...p.ref };
  return id;
}
const punkteText = (l: Loop): string => l.punkte.map((p) => `(${z1(p.ref.x)}, ${z1(p.ref.y)}, ${z1(p.ref.z)}${p.kreuzung !== undefined ? ` K${p.kreuzung}` : ''}${p.ecke ?? p.autoEcke ? ' Ecke' : ''}${p.kante ? ' Kante' : ''}${istSichtbar(p) ? '' : ' unsichtbar'})`).join(' ');

// 2. Mittellinie und Querlinie durch die Mundwinkel
const mitteId = st.loops.find((l) => l.art === 'mitte')?.id ?? linie('top', [-400, 0], [400, 0]);
if (mitteId === null) throw new Error('Die Mittellinie lässt sich nicht einsetzen');
const ax = { x: vorn.x - G.x, y: vorn.y - G.y };
const querId = linie('seite', [G.x + 3 * ax.x, G.y + 3 * ax.y], [G.x - 4 * ax.x, G.y - 4 * ax.y]);
if (querId === null) throw new Error('Die Querlinie durch die Mundwinkel lässt sich nicht schneiden oder einsetzen');
const mitte = (): Loop => st.loops.find((l) => l.id === mitteId)!;
const quer = (): Loop => st.loops.find((l) => l.id === querId)!;
console.log(`Mittellinie Loop ${mitteId}: ${mitte().proben.length} Proben; Punkte ${punkteText(mitte())}`);
console.log(`Querlinie Loop ${querId} (${quer().art}): ${quer().proben.length} Proben; Punkte ${punkteText(quer())}`);
console.log(`Maullinie: Punkte ${punkteText(maul())}`);

// die Kreuzung vorn zwischen den Lippen (Mittellinie × Querlinie) und die Kreuzung der Querlinie mit der Maullinie (Mundwinkel)
const vornP = quer().punkte.find((p) => p.kreuzung !== undefined && mitte().punkte.some((q) => q.kreuzung === p.kreuzung) && p.ref.x < G.x);
const winkelP = quer().punkte.find((p) => p.kreuzung !== undefined && maul().punkte.some((q) => q.kreuzung === p.kreuzung));
if (!vornP) throw new Error('Die Querlinie kreuzt die Mittellinie vorn nicht');
console.log(`Kreuzung vorn zwischen den Lippen: (${z1(vornP.ref.x)}, ${z1(vornP.ref.y)}, ${z1(vornP.ref.z)}); Kreuzung mit der Maullinie am Mundwinkel: ${winkelP ? `(${z1(winkelP.ref.x)}, ${z1(winkelP.ref.y)}, ${z1(winkelP.ref.z)})` : 'keine'}`);
// die Verbindung von Mundwinkel zu Mundwinkel hart (zwischen diesen beiden Punkten der Querlinie)
if (QUER_HART) {
  vornP.kante = true;
  if (winkelP) winkelP.kante = true;
  eckenAuto(st.loops);
}
const vorher: Stand = { h: { ...st.h, pos: Float64Array.from(st.h.pos) }, loops: kopieLoops(st.loops) };
const ruheVor = rechnen(st);
console.log(`vor dem Zug: ${ruheVor.steht ? `steht nach ${ruheVor.runden} Runden` : 'steht nicht'}; Knicke über 60° ${falten(st.h).ueber60}, umgeschlagen ${falten(st.h).umgeklappt}`);

// 3. die Kreuzung vorn nach innen, bis zwischen die Mundwinkel
const kVorn = vornP.kreuzung!;
const weg = { x: TIEF * (G.x - vornP.ref.x), y: TIEF * (G.y - vornP.ref.y), z: 0 };
const ziel = st.loops.map((l) => {
  const P = l.punkte.map((p) => {
    if (p.kreuzung !== kVorn) return p.ref;
    p.cur = { x: p.ref.x + weg.x, y: p.ref.y + weg.y, z: p.ref.z };
    return p.cur;
  });
  return pfadLagen(l, P) ?? Float64Array.from(l.ruhe);
});
const vorZug = Float64Array.from(st.h.pos);
const lauf = rechnen(st, ziel, SCHRITTE);
let linieWeit = 0;
st.loops.forEach((l, i) => {
  for (let k = 0; k < l.ruhe.length; k += 3) linieWeit = Math.max(linieWeit, Math.hypot(l.ruhe[k]! - ziel[i]![k]!, l.ruhe[k + 1]! - ziel[i]![k + 1]!, l.ruhe[k + 2]! - ziel[i]![k + 2]!));
});
const f1 = falten(st.h);
// außen: Punkte, die vor dem Zug nicht in der Fläche zwischen den Lippen lagen (weiter als 12 hinter den Lippen vorn oder seitlich davon)
let aussen = 0;
let innenTief = 0;
for (let v = 0; v < st.h.n; v++) {
  const d = Math.hypot(st.h.pos[3 * v]! - vorZug[3 * v]!, st.h.pos[3 * v + 1]! - vorZug[3 * v + 1]!, st.h.pos[3 * v + 2]! - vorZug[3 * v + 2]!);
  const y0 = vorZug[3 * v + 1]!;
  const imMaul = vorZug[3 * v]! < G.x && y0 < Math.max(eA.y, eB.y) + 1 && y0 > Math.min(eA.y, eB.y) - 1;
  if (imMaul) innenTief = Math.max(innenTief, d);
  else aussen = Math.max(aussen, d);
}
console.log(
  `Zug (${SCHRITTE} Schritte, ${z1(Math.hypot(weg.x, weg.y))} nach innen): ${lauf.steht ? `steht nach ${lauf.runden} Runden` : `steht nach ${lauf.runden} Runden nicht (letzte ${z2(lauf.letzte)})`}; ` +
    `zwischen den Lippen bis ${z1(innenTief)} bewegt, außen bis ${z2(aussen)}; Linien bis ${z2(linieWeit)} neben ihrem Pfad; Knicke über 60° ${f1.ueber60}, umgeschlagen ${f1.umgeklappt}; Vorsicht ${lauf.unruhe.stufen}${lauf.unruhe.fest ? ', steht fest' : ''}`,
);

const geformt: Stand = { h: { ...st.h, pos: Float64Array.from(st.h.pos) }, loops: kopieLoops(st.loops) };

// ---------- 4. Loops nur um einen Kiefer (Schnitt in der Seite quer durch einen Kiefer, auf halber Länge des Mauls) ----------
const achseY = (x: number): number => G.y + ((x - G.x) * (vorn.y - G.y)) / (vorn.x - G.x);
let kieferText = '';
let mitKiefer: Stand | null = null;
{
  const xm = (G.x + vorn.x) / 2;
  const texte: string[] = [];
  for (const [name, von, bis] of [
    ['Unterkiefer', -400, -25],
    ['Oberkiefer', 25, 400],
  ] as const) {
    let id: number | null = null;
    for (const dx of [0, 3, -3, 7, -7, 12, -12]) {
      id = linie('seite', [xm + dx, achseY(xm + dx) + von], [xm + dx, achseY(xm + dx) + bis]);
      if (id !== null) break;
    }
    if (id === null) {
      texte.push(`um den ${name}: lässt sich nicht schneiden oder einsetzen`);
      continue;
    }
    const l = st.loops.find((x) => x.id === id)!;
    const a = lage(l.ruhe, 0);
    const e = lage(l.ruhe, l.proben.length - 1);
    const mitteY = achseY(a.x);
    const wo = a.y < mitteY && e.y < mitteY ? 'Unterkiefer' : a.y > mitteY && e.y > mitteY ? 'Oberkiefer' : 'ganzen Kopf';
    texte.push(`Schnitt durch den ${name}: Ring um den ${wo}, von (${z1(a.x)}, ${z1(a.y)}) bis (${z1(e.x)}, ${z1(e.y)}), ${l.proben.length} Proben`);
  }
  const r = rechnen(st);
  const f = falten(st.h);
  kieferText = `${texte.join('; ')}; danach ${r.steht ? `steht nach ${r.runden} Runden` : 'steht nicht'}, umgeschlagen ${f.umgeklappt}`;
  mitKiefer = { h: { ...st.h, pos: Float64Array.from(st.h.pos) }, loops: kopieLoops(st.loops) };
}
console.log(`Loops nur um einen Kiefer: ${kieferText}`);

// ---------- 5. der Kieferknochen am geformten Maul: Gelenk und Gewichte aus der Maullinie, nichts geschnitten ----------
let knochenText = 'nicht versucht';
let offenStand: Stand | null = null;
{
  const s5 = mitKiefer ?? geformt;
  const ml = s5.loops.find((l) => l.id === maulId)!;
  const m = maulAmLoop(s5.h, ml, mundwinkelProbe(ml), { zelle: geladen.mk / 2 });
  if (!m) knochenText = 'Gelenk und Gewichte lassen sich aus der Maullinie nicht lesen';
  else {
    const aussenV = new Uint8Array(s5.h.n);
    for (let t = 0; t < s5.h.tri.length / 3; t++) if (!m.offen[t]) for (let e = 0; e < 3; e++) aussenV[s5.h.tri[3 * t + e]!] = 1;
    const hochY = (q: V3): number => -(q.x - G.x) * (vorn.y - G.y) + (q.y - G.y) * (vorn.x - G.x);
    const sinn = Math.sign(hochY({ x: G.x, y: G.y + 1, z: 0 })) || 1;
    // außen wie die Maul-Funktion von heute; innen: der Boden (unter der Ebene des Mauls) dreht ganz mit, der Gaumen nicht
    const w = Float64Array.from({ length: s5.h.n }, (_, v) => (aussenV[v] ? m.gewicht[v]! : sinn * hochY(lage(s5.h.pos, v)) < -0.5 ? 1 : 0));
    const WINKEL = 30;
    const A0 = (m.drehsinn * WINKEL * Math.PI) / 180;
    const drehen = (q: V3, t: number): V3 => ({ x: G.x + Math.cos(t) * (q.x - G.x) - Math.sin(t) * (q.y - G.y), y: G.y + Math.sin(t) * (q.x - G.x) + Math.cos(t) * (q.y - G.y), z: q.z });
    const pos = new Float64Array(s5.h.pos.length);
    for (let v = 0; v < s5.h.n; v++) {
      const q = drehen(lage(s5.h.pos, v), A0 * w[v]!);
      pos.set([q.x, q.y, q.z], 3 * v);
    }
    const loops = kopieLoops(s5.loops);
    for (const l of loops) {
      const wp = (j: number): number => l.proben[j]!.b[0] * w[l.proben[j]!.ecken[0]]! + l.proben[j]!.b[1] * w[l.proben[j]!.ecken[1]]! + l.proben[j]!.b[2] * w[l.proben[j]!.ecken[2]]!;
      for (const pt of l.punkte) {
        let best = 0;
        for (let j = 1; j < l.s.length; j++) if (Math.abs(l.s[j]! - pt.s) < Math.abs(l.s[best]! - pt.s)) best = j;
        pt.ref = drehen(pt.ref, A0 * wp(best));
      }
    }
    offenStand = { h: { ...s5.h, pos }, loops };
    const f = falten(offenStand.h);
    const f0 = falten(s5.h);
    knochenText = `Unterkiefer ${WINKEL}° geöffnet (Gelenk am Mundwinkel, Gewichte außen wie heute, innen dreht der Boden ganz mit): Knicke über 60° ${f0.ueber60} → ${f.ueber60}, umgeschlagen ${f0.umgeklappt} → ${f.umgeklappt}`;
  }
}
console.log(`Kieferknochen: ${knochenText}`);

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
      if (pkt.length === 2) strecken.push(pkt[0]![0] + 85, pkt[0]![1] + 20, pkt[1]![0] + 85, pkt[1]![1] + 20);
    }
    return { titel: 'Schnitt durch die Mitte (Maul von der Seite)', strecken, mass: 240, hoch: 0.55 };
  };
  const bild = (name: string, s: Stand, notiz: string): BlattBild => {
    const linien: BlattLinie[] = s.loops.flatMap((l) => {
      const p = Array.from(hautLagen(s.h, l));
      const zu = l.art !== 'ring';
      const K = kanteBei(l, s.loops);
      const hart = K.reduce((a, b) => a + b, 0) > K.length / 2 ? 1 : 0;
      return l.art === 'mitte' ? [{ p, zu, hart }] : [{ p, zu, hart }, { p: p.map((x, k) => (k % 3 === 2 ? -x : x)), zu, hart }];
    });
    const punkte = s.loops.flatMap((l) => l.punkte.filter(istSichtbar).flatMap((p) => (Math.abs(p.ref.z) < 1e-6 ? [[p.ref.x, p.ref.y, p.ref.z]] : [[p.ref.x, p.ref.y, p.ref.z], [p.ref.x, p.ref.y, -p.ref.z]])));
    return { name, h: s.h, loops: [], notiz, fertig: { linien, punkte }, schnitt: schnitt(s.h) };
  };
  blattSchreiben(
    AUS,
    'Schritt 6: das Maul automatisch geformt, wie von Hand (13.11.2026)',
    ((): BlattZeile[] => {
      const blicke = [
        ['Seite', 0, 0, 0.7],
        ['schräg von vorn', 50, 12, 0.7],
      ] as const;
      const zeilen: BlattZeile[] = [
        {
          titel: 'Maullinie hart, Mittellinie, Querlinie durch die Mundwinkel; dann die Kreuzung vorn zwischen den Lippen nach innen',
          bilder: [
            bild('vorher: die Maullinie auf der geschlossenen Haut, mit den beiden Linien', vorher, 'nichts geschnitten, nichts eingesetzt'),
            bild('nachher: automatisch geformt, mit der Rechnung der Grundform', geformt, `${lauf.steht ? `steht nach ${lauf.runden} Runden` : 'steht nicht'}; umgeschlagen ${f1.umgeklappt}; außen bis ${z2(aussen)} bewegt; Linien bis ${z2(linieWeit)} neben ihrem Pfad`),
          ],
          blicke,
          mass: 430,
          mitte: [0, 0, 0],
        },
      ];
      const zwei: BlattBild[] = [];
      if (mitKiefer) zwei.push(bild('dazu Loops nur um einen Kiefer', mitKiefer, kieferText));
      if (offenStand) zwei.push(bild('und mit dem Kieferknochen geöffnet', offenStand, knochenText));
      if (zwei.length) zeilen.push({ titel: 'Am geformten Maul: Loops nur um einen Kiefer, und der Kieferknochen', bilder: zwei, blicke, mass: 430, mitte: [0, 0, 0] });
      return zeilen;
    })(),
    1340,
    'Blaue Linien: Loops, schwarz: Kante an. Rot: eine Fläche, deren Rückseite man sieht. Flach schattiert, damit jeder Knick zu sehen ist. Unter jedem Bild der Schnitt durch die Mitte.',
  );
  console.log(`Bildblatt: ${AUS}`);
}
