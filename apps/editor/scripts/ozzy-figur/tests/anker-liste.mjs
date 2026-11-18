import { DATEIEN, TEILE, ladeAnsicht, VORLAGEN } from './morph.mjs';
const V = {}; for (const [k, f] of Object.entries(DATEIEN)) V[k] = ladeAnsicht(VORLAGEN, f);
for (const teil of (process.argv[2] ?? 'bohne').split(',')) for (const ans of (process.argv[3] ?? 'front,logo,back,lieg1').split(',')) {
  const i = TEILE[teil][ans]; if (i === undefined) continue;
  console.log(teil, ans.padEnd(6), V[ans].els[i].form.map((a, k) => `${k}:(${a.p[0].toFixed(0)},${a.p[1].toFixed(0)})`).join(' '));
}
