// Form zuerst (04.11.2026): Florian zeichnet die Seite und sieht sofort eine runde Form.
//
// Ein kleines eigenes Fenster neben dem Editor (form.html). In der Seite setzt und zieht er Punkte wie Vektorpunkte (glatt oder
// Ecke), daneben zeigen Front, Top und 3D dasselbe Modell. Deren Umrisse zeichnet ein Shader: die Rückseiten des Körpers, um
// eine feste Pixelbreite nach außen geschoben. Auf der Form gezeichnete Linien werden Kanten; ihre Strichdicke (0–3 px) ist
// die Härte, und Front, Top und 3D zeichnen sie mit (sichtbar schwarz, verdeckt blass). Die Linien bleiben, wo sie gezeichnet
// sind; zieht Florian den Umriss unter eine Linie, wächst die Form zu ihr (Wulst). Keine Regler, keine Chips.

import {
  BREITE_MAX,
  type BreitenPunkt,
  type DichtesNetz,
  type Kante3D,
  type KantenLinie,
  type UmrissPunkt,
  linieAbtasten,
  profilAusBreite,
  profilUmriss,
  punktAufStueck,
  rundAusSeite,
  umrissAbtasten,
  umrissStuecke,
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

/** Front und Top: halbe Profile über der Ausdehnung der Seite; null = folgt dem runden Körper (noch nicht angefasst) */
type Zustand = { punkte: UmrissPunkt[]; linien: KantenLinie[]; front: BreitenPunkt[] | null; top: BreitenPunkt[] | null };
type Blatt = 'front' | 'top';

declare global {
  interface Window {
    __form?: {
      punkte: UmrissPunkt[];
      linien: KantenLinie[];
      front: BreitenPunkt[] | null;
      top: BreitenPunkt[] | null;
      dreiecke: number;
      ms: number;
      zelle: number;
      fein: boolean;
    };
    /** Prüfhaken: eine Zeichnung setzen (wie ein Zug, mit Rückgängig) */
    __formSetzen?: (p: UmrissPunkt[], linien?: KantenLinie[], front?: BreitenPunkt[] | null, top?: BreitenPunkt[] | null) => void;
  }
}

const PAPIER = 0xefe9dd;
const KOERPER = 0xe2b98e;
const TINTE = 0x1f1a17;
/** So viele Welteinheiten passen in die kürzere Seite eines Blatts. */
const SICHT = 560;
// Surface Nets geben etwa das 1,5-Fache der bestellten Dreiecke
const DREIECKE_FEIN = 40000;
const DREIECKE_ZUG = 6000;
/** Strichdicke einer neu gezeichneten Linie (px) */
const BREITE_NEU = 2;

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

let zustand: Zustand = { punkte: kreis(150), linien: [], front: null, top: null };
type Auswahl =
  | { art: 'umriss'; i: number }
  | { art: 'linie'; l: number }
  | { art: 'lpunkt'; l: number; i: number }
  | { art: 'profil'; blatt: Blatt; i: number }
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
umriss.renderOrder = 1;
kanten.renderOrder = 2;
kantenHinten.renderOrder = 3;
szene.add(koerper, umriss, kanten, kantenHinten);
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

function geometrieSetzen(n: DichtesNetz): void {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(n.positionen, 3));
  g.setAttribute('normal', new BufferAttribute(n.normalen, 3));
  g.setIndex(new BufferAttribute(n.indizes, 1));
  g.computeBoundingSphere();
  const alt = koerper.geometry;
  koerper.geometry = g;
  umriss.geometry = g;
  alt.dispose();
  const k = kantenGeometrie(n.kanten);
  const altK = kanten.geometry;
  kanten.geometry = k;
  kantenHinten.geometry = k;
  altK.dispose();
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

/** Umrisse von Front und Top des letzten Baus samt Ausdehnung der Seite; daraus die Profile, solange sie dem Körper folgen */
let ansichten: DichtesNetz['ansichten'] | null = null;
const abgeleitet: Record<Blatt, BreitenPunkt[] | null> = { front: null, top: null };

let bauGewuenscht: 'grob' | 'fein' | null = 'fein';
function bauen(fein: boolean): void {
  const t0 = performance.now();
  const n = rundAusSeite(zustand.punkte, {
    dreiecke: fein ? DREIECKE_FEIN : DREIECKE_ZUG,
    linien: zustand.linien,
    front: zustand.front,
    top: zustand.top,
  });
  const ms = performance.now() - t0;
  geometrieSetzen(n);
  if (fein && !kameraBewegt) einrahmen();
  ansichten = n.ansichten;
  const s = n.ansichten.seite;
  // auf etwa 2 px genau, höchstens 6 Punkte: wenige Punkte zum Greifen statt einer Perlenkette
  abgeleitet.front = profilAusBreite(n.ansichten.front, s.yMin, s.yMax, 3);
  abgeleitet.top = profilAusBreite(n.ansichten.top, s.xMin, s.xMax, 3);
  profileZeichnen();
  const k = kopie(zustand);
  window.__form = { punkte: k.punkte, linien: k.linien, front: k.front, top: k.top, dreiecke: n.indizes.length / 3, ms, zelle: n.zelle, fein };
  neuZeichnen = true;
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
    umriss.visible = andere;
    kanten.visible = andere;
    kantenHinten.visible = andere;
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
  svg.append(treffer, element('path', 'linie', { d }));
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
  if (zug?.art === 'zeichnen' && zug.spur.length > 1) {
    svg.append(element('path', 'entwurf', { d: zug.spur.map((q, i) => `${i ? 'L' : 'M'} ${q.x} ${-q.y}`).join(' ') }));
  }
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

/** Strichdicke der Auswahl ändern (ganze Linie oder ein Punkt). */
function breiteSetzen(f: (b: number) => number): void {
  if (!auswahl || auswahl.art === 'umriss' || auswahl.art === 'profil') return;
  merken(kopie(zustand));
  const l = zustand.linien[auswahl.l]!;
  const a = auswahl;
  l.punkte = l.punkte.map((p, i) => (a.art === 'linie' || a.i === i ? { ...p, breite: Math.max(0, Math.min(BREITE_MAX, f(p.breite))) } : p));
  geaendert();
}

type Zug =
  | { art: 'umriss'; i: number; vorher: Zustand; bewegt: boolean }
  | { art: 'lpunkt'; l: number; i: number; vorher: Zustand; bewegt: boolean }
  | { art: 'zeichnen'; spur: { x: number; y: number }[]; vorher: Zustand };
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
    if (doppelklick(`u${i}`) || e.altKey) {
      umrissEcke(i);
      return;
    }
    zug = { art: 'umriss', i, vorher: kopie(zustand), bewegt: false };
  } else if (d.lpunkt !== undefined) {
    const [l, i] = d.lpunkt.split(':').map(Number) as [number, number];
    auswahl = { art: 'lpunkt', l, i };
    if (doppelklick(`l${l}:${i}`) || e.altKey) {
      linienEcke(l, i);
      return;
    }
    zug = { art: 'lpunkt', l, i, vorher: kopie(zustand), bewegt: false };
  } else if (d.kante !== undefined) {
    auswahl = { art: 'linie', l: Number(d.kante) };
  } else if (d.linie !== undefined) {
    const vorher = kopie(zustand);
    const st = naechsteStelle(welt(e));
    zustand.punkte.splice(st.i + 1, 0, { x: st.x, y: st.y });
    merken(vorher);
    auswahl = { art: 'umriss', i: st.i + 1 };
    zug = { art: 'umriss', i: st.i + 1, vorher: kopie(zustand), bewegt: true };
    bauGewuenscht = 'fein';
  } else {
    const q = welt(e);
    auswahl = null;
    // auf der Form zeichnen: eine neue Linie
    if (imUmriss(q)) zug = { art: 'zeichnen', spur: [q], vorher: kopie(zustand) };
  }
  svg.setPointerCapture(e.pointerId);
  svgZeichnen();
});

svg.addEventListener('pointermove', (e) => {
  if (!zug) return;
  const w = welt(e);
  if (zug.art === 'zeichnen') {
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
  } else {
    const l = zustand.linien[zug.l]!;
    const p = l.punkte[zug.i]!;
    l.punkte[zug.i] = { ...p, x: w.x, y: w.y };
  }
  geaendert(false);
});

const zugEnde = (): void => {
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
// Halbe Profile (spiegelgleich zur Mittelebene) über der Ausdehnung der Seite: Front über der Höhe, Top über der Länge. Solange
// Florian ein Profil nicht anfasst, folgt es dem Körper (nur Punkte auf dem Umriss des Shaders); der erste Griff übernimmt es.

/** Achse eines Profils in Welt-Einheiten, aus dem letzten Bau */
const achse = (b: Blatt): [number, number] | null => {
  if (!ansichten) return null;
  const s = ansichten.seite;
  return b === 'front' ? [s.yMin, s.yMax] : [s.xMin, s.xMax];
};
/** (längs, quer) → Blatt (SVG, y nach unten): Front zeigt z nach rechts und y nach oben, Top x nach rechts und z nach unten */
const zuBlatt = (b: Blatt, l: number, q: number): [number, number] => (b === 'front' ? [q, -l] : [l, q]);
const ausBlatt = (b: Blatt, x: number, y: number): [number, number] => (b === 'front' ? [-y, x] : [x, y]);
const profilVon = (b: Blatt): BreitenPunkt[] | null => zustand[b] ?? abgeleitet[b];

/** Zeiger im Blatt → (längs, quer) in Welt-Einheiten */
const profilWelt = (b: Blatt, e: { clientX: number; clientY: number }): [number, number] => {
  const r = felder[b].getBoundingClientRect();
  const s = skala();
  return ausBlatt(b, (e.clientX - r.left - r.width / 2) / s, (e.clientY - r.top - r.height / 2) / s);
};

/** Das Profil zum Bearbeiten: folgt es noch dem Körper, wird es jetzt übernommen. */
function profilFesthalten(b: Blatt): BreitenPunkt[] | null {
  if (!zustand[b]) {
    const a = abgeleitet[b];
    if (!a) return null;
    zustand[b] = a.map((q) => ({ ...q }));
  }
  return zustand[b];
}

/**
 * Front und Top teilen die größte Breite des Körpers. Ändert sie sich in einem Blatt, folgt im anderen nur der breiteste
 * Punkt (wenn es dort gezeichnet ist; sonst folgt es ohnehin dem Körper).
 */
function koppeln(b: Blatt): void {
  const p = zustand[b];
  const q = zustand[b === 'front' ? 'top' : 'front'];
  if (!p || !q) return;
  let m = 0;
  for (const x of p) m = Math.max(m, x.quer);
  let k = -1;
  for (let i = 1; i < q.length - 1; i++) if (k < 0 || q[i]!.quer > q[k]!.quer) k = i;
  if (k >= 0) q[k] = { ...q[k]!, quer: m };
}

/** Nächste Stelle auf der gezeichneten Hälfte (ein Klick auf die gespiegelte Hälfte zählt für sie): Stück i und Punkt. */
function profilStelle(b: Blatt, [l, q]: [number, number]): { i: number; laengs: number; quer: number } | null {
  const p = profilVon(b);
  const ax = achse(b);
  if (!p || !ax) return null;
  const L = ax[1] - ax[0];
  const stuecke = umrissStuecke(profilUmriss(p, ax[0], ax[1]));
  const qa = Math.abs(q);
  let best = Infinity;
  let st = { i: 0, laengs: 0, quer: 0 };
  for (let i = 0; i < p.length - 1; i++) {
    for (let j = 1; j < 40; j++) {
      const pt = punktAufStueck(stuecke[i]!, j / 40);
      const d = Math.hypot(pt.x - l, pt.y - qa);
      if (d < best) {
        best = d;
        st = { i, laengs: (pt.x - ax[0]) / L, quer: Math.max(0, pt.y) };
      }
    }
  }
  return st;
}

function profilZeichnen(b: Blatt): void {
  const el = profilSvg[b];
  const r = felder[b].getBoundingClientRect();
  const s = skala();
  const w = r.width / s;
  const h = r.height / s;
  el.setAttribute('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`);
  el.replaceChildren();
  const p = profilVon(b);
  const ax = achse(b);
  if (!p || p.length < 2 || !ax) return;
  const pt = (q: { x: number; y: number }) => zuBlatt(b, q.x, q.y).join(' ');
  const stuecke = umrissStuecke(profilUmriss(p, ax[0], ax[1]));
  let d = `M ${pt(stuecke[0]![0])}`;
  for (const k of stuecke) d += ` C ${pt(k[1])} ${pt(k[2])} ${pt(k[3])}`;
  d += ' Z';
  const treffer = element('path', 'treffer', { d });
  treffer.dataset.profil = b;
  el.append(treffer);
  // gezeichnet: die Linie; folgt das Profil noch dem Körper, zeigt der Shader den Umriss und hier stehen nur die Punkte
  if (zustand[b]) el.append(element('path', 'linie', { d }));
  const rp = 5 / s;
  const L = ax[1] - ax[0];
  p.forEach((q, i) => {
    const [x, y] = zuBlatt(b, ax[0] + q.laengs * L, q.quer);
    const fest = i === 0 || i === p.length - 1;
    const an = auswahl?.art === 'profil' && auswahl.blatt === b && auswahl.i === i;
    const klasse = `punkt${an ? ' gewaehlt' : ''}${fest ? ' fest' : ''}`;
    const rr = fest ? 0.7 * rp : rp;
    const e = q.ecke
      ? element('rect', klasse, { x: x - rr, y: y - rr, width: 2 * rr, height: 2 * rr })
      : element('circle', klasse, { cx: x, cy: y, r: rr });
    e.dataset.ppunkt = `${b}:${i}`;
    el.append(e);
  });
}
function profileZeichnen(): void {
  profilZeichnen('front');
  profilZeichnen('top');
}

let profilZug: { blatt: Blatt; i: number; vorher: Zustand; bewegt: boolean } | null = null;
for (const b of ['front', 'top'] as const) {
  const el = profilSvg[b];
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const p = profilVon(b);
    if (!p || !achse(b)) return;
    const d = (e.target as SVGElement).dataset;
    const vorher = kopie(zustand);
    if (d.ppunkt !== undefined) {
      const i = Number(d.ppunkt.split(':')[1]);
      auswahl = { art: 'profil', blatt: b, i };
      if (doppelklick(`${b}${i}`) || e.altKey) {
        merken(vorher);
        const q = profilFesthalten(b)!;
        q[i] = { ...q[i]!, ecke: !q[i]!.ecke };
        geaendert();
        return;
      }
      svgZeichnen();
      profileZeichnen();
      // die Enden liegen auf der Achse fest
      if (i === 0 || i === p.length - 1) return;
      profilZug = { blatt: b, i, vorher, bewegt: false };
    } else if (d.profil !== undefined) {
      const st = profilStelle(b, profilWelt(b, e));
      if (!st) return;
      merken(vorher);
      profilFesthalten(b)!.splice(st.i + 1, 0, { laengs: st.laengs, quer: st.quer });
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
    const ax = achse(b);
    if (!profilZug || profilZug.blatt !== b || !ax) return;
    if (!profilZug.bewegt) {
      merken(profilZug.vorher);
      profilZug.bewegt = true;
      letzterKlick = null;
    }
    const [l, q] = profilWelt(b, e);
    const p = profilFesthalten(b)!;
    const i = profilZug.i;
    // ein Punkt bleibt zwischen seinen Nachbarn: ein Breitenprofil faltet sich nicht über sich selbst
    const lo = p[i - 1]!.laengs + 0.01;
    const hi = p[i + 1]!.laengs - 0.01;
    p[i] = { ...p[i]!, laengs: Math.max(lo, Math.min(hi, (l - ax[0]) / (ax[1] - ax[0]))), quer: Math.max(0, q) };
    koppeln(b);
    geaendert(false);
  });
  const ende = (): void => {
    if (profilZug?.bewegt) bauGewuenscht = 'fein';
    profilZug = null;
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
      zustand.punkte = zustand.punkte.filter((_, j) => j !== a.i);
    } else if (a.art === 'profil') {
      // Enden auf der Achse bleiben, mindestens ein Punkt dazwischen
      const p = profilVon(a.blatt);
      if (!p || a.i === 0 || a.i === p.length - 1 || p.length <= 3) return;
      merken(kopie(zustand));
      profilFesthalten(a.blatt)?.splice(a.i, 1);
      koppeln(a.blatt);
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
  zustand = kopie({ punkte: p, linien, front, top });
  auswahl = null;
  geaendert();
};

svgZeichnen();
schleife();
