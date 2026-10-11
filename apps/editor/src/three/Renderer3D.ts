// 3D-Viewport „creation“: ein Vollfenster-Canvas, gerendert wird nur ins Creation-Rechteck (Scissor).
// So muss der Canvas während der Layout-Animationen nie seine Größe ändern. Gerendert wird nur bei Bedarf.
//
// Look: Matcap (Licht an der Ansicht, wie Blender-Solid), Kachel als 10-%-Fläche, harter Schatten von
// einem eigenen Sonnenlicht (wirkt nur auf den Schatten, die Matcap ignoriert Licht).

import type { LoftNetz } from '@ee/shape';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  FrontSide,
  Mesh,
  MeshBasicNodeMaterial,
  MeshMatcapNodeMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowNodeMaterial,
  WebGPURenderer,
} from 'three/webgpu';
import type { Kamera } from '../state/uiStore';
import type { Rect } from '../types';
import { kameraPosition } from './kamera';
import { blenderMatcap } from './matcap';

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
  private readonly geometrie = new BufferGeometry();
  private rect: Rect | null = null;
  private kameraZustand: Kamera | null = null;
  private angefordert = false;
  private bereit = false;
  vertexAnzahl = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const webgl = new URLSearchParams(location.search).get('backend') === 'webgl';
    this.renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true, forceWebGL: webgl });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;

    const material = new MeshMatcapNodeMaterial({ matcap: blenderMatcap() });
    // Vorderseiten in die Schattenkarte: mit den Rückseiten (Standard) bliebe um den Bodenkontakt ein heller Fleck
    material.shadowSide = FrontSide;
    this.koerper = new Mesh(this.geometrie, material);
    this.koerper.castShadow = true;
    this.koerper.frustumCulled = false;
    this.szene.add(this.koerper);

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
    this.anfordern();
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

  setzeNetz(n: LoftNetz) {
    const g = this.geometrie;
    const pos = g.getAttribute('position') as BufferAttribute | undefined;
    if (pos && pos.array.length === n.positionen.length) {
      (pos.array as Float32Array).set(n.positionen);
      pos.needsUpdate = true;
      const nrm = g.getAttribute('normal') as BufferAttribute;
      (nrm.array as Float32Array).set(n.normalen);
      nrm.needsUpdate = true;
    } else {
      g.setAttribute('position', new BufferAttribute(n.positionen.slice(), 3));
      g.setAttribute('normal', new BufferAttribute(n.normalen.slice(), 3));
      g.setIndex(new BufferAttribute(n.indizes.slice(), 1));
    }
    g.computeBoundingSphere();
    this.vertexAnzahl = n.positionen.length / 3;
    this.anfordern();
  }

  /** Dreiecke ohne Index (Versuche, z. B. Subdivision mit getrennten Normalen an scharfen Kanten). */
  setzeDreiecke(positionen: Float32Array, normalen: Float32Array) {
    const g = this.geometrie;
    g.setIndex(null);
    g.setAttribute('position', new BufferAttribute(positionen, 3));
    g.setAttribute('normal', new BufferAttribute(normalen, 3));
    g.computeBoundingSphere();
    this.vertexAnzahl = positionen.length / 3;
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
