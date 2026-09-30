/**
 * Inline-Boot des Loaders: läuft als erstes Skript in index.html (vite-plugins/bootSplash.ts setzt es als
 * `(bootInline)(daten)` ein), noch bevor das JS-Bündel geladen ist. Es treibt den Stamm (CSS-Übergang auf dem
 * Compositor, wächst auch weiter, wenn der Hauptthread blockiert), spiegelt pro rAF die Prozentzahl und die langen
 * Schatten von Stamm und Ziffern und kriecht zeitbasiert auf ≈ 0,92 des Bündel-Anteils (gelernte Zeit aus
 * localStorage 'ee.boot.v1'). `window.__eeBoot` übergibt an bootProgress.ts (Bündel) und SplashStage.
 *
 * WICHTIG: Die Funktion muss in sich geschlossen sein (keine Importe, keine äußeren Namen) — sie wird als Quelltext
 * eingebettet. Im Bündel ruft SplashStage sie direkt auf, wenn das Markup neu entsteht (Rückkehr zum Splash, HMR).
 */

export type BootStepName = 'bundle' | 'font' | 'renderer' | 'mount' | 'creatures' | 'board' | 'mapShaders' | 'chunks' | 'frames';

export interface BootInlineData {
  /** Punktlicht (Bildraum 838 × 1428). */
  light: [number, number];
  /** Streckung der Fernkopie bei voller Ausfahrt. */
  k: number;
  /** Stamm: TL, TR, BR, BL. */
  quad: [[number, number], [number, number], [number, number], [number, number]];
  /** Stammhöhe beim ersten Bild (Anteil), z. B. 0,04. */
  sliver: number;
  /** Schräge der Stammoberkante (Grad) für skewY. */
  skew: number;
  /** Label: linke Kante, Grundlinie, Ziffern- und Prozentgröße (Bildraum). */
  label: { x: number; y: number; digit: number; pct: number };
  /** Vorschübe (em) und Schattenringe (em) der Ziffern und des Prozentzeichens. */
  glyphs: Record<string, { adv: number; rings: number[][][] }>;
  /** Gewicht des Bündel-Schritts und Standardzeit bis zum Bündel (ms). */
  bundleShare: number;
  bundleMs: number;
  storageKey: string;
}

export interface EeBoot {
  root: HTMLElement;
  /** Zeit (performance.now) des Navigationsbeginns: 0. */
  t0: number;
  /** Aktueller Loader-Fortschritt, den das Inline-Skript zuletzt gezeigt hat (0 … 1). */
  shown: number;
  /** Gelernte Zeiten (roh aus localStorage) oder null. */
  learned: unknown;
  /** Stamm auf Fortschritt p (0 … 1) fahren, `ms` = Übergangsdauer (0 = sofort). */
  setStem(p: number, ms: number): void;
  /** Fortschritt, den der Stamm gerade wirklich zeigt (aus dem berechneten Transform). */
  readStem(): number;
  /** Prozentzahl und Schatten auf p (0 … 1) spiegeln. */
  mirror(p: number): void;
  /** Eigene rAF-Schleife beenden (Übergabe an bootProgress). */
  stop(): void;
  /** Stammskalierung aus dem Fortschritt. */
  scaleOf(p: number): number;
  data: BootInlineData;
}

export function bootInline(D: BootInlineData): EeBoot | null {
  const w = window as unknown as { __eeBoot?: EeBoot };
  const root = document.getElementById('ee-splash');
  if (!root) return null;
  if (w.__eeBoot && w.__eeBoot.root === root) return w.__eeBoot;
  const stem = root.querySelector('.ee-stem') as HTMLElement | null;
  const shStem = root.querySelector('#ee-sh-stem');
  const shLabel = root.querySelector('#ee-sh-label');
  const uses = Array.prototype.slice.call(root.querySelectorAll('.ee-label use')) as SVGUseElement[];
  const L = D.light;
  const f = 1 + D.k;
  const r = (v: number) => Math.round(v * 10) / 10;
  let learned: { at?: Record<string, number> } | null = null;
  try {
    learned = JSON.parse(localStorage.getItem(D.storageKey) || 'null');
  } catch {
    learned = null;
  }
  const bundleMs = Math.max(250, (learned && learned.at && learned.at.bundle) || D.bundleMs);

  // Schattenspur (wie longShadow.sweepPath): Kantenvierecke positiv + Fernkopie; Punkte über (ox, oy, s) gelegt
  const sweep = (rings: number[][][], ox: number, oy: number, s: number): string => {
    let out = '';
    for (const ring of rings) {
      const n = ring.length;
      const P: number[] = [];
      const Q: number[] = [];
      for (let i = 0; i < n; i++) {
        const x = ox + ring[i]![0]! * s;
        const y = oy + ring[i]![1]! * s;
        P.push(x, y);
        Q.push(L[0] + (x - L[0]) * f, L[1] + (y - L[1]) * f);
      }
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const a = [P[2 * i]!, P[2 * i + 1]!];
        const b = [P[2 * j]!, P[2 * j + 1]!];
        const c = [Q[2 * j]!, Q[2 * j + 1]!];
        const d = [Q[2 * i]!, Q[2 * i + 1]!];
        const ar = a[0]! * b[1]! - b[0]! * a[1]! + b[0]! * c[1]! - c[0]! * b[1]! + c[0]! * d[1]! - d[0]! * c[1]! + d[0]! * a[1]! - a[0]! * d[1]!;
        if (Math.abs(ar) < 1e-6) continue;
        const o = ar > 0 ? [a, b, c, d] : [a, d, c, b];
        out += 'M' + o.map((p) => r(p[0]!) + ' ' + r(p[1]!)).join('L') + 'Z';
      }
      out += 'M';
      for (let i = 0; i < n; i++) out += (i ? 'L' : '') + r(Q[2 * i]!) + ' ' + r(Q[2 * i + 1]!);
      out += 'Z';
    }
    return out;
  };

  const scaleOf = (p: number) => D.sliver + (1 - D.sliver) * Math.max(0, Math.min(1, p));
  const setStem = (p: number, ms: number) => {
    if (!stem) return;
    stem.style.transition = ms > 0 ? 'transform ' + Math.round(ms) + 'ms linear' : 'none';
    stem.style.transform = 'skewY(' + D.skew + 'deg) scaleY(' + scaleOf(p).toFixed(4) + ') skewY(' + -D.skew + 'deg)';
  };
  const readStem = () => {
    if (!stem) return 0;
    const m = getComputedStyle(stem).transform;
    const v = m && m !== 'none' ? parseFloat(m.split(',')[3] || '1') : 1;
    return Math.max(0, Math.min(1, (v - D.sliver) / (1 - D.sliver)));
  };

  let lastPct = -1;
  const mirror = (p: number) => {
    const q = D.quad;
    const s = scaleOf(p);
    // Stamm wächst an seinen senkrechten Seiten: Oberkante = Unterkante + s · Höhe
    const tl = [q[3][0] + (q[0][0] - q[3][0]) * s, q[3][1] + (q[0][1] - q[3][1]) * s];
    const tr = [q[2][0] + (q[1][0] - q[2][0]) * s, q[2][1] + (q[1][1] - q[2][1]) * s];
    if (shStem) shStem.setAttribute('d', sweep([[tl, tr, q[2], q[3]]], 0, 0, 1));
    const pct = Math.max(0, Math.min(100, Math.floor(p * 100 + 1e-6)));
    api.shown = p;
    if (pct === lastPct) return;
    lastPct = pct;
    root.setAttribute('data-progress', String(pct));
    const chars = (String(pct) + '%').split('');
    let x = D.label.x;
    let dShadow = '';
    for (let i = 0; i < uses.length; i++) {
      const u = uses[i]!;
      const ch = chars[i];
      if (!ch) {
        u.setAttribute('display', 'none');
        continue;
      }
      const size = ch === '%' ? D.label.pct : D.label.digit;
      const g = D.glyphs[ch];
      u.setAttribute('href', '#ee-g-' + (ch === '%' ? 'pct' : ch));
      u.setAttribute('transform', 'translate(' + r(x) + ' ' + D.label.y + ') scale(' + size + ')');
      u.removeAttribute('display');
      if (g) {
        dShadow += sweep(g.rings, x, D.label.y, size);
        x += g.adv * size;
      }
    }
    if (shLabel) shLabel.setAttribute('d', dShadow);
  };

  let running = true;
  const creep = (t: number) => 0.92 * (1 - Math.exp((-2.5 * t) / bundleMs));
  const loop = (now: number) => {
    if (!running) return;
    // Zeitbasiert kriechen; der Stamm läuft 150 ms voraus auf dem Compositor
    setStem(creep(now + 150) * D.bundleShare, 150);
    mirror(readStem());
    requestAnimationFrame(loop);
  };
  const api: EeBoot = {
    root,
    t0: 0,
    shown: 0,
    learned,
    setStem,
    readStem,
    mirror,
    stop: () => {
      running = false;
    },
    scaleOf,
    data: D,
  };
  w.__eeBoot = api;
  setStem(0, 0);
  mirror(0);
  // Testschalter (?splash=manual/final/overlay/launchframe): erstes Bild stehen lassen, SplashStage übernimmt
  if (/[?&]splash=(manual|final|overlay|launchframe)/.test(location.search)) running = false;
  else requestAnimationFrame(loop);
  return api;
}
