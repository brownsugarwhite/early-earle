// Teil G (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“), G1: Prüfkörper für Formen, die die Röhre heute nicht
// trägt. Florian (15.10.): „Ich verstehe nicht, warum Shapes mit Bauch, Hals und Flügeln oder Flossen nicht genauso
// umgesetzt werden können … Bei der Giraffe geht es, wenn der Bauch unten nicht weiter nach vorne ragt als die
// Nasenspitze. Sobald er das tut, springt es um.“ Die Umrisse sind Polygonzüge (Ente: aus seinem Bild
// `docs/look/editor/florian-2026-10-15-ente-fluegel.webp` nachgezogen), geglättet und mit dem Fit des Nachzeichnens zu
// Bézier-Profilen gemacht — so, wie sie auch aus dem Editor kämen. DOM-frei.
import { type Dokument, neuesDokument } from '../../dokument';
import { knotenNachWelt, profilGeschlossen, profilHalb } from '../../fit';
import { type Profil, achsenRegeln } from '../../profil';

type P = [number, number];
const PX = 461;

/** Catmull-Rom durch die Punkte, gleichmäßig nachabgetastet (Abstand in Welt-Einheiten). */
function glatt(pts: readonly P[], geschlossen: boolean, abstand = 0.004): P[] {
  const n = pts.length;
  const roh: P[] = [];
  const at = (i: number) => (geschlossen ? pts[((i % n) + n) % n]! : pts[Math.max(0, Math.min(n - 1, i))]!);
  const segmente = geschlossen ? n : n - 1;
  for (let i = 0; i < segmente; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let k = 0; k < 24; k++) {
      const t = k / 24;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      roh.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!geschlossen) roh.push(pts[n - 1]!);
  // gleichmäßig nach Bogenlänge
  const L: number[] = [0];
  for (let i = 1; i < roh.length; i++) L.push(L[i - 1]! + Math.hypot(roh[i]![0] - roh[i - 1]![0], roh[i]![1] - roh[i - 1]![1]));
  const gesamt = L[L.length - 1]! + (geschlossen ? Math.hypot(roh[0]![0] - roh[roh.length - 1]![0], roh[0]![1] - roh[roh.length - 1]![1]) : 0);
  const m = Math.max(16, Math.round(gesamt / abstand));
  const out: P[] = [];
  let k = 0;
  for (let s = 0; s < (geschlossen ? m : m + 1); s++) {
    const t = (gesamt * s) / m;
    while (k + 1 < roh.length && L[k + 1]! < t) k++;
    if (k + 1 >= roh.length) {
      out.push(geschlossen ? roh[0]! : roh[roh.length - 1]!);
      continue;
    }
    const f = (t - L[k]!) / (L[k + 1]! - L[k]! || 1);
    out.push([roh[k]![0] + (roh[k + 1]![0] - roh[k]![0]) * f, roh[k]![1] + (roh[k + 1]![1] - roh[k]![1]) * f]);
  }
  return out;
}

const welt = (kn: ReturnType<typeof profilGeschlossen>) => knotenNachWelt(kn, (p) => ({ x: p[0] / PX, y: p[1] / PX }), 1 / PX);

/** Geschlossener Seitenumriss aus einem Zug (Welt, y nach oben, im Uhrzeigersinn). */
export function seiteAusZug(pts: readonly P[]): Profil {
  const px = glatt(pts, true).map(([x, y]) => [x * PX, y * PX] as P);
  return { art: 'geschlossen', knoten: welt(profilGeschlossen(px, 1.2)) };
}

/** Halbprofil aus einem Zug von Achse zu Achse (Front: oben → unten, x ≥ 0; Top: vorn → hinten, y ≥ 0). */
export function halbAusZug(pts: readonly P[], senkrecht: boolean): Profil {
  const px = glatt(pts, false).map(([x, y]) => [x * PX, y * PX] as P);
  return achsenRegeln({ art: 'halb', achse: senkrecht ? 'senkrecht' : 'waagerecht', knoten: welt(profilHalb(px, 1.2, senkrecht)) });
}

function dokumentAus(name: string, seite: readonly P[], front: readonly P[], top: readonly P[]): Dokument {
  const d = neuesDokument(name);
  return { ...d, profile: { seite: seiteAusZug(seite), front: halbAusZug(front, true), top: halbAusZug(top, false) } };
}

/** Punkte aus Florians Bild (Bildpixel, y nach unten) in Welt: Mitte x 343,5, Boden y 398, Achse des Tops y 213. */
const S = 0.0016;
const bildSeite = (pts: readonly P[]): P[] => pts.map(([x, y]) => [(x - 343.5) * S, (398 - y) * S]);
const bildFront = (pts: readonly P[]): P[] => pts.map(([x, y]) => [(x - 376) * S, (398 - y) * S]);
const bildTop = (pts: readonly P[]): P[] => pts.map(([x, y]) => [(x - 343.5) * S, (y - 213) * S]);

/**
 * Florians Ente (15.10., Seite Δ 124 px, Top Δ 86 px im heutigen Bau): Kopf oben, der Hals schwingt nach vorn unten in
 * den Körper, die Brust ragt weiter vor als der Schnabel; im Top stehen die Flügel nach hinten ab (Kerbe zum Schwanz),
 * in der Front ist der Hals schmal und der Körper mit den Flügeln breit.
 */
export function enteDokument(): Dokument {
  const seite: P[] = [
    [227, 64], [228, 46], [236, 31], [252, 21], [276, 15], [310, 12], [345, 11], [380, 12], [412, 15], [440, 20], [460, 26], [469, 32],
    [471, 48], [467, 68], [458, 92], [444, 120], [425, 152], [402, 182], [380, 205], [369, 222], [373, 236], [390, 247], [418, 259],
    [446, 272], [466, 285], [476, 300], [478, 322], [472, 346], [456, 370], [428, 389], [398, 398], [374, 399], [342, 398], [304, 392],
    [266, 374], [236, 346], [217, 313], [211, 281], [216, 258], [233, 237], [259, 213], [287, 187], [314, 158], [338, 128], [356, 100],
    [367, 78], [374, 64], [362, 74], [342, 84], [316, 92], [288, 94], [262, 88], [243, 77],
  ];
  const front: P[] = [
    [376, 14], [388, 16], [396, 26], [399, 45], [400, 80], [401, 120], [403, 160], [408, 190], [425, 215], [455, 240], [485, 265],
    [505, 286], [512, 302], [507, 326], [488, 352], [458, 375], [420, 392], [392, 398], [376, 399],
  ];
  const top: P[] = [
    [211, 213], [212, 242], [220, 272], [240, 301], [270, 325], [310, 340], [360, 347], [402, 349], [424, 345], [418, 338], [398, 331],
    [375, 325], [360, 316], [359, 301], [368, 286], [385, 268], [410, 250], [440, 236], [464, 223], [476, 213],
  ];
  return dokumentAus('ente', bildSeite(seite), bildFront(front), bildTop(top));
}

/**
 * Giraffe mit Bauch vor der Nase (Florian: „Sobald er das tut, springt es um“): Kopf oben links, langer Hals, der Bauch
 * ragt unten weiter nach vorn als die Nasenspitze. Front: schmaler Hals, breiter Körper; Top: der Körper.
 */
export function giraffeBauchDokument(vor = 0.06): Dokument {
  const nase = -0.2;
  const seite: P[] = [
    [nase, 0.93], [-0.17, 0.99], [-0.1, 1.02], [-0.03, 1.0], [0.01, 0.95], [0.03, 0.86], [0.05, 0.74], [0.08, 0.6], [0.12, 0.5], [0.2, 0.45],
    [0.3, 0.43], [0.37, 0.36], [0.38, 0.26], [0.33, 0.15], [0.22, 0.09], [0.05, 0.07], [-0.12, 0.1], [nase - vor + 0.02, 0.17],
    [nase - vor, 0.27], [nase - vor + 0.03, 0.37], [-0.16, 0.45], [-0.1, 0.55], [-0.07, 0.68], [-0.07, 0.8], [-0.1, 0.86], [-0.16, 0.88],
  ];
  const front: P[] = [
    [0, 1.02], [0.035, 1.0], [0.05, 0.95], [0.045, 0.85], [0.04, 0.7], [0.045, 0.55], [0.08, 0.45], [0.13, 0.36], [0.155, 0.27],
    [0.15, 0.17], [0.11, 0.09], [0.05, 0.07], [0, 0.07],
  ];
  const top: P[] = [
    [nase - vor, 0], [nase - vor + 0.01, 0.06], [-0.18, 0.11], [-0.08, 0.145], [0.06, 0.155], [0.2, 0.15], [0.31, 0.12], [0.37, 0.07],
    [0.38, 0],
  ];
  return dokumentAus('giraffe-bauch', seite, front, top);
}

/** Schwanenhals: Der Hals steigt vorn aus dem Körper, schwingt zurück über den Rücken und wieder nach vorn zum Kopf. */
export function sHalsDokument(): Dokument {
  const seite: P[] = [
    [-0.33, 0.83], [-0.3, 0.88], [-0.22, 0.9], [-0.15, 0.88], [-0.11, 0.82], [-0.1, 0.74], [-0.04, 0.67], [0.02, 0.6], [0.03, 0.5],
    [0.0, 0.42], [0.08, 0.36], [0.22, 0.34], [0.33, 0.3], [0.36, 0.22], [0.3, 0.12], [0.15, 0.06], [-0.05, 0.05], [-0.2, 0.09],
    [-0.28, 0.17], [-0.29, 0.27], [-0.24, 0.34], [-0.18, 0.4], [-0.1, 0.46], [-0.06, 0.53], [-0.08, 0.6], [-0.15, 0.67], [-0.19, 0.74],
    [-0.21, 0.8], [-0.27, 0.8],
  ];
  const front: P[] = [
    [0, 0.9], [0.035, 0.88], [0.045, 0.82], [0.035, 0.74], [0.03, 0.6], [0.035, 0.45], [0.09, 0.36], [0.15, 0.27], [0.165, 0.18],
    [0.13, 0.09], [0.06, 0.05], [0, 0.05],
  ];
  const top: P[] = [
    [-0.33, 0], [-0.32, 0.03], [-0.28, 0.08], [-0.2, 0.13], [-0.05, 0.16], [0.1, 0.165], [0.25, 0.14], [0.34, 0.08], [0.36, 0],
  ];
  return dokumentAus('s-hals', seite, front, top);
}

/**
 * Fisch mit Flossen: Seite mit Rücken- und Bauchflosse und Schwanzflosse (auf der Mittelebene), Top mit Brustflossen
 * (seitliche Teile), Front mit den Brustflossen auf halber Höhe und der dünnen Rückenflosse.
 */
export function fischDokument(): Dokument {
  const seite: P[] = [
    [-0.32, 0.25], [-0.28, 0.33], [-0.18, 0.39], [-0.08, 0.41], [-0.04, 0.5], [0.02, 0.52], [0.06, 0.48], [0.1, 0.4], [0.2, 0.36],
    [0.28, 0.3], [0.33, 0.27], [0.42, 0.37], [0.44, 0.34], [0.38, 0.25], [0.44, 0.15], [0.42, 0.12], [0.33, 0.22], [0.27, 0.19],
    [0.18, 0.13], [0.1, 0.11], [0.07, 0.05], [0.03, 0.04], [0.01, 0.1], [-0.08, 0.1], [-0.2, 0.12], [-0.29, 0.17],
  ];
  const front: P[] = [
    [0, 0.52], [0.012, 0.5], [0.015, 0.44], [0.05, 0.4], [0.09, 0.34], [0.11, 0.28], [0.2, 0.25], [0.21, 0.23], [0.11, 0.2], [0.09, 0.15],
    [0.05, 0.11], [0.015, 0.08], [0.01, 0.05], [0, 0.04],
  ];
  const top: P[] = [
    [-0.32, 0], [-0.3, 0.05], [-0.2, 0.09], [-0.1, 0.105], [-0.07, 0.2], [-0.04, 0.21], [-0.02, 0.11], [0.1, 0.1], [0.22, 0.07],
    [0.32, 0.03], [0.36, 0.015], [0.42, 0.03], [0.44, 0],
  ];
  return dokumentAus('fisch', seite, front, top);
}

export const G_KOERPER = ['ente', 'giraffe-bauch', 's-hals', 'fisch'] as const;
export type GKoerper = (typeof G_KOERPER)[number];

export function gKoerperDokument(name: GKoerper): Dokument {
  switch (name) {
    case 'ente':
      return enteDokument();
    case 'giraffe-bauch':
      return giraffeBauchDokument();
    case 's-hals':
      return sHalsDokument();
    case 'fisch':
      return fischDokument();
  }
}
