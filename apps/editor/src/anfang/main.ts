/**
 * Probe „Anfang einer Form“ (Florian, 15.11.2026, Runde 2): ein fast leeres Blatt mit „draw a silhouette“ (Lobster), ein Loop mit
 * P. ↩: Der Rahmen (die gezeichnete Linie) fährt nach hinten zur Rückwand eines Kastens, die Seifenhaut hängt an ihm, bläst sich
 * vorn an Ort und Stelle auf, schnürt sich ein, reißt ab und wird zur Blase; der Rest im Rahmen wird an der Rückwand zum Schatten
 * der Seite. An den vier Wänden um die Blase liegen leichte Schatten der übrigen Ansichten; fährt man über eine Wand, zeigt sie
 * ihre Linien und ihren Namen. Die Blase selbst zeigt keine Linien. Seite: `anfang.html`. Plan:
 * `docs/plans/2026-11-15-anfang-seifenhaut.md`.
 *
 * Zwei Leinwände übereinander: unten die Haut (three.js, `haut.ts`), oben Linien, Punkte und Zeiger (flüssige Anzeige, Kopie aus
 * dem Linien-Strang). Welt = CSS-Pixel des Blatts, y nach oben, Mitte des Fensters im Ursprung; im ersten Bild nach ↩ sieht die
 * Kamera das Blatt genau so, wie es gezeichnet wurde. Danach öffnet ein Dolly-Zoom den Kasten (die Blase bleibt gleich groß).
 */

import { Color, Matrix4, OrthographicCamera, PerspectiveCamera, Vector2, Vector3, WebGLRenderer } from 'three';
import { glatt, type Masse, type Moment, moment } from './aufblasen';
import { FluessigeAnzeige, type Szene } from './fluessig';
import { FLACH, Koerper, netzAusUmriss } from './form';
import { FASSUNGEN, type Fassung, Haut, type HautWerte } from './haut';
import type { WandStaerke, Wuerfel } from './schatten';
import { reglerBauen, type Werte, werteLesen } from './regler';
import { Kapseln, LOOK, Stift } from './stift';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
// ?bild=1: ohne Leiste und Zeiger (Vergleichsbilder); ?film=1: ohne Leiste, mit Zeiger
if (params.get('bild') === '1' || params.get('film') === '1') document.body.classList.add('bild');
if (params.get('bild') === '1') document.body.classList.add('standbild');
const mitZeigerImBild = params.get('film') === '1';
const mitInfo = params.get('info') === '1';

const buehne = $<HTMLDivElement>('buehne');
const leinwandHaut = $<HTMLCanvasElement>('haut');
const leinwandLinien = $<HTMLCanvasElement>('linien');
const gruss = $<HTMLDivElement>('gruss');
const hinweis = $<HTMLDivElement>('hinweis');
const infoAnzeige = $<HTMLSpanElement>('info');

const renderer = new WebGLRenderer({ canvas: leinwandHaut, antialias: false, alpha: false, powerPreference: 'high-performance' });
const haut = new Haut(renderer);
const anzeige = new FluessigeAnzeige(leinwandLinien);
const stift = new Stift();
const K = new Kapseln();
const FOV0 = 26;
const kamera = new PerspectiveCamera(FOV0, 1, 1, 1e6);

type Zustand = 'blatt' | 'auf' | 'ruhe' | 'ab';
let zustand: Zustand = 'blatt';
/** Zeit seit ↩ (s); im Film von außen gesetzt */
let T = 0;
let festeZeit: number | null = null;
let fassung: Fassung = Number(params.get('fassung') ?? 0) as Fassung;
let nacht = params.get('nacht') === '1';
let W = 1;
let H = 1;
let D = 1;
let L0 = 1;
let koerper: Koerper | null = null;
let netzStand = -1;
let netzZeit = 0;
/** Einblenden der Haut nach dem Schließen (0..1) */
let film = 0;
/** Uhr des Materials (s) */
let uhr = 0;
const nutzer = { gier: 0, neigung: 0, zoom: 1 };
/**
 * Ansicht (Florian, 16.11.: „automatischer Morph zu den Seitenansichten … elegant und harmonisch … optimal zur Bedienung“): Raum oder
 * eine der drei Achsen. Auf einer Achse wird die Kamera mit einem Dolly-Zoom flach (fast parallel), die Blase ruhig, und die Linien
 * dieser Ansicht erscheinen; an der Seite lassen sich die Punkte ziehen, die Blase folgt. 1 Seite, 3 Front, 7 Top, 0 Raum; tippen
 * bleibt, halten schaut kurz hin; nahe einer Achse rastet das Drehen ein.
 */
type Ansicht = 'raum' | 'seite' | 'front' | 'top';
let ansicht: Ansicht = 'raum';
/** 0 = Raum (perspektivisch), 1 = flache Ansicht */
let flach = 0;
let ansichtFahrt: { von: [number, number, number]; nach: [number, number, number]; t: number } | null = null;
let tasteGehalten: { taste: string; seit: number; vorher: Ansicht } | null = null;
/** Punkt der Linie, der in der Seitenansicht gezogen wird */
let punktZug: { i: number } | null = null;
let punktUnterZeiger = -1;
let umbauZeit = 0;
const ANSICHT_DAUER = 0.62;
/**
 * Viereransicht (Taste 4, wie in der Ecke): Seite oben links, Front oben rechts, Top unten links, Raum unten rechts. Die Ansichten
 * gleiten von ihren Schatten an den Wänden in ihre Felder, der Raum zieht sich ins vierte Feld zusammen. Alle drei flachen Felder im
 * selben Maßstab; in der Seite lassen sich die Punkte ziehen, im Raum dreht man wie sonst.
 */
let vier = 0;
let vierZiel = 0;
let vierFahrt: { von: number; t: number } | null = null;
type Feld = { x: number; y: number; w: number; h: number };
const FELD_ACHSEN = ['seite', 'front', 'top'] as const;
type FeldAchse = (typeof FELD_ACHSEN)[number];
/** Kameras und Rechtecke der flachen Felder im letzten Bild (für Linien und Ziehen) */
const feldStand: Partial<Record<FeldAchse, { kamera: OrthographicCamera; rect: Feld }>> = {};
const FOV_FLACH = 4;
/** Drehung (Grad) und Neigung jeder Ansicht, als Ziel der ganzen Kamera */
const ANSICHT_WINKEL: Record<Ansicht, [number, number] | null> = { raum: null, seite: [0, 0], front: [-90, 0], top: [0, 89.4] };
let drehen: { x: number; y: number; gier: number; neigung: number } | null = null;
let zug: { x: number; y: number; start: Float32Array; gewicht: Float32Array; zFaktor: Float32Array; hinten: boolean; tiefe: number } | null = null;
const hauch = { pos: new Vector3(1e6, 1e6, 1e6), staerke: 0, ziel: 0 };
const wind = new Vector2();
let letzteDrehung = { gier: 0, neigung: 0 };
/** Werte der Feinregler (Ablauf und Material), im Browser behalten */
const werte: Werte = werteLesen();
const stat = { fps: 0, bildMs: 0, netzMs: 0, punkte: 0, dreiecke: 0, fehlend: 0, schritte: 0, riss: 0 };

const TINTE: [number, number, number] = [0x1f / 255, 0x1a / 255, 0x17 / 255];
const GRUEN: [number, number, number] = [0xb9 / 255, 0xd1 / 255, 0xb4 / 255];
const TINTE_NACHT: [number, number, number] = [0xf1 / 255, 0xec / 255, 0xe3 / 255];
const GRUEN_NACHT: [number, number, number] = [0x4f / 255, 0x6e / 255, 0x66 / 255];
const PAPIER_RGB: [number, number, number] = [1, 1, 1];
const NACHT_RGB: [number, number, number] = [0x12 / 255, 0x1a / 255, 0x28 / 255];

// ---------- Würfel ----------

/**
 * Der Würfel um die Blase (Florian, 16.11.: „wie bei dem ersten Versuch der anderen Session mit der Ecke … an allen Seiten … immer
 * max 3 gleichzeitig sichtbar“): sechs unsichtbare Wände; je Achse trägt die Wand den Schatten, die von der Kamera abgewandt ist.
 * Beim Drehen wechselt er weich auf die Gegenwand. Man sieht die Wände an ihren weichen Schatten und an den drei Kanten der fernen
 * Ecke. Am Ende schaut die Kamera schräg von oben in die Ecke; ihr Abstand ist so gewählt, dass Blase und Schatten ins Bild passen.
 */
interface Raum {
  cx: number;
  cy: number;
  /** halbe Kantenlänge des Würfels */
  L: number;
  /** halbe Ausdehnung der Blase in x und y (Welt), größte Tiefe einer Seite, Maß der Form */
  rx: number;
  ry: number;
  tiefe: number;
  R: number;
  /** Abstand der Kamera zur Mitte der Blase am Ende */
  abstand: number;
}
let raum: Raum | null = null;

/** Wand 0..5 = Achse · 2 + (Seite > 0 ? 1 : 0); gerade unter dem Zeiger oder −1 */
let wandUnterZeiger = -1;
const wandSicht = [0, 0, 0, 0, 0, 0];

function raumRechnen(): void {
  if (!koerper) {
    raum = null;
    return;
  }
  const F = koerper.flach;
  let rx = 0;
  let ry = 0;
  for (let i = 0; i < F.nb; i++) {
    rx = Math.max(rx, Math.abs(F.x[i]! - F.cx));
    ry = Math.max(ry, Math.abs(F.y[i]! - F.cy));
  }
  const tiefe = koerper.fuelle * F.qMax;
  const R = Math.max(rx, ry);
  const L = Math.max(rx, ry, tiefe) + 0.55 * R;
  const e: Raum = { cx: F.cx, cy: F.cy, L, rx, ry, tiefe, R, abstand: L0 };
  raum = e;
  e.abstand = einpassen(e);
}

function wuerfelVon(e: Raum): Wuerfel {
  return { mitte: new Vector3(e.cx, e.cy, 0), halb: new Vector3(e.L, e.L, e.L) };
}

/** Kamera am Ende (Drehung und Neigung aus den Werten, Ziel Mitte der Blase) mit Abstand d */
function kameraAmEnde(e: Raum, d: number, cam: PerspectiveCamera): void {
  const gier = (werte.gier * Math.PI) / 180;
  const neigung = (werte.neigung * Math.PI) / 180;
  cam.fov = werte.fov;
  cam.aspect = W / H;
  cam.position.set(e.cx + d * Math.sin(gier) * Math.cos(neigung), e.cy + d * Math.sin(neigung), d * Math.cos(gier) * Math.cos(neigung));
  cam.up.set(0, 1, 0);
  cam.lookAt(e.cx, e.cy, 0);
  cam.near = d * 0.05;
  cam.far = d * 30;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
}

/** kleinster Abstand, bei dem Blase, die drei fernen Schatten und ihre Ecke ins Bild passen */
function einpassen(e: Raum): number {
  const cam = new PerspectiveCamera();
  const sx = Math.sign(Math.sin((werte.gier * Math.PI) / 180)) || 1;
  const sy = Math.sign(Math.sin((werte.neigung * Math.PI) / 180)) || 1;
  const pkt: Vector3[] = [];
  for (const a of [-1, 1])
    for (const b of [-1, 1]) {
      for (const c of [-1, 1]) pkt.push(new Vector3(e.cx + a * e.rx, e.cy + b * e.ry, c * e.tiefe));
      pkt.push(new Vector3(e.cx + a * e.rx, e.cy + b * e.ry, -e.L));
      pkt.push(new Vector3(e.cx - sx * e.L, e.cy + b * e.ry, a * e.tiefe));
      pkt.push(new Vector3(e.cx + a * e.rx, e.cy - sy * e.L, b * e.tiefe));
    }
  pkt.push(new Vector3(e.cx - sx * e.L, e.cy - sy * e.L, -e.L));
  const passt = (d: number): boolean => {
    kameraAmEnde(e, d, cam);
    for (const p of pkt) {
      const c = p.clone().project(cam);
      if (c.z > 1 || Math.abs(c.x) > 0.9 || c.y > 0.88 || c.y < -0.74) return false;
    }
    return true;
  };
  let lo = 0.2 * L0;
  let hi = 8 * L0;
  if (!passt(hi)) return hi;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (passt(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

function masse(): Masse {
  const F = koerper!.flach;
  return { a: Math.sqrt(Math.abs(F.flaeche) / Math.PI), Zw: raum!.L };
}

/** Gewicht je Wand (0..5): die von der Kamera abgewandte Seite jeder Achse, weich beim Wechsel auf die Gegenwand */
function wandGewichte(): number[] {
  const e = raum;
  if (!e) return [0, 0, 0, 0, 0, 0];
  const d = kamera.position.clone().sub(new Vector3(e.cx, e.cy, 0)).normalize();
  const g = (x: number): number => {
    const t = Math.min(1, Math.max(0, (x - 0.03) / 0.17));
    return t * t * (3 - 2 * t);
  };
  // Kamera auf der +Seite einer Achse → Schatten auf der −Wand
  return [g(d.x), g(-d.x), g(d.y), g(-d.y), g(d.z), g(-d.z)];
}

/** wie viel vom Raum zu sehen ist: in einer flachen Ansicht nichts, auch nicht beim Drehen von einer flachen Ansicht zur nächsten */
function raumSicht(): number {
  return (1 - flach) * (1 - flach);
}

function waendeFuer(m: Moment | null): WandStaerke[] {
  if (!raum || !m) return [];
  const g = wandGewichte();
  const r = raumSicht();
  const aus: WandStaerke[] = [];
  for (let k = 0; k < 6; k++) {
    const achse = Math.floor(k / 2) as 0 | 1 | 2;
    const seite = (k % 2 === 0 ? -1 : 1) as -1 | 1;
    // die Wand hinter der Blase (z) übernimmt den Rest im Rahmen, die übrigen erscheinen nach dem Abriss
    const zeit = achse === 2 ? m.schatten : m.waende;
    aus.push({ achse, seite, staerke: g[k]! * zeit * r });
  }
  return aus;
}

// ---------- Größe ----------

function groesse(): void {
  const r = buehne.getBoundingClientRect();
  W = Math.max(1, r.width);
  H = Math.max(1, r.height);
  D = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(D);
  renderer.setSize(W, H, false);
  haut.groesse(W, H, D);
  anzeige.groesse(W * D, H * D);
  kamera.aspect = W / H;
  L0 = H / 2 / Math.tan((FOV0 * Math.PI) / 360);
  if (zustand === 'blatt') netzStand = -1;
  else raumRechnen();
  anstossen();
}

// ---------- Netz ----------

function netzBauen(): void {
  netzStand = stift.stand;
  if (!stift.geschlossen) {
    koerper = null;
    raum = null;
    haut.setzeKoerper(null);
    return;
  }
  const ab = stift.abtasten(1);
  const flach = netzAusUmriss({ x: ab.x.map((x) => x - W / 2), y: ab.y.map((y) => H / 2 - y), anker: ab.anker });
  koerper = new Koerper(flach);
  koerper.fuelle = werte.fuelle;
  koerper.setzen(FLACH);
  koerper.dehnungRechnen();
  haut.setzeKoerper(koerper);
  haut.hochladen();
  raumRechnen();
  netzZeit = performance.now();
  Object.assign(stat, { netzMs: flach.stat.ms, punkte: flach.stat.punkte, dreiecke: flach.stat.dreiecke, fehlend: flach.stat.fehlendeRandkanten, schritte: flach.stat.schritte });
}

/**
 * Beim Laden: eine kleine runde Probeblase einmal unsichtbar zeichnen (mit Schlauch und Wandschatten), dann wieder weg. So stockt das
 * erste Aufblasen nicht, weil der Browser Shader und Zustände der Grafik schon kennt.
 */
function aufwaermen(): void {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < 24; i++) {
    x.push(60 * Math.cos((2 * Math.PI * i) / 24));
    y.push(60 * Math.sin((2 * Math.PI * i) / 24));
  }
  const k = new Koerper(netzAusUmriss({ x, y, anker: [0, 6, 12, 18] }, { punkte: 300 }));
  k.setzen(FLACH);
  k.dehnungRechnen();
  haut.setzeKoerper(k);
  haut.hochladen();
  kamera.position.set(0, 0, 600);
  kamera.lookAt(0, 0, 0);
  kamera.updateMatrixWorld();
  haut.aufwaermen(kamera);
  haut.setzeKoerper(null);
}

// ---------- Ablauf ----------

function aufblasen(): void {
  if (!stift.geschlossen) return;
  if (!koerper || netzStand !== stift.stand) netzBauen();
  if (!koerper) return;
  koerper.versatz.fill(0);
  raumRechnen();
  // der Anfang des Aufblasens ist der Bezug: ungedehnt, Muster ohne Sprung zur flachen Haut
  const ms0 = masse();
  koerper.setzen(moment(99, ms0, werte).lage);
  koerper.bezugRuhe();
  koerper.setzen(moment(0, ms0, werte).lage);
  koerper.bezugJetzt();
  zustand = 'auf';
  T = 0;
  film = 1;
  anstossen();
}

function ablassen(): void {
  if (zustand === 'blatt') return;
  zug = null;
  drehen = null;
  zustand = 'ab';
  if (koerper && raum) T = Math.min(T, moment(0, masse(), werte).dauer);
  anstossen();
}

function nochEinmal(): void {
  if (zustand === 'blatt') {
    aufblasen();
    return;
  }
  if (!koerper || !raum) return;
  koerper.versatz.fill(0);
  const ms0 = masse();
  koerper.setzen(moment(99, ms0, werte).lage);
  koerper.bezugRuhe();
  koerper.setzen(moment(0, ms0, werte).lage);
  koerper.bezugJetzt();
  nutzer.gier = 0;
  nutzer.neigung = 0;
  nutzer.zoom = 1;
  ansicht = 'raum';
  flach = 0;
  ansichtFahrt = null;
  vier = 0;
  vierZiel = 0;
  vierFahrt = null;
  zustand = 'auf';
  T = 0;
  anstossen();
}

function neu(): void {
  zustand = 'blatt';
  T = 0;
  stift.abbrechen();
  koerper = null;
  raum = null;
  haut.setzeKoerper(null);
  nutzer.gier = 0;
  nutzer.neigung = 0;
  nutzer.zoom = 1;
  ansicht = 'raum';
  flach = 0;
  ansichtFahrt = null;
  vier = 0;
  vierZiel = 0;
  vierFahrt = null;
  film = 0;
  anstossen();
}

// ---------- Kamera ----------

/** Dolly-Zoom vom Blatt in den Kasten: der Öffnungswinkel wächst, die Blase bleibt (fast) gleich groß, die Tiefe erscheint */
function kameraSetzen(m: Moment | null): void {
  const k = raum;
  const f = m && k ? m.fahrt : 0;
  const fov = FOV0 + (werte.fov - FOV0) * f;
  const halb = (fov * Math.PI) / 360;
  kamera.fov = fov;
  // Maßstab der Ebene z = 0: am Anfang 1 (das Blatt), am Ende so, dass die Ecke ins Bild passt
  const ende = k ? H / 2 / (k.abstand * Math.tan((werte.fov * Math.PI) / 360)) : 1;
  const massstab = 1 + (ende - 1) * f;
  let abstand = (H / 2 / (Math.tan(halb) * massstab)) * (1 + (nutzer.zoom - 1) * f);
  // flache Ansicht: Dolly-Zoom auf einen engen Winkel; dabei rückt die Blase so nah, dass sie das Bild gut füllt (zum Bearbeiten)
  if (flach > 1e-4 && k) {
    const fovF = fov + (FOV_FLACH - fov) * flach;
    const tanF = Math.tan((fovF * Math.PI) / 360);
    const gleich = abstand * (Math.tan(halb) / tanF);
    const [hx, hy] = ansicht === 'front' ? [k.tiefe, k.ry] : ansicht === 'top' ? [k.rx, k.tiefe] : [k.rx, k.ry];
    const pxw = Math.min((0.31 * H) / Math.max(1, hy), (0.36 * W) / Math.max(1, hx));
    const nah = H / 2 / (pxw * tanF);
    abstand = gleich + (nah - gleich) * flach;
    kamera.fov = fovF;
  }
  const ziel = new Vector3((k?.cx ?? 0) * f, (k?.cy ?? 0) * f, 0);
  // Drehung aus dem Ablauf (beim Hängen zur Seite, danach in die Ecke), dazu die Drehung von Hand
  const gier = (((m?.gier ?? 0) * Math.PI) / 180) + nutzer.gier * f;
  const neigung = (((m?.neigung ?? 0) * Math.PI) / 180) + nutzer.neigung * f;
  kamera.position.set(ziel.x + abstand * Math.sin(gier) * Math.cos(neigung), ziel.y + abstand * Math.sin(neigung), ziel.z + abstand * Math.cos(gier) * Math.cos(neigung));
  kamera.up.set(0, 1, 0);
  kamera.lookAt(ziel);
  kamera.near = abstand * 0.05;
  kamera.far = abstand * 30;
  kamera.updateProjectionMatrix();
  kamera.updateMatrixWorld();
  // Viereransicht: der Raum zieht sich ins vierte Feld zusammen (Projektion verkleinert und verschoben)
  const v = glatt(vier);
  if (v > 1e-4) {
    const R = felder().raum;
    const sc = 1 + (1.45 * Math.min(R.w / W, R.h / H) - 1) * v;
    const ox = (((R.x + R.w / 2) / W) * 2 - 1) * v;
    const oy = (1 - ((R.y + R.h / 2) / H) * 2) * v;
    kamera.projectionMatrix.premultiply(new Matrix4().set(sc, 0, 0, ox, 0, sc, 0, oy, 0, 0, 1, 0, 0, 0, 0, 1));
    kamera.projectionMatrixInverse.copy(kamera.projectionMatrix).invert();
  }
}

/** Felder der Viereransicht (CSS-Pixel); unten bleibt Platz für die Leiste */
function felder(): Record<FeldAchse | 'raum', Feld> {
  const rand = 14;
  const fuge = 12;
  const unten = document.body.classList.contains('bild') ? rand : 70;
  const qw = (W - 2 * rand - fuge) / 2;
  const qh = (H - rand - unten - fuge) / 2;
  return {
    seite: { x: rand, y: rand, w: qw, h: qh },
    front: { x: rand + qw + fuge, y: rand, w: qw, h: qh },
    top: { x: rand, y: rand + qh + fuge, w: qw, h: qh },
    raum: { x: rand + qw + fuge, y: rand + qh + fuge, w: qw, h: qh },
  };
}

function vierUmschalten(an?: boolean): void {
  if (zustand !== 'ruhe') return;
  vierZiel = (an ?? vierZiel < 0.5) ? 1 : 0;
  vierFahrt = { von: vier, t: 0 };
  if (vierZiel > 0.5 && ansicht !== 'raum') ansichtSetzen('raum');
  anstossen();
}

/** flache Kamera eines Felds: alle drei im selben Maßstab, Blick längs ihrer Achse */
function feldKamera(n: FeldAchse, rect: Feld): OrthographicCamera {
  const e = raum!;
  const asp = rect.w / Math.max(1, rect.h);
  // halbe Höhe des Ausschnitts: alle drei Ansichten passen mit Rand in ihr Feld
  const h0 = 1.22 * Math.max(e.ry, e.tiefe, e.rx / asp, e.tiefe / asp);
  const c = new OrthographicCamera(-h0 * asp, h0 * asp, h0, -h0, 1, 20 * e.L);
  const d = 6 * e.L;
  if (n === 'seite') {
    c.position.set(e.cx, e.cy, d);
    c.up.set(0, 1, 0);
  } else if (n === 'front') {
    c.position.set(e.cx - d, e.cy, 0);
    c.up.set(0, 1, 0);
  } else {
    c.position.set(e.cx, e.cy + d, 0);
    c.up.set(0, 0, -1);
  }
  c.lookAt(e.cx, e.cy, 0);
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
  return c;
}

/** Punkt (Welt) im Feld einer flachen Kamera → Gerätepunkte */
function feldProjizieren(p: Vector3, c: OrthographicCamera, rect: Feld): [number, number] {
  const q = p.clone().project(c);
  return [(rect.x + (q.x * 0.5 + 0.5) * rect.w) * D, (rect.y + (0.5 - q.y * 0.5) * rect.h) * D];
}

/** Lage der Felder in diesem Bild: vom Schatten an der Wand (Raum) ins eigene Feld */
function felderJetzt(vp: Matrix4): { n: FeldAchse; rect: Feld; kamera: OrthographicCamera }[] {
  const e = raum;
  if (!e || vier < 0.02) return [];
  const v = glatt(vier);
  const F = felder();
  const g6 = wandGewichte();
  const s = [g6[0]! >= g6[1]! ? -1 : 1, g6[2]! >= g6[3]! ? -1 : 1, g6[4]! >= g6[5]! ? -1 : 1];
  return FELD_ACHSEN.map((n) => {
    // Rechteck des Schattens an seiner Wand (Raum, verkleinert mit), als Anfang der Fahrt
    const ecken: Vector3[] = [];
    for (const a of [-1, 1])
      for (const b of [-1, 1])
        ecken.push(
          n === 'seite'
            ? new Vector3(e.cx + a * e.rx, e.cy + b * e.ry, s[2]! * e.L)
            : n === 'front'
              ? new Vector3(e.cx + s[0]! * e.L, e.cy + b * e.ry, a * e.tiefe)
              : new Vector3(e.cx + a * e.rx, e.cy + s[1]! * e.L, b * e.tiefe),
        );
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of ecken) {
      const [px, py] = projizieren(p, vp);
      x0 = Math.min(x0, px / D);
      x1 = Math.max(x1, px / D);
      y0 = Math.min(y0, py / D);
      y1 = Math.max(y1, py / D);
    }
    const ziel = F[n];
    const rect: Feld = {
      x: x0 + (ziel.x - x0) * v,
      y: y0 + (ziel.y - y0) * v,
      w: Math.max(4, x1 - x0 + (ziel.w - (x1 - x0)) * v),
      h: Math.max(4, y1 - y0 + (ziel.h - (y1 - y0)) * v),
    };
    const kamera = feldKamera(n, rect);
    feldStand[n] = { kamera, rect };
    return { n, rect, kamera };
  });
}

/** Linien in den flachen Feldern: Seite mit ihren Punkten (ziehbar), Front und Top als Umriss */
function linienDerFelder(liste: { n: FeldAchse; rect: Feld; kamera: OrthographicCamera }[]): void {
  const k = koerper;
  if (!k) return;
  const s = Math.min(1, Math.max(0, (vier - 0.45) / 0.55));
  if (s < 0.01) return;
  const r0 = (LOOK.umriss / 2) * D * s;
  for (const { n, rect, kamera: c } of liste) {
    const g = K.neueGruppe();
    if (n === 'seite') {
      const ab = stift.abtasten(1.5);
      const nn = ab.x.length;
      const p = (i: number): [number, number] => feldProjizieren(new Vector3(ab.x[i]! - W / 2, H / 2 - ab.y[i]!, 0), c, rect);
      let vor = p(nn - 1);
      for (let i = 0; i < nn; i++) {
        const q = p(i);
        K.push(vor[0], vor[1], q[0], q[1], r0, r0, g, 0, false);
        vor = q;
      }
      stift.anker.forEach((a, i) => {
        const [px, py] = feldProjizieren(new Vector3(a.x - W / 2, H / 2 - a.y, 0), c, rect);
        const rp = (i === punktUnterZeiger || punktZug?.i === i ? LOOK.tropfen : LOOK.punktRadius) * D * s;
        K.push(px, py, px, py, rp, rp, K.neueGruppe(), 0, true);
      });
    } else {
      const seg = k.umriss(n === 'front' ? 0 : 1);
      for (let i = 0; i < seg.length; i += 6) {
        const [ax, ay] = feldProjizieren(new Vector3(seg[i]!, seg[i + 1]!, seg[i + 2]!), c, rect);
        const [bx, by] = feldProjizieren(new Vector3(seg[i + 3]!, seg[i + 4]!, seg[i + 5]!), c, rect);
        K.push(ax, ay, bx, by, r0, r0, g, 0, false);
      }
    }
  }
}

// ---------- Bild ----------

let laeuft = false;
let letzte = 0;
let bilder = 0;
let bilderSeit = performance.now();
/** Film: der Takt des Browsers rechnet nichts, nur `__anfang.bild` (Bild für Bild genau wiederholbar) */
let angehalten = false;

function anstossen(): void {
  if (laeuft) return;
  laeuft = true;
  letzte = performance.now();
  requestAnimationFrame(schleife);
}

function schleife(t: number): void {
  const dt = Math.min(1 / 30, Math.max(0, (t - letzte) / 1000));
  letzte = t;
  if (angehalten) {
    laeuft = false;
    return;
  }
  const aktiv = bild(dt);
  bilder++;
  if (t - bilderSeit > 500) {
    stat.fps = (bilder * 1000) / (t - bilderSeit);
    bilder = 0;
    bilderSeit = t;
  }
  if (aktiv || festeZeit !== null) requestAnimationFrame(schleife);
  else laeuft = false;
}

function projizieren(p: Vector3, vp: Matrix4): [number, number, number] {
  const c = p.clone().applyMatrix4(vp);
  return [(c.x * 0.5 + 0.5) * W * D, (0.5 - c.y * 0.5) * H * D, c.z];
}

/** ein Bild; true: es bewegt sich noch etwas */
function bild(dt: number): boolean {
  const t0 = performance.now();
  let aktiv = false;
  if (festeZeit !== null) dt = 1 / 60;
  // im Film läuft die Uhr des Materials mit der Zeit des Aufblasens (Bilder genau wiederholbar)
  uhr = festeZeit !== null ? 7 + festeZeit : uhr + dt;
  aktiv = stift.schritt(dt) || aktiv;
  // Netz zum Loop (beim Ziehen von Punkten höchstens alle 120 ms)
  if (zustand === 'blatt' && netzStand !== stift.stand && (!stift.zieht || performance.now() - netzZeit > 120)) netzBauen();
  if (zustand === 'blatt' && stift.geschlossen && film < 1) {
    film = Math.min(1, film + dt / 0.6);
    aktiv = true;
  }
  if (zustand === 'blatt' && !stift.geschlossen) film = 0;
  // Zeit des Aufblasens
  let m: Moment | null = null;
  if (zustand !== 'blatt' && koerper && raum) {
    const dauer = moment(0, masse(), werte).dauer;
    if (festeZeit !== null) T = festeZeit;
    else if (zustand === 'auf') T += dt;
    else if (zustand === 'ab') T -= dt * 1.5;
    if (zustand === 'auf' && T >= dauer) zustand = 'ruhe';
    if (zustand === 'ab' && T <= 0) {
      T = 0;
      zustand = 'blatt';
      koerper.versatz.fill(0);
      nutzer.gier = 0;
      nutzer.neigung = 0;
      nutzer.zoom = 1;
    }
    m = moment(Math.max(0, Math.min(T, dauer)), masse(), werte);
    stat.riss = m.riss;
    if (zustand !== 'ruhe' || zug) koerper.setzen(zustand === 'blatt' ? FLACH : m.lage);
    // Farben der Dehnung: bis kurz nach dem Abriss bezogen auf den flachen Film, danach beruhigen sie sich
    const tau = zustand === 'auf' && T < m.riss + 0.35 ? 0 : zug ? 3.5 : 1.6;
    const unruhe = koerper.dehnungRechnen(dt, tau);
    haut.hochladen();
    aktiv = aktiv || zustand !== 'ruhe' || unruhe > 2e-3 || zug !== null;
  } else if (koerper && zustand === 'blatt') {
    koerper.setzen(FLACH);
    koerper.dehnungRechnen();
    haut.hochladen();
  }
  // Fahrt in eine Ansicht (Drehen und Dolly-Zoom zugleich)
  if (ansichtFahrt) {
    ansichtFahrt.t += dt / ANSICHT_DAUER;
    const t = Math.min(1, ansichtFahrt.t);
    const e = t * t * t * (t * (t * 6 - 15) + 10);
    const [g0, n0, f0] = ansichtFahrt.von;
    const [g1, n1, f1] = ansichtFahrt.nach;
    nutzer.gier = g0 + (g1 - g0) * e;
    nutzer.neigung = n0 + (n1 - n0) * e;
    flach = f0 + (f1 - f0) * e;
    if (t >= 1) ansichtFahrt = null;
    aktiv = true;
  }
  if (zustand !== 'ruhe' && zustand !== 'auf' && flach > 0) flach = 0;
  if (vierFahrt) {
    vierFahrt.t += dt / ANSICHT_DAUER;
    vier = vierFahrt.von + (vierZiel - vierFahrt.von) * Math.min(1, vierFahrt.t);
    if (vierFahrt.t >= 1) {
      vier = vierZiel;
      vierFahrt = null;
    }
    aktiv = true;
  }
  if (zustand !== 'ruhe' && vier > 0) {
    vier = 0;
    vierZiel = 0;
    vierFahrt = null;
  }
  kameraSetzen(zustand === 'blatt' ? null : m);
  // Fahrtwind: die Farben fließen gegen die Drehung
  const gierJetzt = Math.atan2(kamera.position.x - (raum?.cx ?? 0), kamera.position.z);
  const neigungJetzt = kamera.position.y;
  if (dt > 0) {
    wind.x -= (gierJetzt - letzteDrehung.gier) * 0.9;
    wind.y += ((neigungJetzt - letzteDrehung.neigung) / Math.max(1, L0)) * 0.9;
  }
  letzteDrehung = { gier: gierJetzt, neigung: neigungJetzt };
  // Hauch: Feder zur Lage des Zeigers auf der Haut
  hauch.staerke += (hauch.ziel - hauch.staerke) * (1 - Math.exp(-dt / 0.18));
  if (Math.abs(hauch.ziel - hauch.staerke) > 1e-3) aktiv = true;
  // Wände: Linien und Namen blenden weich ein und aus
  for (let i = 0; i < 6; i++) {
    const ziel = zustand === 'ruhe' && wandUnterZeiger === i ? 1 : 0;
    wandSicht[i]! += (ziel - wandSicht[i]!) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(ziel - wandSicht[i]!) > 2e-3) aktiv = true;
  }
  // Haut
  const F = koerper?.flach;
  const schattenFarbe = new Color().setScalar(1 - werte.schatten);
  const w: HautWerte = {
    fassung,
    nacht,
    zeit: uhr,
    vorn: 1,
    hinten: 1,
    rahmen: m ? 1 - m.schatten : film,
    schatten: 0,
    schlauch: !!m && m.lage.seitRiss < 0.1,
    deckung: zustand === 'blatt' ? 0.42 * film : 0.42 + 0.58 * glatt(T / 1.4),
    hauch: hauch.pos,
    hauchStaerke: hauch.staerke,
    hauchRadius: Math.max(24, (F?.radius ?? 200) * 0.2),
    wind,
    dicke: werte.dicke,
    spannung: werte.spannung,
    sicht: werte.sicht * (1 - 0.55 * flach),
    wuerfel: raum && m ? wuerfelVon(raum) : null,
    waende: waendeFuer(m),
    weich: werte.weich * (raum?.R ?? 200),
    schattenFarbe,
  };
  const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
  const feldListe = felderJetzt(vp);
  haut.zeichnen(
    kamera,
    w,
    feldListe.map((f) => ({ kamera: f.kamera, x: Math.round(f.rect.x * D), y: Math.round(f.rect.y * D), b: Math.max(1, Math.round(f.rect.w * D)), h: Math.max(1, Math.round(f.rect.h * D)) })),
  );
  // Linien
  K.leeren();
  if (zustand === 'blatt') {
    stift.kapseln(K, D, true);
  } else if (koerper && F && raum && m) {
    linienImRaum(vp, m);
    if (flach > 0.01) linienDerAnsicht(vp);
    if (feldListe.length) linienDerFelder(feldListe);
  }
  if (stift.zeiger.da) K.felder.push(stift.zeiger.x * D, stift.zeiger.y * D, 22 * D, 0.7);
  const szene: Szene = {
    prim: K.puffer,
    anzahl: K.n,
    k0: 0,
    k1: LOOK.weich * D,
    felder: K.felder,
    tinte: nacht ? TINTE_NACHT : TINTE,
    gruen: nacht ? GRUEN_NACHT : GRUEN,
    zeiger: stift.zeiger.da && (!document.body.classList.contains('bild') || mitZeigerImBild) ? Stift.zeigerForm(stift.zeiger.x, stift.zeiger.y, D) : null,
    koerper: null,
    koerperZeigen: false,
    papier: nacht ? NACHT_RGB : PAPIER_RGB,
  };
  anzeige.zeichnen(szene);
  // Text
  gruss.classList.toggle('weg', !(zustand === 'blatt' && stift.leer));
  const h =
    zustand === 'blatt'
      ? stift.geschlossen
        ? '↩ aufblasen'
        : stift.leer
          ? ''
          : 'am ersten Punkt schließen · ↩ schließt · ⌫ zurück'
      : zustand === 'ruhe'
        ? ansicht === 'seite'
          ? 'Punkte ziehen: die Blase folgt · 0 Raum · 3 Front · 7 Top'
          : '1 Seite · 3 Front · 7 Top · 0 Raum · 4 vier Ansichten · über eine Wand fahren: ihre Linien · an der Blase ziehen: dehnen · daneben ziehen: drehen'
        : '';
  if (hinweis.textContent !== h) hinweis.textContent = h;
  stat.bildMs = performance.now() - t0;
  if (mitInfo)
    infoAnzeige.textContent = `${stat.fps.toFixed(0)} B/s · Bild ${stat.bildMs.toFixed(1)} ms · Netz ${stat.punkte} P, ${stat.dreiecke} D, ${stat.netzMs.toFixed(0)} ms · Abriss ${stat.riss.toFixed(2)} s · ${zustand} ${T.toFixed(2)} s`;
  return aktiv;
}

/** Linien im Raum: der Rahmen auf dem Weg zur Rückwand (verblasst dort), die Kanten der Ecke, an der Wand unter dem Zeiger ihre Linien */
function linienImRaum(vp: Matrix4, m: Moment): void {
  const k = koerper!;
  const F = k.flach;
  const e = raum!;
  const n = F.n;
  const p = new Vector3();
  const r0 = (LOOK.umriss / 2) * D;
  // Rahmen: der Rand des Rests im Rahmen (Punkte 2n … 2n + nb − 1); an der Rückwand nur beim Darüberfahren
  const staerke = Math.max(m.linie, wandSicht[0]!);
  if (staerke > 0.01) {
    const sx = new Float32Array(F.nb);
    const sy = new Float32Array(F.nb);
    for (let i = 0; i < F.nb; i++) {
      const v = 2 * n + i;
      p.set(k.pos[v * 3]!, k.pos[v * 3 + 1]!, k.pos[v * 3 + 2]!);
      const [a, b] = projizieren(p, vp);
      sx[i] = a;
      sy[i] = b;
    }
    const g = K.neueGruppe();
    const r = r0 * staerke;
    for (let i = 0; i < F.nb; i++) {
      const j = (i + 1) % F.nb;
      K.push(sx[i]!, sy[i]!, sx[j]!, sy[j]!, r, r, g, 0, false);
    }
    const rp = LOOK.punktRadius * D * staerke;
    for (const a of F.anker) K.push(sx[a]!, sy[a]!, sx[a]!, sy[a]!, rp, rp, K.neueGruppe(), 0, true);
  }
  // Kanten der fernen Ecke: drei feinste Haarlinien vom Eckpunkt aus (die Ecke wechselt mit der Kamera)
  const g6 = wandGewichte();
  const kanten = werte.kanten * m.waende * raumSicht();
  if (kanten > 0.01) {
    const s = [g6[0]! >= g6[1]! ? -1 : 1, g6[2]! >= g6[3]! ? -1 : 1, g6[4]! >= g6[5]! ? -1 : 1];
    const st = Math.min(Math.max(g6[0]!, g6[1]!), Math.max(g6[2]!, g6[3]!), Math.max(g6[4]!, g6[5]!));
    const c = new Vector3(e.cx + s[0]! * e.L, e.cy + s[1]! * e.L, s[2]! * e.L);
    const enden = [c.clone().setX(e.cx - s[0]! * e.L), c.clone().setY(e.cy - s[1]! * e.L), c.clone().setZ(-s[2]! * e.L)];
    const g = K.neueGruppe();
    const r = 0.14 * D * kanten * st;
    for (const b of enden) {
      const steps = 32;
      let vorher: [number, number] | null = null;
      for (let k2 = 0; k2 <= steps; k2++) {
        const q = c.clone().lerp(b, k2 / steps);
        const vorKamera = q.clone().applyMatrix4(kamera.matrixWorldInverse).z < -kamera.near * 2;
        const cc = q.clone().applyMatrix4(vp);
        if (!vorKamera || Math.abs(cc.x) > 3 || Math.abs(cc.y) > 3) {
          vorher = null;
          continue;
        }
        const pp: [number, number] = [(cc.x * 0.5 + 0.5) * W * D, (0.5 - cc.y * 0.5) * H * D];
        if (vorher && r > 0.01) K.push(vorher[0], vorher[1], pp[0], pp[1], r, r, g, 0, false);
        vorher = pp;
      }
    }
  }
  // Wand unter dem Zeiger: der Umriss der Blase von ihrer Achse, auf die Wand gelegt (an der Seite mit den Punkten der Linie)
  for (let w = 0; w < 6; w++) {
    const sw = wandSicht[w]!;
    if (sw < 0.01) continue;
    const achse = Math.floor(w / 2) as 0 | 1 | 2;
    const seite = w % 2 === 0 ? -1 : 1;
    const lage = (achse === 0 ? e.cx : achse === 1 ? e.cy : 0) + seite * e.L;
    const seg = k.umriss(achse);
    const g = K.neueGruppe();
    const r = r0 * sw;
    const legen = (x: number, y: number, z: number): [number, number] => {
      const q = new Vector3(x, y, z);
      if (achse === 0) q.x = lage;
      else if (achse === 1) q.y = lage;
      else q.z = lage;
      const [a, b] = projizieren(q, vp);
      return [a, b];
    };
    for (let i = 0; i < seg.length; i += 6) {
      const [ax, ay] = legen(seg[i]!, seg[i + 1]!, seg[i + 2]!);
      const [bx, by] = legen(seg[i + 3]!, seg[i + 4]!, seg[i + 5]!);
      K.push(ax, ay, bx, by, r, r, g, 0, false);
    }
    if (achse === 2) {
      const rp = LOOK.punktRadius * D * sw;
      for (const a of F.anker) {
        const [px, py] = legen(k.pos[a * 3]!, k.pos[a * 3 + 1]!, 0);
        K.push(px, py, px, py, rp, rp, K.neueGruppe(), 0, true);
      }
    }
  }

}

// ---------- Eingaben ----------

function lageIm(e: PointerEvent | WheelEvent): [number, number] {
  const r = leinwandLinien.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

function strahl(x: number, y: number): { o: Vector3; d: Vector3 } {
  const p = new Vector3((x / W) * 2 - 1, 1 - (y / H) * 2, 0.5).unproject(kamera);
  const o = kamera.position.clone();
  return { o, d: p.sub(o).normalize() };
}

/** in eine Ansicht fahren (Raum oder Achse): Drehen und Dolly-Zoom zugleich, kürzester Weg */
function ansichtSetzen(ziel: Ansicht): void {
  if (zustand !== 'ruhe' && zustand !== 'auf') return;
  const w = ANSICHT_WINKEL[ziel];
  const g1 = w ? (w[0] * Math.PI) / 180 - (werte.gier * Math.PI) / 180 : 0;
  const n1 = w ? (w[1] * Math.PI) / 180 - (werte.neigung * Math.PI) / 180 : 0;
  // kürzester Weg um die Hochachse
  let g0 = nutzer.gier;
  while (g0 - g1 > Math.PI) g0 -= 2 * Math.PI;
  while (g1 - g0 > Math.PI) g0 += 2 * Math.PI;
  ansichtFahrt = { von: [g0, nutzer.neigung, flach], nach: [g1, n1, w ? 1 : 0], t: 0 };
  ansicht = ziel;
  punktZug = null;
  anstossen();
}

/** nahe einer Achse: einrasten (nach dem Drehen von Hand) */
function einrasten(): void {
  const g = ((werte.gier * Math.PI) / 180 + nutzer.gier) * (180 / Math.PI);
  const n = ((werte.neigung * Math.PI) / 180 + nutzer.neigung) * (180 / Math.PI);
  const nah = (a: number, b: number): number => {
    let d = (((a - b) % 360) + 540) % 360 - 180;
    d = Math.abs(d);
    return d;
  };
  for (const a of ['seite', 'front', 'top'] as const) {
    const w = ANSICHT_WINKEL[a]!;
    const dn = Math.abs(n - w[1]);
    if (a === 'top' ? dn < 9 : dn < 9 && nah(g, w[0]) < 9) {
      ansichtSetzen(a);
      return;
    }
  }
}

/** Linien der flachen Ansicht: Seite = die gezeichnete Linie mit ihren Punkten (ziehbar), Front und Top = Umriss der Blase */
function linienDerAnsicht(vp: Matrix4): void {
  const k = koerper!;
  // nur nahe der Achse der Ansicht (beim Drehen von einer Ansicht zur nächsten stünde die Linie sonst schräg im Bild)
  const blick = new Vector3();
  kamera.getWorldDirection(blick);
  const achse = ansicht === 'seite' ? new Vector3(0, 0, -1) : ansicht === 'front' ? new Vector3(1, 0, 0) : new Vector3(0, -1, 0);
  const t = Math.min(1, Math.max(0, (blick.dot(achse) - 0.97) / 0.025));
  const s = flach * flach * t * t * (3 - 2 * t);
  if (s < 0.01) return;
  const r0 = (LOOK.umriss / 2) * D * s;
  if (ansicht === 'seite') {
    const ab = stift.abtasten(1.5);
    const g = K.neueGruppe();
    const n = ab.x.length;
    const p = (i: number): [number, number] => {
      const [a, b] = projizieren(new Vector3(ab.x[i]! - W / 2, H / 2 - ab.y[i]!, 0), vp);
      return [a, b];
    };
    let vor = p(n - 1);
    for (let i = 0; i < n; i++) {
      const q = p(i);
      K.push(vor[0], vor[1], q[0], q[1], r0, r0, g, 0, false);
      vor = q;
    }
    stift.anker.forEach((a, i) => {
      const [px, py] = projizieren(new Vector3(a.x - W / 2, H / 2 - a.y, 0), vp);
      const rp = (i === punktUnterZeiger || punktZug?.i === i ? LOOK.tropfen : LOOK.punktRadius) * D * s;
      K.push(px, py, px, py, rp, rp, K.neueGruppe(), 0, true);
    });
  } else if (ansicht === 'front' || ansicht === 'top') {
    const seg = k.umriss(ansicht === 'front' ? 0 : 1);
    const g = K.neueGruppe();
    for (let i = 0; i < seg.length; i += 6) {
      const [ax, ay] = projizieren(new Vector3(seg[i]!, seg[i + 1]!, seg[i + 2]!), vp);
      const [bx, by] = projizieren(new Vector3(seg[i + 3]!, seg[i + 4]!, seg[i + 5]!), vp);
      K.push(ax, ay, bx, by, r0, r0, g, 0, false);
    }
  }
}

/** Punkt der Linie unter dem Zeiger in der Seitenansicht (−1 = keiner) */
function punktSuchen(x: number, y: number): number {
  const feld = vier > 0.9 ? feldStand.seite : undefined;
  if (!feld && (ansicht !== 'seite' || flach < 0.85)) return -1;
  const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
  let best = -1;
  let bd = 12;
  stift.anker.forEach((a, i) => {
    const w0 = new Vector3(a.x - W / 2, H / 2 - a.y, 0);
    const [px, py] = feld ? feldProjizieren(w0, feld.kamera, feld.rect) : projizieren(w0, vp);
    const d = Math.hypot(px / D - x, py / D - y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/** nach dem Ziehen eines Punkts: Netz neu, die Blase in Ruhe in der neuen Form (die Kamera bleibt, wo sie ist) */
function blaseNeu(): void {
  if (!koerper) return;
  const alt = raum;
  netzBauen();
  if (!koerper || !alt) return;
  raum = alt;
  const ms = masse();
  koerper.setzen(moment(99, ms, werte).lage);
  koerper.bezugRuhe();
  koerper.dehnungRechnen();
  haut.hochladen();
  umbauZeit = performance.now();
}

/** Wand unter dem Zeiger (nur die drei sichtbaren, fernen Wände), −1 = keine */
function wandSuchen(x: number, y: number): number {
  const e = raum;
  if (!e || zustand !== 'ruhe') return -1;
  const { o, d } = strahl(x, y);
  const g6 = wandGewichte();
  const mitte = [e.cx, e.cy, 0];
  let best = -1;
  let bt = Infinity;
  for (let w = 0; w < 6; w++) {
    if (g6[w]! < 0.5) continue;
    const achse = Math.floor(w / 2);
    const seite = w % 2 === 0 ? -1 : 1;
    const dd = achse === 0 ? d.x : achse === 1 ? d.y : d.z;
    const oo = achse === 0 ? o.x : achse === 1 ? o.y : o.z;
    if (Math.abs(dd) < 1e-9) continue;
    const t = (mitte[achse]! + seite * e.L - oo) / dd;
    if (t <= 0 || t >= bt) continue;
    const q = o.clone().addScaledVector(d, t);
    const p = [q.x - mitte[0]!, q.y - mitte[1]!, q.z - mitte[2]!];
    const drin = [0, 1, 2].every((a) => a === achse || Math.abs(p[a]!) <= e.L + 1);
    if (drin) {
      bt = t;
      best = w;
    }
  }
  return best;
}

function hauchSuchen(x: number, y: number): boolean {
  if (!koerper || zustand !== 'ruhe') {
    hauch.ziel = 0;
    return false;
  }
  const { o, d } = strahl(x, y);
  const t = koerper.treffen(o.x, o.y, o.z, d.x, d.y, d.z);
  if (t) {
    hauch.pos.set(t.x, t.y, t.z);
    hauch.ziel = 1;
    return true;
  }
  hauch.ziel = 0;
  return false;
}

leinwandLinien.addEventListener('pointermove', (e) => {
  const [x, y] = lageIm(e);
  stift.alt = e.altKey;
  stift.bewegen(x, y);
  if (punktZug) {
    const feld = vier > 0.9 ? feldStand.seite : undefined;
    let wx: number | null = null;
    let wy = 0;
    if (feld) {
      // im Feld der Seite: flache Kamera, Punkt in der Ebene z = 0
      const nx = ((x - feld.rect.x) / feld.rect.w) * 2 - 1;
      const ny = 1 - ((y - feld.rect.y) / feld.rect.h) * 2;
      const p = new Vector3(nx, ny, 0).unproject(feld.kamera);
      wx = p.x;
      wy = p.y;
    } else {
      const { o, d } = strahl(x, y);
      if (Math.abs(d.z) > 1e-9) {
        const t = -o.z / d.z;
        wx = o.x + d.x * t;
        wy = o.y + d.y * t;
      }
    }
    if (wx !== null) {
      const a = stift.anker[punktZug.i]!;
      a.x = wx + W / 2;
      a.y = H / 2 - wy;
      stift.stand++;
      if (performance.now() - umbauZeit > 110) blaseNeu();
    }
  } else if (drehen) {
    if (ansicht !== 'raum') {
      // Drehen verlässt die flache Ansicht: wieder Raum
      ansicht = 'raum';
      ansichtFahrt = { von: [nutzer.gier, nutzer.neigung, flach], nach: [nutzer.gier, nutzer.neigung, 0], t: 0 };
    }
    nutzer.gier = drehen.gier - ((x - drehen.x) * Math.PI) / 520;
    nutzer.neigung = Math.max(-1.1, Math.min(1.1, drehen.neigung + ((y - drehen.y) * Math.PI) / 520));
  } else if (zug && koerper) {
    const k = koerper;
    const F = k.flach;
    const s = (zug.tiefe * 2 * Math.tan((kamera.fov * Math.PI) / 360)) / H;
    const rechts = new Vector3().setFromMatrixColumn(kamera.matrixWorld, 0);
    const oben = new Vector3().setFromMatrixColumn(kamera.matrixWorld, 1);
    const dw = rechts.multiplyScalar((x - zug.x) * s).add(oben.multiplyScalar(-(y - zug.y) * s));
    // weich begrenzt: weiter als ein Viertel der Form gibt die Haut kaum nach (so faltet sie nie)
    const grenze = F.radius * 0.25;
    const l = dw.length();
    if (l > 1e-9) dw.multiplyScalar((grenze * Math.tanh(l / grenze)) / l);
    for (let i = 0; i < F.n; i++) {
      const g = zug.gewicht[i]!;
      k.versatz[i * 3] = zug.start[i * 3]! + g * dw.x;
      k.versatz[i * 3 + 1] = zug.start[i * 3 + 1]! + g * dw.y;
      k.versatz[i * 3 + 2] = zug.start[i * 3 + 2]! + g * zug.zFaktor[i]! * dw.z * (zug.hinten ? -1 : 1);
    }
  } else {
    punktUnterZeiger = punktSuchen(x, y);
    const aufBlase = punktUnterZeiger < 0 && hauchSuchen(x, y);
    wandUnterZeiger = aufBlase || punktUnterZeiger >= 0 || flach > 0.5 ? -1 : wandSuchen(x, y);
  }
  anstossen();
});

leinwandLinien.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  try {
    leinwandLinien.setPointerCapture(e.pointerId);
  } catch {
    // nachgestellte Ereignisse haben keinen echten Zeiger
  }
  const [x, y] = lageIm(e);
  stift.alt = e.altKey;
  stift.bewegen(x, y);
  if (zustand === 'blatt') {
    stift.druecken(x, y);
  } else if (zustand === 'ruhe' && koerper && punktSuchen(x, y) >= 0) {
    punktZug = { i: punktSuchen(x, y) };
  } else if (zustand === 'ruhe' && koerper) {
    const { o, d } = strahl(x, y);
    const t = koerper.treffen(o.x, o.y, o.z, d.x, d.y, d.z);
    if (t && !e.shiftKey) {
      // an der Blase ziehen: weiches Feld um die Stelle, spiegelgleich, der Umfang bleibt in der Ebene
      const F = koerper.flach;
      const n = F.n;
      const hinten = t.tri >= F.tri.length / 3;
      const sigma = Math.max(20, F.radius * 0.3);
      const gewicht = new Float32Array(n);
      const zFaktor = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const v = hinten ? n + i : i;
        const dx = koerper.pos[v * 3]! - t.x;
        const dy = koerper.pos[v * 3 + 1]! - t.y;
        const dz = koerper.pos[v * 3 + 2]! - t.z;
        gewicht[i] = Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * sigma * sigma));
        zFaktor[i] = F.qMax > 0 ? Math.sqrt(F.q[i]! / F.qMax) : 0;
      }
      const e2 = new Vector3(t.x, t.y, t.z).applyMatrix4(kamera.matrixWorldInverse);
      zug = { x, y, start: koerper.versatz.slice(), gewicht, zFaktor, hinten, tiefe: -e2.z };
      hauch.ziel = 1;
      hauch.pos.set(t.x, t.y, t.z);
    } else drehen = { x, y, gier: nutzer.gier, neigung: nutzer.neigung };
  }
  anstossen();
});

const loslassen = (e: PointerEvent): void => {
  if (leinwandLinien.hasPointerCapture(e.pointerId)) leinwandLinien.releasePointerCapture(e.pointerId);
  stift.loslassen();
  if (drehen) einrasten();
  if (punktZug) {
    blaseNeu();
    raumRechnen();
  }
  punktZug = null;
  drehen = null;
  zug = null;
  anstossen();
};
leinwandLinien.addEventListener('pointerup', loslassen);
leinwandLinien.addEventListener('pointercancel', loslassen);
leinwandLinien.addEventListener('pointerleave', () => {
  if (stift.zieht || drehen || zug) return;
  stift.zeiger.da = false;
  hauch.ziel = 0;
  wandUnterZeiger = -1;
  anstossen();
});
leinwandLinien.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (zustand === 'ruhe') {
      nutzer.zoom = Math.max(0.45, Math.min(2.2, nutzer.zoom * Math.exp(e.deltaY * 0.0015)));
      anstossen();
    }
  },
  { passive: false },
);

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey) return;
  stift.alt = e.altKey;
  const k = e.key;
  if (k === 'Enter') {
    if (zustand === 'blatt') {
      if (!stift.geschlossen) stift.schliessen();
      else aufblasen();
    }
  } else if (k === 'Escape') {
    if (zustand === 'blatt') stift.abbrechen();
    else ablassen();
  } else if (k === 'Backspace' || k === 'Delete') {
    if (zustand === 'blatt') stift.zurueck();
    else ablassen();
  } else if (k === ' ') {
    e.preventDefault();
    nochEinmal();
  } else if (k === '4' && zustand === 'ruhe') {
    if (e.repeat) return;
    vierUmschalten();
  } else if ((k === '1' || k === '3' || k === '7' || k === '0') && zustand !== 'blatt') {
    if (e.repeat) return;
    if (vierZiel > 0.5) vierUmschalten(false);
    const ziel: Ansicht = k === '1' ? 'seite' : k === '3' ? 'front' : k === '7' ? 'top' : 'raum';
    tasteGehalten = { taste: k, seit: performance.now(), vorher: ansicht };
    ansichtSetzen(ziel);
  } else if (k === 'm' || k === 'M') fassungSetzen(((fassung + 1) % FASSUNGEN.length) as Fassung);
  else if (k === 'n' || k === 'N') nachtSetzen(!nacht);
  else if (k === 'r' || k === 'R') reglerZeigen(regler.hidden);
  else return;
  anstossen();
});
window.addEventListener('keyup', (e) => {
  stift.alt = e.altKey;
  // gehalten (länger als 0,3 s): nur kurz hingeschaut, zurück
  if (tasteGehalten && e.key === tasteGehalten.taste) {
    if (performance.now() - tasteGehalten.seit > 300) ansichtSetzen(tasteGehalten.vorher);
    tasteGehalten = null;
  }
});

// ---------- Leiste ----------

const fassungKnoepfe = $<HTMLSpanElement>('fassungen');
FASSUNGEN.forEach((name, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = name;
  b.title = `${name} (${i + 1})`;
  b.addEventListener('click', () => fassungSetzen(i as Fassung));
  fassungKnoepfe.append(b);
});

function fassungSetzen(f: Fassung): void {
  fassung = f;
  [...fassungKnoepfe.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === f)));
  anstossen();
}
function nachtSetzen(n: boolean): void {
  nacht = n;
  document.body.classList.toggle('nacht', n);
  $('knopf-nacht').setAttribute('aria-pressed', String(n));
  anstossen();
}
$('knopf-nacht').addEventListener('click', () => nachtSetzen(!nacht));
$('knopf-nochmal').addEventListener('click', () => nochEinmal());
$('knopf-neu').addEventListener('click', () => neu());
fassungSetzen(fassung);
nachtSetzen(nacht);

const regler = $<HTMLElement>('regler');
const reglerKnopf = $('knopf-regler');
const reglerTeile = reglerBauen($('regler-liste'), werte, () => {
  if (koerper && raum) {
    koerper.fuelle = werte.fuelle;
    raumRechnen();
  }
  if (zustand === 'ruhe' && koerper && raum) {
    koerper.setzen(moment(T, masse(), werte).lage);
    koerper.dehnungRechnen();
    haut.hochladen();
  }
  anstossen();
});
function reglerZeigen(an: boolean): void {
  regler.hidden = !an;
  reglerKnopf.setAttribute('aria-pressed', String(an));
}
reglerKnopf.addEventListener('click', () => reglerZeigen(regler.hidden));
$('knopf-grundwerte').addEventListener('click', () => reglerTeile.grundwerte());
$('knopf-kopieren').addEventListener('click', () => reglerTeile.kopieren());
$('titel').textContent = mitZeigerImBild ? (params.get('titel') ?? '') : '';

new ResizeObserver(groesse).observe(buehne);
groesse();
aufwaermen();
void document.fonts?.ready.then(() => anstossen());

// ---------- Test-Haken ----------

interface AnkerEin {
  x: number;
  y: number;
  ein?: [number, number];
  aus?: [number, number];
}

const haken = {
  /** Loop setzen (CSS-Pixel des Blatts) und schließen */
  form(anker: AnkerEin[]): void {
    neu();
    stift.anker = anker.map((a) => ({ x: a.x, y: a.y, ein: a.ein ?? [0, 0], aus: a.aus ?? [0, 0] }));
    stift.schliessen();
    stift.welle = -1;
    film = 1;
    netzBauen();
    anstossen();
  },
  aufblasen,
  ablassen,
  neu,
  fassung: fassungSetzen,
  nacht: nachtSetzen,
  /** Zeit des Aufblasens festhalten (null: laufen lassen) */
  zeit(t: number | null): void {
    festeZeit = t;
    if (t !== null && zustand === 'blatt') aufblasen();
    if (t !== null && koerper && raum) {
      T = t;
      zustand = t >= moment(0, masse(), werte).dauer ? 'ruhe' : 'auf';
    }
    anstossen();
  },
  /** ein Bild sofort zeichnen (auch wenn die Seite verborgen ist) */
  bild(dt = 1 / 60): void {
    bild(dt);
  },
  /** Film: true hält den Takt des Browsers an, dann rechnet nur `bild` */
  film(an: boolean): void {
    angehalten = an;
    if (!an) anstossen();
  },
  /** so viele ms Bild für Bild rechnen (60 je Sekunde) */
  vorspulen(ms: number): void {
    for (let t = 0; t < ms; t += 1000 / 60) bild(1 / 60);
  },
  zeiger(x: number, y: number): void {
    stift.bewegen(x, y);
    hauchSuchen(x, y);
  },
  /** Probe 1: Abstand (px) zwischen gezeichnetem Loop und dem Rahmen im ersten Bild nach ↩ */
  uebergang(): { anker: number; rand: number } {
    if (!stift.geschlossen) return { anker: NaN, rand: NaN };
    if (!koerper || netzStand !== stift.stand) netzBauen();
    const k = koerper!;
    raumRechnen();
    const m = moment(0, masse(), werte);
    k.setzen(m.lage);
    kameraSetzen(m);
    const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    const ab = stift.abtasten(0.25);
    const n = k.flach.n;
    let anker = 0;
    k.flach.anker.forEach((vi, j) => {
      const a = stift.anker[j]!;
      const v = 2 * n + vi;
      const [sx, sy] = projizieren(new Vector3(k.pos[v * 3]!, k.pos[v * 3 + 1]!, k.pos[v * 3 + 2]!), vp);
      anker = Math.max(anker, Math.hypot(sx / D - a.x, sy / D - a.y));
    });
    let rand = 0;
    for (let i = 0; i < k.flach.nb; i++) {
      const v = 2 * n + i;
      const [sx, sy] = projizieren(new Vector3(k.pos[v * 3]!, k.pos[v * 3 + 1]!, k.pos[v * 3 + 2]!), vp);
      let best = Infinity;
      for (let j = 0; j < ab.x.length; j++) best = Math.min(best, Math.hypot(sx / D - ab.x[j]!, sy / D - ab.y[j]!));
      rand = Math.max(rand, best);
    }
    anstossen();
    return { anker, rand };
  },
  /**
   * Probe 2: größter Sprung eines sichtbaren Punkts der Haut über den Abriss hinweg (Welt = px auf dem Blatt), zwischen dem
   * letzten Bild davor und dem ersten danach (60 Bilder je Sekunde)
   */
  abriss(): { riss: number; davor: number; sprung: number; danach: number; jeFlaeche: number[]; uAmMeisten: number } {
    if (!koerper || !raum) return { riss: NaN, davor: NaN, sprung: NaN, danach: NaN, jeFlaeche: [], uAmMeisten: NaN };
    const k = koerper;
    const ms = masse();
    const riss = moment(0, ms, werte).riss;
    const lagen = (t: number): { p: Float32Array; s: Float32Array } => {
      k.setzen(moment(t, ms, werte).lage);
      return { p: k.pos.slice(), s: k.sicht.slice() };
    };
    // vier Bilder im Abstand 1/60 s, der Abriss liegt zwischen dem zweiten und dritten
    const b = [lagen(riss - 3 / 120), lagen(riss - 1 / 120), lagen(riss + 1 / 120), lagen(riss + 3 / 120)];
    const n = k.flach.n;
    const weit = (a: { p: Float32Array; s: Float32Array }, c: { p: Float32Array; s: Float32Array }, je?: number[], wo?: { d: number; u: number }): number => {
      let m = 0;
      for (let v = 0; v < k.anzahl; v++) {
        if (a.s[v]! < 0.5 || c.s[v]! < 0.5) continue;
        const d = Math.hypot(c.p[v * 3]! - a.p[v * 3]!, c.p[v * 3 + 1]! - a.p[v * 3 + 1]!, c.p[v * 3 + 2]! - a.p[v * 3 + 2]!);
        m = Math.max(m, d);
        if (je) je[Math.floor(v / n)] = Math.max(je[Math.floor(v / n)]!, d);
        if (wo && d > wo.d) {
          wo.d = d;
          wo.u = k.hoehe[v]!;
        }
      }
      return m;
    };
    const jeFlaeche = [0, 0, 0];
    const wo = { d: 0, u: 0 };
    const davor = weit(b[0]!, b[1]!);
    const sprung = weit(b[1]!, b[2]!, jeFlaeche, wo);
    const danach = weit(b[2]!, b[3]!);
    k.setzen(moment(T, ms, werte).lage);
    return { riss, davor, sprung, danach, jeFlaeche, uAmMeisten: wo.u };
  },
  /** ein Punkt der Blase im Bild (CSS-Pixel): Anteile (−1..1) des Rahmens um den Schwerpunkt, auf der Vorderseite */
  aufDerHaut(fx: number, fy: number): { x: number; y: number } | null {
    if (!koerper) return null;
    const F = koerper.flach;
    let best = -1;
    let bd = Infinity;
    const zx = F.cx + fx * F.radius * 0.7;
    const zy = F.cy + fy * F.radius * 0.7;
    for (let i = 0; i < F.n; i++) {
      const d = Math.hypot(F.x[i]! - zx, F.y[i]! - zy);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    const [sx, sy] = projizieren(new Vector3(koerper.pos[best * 3]!, koerper.pos[best * 3 + 1]!, koerper.pos[best * 3 + 2]!), vp);
    return { x: sx / D, y: sy / D };
  },
  /** ein Punkt auf einer der drei fernen Wände im Bild (CSS-Pixel): 0 hinten (z), 1 seitlich (x), 2 unten (y); Lage als Anteile (−1..1) */
  aufDerWand(i: number, fa: number, fb: number): { x: number; y: number } | null {
    const e = raum;
    if (!e) return null;
    const g6 = wandGewichte();
    const s = [g6[0]! >= g6[1]! ? -1 : 1, g6[2]! >= g6[3]! ? -1 : 1, g6[4]! >= g6[5]! ? -1 : 1];
    const p =
      i === 0
        ? new Vector3(e.cx + fa * 1.2 * e.rx, e.cy + fb * 1.2 * e.ry, s[2]! * e.L)
        : i === 1
          ? new Vector3(e.cx + s[0]! * e.L, e.cy + fb * 1.2 * e.ry, fa * 1.2 * e.tiefe)
          : new Vector3(e.cx + fa * 1.2 * e.rx, e.cy + s[1]! * e.L, fb * 1.2 * e.tiefe);
    const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    const [sx, sy] = projizieren(p, vp);
    return { x: sx / D, y: sy / D };
  },
  ansicht(a: Ansicht): void {
    ansichtSetzen(a);
  },
  vier(an: boolean): void {
    vierUmschalten(an);
  },
  /** Punkt i der Linie im Bild (CSS-Pixel), in der Seitenansicht oder im Feld der Seite */
  punktImBild(i: number): { x: number; y: number } | null {
    const a = stift.anker[i];
    if (!a) return null;
    const w0 = new Vector3(a.x - W / 2, H / 2 - a.y, 0);
    const feld = vier > 0.9 ? feldStand.seite : undefined;
    const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    const [px, py] = feld ? feldProjizieren(w0, feld.kamera, feld.rect) : projizieren(w0, vp);
    return { x: px / D, y: py / D };
  },
  stand(): Record<string, unknown> {
    return { zustand, T, fassung, nacht, ...stat, anker: stift.anker.length, geschlossen: stift.geschlossen, wand: wandUnterZeiger };
  },
};
(window as unknown as { __anfang: typeof haken }).__anfang = haken;
