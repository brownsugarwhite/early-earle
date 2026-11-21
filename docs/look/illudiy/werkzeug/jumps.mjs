// Sprungsuche: mittlere Änderung von Bild zu Bild (verkleinert); Ausreißer gegenüber den Nachbarn melden
import fs from 'node:fs';
import { sharp, SP } from './lib.mjs';
const s = process.argv[2]; const dir = `${SP}/frames_${s}`; const files = fs.readdirSync(dir).sort(); let prev = null; const d = [];
for (const f of files) { const { data } = await sharp(`${dir}/${f}`).resize(240, 135).raw().toBuffer({ resolveWithObject: true }); if (prev) { let sum = 0; for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - prev[i]); d.push(sum / data.length); } prev = data; }
const out = []; for (let i = 2; i < d.length - 2; i++) { const nb = (d[i-2] + d[i-1] + d[i+1] + d[i+2]) / 4; if (d[i] > 2.2 * nb + 0.6) out.push(`${((i + 1) / 60).toFixed(2)}s:${d[i].toFixed(2)}/${nb.toFixed(2)}`); }
console.log(s, 'max', Math.max(...d).toFixed(2), 'bei', ((d.indexOf(Math.max(...d)) + 1) / 60).toFixed(2), 's | Ausreißer:', out.length ? out.join(' ') : 'keine');
console.log('Verlauf (je 0,25 s):', d.filter((_, i) => i % 15 === 0).map(v => v.toFixed(1)).join(' '));
