// Form zuerst (04.11.2026): Florian zeichnet die Seite und sieht sofort eine runde Form.
//
// Ein kleines eigenes Fenster neben dem Editor (form.html). In der Seite setzt und zieht er Punkte wie Vektorpunkte (glatt oder
// Ecke), daneben zeigen Front, Top und 3D dasselbe Modell. Deren Umrisse zeichnet ein Shader: die Rückseiten des Körpers, um
// eine feste Pixelbreite nach außen geschoben. Keine Regler, keine Chips.

import { type DichtesNetz, type UmrissPunkt, rundAusSeite, umrissStuecke } from '@ee/shape/dicht';
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  HemisphereLight,
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

declare global {
  interface Window {
    __form?: { punkte: UmrissPunkt[]; dreiecke: number; ms: number; zelle: number; fein: boolean };
    /** Prüfhaken: eine Zeichnung setzen (wie ein Zug, mit Rückgängig) */
    __formSetzen?: (p: UmrissPunkt[]) => void;
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

// ---------- Zustand ----------

let punkte: UmrissPunkt[] = kreis(150);
let auswahl = -1;
const zurueck: UmrissPunkt[][] = [];
const vor: UmrissPunkt[][] = [];
const kopie = (p: readonly UmrissPunkt[]): UmrissPunkt[] => p.map((q) => ({ ...q }));
function merken(stand: UmrissPunkt[]): void {
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
const koerper = new Mesh(new BufferGeometry(), koerperMaterial);
const umriss = new Mesh(koerper.geometry, umrissMaterial);
szene.add(koerper, umriss);
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
}

let bauGewuenscht: 'grob' | 'fein' | null = 'fein';
function bauen(fein: boolean): void {
  const t0 = performance.now();
  const n = rundAusSeite(punkte, { dreiecke: fein ? DREIECKE_FEIN : DREIECKE_ZUG });
  const ms = performance.now() - t0;
  geometrieSetzen(n);
  if (fein && !kameraBewegt) einrahmen();
  window.__form = { punkte: kopie(punkte), dreiecke: n.indizes.length / 3, ms, zelle: n.zelle, fein };
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
    // in der Seite ist die gezeichnete Linie der Umriss; der Shader zeichnet ihn in den anderen Blättern
    umriss.visible = name !== 'seite';
    umrissMaterial.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
    umrissMaterial.uniforms.uBreite!.value = 2.5 * dpr;
    renderer.clearDepth();
    renderer.render(szene, kamera);
  }
}

// ---------- Seite zeichnen ----------

const NS = 'http://www.w3.org/2000/svg';
function svgZeichnen(): void {
  const r = felder.seite.getBoundingClientRect();
  const s = skala();
  const w = r.width / s;
  const h = r.height / s;
  svg.setAttribute('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`);
  const stuecke = umrissStuecke(punkte);
  let d = `M ${stuecke[0]![0].x} ${-stuecke[0]![0].y}`;
  for (const k of stuecke) d += ` C ${k[1].x} ${-k[1].y} ${k[2].x} ${-k[2].y} ${k[3].x} ${-k[3].y}`;
  d += ' Z';
  svg.replaceChildren();
  const treffer = document.createElementNS(NS, 'path');
  treffer.setAttribute('d', d);
  treffer.setAttribute('class', 'treffer');
  treffer.dataset.linie = '';
  const linie = document.createElementNS(NS, 'path');
  linie.setAttribute('d', d);
  linie.setAttribute('class', 'linie');
  svg.append(treffer, linie);
  const rp = 5 / s;
  punkte.forEach((p, i) => {
    let e: SVGElement;
    if (p.ecke) {
      e = document.createElementNS(NS, 'rect');
      e.setAttribute('x', String(p.x - rp));
      e.setAttribute('y', String(-p.y - rp));
      e.setAttribute('width', String(2 * rp));
      e.setAttribute('height', String(2 * rp));
    } else {
      e = document.createElementNS(NS, 'circle');
      e.setAttribute('cx', String(p.x));
      e.setAttribute('cy', String(-p.y));
      e.setAttribute('r', String(rp));
    }
    e.setAttribute('class', i === auswahl ? 'punkt gewaehlt' : 'punkt');
    e.dataset.punkt = String(i);
    svg.append(e);
  });
}

const welt = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
  const r = felder.seite.getBoundingClientRect();
  const s = skala();
  return { x: (e.clientX - r.left - r.width / 2) / s, y: -(e.clientY - r.top - r.height / 2) / s };
};

/** Nächste Stelle auf der Linie: Stück i und der Punkt darauf. */
function naechsteStelle(q: { x: number; y: number }): { i: number; x: number; y: number } {
  let best = Infinity;
  let bi = 0;
  let bx = 0;
  let by = 0;
  umrissStuecke(punkte).forEach((k, i) => {
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

function ecke(i: number): void {
  merken(kopie(punkte));
  punkte = punkte.map((p, j) => (j === i ? { x: p.x, y: p.y, ecke: !p.ecke } : p));
  svgZeichnen();
  bauGewuenscht = 'fein';
}

let zug: { i: number; vorher: UmrissPunkt[]; bewegt: boolean } | null = null;
// Doppelklick selbst zählen: die Punkte werden beim Drücken neu gezeichnet, das dblclick-Ziel ist dann weg
let letzterKlick: { i: number; t: number } | null = null;

svg.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const ziel = e.target as SVGElement;
  if (ziel.dataset.punkt !== undefined) {
    const i = Number(ziel.dataset.punkt);
    auswahl = i;
    const jetzt = performance.now();
    const doppelt = letzterKlick !== null && letzterKlick.i === i && jetzt - letzterKlick.t < 400;
    letzterKlick = doppelt ? null : { i, t: jetzt };
    if (e.altKey || doppelt) {
      ecke(i);
      return;
    }
    zug = { i, vorher: kopie(punkte), bewegt: false };
  } else if (ziel.dataset.linie !== undefined) {
    const vorher = kopie(punkte);
    const st = naechsteStelle(welt(e));
    punkte.splice(st.i + 1, 0, { x: st.x, y: st.y });
    merken(vorher);
    auswahl = st.i + 1;
    zug = { i: st.i + 1, vorher: kopie(punkte), bewegt: true };
    bauGewuenscht = 'fein';
  } else {
    auswahl = -1;
  }
  svg.setPointerCapture(e.pointerId);
  svgZeichnen();
});

svg.addEventListener('pointermove', (e) => {
  if (!zug) return;
  if (!zug.bewegt) {
    merken(zug.vorher);
    zug.bewegt = true;
    letzterKlick = null;
  }
  const w = welt(e);
  const p = punkte[zug.i]!;
  punkte[zug.i] = { ...p, x: w.x, y: w.y };
  svgZeichnen();
  bauGewuenscht = 'grob';
});

const zugEnde = (): void => {
  if (zug?.bewegt) bauGewuenscht = 'fein';
  zug = null;
};
svg.addEventListener('pointerup', zugEnde);
svg.addEventListener('pointercancel', zugEnde);

window.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    const von = e.shiftKey ? vor : zurueck;
    const nach = e.shiftKey ? zurueck : vor;
    const stand = von.pop();
    if (!stand) return;
    nach.push(kopie(punkte));
    punkte = stand;
    auswahl = -1;
    svgZeichnen();
    bauGewuenscht = 'fein';
    return;
  }
  if ((e.key === 'Backspace' || e.key === 'Delete') && auswahl >= 0 && punkte.length > 3) {
    e.preventDefault();
    merken(kopie(punkte));
    punkte = punkte.filter((_, j) => j !== auswahl);
    auswahl = -1;
    svgZeichnen();
    bauGewuenscht = 'fein';
  }
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if (!kameraBewegt) einrahmen();
  svgZeichnen();
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

window.__formSetzen = (p) => {
  merken(kopie(punkte));
  punkte = kopie(p);
  auswahl = -1;
  svgZeichnen();
  bauGewuenscht = 'fein';
};

svgZeichnen();
schleife();
