// VERSUCH (13.10.2026): Schnitt-Loft, ein impliziter Loft aus echten Schnitten.
//
// Florian (13.10. morgens, Bilder docs/look/editor/07–09): Spanten sollen die echte Form zeigen (zwei Ringe für Schnauze
// und Bauch), eine Acht soll zu zwei Formen werden, Überhänge in der Seite und Haken im Top sollen nicht ausgeblockt
// werden, und das ohne Wirbelsäule.
//
// Bisher ist der Körper eine Röhre mit einem Ring je Stelle. Jeder Ring nimmt aus der Seite nur die äußerste Ober- und
// Unterkante und aus dem Top die größte Breite; Lücken dazwischen werden zugefüllt. Hier bekommt jede Stelle x einen
// echten Schnitt als Fläche, mit beliebig vielen Teilen und Löchern:
//
// 1. Sichtbare Hülle H_x: y in den Intervallen der Seite bei x (alle Schnittpunkte, paarweise), |z| in den Intervallen
//    des Tops (auf die Länge der Seite gestreckt), (z, y) in der Front.
// 2. Rundung je Teil: Jede Zusammenhangskomponente von H_x bekommt die Vorlage (Front oder Spanten, normiert) in ihren
//    Hüllkasten skaliert und wird mit ihr geschnitten. Drei Kreise ergeben so eine Kugel; die reine Hülle wäre der kantige
//    Steinmetz-Körper. Hat die Vorlage selbst mehrere Teile (Acht), bekommt jede Komponente nur den Teil der Vorlage, der
//    sie überdeckt (die Vorlage liegt dazu auf dem Kasten der Stelle, wie ein Spant im Editor).
// 3. Zwischen Spanten werden die normierten 2D-Abstandsfelder linear überblendet (formbasierte Interpolation). So geht ein
//    Teil stetig in zwei über, Löcher gehen auf und zu. Vor dem ersten und hinter dem letzten Spant gilt der äußere.
// 4. Netz: Abstandsfeld je Scheibe (am Rand aus den Kurven, auf Bruchteile eines Rasterpunkts genau; weiter weg die exakte
//    euklidische Distanztransformation nach Felzenszwalb), gestapelt zum 3D-Feld, Surface Nets, Taubin-Glättung, Normalen.
//
// Flächenregel für Front und Spanten (halbe Profile an der Spiegelachse):
// - 'halb': Jede Hälfte gilt nur auf ihrer Seite der Achse; was über die Achse hinüberläuft, schneidet weg (Florian zur
//   Acht: „Der Teil, der in der Mitte überlappt, sollte weg“).
// - 'gerade-ungerade': ganzer gespiegelter Pfad wie in Illustrator. Bei der gespiegelten Acht bleibt die Mitte als dritter
//   Teil stehen: Sie ist einmal umschlossen (gegenläufig), nicht doppelt.
// Für Profile, die die Achse nicht kreuzen, sind beide Regeln gleich.
//
// Weltkoordinaten wie im Loft: x = hinten (vorn ist −x), y = oben, z = Front-u. Ohne Skalierung (macht der Aufrufer).

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { pfadAbtasten, segmente, vollerPfad } from '../profil';
import type { Profil } from '../profil';
import { hauptspantProfil, mischeProfile, spantStuetzen } from '../spanten';

export type SchnittRegel = 'halb' | 'gerade-ungerade';

export type SchnittOptionen = {
  /** Rasterpunkte über die größte Ausdehnung (gleicher Abstand in x, y und z) */
  aufloesung: number;
  /** Durchgänge der Taubin-Glättung (je ein Schritt λ und μ) */
  glaetten: number;
  regel: SchnittRegel;
  /** false = nur die sichtbare Hülle (Schnitt der drei Umriss-Prismen, kantig); zum Vergleichen */
  runden: boolean;
  /**
   * Glättung der Rundung entlang x (Gauß, σ in Rasterpunkten; 0 = aus). Wo Teile zusammenwachsen oder sich trennen (Kehle,
   * Halsvorderkante, Haken), springt die Rundung je Teil von einer Scheibe zur nächsten. Geglättet wird nur, was die
   * Rundung von der sichtbaren Hülle wegschneidet; die Hülle selbst und die Umrisse bleiben exakt.
   */
  weich: number;
  /**
   * Überblendung zwischen Spanten: 'feld' = Abstandsfelder (Teile und Löcher gehen stetig auf und zu, Ecken blenden aus und
   * ein); 'punkte' = Punkt für Punkt wie bisher, dann die Fläche mit der Flächenregel (Ecken wandern als Kante längs; Teile
   * entstehen, wo die Kurve die Achse kreuzt). 'punkte' rechnet je Scheibe eine Vorlage (langsamer).
   */
  ueberblenden: 'feld' | 'punkte';
};

export const SCHNITT_STANDARD: SchnittOptionen = { aufloesung: 112, glaetten: 8, regel: 'halb', runden: true, weich: 2, ueberblenden: 'feld' };

/** Echter Schnitt an einer Stelle: Umrisslinien in (z, y), Teile und Löcher. */
export type SchnittUmriss = { umrisse: V2[][]; teile: number; loecher: number };

export type SchnittInfo = {
  millisekunden: number;
  zeiten: { vorlagen: number; feld: number; netz: number; glaetten: number };
  /** Rasterpunkte in x, y, z */
  gitter: [number, number, number];
  /** Rasterabstand (Kachel) */
  h: number;
  punkte: number;
  dreiecke: number;
  /** größte Teilezahl einer Scheibe */
  maxTeile: number;
};

export type SchnittLoft = {
  positionen: Float32Array;
  normalen: Float32Array;
  indizes: Uint32Array;
  xMin: number;
  xMax: number;
  /** echter Schnitt bei der Stelle f (Anteil der Länge der Seite, wie bei Spanten) */
  schnittBei: (f: number) => SchnittUmriss;
  info: SchnittInfo;
};

// ---------- Vorlagen-Raster (normiert: u = Breite ab der Achse, v = Höhe 0 … 1) ----------

const VH = 1 / 80;
const VU = 1.3;
const VV0 = -0.3;
const VV1 = 1.3;
const VNU = Math.round(VU / VH) + 1;
const VNV = Math.round((VV1 - VV0) / VH) + 1;
const GROSS = 1e9;

/** Ein Teil eines Rasters: Hüllkasten (u nur rechts der Achse gezählt; Teile an der Achse symmetrisch) */
type Teil = { u0: number; u1: number; v0: number; v1: number; achse: boolean; anzahl: number };

type Vorlage = { feld: Float32Array; lab: Int32Array; teile: Teil[] };

// ---------- Hilfen: Polygone, Schnittpunkte, Abstände ----------

/** v-Werte, an denen der Zug die Senkrechte u = x kreuzt (halb offene Regel: Ecken genau auf x zählen einmal). */
function kreuzungenSenkrecht(pts: readonly V2[], x: number, geschlossen: boolean, out: number[]): void {
  out.length = 0;
  const n = pts.length;
  const m = geschlossen ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    if (a.x <= x !== b.x <= x) out.push(a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y));
  }
  out.sort((p, q) => p - q);
}

/** u-Werte, an denen der Zug die Waagerechte v = y kreuzt. */
function kreuzungenWaagerecht(pts: readonly V2[], y: number, geschlossen: boolean, out: number[]): void {
  out.length = 0;
  const n = pts.length;
  const m = geschlossen ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    if (a.y <= y !== b.y <= y) out.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
  }
  out.sort((p, q) => p - q);
}

/**
 * Randwerte einer Hälfte auf der Linie (für |s| ≥ 0): 'halb' nur die Kreuzungen rechts der Achse, 'gerade-ungerade'
 * zusätzlich ihre Spiegelbilder. Innen ist, wo die Zahl der Randwerte über s ungerade ist.
 */
function randwerte(kreuz: readonly number[], regel: SchnittRegel, out: number[]): void {
  out.length = 0;
  for (const c of kreuz) {
    if (regel === 'halb') {
      if (c > 0) out.push(c);
    } else {
      out.push(c, -c);
    }
  }
  out.sort((p, q) => p - q);
}

/** Vorzeichenbehafteter 1D-Abstand zu den Randwerten (innen negativ, Parität der Werte über s). */
function abstand1D(rand: readonly number[], s: number): number {
  if (!rand.length) return GROSS;
  let ueber = 0;
  let best = Infinity;
  for (const c of rand) {
    if (c > s) ueber++;
    const d = Math.abs(c - s);
    if (d < best) best = d;
  }
  return ueber % 2 === 1 ? -best : best;
}

/** Segmente als flaches Feld [ax, ay, bx, by, …]; 'halb': nur der Teil rechts der Achse (u ≥ 0). */
function segmentFeld(pts: readonly V2[], nurRechts: boolean): Float64Array {
  const out: number[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    let a = pts[i]!;
    let b = pts[i + 1]!;
    if (nurRechts) {
      if (a.x < 0 && b.x < 0) continue;
      if (a.x < 0 || b.x < 0) {
        const t = a.x / (a.x - b.x);
        const m = { x: 0, y: a.y + t * (b.y - a.y) };
        if (a.x < 0) a = m;
        else b = m;
      }
    }
    out.push(a.x, a.y, b.x, b.y);
  }
  return Float64Array.from(out);
}

function abstandZuSegmenten(seg: Float64Array, px: number, py: number): number {
  let best = Infinity;
  for (let s = 0; s < seg.length; s += 4) {
    const ax = seg[s]!;
    const ay = seg[s + 1]!;
    const dx = seg[s + 2]! - ax;
    const dy = seg[s + 3]! - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 1e-18 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const ex = ax + t * dx - px;
    const ey = ay + t * dy - py;
    const d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/**
 * Abstandsfeld einer gespiegelten Hälfte auf einem Halbraster (Spalte a: u = a·du ≥ 0, Zeile b: v = v0 + b·dv), innen
 * negativ. `halb` = offener Zug von Achse zu Achse.
 */
function haelftenFeld(halb: readonly V2[], regel: SchnittRegel, spalten: number, zeilen: number, du: number, v0: number, dv: number): Float32Array {
  const feld = new Float32Array(spalten * zeilen);
  const segRechts = segmentFeld(halb, regel === 'halb');
  const spiegel = regel === 'halb' ? null : segmentFeld(halb, false);
  const kreuz: number[] = [];
  const rand: number[] = [];
  for (let b = 0; b < zeilen; b++) {
    const v = v0 + b * dv;
    kreuzungenWaagerecht(halb, v, false, kreuz);
    randwerte(kreuz, regel, rand);
    // Parität von rechts nach links mitzählen
    let k = rand.length - 1;
    let ueber = 0;
    for (let a = spalten - 1; a >= 0; a--) {
      const u = a * du;
      while (k >= 0 && rand[k]! > u) {
        ueber++;
        k--;
      }
      let d = abstandZuSegmenten(segRechts, u, v);
      if (spiegel) d = Math.min(d, abstandZuSegmenten(spiegel, -u, v));
      feld[b * spalten + a] = ueber % 2 === 1 ? -d : d;
    }
  }
  return feld;
}

/** Abstandsfeld eines geschlossenen Zugs (gerade-ungerade) auf einem Raster: Spalte a: u = u0 + a·du, Zeile b: v = v0 + b·dv. */
function geschlossenesFeld(zug: readonly V2[], spalten: number, zeilen: number, u0: number, du: number, v0: number, dv: number): Float32Array {
  const feld = new Float32Array(spalten * zeilen);
  const seg = segmentFeld([...zug, zug[0]!], false);
  const kreuz: number[] = [];
  for (let b = 0; b < zeilen; b++) {
    const v = v0 + b * dv;
    kreuzungenWaagerecht(zug, v, true, kreuz);
    let k = kreuz.length - 1;
    let ueber = 0;
    for (let a = spalten - 1; a >= 0; a--) {
      const u = u0 + a * du;
      while (k >= 0 && kreuz[k]! > u) {
        ueber++;
        k--;
      }
      const d = abstandZuSegmenten(seg, u, v);
      feld[b * spalten + a] = ueber % 2 === 1 ? -d : d;
    }
  }
  return feld;
}

/**
 * Zusammenhangskomponenten (4er-Nachbarschaft) von feld < 0 auf einem Halbraster, mit Hüllkasten auf Bruchteile einer
 * Zelle genau (Nulldurchgang zu den Nachbarn). `ordnung` bekommt die Zellen je Teil hintereinander, `start` die Anfänge.
 */
function teileFinden(feld: Float32Array, spalten: number, zeilen: number, du: number, v0: number, dv: number, lab: Int32Array, stapel: Int32Array, start?: number[]): Teil[] {
  lab.fill(-1);
  const teile: Teil[] = [];
  let ende = 0;
  start?.splice(0);
  for (let i0 = 0; i0 < spalten * zeilen; i0++) {
    if (feld[i0]! >= 0 || lab[i0]! >= 0) continue;
    const id = teile.length;
    const t: Teil = { u0: Infinity, u1: -Infinity, v0: Infinity, v1: -Infinity, achse: false, anzahl: 0 };
    teile.push(t);
    start?.push(ende);
    let kopf = ende;
    stapel[ende++] = i0;
    lab[i0] = id;
    while (kopf < ende) {
      const i = stapel[kopf++]!;
      const a = i % spalten;
      const b = (i - a) / spalten;
      const u = a * du;
      const v = v0 + b * dv;
      const fi = feld[i]!;
      t.anzahl++;
      if (a === 0) t.achse = true;
      if (u < t.u0) t.u0 = u;
      if (u > t.u1) t.u1 = u;
      if (v < t.v0) t.v0 = v;
      if (v > t.v1) t.v1 = v;
      // Nachbarn: innen → weiter, außen → Nulldurchgang in den Kasten
      for (let r = 0; r < 4; r++) {
        const na = r === 0 ? a + 1 : r === 1 ? a - 1 : a;
        const nb = r === 2 ? b + 1 : r === 3 ? b - 1 : b;
        if (na < 0 || nb < 0 || na >= spalten || nb >= zeilen) continue;
        const j = nb * spalten + na;
        const fj = feld[j]!;
        if (fj < 0) {
          if (lab[j]! < 0) {
            lab[j] = id;
            stapel[ende++] = j;
          }
          continue;
        }
        const s = fi / (fi - fj);
        if (r === 0) t.u1 = Math.max(t.u1, u + s * du);
        else if (r === 1) t.u0 = Math.min(t.u0, u - s * du);
        else if (r === 2) t.v1 = Math.max(t.v1, v + s * dv);
        else t.v0 = Math.min(t.v0, v - s * dv);
      }
    }
    if (t.achse) t.u0 = -t.u1;
  }
  start?.push(ende);
  return teile;
}

/** Bilinear im Vorlagenraster (|u|), mit Ableitungen nach u und v. */
function vorlageBei(feld: Float32Array, u: number, v: number, aus: { d: number; gu: number; gv: number }): void {
  const s = u < 0 ? -1 : 1;
  let fu = Math.abs(u) / VH;
  let fv = (v - VV0) / VH;
  let extra = 0;
  // außerhalb: an den Rand klemmen und den Abstand dazurechnen (nur grob, dort liegt kein Rand mehr)
  if (fu > VNU - 1.001) {
    extra += (fu - (VNU - 1.001)) * VH;
    fu = VNU - 1.001;
  }
  if (fv < 0) {
    extra += -fv * VH;
    fv = 0;
  } else if (fv > VNV - 1.001) {
    extra += (fv - (VNV - 1.001)) * VH;
    fv = VNV - 1.001;
  }
  const a = Math.floor(fu);
  const b = Math.floor(fv);
  const tu = fu - a;
  const tv = fv - b;
  const i = b * VNU + a;
  const f00 = feld[i]!;
  const f10 = feld[i + 1]!;
  const f01 = feld[i + VNU]!;
  const f11 = feld[i + VNU + 1]!;
  aus.d = (1 - tv) * ((1 - tu) * f00 + tu * f10) + tv * ((1 - tu) * f01 + tu * f11) + extra;
  aus.gu = (s * ((1 - tv) * (f10 - f00) + tv * (f11 - f01))) / VH;
  aus.gv = ((1 - tu) * (f01 - f00) + tu * (f11 - f10)) / VH;
}

// ---------- Euklidische Distanztransformation (Felzenszwalb & Huttenlocher 2012) ----------

const UNENDLICH = 1e20;

function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -UNENDLICH;
  z[1] = UNENDLICH;
  for (let q = 1; q < n; q++) {
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) {
      k--;
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = UNENDLICH;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    const dq = q - v[k]!;
    d[q] = dq * dq + f[v[k]!]!;
  }
}

/** Quadrierter Abstand (in Zellen) jeder Zelle zur nächsten Zelle mit `ziel[i] === wert`. */
function edt2d(ziel: Uint8Array, wert: number, spalten: number, zeilen: number, out: Float64Array, p: EdtPuffer): void {
  for (let i = 0; i < spalten * zeilen; i++) out[i] = ziel[i] === wert ? 0 : UNENDLICH;
  // Spalten
  for (let a = 0; a < spalten; a++) {
    for (let b = 0; b < zeilen; b++) p.f[b] = out[b * spalten + a]!;
    edt1d(p.f, zeilen, p.d, p.v, p.z);
    for (let b = 0; b < zeilen; b++) out[b * spalten + a] = p.d[b]!;
  }
  // Zeilen
  for (let b = 0; b < zeilen; b++) {
    const o = b * spalten;
    for (let a = 0; a < spalten; a++) p.f[a] = out[o + a]!;
    edt1d(p.f, spalten, p.d, p.v, p.z);
    for (let a = 0; a < spalten; a++) out[o + a] = p.d[a]!;
  }
}

type EdtPuffer = { f: Float64Array; d: Float64Array; v: Int32Array; z: Float64Array };

// ---------- Kontext eines Baus ----------

type Kontext = {
  opt: SchnittOptionen;
  seite: V2[];
  topHalb: V2[];
  xMin: number;
  xMax: number;
  tMin: number;
  tMax: number;
  h: number;
  x0: number;
  y0: number;
  NX: number;
  NY: number;
  /** Spalten rechts der Achse einschließlich der Achse (z = k·h) */
  NZH: number;
  /** Abstand zur Front je Zelle des Halbrasters (Zeile y, Spalte z) */
  front: Float32Array;
  /**
   * Abstand zur Seite in der (x, y)-Ebene (Zeile x, Spalte y) und zum Top in der (x, z)-Ebene (Zeile x, Spalte z ≥ 0,
   * auf die Länge der Seite gestreckt). Beides sind untere Schranken des 3D-Abstands; sie legen Flächen fest, die quer zu
   * x stehen (Spitzen, Halsvorderseite, Stufen), wo das gestapelte Scheibenfeld ungenau ist.
   */
  seite2: Float32Array;
  top2: Float32Array;
  /** Stützen der Überblendung (Hauptspant = Front, Spanten) mit dem Kasten an ihrer Stelle */
  stuetzen: { f: number; vorlage: Vorlage; kasten: Kasten3; profil: Profil }[];
};

/** Kasten einer Stelle wie bei den Spanten: Höhe aus der Seite (äußerste Schnittpunkte), halbe Breite aus dem Top. */
type Kasten3 = { yLo: number; yHi: number; w: number };

function kastenAn(seite: V2[], topHalb: V2[], xMin: number, xMax: number, tMin: number, tMax: number, f: number, regel: SchnittRegel): Kasten3 {
  const ff = Math.min(1 - 1e-6, Math.max(1e-6, f));
  const kreuz: number[] = [];
  const rand: number[] = [];
  kreuzungenSenkrecht(seite, xMin + ff * (xMax - xMin), true, kreuz);
  const yLo = kreuz.length ? kreuz[0]! : 0;
  const yHi = kreuz.length ? kreuz[kreuz.length - 1]! : 0;
  kreuzungenSenkrecht(topHalb, tMin + ff * (tMax - tMin), false, kreuz);
  randwerte(kreuz, regel, rand);
  let w = 0;
  for (const r of rand) w = Math.max(w, Math.abs(r));
  return { yLo, yHi, w };
}

const vorlagenSpeicher = new WeakMap<object, Map<SchnittRegel, Vorlage>>();

function vorlageAus(profil: Parameters<typeof segmente>[0], regel: SchnittRegel, stapel: Int32Array): Vorlage {
  let m = vorlagenSpeicher.get(profil);
  if (!m) {
    m = new Map();
    vorlagenSpeicher.set(profil, m);
  }
  const alt = m.get(regel);
  if (alt) return alt;
  const halb = pfadAbtasten(segmente(profil), 32);
  const feld = haelftenFeld(halb, regel, VNU, VNV, VH, VV0, VH);
  const lab = new Int32Array(VNU * VNV);
  const teile = teileFinden(feld, VNU, VNV, VH, VV0, VH, lab, stapel);
  const v = { feld, lab, teile };
  m.set(regel, v);
  return v;
}

function kontextBauen(dok: Dokument, opt: SchnittOptionen): Kontext {
  const seite = pfadAbtasten(vollerPfad(dok.profile.seite), 32);
  const topHalb = pfadAbtasten(segmente(dok.profile.top), 32);
  const frontHalb = pfadAbtasten(segmente(dok.profile.front), 32);
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const p of seite) {
    xMin = Math.min(xMin, p.x);
    xMax = Math.max(xMax, p.x);
    yMin = Math.min(yMin, p.y);
    yMax = Math.max(yMax, p.y);
  }
  let tMin = Infinity;
  let tMax = -Infinity;
  let zTop = 0;
  for (const p of topHalb) {
    tMin = Math.min(tMin, p.x);
    tMax = Math.max(tMax, p.x);
    zTop = Math.max(zTop, Math.abs(p.y));
  }
  let zFront = 0;
  for (const p of frontHalb) zFront = Math.max(zFront, Math.abs(p.x));
  const zMax = Math.max(1e-3, Math.min(zTop, zFront));
  const groesste = Math.max(xMax - xMin, yMax - yMin, 2 * zMax, 1e-3);
  const h = groesste / Math.max(8, opt.aufloesung);
  const rand = 2;
  const NX = Math.ceil((xMax - xMin) / h) + 2 * rand + 1;
  const NY = Math.ceil((yMax - yMin) / h) + 2 * rand + 1;
  const NZH = Math.ceil(zMax / h) + rand + 1;
  const x0 = (xMin + xMax) / 2 - ((NX - 1) * h) / 2;
  const y0 = (yMin + yMax) / 2 - ((NY - 1) * h) / 2;
  const front = haelftenFeld(frontHalb, opt.regel, NZH, NY, h, y0, h);
  const stapel = new Int32Array(VNU * VNV);
  const stuetzen = spantStuetzen(dok).map((s) => {
    const profil = s.index < 0 ? hauptspantProfil(dok) : s.profil;
    return { f: s.f, profil, vorlage: vorlageAus(profil, opt.regel, stapel), kasten: kastenAn(seite, topHalb, xMin, xMax, tMin, tMax, s.f, opt.regel) };
  });
  const seite2 = geschlossenesFeld(
    seite.map((p) => ({ x: p.y, y: p.x })),
    NY,
    NX,
    y0,
    h,
    x0,
    h,
  );
  const topWelt = topHalb.map((p) => ({ x: Math.abs(p.y) < 1e-12 ? 0 : p.y, y: xMin + ((p.x - tMin) / (tMax - tMin || 1)) * (xMax - xMin) }));
  const top2 = haelftenFeld(topWelt, opt.regel, NZH, NX, h, x0, h);
  return { opt, seite, topHalb, xMin, xMax, tMin, tMax, h, x0, y0, NX, NY, NZH, front, seite2, top2, stuetzen };
}

// ---------- Eine Scheibe ----------

type Scheibe = {
  /** Abstandsfeld (Welt) im Halbraster: Zeile j (y), Spalte k (z = k·h ≥ 0) */
  feld: Float32Array;
  innen: Uint8Array;
};

type Puffer = {
  dSeite: Float64Array;
  dTop: Float64Array;
  dH: Float32Array;
  lab: Int32Array;
  dR: Float32Array;
  stapel: Int32Array;
  ordnung: Int32Array;
  edtA: Float64Array;
  edtB: Float64Array;
  edt: EdtPuffer;
  vFeld: Float32Array;
  vLab: Int32Array;
  vStapel: Int32Array;
  kreuz: number[];
  rand: number[];
  start: number[];
  wert: { d: number; gu: number; gv: number };
  ergebnis: Scheibe;
};

function pufferAnlegen(k: Kontext): Puffer {
  const n = k.NY * k.NZH;
  const m = Math.max(k.NY, k.NZH) + 2;
  return {
    dSeite: new Float64Array(k.NY),
    dTop: new Float64Array(k.NZH),
    dH: new Float32Array(n),
    lab: new Int32Array(n),
    dR: new Float32Array(n),
    stapel: new Int32Array(n),
    ordnung: new Int32Array(n),
    edtA: new Float64Array(n),
    edtB: new Float64Array(n),
    edt: { f: new Float64Array(m), d: new Float64Array(m), v: new Int32Array(m), z: new Float64Array(m + 1) },
    vFeld: new Float32Array(VNU * VNV),
    vLab: new Int32Array(VNU * VNV),
    vStapel: new Int32Array(VNU * VNV),
    kreuz: [],
    rand: [],
    start: [],
    wert: { d: 0, gu: 0, gv: 0 },
    ergebnis: { feld: new Float32Array(n), innen: new Uint8Array(n) },
  };
}

/**
 * Vorlage an der Stelle f: Stütze oder lineare Überblendung der Abstandsfelder der Nachbarn. Dazu der Kasten, in dem
 * die Vorlage gezeichnet ist (Kasten der Stütze, zwischen Stützen überblendet): Daran werden Teile der Vorlage den
 * Teilen des Körpers zugeordnet. Vor dem ersten Spant liegt die Acht also dort, wo sie bei S1 gezeichnet ist.
 */
function vorlageAnStelle(k: Kontext, f: number, p: Puffer): { vorlage: Vorlage; kasten: Kasten3 } {
  const st = k.stuetzen;
  if (st.length === 1 || f <= st[0]!.f) return st[0]!;
  const letzte = st[st.length - 1]!;
  if (f >= letzte.f) return letzte;
  let i = 0;
  while (i + 1 < st.length && st[i + 1]!.f < f) i++;
  const a = st[i]!;
  const b = st[i + 1]!;
  const t = b.f - a.f > 1e-9 ? (f - a.f) / (b.f - a.f) : 0;
  if (t < 1e-6) return a;
  if (t > 1 - 1e-6) return b;
  if (k.opt.ueberblenden === 'punkte') {
    // Punkt für Punkt überblenden (gleiche Punktstruktur), dann die Fläche bilden: Ecken wandern als Kante längs
    const halb = pfadAbtasten(segmente(mischeProfile(a.profil, b.profil, t)), 16);
    p.vFeld.set(haelftenFeld(halb, k.opt.regel, VNU, VNV, VH, VV0, VH));
  } else {
    const fa = a.vorlage.feld;
    const fb = b.vorlage.feld;
    for (let q = 0; q < fa.length; q++) p.vFeld[q] = (1 - t) * fa[q]! + t * fb[q]!;
  }
  const teile = teileFinden(p.vFeld, VNU, VNV, VH, VV0, VH, p.vLab, p.vStapel);
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    vorlage: { feld: p.vFeld, lab: p.vLab, teile },
    kasten: { yLo: mix(a.kasten.yLo, b.kasten.yLo), yHi: mix(a.kasten.yHi, b.kasten.yHi), w: mix(a.kasten.w, b.kasten.w) },
  };
}

/**
 * Schnitt bei x. Mit Scheibennummer `iRaster` gelten für Seite und Top die 2D-Abstände (stetig in x, auch wo Teile
 * zusammenwachsen); sonst die 1D-Abstände in der Scheibe (gleiche Nullstellen, für Schnitte an beliebiger Stelle).
 */
function scheibeBerechnen(k: Kontext, x: number, p: Puffer, iRaster = -1): Scheibe {
  const { NY, NZH, h, y0 } = k;
  const n = NY * NZH;
  const erg = p.ergebnis;
  const f = (x - k.xMin) / (k.xMax - k.xMin || 1);
  // Seite: Intervalle in y
  kreuzungenSenkrecht(k.seite, x, true, p.kreuz);
  const seitenRand = p.kreuz.slice();
  if (seitenRand.length < 2 || f < 0 || f > 1) {
    // leere Scheibe: außen; im Raster die echten 2D-Abstände (bessere Spitzen)
    for (let j = 0; j < NY; j++) {
      for (let c = 0; c < NZH; c++) {
        const i = j * NZH + c;
        const d = iRaster >= 0 ? Math.max(k.seite2[iRaster * NY + j]!, k.top2[iRaster * NZH + c]!, k.front[i]!, 1e-6) : GROSS;
        p.dH[i] = d;
        erg.feld[i] = d;
        erg.innen[i] = 0;
      }
    }
    return erg;
  }
  for (let j = 0; j < NY; j++) p.dSeite[j] = iRaster >= 0 ? k.seite2[iRaster * NY + j]! : abstand1D(seitenRand, y0 + j * h);
  // Top: Intervalle in |z| an der gestreckten Stelle
  const t = k.tMin + f * (k.tMax - k.tMin);
  kreuzungenSenkrecht(k.topHalb, t, false, p.kreuz);
  randwerte(p.kreuz, k.opt.regel, p.rand);
  for (let c = 0; c < NZH; c++) p.dTop[c] = iRaster >= 0 ? k.top2[iRaster * NZH + c]! : abstand1D(p.rand, c * h);

  // sichtbare Hülle
  const dH = p.dH;
  for (let j = 0; j < NY; j++) {
    const ds = p.dSeite[j]!;
    for (let c = 0; c < NZH; c++) {
      const i = j * NZH + c;
      dH[i] = Math.max(ds, p.dTop[c]!, k.front[i]!);
    }
  }
  const dR = p.dR;
  if (!k.opt.runden) {
    dR.set(dH);
  } else {
    // Teile der Hülle (Zeile = y, Spalte = z): Kasten je Teil
    const teile = teileFinden(dH, NZH, NY, h, y0, h, p.lab, p.ordnung, p.start);
    const { vorlage, kasten } = vorlageAnStelle(k, f, p);
    const { yLo, yHi, w: wKasten } = kasten;
    for (let i = 0; i < n; i++) dR[i] = GROSS;
    const w = p.wert;
    const zaehler = new Map<number, number>();
    teile.forEach((teil, id) => {
      // Teil der Vorlage, der dieses Teil überdeckt (nur nötig, wenn die Vorlage selbst mehrere Teile hat)
      let gewaehlt: Teil[] = vorlage.teile;
      if (vorlage.teile.length > 1 && wKasten > 1e-9 && yHi - yLo > 1e-9) {
        zaehler.clear();
        for (let q = p.start[id]!; q < p.start[id + 1]!; q++) {
          const i = p.ordnung[q]!;
          const c = i % NZH;
          const j = (i - c) / NZH;
          const u = (c * h) / wKasten;
          const v = (y0 + j * h - yLo) / (yHi - yLo);
          const a = Math.round(u / VH);
          const b = Math.round((v - VV0) / VH);
          if (a < 0 || b < 0 || a >= VNU || b >= VNV) continue;
          const l = vorlage.lab[b * VNU + a]!;
          if (l >= 0) zaehler.set(l, (zaehler.get(l) ?? 0) + 1);
        }
        // Anteil jedes Vorlagenteils, der in diesem Teil liegt (gemessen an seiner eigenen Fläche im Kasten): ab 30 % gehört
        // er dazu. So zählt auch eine kleine Linse (Schnauze) neben einem großen Bauch.
        const zelle = (VH * VH * wKasten * (yHi - yLo)) / (h * h);
        const anteil = (l: number, z: number) => z / Math.max(1, vorlage.teile[l]!.anzahl * zelle);
        let treffer = [...zaehler.entries()].filter(([l, z]) => z >= 2 && anteil(l, z) >= 0.3).map(([l]) => vorlage.teile[l]!);
        if (!treffer.length && zaehler.size) {
          const best = [...zaehler.entries()].sort((a, b) => anteil(b[0], b[1]) - anteil(a[0], a[1]))[0]![0];
          treffer = [vorlage.teile[best]!];
        }
        if (treffer.length) gewaehlt = treffer;
      }
      // Kasten der gewählten Vorlagenteile; ein Teil an der Achse bekommt eine symmetrische Vorlage
      let u0 = Infinity;
      let u1 = -Infinity;
      let v0 = Infinity;
      let v1 = -Infinity;
      for (const g of gewaehlt) {
        u0 = Math.min(u0, g.u0);
        u1 = Math.max(u1, g.u1);
        v0 = Math.min(v0, g.v0);
        v1 = Math.max(v1, g.v1);
      }
      if (teil.achse) {
        const um = Math.max(Math.abs(u0), Math.abs(u1));
        u0 = -um;
        u1 = um;
      }
      const z0 = teil.u0;
      const z1 = teil.u1;
      const ya = teil.v0;
      const yb = teil.v1;
      if (!(z1 - z0 > 1e-9 && yb - ya > 1e-9 && u1 - u0 > 1e-9 && v1 - v0 > 1e-9)) return;
      const su = (u1 - u0) / (z1 - z0);
      const sv = (v1 - v0) / (yb - ya);
      const dT = (z: number, y: number): number => {
        vorlageBei(vorlage.feld, u0 + (z - z0) * su, v0 + (y - ya) * sv, w);
        const gx = w.gu * su;
        const gy = w.gv * sv;
        const g = Math.sqrt(gx * gx + gy * gy);
        return w.d / Math.max(g, 1e-3 * Math.min(su, sv));
      };
      for (let q = p.start[id]!; q < p.start[id + 1]!; q++) {
        const i = p.ordnung[q]!;
        const c = i % NZH;
        const j = (i - c) / NZH;
        const z = c * h;
        const y = y0 + j * h;
        dR[i] = Math.max(dH[i]!, dT(z, y));
        // Nachbarn außerhalb der Hülle: Abstand zu diesem Teil (für den genauen Rand)
        for (let r = 0; r < 4; r++) {
          const nc = r === 0 ? c + 1 : r === 1 ? c - 1 : c;
          const nj = r === 2 ? j + 1 : r === 3 ? j - 1 : j;
          if (nc < 0 || nj < 0 || nc >= NZH || nj >= NY) continue;
          const ni = nj * NZH + nc;
          if (p.lab[ni]! >= 0) continue;
          const wert = Math.max(dH[ni]!, dT(nc * h, y0 + nj * h));
          if (wert < dR[ni]!) dR[ni] = wert;
        }
      }
    });
    for (let i = 0; i < n; i++) if (dR[i] === GROSS) dR[i] = dH[i]!;
  }

  // innen/außen, Abstand weiter weg aus der Distanztransformation, am Rand der genaue Wert
  const innen = erg.innen;
  for (let i = 0; i < n; i++) innen[i] = dR[i]! < 0 ? 1 : 0;
  edt2d(innen, 1, NZH, NY, p.edtA, p.edt);
  edt2d(innen, 0, NZH, NY, p.edtB, p.edt);
  for (let j = 0; j < NY; j++) {
    for (let c = 0; c < NZH; c++) {
      const i = j * NZH + c;
      const s = innen[i]!;
      const rand =
        (c + 1 < NZH && innen[i + 1] !== s) || (c > 0 && innen[i - 1] !== s) || (j + 1 < NY && innen[i + NZH] !== s) || (j > 0 && innen[i - NZH] !== s);
      if (rand) erg.feld[i] = dR[i]!;
      else if (s) erg.feld[i] = -(Math.sqrt(p.edtB[i]!) - 0.5) * h;
      else erg.feld[i] = p.edtA[i]! >= UNENDLICH / 2 ? GROSS : (Math.sqrt(p.edtA[i]!) - 0.5) * h;
    }
  }
  return erg;
}

// ---------- Surface Nets ----------

const ECKEN: [number, number, number][] = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
];
/** Kanten des Würfels; die ersten drei gehen von Ecke 0 entlang x, y, z. */
const KANTEN: [number, number][] = (() => {
  const out: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 4],
  ];
  for (let a = 0; a < 8; a++) {
    for (const bit of [1, 2, 4]) {
      const b = a | bit;
      if (b !== a && a !== 0) out.push([a, b]);
    }
  }
  return out;
})();
const KANTEN_MASKE = (() => {
  const t = new Int32Array(256);
  for (let m = 0; m < 256; m++) {
    let e = 0;
    KANTEN.forEach(([a, b], i) => {
      if (((m >> a) & 1) !== ((m >> b) & 1)) e |= 1 << i;
    });
    t[m] = e;
  }
  return t;
})();

export type RohNetz = { punkte: Float64Array; anzahl: number; vierecke: Uint32Array; vAnzahl: number };

export function surfaceNets(D: Float32Array, NX: number, NY: number, NZ: number, x0: number, y0: number, z0: number, h: number): RohNetz {
  const R = [NY * NZ, NZ, 1];
  const zelle = new Int32Array(NX * NY * NZ);
  let punkte = new Float64Array(3 * 4096);
  let anzahl = 0;
  let vierecke = new Uint32Array(4 * 8192);
  let vAnzahl = 0;
  const off = ECKEN.map(([a, b, c]) => a * R[0]! + b * R[1]! + c * R[2]!);
  const werte = new Float64Array(8);
  const viereck = (a: number, b: number, c: number, d: number) => {
    if (4 * vAnzahl + 4 > vierecke.length) {
      const neu = new Uint32Array(vierecke.length * 2);
      neu.set(vierecke);
      vierecke = neu;
    }
    vierecke[4 * vAnzahl] = a;
    vierecke[4 * vAnzahl + 1] = b;
    vierecke[4 * vAnzahl + 2] = c;
    vierecke[4 * vAnzahl + 3] = d;
    vAnzahl++;
  };
  const koord = [0, 0, 0];
  for (let i = 0; i < NX - 1; i++) {
    koord[0] = i;
    for (let j = 0; j < NY - 1; j++) {
      koord[1] = j;
      for (let k = 0; k < NZ - 1; k++) {
        koord[2] = k;
        const idx = (i * NY + j) * NZ + k;
        let maske = 0;
        for (let c = 0; c < 8; c++) {
          const g = D[idx + off[c]!]!;
          werte[c] = g;
          if (g < 0) maske |= 1 << c;
        }
        if (maske === 0 || maske === 255) continue;
        const em = KANTEN_MASKE[maske]!;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let z = 0;
        for (let e = 0; e < 12; e++) {
          if (!(em & (1 << e))) continue;
          const [a, b] = KANTEN[e]!;
          const wa = werte[a]!;
          const wb = werte[b]!;
          const t = wa / (wa - wb);
          const ea = ECKEN[a]!;
          const eb = ECKEN[b]!;
          sx += ea[0] + t * (eb[0] - ea[0]);
          sy += ea[1] + t * (eb[1] - ea[1]);
          sz += ea[2] + t * (eb[2] - ea[2]);
          z++;
        }
        if (3 * anzahl + 3 > punkte.length) {
          const neu = new Float64Array(punkte.length * 2);
          neu.set(punkte);
          punkte = neu;
        }
        punkte[3 * anzahl] = x0 + (i + sx / z) * h;
        punkte[3 * anzahl + 1] = y0 + (j + sy / z) * h;
        punkte[3 * anzahl + 2] = z0 + (k + sz / z) * h;
        const v = anzahl++;
        zelle[idx] = v;
        for (let a = 0; a < 3; a++) {
          if (!(em & (1 << a))) continue;
          const iu = (a + 1) % 3;
          const iv = (a + 2) % 3;
          if (koord[iu] === 0 || koord[iv] === 0) continue;
          const du = R[iu]!;
          const dv = R[iv]!;
          if (maske & 1) viereck(v, zelle[idx - du]!, zelle[idx - du - dv]!, zelle[idx - dv]!);
          else viereck(v, zelle[idx - dv]!, zelle[idx - du - dv]!, zelle[idx - du]!);
        }
      }
    }
  }
  return { punkte, anzahl, vierecke, vAnzahl };
}

/** Taubin-Glättung (λ|μ, Umbrella-Operator über die Viereckskanten): glättet ohne zu schrumpfen. */
export function taubin(netz: RohNetz, durchgaenge: number, lambda = 0.5, mu = -0.53): void {
  const { punkte, anzahl, vierecke, vAnzahl } = netz;
  if (!durchgaenge || !anzahl) return;
  const grad = new Int32Array(anzahl + 1);
  for (let q = 0; q < vAnzahl; q++) for (let e = 0; e < 4; e++) grad[vierecke[4 * q + e]!]! += 2;
  const start = new Int32Array(anzahl + 1);
  for (let v = 0; v < anzahl; v++) start[v + 1] = start[v]! + grad[v]!;
  const nb = new Int32Array(start[anzahl]!);
  const pos = start.slice();
  for (let q = 0; q < vAnzahl; q++) {
    for (let e = 0; e < 4; e++) {
      const a = vierecke[4 * q + e]!;
      const b = vierecke[4 * q + ((e + 1) % 4)]!;
      nb[pos[a]!++] = b;
      nb[pos[b]!++] = a;
    }
  }
  const tmp = new Float64Array(3 * anzahl);
  const schritt = (s: number) => {
    for (let v = 0; v < anzahl; v++) {
      const s0 = start[v]!;
      const s1 = start[v + 1]!;
      if (s1 === s0) {
        tmp[3 * v] = punkte[3 * v]!;
        tmp[3 * v + 1] = punkte[3 * v + 1]!;
        tmp[3 * v + 2] = punkte[3 * v + 2]!;
        continue;
      }
      let mx = 0;
      let my = 0;
      let mz = 0;
      for (let q = s0; q < s1; q++) {
        const o = 3 * nb[q]!;
        mx += punkte[o]!;
        my += punkte[o + 1]!;
        mz += punkte[o + 2]!;
      }
      const m = s1 - s0;
      tmp[3 * v] = punkte[3 * v]! + s * (mx / m - punkte[3 * v]!);
      tmp[3 * v + 1] = punkte[3 * v + 1]! + s * (my / m - punkte[3 * v + 1]!);
      tmp[3 * v + 2] = punkte[3 * v + 2]! + s * (mz / m - punkte[3 * v + 2]!);
    }
    punkte.set(tmp.subarray(0, 3 * anzahl));
  };
  for (let d = 0; d < durchgaenge; d++) {
    schritt(lambda);
    schritt(mu);
  }
}

export function netzAusgeben(netz: RohNetz): { positionen: Float32Array; normalen: Float32Array; indizes: Uint32Array } {
  const { punkte, anzahl, vierecke, vAnzahl } = netz;
  const positionen = new Float32Array(3 * anzahl);
  for (let i = 0; i < 3 * anzahl; i++) positionen[i] = punkte[i]!;
  const indizes = new Uint32Array(6 * vAnzahl);
  const d2 = (a: number, b: number) => {
    const dx = punkte[3 * a]! - punkte[3 * b]!;
    const dy = punkte[3 * a + 1]! - punkte[3 * b + 1]!;
    const dz = punkte[3 * a + 2]! - punkte[3 * b + 2]!;
    return dx * dx + dy * dy + dz * dz;
  };
  for (let q = 0; q < vAnzahl; q++) {
    const a = vierecke[4 * q]!;
    const b = vierecke[4 * q + 1]!;
    const c = vierecke[4 * q + 2]!;
    const d = vierecke[4 * q + 3]!;
    const o = 6 * q;
    // entlang der kürzeren Diagonale teilen
    if (d2(a, c) <= d2(b, d)) indizes.set([a, b, c, a, c, d], o);
    else indizes.set([a, b, d, b, c, d], o);
  }
  const normalen = new Float32Array(3 * anzahl);
  for (let t = 0; t < indizes.length; t += 3) {
    const a = 3 * indizes[t]!;
    const b = 3 * indizes[t + 1]!;
    const c = 3 * indizes[t + 2]!;
    const ux = positionen[b]! - positionen[a]!;
    const uy = positionen[b + 1]! - positionen[a + 1]!;
    const uz = positionen[b + 2]! - positionen[a + 2]!;
    const vx = positionen[c]! - positionen[a]!;
    const vy = positionen[c + 1]! - positionen[a + 1]!;
    const vz = positionen[c + 2]! - positionen[a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      normalen[v] = normalen[v]! + nx;
      normalen[v + 1] = normalen[v + 1]! + ny;
      normalen[v + 2] = normalen[v + 2]! + nz;
    }
  }
  for (let v = 0; v < normalen.length; v += 3) {
    const l = Math.hypot(normalen[v]!, normalen[v + 1]!, normalen[v + 2]!) || 1;
    normalen[v] = normalen[v]! / l;
    normalen[v + 1] = normalen[v + 1]! / l;
    normalen[v + 2] = normalen[v + 2]! / l;
  }
  return { positionen, normalen, indizes };
}

// ---------- Schnitt als Umriss (Marching Squares) ----------

/** Volles Raster einer Scheibe (gespiegelt): Zeile j (y), Spalte k (z = (k − c)·h). */
function vollesRaster(k: Kontext, s: Scheibe): { feld: Float32Array; NZ: number } {
  const NZ = 2 * k.NZH - 1;
  const c = k.NZH - 1;
  const feld = new Float32Array(k.NY * NZ);
  for (let j = 0; j < k.NY; j++) {
    for (let q = 0; q < k.NZH; q++) {
      const w = s.feld[j * k.NZH + q]!;
      feld[j * NZ + c + q] = w;
      feld[j * NZ + c - q] = w;
    }
  }
  return { feld, NZ };
}

function umrisseAus(feld: Float32Array, NZ: number, NY: number, z0: number, y0: number, h: number): V2[][] {
  // Kantenpunkte: waagerecht (j, k → k+1) Schlüssel 2·(j·NZ + k), senkrecht (j → j+1, k) Schlüssel 2·(j·NZ + k) + 1
  const punkt = new Map<number, V2>();
  const nachbarn = new Map<number, number[]>();
  const wert = (j: number, k: number) => feld[j * NZ + k]!;
  const kp = (j: number, k: number, senkrecht: boolean): number => {
    const s = 2 * (j * NZ + k) + (senkrecht ? 1 : 0);
    if (!punkt.has(s)) {
      const a = wert(j, k);
      const b = senkrecht ? wert(j + 1, k) : wert(j, k + 1);
      const t = a / (a - b);
      punkt.set(s, senkrecht ? { x: z0 + k * h, y: y0 + (j + t) * h } : { x: z0 + (k + t) * h, y: y0 + j * h });
    }
    return s;
  };
  const verbinde = (a: number, b: number) => {
    (nachbarn.get(a) ?? nachbarn.set(a, []).get(a)!).push(b);
    (nachbarn.get(b) ?? nachbarn.set(b, []).get(b)!).push(a);
  };
  for (let j = 0; j + 1 < NY; j++) {
    for (let k = 0; k + 1 < NZ; k++) {
      const a = wert(j, k) < 0 ? 1 : 0;
      const b = wert(j, k + 1) < 0 ? 1 : 0;
      const c = wert(j + 1, k + 1) < 0 ? 1 : 0;
      const d = wert(j + 1, k) < 0 ? 1 : 0;
      const fall = a | (b << 1) | (c << 2) | (d << 3);
      if (fall === 0 || fall === 15) continue;
      const unten = () => kp(j, k, false);
      const oben = () => kp(j + 1, k, false);
      const links = () => kp(j, k, true);
      const rechts = () => kp(j, k + 1, true);
      switch (fall) {
        case 1:
        case 14:
          verbinde(links(), unten());
          break;
        case 2:
        case 13:
          verbinde(unten(), rechts());
          break;
        case 3:
        case 12:
          verbinde(links(), rechts());
          break;
        case 4:
        case 11:
          verbinde(rechts(), oben());
          break;
        case 6:
        case 9:
          verbinde(unten(), oben());
          break;
        case 7:
        case 8:
          verbinde(links(), oben());
          break;
        case 5:
        case 10: {
          // Sattel: nach dem Mittelwert entscheiden
          const m = (wert(j, k) + wert(j, k + 1) + wert(j + 1, k + 1) + wert(j + 1, k)) / 4;
          const mitteInnen = m < 0;
          if ((fall === 5) === mitteInnen) {
            verbinde(links(), oben());
            verbinde(unten(), rechts());
          } else {
            verbinde(links(), unten());
            verbinde(rechts(), oben());
          }
          break;
        }
      }
    }
  }
  const besucht = new Set<number>();
  const zuege: V2[][] = [];
  for (const s of nachbarn.keys()) {
    if (besucht.has(s)) continue;
    const zug: V2[] = [];
    let vorher = -1;
    let jetzt = s;
    while (!besucht.has(jetzt)) {
      besucht.add(jetzt);
      zug.push(punkt.get(jetzt)!);
      const weiter = (nachbarn.get(jetzt) ?? []).find((q) => q !== vorher && !besucht.has(q));
      if (weiter === undefined) break;
      vorher = jetzt;
      jetzt = weiter;
    }
    if (zug.length >= 3) zuege.push(zug);
  }
  return zuege.sort((a, b) => b.length - a.length);
}

/** Teile (4er-Nachbarschaft innen) und Löcher (8er-Nachbarschaft außen, ohne Verbindung zum Rand) eines Rasters. */
export function teileUndLoecher(innen: (j: number, k: number) => boolean, NY: number, NZ: number): { teile: number; loecher: number } {
  const lab = new Int32Array(NY * NZ).fill(-1);
  const stapel = new Int32Array(NY * NZ);
  let teile = 0;
  let loecher = 0;
  for (let i0 = 0; i0 < NY * NZ; i0++) {
    if (lab[i0]! >= 0) continue;
    const k0 = i0 % NZ;
    const j0 = (i0 - k0) / NZ;
    const art = innen(j0, k0);
    let kopf = 0;
    let ende = 0;
    stapel[ende++] = i0;
    lab[i0] = 1;
    let randBeruehrt = false;
    while (kopf < ende) {
      const i = stapel[kopf++]!;
      const k = i % NZ;
      const j = (i - k) / NZ;
      if (j === 0 || k === 0 || j === NY - 1 || k === NZ - 1) randBeruehrt = true;
      for (let dj = -1; dj <= 1; dj++) {
        for (let dk = -1; dk <= 1; dk++) {
          if (!dj && !dk) continue;
          if (art && dj && dk) continue; // innen: nur 4er-Nachbarn
          const nj = j + dj;
          const nk = k + dk;
          if (nj < 0 || nk < 0 || nj >= NY || nk >= NZ) continue;
          const ni = nj * NZ + nk;
          if (lab[ni]! >= 0 || innen(nj, nk) !== art) continue;
          lab[ni] = 1;
          stapel[ende++] = ni;
        }
      }
    }
    if (art) teile++;
    else if (!randBeruehrt) loecher++;
  }
  return { teile, loecher };
}

// ---------- Bau ----------

/** Gauß entlang der ersten Achse (Scheiben), Ränder geklemmt. */
function entlangXGlaetten(H: Float32Array, NX: number, n: number, sigma: number): Float32Array {
  const r = Math.max(1, Math.ceil(2.5 * sigma));
  const w: number[] = [];
  let summe = 0;
  for (let d = -r; d <= r; d++) {
    const g = Math.exp((-d * d) / (2 * sigma * sigma));
    w.push(g);
    summe += g;
  }
  for (let d = 0; d < w.length; d++) w[d] = w[d]! / summe;
  const out = new Float32Array(H.length);
  for (let i = 0; i < NX; i++) {
    const o = i * n;
    for (let d = -r; d <= r; d++) {
      const ii = Math.min(NX - 1, Math.max(0, i + d));
      const g = w[d + r]!;
      const oo = ii * n;
      for (let q = 0; q < n; q++) out[o + q] = out[o + q]! + g * H[oo + q]!;
    }
  }
  return out;
}

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Schnitt-Loft aus den drei Profilen und den Spanten des Dokuments. */
export function schnittLoft(dok: Dokument, optionen: Partial<SchnittOptionen> = {}): SchnittLoft {
  const opt = { ...SCHNITT_STANDARD, ...optionen };
  const t0 = jetzt();
  const k = kontextBauen(dok, opt);
  const t1 = jetzt();
  const { NX, NY, NZH, h } = k;
  const NZ = 2 * NZH - 1;
  const c = NZH - 1;
  const D = new Float32Array(NX * NY * NZ);
  const p = pufferAnlegen(k);
  let maxTeile = 0;
  // schmales Band: Werte über ±6 Rasterpunkte zählen nicht mehr für die Lage der Fläche (Spitzen, leere Scheiben)
  const band = 6 * h;
  const klemme = (v: number) => (v > band ? band : v < -band ? -band : v);
  // 1. je Scheibe: sichtbare Hülle (B) und was die Rundung davon wegschneidet (K = gerundet − Hülle ≥ 0), Halbraster
  const B = new Float32Array(NX * NY * NZH);
  const K = new Float32Array(NX * NY * NZH);
  for (let i = 0; i < NX; i++) {
    const s = scheibeBerechnen(k, k.x0 + i * h, p, i);
    const o = i * NY * NZH;
    for (let q = 0; q < NY * NZH; q++) {
      const huelle = klemme(p.dH[q]!);
      B[o + q] = huelle;
      K[o + q] = Math.max(0, klemme(s.feld[q]!) - huelle);
    }
    if (i % 4 === 0) {
      const tl = teileUndLoecher((j, q) => s.innen[j * NZH + Math.abs(q - c)] === 1, NY, NZ).teile;
      maxTeile = Math.max(maxTeile, tl);
    }
  }
  // 2. Rundung entlang x glätten (Übergänge, wo Teile zusammenwachsen oder sich trennen). Die geglättete Rundung darf nur
  //    mehr wegschneiden, nie weniger: Sonst ragte der Körper leicht über die Hülle, und die exakten Grenzen erzeugten
  //    Knicke (Falten auf der Kugel). An einem Sprung entsteht so ein Übergang auf der Seite mit weniger Rundung.
  let Kg: Float32Array = K;
  if (opt.weich > 0) {
    const Ks = entlangXGlaetten(K, NX, NY * NZH, opt.weich);
    for (let q = 0; q < K.length; q++) Ks[q] = Math.max(K[q]!, Ks[q]!);
    Kg = Ks;
  }
  // 3. Hülle + Rundung, begrenzt durch die exakten 2D-Abstände zu Seite und Top, gespiegelt ins volle Raster
  for (let i = 0; i < NX; i++) {
    const o = i * NY * NZH;
    const oD = i * NY * NZ;
    for (let j = 0; j < NY; j++) {
      const sj = k.seite2[i * NY + j]!;
      for (let q = 0; q < NZH; q++) {
        const w = klemme(Math.max(B[o + j * NZH + q]! + Kg[o + j * NZH + q]!, sj, k.top2[i * NZH + q]!));
        D[oD + j * NZ + c + q] = w;
        D[oD + j * NZ + c - q] = w;
      }
    }
  }
  const t2 = jetzt();
  const roh = surfaceNets(D, NX, NY, NZ, k.x0, k.y0, -c * h, h);
  const t3 = jetzt();
  taubin(roh, opt.glaetten);
  const netz = netzAusgeben(roh);
  const t4 = jetzt();

  const schnittBei = (f: number): SchnittUmriss => {
    const pp = pufferAnlegen(k);
    const s = scheibeBerechnen(k, k.xMin + f * (k.xMax - k.xMin), pp);
    const voll = vollesRaster(k, s);
    const umrisse = umrisseAus(voll.feld, voll.NZ, NY, -c * h, k.y0, h);
    const { teile, loecher } = teileUndLoecher((j, q) => voll.feld[j * voll.NZ + q]! < 0, NY, voll.NZ);
    return { umrisse, teile, loecher };
  };

  return {
    ...netz,
    xMin: k.xMin,
    xMax: k.xMax,
    schnittBei,
    info: {
      millisekunden: t4 - t0,
      zeiten: { vorlagen: t1 - t0, feld: t2 - t1, netz: t3 - t2, glaetten: t4 - t3 },
      gitter: [NX, NY, NZ],
      h,
      punkte: roh.anzahl,
      dreiecke: netz.indizes.length / 3,
      maxTeile,
    },
  };
}
