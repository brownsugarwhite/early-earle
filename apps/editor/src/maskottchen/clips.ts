// Die Bibliothek: Ozzys Bewegungen. Jeder Clip schreibt zur Zeit t die Zahlen, die er bestimmt, in eine Pose (Blick nach rechts);
// der Mischer blendet Clips im Zahlenraum ineinander, legt Federn darüber und setzt Ozzy auf seine Sohlen.
// Ozzy ist alt, steifbeinig (Gips), neugierig und unbeirrbar. Komik aus Timing statt Übertreibung: Pausen, trockene Blicke,
// kleine Bewegungen mit großer Wirkung (wie Gromit: alles spielt die Stirn).
import { type Schl, TAU, clamp, nachschwingen, puls, rausch, spurenAnwenden, stufe, type Spuren } from './bewegung';
import { Figur } from './figur';
import type { Pose } from './pose';

export interface Clip {
  name: string;
  titel: string;
  text: string;
  dauer: number;
  schleife: boolean;
  /** Vorwärtsgeschwindigkeit (Welt-Bildpunkte je Sekunde, in Blickrichtung) */
  tempo?: (t: number) => number;
  /** Boden-Löser: 0 = Clip bestimmt das Kippen, 1 = Kippen aus den Stützen (Schwerkraft) */
  frei?: number;
  /** Anteil der leisen Lebenszeichen (Atmen, kleine Zuckungen) */
  leben?: number;
  /** danach (bei Einmal-Clips) */
  danach?: string;
  /** dreht Ozzy um (am Ende schaut er in die andere Richtung) */
  wendet?: boolean;
  /** Spielt nur in der Luft (Sprung): Boden-Löser aus */
  luft?: boolean;
  pose: (t: number, p: Pose) => void;
}

const H_BEIN = 393;

// ---- Gang mit steifen Beinen -------------------------------------------------------------------------------------------
interface Gang {
  periode: number;
  schritt: number; // Grad
  art: 'pass' | 'trab';
  stand: number; // Anteil Standphase
  hub: number;
  wiegen: number; // Grad
  kopf: number; // Blickwinkel θ
}
const versatz = (art: Gang['art']) =>
  art === 'pass' ? { VN: 0, HN: 0, VF: 0.5, HF: 0.5 } : { VN: 0, HF: 0, VF: 0.5, HN: 0.5 };

/** Beine, Wiegen und Grundhaltung eines Schritts; die Höhe des Körpers ergibt sich aus den Sohlen (Boden-Löser) */
function gang(g: Gang, t: number, p: Pose): void {
  const phase = t / g.periode;
  const A = g.schritt;
  const sA = Math.sin((A * Math.PI) / 180);
  const o = versatz(g.art);
  for (const b of ['VN', 'VF', 'HN', 'HF'] as const) {
    const f = (((phase + o[b]) % 1) + 1) % 1;
    let alpha: number;
    let hub = 0;
    if (f < g.stand) {
      // Standphase: Fuß steht, die Hüfte läuft gleichmäßig darüber (asin, damit die Sohle nicht rutscht)
      const u = f / g.stand;
      alpha = (Math.asin(sA * (1 - 2 * u)) * 180) / Math.PI;
    } else {
      const u = (f - g.stand) / (1 - g.stand);
      const w = u * u * (3 - 2 * u);
      alpha = -A + 2 * A * w;
      hub = g.hub * Math.sin(u * Math.PI);
    }
    p[`bein${b}`] = alpha;
    p[`hub${b}`] = hub;
  }
  p.rollen = g.wiegen * Math.sin(phase * TAU);
  p.theta = g.kopf;
}
function gangTempo(g: Gang): number {
  return (2 * H_BEIN * Math.sin((g.schritt * Math.PI) / 180)) / (g.stand * g.periode);
}

const LAUFEN: Gang = { periode: 1.12, schritt: 11, art: 'pass', stand: 0.62, hub: 14, wiegen: 3.2, kopf: 78 };
const EILEN: Gang = { periode: 0.64, schritt: 14, art: 'trab', stand: 0.55, hub: 26, wiegen: 1.4, kopf: 84 };

// ---- kleine Helfer ------------------------------------------------------------------------------------------------------
/** Ohrzucken zur Zeit t0 (schnell spitz, dann zurück) */
const zucken = (t: number, t0: number, staerke: number) => -staerke * puls(t, t0, t0 + 0.28) * (1 - stufe(t, t0 + 0.14, t0 + 0.28) * 0.4);
const s = (werte: [number, number, Schl[2]?][]): Schl[] => werte.map(([t, v, k]) => [t, v, k] as Schl);

// ---- die Clips ----------------------------------------------------------------------------------------------------------
export const CLIPS: Clip[] = [
  {
    name: 'stehen',
    titel: 'Stehen',
    text: 'Steht, atmet, schaut sich um. Ab und zu zuckt ein Ohr, das Gewicht wandert ein wenig.',
    dauer: 6,
    schleife: true,
    frei: 0.6,
    leben: 1,
    pose: (t, p) => {
      p.theta = 15 + 8 * Math.sin((t / 6) * TAU) + 3 * rausch(t * 0.5, 1);
      p.kopfNeigen = 2.5 * Math.sin((t / 6) * TAU + 1.2);
      p.ohrV = zucken(t, 2.1, 12);
      p.ohrH = zucken(t, 4.6, 10);
      p.schwanz = 3 * Math.sin((t / 3) * TAU);
      p.nicken = 0.8 * Math.sin((t / 6) * TAU + 0.4);
    },
  },
  {
    name: 'laufen',
    titel: 'Laufen',
    text: 'Stelzengang im Passgang: erst die nahe, dann die ferne Seite. Er wiegt sich wie ein altes Blechspielzeug, der Blick fest nach vorn.',
    dauer: LAUFEN.periode * 2,
    schleife: true,
    frei: 1,
    leben: 0.35,
    tempo: () => gangTempo(LAUFEN),
    pose: (t, p) => {
      gang(LAUFEN, t, p);
      const ph = (t / LAUFEN.periode) * TAU;
      p.kopfNicken = 2.5 * Math.sin(ph * 2 + 0.6);
      p.brauenKipp = 5;
      p.schwanz = 4 + 4 * Math.sin(ph * 2 + 1.1);
      p.ohrH = 3 * Math.sin(ph * 2 + 1.6);
      p.ohrV = 3 * Math.sin(ph * 2 + 1.9);
    },
  },
  {
    name: 'eilen',
    titel: 'Eilen',
    text: 'Er hat es eilig: steifer Trab, Ohren nach hinten, Brauen tief. Schneller wird er davon kaum.',
    dauer: EILEN.periode * 2,
    schleife: true,
    frei: 1,
    leben: 0.2,
    tempo: () => gangTempo(EILEN),
    pose: (t, p) => {
      gang(EILEN, t, p);
      const ph = (t / EILEN.periode) * TAU;
      p.kopfNicken = 4 * Math.sin(ph * 2 + 0.5) + 4;
      p.brauenKipp = 11;
      p.ohrH = 10 + 4 * Math.sin(ph * 2 + 1);
      p.ohrV = 10 + 4 * Math.sin(ph * 2 + 1.3);
      p.schwanz = 10 + 6 * Math.sin(ph * 2 + 1.2);
    },
  },
  {
    name: 'anhalten',
    titel: 'Anhalten',
    text: 'Bremst mit steifen Beinen: Der Schwung kippt ihn auf die Zehen der Gipse, er wippt zweimal nach und steht.',
    dauer: 1.5,
    schleife: false,
    frei: 0,
    leben: 0.3,
    danach: 'stehen',
    tempo: (t) => 120 * (1 - stufe(t, 0, 0.35)),
    pose: (t, p) => {
      p.nicken = 7 * nachschwingen(t, 0.08, 1.3, 2.6) + 3 * puls(t, 0, 0.3);
      p.theta = 52 - 30 * stufe(t, 0.6, 1.4);
      p.kopfNicken = 6 * nachschwingen(t, 0.18, 1.3, 2.4);
      p.ohrH = 8 * nachschwingen(t, 0.2, 1.6, 2);
      p.ohrV = 8 * nachschwingen(t, 0.24, 1.6, 2);
    },
  },
  {
    name: 'umdrehen',
    titel: 'Umdrehen',
    text: 'Der Kopf ist schon da, der Körper trippelt hinterher: kleine Stelzenschritte auf der Stelle, bis er andersherum steht.',
    dauer: 1.9,
    schleife: false,
    frei: 1,
    leben: 0.3,
    danach: 'stehen',
    wendet: true,
    pose: (t, p) => {
      const k = stufe(t, 0.25, 1.65);
      p.psi = 90 - 180 * k;
      // der Kopf schaut voraus (zum Betrachter), dann folgt der Körper
      p.theta = 15 * (1 - k) - 15 * k - 10 * puls(t, 0, 0.7) * (1 - k);
      // Trippeln: vier kleine steife Schritte
      const tr = clamp((t - 0.25) / 1.4, 0, 1);
      for (const [b, o] of [
        ['VN', 0],
        ['HF', 0],
        ['VF', 0.5],
        ['HN', 0.5],
      ] as const) {
        const f = (tr * 4 + o) % 1;
        p[`bein${b}`] = tr > 0 && tr < 1 ? 6 * Math.sin(f * TAU) : 0;
        p[`hub${b}`] = tr > 0 && tr < 1 ? 16 * Math.max(0, Math.sin(f * TAU)) : 0;
      }
      p.ohrH = 6 * puls(t, 0.2, 0.7);
      p.ohrV = 6 * puls(t, 0.2, 0.7);
      p.schwanz = 8 * puls(t, 0.5, 1.6);
    },
  },
  {
    name: 'hinsetzen',
    titel: 'Hinsetzen',
    text: 'Mit Gipsbeinen ist Sitzen ein Plan: Er kippt nach hinten, das Hinterteil plumpst, die Hinterbeine stehen nach vorn wie bei einem Kleinkind.',
    dauer: 1.7,
    schleife: false,
    frei: 1,
    leben: 0.4,
    danach: 'sitzen',
    pose: (t, p) => {
      spurenAnwenden(SITZEN_SPUREN, t, p);
      p.stauchen += 0.035 * nachschwingen(t, 1.05, 3, 6);
    },
  },
  {
    name: 'sitzen',
    titel: 'Sitzen',
    text: 'Sitzt wie hingestellt, schaut, atmet, legt den Kopf einmal schief.',
    dauer: 6,
    schleife: true,
    frei: 1,
    leben: 1,
    pose: (t, p) => {
      spurenAnwenden(SITZEN_SPUREN, 99, p);
      p.theta = 12 + 10 * Math.sin((t / 6) * TAU);
      p.kopfNeigen = 10 * puls(t, 3.0, 4.6);
      p.brauen = 6 * puls(t, 2.9, 4.7);
      p.ohrV = zucken(t, 1.4, 10);
      p.schwanz = 5 * Math.sin((t / 2.4) * TAU);
    },
  },
  {
    name: 'aufstehen',
    titel: 'Aufstehen',
    text: 'Wie ein alter Herr aus dem Sessel: zweimal Anlauf nehmen, beim dritten Schaukeln klappt es.',
    dauer: 2.4,
    schleife: false,
    frei: 0.6,
    leben: 0.3,
    danach: 'stehen',
    pose: (t, p) => {
      const sitz = 1 - stufe(t, 1.55, 2.0);
      spurenAnwenden(SITZEN_SPUREN, 99, p);
      const schaukeln = 9 * Math.sin(clamp(t / 1.5, 0, 1) * TAU * 1.5) * (t < 1.55 ? 1 : 0);
      p.nicken = p.nicken * sitz + schaukeln + 6 * puls(t, 1.5, 2.0);
      for (const b of ['HN', 'HF', 'VN', 'VF'] as const) p[`bein${b}`] = (p[`bein${b}`] as number) * sitz;
      p.brauenKipp = 8 * puls(t, 0.2, 2.0);
      p.kopfNicken = 5 * Math.sin(clamp(t / 1.5, 0, 1) * TAU * 1.5 + 0.6) * sitz;
      p.theta = 30 + 15 * stufe(t, 1.5, 2.2);
    },
  },
  {
    name: 'schnueffeln',
    titel: 'Schnüffeln',
    text: 'Nase am Boden, Hinterteil hoch, die Hinterbeine schweben steif in der Luft. Gründlich, Zentimeter für Zentimeter.',
    dauer: 2.6,
    schleife: true,
    frei: 0,
    leben: 0.2,
    tempo: () => 30,
    pose: (t, p) => {
      p.nicken = 13;
      p.beinVN = 13 + 3 * Math.sin((t / 0.65) * TAU);
      p.beinVF = 13 + 3 * Math.sin((t / 0.65) * TAU + Math.PI);
      p.hubVN = 8 * Math.max(0, Math.sin((t / 0.65) * TAU));
      p.hubVF = 8 * Math.max(0, Math.sin((t / 0.65) * TAU + Math.PI));
      p.beinHN = 13;
      p.beinHF = 13;
      p.theta = 70 + 6 * Math.sin((t / 2.6) * TAU);
      p.kopfNicken = 34 + 3 * Math.sin((t / 0.65) * TAU);
      p.kopfY = 70;
      p.nase = 0.8 * Math.max(0, Math.sin(t * 22)) * (0.6 + 0.4 * Math.sin(t * 3));
      p.schwanz = 18 + 6 * Math.sin((t / 0.9) * TAU);
      p.ohrH = -6;
      p.ohrV = -6;
    },
  },
  {
    name: 'kopfSchief',
    titel: 'Kopf schief',
    text: '„Hm?“ Ohren spitz, Brauen hoch, Kopf schief. Kurz zur anderen Seite. Dann so tun, als wäre nichts gewesen.',
    dauer: 2.4,
    schleife: false,
    frei: 0.6,
    leben: 0.5,
    danach: 'stehen',
    pose: (t, p) => {
      spurenAnwenden(
        {
          theta: s([
            [0, 15],
            [0.4, 2, 'aus'],
            [2.4, 15, 'einaus'],
          ]),
          kopfNeigen: s([
            [0, 0],
            [0.32, 20, 'feder'],
            [1.1, 18],
            [1.35, -13, 'feder'],
            [1.95, -12],
            [2.4, 0, 'einaus'],
          ]),
          ohrH: s([
            [0, 0],
            [0.25, -15, 'aus'],
            [1.9, -12],
            [2.4, 0],
          ]),
          ohrV: s([
            [0, 0],
            [0.22, -16, 'aus'],
            [1.9, -12],
            [2.4, 0],
          ]),
          brauen: s([
            [0, 0],
            [0.3, 11, 'aus'],
            [1.9, 9],
            [2.4, 0],
          ]),
        },
        t,
        p,
      );
    },
  },
  {
    name: 'umschauen',
    titel: 'Umschauen',
    text: 'Hört etwas hinter sich. Dreht den Kopf langsam ganz nach hinten, starrt, und dreht weiter, statt zurück. Einmal ganz herum.',
    dauer: 3.6,
    schleife: false,
    frei: 0.6,
    leben: 0.2,
    danach: 'stehen',
    pose: (t, p) => {
      spurenAnwenden(
        {
          theta: s([
            [0, 15],
            [0.35, 15],
            [1.35, 182, 'einaus'],
            [1.9, 182],
            [3.0, 375, 'einaus'],
          ]),
          ohrH: s([
            [0, 0],
            [0.25, -16, 'aus'],
            [2.9, -12],
            [3.2, 14, 'aus'],
            [3.6, 0, 'einaus'],
          ]),
          ohrV: s([
            [0, 0],
            [0.22, -16, 'aus'],
            [2.9, -12],
            [3.25, 14, 'aus'],
            [3.6, 0, 'einaus'],
          ]),
          brauen: s([
            [0, 0],
            [0.3, 10],
            [3.0, 8],
            [3.4, 0],
          ]),
        },
        t,
        p,
      );
      p.schwanz = 0;
    },
  },
  {
    name: 'schuetteln',
    titel: 'Schütteln',
    text: 'Vom Kopf bis zum Schwanz: Die Ohren fliegen, der Ring dreht sich. Danach steht er da, als wäre nichts gewesen.',
    dauer: 1.7,
    schleife: false,
    frei: 0.6,
    leben: 0.1,
    danach: 'stehen',
    pose: (t, p) => {
      const kopf = Math.sin(t * 7.2 * TAU) * Math.exp(-Math.max(0, t - 0.15) * 2.4) * stufe(t, 0, 0.12);
      const koerper = Math.sin((t - 0.18) * 7.2 * TAU) * Math.exp(-Math.max(0, t - 0.3) * 2.6) * stufe(t, 0.15, 0.3);
      p.kopfNeigen = 24 * kopf;
      p.ohrH = 26 * kopf;
      p.ohrV = -26 * kopf;
      p.rollen = 6 * koerper;
      p.schwanz = 22 * koerper;
      p.kopfX = 18 * kopf;
      p.brauen = 6 * puls(t, 1.1, 1.7);
      p.theta = 15 - 8 * stufe(t, 0, 0.3) + 8 * stufe(t, 1.1, 1.6);
    },
  },
  {
    name: 'springen',
    titel: 'Springen',
    text: 'Ein steifer Hüpfer mit allen vieren zugleich, wie eine Ziege aus Holz. Die Ohren kommen erst nach.',
    dauer: 1.35,
    schleife: false,
    frei: 0,
    leben: 0,
    danach: 'stehen',
    tempo: (t) => 260 * puls(t, 0.22, 0.95),
    pose: (t, p) => {
      p.nicken = -5 * puls(t, 0, 0.3) + 3 * puls(t, 0.9, 1.15);
      p.heben = 230 * puls(t, 0.26, 0.92) ** 0.8;
      p.boden = t < 0.27 || t > 0.9 ? 1 : 0;
      p.stauchen = 0.05 * nachschwingen(t, 0.9, 3.2, 7) - 0.03 * puls(t, 0.24, 0.4);
      for (const b of ['VN', 'VF'] as const) p[`bein${b}`] = 7 * puls(t, 0.3, 0.88);
      for (const b of ['HN', 'HF'] as const) p[`bein${b}`] = -7 * puls(t, 0.3, 0.88);
      p.theta = 40;
      p.brauen = 5 * puls(t, 0.25, 0.9);
    },
  },
  {
    name: 'stolpern',
    titel: 'Stolpern',
    text: 'Die Vorderbeine bleiben hängen, er kippt steif nach vorn, bis die Nase den Boden berührt. Kurz bleibt er so. Dann weiter, als wäre nichts gewesen.',
    dauer: 2.1,
    schleife: false,
    frei: 0,
    leben: 0,
    danach: 'stehen',
    tempo: (t) => 140 * (1 - stufe(t, 0, 0.3)),
    pose: (t, p) => {
      spurenAnwenden(
        {
          nicken: s([
            [0, 0],
            [0.18, 2],
            [0.55, 27, 'ein'],
            [1.25, 27],
            [1.55, -4, 'plumps'],
            [2.1, 0, 'einaus'],
          ]),
          kopfNicken: s([
            [0, 0],
            [0.55, 24, 'ein'],
            [1.25, 24],
            [1.6, 0, 'einaus'],
          ]),
          kopfY: s([
            [0, 0],
            [0.55, 60, 'ein'],
            [1.25, 60],
            [1.6, 0, 'einaus'],
          ]),
          theta: s([
            [0, 52],
            [0.5, 45],
            [1.3, 20],
            [2.1, 35, 'einaus'],
          ]),
          brauen: s([
            [0, 0],
            [0.5, 8],
            [1.3, 0],
          ]),
          brauenKipp: s([
            [0, 4],
            [1.3, 4],
            [1.6, 10, 'aus'],
            [2.1, 6],
          ]),
        },
        t,
        p,
      );
      p.beinVN = p.nicken;
      p.beinVF = p.nicken;
      p.beinHN = p.nicken * 0.4;
      p.beinHF = p.nicken * 0.4;
    },
  },
  {
    name: 'erstarren',
    titel: 'Erstarren',
    text: 'Schreck! Ohren schießen hoch, er erstarrt stocksteif und kippt langsam um wie ein Brett. Bleibt liegen. Dann rappelt er sich auf.',
    dauer: 3.4,
    schleife: false,
    frei: 0,
    leben: 0,
    danach: 'stehen',
    pose: (t, p) => {
      spurenAnwenden(
        {
          ohrH: s([
            [0, 0],
            [0.12, -24, 'aus'],
            [2.5, -24],
            [2.9, 0, 'einaus'],
          ]),
          ohrV: s([
            [0, 0],
            [0.1, -24, 'aus'],
            [2.5, -24],
            [2.9, 0, 'einaus'],
          ]),
          brauen: s([
            [0, 0],
            [0.12, 14, 'aus'],
            [2.5, 14],
            [2.9, 0],
          ]),
          theta: s([
            [0, 15],
            [0.15, 0, 'aus'],
            [2.6, 0],
            [3.2, 15, 'einaus'],
          ]),
          nicken: s([
            [0, 0],
            [0.7, 0],
            [1.5, 36, 'ein'],
            [1.62, 33, 'aus'],
            [2.5, 33],
            [2.95, -3, 'plumps'],
            [3.4, 0, 'einaus'],
          ]),
          kopfY: s([
            [0, 0],
            [1.5, 70, 'ein'],
            [2.5, 70],
            [2.95, 0, 'einaus'],
          ]),
          kopfNicken: s([
            [0, 0],
            [1.5, 18, 'ein'],
            [2.5, 18],
            [2.95, 0],
          ]),
        },
        t,
        p,
      );
      p.beinVN = p.nicken;
      p.beinVF = p.nicken;
      p.beinHN = p.nicken;
      p.beinHF = p.nicken;
      p.schwanz = -6 * puls(t, 0.1, 2.5) + 14 * puls(t, 2.2, 2.4);
    },
  },
  {
    name: 'bellen',
    titel: 'Bellen',
    text: 'Ein einziges „Wuff“. Der Bart springt, die Ohren fliegen zurück, und der Rückstoß schiebt ihn einen Schritt nach hinten. Er wirkt selbst überrascht.',
    dauer: 1.5,
    schleife: false,
    frei: 0.6,
    leben: 0.2,
    danach: 'stehen',
    tempo: (t) => -260 * puls(t, 0.22, 0.42),
    pose: (t, p) => {
      p.theta = 25 - 10 * puls(t, 0.1, 0.5);
      p.kopfNicken = -10 * puls(t, 0.12, 0.3) + 8 * puls(t, 0.22, 0.45);
      p.bart = -14 * puls(t, 0.2, 0.42);
      p.kopfY = -14 * puls(t, 0.18, 0.36);
      p.ohrH = 18 * puls(t, 0.2, 0.7);
      p.ohrV = 18 * puls(t, 0.2, 0.7);
      p.nicken = -4 * puls(t, 0.2, 0.5);
      p.brauen = 12 * stufe(t, 0.45, 0.65) * (1 - stufe(t, 1.2, 1.5));
      p.kopfNeigen = 7 * stufe(t, 0.5, 0.8) * (1 - stufe(t, 1.15, 1.5));
    },
  },
  {
    name: 'wedeln',
    titel: 'Wedeln',
    text: 'Freut sich: Der Ringschwanz kreist, das Hinterteil wackelt mit, die Ohren werden weich.',
    dauer: 1.2,
    schleife: true,
    frei: 0.6,
    leben: 0.6,
    pose: (t, p) => {
      const w = Math.sin((t / 0.3) * TAU);
      p.schwanz = 14 + 18 * w;
      p.rollen = 2.5 * w;
      p.nicken = 0.8 * w;
      p.ohrH = 10;
      p.ohrV = 10;
      p.brauen = 6;
      p.theta = 12;
      p.kopfNeigen = -3 * w;
    },
  },
  {
    name: 'warten',
    titel: 'Warten',
    text: 'Ungeduldig: Das Vorderbein tippt steif wie ein Spazierstock. Ein Seufzer. Weiter tippen.',
    dauer: 3,
    schleife: true,
    frei: 0.5,
    leben: 0.6,
    pose: (t, p) => {
      const tip = t % 0.75;
      p.beinVN = 14 * Math.sin(Math.min(1, tip / 0.45) * Math.PI);
      p.hubVN = 22 * Math.sin(Math.min(1, tip / 0.45) * Math.PI);
      p.theta = 22;
      p.brauenKipp = 9;
      p.atmen = 1.5 * puls(t, 2.0, 2.9);
      p.kopfNicken = -4 * puls(t, 2.0, 2.6) + 3 * puls(t, 2.5, 2.95);
      p.ohrH = 6 * puls(t, 2.1, 2.9);
      p.ohrV = 6 * puls(t, 2.1, 2.9);
    },
  },
  {
    name: 'kratzen',
    titel: 'Kratzen',
    text: 'Es juckt am Ohr. Das steife Hinterbein schwingt hoch und rudert, kommt aber nie an. Er gibt auf, schüttelt kurz das Ohr.',
    dauer: 2.8,
    schleife: false,
    frei: 0,
    leben: 0.2,
    danach: 'stehen',
    pose: (t, p) => {
      const hoch = stufe(t, 0.3, 0.7) * (1 - stufe(t, 2.0, 2.35));
      p.beinHN = 58 * hoch + 9 * Math.sin(t * 8.5 * TAU) * hoch;
      p.hubHN = 40 * hoch;
      p.rollen = -4 * hoch;
      p.nicken = -3 * hoch;
      p.theta = 40 + 15 * hoch;
      p.kopfNeigen = -16 * hoch;
      p.brauenKipp = -5 * hoch;
      p.ohrV = 12 * Math.sin(t * 9 * TAU) * puls(t, 2.3, 2.75);
    },
  },
  {
    name: 'zielFixieren',
    titel: 'Ziel fixieren',
    text: 'Da vorn ist es! Ohren spitz, Brauen runter, ein tiefer Atemzug, ein entschlossenes Nicken.',
    dauer: 1.8,
    schleife: false,
    frei: 0.6,
    leben: 0.2,
    danach: 'stehen',
    pose: (t, p) => {
      spurenAnwenden(
        {
          theta: s([
            [0, 15],
            [0.35, 82, 'aus'],
            [1.8, 82],
          ]),
          ohrH: s([
            [0, 0],
            [0.3, -16, 'aus'],
            [1.8, -10],
          ]),
          ohrV: s([
            [0, 0],
            [0.28, -16, 'aus'],
            [1.8, -10],
          ]),
          brauenKipp: s([
            [0, 0],
            [0.5, 14, 'aus'],
            [1.8, 12],
          ]),
          atmen: s([
            [0, 0],
            [0.6, 0],
            [1.0, 1.6],
            [1.3, 0],
          ]),
          kopfNicken: s([
            [0, 0],
            [1.25, 0],
            [1.4, 12, 'aus'],
            [1.8, 0, 'feder'],
          ]),
          nicken: s([
            [0, 0],
            [0.6, 3],
            [1.8, 2],
          ]),
        },
        t,
        p,
      );
    },
  },
  {
    name: 'absprung',
    titel: 'Absprung (Spiel)',
    text: 'Kurzes Zurücklehnen, dann geht es steif nach oben (die Höhe macht das Spiel).',
    dauer: 0.18,
    schleife: false,
    frei: 0,
    danach: 'flug',
    pose: (t, p) => {
      p.nicken = -5 * Math.sin((t / 0.18) * Math.PI);
      p.stauchen = -0.03 * Math.sin((t / 0.18) * Math.PI);
      p.theta = 45;
      p.brauen = 6;
    },
  },
  {
    name: 'flug',
    titel: 'Flug (Spiel)',
    text: 'In der Luft: alle vier Gipse steif, leicht gespreizt, Brauen hoch.',
    dauer: 1,
    schleife: true,
    frei: 0,
    pose: (t, p) => {
      p.beinVN = 7;
      p.beinVF = 7;
      p.beinHN = -7;
      p.beinHF = -7;
      p.theta = 45;
      p.brauen = 7;
      p.boden = 0;
      void t;
    },
  },
  {
    name: 'landung',
    titel: 'Landung (Spiel)',
    text: 'Klack: Die Gipse setzen auf, der Körper staucht, die Ohren fallen nach.',
    dauer: 0.45,
    schleife: false,
    frei: 0.5,
    danach: 'stehen',
    pose: (t, p) => {
      p.stauchen = 0.06 * nachschwingen(t, 0, 3.2, 7);
      p.nicken = 3 * nachschwingen(t, 0, 2.6, 6);
      p.theta = 40 - 20 * stufe(t, 0.1, 0.45);
    },
  },
  {
    name: 'hinlegen',
    titel: 'Hinlegen',
    text: 'Alle vier Gipsbeine gleiten auseinander, der Bauch landet auf dem Boden. Ein langer Atemzug.',
    dauer: 1.6,
    schleife: false,
    frei: 1,
    leben: 0.3,
    danach: 'schlafen',
    pose: (t, p) => {
      const k = stufe(t, 0.2, 1.1);
      p.beinVN = 62 * k;
      p.beinVF = 62 * k;
      p.beinHN = -62 * k;
      p.beinHF = -62 * k;
      p.theta = 15 + 10 * k;
      p.kopfNicken = 10 * k;
      p.kopfY = 30 * k;
      p.atmen = 1.5 * puls(t, 1.0, 1.6);
      p.stauchen = 0.03 * nachschwingen(t, 1.1, 3, 6);
    },
  },
  {
    name: 'schlafen',
    titel: 'Schlafen',
    text: 'Schläft auf dem Bauch. Ohren hängen, Atem langsam und tief, ein Ohr zuckt im Traum.',
    dauer: 4,
    schleife: true,
    frei: 1,
    leben: 0,
    pose: (t, p) => {
      for (const b of ['VN', 'VF'] as const) p[`bein${b}`] = 62;
      for (const b of ['HN', 'HF'] as const) p[`bein${b}`] = -62;
      p.theta = 25;
      p.kopfNicken = 14 + 2 * Math.sin((t / 4) * TAU);
      p.kopfY = 40;
      p.atmen = 0.9 + 0.9 * Math.sin((t / 4) * TAU);
      p.ohrH = 22;
      p.ohrV = 22 + zucken(t, 2.7, -10);
      p.brauen = -5;
      p.schwanz = -6;
    },
  },
  {
    name: 'aufwachen',
    titel: 'Aufwachen',
    text: 'Ein Ohr hoch, dann das andere. Kopf hoch. Mit einem Ruck stehen die Gipse wieder.',
    dauer: 1.8,
    schleife: false,
    frei: 1,
    leben: 0.3,
    danach: 'stehen',
    pose: (t, p) => {
      const auf = stufe(t, 1.1, 1.45);
      for (const b of ['VN', 'VF'] as const) p[`bein${b}`] = 62 * (1 - auf);
      for (const b of ['HN', 'HF'] as const) p[`bein${b}`] = -62 * (1 - auf);
      p.ohrH = 22 - 34 * stufe(t, 0.15, 0.35) + 12 * stufe(t, 1.2, 1.8);
      p.ohrV = 22 - 34 * stufe(t, 0.45, 0.65) + 12 * stufe(t, 1.2, 1.8);
      p.kopfNicken = 14 * (1 - stufe(t, 0.6, 1.0));
      p.kopfY = 40 * (1 - stufe(t, 0.6, 1.1));
      p.theta = 25 - 10 * stufe(t, 0.7, 1.4);
      p.brauen = -5 + 13 * stufe(t, 0.5, 0.9) - 8 * stufe(t, 1.3, 1.8);
      p.stauchen = -0.03 * puls(t, 1.1, 1.4) + 0.03 * nachschwingen(t, 1.4, 3, 6);
    },
  },
];

/** Sitzen: nach hinten gekippt, Hinterbeine nach vorn, Vorderbeine senkrecht */
const SITZEN_SPUREN: Spuren = {
  nicken: s([
    [0, 0],
    [0.35, 2],
    [1.0, -17, 'ein'],
    [1.7, -17],
  ]),
  beinHN: s([
    [0, 0],
    [0.35, 0],
    [1.05, 46, 'ein'],
    [1.7, 46],
  ]),
  beinHF: s([
    [0, 0],
    [0.35, 0],
    [1.05, 46, 'ein'],
    [1.7, 46],
  ]),
  beinVN: s([
    [0, 0],
    [0.4, 0],
    [1.0, -17, 'ein'],
    [1.7, -17],
  ]),
  beinVF: s([
    [0, 0],
    [0.4, 0],
    [1.0, -17, 'ein'],
    [1.7, -17],
  ]),
  theta: s([
    [0, 15],
    [0.3, 45],
    [1.0, 30],
    [1.7, 15],
  ]),
  kopfNicken: s([
    [0, 0],
    [0.3, 10],
    [0.9, -6],
    [1.7, 0],
  ]),
  ohrH: s([
    [0, 0],
    [1.0, 8],
    [1.7, 2],
  ]),
  ohrV: s([
    [0, 0],
    [1.0, 8],
    [1.7, 2],
  ]),
};

export const CLIP: Record<string, Clip> = Object.fromEntries(CLIPS.map((c) => [c.name, c]));
void Figur;
