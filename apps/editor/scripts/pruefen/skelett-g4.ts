// Teil G, G4 neu: Mittelachsen (Skelette) der drei Ansichten je Körper — Rumpfachse grün, Äste rot (mit Überstand),
// Skelettzellen grau, Silhouette hell. So erkennt die Bauweise automatisch, welche Wirbelsäulen ein Wesen braucht.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/skelett-g4.ts
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { skelett } from '../../../../packages/shape/src/kern/grundkoerper/skelett';
import { G_KOERPER, type GKoerper, gKoerperDokument } from '../../../../packages/shape/src/kern/pruefen/grundkoerper';
import { type KoerperArt, koerperDokument } from '../../../../packages/shape/src/kern/pruefen/koerper';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const PX = 461;
const liste = (process.env.KOERPER ?? 'kugel,ei,birne,rex,langhals,robbe,drache,ente,giraffe-bauch,s-hals,fisch').split(',');
const dokVon = (n: string): Dokument => ((G_KOERPER as readonly string[]).includes(n) ? gKoerperDokument(n as GKoerper) : koerperDokument(n as KoerperArt, zufall(1)));

const daten: unknown[] = [];
const zeilen: string[] = [];
for (const name of liste) {
  const dok = dokVon(name);
  const sk = dok.skalierung;
  const ansichten: Record<string, unknown> = {};
  const text: string[] = [];
  for (const a of ['seite', 'front', 'top'] as const) {
    const poly = pfadAbtasten(vollerPfad(dok.profile[a]), 32).map((p) => ({ x: p.x * sk, y: p.y * sk }));
    const t0 = performance.now();
    const s = skelett(poly, 240, a === 'front' ? 'x' : a === 'top' ? 'y' : undefined);
    const ms = performance.now() - t0;
    const zellen: number[] = [];
    for (let i = 0; i < s.zellen.length; i++) if (s.zellen[i]) zellen.push(s.raster.ox + ((i % s.raster.W) + 0.5) * s.raster.h, s.raster.oy + (Math.floor(i / s.raster.W) + 0.5) * s.raster.h);
    ansichten[a] = { poly: poly.flatMap((p) => [p.x, p.y]), zellen, aeste: s.aeste.map((x) => ({ p: x.punkte.flatMap((q) => [q.x, q.y]), eltern: x.eltern, ueber: x.ueberstand })) };
    text.push(`${a}: ${s.aeste.length - 1} Äste${s.aeste.length > 1 ? ` (Überstand ${s.aeste.slice(1).map((x) => (x.ueberstand * PX).toFixed(0)).join('/')} px)` : ''}, ${ms.toFixed(0)} ms`);
  }
  daten.push({ name, ansichten });
  zeilen.push(`${name}: ${text.join(' · ')}`);
}
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:10px;font:13px -apple-system,Helvetica,sans-serif;background:#f4efe6}canvas{background:#fff;border:1px solid #d8cfc0;margin:2px}</style>
<h3>Teil G, G4 neu — Mittelachsen der drei Ansichten (grün Rumpf, rot Äste) · Abnahme offen</h3>
<div id="w"></div><script>
const D = ${JSON.stringify(daten)};
const T = ${JSON.stringify(zeilen)};
const w = document.getElementById('w');
D.forEach((d, k) => {
  const div = document.createElement('div'); div.innerHTML = '<b>' + T[k] + '</b><br>'; w.appendChild(div);
  for (const a of ['seite', 'front', 'top']) {
    const v = d.ansichten[a]; const cv = document.createElement('canvas'); cv.width = 300; cv.height = 260; div.appendChild(cv);
    const c = cv.getContext('2d');
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < v.poly.length; i += 2) { x0 = Math.min(x0, v.poly[i]); x1 = Math.max(x1, v.poly[i]); y0 = Math.min(y0, v.poly[i + 1]); y1 = Math.max(y1, v.poly[i + 1]); }
    const s = 0.88 * Math.min(cv.width / (x1 - x0), cv.height / (y1 - y0));
    const X = (x) => (cv.width - s * (x1 - x0)) / 2 + s * (x - x0), Y = (y) => (cv.height + s * (y1 - y0)) / 2 - s * (y - y0);
    c.fillStyle = '#f2d9b8'; c.strokeStyle = '#000'; c.lineWidth = 1.2; c.beginPath();
    for (let i = 0; i < v.poly.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, X(v.poly[i]), Y(v.poly[i + 1]));
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < v.zellen.length; i += 2) c.fillRect(X(v.zellen[i]) - 1, Y(v.zellen[i + 1]) - 1, 2, 2);
    v.aeste.forEach((ast, i) => {
      c.strokeStyle = i === 0 ? '#1a9a3a' : '#d0303a'; c.lineWidth = i === 0 ? 3 : 2.2; c.beginPath();
      for (let j = 0; j < ast.p.length; j += 2) (j ? c.lineTo : c.moveTo).call(c, X(ast.p[j]), Y(ast.p[j + 1]));
      c.stroke();
      if (i > 0) { c.fillStyle = '#d0303a'; c.beginPath(); c.arc(X(ast.p[0]), Y(ast.p[1]), 3.5, 0, 7); c.fill(); }
    });
  }
});
</script>`;
writeFileSync(resolve(AUSGABE, 'skelett-g4.html'), html);
console.log(zeilen.join('\n'));
