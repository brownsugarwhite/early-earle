// 3D-Viewport „creation“: ein Vollfenster-Canvas, gerendert wird nur ins Creation-Rechteck (Scissor).
// So muss der Canvas während der Layout-Animationen nie seine Größe ändern. Gerendert wird nur bei Bedarf.
//
// Look: Matcap (Licht an der Ansicht, wie Blender-Solid), Kachel als 10-%-Fläche, harter Schatten von
// einem eigenen Sonnenlicht (wirkt nur auf den Schatten, die Matcap ignoriert Licht).

import { STIL_STANDARD, applyFeuerArt, applyMuster, applyStil, applyZonen, atlasTextur, createCreatureMaterial, createCreatureUniforms, createFeuerMaterial, createFeuerUniforms, createToothMaterial, installTslFunctionCacheFix, type CreatureMaterialUniforms, type FeuerArt, type FeuerUniforms } from '@ee/render';
import type { LoftNetz } from '@ee/shape';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  LineBasicNodeMaterial,
  LineSegments,
  FrontSide,
  Mesh,
  MeshBasicNodeMaterial,
  MeshMatcapNodeMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowNodeMaterial,
  Vector3,
  Vector4,
  WebGPURenderer,
  DataTexture,
} from 'three/webgpu';
import { type AtlasDaten, type Auge, type Gesicht, PALETTEN, type Palette } from './wesenLook';
import type { Kamera } from '../state/uiStore';
import type { Rect } from '../types';
import { kameraPosition } from './kamera';
import { blenderMatcap, zebraMatcap } from './matcap';

export const FOV = 30;

/** Sonne für den Schatten: von hinten (+X), 42° hoch; aus dem Schattenwurf der Vorlage zurückgerechnet. */
const SONNE = (() => {
  const h = [0.983, 0, 0.177];
  const el = (42 * Math.PI) / 180;
  return [h[0]! * Math.cos(el), Math.sin(el), h[2]! * Math.cos(el)] as const;
})();

export class Renderer3D {
  readonly renderer: WebGPURenderer;
  private readonly szene = new Scene();
  private readonly kamera = new PerspectiveCamera(FOV, 1, 0.02, 100);
  private readonly koerper: Mesh;
  private geometrie = new BufferGeometry();
  private rect: Rect | null = null;
  private linien: LineSegments | null = null;
  private kameraZustand: Kamera | null = null;
  private angefordert = false;
  private bereit = false;
  private readonly matcaps = { normal: blenderMatcap(), zebra: zebraMatcap() };
  vertexAnzahl = 0;
  /** Beweis 4: Earle-Wesen (eigenes Netz mit Deskriptoren, Material aus `packages/render`) */
  private readonly wesen: Mesh;
  /** Beweis 5: Feuer-/Gas-Wesen (Körper und Klingen) mit eigenem Material */
  private readonly feuer: Mesh;
  private readonly feuerUniforms: FeuerUniforms;
  /** Beweis 4: Zähne mit Verlauf Ansatz → Spitze (Attribut `eeTooth`) */
  private readonly zaehne: Mesh;
  private readonly wesenUniforms: CreatureMaterialUniforms;
  private palette: Palette = PALETTEN.tiger!;
  /** Zonen-Atlas-Texturen des aktuellen Wesens (zum Freigeben) */
  private atlasTexturen: DataTexture[] = [];
  private lebenTimer: number | null = null;
  private blinkPhase = -1;
  private blinkTimer = 2.2;
  private zeit = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    installTslFunctionCacheFix();
    const webgl = new URLSearchParams(location.search).get('backend') === 'webgl';
    this.renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true, forceWebGL: webgl });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;

    const material = new MeshMatcapNodeMaterial({ matcap: this.matcaps.normal });
    // Vorderseiten in die Schattenkarte: mit den Rückseiten (Standard) bliebe um den Bodenkontakt ein heller Fleck
    material.shadowSide = FrontSide;
    this.koerper = new Mesh(this.geometrie, material);
    // erst sichtbar, wenn es Geometrie gibt: sonst übersetzt WebGPU den Shader ohne Positionen und behält ihn
    this.koerper.visible = false;
    this.koerper.castShadow = true;
    this.koerper.frustumCulled = false;
    this.szene.add(this.koerper);

    this.wesenUniforms = createCreatureUniforms(this.palette.farben, STIL_STANDARD, 1);
    const wesenMaterial = createCreatureMaterial(this.wesenUniforms, { ruheAttribut: true });
    wesenMaterial.shadowSide = FrontSide;
    this.wesen = new Mesh(new BufferGeometry(), wesenMaterial);
    this.wesen.visible = false;
    this.wesen.castShadow = true;
    this.wesen.frustumCulled = false;
    this.szene.add(this.wesen);
    this.setzePalette(this.palette);
    this.feuerUniforms = createFeuerUniforms();
    const feuerMaterial = createFeuerMaterial(this.feuerUniforms);
    feuerMaterial.shadowSide = FrontSide;
    this.feuer = new Mesh(new BufferGeometry(), feuerMaterial);
    this.feuer.visible = false;
    this.feuer.castShadow = true;
    this.feuer.frustumCulled = false;
    this.szene.add(this.feuer);
    const zahnMaterial = createToothMaterial(this.wesenUniforms, '#f3e6c8');
    zahnMaterial.shadowSide = FrontSide;
    this.zaehne = new Mesh(new BufferGeometry(), zahnMaterial);
    this.zaehne.visible = false;
    this.zaehne.castShadow = true;
    this.zaehne.frustumCulled = false;
    this.szene.add(this.zaehne);

    const kachel = new Mesh(new PlaneGeometry(1, 1), new MeshBasicNodeMaterial({ color: 0x000000, transparent: true, opacity: 0.1, depthWrite: false }));
    kachel.rotation.x = -Math.PI / 2;
    kachel.position.y = 0.0008;
    kachel.renderOrder = 1;
    this.szene.add(kachel);

    const boden = new Mesh(new PlaneGeometry(30, 30), new ShadowNodeMaterial({ color: new Color(0x314206), opacity: 0.25, depthWrite: false }));
    boden.rotation.x = -Math.PI / 2;
    boden.position.y = 0.0016;
    boden.receiveShadow = true;
    boden.renderOrder = 2;
    this.szene.add(boden);

    const sonne = new DirectionalLight(0xffffff, 1);
    sonne.position.set(SONNE[0] * 5, SONNE[1] * 5, SONNE[2] * 5);
    sonne.castShadow = true;
    sonne.shadow.mapSize.set(4096, 4096);
    const sc = sonne.shadow.camera;
    sc.left = -1.8;
    sc.right = 1.8;
    sc.top = 1.8;
    sc.bottom = -1.8;
    sc.near = 0.5;
    sc.far = 12;
    sonne.shadow.bias = -0.0004;
    sonne.shadow.normalBias = 0.01;
    this.szene.add(sonne, sonne.target);
  }

  async init() {
    await this.renderer.init();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.bereit = true;
    this.nachUebersetzen();
  }

  get backend(): 'WebGPU' | 'WebGL2' {
    return (this.renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  }

  groesseAnpassen() {
    if (!this.bereit) return;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.anfordern();
  }

  /** Neue Geometrie statt Umbau der alten (Attributwechsel lässt sonst alte Shader-Stände stehen). */
  private neueGeometrie(positionen: Float32Array, normalen: Float32Array, indizes: Uint32Array | null, farben: Float32Array | null = null) {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positionen, 3));
    g.setAttribute('normal', new BufferAttribute(normalen, 3));
    if (indizes) g.setIndex(new BufferAttribute(indizes, 1));
    // Bereichsfarben (Versuche: Haut, Lippenband, Rachen, Zähne) werden mit der Matcap multipliziert
    if (farben) g.setAttribute('color', new BufferAttribute(farben, 3));
    const material = this.koerper.material as MeshMatcapNodeMaterial;
    if (material.vertexColors !== !!farben) {
      material.vertexColors = !!farben;
      material.needsUpdate = true;
    }
    g.computeBoundingSphere();
    const alt = this.geometrie;
    this.geometrie = g;
    this.koerper.geometry = g;
    this.koerper.visible = true;
    this.wesen.visible = false;
    this.feuer.visible = false;
    this.leben(false);
    alt.dispose();
    this.vertexAnzahl = positionen.length / 3;
    this.nachUebersetzen();
  }

  setzeNetz(n: LoftNetz) {
    const g = this.geometrie;
    const pos = g.getAttribute('position') as BufferAttribute | undefined;
    if (!pos || pos.array.length !== n.positionen.length || !g.getIndex()) {
      this.neueGeometrie(n.positionen.slice(), n.normalen.slice(), n.indizes.slice());
      return;
    }
    (pos.array as Float32Array).set(n.positionen);
    pos.needsUpdate = true;
    const nrm = g.getAttribute('normal') as BufferAttribute;
    (nrm.array as Float32Array).set(n.normalen);
    nrm.needsUpdate = true;
    g.computeBoundingSphere();
    this.anfordern();
  }

  /** Zebrastreifen statt Matcap: zum Prüfen von Kanten (springen = Knick, fließen = glatt). */
  setzeZebra(an: boolean) {
    const material = this.koerper.material as MeshMatcapNodeMaterial;
    const ziel = an ? this.matcaps.zebra : this.matcaps.normal;
    if (material.matcap === ziel) return;
    material.matcap = ziel;
    material.needsUpdate = true;
    this.nachUebersetzen();
  }

  /** Indiziertes Netz mit eigener Punktzahl (Versuch Schnitte): immer neue Geometrie, auch bei gleicher Länge. */
  setzeFlaeche(positionen: Float32Array, normalen: Float32Array, indizes: Uint32Array) {
    this.neueGeometrie(positionen, normalen, indizes);
  }

  /** Dreiecke ohne Index (Versuche, z. B. Subdivision mit getrennten Normalen an scharfen Kanten), optional mit Farbe je Ecke. */
  setzeDreiecke(positionen: Float32Array, normalen: Float32Array, farben: Float32Array | null = null) {
    this.neueGeometrie(positionen, normalen, null, farben);
  }

  /**
   * Liniensegmente (Paare von Punkten) mit Farbe je Punkt, z. B. das Käfiggitter (Versuche). `verdeckt`: Linien hinter
   * der Fläche ausblenden (Kantenlinien auf dem Körper), sonst immer sichtbar wie Blenders Käfig.
   */
  setzeLinien(punkte: Float32Array | null, farben?: Float32Array, verdeckt = false) {
    if (this.linien) {
      this.szene.remove(this.linien);
      this.linien.geometry.dispose();
      this.linien = null;
    }
    if (punkte && punkte.length) {
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(punkte, 3));
      if (farben) g.setAttribute('color', new BufferAttribute(farben, 3));
      // wie Blenders Käfig-Anzeige: immer sichtbar über der Fläche, leicht durchscheinend
      this.linien = new LineSegments(g, new LineBasicNodeMaterial({ vertexColors: !!farben, color: farben ? 0xffffff : 0x19232b, depthTest: verdeckt, transparent: true, opacity: verdeckt ? 1 : 0.7 }));
      this.linien.renderOrder = 3;
      this.szene.add(this.linien);
    }
    this.nachUebersetzen();
  }

  /**
   * Beweis 4: Earle-Wesen aus Dreiecken (ohne Index) mit 16 Deskriptor-Floats je Ecke (eeSpine, eeRegion, eeExtra,
   * eePucker, eeTeil, Reihenfolge wie `CreatureMesh`), Körperhöhe und gemalten Schlitzaugen.
   */
  setzeWesen(positionen: Float32Array, normalen: Float32Array, deskriptoren: Float32Array, hoehe: number, augen: Auge[], lippenBand = 0, ruhe: Float32Array | null = null, gesicht: Gesicht | null = null, atlas: AtlasDaten | null = null) {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positionen, 3));
    g.setAttribute('normal', new BufferAttribute(normalen, 3));
    // Ruhelage je Ecke: Muster, Zonen, Augen und Korn rechnen darin und bleiben bei Posen stehen
    g.setAttribute('eeRest', new BufferAttribute(ruhe && ruhe.length === positionen.length ? ruhe : positionen, 3));
    // Zonen-Atlas (Beweis 4): Kachelkoordinaten je Ecke; ohne Atlas Nullen (der Shader liest dann den Platzhalter nicht)
    const ecken = positionen.length / 3;
    const atlasEcken = atlas && atlas.ecken.length === 2 * ecken ? atlas.ecken : new Float32Array(2 * ecken);
    g.setAttribute('eeAtlas', new BufferAttribute(atlasEcken, 2));
    {
      const u2 = this.wesenUniforms;
      for (const alt of this.atlasTexturen) alt.dispose();
      this.atlasTexturen = [];
      if (atlas && atlas.ecken.length === 2 * ecken) {
        const ta = atlasTextur(atlas.abstand, atlas.breite, atlas.hoehe);
        const tw = atlasTextur(atlas.weich, atlas.breite, atlas.hoehe);
        u2.atlasAbstand.value = ta;
        u2.atlasWeich.value = tw;
        u2.atlasAn.value = 1;
        this.atlasTexturen = [ta, tw];
      } else u2.atlasAn.value = 0;
    }
    const ib = new InterleavedBuffer(deskriptoren, 16);
    g.setAttribute('eeSpine', new InterleavedBufferAttribute(ib, 4, 0));
    g.setAttribute('eeRegion', new InterleavedBufferAttribute(ib, 4, 4));
    g.setAttribute('eeExtra', new InterleavedBufferAttribute(ib, 4, 8));
    g.setAttribute('eePucker', new InterleavedBufferAttribute(ib, 3, 12));
    g.setAttribute('eeTeil', new InterleavedBufferAttribute(ib, 1, 15));
    g.computeBoundingSphere();
    const u = this.wesenUniforms;
    u.bodyScale.value = Math.max(1e-3, hoehe);
    u.zonen.hoehe.value = Math.max(1e-3, hoehe);
    u.lippenBand.value = lippenBand;
    if (gesicht) {
      u.naseMitte.value.set(gesicht.nase[0], gesicht.nase[1], gesicht.nase[2], gesicht.radius);
      u.naseOben.value.set(gesicht.oben[0], gesicht.oben[1], gesicht.oben[2], gesicht.hoehe);
      u.naseRechts.value.set(gesicht.rechts[0], gesicht.rechts[1], gesicht.rechts[2], 0);
      u.philtrumA.value.set(gesicht.philtrumA[0], gesicht.philtrumA[1], gesicht.philtrumA[2], gesicht.breite);
      u.philtrumB.value.set(gesicht.philtrumB[0], gesicht.philtrumB[1], gesicht.philtrumB[2]);
      u.gesichtAn.value = 1;
    } else u.gesichtAn.value = 0;
    u.eyeCount.value = Math.min(4, augen.length);
    // Lidring um die gemalten Augen (Tiger): der Höhlenring des Materials auf denselben Augenlagen
    u.ringCount.value = this.palette.augenRing ? Math.min(4, augen.length) : 0;
    u.ringStaerke.value = this.palette.augenRing ?? 0.5;
    augen.slice(0, 4).forEach((a, i) => {
      const n = new Vector3(...a.normale).normalize();
      const up = new Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
      (u.eyePos.array[i] as Vector4).set(a.pos[0] + n.x * 0.002, a.pos[1] + n.y * 0.002, a.pos[2] + n.z * 0.002, a.groesse);
      (u.eyeUp.array[i] as Vector4).set(up.x, up.y, up.z, 1);
    });
    const alt = this.wesen.geometry;
    this.wesen.geometry = g;
    this.wesen.visible = true;
    this.koerper.visible = false;
    this.feuer.visible = false;
    alt.dispose();
    this.vertexAnzahl = positionen.length / 3;
    this.leben(true);
    this.nachUebersetzen();
  }

  /** Beweis 5: Feuer- oder Gas-Wesen (Körper und Klingen als Dreiecke) mit Bändermaterial, Körpermitte und Schlitzaugen. */
  setzeFeuer(positionen: Float32Array, normalen: Float32Array, hoehe: number, mitte: [number, number, number], art: FeuerArt, augen: Auge[]) {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positionen, 3));
    g.setAttribute('normal', new BufferAttribute(normalen, 3));
    g.computeBoundingSphere();
    const u = this.feuerUniforms;
    u.bodyScale.value = Math.max(1e-3, hoehe);
    u.mitte.value.set(mitte[0], mitte[1], mitte[2]);
    applyFeuerArt(u, art);
    u.eyeCount.value = Math.min(4, augen.length);
    augen.slice(0, 4).forEach((a, i) => {
      const n = new Vector3(...a.normale).normalize();
      const up = new Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
      (u.eyePos.array[i] as Vector4).set(a.pos[0] + n.x * 0.002, a.pos[1] + n.y * 0.002, a.pos[2] + n.z * 0.002, a.groesse);
      (u.eyeUp.array[i] as Vector4).set(up.x, up.y, up.z, 1);
    });
    const alt = this.feuer.geometry;
    this.feuer.geometry = g;
    this.feuer.visible = true;
    this.wesen.visible = false;
    this.koerper.visible = false;
    alt.dispose();
    this.vertexAnzahl = positionen.length / 3;
    this.leben(true);
    this.nachUebersetzen();
  }

  /** Zähne (Dreiecke) mit Höhenanteil je Ecke; null blendet sie aus. */
  setzeZaehne(positionen: Float32Array | null, normalen: Float32Array | null, anteil: Float32Array | null) {
    if (!positionen || !normalen || !anteil) {
      this.zaehne.visible = false;
      this.anfordern();
      return;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positionen, 3));
    g.setAttribute('normal', new BufferAttribute(normalen, 3));
    g.setAttribute('eeTooth', new BufferAttribute(anteil, 1));
    g.computeBoundingSphere();
    const alt = this.zaehne.geometry;
    this.zaehne.geometry = g;
    this.zaehne.visible = true;
    alt.dispose();
    this.anfordern();
  }

  /** Lagen und Normalen des sichtbaren Wesens an Ort und Stelle ersetzen (Wehen der Klingen je Bild); gleiche Länge vorausgesetzt. */
  aktualisiereNetz(positionen: Float32Array, normalen: Float32Array) {
    const mesh = this.feuer.visible ? this.feuer : this.wesen.visible ? this.wesen : this.koerper;
    const g = mesh.geometry;
    const pa = g.getAttribute('position') as BufferAttribute | undefined;
    const na = g.getAttribute('normal') as BufferAttribute | undefined;
    if (!pa || !na || pa.array.length !== positionen.length) return;
    (pa.array as Float32Array).set(positionen);
    (na.array as Float32Array).set(normalen);
    pa.needsUpdate = true;
    na.needsUpdate = true;
    this.anfordern();
  }

  /** Gemaltes Fell (Beweis 5): Stärke des Büschelfelds im Earle-Material (0 = aus) und Büschelgröße (Anteil der Höhe). */
  setzeFell(staerke: number, groesse = 0.06) {
    this.wesenUniforms.fellStaerke.value = staerke;
    this.wesenUniforms.fellGroesse.value = groesse;
    this.anfordern();
  }

  /** Palette (Farben, Muster, Zonen) des Earle-Wesens. */
  setzePalette(p: Palette) {
    this.palette = p;
    const u = this.wesenUniforms;
    applyStil(u, STIL_STANDARD, p.farben);
    applyMuster(u.musterU, p.muster);
    applyZonen(u.zonen, p.zonen);
    u.bauchlinie.value = p.bauchlinie;
    u.bauchStaerke.value = p.bauchStaerke;
    u.glimmerWesen.value = p.glimmer;
    u.gesichtHell.value = p.gesichtHell ?? 0;
    u.teilAn.value = 0;
    this.anfordern();
  }

  /** Atmen der Zeit (Funken) und Blinzeln, solange das Earle-Wesen sichtbar ist (20 Bilder je Sekunde). */
  private leben(an: boolean) {
    if (!an) {
      if (this.lebenTimer !== null) window.clearInterval(this.lebenTimer);
      this.lebenTimer = null;
      return;
    }
    if (this.lebenTimer !== null) return;
    let letzte = performance.now();
    this.lebenTimer = window.setInterval(() => {
      const t = performance.now();
      const dt = Math.min(0.1, (t - letzte) / 1000);
      letzte = t;
      this.zeit += dt;
      const u = this.wesenUniforms;
      u.zeit.value = this.zeit;
      this.feuerUniforms.zeit.value = this.zeit;
      if (this.blinkPhase < 0) {
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
          this.blinkPhase = 0;
          this.blinkTimer = 2.4 + Math.random() * 4;
        }
        u.blink.value = 0;
      } else {
        this.blinkPhase += dt;
        const x = this.blinkPhase / 0.17;
        u.blink.value = x < 0.4 ? Math.pow(x / 0.4, 0.6) : Math.max(0, 1 - Math.pow((x - 0.4) / 0.6, 1.4));
        if (x >= 1) this.blinkPhase = -1;
      }
      this.anfordern();
    }, 50);
  }

  /** Blinzeln festhalten (Standbilder): 0 offen … 1 zu, null = Automatik. */
  blinkHalten(wert: number | null) {
    if (wert === null) return;
    this.leben(false);
    this.wesenUniforms.blink.value = wert;
    this.feuerUniforms.blink.value = wert;
    this.anfordern();
  }

  setzeRect(r: Rect | null) {
    this.rect = r;
    this.anfordern();
  }

  setzeKamera(k: Kamera) {
    this.kameraZustand = k;
    this.anfordern();
  }

  /**
   * Nach neuer Geometrie oder neuem Material: WebGPU übersetzt Pipelines im Hintergrund, ein Bild davor
   * zeichnet das Objekt noch nicht. Darum nach dem Übersetzen noch einmal zeichnen.
   */
  private nachUebersetzen() {
    this.anfordern();
    if (!this.bereit) return;
    void this.renderer
      .compileAsync(this.szene, this.kamera)
      .then(() => this.anfordern())
      .catch(() => this.anfordern());
  }

  anfordern() {
    if (this.angefordert) return;
    this.angefordert = true;
    requestAnimationFrame(() => {
      this.angefordert = false;
      this.zeichnen();
    });
  }

  private kameraStellen(aspekt: number) {
    const k = this.kameraZustand;
    if (!k) return;
    const p = kameraPosition(k);
    this.kamera.position.set(p[0], p[1], p[2]);
    this.kamera.lookAt(k.ziel[0], k.ziel[1], k.ziel[2]);
    this.kamera.aspect = aspekt;
    this.kamera.updateProjectionMatrix();
  }

  /** Rendert sofort; gibt false zurück, wenn noch nichts zu zeichnen ist. */
  zeichnen(): boolean {
    const r = this.rect;
    if (!this.bereit || !r || r.w < 2 || r.h < 2 || !this.kameraZustand) return false;
    const rd = this.renderer;
    rd.autoClear = false;
    rd.setScissorTest(false);
    rd.clear();
    rd.setViewport(r.x, r.y, r.w, r.h);
    rd.setScissor(r.x, r.y, r.w, r.h);
    rd.setScissorTest(true);
    this.kameraStellen(r.w / r.h);
    rd.render(this.szene, this.kamera);
    return true;
  }

  /** Vorschaubild für die Bibliothek: quadratischer Ausschnitt um die Mitte, auf den Verlauf gesetzt. */
  vorschau(groesse = 384): string | null {
    const r = this.rect;
    if (!r || !this.zeichnen()) return null;
    const dpr = this.renderer.getPixelRatio();
    const seite = Math.min(r.w, r.h);
    const sx = (r.x + (r.w - seite) / 2) * dpr;
    const sy = (r.y + (r.h - seite) / 2) * dpr;
    const c = document.createElement('canvas');
    c.width = groesse;
    c.height = groesse;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createLinearGradient(0, groesse, groesse, 0);
    g.addColorStop(0, '#b5bb72');
    g.addColorStop(1, '#d0ff47');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, groesse, groesse);
    ctx.drawImage(this.canvas, sx, sy, seite * dpr, seite * dpr, 0, 0, groesse, groesse);
    return c.toDataURL('image/png');
  }
}
