// Fehler-Hotspots: Pixel mit Fehler > T in 12px-Zellen zählen, größte Zellen ausgeben
import { sharp, SRC, SP } from './lib.mjs';
const T = +(process.argv[3] || 60);
const A = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const B = await sharp(`${SP}/${process.argv[2]}_render.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = A.info.width, h = A.info.height, cells = new Map();
for (let i = 0; i < w*h; i++) { const d = Math.hypot(A.data[i*4]-B.data[i*4], A.data[i*4+1]-B.data[i*4+1], A.data[i*4+2]-B.data[i*4+2]); if (d > T) { const k = `${Math.floor((i%w)/12)*12},${Math.floor(i/w/12)*12}`; cells.set(k, (cells.get(k)||0)+1); } }
console.log([...cells.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 24).map(([k,v]) => `${k}:${v}`).join('  '));
