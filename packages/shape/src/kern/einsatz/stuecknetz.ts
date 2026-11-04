// P2 „Stücknetz im Maulfeld“, Tag 3–4 (04.11.2026): aus Stücken (`stuecke.ts`) und Mustern (`muster.ts`) der Käfig des
// Einsatzes — Tutte je Stück, Lage auf der Haut, Zusammenbau mit Spiegel und Lippenfalte — und die Übergabe an Lippe (A6),
// Hautlöser (A7) und Messung des Kernrings, damit die Zahlen vergleichbar sind.
//
// Lage: Jedes Stück wird für sich in die Ebene gelegt — auf ein konvexes Vieleck mit seinen Seitenlängen und Eckwinkeln (ein
// schmaler Keil bleibt ein schmaler Keil; auf der Scheibe verzerrte er so stark, dass Zellen am spitzen Ende umklappten) — durch
// Tutte der feinen Dreiecke des Stücks, Rand nach Bogenlänge auf dem Vieleck; das Muster des Stücks bekommt seine Randpunkte beim
// gleichen Bogenanteil und seine inneren Punkte durch Tutte auf dem Mustergraphen; aus der Ebene zurück auf die Haut von A0
// durch das Dreieck, in dem der Punkt liegt. Randpunkte auf den Linien liegen nach Bogenlänge auf der Linie (Feldrand: genau auf den alten Käfigpunkten, die
// Lippe ist im geschlossenen Maul eine scharfe Falte mit gemeinsamen Punkten beider Kiefer, der Mundwinkel ihr Ende ohne
// Punktschärfe — ein glatter Punkt mit vier Flächen). Keine Regel hier nennt einen Körper oder eine Lage. DOM-frei.
import { kaefigAusFlaechen, kanteZwischen, pruefeKaefig } from '../../kaefig/halbkanten';
import { cgDirichlet, type DuennSym, laplace } from '../../loeser/cg';
import { spiegelIndex } from '../pinsel';
import type { EinsatzFall } from '../pruefen/einsatzFall';
import { faltenGraph } from './leiter';
import { lippeAnpassen, type LippenAnfang } from './lippe';
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
  ms: { stuecke: number; zahlen: number; lage: number; bau: number };
};

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());
const schl = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

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
  const anz = anzahlenWaehlen(kanten, polygone, h, opt.mindest ?? 1);
  const ohneMuster = anz.offen.filter((o) => !musterWahl(o.seiten, 0, 1));
  if (ohneMuster.length) throw new Error(`Stücknetz: kein Muster für ${ohneMuster.map((o) => `${o.polygon} (${o.seiten.join('/')})`).join(', ')}`);
  const muster = musterBauen(kanten, polygone, anz.anzahl);
  const msZahlen = jetzt() - t1;
  // ---- Lagen der Punkte ----
  const t2 = jetzt();
  const lage = new Map<string, V3>();
  const xyzAlt = (id: number): V3 => [k.xyz[3 * id]!, k.xyz[3 * id + 1]!, k.xyz[3 * id + 2]!];
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
  // Innere Punkte: Tutte je Stück (Scheibe), dann zurück auf die Haut
  const T = fund.dreiecke;
  let umgeklappt = 0;
  const flaechenJeStueck: number[] = fund.stuecke.map(() => 0);
  muster.stueckVon.forEach((s) => flaechenJeStueck[s]!++);
  for (let sI = 0; sI < fund.stuecke.length; sI++) {
    const st = fund.stuecke[sI]!;
    // Umlauf nach Bogenlänge → Kreis; Seiten des Stücks → Bogenanteil ihrer Musterpunkte
    const z = st.punkte;
    const n = z.length;
    const sU = [0];
    for (let i = 1; i <= n; i++) sU.push(sU[i - 1]! + norm(sub(P3(z[i % n]!), P3(z[i - 1]!))));
    const U = sU[n]!;
    const kreis = vieleck(st.ecken.map((e, q) => ({ s: sU[e]!, winkel: st.winkel[q]! })), U);
    // feine Dreiecke des Stücks → kompakte Nummern, Rand fest auf dem Kreis
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
    const u = cgDirichlet(L, fest, wu, undefined, 1e-12, 50000).x;
    const v = cgDirichlet(L, fest, wv, undefined, 1e-12, 50000).x;
    // Mustergraph des Stücks: Punkte (Schlüssel), Kanten, Randpunkte fest beim Bogenanteil ihrer Seite
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
    const festM = new Uint8Array(nm);
    const mu = new Float64Array(nm);
    const mv = new Float64Array(nm);
    // Randschlüssel des Stücks: je Seite (Umlaufreihenfolge) die Musterpunkte bei i/n ihrer Bogenlänge — die Seiten beginnen an
    // der ersten Ecke des Umlaufs, die Bogenlänge des Kreises bei z[0]
    let sStart = sU[st.ecken[0] ?? 0]!;
    const polygon = polygone[sI]!;
    polygon.seiten.forEach((b) => {
      for (const teil of b.teile) {
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
            const p = idx === 0 ? ka.punkte[0]! : idx === nA ? ka.punkte[ka.punkte.length - 1]! : ka.feldPunkte[idx - 1]!;
            const j = ka.punkte.indexOf(p);
            const sj = j >= 0 ? sK[j]! / LK : idx / nA;
            anteil = teil.vorwaerts ? sj : 1 - sj;
          }
          const [x, y] = kreis(sStart + anteil * ka.laenge);
          festM[c] = 1;
          mu[c] = x;
          mv[c] = y;
        }
        sStart += ka.laenge;
      }
    });
    const [gu, gv] = tutteGraph(nm, paare, festM, [mu, mv]) as [Float64Array, Float64Array];
    // zurück auf die Haut: Dreieck in der Scheibe finden
    const nT = tri.length / 3;
    const bary = (x: number, y: number, tI: number): V3 | null => {
      const a = tri[3 * tI]!;
      const b = tri[3 * tI + 1]!;
      const c = tri[3 * tI + 2]!;
      const det = (u[b]! - u[a]!) * (v[c]! - v[a]!) - (u[c]! - u[a]!) * (v[b]! - v[a]!);
      if (Math.abs(det) < 1e-18) return null;
      const l1 = ((u[b]! - x) * (v[c]! - y) - (u[c]! - x) * (v[b]! - y)) / det;
      const l2 = ((u[c]! - x) * (v[a]! - y) - (u[a]! - x) * (v[c]! - y)) / det;
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
      const a = punkte[tri[3 * best.tI]!]!;
      const b = punkte[tri[3 * best.tI + 1]!]!;
      const cc = punkte[tri[3 * best.tI + 2]!]!;
      const pa = P3(a);
      const pb = P3(b);
      const pc = P3(cc);
      const w = best.b;
      lage.set(key, [w[0] * pa[0] + w[1] * pb[0] + w[2] * pc[0], w[0] * pa[1] + w[1] * pb[1] + w[2] * pc[1], w[0] * pa[2] + w[1] * pb[2] + w[2] * pc[2]]);
    }
    // umgeklappte Zellen in der Scheibe
    for (const fl of stFlaechen) {
      const c = fl.map((key) => keys.get(key)!);
      let s = 0;
      for (let i = 0; i < 4; i++) s += gu[c[i]!]! * gv[c[(i + 1) % 4]!]! - gu[c[(i + 1) % 4]!]! * gv[c[i]!]!;
      if (s <= 0) umgeklappt++;
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
  const fg = faltenGraph(k, feld, netz);
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
  // Lippe als Folge U₀ … U_m von der Naht zum Mundwinkel (Lippenseiten in Reihenfolge verketten)
  const lippeFolge: number[] = [];
  {
    const c = f.pfad[f.pfad.length - 1]!;
    const cKey = `P:${c}`;
    const startKey = kanten.values().next() && [...lippenSeiten].map((ka) => [ka.anfang, ka.ende]).flat().find((key) => istNaht(lage.get(key)!) && key !== cKey);
    let key = startKey ?? '';
    const benutzt = new Set<string>();
    for (let schritt = 0; schritt < lippenSeiten.length && key; schritt++) {
      const ka = lippenSeiten.find((x) => !benutzt.has(x.id) && (x.anfang === key || x.ende === key));
      if (!ka) break;
      benutzt.add(ka.id);
      const n = anz.anzahl.get(ka.id)!;
      const vorwaerts = ka.anfang === key;
      for (let i = 0; i <= n; i++) {
        const v = id(seitenSchluessel(ka, n, vorwaerts ? i : n - i));
        if (!lippeFolge.length || lippeFolge[lippeFolge.length - 1] !== v) lippeFolge.push(v);
      }
      key = vorwaerts ? ka.ende : ka.anfang;
    }
  }
  const m = lippeFolge.length - 1;
  if (m < 2) throw new Error(`Stücknetz: Lippe mit ${m} Spannen`);
  // A0-Spitzen auf der Naht im Feld (nicht am Linienanfang) → nächster neuer Nahtpunkt; Spitze am Linienanfang → Lippe mit Ecke
  let lippenAnfang: LippenAnfang = 'naht';
  let anfangSchaerfe = 0;
  const a0 = f.linie[0]!;
  for (let v = 0; v < k.n; v++) {
    const sv = k.vSchaerfe[v]!;
    if (!(sv > 0)) continue;
    const pv = xyzAlt(v);
    if (norm(sub(pv, a0)) < 0.5 * h) {
      lippenAnfang = 'ecke';
      anfangSchaerfe = Math.max(anfangSchaerfe, sv);
      continue;
    }
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
  // Lippenstellen mit Ecke: Knoten der Lippe, an denen eine Falte endet
  const lippenEcken: number[] = [];
  for (let q = 1; q < m; q++) {
    const v = lippeFolge[q]!;
    for (let i = kaefig.vKStart[v]!; i < kaefig.vKStart[v + 1]!; i++) {
      const e = kaefig.vKanten[i]!;
      const s = kaefig.eSchaerfe[e]!;
      if (s > 0 && s < UNENDLICH) {
        lippenEcken.push(q);
        break;
      }
    }
  }
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
  // Bogenlängenanteile der Lippenstellen
  const lippenAnteile = new Float64Array(m + 1);
  {
    let s = 0;
    for (let q = 1; q <= m; q++) {
      s += norm(sub([xyz[3 * lippeFolge[q]!]!, xyz[3 * lippeFolge[q]! + 1]!, xyz[3 * lippeFolge[q]! + 2]!], [xyz[3 * lippeFolge[q - 1]!]!, xyz[3 * lippeFolge[q - 1]! + 1]!, xyz[3 * lippeFolge[q - 1]! + 2]!]));
      lippenAnteile[q] = s;
    }
    for (let q = 1; q <= m; q++) lippenAnteile[q] = lippenAnteile[q]! / s;
  }
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
    ms: { stuecke: msStuecke, zahlen: msZahlen, lage: msLage, bau: jetzt() - t3 },
  };
}

/** Ablauf wie `einsatzAblauf`, mit dem Stücknetz statt des Kernrings: Topologie → Lippe (A6) → Haut lösen (A7) → Messen. */
export function stuecknetzAblauf(f: EinsatzFall, opt: StuecknetzOptionen = {}, loesen: LoesenOptionen = {}): { bau: StuecknetzBau; lippe: ReturnType<typeof lippeAnpassen>; g: GeloesterEinsatz; ms: EinsatzMasse; msLoesen: number } {
  const bau = stuecknetzTopologie(f, opt);
  const t = bau.t;
  const ziel = f.lippenZiel();
  const lippe = lippeAnpassen(ziel, t.m, t.lippenAnteile, { ende: 'falte', anfang: t.lippenAnfang, ecken: t.lippenEcken });
  const t0 = jetzt();
  const g = einsatzLoesen(t, f.v.kaefig, a0Netz(f.v.kaefig, 3 - f.stufe), lippe.punkte, loesen);
  const msLoesen = jetzt() - t0;
  const ms = einsatzMessen(g, t, f.v.kaefig, f.feld, lippe.punkte);
  return { bau, lippe, g, ms, msLoesen };
}

export { musterFlaechen, musterWahl };
