// Vermessung einer Referenz (Florians Bögen): Silhouette (nicht-weiß), größte Komponente, Hüllquader, Profilkurven
// (je Spalte oben/unten, je Zeile links/rechts, normiert auf Höhe 1), dominante Farben. Schreibt JSON und Masken-PNG.
//   node scripts/wesen/messen.mjs <bild.png> <ausgabe-basis> [x0 y0 x1 y1] [--weiss 0.92] [--farben 8]
import { readPng, writePng } from './png.mjs';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args[0], outBase = args[1];
const nums = args.slice(2).filter((a) => !a.startsWith('--')).map(Number);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : def; };
const weiss = opt('--weiss', 0.9);
const nFarben = opt('--farben', 8);
const img = readPng(file);
let x0 = 0, y0 = 0, x1 = img.width, y1 = img.height;
if (nums.length >= 4) [x0, y0, x1, y1] = nums;
const W = x1 - x0, H = y1 - y0;
const px = (x, y) => { const o = ((y + y0) * img.width + (x + x0)) * 4; return [img.data[o] / 255, img.data[o + 1] / 255, img.data[o + 2] / 255, img.data[o + 3] / 255]; };
// Vordergrund: nicht fast-weiß und nicht transparent
const fg = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const [r, g, b, a] = px(x, y);
  const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
  const sat = mx > 0 ? (mx - mn) / mx : 0;
  if (a > 0.5 && (mn < weiss || sat > 0.12)) fg[y * W + x] = 1;
}
// größte Zusammenhangskomponente (4er-Nachbarschaft)
const label = new Int32Array(W * H).fill(-1);
let best = -1, bestSize = 0, nLabels = 0;
const stack = [];
for (let s = 0; s < W * H; s++) {
  if (!fg[s] || label[s] >= 0) continue;
  let size = 0;
  stack.push(s);
  label[s] = nLabels;
  while (stack.length) {
    const i = stack.pop();
    size++;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (fg[j] && label[j] < 0) { label[j] = nLabels; stack.push(j); }
    }
  }
  if (size > bestSize) { bestSize = size; best = nLabels; }
  nLabels++;
}
const mask = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) mask[i] = label[i] === best ? 1 : 0;
// Hüllquader
let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
// Profile: je Spalte (x) oberste/unterste Vordergrundzeile; je Zeile (y) linkeste/rechteste Spalte; normiert (Höhe = 1, y nach oben)
const cols = [];
for (let x = bx0; x <= bx1; x++) {
  let top = -1, bot = -1;
  for (let y = by0; y <= by1; y++) if (mask[y * W + x]) { if (top < 0) top = y; bot = y; }
  cols.push(top < 0 ? null : { u: (x - bx0) / (bw - 1), oben: (by1 - top) / (bh - 1), unten: (by1 - bot) / (bh - 1) });
}
const rows = [];
for (let y = by0; y <= by1; y++) {
  let l = -1, r = -1;
  for (let x = bx0; x <= bx1; x++) if (mask[y * W + x]) { if (l < 0) l = x; r = x; }
  rows.push(l < 0 ? null : { v: (by1 - y) / (bh - 1), links: (l - bx0) / (bh - 1), rechts: (r - bx0) / (bh - 1), breite: (r - l + 1) / (bh - 1) });
}
// Flächenschwerpunkt und Fläche (normiert)
let area = 0, cx = 0, cy = 0;
for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if (mask[y * W + x]) { area++; cx += x; cy += y; }
cx = (cx / area - bx0) / (bh - 1); cy = (by1 - cy / area) / (bh - 1);
// dominante Farben (k-means in RGB auf Vordergrundpixeln, zufällige Teilmenge)
const samples = [];
for (let i = 0; i < W * H; i += 7) if (mask[i]) { const x = i % W, y = (i / W) | 0; const [r, g, b] = px(x, y); samples.push([r, g, b]); }
let centers = Array.from({ length: nFarben }, (_, k) => samples[Math.floor((k + 0.5) * samples.length / nFarben)] ?? [0.5, 0.5, 0.5]);
for (let it = 0; it < 12; it++) {
  const acc = centers.map(() => [0, 0, 0, 0]);
  for (const s of samples) {
    let bi = 0, bd = Infinity;
    for (let k = 0; k < centers.length; k++) { const c = centers[k]; const d = (s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2; if (d < bd) { bd = d; bi = k; } }
    acc[bi][0] += s[0]; acc[bi][1] += s[1]; acc[bi][2] += s[2]; acc[bi][3]++;
  }
  centers = acc.map((a, k) => (a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : centers[k]));
  centers.anteile = acc.map((a) => a[3] / samples.length);
}
const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
const farben = centers.map((c, k) => ({ hex: hex(c), anteil: Number((centers.anteile[k] ?? 0).toFixed(3)) })).sort((a, b) => b.anteil - a.anteil);
const ergebnis = {
  bild: file, ausschnitt: [x0, y0, x1, y1], huelle: { x0: bx0 + x0, y0: by0 + y0, x1: bx1 + x0, y1: by1 + y0, breite: bw, hoehe: bh, seitenverhaeltnis: Number((bw / bh).toFixed(3)) },
  flaeche: Number((area / (bh * bh)).toFixed(4)), schwerpunkt: { x: Number(cx.toFixed(3)), y: Number(cy.toFixed(3)) },
  spalten: cols.filter(Boolean).filter((_, i) => i % Math.max(1, Math.floor(cols.length / 64)) === 0), zeilen: rows.filter(Boolean).filter((_, i) => i % Math.max(1, Math.floor(rows.length / 64)) === 0), farben,
};
writeFileSync(outBase + '.json', JSON.stringify(ergebnis, null, 1));
// Masken-PNG (weiß = Vordergrund) mit Hüllquader
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { const v = mask[i] ? 255 : 0; out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = 255; }
writePng(outBase + '-maske.png', { width: W, height: H, data: out });
console.log(`${file} → Hülle ${bw}×${bh} (B/H ${(bw / bh).toFixed(2)}), Fläche ${(area / (bh * bh)).toFixed(3)} H², Schwerpunkt (${cx.toFixed(2)}, ${cy.toFixed(2)}), Farben ${farben.slice(0, 5).map((f) => `${f.hex} ${(f.anteil * 100).toFixed(0)}%`).join(' · ')}`);
