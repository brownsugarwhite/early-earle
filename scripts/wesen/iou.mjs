// Silhouetten-Überdeckung (IoU) zweier Bilder auf weißem Grund — Harness-Maß für „wie nah an der Referenz“
// (ZIELSYSTEM §3.8). Beide Silhouetten werden über ihren Hüllquader auf dieselbe Höhe gebracht, mittig ausgerichtet
// und auf einem 256²-Raster verglichen. Grob, aber ehrlich: Kopf zu hoch, Rumpf zu lang, Beine zu kurz schlagen durch.
import { readPng } from './png.mjs';

/** Maske: nicht weiß (Deckkraft > 0, nicht alle Kanäle nahe 255). */
function maske(img, schwelle = 240) {
  const { width: w, height: h, data } = img;
  const ch = Math.round(data.length / (w * h));
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * ch;
    const a = ch === 4 || ch === 2 ? data[o + ch - 1] : 255;
    const r = data[o], g = ch >= 3 ? data[o + 1] : r, b = ch >= 3 ? data[o + 2] : r;
    m[i] = a > 8 && !(r > schwelle && g > schwelle && b > schwelle) ? 1 : 0;
  }
  return { w, h, m };
}

function huelle({ w, h, m }) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0, y0, x1, y1, breite: x1 - x0 + 1, hoehe: y1 - y0 + 1 };
}

/** Rastert die Maske in ein N²-Feld: Höhe des Hüllquaders → N, Breite maßstabsgetreu, mittig. */
function raster(sil, hu, N) {
  const out = new Uint8Array(N * N);
  const s = hu.hoehe / N;
  const bw = hu.breite / s;
  const offX = (N - bw) / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const sx = hu.x0 + (x - offX) * s, sy = hu.y0 + y * s;
    if (sx < hu.x0 || sx > hu.x1) continue;
    const ix = Math.min(sil.w - 1, Math.max(0, Math.round(sx))), iy = Math.min(sil.h - 1, Math.max(0, Math.round(sy)));
    out[y * N + x] = sil.m[iy * sil.w + ix];
  }
  return out;
}

/**
 * @returns {{ iou: number, seitenverhaeltnisA: number, seitenverhaeltnisB: number } | null} null, wenn ein Bild leer ist.
 */
export function silhouetteIoU(fileA, fileB, N = 256) {
  const a = maske(readPng(fileA)), b = maske(readPng(fileB));
  const ha = huelle(a), hb = huelle(b);
  if (!ha || !hb) return null;
  const ra = raster(a, ha, N), rb = raster(b, hb, N);
  let inter = 0, union = 0;
  for (let i = 0; i < N * N; i++) {
    const x = ra[i], y = rb[i];
    if (x && y) inter++;
    if (x || y) union++;
  }
  return { iou: union > 0 ? inter / union : 0, seitenverhaeltnisA: ha.breite / ha.hoehe, seitenverhaeltnisB: hb.breite / hb.hoehe };
}
