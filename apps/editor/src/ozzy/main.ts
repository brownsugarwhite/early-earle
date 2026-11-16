/**
 * Ozzy (16.11.2026): der Editor für Florians Formen, aus einem Guss. Plan: `docs/plans/2026-11-16-ozzy.md`, Stand und nächste
 * Schritte: `docs/look/ozzy/UEBERGABE.md`. Seite: `ozzy.html`.
 *
 * Stand 0 (dieser Bau): Blatt mit „draw something“ und Leiste (P der Linien-Studie, Freihand, Ellipse, Würfel, Mülleimer); ↩ bläst
 * mit dem Ablauf der Aufblas-Studie auf (Seifenhaut, Kuppel von der Mitte, Hals, Abriss, Schnalz), die Kamera fährt dabei in die
 * Ecke. An den drei abgewandten Wänden stehen die Linien der Ansichten (keine Schatten), in der Mitte die Blase. Die Kamera behält
 * die Größe der Form bei jedem Wechsel (G4) und endet beim Einrasten genau parallel (G5). Tab: Vier Ansichten in Flucht (G4), die
 * Felder zeigen nur Linien, das vierte nur die Blase; Haarlinien mit einem Tropfen an der Kreuzung, der die Felder einstellt.
 * Noch die Blase der Aufblas-Studie; der Kern von Sitzung 4 kommt mit dem Werk (Plan, Phase 1 und 3).
 *
 * Zwei Leinwände übereinander: unten die Haut (three.js, `../anfang/haut.ts`), oben Linien, Punkte, Zeiger und Teiler (flüssige
 * Anzeige der Linien-Studie). Welt: CSS-Pixel des Blatts, y nach oben, Mitte des Fensters im Ursprung.
 */

import { Color, Matrix4, Vector2, Vector3, WebGLRenderer } from 'three';
import { glatt, type Masse, type Moment, moment } from '../anfang/aufblasen';
import { FLACH, Koerper, netzAusUmriss } from '../anfang/form';
import { FASSUNGEN, type Fassung, Haut, type HautWerte } from '../anfang/haut';
import { GRUNDWERTE as BLASE_GRUNDWERTE, REGLER as BLASE_REGLER, type Werte as BlasenWerte } from '../anfang/regler';
import { FluessigeAnzeige, type Szene } from '../linien/fluessig';
import { REGLER as LINIEN_REGLER } from '../linien/regler';
import { GRUNDWERTE as LINIEN_GRUNDWERTE, type Werte as LinienWerte } from '../linien/verhalten';
import { type Anker, Blatt, FREIHAND_GRUNDWERTE, type FreihandWerte, type Werkzeug } from './blatt';
import { Kamera, perspektiveBei } from './kamera';
import { Kapseln } from './kapseln';
import { Leiste } from './leiste';
import { type Bereich, type ReglerZeile, feinreglerBauen, werteLesen } from './regler';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
// ?bild=1: ohne Bedienung (Vergleichsbilder); ?film=1: ohne Bedienung, mit Zeiger; ?info=1: Takt
if (params.get('bild') === '1' || params.get('film') === '1') document.body.classList.add('bild');
const mitZeigerImBild = params.get('film') === '1';
const mitInfo = params.get('info') === '1';
if (mitInfo) document.body.classList.add('info');

// ---------- Werte (Feinregler) ----------

interface BuehnenWerte {
  /** Durchmesser der Form (größte halbe Ausdehnung × 2) als Anteil der kürzeren Bildseite im Raum und eingerastet */
  groesse: number;
  /** so nah an einer Achse rastet das Drehen ein (Grad) */
  einrasten: number;
  /** Dauer der Fahrt in eine Ansicht (s) */
  fahrt: number;
  /** Abstand der Wände hinter der Form (× größte halbe Ausdehnung) */
  waende: number;
  /** Stärke der Linien an den Wänden */
  wandLinien: number;
  /** Vier Ansichten: wie weit die Ansichten ihre Felder füllen; Rand (px) */
  vierFuellung: number;
  vierRand: number;
  /** so weit darf der Maßstab vom Ziel abweichen, bevor sich das Bild der Form anpasst (Anteil) */
  band: number;
}

const BUEHNE_GRUND: BuehnenWerte = { groesse: 0.3, einrasten: 9, fahrt: 0.6, waende: 2.2, wandLinien: 1, vierFuellung: 0.82, vierRand: 18, band: 0.3 };
const BUEHNE_REGLER: ReglerZeile<keyof BuehnenWerte>[] = [
  { gruppe: 'Raum', k: 'groesse', name: 'Größe der Form im Bild', min: 0.12, max: 0.8, schritt: 0.01 },
  { gruppe: 'Raum', k: 'waende', name: 'Wände: Abstand (× Form)', min: 0.6, max: 5, schritt: 0.05 },
  { gruppe: 'Raum', k: 'wandLinien', name: 'Wände: Linien', min: 0, max: 2, schritt: 0.05 },
  { gruppe: 'Ansichten', k: 'einrasten', name: 'rastet ein unter (°)', min: 2, max: 25, schritt: 0.5 },
  { gruppe: 'Ansichten', k: 'fahrt', name: 'Fahrt in eine Ansicht (s)', min: 0.15, max: 2, schritt: 0.01 },
  { gruppe: 'Ansichten', k: 'band', name: 'Größe passt sich an ab (Anteil)', min: 0.05, max: 1, schritt: 0.01 },
  { gruppe: 'Vier Ansichten', k: 'vierFuellung', name: 'Ansichten füllen ihr Feld', min: 0.4, max: 1, schritt: 0.01 },
  { gruppe: 'Vier Ansichten', k: 'vierRand', name: 'Rand (px)', min: 0, max: 60, schritt: 1 },
];
const FREIHAND_REGLER: ReglerZeile<keyof FreihandWerte>[] = [
  { gruppe: 'Freihand', k: 'glaettung', name: 'Glättung', min: 0, max: 1, schritt: 0.05 },
  { gruppe: 'Freihand', k: 'treue', name: 'Treue (px)', min: 0.5, max: 10, schritt: 0.5 },
  { gruppe: 'Freihand', k: 'faden', name: 'Faden statt Nachlauf', min: 0, max: 1, schritt: 1 },
];
/** In Ozzy schaut die Kamera schräger in die Ecke als in der Studie, damit die Ansichten an den Wänden neben der Blase liegen */
const BLASE_GRUND: BlasenWerte = { ...BLASE_GRUNDWERTE, gier: 40, neigung: 24, fov: 36, schatten: 0 };

const linienWerte = werteLesen<LinienWerte>('ozzy-linien-1', LINIEN_GRUNDWERTE);
const freihandWerte = werteLesen<FreihandWerte>('ozzy-freihand-1', FREIHAND_GRUNDWERTE);
const werte = werteLesen<BlasenWerte>('ozzy-blase-1', BLASE_GRUND);
const bw = werteLesen<BuehnenWerte>('ozzy-buehne-1', BUEHNE_GRUND);

// ---------- Teile ----------

const buehne = $<HTMLDivElement>('buehne');
const leinwandHaut = $<HTMLCanvasElement>('haut');
const leinwandLinien = $<HTMLCanvasElement>('linien');
const gruss = $<HTMLDivElement>('gruss');
const hinweis = $<HTMLDivElement>('hinweis');
const infoAnzeige = $<HTMLSpanElement>('info');

const renderer = new WebGLRenderer({ canvas: leinwandHaut, antialias: false, alpha: false, powerPreference: 'high-performance' });
const haut = new Haut(renderer);
const anzeige = new FluessigeAnzeige(leinwandLinien);
const blatt = new Blatt(linienWerte, freihandWerte);
const kam = new Kamera();
const K = new Kapseln();
const FOV0 = 26;

type Zustand = 'blatt' | 'auf' | 'ruhe' | 'ab';
let zustand: Zustand = 'blatt';
/** Zeit seit ↩ (s); im Film von außen gesetzt */
let T = 0;
let festeZeit: number | null = null;
let fassung: Fassung = Number(params.get('fassung') ?? 0) as Fassung;
let W = 1;
let H = 1;
let D = 1;
let koerper: Koerper | null = null;
/** die Silhouette, aus der `koerper` gebaut ist, und ihre Kennzahl */
let silhouette: Anker[] | null = null;
let netzStand = -1;
let netzZeit = 0;
/** Einblenden der Haut nach dem Schließen (0..1) */
let film = 0;
/** Uhr des Materials (s) */
let uhr = 0;
/** Drehung von Hand (zur Lage am Ende des Aufblasens) und Zoom von Hand */
const nutzer = { gier: 0, neigung: 0, zoom: 1 };

/** Ansicht: Raum oder eine Achse; `flach` 0 = Raum, 1 = genau parallel auf der Achse */
type Ansicht = 'raum' | 'seite' | 'front' | 'top';
let ansicht: Ansicht = 'raum';
let flach = 0;
let ansichtFahrt: { von: [number, number, number]; nach: [number, number, number]; t: number } | null = null;
let tasteGehalten: { taste: string; seit: number; vorher: Ansicht } | null = null;
/** Drehung und Neigung jeder Ansicht (Grad), als Ziel der ganzen Kamera */
const ANSICHT_WINKEL: Record<Ansicht, [number, number] | null> = { raum: null, seite: [0, 0], front: [-90, 0], top: [0, 90] };

/** Vier Ansichten (Tab): 0 = aus, 1 = an */
let vier = 0;
let vierZiel = 0;
let vierFahrt: { von: number; t: number } | null = null;
/** Lage des Teilers: Florians Abweichung von der Lage aus den Maßen der Form (Anteile) und die Feder dorthin */
const teiler = { bx: 0, by: 0, fx: 0.5, fy: 0.5, zug: false, ueber: 0 };

let drehen: { x: number; y: number; gier: number; neigung: number } | null = null;
let zug: { x: number; y: number; start: Float32Array; gewicht: Float32Array; zFaktor: Float32Array; hinten: boolean; tiefe: number } | null = null;
/** Punkt der Silhouette, der gezogen wird; in welcher Ebene (z der Ebene, Feld der Seite oder Ebene der Ansicht) */
let punktZug: { i: number; ort: 'wand' | 'flach' | 'feld'; z: number } | null = null;
let punktUnterZeiger = -1;
let umbauZeit = 0;
const hauch = { pos: new Vector3(1e6, 1e6, 1e6), staerke: 0, ziel: 0 };
const wind = new Vector2();
let letzteDrehung = { gier: 0, neigung: 0 };
const zeiger = { x: -1e6, y: -1e6, da: false };
/** Maßstab: Ziel aus der Größe der Form und das, was gezeigt wird (passt sich nur in der Ruhe an) */
const massstab = { ziel: 1, jetzt: 1, seitRuhe: 0, nachfuehren: false };
const WEISS = new Color(1, 1, 1);
const stat = { fps: 0, bildMs: 0, netzMs: 0, punkte: 0, dreiecke: 0 };

// ---------- Raum ----------

/**
 * Der Würfel um die Blase: sechs unsichtbare Wände, je Achse trägt die von der Kamera abgewandte die Linien ihrer Ansicht (höchstens
 * drei zugleich, beim Drehen weich auf die Gegenwand). Abstand der Wände: so weit, dass die Zeichnungen neben der Blase liegen.
 */
interface Raum {
  cx: number;
  cy: number;
  L: number;
  rx: number;
  ry: number;
  tiefe: number;
  R: number;
}
let raum: Raum | null = null;
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
  const R = Math.max(rx, ry, tiefe, 1);
  raum = { cx: F.cx, cy: F.cy, L: R * (1 + bw.waende), rx, ry, tiefe, R };
  massstab.ziel = (bw.groesse * Math.min(W, H)) / (2 * R);
}

function masse(): Masse {
  const F = koerper!.flach;
  return { a: Math.sqrt(Math.abs(F.flaeche) / Math.PI), Zw: raum!.L };
}

/** Gewicht je Wand (0..5 = Achse · 2 + (Seite > 0)): die von der Kamera abgewandte Seite jeder Achse, weich beim Wechsel */
function wandGewichte(): number[] {
  const e = raum;
  if (!e) return [0, 0, 0, 0, 0, 0];
  const d = kam.aktiv.position.clone().sub(new Vector3(e.cx, e.cy, 0)).normalize();
  const g = (x: number): number => {
    const t = Math.min(1, Math.max(0, (x - 0.03) / 0.17));
    return t * t * (3 - 2 * t);
  };
  return [g(d.x), g(-d.x), g(d.y), g(-d.y), g(d.z), g(-d.z)];
}

/** wie viel vom Raum zu sehen ist: in einer flachen Ansicht nichts */
function raumSicht(): number {
  return (1 - flach) * (1 - flach);
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
  if (zustand === 'blatt') netzStand = -1;
  else raumRechnen();
  anstossen();
}

// ---------- Netz der Blase ----------

/** Proben der Silhouette (CSS-Pixel des Blatts), mit den Stellen der Anker */
function abtasten(A: Anker[], schritt: number): { x: number[]; y: number[]; anker: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  const anker: number[] = [];
  const bez = (a: number, b: number, c: number, d: number, t: number): number => {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  };
  for (let i = 0; i < A.length; i++) {
    const a = A[i]!;
    const b = A[(i + 1) % A.length]!;
    const p1 = [a.x + a.aus[0], a.y + a.aus[1]];
    const p2 = [b.x + b.ein[0], b.y + b.ein[1]];
    const grob = Math.hypot(p1[0]! - a.x, p1[1]! - a.y) + Math.hypot(p2[0]! - p1[0]!, p2[1]! - p1[1]!) + Math.hypot(b.x - p2[0]!, b.y - p2[1]!);
    const k = Math.max(2, Math.ceil(grob / schritt));
    anker.push(x.length);
    for (let j = 0; j < k; j++) {
      const t = j / k;
      x.push(bez(a.x, p1[0]!, p2[0]!, b.x, t));
      y.push(bez(a.y, p1[1]!, p2[1]!, b.y, t));
    }
  }
  return { x, y, anker };
}

function netzBauen(): void {
  netzStand = blatt.stand;
  silhouette = blatt.silhouette();
  if (!silhouette) {
    koerper = null;
    raum = null;
    haut.setzeKoerper(null);
    return;
  }
  const ab = abtasten(silhouette, 1);
  const flachNetz = netzAusUmriss({ x: ab.x.map((x) => x - W / 2), y: ab.y.map((y) => H / 2 - y), anker: ab.anker });
  koerper = new Koerper(flachNetz);
  koerper.fuelle = werte.fuelle;
  koerper.setzen(FLACH);
  koerper.dehnungRechnen();
  haut.setzeKoerper(koerper);
  haut.hochladen();
  raumRechnen();
  netzZeit = performance.now();
  Object.assign(stat, { netzMs: flachNetz.stat.ms, punkte: flachNetz.stat.punkte, dreiecke: flachNetz.stat.dreiecke });
}

/** Beim Laden einmal eine kleine Blase unsichtbar zeichnen: So stockt das erste Aufblasen nicht (Shader schon übersetzt) */
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
  kam.stellen({ gier: 0, neigung: 0, ziel: new Vector3(), s: 1, p: 1, fov: FOV0 }, W, H, 2000);
  haut.aufwaermen(kam.persp);
  haut.setzeKoerper(null);
}

// ---------- Ablauf ----------

function aufblasen(): void {
  if (!blatt.geschlossen) return;
  if (!koerper || netzStand !== blatt.stand) netzBauen();
  if (!koerper) return;
  koerper.versatz.fill(0);
  raumRechnen();
  massstab.jetzt = massstab.ziel;
  const ms0 = masse();
  koerper.setzen(moment(99, ms0, werte).lage);
  koerper.bezugRuhe();
  koerper.setzen(moment(0, ms0, werte).lage);
  koerper.bezugJetzt();
  zustand = 'auf';
  T = 0;
  film = 1;
  leiste.lage(true);
  leiste.zeichnenErlaubt(false);
  anstossen();
}

function ablassen(): void {
  if (zustand === 'blatt') return;
  zug = null;
  drehen = null;
  punktZug = null;
  vierZiel = 0;
  vier = 0;
  vierFahrt = null;
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

/** zurück aufs leere Blatt (der Mülleimer im Raum); die Zeichnung bleibt für ⌘Z auf dem Blatt */
function neu(): void {
  zustand = 'blatt';
  T = 0;
  blatt.leeren();
  koerper = null;
  silhouette = null;
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
  leiste.lage(false);
  leiste.zeichnenErlaubt(true);
  anstossen();
}

// ---------- Kamera ----------

/**
 * Die Kamera für dieses Bild. Vom Blatt in den Raum: Dolly-Zoom, das Blatt am Anfang genau so, wie es gezeichnet wurde, am Ende die
 * Ecke. Der Maßstab ist am Ende die Größe der Form (G4); Drehen, Einrasten und Vier Ansichten ändern ihn nicht. Eingerastet ist die
 * Perspektive genau 0 (G5).
 */
function kameraSetzen(m: Moment | null): void {
  const e = raum;
  const f = m && e ? m.fahrt : 0;
  const sEnde = massstab.jetzt * nutzer.zoom;
  const s = 1 + (sEnde - 1) * f;
  const t0 = Math.tan((FOV0 * Math.PI) / 360);
  const t1 = Math.tan((werte.fov * Math.PI) / 360);
  const pIntro = t0 / t1 + (1 - t0 / t1) * f;
  const p = pIntro * perspektiveBei(flach);
  const gier = ((m?.gier ?? 0) * Math.PI) / 180 + nutzer.gier * f;
  const neigung = ((m?.neigung ?? 0) * Math.PI) / 180 + nutzer.neigung * f;
  const ziel = new Vector3((e?.cx ?? 0) * f, (e?.cy ?? 0) * f, 0);
  const tiefe = e ? 3 * e.L + e.R : 4000;
  const c = kam.stellen({ gier, neigung, ziel, s, p, fov: werte.fov }, W, H, tiefe);
  // Vier Ansichten: der Raum zieht sich ins vierte Feld zusammen (Projektion verkleinert und verschoben)
  const v = glatt(vier);
  if (v > 1e-4 && e) {
    // im vierten Feld füllt die Blase ihr Feld wie die Ansichten die ihren (ohne Wände)
    const R = felder().raum;
    const scZiel = (bw.vierFuellung * 0.8 * Math.min(R.w, R.h)) / (2 * e.R * Math.max(1e-6, sEnde));
    const sc = 1 + (scZiel - 1) * v;
    const ox = (((R.x + R.w / 2) / W) * 2 - 1) * v;
    const oy = (1 - ((R.y + R.h / 2) / H) * 2) * v;
    c.projectionMatrix.premultiply(new Matrix4().set(sc, 0, 0, ox, 0, sc, 0, oy, 0, 0, 1, 0, 0, 0, 0, 1));
    c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
  }
}

// ---------- Vier Ansichten ----------

type Feld = { x: number; y: number; w: number; h: number };
type FeldAchse = 'seite' | 'front' | 'top';

/**
 * Felder der Vier Ansichten (CSS-Pixel): Seite oben links, Front oben rechts, Top unten links, Raum unten rechts. In Flucht (G4): Die
 * Spalten sind so breit, wie die Form lang (x) und tief (z) ist, die Zeilen so hoch, wie sie hoch (y) und tief ist; der Teiler sitzt
 * damit an der Ecke ihres Quaders. Florians Zug am Tropfen verschiebt ihn (`teiler.bx`, `teiler.by`).
 */
function felder(): Record<FeldAchse | 'raum', Feld> & { tx: number; ty: number } {
  const rand = bw.vierRand;
  const oben = document.body.classList.contains('bild') ? rand : 64;
  const bwid = W - 2 * rand;
  const bhoch = H - oben - rand;
  const tx = rand + teiler.fx * bwid;
  const ty = oben + teiler.fy * bhoch;
  return {
    seite: { x: rand, y: oben, w: tx - rand, h: ty - oben },
    front: { x: tx, y: oben, w: W - rand - tx, h: ty - oben },
    top: { x: rand, y: ty, w: tx - rand, h: H - rand - ty },
    raum: { x: tx, y: ty, w: W - rand - tx, h: H - rand - ty },
    tx,
    ty,
  };
}

/** Lage des Teilers aus den Maßen der Form (Anteile), dazu Florians Abweichung */
function teilerZiel(): [number, number] {
  const e = raum;
  if (!e) return [0.5, 0.5];
  const X = 2 * e.rx;
  const Y = 2 * e.ry;
  const Z = 2 * e.tiefe;
  const fx = Math.min(0.82, Math.max(0.18, X / (X + Z) + teiler.bx));
  const fy = Math.min(0.82, Math.max(0.18, Y / (Y + Z) + teiler.by));
  return [fx, fy];
}

/** gemeinsamer Maßstab der drei flachen Felder: Jede Ansicht passt in ihr Feld */
function feldMassstab(F: ReturnType<typeof felder>): number {
  const e = raum!;
  const f = bw.vierFuellung;
  const X = 2 * e.rx;
  const Y = 2 * e.ry;
  const Z = 2 * Math.max(e.tiefe, 1);
  return f * Math.min(F.seite.w / X, F.seite.h / Y, F.front.w / Z, F.front.h / Y, F.top.w / X, F.top.h / Z);
}

/** Punkt der Welt in einem flachen Feld (Gerätepunkte): Seite (x, y), Front (z, y), Top (x, −z); Mitte des Felds = Mitte der Form */
function imFeld(n: FeldAchse, p: Vector3, F: ReturnType<typeof felder>, s: number): [number, number] {
  const e = raum!;
  const r = F[n];
  const mx = r.x + r.w / 2;
  const my = r.y + r.h / 2;
  const [u, v, uc, vc] = n === 'seite' ? [p.x, p.y, e.cx, e.cy] : n === 'front' ? [p.z, p.y, 0, e.cy] : [p.x, -p.z, e.cx, 0];
  return [(mx + (u - uc) * s) * D, (my - (v - vc) * s) * D];
}

/** im Feld (CSS) → Welt in der Ebene der Ansicht */
function ausFeld(n: FeldAchse, x: number, y: number, F: ReturnType<typeof felder>, s: number): [number, number] {
  const e = raum!;
  const r = F[n];
  const u = (x - (r.x + r.w / 2)) / s;
  const v = -(y - (r.y + r.h / 2)) / s;
  return n === 'seite' ? [e.cx + u, e.cy + v] : n === 'front' ? [u, e.cy + v] : [e.cx + u, -v];
}

function vierUmschalten(an?: boolean): void {
  if (zustand !== 'ruhe') return;
  vierZiel = (an ?? vierZiel < 0.5) ? 1 : 0;
  vierFahrt = { von: vier, t: 0 };
  if (vierZiel > 0.5 && ansicht !== 'raum') ansichtSetzen('raum');
  anstossen();
}

// ---------- Bild ----------

let laeuft = false;
let letzte = 0;
let bilder = 0;
let bilderSeit = performance.now();
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

function vpJetzt(): Matrix4 {
  return new Matrix4().multiplyMatrices(kam.aktiv.projectionMatrix, kam.aktiv.matrixWorldInverse);
}

function projizieren(p: Vector3, vp: Matrix4): [number, number, number] {
  const c = p.clone().applyMatrix4(vp);
  return [(c.x * 0.5 + 0.5) * W * D, (0.5 - c.y * 0.5) * H * D, c.z];
}

/** Welt eines Ankers der Silhouette (Ebene z) */
function ankerWelt(a: { x: number; y: number }, z = 0): Vector3 {
  return new Vector3(a.x - W / 2, H / 2 - a.y, z);
}

/** ein Bild; true: es bewegt sich noch etwas */
function bild(dt: number): boolean {
  const t0 = performance.now();
  let aktiv = false;
  if (festeZeit !== null) dt = 1 / 60;
  uhr = festeZeit !== null ? 7 + festeZeit : uhr + dt;
  if (zustand === 'blatt') aktiv = blatt.schritt(dt) || aktiv;
  // Netz zur Silhouette (beim Ziehen höchstens alle 110 ms)
  const stand = blatt.stand;
  if (zustand === 'blatt' && netzStand !== stand && (!blatt.zeichnet || performance.now() - netzZeit > 110)) netzBauen();
  if (zustand === 'blatt' && blatt.geschlossen && film < 1) {
    film = Math.min(1, film + dt / 0.6);
    aktiv = true;
  }
  if (zustand === 'blatt' && !blatt.geschlossen) film = 0;
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
      leiste.lage(!blatt.leer);
      leiste.zeichnenErlaubt(true);
    }
    m = moment(Math.max(0, Math.min(T, dauer)), masse(), werte);
    if (zustand !== 'ruhe' || zug) koerper.setzen(zustand === 'blatt' ? FLACH : m.lage);
    const tau = zustand === 'auf' && T < m.riss + 0.35 ? 0 : zug ? 3.5 : 1.6;
    const unruhe = koerper.dehnungRechnen(dt, tau);
    haut.hochladen();
    aktiv = aktiv || zustand !== 'ruhe' || unruhe > 2e-3 || zug !== null;
  } else if (koerper && zustand === 'blatt') {
    koerper.setzen(FLACH);
    koerper.dehnungRechnen();
    haut.hochladen();
  }
  // Fahrt in eine Ansicht: Drehen und Parallele zugleich, die Größe bleibt
  if (ansichtFahrt) {
    ansichtFahrt.t += dt / Math.max(0.05, bw.fahrt);
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
    vierFahrt.t += dt / Math.max(0.05, bw.fahrt);
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
  // Teiler: folgt den Maßen der Form weich (nie während eines Zugs am Tropfen)
  if (raum) {
    const [zx, zy] = teilerZiel();
    if (teiler.zug) {
      teiler.fx = zx;
      teiler.fy = zy;
    } else {
      const k = 1 - Math.exp(-dt / 0.18);
      teiler.fx += (zx - teiler.fx) * k;
      teiler.fy += (zy - teiler.fy) * k;
      if (Math.abs(zx - teiler.fx) + Math.abs(zy - teiler.fy) > 1e-4) aktiv = true;
    }
  }
  // Maßstab: passt sich der Größe der Form nur in der Ruhe an (nie während eines Zugs) und nur, wenn er das Band verlässt
  const imZug = !!(zug || drehen || punktZug || teiler.zug);
  if (imZug) massstab.seitRuhe = performance.now();
  if (zustand === 'ruhe' && !imZug && performance.now() - massstab.seitRuhe > 400) {
    const weg = Math.abs(massstab.jetzt / massstab.ziel - 1);
    if (weg > bw.band || massstab.nachfuehren) massstab.nachfuehren = weg > 0.002;
    if (massstab.nachfuehren) {
      massstab.jetzt += (massstab.ziel - massstab.jetzt) * (1 - Math.exp(-dt / 0.25));
      aktiv = true;
    }
  }
  kameraSetzen(zustand === 'blatt' ? null : m);
  // Fahrtwind: die Farben fließen gegen die Drehung
  const gierJetzt = Math.atan2(kam.aktiv.position.x - (raum?.cx ?? 0), kam.aktiv.position.z);
  const neigungJetzt = Math.asin(Math.max(-1, Math.min(1, (kam.aktiv.position.y - (raum?.cy ?? 0)) / Math.max(1, kam.abstand))));
  if (dt > 0) {
    wind.x -= (gierJetzt - letzteDrehung.gier) * 0.9;
    wind.y += (neigungJetzt - letzteDrehung.neigung) * 0.9;
  }
  letzteDrehung = { gier: gierJetzt, neigung: neigungJetzt };
  hauch.staerke += (hauch.ziel - hauch.staerke) * (1 - Math.exp(-dt / 0.18));
  if (Math.abs(hauch.ziel - hauch.staerke) > 1e-3) aktiv = true;
  for (let i = 0; i < 6; i++) {
    const ziel = zustand === 'ruhe' && wandUnterZeiger === i ? 1 : 0;
    wandSicht[i]! += (ziel - wandSicht[i]!) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(ziel - wandSicht[i]!) > 2e-3) aktiv = true;
  }
  // Haut (keine Schatten an den Wänden: dort stehen die Linien)
  const F = koerper?.flach;
  const w: HautWerte = {
    fassung,
    nacht: false,
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
    wuerfel: null,
    waende: [],
    weich: 0,
    schattenFarbe: WEISS,
  };
  haut.zeichnen(kam.aktiv, w, []);
  // Linien
  let szene: Szene;
  if (zustand === 'blatt') {
    szene = blatt.szene(K, D);
  } else {
    K.leeren();
    const vp = vpJetzt();
    if (koerper && raum && m) {
      wandLinien(vp, m);
      if (flach > 0.01) linienDerAnsicht(vp);
      if (vier > 0.02) felderLinien(vp);
    }
    if (zeiger.da) K.felder.push(zeiger.x * D, zeiger.y * D, 22 * D, 0.7);
    szene = {
      prim: K.puffer,
      anzahl: K.n,
      k0: 0,
      k1: linienWerte.weich * D,
      felder: K.felder,
      tinte: TINTE,
      gruen: GRUEN,
      zeiger: zeiger.da && (!document.body.classList.contains('bild') || mitZeigerImBild) ? zeigerForm(zeiger.x, zeiger.y) : null,
    };
  }
  anzeige.zeichnen(szene);
  // Text
  gruss.classList.toggle('weg', !(zustand === 'blatt' && blatt.leer));
  const h =
    zustand === 'blatt'
      ? blatt.geschlossen && !blatt.zeichnet
        ? '↩ aufblasen'
        : ''
      : zustand === 'ruhe'
        ? vier > 0.5
          ? 'Tab: zurück in den Raum · Tropfen in der Mitte ziehen: Felder · Punkte der Seite ziehen'
          : ansicht === 'raum'
            ? 'ziehen: drehen · an der Blase ziehen · Punkte an der Wand der Seite ziehen · 1 Seite · 3 Front · 7 Top · Tab vier Ansichten'
            : '0 Raum · 1 Seite · 3 Front · 7 Top · Tab vier Ansichten'
        : '';
  if (hinweis.textContent !== h) hinweis.textContent = h;
  stat.bildMs = performance.now() - t0;
  if (mitInfo) infoAnzeige.textContent = `${stat.fps.toFixed(0)} B/s · Bild ${stat.bildMs.toFixed(1)} ms · Netz ${stat.punkte} P, ${stat.dreiecke} D · ${zustand} ${T.toFixed(2)} s · p ${flach.toFixed(2)}`;
  return aktiv;
}

const TINTE: [number, number, number] = [0x1f / 255, 0x1a / 255, 0x17 / 255];
const GRUEN: [number, number, number] = [0xb9 / 255, 0xd1 / 255, 0xb4 / 255];
const ZEIGER_WINKEL = [(32 * Math.PI) / 180, (80 * Math.PI) / 180];

/** der Zeiger der Linien-Studie: Dreieck, Spitze oben links */
function zeigerForm(x: number, y: number): Szene['zeiger'] {
  const L = linienWerte.zeigerGroesse * D;
  const ax = x * D;
  const ay = y * D;
  return {
    ax,
    ay,
    bx: ax + L * Math.cos(ZEIGER_WINKEL[0]!),
    by: ay + L * Math.sin(ZEIGER_WINKEL[0]!),
    cx: ax + L * Math.cos(ZEIGER_WINKEL[1]!),
    cy: ay + L * Math.sin(ZEIGER_WINKEL[1]!),
    linie: linienWerte.zeigerLinie * D,
  };
}

/** sichtbare Wand je Achse (Vorzeichen) und ihre Stärke */
function waendeJetzt(m: Moment): { s: [number, number, number]; staerke: [number, number, number] } {
  const g6 = wandGewichte();
  const r = raumSicht();
  const s: [number, number, number] = [g6[0]! >= g6[1]! ? -1 : 1, g6[2]! >= g6[3]! ? -1 : 1, g6[4]! >= g6[5]! ? -1 : 1];
  const zeit = [m.waende, m.waende, m.schatten];
  const staerke = [0, 1, 2].map((a) => Math.max(g6[2 * a]!, g6[2 * a + 1]!) * r * zeit[a]! * (1 - glatt(vier))) as [number, number, number];
  return { s, staerke };
}

/**
 * Linien an den Wänden: Seite = die gezeichnete Linie mit ihren Punkten, Front und Top = der Umriss der Blase von ihrer Achse,
 * jeweils auf die abgewandte Wand gelegt. Dazu die drei feinsten Kanten der fernen Ecke.
 */
function wandLinien(vp: Matrix4, m: Moment): void {
  const k = koerper!;
  const e = raum!;
  const { s, staerke } = waendeJetzt(m);
  const r0 = (linienWerte.umriss / 2) * D * bw.wandLinien;
  const mitte = [e.cx, e.cy, 0];
  // der Rahmen (die gezeichnete Linie) auf dem Weg zur Rückwand; dort wird er zur Zeichnung der Seite
  const F = k.flach;
  if (m.linie > 0.01 && F.nb > 2) {
    const n = F.n;
    const xs: number[] = [];
    const ys: number[] = [];
    const p = new Vector3();
    for (let i = 0; i < F.nb; i++) {
      const vi = 2 * n + i;
      p.set(k.pos[vi * 3]!, k.pos[vi * 3 + 1]!, k.pos[vi * 3 + 2]!);
      const [a, b] = projizieren(p, vp);
      xs.push(a);
      ys.push(b);
    }
    K.zug(xs, ys, (linienWerte.umriss / 2) * D * m.linie, true);
    for (const a of F.anker) K.punkt(xs[a]!, ys[a]!, linienWerte.punktRadius * D * m.linie);
  }
  for (const achse of [0, 1, 2] as const) {
    const st = staerke[achse];
    if (st < 0.01) continue;
    const w = achse * 2 + (s[achse] > 0 ? 1 : 0);
    const ueber = wandSicht[w]!;
    const lage = mitte[achse]! + s[achse] * e.L;
    const legen = (x: number, y: number, z: number): [number, number] => {
      const q = new Vector3(x, y, z);
      if (achse === 0) q.x = lage;
      else if (achse === 1) q.y = lage;
      else q.z = lage;
      const [a, b] = projizieren(q, vp);
      return [a, b];
    };
    const r = r0 * st * (0.82 + 0.18 * ueber);
    if (achse === 2 && silhouette) {
      // die gezeichnete Linie, wie sie auf dem Blatt war, an der Rückwand
      const ab = abtasten(silhouette, 2);
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i < ab.x.length; i++) {
        const p = ankerWelt({ x: ab.x[i]!, y: ab.y[i]! });
        const [a, b] = legen(p.x, p.y, 0);
        xs.push(a);
        ys.push(b);
      }
      K.zug(xs, ys, r, true);
      silhouette.forEach((a, i) => {
        const p = ankerWelt(a);
        const [px, py] = legen(p.x, p.y, 0);
        const gross = i === punktUnterZeiger || punktZug?.i === i ? linienWerte.tropfen : 1;
        K.punkt(px, py, linienWerte.punktRadius * D * gross * st * (0.55 + 0.45 * ueber));
      });
    } else {
      const seg = k.umriss(achse);
      const g = K.neueGruppe();
      for (let i = 0; i < seg.length; i += 6) {
        const [ax, ay] = legen(seg[i]!, seg[i + 1]!, seg[i + 2]!);
        const [bx, by] = legen(seg[i + 3]!, seg[i + 4]!, seg[i + 5]!);
        K.push(ax, ay, bx, by, r, r, g, 0, false);
      }
    }
  }
  // Kanten der fernen Ecke: drei feinste Haarlinien vom Eckpunkt aus
  const kanten = werte.kanten * Math.min(staerke[0], staerke[1], staerke[2]) * raumSicht();
  if (kanten > 0.01) {
    const c = new Vector3(e.cx + s[0] * e.L, e.cy + s[1] * e.L, s[2] * e.L);
    const enden = [c.clone().setX(e.cx - s[0] * e.L), c.clone().setY(e.cy - s[1] * e.L), c.clone().setZ(-s[2] * e.L)];
    const g = K.neueGruppe();
    const r = 0.14 * D * kanten;
    const cam = kam.aktiv;
    for (const b of enden) {
      let vorher: [number, number] | null = null;
      for (let j = 0; j <= 32; j++) {
        const q = c.clone().lerp(b, j / 32);
        const vorKamera = q.clone().applyMatrix4(cam.matrixWorldInverse).z < -cam.near * 1.01;
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
}

/** Linien der eingerasteten Ansicht, auf der Blase: Seite = die gezeichnete Linie mit Punkten, Front und Top = Umriss */
function linienDerAnsicht(vp: Matrix4): void {
  const k = koerper!;
  const blick = new Vector3();
  kam.aktiv.getWorldDirection(blick);
  const achse = ansicht === 'seite' ? new Vector3(0, 0, -1) : ansicht === 'front' ? new Vector3(1, 0, 0) : new Vector3(0, -1, 0);
  const t = Math.min(1, Math.max(0, (blick.dot(achse) - 0.97) / 0.025));
  const s = flach * flach * t * t * (3 - 2 * t);
  if (s < 0.01) return;
  const r0 = (linienWerte.umriss / 2) * D * s;
  if (ansicht === 'seite' && silhouette) {
    const ab = abtasten(silhouette, 1.5);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < ab.x.length; i++) {
      const [a, b] = projizieren(ankerWelt({ x: ab.x[i]!, y: ab.y[i]! }), vp);
      xs.push(a);
      ys.push(b);
    }
    K.zug(xs, ys, r0, true);
    silhouette.forEach((a, i) => {
      const [px, py] = projizieren(ankerWelt(a), vp);
      const gross = i === punktUnterZeiger || punktZug?.i === i ? linienWerte.tropfen : 1;
      K.punkt(px, py, linienWerte.punktRadius * D * gross * s);
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

/**
 * Vier Ansichten: In den drei flachen Feldern nur Linien (Seite mit Punkten, Front und Top als Umriss). Beim Auf- und Zuklappen
 * gleitet jede Linie von ihrer Wand in ihr Feld (je Punkt zwischen den beiden Abbildungen gemischt). Dazu der Teiler: zwei
 * Haarlinien und der Tropfen an ihrer Kreuzung.
 */
function felderLinien(vp: Matrix4): void {
  const k = koerper!;
  const e = raum!;
  const F = felder();
  const s4 = feldMassstab(F);
  const v = glatt(vier);
  const g6 = wandGewichte();
  const sw: [number, number, number] = [g6[0]! >= g6[1]! ? -1 : 1, g6[2]! >= g6[3]! ? -1 : 1, g6[4]! >= g6[5]! ? -1 : 1];
  const mitte = [e.cx, e.cy, 0];
  const r0 = (linienWerte.umriss / 2) * D;
  const mischen = (n: FeldAchse, p: Vector3): [number, number] => {
    const [fx, fy] = imFeld(n, p, F, s4);
    if (v > 0.999) return [fx, fy];
    const achse = n === 'front' ? 0 : n === 'top' ? 1 : 2;
    const q = p.clone();
    const lage = mitte[achse]! + sw[achse] * e.L;
    if (achse === 0) q.x = lage;
    else if (achse === 1) q.y = lage;
    else q.z = lage;
    const [wx, wy] = projizieren(q, vp);
    return [wx + (fx - wx) * v, wy + (fy - wy) * v];
  };
  for (const n of ['seite', 'front', 'top'] as const) {
    if (n === 'seite' && silhouette) {
      const ab = abtasten(silhouette, 2);
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i < ab.x.length; i++) {
        const [a, b] = mischen(n, ankerWelt({ x: ab.x[i]!, y: ab.y[i]! }));
        xs.push(a);
        ys.push(b);
      }
      K.zug(xs, ys, r0, true);
      silhouette.forEach((a, i) => {
        const [px, py] = mischen(n, ankerWelt(a));
        const gross = i === punktUnterZeiger || punktZug?.i === i ? linienWerte.tropfen : 1;
        K.punkt(px, py, linienWerte.punktRadius * D * gross);
      });
    } else {
      const seg = k.umriss(n === 'front' ? 0 : 1);
      const g = K.neueGruppe();
      for (let i = 0; i < seg.length; i += 6) {
        const [ax, ay] = mischen(n, new Vector3(seg[i]!, seg[i + 1]!, seg[i + 2]!));
        const [bx, by] = mischen(n, new Vector3(seg[i + 3]!, seg[i + 4]!, seg[i + 5]!));
        K.push(ax, ay, bx, by, r0, r0, g, 0, false);
      }
    }
  }
  // Teiler: zwei Haarlinien, an der Kreuzung ein Tropfen (schwillt beim Anflug, ist beim Ziehen ein Tropfen)
  const rh = (linienWerte.innen / 2) * D * v;
  const g = K.neueGruppe();
  const rand = bw.vierRand;
  const oben = document.body.classList.contains('bild') ? rand : 64;
  const tx = F.tx * D;
  const ty = F.ty * D;
  K.push(tx, oben * D, tx, (H - rand) * D, rh, rh, g, 0, false);
  K.push(rand * D, ty, (W - rand) * D, ty, rh, rh, g, 0, false);
  const anflug = teiler.zug ? 1 : teiler.ueber;
  K.punkt(tx, ty, linienWerte.punktRadius * D * (1 + (linienWerte.tropfen - 1) * anflug) * v);
}

// ---------- Eingaben ----------

function lageIm(e: PointerEvent | WheelEvent): [number, number] {
  const r = leinwandLinien.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

/** in eine Ansicht fahren (Raum oder Achse): Drehen und Parallele zugleich, kürzester Weg, die Größe bleibt */
function ansichtSetzen(ziel: Ansicht): void {
  if (zustand !== 'ruhe' && zustand !== 'auf') return;
  const w = ANSICHT_WINKEL[ziel];
  const g1 = w ? (w[0] * Math.PI) / 180 - (werte.gier * Math.PI) / 180 : 0;
  const n1 = w ? (w[1] * Math.PI) / 180 - (werte.neigung * Math.PI) / 180 : 0;
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
  const nah = (a: number, b: number): number => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
  const grenze = bw.einrasten;
  for (const a of ['seite', 'front', 'top'] as const) {
    const w = ANSICHT_WINKEL[a]!;
    const dn = Math.abs(n - w[1]);
    if (a === 'top' ? dn < grenze : dn < grenze && nah(g, w[0]) < grenze) {
      ansichtSetzen(a);
      return;
    }
  }
}

/** Punkt der Silhouette unter dem Zeiger: an der Wand der Seite, in der eingerasteten Seite oder im Feld der Seite (−1 = keiner) */
function punktSuchen(x: number, y: number): { i: number; ort: 'wand' | 'flach' | 'feld'; z: number } | null {
  if (!silhouette || !raum || zustand !== 'ruhe') return null;
  const vp = vpJetzt();
  const fang = 11;
  let best: { i: number; ort: 'wand' | 'flach' | 'feld'; z: number } | null = null;
  let bd = fang;
  const pruefen = (i: number, px: number, py: number, ort: 'wand' | 'flach' | 'feld', z: number): void => {
    const d = Math.hypot(px / D - x, py / D - y);
    if (d < bd) {
      bd = d;
      best = { i, ort, z };
    }
  };
  if (vier > 0.9) {
    const F = felder();
    const s4 = feldMassstab(F);
    silhouette.forEach((a, i) => {
      const [px, py] = imFeld('seite', ankerWelt(a), F, s4);
      pruefen(i, px, py, 'feld', 0);
    });
    return best;
  }
  if (ansicht === 'seite' && flach > 0.85) {
    silhouette.forEach((a, i) => {
      const [px, py] = projizieren(ankerWelt(a), vp);
      pruefen(i, px, py, 'flach', 0);
    });
    return best;
  }
  if (ansicht === 'raum' && flach < 0.2) {
    const g6 = wandGewichte();
    const sz = g6[4]! >= g6[5]! ? -1 : 1;
    if (Math.max(g6[4]!, g6[5]!) < 0.5) return null;
    const z = sz * raum.L;
    silhouette.forEach((a, i) => {
      const [px, py] = projizieren(ankerWelt(a, z), vp);
      pruefen(i, px, py, 'wand', z);
    });
  }
  return best;
}

/** Wand unter dem Zeiger (nur die sichtbaren, fernen), −1 = keine */
function wandSuchen(x: number, y: number): number {
  const e = raum;
  if (!e || zustand !== 'ruhe' || flach > 0.5 || vier > 0.1) return -1;
  const { o, d } = kam.strahl(x, y, W, H);
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
    if ([0, 1, 2].every((a) => a === achse || Math.abs(p[a]!) <= e.L + 1)) {
      bt = t;
      best = w;
    }
  }
  return best;
}

/** Treffer auf der Blase (im Raum oder im vierten Feld) */
function blaseTreffen(x: number, y: number): { x: number; y: number; z: number; tri: number } | null {
  if (!koerper || zustand !== 'ruhe') return null;
  if (vier > 0.5) {
    const R = felder().raum;
    if (x < R.x || y < R.y || x > R.x + R.w || y > R.y + R.h) return null;
  }
  const { o, d } = kam.strahl(x, y, W, H);
  return koerper.treffen(o.x, o.y, o.z, d.x, d.y, d.z);
}

function hauchSuchen(x: number, y: number): boolean {
  const t = blaseTreffen(x, y);
  if (t) {
    hauch.pos.set(t.x, t.y, t.z);
    hauch.ziel = 1;
    return true;
  }
  hauch.ziel = 0;
  return false;
}

function amTeiler(x: number, y: number): boolean {
  if (vier < 0.9 || zustand !== 'ruhe') return false;
  const F = felder();
  return Math.hypot(x - F.tx, y - F.ty) < 14;
}

/** nach dem Ziehen eines Punkts: die Blase in Ruhe in der neuen Form (die Kamera bleibt, wo sie ist) */
function blaseNeu(): void {
  if (!koerper) return;
  const alt = raum;
  netzBauen();
  if (!koerper || !alt) return;
  const ms = masse();
  koerper.setzen(moment(99, ms, werte).lage);
  koerper.bezugRuhe();
  koerper.dehnungRechnen();
  haut.hochladen();
  umbauZeit = performance.now();
}

/** Lage des Zeigers als Punkt der Silhouette (CSS-Pixel des Blatts), je nach Ort des Zugs */
function punktLage(x: number, y: number, pz: NonNullable<typeof punktZug>): [number, number] | null {
  if (pz.ort === 'feld') {
    const F = felder();
    const [wx, wy] = ausFeld('seite', x, y, F, feldMassstab(F));
    return [wx + W / 2, H / 2 - wy];
  }
  const { o, d } = kam.strahl(x, y, W, H);
  if (Math.abs(d.z) < 1e-9) return null;
  const t = (pz.z - o.z) / d.z;
  return [o.x + d.x * t + W / 2, H / 2 - (o.y + d.y * t)];
}

let letzteZeit = 0;

leinwandLinien.addEventListener('pointermove', (e) => {
  const [x, y] = lageIm(e);
  const dt = letzteZeit ? Math.min(0.1, (e.timeStamp - letzteZeit) / 1000) : 0;
  letzteZeit = e.timeStamp;
  zeiger.x = x;
  zeiger.y = y;
  zeiger.da = true;
  if (zustand === 'blatt') {
    blatt.alt = e.altKey;
    blatt.umschalt = e.shiftKey;
    const ereignisse = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const ev of ereignisse.length ? ereignisse : [e]) {
      const [ex, ey] = lageIm(ev);
      blatt.bewegen(ex, ey, ev.timeStamp, dt);
    }
    anstossen();
    return;
  }
  if (teiler.zug) {
    const rand = bw.vierRand;
    const oben = 64;
    const e2 = raum!;
    const X = 2 * e2.rx;
    const Y = 2 * e2.ry;
    const Z = 2 * e2.tiefe;
    teiler.bx = (x - rand) / (W - 2 * rand) - X / (X + Z);
    teiler.by = (y - oben) / (H - oben - rand) - Y / (Y + Z);
  } else if (punktZug) {
    const lage = punktLage(x, y, punktZug);
    if (lage) {
      blatt.ankerSetzen(punktZug.i, lage[0], lage[1]);
      silhouette = blatt.silhouette();
      if (performance.now() - umbauZeit > 110) blaseNeu();
    }
  } else if (drehen) {
    if (ansicht !== 'raum') {
      ansicht = 'raum';
      ansichtFahrt = { von: [nutzer.gier, nutzer.neigung, flach], nach: [nutzer.gier, nutzer.neigung, 0], t: 0 };
    }
    nutzer.gier = drehen.gier - ((x - drehen.x) * Math.PI) / 520;
    nutzer.neigung = Math.max(-1.25, Math.min(1.25, drehen.neigung + ((y - drehen.y) * Math.PI) / 520));
  } else if (zug && koerper) {
    const k = koerper;
    const F = k.flach;
    const s = 1 / Math.max(1e-6, massstab.jetzt * nutzer.zoom);
    const cam = kam.aktiv;
    const rechts = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const oben = new Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const dw = rechts.multiplyScalar((x - zug.x) * s).add(oben.multiplyScalar(-(y - zug.y) * s));
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
    const p = punktSuchen(x, y);
    punktUnterZeiger = p ? p.i : -1;
    teiler.ueber = amTeiler(x, y) ? 1 : 0;
    const aufBlase = !p && !teiler.ueber && hauchSuchen(x, y);
    wandUnterZeiger = aufBlase || p ? -1 : wandSuchen(x, y);
    leinwandLinien.classList.toggle('teiler', teiler.ueber > 0);
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
  zeiger.x = x;
  zeiger.y = y;
  zeiger.da = true;
  if (zustand === 'blatt') {
    blatt.alt = e.altKey;
    blatt.umschalt = e.shiftKey;
    blatt.druecken(x, y, e.timeStamp);
    if (!blatt.leer) leiste.lage(true);
    anstossen();
    return;
  }
  if (zustand !== 'ruhe' || !koerper) return;
  if (amTeiler(x, y)) {
    teiler.zug = true;
    anstossen();
    return;
  }
  const p = punktSuchen(x, y);
  if (p) {
    punktZug = p;
    anstossen();
    return;
  }
  const t = blaseTreffen(x, y);
  if (t && !e.shiftKey) {
    // an der Blase ziehen (vorerst die weiche Verformung der Studie; mit dem Werk der Pinsel „Ziehen“)
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
    zug = { x, y, start: koerper.versatz.slice(), gewicht, zFaktor, hinten, tiefe: 0 };
    hauch.ziel = 1;
    hauch.pos.set(t.x, t.y, t.z);
  } else if (vier < 0.5 || (() => {
    const R = felder().raum;
    return x >= R.x && y >= R.y;
  })()) {
    drehen = { x, y, gier: nutzer.gier, neigung: nutzer.neigung };
  }
  anstossen();
});

const loslassen = (e: PointerEvent): void => {
  if (leinwandLinien.hasPointerCapture(e.pointerId)) leinwandLinien.releasePointerCapture(e.pointerId);
  if (zustand === 'blatt') {
    blatt.loslassen();
    anstossen();
    return;
  }
  if (drehen) einrasten();
  if (punktZug) {
    blaseNeu();
    raumRechnen();
  }
  teiler.zug = false;
  punktZug = null;
  drehen = null;
  zug = null;
  anstossen();
};
leinwandLinien.addEventListener('pointerup', loslassen);
leinwandLinien.addEventListener('pointercancel', loslassen);
leinwandLinien.addEventListener('pointerleave', () => {
  if (drehen || zug || punktZug || teiler.zug) return;
  zeiger.da = false;
  blatt.weg();
  hauch.ziel = 0;
  wandUnterZeiger = -1;
  anstossen();
});
leinwandLinien.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (zustand === 'ruhe') {
      // Zoom von Hand: gilt in allen Ansichten, bis „Einpassen“ (Pos1)
      nutzer.zoom = Math.max(0.3, Math.min(4, nutzer.zoom * Math.exp(-e.deltaY * 0.0015)));
      anstossen();
    }
  },
  { passive: false },
);

function werkzeugGewaehlt(w: Werkzeug): void {
  if (zustand !== 'blatt') return;
  blatt.werkzeugSetzen(w);
  anstossen();
}

function muell(): void {
  if (zustand === 'blatt') blatt.leeren();
  else neu();
  leiste.lage(false);
  anstossen();
}

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  blatt.alt = e.altKey;
  blatt.umschalt = e.shiftKey;
  const k = e.key;
  if ((e.metaKey || e.ctrlKey) && k === ',') {
    e.preventDefault();
    reglerZeigen(regler.hidden);
    return;
  }
  if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'z') {
    e.preventDefault();
    if (zustand === 'blatt' && blatt.rueckgaengig()) anstossen();
    return;
  }
  if (e.metaKey || e.ctrlKey) return;
  if (k === 'Tab') {
    e.preventDefault();
    if (!e.repeat) vierUmschalten();
  } else if (k === 'Enter') {
    if (zustand === 'blatt') {
      if (!blatt.eingabe('enter') && blatt.geschlossen) aufblasen();
    }
  } else if (k === 'Escape') {
    if (zustand === 'blatt') {
      if (!blatt.eingabe('esc')) {
        blatt.werkzeugSetzen('auswahl');
        leiste.setzen('auswahl');
      }
    } else if (vierZiel > 0.5) vierUmschalten(false);
    else if (ansicht !== 'raum') ansichtSetzen('raum');
    else ablassen();
  } else if (k === 'Backspace' || k === 'Delete') {
    if (zustand === 'blatt') blatt.eingabe('loeschen');
    else ablassen();
  } else if (k === ' ') {
    e.preventDefault();
    nochEinmal();
  } else if ((k === '1' || k === '3' || k === '7' || k === '0') && zustand !== 'blatt') {
    if (e.repeat) return;
    if (vierZiel > 0.5) vierUmschalten(false);
    const ziel: Ansicht = k === '1' ? 'seite' : k === '3' ? 'front' : k === '7' ? 'top' : 'raum';
    tasteGehalten = { taste: k, seit: performance.now(), vorher: ansicht };
    ansichtSetzen(ziel);
  } else if (k === 'Home') {
    nutzer.zoom = 1;
    massstab.nachfuehren = true;
  } else if (zustand === 'blatt' && (k === 'p' || k === 'P')) waehlenTaste('p');
  else if (zustand === 'blatt' && (k === 'n' || k === 'N')) waehlenTaste('frei');
  else if (zustand === 'blatt' && k === 'e') waehlenTaste('ellipse');
  else if (zustand === 'blatt' && k === 'E') waehlenTaste('wuerfel');
  else if (zustand === 'blatt' && (k === 'v' || k === 'V')) waehlenTaste('auswahl');
  else if (k === 'm' || k === 'M') fassungSetzen(((fassung + 1) % FASSUNGEN.length) as Fassung);
  else return;
  anstossen();
});
window.addEventListener('keyup', (e) => {
  blatt.alt = e.altKey;
  blatt.umschalt = e.shiftKey;
  if (tasteGehalten && e.key === tasteGehalten.taste) {
    if (performance.now() - tasteGehalten.seit > 300) ansichtSetzen(tasteGehalten.vorher);
    tasteGehalten = null;
  }
});

function waehlenTaste(w: Werkzeug): void {
  blatt.werkzeugSetzen(w);
  leiste.setzen(w);
}

// ---------- Leiste, Menü, Feinregler ----------

const leiste = new Leiste(document.body, werkzeugGewaehlt, muell);

const regler = $<HTMLElement>('regler');
const marke = $<HTMLButtonElement>('marke');
function reglerZeigen(an: boolean): void {
  regler.hidden = !an;
  marke.setAttribute('aria-expanded', String(an));
}
marke.addEventListener('click', () => reglerZeigen(regler.hidden));

const fassungKnoepfe = $<HTMLSpanElement>('fassungen');
FASSUNGEN.forEach((name, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = name;
  b.addEventListener('click', () => fassungSetzen(i as Fassung));
  fassungKnoepfe.append(b);
});
function fassungSetzen(f: Fassung): void {
  fassung = f;
  [...fassungKnoepfe.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === f)));
  anstossen();
}
fassungSetzen(fassung);

const bereiche: Bereich[] = [
  { titel: 'Linien und Punkte', speicher: 'ozzy-linien-1', zeilen: LINIEN_REGLER as ReglerZeile<string>[], werte: linienWerte as unknown as Record<string, number>, grundwerte: LINIEN_GRUNDWERTE as unknown as Record<string, number> },
  { titel: 'Freihand', speicher: 'ozzy-freihand-1', zeilen: FREIHAND_REGLER, werte: freihandWerte as unknown as Record<string, number>, grundwerte: FREIHAND_GRUNDWERTE as unknown as Record<string, number> },
  {
    titel: 'Seifenhaut und Aufblasen',
    speicher: 'ozzy-blase-1',
    zeilen: (BLASE_REGLER as ReglerZeile<string>[]).filter((r) => r.k !== 'schatten' && r.k !== 'weich'),
    werte: werte as unknown as Record<string, number>,
    grundwerte: BLASE_GRUND as unknown as Record<string, number>,
  },
  { titel: 'Raum und Ansichten', speicher: 'ozzy-buehne-1', zeilen: BUEHNE_REGLER, werte: bw as unknown as Record<string, number>, grundwerte: BUEHNE_GRUND as unknown as Record<string, number> },
];
const fein = feinreglerBauen($('regler-liste'), bereiche, (bereich, k) => {
  if (bereich === 'Linien und Punkte') blatt.verhalten.abtasten();
  if (bereich === 'Seifenhaut und Aufblasen' && koerper && raum) {
    koerper.fuelle = werte.fuelle;
    raumRechnen();
    if (zustand === 'ruhe') {
      koerper.setzen(moment(T, masse(), werte).lage);
      koerper.dehnungRechnen();
      haut.hochladen();
    }
  }
  if (bereich === 'Raum und Ansichten') {
    raumRechnen();
    if (k === 'groesse' || k === 'alle') massstab.nachfuehren = true;
  }
  anstossen();
});
$('knopf-grundwerte').addEventListener('click', () => fein.grundwerte());
$('knopf-kopieren').addEventListener('click', () => fein.kopieren());
$('knopf-neu').addEventListener('click', () => {
  neu();
  reglerZeigen(false);
});

new ResizeObserver(groesse).observe(buehne);
groesse();
aufwaermen();
void document.fonts?.ready.then(() => anstossen());

// ---------- Test-Haken ----------

const haken = {
  /** eine geschlossene Silhouette setzen (CSS-Pixel des Blatts), wie mit P gezeichnet */
  form(anker: { x: number; y: number; ein?: [number, number]; aus?: [number, number] }[]): void {
    neu();
    const n = { punkte: anker.map((a) => ({ x: a.x, y: a.y, sichtbar: true, verdeckt: false })), linien: [] as never[] };
    const m = anker.length;
    const linie = {
      zu: true,
      punkte: anker.map((_, i) => i),
      knick: anker.map((a) => !a.ein && !a.aus),
      stuecke: anker.map((a, i) => {
        const b = anker[(i + 1) % m]!;
        return { g1x: a.aus?.[0] ?? (b.x - a.x) / 3, g1y: a.aus?.[1] ?? (b.y - a.y) / 3, g2x: b.ein?.[0] ?? (a.x - b.x) / 3, g2y: b.ein?.[1] ?? (a.y - b.y) / 3, art: 'umriss' as const };
      }),
    };
    (n.linien as unknown[]).push(linie);
    blatt.verhalten.netzErsetzen(n as never);
    film = 1;
    netzBauen();
    leiste.lage(true);
    anstossen();
  },
  aufblasen,
  ablassen,
  neu,
  fassung: fassungSetzen,
  zeit(t: number | null): void {
    festeZeit = t;
    if (t !== null && zustand === 'blatt') aufblasen();
    if (t !== null && koerper && raum) {
      T = t;
      zustand = t >= moment(0, masse(), werte).dauer ? 'ruhe' : 'auf';
    }
    anstossen();
  },
  bild(dt = 1 / 60): void {
    bild(dt);
  },
  film(an: boolean): void {
    angehalten = an;
    if (!an) anstossen();
  },
  vorspulen(ms: number): void {
    for (let t = 0; t < ms; t += 1000 / 60) bild(1 / 60);
  },
  ansicht(a: Ansicht): void {
    ansichtSetzen(a);
  },
  vier(an: boolean): void {
    vierUmschalten(an);
  },
  /** Größe der Form im Bild: Abstand (CSS) zweier Punkte der Silhouette, wie sie gerade gezeigt werden (Raum: an der Haut) */
  massJetzt(): { s: number; p: number; flach: number; vier: number } {
    return { s: massstab.jetzt * nutzer.zoom, p: flach, flach, vier };
  },
  /** Punkt i der Silhouette im Bild (CSS) in der eingerasteten Seite oder im Feld der Seite */
  punktImBild(i: number): { x: number; y: number } | null {
    const a = silhouette?.[i];
    if (!a) return null;
    if (vier > 0.9) {
      const F = felder();
      const [px, py] = imFeld('seite', ankerWelt(a), F, feldMassstab(F));
      return { x: px / D, y: py / D };
    }
    const [px, py] = projizieren(ankerWelt(a), vpJetzt());
    return { x: px / D, y: py / D };
  },
  stand(): Record<string, unknown> {
    return { zustand, T, fassung, ...stat, anker: silhouette?.length ?? 0, geschlossen: blatt.geschlossen, ansicht, flach, vier, kamera: kam.aktiv.type };
  },
  blatt,
};
(window as unknown as { __ozzy: typeof haken }).__ozzy = haken;
