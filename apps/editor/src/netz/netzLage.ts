// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1: Lagen aus dem 3D-Liniennetz des Workers (`WesenNetz.netzSicht`,
// Profil-Einheiten der Ruhelage) für die Blätter. Ein Netzpunkt hat genau einen 3D-Punkt; jede Ansicht zeigt ihn an seiner
// Projektion, verdeckt blass. Ohne DOM (die Kanten-Ebene und Prüfungen lesen es).
import type { Ansicht, Blick, Kante, V3T } from '@ee/shape';
import { type NetzSicht, type NetzZug, SICHT } from '@ee/shape/kern';
import { aktuellesNetz } from '../kern/netzStand';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

/** Das Liniennetz, wenn die Blätter es zeigen: Bauweise Kern, Grundform (in Posen zeigen sie den posierten Umriss). */
export function netzJetzt(): NetzSicht | null {
  if (useUi.getState().bauweise !== 'kern' || useEditor.getState().modus !== 'editor') return null;
  return aktuellesNetz()?.netz.netzSicht ?? null;
}

/** Zug mit Kennung (z. B. „l:2“ = Kantenlinie 2) aus dem aktuellen Netz. */
export function netzZug(id: string, ns: NetzSicht | null = netzJetzt()): NetzZug | null {
  return ns?.zuege.find((z) => z.id === id) ?? null;
}

/** Bit der Sichtbarkeit für einen Blick (Seite, Front, Back, Top, Bottom). */
export const sichtBit = (b: Blick): number => SICHT[b];

/** Achse, die eine Ansicht nicht zeigt (Tiefe): Seite z, Front/Back x, Top/Bottom y. */
export const tiefenAchse = (b: Blick | Ansicht): 0 | 1 | 2 => (b === 'seite' ? 2 : b === 'front' || b === 'hinten' ? 0 : 1);

/** Probe j eines Zugs als 3D-Punkt. */
export const zugPunkt = (z: NetzZug, j: number): V3T => [z.punkte[3 * j]!, z.punkte[3 * j + 1]!, z.punkte[3 * j + 2]!];

/** Zug einer Kantenlinie, wenn er zum Dokument passt (gleiche Knotenzahl); sonst null (das Netz hinkt einen Bau nach). */
export function kantenZug(k: Kante, ki: number, ns: NetzSicht | null = netzJetzt()): NetzZug | null {
  const z = netzZug(`l:${ki}`, ns);
  return z?.knoten && z.knoten.length === k.knoten.length ? z : null;
}

/**
 * Knoten i der Kantenlinie ki als Punkt auf dem Körper: die beiden Koordinaten ihrer Zeichenansicht aus dem Dokument (sie
 * folgen dem Zeiger sofort), die Tiefe aus dem Liniennetz (auf der Haut des Kern-Körpers). Ohne passendes Netz der
 * gespeicherte Punkt.
 */
export function kantenKnotenLage(k: Kante, ki: number, i: number, ns: NetzSicht | null = netzJetzt()): V3T {
  const kn = k.knoten[i]!;
  const z = kantenZug(k, ki, ns);
  if (!z) return kn.p;
  const a = tiefenAchse(k.blick);
  const out: V3T = [kn.p[0], kn.p[1], kn.p[2]];
  out[a] = z.punkte[3 * z.knoten![i]! + a]!;
  return out;
}

/** Sichtbarkeit von Knoten i der Kantenlinie ki im Blick (aus dem Netz); null ohne passendes Netz. */
export function kantenKnotenSichtbar(k: Kante, ki: number, i: number, blick: Blick, ns: NetzSicht | null = netzJetzt()): boolean | null {
  const z = kantenZug(k, ki, ns);
  if (!z) return null;
  return (z.sicht[z.knoten![i]!]! & sichtBit(blick)) !== 0;
}

/**
 * Nächste Stelle einer Kantenlinie zum Blattpunkt q (Profil-Einheiten) auf ihrem Verlauf über die Haut: Segment und
 * Anteil (12 Proben je Segment, wie im Worker). Null ohne passendes Netz — dann gilt die gespeicherte Linie.
 */
export function naechsterImNetz(k: Kante, ki: number, ansicht: Ansicht, q: { x: number; y: number }, ns: NetzSicht | null = netzJetzt()): { segment: number; t: number } | null {
  const z = kantenZug(k, ki, ns);
  if (!z) return null;
  const [a, b] = ansicht === 'seite' ? [0, 1] : ansicht === 'front' ? [2, 1] : [0, 2];
  let best = -1;
  let bd = Infinity;
  for (let j = 0; j < z.sicht.length; j++) {
    const d = (z.punkte[3 * j + a]! - q.x) ** 2 + (z.punkte[3 * j + b]! - q.y) ** 2;
    if (d < bd) {
      bd = d;
      best = j;
    }
  }
  const kn = z.knoten!;
  let s = 0;
  while (s + 2 < kn.length && kn[s + 1]! <= best) s++;
  const t = (best - kn[s]!) / Math.max(1, kn[s + 1]! - kn[s]!);
  return { segment: s, t: Math.min(1, Math.max(0, t)) };
}
