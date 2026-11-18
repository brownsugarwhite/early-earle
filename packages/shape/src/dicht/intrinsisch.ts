// Form zuerst (08.11.2026), Beweis „Form unabhängig vom Netz“: Gewichte nach der Geometrie (Laplace–Beltrami mit Kotangens) auf
// einer intrinsischen Delaunay-Triangulierung (Fisher, Springborn, Bobenko, Schröder 2006; Sharp, Soliman, Crane 2019). Dieselben
// Punkte, dieselbe Fläche; nur Kanten, deren Gegenwinkel zusammen über 180° liegen, werden rechnerisch geklappt (die neue Kante läuft
// in der aufgefalteten Raute, ihre Länge aus dem Kosinussatz). Danach ist jedes Gewicht ½ (cot α + cot β) ≥ 0, auch auf gestreckten
// Dreiecken, wie sie beim Ziehen entstehen. Mit geklemmten negativen Gewichten schaukelte sich der Löser am gestreckten Nacken auf.
// Das Netz selbst bleibt unverändert (die Anzeige, die Loops, der Löser der Lagen). Kanten, die `fest` sind (harte Linien), werden nie
// geklappt: Über sie läuft dann keine Kante hinweg.

import type { Haut } from './kurven';

/** Gewichte je Punkt (CSR): Nachbarn, Gewicht ½ (cot α + cot β) ≥ 0, Länge² der intrinsischen Kante; parallele Kanten getrennt */
export type IntrinsischeGewichte = {
  start: Int32Array;
  nb: Int32Array;
  w: Float64Array;
  l2: Float64Array;
  /** geklappte Kanten */
  flips: number;
};

/** Verbindungen des Netzes (Zwilling je Halbkante), gemerkt je Dreiecksliste */
const zwillinge = new WeakMap<Uint32Array, Int32Array>();
function zwillingeVon(h: Haut): Int32Array {
  const g = zwillinge.get(h.tri);
  if (g) return g;
  const T = h.tri;
  const m = T.length;
  const n = h.n;
  // Halbkanten nach (von, zu) sortiert: der Zwilling von a→b ist b→a
  const schl = new Float64Array(m);
  const idx = new Int32Array(m);
  for (let x = 0; x < m; x++) {
    const a = T[x]!;
    const b = T[x - (x % 3) + ((x % 3) + 1) % 3]!;
    schl[x] = Math.min(a, b) * n + Math.max(a, b);
    idx[x] = x;
  }
  idx.sort((p, q) => schl[p]! - schl[q]!);
  const z = new Int32Array(m).fill(-1);
  for (let k = 0; k + 1 < m; k++) {
    const p = idx[k]!;
    const q = idx[k + 1]!;
    if (schl[p] === schl[q] && z[p] === -1 && z[q] === -1) {
      z[p] = q;
      z[q] = p;
      k++;
    }
  }
  zwillinge.set(h.tri, z);
  return z;
}

/**
 * Intrinsische Delaunay-Triangulierung der Haut (Kanten klappen, bis jede Kante Delaunay ist) und die Kotangens-Gewichte darauf.
 * `fest(a, b)`: diese Kante nie klappen.
 */
export function intrinsischeGewichte(h: Haut, fest: ((a: number, b: number) => boolean) | null = null): IntrinsischeGewichte {
  const T = h.tri;
  const P = h.pos;
  const m = T.length;
  const n = h.n;
  const V = Int32Array.from(T);
  const zwilling = Int32Array.from(zwillingeVon(h));
  /** Länge² je Halbkante */
  const Q = new Float64Array(m);
  const fix = new Uint8Array(m);
  for (let x = 0; x < m; x++) {
    const a = V[x]!;
    const b = V[x - (x % 3) + ((x % 3) + 1) % 3]!;
    const dx = P[3 * a]! - P[3 * b]!;
    const dy = P[3 * a + 1]! - P[3 * b + 1]!;
    const dz = P[3 * a + 2]! - P[3 * b + 2]!;
    Q[x] = dx * dx + dy * dy + dz * dz;
    if (fest && fest(a, b)) fix[x] = 1;
  }
  if (fest) for (let x = 0; x < m; x++) if (zwilling[x]! >= 0 && fix[zwilling[x]!]) fix[x] = 1;
  /** Kotangens gegenüber der Halbkante x in ihrem Dreieck (aus den Längen²) */
  const cotX = (x: number): number => {
    const t = x - (x % 3);
    const e = x % 3;
    const C = Q[x]!;
    const A = Q[t + ((e + 1) % 3)]!;
    const B = Q[t + ((e + 2) % 3)]!;
    const s = A + B - C;
    const f = 4 * A * B - s * s;
    return s / Math.sqrt(f > 1e-24 ? f : 1e-24);
  };
  // der Kotangens je Halbkante einmal gerechnet (13.11.; dieselben Werte wie bei jedem einzelnen Aufruf, nach einem Klappen für
  // die sechs Halbkanten der beiden Dreiecke neu): Vorher wurde er je Halbkante dreimal gerechnet, mit je einer Wurzel
  const cot = new Float64Array(m);
  for (let x = 0; x < m; x++) cot[x] = cotX(x);
  const stapel = new Int32Array(m);
  let oben = 0;
  const drin = new Uint8Array(m);
  for (let x = 0; x < m; x++) {
    const g = zwilling[x]!;
    if (g < 0 || g < x) continue;
    stapel[oben++] = x;
    drin[x] = 1;
  }
  let flips = 0;
  const schranke = 20 * m;
  while (oben > 0 && flips < schranke) {
    const x = stapel[--oben]!;
    drin[x] = 0;
    const g = zwilling[x]!;
    if (g < 0 || fix[x]) continue;
    if (cot[x]! + cot[g]! >= -1e-12) continue;
    // Raute: x = a→b im Dreieck (a, b, c), g = b→a im Dreieck (b, a, d)
    const t0 = x - (x % 3);
    const t1 = g - (g % 3);
    const x1 = t0 + ((x % 3) + 1) % 3;
    const x2 = t0 + ((x % 3) + 2) % 3;
    const g1 = t1 + ((g % 3) + 1) % 3;
    const g2 = t1 + ((g % 3) + 2) % 3;
    const a = V[x]!;
    const b = V[x1]!;
    const c = V[x2]!;
    const d = V[g2]!;
    if (c === d) continue;
    const qab = Q[x]!;
    const qbc = Q[x1]!;
    const qca = Q[x2]!;
    const qad = Q[g1]!;
    const qdb = Q[g2]!;
    // aufgefaltet: a = (0, 0), b = (lab, 0), c oberhalb, d unterhalb
    const lab = Math.sqrt(qab);
    const cx = (qab + qca - qbc) / (2 * lab);
    const cy = Math.sqrt(Math.max(0, qca - cx * cx));
    const dx = (qab + qad - qdb) / (2 * lab);
    const dy = -Math.sqrt(Math.max(0, qad - dx * dx));
    const qcd = (cx - dx) * (cx - dx) + (cy - dy) * (cy - dy);
    if (!(qcd > 1e-24)) continue;
    const zg2 = zwilling[g2]!;
    const zx1 = zwilling[x1]!;
    const zg1 = zwilling[g1]!;
    const zx2 = zwilling[x2]!;
    const fg2 = fix[g2]!;
    const fx1 = fix[x1]!;
    const fg1 = fix[g1]!;
    const fx2 = fix[x2]!;
    // neu: Dreieck von x = (d, b, c), Dreieck von g = (a, d, c)
    const setze = (slot: number, von: number, q: number, z: number, f: number) => {
      V[slot] = von;
      Q[slot] = q;
      zwilling[slot] = z;
      fix[slot] = f;
      if (z >= 0) zwilling[z] = slot;
    };
    setze(t0, d, qdb, zg2, fg2);
    setze(t0 + 1, b, qbc, zx1, fx1);
    setze(t0 + 2, c, qcd, t1 + 1, 0);
    setze(t1, a, qad, zg1, fg1);
    setze(t1 + 1, d, qcd, t0 + 2, 0);
    setze(t1 + 2, c, qca, zx2, fx2);
    for (let e = 0; e < 3; e++) {
      cot[t0 + e] = cotX(t0 + e);
      cot[t1 + e] = cotX(t1 + e);
    }
    flips++;
    for (const s of [t0, t0 + 1, t1, t1 + 2]) {
      const z = zwilling[s]!;
      const k = z >= 0 && z < s ? z : s;
      if (!drin[k]) {
        drin[k] = 1;
        stapel[oben++] = k;
      }
    }
  }
  // Gewichte je Halbkante a→b (Eintrag bei a): ½ cot gegenüber aus beiden Dreiecken
  const start = new Int32Array(n + 1);
  for (let x = 0; x < m; x++) start[V[x]! + 1]!++;
  for (let v = 0; v < n; v++) start[v + 1] = start[v + 1]! + start[v]!;
  const nb = new Int32Array(m);
  const w = new Float64Array(m);
  const l2 = new Float64Array(m);
  const fuell = start.slice(0, n);
  for (let x = 0; x < m; x++) {
    const a = V[x]!;
    const g = zwilling[x]!;
    const gewicht = 0.5 * (cot[x]! + (g >= 0 ? cot[g]! : 0));
    const k = fuell[a]!++;
    nb[k] = V[x - (x % 3) + ((x % 3) + 1) % 3]!;
    w[k] = gewicht > 0 ? gewicht : 0;
    l2[k] = Q[x]!;
  }
  return { start, nb, w, l2, flips };
}

/**
 * Die Hälfte des Netzes für die Rechnung auf der Hälfte (D1, 18.11.2026): die Dreiecke einer Seite der Mittelebene. Die Kanten in
 * der Mittelebene (beide Enden sind ihr eigenes Spiegelbild) sind ihr Rand. Welche Seite es ist, steht je zusammenhängendem Stück
 * fest (wo es geht, z > 0); die andere ist ihr Spiegelbild.
 */
export type HalbNetz = {
  /** je Halbkante der Hälfte der Punkt, von dem sie ausgeht (3 je Dreieck der Hälfte, im Umlaufsinn) */
  V: Int32Array;
  /** ihr Zwilling in der Hälfte (−1: keiner; dann liegt sie in der Mittelebene oder am Rand eines offenen Netzes) */
  zwilling: Int32Array;
  /** die Punkte der Hälfte, auch die der Mittelebene; jeder andere Punkt ist das Spiegelbild eines von ihnen */
  punkte: Int32Array;
};

const halbNetze = new WeakMap<Uint32Array, { spiegel: Int32Array; netz: HalbNetz | null }>();

/**
 * Die Hälfte eines spiegelgleichen Netzes; null, wenn es keine gibt: ein Punkt ohne Spiegelbild, eine Kante oder ein Dreieck quer
 * über die Mittelebene, ein verkehrt herum gespeichertes Dreieck (dann wird wie bisher über die ganze Haut gerechnet). Je
 * Dreiecksliste einmal gerechnet.
 */
export function halbNetzVon(h: Haut): HalbNetz | null {
  const da = halbNetze.get(h.tri);
  if (da && da.spiegel === h.spiegel) return da.netz;
  const netz = halbNetzBauen(h);
  halbNetze.set(h.tri, { spiegel: h.spiegel, netz });
  return netz;
}

function halbNetzBauen(h: Haut): HalbNetz | null {
  const n = h.n;
  const sp = h.spiegel;
  const T = h.tri;
  for (let v = 0; v < n; v++) if (sp[v]! < 0 || sp[sp[v]!] !== v) return null;
  // die Seite je Punkt: +1, −1, 0 in der Mittelebene. Punkte, die eine Kante verbindet, liegen auf derselben Seite
  const seite = new Int8Array(n);
  const gesetzt = new Uint8Array(n);
  for (let v = 0; v < n; v++) if (sp[v] === v) gesetzt[v] = 1;
  const reihe = new Int32Array(n);
  for (let v0 = 0; v0 < n; v0++) {
    if (gesetzt[v0]) continue;
    const z = h.pos[3 * v0 + 2]!;
    const s0 = z > 0 || (z === 0 && v0 < sp[v0]!) ? 1 : -1;
    seite[v0] = s0;
    seite[sp[v0]!] = -s0;
    gesetzt[v0] = 1;
    gesetzt[sp[v0]!] = 1;
    let ende = 0;
    reihe[ende++] = v0;
    for (let q = 0; q < ende; q++) {
      const v = reihe[q]!;
      for (const u of h.nachbarn[v]!) {
        if (sp[u] === u) continue;
        if (gesetzt[u]) {
          // eine Kante quer über die Mittelebene
          if (seite[u] !== seite[v]) return null;
          continue;
        }
        seite[u] = seite[v]!;
        seite[sp[u]!] = -seite[v]!;
        gesetzt[u] = 1;
        gesetzt[sp[u]!] = 1;
        reihe[ende++] = u;
      }
    }
  }
  // die Dreiecke der Seite +1
  const liste: number[] = [];
  for (let t = 0; t < T.length; t += 3) {
    const s = seite[T[t]!]! || seite[T[t + 1]!]! || seite[T[t + 2]!]!;
    // ganz in der Mittelebene: Das Dreieck wäre sein eigenes Spiegelbild
    if (s === 0) return null;
    if (s > 0) liste.push(t);
  }
  if (2 * liste.length !== T.length / 3) return null;
  const m = 3 * liste.length;
  const V = new Int32Array(m);
  liste.forEach((t, i) => {
    V[3 * i] = T[t]!;
    V[3 * i + 1] = T[t + 1]!;
    V[3 * i + 2] = T[t + 2]!;
  });
  // Zwillinge in der Hälfte: Halbkanten nach (von, zu) sortiert, der Zwilling von a→b ist b→a
  const schl = new Float64Array(m);
  const idx = new Int32Array(m);
  for (let x = 0; x < m; x++) {
    const a = V[x]!;
    const b = V[x - (x % 3) + ((x % 3) + 1) % 3]!;
    schl[x] = Math.min(a, b) * n + Math.max(a, b);
    idx[x] = x;
  }
  idx.sort((p, q) => schl[p]! - schl[q]!);
  const zwilling = new Int32Array(m).fill(-1);
  for (let k = 0; k + 1 < m; k++) {
    const p = idx[k]!;
    const q = idx[k + 1]!;
    if (schl[p] === schl[q] && zwilling[p] === -1 && zwilling[q] === -1) {
      // Zwei Dreiecke durchlaufen die Kante im selben Sinn (eines ist verkehrt herum gespeichert): Dort hängt die Triangulierung an
      // der Reihenfolge der Dreiecke, die Hälfte gäbe anderes als die ganze Haut. Dann wie bisher über die ganze Haut
      if (V[p] === V[q]) return null;
      zwilling[p] = q;
      zwilling[q] = p;
      k++;
    }
  }
  const punkte: number[] = [];
  for (let v = 0; v < n; v++) if (seite[v]! >= 0) punkte.push(v);
  return { V, zwilling, punkte: Int32Array.from(punkte) };
}

/**
 * Wie `intrinsischeGewichte`, auf der Hälfte gerechnet (D1, 18.11.2026): trianguliert wird nur die Hälfte `H`; die Kanten der
 * Mittelebene sind ihr Rand und werden deshalb nie geklappt (wie mit `fest` über die ganze Haut, `HautAusKurven.festGefaltet`). Die
 * Gewichte der anderen Hälfte sind dieselben, gespiegelt; das Gewicht einer Kante der Mittelebene ist der Kotangens ihres einen
 * Gegenwinkels (der andere ist sein Spiegelbild). Das Ergebnis hat Zeilen für alle Punkte wie über die ganze Haut gerechnet.
 */
export function intrinsischeGewichteHalb(h: Haut, H: HalbNetz, fest: ((a: number, b: number) => boolean) | null = null): IntrinsischeGewichte {
  const P = h.pos;
  const sp = h.spiegel;
  const n = h.n;
  const m = H.V.length;
  const V = Int32Array.from(H.V);
  const zwilling = Int32Array.from(H.zwilling);
  const Q = new Float64Array(m);
  const fix = new Uint8Array(m);
  for (let x = 0; x < m; x++) {
    const a = V[x]!;
    const b = V[x - (x % 3) + ((x % 3) + 1) % 3]!;
    const dx = P[3 * a]! - P[3 * b]!;
    const dy = P[3 * a + 1]! - P[3 * b + 1]!;
    const dz = P[3 * a + 2]! - P[3 * b + 2]!;
    Q[x] = dx * dx + dy * dy + dz * dz;
    if (fest && fest(a, b)) fix[x] = 1;
  }
  if (fest) for (let x = 0; x < m; x++) if (zwilling[x]! >= 0 && fix[zwilling[x]!]) fix[x] = 1;
  const cotX = (x: number): number => {
    const t = x - (x % 3);
    const e = x % 3;
    const C = Q[x]!;
    const A = Q[t + ((e + 1) % 3)]!;
    const B = Q[t + ((e + 2) % 3)]!;
    const s = A + B - C;
    const f = 4 * A * B - s * s;
    return s / Math.sqrt(f > 1e-24 ? f : 1e-24);
  };
  const cot = new Float64Array(m);
  for (let x = 0; x < m; x++) cot[x] = cotX(x);
  const stapel = new Int32Array(m);
  let oben = 0;
  const drin = new Uint8Array(m);
  for (let x = 0; x < m; x++) {
    const g = zwilling[x]!;
    if (g < 0 || g < x) continue;
    stapel[oben++] = x;
    drin[x] = 1;
  }
  let flips = 0;
  const schranke = 20 * m;
  while (oben > 0 && flips < schranke) {
    const x = stapel[--oben]!;
    drin[x] = 0;
    const g = zwilling[x]!;
    if (g < 0 || fix[x]) continue;
    if (cot[x]! + cot[g]! >= -1e-12) continue;
    // Raute: x = a→b im Dreieck (a, b, c), g = b→a im Dreieck (b, a, d)
    const t0 = x - (x % 3);
    const t1 = g - (g % 3);
    const x1 = t0 + ((x % 3) + 1) % 3;
    const x2 = t0 + ((x % 3) + 2) % 3;
    const g1 = t1 + ((g % 3) + 1) % 3;
    const g2 = t1 + ((g % 3) + 2) % 3;
    const a = V[x]!;
    const b = V[x1]!;
    const c = V[x2]!;
    const d = V[g2]!;
    if (c === d) continue;
    const qab = Q[x]!;
    const qbc = Q[x1]!;
    const qca = Q[x2]!;
    const qad = Q[g1]!;
    const qdb = Q[g2]!;
    const lab = Math.sqrt(qab);
    const cx = (qab + qca - qbc) / (2 * lab);
    const cy = Math.sqrt(Math.max(0, qca - cx * cx));
    const dx = (qab + qad - qdb) / (2 * lab);
    const dy = -Math.sqrt(Math.max(0, qad - dx * dx));
    const qcd = (cx - dx) * (cx - dx) + (cy - dy) * (cy - dy);
    if (!(qcd > 1e-24)) continue;
    const zg2 = zwilling[g2]!;
    const zx1 = zwilling[x1]!;
    const zg1 = zwilling[g1]!;
    const zx2 = zwilling[x2]!;
    const fg2 = fix[g2]!;
    const fx1 = fix[x1]!;
    const fg1 = fix[g1]!;
    const fx2 = fix[x2]!;
    const setze = (slot: number, von: number, q: number, z: number, f: number) => {
      V[slot] = von;
      Q[slot] = q;
      zwilling[slot] = z;
      fix[slot] = f;
      if (z >= 0) zwilling[z] = slot;
    };
    setze(t0, d, qdb, zg2, fg2);
    setze(t0 + 1, b, qbc, zx1, fx1);
    setze(t0 + 2, c, qcd, t1 + 1, 0);
    setze(t1, a, qad, zg1, fg1);
    setze(t1 + 1, d, qcd, t0 + 2, 0);
    setze(t1 + 2, c, qca, zx2, fx2);
    for (let e = 0; e < 3; e++) {
      cot[t0 + e] = cotX(t0 + e);
      cot[t1 + e] = cotX(t1 + e);
    }
    flips++;
    for (const s of [t0, t0 + 1, t1, t1 + 2]) {
      const z = zwilling[s]!;
      const k = z >= 0 && z < s ? z : s;
      if (!drin[k]) {
        drin[k] = 1;
        stapel[oben++] = k;
      }
    }
  }
  // Zeilen für alle Punkte: je Halbkante a→b der Hälfte ein Eintrag bei a (→ b) und der ihres Spiegelbilds. Spiegeln kehrt den
  // Umlaufsinn um: Das Spiegelbild von a→b ist b′→a′, sein Eintrag steht bei b′ (→ a′). So stimmt es auch für die Kanten der
  // Mittelebene (dort ist es b→a, die Halbkante des gespiegelten Dreiecks) und dort, wo zwei Dreiecke eine Kante im selben Sinn
  // durchlaufen (ein verkehrt herum gespeichertes Dreieck; über die ganze Haut gerechnet stehen dann beide Einträge bei a)
  const start = new Int32Array(n + 1);
  for (let x = 0; x < m; x++) {
    start[V[x]! + 1]!++;
    start[sp[V[x - (x % 3) + ((x % 3) + 1) % 3]!]! + 1]!++;
  }
  for (let v = 0; v < n; v++) start[v + 1] = start[v + 1]! + start[v]!;
  const nb = new Int32Array(2 * m);
  const w = new Float64Array(2 * m);
  const l2 = new Float64Array(2 * m);
  const fuell = start.slice(0, n);
  for (let x = 0; x < m; x++) {
    const a = V[x]!;
    const b = V[x - (x % 3) + ((x % 3) + 1) % 3]!;
    const g = zwilling[x]!;
    // ohne Zwilling in der Hälfte: in der Mittelebene ist der zweite Gegenwinkel das Spiegelbild des ersten; sonst ein offener Rand
    const gewicht = g >= 0 ? 0.5 * (cot[x]! + cot[g]!) : sp[a] === a && sp[b] === b ? cot[x]! : 0.5 * cot[x]!;
    const wert = gewicht > 0 ? gewicht : 0;
    const k = fuell[a]!++;
    nb[k] = b;
    w[k] = wert;
    l2[k] = Q[x]!;
    const b2 = sp[b]!;
    const k2 = fuell[b2]!++;
    nb[k2] = sp[a]!;
    w[k2] = wert;
    l2[k2] = Q[x]!;
  }
  return { start, nb, w, l2, flips: 2 * flips };
}
