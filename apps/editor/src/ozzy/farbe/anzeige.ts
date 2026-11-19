/**
 * Ozzy, Paint-Modus, Etappe 1 (19.11.2026): die Farbe auf der Haut zeichnen. Gezeichnet wird über das Grundmaterial, mit denselben
 * Punkten wie die glatte Anzeige der Haut (`HautNetz`), in zwei Teilen:
 *
 * - **Innen:** Dreiecke des Rechennetzes, die ganz zu einer Füllung gehören: ihre feinen Dreiecke als Liste auf den Punkten der
 *   Anzeige, eine Farbe je Füllung.
 * - **Rand:** Dreiecke, durch die eine Farblinie läuft. Jeder Bildpunkt kennt seine Lage im Dreieck des Rechennetzes (zwei
 *   Gewichte) und rechnet selbst, auf welcher Seite der nächsten Kette er liegt und wie weit von ihr (in Bildpunkten). Die Kante
 *   zwischen zwei Farben ist darum bei jedem Zoom einen Bildpunkt breit, gleich auf welcher Stufe die Anzeige gerade steht, und im
 *   Netz wird nichts geschnitten. Die Ketten eines Dreiecks stehen in einer Datentextur.
 *
 * Zwei Arten, die Farbe mit dem Grund zu verrechnen: `wachs` (die Farbe mit Hell, Dunkel und Glanz des Wachses, deckend über dem
 * Wachs; lineare Werte, für das Ziel der festen Materialien) und `hell` (die reine Farbe, mit dem Bild darunter multipliziert: Das
 * helle Solid bringt sein Hell und Dunkel selbst mit).
 */
import {
  BufferAttribute,
  BufferGeometry,
  type Camera,
  CustomBlending,
  DataTexture,
  DataUtils,
  DoubleSide,
  DstColorFactor,
  DynamicDrawUsage,
  FloatType,
  Group,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NearestFilter,
  NoBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RGBAFormat,
  RGFormat,
  Scene,
  ShaderMaterial,
  type WebGLRenderer,
  ZeroFactor,
} from 'three';
import type { HautNetz } from '../../anfang/haut';
import { wachsLichtBild } from '../wachs';
import type { Farbe } from './bemalung';
import { feinEcken } from './fein';
import type { Flaechen } from './flaechen';

export type FarbModus = 'wachs' | 'hell';

/** Breite der Datentextur (Texel je Zeile) */
const DB = 1024;

const VERTEX = /* glsl */ `
  attribute float aSeite;
  #ifdef RAND
  attribute vec2 aBary;
  attribute float aSlot;
  varying vec2 vB;
  flat varying float vSlot;
  #endif
  varying vec3 vBlick;
  varying vec3 vNormale;
  varying vec2 vSpiegel;
  varying vec3 vWelt;
  void main() {
    #ifdef RAND
    vB = aBary;
    vSlot = aSlot;
    #endif
    vWelt = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vBlick = -mv.xyz;
    vNormale = normalMatrix * normal;
    vSpiegel = vec2(aSeite, position.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uModus;
  uniform float uSpiegel;
  uniform highp sampler2D tLicht;
  uniform vec3 uFarbe;
  #ifdef RAND
  uniform highp sampler2D tDaten;
  uniform highp sampler2D tFarben;
  uniform float uLinie;
  uniform vec3 uTinte;
  varying vec2 vB;
  flat varying float vSlot;
  #endif
  varying vec3 vBlick;
  varying vec3 vNormale;
  varying vec2 vSpiegel;
  varying vec3 vWelt;
  uniform vec4 uSchnitt;

  vec3 linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }

  /** die Farbe einer Fläche (Bildschirmwerte) mit dem Grund verrechnet; a: Deckung */
  vec4 aus(vec3 farbe, float a) {
    if (uModus > 0.5) {
      // helles Solid: die reine Farbe, multipliziert mit dem Bild darunter (wo nichts deckt: mal Weiß)
      return vec4(mix(vec3(1.0), farbe, a), 1.0);
    }
    // Wachs: Hell, Dunkel und Glanz des Wachses, nachgeschlagen über die Normale im Blick (wie das Wachs selbst)
    vec3 n = normalize(vNormale);
    vec3 blick = normalize(vBlick);
    vec3 x = normalize(vec3(blick.z, 0.0, -blick.x));
    vec3 y = cross(blick, x);
    vec2 licht = texture2D(tLicht, vec2(dot(x, n), dot(y, n)) * 0.495 + 0.5).rg;
    vec3 c = linear(farbe) * licht.r + vec3(licht.g);
    return vec4(c * a, a);
  }

  #ifdef RAND
  vec4 daten(int i) { return texelFetch(tDaten, ivec2(i % ${DB}, i / ${DB}), 0); }
  vec4 farbeVon(float nr) { return nr < -0.5 ? vec4(0.0) : texelFetch(tFarben, ivec2(int(nr + 0.5), 0), 0); }
  #endif

  void main() {
    if (uSpiegel >= 0.0 && vSpiegel.x * vSpiegel.y < -uSpiegel * abs(vSpiegel.x)) discard;
    if (dot(uSchnitt.xyz, vWelt) < uSchnitt.w) discard;
    #ifdef RAND
    // Gewichte je Bildpunkt: daraus das Maß „Bildpunkte je Gewicht“ (die Umkehrung der Ableitungen)
    vec2 dx = dFdx(vB);
    vec2 dy = dFdy(vB);
    float det = dx.x * dy.y - dx.y * dy.x;
    float sinn = det < 0.0 ? -1.0 : 1.0;
    float teiler = abs(det) < 1e-20 ? 1e-20 * sinn : det;
    // die nächste Kette dieses Dreiecks: Abstand in Bildpunkten, Seite, und die Füllungen beiderseits
    int kopf = int(vSlot + 0.5);
    int nK = int(daten(kopf).x + 0.5);
    int z = kopf + 1;
    float best = 1e30;
    float bestQuer = 0.0;
    vec2 bestFarben = vec2(-1.0);
    for (int k = 0; k < nK; k++) {
      vec4 kette = daten(z);
      int nP = int(kette.x + 0.5);
      vec2 a = daten(z + 1).xy;
      for (int j = 1; j < nP; j++) {
        vec2 b = daten(z + 1 + j).xy;
        vec2 pg = vB - a;
        vec2 eg = b - a;
        // in Bildpunkte
        vec2 p = vec2(dy.y * pg.x - dy.x * pg.y, -dx.y * pg.x + dx.x * pg.y) / teiler;
        vec2 e = vec2(dy.y * eg.x - dy.x * eg.y, -dx.y * eg.x + dx.x * eg.y) / teiler;
        float l2 = max(dot(e, e), 1e-12);
        float u = clamp(dot(p, e) / l2, 0.0, 1.0);
        vec2 d = p - u * e;
        float d2 = dot(d, d);
        // (im Bild kann das Dreieck gespiegelt liegen: die Seite gilt im Maß der Gewichte)
        float quer = sinn * (e.x * p.y - e.y * p.x) / sqrt(l2);
        if (d2 < best - 1e-4 || (d2 <= best + 1e-4 && abs(quer) > abs(bestQuer))) {
          best = d2;
          bestQuer = quer;
          bestFarben = kette.yz;
        }
        a = b;
      }
      z += 1 + nP;
    }
    float d = sqrt(best);
    vec4 eigen = farbeVon(bestQuer > 0.0 ? bestFarben.x : bestFarben.y);
    vec4 fremd = farbeVon(bestQuer > 0.0 ? bestFarben.y : bestFarben.x);
    // an der Kante: einen Bildpunkt breit von der einen in die andere Füllung
    float t = clamp(0.5 + d, 0.0, 1.0);
    vec3 farbe = eigen.a + fremd.a > 0.0 ? (eigen.rgb * eigen.a * t + fremd.rgb * fremd.a * (1.0 - t)) / max(1e-6, eigen.a * t + fremd.a * (1.0 - t)) : vec3(1.0);
    float deckung = eigen.a * t + fremd.a * (1.0 - t);
    // die Farblinie selbst (nur im Paint-Modus zu sehen), uLinie Bildpunkte breit
    float linie = uLinie > 0.0 ? clamp(0.5 * uLinie + 0.5 - d, 0.0, 1.0) : 0.0;
    farbe = mix(farbe, uTinte, linie);
    deckung = deckung + (1.0 - deckung) * linie;
    if (deckung < 0.002) discard;
    gl_FragColor = aus(farbe, deckung);
    #else
    gl_FragColor = aus(uFarbe, 1.0);
    #endif
  }
`;

export type FarbWerte = {
  modus: FarbModus;
  /** Breite der Farblinie in Gerätepunkten (0: nicht gezeigt) */
  linie: number;
  /** der Schnitt an der Spiegelebene wie bei den festen Materialien (fehlt oder negativ: keiner) */
  spiegelSchnitt?: number | null;
  /** das Blatt, das sich beim Einrasten durch die Form schiebt (Welt: n · p ≥ w bleibt), wie bei den festen Materialien */
  schnitt?: [number, number, number, number] | null;
};

export class FarbAnzeige {
  private readonly szene = new Scene();
  private readonly gruppe = new Group();
  private readonly innenGeo = new BufferGeometry();
  private readonly randGeo = new BufferGeometry();
  private readonly innen: Mesh;
  private readonly rand: Mesh;
  private innenMat: ShaderMaterial[] = [];
  private readonly randMat: ShaderMaterial;
  private readonly licht: DataTexture;
  private daten: DataTexture;
  private farben: DataTexture;
  private modus: FarbModus = 'wachs';
  /** woraus die Geometrie gebaut ist */
  private stand: { netz: HautNetz; index: Uint32Array; pos: Float32Array; stufen: number; flaechen: Flaechen } | null = null;
  /** je Ecke des Rands: ihr Punkt in der Anzeige */
  private randQuelle = new Uint32Array(0);
  /** zählt, was gezeichnet wird (für Proben) */
  zahlen = { innen: 0, rand: 0, ketten: 0, punkte: 0, fuellungen: 0 };

  constructor() {
    const G = 256;
    const roh = wachsLichtBild(G);
    const halb = new Uint16Array(roh.length);
    for (let i = 0; i < roh.length; i++) halb[i] = DataUtils.toHalfFloat(roh[i]!);
    this.licht = new DataTexture(halb, G, G, RGFormat, HalfFloatType);
    this.licht.magFilter = LinearFilter;
    this.licht.minFilter = LinearFilter;
    this.licht.needsUpdate = true;
    this.daten = this.datenTextur(new Float32Array(4 * DB));
    this.farben = this.farbenTextur([]);
    this.randMat = this.material(true);
    this.innen = new Mesh(this.innenGeo, this.innenMat);
    this.rand = new Mesh(this.randGeo, this.randMat);
    this.innen.frustumCulled = false;
    this.rand.frustumCulled = false;
    this.innen.visible = false;
    this.rand.visible = false;
    this.gruppe.add(this.innen, this.rand);
    this.szene.add(this.gruppe);
  }

  private datenTextur(feld: Float32Array): DataTexture {
    const t = new DataTexture(feld, DB, feld.length / 4 / DB, RGBAFormat, FloatType);
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
    t.needsUpdate = true;
    return t;
  }

  private farbenTextur(farben: readonly Farbe[]): DataTexture {
    const n = Math.max(1, farben.length);
    const feld = new Float32Array(4 * n);
    farben.forEach((f, i) => feld.set([f[0], f[1], f[2], 1], 4 * i));
    const t = new DataTexture(feld, n, 1, RGBAFormat, FloatType);
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
    t.needsUpdate = true;
    return t;
  }

  private material(rand: boolean): ShaderMaterial {
    const m = new ShaderMaterial({
      defines: rand ? { RAND: 1 } : {},
      uniforms: {
        uModus: { value: 0 },
        uSpiegel: { value: -1 },
        uSchnitt: { value: [0, 0, 1, -1e9] },
        tLicht: { value: this.licht },
        uFarbe: { value: [1, 1, 1] },
        tDaten: { value: this.daten },
        tFarben: { value: this.farben },
        uLinie: { value: 0 },
        uTinte: { value: [0.122, 0.102, 0.09] },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthWrite: false,
      // beide Seiten in einem Durchgang: Der Umlaufsinn der Anzeige ist je Form verschieden, und was hinten liegt, verdeckt die Tiefe der Haut
      side: DoubleSide,
      forceSinglePass: true,
      // vor der Haut, auf der die Farbe liegt (dieselben Lagen, ein anderes Programm)
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    this.blenden(m, this.modus, rand);
    return m;
  }

  private blenden(m: ShaderMaterial, modus: FarbModus, rand: boolean): void {
    m.uniforms.uModus!.value = modus === 'hell' ? 1 : 0;
    if (modus === 'hell') {
      // multiplizieren: Bild darunter mal Farbe (die Deckung des Bilds bleibt)
      m.transparent = true;
      m.blending = CustomBlending;
      m.blendSrc = DstColorFactor;
      m.blendDst = ZeroFactor;
      m.blendSrcAlpha = ZeroFactor;
      m.blendDstAlpha = OneFactor;
    } else if (rand) {
      m.transparent = true;
      m.blending = CustomBlending;
      m.blendSrc = OneFactor;
      m.blendDst = OneMinusSrcAlphaFactor;
      m.blendSrcAlpha = OneFactor;
      m.blendDstAlpha = OneMinusSrcAlphaFactor;
    } else {
      m.transparent = false;
      m.blending = NoBlending;
    }
    m.needsUpdate = true;
  }

  /** ist etwas zu zeichnen? */
  get leer(): boolean {
    return !this.innen.visible && !this.rand.visible;
  }

  /** nichts mehr zeigen (keine Bemalung, oder kein Netz) */
  leeren(): void {
    this.stand = null;
    this.innen.visible = false;
    this.rand.visible = false;
    this.zahlen = { innen: 0, rand: 0, ketten: 0, punkte: 0, fuellungen: 0 };
  }

  /**
   * Die Bemalung für dieses Netz der Anzeige. `netz`: die glatte Anzeige der Haut auf der Stufe `stufen` (je Dreieck des
   * Rechennetzes 4^stufen feine, hintereinander); `flaechen`: was `flaechenRechnen` für das Rechennetz ergab; `farben`: die Farbe
   * je Füllung (Bildschirmwerte 0 … 1). Neu gebaut wird nur, wenn sich Netz, Stufe oder Flächen geändert haben; `bewegt`: Die Lagen
   * haben sich geändert (dann gehen die Ecken des Rands mit).
   */
  setzen(netz: HautNetz, stufen: number, flaechen: Flaechen, farben: readonly Farbe[], bewegt: boolean): void {
    const st = this.stand;
    const neu = !st || st.netz !== netz || st.index !== netz.index || st.pos !== netz.pos || st.stufen !== stufen || st.flaechen !== flaechen;
    if (neu) this.bauen(netz, stufen, flaechen, farben);
    else if (bewegt) this.bewegen(netz);
  }

  private bauen(netz: HautNetz, stufen: number, flaechen: Flaechen, farben: readonly Farbe[]): void {
    const je = 4 ** stufen;
    const T = netz.index.length / 3 / je;
    this.stand = { netz, index: netz.index, pos: netz.pos, stufen, flaechen };
    // ---- innen: je Füllung die feinen Dreiecke ihrer ganzen Dreiecke ----
    const zahl = new Array<number>(farben.length).fill(0);
    const ganz = flaechen.ganz;
    const Tg = Math.min(T, ganz.length);
    for (let t = 0; t < Tg; t++) if (ganz[t]! >= 0) zahl[ganz[t]!] = zahl[ganz[t]!]! + 1;
    const start: number[] = [];
    let summe = 0;
    for (const z of zahl) {
      start.push(summe);
      summe += z * je * 3;
    }
    const index = new Uint32Array(summe);
    const platz = start.slice();
    const I = netz.index;
    for (let t = 0; t < Tg; t++) {
      const f = ganz[t]!;
      if (f < 0) continue;
      index.set(I.subarray(3 * je * t, 3 * je * (t + 1)), platz[f]!);
      platz[f] = platz[f]! + 3 * je;
    }
    const g = this.innenGeo;
    g.setAttribute('position', new BufferAttribute(netz.pos, 3));
    g.setAttribute('normal', new BufferAttribute(netz.normal, 3));
    g.setAttribute('aSeite', new BufferAttribute(netz.seite, 1));
    g.setIndex(new BufferAttribute(index, 1));
    g.clearGroups();
    while (this.innenMat.length < farben.length) this.innenMat.push(this.material(false));
    farben.forEach((f, i) => {
      this.innenMat[i]!.uniforms.uFarbe!.value = [f[0], f[1], f[2]];
      if (zahl[i]! > 0) g.addGroup(start[i]!, zahl[i]! * je * 3, i);
    });
    this.innen.material = this.innenMat;
    this.innen.visible = summe > 0;
    // ---- Rand: die feinen Dreiecke der Dreiecke mit Ketten, jede Ecke mit ihren Gewichten; die Ketten in der Datentextur ----
    const R = flaechen.rand.filter((r) => r.t < T);
    const ecken = feinEcken(stufen);
    const nE = R.length * je * 3;
    const quelle = new Uint32Array(nE);
    const bary = new Float32Array(2 * nE);
    const slot = new Float32Array(nE);
    let texel = 0;
    for (const r of R) texel += 1 + r.ketten.reduce((s, c) => s + 1 + c.p.length / 2, 0);
    const feld = new Float32Array(4 * DB * Math.max(1, Math.ceil(texel / DB)));
    let z = 0;
    let ketten = 0;
    let punkte = 0;
    R.forEach((r, ri) => {
      const kopf = z;
      feld[4 * z] = r.ketten.length;
      z++;
      for (const c of r.ketten) {
        const nP = c.p.length / 2;
        feld[4 * z] = nP;
        feld[4 * z + 1] = c.links;
        feld[4 * z + 2] = c.rechts;
        z++;
        for (let j = 0; j < nP; j++) {
          feld[4 * z] = c.p[2 * j]!;
          feld[4 * z + 1] = c.p[2 * j + 1]!;
          z++;
        }
        ketten++;
        punkte += nP;
      }
      const ab = ri * je * 3;
      quelle.set(I.subarray(3 * je * r.t, 3 * je * (r.t + 1)), ab);
      bary.set(ecken, 2 * ab);
      slot.fill(kopf, ab, ab + je * 3);
    });
    this.randQuelle = quelle;
    this.daten.dispose();
    this.daten = this.datenTextur(feld);
    this.farben.dispose();
    this.farben = this.farbenTextur(farben);
    this.randMat.uniforms.tDaten!.value = this.daten;
    this.randMat.uniforms.tFarben!.value = this.farben;
    const h = this.randGeo;
    const lage = new BufferAttribute(new Float32Array(3 * nE), 3);
    const normale = new BufferAttribute(new Float32Array(3 * nE), 3);
    const seite = new BufferAttribute(new Float32Array(nE), 1);
    lage.setUsage(DynamicDrawUsage);
    normale.setUsage(DynamicDrawUsage);
    seite.setUsage(DynamicDrawUsage);
    h.setAttribute('position', lage);
    h.setAttribute('normal', normale);
    h.setAttribute('aSeite', seite);
    h.setAttribute('aBary', new BufferAttribute(bary, 2));
    h.setAttribute('aSlot', new BufferAttribute(slot, 1));
    this.rand.visible = nE > 0;
    this.zahlen = { innen: summe / 3, rand: nE / 3, ketten, punkte, fuellungen: farben.length };
    this.bewegen(netz);
  }

  /** die Lagen der Haut haben sich geändert: Innen teilt die Felder der Anzeige, die Ecken des Rands werden nachgezogen */
  private bewegen(netz: HautNetz): void {
    for (const n of ['position', 'normal', 'aSeite']) {
      const a = this.innenGeo.getAttribute(n) as BufferAttribute | undefined;
      if (a) a.needsUpdate = true;
    }
    const Q = this.randQuelle;
    if (!Q.length) return;
    const lage = this.randGeo.getAttribute('position') as BufferAttribute;
    const normale = this.randGeo.getAttribute('normal') as BufferAttribute;
    const seite = this.randGeo.getAttribute('aSeite') as BufferAttribute;
    const L = lage.array as Float32Array;
    const N = normale.array as Float32Array;
    const S = seite.array as Float32Array;
    const P = netz.pos;
    const NN = netz.normal;
    const SS = netz.seite;
    for (let i = 0; i < Q.length; i++) {
      const v = Q[i]!;
      L[3 * i] = P[3 * v]!;
      L[3 * i + 1] = P[3 * v + 1]!;
      L[3 * i + 2] = P[3 * v + 2]!;
      N[3 * i] = NN[3 * v]!;
      N[3 * i + 1] = NN[3 * v + 1]!;
      N[3 * i + 2] = NN[3 * v + 2]!;
      S[i] = SS[v]!;
    }
    lage.needsUpdate = true;
    normale.needsUpdate = true;
    seite.needsUpdate = true;
  }

  private tiefe: { szene: Scene; geo: BufferGeometry; netz: HautNetz | null; index: Uint32Array | null; pos: Float32Array | null } | null = null;
  /**
   * Die Tiefe der Haut in das gebundene Ziel schreiben, ohne Farbe (für eine Zeichenfläche, deren Tiefe nicht von Ozzys Kamera
   * stammt: die des hellen Solids). `netz`: alles, was verdeckt (alle Objekte); `bewegt`: Die Lagen haben sich geändert.
   */
  tiefeSchreiben(renderer: WebGLRenderer, kamera: Camera, netz: HautNetz, bewegt: boolean): void {
    if (!this.tiefe) {
      const geo = new BufferGeometry();
      const mat = new ShaderMaterial({
        vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
        colorWrite: false,
        side: DoubleSide,
      });
      const netzKoerper = new Mesh(geo, mat);
      netzKoerper.frustumCulled = false;
      const szene = new Scene();
      szene.add(netzKoerper);
      this.tiefe = { szene, geo, netz: null, index: null, pos: null };
    }
    const T = this.tiefe;
    if (T.netz !== netz || T.index !== netz.index || T.pos !== netz.pos) {
      T.geo.setAttribute('position', new BufferAttribute(netz.pos, 3));
      T.geo.setIndex(new BufferAttribute(netz.index, 1));
      T.netz = netz;
      T.index = netz.index;
      T.pos = netz.pos;
    } else if (bewegt) (T.geo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(T.szene, kamera);
    renderer.autoClear = auto;
  }

  /**
   * Über das zeichnen, was im gebundenen Ziel steht (die Haut mit ihrem Grund und ihrer Tiefe). `wicklung`: Umlaufsinn der Dreiecke
   * der Anzeige von außen gesehen (1 gegen den Uhrzeiger), wie bei den festen Materialien.
   */
  zeichnen(renderer: WebGLRenderer, kamera: Camera, w: FarbWerte): void {
    if (this.leer) return;
    if (w.modus !== this.modus) {
      this.modus = w.modus;
      this.blenden(this.randMat, w.modus, true);
      for (const m of this.innenMat) this.blenden(m, w.modus, false);
    }
    const sn = w.schnitt && Math.hypot(w.schnitt[0], w.schnitt[1], w.schnitt[2]) > 1e-9 ? w.schnitt : [0, 0, 1, -1e9];
    for (const m of [this.randMat, ...this.innenMat]) {
      m.uniforms.uSchnitt!.value = sn;
      m.uniforms.uSpiegel!.value = w.spiegelSchnitt ?? -1;
      m.uniforms.uModus!.value = w.modus === 'hell' ? 1 : 0;
    }
    this.randMat.uniforms.uLinie!.value = w.linie;
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(this.szene, kamera);
    renderer.autoClear = auto;
  }
}
