// Plan „Zeichnung ist Form“ (15.10.), Schritt 4: Abweichung Körper ↔ gezeichnete Kurve je Blatt (Seite, Front, Top),
// als Zahl (px bei 461 px je Kachel, wie alle Messungen) und als Saum (Silhouettenpunkte des Körpers mit ihrer Abweichung,
// Plan 9.8: Lichtsaum, wo der Umriss > 2 px von der Kurve abweicht). Der Kern entscheidet Widersprüche der drei Kurven
// nicht still; hier werden sie sichtbar.
import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { pfadAbtasten, segmente, vollerPfad } from '../profil';
import type { V3 } from '../versuch/catmullClark';
import { abtasten3 } from '../versuch/linie3d';
import { type Ansicht3, umrissAusNetz } from '../versuch/umriss3d';
import { schlitzIm } from './schlitz';

/** px je Kachel-Einheit (461 px je Kachel, Vertrag aller Messungen) */
export const ABWEICHUNG_PX = 461;

export type BlattAbweichung = {
  /** größte und mittlere Abweichung, beide Richtungen (Körper → Kurve, Kurve → Körper), px */
  max: number;
  mittel: number;
  /** Saum: Tripel (x, y, d) je Silhouettenpunkt des Körpers in Blattkoordinaten (Welt), d in px; (NaN, NaN, 0) trennt Züge */
  saum: Float32Array;
  /**
   * Front/Top: Stücke des Körperumrisses, an denen ein breiterer Kiefer über die schwarze Linie hinausgeht (14.10. nachts,
   * Florian: „Der schwarze Shape sollte sich bei viel breiterem Kiefer an die Kieferlinie heften“) — Paare (x, y),
   * (NaN, NaN) trennt Stücke. Der Editor zeichnet sie als Teil der schwarzen Linie; sie zählen nicht als Abweichung.
   */
  umweg?: Float32Array;
};

const proj2 = (p: V3, a: 'front' | 'top'): V2 => (a === 'front' ? { x: p[2], y: p[1] } : { x: p[0], y: p[2] });

/** Abdeckung der Kieferflächen in einem Blatt (Raster mit Zelle `h`, Test mit einer Zelle Rand). */
function kieferAbdeckung(punkte: readonly V3[], flaechen: readonly (readonly number[])[], kiefer: readonly boolean[], a: 'front' | 'top', h: number): ((p: V2) => boolean) | null {
  const zellen = new Set<number>();
  const schl = (i: number, j: number) => (i + 32768) * 65536 + (j + 32768);
  const dreieck = (p0: V2, p1: V2, p2: V2) => {
    const f = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
    if (Math.abs(f) < 1e-18) return;
    const sg = Math.sign(f);
    const iMin = Math.floor(Math.min(p0.x, p1.x, p2.x) / h);
    const iMax = Math.ceil(Math.max(p0.x, p1.x, p2.x) / h);
    const jMin = Math.floor(Math.min(p0.y, p1.y, p2.y) / h);
    const jMax = Math.ceil(Math.max(p0.y, p1.y, p2.y) / h);
    for (let j = jMin; j <= jMax; j++) {
      for (let i = iMin; i <= iMax; i++) {
        const x = i * h;
        const y = j * h;
        const e0 = sg * ((p1.x - p0.x) * (y - p0.y) - (p1.y - p0.y) * (x - p0.x));
        const e1 = sg * ((p2.x - p1.x) * (y - p1.y) - (p2.y - p1.y) * (x - p1.x));
        const e2 = sg * ((p0.x - p2.x) * (y - p2.y) - (p0.y - p2.y) * (x - p2.x));
        if (e0 >= -1e-12 && e1 >= -1e-12 && e2 >= -1e-12) zellen.add(schl(i, j));
      }
    }
  };
  flaechen.forEach((f, fi) => {
    if (!kiefer[fi]) return;
    for (let k = 1; k + 1 < f.length; k++) dreieck(proj2(punkte[f[0]!]!, a), proj2(punkte[f[k]!]!, a), proj2(punkte[f[k + 1]!]!, a));
  });
  if (!zellen.size) return null;
  return (p: V2) => {
    const i = Math.round(p.x / h);
    const j = Math.round(p.y / h);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (zellen.has(schl(i + di, j + dj))) return true;
    return false;
  };
}

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

function innen(p: V2, poly: readonly V2[]): boolean {
  let drin = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) drin = !drin;
  }
  return drin;
}

/**
 * Seite mit getrennten Kiefern (14.10. nachts): Die schwarze Linie hat zwischen den Lippenanfängen ihre Lücke, dort
 * begrenzen Rot und Blau den offenen Schlitz. Soll = schwarze Linie ohne Schlitz + rote und blaue Linie bis zum
 * Mundwinkel; was das Netz im Fenster zwischen den Linien zeigt (Tasche, Rachen), zählt nicht. Rückwärts (Kurve → Körper)
 * zählt nur die schwarze Linie: Rot und Blau liegen in der Seite oft im Körper. Sonst maß die Seite den Blick in den
 * Schlitz als Abweichung (Florians Unterbiss: 48 px). Ebenso zählen Stücke der schwarzen Linie im Fenster nicht: Die
 * Kinnspitze des kürzeren Kiefers liegt dort verdeckt hinter der Lippe des längeren.
 */
function seiteMitSchlitz(dok: Dokument): { soll: V2[]; schwarz: V2[]; fenster: V2[] } | null {
  const zu = dok.maul?.zu;
  const sl = schlitzIm(dok.profile.seite);
  if (!zu?.unten || !sl) return null;
  const sk = dok.skalierung;
  const segs = segmente(dok.profile.seite);
  const n = segs.length;
  const schwarz: V2[] = [];
  for (let q = 1; q < n; q++) {
    const abt = pfadAbtasten([segs[(sl.segment + q) % n]!], 24);
    for (let k = q === 1 ? 0 : 1; k < abt.length; k++) schwarz.push({ x: abt[k]!.x * sk, y: abt[k]!.y * sk });
  }
  const welt = (l: typeof zu.oben) => abtasten3(l, 16).map((q) => ({ x: q[0] * sk, y: q[1] * sk }));
  const rot = welt(zu.oben);
  const blau = welt(zu.unten);
  // die offene schwarze Linie beginnt am Knoten nach dem Schlitz: ist das der blaue, endet sie am roten
  const startBlau = sl.segment === sl.oben;
  const soll = startBlau ? [...schwarz, ...rot, ...blau.slice().reverse()] : [...schwarz, ...blau, ...rot.slice().reverse()];
  return { soll, schwarz, fenster: [...rot, ...blau.slice().reverse()] };
}

/**
 * Abweichungen je Blatt aus dem feinen Netz (Ruhelage, ohne Hebung) und den gezeichneten Profilen des Dokuments.
 * `zellen` = Raster der Silhouette (Genauigkeit ≈ halbe Zelle; 240 ≈ 0,3 px bei 461 px).
 */
export function blattAbweichungen(punkte: readonly V3[], flaechen: readonly number[][], dok: Dokument, zellen = 240, kiefer?: readonly boolean[]): Record<Ansicht3, BlattAbweichung> {
  const netz = { punkte: punkte as V3[], flaechen: flaechen as number[][], schaerfe: new Map<string, number>() };
  const sk = dok.skalierung;
  const out = {} as Record<Ansicht3, BlattAbweichung>;
  const schlitz = seiteMitSchlitz(dok);
  for (const a of ['seite', 'front', 'top'] as const) {
    const soll = a === 'seite' && schlitz ? schlitz.soll : pfadAbtasten(vollerPfad(dok.profile[a]), 24).map((p) => ({ x: p.x * sk, y: p.y * sk }));
    const fenster = a === 'seite' && schlitz ? schlitz.fenster : null;
    const ist = umrissAusNetz(netz, a, zellen);
    // Front/Top: Kieferflächen, die über ihre Vorlage hinaus verbreitert sind — dort heftet sich die Linie an den Kiefer
    let ausdehnung = 0;
    for (const q of soll) ausdehnung = Math.max(ausdehnung, Math.abs(q.x), Math.abs(q.y));
    const bedeckt = a !== 'seite' && kiefer ? kieferAbdeckung(punkte, flaechen, kiefer, a, (2 * ausdehnung) / zellen) : null;
    const saum: number[] = [];
    const umweg: number[] = [];
    let max = 0;
    let summe = 0;
    let n = 0;
    for (const z of ist) {
      let imUmweg = false;
      for (const p of z) {
        let d = fenster && innen(p, fenster) ? 0 : abstandZuZug(p, soll) * ABWEICHUNG_PX;
        const amKiefer = !!bedeckt && d > 1 && bedeckt(p);
        if (amKiefer) {
          umweg.push(p.x, p.y);
          imUmweg = true;
          d = 0;
        } else if (imUmweg) {
          umweg.push(NaN, NaN);
          imUmweg = false;
        }
        saum.push(p.x, p.y, d);
        if (d > max) max = d;
        summe += d;
        n++;
      }
      if (imUmweg) umweg.push(NaN, NaN);
      saum.push(NaN, NaN, 0);
    }
    for (const p of a === 'seite' && schlitz ? schlitz.schwarz : soll) {
      // vom Kiefer überdeckte Stücke der schwarzen Linie zählen nicht (dort gilt der Umweg)
      if (bedeckt && bedeckt(p)) continue;
      // Stücke der schwarzen Linie im Fenster zwischen Rot und Blau (samt dem Anfang des kürzeren Kiefers) liegen in der
      // Seite hinter der Lippe des längeren Kiefers und haben keinen Umriss (14.10.: die verdeckte Kinnspitze des
      // Überbisses zählte als Abweichung, Kugel 11,5 px, Langhals 5,7 px)
      if (fenster && (innen(p, fenster) || abstandZuZug(p, fenster) * ABWEICHUNG_PX < 0.5)) continue;
      let d = Infinity;
      for (const z of ist) d = Math.min(d, abstandZuZug(p, z));
      if (!Number.isFinite(d)) continue;
      d *= ABWEICHUNG_PX;
      if (d > max) max = d;
      summe += d;
      n++;
    }
    out[a] = { max, mittel: n ? summe / n : 0, saum: Float32Array.from(saum), ...(umweg.length ? { umweg: Float32Array.from(umweg) } : {}) };
  }
  return out;
}
