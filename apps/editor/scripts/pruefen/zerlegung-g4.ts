// Teil G, G4 neu: automatische Zerlegung der Seite in Rumpf (grün) und Äste (rot) mit Schnittsehnen (schwarz), dazu die
// Mittelachsen. Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/zerlegung-g4.ts
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { seiteZerlegen } from '../../../../packages/shape/src/kern/grundkoerper/zerlegung';
import { G_KOERPER, type GKoerper, gKoerperDokument } from '../../../../packages/shape/src/kern/pruefen/grundkoerper';
import { type KoerperArt, koerperDokument } from '../../../../packages/shape/src/kern/pruefen/koerper';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const liste = (process.env.KOERPER ?? 'kugel,ei,birne,rex,langhals,robbe,drache,kasten,ente,giraffe-bauch,s-hals,fisch').split(',');
const dokVon = (n: string): Dokument => ((G_KOERPER as readonly string[]).includes(n) ? gKoerperDokument(n as GKoerper) : koerperDokument(n as KoerperArt, zufall(1)));
const daten: unknown[] = [];
for (const name of liste) {
  const dok = dokVon(name);
  const sk = dok.skalierung;
  const poly = pfadAbtasten(vollerPfad(dok.profile.seite), 32).map((p) => ({ x: p.x * sk, y: p.y * sk }));
  const z = seiteZerlegen(poly);
  const flach = (pts: { x: number; y: number }[]) => pts.flatMap((p) => [p.x, p.y]);
  daten.push({ name, poly: flach(poly), rumpf: flach(z.rumpf.umriss), achse: flach(z.rumpf.achse.punkte), aeste: z.aeste.map((a) => ({ umriss: flach(a.umriss), achse: flach(a.achse.punkte), schnitt: flach(a.schnitt), text: `${a.art} ${a.winkel.toFixed(0)}° Dicke ${a.dicke.toFixed(2)}` })) });
  console.log(`${name}: ${z.aeste.length} Äste ${z.aeste.map((a) => `${a.art} ${a.winkel.toFixed(0)}° Dicke ${a.dicke.toFixed(2)}`).join(', ')}`);
}
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:10px;font:13px -apple-system,Helvetica,sans-serif;background:#f4efe6}canvas{background:#fff;border:1px solid #d8cfc0;margin:3px}.k{display:inline-block;vertical-align:top;margin:4px}</style>
<h3>Teil G, G4 neu — Zerlegung der Seite: Rumpf grün, Äste rot, Schnitt schwarz · Abnahme offen</h3><div id="w"></div><script>
const D = ${JSON.stringify(daten)};
const w = document.getElementById('w');
for (const d of D) {
  const k = document.createElement('div'); k.className = 'k'; k.innerHTML = '<b>' + d.name + '</b> ' + d.aeste.map((a) => a.text).join(' · ') + '<br>'; w.appendChild(k);
  const cv = document.createElement('canvas'); cv.width = 300; cv.height = 260; k.appendChild(cv); const c = cv.getContext('2d');
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < d.poly.length; i += 2) { x0 = Math.min(x0, d.poly[i]); x1 = Math.max(x1, d.poly[i]); y0 = Math.min(y0, d.poly[i + 1]); y1 = Math.max(y1, d.poly[i + 1]); }
  const s = 0.88 * Math.min(cv.width / (x1 - x0), cv.height / (y1 - y0));
  const X = (x) => (cv.width - s * (x1 - x0)) / 2 + s * (x - x0), Y = (y) => (cv.height + s * (y1 - y0)) / 2 - s * (y - y0);
  const flaeche = (p, farbe) => { c.fillStyle = farbe; c.beginPath(); for (let i = 0; i < p.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, X(p[i]), Y(p[i + 1])); c.closePath(); c.fill(); };
  const linie = (p, farbe, b) => { c.strokeStyle = farbe; c.lineWidth = b; c.beginPath(); for (let i = 0; i < p.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, X(p[i]), Y(p[i + 1])); c.stroke(); };
  flaeche(d.rumpf, 'rgba(60,170,90,0.35)');
  for (const a of d.aeste) flaeche(a.umriss, 'rgba(220,60,60,0.35)');
  linie([...d.poly, d.poly[0], d.poly[1]], '#000', 1.2);
  linie(d.achse, '#1a9a3a', 2.5);
  for (const a of d.aeste) { linie(a.achse, '#d0303a', 2); linie(a.schnitt, '#000', 2.5); }
}
</script>`;
writeFileSync(resolve(AUSGABE, 'zerlegung-g4.html'), html);
