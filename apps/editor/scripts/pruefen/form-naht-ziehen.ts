// Plan „Objekte, Spiegel und Nähte“ (18.11.2026), Etappe 5, Beweis: Lebt die Naht? Florian: „ich kann objekte dann auch einfach
// wieder auseinanderschieben und der hilfsedgloop verschwindet. Das auseinanderziehen wirkt dann als würden sich zwei seifenblasen
// über einen schmaler werdenden hals trennen.“
//
// Zwei freie Kugeln mit je drei Linien: A (Halbmesser 150, im Ursprung) und B (Halbmesser 90). B wandert in Schritten von A weg, bis
// sich die beiden trennen. Bei jedem Schritt wird aus den zwei unveränderten Formen neu verbunden (der Baustein von Etappe 4,
// `src/form/naht.ts`) und gerechnet: einmal mit Kante an der Naht, einmal weich (K). Die verschmolzene Haut ist also abgeleitet;
// nichts wird von Schritt zu Schritt mitgenommen.
//
// Kriterien (Plan, Abschnitt 12):
//   1  bei jedem Abstand mit Überschneidung: Haut geschlossen, die Rechnung kommt zur Ruhe, kein Dreieck schlägt um (Kante und weich).
//      Gezählt werden Falten über 100° gegen ein Nachbardreieck, außer quer über die Naht (`gefaltet`); die alte Zählung steht daneben.
//   2  die Naht wird mit dem Abstand stetig kleiner; getrennt meldet der Baustein das
//   3  kein Sprung: Fern der Naht liegt die Haut von A von Schritt zu Schritt an derselben Stelle (höchstens 2 Einheiten anders)
//   4  die Zeit je Schritt (verbinden und rechnen)
//   5  ein Bild: die Abstände nebeneinander
// Aufruf aus packages/shape: [BLATT=<pfad ohne Endung>] [ABSTAENDE=150,180,…] npx vite-node ../../apps/editor/scripts/pruefen/form-naht-ziehen.ts
import { spiegelAnwenden } from '../../../../packages/shape/src/dicht/frei';
import type { Haut } from '../../../../packages/shape/src/dicht/kurven';
import { dreiLoops, falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, eckenAuto, festlegen, griffeAnlegen, hatPfad, hautLagen, istEckeVonSelbst, kantenKnicken, mittlereKante, pfadLagen } from '../../../../packages/shape/src/dicht/loops';
import { nadelnZusammenlegen } from '../../../../packages/shape/src/dicht/verdichten';
import { objekteVerbinden } from '../../src/form/naht';
import { flaechenAbstand } from './flaechenabstand';
import { type BlattBild, type BlattLinie, blattSchreiben } from './form-direkt-blatt';
import { nachVerdichten } from './form-direkt-faelle';
import { heute, kopie, randKnick } from './form-donut-teile';
import { hautVersetzt, loopVersetzt } from './form-naht-teile';

const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
let schlecht = 0;
const ok = (name: string, gut: boolean, text = ''): void => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};

/** eine freie Kugel mit drei Linien, in Ruhe gerechnet (wie in `form-naht.ts`) */
function freieKugel(): { h: Haut; loops: Loop[] } {
  const d = dreiLoops();
  for (const l of d.loops) griffeAnlegen(l, l.ruhe, true);
  const z = new LoopZug(d.h, d.loops, null, true, 'kurven', 'geometrie', {});
  const versch = d.loops.map((l) => Float64Array.from(pfadLagen(l) ?? l.ruhe, (x, k) => x - l.ruhe[k]!));
  for (let s = 1; s <= 4; s++) z.schritt(versch.map((v) => v.map((x) => (x * s) / 4)), 2);
  z.schritt(versch, 12);
  for (const l of d.loops) festlegen(d.h, l, !hatPfad(l));
  const f = spiegelAnwenden(d.h, d.loops, { naechsteId: 10, naechsteKreuzung: 100 });
  if ('fehler' in f) throw new Error(f.fehler);
  return { h: f.haut, loops: f.loops };
}

const A = freieKugel();
const B0 = freieKugel();
const K = 0.6;
// die Richtung, in der B liegt (wie im Beweis von Etappe 4: seitlich, auch quer zur Spiegelebene)
const U = ((x: number, y: number, z: number) => {
  const n = Math.hypot(x, y, z);
  return { x: x / n, y: y / n, z: z / n };
})(...((process.env.RICHTUNG ?? '170,50,30').split(',').map(Number) as [number, number, number]));
const ABSTAENDE = (process.env.ABSTAENDE ?? '150,180,205,222,232,238,246').split(',').map(Number);
/** in so vielen Stufen wird die Naht weich (Standard 30) und so oft wird danach noch einmal aufgeräumt und gerechnet (Standard 0) */
const RAMPE = Number(process.env.RAMPE ?? 30);
const NACH = Number(process.env.NACH ?? 0);

const pfade = (ls: readonly Loop[]): Float64Array[] => ls.map((l) => pfadLagen(l) ?? Float64Array.from(l.ruhe));
const legen = (hh: Haut, ls: readonly Loop[]): void => {
  for (const l of ls) festlegen(hh, l, !hatPfad(l));
};
const linieBild = (hh: Haut, l: Loop): BlattLinie => ({ p: Array.from(hautLagen(hh, l)), zu: l.art !== 'ring', hart: l.kante ? 1 : 0 });
const punkteBild = (ls: readonly Loop[]): number[][] => ls.flatMap((l) => l.punkte.filter((p) => !p.vonSelbst).map((p) => [p.ref.x, p.ref.y, p.ref.z]));
const inhaltVon = (hh: Haut): number => {
  let s = 0;
  for (let t = 0; t < hh.tri.length; t += 3) {
    const [a, b, c] = [hh.tri[t]!, hh.tri[t + 1]!, hh.tri[t + 2]!].map((v) => [hh.pos[3 * v]!, hh.pos[3 * v + 1]!, hh.pos[3 * v + 2]!]) as [number[], number[], number[]];
    s += a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) + a[1]! * (b[2]! * c[0]! - b[0]! * c[2]!) + a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!);
  }
  return s / 6;
};
/** jede Kante hat genau zwei Dreiecke */
const geschlossen = (hh: Haut): boolean => {
  const kanten = new Map<number, number>();
  for (let t = 0; t < hh.tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = hh.tri[t + k]!;
      const b = hh.tri[t + ((k + 1) % 3)]!;
      const key = Math.min(a, b) * hh.n + Math.max(a, b);
      kanten.set(key, (kanten.get(key) ?? 0) + 1);
    }
  for (const zahl of kanten.values()) if (zahl !== 2) return false;
  return true;
};
/**
 * Wirklich umgeschlagene Dreiecke: solche, die gegen ein Nachbardreieck um mehr als 100° gefaltet sind, über eine Kante, die nicht
 * auf der Naht liegt. `falten().umgeklappt` (jedes Dreieck gegen die gemittelten Normalen seiner Ecken) schlägt an einer sehr
 * scharfen Kante auch ohne Falte an: Dort mitteln die Ecken der Naht über beide Seiten (bei fast getrennten Formen über 130°).
 */
const gefaltet = (hh: Haut, naht: ReadonlySet<number>): number => {
  const T = hh.tri;
  const P = hh.pos;
  const n = T.length / 3;
  const N = new Float64Array(3 * n);
  for (let t = 0; t < n; t++) {
    const [a, b, c] = [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!];
    const ux = P[3 * b]! - P[3 * a]!;
    const uy = P[3 * b + 1]! - P[3 * a + 1]!;
    const uz = P[3 * b + 2]! - P[3 * a + 2]!;
    const vx = P[3 * c]! - P[3 * a]!;
    const vy = P[3 * c + 1]! - P[3 * a + 1]!;
    const vz = P[3 * c + 2]! - P[3 * a + 2]!;
    const x = uy * vz - uz * vy;
    const y = uz * vx - ux * vz;
    const z = ux * vy - uy * vx;
    const l = Math.hypot(x, y, z) || 1;
    N.set([x / l, y / l, z / l], 3 * t);
  }
  const kanten = new Map<number, number[]>();
  for (let t = 0; t < n; t++)
    for (let e = 0; e < 3; e++) {
      const a = T[3 * t + e]!;
      const b = T[3 * t + ((e + 1) % 3)]!;
      if (naht.has(a) && naht.has(b)) continue;
      const key = Math.min(a, b) * hh.n + Math.max(a, b);
      const l = kanten.get(key);
      if (l) l.push(t);
      else kanten.set(key, [t]);
    }
  const schlecht = new Set<number>();
  const cos100 = Math.cos((100 * Math.PI) / 180);
  for (const ts of kanten.values()) {
    if (ts.length !== 2) continue;
    const [p, q] = [ts[0]!, ts[1]!];
    if (N[3 * p]! * N[3 * q]! + N[3 * p + 1]! * N[3 * q + 1]! + N[3 * p + 2]! * N[3 * q + 2]! < cos100) {
      schlecht.add(p);
      schlecht.add(q);
    }
  }
  return schlecht.size;
};
/** Abstand eines Orts von der Achse durch die Mitten der zwei Kugeln */
const vonAchse = (x: number, y: number, z: number): number => {
  const t = x * U.x + y * U.y + z * U.z;
  return Math.hypot(x - t * U.x, y - t * U.y, z - t * U.z);
};
/** der mittlere Halbmesser einer Naht um die Achse */
const nahtRadius = (hh: Haut, l: Loop): number => {
  let s = 0;
  for (const p of l.proben) s += vonAchse(hh.pos[3 * p.ecken[0]]!, hh.pos[3 * p.ecken[0] + 1]!, hh.pos[3 * p.ecken[0] + 2]!);
  return s / l.proben.length;
};
/** wie weit die abgewandte Hälfte von A (hinter ihrer Mitte, von B aus gesehen) in `hh` neben der Haut `vor` liegt */
const fernAnders = (hh: Haut, vor: Haut): number => {
  const P: [number, number, number][] = [];
  for (let v = 0; v < hh.n; v++) {
    const [x, y, z] = [hh.pos[3 * v]!, hh.pos[3 * v + 1]!, hh.pos[3 * v + 2]!];
    if (x * U.x + y * U.y + z * U.z < -20) P.push([x, y, z]);
  }
  const Q: [number, number, number][] = Array.from({ length: vor.n }, (_, i) => [vor.pos[3 * i]!, vor.pos[3 * i + 1]!, vor.pos[3 * i + 2]!]);
  const d = flaechenAbstand(P, Q, Array.from({ length: vor.tri.length / 3 }, (_, t) => [vor.tri[3 * t]!, vor.tri[3 * t + 1]!, vor.tri[3 * t + 2]!]), 30);
  let max = 0;
  for (let i = 0; i < d.length; i++) max = Math.max(max, d[i]!);
  return max;
};

/**
 * So nah (Einheiten) an einer Kreuzung zweier Linien gilt: Die Naht läuft durch die Kreuzung (eine halbe Kante des Netzes). Gemessen:
 * 1,0 daneben falten sich 10 Dreiecke, 4,9 daneben keins.
 */
const KREUZUNG_NAH = 4;
type Schritt = {
  d: number;
  getrennt: string | null;
  /** so nah kommt die Naht einer Kreuzung zweier Linien einer der beiden Formen */
  kreuzung: number;
  kante?: { steht: boolean; umgeschlagen: number; gezaehlt: number; bewegt: number; zu: boolean; laenge: number; radius: number; knick: number; inhalt: number; ms: number; haut: Haut };
  weich?: { steht: boolean; umgeschlagen: number; gezaehlt: number; zu: boolean; knick: number; inhalt: number; ms: number; haut: Haut; fehler?: string };
  verbindenMs: number;
};
const schritte: Schritt[] = [];
const bilderKante: BlattBild[] = [];
const bilderWeich: BlattBild[] = [];
console.log(`A: ${A.h.n} Punkte, Kante ${z1(mittlereKante(A.h))}; B: Halbmesser ${z1(150 * K)}; Abstände der Mitten ${ABSTAENDE.join(', ')} (glatte Kugeln berühren sich bei ${z1(150 + 150 * K)})`);
for (const d of ABSTAENDE) {
  const D = { x: U.x * d, y: U.y * d, z: U.z * d };
  const hB = hautVersetzt(B0.h, K, D);
  const loopsB = B0.loops.map((l) => loopVersetzt(l, K, D, 0));
  const E = await objekteVerbinden({ haut: A.h, loops: A.loops, spiegelbild: false }, { haut: hB, loops: loopsB, spiegelbild: false }, 'vereinen', { naechsteId: 1000, naechsteKreuzung: 5000 });
  if ('fehler' in E) {
    schritte.push({ d, getrennt: E.fehler, kreuzung: Infinity, verbindenMs: 0 });
    console.log(`     Abstand ${d}: ${E.fehler}`);
    continue;
  }
  const S: Schritt = { d, getrennt: null, kreuzung: Infinity, verbindenMs: E.ms };
  let haut = E.haut;
  let loops = E.loops;
  // wie nah die Naht einer Kreuzung zweier Linien kommt (der Formen, wie sie hineingehen)
  {
    const orte = [...A.loops, ...loopsB].flatMap((l) => l.punkte.filter((p) => p.kreuzung !== undefined).map((p) => p.ref));
    for (const l of loops)
      if (E.naehte.includes(l.id))
        for (const p of l.proben) {
          const [x, y, z] = [haut.pos[3 * p.ecken[0]]!, haut.pos[3 * p.ecken[0] + 1]!, haut.pos[3 * p.ecken[0] + 2]!];
          for (const q of orte) S.kreuzung = Math.min(S.kreuzung, Math.hypot(q.x - x, q.y - y, q.z - z));
        }
  }
  const mk = mittlereKante(haut);
  const istNaht = (l: Loop): boolean => E.naehte.includes(l.id);
  const naht = (): Loop => loops.find(istNaht)!;
  // ---------- mit Kante ----------
  try {
    const t0 = performance.now();
    const nd = nadelnZusammenlegen(haut, loops, mk);
    if (nd) {
      haut = nd.haut;
      loops = nd.loops;
    }
    let v = nachVerdichten(haut, loops, mk);
    haut = v.h;
    loops = v.loops;
    const r1 = heute(haut, loops, pfade(loops), 20, 300);
    legen(haut, loops);
    v = nachVerdichten(haut, loops, mk);
    haut = v.h;
    loops = v.loops;
    const r2 = heute(haut, loops, pfade(loops), 0, 300);
    legen(haut, loops);
    const kn = randKnick(haut, naht().proben.map((p) => p.ecken[0]));
    // wie weit die Rechnung die Haut gegen den Schnitt selbst bewegt hat (mit Kante sollte sie nichts zu tun haben)
    const PQ = (x: Haut): [number, number, number][] => Array.from({ length: x.n }, (_, i) => [x.pos[3 * i]!, x.pos[3 * i + 1]!, x.pos[3 * i + 2]!]);
    const ab = flaechenAbstand(PQ(haut), PQ(E.haut), Array.from({ length: E.haut.tri.length / 3 }, (_, t) => [E.haut.tri[3 * t]!, E.haut.tri[3 * t + 1]!, E.haut.tri[3 * t + 2]!]), 30);
    let bewegt = 0;
    for (let i = 0; i < ab.length; i++) bewegt = Math.max(bewegt, ab[i]!);
    S.kante = { steht: r1.steht && r2.steht, umgeschlagen: gefaltet(haut, new Set(naht().proben.map((p) => p.ecken[0]))), gezaehlt: falten(haut).umgeklappt, bewegt, zu: geschlossen(haut), laenge: naht().laenge, radius: nahtRadius(haut, naht()), knick: kn.mittel, inhalt: inhaltVon(haut), ms: performance.now() - t0, haut: kopie(haut) };
    bilderKante.push({ name: `Abstand ${d}`, h: kopie(haut), loops: [], fertig: { linien: loops.map((l) => linieBild(haut, l)), punkte: punkteBild(loops) }, notiz: `Naht: Umfang ${z1(naht().laenge)}, Halbmesser ${z1(S.kante.radius)}; Knick ${z1(kn.mittel)}°` });
  } catch (e) {
    console.log(`FEHL Abstand ${d}, Kante: ${(e as Error).message}`);
    schlecht++;
    schritte.push(S);
    continue;
  }
  // ---------- weich (K) ----------
  try {
    const t0 = performance.now();
    const vorher = new Set(loops.flatMap((l) => l.punkte.filter(istEckeVonSelbst)));
    const n = naht();
    n.kante = false;
    for (const p of n.punkte) delete p.kante;
    eckenAuto(loops);
    kantenKnicken(loops, vorher);
    const r1 = heute(haut, loops, pfade(loops), RAMPE, 300);
    legen(haut, loops);
    let v = nachVerdichten(haut, loops, mk);
    haut = v.h;
    loops = v.loops;
    let r2 = heute(haut, loops, pfade(loops), 0, 300);
    legen(haut, loops);
    for (let k = 0; k < NACH; k++) {
      v = nachVerdichten(haut, loops, mk);
      haut = v.h;
      loops = v.loops;
      r2 = heute(haut, loops, pfade(loops), 0, 300);
      legen(haut, loops);
    }
    const kn = randKnick(haut, naht().proben.map((p) => p.ecken[0]));
    S.weich = { steht: r1.steht && r2.steht, umgeschlagen: gefaltet(haut, new Set()), gezaehlt: falten(haut).umgeklappt, zu: geschlossen(haut), knick: kn.mittel, inhalt: inhaltVon(haut), ms: performance.now() - t0, haut: kopie(haut) };
    bilderWeich.push({ name: `Abstand ${d}`, h: kopie(haut), loops: [], fertig: { linien: loops.map((l) => linieBild(haut, l)), punkte: punkteBild(loops) }, notiz: `Knick an der Naht ${z1(kn.mittel)}°; umgeschlagen ${S.weich.umgeschlagen}${S.weich.steht ? '' : '; steht nicht'}` });
  } catch (e) {
    S.weich = { steht: false, umgeschlagen: -1, gezaehlt: -1, zu: false, knick: NaN, inhalt: NaN, ms: 0, haut, fehler: (e as Error).message };
  }
  schritte.push(S);
  const k = S.kante;
  const w = S.weich;
  console.log(
    `     Abstand ${d}${S.kreuzung < KREUZUNG_NAH ? ` (die Naht läuft durch eine Kreuzung: ${z1(S.kreuzung)} daneben)` : ''}: verbinden ${Math.round(S.verbindenMs)} ms · Kante: ${k.steht ? 'steht' : 'steht nicht'}, gefaltet ${k.umgeschlagen} (alte Zählung ${k.gezaehlt}), die Rechnung bewegt die Haut um ${z2(k.bewegt)}, Naht Umfang ${z1(k.laenge)} (Halbmesser ${z1(k.radius)}), Knick ${z1(k.knick)}°, ${Math.round(k.ms)} ms · weich: ${w.fehler ? `hält nicht (${w.fehler})` : `${w.steht ? 'steht' : 'steht nicht'}, gefaltet ${w.umgeschlagen} (alte Zählung ${w.gezaehlt}), Knick ${z1(w.knick)}°, Rauminhalt ${(100 * (w.inhalt / k.inhalt - 1)).toFixed(1)} % gegen Kante, ${Math.round(w.ms)} ms`}`,
  );
}

// ---------- die Kriterien ----------
const mit = schritte.filter((s) => !s.getrennt && s.kante);
const k1 = mit.filter((s) => s.kante!.steht && s.kante!.umgeschlagen === 0 && s.kante!.zu);
const w1 = mit.filter((s) => s.weich && !s.weich.fehler && s.weich.steht && s.weich.umgeschlagen === 0 && s.weich.zu);
// (wo die Naht durch eine Kreuzung zweier Linien läuft, faltet die weiche Naht einige Dreiecke: steht aus, Plan Abschnitt 12)
const frei = mit.filter((s) => s.kreuzung >= KREUZUNG_NAH);
const anKreuzung = mit.filter((s) => s.kreuzung < KREUZUNG_NAH);
ok('1a mit Kante: bei jedem Abstand geschlossen, die Rechnung steht, nichts schlägt um', k1.length === mit.length && mit.length >= 4, `${k1.length} von ${mit.length} Abständen`);
ok(
  '1b weich (K): bei jedem Abstand geschlossen, die Rechnung steht, nichts schlägt um (außer wo die Naht durch eine Kreuzung läuft)',
  frei.every((s) => w1.includes(s)) && frei.length >= 4,
  `${frei.filter((s) => w1.includes(s)).length} von ${frei.length} Abständen${frei.some((s) => !w1.includes(s)) ? `; nicht bei ${frei.filter((s) => !w1.includes(s)).map((s) => `${s.d} (${s.weich?.fehler ?? `${s.weich?.steht ? 'steht' : 'steht nicht'}, gefaltet ${s.weich?.umgeschlagen}`})`).join(', ')}` : ''}`,
);
for (const s of anKreuzung) console.log(`OFFEN weich, die Naht läuft durch eine Kreuzung (Abstand ${s.d}, ${z1(s.kreuzung)} daneben): ${s.weich?.fehler ?? `${s.weich?.steht ? 'steht' : 'steht nicht'}, gefaltet ${s.weich?.umgeschlagen} Dreiecke`}`);
let stetig = true;
for (let i = 1; i < mit.length; i++) if (!(mit[i]!.kante!.laenge < mit[i - 1]!.kante!.laenge)) stetig = false;
const getrennt = schritte.filter((s) => s.getrennt);
ok(
  '2 die Naht wird mit dem Abstand stetig kleiner; getrennt meldet es der Baustein',
  stetig && getrennt.length >= 1 && getrennt.every((s) => /berühren sich nicht/.test(s.getrennt!)) && schritte.findIndex((s) => s.getrennt) === mit.length,
  `Umfang ${mit.map((s) => `${s.d}: ${z1(s.kante!.laenge)}`).join(' · ')}; getrennt bei ${getrennt.map((s) => s.d).join(', ') || 'keinem'}`,
);
let sprungK = 0;
let sprungW = 0;
for (let i = 1; i < mit.length; i++) {
  sprungK = Math.max(sprungK, fernAnders(mit[i]!.kante!.haut, mit[i - 1]!.kante!.haut));
  if (mit[i]!.weich && !mit[i]!.weich!.fehler && mit[i - 1]!.weich && !mit[i - 1]!.weich!.fehler) sprungW = Math.max(sprungW, fernAnders(mit[i]!.weich!.haut, mit[i - 1]!.weich!.haut));
}
ok('3 kein Sprung: Die abgewandte Hälfte von A liegt von Schritt zu Schritt an derselben Stelle', sprungK <= 2 && sprungW <= 2, `größter Unterschied zwischen zwei Schritten: mit Kante ${z2(sprungK)}, weich ${z2(sprungW)} Einheiten (Halbmesser von A: 150)`);
const zeit = (f: (s: Schritt) => number): string => {
  const x = mit.map(f).sort((a, b) => a - b);
  return `${Math.round(x[0]!)} bis ${Math.round(x[x.length - 1]!)} ms`;
};
console.log(`     4 Zeit je Schritt: verbinden ${zeit((s) => s.verbindenMs)}; rechnen mit Kante ${zeit((s) => s.kante!.ms)}; weich dazu ${zeit((s) => s.weich?.ms ?? 0)}`);

if (process.env.BLATT) {
  const blicke: [string, number, number, number?][] = [
    ['Seite', 0, 0],
    ['schräg', -35, 25],
  ];
  blattSchreiben(
    `${process.env.BLATT}.html`,
    'Etappe 5: die Naht lebt. Die kleine Form wandert weg; bei jedem Abstand neu verbunden und gerechnet',
    [
      { titel: 'Die Naht weich (K): der Hals wird schmaler. Blau: Linien.', bilder: bilderWeich, blicke, mitte: [120, 35, 20], mass: 470 },
      { titel: 'Die Naht mit Kante. Schwarz: Kante an.', bilder: bilderKante, blicke, mitte: [120, 35, 20], mass: 470 },
    ],
    Number(process.env.BREITE ?? 2400),
    'Flach schattiert, damit jeder Knick zu sehen ist (das übertreibt jede Unruhe). Rot: umgestülpte Fläche.',
  );
  console.log(`Blatt: ${process.env.BLATT}.html`);
}
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
process.exit(schlecht ? 1 : 0);
