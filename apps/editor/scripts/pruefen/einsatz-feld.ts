// Teil A, Schritt A3: Feld-Bögen. Je Fall der Körper ohne Maul (Grenzfläche Stufe 3, Cel-Stufen), das Feld M der Stufe 1
// eingefärbt (orange), der Kragen hell, die Pole am Rand (Valenz ≠ 4 nach dem Einsetzen: rot = 5, blau = 3), die Maullinie
// (dunkelblau). Schrägansicht von vorn rechts.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/einsatz-feld.ts
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { unterteilung } from '../../../../packages/shape/src/subdivision/catmullClark';
import { anwenden3 } from '../../../../packages/shape/src/subdivision/matrix';
import { ableiten } from '../../../../packages/shape/src/kern/ableiten';
import { feldMitGerademRand, flaechenAbstand } from '../../../../packages/shape/src/kern/einsatz/feld';
import { aufschneiden, feinNetz, kantenPfad, linieAufNetz } from '../../../../packages/shape/src/kern/einsatz/flaeche';
import { karteBauen } from '../../../../packages/shape/src/kern/einsatz/karte';
import { verfeinern1 } from '../../../../packages/shape/src/kern/einsatz/verfeinern';
import { feinesNetz, hautAusNetz } from '../../../../packages/shape/src/kern/pruefstand';
import { GRUNDKOERPER, type KoerperArt, koerperDokument, vorlageVon } from '../../../../packages/shape/src/kern/pruefen/koerper';
import { type Anfang, type Form, maulBezug, maulLinien } from '../../../../packages/shape/src/kern/pruefen/linien';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const b64 = (a: Float32Array | Uint32Array | Uint8Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');

const faelle: [KoerperArt, Anfang, Form][] = [];
for (const k of ['kugel', 'ei', 'birne', 'rex', 'langhals', 'robbe'] as KoerperArt[]) for (const [a, f] of [['mittel', 'gerade'], ['tief', 'j']] as [Anfang, Form][]) faelle.push([k, a, f]);
const daten: unknown[] = [];
const texte: string[] = [];
for (const [art, anfang, form] of faelle) {
  const dok = koerperDokument(art, zufall(1));
  const abl = ableiten(dok, { stufen: 3 });
  const vorlage = GRUNDKOERPER.includes(art) ? null : vorlageVon(art as 'rex' | 'langhals' | 'robbe');
  const l = maulLinien(dok, art, maulBezug(art, dok, vorlage), hautAusNetz(abl), anfang, form, 'kurz', 'gleich', zufall(3));
  if ('fehler' in l) continue;
  const { flaechen } = feinesNetz(abl);
  const netz = feinNetz(abl.fein, flaechen);
  const auf = linieAufNetz(netz, l.oben);
  const v = verfeinern1(abl.kaefig);
  const u = unterteilung(v.kaefig, 2);
  const fein = anwenden3(u.grenze, v.kaefig.xyz);
  const ff = alleFlaechen(u.stufen[u.stufen.length - 1]!.kaefig);
  const d = flaechenAbstand(fein, ff, v.kaefig.nF, auf.lagen);
  const kanten: number[] = [];
  for (let e = 0; e < v.kaefig.nE; e++) {
    const a = v.kaefig.eA[e]!;
    const b = v.kaefig.eB[e]!;
    kanten.push(Math.hypot(v.kaefig.xyz[3 * a]! - v.kaefig.xyz[3 * b]!, v.kaefig.xyz[3 * a + 1]! - v.kaefig.xyz[3 * b + 1]!, v.kaefig.xyz[3 * a + 2]! - v.kaefig.xyz[3 * b + 2]!));
  }
  kanten.sort((a, b) => a - b);
  const h1 = kanten[Math.floor(kanten.length / 2)]!;
  const s = feldMitGerademRand(v.kaefig, d, 3 * h1, h1);
  // je feinem Dreieck: Färbung (0 Körper, 1 Feld, 2 Kragen)
  const block = ff.length / v.kaefig.nF;
  const art8 = new Uint8Array(v.kaefig.nF);
  for (const f of s.feld) art8[f] = 1;
  for (const f of s.kragen) art8[f] = 2;
  const tri: number[] = [];
  const farbe: number[] = [];
  ff.forEach((f, i) => {
    const a = art8[Math.floor(i / block)]!;
    for (let k = 1; k + 1 < f.length; k++) {
      tri.push(f[0]!, f[k]!, f[k + 1]!);
      farbe.push(a);
    }
  });
  // Pole: Randpunkte mit Valenz ≠ 4 (Grenzlage des Käfigpunkts über die Stufe-L−1-Lage: Punktindex bleibt in der Unterteilung)
  const pole: number[] = [];
  s.rand.forEach((p, i) => {
    if (s.valenz[i] !== 4) pole.push(fein[3 * p]!, fein[3 * p + 1]!, fein[3 * p + 2]!, s.valenz[i]!);
  });
  // A4: Karte des halben Felds, Höhenlinien von U (Reihen) und V (Speichen) als 3D-Strecken, gespiegelt
  const dreiecke: number[] = [];
  for (const f of s.feld)
    for (let q = f * block; q < (f + 1) * block; q++) {
      if (ff[q]!.some((p) => netz.punkte[3 * p + 2]! < -1e-9)) continue;
      dreiecke.push(2 * q, 2 * q + 1);
    }
  const pfad = kantenPfad(netz, dreiecke, auf.lagen);
  const linien: number[] = [];
  if (pfad.length > 1) {
    const sch = aufschneiden(netz, dreiecke, pfad);
    const k = karteBauen({ dreiecke: sch.dreiecke, punkte: netz.punkte, nPunkte: netz.punkte.length / 3, doppel: sch.doppel, pfad });
    const idx = new Map<number, number>();
    k.punkte.forEach((g, i) => idx.set(g, i));
    const lage = (g: number) => {
      const o = sch.doppel.get(g) ?? g;
      return [netz.punkte[3 * o]!, netz.punkte[3 * o + 1]!, netz.punkte[3 * o + 2]!];
    };
    const stufen = (werte: Float64Array, c: number, art: number) => {
      for (let t = 0; t < sch.dreiecke.length; t += 3) {
        const g = [sch.dreiecke[t]!, sch.dreiecke[t + 1]!, sch.dreiecke[t + 2]!];
        const w = g.map((x) => werte[idx.get(x)!]!);
        const pts: number[][] = [];
        for (let e2 = 0; e2 < 3; e2++) {
          const a = w[e2]!;
          const b = w[(e2 + 1) % 3]!;
          if ((a - c) * (b - c) < 0) {
            const tt = (c - a) / (b - a);
            const pa = lage(g[e2]!);
            const pb = lage(g[(e2 + 1) % 3]!);
            pts.push([pa[0]! + (pb[0]! - pa[0]!) * tt, pa[1]! + (pb[1]! - pa[1]!) * tt, pa[2]! + (pb[2]! - pa[2]!) * tt]);
          }
        }
        if (pts.length === 2) for (const sgn of [1, -1]) linien.push(pts[0]![0]!, pts[0]![1]!, sgn * pts[0]![2]!, pts[1]![0]!, pts[1]![1]!, sgn * pts[1]![2]!, art);
      }
    };
    for (const c of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) stufen(k.u, c, 0);
    for (let j = 1; j < 16; j++) stufen(k.v, j / 16, 1);
  }
  daten.push({ pos: b64(new Float32Array(fein)), tri: b64(Uint32Array.from(tri)), farbe: b64(Uint8Array.from(farbe)), pole, linie: auf.lagen.flat(), karte: linien });
  texte.push(`<b>${art} · ${anfang} · ${form}</b> · Feld ${s.feld.length} Flächen, Kragen ${s.kragen.length}, Pole Σ ${s.polSumme} (Soll ${s.polSummeSoll}), konkav ${s.konkav}, m ${s.m}`);
}
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:10px;font:12px -apple-system,Helvetica,sans-serif;background:#f4efe6}.k{display:inline-block;margin:0 6px 8px 0;vertical-align:top}canvas{background:#fff;border:1px solid #d8cfc0;display:block}h1{font-size:15px;margin:0 0 6px}</style></head><body>
<h1>Teil A, A3 + A4 — Feld M der Stufe 1 um die Maullinie und seine Karte · Abnahme offen</h1><div style="margin-bottom:6px">orange = Feld M (wird durch den Einsatz ersetzt) · hell = Kragen · rote Punkte = Fünferpole, blaue = Dreier (nach dem Einsetzen) · dunkelblau = Maullinie (rechte Hälfte) · A4: Höhenlinien der Karte, orange = U (künftige Reihen um den Mund), braun = V (künftige Speichen), links gespiegelt</div>
${texte.map((t, i) => `<div class="k"><div style="width:400px;height:30px">${t}</div><canvas id="c${i}" width="400" height="330"></canvas></div>`).join('')}
<script>
const D = ${JSON.stringify(daten)};
const ab = (s, T) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
const yaw = -0.75, pitch = 0.25, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
const dreh = (x, y, z) => { const x1 = cy * x + sy * z, z1 = -sy * x + cy * z; return [x1, cp * y - sp * z1, sp * y + cp * z1]; };
const L = (() => { const l = [-0.4, 0.8, 0.6]; const n = Math.hypot(...l); return l.map((v) => v / n); })();
const TOENE = [[[150, 96, 70], [198, 140, 104], [228, 182, 146], [246, 222, 196]], [[176, 70, 20], [222, 110, 40], [244, 150, 70], [252, 196, 120]], [[150, 120, 90], [196, 168, 136], [226, 206, 178], [244, 234, 216]]];
D.forEach((F, k) => {
  const cv = document.getElementById('c' + k), W = cv.width, H = cv.height, ctx = cv.getContext('2d');
  const pos = ab(F.pos, Float32Array), tri = ab(F.tri, Uint32Array), far = ab(F.farbe, Uint8Array);
  const n = pos.length / 3, P = new Float32Array(3 * n), N = new Float32Array(3 * n);
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (let i = 0; i < n; i++) { const q = dreh(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]); P.set(q, 3 * i); lo = [Math.min(lo[0], q[0]), Math.min(lo[1], q[1])]; hi = [Math.max(hi[0], q[0]), Math.max(hi[1], q[1])]; }
  for (let t = 0; t < tri.length; t += 3) { const a = tri[t], b = tri[t + 1], c = tri[t + 2]; const ux = P[3*b]-P[3*a], uy = P[3*b+1]-P[3*a+1], uz = P[3*b+2]-P[3*a+2], vx = P[3*c]-P[3*a], vy = P[3*c+1]-P[3*a+1], vz = P[3*c+2]-P[3*a+2]; const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx; for (const p of [a, b, c]) { N[3*p] += nx; N[3*p+1] += ny; N[3*p+2] += nz; } }
  const s = 0.9 * Math.min(W / (hi[0] - lo[0]), H / (hi[1] - lo[1])), ox = (W - s * (hi[0] - lo[0])) / 2 - s * lo[0], oy = (H + s * (hi[1] - lo[1])) / 2 + s * lo[1];
  const img = ctx.createImageData(W, H), zb = new Float32Array(W * H).fill(-Infinity);
  for (let i = 0; i < W * H; i++) { img.data[4*i] = 255; img.data[4*i+1] = 255; img.data[4*i+2] = 255; img.data[4*i+3] = 255; }
  for (let t = 0; t < tri.length; t += 3) {
    const A = tri[t], B = tri[t+1], C = tri[t+2];
    const ax = ox + s*P[3*A], ay = oy - s*P[3*A+1], bx = ox + s*P[3*B], by = oy - s*P[3*B+1], cx = ox + s*P[3*C], cyy = oy - s*P[3*C+1];
    const d = (by - cyy) * (ax - cx) + (cx - bx) * (ay - cyy); if (Math.abs(d) < 1e-12) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx))), y0 = Math.max(0, Math.floor(Math.min(ay, by, cyy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cyy)));
    const toene = TOENE[far[t / 3]];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l1 = ((by - cyy) * (px - cx) + (cx - bx) * (py - cyy)) / d, l2 = ((cyy - ay) * (px - cx) + (ax - cx) * (py - cyy)) / d, l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const z = l1 * P[3*A+2] + l2 * P[3*B+2] + l3 * P[3*C+2]; if (z <= zb[y*W+x]) continue; zb[y*W+x] = z;
      let nx = l1*N[3*A]+l2*N[3*B]+l3*N[3*C], ny = l1*N[3*A+1]+l2*N[3*B+1]+l3*N[3*C+1], nz = l1*N[3*A+2]+l2*N[3*B+2]+l3*N[3*C+2]; const ll = Math.hypot(nx, ny, nz) || 1; nx /= ll; ny /= ll; nz /= ll; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const hell = Math.max(0, nx*L[0] + ny*L[1] + nz*L[2]); const ton = toene[Math.min(3, Math.floor(hell * 4.2))]; const o = 4*(y*W+x); img.data[o] = ton[0]; img.data[o+1] = ton[1]; img.data[o+2] = ton[2];
    }
  }
  ctx.putImageData(img, 0, 0);
  const sicht = (x, y, z) => { const xi = Math.round(x - 0.5), yi = Math.round(y - 0.5); if (xi < 1 || yi < 1 || xi >= W - 1 || yi >= H - 1) return false; let m = -Infinity; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m = Math.max(m, zb[(yi+dy)*W+xi+dx]); return z >= m - 0.01; };
  ctx.strokeStyle = '#1d3fa6'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < F.linie.length; i += 3) { const q = dreh(F.linie[i], F.linie[i+1], F.linie[i+2]); const x = ox + s*q[0], y = oy - s*q[1]; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
  ctx.lineWidth = 1;
  for (let i = 0; i < F.karte.length; i += 7) { const p = dreh(F.karte[i], F.karte[i+1], F.karte[i+2]), q = dreh(F.karte[i+3], F.karte[i+4], F.karte[i+5]); const x1 = ox + s*p[0], y1 = oy - s*p[1], x2 = ox + s*q[0], y2 = oy - s*q[1]; if (!sicht((x1+x2)/2, (y1+y2)/2, (p[2]+q[2])/2)) continue; ctx.strokeStyle = F.karte[i+6] ? 'rgba(70,40,20,0.75)' : 'rgba(160,60,10,0.9)'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  for (let i = 0; i < F.pole.length; i += 4) { const q = dreh(F.pole[i], F.pole[i+1], F.pole[i+2]); const x = ox + s*q[0], y = oy - s*q[1]; if (!sicht(x, y, q[2])) continue; ctx.fillStyle = F.pole[i+3] > 4 ? '#e0222a' : '#1d5fd6'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
});
</script></body></html>`;
const out = resolve(AUSGABE, 'einsatz-feld.html');
writeFileSync(out, html);
console.log(texte.map((t) => t.replace(/<[^>]+>/g, '')).join('\n'));
console.log('geschrieben', out);
