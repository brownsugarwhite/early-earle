// Plan vom 12.11.2026, Schritt 5, Etappe 1 (13.11.): kleiner Beweis „die Pose in ihrer Ruhe rechnen“. Im Kern ohne Fenster.
//
// Eine Pose ist hier eine zweite Lage derselben Form: Gerechnet wird in ihrer Ruhe (vor den Knochen, das Maul ist zu) mit der
// Rechnung der Grundform (über die ganze Haut, Linien auf ihren Pfaden, auf der Hälfte); die Knochen drehen nur, was gezeigt wird.
// Ein Zug, wie er im Blatt zu sehen ist, wird mit dem Winkel seines Punkts zurückgedreht.
//
// Form: eine Kugel mit einem Ring hinten und einem Maul aus der Seite, im Fenster gezeichnet (`form-pose-ruhe-fenster.mjs`, liegt
// unter `formen/pose-maul-kugel.eewesen`). Maul 30° offen. Züge, jeder von demselben Stand aus:
//   unten  der unterste Punkt der Unterlippe 25 nach unten (wie gezeigt)
//   oben   derselbe Punkt 25 nach oben (in der Ruhe läuft die Unterlippe dabei durch die Oberlippe)
//   fern   der Punkt oben auf dem Ring 40 nach oben
// An den Lippen drei Fassungen: (a) die verborgene Fläche der Öffnung rechnet mit, (b) die Lippen sind eine Kante, (c) die Öffnung
// ist aus der Rechnung genommen.
// Kriterien (vorher festgelegt, Plan): 1. in der gezeigten Haut nichts umgeschlagen, die Rechnung kommt zur Ruhe; 2. ohne Zug
// bewegt die Rechnung die Haut nicht (höchstens 0,05); 3. der Zug fern vom Maul gibt in der Pose dieselbe Haut wie in der Grundform
// (höchstens 0,5); 4. beim Zug an der Lippe bleibt die Haut fern vom Maul stehen (höchstens 1), die Linien liegen auf ihren Pfaden
// (höchstens 0,5); 5. die Grundform bleibt bitgleich.
//
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-pose-ruhe.ts
//   HEUTE=<json aus form-pose-ruhe-fenster.mjs> (die Pose von heute, fürs Bild)   AUS=<datei.html> (Bildblatt)
//   KIEFER=30   FASSUNG=a,b,c   BILD=a,b (welche Fassungen neben „heute“ ins Bild kommen)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, hautLagen, istSichtbar, kanteBei, pfadLagen } from '../../../../packages/shape/src/dicht/loops';
import { type MaulAmLoop, maulAmLoop } from '../../../../packages/shape/src/dicht/maulLoop';
import { knochenDrehen, knochenWinkel } from '../../../../packages/shape/src/dicht/poseLoop';
import { type BlattBild, type BlattLinie, type BlattZeile, blattSchreiben } from './form-direkt-blatt';
import { formLadenDatei } from './form-direkt-faelle';

const DATEI = process.env.FORM ?? fileURLToPath(new URL('./formen/pose-maul-kugel.eewesen', import.meta.url));
const HEUTE = process.env.HEUTE ?? '';
const AUS = process.env.AUS ?? '';
const KIEFER = Number(process.env.KIEFER ?? 30);
const FASSUNGEN = (process.env.FASSUNG ?? 'a,b,c').split(',') as Fassung[];
const BILD = (process.env.BILD ?? 'a,b').split(',') as Fassung[];
const SCHRITTE = 20;
const RUHE = 0.02;
const MAX_RUNDEN = 300;
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const z3 = (x: number): string => x.toFixed(3).replace('.', ',');

type Fassung = 'a' | 'b' | 'c';
type ZugDef = { name: string; loop: number; punkt: number; weg: V3; text: string };

const { h: h0, loops: loops0, mk } = formLadenDatei(DATEI);
const kopieLoops = (L: readonly Loop[]): Loop[] => L.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) }));

// ---- Maul und Knochen (wie im Fenster: `maulAktuell`, `poseKnochen`) ----
const maulNr = loops0.findIndex((l) => l.punkte.some((p) => p.mundwinkel));
if (maulNr < 0) throw new Error('Die Form hat kein Maul (kein Punkt „Mundwinkel“)');
const maulLoop = loops0[maulNr]!;
const ecke = ((): number => {
  const p = maulLoop.punkte.find((q) => q.mundwinkel)!;
  let best = Infinity;
  let wo = -1;
  for (let i = 1; i < maulLoop.proben.length - 1; i++) {
    const d = Math.abs(maulLoop.s[i]! - p.s);
    if (d < best) {
      best = d;
      wo = i;
    }
  }
  return wo;
})();
const m: MaulAmLoop = maulAmLoop(h0, maulLoop, ecke, { zelle: mk / 2 })!;
if (!m) throw new Error('Das Maul schneidet nicht');
const theta = knochenWinkel(m, { kiefer: KIEFER, schaedel: 0 });
const ve = maulLoop.proben[ecke]!.ecken[0];
const G = { x: h0.pos[3 * ve]!, y: h0.pos[3 * ve + 1]! };
/** Winkel der Knochen an einer Probe eines Loops */
const winkelProbe = (l: Loop, j: number): number => {
  const p = l.proben[j]!;
  return p.b[0] * theta[p.ecken[0]]! + p.b[1] * theta[p.ecken[1]]! + p.b[2] * theta[p.ecken[2]]!;
};
/** Winkel der Knochen an einem Punkt eines Loops (an der Probe, die seiner Stelle am nächsten liegt) */
const winkelPunkt = (l: Loop, i: number): number => {
  const s = l.punkte[i]!.s;
  let best = Infinity;
  let wo = 0;
  for (let j = 0; j < l.proben.length; j++) {
    const d = Math.abs(l.s[j]! - s);
    if (d < best) {
      best = d;
      wo = j;
    }
  }
  return winkelProbe(l, wo);
};
/** einen Ort der Ruhe zeigen, wie er in der Pose liegt (um das Gelenk gedreht) */
const drehen = (p: V3, t: number): V3 => {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return { x: G.x + c * (p.x - G.x) - s * (p.y - G.y), y: G.y + s * (p.x - G.x) + c * (p.y - G.y), z: p.z };
};

/** die Haut ohne die Öffnung des Mauls (wie `loeserHaut` im Fenster): dieselben Lagen; `aus`: Punkte nur in der Öffnung */
function ohneOeffnung(h: Haut): { h: Haut; aus: Uint8Array } {
  const tri: number[] = [];
  for (let t = 0; t < h.tri.length / 3; t++) if (!m.offen[t]) tri.push(h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!);
  const nachbarn: number[][] = Array.from({ length: h.n }, () => []);
  const aus = new Uint8Array(h.n).fill(1);
  for (let t = 0; t < tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = tri[t + e]!;
      const b = tri[t + ((e + 1) % 3)]!;
      aus[a] = 0;
      if (!nachbarn[a]!.includes(b)) nachbarn[a]!.push(b);
      if (!nachbarn[b]!.includes(a)) nachbarn[b]!.push(a);
    }
  }
  return { h: { pos: h.pos, tri: Uint32Array.from(tri), n: h.n, nachbarn, spiegel: h.spiegel }, aus };
}

type Ergebnis = {
  pos: Float64Array;
  loops: Loop[];
  runden: number;
  letzte: number;
  steht: boolean;
  bewegt: number;
  fern: number;
  linie: number;
  falten: { ueber60: number; umgeklappt: number };
  unruhe: { stufen: number; fest: boolean };
  ms: number;
};

/** die gezeigte Haut der Pose: gedreht, ohne die Öffnung */
const gezeigt = (pos: Float64Array): Haut => {
  const o = ohneOeffnung({ ...h0, pos: knochenDrehen(pos, theta, G) });
  return o.h;
};

type Stand = { pos: Float64Array; loops: readonly Loop[] };

/**
 * Ein Zug (oder keiner) in der Ruhe der Pose mit der Rechnung der Grundform, in einer der drei Fassungen an den Lippen; vom Stand
 * `von` aus, gemessen wird gegen ihn. Ohne Zug: `runden` Runden (0: bis die Haut steht).
 */
function rechnen(f: Fassung, zug: ZugDef | null, von: Stand, runden0 = 20): Ergebnis {
  const h: Haut = { ...h0, pos: Float64Array.from(von.pos) };
  const loops = kopieLoops(von.loops);
  if (f === 'b') loops[maulNr]!.kante = true;
  const o = f === 'c' ? ohneOeffnung(h) : null;
  const hs = o ? o.h : h;
  const bereich = o ? Uint8Array.from(o.aus, (x) => (x ? 0 : 1)) : null;
  const t0 = performance.now();
  const z = new LoopZug(hs, loops, bereich, true, 'kurven', 'geometrie', { halb: true });
  // Ziele: jede Linie auf ihrem Pfad; der gezogene Punkt um den zurückgedrehten Weg versetzt
  const ziel = loops.map((l) => {
    const P = l.punkte.map((p, i) => {
      if (!zug || l.id !== zug.loop || i !== zug.punkt) return p.ref;
      const t = -winkelPunkt(l, i);
      const c = Math.cos(t);
      const s = Math.sin(t);
      const q = { x: p.ref.x + c * zug.weg.x - s * zug.weg.y, y: p.ref.y + s * zug.weg.x + c * zug.weg.y, z: p.ref.z + zug.weg.z };
      p.cur = q;
      return q;
    });
    return pfadLagen(l, P) ?? Float64Array.from(l.ruhe);
  });
  const versch = loops.map((l, i) => Float64Array.from(ziel[i]!, (x, k) => x - l.ruhe[k]!));
  if (zug) for (let s = 1; s <= SCHRITTE; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / SCHRITTE)), 2);
  let runden = zug ? 2 * SCHRITTE : 0;
  let letzte = Infinity;
  const vor = new Float64Array(h.pos.length);
  const bisRuhe = zug !== null || runden0 === 0;
  for (let r = 0; r < (bisRuhe ? MAX_RUNDEN : runden0) && (letzte > RUHE || !bisRuhe); r++) {
    vor.set(h.pos);
    z.schritt(versch, 1);
    runden++;
    letzte = 0;
    for (let k = 0; k < vor.length; k += 3) letzte = Math.max(letzte, Math.hypot(h.pos[k]! - vor[k]!, h.pos[k + 1]! - vor[k + 1]!, h.pos[k + 2]! - vor[k + 2]!));
  }
  const ms = performance.now() - t0;
  let bewegt = 0;
  let fern = 0;
  for (let v = 0; v < h.n; v++) {
    if (o?.aus[v]) continue;
    const d = Math.hypot(h.pos[3 * v]! - von.pos[3 * v]!, h.pos[3 * v + 1]! - von.pos[3 * v + 1]!, h.pos[3 * v + 2]! - von.pos[3 * v + 2]!);
    bewegt = Math.max(bewegt, d);
    if (von.pos[3 * v + 1]! > 60) fern = Math.max(fern, d);
  }
  // die Linien auf ihren Pfaden: wie weit liegt die Linie auf der Haut neben ihrem Ziel?
  let linie = 0;
  loops.forEach((l, i) => {
    const L = hautLagen(hs, l);
    for (let k = 0; k < L.length; k += 3) linie = Math.max(linie, Math.hypot(L[k]! - ziel[i]![k]!, L[k + 1]! - ziel[i]![k + 1]!, L[k + 2]! - ziel[i]![k + 2]!));
    for (const p of l.punkte) p.ref = { ...p.cur };
    l.ruhe = L;
  });
  return { pos: h.pos, loops, runden, letzte, steht: letzte <= RUHE, bewegt, fern, linie, falten: falten(gezeigt(h.pos)), unruhe: z.unruhe, ms };
}

// ---- die Züge: derselbe Punkt wie im Fenster (unterster sichtbarer Punkt der Unterlippe; oberster sichtbarer Punkt des Rings) ----
const sichtbare = (l: Loop): { i: number; y: number }[] => l.punkte.map((p, i) => ({ i, y: drehen(p.ref, winkelPunkt(l, i)).y, p })).filter((x) => istSichtbar(x.p) && !x.p.mundwinkel);
const unten = sichtbare(maulLoop).sort((a, b) => a.y - b.y)[0]!;
const ring = loops0.find((l) => l !== maulLoop)!;
const hoch = sichtbare(ring).sort((a, b) => b.y - a.y)[0]!;
const ZUEGE: ZugDef[] = [
  { name: 'unten', loop: maulLoop.id, punkt: unten.i, weg: { x: 0, y: -25, z: 0 }, text: 'Unterlippe 25 nach unten' },
  { name: 'oben', loop: maulLoop.id, punkt: unten.i, weg: { x: 0, y: 25, z: 0 }, text: 'Unterlippe 25 nach oben' },
  { name: 'fern', loop: ring.id, punkt: hoch.i, weg: { x: 0, y: 40, z: 0 }, text: 'Punkt oben auf dem Ring 40 nach oben' },
];

const offen = m.offen.reduce((s, x) => s + x, 0);
const start = falten(gezeigt(h0.pos));
console.log(
  `Form: ${h0.n} Punkte, ${loops0.length} Loops, Maul = Loop ${maulLoop.id} (Mundwinkel an Probe ${ecke}, Gelenk ${z1(G.x)}/${z1(G.y)}), Öffnung ${offen} Dreiecke; Maul ${KIEFER}° offen; ` +
    `Unterlippe: Punkt ${unten.i} mit ${z1((winkelPunkt(maulLoop, unten.i) * 180) / Math.PI)}°; gezeigte Haut am Anfang: Knicke über 60° ${start.ueber60}, umgeschlagen ${start.umgeklappt}`,
);

const grundVorher = Float64Array.from(h0.pos);
const alle = new Map<string, Ergebnis>();
// die Grundform, wie die Rechnung von heute sie zur Ruhe bringt (die gesicherte Form steht noch nicht ganz: nach „Fressen“ aus legt
// das Fenster die Linien auf ihre Pfade, gesetzt wird erst beim nächsten Griff)
const grund = rechnen('a', null, { pos: h0.pos, loops: loops0 }, 0);
console.log(`Grundform zur Ruhe gerechnet (${grund.runden} Runden${grund.steht ? '' : ', steht nicht'}): Haut bis ${z2(grund.bewegt)} neben der gesicherten`);
for (const f of FASSUNGEN) {
  const name = f === 'a' ? '(a) Öffnung rechnet mit' : f === 'b' ? '(b) Lippen als Kante' : '(c) Öffnung herausgenommen';
  console.log(name);
  let ruhe: Ergebnis;
  try {
    ruhe = f === 'a' ? grund : rechnen(f, null, grund, 0);
  } catch (e) {
    console.log(`   rechnet nicht: ${String(e).slice(0, 200)}`);
    continue;
  }
  if (f !== 'a') console.log(`   Wechsel zu dieser Fassung: Haut bis ${z2(ruhe.bewegt)} neben der Grundform (fern vom Maul bis ${z2(ruhe.fern)}), ${ruhe.steht ? `steht nach ${ruhe.runden} Runden` : `steht nach ${ruhe.runden} Runden nicht (letzte ${z2(ruhe.letzte)})`}`);
  const r = rechnen(f, null, ruhe, 20);
  alle.set(`${f}:ohne`, { ...r, pos: ruhe.pos, loops: ruhe.loops });
  console.log(`   ohne Zug, 20 Runden: Haut bis ${z3(r.bewegt)} bewegt; gezeigt: Knicke über 60° ${r.falten.ueber60}, umgeschlagen ${r.falten.umgeklappt}`);
  for (const zug of ZUEGE) {
    const e = rechnen(f, zug, ruhe);
    alle.set(`${f}:${zug.name}`, e);
    console.log(
      `   ${zug.text}: ${e.steht ? `steht nach ${e.runden} Runden` : `steht nach ${e.runden} Runden nicht (letzte ${z2(e.letzte)})`}; Haut bis ${z1(e.bewegt)} bewegt, fern vom Maul (y > 60) bis ${z2(e.fern)}; ` +
        `Linien neben ihrem Pfad bis ${z2(e.linie)}; gezeigt: Knicke über 60° ${e.falten.ueber60}, umgeschlagen ${e.falten.umgeklappt}; Vorsicht ${e.unruhe.stufen}${e.unruhe.fest ? ', steht fest' : ''}; ${z1(e.ms)} ms`,
    );
  }
}
let grundGleich = true;
for (let i = 0; i < grundVorher.length; i++) if (h0.pos[i] !== grundVorher[i]) grundGleich = false;
console.log(`Grundform bitgleich: ${grundGleich ? 'ja' : 'NEIN'}`);

// ---- Bild: je Zug links die Pose von heute (aus dem Fenster), rechts neu ----
if (AUS) {
  type Heute = { lagen: number[]; anzeige?: { lagen: number[]; dreiecke: number[] }; dreiecke: number[]; loops: { art: string; ruhe: number[]; kante?: boolean; punkte: { ref: V3; sichtbar?: boolean }[] }[] };
  const heute: { pose0: Heute; zuege: Record<string, Heute> } | null = HEUTE ? JSON.parse(fs.readFileSync(HEUTE, 'utf8')) : null;
  const bildHeute = (name: string, s: Heute, notiz: string): BlattBild => {
    const a = s.anzeige ?? { lagen: s.lagen, dreiecke: s.dreiecke };
    const n = a.lagen.length / 3;
    const h: Haut = { pos: Float64Array.from(a.lagen), tri: Uint32Array.from(a.dreiecke), n, nachbarn: [], spiegel: new Int32Array(n) };
    const linien: BlattLinie[] = s.loops.flatMap((l) => {
      const zu = l.art !== 'ring';
      const hart = l.kante ? 1 : 0;
      return l.art === 'mitte' ? [{ p: l.ruhe, zu, hart }] : [{ p: l.ruhe, zu, hart }, { p: l.ruhe.map((x, k) => (k % 3 === 2 ? -x : x)), zu, hart }];
    });
    const punkte = s.loops.flatMap((l) => l.punkte.filter((p) => p.sichtbar !== false).flatMap((p) => (Math.abs(p.ref.z) < 1e-6 ? [[p.ref.x, p.ref.y, p.ref.z]] : [[p.ref.x, p.ref.y, p.ref.z], [p.ref.x, p.ref.y, -p.ref.z]])));
    return { name, h, loops: [], notiz, fertig: { linien, punkte } };
  };
  const bildNeu = (name: string, e: Ergebnis, notiz: string): BlattBild => {
    const h = gezeigt(e.pos);
    // Linien und Punkte gedreht, wie sie gezeigt werden: jede Stelle mit ihrem Winkel
    const linien: BlattLinie[] = e.loops.flatMap((l) => {
      const p: number[] = [];
      for (let j = 0; j < l.proben.length; j++) {
        const q = drehen({ x: l.ruhe[3 * j]!, y: l.ruhe[3 * j + 1]!, z: l.ruhe[3 * j + 2]! }, winkelProbe(l, j));
        p.push(q.x, q.y, q.z);
      }
      const zu = l.art !== 'ring';
      const hart = Math.max(0, ...kanteBei(l, e.loops));
      return l.art === 'mitte' ? [{ p, zu, hart }] : [{ p, zu, hart }, { p: p.map((x, k) => (k % 3 === 2 ? -x : x)), zu, hart }];
    });
    const punkte = e.loops.flatMap((l) =>
      l.punkte.flatMap((p, i) => {
        if (!istSichtbar(p)) return [];
        const q = drehen(p.ref, winkelPunkt(l, i));
        return Math.abs(q.z) < 1e-6 ? [[q.x, q.y, q.z]] : [[q.x, q.y, q.z], [q.x, q.y, -q.z]];
      }),
    );
    return { name, h, loops: [], notiz, fertig: { linien, punkte } };
  };
  const zeilen: BlattZeile[] = [];
  const blicke = [
    ['Seite', 0, 0, 0.7],
    ['schräg von vorn', 50, 12, 0.7],
  ] as const;
  const titelVon = (f: Fassung): string => (f === 'a' ? 'neu (a): Rechnung der Grundform, unverändert' : f === 'b' ? 'neu (b): dazu die Lippen als Kante' : 'neu (c): Öffnung aus der Rechnung genommen');
  for (const zug of [null, ...ZUEGE]) {
    const bilder: BlattBild[] = [];
    const hs = heute ? (zug ? heute.zuege[zug.name] : heute.pose0) : null;
    if (hs) bilder.push(bildHeute('heute (aus dem Fenster)', hs, zug ? 'Rechnung der Pose: nur um den Zug, Linien von der Haut abgelesen' : 'Pose ohne Zug'));
    for (const f of BILD) {
      const e = alle.get(`${f}:${zug ? zug.name : 'ohne'}`);
      if (!e) continue;
      bilder.push(
        bildNeu(
          titelVon(f),
          e,
          zug
            ? `${e.steht ? `steht nach ${e.runden} Runden` : `steht nach ${e.runden} Runden nicht`}; umgeschlagen ${e.falten.umgeklappt}; fern vom Maul bis ${z2(e.fern)} bewegt, größte Bewegung ${z1(e.bewegt)}; Linien bis ${z2(e.linie)} neben ihrem Pfad`
            : 'in der Ruhe der Pose gerechnet, dann mit den Knochen gedreht',
        ),
      );
    }
    zeilen.push({ titel: zug ? `${zug.text} (Maul ${KIEFER}° offen)` : `Pose ohne Zug (Maul ${KIEFER}° offen)`, bilder, blicke, mass: 430, mitte: [0, 0, 0] });
  }
  blattSchreiben(
    AUS,
    'Schritt 5, kleiner Beweis: die Pose in ihrer Ruhe mit der Rechnung der Grundform (13.11.2026)',
    zeilen,
    1500,
    'Blaue Linien: Loops, schwarz: Kante an. Rot: der Blick durch das offene Maul auf die Innenseite der Haut (das Maulinnere ist hier nicht gezeichnet). Flach schattiert, damit jeder Knick zu sehen ist.',
  );
  console.log(`Bildblatt: ${AUS}`);
}
