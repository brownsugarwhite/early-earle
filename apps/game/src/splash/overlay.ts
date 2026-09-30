/**
 * `?splash=overlay`: Florians PNG unter dem SVG-Splash (Differenz-Mischung: gleich = schwarz) und die
 * Deckungsgleichheit je Teil als IoU (Schnitt/Vereinigung der Flächen).
 *
 * Faire Schwelle auf beiden Seiten (50 % Deckung): Die SVG-Seite wird mit Path2D in PNG-Pixeln gerastert (Alpha ≥ 0,5).
 * Auf der PNG-Seite wird die Deckung je Pixel geschätzt, indem die PNG-Farbe P auf die Strecke zwischen Grund B und
 * Teilfarbe A projiziert wird: c = ((P − B)·(A − B)) / |A − B|² ≥ 0,5. A kommt aus demselben Verlauf wie im SVG
 * (etwas über den Rand hinaus gemalt), B ist Hintergrund/Schatten bzw. die Platte (kleinstes c über alle Gründe).
 * Innere Löcher (Auge, Glanz) werden gefüllt. Das PNG rechnet der Browser mit seinem eingebetteten Profil nach sRGB.
 * Ergebnis als Tabelle oben links und JSON in `data-iou`.
 */
import pngUrl from '../../../../assets/ref-florian/02-splashscreen-illudiy-i.png';
import { LOGO } from './logo.gen';

type Rgb = readonly [number, number, number];
type Grad = { x1: number; y1: number; x2: number; y2: number; stops: ReadonlyArray<readonly [number, string]> };

const W: number = LOGO.width;
const H: number = LOGO.height;
/** Grund außerhalb des Logos: zwischen Ink und Schatten. */
const BG: Rgb = [6, 21, 29];
const PANEL: Rgb = [0, 63, 78];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function ctx2d(): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c.getContext('2d', { willReadFrequently: true })!;
}

function gradient(ctx: CanvasRenderingContext2D, g: Grad): CanvasGradient {
  const lg = ctx.createLinearGradient(g.x1, g.y1, g.x2, g.y2);
  for (const [o, c] of g.stops) lg.addColorStop(Math.min(1, Math.max(0, o)), c);
  return lg;
}

/** Deckung (Alpha ≥ 0,5) der Pfade, optional mit Kontur (Platte: Füllung ∪ Kontur 160 pt, Gehrung; ®: rund). */
function mask(paths: readonly string[], stroke = 0, join: CanvasLineJoin = 'miter'): Uint8Array {
  const ctx = ctx2d();
  for (const d of paths) {
    const p = new Path2D(d);
    ctx.fill(p);
    if (stroke) {
      ctx.lineWidth = stroke;
      ctx.lineJoin = join;
      ctx.miterLimit = LOGO.parts.panel.miter;
      ctx.stroke(p);
    }
  }
  const d = ctx.getImageData(0, 0, W, H).data;
  const m = new Uint8Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3]! >= 128 ? 1 : 0;
  return m;
}

/** Farbfeld A eines Teils: gemalt wie im SVG, 3 px über den Rand hinaus (für Randpixel des PNGs). */
function field(layers: ReadonlyArray<{ d: string; fill: string | Grad; stroke?: number }>): Uint8ClampedArray {
  const ctx = ctx2d();
  const style = (f: string | Grad) => (typeof f === 'string' ? f : gradient(ctx, f));
  for (const l of layers) {
    const p = new Path2D(l.d);
    ctx.strokeStyle = style(l.fill);
    ctx.lineWidth = (l.stroke ?? 0) + 6;
    ctx.lineJoin = 'round';
    ctx.stroke(p);
  }
  for (const l of layers) {
    const p = new Path2D(l.d);
    ctx.fillStyle = style(l.fill);
    ctx.fill(p);
    if (l.stroke) {
      ctx.strokeStyle = style(l.fill);
      ctx.lineWidth = l.stroke;
      ctx.lineJoin = 'miter';
      ctx.stroke(p);
    }
  }
  return ctx.getImageData(0, 0, W, H).data;
}

function bbox(m: Uint8Array, pad: number): [number, number, number, number] {
  let x0 = W;
  let y0 = H;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (m[y * W + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return [Math.max(0, x0 - pad), Math.max(0, y0 - pad), Math.min(W - 1, x1 + pad), Math.min(H - 1, y1 + pad)];
}

/** Löcher füllen: alles, was vom Rand der Box nicht erreichbar ist, gehört dazu. */
function fillHoles(m: Uint8Array, box: [number, number, number, number]): Uint8Array {
  const [x0, y0, x1, y1] = box;
  const out = new Uint8Array(m);
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return;
    const i = y * W + x;
    if (seen[i] || m[i]) return;
    seen[i] = 1;
    stack.push(i);
  };
  for (let x = x0; x <= x1; x++) {
    push(x, y0);
    push(x, y1);
  }
  for (let y = y0; y <= y1; y++) {
    push(x0, y);
    push(x1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % W;
    const y = (i / W) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!seen[y * W + x]) out[y * W + x] = 1;
  return out;
}

interface PartSpec {
  svg: Uint8Array;
  A: Uint8ClampedArray;
  B: readonly Rgb[];
  pad?: number;
  exclude?: Uint8Array;
  holes?: boolean;
}

function coverage(png: Uint8ClampedArray, A: Uint8ClampedArray, i: number, B: Rgb): number {
  let num = 0;
  let den = 0;
  for (let k = 0; k < 3; k++) {
    const a = A[i * 4 + k]! - B[k]!;
    num += (png[i * 4 + k]! - B[k]!) * a;
    den += a * a;
  }
  return den > 0 ? num / den : 0;
}

function iou(png: Uint8ClampedArray, spec: PartSpec): number {
  const box = bbox(spec.svg, spec.pad ?? 4);
  const [x0, y0, x1, y1] = box;
  let pm: Uint8Array = new Uint8Array(W * H);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (spec.A[i * 4 + 3]! < 128) continue; // außerhalb des (aufgeweiteten) Teils
      let c = Infinity;
      for (const b of spec.B) c = Math.min(c, coverage(png, spec.A, i, b));
      pm[i] = c >= 0.5 ? 1 : 0;
    }
  let sm = spec.svg;
  if (spec.holes) {
    pm = fillHoles(pm, box);
    sm = fillHoles(sm, box);
  }
  let inter = 0;
  let uni = 0;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (spec.exclude?.[i]) continue;
      inter += sm[i]! & pm[i]!;
      uni += sm[i]! | pm[i]!;
    }
  return uni ? inter / uni : 1;
}

function minus(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i]! && !b[i] ? 1 : 0;
  return out;
}

function erode(m: Uint8Array, r: number): Uint8Array {
  const inv = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) inv[i] = m[i] ? 0 : 1;
  const d = dilate(inv, r);
  const out = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) out[i] = d[i] ? 0 : 1;
  return out;
}

function union(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] || b[i] ? 1 : 0;
  return out;
}

function dilate(m: Uint8Array, r: number): Uint8Array {
  let cur = m;
  for (let k = 0; k < r; k++) {
    const out = new Uint8Array(cur);
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (cur[i]) continue;
        if (cur[i - 1] || cur[i + 1] || cur[i - W] || cur[i + W]) out[i] = 1;
      }
    cur = out;
  }
  return cur;
}

/** IoU je Teil gegen das PNG. */
export async function measureIou(): Promise<Record<string, number>> {
  const img = await loadImage(pngUrl);
  const c = ctx2d();
  c.drawImage(img, 0, 0, W, H);
  const png = c.getImageData(0, 0, W, H).data;
  const P = LOGO.parts;
  const G = LOGO.gradients;
  const outer = mask([P.frame]);
  const panel = mask([P.panel.d], P.panel.strokeWidth);
  const flame = mask(P.flame);
  const out: Record<string, number> = {};
  // Rahmen = Band (außen − Platte), ohne die Flamme darüber und ohne das Innere der Platte (Stamm, Blob)
  out.frame = iou(png, {
    svg: minus(outer, panel),
    A: field([
      { d: P.frame, fill: G.frame },
      { d: P.frameShade, fill: G.frameShade },
    ]),
    B: [BG, PANEL],
    exclude: union(dilate(flame, 2), erode(panel, 3)),
  });
  // Platte samt allem darauf (Stamm, Blob) gegen das Band
  out.panel = iou(png, { svg: panel, A: field([{ d: P.panel.d, fill: P.panel.color, stroke: P.panel.strokeWidth }]), B: [[220, 140, 215]], holes: true });
  out.stem = iou(png, { svg: mask([P.stem]), A: field([{ d: P.stem, fill: G.stem }]), B: [PANEL] });
  out.blob = iou(png, {
    svg: mask([P.blob.body]),
    A: field([
      { d: P.blob.body, fill: G.blobBody },
      { d: P.blob.shade, fill: G.blobShade },
    ]),
    B: [PANEL],
    holes: true,
  });
  out.flame = iou(png, { svg: minus(flame, outer), A: field(P.flame.map((d) => ({ d, fill: P.flameColor }))), B: [BG], exclude: dilate(outer, 2) });
  // ®: dünner Ring (1,8 px) — verglichen wird die gefüllte Scheibe (Lage und Größe), Kantenrauschen fällt sonst ins Gewicht
  out.reg = iou(png, { svg: mask(P.reg, P.regStroke, 'round'), A: field(P.reg.map((d) => ({ d, fill: P.regColor }))), B: [BG], pad: 3, holes: true });
  // zusätzlich der Ring selbst (dünn: Kantenrauschen zählt voll) — nur zur Information
  out.regRing = iou(png, { svg: mask(P.reg, P.regStroke, 'round'), A: field(P.reg.map((d) => ({ d, fill: P.regColor }))), B: [BG], pad: 3 });
  P.stars.forEach((d, i) => {
    out[`star${'LMR'[i]}`] = iou(png, { svg: mask([d]), A: field([{ d, fill: '#ffffff' }]), B: [BG] });
  });
  for (const k of Object.keys(out)) out[k] = Math.round(out[k]! * 10000) / 10000;
  return out;
}

/** PNG unter die Ebenen legen, Differenz-Mischung, IoU-Tabelle. */
export async function installOverlay(root: HTMLElement, box: HTMLElement): Promise<void> {
  if (box.querySelector('.ee-ref')) return;
  const img = document.createElement('img');
  img.className = 'ee-ref';
  img.src = pngUrl;
  img.alt = '';
  img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  // Ebenen gemeinsam (isoliert, mit Ink-Grund) gegen das PNG differenzieren
  const art = document.createElement('div');
  art.className = 'ee-art';
  art.style.cssText = `position:absolute;inset:0;background:${LOGO.ink};mix-blend-mode:difference;isolation:isolate`;
  const layers = Array.from(box.children);
  box.appendChild(img);
  box.appendChild(art);
  for (const l of layers) art.appendChild(l);
  const results = await measureIou();
  root.setAttribute('data-iou', JSON.stringify(results));
  const table = document.createElement('div');
  table.className = 'ee-iou';
  table.setAttribute('data-testid', 'splash-iou');
  table.style.cssText = 'position:absolute;left:10px;top:10px;z-index:2;font:12px/1.35 ui-monospace,Menlo,monospace;color:#f7f6d8;background:rgba(8,27,37,.85);padding:8px 10px;white-space:pre';
  table.textContent = Object.entries(results)
    .map(([k, v]) => `${k.padEnd(6)} ${v.toFixed(4)}${v >= 0.97 ? '' : '  <'}`)
    .join('\n');
  root.appendChild(table);
}
