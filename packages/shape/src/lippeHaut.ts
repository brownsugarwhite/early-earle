// Lippenlinie auf die Haut legen (14.10. nachts, Florian: „Ich muss die Kurven auch von oben und von vorne genau
// bearbeiten können, und der Kiefer passt sich dann auch der runden Form an“). Rot und Blau gelten im Kern genau samt
// ihren Griffen; damit eine neu gezeichnete Linie trotzdem auf der Haut liegt und vorn rund ist (keine Spitze, Florians
// Rückmeldung vom Nachmittag), bekommt sie hier ihre Tiefen und Tiefengriffe von der Haut. Danach gehört sie Florian.
import type { Knoten3, Linie3, V3T } from './dokument';

/** Halbe Breite der Haut an einem Seitenpunkt (x, y), null außerhalb des Körpers */
export type Haut = (x: number, y: number) => number | null;

type P2 = { x: number; y: number };

function seitenPunkt(a: Knoten3, b: Knoten3, t: number): P2 {
  const s = 1 - t;
  const w0 = s * s * s;
  const w1 = 3 * s * s * t;
  const w2 = 3 * s * t * t;
  const w3 = t * t * t;
  return {
    x: w0 * a.p[0] + w1 * (a.p[0] + a.aus[0]) + w2 * (b.p[0] + b.ein[0]) + w3 * b.p[0],
    y: w0 * a.p[1] + w1 * (a.p[1] + a.aus[1]) + w2 * (b.p[1] + b.ein[1]) + w3 * b.p[1],
  };
}

const laenge2 = (v: V3T) => Math.hypot(v[0], v[1]);

/** Kleines dichtes Gleichungssystem (Gauß mit Spaltenpivot); null, wenn singulär. */
function loesen(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((z, i) => [...z, b[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    if (Math.abs(M[p]![c]!) < 1e-14) return null;
    [M[c], M[p]] = [M[p]!, M[c]!];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]! / M[c]![c]!;
      for (let k = c; k <= n; k++) M[r]![k] = M[r]![k]! - f * M[c]![k]!;
    }
  }
  return M.map((z, i) => z[n]! / z[i]!);
}

/**
 * Seitenlage (x, y) der Knoten und ihre Seitengriffe bleiben. Mit `tiefe` (in der Seite gezeichnet) kommt die Tiefe der
 * Knoten von der Haut, und die Tiefengriffe werden so gewählt, dass die Linie auch zwischen den Knoten auf der Haut
 * liegt (kleinste Quadrate über Proben je Stück; glatte Knoten bleiben glatt, eine Steigung je Knoten). Ein Anfang auf
 * der Spiegelebene (z = 0) bekommt immer einen Griff quer zu ihr: Die gespiegelte Linie läuft glatt durch, von oben und
 * von vorn ist die Front rund statt spitz.
 */
export function lippeAnHaut(l: Linie3, haut: Haut, tiefe = true): Linie3 {
  const n = l.knoten.length;
  if (n < 2) return l;
  const kn: Knoten3[] = l.knoten.map((k) => ({ ...k, p: [...k.p] as V3T, ein: [...k.ein] as V3T, aus: [...k.aus] as V3T }));
  const aufAchse = Math.abs(kn[0]!.p[2]) < 1e-9;
  if (aufAchse) kn[0]!.aus = [0, 0, Math.max(0, kn[0]!.aus[2])];
  if (!tiefe) {
    if (aufAchse) kn[0]!.aus = [0, 0, 0.55 * Math.max(0, kn[1]!.p[2])];
    return { knoten: kn };
  }
  for (let i = aufAchse ? 1 : 0; i < n; i++) {
    const z = haut(kn[i]!.p[0], kn[i]!.p[1]);
    if (z !== null && z > 0) kn[i]!.p[2] = z;
  }
  // Unbekannte: je Knoten die Steigung g (dz je Seitenlänge; Ecken zwei: ein/aus), am Anfang auf der Achse die Griffhöhe h
  type Var = { knoten: number; seite: 'ein' | 'aus' | 'beide' | 'anfang' };
  const vars: Var[] = [];
  const index = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    if (i === 0 && aufAchse) {
      index.set('0:aus', vars.length);
      vars.push({ knoten: 0, seite: 'anfang' });
      continue;
    }
    const ecke = kn[i]!.art === 'ecke';
    if (ecke && i > 0 && i < n - 1) {
      index.set(`${i}:ein`, vars.length);
      vars.push({ knoten: i, seite: 'ein' });
      index.set(`${i}:aus`, vars.length);
      vars.push({ knoten: i, seite: 'aus' });
    } else {
      const v = vars.length;
      vars.push({ knoten: i, seite: 'beide' });
      if (i > 0) index.set(`${i}:ein`, v);
      if (i < n - 1) index.set(`${i}:aus`, v);
    }
  }
  const V = vars.length;
  const A = Array.from({ length: V }, () => new Array<number>(V).fill(0));
  const b = new Array<number>(V).fill(0);
  // Probezeilen: z(t) = B0 z_a + B1 (z_a + A) + B2 (z_b + E) + B3 z_b, A = g_a |aus_a| (Anfang: h), E = −g_b |ein_b|
  for (let s = 0; s + 1 < n; s++) {
    const ka = kn[s]!;
    const kb = kn[s + 1]!;
    const va = index.get(`${s}:aus`)!;
    const vb = index.get(`${s + 1}:ein`)!;
    const ca = s === 0 && aufAchse ? 1 : laenge2(ka.aus);
    const cb = -laenge2(kb.ein);
    for (let j = 1; j < 16; j++) {
      const t = j / 16;
      const q = seitenPunkt(ka, kb, t);
      const zs = haut(q.x, q.y);
      if (zs === null) continue;
      const u = 1 - t;
      const B0 = u * u * u;
      const B1 = 3 * u * u * t;
      const B2 = 3 * u * t * t;
      const B3 = t * t * t;
      const rest = zs - (B0 + B1) * ka.p[2] - (B2 + B3) * kb.p[2];
      const zeile = new Map<number, number>();
      zeile.set(va, (zeile.get(va) ?? 0) + B1 * ca);
      zeile.set(vb, (zeile.get(vb) ?? 0) + B2 * cb);
      for (const [p, wp] of zeile) {
        b[p] = b[p]! + wp * rest;
        for (const [q2, wq] of zeile) A[p]![q2] = A[p]![q2]! + wp * wq;
      }
    }
  }
  // schwache Bindung an die Sehnensteigung (ohne Proben bleibt das System lösbar, Ausreißer bleiben klein)
  for (let v = 0; v < V; v++) {
    const { knoten: i, seite } = vars[v]!;
    let ziel = 0;
    let gewicht = 1e-4;
    if (seite === 'anfang') {
      ziel = 0.55 * kn[1]!.p[2];
      gewicht = 1e-4;
    } else {
      const vor = kn[Math.max(0, i - 1)]!;
      const nach = kn[Math.min(n - 1, i + 1)]!;
      const ds = Math.hypot(nach.p[0] - vor.p[0], nach.p[1] - vor.p[1]);
      ziel = ds > 1e-9 ? (nach.p[2] - vor.p[2]) / ds : 0;
      gewicht = 1e-4 * (laenge2(kn[i]!.aus) + laenge2(kn[i]!.ein)) ** 2;
    }
    A[v]![v] = A[v]![v]! + gewicht;
    b[v] = b[v]! + gewicht * ziel;
  }
  const x = loesen(A, b);
  if (!x) return { knoten: kn };
  for (let v = 0; v < V; v++) {
    const { knoten: i, seite } = vars[v]!;
    const k = kn[i]!;
    if (seite === 'anfang') {
      k.aus = [0, 0, Math.min(Math.max(0, k.p[2] + kn[1]!.p[2]), Math.max(0, x[v]!))];
      continue;
    }
    if ((seite === 'ein' || seite === 'beide') && i > 0) k.ein = [k.ein[0], k.ein[1], -x[v]! * laenge2(k.ein)];
    if ((seite === 'aus' || seite === 'beide') && i < n - 1) k.aus = [k.aus[0], k.aus[1], x[v]! * laenge2(k.aus)];
  }
  return { knoten: kn };
}
