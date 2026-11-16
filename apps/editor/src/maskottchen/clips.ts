// Die Bibliothek: Ozzys Bewegungen. Jeder Clip schreibt zur Zeit t die Zahlen, die er bestimmt, in eine Pose (Blick nach rechts);
// der Mischer blendet Clips im Zahlenraum ineinander, legt Federn darüber und setzt Ozzy auf seine Sohlen.
// Ozzy ist alt, steifbeinig (Gips), neugierig und unbeirrbar. Komik aus Timing statt Übertreibung: Pausen, trockene Blicke,
// kleine Bewegungen mit großer Wirkung (wie Gromit: alles spielt die Stirn).
//
// Gips heißt: Die Beine knicken nie, sie drehen nur in der Hüfte. Was ein Hund sonst mit den Knien macht, macht Ozzy mit dem
// ganzen Körper: Er wiegt sich, um ein Bein vom Boden zu bekommen, kippt über die Kante der Sohle, rutscht mit steifen Beinen
// auseinander, und die weiche Bohne fängt jeden Stoß ab (staucht, hängt durch, wabbelt nach). Sitzen, Liegen und Stolpern sind
// ausgerechnet, nicht geschätzt: Die Sohlen bleiben am Boden, gekippt wird um die Kante, auf der er gerade steht.
import { type Schl, TAU, clamp, nachschwingen, puls, rausch, spurWert, spurenAnwenden, stufe } from './bewegung';
import { Figur, KASTEN } from './figur';
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
  pose: (t: number, p: Pose) => void;
}

const RAD = Math.PI / 180;
const H_BEIN = KASTEN.H;
/** Abstand der Hüften vorn–hinten */
const HUEFTEN = 214 + 323.5;
const BEINE4 = ['VN', 'VF', 'HN', 'HF'] as const;

// ---- Geometrie der Gipse ------------------------------------------------------------------------------------------------
/**
 * Sitzen mit Gipsbeinen: Zu einem Winkel der Hinterbeine in der Welt (+ = Fuß nach vorn) das Kippen des Körpers, bei dem die
 * senkrechten Vorderbeine und die Hinterbeine zugleich am Boden stehen, und die Winkel am Körper. Bei 90° liegen die Hinterbeine
 * flach nach vorn, der Körper ist um 25° nach hinten gekippt und der Hintern sitzt auf (weich, er drückt sich platt).
 */
function sitzLage(betaH: number): { nicken: number; vorn: number; hinten: number } {
  const h = Figur.fussTiefe(betaH);
  const nicken = Math.asin(clamp((h - H_BEIN) / HUEFTEN, -1, 1)) / RAD;
  return { nicken, vorn: nicken, hinten: betaH + nicken };
}
function sitzSetzen(betaH: number, p: Pose): number {
  const l = sitzLage(betaH);
  p.nicken = l.nicken;
  p.beinVN = l.vorn;
  p.beinVF = l.vorn;
  p.beinHN = l.hinten;
  p.beinHF = l.hinten;
  return l.nicken;
}
/** Wurzelbewegung beim Sitzen: Die Vorderfüße bleiben stehen, der Körper dreht um sie */
const sitzWeg = (betaH: number) => 214 * (1 - Math.cos(sitzLage(betaH).nicken * RAD));

/**
 * Kippen um die Kante einer Sohle (Gips, steif): Verschiebung des Körperankers in Blickrichtung bei Nicken p, damit die Kante am
 * Boden bleibt. Vorn kippt er über die Spitze der Vordersohle, hinten über die Ferse der Hintersohle; die Rundung rollt ab.
 */
function kippWeg(p: number): number {
  const w = p * RAD;
  const r = KASTEN.r;
  const kx = p >= 0 ? 214 + KASTEN.B / 2 - r : -323.5 - (KASTEN.B / 2 - r);
  const ky = H_BEIN - r;
  return kx * (1 - Math.cos(w)) + ky * Math.sin(w) + r * w;
}
/** Ableitung einer Verschiebung nach der Zeit (für `tempo`) */
const ableitung = (d: (t: number) => number) => (t: number) => (d(t + 0.004) - d(Math.max(0, t - 0.004))) / (t > 0.004 ? 0.008 : t + 0.004);

/** Stoß beim Aufsetzen (0 → Spitze nach ~20 ms → abklingend): das „Klack“ der Gipse */
const stoss = (ts: number) => (ts < 0 ? 0 : Math.exp(-ts / 0.05) * (1 - Math.exp(-ts / 0.01)));

// ---- Gang mit steifen Beinen -------------------------------------------------------------------------------------------
interface Gang {
  periode: number;
  schritt: number; // Grad
  art: 'pass' | 'trab';
  stand: number; // Anteil Standphase
  hub: number; // nur ein Hauch: Gehoben wird ein Gipsbein durch das Wiegen des Körpers, nicht durch ein Knie
  wiegen: number; // Grad
  klack: number; // Stärke des Stoßes beim Aufsetzen
}
const versatz = (art: Gang['art']) =>
  art === 'pass' ? { VN: 0, HN: 0, VF: 0.5, HF: 0.5 } : { VN: 0, HF: 0, VF: 0.5, HN: 0.5 };

/** Beine, Wiegen und Klack eines Schritts; die Höhe des Körpers ergibt sich aus den Sohlen (Boden-Löser) */
function gang(g: Gang, t: number, p: Pose): void {
  const phase = t / g.periode;
  const A = g.schritt;
  const sA = Math.sin(A * RAD);
  const o = versatz(g.art);
  let klack = 0;
  for (const b of BEINE4) {
    const f = (((phase + o[b]) % 1) + 1) % 1;
    let alpha: number;
    let hub = 0;
    if (f < g.stand) {
      // Standphase: Sohle steht, die Hüfte läuft darüber (asin: die Sohle rutscht nicht)
      const u = f / g.stand;
      alpha = Math.asin(sA * (1 - 2 * u)) / RAD;
      klack += stoss(f * g.periode);
    } else {
      const u = (f - g.stand) / (1 - g.stand);
      const w = u * u * (3 - 2 * u);
      alpha = -A + 2 * A * w;
      hub = g.hub * Math.sin(u * Math.PI);
    }
    p[`bein${b}`] = alpha;
    p[`hub${b}`] = hub;
  }
  // die schwingende Seite hoch (rollen − = nahe Seite hoch)
  p.rollen = g.wiegen * Math.sin((phase - 0.06) * TAU);
  // Klack: Die Bohne staucht beim Aufsetzen kurz und hängt durch (die Federn wabbeln es nach)
  p.stauchen = -g.klack * klack;
  p.biegen = -g.klack * 300 * klack;
}
function gangTempo(g: Gang): number {
  return (2 * H_BEIN * Math.sin(g.schritt * RAD)) / (g.stand * g.periode);
}

const LAUFEN: Gang = { periode: 1.36, schritt: 15, art: 'pass', stand: 0.6, hub: 4, wiegen: 6.5, klack: 0.032 };
const EILEN: Gang = { periode: 0.46, schritt: 8, art: 'trab', stand: 0.52, hub: 6, wiegen: 2.5, klack: 0.045 };

// ---- kleine Helfer ------------------------------------------------------------------------------------------------------
/** Ohrzucken zur Zeit t0 (schnell spitz, dann zurück) */
const zucken = (t: number, t0: number, staerke: number) => -staerke * puls(t, t0, t0 + 0.28) * (1 - stufe(t, t0 + 0.14, t0 + 0.28) * 0.4);
const s = (werte: [number, number, Schl[2]?][]): Schl[] => werte.map(([t, v, k]) => [t, v, k] as Schl);
const beine = (p: Pose, vorn: number, hinten: number) => {
  p.beinVN = vorn;
  p.beinVF = vorn;
  p.beinHN = hinten;
  p.beinHF = hinten;
};

// ---- Spuren, die mehrere Clips teilen ----------------------------------------------------------------------------------
/** Hinsetzen: Winkel der Hinterbeine in der Welt. Erst schwingen sie bei geradem Körper bis zur Kante (35°, der Hintern hebt
 *  sich dabei ein wenig), dann rutschen die Füße nach vorn und der Körper kippt nach hinten, das letzte Stück plumpst er. */
const SITZ_BETA = s([
  [0, 0],
  [0.25, 0],
  [0.62, 35, 'sanft'],
  [1.2, 80, 'einaus'],
  [1.34, 90, 'ein'],
]);
/** Aufstehen: zweimal Anlauf (schaukeln, zurückplumpsen), beim dritten Mal klappt es */
const AUF_BETA = s([
  [0, 90],
  [0.42, 70, 'einaus'],
  [0.64, 90, 'ein'],
  [1.1, 56, 'einaus'],
  [1.34, 90, 'ein'],
  [1.8, 34, 'einaus'],
  [1.98, 0, 'aus'],
]);
/** Hinlegen: Die Gipse rutschen langsam auseinander (wie auf Eis), das letzte Stück plumpst der Bauch auf den Boden */
const LIEG_BETA = s([
  [0, 0],
  [0.35, 0],
  [1.32, 60, 'sanft'],
  [1.5, 90, 'ein'],
]);
/** Stolpern: Nicken über die Spitze der Vordersohlen (steif wie ein Brett), auf der Nase stehen bleiben, zurückplumpsen */
const STOLPER_NICKEN = s([
  [0, 0],
  [0.1, 1.5],
  [0.74, 50, 'ein'],
  [0.82, 47, 'aus'],
  [0.92, 49.5, 'einaus'],
  [1.75, 48.5],
  [1.84, 46.5],
  [2.14, -2.5, 'ein'],
  [2.28, 0.8, 'aus'],
  [2.45, 0, 'einaus'],
]);
/** Anhalten: Der Schwung kippt ihn über die Spitzen nach vorn, er wippt zurück und steht */
const anhaltNicken = (t: number) => 9.5 * nachschwingen(t, 0.05, 1.2, 2.6);

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
      p.biegen = 2.5 * Math.sin((t / 3.4) * TAU);
    },
  },
  {
    name: 'laufen',
    titel: 'Laufen',
    text: 'Stelzengang im Passgang: Er wiegt sich auf die eine Seite, damit die andere ihre Gipse nach vorn schwingen kann, und setzt sie mit einem Klack auf. Der Kopf bleibt ruhig, der Blick fest nach vorn.',
    dauer: LAUFEN.periode * 2,
    schleife: true,
    frei: 1,
    leben: 0.35,
    tempo: () => gangTempo(LAUFEN),
    pose: (t, p) => {
      gang(LAUFEN, t, p);
      const ph = (t / LAUFEN.periode) * TAU;
      p.theta = 80 + 2 * Math.sin(ph);
      p.brauenKipp = 6;
      p.kopfX = 12;
      // Kinn hoch, der Kopf hält sich gerade, während der Körper unter ihm wiegt
      p.kopfNicken = -3 + 2.2 * Math.sin(ph * 2 + 2.2);
      p.kopfNeigen = -p.rollen * 0.7;
      p.schwanz = 9 + 5 * Math.sin(ph * 2 + 1.1);
      p.ohrH = 4 * Math.sin(ph * 2 + 1.7);
      p.ohrV = 4 * Math.sin(ph * 2 + 2.0);
      p.bartDreh = -2 + 3 * Math.sin(ph * 2 + 2.6);
      // einmal je Runde ein entschlossenes Schnaufen
      p.nase = 0.5 * puls(t, 1.5, 1.75);
    },
  },
  {
    name: 'eilen',
    titel: 'Eilen',
    text: 'Er hat es eilig: winzige steife Trippelschritte im Trab, der Kopf voraus, Ohren und Bart wehen nach hinten. Schneller wird er davon kaum.',
    dauer: EILEN.periode * 4,
    schleife: true,
    frei: 1,
    leben: 0.2,
    tempo: () => gangTempo(EILEN),
    pose: (t, p) => {
      gang(EILEN, t, p);
      const ph = (t / EILEN.periode) * TAU;
      p.nicken = 3;
      p.theta = 84;
      p.brauenKipp = 12;
      p.kopfX = 40;
      p.kopfNicken = 4 + 3 * Math.sin(ph * 2 + 0.5);
      p.ohrH = 16 + 5 * Math.sin(ph * 2 + 1);
      p.ohrV = 16 + 5 * Math.sin(ph * 2 + 1.3);
      p.schopf = 8 + 4 * Math.sin(ph * 2 + 1.5);
      p.schwanz = 20 + 6 * Math.sin(ph * 2 + 1.2);
      p.bartDreh = -12 + 4 * Math.sin(ph * 2 + 2);
    },
  },
  {
    name: 'anhalten',
    titel: 'Anhalten',
    text: 'Bremsen mit Gipsbeinen: Der Schwung kippt ihn steif über die Spitzen der Vordersohlen, die Hinterbeine heben ab, er wippt zurück und steht.',
    dauer: 1.7,
    schleife: false,
    frei: 0,
    leben: 0.3,
    danach: 'stehen',
    tempo: (t) => 220 * (1 - stufe(t, 0, 0.28)) + ableitung((u) => kippWeg(anhaltNicken(u)))(t),
    pose: (t, p) => {
      p.nicken = anhaltNicken(t);
      p.theta = 72 - 52 * stufe(t, 0.7, 1.5);
      p.kopfNicken = 7 * nachschwingen(t, 0.12, 1.3, 2.6);
      p.ohrH = 10 * nachschwingen(t, 0.18, 1.5, 2.2);
      p.ohrV = 10 * nachschwingen(t, 0.22, 1.5, 2.2);
      p.bartDreh = 12 * nachschwingen(t, 0.1, 1.5, 2.4);
      p.brauen = 6 * puls(t, 0.1, 0.9);
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
      // Trippeln: vier kleine steife Schritte, das Wiegen hebt die Seite
      const tr = clamp((t - 0.25) / 1.4, 0, 1);
      for (const [b, o] of [
        ['VN', 0],
        ['HF', 0],
        ['VF', 0.5],
        ['HN', 0.5],
      ] as const) {
        const f = (tr * 4 + o) % 1;
        p[`bein${b}`] = tr > 0 && tr < 1 ? 6 * Math.sin(f * TAU) : 0;
        p[`hub${b}`] = tr > 0 && tr < 1 ? 8 * Math.max(0, Math.sin(f * TAU)) : 0;
      }
      p.rollen = 3 * Math.sin(tr * 4 * TAU) * puls(tr, 0, 1);
      p.ohrH = 6 * puls(t, 0.2, 0.7);
      p.ohrV = 6 * puls(t, 0.2, 0.7);
      p.schwanz = 8 * puls(t, 0.5, 1.6);
    },
  },
  {
    name: 'hinsetzen',
    titel: 'Hinsetzen',
    text: 'Mit Gipsbeinen ist Sitzen ein Plan: Er schaut erst nach dem Platz, dann rutschen die steifen Hinterbeine nach vorn, er kippt nach hinten, und das letzte Stück plumpst der Hintern auf den Boden und drückt sich platt.',
    dauer: 1.9,
    schleife: false,
    frei: 0,
    leben: 0.4,
    danach: 'sitzen',
    tempo: ableitung((u) => sitzWeg(spurWert(SITZ_BETA, u))),
    pose: (t, p) => {
      sitzSetzen(spurWert(SITZ_BETA, t), p);
      p.biegen = 12 * stufe(t, 1.0, 1.45);
      p.stauchen = -0.05 * nachschwingen(t, 1.34, 2.6, 5);
      spurenAnwenden(
        {
          // über die Schulter nach dem Platz schauen, dann wieder nach vorn
          theta: s([
            [0, 15],
            [0.12, 15],
            [0.45, -28, 'einaus'],
            [0.8, -28],
            [1.15, 18, 'einaus'],
            [1.9, 10],
          ]),
          kopfNicken: s([
            [0, 0],
            [0.45, 16],
            [0.8, 16],
            [1.15, 0],
            [1.34, -5, 'aus'],
            [1.9, 0],
          ]),
          ohrH: s([
            [0, 0],
            [0.4, -9, 'aus'],
            [1.1, -6],
            [1.4, 4],
            [1.9, 2],
          ]),
          ohrV: s([
            [0, 0],
            [0.42, -9, 'aus'],
            [1.1, -6],
            [1.4, 4],
            [1.9, 2],
          ]),
          brauen: s([
            [0, 0],
            [0.4, 7],
            [1.1, 5],
            [1.5, 2],
          ]),
        },
        t,
        p,
      );
    },
  },
  {
    name: 'sitzen',
    titel: 'Sitzen',
    text: 'Sitzt wie hingestellt, die Gipse ragen nach vorn. Er schaut, atmet, legt den Kopf einmal schief, der Schwanz fegt einmal über den Boden.',
    dauer: 6,
    schleife: true,
    frei: 0,
    leben: 1,
    pose: (t, p) => {
      sitzSetzen(90, p);
      p.biegen = 12 + 1.5 * Math.sin((t / 3) * TAU);
      p.theta = 12 + 10 * Math.sin((t / 6) * TAU);
      p.kopfNeigen = 10 * puls(t, 3.0, 4.6);
      p.brauen = 2 + 6 * puls(t, 2.9, 4.7);
      p.ohrV = zucken(t, 1.4, 10);
      p.schwanz = -4 + 10 * Math.sin(((t - 4.6) / 0.6) * TAU) * puls(t, 4.6, 5.8);
    },
  },
  {
    name: 'aufstehen',
    titel: 'Aufstehen',
    text: 'Wie ein alter Herr aus dem Sessel: zweimal Schwung holen und zurückplumpsen, beim dritten Mal kommen die Gipse unter den Körper.',
    dauer: 2.5,
    schleife: false,
    frei: 0,
    leben: 0.3,
    danach: 'stehen',
    tempo: ableitung((u) => sitzWeg(spurWert(AUF_BETA, u))),
    pose: (t, p) => {
      sitzSetzen(spurWert(AUF_BETA, t), p);
      p.biegen = 12 * (1 - stufe(t, 1.6, 2.0));
      p.stauchen = -0.04 * nachschwingen(t, 0.64, 2.8, 6) - 0.05 * nachschwingen(t, 1.34, 2.8, 6) + 0.03 * nachschwingen(t, 1.98, 2.4, 5);
      // nickt mit, um Schwung zu holen
      p.kopfNicken = 9 * puls(t, 0.1, 0.6) + 11 * puls(t, 0.72, 1.36) + 14 * puls(t, 1.42, 2.0);
      p.brauenKipp = 9 * stufe(t, 0.55, 0.85) * (1 - stufe(t, 2.0, 2.4));
      p.theta = 22 + 40 * stufe(t, 1.5, 2.0) - 30 * stufe(t, 2.1, 2.5);
      p.ohrH = 6 * puls(t, 0.6, 0.9) + 7 * puls(t, 1.3, 1.6);
      p.ohrV = 6 * puls(t, 0.62, 0.92) + 7 * puls(t, 1.32, 1.62);
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
      p.biegen = -8;
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
      p.bart = 6 * nachschwingen(t, 0.32, 2.2, 3) - 6 * nachschwingen(t, 1.35, 2.2, 3);
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
    text: 'Vom Kopf bis zum Schwanz: Die Ohren fliegen, die Bohne wabbelt, der Ring dreht sich. Danach steht er da, als wäre nichts gewesen.',
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
      p.bart = 18 * kopf;
      p.rollen = 6 * koerper;
      p.biegen = 10 * koerper;
      p.stauchen = 0.03 * Math.abs(koerper);
      p.schwanz = 22 * koerper;
      p.kopfX = 18 * kopf;
      p.brauen = 6 * puls(t, 1.1, 1.7);
      p.theta = 15 - 8 * stufe(t, 0, 0.3) + 8 * stufe(t, 1.1, 1.6);
    },
  },
  {
    name: 'springen',
    titel: 'Springen',
    text: 'Gipse können nicht in die Knie: Die Bohne holt Schwung, hängt durch und schnellt hoch. Steif durch die Luft, und bei der Landung fängt der weiche Körper alles ab.',
    dauer: 1.6,
    schleife: false,
    frei: 0,
    leben: 0,
    danach: 'stehen',
    tempo: (t) => 330 * stufe(t, 0.3, 0.4) * (1 - stufe(t, 0.9, 1.02)),
    pose: (t, p) => {
      const T0 = 0.36;
      const TF = 0.6;
      const u = clamp((t - T0) / TF, 0, 1);
      const luft = t > T0 && t < T0 + TF;
      p.heben = luft ? 4 * 320 * u * (1 - u) : 0;
      p.boden = luft ? 0 : 1;
      // Ausholen: durchhängen und stauchen, dann hochschnellen (strecken, Rücken rund)
      const aus = stufe(t, 0.04, 0.3) * (1 - stufe(t, 0.3, 0.4));
      const hoch = puls(t, 0.32, 0.72);
      p.biegen = -46 * aus + 22 * hoch - 26 * nachschwingen(t, T0 + TF, 2.4, 4.4);
      p.stauchen = -0.1 * aus + 0.1 * hoch - 0.11 * nachschwingen(t, T0 + TF, 2.6, 4.6);
      const spreiz = puls(t, T0 + 0.04, T0 + TF - 0.05);
      beine(p, 13 * spreiz, -13 * spreiz);
      p.nicken = -5 * puls(t, T0, T0 + 0.35) + 4 * puls(t, T0 + 0.3, T0 + TF);
      p.theta = 48 + 20 * stufe(t, T0, T0 + 0.3) - 20 * stufe(t, T0 + TF, T0 + TF + 0.4);
      p.kopfNicken = 10 * aus - 7 * puls(t, T0, T0 + 0.4) + 7 * nachschwingen(t, T0 + TF, 2, 4);
      p.ohrH = -12 * aus;
      p.ohrV = -12 * aus;
      p.brauen = 9 * puls(t, T0 - 0.05, T0 + TF);
    },
  },
  {
    name: 'stolpern',
    titel: 'Stolpern',
    text: 'Die Vordersohlen bleiben hängen. Er kippt steif wie ein Brett über ihre Spitzen, bis die Nase den Boden berührt, die Hinterbeine in der Luft. So bleibt er und schaut uns an. Dann plumpst er zurück und geht weiter, als wäre nichts gewesen.',
    dauer: 2.8,
    schleife: false,
    frei: 0,
    leben: 0,
    danach: 'stehen',
    tempo: (t) => 230 * (1 - stufe(t, 0, 0.14)) + ableitung((u) => kippWeg(spurWert(STOLPER_NICKEN, u)))(t),
    pose: (t, p) => {
      p.nicken = spurWert(STOLPER_NICKEN, t);
      spurenAnwenden(
        {
          kopfNicken: s([
            [0, 0],
            [0.5, 5],
            [0.74, 24, 'ein'],
            [0.84, 20, 'aus'],
            [1.75, 20],
            [2.1, 0],
            [2.28, -5, 'aus'],
            [2.5, 0],
          ]),
          kopfY: s([
            [0, 0],
            [0.74, 28, 'ein'],
            [1.75, 28],
            [2.1, 0],
          ]),
          // auf der Nase stehend schaut er zum Betrachter
          theta: s([
            [0, 78],
            [0.6, 70],
            [1.05, 22, 'einaus'],
            [1.65, 22],
            [2.25, 82, 'einaus'],
          ]),
          brauen: s([
            [0, 0],
            [0.3, 10, 'aus'],
            [0.8, 0],
            [2.8, 0],
          ]),
          brauenKipp: s([
            [0, 4],
            [1.7, 0],
            [2.35, 11, 'aus'],
            [2.8, 7],
          ]),
          ohrH: s([
            [0, 0],
            [0.74, -14, 'ein'],
            [0.95, 6],
            [1.75, 4],
            [2.15, -8],
            [2.5, 0],
          ]),
          ohrV: s([
            [0, 0],
            [0.74, -14, 'ein'],
            [0.97, 6],
            [1.75, 4],
            [2.17, -8],
            [2.5, 0],
          ]),
          // verlegen: einmal wedeln
          schwanz: s([
            [0, 8],
            [1.2, 8],
            [1.32, 26, 'aus'],
            [1.46, 4, 'einaus'],
            [1.6, 8],
          ]),
        },
        t,
        p,
      );
      p.stauchen = -0.04 * nachschwingen(t, 0.74, 3, 6) - 0.07 * nachschwingen(t, 2.14, 2.8, 5);
      p.biegen = -14 * nachschwingen(t, 2.14, 2.4, 4.5);
    },
  },
  {
    name: 'erstarren',
    titel: 'Erschrecken',
    text: 'Schreck! Ein steifer Hüpfer wie eine Ziege aus Holz, dann steht er stocksteif. Nur die Ohren zittern. Erst langsam traut er sich, nach hinten zu schauen. Nichts da. Ein Seufzer.',
    dauer: 3.8,
    schleife: false,
    frei: 0.4,
    leben: 0,
    danach: 'stehen',
    pose: (t, p) => {
      const T0 = 0.05;
      const TF = 0.38;
      const u = clamp((t - T0) / TF, 0, 1);
      const luft = t > T0 && t < T0 + TF;
      p.heben = luft ? 4 * 100 * u * (1 - u) : 0;
      p.boden = luft ? 0 : 1;
      const spreiz = puls(t, T0, T0 + TF);
      beine(p, 11 * spreiz, -11 * spreiz);
      p.stauchen = 0.08 * puls(t, 0.02, 0.3) - 0.07 * nachschwingen(t, T0 + TF, 3.2, 5.5);
      p.biegen = -12 * nachschwingen(t, T0 + TF, 2.8, 5);
      // stocksteif: kein Atem, nur Zittern
      const steif = stufe(t, 0.45, 0.6) * (1 - stufe(t, 2.4, 2.7));
      const zittern = Math.sin(t * 17 * TAU) * steif;
      const hoch = stufe(t, 0, 0.07) * (1 - stufe(t, 2.6, 3.3));
      p.ohrH = -26 * hoch + 2 * zittern;
      p.ohrV = -26 * hoch - 2 * zittern;
      p.rollen = 0.5 * zittern;
      p.brauen = 14 * hoch;
      p.schwanz = -10 * hoch;
      p.theta = spurWert(
        s([
          [0, 15],
          [0.12, 2, 'aus'],
          [2.6, 2],
          [3.15, -95, 'einaus'],
          [3.5, -95],
          [3.8, 15, 'einaus'],
        ]),
        t,
      );
      p.atmen = 2.2 * puls(t, 3.3, 3.8);
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
      p.bartDreh = 16 * puls(t, 0.18, 0.34) - 8 * nachschwingen(t, 0.34, 2.4, 4);
      p.bart = -10 * puls(t, 0.2, 0.42);
      p.kopfY = -14 * puls(t, 0.18, 0.36);
      p.ohrH = 18 * puls(t, 0.2, 0.7);
      p.ohrV = 18 * puls(t, 0.2, 0.7);
      p.nicken = -4 * puls(t, 0.2, 0.5);
      p.stauchen = 0.05 * puls(t, 0.16, 0.3) - 0.04 * nachschwingen(t, 0.3, 3, 6);
      p.brauen = 12 * stufe(t, 0.45, 0.65) * (1 - stufe(t, 1.2, 1.5));
      p.kopfNeigen = 7 * stufe(t, 0.5, 0.8) * (1 - stufe(t, 1.15, 1.5));
    },
  },
  {
    name: 'wedeln',
    titel: 'Wedeln',
    text: 'Freut sich: Der Ringschwanz kreist, das ganze Hinterteil wackelt mit, die Ohren werden weich.',
    dauer: 1.2,
    schleife: true,
    frei: 0.6,
    leben: 0.6,
    pose: (t, p) => {
      const w = Math.sin((t / 0.3) * TAU);
      p.schwanz = 14 + 18 * w;
      p.rollen = 2.5 * w;
      p.nicken = 0.8 * w;
      p.biegen = 5 * w;
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
      p.rollen = -3 * Math.sin(Math.min(1, tip / 0.45) * Math.PI);
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
      p.biegen = 8 * hoch;
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
    text: 'Die Bohne hängt kurz durch und schnellt hoch (die Höhe macht das Spiel).',
    dauer: 0.16,
    schleife: false,
    frei: 0,
    danach: 'flug',
    pose: (t, p) => {
      const u = t / 0.16;
      p.biegen = -24 * Math.sin(u * Math.PI);
      p.stauchen = -0.06 * Math.sin(u * Math.PI);
      p.theta = 50;
      p.brauen = 6;
      p.ohrH = -10;
      p.ohrV = -10;
    },
  },
  {
    name: 'flug',
    titel: 'Flug (Spiel)',
    text: 'In der Luft: alle vier Gipse steif, leicht gespreizt, die Bohne gestreckt, Ohren und Bart wehen.',
    dauer: 1.2,
    schleife: true,
    frei: 0,
    pose: (t, p) => {
      beine(p, 9, -9);
      p.stauchen = 0.05;
      p.biegen = 8;
      p.theta = 50;
      p.brauen = 8;
      p.boden = 0;
      p.ohrH = 12 + 3 * Math.sin(t * 9);
      p.ohrV = 12 + 3 * Math.sin(t * 9 + 0.8);
      p.bartDreh = -8 + 2 * Math.sin(t * 8);
      p.schwanz = 14;
    },
  },
  {
    name: 'landung',
    titel: 'Landung (Spiel)',
    text: 'Klack: Die Gipse setzen auf, die Bohne staucht und hängt durch, Ohren und Bart fallen nach.',
    dauer: 0.6,
    schleife: false,
    frei: 0.5,
    danach: 'stehen',
    pose: (t, p) => {
      p.stauchen = -0.1 * nachschwingen(t, 0, 2.6, 4.6);
      p.biegen = -22 * nachschwingen(t, 0, 2.4, 4.4);
      p.nicken = 3 * nachschwingen(t, 0, 2.6, 6);
      p.ohrH = 18 * nachschwingen(t, 0.02, 2, 4);
      p.ohrV = 18 * nachschwingen(t, 0.03, 2, 4);
      p.bartDreh = 12 * nachschwingen(t, 0.02, 1.8, 4);
      p.kopfNicken = 6 * nachschwingen(t, 0, 2, 4);
      p.theta = 45 - 25 * stufe(t, 0.1, 0.55);
    },
  },
  {
    name: 'hinlegen',
    titel: 'Hinlegen',
    text: 'Die Gipse rutschen langsam auseinander wie auf Eis. Er schaut besorgt hinunter. Das letzte Stück plumpst der Bauch auf den Boden und drückt sich platt. Ein langer Seufzer.',
    dauer: 2.7,
    schleife: false,
    frei: 0,
    leben: 0.3,
    danach: 'schlafen',
    pose: (t, p) => {
      const b = spurWert(LIEG_BETA, t);
      beine(p, b, -b);
      p.brauen = 7 * puls(t, 0.4, 1.6);
      p.brauenKipp = -7 * puls(t, 0.4, 1.6);
      p.theta = 15 + 28 * stufe(t, 0.3, 0.8) - 18 * stufe(t, 1.7, 2.3);
      p.kopfNicken = 14 * stufe(t, 0.35, 0.8) - 6 * stufe(t, 1.5, 1.7);
      // der Kopf bleibt über den ausgestreckten Vordergipsen (die sind dick), das Kinn liegt auf ihnen
      p.kopfY = -95 * stufe(t, 1.45, 2.0);
      p.stauchen = -0.07 * nachschwingen(t, 1.5, 2.8, 5);
      p.biegen = -12 * nachschwingen(t, 1.5, 2.4, 4.5);
      p.atmen = 2 * puls(t, 1.9, 2.7);
      p.ohrH = 18 * stufe(t, 1.7, 2.4);
      p.ohrV = 18 * stufe(t, 1.75, 2.45);
    },
  },
  {
    name: 'schlafen',
    titel: 'Schlafen',
    text: 'Schläft platt auf dem Bauch, die Gipse vorn und hinten ausgestreckt. Atem langsam und tief; im Traum rennen die steifen Beine ein paar Schritte.',
    dauer: 4.8,
    schleife: true,
    frei: 0,
    leben: 0,
    pose: (t, p) => {
      const traum = puls(t, 2.3, 3.5);
      p.beinVN = 90 + 6 * Math.sin(t * 3.3 * TAU) * traum;
      p.beinVF = 90 + 6 * Math.sin(t * 3.3 * TAU + Math.PI) * traum;
      p.beinHN = -90 + 6 * Math.sin(t * 3.3 * TAU + Math.PI) * traum;
      p.beinHF = -90 + 6 * Math.sin(t * 3.3 * TAU) * traum;
      p.theta = 25;
      p.kopfY = -80;
      p.kopfNicken = 12 + 2 * Math.sin((t / 4.8) * TAU);
      p.atmen = 1 + Math.sin((t / 4.8) * TAU * 1.5);
      p.ohrH = 22;
      p.ohrV = 22 + zucken(t, 3.0, -10);
      p.brauen = -5 + 4 * traum;
      p.schwanz = -8 + 6 * traum * Math.sin(t * 3.3 * TAU);
    },
  },
  {
    name: 'aufwachen',
    titel: 'Aufwachen',
    text: 'Ein Ohr hoch, dann das andere. Kopf hoch. Erst kommen die vorderen Gipse unter den Körper, dann die hinteren, mit einem Ruck steht er.',
    dauer: 2.2,
    schleife: false,
    frei: 1,
    leben: 0.3,
    danach: 'stehen',
    pose: (t, p) => {
      const v = 90 * (1 - stufe(t, 0.95, 1.3));
      const h = -90 * (1 - stufe(t, 1.3, 1.62));
      beine(p, v, h);
      p.nicken = -12 * puls(t, 1.0, 1.6);
      p.ohrH = 22 - 34 * stufe(t, 0.15, 0.35) + 12 * stufe(t, 1.2, 1.8);
      p.ohrV = 22 - 34 * stufe(t, 0.45, 0.65) + 12 * stufe(t, 1.2, 1.8);
      p.kopfNicken = 12 * (1 - stufe(t, 0.6, 1.0));
      p.kopfY = -80 * (1 - stufe(t, 0.6, 1.1));
      p.theta = 25 - 10 * stufe(t, 0.7, 1.4);
      p.brauen = -5 + 13 * stufe(t, 0.5, 0.9) - 8 * stufe(t, 1.3, 1.8);
      p.stauchen = 0.06 * puls(t, 1.62, 1.95) - 0.03 * nachschwingen(t, 1.95, 2.6, 5);
    },
  },
];

export const CLIP: Record<string, Clip> = Object.fromEntries(CLIPS.map((c) => [c.name, c]));
