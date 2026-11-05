// Form zuerst (05.11.2026), Beweis „Kurven als Wahrheit“ (Fenster `kurven.html`, Florians Klarstellung Nachricht 3): ein dichtes
// Netz, das sich selbst erzeugt; bearbeitet werden nur Kurven auf der Form — der Startumriss als erster Loop, Loops um Kopf und
// Bauch —, ihre Punkte als Bézier-Punkte, mit Einflusskreis wie O in Blender. Der Umriss ist in allen Ansichten nur Ergebnis
// (Shader). Die Haut löst `HautLoeser` im Einflussbereich; außerhalb bleibt sie, wo sie ist. Start: `?form=kugel|bohne`.

import {
  type Anheftung,
  type Haut,
  HautLoeser,
  type Kurve,
  type UmrissPunkt,
  type V3,
  aufStueck,
  einfluss,
  einflussBereich,
  hautAus,
  hautNormalen,
  kurveAbtasten,
  kurveAnheften,
  kurveGanz,
  kurvenGriffe,
  kurvenStuecke,
  ringAusSchnitt,
  rundAusSeite,
  stelleAufKurve,
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

type Ansicht = 'seite' | 'front' | 'top';
/** Stelle auf dem Startumriss (Stück, Parameter): dort liegt ein Ende eines Loops */
type Stelle = { stueck: number; t: number };
type Zustand = {
  /** Kurve 0: der Startumriss (Mittelebene), danach Loops (Hälfte z ≥ 0) */
  kurven: Kurve[];
  /** je Loop: wo seine Enden auf dem Startumriss liegen (sie gehen mit ihm) */
  enden: ({ a: Stelle; b: Stelle } | null)[];
  anheftungen: { kurve: number; a: Anheftung }[];
};
type Wahl = { k: number; i: number };

const PAPIER = 0xefe9dd;
const KOERPER = 0xe2b98e;
const TINTE = 0x1f1a17;
const KURVE = 0x0e9f8e;
const KURVE_WAHL = 0x0a5f56;
/** So viele Welteinheiten passen in die kürzere Seite eines Blatts. */
const SICHT = 560;
/** bestellte Dreiecke der Haut (Surface Nets geben etwa das 1,5-Fache) */
const DREIECKE = 6000;
/** Abstand der Proben einer Kurve auf der Haut */
const PROBE = 4;
/** so genau folgt ein neuer Loop dem Schnitt (wenige Punkte) */
const RING_TOL = 2;
/** Runden je Mausbewegung und beim Loslassen */
const RUNDEN_ZUG = 2;
const RUNDEN_ENDE = 4;

const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
/** Kopf über Bauch: zwischen ihnen eine Einbuchtung von vorn (Schnauze links) */
const BOHNE: UmrissPunkt[] = [
  { x: 150, y: 0 },
  { x: 80, y: 130 },
  { x: -40, y: 150 },
  { x: -150, y: 120 },
  { x: -200, y: 60 },
  { x: -170, y: 22 },
  { x: -110, y: 24 },
  { x: -50, y: 15 },
  { x: -110, y: 4 },
  { x: -180, y: -40 },
  { x: -120, y: -130 },
  { x: 0, y: -150 },
  { x: 110, y: -110 },
];
const FORMEN: Record<string, UmrissPunkt[]> = { kugel: kreis(150), bohne: BOHNE };
const startUmriss = FORMEN[new URLSearchParams(location.search).get('form') ?? 'kugel'] ?? kreis(150);

// ---------- Haut und Kurven ----------

const netz = rundAusSeite(startUmriss, { dreiecke: DREIECKE });
const haut: Haut = hautAus(netz.positionen, netz.indizes);
const startLagen = Float64Array.from(haut.pos);
const mitte: Kurve = { art: 'mitte', punkte: startUmriss.map((q) => ({ x: q.x, y: q.y, z: 0 })) };
const z: Zustand = { kurven: [mitte], enden: [null], anheftungen: [{ kurve: 0, a: kurveAnheften(haut, mitte, PROBE) }] };

let auswahl: Wahl[] = [];
let oAn = false;
let radius = 90;
let loopAn = false;

type Schnappschuss = { z: Zustand; pos: Float64Array; auswahl: Wahl[] };
const zurueck: Schnappschuss[] = [];
const kopieKurve = (k: Kurve): Kurve => ({ art: k.art, punkte: k.punkte.map((p) => ({ ...p })) });
const schnappschuss = (): Schnappschuss => ({
  z: { kurven: z.kurven.map(kopieKurve), enden: [...z.enden], anheftungen: [...z.anheftungen] },
  pos: Float64Array.from(haut.pos),
  auswahl: [...auswahl],
});
function wiederherstellen(s: Schnappschuss): void {
  z.kurven = s.z.kurven;
  z.enden = s.z.enden;
  z.anheftungen = s.z.anheftungen;
  haut.pos.set(s.pos);
  auswahl = s.auswahl;
  allesZeigen();
}

/** Die Enden der Loops auf den Startumriss legen (sie gehen mit ihm). */
function endenNachfuehren(): void {
  const st = kurvenStuecke(z.kurven[0]!);
  z.enden.forEach((e, k) => {
    const ring = z.kurven[k];
    if (!e || !ring) return;
    const a = aufStueck(st[e.a.stueck]!, e.a.t);
    const b = aufStueck(st[e.b.stueck]!, e.b.t);
    const n = ring.punkte.length;
    ring.punkte[0] = { ...ring.punkte[0]!, x: a.x, y: a.y, z: 0 };
    ring.punkte[n - 1] = { ...ring.punkte[n - 1]!, x: b.x, y: b.y, z: 0 };
  });
}

const istEnde = (k: number, i: number): boolean => {
  const c = z.kurven[k];
  return !!c && c.art === 'ring' && (i === 0 || i === c.punkte.length - 1);
};
const abstandSym = (p: V3, q: V3): number => Math.min(Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z), Math.hypot(p.x - q.x, p.y - q.y, p.z + q.z));

/** Gewicht je Punkt: gewählte 1, mit O die anderen nach dem Abstand zum nächsten gewählten (Blender „glatt“). */
function gewichteFuer(wahl: readonly Wahl[]): Map<string, number> {
  const g = new Map<string, number>();
  const sel = wahl.map((w) => z.kurven[w.k]!.punkte[w.i]!);
  z.kurven.forEach((c, k) =>
    c.punkte.forEach((p, i) => {
      if (istEnde(k, i)) return;
      let w = wahl.some((s) => s.k === k && s.i === i) ? 1 : 0;
      if (w === 0 && oAn) for (const q of sel) w = Math.max(w, einfluss(abstandSym(p, q), radius));
      if (w > 0) g.set(`${k}:${i}`, w);
    }),
  );
  return g;
}

/** Stücke, die sich ändern, wenn sich diese Punkte bewegen (Loops, deren Ende auf einem davon liegt, ebenso). */
function geaenderteStuecke(punkte: Iterable<string>): Map<number, Set<number>> {
  const m = new Map<number, Set<number>>();
  const dazu = (k: number, s: number) => {
    const set = m.get(k) ?? new Set<number>();
    set.add(s);
    m.set(k, set);
  };
  for (const key of punkte) {
    const [k, i] = key.split(':').map(Number) as [number, number];
    const c = z.kurven[k]!;
    const n = c.punkte.length;
    if (c.art === 'mitte') {
      dazu(k, (i - 1 + n) % n);
      dazu(k, i);
    } else {
      if (i > 0) dazu(k, i - 1);
      if (i < n - 1) dazu(k, i);
    }
  }
  const m0 = m.get(0);
  if (m0) {
    z.enden.forEach((e, k) => {
      if (!e) return;
      const n = z.kurven[k]!.punkte.length;
      if (m0.has(e.a.stueck)) dazu(k, 0);
      if (m0.has(e.b.stueck)) dazu(k, n - 2);
    });
  }
  return m;
}

/**
 * Einflussbereich auf der Haut: um die Stücke, die sich ändern, so weit wie der Einflusskreis (mit O) bzw. so weit, wie die
 * gezogenen Punkte von ihren Nachbarn entfernt sind (ohne O; so weit ändert sich ihre Kurve).
 */
function bereichFuer(punkte: Iterable<string>, stuecke: Map<number, Set<number>>): { bereich: Uint8Array; r: number } {
  const zentren: V3[] = [];
  let r = 0;
  for (const key of punkte) {
    const [k, i] = key.split(':').map(Number) as [number, number];
    const c = z.kurven[k]!;
    const p = c.punkte[i]!;
    zentren.push(p);
    const n = c.punkte.length;
    for (const j of [i - 1, i + 1]) {
      const q = c.art === 'mitte' ? c.punkte[(j + n) % n] : c.punkte[j];
      if (q) r = Math.max(r, Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z));
    }
  }
  if (oAn) r = Math.max(r, radius);
  for (const [k, set] of stuecke) {
    const st = kurvenStuecke(z.kurven[k]!);
    for (const s of set) for (let j = 0; j <= 8; j++) zentren.push(aufStueck(st[s]!, j / 8));
  }
  return { bereich: einflussBereich(haut, zentren, r, z.anheftungen, stuecke), r };
}

// ---------- Darstellung ----------

const feld = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Feld fehlt: ${id}`);
  return e;
};
const felder = { seite: feld('feld-seite'), front: feld('feld-front'), top: feld('feld-top'), drei: feld('feld-3d') };
const blaetter: Record<Ansicht, SVGSVGElement> = {
  seite: document.getElementById('blatt-seite') as unknown as SVGSVGElement,
  front: document.getElementById('blatt-front') as unknown as SVGSVGElement,
  top: document.getElementById('blatt-top') as unknown as SVGSVGElement,
};
const leinwand = document.getElementById('leinwand') as HTMLCanvasElement;
const statusZeile = document.getElementById('status') as HTMLSpanElement;
const knopfLoop = document.getElementById('knopf-loop') as HTMLButtonElement;
const knopfO = document.getElementById('knopf-o') as HTMLButtonElement;

const renderer = new WebGLRenderer({ canvas: leinwand, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.autoClear = false;
const szene = new Scene();
const stufen = new DataTexture(new Uint8Array([70, 135, 200, 255]), 4, 1, RedFormat);
stufen.minFilter = NearestFilter;
stufen.magFilter = NearestFilter;
stufen.needsUpdate = true;
const umrissMaterial = new ShaderMaterial({
  uniforms: { uBreite: { value: 2.5 }, uAufloesung: { value: new Vector2(1, 1) }, uFarbe: { value: new Color(TINTE) } },
  vertexShader: /* glsl */ `
    uniform float uBreite;
    uniform vec2 uAufloesung;
    void main() {
      vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(normalMatrix * normal);
      vec2 richtung = (projectionMatrix * vec4(n, 0.0)).xy;
      float l = length(richtung);
      richtung = l > 1e-9 ? richtung / l : vec2(0.0);
      float kipp = clamp(length(n.xy) / 0.35, 0.0, 1.0);
      clip.xy += richtung * kipp * uBreite * 2.0 / uAufloesung * clip.w;
      gl_Position = clip;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uFarbe;
    void main() { gl_FragColor = vec4(uFarbe, 1.0); }
  `,
  side: BackSide,
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: 2,
});
/** Kurven im 3D: Bänder mit fester Pixelbreite, sichtbar kräftig, verdeckt blass */
const bandMaterial = (farbe: number, deckung: number): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      uAufloesung: { value: new Vector2(1, 1) },
      uDpr: { value: 1 },
      uFarbe: { value: new Color(farbe) },
      uDeckung: { value: deckung },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aAnderer;
      attribute float aSeite;
      attribute float aRichtung;
      attribute float aBreite;
      uniform vec2 uAufloesung;
      uniform float uDpr;
      void main() {
        vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec4 b = projectionMatrix * modelViewMatrix * vec4(aAnderer, 1.0);
        vec2 d = (b.xy / b.w - a.xy / a.w) * uAufloesung;
        float l = length(d);
        d = l > 1e-6 ? d / l : vec2(1.0, 0.0);
        vec2 quer = vec2(-d.y, d.x) * aRichtung;
        a.xy += quer * aSeite * aBreite * uDpr / uAufloesung * a.w;
        gl_Position = a;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFarbe;
      uniform float uDeckung;
      void main() { gl_FragColor = vec4(uFarbe, uDeckung); }
    `,
    transparent: deckung < 1,
    depthWrite: false,
    depthFunc: deckung < 1 ? GreaterDepth : LessEqualDepth,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
const bandMaterialien = [bandMaterial(KURVE, 1), bandMaterial(KURVE, 0.25), bandMaterial(KURVE_WAHL, 1), bandMaterial(KURVE_WAHL, 0.3)];

const hautGeometrie = new BufferGeometry();
const hautLagen = new Float32Array(haut.pos.length);
const hautNormalenPuffer = new Float32Array(haut.pos.length);
hautGeometrie.setAttribute('position', new BufferAttribute(hautLagen, 3));
hautGeometrie.setAttribute('normal', new BufferAttribute(hautNormalenPuffer, 3));
hautGeometrie.setIndex(new BufferAttribute(haut.tri, 1));
const koerper = new Mesh(hautGeometrie, new MeshToonMaterial({ color: KOERPER, gradientMap: stufen }));
const umriss = new Mesh(hautGeometrie, umrissMaterial);
umriss.renderOrder = 1;
const baender = bandMaterialien.map((m, i) => {
  const b = new Mesh(new BufferGeometry(), m);
  b.renderOrder = 2 + i;
  return b;
});
szene.add(koerper, umriss, ...baender);
const sonne = new DirectionalLight(0xffffff, 2.4);
sonne.position.set(0.9, 1.4, 1.1);
szene.add(sonne, new HemisphereLight(0xfff6e8, 0x9c8a74, 1.1));

const ortho = (x: number, y: number, zz: number, oben: [number, number, number]): OrthographicCamera => {
  const k = new OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  k.position.set(x, y, zz);
  k.up.set(...oben);
  k.lookAt(0, 0, 0);
  return k;
};
// Schnauze links: Seite von +z, Front von −x (vorn), Top von oben mit +z nach unten
const kameras: Record<Ansicht, OrthographicCamera> = {
  seite: ortho(0, 0, 3000, [0, 1, 0]),
  front: ortho(-3000, 0, 0, [0, 1, 0]),
  top: ortho(0, 3000, 0, [0, 0, -1]),
};
const dreiKamera = new PerspectiveCamera(30, 1, 20, 20000);
const steuerung = new OrbitControls(dreiKamera, felder.drei);
const BLICK = new Vector3(-0.5, 0.32, 0.8).normalize();
{
  const r = felder.drei.getBoundingClientRect();
  const fovV = (dreiKamera.fov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * (r.width / Math.max(1, r.height)));
  const abstand = (260 / Math.sin(Math.min(fovV, fovH) / 2)) * 1.12;
  dreiKamera.position.copy(BLICK).multiplyScalar(abstand);
  steuerung.target.set(0, 0, 0);
  steuerung.update();
}
let neuZeichnen = true;
steuerung.addEventListener('change', () => {
  neuZeichnen = true;
});

const skala = (): number => {
  const r = felder.seite.getBoundingClientRect();
  return Math.max(1e-6, Math.min(r.width, r.height) / SICHT);
};

/** Weltpunkt → Blattkoordinaten (Welteinheiten, y nach unten) */
const imBlatt = (a: Ansicht, p: V3): [number, number] => (a === 'seite' ? [p.x, -p.y] : a === 'front' ? [p.z, -p.y] : [p.x, p.z]);
/** Verschiebung im Blatt → Verschiebung in der Welt */
const inWelt = (a: Ansicht, dx: number, dy: number): V3 =>
  a === 'seite' ? { x: dx, y: -dy, z: 0 } : a === 'front' ? { x: 0, y: -dy, z: dx } : { x: dx, y: 0, z: dy };
const blattPunkt = (a: Ansicht, e: { clientX: number; clientY: number }): [number, number] => {
  const r = felder[a].getBoundingClientRect();
  const s = skala();
  return [(e.clientX - r.left - r.width / 2) / s, (e.clientY - r.top - r.height / 2) / s];
};

function hautZeigen(): void {
  const nor = hautNormalen(haut);
  for (let i = 0; i < haut.pos.length; i++) {
    hautLagen[i] = haut.pos[i]!;
    hautNormalenPuffer[i] = nor[i]!;
  }
  hautGeometrie.attributes.position!.needsUpdate = true;
  hautGeometrie.attributes.normal!.needsUpdate = true;
  hautGeometrie.computeBoundingSphere();
  neuZeichnen = true;
}

function bandGeometrie(linien: readonly { p: readonly V3[]; breite: number }[]): BufferGeometry {
  const pos: number[] = [];
  const anderer: number[] = [];
  const seite: number[] = [];
  const richtung: number[] = [];
  const breite: number[] = [];
  const ind: number[] = [];
  for (const l of linien) {
    for (let i = 0; i + 1 < l.p.length; i++) {
      const a = l.p[i]!;
      const b = l.p[i + 1]!;
      const v = pos.length / 3;
      for (const [p, q, r] of [
        [a, b, 1],
        [b, a, -1],
      ] as const) {
        for (const sd of [1, -1]) {
          pos.push(p.x, p.y, p.z);
          anderer.push(q.x, q.y, q.z);
          seite.push(sd);
          richtung.push(r);
          breite.push(l.breite);
        }
      }
      ind.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('aAnderer', new BufferAttribute(new Float32Array(anderer), 3));
  g.setAttribute('aSeite', new BufferAttribute(new Float32Array(seite), 1));
  g.setAttribute('aRichtung', new BufferAttribute(new Float32Array(richtung), 1));
  g.setAttribute('aBreite', new BufferAttribute(new Float32Array(breite), 1));
  g.setIndex(ind);
  return g;
}

const gewaehlteKurven = (): Set<number> => new Set(auswahl.map((w) => w.k));

function baenderZeigen(): void {
  const wahl = gewaehlteKurven();
  const normal: { p: V3[]; breite: number }[] = [];
  const gewaehlt: { p: V3[]; breite: number }[] = [];
  z.kurven.forEach((k, i) => (wahl.has(i) ? gewaehlt : normal).push({ p: kurveGanz(k, 3), breite: wahl.has(i) ? 3 : 2 }));
  const gN = bandGeometrie(normal);
  const gW = bandGeometrie(gewaehlt);
  for (const [i, g] of [gN, gN, gW, gW].entries()) {
    baender[i]!.geometry.dispose();
    baender[i]!.geometry = g;
  }
  neuZeichnen = true;
}

const NS = 'http://www.w3.org/2000/svg';
const element = (art: string, klasse: string, attr: Record<string, string | number>): SVGElement => {
  const e = document.createElementNS(NS, art);
  e.setAttribute('class', klasse);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, String(v));
  return e;
};
const pfad = (a: Ansicht, p: readonly V3[], spiegel = false): string =>
  p
    .map((q, i) => {
      const [x, y] = imBlatt(a, spiegel ? { ...q, z: -q.z } : q);
      return `${i ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

/** gezogene Punkte (für die Anzeige: mit O hell gefüllt, wie stark sie mitgehen) */
let bewegtAnzeige = new Map<string, number>();
let entwurf: [number, number, number, number] | null = null;

function blattZeichnen(a: Ansicht): void {
  const el = blaetter[a];
  const r = felder[a].getBoundingClientRect();
  const s = skala();
  const w = r.width / s;
  const h = r.height / s;
  el.setAttribute('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`);
  el.classList.toggle('loop', loopAn && a === 'seite');
  el.replaceChildren();
  const wahl = gewaehlteKurven();
  const rp = 4.5 / s;
  // Kurven: die gespeicherte Hälfte und (in Front und Top) ihr Spiegelbild
  z.kurven.forEach((k, ki) => {
    const p = kurveAbtasten(k, 3).p;
    if (k.art === 'mitte') p.push(p[0]!);
    const klasse = wahl.has(ki) ? 'kurve gewaehlt' : 'kurve';
    el.append(element('path', klasse, { d: pfad(a, p) }));
    if (k.art === 'ring' && a !== 'seite') el.append(element('path', `${klasse} spiegel`, { d: pfad(a, p, true) }));
  });
  // Punkte (in Front und Top auch gespiegelt), Enden der Loops fest
  z.kurven.forEach((k, ki) =>
    k.punkte.forEach((q, i) => {
      for (const m of a === 'seite' || q.z === 0 ? [false] : [false, true]) {
        const [x, y] = imBlatt(a, m ? { ...q, z: -q.z } : q);
        if (istEnde(ki, i)) {
          el.append(element('circle', 'kende', { cx: x, cy: y, r: rp * 0.6 }));
          continue;
        }
        const gew = auswahl.some((s2) => s2.k === ki && s2.i === i);
        const bew = !gew && bewegtAnzeige.has(`${ki}:${i}`);
        const c = element('circle', `kpunkt${gew ? ' gewaehlt' : bew ? ' bewegt' : ''}${m ? ' spiegel' : ''}`, { cx: x, cy: y, r: rp });
        c.setAttribute('data-k', String(ki));
        c.setAttribute('data-i', String(i));
        if (m) c.setAttribute('data-m', '1');
        el.append(c);
      }
    }),
  );
  // Griffe des einen gewählten Punkts (Bézier)
  const w0 = auswahl.length === 1 ? auswahl[0]! : null;
  if (w0 && !istEnde(w0.k, w0.i)) {
    const k = z.kurven[w0.k]!;
    const q = k.punkte[w0.i]!;
    const g = kurvenGriffe(k)[w0.i]!;
    const [qx, qy] = imBlatt(a, q);
    for (const welcher of ['ein', 'aus'] as const) {
      const v = g[welcher];
      if (Math.hypot(v.x, v.y, v.z) < 1e-6) continue;
      const [x, y] = imBlatt(a, { x: q.x + v.x, y: q.y + v.y, z: q.z + v.z });
      el.append(element('line', 'griff-linie', { x1: qx, y1: qy, x2: x, y2: y }));
      const gr = element('rect', 'griff', { x: x - rp * 0.7, y: y - rp * 0.7, width: rp * 1.4, height: rp * 1.4 });
      gr.setAttribute('data-g', welcher);
      el.append(gr);
    }
  }
  // Einflusskreis um den gezogenen bzw. gewählten Punkt
  if (oAn && w0) {
    const q = z.kurven[w0.k]!.punkte[w0.i]!;
    const [x, y] = imBlatt(a, zug?.mitte ?? q);
    el.append(element('circle', 'einfluss', { cx: x, cy: y, r: radius }));
  }
  if (entwurf && a === 'seite') {
    el.append(element('line', 'entwurf', { x1: entwurf[0], y1: entwurf[1], x2: entwurf[2], y2: entwurf[3] }));
  }
}

function allesZeigen(): void {
  hautZeigen();
  baenderZeigen();
  for (const a of ['seite', 'front', 'top'] as const) blattZeichnen(a);
  knopfLoop.setAttribute('aria-pressed', String(loopAn));
  knopfO.setAttribute('aria-pressed', String(oAn));
  knopfO.textContent = oAn ? `Einfluss O · ${Math.round(radius)}` : 'Einfluss O';
  statusZeigen();
}

// ---------- Messen ----------

const zeiten: number[] = [];
let letzteZerlegung = 0;
let letzterBereich = 0;
function statusZeigen(): void {
  const zug = zeiten.slice(-20);
  const ms = zug.length ? zug.reduce((s, v) => s + v, 0) / zug.length : 0;
  statusZeile.textContent =
    `${z.kurven.length - 1} Loops · ${haut.tri.length / 3} Dreiecke · Zug ${ms.toFixed(1)} ms · zerlegen ${letzteZerlegung} ms · ` +
    `Bereich ${letzterBereich} von ${haut.n}`;
}

// ---------- Ziehen ----------

type Zug = {
  ansicht: Ansicht;
  /** auf dem Spiegelbild gegriffen: die Tiefe läuft umgekehrt */
  spiegel: boolean;
  x0: number;
  y0: number;
  start: Kurve[];
  gewichte: Map<string, number>;
  griff: { k: number; i: number; welcher: 'ein' | 'aus'; ein: V3; aus: V3 } | null;
  loeser: HautLoeser;
  bewegt: boolean;
  vorher: Schnappschuss;
  /** Mitte des Einflusskreises (der gegriffene Punkt, wie er gerade liegt) */
  mitte: V3 | null;
};
let zug: Zug | null = null;

function loeserFuer(punkte: Iterable<string>): HautLoeser {
  const liste = [...punkte];
  const stuecke = geaenderteStuecke(liste);
  const { bereich } = bereichFuer(liste, stuecke);
  const l = new HautLoeser(haut, z.anheftungen, z.kurven, bereich);
  letzteZerlegung = l.zeitZerlegen;
  letzterBereich = l.anzahl;
  return l;
}

function loesen(runden: number): void {
  if (!zug) return;
  const t0 = performance.now();
  endenNachfuehren();
  zug.loeser.schritt(z.kurven, runden);
  zeiten.push(performance.now() - t0);
  if (zeiten.length > 200) zeiten.shift();
  hautZeigen();
  baenderZeigen();
}

function zugBeginnen(a: Ansicht, e: PointerEvent): void {
  const ziel = e.target as SVGElement;
  const [x0, y0] = blattPunkt(a, e);
  if (loopAn && a === 'seite') {
    entwurf = [x0, y0, x0, y0];
    blaetter[a].setPointerCapture(e.pointerId);
    return;
  }
  const g = ziel.getAttribute('data-g');
  const k = ziel.getAttribute('data-k');
  const vorher = schnappschuss();
  if (g && auswahl.length === 1) {
    const w = auswahl[0]!;
    const gr = kurvenGriffe(z.kurven[w.k]!)[w.i]!;
    const key = `${w.k}:${w.i}`;
    zug = {
      ansicht: a,
      spiegel: false,
      x0,
      y0,
      start: z.kurven.map(kopieKurve),
      gewichte: new Map(),
      griff: { k: w.k, i: w.i, welcher: g === 'ein' ? 'ein' : 'aus', ein: gr.ein, aus: gr.aus },
      loeser: loeserFuer([key]),
      bewegt: false,
      vorher,
      mitte: null,
    };
  } else if (k !== null) {
    const w = { k: Number(k), i: Number(ziel.getAttribute('data-i')) };
    const drin = auswahl.some((s) => s.k === w.k && s.i === w.i);
    if (e.shiftKey) auswahl = drin ? auswahl.filter((s) => s.k !== w.k || s.i !== w.i) : [...auswahl, w];
    else if (!drin) auswahl = [w];
    if (auswahl.length === 0) {
      allesZeigen();
      return;
    }
    const gewichte = gewichteFuer(auswahl);
    bewegtAnzeige = gewichte;
    const q = z.kurven[w.k]!.punkte[w.i]!;
    zug = {
      ansicht: a,
      spiegel: ziel.getAttribute('data-m') === '1',
      x0,
      y0,
      start: z.kurven.map(kopieKurve),
      gewichte,
      griff: null,
      loeser: loeserFuer(gewichte.keys()),
      bewegt: false,
      vorher,
      mitte: { ...q },
    };
  } else {
    auswahl = [];
    bewegtAnzeige = new Map();
    allesZeigen();
    return;
  }
  blaetter[a].setPointerCapture(e.pointerId);
  allesZeigen();
}

function zugWeiter(a: Ansicht, e: PointerEvent): void {
  const [x, y] = blattPunkt(a, e);
  if (entwurf) {
    entwurf = [entwurf[0], entwurf[1], x, y];
    blattZeichnen('seite');
    return;
  }
  if (!zug || zug.ansicht !== a) return;
  const d = inWelt(a, x - zug.x0, y - zug.y0);
  if (zug.spiegel) d.z = -d.z;
  if (!zug.bewegt && Math.hypot(d.x, d.y, d.z) * skala() < 2) return;
  zug.bewegt = true;
  if (zug.griff) {
    const { k, i, welcher } = zug.griff;
    const c = z.kurven[k]!;
    const alt = zug.griff[welcher];
    const neu = { x: alt.x + d.x, y: alt.y + d.y, z: c.art === 'mitte' ? 0 : alt.z + d.z };
    const anderer = welcher === 'ein' ? zug.griff.aus : zug.griff.ein;
    const ln = Math.hypot(neu.x, neu.y, neu.z) || 1;
    const la = Math.hypot(anderer.x, anderer.y, anderer.z);
    const gegen = { x: (-neu.x / ln) * la, y: (-neu.y / ln) * la, z: (-neu.z / ln) * la };
    c.punkte[i] = { ...c.punkte[i]!, ein: welcher === 'ein' ? neu : gegen, aus: welcher === 'aus' ? neu : gegen };
  } else {
    for (const [key, w] of zug.gewichte) {
      const [k, i] = key.split(':').map(Number) as [number, number];
      const s = zug.start[k]!.punkte[i]!;
      const c = z.kurven[k]!;
      // Punkte des Startumrisses bleiben in der Mittelebene; Loops nicht unter sie
      const nz = c.art === 'mitte' ? 0 : Math.max(0, s.z + w * d.z);
      c.punkte[i] = { ...c.punkte[i]!, x: s.x + w * d.x, y: s.y + w * d.y, z: nz };
    }
    const w0 = auswahl[0];
    if (w0) zug.mitte = { ...z.kurven[w0.k]!.punkte[w0.i]! };
  }
  loesen(RUNDEN_ZUG);
  for (const b of ['seite', 'front', 'top'] as const) blattZeichnen(b);
  statusZeigen();
}

function zugEnde(a: Ansicht): void {
  if (entwurf) {
    const [x0, y0, x1, y1] = entwurf;
    entwurf = null;
    loopAn = false;
    if (Math.hypot(x1 - x0, y1 - y0) * skala() > 6) loopSchneiden({ x: x0, y: -y0 }, { x: x1, y: -y1 });
    allesZeigen();
    return;
  }
  if (!zug || zug.ansicht !== a) return;
  if (zug.bewegt) {
    loesen(RUNDEN_ENDE);
    zurueck.push(zug.vorher);
  }
  zug = null;
  bewegtAnzeige = new Map();
  allesZeigen();
}

/** Loop schneiden: Ebene durch die gezogene Linie, senkrecht zur Seite; seine Enden auf den Startumriss. */
function loopSchneiden(a: { x: number; y: number }, b: { x: number; y: number }): void {
  const ring = ringAusSchnitt(haut, a, b, RING_TOL);
  if (!ring || ring.punkte.length < 3) return;
  const n = ring.punkte.length;
  const ea = stelleAufKurve(z.kurven[0]!, ring.punkte[0]!);
  const eb = stelleAufKurve(z.kurven[0]!, ring.punkte[n - 1]!);
  ring.punkte[0] = { x: ea.p.x, y: ea.p.y, z: 0 };
  ring.punkte[n - 1] = { x: eb.p.x, y: eb.p.y, z: 0 };
  zurueck.push(schnappschuss());
  const k = z.kurven.length;
  z.kurven.push(ring);
  z.enden.push({ a: { stueck: ea.stueck, t: ea.t }, b: { stueck: eb.stueck, t: eb.t } });
  z.anheftungen.push({ kurve: k, a: kurveAnheften(haut, ring, PROBE) });
  // den tiefsten Punkt wählen: von vorn und oben gleich greifbar
  let iMax = 1;
  ring.punkte.forEach((q, i) => {
    if (q.z > ring.punkte[iMax]!.z) iMax = i;
  });
  auswahl = [{ k, i: iMax }];
}

/** Doppelklick auf einen Punkt: Griffe wieder automatisch (rund aus den Nachbarn). */
function griffeAutomatisch(w: Wahl): void {
  const c = z.kurven[w.k]!;
  const p = c.punkte[w.i]!;
  if (!p.ein && !p.aus) return;
  zurueck.push(schnappschuss());
  const loeser = loeserFuer([`${w.k}:${w.i}`]);
  c.punkte[w.i] = { x: p.x, y: p.y, z: p.z };
  endenNachfuehren();
  loeser.schritt(z.kurven, RUNDEN_ENDE + RUNDEN_ZUG);
  allesZeigen();
}

for (const a of ['seite', 'front', 'top'] as const) {
  const el = blaetter[a];
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    zugBeginnen(a, e);
  });
  el.addEventListener('pointermove', (e) => zugWeiter(a, e));
  el.addEventListener('pointerup', () => zugEnde(a));
  el.addEventListener('pointercancel', () => zugEnde(a));
  el.addEventListener('dblclick', (e) => {
    const t = e.target as SVGElement;
    const k = t.getAttribute('data-k');
    if (k !== null) griffeAutomatisch({ k: Number(k), i: Number(t.getAttribute('data-i')) });
  });
}

knopfLoop.addEventListener('click', () => {
  loopAn = !loopAn;
  allesZeigen();
});
knopfO.addEventListener('click', () => {
  oAn = !oAn;
  allesZeigen();
});

window.addEventListener('keydown', (e) => {
  if (zug) return;
  const k = e.key.toLowerCase();
  if ((e.metaKey || e.ctrlKey) && k === 'z') {
    const s = zurueck.pop();
    if (s) wiederherstellen(s);
    e.preventDefault();
  } else if (k === 'l') {
    loopAn = !loopAn;
    allesZeigen();
  } else if (k === 'o') {
    oAn = !oAn;
    allesZeigen();
  } else if (e.key === '[' || e.key === ']') {
    radius = Math.max(10, Math.min(600, radius * (e.key === ']' ? 1.2 : 1 / 1.2)));
    allesZeigen();
  } else if (e.key === 'Escape') {
    loopAn = false;
    entwurf = null;
    auswahl = [];
    allesZeigen();
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    // einen Loop löschen (der Startumriss bleibt)
    const ks = [...gewaehlteKurven()].filter((k2) => k2 > 0).sort((p, q) => q - p);
    if (ks.length === 0) return;
    zurueck.push(schnappschuss());
    for (const k2 of ks) {
      z.kurven.splice(k2, 1);
      z.enden.splice(k2, 1);
      z.anheftungen = z.anheftungen.filter((h) => h.kurve !== k2).map((h) => (h.kurve > k2 ? { ...h, kurve: h.kurve - 1 } : h));
    }
    auswahl = [];
    allesZeigen();
  }
});

// ---------- Zeichnen ----------

function rendern(): void {
  const hoehe = window.innerHeight;
  const dpr = renderer.getPixelRatio();
  renderer.setScissorTest(false);
  renderer.setClearColor(PAPIER, 1);
  renderer.clear();
  renderer.setScissorTest(true);
  const s = skala();
  const liste: [keyof typeof felder, OrthographicCamera | PerspectiveCamera][] = [
    ['seite', kameras.seite],
    ['front', kameras.front],
    ['top', kameras.top],
    ['drei', dreiKamera],
  ];
  for (const [name, kamera] of liste) {
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
    // die Kurven zeichnen in den Blättern die SVG-Ebenen, im 3D die Bänder
    for (const b of baender) b.visible = name === 'drei';
    umrissMaterial.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
    umrissMaterial.uniforms.uBreite!.value = 2.5 * dpr;
    for (const m of bandMaterialien) {
      m.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
      m.uniforms.uDpr!.value = dpr;
    }
    renderer.clearDepth();
    renderer.render(szene, kamera);
  }
}

function schleife(): void {
  if (neuZeichnen) {
    neuZeichnen = false;
    rendern();
  }
  requestAnimationFrame(schleife);
}
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  allesZeigen();
});

allesZeigen();
schleife();

// Prüfhaken für Skripte: Zustand, Zeiten, Lagen, Bildschirmpunkte
(window as unknown as { __kurven: unknown }).__kurven = {
  stand: () => ({
    kurven: z.kurven.map(kopieKurve),
    enden: z.enden,
    punkte: haut.n,
    dreiecke: haut.tri.length / 3,
    auswahl,
    oAn,
    radius,
  }),
  zeiten: () => ({ zug: [...zeiten], zerlegen: letzteZerlegung, bereich: letzterBereich }),
  lagen: () => Array.from(haut.pos),
  startLagen: () => Array.from(startLagen),
  dreiecke: () => Array.from(haut.tri),
  /** Bildschirmpunkt eines Weltpunkts in einem Blatt */
  bild: (a: Ansicht, p: V3): { x: number; y: number } => {
    const r = felder[a].getBoundingClientRect();
    const s = skala();
    const [x, y] = imBlatt(a, p);
    return { x: r.left + r.width / 2 + x * s, y: r.top + r.height / 2 + y * s };
  },
  felder: () =>
    Object.fromEntries(
      Object.entries(felder).map(([k, f]) => {
        const r = f.getBoundingClientRect();
        return [k, { x: r.left, y: r.top, w: r.width, h: r.height }];
      }),
    ),
  setzeRadius: (r: number) => {
    radius = r;
    allesZeigen();
  },
  /** größte Abweichung eines Punkts vom Spiegelbild seines Partners (z → −z) */
  symmetrie: (): number => {
    let m = 0;
    for (let v = 0; v < haut.n; v++) {
      const w = haut.spiegel[v]!;
      if (w < 0) continue;
      const P = haut.pos;
      m = Math.max(m, Math.hypot(P[3 * v]! - P[3 * w]!, P[3 * v + 1]! - P[3 * w + 1]!, P[3 * v + 2]! + P[3 * w + 2]!));
    }
    return m;
  },
  /** Ausdehnung je Achse */
  masse: (): number[] => {
    const m = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
    for (let v = 0; v < haut.n; v++) {
      for (let c = 0; c < 3; c++) {
        m[2 * c] = Math.min(m[2 * c]!, haut.pos[3 * v + c]!);
        m[2 * c + 1] = Math.max(m[2 * c + 1]!, haut.pos[3 * v + c]!);
      }
    }
    return m.map((x) => Math.round(x * 10) / 10);
  },
};
