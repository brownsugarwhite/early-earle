// Teil A (Plan „Maul als Einsatz“, Entwurf 3.1), Schritt A6: Lippenkanten exakt auf den Linien. Die Lippenschleife ist eine
// unendlich scharfe Falte; ihre Grenzkurve hängt nur von den Schleifenpunkten ab: Faltenpunkt (6P + o₁ + o₂)/8, Faltenkante =
// Mitte, Grenzlage (4P + o₁ + o₂)/6 — das ist der gleichmäßige kubische B-Spline der Schleife. An der Naht setzt er sich mit
// dem Spiegelbild fort (U₋₁ = Spiegel von U₁), am Mundwinkel (Ecke: P bleibt, Kantenpunkt = Mitte) ist er mit dem
// Phantompunkt 2c − U_{m−1} eingespannt und läuft genau durch c. Je Lippenseite (U₀ … U_{m−1}, c) werden die Punkte deshalb je
// Koordinate durch kleinste Quadrate an die gezeichnete Linie gelegt: Grenzlage am Anfang = Anfang der Linie (auf der Naht,
// als Gleichung eliminiert), c = Endpunkt der Linie, Zuordnung der Knoten nach den Lippenanteilen aus A5, danach zwei bis
// drei Runden mit nachgeführten Fußpunkten. Prüfung: beidseitiger Hausdorff-Abstand in Seite (x, y), Front (z, y), Top
// (x, z) und 3D. DOM-frei.

type V3 = [number, number, number];

/** px je Welteinheit (Blatt bei 461 px je Kachel) */
const PX = 461;

export type LippenAnpassung = {
  /** Kontrollpunkte der Lippenseite: U₀ (z = 0) … U_{m−1}, c */
  punkte: V3[];
  /** beidseitiger Hausdorff-Abstand in px je Ansicht und in 3D; dazu Anfang und Mundwinkel */
  fehler: { seite: number; front: number; top: number; raum: number; anfang: number; winkel: number };
  /** 95-%-Wert des Abstands (3D, Kurve → Linie) in px */
  p95: number;
};

/** Punkt der Lippen-Grenzkurve bei s ∈ [0, m] (Spanne ⌊s⌋), Kontrollpunkte U₀ … U_{m−1}, c. */
export function lippenPunkt(punkte: readonly V3[], s: number): V3 {
  const m = punkte.length - 1;
  const P = (k: number): V3 => {
    if (k === -1) return [punkte[1]![0], punkte[1]![1], -punkte[1]![2]];
    if (k === m + 1) return [2 * punkte[m]![0] - punkte[m - 1]![0], 2 * punkte[m]![1] - punkte[m - 1]![1], 2 * punkte[m]![2] - punkte[m - 1]![2]];
    return punkte[k]!;
  };
  const i = Math.min(m - 1, Math.max(0, Math.floor(s)));
  const t = s - i;
  const b = basis(t);
  const out: V3 = [0, 0, 0];
  for (let j = 0; j < 4; j++) {
    const q = P(i - 1 + j);
    for (let d = 0; d < 3; d++) out[d] = out[d]! + b[j]! * q[d]!;
  }
  return out;
}

/** Gleichmäßige kubische B-Spline-Basis auf einer Spanne. */
function basis(t: number): [number, number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  return [(1 - t) ** 3 / 6, (3 * t3 - 6 * t2 + 4) / 6, (-3 * t3 + 3 * t2 + 3 * t + 1) / 6, t3 / 6];
}

/** Grenzkurve dicht abgetastet (s = 0 … m). */
export function lippenKurve(punkte: readonly V3[], proSpanne = 64): V3[] {
  const m = punkte.length - 1;
  const out: V3[] = [];
  for (let i = 0; i <= m * proSpanne; i++) out.push(lippenPunkt(punkte, i / proSpanne));
  return out;
}

/**
 * Krümmungsgewichteter Parameter einer Linie (dicht abgetastet): T(f) für den Bogenlängenanteil f ∈ [0, 1], mit der Dichte
 * ρ = (1 + γ·κ·L)^½ (κ geglättet über neun Stützstellen). Ein B-Spline mit Knoten gleichmäßig in T hat dort enge Knoten, wo
 * die Linie sich biegt (runder Anfang, Haken): Der Fehler einer Spanne wächst mit κ·h², gemessen reicht γ = 4 (darüber
 * gesättigt).
 */
export function kruemmungsParameter(ziel: readonly V3[], gamma = 4): (f: number) => number {
  const n = ziel.length;
  const s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1]! + Math.hypot(ziel[i]![0] - ziel[i - 1]![0], ziel[i]![1] - ziel[i - 1]![1], ziel[i]![2] - ziel[i - 1]![2]));
  const L = s[n - 1]! || 1;
  const kappa = new Float64Array(n);
  for (let i = 1; i + 1 < n; i++) {
    const a = ziel[i - 1]!;
    const b = ziel[i]!;
    const c = ziel[i + 1]!;
    const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v: V3 = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
    const lu = Math.hypot(...u);
    const lv = Math.hypot(...v);
    if (!(lu > 0 && lv > 0)) continue;
    const cs = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv);
    kappa[i] = Math.acos(Math.max(-1, Math.min(1, cs))) / (0.5 * (lu + lv));
  }
  if (n > 2) {
    kappa[0] = kappa[1]!;
    kappa[n - 1] = kappa[n - 2]!;
  }
  const glatt = Array.from(kappa, (_, i) => {
    let summe = 0;
    let z = 0;
    for (let j = Math.max(0, i - 4); j <= Math.min(n - 1, i + 4); j++) {
      summe += kappa[j]!;
      z++;
    }
    return summe / z;
  });
  const T = [0];
  for (let i = 1; i < n; i++) T.push(T[i - 1]! + (s[i]! - s[i - 1]!) * 0.5 * (Math.sqrt(1 + gamma * glatt[i - 1]! * L) + Math.sqrt(1 + gamma * glatt[i]! * L)));
  const TL = T[n - 1]! || 1;
  return (f: number) => {
    const x = Math.min(1, Math.max(0, f)) * L;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (s[mid]! <= x) lo = mid;
      else hi = mid;
    }
    const d = s[hi]! - s[lo]!;
    const t = d > 0 ? (x - s[lo]!) / d : 0;
    return (T[lo]! + t * (T[hi]! - T[lo]!)) / TL;
  };
}

/** Polylinie nach Bogenlänge: Länge je Stützstelle, Punkt bei Bogenlänge σ, nächster Punkt (σ) im Fenster. */
function polylinie(ziel: readonly V3[]) {
  const s = [0];
  for (let i = 1; i < ziel.length; i++) s.push(s[i - 1]! + Math.hypot(ziel[i]![0] - ziel[i - 1]![0], ziel[i]![1] - ziel[i - 1]![1], ziel[i]![2] - ziel[i - 1]![2]));
  const L = s[s.length - 1]!;
  const bei = (sigma: number): V3 => {
    const x = Math.min(L, Math.max(0, sigma));
    let lo = 0;
    let hi = s.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (s[mid]! <= x) lo = mid;
      else hi = mid;
    }
    const d = s[hi]! - s[lo]!;
    const t = d > 0 ? (x - s[lo]!) / d : 0;
    const a = ziel[lo]!;
    const b = ziel[hi]!;
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
  };
  /** Fußpunkt von p auf der Polylinie (Bogenlänge), gesucht in [σ0 − w, σ0 + w] */
  const fuss = (p: V3, sigma0: number, w: number): number => {
    let best = sigma0;
    let bestD = Infinity;
    for (let i = 0; i + 1 < ziel.length; i++) {
      if (s[i + 1]! < sigma0 - w || s[i]! > sigma0 + w) continue;
      const a = ziel[i]!;
      const b = ziel[i + 1]!;
      const e: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const l2 = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
      const t = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * e[0] + (p[1] - a[1]) * e[1] + (p[2] - a[2]) * e[2]) / l2)) : 0;
      const d = Math.hypot(a[0] + t * e[0] - p[0], a[1] + t * e[1] - p[1], a[2] + t * e[2] - p[2]);
      if (d < bestD) {
        bestD = d;
        best = s[i]! + t * (s[i + 1]! - s[i]!);
      }
    }
    return best;
  };
  return { s, L, bei, fuss };
}

/** Abstand eines Punkts zu einer Polylinie in einer Projektion (Achsen a, b; −1 = 3D). */
function abstandZuZug(p: V3, zug: readonly V3[], a: number, b: number): number {
  let best = Infinity;
  for (let i = 0; i + 1 < zug.length; i++) {
    const q = zug[i]!;
    const r = zug[i + 1]!;
    if (a < 0) {
      const e: V3 = [r[0] - q[0], r[1] - q[1], r[2] - q[2]];
      const l2 = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
      const t = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - q[0]) * e[0] + (p[1] - q[1]) * e[1] + (p[2] - q[2]) * e[2]) / l2)) : 0;
      best = Math.min(best, Math.hypot(q[0] + t * e[0] - p[0], q[1] + t * e[1] - p[1], q[2] + t * e[2] - p[2]));
    } else {
      const ex = r[a]! - q[a]!;
      const ey = r[b]! - q[b]!;
      const l2 = ex * ex + ey * ey;
      const t = l2 > 0 ? Math.min(1, Math.max(0, ((p[a]! - q[a]!) * ex + (p[b]! - q[b]!) * ey) / l2)) : 0;
      best = Math.min(best, Math.hypot(q[a]! + t * ex - p[a]!, q[b]! + t * ey - p[b]!));
    }
  }
  return best;
}

/** Beidseitiger Hausdorff-Abstand zweier Polylinien in einer Projektion (px). */
function hausdorff(k: readonly V3[], z: readonly V3[], a: number, b: number): number {
  let h = 0;
  for (const p of k) h = Math.max(h, abstandZuZug(p, z, a, b));
  for (const p of z) h = Math.max(h, abstandZuZug(p, k, a, b));
  return h * PX;
}

/** Kleine symmetrische positiv definite Systeme (Cholesky). */
function loeseSpd(A: Float64Array, b: Float64Array, n: number): Float64Array {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let s = A[i * n + j]!;
      for (let k = 0; k < j; k++) s -= L[i * n + k]! * L[j * n + k]!;
      if (i === j) {
        if (!(s > 0)) throw new Error('Lippe: Normalgleichungen nicht positiv definit');
        L[i * n + i] = Math.sqrt(s);
      } else L[i * n + j] = s / L[j * n + j]!;
    }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i]!;
    for (let k = 0; k < i; k++) s -= L[i * n + k]! * y[k]!;
    y[i] = s / L[i * n + i]!;
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i]!;
    for (let k = i + 1; k < n; k++) s -= L[k * n + i]! * x[k]!;
    x[i] = s / L[i * n + i]!;
  }
  return x;
}

/**
 * Lippenseite an die Linie legen. `ziel` = gezeichnete Linie dicht abgetastet (Welt), Anfang auf der Naht (z = 0), Ende =
 * Mundwinkel; `anteile` = Bogenlängenanteile der Lippenstellen k = 0 … m (aus A5; sonst gleichmäßig).
 */
export function lippeAnpassen(ziel: readonly V3[], m: number, anteile?: ArrayLike<number>, opt: { runden?: number; glaette?: number; proSpanne?: number } = {}): LippenAnpassung {
  if (m < 2) throw new Error(`Lippe: m = ${m} zu klein`);
  const runden = opt.runden ?? 3;
  const proSpanne = opt.proSpanne ?? 16;
  const z = polylinie(ziel);
  const T0 = ziel[0]!;
  const c = ziel[ziel.length - 1]!;
  const a = Array.from({ length: m + 1 }, (_, k) => (anteile ? anteile[k]! : k / m));
  a[0] = 0;
  a[m] = 1;
  // Abtaststellen je Spanne und ihre Zielbogenlänge (Knoten nach den Anteilen, dazwischen linear)
  const stellen: number[] = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < proSpanne; j++) stellen.push(i + (j + 0.5) / proSpanne);
  const sigma = stellen.map((s) => {
    const i = Math.min(m - 1, Math.floor(s));
    return z.L * (a[i]! + (s - i) * (a[i + 1]! - a[i]!));
  });
  // Unbekannte je Koordinate: q_k = P_k für k = 1 … m−1 (n = m − 1). P_m = c fest; P_0 = (3·T0 − q_1)/2 (x, y) bzw. 0 (z);
  // P_−1 = q_1 (x, y) bzw. −q_1 (z); P_{m+1} = 2c − q_{m−1}. Jeder Kurvenpunkt ist affin in q.
  const n = m - 1;
  const glaette = (opt.glaette ?? 1e-6) * stellen.length;
  const punkte: V3[] = Array.from({ length: m + 1 }, (_, k) => z.bei(z.L * a[k]!));
  punkte[0] = [T0[0], T0[1], 0];
  punkte[m] = [c[0], c[1], c[2]];
  // Koeffizienten eines erweiterten Punkts P_k in q (Zeile der Länge n) und Konstante, je Koordinate d
  const erweitert = (k: number, d: number): { w: Map<number, number>; c0: number } => {
    const w = new Map<number, number>();
    const add = (j: number, x: number) => w.set(j, (w.get(j) ?? 0) + x);
    if (k === -1) {
      if (n >= 1) add(0, d === 2 ? -1 : 1);
      return { w, c0: 0 };
    }
    if (k === 0) {
      if (d === 2) return { w, c0: 0 };
      if (n >= 1) add(0, -0.5);
      return { w, c0: 1.5 * T0[d]! };
    }
    if (k === m) return { w, c0: c[d]! };
    if (k === m + 1) {
      add(m - 2, -1);
      return { w, c0: 2 * c[d]! };
    }
    add(k - 1, 1);
    return { w, c0: 0 };
  };
  for (let runde = 0; runde < runden; runde++) {
    for (let d = 0; d < 3; d++) {
      const A = new Float64Array(n * n);
      const b = new Float64Array(n);
      const zeile = (w: Map<number, number>, rechts: number, g: number) => {
        for (const [i, wi] of w) {
          b[i] = b[i]! + g * wi * rechts;
          for (const [j, wj] of w) A[i * n + j] = A[i * n + j]! + g * wi * wj;
        }
      };
      stellen.forEach((s, j) => {
        const i = Math.min(m - 1, Math.floor(s));
        const bs = basis(s - i);
        const w = new Map<number, number>();
        let c0 = 0;
        for (let q = 0; q < 4; q++) {
          const e = erweitert(i - 1 + q, d);
          c0 += bs[q]! * e.c0;
          for (const [k, x] of e.w) w.set(k, (w.get(k) ?? 0) + bs[q]! * x);
        }
        zeile(w, z.bei(sigma[j]!)[d]! - c0, 1);
      });
      // Glätte: zweite Differenzen der erweiterten Punkte k = 0 … m
      for (let k = 0; k <= m; k++) {
        const w = new Map<number, number>();
        let c0 = 0;
        for (const [kk, f] of [
          [k - 1, 1],
          [k, -2],
          [k + 1, 1],
        ] as [number, number][]) {
          const e = erweitert(kk, d);
          c0 += f * e.c0;
          for (const [i, x] of e.w) w.set(i, (w.get(i) ?? 0) + f * x);
        }
        zeile(w, -c0, glaette);
      }
      const x = loeseSpd(A, b, n);
      for (let k = 1; k < m; k++) punkte[k]![d] = x[k - 1]!;
      punkte[0]![d] = d === 2 ? 0 : 1.5 * T0[d]! - 0.5 * x[0]!;
    }
    // Fußpunkte nachführen (Fenster: eine Spanne)
    if (runde + 1 < runden)
      stellen.forEach((s, j) => {
        const p = lippenPunkt(punkte, s);
        const i = Math.min(m - 1, Math.floor(s));
        const w = z.L * Math.max(a[i + 1]! - a[i]!, 1 / m);
        sigma[j] = z.fuss(p, sigma[j]!, w);
      });
  }
  const kurve = lippenKurve(punkte);
  const abst = kurve.map((p) => abstandZuZug(p, ziel, -1, -1) * PX).sort((x, y) => x - y);
  const start = lippenPunkt(punkte, 0);
  const ende = lippenPunkt(punkte, m);
  return {
    punkte,
    fehler: {
      seite: hausdorff(kurve, ziel, 0, 1),
      front: hausdorff(kurve, ziel, 2, 1),
      top: hausdorff(kurve, ziel, 0, 2),
      raum: hausdorff(kurve, ziel, -1, -1),
      anfang: Math.hypot(start[0] - T0[0], start[1] - T0[1], start[2] - T0[2]) * PX,
      winkel: Math.hypot(ende[0] - c[0], ende[1] - c[1], ende[2] - c[2]) * PX,
    },
    p95: abst[Math.floor(0.95 * (abst.length - 1))]!,
  };
}

/** Bogenlängenanteile der Lippenstellen k = 0 … m, gleichmäßig im krümmungsgewichteten Parameter der Linie. */
export function kruemmungsAnteile(ziel: readonly V3[], m: number, gamma = 4): number[] {
  const T = kruemmungsParameter(ziel, gamma);
  const out: number[] = [0];
  for (let k = 1; k < m; k++) {
    // T ist monoton steigend: Halbierung
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 50; i++) {
      const mid = 0.5 * (lo + hi);
      if (T(mid) < k / m) lo = mid;
      else hi = mid;
    }
    out.push(0.5 * (lo + hi));
  }
  out.push(1);
  return out;
}

/** Kleinste Lippenauflösung m (gerade Schritte ab `von`) mit einem Fehler ≤ `grenze` px in jedem Blatt (krümmungsgewichtet). */
export function noetigesM(ziel: readonly V3[], grenze = 1, von = 6, bis = 24): number {
  for (let m = von; m <= bis; m++) {
    const f = lippeAnpassen(ziel, m, kruemmungsAnteile(ziel, m)).fehler;
    if (Math.max(f.seite, f.front, f.top, f.raum) <= grenze) return m;
  }
  return Infinity;
}
