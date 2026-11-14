 
// Gegenprüfung Frage 5 (Versuch im Scratchpad, nicht der Code des Fensters): Was bringt gleichmäßiges Neuvernetzen nach Botsch &
// Kobbelt 2004 dem heutigen schnellen Löser (gleiche Gewichte)? Gebaut aus den vorhandenen Operationen: `verdichten` teilt über 4/3 L,
// legt unter 4/5 L zusammen und dreht nach Wertigkeit; dazu hier: ALLE Punkte, die nicht auf Linien liegen, tangential entspannen und
// auf die Fläche von vorher zurücklegen (nächster Punkt), mehrere Durchgänge. Linien und Spiegelpaare bleiben.
// FALL=hals|ruessel|ohr   TEIL=dichte|stufen|ruhe (Standard: dichte)
import { loopEinsetzen } from '../../../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, type V3, hautAus, hautNormalen } from '../../../../../../packages/shape/src/dicht/kurven';
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
import { type Schnapp, bewZeile, bewegung, guete, gueteZeile, naechsterPunkt, schnapp, spiegelCheck, topoCheck } from './netzstat';

const fall = process.env.FALL ?? 'hals';
const teil = process.env.TEIL ?? 'dichte';
const weiter = Number(process.env.RUNDEN ?? 30);
const kugel = () => {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke: 6000 },
  );
  return hautAus(n.positionen, n.indizes);
};
type Stand = { h: Haut; loops: Loop[] };
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
const kopie = (s: Stand): Stand => ({
  h: { ...s.h, pos: Float64Array.from(s.h.pos) },
  loops: s.loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), s: Float64Array.from(l.s), punkte: l.punkte.map((p) => ({ ...p })) })),
});
const runden = (s: Stand, n: number) => {
  new LoopZug(s.h, s.loops, null, true, 'kurven', 'gleich').schritt(
    s.loops.map(() => null),
    n,
  );
};

/** gleichmäßig neu vernetzen auf die Kantenlänge L, auf der Fläche `ref` */
function isoRemesh(s0: Stand, L: number, ref: Schnapp, durchgaenge = 5): Stand & { neu: number; gelegt: number; gedreht: number } {
  let { h, loops } = kopie(s0);
  const np = naechsterPunkt(ref);
  let neu = 0;
  let gelegt = 0;
  let gedreht = 0;
  for (let d = 0; d < durchgaenge; d++) {
    const v = verdichten(h, loops, (4 / 3) * L, { kurz: (4 / 5) * L, entspannen: false });
    if (v) {
      h = v.haut;
      loops = v.loops;
      neu += v.neu;
      gelegt += v.gelegt;
      gedreht += v.gedreht;
    }
    const fest = new Uint8Array(h.n);
    for (const l of loops)
      for (const p of l.proben)
        for (const e of p.ecken) {
          fest[e] = 1;
          const sp = h.spiegel[e]!;
          if (sp >= 0) fest[sp] = 1;
        }
    const P = h.pos;
    for (let it = 0; it < 3; it++) {
      const nor = hautNormalen(h);
      const N = Float64Array.from(P);
      for (let u = 0; u < h.n; u++) {
        if (fest[u]) continue;
        const sp = h.spiegel[u]!;
        if (sp < 0 || sp < u) continue;
        const nb = h.nachbarn[u]!;
        if (nb.length === 0) continue;
        let cx = 0;
        let cy = 0;
        let cz = 0;
        for (const w of nb) {
          cx += P[3 * w]!;
          cy += P[3 * w + 1]!;
          cz += P[3 * w + 2]!;
        }
        let dx = 0.5 * (cx / nb.length - P[3 * u]!);
        let dy = 0.5 * (cy / nb.length - P[3 * u + 1]!);
        let dz = 0.5 * (cz / nb.length - P[3 * u + 2]!);
        const dn = dx * nor[3 * u]! + dy * nor[3 * u + 1]! + dz * nor[3 * u + 2]!;
        dx -= dn * nor[3 * u]!;
        dy -= dn * nor[3 * u + 1]!;
        dz -= dn * nor[3 * u + 2]!;
        const q = np([P[3 * u]! + dx, P[3 * u + 1]! + dy, sp === u ? 0 : P[3 * u + 2]! + dz]);
        N[3 * u] = q[0]!;
        N[3 * u + 1] = q[1]!;
        N[3 * u + 2] = sp === u ? 0 : q[2]!;
        if (sp !== u) {
          N[3 * sp] = q[0]!;
          N[3 * sp + 1] = q[1]!;
          N[3 * sp + 2] = -q[2]!;
        }
      }
      P.set(N);
    }
  }
  return { h, loops, neu, gelegt, gedreht };
}

const st = dreiLoops();
const MK = mittlereKante(st.h);
const mitteNr = (loops: Loop[]) => loops.findIndex((l) => l.art === 'mitte');
/** Verschiebung für einen Anteil des Zugs, von den Loops aus, wie sie gerade sind */
let verschiebung: (loops: Loop[], anteil: number) => (Float64Array | null)[];
if (fall === 'hals') {
  const m = st.loops[mitteNr(st.loops)]!;
  const oben = m.punkte.reduce((b, p) => (p.ref.y > b.ref.y ? p : b)).kreuzung!;
  verschiebung = (loops, anteil) =>
    loops.map((l) => {
      const i = l.punkte.findIndex((p) => p.kreuzung === oben);
      return i < 0 ? null : punktZug(l, i, { x: 0, y: 160 * anteil, z: 0 });
    });
} else {
  const m = st.loops[mitteNr(st.loops)]!;
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
  verschiebung = (loops, anteil) =>
    loops.map((l) => {
      if (l.art !== 'mitte') return null;
      const i = l.punkte.findIndex((p) => Math.abs(p.s - s0) < 1e-9);
      return punktZug(l, i, { x: 320 * anteil, y: -70 * anteil, z: 0 });
    });
}
console.log(`Fall ${fall}, Teil ${teil}; mittlere Kante ${MK.toFixed(2)}`);

if (teil === 'ruhe') {
  // unberührte Kugel mit drei Loops: wandert sie unter dem Löser, heute und gleichmäßig vernetzt?
  const a = kopie(st);
  const A0 = schnapp(a.h);
  runden(a, weiter);
  console.log(bewZeile(`heutiges Netz: ${weiter} Runden ohne jede Änderung`, A0, schnapp(a.h)));
  for (const L of [1.0, 0.75]) {
    const r = isoRemesh(st, L * MK, A0, 6);
    const V0 = schnapp(r.h);
    console.log(`\ngleichmäßig neu vernetzt, L = ${L} MK: ${st.h.n} → ${r.h.n} Punkte (+${r.neu}, ${r.gelegt} zusammengelegt, ${r.gedreht} gedreht)`);
    console.log(bewZeile('Startfläche → neu vernetzt (kein Löser)', A0, V0));
    console.log(gueteZeile('Güte', guete(r.h)));
    console.log('  Spiegel/Topologie:', JSON.stringify(spiegelCheck(r.h)), JSON.stringify(topoCheck(r.h)));
    runden(r, weiter);
    console.log(bewZeile(`neu vernetzt: ${weiter} Runden ohne jede Änderung`, V0, schnapp(r.h)));
  }
} else if (teil === 'lag') {
  // Löser nach der Geometrie (wie ?gewichte=geometrie), Zug in Stufen, je Mausschritt EINE Runde (wie das Fenster): Nachhinken je Stufe
  // (Stand nach dem letzten Mausschritt gegen fertig gerechnet auf demselben Netz) und Sprung je Stufe (fertig gerechnet vor dem
  // Vernetzen gegen fertig gerechnet danach), mit dem heutigen Verdichten und mit gleichmäßigem Neuvernetzen.
  const STUFEN = Number(process.env.STUFEN ?? 12);
  const GEW = (process.env.GEWICHTE ?? 'geometrie') as 'gleich' | 'geometrie';
  const rundenG = (s: Stand, n: number) => {
    new LoopZug(s.h, s.loops, null, true, 'kurven', GEW).schritt(
      s.loops.map(() => null),
      n,
    );
  };
  const enden: Record<string, Schnapp> = {};
  for (const [art, L] of [
    ['heute', 0],
    ['iso 1,0', 1.0],
  ] as const) {
    let s = kopie(st);
    console.log(`\n--- Gewichte ${GEW}, ${art}: Zug in ${STUFEN} Stufen, je Mausschritt eine Runde ---`);
    if (L > 0) {
      const r = isoRemesh(s, L * MK, schnapp(s.h), 6);
      s = { h: r.h, loops: r.loops };
      rundenG(s, weiter);
      for (const l of s.loops) festlegen(s.h, l);
    }
    const lag: number[] = [];
    const lagM: number[] = [];
    const sprung: number[] = [];
    for (let stufe = 1; stufe <= STUFEN; stufe++) {
      const z = new LoopZug(s.h, s.loops, null, true, 'kurven', GEW);
      let d: (Float64Array | null)[] = [];
      const m = 60 / STUFEN;
      for (let k = 1; k <= m; k++) {
        d = verschiebung(s.loops, k / 60);
        z.schritt(d, 1);
      }
      const letzter = schnapp(s.h);
      z.schritt(d, weiter);
      const fertig = schnapp(s.h);
      const bl = bewegung(letzter, fertig);
      lag.push(bl.max);
      lagM.push(bl.mittel);
      for (const l of s.loops) festlegen(s.h, l);
      if (L === 0) {
        const v = verdichten(s.h, s.loops, 1.75 * MK, { kurz: 0.5 * MK, genau: MK / 40 });
        if (v) s = { h: v.haut, loops: v.loops };
      } else {
        const r = isoRemesh(s, L * MK, fertig, 3);
        s = { h: r.h, loops: r.loops };
      }
      rundenG(s, weiter);
      for (const l of s.loops) festlegen(s.h, l);
      sprung.push(bewegung(fertig, schnapp(s.h)).max);
    }
    enden[art] = schnapp(s.h);
    console.log(`  Nachhinken je Stufe (größter Abstand): ${lag.map((x) => x.toFixed(2)).join(' / ')}`);
    console.log(`  Nachhinken je Stufe (Mittel): ${lagM.map((x) => x.toFixed(3)).join(' / ')}`);
    console.log(`  Sprung je Stufe (fertig vor ↔ fertig nach dem Vernetzen): ${sprung.map((x) => x.toFixed(2)).join(' / ')}`);
    console.log(`  am Ende ${s.h.n} Punkte`, JSON.stringify(topoCheck(s.h)));
  }
  console.log(bewZeile('Endformen heute ↔ iso 1,0', enden['heute']!, enden['iso 1,0']!));
} else if (teil === 'dichte') {
  // ein Zug wie im Fenster (60 Schritte, je 2 Runden, 4 am Ende), fertig gerechnet (A+)
  const a = kopie(st);
  const z = new LoopZug(a.h, a.loops, null, true, 'kurven', 'gleich');
  let d: (Float64Array | null)[] = [];
  for (let k = 1; k <= 60; k++) {
    d = verschiebung(a.loops, k / 60);
    z.schritt(d, 2);
  }
  z.schritt(d, 4);
  for (const l of a.loops) festlegen(a.h, l);
  runden(a, weiter);
  const Aplus = schnapp(a.h);
  console.log(gueteZeile('A+ (gestrecktes Netz vom Greifen, fertig gerechnet)', guete(a.h)));
  const fertig: Record<string, Schnapp> = {};
  // heute: verdichten wie das Fenster, mit zwei Dichten
  for (const [name, fk] of [
    ['heute 1,75', 1.75],
    ['heute 1,2', 1.2],
  ] as const) {
    const b = kopie(a);
    const v = verdichten(b.h, b.loops, fk * MK, { kurz: 0.5 * MK, genau: MK / 40 })!;
    const s: Stand = { h: v.haut, loops: v.loops };
    const V0 = schnapp(s.h);
    console.log(`\n--- ${name} (teilen über ${fk} MK, zusammenlegen unter 0,5 MK): ${a.h.n} → ${s.h.n} Punkte ---`);
    console.log(bewZeile('A+ → verdichtet (kein Löser)', Aplus, V0));
    runden(s, 4);
    console.log(bewZeile('verdichtet → vier Runden', V0, schnapp(s.h)));
    runden(s, weiter);
    fertig[name] = schnapp(s.h);
    console.log(bewZeile('A+ → fertig gerechnet', Aplus, fertig[name]!));
  }
  for (const [name, L, dg] of [
    ['iso 1,0', 1.0, 5],
    ['iso 1,0 (8 Durchgänge)', 1.0, 8],
    ['iso 0,75', 0.75, 5],
    ['iso 0,6', 0.6, 5],
  ] as const) {
    const r = isoRemesh(a, L * MK, Aplus, dg);
    const s: Stand = { h: r.h, loops: r.loops };
    const V0 = schnapp(s.h);
    console.log(`\n--- ${name}: gleichmäßig neu vernetzt auf L = ${L} MK, ${dg} Durchgänge: ${a.h.n} → ${s.h.n} Punkte (+${r.neu}, ${r.gelegt} zusammengelegt, ${r.gedreht} gedreht) ---`);
    console.log(bewZeile('A+ → neu vernetzt (kein Löser)', Aplus, V0));
    console.log(gueteZeile('Güte', guete(s.h)));
    console.log('  Spiegel/Topologie:', JSON.stringify(spiegelCheck(s.h)), JSON.stringify(topoCheck(s.h)));
    runden(s, 4);
    console.log(bewZeile('neu vernetzt → vier Runden', V0, schnapp(s.h)));
    runden(s, weiter);
    fertig[name] = schnapp(s.h);
    console.log(bewZeile('A+ → fertig gerechnet', Aplus, fertig[name]!));
    console.log('  Spiegel/Topologie fertig:', JSON.stringify(topoCheck(s.h)));
  }
  console.log('\n=== Form gegen Form (beide fertig gerechnet): hängt die Form am Netz? ===');
  for (const [x, y] of [
    ['heute 1,75', 'heute 1,2'],
    ['iso 1,0', 'iso 1,0 (8 Durchgänge)'],
    ['iso 1,0', 'iso 0,75'],
    ['iso 0,75', 'iso 0,6'],
    ['heute 1,75', 'iso 1,0'],
    ['heute 1,2', 'iso 0,75'],
  ] as const)
    console.log(bewZeile(`${x} ↔ ${y}`, fertig[x]!, fertig[y]!));
} else {
  // Zug in Stufen: nach je 60/STUFEN Mausschritten festhalten, neu vernetzen, weiter. Sprung je Stufe = Fläche vor dem Vernetzen gegen
  // vier Runden danach. Am Ende fertig gerechnet; die Endformen der Varianten gegeneinander.
  const STUFEN = Number(process.env.STUFEN ?? 6);
  const je = 60 / STUFEN;
  const enden: Record<string, Schnapp> = {};
  for (const [art, L] of [
    ['ohne Stufen, am Ende heute', 0],
    ['heute', 0],
    ['iso 1,0', 1.0],
    ['iso 0,75', 0.75],
  ] as const) {
    let s = kopie(st);
    console.log(`\n--- ${art}: Zug in ${art.startsWith('ohne') ? 1 : STUFEN} Stufen ---`);
    if (L > 0) {
      // gleichmäßig schon vor dem Zug
      const r = isoRemesh(s, L * MK, schnapp(s.h), 6);
      s = { h: r.h, loops: r.loops };
      const v0 = schnapp(s.h);
      runden(s, weiter);
      for (const l of s.loops) festlegen(s.h, l);
      console.log(bewZeile(`vor dem Zug gleichmäßig vernetzt (${s.h.n} Punkte) und gerechnet`, v0, schnapp(s.h)));
    }
    const stufen = art.startsWith('ohne') ? 1 : STUFEN;
    const spruenge: number[] = [];
    for (let stufe = 1; stufe <= stufen; stufe++) {
      const z = new LoopZug(s.h, s.loops, null, true, 'kurven', 'gleich');
      let d: (Float64Array | null)[] = [];
      const m = 60 / stufen;
      for (let k = 1; k <= m; k++) {
        d = verschiebung(s.loops, k / 60);
        z.schritt(d, 2);
      }
      z.schritt(d, 4);
      for (const l of s.loops) festlegen(s.h, l);
      const vor = schnapp(s.h);
      const n0 = s.h.n;
      if (L === 0) {
        const v = verdichten(s.h, s.loops, 1.75 * MK, { kurz: 0.5 * MK, genau: MK / 40 });
        if (v) s = { h: v.haut, loops: v.loops };
      } else {
        const r = isoRemesh(s, L * MK, vor, 3);
        s = { h: r.h, loops: r.loops };
      }
      const V0 = schnapp(s.h);
      runden(s, 4);
      for (const l of s.loops) festlegen(s.h, l);
      const nach = schnapp(s.h);
      const b = bewegung(vor, nach);
      spruenge.push(b.max);
      console.log(`  Stufe ${stufe}: ${n0} → ${s.h.n} Punkte;` + bewZeile(' vernetzen allein', vor, V0) + ';' + bewZeile(' Sprung (vier Runden danach)', vor, nach));
    }
    void je;
    runden(s, weiter);
    enden[art] = schnapp(s.h);
    console.log(`  Sprünge je Stufe: ${spruenge.map((x) => x.toFixed(2)).join(' / ')}`);
    console.log(gueteZeile('am Ende', guete(s.h)));
    console.log('  Spiegel/Topologie:', JSON.stringify(spiegelCheck(s.h)), JSON.stringify(topoCheck(s.h)));
  }
  console.log('\n=== Endformen gegeneinander (alle fertig gerechnet) ===');
  const namen = Object.keys(enden);
  for (let a = 0; a < namen.length; a++) for (let b = a + 1; b < namen.length; b++) console.log(bewZeile(`${namen[a]} ↔ ${namen[b]}`, enden[namen[a]!]!, enden[namen[b]!]!));
}
