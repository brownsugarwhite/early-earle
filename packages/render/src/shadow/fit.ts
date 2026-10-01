import { Frustum, Matrix4, Sphere, Vector3 } from 'three/webgpu';
import type { PerspectiveCamera } from 'three/webgpu';

/**
 * Kaskaden-Fit für die Earle-Schatten (reine Mathematik, keine GPU).
 *
 * Idee: Die Schattenkarte gehört dorthin, wo Pixel sind. Für die gebundene Kamera wird der *sichtbare
 * Empfängerbereich* bestimmt (Kamerafrustum ∩ Planetenschale bzw. Bodenplatte ∩ optionaler Clip-Box aus
 * `fitShadow`), entlang der Blicktiefe in verschachtelte Kaskaden geteilt (Kaskade k deckt Tiefe ≤ s_k) und im
 * Lichtraum eng umrandet. Die Lichtbasis darf um die Lichtachse gedreht werden (ψ): bei 10° Sonne ist ein
 * Schattentexel auf dem Boden längs des Sonnenazimuts 1/sin θ ≈ 5,8× gestreckt, je nach Blickrichtung zeigt diese
 * Streckung auf dem Bildschirm in eine andere Richtung. ψ wird so gewählt, dass der größte Bildschirm-Fußabdruck
 * eines Texels (Pixel je Texel, an den nächsten Empfängern) minimal wird — zusammen mit nicht-quadratischen
 * Karten (z. B. 1024×4096) verschwendet das kaum Texel.
 *
 * Stabilität: Die Lichtbasis hängt am Sonnen-Rig (bewegt sich nicht, wenn der Planet rollt). Texelgrößen werden in
 * 2^(1/8)-Stufen quantisiert (mit Hysterese), Rechtecke auf das Texelgitter gesnappt → das Abtastgitter steht in
 * der Welt still, solange sich Kamera und Sonne nicht bewegen.
 *
 * **Gitter an der Ebene (Karte v5, R1):** mit `gridOffset` (Ebenenkoordinaten des Schattenraum-Ursprungs = Fokus der
 * unendlichen Ebene) wird in **Ebenenkoordinaten** gesnappt: `originPlaneX/Y` ist ein Vielfaches des Texels in der Ebene,
 * das Rechteck in Schattenraum-Koordinaten (`x0 = originPlaneX − X · gridOffset`) rückt beim Schwenken um genau den
 * Fokusweg nach. Werfer und Empfänger stehen in der Ebene still → die Schatten kleben am Gelände, keine wandernden
 * Treppen. Jede Kaskade bekommt einen **Rand** (`margin[k]`, Anteil der Empfängerausdehnung je Seite): solange die
 * sichtbaren Empfänger im alten Rechteck Platz haben, behält der Fit es (Hysterese über `out`) — der Besitzer muss die
 * Karte dann nicht neu zeichnen, sondern nur die Lichtkamera mitschieben (`CascadedShadows.slide`). Dasselbe gilt für das
 * Tiefenfenster (`depthPlane0/1`, Ebenenkoordinaten entlang L) und das Auge (`eyePlane`).
 */

export interface ReceiverShellSpec {
  /** Mittelpunkt (Welt). */
  center: Vector3;
  rMin: number;
  rMax: number;
  /**
   * Optional: Geländeradius in einer Weltrichtung (Einheitsvektor vom Mittelpunkt). Damit werden die feinen Kaskaden
   * an geschätzte Bodenpunkte gefittet statt an die ganze Schale (die gröbste Kaskade deckt weiter die Schale ab).
   */
  surface?: ((dirWorld: Vector3) => number) | null;
  /**
   * Zähler des Bodenzustands: gleicher Wert → Bodenschätzungen des letzten Fits je Abtastpunkt wiederverwenden (der
   * Besitzer erhöht ihn, wenn sich Kamera oder Planetendrehung merklich geändert haben).
   */
  surfaceEpoch?: number;
  /**
   * Schatten v3: auch die gröbste Kaskade an den Boden fitten (± `coverTolerance` Welteinheiten um den geschätzten
   * Bodenpunkt, dazu `volumes`). Ohne diesen Wert deckt sie die ganze Schale ab — in der Hochformat-Karte waren das
   * 45 × 35 Einheiten Luft statt 22 × 8 Einheiten sichtbarem Boden (Faktor 2 in X und 4,5 in Y an Auflösung verschenkt).
   */
  coverTolerance?: number | null;
  /**
   * Schatten v3: Höhe über dem Boden, bis zu der verteilte Empfänger reichen (Kronen einer Wald-Schicht, die selbst
   * Schlagschatten tragen). Die gröbste Kaskade nimmt je Strahl zusätzlich den Punkt Boden + Normale · `coverAbove`
   * auf — einseitig nach oben, billiger als ein breiteres Band. Ohne Wert (oder ≤ `coverTolerance`) nichts.
   */
  coverAbove?: number | null;
}

/** Zusätzliche Empfänger über dem Boden (Welt-Kugeln: Riesenbaum-Stamm, Brett): immer in allen Kaskaden gefittet. */
export interface ReceiverVolume {
  center: Vector3;
  radius: number;
}

export interface ReceiverSlabSpec {
  /** Punkt der Bezugsebene (Welt). */
  origin: Vector3;
  /** Normale (Welt, Einheitsvektor). */
  normal: Vector3;
  hMin: number;
  hMax: number;
}

export interface ClipBoxSpec {
  /** Box im lokalen Raum. */
  min: Vector3;
  max: Vector3;
  /** Welt → lokaler Raum der Box. */
  toLocal: Matrix4;
}

export interface CascadeSize {
  width: number;
  height: number;
}

/**
 * Verzug zwischen Blick- und Schattenraum (unendliche Ebene, ADR 0002): Die Kamera sieht die Anzeigekugel, die Schatten
 * liegen in der flachen Ebene. Abtaststrahlen laufen im Anzeigeraum; ihre Empfängerpunkte werden mit `toShadow` in den
 * Schattenraum gelegt, bevor die Kaskaden sie umranden. Empfänger-Volumen liegen im Schattenraum.
 */
export interface ShadowSpaceWarp {
  /** Anzeigeraum → Schattenraum (an Ort und Stelle). */
  toShadow(p: Vector3): Vector3;
  /** Schattenraum → Anzeigeraum (an Ort und Stelle). */
  toView(p: Vector3): Vector3;
}

export interface FitInput {
  camera: PerspectiveCamera;
  /** Zeichenpuffer in Pixeln (für die Pixel-je-Texel-Schätzung). */
  viewport: { width: number; height: number };
  shell: ReceiverShellSpec | null;
  slab: ReceiverSlabSpec | null;
  clip: ClipBoxSpec | null;
  /** Größte Blicktiefe, in der noch Empfänger zählen. */
  maxDistance: number;
  /** Richtung zur Sonne (Welt, Einheitsvektor). */
  sunDir: Vector3;
  /** Referenz-Oben (Welt) für die Grundbasis des Lichtraums (ψ = 0: Licht-Y ≈ Oben). */
  upRef: Vector3;
  /** Fester Weltpunkt, durch den die Lichtkamera blickt (Ursprung des Texelgitters). */
  anchor: Vector3;
  /** Wie weit Schattenwerfer entlang des Sonnenstrahls vor den Empfängern liegen können (Welteinheiten). */
  casterReach: number;
  sizes: CascadeSize[];
  /** Aufteilung der Tiefe: 0 = gleichmäßig, 1 = logarithmisch. */
  lambda: number;
  /** Rand in Texeln je Seite (Filter-Fußabdruck + Überblendband). */
  padTexels: number;
  /** Anteil der Kaskadentiefe, über den zur nächsten Kaskade überblendet wird. */
  blend: number;
  /** ψ fest vorgeben (Grad) statt zu optimieren. */
  fixedPsiDeg?: number | null;
  /** ψ des letzten Fits behalten (Kamera und Sonne unverändert, z. B. während der Planet rollt). */
  keepPsi?: boolean;
  /** Texelgrößen der feinen Kaskaden festhalten (Rollen): Gitter bleibt stehen, Rechtecke werden nur verschoben. */
  lockTexels?: boolean;
  /** Empfänger über dem Boden (Welt-Kugeln, Schattenraum), zusätzlich zum Bodenfokus. */
  volumes?: ReceiverVolume[] | null;
  /** Verzug Blick- ↔ Schattenraum (null = gleicher Raum). */
  warp?: ShadowSpaceWarp | null;
  /**
   * Ebenenkoordinaten des Schattenraum-Ursprungs (Fokus der unendlichen Ebene): Texelgitter, Tiefenfenster und Auge
   * werden in Ebenenkoordinaten gesnappt und festgehalten (siehe Kopf). null = Schattenraum selbst (alte Konsumenten).
   */
  gridOffset?: Vector3 | null;
  /**
   * Rand je Kaskade als Anteil der Empfängerausdehnung je Seite (z. B. fein 0,1 / mittel 0,2 / fern 0,3): das Rechteck
   * überlebt Schwenks bis zu diesem Weg ohne Neuzeichnen; kostet entsprechend Auflösung.
   */
  margin?: readonly number[] | null;
  /** Rand des Tiefenfensters je Seite (Welteinheiten; Standard 3 ≈ ein Schwenk bis zum nächsten Refit). */
  depthMargin?: number;
}

export interface CascadeFit {
  active: boolean;
  /** Rechteck in absoluten Lichtraum-Koordinaten des Schattenraums (Achsen X(ψ), Y(ψ)). */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  texelX: number;
  texelY: number;
  /** Tiefe entlang −L relativ zum Auge: Nah- und Fernebene der Lichtkamera. */
  near: number;
  far: number;
  /** Blicktiefe, bis zu der diese Kaskade gilt (Überblendung davor). */
  split: number;
  /** Geschätzter größter Bildschirm-Fußabdruck eines Texels (px) an den eigenen nächsten Empfängern. */
  pxPerTexel: number;
  /** Rechteckursprung (x0, y0) in **Ebenenkoordinaten** entlang X(ψ)/Y(ψ): Vielfache des Texels, beim Schwenken fest. */
  originPlaneX: number;
  originPlaneY: number;
  /** Empfängerbedarf dieser Kaskade (Schattenraum, vor Rand und Snapping; mit den feineren Kaskaden vereinigt). */
  needX0: number;
  needX1: number;
  needY0: number;
  needY1: number;
  /** Tiefenbedarf entlang L (Schattenraum): von den fernsten Empfängern bis zu den nächsten Werfern (`casterReach`). */
  needZ0: number;
  needZ1: number;
  /** Abgedecktes Tiefenfenster entlang L in **Ebenenkoordinaten** (Inhalt mit L · p_Ebene ∈ [0, 1] ist in der Karte). */
  depthPlane0: number;
  depthPlane1: number;
}

export interface FitResult {
  empty: boolean;
  psi: number;
  /** Licht-Basis (Welt): X, Y spannen die Karte auf, L zeigt zur Sonne. */
  X: Vector3;
  Y: Vector3;
  L: Vector3;
  /** Auge der Lichtkameras (Schattenraum, zum `gridOffset` dieses Fits). */
  eye: Vector3;
  /** Auge in Ebenenkoordinaten (beim Schwenken fest: `eye = eyePlane − gridOffset`). */
  eyePlane: Vector3;
  /** `gridOffset` dieses Fits (Kopie). */
  gridOffset: Vector3;
  dMin: number;
  dMax: number;
  cascades: CascadeFit[];
  /** Anzahl gültiger Abtaststrahlen (Diagnose). */
  rays: number;
}

const EDGE_SAMPLES = 24;
const GRID_X = 13;
const GRID_Y = 10;
/** Höhentoleranz um den geschätzten Bodenpunkt (Gelände zwischen den Strahlen, Schätzfehler). */
const GROUND_TOL = 0.55;
/** Proben des groben Marschs je Strahl (quadratisch verteilt: dicht nahe der Kamera). */
const MARCH_STEPS = 8;
const MAX_RAYS = EDGE_SAMPLES * 4 + GRID_X * GRID_Y;
const PSI_STEPS = 24;
const QUANT = 8;

const _o = new Vector3();
const _f = new Vector3();
const _d = new Vector3();
const _p = new Vector3();
const _q = new Vector3();
const _n = new Vector3();
const _g = new Vector3();
const _vp = new Matrix4();
const _sph = new Sphere();
const _w = new Vector3();

function emptyCascade(): CascadeFit {
  return {
    active: false,
    x0: 0,
    x1: 1,
    y0: 0,
    y1: 1,
    texelX: 1,
    texelY: 1,
    near: 0.1,
    far: 1,
    split: 0,
    pxPerTexel: 0,
    originPlaneX: 0,
    originPlaneY: 0,
    needX0: 0,
    needX1: 0,
    needY0: 0,
    needY1: 0,
    needZ0: 0,
    needZ1: 0,
    depthPlane0: 0,
    depthPlane1: 0,
  };
}

export function createFitResult(n: number): FitResult {
  return {
    empty: true,
    psi: 0,
    X: new Vector3(1, 0, 0),
    Y: new Vector3(0, 1, 0),
    L: new Vector3(0, 0, 1),
    eye: new Vector3(),
    eyePlane: new Vector3(),
    gridOffset: new Vector3(),
    dMin: 0,
    dMax: 0,
    cascades: Array.from({ length: n }, emptyCascade),
    rays: 0,
  };
}

/** Standardrand je Kaskade (fein → grob) für `n` Kaskaden: 0,1 / 0,2 / 0,3 (zwei Kaskaden: 0,1 / 0,3). */
export function defaultMargins(n: number): number[] {
  if (n <= 1) return [0.3];
  return Array.from({ length: n }, (_, k) => 0.1 + (0.2 * k) / (n - 1));
}

/** Standardrand des Tiefenfensters (Welteinheiten je Seite). */
export const DEFAULT_DEPTH_MARGIN = 3;

/** Ursprung in Ebenenkoordinaten auf das Texelgitter snappen: Bedarf mittig, Rand symmetrisch. */
function snapOrigin(p0: number, p1: number, cells: number, texel: number): number {
  return Math.round(((p0 + p1) * 0.5 - cells * texel * 0.5) / texel) * texel;
}

/** Texelgröße auf das 2^(1/8)-Raster runden (aufwärts). */
export function quantizeTexel(t: number): number {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(1e-9, t)) * QUANT - 1e-9) / QUANT);
}

/** Nächstgrößere Rasterstufe. */
function nextTexel(t: number): number {
  return t * Math.pow(2, 1 / QUANT);
}

/** Aufteilung nach „practical split“: Mischung aus logarithmisch und gleichmäßig zwischen dMin und dMax. */
export function splitDistances(n: number, dMin: number, dMax: number, lambda: number): number[] {
  const out: number[] = [];
  const lo = Math.max(1e-3, dMin);
  for (let k = 1; k <= n; k++) {
    const f = k / n;
    const log = lo * Math.pow(dMax / lo, f);
    const uni = lo + (dMax - lo) * f;
    out.push(lambda * log + (1 - lambda) * uni);
  }
  out[n - 1] = dMax;
  return out;
}

const _hit: [number, number] = [0, 0];

/** Strahl ∩ Kugel: [t0, t1] (geteiltes Scratch-Tupel) oder null. */
function raySphere(o: Vector3, d: Vector3, c: Vector3, r: number): [number, number] | null {
  const ox = o.x - c.x;
  const oy = o.y - c.y;
  const oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  _hit[0] = -b - s;
  _hit[1] = -b + s;
  return _hit;
}

/**
 * Wiederverwendbarer Fitter (Scratch-Puffer). `fit()` schreibt das Ergebnis in `out` und nutzt `out` als
 * Vorzustand für die Hysterese (Texelgrößen, ψ).
 */
export class CascadeFitter {
  private readonly ta = new Float64Array(MAX_RAYS);
  private readonly tb = new Float64Array(MAX_RAYS);
  /** Fokusintervall (um den geschätzten Bodenpunkt) und Bodenpunkt je Strahl. */
  private readonly ga = new Float64Array(MAX_RAYS);
  private readonly gb = new Float64Array(MAX_RAYS);
  /** Intervall der gröbsten Kaskade je Strahl (Schale oder Bodenfokus mit `coverTolerance`). */
  private readonly ca = new Float64Array(MAX_RAYS);
  private readonly cb = new Float64Array(MAX_RAYS);
  private readonly tg = new Float64Array(MAX_RAYS);
  /** Strahl trifft (nach der Bodenschätzung) Gelände. */
  private readonly gHit = new Uint8Array(MAX_RAYS);
  /** Cache der Bodenschätzung je Abtastpunkt (Index über alle Proben, nicht nur gültige Strahlen). */
  private readonly cacheTg = new Float64Array(MAX_RAYS).fill(NaN);
  private readonly cacheHit = new Uint8Array(MAX_RAYS);
  private cacheEpoch = -1;
  /** Mitten der Empfänger-Volumen im Blickraum (je Fit einmal abgebildet). */
  private readonly volView: Vector3[] = [];
  /** Anzahl Geländeabfragen im letzten Fit (Diagnose). */
  surfaceCalls = 0;
  private readonly cos = new Float64Array(MAX_RAYS);
  private readonly dx = new Float64Array(MAX_RAYS);
  private readonly dy = new Float64Array(MAX_RAYS);
  private readonly dz = new Float64Array(MAX_RAYS);
  /** Endpunkte je Kaskade in der Grundbasis (x0, y0, z), 2 je Strahl (+1 für `coverAbove`). */
  private readonly px = new Float64Array(MAX_RAYS * 3);
  private readonly py = new Float64Array(MAX_RAYS * 3);
  private readonly pz = new Float64Array(MAX_RAYS * 3);
  /** Nächste Empfänger je Strahl: Tiefe und Bildschirm-Jacobi (px je Lichteinheit entlang X0/Y0). */
  private readonly mDepth = new Float64Array(MAX_RAYS);
  private readonly m00 = new Float64Array(MAX_RAYS);
  private readonly m10 = new Float64Array(MAX_RAYS);
  private readonly m01 = new Float64Array(MAX_RAYS);
  private readonly m11 = new Float64Array(MAX_RAYS);
  private readonly X0 = new Vector3();
  private readonly Y0 = new Vector3();

  /** Kamerafrustum des laufenden Fits (Sichtbarkeit der Empfänger-Volumen). */
  private readonly frustum = new Frustum();

  private warp: ShadowSpaceWarp | null = null;

  /** Punkt des Schattenraums → Blickraum (ohne Verzug unverändert). */
  private view(p: Vector3, out: Vector3): Vector3 {
    out.copy(p);
    return this.warp ? this.warp.toView(out) : out;
  }

  private volumeVisible(v: ReceiverVolume): boolean {
    this.view(v.center, _sph.center);
    _sph.radius = v.radius;
    return this.frustum.intersectsSphere(_sph);
  }

  fit(input: FitInput, out: FitResult): FitResult {
    const cam = input.camera;
    // Vorzustand für die Hysterese (Rechtecke, Tiefenfenster, Auge in Ebenenkoordinaten)
    const prevValid = !out.empty && out.rays > 0;
    this.warp = input.warp ?? null;
    const warp = this.warp;
    const n = input.sizes.length;
    while (out.cascades.length < n) out.cascades.push(emptyCascade());
    out.cascades.length = n;
    cam.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(_vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), cam.coordinateSystem);
    _o.setFromMatrixPosition(cam.matrixWorld);
    _f.set(0, 0, -1).transformDirection(cam.matrixWorld);
    const near = Math.max(1e-3, cam.near);

    // --- 0) Lichtbasis: L zur Sonne, Y0 = Oben projiziert, X0 = Y0 × L (wie lookAt der Schattenkamera) ---------
    const L = out.L.copy(input.sunDir).normalize();
    const Y0 = this.Y0.copy(input.upRef).addScaledVector(L, -input.upRef.dot(L));
    if (Y0.lengthSq() < 1e-8) Y0.set(0, 0, -1).addScaledVector(L, L.z);
    Y0.normalize();
    const X0 = this.X0.crossVectors(Y0, L).normalize();
    // Clip-Box → Prisma entlang des Lichts: Empfänger zählen, wenn sie im Lichtraum-Rechteck der Box liegen (alles
    // hinter der Box entlang des Sonnenstrahls, also auch ihre langen Schatten) — dieselbe Abdeckung wie die alte Einzelkarte.
    let cx0 = -Infinity;
    let cx1 = Infinity;
    let cy0 = -Infinity;
    let cy1 = Infinity;
    if (input.clip) {
      const b = input.clip;
      _vp.copy(b.toLocal).invert();
      cx0 = cy0 = Infinity;
      cx1 = cy1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        _q.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(_vp);
        if (warp) warp.toShadow(_q);
        const x = _q.dot(X0);
        const y = _q.dot(Y0);
        cx0 = Math.min(cx0, x);
        cx1 = Math.max(cx1, x);
        cy0 = Math.min(cy0, y);
        cy1 = Math.max(cy1, y);
      }
    }
    const ox0 = _o.dot(X0);
    const oy0 = _o.dot(Y0);
    const clipWarped = !!(input.clip && warp);

    // --- 1) Abtaststrahlen durch den Bildschirm, je Strahl das Empfängerintervall [ta, tb] ----------------
    let rays = 0;
    let dMin = Infinity;
    let dMax = 0;
    let slot = -1;
    this.surfaceCalls = 0;
    const epoch = input.shell?.surfaceEpoch ?? -2;
    const reuse = epoch === this.cacheEpoch && epoch >= 0;
    if (!reuse) this.cacheTg.fill(NaN);
    this.cacheEpoch = epoch;
    // Empfänger-Volumen einmal je Fit in den Blickraum (mit Verzug kostet jede Mitte eine Abbildung — je Strahl wären
    // es Strahlen × Volumen, beim Drehen und Schwenken jedes Bild)
    const vols = input.volumes;
    const nv = vols?.length ?? 0;
    while (this.volView.length < nv) this.volView.push(new Vector3());
    for (let v = 0; v < nv; v++) this.view(vols![v]!.center, this.volView[v]!);
    const addRay = (nx: number, ny: number): void => {
      slot++;
      _d.set(nx, ny, 0.5).unproject(cam).sub(_o).normalize();
      const c = _d.dot(_f);
      if (c <= 1e-4) return;
      let ta = near / c;
      let tb = input.maxDistance / c;
      if (input.shell) {
        const s = input.shell;
        const outer = raySphere(_o, _d, s.center, s.rMax);
        if (!outer || outer[1] <= 0) return;
        ta = Math.max(ta, outer[0]);
        let end = outer[1];
        const inner = raySphere(_o, _d, s.center, Math.max(1e-3, s.rMin));
        if (inner && inner[0] > 0) end = Math.min(end, inner[0]);
        tb = Math.min(tb, end);
      }
      if (input.slab) {
        const s = input.slab;
        const h0 = (_o.x - s.origin.x) * s.normal.x + (_o.y - s.origin.y) * s.normal.y + (_o.z - s.origin.z) * s.normal.z;
        const dn = _d.dot(s.normal);
        if (Math.abs(dn) < 1e-6) {
          if (h0 < s.hMin || h0 > s.hMax) return;
        } else {
          const t0 = (s.hMin - h0) / dn;
          const t1 = (s.hMax - h0) / dn;
          ta = Math.max(ta, Math.min(t0, t1));
          tb = Math.min(tb, Math.max(t0, t1));
        }
      }
      if (input.clip && !warp) {
        // Prisma-Test im Lichtraum: zwei Platten (X0, Y0), entlang L unbegrenzt (mit Verzug: Klemmen der Endpunkte in 4)
        const slabs: Array<[number, number, number, number]> = [
          [ox0, _d.dot(X0), cx0, cx1],
          [oy0, _d.dot(Y0), cy0, cy1],
        ];
        for (const [o, d, lo, hi] of slabs) {
          if (Math.abs(d) < 1e-9) {
            if (o < lo || o > hi) return;
            continue;
          }
          const t0 = (lo - o) / d;
          const t1 = (hi - o) / d;
          ta = Math.max(ta, Math.min(t0, t1));
          tb = Math.min(tb, Math.max(t0, t1));
        }
      }
      if (!(ta < tb) || tb <= 0) return;
      ta = Math.max(ta, 0);
      const i = rays++;
      this.ta[i] = ta;
      this.tb[i] = tb;
      this.cos[i] = c;
      this.dx[i] = _d.x;
      this.dy[i] = _d.y;
      this.dz[i] = _d.z;
      let ga = ta;
      let gb = tb;
      let tg = ta;
      const surf = input.shell?.surface;
      if (surf && input.shell) {
        // Bodenpunkt: grober Marsch über [ta, tb] (Höhe über Gelände f = |P| − r(Richtung)), erster Vorzeichenwechsel,
        // dann Bisektion. Kein Treffer → Strahl sieht (nach den Proben) kein Gelände: nur Abdeckung, kein Fokus.
        const sh = input.shell;
        const height = (t: number): number => {
          this.surfaceCalls++;
          _p.copy(_d).multiplyScalar(t).add(_o).sub(sh.center);
          const len = _p.length();
          _p.divideScalar(len);
          return len - surf(_p);
        };
        let hit = -1;
        const cached = this.cacheTg[slot]!;
        const useCache = reuse && !Number.isNaN(cached);
        let prevT = ta;
        let prevF = useCache ? 1 : height(ta);
        if (useCache) hit = this.cacheHit[slot] ? Math.min(tb, Math.max(ta, cached)) : -1;
        else if (prevF <= 0) hit = ta;
        for (let k = 1; k <= MARCH_STEPS && hit < 0 && !useCache; k++) {
          const f = k / MARCH_STEPS;
          const t = ta + (tb - ta) * f * f;
          const h = height(t);
          if (h <= 0) {
            let lo = prevT;
            let hi = t;
            for (let b = 0; b < 4; b++) {
              const m = (lo + hi) * 0.5;
              if (height(m) > 0) lo = m;
              else hi = m;
            }
            hit = (lo + hi) * 0.5;
          }
          prevT = t;
          prevF = h;
        }
        void prevF;
        this.cacheTg[slot] = hit >= 0 ? hit : tb;
        this.cacheHit[slot] = hit >= 0 ? 1 : 0;
        if (hit >= 0) {
          _p.copy(_d).multiplyScalar(hit).add(_o).sub(sh.center).normalize();
          const cosN = Math.max(0.25, -_p.dot(_d));
          const tol = GROUND_TOL / cosN;
          tg = hit;
          ga = Math.max(ta, hit - tol);
          gb = Math.min(tb, hit + tol);
        } else {
          tg = tb;
          ga = tb;
          gb = tb;
        }
      }
      this.gHit[i] = surf && gb > ga ? 1 : 0;
      // Gröbste Kaskade: ganze Schale (alt) oder Bodenfokus mit größerer Toleranz (v3)
      let ca = ta;
      let cb = tb;
      const coverTol = input.shell?.coverTolerance;
      if (surf && coverTol !== undefined && coverTol !== null) {
        if (gb > ga) {
          _p.copy(_d).multiplyScalar(tg).add(_o).sub(input.shell!.center).normalize();
          const cosN = Math.max(0.25, -_p.dot(_d));
          ca = Math.max(ta, tg - coverTol / cosN);
          cb = Math.min(tb, tg + coverTol / cosN);
        } else {
          ca = cb = tb;
        }
      }
      // Empfänger-Volumen (Riesenbaum, Brett): Strahlabschnitt in der Kugel zu beiden Intervallen
      if (vols) {
        for (let vi = 0; vi < nv; vi++) {
          const h = raySphere(_o, _d, this.volView[vi]!, vols[vi]!.radius);
          if (!h || h[1] <= ta || h[0] >= tb) continue;
          const v0 = Math.max(ta, h[0]);
          const v1 = Math.min(tb, h[1]);
          if (gb > ga) {
            ga = Math.min(ga, v0);
            gb = Math.max(gb, v1);
          } else {
            ga = v0;
            gb = v1;
          }
          if (cb > ca) {
            ca = Math.min(ca, v0);
            cb = Math.max(cb, v1);
          } else {
            ca = v0;
            cb = v1;
          }
        }
      }
      this.ga[i] = ga;
      this.gb[i] = gb;
      this.tg[i] = tg;
      this.ca[i] = ca;
      this.cb[i] = cb;
      if (gb > ga || !surf) dMin = Math.min(dMin, ga * c);
      if (cb > ca) dMax = Math.max(dMax, cb * c);
    };
    for (let i = 0; i < EDGE_SAMPLES; i++) {
      const u = -1 + (2 * i) / (EDGE_SAMPLES - 1);
      addRay(u, -1);
      addRay(u, 1);
      addRay(-1, u);
      addRay(1, u);
    }
    for (let j = 0; j < GRID_Y; j++) {
      for (let i = 0; i < GRID_X; i++) addRay(-1 + (2 * (i + 0.5)) / GRID_X, -1 + (2 * (j + 0.5)) / GRID_Y);
    }
    out.rays = rays;
    if (rays > 0 && !(dMax > 0)) {
      // Kein Boden und kein Volumen sichtbar (nur Himmel): nichts zu beschatten
      rays = 0;
    }
    if (rays === 0) {
      out.empty = true;
      for (const c of out.cascades) c.active = false;
      return out;
    }
    out.empty = false;
    out.dMin = dMin;
    out.dMax = dMax;
    const splits = splitDistances(n, dMin, dMax, input.lambda);


    // --- 3) Bildschirm-Jacobi an den nächsten Empfängern (px je Lichteinheit, für die ψ-Wahl und die Anzeige) -----
    _vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    const vw = input.viewport.width * 0.5;
    const vh = input.viewport.height * 0.5;
    const toPx = (p: Vector3, outV: Vector3): Vector3 => {
      outV.copy(p).applyMatrix4(_vp);
      return outV.set(outV.x * vw, outV.y * vh, 0);
    };
    for (let i = 0; i < rays; i++) {
      const t = input.shell?.surface ? this.tg[i]! : this.ta[i]!;
      _p.set(_o.x + this.dx[i]! * t, _o.y + this.dy[i]! * t, _o.z + this.dz[i]! * t);
      this.mDepth[i] = t * this.cos[i]!;
      // Bodennormale im Schattenraum (flache Ebene: oben; Kugel/Bühne wie bisher)
      if (warp) _n.copy(input.upRef);
      else if (input.shell) _n.copy(_p).sub(input.shell.center).normalize();
      else if (input.slab) _n.copy(input.slab.normal);
      else _n.copy(input.upRef);
      const ln = Math.max(0.08, L.dot(_n));
      const h = Math.max(1e-3, t * 0.004);
      toPx(_p, _q);
      const sx = _q.x;
      const sy = _q.y;
      // Bodenpunkt im Schattenraum (Ausgang der Schritte)
      _w.copy(_p);
      if (warp) warp.toShadow(_w);
      // Bodenverschiebung für einen Lichtraum-Schritt e: g = e − L (e·n)/(L·n) (Schattenraum), dann zurück in den Blick
      for (let a = 0; a < 2; a++) {
        const e = a === 0 ? X0 : Y0;
        _g.copy(e).addScaledVector(L, -e.dot(_n) / ln).multiplyScalar(h).add(_w);
        if (warp) warp.toView(_g);
        toPx(_g, _g);
        const gx = (_g.x - sx) / h;
        const gy = (_g.y - sy) / h;
        if (a === 0) {
          this.m00[i] = gx;
          this.m10[i] = gy;
        } else {
          this.m01[i] = gx;
          this.m11[i] = gy;
        }
      }
    }

    // --- 4) Endpunkte je Kaskade in der Grundbasis ---------------------------------------------------------
    const pts = (k: number): number => {
      const lim = splits[k]!;
      const cover = k === n - 1;
      let m = 0;
      for (let i = 0; i < rays; i++) {
        const c = this.cos[i]!;
        const ta = cover ? this.ca[i]! : this.ga[i]!;
        const tb = Math.min(cover ? this.cb[i]! : this.gb[i]!, lim / c);
        if (!(ta < tb)) continue;
        for (const t of [ta, tb]) {
          _w.set(_o.x + this.dx[i]! * t, _o.y + this.dy[i]! * t, _o.z + this.dz[i]! * t);
          if (warp) warp.toShadow(_w);
          // Verzug + Clip-Box: Endpunkte im Schattenraum auf das Prisma der Box klemmen (der Strahltest oben liefe im
          // Anzeigeraum)
          this.px[m] = clipWarped ? Math.min(cx1, Math.max(cx0, _w.dot(X0))) : _w.dot(X0);
          this.py[m] = clipWarped ? Math.min(cy1, Math.max(cy0, _w.dot(Y0))) : _w.dot(Y0);
          this.pz[m] = _w.dot(L);
          m++;
        }
      }
      // Verteilte Empfänger über dem Boden (Kronen): Boden + Normale · coverAbove je Strahl, nur in der gröbsten Kaskade
      const above = input.shell?.coverAbove ?? 0;
      if (cover && input.shell && above > (input.shell.coverTolerance ?? 0)) {
        const center = input.shell.center;
        for (let i = 0; i < rays; i++) {
          if (!this.gHit[i]) continue;
          const t = this.tg[i]!;
          _p.set(_o.x + this.dx[i]! * t, _o.y + this.dy[i]! * t, _o.z + this.dz[i]! * t);
          if (warp) {
            // Ebene: Boden + oben (Schattenraum); Blicktiefe des gehobenen Punkts aus dem Anzeigeraum
            warp.toShadow(_p);
            _p.y += above;
            const depth = this.view(_p, _q).sub(_o).dot(_f);
            if (depth <= near || depth > lim) continue;
          } else {
            _n.copy(_p).sub(center).normalize();
            _p.addScaledVector(_n, above);
            const depth = _q.copy(_p).sub(_o).dot(_f);
            if (depth <= near || depth > lim) continue;
          }
          this.px[m] = _p.dot(X0);
          this.py[m] = _p.dot(Y0);
          this.pz[m] = _p.dot(L);
          m++;
        }
      }
      return m;
    };

    // --- 5) ψ wählen: kleinster größter Texel-Fußabdruck in Kaskade 0 --------------------------------------
    const size0 = input.sizes[0]!;
    const m0 = pts(0);
    const extent = (m: number, c: number, s: number): [number, number, number, number] => {
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (let i = 0; i < m; i++) {
        const x = c * this.px[i]! - s * this.py[i]!;
        const y = s * this.px[i]! + c * this.py[i]!;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      return [x0, x1, y0, y1];
    };
    const footprint = (c: number, s: number, tx: number, ty: number, dLo: number, dHi: number): number => {
      let worst = 0;
      for (let i = 0; i < rays; i++) {
        const d = this.mDepth[i]!;
        if (d < dLo || d > dHi) continue;
        // Achse X(ψ) = c·X0 − s·Y0, Y(ψ) = s·X0 + c·Y0
        const ax = Math.hypot(c * this.m00[i]! - s * this.m01[i]!, c * this.m10[i]! - s * this.m11[i]!);
        const ay = Math.hypot(s * this.m00[i]! + c * this.m01[i]!, s * this.m10[i]! + c * this.m11[i]!);
        worst = Math.max(worst, tx * ax, ty * ay);
      }
      return worst;
    };
    const padFrac = 0.02;
    const texelsFor = (w: number, h: number, size: CascadeSize): [number, number] => {
      const pad = input.padTexels * 2 + 1;
      return [(w * (1 + 2 * padFrac)) / Math.max(1, size.width - pad), (h * (1 + 2 * padFrac)) / Math.max(1, size.height - pad)];
    };
    let psi = out.psi;
    if (input.fixedPsiDeg !== undefined && input.fixedPsiDeg !== null) {
      psi = (input.fixedPsiDeg * Math.PI) / 180;
    } else if (m0 > 0 && !(input.keepPsi && out.rays > 0)) {
      let best = Infinity;
      let bestPsi = 0;
      const score = (a: number): number => {
        const c = Math.cos(a);
        const s = Math.sin(a);
        const [x0, x1, y0, y1] = extent(m0, c, s);
        const [tx, ty] = texelsFor(x1 - x0, y1 - y0, size0);
        return footprint(c, s, tx, ty, 0, splits[0]!);
      };
      for (let k = 0; k < PSI_STEPS; k++) {
        const a = (k * Math.PI) / PSI_STEPS;
        const f = score(a);
        if (f < best) {
          best = f;
          bestPsi = a;
        }
      }
      // Hysterese: altes ψ behalten, solange es höchstens 8 % schlechter ist
      const prev = score(out.psi);
      psi = prev <= best * 1.08 ? out.psi : bestPsi;
    }
    out.psi = psi;
    const cp = Math.cos(psi);
    const sp = Math.sin(psi);
    out.X.copy(X0).multiplyScalar(cp).addScaledVector(Y0, -sp);
    out.Y.copy(X0).multiplyScalar(sp).addScaledVector(Y0, cp);

    // --- 6) Rechtecke je Kaskade (verschachtelt), Texel quantisieren, in Ebenenkoordinaten auf das Gitter snappen ----
    // Ebenenkoordinaten = Schattenraum + gridOffset (entlang der Lichtachsen X(ψ), Y(ψ), L)
    const g = input.gridOffset ?? null;
    const gX = g ? out.X.dot(g) : 0;
    const gY = g ? out.Y.dot(g) : 0;
    const gL = g ? L.dot(g) : 0;
    const keepRects = input.lockTexels === true && prevValid;
    const depthMargin = input.depthMargin ?? DEFAULT_DEPTH_MARGIN;
    let ux0 = Infinity;
    let ux1 = -Infinity;
    let uy0 = Infinity;
    let uy1 = -Infinity;
    let zAll1 = -Infinity;
    for (let k = 0; k < n; k++) {
      const cf = out.cascades[k]!;
      const size = input.sizes[k]!;
      const m = k === 0 ? m0 : pts(k);
      cf.split = splits[k]!;
      if (m === 0) {
        cf.active = false;
        continue;
      }
      const wasActive = cf.active;
      let [x0, x1, y0, y1] = extent(m, cp, sp);
      // verschachtelt: jede gröbere Kaskade deckt den Bedarf der feineren samt Filter-Fußabdruck (nicht deren Rechteck:
      // das trägt einen Rand und gleitet beim Schwenken — der grobe Bedarf bliebe sonst nie stehen)
      x0 = Math.min(x0, ux0);
      x1 = Math.max(x1, ux1);
      y0 = Math.min(y0, uy0);
      y1 = Math.max(y1, uy1);
      let z0 = Infinity;
      let z1 = -Infinity;
      for (let i = 0; i < m; i++) {
        z0 = Math.min(z0, this.pz[i]!);
        z1 = Math.max(z1, this.pz[i]!);
      }
      // Empfänger-Volumen ganz (die Abtaststrahlen treffen ihre Ränder nicht genau): sichtbare Kugeln, deren
      // Blicktiefe in diese Kaskade reicht
      if (input.volumes) {
        for (const v of input.volumes) {
          if (!this.volumeVisible(v)) continue;
          const dc = this.view(v.center, _q).sub(_o).dot(_f);
          if (dc + v.radius < near || (k < n - 1 && dc - v.radius > cf.split)) continue;
          const px0 = v.center.dot(X0);
          const py0 = v.center.dot(Y0);
          const vx = cp * px0 - sp * py0;
          const vy = sp * px0 + cp * py0;
          const vz = v.center.dot(L);
          x0 = Math.min(x0, vx - v.radius);
          x1 = Math.max(x1, vx + v.radius);
          y0 = Math.min(y0, vy - v.radius);
          y1 = Math.max(y1, vy + v.radius);
          z0 = Math.min(z0, vz - v.radius);
          z1 = Math.max(z1, vz + v.radius);
        }
      }
      // Tiefenbedarf: fernste Empfänger (− kleines Polster) bis zu den Werfern `casterReach` Richtung Sonne
      const zPad = Math.max(0.5, (z1 - z0) * 0.05);
      const needZ0 = z0 - zPad;
      const needZ1 = z1 + input.casterReach;
      zAll1 = Math.max(zAll1, needZ1);
      const w = Math.max(1e-3, x1 - x0);
      const h = Math.max(1e-3, y1 - y0);
      const marginK = input.margin?.[k] ?? 0;
      // Texel aus dem Bedarf plus Rand je Seite (der Rand kostet Auflösung, schenkt aber Schwenks ohne Neuzeichnen)
      const [needX, needY] = texelsFor(w * (1 + 2 * marginK), h * (1 + 2 * marginK), size);
      const pick = (need: number, prev: number, prevActive: boolean): number => (prevActive && prev >= need && prev <= need * 1.25 ? prev : quantizeTexel(need));
      const cover = k === n - 1;
      // Rollen/Schwenken (Kamera/Sonne fest): feine Kaskaden behalten ihre Texelgröße → das Abtastgitter steht still.
      // Wächst die Bodenregion über das Rechteck hinaus, wird es nur zentriert; der Rand fällt an die nächste Kaskade.
      const focusedCover = cover && input.shell?.surface && input.shell.coverTolerance !== undefined && input.shell.coverTolerance !== null;
      const locked = !cover && input.lockTexels === true && cf.active;
      // Bodengefittete gröbste Kaskade beim Rollen: Texel halten, solange die Region hineinpasst und nicht viel kleiner
      // wird (Hügel ziehen durch → Region atmet leicht; ohne Hysterese sprängen die Kanten bei jedem Stufenwechsel)
      const coverLocked = focusedCover && input.lockTexels === true && cf.active;
      let tx: number;
      let ty: number;
      if (locked) {
        tx = needX > cf.texelX * 2 || needX < cf.texelX * 0.5 ? quantizeTexel(needX) : cf.texelX;
        ty = needY > cf.texelY * 2 || needY < cf.texelY * 0.5 ? quantizeTexel(needY) : cf.texelY;
      } else if (coverLocked) {
        tx = needX > cf.texelX || needX < cf.texelX * 0.6 ? quantizeTexel(needX * 1.12) : cf.texelX;
        ty = needY > cf.texelY || needY < cf.texelY * 0.6 ? quantizeTexel(needY * 1.12) : cf.texelY;
      } else {
        tx = pick(needX, cf.texelX, cf.active);
        ty = pick(needY, cf.texelY, cf.active);
      }
      const padX = () => input.padTexels * tx + w * padFrac;
      const padY = () => input.padTexels * ty + h * padFrac;
      // Bedarf in Ebenenkoordinaten
      const px0 = x0 + gX;
      const px1 = x1 + gX;
      const py0 = y0 + gY;
      const py1 = y1 + gY;
      // Hysterese: das alte Rechteck (Ebenenkoordinaten) bleibt, solange der Bedarf samt Filter-Fußabdruck hineinpasst
      // und die Texel gleich sind — der Besitzer zeichnet dann nicht neu (Slide)
      const keep =
        keepRects &&
        wasActive &&
        tx === cf.texelX &&
        ty === cf.texelY &&
        cf.originPlaneX + padX() <= px0 &&
        cf.originPlaneX + size.width * tx - padX() >= px1 &&
        cf.originPlaneY + padY() <= py0 &&
        cf.originPlaneY + size.height * ty - padY() >= py1;
      let ox: number;
      let oy: number;
      if (keep) {
        ox = cf.originPlaneX;
        oy = cf.originPlaneY;
      } else {
        // Bedarf mittig, Rand symmetrisch; Ursprung ein Vielfaches des Texels in der Ebene
        ox = snapOrigin(px0, px1, size.width, tx);
        oy = snapOrigin(py0, py1, size.height, ty);
        if (!locked) {
          // Rechteck muss Bedarf + Fußabdruck fassen (der Rand steckt schon im Texel): sonst nächste Texelstufe
          for (let guard = 0; guard < 6 && (ox + padX() > px0 || ox + size.width * tx - padX() < px1); guard++) {
            tx = nextTexel(tx);
            ox = snapOrigin(px0, px1, size.width, tx);
          }
          for (let guard = 0; guard < 6 && (oy + padY() > py0 || oy + size.height * ty - padY() < py1); guard++) {
            ty = nextTexel(ty);
            oy = snapOrigin(py0, py1, size.height, ty);
          }
        }
      }
      cf.active = true;
      cf.texelX = tx;
      cf.texelY = ty;
      cf.originPlaneX = ox;
      cf.originPlaneY = oy;
      cf.x0 = ox - gX;
      cf.x1 = cf.x0 + size.width * tx;
      cf.y0 = oy - gY;
      cf.y1 = cf.y0 + size.height * ty;
      cf.needX0 = x0;
      cf.needX1 = x1;
      cf.needY0 = y0;
      cf.needY1 = y1;
      cf.needZ0 = needZ0;
      cf.needZ1 = needZ1;
      // Tiefenfenster in Ebenenkoordinaten, mit derselben Hysterese (alt bleibt, solange der Bedarf hineinpasst)
      const keepDepth = keepRects && wasActive && cf.depthPlane0 <= needZ0 + gL && cf.depthPlane1 >= needZ1 + gL && cf.depthPlane1 - cf.depthPlane0 <= (needZ1 - needZ0 + 2 * depthMargin) * 1.5 + 4;
      if (!keepDepth) {
        cf.depthPlane0 = needZ0 - depthMargin + gL;
        cf.depthPlane1 = needZ1 + depthMargin + gL;
      }
      ux0 = x0 - padX();
      ux1 = x1 + padX();
      uy0 = y0 - padY();
      uy1 = y1 + padY();
      // Anzeige: Fußabdruck an den eigenen nächsten Empfängern (Tiefe ab der vorigen Überblendung)
      const dLo = k === 0 ? 0 : splits[k - 1]! * (1 - input.blend);
      cf.pxPerTexel = footprint(cp, sp, tx, ty, dLo, splits[k]!);
    }

    // --- 7) Auge: in Ebenenkoordinaten festgehalten (Slide: eye = eyePlane − gridOffset) ----------------------
    // L-Koordinate des Auges (Schattenraum) jenseits aller Tiefenfenster; X/Y vom Anker (beliebig, die Rechtecke sind
    // absolut). Hysterese: bleibt, solange es vor allen Fenstern liegt und nicht absurd weit weg ist (Tiefenauflösung).
    let leNeed = -Infinity;
    for (const cf of out.cascades) if (cf.active) leNeed = Math.max(leNeed, cf.depthPlane1 - gL + 0.5);
    if (!Number.isFinite(leNeed)) leNeed = zAll1 + depthMargin + 2;
    const lePrev = keepRects ? L.dot(out.eyePlane) - gL : NaN;
    const keepEye = Number.isFinite(lePrev) && lePrev >= leNeed && lePrev <= leNeed + 40;
    let le: number;
    if (keepEye) {
      // Auge in der Ebene festhalten (auch X/Y: der Slide-Vergleich bleibt trivial)
      le = lePrev;
      out.eye.copy(out.eyePlane);
      if (g) out.eye.sub(g);
    } else {
      le = leNeed + 8;
      const la = L.dot(input.anchor);
      out.eye.copy(input.anchor).addScaledVector(L, le - la);
      out.eyePlane.copy(out.eye);
      if (g) out.eyePlane.add(g);
    }
    if (g) out.gridOffset.copy(g);
    else out.gridOffset.set(0, 0, 0);
    for (let k = 0; k < n; k++) {
      const cf = out.cascades[k]!;
      if (!cf.active) continue;
      cf.near = Math.max(0.05, le - (cf.depthPlane1 - gL));
      cf.far = le - (cf.depthPlane0 - gL);
    }
    return out;
  }
}
