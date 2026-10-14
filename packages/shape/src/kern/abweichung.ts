// Plan „Zeichnung ist Form“ (15.10.), Schritt 4: Abweichung Körper ↔ gezeichnete Kurve je Blatt (Seite, Front, Top),
// als Zahl (px bei 461 px je Kachel, wie alle Messungen) und als Saum (Silhouettenpunkte des Körpers mit ihrer Abweichung,
// Plan 9.8: Lichtsaum, wo der Umriss > 2 px von der Kurve abweicht). Der Kern entscheidet Widersprüche der drei Kurven
// nicht still; hier werden sie sichtbar.
import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { pfadAbtasten, vollerPfad } from '../profil';
import type { V3 } from '../versuch/catmullClark';
import { type Ansicht3, umrissAusNetz } from '../versuch/umriss3d';

/** px je Kachel-Einheit (461 px je Kachel, Vertrag aller Messungen) */
export const ABWEICHUNG_PX = 461;

export type BlattAbweichung = {
  /** größte und mittlere Abweichung, beide Richtungen (Körper → Kurve, Kurve → Körper), px */
  max: number;
  mittel: number;
  /** Saum: Tripel (x, y, d) je Silhouettenpunkt des Körpers in Blattkoordinaten (Welt), d in px; (NaN, NaN, 0) trennt Züge */
  saum: Float32Array;
};

function abstandZuZug(p: V2, zug: readonly V2[]): number {
  let best = Infinity;
  const m = zug.length;
  for (let i = 0; i < m; i++) {
    const a = zug[i]!;
    const b = zug[(i + 1) % m]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
    const d = Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Abweichungen je Blatt aus dem feinen Netz (Ruhelage, ohne Hebung) und den gezeichneten Profilen des Dokuments.
 * `zellen` = Raster der Silhouette (Genauigkeit ≈ halbe Zelle; 240 ≈ 0,3 px bei 461 px).
 */
export function blattAbweichungen(punkte: readonly V3[], flaechen: readonly number[][], dok: Dokument, zellen = 240): Record<Ansicht3, BlattAbweichung> {
  const netz = { punkte: punkte as V3[], flaechen: flaechen as number[][], schaerfe: new Map<string, number>() };
  const sk = dok.skalierung;
  const out = {} as Record<Ansicht3, BlattAbweichung>;
  for (const a of ['seite', 'front', 'top'] as const) {
    const soll = pfadAbtasten(vollerPfad(dok.profile[a]), 24).map((p) => ({ x: p.x * sk, y: p.y * sk }));
    const ist = umrissAusNetz(netz, a, zellen);
    const saum: number[] = [];
    let max = 0;
    let summe = 0;
    let n = 0;
    for (const z of ist) {
      for (const p of z) {
        const d = abstandZuZug(p, soll) * ABWEICHUNG_PX;
        saum.push(p.x, p.y, d);
        if (d > max) max = d;
        summe += d;
        n++;
      }
      saum.push(NaN, NaN, 0);
    }
    for (const p of soll) {
      let d = Infinity;
      for (const z of ist) d = Math.min(d, abstandZuZug(p, z));
      if (!Number.isFinite(d)) continue;
      d *= ABWEICHUNG_PX;
      if (d > max) max = d;
      summe += d;
      n++;
    }
    out[a] = { max, mittel: n ? summe / n : 0, saum: Float32Array.from(saum) };
  }
  return out;
}
