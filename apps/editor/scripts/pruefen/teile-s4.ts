// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4 „Teile erkennen“: Kandidaten der drei Ansichten je Körper des Prüfsatzes
// — Rumpfachse grün, angenommene Äste rot (Teil), Grenzfälle (Maß 0,85–1,15) orange, verworfene grau; Sehnen schwarz; im
// Titel die Einordnung und ob sie der von Hand entspricht (`kern/pruefen/teilsatz.ts`).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/teile-s4.ts (KOERPER = Komma-Liste, NAME)
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { huelle } from '../../../../packages/shape/src/kern/grundkoerper/huelle';
import { teilbaum } from '../../../../packages/shape/src/kern/grundkoerper/teilbaum';
import { TEIL_SATZ, TEIL_SATZ_KOERPER, einordnungPruefen, teilSatzDokument } from '../../../../packages/shape/src/kern/pruefen/teilsatz';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const NAME = process.env.NAME ?? 'teile-s4';
const liste = (process.env.KOERPER ?? TEIL_SATZ_KOERPER.join(',')).split(',');
const flach = (ps: readonly { x: number; y: number }[]) => ps.flatMap((p) => [+p.x.toFixed(4), +p.y.toFixed(4)]);
const daten = liste.map((name) => {
  const dok = teilSatzDokument(name);
  const h = huelle(dok);
  const b = teilbaum(dok);
  const p = einordnungPruefen(dok, b, TEIL_SATZ[name]!);
  const ans = (blatt: 'seite' | 'front' | 'top') => ({
    poly: flach(h[blatt]),
    rumpf: blatt === 'seite' ? flach(b.rumpf.achse.punkte) : [],
    kand: b.kandidaten.filter((c) => c.blatt === blatt).map((c) => ({ achse: flach(c.achse.punkte), schnitt: flach(c.schnitt), mass: +c.mass.toFixed(2), teil: c.teil, q: c.quelle, s: c.werte.seitlich ?? -1 })),
  });
  const teile = b.teile.slice(1).map((t) => `${t.art === 'paar' ? 'Paar' : 'Mitte'} ${t.richtung}`).join(', ') || 'nur Rumpf';
  return { name, zeit: +b.zeit.toFixed(0), teile, richtig: p.richtig, fehler: [...p.fehlt.map((x) => `fehlt ${x}`), ...p.falscheArt, ...p.zuviel.map((x) => `zu viel ${x}`)].join('; '), seite: ans('seite'), front: ans('front'), top: ans('top') };
});
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:10px;font:12px -apple-system,Helvetica,sans-serif;background:#f4efe6}canvas{background:#fff;border:1px solid #d8cfc0;margin:2px}.k{display:inline-block;margin:0 8px 10px 0;vertical-align:top}</style>
<h3>S4 Teile erkennen — rot Teil, orange Grenzfall (Maß 0,85–1,15), grau verworfen · Sehne schwarz · Rumpfachse grün · Top: +z nach unten</h3>
<div id="w"></div><script>
const D = ${JSON.stringify(daten)};
const w = document.getElementById('w');
for (const d of D) {
  const div = document.createElement('div'); div.className = 'k'; w.appendChild(div);
  const t = document.createElement('div'); div.appendChild(t);
  for (const a of ['seite', 'front', 'top']) {
    const v = d[a]; const cv = document.createElement('canvas'); cv.width = 200; cv.height = 170; div.appendChild(cv);
    const c = cv.getContext('2d');
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < v.poly.length; i += 2) { x0 = Math.min(x0, v.poly[i]); x1 = Math.max(x1, v.poly[i]); y0 = Math.min(y0, v.poly[i + 1]); y1 = Math.max(y1, v.poly[i + 1]); }
    const s = 0.86 * Math.min(cv.width / (x1 - x0), cv.height / (y1 - y0));
    // Top: Blatt-y = z, mit +z nach unten wie im Editor (Schnauze links)
    const X = (x) => (cv.width - s * (x1 - x0)) / 2 + s * (x - x0), Y = a === 'top' ? (y) => (cv.height - s * (y1 - y0)) / 2 + s * (y - y0) : (y) => (cv.height + s * (y1 - y0)) / 2 - s * (y - y0);
    c.fillStyle = '#f2d9b8'; c.strokeStyle = '#000'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < v.poly.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, X(v.poly[i]), Y(v.poly[i + 1]));
    c.closePath(); c.fill(); c.stroke();
    const linie = (p, farbe, b) => { c.strokeStyle = farbe; c.lineWidth = b; c.beginPath(); for (let j = 0; j < p.length; j += 2) (j ? c.lineTo : c.moveTo).call(c, X(p[j]), Y(p[j + 1])); c.stroke(); };
    if (v.rumpf.length) linie(v.rumpf, '#1a9a3a', 2.5);
    for (const k of v.kand) {
      const farbe = k.teil ? '#d0303a' : k.mass >= 0.85 ? '#f08a00' : '#aaa';
      linie(k.achse, farbe, k.mass >= 0.85 ? 2.2 : 1);
      if (k.mass >= 0.85) linie(k.schnitt, '#000', 1.5);
      const e = k.achse.length - 2; c.fillStyle = farbe; c.font = '10px sans-serif'; c.fillText(k.mass.toFixed(2) + (k.s >= 0 ? ' s' + k.s.toFixed(2) : ''), X(k.achse[e]) + 3, Y(k.achse[e + 1]) - 3);
    }
  }
  t.innerHTML = '<b>' + d.name + '</b> ' + d.zeit + ' ms · ' + d.teile + ' · ' + (d.richtig ? '<span style="color:#1a9a3a">wie von Hand</span>' : '<span style="color:#d0303a">' + d.fehler + '</span>');
}
</script>`;
writeFileSync(resolve(AUSGABE, `${NAME}.html`), html);
console.log(`${AUSGABE}/${NAME}.html`);
