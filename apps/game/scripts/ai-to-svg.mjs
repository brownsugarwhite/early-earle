#!/usr/bin/env node
/**
 * Florians Illustrator-Datei (PDF-kompatibel) → Splash-Logo als SVG + Geometriedaten für Loader und Splash.
 *
 *   node scripts/ai-to-svg.mjs [pfad/zu/loader and splash.ai]
 *
 * Standardpfad: `ref/loader and splash.ai` im Haupt-Checkout (ref/ ist nicht im Git; aus einem Worktree heraus wird
 * der Haupt-Checkout über `git rev-parse --git-common-dir` gefunden). Die Datei wird nur gelesen, nie kopiert.
 *
 * Ausgabe (generiert, eingecheckt):
 * - src/splash/logo.svg     — Artboard "splash", normiert auf viewBox 0 0 838 1428 (= Pixel des gesetzten PNGs
 *                              assets/ref-florian/02-splashscreen-illudiy-i.png); Teile mit ids; Florians eigene
 *                              Schattenflächen als Referenz in <g id="ai-shadows" display="none">.
 * - src/splash/logo.gen.ts  — dieselben Teile als Daten (Pfade, Verläufe, Farben), Schattenwerfer als abgetastete
 *                              Ringe, Rahmen-Band mit Wisch-Parametern, Flammen-Ruhepolygone, Lichtpunkt,
 *                              gemeinsamer Schattenverlauf und die Loader-Komposition (Artboard "loader").
 *
 * Abbildung AI → PNG: x' = s·x + tx, y' = s·(H − y) + ty (H = Artboardhöhe in pt). s, tx, ty sind durch Passung der
 * Logo-Silhouette an das PNG bestimmt (IoU-Maximum, Silhouette 0,988 — der Rest ist das dunkle Auge, das im PNG
 * als "kein Logo" zählt). Der Loader wird über die Stammposition (unten links) auf dasselbe Koordinatensystem gelegt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readPdf, pages, interpret, gradientStops, Name } from './ai/pdf.mjs';
import { flatten, area, orientRings, starOutline, offsetOutline, densify, simplify, dist, leastSquaresPoint, fmt, segmentsToD, ringsToD, pointInRing } from './ai/geom.mjs';
import { readPng, alignPart, rasterize, coverageError } from './ai/align.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '..');

function defaultSource() {
  const rel = 'ref/loader and splash.ai';
  const repo = path.resolve(appDir, '../..');
  if (fs.existsSync(path.join(repo, rel))) return path.join(repo, rel);
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: repo, encoding: 'utf8' }).trim();
    const main = path.resolve(repo, common, '..');
    if (fs.existsSync(path.join(main, rel))) return path.join(main, rel);
  } catch {
    // kein Git
  }
  return path.join(repo, rel);
}

const SRC = process.argv[2] ?? defaultSource();
const OUT_SVG = path.join(appDir, 'src/splash/logo.svg');
/** Das gesetzte PNG (verbindlicher Look): Abgleich kleiner Teile, siehe `alignPart`. */
const REF_PNG = path.resolve(appDir, '../../assets/ref-florian/02-splashscreen-illudiy-i.png');
const OUT_TS = path.join(appDir, 'src/splash/logo.gen.ts');

// ------------------------------------------------------------------------------------------ Konstanten

/** Zielraum = Pixel des gesetzten PNGs. */
const W = 838;
const H_PX = 1428;
/** Passung AI-Artboard "splash" → PNG (IoU-Maximum der Silhouette, siehe Kopf). */
const FIT = { s: 0.4445, tx: -22.75, ty: -41.35 };
/** Hintergrund: das Splash-Ink (#081b25, wie Startbildschirm, Web-View und 3D-Szene). */
const INK = [8, 27, 37];
/** Florians Schatten: Form-XObject mit ca 0,6 (Normal) über dem Hintergrund. */
const SHADOW_ALPHA = 0.6;
/**
 * Flache Farben, die im gesetzten PNG von der AI-Datei abweichen (PNG = verbindlicher Look; sRGB-konvertiert
 * gemessen). Die Platte muss exakt dem 3D-Hintergrund der Maskenöffnung entsprechen (FlowScene).
 */
const PNG_COLORS = {
  panel: '#003f4e', // AI #0f404f
  eye: '#04252c', // AI #09262d
  dots: '#00cdcb', // AI weiß; im PNG türkise Bläschen (Anfangsblob pezenpez)
  flame: '#ff7cac', // AI #ff74ab
  reg: '#fc96bc', // AI #f291bd
};
/**
 * Verlaufsstopps, die im PNG sichtbar anders sind: der Glanz des Blobs endet dort in reinem Neon-Türkis (R = 0),
 * in der AI-Datei in einem blasseren #56fff3.
 */
const PNG_STOPS = { blobShade: { '#56fff3': [0, 255, 243] } };

// ------------------------------------------------------------------------------------------ Lesen

const buf = fs.readFileSync(SRC);
const pdf = readPdf(buf);
const pgs = pages(pdf);
const splashPage = pgs.find((p) => Math.abs(p.MediaBox[2] - 2000) < 1) ?? pgs[0];
const loaderPage = pgs.find((p) => p !== splashPage);
const AH = splashPage.MediaBox[3];
const toPx = ([x, y]) => [FIT.s * x + FIT.tx, FIT.s * (AH - y) + FIT.ty];
const mapPath = (segs, f = toPx) => segs.map((s) => ({ op: s.op, pts: s.pts.map(f) }));

const all = interpret(pdf, pdf.streamOf(splashPage.Contents), splashPage.Resources);
// Illustrator hat die Ebene doppelt geschrieben; eine volle Hintergrundfläche verdeckt alles davor.
let startAt = 0;
all.forEach((it, i) => {
  if (it.kind === 'fill' && it.clips.length === 0 && bboxOf(it.path).w > 1990) startAt = i;
});
const items = all.slice(startAt);

function bboxOf(segs) {
  const pts = segs.flatMap((s) => s.pts);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}
const rgb = (c) => c.map((v) => Math.round(v * 255));
const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const isPageRect = (clip) => bboxOf(clip.path).w > 1990;
const ownClip = (it) => [...it.clips].reverse().find((c) => !isPageRect(c));

// ------------------------------------------------------------------------------------------ Teile

const shadings = items.filter((it) => it.kind === 'shading');
const fills = items.filter((it) => it.kind === 'fill' || it.kind === 'stroke');
const colorOf = (it) => (it.fill ? rgb(it.fill) : it.stroke ? rgb(it.stroke) : null);
const same = (c, ref) => c && c.every((v, i) => Math.abs(v - ref[i]) <= 2);

// Schattenformen (Referenz) und Organ-Gruppen
const groups = [];
{
  let open = null;
  for (const it of items) {
    if (it.kind === 'group-begin') open = { ref: it.ref, ca: it.ca, blend: it.blend, items: [] };
    else if (it.kind === 'group-end') {
      if (open) groups.push(open);
      open = null;
    } else if (open) open.items.push(it);
  }
}
const shadowGroups = groups.filter((g) => g.items.some((i) => i.kind === 'shading'));
const organGroups = groups.filter((g) => !g.items.some((i) => i.kind === 'shading'));

// Verlaufsflächen: Reihenfolge wie im Strom (Rahmen, Rahmenschatten, Stamm, Blob-Körper, Blob-Glanz)
const [shFrame, shFrameShade, shStem, shBody, shShade] = shadings.filter((it) => !shadowGroups.some((g) => g.items.includes(it)));

const panelFill = fills.find((it) => it.kind === 'fill' && same(colorOf(it), [15, 64, 79]));
const panelStroke = fills.find((it) => it.kind === 'stroke' && same(colorOf(it), [15, 64, 79]));
const whites = fills.filter((it) => it.kind === 'fill' && same(colorOf(it), [255, 255, 255]));
const pinks = fills.filter((it) => it.kind === 'fill' && same(colorOf(it), [255, 116, 171]));
const regs = fills.filter((it) => it.kind === 'fill' && same(colorOf(it), [242, 145, 189]));
const eye = fills.find((it) => it.kind === 'fill' && same(colorOf(it), [9, 38, 45]));
const bodyBox = bboxOf(mapPath(ownClip(shBody).path));
const inBlob = (it) => {
  const b = bboxOf(mapPath(it.path));
  return b.x >= bodyBox.x - 2 && b.x + b.w <= bodyBox.x + bodyBox.w + 2 && b.y >= bodyBox.y - 2 && b.y + b.h <= bodyBox.y + bodyBox.h + 2;
};
const blobWhites = whites.filter(inBlob);
const highlights = blobWhites.filter((it) => bboxOf(mapPath(it.path)).w > 3.5 && !isCircleish(it));
const dots = blobWhites.filter((it) => isCircleish(it));
const stars = whites.filter((it) => !inBlob(it)).sort((a, b) => bboxOf(a.path).x - bboxOf(b.path).x);
function isCircleish(it) {
  const b = bboxOf(mapPath(it.path));
  return Math.abs(b.w - b.h) < 0.6 && b.w < 8 && it.path.filter((s) => s.op === 'C').length === 4;
}
const flames = [...pinks].sort((a, b) => bboxOf(b.path).h - bboxOf(a.path).h); // groß, klein
const [regR, regRing] = [...regs].sort((a, b) => bboxOf(a.path).w - bboxOf(b.path).w);

const check = (cond, msg) => {
  if (!cond) throw new Error(`Teile-Erkennung: ${msg}`);
};
check(shFrame && shFrameShade && shStem && shBody && shShade, 'fünf Verlaufsflächen');
check(panelFill && panelStroke, 'Platte (Füllung + Kontur 160)');
check(highlights.length === 2, `2 Glanzlichter (gefunden ${highlights.length})`);
check(dots.length === 3, `3 Bläschen (gefunden ${dots.length})`);
check(stars.length === 3, `3 Sterne (gefunden ${stars.length})`);
check(flames.length === 2, '2 Flammenzungen');
check(regR && regRing, '® (Buchstabe + Ring)');
check(eye, 'Auge');
check(organGroups.length === 2, '2 Organ-Gruppen');

// ------------------------------------------------------------------------------------------ Verläufe

/** Axialverlauf → SVG-Parameter im Zielraum (userSpaceOnUse). */
function gradient(it, id) {
  const sh = it.shading;
  check(sh.ShadingType === 2, `${id}: nur Axialverläufe`);
  const [x0, y0, x1, y1] = sh.Coords;
  const m = it.matrix;
  const P = (x, y) => toPx([m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
  const a = P(x0, y0);
  const b = P(x1, y1);
  const stops = gradientStops(pdf, sh.Function).map((s) => ({ t: s.t, c: rgb(s.c) }));
  return { id, x1: a[0], y1: a[1], x2: b[0], y2: b[1], stops: dedupeStops(stops) };
}
/** Doppelte Stopps weg; in Läufen gleicher Farbe nur Anfang und Ende behalten. */
function dedupeStops(stops) {
  const eq = (a, b) => a.c.every((v, i) => Math.round(v) === Math.round(b.c[i]));
  const out = [];
  for (const s of stops) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.t - s.t) < 1e-6 && eq(last, s)) continue;
    const prev = out[out.length - 2];
    if (last && prev && eq(prev, last) && eq(last, s)) out[out.length - 1] = s;
    else out.push(s);
  }
  return out;
}

const G = {
  frame: gradient(shFrame, 'frame'),
  frameShade: gradient(shFrameShade, 'frameShade'),
  stem: gradient(shStem, 'stem'),
  blobBody: gradient(shBody, 'blobBody'),
  blobShade: gradient(shShade, 'blobShade'),
};
for (const [id, map] of Object.entries(PNG_STOPS)) for (const st of G[id].stops) st.c = map[hex(st.c)] ?? st.c;

// Gemeinsamer Schattenverlauf: Florians Hauptschatten (Form 29), deckend vorgemischt (0,6 über dem Ink).
const mainShadow = shadowGroups.find((g) => g.items.some((i) => i.kind === 'shading' && ownClip(i) && bboxOf(ownClip(i).path).h > 1500)) ?? shadowGroups[0];
const shadowGrad = gradient(
  mainShadow.items.find((i) => i.kind === 'shading'),
  'shadow',
);
shadowGrad.stops = shadowGrad.stops.map((s) => ({ t: s.t, c: s.c.map((v, i) => INK[i] + SHADOW_ALPHA * (v - INK[i]) * 1) }));
// Das AI-Ink ist #0b1c26; auf das Splash-Ink umrechnen: Schatten = Ink + 0,6·(Verlauf − AI-Ink) … vereinfacht
// als Mischung (1−α)·Ink + α·Verlauf, danach das Ende exakt auf das Ink setzen (kein Saum am Auslauf).
{
  const aiInk = [11, 28, 38];
  shadowGrad.stops = mainShadow.items
    .filter((i) => i.kind === 'shading')
    .slice(0, 1)
    .flatMap((i) => gradientStops(pdf, i.shading.Function))
    .map((s) => {
      const c = rgb(s.c);
      // Abstand zum AI-Ink bleibt erhalten, Basis ist das Splash-Ink
      return { t: s.t, c: INK.map((v, k) => Math.max(0, v + SHADOW_ALPHA * (c[k] - aiInk[k]))) };
    });
  shadowGrad.stops = dedupeStops(shadowGrad.stops.map((s) => ({ t: s.t, c: s.c.map((v) => Math.round(v * 10) / 10) })));
}

// ------------------------------------------------------------------------------------------ Lichtpunkt

// Florians Schattenstrahlen (lange Kanten der Schattenformen) laufen von einem Punkt weg: Punktlicht L.
const rays = [];
for (const g of shadowGroups) {
  const clip = ownClip(g.items.find((i) => i.kind === 'shading'));
  const ring = flatten(clip.path, 0.5)[0];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    // lange Kante vom Logo zum Seitenrand (x ≈ 2000)
    if (dist(a, b) > 400 && (Math.abs(a[0] - 2000) < 5) !== (Math.abs(b[0] - 2000) < 5)) rays.push(Math.abs(a[0] - 2000) < 5 ? [toPx(b), toPx(a)] : [toPx(a), toPx(b)]);
  }
}
// Loader-Artboard: Schatten des Balkens, über die Stammecke unten links in den Splash-Raum gelegt
const loaderAll = loaderPage ? interpret(pdf, pdf.streamOf(loaderPage.Contents), loaderPage.Resources) : [];
const loaderBar = loaderAll.find((it) => it.kind === 'shading' && !it.clips.some((c) => bboxOf(c.path).w > 1000 && bboxOf(c.path).h > 1000) && bboxOf(ownClipL(it).path).w < 200);
function ownClipL(it) {
  return [...it.clips].reverse().find((c) => bboxOf(c.path).w < 1000 || bboxOf(c.path).h < 1000) ?? it.clips[it.clips.length - 1];
}
const stemRing = flatten(mapPath(ownClip(shStem).path), 0.1)[0];
const stemBL = stemRing.reduce((best, p) => (p[0] - p[1] < best[0] - best[1] ? p : best)); // unten links: kleinstes x − y
let loaderMap = null;
if (loaderBar) {
  const barRing = flatten(ownClipL(loaderBar).path, 0.1)[0];
  // unten links im PDF-Raum (y nach oben): kleinstes x, kleinstes y
  const bl = barRing.reduce((best, p) => (p[0] + p[1] < best[0] + best[1] ? p : best));
  const aiBL = [(stemBL[0] - FIT.tx) / FIT.s, AH - (stemBL[1] - FIT.ty) / FIT.s];
  loaderMap = ([x, y]) => toPx([x - bl[0] + aiBL[0], y - bl[1] + aiBL[1]]);
  const lShadow = loaderAll.find((it) => it.kind === 'shading' && it.clips.length >= 2 && it.shadingRef?.num !== loaderBar.shadingRef?.num);
  if (lShadow) {
    const ring = flatten(ownClipL(lShadow).path, 0.5)[0];
    const edge = (p) => p[0] > 1090 || p[1] < 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (dist(a, b) > 300 && edge(a) !== edge(b)) rays.push(edge(a) ? [loaderMap(b), loaderMap(a)] : [loaderMap(a), loaderMap(b)]);
    }
  }
}
// L = Punkt mit kleinstem Winkelfehler zu den Splash-Strahlen (Gewicht 1/Abstand², iteriert). Die Loader-Strahlen
// (Mockup, eigene Komposition) zählen nicht mit, sie stehen nur im Bericht.
const splashRays = rays.slice(0, rays.length - (loaderMap ? 2 : 0));
let LIGHT = leastSquaresPoint(splashRays);
for (let it = 0; it < 8; it++) {
  const weighted = splashRays.flatMap(([a, b]) => {
    const w = Math.max(1, Math.round((1400 / dist(a, LIGHT)) ** 2 * 4));
    return Array.from({ length: w }, () => [a, b]);
  });
  LIGHT = leastSquaresPoint(weighted);
}
const rayReport = rays.map(([a, b]) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const n = [-dy / Math.hypot(dx, dy), dx / Math.hypot(dx, dy)];
  return { from: a.map((v) => +v.toFixed(1)), slope: +(dy / dx).toFixed(3), miss: +Math.abs(n[0] * (LIGHT[0] - a[0]) + n[1] * (LIGHT[1] - a[1])).toFixed(1) };
});

// ------------------------------------------------------------------------------------------ Geometrie der Teile

const px = (it) => mapPath(it.path);
const clipPx = (it) => mapPath(ownClip(it).path);
const D = (segs) => segmentsToD(segs, 2);

const frameOuter = clipPx(shFrame);
const frameShade = clipPx(shFrameShade);
const stemPath = clipPx(shStem);
const bodyPath = clipPx(shBody);
const shadePath = clipPx(shShade);
const panelPath = px(panelFill);
const panelHalf = (panelStroke.lineWidth * FIT.s) / 2;

// Stamm als Viereck: TL, TR, BR, BL (Bildschirm, y nach unten)
const stemQuad = (() => {
  const r = stemRing;
  const byX = [...r].sort((a, b) => a[0] - b[0]);
  const left = byX.slice(0, 2).sort((a, b) => a[1] - b[1]);
  const right = byX.slice(2).sort((a, b) => a[1] - b[1]);
  return [left[0], right[0], right[1], left[1]];
})();

// Platte: Füllung ∪ Kontur 160 pt (Gehrung) als Umriss (für Band-Maske, Schattenwerfer, IoU)
const panelRing = offsetOutline(flatten(panelPath, 0.05)[0], panelHalf, panelStroke.miter);

// Rahmen-Außenumriss
const frameRing = flatten(frameOuter, 0.05)[0];

// Blob: Mittelpunkt und Radius (Kreis gleicher Fläche um den Flächenschwerpunkt)
const bodyRing = flatten(bodyPath, 0.05)[0];
const blobCenter = centroid(bodyRing);
const blobR = Math.sqrt(Math.abs(area(bodyRing)) / Math.PI);
function centroid(r) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i];
    const q = r[(i + 1) % r.length];
    const k = p[0] * q[1] - q[0] * p[1];
    a += k;
    cx += (p[0] + q[0]) * k;
    cy += (p[1] + q[1]) * k;
  }
  return [cx / (3 * a), cy / (3 * a)];
}

// ------------------------------------------------------------------------------------------ PNG-Abgleich

/**
 * Die AI-Datei ist neuer als das PNG: Sterne, ® und die kleine Flammenzunge sitzen dort um Bruchteile eines Pixels
 * anders bzw. ≈ 2 % kleiner. Je Teil wird eine kleine Ähnlichkeitskorrektur (Verschiebung ≤ 2 px, Skalierung ≤ 4 %
 * um die Teilmitte) gesucht, die die PNG-Deckung am besten trifft, und in alle Ausgaben des Teils eingerechnet.
 * Die Farben A/B kommen aus dem PNG selbst (Rohwerte, gleicher Raum wie die Pixel).
 */
const png = readPng(REF_PNG);
const bgRaw = png.px(20, 20);
function partColor(rings) {
  // hellster/fernster Pixel vom Grund innerhalb des Teils (deckungsgleich ≥ 0,9)
  const pts = rings.flat();
  const x0 = Math.floor(Math.min(...pts.map((p) => p[0])));
  const y0 = Math.floor(Math.min(...pts.map((p) => p[1])));
  const w = Math.ceil(Math.max(...pts.map((p) => p[0]))) - x0 + 1;
  const h = Math.ceil(Math.max(...pts.map((p) => p[1]))) - y0 + 1;
  const cov = rasterize(rings.map((r) => r.map(([x, y]) => [x - x0, y - y0])), w, h, 4);
  let best = bgRaw;
  let bd = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (cov[y * w + x] < 0.9) continue;
      const c = png.px(x + x0, y + y0);
      const d = Math.hypot(c[0] - bgRaw[0], c[1] - bgRaw[1], c[2] - bgRaw[2]);
      if (d > bd) {
        bd = d;
        best = c;
      }
    }
  return best;
}
const align = {};
const alignRings = {
  starL: [starOutline(flatten(px(stars[0]), 0.05)[0])],
  starM: [starOutline(flatten(px(stars[1]), 0.05)[0])],
  starR: [starOutline(flatten(px(stars[2]), 0.05)[0])],
  reg: [...flatten(px(regR), 0.05), ...flatten(px(regRing), 0.05)],
  flameSmall: flatten(px(flames[1]), 0.05),
};
for (const [k, rings] of Object.entries(alignRings)) align[k] = alignPart(png, rings, partColor(rings), bgRaw);
// Große Flammenzunge: nur außerhalb des Rahmens vergleichen (dort verschmilzt sie mit dem gleichfarbigen Bogen)
{
  const outerRings = flatten(frameOuter, 0.1);
  const fx = outerRings.flat();
  const bx0 = Math.floor(Math.min(...fx.map((p) => p[0]))) - 2;
  const by0 = Math.floor(Math.min(...fx.map((p) => p[1]))) - 2;
  const bw = Math.ceil(Math.max(...fx.map((p) => p[0]))) - bx0 + 3;
  const bh = Math.ceil(Math.max(...fx.map((p) => p[1]))) - by0 + 3;
  const fcov = rasterize(outerRings.map((r) => r.map(([x, y]) => [x - bx0, y - by0])), bw, bh, 2);
  const inFrame = (x, y) => {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const u = x + dx - bx0;
        const v = y + dy - by0;
        if (u >= 0 && v >= 0 && u < bw && v < bh && fcov[v * bw + u] > 0.02) return true;
      }
    return false;
  };
  const big = flatten(px(flames[0]), 0.05);
  align.flameBig = alignPart(png, big, partColor(big), bgRaw, { exclude: inFrame });
}
/** Korrektur eines Teils als Punktabbildung (nach toPx). */
const corr = (k) => {
  const a = align[k];
  return a ? (p) => [a.c[0] + (p[0] - a.c[0]) * a.s + a.dx, a.c[1] + (p[1] - a.c[1]) * a.s + a.dy] : (p) => p;
};
const pxAligned = (it, k) => {
  const f = corr(k);
  return mapPath(it.path, (p) => f(toPx(p)));
};

// Sterne: Umriss (10 Punkte), Mittelpunkt, Spitzenradius, Drehung (Spitze nach oben = 0°)
const STAR_KEYS = ['starL', 'starM', 'starR'];
const starData = stars.map((it, i) => {
  const px = (x) => pxAligned(x, STAR_KEYS[i]);
  const ring = flatten(px(it), 0.05)[0];
  const outline = starOutline(ring);
  const c = centroid(outline);
  const tips = outline.filter((_, i) => i % 2 === 0);
  const top = tips.reduce((best, p) => (p[1] < best[1] ? p : best));
  const r = tips.reduce((s, p) => s + dist(p, c), 0) / 5;
  const rot = (Math.atan2(top[0] - c[0], -(top[1] - c[1])) * 180) / Math.PI;
  return { d: D(px(it)), outline, c, r, rot };
});

// Flamme: Ruhepolygone (~64 Punkte je Zunge) mit Basislinie (wo sie mit dem Bogen verschmilzt)
const flameData = flames.map((it, i) => {
  const px = (x) => pxAligned(x, i === 1 ? 'flameSmall' : 'flameBig');
  const ring = flatten(px(it), 0.05)[0];
  const pts = resample(ring, 64);
  return { d: D(px(it)), rest: pts };
});
function resample(ring, n) {
  const lens = [];
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const l = dist(ring[i], ring[(i + 1) % ring.length]);
    lens.push(l);
    total += l;
  }
  // Ecken (Spitzen) behalten: Punkte mit starkem Knick zuerst
  const out = [];
  let acc = 0;
  let k = 0;
  for (let j = 0; j < n; j++) {
    const target = (total * j) / n;
    while (acc + lens[k] < target) {
      acc += lens[k];
      k++;
    }
    const t = (target - acc) / lens[k];
    const a = ring[k];
    const b = ring[(k + 1) % ring.length];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  // die schärfste Spitze exakt einsetzen (höchster Punkt)
  const tip = ring.reduce((best, p) => (p[1] < best[1] ? p : best));
  const near = out.reduce((bi, p, i) => (dist(p, tip) < dist(out[bi], tip) ? i : bi), 0);
  out[near] = tip;
  return out;
}

// ®: Buchstabe und Ring, Mittelpunkt
const regPx = (it) => pxAligned(it, 'reg');
const regRings = [...flatten(regPx(regR), 0.05), ...flatten(regPx(regRing), 0.05)];
const regRingOuter = flatten(regPx(regRing), 0.05).reduce((a, b) => (Math.abs(area(a)) > Math.abs(area(b)) ? a : b));
/**
 * Das ® ist im PNG kräftiger gezeichnet als in der AI-Datei (Ring ≈ 2,4 statt 1,8 px): Konturstärke (gleiche Farbe,
 * runde Ecken) so wählen, dass die Deckung am besten passt. Schattenwerfer bleiben dünn (unsichtbarer Unterschied).
 */
const regStroke = (() => {
  const rings = orientRings(regRings);
  const pts = rings.flat();
  const bx = Math.floor(Math.min(...pts.map((p) => p[0]))) - 4;
  const by = Math.floor(Math.min(...pts.map((p) => p[1]))) - 4;
  const box = [bx, by, Math.ceil(Math.max(...pts.map((p) => p[0]))) - bx + 5, Math.ceil(Math.max(...pts.map((p) => p[1]))) - by + 5];
  const A = [229, 150, 187]; // Roh-Pink des ® im PNG
  let best = { w: 0, e: Infinity, iou: 0 };
  for (let w = 0; w <= 1.2 + 1e-9; w += 0.1) {
    // Außenringe wachsen, Löcher schrumpfen (offsetOutline richtet positiv aus → Löcher wieder umdrehen)
    const grown = rings.map((r) => (w > 0 ? (area(r) > 0 ? offsetOutline(r, w / 2) : offsetOutline(r, -w / 2).reverse()) : r));
    const res = coverageError(png, grown, A, bgRaw, box);
    if (process.env.DEBUG_REG) console.log('® w', w.toFixed(1), 'e', res.e.toFixed(2), 'iou', res.iou.toFixed(3), 'areas', grown.map((r) => area(r).toFixed(1)).join('/'));
    if (res.e < best.e) best = { w: +w.toFixed(2), e: res.e, iou: res.iou };
  }
  return best;
})();
const regCenter = centroid(regRingOuter);

// ------------------------------------------------------------------------------------------ Band (Rahmen ohne Platte)

/**
 * Das Band ist der sichtbare Rahmen: Außenumriss minus Platte. Der Aufbau wischt entlang seiner Mittellinie von der
 * Chevron-Spitze links hoch, über den Bogen, rechts hinunter. Jeder Umrisspunkt bekommt den Parameter u ∈ [0, 1]
 * seines nächsten Mittellinienpunkts; so lässt sich das gezeichnete Stück als Polygon (Schattenwerfer) schneiden.
 */
const tipOuter = frameRing.reduce((best, p) => (p[1] > best[1] ? p : best));
const tipInner = panelRing.reduce((best, p) => (p[1] > best[1] ? p : best));
// Ringe so drehen und orientieren, dass sie an der Spitze beginnen und im Bild im Uhrzeigersinn laufen
// (von der Spitze nach links oben = x nimmt zuerst ab)
function fromTip(ring, tip) {
  let r = [...ring];
  const i = r.findIndex((p) => p === tip);
  r = [...r.slice(i), ...r.slice(0, i)];
  if (r[1][0] > r[0][0]) r = [r[0], ...r.slice(1).reverse()];
  return r;
}
const lowest = (ring) => ring.reduce((best, p) => (p[1] > best[1] ? p : best));
const frameDense = densify(frameRing, 3);
const panelDense = densify(panelRing, 3);
const outerFromTip = fromTip(frameDense, lowest(frameDense));
const innerFromTip = fromTip(panelDense, lowest(panelDense));
void tipOuter;
void tipInner;
// Mittellinie: für Außenpunkte den nächsten Innenpunkt suchen, Mittelpunkt; glätten; Bogenlänge
const center = [];
{
  for (const p of densify(outerFromTip, 2)) {
    let best = innerFromTip[0];
    let bd = Infinity;
    for (const q of innerFromTip) {
      const d2 = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
      if (d2 < bd) {
        bd = d2;
        best = q;
      }
    }
    center.push([(p[0] + best[0]) / 2, (p[1] + best[1]) / 2]);
  }
}
const centerSmooth = smoothClosed(center, 6);
function smoothClosed(pts, it) {
  let cur = pts;
  for (let k = 0; k < it; k++) cur = cur.map((p, i) => {
    const a = cur[(i - 1 + cur.length) % cur.length];
    const b = cur[(i + 1) % cur.length];
    return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
  });
  return cur;
}
// Start exakt an der Spitze (Mitte zwischen den Spitzen), Ende ebenso
const tipMid = [(outerFromTip[0][0] + innerFromTip[0][0]) / 2, (outerFromTip[0][1] + innerFromTip[0][1]) / 2];
centerSmooth[0] = tipMid;
const centerLine = simplify(centerSmooth, 0.3);
const cum = [0];
for (let i = 1; i <= centerLine.length; i++) cum.push(cum[i - 1] + dist(centerLine[i - 1], centerLine[i % centerLine.length]));
const centerLen = cum[cum.length - 1];
function paramOf(p) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < centerLine.length; i++) {
    const a = centerLine[i];
    const b = centerLine[(i + 1) % centerLine.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    const d = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    if (d < bd - 1e-9) {
      bd = d;
      best = (cum[i] + t * Math.sqrt(l2)) / centerLen;
    }
  }
  return best;
}
const bandOuter = outerFromTip.map((p, i) => [p[0], p[1], i === 0 ? 0 : paramOf(p)]);
const bandInner = innerFromTip.map((p, i) => [p[0], p[1], i === 0 ? 0 : paramOf(p)]);
// monoton machen (Projektion an den Ohren kann minimal zurückspringen); letzter Punkt vor der Spitze → ≤ 1
for (const ring of [bandOuter, bandInner]) for (let i = 1; i < ring.length; i++) ring[i][2] = Math.max(ring[i][2], ring[i - 1][2]);
const bandWidth = Math.max(...bandOuter.map((p) => distToLine(p))) * 2 + 6;
function distToLine(p) {
  let bd = Infinity;
  for (let i = 0; i < centerLine.length; i++) {
    const a = centerLine[i];
    const b = centerLine[(i + 1) % centerLine.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    bd = Math.min(bd, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
  }
  return bd;
}

// ------------------------------------------------------------------------------------------ Loader-Komposition

/**
 * Artboard "loader": der Stamm wächst an seinem Platz, rechts unten daneben "23%" (Cooper Black im Mockup; wir setzen
 * Caprasimo). Übernommen werden Lage und Größen relativ zum Stamm: linke Kante des Labels, Grundlinie, Ziffern- und
 * Prozentgröße (auf gleiche sichtbare Ziffernhöhe umgerechnet: Cooper "2" oben bei 0,589 em, Caprasimo bei 0,638 em).
 */
let loader = null;
if (loaderMap) {
  const texts = loaderAll.filter((it) => it.kind === 'text');
  const digits = texts.filter((t) => /[0-9]/.test(t.char));
  const pct = texts.find((t) => t.char === '%');
  const first = digits[0];
  const origin = loaderMap([first.matrix[4], first.matrix[5]]);
  const digitSizeAi = first.matrix[3];
  const pctSizeAi = pct ? pct.matrix[3] : digitSizeAi * (50 / 70);
  const COOPER_DIGIT_TOP = 0.589; // "two" oben (CFF-Untermenge in der Datei)
  const COOPER_PCT_TOP = 0.715;
  const CAPRA_DIGIT_TOP = 1306 / 2048;
  const CAPRA_PCT_TOP = 1425 / 2048;
  loader = {
    x: origin[0],
    baseline: origin[1],
    digitSize: (digitSizeAi * FIT.s * COOPER_DIGIT_TOP) / CAPRA_DIGIT_TOP,
    percentSize: (pctSizeAi * FIT.s * COOPER_PCT_TOP) / CAPRA_PCT_TOP,
    color: hex(rgb(first.fill)),
  };
}

// ------------------------------------------------------------------------------------------ Schattenwerfer

const R = (ring, d = 1) => ring.map((p) => [+p[0].toFixed(d), +p[1].toFixed(d)]);
const casters = {
  frame: [R(simplify(frameRing, 0.12))],
  stem: [R(stemQuad, 2)],
  blob: [R(simplify(bodyRing, 0.12))],
  reg: orientRings(regRings.map((r) => simplify(r, 0.08))).map((r) => R(r, 2)),
  stars: starData.map((s) => [R(s.outline, 2)]),
};
// Außenringe positive Fläche (y nach unten), Löcher negativ
for (const k of Object.keys(casters)) {
  if (k === 'stars') casters[k] = casters[k].map((rs) => orientRings(rs));
  else casters[k] = orientRings(casters[k]);
}

// ------------------------------------------------------------------------------------------ Ausgabe

const round = (v, d = 2) => +v.toFixed(d);
const P2 = (p, d = 2) => [round(p[0], d), round(p[1], d)];
const gradOut = (g) => ({ x1: round(g.x1), y1: round(g.y1), x2: round(g.x2), y2: round(g.y2), stops: g.stops.map((s) => [round(s.t, 4), hex(s.c)]) });

const data = {
  width: W,
  height: H_PX,
  fromAi: { ...FIT, artboardHeight: round(AH, 3) },
  /** Kleine Korrekturen einzelner Teile an das PNG (siehe Konverter, "PNG-Abgleich"). */
  aligned: Object.fromEntries(Object.entries(align).map(([k, a]) => [k, { dx: round(a.dx), dy: round(a.dy), s: round(a.s, 4) }])),
  ink: hex(INK),
  light: P2(LIGHT, 1),
  shadow: gradOut(shadowGrad),
  gradients: Object.fromEntries(Object.entries(G).map(([k, g]) => [k, gradOut(g)])),
  parts: {
    frame: D(frameOuter),
    frameShade: D(frameShade),
    panel: { d: D(panelPath), strokeWidth: round(panelHalf * 2, 3), miter: panelStroke.miter, color: PNG_COLORS.panel },
    panelOutline: ringsToD([panelRing], 2),
    stem: D(stemPath),
    blob: {
      body: D(bodyPath),
      shade: D(shadePath),
      organ: { d: D(px(organGroups[0].items[0])), alpha: round(organGroups[0].ca, 3) },
      mouth: { d: D(px(organGroups[1].items[0])), alpha: round(organGroups[1].ca, 3) },
      highlights: highlights.map((it) => D(px(it))),
      dots: dots.map((it) => D(px(it))),
      dotColor: PNG_COLORS.dots,
      eye: D(px(eye)),
      eyeColor: PNG_COLORS.eye,
    },
    flame: flameData.map((f) => f.d),
    flameColor: PNG_COLORS.flame,
    reg: [D(regPx(regR)), D(regPx(regRing))],
    regColor: PNG_COLORS.reg,
    regStroke: regStroke.w,
    stars: starData.map((s) => s.d),
  },
  stem: { quad: stemQuad.map((p) => P2(p)), slope: round((stemQuad[1][1] - stemQuad[0][1]) / (stemQuad[1][0] - stemQuad[0][0]), 4) },
  blob: { center: P2(blobCenter), r: round(blobR) },
  reg: { center: P2(regCenter) },
  stars: starData.map((s) => ({ center: P2(s.c), r: round(s.r), rot: round(s.rot, 1) })),
  flame: { rest: flameData.map((f) => f.rest.map((p) => P2(p, 1))) },
  band: {
    center: ringsToD([centerLine], 1).replace(/Z$/, 'Z'),
    length: round(centerLen, 1),
    width: round(bandWidth, 1),
    outer: bandOuter.map((p) => [round(p[0], 1), round(p[1], 1), round(p[2], 4)]),
    inner: bandInner.map((p) => [round(p[0], 1), round(p[1], 1), round(p[2], 4)]),
  },
  casters,
  loader: loader && { x: round(loader.x), baseline: round(loader.baseline), digitSize: round(loader.digitSize), percentSize: round(loader.percentSize), color: loader.color },
  aiShadows: shadowGroups.map((g) => ringsToD(flatten(mapPath(ownClip(g.items.find((i) => i.kind === 'shading')).path), 0.5), 1)),
};

// --- logo.gen.ts
const header = `/* Generiert von scripts/ai-to-svg.mjs aus Florians "loader and splash.ai" — nicht von Hand ändern. */\n`;
const doc = `/**
 * Splash-Logo in Pixeln des gesetzten PNGs (viewBox 0 0 ${W} ${H_PX}): Teile, Verläufe, Schattenwerfer (Außenringe
 * positive Fläche, Löcher negativ), Rahmen-Band mit Wisch-Parameter u je Punkt ([x, y, u]), Flammen-Ruhepolygone,
 * Punktlicht \`light\` (aus Florians Schattenstrahlen), gemeinsamer Schattenverlauf (deckend) und die Loader-Komposition.
 */\n`;
const ts = header + doc + `export const LOGO = ${JSON.stringify(data)} as const;\n\nexport type LogoData = typeof LOGO;\n`;
fs.writeFileSync(OUT_TS, ts);

// --- logo.svg
const grad = (id, g) =>
  `<linearGradient id="ee-g-${id}" gradientUnits="userSpaceOnUse" x1="${fmt(g.x1)}" y1="${fmt(g.y1)}" x2="${fmt(g.x2)}" y2="${fmt(g.y2)}">${g.stops.map((s) => `<stop offset="${fmt(s.t, 4)}" stop-color="${hex(s.c)}"/>`).join('')}</linearGradient>`;
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generiert von scripts/ai-to-svg.mjs aus Florians "loader and splash.ai" (Artboard "splash"), normiert auf die Pixel
     des gesetzten PNGs (838 × 1428): x' = ${FIT.s}·x ${FIT.tx}, y' = ${FIT.s}·(${round(AH, 3)} − y) ${FIT.ty}.
     Punktlicht L = (${fmt(LIGHT[0], 1)}, ${fmt(LIGHT[1], 1)}); die Laufzeit rechnet die langen Schatten selbst (longShadow.ts),
     Florians eigene Schattenflächen stehen zum Vergleich in #ai-shadows (ausgeblendet). -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H_PX}" width="${W}" height="${H_PX}">
<defs>${Object.entries(G).map(([k, g]) => grad(k, g)).join('')}${grad('shadow', shadowGrad)}</defs>
<rect id="ink" width="${W}" height="${H_PX}" fill="${hex(INK)}"/>
<g id="ai-shadows" display="none" fill="url(#ee-g-shadow)">${data.aiShadows.map((d) => `<path d="${d}"/>`).join('')}</g>
<path id="frame" d="${data.parts.frame}" fill="url(#ee-g-frame)"/>
<path id="frame-shade" d="${data.parts.frameShade}" fill="url(#ee-g-frameShade)"/>
<path id="panel" d="${data.parts.panel.d}" fill="${PNG_COLORS.panel}" stroke="${PNG_COLORS.panel}" stroke-width="${fmt(panelHalf * 2, 3)}" stroke-linejoin="miter" stroke-miterlimit="${panelStroke.miter}"/>
<path id="stem" d="${data.parts.stem}" fill="url(#ee-g-stem)"/>
<g id="blob">
<path id="blob-body" d="${data.parts.blob.body}" fill="url(#ee-g-blobBody)"/>
<path id="blob-shade" d="${data.parts.blob.shade}" fill="url(#ee-g-blobShade)"/>
${data.parts.blob.highlights.map((d, i) => `<path id="blob-hl-${i + 1}" d="${d}" fill="#fff"/>`).join('\n')}
<path id="blob-organ" d="${data.parts.blob.organ.d}" fill="#000" fill-opacity="${data.parts.blob.organ.alpha}"/>
<path id="blob-mouth" d="${data.parts.blob.mouth.d}" fill="#000" fill-opacity="${data.parts.blob.mouth.alpha}"/>
${data.parts.blob.dots.map((d, i) => `<path id="blob-dot-${i + 1}" d="${d}" fill="${PNG_COLORS.dots}"/>`).join('\n')}
<path id="blob-eye" d="${data.parts.blob.eye}" fill="${PNG_COLORS.eye}"/>
</g>
<g id="flame" fill="${PNG_COLORS.flame}">${data.parts.flame.map((d, i) => `<path id="flame-${i === 0 ? 'big' : 'small'}" d="${d}"/>`).join('')}</g>
<g id="reg" fill="${PNG_COLORS.reg}" stroke="${PNG_COLORS.reg}" stroke-width="${regStroke.w}" stroke-linejoin="round"><path id="reg-r" d="${data.parts.reg[0]}"/><path id="reg-ring" d="${data.parts.reg[1]}"/></g>
<g id="stars" fill="#fff">${['star-l', 'star-m', 'star-r'].map((id, i) => `<path id="${id}" d="${data.parts.stars[i]}"/>`).join('')}</g>
</svg>
`;
fs.writeFileSync(OUT_SVG, svg);

// --- Bericht
console.log(`Quelle: ${SRC}`);
console.log(`Licht L = (${LIGHT.map((v) => v.toFixed(1)).join(', ')}) px; Strahlen:`);
for (const r of rayReport) console.log(`  von (${r.from.join(', ')}) Steigung ${r.slope}, Abstand zu L ${r.miss} px`);
console.log(`Stamm ${stemQuad.map((p) => `(${p.map((v) => v.toFixed(1)).join(',')})`).join(' ')} Steigung ${data.stem.slope}`);
console.log(`Blob Mitte (${blobCenter.map((v) => v.toFixed(1)).join(', ')}) r ${blobR.toFixed(1)}`);
console.log(`® Mitte (${regCenter.map((v) => v.toFixed(1)).join(', ')})`);
starData.forEach((s, i) => console.log(`Stern ${'LMR'[i]} (${s.c.map((v) => v.toFixed(1)).join(', ')}) r ${s.r.toFixed(1)} rot ${s.rot.toFixed(1)}°`));
console.log(`Band: Mittellinie ${centerLen.toFixed(0)} px, Breite ${bandWidth.toFixed(1)} px, Punkte außen ${bandOuter.length} innen ${bandInner.length}`);
console.log(`Loader: ${JSON.stringify(data.loader)}`);
console.log(`® Konturstärke ${regStroke.w} px (Ring-IoU ${regStroke.iou.toFixed(3)})`);
for (const [k, a] of Object.entries(align)) console.log(`PNG-Abgleich ${k.padEnd(10)} dx ${a.dx.toFixed(2)} dy ${a.dy.toFixed(2)} s ${a.s.toFixed(3)}  IoU ${a.before.toFixed(3)} → ${a.after.toFixed(3)}`);
console.log(`Schreibt ${path.relative(appDir, OUT_SVG)} (${(svg.length / 1024).toFixed(1)} KB), ${path.relative(appDir, OUT_TS)} (${(ts.length / 1024).toFixed(1)} KB)`);
void Name;
void pointInRing;
