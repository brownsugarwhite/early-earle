/**
 * Materialien der Haut neben der Seifenhaut (Florian, 18.11.2026: „Bitte die Materialien und Shader exakt wie wir sie erarbeitet haben
 * und keine eigene Version“). Nichts hier ist neu erfunden; jedes Material ist aus seiner Quelle übernommen:
 *
 * - **Solid:** das Material des Prüffensters `kurven.html` (Fenster von Sitzung 4, Port 5197): `hautMaterial`, `umrissMaterial` und das
 *   Licht aus `src/form/kurven.ts`, Zeile für Zeile (vier Stufen an denselben Schwellen, die Grenze einen Bildpunkt breit geglättet;
 *   Umriss 2,5 Bildpunkte aus den Rückseiten; Sonne und Himmelslicht). Weggelassen ist nur der Schnitt an der Spiegelebene: Das
 *   Prüffenster zeigt zwei Hälften, die es dort abschneidet; Ozzy zeigt eine geschlossene Haut. Mit dem Schnitt blieb längs der
 *   Mitte ein feiner Streifen frei, durch den der Umriss schien (Florian, 18.11.: „beim solid ist immer diese mittellinie auch bei
 *   smoothen flächen“).
 * - **Zebra:** die Zebra-Matcap des alten Editors (`src/three/matcap.ts`, `zebraMatcap`), dort als Matcap auf dem Körper
 *   (`Renderer3D.ts`): waagerechte Streifen über der Blicknormalen.
 *
 * Gezeichnet wird in ein eigenes Ziel mit Kantenglättung und von dort über den Grund der Seifenhaut gelegt (Papier, dunkle Rückseite:
 * `Haut.zeichnen` mit `leer`). Die Haut ist die glatte Anzeige des Werks (`werkHaut.netz`), wie für die Seifenhaut.
 */
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  type Camera,
  Color,
  CustomBlending,
  DataTexture,
  DirectionalLight,
  HemisphereLight,
  LinearFilter,
  type Material,
  Mesh,
  MeshMatcapMaterial,
  MeshToonMaterial,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  Plane,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import type { HautNetz } from '../anfang/haut';

/** die Materialien neben der Seifenhaut (die Seifenhaut selbst mit ihren Fassungen zeichnet `Haut`) */
export const FESTE_MATERIALIEN = ['Solid', 'Zebra'] as const;
export type FestesMaterial = (typeof FESTE_MATERIALIEN)[number];

// ---------- Solid: aus `src/form/kurven.ts` ----------

const KOERPER = 0xe2b98e;
const TINTE = 0x1f1a17;
/** `hautMaterial` des Prüffensters (glatte Anzeige), ohne den Schnitt an der Spiegelebene */
function hautMaterial(farbe: number): MeshToonMaterial {
  const m = new MeshToonMaterial({ color: farbe });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <gradientmap_pars_fragment>',
      /* glsl */ `
        vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
          float x = dot( normal, lightDirection ) * 0.5 + 0.5;
          float w = max( fwidth( x ), 1e-5 ) * 0.85;
          float g = mix( 70.0 / 255.0, 135.0 / 255.0, smoothstep( 0.25 - w, 0.25 + w, x ) );
          g = mix( g, 200.0 / 255.0, smoothstep( 0.5 - w, 0.5 + w, x ) );
          g = mix( g, 1.0, smoothstep( 0.75 - w, 0.75 + w, x ) );
          return vec3( g );
        }`,
    );
  };
  m.customProgramCacheKey = () => 'ozzy-haut-glatt';
  return m;
}

/** `umrissMaterial` des Prüffensters, ohne den Schnitt an der Spiegelebene */
function umrissMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uBreite: { value: 2.5 }, uAufloesung: { value: new Vector2(1, 1) }, uFarbe: { value: new Color(TINTE) } },
    vertexShader: /* glsl */ `
    uniform float uBreite;
    uniform vec2 uAufloesung;
    #include <clipping_planes_pars_vertex>
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vec4 clip = projectionMatrix * mvPosition;
      vec3 n = normalize(normalMatrix * normal);
      vec2 richtung = (projectionMatrix * vec4(n, 0.0)).xy;
      float l = length(richtung);
      richtung = l > 1e-9 ? richtung / l : vec2(0.0);
      float kipp = clamp(length(n.xy) / 0.35, 0.0, 1.0);
      clip.xy += richtung * kipp * uBreite * 2.0 / uAufloesung * clip.w;
      gl_Position = clip;
      #include <clipping_planes_vertex>
    }
  `,
    fragmentShader: /* glsl */ `
    uniform vec3 uFarbe;
    #include <clipping_planes_pars_fragment>
    void main() {
      #include <clipping_planes_fragment>
      gl_FragColor = vec4(uFarbe, 1.0);
    }
  `,
    side: BackSide,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
    clipping: true,
  });
}

// ---------- Zebra: aus `src/three/matcap.ts` ----------

/**
 * Zebra-Matcap (Prüfwerkzeug aus der Recherche 12.10.): waagerechte Streifen über der Blicknormalen. Auf dem Körper zeigen sie, wie
 * Flächen ineinander übergehen: Streifen springen an einem Knick, knicken an einer weichen Kante und fließen über glatte Flächen
 * (wie die Zebra-Kontrolle im Autodesign).
 */
function zebraMatcap(groesse = 256, streifen = 9): DataTexture {
  const daten = new Uint8Array(groesse * groesse * 4);
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      const ny = ((y + 0.5) / groesse) * 2 - 1;
      // weiche Streifenkante (Kantenglättung), etwas Grundhelligkeit nach der Blender-Matcap
      const s = Math.sin(Math.PI * streifen * ny);
      const t = Math.min(1, Math.max(0, 0.5 + 2.5 * s));
      const g = 28 + t * 214;
      const o = (y * groesse + x) * 4;
      daten[o] = Math.round(g);
      daten[o + 1] = Math.round(g);
      daten[o + 2] = Math.round(Math.min(255, g + 4));
      daten[o + 3] = 255;
    }
  }
  const t = new DataTexture(daten, groesse, groesse, RGBAFormat);
  t.colorSpace = SRGBColorSpace;
  t.magFilter = LinearFilter;
  t.minFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

// ---------- das Zeichnen ----------

export type FesteWerte = {
  /** das Blatt, das sich beim Einrasten durch die Form schiebt (Welt: n · p ≥ w bleibt), wie `HautWerte.schnitt` */
  schnitt: [number, number, number, number] | null;
  /** wie deckend (Röntgen nimmt zurück), 0 … 1 */
  deckung: number;
};

export class FesteHaut {
  private readonly renderer: WebGLRenderer;
  private ziel: WebGLRenderTarget;
  private readonly szene = new Scene();
  private readonly geo = new BufferGeometry();
  private readonly koerper: Mesh;
  private readonly umriss: Mesh;
  private readonly solid: MeshToonMaterial;
  private readonly umrissMat: ShaderMaterial;
  private readonly zebra: MeshMatcapMaterial;
  private readonly licht: (DirectionalLight | HemisphereLight)[];
  private readonly ebene = new Plane(new Vector3(0, 0, 1), 0);
  private readonly ende: { szene: Scene; kamera: OrthographicCamera; material: ShaderMaterial };
  private readonly merkFarbe = new Color();
  private netz: HautNetz | null = null;
  private wicklung = 0;
  private dpr = 1;

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
    this.ziel = new WebGLRenderTarget(4, 4, { samples: 4, depthBuffer: true });
    this.solid = hautMaterial(KOERPER);
    this.umrissMat = umrissMaterial();
    this.zebra = new MeshMatcapMaterial({ matcap: zebraMatcap() });
    this.koerper = new Mesh(this.geo, this.solid);
    this.umriss = new Mesh(this.geo, this.umrissMat);
    this.koerper.frustumCulled = false;
    this.umriss.frustumCulled = false;
    // das Licht des Prüffensters
    const sonne = new DirectionalLight(0xffffff, 2.4);
    sonne.position.set(0.9, 1.4, 1.1);
    this.licht = [sonne, new HemisphereLight(0xfff6e8, 0x9c8a74, 1.1)];
    this.szene.add(this.koerper, this.umriss, ...this.licht);
    for (const m of [this.solid, this.umrissMat, this.zebra] as Material[]) m.clippingPlanes = [this.ebene];
    // das Ziel über den Grund legen: Farben wie beim Zeichnen ins Fenster (sRGB), Kanten mit ihrer Deckung
    const material = new ShaderMaterial({
      uniforms: { tBild: { value: this.ziel.texture }, uDeckung: { value: 1 } },
      vertexShader: 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: /* glsl */ `
        uniform sampler2D tBild;
        uniform float uDeckung;
        varying vec2 vUv;
        vec3 sRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
        void main() {
          vec4 c = texture2D(tBild, vUv);
          vec3 rgb = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
          float a = c.a * uDeckung;
          gl_FragColor = vec4(sRGB(rgb) * a, a);
        }
      `,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneMinusSrcAlphaFactor,
    });
    const szene = new Scene();
    const q = new Mesh(new PlaneGeometry(2, 2), material);
    q.frustumCulled = false;
    szene.add(q);
    this.ende = { szene, kamera: new OrthographicCamera(-1, 1, 1, -1, 0, 1), material };
  }

  groesse(b: number, h: number, dpr: number): void {
    this.dpr = dpr;
    const B = Math.max(4, Math.round(b * dpr));
    const H = Math.max(4, Math.round(h * dpr));
    if (this.ziel.width !== B || this.ziel.height !== H) this.ziel.setSize(B, H);
    (this.umrissMat.uniforms.uAufloesung!.value as Vector2).set(B, H);
    this.umrissMat.uniforms.uBreite!.value = 2.5 * dpr;
  }

  /**
   * Die glatte Anzeige des Werks (dieselben Felder wie für die Seifenhaut). `wicklung`: Umlaufsinn ihrer Dreiecke von außen gesehen
   * (1 gegen den Uhrzeiger).
   */
  netzSetzen(netz: HautNetz | null, wicklung: number): void {
    if (!netz) {
      this.netz = null;
      return;
    }
    if (netz !== this.netz || wicklung !== this.wicklung || this.geo.getAttribute('position')?.array !== netz.pos || this.geo.index?.count !== netz.index.length) {
      this.netz = netz;
      this.wicklung = wicklung;
      this.geo.setAttribute('position', new BufferAttribute(netz.pos, 3));
      this.geo.setAttribute('normal', new BufferAttribute(netz.normal, 3));
      // Vorderseiten gegen den Uhrzeiger (so erwartet es three)
      let index = netz.index;
      if (wicklung < 0) {
        index = new Uint32Array(netz.index.length);
        for (let i = 0; i < index.length; i += 3) {
          index[i] = netz.index[i]!;
          index[i + 1] = netz.index[i + 2]!;
          index[i + 2] = netz.index[i + 1]!;
        }
      }
      this.geo.setIndex(new BufferAttribute(index, 1));
    } else for (const n of ['position', 'normal']) (this.geo.getAttribute(n) as BufferAttribute).needsUpdate = true;
  }

  /** ist eine Haut da, die gezeichnet werden kann? */
  get bereit(): boolean {
    return this.netz !== null;
  }

  /** Die Haut mit dem Material über das legen, was schon im Fenster steht (der Grund) */
  zeichnen(kamera: Camera, art: FestesMaterial, w: FesteWerte): void {
    if (!this.netz) return;
    const r = this.renderer;
    const sn = w.schnitt;
    // n · p ≥ w bleibt (ohne Schnitt: alles)
    if (sn && Math.hypot(sn[0], sn[1], sn[2]) > 1e-9) this.ebene.set(new Vector3(sn[0], sn[1], sn[2]), -sn[3]);
    else this.ebene.set(new Vector3(0, 0, 1), 1e9);
    this.koerper.material = art === 'Zebra' ? this.zebra : this.solid;
    // der Umriss gehört zum Solid des Prüffensters; die Zebra-Matcap lag im alten Editor ohne Umriss auf dem Körper
    this.umriss.visible = art === 'Solid';
    for (const l of this.licht) l.visible = art === 'Solid';
    const lokal = r.localClippingEnabled;
    const auto = r.autoClear;
    const farbe = r.getClearColor(this.merkFarbe);
    const alpha = r.getClearAlpha();
    r.localClippingEnabled = true;
    r.autoClear = false;
    r.setRenderTarget(this.ziel);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(this.szene, kamera);
    r.setRenderTarget(null);
    this.ende.material.uniforms.tBild!.value = this.ziel.texture;
    this.ende.material.uniforms.uDeckung!.value = Math.max(0, Math.min(1, w.deckung));
    r.render(this.ende.szene, this.ende.kamera);
    r.setClearColor(farbe, alpha);
    r.localClippingEnabled = lokal;
    r.autoClear = auto;
  }
}
