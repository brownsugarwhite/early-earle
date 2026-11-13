// Plan vom 12.11.2026, Schritt 6 (13.11.): das Maul als echte Form, automatisch geformt wie von Hand.
//
// Florian: „Das Maul soll aber an einem gewählten Edgeloop immer noch automatisch entstehen. […] Im Grunde machst du ja nur die
// Kante hart und verbindest von der Seite die gegenüberliegenden Seiten. […] Das Maul ist dann einfach eine Form wie von Hand
// gemacht, nur automatisiert.“
//
// Zweite Fassung (13.11. abends), nach seinem Blick ins Bau-Fenster und seinem Modell `wesen/simple_mouth.eewesen`: „Die Form im
// Maul ist etwas kompliziert und die zusätzlichen Punkte brauchen wir eigentlich nicht. […] An einer Kreuzung kann ein Punkt mit mehr
// als zwei Handles in eine Richtung knicken, aber in eine andere rund verlaufen. In meinem Modell […] habe ich keinerlei Extrapunkte
// im Innenbereich gesetzt. Nur die Handles zum Innenraum an den beiden Lippenkreuzungen zeigen von der Seite deutlich ins
// Maulinnere, ca. 90 bis 100 Grad von der Lippenkante von der Seite. Es bildet sich automatisch eine schöne abgerundete Maultasche.
// Das ist eine gute Basis. […] Die Lippenkante soll standardmäßig hart sein.“ Gemessen an seinem Modell: Die Mittellinie knickt an
// den Lippen um 95,2° und 93,8°, die Lippenlinie läuft dort rund durch; die Tasche reicht von der Seite 0,54 des Wegs von der Mitte
// zwischen den Lippen zum Mundwinkel.
//
// Es wird nichts geschnitten, nichts eingesetzt, und im Maul kommt kein Punkt dazu:
//   1  Die Maullinie (ein Ring: von der Mitte der einen Lippe über den Mundwinkel zur Mitte der anderen) wird eine Kante, wie mit K.
//   2  Die Mittellinie läuft durch beide Lippen. Fehlt sie, wird sie angelegt, nur mit den zwei Punkten an den Lippen (eine Kugel
//      ohne weitere Linien wird dabei zur Zitrone: Das ist die Form dieser Linie, kein Fehler; Florian, 13.11.).
//   3  An beiden Lippen knickt die Mittellinie ins Maul: Ihr Griff nach innen dreht sich in Stufen dorthin, die Haut folgt der
//      Rechnung der Grundform wie bei einem Zug von Hand; dazwischen wird verfeinert wie nach jedem Zug. Die Lippenlinie läuft an
//      diesen Punkten weiter rund durch.
// Gerechnet wird in Schritten, die das Fenster einzeln zeigt (`maulFormenSchritte`; Florian: „schön organisch animiert […] nicht
// […] einfach in die neue Form springen“).
//
// Sein zweites Modell `wesen/simple_mouth_more simple.eewesen` hat nur noch die Maullinie mit ihrem Mundwinkel („Es soll die Basis
// sein und funktioniert sogar ganz ohne Punkt. […] Bei der Maulkante ohne Punkte muss dann eingestellt sein, dass das Maul vom
// Lippenstart von der Seite mit je 90 bis 100 Grad eingeknickt ist, auch ohne Punkt, und beim Mundwinkel ca. 70 Grad nach innen
// abknicken“). Das kann die heutige Rechnung noch nicht einstellen: An einer Kante ergibt sich der Winkel aus der Form; einstellen
// lässt er sich nur über die Griffe einer kreuzenden Linie. Deshalb bleibt die Mittellinie hier stehen (`ohneMitte` zeigt, was ohne
// sie geschieht). Offen: die Kante, die ihren Winkel selbst trägt (Plan, Schritt 6).
// Die erste Fassung vom selben Tag (Querlinie durch die Mundwinkel, die Mittellinie im Maul mit den Punkten der Maullinie „von der
// Seite durchgestanzt“) steht im Verlauf des Zweigs (`90b98322`) und als Beweis in `apps/editor/scripts/pruefen/form-maul-automatisch.ts`.
// Dieselbe Form auf einmal hineingebaut (`form-maul-haut.ts`) kommt nicht zur Ruhe: Der Unterschied ist das Formen in Schritten.

import type { HautGewichte, HautOptionen } from './ausKurven';
import { loopEinsetzen } from './einsetzen';
import type { Haut, V3 } from './kurven';
import {
  type Loop,
  type LoopPunkt,
  LoopZug,
  eckenAuto,
  griffeAnlegen,
  hatPfad,
  hautLagen,
  istEckeVonSelbst,
  kantenKnicken,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  pfadLagen,
  punktEinfuegen,
} from './loops';
import { mundwinkelProbe } from './maulLoop';
import { verdichten } from './verdichten';

export type MaulFormenOptionen = {
  /** die nächste freie Nummer für einen Loop und für eine Kreuzung (wie im Fenster) */
  naechsteId: number;
  naechsteKreuzung: number;
  /** in so vielen Stufen drehen sich die Griffe (Standard 8), je Stufe so viele Schritte zu zwei Runden (Standard 8) */
  stufen?: number;
  schritte?: number;
  /** die Rechnung der Grundform, wie das Fenster sie benutzt */
  gewichte?: HautGewichte;
  loeser?: HautOptionen;
  /** nach jeder Stufe verfeinern wie das Fenster nach einem Zug; ohne Angabe bleibt das Netz, wie es ist */
  verdichten?: { maxKante: number; opt: NonNullable<Parameters<typeof verdichten>[3]> };
  /** Knick der Mittellinie an den Lippen, von der Seite gesehen, in Grad (Standard 95) */
  knick?: number;
  /** Tiefe der Tasche: Anteil des Wegs von der Mitte zwischen den Lippen zum Mundwinkel, von der Seite gesehen (Standard 0,55) */
  tiefe?: number;
  /**
   * Eine Mittellinie, die nur zum Formen angelegt wurde, am Ende wieder entfernen: Es bleibt die Maullinie mit ihrem Mundwinkel, wie
   * in Florians Modell „simple_mouth_more simple“. Zum Ansehen, nicht der Standard: Ohne die Mittellinie ist der Knick an den Lippen
   * nicht mehr eingestellt, er ergibt sich. Gemessen an der Kugel (`form-maul-einfach.ts`): mit der Mittellinie 98° an beiden
   * Lippen und die Tasche 0,45 tief, auf zwei Netzen gleich; ohne sie auf dem Netz des Fensters 93° und 100° mit einer Tasche
   * von 0,82, auf einem feineren 39° und 68° mit 0,23 (ein einzelner Ring bestimmt die Form in der heutigen Rechnung nicht).
   */
  ohneMitte?: boolean;
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
  /** Nummer der Mittellinie (−1: mit `ohneMitte` war sie nur das Gerüst zum Formen und ist wieder weg), und ob sie neu angelegt wurde */
  mitte: number;
  mitteNeu: boolean;
  /** Runden insgesamt, und ob die Haut am Ende steht */
  runden: number;
  steht: boolean;
};

/** ein Zwischenstand beim Formen (zum Zeigen): Haut und Loops von jetzt; `netzNeu`: Netz oder Linien haben sich seit dem letzten geändert */
export type MaulStand = { haut: Haut; loops: Loop[]; netzNeu: boolean; was: string };

const RUHE = 0.02;
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });
const zwischen = (a: V3, b: V3, f: number): V3 => ({ x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y), z: a.z + f * (b.z - a.z) });
const kopieLoops = (L: readonly Loop[]): Loop[] =>
  L.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.ref }, ...(p.ein ? { ein: { ...p.ein } } : {}), ...(p.aus ? { aus: { ...p.aus } } : {}) })) }));

/**
 * Das Maul am Ring `maulId` formen (siehe Kopf der Datei). Haut und Loops bleiben unberührt; zurück kommen die neue Haut und die
 * neuen Loops, oder `fehler` mit dem Grund, warum es so nicht geht.
 */
export function maulFormen(h0: Haut, loops0: readonly Loop[], maulId: number, opt: MaulFormenOptionen): MaulGeformt | { fehler: string } {
  const lauf = maulFormenSchritte(h0, loops0, maulId, opt);
  for (;;) {
    const r = lauf.next();
    if (r.done) return r.value;
  }
}

/**
 * Dasselbe in Schritten, zum Zeigen (Florian, 13.11.: „Es sollte nur schön organisch animiert sein und nicht nach ‚Maul formen‘
 * einfach in die neue Form springen“): Nach jeder Runde der Rechnung kommt ein Zwischenstand (dieselbe Haut, dieselben Loops, die
 * weitergerechnet werden: nur lesen), am Ende das Ergebnis.
 */
export function* maulFormenSchritte(h0: Haut, loops0: readonly Loop[], maulId: number, opt: MaulFormenOptionen): Generator<MaulStand, MaulGeformt | { fehler: string }, void> {
  const stufen = Math.max(1, opt.stufen ?? 8);
  const schritte = Math.max(1, opt.schritte ?? 8);
  const knick = ((opt.knick ?? 95) * Math.PI) / 180;
  const tiefe = opt.tiefe ?? 0.55;
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

  let netzNeu = true;
  const stand = (was: string): MaulStand => {
    const st = { haut, loops, netzNeu, was };
    netzNeu = false;
    return st;
  };
  /**
   * Runden, bis jede Linie auf ihrem Pfad liegt und die Haut steht. `n`: vorher so viele Schritte zu zwei Runden; vor jedem ruft
   * `vorSchritt` mit dem Anteil des Wegs (dort ändern sich die Griffe, der Pfad wandert, die Haut folgt). Ergebnis: Die Haut steht.
   */
  function* rechnen(was: string, n = 0, vorSchritt?: (f: number) => void): Generator<MaulStand, boolean, void> {
    const z = new LoopZug(haut, loops, null, true, 'kurven', opt.gewichte ?? 'geometrie', opt.loeser ?? { halb: true });
    const start = loops.map((l) => Float64Array.from(l.ruhe));
    const versch = (): Float64Array[] => loops.map((l, i) => Float64Array.from(pfadLagen(l) ?? start[i]!, (x, k) => x - start[i]![k]!));
    const zeigen = (): MaulStand => {
      for (const l of loops) l.ruhe = hautLagen(haut, l);
      return stand(was);
    };
    for (let k = 1; k <= n; k++) {
      vorSchritt?.(k / n);
      z.schritt(versch(), 2);
      runden += 2;
      yield zeigen();
    }
    const d = versch();
    let letzte = Infinity;
    const vor = new Float64Array(haut.pos.length);
    for (let r = 0; r < 400 && letzte > RUHE; r++) {
      vor.set(haut.pos);
      z.schritt(d, 1);
      runden++;
      letzte = 0;
      for (let k = 0; k < vor.length; k += 3) letzte = Math.max(letzte, Math.hypot(haut.pos[k]! - vor[k]!, haut.pos[k + 1]! - vor[k + 1]!, haut.pos[k + 2]! - vor[k + 2]!));
      if (!Number.isFinite(letzte)) return false;
      yield zeigen();
    }
    for (const l of loops) {
      l.ruhe = hautLagen(haut, l);
      for (const p of l.punkte) p.ref = { ...p.cur };
    }
    return letzte <= RUHE;
  }

  // ---------- Mundwinkel ----------
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
  const weite = Math.hypot(vorn.x - G.x, vorn.y - G.y);
  if (weite < 1e-6 || Math.abs(G.z) < 1e-6) return { fehler: 'der Mundwinkel liegt auf der Mitte (die Maullinie muss von der Mitte über die Seite laufen)' };

  // ---------- 1. die Lippen hart (wie mit K) ----------
  const endenK = (): (number | undefined)[] => {
    const L = finde(maulId);
    return [L.punkte[0]?.kreuzung, L.punkte[L.punkte.length - 1]?.kreuzung];
  };
  const durchBeideEnden = (l: Loop): boolean => l.art === 'mitte' && endenK().every((k) => k !== undefined && l.punkte.some((p) => p.kreuzung === k));
  /** die zwei Punkte der Mittellinie an den Lippen: Sie knicken von Hand (ihre Griffe setzt diese Funktion, nicht der Editor) */
  const lippenPunkte = (M: Loop): [LoopPunkt, LoopPunkt] | null => {
    const [k0, k1] = endenK();
    const p0 = M.punkte.find((q) => q.kreuzung === k0);
    const p1 = M.punkte.find((q) => q.kreuzung === k1);
    return p0 && p1 && p0 !== p1 ? [p0, p1] : null;
  };
  let mitteId = loops.find(durchBeideEnden)?.id;
  if (mitteId === undefined) {
    // eine Mittellinie, die durch beide Enden läuft, deren Kreuzungen aber noch keine Punkte sind
    const L = finde(maulId);
    const enden = [L.proben[0]!.ecken[0], L.proben[L.proben.length - 1]!.ecken[0]];
    const da = loops.find((l) => l.art === 'mitte' && hatPfad(l) && enden.every((v) => l.proben.some((p) => p.ecken[0] === v)));
    if (da) {
      enden.forEach((v, j) => {
        const k = naechsteKreuzung++;
        punktEinfuegen(da, da.s[da.proben.findIndex((p) => p.ecken[0] === v)]!, k, true);
        punktEinfuegen(L, j === 0 ? 0 : L.laenge, k, true);
      });
      mitteId = da.id;
    }
  }
  {
    // Eine Mittellinie, die es schon gibt, behält an den Lippen ihren Griff nach außen (die Form außen bleibt): Ihre Punkte dort
    // sind Ecken von Hand, bevor die Lippen hart werden. Eine Ecke von selbst bekäme „jede Seite so rund wie möglich“.
    const da = mitteId === undefined ? null : lippenPunkte(finde(mitteId));
    for (const p of da ?? []) p.ecke = true;
    const L = finde(maulId);
    const vorher = new Set(loops.flatMap((l) => l.punkte.filter(istEckeVonSelbst)));
    L.kante = true;
    for (const p of L.punkte) p.kante = true;
    L.maulGeformt = true;
    eckenAuto(loops);
    kantenKnicken(loops, vorher);
    for (const x of loops) for (const p of x.punkte) p.cur = { ...p.ref };
  }
  netzNeu = true;
  yield* rechnen('Lippen hart');
  opt.zwischen?.('Lippen hart', haut, loops, her);

  // ---------- 2. die Mittellinie durch beide Lippen, wenn sie fehlt ----------
  let mitteNeu = false;
  if (mitteId === undefined) {
    // Angelegt wie mit dem Werkzeug L: geschnitten in der Mittelebene, eingesetzt, Punkte nur an den Kreuzungen. Weil die Lippen
    // schon hart sind, ist sie dort eine Ecke: Jede Seite bekommt ihre Griffe für sich. (Glatt angelegt, mit einem Griffpaar auf
    // einer Geraden für das kurze Stück zwischen den Lippen und das lange um den Körper, lag ihr Pfad bis 190 neben der Kugel.)
    let weit = 0;
    for (let i = 0; i < haut.pos.length; i++) weit = Math.max(weit, Math.abs(haut.pos[i]!));
    const l = loopAusSchnitt(haut, 'top', [-4 * weit, 0], [4 * weit, 0], naechsteId, 8);
    const liste = l ? [...loops, l] : null;
    const r = liste ? loopEinsetzen(haut, liste, liste.length - 1) : null;
    if (!r) return { fehler: 'die Mittellinie fehlt und lässt sich hier nicht anlegen' };
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
        // liegt dort schon ein Punkt ohne Kreuzung, wird er es selbst: sonst läge dicht daneben ein zweiter
        const dort = x.punkte.find((p) => p.kreuzung === undefined && Math.abs(p.s - f.sa) < 0.5 * tol);
        if (dort) dort.kreuzung = k;
        else punktEinfuegen(x, f.sa, k, hatPfad(x));
        punktEinfuegen(neu, f.sb, k);
      }
    }
    eckenAuto(loops);
    griffeAnlegen(neu, neu.ruhe, true);
    for (const x of loops) for (const p of x.punkte) p.cur = { ...p.ref };
    if (!durchBeideEnden(neu)) return { fehler: 'die Mittellinie fehlt und lässt sich hier nicht anlegen (die Maullinie muss auf ihr beginnen und enden)' };
    mitteId = neu.id;
    mitteNeu = true;
    netzNeu = true;
    yield* rechnen('Mittellinie');
    opt.zwischen?.('Mittellinie', haut, loops, her);
  }
  {
    const pp = lippenPunkte(finde(mitteId));
    if (!pp) return { fehler: 'die Mittellinie kreuzt die Maullinie nicht an beiden Lippen' };
    if (pp.some((p) => !p.ein || !p.aus)) return { fehler: 'die Mittellinie hat noch keine Griffe' };
    for (const p of pp) p.ecke = true;
  }

  // ---------- 3. die Griffe der Mittellinie an den Lippen ins Maul ----------
  // Sicherung: Läuft die Rechnung davon, wächst das Netz beim Verfeinern über alle Maßen (gemessen: 433 000 Punkte, Minuten); dann
  // lieber abbrechen und sagen, dass es so nicht geht
  const grenze = 4 * haut.n + 4000;
  const endlich = (): boolean => {
    for (let k = 0; k < haut.pos.length; k++) if (!Number.isFinite(haut.pos[k]!)) return false;
    return true;
  };
  type Ziel = { i: number; seite: 'ein' | 'aus'; von: V3; nach: V3 };
  const ziele: Ziel[] = [];
  {
    const M = finde(mitteId);
    const [p0, p1] = lippenPunkte(M)!;
    // der kürzere Weg zwischen den beiden Punkten führt durchs Maul
    const vorwaerts = (p1.s - p0.s + M.laenge) % M.laenge <= M.laenge / 2;
    // Länge: Zwei gleich lange Griffe in dieselbe Richtung tragen die Mitte ihres Stücks um ¾ ihrer Länge hinein
    const lang = (tiefe / 0.75) * weite;
    const n = M.punkte.length;
    for (const [p, innen] of [
      [p0, vorwaerts ? 'aus' : 'ein'],
      [p1, vorwaerts ? 'ein' : 'aus'],
    ] as const) {
      const i = M.punkte.indexOf(p);
      const aussen = innen === 'aus' ? p.ein! : p.aus!;
      const la = Math.hypot(aussen.x, aussen.y);
      if (!(la > 1e-9)) return { fehler: 'die Mittellinie hat an einer Lippe keinen Griff nach außen' };
      // geradeaus weiter (dem Griff nach außen gegenüber), um den Knick gedreht: zur Seite des Mundwinkels hin
      const g = { x: -aussen.x / la, y: -aussen.y / la };
      const zuW = { x: G.x - p.ref.x, y: G.y - p.ref.y };
      const dreh = (a: number): V3 => ({ x: g.x * Math.cos(a) - g.y * Math.sin(a), y: g.x * Math.sin(a) + g.y * Math.cos(a), z: 0 });
      const a = dreh(knick);
      const b = dreh(-knick);
      const r = a.x * zuW.x + a.y * zuW.y >= b.x * zuW.x + b.y * zuW.y ? a : b;
      // liegt im Maul schon ein Punkt der Mittellinie (von Hand gesetzt), reicht der Griff höchstens bis zu ihm
      const nb = M.punkte[(i + (innen === 'aus' ? 1 : n - 1)) % n]!;
      const bis = nb === p0 || nb === p1 ? lang : Math.min(lang, Math.hypot(nb.ref.x - p.ref.x, nb.ref.y - p.ref.y));
      ziele.push({ i, seite: innen, von: { ...p[innen]! }, nach: { x: r.x * bis, y: r.y * bis, z: 0 } });
    }
  }
  for (let b = 1; b <= stufen; b++) {
    const M = finde(mitteId);
    // die Griffe drehen sich Schritt für Schritt (der Pfad ist in jedem Schritt die Linie, die gezeigt wird)
    yield* rechnen(`Stufe ${b}`, schritte, (f) => {
      for (const zl of ziele) M.punkte[zl.i]![zl.seite] = zwischen(zl.von, zl.nach, (b - 1 + f) / stufen);
    });
    // verfeinern wie das Fenster nach einem Zug
    const vd = opt.verdichten;
    for (let g = 0; vd && g < 8; g++) {
      const v = verdichten(haut, loops, vd.maxKante, vd.opt);
      if (!v) break;
      her = Int32Array.from(v.alt, (a) => (a >= 0 ? her[a]! : -1));
      haut = v.haut;
      loops = v.loops;
      netzNeu = true;
      for (const l of loops) for (const q of l.punkte) q.cur = { ...q.ref };
      if (haut.n > grenze) return { fehler: 'die Haut trägt das Maul so nicht (das Netz wächst beim Formen über alle Maßen)' };
      if (v.gelegt === 0 && v.neu === 0) break;
    }
    if (!endlich()) return { fehler: 'die Haut kommt beim Formen nicht zur Ruhe' };
    opt.zwischen?.(`Stufe ${b}`, haut, loops, her);
  }
  let steht = yield* rechnen('setzen');
  if (!endlich()) return { fehler: 'die Haut kommt beim Formen nicht zur Ruhe' };
  if (mitteNeu && opt.ohneMitte) {
    // die Mittellinie war nur das Gerüst zum Formen: wieder weg (ihre Punkte im Netz bleiben gewöhnliche Punkte der Haut)
    const M = finde(mitteId);
    const weg = new Set(M.punkte.map((p) => p.kreuzung).filter((k) => k !== undefined));
    loops = loops.filter((l) => l !== M);
    for (const l of loops)
      for (const p of l.punkte) {
        if (p.kreuzung === undefined || !weg.has(p.kreuzung) || loops.some((x) => x !== l && x.punkte.some((q) => q.kreuzung === p.kreuzung))) continue;
        delete p.kreuzung;
        if (l.art === 'ring' && (p.s <= 1e-6 || p.s >= l.laenge - 1e-6)) p.vonSelbst = true;
      }
    eckenAuto(loops);
    netzNeu = true;
    opt.zwischen?.('mit Gerüst', haut, [...loops, M], her);
    steht = yield* rechnen('ohne Mittellinie');
    if (!endlich()) return { fehler: 'die Haut kommt beim Formen nicht zur Ruhe' };
    opt.zwischen?.('ohne Gerüst', haut, loops, her);
  }
  return { haut, loops, alt: her, naechsteId, naechsteKreuzung, mitte: mitteNeu && opt.ohneMitte ? -1 : mitteId, mitteNeu, runden, steht };
}
