 
// Gegenprüfung, Versuch im Scratchpad (nicht der Code des Fensters): „Ausgleich beim Netzwechsel“. Der heutige Löser (gleiche Gewichte)
// verlangt je Punkt die verteilte Krümmung c. Beim Wechsel auf das verdichtete Netz bekommt jeder Punkt einmal den Unterschied
// δ = (gemessene Krümmung auf dem neuen Netz) − (verteilte Krümmung auf dem neuen Netz) als festen Zuschlag: Damit ist die Fläche, wie
// sie beim Loslassen war, auf dem neuen Netz in Ruhe (kein Setzen, kein Sprung). Beim nächsten Zug klingt δ ab (hier linear über die
// Mausschritte), am Ende gilt wieder nur „aus den Kurven“. Eingehängt ohne Änderung am Kern: `HautAusKurven.prototype.kruemmung` wird zur
// Laufzeit umhüllt.
// FALL=hals|ruessel
import { HautAusKurven } from '../../../../../../packages/shape/src/dicht/ausKurven';
import { loopEinsetzen } from '../../../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, type V3, hautAus, vermessen } from '../../../../../../packages/shape/src/dicht/kurven';
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
import { type Schnapp, bewZeile, bewegung, schnapp, topoCheck } from './netzstat';

// ---- der Zuschlag: je Löser ein Feld δ (je Punkt), das auf die verteilte Krümmung kommt ----
type Mit = { __delta?: Float64Array | null; gew: Float64Array[] };
const proto = HautAusKurven.prototype as unknown as { kruemmung: (kap: Float64Array, seiten: unknown) => Float64Array };
const original = proto.kruemmung;
proto.kruemmung = function (this: Mit, kap: Float64Array, seiten: unknown): Float64Array {
  const c = original.call(this, kap, seiten);
  const d = this.__delta;
  if (d) for (let i = 0; i < c.length; i++) c[i] = c[i]! + d[i]!;
  return c;
};
/** δ so, dass die Haut, wie sie jetzt ist, auf diesem Netz in Ruhe ist */
function ausgleich(z: LoopZug, h: Haut): Float64Array {
  const l = z.loeser as unknown as Mit;
  const kap = vermessen(h, l.gew).kap;
  const c = original.call(l, kap, null);
  return kap.map((k, i) => k - c[i]!);
}
const setzeDelta = (z: LoopZug, d: Float64Array | null) => {
  (z.loeser as unknown as Mit).__delta = d;
};

const fall = process.env.FALL ?? 'hals';
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
const neuerZug = (s: Stand) => new LoopZug(s.h, s.loops, null, true, 'kurven', 'gleich');

const st = dreiLoops();
const MK = mittlereKante(st.h);
let verschiebung: (loops: Loop[], anteil: number) => (Float64Array | null)[];
if (fall === 'hals') {
  const m = st.loops.find((l) => l.art === 'mitte')!;
  const oben = m.punkte.reduce((b, p) => (p.ref.y > b.ref.y ? p : b)).kreuzung!;
  verschiebung = (loops, anteil) =>
    loops.map((l) => {
      const i = l.punkte.findIndex((p) => p.kreuzung === oben);
      return i < 0 ? null : punktZug(l, i, { x: 0, y: 160 * anteil, z: 0 });
    });
} else {
  const m = st.loops.find((l) => l.art === 'mitte')!;
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
console.log(`Fall ${fall}; mittlere Kante ${MK.toFixed(2)}`);

// 1. der Zug wie im Fenster, loslassen
const a = kopie(st);
{
  const z = neuerZug(a);
  let d: (Float64Array | null)[] = [];
  for (let k = 1; k <= 60; k++) {
    d = verschiebung(a.loops, k / 60);
    z.schritt(d, 2);
  }
  z.schritt(d, 4);
  for (const l of a.loops) festlegen(a.h, l);
}
const A = schnapp(a.h);
// 2. verdichten wie das Fenster
const v = verdichten(a.h, a.loops, 1.75 * MK, { kurz: 0.5 * MK, genau: MK / 40 })!;
const V0 = schnapp(v.haut);
console.log(`verdichtet: ${a.h.n} → ${v.haut.n} Punkte`);
console.log(bewZeile('Loslassen → verdichtet (kein Löser)', A, V0));

// heute: setzen ohne Ausgleich
const heute: Stand = kopie({ h: v.haut, loops: v.loops });
{
  const z = neuerZug(heute);
  z.schritt(
    heute.loops.map(() => null),
    4,
  );
  console.log(bewZeile('heute: vier Runden nach dem Verdichten (der Sprung)', A, schnapp(heute.h)));
  z.schritt(
    heute.loops.map(() => null),
    30,
  );
  for (const l of heute.loops) festlegen(heute.h, l);
}
const heuteFertig = schnapp(heute.h);

// mit Ausgleich
const mit: Stand = kopie({ h: v.haut, loops: v.loops });
let delta: Float64Array;
{
  const z = neuerZug(mit);
  delta = ausgleich(z, mit.h);
  const ab = Array.from(delta, Math.abs).sort((x, y) => x - y);
  // zum Einordnen: Krümmung der Startkugel im Maß des Lösers = 1/(2·150) = 0,00333
  console.log(`  Ausgleich δ × 300 (Kugel = 1): Median ${(300 * ab[ab.length >> 1]!).toFixed(3)}, 95 % ${(300 * ab[Math.floor(0.95 * ab.length)]!).toFixed(3)}, größter ${(300 * ab[ab.length - 1]!).toFixed(3)}`);
  setzeDelta(z, delta);
  z.schritt(
    mit.loops.map(() => null),
    4,
  );
  console.log(bewZeile('mit Ausgleich: vier Runden nach dem Verdichten', A, schnapp(mit.h)));
  const s4 = schnapp(mit.h);
  z.schritt(
    mit.loops.map(() => null),
    30,
  );
  console.log(bewZeile('mit Ausgleich: 30 Runden weiter (bleibt es stehen?)', s4, schnapp(mit.h)));
  console.log(bewZeile('mit Ausgleich: Loslassen → nach 34 Runden', A, schnapp(mit.h)));
  for (const l of mit.loops) festlegen(mit.h, l);
}

// 3. weiterziehen: noch einmal 20 Mausschritte in dieselbe Richtung (ein Drittel des ersten Zugs)
const WEITER = 20;
function weiter(name: string, s0: Stand, d0: Float64Array | null, abklingen: boolean): Schnapp {
  const s = kopie(s0);
  const z = neuerZug(s);
  let d: (Float64Array | null)[] = [];
  let vor = schnapp(s.h);
  let fern = 0;
  const istFern = (p: number[]) => (fall === 'hals' ? p[1]! < 60 : p[0]! < 60);
  for (let k = 1; k <= WEITER; k++) {
    if (d0) setzeDelta(z, abklingen ? d0.map((x) => x * (1 - k / WEITER)) : d0);
    d = verschiebung(s.loops, k / 60);
    z.schritt(d, 2);
    // Bewegung je Mausschritt fern vom Zug (dort sollte ohne Ausgleich fast nichts geschehen)
    const jetzt = schnapp(s.h);
    let m = 0;
    for (let q = 0; q < s.h.n; q++) {
      const p = [jetzt.P[3 * q]!, jetzt.P[3 * q + 1]!, jetzt.P[3 * q + 2]!];
      if (!istFern(p)) continue;
      m = Math.max(m, Math.hypot(p[0]! - vor.P[3 * q]!, p[1]! - vor.P[3 * q + 1]!, p[2]! - vor.P[3 * q + 2]!));
    }
    fern = Math.max(fern, m);
    vor = jetzt;
  }
  if (d0) setzeDelta(z, abklingen ? null : d0);
  const letzter = schnapp(s.h);
  z.schritt(d, 34);
  const ende = schnapp(s.h);
  const b = bewegung(letzter, ende);
  console.log(`  ${name}: je Mausschritt fern vom Zug höchstens ${fern.toFixed(2)}; nach dem Loslassen noch bis ${b.max.toFixed(2)} (Mittel ${b.mittel.toFixed(3)});`, JSON.stringify(topoCheck(s.h)));
  return ende;
}
console.log(`\nweiterziehen, ${WEITER} Mausschritte in dieselbe Richtung, kein weiteres Verdichten:`);
const e1 = weiter('heute (nach dem Sprung, ohne Ausgleich)', heute, null, false);
const e2 = weiter('mit Ausgleich, δ bleibt', mit, delta, false);
const e3 = weiter('mit Ausgleich, δ klingt über den Zug ab', mit, delta, true);
console.log(bewZeile('Endform: heute ↔ Ausgleich bleibt', e1, e2));
console.log(bewZeile('Endform: heute ↔ Ausgleich abgeklungen', e1, e3));
void heuteFertig;
