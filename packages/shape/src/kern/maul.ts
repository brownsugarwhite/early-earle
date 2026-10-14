// Wesen-Editor 2, Beweis 2 „Maul mit Haps“ (13.10.2026): das Maul im Käfig.
//
// Die Maullinie (Seitenansicht, rechte Hälfte, von der Schnauzenspitze zum Mundwinkel) wird ein Kantenpfad des Käfigs:
// die Kappenzeile b_L durch die Spitze und die Längsschleife j_L = 3c/2 − b_L bis zum Winkelring k. Jeder Ring und jeder
// Quadratring der Kappe wird so umparametrisiert, dass sein Lippenpunkt auf der Linie liegt („Schleife einrasten“, Plan
// 4.2); die übrigen Punkte verteilen sich nach Bogenlänge ober- und unterhalb. Dann wird der Pfad geschlitzt (obere und
// untere Kopie je Pfadpunkt, der Mundwinkel bleibt ein Punkt), die Tasche entsteht als K Inset-Reihen nach innen
// (Lippe, Zahnfleisch, Rachen), und ein m×m-Gitter schließt den Rachen: nur Vierecke, spiegelsymmetrisch über die
// Gegendiagonale, die Naht bleibt eine Schleife. Die Lippenkanten sind scharfe Falten.
// Kiefer: zwei starre Drehungen um die Achse durch die Mundwinkel (Schädel kippt zurück, Unterkiefer fällt), Gewichte
// aus der Lage zum Schlitz, weiches Band über die Ringe hinter dem Winkel. Posen laufen auf dem Käfig, die Matrix
// liefert das feine Netz (Plan 4.4, 5.2).

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { type Kaefig, alleFlaechen, kaefigAusFlaechen, kanteZwischen, pruefeKaefig } from '../kaefig/halbkanten';
import { type Roehre, roehre } from '../kaefig/roehre';
import { luLoesen, luZerlegen } from '../loeser/lu';
import { abtasten3 } from '../versuch/linie3d';
import type { Linie3, MaulStationen } from '../dokument';
import { anwenden3 } from '../subdivision/matrix';
import type { KlingenLage } from './klinge';
import type { Leiter } from '../versuch/wirbelsaeule';
import {
  ABLEIT_STANDARD,
  type AbleitOptionen,
  type Ableitung,
  type SchlitzLage,
  type Stationen,
  faltenSetzen,
  fertigstellen,
  kernLeiter,
  quadratRing,
  sprossenVon,
  stationenAusLeiter,
  stationenWaehlen,
  zieleBerechnen,
  zugBei,
  spineAnteile,
  spineAnteilFuer,
  umrissDicht,
  umrissDichtOffen,
  zugAnteil,
  type MaulBereich,
} from './ableiten';
import { silhouettenBreite } from './breite';
import { dokFuerKern } from './schlitz';

/**
 * Maullinie in Wirbelsäulen-Koordinaten: Anteil f der Wirbelsäulenlänge (0 = Spitze) und Höhe v auf der Sprosse
 * (0 Bauch … 1 Rücken), aufsteigend in f, letzter Punkt = Mundwinkel. So liegt die Lippe immer auf der Fläche, auch wo
 * die Sprossen fächern (Hinterkopf, Halsansatz). Eine gezeichnete 2D-Linie wird mit `maulLinieAusPunkten` übersetzt.
 */
export type MaulLinie = {
  /**
   * Stützen (Wirbelsäulen-Anteil f, Höhe v auf der Sprosse), f steigend. Eine erste Stütze mit v < `LIPPE_V_MIN` markiert
   * den **Anfang auf der Kontur** (Plan „Zeichnung ist Form“, Schritt 2): Die Lippe beginnt an der Naht genau dort, wo die
   * Bauchlinie den Anteil f hat (vorderster Konturpunkt auf der gezeichneten Höhe); die Kappenzeile der Lippe wird auf
   * diese Stelle gelegt. Ohne Markierung beginnt die Lippe in der Spitze oder an der Bauchnaht der Kappenzeile (`unterSpitze`).
   */
  fv: { f: number; v: number }[];
  /**
   * Lippenanfang unter der Spitze: 0 = in der Schnauzenspitze; r ≥ 1 = an der Bauchnaht des r-ten Quadratrings der
   * Kappe (der Oberkiefer steht vor, Überbiss wie beim Rex; in einer scharfen Spitze ist kein Platz für eine Tasche).
   * Höchstens c/2 − 1 (c = N/4).
   */
  unterSpitze?: number;
  /** Anfang auf der Kontur als Weltpunkt (Seitenansicht), genauer als die Rückabbildung aus f (≈ 2 px Unschärfe) */
  anfang?: V2;
  /**
   * Seitliche Lage des Mundwinkels (Welt-z, aus einer in der Front gezeichneten Linie). An einer Kastenfront mit dem
   * Winkel auf der Platte wird daraus das **Plattenmaul** (Phase 2, M1): der Schlitz läuft als Treppe im Plattengitter
   * von der Mitte zum inneren Winkel (Florians Mercedesstern), nicht über die Platte hinaus an die Seiten.
   */
  winkelZ?: number;
  /** Mundwinkel als Weltpunkt (Seitenansicht); auf einer Kastenfront fächern die Sprossen, dort ist (f, v) zu grob */
  winkel?: V2;
  /** Verlauf der Lippe in der Front (Welt-|z| → y, rechte Hälfte von der Mitte nach außen): die Maularme des Plattenmauls */
  front?: { z: number; y: number }[];
  /**
   * Kiefer getrennt (Phase 2, M2, Florians Grundbedingung), **Überbiss**: Kante des Unterkiefers (blaue Linie) als
   * Stützen (f, v) über der Oberlippe (`fv`, rot). Die erste Stütze ist ihr **eigener Anfang** auf der Spiegelebene —
   * hinter dem Anfang der roten Linie, im Oberkiefer: der Unterkiefer ist kürzer, die Lippen sind vorn getrennt, und von
   * unten sieht man zwischen Schnauzenspitze und Kinn die Tasche des Oberkiefers. In der Seite gibt v die Höhe, in der
   * Front `z` = seitliche Lage (Welt-|z|) der gezeichneten Kante bzw. `innen` = Anteil der örtlichen halben Breite, um
   * den die Kante innen liegt (schmaler). Geschlossen ist der Unterkiefer in den Oberkiefer geschoben; die verdeckte
   * Überlappung darf sich durchdringen. Fehlen `unten` und `oben`, sind die Kiefer gleich (eine Linie).
   */
  unten?: KieferStuetze[];
  /**
   * **Unterbiss**: die blaue Unterlippe ist der Schlitz (`fv`, auf der Kontur — der Unterkiefer ist der längere Teil),
   * die rote Oberlippe die versetzte Kante: Stützen wie `unten`, aber mit eigenem Anfang hinter der Unterlippe, unter
   * ihr und innen im Unterkiefer. Höchstens eines von `unten` und `oben` ist gesetzt.
   */
  oben?: KieferStuetze[];
  /**
   * Gezeichnete Linien als dichte 3D-Polygonzüge (Welt; Editor): `punkte` = die Schlitzlinie (ihre Kante bekommt daraus
   * die Breite in Front/Top), `untenPunkte` bzw. `obenPunkte` = die versetzte Kante, die exakt auf dieser Linie liegt
   * (Florian: „Die blaue Linie IST exakt die Lippenkante und die rote auch“). Ohne sie gelten die Stützen.
   */
  punkte?: readonly (readonly [number, number, number])[];
  untenPunkte?: readonly (readonly [number, number, number])[];
  obenPunkte?: readonly (readonly [number, number, number])[];
};

/** Stütze einer versetzten Kieferkante: Anteil f, Höhe v auf der Sprosse, seitliche Lage (Welt-|z|) oder Anteil innen */
export type KieferStuetze = { f: number; v: number; z?: number; innen?: number };

export type MaulOptionen = {
  /** Inset-Reihen der Tasche (Lippe → Rachen) */
  reihen: number;
  /** Anteil des Wegs Lippe → Rachenlinie, den die letzte Reihe geht */
  tiefe: number;
  /** halbe Dicke der geschlossenen Tasche (Linse), Anteil der Körperhöhe */
  linse: number;
  /** Rachenziel je Lippenpunkt: Ringmitte bei der Station Lippe + rachenTiefe · (Winkel − Lippe) (nie hinter dem Scharnier, sonst schwingt die Tasche beim Öffnen durch); seitlich Anteil der Winkelbreite */
  rachenTiefe: number;
  rachenInnen: number;
  /** Schädelgelenk hinter dem Winkelring: Anteil der Maullänge nach hinten (Werkstatt: der Schädel kippt um ein Gelenk am Hinterkopf) */
  schaedelHinter: number;
  /** Kantenschärfe der Lippen */
  lippenSchaerfe: number;
  /** Ringe hinter dem Winkelring, über die das Gewicht ausläuft: Unterkiefer (Kehle) und Schädel (Nacken) */
  band: number;
  bandOben: number;
  /** Hinter dem Winkel folgt der ganze Ring dem Schädelband (Nacken biegt als Ganzes) statt nur die obere Hälfte */
  nackenGanz: boolean;
  /** größte Winkel (Grad) von Unterkiefer und Schädel bei Öffnung 1 */
  winkelUnten: number;
  winkelOben: number;
  /** Öffnungsart (Plan 5.2): „kippen“ = Unterkiefer dreht um die Mundwinkel (Rex, Schnabel); „ziehen“ = Unterkiefer
   * gleitet wie ein Vorhang vom Rachen weg (Robbe, Drache mit Maul bis zum Hals), Weite als Anteil der Maullänge */
  oeffnungsart: 'kippen' | 'ziehen';
  zugWeite: number;
  /** Rille: beide Lippenketten geschlossen um diesen Anteil der Körperhöhe nach innen (dunkle Maullinie wie auf den Bögen; Ober- und Unterhaut treffen sich im Winkel statt tangential), zum Winkel auslaufend */
  rille: number;
  /** Kieferplatte: bis zu diesem Anteil der Maullänge unter der Lippe dreht die Haut starr mit; darunter folgt die Kehlhaut der Plattenkante als Verschiebung, auslaufend über `beutel` Maullängen */
  platte: number;
  beutel: number;
  /**
   * Großer runder Haps (Phase 2, M3; Florian: „über die Mischung aus Blendshape und Knochen auch sehr kleine geschlossene
   * Mäuler sehr groß werden können“): Anteil 0 … 1, mit dem sich das Maul beim Öffnen zusätzlich zur Knochenpose rundet
   * und vergrößert — der Mundwinkel wandert nach hinten (`hapsTiefe` · Höhe) und außen (`hapsWeite`), die Lippen wölben
   * sich in der Mitte auseinander (`hapsHoehe`; Unterlippe ganz, Oberlippe 60 %), die Haut folgt bis `hapsRadius` · Höhe.
   */
  haps: number;
  hapsTiefe: number;
  hapsHoehe: number;
  hapsWeite: number;
  hapsRadius: number;
  /**
   * Kiefergelenk und Unterkiefergewichte (Plan 5.2; 14.10. spätnachts). Das Gelenk liegt am Mundwinkel plus `gelenk`
   * (Maullängen; x nach hinten, y nach oben) und wird im Fressen-Tab als Griff verschoben.
   * - „winkel“: Gewicht nach dem Winkel um das Gelenk in der Seitenansicht (0° zur Schnauze, 90° nach unten, 180° nach
   *   hinten): voll bis `kieferWinkel[0]`, null ab `kieferWinkel[1]`; mal der Reichweite (voll bis `kieferReichweite[0]`
   *   Maullängen vom Gelenk, null ab `[1]`: die Kieferlinie, hinter der Hals und Kehle bleiben). Die Drehung um das Gelenk
   *   (r, θ) → (r, θ + α·w) faltet nie, solange der Übergang breiter ist als der Öffnungswinkel; die Reichweite verdrillt
   *   nur (gemessen: Kugel 254 → 0, Langhals 304 → 0 Haut/Haut-Paare bei 25–100 %, Rex und Tiger unverändert 0).
   * - „ringe“: Band über `band` Ringe hinter dem Winkel (bis 14.10.; am großen Maul eine Naht hinter dem Mundwinkel, weil
   *   die Ringgrenze weit vom Gelenk liegt). Die Öffnungsart „ziehen“ nutzt immer das Band.
   */
  gewichte: 'winkel' | 'ringe';
  gelenk: [number, number];
  kieferWinkel: [number, number];
  kieferReichweite: [number, number];
  /**
   * Fressen-Pose (Plan 5.2; Florian 14.10.: „Bones selbst bewegen und rotieren statt mit Reglern einstellen“): Zug des
   * Unterkiefers bei Öffnung 1 in Maullängen (x zur Schnauze, y nach oben), zusätzlich zur Drehung um das Gelenk
   * (`winkelUnten`); beides am Knochen in der Seite gegriffen.
   */
  kieferZug: [number, number];
};

export const MAUL_STANDARD: MaulOptionen = { reihen: 3, tiefe: 0.9, linse: 0.03, rachenTiefe: 0.7, rachenInnen: 0.55, schaedelHinter: 0.45, lippenSchaerfe: 1e6, band: 2, bandOben: 8, nackenGanz: false, winkelUnten: 58, winkelOben: 15, oeffnungsart: 'kippen', zugWeite: 0.5, rille: 0.012, platte: 10, beutel: 0.5, haps: 0, hapsTiefe: 0.12, hapsHoehe: 0.14, hapsWeite: 0.06, hapsRadius: 0.6, gewichte: 'winkel', gelenk: [0, 0], kieferWinkel: [30, 150], kieferReichweite: [1.2, 2], kieferZug: [0, 0] };

/** Maul-Optionen je vorgefertigter Lage: vorn/unten kippen (Rex), hals zieht (Drache) mit ruhigem Schädel. */
export function maulOptionenVorlage(art: 'vorn' | 'unten' | 'hals'): Partial<MaulOptionen> {
  return art === 'hals' ? { oeffnungsart: 'ziehen', winkelOben: 4, band: 3, nackenGanz: true } : {};
}

/** Lage des Schlitzes im Gitter samt Lippenhöhen (für die Umparametrisierung) und Mundwinkel. */
export type MaulLage = SchlitzLage & {
  m: number;
  winkel: V2;
  start: V2;
  /**
   * Ringanfang (14.10. spätnachts, Florian: „beim Langhals kann ich kein Maul setzen, ohne dass die Nase zur
   * Mittellinie zusammenfällt“): Beginnt das Maul hinter dem Platz von Ring 0, behält die Schnauze ihre Ringe; die
   * Lippe beginnt am Bauchpunkt von Ring `ringA` und läuft dessen unteren Bogen hinauf bis zur Lippenzeile jL (Spalten
   * 0 … sA), dahinter auf der Zeile. Fehlt `ringA`, beginnt die Lippe in der Kappe (Spalten 0 … c/2 = Kappenzeile bL).
   */
  ringA?: number;
  /** Zahl der Anfangsspalten vor dem ersten Ring der Lippe: c/2 (Kappe) bzw. N/2 − jL (Ringanfang); Ring i ↔ Spalte sA + i − (ringA ?? 0) */
  sA: number;
  /** Plattenmaul (Phase 2, M1): Mundwinkel auf der Kastenfront bei (y, |z|); `maulKaefig` setzt die Treppe `kappenPfad` */
  platte?: { winkelY: number; winkelZ: number };
  /** rechter Arm des Plattenmauls im Kappengitter, von der Mitte (c/2, c/2) zum Winkel (Spalte a, Zeile b) */
  kappenPfad?: [number, number][];
  /** Kiefer getrennt (M2): die versetzte Kante des kürzeren Kiefers je Pfadspalte; fehlt sie, sind die Kiefer gleich. Nur Ringpfad. */
  versatz?: KieferVersatz;
};

/**
 * Versetzte Kieferkante (Kiefer getrennt) je Pfadspalte t = 0 … m: Höhe v auf der Sprosse, Höhe der Schlitzlippe an der
 * Spalte (`schlitzV`), seitliche Lage (`z` Welt-|z| bzw. `innen` Anteil der halben Breite; NaN = nicht gezeichnet), die
 * Schlitzspalte (gebrochen) ihrer Station und der Seitenpunkt (Welt) auf der gezeichneten Linie; `oben` = die Oberlippe
 * ist versetzt (Unterbiss), sonst der Unterkiefer (Überbiss).
 */
export type KieferVersatz = { oben: boolean; v: number[]; schlitzV: number[]; z: number[]; innen: number[]; xy: V2[]; quer: number[]; gezeichnet: boolean; tStirn?: number };

/** Art je Käfigpunkt: 0 Haut, 1 Lippe oben, 2 Lippe unten, 3 Tasche oben, 4 Tasche unten, 6 Winkelsäule, 7 Innenseite der Oberlippe (Kiefer getrennt; fest wie die Kette, folgt dem Schädel), 8 Zahnfleischkante des Unterkiefers (Kiefer getrennt; fest, folgt dem Unterkiefer) */
export type MaulAbleitung = {
  lage: MaulLage;
  opt: MaulOptionen;
  /** Pfadpunkte (obere Kopie = Vorlagen-Index), 0 = Naht … m = Mundwinkel; rechts und links */
  pfad: number[];
  pfadLinks: number[];
  /** untere Kopien (t = 0 … m − 1; Index 0 geteilt) */
  unten: number[];
  untenLinks: number[];
  /** Taschenreihen r = 1 … K: Index [r − 1][t] für t = 0 … m − 1; Winkelsäule [r − 1] */
  tasche: { oben: number[][]; unten: number[][]; obenLinks: number[][]; untenLinks: number[][]; winkel: number[]; winkelLinks: number[] };
  art: Uint8Array;
  /** Tiefe 0 (Lippe) … 1 (Rachenwand) für Tasche und Rachen */
  tiefe: Float64Array;
  /** Abstand zur Lippenkante (Welt) je Käfigpunkt, Unterlippenseite 0/1 */
  lippenAbstand: Float64Array;
  untenSeite: Float64Array;
  /** Herkunft (Vorlagen-Index) je Käfigpunkt, für Deskriptoren */
  quelle: Int32Array;
  /** Kiefergewichte, Scharnier des Unterkiefers (Achse z durch den Mundwinkel) und Schädelgelenk (hinten) */
  gewichtUnten: Float64Array;
  gewichtOben: Float64Array;
  scharnier: V2;
  schaedel: V2;
  /** Vorzeichen: +1 wenn die Schnauze bei kleinerem x liegt */
  vorn: number;
  hoehe: number;
  /** Zugrichtung (Welt, Seitenansicht) für „ziehen“: mittlere Richtung vom Rachen zur Lippe */
  zug: V2;
  /** Maullänge (Welt, x) */
  laenge: number;
  /** Kopfhöhe an den Maulringen (Welt): Maßstab des Lippenbands im Material */
  kopfHoehe: number;
  /**
   * Käfigpunkte, die ein Kiefer über seine Vorlage hinaus verbreitert hat, weil seine Linie breiter ist (14.10. nachts):
   * Ihre Flächen dürfen in Front und Top über die schwarze Linie hinausgehen, die Linie heftet sich dort an den Kiefer.
   */
  kieferBreiter: Uint8Array;
  /**
   * Grundlagen der Unterkiefergewichte der Vorlagenpunkte (< n0): Gewicht ohne Abfall (`unten`, `beutel`), Ringband
   * (`band`), Punkte mit Winkelgewicht (`winkelTeil`), Ruhelage (x, y) und Mundwinkel. `kieferGewichteSetzen` rechnet
   * daraus Gelenk und Gewichte neu, ohne Umbau (Griffe im Fressen-Tab).
   */
  kieferBasis: { n0: number; unten: Float64Array; beutel: Float64Array; band: Float64Array; winkelTeil: Uint8Array; ruhe: Float64Array; mundwinkel: V2; anfang: V2 };
  /** Kehlhaut unter der Kieferplatte: Gewicht je Käfigpunkt (0 = keine) und Ring, dessen Plattenkante sie folgt */
  beutelGewicht: Float64Array;
  beutelRing: Int16Array;
  /** Plattenkante je Ring (3 Werte): Lippenpunkt um die Plattendicke nach unten */
  plattenKante: Float64Array;
  /** Rachenlinie: Bogenlänge bis zum Knick, bis zum Winkelring, Eingang; Rachenziel je Pfadpunkt (3 Werte) */
  rachen: { sKnick: number; sK: number; sEingang: number; ziele: Float64Array };
};

export type MaulErgebnis = Ableitung & { maul: MaulAbleitung };

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

// ---------- Lage ----------


/** Höhe v der Maullinie beim Anteil f (linear zwischen den Stützen, außen festgehalten). */
function lippenHoehe(linie: MaulLinie, f: number): number {
  const fv = linie.fv;
  if (f <= fv[0]!.f) return fv[0]!.v;
  for (let i = 0; i + 1 < fv.length; i++) {
    const a = fv[i]!;
    const b = fv[i + 1]!;
    if (f >= a.f && f <= b.f) return b.f > a.f ? a.v + ((b.v - a.v) * (f - a.f)) / (b.f - a.f) : b.v;
  }
  return fv[fv.length - 1]!.v;
}

/** Punkt (Welt, Seitenansicht) der Sprosse beim Anteil f auf Höhe v. */
function punktBei(l: Leiter, f: number, v: number): V2 {
  const st = stationenAusLeiter(l, [f])[0]!;
  const o = zugBei(l.ruecken, st.a);
  const u = zugBei(l.bauch, st.b);
  return { x: u.x + (o.x - u.x) * v, y: u.y + (o.y - u.y) * v };
}

/** Maullinie dicht als Welt-Polygonzug (Seitenansicht), z. B. zum Zeichnen und Messen. */
export function maulLiniePunkte(dok: Dokument, linie: MaulLinie, n = 64): V2[] {
  const l = kernLeiter(dok);
  const f0 = 0;
  const f1 = linie.fv[linie.fv.length - 1]!.f;
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const f = f0 + ((f1 - f0) * i) / n;
    out.push(punktBei(l, f, lippenHoehe(linie, f)));
  }
  return out;
}

/** Lippenhöhe mindestens/höchstens auf der Sprosse (M3): die Lippe läuft nie auf der Naht (Unterkiefer ohne Dicke). */
export const LIPPE_V_MIN = 0.05; // 15.10.: 0,1 hob eine Lippe dicht über der Kinnlinie des Rex um 2 px (gerade Linie → Kerbe)
export const LIPPE_V_MAX = 0.9;
/** Sprossen kürzer als dieser Anteil der längsten Sprosse gehören zur Spitze: dort ist die Höhe Rauschen. */
const SPITZEN_ANTEIL = 0.15;
/** Konturanfänge näher als dieser Abstand (Welt, ≈ 4,6 px) an der Spitze beginnen in der Spitze. */
export const ANFANG_ABSTAND_MIN = 0.01;
/** Mindestanteil der vorderen Kappe bei einem Konturanfang f: Ring 0 liegt bei max(4/3 · f, f + 0,01). */
export function anfangKappeMin(f: number): number {
  return Math.max((4 / 3) * f, f + 0.01);
}

/** Anfang auf der Kontur (f der Bauchlinie), wenn die Linie ihn markiert (erste Stütze mit v < LIPPE_V_MIN). */
export function konturAnfang(linie: MaulLinie): number | undefined {
  const a = linie.fv[0];
  return a && a.v < LIPPE_V_MIN && a.f > 0 ? a.f : undefined;
}

/** Nächster Punkt des Seitenumrisses zu p (Welt). */
function naechsterUmrisspunkt(dok: Dokument, p: V2): V2 | null {
  const u = umrissDicht(dok);
  let best: V2 | null = null;
  let bestD = Infinity;
  for (let i = 0; i < u.pts.length; i++) {
    const a = u.pts[i]!;
    const b = u.pts[(i + 1) % u.pts.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1e-18;
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

/** Vorderster Punkt des Seitenumrisses auf der Höhe y (null, wenn der Umriss die Höhe nicht erreicht). */
function frontPunkt(dok: Dokument, y: number): V2 | null {
  const u = umrissDicht(dok);
  let best: V2 | null = null;
  for (let i = 0; i < u.pts.length; i++) {
    const a = u.pts[i]!;
    const b = u.pts[(i + 1) % u.pts.length]!;
    if ((a.y - y) * (b.y - y) > 0 || a.y === b.y) continue;
    const t = (y - a.y) / (b.y - a.y);
    const x = a.x + (b.x - a.x) * t;
    if (!best || x < best.x) best = { x, y };
  }
  return best;
}

/** Kastenfront wie in `maulLage`: die Sprosse bei f liegt praktisch in der Frontebene der Spitze. */
function frontFlach(l: Leiter, f: number): boolean {
  const st = stationenAusLeiter(l, [f])[0]!;
  const o = zugBei(l.ruecken, st.a);
  const u = zugBei(l.bauch, st.b);
  return Math.abs((o.x + u.x) / 2 - l.ruecken[0]!.x) < 0.06 * Math.hypot(o.x - u.x, o.y - u.y);
}

/**
 * Gezeichnete 2D-Linie (Welt) → Wirbelsäulen-Koordinaten (Plan „Zeichnung ist Form“, Schritt 2): Anfang auf der Kontur
 * (vorderster Konturpunkt auf der Höhe des ersten Punkts, als Stütze mit v = 0 markiert; auf oder über der Spitze, in der
 * Spitzenregion oder vor einer Kastenfront beginnt die Lippe in der Spitze bzw. Platte), dann die **Kreuzungen der Linie
 * mit den Sprossen** (Höhe v je Sprosse, nicht mehr „nächste Sprosse je Punkt“: so liegt die Lippe an jedem Ring auf der
 * gezeichneten Linie), zuletzt der Mundwinkel (Projektion des letzten Punkts). Robust gegen Florians Zeichnung (M3): die
 * Höhe wird auf [0,1 … 0,9] begrenzt, damit eine Linie auf oder außerhalb der Kontur keine Lippe auf der Naht ergibt.
 * `unterSpitze` wird mitgeliefert (1 mit Konturanfang, sonst 0).
 */
export function maulLinieAusPunkten(dok: Dokument, punkte: readonly V2[], winkelZ?: number, front?: { z: number; y: number }[], konturVorher?: boolean): MaulLinie {
  if (punkte.length < 2) throw new Error('Maullinie: zu kurz');
  const l = kernLeiter(dok);
  const spitze = l.ruecken[0]!;
  const sprossen = l.paare.map((pr) => ({ o: zugBei(l.ruecken, pr.a), u: zugBei(l.bauch, pr.b) }));
  const laengen = sprossen.map((sp) => Math.hypot(sp.o.x - sp.u.x, sp.o.y - sp.u.y));
  const lMax = Math.max(...laengen);
  const fPaare = spineAnteile(l, l.paare);
  // Anfang auf der Kontur (unter der Spitze, nicht in der Spitzenregion, keine Kastenfront)
  let anfangF: number | undefined;
  let anfangPunkt: V2 | undefined;
  const p0 = punkte[0]!;
  // Liegt der erste Punkt auf dem Umriss (Lippenanfang als Knoten der schwarzen Linie), ist er selbst der Anfang — auch
  // weit hinter der Spitze auf der Bauchseite (Maul unter der Nase, Langhals; 14.10. spätnachts: der vorderste
  // Umrisspunkt auf seiner Höhe war dort die Schnauzenspitze, die Lippe lief die ganze Schnauze entlang). Sonst wie
  // bisher der vorderste Umrisspunkt auf seiner Höhe.
  const aufUmriss = naechsterUmrisspunkt(dok, p0);
  const amUmriss = aufUmriss && Math.hypot(aufUmriss.x - p0.x, aufUmriss.y - p0.y) < 0.01 && zugAnteil(l.bauch, aufUmriss).d <= zugAnteil(l.ruecken, aufUmriss).d + 1e-9;
  if (amUmriss || p0.y < spitze.y - 1e-9) {
    const sPkt = amUmriss ? aufUmriss : frontPunkt(dok, p0.y);
    // Band um die Schwelle (14.10.): Begann die Lippe beim letzten Bau auf der Kontur, bleibt sie dort bis zum halben
    // Abstand, sonst wechselt sie erst ab dem doppelten — ein Zug um 1 px über die Schwelle hob die Lippe in eine andere
    // Kappenzeile (Kugel: 18 px Sprung)
    const abstandMin = konturVorher === true ? 0.5 * ANFANG_ABSTAND_MIN : konturVorher === false ? 2 * ANFANG_ABSTAND_MIN : ANFANG_ABSTAND_MIN;
    if (sPkt && Math.hypot(sPkt.x - spitze.x, sPkt.y - spitze.y) >= abstandMin) {
      const f = spineAnteilFuer(l, zugAnteil(l.bauch, sPkt).t, false);
      if (f > 1e-4 && !frontFlach(l, Math.max(f, ABLEIT_STANDARD.kappe))) {
        anfangF = f;
        anfangPunkt = sPkt;
      }
    }
  }
  // Spitze mit Ecke (Rex): die Lippe beginnt an der Bauchnaht der Kappenzeile (Überbiss), in einer scharfen Spitze ist
  // kein Platz für die Tasche; runde Spitze (Kugel): durch die Spitze
  const spitzeScharf = dok.profile.seite.knoten.some((kn) => kn.art === 'ecke' && !kn.marke && Math.hypot(kn.p.x * dok.skalierung - spitze.x, kn.p.y * dok.skalierung - spitze.y) < 1e-3);
  const fv: { f: number; v: number }[] = [];
  if (anfangF !== undefined) fv.push({ f: anfangF, v: 0 });
  // Kreuzungen der Linie mit den Sprossen
  for (let k = 0; k < sprossen.length; k++) {
    const f = fPaare[k]!;
    if (anfangF !== undefined ? f <= anfangF : laengen[k]! < SPITZEN_ANTEIL * lMax) continue;
    const sp = sprossen[k]!;
    const dx = sp.o.x - sp.u.x;
    const dy = sp.o.y - sp.u.y;
    let vK: number | undefined;
    for (let i = 0; i + 1 < punkte.length && vK === undefined; i++) {
      const a = punkte[i]!;
      const b = punkte[i + 1]!;
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      const det = dx * ey - dy * ex;
      if (Math.abs(det) < 1e-15) continue;
      // u + v·d = a + s·e
      const rx = a.x - sp.u.x;
      const ry = a.y - sp.u.y;
      const v = (rx * ey - ry * ex) / det;
      const sAnteil = (rx * dy - ry * dx) / det;
      if (v >= -1e-9 && v <= 1 + 1e-9 && sAnteil >= -1e-9 && sAnteil <= 1 + 1e-9) vK = v;
    }
    if (vK === undefined) continue;
    const v = Math.min(LIPPE_V_MAX, Math.max(LIPPE_V_MIN, vK));
    if (fv.length === 0 || f > fv[fv.length - 1]!.f + 1e-9) fv.push({ f, v });
  }
  // Mundwinkel: Projektion des letzten Punkts auf die nächste Sprosse
  const projektion = (p: V2) => {
    let best = { k: 0, d: Infinity, v: 0.5 };
    sprossen.forEach((sp, k) => {
      const dx = sp.o.x - sp.u.x;
      const dy = sp.o.y - sp.u.y;
      const l2 = dx * dx + dy * dy || 1;
      const v = Math.min(1, Math.max(0, ((p.x - sp.u.x) * dx + (p.y - sp.u.y) * dy) / l2));
      const d = Math.hypot(sp.u.x + dx * v - p.x, sp.u.y + dy * v - p.y);
      if (d < best.d) best = { k, d, v };
    });
    return best;
  };
  const pEnde = punkte[punkte.length - 1]!;
  const best = projektion(pEnde);
  const fEnde = fPaare[best.k]!;
  const vEnde = Math.min(LIPPE_V_MAX, Math.max(LIPPE_V_MIN, best.v));
  if (fv.length === 0 || fEnde > fv[fv.length - 1]!.f + 1e-9) fv.push({ f: fEnde, v: vEnde });
  else fv[fv.length - 1] = { f: fv[fv.length - 1]!.f, v: vEnde };
  const seitlich = winkelZ !== undefined && Number.isFinite(winkelZ) && Math.abs(winkelZ) > 1e-6;
  if (fv.length < 2 && seitlich) {
    // Linie quer auf einer Kastenfront (Stern im Front-Blatt, Phase 2 M1): keine Sprossen-Kreuzung, alle Punkte auf
    // der Platte → Anfang = Projektion des ersten Punkts (Höhe der Plattenmitte), Ende ein Hauch dahinter; die Treppe
    // auf der Platte kommt aus `front`, das Scharnier aus der Plattenregel in `maulLage`
    const start = projektion(p0);
    const f0 = fPaare[start.k]!;
    const v0 = Math.min(LIPPE_V_MAX, Math.max(LIPPE_V_MIN, start.v));
    const ende = fv[0] ?? { f: fEnde, v: vEnde };
    fv.length = 0;
    fv.push({ f: f0, v: v0 }, { f: Math.max(ende.f, f0 + 0.01), v: ende.v });
  }
  if (fv.length < 2) throw new Error('Maullinie: zu kurz');
  return { fv, unterSpitze: anfangF !== undefined || spitzeScharf ? 1 : 0, ...(anfangPunkt ? { anfang: anfangPunkt } : {}), winkel: { x: pEnde.x, y: pEnde.y }, ...(seitlich ? { winkelZ } : {}), ...(front && front.length >= 2 ? { front } : {}) };
}

/** Anteil f und Sprossenhöhe v eines Punkts (Welt, Seitenansicht) zwischen den Sprossen der Leiter; vor der ersten Sprosse in der Spitze. */
function anteilUndHoehe(l: Leiter, p: V2): { f: number; v: number } {
  const fP = spineAnteile(l, l.paare);
  const spr = l.paare.map((pr) => ({ o: zugBei(l.ruecken, pr.a), u: zugBei(l.bauch, pr.b) }));
  const hoeheAuf = (k: number): number => {
    const sp = spr[k]!;
    const dx = sp.o.x - sp.u.x;
    const dy = sp.o.y - sp.u.y;
    return ((p.x - sp.u.x) * dx + (p.y - sp.u.y) * dy) / (dx * dx + dy * dy || 1);
  };
  // vorzeichenbehafteter Abstand zur Sprossenlinie k, positiv in Richtung der folgenden Sprossen
  const abstand = (k: number): number => {
    const sp = spr[k]!;
    const dx = sp.o.x - sp.u.x;
    const dy = sp.o.y - sp.u.y;
    const nl = Math.hypot(dx, dy) || 1;
    const nx = -dy / nl;
    const ny = dx / nl;
    const d = (p.x - sp.u.x) * nx + (p.y - sp.u.y) * ny;
    const na = spr[Math.min(spr.length - 1, k + 1)]!;
    const vo = spr[Math.max(0, k - 1)]!;
    const richt = (na.u.x + na.o.x - vo.u.x - vo.o.x) * nx + (na.u.y + na.o.y - vo.u.y - vo.o.y) * ny;
    return richt >= 0 ? d : -d;
  };
  for (let k = 0; k + 1 < spr.length; k++) {
    const da = abstand(k);
    const db = abstand(k + 1);
    if (da >= 0 && db <= 0) {
      const t = da - db > 1e-12 ? da / (da - db) : 0;
      return { f: fP[k]! + (fP[k + 1]! - fP[k]!) * t, v: hoeheAuf(k) + (hoeheAuf(k + 1) - hoeheAuf(k)) * t };
    }
  }
  if (spr.length > 0 && abstand(0) < 0) {
    // vor der ersten Sprosse (Spitze): Anteil längs der Strecke Spitze → Sprossenmitte
    const s0 = spr[0]!;
    const tip = l.ruecken[0]!;
    const ex = (s0.o.x + s0.u.x) / 2 - tip.x;
    const ey = (s0.o.y + s0.u.y) / 2 - tip.y;
    const t = Math.min(1, Math.max(0, ((p.x - tip.x) * ex + (p.y - tip.y) * ey) / (ex * ex + ey * ey || 1)));
    return { f: fP[0]! * t, v: Math.min(1, Math.max(0, hoeheAuf(0))) };
  }
  const k = Math.max(0, spr.length - 1);
  return { f: fP[k] ?? 0, v: Math.min(1, Math.max(0, spr.length ? hoeheAuf(k) : 0.5)) };
}

/** Wirbelsäulen-Anteil eines Punkts (Welt, Seitenansicht), z. B. um zu entscheiden, welche Lippenlinie weiter vorn beginnt. */
export function maulAnteil(dok: Dokument, p: V2): number {
  return anteilUndHoehe(kernLeiter(dok), p).f;
}

/**
 * Gezeichnete versetzte Kieferkante (Kiefer getrennt, M2: Unterkiefer beim Überbiss, Oberkiefer beim Unterbiss) →
 * Stützen (f, v, z): ihr **eigener Anfang** (der erste gezeichnete Punkt selbst, zwischen den Sprossen; kein
 * Konturanfang — die Kante beginnt hinter der Spitze im anderen Kiefer), dann die Kreuzungen mit den Sprossen und der
 * Endpunkt. Die dritte Koordinate (Front) gibt je Stütze die seitliche Lage |z|; eine Linie ohne Tiefe (alle z = 0,
 * z. B. nur in der Seite gesetzt) gibt keine seitliche Lage vor.
 */
export function maulLinieUntenAusPunkten(dok: Dokument, punkte: readonly (readonly [number, number, number])[]): KieferStuetze[] {
  if (punkte.length < 2) throw new Error('Kieferkante: zu kurz');
  const p2 = punkte.map((p) => ({ x: p[0], y: p[1] }));
  const leiter = kernLeiter(dok);
  const start = anteilUndHoehe(leiter, p2[0]!);
  const l = maulLinieAusPunkten(dok, p2);
  const fv: KieferStuetze[] = [{ f: start.f, v: Math.max(0.02, Math.min(0.98, start.v)) }];
  for (const q of l.anfang ? l.fv.slice(1) : l.fv) if (q.f > start.f + 1e-6) fv.push({ f: q.f, v: q.v });
  if (!punkte.some((p) => Math.abs(p[2]) > 1e-6)) return fv;
  return fv.map((q, i) => {
    if (i === 0) return { ...q, z: Math.abs(punkte[0]![2]) };
    const w = punktBei(leiter, q.f, q.v);
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k + 1 < punkte.length; k++) {
      const a = punkte[k]!;
      const b = punkte[k + 1]!;
      const abx = b[0] - a[0];
      const aby = b[1] - a[1];
      const l2 = abx * abx + aby * aby || 1;
      const u = Math.min(1, Math.max(0, ((w.x - a[0]) * abx + (w.y - a[1]) * aby) / l2));
      const d = Math.hypot(a[0] + abx * u - w.x, a[1] + aby * u - w.y);
      if (d < bestD) {
        bestD = d;
        best = Math.abs(a[2] + (b[2] - a[2]) * u);
      }
    }
    return { ...q, z: best };
  });
}

/** Versetzte Kante (Kiefer getrennt): `unten` (Überbiss, Unterkiefer versetzt) oder `oben` (Unterbiss, Oberkiefer versetzt). */
function kieferVersatz(linie: MaulLinie): { oben: boolean; stuetzen: KieferStuetze[]; punkte?: readonly (readonly [number, number, number])[] } | undefined {
  if (linie.unten && linie.unten.length >= 2) return { oben: false, stuetzen: linie.unten, ...(linie.untenPunkte && linie.untenPunkte.length >= 2 ? { punkte: linie.untenPunkte } : {}) };
  if (linie.oben && linie.oben.length >= 2) return { oben: true, stuetzen: linie.oben, ...(linie.obenPunkte && linie.obenPunkte.length >= 2 ? { punkte: linie.obenPunkte } : {}) };
  return undefined;
}

/** Polygonzug (3D) nach Bogenlänge: Summen, Punkt bei s, erster Punkt mit gegebenem x (längs der Zugrichtung). */
function zugWerkzeuge(zug: readonly (readonly [number, number, number])[]) {
  const sN: number[] = [0];
  for (let q = 1; q < zug.length; q++) sN.push(sN[q - 1]! + Math.hypot(zug[q]![0] - zug[q - 1]![0], zug[q]![1] - zug[q - 1]![1], zug[q]![2] - zug[q - 1]![2]));
  const sEnde = sN[sN.length - 1]!;
  const mix = (a: readonly [number, number, number], b: readonly [number, number, number], u: number): [number, number, number] => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  const bei = (sWert: number): [number, number, number] => {
    const sv = Math.max(0, Math.min(sEnde, sWert));
    for (let q = 0; q + 1 < zug.length; q++) {
      if (sv <= sN[q + 1]!) {
        const len = sN[q + 1]! - sN[q]!;
        return mix(zug[q]!, zug[q + 1]!, len > 1e-12 ? (sv - sN[q]!) / len : 0);
      }
    }
    return [zug[zug.length - 1]![0], zug[zug.length - 1]![1], zug[zug.length - 1]![2]];
  };
  const beiX = (x: number): { p: [number, number, number]; s: number } | null => {
    for (let q = 0; q + 1 < zug.length; q++) {
      const a = zug[q]![0];
      const b = zug[q + 1]![0];
      if ((a - x) * (b - x) <= 0 && Math.abs(b - a) > 1e-12) {
        const u = (x - a) / (b - a);
        return { p: mix(zug[q]!, zug[q + 1]!, u), s: sN[q]! + u * (sN[q + 1]! - sN[q]!) };
      }
    }
    return null;
  };
  return { sN, sEnde, bei, beiX };
}

/**
 * Lage des Schlitzes: Kappenzeile durch die Spitze, Längsschleife j_L, Lippenhöhe je Ring und Quadratring aus der Linie,
 * Winkelring = Ring mit dem Wirbelsäulen-Anteil des Mundwinkels; seine Station wird auf den Winkel gelegt (der Ring
 * rastet auf den Winkel, nicht der Winkel auf den Ring), solange die Reihenfolge der Stationen bleibt.
 */
/** Plattenmaul: Rachen und Scharnier bei diesem Anteil der Wirbelsäule hinter der Platte (Tiger: Ring 4 von 24). */
const PLATTE_SCHARNIER = 0.08;

export function maulLage(v: Roehre, l: Leiter, st: Stationen, linie: MaulLinie, ringAnfang = false, gefroren?: MaulStationen): MaulLage {
  const { R, c, N } = v;
  if (linie.fv.length < 2) throw new Error('Maullinie braucht mindestens zwei Stützen');
  // Kastenfront: Ring 0 liegt praktisch in der Frontebene (Vorschub der Sprosse gegenüber der Spitze < 6 % ihrer Höhe);
  // dann geht die Lippe durch die Spitze (`kastenKappe` legt die Kappe als ebenes Gitter um die Lippenhöhe), ein Anfang
  // unter der Spitze träfe sonst eine Kappenzeile, die nicht auf Lippenhöhe liegt.
  const sp0 = sprossenVon(l, [st.ringe[0]!])[0]!;
  const flach = Math.abs((sp0.o.x + sp0.u.x) / 2 - l.ruecken[0]!.x) < 0.06 * Math.hypot(sp0.o.x - sp0.u.x, sp0.o.y - sp0.u.y);
  const anfang = konturAnfang(linie);
  // Ringanfang: die Kappe bleibt Nasenspitze (keine Lippenzeile in ihr), die Lippe beginnt an einem Ring
  const ringStart = ringAnfang && !flach && anfang !== undefined && !!linie.punkte && linie.punkte.length >= 2;
  const rS = flach || ringStart ? 0 : Math.min(c / 2 - 1, Math.max(anfang !== undefined ? 1 : 0, Math.round(linie.unterSpitze ?? 0)));
  const bL = c / 2 - rS;
  const jL = (3 * c) / 2 - bL;
  const versatz = kieferVersatz(linie);
  const ende = linie.fv[linie.fv.length - 1]!;
  const fRinge = spineAnteile(l, st.ringe);
  // Anfang auf der Kontur: Ziel der Bauchnaht der Lippen-Kappenzeile ist der gezeichnete Anfang (Bauchpunkt bei f;
  // `zieleBerechnen` setzt den Punkt dorthin). Liegt der Anfang hinter der Kappenzeile, rückt die Zeile auf seinen
  // Anteil (sonst läuft die Lippe von der Zeile rückwärts zum Anfang und faltet sich: Rex 2 Durchdringungen); liegt er
  // davor, bleibt die Zeile, wo sie ist (auf runden Spitzen wäre der Quadratring am Anfang winzig: Kugel 136
  // Durchdringungen). Die Zeile bleibt mindestens ein Viertel des Abstands vor Ring 0.
  let anfangPunkt: V2 | undefined;
  if (ringStart) anfangPunkt = linie.anfang ?? punktBei(l, anfang!, 0);
  else if (anfang !== undefined && rS >= 1) {
    const kappen = st.kappen.vorn;
    const fK = spineAnteile(l, kappen);
    if (anfang > fK[rS - 1]!) {
      const vorher = rS >= 2 ? fK[rS - 2]! : 0;
      const nachher = rS < kappen.length ? fK[rS]! : fRinge[0]!;
      kappen[rS - 1] = stationenAusLeiter(l, [Math.min(nachher - 0.25 * (nachher - vorher), anfang)])[0]!;
    }
    anfangPunkt = linie.anfang ?? punktBei(l, anfang, 0);
  }
  const spitze = l.ruecken[0]!;
  const winkel = linie.winkel ?? punktBei(l, ende.f, ende.v);
  // Plattenmaul (Phase 2, M1): Kastenfront, seitliche Winkellage bekannt, Winkel liegt auf der Platte (x wie die Spitze)
  // → kein Ringpfad (die Ringe behalten ihre Teilung), Rachen und Scharnier am Ring hinter der Platte bei
  // `PLATTE_SCHARNIER` der Länge (mindestens Ring 2): ein Winkel auf der Platte hat f ≈ 0, das Scharnier läge sonst
  // direkt hinter der Platte und die Tasche wäre zu flach (Durchdringungen beim Öffnen)
  let platte: { winkelY: number; winkelZ: number } | undefined;
  if (flach && linie.winkelZ !== undefined && Number.isFinite(linie.winkelZ)) {
    const H0 = Math.hypot(sp0.o.x - sp0.u.x, sp0.o.y - sp0.u.y);
    if (Math.abs(winkel.x - spitze.x) < 0.1 * H0) platte = { winkelY: winkel.y, winkelZ: Math.abs(linie.winkelZ) };
  }
  const fScharnier = platte ? Math.max(ende.f, PLATTE_SCHARNIER) : ende.f;
  let k = 1;
  for (let i = 1; i <= R - 2; i++) if (Math.abs(fRinge[i]! - fScharnier) < Math.abs(fRinge[k]! - fScharnier)) k = i;
  if (platte) k = Math.max(k, Math.min(R - 2, 2));
  // eingefrorener Winkelring (14.10.): bleibt, solange der Winkel zwischen seinen Nachbarringen liegt — sonst kippte die
  // Wahl „nächster Ring“ beim Ziehen eines Anfangs zwischen zwei Ringen hin und her (der Anteil des Winkels wandert mit der Leiter)
  const gw = gefroren?.winkel;
  if (!platte && gw !== undefined && gw >= 1 && gw <= R - 2 && fScharnier > fRinge[gw - 1]! && fScharnier < fRinge[gw + 1]!) k = gw;
  const vorher = fRinge[k - 1]!;
  const nachher = fRinge[k + 1]!;
  // Winkelring auf den Winkel rasten (nicht beim Plattenmaul: dort ist der Winkel kein Ringpunkt)
  if (!platte && ende.f > vorher && ende.f < nachher) {
    st.ringe[k] = stationenAusLeiter(l, [ende.f])[0]!;
    fRinge[k] = ende.f;
  }
  // Ringanfang (14.10. spätnachts): Die Ringe vor dem Maul (Nase) liegen vor beiden Lippenanfängen, Ring i0 hinter beiden
  // und hinter dem Bogen der Linie um die Mundfront (Tiefe erstmals 60 % der größten, 8–35 % ihrer Länge); sein unterer
  // Bogen trägt die Mundfront beider Lippen. Ringe zwischen den Anfängen hätten den kürzeren Kiefer vor seinem Anfang
  // (Flosse) — sie rücken ins Maul. Die Maulringe i0 … k liegen gleichmäßig (sonst schwingt die genau gelöste Lippe:
  // eine Spalte lief vor die vorige). Ohne Ring zwischen i0 und dem Winkel bleibt es beim Kappenanfang.
  let ringA: number | undefined;
  if (ringStart && k >= 2) {
    const zug = linie.punkte!;
    const len = [0];
    let zMax = 0;
    for (let q = 1; q < zug.length; q++) len.push(len[q - 1]! + Math.hypot(zug[q]![0] - zug[q - 1]![0], zug[q]![1] - zug[q - 1]![1], zug[q]![2] - zug[q - 1]![2]));
    for (const q of zug) zMax = Math.max(zMax, Math.abs(q[2]));
    const L = len[len.length - 1]! || 1;
    let qs = zug.length - 1;
    for (let q = 0; q < zug.length; q++) {
      if (len[q]! < 0.08 * L) continue;
      if (Math.abs(zug[q]![2]) >= 0.6 * zMax || len[q]! >= 0.35 * L) {
        qs = q;
        break;
      }
    }
    const fBogen = anteilUndHoehe(l, { x: zug[qs]![0], y: zug[qs]![1] }).f;
    const fV = versatz?.stuetzen[0]?.f;
    const fVorn = Math.min(anfang!, fV ?? anfang!);
    const fHinten = Math.max(anfang!, fV ?? anfang!);
    const spanne = Math.max(1e-6, ende.f - fVorn);
    const fZiel = Math.min(ende.f - 0.2 * spanne, Math.max(fBogen, fHinten + 0.12 * spanne));
    // erster Ring, der nicht mehr vor beiden Anfängen liegt, wird i0
    let i0 = 1;
    while (i0 < k && fRinge[i0]! < fVorn - 0.06 * spanne) i0++;
    // eingefrorener Ringanfang (14.10.): bleibt, solange der Ring davor noch vor beiden Anfängen liegt
    const ga = gefroren?.ringA;
    if (ga !== undefined && ga >= 1 && ga <= k - 2 && fRinge[ga - 1]! < fVorn - 0.06 * spanne) i0 = ga;
    const geschuetzt = (i: number) => st.ecken.some((e) => e.ring === i) || st.reifen.some((r) => r.ring === i);
    let frei = true;
    for (let i = i0; i < k; i++) if (geschuetzt(i)) frei = false;
    if (frei && i0 <= k - 2 && fZiel > fRinge[i0 - 1]!) {
      const neuF = (i: number) => fZiel + ((ende.f - fZiel) * (i - i0)) / (k - i0);
      const neu = [];
      for (let i = i0; i < k; i++) neu.push(neuF(i));
      const stn = stationenAusLeiter(l, neu);
      for (let i = i0; i < k; i++) {
        st.ringe[i] = stn[i - i0]!;
        fRinge[i] = neu[i - i0]!;
      }
      ringA = i0;
    }
  }
  const ringA0 = ringA ?? 0;
  const sA = ringA !== undefined ? N / 2 - jL : c / 2;
  const vRing = new Float64Array(R).fill(NaN);
  for (let i = ringA0; i < k; i++) vRing[i] = lippenHoehe(linie, fRinge[i]!);
  vRing[k] = ende.v;
  if (platte) {
    // Mitte der Platte auf der gezeichneten Starthöhe, keine Ringlippe
    vRing[0] = linie.fv[0]!.v;
    for (let i = 1; i < R; i++) vRing[i] = NaN;
  }
  const fKappen = spineAnteile(l, st.kappen.vorn);
  const vKappe = new Float64Array(c / 2).fill(NaN);
  if (ringA === undefined) for (let r = 1; r < c / 2; r++) vKappe[r] = lippenHoehe(linie, fKappen[r - 1]!);
  const front = platte && linie.front && linie.front.length >= 2 ? linie.front : undefined;
  // Kiefer getrennt (M2, Florians Grundbedingung): die versetzte Kante (Überbiss: blau = Unterkiefer, Unterbiss: rot =
  // Oberkiefer) hat ihren **eigenen Anfang** auf der Spiegelebene (erste Stütze, hinter dem Schlitzanfang) und endet im
  // Mundwinkel. Ihre Spalten t = 0 … m laufen über ihren eigenen Anteilsbereich [f₀, f_Winkel], verteilt wie die
  // Schlitzspalten; je Spalte: Höhe v, Seitenpunkt (Welt, auf der Sprosse — so liegt die Kante in der Seite auf der
  // gezeichneten Linie), seitliche Lage (z | innen) und die Schlitzspalte (gebrochen), an deren Station sie liegt.
  let vs: KieferVersatz | undefined;
  if (!platte && versatz) {
    const lu = versatz.stuetzen;
    const stuetze = (f: number, wert: (q: KieferStuetze) => number | undefined): number => {
      if (f <= lu[0]!.f) return wert(lu[0]!) ?? NaN;
      for (let q = 0; q + 1 < lu.length; q++) {
        const a = lu[q]!;
        const b = lu[q + 1]!;
        if (f >= a.f && f <= b.f) {
          const wa = wert(a);
          const wb = wert(b);
          if (wa === undefined || wb === undefined) return NaN;
          return b.f > a.f ? wa + ((wb - wa) * (f - a.f)) / (b.f - a.f) : wb;
        }
      }
      return wert(lu[lu.length - 1]!) ?? NaN;
    };
    const mPfad = sA + k - ringA0;
    const fSpalte: number[] = [];
    for (let t = 0; t <= mPfad; t++) {
      if (t < sA && ringA === undefined) {
        const r = Math.max(t, rS);
        fSpalte.push(r === 0 ? 0 : fKappen[r - 1]!);
      } else if (t < sA) fSpalte.push(fRinge[ringA0]!); // Startbogen auf Ring i0
      else fSpalte.push(fRinge[ringA0 + t - sA]!); // Spalte sA ist der erste Ring der Lippe
    }
    const fAnfang = fSpalte[0]!;
    const fEnde = fSpalte[mPfad]!;
    const spanne = Math.max(1e-9, fEnde - fAnfang);
    vs = { oben: versatz.oben, v: [], schlitzV: [], z: [], innen: [], xy: [], quer: [], gezeichnet: false };
    const zug = versatz.punkte;
    if (zug && zug.length >= 2) {
      // Gezeichnete Linie (Editor): Die Kante liegt exakt auf ihr. Ringspalten hinter dem eigenen Anfang nehmen den
      // Punkt der Linie am x ihrer Station (so bleibt die Kante in der Ringebene ihres Kiefers), die Spalten davor
      // (Kappe und Ringe vor dem Anfang) verteilen sich nach Bogenlänge vom Anfang bis zur ersten Ringspalte dahinter —
      // die Linie selbst beschreibt dort den Bogen um die Stirn des Kiefers (Seite, Front und Top zugleich).
      vs.gezeichnet = true;
      const w = zugWerkzeuge(zug);
      const laengs = Math.sign(zug[zug.length - 1]![0] - zug[0]![0]) || 1;
      const stationX = (f: number): number => {
        const stn = stationenAusLeiter(l, [f])[0]!;
        const o = zugBei(l.ruecken, stn.a);
        const u = zugBei(l.bauch, stn.b);
        return (o.x + u.x) / 2;
      };
      const punkte: ([number, number, number] | null)[] = new Array(mPfad + 1).fill(null);
      const sVon: number[] = new Array(mPfad + 1).fill(NaN);
      let tHinten = mPfad;
      // Ringanfang: der eigene Anfang liegt vor Ring i0 (siehe oben), die Spalte sA ist Ring i0 selbst
      for (let t = ringA !== undefined ? sA : sA + 1; t < mPfad; t++) {
        const x = stationX(fSpalte[t]!);
        if ((x - zug[0]![0]) * laengs <= 0) continue;
        const q = w.beiX(x);
        if (!q) continue;
        punkte[t] = q.p;
        sVon[t] = q.s;
        if (tHinten === mPfad) tHinten = t;
      }
      // Stirn des kürzeren Kiefers (14.10. spätnachts, Florians Kerbe und Flosse beim Vorziehen): Die Spalten vor der
      // ersten Ringspalte verteilen sich über mindestens 40 % der Linie (gemessen: 10 % Kerbe 175°, 20 % 77°, 30 % 54°,
      // 40 % ≤ 27°). Lag die erste Ringspalte direkt hinter
      // dem Anfang, drängten sich Kappen- und Ringspalten auf einem winzigen Bogen, und die Ringe davor wurden auf einen
      // Fleck an der Spitze gefaltet (Kerbe zwischen den Augen, Flosse vorn am Unterkiefer)
      if (ringA === undefined) {
        const dStirn = 0.4 * w.sEnde;
        while (tHinten < mPfad - 1 && (punkte[tHinten] === null || sVon[tHinten]! < dStirn)) tHinten++;
      }
      vs.tStirn = tHinten;
      const sErst = tHinten < mPfad ? sVon[tHinten]! : w.sEnde;
      for (let t = 0; t < tHinten; t++) punkte[t] = w.bei((sErst * t) / tHinten);
      // Ringspalten hinter der ersten ohne Kreuzung (Linie endet davor): nach Stationsanteil bis zum Winkel
      for (let t = tHinten + 1; t < mPfad; t++) if (!punkte[t]) punkte[t] = w.bei(sErst + ((w.sEnde - sErst) * (fSpalte[t]! - fSpalte[tHinten]!)) / Math.max(1e-9, fEnde - fSpalte[tHinten]!));
      for (let t = 0; t <= mPfad; t++) {
        const q = t === mPfad ? null : punkte[t];
        const xy: V2 = q ? { x: q[0], y: q[1] } : winkel;
        vs.xy.push(xy);
        vs.z.push(t === 0 || t === mPfad ? (t === 0 ? 0 : NaN) : Math.abs(q![2]));
        vs.innen.push(NaN);
        vs.v.push(t === mPfad ? ende.v : Math.max(0.02, Math.min(0.98, anteilUndHoehe(l, xy).v)));
        vs.schlitzV.push(t === mPfad ? ende.v : lippenHoehe(linie, fSpalte[t]!));
        vs.quer.push(1);
      }
    } else {
      // Stützen (Prüfwesen): Spalten über den eigenen Anteilsbereich [f₀, f_Winkel]; Ringspalten nach Station, die
      // Kappenspalten als Viertelbogen um die Stirn (längs 1 − cos bis Ring 0, quer sin bis zur vollen Breite)
      const fV0 = Math.max(fAnfang, Math.min(lu[0]!.f, fEnde - 1e-6));
      const gRing0 = (fSpalte[sA]! - fAnfang) / spanne;
      const winkelVon = (t: number): number => (Math.PI / 2) * Math.min(1, t / sA);
      const gVon = (t: number): number => (t <= sA ? gRing0 * (1 - Math.cos(winkelVon(t))) : (fSpalte[t]! - fAnfang) / spanne);
      for (let t = 0; t <= mPfad; t++) {
        const fT = t === mPfad ? fEnde : fV0 + gVon(t) * (fEnde - fV0);
        vs.quer.push(Math.sin(winkelVon(t)));
        const vO = t === mPfad ? ende.v : lippenHoehe(linie, fSpalte[t]!);
        const vV = t === mPfad ? ende.v : Math.max(0.02, Math.min(0.98, stuetze(fT, (q) => q.v)));
        vs.v.push(vV);
        vs.schlitzV.push(vO);
        vs.z.push(t === mPfad ? NaN : stuetze(fT, (q) => q.z));
        vs.innen.push(t === mPfad ? NaN : stuetze(fT, (q) => q.innen));
        vs.xy.push(t === mPfad ? winkel : punktBei(l, fT, vV));
      }
    }
  }
  return { bL, jL, k, m: sA + k - ringA0, sA, ...(ringA !== undefined ? { ringA } : {}), vRing, vKappe, ...(vs ? { versatz: vs } : {}), ...(anfangPunkt && ringA === undefined ? { anfang: anfangPunkt } : {}), ...(platte ? { platte } : {}), ...(front ? { front } : {}), winkel, start: anfangPunkt ?? { x: spitze.x, y: spitze.y } };
}

/** Plattenmaul: Treppe im Kappengitter von der Mitte (c/2, c/2) zum inneren Winkel (aW, bW), abwechselnd seitwärts und abwärts. */
export function plattenTreppe(c: number, aW: number, bW: number): [number, number][] {
  const out: [number, number][] = [[c / 2, c / 2]];
  let a = c / 2;
  let b = c / 2;
  while (a < aW || b > bW) {
    if (a < aW && (b <= bW || a - c / 2 <= c / 2 - b)) a++;
    else b--;
    out.push([a, b]);
  }
  return out;
}

// ---------- Topologie ----------

type Lage3 = { art: 'ring'; i: number; j: number } | { art: 'vorn' | 'hinten'; a: number; b: number };

/** Gitterstelle eines Vorlagen-Index (Ring i, j oder Kappe a, b); Ring-0/R−1-Punkte bleiben Ringe. */
function gitterLage(v: Roehre, idx: number): Lage3 {
  const { R, N, c } = v;
  const innen = (c - 1) * (c - 1);
  const vornStart = R * N;
  if (idx < vornStart) return { art: 'ring', i: Math.floor(idx / N), j: idx % N };
  const seite = idx < vornStart + innen ? 'vorn' : 'hinten';
  const q = idx - (seite === 'vorn' ? vornStart : vornStart + innen);
  return { art: seite, a: (q % (c - 1)) + 1, b: Math.floor(q / (c - 1)) + 1 };
}

/** Umkehrung von randJ: Ringindex j von Ring 0 → Kappenrand (a, b). */
function randAB(c: number, j: number): [number, number] {
  if (j <= c / 2) return [c / 2 + j, c];
  if (j <= (3 * c) / 2) return [c, (3 * c) / 2 - j];
  if (j <= (5 * c) / 2) return [(5 * c) / 2 - j, 0];
  if (j <= (7 * c) / 2) return [0, j - (5 * c) / 2];
  return [j - (7 * c) / 2, c];
}

const lerp3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const richtung = (a: [number, number, number], b: [number, number, number]): [number, number, number] => {
  const d: [number, number, number] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(...d) || 1;
  return [d[0] / l, d[1] / l, d[2] / l];
};

/**
 * Breite einer Kieferzeile, wenn der Kiefer seiner Lippe folgt (Verhältnis `a` = Linie / Vorlage an der Lippe): schmaler
 * wird der Querschnitt gestreckt (er bleibt die Vorlage, von oben folgt der Kiefer der Rundung seiner Linie); breiter
 * ebenso, aber nie über die Lippe oder die Vorlage selbst hinaus (weich begrenzt). Eine an der Lippe abgeschnittene
 * Vorlage (vorn am Schlitz, wo die Sehne den Ring kappt: Verhältnis 2,9) wüchse sonst über den Körper (Top 45 px).
 */
function kieferZ(z: number, a: number, zLippe: number): number {
  if (a <= 1) return z * a;
  const zs = Math.abs(z) * a;
  const grenze = Math.max(Math.abs(z), zLippe);
  const k = 0.04 * zLippe;
  return Math.sign(z) * 0.5 * (zs + grenze - Math.sqrt((zs - grenze) * (zs - grenze) + k * k));
}

const glattStufe = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Gewicht der Breitenpunkte im Maulbau (Phase 2 M3; ohne Maul 16): stark genug für das Top, schwach genug für die Pose. */
export const BREITE_MIT_MAUL = 4;

/** Optionen, die nur Gewichte und Pose betreffen (kein Umbau des Käfigs; Griffe und Regler im Fressen-Tab). */
export const MAUL_POSE_OPTIONEN = ['winkelUnten', 'winkelOben', 'zugWeite', 'oeffnungsart', 'haps', 'hapsTiefe', 'hapsHoehe', 'hapsWeite', 'hapsRadius', 'gewichte', 'gelenk', 'kieferWinkel', 'kieferReichweite', 'kieferZug'] as const;

/** Kiefergelenk (Welt, Seitenansicht): Mundwinkel plus Versatz in Maullängen (x nach hinten, y nach oben). */
export function kieferGelenk(m: MaulAbleitung, opt: Pick<MaulOptionen, 'gelenk'>): V2 {
  const w = m.kieferBasis.mundwinkel;
  return { x: w.x - m.vorn * opt.gelenk[0] * m.laenge, y: w.y + opt.gelenk[1] * m.laenge };
}

/**
 * Unterkiefergewicht eines Punkts (Seitenansicht) nach Winkel und Reichweite um das Gelenk (`MaulOptionen.gewichte`):
 * 0° zur Schnauze, 90° nach unten, 180° nach hinten; voll bis `kieferWinkel[0]`, null ab `[1]` (glatt), mal der
 * Reichweite in Maullängen (voll bis `kieferReichweite[0]`, null ab `[1]` = Kieferlinie).
 */
export function gelenkGewicht(x: number, y: number, gelenk: V2, vorn: number, laenge: number, opt: Pick<MaulOptionen, 'kieferWinkel' | 'kieferReichweite'>, rMin = 0): number {
  const vx = (x - gelenk.x) * vorn; // > 0: zur Schnauze
  const vy = y - gelenk.y;
  let th = (Math.atan2(-vy, vx) * 180) / Math.PI;
  if (th < -90) th += 360; // über und hinter dem Gelenk: jenseits des Übergangs
  const [a1, a2] = opt.kieferWinkel;
  // glatt im Winkel (gemessen gegen linear: am dünnen Langhals-Kiefer, der nur 0–40° überspannt, knickte linear ab 30°
  // die Kieferunterseite, offen 55–88° statt 28–44°; die Kugel hinter dem Winkel 100° statt 73°)
  const wt = th <= a1 ? 1 : th >= a2 ? 0 : 1 - glattStufe((th - a1) / Math.max(1e-9, a2 - a1));
  const r = Math.hypot(vx, vy);
  // der Kiefer selbst bleibt starr: der Auslauf beginnt frühestens am vorderen Maulanfang (`rMin`), sonst drehte das Kinn
  // bei weit hinten liegendem Gelenk nicht ganz mit (Flosse an der Kieferspitze, 14.10.)
  const r1 = Math.max(opt.kieferReichweite[0] * laenge, rMin);
  const r2 = Math.max(opt.kieferReichweite[1] * laenge, r1 + 0.15 * laenge);
  const wr = r <= r1 ? 1 : r >= r2 ? 0 : 1 - glattStufe((r - r1) / Math.max(1e-9, r2 - r1));
  return wt * wr;
}

/**
 * Unterkiefergewichte und Gelenk aus der Basis neu setzen (Plan 5.2, Fressen-Tab): Gelenk, Übergang, Reichweite und
 * Gewichtsart wirken ohne Umbau des Käfigs. „winkel“ nur beim Kippen und ohne `nackenGanz`, sonst das Ringband.
 */
export function kieferGewichteSetzen(m: MaulAbleitung, opt: MaulOptionen): void {
  const b = m.kieferBasis;
  const g = kieferGelenk(m, opt);
  const winkel = opt.gewichte === 'winkel' && opt.oeffnungsart !== 'ziehen' && !opt.nackenGanz;
  const rMin = 1.05 * Math.hypot(b.anfang.x - g.x, b.anfang.y - g.y);
  for (let i = 0; i < b.n0; i++) {
    const f = winkel && b.winkelTeil[i] ? gelenkGewicht(b.ruhe[2 * i]!, b.ruhe[2 * i + 1]!, g, m.vorn, m.laenge, opt, rMin) : b.band[i]!;
    m.gewichtUnten[i] = b.unten[i]! * f;
    m.beutelGewicht[i] = b.beutel[i]! * f;
  }
  m.scharnier = g;
}

/**
 * Käfig mit Maul aus der Vorlage: Schlitz entlang des Pfads, Tasche, Rachengitter; Ziele für alle Punkte (geschlossen).
 * Die Vorlagen-Indizes bleiben gültig (obere Kopien), neue Punkte hängen an.
 */
export function maulKaefig(v: Roehre, st: Stationen, lage: MaulLage, zieleV: Float64Array, hoeheV: Float64Array, opt: MaulOptionen, schlitzPunkte?: readonly (readonly [number, number, number])[], kieferUmriss?: readonly V2[]): { kaefig: Kaefig; ziele: Float64Array; hoehe: Float64Array; info: MaulAbleitung } {
  const { N, c } = v;
  const n0 = v.kaefig.n;
  const { bL, jL, k } = lage;
  const K = Math.max(1, opt.reihen);
  // Pfad (obere Kopie = Vorlagenindex)
  const pfad: number[] = [];
  const pfadLinks: number[] = [];
  // Plattenmaul (Phase 2, M1): Treppe im Kappengitter zum inneren Winkel, der dem gezeichneten Winkel (y, |z|) am
  // nächsten liegt (Spalte c/2+1 … c−1, Zeile 1 … c/2); kein Ringpfad
  let treppe: [number, number][] | null = null;
  if (lage.platte) {
    // Der Winkel bleibt auf der Lippenzeile (b = c/2; eine Treppe mit senkrechten Stücken ließ beim Öffnen die seitlich
    // getrennten Lippenblätter aneinander vorbeigleiten, 50–400 Durchdringungen); die Zeile selbst ist auf die gezeichnete
    // Höhe gebogen (`SchlitzLage.front`, kastenKappe). Spalte nach der seitlichen Lage |z| des Winkels.
    let best: [number, number] = [c / 2 + 1, c / 2];
    let bestD = Infinity;
    for (let a = c / 2 + 1; a <= c - 1; a++) {
      const q = v.kappe('vorn', a, c / 2);
      const d = Math.abs(Math.abs(zieleV[3 * q + 2]!) - lage.platte.winkelZ);
      if (d < bestD) {
        bestD = d;
        best = [a, c / 2];
      }
    }
    treppe = plattenTreppe(c, best[0], best[1]);
    lage.kappenPfad = treppe;
    lage.m = treppe.length - 1;
    for (const [a, b] of treppe) {
      pfad.push(v.kappe('vorn', a, b));
      pfadLinks.push(v.kappe('vorn', c - a, b));
    }
  } else if (lage.ringA !== undefined) {
    // Ringanfang: unterer Bogen von Ring i0 (Bauchpunkt = Anfang auf der Spiegelebene … Lippenzeile jL), dahinter die Zeile
    const i0 = lage.ringA;
    for (let t = 0; t <= lage.sA; t++) {
      pfad.push(v.ringPunkt(i0, N / 2 - t));
      pfadLinks.push(v.ringPunkt(i0, (N / 2 + t) % N));
    }
    for (let i = i0 + 1; i <= k; i++) {
      pfad.push(v.ringPunkt(i, jL));
      pfadLinks.push(v.ringPunkt(i, N - jL));
    }
  } else {
    for (let t = 0; t <= c / 2; t++) {
      pfad.push(v.kappe('vorn', c / 2 + t, bL));
      pfadLinks.push(v.kappe('vorn', c / 2 - t, bL));
    }
    for (let i = 1; i <= k; i++) {
      pfad.push(v.ringPunkt(i, jL));
      pfadLinks.push(v.ringPunkt(i, N - jL));
    }
  }
  const ringA0 = lage.ringA ?? 0;
  const sA = lage.sA;
  /** Pfadspalte des Rings i (erster Ring der Lippe = Spalte sA) */
  const tVonRing = (i: number) => sA + i - ringA0;
  const m = lage.m;
  if (pfad.length !== m + 1) throw new Error('Maul: Pfadlänge passt nicht');
  // Plattenmaul: Treppenhöhe je Spalte (rechte Hälfte); Spalten hinter dem Winkel liegen auf Winkelhöhe
  const aW = treppe ? treppe[treppe.length - 1]![0] : 0;
  const bW = treppe ? treppe[treppe.length - 1]![1] : 0;
  const treppeBei = (a: number): number => {
    if (!treppe) return bL;
    if (a > aW) return bW;
    let tief = Infinity;
    for (const [ta, tb] of treppe) if (ta === a) tief = Math.min(tief, tb);
    return Number.isFinite(tief) ? tief : bW;
  };
  /** Zelle (a_min, b_min) des Kappengitters: unterhalb des Arms (rechte Hälfte oder gespiegelt)? */
  const zelleUnten = (aMin: number, bMin: number): boolean => {
    const aR = aMin >= c / 2 ? aMin : c - 1 - aMin;
    // waagerechtes Segment über der Zelle: Zeile, in der der Pfad von Spalte aR nach aR + 1 geht
    let stufe = bW;
    if (treppe && aR + 1 <= aW) for (const [ta, tb] of treppe) if (ta === aR + 1) { stufe = tb; break; }
    return bMin < stufe;
  };
  let naechster = n0;
  const neu = () => naechster++;
  const unten: number[] = [];
  const untenLinks: number[] = [];
  for (let t = 0; t < m; t++) unten.push(neu());
  untenLinks.push(unten[0]!);
  for (let t = 1; t < m; t++) untenLinks.push(neu());
  const tOben = new Map<number, { t: number; links: boolean }>();
  for (let t = 0; t < m; t++) {
    tOben.set(pfad[t]!, { t, links: false });
    if (t > 0) tOben.set(pfadLinks[t]!, { t, links: true });
  }
  // Flächen der Vorlage: unterhalb des Schlitzes auf die unteren Kopien umschreiben
  const flaechen = alleFlaechen(v.kaefig).map((f) => [...f]);
  const seiteVon = (f: readonly number[]): 'oben' | 'unten' => {
    const lagen = f.map((idx) => gitterLage(v, idx));
    const kappe = lagen.some((x) => x.art === 'vorn');
    if (kappe) {
      let bMin = Infinity;
      let bMax = -Infinity;
      let aMin = Infinity;
      for (const x of lagen) {
        const ab = x.art === 'vorn' ? [x.a, x.b] : x.art === 'ring' ? randAB(c, x.j) : [NaN, NaN];
        aMin = Math.min(aMin, ab[0]!);
        bMin = Math.min(bMin, ab[1]!);
        bMax = Math.max(bMax, ab[1]!);
      }
      if (treppe) return zelleUnten(aMin, bMin) ? 'unten' : 'oben';
      if (bMin >= bL) return 'oben';
      if (bMax <= bL) return 'unten';
      throw new Error('Maul: Kappenfläche kreuzt die Lippenzeile');
    }
    // Ringfläche: j-Bereich im kleineren Ring
    const ringe = lagen.filter((x): x is { art: 'ring'; i: number; j: number } => x.art === 'ring');
    const i0 = Math.min(...ringe.map((x) => x.i));
    // Ringanfang: alles vor Ring i0 (Nase, Unterseite bis zum Startbogen) gehört zum Oberkiefer
    if (lage.ringA !== undefined && i0 < lage.ringA) return 'oben';
    const js = ringe.filter((x) => x.i === i0).map((x) => x.j);
    const j0 = js.includes(0) && js.includes(N - 1) ? N - 1 : Math.min(...js);
    if (j0 < N / 2) return j0 >= jL ? 'unten' : 'oben';
    return j0 >= N - jL ? 'oben' : 'unten';
  };
  for (const f of flaechen) {
    if (!f.some((idx) => tOben.has(idx))) continue;
    if (seiteVon(f) !== 'unten') continue;
    for (let q = 0; q < f.length; q++) {
      const o = tOben.get(f[q]!);
      if (o) f[q] = o.links ? untenLinks[o.t]! : unten[o.t]!;
    }
  }
  // Tasche: Reihen 1 … K
  const tasche = { oben: [] as number[][], unten: [] as number[][], obenLinks: [] as number[][], untenLinks: [] as number[][], winkel: [] as number[], winkelLinks: [] as number[] };
  for (let r = 1; r <= K; r++) {
    const o: number[] = [];
    const u: number[] = [];
    const oL: number[] = [];
    const uL: number[] = [];
    for (let t = 0; t < m; t++) {
      o.push(neu());
      u.push(neu());
    }
    oL.push(o[0]!);
    uL.push(u[0]!);
    for (let t = 1; t < m; t++) {
      oL.push(neu());
      uL.push(neu());
    }
    tasche.oben.push(o);
    tasche.unten.push(u);
    tasche.obenLinks.push(oL);
    tasche.untenLinks.push(uL);
    tasche.winkel.push(neu());
    tasche.winkelLinks.push(neu());
  }
  const O = (r: number, t: number, links: boolean): number => (t === m ? (r === 0 ? (links ? pfadLinks[m]! : pfad[m]!) : links ? tasche.winkelLinks[r - 1]! : tasche.winkel[r - 1]!) : r === 0 ? (links ? pfadLinks[t]! : pfad[t]!) : links ? tasche.obenLinks[r - 1]![t]! : tasche.oben[r - 1]![t]!);
  const U = (r: number, t: number, links: boolean): number => (t === m ? O(r, t, links) : r === 0 ? (links ? untenLinks[t]! : unten[t]!) : links ? tasche.untenLinks[r - 1]![t]! : tasche.unten[r - 1]![t]!);
  // Umlaufsinn aus der Haut: Die obere Hautfläche an der Lippenkante (pfad[0] → pfad[1]) läuft in Richtung s;
  // das obere rechte Taschenblatt muss die Kante entgegengesetzt durchlaufen (d = −s), das untere rechte mit +s,
  // links jeweils gespiegelt; das Rachengitter in seiner Standardreihenfolge passt zu d = −1.
  let s = 0;
  for (const f of flaechen) {
    const i0 = f.indexOf(pfad[0]!);
    const i1 = f.indexOf(pfad[1]!);
    if (i0 < 0 || i1 < 0) continue;
    s = (i0 + 1) % f.length === i1 ? 1 : -1;
    break;
  }
  if (s === 0) throw new Error('Maul: Hautfläche an der Lippe nicht gefunden');
  const d = -s;
  const streifen = (A: (t: number) => number, B: (t: number) => number, w: number): number[][] => {
    const out: number[][] = [];
    for (let t = 0; t < m; t++) out.push(w > 0 ? [A(t), A(t + 1), B(t + 1), B(t)] : [A(t + 1), A(t), B(t), B(t + 1)]);
    return out;
  };
  const taschenFlaechen: number[][] = [];
  for (let r = 1; r <= K; r++) {
    taschenFlaechen.push(...streifen((t) => O(r - 1, t, false), (t) => O(r, t, false), d));
    taschenFlaechen.push(...streifen((t) => U(r - 1, t, false), (t) => U(r, t, false), -d));
    taschenFlaechen.push(...streifen((t) => O(r - 1, t, true), (t) => O(r, t, true), -d));
    taschenFlaechen.push(...streifen((t) => U(r - 1, t, true), (t) => U(r, t, true), d));
  }
  // Rachenwand: Vorhang zwischen oberer und unterer Reihe K je Spalte t (Vierecke), in den Mundwinkeln ein Dreieck
  // (die Winkelsäule ist ein Punkt). Umlaufsinn wie die Blätter: zu d = +1 passt [U(K,t), U(K,t+1), L(K,t+1), L(K,t)].
  const vorhang = (links: boolean): number[][] => {
    const out: number[][] = [];
    for (let t = 0; t + 1 < m; t++) {
      const f = [O(K, t, links), O(K, t + 1, links), U(K, t + 1, links), U(K, t, links)];
      out.push((d > 0) !== links ? f : f.reverse());
    }
    const dreieck = [O(K, m - 1, links), O(K, m, links), U(K, m - 1, links)];
    out.push((d > 0) !== links ? dreieck : dreieck.reverse());
    return out;
  };
  taschenFlaechen.push(...vorhang(false), ...vorhang(true));
  const n = naechster;

  // ----- Ziele (geschlossen) -----
  const ziele = new Float64Array(3 * n);
  const hoehe = new Float64Array(n);
  ziele.set(zieleV);
  hoehe.set(hoeheV);
  const quelle = new Int32Array(n);
  const kieferBreiter = new Uint8Array(n);
  for (let i = 0; i < n0; i++) quelle[i] = i;
  const P = (idx: number): [number, number, number] => [ziele[3 * idx]!, ziele[3 * idx + 1]!, ziele[3 * idx + 2]!];
  const spiegel = (p: [number, number, number]): [number, number, number] => [p[0], p[1], -p[2]];
  const setze = (idx: number, p: [number, number, number]) => {
    ziele[3 * idx] = p[0];
    ziele[3 * idx + 1] = p[1];
    ziele[3 * idx + 2] = p[2];
  };
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < n0; i++) {
    yMin = Math.min(yMin, zieleV[3 * i + 1]!);
    yMax = Math.max(yMax, zieleV[3 * i + 1]!);
  }
  // Kopfhöhe an den Maulringen (14.10. spätnachts): nur für das Lippenband im Material — beim Langhals ist der Körper 0,75
  // hoch, der Kopf 0,13, das Band war breiter als der Kiefer. Die Geometrie (Rille, Linse, Haps, Zähne) bleibt bei der
  // Körperhöhe: mit der Kopfhöhe brachen Tiger-Stern, Tiger-Haps, Kastenschnauze und Rex unten (2–144 Paare), am Langhals
  // änderte sie kaum etwas
  let kopfHoehe = 0;
  for (let i = lage.ringA ?? 0; i <= k; i++) kopfHoehe = Math.max(kopfHoehe, Math.hypot(zieleV[3 * v.ringPunkt(i, 0)]! - zieleV[3 * v.ringPunkt(i, N / 2)]!, zieleV[3 * v.ringPunkt(i, 0) + 1]! - zieleV[3 * v.ringPunkt(i, N / 2) + 1]!));
  const H = Math.max(1e-6, yMax - yMin);
  // „oben“ je Pfadpunkt: Richtung der Haut längs der Schleife an der Lippe, von der Unterseite zur Oberseite (Ring:
  // Nachbarn j_L − 1 und j_L + 1; Kappe: Zeile b_L + 1 und b_L − 1). Trennt Ober- und Unterblatt der Tasche und ist an
  // der Naht in der Spiegelebene.
  const obenBei = (t: number): [number, number, number] => {
    const g = gitterLage(v, pfad[t]!);
    let a: [number, number, number];
    let b: [number, number, number];
    if (treppe) {
      // Plattenmaul: „oben“ = Normale der Treppe in der Plattenebene (y, z), zur Oberlippenseite: waagerechte Stücke → +y,
      // senkrechte Stücke → nach außen (+z); an der Naht in der Spiegelebene
      // Normale des ankommenden Stücks (an der Naht des ersten, waagerechten): eine Mittelung über die Ecke kippte die
      // Normale neben der Naht seitlich, und das untere Taschenblatt kreuzte die Spiegelebene (tascheU/tascheU)
      const p0 = P(pfad[Math.max(0, t - 1)]!);
      const p1 = P(pfad[t === 0 ? 1 : t]!);
      const ty = p1[1] - p0[1];
      const tz = p1[2] - p0[2];
      const n: [number, number, number] = [0, tz, t === 0 ? 0 : -ty];
      const l = Math.hypot(...n) || 1;
      return [n[0] / l, n[1] / l, n[2] / l];
    }
    if (g.art === 'ring' && lage.ringA !== undefined && t <= sA) {
      // Startbogen: die Lippe läuft um den Ring, „oben“ ist längs zur Nase (Ring i0 − 1); an der Ecke (t = sA) gemittelt
      const vorn3 = P(v.ringPunkt(g.i - 1, g.j));
      const hinten3 = P(v.ringPunkt(g.i + 1, g.j));
      const l1 = Math.hypot(vorn3[0] - hinten3[0], vorn3[1] - hinten3[1], vorn3[2] - hinten3[2]) || 1;
      const laengs: [number, number, number] = [(vorn3[0] - hinten3[0]) / l1, (vorn3[1] - hinten3[1]) / l1, (vorn3[2] - hinten3[2]) / l1];
      if (t < sA) {
        a = [laengs[0], laengs[1], laengs[2]];
        b = [0, 0, 0];
      } else {
        const ao = P(v.ringPunkt(g.i, g.j - 1));
        const bo = P(v.ringPunkt(g.i, g.j + 1));
        const l2 = Math.hypot(ao[0] - bo[0], ao[1] - bo[1], ao[2] - bo[2]) || 1;
        a = [laengs[0] + (ao[0] - bo[0]) / l2, laengs[1] + (ao[1] - bo[1]) / l2, laengs[2] + (ao[2] - bo[2]) / l2];
        b = [0, 0, 0];
      }
    } else if (g.art === 'ring') {
      a = P(v.ringPunkt(g.i, g.j - 1));
      b = P(v.ringPunkt(g.i, g.j + 1));
    } else if (g.art === 'vorn') {
      a = P(v.kappe('vorn', g.a, g.b + 1));
      b = P(v.kappe('vorn', g.a, g.b - 1));
    } else return [0, 1, 0];
    const d3: [number, number, number] = [a[0] - b[0], a[1] - b[1], t === 0 ? 0 : a[2] - b[2]];
    const l = Math.hypot(...d3) || 1;
    return [d3[0] / l, d3[1] / l, d3[2] / l];
  };
  // Überbiss-Richtung: zur Ringmitte, ohne den Anteil längs „oben“ (= Hautnormale nach innen)
  const innenRichtung = (t: number): [number, number, number] => {
    const g = gitterLage(v, pfad[t]!);
    const p = P(pfad[t]!);
    const ring = g.art === 'ring' ? g.i : 0;
    const c3: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < N; j++) for (let d = 0; d < 3; d++) c3[d] = c3[d]! + zieleV[3 * v.ringPunkt(ring, j) + d]! / N;
    const o = obenBei(t);
    const d3: [number, number, number] = [c3[0] - p[0], c3[1] - p[1], c3[2] - p[2]];
    const dot = d3[0] * o[0] + d3[1] * o[1] + d3[2] * o[2];
    const r3: [number, number, number] = [d3[0] - dot * o[0], d3[1] - dot * o[1], d3[2] - dot * o[2]];
    const l = Math.hypot(...r3) || 1;
    return [r3[0] / l, r3[1] / l, t === 0 ? 0 : r3[2] / l];
  };
  // Rille: beide Ketten nach innen (Hautnormale), zum Winkel auslaufend; obere und untere Kette bleiben gleich.
  // Höchstens 40 % des Wegs zur Ringmitte: In einem dünnen Hals (Lippe dicht an der Spiegelebene) schöbe die Rille die
  // Lippe sonst durch die Mitte auf die andere Seite.
  const mitteAbstand = (t: number): number => {
    const g = gitterLage(v, pfad[t]!);
    const ring = g.art === 'ring' ? g.i : 0;
    const p = P(pfad[t]!);
    const c3: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < N; j++) for (let d = 0; d < 3; d++) c3[d] = c3[d]! + zieleV[3 * v.ringPunkt(ring, j) + d]! / N;
    return Math.hypot(c3[0] - p[0], c3[1] - p[1], c3[2] - p[2]);
  };
  // Kiefer getrennt (M2): keine Rille (die Lippen liegen nicht aufeinander, die versetzte Kante sitzt im anderen Kiefer)
  const vs = lage.versatz;
  const getrennt = !!vs && !treppe;
  // Breite der Schlitzkante aus der gezeichneten Linie (Front/Top): |z| der Linie am nächsten Punkt (x, y); die
  // Umparametrisierung legt die Kante nur in der Seite auf die Linie, ihre Breite käme sonst vom Körper (Florian: die
  // rote Linie ist in jeder Ansicht exakt die Lippenkante). Die zwei Nachbarzeilen des Schlitzkiefers laufen darauf zu.
  type Stn = { cx: number; cy: number; dx: number; dy: number; H: number; profil: { a: number; z: number }[] };
  const stationAus = (punkte: number[]): Stn => {
    let cx = 0;
    let cy = 0;
    for (const q of punkte) {
      cx += zieleV[3 * q]! / punkte.length;
      cy += zieleV[3 * q + 1]! / punkte.length;
    }
    const o = punkte[0]!;
    const u = punkte[punkte.length - 1]!;
    let dx = zieleV[3 * o]! - zieleV[3 * u]!;
    let dy = zieleV[3 * o + 1]! - zieleV[3 * u + 1]!;
    const H = Math.hypot(dx, dy) || 1e-9;
    dx /= H;
    dy /= H;
    const profil = punkte.map((q) => ({ a: (zieleV[3 * q]! - cx) * dx + (zieleV[3 * q + 1]! - cy) * dy, z: Math.abs(zieleV[3 * q + 2]!) }));
    return { cx, cy, dx, dy, H, profil };
  };
  const stationen: Stn[] = [];
  for (let r = 1; r < c / 2; r++) {
    const pts: number[] = [];
    for (let q = 0; q <= 4 * r; q++) {
      const [a, b] = quadratRing(c, r, q);
      pts.push(v.kappe('vorn', a, b));
    }
    stationen.push(stationAus(pts));
  }
  for (let i = 0; i < v.R; i++) {
    const pts: number[] = [];
    for (let j = 0; j <= N / 2; j++) pts.push(v.ringPunkt(i, j));
    stationen.push(stationAus(pts));
  }
  const stationBei = (p: readonly [number, number, number]): Stn => {
    let best = stationen[0]!;
    let bestD = Infinity;
    for (const st of stationen) {
      const d = Math.hypot(p[0] - st.cx, p[1] - st.cy);
      if (d < bestD) {
        bestD = d;
        best = st;
      }
    }
    return best;
  };
  // halbe Breite einer Station auf der Höhe a (längs der Sprosse, 0 = Mitte) aus ihrem Halbprofil
  const profilBreite = (st: Stn, a: number): number => {
    let w = 0;
    const pr = st.profil;
    for (let q = 0; q + 1 < pr.length; q++) {
      const p0 = pr[q]!;
      const p1 = pr[q + 1]!;
      if ((p0.a >= a && a >= p1.a) || (p1.a >= a && a >= p0.a)) {
        const f = Math.abs(p0.a - p1.a) > 1e-12 ? (p0.a - a) / (p0.a - p1.a) : 0;
        w = Math.max(w, p0.z + (p1.z - p0.z) * f);
      }
    }
    return w;
  };
  // halbe Breite der Haut an einem Seitenpunkt (Welt): zwischen den zwei Stationen, deren Mitten ihn in x einschließen,
  // je auf seiner Höhe aus dem Halbprofil (Kappen- und Ringstationen gleich behandelt)
  const breiteBei = (xy: V2): number => {
    const hoeheIn = (st: Stn) => (xy.x - st.cx) * st.dx + (xy.y - st.cy) * st.dy;
    for (let q = 0; q + 1 < stationen.length; q++) {
      const s0 = stationen[q]!;
      const s1 = stationen[q + 1]!;
      if ((s0.cx - xy.x) * (s1.cx - xy.x) <= 0) {
        const u = Math.abs(s1.cx - s0.cx) > 1e-12 ? (xy.x - s0.cx) / (s1.cx - s0.cx) : 0;
        return profilBreite(s0, hoeheIn(s0)) * (1 - u) + profilBreite(s1, hoeheIn(s1)) * u;
      }
    }
    const st = stationBei([xy.x, xy.y, 0]);
    return profilBreite(st, hoeheIn(st));
  };
  const schlitzNah = schlitzPunkte && schlitzPunkte.length >= 2 ? (xy: readonly [number, number]): { x: number; y: number; z: number } | null => {
    let best = Infinity;
    let nah: { x: number; y: number; z: number } | null = null;
    for (let i = 0; i + 1 < schlitzPunkte.length; i++) {
      const a = schlitzPunkte[i]!;
      const b = schlitzPunkte[i + 1]!;
      const abx = b[0] - a[0];
      const aby = b[1] - a[1];
      const l2 = abx * abx + aby * aby || 1e-18;
      const u = Math.min(1, Math.max(0, ((xy[0] - a[0]) * abx + (xy[1] - a[1]) * aby) / l2));
      const d = Math.hypot(a[0] + abx * u - xy[0], a[1] + aby * u - xy[1]);
      if (d < best) {
        best = d;
        const x = a[0] + abx * u;
        const y = a[1] + aby * u;
        // Tiefe genau aus der gezeichneten 3D-Linie (14.10. nachts, Florian: „Ich muss die Kurven auch von oben und von
        // vorne genau bearbeiten können, und der Kiefer passt sich dann der runden Form an“) — die Griffe in Top und Front
        // wirken; die Rundung vorn gibt der Anfang der Linie (Griff quer zur Spiegelebene, `lippeAnHaut`)
        nah = { x, y, z: Math.abs(a[2] + (b[2] - a[2]) * u) };
      }
    }
    return nah;
  } : null;
  const schlitzTiefe = !!schlitzPunkte && schlitzPunkte.some((q) => Math.abs(q[2]) > 1e-6);
  const schlitzZ = schlitzNah ? (xy: readonly [number, number]): number | null => (schlitzTiefe ? (schlitzNah(xy)?.z ?? null) : null) : null;
  const schlitzAnteil = new Float64Array(m + 1); // relative Änderung der Breite je Spalte (> 0 schmaler)
  // Ringanfang: Die Punkte des Startbogens (Spalten 1 … sA − 1) liegen nach Bogenlänge auf der Linie vom Anfang bis zu
  // ihrer Kreuzung mit Ring i0 (nächster Linienpunkt zur Lippenzeile des Rings, Spalte sA) — der Ring biegt sich unten
  // zum Anfang vor; sein Bogen ist die Mundfront
  let startBogen: { x: number; y: number; z: number }[] | null = null;
  if (lage.ringA !== undefined && schlitzPunkte && schlitzPunkte.length >= 2 && !treppe) {
    const zug = schlitzPunkte;
    const lenK = [0];
    for (let q = 1; q < zug.length; q++) lenK.push(lenK[q - 1]! + Math.hypot(zug[q]![0] - zug[q - 1]![0], zug[q]![1] - zug[q - 1]![1], zug[q]![2] - zug[q - 1]![2]));
    const pS = P(pfad[sA]!);
    let sEnde = lenK[lenK.length - 1]!;
    let bestD = Infinity;
    for (let q = 0; q + 1 < zug.length; q++) {
      const a = zug[q]!;
      const b = zug[q + 1]!;
      const abx = b[0] - a[0];
      const aby = b[1] - a[1];
      const l2 = abx * abx + aby * aby || 1e-18;
      const u = Math.min(1, Math.max(0, ((pS[0] - a[0]) * abx + (pS[1] - a[1]) * aby) / l2));
      const d = Math.hypot(a[0] + abx * u - pS[0], a[1] + aby * u - pS[1]);
      if (d < bestD) {
        bestD = d;
        sEnde = lenK[q]! + u * (lenK[q + 1]! - lenK[q]!);
      }
    }
    const bei = (sb: number): { x: number; y: number; z: number } => {
      let q = 0;
      while (q < lenK.length - 2 && lenK[q + 1]! < sb) q++;
      const d = lenK[q + 1]! - lenK[q]!;
      const u = d > 1e-15 ? Math.min(1, Math.max(0, (sb - lenK[q]!) / d)) : 0;
      const a = zug[q]!;
      const b = zug[q + 1]!;
      return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, z: Math.abs(a[2] + (b[2] - a[2]) * u) };
    };
    startBogen = [];
    for (let t = 0; t <= sA; t++) startBogen.push(bei((sEnde * t) / sA));
    startBogen[0]!.z = 0;
  }
  // Kappenanfang (14.10. spätnachts, „Kringel am Lippenanfang“): Die Kappenspalten 1 … c/2 − 1 liegen nach Bogenlänge auf
  // der Linie zwischen dem Anfang und dem Lippenpunkt von Ring 0 — einzeln auf den nächsten Linienpunkt gelegt, landete
  // eine Kappenspalte hinter Ring 0, die Lippe lief vorn kurz rückwärts (Zickzack im Lippenband)
  let kappenBogen: { x: number; y: number; z: number }[] | null = null;
  if (lage.ringA === undefined && !treppe && schlitzPunkte && schlitzPunkte.length >= 2 && sA >= 2) {
    const zug = schlitzPunkte;
    const lenK = [0];
    for (let q = 1; q < zug.length; q++) lenK.push(lenK[q - 1]! + Math.hypot(zug[q]![0] - zug[q - 1]![0], zug[q]![1] - zug[q - 1]![1], zug[q]![2] - zug[q - 1]![2]));
    const naechstesS = (p3: readonly number[]): number => {
      let best = Infinity;
      let sb = 0;
      for (let q = 0; q + 1 < zug.length; q++) {
        const a = zug[q]!;
        const b = zug[q + 1]!;
        const abx = b[0] - a[0];
        const aby = b[1] - a[1];
        const l2 = abx * abx + aby * aby || 1e-18;
        const u = Math.min(1, Math.max(0, ((p3[0]! - a[0]) * abx + (p3[1]! - a[1]) * aby) / l2));
        const d = Math.hypot(a[0] + abx * u - p3[0]!, a[1] + aby * u - p3[1]!);
        if (d < best) {
          best = d;
          sb = lenK[q]! + u * (lenK[q + 1]! - lenK[q]!);
        }
      }
      return sb;
    };
    const sRing0 = naechstesS(P(pfad[sA]!));
    const sRing1 = m > sA + 1 ? naechstesS(P(pfad[sA + 1]!)) : lenK[lenK.length - 1]!;
    // Ring 0 selbst darf nicht hinter Ring 1 liegen
    const sEnde = Math.min(sRing0, 0.9 * sRing1);
    if (sEnde > 1e-9) {
      kappenBogen = [];
      for (let t = 0; t <= sA; t++) {
        const sb = (sEnde * t) / sA;
        let q = 0;
        while (q < lenK.length - 2 && lenK[q + 1]! < sb) q++;
        const d = lenK[q + 1]! - lenK[q]!;
        const u = d > 1e-15 ? Math.min(1, Math.max(0, (sb - lenK[q]!) / d)) : 0;
        const a = zug[q]!;
        const b = zug[q + 1]!;
        kappenBogen.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, z: Math.abs(a[2] + (b[2] - a[2]) * u) });
      }
    }
  }
  for (let t = 0; t < m; t++) {
    const p = P(pfad[t]!);
    const r3 = innenRichtung(t);
    const e = getrennt ? 0 : Math.min(opt.rille * H * (1 - (t / m) * (t / m)), 0.4 * mitteAbstand(t));
    const q: [number, number, number] = [p[0] + r3[0] * e, p[1] + r3[1] * e, t === 0 ? 0 : p[2] + r3[2] * e];
    if (startBogen && t < sA) {
      // Startbogen des Ringanfangs: genau auf der Linie, ohne Streckung des Kiefers (die Vorlage ist dort gestaucht)
      const b = startBogen[t]!;
      q[0] = b.x;
      q[1] = b.y;
      q[2] = t === 0 ? 0 : b.z;
    } else if (schlitzNah && !treppe) {
      // Schlitzkante auf der gezeichneten Linie: nächster Linienpunkt in der Seite (die Umparametrisierung trifft die
      // Linie an den Ringen, die Kappenzeile nur näherungsweise; ein Anfang dicht unter der Spitze läuft sonst durch die
      // Spitze, Kugel 2,5 px), Breite aus seiner Tiefe; der Anfang bleibt auf der Spiegelebene
      const nah = t === 0 ? { x: schlitzPunkte![0]![0], y: schlitzPunkte![0]![1], z: 0 } : t === sA && startBogen ? startBogen[sA]! : kappenBogen && t <= sA ? kappenBogen[t]! : schlitzNah([q[0], q[1]]);
      if (nah) {
        q[0] = nah.x;
        q[1] = nah.y;
        if (t > 0 && schlitzTiefe && Math.abs(q[2]) > 1e-9) {
          schlitzAnteil[t] = 1 - nah.z / Math.abs(q[2]);
          if (nah.z > 1.002 * Math.abs(q[2])) for (const idx of [pfad[t]!, unten[t]!, pfadLinks[t]!, untenLinks[t]!]) kieferBreiter[idx] = 1;
          q[2] = Math.sign(q[2]) * nah.z;
        }
      }
    }
    setze(pfad[t]!, q);
    setze(unten[t]!, q);
    quelle[unten[t]!] = pfad[t]!;
    hoehe[unten[t]!] = hoeheV[pfad[t]!]!;
    if (t > 0) {
      setze(pfadLinks[t]!, spiegel(q));
      setze(untenLinks[t]!, spiegel(q));
      quelle[untenLinks[t]!] = pfadLinks[t]!;
      hoehe[untenLinks[t]!] = hoeheV[pfadLinks[t]!]!;
    }
  }
  // Mundwinkel (t = m, beide Kiefer): Breite ebenfalls aus der Linie (ihr Ende); er ist ein Ringpunkt und läge sonst
  // auf dem Körperumriss (Rex-Test: 28 px in der Front, alle anderen Spalten exakt)
  if (schlitzZ && !treppe) {
    const q = P(pfad[m]!);
    const zl = schlitzZ([q[0], q[1]]);
    if (zl !== null && Math.abs(q[2]) > 1e-9) {
      schlitzAnteil[m] = 1 - zl / Math.abs(q[2]);
      setze(pfad[m]!, [q[0], q[1], Math.sign(q[2]) * zl]);
      setze(pfadLinks[m]!, [q[0], q[1], -Math.sign(q[2]) * zl]);
    }
  }
  // Der Schlitzkiefer folgt seiner Linie als Ganzes (14.10. nachts, Florian: „der Kiefer passt sich dann auch der runden
  // Form an“; Bild 2: der breite Unterkiefer stand als Krempe ab, weil nur Lippe und zwei Nachbarzeilen mitgingen): Jede
  // Ringhälfte des Kiefers (bei gleichen Kiefern beide, getrennt nur die des Schlitzkiefers, am Winkel beide) wird um
  // das Verhältnis Linie / Vorlage an ihrer Lippe gestreckt — der Querschnitt bleibt die Vorlage, von oben folgt der
  // Kiefer der Rundung seiner Linie (ein Auslauf zur Naht ließ den Schädel über einer runden Lippe kastig). Die Kappe
  // ebenso, spaltenweise.
  if (schlitzZ && !treppe) {
    for (let t = sA; t <= m; t++) {
      const a = 1 - schlitzAnteil[t]!;
      if (Math.abs(a - 1) < 1e-9) continue;
      const g = gitterLage(v, pfad[t]!);
      if (g.art !== 'ring') continue;
      const zLippe = Math.abs(P(pfad[t]!)[2]);
      // am Ring i0 des Ringanfangs ist der untere Bogen die Lippe selbst: nur die obere Hälfte strecken
      const seiten = (getrennt && t < m ? [vs!.oben ? 1 : -1] : [-1, 1]).filter((r) => !(lage.ringA !== undefined && t === sA && r > 0));
      for (const richt of seiten) {
        const zeilen = richt < 0 ? g.j : N / 2 - g.j;
        for (let d = 1; d < zeilen; d++) {
          const jj = g.j + richt * d;
          for (const idx of [v.ringPunkt(g.i, jj), v.ringPunkt(g.i, N - jj)]) {
            const q = P(idx);
            const z = kieferZ(q[2], a, zLippe);
            if (Math.abs(z) > 1.002 * Math.abs(q[2])) kieferBreiter[idx] = 1;
            setze(idx, [q[0], q[1], z]);
          }
        }
      }
    }
    const kappeOben = !getrennt || !vs!.oben;
    const kappeUnten = !getrennt || vs!.oben;
    for (let aR = c / 2 + 1; aR < c && lage.ringA === undefined; aR++) {
      const a = 1 - schlitzAnteil[aR - c / 2]!;
      if (Math.abs(a - 1) < 1e-9) continue;
      const zLippe = Math.abs(P(pfad[aR - c / 2]!)[2]);
      for (let b = 1; b < c; b++) {
        if (b === bL || (b > bL && !kappeOben) || (b < bL && !kappeUnten)) continue;
        for (const idx of [v.kappe('vorn', aR, b), v.kappe('vorn', c - aR, b)]) {
          const q = P(idx);
          const z = kieferZ(q[2], a, zLippe);
          if (Math.abs(z) > 1.002 * Math.abs(q[2])) kieferBreiter[idx] = 1;
          setze(idx, [q[0], q[1], z]);
        }
      }
    }
  }
  // Rachenlinie: von der Mitte (hinter dem Winkel, auf der Lippenhöhe des Winkels) zum Punkt hinter dem Winkel innen
  const S = P(pfad[0]!);
  const M = P(pfad[m]!);
  // Plattenmaul: Länge und Scharnier am Ring k hinter der Platte (der Winkel liegt auf der Platte selbst)
  const ringMitteRoh = (i: number): [number, number, number] => {
    const c3: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < N; j++) for (let d = 0; d < 3; d++) c3[d] = c3[d]! + zieleV[3 * v.ringPunkt(i, j) + d]! / N;
    return c3;
  };
  const MH: [number, number, number] = treppe ? [ringMitteRoh(k)[0], zieleV[3 * v.ringPunkt(k, jL) + 1]!, 0] : M;
  const vorn = Math.sign(S[0] - MH[0]) || -1;
  const L = Math.max(1e-6, Math.abs(MH[0] - S[0]));
  // Rachenziel je Pfadpunkt: auf der Wirbelsäule (Ringmitten) bei der Station zwischen Lippenstation und Winkelring,
  // seitlich anteilig zur Winkelbreite. So bleibt die Tasche im Körper, auch wenn das Maul um den Hinterkopf in den
  // Hals läuft (Drache), und sie reicht nie hinter das Scharnier (sonst schwingt sie beim Öffnen durch).
  const ringMitte = (i: number): [number, number, number] => {
    const c3: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < N; j++) for (let d = 0; d < 3; d++) c3[d] = c3[d]! + zieleV[3 * v.ringPunkt(i, j) + d]! / N;
    return c3;
  };
  const mitten: [number, number, number][] = [];
  for (let i = ringA0; i <= k; i++) mitten.push(ringMitte(i));
  // Index in `mitten` (Ringanfang: ab Ring i0; die Nase davor gehört nicht zur Rachenlinie)
  const kk = k - ringA0;
  // Rachenlinie (Plan 5.1, automatisch; Phase 2 macht sie zum Griff): die Wirbelsäule (Ringmitten 0 … k) ab dem
  // Racheneingang. Der Eingang liegt bei `rachenTiefe` des Wegs bis zum ersten Knick der Wirbelsäule (> 50° gegen die
  // Kopfachse) oder bis zum Winkelring. Das Rachenziel je Lippenpunkt ist sein Lotfußpunkt auf dieser Linie, nie vor dem
  // Eingang: Schnauzenlippen laufen nach hinten zum Eingang (tiefe Bohne, Rex), Lippen an der Seite laufen waagerecht
  // nach innen. Läuft das Maul um den Hinterkopf in den Hals (Drache), liegen die Lippen dort als Stapel übereinander;
  // mit einem Ziel weiter unten deckten sich die Spalten und die Blätter kreuzten sich — mit dem Lot bleiben sie waagerecht.
  const sBogen: number[] = [0];
  for (let i = 0; i < kk; i++) sBogen.push(sBogen[i]! + Math.hypot(mitten[i + 1]![0] - mitten[i]![0], mitten[i + 1]![1] - mitten[i]![1], mitten[i + 1]![2] - mitten[i]![2]));
  const sK = sBogen[kk]!;
  // Halsansatz: erster Knick (> 50° gegen die Kopfachse über die ersten drei Ringe; an einer Kastenfront fächern die
  // Sprossen), hinter dem der Querschnitt kleiner wird (≤ 70 % des größten davor). Ein Knick in einen dickeren Rumpf
  // (Tiger: Kopf auf der Kugel) ist kein Hals, der Rachen darf dort tief liegen.
  const ringBreite = (i: number): number => {
    let w = 0;
    for (let j = 0; j < N; j++) w = Math.max(w, Math.abs(zieleV[3 * v.ringPunkt(i, j) + 2]!));
    return w;
  };
  const ringGroesse = (i: number): number => Math.hypot(zieleV[3 * v.ringPunkt(i, 0)]! - zieleV[3 * v.ringPunkt(i, N / 2)]!, zieleV[3 * v.ringPunkt(i, 0) + 1]! - zieleV[3 * v.ringPunkt(i, N / 2) + 1]!);
  let sKnick = sK;
  if (kk >= 4) {
    const d0 = richtung(mitten[0]!, mitten[3]!);
    let groessteVor = 0;
    for (let i = 0; i <= 3; i++) groessteVor = Math.max(groessteVor, ringGroesse(ringA0 + i));
    for (let i = 3; i < kk; i++) {
      groessteVor = Math.max(groessteVor, ringGroesse(ringA0 + i));
      const d = richtung(mitten[i]!, mitten[i + 1]!);
      if (d[0] * d0[0] + d[1] * d0[1] + d[2] * d0[2] < Math.cos((50 * Math.PI) / 180)) {
        const danach = (ringGroesse(ringA0 + Math.min(kk, i + 1)) + ringGroesse(ringA0 + Math.min(kk, i + 2))) / 2;
        if (danach <= 0.7 * groessteVor) {
          sKnick = sBogen[i]!;
          break;
        }
      }
    }
  }
  const sEingang = opt.rachenTiefe * sKnick;
  const rachenZiele = new Float64Array(3 * (m + 1));
  const Tvon = (t: number): [number, number, number] => {
    const p = P(pfad[t]!);
    let bestS = 0;
    let bestD = Infinity;
    for (let i = 0; i < kk; i++) {
      const a = mitten[i]!;
      const b = mitten[i + 1]!;
      const ab: [number, number, number] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const l2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1e-18;
      const u = Math.min(1, Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l2));
      const q = lerp3(a, b, u);
      const d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      if (d < bestD) {
        bestD = d;
        bestS = sBogen[i]! + u * Math.sqrt(l2);
      }
    }
    const sT = Math.min(sK, Math.max(sEingang, bestS));
    let c3: [number, number, number] = mitten[kk]!;
    let ringT = kk;
    for (let i = 0; i < kk; i++) {
      if (sT <= sBogen[i + 1]!) {
        const len = sBogen[i + 1]! - sBogen[i]!;
        c3 = lerp3(mitten[i]!, mitten[i + 1]!, len > 0 ? (sT - sBogen[i]!) / len : 0);
        ringT = i + 1;
        break;
      }
    }
    // seitlich höchstens 80 % der Ringbreite am Ziel (dünner Hals: die Tasche bleibt in ihrer Hälfte; wie `innenHalten`)
    const T: [number, number, number] = [c3[0], c3[1], Math.min((M[2] * opt.rachenInnen * t) / m, 0.8 * ringBreite(ringA0 + ringT))];
    rachenZiele.set(T, 3 * t);
    return T;
  };
  // Stationen (Quadratringe der Kappe, Ringe): Mitte, Sprossenrichtung, Höhe und rechtes Halbprofil (Höhe a längs der
  // Sprosse → Breite z). Dienen der Linsendicke und dem Halten der Taschenpunkte im Körper.
  // lokale Dicke an einem Taschenpunkt: Abstand zur Haut über und unter ihm längs der Sprosse seiner nächsten Station.
  // Gemessen am Taschenpunkt selbst, nicht an der Lippe: Bei einer Kastenfront ist die Kappe nur ein kleines Feld an der
  // Lippe (Sprossen fächern an der senkrechten Front), die Tasche liegt aber in den vollen Ringen dahinter; mit der
  // Kappendicke wäre die Linse null und Ober- und Unterblatt fielen aufeinander.
  const dickeAn = (p: readonly [number, number, number]): number => {
    const st = stationBei(p);
    const a = (p[0] - st.cx) * st.dx + (p[1] - st.cy) * st.dy;
    return Math.max(1e-6, Math.min(0.5 * st.H - a, 0.5 * st.H + a));
  };
  const linseAn = (p: readonly [number, number, number]): number => Math.min(opt.linse * H, 0.2 * dickeAn(p));
  // Linsenrichtung je Spalte: „oben“ entlang der Lippe geglättet (±2 Spalten; am Übergang Kopf → Hals dreht es sonst
  // in einer Spalte um 90°, die Blätter verdrillen sich) und gegen die Taschenrichtung orthogonalisiert (an der Kinnnaht
  // zeigt „oben“ sonst in die Tasche hinein und trennt die Blätter nicht); an der Naht in der Spiegelebene.
  const obenRoh: [number, number, number][] = [];
  for (let t = 0; t <= m; t++) obenRoh.push(obenBei(t));
  const normalen: [number, number, number][] = [];
  for (let t = 0; t <= m; t++) {
    const acc: [number, number, number] = [0, 0, 0];
    for (let d = -2; d <= 2; d++) {
      const q = Math.min(m, Math.max(0, t + d));
      const w = 3 - Math.abs(d);
      for (let i = 0; i < 3; i++) acc[i] = acc[i]! + w * obenRoh[q]![i]!;
    }
    const p = P(pfad[t]!);
    const T = Tvon(t);
    const e: [number, number, number] = [T[0] - p[0], T[1] - p[1], T[2] - p[2]];
    const el = Math.hypot(...e) || 1;
    for (let i = 0; i < 3; i++) e[i] = e[i]! / el;
    const dot = acc[0] * e[0] + acc[1] * e[1] + acc[2] * e[2];
    let n: [number, number, number] = [acc[0] - dot * e[0], acc[1] - dot * e[1], acc[2] - dot * e[2]];
    let l = Math.hypot(...n);
    if (l < 1e-6) {
      // parallel: Kreuzprodukt aus Lippentangente und Taschenrichtung, nach „oben“ orientiert
      const a = P(pfad[Math.max(0, t - 1)]!);
      const b = P(pfad[Math.min(m, t + 1)]!);
      const tg: [number, number, number] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      n = [tg[1] * e[2] - tg[2] * e[1], tg[2] * e[0] - tg[0] * e[2], tg[0] * e[1] - tg[1] * e[0]];
      if (n[0] * acc[0] + n[1] * acc[1] + n[2] * acc[2] < 0) n = [-n[0], -n[1], -n[2]];
      l = Math.hypot(...n) || 1;
    }
    if (t === 0) n[2] = 0;
    l = Math.hypot(...n) || 1;
    normalen.push([n[0] / l, n[1] / l, n[2] / l]);
  }
  const normale = (t: number): [number, number, number] => normalen[t]!;
  const art = new Uint8Array(n);
  const tiefe = new Float64Array(n);
  const untenSeite = new Float64Array(n);
  for (let t = 0; t < m; t++) {
    art[pfad[t]!] = 1;
    art[unten[t]!] = 2;
    untenSeite[unten[t]!] = 1;
    if (t > 0) {
      art[pfadLinks[t]!] = 1;
      art[untenLinks[t]!] = 2;
      untenSeite[untenLinks[t]!] = 1;
    }
  }
  art[pfad[m]!] = 6;
  art[pfadLinks[m]!] = 6;
  untenSeite[pfad[m]!] = 0.5;
  untenSeite[pfadLinks[m]!] = 0.5;
  // Kiefer getrennt (M2, Florians Grundbedingung): Ober- und Unterkiefer sind zwei Teile des Shapes mit je eigener
  // Lippenkante. Die Schlitzkette bleibt auf der gezeichneten Linie des längeren Kiefers (Überbiss: rot, Unterbiss:
  // blau); die versetzte Kette liegt auf der Linie des kürzeren Kiefers — mit **eigenem Anfang** hinter der Spitze (die
  // Lippen sind vorn getrennt), in der Seite auf der Linie, in der Front auf der gezeichneten Breite (z) bzw. um den
  // Anteil `innen` schmaler. Der ganze kürzere Kiefer (Ring- und Kappenpunkte jenseits des Schlitzes bis zum Winkelring)
  // folgt: an der Lippe mit dem Versatz der Kante, an der Naht (Kinn bzw. Nasenrücken) entlang des Umrisses hinter den
  // eigenen Anfang gerückt, dazwischen linear (Ringe) bzw. als Coons-Fläche (Kappe); die Breite läuft zur Naht hin aus.
  // Dazwischen ist das Maul offen: vom Schlitzanfang bis zum eigenen Anfang sieht man von unten die Tasche des
  // Oberkiefers (Überbiss). Die verdeckte Überlappung im anderen Kiefer darf sich durchdringen (Florian 15.10.); keine Regler.
  if (getrennt && vs) {
    const untenV = !vs.oben;
    const kopie = untenV ? unten : pfad;
    const kopieLinks = untenV ? untenLinks : pfadLinks;
    // Kante je Spalte: Seitenpunkt aus der Linie, Breite aus der Front (z) oder dem Anteil innen der Hautbreite an
    // ihrem Seitenpunkt (aus den Stationsprofilen; ein Walk-up an Ring bzw. Kappentangente machte die Kette zickzackig)
    const anteilZ = new Float64Array(m + 1);
    for (let t = 0; t < m; t++) {
      const zH = breiteBei(vs.xy[t]!);
      const zAbs = vs.z[t]!;
      const zInnen = vs.innen[t]!;
      // gezeichnete Kante: Breite genau aus der Linie (wie die Schlitzkante)
      const zKante = t === 0 ? 0 : Number.isFinite(zAbs) ? (vs.gezeichnet ? zAbs : Math.max(0.05 * zH, Math.min(zAbs, 1.6 * zH))) : Number.isFinite(zInnen) ? zH * (1 - Math.max(-0.6, Math.min(0.9, zInnen))) : 0.97 * zH;
      // Kappenspalten: quer als Viertelbogen von der Spiegelebene zur vollen Breite (`quer`); die Breitenskalierung des
      // Kiefers (`anteilZ`) nimmt die volle Kante, sonst zöge sie die Stirn zum Keil zusammen
      const kante: [number, number, number] = [vs.xy[t]!.x, vs.xy[t]!.y, t === 0 ? 0 : zKante * vs.quer[t]!];
      if (t > 0 && zKante > 1.002 * zH) {
        kieferBreiter[kopie[t]!] = 1;
        kieferBreiter[kopieLinks[t]!] = 1;
      }
      setze(kopie[t]!, kante);
      hoehe[kopie[t]!] = vs.v[t]!;
      if (t > 0) {
        setze(kopieLinks[t]!, spiegel(kante));
        hoehe[kopieLinks[t]!] = vs.v[t]!;
      }
      anteilZ[t] = t > 0 && zH > 1e-9 ? 1 - zKante / zH : 0;
    }
    // Haut des kürzeren Kiefers (Florian: „Die Kiefer müssen NUR ihrer Linie folgen, der blauen und der roten wie der
    // schwarzen“): Der Kiefer beginnt an seinem eigenen Anfang. Alles von ihm, was längs vor dem Anfang liegt (Kappenzeilen
    // jenseits der Lippenzeile, Ringpunkte seiner Hälfte), wird auf die Ebene durch den Anfang gesetzt — die Stirn ist
    // eine Wand mit dem Querschnitt des Kiefers, der Spalt zum anderen Kiefer entsteht von selbst (Rex-Bogen: die
    // Kinnlinie fällt vom blauen Anfang senkrecht); dahinter bleibt die schwarze Linie unverändert. Ein Verschieben
    // entlang des Umrisses oder über die Ringe verschmierte den Rücksprung zu einer Delle (Kugel mit einer Kappenzeile).
    // Ragt der Anfang vor den Kiefer, schiebt sich der Kiefer starr vor (zum Winkelring auslaufend). Die Breite läuft
    // von der Kante zur Naht auf die Körperbreite zu.
    const x0 = vs.xy[0]!.x;
    const nachHinten = Math.sign(P(pfad[m]!)[0] - P(pfad[0]!)[0]) || 1;
    const jNaht = untenV ? N / 2 : 0;
    const ringZeilen = (i: number): number[] => {
      const out: number[] = [];
      // Ringanfang: der untere Bogen von Ring i0 ist die Lippe selbst, kein Kieferpunkt
      if (untenV && lage.ringA !== undefined && i === ringA0) return out;
      if (untenV) for (let jj = jL + 1; jj <= N / 2; jj++) out.push(jj);
      else for (let jj = jL - 1; jj >= 0; jj--) out.push(jj);
      return out.map((jj) => v.ringPunkt(i, jj)).concat(out.filter((jj) => jj !== jNaht).map((jj) => v.ringPunkt(i, N - jj)));
    };
    const kappenZeilen = (): { idx: number; t: number; w: number }[] => {
      const out: { idx: number; t: number; w: number }[] = [];
      // Ringanfang: die Kappe ist Nasenspitze, kein Kiefer
      for (let a = c / 2; a < c && lage.ringA === undefined; a++) {
        for (let b = untenV ? 1 : bL + 1; untenV ? b < bL : b < c; b++) {
          const w = untenV ? (bL - b) / bL : (b - bL) / (c - bL);
          out.push({ idx: v.kappe('vorn', a, b), t: a - c / 2, w });
          if (a > c / 2) out.push({ idx: v.kappe('vorn', c - a, b), t: a - c / 2, w });
        }
      }
      return out;
    };
    let xVorn = P(pfad[0]!)[0];
    const vornSuche = (x: number) => { if ((x - xVorn) * nachHinten < 0) xVorn = x; };
    for (let i = ringA0; i <= k; i++) for (const idx of ringZeilen(i)) vornSuche(P(idx)[0]);
    for (const z of kappenZeilen()) vornSuche(P(z.idx)[0]);
    const vorschub = (x0 - xVorn) * nachHinten < 0 ? x0 - xVorn : 0;
    const geschnitten = (idx: number): boolean => vorschub === 0 && (P(idx)[0] - x0) * nachHinten < 0;
    // Wand: Die Ringe vor der Ebene (und die Kappenzeilen) legen sich als verschachtelte Umrisse auf die Ebene. Den
    // Umriss gibt **ein** Bezugsring für die ganze Region — der erste Ring, von dem keine Kieferzeile mehr geschnitten
    // ist; alle Ringe davor gehen ganz auf die Wand (auch ihre knapp ungeschnittenen Zeilen), innere Ringe und die
    // Kappenzeilen schrumpfen zur Wandmitte. Ein Bezugsring je Zeile skalierte die Zeilen eines Rings verschieden
    // (Tiger: Ring 1 in Zeile 7 ungeschnitten, in Zeile 8 geschnitten) — Zickzack, 580 Paare haut/haut am Kinn; einfach
    // auf die Ebene geklappt lagen sie in falscher Reihenfolge übereinander (Rex-Schnauze: 172 Paare).
    const jrVon = (j: number) => (j <= N / 2 ? j : N - j);
    let refRing = k;
    for (let i = ringA0; i <= k; i++) {
      let frei = true;
      for (const idx of ringZeilen(i)) if (geschnitten(idx)) { frei = false; break; }
      if (frei) { refRing = i; break; }
    }
    // Bezugsring nicht vor der Stirn der versetzten Kante (siehe `maulLage`, `tStirn`): die Ringe davor bilden die Stirn
    if (vs.tStirn !== undefined) refRing = Math.min(k, Math.max(refRing, ringA0 + vs.tStirn - sA));
    const refPunkt = (jf: number): [number, number] => {
      const j0 = Math.max(0, Math.min(N / 2 - 1, Math.floor(jf)));
      const j1 = Math.min(N / 2, j0 + 1);
      const f = jf - j0;
      const a = P(v.ringPunkt(refRing, j0));
      const b = P(v.ringPunkt(refRing, j1));
      return [a[1] + (b[1] - a[1]) * f, Math.abs(a[2]) + (Math.abs(b[2]) - Math.abs(a[2])) * f];
    };
    let cY = 0;
    let cN = 0;
    for (let jr = 0; jr <= N / 2; jr++) {
      if (untenV ? jr <= jL : jr >= jL) continue;
      cY += refPunkt(jr)[0];
      cN++;
    }
    cY = cN ? cY / cN : P(pfad[0]!)[1];
    const setzeRegion = (idx: number, t: number, anteilHinten: number, jf: number, u: number, aufWand: boolean) => {
      const q = P(idx);
      // der ganze kürzere Kiefer folgt seiner Kante (wie der Schlitzkiefer: Ringhälfte gestreckt, Querschnitt bleibt)
      const zf = 1 - anteilZ[Math.min(m, t)]!;
      const zk = kieferZ(q[2], zf, Math.abs(P(kopie[Math.min(m, t)]!)[2]));
      if (Math.abs(zk) > 1.002 * Math.abs(q[2])) kieferBreiter[idx] = 1;
      if (vorschub !== 0) {
        setze(idx, [q[0] + vorschub * (1 - anteilHinten), q[1], zk]);
        return;
      }
      if (!aufWand) {
        setze(idx, [q[0], q[1], zk]);
        return;
      }
      const ref = refPunkt(jf);
      const sc = 0.1 + 0.9 * Math.max(0, Math.min(1, u));
      const zs = q[2] < 0 ? -1 : 1;
      setze(idx, [x0, cY + (ref[0] - cY) * sc, zs * ref[1] * sc * zf]);
    };
    // Kiefer aus seiner eigenen schwarzen Linie (Block 2, Florian 14.10.: „sollen von der Seite direkt in die schwarze
    // Profillinie übergehen“): Liegt der Anfang als Knoten im Seitenumriss (`kieferUmriss` = sein schwarzer Bogen vom
    // Anfang weg), wird alles vor dem Bezugsring eine Coons-Fläche zwischen Lippenkante (Kette), schwarzem Bogen (Naht),
    // Bezugsring und dem Anfang — runde Stirn statt Wand, die Naht liegt auf der schwarzen Linie
    const coons = !!kieferUmriss && kieferUmriss.length >= 2 && vorschub === 0;
    if (coons) {
      const bogen = kieferUmriss!;
      const cum = [0];
      for (let q = 1; q < bogen.length; q++) cum.push(cum[q - 1]! + Math.hypot(bogen[q]!.x - bogen[q - 1]!.x, bogen[q]!.y - bogen[q - 1]!.y));
      const nahtRef = P(v.ringPunkt(refRing, jNaht));
      // Bogenstelle des Bezugsring-Nahtpunkts (nur im vorderen Teil des Bogens suchen, der Rest läuft um den Körper)
      let sRef = cum[cum.length - 1]! * 0.5;
      let dBest = Infinity;
      for (let q = 0; q + 1 < bogen.length && cum[q]! < 0.6 * cum[cum.length - 1]!; q++) {
        const a = bogen[q]!;
        const b = bogen[q + 1]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const l2 = dx * dx + dy * dy || 1e-18;
        const f = Math.min(1, Math.max(0, ((nahtRef[0] - a.x) * dx + (nahtRef[1] - a.y) * dy) / l2));
        const d = Math.hypot(a.x + dx * f - nahtRef[0], a.y + dy * f - nahtRef[1]);
        if (d < dBest) {
          dBest = d;
          sRef = cum[q]! + (cum[q + 1]! - cum[q]!) * f;
        }
      }
      const bogenBei = (sb: number): [number, number, number] => {
        let q = 0;
        while (q < cum.length - 2 && cum[q + 1]! < sb) q++;
        const d = cum[q + 1]! - cum[q]!;
        const f = d > 1e-15 ? Math.min(1, Math.max(0, (sb - cum[q]!) / d)) : 0;
        return [bogen[q]!.x + (bogen[q + 1]!.x - bogen[q]!.x) * f, bogen[q]!.y + (bogen[q + 1]!.y - bogen[q]!.y) * f, 0];
      };
      const nahtJ = untenV ? N / 2 : 0;
      const L1 = P(kopie[Math.min(m, tVonRing(refRing))]!);
      const S1 = bogenBei(sRef);
      const B = (jf: number): [number, number, number] => {
        const j0 = Math.max(0, Math.min(N / 2 - 1, Math.floor(jf)));
        const j1 = Math.min(N / 2, j0 + 1);
        const f = jf - j0;
        const a = P(v.ringPunkt(refRing, j0));
        const b = P(v.ringPunkt(refRing, j1));
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.abs(a[2]) + (Math.abs(b[2]) - Math.abs(a[2])) * f];
      };
      const flaeche = (idx: number, u: number, jf: number, lippe: readonly number[]) => {
        const w = Math.max(0, Math.min(1, untenV ? (jf - jL) / (nahtJ - jL) : (jL - jf) / (jL - nahtJ)));
        const Su = bogenBei(u * sRef);
        const Bv = B(jf);
        const q = P(idx);
        const lz = Math.abs(lippe[2]!);
        const pos: [number, number, number] = [0, 0, 0];
        for (let d = 0; d < 2; d++) pos[d] = (1 - w) * lippe[d]! + w * Su[d]! + u * (Bv[d]! - ((1 - w) * L1[d]! + w * S1[d]!));
        const z = (1 - w) * lz + u * (Bv[2] - (1 - w) * Math.abs(L1[2]!));
        pos[2] = (q[2] < 0 ? -1 : 1) * Math.max(0, z);
        if (Math.abs(pos[2]) > 1.002 * Math.abs(q[2])) kieferBreiter[idx] = 1;
        setze(idx, pos);
      };
      for (let i = ringA0; i <= k; i++) {
        const t = tVonRing(i);
        for (const idx of ringZeilen(i)) {
          const g = gitterLage(v, idx);
          const jr = g.art === 'ring' ? jrVon(g.j) : jL;
          if (i < refRing) flaeche(idx, (i - ringA0 + 1) / (refRing - ringA0 + 1), jr, P(kopie[Math.min(m, t)]!));
          else setzeRegion(idx, t, k > ringA0 ? (i - ringA0) / (k - ringA0) : 1, jr, 1, false);
        }
      }
      for (const z of kappenZeilen()) {
        const g = gitterLage(v, z.idx);
        if (g.art !== 'vorn') continue;
        const aR = g.a >= c / 2 ? g.a : c - g.a;
        const r = Math.max(Math.abs(aR - c / 2), Math.abs(g.b - c / 2));
        let mIdx = 0;
        for (let q = 0; q <= 4 * r; q++) { const [qa, qb] = quadratRing(c, r, q); if (qa === aR && qb === g.b) { mIdx = q; break; } }
        const jf = Math.min(N / 2, (mIdx * c) / (2 * Math.max(1, r)));
        flaeche(z.idx, r / (c / 2) / (refRing + 1), jf, P(kopie[Math.min(m, r)]!));
      }
    }
    for (let i = ringA0; !coons && i <= k; i++) {
      const t = tVonRing(i);
      for (const idx of ringZeilen(i)) {
        const g = gitterLage(v, idx);
        const jr = g.art === 'ring' ? jrVon(g.j) : jL;
        setzeRegion(idx, t, k > ringA0 ? (i - ringA0) / (k - ringA0) : 1, jr, (i - ringA0 + 1) / (refRing - ringA0 + 1), i < refRing);
      }
    }
    for (const z of coons ? [] : kappenZeilen()) {
      const g = gitterLage(v, z.idx);
      if (g.art !== 'vorn') continue;
      const aR = g.a >= c / 2 ? g.a : c - g.a;
      const r = Math.max(Math.abs(aR - c / 2), Math.abs(g.b - c / 2));
      let mIdx = 0;
      for (let q = 0; q <= 4 * r; q++) { const [qa, qb] = quadratRing(c, r, q); if (qa === aR && qb === g.b) { mIdx = q; break; } }
      const jf = Math.min(N / 2, (mIdx * c) / (2 * Math.max(1, r)));
      setzeRegion(z.idx, z.t, 0, jf, r / (c / 2) / (refRing + 1), refRing > 0 || geschnitten(z.idx));
    }
  }
  for (let r = 1; r <= K; r++) {
    const s = (opt.tiefe * r) / K;
    for (let t = 0; t < m; t++) {
      const p = P(pfad[t]!);
      const pu = P(unten[t]!);
      const T = Tvon(t);
      const basisO = lerp3(p, T, s);
      const basisU = lerp3(pu, T, s);
      const nrm = normale(t);
      const linse = linseAn(lerp3(p, T, s)) * (0.4 + (0.6 * r) / K);
      const o: [number, number, number] = [basisO[0] + nrm[0] * linse, basisO[1] + nrm[1] * linse, t === 0 ? 0 : basisO[2] + nrm[2] * linse];
      const u: [number, number, number] = [basisU[0] - nrm[0] * linse, basisU[1] - nrm[1] * linse, t === 0 ? 0 : basisU[2] - nrm[2] * linse];
      setze(tasche.oben[r - 1]![t]!, o);
      setze(tasche.unten[r - 1]![t]!, u);
      quelle[tasche.oben[r - 1]![t]!] = pfad[t]!;
      quelle[tasche.unten[r - 1]![t]!] = pfad[t]!;
      hoehe[tasche.oben[r - 1]![t]!] = hoeheV[pfad[t]!]!;
      hoehe[tasche.unten[r - 1]![t]!] = hoeheV[pfad[t]!]!;
      art[tasche.oben[r - 1]![t]!] = 3;
      art[tasche.unten[r - 1]![t]!] = 4;
      tiefe[tasche.oben[r - 1]![t]!] = r / K;
      tiefe[tasche.unten[r - 1]![t]!] = r / K;
      untenSeite[tasche.unten[r - 1]![t]!] = 1;
      if (t > 0) {
        setze(tasche.obenLinks[r - 1]![t]!, spiegel(o));
        setze(tasche.untenLinks[r - 1]![t]!, spiegel(u));
        quelle[tasche.obenLinks[r - 1]![t]!] = pfadLinks[t]!;
        quelle[tasche.untenLinks[r - 1]![t]!] = pfadLinks[t]!;
        hoehe[tasche.obenLinks[r - 1]![t]!] = hoeheV[pfadLinks[t]!]!;
        hoehe[tasche.untenLinks[r - 1]![t]!] = hoeheV[pfadLinks[t]!]!;
        art[tasche.obenLinks[r - 1]![t]!] = 3;
        art[tasche.untenLinks[r - 1]![t]!] = 4;
        tiefe[tasche.obenLinks[r - 1]![t]!] = r / K;
        tiefe[tasche.untenLinks[r - 1]![t]!] = r / K;
        untenSeite[tasche.untenLinks[r - 1]![t]!] = 1;
      }
    }
    const w = lerp3(M, Tvon(m), s);
    setze(tasche.winkel[r - 1]!, w);
    setze(tasche.winkelLinks[r - 1]!, spiegel(w));
    for (const idx of [tasche.winkel[r - 1]!, tasche.winkelLinks[r - 1]!]) {
      quelle[idx] = idx === tasche.winkel[r - 1] ? pfad[m]! : pfadLinks[m]!;
      hoehe[idx] = hoeheV[pfad[m]!]!;
      art[idx] = 6;
      tiefe[idx] = r / K;
      untenSeite[idx] = 0.5;
    }
  }

  // ----- Taschenpunkte im Körper halten -----
  // Ein Taschenpunkt bleibt in der mittleren Höhe (±(0,5 − Rand) · H) und innerhalb von 80 % der Breite seiner nächsten
  // Station; die Klammer ist monoton, Ober- und Unterblatt kreuzen sich nicht.
  const RAND = 0.3;
  const innenHalten = (idx: number) => {
    const p = P(idx);
    const best = stationBei(p);
    let a = (p[0] - best.cx) * best.dx + (p[1] - best.cy) * best.dy;
    const grenze = (0.5 - RAND) * best.H;
    a = Math.min(grenze, Math.max(-grenze, a));
    // Breite bei Höhe a aus dem Halbprofil (a fällt von oben nach unten)
    const zMax = 0.8 * profilBreite(best, a);
    const quer = (p[0] - best.cx) * -best.dy + (p[1] - best.cy) * best.dx;
    const x = best.cx + best.dx * a - best.dy * quer;
    const y = best.cy + best.dy * a + best.dx * quer;
    const z = Math.min(zMax, Math.max(-zMax, p[2]));
    setze(idx, [x, y, z]);
  };
  for (let i = n0; i < n; i++) if (art[i] === 3 || art[i] === 4 || art[i] === 6) innenHalten(i);

  // ----- Käfig bauen, Orientierung der Taschenflächen prüfen -----
  const kaefig = kaefigAusFlaechen(ziele, [...flaechen, ...taschenFlaechen]);
  const pr = pruefeKaefig(kaefig);
  if (!pr.ok) throw new Error(`Maul: Käfig nicht konsistent: ${pr.fehler.slice(0, 3).join('; ')}`);
  // Falten der Vorlage übernehmen (Kanten können nun an unteren Kopien hängen), Lippen scharf
  const vk = v.kaefig;
  const kopie = (idx: number): number[] => {
    const o = tOben.get(idx);
    return o ? [idx, o.links ? untenLinks[o.t]! : unten[o.t]!] : [idx];
  };
  for (let e = 0; e < vk.nE; e++) {
    const sch = vk.eSchaerfe[e]!;
    if (sch <= 0) continue;
    for (const a of kopie(vk.eA[e]!)) for (const b of kopie(vk.eB[e]!)) {
      const ke = kanteZwischen(kaefig, a, b);
      if (ke >= 0) kaefig.eSchaerfe[ke] = Math.max(kaefig.eSchaerfe[ke]!, sch);
    }
  }
  for (let i = 0; i < vk.n; i++) {
    const sch = vk.vSchaerfe[i]!;
    if (sch > 0) for (const a of kopie(i)) kaefig.vSchaerfe[a] = sch;
  }
  for (let t = 0; t < m; t++) {
    const paare: [number, number][] = [
      [pfad[t]!, pfad[t + 1]!],
      [pfadLinks[t]!, pfadLinks[t + 1]!],
      [unten[t]!, U(0, t + 1, false)],
      [untenLinks[t]!, U(0, t + 1, true)],
    ];
    // Kiefer getrennt: Boden- und Innenreihe der Oberlippe sind Falten (sonst rundet die Unterteilung das U weg und die
    // Kontrollpunkte schießen 2 % der Höhe über die Haut hinaus: Innenseite vor der Schnauzenspitze, 240 Paare)
    for (const [a, b] of paare) {
      const ke = kanteZwischen(kaefig, a, b);
      if (ke >= 0) kaefig.eSchaerfe[ke] = opt.lippenSchaerfe;
    }
  }
  // Hautfalten enden an der Lippe: Eine Ringfalte (Umriss-Ecke), die den Schlitz kreuzt, läge sonst nur auf einer Kopie
  // (oben die obere Ringhälfte, unten die untere) und machte die eine Kopie zur Ecke, die andere zum Faltenpunkt — die
  // Grenzlagen der beiden Ketten klafften (Tiger: Kastenfront, Ringfalten der Nasen- und Kinnecke). Beide Kopien sehen so
  // dieselben zwei Lippenfalten.
  for (const idx of [...pfad, ...pfadLinks.slice(1), ...unten, ...untenLinks.slice(1)]) {
    for (let q = kaefig.vKStart[idx]!; q < kaefig.vKStart[idx + 1]!; q++) {
      const e = kaefig.vKanten[q]!;
      const o = kaefig.eA[e] === idx ? kaefig.eB[e]! : kaefig.eA[e]!;
      if (art[o] === 0) kaefig.eSchaerfe[e] = 0;
    }
  }
  // Lippenabstand je Käfigpunkt (Welt): nächster Pfadpunkt beider Seiten
  const lippenAbstand = new Float64Array(n).fill(10);
  const lippen = [...(vs?.oben ? unten : pfad), ...(vs?.oben ? untenLinks : pfadLinks).slice(1)].map((idx) => P(idx));
  for (let i = 0; i < n; i++) {
    if (art[i] !== 0) {
      lippenAbstand[i] = art[i] === 1 || art[i] === 2 || art[i] === 6 ? 0 : 0;
      continue;
    }
    const p = P(i);
    let best = Infinity;
    for (const q of lippen) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
    lippenAbstand[i] = best;
  }
  // Kiefergewichte: Lage zum Schlitz; der Abfall (Ringband oder Winkel um das Gelenk) kommt aus `kieferGewichteSetzen`
  const gewichtUnten = new Float64Array(n);
  const gewichtOben = new Float64Array(n);
  const glatt = glattStufe;
  const bandRing = (i: number, band: number) => (i <= k ? 1 : 1 - glatt((i - k) / Math.max(1, band)));
  // Basis der Unterkiefergewichte (Vorlagenpunkte): Gewicht ohne Abfall, Ringband, Punkte mit Winkelgewicht, Ruhelage
  const basisUnten = new Float64Array(n0);
  const basisBand = new Float64Array(n0);
  const winkelTeil = new Uint8Array(n0);
  const ruheXY = new Float64Array(2 * n0);
  // Kieferplatte: bis `platte` Maullängen unter der Lippe dreht die Haut starr mit dem Unterkiefer; die Kehlhaut darunter
  // (Beutel) folgt der Plattenkante ihres Rings als Verschiebung, auslaufend (sonst schwingt ein Kinnboden in den Bauch)
  const beutelGewicht = new Float64Array(n);
  const beutelRing = new Int16Array(n).fill(-1);
  const plattenKante = new Float64Array(3 * v.R);
  const plattenDicke = opt.platte * L;
  for (let i = 0; i < v.R; i++) {
    const lp = v.ringPunkt(i, jL);
    plattenKante[3 * i] = zieleV[3 * lp]!;
    plattenKante[3 * i + 1] = zieleV[3 * lp + 1]! - plattenDicke;
    plattenKante[3 * i + 2] = zieleV[3 * lp + 2]!;
  }
  const plattenGewicht = (i: number, idx: number): number => {
    const d = zieleV[3 * v.ringPunkt(i, jL) + 1]! - zieleV[3 * idx + 1]!;
    if (d <= plattenDicke) return 1;
    beutelGewicht[idx] = 1 - glatt((d - plattenDicke) / Math.max(1e-9, opt.beutel * L));
    beutelRing[idx] = i;
    return 0;
  };
  for (let i = 0; i < n0; i++) {
    const g = gitterLage(v, i);
    ruheXY[2 * i] = zieleV[3 * i]!;
    ruheXY[2 * i + 1] = zieleV[3 * i + 1]!;
    let o = 0;
    let u = 0;
    let f = 1;
    let fo = 1;
    if (g.art === 'ring') {
      f = bandRing(g.i, opt.band);
      fo = bandRing(g.i, opt.bandOben);
      const jr = g.j <= N / 2 ? g.j : N - g.j;
      if (lage.ringA !== undefined && (g.i < lage.ringA || (g.i === lage.ringA && jr >= jL))) {
        // Ringanfang: die Nase vor Ring i0 folgt dem Schädel; der untere Bogen von i0 ist die obere Lippenkopie
        o = 1;
      } else if (g.i > k && opt.nackenGanz) {
        // hinter dem Winkel: der ganze Ring folgt dem Schädel (Nacken biegt), die untere Hälfte zusätzlich der Kehle
        o = 1;
        if (jr > jL) u = 1;
      } else if (jr < jL) o = 1;
      else if (jr > jL) {
        u = plattenGewicht(g.i, i);
        // Winkelgewichte ersetzen das Ringband (auch vor dem Winkel: tief unter dem Gelenk dreht die Haut weniger mit)
        winkelTeil[i] = 1;
      } else if (g.i === k) {
        o = 0.5;
        u = 0.5;
      } else o = 1; // obere Kopie auf dem Pfad
    } else if (g.art === 'vorn') {
      if (treppe) {
        const aR = g.a >= c / 2 ? g.a : c - g.a;
        const stufe = treppeBei(aR);
        if (tOben.has(i) || i === pfad[m] || i === pfadLinks[m]) o = 1;
        else if (g.b < stufe) u = 1;
        else if (g.b > stufe) o = 1;
        else {
          o = 0.5;
          u = 0.5;
        }
      } else if (lage.ringA !== undefined || g.b > bL) o = 1; // Ringanfang: die Kappe ist Nasenspitze
      else if (g.b < bL) {
        u = 1;
        winkelTeil[i] = 1;
      } else o = 1;
    } else {
      f = 0;
      fo = 0;
    }
    gewichtOben[i] = o * fo;
    basisUnten[i] = u;
    basisBand[i] = f;
  }
  // der Beutel läuft mit dem Kiefergewicht aus (Faktor in `kieferGewichteSetzen`): hinter dem Band darf die Kehlhaut
  // nicht der (voll gedrehten) Plattenkante ihres Rings folgen (Tiger, Ringpfad: Bauchringe 15–19 wanderten 1–2 %)
  const basisBeutel = Float64Array.from(beutelGewicht.subarray(0, n0));
  // Plattenmaul: Gewicht der Lippen und Taschen zum Winkel hin auslaufen lassen (Scharnier hinter der Platte; ein voll
  // drehendes Lippenende schwenkte durch die Winkelsäule), über die letzten zwei Pfadpunkte
  const winkelNah = (idx: number): number => {
    if (!treppe) return 1;
    const q = quelle[idx]!;
    let t = -1;
    for (let u = 0; u <= m; u++) if (pfad[u] === q || pfadLinks[u] === q) t = u;
    if (t < 0) return 1;
    return Math.min(1, 0.5 + (0.5 * (m - t)) / 2);
  };
  for (let i = n0; i < n; i++) {
    switch (art[i]) {
      case 2:
      case 4:
      case 8:
        gewichtUnten[i] = winkelNah(i);
        break;
      case 3:
      case 7:
        gewichtOben[i] = 1;
        break;
      case 6:
        gewichtOben[i] = 0.5;
        gewichtUnten[i] = 0.5;
        break;
      default:
        break;
    }
  }
  // Schädelgelenk: hinter dem Mundwinkel auf der Wirbelsäulenhöhe des Rings am Bandende
  const ringHinten = Math.min(v.R - 1, k + Math.max(1, opt.band));
  let yMitte = 0;
  for (let j = 0; j < N; j++) yMitte += zieleV[3 * v.ringPunkt(ringHinten, j) + 1]!;
  yMitte /= N;
  // Plattenmaul: der Schädel dreht hinter dem Scharnier (nicht hinter dem Plattenwinkel, der vor dem Scharnier liegt)
  const schaedel: V2 = { x: MH[0] - vorn * opt.schaedelHinter * L, y: yMitte };
  // Zugrichtung: Mittel der Richtungen Rachen → Lippe (Seitenansicht), für die Öffnungsart „ziehen“
  let zx = 0;
  let zy = 0;
  for (let t = 0; t <= m; t++) {
    const p = P(pfad[t]!);
    const T = Tvon(t);
    const dx = p[0] - T[0];
    const dy = p[1] - T[1];
    const l = Math.hypot(dx, dy) || 1;
    zx += dx / l;
    zy += dy / l;
  }
  const zl = Math.hypot(zx, zy) || 1;
  const zug: V2 = { x: zx / zl, y: zy / zl };
  const info: MaulAbleitung = {
    lage,
    opt,
    pfad,
    pfadLinks,
    unten,
    untenLinks,
    tasche,
    art,
    tiefe,
    lippenAbstand,
    untenSeite,
    quelle,
    gewichtUnten,
    gewichtOben,
    scharnier: { x: MH[0], y: MH[1] }, // `kieferGewichteSetzen` setzt das Gelenk
    schaedel,
    vorn,
    hoehe: H,
    zug,
    laenge: L,
    kopfHoehe: kopfHoehe > 0 ? kopfHoehe : H,
    kieferBreiter,
    kieferBasis: { n0, unten: basisUnten, beutel: basisBeutel, band: basisBand, winkelTeil, ruhe: ruheXY, mundwinkel: { x: MH[0], y: MH[1] }, anfang: { x: S[0], y: S[1] } },
    beutelGewicht,
    beutelRing,
    plattenKante,
    rachen: { sKnick, sK, sEingang, ziele: rachenZiele },
  };
  kieferGewichteSetzen(info, opt);
  return { kaefig, ziele, hoehe, info };
}

// ---------- Ableitung mit Maul ----------

/** Ableitung wie `ableiten`, mit Maul: Umparametrisierung der Schleifen, Schlitz, Tasche, Rachen; Naht-Ausgleich nur auf der Haut. */
export function ableitenMitMaul(dokRoh: Dokument, linie: MaulLinie, optionen: Partial<AbleitOptionen> = {}, maulOptionen: Partial<MaulOptionen> = {}): MaulErgebnis {
  const opt = { ...ABLEIT_STANDARD, glaettung: 0.15, ...optionen };
  const mopt = { ...MAUL_STANDARD, ...maulOptionen };
  const t0 = jetzt();
  // Kiefer getrennt mit Lippenknoten im Seitenumriss (Block 2): abgeleitet wird mit dem Schlitz als Sehne, die Naht hängt
  // am Umriss ohne Schlitz (endet an den Lippenknoten)
  const { dok: dokK, schlitz } = dokFuerKern(dokRoh);
  const dok = dokK;
  const l = kernLeiter(dok);
  const t1 = jetzt();
  const breiten = silhouettenBreite(dok);
  const t2 = jetzt();
  const vorlage = roehre(opt.ringe, opt.ring);
  const anfang = konturAnfang(linie);
  // Ringanfang (14.10. spätnachts): Läge der Anfang hinter dem Platz von Ring 0 (die Kappe müsste ihn einschließen),
  // behält die Schnauze ihre Ringe und die Lippe beginnt an einem Ring — sonst fiele die Schnauze als Kappe zusammen
  // Band um die Schwelle (14.10.): ein eingefrorener Ringanfang bleibt bis 0,75 · kappe, eine eingefrorene Kappe bis 1,5 · kappe
  const gm = opt.stationen?.maul;
  const kappeSchwelle = (gm ? (gm.ringA !== undefined ? 0.75 : 1.5) : 1) * opt.kappe;
  const ringAnfang = anfang !== undefined && !!linie.punkte && linie.punkte.length >= 2 && anfangKappeMin(anfang) > kappeSchwelle;
  // Maulbereich für die Ringverteilung: vom vorderen Anfang (etwas davor, Platz für den letzten Nasenring) bis zum Winkel
  // Ringzahl nach der Größe des Mauls: Abstand der Ringe nicht unter einem Fünftel der Sprossenlänge (fast quadratische
  // Felder); acht Ringe in einem winzigen Maul (Langhals) gaben Streifen von 0,003 und Hautfalten bis 179°
  let maulBereich: MaulBereich | undefined;
  if (ringAnfang) {
    const fV = (linie.unten ?? linie.oben)?.[0]?.f;
    const vorn = Math.min(anfang!, fV ?? anfang!);
    const ende = linie.fv[linie.fv.length - 1]!.f;
    if (ende > vorn) {
      const [sv, se] = stationenAusLeiter(l, [vorn, ende]);
      const sprosse = (stn: { a: number; b: number }) => {
        const o = zugBei(l.ruecken, stn.a);
        const u = zugBei(l.bauch, stn.b);
        return { m: { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 }, len: Math.hypot(o.x - u.x, o.y - u.y) };
      };
      const a = sprosse(sv!);
      const b = sprosse(se!);
      const lang = Math.hypot(b.m.x - a.m.x, b.m.y - a.m.y);
      const ringe = Math.max(2, Math.min(8, Math.round(lang / (0.2 * Math.max(1e-6, (a.len + b.len) / 2))) + 1));
      maulBereich = { von: vorn - 0.1 * (ende - vorn), bis: ende, ringe };
    }
  }
  const st = stationenWaehlen(l, opt, dok, anfang !== undefined && !ringAnfang ? anfangKappeMin(anfang) : undefined, maulBereich);
  faltenSetzen(vorlage, st, l, dok, breiten, opt);
  const lage = maulLage(vorlage, l, st, linie, ringAnfang, gm);
  // Entscheidungen der Maullage mit einfrieren (die Ringanteile allein ließen die Maultopologie beim Ziehen kippen)
  if (!lage.platte) st.gefroren.maul = { winkel: lage.k, ...(lage.ringA !== undefined ? { ringA: lage.ringA } : {}), kontur: anfang !== undefined };
  const { ziele, hoehe } = zieleBerechnen(vorlage, l, st, breiten, dok, opt, lage);
  // schwarzer Bogen des kürzeren Kiefers vom eigenen Anfang weg (Block 2): Überbiss = blauer Anfang (Unterkiefer, Anfang
  // des offenen Umrisses), Unterbiss = roter Anfang (Oberkiefer, Ende des offenen Umrisses)
  let kieferUmriss: V2[] | undefined;
  if (schlitz && lage.versatz) {
    const offen = umrissDichtOffen(dok, schlitz).pts;
    const startUnten = dok.profile.seite.knoten[(schlitz.segment + 1) % dok.profile.seite.knoten.length]!.marke === 'maulUnten';
    kieferUmriss = lage.versatz.oben === !startUnten ? offen : offen.slice().reverse();
  }
  const mk = maulKaefig(vorlage, st, lage, ziele, hoehe, mopt, linie.punkte, kieferUmriss);
  const haut = new Uint8Array(mk.kaefig.n);
  const zielGewicht = new Float64Array(mk.kaefig.n).fill(1);
  for (let i = 0; i < mk.kaefig.n; i++) {
    const a = mk.info.art[i]!;
    haut[i] = a === 0 ? 1 : 0; // Lippen liegen in der Rille, nicht auf dem Umriss
    if (a === 1 || a === 2 || a === 6 || a === 7 || a === 8) zielGewicht[i] = opt.nahtGewicht;
  }
  // Nahtrundgang startet am Hautpunkt über der Spitze (die Spitze selbst liegt auf der Lippe)
  const nahtStart = vorlage.kappe('vorn', vorlage.c / 2, vorlage.c / 2 + 1);
  // Breitenpunkte mit Maul (Phase 2 M3, 15.10. nachts): schwach (Gewicht 4 statt 16) und in Maulringen nur auf Hautzeilen.
  // Früher ganz aus (der wellige Käfig warf in der Kieferpose Falten, Tiger-Stern 70 Durchdringungen); ohne sie war der
  // Körper im Top am Maul bis 6 px schmaler. Gemessen: Top Kugel 5,0 → 3,8 px, Nase 6,4 → 4,2 px, Falten gleich oder
  // kleiner, keine neuen Durchdringungen; Gewicht 16 warf wieder Paare (Kugel 6 bei 100 %).
  const abl = fertigstellen({ opt: { ...opt, breiteGewicht: BREITE_MIT_MAUL }, vorlage, kaefig: mk.kaefig, ziele: mk.ziele, hoehe: mk.hoehe, l, st, breiten, dok, haut, zielGewicht, nahtStart, schlitz, maulBau: true, zeiten: { t0, t1, t2 } });
  const xyz = abl.kaefig.xyz;
  const info = mk.info;
  // Untere Kette bitgleich auf die obere (gleiche Ziele, scharfe Falten: die Grenzlage hängt nur von der Kette ab);
  // bei getrennten Kiefern (M2) hat die untere Kette eigene Ziele (Unterkieferkante innen, über der Lippe), nur an der
  // Spitze (t ≤ 1) und am Winkel (t ≥ m − 1) liegen beide wie bei gleichen Kiefern in der Rille
  // bei getrennten Kiefern (M2): untere Kette = gelöste obere Kette + geplanter Versatz der Ziele (der Löser zog die
  // eigenständig gelöste untere Kette an der Spitze 0,5 % unter die obere: Kontakt)
  if (info.lage.versatz) {
    // Kiefer getrennt: beide Lippenketten als eigene Faltenkurven lösen — ihre Grenzlagen hängen nur von der Kette
    // selbst ab (scharfe Falten), also trifft ein kleines System aus ihren Grenzzeilen die Ziele exakt (Florian: Rot und
    // Blau exakt die Lippenkante). Die frühere Regel „gelöste Schlitzkette + Zielversatz“ übertrug die
    // Kontrollpunkt-Schwingung der Schlitzkette an der Kappe (fünf Spalten auf 2 % der Maullänge) auf die versetzte
    // Kette (Zickzack der Breite, 36 Paare lippeU/lippeU); der Ausgleich allein zog die Schlitzkette beim Unterbiss am
    // Kinn 0,03 über ihr Ziel (36 Paare haut/lippeU).
    versatzKetteLoesen(abl, info, mk.ziele, !!info.lage.versatz.oben);
    versatzKetteLoesen(abl, info, mk.ziele, !info.lage.versatz.oben);
  } else {
    for (let t = 0; t < info.lage.m; t++) {
      for (const [o, u] of [
        [info.pfad[t]!, info.unten[t]!],
        [info.pfadLinks[t]!, info.untenLinks[t]!],
      ]) for (let d = 0; d < 3; d++) xyz[3 * u! + d] = xyz[3 * o! + d]!;
    }
  }
  // Taschenpunkte gegen die Lippenketten nachlösen, mit Glättung: Ihre Grenzlagen hängen nur von Tasche und Ketten ab (scharfe Falten).
  taschenNachloesen(abl, info, mk.ziele, opt.glaettung);
  const fein = anwenden3(abl.unterteilung.grenze, xyz);
  return { ...abl, fein, maul: info };
}

/**
 * Versetzte Lippenkette (Kiefer getrennt) lösen: Kontrollpunkte der rechten Kette t = 0 … m − 1 (links gespiegelt, der
 * Winkel t = m ist gelöst und fest), so dass die Grenzlagen (Zeilen der Grenzmatrix, auf der Kette nur die Kette selbst:
 * Falten- oder Eckregel) die Ziele treffen. Zeilen, die fremde Punkte berühren, nehmen deren gelöste Lagen als bekannt.
 */
function versatzKetteLoesen(abl: Ableitung, info: MaulAbleitung, ziele: Float64Array, oben: boolean, glatt = KETTE_GLATT): void {
  const m = info.lage.m;
  const kette = oben ? info.pfad : info.unten;
  const ketteLinks = oben ? info.pfadLinks : info.untenLinks;
  const xyz = abl.kaefig.xyz;
  const G = abl.unterteilung.grenze;
  const pos = new Map<number, number>();
  for (let t = 0; t < m; t++) pos.set(kette[t]!, t);
  for (let t = 1; t < m; t++) pos.set(ketteLinks[t]!, -t); // gespiegelt: x, y gleich, z negiert
  // Grenzzeilen der Kette (A · P = r), getrennt für (x, y) und z (Spiegel)
  const Axy = new Float64Array(m * m);
  const Az = new Float64Array(m * m);
  const rxy = new Float64Array(2 * m);
  const rz = new Float64Array(m);
  for (let t = 0; t < m; t++) {
    const i = kette[t]!;
    rxy[2 * t] = ziele[3 * i]!;
    rxy[2 * t + 1] = ziele[3 * i + 1]!;
    rz[t] = ziele[3 * i + 2]!;
    for (let q = G.start[i]!; q < G.start[i + 1]!; q++) {
      const j = G.index[q]!;
      const w = G.wert[q]!;
      const tt = pos.get(j);
      if (tt === undefined) {
        rxy[2 * t] = rxy[2 * t]! - w * xyz[3 * j]!;
        rxy[2 * t + 1] = rxy[2 * t + 1]! - w * xyz[3 * j + 1]!;
        rz[t] = rz[t]! - w * xyz[3 * j + 2]!;
      } else {
        const col = Math.abs(tt);
        Axy[t * m + col] = Axy[t * m + col]! + w;
        Az[t * m + col] = Az[t * m + col]! + (tt < 0 ? -w : w);
      }
    }
  }
  // Normalgleichungen, wahlweise mit Glättung der Kontrollpunkte (zweite Differenz). Standard ohne: Glättung 0,02
  // kostete am Rex rot 0,06 → 0,63 px und blau 0 → 1,4 px, ohne die Kinnpaare des Unterbisses zu beseitigen.
  const loese = (A: Float64Array, r: Float64Array, k: number): Float64Array => {
    const N = new Float64Array(m * m);
    const rhs = new Float64Array(k * m);
    for (let i = 0; i < m; i++) {
      for (let a = 0; a < m; a++) {
        const wa = A[i * m + a]!;
        if (wa === 0) continue;
        for (let b = 0; b < m; b++) N[a * m + b] = N[a * m + b]! + wa * A[i * m + b]!;
        for (let d = 0; d < k; d++) rhs[k * a + d] = rhs[k * a + d]! + wa * r[k * i + d]!;
      }
    }
    if (glatt > 0) {
      for (let t = 1; t + 1 < m; t++) {
        const idx = [t - 1, t, t + 1];
        const wgt = [-1, 2, -1];
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) N[idx[a]! * m + idx[b]!] = N[idx[a]! * m + idx[b]!]! + glatt * wgt[a]! * wgt[b]!;
      }
    }
    return luLoesen(luZerlegen(N, m), rhs, k);
  };
  const xy = loese(Axy, rxy, 2);
  const z = loese(Az, rz, 1);
  for (let t = 0; t < m; t++) {
    const i = kette[t]!;
    xyz[3 * i] = xy[2 * t]!;
    xyz[3 * i + 1] = xy[2 * t + 1]!;
    xyz[3 * i + 2] = t === 0 ? 0 : z[t]!;
    if (t > 0) {
      const l = ketteLinks[t]!;
      xyz[3 * l] = xy[2 * t]!;
      xyz[3 * l + 1] = xy[2 * t + 1]!;
      xyz[3 * l + 2] = -z[t]!;
    }
  }
}
/** Glättungsgewicht der Lippenketten-Lösung (zweite Differenz der Kontrollpunkte gegen Grenzzeilen mit Gewichten ≈ 1) */
const KETTE_GLATT = 0;

/**
 * Kontrollpunkte der Tasche (Reihen, Winkelsäulen) im Ausgleich lösen: Grenzlagen treffen die Ziele (Gewicht 1), dazu
 * Laplace-Glattheit je Taschenpunkt (Gewicht λ) gegen das Überschwingen neben der scharfen Lippenfalte; Kette und Haut bleiben.
 */
function taschenNachloesen(abl: Ableitung, info: MaulAbleitung, ziele: Float64Array, lambda: number): void {
  const k = abl.kaefig;
  const n = k.n;
  const n0 = abl.vorlage.kaefig.n;
  const G = abl.unterteilung.grenze;
  const xyz = k.xyz;
  const P: number[] = [];
  for (let i = 0; i < n; i++) if (info.art[i] === 3 || info.art[i] === 4 || (info.art[i] === 6 && i >= n0)) P.push(i);
  const np = P.length;
  if (np === 0) return;
  const pos = new Int32Array(n).fill(-1);
  P.forEach((v, q) => (pos[v] = q));
  // Zeilen: (Index-Liste, Gewichte, Ziel 3) → Normalgleichungen
  const N = new Float64Array(np * np);
  const rhs = new Float64Array(3 * np);
  const zeile = (idx: number[], w: number[], gew: number, ziel: [number, number, number]) => {
    // bekannte Spalten auf die rechte Seite
    const t: [number, number, number] = [ziel[0], ziel[1], ziel[2]];
    const ui: number[] = [];
    const uw: number[] = [];
    idx.forEach((j, q) => {
      if (pos[j]! >= 0) {
        ui.push(pos[j]!);
        uw.push(w[q]!);
      } else for (let d = 0; d < 3; d++) t[d] = t[d]! - w[q]! * xyz[3 * j + d]!;
    });
    for (let a = 0; a < ui.length; a++) {
      const ra = ui[a]! * np;
      const ga = gew * uw[a]!;
      for (let b = 0; b < ui.length; b++) N[ra + ui[b]!]! += ga * uw[b]!;
      for (let d = 0; d < 3; d++) rhs[3 * ui[a]! + d]! += ga * t[d]!;
    }
  };
  for (const i of P) {
    const idx: number[] = [];
    const w: number[] = [];
    for (let c = G.start[i]!; c < G.start[i + 1]!; c++) {
      idx.push(G.index[c]!);
      w.push(G.wert[c]!);
    }
    zeile(idx, w, 1, [ziele[3 * i]!, ziele[3 * i + 1]!, ziele[3 * i + 2]!]);
    if (lambda > 0) {
      const nb: number[] = [];
      for (let q = k.vKStart[i]!; q < k.vKStart[i + 1]!; q++) {
        const e = k.vKanten[q]!;
        nb.push(k.eA[e] === i ? k.eB[e]! : k.eA[e]!);
      }
      if (nb.length >= 2) zeile([i, ...nb], [1, ...nb.map(() => -1 / nb.length)], lambda, [0, 0, 0]);
    }
  }
  const x = luLoesen(luZerlegen(N, np), rhs, 3);
  for (let q = 0; q < np; q++) for (let d = 0; d < 3; d++) xyz[3 * P[q]! + d] = x[3 * q + d]!;
}

/** Abweichung einer Lippenkette von ihrer Linie (px bei 461 px je Kachel): Seite = Abstand (x, y) zum Polygonzug, Front = |z|-Unterschied am nächsten Punkt (null ohne Tiefe in der Linie). */
export type LippenAbweichung = { seite: number; front: number | null };
/** Abweichung beider Lippenketten (Phase 2 M2, Florian: „Rot und Blau sollen exakt die Lippenkante darstellen“); `versatz` = welcher Kiefer die versetzte Kante trägt (null = Kiefer gleich). */
export type MaulAbweichung = { versatz: 'oben' | 'unten' | null; oben: LippenAbweichung; unten: LippenAbweichung | null };

const ABWEICHUNG_PX_MAUL = 461;

/**
 * Lippenketten gegen die Linien messen: Grenzlagen der Kettenpunkte (Ruhelage) gegen die gezeichneten 3D-Linien des
 * Dokuments (`maul.zu.oben` = rote Oberlippe ↔ Kette `pfad`, `maul.zu.unten` = blaue Unterkieferkante ↔ Kette `unten`,
 * Profil-Einheiten × Maßstab); ohne Zeichnung gegen die Stützen (Schlitz: `maulLiniePunkte`, versetzte Kante: ihre
 * Seitenpunkte), dann nur in der Seite.
 */
export function maulAbweichung(abl: MaulErgebnis, dok: Dokument, linie: MaulLinie): MaulAbweichung {
  const m = abl.maul;
  const sk = dok.skalierung;
  const vs = m.lage.versatz;
  const versatz: 'oben' | 'unten' | null = vs ? (vs.oben ? 'oben' : 'unten') : null;
  const P = (idx: number): [number, number, number] => [abl.fein[3 * idx]!, abl.fein[3 * idx + 1]!, abl.fein[3 * idx + 2]!];
  const kettePfad = m.pfad.map(P);
  const ketteUnten = [...m.unten, m.pfad[m.lage.m]!].map(P);
  const gez = dok.maul?.zu;
  const welt = (l: Linie3): [number, number, number][] => abtasten3(l, 24).map((q) => [q[0] * sk, q[1] * sk, q[2] * sk]);
  const messen = (kette: [number, number, number][], zug: readonly (readonly [number, number, number])[], tiefe: boolean): LippenAbweichung => {
    let seite = 0;
    let front = 0;
    for (let t = 0; t < kette.length; t++) {
      const p = kette[t]!;
      let best = Infinity;
      let zNah = 0;
      for (let i = 0; i + 1 < zug.length; i++) {
        const a = zug[i]!;
        const b = zug[i + 1]!;
        const abx = b[0] - a[0];
        const aby = b[1] - a[1];
        const l2 = abx * abx + aby * aby || 1e-18;
        const u = Math.min(1, Math.max(0, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / l2));
        const d = Math.hypot(a[0] + abx * u - p[0], a[1] + aby * u - p[1]);
        if (d < best) {
          best = d;
          zNah = Math.abs(a[2] + (b[2] - a[2]) * u);
        }
      }
      if (!Number.isFinite(best)) continue;
      seite = Math.max(seite, best * ABWEICHUNG_PX_MAUL);
      if (tiefe && t > 0) front = Math.max(front, Math.abs(Math.abs(p[2]) - zNah) * ABWEICHUNG_PX_MAUL);
    }
    return { seite, front: tiefe ? front : null };
  };
  const hatTiefe = (zug: readonly (readonly [number, number, number])[]) => zug.some((q) => Math.abs(q[2]) > 1e-6);
  if (gez) {
    const o = welt(gez.oben);
    const oben = messen(kettePfad, o, hatTiefe(o));
    let unten: LippenAbweichung | null = null;
    if (gez.unten && versatz) {
      const u = welt(gez.unten);
      unten = messen(ketteUnten, u, hatTiefe(u));
    }
    return { versatz, oben, unten };
  }
  // ohne Zeichnung: Schlitz gegen die Stützen, versetzte Kante gegen ihre Seitenpunkte
  const schlitz = maulLiniePunkte(dok, linie).map((q) => [q.x, q.y, 0] as [number, number, number]);
  const schlitzKette = versatz === 'oben' ? ketteUnten : kettePfad;
  const schlitzAbw = messen(schlitzKette, schlitz, false);
  if (!vs) return { versatz, oben: schlitzAbw, unten: null };
  const versetztKette = vs.oben ? kettePfad : ketteUnten;
  const versetztAbw = messen(versetztKette, vs.xy.map((q) => [q.x, q.y, 0] as [number, number, number]), false);
  return vs.oben ? { versatz, oben: versetztAbw, unten: schlitzAbw } : { versatz, oben: schlitzAbw, unten: versetztAbw };
}

/** Maullinie aus Stützen (f, v); die erste Stütze gilt ab der Spitze. */
export function maulLinieAus(stuetzen: readonly { f: number; v: number }[]): MaulLinie {
  return { fv: stuetzen.map((s) => ({ f: s.f, v: s.v })) };
}

/** Vorgefertigte Maullinien je Lage: vorn (Rex, unter der Spitze), unten (tief am Kinn), hals (bis zum Halsansatz). */
export function maulLinieVorlage(_dok: Dokument, art: 'vorn' | 'unten' | 'hals'): MaulLinie {
  if (art === 'vorn') return { ...maulLinieAus([{ f: 0.02, v: 0.45 }, { f: 0.2, v: 0.42 }, { f: 0.34, v: 0.45 }]), unterSpitze: 1 };
  if (art === 'unten') return { ...maulLinieAus([{ f: 0.02, v: 0.3 }, { f: 0.16, v: 0.14 }, { f: 0.28, v: 0.22 }]), unterSpitze: 1 };
  return maulLinieAus([{ f: 0.02, v: 0.42 }, { f: 0.2, v: 0.38 }, { f: 0.4, v: 0.25 }, { f: 0.6, v: 0.28 }]);
}

/**
 * Feine Flächen, die ein Kiefer über seine Vorlage hinaus verbreitert hat (Gewicht der markierten Käfigpunkte > ½ an
 * allen Ecken): Dort darf das Netz in Front und Top über die schwarze Linie hinaus, die Linie heftet sich an (14.10. nachts).
 */
export function kieferFlaechen(abl: MaulErgebnis, flaechen: readonly (readonly number[])[]): boolean[] {
  const M = abl.unterteilung.matrix;
  const markiert = abl.maul.kieferBreiter;
  const anteil = new Float64Array(M.start.length - 1);
  for (let i = 0; i + 1 < M.start.length; i++) {
    let w = 0;
    let g = 0;
    for (let q = M.start[i]!; q < M.start[i + 1]!; q++) {
      g += M.wert[q]!;
      if (markiert[M.index[q]!]) w += M.wert[q]!;
    }
    anteil[i] = g > 0 ? w / g : 0;
  }
  return flaechen.map((f) => f.every((v) => anteil[v]! > 0.5));
}

// ---------- Pose ----------

/**
 * Maul öffnen: Unterkiefer dreht um die Achse durch die Mundwinkel (fällt), Schädel kippt zurück; Winkel je Punkt aus
 * den Gewichten (Öffnung 0 … 1). Liefert Käfiglagen und feines Netz.
 */
export function maulPose(abl: MaulErgebnis, oeffnung: number): { xyz: Float64Array; fein: Float64Array } {
  const m = abl.maul;
  const n = abl.kaefig.n;
  const xyz = new Float64Array(abl.kaefig.xyz);
  const aU = (oeffnung * m.opt.winkelUnten * Math.PI) / 180;
  const aO = (oeffnung * m.opt.winkelOben * Math.PI) / 180;
  const drehe = (i: number, cx: number, cy: number, winkel: number) => {
    const c = Math.cos(winkel);
    const s = Math.sin(winkel);
    const x = xyz[3 * i]! - cx;
    const y = xyz[3 * i + 1]! - cy;
    xyz[3 * i] = cx + x * c - y * s;
    xyz[3 * i + 1] = cy + x * s + y * c;
  };
  const zieht = m.opt.oeffnungsart === 'ziehen';
  const weite = oeffnung * m.opt.zugWeite * m.laenge;
  // gegriffener Zug des Unterkiefers (Fressen-Pose): x zur Schnauze (Vorzeichen `vorn`), y nach oben
  const zx = oeffnung * (m.opt.kieferZug?.[0] ?? 0) * m.laenge * m.vorn;
  const zy = oeffnung * (m.opt.kieferZug?.[1] ?? 0) * m.laenge;
  const kiefer = (i: number, w: number) => {
    if (zieht) {
      xyz[3 * i] = xyz[3 * i]! + w * weite * m.zug.x;
      xyz[3 * i + 1] = xyz[3 * i + 1]! + w * weite * m.zug.y;
    } else {
      drehe(i, m.scharnier.x, m.scharnier.y, -m.vorn * w * aU);
      xyz[3 * i] = xyz[3 * i]! + w * zx;
      xyz[3 * i + 1] = xyz[3 * i + 1]! + w * zy;
    }
  };
  // Verschiebung der Plattenkante je Ring (für die Kehlhaut darunter)
  const kantenZug = new Float64Array(2 * abl.vorlage.R);
  for (let r = 0; r < abl.vorlage.R; r++) {
    const ex = m.plattenKante[3 * r]!;
    const ey = m.plattenKante[3 * r + 1]!;
    if (zieht) {
      kantenZug[2 * r] = weite * m.zug.x;
      kantenZug[2 * r + 1] = weite * m.zug.y;
    } else {
      const w = -m.vorn * aU;
      const c = Math.cos(w);
      const sn = Math.sin(w);
      const x = ex - m.scharnier.x;
      const y = ey - m.scharnier.y;
      kantenZug[2 * r] = m.scharnier.x + x * c - y * sn - ex + zx;
      kantenZug[2 * r + 1] = m.scharnier.y + x * sn + y * c - ey + zy;
    }
  }
  for (let i = 0; i < n; i++) {
    const wu = m.gewichtUnten[i]!;
    const wo = m.gewichtOben[i]!;
    // Schnauze bei kleinerem x (vorn = +1): Unterkiefer dreht mathematisch positiv (Spitze nach unten) um den Mundwinkel,
    // der Schädel negativ um das Gelenk hinten (die Schnauze hebt sich, der Hinterkopf taucht nicht in den Nacken).
    // „Ziehen“: der Unterkiefer gleitet entlang der Zugrichtung vom Rachen weg (Vorhang), die Kehle läuft über das Band aus.
    if (wu > 0) kiefer(i, wu);
    const wb = m.beutelGewicht[i]!;
    if (wb > 0) {
      const r = m.beutelRing[i]!;
      xyz[3 * i] = xyz[3 * i]! + wb * kantenZug[2 * r]!;
      xyz[3 * i + 1] = xyz[3 * i + 1]! + wb * kantenZug[2 * r + 1]!;
    }
    if (wo > 0) drehe(i, m.schaedel.x, m.schaedel.y, m.vorn * wo * aO);
  }
  if (m.opt.haps > 0 && oeffnung > 0) hapsAnwenden(abl, xyz, oeffnung * m.opt.haps);
  const fein = anwenden3(abl.unterteilung.grenze, xyz);
  return { xyz, fein };
}

/**
 * Großer runder Haps (M3): Blendshape auf dem posierten Käfig. Je Lippenpunkt t (0 = Mitte vorn, m = Winkel) ein Versatz
 * — Winkel nach hinten und außen (t/m), Lippen in der Mitte auseinander (sin π t/m: Oberlippe nach oben, Unterlippe nach
 * unten, „oben“ = Richtung von der unteren zur oberen Kopie); Taschenpunkte folgen ihrer Lippe (`quelle`, zum Rachen hin
 * auslaufend), die Haut dem nächsten Lippenpunkt mit Abfall (1 − d/R)² über den unposierten Abstand.
 */
function hapsAnwenden(abl: MaulErgebnis, xyz: Float64Array, a: number): void {
  const m = abl.maul;
  const n = abl.kaefig.n;
  const o = m.opt;
  const H = m.hoehe;
  const mL = m.lage.m;
  const P = (i: number): [number, number, number] => [xyz[3 * i]!, xyz[3 * i + 1]!, xyz[3 * i + 2]!];
  const zurueck: [number, number, number] = [-m.vorn, 0, 0];
  const delta = new Float64Array(3 * n);
  const hat = new Uint8Array(n);
  const setzeDelta = (i: number, d: readonly [number, number, number]) => {
    delta[3 * i] = d[0];
    delta[3 * i + 1] = d[1];
    delta[3 * i + 2] = d[2];
    hat[i] = 1;
  };
  const B = o.hapsHoehe * H;
  const T = o.hapsTiefe * H;
  const W = o.hapsWeite * H;
  for (const links of [false, true]) {
    const pf = links ? m.pfadLinks : m.pfad;
    const un = links ? m.untenLinks : m.unten;
    for (let t = 0; t <= mL; t++) {
      const u = P(pf[t]!);
      const dIdx = t < mL ? un[t]! : pf[t]!;
      const d = P(dIdx);
      // „oben“: von der unteren zur oberen Kopie; geschlossen (Abstand 0) senkrecht
      let up: [number, number, number] = [u[0] - d[0], u[1] - d[1], u[2] - d[2]];
      const l = Math.hypot(...up);
      up = l > 1e-6 ? [up[0] / l, up[1] / l, up[2] / l] : [0, 1, 0];
      const s = Math.sin((Math.PI * t) / mL);
      const r = t / mL;
      const aus: [number, number, number] = [0, 0, u[2] > 1e-9 ? 1 : u[2] < -1e-9 ? -1 : 0];
      const grund: [number, number, number] = [a * (T * r * zurueck[0] + W * s * aus[0]), a * (T * r * zurueck[1] + W * s * aus[1]), a * (T * r * zurueck[2] + W * s * aus[2])];
      if (t === mL) {
        setzeDelta(pf[t]!, [grund[0], grund[1], grund[2] * 0.5]);
      } else {
        setzeDelta(pf[t]!, [grund[0] + a * 0.6 * B * s * up[0], grund[1] + a * 0.6 * B * s * up[1], grund[2] + a * 0.6 * B * s * up[2]]);
        setzeDelta(dIdx, [grund[0] - a * B * s * up[0], grund[1] - a * B * s * up[1], grund[2] - a * B * s * up[2]]);
      }
    }
  }
  // Tasche, Winkelsäule, Lippenreihen: folgen ihrer Lippe, zum Rachen hin auslaufend
  const n0 = abl.vorlage.kaefig.n;
  for (let i = n0; i < n; i++) {
    if (hat[i]) continue;
    const q = m.quelle[i]!;
    if (!hat[q]) continue;
    const w = m.art[i] === 7 ? 1 : 1 - 0.5 * m.tiefe[i]!;
    delta[3 * i] = w * delta[3 * q]!;
    delta[3 * i + 1] = w * delta[3 * q + 1]!;
    delta[3 * i + 2] = w * delta[3 * q + 2]!;
    hat[i] = 2;
  }
  // Haut: nächster Lippenpunkt (unposierte Lagen) mit Abfall
  const R = o.hapsRadius * H;
  const lippen: number[] = [];
  for (let i = 0; i < n; i++) if (hat[i] === 1) lippen.push(i);
  const X0 = abl.kaefig.xyz;
  for (let i = 0; i < n0; i++) {
    if (hat[i]) continue;
    const d0 = m.lippenAbstand[i]!;
    if (d0 >= R) continue;
    let best = -1;
    let bestD = Infinity;
    for (const q of lippen) {
      const dd = Math.hypot(X0[3 * i]! - X0[3 * q]!, X0[3 * i + 1]! - X0[3 * q + 1]!, X0[3 * i + 2]! - X0[3 * q + 2]!);
      if (dd < bestD) {
        bestD = dd;
        best = q;
      }
    }
    if (best < 0) continue;
    // weicher Abfall (smoothstep): der größte Gradient 1,5 · Versatz / R muss unter 1 bleiben, sonst stauchen sich die
    // Hautfelder hinter dem zurückwandernden Winkel zu Falten (quadratischer Abfall mit R = 0,4 · H: 102 haut/haut)
    const x = 1 - bestD / R;
    const w = x * x * (3 - 2 * x);
    delta[3 * i] = w * delta[3 * best]!;
    delta[3 * i + 1] = w * delta[3 * best + 1]!;
    delta[3 * i + 2] = w * delta[3 * best + 2]!;
    hat[i] = 3;
  }
  for (let i = 0; i < n; i++) {
    if (!hat[i]) continue;
    xyz[3 * i] = xyz[3 * i]! + delta[3 * i]!;
    xyz[3 * i + 1] = xyz[3 * i + 1]! + delta[3 * i + 1]!;
    xyz[3 * i + 2] = xyz[3 * i + 2]! + delta[3 * i + 2]!;
  }
}

// ---------- Zähne ----------

/**
 * Zahnlagen am Zahnfleisch (Taschenreihe 1) des posierten Käfigs: obere Zähne hängen von der oberen Reihe zur unteren,
 * untere stehen von der unteren zur oberen (Richtung = Verbindung der beiden Reihen, so folgen sie den Kiefern und zeigen
 * offen in die Bohne). Rechts und links, obere und untere versetzt; vorn groß, hinten kleiner, Spitzen leicht nach hinten.
 */
export function zahnLagen(abl: MaulErgebnis, xyz: Float64Array, hoehe: number, opt: { oben: number; unten: number; laenge: number; breite: number } = { oben: 6, unten: 5, laenge: 0.075, breite: 0.45 }): KlingenLage[] {
  const m = abl.maul;
  const n = m.lage.m;
  const P = (i: number): [number, number, number] => [xyz[3 * i]!, xyz[3 * i + 1]!, xyz[3 * i + 2]!];
  const lagen: KlingenLage[] = [];
  const kette = (links: boolean, obenReihe: boolean) => (links ? (obenReihe ? m.tasche.obenLinks[0]! : m.tasche.untenLinks[0]!) : obenReihe ? m.tasche.oben[0]! : m.tasche.unten[0]!);
  // Kurze Mäuler (Mercedesstern des Tigers, 15.10.): Zahnlänge höchstens ein Drittel der Maullänge, Zahl höchstens ein
  // Zahn je Pfadpunkt, sonst stapeln sich die Zähne und ragen geschlossen aus der flachen Tasche
  const laengeMax = Math.min(opt.laenge * hoehe, 0.35 * m.laenge);
  const anzahlMax = Math.max(1, n - 2);
  for (const links of [false, true]) {
    for (const obenZahn of [true, false]) {
      const anzahl = Math.min(anzahlMax, obenZahn ? opt.oben : opt.unten);
      for (let z = 0; z < anzahl; z++) {
        // Spalten 1 … n − 2 gleichmäßig, obere und untere versetzt
        const t = Math.round(1 + ((n - 3) * (z + (obenZahn ? 0.25 : 0.75))) / anzahl);
        if (t < 1 || t > n - 2) continue;
        const fuss = P(kette(links, obenZahn)[t]!);
        const gegen = P(kette(links, !obenZahn)[t]!);
        let achse: [number, number, number] = [gegen[0] - fuss[0], gegen[1] - fuss[1], gegen[2] - fuss[2]];
        let l = Math.hypot(...achse);
        if (l < 1e-6) {
          achse = obenZahn ? [0, -1, 0] : [0, 1, 0];
          l = 1;
        }
        achse = [achse[0] / l, achse[1] / l, achse[2] / l];
        const pfad = links ? m.pfadLinks : m.pfad;
        const a = P(pfad[Math.max(0, t - 1)]!);
        const b = P(pfad[Math.min(n, t + 1)]!);
        const tang: [number, number, number] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        // Breite quer zur Lippe (Zahn flach nach außen), Biegung längs der Lippe nach hinten
        const quer: [number, number, number] = [achse[1] * tang[2] - achse[2] * tang[1], achse[2] * tang[0] - achse[0] * tang[2], achse[0] * tang[1] - achse[1] * tang[0]];
        const groesse = laengeMax * (1 - 0.45 * (t / n));
        lagen.push({ fuss, achse, quer, laenge: groesse, breite: opt.breite * groesse, phase: 0, basis: t });
      }
    }
  }
  return lagen;
}
