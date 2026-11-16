// Erste Vermessung des Logos: Farben, Alpha, Rahmen der dunklen Fläche, zusammenhängende Flächen.
import { lesePng } from './png.mjs';

const datei = process.argv[2] ?? '../../docs/look/maskottchen/ozzy-logo.png';
const b = lesePng(datei);
const { breite: W, hoehe: H, rgba } = b;
let minA = 255;
let maxA = 0;
const lum = new Uint32Array(256);
for (let i = 0; i < rgba.length; i += 4) {
  minA = Math.min(minA, rgba[i + 3]);
  maxA = Math.max(maxA, rgba[i + 3]);
  lum[Math.round((rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3)]++;
}
console.log('Größe', W, H, 'Alpha', minA, maxA);
const bins = [];
for (let i = 0; i < 256; i += 32) {
  let s = 0;
  for (let j = i; j < i + 32; j++) s += lum[j];
  bins.push(s);
}
console.log('Helligkeit in 8 Stufen', bins.join(' '));

// Dunkel = Helligkeit unter 128 (Alpha mitgedacht: transparent zählt als hell)
const dunkel = new Uint8Array(W * H);
for (let i = 0, j = 0; j < W * H; i += 4, j++) {
  const a = rgba[i + 3] / 255;
  const l = ((rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3) * a + 255 * (1 - a);
  dunkel[j] = l < 128 ? 1 : 0;
}
// Zusammenhängende Flächen (4er-Nachbarschaft) für dunkel und hell
function flaechen(wert) {
  const marke = new Int32Array(W * H).fill(-1);
  const liste = [];
  const stapel = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (dunkel[s] !== wert || marke[s] >= 0) continue;
    const id = liste.length;
    let n = 0;
    let top = 0;
    stapel[top++] = s;
    marke[s] = id;
    let x0 = 1e9;
    let y0 = 1e9;
    let x1 = -1;
    let y1 = -1;
    let sx = 0;
    let sy = 0;
    while (top) {
      const p = stapel[--top];
      n++;
      const x = p % W;
      const y = (p / W) | 0;
      sx += x;
      sy += y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
      for (const q of nb) if (q >= 0 && dunkel[q] === wert && marke[q] < 0) {
        marke[q] = id;
        stapel[top++] = q;
      }
    }
    liste.push({ id, n, rahmen: [x0, y0, x1, y1], mitte: [Math.round(sx / n), Math.round(sy / n)] });
  }
  return liste;
}
const d = flaechen(1).filter((f) => f.n > 20);
const h = flaechen(0).filter((f) => f.n > 20);
console.log('dunkle Flächen', d.length);
for (const f of d) console.log('  D', f.id, f.n, f.rahmen.join(','), 'mitte', f.mitte.join(','));
console.log('helle Flächen', h.length);
for (const f of h) console.log('  H', f.id, f.n, f.rahmen.join(','), 'mitte', f.mitte.join(','));
