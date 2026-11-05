// Form zuerst (04.11.2026): Florian zeichnet die Seite und sieht sofort eine runde Form.
//
// Ein kleines eigenes Fenster neben dem Editor (form.html). In der Seite setzt und zieht er Punkte wie Vektorpunkte (glatt oder
// Ecke), daneben zeigen Front, Top und 3D dasselbe Modell. Deren Umrisse zeichnet ein Shader: die Rückseiten des Körpers, um
// eine feste Pixelbreite nach außen geschoben. Auf der Form gezeichnete Linien werden Kanten; ihre Strichdicke (0–3 px) ist
// die Härte, und Front, Top und 3D zeichnen sie mit (sichtbar schwarz, verdeckt blass). Die Linien bleiben, wo sie gezeichnet
// sind; zieht Florian den Umriss unter eine Linie, wächst die Form zu ihr (Wulst). Front und Top zeichnet er genauso, als halbe
// Umrisse (gespiegelt); sobald eine davon gezeichnet ist, sind alle Ansichten gleichwertig (`formAusAnsichten`) — die andere
// folgt bis zum ersten Griff dem runden Körper. Keine Regler, keine Chips.
// Maul (Probe 04.11.): Wer in der Seite von außen über den Umriss in die Form zieht, zeichnet die Maullinie; dort wird die Form
// aufgeschnitten (geschlossen nur die Linie), der Regler im 3D-Blatt öffnet sie (der Unterkiefer dreht um den Mundwinkel).
// Getrennte Kiefer (05.11.): Der Knopf „Kiefer trennen“ macht aus der Maullinie Ober- und Unterlippe (rot, blau); jede ist eine
// Linie im Raum (die Seite bewegt ihre Lage, Front und Top ihre Breite), und jeder Kiefer folgt seiner Lippe.

import {
  BREITE_MAX,
  type BreitenPunkt,
  type DichtesNetz,
  type GleichesNetz,
  type Kante3D,
  type KantenLinie,
  type Kontur,
  MAUL_WINKEL_MAX,
  type MaulLinie,
  type MaulPunkt,
  type MaulSchnitt,
  type Nachfuehrung,
  type RaumLinie,
  PRUEFFAELLE,
  PRUEFFAELLE_HALB,
  type Prueffall,
  type Spielnetz,
  type UmrissPunkt,
  type Zeichnungen,
  backen,
  backenBereit,
  formAusAnsichten,
  formAusTeilen,
  anEinbuchtungTeilen,
  anNahtTeilen,
  einbuchtungen,
  type Teilung,
  ganzerUmriss,
  halbeLinie,
  linieAbtasten,
  linieNachfuehren,
  linienAbstand,
  linienStuecke,
  maulBacken,
  maulSchneiden,
  type Pose,
  RUHE,
  ZUG_MAX,
  posePunkt,
  poseWinkel,
  posieren,
  profilAusBreite,
  punktAufStueck,
  punktSetzen,
  raumAbtasten,
  raumKanten,
  rundAusSeite,
  rundAusTeilen,
  streckungBei,
  tiefeAusKontur,
  umrissAbtasten,
  umrissLinie,
  umrissStuecke,
  umrisseDesKoerpers,
  verbinden,
} from '@ee/shape/dicht';
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  GreaterDepth,
  HemisphereLight,
  LessEqualDepth,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  OrthographicCamera,
  PerspectiveCamera,
  Raycaster,
  RedFormat,
  Scene,
  ShaderMaterial,
  Triangle,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Alle Ansichten gleichwertig (Beweis 04.11.): Front (z, y) und Top (x, z) als geschlossene Umrisse, dazu weitere Flächen der
 * Seite neben `punkte`. Solange das fehlt, gilt der bisherige Bau (Seite rund, Front und Top als halbe Profile).
 */
type Ansichten = { seite: UmrissPunkt[][]; front: UmrissPunkt[][]; top: UmrissPunkt[][] };
/**
 * Front und Top: halbe Umrisse auf der Seite z ≥ 0 in den Koordinaten ihres Blatts (Front x = z, y = y; Top x = x, y = z),
 * Anfang und Ende auf der Mittelachse, gespiegelt geschlossen; null = folgt dem Körper (noch nicht angefasst).
 */
type Zustand = {
  punkte: UmrissPunkt[];
  linien: KantenLinie[];
  front: UmrissPunkt[] | null;
  top: UmrissPunkt[] | null;
  ansichten: Ansichten | null;
  /** Linien im Raum (`?linien`): Hälfte z ≥ 0, Anfang und Ende auf dem Umriss der Seite (ihres Teils) */
  raum: RaumLinieT[];
  /** Maullinie in der Seite: erster Punkt auf dem Umriss, letzter = Mundwinkel */
  maul: MaulLinie | null;
  /** die Pose „Fressen“: Knochen (Unterkiefer, Schädel) und Züge des Blendshapes; gezeigt, wenn „Pose“ an ist */
  pose: Pose;
  /** weitere Teile neben dem Körper (`punkte`, `front`, `top`): je eigener Umriss in der Seite, eigene Front und eigenes Top */
  teile: Teil[];
};
/**
 * Ein Teil (05.11.): ein Lappen mit eigenem Umriss in jeder Ansicht. Es entsteht von selbst an einer Einbuchtung oder an einer
 * gezogenen Naht; Teile verschmelzen nicht, sie werden zu einem Netz vereinigt. Front und Top: null = folgt dem Teil.
 */
type Teil = { punkte: UmrissPunkt[]; front: UmrissPunkt[] | null; top: UmrissPunkt[] | null };
/** Eine Linie auf der Form (`?linien`); sie gehört einem Teil (`teil`; fehlt: dem Körper) und formt nur dieses. */
type RaumLinieT = RaumLinie & { teil?: number };
/** Teil einer Linie auf der Form (−1: der Körper) */
const teilDer = (l: RaumLinieT): number => l.teil ?? -1;
const ruhePose = (): Pose => ({ ...RUHE, zuege: [] });
type Blatt = 'front' | 'top';

declare global {
  interface Window {
    __form?: {
      punkte: UmrissPunkt[];
      linien: KantenLinie[];
      front: UmrissPunkt[] | null;
      top: UmrissPunkt[] | null;
      dreiecke: number;
      ms: number;
      zelle: number;
      fein: boolean;
      /** gleichwertige Ansichten: Ellipsoide je Ansicht (sonst null) */
      ellipsoide: Record<'seite' | 'front' | 'top', number> | null;
      /** Probe „Linien aus dem Netz“ an (`?netz`) */
      netz: boolean;
      /** zuletzt nachgeführte Ansichten: neue und behaltene Punkte, Restabstand */
      nachgefuehrt: Partial<Record<'seite' | 'front' | 'top', Omit<Nachfuehrung, 'punkte'>>>;
      /** Linien auf der Form (`?linien`) */
      raum: RaumLinie[];
      /** Maullinie, Öffnung (Grad) und der Schnitt (Lippenpunkte, Dreiecke des Inneren; null = nicht geschnitten) */
      maul: MaulLinie | null;
      /** gezeigte Öffnung des Unterkiefers (Grad; ohne Pose 0) */
      oeffnung: number;
      /** die Pose: gezeigt?, Knochen (Grad), Züge */
      pose: Pose & { an: boolean };
      schnitt: { lippe: number; innen: number; getrennt: boolean } | null;
      /** Spielnetz (an): Dreiecke, Punkte, Abweichung (Welt, px bei 300 px Höhe), Dreiecke der dichten Form */
      spiel: { dreiecke: number; punkte: number; fehler: number; px: number; dicht: number } | null;
      /** Teile neben dem Körper (Seite, Front, Top; null = folgt dem Teil) und wie sie Front und Top gerade zeigen */
      teile: { punkte: UmrissPunkt[]; front: UmrissPunkt[] | null; top: UmrissPunkt[] | null; gezeigt: Record<'front' | 'top', UmrissPunkt[] | null> }[];
    };
    /** Prüfhaken: Spielnetz an oder aus (wie der Schalter) */
    __formSpielnetz?: (an: boolean) => void;
    /** Prüfhaken: Maullinie setzen (wie ein Zug, mit Rückgängig) */
    __formMaul?: (linie: MaulLinie | null) => void;
    /** Prüfhaken: Öffnung des Mauls in Grad (wie der Regler) */
    __formOeffnen?: (winkel: number) => void;
    /** Prüfhaken: die Pose setzen (null: behalten) und zeigen oder nicht (mit Rückgängig) */
    __formPose?: (pose: Pose | null, an?: boolean) => void;
    /** Prüfhaken: eine Zeichnung setzen (wie ein Zug, mit Rückgängig) */
    __formSetzen?: (p: UmrissPunkt[], linien?: KantenLinie[], front?: UmrissPunkt[] | null, top?: UmrissPunkt[] | null) => void;
    /** Prüfhaken: alle drei Ansichten als geschlossene Umrisse setzen (gleichwertig) */
    __formAnsichten?: (z: Zeichnungen) => void;
    /** Prüfhaken: einen Prüffall laden (Kugel, Beine, Flossen, Lappen) */
    __formPruefall?: (name: Prueffall) => void;
    /** Prüfhaken: größter Abstand je Ansicht zwischen ihrer Linie und dem Umriss des Körpers (nur gleichwertige Ansichten) */
    __formAbstand?: () => Record<'seite' | 'front' | 'top', number> | null;
    /**
     * Prüfhaken (`?linien`): Tiefe der Linie, wo Umriss `nr` (0: Körper, sonst Teil + 1) von vorn bzw. oben am breitesten ist, an
     * der Stelle `l` längs (Front: Höhe y, Top: x); null, wo er nicht reicht
     */
    __formKontur?: (nr: number, blatt: 'front' | 'top', l: number) => number | null;
  }
}

const PAPIER = 0xefe9dd;
const KOERPER = 0xe2b98e;
const TINTE = 0x1f1a17;
/** Maulinneres */
const MAULFARBE = 0x7a3431;
/** Strichdicke der Lippen (px) */
const LIPPE = 2.5;
/** getrennte Kiefer: Oberlippe rot, Unterlippe blau (wie im Editor) */
const OBERLIPPE = 0xc8372d;
const UNTERLIPPE = 0x2f5fc4;
/** Breite der Unterlippe gegen die Form, sobald die Kiefer getrennt werden: etwas schmaler, so liegt sie geschlossen innen */
const UNTEN_SCHMAL = 0.85;
/** So viele Welteinheiten passen in die kürzere Seite eines Blatts. */
const SICHT = 560;
// Surface Nets geben etwa das 1,5-Fache der bestellten Dreiecke
const DREIECKE_FEIN = 40000;
const DREIECKE_ZUG = 6000;
/** Strichdicke einer neu gezeichneten Linie (px) */
const BREITE_NEU = 2;
/**
 * Probe „Linien aus dem Netz“ (04.11., `?netz`): Alle Umrisse zeichnet der Shader am Mesh, auch in der Seite; Florians Punkte
 * sind Griffe darauf. Die Ansicht, die er bearbeitet, führt; die anderen zeigen danach den Umriss des Körpers, ihre Punkte
 * bleiben, wo die Linie noch auf ihm liegt.
 */
const NETZ = new URLSearchParams(location.search).has('netz');
/**
 * Probe „Linien auf der Form“ (04.11., `?linien`, Florians Modell): eine Form, Linien auf ihr als Griffe, die Ansichten zeigen
 * sie. Front und Top sind keine Zeichenflächen; der Umriss ist nur Shader. Wer ihn in Front oder Top anfasst, legt dort eine
 * Linie auf die Form (Raumlinie) und zieht sie; die Form ist die rundeste Fläche durch alle Linien. Die Seite legt das Volumen
 * an wie bisher.
 */
const LINIEN = new URLSearchParams(location.search).has('linien');

const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];

const feld = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Feld fehlt: ${id}`);
  return e;
};
const felder = { seite: feld('feld-seite'), front: feld('feld-front'), top: feld('feld-top'), drei: feld('feld-3d') };
const leinwand = document.getElementById('leinwand') as HTMLCanvasElement;
const svg = document.getElementById('zeichnung') as unknown as SVGSVGElement;
const profilSvg: Record<Blatt, SVGSVGElement> = {
  front: document.getElementById('profil-front') as unknown as SVGSVGElement,
  top: document.getElementById('profil-top') as unknown as SVGSVGElement,
};

// ---------- Zustand ----------

let zustand: Zustand = { punkte: kreis(150), linien: [], front: null, top: null, ansichten: null, raum: [], maul: null, pose: ruhePose(), teile: [] };
/** Pose gezeigt (Schalter „Pose“ im 3D-Blatt; eine Ansicht): an = die Pose samt Pinsel in den Blättern, aus = Grundform */
let poseAn = false;
/** der zuletzt gebaute Schnitt (null: kein Maul oder die Linie schneidet nicht) */
let schnitt: MaulSchnitt | null = null;
const gezeigtePose = (): Pose => (poseAn ? zustand.pose : RUHE);
/** zeigt das Fenster eine Pose, die die Form verändert? Dann zeigt auch die Seite den Umriss des Modells */
const posiertGezeigt = (): boolean => poseAn && (zustand.pose.zuege.length > 0 || (schnitt !== null && (zustand.pose.kiefer > 0 || zustand.pose.schaedel > 0)));
const maulRegler = document.getElementById('maul-regler') as HTMLLabelElement;
const maulEingabe = document.getElementById('maul-oeffnung') as HTMLInputElement;
const kopfRegler = document.getElementById('kopf-regler') as HTMLLabelElement;
const kopfEingabe = document.getElementById('kopf-oeffnung') as HTMLInputElement;
const poseSchalter = document.getElementById('pose') as HTMLInputElement;
const kieferKnopf = document.getElementById('kiefer-knopf') as HTMLButtonElement;
const kieferWahl = document.getElementById('kiefer-wahl') as HTMLSpanElement;
/** Knopf und Wahl der Kiefer: nur mit Maul und nicht in der Pose (dort wirkt nur der Pinsel) */
function kieferAnzeigen(): void {
  const m = zustand.maul;
  const getrennt = !!m?.unten;
  kieferKnopf.hidden = !m || poseAn;
  kieferKnopf.textContent = getrennt ? 'Kiefer zusammen' : 'Kiefer trennen';
  kieferWahl.hidden = !getrennt || poseAn;
  const l = auswahl?.art === 'maul' || auswahl?.art === 'mpunkt' ? auswahl.l : -1;
  for (const k of kieferWahl.querySelectorAll<HTMLButtonElement>('button')) k.setAttribute('aria-pressed', String(Number(k.dataset.kiefer) === l));
}
/** ein neuer Körper beginnt in der Grundform: Schalter „Pose“ aus (sonst würde jeder Druck auf ihn ein Pinselstrich) */
const ohnePose = (): void => {
  poseAn = false;
  poseSchalter.checked = false;
};
/**
 * Spielnetz (Probe „Backen“, 04.11.): die dichte Form auf höchstens BUDGET Dreiecke ausgedünnt, dieselben Punkte, nur weniger
 * Dreiecke; gebacken wird beim genauen Bau, beim Ziehen zeigt das Fenster die dichte Form.
 */
const BUDGET = 8000;
let spielnetzAn = false;
let spielnetz: Spielnetz | null = null;
let backBereit = false;
const spielnetzSchalter = document.getElementById('spielnetz') as HTMLInputElement;
const spielnetzInfo = document.getElementById('spielnetz-info') as HTMLSpanElement;
/** Probe „Linien aus dem Netz“: die Ansicht, die Florian gerade bearbeitet (bis zum genauen Bau nach dem Loslassen) */
let fuehrung: 'seite' | Blatt | null = null;
const fuehrt = (b: 'seite' | Blatt): void => {
  if (NETZ) fuehrung = b;
};
/** zuletzt nachgeführte Ansichten (Prüfhaken) */
let letzteNachfuehrung: Partial<Record<'seite' | Blatt, Omit<Nachfuehrung, 'punkte'>>> = {};
/** der zuletzt gebaute Körper aus gleichwertigen Ansichten (Prüfhaken) */
let letztesGleich: GleichesNetz | null = null;
// k: −1 der Körper, sonst Teil k
type Auswahl =
  | { art: 'umriss'; k: number; i: number }
  | { art: 'linie'; l: number }
  | { art: 'lpunkt'; l: number; i: number }
  | { art: 'profil'; blatt: Blatt; k: number; i: number }
  | { art: 'raum'; l: number }
  | { art: 'rpunkt'; l: number; i: number }
  // Maullinie l (0: die Maullinie, 1: die Lippe des kürzeren Kiefers) bzw. Punkte auf ihr (mit ⇧ mehrere)
  | { art: 'maul'; l: number }
  | { art: 'mpunkt'; l: number; i: number[] }
  | null;
let auswahl: Auswahl = null;
const zurueck: Zustand[] = [];
const vor: Zustand[] = [];
// der Bezug einer Linie (Umriss beim Zeichnen) wird nie verändert und bleibt deshalb dasselbe Objekt
const kopie = (z: Zustand): Zustand => ({
  punkte: z.punkte.map((q) => ({ ...q })),
  linien: z.linien.map((l) => ({ ...l, punkte: l.punkte.map((q) => ({ ...q })) })),
  front: z.front ? z.front.map((q) => ({ ...q })) : null,
  top: z.top ? z.top.map((q) => ({ ...q })) : null,
  ansichten: z.ansichten
    ? {
        seite: z.ansichten.seite.map((u) => u.map((q) => ({ ...q }))),
        front: z.ansichten.front.map((u) => u.map((q) => ({ ...q }))),
        top: z.ansichten.top.map((u) => u.map((q) => ({ ...q }))),
      }
    : null,
  raum: z.raum.map((l) => ({ ...l, punkte: l.punkte.map((q) => ({ ...q })) })),
  maul: z.maul ? { punkte: z.maul.punkte.map((q) => ({ ...q })), unten: z.maul.unten?.map((q) => ({ ...q })) } : null,
  pose: {
    kiefer: z.pose.kiefer,
    schaedel: z.pose.schaedel,
    zuege: z.pose.zuege.map((zg) => ({ c: [...zg.c] as [number, number, number], d: [...zg.d] as [number, number, number], r: zg.r })),
  },
  teile: z.teile.map((t) => ({
    punkte: t.punkte.map((q) => ({ ...q })),
    front: t.front ? t.front.map((q) => ({ ...q })) : null,
    top: t.top ? t.top.map((q) => ({ ...q })) : null,
  })),
});
function merken(stand: Zustand): void {
  zurueck.push(stand);
  if (zurueck.length > 200) zurueck.shift();
  vor.length = 0;
}

// ---------- 3D ----------

const renderer = new WebGLRenderer({ canvas: leinwand, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.autoClear = false;

const szene = new Scene();
const stufen = new DataTexture(new Uint8Array([70, 135, 200, 255]), 4, 1, RedFormat);
stufen.minFilter = NearestFilter;
stufen.magFilter = NearestFilter;
stufen.needsUpdate = true;
const koerperMaterial = new MeshToonMaterial({ color: KOERPER, gradientMap: stufen });
const umrissMaterial = new ShaderMaterial({
  uniforms: {
    uBreite: { value: 2.5 },
    uAufloesung: { value: new Vector2(1, 1) },
    uFarbe: { value: new Color(TINTE) },
  },
  vertexShader: /* glsl */ `
    uniform float uBreite;
    uniform vec2 uAufloesung;
    void main() {
      vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(normalMatrix * normal);
      vec2 richtung = (projectionMatrix * vec4(n, 0.0)).xy;
      float l = length(richtung);
      richtung = l > 1e-9 ? richtung / l : vec2(0.0);
      // volle Breite nur, wo die Fläche zum Umriss kippt; wo sie zur Kamera schaut, kaum Schub (sonst würfelt die
      // Richtung, und Rückseiten drehen sich auf dem Körper nach vorn)
      float kipp = clamp(length(n.xy) / 0.35, 0.0, 1.0);
      clip.xy += richtung * kipp * uBreite * 2.0 / uAufloesung * clip.w;
      gl_Position = clip;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uFarbe;
    void main() {
      gl_FragColor = vec4(uFarbe, 1.0);
    }
  `,
  side: BackSide,
  // knapp hinter den Körper, damit auf gleicher Tiefe nichts durchscheint
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: 2,
});

// Gezeichnete Linien in Front, Top und 3D: Bänder mit fester Pixelbreite je Probe, weiche Linien gestrichelt
const kantenShader = (deckung: number) =>
  new ShaderMaterial({
    uniforms: {
      uAufloesung: { value: new Vector2(1, 1) },
      uDpr: { value: 1 },
      uFarbe: { value: new Color(TINTE) },
      uDeckung: { value: deckung },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aAnderer;
      attribute float aSeite;
      attribute float aRichtung;
      attribute float aBreite;
      attribute float aLauf;
      uniform vec2 uAufloesung;
      uniform float uDpr;
      varying float vLauf;
      varying float vWeich;
      void main() {
        vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec4 b = projectionMatrix * modelViewMatrix * vec4(aAnderer, 1.0);
        vec2 d = (b.xy / b.w - a.xy / a.w) * uAufloesung;
        float l = length(d);
        d = l > 1e-6 ? d / l : vec2(1.0, 0.0);
        vec2 quer = vec2(-d.y, d.x) * aRichtung;
        float w = max(aBreite, 1.0) * uDpr;
        a.xy += quer * aSeite * w / uAufloesung * a.w;
        gl_Position = a;
        vLauf = aLauf;
        vWeich = aBreite < 0.3 ? 1.0 : 0.0;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFarbe;
      uniform float uDeckung;
      varying float vLauf;
      varying float vWeich;
      void main() {
        if (vWeich > 0.5 && mod(vLauf, 10.0) > 5.0) discard;
        gl_FragColor = vec4(uFarbe, uDeckung);
      }
    `,
    transparent: deckung < 1,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
const kanteSichtbar = kantenShader(1);
kanteSichtbar.depthFunc = LessEqualDepth;
const kanteVerdeckt = kantenShader(0.28);
kanteVerdeckt.depthFunc = GreaterDepth;

const koerper = new Mesh(new BufferGeometry(), koerperMaterial);
const umriss = new Mesh(koerper.geometry, umrissMaterial);
const kanten = new Mesh(new BufferGeometry(), kanteSichtbar);
const kantenHinten = new Mesh(kanten.geometry, kanteVerdeckt);
// Linien auf der Form (`?linien`): in allen vier Ansichten, sichtbar schwarz, verdeckt blass
const raumBand = new Mesh(new BufferGeometry(), kanteSichtbar);
const raumBandHinten = new Mesh(raumBand.geometry, kanteVerdeckt);
// Maul: das Innere (Gaumen und Boden) dunkel, die Lippen als Linien wie die Kanten (getrennt: oben rot, unten blau)
const maulInnen = new Mesh(new BufferGeometry(), new MeshToonMaterial({ color: MAULFARBE, gradientMap: stufen }));
const lippenMaterial = { oben: [kantenShader(1), kantenShader(0.28)], unten: [kantenShader(1), kantenShader(0.28)] } as const;
for (const [sichtbar, verdeckt] of Object.values(lippenMaterial)) {
  sichtbar.depthFunc = LessEqualDepth;
  verdeckt.depthFunc = GreaterDepth;
}
const lippeOben = new Mesh(new BufferGeometry(), lippenMaterial.oben[0]);
const lippeObenHinten = new Mesh(lippeOben.geometry, lippenMaterial.oben[1]);
const lippeUnten = new Mesh(new BufferGeometry(), lippenMaterial.unten[0]);
const lippeUntenHinten = new Mesh(lippeUnten.geometry, lippenMaterial.unten[1]);
const lippenMeshes = [lippeOben, lippeObenHinten, lippeUnten, lippeUntenHinten];
umriss.renderOrder = 1;
kanten.renderOrder = 2;
kantenHinten.renderOrder = 3;
raumBand.renderOrder = 2;
raumBandHinten.renderOrder = 3;
lippeOben.renderOrder = 2;
lippeObenHinten.renderOrder = 3;
lippeUnten.renderOrder = 2;
lippeUntenHinten.renderOrder = 3;
// Spielnetz: seine Dreiecke als feines Drahtgitter über der Form
const drahtMaterial = new MeshBasicMaterial({ color: TINTE, wireframe: true, transparent: true, opacity: 0.22, depthWrite: false });
drahtMaterial.polygonOffset = true;
drahtMaterial.polygonOffsetFactor = -1;
drahtMaterial.polygonOffsetUnits = -1;
const draht = new Mesh(koerper.geometry, drahtMaterial);
const drahtInnen = new Mesh(maulInnen.geometry, drahtMaterial);
draht.visible = false;
drahtInnen.visible = false;
draht.renderOrder = 2;
drahtInnen.renderOrder = 2;
szene.add(koerper, umriss, kanten, kantenHinten, raumBand, raumBandHinten, maulInnen, ...lippenMeshes, draht, drahtInnen);
const sonne = new DirectionalLight(0xffffff, 2.4);
sonne.position.set(0.9, 1.4, 1.1);
szene.add(sonne, new HemisphereLight(0xfff6e8, 0x9c8a74, 1.1));

const ortho = (x: number, y: number, z: number, oben: [number, number, number]): OrthographicCamera => {
  const k = new OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  k.position.set(x, y, z);
  k.up.set(...oben);
  k.lookAt(0, 0, 0);
  return k;
};
// Schnauze links: Seite von +z, Front von −x (vorn), Top von oben mit +z nach unten
const kameras = {
  seite: ortho(0, 0, 3000, [0, 1, 0]),
  front: ortho(-3000, 0, 0, [0, 1, 0]),
  top: ortho(0, 3000, 0, [0, 0, -1]),
};
const dreiKamera = new PerspectiveCamera(30, 1, 20, 20000);
dreiKamera.position.set(-560, 330, 980);
const steuerung = new OrbitControls(dreiKamera, felder.drei);
steuerung.target.set(0, 0, 0);
steuerung.update();

let neuZeichnen = true;
steuerung.addEventListener('change', () => {
  neuZeichnen = true;
});
// Solange Florian die 3D-Kamera nicht bewegt hat, rahmt sie den Körper nach jedem Bau ein
let kameraBewegt = false;
steuerung.addEventListener('start', () => {
  kameraBewegt = true;
});
const BLICK = new Vector3(-0.5, 0.32, 0.8).normalize();
function einrahmen(): void {
  const kugel = koerper.geometry.boundingSphere;
  const r = felder.drei.getBoundingClientRect();
  if (!kugel || r.width < 2 || r.height < 2) return;
  const fovV = (dreiKamera.fov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * (r.width / r.height));
  const abstand = (kugel.radius / Math.sin(Math.min(fovV, fovH) / 2)) * 1.12;
  steuerung.target.copy(kugel.center);
  dreiKamera.position.copy(kugel.center).addScaledVector(BLICK, abstand);
  steuerung.update();
}

const skala = (): number => {
  const r = felder.seite.getBoundingClientRect();
  return Math.max(1e-6, Math.min(r.width, r.height) / SICHT);
};

/** Linien auf dem Körper in Ruhe (Kanten, Linien auf der Form); in einer Pose biegt `poseAnwenden` sie mit. */
let kantenRuhe: readonly Kante3D[] = [];
let raumRuhe: readonly Kante3D[] = [];
/** der Körper in Ruhe (mit Maul der geschnittene) und seine Lagen nach dem Blendshape, vor den Knochen (für den Pinsel) */
let ruheKoerper: { positionen: Float32Array; normalen: Float32Array } = { positionen: new Float32Array(0), normalen: new Float32Array(0) };
let vorKnochen = new Float32Array(0);
let innenVorKnochen = new Float32Array(0);
const ersetzen = (a: Mesh, b: Mesh, g: BufferGeometry): void => {
  const alt = a.geometry;
  a.geometry = g;
  b.geometry = g;
  alt.dispose();
};

function geometrieSetzen(n: DichtesNetz): void {
  const s = schnitt;
  const g = new BufferGeometry();
  // mit Maul der geschnittene Körper in eigenen Puffern: die Öffnung schreibt hinein, die Ruhe bleibt im Schnitt; das Spielnetz
  // ist nur eine andere Dreiecksliste über denselben Punkten
  const sp = spielnetz;
  ruheKoerper = s ? { positionen: s.positionen, normalen: s.normalen } : { positionen: n.positionen, normalen: n.normalen };
  vorKnochen = new Float32Array(ruheKoerper.positionen);
  innenVorKnochen = s ? new Float32Array(s.innen.positionen) : new Float32Array(0);
  g.setAttribute('position', new BufferAttribute(new Float32Array(ruheKoerper.positionen), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(ruheKoerper.normalen), 3));
  g.setIndex(new BufferAttribute(sp ? sp.indizes : s ? s.indizes : n.indizes, 1));
  g.computeBoundingSphere();
  ersetzen(koerper, umriss, g);
  const gi = new BufferGeometry();
  if (s) {
    gi.setAttribute('position', new BufferAttribute(new Float32Array(s.innen.positionen), 3));
    gi.setAttribute('normal', new BufferAttribute(new Float32Array(s.innen.normalen), 3));
    gi.setIndex(new BufferAttribute(sp ? sp.innenIndizes : s.innen.indizes, 1));
  }
  const altI = maulInnen.geometry;
  maulInnen.geometry = gi;
  altI.dispose();
  draht.geometry = g;
  drahtInnen.geometry = gi;
  draht.visible = sp !== null;
  drahtInnen.visible = sp !== null && s !== null;
  kantenRuhe = n.kanten;
  // Linien auf der Form, auf die Fläche gelegt (Tiefe der Form an ihrer Stelle in der Seite); mit Teilen auf die ihres Teils
  raumRuhe = LINIEN
    ? zustand.raum.map((l, i) => {
        const kontur = letzteKonturen[teilDer(l) + 1] ?? n.kontur;
        return { ...raumKanten([l], 2, kontur ? (x, y) => tiefeAusKontur(kontur, x, y) : undefined)[0]!, linie: i };
      })
    : [];
  poseAnwenden();
}

/** Die Pose zeigen (oder die Grundform): Körper, Inneres, Lippen und die Linien auf dem Körper; kein neuer Bau. */
function poseAnwenden(): void {
  const s = schnitt;
  const pose = gezeigtePose();
  const pa = koerper.geometry.getAttribute('position') as BufferAttribute | undefined;
  const na = koerper.geometry.getAttribute('normal') as BufferAttribute | undefined;
  if (pa && na) {
    const ia = maulInnen.geometry.getAttribute('position') as BufferAttribute | undefined;
    const ina = maulInnen.geometry.getAttribute('normal') as BufferAttribute | undefined;
    const ziel =
      s && ia && ina
        ? {
            positionen: pa.array as Float32Array,
            normalen: na.array as Float32Array,
            vorKnochen,
            innenPositionen: ia.array as Float32Array,
            innenNormalen: ina.array as Float32Array,
            innenVorKnochen,
          }
        : { positionen: pa.array as Float32Array, normalen: na.array as Float32Array, vorKnochen };
    posieren(ruheKoerper, s, pose, ziel);
    for (const a of [pa, na, ia, ina]) if (a) a.needsUpdate = true;
    // für den Pinsel: der Strahltest prüft zuerst die Hüllkugel
    koerper.geometry.computeBoundingSphere();
  }
  const ruhig = pose.zuege.length === 0 && (!s || (pose.kiefer === 0 && pose.schaedel === 0));
  const biegen = (k: Kante3D): Kante3D => {
    if (ruhig) return k;
    const lagen = new Float32Array(k.lagen);
    for (let i = 0; i < lagen.length / 3; i++) {
      const q = posePunkt(s, pose, lagen[3 * i]!, lagen[3 * i + 1]!, lagen[3 * i + 2]!);
      lagen[3 * i] = q[0];
      lagen[3 * i + 1] = q[1];
      lagen[3 * i + 2] = q[2];
    }
    return { ...k, lagen };
  };
  ersetzen(kanten, kantenHinten, kantenGeometrie(kantenRuhe.map(biegen)));
  ersetzen(raumBand, raumBandHinten, kantenGeometrie(raumRuhe.map(biegen)));
  // Lippen: oben und unten aus den Punkten des Körpers, je vom einen Mundwinkel um die Schnauze zum anderen; getrennt farbig
  const lp: Kante3D[] = [];
  if (s) {
    const pos = koerper.geometry.getAttribute('position').array as Float32Array;
    for (const lippe of [s.lippeOben, s.lippeUnten]) {
      const lagen = new Float32Array(3 * lippe.length);
      lippe.forEach((v, i) => {
        lagen[3 * i] = pos[3 * v]!;
        lagen[3 * i + 1] = pos[3 * v + 1]!;
        lagen[3 * i + 2] = pos[3 * v + 2]!;
      });
      lp.push({ lagen, breite: new Float32Array(lippe.length).fill(LIPPE), linie: -1 });
    }
  }
  ersetzen(lippeOben, lippeObenHinten, kantenGeometrie(lp.slice(0, 1)));
  ersetzen(lippeUnten, lippeUntenHinten, kantenGeometrie(lp.slice(1, 2)));
  const getrennt = s?.unten != null;
  for (const m of lippenMaterial.oben) m.uniforms.uFarbe!.value.set(getrennt ? OBERLIPPE : TINTE);
  for (const m of lippenMaterial.unten) m.uniforms.uFarbe!.value.set(getrennt ? UNTERLIPPE : TINTE);
  neuZeichnen = true;
}

/** Bänder der Linien: je Strecke ein Viereck, die Breite setzt der Shader in Pixeln. */
function kantenGeometrie(liste: readonly Kante3D[]): BufferGeometry {
  const pos: number[] = [];
  const anderer: number[] = [];
  const seite: number[] = [];
  const richtung: number[] = [];
  const breite: number[] = [];
  const lauf: number[] = [];
  const ind: number[] = [];
  for (const k of liste) {
    let s = 0;
    for (let i = 0; i + 1 < k.breite.length; i++) {
      const ax = k.lagen[3 * i]!;
      const ay = k.lagen[3 * i + 1]!;
      const az = k.lagen[3 * i + 2]!;
      const bx = k.lagen[3 * i + 3]!;
      const by = k.lagen[3 * i + 4]!;
      const bz = k.lagen[3 * i + 5]!;
      const l = Math.hypot(bx - ax, by - ay, bz - az);
      const v = pos.length / 3;
      for (const [p, q, r, w, ls] of [
        [[ax, ay, az], [bx, by, bz], 1, k.breite[i]!, s],
        [[bx, by, bz], [ax, ay, az], -1, k.breite[i + 1]!, s + l],
      ] as const) {
        for (const sd of [1, -1]) {
          pos.push(...p);
          anderer.push(...q);
          seite.push(sd);
          richtung.push(r);
          breite.push(w);
          lauf.push(ls);
        }
      }
      ind.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      s += l;
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('aAnderer', new BufferAttribute(new Float32Array(anderer), 3));
  g.setAttribute('aSeite', new BufferAttribute(new Float32Array(seite), 1));
  g.setAttribute('aRichtung', new BufferAttribute(new Float32Array(richtung), 1));
  g.setAttribute('aBreite', new BufferAttribute(new Float32Array(breite), 1));
  g.setAttribute('aLauf', new BufferAttribute(new Float32Array(lauf), 1));
  g.setIndex(ind);
  return g;
}

/** aus dem letzten Bau: wo der Körper von vorn und oben am breitesten ist, Tiefe je Stelle (`?linien`: Umriss anfassen) */
/** `?linien`: je Umriss (Körper, dann die Teile), wo er von vorn und von oben am breitesten ist */
let letzteKonturen: Kontur[] = [];
/** aus dem letzten Bau: Streckung der Tiefe, Tiefe der Linienpunkte, Linien im Raum (für Front und Top) */
let letzteTiefe: DichtesNetz['tiefe'] = null;
let letzteLinienZ: Float64Array[] = [];
let letzteKanten: readonly Kante3D[] = [];
/** Tiefe eines Linienpunkts, wie Front und Top sie zeigen (gestreckt); unbekannt, solange die Linie noch nicht gebaut ist */
function linienTiefe(l: number, i: number): number | null {
  const p = zustand.linien[l]?.punkte[i];
  if (!p) return null;
  const z = p.z ?? letzteLinienZ[l]?.[i];
  return z === undefined ? null : z * streckungBei(letzteTiefe, p.x, p.y);
}
const abgeleitet: Record<Blatt, UmrissPunkt[] | null> = { front: null, top: null };

/** Gleichwertige Ansichten: der Körper aus allen drei Umrissen, als Netz in der Form des runden Baus (noch ohne Linien). */
function gleichBauen(
  a: Ansichten,
  fein: boolean,
  fuehrend: 'seite' | Blatt | null = null,
): { n: DichtesNetz; ellipsoide: Record<'seite' | 'front' | 'top', number>; g: GleichesNetz } {
  const g = formAusAnsichten(
    { seite: [zustand.punkte, ...a.seite], front: a.front, top: a.top },
    { dreiecke: fein ? DREIECKE_FEIN : DREIECKE_ZUG, fuehrend },
  );
  return { n: netzAusGleich(g), ellipsoide: g.ellipsoide, g };
}

/** Das Netz gleichwertiger Ansichten (oder der Teile) in der Form des runden Baus (noch ohne Linien). */
function netzAusGleich(g: GleichesNetz): DichtesNetz {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const P of g.umrisse.seite) {
    for (const q of P) {
      xMin = Math.min(xMin, q.x);
      xMax = Math.max(xMax, q.x);
      yMin = Math.min(yMin, q.y);
      yMax = Math.max(yMax, q.y);
    }
  }
  const leer = { r0: 0, dr: 1, breite: new Float64Array(0) };
  const n: DichtesNetz = {
    positionen: g.positionen,
    normalen: g.normalen,
    indizes: g.indizes,
    zelle: g.zelle,
    umriss: g.umrisse.seite[0] ?? [],
    kanten: [],
    ansichten: { front: leer, top: leer, seite: { xMin, xMax, yMin, yMax } },
    tiefe: null,
    linienZ: [],
  };
  return n;
}

/** aus dem letzten Bau: Front und Top der Teile, die ihrem Teil folgen (noch nicht angefasst) */
let abgeleitetTeile: Record<Blatt, UmrissPunkt[] | null>[] = [];

/**
 * Die Zeichnungen eines Körpers oder Teils für den Bau aus Teilen (k: −1 der Körper, sonst das Teil). Eine nicht gezeichnete
 * Ansicht folgt dem runden Körper aus der Seite und der gezeichneten Ansicht (für die Anzeige gemerkt); gebaut wird nur, was
 * gezeichnet ist.
 */
function teilZeichnung(k: number, punkte: UmrissPunkt[], front: UmrissPunkt[] | null, top: UmrissPunkt[] | null): Zeichnungen {
  const ziel = k < 0 ? abgeleitet : (abgeleitetTeile[k] = { front: null, top: null });
  if (!front || !top) {
    // beim Ziehen ändert sich meist nur ein Teil: die Ableitung je Zeichnung merken
    const schluessel = JSON.stringify([punkte, front, top]);
    let a = ableitungen.get(schluessel);
    if (!a) {
      const sx = ausdehnung(punkte, 'x');
      const sy = ausdehnung(punkte, 'y');
      const r = rundAusSeite(punkte, {
        dreiecke: DREIECKE_ZUG,
        front: front ? breitenAus('front', front, sy.lo, sy.hi) : null,
        top: top ? breitenAus('top', top, sx.lo, sx.hi) : null,
      });
      const s = r.ansichten.seite;
      a = {
        front: front ? null : ausBreiten('front', profilAusBreite(r.ansichten.front, s.yMin, s.yMax, 3), s.yMin, s.yMax),
        top: top ? null : ausBreiten('top', profilAusBreite(r.ansichten.top, s.xMin, s.xMax, 3), s.xMin, s.xMax),
      };
      ableitungen.set(schluessel, a);
      if (ableitungen.size > 16) ableitungen.delete(ableitungen.keys().next().value!);
    }
    ziel.front = a.front;
    ziel.top = a.top;
  }
  return { seite: [punkte], front: front ? [ganz('front', front)] : null, top: top ? [ganz('top', top)] : null };
}
/** gemerkte Front und Top, die einer Zeichnung folgen (Schlüssel: Seite, Front, Top) */
const ableitungen = new Map<string, Record<Blatt, UmrissPunkt[] | null>>();

/**
 * Probe „Linien aus dem Netz“: Die Ansichten, die Florian nicht bearbeitet hat, zeigen danach den Umriss des Körpers. Punkte,
 * deren Linie noch auf ihm liegt, bleiben bitgleich; nur dazwischen werden Punkte neu gesetzt.
 */
function ansichtenNachfuehren(g: GleichesNetz, fuehrend: 'seite' | Blatt): void {
  const tol = Math.max(1, 0.5 * g.zelle);
  letzteNachfuehrung = {};
  for (const b of ['seite', 'front', 'top'] as const) {
    if (b === fuehrend) continue;
    const alt = b === 'seite' ? zustand.punkte : zustand[b];
    const schleife = umrisseDesKoerpers(g.liste, b, g.zelle / 2)[0];
    if (!alt || !schleife) continue;
    const ziel = b === 'seite' ? schleife : halbeLinie(schleife, b);
    if (!ziel) continue;
    const { punkte, ...info } = linieNachfuehren(alt, ziel, b, tol);
    letzteNachfuehrung[b] = info;
    if (punkte === alt) continue;
    if (b === 'seite') zustand.punkte = punkte;
    else zustand[b] = punkte;
    // eine gewählte Punktnummer gilt in einer nachgeführten Ansicht nicht mehr
    if ((auswahl?.art === 'umriss' && b === 'seite') || (auswahl?.art === 'profil' && auswahl.blatt === b)) auswahl = null;
  }
}

/**
 * Breite je Stelle eines gezeichneten halben Umrisses als halbes Profil über [a0, a1] — für den runden Körper, dem die nicht
 * gezeichnete Ansicht folgt.
 */
function breitenAus(b: Blatt, h: readonly UmrissPunkt[], a0: number, a1: number): BreitenPunkt[] {
  const n = 64;
  const dr = (a1 - a0) / n;
  const breite = new Float64Array(n + 1);
  for (const q of umrissAbtasten(ganz(b, h), Math.max(0.5, dr / 2)).punkte) {
    const [l, w] = laengsQuer(b, q);
    const k = Math.round((l - a0) / dr);
    if (k >= 0 && k <= n) breite[k] = Math.max(breite[k]!, Math.abs(w));
  }
  return profilAusBreite({ r0: a0, dr, breite }, a0, a1, 2, 8);
}

/** Halbes Profil (längs 0…1 über [a0, a1], quer) → halber Umriss: so folgen Front und Top dem Körper, bis Florian sie anfasst. */
const ausBreiten = (b: Blatt, p: readonly BreitenPunkt[], a0: number, a1: number): UmrissPunkt[] =>
  p.map((q) => {
    const pt = halbPunkt(b, a0 + q.laengs * (a1 - a0), q.quer);
    return q.ecke ? { ...pt, ecke: true } : pt;
  });

let bauGewuenscht: 'grob' | 'fein' | null = 'fein';
function bauen(fein: boolean): void {
  const t0 = performance.now();
  // vor dem Körper: ein fehlender Punkt einer Lippe ändert den Umriss
  maulKnotenSichern();
  let gleich: ReturnType<typeof gleichBauen> | null = null;
  let n: DichtesNetz;
  abgeleitet.front = null;
  abgeleitet.top = null;
  if (LINIEN) {
    // Florians Modell: die Seite legt das Volumen an, die Linien auf der Form formen es (Front und Top nur Ansicht). Mit Teilen
    // jedes Teil aus seiner Seite und seinen eigenen Linien, zusammen die größte Tiefe
    raumEndenAufUmriss();
    if (zustand.teile.length > 0) {
      const r = rundAusTeilen(
        alleUmrisse().map((k) => ({ punkte: umrissVon(k), raumlinien: zustand.raum.filter((l) => teilDer(l) === k) })),
        { dreiecke: fein ? DREIECKE_FEIN : DREIECKE_ZUG },
      );
      letzteKonturen = r.konturen;
      n = r;
    } else {
      n = rundAusSeite(zustand.punkte, { dreiecke: fein ? DREIECKE_FEIN : DREIECKE_ZUG, linien: zustand.linien, raumlinien: zustand.raum });
      letzteKonturen = n.kontur ? [n.kontur] : [];
    }
  } else if (zustand.ansichten) {
    gleich = gleichBauen(zustand.ansichten, fein);
    n = gleich.n;
  } else if (zustand.teile.length > 0) {
    // Teile (05.11.): jedes für sich aus seinen eigenen Umrissen, zusammen ein Netz
    abgeleitetTeile = [];
    const zs = [teilZeichnung(-1, zustand.punkte, zustand.front, zustand.top), ...zustand.teile.map((t, k) => teilZeichnung(k, t.punkte, t.front, t.top))];
    const g = formAusTeilen(zs, { dreiecke: fein ? DREIECKE_FEIN : DREIECKE_ZUG });
    gleich = { n: netzAusGleich(g), ellipsoide: g.ellipsoide, g };
    n = gleich.n;
  } else if (!zustand.front && !zustand.top) {
    // nur die Seite: der runde Körper samt Linien; Front und Top folgen ihm
    n = rundAusSeite(zustand.punkte, { dreiecke: fein ? DREIECKE_FEIN : DREIECKE_ZUG, linien: zustand.linien });
    const s = n.ansichten.seite;
    // auf etwa 2 px genau, höchstens 6 Punkte: wenige Punkte zum Greifen statt einer Perlenkette
    abgeleitet.front = ausBreiten('front', profilAusBreite(n.ansichten.front, s.yMin, s.yMax, 3), s.yMin, s.yMax);
    abgeleitet.top = ausBreiten('top', profilAusBreite(n.ansichten.top, s.xMin, s.xMax, 3), s.xMin, s.xMax);
  } else {
    // alle Ansichten gleichwertig; die nicht gezeichnete folgt dem runden Körper aus der Seite und der gezeichneten
    let front = zustand.front;
    let top = zustand.top;
    if (!front || !top) {
      const sx = ausdehnung(zustand.punkte, 'x');
      const sy = ausdehnung(zustand.punkte, 'y');
      const r = rundAusSeite(zustand.punkte, {
        dreiecke: DREIECKE_ZUG,
        front: front ? breitenAus('front', front, sy.lo, sy.hi) : null,
        top: top ? breitenAus('top', top, sx.lo, sx.hi) : null,
      });
      const s = r.ansichten.seite;
      if (!front) front = abgeleitet.front = ausBreiten('front', profilAusBreite(r.ansichten.front, s.yMin, s.yMax, 3), s.yMin, s.yMax);
      if (!top) top = abgeleitet.top = ausBreiten('top', profilAusBreite(r.ansichten.top, s.xMin, s.xMax, 3), s.xMin, s.xMax);
      // mit `?netz` übernommen: ab jetzt wird auch diese Ansicht dem Mesh nachgeführt
      if (NETZ) {
        zustand.front = front.map((q) => ({ ...q }));
        zustand.top = top.map((q) => ({ ...q }));
      }
    }
    gleich = gleichBauen({ seite: [], front: [ganz('front', front)], top: [ganz('top', top)] }, fein, NETZ ? fuehrung : null);
    n = gleich.n;
    // Probe „Linien aus dem Netz“: nach dem Loslassen zeigen die anderen Ansichten das Mesh
    if (NETZ && fein && fuehrung) {
      ansichtenNachfuehren(gleich.g, fuehrung);
      fuehrung = null;
    }
  }
  // Maul: geschnitten wird das fertige Netz; die Lippen beginnen an ihren Punkten des Umrisses (`maulKnotenSichern`)
  if (zustand.maul) {
    // der Umriss der Seite sagt, wo die Schnitte die Form vorn verlassen (gleichwertige Ansichten: der Körper reicht über ihn)
    schnitt = maulSchneiden(n, zustand.maul, { zelle: n.zelle, kontur: n.kontur, umriss: gleich ? undefined : n.umriss });
  } else {
    schnitt = null;
  }
  // Regler zeigen die Knochen der Pose (auch nach ⌘Z)
  maulRegler.hidden = !schnitt;
  kopfRegler.hidden = !schnitt;
  maulEingabe.value = String(zustand.pose.kiefer);
  kopfEingabe.value = String(zustand.pose.schaedel);
  poseSchalter.checked = poseAn;
  pinselHoehe = n.ansichten.seite.yMax - n.ansichten.seite.yMin || 1;
  // Spielnetz: beim genauen Bau backen (mit Maul in geöffneter Lage, s. `maulBacken`)
  spielnetz = null;
  if (spielnetzAn && backBereit && fein) {
    spielnetz = schnitt ? maulBacken(schnitt, BUDGET) : backen({ positionen: n.positionen, normalen: n.normalen, indizes: n.indizes }, null, BUDGET);
  }
  const hoehe = n.ansichten.seite.yMax - n.ansichten.seite.yMin || 1;
  spielnetzInfo.textContent = spielnetz
    ? `${spielnetz.dreiecke.toLocaleString('de-DE')} Dreiecke · ≈ ${((spielnetz.fehler / hoehe) * 300).toLocaleString('de-DE', { maximumFractionDigits: 1 })} px bei 300 px Höhe`
    : spielnetzAn
      ? '…'
      : '';
  const ms = performance.now() - t0;
  letztesGleich = gleich?.g ?? null;
  geometrieSetzen(n);
  if (fein && !kameraBewegt) einrahmen();
  letzteTiefe = n.tiefe;
  letzteLinienZ = n.linienZ;
  letzteKanten = n.kanten;
  profileZeichnen();
  svgZeichnen();
  const k = kopie(zustand);
  window.__form = {
    punkte: k.punkte,
    linien: k.linien,
    front: k.front,
    top: k.top,
    dreiecke: n.indizes.length / 3,
    ms,
    zelle: n.zelle,
    fein,
    ellipsoide: gleich?.ellipsoide ?? null,
    netz: NETZ,
    nachgefuehrt: letzteNachfuehrung,
    raum: k.raum,
    maul: k.maul,
    oeffnung: gezeigtePose().kiefer,
    pose: { an: poseAn, ...k.pose },
    schnitt: schnitt
      ? { lippe: schnitt.lippeOben.length, innen: schnitt.innen.indizes.length / 3, getrennt: schnitt.unten !== null }
      : null,
    spiel: spielnetz
      ? {
          dreiecke: spielnetz.dreiecke,
          punkte: spielnetz.punkte,
          fehler: spielnetz.fehler,
          px: (spielnetz.fehler / hoehe) * 300,
          dicht: n.indizes.length / 3 + (schnitt ? schnitt.innen.indizes.length / 3 : 0),
        }
      : null,
    teile: k.teile.map((t, j) => ({
      ...t,
      gezeigt: { front: profilVon('front', j)?.map((q) => ({ ...q })) ?? null, top: profilVon('top', j)?.map((q) => ({ ...q })) ?? null },
    })),
  };
  neuZeichnen = true;
}

/** Nächster Punkt auf dem gezeichneten Seitenumriss. */
function naechsterAufUmriss(x: number, y: number): { x: number; y: number } {
  const u = umrissAbtasten(zustand.punkte, 1).punkte;
  let best = Infinity;
  let q = { x, y };
  for (let i = 0; i < u.length; i++) {
    const a = u[i]!;
    const b = u[(i + 1) % u.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
    const d = Math.hypot(a.x + t * dx - x, a.y + t * dy - y);
    if (d < best) {
      best = d;
      q = { x: a.x + t * dx, y: a.y + t * dy };
    }
  }
  return q;
}

// Wo eine Lippe auf den Umriss trifft, ist ein echter Punkt des Umrisses (05.11., Florian: „die Kiefer sind dann echter Teil der
// Outline“): Er bewegt den Anfang der Lippe und den Umriss zugleich, frei, nicht nur entlang der Linie. Mit getrennten Kiefern
// liegen die Punkte von Ober- und Unterlippe nebeneinander; das Stück dazwischen ist die Front des Mauls (gerade).

const ohneLippe = (q: UmrissPunkt): UmrissPunkt => (q.ecke ? { x: q.x, y: q.y, ecke: true } : { x: q.x, y: q.y });
/** Nummer des Umrisspunkts, an dem eine Lippe beginnt (−1: keiner). */
const lippenKnoten = (l: 'oben' | 'unten'): number => zustand.punkte.findIndex((q) => q.lippe === l);

/** Liegt zwischen Umrisspunkt i und i + 1 die Front des Mauls (die Anfänge von Ober- und Unterlippe nebeneinander)? */
function istMaulFront(i: number): boolean {
  const p = zustand.punkte;
  const a = p[i]?.lippe;
  const b = p[(i + 1) % p.length]?.lippe;
  return !!a && !!b && a !== b;
}

/** So nah (Bildpunkte) rastet der Anfang einer Lippe auf einen Punkt des Umrisses ein, statt dicht daneben einen zu setzen. */
const EINRASTEN_PX = 6;

/** Ein Punkt des Umrisses bei q (q liegt auf ihm): ein vorhandener ohne Lippe, wenn er nah liegt, sonst ein neuer; seine Nummer. */
function umrissPunktBei(q: { x: number; y: number }): number {
  let nah = -1;
  let best = EINRASTEN_PX / skala();
  zustand.punkte.forEach((p, i) => {
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (!p.lippe && d < best) {
      best = d;
      nah = i;
    }
  });
  if (nah >= 0) return nah;
  const st = naechsteStelle(q);
  zustand.punkte.splice(st.i + 1, 0, { x: q.x, y: q.y });
  return st.i + 1;
}

/** Richtung der Linie durch Umrisspunkt i, wie sie gerade läuft (die Griffe der Stücke an ihm liegen auf ihr). */
function richtungAm(i: number): { x: number; y: number } | undefined {
  const st = umrissStuecke(zustand.punkte);
  const n = st.length;
  const k = st[i]!;
  let r = { x: k[1].x - k[0].x, y: k[1].y - k[0].y };
  if (Math.hypot(r.x, r.y) < 1e-9) {
    const v = st[(i - 1 + n) % n]!;
    r = { x: v[3].x - v[2].x, y: v[3].y - v[2].y };
  }
  const l = Math.hypot(r.x, r.y);
  return l > 1e-9 && !zustand.punkte[i]!.ecke ? { x: r.x / l, y: r.y / l } : undefined;
}

/**
 * Liegt der Unterkiefer am Umrisspunkt i in Richtung der Nummern? Die Seite des Oberkiefers ist wie im Kern die, auf die die
 * linke Normale der Lippe (Anfang → Mundwinkel) nach oben zeigt.
 */
function unterkieferNachVorn(i: number, lippe: readonly MaulPunkt[]): boolean {
  const u = zustand.punkte;
  const n = u.length;
  const a = u[(i - 1 + n) % n]!;
  const b = u[(i + 1) % n]!;
  const s = lippe[0]!;
  const e = lippe[lippe.length - 1]!;
  const vz = e.x - s.x >= 0 ? 1 : -1;
  return (b.x - a.x) * -(e.y - s.y) * vz + (b.y - a.y) * (e.x - s.x) * vz < 0;
}

/**
 * Hält Umriss und Maul zusammen: je Lippe ein Punkt des Umrisses (fehlt er, kommt er dorthin, wo der Anfang der Lippe auf dem
 * Umriss liegt, auf einen nahen Punkt eingerastet; die Unterlippe zuerst neben den der Oberlippe, auf die Seite des
 * Unterkiefers), und die Lippen beginnen genau dort. Getrennt behalten beide Punkte die Richtung der Linie beim Trennen: Ein Kiefer
 * wächst dann so nach vorn, wie die Linie dort lief (sonst richtete sie sich nach dem nächsten Punkt, und ein naher machte eine
 * Spitze). Ohne Unterlippe fällt ihr Punkt weg, ohne Maul ist der Punkt der Maullinie ein gewöhnlicher Punkt.
 */
function maulKnotenSichern(): void {
  const u = zustand.punkte;
  const m = zustand.maul;
  // je Lippe höchstens ein Punkt
  for (const l of ['oben', 'unten'] as const) {
    const erster = u.findIndex((q) => q.lippe === l);
    for (let i = 0; i < u.length; i++) if (i !== erster && u[i]!.lippe === l) u[i] = ohneLippe(u[i]!);
  }
  const unten = m?.unten && m.unten.length >= 2 ? m.unten : null;
  if (!unten) {
    const iu = lippenKnoten('unten');
    if (iu >= 0) u.splice(iu, 1);
  }
  if (!m) {
    const io = lippenKnoten('oben');
    if (io >= 0) u[io] = ohneLippe(u[io]!);
    return;
  }
  let io = lippenKnoten('oben');
  if (io < 0) {
    io = umrissPunktBei(naechsterAufUmriss(m.punkte[0]!.x, m.punkte[0]!.y));
    u[io] = { ...ohneLippe(u[io]!), lippe: 'oben' };
  }
  // zusammen läuft die Linie durch den Anfang wie durch jeden Punkt
  if (!unten && u[io]!.richtung) u[io] = { ...ohneLippe(u[io]!), lippe: 'oben' };
  if (unten && lippenKnoten('unten') < 0) {
    const a = unten[0]!;
    const o = u[io]!;
    if (Math.hypot(a.x - o.x, a.y - o.y) < EINRASTEN_PX / skala()) {
      const richtung = richtungAm(io);
      u.splice(unterkieferNachVorn(io, m.punkte) ? io + 1 : io, 0, { x: o.x, y: o.y, lippe: 'unten', ...(richtung ? { richtung } : {}) });
      io = lippenKnoten('oben');
      if (richtung) u[io] = { ...u[io]!, richtung };
    } else {
      const iu = umrissPunktBei(naechsterAufUmriss(a.x, a.y));
      io = lippenKnoten('oben');
      // beide Richtungen, bevor die Punkte Nachbarn mit der geraden Front dazwischen werden
      const ru = richtungAm(iu);
      const ro = richtungAm(io);
      u[iu] = { ...ohneLippe(u[iu]!), lippe: 'unten', ...(ru ? { richtung: ru } : {}) };
      if (ro) u[io] = { ...u[io]!, richtung: ro };
    }
  }
  const o = u[io]!;
  m.punkte[0] = { ...m.punkte[0]!, x: o.x, y: o.y };
  if (unten) {
    const d = u[lippenKnoten('unten')]!;
    unten[0] = { ...unten[0]!, x: d.x, y: d.y };
    // die Unterlippe endet im Mundwinkel der Oberlippe
    const mw = m.punkte[m.punkte.length - 1]!;
    unten[unten.length - 1] = { ...unten[unten.length - 1]!, x: mw.x, y: mw.y };
  }
}

/** Ein neues Maul: Die Punkte der alten Lippen werden gewöhnliche Punkte des Umrisses (der der Unterlippe fällt weg). */
function lippenLoesen(): void {
  zustand.punkte = zustand.punkte.filter((q) => q.lippe !== 'unten').map((q) => (q.lippe ? ohneLippe(q) : q));
}

/** Der Anfang einer Lippe ist ein Punkt des Umrisses: Er zieht den Umriss mit (die anderen Ansichten folgen wie bei jedem Punkt). */
function anfangZiehen(l: number, q: { x: number; y: number }): void {
  const k = lippenKnoten(l === 1 ? 'unten' : 'oben');
  if (k < 0) return;
  zustand.punkte[k] = { ...zustand.punkte[k]!, x: q.x, y: q.y };
  koppeln('seite', k);
}

/**
 * Anfang und Ende einer Raumlinie liegen auf dem Umriss der Seite (dort treffen sich die Linie und der Umriss); zieht Florian
 * die Seite, gehen sie mit auf den nächsten Punkt des Umrisses.
 */
function raumEndenAufUmriss(): void {
  if (zustand.raum.length === 0) return;
  const umrisse = new Map<number, { x: number; y: number }[]>();
  let u: { x: number; y: number }[] = [];
  const naechster = (x: number, y: number): { x: number; y: number } => {
    let best = Infinity;
    let q = { x, y };
    for (let i = 0; i < u.length; i++) {
      const a = u[i]!;
      const b = u[(i + 1) % u.length]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
      const d = Math.hypot(a.x + t * dx - x, a.y + t * dy - y);
      if (d < best) {
        best = d;
        q = { x: a.x + t * dx, y: a.y + t * dy };
      }
    }
    return q;
  };
  for (const l of zustand.raum) {
    // auf den Umriss ihres Teils
    const k = teilDer(l);
    if (!umrisse.has(k)) umrisse.set(k, umrissAbtasten(umrissVon(k), 2).punkte);
    u = umrisse.get(k)!;
    for (const i of [0, l.punkte.length - 1]) {
      const p = l.punkte[i]!;
      const q = naechster(p.x, p.y);
      l.punkte[i] = { ...p, x: q.x, y: q.y, z: 0 };
    }
  }
}

function rendern(): void {
  const hoehe = window.innerHeight;
  const dpr = renderer.getPixelRatio();
  renderer.setScissorTest(false);
  renderer.setClearColor(PAPIER, 1);
  renderer.clear();
  renderer.setScissorTest(true);
  const s = skala();
  const blaetter: [keyof typeof felder, OrthographicCamera | PerspectiveCamera][] = [
    ['seite', kameras.seite],
    ['front', kameras.front],
    ['top', kameras.top],
    ['drei', dreiKamera],
  ];
  for (const [name, kamera] of blaetter) {
    const r = felder[name].getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const y = hoehe - r.bottom;
    renderer.setViewport(r.left, y, r.width, r.height);
    renderer.setScissor(r.left, y, r.width, r.height);
    if (kamera instanceof OrthographicCamera) {
      const w = r.width / s / 2;
      const h = r.height / s / 2;
      kamera.left = -w;
      kamera.right = w;
      kamera.top = h;
      kamera.bottom = -h;
    } else {
      kamera.aspect = r.width / r.height;
    }
    kamera.updateProjectionMatrix();
    // in der Seite sind die gezeichneten Linien selbst zu sehen; der Shader zeichnet Umriss und Linien in den anderen Blättern
    const andere = name !== 'seite';
    // mit gleichwertigen Ansichten zeigt auch die Seite den Umriss des Modells (über der Zeichnung), mit `?netz` immer, mit
    // offenem Maul ebenso (die Zeichnung bleibt geschlossen)
    umriss.visible = andere || zustand.ansichten !== null || NETZ || LINIEN || posiertGezeigt();
    kanten.visible = andere;
    kantenHinten.visible = andere;
    for (const l of lippenMeshes) l.visible = andere;
    umrissMaterial.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
    umrissMaterial.uniforms.uBreite!.value = 2.5 * dpr;
    for (const m of [kanteSichtbar, kanteVerdeckt, ...lippenMaterial.oben, ...lippenMaterial.unten]) {
      m.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
      m.uniforms.uDpr!.value = dpr;
    }
    renderer.clearDepth();
    renderer.render(szene, kamera);
  }
}

// ---------- Teile ----------
// Ein Teil (05.11.) hat in jeder Ansicht seinen eigenen Umriss. Es entsteht von selbst, wenn eine Einbuchtung beim Loslassen
// mindestens „ab“-mal so tief wie breit ist, oder an einer gezogenen Naht. Teile verschmelzen nicht: Jedes wird aus seinen
// eigenen Umrissen gebaut, zusammen sind sie ein Netz. Wo ein anderes Teil davor liegt, ist ein Umriss verdeckt (blass
// gestrichelt, greifbar wie sonst).

type V = { x: number; y: number };
const teileAuto = document.getElementById('teile-auto') as HTMLInputElement;
const teileSchwelle = document.getElementById('teile-schwelle') as HTMLInputElement;
const teileWert = document.getElementById('teile-wert') as HTMLSpanElement;
const nahtKnopf = document.getElementById('naht-knopf') as HTMLButtonElement;
/** Naht ziehen: der nächste Zug in der Seite ist eine Naht */
let nahtAn = false;
/** beim Ziehen eines Umrisspunkts: die Naht, an der beim Loslassen geteilt würde */
let nahtVorschau: [V, V] | null = null;
const schwelle = (): number => Number(teileSchwelle.value);
/** Körper (−1) und alle Teile */
const alleUmrisse = (): number[] => [-1, ...zustand.teile.map((_, k) => k)];
/** Umriss in der Seite: −1 der Körper, sonst Teil k */
const umrissVon = (k: number): UmrissPunkt[] => (k < 0 ? zustand.punkte : (zustand.teile[k]?.punkte ?? []));
function umrissSetzen(k: number, p: UmrissPunkt[]): void {
  if (k < 0) zustand.punkte = p;
  else zustand.teile[k]!.punkte = p;
}
/** Mit Teilen zeigt jede Ansicht jeden Umriss für sich (nicht in der Probe `?netz` und mit gleichwertigen Ansichten) */
const mitTeilen = (): boolean => zustand.teile.length > 0 && !zustand.ansichten && !NETZ;
/** Teilen geht ohne Maul (getrennte Kiefer als Teile sind die nächste Probe), nicht in `?netz` und gleichwertigen Ansichten */
const teilenMoeglich = (): boolean => !zustand.maul && !zustand.ansichten && !NETZ;

function innenPoly(P: readonly V[], q: V): boolean {
  let drin = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i]!;
    const b = P[j]!;
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) drin = !drin;
  }
  return drin;
}

/** Liegt q mehr als tol tief im Polygon P? */
function tiefDrin(P: readonly V[], q: V, tol: number): boolean {
  if (!innenPoly(P, q)) return false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[j]!;
    const b = P[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2)) : 0;
    if (Math.hypot(a.x + t * dx - q.x, a.y + t * dy - q.y) < tol) return false;
  }
  return true;
}

/** Schnittpunkte der Geraden {achse = w} mit dem Polygon P, als Werte der anderen Koordinate, aufsteigend. */
function schnitte(P: readonly V[], achse: 'x' | 'y', w: number): number[] {
  const o = achse === 'x' ? 'y' : 'x';
  const s: number[] = [];
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i]!;
    const c = P[j]!;
    if (a[achse] > w !== c[achse] > w) s.push(a[o] + ((w - a[achse]) / (c[achse] - a[achse])) * (c[o] - a[o]));
  }
  return s.sort((u, v) => u - v);
}

/** Mitte der längsten Strecke der Geraden {achse = w} im Polygon P (null: trifft es nicht). */
function mitteIn(P: readonly V[], achse: 'x' | 'y', w: number): number | null {
  const s = schnitte(P, achse, w);
  let best = -1;
  let m: number | null = null;
  for (let i = 0; i + 1 < s.length; i += 2) {
    if (s[i + 1]! - s[i]! > best) {
      best = s[i + 1]! - s[i]!;
      m = (s[i]! + s[i + 1]!) / 2;
    }
  }
  return m;
}

/**
 * Verdeckt je Probe des Umrisses k in Ansicht b (Proben in den Koordinaten des Umrisses: Seite (x, y), Front (z, y), Top (x, z)).
 * In der Seite liegen alle Teile auf der Mittelebene: verdeckt ist, was in einem anderen Umriss liegt. In Front und Top muss das
 * andere Teil dazu näher am Betrachter sein, wie die Seite es zeigt: in der Front weiter vorn (kleineres x) als die Mitte dieses
 * Teils auf derselben Höhe, im Top höher als sie an derselben Stelle.
 */
function verdecktMarken(b: 'seite' | Blatt, k: number, proben: readonly V[], umrisse: Map<number, V[]>, seiten: Map<number, V[]>, tol: number): boolean[] {
  const eigen = seiten.get(k);
  return proben.map((q) => {
    for (const [j, P] of umrisse) {
      if (j === k || !tiefDrin(P, q, tol)) continue;
      if (b === 'seite') return true;
      const S = seiten.get(j);
      if (!S || !eigen) continue;
      if (b === 'top') {
        const mitte = mitteIn(eigen, 'x', q.x);
        const s = schnitte(S, 'x', q.x);
        if (mitte !== null && s.length > 0 && s[s.length - 1]! > mitte + tol) return true;
      } else {
        const mitte = mitteIn(eigen, 'y', q.y);
        const s = schnitte(S, 'y', q.y);
        if (mitte !== null && s.length > 0 && s[0]! < mitte - tol) return true;
      }
    }
    return false;
  });
}

/** Ein geschlossener Zug in Läufe gleicher Sicht zerlegt, je ein Pfad im Blatt. */
function laeufe(p: readonly V[], verdeckt: readonly boolean[], blatt: (q: V) => [number, number]): { d: string; verdeckt: boolean }[] {
  const n = p.length;
  if (n < 2) return [];
  // Anfang an einem Wechsel (ohne Wechsel ein geschlossener Lauf)
  let s0 = 0;
  for (let i = 0; i < n; i++) {
    if (verdeckt[i] !== verdeckt[(i + n - 1) % n]) {
      s0 = i;
      break;
    }
  }
  const aus: { d: string; verdeckt: boolean }[] = [];
  let v = verdeckt[s0]!;
  let d = `M ${blatt(p[s0]!).join(' ')}`;
  for (let m = 1; m <= n; m++) {
    const i = (s0 + m) % n;
    d += ` L ${blatt(p[i]!).join(' ')}`;
    if (m < n && verdeckt[i] !== v) {
      aus.push({ d, verdeckt: v });
      d = `M ${blatt(p[i]!).join(' ')}`;
      v = verdeckt[i]!;
    }
  }
  aus.push({ d, verdeckt: v });
  return aus;
}

/**
 * Umriss k wird an seiner Teilung zum größeren Teil, der kleinere ein neues Teil (folgt in Front und Top sich selbst). Seine
 * Linien auf der Form gehören danach dem Teil, in dem sie überwiegend liegen; Knoten zwischen Linien verschiedener Teile lösen
 * sich (die Teile verschmelzen nicht).
 */
function teilungUebernehmen(k: number, t: Teilung): void {
  umrissSetzen(k, t.koerper);
  zustand.teile.push({ punkte: t.teil, front: null, top: null });
  const neu = zustand.teile.length - 1;
  const A = umrissAbtasten(t.koerper, 3).punkte;
  const B = umrissAbtasten(t.teil, 3).punkte;
  for (const l of zustand.raum) {
    if (teilDer(l) !== k) continue;
    let a = 0;
    let b = 0;
    for (const q of raumAbtasten(l, 4).p) {
      if (innenPoly(A, q)) a++;
      if (innenPoly(B, q)) b++;
    }
    if (b > a) l.teil = neu;
  }
  const teileJeKnoten = new Map<number, Set<number>>();
  for (const l of zustand.raum) {
    for (const p of l.punkte) {
      if (p.knoten === undefined) continue;
      if (!teileJeKnoten.has(p.knoten)) teileJeKnoten.set(p.knoten, new Set());
      teileJeKnoten.get(p.knoten)!.add(teilDer(l));
    }
  }
  for (const l of zustand.raum) {
    l.punkte = l.punkte.map((p) =>
      p.knoten !== undefined && teileJeKnoten.get(p.knoten)!.size > 1 ? (p.ecke ? { x: p.x, y: p.y, z: p.z, ecke: true } : { x: p.x, y: p.y, z: p.z }) : p,
    );
  }
  auswahl = null;
}

/**
 * Teile von selbst: Ist die tiefste Einbuchtung des Umrisses k (an der noch nicht geteilt wurde) mindestens „ab“-mal so tief wie
 * breit, wird sie eine Naht; beide Teile werden danach ebenso geprüft.
 */
function teileVonSelbst(k: number): boolean {
  if (!teileAuto.checked || !teilenMoeglich()) return false;
  let geteilt = false;
  const offen = [k];
  for (let n = 0; offen.length > 0 && n < 8; n++) {
    const j = offen.pop()!;
    const t = anEinbuchtungTeilen(umrissVon(j), schwelle());
    if (!t) continue;
    teilungUebernehmen(j, t);
    offen.push(j, zustand.teile.length - 1);
    geteilt = true;
  }
  return geteilt;
}

/** Naht von Hand (Strecke a → b in der Seite): teilt den Umriss, in dem ihre Mitte liegt (den kleinsten), sonst den ersten, den sie quert. */
function nahtTeilen(a: V, b: V): boolean {
  if (!teilenMoeglich()) return false;
  const mitte = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const flaeche = (P: readonly V[]) => Math.abs(P.reduce((f, q, i) => f + q.x * P[(i + 1) % P.length]!.y - P[(i + 1) % P.length]!.x * q.y, 0)) / 2;
  const reihe = alleUmrisse()
    .map((k) => {
      const P = umrissAbtasten(umrissVon(k), 3).punkte;
      return { k, drin: innenPoly(P, mitte), f: flaeche(P) };
    })
    .sort((u, v) => Number(v.drin) - Number(u.drin) || u.f - v.f);
  for (const { k } of reihe) {
    const t = anNahtTeilen(umrissVon(k), a, b);
    if (t) {
      teilungUebernehmen(k, t);
      return true;
    }
  }
  return false;
}

/** Leiste in der Seite: Schwelle und die tiefste Einbuchtung, an der noch nicht geteilt wurde; Knopf „Naht ziehen“. */
function teileAnzeigen(): void {
  let tiefste = 0;
  if (teilenMoeglich()) for (const k of alleUmrisse()) tiefste = Math.max(tiefste, einbuchtungen(umrissVon(k))[0]?.verhaeltnis ?? 0);
  const zahl = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  teileWert.textContent = `${zahl(schwelle())} · tiefste ${zahl(tiefste)}`;
  nahtKnopf.disabled = !teilenMoeglich();
  if (nahtKnopf.disabled) nahtAn = false;
  nahtKnopf.setAttribute('aria-pressed', String(nahtAn));
  svg.classList.toggle('naht', nahtAn);
}

/** Alle Umrisse nach einer Änderung der Schwelle (oder dem Einschalten) prüfen; ein Schritt zum Rückgängigmachen. */
function teileNeuPruefen(): void {
  const vorher = kopie(zustand);
  let geteilt = false;
  for (const k of alleUmrisse()) geteilt = teileVonSelbst(k) || geteilt;
  if (geteilt) {
    merken(vorher);
    geaendert();
  }
  teileAnzeigen();
}

// ---------- Seite zeichnen ----------

const NS = 'http://www.w3.org/2000/svg';
const element = (art: string, klasse: string, attr: Record<string, string | number>): SVGElement => {
  const e = document.createElementNS(NS, art);
  e.setAttribute('class', klasse);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, String(v));
  return e;
};

/** Pfad einer gezeichneten Linie: gefüllte Fläche mit der Strichdicke je Probe, weiche Linien gestrichelt. */
function linienPfad(l: KantenLinie, s: number): { flaeche: string | null; mitte: string } {
  const { p, breite } = linieAbtasten(l, 2 / s);
  let mitte = '';
  p.forEach((q, i) => {
    mitte += `${i ? ' L' : 'M'} ${q.x} ${-q.y}`;
  });
  if (Math.max(...breite) < 0.3) return { flaeche: null, mitte };
  const links: string[] = [];
  const rechts: string[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(0, i - 1)]!;
    const b = p[Math.min(p.length - 1, i + 1)]!;
    const l2 = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / l2;
    const ny = (b.x - a.x) / l2;
    const h = Math.max(breite[i]!, 0.6) / 2 / s;
    const q = p[i]!;
    links.push(`${q.x + nx * h} ${-(q.y + ny * h)}`);
    rechts.push(`${q.x - nx * h} ${-(q.y - ny * h)}`);
  }
  return { flaeche: `M ${links.join(' L ')} L ${rechts.reverse().join(' L ')} Z`, mitte };
}

/**
 * Mit Teilen in der Seite: Trefferlinien der Teile, dann jeder Umriss sichtbar durchgezogen und verdeckt gestrichelt (in
 * `?linien` zeichnet den sichtbaren Umriss der Shader, hier nur die verdeckten Stücke).
 */
function teileInDerSeite(s: number): void {
  const zuege = new Map<number, V[]>();
  for (const k of alleUmrisse()) zuege.set(k, umrissAbtasten(umrissVon(k), 3).punkte);
  zustand.teile.forEach((t, k) => {
    const e = element('path', 'treffer', { d: umrissPfad(t.punkte, (q) => [q.x, -q.y]) });
    e.dataset.linie = '';
    e.dataset.teil = String(k);
    svg.append(e);
  });
  for (const k of alleUmrisse()) {
    const p = umrissAbtasten(umrissVon(k), Math.max(1, 2 / s)).punkte;
    const v = verdecktMarken('seite', k, p, zuege, zuege, 3 / s);
    for (const l of laeufe(p, v, (q) => [q.x, -q.y])) {
      if (l.verdeckt || !LINIEN) svg.append(element('path', l.verdeckt ? 'verdeckt' : 'linie', { d: l.d }));
    }
  }
}

function svgZeichnen(): void {
  const r = felder.seite.getBoundingClientRect();
  const s = skala();
  const w = r.width / s;
  const h = r.height / s;
  svg.setAttribute('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`);
  teileAnzeigen();
  const stuecke = umrissStuecke(zustand.punkte);
  // mit getrennten Kiefern ohne die Front des Mauls (zwischen den Anfängen der Lippen): Sie ist kein Rand der Form, nur leise
  // gezeichnet (und kein Ort für neue Punkte)
  const front = stuecke.findIndex((_, i) => istMaulFront(i));
  const reihe = front < 0 ? stuecke : [...stuecke.slice(front + 1), ...stuecke.slice(0, front)];
  let d = `M ${reihe[0]![0].x} ${-reihe[0]![0].y}`;
  for (const k of reihe) d += ` C ${k[1].x} ${-k[1].y} ${k[2].x} ${-k[2].y} ${k[3].x} ${-k[3].y}`;
  if (front < 0) d += ' Z';
  svg.replaceChildren();
  const treffer = element('path', 'treffer', { d });
  treffer.dataset.linie = '';
  // gleichwertige Ansichten: die Zeichnung farbig, der Umriss des Modells (Shader) schwarz darüber; mit `?netz` zeichnet nur
  // der Shader, die Punkte sind Griffe auf seiner Linie
  svg.append(treffer);
  if (mitTeilen()) {
    teileInDerSeite(s);
  } else if (!NETZ && !LINIEN) {
    svg.append(element('path', zustand.ansichten || posiertGezeigt() ? 'vorgabe' : 'linie', { d }));
    const k = stuecke[front];
    if (k) svg.append(element('path', 'maulfront', { d: `M ${k[0].x} ${-k[0].y} L ${k[3].x} ${-k[3].y}` }));
  }
  for (const u of zustand.ansichten?.seite ?? []) svg.append(element('path', 'vorgabe', { d: umrissPfad(u, (q) => [q.x, -q.y]) }));
  const rp = 5 / s;
  // gezeichnete Linien: Trefferband, Strich, Punkte der gewählten Linie
  zustand.linien.forEach((l, li) => {
    const { flaeche, mitte } = linienPfad(l, s);
    const t = element('path', 'treffer-kante', { d: mitte });
    t.dataset.kante = String(li);
    svg.append(t);
    if (flaeche) svg.append(element('path', 'kante', { d: flaeche }));
    else svg.append(element('path', 'kante-weich', { d: mitte }));
    const gewaehlt = auswahl !== null && (auswahl.art === 'linie' || auswahl.art === 'lpunkt') && auswahl.l === li;
    if (!gewaehlt) return;
    l.punkte.forEach((p, i) => {
      const an = auswahl?.art === 'linie' || (auswahl?.art === 'lpunkt' && auswahl.i === i);
      const e = p.ecke
        ? element('rect', an ? 'lpunkt gewaehlt' : 'lpunkt', { x: p.x - 0.8 * rp, y: -p.y - 0.8 * rp, width: 1.6 * rp, height: 1.6 * rp })
        : element('circle', an ? 'lpunkt gewaehlt' : 'lpunkt', { cx: p.x, cy: -p.y, r: 0.8 * rp });
      e.dataset.lpunkt = `${li}:${i}`;
      svg.append(e);
    });
  });
  // Maullinie: Strich und Trefferband; mit getrennten Kiefern Oberlippe (rot) und Unterlippe (blau), die gewählte obenauf (geschlossen
  // liegen sie oft aufeinander, ein Klick trifft dann sie); in der Pose beide Lippen leiser, wie sie im 3D liegen; gewählt mit
  // ihren Punkten (mit ⇧ mehrere)
  kieferAnzeigen();
  // die Punkte der gewählten Lippe kommen über die Punkte des Umrisses (ihr Anfang liegt oft auf einem)
  const lippenPunkte: SVGElement[] = [];
  if (zustand.maul) {
    const m = zustand.maul;
    const pfad = (q: readonly { x: number; y: number }[]) => q.map((r, i) => `${i ? 'L' : 'M'} ${r.x} ${-r.y}`).join(' ');
    const getrennt = !!m.unten && m.unten.length >= 2;
    const linien = getrennt ? [m.punkte, m.unten!] : [m.punkte];
    const gl = auswahl?.art === 'maul' || auswahl?.art === 'mpunkt' ? auswahl.l : -1;
    const farbe = (l: number): string => (getrennt ? (l === 0 ? ' lippe-oben' : ' lippe-unten') : '');
    for (const l of linien.map((_, k) => k).sort((a, b) => Number(a === gl) - Number(b === gl))) {
      const p = linieAbtasten({ punkte: linien[l]!.map((q) => ({ ...q, breite: LIPPE })) }, 2 / s).p;
      const t = element('path', 'treffer-kante', { d: pfad(p) });
      t.dataset.maul = String(l);
      svg.append(t);
      const fehlt = !schnitt || (l === 1 && !schnitt.unten);
      svg.append(element('path', `maul${farbe(l)}${fehlt ? ' fehlt' : ''}`, { d: pfad(p) }));
    }
    if (schnitt && posiertGezeigt()) {
      const pos = koerper.geometry.getAttribute('position')?.array as Float32Array | undefined;
      if (pos) {
        for (const lippe of [schnitt.lippeOben, schnitt.lippeUnten]) {
          const rechts = Array.from(lippe)
            .filter((v) => pos[3 * v + 2]! >= 0)
            .map((v) => ({ x: pos[3 * v]!, y: pos[3 * v + 1]! }));
          if (rechts.length > 1) svg.append(element('path', 'maul unten', { d: pfad(rechts) }));
        }
      }
    }
    const a = auswahl;
    if (!poseAn && (a?.art === 'maul' || a?.art === 'mpunkt')) {
      const punkte = linien[a.l];
      punkte?.forEach((q, i) => {
        // das Ende der Unterlippe ist der Mundwinkel der Oberlippe
        if (a.l === 1 && i === punkte.length - 1) return;
        const an = a.art === 'maul' || a.i.includes(i);
        const klasse = `lpunkt${farbe(a.l)}${an ? ' gewaehlt' : ''}`;
        const e = q.ecke
          ? element('rect', klasse, { x: q.x - 0.8 * rp, y: -q.y - 0.8 * rp, width: 1.6 * rp, height: 1.6 * rp })
          : element('circle', klasse, { cx: q.x, cy: -q.y, r: 0.8 * rp });
        e.dataset.mpunkt = `${a.l}:${i}`;
        lippenPunkte.push(e);
      });
    }
  }
  if ((zug?.art === 'zeichnen' || zug?.art === 'maul') && zug.spur.length > 1) {
    svg.append(element('path', 'entwurf', { d: zug.spur.map((q, i) => `${i ? 'L' : 'M'} ${q.x} ${-q.y}`).join(' ') }));
  }
  if (zug?.art === 'naht') svg.append(element('path', 'entwurf naht', { d: `M ${zug.a.x} ${-zug.a.y} L ${zug.b.x} ${-zug.b.y}` }));
  if (nahtVorschau) {
    const [a, b] = nahtVorschau;
    svg.append(element('path', 'naht-vorschau', { d: `M ${a.x} ${-a.y} L ${b.x} ${-b.y}` }));
  }
  if (LINIEN) raumZeichnen(svg, 'seite');
  // in der Pose wirkt nur der Pinsel: keine Punkte der Grundform
  if (poseAn) {
    pinselKreisZeichnen(svg, 'seite');
    return;
  }
  // die Anfänge der Lippen sind Punkte des Umrisses, mit getrennten Kiefern in deren Farbe
  const getrennt = !!zustand.maul?.unten;
  for (const k of alleUmrisse()) {
    umrissVon(k).forEach((p, i) => {
      const an = auswahl?.art === 'umriss' && auswahl.k === k && auswahl.i === i;
      const klasse = `punkt${getrennt && p.lippe ? ` lippe-${p.lippe}` : ''}${an ? ' gewaehlt' : ''}`;
      const e = p.ecke
        ? element('rect', klasse, { x: p.x - rp, y: -p.y - rp, width: 2 * rp, height: 2 * rp })
        : element('circle', klasse, { cx: p.x, cy: -p.y, r: rp });
      e.dataset.punkt = String(i);
      if (k >= 0) e.dataset.teil = String(k);
      svg.append(e);
    });
  }
  svg.append(...lippenPunkte);
}

const welt = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
  const r = felder.seite.getBoundingClientRect();
  const s = skala();
  return { x: (e.clientX - r.left - r.width / 2) / s, y: -(e.clientY - r.top - r.height / 2) / s };
};

/** Nächste Stelle auf dem Umriss des Körpers (oder Teils t): Stück i und der Punkt darauf. */
function naechsteStelle(q: { x: number; y: number }, t = -1): { i: number; x: number; y: number } {
  let best = Infinity;
  let bi = 0;
  let bx = 0;
  let by = 0;
  umrissStuecke(umrissVon(t)).forEach((k, i) => {
    // die Front des Mauls bekommt keine Punkte (die Anfänge der Lippen bleiben Nachbarn)
    if (t < 0 && istMaulFront(i)) return;
    for (let j = 1; j < 40; j++) {
      const t = j / 40;
      const u = 1 - t;
      const x = u * u * u * k[0].x + 3 * u * u * t * k[1].x + 3 * u * t * t * k[2].x + t * t * t * k[3].x;
      const y = u * u * u * k[0].y + 3 * u * u * t * k[1].y + 3 * u * t * t * k[2].y + t * t * t * k[3].y;
      const d = Math.hypot(x - q.x, y - q.y);
      if (d < best) {
        best = d;
        bi = i;
        bx = x;
        by = y;
      }
    }
  });
  return { i: bi, x: bx, y: by };
}

/** Liegt der Punkt im gezeichneten Umriss (des Körpers oder eines Teils)? */
function imUmriss(q: { x: number; y: number }): boolean {
  return alleUmrisse().some((k) => innenPoly(umrissAbtasten(umrissVon(k), 3).punkte, q));
}

/** Freihand-Spur auf wenige Punkte (Ramer–Douglas–Peucker). */
function vereinfachen(p: readonly { x: number; y: number }[], tol: number): { x: number; y: number }[] {
  if (p.length < 3) return [...p];
  const a = p[0]!;
  const b = p[p.length - 1]!;
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let best = -1;
  let bi = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const q = p[i]!;
    const d = Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / l;
    if (d > best) {
      best = d;
      bi = i;
    }
  }
  if (best <= tol) return [a, b];
  return [...vereinfachen(p.slice(0, bi + 1), tol).slice(0, -1), ...vereinfachen(p.slice(bi), tol)];
}

function geaendert(fein = true): void {
  maulKnotenSichern();
  svgZeichnen();
  profileZeichnen();
  bauGewuenscht = fein ? 'fein' : 'grob';
}

function umrissEcke(k: number, i: number): void {
  merken(kopie(zustand));
  umrissSetzen(
    k,
    umrissVon(k).map((p, j) => (j === i ? { ...p, ecke: !p.ecke } : p)),
  );
  geaendert();
}

function linienEcke(l: number, i: number): void {
  merken(kopie(zustand));
  const p = zustand.linien[l]!.punkte[i]!;
  zustand.linien[l]!.punkte[i] = { ...p, ecke: !p.ecke };
  geaendert();
}

/** Die Punkte einer Maullinie (0: Maullinie bzw. Oberlippe, 1: Unterlippe bei getrennten Kiefern) */
const maulPunkte = (l: number): MaulPunkt[] | undefined => (l === 1 ? zustand.maul?.unten : zustand.maul?.punkte);
const ohneBreite = (q: MaulPunkt): MaulPunkt => (q.ecke ? { x: q.x, y: q.y, ecke: true } : { x: q.x, y: q.y });

/**
 * Kiefer trennen: Die Maullinie wird die Oberlippe, die Unterlippe eine eigene Linie, zuerst an derselben Stelle und etwas
 * schmaler (geschlossen liegt sie so innen); jede bewegt ab jetzt ihren Kiefer. Wieder zusammen: Die Oberlippe bleibt die
 * Maullinie, ohne Breiten.
 */
function kieferUmschalten(): void {
  const m = zustand.maul;
  if (!m) return;
  merken(kopie(zustand));
  if (m.unten) {
    m.unten = undefined;
    m.punkte = m.punkte.map(ohneBreite);
    auswahl = { art: 'maul', l: 0 };
  } else {
    // eine Linie aus zwei Punkten ist gerade: ihre Mitte dazu ändert nichts und gibt der Breite einen Griff
    if (m.punkte.length === 2) {
      const a = m.punkte[0]!;
      const e = m.punkte[1]!;
      m.punkte.splice(1, 0, { x: (a.x + e.x) / 2, y: (a.y + e.y) / 2 });
    }
    m.unten = m.punkte.map((q, i, alle) => (i === 0 || i === alle.length - 1 ? ohneBreite(q) : { ...ohneBreite(q), b: UNTEN_SCHMAL }));
    auswahl = { art: 'maul', l: 1 };
  }
  geaendert();
}

function maulEcke(l: number, i: number): void {
  const p = maulPunkte(l);
  if (!p?.[i]) return;
  merken(kopie(zustand));
  p[i] = { ...p[i], ecke: !p[i].ecke };
  geaendert();
}

/** Die Stelle einer Maullinie, die q am nächsten liegt: Stück i (Punkt i → i + 1) und der Punkt dort. */
function maulStelle(punkte: readonly UmrissPunkt[], q: { x: number; y: number }): { i: number; x: number; y: number } {
  let best = Infinity;
  let r = { i: 0, x: q.x, y: q.y };
  linienStuecke(punkte).forEach((k, i) => {
    for (let j = 1; j < 40; j++) {
      const t = j / 40;
      const u = 1 - t;
      const x = u * u * u * k[0].x + 3 * u * u * t * k[1].x + 3 * u * t * t * k[2].x + t * t * t * k[3].x;
      const y = u * u * u * k[0].y + 3 * u * u * t * k[1].y + 3 * u * t * t * k[2].y + t * t * t * k[3].y;
      const d = Math.hypot(x - q.x, y - q.y);
      if (d < best) {
        best = d;
        r = { i, x, y };
      }
    }
  });
  return r;
}

/**
 * Eine Spur von außen in die Form → Maullinie: Sie beginnt, wo die Spur zuletzt über den Umriss hinein ging, und endet am
 * Mundwinkel (dem Ende der Spur, innen); dazwischen wenige Punkte. Null, wenn die Spur nicht innen endet oder zu kurz ist.
 */
function maulAusSpur(spur: readonly { x: number; y: number }[]): MaulLinie | null {
  const poly = umrissAbtasten(zustand.punkte, 2).punkte;
  const drin = (q: { x: number; y: number }): boolean => {
    let innen = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]!;
      const b = poly[j]!;
      if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) innen = !innen;
    }
    return innen;
  };
  const innen = spur.map(drin);
  if (!innen[innen.length - 1]) return null;
  let k = innen.length - 1;
  while (k > 0 && innen[k - 1]) k--;
  if (k === 0) return null;
  // genau auf den Umriss: zwischen dem letzten Punkt außen und dem ersten innen halbieren
  let a = spur[k - 1]!;
  let b = spur[k]!;
  for (let i = 0; i < 24; i++) {
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (drin(m)) b = m;
    else a = m;
  }
  const anfang = naechsterAufUmriss(b.x, b.y);
  const rest = spur.slice(k);
  let laenge = 0;
  let vorher = anfang;
  for (const q of rest) {
    laenge += Math.hypot(q.x - vorher.x, q.y - vorher.y);
    vorher = q;
  }
  if (laenge * skala() < 20) return null;
  const punkte = vereinfachen([anfang, ...rest], 3 / skala());
  return { punkte: punkte.map((q) => ({ x: q.x, y: q.y })) };
}

/** Strichdicke der Auswahl ändern (ganze Linie oder ein Punkt). */
function breiteSetzen(f: (b: number) => number): void {
  if (!auswahl || auswahl.art === 'umriss' || auswahl.art === 'profil' || auswahl.art === 'maul' || auswahl.art === 'mpunkt') return;
  if (auswahl.art === 'raum' || auswahl.art === 'rpunkt') {
    // Linie auf der Form: Strich der ganzen Linie (die Form selbst bleibt noch rund, gezeichnet wird er wie bei den Kanten)
    merken(kopie(zustand));
    const r = zustand.raum[auswahl.l]!;
    r.breite = Math.max(0, Math.min(BREITE_MAX, f(r.breite)));
    geaendert();
    return;
  }
  merken(kopie(zustand));
  const l = zustand.linien[auswahl.l]!;
  const a = auswahl;
  l.punkte = l.punkte.map((p, i) => (a.art === 'linie' || a.i === i ? { ...p, breite: Math.max(0, Math.min(BREITE_MAX, f(p.breite))) } : p));
  geaendert();
}

type Zug =
  | { art: 'umriss'; k: number; i: number; vorher: Zustand; bewegt: boolean }
  // Naht von Hand: eine gerade Strecke quer durch die Form
  | { art: 'naht'; a: { x: number; y: number }; b: { x: number; y: number }; vorher: Zustand }
  // Punkt einer Linie auf der Form (`?linien`); die Seite bewegt x und y
  | { art: 'raum'; l: number; i: number; vorher: Zustand; bewegt: boolean }
  // zEnde: Tiefe des Punkts zu Beginn (gestreckt, wie Front und Top sie zeigen); die Seite bewegt nur x und y
  | { art: 'lpunkt'; l: number; i: number; vorher: Zustand; bewegt: boolean; zEnde: number | null }
  | { art: 'zeichnen'; spur: { x: number; y: number }[]; vorher: Zustand }
  // von außen über den Umriss in die Form: die Maullinie
  | { art: 'maul'; spur: { x: number; y: number }[]; vorher: Zustand }
  // Punkte einer Maullinie, gemeinsam gezogen (ein Anfang gleitet auf dem Umriss); start: Zeiger und Lagen beim Druck
  | { art: 'mpunkt'; l: number; i: number[]; start: { x: number; y: number }; lagen: { x: number; y: number }[]; vorher: Zustand; bewegt: boolean };
let zug: Zug | null = null;
// Doppelklick selbst zählen: die Punkte werden beim Drücken neu gezeichnet, das dblclick-Ziel ist dann weg
let letzterKlick: { schluessel: string; t: number } | null = null;
const doppelklick = (schluessel: string): boolean => {
  const jetzt = performance.now();
  const doppelt = letzterKlick !== null && letzterKlick.schluessel === schluessel && jetzt - letzterKlick.t < 400;
  letzterKlick = doppelt ? null : { schluessel, t: jetzt };
  return doppelt;
};

// ---------- Pose: Pinsel ----------
// In der Pose zieht ein Druck auf die Form in einem Blatt die Form dort weich mit (ein Zug des Blendshapes): die Seite bewegt
// x und y, die Front y und z, das Top x und z. Der Zug liegt vor den Knochen: seine Mitte ist der getroffene Punkt in der Lage
// vor den Knochen, die Verschiebung um den Drehwinkel der Stelle zurückgedreht. Spiegelgleich (gespeichert auf der Seite
// z ≥ 0). Radius mit [ und ].
let pinselHoehe = 300;
let pinselRadius: number | null = null;
const radius = (): number => pinselRadius ?? 0.22 * pinselHoehe;
const strahl = new Raycaster();
type PinselZug = { blatt: 'seite' | Blatt; start: [number, number]; index: number; alpha: number; spiegel: boolean; vorher: Zustand; bewegt: boolean };
let pinsel: PinselZug | null = null;
/** wo der Zeiger in der Pose steht (für den Kreis des Pinsels) */
let pinselZeiger: { blatt: 'seite' | Blatt; x: number; y: number } | null = null;
const pinselKreise: Partial<Record<'seite' | Blatt, SVGElement>> = {};

function pinselStart(b: 'seite' | Blatt, e: PointerEvent): boolean {
  const kamera = b === 'seite' ? kameras.seite : kameras[b];
  const r = felder[b].getBoundingClientRect();
  strahl.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)), kamera);
  // die Form oder, durch das offene Maul, das Maulinnere
  const s = schnitt;
  const t = strahl.intersectObjects(s ? [koerper, maulInnen] : [koerper], false)[0];
  if (!t || !t.face) return false;
  const innen = t.object === maulInnen;
  const pos = (innen ? maulInnen : koerper).geometry.getAttribute('position').array as Float32Array;
  const vor = innen ? innenVorKnochen : vorKnochen;
  const ecken = [t.face.a, t.face.b, t.face.c] as const;
  const P = (v: number) => new Vector3(pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!);
  const bary = new Vector3();
  Triangle.getBarycoord(t.point, P(ecken[0]), P(ecken[1]), P(ecken[2]), bary);
  const g = [bary.x, bary.y, bary.z];
  const mitte = [0, 1, 2].map((i) => ecken.reduce((sum, v, k) => sum + g[k]! * vor[3 * v + i]!, 0)) as [number, number, number];
  const alpha = s ? ecken.reduce((sum, v, k) => sum + g[k]! * poseWinkel(s, zustand.pose, v, innen), 0) : 0;
  const vorher = kopie(zustand);
  const spiegel = mitte[2] < 0;
  zustand.pose.zuege.push({ c: [mitte[0], mitte[1], Math.abs(mitte[2])], d: [0, 0, 0], r: radius() });
  pinsel = { blatt: b, start: [e.clientX, e.clientY], index: zustand.pose.zuege.length - 1, alpha, spiegel, vorher, bewegt: false };
  return true;
}

function pinselZiehen(e: PointerEvent): void {
  const p = pinsel;
  const zg = p ? zustand.pose.zuege[p.index] : undefined;
  if (!p || !zg) return;
  const s = skala();
  const dxs = (e.clientX - p.start[0]) / s;
  const dys = (e.clientY - p.start[1]) / s;
  // Blatt → Welt: Seite (x, −y), Front (z, −y), Top (x, z)
  const w = p.blatt === 'seite' ? [dxs, -dys, 0] : p.blatt === 'front' ? [0, -dys, dxs] : [dxs, 0, dys];
  // vor die Knochen: um den Drehwinkel der Stelle zurückdrehen
  const c = Math.cos(p.alpha);
  const sn = Math.sin(p.alpha);
  let d: [number, number, number] = [c * w[0]! + sn * w[1]!, -sn * w[0]! + c * w[1]!, p.spiegel ? -w[2]! : w[2]!];
  const l = Math.hypot(...d);
  const max = ZUG_MAX * zg.r;
  if (l > max) d = [(d[0] * max) / l, (d[1] * max) / l, (d[2] * max) / l];
  if (!p.bewegt) {
    merken(p.vorher);
    p.bewegt = true;
  }
  zg.d = d;
  poseAnwenden();
  svgZeichnen();
}

function pinselEnde(): void {
  const p = pinsel;
  pinsel = null;
  // nur geklickt: kein Zug
  if (p && !p.bewegt) zustand.pose.zuege.splice(p.index, 1);
  if (window.__form) window.__form.pose = { an: poseAn, ...kopie(zustand).pose };
  svgZeichnen();
  profileZeichnen();
}

/** Kreis des Pinsels im Blatt (Radius in Welteinheiten wie das Blatt) */
function pinselKreisZeichnen(el: SVGSVGElement, b: 'seite' | Blatt): void {
  const k = element('circle', 'pinsel', { cx: 0, cy: 0, r: radius() });
  pinselKreise[b] = k;
  if (pinselZeiger?.blatt === b) {
    k.setAttribute('cx', String(pinselZeiger.x));
    k.setAttribute('cy', String(pinselZeiger.y));
  } else {
    k.setAttribute('visibility', 'hidden');
  }
  el.append(k);
}

function pinselZeigen(b: 'seite' | Blatt, e: PointerEvent): void {
  const [x, y] = blattPunkt(b, e);
  pinselZeiger = { blatt: b, x, y };
  for (const [name, k] of Object.entries(pinselKreise)) {
    if (!k) continue;
    if (name === b) {
      k.setAttribute('cx', String(x));
      k.setAttribute('cy', String(y));
      k.setAttribute('r', String(radius()));
      k.removeAttribute('visibility');
    } else {
      k.setAttribute('visibility', 'hidden');
    }
  }
}

svg.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  // in der Pose: Pinsel statt Zeichnen
  if (poseAn) {
    if (pinselStart('seite', e)) svg.setPointerCapture(e.pointerId);
    return;
  }
  const d = (e.target as SVGElement).dataset;
  // Teil des Punkts oder der Linie unter dem Zeiger (−1: der Körper)
  const teil = d.teil !== undefined ? Number(d.teil) : -1;
  if (nahtAn) {
    // Naht ziehen: eine Strecke, beim Loslassen wird geteilt
    const q = welt(e);
    zug = { art: 'naht', a: q, b: q, vorher: kopie(zustand) };
  } else if (d.punkt !== undefined) {
    const i = Number(d.punkt);
    auswahl = { art: 'umriss', k: teil, i };
    fuehrt('seite');
    if (doppelklick(`u${teil}:${i}`) || e.altKey) {
      umrissEcke(teil, i);
      return;
    }
    zug = { art: 'umriss', k: teil, i, vorher: kopie(zustand), bewegt: false };
  } else if (d.rpunkt !== undefined) {
    const [l, i] = d.rpunkt.split(':').map(Number) as [number, number];
    auswahl = { art: 'rpunkt', l, i };
    if (doppelklick(`r${l}:${i}`) || e.altKey) {
      raumEcke(l, i);
      return;
    }
    zug = { art: 'raum', l, i, vorher: kopie(zustand), bewegt: false };
  } else if (d.raum !== undefined) {
    // Klick auf eine Linie auf der Form: dort ein neuer Punkt, gleich ziehen
    const l = Number(d.raum);
    const vorher = kopie(zustand);
    const i = raumEinfuegen(l, 'seite', ...blattPunkt('seite', e));
    merken(vorher);
    auswahl = { art: 'rpunkt', l, i };
    zug = { art: 'raum', l, i, vorher: kopie(zustand), bewegt: true };
    bauGewuenscht = 'fein';
  } else if (d.mpunkt !== undefined) {
    const [l, i] = d.mpunkt.split(':').map(Number) as [number, number];
    // ⇧: zur Auswahl hinzu oder heraus; sonst dieser Punkt (oder, wenn er schon gewählt ist, alle gewählten)
    const vorher = auswahl?.art === 'mpunkt' && auswahl.l === l ? auswahl.i : [];
    const liste = e.shiftKey
      ? vorher.includes(i)
        ? vorher.filter((j) => j !== i)
        : [...vorher, i]
      : vorher.includes(i)
        ? vorher
        : [i];
    auswahl = { art: 'mpunkt', l, i: liste };
    if (!e.shiftKey && (doppelklick(`m${l}:${i}`) || e.altKey)) {
      maulEcke(l, i);
      return;
    }
    const punkte = maulPunkte(l) ?? [];
    if (liste.length > 0) {
      zug = {
        art: 'mpunkt',
        l,
        i: liste,
        start: welt(e),
        lagen: liste.map((j) => ({ x: punkte[j]!.x, y: punkte[j]!.y })),
        vorher: kopie(zustand),
        bewegt: false,
      };
    }
  } else if (d.maul !== undefined) {
    const l = Number(d.maul);
    const punkte = maulPunkte(l);
    if (punkte && (auswahl?.art === 'maul' || auswahl?.art === 'mpunkt') && auswahl.l === l) {
      // Klick auf die gewählte Linie: dort ein neuer Punkt, gleich ziehen
      const vorher = kopie(zustand);
      const q = welt(e);
      const st = maulStelle(punkte, q);
      punkte.splice(st.i + 1, 0, { x: st.x, y: st.y });
      merken(vorher);
      auswahl = { art: 'mpunkt', l, i: [st.i + 1] };
      zug = { art: 'mpunkt', l, i: [st.i + 1], start: q, lagen: [{ x: st.x, y: st.y }], vorher: kopie(zustand), bewegt: true };
      bauGewuenscht = 'fein';
    } else {
      auswahl = { art: 'maul', l };
    }
  } else if (d.lpunkt !== undefined) {
    const [l, i] = d.lpunkt.split(':').map(Number) as [number, number];
    auswahl = { art: 'lpunkt', l, i };
    if (doppelklick(`l${l}:${i}`) || e.altKey) {
      linienEcke(l, i);
      return;
    }
    zug = { art: 'lpunkt', l, i, vorher: kopie(zustand), bewegt: false, zEnde: linienTiefe(l, i) };
  } else if (d.kante !== undefined) {
    auswahl = { art: 'linie', l: Number(d.kante) };
  } else if (d.linie !== undefined) {
    const vorher = kopie(zustand);
    fuehrt('seite');
    const st = naechsteStelle(welt(e), teil);
    umrissVon(teil).splice(st.i + 1, 0, { x: st.x, y: st.y });
    merken(vorher);
    auswahl = { art: 'umriss', k: teil, i: st.i + 1 };
    zug = { art: 'umriss', k: teil, i: st.i + 1, vorher: kopie(zustand), bewegt: true };
    bauGewuenscht = 'fein';
  } else {
    const q = welt(e);
    auswahl = null;
    // auf der Form zeichnen: eine neue Linie; von außen über den Umriss hinein: die Maullinie. Mit Teilen beides noch nicht
    // (Linien und Maul wirken dort noch nicht; getrennte Kiefer als Teile sind die nächste Probe)
    if (mitTeilen()) zug = null;
    else if (imUmriss(q)) zug = { art: 'zeichnen', spur: [q], vorher: kopie(zustand) };
    else zug = { art: 'maul', spur: [q], vorher: kopie(zustand) };
  }
  svg.setPointerCapture(e.pointerId);
  svgZeichnen();
});

svg.addEventListener('pointermove', (e) => {
  if (pinsel) {
    pinselZiehen(e);
    return;
  }
  if (poseAn) {
    pinselZeigen('seite', e);
    return;
  }
  if (!zug) return;
  const w = welt(e);
  if (zug.art === 'naht') {
    zug.b = w;
    svgZeichnen();
    return;
  }
  if (zug.art === 'zeichnen' || zug.art === 'maul') {
    const l = zug.spur[zug.spur.length - 1]!;
    if (Math.hypot(w.x - l.x, w.y - l.y) * skala() >= 3) {
      zug.spur.push(w);
      svgZeichnen();
    }
    return;
  }
  if (!zug.bewegt) {
    merken(zug.vorher);
    zug.bewegt = true;
    letzterKlick = null;
  }
  if (zug.art === 'umriss') {
    const u = umrissVon(zug.k);
    const p = u[zug.i]!;
    u[zug.i] = { ...p, x: w.x, y: w.y };
    koppeln('seite', zug.i, zug.k);
    // die Naht zeigen, sobald die Einbuchtung tief genug ist (geteilt wird beim Loslassen)
    nahtVorschau = teileAuto.checked && teilenMoeglich() ? (anEinbuchtungTeilen(u, schwelle())?.naht ?? null) : null;
  } else if (zug.art === 'raum') {
    // die Seite bewegt x und y, die Tiefe bleibt; ein Knoten zieht die andere Linie mit
    const p = zustand.raum[zug.l]!.punkte[zug.i]!;
    punktSetzen(zustand.raum, zug.l, zug.i, { x: w.x, y: w.y, z: p.z });
  } else if (zug.art === 'mpunkt') {
    const punkte = maulPunkte(zug.l);
    if (!punkte) return;
    // alle gewählten Punkte um dieselbe Strecke; ein Anfang ist ein Punkt des Umrisses und zieht ihn mit
    const zm = zug;
    const dx = w.x - zm.start.x;
    const dy = w.y - zm.start.y;
    zm.i.forEach((j, k) => {
      const p = punkte[j];
      if (!p) return;
      const z0 = zm.lagen[k]!;
      const q = { x: z0.x + dx, y: z0.y + dy };
      punkte[j] = { ...p, x: q.x, y: q.y };
      if (j === 0) anfangZiehen(zm.l, q);
      // der Mundwinkel gehört beiden Lippen
      const u = zustand.maul?.unten;
      if (zm.l === 0 && j === punkte.length - 1 && u) u[u.length - 1] = { ...u[u.length - 1]!, x: q.x, y: q.y };
    });
  } else {
    const l = zustand.linien[zug.l]!;
    const p = l.punkte[zug.i]!;
    // die Tiefe bleibt (in Front und Top steht der Punkt still in z), die Form wächst zu ihm, wo er sie verlässt
    l.punkte[zug.i] =
      zug.zEnde === null ? { ...p, x: w.x, y: w.y } : { ...p, x: w.x, y: w.y, z: zug.zEnde / streckungBei(letzteTiefe, w.x, w.y) };
  }
  geaendert(false);
});

const zugEnde = (): void => {
  if (pinsel) {
    pinselEnde();
    return;
  }
  if (zug?.art === 'naht') {
    // eine Naht quer durch die Form teilt sie (ein Schritt zum Rückgängigmachen); danach ist Naht ziehen wieder aus
    const z = zug;
    zug = null;
    if (Math.hypot(z.b.x - z.a.x, z.b.y - z.a.y) * skala() >= 12 && nahtTeilen(z.a, z.b)) {
      merken(z.vorher);
      bauGewuenscht = 'fein';
    }
    nahtAn = false;
    svgZeichnen();
    profileZeichnen();
    return;
  }
  if (zug?.art === 'maul') {
    const neu = maulAusSpur(zug.spur);
    if (neu) {
      merken(zug.vorher);
      // ein neues Maul (getrennt wird mit dem Knopf „Kiefer trennen“); sein Anfang wird ein Punkt des Umrisses
      lippenLoesen();
      zustand.maul = neu;
      auswahl = { art: 'maul', l: 0 };
      bauGewuenscht = 'fein';
    }
    zug = null;
    svgZeichnen();
    return;
  }
  if (zug?.art === 'zeichnen') {
    const spur = zug.spur;
    let laenge = 0;
    for (let i = 1; i < spur.length; i++) laenge += Math.hypot(spur[i]!.x - spur[i - 1]!.x, spur[i]!.y - spur[i - 1]!.y);
    if (laenge * skala() >= 12) {
      const punkte = vereinfachen(spur, 3 / skala()).map((q) => ({ x: q.x, y: q.y, breite: BREITE_NEU }));
      merken(zug.vorher);
      // die Linie bleibt an Ort und Stelle: auf dem Körper, auf dem sie gezeichnet wurde
      zustand.linien.push({ punkte, bezug: zustand.punkte.map((q) => ({ ...q })) });
      auswahl = { art: 'linie', l: zustand.linien.length - 1 };
      bauGewuenscht = 'fein';
    }
    zug = null;
    svgZeichnen();
    return;
  }
  // ein gezogener Umriss: ist eine Einbuchtung jetzt tief genug, wird sie eine Naht (Rückgängig nimmt den Zug mit)
  nahtVorschau = null;
  if (zug?.art === 'umriss' && zug.bewegt && teileVonSelbst(zug.k)) {
    svgZeichnen();
    profileZeichnen();
  }
  if (zug?.bewegt) bauGewuenscht = 'fein';
  zug = null;
};
svg.addEventListener('pointerup', zugEnde);
svg.addEventListener('pointercancel', zugEnde);

// ---------- Front und Top ----------
// Halbe Umrisse auf der Seite z ≥ 0 (Front rechts, Top unten), gespiegelt geschlossen. Florian setzt und zieht Punkte wie in
// der Seite; Anfang und Ende gleiten auf der Mittelachse. Solange er eine Ansicht nicht anfasst, folgt sie dem Körper (nur
// Punkte auf dem Umriss des Shaders); der erste Griff übernimmt sie.

/** (längs, quer) → Blatt (SVG, y nach unten): Front zeigt z nach rechts und y nach oben, Top x nach rechts und z nach unten */
const zuBlatt = (b: Blatt, l: number, q: number): [number, number] => (b === 'front' ? [q, -l] : [l, q]);
const ausBlatt = (b: Blatt, x: number, y: number): [number, number] => (b === 'front' ? [-y, x] : [x, y]);
/** (längs, quer) ↔ Punkt des halben Umrisses: Front x = quer (z), y = längs (y); Top x = längs (x), y = quer (z) */
function halbPunkt(b: Blatt, l: number, q: number): { x: number; y: number } {
  return b === 'front' ? { x: q, y: l } : { x: l, y: q };
}
function laengsQuer(b: Blatt, p: { x: number; y: number }): [number, number] {
  return b === 'front' ? [p.y, p.x] : [p.x, p.y];
}
/** halber Umriss → geschlossen, an der Mittelachse gespiegelt */
function ganz(b: Blatt, h: readonly UmrissPunkt[]): UmrissPunkt[] {
  return ganzerUmriss(h, b === 'front' ? 'x' : 'y');
}
/** Front oder Top des Körpers (k = −1) oder von Teil k: gezeichnet, sonst wie sie ihm folgt */
const profilVon = (b: Blatt, k = -1): UmrissPunkt[] | null =>
  k < 0 ? (zustand[b] ?? abgeleitet[b]) : (zustand.teile[k]?.[b] ?? abgeleitetTeile[k]?.[b] ?? null);

/** Zeiger im Blatt → (längs, quer) in Welt-Einheiten */
const profilWelt = (b: Blatt, e: { clientX: number; clientY: number }): [number, number] => {
  const r = felder[b].getBoundingClientRect();
  const s = skala();
  return ausBlatt(b, (e.clientX - r.left - r.width / 2) / s, (e.clientY - r.top - r.height / 2) / s);
};

/**
 * Die Ansicht zum Bearbeiten: folgt sie noch dem Körper, wird sie jetzt übernommen (mit `?netz` Front und Top zugleich — beide
 * zeigen ab dann das Mesh und werden ihm nachgeführt).
 */
function profilFesthalten(b: Blatt, k = -1): UmrissPunkt[] | null {
  if (k >= 0) {
    const t = zustand.teile[k];
    const a = abgeleitetTeile[k]?.[b];
    if (!t) return null;
    if (!t[b] && a) t[b] = a.map((q) => ({ ...q }));
    return t[b];
  }
  for (const c of NETZ ? (['front', 'top'] as const) : [b]) {
    const a = abgeleitet[c];
    if (!zustand[c] && a) zustand[c] = a.map((q) => ({ ...q }));
  }
  return zustand[b];
}

/** Ausdehnung eines geschlossenen Umrisses in einer seiner Koordinaten */
function ausdehnung(u: readonly UmrissPunkt[], k: 'x' | 'y'): { lo: number; hi: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const q of umrissAbtasten(u, 1).punkte) {
    lo = Math.min(lo, q[k]);
    hi = Math.max(hi, q[k]);
  }
  return { lo, hi };
}

/**
 * Was zwei Ansichten gemeinsam zeigen, bleibt gleich groß: die Höhe in Seite und Front, die Länge in Seite und Top, die Breite
 * in Front und Top. Zieht Florian einen Punkt, der in seiner Ansicht ganz außen liegt, folgt in der anderen deren äußerster
 * Punkt — nur wenn sie gezeichnet ist (sonst folgt sie ohnehin dem Körper) und es dort genau einen gibt (an vier gleich tiefen
 * Füßen wäre die Wahl geraten und zöge ein Bein hoch). Ein Teil (k ≥ 0) koppelt nur seine eigenen Ansichten.
 */
function koppeln(quelle: 'seite' | Blatt, i: number, k = -1): void {
  // mit `?netz` folgen die anderen Ansichten dem Mesh selbst
  if (NETZ) return;
  const teil = k >= 0 ? zustand.teile[k] : undefined;
  const liste = (v: 'seite' | Blatt): UmrissPunkt[] | null =>
    teil ? (v === 'seite' ? teil.punkte : teil[v]) : v === 'seite' ? zustand.punkte : zustand[v];
  type Achse = ['seite' | Blatt, 'x' | 'y'];
  // gemeinsame Achsen; die Breite z nur nach außen (innen liegt die Mittelachse)
  const paare: [Achse, Achse, boolean][] = [
    [['seite', 'y'], ['front', 'y'], true],
    [['seite', 'x'], ['top', 'x'], true],
    [['front', 'x'], ['top', 'y'], false],
  ];
  const u = liste(quelle);
  const p = u?.[i];
  if (!u || !p) return;
  for (const [a, b, beide] of paare) {
    const [von, nach] = a[0] === quelle ? [a, b] : b[0] === quelle ? [b, a] : [null, null];
    if (!von || !nach) continue;
    const ziel = liste(nach[0]);
    if (!ziel || ziel.length === 0) continue;
    const k = von[1];
    const kz = nach[1];
    for (const s of beide ? ([1, -1] as const) : ([1] as const)) {
      // liegt der gezogene Punkt in seiner Ansicht ganz außen?
      if (u.some((q, j) => j !== i && s * q[k] > s * p[k])) continue;
      let best = 0;
      for (let j = 1; j < ziel.length; j++) if (s * ziel[j]![kz] > s * ziel[best]![kz]) best = j;
      if (ziel.some((q, j) => j !== best && Math.abs(q[kz] - ziel[best]![kz]) < 1)) continue;
      ziel[best] = { ...ziel[best]!, [kz]: p[k] };
    }
  }
}

/** Nächste Stelle auf der gezeichneten Hälfte (ein Klick auf die Spiegelhälfte zählt für sie): Stück i und (längs, quer). */
function profilStelle(b: Blatt, [l, q]: [number, number], k = -1): { i: number; l: number; q: number } | null {
  const h = profilVon(b, k);
  if (!h || h.length < 2) return null;
  const stuecke = umrissStuecke(ganz(b, h));
  const qa = Math.abs(q);
  let best = Infinity;
  let st = { i: 0, l: 0, q: 0 };
  for (let i = 0; i < h.length - 1; i++) {
    for (let j = 1; j < 40; j++) {
      const [pl, pq] = laengsQuer(b, punktAufStueck(stuecke[i]!, j / 40));
      const d = Math.hypot(pl - l, pq - qa);
      if (d < best) {
        best = d;
        st = { i, l: pl, q: Math.max(0, pq) };
      }
    }
  }
  return st;
}

/** Raumpunkt → Blatt (SVG, y nach unten): Seite (x, −y), Front (z, −y), Top (x, z). */
const raumImBlatt = (b: 'seite' | Blatt, p: { x: number; y: number; z: number }): [number, number] =>
  b === 'seite' ? [p.x, -p.y] : b === 'front' ? [p.z, -p.y] : [p.x, p.z];

/**
 * Linien auf der Form in einem Blatt (`?linien`): Trefferband (in Front und Top auch die Spiegelhälfte), die Punkte der Hälfte
 * z ≥ 0 — auch verdeckte, sie sind greifbar. Anfang und Ende liegen auf dem Umriss der Seite und gehen mit ihm.
 */
function raumZeichnen(el: SVGSVGElement, b: 'seite' | Blatt): void {
  const rp = 5 / skala();
  zustand.raum.forEach((l, li) => {
    const { p } = raumAbtasten(l, 2);
    const haelften = b === 'seite' ? [p] : [p, p.map((q) => ({ ...q, z: -q.z }))];
    for (const h of haelften) {
      const t = element('path', 'treffer-kante', { d: h.map((q, i) => `${i ? 'L' : 'M'} ${raumImBlatt(b, q).join(' ')}`).join(' ') });
      t.dataset.raum = String(li);
      el.append(t);
    }
    const gewaehlt = (auswahl?.art === 'raum' || auswahl?.art === 'rpunkt') && auswahl.l === li;
    l.punkte.forEach((q, i) => {
      const [x, y] = raumImBlatt(b, q);
      const ende = i === 0 || i === l.punkte.length - 1;
      const an = gewaehlt && (auswahl?.art === 'raum' || (auswahl?.art === 'rpunkt' && auswahl.i === i));
      const klasse = `rpunkt${an ? ' gewaehlt' : ''}${ende ? ' ende' : ''}${q.knoten !== undefined ? ' knoten' : ''}`;
      const r = ende ? 0.55 * rp : 0.85 * rp;
      const e = q.ecke ? element('rect', klasse, { x: x - r, y: y - r, width: 2 * r, height: 2 * r }) : element('circle', klasse, { cx: x, cy: y, r });
      if (!ende) e.dataset.rpunkt = `${li}:${i}`;
      el.append(e);
    });
  });
}

/** Zeiger → Koordinaten eines Blatts (SVG, Ursprung in der Mitte, y nach unten). */
const blattPunkt = (b: 'seite' | Blatt, e: { clientX: number; clientY: number }): [number, number] => {
  const r = felder[b].getBoundingClientRect();
  const s = skala();
  return [(e.clientX - r.left - r.width / 2) / s, (e.clientY - r.top - r.height / 2) / s];
};

/**
 * Ein Punkt auf Linie l an der Stelle, die dem Zeiger im Blatt am nächsten liegt (in Front und Top zählt auch die Spiegelhälfte);
 * liegt dort schon ein Punkt, wird er genommen. Gibt seine Nummer zurück.
 */
function raumEinfuegen(l: number, b: 'seite' | Blatt, sx: number, sy: number): number {
  const linie = zustand.raum[l]!;
  const { p, stueck } = raumAbtasten(linie, 1);
  let best = Infinity;
  let bi = 0;
  p.forEach((q, i) => {
    for (const z of b === 'seite' ? [q.z] : [q.z, -q.z]) {
      const [x, y] = raumImBlatt(b, { ...q, z });
      const d = Math.hypot(x - sx, y - sy);
      if (d < best) {
        best = d;
        bi = i;
      }
    }
  });
  const q = p[bi]!;
  const [qx, qy] = raumImBlatt(b, q);
  const nah = 6 / skala();
  const vorhanden = linie.punkte.findIndex((r, i) => {
    if (i === 0 || i === linie.punkte.length - 1) return false;
    const [rx, ry] = raumImBlatt(b, r);
    return Math.hypot(rx - qx, ry - qy) < nah;
  });
  if (vorhanden >= 0) return vorhanden;
  const k = Math.min(stueck[bi]!, linie.punkte.length - 2);
  linie.punkte.splice(k + 1, 0, { x: q.x, y: q.y, z: q.z });
  return k + 1;
}

function raumEcke(l: number, i: number): void {
  merken(kopie(zustand));
  const p = zustand.raum[l]!.punkte[i]!;
  zustand.raum[l]!.punkte[i] = { ...p, ecke: !p.ecke };
  geaendert();
}

/**
 * Liegt der Zeiger in Front oder Top auf der Linie, wo ein Umriss von dort am breitesten ist (8 px)? Mit Teilen hat jedes seine
 * eigene, auch wo sie verdeckt ist. Gibt die Nummer der nächsten zurück (0: der Körper, sonst Teil + 1), sonst −1.
 */
function umrissNah(b: Blatt, e: { clientX: number; clientY: number }): number {
  const [lg, q] = profilWelt(b, e);
  const qa = Math.abs(q);
  let best = 8 / skala();
  let wahl = -1;
  letzteKonturen.forEach((k, nr) => {
    const n = b === 'front' ? k.ny : k.nx;
    for (let i = 0; i < n; i++) {
      const z = b === 'front' ? k.frontZ[i]! : k.topZ[i]!;
      if (!(z > 0)) continue;
      const d = Math.hypot(z - qa, (b === 'front' ? k.y0 : k.x0) + i * k.d - lg);
      if (d < best) {
        best = d;
        wahl = nr;
      }
    }
  });
  return wahl;
}

/**
 * Den Umriss in Front oder Top angefasst: Die Linie, die er auf der Form zeigt (wo der Körper bzw. das Teil `nr` von dort
 * gesehen am breitesten ist), wird eine Raumlinie dieses Teils; wo sie eine andere des Teils kreuzt, teilen beide einen Punkt.
 * Gibt Linie und Punkt unter dem Zeiger zurück.
 */
function umrissAnfassen(b: Blatt, e: { clientX: number; clientY: number }, nr: number): { l: number; i: number } | null {
  const k = letzteKonturen[nr];
  if (!k) return null;
  // auf etwa 3 Einheiten genau: wenige Punkte zum Greifen (Punkte auf einem Kreis geben einen Kreis)
  const linie: RaumLinieT | null = umrissLinie(k, b, 3);
  if (!linie) return null;
  if (nr > 0) linie.teil = nr - 1;
  let n = 0;
  for (const l of zustand.raum) for (const p of l.punkte) n = Math.max(n, p.knoten ?? 0);
  for (const alt of zustand.raum) if (teilDer(alt) === teilDer(linie)) verbinden(linie, alt, () => ++n, 3 * k.d);
  zustand.raum.push(linie);
  const l = zustand.raum.length - 1;
  return { l, i: raumEinfuegen(l, b, ...blattPunkt(b, e)) };
}

function profilZeichnen(b: Blatt): void {
  const el = profilSvg[b];
  const r = felder[b].getBoundingClientRect();
  const s = skala();
  const w = r.width / s;
  const h = r.height / s;
  el.setAttribute('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`);
  el.replaceChildren();
  if (zustand.ansichten) {
    // Front (z, y) → Blatt (z, −y), Top (x, z) → Blatt (x, z)
    for (const u of zustand.ansichten[b]) el.append(element('path', 'vorgabe', { d: umrissPfad(u, (q) => (b === 'front' ? [q.x, -q.y] : [q.x, q.y])) }));
    return;
  }
  // `?linien`: Front und Top sind keine Zeichenflächen, nur die Linien auf der Form und ihre Punkte
  const halb = LINIEN ? null : profilVon(b);
  if (!LINIEN && (!halb || halb.length < 2)) return;
  const pt = (q: { x: number; y: number }) => zuBlatt(b, ...laengsQuer(b, q)).join(' ');
  const stuecke = halb ? umrissStuecke(ganz(b, halb)) : [];
  const pfad = (von: number, bis: number): string => {
    let d = `M ${pt(stuecke[von]![0])}`;
    for (let k = von; k < bis; k++) d += ` C ${pt(stuecke[k]![1])} ${pt(stuecke[k]![2])} ${pt(stuecke[k]![3])}`;
    return d;
  };
  if (halb) {
    const treffer = element('path', 'treffer', { d: `${pfad(0, stuecke.length)} Z` });
    treffer.dataset.profil = b;
    el.append(treffer);
  }
  // Teile: je ein eigener Umriss (Klick darauf: neuer Punkt in diesem Teil)
  const umrisse = halb && mitTeilen() ? alleUmrisse() : halb ? [-1] : [];
  for (const k of umrisse) {
    const h = profilVon(b, k);
    if (k < 0 || !h || h.length < 2) continue;
    const t = element('path', 'treffer', { d: umrissPfad(ganz(b, h), (q) => zuBlatt(b, ...laengsQuer(b, q))) });
    t.dataset.profil = b;
    t.dataset.teil = String(k);
    el.append(t);
  }
  // gezeichnete Linien: ein Trefferband für jede, beide Seiten (die Linien selbst zeichnet der Shader)
  for (const k of letzteKanten) {
    let dk = '';
    for (let i = 0; i < k.lagen.length / 3; i++) {
      const [x, y] = zuBlatt(b, b === 'front' ? k.lagen[3 * i + 1]! : k.lagen[3 * i]!, k.lagen[3 * i + 2]!);
      dk += `${i ? ' L' : 'M'} ${x} ${y}`;
    }
    const tk = element('path', 'treffer-kante', { d: dk });
    tk.dataset.kante = String(k.linie);
    el.append(tk);
  }
  lippenBaender(el, b);
  // gezeichnet: die Hälfte als Linie, die Spiegelhälfte leiser; folgt die Ansicht noch dem Körper, zeigt der Shader den Umriss
  // und hier stehen nur die Punkte. Mit Teilen: jeder Umriss ganz, verdeckte Stücke gestrichelt
  if (halb && mitTeilen()) {
    teileImBlatt(el, b, s);
  } else if (halb && zustand[b] && !NETZ) {
    el.append(element('path', 'spiegel', { d: pfad(halb.length - 1, stuecke.length) }));
    el.append(element('path', 'linie', { d: pfad(0, halb.length - 1) }));
  }
  const rp = 5 / s;
  if (LINIEN && mitTeilen()) konturenImBlatt(el, b, s);
  if (LINIEN) raumZeichnen(el, b);
  // in der Pose wirkt nur der Pinsel: keine Punkte der Grundform
  if (poseAn) {
    pinselKreisZeichnen(el, b);
    return;
  }
  for (const k of umrisse) {
    profilVon(b, k)?.forEach((q, i, alle) => {
      const [x, y] = zuBlatt(b, ...laengsQuer(b, q));
      // Anfang und Ende liegen auf der Mittelachse und gleiten nur auf ihr
      const achsig = i === 0 || i === alle.length - 1;
      const an = auswahl?.art === 'profil' && auswahl.blatt === b && auswahl.k === k && auswahl.i === i;
      const klasse = `punkt${an ? ' gewaehlt' : ''}${achsig ? ' achse' : ''}`;
      const rr = achsig ? 0.8 * rp : rp;
      const e = q.ecke
        ? element('rect', klasse, { x: x - rr, y: y - rr, width: 2 * rr, height: 2 * rr })
        : element('circle', klasse, { cx: x, cy: y, r: rr });
      e.dataset.ppunkt = `${b}:${i}`;
      if (k >= 0) e.dataset.teil = String(k);
      el.append(e);
    });
  }
  lippenPunkteImBlatt(el, b);
  // Punkte der gewählten Linie auf der Seite z ≥ 0
  const li = auswahl?.art === 'linie' || auswahl?.art === 'lpunkt' ? auswahl.l : -1;
  zustand.linien[li]?.punkte.forEach((q, i) => {
    const z = linienTiefe(li, i);
    if (z === null) return;
    const [x, y] = zuBlatt(b, b === 'front' ? q.y : q.x, z);
    const an = auswahl?.art === 'linie' || (auswahl?.art === 'lpunkt' && auswahl.i === i);
    const e = q.ecke
      ? element('rect', an ? 'lpunkt gewaehlt' : 'lpunkt', { x: x - 0.8 * rp, y: y - 0.8 * rp, width: 1.6 * rp, height: 1.6 * rp })
      : element('circle', an ? 'lpunkt gewaehlt' : 'lpunkt', { cx: x, cy: y, r: 0.8 * rp });
    e.dataset.lpunkt = `${li}:${i}`;
    el.append(e);
  });
}
/**
 * Mit Teilen in Front und Top: jeder Umriss ganz (gespiegelt), verdeckt gestrichelt; sichtbar durchgezogen nur, was Florian
 * gezeichnet hat (was seinem Teil folgt, zeichnet sichtbar der Shader genau, auch vor einem anderen Teil).
 */
function teileImBlatt(el: SVGSVGElement, b: Blatt, s: number): void {
  const umrisse = new Map<number, V[]>();
  const seiten = new Map<number, V[]>();
  for (const k of alleUmrisse()) {
    const h = profilVon(b, k);
    if (!h || h.length < 2) continue;
    umrisse.set(k, umrissAbtasten(ganz(b, h), 3).punkte);
    seiten.set(k, umrissAbtasten(umrissVon(k), 3).punkte);
  }
  for (const k of umrisse.keys()) {
    const p = umrissAbtasten(ganz(b, profilVon(b, k)!), Math.max(1, 2 / s)).punkte;
    const v = verdecktMarken(b, k, p, umrisse, seiten, 3 / s);
    const gezeichnet = (k < 0 ? zustand[b] : zustand.teile[k]![b]) !== null;
    for (const l of laeufe(p, v, (q) => zuBlatt(b, ...laengsQuer(b, q)))) {
      if (l.verdeckt || gezeichnet) el.append(element('path', l.verdeckt ? 'verdeckt' : 'linie', { d: l.d }));
    }
  }
}

/**
 * `?linien` mit Teilen in Front und Top: die Linie jedes Teils, wo es von dort am breitesten ist (beide Hälften), blass
 * gestrichelt, wo ein anderes Teil davor liegt (sichtbar zeichnet sie der Shader). Verdeckt heißt: Auf dem Blickstrahl reicht
 * ein anderes Teil mindestens so tief und liegt näher am Betrachter (Front: kleineres x, Top: größeres y).
 */
function konturenImBlatt(el: SVGSVGElement, b: Blatt, s: number): void {
  const K = letzteKonturen;
  if (K.length < 2) return;
  const tol = 3 / s;
  K.forEach((k, nr) => {
    const n = b === 'front' ? k.ny : k.nx;
    let lauf: [number, number][] = [];
    const ausgeben = () => {
      if (lauf.length > 1) {
        for (const vz of [1, -1]) {
          const d = lauf.map(([l, z], i) => `${i ? 'L' : 'M'} ${zuBlatt(b, l, vz * z).join(' ')}`).join(' ');
          el.append(element('path', 'verdeckt', { d }));
        }
      }
      lauf = [];
    };
    for (let i = 0; i < n; i++) {
      const z = b === 'front' ? k.frontZ[i]! : k.topZ[i]!;
      if (!(z > 0)) {
        ausgeben();
        continue;
      }
      let verdeckt = false;
      for (let o = 0; o < K.length && !verdeckt; o++) {
        if (o === nr) continue;
        const Z = K[o]!.Z;
        if (b === 'front') {
          // vorderster Punkt des anderen Teils auf dieser Höhe, der so tief reicht
          for (let ii = 0; ii < k.nx; ii++) {
            if (Z[i * k.nx + ii]! >= z) {
              verdeckt = k.x0 + ii * k.d < k.frontX[i]! - tol;
              break;
            }
          }
        } else {
          for (let jj = k.ny - 1; jj >= 0; jj--) {
            if (Z[jj * k.nx + i]! >= z) {
              verdeckt = k.y0 + jj * k.d > k.topY[i]! + tol;
              break;
            }
          }
        }
      }
      const l = (b === 'front' ? k.y0 : k.x0) + i * k.d;
      if (verdeckt) lauf.push([l, z]);
      else {
        // der Lauf endet am ersten sichtbaren Punkt (so berühren sich gestrichelt und Shader)
        if (lauf.length > 0) lauf.push([l, z]);
        ausgeben();
      }
    }
    ausgeben();
  });
}

/** Lippen in Front und Top: Trefferbänder, beide Hälften (die Lippen selbst zeichnet der Shader); ein Klick wählt den Kiefer. */
function lippenBaender(el: SVGSVGElement, b: Blatt): void {
  const s = schnitt;
  const m = zustand.maul;
  if (!s || !m) return;
  const getrennt = !!m.unten && s.unten !== null;
  [s.lippeOben, s.lippeUnten].forEach((lippe, k) => {
    let d = '';
    lippe.forEach((v, i) => {
      const [x, y] = raumImBlatt(b, { x: s.positionen[3 * v]!, y: s.positionen[3 * v + 1]!, z: s.positionen[3 * v + 2]! });
      d += `${i ? ' L' : 'M'} ${x} ${y}`;
    });
    const t = element('path', 'treffer-kante', { d });
    t.dataset.maul = String(getrennt ? k : 0);
    el.append(t);
  });
}

/**
 * Mit getrennten Kiefern die Punkte der gewählten Lippe in Front und Top, auf der Seite z ≥ 0: so weit außen, wie die Form dort
 * tief ist, mal der Breite der Lippe.
 */
function lippenPunkteImBlatt(el: SVGSVGElement, b: Blatt): void {
  const s = schnitt;
  const m = zustand.maul;
  if (!s || !m || !m.unten || s.unten === null) return;
  const a = auswahl;
  if (a?.art !== 'maul' && a?.art !== 'mpunkt') return;
  const punkte = maulPunkte(a.l);
  const rp = 5 / skala();
  punkte?.forEach((q, i) => {
    // der Mundwinkel gehört beiden: gezeigt an der Oberlippe
    if (a.l === 1 && i === punkte.length - 1) return;
    const z = (i === punkte.length - 1 ? 1 : (q.b ?? 1)) * s.tiefe(q.x, q.y);
    const [x, y] = raumImBlatt(b, { x: q.x, y: q.y, z });
    const an = a.art === 'maul' || a.i.includes(i);
    const e = element('circle', `lpunkt ${a.l === 0 ? 'lippe-oben' : 'lippe-unten'}${an ? ' gewaehlt' : ''}`, { cx: x, cy: y, r: 0.8 * rp });
    e.dataset.mpunkt = `${a.l}:${i}`;
    el.append(e);
  });
}

/** SVG-Pfad eines geschlossenen Umrisses; `blatt` bildet seine Koordinaten auf das Blatt ab. */
function umrissPfad(u: readonly UmrissPunkt[], blatt: (q: { x: number; y: number }) => [number, number]): string {
  if (u.length < 3) return '';
  const st = umrissStuecke(u);
  const pt = (q: { x: number; y: number }) => blatt(q).join(' ');
  let d = `M ${pt(st[0]![0])}`;
  for (const k of st) d += ` C ${pt(k[1])} ${pt(k[2])} ${pt(k[3])}`;
  return `${d} Z`;
}

function profileZeichnen(): void {
  profilZeichnen('front');
  profilZeichnen('top');
}

let profilZug: { blatt: Blatt; k: number; i: number; vorher: Zustand; bewegt: boolean } | null = null;
// Linienpunkt in Front oder Top ziehen: die Front bewegt nur y und z, das Top nur x und z
let linienZug: { blatt: Blatt; l: number; i: number; vorher: Zustand; bewegt: boolean } | null = null;
// Punkt einer Linie auf der Form (`?linien`) in Front oder Top ziehen: die Front bewegt y und z, das Top x und z
let raumZug: { blatt: Blatt; l: number; i: number; vorher: Zustand; bewegt: boolean } | null = null;
// Punkt einer Lippe (getrennte Kiefer) in Front oder Top ziehen: die Front bewegt y und die Breite, das Top x und die Breite
let lippenZug: { blatt: Blatt; l: number; i: number; vorher: Zustand; bewegt: boolean } | null = null;
for (const b of ['front', 'top'] as const) {
  const el = profilSvg[b];
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    // in der Pose: Pinsel (die Front bewegt y und z, das Top x und z)
    if (poseAn) {
      if (pinselStart(b, e)) el.setPointerCapture(e.pointerId);
      return;
    }
    if ((!LINIEN && !profilVon(b)) || zustand.ansichten) return;
    const d = (e.target as SVGElement).dataset;
    const vorher = kopie(zustand);
    // `?linien`: am Umriss (eines Teils) angefasst, wenn nichts anderes unter dem Zeiger liegt
    const frei = [d.mpunkt, d.maul, d.rpunkt, d.raum, d.lpunkt, d.kante].every((v) => v === undefined);
    const nahAm = LINIEN && frei ? umrissNah(b, e) : -1;
    if (d.mpunkt !== undefined) {
      // Punkt einer Lippe: Lage und Breite ziehen
      const [l, i] = d.mpunkt.split(':').map(Number) as [number, number];
      auswahl = { art: 'mpunkt', l, i: [i] };
      if (doppelklick(`${b}m${l}:${i}`) || e.altKey) {
        maulEcke(l, i);
        return;
      }
      lippenZug = { blatt: b, l, i, vorher, bewegt: false };
      svgZeichnen();
      profileZeichnen();
    } else if (d.maul !== undefined) {
      // eine Lippe anklicken wählt ihren Kiefer
      auswahl = { art: 'maul', l: Number(d.maul) };
      svgZeichnen();
      profileZeichnen();
      return;
    } else if (d.rpunkt !== undefined) {
      const [l, i] = d.rpunkt.split(':').map(Number) as [number, number];
      auswahl = { art: 'rpunkt', l, i };
      if (doppelklick(`${b}r${l}:${i}`) || e.altKey) {
        raumEcke(l, i);
        return;
      }
      raumZug = { blatt: b, l, i, vorher, bewegt: false };
      svgZeichnen();
      profileZeichnen();
    } else if (d.raum !== undefined) {
      // Klick auf eine Linie auf der Form: dort ein neuer Punkt, gleich ziehen
      const l = Number(d.raum);
      const i = raumEinfuegen(l, b, ...blattPunkt(b, e));
      merken(vorher);
      auswahl = { art: 'rpunkt', l, i };
      raumZug = { blatt: b, l, i, vorher: kopie(zustand), bewegt: true };
      geaendert(false);
    } else if (nahAm >= 0) {
      // den Umriss angefasst: dort eine Linie auf die Form legen (die Linie, die der Umriss zeigt) und ihren Punkt ziehen
      const neu = umrissAnfassen(b, e, nahAm);
      if (!neu) return;
      merken(vorher);
      auswahl = { art: 'rpunkt', l: neu.l, i: neu.i };
      raumZug = { blatt: b, l: neu.l, i: neu.i, vorher: kopie(zustand), bewegt: true };
      geaendert(false);
    } else if (d.lpunkt !== undefined) {
      const [l, i] = d.lpunkt.split(':').map(Number) as [number, number];
      auswahl = { art: 'lpunkt', l, i };
      if (doppelklick(`${b}l${l}:${i}`) || e.altKey) {
        linienEcke(l, i);
        return;
      }
      linienZug = { blatt: b, l, i, vorher, bewegt: false };
      svgZeichnen();
      profileZeichnen();
    } else if (d.kante !== undefined) {
      auswahl = { art: 'linie', l: Number(d.kante) };
      svgZeichnen();
      profileZeichnen();
      return;
    } else if (d.ppunkt !== undefined) {
      const i = Number(d.ppunkt.split(':')[1]);
      const k = d.teil !== undefined ? Number(d.teil) : -1;
      auswahl = { art: 'profil', blatt: b, k, i };
      fuehrt(b);
      if (doppelklick(`${b}${k}:${i}`) || e.altKey) {
        merken(vorher);
        const q = profilFesthalten(b, k)!;
        q[i] = { ...q[i]!, ecke: !q[i]!.ecke };
        geaendert();
        return;
      }
      svgZeichnen();
      profileZeichnen();
      profilZug = { blatt: b, k, i, vorher, bewegt: false };
    } else if (d.profil !== undefined) {
      const k = d.teil !== undefined ? Number(d.teil) : -1;
      const st = profilStelle(b, profilWelt(b, e), k);
      if (!st) return;
      fuehrt(b);
      merken(vorher);
      profilFesthalten(b, k)!.splice(st.i + 1, 0, halbPunkt(b, st.l, st.q));
      auswahl = { art: 'profil', blatt: b, k, i: st.i + 1 };
      profilZug = { blatt: b, k, i: st.i + 1, vorher: kopie(zustand), bewegt: true };
      geaendert(false);
    } else {
      auswahl = null;
      svgZeichnen();
      profileZeichnen();
      return;
    }
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (pinsel) {
      pinselZiehen(e);
      return;
    }
    if (poseAn) {
      pinselZeigen(b, e);
      return;
    }
    if (raumZug && raumZug.blatt === b) {
      if (!raumZug.bewegt) {
        merken(raumZug.vorher);
        raumZug.bewegt = true;
        letzterKlick = null;
      }
      // (längs, quer) = Front: (y, z), Top: (x, z); die dritte Achse bleibt, ein Knoten zieht die andere Linie mit
      const [a, q] = profilWelt(b, e);
      const p = zustand.raum[raumZug.l]!.punkte[raumZug.i]!;
      // auf der Spiegelhälfte gegriffen zieht dieselbe Linie (gespeichert ist die Hälfte z ≥ 0)
      const z = Math.abs(q);
      punktSetzen(zustand.raum, raumZug.l, raumZug.i, b === 'front' ? { x: p.x, y: a, z } : { x: a, y: p.y, z });
      geaendert(false);
      return;
    }
    if (lippenZug && lippenZug.blatt === b) {
      if (!lippenZug.bewegt) {
        merken(lippenZug.vorher);
        lippenZug.bewegt = true;
        letzterKlick = null;
      }
      // (längs, quer) = Front: (y, z), Top: (x, z); die dritte Achse bleibt, die Breite ist z gegen die Tiefe der Form
      const [a, q] = profilWelt(b, e);
      const lz = lippenZug;
      const punkte = maulPunkte(lz.l);
      const p = punkte?.[lz.i];
      if (!punkte || !p || !schnitt) return;
      const letzter = lz.i === punkte.length - 1;
      const x = b === 'front' ? p.x : a;
      const y = b === 'front' ? a : p.y;
      // der Anfang ist ein Punkt des Umrisses (dort hat die Form keine Tiefe, also auch keine Breite): Die Front zieht ihn in
      // der Höhe, das Top in der Länge, der Umriss geht mit
      if (lz.i === 0) anfangZiehen(lz.l, { x, y });
      const t = schnitt.tiefe(x, y);
      // am Mundwinkel treffen sich die Lippen: dort keine eigene Breite
      const breite = lz.i === 0 || letzter || t < 1e-3 ? p.b : Math.max(0.2, Math.min(4, Math.abs(q) / t));
      punkte[lz.i] = { ...p, x, y, b: breite };
      const u = zustand.maul?.unten;
      if (letzter && lz.l === 0 && u) u[u.length - 1] = { ...u[u.length - 1]!, x, y };
      geaendert(false);
      return;
    }
    if (linienZug && linienZug.blatt === b) {
      if (!linienZug.bewegt) {
        merken(linienZug.vorher);
        linienZug.bewegt = true;
        letzterKlick = null;
      }
      // (längs, quer) = Front: (y, z), Top: (x, z); die dritte Achse bleibt, wo sie war
      const [a, q] = profilWelt(b, e);
      const lin = zustand.linien[linienZug.l]!;
      const pt = lin.punkte[linienZug.i]!;
      const zf = Math.max(0, q);
      lin.punkte[linienZug.i] =
        b === 'front'
          ? { ...pt, y: a, z: zf / streckungBei(letzteTiefe, pt.x, a) }
          : { ...pt, x: a, z: zf / streckungBei(letzteTiefe, a, pt.y) };
      geaendert(false);
      return;
    }
    if (!profilZug || profilZug.blatt !== b) return;
    if (!profilZug.bewegt) {
      merken(profilZug.vorher);
      profilZug.bewegt = true;
      letzterKlick = null;
    }
    const [l, q] = profilWelt(b, e);
    const h = profilFesthalten(b, profilZug.k)!;
    const i = profilZug.i;
    // Anfang und Ende gleiten auf der Mittelachse, alle anderen bleiben auf ihrer Seite (z ≥ 0)
    const pt = halbPunkt(b, l, i === 0 || i === h.length - 1 ? 0 : Math.max(0, q));
    h[i] = h[i]!.ecke ? { ...pt, ecke: true } : pt;
    koppeln(b, i, profilZug.k);
    geaendert(false);
  });
  const ende = (): void => {
    if (pinsel) {
      pinselEnde();
      return;
    }
    if (profilZug?.bewegt || linienZug?.bewegt || raumZug?.bewegt || lippenZug?.bewegt) bauGewuenscht = 'fein';
    profilZug = null;
    linienZug = null;
    raumZug = null;
    lippenZug = null;
  };
  el.addEventListener('pointerup', ende);
  el.addEventListener('pointercancel', ende);
}

window.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    const von = e.shiftKey ? vor : zurueck;
    const nach = e.shiftKey ? zurueck : vor;
    const stand = von.pop();
    if (!stand) return;
    nach.push(kopie(zustand));
    zustand = stand;
    auswahl = null;
    // ein gemerkter Stand zeigt schon das Mesh: keine Ansicht führt
    fuehrung = null;
    geaendert();
    return;
  }
  if (e.key === 'Escape') {
    auswahl = null;
    nahtAn = false;
    svgZeichnen();
    profileZeichnen();
    return;
  }
  // Strichdicke: [ ] (auf deutscher Tastatur ⌥5/⌥6 oder dieselben Tasten wie dort + und ü) oder + und −
  const mehr = e.key === ']' || e.key === '+' || e.code === 'BracketRight';
  const weniger = e.key === '[' || e.key === '-' || e.code === 'BracketLeft';
  // in der Pose: Radius des Pinsels
  if (poseAn && !mod && (mehr || weniger)) {
    e.preventDefault();
    pinselRadius = radius() * (mehr ? 1.2 : 1 / 1.2);
    for (const k of Object.values(pinselKreise)) k?.setAttribute('r', String(radius()));
    return;
  }
  if (!mod && (mehr || weniger)) {
    e.preventDefault();
    const d = mehr ? 0.5 : -0.5;
    breiteSetzen((b) => Math.round((b + d) * 2) / 2);
    return;
  }
  if (!mod && ['0', '1', '2', '3'].includes(e.key)) {
    breiteSetzen(() => Number(e.key));
    return;
  }
  if ((e.key === 'Backspace' || e.key === 'Delete') && auswahl) {
    e.preventDefault();
    const a = auswahl;
    if (a.art === 'umriss') {
      // der Anfang einer Lippe gehört zum Maul (mit ihm löschen)
      const u = umrissVon(a.k);
      if (u.length <= 3 || u[a.i]?.lippe) return;
      merken(kopie(zustand));
      fuehrt('seite');
      umrissSetzen(
        a.k,
        u.filter((_, j) => j !== a.i),
      );
    } else if (a.art === 'profil') {
      // Anfang und Ende auf der Achse bleiben, mindestens ein Punkt dazwischen
      const p = profilVon(a.blatt, a.k);
      if (!p || a.i === 0 || a.i === p.length - 1 || p.length <= 3) return;
      merken(kopie(zustand));
      fuehrt(a.blatt);
      profilFesthalten(a.blatt, a.k)?.splice(a.i, 1);
    } else if (a.art === 'rpunkt') {
      // Linie auf der Form: Anfang und Ende bleiben, mindestens ein Punkt dazwischen
      const r = zustand.raum[a.l]!;
      if (a.i === 0 || a.i === r.punkte.length - 1 || r.punkte.length <= 3) return;
      merken(kopie(zustand));
      r.punkte = r.punkte.filter((_, j) => j !== a.i);
    } else if (a.art === 'raum') {
      merken(kopie(zustand));
      zustand.raum = zustand.raum.filter((_, j) => j !== a.l);
    } else if (a.art === 'maul' || a.art === 'mpunkt') {
      // Punkte einer Lippe (nicht der Anfang auf dem Umriss, mindestens zwei bleiben) oder die ganze Linie: die Maullinie nimmt
      // das ganze Maul mit, die Unterlippe nur sich (die Kiefer sind dann wieder zusammen)
      const m = zustand.maul;
      if (!m) return;
      const punkte = maulPunkte(a.l) ?? [];
      const weg = a.art === 'mpunkt' ? a.i.filter((j) => j > 0 && !(a.l === 1 && j === punkte.length - 1)) : [];
      merken(kopie(zustand));
      if (a.art === 'mpunkt' && weg.length > 0 && punkte.length - weg.length >= 2) {
        const rest = punkte.filter((_, j) => !weg.includes(j));
        if (a.l === 1) m.unten = rest;
        else m.punkte = rest;
      } else if (a.l === 1) {
        m.unten = undefined;
        m.punkte = m.punkte.map(ohneBreite);
      } else {
        zustand.maul = null;
      }
    } else {
      merken(kopie(zustand));
      const l = zustand.linien[a.l]!;
      if (a.art === 'lpunkt' && l.punkte.length > 2) l.punkte = l.punkte.filter((_, j) => j !== a.i);
      else zustand.linien = zustand.linien.filter((_, j) => j !== a.l);
    }
    auswahl = null;
    geaendert();
  }
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if (!kameraBewegt) einrahmen();
  svgZeichnen();
  profileZeichnen();
  neuZeichnen = true;
});

function schleife(): void {
  requestAnimationFrame(schleife);
  if (bauGewuenscht) {
    const fein = bauGewuenscht === 'fein';
    bauGewuenscht = null;
    bauen(fein);
  }
  if (neuZeichnen) {
    neuZeichnen = false;
    rendern();
  }
}

// Prüfhaken: Teile der Szene zum Ein- und Ausblenden
(window as unknown as { __formSzene: unknown }).__formSzene = {
  umriss,
  innen: maulInnen,
  kanten,
  kantenHinten,
  zeichnen: () => {
    neuZeichnen = true;
  },
  // getrennte Kiefer: Lippenpunkte im Körper (je vom einen Mundwinkel um die Schnauze zum anderen) und die Tiefe der Form
  lippen: () => (schnitt ? { oben: Array.from(schnitt.lippeOben), unten: Array.from(schnitt.lippeUnten) } : null),
  tiefe: (x: number, y: number) => schnitt?.tiefe(x, y) ?? null,
};

window.__formSetzen = (p, linien = [], front = null, top = null) => {
  merken(kopie(zustand));
  zustand = kopie({ punkte: p, linien, front, top, ansichten: null, raum: [], maul: null, pose: ruhePose(), teile: [] });
  auswahl = null;
  ohnePose();
  geaendert();
};

window.__formAnsichten = (z) => {
  merken(kopie(zustand));
  const kopien = (a: Zeichnungen['seite'] | null | undefined) => (a ?? []).map((u) => u.map((q) => ({ ...q })));
  const seite = kopien(z.seite);
  zustand = kopie({
    punkte: seite[0] ?? kreis(150),
    linien: [],
    front: null,
    top: null,
    ansichten: { seite: seite.slice(1), front: kopien(z.front), top: kopien(z.top) },
    raum: [],
    maul: null,
    pose: ruhePose(),
    teile: [],
  });
  auswahl = null;
  ohnePose();
  geaendert();
};
window.__formPruefall = (name) => {
  // mit einer Fläche je Ansicht: zum Bearbeiten (Front und Top als halbe Umrisse); sonst nur zum Ansehen
  const h = PRUEFFAELLE_HALB[name];
  if (!h) {
    window.__formAnsichten?.(PRUEFFAELLE[name]);
    return;
  }
  merken(kopie(zustand));
  zustand = kopie({ punkte: h.seite, linien: [], front: h.front, top: h.top, ansichten: null, raum: [], maul: null, pose: ruhePose(), teile: [] });
  auswahl = null;
  ohnePose();
  geaendert();
};
window.__formKontur = (nr, blatt, l) => {
  const k = letzteKonturen[nr];
  if (!k) return null;
  const i = Math.round((l - (blatt === 'front' ? k.y0 : k.x0)) / k.d);
  const z = (blatt === 'front' ? k.frontZ : k.topZ)[i];
  return z !== undefined && z > 0 ? z : null;
};
window.__formAbstand = () => {
  const g = letztesGleich;
  if (!g) return null;
  const r = { seite: Number.NaN, front: Number.NaN, top: Number.NaN };
  for (const b of ['seite', 'front', 'top'] as const) {
    const linie = b === 'seite' ? zustand.punkte : profilVon(b);
    const schleife = umrisseDesKoerpers(g.liste, b, g.zelle / 2)[0];
    const ziel = schleife && (b === 'seite' ? schleife : halbeLinie(schleife, b));
    if (linie && ziel) r[b] = linienAbstand(linie, b, ziel);
  }
  return r;
};
if (LINIEN) {
  const kopf = felder.seite.querySelector('header');
  if (kopf) kopf.textContent = 'Seite · Linien auf der Form';
  for (const b of ['front', 'top'] as const) {
    const fuss = felder[b].querySelector('footer');
    if (fuss) {
      fuss.textContent =
        'Umriss anfassen: Linie auf die Form legen und ziehen (mit Teilen die des nächsten Teils, verdeckt gestrichelt) · Klick auf eine Linie: neuer Punkt · Doppelklick: Ecke ↔ rund · ⌫ löschen';
    }
  }
}
if (NETZ) {
  const kopf = felder.seite.querySelector('header');
  if (kopf) kopf.textContent = 'Seite · Linien aus dem Netz';
}
// Leiste in der Seite: Teile von selbst (ab welchem Verhältnis Tiefe / Öffnung), Naht ziehen
teileSchwelle.addEventListener('input', teileAnzeigen);
teileSchwelle.addEventListener('change', teileNeuPruefen);
teileAuto.addEventListener('change', teileNeuPruefen);
nahtKnopf.addEventListener('click', () => {
  nahtAn = !nahtAn;
  auswahl = null;
  svgZeichnen();
  profileZeichnen();
});
// Knopf „Kiefer trennen“ und die Wahl des Kiefers (Ober / Unter) im 3D-Blatt
kieferKnopf.addEventListener('click', kieferUmschalten);
for (const k of kieferWahl.querySelectorAll<HTMLButtonElement>('button')) {
  k.addEventListener('click', () => {
    auswahl = { art: 'maul', l: Number(k.dataset.kiefer) };
    svgZeichnen();
    profileZeichnen();
  });
}
// Regler „Maul“ im 3D-Blatt: nur die Ansicht, kein neuer Bau (die Drehung um den Mundwinkel ist schnell)
maulEingabe.max = String(MAUL_WINKEL_MAX);
const KOPF_MAX = 40;
kopfEingabe.max = String(KOPF_MAX);
/** Knochen der Pose setzen (Regler „Maul“ und „Kopf“): zeigt die Pose, kein neuer Bau */
const knochenSetzen = (kiefer: number | null, schaedel: number | null): void => {
  if (kiefer !== null) zustand.pose.kiefer = Math.max(0, Math.min(MAUL_WINKEL_MAX, kiefer));
  if (schaedel !== null) zustand.pose.schaedel = Math.max(0, Math.min(KOPF_MAX, schaedel));
  maulEingabe.value = String(zustand.pose.kiefer);
  kopfEingabe.value = String(zustand.pose.schaedel);
  poseZeigen(true);
};
/** Pose zeigen oder die Grundform (Schalter „Pose“) */
const poseZeigen = (an: boolean): void => {
  poseAn = an;
  poseSchalter.checked = an;
  if (an) auswahl = null;
  if (!an) pinselZeiger = null;
  poseAnwenden();
  svgZeichnen();
  profileZeichnen();
  if (window.__form) {
    window.__form.pose = { an: poseAn, ...kopie(zustand).pose };
    window.__form.oeffnung = gezeigtePose().kiefer;
  }
};
const oeffnungSetzen = (w: number): void => knochenSetzen(w, null);
// je Griff an einem Regler ein Schritt zum Rückgängigmachen
for (const regler of [maulEingabe, kopfEingabe]) regler.addEventListener('pointerdown', () => merken(kopie(zustand)));
maulEingabe.addEventListener('input', () => knochenSetzen(Number(maulEingabe.value), null));
kopfEingabe.addEventListener('input', () => knochenSetzen(null, Number(kopfEingabe.value)));
poseSchalter.addEventListener('change', () => poseZeigen(poseSchalter.checked));
// die 3D-Steuerung soll Regler und Schalter nicht als Drehen nehmen
const reglerLeiste = document.querySelector('.regler-leiste');
for (const art of ['pointerdown', 'wheel'] as const) reglerLeiste?.addEventListener(art, (e) => e.stopPropagation());
const spielnetzSetzen = (an: boolean): void => {
  spielnetzAn = an;
  spielnetzSchalter.checked = an;
  bauGewuenscht = 'fein';
};
spielnetzSchalter.addEventListener('change', () => spielnetzSetzen(spielnetzSchalter.checked));
window.__formSpielnetz = spielnetzSetzen;
void backenBereit.then(() => {
  backBereit = true;
  if (spielnetzAn) bauGewuenscht = 'fein';
});
window.__formMaul = (linie) => {
  merken(kopie(zustand));
  lippenLoesen();
  zustand.maul = linie ? { punkte: linie.punkte.map((q) => ({ ...q })), unten: linie.unten?.map((q) => ({ ...q })) } : null;
  auswahl = null;
  geaendert();
};
window.__formOeffnen = oeffnungSetzen;
window.__formPose = (pose, an = true) => {
  merken(kopie(zustand));
  if (pose) zustand.pose = kopie({ ...zustand, pose }).pose;
  maulEingabe.value = String(zustand.pose.kiefer);
  kopfEingabe.value = String(zustand.pose.schaedel);
  poseZeigen(an);
};

// ?fall=kugel|beine|flossen|lappen|innen öffnet einen Prüffall für gleichwertige Ansichten
const fallAusAdresse = new URLSearchParams(location.search).get('fall');
if (fallAusAdresse && fallAusAdresse in PRUEFFAELLE) window.__formPruefall(fallAusAdresse as Prueffall);

svgZeichnen();
schleife();
