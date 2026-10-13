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
  Line,
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
  OrthographicCamera,
  Raycaster,
  SphereGeometry,
  Vector2,
} from 'three/webgpu';
import { type AtlasDaten, type Auge, type Gesicht, PALETTEN, type Palette } from './wesenLook';
import type { Ansicht2D, Kamera } from '../state/uiStore';
import type { Ansicht, Blick } from '@ee/shape';
import { massstab } from '../viewports/ansicht2d';

/** Blatt (Seite, Front, Top): Rechteck, 2D-Ansicht (Zoom, Mitte) und Blickrichtung — die Bühne rendert den Körper dahinter. */
export type Blatt = { rect: Rect; ansicht: Ansicht2D; blick: Blick };
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
  /** Blätter (M2): dieselbe Szene mit orthografischen Kameras in Seite, Front, Top */
  private blaetter: Partial<Record<Ansicht, Blatt>> = {};
  private readonly ortho = new OrthographicCamera(-1, 1, 1, -1, 0.01, 60);
  private boden: Mesh | null = null;
  /** Picking (M2): Strahl, Trefferpunkt als kleine Marke (Lichtpunkt der Ranken, Plan 9.6) */
  private readonly strahl = new Raycaster();
  private readonly marke = new Mesh(new SphereGeometry(1, 16, 12), new MeshBasicNodeMaterial({ color: 0xff2e9a }));
  private linien: LineSegments | null = null;
  /** Reifen (M3): Ringe der Spanten auf dem Körper (Segmente mit Farbe je Punkt) und Perlen an den Spant-Knoten */
  private reifen: LineSegments | null = null;
  private readonly perlen: Mesh[] = [];
  private readonly perlenGeometrie = new SphereGeometry(1, 12, 8);
  /** Pinsel (M3): Radiusring in der Tangentialebene am Zeiger */
  private radiusRing: Line | null = null;
  /** Kieferknopf (M3): Bohne am Mundwinkel, blau wie die Unterlippe (Plan 9.7) */
  private readonly kiefer = new Mesh(new SphereGeometry(1, 16, 12), new MeshBasicNodeMaterial({ color: 0x2e8bff, depthTest: false }));
  private readonly perlenMaterial = [new MeshBasicNodeMaterial({ color: 0x00ffe1, depthTest: false }), new MeshBasicNodeMaterial({ color: 0xf4f1e4, depthTest: false }), new MeshBasicNodeMaterial({ color: 0xff2e9a, depthTest: false })];
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
    this.boden = boden;
    this.marke.visible = false;
    this.marke.renderOrder = 3;
    this.szene.add(this.marke);
    this.kiefer.visible = false;
    this.kiefer.renderOrder = 5;
    this.szene.add(this.kiefer);

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

  /**
   * Picking (M2): Strahl aus einem Feld (Pixel innerhalb des Feldrechtecks) auf den Körper; Bühne perspektivisch,
   * Blätter orthografisch. Liefert Dreieck (Index im Netz des Körpers) und Trefferpunkt (Welt) oder null.
   */
  /** Kamera und Rechteck eines Felds (Bühne perspektivisch, Blätter orthografisch), Matrizen aktuell; null ohne Feld. */
  private feldKamera(feld: 'creation' | Ansicht): { cam: PerspectiveCamera | OrthographicCamera; r: Rect } | null {
    let cam: PerspectiveCamera | OrthographicCamera;
    let r: Rect;
    if (feld === 'creation') {
      if (!this.rect || !this.kameraZustand) return null;
      r = this.rect;
      this.kameraStellen(r.w / r.h);
      cam = this.kamera;
    } else {
      const b = this.blaetter[feld];
      if (!b) return null;
      r = b.rect;
      this.blattKamera(feld, b);
      cam = this.ortho;
    }
    cam.updateMatrixWorld();
    return { cam, r };
  }

  /** Strahl aus Feldpixeln (Welt): Ursprung und Richtung; null ohne Feld. */
  strahlFuer(feld: 'creation' | Ansicht, px: number, py: number): { o: [number, number, number]; d: [number, number, number] } | null {
    const k = this.feldKamera(feld);
    if (!k) return null;
    this.strahl.setFromCamera(new Vector2((px / k.r.w) * 2 - 1, -((py / k.r.h) * 2 - 1)), k.cam);
    const o = this.strahl.ray.origin;
    const d = this.strahl.ray.direction;
    return { o: [o.x, o.y, o.z], d: [d.x, d.y, d.z] };
  }

  /** Blickrichtung der Kamera eines Felds (Welt, Einheitsvektor). */
  blickrichtung(feld: 'creation' | Ansicht): [number, number, number] | null {
    const k = this.feldKamera(feld);
    if (!k) return null;
    const v = k.cam.getWorldDirection(new Vector3());
    return [v.x, v.y, v.z];
  }

  /** Weltpunkte → Feldpixel: je Punkt (px, py, vorn), vorn = 1 vor der Kamera, 0 dahinter. */
  projizierenViele(feld: 'creation' | Ansicht, xyz: Float32Array): Float32Array {
    const out = new Float32Array(xyz.length);
    const k = this.feldKamera(feld);
    if (!k) return out;
    const v = new Vector3();
    for (let i = 0; i + 2 < xyz.length; i += 3) {
      v.set(xyz[i]!, xyz[i + 1]!, xyz[i + 2]!).project(k.cam);
      out[i] = ((v.x + 1) / 2) * k.r.w;
      out[i + 1] = ((1 - v.y) / 2) * k.r.h;
      out[i + 2] = v.z > -1 && v.z < 1 ? 1 : 0;
    }
    return out;
  }

  treffen(feld: 'creation' | Ansicht, px: number, py: number): { dreieck: number; punkt: [number, number, number] } | null {
    const k = this.feldKamera(feld);
    if (!k) return null;
    const { cam, r } = k;
    const ndc = new Vector2((px / r.w) * 2 - 1, -((py / r.h) * 2 - 1));
    this.strahl.setFromCamera(ndc, cam);
    const ziel = [this.wesen, this.koerper, this.feuer].find((m) => m.visible && (m.geometry.getAttribute('position')?.count ?? 0) > 0);
    if (!ziel) return null;
    const t = this.strahl.intersectObject(ziel, false)[0];
    if (!t || t.faceIndex === undefined || t.faceIndex === null) return null;
    return { dreieck: t.faceIndex, punkt: [t.point.x, t.point.y, t.point.z] };
  }

  /** Reifen (M3): Liniensegmente (Welt) mit Farbe je Punkt, immer sichtbar über der Fläche; null blendet aus. */
  setzeReifen(punkte: Float32Array | null, farben: Float32Array | null) {
    if (this.reifen) {
      this.szene.remove(this.reifen);
      this.reifen.geometry.dispose();
      this.reifen = null;
    }
    if (punkte && farben && punkte.length) {
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(punkte, 3));
      g.setAttribute('color', new BufferAttribute(farben, 3));
      this.reifen = new LineSegments(g, new LineBasicNodeMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.95 }));
      this.reifen.renderOrder = 4;
      this.szene.add(this.reifen);
    }
    this.anfordern();
  }

  /** Perlen (Welt) mit Zustand je Perle (0 ruhig, 1 gewählt, 2 unter dem Zeiger); Größe als Anteil der Körperhöhe. */
  setzePerlen(lagen: Float32Array | null, zustand: Uint8Array | null, hoehe = 1) {
    const n = lagen ? lagen.length / 3 : 0;
    while (this.perlen.length < n) {
      const m = new Mesh(this.perlenGeometrie, this.perlenMaterial[0]!);
      m.renderOrder = 5;
      m.visible = false;
      this.szene.add(m);
      this.perlen.push(m);
    }
    const g = Math.max(0.002, 0.009 * hoehe);
    this.perlen.forEach((m, i) => {
      if (i < n && lagen) {
        m.position.set(lagen[3 * i]!, lagen[3 * i + 1]!, lagen[3 * i + 2]!);
        const z = zustand?.[i] ?? 0;
        const s = z === 0 ? g : g * 1.35;
        m.scale.set(s, s, s);
        m.material = this.perlenMaterial[z] ?? this.perlenMaterial[0]!;
        m.visible = true;
      } else m.visible = false;
    });
    this.anfordern();
  }

  /** Grund (Plan 9.7): Farbe und Stärke des Bodenschattens (Papier warm-dunkel, Nacht schwarz, Grün wie die Vorlage). */
  setzeGrund(schatten: number, staerke: number) {
    const m = this.boden?.material as (ShadowNodeMaterial & { color: Color; opacity: number }) | undefined;
    if (!m) return;
    m.color.set(schatten);
    m.opacity = staerke;
    this.anfordern();
  }

  /** Radiusring des Pinsels (Welt): Kreis um `mitte` in der Ebene senkrecht zu `normale`; null blendet aus. */
  setzeRadiusRing(mitte: [number, number, number] | null, normale: [number, number, number] = [0, 1, 0], radius = 0.1) {
    if (this.radiusRing) {
      this.szene.remove(this.radiusRing);
      this.radiusRing.geometry.dispose();
      this.radiusRing = null;
    }
    if (mitte) {
      const n = new Vector3(normale[0], normale[1], normale[2]).normalize();
      const a = Math.abs(n.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
      const u = new Vector3().crossVectors(n, a).normalize();
      const v = new Vector3().crossVectors(n, u).normalize();
      // geschlossene Linie mit Schlusspunkt (der WebGPU-Renderer zeichnet nur Line und LineSegments)
      const K = 48;
      const pts = new Float32Array(3 * (K + 1));
      for (let k = 0; k <= K; k++) {
        const w = (2 * Math.PI * k) / K;
        pts[3 * k] = mitte[0] + radius * (u.x * Math.cos(w) + v.x * Math.sin(w));
        pts[3 * k + 1] = mitte[1] + radius * (u.y * Math.cos(w) + v.y * Math.sin(w));
        pts[3 * k + 2] = mitte[2] + radius * (u.z * Math.cos(w) + v.z * Math.sin(w));
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(pts, 3));
      this.radiusRing = new Line(g, new LineBasicNodeMaterial({ color: 0xf4f1e4, depthTest: false, transparent: true, opacity: 0.9 }));
      this.radiusRing.renderOrder = 5;
      this.szene.add(this.radiusRing);
    }
    this.anfordern();
  }

  /** Kieferknopf (Welt) am Mundwinkel zeigen oder ausblenden; Bohne, Größe als Anteil der Körperhöhe. */
  setzeKiefer(punkt: [number, number, number] | null, hoehe = 1) {
    this.kiefer.visible = punkt !== null;
    if (punkt) {
      this.kiefer.position.set(punkt[0], punkt[1], punkt[2]);
      const g = Math.max(0.004, 0.02 * hoehe);
      this.kiefer.scale.set(g, g * 0.7, g * 0.8);
    }
    this.anfordern();
  }

  /** Marke am Trefferpunkt (Welt) zeigen oder ausblenden; Größe als Anteil der Körperhöhe. */
  setzeMarke(punkt: [number, number, number] | null, hoehe = 1) {
    this.marke.visible = punkt !== null;
    if (punkt) {
      this.marke.position.set(punkt[0], punkt[1], punkt[2]);
      const g = Math.max(0.003, 0.012 * hoehe);
      this.marke.scale.set(g, g, g);
    }
    this.anfordern();
  }

  /** Blätter (M2): Rechtecke, 2D-Ansichten und Blicke von Seite, Front, Top; fehlt ein Blatt, wird es nicht gezeichnet. */
  setzeBlaetter(b: Partial<Record<Ansicht, Blatt>>) {
    this.blaetter = b;
    this.anfordern();
  }

  /**
   * Orthografische Kamera eines Blatts, deckungsgleich mit `zuBild` der 2D-Ansicht: Maßstab s px je Welteinheit, Mitte
   * (cu, cv) in Blattkoordinaten. Seite: x rechts, y oben. Front: Bild-x = +z (Back: −z). Top: von oben, Bild-y = −z
   * (Bottom: von unten, Bild-y = +z), siehe `spiegeln2`.
   */
  private blattKamera(ansicht: Ansicht, b: Blatt) {
    const { w, h } = b.rect;
    const s = massstab(b.ansicht, w, h);
    const hw = w / (2 * s);
    const hh = h / (2 * s);
    const cam = this.ortho;
    cam.left = -hw;
    cam.right = hw;
    cam.top = hh;
    cam.bottom = -hh;
    const { cu, cv } = b.ansicht;
    if (ansicht === 'seite') {
      cam.position.set(cu, cv, 20);
      cam.up.set(0, 1, 0);
      cam.lookAt(cu, cv, 0);
    } else if (ansicht === 'front') {
      const hinten = b.blick === 'hinten';
      cam.position.set(hinten ? 20 : -20, cv, hinten ? -cu : cu);
      cam.up.set(0, 1, 0);
      cam.lookAt(0, cv, hinten ? -cu : cu);
    } else {
      const unten = b.blick === 'unten';
      cam.position.set(cu, unten ? -20 : 20, unten ? cv : -cv);
      cam.up.set(0, 0, unten ? 1 : -1);
      cam.lookAt(cu, 0, unten ? cv : -cv);
    }
    cam.updateProjectionMatrix();
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
    // Blätter (M2): dieselbe Szene orthografisch in Seite, Front, Top; von unten ohne Bodenplatte
    for (const ansicht of ['seite', 'front', 'top'] as const) {
      const b = this.blaetter[ansicht];
      if (!b || b.rect.w < 2 || b.rect.h < 2) continue;
      this.blattKamera(ansicht, b);
      rd.setViewport(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
      rd.setScissor(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
      if (this.boden) this.boden.visible = !(ansicht === 'top' && b.blick === 'unten');
      rd.render(this.szene, this.ortho);
    }
    if (this.boden) this.boden.visible = true;
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
