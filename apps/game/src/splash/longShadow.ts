/**
 * Lange Schatten im Splash (Florians Konstruktion): ein Punktlicht weit oben links, jeder Schatten ist die Spur
 * seines Werfers, der vom Licht weg gestreckt wird. Fernkopie P′ = L + (P − L)·(1 + k·e), e ∈ [0, 1] ist die
 * Ausfahrt (0 = kein Schatten, 1 = volle Länge).
 *
 * Die Spur einer Fläche ist die Vereinigung aller Kantenvierecke (pᵢ, pᵢ₊₁, p′ᵢ₊₁, p′ᵢ) und der Fernkopie. Jedes
 * Viereck wird auf positive Fläche gedreht und landet mit der Fernkopie (Außenringe positiv, Löcher negativ) in einem
 * Pfad mit Füllregel nonzero — die Vereinigung entsteht ohne Boolesche Operationen. Alle Schatten teilen einen
 * deckenden Verlauf (userSpaceOnUse), Überlappungen dunkeln deshalb nie doppelt, die Kanten bleiben hart.
 *
 * Werfer-Ringe: Außenringe mit positiver, Löcher mit negativer Shoelace-Fläche (im Bildraum, y nach unten), so wie
 * sie `logo.gen.ts` und `glyphs.gen.ts` liefern.
 */

export type Pt = readonly [number, number];
export type Ring = ReadonlyArray<Pt>;
/** Affine 2D-Matrix wie SVG/Canvas: [a, b, c, d, e, f] → x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Affine = readonly [number, number, number, number, number, number];

/** Streckung der Fernkopie bei voller Ausfahrt: weit genug, dass der Schatten jenseits des Bildrands ausläuft. */
export const SHADOW_K = 2.6;

const r1 = (v: number): number => Math.round(v * 10) / 10;

/**
 * SVG-Pfaddaten der Schattenspur (Füllregel nonzero). Leerer String bei e ≤ 0 oder ohne Ringe.
 * `m` transformiert die Werferpunkte vorher (Skalierung, Drehung, Verschiebung des Werfers).
 */
export function sweepPath(rings: ReadonlyArray<Ring>, light: Pt, e: number, m?: Affine | null, k = SHADOW_K): string {
  if (!(e > 0) || rings.length === 0) return '';
  const f = 1 + k * Math.min(1, e);
  const lx = light[0];
  const ly = light[1];
  let out = '';
  for (const ring of rings) {
    const n = ring.length;
    if (n < 2) continue;
    // Punkte (transformiert) und Fernkopien einmal rechnen
    const px = new Float64Array(n);
    const py = new Float64Array(n);
    const qx = new Float64Array(n);
    const qy = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const p = ring[i]!;
      let x = p[0];
      let y = p[1];
      if (m) {
        const tx = m[0] * x + m[2] * y + m[4];
        y = m[1] * x + m[3] * y + m[5];
        x = tx;
      }
      px[i] = x;
      py[i] = y;
      qx[i] = lx + (x - lx) * f;
      qy[i] = ly + (y - ly) * f;
    }
    // Kantenvierecke, positiv orientiert
    for (let i = 0; i < n; i++) {
      const j = i + 1 === n ? 0 : i + 1;
      const ax = px[i]!;
      const ay = py[i]!;
      const bx = px[j]!;
      const by = py[j]!;
      const cx = qx[j]!;
      const cy = qy[j]!;
      const dx = qx[i]!;
      const dy = qy[i]!;
      // doppelte Shoelace-Fläche von a, b, c, d
      const a2 = ax * by - bx * ay + (bx * cy - cx * by) + (cx * dy - dx * cy) + (dx * ay - ax * dy);
      if (Math.abs(a2) < 1e-6) continue;
      if (a2 > 0) out += `M${r1(ax)} ${r1(ay)}L${r1(bx)} ${r1(by)}L${r1(cx)} ${r1(cy)}L${r1(dx)} ${r1(dy)}Z`;
      else out += `M${r1(ax)} ${r1(ay)}L${r1(dx)} ${r1(dy)}L${r1(cx)} ${r1(cy)}L${r1(bx)} ${r1(by)}Z`;
    }
    // Fernkopie (Streckung um L mit positivem Faktor erhält die Orientierung: außen positiv, Löcher negativ)
    out += `M${r1(qx[0]!)} ${r1(qy[0]!)}`;
    for (let i = 1; i < n; i++) out += `L${r1(qx[i]!)} ${r1(qy[i]!)}`;
    out += 'Z';
  }
  return out;
}

/** Affine Matrix: Skalierung (sx, sy) und Drehung (Grad) um den Punkt c, danach Verschiebung (tx, ty). */
export function aroundPoint(c: Pt, sx: number, sy: number, rotDeg = 0, tx = 0, ty = 0): Affine {
  const r = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  // M = T(c + t) · R · S · T(−c)
  const a = cos * sx;
  const b = sin * sx;
  const cc = -sin * sy;
  const d = cos * sy;
  return [a, b, cc, d, c[0] + tx - (a * c[0] + cc * c[1]), c[1] + ty - (b * c[0] + d * c[1])];
}

/** Matrixprodukt m1 · m2 (erst m2, dann m1 anwenden). */
export function compose(m1: Affine, m2: Affine): Affine {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/** Streckung um den Faktor s entlang der Einheitsrichtung u, Fixpunkt c (Möwenschatten: vom Licht weg gezogen). */
export function stretchAlong(c: Pt, u: Pt, s: number): Affine {
  const k = s - 1;
  const a = 1 + k * u[0] * u[0];
  const b = k * u[0] * u[1];
  const d = 1 + k * u[1] * u[1];
  return [a, b, b, d, c[0] - (a * c[0] + b * c[1]), c[1] - (b * c[0] + d * c[1])];
}

/** SVG-Matrix-String für ein `transform`-Attribut. */
export function matrixAttr(m: Affine): string {
  return `matrix(${m.map((v) => Math.round(v * 10000) / 10000).join(' ')})`;
}

/** Punkte transformieren (für Werfer, die als Polygon gezeichnet werden). */
export function transformRing(ring: Ring, m: Affine): Pt[] {
  return ring.map((p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]] as const);
}

/** Geschlossener Polygonpfad. */
export function ringPath(ring: Ring): string {
  if (ring.length === 0) return '';
  let d = `M${r1(ring[0]![0])} ${r1(ring[0]![1])}`;
  for (let i = 1; i < ring.length; i++) d += `L${r1(ring[i]![0])} ${r1(ring[i]![1])}`;
  return d + 'Z';
}
