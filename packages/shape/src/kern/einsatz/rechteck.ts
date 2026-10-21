// Maul als Einsatz, Fortsetzung (Plan 21.10., E1): Das halbe Maulfeld wird als zwei Rechtecke vernetzt — über und unter der
// Maullinie samt ihrer Verlängerung vom Mundwinkel bis zum Feldrand. Dann ist der Mundwinkel c ein regulärer Gitterpunkt am
// Ende eines Schnitts: vier Hautflächen um c, natürlich 360° (im Gitter mit Schleifen um den Mund hatte c nur zwei, die Fläche
// faltete — Befund A7). Hier: die Verlängerung und die beiden Karten.
// 1. Teilung: Auf dem entlang des Schlitzes aufgeschnittenen Halbfeld ist V harmonisch (Kotangens) mit V = 1 auf der einen
//    Schlitzseite samt angrenzendem Nahtstück, V = 0 auf der anderen samt ihrem Nahtstück, frei am Feldrand. Die Höhenlinie
//    V = ½ beginnt in c und läuft glatt zum Feldrand — die natürliche Verlängerung der Linie, ohne Richtungsregeln.
// 2. Verlängerung: Kantenpfad von c zum Randpunkt von K1, an dem V = ½ den Rand trifft (Kosten nach |V − ½|), Zacken
//    abgekürzt.
// 3. Karten: Das Halbfeld wird entlang Schlitz und Verlängerung ganz aufgeschnitten; jede Hälfte geht nach Tutte (positive
//    Gewichte, Rand fest) auf das Einheitsquadrat — unten der Schnitt (Naht → c → Feldrand, s nach Bogenlänge), rechts und
//    oben der Feldrand, links das Nahtstück. Die Ecke rechts oben wird so gewählt, dass beide Hälften gleich viele Spalten
//    (Randkanten von K1 oben) haben und die Zellen möglichst quadratisch werden. DOM-frei.
import { cgDirichlet, laplace } from '../../loeser/cg';
import { type FeinNetz, aufschneiden } from './flaeche';

type V3 = [number, number, number];

/** Eine Hälfte als Rechteck: Punkte (Nummern des aufgeschnittenen Netzes), Lage im Einheitsquadrat, Ränder. */
export type RechteckKarte = {
  /** Dreiecke (Nummern des ganz aufgeschnittenen Netzes; Doppel ab der Punktzahl des feinen Netzes) */
  dreiecke: Int32Array;
  /** s, t je Punkt (Nummern wie in `dreiecke`) */
  s: Map<number, number>;
  t: Map<number, number>;
  /** Randstücke in Umlaufrichtung: unten (Naht → c → Feldrand), rechts (Feldrand → Ecke), oben (Ecke → Naht), links (Naht ↓) */
  unten: number[];
  rechts: number[];
  oben: number[];
  links: number[];
  /** Randpunkte von K1 (Nummern des feinen Netzes) oben (j = 0 an der Naht … Spalten) und rechts (i = 0 am Schnitt … Reihen) */
  obenK1: number[];
  rechtsK1: number[];
  /** s des Mundwinkels auf dem unteren Rand */
  sWinkel: number;
  umgeklappt: number;
};

export type Rechtecke = {
  /** Verlängerung c → Randpunkt von K1 (Nummern des feinen Netzes) */
  verlaengerung: number[];
  /** Hälfte, deren Schlitzseite an der oberen Hälfte der Naht anliegt, und die andere */
  a: RechteckKarte;
  b: RechteckKarte;
  /** Spalten (gemeinsam), Reihen je Hälfte */
  spalten: number;
  /** Doppel → Ursprung (Punkte des ganz aufgeschnittenen Netzes) */
  doppel: Map<number, number>;
  /** V der Teilung je Punkt des nur am Schlitz aufgeschnittenen Netzes (für Bilder und Prüfungen) */
  teilung: Map<number, number>;
};

const schl = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** Randschleife eines Dreieckssatzes über gerichtete Randkanten (ab `start`). */
function randSchleife(tri: ArrayLike<number>, start: number): number[] {
  const ger = new Set<string>();
  for (let t = 0; t < tri.length; t += 3) for (let k = 0; k < 3; k++) ger.add(`${tri[t + k]}:${tri[t + ((k + 1) % 3)]}`);
  const nach = new Map<number, number>();
  for (const s of ger) {
    const [a, b] = s.split(':').map(Number) as [number, number];
    if (!ger.has(`${b}:${a}`)) nach.set(a, b);
  }
  const out: number[] = [];
  for (let a = start, n = 0; n <= nach.size; n++) {
    out.push(a);
    const b = nach.get(a);
    if (b === undefined) throw new Error(`Rechteck: Rand bricht bei ${a} ab`);
    a = b;
    if (a === start) break;
  }
  return out;
}

/** Bogenlänge entlang eines Zugs (je Punkt). */
function bogen(zug: readonly number[], lage: (i: number) => V3): number[] {
  const s = [0];
  for (let i = 1; i < zug.length; i++) {
    const a = lage(zug[i - 1]!);
    const b = lage(zug[i]!);
    s.push(s[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  return s;
}

/**
 * Zwei Rechtecke für ein halbes Maulfeld. `dreiecke` = feine Dreiecke der rechten Hälfte von M (Indizes in `netz.dreiecke`),
 * `pfad` = Kantenpfad des Schlitzes (Naht → Mundwinkel), `randK1` = Randpunkte von M in K1 (Nummern wie im feinen Netz).
 */
export function rechteckKarten(netz: FeinNetz, dreiecke: readonly number[], pfad: readonly number[], randK1: ReadonlySet<number>): Rechtecke {
  const P = netz.punkte;
  const naht = (i: number) => Math.abs(P[3 * i + 2]!) < 1e-9;
  // 1. Teilung auf dem am Schlitz aufgeschnittenen Halbfeld
  const s1 = aufschneiden(netz, dreiecke, pfad);
  const lage1 = (i: number): V3 => {
    const o = s1.doppel.get(i) ?? i;
    return [P[3 * o]!, P[3 * o + 1]!, P[3 * o + 2]!];
  };
  const doppelVon1 = new Map<number, number>();
  for (const [d, o] of s1.doppel) doppelVon1.set(o, d);
  const v0 = pfad[0]!;
  const c = pfad[pfad.length - 1]!;
  const v0d = doppelVon1.get(v0)!;
  const schleife1 = randSchleife(s1.dreiecke, v0);
  // Schlitz = Stück v0 … c … v0d; Seite A = v0 → c (Ursprünge), Seite B = c → v0d (Doppel)
  const iC = schleife1.indexOf(c);
  const iD = schleife1.indexOf(v0d);
  const reihe = iC < iD ? schleife1 : [v0, ...schleife1.slice(1).reverse()];
  const jC = reihe.indexOf(c);
  const jD = reihe.indexOf(v0d);
  const seiteA = reihe.slice(0, jC + 1);
  const seiteB = reihe.slice(jC, jD + 1);
  const rest = reihe.slice(jD + 1);
  // rest: Nahtstück unter v0d, Feldrand, Nahtstück bis v0
  let a1 = 0;
  while (a1 < rest.length && naht(rest[a1]!)) a1++;
  let a2 = rest.length;
  while (a2 > a1 && naht(rest[a2 - 1]!)) a2--;
  const nahtB = [v0d, ...rest.slice(0, a1)];
  const aussen = rest.slice(Math.max(0, a1 - 1), Math.min(rest.length, a2 + 1));
  const nahtA = [...rest.slice(a2), v0];
  // örtliche Nummern und Laplace
  const lokal = new Map<number, number>();
  const global: number[] = [];
  for (const i of s1.dreiecke) if (!lokal.has(i)) {
    lokal.set(i, global.length);
    global.push(i);
  }
  const m1 = global.length;
  const tri1 = Int32Array.from(s1.dreiecke, (i) => lokal.get(i)!);
  const P1 = new Float64Array(3 * m1);
  global.forEach((g, k) => P1.set(lage1(g), 3 * k));
  const Lk = laplace(m1, tri1, P1, 'kotangens');
  const fest = new Uint8Array(m1);
  const wert = new Float64Array(m1);
  for (const k of [...seiteA, ...nahtA]) {
    fest[lokal.get(k)!] = 1;
    wert[lokal.get(k)!] = 1;
  }
  for (const k of [...seiteB, ...nahtB]) {
    fest[lokal.get(k)!] = 1;
    wert[lokal.get(k)!] = 0;
  }
  fest[lokal.get(c)!] = 1;
  wert[lokal.get(c)!] = 0.5;
  const V = cgDirichlet(Lk, fest, wert).x;
  const teilung = new Map<number, number>();
  global.forEach((g, k) => teilung.set(g, V[k]!));
  // 2. Verlängerung: Ziel = Randpunkt von K1 auf dem Feldrand, an dem V am nächsten an ½ liegt (zwischen zwei Randpunkten mit
  // Vorzeichenwechsel der nähere); Kantenpfad mit Kosten nach |V − ½|, Schlitz und Naht gesperrt
  const kandidaten = aussen.filter((k) => randK1.has(k) && !naht(k));
  if (!kandidaten.length) throw new Error('Rechteck: Feldrand ohne Randpunkte von K1');
  let ziel = kandidaten[0]!;
  for (const k of kandidaten) if (Math.abs(teilung.get(k)! - 0.5) < Math.abs(teilung.get(ziel)! - 0.5)) ziel = k;
  const nb = new Map<number, Set<number>>();
  for (let t = 0; t < s1.dreiecke.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = s1.dreiecke[t + k]!;
      const b = s1.dreiecke[t + ((k + 1) % 3)]!;
      (nb.get(a) ?? nb.set(a, new Set()).get(a)!).add(b);
      (nb.get(b) ?? nb.set(b, new Set()).get(b)!).add(a);
    }
  const gesperrt = new Set<number>([...seiteA, ...seiteB, ...nahtA, ...nahtB]);
  const aussenSet = new Set(aussen);
  gesperrt.delete(c);
  let hSumme = 0;
  let hAnz = 0;
  for (const [a, set] of nb) for (const b of set) {
    const p = lage1(a);
    const q = lage1(b);
    hSumme += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    hAnz++;
  }
  const h = hSumme / Math.max(1, hAnz);
  const dist = new Map<number, number>([[c, 0]]);
  const vor = new Map<number, number>();
  const offen = [c];
  while (offen.length) {
    let bi = 0;
    for (let k = 1; k < offen.length; k++) if (dist.get(offen[k]!)! < dist.get(offen[bi]!)!) bi = k;
    const a = offen.splice(bi, 1)[0]!;
    if (a === ziel) break;
    const pa = lage1(a);
    for (const b of nb.get(a) ?? []) {
      if (gesperrt.has(b)) continue;
      // nur Randpunkte von K1 als Ende; andere Randpunkte des Feldrands nicht betreten (der Pfad bliebe sonst am Rand)
      if (b !== ziel && aussenSet.has(b)) continue;
      const pb = lage1(b);
      const l = Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
      const w = l * (1 + 40 * Math.abs(0.5 * (teilung.get(a)! + teilung.get(b)!) - 0.5)) + 0.01 * h;
      const nd = dist.get(a)! + w;
      if (nd < (dist.get(b) ?? Infinity)) {
        if (!dist.has(b)) offen.push(b);
        dist.set(b, nd);
        vor.set(b, a);
      }
    }
  }
  if (!dist.has(ziel)) throw new Error('Rechteck: keine Verlängerung zum Feldrand');
  const ext = [ziel];
  while (ext[ext.length - 1] !== c) ext.push(vor.get(ext[ext.length - 1]!)!);
  ext.reverse();
  // Zacken abkürzen (wie beim Schlitz): sind v₋₁ und v₊₁ benachbart, fällt v heraus
  for (let geaendert = true; geaendert; ) {
    geaendert = false;
    for (let i = 1; i + 1 < ext.length; i++)
      if (nb.get(ext[i - 1]!)?.has(ext[i + 1]!)) {
        ext.splice(i, 1);
        geaendert = true;
        break;
      }
  }
  // 3. ganz aufschneiden: Schlitz und Verlängerung als ein Pfad (Naht → c → Feldrand)
  const ganz = [...pfad, ...ext.slice(1)];
  const s2 = aufschneiden(netz, dreiecke, ganz);
  const lage2 = (i: number): V3 => {
    const o = s2.doppel.get(i) ?? i;
    return [P[3 * o]!, P[3 * o + 1]!, P[3 * o + 2]!];
  };
  const naht2 = (i: number) => naht(s2.doppel.get(i) ?? i);
  // Zusammenhangskomponenten über gemeinsame Kanten
  const T2 = s2.dreiecke;
  const nT = T2.length / 3;
  const anKante = new Map<string, number[]>();
  for (let t = 0; t < nT; t++)
    for (let k = 0; k < 3; k++) {
      const key = schl(T2[3 * t + k]!, T2[3 * t + ((k + 1) % 3)]!);
      (anKante.get(key) ?? anKante.set(key, []).get(key)!).push(t);
    }
  const komp = new Int32Array(nT).fill(-1);
  let nK = 0;
  for (let t0 = 0; t0 < nT; t0++) {
    if (komp[t0]! >= 0) continue;
    const stapel = [t0];
    komp[t0] = nK;
    while (stapel.length) {
      const t = stapel.pop()!;
      for (let k = 0; k < 3; k++)
        for (const u of anKante.get(schl(T2[3 * t + k]!, T2[3 * t + ((k + 1) % 3)]!)) ?? [])
          if (komp[u]! < 0) {
            komp[u] = nK;
            stapel.push(u);
          }
    }
    nK++;
  }
  if (nK !== 2) throw new Error(`Rechteck: Schnitt teilt das Halbfeld in ${nK} Teile (erwartet 2)`);
  const doppelVon2 = new Map<number, number>();
  for (const [d, o] of s2.doppel) doppelVon2.set(o, d);
  // Hälfte A = die mit v0 (Ursprung) — an ihr liegt das Nahtstück nahtA an; B = die mit dem Doppel von v0
  const dreieckeVon = (k: number) => {
    const out: number[] = [];
    for (let t = 0; t < nT; t++) if (komp[t] === k) out.push(T2[3 * t]!, T2[3 * t + 1]!, T2[3 * t + 2]!);
    return Int32Array.from(out);
  };
  const enthaelt = (tri: Int32Array, p: number) => tri.includes(p);
  let triA = dreieckeVon(0);
  let triB = dreieckeVon(1);
  if (!enthaelt(triA, v0)) [triA, triB] = [triB, triA];
  const ganzeKette = (seite: 'a' | 'b') => ganz.map((p, i) => (seite === 'a' || i === ganz.length - 1 ? p : (doppelVon2.get(p) ?? p)));
  // Hälfte A enthält die Ursprünge des Pfads, B die Doppel (außer dem letzten Punkt am Rand, der ungedoppelt ist)
  const kettenA = ganzeKette('a');
  const kettenB = ganzeKette('b');
  const sKette = bogen(ganz, (i) => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!]);
  const L = sKette[sKette.length - 1]!;
  const sWinkel = sKette[pfad.length - 1]! / L;
  const karte = (tri: Int32Array, kette: number[]): RechteckKarte => {
    // Randschleife ab dem Schnittanfang an der Naht; Richtung so, dass zuerst der Schnitt kommt
    let sch = randSchleife(tri, kette[0]!);
    if (sch[1] !== kette[1]) sch = [sch[0]!, ...sch.slice(1).reverse()];
    const iEnde = sch.indexOf(kette[kette.length - 1]!);
    if (iEnde !== kette.length - 1) throw new Error('Rechteck: Schnitt liegt nicht am Stück auf dem Rand');
    const unten = sch.slice(0, iEnde + 1);
    const rest2 = [...sch.slice(iEnde), sch[0]!];
    // rest2: Feldrand ab dem Schnittende bis zur Naht, dann das Nahtstück zurück zum Schnittanfang
    let e = rest2.length - 1;
    while (e > 0 && naht2(rest2[e - 1]!)) e--;
    const feldrand = rest2.slice(0, e + 1);
    const links = rest2.slice(e);
    // Randpunkte von K1 auf dem Feldrand (Schnittende … Nahtecke), Ursprünge
    const k1Folge = feldrand.filter((p) => randK1.has(s2.doppel.get(p) ?? p));
    return { dreiecke: tri, s: new Map(), t: new Map(), unten, rechts: feldrand, oben: [], links, obenK1: k1Folge, rechtsK1: [], sWinkel, umgeklappt: 0 };
  };
  const kA = karte(triA, kettenA);
  const kB = karte(triB, kettenB);
  // Ecke rechts oben je Hälfte: gleiche Spaltenzahl n_s oben; Kandidaten n_s = 1 … min − 1, Bewertung nach Zellform
  const nA = kA.obenK1.length - 1;
  const nB = kB.obenK1.length - 1;
  const laenge = (zug: number[]) => {
    const b2 = bogen(zug, lage2);
    return b2[b2.length - 1]!;
  };
  const stueck = (folge: number[], von: number, bis: number) => {
    const iv = folge.indexOf(von);
    const ib = folge.indexOf(bis);
    return folge.slice(Math.min(iv, ib), Math.max(iv, ib) + 1);
  };
  let besteNs = -1;
  let besteWert = Infinity;
  for (let ns = 1; ns < Math.min(nA, nB); ns++) {
    let wertSumme = 0;
    for (const k of [kA, kB]) {
      const n = k.obenK1.length - 1;
      const nt = n - ns;
      if (nt < 1) {
        wertSumme = Infinity;
        break;
      }
      const ecke = k.obenK1[nt]!;
      const rechtsZug = stueck(k.rechts, k.rechts[0]!, ecke);
      const obenZug = stueck(k.rechts, ecke, k.rechts[k.rechts.length - 1]!);
      const breit = 0.5 * (laenge(k.unten) + laenge(obenZug)) / ns;
      const hoch = 0.5 * (laenge(rechtsZug) + laenge(k.links)) / nt;
      wertSumme += Math.abs(Math.log(breit / hoch));
    }
    if (wertSumme < besteWert) {
      besteWert = wertSumme;
      besteNs = ns;
    }
  }
  if (besteNs < 1) throw new Error(`Rechteck: keine Spaltenzahl (Randkanten ${nA}/${nB})`);
  for (const k of [kA, kB]) {
    const n = k.obenK1.length - 1;
    const nt = n - besteNs;
    const ecke = k.obenK1[nt]!;
    const iE = k.rechts.indexOf(ecke);
    const rechtsZug = k.rechts.slice(0, iE + 1);
    const obenZug = k.rechts.slice(iE);
    k.rechts = rechtsZug;
    k.oben = obenZug;
    k.rechtsK1 = k.obenK1.slice(0, nt + 1);
    k.obenK1 = k.obenK1.slice(nt).reverse();
    // Tutte auf das Einheitsquadrat
    const lok = new Map<number, number>();
    const glob: number[] = [];
    for (const i of k.dreiecke) if (!lok.has(i)) {
      lok.set(i, glob.length);
      glob.push(i);
    }
    const m = glob.length;
    const tri = Int32Array.from(k.dreiecke, (i) => lok.get(i)!);
    const PP = new Float64Array(3 * m);
    glob.forEach((g, q) => PP.set(lage2(g), 3 * q));
    const su = new Float64Array(m);
    const tu = new Float64Array(m);
    const festR = new Uint8Array(m);
    const setze = (zug: number[], f: (x: number) => [number, number]) => {
      const b2 = bogen(zug, lage2);
      const Lz = b2[b2.length - 1]! || 1;
      zug.forEach((p, q) => {
        const [x, y] = f(b2[q]! / Lz);
        const i = lok.get(p)!;
        su[i] = x;
        tu[i] = y;
        festR[i] = 1;
      });
    };
    // unten nach der Bogenlänge des ganzen Schnitts (beide Hälften gleich), rechts 0 → 1, oben 1 → 0, links 1 → 0
    k.unten.forEach((p, q) => {
      const i = lok.get(p)!;
      su[i] = sKette[q]! / L;
      tu[i] = 0;
      festR[i] = 1;
    });
    setze(k.rechts, (x) => [1, x]);
    setze(k.oben, (x) => [1 - x, 1]);
    setze(k.links, (x) => [0, 1 - x]);
    const Lp = laplace(m, tri, PP, 'positiv');
    const S = cgDirichlet(Lp, festR, su).x;
    const Tt = cgDirichlet(Lp, festR, tu).x;
    glob.forEach((g, q) => {
      k.s.set(g, S[q]!);
      k.t.set(g, Tt[q]!);
    });
    let pos = 0;
    let neg = 0;
    for (let q = 0; q < tri.length; q += 3) {
      const a = tri[q]!;
      const b = tri[q + 1]!;
      const cc = tri[q + 2]!;
      const f = (S[b]! - S[a]!) * (Tt[cc]! - Tt[a]!) - (Tt[b]! - Tt[a]!) * (S[cc]! - S[a]!);
      if (f > 1e-15) pos++;
      else if (f < -1e-15) neg++;
    }
    k.umgeklappt = Math.min(pos, neg);
  }
  return { verlaengerung: ext, a: kA, b: kB, spalten: besteNs, doppel: s2.doppel, teilung };
}
