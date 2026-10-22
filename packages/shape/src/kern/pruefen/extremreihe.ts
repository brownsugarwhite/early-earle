// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V1: Prüfstand „Extremreihe“. Körper, wie Florian sie im Editor
// zeichnen würde und an denen der Bau heute an Grenzen stößt, in Gruppen: Grundkörper, Kanten und Kästen, lang und dünn,
// flach, Überhänge und Kerben, Mehrteiler, absichtliche Widersprüche. Die Umrisse sind Polygonzüge (Ecken mit kleinem Radius
// „wie mit dem Stift“), geglättet und mit dem Fit des Nachzeichnens zu Bézier-Profilen gemacht, die Ausdehnungen wie beim
// Laden im Editor angeglichen (außer bei den Widersprüchen). Dazu je Körper 0–4 P-Linien als Züge in der Seite; ihre Tiefe
// kommt beim Messen von der Haut des gezeigten Körpers, wie beim Zeichnen im Editor. DOM-frei.
import { type Dokument, neuesDokument } from '../../dokument';
import { angleichen } from '../../kopplung';
import { type Knoten, type Profil, achsenRegeln, selbstschnitte } from '../../profil';
import { gKoerperDokument, halbAusZug, s0KoerperDokument, seiteAusZug } from './grundkoerper';
import { koerperDokument } from './koerper';
import { teilSatzDokument } from './teilsatz';
import type { Zufall } from './zufall';

type P = [number, number];

export const EXTREM_GRUPPEN = ['grund', 'kanten', 'lang', 'flach', 'ueberhang', 'mehrteiler', 'widerspruch'] as const;
export type ExtremGruppe = (typeof EXTREM_GRUPPEN)[number];

export const GRUPPEN_TITEL: Record<ExtremGruppe, string> = {
  grund: 'Grundkörper',
  kanten: 'Kanten und Kästen',
  lang: 'Lang und dünn',
  flach: 'Flach',
  ueberhang: 'Überhänge und Kerben',
  mehrteiler: 'Mehrteiler',
  widerspruch: 'Absichtliche Widersprüche',
};

/**
 * P-Linie eines Prüfkörpers: Zug in der Seite (Welt, oder mit `relativ` als Anteile des Kastens um den Seitenumriss,
 * x von vorn nach hinten, y von unten nach oben) und Härte (0 = glatt, 1 = scharf).
 */
export type ExtremLinie = { name: string; zug: P[]; relativ?: boolean; haerte: number };

export type ExtremKoerper = { name: string; gruppe: ExtremGruppe; text: string; dok: () => Dokument; linien?: ExtremLinie[] };

// ---------- Hilfen für Umrisse ----------

/** Lange gerade Strecken mit Zwischenpunkten (sonst baucht Catmull-Rom zwischen zwei Eckbögen aus). */
function verdichten(pts: readonly P[], geschlossen: boolean, abstand = 0.025): P[] {
  const out: P[] = [];
  const m = pts.length;
  const n = geschlossen ? m : m - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % m]!;
    const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / abstand));
    for (let s = 0; s < k; s++) out.push([a[0] + ((b[0] - a[0]) * s) / k, a[1] + ((b[1] - a[1]) * s) / k]);
  }
  if (!geschlossen) out.push(pts[m - 1]!);
  return out;
}

/**
 * Polygon mit gerundeten Ecken wie mit dem Stift gezeichnet: je Ecke ein Bogen (quadratische Bézier über die Ecke) mit
 * höchstens `r` Abstand von der Ecke; bei offenen Zügen bleiben Anfang und Ende (auf der Achse) spitz.
 */
function eckZug(pts: readonly P[], r: number, geschlossen: boolean, n = 6): P[] {
  const roh: P[] = [];
  const m = pts.length;
  for (let i = 0; i < m; i++) {
    const B = pts[i]!;
    if (!geschlossen && (i === 0 || i === m - 1)) {
      roh.push(B);
      continue;
    }
    const A = pts[(i - 1 + m) % m]!;
    const C = pts[(i + 1) % m]!;
    const la = Math.hypot(A[0] - B[0], A[1] - B[1]);
    const lc = Math.hypot(C[0] - B[0], C[1] - B[1]);
    const d = Math.min(r, 0.45 * la, 0.45 * lc);
    const T1: P = [B[0] + ((A[0] - B[0]) * d) / la, B[1] + ((A[1] - B[1]) * d) / la];
    const T2: P = [B[0] + ((C[0] - B[0]) * d) / lc, B[1] + ((C[1] - B[1]) * d) / lc];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const u = 1 - t;
      roh.push([u * u * T1[0] + 2 * u * t * B[0] + t * t * T2[0], u * u * T1[1] + 2 * u * t * B[1] + t * t * T2[1]]);
    }
  }
  return verdichten(roh, geschlossen);
}

/** Superellipse (Exponent e; 2 = Ellipse) als geschlossener Seitenzug, im Uhrzeigersinn ab vorn. */
function superZug(cx: number, cy: number, a: number, b: number, e: number, n = 64): P[] {
  const s = (v: number) => Math.sign(v) * Math.abs(v) ** (2 / e);
  return Array.from({ length: n }, (_, k) => {
    const t = Math.PI - (2 * Math.PI * k) / n;
    return [cx + a * s(Math.cos(t)), cy + b * s(Math.sin(t))] as P;
  });
}

/** Halbe Superellipse der Front (oben → unten, x ≥ 0). */
function superFront(cy: number, a: number, b: number, e = 2, n = 32): P[] {
  const s = (v: number) => Math.sign(v) * Math.abs(v) ** (2 / e);
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = Math.PI / 2 - (Math.PI * k) / n;
    return [Math.max(0, a * s(Math.cos(t))), cy + b * s(Math.sin(t))] as P;
  });
}

/** Halbe Superellipse des Tops (vorn → hinten, y = z ≥ 0). */
function superTop(cx: number, a: number, b: number, e = 2, n = 32): P[] {
  const s = (v: number) => Math.sign(v) * Math.abs(v) ** (2 / e);
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = Math.PI - (Math.PI * k) / n;
    return [cx + a * s(Math.cos(t)), Math.max(0, b * s(Math.sin(t)))] as P;
  });
}

/** Dokument aus drei Zügen; `gekoppelt`: Ausdehnungen angleichen wie beim Laden im Editor. */
function aus(name: string, seite: readonly P[], front: readonly P[], top: readonly P[], gekoppelt = true): Dokument {
  const d = neuesDokument(name);
  const profile = { seite: seiteAusZug(seite), front: halbAusZug(front, true), top: halbAusZug(top, false) };
  return { ...d, profile: gekoppelt ? angleichen(profile) : profile };
}

/** Zufall ohne Streuung: die Grundkörper der Zufallsreihe in ihrer Mittellage. */
const MITTE: Zufall = { zahl: () => 0.5, zwischen: (a, b) => (a + b) / 2, faktor: () => 1, wahl: (l) => l[0]!, ableger: () => MITTE };

const benannt = (d: Dokument, name: string): Dokument => ({ ...d, name });

// ---------- Körper ----------

/**
 * Florians Kegelkörper (Bild 20.10., `docs/look/editor/florian-2026-10-20-kegel-linien.webp`): Die drei Blätter haben im
 * Bild je eigenen Zoom; die graue Kachel (1 Einheit) gibt ihn je Blatt an (Seite 682, Front 821, Top 584 Bildpixel je
 * Einheit) — so passen Länge, Höhe und Breite aller drei Ansichten auf 2 px zusammen.
 */
function kegelDokument(): Dokument {
  const seite: P[] = [
    [190, 385], [205, 360], [230, 335], [270, 312], [330, 295], [400, 282], [470, 272], [540, 264], [610, 258], [640, 258], [665, 263],
    [685, 275], [694, 295], [697, 330], [697, 357], [696, 390], [692, 420], [683, 455], [668, 495], [645, 545], [615, 595], [580, 635],
    [548, 660], [518, 670], [480, 662], [440, 640], [390, 600], [330, 545], [270, 485], [225, 437], [198, 405],
  ];
  const front: P[] = [
    [1465, 90], [1520, 93], [1580, 110], [1640, 145], [1695, 200], [1740, 265], [1775, 340], [1798, 410], [1810, 470], [1812, 500],
    [1810, 530], [1800, 558], [1780, 575], [1740, 583], [1650, 586], [1550, 586], [1465, 585],
  ];
  const top: P[] = [
    [235, 1065], [245, 1110], [268, 1160], [305, 1210], [355, 1255], [415, 1288], [470, 1305], [515, 1310], [565, 1298], [610, 1262],
    [642, 1210], [660, 1150], [667, 1100], [668, 1065],
  ];
  return aus(
    'kegel',
    seite.map(([x, y]) => [(x - 443.5) / 682, (670 - y) / 682] as P),
    front.map(([x, y]) => [(x - 1465) / 821, (585 - y) / 821] as P),
    top.map(([x, y]) => [(x - 452.2) / 584, (y - 1065) / 584] as P),
  );
}

/** Stadion in der Seite (Länge 2L, Höhe 2H, gerade Kanten, Halbkreis-Enden) mit exakten Bézier-Knoten; Front Kreis, Top Ellipse. */
function stadionDokument(name: string, L: number, H: number): Dokument {
  const K = 0.5523;
  const k = (x: number, y: number, ex: number, ey: number, ax: number, ay: number): Knoten => ({ p: { x, y }, ein: { x: ex, y: ey }, aus: { x: ax, y: ay }, art: 'glatt' });
  const y0 = 0.02 + H;
  const seite: Profil = {
    art: 'geschlossen',
    knoten: [k(-L + H, y0 + H, -0.1, 0, 0.1, 0), k(L - H, y0 + H, -0.1, 0, K * H, 0), k(L, y0, 0, K * H, 0, -K * H), k(L - H, y0 - H, K * H, 0, -0.1, 0), k(-L + H, y0 - H, 0.1, 0, -K * H, 0), k(-L, y0, 0, -K * H, 0, K * H)],
  };
  const front: Profil = achsenRegeln({ art: 'halb', achse: 'senkrecht', knoten: [k(0, y0 + H, 0, 0, K * H, 0), k(H, y0, 0, K * H, 0, -K * H), k(0, y0 - H, K * H, 0, 0, 0)] });
  const top: Profil = achsenRegeln({ art: 'halb', achse: 'waagerecht', knoten: [k(-L, 0, 0, 0, 0, K * H), k(0, H, -K * L, 0, K * L, 0), k(L, 0, 0, K * H, 0, 0)] });
  return { ...neuesDokument(name), profile: { seite, front, top } };
}

/** Seeschlange: zwei Buckel in der Seite (Band 0,06 dick, Schwanz verjüngt), schmal in Front und Top. */
function schlangeDokument(): Dokument {
  const mitte = (x: number) => 0.13 + 0.09 * Math.cos((2 * Math.PI * x) / 0.45);
  const dicke = (x: number) => 0.03 * Math.min(1, (0.48 - x) / 0.12);
  const xs = Array.from({ length: 37 }, (_, i) => -0.45 + (0.9 * i) / 36);
  const oben: P[] = xs.map((x) => [x, mitte(x) + Math.max(0.006, dicke(x))]);
  const unten: P[] = xs.map((x) => [x, mitte(x) - Math.max(0.006, dicke(x))]).reverse() as P[];
  const seite: P[] = [[-0.48, mitte(-0.45)], ...oben, [0.48, mitte(0.45)], ...unten];
  const front: P[] = [[0, 0.25], [0.02, 0.245], [0.03, 0.23], [0.03, 0.03], [0.02, 0.015], [0, 0.01]];
  const top: P[] = [[-0.48, 0], [-0.47, 0.022], [-0.44, 0.03], [0.3, 0.03], [0.42, 0.015], [0.48, 0]];
  return aus('schlange', seite, front, top);
}

/** Sichel: dicker Bogen in der Seite, die Spitzen zeigen nach oben (tiefe runde Einbuchtung von oben). */
function sichelDokument(): Dokument {
  const bogen = (cx: number, cy: number, r: number, von: number, bis: number, n: number): P[] =>
    Array.from({ length: n + 1 }, (_, k) => {
      const w = ((von + ((bis - von) * k) / n) * Math.PI) / 180;
      return [cx + r * Math.cos(w), cy + r * Math.sin(w)] as P;
    });
  // außen von der rechten Spitze über unten nach links (Uhrzeigersinn), innen zurück
  const aussen = bogen(0, 0.33, 0.3, 340, 200, 28);
  const innen = bogen(0, 0.4, 0.27, 200, 340, 28);
  const seite: P[] = [...aussen, [-0.272, 0.27], ...innen, [0.272, 0.27]];
  const front: P[] = [[0, 0.31], [0.04, 0.3], [0.06, 0.25], [0.06, 0.08], [0.04, 0.04], [0, 0.03]];
  return aus('sichel', seite, front, superTop(0, 0.3, 0.06));
}

function hals18Dokument(): Dokument {
  const seite: P[] = [
    [-0.27, 0.9], [-0.22, 0.88], [-0.19, 0.8], [-0.15, 0.65], [-0.1, 0.5], [-0.04, 0.4], [0.02, 0.35], [0.1, 0.35], [0.22, 0.33], [0.32, 0.27],
    [0.35, 0.2], [0.32, 0.12], [0.22, 0.06], [0.1, 0.05], [-0.02, 0.06], [-0.1, 0.1], [-0.14, 0.17], [-0.15, 0.25], [-0.19, 0.4], [-0.24, 0.55],
    [-0.27, 0.68], [-0.29, 0.78], [-0.33, 0.82], [-0.34, 0.86], [-0.31, 0.9],
  ];
  const front: P[] = [[0, 0.9], [0.04, 0.89], [0.05, 0.85], [0.04, 0.8], [0.036, 0.7], [0.036, 0.5], [0.045, 0.4], [0.09, 0.34], [0.14, 0.27], [0.155, 0.2], [0.14, 0.12], [0.1, 0.07], [0.05, 0.05], [0, 0.05]];
  const top: P[] = [[-0.34, 0], [-0.33, 0.03], [-0.28, 0.05], [-0.22, 0.045], [-0.16, 0.04], [-0.1, 0.07], [-0.05, 0.12], [0.05, 0.15], [0.2, 0.14], [0.3, 0.09], [0.35, 0]];
  return aus('hals-1-8', seite, front, top);
}

function krabbeDokument(): Dokument {
  const seite: P[] = [
    [-0.36, 0.06], [-0.3, 0.09], [-0.22, 0.1], [-0.18, 0.14], [-0.1, 0.17], [0, 0.18], [0.1, 0.17], [0.18, 0.13], [0.2, 0.08], [0.17, 0.03],
    [0.1, 0.01], [0, 0], [-0.1, 0.01], [-0.17, 0.03], [-0.22, 0.04], [-0.3, 0.03], [-0.35, 0.04],
  ];
  const front: P[] = [[0, 0.18], [0.08, 0.17], [0.16, 0.14], [0.2, 0.1], [0.3, 0.09], [0.36, 0.08], [0.37, 0.05], [0.33, 0.03], [0.22, 0.04], [0.18, 0.02], [0.1, 0], [0, 0]];
  const top: P[] = [
    [-0.19, 0], [-0.19, 0.05], [-0.22, 0.12], [-0.3, 0.2], [-0.36, 0.24], [-0.37, 0.28], [-0.33, 0.3], [-0.26, 0.27], [-0.18, 0.22], [-0.1, 0.22],
    [0, 0.23], [0.12, 0.2], [0.19, 0.12], [0.21, 0],
  ];
  return aus('krabbe', seite, front, top);
}

function krakeDokument(): Dokument {
  const seite: P[] = [
    [0, 0.62], [0.12, 0.6], [0.2, 0.52], [0.22, 0.42], [0.18, 0.33], [0.2, 0.2], [0.22, 0.08], [0.2, 0], [0.16, 0.02], [0.13, 0.15], [0.1, 0.28],
    [0.06, 0.27], [0.05, 0.12], [0.03, 0], [-0.02, 0], [-0.03, 0.14], [-0.05, 0.27], [-0.1, 0.28], [-0.13, 0.15], [-0.17, 0.03], [-0.21, 0.02],
    [-0.21, 0.12], [-0.19, 0.25], [-0.2, 0.34], [-0.22, 0.44], [-0.19, 0.53], [-0.11, 0.6],
  ];
  const front: P[] = [
    [0, 0.62], [0.12, 0.6], [0.2, 0.52], [0.22, 0.42], [0.18, 0.33], [0.2, 0.2], [0.24, 0.06], [0.23, 0], [0.18, 0.01], [0.14, 0.15], [0.09, 0.27],
    [0.05, 0.24], [0.04, 0.1], [0.02, 0], [0, 0],
  ];
  return aus('krake', seite, front, superTop(0, 0.22, 0.22));
}

function katzeDokument(): Dokument {
  const seite: P[] = [
    [0.05, 0.6], [0.08, 0.52], [0.12, 0.43], [0.18, 0.38], [0.22, 0.25], [0.18, 0.11], [0.08, 0.04], [0, 0.03], [-0.1, 0.05], [-0.18, 0.12],
    [-0.22, 0.25], [-0.19, 0.36], [-0.1, 0.44], [-0.02, 0.46], [0.01, 0.53],
  ];
  const front: P[] = [[0, 0.45], [0.06, 0.46], [0.1, 0.5], [0.14, 0.6], [0.18, 0.47], [0.2, 0.38], [0.22, 0.25], [0.19, 0.12], [0.1, 0.04], [0, 0.03]];
  const top: P[] = [[-0.22, 0], [-0.16, 0.15], [0, 0.22], [0.16, 0.15], [0.22, 0]];
  return aus('katze-ohren', seite, front, top);
}

function hoernerDokument(): Dokument {
  const seite: P[] = [
    [-0.22, 0.62], [-0.15, 0.55], [-0.08, 0.45], [-0.04, 0.38], [0.05, 0.38], [0.18, 0.34], [0.28, 0.26], [0.3, 0.18], [0.25, 0.08], [0.12, 0.02],
    [0, 0.02], [-0.15, 0.04], [-0.26, 0.11], [-0.3, 0.2], [-0.27, 0.28], [-0.2, 0.33], [-0.15, 0.36], [-0.18, 0.45], [-0.22, 0.55], [-0.24, 0.61],
  ];
  const front: P[] = [[0, 0.38], [0.06, 0.38], [0.09, 0.42], [0.14, 0.52], [0.2, 0.6], [0.23, 0.62], [0.22, 0.57], [0.16, 0.45], [0.14, 0.37], [0.2, 0.32], [0.24, 0.22], [0.22, 0.1], [0.12, 0.03], [0, 0.02]];
  const top: P[] = [[-0.3, 0], [-0.27, 0.1], [-0.25, 0.2], [-0.23, 0.24], [-0.19, 0.22], [-0.12, 0.2], [0.1, 0.2], [0.25, 0.12], [0.3, 0]];
  return aus('hoerner', seite, front, top);
}

/** Kugel mit absichtlichem Widerspruch: Front 10 px breiter als das Top (`breite`) bzw. 10 px höher als die Seite (`hoehe`). */
function widerspruchDokument(art: 'breite' | 'hoehe'): Dokument {
  const r = 0.265;
  const e = 10 / 461;
  const seite = superZug(0, r, r, r, 2);
  const front = art === 'breite' ? superFront(r, r + e, r) : superFront(r + e / 2, r, r + e / 2);
  return aus(`widerspruch-${art}`, seite, front, superTop(0, r, r), false);
}

const laengs = (y: number, h: number, von = 0.2, bis = 0.8): ExtremLinie => ({ name: `längs ${Math.round(100 * y)} %`, zug: [[von, y], [bis, y]], relativ: true, haerte: h });
const quer = (x: number, h: number, von = 0.25, bis = 0.85): ExtremLinie => ({ name: `quer ${Math.round(100 * x)} %`, zug: [[x, von], [x, bis]], relativ: true, haerte: h });

export const EXTREMREIHE: readonly ExtremKoerper[] = [
  // Grundkörper (Bezug, heute sauber)
  { name: 'kugel', gruppe: 'grund', text: 'Startkugel; zwei gekreuzte Linien', dok: () => neuesDokument('kugel'), linien: [laengs(0.6, 1), quer(0.5, 1)] },
  { name: 'ei', gruppe: 'grund', text: 'Ei; zwei parallele Linien (100 % und 50 %)', dok: () => benannt(koerperDokument('ei', MITTE), 'ei'), linien: [laengs(0.55, 1), laengs(0.68, 0.5)] },
  { name: 'rex', gruppe: 'grund', text: 'Florians Rex; Querlinie', dok: () => benannt(koerperDokument('rex', MITTE), 'rex'), linien: [quer(0.45, 1)] },
  { name: 'robbe', gruppe: 'grund', text: 'Florians Robbe; Kreuz aus weicher Längs- und harter Querlinie', dok: () => benannt(koerperDokument('robbe', MITTE), 'robbe'), linien: [laengs(0.5, 0), quer(0.5, 1)] },
  { name: 'vase', gruppe: 'grund', text: 'Vase aus der Kugel; Linie über den Bauch', dok: () => s0KoerperDokument('vase'), linien: [laengs(0.3, 1, 0.15, 0.85)] },
  // Kanten und Kästen
  { name: 'wuerfel', gruppe: 'kanten', text: 'Würfel wie mit dem Stift (Ecken r 0,03); Längslinie', dok: () => aus('wuerfel', eckZug([[-0.2, 0.4], [0.2, 0.4], [0.2, 0], [-0.2, 0]], 0.03, true), eckZug([[0, 0.4], [0.2, 0.4], [0.2, 0], [0, 0]], 0.03, false), eckZug([[-0.2, 0], [-0.2, 0.2], [0.2, 0.2], [0.2, 0]], 0.03, false)), linien: [laengs(0.5, 1, 0.15, 0.85)] },
  { name: 'wuerfel-rund', gruppe: 'kanten', text: 'Würfel als Superellipse (Exponent 4)', dok: () => aus('wuerfel-rund', superZug(0, 0.2, 0.2, 0.2, 4), superFront(0.2, 0.2, 0.2, 4), superTop(0, 0.2, 0.2, 4)) },
  { name: 'kegel', gruppe: 'kanten', text: 'Florians Kegel (20.10.) mit stimmigen Maßen; kurze Querlinie', dok: kegelDokument, linien: [quer(0.55, 1, 0.45, 0.6)] },
  { name: 'keil', gruppe: 'kanten', text: 'Keil: Seite Dreieck, Front und Top Rechteck', dok: () => aus('keil', eckZug([[-0.32, 0], [0.3, 0.38], [0.3, 0]], 0.03, true), eckZug([[0, 0.38], [0.18, 0.38], [0.18, 0], [0, 0]], 0.03, false), eckZug([[-0.32, 0], [-0.32, 0.18], [0.3, 0.18], [0.3, 0]], 0.03, false)) },
  { name: 'pyramide', gruppe: 'kanten', text: 'Pyramide: Seite und Front Dreieck, Top Quadrat', dok: () => aus('pyramide', eckZug([[-0.25, 0], [0, 0.42], [0.25, 0]], 0.025, true), eckZug([[0, 0.42], [0.25, 0], [0, 0]], 0.025, false), eckZug([[-0.25, 0], [-0.25, 0.25], [0.25, 0.25], [0.25, 0]], 0.025, false)) },
  { name: 'tigerkopf', gruppe: 'kanten', text: 'Florians Tigerkopf mit Kastenschnauze (Spanten)', dok: () => benannt(koerperDokument('kasten', MITTE), 'tigerkopf') },
  // lang und dünn
  { name: 'langhals', gruppe: 'lang', text: 'Florians Langhals', dok: () => benannt(koerperDokument('langhals', MITTE), 'langhals') },
  { name: 'hals-1-8', gruppe: 'lang', text: 'Hals 1:8 auf einem Körper; Linie vom Körper den Hals hinauf (über den Ansatz)', dok: hals18Dokument, linien: [{ name: 'über den Ansatz', zug: [[0.1, 0.2], [-0.02, 0.27], [-0.1, 0.35], [-0.17, 0.55], [-0.22, 0.72]], haerte: 1 }] },
  { name: 'schlange', gruppe: 'lang', text: 'Seeschlange mit zwei Buckeln (Band 1:15); Linie längs über die Buckel', dok: schlangeDokument, linien: [{ name: 'über die Buckel', zug: Array.from({ length: 9 }, (_, i) => { const x = -0.4 + 0.1 * i; return [x, 0.13 + 0.09 * Math.cos((2 * Math.PI * x) / 0.45)] as P; }), haerte: 1 }] },
  { name: 'bleistift', gruppe: 'lang', text: 'Stift 1:10 (Seite Stadion, wie mit dem Stift); Längslinie', dok: () => aus('bleistift', eckZug([[-0.42, 0.09], [0.42, 0.09], [0.42, 0.01], [-0.42, 0.01]], 0.035, true), superFront(0.05, 0.04, 0.04), eckZug([[-0.42, 0], [-0.42, 0.04], [0.42, 0.04], [0.42, 0]], 0.035, false)), linien: [laengs(0.65, 1, 0.1, 0.9)] },
  { name: 'wurst', gruppe: 'lang', text: 'Wurst 1:5 (Stadion mit exakten Knoten)', dok: () => stadionDokument('wurst', 0.4, 0.08) },
  // flach
  { name: 'rochen', gruppe: 'flach', text: 'Rochen 1:10 flach, Top als Raute', dok: () => aus('rochen', superZug(0, 0.06, 0.3, 0.035, 2), superFront(0.06, 0.36, 0.035), [[-0.3, 0], [-0.12, 0.2], [0.02, 0.36], [0.1, 0.2], [0.26, 0.04], [0.3, 0]]) },
  { name: 'blatt', gruppe: 'flach', text: 'Blatt: dünne Linse, im Top spitz an beiden Enden', dok: () => aus('blatt', superZug(0, 0.03, 0.3, 0.02, 2), superFront(0.03, 0.12, 0.02), [[-0.3, 0], [-0.2, 0.07], [-0.05, 0.12], [0.1, 0.1], [0.22, 0.05], [0.3, 0]]) },
  { name: 'flunder', gruppe: 'flach', text: 'Flunder (flache Ellipse)', dok: () => benannt(koerperDokument('flunder', MITTE), 'flunder') },
  // Überhänge und Kerben
  { name: 'pilz', gruppe: 'ueberhang', text: 'Pilz: Hut über dem Stiel', dok: () => aus('pilz', eckZug([[-0.06, 0], [-0.07, 0.25], [-0.25, 0.3], [-0.24, 0.38], [-0.1, 0.48], [0.1, 0.48], [0.24, 0.38], [0.25, 0.3], [0.07, 0.25], [0.06, 0]], 0.02, true), eckZug([[0, 0.48], [0.1, 0.48], [0.24, 0.38], [0.25, 0.3], [0.07, 0.25], [0.06, 0], [0, 0]], 0.02, false), superTop(0, 0.25, 0.25)) },
  { name: 'giraffe-bauch', gruppe: 'ueberhang', text: 'Giraffe mit Bauch vor der Nase', dok: () => gKoerperDokument('giraffe-bauch') },
  { name: 'sichel', gruppe: 'ueberhang', text: 'Sichel: tiefe runde Einbuchtung von oben', dok: sichelDokument },
  { name: 'hammerhai', gruppe: 'ueberhang', text: 'Hammerhai: T im Top', dok: () => aus('hammerhai', superZug(0, 0.1, 0.32, 0.07, 2), superFront(0.1, 0.2, 0.06), [[-0.32, 0], [-0.32, 0.2], [-0.26, 0.21], [-0.24, 0.06], [0.1, 0.06], [0.32, 0.01], [0.32, 0]]) },
  { name: 'ueberhang', gruppe: 'ueberhang', text: 'Library-Ente: Kopf über der Brust', dok: () => teilSatzDokument('ueberhang') },
  { name: 'ente-haken', gruppe: 'ueberhang', text: 'Florians Ente mit Flügelhaken im Top (16.10.)', dok: () => s0KoerperDokument('ente-haken') },
  { name: 'einfach', gruppe: 'ueberhang', text: 'Florians einfache Form mit Kerbe hinten (16.10.)', dok: () => s0KoerperDokument('einfach') },
  // Mehrteiler
  { name: 'vierbeiner', gruppe: 'mehrteiler', text: 'Vierbeiner; Querlinie über den Vorderbeinansatz', dok: () => s0KoerperDokument('vierbeiner'), linien: [quer(0.25, 1, 0.15, 0.85)] },
  { name: 'zweihals', gruppe: 'mehrteiler', text: 'Zwei Hälse (in der Seite einer)', dok: () => s0KoerperDokument('zweihals') },
  { name: 'ente', gruppe: 'mehrteiler', text: 'Florians Ente mit Flügeln (15.10.)', dok: () => gKoerperDokument('ente') },
  { name: 'fisch', gruppe: 'mehrteiler', text: 'Fisch mit Flossen; Seitenlinie (50 %)', dok: () => gKoerperDokument('fisch'), linien: [laengs(0.5, 0.5, 0.12, 0.7)] },
  { name: 'krabbe', gruppe: 'mehrteiler', text: 'Krabbe: Scheren vorn seitlich', dok: krabbeDokument },
  { name: 'krake', gruppe: 'mehrteiler', text: 'Krake: Kopf über drei Armen; Querlinie über den Kopf', dok: krakeDokument, linien: [quer(0.5, 1, 0.6, 0.95)] },
  { name: 'seestern', gruppe: 'mehrteiler', text: 'Seestern: Arme nur im Top', dok: () => aus('seestern', superZug(0, 0.04, 0.25, 0.035, 2), superFront(0.04, 0.25, 0.035), [[-0.25, 0], [-0.06, 0.05], [-0.08, 0.24], [0.02, 0.07], [0.2, 0.15], [0.07, 0]]) },
  { name: 'fluegel-oben', gruppe: 'mehrteiler', text: 'Drache mit Flügeln über dem Rücken', dok: () => s0KoerperDokument('fluegel-oben') },
  { name: 'katze-ohren', gruppe: 'mehrteiler', text: 'Katzenkopf mit zwei Ohren', dok: katzeDokument },
  { name: 'hoerner', gruppe: 'mehrteiler', text: 'Körper mit zwei Hörnern', dok: hoernerDokument },
  { name: 'augenstiele', gruppe: 'mehrteiler', text: 'Augenstiele', dok: () => s0KoerperDokument('augenstiele') },
  // absichtliche Widersprüche
  { name: 'widerspruch-breite', gruppe: 'widerspruch', text: 'Kugel, Front 10 px breiter als das Top', dok: () => widerspruchDokument('breite') },
  { name: 'widerspruch-hoehe', gruppe: 'widerspruch', text: 'Kugel, Front 10 px höher als die Seite', dok: () => widerspruchDokument('hoehe') },
];

export function extremKoerper(name: string): ExtremKoerper {
  const k = EXTREMREIHE.find((e) => e.name === name);
  if (!k) throw new Error(`unbekannter Körper der Extremreihe: ${name}`);
  return k;
}

/** Selbstschnitte der drei Umrisse (0 = sauber; Prüfkörper müssen sauber sein, bevor gemessen wird). */
export function extremSelbstschnitte(dok: Dokument): Record<'seite' | 'front' | 'top', number> {
  return { seite: selbstschnitte(dok.profile.seite), front: selbstschnitte(dok.profile.front), top: selbstschnitte(dok.profile.top) };
}
