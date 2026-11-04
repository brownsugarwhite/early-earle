// Teil A, E1 (Plan 21.10.): Lage „Band“ des Kernrings — innen exakt, außen konform.
//
// Die Karte des ganzen Halbfelds (A4) hat am Mundwinkel die Spitze des Schlitzes: Dort ist die Haut ∝ ζ², jede harmonische
// Lage drängt die Reihen zusammen (auf K2 sechs Reihen in 6 px um c) und dreht in schiefen Feldern den Fächer um c (30–100°,
// gemessen). Beides lässt sich in der Karte nicht reparieren. Deshalb zwei Teile:
// 1. Innenband (Reihen 1 … R): ein Quadratgitter auf der Haut, aus der Lippe selbst gebaut — die Kontrollpunkte der Lippe
//    liegen in gleichen Abständen Δ, Reihe r über jeder Lippenstelle im Abstand r·Δ senkrecht zur Lippe (in der Tangential-
//    ebene, auf die Haut gelegt), um c der Fächer U'_m, Pol, E, Pol, D'_m auf 90°, 45°, 0°, −45°, −90° zur Verlängerung der
//    Lippe. Ring 1 ist ein Quadrat (Pole an den Ecken: am Mundwinkel vier gleiche Quadrate), der äußere Ring R ein Kreis um c
//    (die Grenze zum Restfeld bleibt glatt). Die Nahtspeichen laufen auf der Naht.
// 2. Restfeld (Reihen R … J): Das feine Netz wird entlang Ring R geschnitten (Pfadpunkte genau auf den Ring gerückt), das
//    Restfeld zwischen Ring R und Feldrand konform auf ein Rechteck gelegt (U' = 0 auf Ring R, U' = 1 am Feldrand). Es hat
//    keine Spitze, keine Singularität; Tutte im Rechteck ist faltenfrei und nimmt die Schiefe des Felds auf. Die Reihen liegen
//    danach auf den Speichen eines dichten Gitters nach Hautlänge, die erste im Abstand Δ hinter Ring R, dann geometrisch.
// DOM-frei.
import { type NormalZeile, normalSystem } from '../../loeser/normalSystem';
import { ankerVon, type FeinNetz, kantenPfad, punktNormalen, schnittAufLinie } from './flaeche';
import { type Karte, karteAusStuecken, ohrenKippen } from './karte';
import { type HautLage, reihenNachHaut } from './lage';

type V3 = [number, number, number];
type Umkehr = (u: number, v: number) => { p: V3; n: V3 };

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const kreuz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const einheit = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Hautpunkt nächst p mit der Normalen dort (Punktnormalen des Netzes, baryzentrisch gemischt). */
export function hautPunkt(netz: FeinNetz, normalen: Float64Array, p: V3): { p: V3; n: V3 } {
  const a = ankerVon(netz, p);
  const T = netz.dreiecke;
  const w = [1 - a.b1 - a.b2, a.b1, a.b2];
  const n: V3 = [0, 0, 0];
  for (let e = 0; e < 3; e++) {
    const i = T[3 * a.dreieck + e]!;
    for (let d = 0; d < 3; d++) n[d] = n[d]! + w[e]! * normalen[3 * i + d]!;
  }
  return { p: a.lage, n: einheit(n) };
}

/** Nächster Punkt auf der Naht (Kanten des Netzes mit beiden Enden bei z = 0). */
function nahtPunkt(netz: FeinNetz, naht: readonly [V3, V3][], p: V3): V3 {
  let best: V3 = [p[0], p[1], 0];
  let bd = Infinity;
  for (const [a, b] of naht) {
    const e = sub(b, a);
    const l2 = dot(e, e);
    const t = l2 > 0 ? Math.min(1, Math.max(0, dot(sub(p, a), e) / l2)) : 0;
    const q: V3 = [a[0] + t * e[0], a[1] + t * e[1], 0];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1], p[2]);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  void netz;
  return best;
}

/** Nahtkanten des Netzes (beide Enden bei z = 0). */
function nahtKanten(netz: FeinNetz): [V3, V3][] {
  const P = netz.punkte;
  const T = netz.dreiecke;
  const out: [V3, V3][] = [];
  const gesehen = new Set<string>();
  for (let t = 0; t < T.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = T[t + k]!;
      const b = T[t + ((k + 1) % 3)]!;
      if (Math.abs(P[3 * a + 2]!) > 1e-9 || Math.abs(P[3 * b + 2]!) > 1e-9) continue;
      const s = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (gesehen.has(s)) continue;
      gesehen.add(s);
      out.push([
        [P[3 * a]!, P[3 * a + 1]!, 0],
        [P[3 * b]!, P[3 * b + 1]!, 0],
      ]);
    }
  return out;
}

export type InnenBand = {
  /** Reihen 1 … R (je 2M + 1 Knoten, Speichen wie im Kernring), auf der Haut */
  reihen: V3[][];
  /** Richtung zur Oberseite an der ersten Lippenstelle (auf der Naht): dort liegt Speiche 0 */
  oben: V3;
};

/**
 * Innenband: Reihen 1 … R aus der Lippe (Kontrollpunkte U₀ … U_{m−1}, c; U₀ auf der Naht). Oberseite = die Seite, zu der
 * die Senkrechten im Mittel nach oben (+y) zeigen; Speichen k < m liegen dort.
 */
export function innenBand(lippe: readonly V3[], m: number, R: number, delta: number, netz: FeinNetz, normalen = punktNormalen(netz)): InnenBand {
  const s = lippe.slice(0, m + 1).map((p) => [p[0], p[1], p[2]] as V3);
  const sm1: V3 = [s[1]![0], s[1]![1], -s[1]![2]];
  const n = s.map((p) => hautPunkt(netz, normalen, p).n);
  const tangente = (k: number): V3 => {
    const a = k === 0 ? sm1 : s[k - 1]!;
    const b = k === m ? s[m]! : s[k + 1]!;
    const t = sub(b, a);
    return einheit(sub(t, [n[k]![0] * dot(t, n[k]!), n[k]![1] * dot(t, n[k]!), n[k]![2] * dot(t, n[k]!)]));
  };
  const t = s.map((_, k) => tangente(k));
  let nu = s.map((_, k) => einheit(kreuz(n[k]!, t[k]!)));
  // Oberseite: im Mittel nach +y (sonst nach −z, falls die Lippe senkrecht steht)
  let y = 0;
  for (const v of nu) y += v[1];
  if (Math.abs(y) < 1e-6 * nu.length) for (const v of nu) y -= v[2];
  if (y < 0) nu = nu.map((v) => [-v[0], -v[1], -v[2]]);
  const naht = nahtKanten(netz);
  const M = m + 2;
  const S = 2 * M;
  const auf = (p: V3) => hautPunkt(netz, normalen, p).p;
  const versetzt = (k: number, d: number): V3 => [s[k]![0] + d * nu[k]![0], s[k]![1] + d * nu[k]![1], s[k]![2] + d * nu[k]![2]];
  const c = s[m]!;
  const tc = t[m]!;
  const bc = nu[m]!;
  const reihen: V3[][] = [];
  for (let r = 1; r <= R; r++) {
    const d = r * delta;
    // Pole: am Mundwinkel Quadratecke (√2), außen Kreis (1)
    const pol = R > 1 ? Math.SQRT2 + ((1 - Math.SQRT2) * (r - 1)) / (R - 1) : Math.SQRT2;
    const reihe: V3[] = new Array(S + 1);
    reihe[0] = nahtPunkt(netz, naht, versetzt(0, d));
    reihe[S] = nahtPunkt(netz, naht, versetzt(0, -d));
    for (let k = 1; k < m; k++) reihe[k] = auf(versetzt(k, d));
    for (let k = 1; k < m; k++) reihe[S - k] = auf(versetzt(k, -d));
    const winkel = [90, 45, 0, -45, -90];
    for (let f = 0; f < 5; f++) {
      const phi = (winkel[f]! * Math.PI) / 180;
      const rho = d * (f === 1 || f === 3 ? pol : 1);
      const x = rho * Math.cos(phi);
      const yy = rho * Math.sin(phi);
      reihe[m + f] = auf([c[0] + x * tc[0] + yy * bc[0], c[1] + x * tc[1] + yy * bc[1], c[2] + x * tc[2] + yy * bc[2]]);
    }
    reihen.push(reihe);
  }
  return { reihen, oben: nu[0]! };
}

/**
 * Restfeld: das Netz entlang des Rings R schneiden (Kantenpfad von Naht zu Naht, Pfadpunkte genau auf den Ring gerückt) und
 * die Seite am Feldrand konform aufs Rechteck legen. `ring` = Knoten des Rings (Speichen 0 … 2M) auf der Haut, `rand` =
 * Feldrand als Punktnummern des feinen Netzes von der Naht oben (Speiche 0) zur Naht unten.
 */
export function restKarte(netz: FeinNetz, feldDreiecke: readonly number[], ring: readonly V3[], rand: readonly number[], innen?: { lippe: readonly V3[]; radius: number }): { netz: FeinNetz; karte: Karte; pfad: number[] } {
  // Ring dicht und auf der Haut (je Spanne sechs Zwischenpunkte)
  const normalen = punktNormalen(netz);
  const dicht: V3[] = [];
  for (let i = 0; i + 1 < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    for (let j = 0; j < 6; j++) {
      const t = j / 6;
      const q: V3 = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
      dicht.push(i === 0 && j === 0 ? [a[0], a[1], 0] : hautPunkt(netz, normalen, q).p);
    }
  }
  const e = ring[ring.length - 1]!;
  dicht.push([e[0], e[1], 0]);
  // Die beiden Enden des Rings liegen nah beieinander (2R·Δ, beiderseits des Lippenanfangs auf der Naht): Punkte im Innenband
  // (näher an der Lippe als `radius`) sind gesperrt, sonst nimmt der kürzeste Weg die Abkürzung quer über die Lippe
  let gesperrt: ((i: number) => boolean) | undefined;
  if (innen) {
    const Q = netz.punkte;
    const z = innen.lippe;
    gesperrt = (i: number) => {
      const p: V3 = [Q[3 * i]!, Q[3 * i + 1]!, Q[3 * i + 2]!];
      for (let k = 0; k + 1 < z.length; k++) {
        const a = z[k]!;
        const e2 = sub(z[k + 1]!, a);
        const l2 = dot(e2, e2);
        const t = l2 > 0 ? Math.min(1, Math.max(0, dot(sub(p, a), e2) / l2)) : 0;
        if (Math.hypot(a[0] + t * e2[0] - p[0], a[1] + t * e2[1] - p[1], a[2] + t * e2[2] - p[2]) < innen.radius) return true;
      }
      return false;
    };
  }
  const pfad = kantenPfad(netz, feldDreiecke, dicht, { endeAufNaht: true, ...(gesperrt ? { gesperrt } : {}) });
  if (pfad.length < 2) throw new Error('Band: kein Pfad entlang des Rings');
  const genau = schnittAufLinie(netz, pfad, dicht).netz;
  // Seiten trennen: vom Feldrand aus über Kanten, die nicht auf dem Pfad liegen
  const T = genau.dreiecke;
  const schl = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  const pfadKanten = new Set<string>();
  for (let i = 0; i + 1 < pfad.length; i++) pfadKanten.add(schl(pfad[i]!, pfad[i + 1]!));
  const anKante = new Map<string, number[]>();
  for (const t of feldDreiecke)
    for (let k = 0; k < 3; k++) {
      const key = schl(T[3 * t + k]!, T[3 * t + ((k + 1) % 3)]!);
      (anKante.get(key) ?? anKante.set(key, []).get(key)!).push(t);
    }
  // Start: Dreiecke am Feldrand (Randkanten des Felds, die nicht auf der Naht liegen)
  const aufNaht = (g: number) => Math.abs(genau.punkte[3 * g + 2]!) < 1e-9;
  const aussen = new Set<number>();
  const st: number[] = [];
  for (const [key, ts] of anKante) {
    if (ts.length !== 1) continue;
    const [a, b] = key.split(':').map(Number) as [number, number];
    if (aufNaht(a) && aufNaht(b)) continue;
    if (!aussen.has(ts[0]!)) {
      aussen.add(ts[0]!);
      st.push(ts[0]!);
    }
  }
  void rand;
  while (st.length) {
    const t = st.pop()!;
    for (let k = 0; k < 3; k++) {
      const key = schl(T[3 * t + k]!, T[3 * t + ((k + 1) % 3)]!);
      if (pfadKanten.has(key)) continue;
      for (const u of anKante.get(key) ?? []) if (!aussen.has(u)) {
        aussen.add(u);
        st.push(u);
      }
    }
  }
  // örtliche Nummern, Ohren kippen, Randschleife
  const lokal = new Map<number, number>();
  const global: number[] = [];
  const tri: number[] = [];
  for (const t of aussen)
    for (let k = 0; k < 3; k++) {
      const g = T[3 * t + k]!;
      if (!lokal.has(g)) {
        lokal.set(g, global.length);
        global.push(g);
      }
      tri.push(lokal.get(g)!);
    }
  const triL = Int32Array.from(tri);
  ohrenKippen(triL);
  const P = new Float64Array(3 * global.length);
  global.forEach((g, i) => P.set([genau.punkte[3 * g]!, genau.punkte[3 * g + 1]!, genau.punkte[3 * g + 2]!], 3 * i));
  const ger = new Set<string>();
  for (let t = 0; t < triL.length; t += 3) for (let k = 0; k < 3; k++) ger.add(`${triL[t + k]}:${triL[t + ((k + 1) % 3)]}`);
  const nach = new Map<number, number>();
  for (const s of ger) {
    const [a, b] = s.split(':').map(Number) as [number, number];
    if (!ger.has(`${b}:${a}`)) nach.set(a, b);
  }
  const v0 = lokal.get(pfad[0]!);
  const v1 = lokal.get(pfad[pfad.length - 1]!);
  if (v0 === undefined || v1 === undefined) throw new Error('Band: Pfadende nicht im Restfeld');
  const schleife: number[] = [];
  for (let a = v0, i = 0; i <= nach.size; i++) {
    schleife.push(a);
    a = nach.get(a)!;
    if (a === v0) break;
  }
  // Schlitz (Ring) zuerst: läuft die Schleife ab v0 nicht den Pfad entlang, umdrehen
  const reihe = schleife[1] === lokal.get(pfad[1]!) ? schleife : [v0, ...schleife.slice(1).reverse()];
  const i1 = reihe.indexOf(v1);
  const schlitz = reihe.slice(0, i1 + 1);
  const rest = reihe.slice(i1 + 1);
  const naht = (k: number) => Math.abs(P[3 * k + 2]!) < 1e-9;
  let a1 = 0;
  while (a1 < rest.length && naht(rest[a1]!)) a1++;
  let a2 = rest.length;
  while (a2 > a1 && naht(rest[a2 - 1]!)) a2--;
  const mitteUnten = [v1, ...rest.slice(0, a1)];
  const aussenStueck = rest.slice(Math.max(0, a1 - 1), Math.min(rest.length, a2 + 1));
  const mitteOben = [...rest.slice(a2), v0];
  const karte = karteAusStuecken(triL, P, global, { schlitz, mitteUnten, aussen: aussenStueck, mitteOben });
  return { netz: genau, karte, pfad };
}

/**
 * Lage des Restfelds: dichtes Gitter (J_d Reihen gleichmäßig in U') zwischen Ring R (Reihe 0', fest auf U' = 0) und Feldrand
 * (fest auf U' = 1), Nahtspeichen nach Bogenlänge auf der Naht, innen Tutte im Rechteck (a'·U', V') — faltenfrei —, danach
 * Runden des Ausgleichs nach Hautlängen (wie die äußere Stufe von `kernGitter`). `ringV`/`randV` = V' der festen Knoten.
 */
export function restGitter(umkehr: Umkehr, ring: readonly V3[], ringV: readonly number[], rand: readonly V3[], randV: readonly number[], a: number, Jd: number, aussenRunden: number): HautLage {
  const S = ring.length - 1;
  // Nahtspeichen: U' nach Bogenlänge auf V' = 0 bzw. 1
  const naht = (v: number): number[] => {
    const N = 256;
    const s = [0];
    let vor = umkehr(0, v).p;
    for (let i = 1; i <= N; i++) {
      const q = umkehr(i / N, v).p;
      s.push(s[i - 1]! + Math.hypot(q[0] - vor[0], q[1] - vor[1], q[2] - vor[2]));
      vor = q;
    }
    return Array.from({ length: Jd + 1 }, (_, r) => {
      const ziel = (r / Jd) * s[N]!;
      let i = 0;
      while (i + 1 < N && s[i + 1]! < ziel) i++;
      const t = s[i + 1]! > s[i]! ? (ziel - s[i]!) / (s[i + 1]! - s[i]!) : 0;
      return Math.min(1, (i + t) / N);
    });
  };
  const uOben = naht(0);
  const uUnten = naht(1);
  const id = (r: number, k: number) => r * (S + 1) + k;
  const nK = (Jd + 1) * (S + 1);
  const U = new Float64Array(nK);
  const V = new Float64Array(nK);
  const fest = new Uint8Array(nK);
  for (let k = 0; k <= S; k++) {
    U[id(0, k)] = 0;
    V[id(0, k)] = ringV[k]!;
    U[id(Jd, k)] = 1;
    V[id(Jd, k)] = randV[k]!;
    fest[id(0, k)] = fest[id(Jd, k)] = 1;
  }
  for (let r = 1; r < Jd; r++) {
    U[id(r, 0)] = uOben[r]!;
    V[id(r, 0)] = 0;
    U[id(r, S)] = uUnten[r]!;
    V[id(r, S)] = 1;
    fest[id(r, 0)] = fest[id(r, S)] = 1;
  }
  const kanten: [number, number][] = [];
  for (let r = 0; r <= Jd; r++) for (let k = 0; k < S; k++) kanten.push([id(r, k), id(r, k + 1)]);
  for (let r = 0; r < Jd; r++) for (let k = 0; k <= S; k++) kanten.push([id(r, k), id(r + 1, k)]);
  const gewicht = new Float64Array(kanten.length).fill(1);
  const unb = new Int32Array(nK).fill(-1);
  const liste: number[] = [];
  for (let i = 0; i < nK; i++)
    if (!fest[i]) {
      unb[i] = liste.length;
      liste.push(i);
    }
  const loesen = () => {
    const n = liste.length;
    const zeilen: NormalZeile[] = [];
    const nachbarn: number[][] = Array.from({ length: n }, () => []);
    const b0 = new Float64Array(n);
    const b1 = new Float64Array(n);
    kanten.forEach(([p, q], e) => {
      const w = gewicht[e]!;
      const i = unb[p]!;
      const j = unb[q]!;
      if (i >= 0 && j >= 0) {
        zeilen.push({ index: [i, j], wert: [1, -1], gewicht: w });
        nachbarn[i]!.push(j);
        nachbarn[j]!.push(i);
      } else if (i >= 0 || j >= 0) {
        const f = i >= 0 ? i : j;
        const o = i >= 0 ? q : p;
        zeilen.push({ index: [f], wert: [1], gewicht: w });
        b0[f] = b0[f]! + w * a * U[o]!;
        b1[f] = b1[f]! + w * V[o]!;
      }
    });
    const sys = normalSystem(n, zeilen, nachbarn);
    const x0 = sys.loesenSpalte(b0);
    const x1 = sys.loesenSpalte(b1);
    liste.forEach((p, i) => {
      U[p] = x0[i]! / a;
      V[p] = x1[i]!;
    });
  };
  loesen();
  const lage3 = (i: number): V3 => {
    const r = Math.floor(i / (S + 1));
    const k = i % (S + 1);
    if (r === 0) return ring[k]!;
    if (r === Jd) return rand[k]!;
    return umkehr(U[i]!, V[i]!).p;
  };
  // Ausgleich nach Hautlängen (wie `kernGitter`, äußere Stufe): Gewicht ← √(alt · Hautlänge/Kartenlänge), Median-normiert
  for (let runde = 0; runde < aussenRunden; runde++) {
    const L = new Map<number, V3>();
    const lage = (i: number) => {
      let p = L.get(i);
      if (!p) {
        p = lage3(i);
        L.set(i, p);
      }
      return p;
    };
    const neu = new Float64Array(kanten.length).fill(Number.NaN);
    const werte: number[] = [];
    kanten.forEach(([p0, q0], e) => {
      const p = lage(p0);
      const q = lage(q0);
      const l3 = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      const l2 = Math.hypot(a * (U[p0]! - U[q0]!), V[p0]! - V[q0]!);
      if (!(l2 > 0)) return;
      neu[e] = l3 / l2;
      werte.push(l3 / l2);
    });
    werte.sort((x, y) => x - y);
    const med = werte[werte.length >> 1] || 1;
    for (let e = 0; e < kanten.length; e++) if (!Number.isNaN(neu[e]!)) gewicht[e] = Math.sqrt(gewicht[e]! * Math.min(50, Math.max(0.02, neu[e]! / med)));
    loesen();
  }
  const u: number[][] = [];
  const v: number[][] = [];
  const lagen: V3[][] = [];
  for (let r = 0; r <= Jd; r++) {
    u.push(Array.from({ length: S + 1 }, (_, k) => U[id(r, k)]!));
    v.push(Array.from({ length: S + 1 }, (_, k) => V[id(r, k)]!));
    lagen.push(Array.from({ length: S + 1 }, (_, k) => lage3(id(r, k))));
  }
  return { u, v, lagen };
}

/**
 * Hautzellen des Kernrings mit falschem Umlauf, auf der Haut gemessen (Normale des Netzes an der Zellmitte): die Prüfung, die
 * zählt — unabhängig von jeder Karte.
 */
export function zellenUmgeklappt(lagen: readonly (readonly V3[])[], m: number, netz: FeinNetz, normalen = punktNormalen(netz)): number {
  const J = lagen.length - 1;
  const S = lagen[1]!.length - 1;
  const M = S / 2;
  const zellen: [number, number][][] = [];
  for (let k = 0; k < m; k++) zellen.push([[0, k], [0, k + 1], [1, k + 1], [1, k]]);
  zellen.push([[0, m], [1, M], [1, M - 1], [1, M - 2]]);
  zellen.push([[0, m], [1, M + 2], [1, M + 1], [1, M]]);
  for (let k = m; k < 2 * m; k++) zellen.push([[0, k], [0, k + 1], [1, k + 5], [1, k + 4]]);
  for (let r = 1; r < J; r++) for (let k = 0; k < S; k++) zellen.push([[r, k], [r, k + 1], [r + 1, k + 1], [r + 1, k]]);
  let pos = 0;
  let neg = 0;
  for (const z of zellen) {
    const p = z.map(([r, k]) => lagen[r]![k]!);
    const mitte: V3 = [0, 0, 0];
    for (const q of p) for (let d = 0; d < 3; d++) mitte[d] = mitte[d]! + q[d]! / 4;
    const n = hautPunkt(netz, normalen, mitte).n;
    const x = kreuz(sub(p[2]!, p[0]!), sub(p[3]!, p[1]!));
    if (dot(x, n) > 0) pos++;
    else neg++;
  }
  return Math.min(pos, neg);
}

/**
 * Lage des Restfelds in Tiefe und V' (Versuch zum dichten Tutte-Gitter): s̃ = Hautlänge vom Ring entlang der V'-Linie der
 * Karte, geteilt durch ihre ganze Länge (0 am Ring, 1 am Feldrand). Speiche k läuft von (0, V'_Ring(k)) nach (1, V'_Rand(k))
 * mit V'(s̃) = V'_Ring + (V'_Rand − V'_Ring)·s̃^p — für jedes monotone s̃^p bleiben die Speichen geordnet (faltenfrei); p > 1
 * legt die Verdrehung, die die Zuordnung zum Feldrand verlangt, nach außen, nahe dem Band folgen die Speichen der Karte.
 * Reihe r bei s̃ = (q^r − 1)/(q^J − 1), q so, dass der erste Schritt im Median Δ ist.
 */
export function restLageTiefe(umkehr: Umkehr, ring: readonly V3[], ringV: readonly number[], rand: readonly V3[], randV: readonly number[], J: number, delta: number, p = 2, nV = 96, nU = 128): HautLage {
  const S = ring.length - 1;
  // Tabelle: je V'-Linie die Hautlänge über U'
  const linien: { v: number; s: Float64Array }[] = [];
  for (let i = 0; i <= nV; i++) {
    const v = i / nV;
    const s = new Float64Array(nU + 1);
    let vor = umkehr(0, v).p;
    for (let j = 1; j <= nU; j++) {
      const q = umkehr(j / nU, v).p;
      s[j] = s[j - 1]! + Math.hypot(q[0] - vor[0], q[1] - vor[1], q[2] - vor[2]);
      vor = q;
    }
    linien.push({ v, s });
  }
  // U' bei relativer Tiefe t auf der V'-Linie v (zwischen zwei Tabellenlinien gemischt)
  const uBei = (t: number, v: number): number => {
    const x = Math.min(nV, Math.max(0, v * nV));
    const i = Math.min(nV - 1, Math.floor(x));
    const w = x - i;
    const auf = (s: Float64Array) => {
      const ziel = t * s[nU]!;
      let lo = 0;
      let hi = nU;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (s[mid]! < ziel) lo = mid;
        else hi = mid;
      }
      const d = s[hi]! - s[lo]!;
      return (lo + (d > 0 ? (ziel - s[lo]!) / d : 0)) / nU;
    };
    return (1 - w) * auf(linien[i]!.s) + w * auf(linien[i + 1]!.s);
  };
  const tiefen = linien.map((l) => l.s[nU]!).sort((a, b) => a - b);
  const D = tiefen[tiefen.length >> 1]!;
  // q mit erstem Schritt Δ/D (relativ)
  const erster = Math.min(0.5, delta / D);
  let lo = 0.5;
  let hi = 4;
  const schritt1 = (q: number) => (Math.abs(q - 1) < 1e-12 ? 1 / J : (q - 1) / (q ** J - 1));
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    if (schritt1(mid) > erster) lo = mid;
    else hi = mid;
  }
  const q = 0.5 * (lo + hi);
  const tR = Array.from({ length: J + 1 }, (_, r) => (Math.abs(q - 1) < 1e-12 ? r / J : (q ** r - 1) / (q ** J - 1)));
  const u: number[][] = [];
  const v: number[][] = [];
  const lagen: V3[][] = [];
  for (let r = 0; r <= J; r++) {
    const ur: number[] = [];
    const vr: number[] = [];
    const lr: V3[] = [];
    for (let k = 0; k <= S; k++) {
      if (r === 0 || r === J) {
        ur.push(r === 0 ? 0 : 1);
        vr.push(r === 0 ? ringV[k]! : randV[k]!);
        lr.push(r === 0 ? ring[k]! : rand[k]!);
        continue;
      }
      const t = tR[r]!;
      const vv = ringV[k]! + (randV[k]! - ringV[k]!) * t ** p;
      const uu = uBei(t, vv);
      ur.push(uu);
      vr.push(vv);
      lr.push(umkehr(uu, vv).p);
    }
    u.push(ur);
    v.push(vr);
    lagen.push(lr);
  }
  return { u, v, lagen };
}

/**
 * Faltenfreie Einbettung einer Ziel-Lage des Restfelds (Gitter Reihen × Speichen, Reihe 0 und J sowie die Nahtspeichen fest):
 * Tutte im Rechteck (a·U', V') mit Mittelwertgewichten (Floater) aus der Ziel-Lage. Die Gewichte sind positiv, das Gebiet
 * konvex — die Einbettung ist faltenfrei; wo die Ziel-Lage selbst gültig ist, gibt sie sie genau wieder (lineare Genauigkeit).
 * Gelöst als dünnes lineares System (Gauß-Seidel ab dem Ziel, das bei gültigem Ziel schon die Lösung ist).
 */
export function mittelwertTutte(ziel: HautLage, a: number, umkehr: Umkehr, schritte = 4000, toleranz = 1e-13): HautLage & { schritte: number } {
  const J = ziel.u.length - 1;
  const S = ziel.u[0]!.length - 1;
  const X = ziel.u.map((z) => z.map((x) => a * x));
  const Y = ziel.v.map((z) => z.slice());
  // Gewichte je freiem Knoten aus der Ziel-Lage: Nachbarn im Umlauf rechts (k+1), außen (r+1), links (k−1), innen (r−1)
  type Gew = { r: number; k: number; w: number }[];
  const gew: Gew[][] = [];
  for (let r = 0; r <= J; r++) {
    const zeile: Gew[] = [];
    for (let k = 0; k <= S; k++) {
      if (r === 0 || r === J || k === 0 || k === S) {
        zeile.push([]);
        continue;
      }
      const nb: [number, number][] = [
        [r, k + 1],
        [r + 1, k],
        [r, k - 1],
        [r - 1, k],
      ];
      const px = X[r]![k]!;
      const py = Y[r]![k]!;
      const d = nb.map(([rr, kk]) => [X[rr]![kk]! - px, Y[rr]![kk]! - py] as [number, number]);
      const l = d.map((e) => Math.max(1e-300, Math.hypot(e[0], e[1])));
      const winkel = d.map((e, i) => {
        const f = d[(i + 1) % 4]!;
        const c = (e[0] * f[0] + e[1] * f[1]) / (l[i]! * l[(i + 1) % 4]!);
        return Math.acos(Math.max(-1, Math.min(1, c)));
      });
      const w = d.map((_, i) => (Math.tan(winkel[(i + 3) % 4]! / 2) + Math.tan(winkel[i]! / 2)) / l[i]!);
      const summe = w.reduce((s, x) => s + x, 0) || 1;
      zeile.push(nb.map(([rr, kk], i) => ({ r: rr, k: kk, w: w[i]! / summe })));
    }
    gew.push(zeile);
  }
  let schritt = 0;
  for (; schritt < schritte; schritt++) {
    let aenderung = 0;
    for (let r = 1; r < J; r++)
      for (let k = 1; k < S; k++) {
        let x = 0;
        let y = 0;
        for (const g of gew[r]![k]!) {
          x += g.w * X[g.r]![g.k]!;
          y += g.w * Y[g.r]![g.k]!;
        }
        aenderung = Math.max(aenderung, Math.abs(x - X[r]![k]!), Math.abs(y - Y[r]![k]!));
        X[r]![k] = x;
        Y[r]![k] = y;
      }
    if (aenderung < toleranz) break;
  }
  const u = X.map((z) => z.map((x) => x / a));
  const v = Y;
  const lagen = u.map((z, r) => z.map((uu, k) => (r === 0 || r === J ? ziel.lagen[r]![k]! : umkehr(uu, v[r]![k]!).p)));
  return { u, v, lagen, schritte: schritt };
}

/** V' eines Punkts auf dem Ring: Fußpunkt auf dem Pfad (Polylinie der Pfadpunkte), V' dort linear. */
export function ringV(karte: Karte, netz: FeinNetz, pfad: readonly number[], p: V3): number {
  const idx = new Map<number, number>();
  karte.punkte.forEach((g, i) => idx.set(g, i));
  let best = 0;
  let bd = Infinity;
  const P = (g: number): V3 => [netz.punkte[3 * g]!, netz.punkte[3 * g + 1]!, netz.punkte[3 * g + 2]!];
  for (let i = 0; i + 1 < pfad.length; i++) {
    const a = P(pfad[i]!);
    const b = P(pfad[i + 1]!);
    const e = sub(b, a);
    const l2 = dot(e, e);
    const t = l2 > 0 ? Math.min(1, Math.max(0, dot(sub(p, a), e) / l2)) : 0;
    const d = Math.hypot(a[0] + t * e[0] - p[0], a[1] + t * e[1] - p[1], a[2] + t * e[2] - p[2]);
    if (d < bd) {
      bd = d;
      const va = karte.v[idx.get(pfad[i]!)!]!;
      const vb = karte.v[idx.get(pfad[i + 1]!)!]!;
      best = va + t * (vb - va);
    }
  }
  return best;
}

/**
 * Ganze Lage „Band“: Reihen 0 (Lippe) … R (Innenband) und R … J (Restfeld nach Hautlänge, erste Reihe Δ hinter Ring R).
 * `lippe` = Lippenreihe des Kernrings (2m + 1 Knoten: U₀ … U_{m−1}, c, D_{m−1} … D₀), `rand` = Feldrand von Speiche 0 bis
 * 2M als Punktnummern des feinen Netzes.
 */
export function bandLage(lippe: readonly V3[], m: number, J: number, R: number, delta: number, netz: FeinNetz, feldDreiecke: readonly number[], halbRand: readonly number[], aussenRunden: number, aspekt: (karte: Karte, netz: FeinNetz) => number, umkehrVon: (karte: Karte, netz: FeinNetz) => Umkehr, restArt: { art: 'tutte' } | { art: 'tiefe'; p: number } = { art: 'tutte' }): HautLage & { innen: InnenBand; rest: Karte; restNetz: FeinNetz; rand: number[] } {
  if (J < R + 2) throw new Error(`Band: J = ${J} zu klein für R = ${R} (mindestens R + 2)`);
  const normalen = punktNormalen(netz);
  const innen = innenBand(lippe.slice(0, m + 1), m, R, delta, netz, normalen);
  // Feldrand von der Naht auf der Oberseite (Speiche 0) zur Naht unten
  const P0 = (g: number): V3 => [netz.punkte[3 * g]!, netz.punkte[3 * g + 1]!, netz.punkte[3 * g + 2]!];
  const rand = dot(sub(P0(halbRand[0]!), lippe[0]!), innen.oben) >= 0 ? [...halbRand] : [...halbRand].reverse();
  const ring = innen.reihen[R - 1]!;
  // gesperrt: alles näher als (R − ½)·Δ an der Lippe samt c (Ring R liegt im Abstand R·Δ)
  const rk = restKarte(netz, feldDreiecke, ring, rand, { lippe: lippe.slice(0, m + 1), radius: (R - 0.5) * delta });
  const umkehr = umkehrVon(rk.karte, rk.netz);
  const idx = new Map<number, number>();
  rk.karte.punkte.forEach((g, i) => idx.set(g, i));
  const rV = ring.map((p) => ringV(rk.karte, rk.netz, rk.pfad, p));
  // Nahtknoten genau auf die Enden
  rV[0] = 0;
  rV[rV.length - 1] = 1;
  const randLagen = rand.map((g): V3 => [rk.netz.punkte[3 * g]!, rk.netz.punkte[3 * g + 1]!, rk.netz.punkte[3 * g + 2]!]);
  const randV = rand.map((g) => rk.karte.v[idx.get(g)!]!);
  const S = ring.length - 1;
  let aussen: HautLage;
  if (restArt.art === 'tiefe') aussen = mittelwertTutte(restLageTiefe(umkehr, ring, rV, randLagen, randV, J - R, delta, restArt.p), aspekt(rk.karte, rk.netz), umkehr);
  else {
    const Jd = 24;
    const dicht = restGitter(umkehr, ring, rV, randLagen, randV, aspekt(rk.karte, rk.netz), Jd, aussenRunden);
    // Reihen nach Hautlänge ab Ring R: Die Speichen des dichten Gitters beginnen an Ring R (als `m` die Knotenzahl des Rings:
    // so beginnt jede Speiche j an Ringknoten j)
    aussen = reihenNachHaut({ u: dicht.u, v: dicht.v, lagen: dicht.lagen }, J - R, S + 1, delta, umkehr);
  }
  const u: number[][] = [lippe.map(() => Number.NaN)];
  const v: number[][] = [lippe.map(() => Number.NaN)];
  const lagen: V3[][] = [lippe.map((p) => [...p] as V3)];
  for (let r = 1; r <= R; r++) {
    u.push(new Array(S + 1).fill(r === R ? 0 : Number.NaN));
    v.push(r === R ? rV.slice() : new Array(S + 1).fill(Number.NaN));
    lagen.push(innen.reihen[r - 1]!.slice());
  }
  for (let r = 1; r <= J - R; r++) {
    u.push(aussen.u[r]!.slice());
    v.push(aussen.v[r]!.slice());
    lagen.push(aussen.lagen[r]!.slice());
  }
  return { u, v, lagen, innen, rest: rk.karte, restNetz: rk.netz, rand };
}
