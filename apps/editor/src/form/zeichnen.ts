// Prüffenster „Zeichnen“ (08.11.2026, Plan `docs/plans/2026-11-08-zeichnen-aufblasen-anbauen.md`, Schritte Z0 und Z1).
//
// Florian: „eine kleine elegante werkzeugleiste mit freihand zeichnen (n in illustrator mit sehr geglättetem stroke). Es soll sich
// anfühlen als würde man in photoshop mit einem harten pinsel mit 100% glättung zeichnen. Dabei nur die allernötigsten handlepunkte
// setzen. Dann werkzeug P von illustrator … ich will damit bereits die erste form von der seite zeichnen können. Es soll vorgegebene
// Formen wie kreis und ellipse geben und rechteck/quadrat … die dann aufgeblasen wird wie bei teddy oder fibermesh.“
//
// Eigenes Fenster im Aufbau von `kurven.html` (vier Blätter, Umriss per Shader, gleiche Farben), damit die laufende Arbeit an
// `kurven.ts` (Haut, Kurven, Griffe) nicht gestört wird; in den Editor kommt es nach Absprache. Gezeichnet wird die Seite; die Form
// wird wie im Editor mit `rundAusSeite` aufgeblasen (Kern unverändert, der Pfad geht dicht abgetastet hinein). Bleistift, Faden und
// Formen rechnen in `@ee/shape/zeichnen`; die Maße des Bleistifts sind Bildschirm-Pixel, damit er sich bei jedem Zoom gleich anfühlt.

import { type DichtesNetz, rundAusSeite } from '@ee/shape/dicht';
import {
  type Anker,
  type Anpassung,
  type Glaettung,
  type Pfad,
  Faden,
  Nachlauf,
  fadenRund,
  ankerEinfuegen,
  anpassen,
  ellipse,
  naechsteStelle,
  pfadKopie,
  rahmen,
  rechteck,
  schneidetSich,
  stueckZwischen,
  stuecke,
  umrissPunkte,
} from '@ee/shape/zeichnen';
import type { V2 } from '@ee/shape';
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
import { istTrackpad, radFaktor } from '../viewports/ansicht2d';

type Werkzeug = 'auswahl' | 'bleistift' | 'stift' | 'ellipse' | 'rechteck';
type Blatt = 'seite' | 'front' | 'top';

const PAPIER = 0xefe9dd;
const KOERPER = 0xe2b98e;
const TINTE = 0x1f1a17;
/** So viele Welteinheiten passen in die kürzere Seite eines Blatts (wie `kurven.html`). */
const SICHT = 560;
/** bestellte Dreiecke beim Loslassen (wie die Startform in `kurven.html`) und während eines Zugs */
const DREIECKE_FEIN = 6000;
const DREIECKE_GROB = 2500;
/** Bleistift (Recherche Teil B4): Faden bei 100 % Glättung, Nachlauf bei 100 %, Abtastung, Schließen, Fangen der Griffe */
const FADEN_PX = 24;
const NACHLAUF_MS = 140;
const SCHRITT_PX = 2;
const SCHLIESSEN_PX = 15;
const TREFFER_PX = 8;
/** Abtastweite des Pfads für das Aufblasen (Welteinheiten) */
const UMRISS_H = 1.5;

// ---------- Blätter und 3D ----------

const feld = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Feld fehlt: ${id}`);
  return e;
};
const felder = { seite: feld('feld-seite'), front: feld('feld-front'), top: feld('feld-top'), drei: feld('feld-3d') };
const blatt = document.getElementById('blatt-seite') as unknown as SVGSVGElement;
const leinwand = document.getElementById('leinwand') as HTMLCanvasElement;
const statusZeile = document.getElementById('status') as HTMLSpanElement;
const optionen = document.getElementById('optionen') as HTMLDivElement;
const glaettungRegler = document.getElementById('glaettung') as HTMLInputElement;
const glaettungWert = document.getElementById('glaettung-wert') as HTMLSpanElement;
const treueRegler = document.getElementById('treue') as HTMLInputElement;
const treueWert = document.getElementById('treue-wert') as HTMLSpanElement;

const renderer = new WebGLRenderer({ canvas: leinwand, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.autoClear = false;
const szene = new Scene();
const stufen = new DataTexture(new Uint8Array([70, 135, 200, 255]), 4, 1, RedFormat);
stufen.minFilter = NearestFilter;
stufen.magFilter = NearestFilter;
stufen.needsUpdate = true;
/** Umriss wie in `kurven.html`: die Rückseiten um eine feste Pixelbreite nach außen geschoben */
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
const koerper = new Mesh(new BufferGeometry(), new MeshToonMaterial({ color: KOERPER, gradientMap: stufen }));
const umriss = new Mesh(koerper.geometry, umrissMaterial);
umriss.renderOrder = 1;
koerper.visible = false;
umriss.visible = false;
szene.add(koerper, umriss);
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
// Schnauze links: Seite von +z, Front von −x (vorn), Top von oben mit +z nach unten (wie `kurven.html`)
const kameras: Record<Blatt, OrthographicCamera> = {
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

/** Ausschnitt je Blatt: Mitte in Blattkoordinaten (y nach unten) und Zoom */
const ausschnitt: Record<Blatt, { cx: number; cy: number; zoom: number }> = {
  seite: { cx: 0, cy: 0, zoom: 1 },
  front: { cx: 0, cy: 0, zoom: 1 },
  top: { cx: 0, cy: 0, zoom: 1 },
};
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 40;
/** Bildpunkte je Welteinheit */
const skala = (a: Blatt): number => {
  const r = felder.seite.getBoundingClientRect();
  return Math.max(1e-6, Math.min(r.width, r.height) / SICHT) * ausschnitt[a].zoom;
};
const blattPunkt = (a: Blatt, e: { clientX: number; clientY: number }): [number, number] => {
  const r = felder[a].getBoundingClientRect();
  const s = skala(a);
  return [(e.clientX - r.left - r.width / 2) / s + ausschnitt[a].cx, (e.clientY - r.top - r.height / 2) / s + ausschnitt[a].cy];
};
/** Seite: Blatt (y nach unten) ↔ Welt (y nach oben) */
const welt = (q: [number, number]): V2 => ({ x: q[0], y: -q[1] });
const imBlatt = (p: V2): [number, number] => [p.x, -p.y];
const NAMEN: Record<Blatt, string> = { seite: 'Seite', front: 'Front', top: 'Top' };
function ausschnittGeaendert(a: Blatt): void {
  const kopf = felder[a].querySelector('header');
  const z = ausschnitt[a].zoom;
  if (kopf) kopf.textContent = Math.abs(z - 1) < 1e-3 ? NAMEN[a] : `${NAMEN[a]} · ${Math.round(z * 100)} %`;
  if (a === 'seite') blattZeichnen();
  neuZeichnen = true;
}
function zoomen(a: Blatt, k: number, clientX: number, clientY: number): void {
  const v = ausschnitt[a];
  const vorher = blattPunkt(a, { clientX, clientY });
  v.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.zoom * k));
  const nachher = blattPunkt(a, { clientX, clientY });
  v.cx += vorher[0] - nachher[0];
  v.cy += vorher[1] - nachher[1];
  ausschnittGeaendert(a);
}
function schieben(a: Blatt, dx: number, dy: number): void {
  const s = skala(a);
  ausschnitt[a].cx -= dx / s;
  ausschnitt[a].cy -= dy / s;
  ausschnittGeaendert(a);
}

// ---------- Zustand ----------

let werkzeug: Werkzeug = 'bleistift';
/** die Startform: der Umriss in der Seite (Welt, y nach oben) */
let pfad: Pfad | null = null;
const zurueck: (Pfad | null)[] = [];
let gewaehlt: number | null = null;
let netz: DichtesNetz | null = null;
let aufblasenMs = 0;
let letzteAnpassung: (Anpassung & { fehlerPx: number }) | null = null;
let meldung = '';
let glaettung = 1;
let treuePx = 4;
let glaettungArt: 'faden' | 'nachlauf' = 'faden';
let leertaste = false;
let grobAusstehend = false;

/** Bleistift: Glättung, Spur des Pinsels, Zeiger (Welt) und die Rohpunkte (für Wiedergabetests) */
let strich: { g: Glaettung; spur: V2[]; zeiger: V2; roh: [number, number, number][] } | null = null;
/** Zeichenstift */
let stift: { anker: Anker[]; zieht: boolean } | null = null;
/** Ellipse oder Rechteck beim Ziehen */
let aufzug: { art: 'ellipse' | 'rechteck'; von: V2; bis: V2; vorher: Pfad | null; gleich: boolean; ausMitte: boolean } | null = null;
/** Auswahl: Anker oder Griff ziehen */
let ziehen: { art: 'anker' | 'griff'; i: number; seite: 'ein' | 'aus'; start: V2; vorher: Pfad; bewegt: boolean } | null = null;
let schwenk: { x: number; y: number } | null = null;
let maus: V2 | null = null;

/** die letzten Striche (Rohpunkte x, y in Welt, t in ms, und Zoom) für Wiedergabetests */
const STRICHE_SCHLUESSEL = 'zeichnen-striche';
function strichMerken(roh: [number, number, number][]): void {
  try {
    const alt = JSON.parse(localStorage.getItem(STRICHE_SCHLUESSEL) ?? '[]') as unknown[];
    alt.push({ skala: skala('seite'), glaettung, art: glaettungArt, treuePx, roh });
    localStorage.setItem(STRICHE_SCHLUESSEL, JSON.stringify(alt.slice(-30)));
  } catch {
    // ohne Speicher (privates Fenster): nur nicht merken
  }
}

function zurueckMerken(p: Pfad | null = pfad): void {
  zurueck.push(p ? pfadKopie(p) : null);
  if (zurueck.length > 200) zurueck.shift();
}

// ---------- Aufblasen ----------

function netzZeigen(n: DichtesNetz | null): void {
  const alt = koerper.geometry;
  const g = new BufferGeometry();
  if (n) {
    g.setAttribute('position', new BufferAttribute(n.positionen, 3));
    g.setAttribute('normal', new BufferAttribute(n.normalen, 3));
    g.setIndex(new BufferAttribute(n.indizes, 1));
  }
  koerper.geometry = g;
  umriss.geometry = g;
  alt.dispose();
  koerper.visible = !!n;
  umriss.visible = !!n;
  neuZeichnen = true;
}

/** die Startform aufblasen (grob während eines Zugs, fein beim Loslassen) */
function aufblasen(fein: boolean): void {
  grobAusstehend = false;
  if (!pfad || pfad.anker.length < 2) {
    netz = null;
    netzZeigen(null);
    statusZeigen();
    return;
  }
  if (schneidetSich({ ...pfad, geschlossen: true }, 2)) {
    meldung = 'Der Umriss kreuzt sich selbst — so lässt er sich nicht aufblasen';
    statusZeigen();
    return;
  }
  meldung = '';
  const t0 = performance.now();
  try {
    netz = rundAusSeite(umrissPunkte(pfad, UMRISS_H), { dreiecke: fein ? DREIECKE_FEIN : DREIECKE_GROB });
  } catch (err) {
    meldung = `Aufblasen ging nicht: ${String(err)}`;
    statusZeigen();
    return;
  }
  aufblasenMs = performance.now() - t0;
  netzZeigen(netz);
  statusZeigen();
}

function statusZeigen(): void {
  const teile: string[] = [];
  if (pfad) teile.push(`${pfad.anker.length} Punkte (${pfad.anker.filter((a) => a.ecke).length} Ecken)`);
  if (letzteAnpassung) teile.push(`Bleistift: ${letzteAnpassung.fehlerPx.toFixed(1)} px neben dem Strich, ${letzteAnpassung.ms.toFixed(0)} ms`);
  if (netz) teile.push(`Aufblasen ${aufblasenMs.toFixed(0)} ms · ${(netz.indizes.length / 3).toLocaleString('de-DE')} Dreiecke`);
  if (meldung) teile.push(meldung);
  statusZeile.textContent = teile.join(' · ');
}

// ---------- Zeichnen im Blatt ----------

const NS = 'http://www.w3.org/2000/svg';
const element = (art: string, klasse: string, attr: Record<string, string | number>): SVGElement => {
  const e = document.createElementNS(NS, art);
  if (klasse) e.setAttribute('class', klasse);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, String(v));
  return e;
};
const f = (v: number): string => v.toFixed(3);

/** SVG-Pfad aus Bézier-Stücken (Welt → Blatt) */
function pfadD(p: Pfad): string {
  const S = stuecke(p);
  if (S.length === 0) return '';
  const [x0, y0] = imBlatt(S[0]![0]);
  let d = `M ${f(x0)} ${f(y0)}`;
  for (const s of S) {
    const a = imBlatt(s[1]);
    const b = imBlatt(s[2]);
    const c = imBlatt(s[3]);
    d += ` C ${f(a[0])} ${f(a[1])} ${f(b[0])} ${f(b[1])} ${f(c[0])} ${f(c[1])}`;
  }
  return p.geschlossen ? `${d} Z` : d;
}

function ankerZeichnen(a: Anker, klasse: string, r: number): SVGElement {
  const [x, y] = imBlatt(a);
  if (a.ecke) {
    const k = r * 1.15;
    return element('path', klasse, { d: `M ${f(x)} ${f(y - k)} L ${f(x + k)} ${f(y)} L ${f(x)} ${f(y + k)} L ${f(x - k)} ${f(y)} Z` });
  }
  return element('circle', klasse, { cx: f(x), cy: f(y), r: f(r) });
}

function griffeZeichnen(a: Anker, i: number, px: number): void {
  for (const seite of ['ein', 'aus'] as const) {
    const g = a[seite];
    if (!g || Math.hypot(g.x, g.y) * (1 / px) < 1) continue;
    const [x, y] = imBlatt(a);
    const [gx, gy] = imBlatt({ x: a.x + g.x, y: a.y + g.y });
    blatt.append(element('line', 'z-griff-linie', { x1: f(x), y1: f(y), x2: f(gx), y2: f(gy) }));
    const c = element('circle', 'z-griff', { cx: f(gx), cy: f(gy), r: f(3.2 * px) });
    c.setAttribute('data-griff', `${i}:${seite}`);
    blatt.append(c);
  }
}

function blattZeichnen(): void {
  const r = felder.seite.getBoundingClientRect();
  const s = skala('seite');
  const w = r.width / s;
  const h = r.height / s;
  const { cx, cy } = ausschnitt.seite;
  blatt.setAttribute('viewBox', `${cx - w / 2} ${cy - h / 2} ${w} ${h}`);
  blatt.setAttribute('class', `blatt w-${werkzeug}`);
  blatt.replaceChildren();
  const px = 1 / s;
  if (pfad && !stift) {
    const d = pfadD(pfad);
    blatt.append(element('path', 'z-treffer', { d }), element('path', 'z-linie', { d }));
    if (werkzeug === 'auswahl' && !aufzug) {
      if (gewaehlt !== null && pfad.anker[gewaehlt]) griffeZeichnen(pfad.anker[gewaehlt]!, gewaehlt, px);
      pfad.anker.forEach((a, i) => {
        const e = ankerZeichnen(a, `z-anker${i === gewaehlt ? ' gewaehlt' : ''}`, 4 * px);
        e.setAttribute('data-anker', String(i));
        blatt.append(e);
      });
    }
  }
  if (strich) {
    const pts = strich.spur.map((q) => imBlatt(q).map(f).join(' ')).join(' L ');
    if (pts) blatt.append(element('path', 'z-strich', { d: `M ${pts}` }));
    const b = strich.g.pinsel;
    if (b && glaettung > 0) {
      const [bx, by] = imBlatt(b);
      const [zx, zy] = imBlatt(strich.zeiger);
      blatt.append(element('line', 'z-faden', { x1: f(bx), y1: f(by), x2: f(zx), y2: f(zy) }));
      if (glaettungArt === 'faden') blatt.append(element('circle', 'z-fadenkreis', { cx: f(zx), cy: f(zy), r: f(glaettung * FADEN_PX * px) }));
    }
  }
  if (stift) {
    const A = stift.anker;
    let d = '';
    A.forEach((a, i) => {
      const [x, y] = imBlatt(a);
      if (i === 0) d = `M ${f(x)} ${f(y)}`;
      else {
        const st = stueckZwischen(A[i - 1]!, a);
        const p1 = imBlatt(st[1]);
        const p2 = imBlatt(st[2]);
        d += ` C ${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])} ${f(x)} ${f(y)}`;
      }
    });
    const letzt = A[A.length - 1];
    if (letzt && !stift.zieht && maus) {
      const st = stueckZwischen(letzt, { x: maus.x, y: maus.y, ein: null, aus: null, ecke: true });
      const p1 = imBlatt(st[1]);
      const [mx, my] = imBlatt(maus);
      d += ` C ${f(p1[0])} ${f(p1[1])} ${f(mx)} ${f(my)} ${f(mx)} ${f(my)}`;
    }
    if (d) blatt.append(element('path', 'z-entwurf', { d }));
    if (letzt) griffeZeichnen(letzt, A.length - 1, px);
    A.forEach((a, i) => {
      const [x, y] = imBlatt(a);
      const k = 3.6 * px;
      blatt.append(element('rect', `z-stift-anker${i === 0 ? ' erster' : ''}`, { x: f(x - k), y: f(y - k), width: f(2 * k), height: f(2 * k) }));
    });
  }
  if (!pfad && !strich && !stift && !aufzug) {
    const t = element('text', 'z-hinweis', { x: f(cx), y: f(cy), 'text-anchor': 'middle', 'font-size': f(13 * px) });
    t.textContent = 'Zeichne die Seite: N Bleistift · P Zeichenstift · E Ellipse · M Rechteck';
    blatt.append(t);
  }
}

// ---------- Werkzeuge ----------

const knoepfe = [...document.querySelectorAll<HTMLButtonElement>('[data-werkzeug]')];
function werkzeugSetzen(w: Werkzeug): void {
  abbrechen();
  werkzeug = w;
  for (const k of knoepfe) k.setAttribute('aria-pressed', String(k.dataset.werkzeug === w));
  optionen.hidden = w !== 'bleistift';
  if (w !== 'auswahl') gewaehlt = null;
  blattZeichnen();
}
for (const k of knoepfe) k.addEventListener('click', () => werkzeugSetzen(k.dataset.werkzeug as Werkzeug));
document.querySelector('[data-aktion="neu"]')?.addEventListener('click', () => {
  abbrechen();
  if (pfad) zurueckMerken();
  pfad = null;
  gewaehlt = null;
  letzteAnpassung = null;
  aufblasen(true);
  blattZeichnen();
});
const leiste = document.getElementById('leiste');
for (const art of ['pointerdown', 'wheel'] as const) leiste?.addEventListener(art, (e) => e.stopPropagation());
for (const art of ['pointerdown', 'wheel'] as const) optionen.addEventListener(art, (e) => e.stopPropagation());
glaettungRegler.addEventListener('input', () => {
  glaettung = Number(glaettungRegler.value) / 100;
  glaettungWert.textContent = `${glaettungRegler.value} %`;
});
treueRegler.addEventListener('input', () => {
  treuePx = Number(treueRegler.value);
  treueWert.textContent = `${treueRegler.value} px`;
});
for (const k of document.querySelectorAll<HTMLButtonElement>('[data-glaettung]')) {
  k.addEventListener('click', () => {
    glaettungArt = k.dataset.glaettung === 'nachlauf' ? 'nachlauf' : 'faden';
    for (const j of document.querySelectorAll<HTMLButtonElement>('[data-glaettung]')) j.setAttribute('aria-pressed', String(j === k));
  });
}

/** laufende Geste abbrechen (Esc, Werkzeugwechsel) */
function abbrechen(): void {
  if (aufzug) {
    pfad = aufzug.vorher;
    aufzug = null;
    aufblasen(true);
  }
  if (ziehen) {
    pfad = ziehen.vorher;
    ziehen = null;
    aufblasen(true);
  }
  strich = null;
  stift = null;
}

// Bleistift

function bleistiftAnfang(e: PointerEvent): void {
  const p = welt(blattPunkt('seite', e));
  const s = skala('seite');
  const g: Glaettung = glaettungArt === 'faden' ? new Faden((glaettung * FADEN_PX) / s) : new Nachlauf(glaettung * NACHLAUF_MS);
  strich = { g, spur: [g.anfang(p, e.timeStamp)], zeiger: p, roh: [[p.x, p.y, e.timeStamp]] };
}

function bleistiftFolge(e: PointerEvent): void {
  const st = strich;
  if (!st) return;
  const ereignisse = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
  for (const ev of ereignisse.length ? ereignisse : [e]) {
    const p = welt(blattPunkt('seite', ev));
    st.zeiger = p;
    st.roh.push([p.x, p.y, ev.timeStamp]);
    st.spur.push(...st.g.folge(p, ev.timeStamp));
  }
}

/** Nach einer Runde wieder nah am Anfang (unter `SCHLIESSEN_PX`)? Nummer der nächsten Stelle, sonst −1 */
function schlussStelle(P: readonly V2[], s: number): number {
  let weg = 0;
  let best = -1;
  let bestD = Infinity;
  for (let i = 1; i < P.length; i++) {
    weg += Math.hypot(P[i]!.x - P[i - 1]!.x, P[i]!.y - P[i - 1]!.y);
    if (weg * s < 4 * SCHLIESSEN_PX) continue;
    const d = Math.hypot(P[i]!.x - P[0]!.x, P[i]!.y - P[0]!.y) * s;
    if (d < SCHLIESSEN_PX && d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function bleistiftEnde(): void {
  const st = strich;
  strich = null;
  if (!st) return;
  const s = skala('seite');
  st.spur.push(...st.g.ende(st.zeiger, SCHRITT_PX / s));
  let laenge = 0;
  for (let i = 1; i < st.spur.length; i++) laenge += Math.hypot(st.spur[i]!.x - st.spur[i - 1]!.x, st.spur[i]!.y - st.spur[i - 1]!.y);
  if (laenge * s < 12) {
    blattZeichnen();
    return;
  }
  strichMerken(st.roh);
  // Rundum gezeichnet (der Zeiger kommt nach einer Runde wieder nah an den Anfang; das Überschießen fällt weg, wie Illustrators
  // „Pfade schließen, wenn Enden innerhalb … px“): mit Faden rundum geglättet, ohne Naht. Sonst die Spur des Pinsels; die Startform ist
  // immer geschlossen, ein offener Strich wird mit einer Geraden geschlossen (wie Teddy).
  const roh = st.roh.map(([x, y]) => ({ x, y }));
  const schluss = schlussStelle(roh, s);
  let spur: V2[];
  if (schluss > 0 && glaettungArt === 'faden' && glaettung > 0) {
    spur = fadenRund(roh.slice(0, schluss + 1), (glaettung * FADEN_PX) / s);
  } else {
    const b = schlussStelle(st.spur, s);
    spur = b > 0 ? st.spur.slice(0, b + 1) : st.spur;
  }
  const a = anpassen(spur, { treue: treuePx / s, schritt: SCHRITT_PX / s, geschlossen: true });
  letzteAnpassung = { ...a, fehlerPx: a.fehler * s };
  zurueckMerken();
  pfad = a.pfad;
  gewaehlt = null;
  aufblasen(true);
  blattZeichnen();
}

// Zeichenstift (wie in `kurven.html`: Klick = Ecke, Ziehen = glatter Punkt, erster Punkt oder ⏎ schließt)

function stiftDruecken(e: PointerEvent): void {
  const p = welt(blattPunkt('seite', e));
  const s = skala('seite');
  if (!stift) stift = { anker: [], zieht: false };
  const erster = stift.anker[0];
  if (erster && stift.anker.length >= 3 && Math.hypot(p.x - erster.x, p.y - erster.y) * s < TREFFER_PX) {
    stiftFertig();
    return;
  }
  stift.anker.push({ x: p.x, y: p.y, ein: null, aus: null, ecke: true });
  stift.zieht = true;
}

function stiftZiehen(e: PointerEvent): void {
  const st = stift;
  if (!st?.zieht) return;
  const p = welt(blattPunkt('seite', e));
  const a = st.anker[st.anker.length - 1]!;
  const d = { x: p.x - a.x, y: p.y - a.y };
  if (Math.hypot(d.x, d.y) * skala('seite') > 3) {
    a.aus = d;
    a.ein = { x: -d.x, y: -d.y };
    a.ecke = false;
  } else {
    a.aus = null;
    a.ein = null;
    a.ecke = true;
  }
}

function stiftFertig(): void {
  const st = stift;
  stift = null;
  if (!st || st.anker.length < 3) {
    meldung = 'Stift: mindestens drei Punkte, dann den ersten anklicken (oder ⏎)';
    statusZeigen();
    blattZeichnen();
    return;
  }
  zurueckMerken();
  pfad = { anker: st.anker, geschlossen: true };
  letzteAnpassung = null;
  gewaehlt = null;
  aufblasen(true);
  blattZeichnen();
}

// Ellipse und Rechteck

function formVorschau(): void {
  const z = aufzug;
  if (!z) return;
  const r = rahmen({ von: z.von, bis: z.bis, gleich: z.gleich, ausMitte: z.ausMitte });
  const min = 2 / skala('seite');
  if (r.rx < min || r.ry < min) return;
  pfad = z.art === 'ellipse' ? ellipse(r.cx, r.cy, r.rx, r.ry) : rechteck(r.cx, r.cy, r.rx, r.ry);
  grobAusstehend = true;
}

// Auswahl

const letzterKlick = { t: 0, x: 0, y: 0, was: '' };
/** Doppelklick selbst zählen (das Blatt wird beim Drücken neu gezeichnet, `dblclick` käme nicht an) */
function doppelklick(was: string, e: PointerEvent): boolean {
  const ja = was === letzterKlick.was && e.timeStamp - letzterKlick.t < 400 && Math.hypot(e.clientX - letzterKlick.x, e.clientY - letzterKlick.y) < 6;
  Object.assign(letzterKlick, { t: ja ? 0 : e.timeStamp, x: e.clientX, y: e.clientY, was });
  return ja;
}

/** Ecke ↔ glatt (wie Illustrators Ankerpunkt umwandeln): glatt bekommt Griffe längs Vorgänger → Nachfolger, Ecke verliert sie */
function eckeUmschalten(i: number): void {
  if (!pfad) return;
  const A = pfad.anker;
  const n = A.length;
  const a = A[i]!;
  zurueckMerken();
  if (!a.ecke) {
    A[i] = { ...a, ein: null, aus: null, ecke: true };
  } else {
    const v = A[(i - 1 + n) % n]!;
    const w = A[(i + 1) % n]!;
    const dx = w.x - v.x;
    const dy = w.y - v.y;
    const l = Math.hypot(dx, dy) || 1;
    const l1 = Math.hypot(a.x - v.x, a.y - v.y) / 3;
    const l2 = Math.hypot(w.x - a.x, w.y - a.y) / 3;
    A[i] = { ...a, ein: { x: (-dx / l) * l1, y: (-dy / l) * l1 }, aus: { x: (dx / l) * l2, y: (dy / l) * l2 }, ecke: false };
  }
  aufblasen(true);
}

function auswahlDruecken(e: PointerEvent): boolean {
  if (!pfad) return false;
  const p = welt(blattPunkt('seite', e));
  const s = skala('seite');
  const ziel = e.target as SVGElement;
  const griff = ziel.getAttribute('data-griff');
  if (griff) {
    const [i, seite] = griff.split(':') as [string, 'ein' | 'aus'];
    ziehen = { art: 'griff', i: Number(i), seite, start: p, vorher: pfadKopie(pfad), bewegt: false };
    return true;
  }
  const anker = ziel.getAttribute('data-anker');
  if (anker !== null) {
    const i = Number(anker);
    if (doppelklick(`a${i}`, e) || e.altKey) {
      eckeUmschalten(i);
      gewaehlt = i;
      blattZeichnen();
      return false;
    }
    gewaehlt = i;
    ziehen = { art: 'anker', i, start: p, seite: 'aus', vorher: pfadKopie(pfad), bewegt: false };
    blattZeichnen();
    return true;
  }
  // auf der Linie: Doppelklick setzt einen Punkt (die Linie bleibt genau)
  const stelle = naechsteStelle(pfad, p);
  if (stelle && stelle.abstand * s < TREFFER_PX && doppelklick('linie', e)) {
    zurueckMerken();
    pfad = ankerEinfuegen(pfad, stelle.stueck, stelle.t);
    gewaehlt = stelle.stueck + 1;
    aufblasen(true);
    blattZeichnen();
    return false;
  }
  gewaehlt = null;
  blattZeichnen();
  return false;
}

function auswahlZiehen(e: PointerEvent): void {
  const z = ziehen;
  if (!z || !pfad) return;
  const p = welt(blattPunkt('seite', e));
  const v = z.vorher.anker[z.i]!;
  const a = pfad.anker[z.i]!;
  z.bewegt = true;
  if (z.art === 'anker') {
    a.x = v.x + p.x - z.start.x;
    a.y = v.y + p.y - z.start.y;
  } else {
    const g = { x: p.x - a.x, y: p.y - a.y };
    a[z.seite] = g;
    const gegen = z.seite === 'ein' ? 'aus' : 'ein';
    if (e.altKey) a.ecke = true;
    if (!a.ecke) {
      // glatt: der Gegengriff bleibt gegenüber und behält seine Länge
      const alt = v[gegen];
      const lg = alt ? Math.hypot(alt.x, alt.y) : Math.hypot(g.x, g.y);
      const l = Math.hypot(g.x, g.y) || 1;
      a[gegen] = { x: (-g.x / l) * lg, y: (-g.y / l) * lg };
    }
  }
  grobAusstehend = true;
  blattZeichnen();
}

function auswahlEnde(): void {
  const z = ziehen;
  ziehen = null;
  if (!z) return;
  if (z.bewegt) {
    zurueck.push(z.vorher);
    aufblasen(true);
  }
  blattZeichnen();
}

function ankerLoeschen(): void {
  if (!pfad || gewaehlt === null || pfad.anker.length <= 3) return;
  zurueckMerken();
  pfad.anker.splice(gewaehlt, 1);
  gewaehlt = null;
  aufblasen(true);
  blattZeichnen();
}

// ---------- Maus und Tasten ----------

blatt.addEventListener('pointerdown', (e) => {
  if (e.button === 1) {
    schwenk = { x: e.clientX, y: e.clientY };
    blatt.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;
  let fangen = false;
  if (werkzeug === 'bleistift') {
    bleistiftAnfang(e);
    fangen = true;
  } else if (werkzeug === 'stift') {
    stiftDruecken(e);
    fangen = !!stift;
  } else if (werkzeug === 'ellipse' || werkzeug === 'rechteck') {
    const p = welt(blattPunkt('seite', e));
    aufzug = { art: werkzeug, von: p, bis: p, vorher: pfad ? pfadKopie(pfad) : null, gleich: e.shiftKey, ausMitte: e.altKey };
    fangen = true;
  } else {
    fangen = auswahlDruecken(e);
  }
  if (fangen) blatt.setPointerCapture(e.pointerId);
  blattZeichnen();
});

blatt.addEventListener('pointermove', (e) => {
  if (schwenk) {
    schieben('seite', e.clientX - schwenk.x, e.clientY - schwenk.y);
    schwenk = { x: e.clientX, y: e.clientY };
    return;
  }
  maus = welt(blattPunkt('seite', e));
  if (strich) bleistiftFolge(e);
  else if (stift) stiftZiehen(e);
  else if (aufzug) {
    const p = welt(blattPunkt('seite', e));
    if (leertaste) {
      // Leertaste: die Form verschieben statt aufziehen (wie Illustrator)
      const dx = p.x - aufzug.bis.x;
      const dy = p.y - aufzug.bis.y;
      aufzug.von = { x: aufzug.von.x + dx, y: aufzug.von.y + dy };
    }
    aufzug.bis = p;
    aufzug.gleich = e.shiftKey;
    aufzug.ausMitte = e.altKey;
    formVorschau();
  } else if (ziehen) {
    auswahlZiehen(e);
    return;
  }
  zeichnenAusstehend = true;
});

function loslassen(): void {
  if (schwenk) {
    schwenk = null;
    return;
  }
  if (strich) bleistiftEnde();
  else if (stift?.zieht) {
    stift.zieht = false;
    blattZeichnen();
  } else if (aufzug) {
    const z = aufzug;
    aufzug = null;
    const r = rahmen({ von: z.von, bis: z.bis, gleich: z.gleich, ausMitte: z.ausMitte });
    const min = 3 / skala('seite');
    if (r.rx < min || r.ry < min) {
      pfad = z.vorher;
    } else {
      zurueckMerken(z.vorher);
      pfad = z.art === 'ellipse' ? ellipse(r.cx, r.cy, r.rx, r.ry) : rechteck(r.cx, r.cy, r.rx, r.ry);
      letzteAnpassung = null;
      gewaehlt = null;
    }
    aufblasen(true);
    blattZeichnen();
  } else if (ziehen) auswahlEnde();
}
blatt.addEventListener('pointerup', loslassen);
blatt.addEventListener('pointercancel', loslassen);
blatt.addEventListener('contextmenu', (e) => e.preventDefault());
blatt.addEventListener('mousedown', (e) => {
  if (e.button === 1) e.preventDefault();
});
for (const a of ['seite', 'front', 'top'] as const) {
  const el: Element = a === 'seite' ? blatt : felder[a];
  el.addEventListener(
    'wheel',
    (ereignis) => {
      const e = ereignis as WheelEvent;
      e.preventDefault();
      if (istTrackpad(e)) schieben(a, -e.deltaX, -e.deltaY);
      else zoomen(a, radFaktor(e), e.clientX, e.clientY);
    },
    { passive: false },
  );
}

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const k = e.key.toLowerCase();
  if (e.key === ' ') {
    leertaste = true;
    e.preventDefault();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && k === 'z') {
    e.preventDefault();
    if (strich || stift || aufzug || ziehen) {
      abbrechen();
      blattZeichnen();
      return;
    }
    if (zurueck.length) {
      pfad = zurueck.pop() ?? null;
      gewaehlt = null;
      aufblasen(true);
      blattZeichnen();
    }
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (stift && e.key === 'Enter') {
    stiftFertig();
    e.preventDefault();
    return;
  }
  if (stift && (e.key === 'Backspace' || e.key === 'Delete')) {
    stift.anker.pop();
    if (stift.anker.length === 0) stift = null;
    blattZeichnen();
    e.preventDefault();
    return;
  }
  if (e.key === 'Escape') {
    abbrechen();
    gewaehlt = null;
    blattZeichnen();
    return;
  }
  if (e.key === 'Backspace' || e.key === 'Delete') {
    ankerLoeschen();
    e.preventDefault();
    return;
  }
  if (e.key === 'Home') {
    for (const a of ['seite', 'front', 'top'] as const) {
      Object.assign(ausschnitt[a], { cx: 0, cy: 0, zoom: 1 });
      ausschnittGeaendert(a);
    }
    return;
  }
  const tasten: Record<string, Werkzeug> = { v: 'auswahl', a: 'auswahl', n: 'bleistift', p: 'stift', e: 'ellipse', m: 'rechteck' };
  const w = tasten[k];
  if (w) werkzeugSetzen(w);
});
window.addEventListener('keyup', (e) => {
  if (e.key === ' ') leertaste = false;
});

// ---------- Rendern ----------

let zeichnenAusstehend = false;
function rendern(): void {
  const hoehe = window.innerHeight;
  const dpr = renderer.getPixelRatio();
  renderer.setScissorTest(false);
  renderer.setClearColor(PAPIER, 1);
  renderer.clear();
  renderer.setScissorTest(true);
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
    if (kamera instanceof OrthographicCamera && name !== 'drei') {
      const s = skala(name);
      const w = r.width / s / 2;
      const h = r.height / s / 2;
      const { cx, cy } = ausschnitt[name];
      kamera.left = cx - w;
      kamera.right = cx + w;
      kamera.top = -cy + h;
      kamera.bottom = -cy - h;
    } else if (kamera instanceof PerspectiveCamera) {
      kamera.aspect = r.width / r.height;
    }
    kamera.updateProjectionMatrix();
    umrissMaterial.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
    umrissMaterial.uniforms.uBreite!.value = 2.5 * dpr;
    renderer.clearDepth();
    renderer.render(szene, kamera);
  }
}

function schleife(): void {
  if (strich) {
    const neu = strich.g.takt(performance.now());
    if (neu.length) {
      strich.spur.push(...neu);
      zeichnenAusstehend = true;
    }
  }
  if (grobAusstehend) aufblasen(false);
  if (zeichnenAusstehend) {
    zeichnenAusstehend = false;
    blattZeichnen();
  }
  if (neuZeichnen) {
    neuZeichnen = false;
    rendern();
  }
  requestAnimationFrame(schleife);
}
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  blattZeichnen();
  neuZeichnen = true;
});

werkzeugSetzen('bleistift');
statusZeigen();
schleife();

// Prüfhaken für Skripte: Form, Bildpunkte, Zahlen
(window as unknown as { __zeichnen: unknown }).__zeichnen = {
  pfad: () => (pfad ? pfadKopie(pfad) : null),
  werkzeug: () => werkzeug,
  anpassung: () => letzteAnpassung && { anker: letzteAnpassung.pfad.anker.length, fehlerPx: letzteAnpassung.fehlerPx, ms: letzteAnpassung.ms, ecken: letzteAnpassung.ecken },
  netz: () => (netz ? { punkte: netz.positionen.length / 3, dreiecke: netz.indizes.length / 3, ms: aufblasenMs } : null),
  /** Weltpunkt der Seite → Bildschirmpunkt */
  bild: (x: number, y: number): [number, number] => {
    const r = felder.seite.getBoundingClientRect();
    const s = skala('seite');
    const [X, Y] = imBlatt({ x, y });
    return [r.left + r.width / 2 + (X - ausschnitt.seite.cx) * s, r.top + r.height / 2 + (Y - ausschnitt.seite.cy) * s];
  },
  skala: () => skala('seite'),
  striche: () => {
    try {
      return JSON.parse(localStorage.getItem(STRICHE_SCHLUESSEL) ?? '[]') as unknown;
    } catch {
      return [];
    }
  },
};
