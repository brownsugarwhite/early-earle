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
  zugAnteil,
} from './ableiten';
import { silhouettenBreite } from './breite';

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
};

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
};

export const MAUL_STANDARD: MaulOptionen = { reihen: 3, tiefe: 0.9, linse: 0.03, rachenTiefe: 0.7, rachenInnen: 0.55, schaedelHinter: 0.45, lippenSchaerfe: 1e6, band: 2, bandOben: 8, nackenGanz: false, winkelUnten: 58, winkelOben: 15, oeffnungsart: 'kippen', zugWeite: 0.5, rille: 0.012, platte: 10, beutel: 0.5 };

/** Maul-Optionen je vorgefertigter Lage: vorn/unten kippen (Rex), hals zieht (Drache) mit ruhigem Schädel. */
export function maulOptionenVorlage(art: 'vorn' | 'unten' | 'hals'): Partial<MaulOptionen> {
  return art === 'hals' ? { oeffnungsart: 'ziehen', winkelOben: 4, band: 3, nackenGanz: true } : {};
}

/** Lage des Schlitzes im Gitter samt Lippenhöhen (für die Umparametrisierung) und Mundwinkel. */
export type MaulLage = SchlitzLage & {
  m: number;
  winkel: V2;
  start: V2;
  /** Plattenmaul (Phase 2, M1): Mundwinkel auf der Kastenfront bei (y, |z|); `maulKaefig` setzt die Treppe `kappenPfad` */
  platte?: { winkelY: number; winkelZ: number };
  /** rechter Arm des Plattenmauls im Kappengitter, von der Mitte (c/2, c/2) zum Winkel (Spalte a, Zeile b) */
  kappenPfad?: [number, number][];
};

/** Art je Käfigpunkt: 0 Haut, 1 Lippe oben, 2 Lippe unten, 3 Tasche oben, 4 Tasche unten, 6 Winkelsäule */
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
export function maulLinieAusPunkten(dok: Dokument, punkte: readonly V2[], winkelZ?: number, front?: { z: number; y: number }[]): MaulLinie {
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
  if (p0.y < spitze.y - 1e-9) {
    const sPkt = frontPunkt(dok, p0.y);
    if (sPkt && Math.hypot(sPkt.x - spitze.x, sPkt.y - spitze.y) >= ANFANG_ABSTAND_MIN) {
      const f = spineAnteilFuer(l, zugAnteil(l.bauch, sPkt).t, false);
      if (f > 1e-4 && !frontFlach(l, Math.max(f, ABLEIT_STANDARD.kappe))) {
        anfangF = f;
        anfangPunkt = sPkt;
      }
    }
  }
  // Spitze mit Ecke (Rex): die Lippe beginnt an der Bauchnaht der Kappenzeile (Überbiss), in einer scharfen Spitze ist
  // kein Platz für die Tasche; runde Spitze (Kugel): durch die Spitze
  const spitzeScharf = dok.profile.seite.knoten.some((kn) => kn.art === 'ecke' && Math.hypot(kn.p.x * dok.skalierung - spitze.x, kn.p.y * dok.skalierung - spitze.y) < 1e-3);
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

/**
 * Lage des Schlitzes: Kappenzeile durch die Spitze, Längsschleife j_L, Lippenhöhe je Ring und Quadratring aus der Linie,
 * Winkelring = Ring mit dem Wirbelsäulen-Anteil des Mundwinkels; seine Station wird auf den Winkel gelegt (der Ring
 * rastet auf den Winkel, nicht der Winkel auf den Ring), solange die Reihenfolge der Stationen bleibt.
 */
/** Plattenmaul: Rachen und Scharnier bei diesem Anteil der Wirbelsäule hinter der Platte (Tiger: Ring 4 von 24). */
const PLATTE_SCHARNIER = 0.08;

export function maulLage(v: Roehre, l: Leiter, st: Stationen, linie: MaulLinie): MaulLage {
  const { R, c } = v;
  if (linie.fv.length < 2) throw new Error('Maullinie braucht mindestens zwei Stützen');
  // Kastenfront: Ring 0 liegt praktisch in der Frontebene (Vorschub der Sprosse gegenüber der Spitze < 6 % ihrer Höhe);
  // dann geht die Lippe durch die Spitze (`kastenKappe` legt die Kappe als ebenes Gitter um die Lippenhöhe), ein Anfang
  // unter der Spitze träfe sonst eine Kappenzeile, die nicht auf Lippenhöhe liegt.
  const sp0 = sprossenVon(l, [st.ringe[0]!])[0]!;
  const flach = Math.abs((sp0.o.x + sp0.u.x) / 2 - l.ruecken[0]!.x) < 0.06 * Math.hypot(sp0.o.x - sp0.u.x, sp0.o.y - sp0.u.y);
  const anfang = konturAnfang(linie);
  const rS = flach ? 0 : Math.min(c / 2 - 1, Math.max(anfang !== undefined ? 1 : 0, Math.round(linie.unterSpitze ?? 0)));
  const bL = c / 2 - rS;
  const jL = (3 * c) / 2 - bL;
  const ende = linie.fv[linie.fv.length - 1]!;
  const fRinge = spineAnteile(l, st.ringe);
  // Anfang auf der Kontur: Ziel der Bauchnaht der Lippen-Kappenzeile ist der gezeichnete Anfang (Bauchpunkt bei f;
  // `zieleBerechnen` setzt den Punkt dorthin). Liegt der Anfang hinter der Kappenzeile, rückt die Zeile auf seinen
  // Anteil (sonst läuft die Lippe von der Zeile rückwärts zum Anfang und faltet sich: Rex 2 Durchdringungen); liegt er
  // davor, bleibt die Zeile, wo sie ist (auf runden Spitzen wäre der Quadratring am Anfang winzig: Kugel 136
  // Durchdringungen). Die Zeile bleibt mindestens ein Viertel des Abstands vor Ring 0.
  let anfangPunkt: V2 | undefined;
  if (anfang !== undefined && rS >= 1) {
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
  const vorher = fRinge[k - 1]!;
  const nachher = fRinge[k + 1]!;
  // Winkelring auf den Winkel rasten (nicht beim Plattenmaul: dort ist der Winkel kein Ringpunkt)
  if (!platte && ende.f > vorher && ende.f < nachher) {
    st.ringe[k] = stationenAusLeiter(l, [ende.f])[0]!;
    fRinge[k] = ende.f;
  }
  const vRing = new Float64Array(R).fill(NaN);
  for (let i = 0; i < k; i++) vRing[i] = lippenHoehe(linie, fRinge[i]!);
  vRing[k] = ende.v;
  if (platte) {
    // Mitte der Platte auf der gezeichneten Starthöhe, keine Ringlippe
    vRing[0] = linie.fv[0]!.v;
    for (let i = 1; i < R; i++) vRing[i] = NaN;
  }
  const fKappen = spineAnteile(l, st.kappen.vorn);
  const vKappe = new Float64Array(c / 2).fill(NaN);
  for (let r = 1; r < c / 2; r++) vKappe[r] = lippenHoehe(linie, fKappen[r - 1]!);
  const front = platte && linie.front && linie.front.length >= 2 ? linie.front : undefined;
  return { bL, jL, k, m: c / 2 + k, vRing, vKappe, ...(anfangPunkt ? { anfang: anfangPunkt } : {}), ...(platte ? { platte } : {}), ...(front ? { front } : {}), winkel, start: anfangPunkt ?? { x: spitze.x, y: spitze.y } };
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
 * Käfig mit Maul aus der Vorlage: Schlitz entlang des Pfads, Tasche, Rachengitter; Ziele für alle Punkte (geschlossen).
 * Die Vorlagen-Indizes bleiben gültig (obere Kopien), neue Punkte hängen an.
 */
export function maulKaefig(v: Roehre, st: Stationen, lage: MaulLage, zieleV: Float64Array, hoeheV: Float64Array, opt: MaulOptionen): { kaefig: Kaefig; ziele: Float64Array; hoehe: Float64Array; info: MaulAbleitung } {
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
    if (g.art === 'ring') {
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
  for (let t = 0; t < m; t++) {
    const p = P(pfad[t]!);
    const r3 = innenRichtung(t);
    const e = Math.min(opt.rille * H * (1 - (t / m) * (t / m)), 0.4 * mitteAbstand(t));
    const q: [number, number, number] = [p[0] + r3[0] * e, p[1] + r3[1] * e, t === 0 ? 0 : p[2] + r3[2] * e];
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
  for (let i = 0; i <= k; i++) mitten.push(ringMitte(i));
  // Rachenlinie (Plan 5.1, automatisch; Phase 2 macht sie zum Griff): die Wirbelsäule (Ringmitten 0 … k) ab dem
  // Racheneingang. Der Eingang liegt bei `rachenTiefe` des Wegs bis zum ersten Knick der Wirbelsäule (> 50° gegen die
  // Kopfachse) oder bis zum Winkelring. Das Rachenziel je Lippenpunkt ist sein Lotfußpunkt auf dieser Linie, nie vor dem
  // Eingang: Schnauzenlippen laufen nach hinten zum Eingang (tiefe Bohne, Rex), Lippen an der Seite laufen waagerecht
  // nach innen. Läuft das Maul um den Hinterkopf in den Hals (Drache), liegen die Lippen dort als Stapel übereinander;
  // mit einem Ziel weiter unten deckten sich die Spalten und die Blätter kreuzten sich — mit dem Lot bleiben sie waagerecht.
  const sBogen: number[] = [0];
  for (let i = 0; i < k; i++) sBogen.push(sBogen[i]! + Math.hypot(mitten[i + 1]![0] - mitten[i]![0], mitten[i + 1]![1] - mitten[i]![1], mitten[i + 1]![2] - mitten[i]![2]));
  const sK = sBogen[k]!;
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
  if (k >= 4) {
    const d0 = richtung(mitten[0]!, mitten[3]!);
    let groessteVor = 0;
    for (let i = 0; i <= 3; i++) groessteVor = Math.max(groessteVor, ringGroesse(i));
    for (let i = 3; i < k; i++) {
      groessteVor = Math.max(groessteVor, ringGroesse(i));
      const d = richtung(mitten[i]!, mitten[i + 1]!);
      if (d[0] * d0[0] + d[1] * d0[1] + d[2] * d0[2] < Math.cos((50 * Math.PI) / 180)) {
        const danach = (ringGroesse(Math.min(k, i + 1)) + ringGroesse(Math.min(k, i + 2))) / 2;
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
    for (let i = 0; i < k; i++) {
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
    let c3: [number, number, number] = mitten[k]!;
    let ringT = k;
    for (let i = 0; i < k; i++) {
      if (sT <= sBogen[i + 1]!) {
        const len = sBogen[i + 1]! - sBogen[i]!;
        c3 = lerp3(mitten[i]!, mitten[i + 1]!, len > 0 ? (sT - sBogen[i]!) / len : 0);
        ringT = i + 1;
        break;
      }
    }
    // seitlich höchstens 80 % der Ringbreite am Ziel (dünner Hals: die Tasche bleibt in ihrer Hälfte; wie `innenHalten`)
    const T: [number, number, number] = [c3[0], c3[1], Math.min((M[2] * opt.rachenInnen * t) / m, 0.8 * ringBreite(ringT))];
    rachenZiele.set(T, 3 * t);
    return T;
  };
  // Stationen (Quadratringe der Kappe, Ringe): Mitte, Sprossenrichtung, Höhe und rechtes Halbprofil (Höhe a längs der
  // Sprosse → Breite z). Dienen der Linsendicke und dem Halten der Taschenpunkte im Körper.
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
    let w = 0;
    const pr = best.profil;
    for (let q = 0; q + 1 < pr.length; q++) {
      const p0 = pr[q]!;
      const p1 = pr[q + 1]!;
      if ((p0.a >= a && a >= p1.a) || (p1.a >= a && a >= p0.a)) {
        const f = Math.abs(p0.a - p1.a) > 1e-12 ? (p0.a - a) / (p0.a - p1.a) : 0;
        w = Math.max(w, p0.z + (p1.z - p0.z) * f);
      }
    }
    const zMax = 0.8 * w;
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
    for (const [a, b] of [
      [pfad[t]!, pfad[t + 1]!],
      [pfadLinks[t]!, pfadLinks[t + 1]!],
      [unten[t]!, U(0, t + 1, false)],
      [untenLinks[t]!, U(0, t + 1, true)],
    ]) {
      const ke = kanteZwischen(kaefig, a!, b!);
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
  const lippen = [...pfad, ...pfadLinks.slice(1)].map((idx) => P(idx));
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
  // Kiefergewichte: Lage zum Schlitz, Band über die Ringe hinter dem Winkel
  const gewichtUnten = new Float64Array(n);
  const gewichtOben = new Float64Array(n);
  const glatt = (x: number) => {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
  };
  const bandRing = (i: number, band: number) => (i <= k ? 1 : 1 - glatt((i - k) / Math.max(1, band)));
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
    let o = 0;
    let u = 0;
    let f = 1;
    let fo = 1;
    if (g.art === 'ring') {
      f = bandRing(g.i, opt.band);
      fo = bandRing(g.i, opt.bandOben);
      const jr = g.j <= N / 2 ? g.j : N - g.j;
      if (g.i > k && opt.nackenGanz) {
        // hinter dem Winkel: der ganze Ring folgt dem Schädel (Nacken biegt), die untere Hälfte zusätzlich der Kehle
        o = 1;
        if (jr > jL) u = 1;
      } else if (jr < jL) o = 1;
      else if (jr > jL) u = plattenGewicht(g.i, i);
      else if (g.i === k) {
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
      } else if (g.b > bL) o = 1;
      else if (g.b < bL) u = 1;
      else o = 1;
    } else {
      f = 0;
      fo = 0;
    }
    gewichtOben[i] = o * fo;
    gewichtUnten[i] = u * f;
    // der Beutel läuft mit dem Kieferband aus: hinter dem Band darf die Kehlhaut nicht der (voll gedrehten) Plattenkante
    // ihres Rings folgen (Tiger, Ringpfad: Bauchringe 15–19 wanderten beim Öffnen 1–2 % der Höhe)
    if (beutelGewicht[i]! > 0) beutelGewicht[i] = beutelGewicht[i]! * f;
  }
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
        gewichtUnten[i] = winkelNah(i);
        break;
      case 3:
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
    scharnier: { x: MH[0], y: MH[1] },
    schaedel,
    vorn,
    hoehe: H,
    zug,
    laenge: L,
    beutelGewicht,
    beutelRing,
    plattenKante,
    rachen: { sKnick, sK, sEingang, ziele: rachenZiele },
  };
  return { kaefig, ziele, hoehe, info };
}

// ---------- Ableitung mit Maul ----------

/** Ableitung wie `ableiten`, mit Maul: Umparametrisierung der Schleifen, Schlitz, Tasche, Rachen; Naht-Ausgleich nur auf der Haut. */
export function ableitenMitMaul(dok: Dokument, linie: MaulLinie, optionen: Partial<AbleitOptionen> = {}, maulOptionen: Partial<MaulOptionen> = {}): MaulErgebnis {
  const opt = { ...ABLEIT_STANDARD, glaettung: 0.15, ...optionen };
  const mopt = { ...MAUL_STANDARD, ...maulOptionen };
  const t0 = jetzt();
  const l = kernLeiter(dok);
  const t1 = jetzt();
  const breiten = silhouettenBreite(dok);
  const t2 = jetzt();
  const vorlage = roehre(opt.ringe, opt.ring);
  const anfang = konturAnfang(linie);
  const st = stationenWaehlen(l, opt, dok, anfang !== undefined ? anfangKappeMin(anfang) : undefined);
  faltenSetzen(vorlage, st, l, dok, breiten, opt);
  const lage = maulLage(vorlage, l, st, linie);
  const { ziele, hoehe } = zieleBerechnen(vorlage, l, st, breiten, dok, opt, lage);
  const mk = maulKaefig(vorlage, st, lage, ziele, hoehe, mopt);
  const haut = new Uint8Array(mk.kaefig.n);
  const zielGewicht = new Float64Array(mk.kaefig.n).fill(1);
  for (let i = 0; i < mk.kaefig.n; i++) {
    const a = mk.info.art[i]!;
    haut[i] = a === 0 ? 1 : 0; // Lippen liegen in der Rille, nicht auf dem Umriss
    if (a === 1 || a === 2 || a === 6) zielGewicht[i] = opt.nahtGewicht;
  }
  // Nahtrundgang startet am Hautpunkt über der Spitze (die Spitze selbst liegt auf der Lippe)
  const nahtStart = vorlage.kappe('vorn', vorlage.c / 2, vorlage.c / 2 + 1);
  // Ohne Breitenzeilen (Plan „Zeichnung ist Form“, 15.10.): Sie machen den Käfig wellig, und die Kieferpose wirft daraus
  // Hautfalten (Tiger-Stern 70 Durchdringungen bei 50 %). Die Breite kommt hier allein aus den Käfigzielen (Sichthülle);
  // offen: Breitenzeilen mit Glättung oder eine Pose, die den geglätteten Käfig nutzt.
  const abl = fertigstellen({ opt: { ...opt, breiteGewicht: 0 }, vorlage, kaefig: mk.kaefig, ziele: mk.ziele, hoehe: mk.hoehe, l, st, breiten, dok, haut, zielGewicht, nahtStart, zeiten: { t0, t1, t2 } });
  const xyz = abl.kaefig.xyz;
  const info = mk.info;
  // Untere Kette bitgleich auf die obere (gleiche Ziele, scharfe Falten: die Grenzlage hängt nur von der Kette ab)
  for (let t = 0; t < info.lage.m; t++) {
    for (const [o, u] of [
      [info.pfad[t]!, info.unten[t]!],
      [info.pfadLinks[t]!, info.untenLinks[t]!],
    ]) {
      xyz[3 * u!] = xyz[3 * o!]!;
      xyz[3 * u! + 1] = xyz[3 * o! + 1]!;
      xyz[3 * u! + 2] = xyz[3 * o! + 2]!;
    }
  }
  // Taschenpunkte gegen die Lippenketten nachlösen, mit Glättung: Ihre Grenzlagen hängen nur von Tasche und Ketten ab (scharfe Falten).
  taschenNachloesen(abl, info, mk.ziele, opt.glaettung);
  const fein = anwenden3(abl.unterteilung.grenze, xyz);
  return { ...abl, fein, maul: info };
}

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
  const kiefer = (i: number, w: number) => {
    if (zieht) {
      xyz[3 * i] = xyz[3 * i]! + w * weite * m.zug.x;
      xyz[3 * i + 1] = xyz[3 * i + 1]! + w * weite * m.zug.y;
    } else drehe(i, m.scharnier.x, m.scharnier.y, -m.vorn * w * aU);
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
      kantenZug[2 * r] = m.scharnier.x + x * c - y * sn - ex;
      kantenZug[2 * r + 1] = m.scharnier.y + x * sn + y * c - ey;
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
  const fein = anwenden3(abl.unterteilung.grenze, xyz);
  return { xyz, fein };
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
