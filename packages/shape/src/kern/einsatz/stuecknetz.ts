// P2 „Stücknetz im Maulfeld“, Tag 3–5 (04.11.2026): aus Stücken (`stuecke.ts`) und Mustern (`muster.ts`) der Käfig des
// Einsatzes — Lage je Stück in der Ebene, auf der Haut, Zusammenbau mit Spiegel und Lippenfalte — und die Übergabe an Lippe (A6),
// Hautlöser (A7) und Messung des Kernrings, damit die Zahlen vergleichbar sind.
//
// Reihenfolge (Tag 5): erst die Lippe. Ihre Stationen liegen auf der gezeichneten Linie nach Dichte — Abstand höchstens h,
// höchstens √(6ε/κ) (das Kontrollpolygon einer Falte liegt ≈ h²κ/6 neben der Kurve, ε = Haut-Tor) und höchstens die örtliche
// Merkmalsgröße (Abstand zur nächsten anderen Linie; eine anstoßende Linie zählt nur im Keil unter 45°; Boden h/4) — und daraus
// die Untergrenze der Kantenzahl der Lippenseite. Dann wird die Lippe angepasst (A6), und die Reihen des Musters hängen am
// Kontrollpolygon der Falte, nicht an Abtastpunkten der Linie (gemessen 04.11.: am J-Haken lag das Polygon 1,2 px, am Mundwinkel
// c′ = 1,5c − 0,5U 2,8 px neben der Linie und kreuzte 0,4 px hohe Reihen).
//
// Lage: Jedes Stück wird für sich formtreu in die Ebene gelegt — konforme Abflachung seiner feinen Dreiecke (LSCM, freier Rand,
// zwei Punkte fest): Winkel bleiben, ein schmaler Keil bleibt schmal, eine gebogene Lippe bleibt gebogen. Das Muster bekommt
// seine Randpunkte nach Bogenlänge auf dem abgeflachten Rand (die Lippenstellen als Projektion der Kontrollpunkte) und seine
// inneren Punkte durch Tutte auf dem Mustergraphen; klappt dabei eine Zelle um oder liegt ein Punkt außerhalb (der freie Rand
// ist nicht immer konvex — Hals eines J-Hakens, S-Bogen), fällt das Stück auf Tutte in ein konvexes Vieleck mit seinen
// Eckwinkeln zurück. Aus der Ebene zurück auf die Haut von A0 durch das Dreieck, in dem der Punkt liegt. Randpunkte auf den
// Linien liegen nach Bogenlänge auf der Linie (Feldrand: genau auf den alten Käfigpunkten; die Lippe ist im geschlossenen Maul
// eine scharfe Falte mit gemeinsamen Punkten beider Kiefer, der Mundwinkel ihr Ende ohne Punktschärfe — ein glatter Punkt mit
// vier Flächen). Keine Regel hier nennt einen Körper oder eine Lage. DOM-frei.
import { kaefigAusFlaechen, kanteZwischen, pruefeKaefig } from '../../kaefig/halbkanten';
import { cgDirichlet, type DuennSym, laplace } from '../../loeser/cg';
import { spiegelIndex } from '../pinsel';
import type { EinsatzFall } from '../pruefen/einsatzFall';
import { faltenGraph } from './leiter';
import { lippeAnpassen, type LippenAnfang, type LippenAnpassung, lippenDichte } from './lippe';
import { a0Netz, einsatzLoesen, einsatzMessen, type EinsatzMasse, type GeloesterEinsatz, type LoesenOptionen } from './loesen';
import { anzahlenWaehlen, type Kante, type Muster, musterBauen, musterFlaechen, musterWahl, type Polygon, seitenRegister, seitenSchluessel } from './muster';
import { type Seite, type StueckeFund, stueckeFinden } from './stuecke';
import { type EinsatzTopologie, ROLLE_AUSSEN, ROLLE_HAUT, ROLLE_LIPPE, ROLLE_RAND, ROLLE_TOT, ROLLE_WINKEL, UNENDLICH } from './topologie';

type V3 = [number, number, number];
type V2 = [number, number];

export type StuecknetzOptionen = {
  /** Dichte: Ziel-Kantenlänge der freien Seiten (Standard: mittlere Feldkante h1) */
  h?: number;
  /** kleinste Kantenzahl einer freien Seite */
  mindest?: number;
  /** Biegungsschwelle der Stücke (Grad; Infinity = Biegungen sind keine Ecken) */
  eckeGrad?: number;
  /** Ebenen je Stück zum Zeichnen mitgeben (Diagnose) */
  diagnose?: boolean;
};

/** Diagnose: die Ebene eines Stücks mit feinen Dreiecken und Musterzellen */
export type StueckEbene = {
  stueck: number;
  art: 'konform' | 'vieleck';
  /** konforme Ebene (immer) und die benutzte Ebene (konform oder Vieleck) der feinen Punkte des Stücks */
  konform: { u: Float64Array; v: Float64Array };
  benutzt: { u: Float64Array; v: Float64Array };
  tri: number[];
  /** Umlauf des Stücks (kompakte Nummern) */
  rand: number[];
  /** Musterpunkte: Schlüssel, Lage in der benutzten Ebene, fest (Rand) */
  muster: { keys: string[]; gu: Float64Array; gv: Float64Array; fest: Uint8Array; flaechen: string[][] };
};

export type StuecknetzBau = {
  t: EinsatzTopologie;
  fund: StueckeFund;
  kanten: Map<string, Kante>;
  polygone: Polygon[];
  anzahl: Map<string, number>;
  muster: Muster;
  /** Flächen des Einsatzes (beide Hälften) und je Stück, Pole (3/5) im Innern */
  flaechen: number;
  flaechenJeStueck: number[];
  pole: number;
  /** Käfigprüfung */
  pruefung: { fehler: string[]; geschlossen: boolean };
  /** Schlüssel je neuem Punkt (ab nAlt, rechte Hälfte; links die Spiegel) */
  schluessel: string[];
  /** Lippe (A6): Kontrollpolygon der Falte, an dem die Reihen hängen */
  lippe: LippenAnpassung;
  /** Zellgröße je Stützstelle der Lippenlinie (Merkmalsgröße, h … h/4) und die Stationen (Bogenanteile) */
  lippenMass: Float64Array;
  lippenAnteile: Float64Array;
  /** Ebene je Stück: konforme Abflachung oder Rückfall auf das Vieleck */
  ebenen: ('konform' | 'vieleck')[];
  ebenenDaten?: StueckEbene[] | undefined;
  /** je Stück: in der konformen Ebene umgeklappte Musterzellen und Musterpunkte außerhalb der Fläche (Grund des Rückfalls) */
  konformFalten: number[];
  konformDraussen: number[];
  ms: { stuecke: number; zahlen: number; lage: number; bau: number };
};

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());
const schl = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
/** Toleranz des Lippen-Kontrollpolygons gegen die Linie = Haut-Tor (0,25 px in Welt) */
const EPS_LIPPE = 0.25 / 461;

/**
 * Ebenes konvexes Vieleck für ein Stück: Ecken bei den Bogenlängen `s` des Umlaufs (Gesamtlänge U), Drehung `winkel` (Grad,
 * Außenwinkel) je Ecke — auf 360° skaliert und in (10°, 170°) gehalten; der Schlussfehler wird auf die Seiten nach ihrer Länge
 * verteilt. Liefert die Lage zur Bogenlänge s (auf den Seiten linear). Mit weniger als drei Ecken der Einheitskreis.
 */
function vieleck(ecken: { s: number; winkel: number }[], U: number): (s: number) => V2 {
  const N = ecken.length;
  if (N < 3) return (s) => [Math.cos((2 * Math.PI * s) / U), Math.sin((2 * Math.PI * s) / U)];
  const laengen = ecken.map((e, q) => ((ecken[(q + 1) % N]!.s - e.s + U) % U) || U);
  let tau = ecken.map((e) => Math.max(10, Math.min(170, Math.abs(e.winkel))));
  const summe = tau.reduce((a, b) => a + b, 0);
  tau = tau.map((x) => (x * 360) / summe);
  const P: V2[] = [[0, 0]];
  let richtung = 0;
  for (let q = 0; q < N; q++) {
    const l = laengen[q]!;
    const p = P[q]!;
    P.push([p[0] + l * Math.cos(richtung), p[1] + l * Math.sin(richtung)]);
    richtung += (tau[(q + 1) % N]! * Math.PI) / 180;
  }
  const e: V2 = [P[N]![0] - P[0]![0], P[N]![1] - P[0]![1]];
  const L = laengen.reduce((a, b) => a + b, 0);
  let acc: V2 = [0, 0];
  for (let q = 1; q <= N; q++) {
    acc = [acc[0] + (e[0] * laengen[q - 1]!) / L, acc[1] + (e[1] * laengen[q - 1]!) / L];
    P[q] = [P[q]![0] - acc[0], P[q]![1] - acc[1]];
  }
  // Umlauf gegen den Uhrzeigersinn (positive Fläche), sonst spiegeln
  let flaeche = 0;
  for (let q = 0; q < N; q++) flaeche += P[q]![0] * P[q + 1]![1] - P[q + 1]![0] * P[q]![1];
  if (flaeche < 0) for (let q = 0; q <= N; q++) P[q] = [P[q]![0], -P[q]![1]];
  const s0 = ecken[0]!.s;
  return (s: number): V2 => {
    let rest = (((s - s0) % U) + U) % U;
    for (let q = 0; q < N; q++) {
      const l = laengen[q]!;
      if (rest <= l || q === N - 1) {
        const tt = Math.max(0, Math.min(1, rest / l));
        const a = P[q]!;
        const b = P[q + 1]!;
        return [a[0] + tt * (b[0] - a[0]), a[1] + tt * (b[1] - a[1])];
      }
      rest -= l;
    }
    return P[0]!;
  };
}

/** Nächster Punkt zu p im Dreieck a b c (Ericson 2005): baryzentrische Gewichte und Abstandsquadrat. */
function naechsterImDreieck(p: V3, a: V3, b: V3, c: V3): { b: V3; d2: number } {
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  const fertig = (w: V3): { b: V3; d2: number } => {
    const q: V3 = [w[0] * a[0] + w[1] * b[0] + w[2] * c[0], w[0] * a[1] + w[1] * b[1] + w[2] * c[1], w[0] * a[2] + w[1] * b[2] + w[2] * c[2]];
    const d = sub(p, q);
    return { b: w, d2: dot(d, d) };
  };
  if (d1 <= 0 && d2 <= 0) return fertig([1, 0, 0]);
  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return fertig([0, 1, 0]);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const w = d1 / (d1 - d3);
    return fertig([1 - w, w, 0]);
  }
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return fertig([0, 0, 1]);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return fertig([1 - w, 0, w]);
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return fertig([0, 1 - w, w]);
  }
  const denom = 1 / (va + vb + vc);
  const wb = vb * denom;
  const wc = vc * denom;
  return fertig([1 - wb - wc, wb, wc]);
}

/**
 * Konforme Abflachung (LSCM, Lévy 2002) eines Dreiecksnetzes mit zwei festen Punkten: Punkt `pinA` bei (0, 0), `pinB` bei
 * (abstand, 0); Unbekannte (u_i, v_i), Energie Σ_T A_T·|∂U/∂x + i·∂U/∂y|² in den lokalen Koordinaten jedes Dreiecks (rechtshändig
 * zur Dreiecksnormale, darum bleibt die Orientierung). Gelöst mit CG auf den Normalgleichungen.
 */
function lscm(nk: number, tri: readonly number[], xyz: Float64Array, pinA: number, pinB: number, abstand: number): { u: Float64Array; v: Float64Array } {
  const N = 2 * nk;
  const eintrag = new Map<number, Map<number, number>>();
  const add = (i: number, j: number, x: number) => {
    const zeile = eintrag.get(i) ?? eintrag.set(i, new Map()).get(i)!;
    zeile.set(j, (zeile.get(j) ?? 0) + x);
  };
  const P = (i: number): V3 => [xyz[3 * i]!, xyz[3 * i + 1]!, xyz[3 * i + 2]!];
  for (let t = 0; t + 2 < tri.length; t += 3) {
    const idx = [tri[t]!, tri[t + 1]!, tri[t + 2]!];
    const p1 = P(idx[0]!);
    const p2 = P(idx[1]!);
    const p3 = P(idx[2]!);
    const e1 = sub(p2, p1);
    const l1 = norm(e1);
    if (l1 < 1e-18) continue;
    const ex: V3 = [e1[0] / l1, e1[1] / l1, e1[2] / l1];
    const nn = cross(e1, sub(p3, p1));
    const ln = norm(nn);
    if (ln < 1e-24) continue;
    const nz: V3 = [nn[0] / ln, nn[1] / ln, nn[2] / ln];
    const ey = cross(nz, ex);
    const d3 = sub(p3, p1);
    const x = [0, l1, dot(d3, ex)];
    const y = [0, 0, dot(d3, ey)];
    const A = 0.5 * ln;
    const a = [0, 0, 0];
    const b = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const k1 = (k + 1) % 3;
      const k2 = (k + 2) % 3;
      a[k] = (y[k1]! - y[k2]!) / (2 * A);
      b[k] = (x[k2]! - x[k1]!) / (2 * A);
    }
    // Zeile 1: Σ (a_k u_k − b_k v_k), Zeile 2: Σ (b_k u_k + a_k v_k); Unbekannte [u_k, v_k] = [2·idx, 2·idx + 1]
    const spalten = [2 * idx[0]!, 2 * idx[0]! + 1, 2 * idx[1]!, 2 * idx[1]! + 1, 2 * idx[2]!, 2 * idx[2]! + 1];
    const z1 = [a[0]!, -b[0]!, a[1]!, -b[1]!, a[2]!, -b[2]!];
    const z2 = [b[0]!, a[0]!, b[1]!, a[1]!, b[2]!, a[2]!];
    for (const zeile of [z1, z2]) for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) add(spalten[i]!, spalten[j]!, A * zeile[i]! * zeile[j]!);
  }
  const start = new Int32Array(N + 1);
  const diag = new Float64Array(N);
  const spalteL: number[] = [];
  const wertL: number[] = [];
  for (let i = 0; i < N; i++) {
    const zeile = eintrag.get(i);
    if (zeile) for (const [j, x] of zeile) {
      if (j === i) diag[i] = x;
      else {
        spalteL.push(j);
        wertL.push(x);
      }
    }
    start[i + 1] = spalteL.length;
  }
  const A: DuennSym = { n: N, start, spalte: Int32Array.from(spalteL), wert: Float64Array.from(wertL), diag };
  const fest = new Uint8Array(N);
  const werte = new Float64Array(N);
  fest[2 * pinA] = 1;
  fest[2 * pinA + 1] = 1;
  fest[2 * pinB] = 1;
  fest[2 * pinB + 1] = 1;
  werte[2 * pinB] = abstand;
  const x = cgDirichlet(A, fest, werte, undefined, 1e-10, 100000).x;
  const u = new Float64Array(nk);
  const v = new Float64Array(nk);
  for (let i = 0; i < nk; i++) {
    u[i] = x[2 * i]!;
    v[i] = x[2 * i + 1]!;
  }
  return { u, v };
}

/** Tutte mit gleichen Gewichten auf einem Graphen (Kanten als Paare), feste Punkte mit Werten; liefert je Koordinate */
function tutteGraph(n: number, kantenPaare: readonly [number, number][], fest: Uint8Array, werte: Float64Array[]): Float64Array[] {
  const nb: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of kantenPaare) {
    nb[a]!.push(b);
    nb[b]!.push(a);
  }
  const start = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) start[i + 1] = start[i]! + nb[i]!.length;
  const spalte = new Int32Array(start[n]!);
  const wert = new Float64Array(start[n]!);
  const diag = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    nb[i]!.forEach((j, q) => {
      spalte[start[i]! + q] = j;
      wert[start[i]! + q] = -1;
    });
    diag[i] = Math.max(1, nb[i]!.length);
  }
  const A: DuennSym = { n, start, spalte, wert, diag };
  return werte.map((w) => cgDirichlet(A, fest, w, undefined, 1e-12, 50000).x);
}

/**
 * Stücknetz: Topologie und Startlagen des Einsatzes für einen Prüffall. Liefert eine `EinsatzTopologie`, die Lippe (A6),
 * Löser (A7) und Messung des Kernrings unverändert annehmen.
 */
export function stuecknetzTopologie(f: EinsatzFall, opt: StuecknetzOptionen = {}): StuecknetzBau {
  const k = f.v.kaefig;
  const feld = f.feld;
  const netz = f.netz;
  const schnitt = f.schnitt;
  const karte = f.karte;
  const h = opt.h ?? f.h1;
  const t0 = jetzt();
  const fund = stueckeFinden(k, feld, netz, f.pfad, schnitt, karte, f.h1, f.linie, { eckeGrad: opt.eckeGrad ?? Infinity });
  const msStuecke = jetzt() - t0;
  const nBasis = fund.nBasis;
  const orig = (i: number) => (i >= nBasis ? i : (schnitt.doppel.get(i) ?? i));
  const P3 = (i: number): V3 => {
    if (i >= nBasis) return fund.zusatz[i - nBasis]!.xyz;
    const o = orig(i);
    return [netz.punkte[3 * o]!, netz.punkte[3 * o + 1]!, netz.punkte[3 * o + 2]!];
  };
  const feldRand = new Set(feld.rand);
  const istKaefigRand = (p: number) => p < nBasis && orig(p) < k.n && feldRand.has(orig(p));
  // Feldrand-Polylinie (fein) mit Lage je Punkt, für Ecken an Schnittenden
  const aussen = karte.rand.aussen.map((l) => karte.punkte[l]!);
  const aussenPos = new Map<number, number>();
  aussen.forEach((p, i) => aussenPos.set(p, i));
  const eckenSchluessel = (p: number, davor: Seite | null, danach: Seite): string => {
    if (istKaefigRand(p)) return `alt:${orig(p)}`;
    if (p >= nBasis) {
      // Schnittende auf dem Feldrand: die Ecke ist der Käfigpunkt vor dem Schnittende (die Kantenzahl der Seite davor zählt bis zu ihm)
      const z = fund.zusatz[p - nBasis]!;
      const aufFeldrand = (davor && davor.arten[davor.arten.length - 1] === 'feldrand') || danach.arten[0] === 'feldrand';
      if (aufFeldrand) {
        if (davor && davor.arten[davor.arten.length - 1] === 'feldrand') {
          const cage = davor.punkte.filter(istKaefigRand);
          if (cage.length) return `alt:${orig(cage[cage.length - 1]!)}`;
        }
        // Seite danach beginnt am Schnittende: Käfigpunkt auf der anderen Seite des geschnittenen Feldrandstücks
        const [q, r] = z.kante;
        const weiter = danach.punkte[1];
        const weg = weiter === r ? q : weiter === q ? r : q;
        if (istKaefigRand(weg)) return `alt:${orig(weg)}`;
        const i = aussenPos.get(weg);
        if (i !== undefined) {
          const andere = weiter === r ? r : q;
          for (const d of [-1, 1]) {
            const n2 = aussen[i + d];
            if (n2 !== undefined && n2 !== andere && istKaefigRand(n2)) return `alt:${orig(n2)}`;
          }
        }
      }
    }
    return `P:${orig(p)}`;
  };
  const t1 = jetzt();
  const { kanten, polygone } = seitenRegister(fund, orig, eckenSchluessel, istKaefigRand);
  const xyzAlt = (id: number): V3 => [k.xyz[3 * id]!, k.xyz[3 * id + 1]!, k.xyz[3 * id + 2]!];
  // ---- Lippe: Kette der Lippenseiten von der Naht zum Mundwinkel und ihre Abschnitte auf der gezeichneten Linie ----
  const keyLage = (key: string): V3 => (key.startsWith('alt:') ? xyzAlt(Number(key.slice(4))) : P3(Number(key.slice(2))));
  const ziel = f.lippenZiel();
  const zs = [0];
  for (let i = 1; i < ziel.length; i++) zs.push(zs[i - 1]! + norm(sub(ziel[i]!, ziel[i - 1]!)));
  const zL = zs[zs.length - 1]!;
  const zielBei = (a: number): V3 => {
    const s = Math.max(0, Math.min(zL, a * zL));
    let i = 1;
    while (i < zs.length - 1 && zs[i]! < s) i++;
    const l = zs[i]! - zs[i - 1]!;
    const tt = l > 1e-15 ? (s - zs[i - 1]!) / l : 0;
    const p = ziel[i - 1]!;
    const q = ziel[i]!;
    return [p[0] + tt * (q[0] - p[0]), p[1] + tt * (q[1] - p[1]), p[2] + tt * (q[2] - p[2])];
  };
  const zielAnteil = (p: V3): number => {
    let best = Infinity;
    let bs = 0;
    for (let i = 1; i < ziel.length; i++) {
      const a = ziel[i - 1]!;
      const d = sub(ziel[i]!, a);
      const l2 = dot(d, d);
      const tt = l2 > 1e-30 ? Math.max(0, Math.min(1, dot(sub(p, a), d) / l2)) : 0;
      const q: V3 = [a[0] + tt * d[0], a[1] + tt * d[1], a[2] + tt * d[2]];
      const e = sub(p, q);
      const d2 = dot(e, e);
      if (d2 < best) {
        best = d2;
        bs = zs[i - 1]! + tt * (zs[i]! - zs[i - 1]!);
      }
    }
    return bs / zL;
  };
  const lippeKetten: { ka: Kante; vorwaerts: boolean; sA: number; sB: number; n: number }[] = [];
  {
    const lippenSeitenK = [...kanten.values()].filter((ka) => ka.arten.every((a) => a === 'lippe'));
    const cKey = `P:${f.pfad[f.pfad.length - 1]!}`;
    let key = lippenSeitenK.flatMap((ka) => [ka.anfang, ka.ende]).find((kk) => kk !== cKey && Math.abs(keyLage(kk)[2]) < 1e-7) ?? '';
    const benutzt = new Set<string>();
    let sA = 0;
    for (let schritt = 0; schritt < lippenSeitenK.length && key; schritt++) {
      const ka = lippenSeitenK.find((x) => !benutzt.has(x.id) && (x.anfang === key || x.ende === key));
      if (!ka) break;
      benutzt.add(ka.id);
      const vorwaerts = ka.anfang === key;
      key = vorwaerts ? ka.ende : ka.anfang;
      const sB = key === cKey ? 1 : zielAnteil(keyLage(key));
      lippeKetten.push({ ka, vorwaerts, sA, sB, n: 0 });
      sA = sB;
    }
  }
  // Untergrenze der Kantenzahl je Lippenseite aus der Dichte der Lippe: Stationen höchstens h und höchstens √(6ε/κ)
  // auseinander, ε = Haut-Tor (das Kontrollpolygon der Falte liegt ≈ h²κ/6 neben der Linie; gemessen 04.11.: bei gleichen
  // Bogenlängen am J-Haken der Robbe 1,2 px, die Reihen daneben 0,4 px hoch → umgeklappt; der krümmungsgewichtete Parameter
  // mit γ = 4 verdoppelte dagegen m, weil er schon die Körperkrümmung dreifach gewichtet)
  // Örtliche Merkmalsgröße der Lippe (Regel der Netzgeneratoren: Zellgröße ≤ Abstand zur nächsten anderen Linie): je
  // Stützstelle der Linie der Abstand zu den Punkten aller anderen Linien des Felds (Naht, Feldrand, Falten, Verlängerung),
  // begrenzt auf h … h/4 (Auflösungsboden). Gemessen 04.11.: am Keil zwischen Linie und Kopfnaht der Robbe (0,5–2 px breit)
  // reichen Stationen im Abstand h nicht — gleichmäßig 0,5 h auch nicht, dicht am Anfang und Haken schon.
  // Eine Linie, die an einem Endpunkt V an die Lippe stößt (Naht am Linienanfang, Verlängerung am Mundwinkel, Falten an
  // Knoten), zählt nur, wo sie mit der Lippe einen Keil bildet: d < 0,7·|p − V| (innerhalb 45° von V aus gesehen) — eine
  // Linie, die gerade weiterläuft oder quer kreuzt, ist keine Engstelle (Ruppert: anliegende Merkmale zählen nicht; der Keil
  // ist der Sonderfall des kleinen Winkels).
  const hLippe = new Float64Array(ziel.length).fill(h);
  {
    const lippenEnden = new Set(lippeKetten.flatMap((kt) => [kt.ka.anfang, kt.ka.ende]));
    const andere: { q: V3; v: V3 | null }[] = [];
    for (const ka of kanten.values()) {
      if (ka.arten.every((a) => a === 'lippe')) continue;
      const stoss = [ka.anfang, ka.ende].filter((key) => lippenEnden.has(key));
      const v = stoss.length ? keyLage(stoss[0]!) : null;
      for (const p of ka.punkte) andere.push({ q: P3(p), v });
    }
    const boden = h / 4;
    ziel.forEach((p, i) => {
      let best = Infinity;
      for (const { q, v } of andere) {
        const dx = p[0] - q[0];
        const dy = p[1] - q[1];
        const dz = p[2] - q[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= best) continue;
        if (v) {
          const vx = p[0] - v[0];
          const vy = p[1] - v[1];
          const vz = p[2] - v[2];
          if (d2 >= 0.49 * (vx * vx + vy * vy + vz * vz)) continue;
        }
        best = d2;
      }
      hLippe[i] = Math.max(boden, Math.min(h, Math.sqrt(best)));
    });
  }
  const dichte = lippenDichte(ziel, hLippe, EPS_LIPPE);
  const mindestJeKante = new Map<string, number>();
  for (const kt of lippeKetten) mindestJeKante.set(kt.ka.id, dichte.anzahl(kt.sA, kt.sB));
  const anz = anzahlenWaehlen(kanten, polygone, h, opt.mindest ?? 1, 60, mindestJeKante);
  for (const kt of lippeKetten) kt.n = anz.anzahl.get(kt.ka.id)!;
  const ohneMuster = anz.offen.filter((o) => !musterWahl(o.seiten, 0, 1));
  if (ohneMuster.length)
    throw new Error(
      `Stücknetz: kein Muster für ${ohneMuster
        .map((o) => {
          const p = polygone.find((q) => q.id === o.polygon)!;
          const seiten = p.seiten.map((b) => b.teile.map((x) => { const ka = kanten.get(x.kante)!; return `${[...new Set(ka.arten)].join('+')} ${anz.anzahl.get(x.kante)}${ka.feldPunkte ? ' fest' : mindestJeKante.has(x.kante) ? ` ≥ ${mindestJeKante.get(x.kante)}` : ''}`; }).join(' + '));
          return `${o.polygon} (${o.seiten.join('/')}: ${seiten.join(' | ')})`;
        })
        .join(', ')}`,
    );
  const muster = musterBauen(kanten, polygone, anz.anzahl);
  const msZahlen = jetzt() - t1;
  // ---- Lagen der Punkte ----
  const t2 = jetzt();
  const lage = new Map<string, V3>();
  // Randpunkte der kanonischen Seiten nach Bogenlänge (Feldrand: alte Käfigpunkte über die Schlüssel)
  const bogen = (punkte: readonly number[]): number[] => {
    const s = [0];
    for (let i = 1; i < punkte.length; i++) s.push(s[i - 1]! + norm(sub(P3(punkte[i]!), P3(punkte[i - 1]!))));
    return s;
  };
  const aufZug = (punkte: readonly number[], s: readonly number[], ziel: number): V3 => {
    const L = s[s.length - 1]!;
    const z = Math.max(0, Math.min(L, ziel));
    let i = 1;
    while (i < s.length - 1 && s[i]! < z) i++;
    const a = P3(punkte[i - 1]!);
    const b = P3(punkte[i]!);
    const l = s[i]! - s[i - 1]!;
    const tt = l > 1e-15 ? (z - s[i - 1]!) / l : 0;
    return [a[0] + tt * (b[0] - a[0]), a[1] + tt * (b[1] - a[1]), a[2] + tt * (b[2] - a[2])];
  };
  const seitenBogen = new Map<string, number[]>();
  for (const ka of kanten.values()) {
    const s = bogen(ka.punkte);
    seitenBogen.set(ka.id, s);
    const n = anz.anzahl.get(ka.id)!;
    for (let i = 0; i <= n; i++) {
      const key = seitenSchluessel(ka, n, i);
      if (lage.has(key)) continue;
      if (key.startsWith('alt:')) lage.set(key, xyzAlt(Number(key.slice(4))));
      else if (key.startsWith('P:')) lage.set(key, P3(i === 0 ? ka.punkte[0]! : ka.punkte[ka.punkte.length - 1]!));
      else lage.set(key, aufZug(ka.punkte, s, (s[s.length - 1]! * i) / n));
    }
  }
  // Ecken, die als Schlüssel über eine Seite kommen, deren Punkt aber auf einer anderen Seite liegt: alle Eckenschlüssel setzen
  for (const ka of kanten.values()) {
    for (const [key, p] of [[ka.anfang, ka.punkte[0]!], [ka.ende, ka.punkte[ka.punkte.length - 1]!]] as [string, number][]) {
      if (lage.has(key)) continue;
      if (key.startsWith('alt:')) lage.set(key, xyzAlt(Number(key.slice(4))));
      else lage.set(key, P3(p));
    }
  }
  // ---- Lippe anpassen (A6) vor der Lage der inneren Punkte: die Reihen hängen am Kontrollpolygon der Falte, nicht an den
  // Abtastpunkten der Linie (gemessen 04.11.: die Kontrollpunkte liegen am J-Haken bis 1,3 px neben der Linie, am Mundwinkel
  // 2,8 px; im 0,4 px hohen Keil der Robbe kreuzten sie die erste Reihe, der Löser klappte zwei Zellen um) ----
  const lippeKeys: string[] = [];
  for (const { ka, vorwaerts, n } of lippeKetten)
    for (let i = 0; i <= n; i++) {
      const kk = seitenSchluessel(ka, n, vorwaerts ? i : n - i);
      if (!lippeKeys.length || lippeKeys[lippeKeys.length - 1] !== kk) lippeKeys.push(kk);
    }
  const m = lippeKeys.length - 1;
  if (m < 2) throw new Error(`Stücknetz: Lippe mit ${m} Spannen`);
  // Lippenstellen auf der gezeichneten Linie, je Lippenseite zwischen ihren Knoten gleichmäßig in der Dichte — nicht nach
  // gleichen Bogenlängen des feinen Schlitz-Zickzacks (gemessen 04.11.: am J-Haken der Robbe drehte die Linie 58° je Station,
  // das Kontrollpolygon der Falte lag 1,2 px neben ihr, die Abtastpunkte 0,7 px)
  const lippenAnteile = new Float64Array(m + 1);
  {
    let q = 0;
    for (const { n, sA, sB } of lippeKetten) {
      const stellen = dichte.stellen(n, sA, sB);
      for (let i = 1; i <= n; i++) {
        lippenAnteile[q + i] = stellen[i]!;
        if (i < n) lage.set(lippeKeys[q + i]!, zielBei(stellen[i]!));
      }
      q += n;
    }
  }
  // Spitze von A0 am Linienanfang → Lippe mit Ecke
  let lippenAnfang: LippenAnfang = 'naht';
  let anfangSchaerfe = 0;
  for (let v = 0; v < k.n; v++) {
    const sv = k.vSchaerfe[v]!;
    if (sv > 0 && norm(sub(xyzAlt(v), f.linie[0]!)) < 0.5 * h) {
      lippenAnfang = 'ecke';
      anfangSchaerfe = Math.max(anfangSchaerfe, sv);
    }
  }
  // Lippenstellen mit Ecke: Knoten der Lippe, an denen eine Falte (mit Schärfe) endet
  const fg = faltenGraph(k, feld, netz);
  const faltenSchaerfe = (ka: Kante): number => {
    let s = 0;
    for (let i = 0; i + 1 < ka.punkte.length; i++) s = Math.max(s, fg.schaerfe.get(schl(orig(ka.punkte[i]!), orig(ka.punkte[i + 1]!))) ?? 0);
    return s;
  };
  const lippenEcken: number[] = [];
  for (const ka of kanten.values()) {
    if (!ka.arten.every((a) => a === 'falte') || !(faltenSchaerfe(ka) > 0)) continue;
    for (const kk of [ka.anfang, ka.ende]) {
      const q = lippeKeys.indexOf(kk);
      if (q > 0 && q < m && !lippenEcken.includes(q)) lippenEcken.push(q);
    }
  }
  lippenEcken.sort((a, b) => a - b);
  const lippe = lippeAnpassen(ziel, m, lippenAnteile, { ende: 'falte', anfang: lippenAnfang, ecken: lippenEcken });
  const lippeKeySet = new Set(lippeKeys);
  lippeKeys.forEach((kk, q) => lage.set(kk, [lippe.punkte[q]![0], lippe.punkte[q]![1], q === 0 ? 0 : lippe.punkte[q]![2]]));
  // Innere Punkte: Tutte je Stück in der Ebene, dann zurück auf die Haut
  const T = fund.dreiecke;
  let umgeklappt = 0;
  const flaechenJeStueck: number[] = fund.stuecke.map(() => 0);
  muster.stueckVon.forEach((s) => flaechenJeStueck[s]!++);
  const ebenen: ('konform' | 'vieleck')[] = [];
  const konformFalten: number[] = [];
  const konformDraussen: number[] = [];
  const ebenenDaten: StueckEbene[] | undefined = opt.diagnose ? [] : undefined;
  for (let sI = 0; sI < fund.stuecke.length; sI++) {
    const st = fund.stuecke[sI]!;
    // Umlauf nach Bogenlänge; Seiten des Stücks → Bogenanteil ihrer Musterpunkte
    const z = st.punkte;
    const n = z.length;
    const sU = [0];
    for (let i = 1; i <= n; i++) sU.push(sU[i - 1]! + norm(sub(P3(z[i % n]!), P3(z[i - 1]!))));
    const U = sU[n]!;
    // feine Dreiecke des Stücks → kompakte Nummern
    const ids = new Map<number, number>();
    const punkte: number[] = [];
    const tri: number[] = [];
    for (const tI of st.dreiecke)
      for (let q = 0; q < 3; q++) {
        const p = T[3 * tI + q]!;
        let c = ids.get(p);
        if (c === undefined) {
          c = punkte.length;
          ids.set(p, c);
          punkte.push(p);
        }
        tri.push(c);
      }
    const nk = punkte.length;
    const xyz = new Float64Array(3 * nk);
    punkte.forEach((p, c) => {
      const q = P3(p);
      xyz[3 * c] = q[0];
      xyz[3 * c + 1] = q[1];
      xyz[3 * c + 2] = q[2];
    });
    /** nächster Punkt auf den feinen Dreiecken des Stücks → Lage in der Ebene (baryzentrisch) */
    const projektion = (p: V3, u: Float64Array, v: Float64Array): V2 => {
      let best = Infinity;
      let bu = 0;
      let bv = 0;
      for (let tI = 0; tI + 2 < tri.length; tI += 3) {
        const ia = tri[tI]!;
        const ib = tri[tI + 1]!;
        const ic = tri[tI + 2]!;
        const w = naechsterImDreieck(p, [xyz[3 * ia]!, xyz[3 * ia + 1]!, xyz[3 * ia + 2]!], [xyz[3 * ib]!, xyz[3 * ib + 1]!, xyz[3 * ib + 2]!], [xyz[3 * ic]!, xyz[3 * ic + 1]!, xyz[3 * ic + 2]!]);
        if (w.d2 < best) {
          best = w.d2;
          bu = w.b[0] * u[ia]! + w.b[1] * u[ib]! + w.b[2] * u[ic]!;
          bv = w.b[0] * v[ia]! + w.b[1] * v[ib]! + w.b[2] * v[ic]!;
        }
      }
      return [bu, bv];
    };
    // Mustergraph des Stücks: Punkte (Schlüssel), Kanten
    const keys = new Map<string, number>();
    const keyListe: string[] = [];
    const paare: [number, number][] = [];
    const kid = (key: string) => {
      let c = keys.get(key);
      if (c === undefined) {
        c = keyListe.length;
        keys.set(key, c);
        keyListe.push(key);
      }
      return c;
    };
    const stFlaechen: string[][] = [];
    muster.flaechen.forEach((fl, q) => {
      if (muster.stueckVon[q] !== sI) return;
      stFlaechen.push(fl);
      const c = fl.map(kid);
      for (let i = 0; i < 4; i++) paare.push([c[i]!, c[(i + 1) % 4]!]);
    });
    const nm = keyListe.length;
    // Randpunkte des Musters: Bogenlänge auf dem Umlauf (die Seiten beginnen an der ersten Ecke, die Bogenlänge bei z[0])
    const randBogen = new Map<number, number>();
    const randLippe = new Map<number, V3>();
    {
      let sStart = sU[st.ecken[0] ?? 0]!;
      const polygon = polygone[sI]!;
      polygon.seiten.forEach((bz) => {
        for (const teil of bz.teile) {
          const ka = kanten.get(teil.kante)!;
          const nA = anz.anzahl.get(teil.kante)!;
          const sK = seitenBogen.get(ka.id)!;
          const LK = sK[sK.length - 1]!;
          for (let i = 0; i <= nA; i++) {
            const key = seitenSchluessel(ka, nA, teil.vorwaerts ? i : nA - i);
            const c = keys.get(key);
            if (c === undefined) continue;
            // Bogenanteil auf dem Teil in Umlaufrichtung: Feldrand nach den Käfigpunkten, sonst i/n
            let anteil = i / nA;
            if (ka.feldPunkte) {
              const idx = teil.vorwaerts ? i : nA - i;
              const pp = idx === 0 ? ka.punkte[0]! : idx === nA ? ka.punkte[ka.punkte.length - 1]! : ka.feldPunkte[idx - 1]!;
              const j = ka.punkte.indexOf(pp);
              const sj = j >= 0 ? sK[j]! / LK : idx / nA;
              anteil = teil.vorwaerts ? sj : 1 - sj;
            }
            if (lippeKeySet.has(key)) randLippe.set(c, lage.get(key)!);
            else randBogen.set(c, sStart + anteil * ka.laenge);
          }
          sStart += ka.laenge;
        }
      });
    }
    // Lage des Musters in einer Ebene (u, v der feinen Punkte): Randpunkte nach Bogenlänge auf dem Umlauf, innere Punkte Tutte;
    // liefert die Lagen und die Zahl der umgeklappten Zellen in der Ebene
    const musterLage = (u: Float64Array, v: Float64Array): { gu: Float64Array; gv: Float64Array; falten: number; draussen: number } => {
      const randLage = (s: number): V2 => {
        const ss = ((s % U) + U) % U;
        let i = 1;
        while (i < n && sU[i]! < ss) i++;
        const a0 = ids.get(z[i - 1]!)!;
        const b0 = ids.get(z[i % n]!)!;
        const l = sU[i]! - sU[i - 1]!;
        const tt = l > 1e-15 ? (ss - sU[i - 1]!) / l : 0;
        return [u[a0]! + tt * (u[b0]! - u[a0]!), v[a0]! + tt * (v[b0]! - v[a0]!)];
      };
      const festM = new Uint8Array(nm);
      const mu = new Float64Array(nm);
      const mv = new Float64Array(nm);
      for (const [c, s] of randBogen) {
        const [x, y] = randLage(s);
        festM[c] = 1;
        mu[c] = x;
        mv[c] = y;
      }
      // Lippenstellen: der Kontrollpunkt der Falte, auf das Stück projiziert (nächster Punkt seiner feinen Dreiecke)
      for (const [c, p] of randLippe) {
        const [x, y] = projektion(p, u, v);
        festM[c] = 1;
        mu[c] = x;
        mv[c] = y;
      }
      const [gu, gv] = tutteGraph(nm, paare, festM, [mu, mv]) as [Float64Array, Float64Array];
      let falten = 0;
      for (const fl of stFlaechen) {
        const c = fl.map((key) => keys.get(key)!);
        let s = 0;
        for (let i = 0; i < 4; i++) s += gu[c[i]!]! * gv[c[(i + 1) % 4]!]! - gu[c[(i + 1) % 4]!]! * gv[c[i]!]!;
        if (s <= 0) falten++;
      }
      // innere Musterpunkte außerhalb der Fläche (kein feines Dreieck enthält sie)? Zählt wie eine Falte
      let draussen = 0;
      for (let c = 0; c < nm; c++) {
        if (festM[c]) continue;
        let drin = false;
        for (let tI = 0; tI < tri.length / 3 && !drin; tI++) {
          const a0 = tri[3 * tI]!;
          const b0 = tri[3 * tI + 1]!;
          const c0 = tri[3 * tI + 2]!;
          const det = (u[b0]! - u[a0]!) * (v[c0]! - v[a0]!) - (u[c0]! - u[a0]!) * (v[b0]! - v[a0]!);
          if (Math.abs(det) < 1e-18) continue;
          const l1 = ((u[b0]! - gu[c]!) * (v[c0]! - gv[c]!) - (u[c0]! - gu[c]!) * (v[b0]! - gv[c]!)) / det;
          const l2 = ((u[c0]! - gu[c]!) * (v[a0]! - gv[c]!) - (u[a0]! - gu[c]!) * (v[c0]! - gv[c]!)) / det;
          if (l1 >= -1e-9 && l2 >= -1e-9 && 1 - l1 - l2 >= -1e-9) drin = true;
        }
        if (!drin) draussen++;
      }
      return { gu, gv, falten, draussen };
    };
    // 1. formtreu: konforme Abflachung der feinen Dreiecke (LSCM, zwei Punkte fest) — Winkel bleiben, ein schmaler Keil bleibt
    //    schmal, eine gebogene Lippe bleibt gebogen; der Rand ist frei, nicht unbedingt konvex
    const e0 = ids.get(z[st.ecken[0] ?? 0]!)!;
    let eFern = e0;
    let dFern = -1;
    for (const p of z) {
      const c = ids.get(p)!;
      const d = norm(sub(P3(p), P3(z[st.ecken[0] ?? 0]!)));
      if (d > dFern) {
        dFern = d;
        eFern = c;
      }
    }
    let ebene: { u: Float64Array; v: Float64Array } = lscm(nk, tri, xyz, e0, eFern, dFern);
    const festRand = () => {
      const fm = new Uint8Array(nm);
      for (const c of randBogen.keys()) fm[c] = 1;
      for (const c of randLippe.keys()) fm[c] = 1;
      return fm;
    };
    // Umlauf in der Ebene gegen den Uhrzeigersinn? (Orientierung der Dreiecke, sonst spiegeln)
    {
      let s = 0;
      for (let i = 0; i < n; i++) {
        const a0 = ids.get(z[i]!)!;
        const b0 = ids.get(z[(i + 1) % n]!)!;
        s += ebene.u[a0]! * ebene.v[b0]! - ebene.u[b0]! * ebene.v[a0]!;
      }
      if (s < 0) ebene = { u: ebene.u, v: Float64Array.from(ebene.v, (x) => -x) };
    }
    const konformEbene = ebene;
    let lageM = musterLage(ebene.u, ebene.v);
    let art: 'konform' | 'vieleck' = 'konform';
    konformFalten.push(lageM.falten);
    konformDraussen.push(lageM.draussen);
    if (lageM.falten > 0 || lageM.draussen > 0) {
      // 2. Rückfall: Tutte auf ein konvexes Vieleck mit den Eckwinkeln des Stücks (immer faltenfrei im Vieleck)
      const kreis = vieleck(st.ecken.map((e, q) => ({ s: sU[e]!, winkel: st.winkel[q]! })), U);
      const fest = new Uint8Array(nk);
      const wu = new Float64Array(nk);
      const wv = new Float64Array(nk);
      z.forEach((p, i) => {
        const c = ids.get(p)!;
        fest[c] = 1;
        const [x, y] = kreis(sU[i]!);
        wu[c] = x;
        wv[c] = y;
      });
      const L = laplace(nk, tri, xyz, 'positiv');
      ebene = { u: cgDirichlet(L, fest, wu, undefined, 1e-12, 50000).x, v: cgDirichlet(L, fest, wv, undefined, 1e-12, 50000).x };
      lageM = musterLage(ebene.u, ebene.v);
      art = 'vieleck';
    }
    ebenen.push(art);
    umgeklappt += lageM.falten;
    if (ebenenDaten) ebenenDaten.push({ stueck: sI, art, konform: konformEbene, benutzt: { u: ebene.u, v: ebene.v }, tri: [...tri], rand: z.map((p) => ids.get(p)!), muster: { keys: keyListe, gu: lageM.gu, gv: lageM.gv, fest: festRand(), flaechen: stFlaechen } });
    const { u, v, } = ebene;
    const { gu, gv } = lageM;
    const festM = new Uint8Array(nm);
    for (const c of randBogen.keys()) festM[c] = 1;
    // zurück auf die Haut: Dreieck in der Ebene finden
    const nT = tri.length / 3;
    const bary = (x: number, y: number, tI: number): V3 | null => {
      const a0 = tri[3 * tI]!;
      const b0 = tri[3 * tI + 1]!;
      const c0 = tri[3 * tI + 2]!;
      const det = (u[b0]! - u[a0]!) * (v[c0]! - v[a0]!) - (u[c0]! - u[a0]!) * (v[b0]! - v[a0]!);
      if (Math.abs(det) < 1e-18) return null;
      const l1 = ((u[b0]! - x) * (v[c0]! - y) - (u[c0]! - x) * (v[b0]! - y)) / det;
      const l2 = ((u[c0]! - x) * (v[a0]! - y) - (u[a0]! - x) * (v[c0]! - y)) / det;
      return [l1, l2, 1 - l1 - l2];
    };
    for (let c = 0; c < nm; c++) {
      if (festM[c]) continue;
      const key = keyListe[c]!;
      if (lage.has(key)) continue;
      const x = gu[c]!;
      const y = gv[c]!;
      let best: { tI: number; b: V3; fehl: number } | null = null;
      for (let tI = 0; tI < nT; tI++) {
        const bb = bary(x, y, tI);
        if (!bb) continue;
        const fehl = Math.max(0, -bb[0], -bb[1], -bb[2]);
        if (!best || fehl < best.fehl) best = { tI, b: bb, fehl };
        if (fehl === 0) break;
      }
      if (!best) throw new Error(`Stücknetz: Punkt ${key} ohne Dreieck`);
      const pa = P3(punkte[tri[3 * best.tI]!]!);
      const pb = P3(punkte[tri[3 * best.tI + 1]!]!);
      const pc = P3(punkte[tri[3 * best.tI + 2]!]!);
      const w = best.b;
      lage.set(key, [w[0] * pa[0] + w[1] * pb[0] + w[2] * pc[0], w[0] * pa[1] + w[1] * pb[1] + w[2] * pc[1], w[0] * pa[2] + w[1] * pb[2] + w[2] * pc[2]]);
    }
  }
  const msLage = jetzt() - t2;
  // ---- Käfig zusammenbauen: alte Flächen außerhalb von M, Musterflächen rechts, gespiegelt links ----
  const t3 = jetzt();
  const nAlt = k.n;
  const spK1 = spiegelIndex(k.xyz, k.n);
  const idVon = new Map<string, number>();
  const lagen: number[] = Array.from(k.xyz);
  const neuIst: string[] = [];
  const istNaht = (p: V3) => Math.abs(p[2]) < 1e-7;
  const nahtKeys = new Set<string>();
  for (const ka of kanten.values()) {
    const nahtSeite = ka.arten.every((a) => a === 'naht');
    const n = anz.anzahl.get(ka.id)!;
    for (let i = 0; i <= n; i++) {
      const key = seitenSchluessel(ka, n, i);
      if (nahtSeite || (i === 0 && istNaht(lage.get(key)!)) || (i === n && istNaht(lage.get(key)!))) nahtKeys.add(key);
    }
  }
  const id = (key: string): number => {
    const alt = idVon.get(key);
    if (alt !== undefined) return alt;
    if (key.startsWith('alt:')) {
      const v = Number(key.slice(4));
      idVon.set(key, v);
      return v;
    }
    const p = lage.get(key);
    if (!p) throw new Error(`Stücknetz: Lage für ${key} fehlt`);
    const v = lagen.length / 3;
    const naht = nahtKeys.has(key) || istNaht(p);
    lagen.push(p[0], p[1], naht ? 0 : p[2]);
    idVon.set(key, v);
    neuIst.push(key);
    return v;
  };
  const rechts: number[][] = muster.flaechen.map((fl) => fl.map(id));
  // Spiegel: neue Punkte außerhalb der Naht bekommen ein Gegenstück
  const sp = new Map<number, number>();
  const nRechts = lagen.length / 3;
  for (let v = nAlt; v < nRechts; v++) {
    if (Math.abs(lagen[3 * v + 2]!) < 1e-12) sp.set(v, v);
    else {
      const w = lagen.length / 3;
      lagen.push(lagen[3 * v]!, lagen[3 * v + 1]!, -lagen[3 * v + 2]!);
      sp.set(v, w);
      sp.set(w, v);
    }
  }
  const spiegelVon = (v: number) => (v < nAlt ? spK1[v]! : sp.get(v)!);
  const links: number[][] = rechts.map((fl) => fl.map(spiegelVon).reverse());
  // Umlauf prüfen: eine alte Feldrandkante a → b in einer alten Fläche muss in genau einer rechten/linken Fläche als b → a liegen
  const inM = new Uint8Array(k.nF);
  for (const fl of feld.feld) inM[fl] = 1;
  const alt: number[][] = [];
  const alteFlaeche: number[] = [];
  for (let fl = 0; fl < k.nF; fl++) {
    if (inM[fl]) continue;
    alt.push(Array.from(k.fVerts.subarray(k.fStart[fl]!, k.fStart[fl + 1]!)));
    alteFlaeche.push(fl);
  }
  {
    const gerichtet = new Set<string>();
    for (const fl of alt) for (let i = 0; i < fl.length; i++) gerichtet.add(`${fl[i]}>${fl[(i + 1) % fl.length]}`);
    let gleich = 0;
    let gegen = 0;
    for (const fl of [...rechts, ...links])
      for (let i = 0; i < 4; i++) {
        const a = fl[i]!;
        const b = fl[(i + 1) % 4]!;
        if (gerichtet.has(`${b}>${a}`)) gegen++;
        else if (gerichtet.has(`${a}>${b}`)) gleich++;
      }
    if (gleich > gegen) {
      for (const fl of rechts) fl.reverse();
      for (const fl of links) fl.reverse();
    }
  }
  const xyz = Float64Array.from(lagen);
  const kaefig = kaefigAusFlaechen(xyz, [...alt, ...rechts, ...links]);
  // Schärfen von K1 (Kanten über ihre Punkte, Punktschärfen), Lippe unendlich scharf, Falten mit ihrer Schärfe
  let verloreneFalten = 0;
  for (let e = 0; e < k.nE; e++) {
    const s = k.eSchaerfe[e]!;
    if (!(s > 0)) continue;
    const ne = kanteZwischen(kaefig, k.eA[e]!, k.eB[e]!);
    if (ne >= 0) kaefig.eSchaerfe[ne] = s;
    else verloreneFalten++;
  }
  for (let v = 0; v < nAlt; v++) kaefig.vSchaerfe[v] = k.vSchaerfe[v]!;
  const lippenSeiten: Kante[] = [];
  for (const ka of kanten.values()) {
    const n = anz.anzahl.get(ka.id)!;
    const istLippe = ka.arten.every((a) => a === 'lippe');
    let s = 0;
    if (istLippe) {
      s = UNENDLICH;
      lippenSeiten.push(ka);
    } else if (ka.arten.every((a) => a === 'falte')) {
      for (let i = 0; i + 1 < ka.punkte.length; i++) s = Math.max(s, fg.schaerfe.get(schl(orig(ka.punkte[i]!), orig(ka.punkte[i + 1]!))) ?? 0);
    }
    if (!(s > 0)) continue;
    for (let i = 0; i < n; i++) {
      const a = id(seitenSchluessel(ka, n, i));
      const b = id(seitenSchluessel(ka, n, i + 1));
      for (const [x, y] of [[a, b], [spiegelVon(a), spiegelVon(b)]] as [number, number][]) {
        const e = kanteZwischen(kaefig, x, y);
        if (e >= 0) kaefig.eSchaerfe[e] = s;
      }
    }
  }
  // Lippe als Folge U₀ … U_m von der Naht zum Mundwinkel
  const lippeFolge: number[] = lippeKeys.map(id);
  // A0-Spitzen auf der Naht im Feld (nicht am Linienanfang) → nächster neuer Nahtpunkt; Spitze am Linienanfang → Lippe mit Ecke
  const a0 = f.linie[0]!;
  for (let v = 0; v < k.n; v++) {
    const sv = k.vSchaerfe[v]!;
    if (!(sv > 0)) continue;
    const pv = xyzAlt(v);
    if (norm(sub(pv, a0)) < 0.5 * h) continue;
    if (Math.abs(pv[2]) > 1e-9) continue;
    const fs = k.vFlaechen.subarray(k.vFStart[v]!, k.vFStart[v + 1]!);
    if (!fs.length || !Array.from(fs).every((fl) => inM[fl])) continue;
    let best = -1;
    let bd = Infinity;
    for (let w = nAlt; w < kaefig.n; w++) {
      if (Math.abs(xyz[3 * w + 2]!) > 1e-12) continue;
      const d = Math.hypot(xyz[3 * w]! - pv[0], xyz[3 * w + 1]! - pv[1]);
      if (d < bd) {
        bd = d;
        best = w;
      }
    }
    if (best >= 0) kaefig.vSchaerfe[best] = sv;
  }
  if (lippenAnfang === 'ecke') kaefig.vSchaerfe[lippeFolge[0]!] = anfangSchaerfe;
  // Bereiche, Rollen, Spiegel
  const kragenSet = new Set(feld.kragen);
  const bereich = new Uint8Array(kaefig.nF);
  for (let fl = 0; fl < kaefig.nF; fl++) bereich[fl] = fl < alt.length ? (kragenSet.has(alteFlaeche[fl]!) ? 1 : 0) : fl < alt.length + rechts.length ? 2 : 3;
  const n = kaefig.n;
  const rolle = new Uint8Array(n);
  const benutzt = new Uint8Array(n);
  for (let hh = 0; hh < kaefig.fVerts.length; hh++) benutzt[kaefig.fVerts[hh]!] = 1;
  const tot: number[] = [];
  for (let v = 0; v < nAlt; v++) {
    if (!benutzt[v]) {
      rolle[v] = ROLLE_TOT;
      tot.push(v);
    } else rolle[v] = feldRand.has(v) ? ROLLE_RAND : ROLLE_AUSSEN;
  }
  for (let v = nAlt; v < n; v++) rolle[v] = ROLLE_HAUT;
  for (const v of lippeFolge) rolle[v] = ROLLE_LIPPE;
  rolle[lippeFolge[m]!] = ROLLE_WINKEL;
  const spiegel = new Int32Array(n);
  for (let v = 0; v < n; v++) spiegel[v] = spiegelVon(v);
  // haut[0] = Lippenring U₀ … U_m … U₀ (Falte: beide Kiefer dieselben Punkte), haut[1] = alle freien neuen Punkte rechts
  const lippeSet = new Set(lippeFolge);
  const haut0 = [...lippeFolge, ...[...lippeFolge].reverse().slice(1)];
  const haut1: number[] = [];
  for (let v = nAlt; v < nRechts; v++) if (!lippeSet.has(v)) haut1.push(v);
  const pruefung = pruefeKaefig(kaefig);
  const t: EinsatzTopologie = {
    kaefig,
    nAlt,
    tot: Int32Array.from(tot),
    alteFlaeche: Int32Array.from(alteFlaeche),
    gitter: 'kernring',
    m,
    M: m,
    J: 2,
    K: 0,
    haut: [haut0, haut1],
    tasche: [],
    rachen: [],
    lippe: [...lippeFolge, ...lippeFolge.slice(1, -1).map(spiegelVon).reverse()],
    spiegel,
    rolle,
    seite: new Uint8Array(n),
    bereich,
    speiche: new Int32Array(n).fill(-1),
    reihe: new Int32Array(n).fill(-1),
    lippenAnteile,
    hautKarte: { u: [], v: [] },
    thetaIn: new Float64Array(0),
    thetaOut: new Float64Array(0),
    reihenHoehen: [],
    taschenTiefe: 0,
    winkelVersatz: 0,
    verloreneFalten,
    umgedreht: false,
    umgeklappt,
    lippenAnfang,
    stufe: f.stufe,
    leiter: null,
    lippenEcken,
  };
  let pole = 0;
  for (const p of muster.pole) if (p.valenz !== 4) pole++;
  return {
    t,
    fund,
    kanten,
    polygone,
    anzahl: anz.anzahl,
    muster,
    flaechen: rechts.length + links.length,
    flaechenJeStueck,
    pole: 2 * pole,
    pruefung: { fehler: pruefung.fehler, geschlossen: pruefung.geschlossen },
    schluessel: neuIst,
    lippe,
    lippenMass: hLippe,
    lippenAnteile,
    ebenen,
    ebenenDaten,
    konformFalten,
    konformDraussen,
    ms: { stuecke: msStuecke, zahlen: msZahlen, lage: msLage, bau: jetzt() - t3 },
  };
}

/** Ablauf wie `einsatzAblauf`, mit dem Stücknetz statt des Kernrings: Topologie → Lippe (A6) → Haut lösen (A7) → Messen. */
export function stuecknetzAblauf(f: EinsatzFall, opt: StuecknetzOptionen = {}, loesen: LoesenOptionen = {}): { bau: StuecknetzBau; lippe: ReturnType<typeof lippeAnpassen>; g: GeloesterEinsatz; ms: EinsatzMasse; msLoesen: number } {
  const bau = stuecknetzTopologie(f, opt);
  const t = bau.t;
  const lippe = bau.lippe;
  const t0 = jetzt();
  const g = einsatzLoesen(t, f.v.kaefig, a0Netz(f.v.kaefig, 3 - f.stufe), lippe.punkte, loesen);
  const msLoesen = jetzt() - t0;
  const ms = einsatzMessen(g, t, f.v.kaefig, f.feld, lippe.punkte);
  return { bau, lippe, g, ms, msLoesen };
}

export { musterFlaechen, musterWahl };
