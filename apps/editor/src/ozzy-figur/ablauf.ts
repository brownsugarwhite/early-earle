// Ozzy-Figur, Etappe D: Abläufe zwischen den Haltungen mit eigener Zeit und Zusatzbewegungen. Florian (19.11.): „Es soll 2
// verschiedene hinsetzen geben. Einmal soll er mit den hinterbeinen leicht springen und auf den hintern knallen. Einmal soll es so
// sein wie jetzt aber das biegen der hinterbeine muss viel deutlicher sein. Erst wenn der hintern den boden berührt streckt er das
// hinterbein dann nach vorne. Beim liegen noch am, auf den bauch rutschen, feilen und ein gemütliches hinlegen. Beim sitzen zum liegen
// bitte vorne runtergleiten mit den vorderpfoten, dabei stellt er den hintern leicht in die höhe und das hinterbein stellt sich mit
// leichter biegung auf und dann rutscht es nach hinten durch zur liegeposition. Es soll witziger und schöner sein.“
//
// Ein Ablauf ist eine Folge von Abschnitten: Ziel (Mischung der Haltungen), Dauer, Kurve der Zeit und Zusatzbewegungen (Hüpfer,
// Aufprall, Seufzer, Wedeln). Er ist eine reine Funktion der Zeit: Die Szenen zeigen ihn ohne Feder, die Steuerung legt ihre Feder
// darüber. Ohne DOM und ohne Uhr.
import { type Anker, type Gewichte, gewichtsliste, HALTUNGEN, type HaltungName } from './haltung';
import type { Effekte } from './raster';

export type Kurve = 'weich' | 'fallen' | 'auf' | 'linear';
export interface Abschnitt {
  /** Ziel des Abschnitts (Mischung der Haltungen) */
  nach: Gewichte;
  /** Sekunden bei Tempo 1 */
  dauer: number;
  /** Zeitkurve: weich (an- und abschwellend), fallen (immer schneller), auf (schnell, dann langsam), linear */
  kurve?: Kurve;
  /** Hüpfer: das Hinterteil hebt im Bogen ab (rad am höchsten Punkt) */
  hub?: number;
  /** Schwanzwedeln während des Abschnitts (rad) */
  wedeln?: number;
  /** Aufprall am Ende (Stärke 0 … 1): Ozzy staucht sich, der Kopf federt nach */
  plumps?: number;
  /** Seufzer am Ende (Stärke 0 … 1): sanftes Stauchen und Nachsinken des Kopfs */
  seufzer?: number;
  /** was in diesem Abschnitt stehen bleibt (Ozzy verschiebt sich als Ganzes, statt dass es rutscht): Vorder-, Hinterpfoten, alle, Hintern */
  steht?: Anker;
}
/** Ort dessen, was stehen bleibt, bei bestimmten Gewichten (vom Raster) */
export type AnkerOrt = (g: Gewichte, anker: Anker) => number;
export type AblaufName = 'hinsetzen' | 'huepfer' | 'rutschen' | 'gemuetlich' | 'umlegen' | 'aufsetzen' | 'aufstehen' | 'aufstehenSitz';
export interface Ablauf {
  abschnitte: Abschnitt[];
  /** Zeit nach dem letzten Abschnitt, in der Aufprall und Seufzer ausklingen (Sekunden bei Tempo 1) */
  nachlauf: number;
}

/** Art eines Wechsels, wo es mehrere gibt */
export type Art = 'normal' | 'huepfer' | 'gemuetlich';

const eins = (h: HaltungName): Gewichte => ({ [h]: 1 });

/** Florians Abläufe (Zeiten bei Tempo 1) */
export const ABLAEUFE: Record<AblaufName, Ablauf> = {
  // Stehen → Sitzen: die Hinterbeine biegen sich, bis der Hintern am Boden ist; erst dann streckt sich das Hinterbein nach vorn
  hinsetzen: {
    abschnitte: [
      { nach: eins('hocke'), dauer: 0.75, kurve: 'weich', steht: 'hinten' },
      { nach: eins('sitzen'), dauer: 0.45, kurve: 'weich', steht: 'koerper' },
    ],
    nachlauf: 0,
  },
  // Stehen → Sitzen mit Hüpfer: kurz ausholen, mit den Hinterbeinen hüpfen (sie schwingen in der Luft nach vorn), auf den Hintern
  // plumpsen
  huepfer: {
    abschnitte: [
      { nach: { stehen: 0.72, hocke: 0.28 }, dauer: 0.2, kurve: 'weich', steht: 'alle' },
      { nach: eins('sitzen'), dauer: 0.34, kurve: 'linear', hub: 0.12, plumps: 1, steht: 'vorn' },
    ],
    nachlauf: 0.7,
  },
  // Stehen → Liegen: die Beine rutschen weg, der Körper fällt immer schneller, der Bauch plumpst auf
  rutschen: {
    abschnitte: [{ nach: eins('liegen'), dauer: 0.8, kurve: 'fallen', plumps: 0.8, steht: 'alle' }],
    nachlauf: 0.7,
  },
  // Stehen → Liegen gemütlich: vorn runter (Diener, ein wenig wedeln), dann sinkt das Hinterteil, am Ende ein Seufzer
  gemuetlich: {
    abschnitte: [
      { nach: eins('diener'), dauer: 1.0, kurve: 'weich', wedeln: 0.22, steht: 'hinten' },
      { nach: eins('liegen'), dauer: 1.1, kurve: 'weich', seufzer: 1, steht: 'vorn' },
    ],
    nachlauf: 1.1,
  },
  // Sitzen → Liegen: vorn runtergleiten, Hintern leicht hoch, Hinterbein stellt sich gebogen auf (wedeln), dann rutscht es nach
  // hinten durch
  umlegen: {
    abschnitte: [
      { nach: eins('diener'), dauer: 0.8, kurve: 'weich', wedeln: 0.32, steht: 'koerper' },
      { nach: eins('liegen'), dauer: 0.6, kurve: 'fallen', plumps: 0.4, steht: 'vorn' },
    ],
    nachlauf: 0.6,
  },
  // Liegen → Sitzen: Hinterbeine unter den Körper (Diener), Hintern runter (Hocke), Hinterbein nach vorn
  aufsetzen: {
    abschnitte: [
      { nach: eins('diener'), dauer: 0.6, kurve: 'weich', steht: 'vorn' },
      { nach: eins('hocke'), dauer: 0.5, kurve: 'weich', steht: 'hinten' },
      { nach: eins('sitzen'), dauer: 0.4, kurve: 'weich', steht: 'koerper' },
    ],
    nachlauf: 0,
  },
  // Liegen → Stehen: Hintern zuerst (Diener), dann vorn hoch
  aufstehen: {
    abschnitte: [
      { nach: eins('diener'), dauer: 0.65, kurve: 'weich', wedeln: 0.18, steht: 'vorn' },
      { nach: eins('stehen'), dauer: 0.6, kurve: 'weich', steht: 'hinten' },
    ],
    nachlauf: 0,
  },
  // Sitzen → Stehen: Hinterbein unter den Körper (Hocke), dann hoch
  aufstehenSitz: {
    abschnitte: [
      { nach: eins('hocke'), dauer: 0.4, kurve: 'weich', steht: 'koerper' },
      { nach: eins('stehen'), dauer: 0.6, kurve: 'weich', steht: 'hinten' },
    ],
    nachlauf: 0,
  },
};

/** Ablauf von einer (gezeichneten oder gebauten) Haltung zu einer anderen, nach Art; null: direkt (Dauer nach dem Abstand) */
export function ablaufFuer(von: HaltungName, nach: HaltungName, art: Art = 'normal'): Ablauf | null {
  const name: AblaufName | null =
    von === 'stehen' && nach === 'sitzen'
      ? art === 'huepfer'
        ? 'huepfer'
        : 'hinsetzen'
      : von === 'stehen' && nach === 'liegen'
        ? art === 'gemuetlich'
          ? 'gemuetlich'
          : 'rutschen'
        : von === 'sitzen' && nach === 'liegen'
          ? 'umlegen'
          : von === 'liegen' && nach === 'sitzen'
            ? 'aufsetzen'
            : von === 'liegen' && nach === 'stehen'
              ? 'aufstehen'
              : von === 'sitzen' && nach === 'stehen'
                ? 'aufstehenSitz'
                : null;
  if (name) return ABLAEUFE[name];
  // aus den gebauten Haltungen
  const wege: Partial<Record<`${HaltungName}>${HaltungName}`, HaltungName[]>> = {
    'hocke>liegen': ['diener', 'liegen'],
    'diener>sitzen': ['hocke', 'sitzen'],
  };
  const w = wege[`${von}>${nach}`];
  return w ? { abschnitte: w.map((h) => ({ nach: eins(h), dauer: 0.55, kurve: 'weich' as const, steht: 'alle' as const })), nachlauf: 0 } : null;
}

const kurve = (k: Kurve | undefined, u: number): number => {
  const x = Math.max(0, Math.min(1, u));
  if (k === 'fallen') return x * x;
  if (k === 'auf') return 1 - (1 - x) * (1 - x);
  if (k === 'linear') return x;
  return x * x * (3 - 2 * x);
};
const liste = (g: Gewichte): number[] => gewichtsliste(g);
const ausListe = (w: number[]): Gewichte => Object.fromEntries(HALTUNGEN.map((x, i) => [x.name, w[i]!])) as Gewichte;

/** Aufprall: Stauchung und Nachfedern des Kopfs nach dt Sekunden (gedämpfte Schwingung, beginnt bei 0) */
function aufprall(dt: number, staerke: number): { stauchung: number; kopf: number } {
  if (dt < 0 || staerke <= 0) return { stauchung: 0, kopf: 0 };
  const huelle = Math.exp(-dt / 0.15);
  const w = 2 * Math.PI * 2.6;
  return { stauchung: staerke * 0.13 * Math.sin(w * dt) * huelle, kopf: staerke * 11 * Math.sin(w * dt - 0.5) * huelle * Math.min(1, dt / 0.04) };
}
/** Seufzer: ein langsames Ein- und Ausatmen (sanftes Stauchen, der Kopf sinkt nach und kommt zurück) */
function seufzer(dt: number, staerke: number): { stauchung: number; kopf: number } {
  const T = 1.0;
  if (dt < 0 || dt > T || staerke <= 0) return { stauchung: 0, kopf: 0 };
  const s = Math.sin((Math.PI * dt) / T) ** 2;
  return { stauchung: staerke * 0.045 * s, kopf: staerke * 7 * s };
}

/** Gesamtdauer eines Ablaufs (Sekunden bei Tempo 1) */
export function dauerVon(a: Ablauf): number {
  return a.abschnitte.reduce((s, x) => s + x.dauer, 0) + a.nachlauf;
}

/**
 * Lage eines Ablaufs nach `zeit` Sekunden (bei Tempo 1), ausgehend von den Gewichten `start`: Gewichte und Zusatzbewegungen. Stetig in
 * der Zeit (Abschnitte beginnen, wo der vorige endet; Hub, Wedeln, Aufprall und Seufzer beginnen und enden bei 0).
 */
export function ablaufBei(a: Ablauf, start: Gewichte, zeit: number, anker?: AnkerOrt): { gewichte: Gewichte; effekte: Effekte; fertig: boolean; steht?: Anker } {
  let von = liste(start);
  let t0 = 0;
  let w = von;
  let steht: Anker | undefined;
  const e: Required<Effekte> = { hub: 0, stauchung: 0, kopf: 0, wedeln: 0, versatz: 0 };
  for (const x of a.abschnitte) {
    const nach = liste(x.nach);
    const u = x.dauer > 0 ? (zeit - t0) / x.dauer : 1;
    if (u >= 0 && u <= 1) {
      const k = kurve(x.kurve, u);
      w = von.map((v, i) => v + (nach[i]! - v) * k);
      if (x.hub) e.hub += x.hub * 4 * u * (1 - u);
      if (x.wedeln) e.wedeln += x.wedeln * Math.sin(2 * Math.PI * 3 * (zeit - t0)) * Math.sin(Math.PI * u);
    } else if (u > 1) w = nach;
    // was stehen bleibt: Ozzy verschiebt sich um das, was es sonst wanderte (vom Anfang des Abschnitts bis jetzt)
    if (x.steht && zeit >= t0) {
      if (anker) e.versatz += anker(ausListe(von), x.steht) - anker(ausListe(w), x.steht);
      steht = x.steht;
    }
    const ende = t0 + x.dauer;
    if (x.plumps) {
      const p = aufprall(zeit - ende, x.plumps);
      e.stauchung += p.stauchung;
      e.kopf += p.kopf;
    }
    if (x.seufzer) {
      const p = seufzer(zeit - ende, x.seufzer);
      e.stauchung += p.stauchung;
      e.kopf += p.kopf;
    }
    if (zeit < t0) break;
    von = nach;
    t0 = ende;
  }
  const out: { gewichte: Gewichte; effekte: Effekte; fertig: boolean; steht?: Anker } = { gewichte: ausListe(w), effekte: e, fertig: zeit >= dauerVon(a) };
  if (steht) out.steht = steht;
  return out;
}
