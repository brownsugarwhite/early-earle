// Wesen-Editor 2, Phase 1 / M1 (14.10.2026): der Wesen-Bau als DOM-freie Funktion.
//
// Was in Phase 0 im Editor (`apps/editor/src/kern/kernBau.ts`) zusammengewachsen war, liegt hier als reine Rechnung:
// ein Dokument (Profile, Spanten) und ein **Bauplan** (nur Daten: Maul, Beine, Stil, Augen, Gesicht, Zonen …) ergeben ein
// **Wesen-Netz** (Dreiecke mit Normalen, Deskriptoren und Atlas-Koordinaten je Ecke, Ruhelage, Augen, Gesicht, Zähne,
// Käfiglinien). Dieselbe Funktion läuft im Worker des Editors (Plan 4.4 „Worker ab Tag 1“) und später im Spiel-Export.
// Der `WesenStand` hält die Ableitung und den Klingenstand zwischen zwei Bauten (Pose statt Umbau, Wehen je Bild).

import type { V2 } from '../bezier';
import type { Ausstattung, Dokument, GefroreneStationen, ZonenVorlage } from '../dokument';
import { alleFlaechen } from '../kaefig/halbkanten';
import { type V3, zuDreiecken } from '../versuch/catmullClark';
import { type AbleitOptionen, type Ableitung, ableiten, seiteZiehen, umrissDicht } from './ableiten';
import { type AtlasKachelung, type ZonenForm, atlasEcken, kachelung, punktAtlas, zonenRastern } from './atlas';
import { DESKRIPTOR_FLOATS, deskriptoren } from './deskriptoren';
import { kastenSpanten } from './kasten';
import { ringSegmente } from './reifen';
import { blattAbweichungen } from './abweichung';
import { deltasAddieren, deltasAnwenden, spiegelIndex } from './pinsel';
import { anwenden3 } from '../subdivision/matrix';
import { spantKasten, spantTeilProfil, vorlageBei } from '../spanten';
import { kieferSchnitt } from './kieferSpant';
import { KLINGE_BUESCHEL, KLINGE_FLAMME, KLINGE_SCHWADE, type Haut, type KlingenLage, type KlingenVorlage, ZUNGEN_FEUER, ZUNGEN_GAS, bueschelAufHaut, flaemmchen, gekaemmt, hautAus, hautPunkt, klingenBauen, klingenNetz, klingenVorlage, zungenAmScheitel } from './klinge';
import { MAUL_POSE_OPTIONEN, MAUL_STANDARD, type MaulAbweichung, type MaulErgebnis, type MaulLinie, type MaulOptionen, ableitenMitMaul, kieferFlaechen, kieferGewichteSetzen, maulAbweichung, maulLinieVorlage, maulOptionenVorlage, maulPose, zahnLagen } from './maul';
import { type BeinErgebnis, ableitenMitBeinen, beinPose } from './teil';

export type StilArt = 'fest' | 'feuer' | 'gas' | 'fell';
export type MaulArt = 'aus' | 'vorn' | 'unten' | 'hals';
export type BeinArt = 'aus' | 'verschmolzen' | 'angesteckt';

/** Gemaltes Auge: Lage und Normale auf der Haut, Größe (Welt). */
export type Auge = { pos: V3; normale: V3; groesse: number };

/** Gesicht fürs Earle-Material: Dreiecksnase (Mitte, Oben, Rechts, Radius, Höhe) und Scharte A → B mit Breite; Welt/Ruhelage. */
export type Gesicht = { nase: V3; oben: V3; rechts: V3; radius: number; hoehe: number; philtrumA: V3; philtrumB: V3; breite: number };

/** Zonen-Atlas: Kachelkoordinaten je Dreiecksecke, Abstand- und Weichheitsfeld (RGBA je Texel). */
export type AtlasDaten = { ecken: Float32Array; abstand: Float32Array; weich: Float32Array; breite: number; hoehe: number };

/**
 * Zone als Vektorform, **relativ zu den Ruhe-Grenzen** des Körpers: x 0 = vorderste Stelle … 1 = hinterste (Seite/Top),
 * y 0 = Boden … 1 = Scheitel, Weichheit als Anteil der Höhe (Typ in `dokument.ts`). So bleibt der Bauplan reine Daten.
 */
export type { ZonenVorlage } from '../dokument';

/**
 * Bauplan: alles, was das Netz außer dem Dokument bestimmt — die **Ausstattung** des Dokuments (Version 1: Maul, Beine,
 * Stil, Kasten, Augen, Gesicht, Zonen; Absicht) plus **Anzeige** (Öffnung, Schwung, Look, Käfiglinien, Atlas an). Nur Daten
 * (Structured Clone), damit der Worker ihn bekommt.
 */
export type Bauplan = Ausstattung & {
  /** Maul-Lage (Ausstattung oder Chip), Öffnung 0 … 1 (Pose) */
  maul: MaulArt;
  oeffnung: number;
  /** Beine (Ausstattung oder Chip), Schwung in Grad (Pose) */
  beine: BeinArt;
  schwung: number;
  /** Stil (Ausstattung oder Chip) */
  stil: StilArt;
  /** Earle-Look: Deskriptoren, Augen, Atlas, Gesicht, Wangen; ohne Look nur Dreiecke */
  earle: boolean;
  /** Käfigkanten als Liniensegmente (Röntgen) */
  kaefigLinien: boolean;
  /** Zonen-Atlas an (Standard) oder prozedurale Zonen */
  atlas?: boolean;
  /** führende Kurve („Formen folgen“): die zuletzt bearbeitete Kurve bestimmt die Breite allein, die anderen folgen dem Körper */
  fuehrend?: 'seite' | 'front' | 'top';
  /** Trefferdaten fürs Picking (M2): Dreieck → feine Fläche → Käfigfläche und (u, v), Käfigpunkte; Standard an */
  treffer?: boolean;
  /** Unterkiefergewichte als Farbe je Ecke (Fressen-Tab, Plan 5.2): blau 0 … rot 1 */
  gewichteZeigen?: boolean;
  /**
   * Weitere Pose (Plan 5.2 „Brüllen, Schlafen, Lauf-Extrem funktionieren identisch“; Posenliste, Phase 2 M3): ihre
   * Käfig-Deltas `kaefig.posen[name]` werden mit `staerke` (0 … 1) überblendet — wie die Fressen-Deltas mit der Öffnung,
   * ohne Umbau. Fressen selbst läuft weiter über `oeffnung`.
   */
  pose?: { name: string; staerke: number };
};

/** Trefferdaten (M2): je Körperdreieck die feine Fläche (−1 für angesetzte Teile), je feiner Fläche Käfigfläche und Ecken-(u, v), der posierte Käfig. */
export type TrefferDaten = {
  dreieckFlaeche: Int32Array;
  flaecheVon: Int32Array;
  eckenUV: Float32Array;
  eckenZahl: Uint8Array;
  kaefig: { n: number; xyz: Float32Array; fStart: Uint32Array; fVerts: Uint32Array };
  /** Vorlage (Röhre): Ringpunkt i·N + j für Indizes < R·N, Kappen bis n, danach Maul-/Beinpunkte */
  vorlage: { R: number; N: number; n: number };
};

export const BAUPLAN_STANDARD: Bauplan = { maul: 'aus', oeffnung: 0, beine: 'aus', schwung: 0, stil: 'fest', earle: true, kaefigLinien: false };

export type WesenInfo = {
  kaefigPunkte: number;
  feinPunkte: number;
  /** Naht → Kurve, max und Mittel (px bei 461 px je Kachel) */
  nahtMax: number;
  nahtMittel: number;
  /** Zeiten (ms) */
  ableitung: number;
  zug: number;
  ecken: number;
  schnell: boolean;
  /** Abweichung Körper ↔ Kurve je Blatt (px bei 461 px je Kachel; Plan „Zeichnung ist Form“, Schritt 4), nach echter Ableitung */
  blatt?: Record<'seite' | 'front' | 'top', { max: number; mittel: number }>;
  /** wirksame Stationen (Schritt 3): das Dokument friert sie ein, danach wird nur noch nachgezogen */
  stationen?: GefroreneStationen;
  /** Abweichung der Lippenketten von den Linien (Phase 2 M2, px): rote Oberlippe, blaue Unterkieferkante; `versatz` = versetzter Kiefer */
  maul?: MaulAbweichung;
};

/** Reifen (M3): Ringe der gezeichneten Spanten auf dem Körper, mit Perlen an den Spant-Knoten. */
export type ReifenDaten = {
  /** je Reifen: Index in `dok.spanten` und Käfigring */
  liste: { spant: number; ring: number }[];
  /** posierte Lagen aller R·N Ringpunkte (feine Punktpunkte, 3 je Punkt; Index i·N + j) */
  ringLagen: Float32Array;
  /** Verlauf der Reifen auf der Fläche als Liniensegmente (Paare, 3 Floats je Punkt); Start je Reifen in `verlaufStart` (Float-Index, Länge liste + 1) */
  verlauf: Float32Array;
  verlaufStart: Uint32Array;
  /** je Reifen die Ringpunkte j (0 oben … N/2 unten) der Spant-Knoten in Knotenreihenfolge (−1: Knoten liegt beim Kiefer-Spant im Unterkiefer) */
  knoten: number[][];
  /** Kiefer-Spant (14.10.): je Reifen die Ringpunkte der Unterkiefer-Knoten (`unten`, −1: im Oberkiefer); leer ohne Teilung */
  knotenUnten: number[][];
};

export type WesenNetz = {
  positionen: Float32Array;
  normalen: Float32Array;
  /** 16 Deskriptor-Floats je Ecke (nur mit Earle-Look) */
  deskriptoren: Float32Array | null;
  hoehe: number;
  augen: Auge[];
  /** Käfigkanten als Liniensegmente (Röntgen), sonst null */
  kaefigLinien: Float32Array | null;
  kaefigFarben: Float32Array | null;
  /** Lippenband-Breite (Welt) bei Maul, sonst 0 */
  lippenBand: number;
  stil: StilArt;
  /** Körpermitte (Schwerpunkt) fürs Feuer/Gas-Material */
  mitte: V3;
  /** Ruhelage je Ecke (unposiert) bei Posen, sonst null */
  ruhe: Float32Array | null;
  gesicht: Gesicht | null;
  zaehne: { positionen: Float32Array; normalen: Float32Array; anteil: Float32Array } | null;
  atlas: AtlasDaten | null;
  treffer: TrefferDaten | null;
  reifen: ReifenDaten | null;
  /**
   * Kieferknopf (M3): rechter Mundwinkel (posiert) und Maullänge (Welt) bei Maul, sonst null. `rig` (Plan 5.2) für die
   * Griffe im Fressen-Tab: Gelenk und Mundwinkel in Ruhe (Seitenansicht, mit Hebung), Schnauzenrichtung (`vorn` = Vorzeichen
   * längs x), die wirksamen Gelenk-Optionen und ob die Gewichte nach Winkel laufen.
   */
  maul: {
    winkel: V3;
    laenge: number;
    rig: { gelenk: V2; mundwinkel: V2; vorn: number; gelenkVersatz: [number, number]; kieferWinkel: [number, number]; kieferReichweite: [number, number]; winkel: boolean };
    /**
     * Knochen der Fressen-Pose in Ruhe (Seitenansicht, mit Hebung): Unterkiefer vom Gelenk zur Unterlippe vorn, Schädel
     * vom Schädelgelenk zur Oberlippe vorn; dazu die Pose bei Öffnung 1 (Winkel in Grad, Zug in Maullängen) und die Art.
     */
    knochen: { kieferSpitze: V2; schaedel: V2; schaedelSpitze: V2; winkelUnten: number; winkelOben: number; zug: [number, number]; kippen: boolean };
  } | null;
  /** Unterkiefergewichte als Farbe je Ecke (`Bauplan.gewichteZeigen`), sonst null */
  gewichtFarben: Float32Array | null;
  /** Saum je Blatt (Schritt 4): Silhouettenpunkte des Körpers (x, y, d px), (NaN, NaN, 0) trennt Züge; wird kopiert, nicht übertragen */
  saum: Record<'seite' | 'front' | 'top', Float32Array> | null;
  /** Front/Top: Umweg der schwarzen Linie über einen breiteren Kiefer (Paare x, y; NaN trennt), sonst fehlt das Blatt */
  umweg: { front?: Float32Array; top?: Float32Array } | null;
  info: WesenInfo;
};

/** Zwischenstand für den nächsten Bau: Ableitung (Pose statt Umbau) und Klingenstand (Wehen je Bild). */
export type WesenStand = {
  dok: Dokument;
  /** Wert-Schlüssel von Profilen, Spanten, Maßstab und Bauplan-Form (Worker-Nachrichten sind Kopien, Identität trägt nicht) */
  schluessel: string;
  abl: Ableitung;
  maul: MaulArt;
  beine: BeinArt;
  klingen: KlingenStand | null;
  /** letzte Blatt-Abweichung (Schritt 4), während Gesten weiterverwendet */
  saum?: WesenNetz['saum'];
  umweg?: WesenNetz['umweg'];
  blatt?: WesenInfo['blatt'];
};

const PX = 461;
const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

// ---------- Prüfwesen ----------

/** Tiger (Bild 9): Bauchfeld hart mit welliger Kante, Rückenfeld weich auslaufend, Latz an der Brust oben hart, unten weich. */
export function tigerZonen(): ZonenVorlage[] {
  const welle: { x: number; y: number; weich: number }[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    welle.push({ x: 1.2 + (-0.2 - 1.2) * t, y: 0.4 + 0.03 * Math.sin(t * Math.PI * 5), weich: 0.004 });
  }
  const bauch: ZonenVorlage = { ansicht: 'seite', punkte: [{ x: -0.2, y: -0.2, weich: 0.004 }, { x: 1.2, y: -0.2, weich: 0.004 }, ...welle] };
  const ruecken: ZonenVorlage = { ansicht: 'seite', punkte: [{ x: -0.2, y: 0.62, weich: 0.12 }, { x: 1.2, y: 0.62, weich: 0.12 }, { x: 1.2, y: 1.2, weich: 0.12 }, { x: -0.2, y: 1.2, weich: 0.12 }] };
  const latz: ZonenVorlage = {
    ansicht: 'seite',
    punkte: [
      { x: -0.05, y: 0.5, weich: 0.005 },
      { x: 0.34, y: 0.5, weich: 0.005 },
      { x: 0.44, y: 0.26, weich: 0.05 },
      { x: 0.3, y: -0.05, weich: 0.09 },
      { x: -0.05, y: -0.05, weich: 0.09 },
    ],
  };
  return [bauch, ruecken, latz];
}

/** Ausstattung je Prüfwesen (Phase 0): der Tiger bekommt Kastenschnauze, Maullinie, Gesicht, Wangen, Zonen; für Dokumente ohne Ausstattung. */
export function pruefwesenBauplan(name: string): Ausstattung {
  if (name === 'rex') {
    // Kiefer getrennt mit Überbiss (Phase 2 M2, Florians Bogen 06-rex-mit-maul): die Oberlippe (rot) beginnt auf der
    // Kontur am Kinn (f 0,039, ≈ 15 % der Maullänge hinter der Schnauzenspitze — Florian 15.10.: „Unterkiefer viel kürzer,
    // die Oberlippe steht über“), die Unterkieferkante (blau) liegt darüber und läuft innen; am Winkel treffen sich beide
    // (v ist der Anteil der örtlichen Sprosse: an der dünnen Schnauze braucht 2,5 % der Körperhöhe v + 0,17)
    return {
      maulLinie: {
        fv: [{ f: 0.039, v: 0 }, { f: 0.07, v: 0.4 }, { f: 0.12, v: 0.46 }, { f: 0.2, v: 0.42 }, { f: 0.337, v: 0.45 }],
        unterSpitze: 1,
        anfang: { x: -0.3394, y: 0.2766 },
        winkel: { x: -0.13, y: 0.19 },
        // blaue Kante: höher als die rote (Seite) und innen (Front: `innen` = Anteil der halben Breite)
        // Unterkieferkante mit eigenem Anfang (f 0,09, hinter dem roten Anfang 0,039): der Oberkiefer ist deutlich länger,
        // vorn sind die Lippen getrennt, von unten sieht man die Tasche des Oberkiefers (Florians Vorlage 06-rex-mit-maul)
        unten: [{ f: 0.09, v: 0.47, innen: 0.15 }, { f: 0.13, v: 0.58, innen: 0.2 }, { f: 0.2, v: 0.55, innen: 0.2 }, { f: 0.28, v: 0.5, innen: 0.15 }, { f: 0.337, v: 0.45, innen: 0 }],
      },
      maulOptionen: { reihen: 3 },
    };
  }
  if (name === 'tiger') {
    return {
      kasten: { fVorn: 0.02, fHinten: 0.15, fRund: 0.25, haerte: 0.85 },
      // Mercedesstern (Florian 15.10.): die Maularme laufen von der Plattenmitte schräg nach außen-unten, der Mundwinkel
      // sitzt gleich hinter der Frontplatte (Ring 2 bei 6 % der Länge; weiter vorn trägt die heutige Topologie nicht,
      // siehe Kritik-Register). Flachere Rille, zwei Taschenreihen und flachere Tasche halten das kurze Maul sauber.
      // Plattenmaul (Phase 2 M1): Mundwinkel auf der Platte (|z| 0,035, Höhe 0,323), Arme von der Mitte (0,358) nach außen-unten;
      // Rachen und Scharnier nach der Plattenregel an Ring 4 (8 % der Länge). Unterkiefer 20° über den Knochen (mehr öffnet die Fressen-Pose), Band 3 Ringe,
      // dünne Linse und tiefe Tasche (sonst Durchdringungen im kleinen Plattenmaul)
      maulLinie: { fv: [{ f: 0, v: 0.5 }, { f: 0.01, v: 0.35 }], unterSpitze: 0, winkel: { x: -0.376, y: 0.323 }, winkelZ: 0.035, front: [{ z: 0, y: 0.358 }, { z: 0.018, y: 0.35 }, { z: 0.035, y: 0.323 }] },
      // großer runder Haps (M3): aus dem kleinen Stern wird offen ein großes rundes Maul (Referenz „vier Mäuler“)
      maulOptionen: { winkelUnten: 20, winkelOben: 26, band: 3, rille: 0.006, reihen: 2, tiefe: 0.7, linse: 0.015, haps: 1 },
      // 24 Punkte je Ring (Plattenmaul, Phase 2 M1): 6×6-Plattengitter, der Stern bekommt echte Arme; Auge bei 60°
      ring: 24,
      augen: { ring: 4, j: 4, groesse: 0.1 },
      gesicht: true,
      wangen: true,
      gesichtMaske: { voll: 2, aus: 6, oben: 0.75 },
      lippenBand: 0.009,
      zonen: tigerZonen(),
    };
  }
  return {};
}

// ---------- Helfer ----------

function gleicheTopologie(a: Dokument, b: Dokument): boolean {
  return a.profile.seite.knoten.length === b.profile.seite.knoten.length && a.profile.front === b.profile.front && a.profile.top === b.profile.top && a.skalierung === b.skalierung;
}

function nahtAbweichung(abl: Ableitung, dok: Dokument): { max: number; mittel: number } {
  const u = umrissDicht(dok);
  let max = 0;
  let summe = 0;
  const n = abl.naht.fein.length;
  for (let k = 0; k < n; k++) {
    const i = abl.naht.fein[k]!;
    const p: V2 = { x: abl.fein[3 * i]!, y: abl.fein[3 * i + 1]! };
    let best = Infinity;
    const m = u.pts.length;
    for (let s = 0; s < m; s++) {
      const a = u.pts[s]!;
      const b = u.pts[(s + 1) % m]!;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const l2 = abx * abx + aby * aby;
      const f = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
      const d = Math.hypot(a.x + abx * f - p.x, a.y + aby * f - p.y);
      if (d < best) best = d;
    }
    max = Math.max(max, best);
    summe += best;
  }
  return { max: max * PX, mittel: n ? (summe / n) * PX : 0 };
}

const verketten = (a: Float32Array, b: Float32Array): Float32Array => {
  const c = new Float32Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
};

/** Deskriptoren je feinem Punkt → je Dreiecksecke in der Reihenfolge von `zuDreiecken` (Fächer je Fläche). */
function jeEcke(d: Float32Array, flaechen: number[][]): Float32Array {
  let ecken = 0;
  for (const f of flaechen) ecken += 3 * Math.max(0, f.length - 2);
  const out = new Float32Array(ecken * DESKRIPTOR_FLOATS);
  let o = 0;
  for (const f of flaechen) {
    for (let i = 1; i < f.length - 1; i++) {
      for (const v of [f[0]!, f[i]!, f[i + 1]!]) {
        out.set(d.subarray(v * DESKRIPTOR_FLOATS, (v + 1) * DESKRIPTOR_FLOATS), o);
        o += DESKRIPTOR_FLOATS;
      }
    }
  }
  return out;
}

/** Gewichtsfarbe wie in Blenders Weight Paint: blau 0 → türkis → grün → gelb → rot 1. */
function gewichtFarbe(w: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, w));
  const stufen: [number, number, number][] = [[0.1, 0.2, 0.95], [0.1, 0.8, 0.9], [0.2, 0.85, 0.3], [0.95, 0.85, 0.15], [0.95, 0.2, 0.15]];
  const x = t * (stufen.length - 1);
  const i = Math.min(stufen.length - 2, Math.floor(x));
  const u = x - i;
  const a = stufen[i]!;
  const b = stufen[i + 1]!;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

/** Unterkiefergewicht je feinem Punkt (Grenzmatrix × Käfiggewichte) → Farbe je Dreiecksecke; angesteckte Teile grau. */
function gewichteJeEcke(abl: MaulErgebnis, flaechen: number[][], extraEcken: number): Float32Array {
  const G = abl.unterteilung.grenze;
  const nF = G.start.length - 1;
  const w = new Float32Array(nF);
  for (let i = 0; i < nF; i++) {
    let s = 0;
    for (let q = G.start[i]!; q < G.start[i + 1]!; q++) s += G.wert[q]! * abl.maul.gewichtUnten[G.index[q]!]!;
    w[i] = s;
  }
  let ecken = 0;
  for (const f of flaechen) ecken += 3 * Math.max(0, f.length - 2);
  const out = new Float32Array(3 * (ecken + extraEcken)).fill(0.6);
  let o = 0;
  for (const f of flaechen) {
    for (let i = 1; i < f.length - 1; i++) {
      for (const v of [f[0]!, f[i]!, f[i + 1]!]) {
        const c = gewichtFarbe(w[v]!);
        out[o] = c[0];
        out[o + 1] = c[1];
        out[o + 2] = c[2];
        o += 3;
      }
    }
  }
  return out;
}

/** Käfigkanten (Lagen `xyz`) als Segmente; Lippen und Tasche in Farbe. */
function kaefigSegmente(abl: Ableitung, xyz: Float64Array): { punkte: Float32Array; farben: Float32Array } {
  const k = abl.kaefig;
  const punkte = new Float32Array(6 * k.nE);
  const farben = new Float32Array(6 * k.nE);
  const art = (abl as Partial<MaulErgebnis>).maul?.art ?? null;
  for (let e = 0; e < k.nE; e++) {
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    punkte.set([xyz[3 * a]!, xyz[3 * a + 1]!, xyz[3 * a + 2]!, xyz[3 * b]!, xyz[3 * b + 1]!, xyz[3 * b + 2]!], 6 * e);
    const aa = art ? art[a]! : 0;
    const ab = art ? art[b]! : 0;
    const farbe = k.eSchaerfe[e]! > 0 ? [0.1, 0.1, 0.1] : aa >= 3 || ab >= 3 ? [0.75, 0.2, 0.3] : aa > 0 && ab > 0 ? [0.95, 0.4, 0.1] : [0.5, 0.52, 0.55];
    farben.set([...farbe, ...farbe], 6 * e);
  }
  return { punkte, farben };
}

/** Ein gemaltes Schlitzauge rechts am Kopf am Vorlagen-Ringpunkt, gespiegelt links; Größe als Anteil der Höhe. */
function augenAm(abl: Ableitung, hoehe: number, wahl: { ring: number; j: number; groesse: number }): Auge[] {
  const v = abl.vorlage;
  const i = Math.min(wahl.ring, v.R - 1);
  const j = Math.max(1, Math.min(v.N / 2 - 1, wahl.j));
  const p = v.ringPunkt(i, j);
  const f = abl.fein;
  let mx = 0;
  let my = 0;
  let mz = 0;
  for (let k = 0; k < v.N; k++) {
    const r = v.ringPunkt(i, k);
    mx += f[3 * r]!;
    my += f[3 * r + 1]!;
    mz += f[3 * r + 2]!;
  }
  mx /= v.N;
  my /= v.N;
  mz /= v.N;
  const pos: V3 = [f[3 * p]!, f[3 * p + 1]!, f[3 * p + 2]!];
  const n: V3 = [pos[0] - mx, pos[1] - my, pos[2] - mz];
  const l = Math.hypot(...n) || 1;
  const normale: V3 = [n[0] / l, n[1] / l, n[2] / l];
  const groesse = wahl.groesse * hoehe;
  return [
    { pos, normale, groesse },
    { pos: [pos[0], pos[1], -pos[2]], normale: [normale[0], normale[1], -normale[2]], groesse },
  ];
}

// ---------- Klingen ----------

const vorlagen = new Map<string, KlingenVorlage>();
/** Klingenvorlagen werden je Form einmal gebaut (Matrix und Löser). */
function vorlageFuer(form: Parameters<typeof klingenVorlage>[0]): KlingenVorlage {
  const key = JSON.stringify(form);
  let v = vorlagen.get(key);
  if (!v) {
    v = klingenVorlage(form);
    vorlagen.set(key, v);
  }
  return v;
}

/** Klingen (ohne Wehen) als Dreiecke mit Deskriptoren und Atlas-Koordinaten je Ecke aus dem Fußpunkt, Höhenanteil je Ecke. */
function klingenStatisch(kv: KlingenVorlage, lagen: readonly KlingenLage[], feinDesk: Float32Array | null, punktAtl: Float32Array | null = null): { positionen: Float32Array; normalen: Float32Array; desk: Float32Array | null; anteil: Float32Array; atlas: Float32Array | null } {
  const klingen = klingenBauen(kv, lagen);
  const fl = alleFlaechen(klingenNetz(kv));
  const teile: { positionen: Float32Array; normalen: Float32Array; lage: KlingenLage }[] = [];
  for (const k of klingen) {
    const pts: V3[] = [];
    for (let i = 0; i < k.fein.length / 3; i++) pts.push([k.fein[3 * i]!, k.fein[3 * i + 1]!, k.fein[3 * i + 2]!]);
    teile.push({ ...zuDreiecken({ punkte: pts, flaechen: fl, schaerfe: new Map() }, 60), lage: k.lage });
  }
  const n = teile.reduce((a, b) => a + b.positionen.length, 0);
  const positionen = new Float32Array(n);
  const normalen = new Float32Array(n);
  const anteil = new Float32Array(n / 3);
  const desk = feinDesk ? new Float32Array((n / 3) * DESKRIPTOR_FLOATS) : null;
  const atlas = punktAtl ? new Float32Array((n / 3) * 2) : null;
  let o = 0;
  for (const t of teile) {
    positionen.set(t.positionen, o);
    normalen.set(t.normalen, o);
    const l = t.lage;
    if (atlas && punktAtl) {
      const b = Math.min(punktAtl.length / 2 - 1, l.basis ?? 0);
      for (let e = 0; e < t.positionen.length / 3; e++) atlas.set(punktAtl.subarray(2 * b, 2 * b + 2), (o / 3 + e) * 2);
    }
    for (let e = 0; e < t.positionen.length / 3; e++) {
      const dx = t.positionen[3 * e]! - l.fuss[0];
      const dy = t.positionen[3 * e + 1]! - l.fuss[1];
      const dz = t.positionen[3 * e + 2]! - l.fuss[2];
      const th = Math.min(1, Math.max(0, (dx * l.achse[0] + dy * l.achse[1] + dz * l.achse[2]) / Math.max(1e-6, l.laenge)));
      anteil[o / 3 + e] = th;
      if (desk && feinDesk) {
        const b = Math.min(feinDesk.length / DESKRIPTOR_FLOATS - 1, l.basis ?? 0);
        const o2 = (o / 3 + e) * DESKRIPTOR_FLOATS;
        desk.set(feinDesk.subarray(b * DESKRIPTOR_FLOATS, (b + 1) * DESKRIPTOR_FLOATS), o2);
        desk[o2 + 8] = 0.6 * (1 - th) * (1 - th);
      }
    }
    o += t.positionen.length;
  }
  return { positionen, normalen, desk, anteil, atlas };
}

/** Wangenbüschel (Kranz um die untere Gesichtshälfte) als Zacken; Schnauze zeigt nach −x. */
function wangen(haut: Haut, hoehe: number): KlingenLage[] {
  const lagen: KlingenLage[] = [];
  const pol = (56 * Math.PI) / 180;
  for (let i = 0; i < 14; i++) {
    const phi = ((95 + (170 * i) / 13) * Math.PI) / 180;
    const r: V3 = [-Math.cos(pol), Math.sin(pol) * Math.cos(phi), Math.sin(pol) * Math.sin(phi)];
    const hp = hautPunkt(haut, r);
    const achse = gekaemmt([hp.n[0] * 0.5 + 0.5, hp.n[1] * 0.5 - 0.15, hp.n[2] * 0.5], 0);
    const quer: V3 = [0, 1, 0];
    const g = 0.11 * hoehe;
    lagen.push({ fuss: hp.p, achse, quer, laenge: g, breite: 0.5 * g, phase: 0, basis: hp.i });
  }
  return lagen;
}

/** Ohren: zwei runde Tropfen oben seitlich am Kopf, leicht nach außen gekämmt. */
function ohren(haut: Haut, hoehe: number): KlingenLage[] {
  const lagen: KlingenLage[] = [];
  for (const seite of [1, -1]) {
    const r: V3 = [-0.2, 0.8, 0.6 * seite];
    const hp = hautPunkt(haut, r);
    const g = 0.12 * hoehe;
    lagen.push({ fuss: hp.p, achse: gekaemmt(hp.n, 0.5), quer: [1, 0, 0], laenge: g, breite: 1.1 * g, phase: 0, basis: hp.i });
  }
  return lagen;
}

/** Klingenstand für die Animation (Wehen als Käfig-Pose je Bild). */
export type KlingenStand = {
  stil: StilArt;
  vorlage: KlingenVorlage;
  lagen: KlingenLage[];
  zusatzVorlage: KlingenVorlage | null;
  haut: Haut;
  hoehe: number;
  saat: number;
  /** Körper-Dreiecke (statisch) und Deskriptoren je Ecke */
  koerper: { positionen: Float32Array; normalen: Float32Array; desk: Float32Array | null; feinDesk: Float32Array | null };
  hebung: number;
};

/** Klingen (und Flämmchen) für Zeit t: Dreiecke aller Klingen hintereinander, Deskriptoren je Ecke (Fell). */
function klingenDreiecke(st: KlingenStand, zeit: number): { positionen: Float32Array; normalen: Float32Array; desk: Float32Array | null } {
  const amp = st.stil === 'feuer' ? 0.32 : st.stil === 'gas' ? 0.22 : 0.07;
  const om = st.stil === 'feuer' ? 2.6 : st.stil === 'gas' ? 1.1 : 1.6;
  const klingen = klingenBauen(st.vorlage, st.lagen, (l) => amp * Math.sin(om * zeit + l.phase) + 0.3 * amp * Math.sin(1.9 * om * zeit + 2 * l.phase));
  const fl = alleFlaechen(klingenNetz(st.vorlage));
  const teile: { positionen: Float32Array; normalen: Float32Array; basis: number | undefined; lage: KlingenLage }[] = [];
  for (const k of klingen) {
    const pts: V3[] = [];
    for (let i = 0; i < k.fein.length / 3; i++) pts.push([k.fein[3 * i]!, k.fein[3 * i + 1]!, k.fein[3 * i + 2]!]);
    const t = zuDreiecken({ punkte: pts, flaechen: fl, schaerfe: new Map() }, 60);
    teile.push({ ...t, basis: k.lage.basis, lage: k.lage });
  }
  if (st.zusatzVorlage) {
    // abgelöste Flämmchen/Bläschen: steigen in 3 s auf und schrumpfen
    const umlauf = (zeit / 3) % 1;
    const lagen = flaemmchen(st.haut, st.hoehe, st.stil === 'gas' ? 6 : 4, st.saat + 5, umlauf);
    const fz = klingenBauen(st.zusatzVorlage, lagen, (l) => 0.2 * Math.sin(3 * zeit + l.phase));
    const nz = alleFlaechen(klingenNetz(st.zusatzVorlage));
    for (const k of fz) {
      const pts: V3[] = [];
      for (let i = 0; i < k.fein.length / 3; i++) pts.push([k.fein[3 * i]!, k.fein[3 * i + 1]!, k.fein[3 * i + 2]!]);
      const t = zuDreiecken({ punkte: pts, flaechen: nz, schaerfe: new Map() }, 60);
      teile.push({ ...t, basis: k.lage.basis, lage: k.lage });
    }
  }
  const n = teile.reduce((a, b) => a + b.positionen.length, 0);
  const positionen = new Float32Array(n);
  const normalen = new Float32Array(n);
  const desk = st.koerper.feinDesk ? new Float32Array((n / 3) * DESKRIPTOR_FLOATS) : null;
  let o = 0;
  for (const t of teile) {
    positionen.set(t.positionen, o);
    normalen.set(t.normalen, o);
    if (st.stil === 'fell' && t.basis !== undefined) {
      // weiches Fell: Normalen der Büschel zu 65 % zur Hautnormale am Fuß (Licht läuft über den Pelz statt über jeden Zapfen)
      const b = Math.min(st.haut.normalen.length / 3 - 1, t.basis);
      const nx = st.haut.normalen[3 * b]!;
      const ny = st.haut.normalen[3 * b + 1]!;
      const nz = st.haut.normalen[3 * b + 2]!;
      for (let e = 0; e < t.normalen.length / 3; e++) {
        const i = o + 3 * e;
        const mx = normalen[i]! * 0.35 + nx * 0.65;
        const my = normalen[i + 1]! * 0.35 + ny * 0.65;
        const mz = normalen[i + 2]! * 0.35 + nz * 0.65;
        const l = Math.hypot(mx, my, mz) || 1;
        normalen[i] = mx / l;
        normalen[i + 1] = my / l;
        normalen[i + 2] = mz / l;
      }
    }
    if (desk && st.koerper.feinDesk) {
      const b = Math.min(st.koerper.feinDesk.length / DESKRIPTOR_FLOATS - 1, t.basis ?? 0);
      const zeile = st.koerper.feinDesk.subarray(b * DESKRIPTOR_FLOATS, (b + 1) * DESKRIPTOR_FLOATS);
      const l = t.lage;
      for (let e = 0; e < t.positionen.length / 3; e++) {
        const o2 = (o / 3 + e) * DESKRIPTOR_FLOATS;
        desk.set(zeile, o2);
        const dx = t.positionen[3 * e]! - l.fuss[0];
        const dy = t.positionen[3 * e + 1]! - l.fuss[1];
        const dz = t.positionen[3 * e + 2]! - l.fuss[2];
        const th = Math.min(1, Math.max(0, (dx * l.achse[0] + dy * l.achse[1] + dz * l.achse[2]) / Math.max(1e-6, l.laenge)));
        desk[o2 + 8] = 0.7 * (1 - th) * (1 - th);
      }
    }
    o += t.positionen.length;
  }
  return { positionen, normalen, desk };
}

/** Körper und Klingen zusammenfügen (Hebung auf die Füße bleibt erhalten). */
function zusammen(st: KlingenStand, k: { positionen: Float32Array; normalen: Float32Array; desk: Float32Array | null }): { positionen: Float32Array; normalen: Float32Array; desk: Float32Array | null } {
  const positionen = new Float32Array(st.koerper.positionen.length + k.positionen.length);
  const normalen = new Float32Array(positionen.length);
  positionen.set(st.koerper.positionen);
  positionen.set(k.positionen, st.koerper.positionen.length);
  normalen.set(st.koerper.normalen);
  normalen.set(k.normalen, st.koerper.normalen.length);
  if (st.hebung) for (let i = st.koerper.positionen.length + 1; i < positionen.length; i += 3) positionen[i]! += st.hebung;
  let desk: Float32Array | null = null;
  if (st.koerper.desk && k.desk) {
    desk = new Float32Array(st.koerper.desk.length + k.desk.length);
    desk.set(st.koerper.desk);
    desk.set(k.desk, st.koerper.desk.length);
  }
  return { positionen, normalen, desk };
}

/** Animation (Beweis 5): Klingen für die Zeit t neu posieren; null ohne Klingen. */
export function wesenAnimieren(stand: WesenStand | null, zeit: number): { positionen: Float32Array; normalen: Float32Array } | null {
  if (!stand?.klingen) return null;
  const k = klingenDreiecke(stand.klingen, zeit);
  const z = zusammen(stand.klingen, k);
  return { positionen: z.positionen, normalen: z.normalen };
}

// ---------- Bau ----------

/** Zonen-Vorlage (relativ) → Welt-Form aus den Ruhe-Grenzen. */
function zonenWelt(vorlagen: readonly ZonenVorlage[], g: { xMin: number; xMax: number; yMin: number; yMax: number; zMax: number }): ZonenForm[] {
  const H = Math.max(1e-6, g.yMax - g.yMin);
  const W = Math.max(1e-6, g.xMax - g.xMin);
  return vorlagen.map((z) => ({
    ansicht: z.ansicht,
    punkte: z.punkte.map((p) => (z.ansicht === 'seite' ? { x: g.xMin + p.x * W, y: g.yMin + p.y * H, weich: p.weich * H } : z.ansicht === 'top' ? { x: g.xMin + p.x * W, y: (p.y - 0.5) * 2 * g.zMax, weich: p.weich * H } : { x: (p.x - 0.5) * 2 * g.zMax, y: g.yMin + p.y * H, weich: p.weich * H })),
  }));
}

/**
 * Wesen bauen: Dokument + Bauplan → Netz. `stand` ist der letzte Stand (gleiches Dokument und gleiche Maul-/Beinwahl →
 * nur Pose, kein Umbau; `schnell` während Gesten → Zug am Seitenumriss statt Ableitung).
 */
/** Ableit-Optionen aus dem Dokument: eingefrorene Stationen (Schritt 3), wenn vorhanden. */
function ableitOpt(dok: Dokument, plan: Partial<Bauplan>): Partial<AbleitOptionen> {
  const g = dok.kaefig?.stationen;
  return { ...(g ? { stationen: g } : {}), ...(plan.fuehrend ? { fuehrend: plan.fuehrend } : {}), ...(plan.ring ? { ring: plan.ring } : {}) };
}

export function wesenBauen(dokRoh: Dokument, planRoh: Partial<Bauplan>, stand: WesenStand | null, schnell = false): { netz: WesenNetz; stand: WesenStand } {
  const plan: Bauplan = { ...BAUPLAN_STANDARD, ...planRoh };
  // Kasten des Prüfwesens (Tiger) nur, solange das Dokument keine eigenen Spanten hat: gezeichnete Spanten gewinnen (M3)
  const dok: Dokument = plan.kasten && !dokRoh.spanten?.length ? { ...dokRoh, spanten: kastenSpanten(dokRoh.profile.front, plan.kasten.fVorn, plan.kasten.fHinten, plan.kasten.fRund, plan.kasten.haerte) } : dokRoh;
  // Pose-Optionen (Winkel, Haps, Gelenk, Gewichte) bauen nicht um: sie wirken auf die gemerkte Ableitung (Fressen-Tab)
  const moEintraege = Object.entries(plan.maulOptionen ?? {}).filter(([k]) => !(MAUL_POSE_OPTIONEN as readonly string[]).includes(k));
  const moBau = moEintraege.length ? Object.fromEntries(moEintraege) : null;
  const schluessel = JSON.stringify({ p: dokRoh.profile, s: dokRoh.spanten ?? null, ka: dokRoh.kanten ?? null, k: dokRoh.skalierung, st: dokRoh.kaefig?.stationen ?? null, ring: plan.ring ?? null, fu: plan.fuehrend ?? null, kasten: plan.kasten ?? null, linie: plan.maulLinie ?? null, mo: moBau, ba: plan.beinAnsaetze ?? null });
  const gleich = stand !== null && stand.schluessel === schluessel;
  const letzte = stand && gleich ? stand : null;
  let abl: Ableitung;
  let zug = 0;
  let ableitung = 0;
  const maul = plan.beine !== 'aus' ? 'aus' : plan.maul;
  const beine = plan.beine;
  // Pinsel (M3): Käfig-Deltas des Dokuments kommen nach der Ableitung auf den Käfig (gespiegelt); der Stand behält die
  // Ableitung ohne Deltas (`ablRein`), damit ein Pinselstrich keinen Umbau auslöst
  const deltas = dokRoh.kaefig?.deltas ?? [];
  const mitDeltas = <T extends Ableitung>(a: T): T => (deltas.length ? deltasAnwenden(a, deltas) : a);
  let ablRein: Ableitung | null = null;
  let maulLinieVerwendet: MaulLinie | null = null;
  let maulOptAktuell: MaulOptionen | null = null;
  let fein: Float64Array;
  let xyz: Float64Array;
  let gesteckt: { fein: Float64Array; abl: BeinErgebnis } | null = null;
  if (beine !== 'aus') {
    if (letzte && letzte.beine === beine && letzte.maul === 'aus') abl = letzte.abl;
    else {
      abl = ableitenMitBeinen(dok, plan.beinAnsaetze ?? [{ ring: 15, j: 6 }], beine, ableitOpt(dok, plan));
      ableitung = abl.zeiten.gesamt;
    }
    ablRein = abl;
    abl = mitDeltas(abl);
    const t0 = jetzt();
    const pose = beinPose(abl as BeinErgebnis, plan.schwung);
    zug = jetzt() - t0;
    fein = pose.fein;
    xyz = pose.xyz;
    if ((abl as BeinErgebnis).gesteckt.length) gesteckt = { fein: pose.gesteckt.length ? Float64Array.from(pose.gesteckt.flatMap((f) => Array.from(f))) : new Float64Array(0), abl: abl as BeinErgebnis };
  } else if (maul !== 'aus') {
    maulLinieVerwendet = plan.maulLinie ?? maulLinieVorlage(dok, maul);
    if (letzte && letzte.maul === maul && letzte.beine === 'aus') abl = letzte.abl;
    else {
      abl = ableitenMitMaul(dok, maulLinieVerwendet, ableitOpt(dok, plan), { ...maulOptionenVorlage(maul), ...(plan.maulOptionen ?? {}) });
      ableitung = abl.zeiten.gesamt;
    }
    ablRein = abl;
    abl = mitDeltas(abl);
    // Pose-Optionen und Kiefergewichte (Gelenk, Übergang, Reichweite) auf die gemerkte Ableitung: ohne Umbau
    maulOptAktuell = { ...MAUL_STANDARD, ...maulOptionenVorlage(maul), ...(plan.maulOptionen ?? {}) };
    const mAbl = (abl as MaulErgebnis).maul;
    mAbl.opt = maulOptAktuell;
    kieferGewichteSetzen(mAbl, maulOptAktuell);
    const t0 = jetzt();
    const pose = maulPose(abl as MaulErgebnis, plan.oeffnung);
    fein = pose.fein;
    xyz = pose.xyz;
    // Fressen-Pose (Plan 5.2, M3): Käfig-Deltas derselben Maultopologie, mit der Öffnung überblendet, auf alle Punkte
    // (auch Maulpunkte) nach der Knochenpose — so wird aus einem kleinen geschlossenen Maul ein großes rundes offenes
    const posenDeltas = dokRoh.kaefig?.posen?.fressen ?? [];
    if (posenDeltas.length && plan.oeffnung > 0) {
      const xyz2 = new Float64Array(pose.xyz);
      deltasAddieren(xyz2, spiegelIndex(abl.kaefig.xyz, abl.kaefig.n), posenDeltas, plan.oeffnung);
      xyz = xyz2;
      fein = anwenden3(abl.unterteilung.grenze, xyz2);
    }
    zug = jetzt() - t0;
  } else if (schnell && stand && stand.maul === 'aus' && stand.beine === 'aus' && gleicheTopologie(stand.dok, dok)) {
    // führende Kurve des aktuellen Zugs statt der des letzten Baus
    const optOhne = { ...stand.abl.opt };
    delete optOhne.fuehrend;
    const r = seiteZiehen({ ...stand.abl, opt: plan.fuehrend ? { ...optOhne, fuehrend: plan.fuehrend } : optOhne }, dok);
    ablRein = r;
    abl = mitDeltas(r);
    zug = r.zugZeit.leiter + r.zugZeit.ziele + r.zugZeit.loeser + r.zugZeit.matrix;
    fein = abl.fein;
    xyz = abl.kaefig.xyz;
  } else if (letzte && letzte.maul === 'aus' && letzte.beine === 'aus') {
    ablRein = letzte.abl;
    abl = mitDeltas(ablRein);
    fein = abl.fein;
    xyz = abl.kaefig.xyz;
  } else {
    ablRein = ableiten(dok, ableitOpt(dok, plan));
    ableitung = ablRein.zeiten.gesamt;
    abl = mitDeltas(ablRein);
    fein = abl.fein;
    xyz = abl.kaefig.xyz;
  }
  // weitere Pose (Posenliste): Deltas derselben Topologie mit der Stärke überblendet, auf alle Punkte, nach Knochen und Fressen
  const poseDeltas = plan.pose && plan.pose.name !== 'fressen' && plan.pose.staerke > 0 ? (dokRoh.kaefig?.posen?.[plan.pose.name] ?? []) : [];
  if (poseDeltas.length) {
    const xyz2 = new Float64Array(xyz);
    deltasAddieren(xyz2, spiegelIndex(abl.kaefig.xyz, abl.kaefig.n), poseDeltas, plan.pose!.staerke);
    xyz = xyz2;
    fein = anwenden3(abl.unterteilung.grenze, xyz2);
  }
  const letzteStufe = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const punkte: V3[] = [];
  for (let i = 0; i < fein.length / 3; i++) punkte.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
  const flaechen = alleFlaechen(letzteStufe);
  const t0 = zuDreiecken({ punkte, flaechen, schaerfe: new Map() }, 40);
  // angesteckte Beine: eigene feine Netze anhängen (Deskriptoren der Hüfte)
  let t = t0;
  let gesteckteEcken = 0;
  if (gesteckt) {
    const teile: { positionen: Float32Array; normalen: Float32Array }[] = [t0];
    let off = 0;
    for (const g of gesteckt.abl.gesteckt) {
      const nF = g.fein.length / 3;
      const pts: V3[] = [];
      for (let i = 0; i < nF; i++) pts.push([gesteckt.fein[off + 3 * i]!, gesteckt.fein[off + 3 * i + 1]!, gesteckt.fein[off + 3 * i + 2]!]);
      off += 3 * nF;
      const fl = alleFlaechen(g.unterteilung.stufen[g.unterteilung.stufen.length - 1]!.kaefig);
      const tg = zuDreiecken({ punkte: pts, flaechen: fl, schaerfe: new Map() }, 40);
      gesteckteEcken += tg.positionen.length / 3;
      teile.push(tg);
    }
    const nPos = teile.reduce((a, b) => a + b.positionen.length, 0);
    const positionen = new Float32Array(nPos);
    const normalen = new Float32Array(nPos);
    let o = 0;
    for (const x of teile) {
      positionen.set(x.positionen, o);
      normalen.set(x.normalen, o);
      o += x.positionen.length;
    }
    t = { positionen, normalen };
  }
  let hoehe = 0;
  for (const p of punkte) hoehe = Math.max(hoehe, p[1]);
  // mit Beinen steht der Körper auf den Füßen: alles so heben, dass der tiefste Punkt auf dem Boden liegt
  let hebung = 0;
  if (beine !== 'aus') {
    let yMin = Infinity;
    for (let i = 1; i < t.positionen.length; i += 3) yMin = Math.min(yMin, t.positionen[i]!);
    if (yMin < 0) {
      for (let i = 1; i < t.positionen.length; i += 3) t.positionen[i]! -= yMin;
      hoehe -= yMin;
      hebung = -yMin;
    }
  }
  const earle = plan.earle;
  const feinDeskAlle = earle ? deskriptoren(abl, plan.gesichtMaske) : null;
  let desk = feinDeskAlle ? jeEcke(feinDeskAlle, flaechen) : null;
  if (desk && feinDeskAlle && gesteckteEcken > 0) {
    const alle = new Float32Array(desk.length + gesteckteEcken * DESKRIPTOR_FLOATS);
    alle.set(desk);
    const a0 = plan.beinAnsaetze?.[0] ?? { ring: 15, j: 6 };
    const hp = abl.vorlage.ringPunkt(a0.ring, a0.j);
    const huefte = feinDeskAlle.subarray(hp * DESKRIPTOR_FLOATS, (hp + 1) * DESKRIPTOR_FLOATS);
    for (let e = 0; e < gesteckteEcken; e++) alle.set(huefte, desk.length + e * DESKRIPTOR_FLOATS);
    desk = alle;
  }
  // Kachelung (Beweis 4 / M2): je feiner Fläche Käfigfläche und (u, v) — für Atlas und Treffer
  const trefferAn = plan.treffer ?? true;
  const atlasAn = earle && (plan.atlas ?? true) && !!plan.zonen && plan.zonen.length > 0 && gesteckteEcken === 0;
  const kach: AtlasKachelung | null = trefferAn || atlasAn ? kachelung(abl) : null;
  // Zonen-Atlas (Beweis 4, Plan 8.2): Kacheln je Käfigfläche, Zonen als Vektorformen in der Ruhelage gerastert
  let atlas: AtlasDaten | null = null;
  let punktAtl: Float32Array | null = null;
  if (kach && atlasAn) {
    const rf = abl.fein;
    const g = { xMin: Infinity, xMax: -Infinity, yMin: Infinity, yMax: -Infinity, zMax: 0 };
    for (let i = 0; i < rf.length / 3; i++) {
      g.xMin = Math.min(g.xMin, rf[3 * i]!);
      g.xMax = Math.max(g.xMax, rf[3 * i]!);
      g.yMin = Math.min(g.yMin, rf[3 * i + 1]!);
      g.yMax = Math.max(g.yMax, rf[3 * i + 1]!);
      g.zMax = Math.max(g.zMax, Math.abs(rf[3 * i + 2]!));
    }
    const k = kach;
    const r = zonenRastern(k, flaechen, rf, zonenWelt(plan.zonen!, g));
    atlas = { ecken: atlasEcken(k), abstand: r.abstand, weich: r.weich, breite: k.breite, hoehe: k.hoehe };
    punktAtl = punktAtlas(k, flaechen, rf.length / 3);
  }
  const augen = earle || plan.stil === 'feuer' || plan.stil === 'gas' ? augenAm(abl, hoehe, plan.augen ?? { ring: 2, j: 2, groesse: 0.11 }) : [];
  const ab = nahtAbweichung(abl, dok);
  // Abweichung je Blatt (Schritt 4) aus der Ruhelage ohne Hebung, nur nach einer echten Ableitung; Züge zeigen den letzten Stand
  let saum = stand?.saum ?? null;
  let umweg = stand?.umweg ?? null;
  let blatt = stand?.blatt;
  if (!schnell || !blatt) {
    const ruheP: V3[] = [];
    for (let i = 0; i < abl.fein.length / 3; i++) ruheP.push([abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!]);
    // breitere Kiefer: dort heftet sich die schwarze Linie an (Umweg), das zählt nicht als Abweichung (14.10. nachts)
    const kiefer = maul !== 'aus' && (abl as Partial<MaulErgebnis>).maul ? kieferFlaechen(abl as MaulErgebnis, flaechen) : undefined;
    const bl = blattAbweichungen(ruheP, flaechen, dok, 240, kiefer);
    saum = { seite: bl.seite.saum, front: bl.front.saum, top: bl.top.saum };
    umweg = bl.front.umweg || bl.top.umweg ? { ...(bl.front.umweg ? { front: bl.front.umweg } : {}), ...(bl.top.umweg ? { top: bl.top.umweg } : {}) } : null;
    blatt = { seite: { max: bl.seite.max, mittel: bl.seite.mittel }, front: { max: bl.front.max, mittel: bl.front.mittel }, top: { max: bl.top.max, mittel: bl.top.mittel } };
  }
  // Lippenkanten gegen die Linien (Phase 2 M2): px je Kette in Seite und Front
  const maulAbw = maul !== 'aus' && (abl as Partial<MaulErgebnis>).maul && maulLinieVerwendet ? maulAbweichung(abl as MaulErgebnis, dok, maulLinieVerwendet) : undefined;
  const info: WesenInfo = { kaefigPunkte: abl.kaefig.n, feinPunkte: punkte.length, nahtMax: ab.max, nahtMittel: ab.mittel, ableitung, zug, ecken: abl.ecken.length + (abl.spitzen.vorn ? 1 : 0) + (abl.spitzen.hinten ? 1 : 0), schnell: ableitung === 0, ...(blatt ? { blatt } : {}), ...(maulAbw ? { maul: maulAbw } : {}), stationen: abl.gefroren };
  const linien = plan.kaefigLinien ? kaefigSegmente(abl, xyz) : null;
  // Lippenband nach der Kopfhöhe am Maul (nicht der ganzen Körperhöhe: beim Langhals war das Band breiter als der Kiefer)
  const maulHoehe = maul !== 'aus' ? 1.1 * ((abl as Partial<MaulErgebnis>).maul?.kopfHoehe ?? hoehe) : hoehe;
  const lippenBand = maul !== 'aus' && beine === 'aus' ? (plan.lippenBand ?? 0.03) * Math.min(hoehe, maulHoehe) : 0;
  const mitte: V3 = [0, 0, 0];
  for (const p of punkte) for (let d = 0; d < 3; d++) mitte[d] = mitte[d]! + p[d]! / punkte.length;
  // Ruhelage je Ecke (unposiert) bei Posen, damit Muster und Zonen nicht schwimmen
  let ruhe: Float32Array | null = null;
  if (maul !== 'aus' || beine !== 'aus') {
    const ruhePunkte: V3[] = [];
    for (let i = 0; i < abl.fein.length / 3; i++) ruhePunkte.push([abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!]);
    ruhe = zuDreiecken({ punkte: ruhePunkte, flaechen, schaerfe: new Map() }, 40).positionen;
    if (hebung) for (let i = 1; i < ruhe.length; i += 3) ruhe[i]! += hebung;
    if (ruhe.length !== t.positionen.length) ruhe = null;
  }
  // Zähne am Zahnfleisch des posierten Käfigs
  let zaehne: WesenNetz['zaehne'] = null;
  if (maul !== 'aus' && (abl as Partial<MaulErgebnis>).maul) {
    const zahnVorlage = vorlageFuer({ ringe: 4, profil: 'zacke', dicke: 0.6, einsenken: 0.3, biegung: 0.12, stufen: 1 });
    const z = klingenStatisch(zahnVorlage, zahnLagen(abl as MaulErgebnis, xyz, hoehe), null);
    zaehne = { positionen: z.positionen, normalen: z.normalen, anteil: z.anteil };
  }
  // Gesicht: Dreiecksnase oben an der Schnauzenfront, Scharte hinab zur Lippe, alles in der Ruhelage
  let gesicht: Gesicht | null = null;
  if (plan.gesicht) {
    const rf = abl.fein;
    const sp = abl.vorlage.naht.spitzeVorn;
    const sx = rf[3 * sp]!;
    let oben: V3 = [sx, rf[3 * sp + 1]!, 0];
    for (let i = 0; i < rf.length / 3; i++) {
      if (Math.abs(rf[3 * i + 2]!) < 0.02 * hoehe && rf[3 * i]! < sx + 0.03 * hoehe && rf[3 * i + 1]! > oben[1]) oben = [rf[3 * i]!, rf[3 * i + 1]!, 0];
    }
    const lippe = (abl as Partial<MaulErgebnis>).maul ? (abl as MaulErgebnis).maul.pfad[0]! : -1;
    const unten: V3 = lippe >= 0 ? [rf[3 * lippe]!, rf[3 * lippe + 1]!, rf[3 * lippe + 2]!] : [oben[0], oben[1] - 0.2 * hoehe, 0];
    const nH = 0.045 * hoehe;
    const nm: V3 = [oben[0] - 0.004, oben[1] - 0.055 * hoehe + hebung, 0];
    gesicht = { nase: nm, oben: [0, 1, 0], rechts: [0, 0, 1], radius: 0.046 * hoehe, hoehe: nH, philtrumA: [nm[0], nm[1] - nH, 0], philtrumB: [unten[0] - 0.004, unten[1] + hebung, unten[2]], breite: 0.004 * hoehe };
  }
  // Wangenzacken und Ohren als statische Klingen, Deskriptoren und Atlas vom Fußpunkt
  if (plan.wangen && earle) {
    const zackenVorlage = vorlageFuer({ ringe: 4, profil: 'zacke', dicke: 0.4, einsenken: 0.3, biegung: 0.1, stufen: 1 });
    const ohrVorlage = vorlageFuer({ ringe: 4, profil: 'tropfen', dicke: 0.55, einsenken: 0.4, biegung: 0.05, stufen: 1 });
    const haut = hautAus(fein);
    const w1 = klingenStatisch(zackenVorlage, wangen(haut, hoehe), feinDeskAlle, punktAtl);
    const w2 = klingenStatisch(ohrVorlage, ohren(haut, hoehe), feinDeskAlle, punktAtl);
    const w = { positionen: verketten(w1.positionen, w2.positionen), normalen: verketten(w1.normalen, w2.normalen), desk: w1.desk && w2.desk ? verketten(w1.desk, w2.desk) : null, atlas: w1.atlas && w2.atlas ? verketten(w1.atlas, w2.atlas) : null };
    if (atlas && w.atlas) atlas = { ...atlas, ecken: verketten(atlas.ecken, w.atlas) };
    t = { positionen: verketten(t.positionen, w.positionen), normalen: verketten(t.normalen, w.normalen) };
    if (desk && w.desk) desk = verketten(desk, w.desk);
    if (ruhe) ruhe = verketten(ruhe, w.positionen);
  }
  // Stile: Klingen (Zungen, Schwaden, Büschel) als Käfige am Körper; Animation über `wesenAnimieren`
  const stil = plan.stil;
  let klingen: KlingenStand | null = null;
  let positionen = t.positionen;
  let normalen = t.normalen;
  if (stil !== 'fest') {
    const haut = hautAus(fein);
    const saat = 7;
    const form = stil === 'feuer' ? KLINGE_FLAMME : stil === 'gas' ? { ...KLINGE_SCHWADE, biegung: 0.1, kringel: 3.4 } : { ...KLINGE_BUESCHEL, profil: 'flamme' as const, dicke: 0.3, biegung: 0.25 };
    const vorlage = vorlageFuer(form);
    const lagen = stil === 'feuer' ? zungenAmScheitel(haut, hoehe, 2, 24, saat, ZUNGEN_FEUER) : stil === 'gas' ? zungenAmScheitel(haut, hoehe, 2, 34, saat, ZUNGEN_GAS) : bueschelAufHaut(haut, hoehe, 680, 0.058, -0.25, saat);
    const zusatzVorlage = stil === 'fell' ? null : vorlageFuer(stil === 'gas' ? { ...KLINGE_SCHWADE, profil: 'kugel', dicke: 1, biegung: 0, ringe: 6, stufen: 2 } : { ...KLINGE_FLAMME, ringe: 4, stufen: 1 });
    klingen = { stil, vorlage, lagen, zusatzVorlage, haut, hoehe, saat, koerper: { positionen: t.positionen, normalen: t.normalen, desk, feinDesk: desk && stil === 'fell' ? feinDeskAlle : null }, hebung: 0 };
    const k = klingenDreiecke(klingen, 0);
    const z = zusammen(klingen, k);
    positionen = z.positionen;
    normalen = z.normalen;
    desk = z.desk;
  }
  // Treffer (M2): je Dreieck des fertigen Netzes die feine Fläche (Körper = Fächer je Fläche in Reihenfolge; angesetzte
  // Beine, Wangen, Ohren, Klingen = −1), dazu Kachelung und posierter Käfig
  let treffer: TrefferDaten | null = null;
  if (kach && trefferAn) {
    const dreieckFlaeche = new Int32Array(positionen.length / 9).fill(-1);
    let d = 0;
    for (let f = 0; f < flaechen.length; f++) for (let i = 1; i < flaechen[f]!.length - 1; i++) dreieckFlaeche[d++] = f;
    const kf = abl.kaefig;
    treffer = { dreieckFlaeche, flaecheVon: kach.flaecheVon, eckenUV: kach.eckenUV, eckenZahl: kach.eckenZahl, kaefig: { n: kf.n, xyz: Float32Array.from(xyz), fStart: Uint32Array.from(kf.fStart), fVerts: Uint32Array.from(kf.fVerts) }, vorlage: { R: abl.vorlage.R, N: abl.vorlage.N, n: abl.vorlage.kaefig.n } };
    if (hebung) for (let i = 1; i < treffer.kaefig.xyz.length; i += 3) treffer.kaefig.xyz[i]! += hebung;
  }
  // Reifen (M3): Ringe der gezeichneten Spanten — posierte Lagen aller Ringpunkte, Verlauf je Reifen auf der Fläche
  // (Segmente je Käfigkante über alle Stufen; Maulschlitz und Beinfelder lassen Lücken), Ringpunkte der Spant-Knoten
  let reifen: ReifenDaten | null = null;
  if (dokRoh.spanten?.length && abl.reifen.length) {
    const { R, N } = abl.vorlage;
    const ringLagen = new Float32Array(3 * R * N);
    for (let p = 0; p < R * N; p++) {
      ringLagen[3 * p] = fein[3 * p]!;
      ringLagen[3 * p + 1] = fein[3 * p + 1]! + hebung;
      ringLagen[3 * p + 2] = fein[3 * p + 2]!;
    }
    const segs: number[] = [];
    const starts: number[] = [0];
    const knoten: number[][] = [];
    const knotenUnten: number[][] = [];
    // Maulringe: Die Lippe verschiebt die Zeilen (Schleife eingerastet), die Stützstellen der Abtastung stimmen dort nicht
    // mehr — Knoten auf den nächsten Ringpunkt der rechten Hälfte (Front-Ebene, Ruhelage); beim Kiefer-Spant der
    // Oberkiefer über der Lippe (Zeilen 0 … jL), der Unterkiefer darunter (jL … N/2)
    const lage = maul !== 'aus' ? (abl as MaulErgebnis).maul?.lage : undefined;
    const ruheFein = abl.fein;
    for (const r of abl.reifen) {
      for (const i of ringSegmente(abl.unterteilung, abl.kaefig, r.ring, N)) segs.push(fein[3 * i]!, fein[3 * i + 1]! + hebung, fein[3 * i + 2]!);
      starts.push(segs.length);
      const sp = dokRoh.spanten[r.spant]!;
      const maulRing = !!lage && r.ring <= lage.k && Number.isFinite(lage.vRing[r.ring]!);
      if (!maulRing) {
        knoten.push([...vorlageBei(dok, sp.f, N / 2).knoten]);
        knotenUnten.push([]);
        continue;
      }
      const kasten = spantKasten(dok, sp.f);
      const sk = dok.skalierung;
      const zeile = (p: V2, von: number, bis: number): number => {
        if (p.x < 1e-6) return p.y > 0.5 ? 0 : N / 2;
        const z = p.x * kasten.w * sk;
        const y = (kasten.yLo + p.y * (kasten.yHi - kasten.yLo)) * sk;
        let best = von;
        let dBest = Infinity;
        for (let j = Math.max(1, von); j <= Math.min(N / 2 - 1, bis); j++) {
          const q = 3 * (r.ring * N + j);
          const d = Math.hypot(Math.abs(ruheFein[q + 2]!) - z, ruheFein[q + 1]! - y);
          if (d < dBest) {
            dBest = d;
            best = j;
          }
        }
        return best;
      };
      const schnitt = kieferSchnitt(dokRoh, sp.f);
      if (schnitt === null) {
        knoten.push(sp.profil.knoten.map((kn) => zeile(kn.p, 0, N / 2)));
        knotenUnten.push([]);
      } else {
        // die Lippenzeile jL gehört der Linie (rot/blau), nicht dem Spant: Perlen nur darüber bzw. darunter
        knoten.push(sp.profil.knoten.map((kn) => (kn.p.y >= schnitt ? zeile(kn.p, 0, lage.jL - 1) : -1)));
        knotenUnten.push(spantTeilProfil(sp, 'unten').knoten.map((kn) => (kn.p.y < schnitt ? zeile(kn.p, lage.jL + 1, N / 2) : -1)));
      }
    }
    reifen = { liste: abl.reifen.map((r) => ({ spant: r.spant, ring: r.ring })), ringLagen, verlauf: Float32Array.from(segs), verlaufStart: Uint32Array.from(starts), knoten, knotenUnten };
  }
  let maulGriff: WesenNetz['maul'] = null;
  let gewichtFarben: Float32Array | null = null;
  if (maul !== 'aus') {
    const m = (abl as MaulErgebnis).maul;
    const p = m.pfad[m.pfad.length - 1]!;
    const o = maulOptAktuell ?? m.opt;
    const winkelGew = o.gewichte === 'winkel' && o.oeffnungsart !== 'ziehen' && !o.nackenGanz;
    const ruhe = (abl as MaulErgebnis).fein;
    const rp = (i: number): V2 => ({ x: ruhe[3 * i]!, y: ruhe[3 * i + 1]! + hebung });
    maulGriff = {
      winkel: [fein[3 * p]!, fein[3 * p + 1]! + hebung, fein[3 * p + 2]!],
      laenge: m.laenge,
      rig: { gelenk: { x: m.scharnier.x, y: m.scharnier.y + hebung }, mundwinkel: { x: m.kieferBasis.mundwinkel.x, y: m.kieferBasis.mundwinkel.y + hebung }, vorn: m.vorn, gelenkVersatz: [...o.gelenk], kieferWinkel: [...o.kieferWinkel], kieferReichweite: [...o.kieferReichweite], winkel: winkelGew },
      knochen: { kieferSpitze: rp(m.unten[0]!), schaedel: { x: m.schaedel.x, y: m.schaedel.y + hebung }, schaedelSpitze: rp(m.pfad[0]!), winkelUnten: o.winkelUnten, winkelOben: o.winkelOben, zug: [...(o.kieferZug ?? [0, 0])], kippen: o.oeffnungsart !== 'ziehen' },
    };
    if (plan.gewichteZeigen) gewichtFarben = gewichteJeEcke(abl as MaulErgebnis, flaechen, gesteckteEcken);
  }
  const netz: WesenNetz = {
    positionen,
    normalen,
    deskriptoren: stil === 'feuer' || stil === 'gas' ? null : desk,
    hoehe,
    augen,
    kaefigLinien: linien ? linien.punkte : null,
    kaefigFarben: linien ? linien.farben : null,
    lippenBand,
    stil,
    mitte,
    ruhe: ruhe && ruhe.length === positionen.length ? ruhe : null,
    gesicht,
    zaehne,
    atlas: stil === 'fest' ? atlas : null,
    treffer,
    reifen,
    maul: maulGriff,
    gewichtFarben,
    saum,
    umweg,
    info,
  };
  return { netz, stand: { dok, schluessel, abl: ablRein ?? abl, maul, beine, klingen, ...(saum ? { saum } : {}), ...(umweg ? { umweg } : {}), ...(blatt ? { blatt } : {}) } };
}

/** Puffer eines Netzes (zum Übertragen aus dem Worker). */
export function netzPuffer(netz: WesenNetz): ArrayBuffer[] {
  const out: ArrayBuffer[] = [netz.positionen.buffer as ArrayBuffer, netz.normalen.buffer as ArrayBuffer];
  const tr = netz.treffer;
  for (const a of [netz.deskriptoren, netz.kaefigLinien, netz.kaefigFarben, netz.ruhe, netz.zaehne?.positionen, netz.zaehne?.normalen, netz.zaehne?.anteil, netz.atlas?.ecken, netz.atlas?.abstand, netz.atlas?.weich, tr?.dreieckFlaeche, tr?.flaecheVon, tr?.eckenUV, tr?.eckenZahl, tr?.kaefig.xyz, tr?.kaefig.fStart, tr?.kaefig.fVerts, netz.reifen?.ringLagen, netz.reifen?.verlauf, netz.reifen?.verlaufStart, netz.gewichtFarben]) {
    if (a && !out.includes(a.buffer as ArrayBuffer)) out.push(a.buffer as ArrayBuffer);
  }
  return out;
}
