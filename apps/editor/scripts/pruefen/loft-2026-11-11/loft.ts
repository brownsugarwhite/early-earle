// Loft-Messung (11.11.2026, Florians Frage nach Plasticity): eine Fläche direkt aus den Kurven, ohne Löser.
//
// Ein Schlauch: Querschnitte = Ringe (halb gezeichnet von der Mittelebene zur Mittelebene, die andere Hälfte gespiegelt), zwei
// Führungen = die Seitenlinie (Mitte) oben und unten zwischen den Ringen, wahlweise eine dritte Führung längs der Flanke und eine
// Spitze (dort, wo die Seitenlinie hinter dem letzten Ring umkehrt). In CAD heißt das „Loft mit Führungskurven“ bzw. „Sweep über
// zwei Schienen“: Die Fläche geht genau durch alle Ringe und genau durch die Seitenlinie; dazwischen wird die Form der Ringe (im
// Rahmen ihrer Sehne) weich überblendet. Alles geschlossene Formeln, kein Netz, kein Ausgleich.
//
// Nur Messcode: Die Schläuche sind von Hand benannt (welche Ringe in welcher Reihenfolge); Abzweigungen kann ein Loft nicht.

export type V = [number, number, number];
export type Poly = { P: Float64Array; cum: Float64Array; len: number; zu: boolean; n: number };

export function poly(L: ArrayLike<number>, zu: boolean): Poly {
  const n = L.length / 3;
  const P = Float64Array.from(L);
  const m = zu ? n + 1 : n;
  const cum = new Float64Array(m);
  for (let i = 1; i < m; i++) {
    const a = (i - 1) % n;
    const b = i % n;
    cum[i] = cum[i - 1]! + Math.hypot(P[3 * b]! - P[3 * a]!, P[3 * b + 1]! - P[3 * a + 1]!, P[3 * b + 2]! - P[3 * a + 2]!);
  }
  return { P, cum, len: cum[m - 1]!, zu, n };
}

/** Punkt bei der Bogenlänge s: glatt durch die Stützpunkte (Catmull-Rom), geschlossen läuft s um */
export function bei(p: Poly, s: number): V {
  if (p.zu) s = ((s % p.len) + p.len) % p.len;
  else s = Math.min(p.len, Math.max(0, s));
  let lo = 0;
  let hi = p.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (p.cum[mid]! <= s) lo = mid;
    else hi = mid;
  }
  const h = p.cum[hi]! - p.cum[lo]!;
  const f = h > 1e-12 ? (s - p.cum[lo]!) / h : 0;
  const ix = (i: number): number => (p.zu ? ((i % p.n) + p.n) % p.n : Math.min(p.n - 1, Math.max(0, i)));
  const i0 = ix(lo - 1);
  const i1 = ix(lo);
  const i2 = ix(lo + 1);
  const i3 = ix(lo + 2);
  const f2 = f * f;
  const f3 = f2 * f;
  const out: V = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const a = p.P[3 * i0 + k]!;
    const b = p.P[3 * i1 + k]!;
    const c = p.P[3 * i2 + k]!;
    const d = p.P[3 * i3 + k]!;
    out[k] = 0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - d) * f2 + (3 * b - a - 3 * c + d) * f3);
  }
  return out;
}

/** nächste Stelle der Linie zu q (auf den Sehnen gesucht): Bogenlänge und Abstand */
export function naechste(p: Poly, q: V): { s: number; d: number } {
  let best = Infinity;
  let bs = 0;
  const m = p.cum.length - 1;
  for (let i = 0; i < m; i++) {
    const a = i % p.n;
    const b = (i + 1) % p.n;
    const ax = p.P[3 * a]!;
    const ay = p.P[3 * a + 1]!;
    const az = p.P[3 * a + 2]!;
    const dx = p.P[3 * b]! - ax;
    const dy = p.P[3 * b + 1]! - ay;
    const dz = p.P[3 * b + 2]! - az;
    const l2 = dx * dx + dy * dy + dz * dz;
    const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((q[0] - ax) * dx + (q[1] - ay) * dy + (q[2] - az) * dz) / l2)) : 0;
    const d = Math.hypot(q[0] - ax - t * dx, q[1] - ay - t * dy, q[2] - az - t * dz);
    if (d < best) {
      best = d;
      bs = p.cum[i]! + t * (p.cum[i + 1]! - p.cum[i]!);
    }
  }
  return { s: bs, d: best };
}

/** monotone, weiche Kurve durch (x_k, y_k) (Fritsch–Carlson): Wert und Ableitung */
function pchip(x: readonly number[], y: readonly number[]): (t: number) => number {
  const n = x.length;
  if (n === 1) return () => y[0]!;
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(x[i + 1]! - x[i]!);
    d.push((y[i + 1]! - y[i]!) / (x[i + 1]! - x[i]!));
  }
  const m: number[] = new Array<number>(n).fill(0);
  m[0] = d[0]!;
  m[n - 1] = d[n - 2]!;
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1]! * d[i]! <= 0 ? 0 : (3 * (h[i - 1]! + h[i]!)) / ((2 * h[i]! + h[i - 1]!) / d[i - 1]! + (h[i]! + 2 * h[i - 1]!) / d[i]!);
  return (t: number): number => {
    let i = 0;
    while (i < n - 2 && t > x[i + 1]!) i++;
    const f = Math.min(1, Math.max(0, (t - x[i]!) / h[i]!));
    const f2 = f * f;
    const f3 = f2 * f;
    return (2 * f3 - 3 * f2 + 1) * y[i]! + (f3 - 2 * f2 + f) * h[i]! * m[i]! + (-2 * f3 + 3 * f2) * y[i + 1]! + (f3 - f2) * h[i]! * m[i + 1]!;
  };
}

export type SchlauchEingabe = {
  /** die Seitenlinie (geschlossen, z = 0), 3 je Stützpunkt */
  mitte: ArrayLike<number>;
  /** halbe Ringe in der Reihenfolge längs des Schlauchs, 3 je Stützpunkt */
  ringe: ArrayLike<number>[];
  /** hinter dem letzten Ring bis zur Spitze schließen */
  spitze: boolean;
  /** dritte Führung längs der Flanke (kreuzt jeden Ring, endet an der Spitze) */
  fuehrung?: ArrayLike<number>;
  /** nur mit einem Ring: Die Spitze liegt auf dem kürzeren (true) oder längeren Bogen der Seitenlinie */
  kurz?: boolean;
};

export type Schlauch = {
  /** Fläche bei u (0 = obere Führung … 1 = untere, halber Ring) und t (Laufmaß längs, 0 … tMax) */
  flaeche: (u: number, t: number) => V;
  /** Laufmaß an den Ringen und (mit Spitze) an der Spitze */
  knoten: number[];
  tMax: number;
  /** was die Ringenden neben der Seitenlinie liegen (größter Abstand) */
  endenNeben: number;
  /** größte Korrektur durch die dritte Führung */
  fuehrungKorrektur: number;
};

const NU_VORLAGE = 96;

export function schlauch(e: SchlauchEingabe): Schlauch {
  const M = poly(e.mitte, true);
  const K = e.ringe.length;
  let R = e.ringe.map((r) => poly(r, false));
  const delta = (a: number, b: number): number => ((((b - a + M.len / 2) % M.len) + M.len) % M.len) - M.len / 2;
  // Enden auf der Seitenlinie; Ring k+1 so herum, dass beide Führungen kurz weiterlaufen
  const sA: number[] = [];
  const sB: number[] = [];
  let neben = 0;
  for (let k = 0; k < K; k++) {
    const r = R[k]!;
    const a = naechste(M, [r.P[0]!, r.P[1]!, r.P[2]!]);
    const b = naechste(M, [r.P[3 * r.n - 3]!, r.P[3 * r.n - 2]!, r.P[3 * r.n - 1]!]);
    neben = Math.max(neben, a.d, b.d);
    if (k > 0 && Math.abs(delta(sA[k - 1]!, b.s)) + Math.abs(delta(sB[k - 1]!, a.s)) < Math.abs(delta(sA[k - 1]!, a.s)) + Math.abs(delta(sB[k - 1]!, b.s))) {
      // umdrehen
      const P = new Float64Array(3 * r.n);
      for (let i = 0; i < r.n; i++) for (let c = 0; c < 3; c++) P[3 * i + c] = r.P[3 * (r.n - 1 - i) + c]!;
      R[k] = poly(P, false);
      sA.push(b.s);
      sB.push(a.s);
    } else {
      sA.push(a.s);
      sB.push(b.s);
    }
  }
  R = R.slice();
  // abgewickelte Stellen der Führungen, Laufmaß
  const uA: number[] = [sA[0]!];
  const uB: number[] = [sB[0]!];
  const knoten: number[] = [0];
  for (let k = 1; k < K; k++) {
    const dA = delta(sA[k - 1]!, sA[k]!);
    const dB = delta(sB[k - 1]!, sB[k]!);
    uA.push(uA[k - 1]! + dA);
    uB.push(uB[k - 1]! + dB);
    knoten.push(knoten[k - 1]! + (Math.abs(dA) + Math.abs(dB)) / 2);
  }
  let spitzeP: V | null = null;
  if (e.spitze) {
    // Bogen von A_K nach B_K, der vom Schlauch wegführt
    let dirA: number;
    if (K > 1) dirA = Math.sign(uA[K - 1]! - uA[K - 2]!) || 1;
    else {
      const d = delta(sA[0]!, sB[0]!);
      const kurz = e.kurz ?? true;
      dirA = kurz ? Math.sign(d) || 1 : -(Math.sign(d) || 1);
    }
    const bogen = ((((sB[K - 1]! - sA[K - 1]!) * dirA) % M.len) + M.len) % M.len;
    const a = bei(M, sA[K - 1]!);
    const b = bei(M, sB[K - 1]!);
    const mid: V = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0];
    let best = -1;
    let bf = 0.5;
    for (let i = 1; i < 400; i++) {
      const p = bei(M, sA[K - 1]! + (dirA * bogen * i) / 400);
      const d = Math.hypot(p[0] - mid[0], p[1] - mid[1]);
      if (d > best) {
        best = d;
        bf = i / 400;
      }
    }
    uA.push(uA[K - 1]! + dirA * bogen * bf);
    uB.push(uB[K - 1]! - dirA * bogen * (1 - bf));
    knoten.push(knoten[K - 1]! + bogen / 2);
    spitzeP = bei(M, uA[K]!);
  }
  const tMax = knoten[knoten.length - 1]!;
  const fA = pchip(knoten, uA);
  const fB = pchip(knoten, uB);
  // Rahmen bei t: Mitte der Sehne, halbe Sehne e1, quer dazu in der Mittelebene q (gleich lang), Maß r
  let richt = 1;
  const rahmenAus = (A: V, B: V): { m: V; e1: V; q: V; r: number } => {
    const e1: V = [(A[0] - B[0]) / 2, (A[1] - B[1]) / 2, 0];
    const r = Math.hypot(e1[0], e1[1]);
    return { m: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, 0], e1, q: [-richt * e1[1], richt * e1[0], 0], r };
  };
  const rahmen = (t: number): { m: V; e1: V; q: V; r: number } => rahmenAus(bei(M, fA(t)), bei(M, fB(t)));
  if (K > 1 || e.spitze) {
    const r0 = rahmen(0);
    const r1 = rahmen(Math.min(tMax, knoten[1]!));
    if (r0.q[0] * (r1.m[0] - r0.m[0]) + r0.q[1] * (r1.m[1] - r0.m[1]) < 0) richt = -1;
  }
  // dritte Führung: Kreuzung je Ring (Stelle u auf dem Ring, Stelle g auf der Führung)
  const G = e.fuehrung ? poly(e.fuehrung, false) : null;
  const uKreuz: number[] = [];
  const gKreuz: number[] = [];
  if (G) {
    for (let k = 0; k < K; k++) {
      const r = R[k]!;
      let best = Infinity;
      let bu = 0.5;
      let bg = 0;
      for (let i = 0; i <= 400; i++) {
        const u = i / 400;
        const x = naechste(G, bei(r, u * r.len));
        if (x.d < best) {
          best = x.d;
          bu = u;
          bg = x.s;
        }
      }
      uKreuz.push(bu);
      gKreuz.push(bg);
    }
  }
  // Form je Ring im eigenen Rahmen: a (längs der Sehne), b (quer in der Mittelebene), c (seitlich), an NU_VORLAGE + 1 Stellen
  const mittelU = G ? uKreuz.reduce((s, x) => s + x, 0) / K : 0.5;
  const stelle = (k: number, w: number): number => {
    // gemeinsamer Parameter w → Stelle auf Ring k: stückweise nach Bogenlänge, die Kreuzung mit der Führung bei mittelU
    if (!G) return w;
    const uk = uKreuz[k]!;
    return w <= mittelU ? (w / mittelU) * uk : uk + ((w - mittelU) / (1 - mittelU)) * (1 - uk);
  };
  const form: Float64Array[] = [];
  for (let k = 0; k < K; k++) {
    const r = R[k]!;
    const A: V = [r.P[0]!, r.P[1]!, 0];
    const B: V = [r.P[3 * r.n - 3]!, r.P[3 * r.n - 2]!, 0];
    const f = rahmenAus(A, B);
    const c = new Float64Array(3 * (NU_VORLAGE + 1));
    const r2 = f.r * f.r;
    for (let j = 0; j <= NU_VORLAGE; j++) {
      const p = bei(r, stelle(k, j / NU_VORLAGE) * r.len);
      const dx = p[0] - f.m[0];
      const dy = p[1] - f.m[1];
      c[3 * j] = (dx * f.e1[0] + dy * f.e1[1]) / r2;
      c[3 * j + 1] = (dx * f.q[0] + dy * f.q[1]) / r2;
      c[3 * j + 2] = p[2] / f.r;
    }
    c[0] = 1;
    c[1] = 0;
    c[2] = 0;
    c[3 * NU_VORLAGE] = -1;
    c[3 * NU_VORLAGE + 1] = 0;
    c[3 * NU_VORLAGE + 2] = 0;
    form.push(c);
  }
  // Steigungen der Form längs (ungleichmäßiges Catmull-Rom), an den Enden einseitig
  const steig: Float64Array[] = [];
  for (let k = 0; k < K; k++) {
    const m = new Float64Array(3 * (NU_VORLAGE + 1));
    for (let i = 0; i < m.length; i++) {
      if (K === 1) continue;
      if (k === 0) m[i] = (form[1]![i]! - form[0]![i]!) / (knoten[1]! - knoten[0]!);
      else if (k === K - 1) m[i] = (form[k]![i]! - form[k - 1]![i]!) / (knoten[k]! - knoten[k - 1]!);
      else {
        const h0 = knoten[k]! - knoten[k - 1]!;
        const h1 = knoten[k + 1]! - knoten[k]!;
        m[i] = (((form[k + 1]![i]! - form[k]![i]!) / h1) * h0 + ((form[k]![i]! - form[k - 1]![i]!) / h0) * h1) / (h0 + h1);
      }
    }
    steig.push(m);
  }
  const formBei = (w: number, t: number): V => {
    const x = Math.min(1, Math.max(0, w)) * NU_VORLAGE;
    const j = Math.min(NU_VORLAGE - 1, Math.floor(x));
    const fj = x - j;
    const lesen = (F: Float64Array, c: number): number => F[3 * j + c]! * (1 - fj) + F[3 * (j + 1) + c]! * fj;
    const out: V = [0, 0, 0];
    if (K === 1 || t >= knoten[K - 1]!) {
      // hinter dem letzten Ring: seine Form, die Steigung klingt aus
      const L = tMax - knoten[K - 1]!;
      const f = L > 1e-9 ? Math.min(1, (t - knoten[K - 1]!) / L) : 0;
      const phi = f * (1 - f) * (1 - f) * L;
      for (let c = 0; c < 3; c++) out[c] = lesen(form[K - 1]!, c) + (K > 1 ? lesen(steig[K - 1]!, c) * phi : 0);
      return out;
    }
    let k = 0;
    while (k < K - 2 && t > knoten[k + 1]!) k++;
    const h = knoten[k + 1]! - knoten[k]!;
    const f = Math.min(1, Math.max(0, (t - knoten[k]!) / h));
    const f2 = f * f;
    const f3 = f2 * f;
    for (let c = 0; c < 3; c++)
      out[c] = (2 * f3 - 3 * f2 + 1) * lesen(form[k]!, c) + (f3 - 2 * f2 + f) * h * lesen(steig[k]!, c) + (-2 * f3 + 3 * f2) * lesen(form[k + 1]!, c) + (f3 - f2) * h * lesen(steig[k + 1]!, c);
    return out;
  };
  const grund = (w: number, t: number): V => {
    const f = rahmen(t);
    const c = formBei(w, t);
    return [f.m[0] + c[0] * f.e1[0] + c[1] * f.q[0], f.m[1] + c[0] * f.e1[1] + c[1] * f.q[1], c[2] * f.r];
  };
  let fuehrungKorrektur = 0;
  let flaeche = grund;
  if (G) {
    // abgewickelte Stellen der Führung an den Ringen und an der Spitze
    const gk = gKreuz.slice();
    if (e.spitze && spitzeP) gk.push(naechste(G, spitzeP).s);
    const kn = knoten.slice(0, gk.length);
    const fg = pchip(kn, gk);
    flaeche = (w: number, t: number): V => {
      const p = grund(w, t);
      const ziel = bei(G, fg(t));
      const ist = grund(mittelU, t);
      const d: V = [ziel[0] - ist[0], ziel[1] - ist[1], ziel[2] - ist[2]];
      const g = w <= mittelU ? Math.sin((Math.PI / 2) * (w / mittelU)) ** 2 : Math.sin((Math.PI / 2) * ((1 - w) / (1 - mittelU))) ** 2;
      // an der Spitze läuft die Korrektur aus (dort ist der Ring ein Punkt)
      return [p[0] + g * d[0], p[1] + g * d[1], p[2] + g * d[2]];
    };
    for (let i = 0; i <= 200; i++) {
      const t = (tMax * i) / 200;
      const ziel = bei(G, fg(t));
      const ist = grund(mittelU, t);
      fuehrungKorrektur = Math.max(fuehrungKorrektur, Math.hypot(ziel[0] - ist[0], ziel[1] - ist[1], ziel[2] - ist[2]));
    }
  }
  return { flaeche, knoten, tMax, endenNeben: neben, fuehrungKorrektur };
}

export type Netz = { pos: Float64Array; tri: Uint32Array; nu: number; nv: number };

/**
 * Die Fläche als Netz: 2·nu Punkte je Ring (zweite Hälfte gespiegelt), rund nv Reihen längs, verteilt nach der Länge der Abschnitte;
 * an jedem Ring liegt eine Reihe (die Ringe liegen damit genau im Netz). Mit Spitze endet es in einem Punkt.
 */
export function schlauchNetz(s: Schlauch, nu: number, nv: number, spitze: boolean): Netz {
  const ring = 2 * nu;
  const ts: number[] = [0];
  for (let k = 0; k + 1 < s.knoten.length; k++) {
    const a = s.knoten[k]!;
    const b = s.knoten[k + 1]!;
    const m = Math.max(1, Math.round((nv * (b - a)) / s.tMax));
    for (let i = 1; i <= m; i++) ts.push(a + ((b - a) * i) / m);
  }
  if (spitze) ts.pop();
  const reihen = ts.length;
  const pos = new Float64Array(3 * (reihen * ring + (spitze ? 1 : 0)));
  for (let i = 0; i < reihen; i++) {
    const t = ts[i]!;
    for (let j = 0; j <= nu; j++) {
      const p = s.flaeche(j / nu, t);
      const a = i * ring + j;
      pos[3 * a] = p[0];
      pos[3 * a + 1] = p[1];
      pos[3 * a + 2] = j === 0 || j === nu ? 0 : p[2];
      if (j > 0 && j < nu) {
        const b = i * ring + (ring - j);
        pos[3 * b] = p[0];
        pos[3 * b + 1] = p[1];
        pos[3 * b + 2] = -p[2];
      }
    }
  }
  const tri: number[] = [];
  for (let i = 0; i < reihen - 1; i++)
    for (let j = 0; j < ring; j++) {
      const a = i * ring + j;
      const b = i * ring + ((j + 1) % ring);
      const c = (i + 1) * ring + j;
      const d = (i + 1) * ring + ((j + 1) % ring);
      tri.push(a, b, d, a, d, c);
    }
  if (spitze) {
    const sp = reihen * ring;
    const p = s.flaeche(0, s.tMax);
    pos[3 * sp] = p[0];
    pos[3 * sp + 1] = p[1];
    pos[3 * sp + 2] = 0;
    const i = reihen - 1;
    for (let j = 0; j < ring; j++) tri.push(i * ring + j, i * ring + ((j + 1) % ring), sp);
  }
  return { pos, tri: Uint32Array.from(tri), nu, nv: reihen };
}

// ---------- Abstand Punkt → Netz ----------

function punktDreieck(p: V, a: V, b: V, c: V): { d: number; q: V } {
  // nach Ericson, Real-Time Collision Detection
  const ab: V = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac: V = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ap: V = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const dot = (x: V, y: V): number => x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  const fertig = (q: V): { d: number; q: V } => ({ d: Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), q });
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return fertig(a);
  const bp: V = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return fertig(b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return fertig([a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]]);
  }
  const cp: V = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return fertig(c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return fertig([a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]]);
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return fertig([b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]);
  }
  const den = 1 / (va + vb + vc);
  const v = vb * den;
  const w = vc * den;
  return fertig([a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]);
}

/** Abstände von Punkten zu einem Netz (über ein Raster der Dreiecke); mit Vorzeichen nach der Seite des nächsten Dreiecks */
export function abstaendeZumNetz(punkte: ArrayLike<number>, wer: ArrayLike<number>, netz: { pos: ArrayLike<number>; tri: ArrayLike<number> }): Float64Array {
  const P = netz.pos;
  const T = netz.tri;
  const nt = T.length / 3;
  // Umlaufsinn des Netzes: Summe (Schwerpunkt − Mitte) · Flächennormale ist das dreifache Volumen (positiv: Normalen zeigen nach außen)
  const mitte: V = [0, 0, 0];
  for (let i = 0; i < P.length; i += 3) for (let c = 0; c < 3; c++) mitte[c] += (P[i + c]! * 3) / P.length;
  const normale = (k: number): V => {
    const a = T[3 * k]!;
    const b2 = T[3 * k + 1]!;
    const c = T[3 * k + 2]!;
    const ux = P[3 * b2]! - P[3 * a]!;
    const uy = P[3 * b2 + 1]! - P[3 * a + 1]!;
    const uz = P[3 * b2 + 2]! - P[3 * a + 2]!;
    const vx = P[3 * c]! - P[3 * a]!;
    const vy = P[3 * c + 1]! - P[3 * a + 1]!;
    const vz = P[3 * c + 2]! - P[3 * a + 2]!;
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  };
  let vol = 0;
  for (let k = 0; k < nt; k++) {
    const nrm = normale(k);
    const a = T[3 * k]!;
    vol += (P[3 * a]! - mitte[0]) * nrm[0] + (P[3 * a + 1]! - mitte[1]) * nrm[1] + (P[3 * a + 2]! - mitte[2]) * nrm[2];
  }
  const sinn = vol >= 0 ? 1 : -1;
  const lo: V = [Infinity, Infinity, Infinity];
  const hi: V = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let c = 0; c < 3; c++) {
    lo[c] = Math.min(lo[c]!, P[i + c]!);
    hi[c] = Math.max(hi[c]!, P[i + c]!);
  }
  let kante = 0;
  for (let k = 0; k < nt; k++) {
    const a = T[3 * k]!;
    const b = T[3 * k + 1]!;
    kante += Math.hypot(P[3 * a]! - P[3 * b]!, P[3 * a + 1]! - P[3 * b + 1]!, P[3 * a + 2]! - P[3 * b + 2]!);
  }
  const zelle = Math.max(1e-6, (3 * kante) / nt);
  const dim = [0, 1, 2].map((c) => Math.max(1, Math.ceil((hi[c]! - lo[c]!) / zelle) + 1));
  const karte = new Map<number, number[]>();
  const schluessel = (x: number, y: number, z: number): number => (x * dim[1]! + y) * dim[2]! + z;
  for (let k = 0; k < nt; k++) {
    const mn = [Infinity, Infinity, Infinity];
    const mx = [-Infinity, -Infinity, -Infinity];
    for (let e = 0; e < 3; e++) for (let c = 0; c < 3; c++) {
      const v = P[3 * T[3 * k + e]! + c]!;
      mn[c] = Math.min(mn[c]!, v);
      mx[c] = Math.max(mx[c]!, v);
    }
    const a = mn.map((v, c) => Math.floor((v - lo[c]!) / zelle));
    const b = mx.map((v, c) => Math.floor((v - lo[c]!) / zelle));
    for (let x = a[0]!; x <= b[0]!; x++) for (let y = a[1]!; y <= b[1]!; y++) for (let z = a[2]!; z <= b[2]!; z++) {
      const s = schluessel(x, y, z);
      const l = karte.get(s);
      if (l) l.push(k);
      else karte.set(s, [k]);
    }
  }
  const out = new Float64Array(wer.length);
  for (let n = 0; n < wer.length; n++) {
    const v = wer[n]!;
    const p: V = [punkte[3 * v]!, punkte[3 * v + 1]!, punkte[3 * v + 2]!];
    const z = p.map((x, c) => Math.floor((x - lo[c]!) / zelle));
    let best = Infinity;
    let bq: V = p;
    let bk = -1;
    for (let rad = 0; rad < 400; rad++) {
      if (best < (rad - 1) * zelle) break;
      for (let x = z[0]! - rad; x <= z[0]! + rad; x++) for (let y = z[1]! - rad; y <= z[1]! + rad; y++) for (let zz = z[2]! - rad; zz <= z[2]! + rad; zz++) {
        if (Math.max(Math.abs(x - z[0]!), Math.abs(y - z[1]!), Math.abs(zz - z[2]!)) !== rad) continue;
        if (x < 0 || y < 0 || zz < 0 || x >= dim[0]! || y >= dim[1]! || zz >= dim[2]!) continue;
        const l = karte.get(schluessel(x, y, zz));
        if (!l) continue;
        for (const k of l) {
          const a = T[3 * k]!;
          const b = T[3 * k + 1]!;
          const c = T[3 * k + 2]!;
          const r = punktDreieck(p, [P[3 * a]!, P[3 * a + 1]!, P[3 * a + 2]!], [P[3 * b]!, P[3 * b + 1]!, P[3 * b + 2]!], [P[3 * c]!, P[3 * c + 1]!, P[3 * c + 2]!]);
          if (r.d < best) {
            best = r.d;
            bq = r.q;
            bk = k;
          }
        }
      }
    }
    // Vorzeichen: außen (+), wenn der Punkt auf der Außenseite des nächsten Dreiecks liegt
    if (bk < 0) {
      out[n] = NaN;
      continue;
    }
    const nrm = normale(bk);
    const aussen = sinn * ((p[0] - bq[0]) * nrm[0] + (p[1] - bq[1]) * nrm[1] + (p[2] - bq[2]) * nrm[2]) >= 0;
    out[n] = aussen ? best : -best;
  }
  return out;
}
