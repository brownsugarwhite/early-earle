// Wesen-Editor „/editor“ (11.11.2026): Lava im Jelly. Florian: „wenn man Hals oder Kopf rauszieht, sollen mehrere dunkle Bubbles im
// Jelly entstehen, immer rund/bohnenförmig, und sich wie Bubbles in einer Lavalampe bewegen, mehr oder weniger unabhängig vom Mesh.“
//
// - Wo: in den dicken Teilen des Körpers. Das Netz wird grob in Würfel zerlegt (innen/außen per Strahl längs x), der Abstand jedes
//   inneren Würfels zum Rand gerechnet (exakte Abstandstransformation); die größten Kugeln, die sich nicht überdecken, sind die Anker
//   (Rumpf, Kopf, Hals). Die Form der Blase kommt vom dicken Kern um den Anker (Hauptachsen der Würfel, die fast so tief innen liegen):
//   im flachen Rumpf eine breite, flache Linse, im Hals eine Bohne längs des Halses, in einer Kugel eine Kugel — immer ein Ellipsoid.
// - Wie: jede Blase ist eine Bohne aus zwei Ellipsoiden (das kleinere schwappt langsam hin und her und kreist ein wenig), atmet und
//   treibt um ihren Anker. Ändert sich die Form, schwimmen die Blasen zu den neuen Ankern; neue wachsen, alte schrumpfen weg.

export type P3 = [number, number, number];
/** Anker: Mitte, Halbmesser der größten Kugel, Hauptachsen (Einheitsvektoren) und Halbachsen der Blase */
export type Anker = { p: P3; r: number; achsen: [P3, P3, P3]; halb: P3 };

/** höchstens so viele Lavabohnen (je zwei Ellipsoide); dazu kommt die Kontaktbohne */
export const MAX_LAVA = 4;
/** Größe der Startkugel (Halbmesser ihrer größten inneren Kugel, Welt): Maß für „größere Skalierung“ */
export const R_BEZUG = 141;

/**
 * Ergebnis der Suche: alle Anker (nach Größe) und die Kontaktbohne unten im größten Teil (achsparallel); nach `lavaPlan` die
 * Lavabohnen und die Teile, die Glanz tragen (der größte und die großen auf der Mittelebene)
 */
export type LavaFund = { anker: Anker[]; kontakt: Anker | null; teile?: Anker[]; feld?: AbstandFeld };
/**
 * Abstand jedes Würfels zur Haut (innen, Welt; außen 0), Würfel x am schnellsten, dann y, dann z; Ursprung (Ecke) und Kantenlänge —
 * für den Glasrand der Kontaktbereiche im Jelly
 */
export type AbstandFeld = { werte: Float32Array; nx: number; ny: number; nz: number; o: P3; h: number; max: number };

/**
 * Florian (11.11. spätabends): „Es gibt immer eine untere dunkle Bohne, die eine Art Kontaktebene zum Boden simulieren soll, und
 * mindestens eine Lavalampen-Bohne, die etwas heller ist … Größere Wesen sollen mehr Lavabohnen haben, aber nur bei großen Köpfen und
 * Bäuchen oder größerer Skalierung.“ Regeln: die Kontaktbohne unten im größten Teil; eine Lavabohne im oberen Teil des größten Teils
 * (bei größerer Skalierung bis zu drei längs seiner Achse); dazu je eine in großen Teilen auf der Mittelebene (Kopf, Bauch; Paare
 * wie Flügel und Beine nicht), groß heißt ≥ 0,62 des größten Teils (bei größerer Skalierung weniger) und ≥ 0,45 der Startkugel.
 */
export function lavaPlan(f: LavaFund): LavaFund {
  const A = f.anker;
  if (!A.length) return { anker: [], kontakt: null, teile: [] };
  const haupt = A[0]!;
  const teile: Anker[] = [haupt];
  const s = haupt.r / R_BEZUG;
  const lava: Anker[] = [];
  const nHaupt = 1 + Math.min(2, Math.floor(Math.max(0, s - 1) / 0.6));
  const e1 = haupt.achsen[0];
  const L = haupt.halb[0];
  const k = nHaupt === 1 ? 0.62 : 0.5;
  for (let i = 0; i < nHaupt; i++) {
    const t = nHaupt === 1 ? 0 : (2 * i) / (nHaupt - 1) - 1;
    const v = 0.45 * L * t;
    lava.push({ p: [haupt.p[0] + e1[0] * v, haupt.p[1] + e1[1] * v + 0.3 * haupt.r, haupt.p[2] + e1[2] * v], r: haupt.r * k, achsen: haupt.achsen, halb: haupt.halb.map((x) => x * k) as P3 });
  }
  const schwelle = Math.max((0.62 / Math.sqrt(Math.max(1, s))) * haupt.r, 0.45 * R_BEZUG);
  for (const a of A.slice(1)) {
    if (lava.length >= MAX_LAVA) break;
    // Paare (Flügel, Beine, Hörner) liegen neben der Mittelebene
    if (Math.abs(a.p[2]) > 0.35 * a.r || a.r < schwelle) continue;
    lava.push({ ...a, halb: a.halb.map((x) => x * 0.8) as P3 });
    teile.push(a);
  }
  return { anker: lava, kontakt: f.kontakt, teile };
}

/** eindimensionale exakte Abstandstransformation (Felzenszwalb–Huttenlocher), quadratische Abstände */
function abstand1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) {
      k--;
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    const dq = q - v[k]!;
    d[q] = dq * dq + f[v[k]!]!;
  }
}

/**
 * Anker der Lava: die größten Kugeln im Körper, die sich nicht überdecken. `pos` Lagen (xyz je Punkt), `index` Dreiecke (geschlossen),
 * `aufloesung` Würfel längs der größten Ausdehnung. Ergebnis nach Größe absteigend.
 */
export function lavaAnker(pos: ArrayLike<number>, index: ArrayLike<number>, aufloesung = 40, max = 7): LavaFund {
  const nP = Math.floor(pos.length / 3);
  if (nP < 4 || index.length < 12) return { anker: [], kontakt: null };
  let x0 = Infinity;
  let y0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < nP; i++) {
    const x = pos[3 * i]!;
    const y = pos[3 * i + 1]!;
    const z = pos[3 * i + 2]!;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    if (z < z0) z0 = z;
    if (z > z1) z1 = z;
  }
  const gross = Math.max(x1 - x0, y1 - y0, z1 - z0);
  if (!(gross > 0)) return { anker: [], kontakt: null };
  const h = gross / aufloesung;
  const RAND = 2;
  const nx = Math.ceil((x1 - x0) / h) + 2 * RAND;
  const ny = Math.ceil((y1 - y0) / h) + 2 * RAND;
  const nz = Math.ceil((z1 - z0) / h) + 2 * RAND;
  const ox = x0 - RAND * h;
  const oy = y0 - RAND * h;
  const oz = z0 - RAND * h;
  // Strahlen längs x durch die Mitten der Würfel (leicht versetzt, damit sie keine Kante und keinen Punkt genau treffen; die
  // Spiegelebene z = 0 liegt nie auf einer Strahlreihe), je Strahl die Durchstoßpunkte
  const JY = 0.0137 * h;
  const JZ = 0.0291 * h;
  const spalten: (number[] | undefined)[] = new Array(ny * nz);
  const nT = Math.floor(index.length / 3);
  for (let t = 0; t < nT; t++) {
    const a = index[3 * t]!;
    const b = index[3 * t + 1]!;
    const c = index[3 * t + 2]!;
    const ay = pos[3 * a + 1]!;
    const az = pos[3 * a + 2]!;
    const by = pos[3 * b + 1]!;
    const bz = pos[3 * b + 2]!;
    const cy = pos[3 * c + 1]!;
    const cz = pos[3 * c + 2]!;
    const det = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    if (Math.abs(det) < 1e-12) continue;
    const jA = Math.max(0, Math.ceil((Math.min(ay, by, cy) - oy - JY) / h - 0.5));
    const jB = Math.min(ny - 1, Math.floor((Math.max(ay, by, cy) - oy - JY) / h - 0.5));
    const kA = Math.max(0, Math.ceil((Math.min(az, bz, cz) - oz - JZ) / h - 0.5));
    const kB = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) - oz - JZ) / h - 0.5));
    for (let j = jA; j <= jB; j++) {
      const py = oy + (j + 0.5) * h + JY;
      for (let k = kA; k <= kB; k++) {
        const pz = oz + (k + 0.5) * h + JZ;
        // baryzentrisch in der yz-Ebene
        const u = ((py - ay) * (cz - az) - (pz - az) * (cy - ay)) / det;
        const v = ((by - ay) * (pz - az) - (bz - az) * (py - ay)) / det;
        if (u < 0 || v < 0 || u + v > 1) continue;
        const x = pos[3 * a]! + u * (pos[3 * b]! - pos[3 * a]!) + v * (pos[3 * c]! - pos[3 * a]!);
        const s = j * nz + k;
        (spalten[s] ??= []).push(x);
      }
    }
  }
  // innen = zwischen dem 1. und 2., 3. und 4. … Durchstoß
  const N = nx * ny * nz;
  const GROSS = 1e20;
  const f = new Float64Array(N);
  const idx = (i: number, j: number, k: number): number => (j * nz + k) * nx + i;
  for (let j = 0; j < ny; j++)
    for (let k = 0; k < nz; k++) {
      const xs = spalten[j * nz + k];
      if (!xs || xs.length < 2) continue;
      xs.sort((p, q) => p - q);
      for (let m = 0; m + 1 < xs.length; m += 2) {
        const iA = Math.max(0, Math.ceil((xs[m]! - ox) / h - 0.5));
        const iB = Math.min(nx - 1, Math.floor((xs[m + 1]! - ox) / h - 0.5));
        for (let i = iA; i <= iB; i++) f[idx(i, j, k)] = GROSS;
      }
    }
  // Abstand jedes inneren Würfels zum nächsten äußeren (quadratisch, in Würfeln): erst längs x, dann y, dann z
  const nMax = Math.max(nx, ny, nz);
  const lf = new Float64Array(nMax);
  const ld = new Float64Array(nMax);
  const lv = new Int32Array(nMax);
  const lz = new Float64Array(nMax + 1);
  const d2 = f;
  for (let j = 0; j < ny; j++)
    for (let k = 0; k < nz; k++) {
      const o = idx(0, j, k);
      for (let i = 0; i < nx; i++) lf[i] = d2[o + i]!;
      abstand1d(lf, nx, ld, lv, lz);
      for (let i = 0; i < nx; i++) d2[o + i] = ld[i]!;
    }
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) lf[j] = d2[idx(i, j, k)]!;
      abstand1d(lf, ny, ld, lv, lz);
      for (let j = 0; j < ny; j++) d2[idx(i, j, k)] = ld[j]!;
    }
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      for (let k = 0; k < nz; k++) lf[k] = d2[idx(i, j, k)]!;
      abstand1d(lf, nz, ld, lv, lz);
      for (let k = 0; k < nz; k++) d2[idx(i, j, k)] = ld[k]!;
    }
  // Kandidaten: örtliche Höchstwerte (auch auf Graten, z. B. längs eines Halses)
  const kand: { i: number; j: number; k: number; d: number }[] = [];
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const w = d2[idx(i, j, k)]!;
        if (w < 4) continue;
        let hoch = true;
        for (let dk = -1; dk <= 1 && hoch; dk++)
          for (let dj = -1; dj <= 1 && hoch; dj++)
            for (let di = -1; di <= 1; di++) {
              if (d2[idx(i + di, j + dj, k + dk)]! > w) {
                hoch = false;
                break;
              }
            }
        if (hoch) kand.push({ i, j, k, d: w });
      }
  kand.sort((p, q) => q.d - p.d);
  const roh: { p: P3; r: number }[] = [];
  let rMax = 0;
  for (const c of kand) {
    // Halbmesser der größten Kugel um die Würfelmitte (der Rand liegt im Mittel einen halben Würfel vor dem äußeren Würfel)
    const r = (Math.sqrt(c.d) - 0.5) * h;
    if (roh.length === 0) rMax = r;
    if (r < 0.24 * rMax || r < 1.5 * h) break;
    const p: P3 = [ox + (c.i + 0.5) * h, oy + (c.j + 0.5) * h, oz + (c.k + 0.5) * h];
    let frei = true;
    for (const a of roh) {
      if (Math.hypot(p[0] - a.p[0], p[1] - a.p[1], p[2] - a.p[2]) < 1.25 * (r + a.r)) {
        frei = false;
        break;
      }
    }
    if (!frei) continue;
    roh.push({ p, r });
    if (roh.length >= max) break;
  }
  // Kern je Anker: innere Würfel, die fast so tief liegen wie er (≥ 0,7 seines Halbmessers) und ihm (gemessen an seiner Größe) am
  // nächsten sind; ihre Hauptachsen geben die Achsen der Blase, ihre Ausdehnung die Länge
  const sum = roh.map(() => ({ n: 0, mx: 0, my: 0, mz: 0, xx: 0, xy: 0, xz: 0, yy: 0, yz: 0, zz: 0 }));
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const w = d2[idx(i, j, k)]!;
        if (w <= 0) continue;
        const rc = (Math.sqrt(w) - 0.5) * h;
        const x = ox + (i + 0.5) * h;
        const y = oy + (j + 0.5) * h;
        const z = oz + (k + 0.5) * h;
        let beste = -1;
        let bd = Infinity;
        roh.forEach((a, n) => {
          const q = Math.hypot(x - a.p[0], y - a.p[1], z - a.p[2]) / a.r;
          if (q < bd) {
            bd = q;
            beste = n;
          }
        });
        if (beste < 0 || bd > 2.4 || rc < 0.7 * roh[beste]!.r) continue;
        const S = sum[beste]!;
        const dx = x - roh[beste]!.p[0];
        const dy = y - roh[beste]!.p[1];
        const dz = z - roh[beste]!.p[2];
        S.n++;
        S.mx += dx;
        S.my += dy;
        S.mz += dz;
        S.xx += dx * dx;
        S.xy += dx * dy;
        S.xz += dx * dz;
        S.yy += dy * dy;
        S.yz += dy * dz;
        S.zz += dz * dz;
      }
  const anker = roh.map((a, n) => {
    const S = sum[n]!;
    const N = Math.max(1, S.n);
    const mx = S.mx / N;
    const my = S.my / N;
    const mz = S.mz / N;
    const C = [
      [S.xx / N - mx * mx, S.xy / N - mx * my, S.xz / N - mx * mz],
      [S.xy / N - mx * my, S.yy / N - my * my, S.yz / N - my * mz],
      [S.xz / N - mx * mz, S.yz / N - my * mz, S.zz / N - mz * mz],
    ];
    const { werte, vektoren } = eigen3(C);
    // Halbachse: gut die Hälfte der Kugel plus ein Teil der Länge des Kerns (so bleibt die Blase mit Spiel im Körper)
    const halb = werte.map((l) => 0.62 * a.r + 0.45 * Math.sqrt(3 * Math.max(0, l))) as P3;
    // die Mitte etwas zur Mitte des Kerns (der Höchstwert liegt auf einem Grat oft am Rand des Kerns)
    const p: P3 = [a.p[0] + 0.5 * mx, a.p[1] + 0.5 * my, a.p[2] + 0.5 * mz];
    return { p, r: a.r, achsen: vektoren, halb };
  });
  // Kontaktbohne: im größten Teil vom Anker abwärts bis zum Rand, auf halbem Weg die Breite nach x und z messen (achsparallel,
  // flach: die Kontaktebene zum Boden)
  let kontakt: Anker | null = null;
  const h0 = roh[0];
  if (h0) {
    const zelle = (x: number, y: number, z: number): boolean => {
      const i = Math.floor((x - ox) / h);
      const j = Math.floor((y - oy) / h);
      const k = Math.floor((z - oz) / h);
      return i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz && d2[idx(i, j, k)]! > 0;
    };
    const lauf = (x: number, y: number, z: number, dx: number, dy: number, dz: number): number => {
      let t = 0;
      while (t < gross && zelle(x + dx * (t + h * 0.5), y + dy * (t + h * 0.5), z + dz * (t + h * 0.5))) t += h * 0.5;
      return t + h * 0.25;
    };
    const [ax, ay, az] = h0.p;
    const unten = lauf(ax, ay, az, 0, -1, 0);
    const yc = ay - 0.5 * unten;
    const xl = lauf(ax, yc, az, -1, 0, 0);
    const xr = lauf(ax, yc, az, 1, 0, 0);
    const zl = lauf(ax, yc, az, 0, 0, -1);
    const zr = lauf(ax, yc, az, 0, 0, 1);
    kontakt = {
      p: [ax + 0.5 * (xr - xl), yc, az + 0.5 * (zr - zl)],
      r: h0.r,
      achsen: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      halb: [0.84 * 0.5 * (xl + xr), 0.38 * unten, 0.84 * 0.5 * (zl + zr)],
    };
  }
  // Abstandsfeld für den Glasrand (x, y, z: x am schnellsten)
  const werte = new Float32Array(nx * ny * nz);
  let dmax = 0;
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const w = d2[idx(i, j, k)]!;
        const d = w > 0 ? Math.max(0, (Math.sqrt(w) - 0.5) * h) : 0;
        werte[i + nx * (j + ny * k)] = d;
        if (d > dmax) dmax = d;
      }
  return { anker, kontakt, feld: { werte, nx, ny, nz, o: [ox, oy, oz], h, max: dmax } };
}

/** Eigenwerte und -vektoren einer symmetrischen 3×3-Matrix (Jacobi), nach Größe absteigend */
function eigen3(A: number[][]): { werte: P3; vektoren: [P3, P3, P3] } {
  const a = A.map((z) => [...z]) as number[][];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let runde = 0; runde < 24; runde++) {
    let p = 0;
    let q = 1;
    let mx = Math.abs(a[0]![1]!);
    if (Math.abs(a[0]![2]!) > mx) {
      mx = Math.abs(a[0]![2]!);
      p = 0;
      q = 2;
    }
    if (Math.abs(a[1]![2]!) > mx) {
      mx = Math.abs(a[1]![2]!);
      p = 1;
      q = 2;
    }
    if (mx < 1e-12) break;
    const th = 0.5 * Math.atan2(2 * a[p]![q]!, a[q]![q]! - a[p]![p]!);
    const c = Math.cos(th);
    const s = Math.sin(th);
    for (let k = 0; k < 3; k++) {
      const akp = a[k]![p]!;
      const akq = a[k]![q]!;
      a[k]![p] = c * akp - s * akq;
      a[k]![q] = s * akp + c * akq;
    }
    for (let k = 0; k < 3; k++) {
      const apk = a[p]![k]!;
      const aqk = a[q]![k]!;
      a[p]![k] = c * apk - s * aqk;
      a[q]![k] = s * apk + c * aqk;
    }
    for (let k = 0; k < 3; k++) {
      const vkp = v[k]![p]!;
      const vkq = v[k]![q]!;
      v[k]![p] = c * vkp - s * vkq;
      v[k]![q] = s * vkp + c * vkq;
    }
  }
  const paare = [0, 1, 2].map((i) => ({ w: a[i]![i]!, e: [v[0]![i]!, v[1]![i]!, v[2]![i]!] as P3 }));
  paare.sort((x, y) => y.w - x.w);
  return { werte: [paare[0]!.w, paare[1]!.w, paare[2]!.w], vektoren: [paare[0]!.e, paare[1]!.e, paare[2]!.e] };
}

/** Form einer Blase als symmetrische Matrix M = Σ Halbachse² · Achse · Achseᵀ (xx, xy, xz, yy, yz, zz): unabhängig von Vorzeichen und
 * Reihenfolge der Achsen, deshalb lässt sie sich ruhig von einer Form zur nächsten überblenden */
export type Matrix6 = [number, number, number, number, number, number];

export function formMatrix(a: Anker): Matrix6 {
  const m: Matrix6 = [0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const e = a.achsen[k]!;
    const q = a.halb[k]! * a.halb[k]!;
    m[0] += q * e[0] * e[0];
    m[1] += q * e[0] * e[1];
    m[2] += q * e[0] * e[2];
    m[3] += q * e[1] * e[1];
    m[4] += q * e[1] * e[2];
    m[5] += q * e[2] * e[2];
  }
  return m;
}

/** Wurzel einer Formmatrix (M^½ = Σ Halbachse · Achse · Achseᵀ) als 3×3 */
function wurzel(m: Matrix6): number[][] {
  const { werte, vektoren } = eigen3([
    [m[0], m[1], m[2]],
    [m[1], m[3], m[4]],
    [m[2], m[4], m[5]],
  ]);
  const W = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let k = 0; k < 3; k++) {
    const sk = Math.sqrt(Math.max(0, werte[k]!));
    const e = vektoren[k]!;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) W[i]![j] = W[i]![j]! + sk * e[i]! * e[j]!;
  }
  return W;
}

/** ein Ellipsoid der Lava: Mitte, Formmatrix (Welt), Ton (Faktor auf die Farbe des Jelly) */
export type LavaForm = { c: P3; m: Matrix6; ton: number };

type Blase = {
  /** Anker (Ziel) und Lage jetzt, Form (Ziel und jetzt), Ton (Ziel und jetzt), Größe (0…1: wächst und schrumpft) */
  ziel: P3;
  p: P3;
  mZiel: Matrix6;
  m: Matrix6;
  tonZiel: number;
  ton: number;
  da: number;
  /** Halbmesser des Ankers (zum Zuordnen) */
  r: number;
  /** eigene Uhr der Bewegung: Phasen und Frequenzen (je Blase verschieden) */
  ph: number[];
  w: number[];
  geht: boolean;
};

/** ein kleiner fester Zufall (die Blasen sollen bei jedem Laden gleich tanzen) */
function zufall(s: number): () => number {
  let x = s >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}

/** Die Lavalampe: Blasen, die ihren Ankern folgen und sich dabei langsam bewegen */
export class LavaLampe {
  private blasen: Blase[] = [];
  private zeit = -1;
  private naechste = 1;
  private bewegt = false;

  /** die Kontaktbohne (unten, dunkel, ruhig): nur Atmen, kein Treiben */
  private kontaktBlase: Blase | null = null;

  /** neue Ziele nach einer Formänderung: Kontaktbohne und Lavabohnen */
  ziele(f: LavaFund, tonKontakt: number, tonLava: number): void {
    if (f.kontakt) {
      const m = formMatrix(f.kontakt);
      if (this.kontaktBlase) {
        this.kontaktBlase.ziel = [...f.kontakt.p];
        this.kontaktBlase.mZiel = m;
        this.kontaktBlase.tonZiel = tonKontakt;
        this.kontaktBlase.geht = false;
      } else this.kontaktBlase = this.neu(f.kontakt, m, tonKontakt);
    } else if (this.kontaktBlase) this.kontaktBlase.geht = true;
    this.anker(f.anker, () => tonLava);
  }

  private neu(a: Anker, m: Matrix6, ton: number): Blase {
    const z = zufall(0x9e3779b1 * this.naechste++);
    return {
      ziel: [...a.p],
      p: [...a.p],
      mZiel: m,
      m: [...m],
      tonZiel: ton,
      ton,
      da: 0,
      r: a.r,
      ph: Array.from({ length: 8 }, () => 2 * Math.PI * z()),
      // Perioden 9–17 s (Treiben), 6–9 s (Atmen), 11–17 s (Schwappen), 8–12 s (Kreisen)
      w: [0, 1, 2]
        .map(() => (2 * Math.PI) / (9 + 8 * z()))
        .concat([(2 * Math.PI) / (6 + 3 * z()), (2 * Math.PI) / (11 + 6 * z()), (2 * Math.PI) / (8 + 4 * z()), (2 * Math.PI) / (7 + 4 * z()), (2 * Math.PI) / (13 + 5 * z())]),
      geht: false,
    };
  }

  /** neue Anker (nach einer Formänderung): jede Blase schwimmt zum nächsten freien Anker, übrige wachsen neu oder schrumpfen weg */
  anker(liste: readonly Anker[], ton: (a: Anker) => number): void {
    const frei = new Set(this.blasen.filter((b) => !b.geht));
    for (const a of liste) {
      let beste: Blase | null = null;
      let bd = Infinity;
      for (const b of frei) {
        const d = Math.hypot(b.ziel[0] - a.p[0], b.ziel[1] - a.p[1], b.ziel[2] - a.p[2]);
        if (d < 1.5 * Math.max(a.r, b.r) && d < bd) {
          bd = d;
          beste = b;
        }
      }
      const m = formMatrix(a);
      if (beste) {
        frei.delete(beste);
        beste.ziel = [...a.p];
        beste.mZiel = m;
        beste.r = a.r;
        beste.tonZiel = ton(a);
      } else this.blasen.push(this.neu(a, m, ton(a)));
    }
    for (const b of frei) b.geht = true;
  }

  /** gibt es etwas zu zeigen? */
  get leer(): boolean {
    return this.blasen.length === 0 && !this.kontaktBlase;
  }
  /** schwimmen, wachsen oder schrumpfen noch Blasen (auch wenn die Lava sonst stillsteht)? */
  get unruhig(): boolean {
    return this.bewegt;
  }

  /** ein Schritt der Zeit (ms): Blasen schwimmen zu ihren Ankern, nehmen ihre Form an, wachsen und schrumpfen */
  schritt(jetzt: number): void {
    const dt = this.zeit < 0 ? 0 : Math.min(0.25, (jetzt - this.zeit) / 1000);
    this.zeit = jetzt;
    const aP = 1 - Math.exp(-dt / 0.9);
    const aM = 1 - Math.exp(-dt / 0.7);
    let rest = 0;
    for (const b of this.kontaktBlase ? [...this.blasen, this.kontaktBlase] : this.blasen) {
      const groesse = Math.sqrt(Math.max(b.m[0] + b.m[3] + b.m[5], b.mZiel[0] + b.mZiel[3] + b.mZiel[5], 1e-9));
      let d = 0;
      for (let e = 0; e < 3; e++) {
        const v = (b.ziel[e]! - b.p[e]!) * aP;
        b.p[e] = b.p[e]! + v;
        d = Math.max(d, Math.abs(b.ziel[e]! - b.p[e]!));
      }
      for (let e = 0; e < 6; e++) b.m[e] = b.m[e]! + (b.mZiel[e]! - b.m[e]!) * aM;
      const daZiel = b.geht ? 0 : 1;
      b.da += (daZiel - b.da) * aM;
      b.ton += (b.tonZiel - b.ton) * aM;
      let dm = 0;
      for (let e = 0; e < 6; e++) dm = Math.max(dm, Math.abs(b.mZiel[e]! - b.m[e]!));
      rest = Math.max(rest, d / groesse, dm / (groesse * groesse), Math.abs(daZiel - b.da));
    }
    this.bewegt = rest > 0.004;
    this.blasen = this.blasen.filter((b) => !(b.geht && b.da < 0.03));
    if (this.kontaktBlase?.geht && this.kontaktBlase.da < 0.03) this.kontaktBlase = null;
  }

  /** die Kontaktbohne zur Zeit `t`: liegt still unten, atmet nur ein wenig (±4 %) */
  kontakt(t: number): LavaForm | null {
    const b = this.kontaktBlase;
    if (!b || b.da <= 1e-3) return null;
    const k = b.da * b.da * (1 + 0.08 * Math.sin(b.w[3]! * t + b.ph[3]!));
    return { c: [...b.p], m: b.m.map((x) => x * k) as Matrix6, ton: b.ton };
  }

  /**
   * Die Ellipsoide zur Zeit `t` (Sekunden): je Blase das Haupt-Ellipsoid (treibt und atmet) und ein kleineres, das langsam längs der
   * Blase hin und her schwappt und ein wenig kreist — zusammen eine Bohne. Bewegungen in den Maßen der Blase (M^½ · Weg).
   */
  formen(t: number): LavaForm[] {
    const aus: LavaForm[] = [];
    for (const b of this.blasen) {
      if (b.da <= 1e-3) continue;
      const W = wurzel(b.m);
      const [w0, w1, w2, w3, w4, w5, w6, w7] = b.w as [number, number, number, number, number, number, number, number];
      const [p0, p1, p2, p3, p4, p5, p6, p7] = b.ph as [number, number, number, number, number, number, number, number];
      const um = (u: P3): P3 => [W[0]![0]! * u[0] + W[0]![1]! * u[1] + W[0]![2]! * u[2], W[1]![0]! * u[0] + W[1]![1]! * u[1] + W[1]![2]! * u[2], W[2]![0]! * u[0] + W[2]![1]! * u[1] + W[2]![2]! * u[2]];
      // treiben: wenig zur Seite, mehr auf und ab (wie in der Lampe)
      const tr = um([0.07 * Math.sin(w0 * t + p0), 0.1 * Math.sin(w1 * t + p1), 0.05 * Math.sin(w2 * t + p2)]);
      const c: P3 = [b.p[0] + tr[0], b.p[1] + tr[1], b.p[2] + tr[2]];
      // atmen (die Größe ändert sich um ±6 %), wachsen und schrumpfen
      const k = b.da * b.da * (1 + 0.12 * Math.sin(w3 * t + p3));
      const m = b.m.map((x) => x * k) as Matrix6;
      // das kleinere schwappt längs der Blase (die längste Achse zieht den Weg von selbst in die Länge) und kreist ein wenig
      const sw = um([0.34 * Math.sin(w4 * t + p4), 0.22 * Math.sin(w5 * t + p5), 0.18 * Math.cos(w4 * t + p6)]);
      const ks = 0.52 * b.da * b.da * (1 + 0.14 * Math.sin(w6 * t + p7)) * (1 + 0.04 * Math.sin(w7 * t));
      aus.push({ c, m, ton: b.ton }, { c: [c[0] + sw[0] * b.da, c[1] + sw[1] * b.da, c[2] + sw[2] * b.da], m: b.m.map((x) => x * ks) as Matrix6, ton: b.ton });
    }
    return aus;
  }
}
