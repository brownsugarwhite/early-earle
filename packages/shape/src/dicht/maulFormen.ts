// Plan vom 12.11.2026, Schritt 6 (13.11.): das Maul als echte Geometrie, automatisch geformt wie von Hand.
//
// Florian: „Das Maul soll aber an einem gewählten Edgeloop immer noch automatisch entstehen. […] Im Grunde machst du ja nur die
// Kante hart und verbindest von der Seite die gegenüberliegenden Seiten. […] Das Maul ist dann einfach eine Form wie von Hand
// gemacht, nur automatisiert.“ Und: „Es soll aussehen, als wäre der Edgeloop von der Seitenansicht durchgestanzt mit genau der Form
// des Maulloops von der Seite. Das heißt, die Mittellinie muss von der Seite exakt den Shape der Maullinie haben.“
//
// Es wird nichts geschnitten und nichts eingesetzt (wie bei der schmalen Form mit dem Inneren der Anzeige, `maulLoop.ts`). Es wird
// nur an Linien gezogen, die Haut folgt der Rechnung der Grundform in Schritten, wie bei einem Zug von Hand:
//   1  Die Maullinie (ein Ring: von der Mitte der einen Lippe über den Mundwinkel zur Mitte der anderen) wird eine Kante.
//   2  Die Mittellinie (wird angelegt, wenn sie fehlt) und eine Querlinie durch beide Mundwinkel: ein Ring um den Kopf in der Ebene des
//      Mauls. Er kreuzt die Mittellinie vorn zwischen den Lippen und die Maullinie in den Mundwinkeln. Sein Stück dazwischen ist die
//      Verbindung der gegenüberliegenden Seiten; es ist hart.
//   3  Durchstanzen: Die Mittellinie bekommt im Maul die Punkte und Griffe der Maullinie, flach auf die Mittelebene gelegt (von der
//      Seite ist sie dann genau die Maullinie); die Kreuzung vorn wandert dabei zwischen die Mundwinkel, das Stück der Querlinie bis
//      zum Mundwinkel wird gerade. Gezogen wird in Stufen, dazwischen wird verfeinert wie nach jedem Zug. Aus der Fläche zwischen den
//      Lippen werden Gaumen und Boden.
// Gemessen (`apps/editor/scripts/pruefen/form-maul-automatisch.ts`, Kugel mit Maullinie): Die Haut steht, nichts schlägt um, die
// Mittellinie liegt im Maul 0,27 neben der Maullinie von der Seite. Dieselbe Form auf einmal hineingebaut (`form-maul-haut.ts`) kommt
// nicht zur Ruhe: Der Unterschied ist das Formen in Schritten.

import type { HautGewichte, HautOptionen } from './ausKurven';
import { loopEinsetzen } from './einsetzen';
import type { Haut, V3 } from './kurven';
import { type Loop, type LoopPunkt, LoopZug, eckenAuto, griffeAnlegen, hatPfad, hautLagen, kreuzungenZwischen, loopAusSchnitt, mittlereKante, pfadLagen, punktEinfuegen } from './loops';
import { mundwinkelProbe } from './maulLoop';
import { verdichten } from './verdichten';

export type MaulFormenOptionen = {
  /** die nächste freie Nummer für einen Loop und für eine Kreuzung (wie im Fenster) */
  naechsteId: number;
  naechsteKreuzung: number;
  /** in so vielen Stufen wird gezogen (Standard 8), je Stufe so viele Schritte zu zwei Runden (Standard 8) */
  stufen?: number;
  schritte?: number;
  /** die Rechnung der Grundform, wie das Fenster sie benutzt */
  gewichte?: HautGewichte;
  loeser?: HautOptionen;
  /** nach jeder Stufe verfeinern wie das Fenster nach einem Zug; ohne Angabe bleibt das Netz, wie es ist */
  verdichten?: { maxKante: number; opt: NonNullable<Parameters<typeof verdichten>[3]> };
  /**
   * Die neuen Linien (Mittellinie, Querlinie) bekommen Punkte, wo es nötig ist, damit ihr Pfad höchstens so weit neben der Linie
   * liegt (Standard 5 % der mittleren Kante). Mit nur den Punkten an den Kreuzungen lief die Mittellinie in einem einzigen Stück
   * um den ganzen Körper, und die Kugel wurde beim Setzen um 21 verformt.
   */
  punkteBis?: number;
  /** die Verbindung von der Mitte zum Mundwinkel ist hart (Standard); falsch: zum Vergleich weich */
  querHart?: boolean;
  /** nach jedem Abschnitt gerufen (zum Zeigen oder Messen): Name, Haut und Loops von jetzt, und `alt` wie im Ergebnis */
  zwischen?: (was: string, haut: Haut, loops: readonly Loop[], alt: Int32Array) => void;
};

export type MaulGeformt = {
  haut: Haut;
  loops: Loop[];
  /** je Punkt der neuen Haut seine Nummer in der alten (−1: neu); die gebliebenen alten stehen vorn in ihrer Reihenfolge */
  alt: Int32Array;
  naechsteId: number;
  naechsteKreuzung: number;
  /** Nummern der Mittellinie und der Querlinie durch die Mundwinkel */
  mitte: number;
  quer: number;
  /** Runden insgesamt, und ob die Haut am Ende steht */
  runden: number;
  steht: boolean;
};

const RUHE = 0.02;
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });
const flach = (v: V3): V3 => ({ x: v.x, y: v.y, z: 0 });
const zwischen = (a: V3, b: V3, f: number): V3 => ({ x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y), z: a.z + f * (b.z - a.z) });
const kopieLoops = (L: readonly Loop[]): Loop[] =>
  L.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.ref }, ...(p.ein ? { ein: { ...p.ein } } : {}), ...(p.aus ? { aus: { ...p.aus } } : {}) })) }));

/**
 * Das Maul am Ring `maulId` formen (siehe Kopf der Datei). Haut und Loops bleiben unberührt; zurück kommen die neue Haut und die
 * neuen Loops, oder `fehler` mit dem Grund, warum es so nicht geht.
 */
export function maulFormen(h0: Haut, loops0: readonly Loop[], maulId: number, opt: MaulFormenOptionen): MaulGeformt | { fehler: string } {
  const stufen = Math.max(1, opt.stufen ?? 8);
  const schritte = Math.max(1, opt.schritte ?? 8);
  let haut: Haut = { ...h0, pos: Float64Array.from(h0.pos) };
  let loops = kopieLoops(loops0);
  let naechsteId = opt.naechsteId;
  let naechsteKreuzung = opt.naechsteKreuzung;
  let her = Int32Array.from({ length: haut.n }, (_, v) => v);
  let runden = 0;
  const finde = (id: number): Loop => loops.find((l) => l.id === id)!;

  const L0 = loops.find((l) => l.id === maulId);
  if (!L0 || L0.art !== 'ring') return { fehler: 'die gewählte Linie ist kein Ring (eine schmale Form ums Maul, vorn über den Umriss oder über die Mitte gezeichnet)' };
  if (!L0.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) return { fehler: 'die Maullinie liegt nur auf der Haut (nicht ins Netz eingesetzt)' };
  if (!hatPfad(L0)) return { fehler: 'die Maullinie hat noch keine Griffe' };

  /** Runden zu den Zielen (sonst: jede Linie auf ihrem Pfad), bis die Haut steht; `n`: der Weg in so vielen Schritten zu zwei Runden */
  const rechnen = (ziel?: readonly Float64Array[], n = 0): boolean => {
    const z = new LoopZug(haut, loops, null, true, 'kurven', opt.gewichte ?? 'geometrie', opt.loeser ?? { halb: true });
    const Z = ziel ?? loops.map((l) => pfadLagen(l) ?? Float64Array.from(l.ruhe));
    const versch = loops.map((l, i) => Float64Array.from(Z[i]!, (x, k) => x - l.ruhe[k]!));
    for (let k = 1; k <= n; k++) z.schritt(versch.map((d) => d.map((x) => (x * k) / n)), 2);
    runden += 2 * n;
    let letzte = Infinity;
    const vor = new Float64Array(haut.pos.length);
    for (let r = 0; r < 400 && letzte > RUHE; r++) {
      vor.set(haut.pos);
      z.schritt(versch, 1);
      runden++;
      letzte = 0;
      for (let k = 0; k < vor.length; k += 3) letzte = Math.max(letzte, Math.hypot(haut.pos[k]! - vor[k]!, haut.pos[k + 1]! - vor[k + 1]!, haut.pos[k + 2]! - vor[k + 2]!));
    }
    for (const l of loops) {
      l.ruhe = hautLagen(haut, l);
      for (const p of l.punkte) p.ref = { ...p.cur };
    }
    return letzte <= RUHE;
  };

  /** Eine Linie schneiden und einsetzen wie das Werkzeug L: Kreuzungen als Punkte, Ecken an Kanten, Griffe; null, wenn es nicht geht */
  const einsetzen = (a: 'top' | 'seite', P: [number, number], Q: [number, number]): Loop | null => {
    const l = loopAusSchnitt(haut, a, P, Q, naechsteId, 8);
    if (!l) return null;
    const liste = [...loops, l];
    const r = loopEinsetzen(haut, liste, liste.length - 1);
    if (!r) return null;
    naechsteId++;
    // neue Punkte des Netzes stehen hinten
    if (r.haut.n !== haut.n) {
      const h2 = new Int32Array(r.haut.n).fill(-1);
      h2.set(her.subarray(0, Math.min(her.length, r.haut.n)));
      her = h2;
    }
    haut = r.haut;
    loops = r.loops;
    const neu = loops[loops.length - 1]!;
    const tol = 0.25 * mittlereKante(haut);
    for (let i = 0; i < loops.length - 1; i++) {
      const x = loops[i]!;
      for (const f of kreuzungenZwischen(x, x.ruhe, neu, neu.ruhe, tol)) {
        const k = naechsteKreuzung++;
        // liegt dort schon ein Punkt ohne Kreuzung (der Mundwinkel), wird er es selbst: sonst läge dicht daneben ein zweiter
        const da = x.punkte.find((p) => p.kreuzung === undefined && Math.abs(p.s - f.sa) < 0.5 * tol);
        if (da) da.kreuzung = k;
        else punktEinfuegen(x, f.sa, k, hatPfad(x));
        punktEinfuegen(neu, f.sb, k);
      }
    }
    eckenAuto(loops);
    griffeAnlegen(neu, neu.ruhe, true, opt.punkteBis ?? 0.05 * mittlereKante(haut));
    for (const x of loops) for (const p of x.punkte) p.cur = { ...p.ref };
    return neu;
  };

  // ---------- 1. Mundwinkel und Achse des Mauls; die Lippen hart ----------
  let W: LoopPunkt | undefined = L0.punkte.find((p) => p.mundwinkel);
  if (!W) {
    const s = L0.s[mundwinkelProbe(L0)]!;
    W = L0.punkte.find((p) => Math.abs(p.s - s) < mittlereKante(haut)) ?? punktEinfuegen(L0, s, undefined, true);
    W.mundwinkel = true;
    if (W.ecke === undefined) W.ecke = true;
    W.cur = { ...W.ref };
  }
  const G = { ...W.ref };
  const eA = lage(L0.ruhe, 0);
  const eB = lage(L0.ruhe, L0.proben.length - 1);
  const vorn = { x: (eA.x + eB.x) / 2, y: (eA.y + eB.y) / 2 };
  const ax = { x: vorn.x - G.x, y: vorn.y - G.y };
  if (Math.hypot(ax.x, ax.y) < 1e-6 || Math.abs(G.z) < 1e-6) return { fehler: 'der Mundwinkel liegt auf der Mitte (die Maullinie muss von der Mitte über die Seite laufen)' };
  L0.kante = true;
  L0.maulGeformt = true;
  rechnen();
  opt.zwischen?.('Lippen hart', haut, loops, her);

  // ---------- 2. Mittellinie und Querlinie ----------
  const endenK = (): (number | undefined)[] => {
    const L = finde(maulId);
    return [L.punkte[0]?.kreuzung, L.punkte[L.punkte.length - 1]?.kreuzung];
  };
  const durchBeideEnden = (l: Loop): boolean => l.art === 'mitte' && endenK().every((k) => k !== undefined && l.punkte.some((p) => p.kreuzung === k));
  let mitteId = loops.find(durchBeideEnden)?.id;
  if (mitteId === undefined) {
    // eine Mittellinie, die durch beide Enden läuft, deren Kreuzungen aber noch keine Punkte sind
    const L = finde(maulId);
    const enden = [L.proben[0]!.ecken[0], L.proben[L.proben.length - 1]!.ecken[0]];
    const da = loops.find((l) => l.art === 'mitte' && enden.every((v) => l.proben.some((p) => p.ecken[0] === v)));
    if (da) {
      enden.forEach((v, j) => {
        const k = naechsteKreuzung++;
        punktEinfuegen(da, da.s[da.proben.findIndex((p) => p.ecken[0] === v)]!, k, hatPfad(da));
        punktEinfuegen(L, j === 0 ? 0 : L.laenge, k, true);
      });
      eckenAuto(loops);
      for (const x of loops) for (const p of x.punkte) p.cur = { ...p.ref };
      mitteId = da.id;
    } else {
      let weit = 0;
      for (let i = 0; i < haut.pos.length; i++) weit = Math.max(weit, Math.abs(haut.pos[i]!));
      const neu = einsetzen('top', [-4 * weit, 0], [4 * weit, 0]);
      if (!neu || !durchBeideEnden(neu)) return { fehler: 'die Mittellinie fehlt und lässt sich hier nicht anlegen (die Maullinie muss auf ihr beginnen und enden)' };
      mitteId = neu.id;
    }
  }
  rechnen();
  opt.zwischen?.('Mittellinie', haut, loops, her);
  const querNeu = einsetzen('seite', [G.x + 3 * ax.x, G.y + 3 * ax.y], [G.x - 4 * ax.x, G.y - 4 * ax.y]);
  if (!querNeu || querNeu.art !== 'ring') return { fehler: 'die Querlinie durch die Mundwinkel lässt sich nicht einsetzen' };
  const querId = querNeu.id;

  // die Kreuzung vorn zwischen den Lippen (Mittellinie × Querlinie) und die der Querlinie mit der Maullinie (Mundwinkel)
  let vornP: LoopPunkt | undefined;
  {
    const M = finde(mitteId);
    let best = Infinity;
    for (const p of finde(querId).punkte) {
      if (p.kreuzung === undefined || !M.punkte.some((q) => q.kreuzung === p.kreuzung)) continue;
      const d = Math.hypot(p.ref.x - vorn.x, p.ref.y - vorn.y, p.ref.z);
      if (d < best) {
        best = d;
        vornP = p;
      }
    }
  }
  if (!vornP) return { fehler: 'die Querlinie kreuzt die Mittellinie nicht zwischen den Lippen' };
  const kVorn = vornP.kreuzung!;
  const winkelP = finde(querId).punkte.find((p) => p.kreuzung !== undefined && finde(maulId).punkte.some((q) => q.kreuzung === p.kreuzung));
  // Die Verbindung von der Mitte zum Mundwinkel ist hart (zwischen diesen beiden Punkten der Querlinie). Außen um den Kopf ist die
  // Querlinie eine gewöhnliche Linie: Dicht hinter dem Mundwinkel bekommt sie einen Punkt ohne Kante, dort läuft der Knick aus.
  // (Eine Kante reicht bis zu den Nachbarpunkten; ohne diesen Punkt war die Querlinie bis zu ihrem Ende hinten hart, und eine
  // Kugel wurde zur Zitrone: Jede Hälfte rundete sich für sich.)
  if (opt.querHart !== false) vornP.kante = true;
  if (winkelP && opt.querHart !== false) {
    winkelP.kante = true;
    const Q = finde(querId);
    const nachHinten = Q.punkte.indexOf(vornP) < Q.punkte.indexOf(winkelP) ? 1 : -1;
    const s = winkelP.s + nachHinten * 2.5 * mittlereKante(haut);
    const weiter = Q.punkte[Q.punkte.indexOf(winkelP) + nachHinten];
    if (s > 0 && s < Q.laenge && (!weiter || nachHinten * (weiter.s - s) > mittlereKante(haut))) {
      const aus = punktEinfuegen(Q, s, undefined, true);
      aus.kante = false;
      aus.cur = { ...aus.ref };
    } else if (weiter && weiter.kante === undefined) weiter.kante = false;
  }
  eckenAuto(loops);
  rechnen();
  opt.zwischen?.('Querlinie', haut, loops, her);

  // ---------- 3. durchstanzen ----------
  type Ziel = { loop: number; i: number; ort?: V3; ein?: V3; aus?: V3 };
  const ziele: Ziel[] = [];
  {
    const L = finde(maulId);
    const M = finde(mitteId);
    const n = M.punkte.length;
    const amWinkel = (q: LoopPunkt): boolean => Math.hypot(q.ref.x - G.x, q.ref.y - G.y, q.ref.z - G.z) < 1;
    const iW = L.punkte.findIndex((q) => q.mundwinkel);
    const erste = L.punkte[0]!;
    const letzte = L.punkte[L.punkte.length - 1]!;
    const vorWinkel = L.punkte.slice(1, iW).filter((q) => !amWinkel(q));
    const nachWinkel = L.punkte.slice(iW + 1, -1).filter((q) => !amWinkel(q));
    const pE0 = M.punkte.find((q) => q.kreuzung === erste.kreuzung);
    const pE1 = M.punkte.find((q) => q.kreuzung === letzte.kreuzung);
    const pT = M.punkte.find((q) => q.kreuzung === kVorn);
    if (!pE0 || !pE1 || !pT) return { fehler: 'die Mittellinie kreuzt die Maullinie nicht an beiden Lippen' };
    const folgt = (a: LoopPunkt, b: LoopPunkt): boolean => (M.punkte.indexOf(b) - M.punkte.indexOf(a) + n) % n === 1;
    // läuft die Mittellinie vom Ende der Maullinie über die Mitte zu ihrem Anfang (dann die Maullinie rückwärts) oder umgekehrt?
    const rueck = folgt(pE1, pT) && folgt(pT, pE0);
    if (!rueck && !(folgt(pE0, pT) && folgt(pT, pE1))) return { fehler: 'zwischen den Lippen liegt auf der Mittellinie noch ein anderer Punkt' };
    const von = rueck ? pE1 : pE0;
    const bis = rueck ? pE0 : pE1;
    const erst = rueck ? [...nachWinkel].reverse() : vorWinkel;
    const dann = rueck ? [...vorWinkel].reverse() : nachWinkel;
    const hinein = (q: LoopPunkt): V3 => flach((rueck ? q.aus : q.ein)!);
    const hinaus = (q: LoopPunkt): V3 => flach((rueck ? q.ein : q.aus)!);
    // neue Punkte der Mittellinie: je Punkt der Maullinie einer, zunächst gleichmäßig auf dem kurzen Stück zwischen den Lippen
    const neuePunkte = (a: LoopPunkt, b: LoopPunkt, zahl: number): LoopPunkt[] => {
      const ds = (b.s - a.s + M.laenge) % M.laenge;
      const sA = a.s;
      return Array.from({ length: zahl }, (_, j) => punktEinfuegen(M, (sA + (ds * (j + 1)) / (zahl + 1)) % M.laenge, undefined, true));
    };
    const neuErst = neuePunkte(von, pT, erst.length);
    const neuDann = neuePunkte(pT, bis, dann.length);
    const nr = (q: LoopPunkt): number => M.punkte.indexOf(q);
    erst.forEach((q, j) => ziele.push({ loop: M.id, i: nr(neuErst[j]!), ort: flach(q.ref), ein: hinein(q), aus: hinaus(q) }));
    dann.forEach((q, j) => ziele.push({ loop: M.id, i: nr(neuDann[j]!), ort: flach(q.ref), ein: hinein(q), aus: hinaus(q) }));
    // am Mundwinkel können zwei Punkte liegen (er selbst und eine Kreuzung dicht daneben): Der Griff zur einen Lippe steht am
    // ersten, der zur anderen am letzten
    const amW = L.punkte.filter(amWinkel);
    const zuAnfang = flach(amW[0]!.ein!);
    const zuEnde = flach(amW[amW.length - 1]!.aus!);
    ziele.push({ loop: M.id, i: nr(pT), ort: flach(G), ein: rueck ? zuEnde : zuAnfang, aus: rueck ? zuAnfang : zuEnde });
    // an den Lippen vorn: der Griff ins Maul wie der der Maullinie dort (der andere bleibt)
    ziele.push({ loop: M.id, i: nr(von), aus: flach((rueck ? letzte.ein : erste.aus)!) });
    ziele.push({ loop: M.id, i: nr(bis), ein: flach((rueck ? erste.aus : letzte.ein)!) });
    // die Querlinie: ihr Punkt vorn kommt zwischen die Mundwinkel, das Stück bis zum Mundwinkel wird gerade
    const Q = finde(querId);
    const qT = Q.punkte.findIndex((q) => q.kreuzung === kVorn);
    const qW = winkelP ? Q.punkte.indexOf(winkelP) : -1;
    const d3 = G.z / 3;
    const zurSeite = { x: 0, y: 0, z: d3 };
    const zurMitte = { x: 0, y: 0, z: -d3 };
    ziele.push({ loop: Q.id, i: qT, ort: flach(G), ...(qT === 0 ? { aus: zurSeite, ein: zurMitte } : { ein: zurSeite, aus: zurMitte }) });
    if (qW >= 0) ziele.push({ loop: Q.id, i: qW, ...(qW > qT ? { ein: zurMitte } : { aus: zurMitte }) });
    for (const x of loops) for (const q of x.punkte) q.cur = { ...q.ref };
  }
  const start = ziele.map((zl) => {
    const q = finde(zl.loop).punkte[zl.i]!;
    return { ort: { ...q.ref }, ein: { ...(q.ein ?? { x: 0, y: 0, z: 0 }) }, aus: { ...(q.aus ?? { x: 0, y: 0, z: 0 }) } };
  });
  for (let b = 1; b <= stufen; b++) {
    const f = b / stufen;
    ziele.forEach((zl, k) => {
      const q = finde(zl.loop).punkte[zl.i]!;
      if (zl.ort) q.cur = zwischen(start[k]!.ort, zl.ort, f);
      if (zl.ein) q.ein = zwischen(start[k]!.ein, zl.ein, f);
      if (zl.aus) q.aus = zwischen(start[k]!.aus, zl.aus, f);
    });
    rechnen(loops.map((l) => pfadLagen(l, l.punkte.map((q) => q.cur)) ?? Float64Array.from(l.ruhe)), schritte);
    // verfeinern wie das Fenster nach einem Zug
    const vd = opt.verdichten;
    for (let g = 0; vd && g < 8; g++) {
      const v = verdichten(haut, loops, vd.maxKante, vd.opt);
      if (!v) break;
      her = Int32Array.from(v.alt, (a) => (a >= 0 ? her[a]! : -1));
      haut = v.haut;
      loops = v.loops;
      for (const l of loops) for (const q of l.punkte) q.cur = { ...q.ref };
      if (v.gelegt === 0 && v.neu === 0) break;
    }
    opt.zwischen?.(`Stufe ${b}`, haut, loops, her);
  }
  const steht = rechnen();
  return { haut, loops, alt: her, naechsteId, naechsteKreuzung, mitte: mitteId, quer: querId, runden, steht };
}
