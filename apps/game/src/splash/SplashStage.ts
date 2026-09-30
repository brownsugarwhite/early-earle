/**
 * Der Splash als eigene Bühne über dem Canvas (#ee-splash, außerhalb von #root): übernimmt den Loader aus index.html
 * (Inline-Boot), baut das Logo als SVG aus Florians Vektoren (logo.gen.ts), spielt nach 100 % die Choreografie
 * (choreo.ts), wartet auf "Tippen" und übergibt den i-Punkt an den 3D-Helden (gleiche Mitte, gleicher Radius).
 *
 * Lebenszyklus: `acquireSplash()` / `releaseSplash()` (FlowSplash, StrictMode-fest per Zählung), Phasen des
 * Flow-Stores: nur in 'splash' sichtbar — jede andere Phase blendet aus (nach der Übergabe bzw. sofort).
 * Testschalter `?splash=`: manual (Uhr steht, window.__eeSplash.seek/outro/loader), fast (×6, keine
 * Mindestdauer), final (gleich der Leerlauf), overlay (PNG darunter, Differenz, IoU je Teil), launchframe (erstes
 * Loader-Bild stehend, für das iOS-Startbild).
 */
import { LOGO } from './logo.gen';
import { GLYPHS } from './glyphs.gen';
import { bootInline, type EeBoot } from '../boot/bootInline';
import { boot, setCanvasCovered } from '../boot/bootProgress';
import { bootData, splashMarkup, STEM_SKEW } from './markup';
import { SHADOW_K, sweepPath, aroundPoint, compose, matrixAttr, ringPath, type Affine, type Pt, type Ring } from './longShadow';
import { buildIntro, buildOutro, initialLook, INTRO_END, OUTRO_END, DOT, BLOB_R, STEM_NORMAL, CONTACT, STEM_ANGLE, TIPPEN, type Look } from './choreo';
import { makeTongue, flameShape, flameStep, smoothPath, tipIndex, embers, type Tongue } from './flame';
import { gullPath, gullMatrix, gullShape } from './gull';
import type { Timeline } from './timeline';
import { useFlowStore } from '../flow/flowStore';
import { audio } from '../audio/engine';
import type { SfxId, SfxParams } from '../audio/sfx';
import { IS_NATIVE } from '../editor/content/target';

export type SplashMode = 'normal' | 'manual' | 'fast' | 'final' | 'overlay' | 'launchframe';
type StageState = 'dormant' | 'loader' | 'intro' | 'idle' | 'outro' | 'handoff' | 'fading';

const NS = 'http://www.w3.org/2000/svg';
const L = LOGO.light as unknown as Pt;
/** Lochradius über dem i-Punkt relativ zum Blob (wie bisher: weiche Kante des 3D-Helden verschwindet darin). */
const HOLE_FACTOR = 1.14;
const FADE_MS = 550;
/** "Tippen": Caprasimo, zentriert unter dem mittleren Stern. */
const TIP_SIZE = 58;
const TIP_BASELINE = 1002;
const TIP_COLOR = LOGO.loader.color;
/** Größe des Möwenschattens (Silhouette ≈ 110 px Spannweite × 1,8, vom Licht weg × 1,6 gestreckt). */
const GULL_SCALE = 1.8;
/** Schattenlänge beim Drücken von "Tippen". */
const PRESS_E = 0.55;

function readMode(): SplashMode {
  const m = /[?&]splash=([a-z]+)/.exec(typeof location !== 'undefined' ? location.search : '')?.[1];
  return m === 'manual' || m === 'fast' || m === 'final' || m === 'overlay' || m === 'launchframe' ? m : 'normal';
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}

/** Attribut nur schreiben, wenn es sich ändert. */
function put(el: Element | null | undefined, name: string, value: string): void {
  if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
}

/** Sichtbarkeit eines Teils: display plus data-state="in"/"out" (für Tests und Entwickler). */
function show(el: Element | null | undefined, on: boolean): void {
  put(el, 'display', on ? 'inline' : 'none');
  put(el, 'data-state', on ? 'in' : 'out');
}

type Grad = { x1: number; y1: number; x2: number; y2: number; stops: ReadonlyArray<readonly [number, string]> };
function gradientEl(id: string, g: Grad, parent: Element): void {
  const lg = svg('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 }, parent);
  for (const [o, c] of g.stops) svg('stop', { offset: o, 'stop-color': c }, lg);
}

/** Gezeichnetes Stück des Rahmen-Bands bis zum Wisch-Parameter u als Polygon (Schattenwerfer). */
export function bandPrefix(u: number): Pt[] {
  if (u <= 0) return [];
  const pick = (ring: ReadonlyArray<readonly [number, number, number]>): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]!;
      if (p[2] <= u) {
        out.push([p[0], p[1]]);
        continue;
      }
      // Front zwischen Punkt i−1 und i
      const a = ring[i - 1];
      if (a) {
        const t = (u - a[2]) / Math.max(1e-9, p[2] - a[2]);
        out.push([a[0] + (p[0] - a[0]) * t, a[1] + (p[1] - a[1]) * t]);
      }
      break;
    }
    return out;
  };
  const outer = pick(LOGO.band.outer);
  const inner = pick(LOGO.band.inner);
  return [...outer, ...inner.reverse()];
}

interface Parts {
  root: HTMLElement;
  box: HTMLElement;
  stem: HTMLElement;
  back: SVGSVGElement;
  front: SVGSVGElement;
  shStem: SVGPathElement;
  shLabel: SVGPathElement;
  labelUses: SVGUseElement[];
  wipe: SVGPathElement;
  frame: SVGGElement;
  panel: SVGPathElement;
  blob: SVGGElement;
  eye: SVGPathElement;
  contact: SVGEllipseElement;
  drops: SVGCircleElement[];
  flame: SVGPathElement[];
  embers: SVGGElement;
  reg: SVGGElement;
  stars: SVGGElement[];
  tip: SVGUseElement[];
  gullOver: SVGPathElement;
  sh: Record<'frame' | 'flame' | 'reg' | 'star0' | 'star1' | 'star2' | 'blob' | 'drops' | 'tip' | 'gull', SVGPathElement>;
}

/** Layout von "100%" wie im Loader (Label-Daten aus der Loader-Komposition). */
function labelLayout(text: string): Array<{ ch: string; x: number; size: number; w: number }> {
  let x = LOGO.loader.x;
  return text.split('').map((ch) => {
    const size = ch === '%' ? LOGO.loader.percentSize : LOGO.loader.digitSize;
    const g = GLYPHS.glyphs[ch as keyof typeof GLYPHS.glyphs];
    const item = { ch, x, size, w: g.adv * size };
    x += g.adv * size;
    return item;
  });
}

const TIP_LAYOUT = (() => {
  const chars = TIPPEN.split('');
  let w = 0;
  const adv = chars.map((ch, i) => {
    const g = GLYPHS.glyphs[ch as keyof typeof GLYPHS.glyphs];
    const k = i + 1 < chars.length ? ((GLYPHS.kern as Record<string, number>)[ch + chars[i + 1]] ?? 0) : 0;
    const a = (g.adv + k) * TIP_SIZE;
    w += a;
    return a;
  });
  const center = LOGO.stars[1]!.center[0];
  let x = center - w / 2;
  return chars.map((ch, i) => {
    const g = GLYPHS.glyphs[ch as keyof typeof GLYPHS.glyphs];
    const item = { ch, x, w: g.adv * TIP_SIZE };
    x += adv[i]!;
    return item;
  });
})();

/** Tropfen beim Aufprall: Richtung (Grad, relativ zur Kantennormalen), Weite, Radius. */
const DROPS: ReadonlyArray<[number, number, number]> = [
  [-70, 62, 5.5],
  [-42, 76, 4.2],
  [-14, 58, 6.5],
  [16, 70, 4.8],
  [44, 64, 5.8],
  [72, 52, 4],
];

export class SplashStage {
  readonly mode = readMode();
  private state: StageState = 'dormant';
  private parts: Parts | null = null;
  private inline: EeBoot | null = null;
  private look: Look = initialLook();
  private intro: Timeline | null = null;
  private outro: Timeline | null = null;
  private raf = 0;
  private last = 0;
  private reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly offs: Array<() => void> = [];
  /** Nur für die aktuelle Anzeige (Eingabe, Layout, Boot-Abschluss): beim Entfernen/Neuanzeigen gelöst. */
  private readonly showOffs: Array<() => void> = [];
  private readonly prev = new Map<string, string>();
  private tongues: Tongue[] = [];
  private flameTip: Pt = [0, 0];
  private snapping = false;
  private blobShadowKey = '';
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  /** Mitte des Augenschlitzes (y) fürs Blinzeln. */
  private eyeY: number = DOT[1];

  constructor() {
    this.tongues = LOGO.flame.rest.map((r, i) => makeTongue(r as unknown as Pt[], i === 0 ? 492 : undefined));
    this.flameTip = [...(LOGO.flame.rest[1]![tipIndex(LOGO.flame.rest[1] as unknown as Pt[])] as unknown as Pt)] as unknown as Pt;
  }

  // ================================================================== Lebenszyklus

  start(): void {
    const flow = useFlowStore.getState();
    this.offs.push(
      useFlowStore.subscribe((s, p) => {
        if (s.phase !== p.phase) this.onPhase(s.phase);
      }),
    );
    if (IS_NATIVE) audio.unlock(); // App: keine Geste nötig
    if (flow.phase === 'splash') this.show();
    else if (document.getElementById('ee-splash')) this.remove();
    if (this.mode === 'manual' || import.meta.env.DEV) this.exposeDebug();
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const off of this.offs.splice(0)) off();
    if (this.fadeTimer) clearTimeout(this.fadeTimer);
    this.remove();
    setCanvasCovered(false);
  }

  /** Splash zeigen (erster Start oder Rückkehr über die Entwicklerleiste). */
  private show(): void {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    for (const off of this.showOffs.splice(0)) off();
    const existed = !!document.getElementById('ee-splash');
    if (!existed) {
      const holder = document.createElement('div');
      holder.innerHTML = splashMarkup();
      document.body.insertBefore(holder.firstElementChild!, document.body.firstChild);
    }
    const w = window as unknown as { __eeBoot?: EeBoot };
    this.inline = bootInline(bootData()) ?? w.__eeBoot ?? null;
    this.build();
    const p = this.parts!;
    p.root.removeAttribute('data-fading');
    p.root.removeAttribute('data-hole');
    this.look = initialLook();
    this.prev.clear();
    this.intro = null;
    this.outro = null;
    this.snapping = false;
    this.hopRequested = false;
    this.tapQueued = false;
    this.snapFrom = null;
    this.blobShadowKey = '';
    this.state = 'loader';
    this.observeLayout();
    this.bindInput();

    // Testschalter: der Boot läuft weiter, treibt aber den Stamm nicht (Bild steht bzw. folgt dem Test)
    if (this.mode === 'launchframe' || this.mode === 'manual' || this.mode === 'final' || this.mode === 'overlay') boot.detach();
    if (this.mode === 'launchframe') {
      this.inline?.stop();
      this.inline?.setStem(0, 0);
      this.inline?.mirror(0);
      return;
    }
    if (this.mode === 'final' || this.mode === 'overlay') {
      this.inline?.stop();
      this.beginIntro(true);
      if (this.mode === 'overlay') void import('./overlay').then((m) => m.installOverlay(this.parts!.root, this.parts!.box));
      return;
    }
    if (this.mode === 'manual') {
      this.inline?.stop();
      return;
    }
    if (boot.complete) {
      // Rückkehr zum Splash (Entwicklerleiste): Loader steht auf 100 %, gleich die Choreografie
      this.inline?.stop();
      this.inline?.setStem(1, 0);
      this.inline?.mirror(1);
      this.beginIntro(false);
      return;
    }
    // Neues Markup mitten im Boot (HMR): bootProgress treibt ab jetzt diesen Stamm
    if (!existed && this.inline) boot.adopt(this.inline);
    setCanvasCovered(true);
    this.showOffs.push(boot.onComplete(() => this.beginIntro(false)));
  }

  private remove(): void {
    for (const off of this.showOffs.splice(0)) off();
    const root = document.getElementById('ee-splash');
    root?.remove();
    this.parts = null;
    this.state = 'dormant';
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private onPhase(phase: string): void {
    if (phase === 'splash') {
      if (this.state === 'dormant' || this.state === 'fading') this.show();
      return;
    }
    // jede andere Phase: nach der Übergabe (bzw. sofort) ausblenden
    if (this.state === 'outro') return; // die Übergabe folgt gleich
    this.fadeOut();
  }

  private fadeOut(): void {
    const root = this.parts?.root ?? document.getElementById('ee-splash');
    if (!root || this.state === 'fading' || this.state === 'dormant') return;
    this.state = 'fading';
    setCanvasCovered(false);
    root.setAttribute('data-fading', 'true');
    this.fadeTimer = setTimeout(() => {
      this.fadeTimer = null;
      if (this.state === 'fading') this.remove();
    }, FADE_MS + 60);
  }

  // ================================================================== Aufbau

  private build(): void {
    const root = document.getElementById('ee-splash')!;
    const box = root.querySelector('.ee-box') as HTMLElement;
    const back = root.querySelector('svg.ee-back') as SVGSVGElement;
    const front = root.querySelector('svg.ee-front') as SVGSVGElement;
    const defs = back.querySelector('defs')!;
    const shadows = back.querySelector('.ee-shadows')!;
    const logoBack = back.querySelector('.ee-logo-back')!;
    const logoFront = front.querySelector('.ee-logo-front')!;
    // idempotent: frühere Logo-Teile (HMR, Rückkehr) entfernen
    for (const n of root.querySelectorAll('[data-ee-logo]')) n.remove();
    logoBack.replaceChildren();
    logoFront.replaceChildren();
    const mark = <T extends Element>(e: T): T => (e.setAttribute('data-ee-logo', ''), e);

    // --- Definitionen: Verläufe, Band- und Wischmaske, Tippen-Glyphen, Clip für die Möwe über dem Logo
    const d = mark(svg('g', {}, defs));
    const G = LOGO.gradients;
    gradientEl('ee-g-frame', G.frame, d);
    gradientEl('ee-g-frameShade', G.frameShade, d);
    gradientEl('ee-g-blobBody', G.blobBody, d);
    gradientEl('ee-g-blobShade', G.blobShade, d);
    // Masken nur so groß wie der Rahmen (+ Kontur): große Maskenflächen kosten beim Rastern jedes Bild
    const bxs = LOGO.band.outer.map((q) => q[0]);
    const bys = LOGO.band.outer.map((q) => q[1]);
    const m = LOGO.band.width;
    const big = { maskUnits: 'userSpaceOnUse', x: Math.floor(Math.min(...bxs) - m), y: Math.floor(Math.min(...bys) - m), width: Math.ceil(Math.max(...bxs) - Math.min(...bxs) + 2 * m), height: Math.ceil(Math.max(...bys) - Math.min(...bys) + 2 * m) };
    const band = svg('mask', { id: 'ee-band', ...big }, d);
    svg('path', { d: LOGO.parts.frame, fill: '#fff' }, band);
    svg('path', { d: LOGO.parts.panel.d, fill: '#000', stroke: '#000', 'stroke-width': LOGO.parts.panel.strokeWidth, 'stroke-linejoin': 'miter', 'stroke-miterlimit': LOGO.parts.panel.miter }, band);
    const wipeMask = svg('mask', { id: 'ee-wipe', ...big }, d);
    const wipe = svg('path', { d: LOGO.band.center, fill: 'none', stroke: '#fff', 'stroke-width': LOGO.band.width, pathLength: 1, 'stroke-dasharray': '0 2', 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' }, wipeMask);
    for (const ch of 'Tipen') svg('path', { id: `ee-g-${ch}`, d: GLYPHS.glyphs[ch as 'T'].d }, d);
    const clip = svg('clipPath', { id: 'ee-logo-clip' }, d);
    svg('path', { d: LOGO.parts.frame }, clip);
    for (const s of LOGO.parts.stars) svg('path', { d: s }, clip);
    for (const f of LOGO.parts.flame) svg('path', { d: f }, clip);
    svg('path', { d: LOGO.parts.blob.body }, clip);

    // --- Schatten (alle mit demselben deckenden Verlauf)
    const shNames = ['frame', 'flame', 'reg', 'star0', 'star1', 'star2', 'blob', 'drops', 'tip', 'gull'] as const;
    const sh = {} as Parts['sh'];
    for (const n of shNames) sh[n] = mark(svg('path', { class: `ee-sh-${n}`, d: '' }, shadows));

    // --- hinten: Rahmen (Band, gewischt), Platte
    const frame = svg('g', { class: 'ee-frame', 'data-part': 'frame', 'data-state': 'out', mask: 'url(#ee-band)', display: 'none' }, logoBack);
    const frameInner = svg('g', { class: 'ee-frame-wipe', mask: 'url(#ee-wipe)' }, frame);
    svg('path', { d: LOGO.parts.frame, fill: 'url(#ee-g-frame)' }, frameInner);
    svg('path', { d: LOGO.parts.frameShade, fill: 'url(#ee-g-frameShade)' }, frameInner);
    const panel = svg('path', { class: 'ee-panel', 'data-part': 'panel', 'data-state': 'out', d: LOGO.parts.panel.d, fill: LOGO.parts.panel.color, stroke: LOGO.parts.panel.color, 'stroke-width': LOGO.parts.panel.strokeWidth, 'stroke-linejoin': 'miter', 'stroke-miterlimit': LOGO.parts.panel.miter, display: 'none' }, logoBack);

    // --- vorn: Kontaktfleck, Tropfen, Blob, Flamme, ®, Sterne, Möwe über dem Logo, Tippen
    const contact = svg('ellipse', { class: 'ee-contact', cx: CONTACT[0], cy: CONTACT[1], rx: 0, ry: 0, fill: LOGO.ink, 'fill-opacity': 0.35, transform: `rotate(${STEM_ANGLE} ${CONTACT[0]} ${CONTACT[1]})` }, logoFront);
    const dropsG = svg('g', { class: 'ee-drops', fill: LOGO.gradients.blobBody.stops[1]![1] }, logoFront);
    const drops = DROPS.map(() => svg('circle', { r: 0, cx: 0, cy: 0, display: 'none' }, dropsG));
    const B = LOGO.parts.blob;
    const blob = svg('g', { class: 'ee-blob', 'data-part': 'blob', 'data-state': 'out', display: 'none' }, logoFront);
    svg('path', { d: B.body, fill: 'url(#ee-g-blobBody)' }, blob);
    svg('path', { d: B.shade, fill: 'url(#ee-g-blobShade)' }, blob);
    for (const h of B.highlights) svg('path', { d: h, fill: '#fff' }, blob);
    svg('path', { d: B.organ.d, fill: '#000', 'fill-opacity': B.organ.alpha }, blob);
    svg('path', { d: B.mouth.d, fill: '#000', 'fill-opacity': B.mouth.alpha }, blob);
    for (const dot of B.dots) svg('path', { d: dot, fill: B.dotColor }, blob);
    const eye = svg('path', { class: 'ee-eye', d: B.eye, fill: B.eyeColor }, blob);
    const flameG = svg('g', { class: 'ee-flame', 'data-part': 'flame', 'data-state': 'out', fill: LOGO.parts.flameColor, display: 'none' }, logoFront);
    const flame = LOGO.parts.flame.map((fd) => svg('path', { d: fd }, flameG));
    const embersG = svg('g', { class: 'ee-embers', fill: LOGO.parts.flameColor }, logoFront);
    // ® wie im PNG etwas kräftiger (Kontur in gleicher Farbe, siehe Konverter)
    const reg = svg('g', { class: 'ee-reg', 'data-part': 'reg', 'data-state': 'out', fill: LOGO.parts.regColor, stroke: LOGO.parts.regColor, 'stroke-width': LOGO.parts.regStroke, 'stroke-linejoin': 'round', display: 'none' }, logoFront);
    for (const rd of LOGO.parts.reg) svg('path', { d: rd }, reg);
    const stars = LOGO.parts.stars.map((sd, i) => {
      const g = svg('g', { class: `ee-star ee-star-${i}`, 'data-part': `star-${'lmr'[i]}`, 'data-state': 'out', fill: '#fff', display: 'none' }, logoFront);
      svg('path', { d: sd }, g);
      return g;
    });
    const gullOver = svg('path', { class: 'ee-gull-over', d: '', fill: LOGO.ink, 'fill-opacity': 0.35, 'clip-path': 'url(#ee-logo-clip)' }, logoFront);
    const tipG = svg('g', { class: 'ee-tippen', fill: TIP_COLOR }, logoFront);
    tipG.setAttribute('data-testid', 'splash-tippen');
    const tip = TIP_LAYOUT.map((t) => svg('use', { href: `#ee-g-${t.ch}`, display: 'none' }, tipG));

    this.parts = {
      root,
      box,
      stem: root.querySelector('.ee-stem') as HTMLElement,
      back,
      front,
      shStem: back.querySelector('#ee-sh-stem') as SVGPathElement,
      shLabel: back.querySelector('#ee-sh-label') as SVGPathElement,
      labelUses: Array.from(front.querySelectorAll('.ee-label use')) as SVGUseElement[],
      wipe,
      frame,
      panel,
      blob,
      eye,
      contact,
      drops,
      flame,
      embers: embersG,
      reg,
      stars,
      tip,
      gullOver,
      sh,
    };
    root.setAttribute('data-phase', 'loader');
    // Augenmitte aus den (absoluten) Pfadkoordinaten
    const nums = (B.eye.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    const ys = nums.filter((_, i) => i % 2 === 1);
    if (ys.length) this.eyeY = (Math.min(...ys) + Math.max(...ys)) / 2;
  }

  // ================================================================== Choreografie

  private sound = (id: string, p: Record<string, number | string> = {}): void => {
    if (this.snapping || this.mode === 'manual' || this.mode === 'overlay') return;
    audio.sfx(id as SfxId, p as SfxParams);
  };

  /** T0: Loader auf 100 %, jetzt der Aufbau (oder bei `instant` gleich der Endzustand). */
  private beginIntro(instant: boolean): void {
    if (!this.parts || (this.state !== 'loader' && this.state !== 'dormant')) return;
    this.state = 'intro';
    this.parts.root.setAttribute('data-phase', 'intro');
    if (this.mode !== 'final' && this.mode !== 'overlay') setCanvasCovered(true);
    this.inline?.stop();
    // Label steht auf "100%"
    this.inline?.mirror(1);
    this.intro = buildIntro(this.look, { reduced: this.reduced, sound: this.sound });
    if (this.mode === 'fast') this.intro.timeScale = 6;
    if (instant || this.reduced) {
      this.intro.seek(INTRO_END);
      if (this.reduced && !instant) this.sound('stamp');
      this.enterIdle();
    } else this.intro.seek(0);
    this.commit();
    if (this.mode !== 'overlay') this.loop();
  }

  private enterIdle(): void {
    this.state = 'idle';
    this.parts?.root.setAttribute('data-phase', 'idle');
    this.parts?.root.setAttribute('aria-label', 'early earle – Tippen zum Starten');
  }

  private loop(): void {
    if (this.raf) return;
    this.last = performance.now();
    const step = (now: number) => {
      this.raf = 0;
      if (!this.parts || this.state === 'dormant') return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      if (this.mode !== 'manual') this.advance(dt);
      this.commit();
      if (this.state !== 'fading' || this.parts.root.isConnected) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private advance(dt: number): void {
    if (this.snapFrom && this.intro && this.state === 'intro') {
      // Schnappen nach Uhr, nicht nach Bildern: auch bei langsamen Bildern nach 120 ms am Ende
      const k = Math.min(1, (performance.now() - this.snapFrom.at) / 120);
      const t = this.snapFrom.t + (INTRO_END - this.snapFrom.t) * k;
      this.intro.update(Math.max(0, t - this.intro.time) / Math.max(1e-6, this.intro.timeScale));
      if (k >= 1) this.snapFrom = null;
    } else if ((this.state === 'intro' || this.state === 'idle') && this.intro) {
      this.intro.update(dt);
      if (this.state === 'intro' && this.intro.time >= INTRO_END) {
        this.snapping = false;
        this.intro.timeScale = this.mode === 'fast' ? 6 : 1;
        this.enterIdle();
      }
    } else if ((this.state === 'outro' || this.state === 'handoff') && this.outro) {
      this.outro.update(dt);
      // Flamme flackert weiter, bis sie ausgeht
      this.look.flameT += dt;
    }
  }

  /** Tippen, Enter, Leertaste. */
  tap(): void {
    if (this.mode === 'launchframe' || this.mode === 'overlay') return;
    if (this.state === 'intro' && this.intro) {
      // alles schnappt in 120 ms ans Ende, ausstehende Klänge entfallen bis auf einen Stempel
      if (this.snapping) return;
      this.snapping = true;
      this.intro.cancelCalls();
      audio.sfx('stamp');
      this.snapFrom = { at: performance.now(), t: this.intro.time };
      return;
    }
    if (this.state === 'idle') {
      // Die 3D-Szene muss stehen (Notbremse des Boots oder final/overlay): sonst merken und nachholen
      if (!boot.complete || !boot.sceneReady) {
        if (!this.tapQueued) {
          this.tapQueued = true;
          boot.onSceneReady(() => {
            if (this.state === 'idle') this.beginOutro();
          });
        }
        return;
      }
      this.beginOutro();
    }
  }

  private beginOutro(): void {
    if (!this.parts) return;
    this.state = 'outro';
    this.parts.root.setAttribute('data-phase', 'outro');
    // 3D läuft wieder (Held am Punkt, Hintergrundscheibe), damit die Übergabe ein fertiges Bild hat
    setCanvasCovered(false);
    this.updateDot();
    const flameT = this.look.flameT;
    this.outro = buildOutro(this.look, { reduced: this.reduced, sound: this.sound }, { hop: () => this.requestHop(), handoff: () => this.handoff() });
    this.outro.seek(0);
    this.look.flameT = flameT;
    this.commit();
    this.loop();
  }

  private hopRequested = false;
  private tapQueued = false;
  private snapFrom: { at: number; t: number } | null = null;
  private requestHop(): void {
    if (this.hopRequested) return;
    this.hopRequested = true;
    if (useFlowStore.getState().phase === 'splash') useFlowStore.getState().request('hop');
  }

  /** Übergabe: SVG-Blob weg und Maskenloch offen im selben Bild; danach blendet der Splash aus. */
  private handoff(): void {
    if (!this.parts) return;
    this.state = 'handoff';
    this.look.handoff = true;
    this.updateDot();
    this.commit();
    this.parts.root.setAttribute('data-hole', 'true');
    this.requestHop();
    // FlowScene wechselt auf 'hop' → ausblenden (auch wenn die Phase schon vorher wechselte)
    requestAnimationFrame(() => this.fadeOut());
  }

  // ================================================================== Layout (i-Punkt für den 3D-Helden)

  private observeLayout(): void {
    const root = this.parts?.root;
    if (!root) return;
    const ro = new ResizeObserver(() => this.updateDot());
    ro.observe(root);
    this.showOffs.push(() => ro.disconnect());
    this.updateDot();
  }

  private updateDot(): void {
    const p = this.parts;
    if (!p) return;
    const rect = p.box.getBoundingClientRect();
    const host = p.root.getBoundingClientRect();
    const s = rect.width / LOGO.width;
    if (!(s > 0)) return;
    const x = rect.left - host.left + DOT[0] * s;
    const y = rect.top - host.top + DOT[1] * s;
    const r = BLOB_R * s;
    useFlowStore.getState().setSplashDot({ x, y, r });
    p.root.style.setProperty('--dot-x', `${x.toFixed(1)}px`);
    p.root.style.setProperty('--dot-y', `${y.toFixed(1)}px`);
    p.root.style.setProperty('--hole-r', `${(r * HOLE_FACTOR).toFixed(1)}px`);
  }

  // ================================================================== Eingabe

  private bindInput(): void {
    const root = this.parts?.root;
    if (!root) return;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.tap();
    };
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (this.state === 'dormant' || this.state === 'fading' || this.state === 'loader') return;
      e.preventDefault();
      this.tap();
    };
    root.addEventListener('pointerdown', down);
    window.addEventListener('keydown', key);
    this.showOffs.push(() => {
      root.removeEventListener('pointerdown', down);
      window.removeEventListener('keydown', key);
    });
  }

  // ================================================================== Übertragen ins SVG

  private changed(key: string, value: string): boolean {
    if (this.prev.get(key) === value) return false;
    this.prev.set(key, value);
    return true;
  }

  private commit(): void {
    const p = this.parts;
    if (!p) return;
    const l = this.look;
    const r2 = (v: number) => Math.round(v * 100) / 100;

    // --- Stamm (nach dem Boot direkt, ohne Übergang)
    if (this.state !== 'loader' && this.changed('stem', `${r2(l.stemS)}`)) {
      p.stem.style.transition = 'none';
      p.stem.style.transform = `skewY(${STEM_SKEW}deg) scaleY(${Math.max(0, l.stemS).toFixed(4)}) skewY(${-STEM_SKEW}deg)`;
      const q = LOGO.stem.quad;
      const s = Math.max(0, l.stemS);
      const tl: Pt = [q[3][0] + (q[0][0] - q[3][0]) * s, q[3][1] + (q[0][1] - q[3][1]) * s];
      const tr: Pt = [q[2][0] + (q[1][0] - q[2][0]) * s, q[2][1] + (q[1][1] - q[2][1]) * s];
      put(p.shStem, 'd', s > 0.001 ? sweepPath([[tl, tr, q[2] as unknown as Pt, q[3] as unknown as Pt]], L, l.stemE) : '');
    }

    // --- Label "100%": Stempeln, einzeln fallen, Schnitt
    if (this.state !== 'loader' && this.changed('label', `${l.labelOn}|${l.labelStamp}|${l.labelDrop.map(r2).join(',')}`)) {
      const lay = labelLayout('100%');
      const cx = (lay[0]!.x + lay[lay.length - 1]!.x + lay[lay.length - 1]!.w) / 2;
      const cy = LOGO.loader.baseline - LOGO.loader.digitSize * 0.32;
      let shadow = '';
      lay.forEach((g, i) => {
        const u = p.labelUses[i];
        if (!u) return;
        if (!l.labelOn) {
          put(u, 'display', 'none');
          return;
        }
        const drop = l.labelDrop[i] ?? 0;
        const stamp: Affine = aroundPoint([cx, cy], l.labelStamp, l.labelStamp);
        const tilt = aroundPoint([g.x + g.w / 2, LOGO.loader.baseline], 1, 1, 14 * drop, 0, 18 * drop);
        const m = compose(stamp, compose(tilt, [g.size, 0, 0, g.size, g.x, LOGO.loader.baseline]));
        put(u, 'href', `#ee-g-${g.ch === '%' ? 'pct' : g.ch}`);
        put(u, 'transform', matrixAttr(m));
        u.removeAttribute('display');
        shadow += sweepPath(GLYPHS.glyphs[g.ch as '0'].rings as unknown as Ring[], L, 1, m);
      });
      put(p.shLabel, 'd', l.labelOn ? shadow : '');
    }

    // --- Rahmen (Wisch) und Platte
    if (this.changed('frame', `${r2(l.frameU)}|${l.panel}`)) {
      show(p.frame, l.frameU > 0);
      put(p.wipe, 'stroke-dasharray', `${Math.min(1.001, l.frameU).toFixed(4)} 2`);
      // ganz gewischt: ohne Wischmaske (die Kappen an der Chevron-Spitze ließen sonst eine Kerbe)
      const inner = p.frame.firstElementChild;
      if (l.frameU >= 1) inner?.removeAttribute('mask');
      else put(inner, 'mask', 'url(#ee-wipe)');
      show(p.panel, l.panel);
      const casters = l.panel && l.frameU >= 1 ? (LOGO.casters.frame as unknown as Ring[]) : l.frameU > 0 ? [bandPrefix(l.frameU)] : [];
      put(p.sh.frame, 'd', casters.length ? sweepPath(casters, L, 1) : '');
    }

    // --- Blob, Kontaktfleck, Tropfen
    const bKey = `${l.blobOn && !l.handoff}|${r2(l.blobX)}|${r2(l.blobY)}|${r2(l.blobAlong)}|${r2(l.blobAcross)}|${r2(l.blobAxis)}`;
    if (this.changed('blob', bKey)) {
      const on = l.blobOn && !l.handoff;
      show(p.blob, on);
      if (on) {
        const m = this.blobMatrix();
        put(p.blob, 'transform', matrixAttr(m));
        // Schatten nur bei merklicher Änderung (Atmen ±2 % ändert ihn kaum)
        const key = `${Math.round(l.blobX)}|${Math.round(l.blobY)}|${Math.round(l.blobAlong * 40)}|${Math.round(l.blobAcross * 40)}|${Math.round(l.blobAxis)}`;
        if (key !== this.blobShadowKey) {
          this.blobShadowKey = key;
          put(p.sh.blob, 'd', sweepPath(LOGO.casters.blob as unknown as Ring[], L, l.blobE, m));
        }
      } else {
        this.blobShadowKey = '';
        put(p.sh.blob, 'd', '');
      }
    }
    if (this.changed('eye', `${l.blobEye}`)) {
      const cy = this.eyeY;
      put(p.eye, 'transform', l.blobEye >= 1 ? '' : `translate(0 ${(cy * (1 - l.blobEye)).toFixed(2)}) scale(1 ${l.blobEye})`);
    }
    if (this.changed('contact', `${r2(l.contact)}`)) {
      put(p.contact, 'rx', `${(BLOB_R * 0.55 * l.contact).toFixed(2)}`);
      put(p.contact, 'ry', `${(BLOB_R * 0.12 * l.contact).toFixed(2)}`);
    }
    if (this.changed('drops', `${r2(l.drops)}|${r2(l.blobX)}|${r2(l.blobY)}`)) {
      let dsh = '';
      const out = l.drops > 0 && l.drops < 1;
      // 220 ms hinaus (ease-out), 180 ms zurück zur aktuellen Blob-Mitte (ease-in); Gesamtdauer 0,4 s
      const t = l.drops * 0.4;
      const k = t < 0.22 ? 1 - (1 - t / 0.22) ** 2 : 1 - ((t - 0.22) / 0.18) ** 2;
      DROPS.forEach(([ang, dist, rad], i) => {
        const c = p.drops[i]!;
        if (!out) {
          put(c, 'display', 'none');
          return;
        }
        const a = ((STEM_ANGLE - 90 + ang) * Math.PI) / 180;
        const home: Pt = t < 0.22 ? CONTACT : [l.blobX, l.blobY];
        const x = home[0] + Math.cos(a) * dist * k;
        const y = home[1] + Math.sin(a) * dist * k;
        const rr = rad * (t < 0.22 ? 1 : 0.4 + 0.6 * k);
        put(c, 'cx', x.toFixed(1));
        put(c, 'cy', y.toFixed(1));
        put(c, 'r', rr.toFixed(1));
        c.removeAttribute('display');
        const ring: Pt[] = Array.from({ length: 8 }, (_, j) => [x + rr * Math.cos((j * Math.PI) / 4), y + rr * Math.sin((j * Math.PI) / 4)] as Pt);
        dsh += sweepPath([ring], L, 0.25);
      });
      put(p.sh.drops, 'd', dsh);
    }

    // --- Flamme (12-fps-Stufen), Glut
    const fStep = flameStep(l.flameT);
    if (this.changed('flame', `${l.flameOn}|${r2(l.flameGrow)}|${fStep}`)) {
      const flameG = p.flame[0]!.parentElement!;
      show(flameG, l.flameOn && l.flameGrow > 0);
      if (l.flameOn && l.flameGrow > 0) {
        // Ruheform bei reduzierter Bewegung und im Vergleich mit dem PNG (overlay)
        const amp = this.reduced || this.mode === 'overlay' ? 0 : 1;
        const rings: Pt[][] = [];
        this.tongues.forEach((tg, i) => {
          const pts = flameShape(tg, l.flameT, 7 + i * 13, l.flameGrow, amp);
          rings.push(pts);
          put(p.flame[i]!, 'd', smoothPath(pts, new Set([tipIndex(pts)])));
        });
        put(p.sh.flame, 'd', sweepPath(rings, L, 1));
      } else put(p.sh.flame, 'd', '');
      // Glut
      const list = l.flameOn && l.flameGrow >= 1 && !this.reduced ? embers(l.flameT, this.flameTip, 7) : [];
      const html = list.map((e) => `M${(e.x).toFixed(1)} ${(e.y - e.size).toFixed(1)}L${(e.x + e.size * 0.7).toFixed(1)} ${e.y.toFixed(1)}L${e.x.toFixed(1)} ${(e.y + e.size).toFixed(1)}L${(e.x - e.size * 0.7).toFixed(1)} ${e.y.toFixed(1)}Z`).join('');
      let ember = p.embers.firstElementChild as SVGPathElement | null;
      if (!ember) ember = svg('path', { d: '' }, p.embers);
      put(ember, 'd', html);
    }

    // --- ®
    if (this.changed('reg', `${r2(l.regS)}|${r2(l.regRot)}|${r2(l.regE)}`)) {
      const c = LOGO.reg.center as unknown as Pt;
      const m = aroundPoint(c, l.regS, l.regS, l.regRot);
      show(p.reg, l.regS > 0.001);
      put(p.reg, 'transform', matrixAttr(m));
      put(p.sh.reg, 'd', l.regS > 0.001 ? sweepPath(LOGO.casters.reg as unknown as Ring[], L, l.regE, m) : '');
    }

    // --- Sterne
    for (let i = 0; i < 3; i++) {
      const s = l.starS[i]!;
      if (!this.changed(`star${i}`, `${r2(s)}|${r2(l.starRot[i]!)}|${r2(l.starE[i]!)}`)) continue;
      const c = LOGO.stars[i]!.center as unknown as Pt;
      const m = aroundPoint(c, s, s, l.starRot[i]!);
      show(p.stars[i]!, s > 0.001);
      put(p.stars[i]!, 'transform', matrixAttr(m));
      put(p.sh[`star${i}` as 'star0'], 'd', s > 0.001 ? sweepPath(LOGO.casters.stars[i] as unknown as Ring[], L, l.starE[i]!, m) : '');
    }

    // --- Wackeln (ganzes Logo samt Schatten)
    if (this.changed('shake', `${l.shakeX}|${l.shakeY}`)) p.box.style.transform = l.shakeX || l.shakeY ? `translate(${l.shakeX}px, ${l.shakeY}px)` : '';

    // --- Möwenschatten
    if (this.changed('gull', `${l.gullOn}|${r2(l.gullU)}|${l.gullPose}`)) {
      if (l.gullOn) {
        const pos = gullPath(l.gullU);
        const d = ringPath(gullShape(l.gullPose, gullMatrix(pos, L, GULL_SCALE)));
        put(p.sh.gull, 'd', d);
        put(p.gullOver, 'd', d);
      } else {
        put(p.sh.gull, 'd', '');
        put(p.gullOver, 'd', '');
      }
    }

    // --- "Tippen"
    const tKey = `${l.tipOn.join('')}|${l.tipS.map(r2).join(',')}|${l.tipE.map(r2).join(',')}|${l.tipDy.map(r2).join(',')}|${l.tipPress}`;
    if (this.changed('tip', tKey)) {
      let dsh = '';
      const cx = TIP_LAYOUT[0]!.x + (TIP_LAYOUT[TIP_LAYOUT.length - 1]!.x + TIP_LAYOUT[TIP_LAYOUT.length - 1]!.w - TIP_LAYOUT[0]!.x) / 2;
      const u: Pt = [cx - L[0], TIP_BASELINE - L[1]];
      const ul = Math.hypot(u[0], u[1]);
      const press: Pt = [(u[0] / ul) * 4 * l.tipPress, (u[1] / ul) * 4 * l.tipPress];
      TIP_LAYOUT.forEach((g, j) => {
        const use = p.tip[j]!;
        if (!l.tipOn[j]) {
          put(use, 'display', 'none');
          return;
        }
        const s = l.tipS[j]!;
        const base = aroundPoint([g.x + g.w / 2, TIP_BASELINE - TIP_SIZE * 0.35], s, s, 0, press[0], press[1] + l.tipDy[j]!);
        const m = compose(base, [TIP_SIZE, 0, 0, TIP_SIZE, g.x, TIP_BASELINE]);
        put(use, 'transform', matrixAttr(m));
        use.removeAttribute('display');
        const e = l.tipE[j]! * (l.tipPress ? PRESS_E : 1);
        dsh += sweepPath(GLYPHS.glyphs[g.ch as 'T'].rings as unknown as Ring[], L, e, m);
      });
      put(p.sh.tip, 'd', dsh);
    }
  }

  private blobMatrix(): Affine {
    const l = this.look;
    // um die Blob-Mitte (Ruhelage am Punkt): verschieben, entlang der Achse stauchen/strecken
    const squash = aroundPoint([0, 0], 1, 1, l.blobAxis);
    const inv = aroundPoint([0, 0], 1, 1, -l.blobAxis);
    const scale: Affine = [l.blobAlong, 0, 0, l.blobAcross, 0, 0];
    const core = compose(squash, compose(scale, inv));
    return compose([1, 0, 0, 1, l.blobX, l.blobY], compose(core, [1, 0, 0, 1, -DOT[0], -DOT[1]]));
  }

  // ================================================================== Test- und Entwicklerzugang

  private exposeDebug(): void {
    const w = window as unknown as { __eeSplash?: unknown };
    w.__eeSplash = {
      /** Aufbau/Leerlauf an t (Sekunden ab T0). */
      seek: (t: number) => {
        if (!this.parts) return;
        if (!this.intro) {
          this.state = 'loader';
          this.beginIntro(false);
        }
        this.state = t >= INTRO_END ? 'idle' : 'intro';
        this.intro!.seek(t);
        this.commit();
      },
      /** Ausklang an t (0 … 0,45); ruft keine Übergabe. */
      outro: (t: number) => {
        if (!this.parts) return;
        const flameT = this.look.flameT;
        this.outro ??= buildOutro(this.look, { reduced: this.reduced, sound: this.sound }, { hop: () => undefined, handoff: () => undefined });
        this.state = 'outro';
        this.outro.seek(Math.min(OUTRO_END - 1e-3, t));
        this.look.flameT = flameT + t;
        this.commit();
      },
      /** Loader-Bild bei Fortschritt p (0 … 1). */
      loader: (p: number) => {
        this.inline?.stop();
        this.inline?.setStem(p, 0);
        this.inline?.mirror(p);
      },
      tap: () => this.tap(),
      /** Übergabe ansehen ohne Hüpfer: 3D läuft, Loch offen, SVG-Blob weg (zurück mit peek(false)). */
      peek: (on = true) => {
        if (!this.parts) return;
        setCanvasCovered(!on);
        this.updateDot();
        this.look.handoff = on;
        this.commit();
        if (on) this.parts.root.setAttribute('data-hole', 'true');
        else this.parts.root.removeAttribute('data-hole');
      },
      state: () => ({ state: this.state, t: this.intro?.time ?? 0, mode: this.mode, reduced: this.reduced }),
    };
  }
}

// ==================================================================== Singleton

let stage: SplashStage | null = null;
let refs = 0;
let pendingStop: ReturnType<typeof setTimeout> | null = null;

/** FlowSplash beim Einhängen (StrictMode-fest: der zweite Aufruf übernimmt dieselbe Bühne). */
export function acquireSplash(): SplashStage {
  refs++;
  if (pendingStop) {
    clearTimeout(pendingStop);
    pendingStop = null;
  }
  if (!stage) {
    stage = new SplashStage();
    stage.start();
  }
  return stage;
}

export function releaseSplash(): void {
  refs = Math.max(0, refs - 1);
  if (refs > 0 || !stage) return;
  // StrictMode hängt sofort wieder ein: erst verzögert abbauen
  pendingStop = setTimeout(() => {
    pendingStop = null;
    if (refs === 0 && stage) {
      stage.stop();
      stage = null;
    }
  }, 0);
}

/** Entfernt den Loader, wenn die Einstiegsroute keinen Splash hat (/play, Labs, Editoren). */
export function dropBootSplash(): void {
  const w = window as unknown as { __eeBoot?: EeBoot };
  w.__eeBoot?.stop();
  document.getElementById('ee-splash')?.remove();
}

void SHADOW_K;
void STEM_NORMAL;
