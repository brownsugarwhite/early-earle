 
// Gegenprüfung Fragen 3, 4, 6: Netzgüte am Startnetz, im gestreckten Zustand eines Zugs und nach dem Verdichten; was das Verdichten
// allein an der Fläche ändert (ohne Löser) und was der Löser danach daraus macht; welche Netzoperation wie viel beiträgt.
// Aufbau der Fälle wie apps/editor/scripts/pruefen/form-netzunabhaengig.ts (Kugel, drei Loops, 60 Mausschritte × 2 Runden, 4 Runden).
// FALL=hals|ruessel|ohr|ruhe   VARIANTEN=1 (Netzoperationen einzeln)   RUNDEN=30
const WT = '../../../../../../packages/shape/src/dicht';
import { loopEinsetzen } from '../../../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, type V3, hautAus } from '../../../../../../packages/shape/src/dicht/kurven';
import {
  type Loop,
  LoopZug,
  festlegen,
  griffeAnlegen,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
  verschiebungLaengs,
} from '../../../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../../../packages/shape/src/dicht/rund';
import { verdichten } from '../../../../../../packages/shape/src/dicht/verdichten';
import { type Schnapp, bewZeile, bewegung, guete, gueteZeile, schnapp, spiegelCheck, topoCheck } from './netzstat';
void WT;

const fall = process.env.FALL ?? 'hals';
const gewichte = (process.env.GEWICHTE ?? 'gleich') as 'gleich' | 'geometrie';
const weiter = Number(process.env.RUNDEN ?? 30);
const kugel = () => {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke: Number(process.env.DREIECKE ?? 6000) },
  );
  return hautAus(n.positionen, n.indizes);
};
type Stand = { h: Haut; loops: Loop[] };
const roh = kugel();
function dreiLoops(): Stand {
  let h = kugel();
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
    ['seite', [10, 200], [10, -200]],
  ] as const) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (let j = 0; j < loops.length; j++) {
    for (let i = 0; i < j; i++)
      for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol)) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
    griffeAnlegen(loops[j]!);
  }
  return { h, loops };
}
const punktZug = (l: Loop, i: number, D: V3): Float64Array => {
  const d = verschiebungLaengs(
    l,
    l.punkte.map((_, k) => (k === i ? D : { x: 0, y: 0, z: 0 })),
  );
  if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
  return d;
};

const st = dreiLoops();
const MKroh = mittlereKante(roh);
const MK = mittlereKante(st.h);
console.log(`Fall ${fall}, Gewichte ${gewichte}; mittlere Kante roh ${MKroh.toFixed(2)}, mit drei Loops ${MK.toFixed(2)}`);
console.log(gueteZeile('0 Startnetz roh (Surface Nets)', guete(roh)));
console.log(gueteZeile('1 Startnetz mit drei eingesetzten Loops', guete(st.h)));
{
  // Dreiecke an den Linien: Punkte der Ketten und ihre Nachbarn
  const aufLinie = new Set<number>();
  for (const l of st.loops) for (const p of l.proben) {
    aufLinie.add(p.ecken[0]);
    const s = st.h.spiegel[p.ecken[0]]!;
    if (s >= 0) aufLinie.add(s);
  }
  console.log(gueteZeile('1a davon: Punkte auf den Linien und Dreiecke an ihnen', guete(st.h, (v) => aufLinie.has(v))));
}
console.log('  Spiegel/Topologie:', JSON.stringify(spiegelCheck(st.h)), JSON.stringify(topoCheck(st.h)));

const mitteNr = () => st.loops.findIndex((l) => l.art === 'mitte');
let verschiebung: (anteil: number) => (Float64Array | null)[];
if (fall === 'ruhe') {
  verschiebung = () => st.loops.map(() => null);
} else if (fall === 'hals') {
  const m = st.loops[mitteNr()]!;
  const oben = m.punkte.reduce((b, p) => (p.ref.y > b.ref.y ? p : b)).kreuzung!;
  verschiebung = (anteil) =>
    st.loops.map((l) => {
      const i = l.punkte.findIndex((p) => p.kreuzung === oben);
      return i < 0 ? null : punktZug(l, i, { x: 0, y: 160 * anteil, z: 0 });
    });
} else if (fall === 'ohr') {
  const ring = st.loops.find((l) => l.art === 'ring' && l.punkte.some((p) => Math.abs(p.ref.y) > 100))!;
  for (const w of [40, 50, 60, 70]) {
    const th = (w * Math.PI) / 180;
    let best = 0;
    for (let j = 0; j < ring.s.length; j++) {
      const a = Math.atan2(ring.ruhe[3 * j + 2]!, ring.ruhe[3 * j + 1]!);
      const b = Math.atan2(ring.ruhe[3 * best + 2]!, ring.ruhe[3 * best + 1]!);
      if (Math.abs(a - th) < Math.abs(b - th)) best = j;
    }
    const j = Math.min(best, ring.s.length - 2);
    punktEinfuegen(ring, 0.5 * (ring.s[j]! + ring.s[j + 1]!));
  }
  const wahl = ring.punkte
    .map((p, i) => ({ i, w: (Math.atan2(p.ref.z, p.ref.y) * 180) / Math.PI, k: p.kreuzung }))
    .filter((q) => q.k === undefined && q.w > 45 && q.w < 65)
    .map((q) => q.i);
  const r = (55 * Math.PI) / 180;
  verschiebung = (anteil) =>
    st.loops.map((l) => {
      if (l !== ring) return null;
      const D = { x: 0, y: 70 * Math.cos(r) * anteil, z: 70 * Math.sin(r) * anteil };
      return verschiebungLaengs(
        l,
        l.punkte.map((_, k) => (wahl.includes(k) ? D : { x: 0, y: 0, z: 0 })),
      );
    });
} else {
  const m = st.loops[mitteNr()]!;
  let s0 = 0;
  let best = Infinity;
  for (let j = 0; j < m.proben.length; j++) {
    const d = Math.hypot(m.ruhe[3 * j]! - 106, m.ruhe[3 * j + 1]! - 106);
    if (d < best) {
      best = d;
      s0 = m.s[j]!;
    }
  }
  punktEinfuegen(m, s0);
  const i = m.punkte.findIndex((p) => Math.abs(p.s - s0) < 1e-9);
  verschiebung = (anteil) => st.loops.map((l) => (l === m ? punktZug(l, i, { x: 320 * anteil, y: -70 * anteil, z: 0 }) : null));
}

const start = Float64Array.from(st.h.pos);
const SCHRITTE = fall === 'ruhe' ? 0 : 60;
const z = new LoopZug(st.h, st.loops, null, true, 'kurven', gewichte);
let d: (Float64Array | null)[] = verschiebung(0);
for (let k = 1; k <= SCHRITTE; k++) {
  d = verschiebung(k / SCHRITTE);
  z.schritt(d, 2);
}
z.schritt(d, 4);
for (const l of st.loops) festlegen(st.h, l);
const A = schnapp(st.h);
const runden = (h: Haut, loops: Loop[], n: number) => {
  new LoopZug(h, loops, null, true, 'kurven', gewichte).schritt(
    loops.map(() => null),
    n,
  );
};
// gestreckter Bereich: Punkte, an denen eine Kante über 1,75 MK liegt
const lang = new Set<number>();
{
  const P = st.h.pos;
  for (let v = 0; v < st.h.n; v++)
    for (const w of st.h.nachbarn[v]!) {
      if (Math.hypot(P[3 * v]! - P[3 * w]!, P[3 * v + 1]! - P[3 * w + 1]!, P[3 * v + 2]! - P[3 * w + 2]!) > 1.75 * MK) {
        lang.add(v);
        lang.add(w);
      }
    }
}
// bewegter Bereich: Punkte, die der Zug um mehr als 2 MK bewegt hat
const bewegt = new Set<number>();
for (let v = 0; v < st.h.n; v++)
  if (Math.hypot(st.h.pos[3 * v]! - start[3 * v]!, st.h.pos[3 * v + 1]! - start[3 * v + 1]!, st.h.pos[3 * v + 2]! - start[3 * v + 2]!) > 2 * MK) bewegt.add(v);
console.log(gueteZeile('2 beim Loslassen (A), ganze Haut', guete(st.h)));
if (bewegt.size) console.log(gueteZeile(`2a beim Loslassen, bewegter Bereich (über 2 MK verschoben, ${bewegt.size} Punkte)`, guete(st.h, (v) => bewegt.has(v))));
if (lang.size) console.log(gueteZeile(`2b beim Loslassen, an Kanten über 1,75 MK (${lang.size} Punkte)`, guete(st.h, (v) => lang.has(v))));
console.log('  Spiegel/Topologie:', JSON.stringify(spiegelCheck(st.h)), JSON.stringify(topoCheck(st.h)));

// A+: dasselbe Netz weiter gerechnet; A++: noch einmal so viele (wandert die Form auch ohne Netzänderung?)
const hA: Haut = { ...st.h, pos: Float64Array.from(st.h.pos) };
const loopsA = st.loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p })) }));
runden(hA, loopsA, weiter);
const Aplus = schnapp(hA);
runden(hA, loopsA, weiter);
const Aplus2 = schnapp(hA);
console.log(bewZeile(`A → A+ (${weiter} Runden auf demselben Netz)`, A, Aplus));
console.log(bewZeile(`A+ → A++ (noch ${weiter} Runden, dasselbe Netz: Wandern ohne Netzänderung)`, Aplus, Aplus2));

// wie das Fenster: verdichten (teilen über 1,75 MK, zusammenlegen unter 0,5 MK, Linien genau MK/40)
type Opt = NonNullable<Parameters<typeof verdichten>[3]>;
const varianten: [string, number, Opt][] = [['Fenster (teilen, zusammenlegen, Linien genau, drehen, entspannen)', 1.75, { kurz: 0.5 * MK, genau: MK / 40 }]];
if (process.env.VARIANTEN) {
  varianten.push(
    ['nur teilen (PN-Punkte), kein Drehen, kein Entspannen', 1.75, { drehen: false, entspannen: false }],
    ['teilen + drehen', 1.75, { entspannen: false }],
    ['teilen + drehen + entspannen', 1.75, {}],
    ['teilen + drehen + entspannen + zusammenlegen (ohne Linien genau)', 1.75, { kurz: 0.5 * MK }],
  );
}
if (fall === 'ruhe') {
  varianten.length = 0;
  varianten.push(
    ['Ruhe: alle Kanten über 1,0 MK geteilt, nur teilen', 1.0, { drehen: false, entspannen: false }],
    ['Ruhe: alle Kanten über 1,0 MK geteilt, Standard', 1.0, {}],
  );
}
for (const [name, faktor, opt] of varianten) {
  const h: Haut = { ...st.h, pos: Float64Array.from(st.h.pos) };
  const loops = st.loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p })) }));
  const v = verdichten(h, loops, faktor * MK, opt);
  console.log(`\n--- ${name} ---`);
  if (!v) {
    console.log('  nichts zu tun');
    continue;
  }
  const V0 = schnapp(v.haut);
  console.log(`  ${h.n} → ${v.haut.n} Punkte: +${v.neu} neu, ${v.gelegt} zusammengelegt, ${v.gedreht} Kanten gedreht`);
  // alte Punkte, die das Verdichten bewegt hat (Entspannen der Punkte, in die gelegt wurde)
  let altBew = 0;
  let altBewMax = 0;
  const neuNachbar = new Uint8Array(v.haut.n);
  for (let q = 0; q < v.haut.n; q++) {
    const a = v.alt[q]!;
    if (a < 0) {
      neuNachbar[q] = 1;
      for (const w of v.haut.nachbarn[q]!) neuNachbar[w] = 1;
      continue;
    }
    const b = Math.hypot(v.haut.pos[3 * q]! - h.pos[3 * a]!, v.haut.pos[3 * q + 1]! - h.pos[3 * a + 1]!, v.haut.pos[3 * q + 2]! - h.pos[3 * a + 2]!);
    if (b > 1e-9) altBew++;
    altBewMax = Math.max(altBewMax, b);
  }
  console.log(`  alte Punkte vom Verdichten bewegt: ${altBew} (bis ${altBewMax.toFixed(2)})`);
  // gedrehte Kanten fern jeder Änderung: alte Kante, beide Enden geblieben, kein neuer Punkt in ihrer Nachbarschaft, im neuen Netz nicht mehr da
  {
    const neuVon = new Int32Array(h.n).fill(-1);
    for (let q = 0; q < v.haut.n; q++) if (v.alt[q]! >= 0) neuVon[v.alt[q]!] = q;
    let fern = 0;
    let nah = 0;
    let wegPunkt = 0;
    for (let a = 0; a < h.n; a++) {
      if (neuVon[a]! < 0) {
        wegPunkt++;
        continue;
      }
      for (const b of h.nachbarn[a]!) {
        if (b < a || neuVon[b]! < 0) continue;
        const qa = neuVon[a]!;
        const qb = neuVon[b]!;
        if (v.haut.nachbarn[qa]!.includes(qb)) continue;
        // Kante weg: geteilt (ein neuer Punkt zwischen beiden) oder gedreht
        const geteilt = v.haut.nachbarn[qa]!.some((w) => v.alt[w]! < 0 && v.haut.nachbarn[qb]!.includes(w));
        if (geteilt) continue;
        if (neuNachbar[qa] || neuNachbar[qb]) nah++;
        else fern++;
      }
    }
    console.log(`  alte Kanten verschwunden ohne Teilung: ${nah} neben neuen Punkten, ${fern} fern jeder Änderung (dort nur gedreht oder Folge des Zusammenlegens); ${wegPunkt} alte Punkte weggefallen`);
  }
  console.log(bewZeile('A → V0 (nur das Verdichten, kein Löser)', A, V0));
  console.log('  ' + gueteZeile('3 nach dem Verdichten (V0), ganze Haut', guete(v.haut)).replace(/\n/g, '\n  '));
  console.log('  ' + gueteZeile('3a nach dem Verdichten, neue Punkte und ihre Nachbarn', guete(v.haut, (q) => neuNachbar[q] === 1)).replace(/\n/g, '\n  '));
  {
    const aufLinie = new Set<number>();
    for (const l of v.loops) for (const p of l.proben) {
      aufLinie.add(p.ecken[0]);
      const s = v.haut.spiegel[p.ecken[0]]!;
      if (s >= 0) aufLinie.add(s);
    }
    console.log('  ' + gueteZeile('3b nach dem Verdichten, Punkte auf den Linien und Dreiecke an ihnen', guete(v.haut, (q) => aufLinie.has(q))).replace(/\n/g, '\n  '));
    console.log(`  Proben der Linien: ${st.loops.map((l) => l.proben.length).join(' / ')} → ${v.loops.map((l) => l.proben.length).join(' / ')}`);
  }
  console.log('  Spiegel/Topologie:', JSON.stringify(spiegelCheck(v.haut)), JSON.stringify(topoCheck(v.haut)));
  runden(v.haut, v.loops, 4);
  const B = schnapp(v.haut);
  console.log(bewZeile('V0 → B (vier Runden: das „Setzen“)', V0, B));
  console.log(bewZeile('A → B (Sprung wie im Fenster)', A, B));
  runden(v.haut, v.loops, weiter);
  const Bplus = schnapp(v.haut);
  console.log(bewZeile(`B → B+ (${weiter} Runden weiter)`, B, Bplus));
  console.log(bewZeile('A+ → B+ (Form hängt am Netz)', Aplus, Bplus));
  console.log('  ' + gueteZeile('4 gesetzt (B+), ganze Haut', guete(v.haut)).replace(/\n/g, '\n  '));
  console.log('  Spiegel/Topologie:', JSON.stringify(spiegelCheck(v.haut)), JSON.stringify(topoCheck(v.haut)));
  // zweites Verdichten wie das Fenster in der Ruhe (nur teilen, Linien genau), bis zu dreimal
  if (opt.genau !== undefined) {
    let hh = v.haut;
    let ll = v.loops;
    let vor: Schnapp = Bplus;
    for (let k = 1; k <= 3; k++) {
      const w = verdichten(hh, ll, 1.75 * MK, { kurz: 0, genau: MK / 40 });
      if (!w) {
        console.log(`  Nachverfeinern ${k}: nichts mehr`);
        break;
      }
      hh = w.haut;
      ll = w.loops;
      runden(hh, ll, 4);
      const jetzt = schnapp(hh);
      console.log(`  Nachverfeinern ${k}: +${w.neu} Punkte, ${w.gedreht} gedreht;` + bewZeile(' danach vier Runden', vor, jetzt));
      vor = jetzt;
    }
  }
}
void bewegung;
