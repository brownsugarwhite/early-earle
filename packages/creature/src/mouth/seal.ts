import { clamp, dot, sub, type Vec3 } from '../math/vec';
import { surfacePoint, type MouthHost } from './mouth';

/**
 * Naht des geschlossenen Mauls je Azimut: Wo landen Ober- und Unterlippenkante nach den starren Kieferbewegungen, und wie
 * weit müssen sie noch verschoben werden, damit sie sich exakt treffen (mit Überlappung `overlap`: die Unterlippenkante
 * schiebt sich eine Fase weit hinter die Oberlippe)? Eine Rechnung für Verschluss-Morph (closing.ts) und Zahnsitz (mouth.ts).
 */
export interface SealInput {
  host: MouthHost;
  theta: number;
  lipHAt(phi: number): number;
  gapAt(phi: number): number;
  /** Starre geschlossene Bewegung beider Kiefer. */
  lower(p: Readonly<Vec3>): Vec3;
  upper(p: Readonly<Vec3>): Vec3;
  hasJaw: boolean;
  /** Anteil des Oberkiefers an der Bewegung (bestimmt, wo zwischen den Kanten die Naht liegt). */
  share: number;
  overlap: number;
  /** Längenmaßstab für die Flächensuche. */
  bodyScale: number;
}

export interface Seal {
  /** Verschiebung der Unterlippenkante entlang `host.up` (lokal) bis zur Naht. */
  lowerAt(phi: number): number;
  /** Verschiebung der Oberlippenkante entlang `host.up` (lokal) bis zur Naht. */
  upperAt(phi: number): number;
  /** Höhe der Naht (lokal) — die Oberlippenkante nach Bewegung und Ausgleich plus halbe Überlappung. */
  seamAt(phi: number): number;
}

export function computeSeal(input: SealInput): Seal {
  const { host, theta, hasJaw } = input;
  const n = 33;
  const lo = new Float64Array(n);
  const up = new Float64Array(n);
  const seam = new Float64Array(n);
  const maxR = host.halfWidth * 3 + input.bodyScale;
  for (let i = 0; i < n; i++) {
    const phi = -theta + (2 * theta * i) / (n - 1);
    const hl = input.lipHAt(phi);
    const g = input.gapAt(phi);
    const rimLo = surfacePoint(host, hl - g, phi, maxR).p;
    const rimUp = surfacePoint(host, hl + g, phi, maxR).p;
    const hLo = dot(sub(hasJaw ? input.lower(rimLo) : rimLo, host.origin), host.up);
    const hUp = dot(sub(input.upper(rimUp), host.origin), host.up);
    // Naht zwischen beiden Kanten, gewichtet wie die Bewegungsanteile; ohne Unterkiefer bleibt die Öffnung
    const s = hasJaw ? hLo + (hUp - hLo) * (1 - input.share) : hUp;
    lo[i] = hasJaw ? s + input.overlap * 0.5 - hLo : 0;
    up[i] = s - input.overlap * 0.5 - hUp;
    seam[i] = s;
  }
  const at = (arr: Float64Array, phi: number): number => {
    const t = clamp((phi + theta) / (2 * theta), 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(t));
    const f = t - i;
    return arr[i]! * (1 - f) + arr[i + 1]! * f;
  };
  return { lowerAt: (phi) => at(lo, phi), upperAt: (phi) => at(up, phi), seamAt: (phi) => at(seam, phi) };
}
