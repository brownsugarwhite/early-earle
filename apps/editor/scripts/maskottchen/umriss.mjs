// Umriss eines Körperteils aus den Ankern abtasten: unterster Punkt je Streifen und die Ausdehnung (für Stützen und Haut).
//   node scripts/maskottchen/umriss.mjs <teil> <ansicht>
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../src/maskottchen/daten/anker.ts', import.meta.url), 'utf8');
const gruppe = process.env.GRUPPE === 'kopf' ? 'kopfAnker' : 'koerperAnker';
const m = src.match(new RegExp(`export const ${gruppe}: AnkerRoh\\[\\] = (\\[.*\\]);`));
const k = JSON.parse(m[1]);
const teil = k.find((t) => t.name === (process.argv[2] ?? 'rumpf'));
const w = process.argv[3] ?? '90';
const a = teil.ansichten[w];
const n = teil.n;
const pts = [];
for (let i = 0; i < n; i++) {
  const j = (i + 1) % n;
  const p0 = [a[i * 6], a[i * 6 + 1]];
  const c1 = [p0[0] + a[i * 6 + 4], p0[1] + a[i * 6 + 5]];
  const p3 = [a[j * 6], a[j * 6 + 1]];
  const c2 = [p3[0] + a[j * 6 + 2], p3[1] + a[j * 6 + 3]];
  for (let s = 0; s < 40; s++) {
    const t = s / 40;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1],
    ]);
  }
}
const streifen = {};
const schritt = Number(process.env.STREIFEN ?? 50);
for (const [x, y] of pts) {
  const s = Math.round(x / schritt) * schritt;
  if (!(s in streifen) || y > streifen[s]) streifen[s] = y;
}
console.log(
  Object.entries(streifen)
    .sort((p, q) => p[0] - q[0])
    .map(([x, y]) => `${x}:${y.toFixed(0)}`)
    .join('  '),
);
let minx = 1e9;
let maxx = -1e9;
let miny = 1e9;
let maxy = -1e9;
for (const [x, y] of pts) {
  minx = Math.min(minx, x);
  maxx = Math.max(maxx, x);
  miny = Math.min(miny, y);
  maxy = Math.max(maxy, y);
}
console.log({ minx: Math.round(minx), maxx: Math.round(maxx), miny: Math.round(miny), maxy: Math.round(maxy) });
if (process.env.ANKER) for (let i = 0; i < n; i++) console.log(i, Object.entries(teil.marken).find(([, v]) => v === i)?.[0] ?? '', a[i * 6].toFixed(0), a[i * 6 + 1].toFixed(0));
