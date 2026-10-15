// Posen (Plan Teil B, B5): Griffe an Rot und Blau einer Pose. Die gezeigte Linie ist die Lippe selbst (`ist`); Knoten
// sitzen auf ihr beim Lippenanteil s_k, Griffe zeigen die Tangente der natürlichen Lippe (·Δs/3, wie ein Bézier-Griff)
// plus den gedrehten Griffversatz. Züge rechnen zurück in Versätze des Ruheraums (Rᵀ der Lippe am Knoten). Nur Daten,
// kein DOM: der Editor (`apps/editor/src/posen/poseLippen.tsx`) zeichnet und greift damit.
import type { Knoten3, Linie3, LinienKnoten, V3T } from '../../dokument';
import type { KettenName, PoseLippen, PoseLippenKette } from './linien';

type V3 = [number, number, number];

/** Lage einer Kette am Lippenanteil s: gezeigt und natürlich (linear zwischen den feinen Punkten), Tangente dN/ds, Drehung. */
export function ketteBei(k: PoseLippenKette, s: number): { ist: V3; nat: V3; natAbl: V3; dreh: number[] } {
  const N = k.s.length;
  let j = 0;
  while (j + 2 < N && k.s[j + 1]! < s) j++;
  const s0 = k.s[j]!;
  const s1 = k.s[j + 1]!;
  const u = s1 > s0 ? Math.max(0, Math.min(1, (s - s0) / (s1 - s0))) : 0;
  const lage = (a: Float32Array): V3 => [a[3 * j]! + (a[3 * j + 3]! - a[3 * j]!) * u, a[3 * j + 1]! + (a[3 * j + 4]! - a[3 * j + 1]!) * u, a[3 * j + 2]! + (a[3 * j + 5]! - a[3 * j + 2]!) * u];
  // Tangente über ein Fenster von zwei feinen Punkten je Seite (die Lippe ist glatt; einzelne Abschnitte sind Sehnen)
  const a = Math.max(0, j - 1);
  const b = Math.min(N - 1, j + 2);
  const ds = k.s[b]! - k.s[a]! || 1;
  const natAbl: V3 = [(k.natuerlich[3 * b]! - k.natuerlich[3 * a]!) / ds, (k.natuerlich[3 * b + 1]! - k.natuerlich[3 * a + 1]!) / ds, (k.natuerlich[3 * b + 2]! - k.natuerlich[3 * a + 2]!) / ds];
  const q = u < 0.5 ? j : j + 1;
  return { ist: lage(k.ist), nat: lage(k.natuerlich), natAbl, dreh: Array.from(k.dreh.subarray(9 * q, 9 * q + 9)) };
}

const drehe = (R: readonly number[], v: readonly number[]): V3 => [R[0]! * v[0]! + R[1]! * v[1]! + R[2]! * v[2]!, R[3]! * v[0]! + R[4]! * v[1]! + R[5]! * v[2]!, R[6]! * v[0]! + R[7]! * v[1]! + R[8]! * v[2]!];
const zurueck = (R: readonly number[], v: readonly number[]): V3 => [R[0]! * v[0]! + R[3]! * v[1]! + R[6]! * v[2]!, R[1]! * v[0]! + R[4]! * v[1]! + R[7]! * v[2]!, R[2]! * v[0]! + R[5]! * v[1]! + R[8]! * v[2]!];

/** Natürlicher Griff eines Knotens (posiert): Tangente der natürlichen Lippe · Δs/3 zum Nachbarknoten. */
function natGriff(l: PoseLippen, name: KettenName, knoten: readonly LinienKnoten[], k: number, seite: 'ein' | 'aus'): V3 {
  const nb = seite === 'aus' ? k + 1 : k - 1;
  if (nb < 0 || nb >= knoten.length) return [0, 0, 0];
  const ds = (knoten[nb]!.s - knoten[k]!.s) / 3;
  const t = ketteBei(l[name].rechts, knoten[k]!.s).natAbl;
  return [t[0] * ds, t[1] * ds, t[2] * ds];
}

/** Gezeigte Pose-Linie (posiert, Kern-Einheiten, rechte Kette): Knoten auf der Lippe, Griffe = natürlicher Griff + R·Versatz. */
export function poseLinieAnzeige(l: PoseLippen, name: KettenName, knoten: readonly LinienKnoten[] = l.knoten[name]): Linie3 {
  return {
    knoten: knoten.map((q, k): Knoten3 => {
      const lage = ketteBei(l[name].rechts, q.s);
      const ein = natGriff(l, name, knoten, k, 'ein');
      const aus = natGriff(l, name, knoten, k, 'aus');
      const re = drehe(lage.dreh, q.ein);
      const ra = drehe(lage.dreh, q.aus);
      return { p: lage.ist as V3T, ein: k > 0 ? [ein[0] + re[0], ein[1] + re[1], ein[2] + re[2]] : [0, 0, 0], aus: k + 1 < knoten.length ? [aus[0] + ra[0], aus[1] + ra[1], aus[2] + ra[2]] : [0, 0, 0], art: q.art ?? 'glatt' };
    }),
  };
}

/** Knotenzug: gewählte Knoten um den posierten Versatz Δ (Kern-Einheiten) verschieben → Versätze d_k + Rᵀ·Δ. */
export function linienKnotenVerschieben(l: PoseLippen, name: KettenName, basis: readonly LinienKnoten[], indizes: readonly number[], delta: readonly number[]): LinienKnoten[] {
  return basis.map((q, k) => {
    if (!indizes.includes(k)) return q;
    const dd = zurueck(ketteBei(l[name].rechts, q.s).dreh, delta);
    return { ...q, d: [q.d[0] + dd[0], q.d[1] + dd[1], q.d[2] + dd[2]] };
  });
}

/** Griffzug: Griffversätze eines Knotens aus der gezeigten Linie nach dem Zug (beide Griffe, Art aus der Anzeige). */
export function linienGriffAus(l: PoseLippen, name: KettenName, basis: readonly LinienKnoten[], k: number, anzeige: Linie3): LinienKnoten[] {
  const R = ketteBei(l[name].rechts, basis[k]!.s).dreh;
  const kn = anzeige.knoten[k]!;
  const versatz = (seite: 'ein' | 'aus'): V3T => {
    const nat = natGriff(l, name, basis, k, seite);
    const v = zurueck(R, [kn[seite][0] - nat[0], kn[seite][1] - nat[1], kn[seite][2] - nat[2]]);
    return [v[0], v[1], v[2]];
  };
  return basis.map((q, i) => (i === k ? { ...q, ein: k > 0 ? versatz('ein') : q.ein, aus: k + 1 < basis.length ? versatz('aus') : q.aus, art: kn.art } : q));
}

/** Lippenanteil des nächsten gezeigten Punkts (rechte Kette) zu q in einer Ansicht (Achsen der Ansicht, Kern-Einheiten). */
export function linienAnteilBei(l: PoseLippen, name: KettenName, achsen: readonly [number, number], q: { x: number; y: number }): { s: number; abstand: number } {
  const k = l[name].rechts;
  let best = { s: 0, abstand: Infinity };
  for (let j = 0; j + 1 < k.s.length; j++) {
    const ax = k.ist[3 * j + achsen[0]]!;
    const ay = k.ist[3 * j + achsen[1]]!;
    const bx = k.ist[3 * j + 3 + achsen[0]]!;
    const by = k.ist[3 * j + 3 + achsen[1]]!;
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1e-18;
    const u = Math.max(0, Math.min(1, ((q.x - ax) * dx + (q.y - ay) * dy) / l2));
    const d = Math.hypot(ax + dx * u - q.x, ay + dy * u - q.y);
    if (d < best.abstand) best = { s: k.s[j]! + (k.s[j + 1]! - k.s[j]!) * u, abstand: d };
  }
  return best;
}
