// Ausschnitt eines PNG (Anteile 0…1 der Breite/Höhe), optional vergrößert (ganzzahlig, Nächster-Nachbar) — für Nahaufnahmen
// aus Harness-Bildern, z. B. Kopf einer Vorlage: node scripts/wesen/ausschnitt.mjs ein.png aus.png 0.3 0.1 0.6 0.5 2
import { readPng, writePng } from './png.mjs';

const [ein, aus, x0s, y0s, x1s, y1s, zoomS] = process.argv.slice(2);
if (!ein || !aus) {
  console.error('Aufruf: node scripts/wesen/ausschnitt.mjs <ein.png> <aus.png> [x0 y0 x1 y1 (Anteile)] [zoom]');
  process.exit(1);
}
const img = readPng(ein);
const ch = Math.round(img.data.length / (img.width * img.height));
const fx0 = Number(x0s ?? 0), fy0 = Number(y0s ?? 0), fx1 = Number(x1s ?? 1), fy1 = Number(y1s ?? 1);
const zoom = Math.max(1, Math.round(Number(zoomS ?? 1)));
const x0 = Math.floor(fx0 * img.width), y0 = Math.floor(fy0 * img.height);
const x1 = Math.min(img.width, Math.ceil(fx1 * img.width)), y1 = Math.min(img.height, Math.ceil(fy1 * img.height));
const w = (x1 - x0) * zoom, h = (y1 - y0) * zoom;
const out = new Uint8Array(w * h * ch);
for (let y = 0; y < h; y++) {
  const sy = y0 + Math.floor(y / zoom);
  for (let x = 0; x < w; x++) {
    const sx = x0 + Math.floor(x / zoom);
    for (let c = 0; c < ch; c++) out[(y * w + x) * ch + c] = img.data[(sy * img.width + sx) * ch + c];
  }
}
writePng(aus, { width: w, height: h, channels: ch, data: out });
console.log(`${aus}: ${w}×${h}`);
