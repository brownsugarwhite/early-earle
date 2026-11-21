// Rendert ein SVG (librsvg über sharp) und vergleicht mit dem Original: Fehlerbild und Kennzahlen.
import { sharp, SRC, SP } from './lib.mjs';
const file = process.argv[2], tag = process.argv[3] || 'diff';
const A = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const B = await sharp(file, { density: 72 }).resize(A.info.width, A.info.height).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = A.info.width, h = A.info.height, a = A.data, b = B.data;
const out = Buffer.alloc(w * h * 3); let sum = 0, n20 = 0, n50 = 0, n100 = 0;
for (let i = 0; i < w * h; i++) {
  const d = Math.hypot(a[i*4]-b[i*4], a[i*4+1]-b[i*4+1], a[i*4+2]-b[i*4+2]); sum += d; if (d > 20) n20++; if (d > 50) n50++; if (d > 100) n100++;
  const g = (a[i*4] + a[i*4+1] + a[i*4+2]) / 3 * 0.25; const v = Math.min(255, d * 4);
  out[i*3] = Math.min(255, g + v); out[i*3+1] = g; out[i*3+2] = g;
}
console.log(`mittlerer Fehler ${(sum/(w*h)).toFixed(3)}  >20: ${(n20/(w*h)*100).toFixed(3)}%  >50: ${(n50/(w*h)*100).toFixed(3)}%  >100: ${(n100/(w*h)*100).toFixed(3)}% (${n100} px)`);
await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toFile(`${SP}/${tag}.png`);
await sharp(B.data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${SP}/${tag}_render.png`);
