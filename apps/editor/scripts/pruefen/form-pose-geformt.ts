// Plan vom 12.11.2026, Schritte 5 und 6, Gegenprobe an Florians Fall (13.11.). Florian: „Ich kann doch jedes beliebige Maul auch mit
// dem jetzigen Mesh von Hand formen […] Auch bei deinem fehlgeschlagenen Posenbeweis. Ich verstehe das Problem nicht. […] verschieben
// und bearbeiten sollte ich alles ohne Probleme können. Dann ist es ja ein einfacher Morph der Punkte und Handles von einer zur
// anderen Position, während die Kieferknochen sich bewegen.“
//
// Seine Form `wesen/maul handgemacht test.eewesen`: ein Maul, von Hand geformt (zwei Kiefer, dazwischen die Bucht; keine schmale
// Form, keine verborgene Fläche). Geprüft wird an ihr dasselbe wie in `form-pose-ruhe.ts`:
//   Knochen  der Unterkiefer dreht um den Mundwinkel (Gewichte aus der Lippenlinie, wie `maulAmLoop` sie für jeden Ort der Seite gibt;
//            nichts wird geschnitten, nichts eingesetzt)
//   Pose     eine zweite Lage derselben Linien: Ein Zug, wie er gezeigt wird, wird mit dem Winkel seines Punkts zurückgedreht; die Haut
//            rechnet die Rechnung der Grundform, unverändert
// Züge in der Pose, jeder von demselben Stand: ein Punkt der Unterlippe 25 nach unten, derselbe 25 nach oben (auf den Oberkiefer zu),
// ein Punkt fern vom Maul 25 nach außen.
//
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-pose-geformt.ts
//   NAME="maul handgemacht test"   LIPPE=<Nummer des Loops der Lippen; ohne: nur die Loops auflisten>   KIEFER=20 (Grad, weiter offen)
//   AUS=<datei.html> (Bildblatt)
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, hautLagen, istSichtbar, kanteBei, pfadLagen } from '../../../../packages/shape/src/dicht/loops';
import { maulAmLoop, mundwinkelProbe } from '../../../../packages/shape/src/dicht/maulLoop';
import { type BlattBild, type BlattLinie, type BlattZeile, blattSchreiben } from './form-direkt-blatt';
import { formLaden } from './form-direkt-faelle';

const NAME = process.env.NAME ?? 'maul handgemacht test';
const LIPPE = process.env.LIPPE ? Number(process.env.LIPPE) : null;
const KIEFER = Number(process.env.KIEFER ?? 20);
const AUS = process.env.AUS ?? '';
const SCHRITTE = 20;
const RUHE = 0.02;
const MAX_RUNDEN = 400;
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });
const kopieLoops = (L: readonly Loop[]): Loop[] => L.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) }));

const { h: h0, loops: loops0, mk } = formLaden(NAME);
let xMin = Infinity;
let xMax = -Infinity;
let yMin = Infinity;
let yMax = -Infinity;
let zMax = 0;
for (let v = 0; v < h0.n; v++) {
  const p = lage(h0.pos, v);
  xMin = Math.min(xMin, p.x);
  xMax = Math.max(xMax, p.x);
  yMin = Math.min(yMin, p.y);
  yMax = Math.max(yMax, p.y);
  zMax = Math.max(zMax, Math.abs(p.z));
}
console.log(`Form „${NAME}“: ${h0.n} Punkte, ${loops0.length} Loops, Maschenweite ${z1(mk)}; x ${z1(xMin)} … ${z1(xMax)}, y ${z1(yMin)} … ${z1(yMax)}, halbe Breite ${z1(zMax)}`);
loops0.forEach((l, i) => {
  const a = lage(l.ruhe, 0);
  const e = lage(l.ruhe, l.proben.length - 1);
  const hart = Math.max(0, ...kanteBei(l, loops0));
  console.log(
    `   Loop ${l.id} (Nr. ${i}): ${l.art}${hart ? ', Kante' : ''}, ${l.proben.length} Proben, Länge ${z1(l.laenge)}, ${l.punkte.length} Punkte (${l.punkte.filter(istSichtbar).length} sichtbar); ` +
      `von (${z1(a.x)}, ${z1(a.y)}, ${z1(a.z)}) bis (${z1(e.x)}, ${z1(e.y)}, ${z1(e.z)})${l.punkte.some((p) => p.mundwinkel) ? '; mit Mundwinkel' : ''}`,
  );
});
if (LIPPE === null) process.exit(0);

// ---------- Knochen aus der Lippenlinie: Gelenk am Mundwinkel, Gewicht je Ort der Seite; nichts wird geschnitten ----------
const lippeNr = loops0.findIndex((l) => l.id === LIPPE);
if (lippeNr < 0) throw new Error(`kein Loop ${LIPPE}`);
const lippe = loops0[lippeNr]!;
const ecke = mundwinkelProbe(lippe);
const m = maulAmLoop(h0, lippe, ecke, { zelle: mk / 2 });
if (!m) throw new Error('Aus dieser Linie lassen sich Gelenk und Gewichte nicht lesen (kein eingesetzter Ring, trennt nicht, Lippen zu kurz)');
const ve = lippe.proben[ecke]!.ecken[0];
const G = { x: h0.pos[3 * ve]!, y: h0.pos[3 * ve + 1]! };
// (wie `maulAmLoop`: an den Punkten außerhalb der „Öffnung“ sein Gewicht, die Lippen ganz bei ihrem Kiefer; an den Innenseiten der
// Kiefer, die die Maul-Funktion von heute wegschneiden würde, das Gewicht ihres Orts in der Seite)
const aussen = new Uint8Array(h0.n);
for (let t = 0; t < h0.tri.length / 3; t++) if (!m.offen[t]) for (let e = 0; e < 3; e++) aussen[h0.tri[3 * t + e]!] = 1;
const gewicht = new Float64Array(h0.n);
for (let v = 0; v < h0.n; v++) gewicht[v] = aussen[v] ? m.gewicht[v]! : m.gewichtBei(h0.pos[3 * v]!, h0.pos[3 * v + 1]!);
const A = (m.drehsinn * KIEFER * Math.PI) / 180;
const theta = Float64Array.from(gewicht, (w) => A * w);
const ganz = gewicht.reduce((s, w) => s + (w > 0.99 ? 1 : 0), 0);
const teils = gewicht.reduce((s, w) => s + (w > 0.01 && w <= 0.99 ? 1 : 0), 0);
const offen = m.offen.reduce((s, x) => s + x, 0);
console.log(
  `Lippenlinie: Loop ${lippe.id}; Mundwinkel an Probe ${ecke} bei (${z1(G.x)}, ${z1(G.y)}); mit dem Unterkiefer drehen ${ganz} Punkte ganz, ${teils} zum Teil; ` +
    `(die Maul-Funktion von heute würde ${offen} Dreiecke als Öffnung wegschneiden: die Innenseiten der Kiefer)`,
);

const drehenUm = (p: V3, t: number): V3 => {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return { x: G.x + c * (p.x - G.x) - s * (p.y - G.y), y: G.y + s * (p.x - G.x) + c * (p.y - G.y), z: p.z };
};
const gedreht = (pos: ArrayLike<number>, f = 1): Float64Array => {
  const out = new Float64Array(pos.length);
  for (let v = 0; v < pos.length / 3; v++) {
    const q = drehenUm(lage(pos, v), f * theta[v]!);
    out.set([q.x, q.y, q.z], 3 * v);
  }
  return out;
};
const winkelProbe = (l: Loop, j: number): number => {
  const p = l.proben[j]!;
  return p.b[0] * theta[p.ecken[0]]! + p.b[1] * theta[p.ecken[1]]! + p.b[2] * theta[p.ecken[2]]!;
};
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

type Stand = { pos: Float64Array; loops: readonly Loop[] };
type ZugDef = { name: string; text: string; loop: number; punkt: number; weg: V3; kreuzung?: number };
type Ergebnis = { pos: Float64Array; loops: Loop[]; runden: number; letzte: number; steht: boolean; bewegt: number; fern: number; linie: number; falten: { ueber60: number; umgeklappt: number }; unruhe: { stufen: number; fest: boolean } };

/** fern vom Maul: dreht nicht mit dem Kiefer und liegt weiter als ein Drittel der Form hinter dem Mundwinkel */
const istFern = (v: number): boolean => gewicht[v]! < 0.01 && Math.hypot(h0.pos[3 * v]! - G.x, h0.pos[3 * v + 1]! - G.y) > (xMax - xMin) / 3;

/** Ein Zug (oder keiner) in der Ruhe der Pose mit der Rechnung der Grundform, unverändert; gemessen gegen den Stand `von` */
function rechnen(zug: ZugDef | null, von: Stand): Ergebnis {
  const h: Haut = { ...h0, pos: Float64Array.from(von.pos) };
  const loops = kopieLoops(von.loops);
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { halb: true });
  const ziel = loops.map((l) => {
    const P = l.punkte.map((p, i) => {
      const dabei = zug !== null && ((l.id === zug.loop && i === zug.punkt) || (zug.kreuzung !== undefined && p.kreuzung === zug.kreuzung));
      if (!zug || !dabei) return p.ref;
      // der Weg, wie er gezeigt wird, zurückgedreht mit dem Winkel des Punkts
      const t = -winkelPunkt(l, i);
      const c = Math.cos(t);
      const s = Math.sin(t);
      p.cur = { x: p.ref.x + c * zug.weg.x - s * zug.weg.y, y: p.ref.y + s * zug.weg.x + c * zug.weg.y, z: p.ref.z + zug.weg.z };
      return p.cur;
    });
    return pfadLagen(l, P) ?? Float64Array.from(l.ruhe);
  });
  const versch = loops.map((l, i) => Float64Array.from(ziel[i]!, (x, k) => x - l.ruhe[k]!));
  if (zug) for (let s = 1; s <= SCHRITTE; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / SCHRITTE)), 2);
  let runden = zug ? 2 * SCHRITTE : 0;
  let letzte = Infinity;
  const vor = new Float64Array(h.pos.length);
  for (let r = 0; r < MAX_RUNDEN && letzte > RUHE; r++) {
    vor.set(h.pos);
    z.schritt(versch, 1);
    runden++;
    letzte = 0;
    for (let k = 0; k < vor.length; k += 3) letzte = Math.max(letzte, Math.hypot(h.pos[k]! - vor[k]!, h.pos[k + 1]! - vor[k + 1]!, h.pos[k + 2]! - vor[k + 2]!));
  }
  let bewegt = 0;
  let fern = 0;
  for (let v = 0; v < h.n; v++) {
    const d = Math.hypot(h.pos[3 * v]! - von.pos[3 * v]!, h.pos[3 * v + 1]! - von.pos[3 * v + 1]!, h.pos[3 * v + 2]! - von.pos[3 * v + 2]!);
    bewegt = Math.max(bewegt, d);
    if (istFern(v)) fern = Math.max(fern, d);
  }
  let linie = 0;
  loops.forEach((l, i) => {
    const L = hautLagen(h, l);
    for (let k = 0; k < L.length; k += 3) linie = Math.max(linie, Math.hypot(L[k]! - ziel[i]![k]!, L[k + 1]! - ziel[i]![k + 1]!, L[k + 2]! - ziel[i]![k + 2]!));
    for (const p of l.punkte) p.ref = { ...p.cur };
    l.ruhe = L;
  });
  return { pos: h.pos, loops, runden, letzte, steht: letzte <= RUHE, bewegt, fern, linie, falten: falten({ ...h0, pos: gedreht(h.pos) }), unruhe: z.unruhe };
}

// ---------- die Grundform zur Ruhe, die Pose (nur Knochen), dann die Züge ----------
const f0 = falten(h0);
const grund = rechnen(null, { pos: h0.pos, loops: loops0 });
console.log(`Grundform: Knicke über 60° ${f0.ueber60}, umgeschlagen ${f0.umgeklappt}; zur Ruhe gerechnet in ${grund.runden} Runden${grund.steht ? '' : ' (steht nicht)'}, dabei bis ${z2(grund.bewegt)} bewegt`);
const nurKnochen = falten({ ...h0, pos: gedreht(grund.pos) });
const zu = falten({ ...h0, pos: gedreht(grund.pos, -1) });
console.log(`Knochen allein: Unterkiefer ${KIEFER}° weiter offen: Knicke über 60° ${nurKnochen.ueber60}, umgeschlagen ${nurKnochen.umgeklappt}; ${KIEFER}° weiter zu: ${zu.ueber60} / ${zu.umgeklappt}`);

// Punkte: auf der Unterlippe (dreht ganz mit, nicht an den Enden), und fern vom Maul
const lip = grund.loops[lippeNr]!;
// (der sichtbare Punkt der Lippenlinie, der am weitesten mit dem Unterkiefer dreht)
const kandidaten = lip.punkte.map((p, i) => ({ p, i, w: winkelPunkt(lip, i) / (A || 1) })).filter((x) => istSichtbar(x.p) && Math.abs(x.p.ref.z) > 1e-6 && x.w > 0.05);
const unten = kandidaten.sort((a, b) => b.w - a.w)[0];
let fernP: { l: Loop; i: number; d: number } | null = null;
for (const l of grund.loops)
  l.punkte.forEach((p, i) => {
    if (!istSichtbar(p) || Math.abs(p.ref.z) < 1e-6 || Math.abs(winkelPunkt(l, i)) > 1e-6) return;
    const d = Math.hypot(p.ref.x - G.x, p.ref.y - G.y);
    if (!fernP || d > fernP.d) fernP = { l, i, d };
  });
const ZUEGE: ZugDef[] = [];
if (unten) {
  const k = unten.p.kreuzung;
  ZUEGE.push({ name: 'unten', text: 'Punkt der Unterlippe 25 nach unten', loop: lip.id, punkt: unten.i, weg: { x: 0, y: -25, z: 0 }, kreuzung: k });
  ZUEGE.push({ name: 'oben', text: 'derselbe Punkt 25 nach oben (auf den Oberkiefer zu)', loop: lip.id, punkt: unten.i, weg: { x: 0, y: 25, z: 0 }, kreuzung: k });
  ZUEGE.push({ name: 'weit', text: 'derselbe Punkt 70 nach oben', loop: lip.id, punkt: unten.i, weg: { x: 0, y: 70, z: 0 }, kreuzung: k });
} else console.log('kein greifbarer Punkt auf der Unterlippe');
if (fernP) {
  const f = fernP as { l: Loop; i: number; d: number };
  ZUEGE.push({ name: 'fern', text: 'Punkt fern vom Maul 25 nach außen', loop: f.l.id, punkt: f.i, weg: { x: 0, y: 0, z: 25 }, kreuzung: f.l.punkte[f.i]!.kreuzung });
}

const alle = new Map<string, Ergebnis>();
for (const zug of ZUEGE) {
  const l = grund.loops.find((x) => x.id === zug.loop)!;
  const p = l.punkte[zug.punkt]!;
  const q = drehenUm(p.ref, winkelPunkt(l, zug.punkt));
  const e = rechnen(zug, grund);
  alle.set(zug.name, e);
  console.log(
    `${zug.text} (Loop ${l.id}, Punkt ${zug.punkt}, gezeigt bei ${z1(q.x)}/${z1(q.y)}/${z1(q.z)}, dreht ${z1((winkelPunkt(l, zug.punkt) * 180) / Math.PI)}°): ` +
      `${e.steht ? `steht nach ${e.runden} Runden` : `steht nach ${e.runden} Runden nicht (letzte ${z2(e.letzte)})`}; Haut bis ${z1(e.bewegt)} bewegt, fern vom Maul bis ${z2(e.fern)}; ` +
      `Linien bis ${z2(e.linie)} neben ihrem Pfad; gezeigt: Knicke über 60° ${e.falten.ueber60}, umgeschlagen ${e.falten.umgeklappt}; Vorsicht ${e.unruhe.stufen}${e.unruhe.fest ? ', steht fest' : ''}`,
  );
}

if (AUS) {
  const bild = (name: string, pos: Float64Array, loops: readonly Loop[], notiz: string, f = 1): BlattBild => {
    const h: Haut = { ...h0, pos: gedreht(pos, f) };
    const linien: BlattLinie[] = loops.flatMap((l) => {
      const p: number[] = [];
      for (let j = 0; j < l.proben.length; j++) {
        const q = drehenUm(lage(l.ruhe, j), f * winkelProbe(l, j));
        p.push(q.x, q.y, q.z);
      }
      const zu2 = l.art !== 'ring';
      const hart = Math.max(0, ...kanteBei(l, loops));
      return l.art === 'mitte' ? [{ p, zu: zu2, hart }] : [{ p, zu: zu2, hart }, { p: p.map((x, k) => (k % 3 === 2 ? -x : x)), zu: zu2, hart }];
    });
    const punkte = loops.flatMap((l) =>
      l.punkte.flatMap((p, i) => {
        if (!istSichtbar(p)) return [];
        const q = drehenUm(p.ref, f * winkelPunkt(l, i));
        return Math.abs(q.z) < 1e-6 ? [[q.x, q.y, q.z]] : [[q.x, q.y, q.z], [q.x, q.y, -q.z]];
      }),
    );
    return { name, h, loops: [], notiz, fertig: { linien, punkte } };
  };
  const mass = 1.25 * Math.max(xMax - xMin, yMax - yMin);
  const mitte: [number, number, number] = [(xMin + xMax) / 2, (yMin + yMax) / 2, 0];
  const blicke = [
    ['Seite', 0, 0, 0.62],
    ['schräg von vorn', 50, 12, 0.62],
  ] as const;
  const text = (e: Ergebnis): string => `${e.steht ? `steht nach ${e.runden} Runden` : 'steht nicht'}; umgeschlagen ${e.falten.umgeklappt}; fern vom Maul bis ${z2(e.fern)} bewegt; Linien bis ${z2(e.linie)} neben ihrem Pfad`;
  const zeilen: BlattZeile[] = [
    {
      titel: 'Die Knochen allein: Der Unterkiefer dreht um den Mundwinkel (nichts geschnitten, nichts eingesetzt)',
      bilder: [
        bild(`${KIEFER}° weiter zu`, grund.pos, grund.loops, `Knicke über 60° ${zu.ueber60}, umgeschlagen ${zu.umgeklappt}`, -1),
        bild('Grundform (wie gesichert)', grund.pos, grund.loops, `Knicke über 60° ${f0.ueber60}, umgeschlagen ${f0.umgeklappt}`, 0),
        bild(`${KIEFER}° weiter offen`, grund.pos, grund.loops, `Knicke über 60° ${nurKnochen.ueber60}, umgeschlagen ${nurKnochen.umgeklappt}`, 1),
      ],
      blicke,
      mass,
      mitte,
    },
    {
      titel: `In der Pose (${KIEFER}° weiter offen) ziehen: gerechnet mit der Rechnung der Grundform, unverändert`,
      bilder: ZUEGE.filter((zg) => alle.has(zg.name)).map((zg) => bild(zg.text, alle.get(zg.name)!.pos, alle.get(zg.name)!.loops, text(alle.get(zg.name)!))),
      blicke,
      mass,
      mitte,
    },
  ];
  blattSchreiben(
    AUS,
    `Gegenprobe an Florians Form „${NAME}“: Knochen und Pose am von Hand geformten Maul (13.11.2026)`,
    zeilen,
    1560,
    'Blaue Linien: Loops, schwarz: Kante an. Rot: eine Fläche, deren Rückseite man sieht. Flach schattiert, damit jeder Knick zu sehen ist.',
  );
  console.log(`Bildblatt: ${AUS}`);
}
