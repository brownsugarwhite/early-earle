// Teil A, A7: alter Maulbau gegen Einsatz an Florians Befund „Bauch unter hohem Maul“ (15.10.). Je Fall dieselbe Linie (auf die
// Haut gelegt): A0 · alter Maulbau · Wärmebild alt gegen A0 · Einsatz · Wärmebild Einsatz gegen A0 (grün ≤ 0,25 px, gelb ≤ 0,5,
// orange ≤ 1, rot darüber). Ausschnitt: der ganze Körper, damit man sieht, wie weit der alte Maulbau den Körper verschiebt.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/einsatz-alt-neu.ts
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { unterteilung } from '../../../../packages/shape/src/subdivision/catmullClark';
import { anwenden3 } from '../../../../packages/shape/src/subdivision/matrix';
import { einsatzFall } from '../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { mitMaulBauen } from '../../../../packages/shape/src/kern/pruefen/masse';
import { feinesNetz } from '../../../../packages/shape/src/kern/pruefstand';
import { ankerVon, feinNetz } from '../../../../packages/shape/src/kern/einsatz/flaeche';
import { lippeAnpassen } from '../../../../packages/shape/src/kern/einsatz/lippe';
import { a0Netz, einsatzLoesen, einsatzMessen } from '../../../../packages/shape/src/kern/einsatz/loesen';
import { einsatzTopologie } from '../../../../packages/shape/src/kern/einsatz/topologie';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const b64 = (a: Float32Array | Uint32Array | Uint8Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
type V3 = [number, number, number];
const FAELLE = (process.env.FAELLE ?? 'birne/hoch/gerade,kugel/hoch/gerade,ei/hoch/s').split(',');
const tri = (fl: number[][]) => {
  const out: number[] = [];
  for (const q of fl) for (let k = 1; k + 1 < q.length; k++) out.push(q[0]!, q[k]!, q[k + 1]!);
  return Uint32Array.from(out);
};
const daten: unknown[] = [];
const texte: string[] = [];
for (const name of FAELLE) {
  const [art, anfang, form] = name.split('/') as [never, never, never];
  const f = einsatzFall(art, anfang, form);
  if (!f || 'fehler' in f) continue;
  // Bezug A0 auf Stufe 3 von K1 (= Stufe 4 von A0)
  const u1 = unterteilung(f.v.kaefig, 3);
  const fein1 = anwenden3(u1.grenze, f.v.kaefig.xyz);
  const fl1 = alleFlaechen(u1.stufen[2]!.kaefig);
  const bezug = feinNetz(fein1, fl1);
  const waermeVon = (pos: Float64Array) => {
    const w = new Float32Array(pos.length / 3);
    let max = 0;
    for (let i = 0; i < w.length; i++) {
      w[i] = ankerVon(bezug, [pos[3 * i]!, pos[3 * i + 1]!, pos[3 * i + 2]!]).abstand * 461;
      max = Math.max(max, w[i]!);
    }
    return { w, max };
  };
  // alter Maulbau mit derselben Linie
  const alt = mitMaulBauen({ ...f.dok, kaefig: { deltas: [], stationen: f.abl.gefroren }, maul: { zu: { oben: f.maulLinie } } });
  const posAlt = Float64Array.from(alt.fein);
  const flAlt = feinesNetz(alt).flaechen;
  const wAlt = waermeVon(posAlt);
  // Einsatz
  const linie = f.lippenZiel();
  const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie });
  const fit = lippeAnpassen(linie, t.m, t.lippenAnteile);
  const g = einsatzLoesen(t, f.v.kaefig, f.feld, a0Netz(f.v.kaefig, 2), fit.punkte);
  const ms = einsatzMessen(g, t, f.v.kaefig, f.feld, fit.punkte);
  const ua = unterteilung(g.kaefig, 3);
  const posNeu = anwenden3(ua.grenze, g.kaefig.xyz);
  const flNeu = alleFlaechen(ua.stufen[2]!.kaefig);
  const wNeu = waermeVon(posNeu);
  daten.push({ p1: b64(new Float32Array(fein1)), t1: b64(tri(fl1)), pA: b64(new Float32Array(posAlt)), tA: b64(tri(flAlt)), wA: b64(wAlt.w), pN: b64(new Float32Array(posNeu)), tN: b64(tri(flNeu)), wN: b64(wNeu.w), linie: linie.flat() });
  texte.push(`<b>${name}</b> · alter Maulbau: Haut bis ${wAlt.max.toFixed(1)} px von A0 verschoben · Einsatz: außen bitgleich, Haut im Feld bis ${ms.hautMax.toFixed(2)} px (99 % ${ms.hautP99.toFixed(2)})`);
}
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:10px;font:12px -apple-system,Helvetica,sans-serif;background:#f4efe6}.k{margin:0 0 12px 0}canvas{background:#fff;border:1px solid #d8cfc0;margin-right:4px}h1{font-size:15px;margin:0 0 6px}.t{display:flex;gap:4px;font-size:11px;color:#5a4a3a}.t span{width:236px}</style></head><body>
<h1>Teil A — Bauch unter hohem Maul: alter Maulbau gegen Einsatz (dieselbe Linie, Maul zu) · Abnahme offen</h1><div style="margin-bottom:6px">Wärmebild = Abstand zu A0 (Körper ohne Maul): grün ≤ 0,25 px · gelb ≤ 0,5 · orange ≤ 1 · rot darüber · blau: Linie</div>
${texte.map((t, i) => `<div class="k"><div>${t}</div><div class="t"><span>A0 (ohne Maul)</span><span>alter Maulbau</span><span>alt: Abstand zu A0</span><span>Einsatz</span><span>Einsatz: Abstand zu A0</span></div>${['a', 'b', 'c', 'd', 'e'].map((x) => `<canvas id="${x}${i}" width="236" height="230"></canvas>`).join('')}</div>`).join('')}
<script>
const D = ${JSON.stringify(daten)};
const ab = (s, T) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
const TOENE = [[150, 96, 70], [198, 140, 104], [228, 182, 146], [246, 222, 196]];
function bild(cv, pos, tri, F, art, waerme) {
  const yaw = 0.75, pitch = 0.15, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const dreh = (x, y, z) => { const x1 = cy * x + sy * z, z1 = -sy * x + cy * z; return [x1, cp * y - sp * z1, sp * y + cp * z1]; };
  const L = (() => { const l = [-0.4, 0.8, 0.6]; const n = Math.hypot(...l); return l.map((v) => v / n); })();
  const W = cv.width, H = cv.height, ctx = cv.getContext('2d');
  const n = pos.length / 3, P = new Float32Array(3 * n), N = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) P.set(dreh(pos[3*i], pos[3*i+1], pos[3*i+2]), 3 * i);
  // Ausschnitt aus dem Quader des Einsatzes (gedreht)
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const x of [F.lo[0], F.hi[0]]) for (const y of [F.lo[1], F.hi[1]]) for (const z of [-F.hi[2], F.hi[2]]) { const q = dreh(x, y, z); lo = [Math.min(lo[0], q[0]), Math.min(lo[1], q[1])]; hi = [Math.max(hi[0], q[0]), Math.max(hi[1], q[1])]; }
  
  for (let t = 0; t < tri.length; t += 3) { const a = tri[t], b = tri[t+1], c = tri[t+2]; const ux = P[3*b]-P[3*a], uy = P[3*b+1]-P[3*a+1], uz = P[3*b+2]-P[3*a+2], vx = P[3*c]-P[3*a], vy = P[3*c+1]-P[3*a+1], vz = P[3*c+2]-P[3*a+2]; const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx; for (const p of [a, b, c]) { N[3*p] += nx; N[3*p+1] += ny; N[3*p+2] += nz; } }
  const s = Math.min(W / (hi[0] - lo[0]), H / (hi[1] - lo[1])), ox = (W - s * (hi[0] - lo[0])) / 2 - s * lo[0], oy = (H + s * (hi[1] - lo[1])) / 2 + s * lo[1];
  const img = ctx.createImageData(W, H), zb = new Float32Array(W * H).fill(-Infinity);
  for (let i = 0; i < W * H; i++) { img.data[4*i] = 255; img.data[4*i+1] = 255; img.data[4*i+2] = 255; img.data[4*i+3] = 255; }
  for (let t = 0; t < tri.length; t += 3) {
    const A = tri[t], B = tri[t+1], C = tri[t+2];
    const ax = ox + s*P[3*A], ay = oy - s*P[3*A+1], bx = ox + s*P[3*B], by = oy - s*P[3*B+1], cx = ox + s*P[3*C], cyy = oy - s*P[3*C+1];
    const d = (by - cyy) * (ax - cx) + (cx - bx) * (ay - cyy); if (Math.abs(d) < 1e-12) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx))), y0 = Math.max(0, Math.floor(Math.min(ay, by, cyy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cyy)));
    if (x0 > x1 || y0 > y1) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l1 = ((by - cyy) * (px - cx) + (cx - bx) * (py - cyy)) / d, l2 = ((cyy - ay) * (px - cx) + (ax - cx) * (py - cyy)) / d, l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const z = l1 * P[3*A+2] + l2 * P[3*B+2] + l3 * P[3*C+2]; if (z <= zb[y*W+x]) continue; zb[y*W+x] = z;
      let nx = l1*N[3*A]+l2*N[3*B]+l3*N[3*C], ny = l1*N[3*A+1]+l2*N[3*B+1]+l3*N[3*C+1], nz = l1*N[3*A+2]+l2*N[3*B+2]+l3*N[3*C+2]; const ll = Math.hypot(nx, ny, nz) || 1; nx /= ll; ny /= ll; nz /= ll; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const o = 4*(y*W+x);
      let col;
      if (art === 'zebra') { const v = Math.sin(18 * Math.acos(Math.max(-1, Math.min(1, ny)))); col = v > 0 ? [30, 30, 30] : [245, 245, 245]; }
      else { const hell = Math.max(0, nx*L[0] + ny*L[1] + nz*L[2]); col = TOENE[Math.min(3, Math.floor(hell * 4.2))]; }
      if (art === 'waerme' && waerme) {
        const w = l1 > l2 && l1 > l3 ? waerme[A] : l2 > l3 ? waerme[B] : waerme[C];
        if (!Number.isNaN(w)) { const a = Math.abs(w); const c2 = w < 0 ? [70, 110, 230] : a <= 0.25 ? [60, 170, 70] : a <= 0.5 ? [235, 210, 40] : a <= 1 ? [245, 140, 30] : [220, 30, 30]; col = [0.35 * col[0] + 0.65 * c2[0], 0.35 * col[1] + 0.65 * c2[1], 0.35 * col[2] + 0.65 * c2[2]]; }
      }
      img.data[o] = col[0]; img.data[o+1] = col[1]; img.data[o+2] = col[2];
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(30,60,200,0.8)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i < F.linie.length; i += 3) { const q = dreh(F.linie[i], F.linie[i+1], F.linie[i+2]); const x = ox + s*q[0], y = oy - s*q[1]; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
}

function ganz(F, pos) { let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < pos.length; i += 3) for (let d = 0; d < 3; d++) { lo[d] = Math.min(lo[d], pos[i + d]); hi[d] = Math.max(hi[d], pos[i + d]); } return { ...F, lo, hi }; }
D.forEach((F, i) => {
  const p1 = ab(F.p1, Float32Array), t1 = ab(F.t1, Uint32Array), pA = ab(F.pA, Float32Array), tA = ab(F.tA, Uint32Array), wA = ab(F.wA, Float32Array), pN = ab(F.pN, Float32Array), tN = ab(F.tN, Uint32Array), wN = ab(F.wN, Float32Array);
  const G = ganz(F, p1);
  bild(document.getElementById('a' + i), p1, t1, G, 'cel');
  bild(document.getElementById('b' + i), pA, tA, G, 'cel');
  bild(document.getElementById('c' + i), pA, tA, G, 'waerme', wA);
  bild(document.getElementById('d' + i), pN, tN, G, 'cel');
  bild(document.getElementById('e' + i), pN, tN, G, 'waerme', wN);
});
</script></body></html>`;
const out = resolve(AUSGABE, 'einsatz-alt-neu.html');
writeFileSync(out, html);
console.log(texte.map((t) => t.replace(/<[^>]+>/g, '')).join('\n'));
console.log('geschrieben', out);
