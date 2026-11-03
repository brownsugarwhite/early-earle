// P2 „Stücknetz im Maulfeld“, Tag 1 (03.11.2026): Linien → Stücke. Das halbe Maulfeld (entlang des Schlitzes aufgeschnitten,
// Karte aus A4) wird von seinen Linien in Stücke zerlegt: Feldrand, Naht, Schlitz (beide Ufer), die Verlängerung des Schlitzes
// vom Mundwinkel c bis zum Feldrand (`schlitzVerlaengerung`), die Falten von A0 im Feld (`faltenGraph`) und Schnitte (unten).
// Die Stücke sind die Flächen dieses Liniengraphen (Dreiecke des Halbfelds, über Nicht-Linienkanten geflutet).
//
// Ecken der Stücke — ein Stück wird später mit einem Muster aus Vierecken gefüllt, seine Ecken sind die Ecken des Musters
// (Innenwinkel 90°, eine Fläche), seine Seiten gerade (180°, zwei Flächen):
//  · Zusammenstöße verschiedener Linien (Naht und Feldrand, Lippe und Naht, Falte und Lippe …) sind Ecken; nur der Übergang vom
//    Schlitzufer in seine Verlängerung ist keiner — dieselbe Linie, der Mundwinkel liegt mitten auf einer geraden Seite (360°
//    um c auf zwei Stücke mit je 180°, die Grundidee des Stücknetzes).
//  · Der Feldrand ist nicht gezeichnet, sondern eine Treppe auf dem Käfiggitter, und er ist je Stück eine gerade Seite: Was
//    außen an einem Randpunkt vorgegeben ist, legt das Innere fest — der Einsatz gibt jedem Randpunkt zwei Flächen, ein Punkt
//    mit einer Feldfläche (konvexe Gitterecke) wird so ein Fünferpol, einer mit drei Feldflächen (konkav) ein Dreierpol, wie das
//    Gitter außen es vorgibt (so auch der Kernring). Eine Gitterecke als Stückecke zu nehmen hieße, einen Punkt, an dem die
//    Grenze oft nur 10–45° dreht, als 90° zu füllen — gemessen (03.11.) brächte das zwei Pole weniger, aber gequetschte Zellen.
//  · Auf gezeichneten Linien (Lippe, Falten) misst die Drehung der Linie in der Tangentialebene der Haut (die Drehung im Raum
//    täuscht: eine in der Seite gerade Lippe läuft über die gerundete Schnauze), einmal je Linie, für beide Seiten gleich. Eine
//    Biegung ist ein Lauf gleichsinniger Drehung; dreht er insgesamt um mehr als ECKE_GRAD, ist sein stärkster Punkt für das
//    Stück auf der Innenseite eine Ecke, und das Stück auf der Außenseite (konkav, 270°, kein Muster füllt das) wird dort
//    geschnitten: der Arm nach der Biegung (in Linienrichtung; an der Lippe der zum Mundwinkel) läuft als Schnitt gerade
//    durch den Knick weiter (in der Richtung, die er nach der Biegung hat; Geodäte über die Dreiecke des Stücks bis zur
//    nächsten Linie), der Arm davor endet am Knick als T. So bleibt die Lippe vor einem J-Haken eine gerade Seite eines
//    Vierecks (ihre Reihen laufen regulär bis zum Schnitt), und Haken samt Verlängerung sind eine durchgehende Linie; die Pole,
//    die das Feld braucht, liegen dann im Stück hinter dem Haken statt am Mundwinkel (die andere Fortsetzung, der Arm davor,
//    gäbe dem vorderen Stück einen Dreierpol nahe der Lippe). Geht der Schnitt so nicht (kein Weg, zu kurz), läuft der Arm
//    davor durch. Biegungen dicht an einem Linienende, das eine Ecke ist (zwei Feldkanten), gehören zu dieser Ecke; Schnitte
//    kürzer als zwei Feldkanten (zu schmaler Streifen) entfallen samt der Ecke auf der Innenseite. Gemessen (03.11.): die
//    Wahl nach der Luft (kleinster Abstand zu den übrigen Linien) war ein Münzwurf (0,6–1,7 Feldkanten je Seite).
//  · Die Naht ist die Spiegellinie (Geodäte, keine Drehung in der Fläche), Verlängerung und Schnitte sind freie Linien: dort
//    keine Ecken aus der Drehung. Endet eine freie Linie auf einer anderen, sind beide flankierenden Stücke dort Ecken (T);
//    an Knoten gezeichneter Linien entscheidet die Drehung je Stück (eine Falte, die auf die Lippe trifft: die Lippe läuft
//    gerade durch, die Stücke an der Falte haben Ecken; ein Y mit 120° gibt drei Ecken = Dreierpol).
// Gemessen wird an der über `fenster` geglätteten Grenze (Mittel der Punkte im Umkreis, Richtung über ±fenster, fenster = zwei
// Feldkanten). Danach (Tag 2–4): Ganzzahlen je Seite, Muster je Stück, Tutte je Stück, Lippe, Haut lösen. Keine Regel hier
// nennt einen Körper oder eine Lage. DOM-frei.
import type { Kaefig } from '../../kaefig/halbkanten';
import type { FeldSpec } from './feld';
import type { Aufgeschnitten, FeinNetz } from './flaeche';
import type { Karte } from './karte';
import { faltenGraph } from './leiter';
import { schlitzVerlaengerung } from './rechteck';

type V3 = [number, number, number];
type V2 = [number, number];

/** Gesamtdrehung einer Biegung in der Tangentialebene (Grad), ab der sie eine Ecke (90° im Muster) ist: die Hälfte von 90° */
export const ECKE_GRAD = 45;

export type LinienArt = 'lippe' | 'verlaengerung' | 'naht' | 'feldrand' | 'falte' | 'schnitt';
/** freie Linien: nicht gezeichnet, ihre Kantenzahl legt der Ganzzahlenschritt fest */
export const FREIE_LINIEN: ReadonlySet<LinienArt> = new Set<LinienArt>(['verlaengerung', 'schnitt']);

export type Seite = {
  /** Punkte der Seite (Nummern des aufgeschnittenen Netzes, Schnittpunkte ab `nBasis`), von Ecke zu Ecke */
  punkte: number[];
  /** Linienart je Kante */
  arten: LinienArt[];
  /** Länge auf der Haut (Welt) */
  laenge: number;
  /** Kanten des Feldkäfigs auf dieser Seite (Feldrandkanten, die an einem Käfigpunkt enden; dort liegt die Kantenzahl fest), −1 ohne Feldrand */
  feldKanten: number;
  /** Pole, die das Gitter außen auf dieser Seite vorgibt: Fünfer (konvexe Treppenstufe), Dreier (konkave) */
  pole: { fuenf: number; drei: number };
  /** liegt ganz auf einem Schlitzufer: 0 = Ufer A (Ursprünge, oben), 1 = Ufer B (Doppel, unten), −1 sonst */
  lippe: -1 | 0 | 1;
  /** nur freie Linien (Verlängerung, Schnitt): Kantenzahl frei */
  frei: boolean;
};

export type Stueck = {
  /** Umlauf (Nummern des aufgeschnittenen Netzes, Schnittpunkte ab `nBasis`), Ecken als Indizes in `punkte` */
  punkte: number[];
  ecken: number[];
  /** Drehung je Ecke (Grad, geglättete Grenze in der Tangentialebene; positiv = nach innen) */
  winkel: number[];
  /** Drehung am Mundwinkel (Grad), wenn er auf dem Umlauf liegt, sonst NaN */
  mundwinkel: number;
  seiten: Seite[];
  /** Fläche in der Karte und die feinen Dreiecke des Stücks (Indizes in `dreiecke` des Funds / 3) */
  flaeche: number;
  dreiecke: number[];
  /** Punkte mit konkaver Drehung, die kein Schnitt gelöst hat (Indizes in `punkte`; sollte leer sein) */
  konkav: number[];
};

/** Punkt eines Schnitts: auf der Kante (a, b) des Netzes bei t, mit Lage auf der Haut und in der Karte */
export type Zusatz = { xyz: V3; uv: V2; kante: [number, number]; t: number };

export type StueckeFund = {
  stuecke: Stueck[];
  /** Verlängerung des Schlitzes c → Feldrand (Nummern des feinen Netzes) */
  verlaengerung: number[];
  /** Faltenzüge, die Stückgrenzen sind, und offene Faltenstummel (im Feld endend, keine Grenze) */
  falten: number[][];
  offen: number[][];
  /** Schnitte (vom Knick bis zur nächsten Linie; Nummern, Schnittpunkte ab `nBasis`) */
  schnitte: number[][];
  /** Schnittpunkte (Nummer = nBasis + Index) und die Dreiecke nach dem Schneiden (3 Nummern je Dreieck) */
  zusatz: Zusatz[];
  nBasis: number;
  dreiecke: Int32Array;
  /** Knoten und Kanten des Liniengraphen; Dreiecke ohne Stück (sollte 0 sein) */
  knoten: number;
  kanten: number;
  ohneStueck: number;
  /** Stücke mit mehr als einer Randschleife (Loch im Stück; sollte 0 sein) */
  loecher: number;
  /** konkave Punkte, die kein Schnitt gelöst hat */
  konkav: number;
  /** Biegungen der gezeichneten Linien (Punkt, Gesamtdrehung in Linienrichtung, links positiv); `grund`, wenn verworfen */
  biegungen: { punkt: number; gesamt: number; grund?: string }[];
  /** Schnitte, die nicht gelegt werden konnten (Grund), und je gelegtem Schnitt die Wahl der Fortsetzung (Luft, Länge) */
  verworfen: string[];
  schnittWahl: string[];
  ms: number;
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());
const schl = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const einheit = (a: V3): V3 => {
  const l = norm(a);
  return l > 1e-300 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
};
const mix = (a: V3, b: V3, t: number): V3 => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];

/** Schnitt des Strahls p + s·d mit der Strecke q → r in der Ebene mit Normale n: s und u (Strecke bei q + u·(r − q)), oder null */
function strahlStrecke(p: V3, d: V3, q: V3, r: V3, n: V3): { s: number; u: number } | null {
  const e = sub(r, q);
  const w = sub(q, p);
  const nenner = dot(cross(d, e), n);
  if (Math.abs(nenner) < 1e-18) return null;
  const s = dot(cross(w, e), n) / nenner;
  const u = dot(cross(w, d), n) / nenner;
  return { s, u };
}

/**
 * Stücke des halben Maulfelds. `h` ist die mittlere Kante des Feldkäfigs (Fenster der Eckenmessung), `linie` die gezeichnete
 * Maullinie auf der Haut (geordnete Proben; die Schlitzpunkte selbst springen längs der Linie vor und zurück, weil jeder
 * Pfadpunkt nur auf den nächsten Linienpunkt rückt). Konkave Knicke werden geschnitten (höchstens acht Schnitte), bis kein
 * Stück mehr eine konkave Ecke hat.
 */
export function stueckeFinden(k: Kaefig, feld: FeldSpec, netz: FeinNetz, pfad: readonly number[], schnitt: Aufgeschnitten, karte: Karte, h: number, linie?: readonly V3[]): StueckeFund {
  const t0 = jetzt();
  const T: number[] = Array.from(schnitt.dreiecke);
  let nBasis = 0;
  for (const p of T) if (p + 1 > nBasis) nBasis = p + 1;
  const zusatz: Zusatz[] = [];
  const orig = (i: number) => schnitt.doppel.get(i) ?? i;
  const P3 = (i: number): V3 => {
    if (i >= nBasis) return zusatz[i - nBasis]!.xyz;
    const o = orig(i);
    return [netz.punkte[3 * o]!, netz.punkte[3 * o + 1]!, netz.punkte[3 * o + 2]!];
  };
  const kIdx = new Map<number, number>();
  karte.punkte.forEach((g, i) => kIdx.set(g, i));
  const uv = (i: number): V2 => {
    if (i >= nBasis) return zusatz[i - nBasis]!.uv;
    const l = kIdx.get(i);
    if (l === undefined) throw new Error(`Stücke: Punkt ${i} nicht in der Karte`);
    return [karte.u[l]!, karte.v[l]!];
  };
  const dist3 = (a: number, b: number) => norm(sub(P3(a), P3(b)));
  // ---- Linien ----
  const G = (l: number) => karte.punkte[l]!;
  const schlitz = karte.rand.schlitz.map(G);
  const mitteUnten = karte.rand.mitteUnten.map(G);
  const aussen = karte.rand.aussen.map(G);
  const mitteOben = karte.rand.mitteOben.map(G);
  const iW = (schlitz.length - 1) / 2;
  const c = schlitz[iW]!;
  const kanten = new Map<string, LinienArt>();
  const nb = new Map<number, Set<number>>();
  const verbinde = (a: number, b: number, art: LinienArt) => {
    if (a === b) return;
    kanten.set(schl(a, b), art);
    (nb.get(a) ?? nb.set(a, new Set()).get(a)!).add(b);
    (nb.get(b) ?? nb.set(b, new Set()).get(b)!).add(a);
  };
  const trenne = (a: number, b: number) => {
    kanten.delete(schl(a, b));
    nb.get(a)?.delete(b);
    nb.get(b)?.delete(a);
  };
  const zug = (punkte: readonly number[], art: LinienArt) => {
    for (let i = 0; i + 1 < punkte.length; i++) verbinde(punkte[i]!, punkte[i + 1]!, art);
  };
  zug(schlitz, 'lippe');
  zug(mitteUnten, 'naht');
  zug(aussen, 'feldrand');
  zug(mitteOben, 'naht');
  const { verlaengerung } = schlitzVerlaengerung(netz, schnitt, pfad, new Set(feld.rand));
  zug(verlaengerung, 'verlaengerung');
  const aufLinie = new Set<number>(nb.keys());
  // Falten von A0 (Ursprungsnummern) auf die Kanten des aufgeschnittenen Netzes übertragen: so landet jede Falte am Schlitz auf
  // dem richtigen Ufer
  const fg = faltenGraph(k, feld, netz);
  const faltKante = new Set<string>();
  for (const [a, set] of fg.nb) for (const b of set) faltKante.add(schl(a, b));
  const faltNb = new Map<number, Set<number>>();
  for (let t = 0; t < T.length; t += 3)
    for (let q = 0; q < 3; q++) {
      const a = T[t + q]!;
      const b = T[t + ((q + 1) % 3)]!;
      if (!faltKante.has(schl(orig(a), orig(b))) || kanten.has(schl(a, b))) continue;
      (faltNb.get(a) ?? faltNb.set(a, new Set()).get(a)!).add(b);
      (faltNb.get(b) ?? faltNb.set(b, new Set()).get(b)!).add(a);
    }
  // Faltenzüge: zwischen Knoten (auf einer Linie, Grad ≠ 2); Züge mit einem freien Ende (Grad 1, nicht auf einer Linie) sind
  // Stummel und keine Grenze; Zusammenhangskomponenten ohne Linienberührung ebenso
  const falten: number[][] = [];
  const offen: number[][] = [];
  const istKnoten = (p: number) => aufLinie.has(p) || (faltNb.get(p)?.size ?? 0) !== 2;
  const gesehen = new Set<string>();
  const komponente = new Map<number, number>();
  let nKomp = 0;
  for (const start of faltNb.keys()) {
    if (komponente.has(start)) continue;
    const stapel = [start];
    komponente.set(start, nKomp);
    let beruehrt = false;
    const mitglieder: number[] = [];
    while (stapel.length) {
      const a = stapel.pop()!;
      mitglieder.push(a);
      if (aufLinie.has(a)) beruehrt = true;
      for (const b of faltNb.get(a) ?? []) if (!komponente.has(b)) {
        komponente.set(b, nKomp);
        stapel.push(b);
      }
    }
    nKomp++;
    for (const p of mitglieder) {
      if (!istKnoten(p)) continue;
      for (const q of faltNb.get(p) ?? []) {
        if (gesehen.has(schl(p, q))) continue;
        const weg = [p, q];
        gesehen.add(schl(p, q));
        let vor = p;
        let cur = q;
        for (let n = 0; n < 1e5 && !istKnoten(cur); n++) {
          const weiter = [...(faltNb.get(cur) ?? [])].find((x) => x !== vor)!;
          gesehen.add(schl(cur, weiter));
          weg.push(weiter);
          vor = cur;
          cur = weiter;
        }
        const ende = weg[weg.length - 1]!;
        const frei = (x: number) => !aufLinie.has(x) && (faltNb.get(x)?.size ?? 0) === 1;
        if (!beruehrt || frei(p) || frei(ende)) offen.push(weg);
        else falten.push(weg);
      }
    }
  }
  for (const w of falten) zug(w, 'falte');
  // ---- Feldrand: Gitterecken aus dem Käfig (Feldflächen je Randpunkt, Nachbarn auf der Randschleife) ----
  const inM = new Uint8Array(k.nF);
  for (const x of feld.feld) inM[x] = 1;
  const fFeld = (v: number) => {
    let s = 0;
    for (let i = k.vFStart[v]!; i < k.vFStart[v + 1]!; i++) if (inM[k.vFlaechen[i]!]) s++;
    return s;
  };
  const randNachbar = new Map<number, [number, number]>();
  const R = feld.rand;
  for (let i = 0; i < R.length; i++) randNachbar.set(R[i]!, [R[(i - 1 + R.length) % R.length]!, R[(i + 1) % R.length]!]);
  type FeldKlasse = 'fuenf' | 'drei' | 'glatt';
  const feldKlasse = (p: number): FeldKlasse => {
    const v = orig(p);
    if (p >= nBasis || v >= k.n || !randNachbar.has(v)) return 'glatt';
    const f = fFeld(v);
    return f === 3 ? 'drei' : f === 1 ? 'fuenf' : 'glatt';
  };
  const feldRand = new Set(feld.rand);
  // Schnitte: Startpunkt → Nachbar auf dem Arm, der gerade durchläuft (das Paar Arm/Schnitt ist dort keine Ecke)
  const durch = new Map<number, number>();
  const schnitte: number[][] = [];
  const artVon = (a: number, b: number): LinienArt => kanten.get(schl(a, b)) ?? 'falte';

  // ---- ein Durchgang: Flächen des Liniengraphen (Dreiecke fluten), Umläufe, Ecken, Seiten; dazu konkave Knicke ----
  // ---- Biegungen je gezeichneter Linie (Lippe = Ufer A, Falten): Lage, Gesamtdrehung (links positiv, in Linienrichtung), Armrichtungen ----
  const feldNormale = new Map<number, V3>();
  for (let tI = 0; tI < T.length / 3; tI++) {
    const e0 = T[3 * tI]!;
    const e1 = T[3 * tI + 1]!;
    const e2 = T[3 * tI + 2]!;
    const nT3 = cross(sub(P3(e1), P3(e0)), sub(P3(e2), P3(e0)));
    for (const e of [e0, e1, e2]) {
      const m = feldNormale.get(e) ?? [0, 0, 0];
      feldNormale.set(e, [m[0] + nT3[0], m[1] + nT3[1], m[2] + nT3[2]]);
    }
  }
  const normaleAn = (p: number, eigene?: Map<number, V3>): V3 => einheit(eigene?.get(p) ?? feldNormale.get(p) ?? feldNormale.get(orig(p)) ?? [0, 0, 0]);
  const winkelIn = (p: number, a: V3, b: V3, eigene?: Map<number, V3>): number => {
    const nrm = normaleAn(p, eigene);
    const ta = sub(a, [nrm[0] * dot(a, nrm), nrm[1] * dot(a, nrm), nrm[2] * dot(a, nrm)]);
    const tb = sub(b, [nrm[0] * dot(b, nrm), nrm[1] * dot(b, nrm), nrm[2] * dot(b, nrm)]);
    if (!(norm(ta) > 1e-15 && norm(tb) > 1e-15)) return 0;
    return (Math.atan2(dot(cross(ta, tb), nrm), dot(ta, tb)) * 180) / Math.PI;
  };
  /** Vektor aus der Tangentialebene von q in die von p drehen (kleinste Drehung der Normalen, Rodrigues) */
  const transport = (v: V3, q: number, p: number): V3 => {
    const a = normaleAn(q);
    const b = normaleAn(p);
    const achse = cross(a, b);
    const s = norm(achse);
    const cth = Math.max(-1, Math.min(1, dot(a, b)));
    if (s < 1e-12) return v;
    const ax = einheit(achse);
    const sth = s;
    const kv = cross(ax, v);
    const kkv = dot(ax, v);
    return [v[0] * cth + kv[0] * sth + ax[0] * kkv * (1 - cth), v[1] * cth + kv[1] * sth + ax[1] * kkv * (1 - cth), v[2] * cth + kv[2] * sth + ax[2] * kkv * (1 - cth)];
  };
  type Biegung = { punkt: number; gesamt: number; dVor: V3; dNach: V3; nachbarVor: number; nachbarNach: number; grund?: string };
  const biegungen: Biegung[] = [];
  /**
   * Biegungen einer Linie aus geordneten Proben Q (Lagen auf der Haut); `punktBei(i)` ist der Netzpunkt der Linie zur Probe i,
   * `nachbar(punkt, vorwaerts)` sein Nachbar auf der Linie. Die Enden der Linie, die Ecken sind, schlucken Biegungen im Abstand
   * von zwei Feldkanten.
   */
  const biegungenAuf = (Q: readonly V3[], punktBei: (i: number) => number, nachbar: (punkt: number, vorwaerts: boolean) => number, hartAnfang: boolean, hartEnde: boolean) => {
    const m = Q.length;
    if (m < 4) return;
    const s = [0];
    for (let i = 1; i < m; i++) s.push(s[i - 1]! + norm(sub(Q[i]!, Q[i - 1]!)));
    const laenge = s[m - 1]!;
    // nur das Abtastrauschen glätten — ein Haken, der sich innerhalb von zwei Feldkanten um 90° dreht, muss eine Ecke bleiben
    const fenster = Math.min(h / 2, laenge / 8);
    const glatt: V3[] = Q.map((_, i) => {
      const acc: V3 = [0, 0, 0];
      let zahl = 0;
      for (let j = 0; j < m; j++) {
        if (Math.abs(s[i]! - s[j]!) > fenster) continue;
        acc[0] += Q[j]![0];
        acc[1] += Q[j]![1];
        acc[2] += Q[j]![2];
        zahl++;
      }
      return [acc[0] / zahl, acc[1] / zahl, acc[2] / zahl];
    });
    // Richtung der Linie bei i (vorwärts zeigend): zum geglätteten Punkt im Abstand `fenster` längs der Linie, am Linienende zum
    // letzten erreichbaren Punkt; fällt der zusammen (geglättete Enden), die Richtung des letzten Stücks mit Länge
    const richtung = (i: number, vorwaerts: boolean): V3 => {
      let d = 0;
      let j = i;
      let p = glatt[i]!;
      for (;;) {
        const k2 = vorwaerts ? j + 1 : j - 1;
        if (k2 < 0 || k2 >= m) break;
        const q = glatt[k2]!;
        const l = norm(sub(q, p));
        if (d + l >= fenster) {
          const tt = l > 1e-15 ? (fenster - d) / l : 0;
          const r = mix(p, q, tt);
          return vorwaerts ? sub(r, glatt[i]!) : sub(glatt[i]!, r);
        }
        d += l;
        j = k2;
        p = q;
      }
      let v: V3 = vorwaerts ? sub(p, glatt[i]!) : sub(glatt[i]!, p);
      if (norm(v) < 1e-12) {
        for (let b = vorwaerts ? i - 1 : i + 1; b >= 0 && b < m; b += vorwaerts ? -1 : 1) {
          const w = vorwaerts ? sub(glatt[i]!, glatt[b]!) : sub(glatt[b]!, glatt[i]!);
          if (norm(w) > 1e-12) {
            v = w;
            break;
          }
        }
      }
      return v;
    };
    const drehung = Q.map((_, i) => (i === 0 || i === m - 1 ? 0 : winkelIn(punktBei(i), richtung(i, false), richtung(i, true))));
    const verbraucht = new Uint8Array(m);
    const kandidaten = Q.map((_, i) => i)
      .filter((i) => i > 0 && i < m - 1 && Math.abs(drehung[i]!) >= 10 && Math.abs(drehung[i]!) >= Math.abs(drehung[i - 1]!) && Math.abs(drehung[i]!) >= Math.abs(drehung[i + 1]!))
      .sort((a, b) => Math.abs(drehung[b]!) - Math.abs(drehung[a]!));
    for (const i of kandidaten) {
      if (verbraucht[i]) continue;
      const vz = Math.sign(drehung[i]!);
      let a = i;
      let b = i;
      while (a - 1 >= 1 && !verbraucht[a - 1] && (Math.abs(drehung[a - 1]!) < 2 || Math.sign(drehung[a - 1]!) === vz)) a--;
      while (b + 1 <= m - 2 && !verbraucht[b + 1] && (Math.abs(drehung[b + 1]!) < 2 || Math.sign(drehung[b + 1]!) === vz)) b++;
      for (let j = a; j <= b; j++) verbraucht[j] = 1;
      // Gesamtdrehung des Laufs: Richtung beim Eintritt (bei a) gegen die beim Austritt (bei b), beide in die Ebene des Knicks gedreht
      const P = punktBei(i);
      const dVor = transport(einheit(richtung(a, false)), punktBei(a), P);
      const dNach = transport(einheit(richtung(b, true)), punktBei(b), P);
      const gesamt = winkelIn(P, dVor, dNach);
      const bg: Biegung = { punkt: P, gesamt, dVor, dNach, nachbarVor: nachbar(P, false), nachbarNach: nachbar(P, true) };
      if (Math.abs(gesamt) < ECKE_GRAD) bg.grund = `unter ${ECKE_GRAD}°`;
      // dicht an einem Linienende, das eine Ecke ist: gehört zu dieser Ecke
      else if ((hartAnfang && s[i]! < 2 * h) || (hartEnde && laenge - s[i]! < 2 * h)) bg.grund = 'dicht an der Ecke am Linienende';
      biegungen.push(bg);
    }
  };
  // Lippe: auf der gezeichneten Linie (Proben), jede Probe dem nächsten Punkt des Ufers A zugeordnet; ohne Linie auf dem Ufer selbst
  const uferA = schlitz.slice(0, iW + 1);
  const nachbarAufSchlitz = (p: number, vorwaerts: boolean) => {
    const i = schlitz.indexOf(p);
    return schlitz[Math.max(0, Math.min(schlitz.length - 1, vorwaerts ? i + 1 : i - 1))]!;
  };
  if (linie && linie.length >= 4) {
    const naechster = (q: V3) => {
      let best = uferA[0]!;
      let bd = Infinity;
      for (const p of uferA) {
        const d = norm(sub(P3(p), q));
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      return best;
    };
    const zu = linie.map(naechster);
    biegungenAuf(linie, (i) => zu[i]!, nachbarAufSchlitz, true, false);
  } else biegungenAuf(uferA.map(P3), (i) => uferA[i]!, nachbarAufSchlitz, true, false);
  for (const w of falten) biegungenAuf(w.map(P3), (i) => w[i]!, (p, vorwaerts) => w[Math.max(0, Math.min(w.length - 1, w.indexOf(p) + (vorwaerts ? 1 : -1)))]!, true, true);
  const doppelVon = new Map<number, number>();
  for (const [d, o] of schnitt.doppel) doppelVon.set(o, d);
  type Knick = { stueck: number; i: number; drehung: number; z: number[]; dreiecke: number[]; bg: Biegung; doppel: boolean };
  const durchgang = (): { stuecke: Stueck[]; knicke: Knick[]; loecher: number; anKante: Map<string, number[]>; flKomp: Int32Array } => {
    const nT = T.length / 3;
    const anKante = new Map<string, number[]>();
    for (let tI = 0; tI < nT; tI++)
      for (let q = 0; q < 3; q++) {
        const key = schl(T[3 * tI + q]!, T[3 * tI + ((q + 1) % 3)]!);
        (anKante.get(key) ?? anKante.set(key, []).get(key)!).push(tI);
      }
    const flKomp = new Int32Array(nT).fill(-1);
    let nFl = 0;
    for (let t0i = 0; t0i < nT; t0i++) {
      if (flKomp[t0i]! >= 0) continue;
      const stapel = [t0i];
      flKomp[t0i] = nFl;
      while (stapel.length) {
        const tI = stapel.pop()!;
        for (let q = 0; q < 3; q++) {
          const key = schl(T[3 * tI + q]!, T[3 * tI + ((q + 1) % 3)]!);
          if (kanten.has(key)) continue;
          for (const u of anKante.get(key) ?? []) if (flKomp[u]! < 0) {
            flKomp[u] = nFl;
            stapel.push(u);
          }
        }
      }
      nFl++;
    }
    // Umlauf je Komponente: gerichtete Randhalbkanten (Dreieck links in der Komponente, jenseits keines oder ein fremdes Dreieck)
    const flaecheUV = (z: readonly number[]) => {
      let s = 0;
      for (let i = 0; i < z.length; i++) {
        const p = uv(z[i]!);
        const q = uv(z[(i + 1) % z.length]!);
        s += p[0] * q[1] - q[0] * p[1];
      }
      return s / 2;
    };
    const innen: { z: number[]; f: number; dreiecke: number[]; loecher: number; normalen: Map<number, V3> }[] = [];
    for (let kI = 0; kI < nFl; kI++) {
      const dreiecke: number[] = [];
      for (let tI = 0; tI < nT; tI++) if (flKomp[tI] === kI) dreiecke.push(tI);
      const rand = new Map<number, { b: number; t: number }[]>();
      const normalen = new Map<number, V3>();
      for (const tI of dreiecke) {
        const e0 = T[3 * tI]!;
        const e1 = T[3 * tI + 1]!;
        const e2 = T[3 * tI + 2]!;
        const nT3 = cross(sub(P3(e1), P3(e0)), sub(P3(e2), P3(e0)));
        for (const e of [e0, e1, e2]) {
          const m = normalen.get(e) ?? [0, 0, 0];
          normalen.set(e, [m[0] + nT3[0], m[1] + nT3[1], m[2] + nT3[2]]);
        }
        for (let q = 0; q < 3; q++) {
          const a2 = T[3 * tI + q]!;
          const b2 = T[3 * tI + ((q + 1) % 3)]!;
          const andere = (anKante.get(schl(a2, b2)) ?? []).find((u) => u !== tI);
          if (andere !== undefined && flKomp[andere] === kI && !kanten.has(schl(a2, b2))) continue;
          (rand.get(a2) ?? rand.set(a2, []).get(a2)!).push({ b: b2, t: tI });
        }
      }
      const gesehen2 = new Set<string>();
      const schleifen: number[][] = [];
      for (const [a0, liste0] of rand)
        for (const h0 of liste0) {
          if (gesehen2.has(`${a0}:${h0.b}`)) continue;
          const z: number[] = [];
          let a2 = a0;
          let hb = h0;
          for (let n2 = 0; n2 < 1e6; n2++) {
            if (gesehen2.has(`${a2}:${hb.b}`)) break;
            gesehen2.add(`${a2}:${hb.b}`);
            z.push(a2);
            // um b innerhalb der Komponente drehen, bis die nächste Randhalbkante (b → x) kommt
            let tI = hb.t;
            let naechsteHalb: { b: number; t: number } | null = null;
            for (let n3 = 0; n3 < 64 && !naechsteHalb; n3++) {
              const ecken = [T[3 * tI]!, T[3 * tI + 1]!, T[3 * tI + 2]!];
              const ib = ecken.indexOf(hb.b);
              const x = ecken[(ib + 1) % 3]!;
              const kand = (rand.get(hb.b) ?? []).find((e) => e.b === x && e.t === tI);
              if (kand) {
                naechsteHalb = kand;
                break;
              }
              const andere = (anKante.get(schl(hb.b, x)) ?? []).find((u) => u !== tI);
              if (andere === undefined || flKomp[andere] !== kI) break;
              tI = andere;
            }
            if (!naechsteHalb) break;
            a2 = hb.b;
            hb = naechsteHalb;
            if (a2 === a0 && hb.b === h0.b) break;
          }
          schleifen.push(z);
        }
      schleifen.sort((p2, q2) => q2.length - p2.length);
      const z = schleifen[0] ?? [];
      innen.push({ z, f: flaecheUV(z), dreiecke, loecher: schleifen.length - 1, normalen });
    }
    // ---- Ecken und Seiten je Stück ----
    const knicke: Knick[] = [];
    const stuecke: Stueck[] = innen.map(({ z, f, dreiecke, normalen }, sI) => {
      const n = z.length;
      const s = [0];
      for (let i = 1; i <= n; i++) s.push(s[i - 1]! + dist3(z[i - 1]!, z[i % n]!));
      const umfang = s[n]!;
      // Fenster der Glättung und der Winkelmessung: zwei Feldkanten
      const fenster = Math.min(2 * h, umfang / 8);
      const abstand = (i: number, j: number) => {
        const d = Math.abs(s[i]! - s[j]!);
        return Math.min(d, umfang - d);
      };
      // geglättete Lage: Mittel der Punkte im Umkreis `fenster` längs des Umlaufs
      const glatt: V3[] = z.map((_, i) => {
        const m: V3 = [0, 0, 0];
        let zahl = 0;
        for (let j = 0; j < n; j++) {
          if (abstand(i, j) > fenster) continue;
          const p = P3(z[j]!);
          m[0] += p[0];
          m[1] += p[1];
          m[2] += p[2];
          zahl++;
        }
        return [m[0] / zahl, m[1] / zahl, m[2] / zahl];
      });
      const richtung = (i: number, vorwaerts: boolean): V3 => {
        // geglätteter Punkt im Abstand `fenster` längs des Umlaufs
        let d = 0;
        let j = i;
        let p = glatt[i]!;
        for (let n2 = 0; n2 < n; n2++) {
          const k2 = vorwaerts ? (j + 1) % n : (j - 1 + n) % n;
          const q = glatt[k2]!;
          const l = norm(sub(q, p));
          if (d + l >= fenster) {
            const tt = l > 1e-15 ? (fenster - d) / l : 0;
            const r = mix(p, q, tt);
            const o = glatt[i]!;
            return vorwaerts ? sub(r, o) : sub(o, r);
          }
          d += l;
          j = k2;
          p = q;
        }
        const o = glatt[i]!;
        return vorwaerts ? sub(p, o) : sub(o, p);
      };
      // Drehung über ±fenster in der Tangentialebene (positiv = nach links = ins Stück), für Knoten und zur Anzeige
      const drehung = z.map((p, i) => winkelIn(p, richtung(i, false), richtung(i, true), normalen));
      const iC = z.indexOf(c);
      // harte Ecken nach den Regeln oben (Knoten, Linienwechsel)
      const ecken: number[] = [];
      const winkel: number[] = [];
      const konkav: number[] = [];
      for (let i = 0; i < n; i++) {
        const p = z[i]!;
        const x = z[(i - 1 + n) % n]!;
        const y = z[(i + 1) % n]!;
        const vor = artVon(x, p);
        const nach = artVon(p, y);
        const grad = nb.get(p)?.size ?? 0;
        let ecke = false;
        if (p === c) ecke = false;
        else if (grad > 2) {
          // Knoten: freie Linie endet hier → Ecke für die flankierenden Stücke, außer das Paar Arm/Schnitt am Start eines Schnitts
          const freiVor = FREIE_LINIEN.has(vor);
          const freiNach = FREIE_LINIEN.has(nach);
          const d = durch.get(p);
          if (freiVor !== freiNach) ecke = !(d !== undefined && (x === d || y === d));
          else if (!freiVor) ecke = drehung[i]! > ECKE_GRAD;
          else ecke = false;
        } else if (vor !== nach) ecke = !((vor === 'lippe' && nach === 'verlaengerung') || (vor === 'verlaengerung' && nach === 'lippe'));
        if (ecke) {
          ecken.push(i);
          winkel.push(drehung[i]!);
        }
      }
      // Biegungen der gezeichneten Linien: Innenseite Ecke, Außenseite Knick (Schnitt); die Seite folgt aus der Umlaufrichtung
      for (const bg of biegungen) {
        if (bg.grund) continue;
        const kand = [bg.punkt, doppelVon.get(bg.punkt) ?? -1];
        const i = z.findIndex((p) => kand.includes(p));
        if (i < 0 || (nb.get(z[i]!)?.size ?? 0) > 2 || ecken.includes(i)) continue;
        // läuft der Umlauf hier in Linienrichtung (der nächste Umlaufpunkt ist der Liniennachbar nach dem Knick)?
        const vorwaerts = orig(z[(i + 1) % n]!) === orig(bg.nachbarNach);
        const signiert = vorwaerts ? bg.gesamt : -bg.gesamt;
        if (signiert > 0) {
          ecken.push(i);
          winkel.push(signiert);
        } else konkav.push(i);
      }
      const reihenfolge = ecken.map((e, q) => q).sort((a, b) => ecken[a]! - ecken[b]!);
      const eckenSortiert = reihenfolge.map((q) => ecken[q]!);
      const winkelSortiert = reihenfolge.map((q) => winkel[q]!);
      ecken.length = 0;
      ecken.push(...eckenSortiert);
      winkel.length = 0;
      winkel.push(...winkelSortiert);
      for (const i of konkav) {
        const bg = biegungen.find((b) => !b.grund && (b.punkt === z[i] || doppelVon.get(b.punkt) === z[i]))!;
        knicke.push({ stueck: sI, i, drehung: -Math.abs(bg.gesamt), z, dreiecke, bg, doppel: z[i] !== bg.punkt });
      }
      // weniger als zwei Ecken: die am weitesten voneinander entfernten Punkte als Ecken (ein Stück braucht zwei Seiten)
      if (ecken.length < 2) {
        let best: [number, number] = [0, Math.floor(n / 2)];
        if (ecken.length === 1) {
          const e = ecken[0]!;
          let bd = -1;
          for (let i = 0; i < n; i++) {
            const d = abstand(i, e);
            if (d > bd) {
              bd = d;
              best = [e, i];
            }
          }
        }
        ecken.length = 0;
        ecken.push(...[...new Set(best)].sort((a, b) => a - b));
        winkel.length = 0;
        winkel.push(...ecken.map((e) => drehung[e]!));
      }
      const seiten: Seite[] = ecken.map((e, q) => {
        const bis = ecken[(q + 1) % ecken.length]!;
        const punkte: number[] = [];
        for (let i = e; ; i = (i + 1) % n) {
          punkte.push(z[i]!);
          if (i === bis) break;
          if (punkte.length > n + 1) break;
        }
        const arten: LinienArt[] = [];
        let laenge = 0;
        for (let i = 0; i + 1 < punkte.length; i++) {
          arten.push(artVon(punkte[i]!, punkte[i + 1]!));
          laenge += dist3(punkte[i]!, punkte[i + 1]!);
        }
        // Feldkanten: jede Käfigkante des Rands ist im feinen Netz zweigeteilt; gezählt wird die Feldrandkante, die an einem Käfigpunkt endet
        let feldKanten = -1;
        const pole = { fuenf: 0, drei: 0 };
        arten.forEach((art, i) => {
          if (art !== 'feldrand') return;
          if (feldKanten < 0) feldKanten = 0;
          if (feldRand.has(orig(punkte[i + 1]!))) feldKanten++;
          // Pole: jeder Käfigpunkt des Rands auf dieser Seite außer dem Anfang (den zählt die Seite davor als Ende)
          const kl = feldKlasse(punkte[i + 1]!);
          if (kl === 'fuenf') pole.fuenf++;
          else if (kl === 'drei') pole.drei++;
        });
        const nurLippe = arten.length > 0 && arten.every((a) => a === 'lippe');
        let lippe: -1 | 0 | 1 = -1;
        if (nurLippe) lippe = punkte.every((p) => schlitz.indexOf(p) <= iW) ? 0 : 1;
        const frei = arten.length > 0 && arten.every((a) => FREIE_LINIEN.has(a));
        return { punkte, arten, laenge, feldKanten, pole, lippe, frei };
      });
      if (winkel.length !== ecken.length) winkel.splice(0, winkel.length, ...ecken.map((e) => drehung[e]!));
      return { punkte: z, ecken, winkel, mundwinkel: iC >= 0 ? drehung[iC]! : Number.NaN, seiten, flaeche: Math.abs(f), dreiecke, konkav };
    });
    return { stuecke, knicke, loecher: innen.reduce((s2, x) => s2 + x.loecher, 0), anKante, flKomp };
  };

  // ---- Schnitt: vom Knick P läuft der kürzere Arm gerade weiter (Geodäte über die Dreiecke des Stücks) bis zur nächsten Linie ----
  type Kreuz = { tI: number; q: number; r: number; u: number; d: V3 };
  type Spur = { kreuz: Kreuz[]; ende: Kreuz; laenge: number; luft: number };
  /** Geodäte von P in Richtung d0 durch die Dreiecke des Stücks bis zur nächsten Linienkante; `luft` = kleinster Abstand des
   * Schnittinneren (ohne je eine Feldkante an Anfang und Ende) zu den Umlaufpunkten des Stücks abseits des Knicks */
  const spur = (P: number, d0: V3, z: readonly number[], dreiecke: readonly number[], kI: number, anKante: Map<string, number[]>, flKomp: Int32Array): Spur | string => {
    const fan = dreiecke.filter((tI) => T[3 * tI] === P || T[3 * tI + 1] === P || T[3 * tI + 2] === P);
    let start: Kreuz | null = null;
    for (const tI of fan) {
      const e = [T[3 * tI]!, T[3 * tI + 1]!, T[3 * tI + 2]!];
      const iP = e.indexOf(P);
      const q = e[(iP + 1) % 3]!;
      const r = e[(iP + 2) % 3]!;
      const pP = P3(P);
      const nT3 = einheit(cross(sub(P3(q), pP), sub(P3(r), pP)));
      const d = einheit(sub(d0, [nT3[0] * dot(d0, nT3), nT3[1] * dot(d0, nT3), nT3[2] * dot(d0, nT3)]));
      const hit = strahlStrecke(pP, d, P3(q), P3(r), nT3);
      if (!hit || !(hit.s > 1e-12) || hit.u < -1e-9 || hit.u > 1 + 1e-9) continue;
      if (!start || Math.abs(hit.u - 0.5) < Math.abs(start.u - 0.5)) start = { tI, q, r, u: Math.min(1 - 1e-6, Math.max(1e-6, hit.u)), d };
    }
    if (!start) return `kein Startdreieck im Fächer (${fan.length} Dreiecke)`;
    const kreuz: Kreuz[] = [start];
    let aktuell = start;
    let ende: Kreuz | null = null;
    for (let schritt = 0; schritt < 20000; schritt++) {
      const key = schl(aktuell.q, aktuell.r);
      if (kanten.has(key)) {
        ende = aktuell;
        break;
      }
      const naechst = (anKante.get(key) ?? []).find((u) => u !== aktuell.tI);
      if (naechst === undefined || flKomp[naechst] !== kI) return `Kante ohne Linie verlässt das Stück nach ${schritt} Schritten`;
      const X = mix(P3(aktuell.q), P3(aktuell.r), aktuell.u);
      const e = [T[3 * naechst]!, T[3 * naechst + 1]!, T[3 * naechst + 2]!];
      // im nächsten Dreieck steht die Kante r → q; w ist der dritte Punkt
      const iR = e.indexOf(aktuell.r);
      const q2 = e[(iR + 1) % 3]!;
      const w = e[(iR + 2) % 3]!;
      if (q2 !== aktuell.q) return `Nachbardreieck anders orientiert nach ${schritt} Schritten`;
      const n2 = einheit(cross(sub(P3(q2), P3(aktuell.r)), sub(P3(w), P3(aktuell.r))));
      const ek = einheit(sub(P3(aktuell.r), P3(aktuell.q)));
      const laengs = dot(aktuell.d, ek);
      const quer = Math.sqrt(Math.max(0, 1 - laengs * laengs));
      let p2 = cross(n2, ek);
      if (dot(p2, sub(P3(w), X)) < 0) p2 = [-p2[0], -p2[1], -p2[2]];
      const d2 = einheit([laengs * ek[0] + quer * p2[0], laengs * ek[1] + quer * p2[1], laengs * ek[2] + quer * p2[2]]);
      // Austritt über q2 → w oder w → r
      const h1 = strahlStrecke(X, d2, P3(q2), P3(w), n2);
      const h2 = strahlStrecke(X, d2, P3(w), P3(aktuell.r), n2);
      const ok1 = h1 && h1.s > 1e-12 && h1.u > -1e-6 && h1.u < 1 + 1e-6;
      const ok2 = h2 && h2.s > 1e-12 && h2.u > -1e-6 && h2.u < 1 + 1e-6;
      if (!ok1 && !ok2) return `kein Austritt nach ${schritt} Schritten`;
      const nimm1 = ok1 && (!ok2 || h1!.s <= h2!.s);
      const next: Kreuz = nimm1 ? { tI: naechst, q: q2, r: w, u: h1!.u, d: d2 } : { tI: naechst, q: w, r: aktuell.r, u: h2!.u, d: d2 };
      next.u = Math.min(1 - 1e-6, Math.max(1e-6, next.u));
      kreuz.push(next);
      aktuell = next;
    }
    if (!ende) return 'kein Ende nach 20000 Schritten';
    const lagen = kreuz.map((x) => mix(P3(x.q), P3(x.r), x.u));
    const bogen = [0];
    for (let j = 0; j < lagen.length; j++) bogen.push(bogen[j]! + norm(sub(lagen[j]!, j === 0 ? P3(P) : lagen[j - 1]!)));
    const laenge = bogen[lagen.length]!;
    // kürzer als zwei Feldkanten: der Streifen ist dafür zu schmal, die Biegung ist keine Ecke des Netzes
    if (laenge < 2 * h) return `zu kurz (${(laenge / h).toFixed(1)} Feldkanten)`;
    const pP = P3(P);
    const rand = z.map(P3).filter((q) => norm(sub(q, pP)) > 2 * h);
    let luft = Infinity;
    for (let j = 0; j < lagen.length; j++) {
      const sj = bogen[j + 1]!;
      if (sj < h || sj > laenge - h) continue;
      for (const q of rand) luft = Math.min(luft, norm(sub(lagen[j]!, q)));
    }
    return { kreuz, ende, laenge, luft };
  };
  const schneiden = (kn: Knick, anKante: Map<string, number[]>, flKomp: Int32Array): true | string => {
    const z = kn.z;
    const P = z[kn.i]!;
    const kI = flKomp[kn.dreiecke[0]!]!;
    const bg = kn.bg;
    // beide Fortsetzungen: der Arm nach dem Knick läuft rückwärts durch (−dNach), oder der Arm davor vorwärts (+dVor)
    const nachbarAm = (p: number) => (kn.doppel ? (doppelVon.get(p) ?? p) : p);
    const wahl: { d0: V3; durchNachbar: number; name: string }[] = [
      { d0: [-bg.dNach[0], -bg.dNach[1], -bg.dNach[2]], durchNachbar: nachbarAm(bg.nachbarNach), name: 'Arm danach' },
      { d0: bg.dVor, durchNachbar: nachbarAm(bg.nachbarVor), name: 'Arm davor' },
    ];
    // der Arm danach zuerst; nur wenn er nicht geht, der Arm davor
    const spuren: { w: (typeof wahl)[number]; s: Spur | string }[] = [];
    let gewaehlt: (typeof wahl)[number] | null = null;
    let beste: Spur | null = null;
    for (const w of wahl) {
      const s = spur(P, w.d0, z, kn.dreiecke, kI, anKante, flKomp);
      spuren.push({ w, s });
      if (typeof s !== 'string') {
        gewaehlt = w;
        beste = s;
        break;
      }
    }
    if (!gewaehlt || !beste) return spuren.map((x) => `${x.w.name}: ${x.s as string}`).join('; ');
    schnittWahl.push(`Punkt ${P}: ${spuren.map((x) => `${x.w.name} ${typeof x.s === 'string' ? x.s : `Luft ${(x.s.luft / h).toFixed(1)} Länge ${(x.s.laenge / h).toFixed(1)} Feldkanten`}`).join(' | ')} → ${gewaehlt.name}`);
    const { kreuz, ende } = beste;
    const durchNachbar = gewaehlt.durchNachbar;
    // Schnittpunkte anlegen
    const neu: number[] = [];
    for (const x of kreuz) {
      const idx = nBasis + zusatz.length;
      const a = uv(x.q);
      const b = uv(x.r);
      zusatz.push({ xyz: mix(P3(x.q), P3(x.r), x.u), uv: [a[0] + x.u * (b[0] - a[0]), a[1] + x.u * (b[1] - a[1])], kante: [x.q, x.r], t: x.u });
      neu.push(idx);
    }
    // Dreiecke teilen (Orientierung bleibt): erstes Dreieck an P, dann je Dreieck Eintritt auf r → q und Austritt
    const ersetzen = new Map<number, number[][]>();
    const erstes = kreuz[0]!;
    ersetzen.set(erstes.tI, [[P, erstes.q, neu[0]!], [P, neu[0]!, erstes.r]]);
    for (let j = 1; j < kreuz.length; j++) {
      const x = kreuz[j]!;
      const vorher = kreuz[j - 1]!;
      const Xin = neu[j - 1]!;
      const Xout = neu[j]!;
      // Dreieck x.tI hat die Ecken (vorher.r, vorher.q, w) mit w = dritter Punkt
      const r = vorher.r;
      const q = vorher.q;
      const w = x.q === q ? x.r : x.q;
      if (x.q === q) ersetzen.set(x.tI, [[Xin, q, Xout], [r, Xin, Xout], [r, Xout, w]]);
      else ersetzen.set(x.tI, [[r, Xin, Xout], [Xin, q, w], [Xin, w, Xout]]);
    }
    // Nachbar jenseits der Endkante (im anderen Stück) ebenfalls teilen
    const Xend = neu[neu.length - 1]!;
    const andere = (anKante.get(schl(ende.q, ende.r)) ?? []).find((u) => u !== ende.tI);
    if (andere !== undefined) {
      const e = [T[3 * andere]!, T[3 * andere + 1]!, T[3 * andere + 2]!];
      const iR = e.indexOf(ende.r);
      const w = e[(iR + 2) % 3]!;
      ersetzen.set(andere, [[ende.r, Xend, w], [Xend, ende.q, w]]);
    }
    const T2: number[] = [];
    for (let tI = 0; tI < T.length / 3; tI++) {
      const rep = ersetzen.get(tI);
      if (rep) for (const d of rep) T2.push(...d);
      else T2.push(T[3 * tI]!, T[3 * tI + 1]!, T[3 * tI + 2]!);
    }
    T.length = 0;
    T.push(...T2);
    // Linien: Endkante teilen, Schnittkanten eintragen
    const artEnde = kanten.get(schl(ende.q, ende.r))!;
    trenne(ende.q, ende.r);
    verbinde(ende.q, Xend, artEnde);
    verbinde(Xend, ende.r, artEnde);
    const weg = [P, ...neu];
    zug(weg, 'schnitt');
    durch.set(P, durchNachbar);
    schnitte.push(weg);
    return true;
  };

  let erg = durchgang();
  const verworfen: string[] = [];
  const schnittWahl: string[] = [];
  const uebergangen = new Set<number>();
  for (let runde = 0; runde < 8; runde++) {
    const kn = erg.knicke.filter((x) => !uebergangen.has(x.z[x.i]!)).sort((a, b) => a.drehung - b.drehung)[0];
    if (!kn) break;
    const grund = schneiden(kn, erg.anKante, erg.flKomp);
    if (grund !== true) {
      // nicht schneidbar: die Biegung entfällt auf beiden Seiten (sonst bliebe die Ecke der Innenseite ohne Gegenstück)
      verworfen.push(`Punkt ${kn.z[kn.i]} (${kn.drehung.toFixed(0)}°): ${grund}`);
      uebergangen.add(kn.z[kn.i]!);
      const bg = biegungen.find((b) => !b.grund && (b.punkt === kn.z[kn.i] || doppelVon.get(b.punkt) === kn.z[kn.i]));
      if (bg) bg.grund = `Schnitt verworfen: ${grund}`;
    }
    erg = durchgang();
  }
  return {
    stuecke: erg.stuecke,
    verlaengerung,
    falten,
    offen,
    schnitte,
    zusatz,
    nBasis,
    dreiecke: Int32Array.from(T),
    knoten: nb.size,
    kanten: kanten.size,
    ohneStueck: 0,
    loecher: erg.loecher,
    konkav: erg.stuecke.reduce((s, st) => s + st.konkav.length, 0),
    biegungen: biegungen.map((b) => (b.grund ? { punkt: b.punkt, gesamt: b.gesamt, grund: b.grund } : { punkt: b.punkt, gesamt: b.gesamt })),
    verworfen,
    schnittWahl,
    ms: jetzt() - t0,
  };
}

/** Der Mundwinkel c (letzter Pfadpunkt) je Stück, das ihn berührt: Ecke? und die Drehung der geglätteten Grenze dort. */
export function mundwinkelEcke(f: StueckeFund, c: number): { stueck: number; ecke: boolean; drehung: number }[] {
  const out: { stueck: number; ecke: boolean; drehung: number }[] = [];
  f.stuecke.forEach((st, q) => {
    const i = st.punkte.indexOf(c);
    if (i < 0) return;
    out.push({ stueck: q, ecke: st.ecken.includes(i), drehung: st.mundwinkel });
  });
  return out;
}

/** Lage eines Stückpunkts in der Karte (Schnittpunkte aus `zusatz`). */
export function stueckPunktUV(f: StueckeFund, karte: Karte, kIdx: Map<number, number>, i: number): V2 {
  if (i >= f.nBasis) return f.zusatz[i - f.nBasis]!.uv;
  const l = kIdx.get(i)!;
  return [karte.u[l]!, karte.v[l]!];
}

/** Bild der Stücke in der Karte (SVG): Stücke gefüllt, Linien nach Art, Ecken als Punkte, Pole am Feldrand, Seiten mit Feldkanten bzw. Länge in px. */
export function stueckeSvg(f: StueckeFund, karte: Karte, netz: FeinNetz, schnitt: Aufgeschnitten, c: number, groesse = 320, px = 461): string {
  const kIdx = new Map<number, number>();
  karte.punkte.forEach((g, i) => kIdx.set(g, i));
  const R = 14;
  const X = (i: number) => R + stueckPunktUV(f, karte, kIdx, i)[0] * (groesse - 2 * R);
  const Y = (i: number) => R + stueckPunktUV(f, karte, kIdx, i)[1] * (groesse - 2 * R);
  const farbe: Record<LinienArt, string> = { lippe: '#c0392b', verlaengerung: '#2471a3', naht: '#7d6608', feldrand: '#1b2631', falte: '#8e44ad', schnitt: '#117a65' };
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${groesse}" height="${groesse}" viewBox="0 0 ${groesse} ${groesse}" style="background:#fbf8f1;font:10px sans-serif">`;
  f.stuecke.forEach((st, q) => {
    const d = st.punkte.map((p, i) => `${i ? 'L' : 'M'}${X(p).toFixed(1)} ${Y(p).toFixed(1)}`).join(' ') + 'Z';
    s += `<path d="${d}" fill="hsl(${(q * 67) % 360} 60% 70% / 0.45)" stroke="none"/>`;
  });
  const gezeichnet = new Set<string>();
  const kante = (a: number, b: number, art: LinienArt) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (gezeichnet.has(key)) return;
    gezeichnet.add(key);
    s += `<line x1="${X(a).toFixed(1)}" y1="${Y(a).toFixed(1)}" x2="${X(b).toFixed(1)}" y2="${Y(b).toFixed(1)}" stroke="${farbe[art]}" stroke-width="${art === 'feldrand' || art === 'naht' ? 1.2 : 1.8}"/>`;
  };
  for (const st of f.stuecke) for (const se of st.seiten) for (let i = 0; i + 1 < se.punkte.length; i++) kante(se.punkte[i]!, se.punkte[i + 1]!, se.arten[i]!);
  for (const w of f.offen) for (let i = 0; i + 1 < w.length; i++) {
    s += `<line x1="${X(w[i]!).toFixed(1)}" y1="${Y(w[i]!).toFixed(1)}" x2="${X(w[i + 1]!).toFixed(1)}" y2="${Y(w[i + 1]!).toFixed(1)}" stroke="#8e44ad" stroke-width="1" stroke-dasharray="3 2"/>`;
  }
  for (const st of f.stuecke) {
    for (const se of st.seiten) {
      const mid = se.punkte[Math.floor(se.punkte.length / 2)]!;
      const text = se.feldKanten >= 0 ? `K ${se.feldKanten}${se.pole.fuenf || se.pole.drei ? ` ·${se.pole.fuenf}⁵${se.pole.drei}³` : ''}` : `${Math.round(se.laenge * px)}${se.frei ? ' frei' : ''}`;
      s += `<text x="${(X(mid) + 3).toFixed(1)}" y="${(Y(mid) - 3).toFixed(1)}" fill="#333">${text}</text>`;
    }
    st.ecken.forEach((e, q) => {
      const p = st.punkte[e]!;
      s += `<circle cx="${X(p).toFixed(1)}" cy="${Y(p).toFixed(1)}" r="2.6" fill="#1b2631"/><text x="${(X(p) + 4).toFixed(1)}" y="${(Y(p) + 10).toFixed(1)}" fill="#1b2631" font-size="8">${st.winkel[q]!.toFixed(0)}°</text>`;
    });
    for (const i of st.konkav) {
      const p = st.punkte[i]!;
      s += `<circle cx="${X(p).toFixed(1)}" cy="${Y(p).toFixed(1)}" r="4" fill="none" stroke="#e74c3c" stroke-width="1.5"/>`;
    }
  }
  if (kIdx.has(c)) s += `<circle cx="${X(c).toFixed(1)}" cy="${Y(c).toFixed(1)}" r="5" fill="none" stroke="#c0392b" stroke-width="1.5"/>`;
  void netz;
  void schnitt;
  return s + '</svg>';
}
