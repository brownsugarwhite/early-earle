// Posen (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B, B4): Löser im posierten Raum. Griffe am posierten
// Körper (schwarze Linien, später Reifen) bewegen den Käfig örtlich. Gespeichert werden Ruhe-Deltas der Pose (vor den
// Knochen), deshalb sind die Unbekannten die Ruhe-Deltas der rechten Hälfte und der Naht (die linke Hälfte spiegelt in der
// Ruhe; auf der Naht bleibt z fest), und die Bedingungen wirken über die Drehung je Punkt (ΔX = R·d) — auch in schiefen
// Posen (B3b). Energie: Bi-Laplace der Ruhe-Deltas (glatter Auslauf auf exakt 0 außerhalb des Einflussbereichs) +
// Dämpfung + gewichtete Bedingungen an Zeilen der Grenzmatrix (je Bedingung die Achsen der Ansicht: Seite x und y).
// Einmal zerlegen je Geste (Cholesky der Normalgleichungen in einer Hülle nach Cuthill-McKee), je Zugschritt nur
// Vorwärts- und Rückwärtseinsetzen.

export type PosenBedingung = {
  /** Zeile der Grenzmatrix: Käfigpunkte und Gewichte (feiner Punkt = Σ w·Käfigpunkt) */
  index: ArrayLike<number>;
  wert: ArrayLike<number>;
  /** gebundene Achsen (0 x, 1 y, 2 z), z. B. Seite [0, 1] */
  achsen: readonly number[];
  /** Gewicht (groß = fast hart) */
  gewicht: number;
};

export type PosenLoeserEingabe = {
  n: number;
  /** Nachbarn je Käfigpunkt (Kanten des Käfigs) */
  nachbarn: readonly (readonly number[])[];
  /** Ruhe-Käfig (3n): Seiten und Naht */
  ruhe: ArrayLike<number>;
  /** Drehung je Punkt (9n, zeilenweise) der Pose bei voller Stärke */
  dreh: ArrayLike<number>;
  /** Spiegelpartner je Punkt (`spiegelIndex(ruhe)`) */
  spiegel: Int32Array;
  /** Käfigpunkte, die sich bewegen dürfen (wird spiegelgeschlossen) */
  bereich: readonly number[];
  bedingungen: readonly PosenBedingung[];
  /** Gewicht des Bi-Laplace (Standard 1) */
  glatt?: number;
  /** Dämpfung ε (Standard 1e-6) */
  daempfung?: number;
};

export type PosenLoeser = {
  /** Ruhe-Deltas (volles Feld 3n, linke Hälfte gespiegelt) für posierte Zielversätze je Bedingung und gebundener Achse */
  loesen(ziele: readonly (readonly number[])[]): Float64Array;
  /** posierter Versatz eines feinen Punkts (Zeile der Grenzmatrix) für ein Ruhe-Deltafeld */
  versatz(index: ArrayLike<number>, wert: ArrayLike<number>, d: ArrayLike<number>): [number, number, number];
  unbekannte: number;
  punkte: number;
  zeitZerlegen: number;
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

export function posenLoeserBauen(e: PosenLoeserEingabe): PosenLoeser {
  const t0 = jetzt();
  const { n, nachbarn, ruhe, dreh, spiegel } = e;
  const glatt = e.glatt ?? 1;
  const eps = e.daempfung ?? 1e-6;
  const seiteVon = (i: number) => (Math.abs(ruhe[3 * i + 2]!) < 1e-9 || spiegel[i] === i ? 0 : ruhe[3 * i + 2]! > 0 ? 1 : -1);
  const rep = (i: number) => (seiteVon(i) < 0 && spiegel[i]! >= 0 ? spiegel[i]! : i);
  // Bereich spiegelgeschlossen; Unbekannte je Vertreter (rechte Hälfte und Naht)
  const imBereich = new Uint8Array(n);
  for (const i of e.bereich) {
    imBereich[i] = 1;
    if (spiegel[i]! >= 0) imBereich[spiegel[i]!] = 1;
  }
  const knoten: number[] = [];
  const knotenVon = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (!imBereich[i]) continue;
    const r = rep(i);
    if (knotenVon[r]! < 0) {
      knotenVon[r] = knoten.length;
      knoten.push(r);
    }
  }
  const K = knoten.length;
  const dims = knoten.map((r) => (seiteVon(r) === 0 ? 2 : 3));
  // Ruhe-Delta-Komponente c des Punkts i als (Knoten, Komponente, Vorzeichen) oder null
  const komponente = (i: number, c: number): [number, number] | null => {
    if (!imBereich[i]) return null;
    const k = knotenVon[rep(i)]!;
    if (k < 0) return null;
    if (c === 2) {
      if (dims[k] === 2) return null;
      return [k, seiteVon(i) < 0 ? -1 : 1];
    }
    return [k, 1];
  };
  // dünne Zeilen über (Knoten, Komponente): Schlüssel 3·k + c
  type Zeile = Map<number, number>;
  const add = (z: Zeile, i: number, c: number, w: number) => {
    const q = komponente(i, c);
    if (!q) return;
    const key = 3 * q[0] + c;
    z.set(key, (z.get(key) ?? 0) + w * q[1]);
  };
  const glattZeilen: Zeile[] = [];
  // Bi-Laplace: Laplace (gleichförmig) an allen Punkten des Bereichs und seiner Nachbarn
  const energie = new Uint8Array(n);
  for (let i = 0; i < n; i++)
    if (imBereich[i]) {
      energie[i] = 1;
      for (const j of nachbarn[i]!) energie[j] = 1;
    }
  for (let v = 0; v < n; v++) {
    if (!energie[v]) continue;
    const nb = nachbarn[v]!;
    if (!nb.length) continue;
    for (let c = 0; c < 3; c++) {
      const z: Zeile = new Map();
      for (const w of nb) add(z, w, c, 1 / nb.length);
      add(z, v, c, -1);
      if (z.size) glattZeilen.push(z);
    }
  }
  // Bedingungen: Achse a des posierten Versatzes eines feinen Punkts = Σ_j g_j (R_j d_j)_a
  const bedZeilen: { z: Zeile; w: number }[][] = e.bedingungen.map((b) =>
    b.achsen.map((a) => {
      const z: Zeile = new Map();
      for (let t = 0; t < b.index.length; t++) {
        const j = b.index[t]!;
        const g = b.wert[t]!;
        for (let c = 0; c < 3; c++) add(z, j, c, g * dreh[9 * j + 3 * a + c]!);
      }
      return { z, w: b.gewicht };
    }),
  );
  // Knotengraph für die Ordnung (Kopplungen aus allen Zeilen)
  const adj: Set<number>[] = Array.from({ length: K }, () => new Set<number>());
  const koppeln = (z: Zeile) => {
    const ks = [...new Set([...z.keys()].map((key) => Math.floor(key / 3)))];
    for (const a of ks) for (const b of ks) if (a !== b) adj[a]!.add(b);
  };
  for (const z of glattZeilen) koppeln(z);
  for (const bz of bedZeilen) for (const { z } of bz) koppeln(z);
  // Reverse Cuthill-McKee
  const reihenfolge: number[] = [];
  const besucht = new Uint8Array(K);
  const grad = (k: number) => adj[k]!.size;
  const offen = Array.from({ length: K }, (_, k) => k).sort((a, b) => grad(a) - grad(b));
  for (const s of offen) {
    if (besucht[s]) continue;
    besucht[s] = 1;
    const schlange = [s];
    while (schlange.length) {
      const k = schlange.shift()!;
      reihenfolge.push(k);
      const nb = [...adj[k]!].filter((x) => !besucht[x]).sort((a, b) => grad(a) - grad(b));
      for (const x of nb) {
        besucht[x] = 1;
        schlange.push(x);
      }
    }
  }
  reihenfolge.reverse();
  // Variablen in dieser Ordnung
  const varStart = new Int32Array(K);
  let N = 0;
  for (const k of reihenfolge) {
    varStart[k] = N;
    N += dims[k]!;
  }
  const varVon = (key: number) => {
    const k = Math.floor(key / 3);
    return varStart[k]! + (key % 3);
  };
  // Normalgleichungen H (dicht gespeichert, gerechnet in der Hülle)
  const H = new Float64Array(N * N);
  const aufaddieren = (z: Zeile, w: number) => {
    const ein = [...z].map(([key, v]) => [varVon(key), v] as const);
    for (const [i, vi] of ein) for (const [j, vj] of ein) H[i * N + j] = H[i * N + j]! + w * vi * vj;
  };
  for (const z of glattZeilen) aufaddieren(z, glatt);
  for (const bz of bedZeilen) for (const { z, w } of bz) aufaddieren(z, w);
  for (let i = 0; i < N; i++) H[i * N + i] = H[i * N + i]! + eps;
  // Hüllen-Cholesky (unteres Dreieck in H)
  const erste = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    let f = i;
    for (let j = 0; j < i; j++)
      if (H[i * N + j] !== 0) {
        f = j;
        break;
      }
    erste[i] = f;
  }
  for (let i = 0; i < N; i++) {
    const fi = erste[i]!;
    for (let j = fi; j <= i; j++) {
      let s = H[i * N + j]!;
      const von = Math.max(fi, erste[j]!);
      for (let k = von; k < j; k++) s -= H[i * N + k]! * H[j * N + k]!;
      if (j < i) H[i * N + j] = s / H[j * N + j]!;
      else H[i * N + i] = Math.sqrt(Math.max(s, 1e-300));
    }
  }
  // Bedingungszeilen als (Variable, Wert) für die rechte Seite
  const bedVar = bedZeilen.map((bz) => bz.map(({ z, w }) => ({ w, ein: [...z].map(([key, v]) => [varVon(key), v] as const) })));
  const zeitZerlegen = jetzt() - t0;

  const loesen = (ziele: readonly (readonly number[])[]): Float64Array => {
    const b = new Float64Array(N);
    bedVar.forEach((bz, k) =>
      bz.forEach(({ w, ein }, a) => {
        const t = ziele[k]?.[a] ?? 0;
        if (t === 0) return;
        for (const [i, v] of ein) b[i] = b[i]! + w * t * v;
      }),
    );
    // L·y = b
    for (let i = 0; i < N; i++) {
      let s = b[i]!;
      for (let k = erste[i]!; k < i; k++) s -= H[i * N + k]! * b[k]!;
      b[i] = s / H[i * N + i]!;
    }
    // Lᵀ·x = y (spaltenweise)
    for (let i = N - 1; i >= 0; i--) {
      b[i] = b[i]! / H[i * N + i]!;
      const xi = b[i]!;
      for (let k = erste[i]!; k < i; k++) b[k] = b[k]! - H[i * N + k]! * xi;
    }
    // volles Ruhe-Deltafeld (linke Hälfte gespiegelt, Naht ohne z)
    const d = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
      if (!imBereich[i]) continue;
      for (let c = 0; c < 3; c++) {
        const q = komponente(i, c);
        if (q) d[3 * i + c] = q[1] * b[varStart[q[0]]! + c]!;
      }
    }
    return d;
  };
  const versatz = (index: ArrayLike<number>, wert: ArrayLike<number>, d: ArrayLike<number>): [number, number, number] => {
    const o = [0, 0, 0];
    for (let t = 0; t < index.length; t++) {
      const j = index[t]!;
      const g = wert[t]!;
      for (let a = 0; a < 3; a++) o[a] = o[a]! + g * (dreh[9 * j + 3 * a]! * d[3 * j]! + dreh[9 * j + 3 * a + 1]! * d[3 * j + 1]! + dreh[9 * j + 3 * a + 2]! * d[3 * j + 2]!);
    }
    return [o[0]!, o[1]!, o[2]!];
  };
  return { loesen, versatz, unbekannte: N, punkte: K, zeitZerlegen };
}
