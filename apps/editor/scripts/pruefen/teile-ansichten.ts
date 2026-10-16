// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4: Teile je Ansicht (Seite, Front, Back, Top, Bottom) — sichtbare Flächen
// farbig je Teil, verdeckte Teilumrisse gestrichelt, Wirbelsäulen mit Knoten, schwarze Linie. So zeigt es der Editor.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/teile-ansichten.ts (KOERPER, NAME)
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { huelle } from '../../../../packages/shape/src/kern/grundkoerper/huelle';
import { teilAnsichten } from '../../../../packages/shape/src/kern/grundkoerper/teilAnsicht';
import { teilbaum } from '../../../../packages/shape/src/kern/grundkoerper/teilbaum';
import { TEIL_SATZ_KOERPER, teilSatzDokument } from '../../../../packages/shape/src/kern/pruefen/teilsatz';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const NAME = process.env.NAME ?? 'teile-ansichten';
const liste = (process.env.KOERPER ?? TEIL_SATZ_KOERPER.join(',')).split(',');
const r4 = (x: number) => (Number.isFinite(x) ? +x.toFixed(4) : null);
const daten = liste.map((name) => {
  const dok = teilSatzDokument(name);
  const h = huelle(dok);
  const b = teilbaum(dok);
  const t0 = performance.now();
  const a = teilAnsichten(dok, b, 160, h);
  const ms = performance.now() - t0;
  const flach = (ps: readonly { x: number; y: number }[]) => ps.flatMap((p) => [r4(p.x), r4(p.y)]);
  const blatt = (k: 'seite' | 'front' | 'hinten' | 'top' | 'unten') => ({
    poly: flach(h[k === 'hinten' ? 'front' : k === 'unten' ? 'top' : k]),
    flaechen: a[k].flaechen.map((f) => ({ teil: f.teil, z: Array.from(f.zuege, r4) })),
    verdeckt: a[k].verdeckt.map((f) => ({ teil: f.teil, z: Array.from(f.zuege, r4) })),
  });
  // Wirbelsäulen je Ansicht: Seite (x, y), Front (z, y), Top (x, z); Paare beidseitig
  const achsen = b.teile.map((t, i) => ({ teil: i, paar: t.art === 'paar', k: t.knoten.flatMap((p) => p.map(r4)), a: t.achse.flatMap((p) => p.map(r4)) }));
  return { name, ms: +ms.toFixed(1), teile: b.teile.map((t) => `${t.id} ${t.art} ${t.richtung}`), seite: blatt('seite'), front: blatt('front'), hinten: blatt('hinten'), top: blatt('top'), unten: blatt('unten'), achsen };
});
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:10px;font:12px -apple-system,Helvetica,sans-serif;background:#f4efe6}canvas{background:#fff;border:1px solid #d8cfc0;margin:2px}</style>
<h3>S4 Teile je Ansicht — Seite · Front · Back · Top · Bottom: Flächen je Teil, verdeckte Teilumrisse gestrichelt, Wirbelsäulen mit Knoten</h3>
<div id="w"></div><script>
const D = ${JSON.stringify(daten)};
const FARBEN = ['#9aa6b2', '#e4572e', '#29a3a3', '#f2a541', '#7b5ea7', '#3f88c5', '#d64f9a', '#5aa469'];
const w = document.getElementById('w');
for (const d of D) {
  const div = document.createElement('div'); w.appendChild(div);
  const t = document.createElement('div'); t.innerHTML = '<b>' + d.name + '</b> ' + d.ms + ' ms · ' + d.teile.map((x, i) => '<span style="color:' + FARBEN[i % 8] + '">■</span> ' + x).join(' · '); div.appendChild(t);
  for (const k of ['seite', 'front', 'hinten', 'top', 'unten']) {
    const v = d[k]; const cv = document.createElement('canvas'); cv.width = 230; cv.height = 190; div.appendChild(cv);
    const c = cv.getContext('2d');
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < v.poly.length; i += 2) { x0 = Math.min(x0, v.poly[i]); x1 = Math.max(x1, v.poly[i]); y0 = Math.min(y0, v.poly[i + 1]); y1 = Math.max(y1, v.poly[i + 1]); }
    const s = 0.86 * Math.min(cv.width / (x1 - x0), cv.height / (y1 - y0));
    // Back: gespiegelt (von hinten), Top: +z nach unten, Bottom: von unten (gespiegelt)
    const sx = k === 'hinten' ? -1 : 1, sy = k === 'top' ? -1 : k === 'unten' ? 1 : 1;
    const X = (x) => cv.width / 2 + sx * s * (x - (x0 + x1) / 2);
    const Y = (y) => cv.height / 2 - (k === 'top' ? -1 : 1) * s * (y - (y0 + y1) / 2);
    const pfad = (z) => { c.beginPath(); let neu = true; for (let i = 0; i < z.length; i += 2) { if (z[i] === null) { neu = true; continue; } if (neu) { c.moveTo(X(z[i]), Y(z[i + 1])); neu = false; } else c.lineTo(X(z[i]), Y(z[i + 1])); } };
    c.save(); pfad(v.poly); c.closePath(); c.clip();
    for (const f of v.flaechen) { c.fillStyle = FARBEN[f.teil % 8] + '66'; pfad(f.z); c.fill('evenodd'); }
    c.restore();
    c.strokeStyle = '#000'; c.lineWidth = 1.2; pfad(v.poly); c.closePath(); c.stroke();
    c.setLineDash([3, 3]); c.lineWidth = 1;
    for (const f of v.verdeckt) { c.strokeStyle = FARBEN[f.teil % 8]; pfad(f.z); c.stroke(); }
    c.setLineDash([]);
    // Wirbelsäulen: Seite (x, y), Front/Back (z, y), Top/Bottom (x, z)
    for (const a of d.achsen) {
      for (const seite of a.paar && k !== 'seite' ? [1, -1] : [1]) {
        const proj = (i, arr) => { const x = arr[i], y = arr[i + 1], z = arr[i + 2] * seite; return k === 'seite' ? [x, y] : k === 'front' || k === 'hinten' ? [z, y] : [x, z]; };
        c.strokeStyle = FARBEN[a.teil % 8]; c.lineWidth = 2; c.beginPath();
        for (let i = 0; i < a.a.length; i += 3) { const [u, q] = proj(i, a.a); (i ? c.lineTo : c.moveTo).call(c, X(u), Y(q)); }
        c.stroke(); c.fillStyle = FARBEN[a.teil % 8];
        for (let i = 0; i < a.k.length; i += 3) { const [u, q] = proj(i, a.k); c.beginPath(); c.arc(X(u), Y(q), 2.5, 0, 7); c.fill(); }
      }
    }
    c.fillStyle = '#555'; c.fillText(k, 4, 12);
  }
}
</script>`;
writeFileSync(resolve(AUSGABE, `${NAME}.html`), html);
console.log(daten.map((d) => `${d.name} ${d.ms} ms`).join(' · '));
