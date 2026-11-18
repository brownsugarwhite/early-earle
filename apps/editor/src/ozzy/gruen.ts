/**
 * Das grüne Material des alten Editors in Ozzy (Florian, 18.11.2026: „das grüne Material aus dem alten Editor mit den Punkten und der
 * hellen automatischen Bauchfläche“, „exakt wie wir sie erarbeitet haben und keine eigene Version“; dann: „das grüne Material dann
 * ohne Bauch. Das kommt dann später“).
 *
 * Es ist das Earle-Material (`createCreatureMaterial` aus `packages/render/src/creature2`, unverändert) mit der Palette „Blob“ aus
 * `src/three/wesenLook.ts`, aufgesetzt wie im alten Editor (`Renderer3D.ts`: `setzePalette`, `setzeWesen`): Wertstufen mit Verlauf,
 * farbige Schatten, Korn und Glimmer, das Punktemuster in der dunkleren Farbe. Es läuft wie dort auf dem WebGPU-Renderer von three
 * (ohne WebGPU auf WebGL 2), darum auf einer eigenen Zeichenfläche (`#gast-earle`, über dem Raum und unter den Linien) und erst
 * geladen, wenn es gewählt wird.
 *
 * Was eine Form in Ozzy nicht hat, sind die Angaben, die der alte Editor aus seinem Gerüst rechnete (Wirbelsäule, Bauch und Rücken,
 * Maul, Gesicht: 16 Werte je Ecke). Hier stehen sie auf „nichts davon“:
 * - **kein Bauch** (seine Ansage): keine Bauchzone, Stärke der Bauchfarbe 0; jede Ecke gilt als Rücken, die Punkte liegen überall;
 * - kein Maul, keine Lippen, kein Gesicht, keine Augen (sie gehören zum Wesen, nicht zum Material), kein Fell;
 * - die Körperhöhe ist die Höhe der Form, ihr tiefster Punkt der Boden (das Material dunkelt die Unterseite ab und hellt nach oben
 *   auf); Punkte und Korn liegen im Raum der Form, wie im alten Editor.
 * Die Uhr steht (keine Funken, die blinken): In der Ruhe rechnet Ozzy kein Bild.
 */
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, InterleavedBuffer, InterleavedBufferAttribute, type OrthographicCamera, type PerspectiveCamera as KameraRaum } from 'three';
import { Mesh, PerspectiveCamera, Scene, WebGPURenderer } from 'three/webgpu';
import { STIL_STANDARD, applyMuster, applyStil, applyZonen, createCreatureMaterial, createCreatureUniforms, installTslFunctionCacheFix, type CreatureMaterialUniforms } from '@ee/render';
import type { HautNetz } from '../anfang/haut';
import { PALETTEN } from '../three/wesenLook';

export type GruenWerte = {
  /** wie deckend (Röntgen nimmt zurück; beim Einrasten blendet die Haut aus), 0 … 1 */
  deckung: number;
};

export class GruenHaut {
  private readonly leinwand: HTMLCanvasElement;
  private readonly renderer: WebGPURenderer;
  private readonly szene = new Scene();
  private readonly kam = new PerspectiveCamera(30, 1, 1, 1e7);
  private readonly uniforms: CreatureMaterialUniforms;
  private readonly koerper: Mesh;
  private bereit = false;
  /** die Pipelines für dieses Netz sind übersetzt (vorher zeichnet WebGPU den Körper noch nicht) */
  private uebersetzt = false;
  private uebersetztLaeuft = false;
  private netz: HautNetz | null = null;
  private wicklung = 0;
  private ruhe = new Float32Array(0);
  private b = 4;
  private h = 4;
  private dpr = 1;
  private stand = '';
  private sichtbar = false;
  /** Zeit des letzten Bilds (ms), wie viele Bilder, und worauf gezeichnet wird */
  readonly mess = { zeichnen: 0, bilder: 0, unterbau: '' };

  constructor(leinwand: HTMLCanvasElement) {
    this.leinwand = leinwand;
    installTslFunctionCacheFix();
    const webgl = new URLSearchParams(location.search).get('backend') === 'webgl';
    this.renderer = new WebGPURenderer({ canvas: leinwand, antialias: true, alpha: true, forceWebGL: webgl });
    this.renderer.setClearColor(0x000000, 0);
    // die Palette „Blob“ wie `setzePalette` im alten Editor, aber ohne Bauch
    const p = PALETTEN.blob!;
    this.uniforms = createCreatureUniforms(p.farben, STIL_STANDARD, 1);
    const u = this.uniforms;
    applyStil(u, STIL_STANDARD, p.farben);
    applyMuster(u.musterU, p.muster);
    applyZonen(u.zonen, []);
    u.bauchlinie.value = p.bauchlinie;
    u.bauchStaerke.value = 0;
    u.glimmerWesen.value = p.glimmer;
    u.gesichtHell.value = 0;
    u.teilAn.value = 0;
    this.koerper = new Mesh(new BufferGeometry(), createCreatureMaterial(u, { ruheAttribut: true, augenFormen: true }));
    // erst sichtbar, wenn es Geometrie gibt: sonst übersetzt WebGPU den Shader ohne Positionen und behält ihn (`Renderer3D.ts`)
    this.koerper.visible = false;
    this.koerper.frustumCulled = false;
    this.szene.add(this.koerper);
    // die Kamera bekommt Ozzys Matrizen (mit Schwenken und den Vier Ansichten); three rechnet an ihr nichts nach
    this.kam.matrixAutoUpdate = false;
    this.kam.matrixWorldAutoUpdate = false;
    void this.renderer.init().then(() => {
      this.renderer.setPixelRatio(this.dpr);
      this.renderer.setSize(this.b, this.h, false);
      this.mess.unterbau = (this.renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2';
      this.bereit = true;
      this.stand = '';
    });
  }

  groesse(b: number, h: number, dpr: number): void {
    this.b = b;
    this.h = h;
    this.dpr = dpr;
    if (this.bereit) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(b, h, false);
    }
    this.stand = '';
  }

  /**
   * Die glatte Anzeige des Werks (dieselben Felder wie für die Seifenhaut). `wicklung`: Umlaufsinn ihrer Dreiecke von außen gesehen
   * (1 gegen den Uhrzeiger).
   */
  netzSetzen(netz: HautNetz | null, wicklung: number): void {
    this.netz = netz;
    this.stand = '';
    if (!netz || netz.pos.length < 12) return;
    const n = netz.pos.length / 3;
    const alt = this.koerper.geometry;
    const neu = this.ruhe.length !== netz.pos.length || wicklung !== this.wicklung || alt.index?.count !== netz.index.length || alt.getAttribute('position')?.array !== netz.pos;
    if (neu) {
      this.wicklung = wicklung;
      this.ruhe = new Float32Array(netz.pos.length);
      const g = new BufferGeometry();
      const dyn = (a: BufferAttribute): BufferAttribute => {
        a.setUsage(DynamicDrawUsage);
        return a;
      };
      g.setAttribute('position', dyn(new BufferAttribute(netz.pos, 3)));
      g.setAttribute('normal', dyn(new BufferAttribute(netz.normal, 3)));
      // Ruhelage: die Form selbst, vom Boden aus gemessen (Muster, Korn und der Höhenverlauf rechnen darin)
      g.setAttribute('eeRest', dyn(new BufferAttribute(this.ruhe, 3)));
      // kein Zonen-Atlas
      g.setAttribute('eeAtlas', new BufferAttribute(new Float32Array(2 * n), 2));
      // die 16 Werte je Ecke des alten Editors (eeSpine, eeRegion, eeExtra, eePucker, eeTeil): alles 0 bis auf „Rücken“ (eeSpine.w = 1:
      // kein Bauch, Punkte überall) und einen weiten Abstand zur Maulkante (eeRegion.y: kein Maul)
      const d = new Float32Array(16 * n);
      for (let i = 0; i < n; i++) {
        d[16 * i + 3] = 1;
        d[16 * i + 5] = 1e3;
      }
      const ib = new InterleavedBuffer(d, 16);
      g.setAttribute('eeSpine', new InterleavedBufferAttribute(ib, 4, 0));
      g.setAttribute('eeRegion', new InterleavedBufferAttribute(ib, 4, 4));
      g.setAttribute('eeExtra', new InterleavedBufferAttribute(ib, 4, 8));
      g.setAttribute('eePucker', new InterleavedBufferAttribute(ib, 3, 12));
      g.setAttribute('eeTeil', new InterleavedBufferAttribute(ib, 1, 15));
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
      g.setIndex(new BufferAttribute(index, 1));
      this.koerper.geometry = g;
      this.koerper.visible = true;
      alt.dispose();
      this.uebersetzt = false;
    } else for (const name of ['position', 'normal']) (alt.getAttribute(name) as BufferAttribute).needsUpdate = true;
    // Höhe der Form und ihr Boden
    const P = netz.pos;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 1; i < P.length; i += 3) {
      if (P[i]! < y0) y0 = P[i]!;
      if (P[i]! > y1) y1 = P[i]!;
    }
    const R = this.ruhe;
    for (let i = 0; i < P.length; i += 3) {
      R[i] = P[i]!;
      R[i + 1] = P[i + 1]! - y0;
      R[i + 2] = P[i + 2]!;
    }
    (this.koerper.geometry.getAttribute('eeRest') as BufferAttribute).needsUpdate = true;
    const hoehe = Math.max(1e-3, y1 - y0);
    this.uniforms.bodyScale.value = hoehe;
    this.uniforms.zonen.hoehe.value = hoehe;
  }

  /** die Fläche verbergen (ein anderes Material ist gewählt, oder es ist nichts zu zeigen) */
  aus(): void {
    if (!this.sichtbar) return;
    this.sichtbar = false;
    this.stand = '';
    this.leinwand.style.display = 'none';
  }

  /**
   * Die Haut mit dem Material auf die eigene Fläche zeichnen (sie liegt über dem Raum). Zurück: ob das nächste Bild gebraucht wird
   * (der Renderer startet noch, oder er übersetzt seine Pipelines).
   */
  zeichnen(kamera: KameraRaum | OrthographicCamera, w: GruenWerte): boolean {
    const netz = this.netz;
    if (!netz || netz.pos.length < 12) {
      this.aus();
      return false;
    }
    if (!this.bereit) return true;
    this.leinwand.style.opacity = String(Math.max(0, Math.min(1, w.deckung)));
    const pe = kamera.projectionMatrix.elements;
    const me = kamera.matrixWorld.elements;
    const stand = `${this.b}|${this.h}|${this.dpr}|${pe.join(',')}|${me.join(',')}`;
    if (stand === this.stand && this.uebersetzt && this.sichtbar) return false;
    this.stand = stand;
    const t0 = performance.now();
    const r = this.renderer;
    const k = this.kam;
    k.matrixWorld.copy(kamera.matrixWorld);
    k.matrixWorldInverse.copy(kamera.matrixWorldInverse);
    k.projectionMatrix.copy(kamera.projectionMatrix);
    // WebGPU führt die Tiefe von 0 bis 1 (WebGL von −1 bis 1): die Zeile der Tiefe umrechnen
    const webgpu = this.mess.unterbau === 'WebGPU';
    if (webgpu) {
      const e = k.projectionMatrix.elements;
      for (let s = 0; s < 4; s++) e[4 * s + 2] = 0.5 * e[4 * s + 2]! + 0.5 * e[4 * s + 3]!;
    }
    k.projectionMatrixInverse.copy(k.projectionMatrix).invert();
    k.coordinateSystem = r.coordinateSystem;
    if (!this.sichtbar) {
      this.sichtbar = true;
      this.leinwand.style.display = 'block';
    }
    r.render(this.szene, k);
    this.mess.zeichnen = performance.now() - t0;
    this.mess.bilder++;
    if (!this.uebersetzt) {
      // WebGPU übersetzt Pipelines im Hintergrund, ein Bild davor zeichnet den Körper noch nicht (`nachUebersetzen` im alten Editor)
      if (!this.uebersetztLaeuft) {
        this.uebersetztLaeuft = true;
        const g = this.koerper.geometry;
        void r
          .compileAsync(this.szene, k)
          .catch(() => undefined)
          .then(() => {
            this.uebersetztLaeuft = false;
            if (this.koerper.geometry === g) this.uebersetzt = true;
            this.stand = '';
          });
      }
      return true;
    }
    return false;
  }
}
