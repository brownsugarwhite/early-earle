/**
 * Der Renderer aller Shader in Ozzy (20.11.2026, Plan `docs/plans/2026-11-20-ozzy-shader.md`).
 *
 * `ShaderKern` hält die Haut des Werks (dieselbe glatte Anzeige wie Solid und Wachs: Lagen, Normalen, Seite für den Spiegelschnitt),
 * die Ziele der Durchgänge (Größe folgt dem Fenster) und die Werte, die alle Shader teilen (Zeit, Auflösung, Schnitte, Licht, Kamera).
 * Ein Shader (`Voreinstellung`, Dateien unter `voreinstellungen/`) zeichnet mit zwei Werkzeugen: `netz` (die Haut mit einem
 * Material in ein Ziel) und `flaeche` (ein Bild über das ganze Ziel). Am Ende gibt er ein Bild zurück, fertig für den Bildschirm
 * (sRGB, mit vormultiplizierter Deckung); der Kern legt es über das, was schon im Fenster steht (Ozzys Grund).
 *
 * Alle Programme sind `RawShaderMaterial` mit GLSL ES 3.0: Was ein Shader liest, deklariert er selbst (Bausteine in `glsl.ts`).
 */
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  type Camera,
  Color,
  CustomBlending,
  DoubleSide,
  FloatType,
  FrontSide,
  GLSL3,
  HalfFloatType,
  type IUniform,
  LinearFilter,
  type Material,
  Matrix4,
  Mesh,
  NearestFilter,
  NoBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  RawShaderMaterial,
  RepeatWrapping,
  Scene,
  type Side,
  type Texture,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type WebGLRenderer,
  type Blending,
} from 'three';
import type { HautNetz } from '../../anfang/haut';
import { FLAECHE_KOPF, FLAECHE_VERTEX, NETZ_VERTEX } from './glsl';

export type ZielArt = 'half' | 'byte' | 'float';
export type ZielWunsch = {
  /** Anteil der Fenstergröße (1 = Gerätepunkte), oder feste Größe über `breite`/`hoehe` */
  skala?: number;
  breite?: number;
  hoehe?: number;
  art?: ZielArt;
  /** Tiefenpuffer (für Durchgänge über die Haut) */
  tiefe?: boolean;
  /** Kantenglättung (nur für Durchgänge, die danach gelesen werden) */
  proben?: number;
  /** mehrere Farbausgänge */
  anzahl?: number;
  filter?: 'linear' | 'nearest';
  wiederholen?: boolean;
};

/** Werte, die jedes Bild von Ozzy bekommt */
export type ShaderWerte = {
  /** Sekunden seit der Wahl des Shaders */
  zeit: number;
  /** Sekunden seit dem letzten Bild (höchstens 0,1) */
  dt: number;
  /** wie deckend (Röntgen, Einrasten), 0 … 1 */
  deckung: number;
  /** Bühne an (der Shader darf seinen eigenen Grund zeichnen) */
  buehne: boolean;
  /** Regler des Shaders (Schlüssel aus seiner Liste) */
  regler: Record<string, number>;
};

/** Ein Shader: zeichnet je Bild und gibt sein fertiges Bild zurück (oder null: nichts zu zeigen) */
export interface ShaderLauf {
  bild(k: ShaderKern, w: ShaderWerte): Texture | null;
  /** braucht er das nächste Bild auch, wenn sich nichts ändert (Bewegung, Simulation)? */
  unruhig(w: ShaderWerte): boolean;
  /** Zahlen für Proben (Punkte, Zeiten) */
  info?(): Record<string, number>;
  freigeben(): void;
}

export type ReglerZeile = { k: string; name: string; min: number; max: number; schritt: number; grund: number };

export interface Voreinstellung {
  id: string;
  name: string;
  gruppe: 'Spider-Verse' | 'Frei';
  /** eine Zeile für die Wahl: woher, was passiert */
  zeile: string;
  regler: ReglerZeile[];
  bauen(k: ShaderKern): ShaderLauf;
}

/** Uniforms, die alle Programme teilen (dieselben Objekte, im Kern je Bild gesetzt) */
export type Gemeinsam = {
  uZeit: IUniform<number>;
  uAufl: IUniform<Vector2>;
  uDpr: IUniform<number>;
  uSpiegel: IUniform<number>;
  uSchnitt: IUniform<Vector4>;
  uFlach: IUniform<number>;
  uMitte: IUniform<Vector3>;
  uRadius: IUniform<number>;
  /** Licht aus der Sicht (oben links vorn), in Welt und in Sicht */
  uLichtWelt: IUniform<Vector3>;
  uLichtSicht: IUniform<Vector3>;
  uProj: IUniform<Matrix4>;
  uProjInv: IUniform<Matrix4>;
  uView: IUniform<Matrix4>;
  uViewInv: IUniform<Matrix4>;
  uKamPos: IUniform<Vector3>;
  uOrtho: IUniform<number>;
  uBuehne: IUniform<number>;
  /** Bildpunkte (CSS) je Welteinheit in der Ebene durch die Mitte der Form */
  uMass: IUniform<number>;
};

export class ShaderKern {
  readonly r: WebGLRenderer;
  readonly geo = new BufferGeometry();
  readonly u: Gemeinsam;
  /** Breite und Höhe in Gerätepunkten, Pixeldichte */
  b = 4;
  h = 4;
  dpr = 1;
  /** Halbfloat-Ziele gehen (sonst 8 Bit) */
  readonly fein: boolean;
  /** die Kamera dieses Bilds */
  kamera: Camera = new OrthographicCamera();
  /** Kamera des Bilds davor (Bewegung im Bild) */
  readonly vorherViewProj = new Matrix4();
  readonly jetztViewProj = new Matrix4();
  /** zählt die Bilder seit dem Start des Shaders */
  bildNr = 0;
  /** Stand des Netzes: zählt hoch, wenn sich die Haut ändert */
  netzStand = 0;
  /** das Netz selbst (für Shader, die Punkte auf der Haut brauchen) */
  netzDaten: HautNetz | null = null;
  private wicklung = 0;
  private readonly netzSzene = new Scene();
  private readonly netzMesh: Mesh;
  private readonly flaecheSzene = new Scene();
  private readonly flaecheMesh: Mesh;
  private readonly flaecheKamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly ziele = new Map<string, WebGLRenderTarget>();
  private readonly wuensche = new Map<string, ZielWunsch>();
  private readonly ende: RawShaderMaterial;
  private readonly merkFarbe = new Color();
  private readonly loeschFarbe = new Color();

  constructor(renderer: WebGLRenderer) {
    this.r = renderer;
    this.fein = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    this.u = {
      uZeit: { value: 0 },
      uAufl: { value: new Vector2(4, 4) },
      uDpr: { value: 1 },
      uSpiegel: { value: -1 },
      uSchnitt: { value: new Vector4(0, 0, 1, -1e9) },
      uFlach: { value: 0 },
      uMitte: { value: new Vector3() },
      uRadius: { value: 100 },
      uLichtWelt: { value: new Vector3(0, 1, 0) },
      uLichtSicht: { value: new Vector3(-0.45, 0.62, 0.64).normalize() },
      uProj: { value: new Matrix4() },
      uProjInv: { value: new Matrix4() },
      uView: { value: new Matrix4() },
      uViewInv: { value: new Matrix4() },
      uKamPos: { value: new Vector3() },
      uOrtho: { value: 0 },
      uBuehne: { value: 1 },
      uMass: { value: 1 },
    };
    this.netzMesh = new Mesh(this.geo);
    this.netzMesh.frustumCulled = false;
    this.netzSzene.add(this.netzMesh);
    const dreieck = new BufferGeometry();
    dreieck.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.flaecheMesh = new Mesh(dreieck);
    this.flaecheMesh.frustumCulled = false;
    this.flaecheSzene.add(this.flaecheMesh);
    this.ende = new RawShaderMaterial({
      glslVersion: GLSL3,
      uniforms: { tBild: { value: null }, uDeckung: { value: 1 } },
      vertexShader: FLAECHE_VERTEX,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform sampler2D tBild;
        uniform float uDeckung;
        in vec2 vUv;
        out vec4 farbe;
        void main() { farbe = texture(tBild, vUv) * uDeckung; }
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
  }

  // ---------- Netz ----------

  /** die glatte Anzeige des Werks; `wicklung`: Umlaufsinn von außen (1 gegen den Uhrzeiger) */
  netzSetzen(netz: HautNetz | null, wicklung: number): void {
    if (!netz) {
      this.netzDaten = null;
      return;
    }
    const neu = netz !== this.netzDaten || wicklung !== this.wicklung || this.geo.getAttribute('position')?.array !== netz.pos || this.geo.index?.count !== netz.index.length;
    if (neu) {
      this.netzDaten = netz;
      this.wicklung = wicklung;
      this.geo.setAttribute('position', new BufferAttribute(netz.pos, 3));
      this.geo.setAttribute('normal', new BufferAttribute(netz.normal, 3));
      this.geo.setAttribute('aSeite', new BufferAttribute(netz.seite, 1));
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
    } else for (const n of ['position', 'normal', 'aSeite']) (this.geo.getAttribute(n) as BufferAttribute).needsUpdate = true;
    this.netzStand++;
    // Mitte und Radius der Form (Muster rechnen im Maß der Form)
    const p = netz.pos;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i]!, y = p[i + 1]!, z = p[i + 2]!;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
    if (Number.isFinite(x0)) {
      this.u.uMitte.value.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      this.u.uRadius.value = Math.max(1e-3, 0.5 * Math.hypot(x1 - x0, y1 - y0, z1 - z0));
    }
  }

  get bereit(): boolean {
    return this.netzDaten !== null;
  }

  // ---------- Größe und Ziele ----------

  groesse(b: number, h: number, dpr: number): void {
    this.dpr = dpr;
    this.b = Math.max(4, Math.round(b * dpr));
    this.h = Math.max(4, Math.round(h * dpr));
    this.u.uAufl.value.set(this.b, this.h);
    this.u.uDpr.value = dpr;
    for (const [name, z] of this.ziele) {
      const w = this.wuensche.get(name)!;
      const [B, H] = this.zielGroesse(w);
      if (z.width !== B || z.height !== H) z.setSize(B, H);
    }
  }

  private zielGroesse(w: ZielWunsch): [number, number] {
    if (w.breite && w.hoehe) return [w.breite, w.hoehe];
    const s = w.skala ?? 1;
    return [Math.max(2, Math.round(this.b * s)), Math.max(2, Math.round(this.h * s))];
  }

  /** ein Ziel (wird beim ersten Mal angelegt, folgt danach der Fenstergröße) */
  ziel(name: string, w: ZielWunsch = {}): WebGLRenderTarget {
    let z = this.ziele.get(name);
    if (z) return z;
    const [B, H] = this.zielGroesse(w);
    const art = w.art ?? 'half';
    const type = art === 'byte' || !this.fein ? UnsignedByteType : art === 'float' ? FloatType : HalfFloatType;
    const filter = w.filter === 'nearest' ? NearestFilter : LinearFilter;
    z = new WebGLRenderTarget(B, H, {
      type,
      depthBuffer: !!w.tiefe,
      samples: w.proben ?? 0,
      count: w.anzahl ?? 1,
      minFilter: filter,
      magFilter: filter,
      generateMipmaps: false,
    });
    if (w.wiederholen) for (const t of z.textures) t.wrapS = t.wrapT = RepeatWrapping;
    this.ziele.set(name, z);
    this.wuensche.set(name, w);
    return z;
  }

  /** zwei Ziele zum Hin- und Herrechnen (Simulation): `lesen` ist der Stand, `schreiben` der nächste */
  paar(name: string, w: ZielWunsch = {}): { lesen: WebGLRenderTarget; schreiben: WebGLRenderTarget; tauschen(): void } {
    const a = this.ziel(`${name}#a`, w);
    const b = this.ziel(`${name}#b`, w);
    const kern = this as unknown as { paare?: Map<string, { lesen: WebGLRenderTarget; schreiben: WebGLRenderTarget; tauschen(): void }> };
    kern.paare ??= new Map();
    let p = kern.paare.get(name);
    if (!p) {
      const q = { lesen: a, schreiben: b, tauschen(): void {
        const t = q.lesen;
        q.lesen = q.schreiben;
        q.schreiben = t;
      } };
      p = q;
      kern.paare.set(name, p);
    }
    return p;
  }

  /** alle Ziele freigeben, deren Name mit `vorsilbe` beginnt (ein Shader räumt beim Wechsel auf) */
  zieleFreigeben(vorsilbe: string): void {
    for (const [name, z] of [...this.ziele]) {
      if (!name.startsWith(vorsilbe)) continue;
      z.dispose();
      this.ziele.delete(name);
      this.wuensche.delete(name);
    }
    const kern = this as unknown as { paare?: Map<string, unknown> };
    if (kern.paare) for (const n of [...kern.paare.keys()]) if (n.startsWith(vorsilbe)) kern.paare.delete(n);
  }

  // ---------- Programme ----------

  /** ein Programm über die Haut (Vertex aus `NETZ_VERTEX`); die gemeinsamen Werte sind schon darin */
  netzProgramm(fragment: string, o: { uniforms?: Record<string, IUniform>; seite?: Side; blending?: Blending; transparent?: boolean; tiefeSchreiben?: boolean; tiefeTesten?: boolean; vertex?: string } = {}): RawShaderMaterial {
    return new RawShaderMaterial({
      glslVersion: GLSL3,
      uniforms: { ...this.u, ...(o.uniforms ?? {}) },
      vertexShader: o.vertex ?? NETZ_VERTEX,
      fragmentShader: fragment,
      side: o.seite ?? FrontSide,
      blending: o.blending ?? NoBlending,
      transparent: o.transparent ?? false,
      depthWrite: o.tiefeSchreiben ?? true,
      depthTest: o.tiefeTesten ?? true,
    });
  }

  /** ein Programm über die ganze Fläche (`FLAECHE_KOPF` wird vorangestellt) */
  flaecheProgramm(fragment: string, uniforms: Record<string, IUniform> = {}, o: { blending?: Blending; transparent?: boolean } = {}): RawShaderMaterial {
    return new RawShaderMaterial({
      glslVersion: GLSL3,
      uniforms: { ...this.u, ...uniforms },
      vertexShader: FLAECHE_VERTEX,
      fragmentShader: FLAECHE_KOPF + fragment,
      depthTest: false,
      depthWrite: false,
      blending: o.blending ?? NoBlending,
      transparent: o.transparent ?? false,
    });
  }

  // ---------- Zeichnen ----------

  /** die Haut mit `material` in `ziel` (null: ins Fenster); `loeschen`: Farbe und Tiefe vorher leeren */
  netz(material: Material, ziel: WebGLRenderTarget | null, loeschen: [number, number, number, number] | null = [0, 0, 0, 0], kamera: Camera = this.kamera): void {
    const r = this.r;
    r.setRenderTarget(ziel);
    if (loeschen) {
      r.setClearColor(this.loeschFarbe.setRGB(loeschen[0], loeschen[1], loeschen[2]), loeschen[3]);
      r.clear(true, true, false);
    }
    this.netzMesh.material = material;
    r.render(this.netzSzene, kamera);
  }

  /** ein Bild über die ganze Fläche von `ziel` */
  flaeche(material: Material, ziel: WebGLRenderTarget | null, loeschen: [number, number, number, number] | null = null): void {
    const r = this.r;
    r.setRenderTarget(ziel);
    if (loeschen) {
      r.setClearColor(this.loeschFarbe.setRGB(loeschen[0], loeschen[1], loeschen[2]), loeschen[3]);
      r.clear(true, false, false);
    }
    this.flaecheMesh.material = material;
    r.render(this.flaecheSzene, this.flaecheKamera);
  }

  /** eine fremde Szene (Teilchen, Linien) in ein Ziel */
  szene(szene: Scene, kamera: Camera, ziel: WebGLRenderTarget | null, loeschen: [number, number, number, number] | null = null): void {
    const r = this.r;
    r.setRenderTarget(ziel);
    if (loeschen) {
      r.setClearColor(this.loeschFarbe.setRGB(loeschen[0], loeschen[1], loeschen[2]), loeschen[3]);
      r.clear(true, true, false);
    }
    r.render(szene, kamera);
  }

  /** Kamera und gemeinsame Werte für dieses Bild */
  bildBeginnen(kamera: Camera, w: { zeit: number; schnitt: [number, number, number, number] | null; spiegelSchnitt: number | null; flach: boolean; buehne: boolean; mass: number }): void {
    this.kamera = kamera;
    kamera.updateMatrixWorld();
    const u = this.u;
    u.uZeit.value = w.zeit;
    u.uSpiegel.value = w.spiegelSchnitt ?? -1;
    const sn = w.schnitt;
    if (sn && Math.hypot(sn[0], sn[1], sn[2]) > 1e-9) u.uSchnitt.value.set(sn[0], sn[1], sn[2], sn[3]);
    else u.uSchnitt.value.set(0, 0, 1, -1e12);
    u.uFlach.value = w.flach ? 1 : 0;
    u.uBuehne.value = w.buehne ? 1 : 0;
    u.uMass.value = w.mass;
    const k = kamera as Camera & { isOrthographicCamera?: boolean };
    u.uProj.value.copy(kamera.projectionMatrix);
    u.uProjInv.value.copy(kamera.projectionMatrixInverse);
    u.uView.value.copy(kamera.matrixWorldInverse);
    u.uViewInv.value.copy(kamera.matrixWorld);
    u.uKamPos.value.setFromMatrixPosition(kamera.matrixWorld);
    u.uOrtho.value = k.isOrthographicCamera ? 1 : 0;
    // das Licht hängt an der Sicht (oben links vorn): Jede Ansicht ist beleuchtet wie eine Illustration
    u.uLichtWelt.value.copy(u.uLichtSicht.value).transformDirection(kamera.matrixWorld);
    this.vorherViewProj.copy(this.jetztViewProj);
    this.jetztViewProj.multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    if (this.bildNr === 0) this.vorherViewProj.copy(this.jetztViewProj);
    this.bildNr++;
  }

  /** das fertige Bild über das legen, was im Fenster steht */
  auflegen(bild: Texture, deckung: number): void {
    this.ende.uniforms.tBild!.value = bild;
    this.ende.uniforms.uDeckung!.value = Math.max(0, Math.min(1, deckung));
    this.flaeche(this.ende, null);
  }

  /** Zustand des Renderers merken und für die Shader stellen; `zurueck` gibt ihn zurück */
  zustandMerken(): () => void {
    const r = this.r;
    const auto = r.autoClear;
    const farbe = r.getClearColor(this.merkFarbe).clone();
    const alpha = r.getClearAlpha();
    const ziel = r.getRenderTarget();
    r.autoClear = false;
    return () => {
      r.setRenderTarget(ziel);
      r.setClearColor(farbe, alpha);
      r.autoClear = auto;
    };
  }

  freigeben(): void {
    for (const z of this.ziele.values()) z.dispose();
    this.ziele.clear();
    this.wuensche.clear();
    this.geo.dispose();
    this.ende.dispose();
  }
}

export { BackSide, DoubleSide, FrontSide };
