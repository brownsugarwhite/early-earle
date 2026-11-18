// Messen (Versuche 13.10.): Abweichung des 3D-Umrisses von der Zeichnung in px (461 px je Kachel), wie in
// `schnitte/schnitte.test.ts`; hier als eigenes Modul, damit Tests es nutzen können, ohne fremde Tests mitzuladen.

import { type Dokument, type V2, pfadAbtasten, vollerPfad } from '@ee/shape';
import { type Netz, umrissAusNetz } from '@ee/shape/versuch';

export const PX = 461;

/** Gezeichneter Umriss je Ansicht in Weltkoordinaten (Top auf die Länge der Seite gestreckt wie im 3D). */
export function sollUmriss(dok: Dokument, a: 'seite' | 'front' | 'top'): V2[] {
  const pts = pfadAbtasten(vollerPfad(dok.profile[a]), 32);
  if (a !== 'top') return pts;
  const seite = pfadAbtasten(vollerPfad(dok.profile.seite), 32);
  const xMin = Math.min(...seite.map((p) => p.x));
  const xMax = Math.max(...seite.map((p) => p.x));
  const tMin = Math.min(...pts.map((p) => p.x));
  const tMax = Math.max(...pts.map((p) => p.x));
  return pts.map((p) => ({ x: xMin + ((p.x - tMin) / (tMax - tMin)) * (xMax - xMin), y: p.y }));
}

function abstandZumZug(p: V2, zug: readonly V2[]): number {
  let best = Infinity;
  for (let i = 0; i < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[(i + 1) % zug.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y));
  }
  return best;
}

/** Abweichung des 3D-Umrisses von der Zeichnung in px: Mittel und Größtwert über beide Richtungen. */
export function umrissAbweichung(netz: Netz, dok: Dokument, a: 'seite' | 'front' | 'top'): { mittel: number; max: number } {
  const ist = umrissAusNetz(netz, a, 400);
  const soll = sollUmriss(dok, a);
  const d: number[] = [];
  for (const z of ist) for (const p of z) d.push(abstandZumZug(p, soll));
  for (const p of soll) d.push(Math.min(...ist.map((z) => abstandZumZug(p, z))));
  return { mittel: (d.reduce((s, x) => s + x, 0) / d.length) * PX, max: Math.max(...d) * PX };
}
