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
// Dritte Fassung (13.11., spät), nach seinem zweiten Modell `wesen/simple_mouth_more simple.eewesen` (nur noch die Maullinie mit
// ihrem Mundwinkel: „Es soll die Basis sein und funktioniert sogar ganz ohne Punkt. […] Bei der Maulkante ohne Punkte muss dann
// eingestellt sein, dass das Maul vom Lippenstart von der Seite mit je 90 bis 100 Grad eingeknickt ist, auch ohne Punkt, und beim
// Mundwinkel ca. 70 Grad nach innen abknicken“): Läuft keine Mittellinie durch beide Lippen, kommt auch keine dazu. Die Maullinie
// trägt ihren Knick selbst (`kantenWinkel.ts`): 95° an den Lippen, 70° am Mundwinkel, dazwischen gleitend; gedreht wird in Stufen
// vom Knick, den die Haut dort hat. Die Kugel bleibt dabei eine Kugel. Gibt es eine Mittellinie durch beide Lippen, gilt die
// zweite Fassung (ihr Griff nach innen knickt; an einer Kreuzung ist der Knick der kreuzenden Linie die Kante).

import type { HautGewichte, HautOptionen } from './ausKurven';
import { kantenTeilenMit, loopEinsetzen } from './einsetzen';
import { knickBruecken, knickQuer, knickReihe } from './kantenWinkel';
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
  /**
   * In so vielen Stufen dreht sich der Knick, je Stufe so viele Schritte zu zwei Runden. Standard: 12 Stufen zu 6 Schritten auf dem
   * Weg „Kante“, 8 zu 8 mit der Mittellinie.
   */
  stufen?: number;
  schritte?: number;
  /** die Rechnung der Grundform, wie das Fenster sie benutzt */
  gewichte?: HautGewichte;
  loeser?: HautOptionen;
  /** nach jeder Stufe verfeinern wie das Fenster nach einem Zug; ohne Angabe bleibt das Netz, wie es ist */
  verdichten?: { maxKante: number; opt: NonNullable<Parameters<typeof verdichten>[3]> };
  /** Knick an den Lippen, von der Seite gesehen, in Grad (Standard 95): der Mittellinie, oder (Weg `kante`) der Haut quer über die Maullinie */
  knick?: number;
  /** Tiefe der Tasche: Anteil des Wegs von der Mitte zwischen den Lippen zum Mundwinkel, von der Seite gesehen (Standard 0,55) */
  tiefe?: number;
  /**
   * Der Weg, wenn keine Mittellinie durch beide Lippen läuft: `kante` (Standard, dritte Fassung): Die Maullinie trägt ihren Knick
   * selbst (`kantenWinkel.ts`), es kommt keine Linie dazu. `mitte` (zweite Fassung, zum Vergleich): Die Mittellinie wird angelegt
   * und knickt an beiden Lippen ins Maul.
   */
  weg?: 'kante' | 'mitte';
  /** Knick der Haut quer über die Maullinie am Mundwinkel, in Grad (Standard 70; nur auf dem Weg `kante`) */
  knickWinkel?: number;
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
  /** Nummer der Mittellinie (−1: keine; die Maullinie trägt ihren Knick selbst), und ob sie neu angelegt wurde */
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
  let stufen = Math.max(1, opt.stufen ?? 8);
  let schritte = Math.max(1, opt.schritte ?? 8);
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
  // Weg „Kante“ (keine Mittellinie durch die Lippen, und keine soll dazu): Die Maullinie trägt ihren Knick gleich selbst. Erst die
  // harte Linie allein setzen zu lassen, verzöge die Form (ein einzelner Ring bestimmt sie nicht: an der Kugel um 9).
  const wegKante = mitteId === undefined && opt.weg !== 'mitte';
  if (wegKante) {
    // kleinere Stufen (gemessen an Florians Modell: 12 zu 6 formt ruhiger als 8 zu 8, nichts schlägt um)
    stufen = Math.max(1, opt.stufen ?? 12);
    schritte = Math.max(1, opt.schritte ?? 6);
  } else {
    yield* rechnen('Lippen hart');
    opt.zwischen?.('Lippen hart', haut, loops, her);
  }

  // Sicherung: Läuft die Rechnung davon, wächst das Netz beim Verfeinern über alle Maßen (gemessen: 433 000 Punkte, Minuten); dann
  // lieber abbrechen und sagen, dass es so nicht geht
  const grenze = 4 * haut.n + 4000;
  const endlich = (): boolean => {
    for (let k = 0; k < haut.pos.length; k++) if (!Number.isFinite(haut.pos[k]!)) return false;
    return true;
  };
  /** nach einer Stufe verfeinern wie das Fenster nach einem Zug; `fehler`, wenn das Netz davonläuft */
  const verfeinern = (): string | null => {
    const vd = opt.verdichten;
    for (let g = 0; vd && g < 8; g++) {
      const v = verdichten(haut, loops, vd.maxKante, vd.opt);
      if (!v) break;
      her = Int32Array.from(v.alt, (a) => (a >= 0 ? her[a]! : -1));
      haut = v.haut;
      loops = v.loops;
      netzNeu = true;
      for (const l of loops) for (const q of l.punkte) q.cur = { ...q.ref };
      if (haut.n > grenze) return 'die Haut trägt das Maul so nicht (das Netz wächst beim Formen über alle Maßen)';
      if (v.gelegt === 0 && v.neu === 0) break;
    }
    return endlich() ? null : 'die Haut kommt beim Formen nicht zur Ruhe';
  };

  /**
   * Brücken teilen (14.11.): Wo eine Kante der Haut innen beide Lippen direkt verbindet (am Mundwinkel einer spitzen Form, auf den
   * letzten Einheiten), liegt innen kein Punkt, der sich führen ließe; die Haut überspannte das Maul dort flach, und am Übergang zur
   * Tasche verhedderten sich die Dreiecke. Nach dem Teilen liegt innen an jedem Punkt der Linie ein Punkt der Haut.
   */
  const brueckenTeilen = (): void => {
    for (let g = 0; g < 4; g++) {
      const B = knickBruecken(haut, finde(maulId));
      if (B.length === 0) return;
      const r = kantenTeilenMit(haut, loops, B);
      if (!r) return;
      her = Int32Array.from({ length: r.haut.n }, (_, v) => (v < her.length ? her[v]! : -1));
      haut = r.haut;
      loops = r.loops;
      netzNeu = true;
    }
  };

  // ---------- Weg „Kante“ (dritte Fassung): Die Maullinie trägt ihren Knick selbst, es kommt keine Linie dazu ----------
  if (wegKante) {
    brueckenTeilen();
    // Angaben an den beiden Enden des Rings (die Lippen an der Mitte) und am Mundwinkel; dazwischen gleitet der Knick. Gedreht wird
    // vom Knick, den die Haut dort jetzt hat, in Stufen zum Soll: Die erste Reihe innen wird dabei in jeder Runde geführt (`LoopZug`).
    const wo = (L: Loop): LoopPunkt[] => [L.punkte[0]!, L.punkte.find((p) => p.mundwinkel)!, L.punkte[L.punkte.length - 1]!];
    const ziel = [opt.knick ?? 95, opt.knickWinkel ?? 70, opt.knick ?? 95];
    const von: number[] = [];
    {
      const L = finde(maulId);
      const R = knickReihe(haut, L);
      if (!R) return { fehler: 'innen an der Maullinie liegt kein Punkt der Haut (die Form ums Maul ist zu schmal für dieses Netz)' };
      const n = L.proben.length;
      const mk = mittlereKante(haut);
      for (const p of wo(L)) {
        // gemessen an den Stellen der Linie bis 2,5 Kanten um den Punkt (genau am Mundwinkel liegt innen kein Punkt der Haut)
        const w: number[] = [];
        for (let j = 0; j < n; j++) {
          if (Math.abs(L.s[j]! - p.s) > 2.5 * mk) continue;
          const x = knickQuer(haut, R, j);
          if (Number.isFinite(x)) w.push(x);
        }
        von.push(w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0);
      }
      wo(L).forEach((p, i) => {
        p.knick = von[i]!;
      });
    }
    netzNeu = true;
    for (let b = 1; b <= stufen; b++) {
      yield* rechnen(`Stufe ${b}`, schritte, (f) => {
        wo(finde(maulId)).forEach((p, i) => {
          p.knick = von[i]! + ((b - 1 + f) / stufen) * (ziel[i]! - von[i]!);
        });
      });
      const fehler = verfeinern();
      if (fehler) return { fehler };
      brueckenTeilen();
      opt.zwischen?.(`Stufe ${b}`, haut, loops, her);
    }
    const steht = yield* rechnen('setzen');
    if (!endlich()) return { fehler: 'die Haut kommt beim Formen nicht zur Ruhe' };
    return { haut, loops, alt: her, naechsteId, naechsteKreuzung, mitte: -1, mitteNeu: false, runden, steht };
  }

  // ---------- 2. die Mittellinie durch beide Lippen, wenn sie fehlt (Weg „Mittellinie“, zweite Fassung) ----------
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
    const fehler = verfeinern();
    if (fehler) return { fehler };
    opt.zwischen?.(`Stufe ${b}`, haut, loops, her);
  }
  const steht = yield* rechnen('setzen');
  if (!endlich()) return { fehler: 'die Haut kommt beim Formen nicht zur Ruhe' };
  return { haut, loops, alt: her, naechsteId, naechsteKreuzung, mitte: mitteId, mitteNeu, runden, steht };
}
