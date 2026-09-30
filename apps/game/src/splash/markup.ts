/**
 * Das Loader-Markup (#ee-splash) und seine Daten — eine Quelle für beide Wege:
 * - vite-plugins/bootSplash.ts setzt es beim Bauen/Ausliefern direkt in index.html (außerhalb von #root), mitsamt
 *   dem kritischen CSS und dem Inline-Boot-Skript: das erste Bild (Stamm als 4-%-Streifen, "0%", Schatten) steht,
 *   bevor irgendein JS läuft — derselbe Rahmen wie der iOS-Startbildschirm.
 * - SplashStage erzeugt es im Bündel neu, wenn es fehlt (Rückkehr zum Splash, HMR, andere Einstiegsroute).
 *
 * Koordinaten: das Design-Rechteck 838 × 1428 (= Pixel von Florians PNG) wird wie `object-fit: contain` in den
 * Bildschirm gelegt (Container-Einheiten); die SVG-Ebenen laufen darüber hinaus (overflow visible), damit die langen
 * Schatten bis an den Bildschirmrand reichen. Der Stamm ist ein eigenes HTML-Element: sein Wachsen läuft als
 * CSS-Übergang auf dem Compositor weiter, auch wenn der Hauptthread blockiert.
 */
import { LOGO } from './logo.gen.ts';
import { GLYPHS } from './glyphs.gen.ts';
import { SHADOW_K, sweepPath, type Pt } from './longShadow.ts';
import type { BootInlineData } from '../boot/bootInline.ts';

export const DESIGN_W = LOGO.width;
export const DESIGN_H = LOGO.height;
export const BOOT_STORAGE_KEY = 'ee.boot.v1';
/** Stammhöhe im allerersten Bild (Anteil der vollen Höhe). */
export const STEM_SLIVER = 0.04;
/** Anteil des Bündel-Schritts am Balken (Standardgewicht, bootProgress.ts). */
export const BUNDLE_SHARE = 0.2;
/** Erwartete Zeit bis das Bündel läuft (ms), bis gelernte Werte vorliegen. */
export const BUNDLE_MS = 900;
/** Platz für "100%". */
const LABEL_SLOTS = 4;

const q = LOGO.stem.quad as unknown as [Pt, Pt, Pt, Pt];
export const STEM_BOX = (() => {
  const xs = q.map((p) => p[0]);
  const ys = q.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
})();
/** Schräge der Stammkanten (Grad) — skewY bewahrt sie beim Wachsen. */
export const STEM_SKEW = Math.round(((Math.atan(LOGO.stem.slope) * 180) / Math.PI) * 1000) / 1000;

const r = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const pct = (v: number, of: number) => `${r((v / of) * 100, 4)}%`;

export function bootData(): BootInlineData {
  const glyphs: BootInlineData['glyphs'] = {};
  for (const ch of '0123456789%') {
    const g = GLYPHS.glyphs[ch as keyof typeof GLYPHS.glyphs];
    glyphs[ch] = { adv: g.adv, rings: g.rings as unknown as number[][][] };
  }
  return {
    light: [LOGO.light[0], LOGO.light[1]],
    k: SHADOW_K,
    quad: q.map((p) => [p[0], p[1]]) as BootInlineData['quad'],
    sliver: STEM_SLIVER,
    skew: STEM_SKEW,
    label: { x: LOGO.loader.x, y: LOGO.loader.baseline, digit: LOGO.loader.digitSize, pct: LOGO.loader.percentSize },
    glyphs,
    bundleShare: BUNDLE_SHARE,
    bundleMs: BUNDLE_MS,
    storageKey: BOOT_STORAGE_KEY,
  };
}

function gradient(id: string, g: { x1: number; y1: number; x2: number; y2: number; stops: ReadonlyArray<readonly [number, string]> }): string {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${g.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
}

/** Schatten des ersten Bilds (Stamm-Streifen, "0%"), damit es ohne Skript steht. */
function firstShadows(): { stem: string; label: string } {
  const L = LOGO.light as unknown as Pt;
  const s = STEM_SLIVER;
  const tl: Pt = [q[3][0] + (q[0][0] - q[3][0]) * s, q[3][1] + (q[0][1] - q[3][1]) * s];
  const tr: Pt = [q[2][0] + (q[1][0] - q[2][0]) * s, q[2][1] + (q[1][1] - q[2][1]) * s];
  const stem = sweepPath([[tl, tr, q[2], q[3]]], L, 1);
  let x = LOGO.loader.x;
  let label = '';
  for (const ch of '0%') {
    const g = GLYPHS.glyphs[ch as '0' | '%'];
    const size = ch === '%' ? LOGO.loader.percentSize : LOGO.loader.digitSize;
    label += sweepPath(g.rings as unknown as Pt[][], L, 1, [size, 0, 0, size, x, LOGO.loader.baseline]);
    x += g.adv * size;
  }
  return { stem, label };
}

/** Das Loader-Element (erstes Bild: Stamm-Streifen, "0%", Schatten). */
export function splashMarkup(): string {
  const sh = firstShadows();
  const glyphDefs = [...'0123456789%']
    .map((ch) => `<path id="ee-g-${ch === '%' ? 'pct' : ch}" d="${GLYPHS.glyphs[ch as keyof typeof GLYPHS.glyphs].d}"/>`)
    .join('');
  const labelUses = (() => {
    let x = LOGO.loader.x;
    return Array.from({ length: LABEL_SLOTS }, (_, i) => {
      const ch = ['0', '%'][i];
      if (!ch) return '<use display="none"/>';
      const size = ch === '%' ? LOGO.loader.percentSize : LOGO.loader.digitSize;
      const use = `<use href="#ee-g-${ch === '%' ? 'pct' : ch}" transform="translate(${r(x, 1)} ${LOGO.loader.baseline}) scale(${size})"/>`;
      x += GLYPHS.glyphs[ch as '0' | '%'].adv * size;
      return use;
    }).join('');
  })();
  const b = STEM_BOX;
  const stemStyle = `left:${pct(b.x, DESIGN_W)};top:${pct(b.y, DESIGN_H)};width:${pct(b.w, DESIGN_W)};height:${pct(b.h, DESIGN_H)};transform-origin:0 ${pct(q[3][1] - b.y, b.h)};transform:skewY(${STEM_SKEW}deg) scaleY(${STEM_SLIVER}) skewY(${-STEM_SKEW}deg)`;
  return (
    `<div id="ee-splash" data-testid="splash" data-progress="0" data-phase="boot" role="img" aria-label="early earle lädt">` +
    `<div class="ee-box">` +
    `<svg class="ee-back" viewBox="0 0 ${DESIGN_W} ${DESIGN_H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">` +
    `<defs>${gradient('ee-sh', LOGO.shadow)}${gradient('ee-g-stem', LOGO.gradients.stem)}${glyphDefs}</defs>` +
    `<g class="ee-shadows" fill="url(#ee-sh)"><path id="ee-sh-stem" d="${sh.stem}"/><path id="ee-sh-label" d="${sh.label}"/></g>` +
    `<g class="ee-logo-back"></g>` +
    `</svg>` +
    `<div class="ee-stem" style="${stemStyle}"><svg viewBox="${r(b.x)} ${r(b.y)} ${r(b.w)} ${r(b.h)}" preserveAspectRatio="none" aria-hidden="true"><path d="${LOGO.parts.stem}" fill="url(#ee-g-stem)"/></svg></div>` +
    `<svg class="ee-front" viewBox="0 0 ${DESIGN_W} ${DESIGN_H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">` +
    `<g class="ee-logo-front"></g>` +
    `<g class="ee-label" fill="${LOGO.loader.color}">${labelUses}</g>` +
    `</svg>` +
    `</div></div>`
  );
}

/**
 * Kritisches CSS (inline im Kopf von index.html): Hintergrund ohne Naht (#081b25 wie Startbildschirm, Web-View und
 * 3D-Szene), das Design-Rechteck als `contain`, die Ebenen. Alles Weitere (Ausblenden, Maskenloch) steht in flow.css.
 */
export function splashCss(): string {
  const ink = LOGO.ink;
  const ar = `${DESIGN_W} / ${DESIGN_H}`;
  return (
    `html,html body{background:${ink};margin:0}` +
    `#ee-splash{position:fixed;inset:0;z-index:30;background:${ink};overflow:hidden;container-type:size;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}` +
    `#ee-splash .ee-box{position:absolute;inset:0;margin:auto;width:min(100vw,calc(100vh * ${ar}));height:min(100vh,calc(100vw * ${DESIGN_H} / ${DESIGN_W}))}` +
    `@supports (width:1cqw){#ee-splash .ee-box{width:min(100cqw,calc(100cqh * ${ar}));height:min(100cqh,calc(100cqw * ${DESIGN_H} / ${DESIGN_W}))}}` +
    `#ee-splash svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}` +
    `#ee-splash .ee-stem{position:absolute;will-change:transform}` +
    `#ee-splash .ee-stem svg{overflow:visible}`
  );
}
