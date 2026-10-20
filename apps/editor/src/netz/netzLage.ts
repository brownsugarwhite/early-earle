// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1: Lagen aus dem 3D-Liniennetz des Workers (`WesenNetz.netzSicht`,
// Profil-Einheiten der Ruhelage) für die Blätter. Ein Netzpunkt hat genau einen 3D-Punkt; jede Ansicht zeigt ihn an seiner
// Projektion, verdeckt blass. Ohne DOM (die Kanten-Ebene und Prüfungen lesen es).
import type { Ansicht, Blick, Dokument, Kante, V3T } from '@ee/shape';
import { type NetzSicht, type NetzZug, SICHT } from '@ee/shape/kern';
import { aktuellesNetz } from '../kern/netzStand';
import { useEditor } from '../state/editorStore';
import { type NetzPunkt, useUi } from '../state/uiStore';

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

/**
 * Knoten einer Umrisszeichnung als 3D-Punkt (Profil-Einheiten) mit Sichtbarkeit: der Punkt seiner Umrisslinie (Plan
 * 20.10., V2: `NetzSicht.knoten`, der Ring sitzt auf der Linie, auch wo die Zeichnung neben dem Körper liegt), um die Strecke
 * verschoben, die der Knoten seit dem Bau gezogen wurde (während einer Geste folgt der Ring so sofort dem Zeiger). Seite:
 * auf der Naht bzw. am Teil neben ihr; Front und Top: das Spiegelbild hat eigene Einträge hinter der gezeichneten Hälfte.
 * Hinkt das Netz einen Bau nach (andere Knotenzahl), gilt die Zeichnung mit der Tiefe der nächsten Probe einer
 * Umrisslinie dieser Ansicht.
 */
export function umrissKnotenLage(dok: Dokument, quelle: 'seite' | 'front' | 'top', index: number, spiegel: boolean, ns: NetzSicht): { p: V3T; sicht: number } | null {
  const k = dok.profile[quelle].knoten[index];
  if (!k) return null;
  // Lage in der eigenen Ansicht (Front: u = z, v = y; Top: u = x, v = z; Seite: u = x, v = y)
  const u = quelle === 'front' && spiegel ? -k.p.x : k.p.x;
  const v = quelle === 'top' && spiegel ? -k.p.y : k.p.y;
  const t = tiefenAchse(quelle);
  const n = dok.profile[quelle].knoten.length;
  const lagen = ns.knoten[quelle];
  const j = quelle !== 'seite' && spiegel ? n + index : index;
  const passt = lagen.length === 3 * (quelle === 'seite' ? n : 2 * n) && Number.isFinite(lagen[3 * j + t]!);
  if (passt) {
    // Punkt der Linie, um die seit dem Bau gezogene Strecke in der eigenen Ansicht verschoben
    const z = ns.knotenZeichnung[quelle];
    const du = u - z[2 * j]!;
    const dv = v - z[2 * j + 1]!;
    const x = lagen[3 * j]!;
    const y = lagen[3 * j + 1]!;
    const zz = lagen[3 * j + 2]!;
    const sicht = ns.knotenSicht[quelle][j]!;
    if (quelle === 'seite') return { p: [x + du, y + dv, zz], sicht };
    if (quelle === 'front') return { p: [x, y + dv, zz + du], sicht };
    return { p: [x + du, y, zz + dv], sicht };
  }
  // Das Netz hinkt nach: die Zeichnung, mit der Tiefe der nächsten Probe einer Umrisslinie dieser Ansicht
  const [a, b] = quelle === 'seite' ? [0, 1] : quelle === 'front' ? [2, 1] : [0, 2];
  let tiefe = Number.NaN;
  let sicht = 0;
  let bd = Infinity;
  for (const z of ns.zuege) {
    if (z.art !== `umriss-${quelle}`) continue;
    for (let i = 0; i < z.sicht.length; i++) {
      // in der Seite die nahe Hälfte zuerst (der Ring eines Beins sitzt am Bein vorn)
      const dz = quelle === 'seite' && z.punkte[3 * i + 2]! < -1e-6 ? 1e-6 : 0;
      const d = (z.punkte[3 * i + a]! - u) ** 2 + (z.punkte[3 * i + b]! - v) ** 2 + dz;
      if (d < bd) {
        bd = d;
        tiefe = z.punkte[3 * i + t]!;
        sicht = z.sicht[i]!;
      }
    }
  }
  if (!Number.isFinite(tiefe)) return null;
  if (quelle === 'seite') return { p: [u, v, tiefe], sicht };
  if (quelle === 'front') return { p: [tiefe, v, u], sicht };
  return { p: [u, tiefe, v], sicht };
}

/** 3D-Punkt eines Netzpunkts (Umrissknoten oder Kantenknoten), null ohne Netz oder Knoten. */
export function netzPunktLage(dok: Dokument, np: NetzPunkt, ns: NetzSicht | null = netzJetzt()): { p: V3T; sicht: number } | null {
  if (!ns) return null;
  if (np.art === 'umriss') return umrissKnotenLage(dok, np.quelle, np.index, np.spiegel, ns);
  const k = dok.kanten?.[np.kante];
  if (!k?.knoten[np.index]) return null;
  const p = kantenKnotenLage(k, np.kante, np.index, ns);
  const z = netzZug(`l:${np.kante}${np.spiegel ? 's' : ''}`, ns);
  const sicht = z?.knoten && z.knoten.length === k.knoten.length ? z.sicht[z.knoten[np.index]!]! : 0xff;
  return { p: np.spiegel ? [p[0], p[1], -p[2]] : p, sicht };
}

/**
 * Zug eines Knotens in einem fremden Blatt: nur die gemeinsame Koordinate wirkt (Seite ↔ Front: y, Seite ↔ Top: x,
 * Front ↔ Top: z). `d` = Verschiebung in den Blattkoordinaten (Profil-Einheiten), Ergebnis = Verschiebung des Knotens in
 * seiner eigenen Zeichnung. Am Spiegelbild läuft z andersherum.
 */
export function gemeinsamerZug(blatt: Ansicht, quelle: 'seite' | 'front' | 'top', d: { x: number; y: number }, spiegel: boolean): { x: number; y: number } {
  const s = spiegel ? -1 : 1;
  if (blatt === quelle) return d;
  if (blatt === 'seite') return quelle === 'front' ? { x: 0, y: d.y } : { x: d.x, y: 0 };
  if (blatt === 'front') return quelle === 'seite' ? { x: 0, y: d.y } : { x: 0, y: s * d.x };
  return quelle === 'seite' ? { x: d.x, y: 0 } : { x: s * d.y, y: 0 };
}
