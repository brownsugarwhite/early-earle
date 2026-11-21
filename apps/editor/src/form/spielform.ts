// Ozzy, Backen fürs Spiel (Plan „Maul, Zähne, Zunge“, Etappe 9, Scheibe 1, 21.11.2026;
// `docs/plans/2026-11-21-ozzy-maul-etappe-9-backen.md`).
//
// Die Regel des Spielnetzes: Jeder Punkt hat eine Grundlage, je Pose einen Versatz und je Pose einen Drehwinkel. Mit dem Anteil t
// jeder Pose (0 bis 1):
//   Ruhe   = Grundlage + Σ t · Versatz der Pose
//   Winkel = Σ t · Drehwinkel der Pose
//   Lage   = Ruhe, um das Scharnier gedreht um seinen Winkel (in der Seite: x und y; die Tiefe z bleibt)
// Das Scharnier ist ein Punkt des Netzes (der Mundwinkel), wie er in der gemischten Ruhe liegt. Für die Normale gilt dasselbe
// (Grundlage, Versatz je Pose, gedreht um denselben Winkel, dann auf Länge eins). Das ist die Rechnung der Anzeige des Editors
// (`werk.alsAnzeige`: die Ruhe der Pose, dann `knochenDrehen`): Steht eine Pose ganz, liegt jeder Punkt genau dort, wo der Editor
// ihn zeigt. Haut, Tasche und Zähne sind Punkte desselben Netzes, ohne Sonderfall (ein Zahn hat in der geschlossenen Grundform die
// Länge null; sein Versatz lässt ihn wachsen).
//
// Ohne DOM, ohne Werk: reine Werte. `spielLage` ist die Rechnung, die das Spiel später in seinem Vertex-Shader macht.

/** eine Pose des Spielnetzes: je Punkt der Versatz seiner Ruhe und seiner Normale gegen die Grundlage (je 3) und sein Drehwinkel (Bogenmaß) */
export type SpielPose = { name: string; versatz: Float32Array; normalen: Float32Array; winkel: Float32Array };

export type Spielform = {
  /** die Grundlage: Lagen und Normalen je Punkt (die Grundform, das Maul zu) */
  pos: Float32Array;
  nor: Float32Array;
  /** Dreiecke: erst die der Haut (mit der Tasche), dann die der Zähne */
  index: Uint32Array;
  /** so viele Punkte und Dreiecke gehören der Haut; die übrigen den Zähnen */
  punkteHaut: number;
  dreieckeHaut: number;
  /** der Punkt, um den gedreht wird (der Mundwinkel); −1: nichts dreht */
  scharnier: number;
  posen: SpielPose[];
};

/**
 * Eine Lage zum Backen, wie der Editor sie ZEIGT (mit den Knochen gedreht): Lagen und Normalen aller Punkte, der Drehwinkel je
 * Punkt (Bogenmaß) und der Ort des Scharniers in der Seite.
 */
export type GezeigteLage = { name: string; pos: ArrayLike<number>; nor: ArrayLike<number>; winkel: ArrayLike<number>; scharnier: { x: number; y: number } };

/** Lagen und Normalen aus der gezeigten Lage zurück in ihre Ruhe drehen (je Punkt um seinen Winkel, um das Scharnier) */
function inRuhe(l: GezeigteLage, n: number): { pos: Float32Array; nor: Float32Array } {
  const pos = new Float32Array(3 * n);
  const nor = new Float32Array(3 * n);
  const { x: cx, y: cy } = l.scharnier;
  for (let v = 0; v < n; v++) {
    const w = -(l.winkel[v] ?? 0);
    const c = Math.cos(w);
    const s = Math.sin(w);
    const dx = l.pos[3 * v]! - cx;
    const dy = l.pos[3 * v + 1]! - cy;
    pos[3 * v] = cx + c * dx - s * dy;
    pos[3 * v + 1] = cy + s * dx + c * dy;
    pos[3 * v + 2] = l.pos[3 * v + 2]!;
    const nx = l.nor[3 * v]!;
    const ny = l.nor[3 * v + 1]!;
    nor[3 * v] = c * nx - s * ny;
    nor[3 * v + 1] = s * nx + c * ny;
    nor[3 * v + 2] = l.nor[3 * v + 2]!;
  }
  return { pos, nor };
}

/**
 * Das Spielnetz aus der Grundlage (die Grundform, das Maul zu: Lagen und Normalen je Punkt) und den Posen, wie der Editor sie
 * zeigt. Je Pose wird die gezeigte Lage in ihre Ruhe zurückgedreht; gemerkt wird ihr Versatz gegen die Grundlage. `scharnier`:
 * der Punkt, um den gedreht wird (−1: keiner; dann darf es keine Pose geben, die dreht).
 */
export function spielformAus(grund: { pos: ArrayLike<number>; nor: ArrayLike<number> }, index: Uint32Array, punkteHaut: number, dreieckeHaut: number, scharnier: number, lagen: readonly GezeigteLage[]): Spielform {
  const n = grund.pos.length / 3;
  const pos = Float32Array.from(grund.pos);
  const nor = Float32Array.from(grund.nor);
  const posen = lagen.map((l): SpielPose => {
    const r = inRuhe(l, n);
    const versatz = new Float32Array(3 * n);
    const normalen = new Float32Array(3 * n);
    for (let i = 0; i < 3 * n; i++) {
      versatz[i] = r.pos[i]! - pos[i]!;
      normalen[i] = r.nor[i]! - nor[i]!;
    }
    return { name: l.name, versatz, normalen, winkel: Float32Array.from({ length: n }, (_, v) => l.winkel[v] ?? 0) };
  });
  return { pos, nor, index, punkteHaut, dreieckeHaut, scharnier, posen };
}

/**
 * Die Rechnung des Spiels: Lagen und Normalen aller Punkte für die Anteile der Posen (`anteile[p]` von 0 bis 1; fehlende gelten als
 * 0). `ziel`: Felder der richtigen Länge werden wiederverwendet.
 */
export function spielLage(f: Spielform, anteile: readonly number[], ziel?: { pos: Float32Array; nor: Float32Array }): { pos: Float32Array; nor: Float32Array } {
  const n = f.pos.length / 3;
  const aus = ziel && ziel.pos.length === 3 * n && ziel.nor.length === 3 * n ? ziel : { pos: new Float32Array(3 * n), nor: new Float32Array(3 * n) };
  const { pos, nor } = aus;
  pos.set(f.pos);
  nor.set(f.nor);
  const an: { p: SpielPose; t: number }[] = [];
  f.posen.forEach((p, i) => {
    const t = anteile[i] ?? 0;
    if (t !== 0) an.push({ p, t });
  });
  if (!an.length) return aus;
  for (const { p, t } of an) {
    const V = p.versatz;
    const N = p.normalen;
    for (let i = 0; i < 3 * n; i++) {
      pos[i] = pos[i]! + t * V[i]!;
      nor[i] = nor[i]! + t * N[i]!;
    }
  }
  // das Scharnier: der Mundwinkel, wie er in der gemischten Ruhe liegt
  const c = f.scharnier;
  const cx = c >= 0 ? pos[3 * c]! : 0;
  const cy = c >= 0 ? pos[3 * c + 1]! : 0;
  for (let v = 0; v < n; v++) {
    let w = 0;
    for (const { p, t } of an) w += t * p.winkel[v]!;
    let nx = nor[3 * v]!;
    let ny = nor[3 * v + 1]!;
    const nz = nor[3 * v + 2]!;
    if (w !== 0 && c >= 0) {
      const co = Math.cos(w);
      const si = Math.sin(w);
      const dx = pos[3 * v]! - cx;
      const dy = pos[3 * v + 1]! - cy;
      pos[3 * v] = cx + co * dx - si * dy;
      pos[3 * v + 1] = cy + si * dx + co * dy;
      const rx = co * nx - si * ny;
      ny = si * nx + co * ny;
      nx = rx;
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    nor[3 * v] = nx / l;
    nor[3 * v + 1] = ny / l;
    nor[3 * v + 2] = nz / l;
  }
  return aus;
}

/**
 * Zu ist unsichtbar: Punkte aus `aussen` (die Lippen von außen), die am selben Ort liegen (höchstens `genau` auseinander), bekommen
 * dieselbe Normale, das Mittel der ihren. Dann schattiert die Haut über die geschlossene Lippe hinweg, als gäbe es das Maul nicht.
 * Am Ort geändert. Zurück: wie viele Punkte angeglichen wurden, um wie viel Grad sich eine Normale dabei höchstens gedreht hat
 * und wie weit zwei Punkte einer Gruppe höchstens auseinander lagen.
 */
export function normalenAngleichen(pos: ArrayLike<number>, nor: Float32Array, aussen: Iterable<number>, genau = 1e-3): { punkte: number; grad: number; weit: number } {
  const P = [...new Set(aussen)];
  // Gruppen: Wer nah genug an einem anderen liegt, gehört zu ihm (es sind wenige Punkte: jeder gegen jeden)
  const kopf = P.map((_, i) => i);
  const finde = (i: number): number => {
    while (kopf[i] !== i) {
      kopf[i] = kopf[kopf[i]!]!;
      i = kopf[i]!;
    }
    return i;
  };
  let weit = 0;
  for (let i = 0; i < P.length; i++) {
    const a = 3 * P[i]!;
    for (let j = i + 1; j < P.length; j++) {
      const b = 3 * P[j]!;
      const d = Math.hypot(pos[a]! - pos[b]!, pos[a + 1]! - pos[b + 1]!, pos[a + 2]! - pos[b + 2]!);
      if (d > genau) continue;
      weit = Math.max(weit, d);
      kopf[finde(i)] = finde(j);
    }
  }
  const gruppen = new Map<number, number[]>();
  P.forEach((v, i) => {
    const k = finde(i);
    const g = gruppen.get(k);
    if (g) g.push(v);
    else gruppen.set(k, [v]);
  });
  let punkte = 0;
  let grad = 0;
  for (const g of gruppen.values()) {
    if (g.length < 2) continue;
    let x = 0;
    let y = 0;
    let z = 0;
    for (const v of g) {
      x += nor[3 * v]!;
      y += nor[3 * v + 1]!;
      z += nor[3 * v + 2]!;
    }
    const l = Math.hypot(x, y, z);
    // (zeigen die Normalen gegeneinander, gibt es kein Mittel: Dann bleibt jede, wie sie ist)
    if (l < 1e-6) continue;
    for (const v of g) {
      const d = (nor[3 * v]! * x + nor[3 * v + 1]! * y + nor[3 * v + 2]! * z) / l;
      grad = Math.max(grad, (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI);
      nor[3 * v] = x / l;
      nor[3 * v + 1] = y / l;
      nor[3 * v + 2] = z / l;
      punkte++;
    }
  }
  return { punkte, grad, weit };
}

/** Abstand eines Orts vom Dreieck a, b, c (Ericson, nächster Punkt auf dem Dreieck) */
function zumDreieck(px: number, py: number, pz: number, P: ArrayLike<number>, a: number, b: number, c: number): number {
  const ax = P[a]!;
  const ay = P[a + 1]!;
  const az = P[a + 2]!;
  const abx = P[b]! - ax;
  const aby = P[b + 1]! - ay;
  const abz = P[b + 2]! - az;
  const acx = P[c]! - ax;
  const acy = P[c + 1]! - ay;
  const acz = P[c + 2]! - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  let u = 0;
  let w = 0;
  if (d1 <= 0 && d2 <= 0) {
    // an der Ecke a
  } else {
    const bpx = px - P[b]!;
    const bpy = py - P[b + 1]!;
    const bpz = pz - P[b + 2]!;
    const d3 = abx * bpx + aby * bpy + abz * bpz;
    const d4 = acx * bpx + acy * bpy + acz * bpz;
    const cpx = px - P[c]!;
    const cpy = py - P[c + 1]!;
    const cpz = pz - P[c + 2]!;
    const d5 = abx * cpx + aby * cpy + abz * cpz;
    const d6 = acx * cpx + acy * cpy + acz * cpz;
    const vc = d1 * d4 - d3 * d2;
    const vb = d5 * d2 - d1 * d6;
    const va = d3 * d6 - d5 * d4;
    if (d3 >= 0 && d4 <= d3) u = 1;
    else if (d6 >= 0 && d5 <= d6) w = 1;
    else if (vc <= 0 && d1 >= 0 && d3 <= 0) u = d1 / (d1 - d3);
    else if (vb <= 0 && d2 >= 0 && d6 <= 0) w = d2 / (d2 - d6);
    else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
      w = (d4 - d3) / (d4 - d3 + (d5 - d6));
      u = 1 - w;
    } else {
      const s = va + vb + vc || 1;
      u = vb / s;
      w = vc / s;
    }
  }
  const dx = apx - u * abx - w * acx;
  const dy = apy - u * aby - w * acy;
  const dz = apz - u * abz - w * acz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Wie nah ein Netz an einer Wolke von Punkten liegt (fürs Prüfen: die Punkte der glatten Anzeige gegen das Spielnetz): je Punkt der
 * Abstand zum nächsten Dreieck. Die Dreiecke liegen in einem Raster, gesucht wird in wachsenden Würfeln um den Punkt. `welches`:
 * ein Feld, so lang wie die Wolke, bekommt je Punkt die Nummer seines nächsten Dreiecks.
 */
export function abstaendeZumNetz(punkte: ArrayLike<number>, pos: ArrayLike<number>, index: ArrayLike<number>, welches?: Int32Array): Float32Array {
  const T = index.length / 3;
  const aus = new Float32Array(punkte.length / 3);
  if (!T) return aus.fill(Infinity);
  let x0 = Infinity;
  let y0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let z1 = -Infinity;
  let kante = 0;
  for (let t = 0; t < T; t++) {
    for (let e = 0; e < 3; e++) {
      const a = 3 * index[3 * t + e]!;
      const b = 3 * index[3 * t + ((e + 1) % 3)]!;
      x0 = Math.min(x0, pos[a]!);
      y0 = Math.min(y0, pos[a + 1]!);
      z0 = Math.min(z0, pos[a + 2]!);
      x1 = Math.max(x1, pos[a]!);
      y1 = Math.max(y1, pos[a + 1]!);
      z1 = Math.max(z1, pos[a + 2]!);
      kante += Math.hypot(pos[a]! - pos[b]!, pos[a + 1]! - pos[b + 1]!, pos[a + 2]! - pos[b + 2]!);
    }
  }
  const zelle = Math.max(1e-6, (1.5 * kante) / (3 * T));
  const nx = Math.max(1, Math.ceil((x1 - x0) / zelle));
  const ny = Math.max(1, Math.ceil((y1 - y0) / zelle));
  const nz = Math.max(1, Math.ceil((z1 - z0) / zelle));
  const fach = (x: number, x00: number, n: number): number => Math.max(0, Math.min(n - 1, Math.floor((x - x00) / zelle)));
  const raster = new Map<number, number[]>();
  for (let t = 0; t < T; t++) {
    const a = 3 * index[3 * t]!;
    const b = 3 * index[3 * t + 1]!;
    const c = 3 * index[3 * t + 2]!;
    const ix0 = fach(Math.min(pos[a]!, pos[b]!, pos[c]!), x0, nx);
    const ix1 = fach(Math.max(pos[a]!, pos[b]!, pos[c]!), x0, nx);
    const iy0 = fach(Math.min(pos[a + 1]!, pos[b + 1]!, pos[c + 1]!), y0, ny);
    const iy1 = fach(Math.max(pos[a + 1]!, pos[b + 1]!, pos[c + 1]!), y0, ny);
    const iz0 = fach(Math.min(pos[a + 2]!, pos[b + 2]!, pos[c + 2]!), z0, nz);
    const iz1 = fach(Math.max(pos[a + 2]!, pos[b + 2]!, pos[c + 2]!), z0, nz);
    for (let i = ix0; i <= ix1; i++)
      for (let j = iy0; j <= iy1; j++)
        for (let k = iz0; k <= iz1; k++) {
          const s = (i * ny + j) * nz + k;
          const l = raster.get(s);
          if (l) l.push(t);
          else raster.set(s, [t]);
        }
  }
  const weit = Math.max(nx, ny, nz);
  for (let q = 0; q < aus.length; q++) {
    const px = punkte[3 * q]!;
    const py = punkte[3 * q + 1]!;
    const pz = punkte[3 * q + 2]!;
    const ci = fach(px, x0, nx);
    const cj = fach(py, y0, ny);
    const ck = fach(pz, z0, nz);
    let best = Infinity;
    let bestT = -1;
    for (let r = 0; r <= weit; r++) {
      // (was in der Schale r liegt, ist mindestens (r − 1) Zellen entfernt: Ist das Beste schon näher, endet die Suche)
      if (best <= (r - 1) * zelle) break;
      for (let i = Math.max(0, ci - r); i <= Math.min(nx - 1, ci + r); i++)
        for (let j = Math.max(0, cj - r); j <= Math.min(ny - 1, cj + r); j++)
          for (let k = Math.max(0, ck - r); k <= Math.min(nz - 1, ck + r); k++) {
            if (Math.max(Math.abs(i - ci), Math.abs(j - cj), Math.abs(k - ck)) !== r) continue;
            const l = raster.get((i * ny + j) * nz + k);
            if (!l) continue;
            for (const t of l) {
              const d = zumDreieck(px, py, pz, pos, 3 * index[3 * t]!, 3 * index[3 * t + 1]!, 3 * index[3 * t + 2]!);
              if (d < best) {
                best = d;
                bestT = t;
              }
            }
          }
    }
    if (welches) welches[q] = bestT;
    aus[q] = best;
  }
  return aus;
}

/** wo ein Punkt des Netzes auf den Lippen steht: auf welcher (0, 1; 2: auf beiden, ein Mundwinkel) und an welcher Stelle längs der Lippe */
export type LippenStelle = { welche: 0 | 1 | 2; s: number };

/**
 * Die zwei Lippen gleich teilen, damit das Maul zu wirklich zu ist. Zu liegen beide Lippen auf derselben Kurve; im ausgedünnten
 * Netz stehen von jeder aber nur einige Punkte, und nicht an denselben Stellen: Zu lägen zwei verschiedene Streckenzüge
 * aufeinander, mit Spalten dazwischen. Hier bekommt jede Lippe an jeder Stelle, an der die andere einen Punkt hat, auch einen: Die
 * Kante, die dort über die Stelle hinweggeht, wird geteilt, jedes Dreieck an ihr in zwei.
 *
 * `lippe(d)`: wo der Punkt d auf den Lippen steht (null: auf keiner). Gleiche Stellen beider Lippen liegen zu am selben Ort.
 * `neu(welche, s, wie)`: der Punkt der Lippe `welche` an der Stelle s, auf derselben Seite der Lippe (außen oder in der Tasche)
 * wie der Punkt `wie`; −1: Es gibt keinen. Wer ihn anlegt, kennt danach seine Stelle (`lippe`). `nah`: Stellen der zwei Lippen,
 * die höchstens so weit auseinander liegen, gelten als dieselbe.
 * Zurück: die Dreiecke danach, wie viele Stellen eingesetzt wurden, und je Stelle, an der jetzt beide Lippen stehen, die Punkte
 * der einen und der anderen (ohne die Mundwinkel: Die gehören beiden).
 */
export function lippenGleichTeilen(
  index: ArrayLike<number>,
  lippe: (d: number) => LippenStelle | null,
  neu: (welche: 0 | 1, s: number, wie: number) => number,
  nah: number,
): { index: Uint32Array; eingesetzt: number; paare: { a: number[]; b: number[] }[] } {
  const GENAU = 1e-9;
  let I = Array.from(index);
  const gemerkt = new Map<number, LippenStelle | null>();
  const wo = (d: number): LippenStelle | null => {
    let l = gemerkt.get(d);
    if (l === undefined) {
      l = lippe(d);
      gemerkt.set(d, l);
    }
    return l;
  };
  /** die Stellen einer Lippe, an denen das Netz einen Punkt hat (aufsteigend, jede einmal) */
  const stellen = (welche: 0 | 1): number[] => {
    const S: number[] = [];
    for (const d of new Set(I)) {
      const l = wo(d);
      if (l && (l.welche === welche || l.welche === 2)) S.push(l.s);
    }
    S.sort((x, y) => x - y);
    return S.filter((x, k) => k === 0 || x - S[k - 1]! > GENAU);
  };
  const S = [stellen(0), stellen(1)] as const;
  // die Stellen beider Lippen der Reihe nach: Was nah beieinander liegt, ist ein Paar; was allein steht, braucht ein Gegenüber
  const ziel: { a: number | null; b: number | null }[] = [];
  for (let i = 0, j = 0; i < S[0].length || j < S[1].length; ) {
    const a = S[0][i];
    const b = S[1][j];
    if (a !== undefined && b !== undefined && Math.abs(a - b) <= nah) {
      ziel.push({ a, b });
      i++;
      j++;
    } else if (b === undefined || (a !== undefined && a < b)) {
      ziel.push({ a: a!, b: null });
      i++;
    } else {
      ziel.push({ a: null, b });
      j++;
    }
  }
  const auf = (d: number, welche: 0 | 1, s: number): boolean => {
    const l = wo(d);
    return !!l && (l.welche === welche || l.welche === 2) && Math.abs(l.s - s) <= GENAU;
  };
  let eingesetzt = 0;
  const einsetzen = (welche: 0 | 1, s: number): boolean => {
    const da = S[welche];
    let k = 0;
    while (k < da.length && da[k]! < s) k++;
    const s1 = da[k - 1];
    const s2 = da[k];
    if (s1 === undefined || s2 === undefined) return false;
    const danach: number[] = [];
    let geteilt = false;
    for (let t = 0; t < I.length; t += 3) {
      const ecken = [I[t]!, I[t + 1]!, I[t + 2]!];
      const ia = ecken.findIndex((d) => auf(d, welche, s1));
      const ib = ecken.findIndex((d) => auf(d, welche, s2));
      const n = ia >= 0 && ib >= 0 && ia !== ib ? neu(welche, s, ecken[ia]!) : -1;
      if (n < 0) {
        danach.push(ecken[0]!, ecken[1]!, ecken[2]!);
        continue;
      }
      const c = ecken[3 - ia - ib]!;
      // (die Kante im Umlaufsinn des Dreiecks: Beide Hälften laufen wie das Ganze)
      const [x, y] = (ia + 1) % 3 === ib ? [ecken[ia]!, ecken[ib]!] : [ecken[ib]!, ecken[ia]!];
      danach.push(x, n, c, n, y, c);
      geteilt = true;
    }
    if (!geteilt) return false;
    I = danach;
    da.splice(k, 0, s);
    eingesetzt++;
    return true;
  };
  const paare: { a: number[]; b: number[] }[] = [];
  const stehen: { a: number; b: number }[] = [];
  for (const z of ziel) {
    if (z.a !== null && z.b !== null) stehen.push({ a: z.a, b: z.b });
    else if (z.a !== null && einsetzen(1, z.a)) stehen.push({ a: z.a, b: z.a });
    else if (z.b !== null && einsetzen(0, z.b)) stehen.push({ a: z.b, b: z.b });
  }
  const alle = [...new Set(I)];
  for (const st of stehen) {
    const a = alle.filter((d) => wo(d)?.welche === 0 && Math.abs(wo(d)!.s - st.a) <= GENAU);
    const b = alle.filter((d) => wo(d)?.welche === 1 && Math.abs(wo(d)!.s - st.b) <= GENAU);
    if (a.length && b.length) paare.push({ a, b });
  }
  return { index: Uint32Array.from(I), eingesetzt, paare };
}
