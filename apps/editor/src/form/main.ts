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
  type MaulSchnitt,
  type Nachfuehrung,
  type RaumLinie,
  PRUEFFAELLE,
  PRUEFFAELLE_HALB,
  type Prueffall,
  type UmrissPunkt,
  type Zeichnungen,
  formAusAnsichten,
  ganzerUmriss,
  halbeLinie,
  linieAbtasten,
  linieNachfuehren,
  linienAbstand,
  maulOeffnen,
  maulPunkt,
  maulSchneiden,
  profilAusBreite,
  punktAufStueck,
  punktSetzen,
  raumAbtasten,
  raumKanten,
  rundAusSeite,
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
  MeshToonMaterial,
  NearestFilter,
  OrthographicCamera,
  PerspectiveCamera,
  RedFormat,
  Scene,
  ShaderMaterial,
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
  /** Linien im Raum (`?linien`): Hälfte z ≥ 0, Anfang und Ende auf dem Umriss der Seite */
  raum: RaumLinie[];
  /** Maullinie in der Seite: erster Punkt auf dem Umriss, letzter = Mundwinkel */
  maul: MaulLinie | null;
};
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
      oeffnung: number;
      schnitt: { lippe: number; innen: number } | null;
    };
    /** Prüfhaken: Maullinie setzen (wie ein Zug, mit Rückgängig) */
    __formMaul?: (linie: MaulLinie | null) => void;
    /** Prüfhaken: Öffnung des Mauls in Grad (wie der Regler) */
    __formOeffnen?: (winkel: number) => void;
    /** Prüfhaken: eine Zeichnung setzen (wie ein Zug, mit Rückgängig) */
    __formSetzen?: (p: UmrissPunkt[], linien?: KantenLinie[], front?: UmrissPunkt[] | null, top?: UmrissPunkt[] | null) => void;
    /** Prüfhaken: alle drei Ansichten als geschlossene Umrisse setzen (gleichwertig) */
    __formAnsichten?: (z: Zeichnungen) => void;
    /** Prüfhaken: einen Prüffall laden (Kugel, Beine, Flossen, Lappen) */
    __formPruefall?: (name: Prueffall) => void;
    /** Prüfhaken: größter Abstand je Ansicht zwischen ihrer Linie und dem Umriss des Körpers (nur gleichwertige Ansichten) */
    __formAbstand?: () => Record<'seite' | 'front' | 'top', number> | null;
  }
}

const PAPIER = 0xefe9dd;
const KOERPER = 0xe2b98e;
const TINTE = 0x1f1a17;
/** Maulinneres */
const MAULFARBE = 0x7a3431;
/** Strichdicke der Lippen (px) */
const LIPPE = 2.5;
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

let zustand: Zustand = { punkte: kreis(150), linien: [], front: null, top: null, ansichten: null, raum: [], maul: null };
/** Öffnung des Mauls in Grad (Regler im 3D-Blatt; eine Ansicht, kein Teil der Zeichnung) */
let oeffnung = 0;
/** der zuletzt gebaute Schnitt (null: kein Maul oder die Linie schneidet nicht) */
let schnitt: MaulSchnitt | null = null;
const maulOffen = (): boolean => schnitt !== null && oeffnung > 0;
const maulRegler = document.getElementById('maul-regler') as HTMLLabelElement;
const maulEingabe = document.getElementById('maul-oeffnung') as HTMLInputElement;
/** Probe „Linien aus dem Netz“: die Ansicht, die Florian gerade bearbeitet (bis zum genauen Bau nach dem Loslassen) */
let fuehrung: 'seite' | Blatt | null = null;
const fuehrt = (b: 'seite' | Blatt): void => {
  if (NETZ) fuehrung = b;
};
/** zuletzt nachgeführte Ansichten (Prüfhaken) */
let letzteNachfuehrung: Partial<Record<'seite' | Blatt, Omit<Nachfuehrung, 'punkte'>>> = {};
/** der zuletzt gebaute Körper aus gleichwertigen Ansichten (Prüfhaken) */
let letztesGleich: GleichesNetz | null = null;
type Auswahl =
  | { art: 'umriss'; i: number }
  | { art: 'linie'; l: number }
  | { art: 'lpunkt'; l: number; i: number }
  | { art: 'profil'; blatt: Blatt; i: number }
  | { art: 'raum'; l: number }
  | { art: 'rpunkt'; l: number; i: number }
  | { art: 'maul' }
  | { art: 'mpunkt'; i: number }
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
  maul: z.maul ? { punkte: z.maul.punkte.map((q) => ({ ...q })) } : null,
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
// Maul: das Innere (Gaumen und Boden) dunkel, die Lippen als Linien wie die Kanten
const maulInnen = new Mesh(new BufferGeometry(), new MeshToonMaterial({ color: MAULFARBE, gradientMap: stufen }));
const lippen = new Mesh(new BufferGeometry(), kanteSichtbar);
const lippenHinten = new Mesh(lippen.geometry, kanteVerdeckt);
umriss.renderOrder = 1;
kanten.renderOrder = 2;
kantenHinten.renderOrder = 3;
raumBand.renderOrder = 2;
raumBandHinten.renderOrder = 3;
lippen.renderOrder = 2;
lippenHinten.renderOrder = 3;
szene.add(koerper, umriss, kanten, kantenHinten, raumBand, raumBandHinten, maulInnen, lippen, lippenHinten);
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

/** Linien auf dem Körper in Ruhe (Kanten, Linien auf der Form); mit geöffnetem Maul biegt `oeffnungAnwenden` sie mit. */
let kantenRuhe: readonly Kante3D[] = [];
let raumRuhe: readonly Kante3D[] = [];
const ersetzen = (a: Mesh, b: Mesh, g: BufferGeometry): void => {
  const alt = a.geometry;
  a.geometry = g;
  b.geometry = g;
  alt.dispose();
};

function geometrieSetzen(n: DichtesNetz): void {
  const s = schnitt;
  const g = new BufferGeometry();
  // mit Maul der geschnittene Körper in eigenen Puffern: die Öffnung schreibt hinein, die Ruhe bleibt im Schnitt
  g.setAttribute('position', new BufferAttribute(s ? new Float32Array(s.positionen) : n.positionen, 3));
  g.setAttribute('normal', new BufferAttribute(s ? new Float32Array(s.normalen) : n.normalen, 3));
  g.setIndex(new BufferAttribute(s ? s.indizes : n.indizes, 1));
  g.computeBoundingSphere();
  ersetzen(koerper, umriss, g);
  const gi = new BufferGeometry();
  if (s) {
    gi.setAttribute('position', new BufferAttribute(new Float32Array(s.innen.positionen), 3));
    gi.setAttribute('normal', new BufferAttribute(new Float32Array(s.innen.normalen), 3));
    gi.setIndex(new BufferAttribute(s.innen.indizes, 1));
  }
  const altI = maulInnen.geometry;
  maulInnen.geometry = gi;
  altI.dispose();
  kantenRuhe = n.kanten;
  // Linien auf der Form, auf die Fläche gelegt (Tiefe der Form an ihrer Stelle in der Seite)
  const kontur = n.kontur;
  raumRuhe = LINIEN ? raumKanten(zustand.raum, 2, kontur ? (x, y) => tiefeAusKontur(kontur, x, y) : undefined) : [];
  oeffnungAnwenden();
}

/** Das Maul so weit geöffnet zeigen, wie der Regler steht: Körper, Inneres, Lippen und die Linien auf dem Körper. */
function oeffnungAnwenden(): void {
  const s = schnitt;
  const w = s ? oeffnung : 0;
  if (s) {
    const pa = koerper.geometry.getAttribute('position') as BufferAttribute;
    const na = koerper.geometry.getAttribute('normal') as BufferAttribute;
    const ia = maulInnen.geometry.getAttribute('position') as BufferAttribute;
    const ina = maulInnen.geometry.getAttribute('normal') as BufferAttribute;
    maulOeffnen(s, w, {
      positionen: pa.array as Float32Array,
      normalen: na.array as Float32Array,
      innenPositionen: ia.array as Float32Array,
      innenNormalen: ina.array as Float32Array,
    });
    for (const a of [pa, na, ia, ina]) a.needsUpdate = true;
  }
  const biegen = (k: Kante3D): Kante3D => {
    if (!s || w === 0) return k;
    const lagen = new Float32Array(k.lagen);
    for (let i = 0; i < lagen.length / 3; i++) {
      const q = maulPunkt(s, w, lagen[3 * i]!, lagen[3 * i + 1]!);
      lagen[3 * i] = q.x;
      lagen[3 * i + 1] = q.y;
    }
    return { ...k, lagen };
  };
  ersetzen(kanten, kantenHinten, kantenGeometrie(kantenRuhe.map(biegen)));
  ersetzen(raumBand, raumBandHinten, kantenGeometrie(raumRuhe.map(biegen)));
  // Lippen: oben und unten aus den Punkten des Körpers, je vom einen Mundwinkel um die Schnauze zum anderen
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
  ersetzen(lippen, lippenHinten, kantenGeometrie(lp));
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
let letzteKontur: Kontur | null = null;
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
  return { n, ellipsoide: g.ellipsoide, g };
}

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
  let gleich: ReturnType<typeof gleichBauen> | null = null;
  let n: DichtesNetz;
  abgeleitet.front = null;
  abgeleitet.top = null;
  if (LINIEN) {
    // Florians Modell: die Seite legt das Volumen an, die Linien auf der Form formen es (Front und Top nur Ansicht)
    raumEndenAufUmriss();
    n = rundAusSeite(zustand.punkte, { dreiecke: fein ? DREIECKE_FEIN : DREIECKE_ZUG, linien: zustand.linien, raumlinien: zustand.raum });
  } else if (zustand.ansichten) {
    gleich = gleichBauen(zustand.ansichten, fein);
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
  // Maul: der Anfang der Linie bleibt auf dem Umriss; geschnitten wird das fertige Netz
  if (zustand.maul) {
    const a = zustand.maul.punkte[0]!;
    const q = naechsterAufUmriss(a.x, a.y);
    zustand.maul.punkte[0] = { ...a, x: q.x, y: q.y };
    schnitt = maulSchneiden(n, zustand.maul, { zelle: n.zelle, kontur: n.kontur });
  } else {
    // ohne Maul steht der Regler wieder auf zu: eine neue Maullinie beginnt geschlossen
    schnitt = null;
    oeffnung = 0;
    maulEingabe.value = '0';
  }
  maulRegler.hidden = !schnitt;
  const ms = performance.now() - t0;
  letztesGleich = gleich?.g ?? null;
  letzteKontur = n.kontur ?? null;
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
    oeffnung,
    schnitt: schnitt ? { lippe: schnitt.lippeOben.length, innen: schnitt.innen.indizes.length / 3 } : null,
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

/**
 * Anfang und Ende einer Raumlinie liegen auf dem Umriss der Seite (dort treffen sich die Linie und der Umriss); zieht Florian
 * die Seite, gehen sie mit auf den nächsten Punkt des Umrisses.
 */
function raumEndenAufUmriss(): void {
  if (zustand.raum.length === 0) return;
  const u = umrissAbtasten(zustand.punkte, 2).punkte;
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
    umriss.visible = andere || zustand.ansichten !== null || NETZ || LINIEN || maulOffen();
    kanten.visible = andere;
    kantenHinten.visible = andere;
    lippen.visible = andere;
    lippenHinten.visible = andere;
    umrissMaterial.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
    umrissMaterial.uniforms.uBreite!.value = 2.5 * dpr;
    for (const m of [kanteSichtbar, kanteVerdeckt]) {
      m.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
      m.uniforms.uDpr!.value = dpr;
    }
    renderer.clearDepth();
    renderer.render(szene, kamera);
  }
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

function svgZeichnen(): void {
  const r = felder.seite.getBoundingClientRect();
  const s = skala();
  const w = r.width / s;
  const h = r.height / s;
  svg.setAttribute('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`);
  const stuecke = umrissStuecke(zustand.punkte);
  let d = `M ${stuecke[0]![0].x} ${-stuecke[0]![0].y}`;
  for (const k of stuecke) d += ` C ${k[1].x} ${-k[1].y} ${k[2].x} ${-k[2].y} ${k[3].x} ${-k[3].y}`;
  d += ' Z';
  svg.replaceChildren();
  const treffer = element('path', 'treffer', { d });
  treffer.dataset.linie = '';
  // gleichwertige Ansichten: die Zeichnung farbig, der Umriss des Modells (Shader) schwarz darüber; mit `?netz` zeichnet nur
  // der Shader, die Punkte sind Griffe auf seiner Linie
  svg.append(treffer);
  if (!NETZ && !LINIEN) svg.append(element('path', zustand.ansichten || maulOffen() ? 'vorgabe' : 'linie', { d }));
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
  // Maullinie: Strich und Trefferband; mit offenem Maul daneben die Unterlippe, gedreht wie im 3D; gewählt mit ihren Punkten
  if (zustand.maul) {
    const m = zustand.maul;
    const p = linieAbtasten({ punkte: m.punkte.map((q) => ({ ...q, breite: LIPPE })) }, 2 / s).p;
    const pfad = (q: readonly { x: number; y: number }[]) => q.map((r, i) => `${i ? 'L' : 'M'} ${r.x} ${-r.y}`).join(' ');
    const t = element('path', 'treffer-kante', { d: pfad(p) });
    t.dataset.maul = '';
    svg.append(t);
    svg.append(element('path', schnitt ? 'maul' : 'maul fehlt', { d: pfad(p) }));
    if (schnitt && oeffnung > 0) {
      const a = (schnitt.drehsinn * oeffnung * Math.PI) / 180;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const g = schnitt.gelenk;
      const unten = p.map((q) => ({ x: g.x + c * (q.x - g.x) - sn * (q.y - g.y), y: g.y + sn * (q.x - g.x) + c * (q.y - g.y) }));
      svg.append(element('path', 'maul unten', { d: pfad(unten) }));
    }
    if (auswahl?.art === 'maul' || auswahl?.art === 'mpunkt') {
      m.punkte.forEach((q, i) => {
        const an = auswahl?.art === 'maul' || (auswahl?.art === 'mpunkt' && auswahl.i === i);
        const klasse = `lpunkt${an ? ' gewaehlt' : ''}`;
        const e = q.ecke
          ? element('rect', klasse, { x: q.x - 0.8 * rp, y: -q.y - 0.8 * rp, width: 1.6 * rp, height: 1.6 * rp })
          : element('circle', klasse, { cx: q.x, cy: -q.y, r: 0.8 * rp });
        e.dataset.mpunkt = String(i);
        svg.append(e);
      });
    }
  }
  if ((zug?.art === 'zeichnen' || zug?.art === 'maul') && zug.spur.length > 1) {
    svg.append(element('path', 'entwurf', { d: zug.spur.map((q, i) => `${i ? 'L' : 'M'} ${q.x} ${-q.y}`).join(' ') }));
  }
  if (LINIEN) raumZeichnen(svg, 'seite');
  zustand.punkte.forEach((p, i) => {
    const an = auswahl?.art === 'umriss' && auswahl.i === i;
    const e = p.ecke
      ? element('rect', an ? 'punkt gewaehlt' : 'punkt', { x: p.x - rp, y: -p.y - rp, width: 2 * rp, height: 2 * rp })
      : element('circle', an ? 'punkt gewaehlt' : 'punkt', { cx: p.x, cy: -p.y, r: rp });
    e.dataset.punkt = String(i);
    svg.append(e);
  });
}

const welt = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
  const r = felder.seite.getBoundingClientRect();
  const s = skala();
  return { x: (e.clientX - r.left - r.width / 2) / s, y: -(e.clientY - r.top - r.height / 2) / s };
};

/** Nächste Stelle auf dem Umriss: Stück i und der Punkt darauf. */
function naechsteStelle(q: { x: number; y: number }): { i: number; x: number; y: number } {
  let best = Infinity;
  let bi = 0;
  let bx = 0;
  let by = 0;
  umrissStuecke(zustand.punkte).forEach((k, i) => {
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

/** Liegt der Punkt im gezeichneten Umriss? */
function imUmriss(q: { x: number; y: number }): boolean {
  const p = umrissAbtasten(zustand.punkte, 3).punkte;
  let innen = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i]!;
    const b = p[j]!;
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) innen = !innen;
  }
  return innen;
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
  svgZeichnen();
  profileZeichnen();
  bauGewuenscht = fein ? 'fein' : 'grob';
}

function umrissEcke(i: number): void {
  merken(kopie(zustand));
  zustand.punkte = zustand.punkte.map((p, j) => (j === i ? { x: p.x, y: p.y, ecke: !p.ecke } : p));
  geaendert();
}

function linienEcke(l: number, i: number): void {
  merken(kopie(zustand));
  const p = zustand.linien[l]!.punkte[i]!;
  zustand.linien[l]!.punkte[i] = { ...p, ecke: !p.ecke };
  geaendert();
}

function maulEcke(i: number): void {
  const m = zustand.maul;
  if (!m) return;
  merken(kopie(zustand));
  m.punkte[i] = { ...m.punkte[i]!, ecke: !m.punkte[i]!.ecke };
  geaendert();
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
  | { art: 'umriss'; i: number; vorher: Zustand; bewegt: boolean }
  // Punkt einer Linie auf der Form (`?linien`); die Seite bewegt x und y
  | { art: 'raum'; l: number; i: number; vorher: Zustand; bewegt: boolean }
  // zEnde: Tiefe des Punkts zu Beginn (gestreckt, wie Front und Top sie zeigen); die Seite bewegt nur x und y
  | { art: 'lpunkt'; l: number; i: number; vorher: Zustand; bewegt: boolean; zEnde: number | null }
  | { art: 'zeichnen'; spur: { x: number; y: number }[]; vorher: Zustand }
  // von außen über den Umriss in die Form: die Maullinie
  | { art: 'maul'; spur: { x: number; y: number }[]; vorher: Zustand }
  // Punkt der Maullinie (der erste gleitet auf dem Umriss)
  | { art: 'mpunkt'; i: number; vorher: Zustand; bewegt: boolean };
let zug: Zug | null = null;
// Doppelklick selbst zählen: die Punkte werden beim Drücken neu gezeichnet, das dblclick-Ziel ist dann weg
let letzterKlick: { schluessel: string; t: number } | null = null;
const doppelklick = (schluessel: string): boolean => {
  const jetzt = performance.now();
  const doppelt = letzterKlick !== null && letzterKlick.schluessel === schluessel && jetzt - letzterKlick.t < 400;
  letzterKlick = doppelt ? null : { schluessel, t: jetzt };
  return doppelt;
};

svg.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const d = (e.target as SVGElement).dataset;
  if (d.punkt !== undefined) {
    const i = Number(d.punkt);
    auswahl = { art: 'umriss', i };
    fuehrt('seite');
    if (doppelklick(`u${i}`) || e.altKey) {
      umrissEcke(i);
      return;
    }
    zug = { art: 'umriss', i, vorher: kopie(zustand), bewegt: false };
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
    const i = Number(d.mpunkt);
    auswahl = { art: 'mpunkt', i };
    if (doppelklick(`m${i}`) || e.altKey) {
      maulEcke(i);
      return;
    }
    zug = { art: 'mpunkt', i, vorher: kopie(zustand), bewegt: false };
  } else if (d.maul !== undefined) {
    auswahl = { art: 'maul' };
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
    const st = naechsteStelle(welt(e));
    zustand.punkte.splice(st.i + 1, 0, { x: st.x, y: st.y });
    merken(vorher);
    auswahl = { art: 'umriss', i: st.i + 1 };
    zug = { art: 'umriss', i: st.i + 1, vorher: kopie(zustand), bewegt: true };
    bauGewuenscht = 'fein';
  } else {
    const q = welt(e);
    auswahl = null;
    // auf der Form zeichnen: eine neue Linie; von außen über den Umriss hinein: die Maullinie
    if (imUmriss(q)) zug = { art: 'zeichnen', spur: [q], vorher: kopie(zustand) };
    else zug = { art: 'maul', spur: [q], vorher: kopie(zustand) };
  }
  svg.setPointerCapture(e.pointerId);
  svgZeichnen();
});

svg.addEventListener('pointermove', (e) => {
  if (!zug) return;
  const w = welt(e);
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
    const p = zustand.punkte[zug.i]!;
    zustand.punkte[zug.i] = { ...p, x: w.x, y: w.y };
    koppeln('seite', zug.i);
  } else if (zug.art === 'raum') {
    // die Seite bewegt x und y, die Tiefe bleibt; ein Knoten zieht die andere Linie mit
    const p = zustand.raum[zug.l]!.punkte[zug.i]!;
    punktSetzen(zustand.raum, zug.l, zug.i, { x: w.x, y: w.y, z: p.z });
  } else if (zug.art === 'mpunkt') {
    const m = zustand.maul;
    if (!m) return;
    const p = m.punkte[zug.i]!;
    // der Anfang gleitet auf dem Umriss
    const q = zug.i === 0 ? naechsterAufUmriss(w.x, w.y) : w;
    m.punkte[zug.i] = { ...p, x: q.x, y: q.y };
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
  if (zug?.art === 'maul') {
    const neu = maulAusSpur(zug.spur);
    if (neu) {
      merken(zug.vorher);
      zustand.maul = neu;
      auswahl = { art: 'maul' };
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
const profilVon = (b: Blatt): UmrissPunkt[] | null => zustand[b] ?? abgeleitet[b];

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
function profilFesthalten(b: Blatt): UmrissPunkt[] | null {
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
 * Füßen wäre die Wahl geraten und zöge ein Bein hoch).
 */
function koppeln(quelle: 'seite' | Blatt, i: number): void {
  // mit `?netz` folgen die anderen Ansichten dem Mesh selbst
  if (NETZ) return;
  const liste = (v: 'seite' | Blatt): UmrissPunkt[] | null => (v === 'seite' ? zustand.punkte : zustand[v]);
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
function profilStelle(b: Blatt, [l, q]: [number, number]): { i: number; l: number; q: number } | null {
  const h = profilVon(b);
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

/** Liegt der Zeiger in Front oder Top auf dem Umriss des Körpers (8 px)? */
function umrissNah(b: Blatt, e: { clientX: number; clientY: number }): boolean {
  const k = letzteKontur;
  if (!k) return false;
  const [lg, q] = profilWelt(b, e);
  const qa = Math.abs(q);
  const tol = 8 / skala();
  if (b === 'front') {
    for (let j = 0; j < k.ny; j++) if (k.frontZ[j]! > 0 && Math.hypot(k.frontZ[j]! - qa, k.y0 + j * k.d - lg) < tol) return true;
  } else {
    for (let i = 0; i < k.nx; i++) if (k.topZ[i]! > 0 && Math.hypot(k.topZ[i]! - qa, k.x0 + i * k.d - lg) < tol) return true;
  }
  return false;
}

/**
 * Den Umriss in Front oder Top angefasst: Die Linie, die er auf der Form zeigt (wo der Körper von dort gesehen am breitesten
 * ist), wird eine Raumlinie; wo sie eine andere kreuzt, teilen beide einen Punkt. Gibt Linie und Punkt unter dem Zeiger zurück.
 */
function umrissAnfassen(b: Blatt, e: { clientX: number; clientY: number }): { l: number; i: number } | null {
  const k = letzteKontur;
  if (!k) return null;
  // auf etwa 3 Einheiten genau: wenige Punkte zum Greifen (Punkte auf einem Kreis geben einen Kreis)
  const linie = umrissLinie(k, b, 3);
  if (!linie) return null;
  let n = 0;
  for (const l of zustand.raum) for (const p of l.punkte) n = Math.max(n, p.knoten ?? 0);
  for (const alt of zustand.raum) verbinden(linie, alt, () => ++n, 3 * k.d);
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
  // gezeichnet: die Hälfte als Linie, die Spiegelhälfte leiser; folgt die Ansicht noch dem Körper, zeigt der Shader den Umriss
  // und hier stehen nur die Punkte
  if (halb && zustand[b] && !NETZ) {
    el.append(element('path', 'spiegel', { d: pfad(halb.length - 1, stuecke.length) }));
    el.append(element('path', 'linie', { d: pfad(0, halb.length - 1) }));
  }
  const rp = 5 / s;
  if (LINIEN) raumZeichnen(el, b);
  halb?.forEach((q, i, alle) => {
    const [x, y] = zuBlatt(b, ...laengsQuer(b, q));
    // Anfang und Ende liegen auf der Mittelachse und gleiten nur auf ihr
    const achsig = i === 0 || i === alle.length - 1;
    const an = auswahl?.art === 'profil' && auswahl.blatt === b && auswahl.i === i;
    const klasse = `punkt${an ? ' gewaehlt' : ''}${achsig ? ' achse' : ''}`;
    const rr = achsig ? 0.8 * rp : rp;
    const e = q.ecke
      ? element('rect', klasse, { x: x - rr, y: y - rr, width: 2 * rr, height: 2 * rr })
      : element('circle', klasse, { cx: x, cy: y, r: rr });
    e.dataset.ppunkt = `${b}:${i}`;
    el.append(e);
  });
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

let profilZug: { blatt: Blatt; i: number; vorher: Zustand; bewegt: boolean } | null = null;
// Linienpunkt in Front oder Top ziehen: die Front bewegt nur y und z, das Top nur x und z
let linienZug: { blatt: Blatt; l: number; i: number; vorher: Zustand; bewegt: boolean } | null = null;
// Punkt einer Linie auf der Form (`?linien`) in Front oder Top ziehen: die Front bewegt y und z, das Top x und z
let raumZug: { blatt: Blatt; l: number; i: number; vorher: Zustand; bewegt: boolean } | null = null;
for (const b of ['front', 'top'] as const) {
  const el = profilSvg[b];
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if ((!LINIEN && !profilVon(b)) || zustand.ansichten) return;
    const d = (e.target as SVGElement).dataset;
    const vorher = kopie(zustand);
    if (d.rpunkt !== undefined) {
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
    } else if (LINIEN && d.lpunkt === undefined && d.kante === undefined && umrissNah(b, e)) {
      // den Umriss angefasst: dort eine Linie auf die Form legen (die Linie, die der Umriss zeigt) und ihren Punkt ziehen
      const neu = umrissAnfassen(b, e);
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
      auswahl = { art: 'profil', blatt: b, i };
      fuehrt(b);
      if (doppelklick(`${b}${i}`) || e.altKey) {
        merken(vorher);
        const q = profilFesthalten(b)!;
        q[i] = { ...q[i]!, ecke: !q[i]!.ecke };
        geaendert();
        return;
      }
      svgZeichnen();
      profileZeichnen();
      profilZug = { blatt: b, i, vorher, bewegt: false };
    } else if (d.profil !== undefined) {
      const st = profilStelle(b, profilWelt(b, e));
      if (!st) return;
      fuehrt(b);
      merken(vorher);
      profilFesthalten(b)!.splice(st.i + 1, 0, halbPunkt(b, st.l, st.q));
      auswahl = { art: 'profil', blatt: b, i: st.i + 1 };
      profilZug = { blatt: b, i: st.i + 1, vorher: kopie(zustand), bewegt: true };
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
    const h = profilFesthalten(b)!;
    const i = profilZug.i;
    // Anfang und Ende gleiten auf der Mittelachse, alle anderen bleiben auf ihrer Seite (z ≥ 0)
    const pt = halbPunkt(b, l, i === 0 || i === h.length - 1 ? 0 : Math.max(0, q));
    h[i] = h[i]!.ecke ? { ...pt, ecke: true } : pt;
    koppeln(b, i);
    geaendert(false);
  });
  const ende = (): void => {
    if (profilZug?.bewegt || linienZug?.bewegt || raumZug?.bewegt) bauGewuenscht = 'fein';
    profilZug = null;
    linienZug = null;
    raumZug = null;
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
    svgZeichnen();
    profileZeichnen();
    return;
  }
  // Strichdicke: [ ] (auf deutscher Tastatur ⌥5/⌥6 oder dieselben Tasten wie dort + und ü) oder + und −
  const mehr = e.key === ']' || e.key === '+' || e.code === 'BracketRight';
  const weniger = e.key === '[' || e.key === '-' || e.code === 'BracketLeft';
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
      if (zustand.punkte.length <= 3) return;
      merken(kopie(zustand));
      fuehrt('seite');
      zustand.punkte = zustand.punkte.filter((_, j) => j !== a.i);
    } else if (a.art === 'profil') {
      // Anfang und Ende auf der Achse bleiben, mindestens ein Punkt dazwischen
      const p = profilVon(a.blatt);
      if (!p || a.i === 0 || a.i === p.length - 1 || p.length <= 3) return;
      merken(kopie(zustand));
      fuehrt(a.blatt);
      profilFesthalten(a.blatt)?.splice(a.i, 1);
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
      // ein Punkt der Maullinie (nicht der Anfang auf dem Umriss) oder die ganze Linie
      const m = zustand.maul;
      if (!m) return;
      merken(kopie(zustand));
      if (a.art === 'mpunkt' && a.i > 0 && m.punkte.length > 2) m.punkte = m.punkte.filter((_, j) => j !== a.i);
      else zustand.maul = null;
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
  kanten,
  kantenHinten,
  zeichnen: () => {
    neuZeichnen = true;
  },
};

window.__formSetzen = (p, linien = [], front = null, top = null) => {
  merken(kopie(zustand));
  zustand = kopie({ punkte: p, linien, front, top, ansichten: null, raum: [], maul: null });
  auswahl = null;
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
  });
  auswahl = null;
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
  zustand = kopie({ punkte: h.seite, linien: [], front: h.front, top: h.top, ansichten: null, raum: [], maul: null });
  auswahl = null;
  geaendert();
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
        'Umriss anfassen: Linie auf die Form legen und ziehen · Klick auf eine Linie: neuer Punkt · Doppelklick: Ecke ↔ rund · ⌫ löschen';
    }
  }
}
if (NETZ) {
  const kopf = felder.seite.querySelector('header');
  if (kopf) kopf.textContent = 'Seite · Linien aus dem Netz';
}
// Regler „Maul“ im 3D-Blatt: nur die Ansicht, kein neuer Bau (die Drehung um den Mundwinkel ist schnell)
maulEingabe.max = String(MAUL_WINKEL_MAX);
const oeffnungSetzen = (w: number): void => {
  oeffnung = Math.max(0, Math.min(MAUL_WINKEL_MAX, w));
  maulEingabe.value = String(oeffnung);
  oeffnungAnwenden();
  svgZeichnen();
  if (window.__form) window.__form.oeffnung = oeffnung;
};
maulEingabe.addEventListener('input', () => oeffnungSetzen(Number(maulEingabe.value)));
// die 3D-Steuerung soll den Regler nicht als Drehen nehmen
for (const art of ['pointerdown', 'wheel'] as const) maulRegler.addEventListener(art, (e) => e.stopPropagation());
window.__formMaul = (linie) => {
  merken(kopie(zustand));
  zustand.maul = linie ? { punkte: linie.punkte.map((q) => ({ ...q })) } : null;
  auswahl = null;
  geaendert();
};
window.__formOeffnen = oeffnungSetzen;

// ?fall=kugel|beine|flossen|lappen|innen öffnet einen Prüffall für gleichwertige Ansichten
const fallAusAdresse = new URLSearchParams(location.search).get('fall');
if (fallAusAdresse && fallAusAdresse in PRUEFFAELLE) window.__formPruefall(fallAusAdresse as Prueffall);

svgZeichnen();
schleife();
