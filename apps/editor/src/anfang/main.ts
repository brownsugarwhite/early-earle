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

import { Color, Matrix4, PerspectiveCamera, Vector2, Vector3, WebGLRenderer } from 'three';
import { glatt, type Masse, type Moment, moment } from './aufblasen';
import { FluessigeAnzeige, type Szene } from './fluessig';
import { FLACH, Koerper, netzAusUmriss } from './form';
import { FASSUNGEN, type Fassung, Haut, type HautWerte, type Wand } from './haut';
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

// ---------- Ecke ----------

/**
 * Die Ecke (Florian, 15.11.: „ich meinte Ecke“, wie in der Vision „Ecke“ vom 13.11.): drei unsichtbare Flächen hinter der Blase, die
 * sich in einem Punkt treffen. Rückwand (z = −zw) mit der Seite (dorthin fährt der Rahmen), linke Wand (x = xl) mit der Front, Boden
 * (y = yb) mit Top. Man sieht sie an ihren leichten Schatten, an drei feinsten Kanten und an ihren Namen in Lobster, die auf dem
 * Boden liegen. Am Ende schaut die Kamera schräg von rechts oben in die Ecke; ihr Abstand ist so gewählt, dass Blase, Schatten und
 * Namen ins Bild passen (auch im hohen, schmalen Fenster).
 */
interface Ecke {
  cx: number;
  cy: number;
  xl: number;
  yb: number;
  zw: number;
  /** halbe Ausdehnung der Blase in x und y (Welt), größte Tiefe einer Seite, Maß der Ecke */
  rx: number;
  ry: number;
  tiefe: number;
  R: number;
  /** Lage der Schatten an der linken Wand und am Boden in der Tiefe (etwas zur Ecke hin) */
  sz: number;
  /** Abstand der Kamera zur Mitte der Blase am Ende */
  abstand: number;
  /** Namen auf dem Boden: Mitte, Leserichtung (Länge = Breite), Richtung der Oberkante der Buchstaben (Länge = Tiefe) */
  namen: { mitte: Vector3; u: Vector3; v: Vector3 }[];
}
let ecke: Ecke | null = null;

const WAND_NAMEN = ['Seite', 'Front', 'Top'] as const;
/** gerade unter dem Zeiger: Wand 0 (Rückwand), 1 (links), 2 (Boden) oder −1 */
let wandUnterZeiger = -1;
const wandSicht = [0, 0, 0];
/** Seitenverhältnis der Namen (Breite : Höhe des Bilds der Schrift), sobald Lobster geladen ist */
let namenFormat = [3.2, 3.2, 2.0];

function eckeRechnen(): void {
  if (!koerper) {
    ecke = null;
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
  const xl = F.cx - rx - 0.8 * R;
  const yb = F.cy - ry - 0.55 * R;
  const zw = tiefe + 0.9 * R;
  const sz = -0.3 * zw;
  // Namen: Buchstabenhöhe, auf dem Boden in die Tiefe gestreckt (so lesen sie sich von schräg oben besser, wie Schrift auf einer Straße)
  const h = 0.3 * R;
  const streck = 1.9;
  const boden = yb + 0.5;
  const name = (i: number, mitte: Vector3, u: Vector3, v: Vector3) => ({ mitte, u: u.multiplyScalar(h * namenFormat[i]!), v: v.multiplyScalar(h * streck) });
  const tiefeName = h * streck;
  const namen = [
    name(0, new Vector3(F.cx + 0.45 * rx, boden, -zw + tiefeName / 2 + 0.08 * R), new Vector3(1, 0, 0), new Vector3(0, 0, -1)),
    name(1, new Vector3(xl + tiefeName / 2 + 0.08 * R, boden, sz + tiefe + 0.35 * R), new Vector3(0, 0, -1), new Vector3(-1, 0, 0)),
    name(2, new Vector3(F.cx, boden, sz + tiefe + tiefeName / 2 + 0.12 * R), new Vector3(1, 0, 0), new Vector3(0, 0, -1)),
  ];
  const e: Ecke = { cx: F.cx, cy: F.cy, xl, yb, zw, rx, ry, tiefe, R, sz, abstand: L0, namen };
  ecke = e;
  e.abstand = einpassen(e);
  haut.setzeNamen(
    WAND_NAMEN.map((t, i) => ({ text: t, mitte: namen[i]!.mitte, u: namen[i]!.u, v: namen[i]!.v })),
    (i, format) => {
      if (Math.abs(namenFormat[i]! - format) > 0.01) {
        namenFormat[i] = format;
        eckeRechnen();
      }
    },
  );
}

/** Kamera am Ende (Drehung und Neigung aus den Werten, Ziel Mitte der Blase) mit Abstand d */
function kameraAmEnde(e: Ecke, d: number, cam: PerspectiveCamera): void {
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

/** kleinster Abstand, bei dem Blase, Schatten, Ecke und Namen ins Bild passen (Rand frei, unten Platz für die Leiste) */
function einpassen(e: Ecke): number {
  const cam = new PerspectiveCamera();
  const pkt: Vector3[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) pkt.push(new Vector3(e.cx + sx * e.rx, e.cy + sy * e.ry, sz * e.tiefe));
      pkt.push(new Vector3(e.cx + sx * e.rx, e.cy + sy * e.ry, -e.zw));
      pkt.push(new Vector3(e.xl, e.cy + sy * e.ry, e.sz + sx * e.tiefe));
      pkt.push(new Vector3(e.cx + sx * e.rx, e.yb, e.sz + sy * e.tiefe));
    }
  pkt.push(new Vector3(e.xl, e.yb, -e.zw));
  for (const n of e.namen)
    for (const a of [-0.5, 0.5]) for (const b of [-0.5, 0.5]) pkt.push(n.mitte.clone().addScaledVector(n.u, a).addScaledVector(n.v, b));
  const passt = (d: number): boolean => {
    kameraAmEnde(e, d, cam);
    for (const p of pkt) {
      const c = p.clone().project(cam);
      if (c.z > 1 || Math.abs(c.x) > 0.88 || c.y > 0.86 || c.y < -0.72) return false;
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
  return { a: Math.sqrt(Math.abs(F.flaeche) / Math.PI), Zw: ecke!.zw };
}

function waendeFuer(m: Moment | null): Wand[] {
  const e = ecke;
  if (!e || !m) return [];
  const rest = m.schatten >= 0.999 ? 1 : 0;
  return [
    { achse: 2, lage: -e.zw, staerke: rest },
    { achse: 0, lage: e.xl, staerke: m.waende, z: e.sz },
    { achse: 1, lage: e.yb, staerke: m.waende, z: e.sz },
  ];
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
  else eckeRechnen();
  anstossen();
}

// ---------- Netz ----------

function netzBauen(): void {
  netzStand = stift.stand;
  if (!stift.geschlossen) {
    koerper = null;
    ecke = null;
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
  eckeRechnen();
  netzZeit = performance.now();
  Object.assign(stat, { netzMs: flach.stat.ms, punkte: flach.stat.punkte, dreiecke: flach.stat.dreiecke, fehlend: flach.stat.fehlendeRandkanten, schritte: flach.stat.schritte });
}

// ---------- Ablauf ----------

function aufblasen(): void {
  if (!stift.geschlossen) return;
  if (!koerper || netzStand !== stift.stand) netzBauen();
  if (!koerper) return;
  koerper.versatz.fill(0);
  koerper.bezugFlach();
  eckeRechnen();
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
  if (koerper && ecke) T = Math.min(T, moment(0, masse(), werte).dauer);
  anstossen();
}

function nochEinmal(): void {
  if (zustand === 'blatt') {
    aufblasen();
    return;
  }
  if (!koerper) return;
  koerper.versatz.fill(0);
  koerper.bezugFlach();
  nutzer.gier = 0;
  nutzer.neigung = 0;
  nutzer.zoom = 1;
  zustand = 'auf';
  T = 0;
  anstossen();
}

function neu(): void {
  zustand = 'blatt';
  T = 0;
  stift.abbrechen();
  koerper = null;
  ecke = null;
  haut.setzeKoerper(null);
  nutzer.gier = 0;
  nutzer.neigung = 0;
  nutzer.zoom = 1;
  film = 0;
  anstossen();
}

// ---------- Kamera ----------

/** Dolly-Zoom vom Blatt in den Kasten: der Öffnungswinkel wächst, die Blase bleibt (fast) gleich groß, die Tiefe erscheint */
function kameraSetzen(m: Moment | null): void {
  const k = ecke;
  const f = m && k ? m.fahrt : 0;
  const fov = FOV0 + (werte.fov - FOV0) * f;
  const halb = (fov * Math.PI) / 360;
  kamera.fov = fov;
  // Maßstab der Ebene z = 0: am Anfang 1 (das Blatt), am Ende so, dass die Ecke ins Bild passt
  const ende = k ? H / 2 / (k.abstand * Math.tan((werte.fov * Math.PI) / 360)) : 1;
  const massstab = 1 + (ende - 1) * f;
  const abstand = (H / 2 / (Math.tan(halb) * massstab)) * (1 + (nutzer.zoom - 1) * f);
  const ziel = new Vector3((k?.cx ?? 0) * f, (k?.cy ?? 0) * f, 0);
  const gier = ((werte.gier * Math.PI) / 180) * f + nutzer.gier * f;
  const neigung = ((werte.neigung * Math.PI) / 180) * f + nutzer.neigung * f;
  kamera.position.set(ziel.x + abstand * Math.sin(gier) * Math.cos(neigung), ziel.y + abstand * Math.sin(neigung), ziel.z + abstand * Math.cos(gier) * Math.cos(neigung));
  kamera.up.set(0, 1, 0);
  kamera.lookAt(ziel);
  kamera.near = abstand * 0.05;
  kamera.far = abstand * 30;
  kamera.updateProjectionMatrix();
  kamera.updateMatrixWorld();
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
  if (zustand !== 'blatt' && koerper && ecke) {
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
  kameraSetzen(zustand === 'blatt' ? null : m);
  // Fahrtwind: die Farben fließen gegen die Drehung
  const gierJetzt = Math.atan2(kamera.position.x - (ecke?.cx ?? 0), kamera.position.z);
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
  for (let i = 0; i < 3; i++) {
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
    vorn: zustand === 'blatt' ? film : 1,
    hinten: m ? 1 : 0,
    rahmen: m ? (m.schatten >= 0.999 ? 0 : 1) : 0,
    schatten: m ? m.schatten : 0,
    deckung: zustand === 'blatt' ? 0.42 * film : 0.42 + 0.58 * glatt(T / 1.4),
    hauch: hauch.pos,
    hauchStaerke: hauch.staerke,
    hauchRadius: Math.max(24, (F?.radius ?? 200) * 0.2),
    wind,
    dicke: werte.dicke,
    spannung: werte.spannung,
    sicht: werte.sicht,
    waende: waendeFuer(m),
    schattenFarbe,
    namen: m ? WAND_NAMEN.map((_, i) => ({ staerke: m!.waende, hervor: wandSicht[i]! })) : [],
  };
  haut.zeichnen(kamera, w);
  // Linien
  K.leeren();
  const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
  if (zustand === 'blatt') {
    stift.kapseln(K, D, true);
  } else if (koerper && F && ecke && m) {
    linienImRaum(vp, m);
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
        ? 'über eine Wand fahren: ihre Linien · an der Blase ziehen: dehnen · daneben ziehen: drehen · Leertaste: noch einmal · Esc: zurück aufs Blatt'
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
  const e = ecke!;
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
  // Kanten der Ecke: drei feinste Haarlinien vom Eckpunkt aus (Rückwand und Boden, Rückwand und linke Wand, linke Wand und Boden)
  const kanten = werte.kanten * m.waende;
  if (kanten > 0.01) {
    const L = 6 * e.R;
    const c = [e.xl, e.yb, -e.zw];
    const enden = [
      [e.xl + L, e.yb, -e.zw],
      [e.xl, e.yb + L, -e.zw],
      [e.xl, e.yb, -e.zw + L],
    ];
    const g = K.neueGruppe();
    const r = 0.14 * D * kanten;
    for (const z of enden) {
      const a = new Vector3(c[0], c[1], c[2]);
      const b = new Vector3(z[0], z[1], z[2]);
      const st = 32;
      let vorher: [number, number] | null = null;
      for (let s = 0; s <= st; s++) {
        const q = a.clone().lerp(b, s / st);
        const vorKamera = q.clone().applyMatrix4(kamera.matrixWorldInverse).z < -kamera.near * 2;
        const cc = q.clone().applyMatrix4(vp);
        if (!vorKamera || Math.abs(cc.x) > 3 || Math.abs(cc.y) > 3) {
          vorher = null;
          continue;
        }
        const pp: [number, number] = [(cc.x * 0.5 + 0.5) * W * D, (0.5 - cc.y * 0.5) * H * D];
        if (vorher) K.push(vorher[0], vorher[1], pp[0], pp[1], r, r, g, 0, false);
        vorher = pp;
      }
    }
  }
  // linke Wand und Boden: Umriss der Blase von ihrer Achse, auf die Wand gelegt (etwas zur Ecke hin wie der Schatten)
  for (let wnd = 1; wnd < 3; wnd++) {
    const s = wandSicht[wnd]!;
    if (s < 0.01) continue;
    const achse = wnd === 1 ? 0 : 1;
    const lage = wnd === 1 ? e.xl : e.yb;
    const seg = k.umriss(achse);
    const g = K.neueGruppe();
    const r = r0 * s;
    for (let i = 0; i < seg.length; i += 6) {
      const a = new Vector3(seg[i]!, seg[i + 1]!, seg[i + 2]! + e.sz);
      const b = new Vector3(seg[i + 3]!, seg[i + 4]!, seg[i + 5]! + e.sz);
      if (achse === 0) {
        a.x = lage;
        b.x = lage;
      } else {
        a.y = lage;
        b.y = lage;
      }
      const [ax, ay] = projizieren(a, vp);
      const [bx, by] = projizieren(b, vp);
      K.push(ax, ay, bx, by, r, r, g, 0, false);
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

/** Wand unter dem Zeiger: Rückwand 0, linke Wand 1, Boden 2 (oder der Name einer Wand auf dem Boden), −1 = keine */
function wandSuchen(x: number, y: number): number {
  const e = ecke;
  if (!e || zustand !== 'ruhe') return -1;
  const { o, d } = strahl(x, y);
  const weit = 6 * e.R;
  let best = -1;
  let bt = Infinity;
  let treffer: Vector3 | null = null;
  const pruefen = (i: number, achse: 0 | 1 | 2, lage: number): void => {
    const dd = achse === 0 ? d.x : achse === 1 ? d.y : d.z;
    const oo = achse === 0 ? o.x : achse === 1 ? o.y : o.z;
    if (Math.abs(dd) < 1e-9) return;
    const t = (lage - oo) / dd;
    if (t <= 0 || t >= bt) return;
    const q = o.clone().addScaledVector(d, t);
    // jede Fläche reicht von der Ecke aus nach rechts, oben und vorn
    const inX = q.x >= e.xl - 1 && q.x <= e.xl + weit;
    const inY = q.y >= e.yb - 1 && q.y <= e.yb + weit;
    const inZ = q.z >= -e.zw - 1 && q.z <= -e.zw + weit;
    if ((achse === 2 && inX && inY) || (achse === 0 && inY && inZ) || (achse === 1 && inX && inZ)) {
      bt = t;
      best = i;
      treffer = q;
    }
  };
  pruefen(0, 2, -e.zw);
  pruefen(1, 0, e.xl);
  pruefen(2, 1, e.yb);
  // auf dem Boden: liegt der Zeiger auf einem Namen, gilt dessen Wand
  if (best === 2 && treffer) {
    const q = treffer as Vector3;
    for (let i = 0; i < e.namen.length; i++) {
      const nm = e.namen[i]!;
      const dq = q.clone().sub(nm.mitte);
      const a = dq.dot(nm.u) / nm.u.lengthSq();
      const b = dq.dot(nm.v) / nm.v.lengthSq();
      if (Math.abs(a) <= 0.5 && Math.abs(b) <= 0.5) return i;
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
  if (drehen) {
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
    const aufBlase = hauchSuchen(x, y);
    wandUnterZeiger = aufBlase ? -1 : wandSuchen(x, y);
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
  } else if (k >= '1' && k <= '4') fassungSetzen((Number(k) - 1) as Fassung);
  else if (k === 'n' || k === 'N') nachtSetzen(!nacht);
  else if (k === 'r' || k === 'R') reglerZeigen(regler.hidden);
  else return;
  anstossen();
});
window.addEventListener('keyup', (e) => {
  stift.alt = e.altKey;
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
const reglerTeile = reglerBauen($('regler-liste'), werte, (k) => {
  if (koerper && ecke) {
    koerper.fuelle = werte.fuelle;
    eckeRechnen();
  }
  if (zustand === 'ruhe' && koerper && ecke) {
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
    if (t !== null && koerper && ecke) {
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
    eckeRechnen();
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
    if (!koerper || !ecke) return { riss: NaN, davor: NaN, sprung: NaN, danach: NaN, jeFlaeche: [], uAmMeisten: NaN };
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
  /** ein Punkt auf einer Wand im Bild (CSS-Pixel): Wand 0 (Rückwand), 1 (links), 2 (Boden); Lage als Anteile (−1..1) um die Schatten */
  aufDerWand(i: number, fa: number, fb: number): { x: number; y: number } | null {
    const e = ecke;
    if (!e) return null;
    const p =
      i === 0
        ? new Vector3(e.cx + fa * 1.5 * e.rx, e.cy + fb * 1.3 * e.ry, -e.zw)
        : i === 1
          ? new Vector3(e.xl, e.cy + fb * 1.3 * e.ry, e.sz + fa * 1.5 * e.tiefe)
          : new Vector3(e.cx + fa * 1.5 * e.rx, e.yb, e.sz + fb * 1.5 * e.tiefe);
    const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    const [sx, sy] = projizieren(p, vp);
    return { x: sx / D, y: sy / D };
  },
  /** Mitte eines Namens auf dem Boden im Bild (CSS-Pixel) */
  aufDemNamen(i: number): { x: number; y: number } | null {
    const e = ecke;
    if (!e || !e.namen[i]) return null;
    const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    const [sx, sy] = projizieren(e.namen[i]!.mitte.clone(), vp);
    return { x: sx / D, y: sy / D };
  },
  stand(): Record<string, unknown> {
    return { zustand, T, fassung, nacht, ...stat, anker: stift.anker.length, geschlossen: stift.geschlossen, wand: wandUnterZeiger };
  },
};
(window as unknown as { __anfang: typeof haken }).__anfang = haken;
