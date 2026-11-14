// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4 „Teile erkennen“: Prüfsatz mit von Hand eingeordneten Körpern. Regel der
// Einordnung (wie man Teile auf einer Zeichnung markiert): Ein Teil ist eine Ausbuchtung, die durch eine Kehle vom Rest
// getrennt ist — bei abgeknickten Teilen genügt eine Seite (Hals auf dem Körper), gerade Teile brauchen beide Seiten
// (Stiel, Schwanz mit Taille). Kopf und Hals zählen zusammen, solange zwischen ihnen keine Kehle liegt. Seitlich = links
// und rechts getrennt (in Front oder Top neben der Mitte), sonst Mitte. Mehrdeutige Ausbuchtungen (flache Kehle, kaum
// dünner als der Rumpf) sind erlaubt, aber keine Pflicht — Florian entscheidet sie an seinen Zeichnungen.
// Jedes erwartete Teil hat einen Ort in einer Ansicht (Blattkoordinaten, Kern-Einheiten), den das erkannte Teil enthalten
// muss: gezeichnete Punkte der eigenen Prüfkörper oder Extrempunkte des Umrisses (oben, vorn, …). DOM-frei.
import type { V2 } from '../../bezier';
import { type Dokument, dokumentLesen } from '../../dokument';
import ueberhangJson from '../../versuch/vorlagen/ueberhang.json';
import { vorlageDokument } from '../../versuch/vorlagen';
import { type BlattName, type Teil, type Teilbaum } from '../grundkoerper/teilbaum';
import { huelle } from '../grundkoerper/huelle';
import { G_KOERPER, type GKoerper, S0_KOERPER, type S0Koerper, gKoerperDokument, s0KoerperDokument } from './grundkoerper';
import { KOERPER, type KoerperArt, koerperDokument, vorlageVon } from './koerper';
import { zufall } from './zufall';

/** Ort eines erwarteten Teils: ein Punkt oder ein Extrempunkt des Umrisses einer Ansicht (wo: nur vordere/hintere Hälfte). */
export type Ort = { blatt: BlattName; p: V2 } | { blatt: BlattName; extrem: 'oben' | 'unten' | 'vorn' | 'hinten' | 'aussen'; wo?: 'vorn' | 'hinten' };
export type Erwartet = { art: 'mitte' | 'paar'; name: string; ort: Ort };
export type Einordnung = { pflicht: Erwartet[]; erlaubt?: Erwartet[]; grund: string };

const oben: Ort = { blatt: 'seite', extrem: 'oben' };
const aussenTop: Ort = { blatt: 'top', extrem: 'aussen' };

/** Die Einordnung von Hand je Körper. */
export const TEIL_SATZ: Record<string, Einordnung> = {
  kugel: { pflicht: [], grund: 'rund, keine Kehle' },
  ei: { pflicht: [], grund: 'konvex' },
  wurst: { pflicht: [], grund: 'konvex, lang' },
  turm: { pflicht: [], grund: 'konvex, hoch' },
  flunder: { pflicht: [], grund: 'konvex, flach (Front breite Ellipse ist kein Paar)' },
  birne: { pflicht: [], grund: 'flache Mulde zwischen Kopf und Bauch, kein Teil' },
  kasten: { pflicht: [], erlaubt: [{ art: 'mitte', name: 'Schnauze', ort: { blatt: 'seite', extrem: 'vorn' } }], grund: 'Tigerkopf; die Kastenschnauze hat nur oben eine Stufe' },
  tiger: { pflicht: [], erlaubt: [{ art: 'mitte', name: 'Schnauze', ort: { blatt: 'seite', extrem: 'vorn' } }], grund: 'wie Kasten' },
  rex: {
    pflicht: [],
    erlaubt: [
      { art: 'mitte', name: 'Schwanz', ort: { blatt: 'seite', extrem: 'hinten' } },
      { art: 'paar', name: 'Wülste oben', ort: { blatt: 'front', p: { x: 0.088, y: 0.335 } } },
    ],
    grund: 'Kopf fließt in den Körper; der Schwanz hat eine flache Taille; oben in der Front zwei kleine Wülste mit Kerbe',
  },
  robbe: { pflicht: [], erlaubt: [{ art: 'mitte', name: 'Kopf', ort: oben }], grund: 'Kopf mit flachem Hals' },
  langhals: { pflicht: [{ art: 'mitte', name: 'Hals/Kopf', ort: oben }], grund: 'Hals knickt aus dem Körper' },
  drache: { pflicht: [{ art: 'mitte', name: 'Hals/Kopf', ort: oben }], grund: 'wie Langhals, dicker Hals' },
  ente: { pflicht: [{ art: 'mitte', name: 'Hals/Kopf', ort: oben }, { art: 'paar', name: 'Flügel', ort: aussenTop }], grund: 'Florians Ente: Hals mit Kehle hinten, Flügel nur im Top' },
  'giraffe-bauch': { pflicht: [{ art: 'mitte', name: 'Hals/Kopf', ort: oben }], grund: 'Bauch vor der Nase gehört zum Rumpf' },
  's-hals': { pflicht: [{ art: 'mitte', name: 'Hals/Kopf', ort: oben }], grund: 'Schwanenhals' },
  fisch: {
    pflicht: [
      { art: 'mitte', name: 'Rückenflosse', ort: { blatt: 'seite', p: { x: 0.02, y: 0.5 } } },
      { art: 'mitte', name: 'Bauchflosse', ort: { blatt: 'seite', p: { x: 0.04, y: 0.06 } } },
      { art: 'mitte', name: 'Schwanz oben', ort: { blatt: 'seite', p: { x: 0.42, y: 0.35 } } },
      { art: 'mitte', name: 'Schwanz unten', ort: { blatt: 'seite', p: { x: 0.42, y: 0.14 } } },
      { art: 'paar', name: 'Brustflossen', ort: aussenTop },
    ],
    grund: 'Flossen auf der Mitte, Schwanzgabel = zwei Lappen, Brustflossen seitlich',
  },
  einfach: { pflicht: [{ art: 'paar', name: 'Spitzen hinten', ort: aussenTop }], grund: 'Florians Form: die Kerbe trennt die Spitzen' },
  'einfach-glatt': { pflicht: [], grund: 'Pfeil ohne Kerbe: konvex, die Ecken sind keine Teile' },
  'ente-haken': {
    pflicht: [{ art: 'mitte', name: 'Hals/Kopf', ort: oben }, { art: 'paar', name: 'Flügelhaken', ort: aussenTop }],
    erlaubt: [{ art: 'mitte', name: 'Schwanz', ort: { blatt: 'seite', extrem: 'hinten' } }],
    grund: 'Florians Haken im Top; Schwanz nur oben mit Kehle',
  },
  ueberhang: {
    pflicht: [{ art: 'mitte', name: 'Hals/Kopf', ort: oben }],
    erlaubt: [
      { art: 'paar', name: 'Flügelansatz', ort: aussenTop },
      { art: 'mitte', name: 'Schwanz', ort: { blatt: 'seite', extrem: 'hinten' } },
    ],
    grund: 'Library-Ente: kleiner Flügelansatz im Top',
  },
  vase: { pflicht: [{ art: 'mitte', name: 'Hals', ort: oben }], grund: 'Hals mit Schultern auf beiden Seiten' },
  vierbeiner: {
    pflicht: [
      { art: 'paar', name: 'Vorderbeine', ort: { blatt: 'seite', extrem: 'unten', wo: 'vorn' } },
      { art: 'paar', name: 'Hinterbeine', ort: { blatt: 'seite', extrem: 'unten', wo: 'hinten' } },
    ],
    erlaubt: [{ art: 'mitte', name: 'Kopf', ort: { blatt: 'seite', extrem: 'vorn' } }],
    grund: 'vier Beine = zwei Paare (Front: Lücke in der Mitte); der Kopf ist kaum dünner als der Körper',
  },
  zweihals: { pflicht: [{ art: 'paar', name: 'zwei Hälse', ort: oben }], grund: 'in der Seite ein Hals, in Front und Top zwei' },
  augenstiele: { pflicht: [{ art: 'paar', name: 'Augenstiele', ort: oben }], grund: 'Front: zwei Stiele neben der Mitte' },
  'fluegel-oben': { pflicht: [{ art: 'paar', name: 'Flügel', ort: oben }], grund: 'in der Seite wie eine Rückenflosse, in der Front ein V' },
};

export const TEIL_SATZ_KOERPER = Object.keys(TEIL_SATZ);

/** Dokument eines Körpers des Prüfsatzes. */
export function teilSatzDokument(name: string): Dokument {
  if (name === 'ueberhang') return dokumentLesen(ueberhangJson);
  if (name === 'tiger') return vorlageDokument(vorlageVon('tiger'), 'zu', 'tiger');
  if ((G_KOERPER as readonly string[]).includes(name)) return gKoerperDokument(name as GKoerper);
  if ((S0_KOERPER as readonly string[]).includes(name)) return s0KoerperDokument(name as S0Koerper);
  if ((KOERPER as readonly string[]).includes(name)) return koerperDokument(name as KoerperArt, zufall(1));
  throw new Error(`unbekannter Körper ${name}`);
}

/** Punkt eines Orts (Blattkoordinaten). */
export function ortPunkt(dok: Dokument, ort: Ort): V2 {
  if ('p' in ort) return ort.p;
  const poly = huelle(dok)[ort.blatt];
  let xm = 0;
  for (const q of poly) xm += q.x;
  xm /= poly.length;
  const kandidaten = poly.filter((q) => !ort.wo || (ort.wo === 'vorn' ? q.x < xm : q.x > xm));
  const wert = (q: V2) => (ort.extrem === 'oben' ? q.y : ort.extrem === 'unten' ? -q.y : ort.extrem === 'vorn' ? -q.x : ort.extrem === 'hinten' ? q.x : q.y);
  let best = kandidaten[0]!;
  for (const q of kandidaten) if (wert(q) > wert(best)) best = q;
  return best;
}

/** Abstand eines Punkts zu einem geschlossenen Umriss (0 = innen). */
function abstandZuUmriss(poly: readonly V2[], q: V2): number {
  let drin = false;
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y || 1e-12) + a.x) drin = !drin;
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const f = Math.max(0, Math.min(1, ((q.x - a.x) * ab.x + (q.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
    d = Math.min(d, Math.hypot(a.x + ab.x * f - q.x, a.y + ab.y * f - q.y));
  }
  return drin ? 0 : d;
}

/** Enthält das Teil den Ort? Über seinen Umriss in der Ansicht (Toleranz 0,012 ≈ 5,5 px: Extrempunkte liegen auf dem Rand). */
export function teilEnthaelt(t: Teil, blatt: BlattName, q: V2): boolean {
  const e = t.erkannt[blatt];
  if (!e) return false;
  const p = blatt === 'seite' ? q : { x: q.x, y: Math.abs(q.y) };
  return abstandZuUmriss(e.umriss, blatt === 'front' ? { x: Math.abs(q.x), y: q.y } : p) <= 0.012;
}

export type Pruefung = { richtig: boolean; fehlt: string[]; falscheArt: string[]; zuviel: string[] };

/** Einordnung prüfen: jedes Pflichtteil mit Ort und Art gefunden, jedes weitere Teil ist ein erlaubtes. */
export function einordnungPruefen(dok: Dokument, b: Teilbaum, e: Einordnung): Pruefung {
  const teile = b.teile.slice(1);
  const frei = new Set(teile);
  const fehlt: string[] = [];
  const falscheArt: string[] = [];
  const suche = (x: Erwartet) => {
    const q = ortPunkt(dok, x.ort);
    return teile.find((t) => frei.has(t) && teilEnthaelt(t, x.ort.blatt, q));
  };
  for (const x of e.pflicht) {
    const t = suche(x);
    if (!t) fehlt.push(x.name);
    else {
      frei.delete(t);
      if (t.art !== x.art) falscheArt.push(`${x.name} als ${t.art}`);
    }
  }
  for (const x of e.erlaubt ?? []) {
    const t = suche(x);
    if (t && t.art === x.art) frei.delete(t);
  }
  const zuviel = [...frei].map((t) => `${t.art}:${t.richtung}`);
  return { richtig: !fehlt.length && !falscheArt.length && !zuviel.length, fehlt, falscheArt, zuviel };
}
