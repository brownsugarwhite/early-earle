import { BoxGeometry, BufferAttribute, Color, InstancedMesh, Matrix4, MeshBasicMaterial, PerspectiveCamera, Plane, Quaternion, Raycaster, Scene, Vector2, Vector3 } from 'three/webgpu';
import { mixHex, type CatalogEntry, type GenomeRules, type ZoneId } from '@ee/genome';
import { CreatureHerd, type HerdMember, type ModuleLibrary } from '@ee/render';
import type { SceneContext, SceneController } from '../canvas/SceneController';
import type { CollectionEntry } from '../state/progress';
import { useProgress } from '../state/progress';
import { audio } from '../audio/engine';
import { catalogFor, seedFor, ZONE_LEVELS } from './catalog';
import { caseWalls, layoutCase, type CaseCell, type CaseLayout, type CaseOrientation } from './setzkastenLayout';
import { useSetzkasten } from './setzkastenStore';

/** Farben eines Kastens je Zone (aus content/zones: Tisch = Tinte, Holz = helles Gelände, Boden = Mitte). */
interface CaseColors {
  table: string;
  wood: string;
  floor: string;
  ink: string;
  silhouette: string;
  accent: string;
}

const ZONE_COLORS: Record<ZoneId, CaseColors> = {
  tjorizo: { table: '#1b2410', wood: '#b3bb6d', floor: '#7d8a5a', ink: '#242c0b', silhouette: '#2f3a17', accent: '#b8ff2a' },
  syrup: { table: '#1a131b', wood: '#b08fcb', floor: '#8a78b6', ink: '#1a131b', silhouette: '#2c2233', accent: '#f17023' },
  luzz: { table: '#131726', wood: '#5fadb9', floor: '#437888', ink: '#191b2f', silhouette: '#1f2a3d', accent: '#2de5f8' },
  wooding: { table: '#1d2008', wood: '#98b392', floor: '#6c7a5c', ink: '#252d08', silhouette: '#2b3314', accent: '#ddd042' },
};

/** Wände: Stärke, Höhe über dem Boden; Boden-Dicke; Tintenschatten (Versatz nach links unten, Sonne rechts oben). */
const WALL_T = 0.08;
const WALL_H = 0.3;
const FLOOR_T = 0.12;
const SHADOW_NEAR = 0.13;
const SHADOW_LEFT = 0.11;
const CASE_SHADOW: [number, number] = [-0.32, 0.16];
/** Kamera: kleines Sichtfeld (fast orthografisch), Blick von oben wie auf das Spielbrett. */
const FOV = 22;
const PITCH = (63 * Math.PI) / 180;
/** Budget: Wesen in Sicht, davon lebendig; Spurintervall der lebenden. */
const MAX_IN_VIEW = 36;
const MAX_ALIVE = 12;
const ALIVE_TRACE = 3;
/** DPR-Grenze des Setzkastens. */
const MAX_DPR = 2;
/** Neue Wesen je Bild (verteilt Rig- und Mesh-Aufbau beim Scrollen). */
const ADDS_PER_FRAME = 4;

/** Wert je Würfelseite (+x, −x, +y, −y, +z, −z): oben hell, Sonnenseite rechts, Schattenseite links, vorne Mitte. */
const FACE_VALUES = [0.92, 0.56, 1.0, 0.4, 0.78, 0.62];

interface Slot {
  cell: CaseCell;
  entry: CatalogEntry;
  earned: CollectionEntry | null;
  member: HerdMember | null;
  /** Sekunden in Sicht (ungesehene Wesen hüpfen danach einmal). */
  inView: number;
  celebrated: boolean;
  marker: number;
}

interface Tween {
  t: number;
  d: number;
  apply: (k: number) => void;
  done?: () => void;
}

const _ray = new Raycaster();
const _plane = new Plane(new Vector3(0, 1, 0), 0);
const _hit = new Vector3();
const _ndc = new Vector2();
const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _c = new Color();

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export interface SetzkastenSceneOptions {
  rules: GenomeRules;
  /** Die Modulbibliothek des Bretts (Teile); darf nachkommen. */
  library: Promise<ModuleLibrary | null> | ModuleLibrary | null;
  /** Kopfzeile und Reiter decken oben so viele CSS-Pixel ab (Kasten scrollt darunter). */
  insetTop?: number;
  insetBottom?: number;
}

/**
 * Setzkasten (Iteration 4, Punkt 6): eine Zone je Seite als flach liegender Setzkasten, von oben gesehen wie das
 * Spielbrett. Wände = instanzierte Kisten, nur durch Wertkontrast getrennt (oben hell, Sonnenseite, Schattenseite),
 * harte Tintenschatten als flache Streifen (keine Shadow-Map, keine Konturen). In jedem Fach das erspielte Wesen in
 * genau seinem Aussehen (Seed + Art), lebendig (höchstens 12 zugleich, der Rest ruht), sonst seine Tinten-Silhouette;
 * Zonen, die noch nicht erreicht sind, bleiben unter einem Deckel. Scrollen per Ziehen mit Trägheit, Tippen öffnet
 * die Karte (Kamera fährt heran, das Wesen hüpft, wedelt oder stampft).
 */
export class SetzkastenScene implements SceneController {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 200);
  private ctx: SceneContext | null = null;
  private herd: CreatureHerd | null = null;
  private walls: InstancedMesh | null = null;
  private wallGeometry: BoxGeometry | null = null;
  private wallMaterial: MeshBasicMaterial | null = null;
  private layout: CaseLayout | null = null;
  private slots: Slot[] = [];
  private zone: ZoneId = 'tjorizo';
  private orientation: CaseOrientation = 'portrait';
  private width = 1;
  private height = 1;
  /** Scrollposition entlang der Hauptachse (Welt), Geschwindigkeit, Grenzen. */
  private scroll = 0;
  private velocity = 0;
  private bounds: [number, number] = [0, 0];
  /** Abstand der Kamera und Querversatz (Querformat: Kasten mittig im freien Band). */
  private dist = 10;
  private cross = 0;
  /** Blickpunkt-Versatz entlang der Achse, damit die Oberkante des Inhalts unter dem Kopf liegt. */
  private along: [number, number] = [0, 0];
  /** Offene Animationen. */
  private readonly tweens: Tween[] = [];
  /** Kasten-Versatz (Einblenden: von unten herein; Zonenwechsel: seitlich). */
  private readonly caseOffset = new Vector3();
  /** Heranfahren an ein Fach (0 = Übersicht, 1 = nah) und sein Ziel. */
  private zoom = 0;
  private readonly zoomTarget = new Vector3();
  private pointer: { id: number; x: number; y: number; x0: number; y0: number; t0: number; lastT: number; moved: boolean } | null = null;
  private membershipT = 0;
  private disposed = false;
  private readonly rules: GenomeRules;
  private insetTop: number;
  private insetBottom: number;
  private readonly unsub: Array<() => void> = [];
  private lastWalls = 0;
  private seenQueue: string[] = [];

  constructor(private readonly options: SetzkastenSceneOptions) {
    this.rules = options.rules;
    this.insetTop = options.insetTop ?? 132;
    this.insetBottom = options.insetBottom ?? 24;
  }

  // ------------------------------------------------------------------------------------------ lifecycle

  /**
   * Herde, Wände und Materialien — einmal gebaut, über alle Öffnungen behalten (neue Materialien kosteten bei jedem
   * Öffnen ≈ 0,6 s Knotenbau und Pipelines).
   */
  private async ensure(backend: SceneContext['backend'], width: number, height: number, compile: ((root: Scene | CreatureHerd['group']) => Promise<void>) | null): Promise<void> {
    if (this.herd || this.disposed) return;
    const lib = await Promise.resolve(this.options.library).catch(() => null);
    if (this.herd || this.disposed) return;
    const mobile = width < 700 || backend === 'webgl2';
    const colors = ZONE_COLORS[this.zone];
    const herd = new CreatureHerd({ rules: this.rules, library: lib, capacity: MAX_IN_VIEW, mobile, shadowLayer: null, contactShadows: { color: colors.ink, away: [-0.18, 0.12] }, maxPartPools: mobile ? 16 : 22 });
    if (compile) herd.compiler = (root) => compile(root as CreatureHerd['group']);
    this.herd = herd;
    this.scene.add(herd.group);
  }

  /**
   * Vorbereiten, während die Karte ruht (kein Bild, kleine Happen): Herde, Kasten der Zone, Wesen der ersten Fächer,
   * Pipelines. Danach zeigt das Öffnen sofort ein fertiges Bild.
   */
  async prewarm(renderer: SceneContext['renderer'], backend: SceneContext['backend'], width: number, height: number, idle: () => Promise<void>): Promise<void> {
    if (this.warm || this.ctx) return;
    await this.ensure(backend, width, height, backend === 'webgpu' ? (root) => renderer.compileAsync(root, this.camera, this.scene) : null);
    const herd = this.herd;
    if (!herd || this.ctx || this.disposed) return;
    await idle();
    if (this.ctx || this.disposed) return;
    this.width = width;
    this.height = height;
    this.orientation = width > height * 1.05 ? 'landscape' : 'portrait';
    this.zone = useSetzkasten.getState().zone;
    this.build();
    this.placeCamera();
    this.updateMembership(false);
    // Wesen in Happen anlegen (jeder Happen: zwei Rigs, ihre erste Spur, höchstens ein neues Artenmesh).
    let worst = 0;
    for (let guard = 0; guard < 40 && !this.ctx && !this.disposed; guard++) {
      await idle();
      if (this.ctx || this.disposed) return;
      const t0 = performance.now();
      const before = herd.size;
      this.fillMembers(1);
      herd.update(0, this.camera);
      worst = Math.max(worst, performance.now() - t0);
      if (herd.size === before) break;
    }
    if (import.meta.env.DEV) console.debug(`[setzkasten] vorwärmen: längster Happen ${worst.toFixed(1)} ms`);
    if (this.ctx || this.disposed) return;
    if (backend === 'webgpu') {
      await idle();
      const t0 = performance.now();
      try {
        const done = renderer.compileAsync(this.scene, this.camera);
        if (import.meta.env.DEV) console.debug(`[setzkasten] vorwärmen: Pipelines (synchroner Teil) ${(performance.now() - t0).toFixed(1)} ms`);
        await done;
      } catch {
        /* beim ersten Zeichnen */
      }
    }
    this.warm = true;
  }

  private warm = false;

  /** Vorgewärmt (Pipelines gebaut). */
  get isWarm(): boolean {
    return this.warm;
  }

  /** Zone, Ausrichtung und erspielte Wesen, für die der Kasten gebaut ist. */
  private built: { zone: ZoneId; orientation: CaseOrientation; earned: string } | null = null;

  private earnedSignature(): string {
    return Object.keys(useProgress.getState().collection).sort().join(',');
  }

  async mount(ctx: SceneContext): Promise<void> {
    const t0 = performance.now();
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = false;
    if (ctx.renderer.getPixelRatio() > MAX_DPR) {
      ctx.renderer.setPixelRatio(MAX_DPR);
      ctx.renderer.setSize(ctx.width, ctx.height, false);
    }
    await this.ensure(ctx.backend, ctx.width, ctx.height, ctx.backend === 'webgpu' ? (root) => ctx.renderer.compileAsync(root, this.camera, this.scene) : null);
    const herd = this.herd;
    if (!herd || this.ctx !== ctx) return;
    this.zone = useSetzkasten.getState().zone;
    this.orientation = ctx.width > ctx.height * 1.05 ? 'landscape' : 'portrait';
    this.width = ctx.width;
    this.height = ctx.height;
    const b = this.built;
    if (!b || b.zone !== this.zone || b.orientation !== this.orientation || b.earned !== this.earnedSignature()) this.build();
    else {
      // Wieder offen, derselbe Kasten: die Funde auffrischen (gesehen?), Marken neu, oben anfangen.
      const collection = useProgress.getState().collection;
      for (const s of this.slots) s.earned = collection[s.entry.key] ?? null;
      if (this.layout) this.buildWalls(this.layout, ZONE_COLORS[this.zone]);
      this.placeCamera();
      this.scroll = this.bounds[0];
    }
    this.zoom = 0;
    this.velocity = 0;
    // Das Einblenden: der Kasten gleitet von unten herein (die DOM-Schicht öffnet ihre Schublade darüber).
    this.caseOffset.set(0, 0, 4);
    this.addTween(0.45, (k) => this.caseOffset.set(0, 0, 4 * (1 - easeOutCubic(k))));
    this.unsub.push(
      useSetzkasten.subscribe((s, prev) => {
        if (s.zone !== prev.zone) this.switchZone(s.zone, s.zone > prev.zone ? 1 : -1);
        if (!s.card && prev.card) this.unzoom();
      }),
      useProgress.subscribe((s, prev) => {
        if (s.collection !== prev.collection) this.refreshEarned();
      }),
    );
    const tA = performance.now();
    this.placeCamera();
    // Ein paar Wesen sofort (das erste Bild ist nicht leer), der Rest ploppt in den nächsten Bildern ein.
    this.updateMembership(false);
    const tB = performance.now();
    herd.update(0, this.camera);
    const tC = performance.now();
    // Pipelines vor dem ersten Bild, solange der Kasten noch nicht vorgewärmt ist (WebGPU: asynchron).
    if (ctx.backend === 'webgpu' && !this.warm) {
      try {
        await ctx.renderer.compileAsync(this.scene, this.camera);
      } catch {
        /* beim ersten Zeichnen */
      }
      this.warm = true;
    }
    if (import.meta.env.DEV) console.debug(`[setzkasten] mount: setup ${(tA - t0).toFixed(0)} ms, members ${(tB - tA).toFixed(0)} ms, update ${(tC - tB).toFixed(0)} ms, compile ${(performance.now() - tC).toFixed(0)} ms`);
    if (import.meta.env.DEV) (window as unknown as { __ee?: Record<string, unknown> }).__ee = { ...((window as unknown as { __ee?: Record<string, unknown> }).__ee ?? {}), setzkasten: this };
  }

  resize(ctx: SceneContext): void {
    this.width = ctx.width;
    this.height = ctx.height;
    const o: CaseOrientation = ctx.width > ctx.height * 1.05 ? 'landscape' : 'portrait';
    if (o !== this.orientation) {
      this.orientation = o;
      this.build();
    }
    this.placeCamera();
  }

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    const herd = this.herd;
    if (!herd) {
      ctx.renderer.render(this.scene, this.camera);
      return;
    }
    this.stepTweens(dt);
    this.stepScroll(dt);
    this.placeCamera();
    this.membershipT -= dt;
    if (this.membershipT <= 0) {
      this.membershipT = 0.25;
      this.updateMembership(false);
    } else this.fillMembers();
    this.trackSeen(dt);
    herd.group.position.copy(this.caseOffset);
    if (this.walls) this.walls.position.copy(this.caseOffset);
    herd.pump(1.5);
    herd.update(dt, this.camera);
    ctx.renderer.render(this.scene, this.camera);
  }

  /**
   * Das Overlay schließt: Eingaben, Animationen und Abos weg; Herde, Wände und Wesen bleiben (das nächste Öffnen
   * zeigt sofort ein fertiges Bild). `destroy` gibt alles frei.
   */
  dispose(): void {
    if (this.ctx) this.markShown();
    this.flushSeen();
    for (const u of this.unsub) u();
    this.unsub.length = 0;
    this.tweens.length = 0;
    this.pointer = null;
    this.zoom = 0;
    this.velocity = 0;
    this.caseOffset.set(0, 0, 0);
    this.ctx = null;
    const ee = (window as unknown as { __ee?: Record<string, unknown> }).__ee;
    if (ee && ee['setzkasten'] === this) delete ee['setzkasten'];
  }

  /** Gibt Herde, Wände und Materialien frei (die Karte verlässt den Flow). */
  destroy(): void {
    this.dispose();
    this.disposed = true;
    this.herd?.dispose();
    this.herd = null;
    this.wallGeometry?.dispose();
    this.wallMaterial?.dispose();
    this.walls?.removeFromParent();
    this.walls = null;
    this.slots = [];
    this.built = null;
    this.scene.clear();
  }

  // ------------------------------------------------------------------------------------------ input

  pointerDown(id: number, x: number, y: number): void {
    const now = performance.now();
    this.pointer = { id, x, y, x0: x, y0: y, t0: now, lastT: now, moved: false };
    this.velocity = 0;
  }

  pointerMove(id: number, x: number, y: number): void {
    const p = this.pointer;
    if (!p || p.id !== id) return;
    const dx = x - p.x;
    const dy = y - p.y;
    const now = performance.now();
    if (!p.moved && Math.hypot(x - p.x0, y - p.y0) > 8) p.moved = true;
    if (p.moved && this.zoom < 0.01) {
      const along = this.orientation === 'portrait' ? dy : dx;
      const cross = this.orientation === 'portrait' ? Math.abs(x - p.x0) : Math.abs(y - p.y0);
      const main = this.orientation === 'portrait' ? Math.abs(y - p.y0) : Math.abs(x - p.x0);
      // Quer gewischt (Seitenwechsel) scrollt nicht.
      if (!(cross > 30 && cross > main * 1.3)) {
        const upp = this.unitsPerPixel();
        const delta = -along * upp;
        this.scroll = this.rubber(this.scroll + delta);
        const dtp = Math.max(1, now - p.lastT) / 1000;
        this.velocity = 0.7 * this.velocity + 0.3 * (delta / dtp);
      }
    }
    p.x = x;
    p.y = y;
    p.lastT = now;
  }

  pointerUp(id: number, x: number, y: number): void {
    const p = this.pointer;
    this.pointer = null;
    if (!p || p.id !== id) return;
    const dt = performance.now() - p.t0;
    const dx = x - p.x0;
    const dy = y - p.y0;
    if (!p.moved && dt < 450) {
      this.tap(x, y);
      return;
    }
    // Seitenwechsel: quer zur Scrollrichtung gewischt.
    const cross = this.orientation === 'portrait' ? dx : dy;
    const main = this.orientation === 'portrait' ? dy : dx;
    if (Math.abs(cross) > 60 && Math.abs(cross) > Math.abs(main) * 1.3 && this.zoom < 0.01) {
      const zones: ZoneId[] = ['tjorizo', 'syrup', 'luzz', 'wooding'];
      const i = zones.indexOf(this.zone);
      const next = zones[Math.min(zones.length - 1, Math.max(0, i + (cross < 0 ? 1 : -1)))]!;
      if (next !== this.zone) useSetzkasten.getState().setZone(next);
      this.velocity = 0;
      return;
    }
    if (performance.now() - p.lastT > 80) this.velocity = 0;
  }

  /** Die DOM-Schicht meldet, wie viel oben (Kopf, Reiter) und unten sie abdeckt (CSS-Pixel). */
  setInsets(top: number, bottom: number): void {
    if (Math.abs(top - this.insetTop) < 1 && Math.abs(bottom - this.insetBottom) < 1) return;
    this.insetTop = top;
    this.insetBottom = bottom;
    this.placeCamera();
  }

  /** Mausrad / Trackpad (CSS-Pixel). */
  wheel(dx: number, dy: number): void {
    if (this.zoom > 0.01) return;
    const d = this.orientation === 'portrait' ? dy : Math.abs(dx) > Math.abs(dy) ? dx : dy;
    this.scroll = this.rubber(this.scroll + d * this.unitsPerPixel());
    this.velocity = 0;
  }

  /** Bildschirmpunkt (CSS-Pixel) eines Fachs, für Tests und Barrierefreiheit; null außerhalb der Sicht. */
  screenPoint(key: string): { x: number; y: number } | null {
    const slot = this.slots.find((s) => s.entry.key === key);
    if (!slot) return null;
    const c = this.cellCenter(slot.cell, _p).add(this.caseOffset);
    c.project(this.camera);
    if (Math.abs(c.x) > 1 || Math.abs(c.y) > 1) return null;
    const x = ((c.x + 1) / 2) * this.width;
    const y = ((1 - c.y) / 2) * this.height;
    // Unter Kopf und Reitern liegt ein Fach nicht frei.
    if (y < this.insetTop || y > this.height - this.insetBottom) return null;
    return { x, y };
  }

  /** Lebende und ruhende Wesen, Zeichenaufrufe (Budget-Prüfung in Tests). */
  get stats(): { members: number; alive: number; drawCalls: number } {
    const members = this.herd?.members ?? [];
    return { members: members.length, alive: members.filter((m) => m.motion).length, drawCalls: (this.herd?.drawCalls ?? 0) + 1 };
  }

  /** Scrollt zu einem Fach (Tests, "zum neuesten Wesen"). */
  scrollTo(key: string): void {
    const slot = this.slots.find((s) => s.entry.key === key);
    if (!slot) return;
    const c = this.cellCenter(slot.cell, _p);
    this.scroll = this.clamp(this.orientation === 'portrait' ? c.z : c.x);
    this.velocity = 0;
  }

  // ------------------------------------------------------------------------------------------ build

  /** Baut den Kasten der aktuellen Zone (Wände, Schatten, Marken) und leert die Herde. */
  private build(): void {
    const herd = this.herd;
    if (!herd) return;
    herd.clear();
    const colors = ZONE_COLORS[this.zone];
    this.scene.background = new Color(colors.table);
    herd.setContactColor(colors.ink);
    const entries = catalogFor(this.rules).filter((e) => e.zone === this.zone);
    const layout = layoutCase(entries, this.orientation);
    this.layout = layout;
    const collection = useProgress.getState().collection;
    this.slots = layout.cells.map((cell) => ({ cell, entry: cell.entry, earned: collection[cell.entry.key] ?? null, member: null, inView: 0, celebrated: false, marker: -1 }));
    // Die Arten der Zone im Hintergrund vermaschen (erst die Fächer oben).
    for (const s of this.slots) if (s.entry.species !== 'blob') herd.prepare(this.genomeOf(s));
    this.buildWalls(layout, colors);
    this.built = { zone: this.zone, orientation: this.orientation, earned: this.earnedSignature() };
    this.pendingFill = null;
    // Scrollgrenzen und Anfang: oben (Hochformat) bzw. links (Querformat).
    this.placeCamera();
    this.scroll = this.bounds[0];
    this.velocity = 0;
    this.membershipT = 0;
  }

  private locked(): boolean {
    const reached = useProgress.getState().reached;
    const first = ZONE_LEVELS[this.zone][0];
    return reached < first - 1 && !this.slots.some((s) => s.earned);
  }

  private buildWalls(layout: CaseLayout, colors: CaseColors): void {
    const walls = caseWalls(layout);
    const locked = this.locked();
    const unseen = this.slots.filter((s) => s.earned && !s.earned.seen).length;
    // Kisten: Tischschatten, Boden, Wände, Schatten (je Wand einer), Marken, Deckel.
    const count = 2 + walls.length * 2 + unseen + (locked ? 40 : 0) + 4;
    if (!this.walls || this.lastWalls < count) {
      this.walls?.removeFromParent();
      this.wallGeometry?.dispose();
      this.wallMaterial?.dispose();
      const geo = new BoxGeometry(1, 1, 1);
      // Wertstufen je Seite als Vertexfarbe (die Instanzfarbe gibt den Ton).
      const col = new Float32Array(geo.getAttribute('position').count * 3);
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) col.set([FACE_VALUES[f]!, FACE_VALUES[f]!, FACE_VALUES[f]!], (f * 4 + k) * 3);
      geo.setAttribute('color', new BufferAttribute(col, 3));
      const mat = new MeshBasicMaterial({ vertexColors: true });
      const mesh = new InstancedMesh(geo, mat, Math.max(64, Math.ceil(count * 1.5)));
      mesh.name = 'setzkasten-walls';
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.walls = mesh;
      this.wallGeometry = geo;
      this.wallMaterial = mat;
      this.lastWalls = mesh.instanceMatrix.count;
    }
    const mesh = this.walls;
    let n = 0;
    const box = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string): number => {
      _m.compose(_p.set(x, y, z), _q.identity(), _s.set(sx, sy, sz));
      mesh.setMatrixAt(n, _m);
      mesh.setColorAt(n, _c.set(color));
      return n++;
    };
    const ox = this.orientation === 'portrait' ? -layout.width / 2 : 0;
    const oz = this.orientation === 'landscape' ? -layout.height / 2 : 0;
    const W = layout.width + WALL_T;
    const H = layout.height + WALL_T;
    const cx = ox + layout.width / 2;
    const cz = oz + layout.height / 2;
    // Harter Versatzschatten des ganzen Kastens auf dem Tisch (nach links unten), dann der Boden.
    box(cx + CASE_SHADOW[0], -FLOOR_T - 0.02, cz + CASE_SHADOW[1], W + 0.1, 0.02, H + 0.1, colors.ink);
    box(cx, -FLOOR_T / 2, cz, W + 0.1, FLOOR_T, H + 0.1, colors.floor);
    for (const w of walls) {
      const horizontal = Math.abs(w.v0 - w.v1) < 1e-6;
      const len = horizontal ? Math.abs(w.u1 - w.u0) : Math.abs(w.v1 - w.v0);
      const mx = ox + (w.u0 + w.u1) / 2;
      const mz = oz + (w.v0 + w.v1) / 2;
      const tone = w.outer ? mixHex(colors.wood, colors.ink, 0.12) : colors.wood;
      if (horizontal) {
        box(mx, WALL_H / 2, mz, len + WALL_T, WALL_H, WALL_T, tone);
        // Schatten fällt nach vorn (zur Kamera, bildunten): ein Tintenstreifen vor der Wand.
        box(mx - SHADOW_LEFT * 0.5, 0.004, mz + WALL_T / 2 + SHADOW_NEAR / 2, len, 0.006, SHADOW_NEAR, colors.ink);
      } else {
        box(mx, WALL_H / 2, mz, WALL_T, WALL_H, len + WALL_T, tone);
        // Schatten fällt nach links: ein Tintenstreifen links der Wand.
        box(mx - WALL_T / 2 - SHADOW_LEFT / 2, 0.004, mz + SHADOW_NEAR * 0.5, SHADOW_LEFT, 0.006, len, colors.ink);
      }
    }
    // Neu-Marken: ein kleines Akzent-Plättchen oben links im Fach, bis das Wesen gesehen wurde.
    for (const s of this.slots) {
      s.marker = -1;
      if (!s.earned || s.earned.seen) continue;
      const c = s.cell;
      s.marker = box(ox + c.u + 0.24, 0.035, oz + c.v + 0.2, 0.28, 0.07, 0.14, colors.accent);
    }
    if (locked) {
      // Deckel: Bretter quer zum Kasten (zwei Töne im Wechsel, nur Wertkontrast), darunter ein harter Schatten.
      box(cx + CASE_SHADOW[0] * 0.5, WALL_H + 0.02, cz + CASE_SHADOW[1] * 0.5, W + 0.14, 0.03, H + 0.14, colors.ink);
      const light = mixHex(colors.wood, colors.floor, 0.25);
      const dark = mixHex(colors.wood, colors.floor, 0.6);
      const portrait = this.orientation === 'portrait';
      const span = portrait ? H + 0.14 : W + 0.14;
      const boards = Math.max(3, Math.round(span / 1.35));
      const bw = span / boards;
      for (let i = 0; i < boards; i++) {
        const t = -span / 2 + bw * (i + 0.5);
        if (portrait) box(cx, WALL_H + 0.06, cz + t, W + 0.14, 0.08, bw, i % 2 === 0 ? light : dark);
        else box(cx + t, WALL_H + 0.06, cz, bw, 0.08, H + 0.14, i % 2 === 0 ? light : dark);
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  /** Das Aussehen eines Fachs: der gespeicherte Fund (Seed + Art) oder eine echte Linie dieser Art (Silhouette). */
  private genomeOf(s: Slot): { zone: ZoneId; tier: number; seed: number; species: CatalogEntry['species'] } {
    const e = s.entry;
    return { zone: e.zone, tier: e.tier, seed: s.earned?.seed ?? seedFor(this.rules, e), species: e.species };
  }

  private refreshEarned(): void {
    const collection = useProgress.getState().collection;
    let changed = false;
    for (const s of this.slots) {
      const e = collection[s.entry.key] ?? null;
      if ((e === null) !== (s.earned === null)) changed = true;
      s.earned = e;
    }
    if (changed) this.build();
  }

  private switchZone(zone: ZoneId, dir: number): void {
    if (zone === this.zone) return;
    this.markShown();
    this.flushSeen();
    this.zone = zone;
    this.zoom = 0;
    this.herd?.clear();
    this.build();
    audio.sfx('clack', { zone });
    // Die neue Seite gleitet von der Seite herein.
    const from = dir * 3.5;
    const portrait = this.orientation === 'portrait';
    this.addTween(0.32, (k) => {
      const v = from * (1 - easeOutCubic(k));
      this.caseOffset.set(portrait ? v : 0, 0, portrait ? 0 : v);
    });
  }

  // ------------------------------------------------------------------------------------------ camera & scroll

  private placeCamera(): void {
    const layout = this.layout;
    if (!layout) return;
    const aspect = this.width / Math.max(1, this.height);
    const cam = this.camera;
    cam.aspect = aspect;
    cam.fov = FOV;
    cam.updateProjectionMatrix();
    const tanV = Math.tan((FOV * Math.PI) / 360);
    const tanH = tanV * aspect;
    const portrait = this.orientation === 'portrait';
    const free = 1 - (this.insetTop + this.insetBottom) / Math.max(1, this.height);
    if (portrait) {
      // Kastenbreite + Rand füllt die Bildschirmbreite.
      this.dist = (layout.width / 2 + 0.3) / tanH;
    } else {
      // Kastentiefe (4) + Rand füllt das freie Band unter dem Kopf; der Blick senkt sich, damit er mittig liegt.
      const need = (layout.height + 2.4) * Math.sin(PITCH) + WALL_H * Math.cos(PITCH);
      this.dist = need / 2 / (tanV * Math.max(0.3, free));
    }
    // Sichtbare Kanten relativ zum Blickpunkt (bei Blickpunkt 0 gemessen; die Kamera verschiebt sich starr):
    // Oberkante knapp unter dem Kopf, Unterkante über dem Rand.
    const topNdc = 1 - (2 * this.insetTop) / Math.max(1, this.height);
    const botNdc = -1 + (2 * this.insetBottom) / Math.max(1, this.height);
    const scroll = this.scroll;
    this.scroll = 0;
    this.cross = 0;
    this.aim(0);
    if (portrait) {
      const a = this.floorAt(0, topNdc);
      const b = this.floorAt(0, botNdc);
      this.along = [a ? a.z : -3, b ? b.z : 3];
      this.bounds = this.limits(-0.35, layout.height + 0.35, this.along);
    } else {
      const mid = (topNdc + botNdc) / 2;
      const l = this.floorAt(-1, mid);
      const r = this.floorAt(1, mid);
      this.along = [l ? l.x : -3, r ? r.x : 3];
      this.bounds = this.limits(-0.4, layout.width + 0.4, this.along);
      // Querachse: die Mitte des Kastens (z = 0) in die Mitte des freien Bands.
      const m = this.floorAt(0, mid);
      this.cross = m ? -m.z : 0;
    }
    this.scroll = scroll;
    this.aim(this.zoom);
  }

  /** Blickpunkt auf dem Boden und Kamera darüber (mit Heranfahren an ein Fach). */
  private aim(zoom: number): void {
    const portrait = this.orientation === 'portrait';
    const tx = portrait ? 0 : this.scroll;
    const tz = portrait ? this.scroll : this.cross;
    const k = easeInOut(Math.min(1, Math.max(0, zoom)));
    const x = tx + (this.zoomTarget.x - tx) * k;
    const z = tz + (this.zoomTarget.z - tz) * k;
    const d = this.dist * (1 - 0.62 * k);
    const cam = this.camera;
    cam.position.set(x, d * Math.sin(PITCH), z + d * Math.cos(PITCH));
    cam.lookAt(x, 0, z);
    cam.updateMatrixWorld(true);
  }

  /** Punkt auf dem Kastenboden unter einem NDC-Punkt (bei Blickpunkt 0). */
  private floorAt(ndcX: number, ndcY: number): Vector3 | null {
    _ndc.set(ndcX, ndcY);
    _ray.setFromCamera(_ndc, this.camera);
    return _ray.ray.intersectPlane(_plane, _hit) ? _hit.clone() : null;
  }

  /** Scrollbereich: Inhalt [start, end] soll zwischen den sichtbaren Kanten [a, b] (relativ zum Blickpunkt) liegen. */
  private limits(start: number, end: number, [a, b]: [number, number]): [number, number] {
    const lo = start - a;
    const hi = end - b;
    return lo <= hi ? [lo, hi] : [(lo + hi) / 2, (lo + hi) / 2];
  }

  private clamp(s: number): number {
    return Math.min(this.bounds[1], Math.max(this.bounds[0], s));
  }

  /** Über die Grenzen hinaus nur mit Widerstand (Gummiband). */
  private rubber(s: number): number {
    const [lo, hi] = this.bounds;
    if (s < lo) return lo - (lo - s) * 0.5;
    if (s > hi) return hi + (s - hi) * 0.5;
    return s;
  }

  private unitsPerPixel(): number {
    const span = this.along[1] - this.along[0];
    const px = this.orientation === 'portrait' ? this.height - this.insetTop - this.insetBottom : this.width;
    return Math.abs(span) / Math.max(1, px);
  }

  private stepScroll(dt: number): void {
    if (this.pointer?.moved) return;
    const [lo, hi] = this.bounds;
    if (Math.abs(this.velocity) > 1e-3) {
      this.scroll += this.velocity * dt;
      this.velocity *= Math.exp(-dt * 4.5);
      if (this.scroll < lo || this.scroll > hi) this.velocity *= Math.exp(-dt * 12);
    } else this.velocity = 0;
    // Zurückfedern an den Enden.
    if (this.scroll < lo) this.scroll += (lo - this.scroll) * (1 - Math.exp(-dt * 10));
    if (this.scroll > hi) this.scroll += (hi - this.scroll) * (1 - Math.exp(-dt * 10));
  }

  // ------------------------------------------------------------------------------------------ creatures

  private cellCenter(c: CaseCell, out: Vector3): Vector3 {
    const layout = this.layout!;
    const ox = this.orientation === 'portrait' ? -layout.width / 2 : 0;
    const oz = this.orientation === 'landscape' ? -layout.height / 2 : 0;
    return out.set(ox + c.u + c.w / 2, 0, oz + c.v + c.h / 2);
  }

  /** Sichtbares Bodenrechteck (mit Rand). */
  private viewRect(margin: number): [number, number, number, number] {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      const h = this.floorAt(x, y);
      if (!h) continue;
      minX = Math.min(minX, h.x);
      maxX = Math.max(maxX, h.x);
      minZ = Math.min(minZ, h.z);
      maxZ = Math.max(maxZ, h.z);
    }
    return [minX - margin - this.caseOffset.x, maxX + margin - this.caseOffset.x, minZ - margin - this.caseOffset.z, maxZ + margin - this.caseOffset.z];
  }

  /**
   * Welche Fächer ein Wesen haben (in Sicht, höchstens 36, nächste zur Bildmitte zuerst) und welche davon leben
   * (erspielte, höchstens 12, nahe der Mitte). `force` baut sofort alle (Öffnen).
   */
  private updateMembership(force: boolean): void {
    const herd = this.herd;
    const layout = this.layout;
    if (!herd || !layout) return;
    if (this.locked()) {
      for (const s of this.slots) this.dropMember(s);
      return;
    }
    const [x0, x1, z0, z1] = this.viewRect(0.4);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const want: Array<{ s: Slot; d: number }> = [];
    for (const s of this.slots) {
      const c = this.cellCenter(s.cell, _p);
      const inside = c.x + s.cell.w / 2 > x0 && c.x - s.cell.w / 2 < x1 && c.z + s.cell.h / 2 > z0 && c.z - s.cell.h / 2 < z1;
      if (inside) want.push({ s, d: Math.hypot(c.x - cx, c.z - cz) });
    }
    want.sort((a, b) => a.d - b.d);
    const keep = new Set(want.slice(0, MAX_IN_VIEW).map((w) => w.s));
    for (const s of this.slots) if (!keep.has(s)) this.dropMember(s);
    this.fillMembers(force ? Infinity : ADDS_PER_FRAME, keep);
    // Lebendig: die erspielten nahe der Mitte.
    let alive = 0;
    for (const { s } of want) {
      const m = s.member;
      if (!m) continue;
      const on = !!s.earned && alive < MAX_ALIVE;
      if (on) alive++;
      if (!!m.motion !== on) herd.setAnimated(m, on, ALIVE_TRACE);
    }
  }

  private pendingFill: Set<Slot> | null = null;

  /** Legt fehlende Wesen an (verteilt über Bilder). */
  private fillMembers(budget = ADDS_PER_FRAME, keep?: Set<Slot>): void {
    const herd = this.herd;
    if (!herd) return;
    if (keep) this.pendingFill = keep;
    const want = this.pendingFill;
    if (!want) return;
    let n = 0;
    for (const s of want) {
      if (s.member) continue;
      if (n >= budget || herd.full) break;
      this.addMember(s);
      n++;
    }
  }

  private addMember(s: Slot): void {
    const herd = this.herd!;
    const colors = ZONE_COLORS[this.zone];
    const c = s.cell;
    const g = this.genomeOf(s);
    const spec = herd.resolve(g);
    const sk = spec.skeleton;
    const extent = spec.bodyType === 'blob' ? 2.3 : Math.max(2.1, sk.length * 0.84, sk.width);
    const room = Math.min(c.w, c.h);
    const growth = 0.86 + 0.014 * g.tier;
    const scale = ((room - WALL_T) * 0.7 * growth) / extent;
    const idx = this.slots.indexOf(s);
    const m = herd.add({
      genome: g,
      scale,
      animated: false,
      silhouette: s.earned ? null : colors.silhouette,
      yaw: (idx % 2 === 0 ? 1 : -1) * (0.35 + ((idx * 0.37) % 0.3)),
      at: [0, 0],
    });
    if (!m) return;
    const center = this.cellCenter(c, _p);
    // Etwas nach vorn: die Köpfe haben hinten Platz.
    m.origin.set(center.x, 0, center.z + c.h * 0.06);
    m.quaternion.identity();
    m.pop = 0.001;
    s.member = m;
    const target = m;
    this.addTween(0.24, (k) => (target.pop = Math.max(0.001, easeOutCubic(k) * (1 + 0.18 * Math.sin(k * Math.PI)))), () => (target.pop = 1));
  }

  private dropMember(s: Slot): void {
    if (!s.member) return;
    this.herd?.remove(s.member);
    s.member = null;
  }

  /**
   * Ungesehene Wesen hüpfen einmal, wenn sie eine Weile in Sicht waren; ihre Neu-Marke bleibt, bis die Karte sie zeigt
   * oder der Kasten geschlossen bzw. umgeblättert wird (dann gilt alles Gezeigte als gesehen).
   */
  private trackSeen(dt: number): void {
    for (const s of this.slots) {
      if (!s.earned || s.earned.seen || s.celebrated) continue;
      if (!s.member || s.member.pop < 0.99) {
        s.inView = 0;
        continue;
      }
      s.inView += dt;
      if (s.inView < 0.8) continue;
      s.celebrated = true;
      this.celebrate(s);
    }
  }

  private hideMarker(s: Slot): void {
    if (s.marker < 0 || !this.walls) return;
    _m.makeScale(0, 0, 0);
    this.walls.setMatrixAt(s.marker, _m);
    this.walls.instanceMatrix.needsUpdate = true;
    s.marker = -1;
  }

  /** Wer im Kasten zu sehen war (ein Wesen im Fach), gilt beim Schließen oder Blättern als gesehen. */
  private markShown(): void {
    for (const s of this.slots) if (s.member && s.earned && !s.earned.seen && !this.seenQueue.includes(s.entry.key)) this.seenQueue.push(s.entry.key);
  }

  private flushSeen(): void {
    if (this.seenQueue.length === 0) return;
    const keys = this.seenQueue;
    this.seenQueue = [];
    // `refreshEarned` sieht nur die Sammlung als Ganzes: ein Umbau ist nicht nötig (nur `seen` ändert sich).
    useProgress.getState().markSeen(keys);
  }

  /** Ein kleiner Hüpfer (neu entdeckt). */
  private celebrate(s: Slot): void {
    const m = s.member;
    const herd = this.herd;
    if (!m || !herd) return;
    herd.poke(m, 0.7);
  }

  // ------------------------------------------------------------------------------------------ tap & card

  private tap(x: number, y: number): void {
    const layout = this.layout;
    if (!layout) return;
    if (useSetzkasten.getState().card) {
      useSetzkasten.getState().setCard(null);
      return;
    }
    if (this.locked()) {
      audio.sfx('locked', { zone: this.zone });
      return;
    }
    const h = this.floorAt((x / this.width) * 2 - 1, 1 - (y / this.height) * 2);
    if (!h) return;
    h.sub(this.caseOffset);
    const ox = this.orientation === 'portrait' ? -layout.width / 2 : 0;
    const oz = this.orientation === 'landscape' ? -layout.height / 2 : 0;
    const u = h.x - ox;
    const v = h.z - oz;
    const s = this.slots.find((q) => u >= q.cell.u && u <= q.cell.u + q.cell.w && v >= q.cell.v && v <= q.cell.v + q.cell.h);
    if (!s) return;
    this.select(s);
  }

  private select(s: Slot): void {
    const e = s.entry;
    const levelNo = s.earned ? s.earned.node + 1 : null;
    useSetzkasten.getState().setCard({ key: e.key, zone: e.zone, tier: e.tier, species: e.species, earned: !!s.earned, level: levelNo, p: e.p });
    if (s.earned && !s.earned.seen) {
      this.seenQueue.push(e.key);
      this.hideMarker(s);
    }
    this.flushSeen();
    // Heranfahren: das Fach in die obere Bildhälfte (die Karte liegt unten).
    const c = this.cellCenter(s.cell, _p).add(this.caseOffset);
    const portrait = this.orientation === 'portrait';
    this.zoomTarget.set(c.x, 0, c.z + (portrait ? 0.9 : 0.5));
    const z0 = this.zoom;
    this.addTween(0.38, (k) => (this.zoom = z0 + (1 - z0) * easeOutCubic(k)));
    const m = s.member;
    const herd = this.herd;
    if (!s.earned || !m || !herd) {
      audio.sfx('uiTick', { zone: e.zone });
      return;
    }
    // Das Wesen zeigt sich: lebendig, dann hüpfen (Blobs), wedeln (Vierbeiner), stampfen (die Schweren).
    herd.setAnimated(m, true, 1);
    const motion = m.motion;
    const body = m.spec.bodyType;
    audio.sfx('creatureVoice', { zone: e.zone, tier: e.tier, body });
    if (!motion) {
      herd.poke(m, 1);
      return;
    }
    const ctl = motion.controller;
    ctl.faceDirection([ctl.position[0], ctl.position[1] + 5]);
    window.setTimeout(() => {
      if (!s.member || s.member !== m || !m.motion) return;
      const c2 = m.motion.controller;
      const [px, pz] = c2.position;
      if (body === 'blob') c2.jumpTo(px + 0.001, pz + 0.001);
      else if (body === 'heavy' || body === 'biped') {
        m.motion.stompMerge({});
        if (m.spec.species === 'rex') c2.roar();
      } else {
        m.rig?.trigger('wag', 1);
        m.rig?.trigger('twitch', 1);
        c2.openMouth(0.8);
        window.setTimeout(() => m.motion?.controller.closeMouth(), 600);
        herd.poke(m, 0.6);
      }
    }, 260);
  }

  private unzoom(): void {
    const z0 = this.zoom;
    if (z0 <= 0) return;
    this.addTween(0.3, (k) => (this.zoom = z0 * (1 - easeOutCubic(k))));
  }

  // ------------------------------------------------------------------------------------------ tweens

  private addTween(d: number, apply: (k: number) => void, done?: () => void): void {
    const tw: Tween = { t: 0, d, apply };
    if (done) tw.done = done;
    this.tweens.push(tw);
    apply(0);
  }

  private stepTweens(dt: number): void {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i]!;
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.d);
      tw.apply(k);
      if (k >= 1) {
        this.tweens.splice(i, 1);
        tw.done?.();
      }
    }
  }
}
