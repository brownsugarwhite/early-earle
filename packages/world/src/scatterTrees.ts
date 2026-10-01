import { createCapField, type CapPatchParams, type Vec3 } from './capPatch';
import { GradientNoise3 } from './noise';
import { hash32, mulberry32 } from './rng';
import type { PlanetVegetationFamily } from './planet';

/**
 * Kronenformen: Kuppel, Kegel, gestapelte Kegel, hängende Knolle (Syrup), hoher dünner Stamm mit kleiner Krone
 * (Luzz), schwarze Kieferndreiecke (06), Kathedralen-Spitzen mit geschichteten Kronen auf überlangen Stämmen (07),
 * kahle Fraktalbäume als Karten (04/05/08), Juwelenkuppeln fast am Boden (10).
 * Bäume v3 (Feedback 2026-09-30): Spitzenbaum (`lace`, Kuppelkappe über einem Spitzenschleier aus Punktrosetten, das
 * Astwerk scheint durch — Bilder 02, Ebene_19), Schirmbaum (`umbrella`, flache Kuppel auf sichtbarem Astfächer —
 * Ebene_1/20/36) und die knorrige Earle-Eiche (`oak`, Solitär mit bogig hängenden Ästen und Sternnadeln — Bild 04).
 * Riesenstamm (`pillar`, Ebene 16 und Ebene 3): sehr dicker Stamm, die Krone hoch über dem Wald — rahmt das Bild.
 * Welten 11/12 (Ebene 20, Ebene 7): Schirmbaum als Pilzhut (`parasol`), Buschröschen der Buschteppiche und
 * Schuppenbüsche (`shrub`) und die Earle-Tanne mit hängenden Etagen (`fir`).
 * Kuppelbaum (`kuppel`, Ebene 33): breite, windgeformte Kissenkrone aus geschuppten Teilkuppeln auf einem kurzen,
 * dicken Stamm, dessen Äste fast waagrecht unter der Krone hinausgreifen.
 * Kuppeleiche (`domeOak`, Ebene 19): dunkle Kuppelkappe über einem getüpfelten Rock am Astwerk; Wintereiche
 * (`winterOak`, Ebene 11): schwarzer Riesenstamm, Astschlingen, hängende Wurzeläste, Sternbüschel.
 */
export type TreeKind = 'dome' | 'cone' | 'stacked' | 'bulb' | 'tall' | 'pine' | 'spire' | 'bare' | 'jewel' | 'lace' | 'umbrella' | 'oak' | 'pillar'
  // Windbaum (Welt 14, Ebene 29): knorrig, zur Leeseite geneigt, Spitzenwerk an der Kronenkante
  | 'wind'
  | 'parasol' | 'shrub' | 'fir'
  // Schwarze Randtanne (Welt 06, Ebene 10): schmale, spitze Silhouette ohne Punkte, Sägezahn vor dem Schnee
  | 'spruce'
  // Geborgene Arten der Nachschärfung (nur anhängen, nie umsortieren): Kuppelbaum (Welten 01/03, Ebene 33), Kuppel-
  // und Wintereiche (Welten 04/05, Ebene 19/11)
  | 'kuppel' | 'domeOak' | 'winterOak';

/** Alle Baumarten (z. B. zur Unterscheidung Baum ↔ Requisit bei Fokus-Elementen). */
export const TREE_KIND_LIST: readonly TreeKind[] = ['dome', 'cone', 'stacked', 'bulb', 'tall', 'pine', 'spire', 'bare', 'jewel', 'lace', 'umbrella', 'oak', 'pillar', 'wind', 'parasol', 'shrub', 'fir', 'spruce', 'kuppel', 'domeOak', 'winterOak'];

export interface TreeInstance {
  /** Fußpunkt auf der Oberfläche (Patch-Raum). */
  position: Vec3;
  /** Oberflächennormale am Fußpunkt (= "oben" des Baums). */
  normal: Vec3;
  kind: TreeKind;
  /** Größenfaktor um 1 (0.7..1.3). */
  scale: number;
  /** Kronenradius in Welteinheiten. */
  canopyRadius: number;
  /** Stammhöhe in Welteinheiten (Fußpunkt bis Kronenansatz). */
  trunkHeight: number;
  /** Zentrum der Hüllkugel, von der die Kronen-Normalen kopiert werden. */
  hullCenter: Vec3;
  /** Wachstumsrang 0..1: Instanz i wird sichtbar, sobald growth > growth_i. Liste ist danach sortiert. */
  growth: number;
}

export interface ScatterParams {
  seed: number;
  /** Obergrenze der Bäume (Poisson-Disc kann weniger liefern). */
  count: number;
  /** Mindestabstand in Welteinheiten (am Scheitel). */
  minDist: number;
  cap: CapPatchParams;
  /** 0 = gleichmäßig verteilt, 1 = nur in Waldflecken (dunkle Kuppel-Cluster wie bei Earle). Standard 0.6. */
  clumpiness?: number;
  /** Anteile der Kronenformen. Standard dome 0.62, cone 0.2, stacked 0.18. */
  kindWeights?: { dome: number; cone: number; stacked: number };
  /** Rand in uv, in dem keine Bäume stehen (Standard 0.06). */
  edgeMargin?: number;
}

/** Proportionen je Kronenform (Einheit = Kronenradius): Stammhöhe, Hüllzentrum-Höhe über dem Fußpunkt, Gipfel. */
export const TREE_PROPORTIONS: Record<TreeKind, { radius: number; trunk: number; hull: number; top: number }> = {
  dome: { radius: 0.7, trunk: 0.82, hull: 1.37, top: 2.25 },
  cone: { radius: 0.5, trunk: 0.62, hull: 1.5, top: 2.85 },
  stacked: { radius: 0.55, trunk: 0.78, hull: 1.8, top: 3.1 },
  bulb: { radius: 0.75, trunk: 0.55, hull: 1.45, top: 2.55 },
  tall: { radius: 0.4, trunk: 3.6, hull: 4.15, top: 4.8 },
  // Kiefer: schmales Dreieck, fast ohne Stamm (Bild 06)
  pine: { radius: 0.5, trunk: 0.25, hull: 1.9, top: 3.9 },
  // Kathedralenbaum: überlanger dünner Stamm, geschichtete Krone (Bild 07)
  spire: { radius: 0.45, trunk: 6.4, hull: 7.8, top: 9.4 },
  // Kahler Fraktalbaum als Karte (Bilder 04, 05, 08): "Krone" = Astwerk
  bare: { radius: 0.9, trunk: 0.9, hull: 2.1, top: 3.2 },
  // Juwelenkuppel: große runde Krone, winziger Stamm (Bild 10)
  jewel: { radius: 1.1, trunk: 0.3, hull: 1.05, top: 2.1 },
  // Spitzenbaum: Kuppelkappe oben, darunter der Spitzenschleier (Punktrosetten), das Astwerk sichtbar (Bild 02, Ebene_19)
  lace: { radius: 0.95, trunk: 0.85, hull: 1.75, top: 2.7 },
  // Schirmbaum: flache breite Kuppel auf einem sichtbaren Astfächer (Ebene_1, Ebene_20, Ebene_36)
  umbrella: { radius: 0.9, trunk: 1.05, hull: 1.6, top: 2.15 },
  // Earle-Eiche: knorriger Stamm, bogig ausladende, hängende Äste; "Krone" = Astwerk mit Sternnadeln (Bild 04)
  oak: { radius: 1.5, trunk: 0.75, hull: 1.35, top: 2.35 },
  // Riesenstamm (Ebene 16, Ebene 3): dicker Schaft bis weit über den Wald, die Krone darüber (aus der Nähe außerhalb
  // des Bilds) — vorn rahmen diese Stämme das Bild wie Kulissen
  pillar: { radius: 1.25, trunk: 5.2, hull: 6.1, top: 7.1 },
  // Windbaum: gedrungener Stamm, Fächerkrone zur Leeseite (Karte bis ≈ 2.7 r hoch, 2.7 r zur Seite)
  wind: { radius: 1.2, trunk: 0.95, hull: 1.55, top: 2.7 },
  // Schirmbaum (Ebene 20): breiter, flacher Pilzhut, unten gerade abgeschnitten, auf kurzem, dünnem, gegabeltem Stamm
  parasol: { radius: 1.0, trunk: 0.9, hull: 1.12, top: 1.38 },
  // Buschröschen (Ebene 20 Buschteppich, Ebene 7 Schuppenbusch): kleiner runder Busch ohne sichtbaren Stamm
  shrub: { radius: 0.5, trunk: 0, hull: 0.28, top: 1.08 },
  // Earle-Tanne (Ebene 7): schmal, hängende Etagen, unregelmäßige Silhouette, Spitze als dünner Dorn
  fir: { radius: 0.42, trunk: 0.3, hull: 3.4, top: 7.2 },
  // Schwarze Randtanne (Ebene 10): schmaler Kegel aus Sägezahn-Stufen, fast ohne Stamm
  spruce: { radius: 0.36, trunk: 0.12, hull: 1.9, top: 4.2 },
  // Kuppelbaum (Ebene 33): doppelt so breit wie hoch, die Krone sitzt tief auf kurzem Stamm (Unterseite ≈ 0.35 r)
  kuppel: { radius: 1.0, trunk: 0.38, hull: 0.86, top: 1.46 },
  // Kuppeleiche mit Tüpfelrock (Welt 04, Ebene 19, 16.47.13): dunkle Kuppelkappe, darunter der getüpfelte Rock am Astwerk
  domeOak: { radius: 1.0, trunk: 0.4, hull: 0.88, top: 1.66 },
  // Wintereiche (Welt 05, Ebene 11): schwarzer Riesenstamm, Astschlingen, hängende Wurzeläste, Sternbüschel
  winterOak: { radius: 1.6, trunk: 0.66, hull: 0.95, top: 1.55 },
};

// --- Earle-Komposition der Welten -------------------------------------------------------------------

/**
 * Komposition einer Welt (Abschnitt `vegetation.grove` der Weltdatei): Haine als fließende Massen, die sich an
 * Höhenlinien entlangziehen (Täler, Hangschultern, Kämme), dazwischen offene Wiesen, am Hainrand kleine Trabanten und
 * Randbäume, auf den Wiesen wenige Solitäre (Earle: Bilder 03, Ebene_1, Ebene_36, die gelben Hügel).
 */
export interface GroveSpec {
  /** Anteil der Fläche unter Hainmassen außerhalb der Höhenlinien (0..1). */
  cover: number;
  /** Höhenlinien (Anteil 0..1 der lokalen Amplitude), an denen Haine entlangfließen: Täler ≈ 0.1, Schultern 0.5, Kämme 0.9. */
  contours?: number[];
  /** Halbe Breite eines Höhenlinien-Hains (Anteil der Amplitude, Standard 0.12). */
  contourWidth?: number;
  /** Wellenlänge der Hainmassen in Welteinheiten (Standard 9). */
  wavelength?: number;
  /** Anteil der Kandidaten im Hain, die stehen (Standard 0.9 → geschlossene Massen). */
  fill?: number;
  /** Wahrscheinlichkeit eines Trabanten je Kandidat im Randband (Standard 0.18). */
  satellites?: number;
  /** Wahrscheinlichkeit eines Solitärs je Kandidat auf der Wiese (Standard 0.004). */
  specimens?: number;
  /** Arten der Solitäre (Gewichte); Standard: Hainarten. */
  specimenKinds?: Partial<Record<TreeKind, number>>;
  /** Größenfaktor der Solitäre (Standard: obere Hälfte von `scale`). */
  specimenScale?: [number, number];
  /** Arten im Randband des Hains (Gewichte); Standard: Hainarten. */
  edgeKinds?: Partial<Record<TreeKind, number>>;
  /** Kern größer: +Anteil der Skalierung im Hainkern (Standard 0.35). */
  coreScale?: number;
  /** Höchste Hangneigung (1 − cos zwischen Normale und Lot) für Bäume (Standard 0.35 ≈ 49°). */
  maxSlope?: number;
  /** Umkehren: Wald überall, offene Wiesenbänder an den Höhenlinien (Nebelhügel, Bild 02 vom 29.09.). */
  invert?: boolean;
  /**
   * Kammbäume (Ebene 20: Schirmbäume einzeln oder paarweise auf den Kämmen; Ebene 7: Tannen auf dem Grat): ab der Höhe
   * `above` (Anteil 0..1 der lokalen Amplitude) steht mit der Wahrscheinlichkeit `chance` je Kandidat ein Baum der
   * Arten `kinds` (Größe `scale`, Standard: obere Hälfte von `scale`) statt des Hain-, Rand- oder Wiesenbaums; mit
   * `spacing` höchstens einzeln oder paarweise je Gitterzelle dieser Kantenlänge (keine Klumpen); `aboveHeight` =
   * absolute Mindesthöhe in Welteinheiten statt `above` (Grat des Steilhangs, Welt 12). Kammbäume ignorieren
   * `maxSlope` des Hains (sie stehen auch am Steilhang), außer `crest.maxSlope` ist gesetzt.
   */
  crest?: { kinds: Partial<Record<TreeKind, number>>; above: number; aboveHeight?: number; chance: number; scale?: [number, number]; spacing?: number; maxSlope?: number };
  /**
   * Haine auf den sonnenabgewandten Hängen 0..1 (nur auf der Ebene): die Hainmasse wächst dort, wo der Hang von der
   * Kartensonne wegschaut — Earles schwarze, getüpfelte Hänge neben den Wiesen im Licht (Ebene 21, Ebene 20).
   */
  shade?: number;
}

/**
 * Rindenstil der Bäume v3 (ersetzt `trunkStyle`, wenn gesetzt): Kalligrafie = weiße Linien auf Tinte (Bild 01),
 * Leuchten = blau bis cyan leuchtende Stämme mit heller Lichtkante (Ebene 16), Lavendel = blasse lavendelblaue Stämme mit
 * Lichtstreifen (Ebene 21, Welt 01), Schwarz = flache Tinte ohne Linien, nur der Schnee zeichnet den Stamm (Ebene 11).
 * Reihenfolge = Index im Instanzattribut (`BARK_STYLE`): nur anhängen.
 */
export type BarkStyleName = 'ink' | 'white' | 'striped' | 'lichen' | 'calligraphy' | 'glow' | 'pale' | 'black';

/**
 * Riesenstämme einer Welt (Abschnitt `vegetation.giants`, Ebene 16 und Ebene 3): einzelne, sehr dicke Stämme zwischen
 * den Hainen, eigene Streuung mit großem Mindestabstand — unabhängig von Hain und Qualitätsfaktor, denn sie tragen die
 * Komposition. Normale Bäume halten Abstand zum Stamm.
 */
export interface GiantSpec {
  /** Art (Standard `pillar`). */
  kind?: TreeKind;
  /** Mindestabstand zwischen zwei Riesen (Welteinheiten). */
  spacing: number;
  /** Anteil der Kandidaten, die stehen (0..1, Standard 1). */
  share?: number;
  /** Größenfaktor-Bereich. */
  scale: [number, number];
  /** Freiraum um den Stamm, in dem keine normalen Bäume stehen (Welteinheiten, Standard 0.9). */
  clear?: number;
}

/** Vegetationsfamilie mit den Erweiterungen der Bäume v3 (Weltdatei, Abschnitt `vegetation`). */
export interface TreeFamily extends PlanetVegetationFamily {
  grove?: GroveSpec;
  /** Rindenstil (Standard: aus `trunkStyle`). */
  bark?: BarkStyleName;
  /** Schnee auf den Oberseiten von Stämmen und Ästen 0..1 (Schneewelten, Bilder 01/04). */
  snow?: number;
  /** Dichte der Tüpfel in den Kronen 0..1 (Standard 0.75). */
  stipple?: number;
  /** Dichte der Vier-Punkt-Blüten in den Kronen 0..1 (Standard: 0.35 bei Motiv Raute/Kreuz, sonst 0). */
  flowers?: number;
  /** Instanzierte Punkte je Baum relativ zur Qualitätsstufe (Standard 1). */
  dots?: number;
  /** Fokus-Baum der Welt (ersetzt die Art aus `focal`, z. B. die Earle-Eiche in Welt 05). */
  focalTree?: { kind: TreeKind; scale?: number };
  /** Riesenstämme (Ebene 16, Ebene 3), siehe `GiantSpec`. */
  giants?: GiantSpec;
  /**
   * Bäume nur in einem Band hinter der Klippe eines Meeres (Abstand landeinwärts [min, max], Welteinheiten) — die
   * Windbäume der Landzunge (Welt 14) stehen an der Kante, als Silhouetten vor dem Himmel.
   */
  coastBand?: [number, number];
  /** Tannen am Rand der Schneefelder und Gruppen auf dem Schnee (Welt 06, Ebene 10), siehe `plane/snowEdge.ts`. */
  snowEdge?: import('./plane/snowEdge').SnowEdgeSpec;
}

/** Was die Komposition vom Planetenfeld braucht (strukturell, passt auf `PlanetField`). */
export interface GroveFieldLike {
  readonly params: { radius: number; seed: number };
  heightNormAt(dx: number, dy: number, dz: number): number;
  surfaceAt(dx: number, dy: number, dz: number, outPos: Vec3, outNormal: Vec3): number;
  /** Geländehöhe in Welteinheiten (für die Bodenhaftung auf dem Dreiecksnetz). */
  heightAt?(dx: number, dy: number, dz: number): number;
}

/**
 * Bodenhaftung: wie tief ein Baum unter die analytische Oberfläche sinken muss, damit er auch auf dem gröberen
 * Dreiecksnetz des Chunks nicht schwebt. Auf Kuppen und Graten liegt das Netz (Sehne zwischen den Gitterpunkten)
 * unter der glatten Oberfläche; geschätzt wird die tiefste Sehne über ±spacing/2 in zwei Richtungen. In Mulden liegt
 * das Netz höher — dann steckt der Fuß ohnehin im Boden (0).
 */
export function groundSink(field: GroveFieldLike, dir: Vec3, spacing: number): number {
  if (!field.heightAt) return 0;
  const R = field.params.radius;
  const [dx, dy, dz] = dir;
  const h0 = field.heightAt(dx, dy, dz);
  // Tangentialbasis
  const ax = Math.abs(dy) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let t1 = [ax[1]! * dz - ax[2]! * dy, ax[2]! * dx - ax[0]! * dz, ax[0]! * dy - ax[1]! * dx];
  const l1 = Math.hypot(t1[0]!, t1[1]!, t1[2]!) || 1;
  t1 = t1.map((v) => v / l1);
  const t2 = [dy * t1[2]! - dz * t1[1]!, dz * t1[0]! - dx * t1[2]!, dx * t1[1]! - dy * t1[0]!];
  const e = (spacing * 0.5) / R;
  const h = (t: number[], s: number): number => {
    const x = dx + t[0]! * e * s;
    const y = dy + t[1]! * e * s;
    const z = dz + t[2]! * e * s;
    const l = Math.hypot(x, y, z) || 1;
    return field.heightAt!(x / l, y / l, z / l);
  };
  const chord = Math.min((h(t1, 1) + h(t1, -1)) * 0.5, (h(t2, 1) + h(t2, -1)) * 0.5);
  return Math.max(0, Math.min(1.5, h0 - chord));
}

export interface GroveTree {
  kind: TreeKind;
  scale: number;
}

/** Gewichtete Wahl einer Baumart. */
export function pickTreeKind(weights: Partial<Record<TreeKind, number>>, r: number): TreeKind {
  const entries = Object.entries(weights).filter(([, w]) => (w ?? 0) > 0) as Array<[TreeKind, number]>;
  const total = entries.reduce((a, [, w]) => a + w, 0) || 1;
  let acc = 0;
  for (const [kind, w] of entries) {
    acc += w / total;
    if (r < acc) return kind;
  }
  return entries[entries.length - 1]?.[0] ?? 'dome';
}

const groveNoise = new Map<number, { mass: GradientNoise3; warp: GradientNoise3 }>();
function groveNoiseFor(seed: number): { mass: GradientNoise3; warp: GradientNoise3 } {
  let n = groveNoise.get(seed);
  if (!n) {
    n = { mass: new GradientNoise3(hash32('grove-mass', seed)), warp: new GradientNoise3(hash32('grove-warp', seed)) };
    groveNoise.set(seed, n);
  }
  return n;
}

/** Streuung des Massenrauschens (Standardabweichung von `0.5 + 0.62·fbm`, gemessen). */
const MASS_SIGMA = 0.13;

/**
 * Hainmaske 0..1 an einer Einheitsrichtung: ≥ 0.5 im Hain (Kern → 1), Randband 0.3..0.5, darunter Wiese. Fließende
 * Massen aus domänenverzerrtem Rauschen (Wellenlänge `wavelength`), dazu Bänder entlang der Höhenlinien, deren Breite
 * mit dem Rauschen atmet — so ziehen sich die Haine wie bei Earle an den Hängen entlang, schwellen an und ab und
 * haben klare Ränder (die Massen reichen dicht bis an die Wiese).
 */
export function groveMask(field: GroveFieldLike, dir: Vec3, grove: GroveSpec): number {
  const { mass, warp } = groveNoiseFor(field.params.seed);
  const f = field.params.radius / Math.max(1, grove.wavelength ?? 9);
  const x = dir[0] * f;
  const y = dir[1] * f;
  const z = dir[2] * f;
  const wx = warp.fbm(x * 0.5 + 4.1, y * 0.5 - 2.7, z * 0.5 + 8.3, 2);
  const wy = warp.fbm(x * 0.5 - 6.2, y * 0.5 + 1.9, z * 0.5 - 3.4, 2);
  const n = mass.fbm(x + 1.6 * wx, y + 1.6 * wy, z - 1.6 * wx, 2); // ≈ -1..1
  const m = 0.5 + 0.62 * n;
  // Massen: Schwelle so, dass etwa `cover` der Fläche darüber liegt (Rauschen ≈ normalverteilt um 0.5)
  const cover = Math.min(1, Math.max(0, grove.cover));
  const t = cover <= 0 ? 99 : 0.5 + probit(1 - cover) * MASS_SIGMA;
  let s = m - t; // > 0 im Hain
  const contours = grove.contours ?? [];
  if (contours.length > 0) {
    const h = field.heightNormAt(dir[0], dir[1], dir[2]) + 0.07 * n;
    const w = (grove.contourWidth ?? 0.12) * (0.55 + 0.9 * Math.min(1, Math.max(0, m)));
    for (const c of contours) s = Math.max(s, (w - Math.abs(h - c)) * 0.6);
  }
  if (grove.invert) s = -s;
  return Math.min(1, Math.max(0, 0.5 + 4 * s));
}

/** Näherung der Umkehrfunktion der Standard-Normalverteilung (Acklam, |Fehler| < 5e-4 reicht hier). */
function probit(p: number): number {
  const q = Math.min(1 - 1e-6, Math.max(1e-6, p));
  // Zweistufige rationale Näherung (Abramowitz & Stegun 26.2.23)
  const sgn = q < 0.5 ? -1 : 1;
  const pp = q < 0.5 ? q : 1 - q;
  const tt = Math.sqrt(-2 * Math.log(pp));
  const z = tt - (2.515517 + 0.802853 * tt + 0.010328 * tt * tt) / (1 + 1.432788 * tt + 0.189269 * tt * tt + 0.001308 * tt * tt * tt);
  return sgn * z;
}

/**
 * Entscheidet für einen Streukandidaten der Planeten-Chunks (nach Poisson und Dichte-Auswahl), ob und welcher Baum
 * dort steht. Ohne `grove` in der Familie gilt das alte Verhalten (Art und Größe wie übergeben). Mit `grove`: Hain,
 * Randband (Trabanten, Randarten, kleiner), Wiese (seltene Solitäre, groß), zu steile Hänge bleiben frei.
 */
export function composeGroveTree(field: GroveFieldLike, dir: Vec3, fam: PlanetVegetationFamily, kind: TreeKind, scale: number, rand: () => number): GroveTree | null {
  const grove = (fam as TreeFamily).grove;
  if (!grove) return { kind, scale };
  const g = groveMask(field, dir, grove);
  const r = rand();
  const [s0, s1] = fam.scale;
  let out: GroveTree | null = null;
  if (g > 0.5) {
    const inside = smoothstep(0.5, 0.58, g);
    if (r < (grove.fill ?? 0.9) * (0.55 + 0.45 * inside)) {
      const core = smoothstep(0.62, 0.95, g);
      out = { kind, scale: scale * (1 + (grove.coreScale ?? 0.35) * core) };
    }
  } else if (g > 0.32) {
    if (r < (grove.satellites ?? 0.18) * smoothstep(0.32, 0.5, g)) {
      const k = grove.edgeKinds ? pickTreeKind(grove.edgeKinds, rand()) : kind;
      out = { kind: k, scale: s0 + (s1 - s0) * 0.45 * rand() };
    }
  } else if (r < (grove.specimens ?? 0.004)) {
    const k = grove.specimenKinds ? pickTreeKind(grove.specimenKinds, rand()) : kind;
    const [a, b] = grove.specimenScale ?? [s0 + (s1 - s0) * 0.5, s1];
    out = { kind: k, scale: a + (b - a) * rand() };
  }
  if (!out) return null;
  // Hangneigung: Bäume wachsen lotrecht; auf Felswänden und Steilhängen steht nichts
  const maxSlope = grove.maxSlope ?? 0.35;
  if (maxSlope < 1) {
    const pos: Vec3 = [0, 0, 0];
    const nor: Vec3 = [0, 0, 0];
    field.surfaceAt(dir[0], dir[1], dir[2], pos, nor);
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const cos = (nor[0] * dir[0] + nor[1] * dir[1] + nor[2] * dir[2]) / l;
    if (1 - cos > maxSlope) return null;
  }
  return out;
}

/**
 * Poisson-Disc-Streuung (Bridson) im gnomonischen uv-Raum, danach Waldmasken-Filter, deterministische
 * Zufallsreihenfolge und Wachstumspriorität (Mitte zuerst, verrauscht). Gleicher Seed → gleiche Liste.
 */
export function scatterTrees(params: ScatterParams): TreeInstance[] {
  const field = createCapField(params.cap);
  const rand = mulberry32(hash32('trees', params.seed, params.cap.seed));
  const mask = new GradientNoise3(hash32('forest', params.seed));
  const clump = params.clumpiness ?? 0.6;
  const margin = params.edgeMargin ?? 0.06;
  const weights = params.kindWeights ?? { dome: 0.62, cone: 0.2, stacked: 0.18 };
  const halfExtent = field.params.radius * Math.tan((field.params.arcDeg * 0.5 * Math.PI) / 180);
  const r = Math.max(1e-3, params.minDist / halfExtent); // Mindestabstand in uv
  const lo = -1 + margin;
  const hi = 1 - margin;

  // Bridson
  const cell = r / Math.SQRT2;
  const gridN = Math.ceil((hi - lo) / cell) + 1;
  const grid = new Int32Array(gridN * gridN).fill(-1);
  const pts: Array<[number, number]> = [];
  const active: number[] = [];
  const gi = (x: number, y: number) => Math.floor((y - lo) / cell) * gridN + Math.floor((x - lo) / cell);
  const fits = (x: number, y: number): boolean => {
    if (x < lo || x > hi || y < lo || y > hi) return false;
    const cx = Math.floor((x - lo) / cell);
    const cy = Math.floor((y - lo) / cell);
    for (let j = Math.max(0, cy - 2); j <= Math.min(gridN - 1, cy + 2); j++) {
      for (let i = Math.max(0, cx - 2); i <= Math.min(gridN - 1, cx + 2); i++) {
        const idx = grid[j * gridN + i]!;
        if (idx >= 0) {
          const q = pts[idx]!;
          const dx = q[0] - x;
          const dy = q[1] - y;
          if (dx * dx + dy * dy < r * r) return false;
        }
      }
    }
    return true;
  };
  const push = (x: number, y: number) => {
    pts.push([x, y]);
    grid[gi(x, y)] = pts.length - 1;
    active.push(pts.length - 1);
  };
  push(lo + rand() * (hi - lo), lo + rand() * (hi - lo));
  const maxPoints = Math.max(params.count * 8, 4000);
  while (active.length > 0 && pts.length < maxPoints) {
    const ai = Math.floor(rand() * active.length);
    const base = pts[active[ai]!]!;
    let placed = false;
    for (let k = 0; k < 24; k++) {
      const ang = rand() * Math.PI * 2;
      const dist = r * (1 + rand());
      const x = base[0] + Math.cos(ang) * dist;
      const y = base[1] + Math.sin(ang) * dist;
      if (fits(x, y)) {
        push(x, y);
        placed = true;
        break;
      }
    }
    if (!placed) {
      active[ai] = active[active.length - 1]!;
      active.pop();
    }
  }

  // Waldmaske: Cluster statt Gleichverteilung
  const dir: Vec3 = [0, 0, 0];
  const accepted: Array<[number, number]> = [];
  const freq = field.params.radius / (field.params.hillWavelength * 1.6);
  for (const q of pts) {
    field.direction(q[0], q[1], dir);
    const m = 0.5 + 0.5 * mask.fbm(dir[0] * freq + 3.3, dir[1] * freq, dir[2] * freq - 7.1, 2);
    const forest = smoothstep(0.42, 0.6, m);
    const pAccept = (1 - clump) + clump * forest;
    if (rand() < pAccept) accepted.push(q);
  }

  // Deterministisch mischen, dann auf count begrenzen
  for (let i = accepted.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = accepted[i]!;
    accepted[i] = accepted[j]!;
    accepted[j] = t;
  }
  const chosen = accepted.slice(0, Math.max(0, Math.floor(params.count)));

  const total = weights.dome + weights.cone + weights.stacked;
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const raw: Array<{ inst: TreeInstance; priority: number }> = [];
  for (const q of chosen) {
    field.surface(q[0], q[1], pos, nor);
    const w = rand() * total;
    const kind: TreeKind = w < weights.dome ? 'dome' : w < weights.dome + weights.cone ? 'cone' : 'stacked';
    const scale = 0.7 + 0.6 * rand() * rand() + 0.3 * rand(); // 0.7..1.6, Schwerpunkt um 1
    const prop = TREE_PROPORTIONS[kind];
    const canopyRadius = prop.radius * scale;
    const trunkHeight = prop.trunk * canopyRadius;
    const hullH = prop.hull * canopyRadius;
    const hullCenter: Vec3 = [pos[0] + nor[0] * hullH, pos[1] + nor[1] * hullH, pos[2] + nor[2] * hullH];
    const distCentre = Math.hypot(q[0], q[1]) / Math.SQRT2;
    raw.push({
      inst: {
        position: [pos[0], pos[1], pos[2]],
        normal: [nor[0], nor[1], nor[2]],
        kind,
        scale,
        canopyRadius,
        trunkHeight,
        hullCenter,
        growth: 0,
      },
      priority: 0.7 * rand() + 0.3 * distCentre,
    });
  }
  raw.sort((a, b) => a.priority - b.priority);
  const n = raw.length;
  return raw.map((e, i) => ({ ...e.inst, growth: n > 0 ? i / n : 0 }));
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
