// Teil A, Schritt A5: Bögen der Einsatz-Topologie. Je Fall drei Ansichten: Seite (rechte Hälfte), schräg von vorn, Karte.
// Körper ohne Maul (Grenzfläche Stufe 3 = K1 auf Stufe 2, Cel-Stufen), Feld M getönt; darauf das Hautgitter des Einsatzes
// (Startlagen auf A0): Reihen dunkelbraun, Speichen braun, Lippenschleife rot, Mundwinkel schwarz, Pole am Rand von M (rot = 5,
// blau = 3). Die Karte zeigt dasselbe Gitter im Einheitsquadrat (U nach rechts, V nach unten), Vierecke < 20° gelb.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/einsatz-topologie.ts
// Bild: aus apps/editor: node scripts/pruefen/html-shot.mjs <html> <jpg>
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { einsatzFall } from '../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { einsatzTopologie, ROLLE_RAND } from '../../../../packages/shape/src/kern/einsatz/topologie';
import { valenz } from '../../../../packages/shape/src/kaefig/halbkanten';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const b64 = (a: Float32Array | Uint32Array | Uint8Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
type V3 = [number, number, number];

const FAELLE = (process.env.FAELLE ?? 'kugel/mittel/gerade,kugel/mittel/j,ei/mittel/s,robbe/tief/gerade,rex/mittel/s,langhals/hoch/j,rex/hoch/gerade,langhals/mittel/j,kugel/hoch/gerade,rex/tief/gerade').split(',');
const daten: unknown[] = [];
const texte: string[] = [];
for (const name of FAELLE) {
  const [art, anfang, form] = name.split('/') as [never, never, never];
  const f = einsatzFall(art, anfang, form);
  if (!f || 'fehler' in f) continue;
  const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { ...(process.env.LIPPE ? { lippeBogen: Number(process.env.LIPPE) } : {}), ...(process.env.GLAETTUNG ? { glaettung: process.env.GLAETTUNG as 'konform' } : {}), ...(process.env.J ? { J: Number(process.env.J) } : {}) });
  const k1 = f.v.kaefig;
  const ff = f.feinFlaechen;
  const block = ff.length / k1.nF;
  const art8 = new Uint8Array(k1.nF);
  for (const fl of f.feld.feld) art8[fl] = 1;
  for (const fl of f.feld.kragen) art8[fl] = 2;
  const tri: number[] = [];
  const farbe: number[] = [];
  ff.forEach((fl, i) => {
    const a = art8[Math.floor(i / block)]!;
    for (let k = 1; k + 1 < fl.length; k++) {
      tri.push(fl[0]!, fl[k]!, fl[k + 1]!);
      farbe.push(a);
    }
  });
  const xyz = t.kaefig.xyz;
  const P = (i: number): V3 => [xyz[3 * i]!, xyz[3 * i + 1]!, xyz[3 * i + 2]!];
  // Strecken: (x1, y1, z1, x2, y2, z2, art) mit art 0 = Reihe, 1 = Speiche, 2 = Lippe; beide Hälften
  const strecken: number[] = [];
  const strecke = (a: V3, b: V3, art: number) => {
    strecken.push(a[0], a[1], a[2], b[0], b[1], b[2], art);
    strecken.push(a[0], a[1], -a[2], b[0], b[1], -b[2], art);
  };
  for (let r = 0; r <= t.J; r++) for (let k = 0; k < 2 * t.m; k++) strecke(P(t.haut[r]![k]!), P(t.haut[r]![k + 1]!), r === 0 ? 2 : 0);
  for (let r = 0; r < t.J; r++) for (let k = 0; k <= 2 * t.m; k++) strecke(P(t.haut[r]![k]!), P(t.haut[r + 1]![k]!), 1);
  const winkel = P(t.haut[0]![t.m]!);
  const pole: number[] = [];
  for (let v = 0; v < t.kaefig.n; v++) if (t.rolle[v] === ROLLE_RAND && valenz(t.kaefig, v) !== 4) pole.push(...P(v), valenz(t.kaefig, v));
  // Kartengitter und Viereckswinkel (Ecke am Mundwinkel ausgenommen)
  const winkelAn = (o: V3, u: V3, w: V3) => {
    const d1 = [u[0] - o[0], u[1] - o[1], u[2] - o[2]];
    const d2 = [w[0] - o[0], w[1] - o[1], w[2] - o[2]];
    const c = (d1[0]! * d2[0]! + d1[1]! * d2[1]! + d1[2]! * d2[2]!) / Math.max(1e-24, Math.hypot(...d1) * Math.hypot(...d2));
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  };
  const schlecht: number[] = [];
  let wMin = 180;
  for (let r = 0; r < t.J; r++)
    for (let k = 0; k < 2 * t.m; k++) {
      const ecken = [t.haut[r]![k]!, t.haut[r]![k + 1]!, t.haut[r + 1]![k + 1]!, t.haut[r + 1]![k]!];
      const q = ecken.map(P);
      let w = 180;
      for (let i = 0; i < 4; i++) if (ecken[i] !== t.haut[0]![t.m]) w = Math.min(w, winkelAn(q[i]!, q[(i + 1) % 4]!, q[(i + 3) % 4]!));
      wMin = Math.min(wMin, w);
      if (w < 20) schlecht.push(r, k);
    }
  daten.push({ pos: b64(new Float32Array(f.feinK1)), tri: b64(Uint32Array.from(tri)), farbe: b64(Uint8Array.from(farbe)), strecken, winkel, pole, ku: t.hautKarte.u, kv: t.hautKarte.v, m: t.m, J: t.J, schlecht });
  texte.push(`<b>${name}</b> · m ${t.m}, J ${t.J} · kleinster Winkel ${wMin.toFixed(0)}° (ohne Mundwinkel) · ${schlecht.length / 2} Vierecke < 20°`);
}
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:10px;font:12px -apple-system,Helvetica,sans-serif;background:#f4efe6}.k{display:inline-block;margin:0 10px 12px 0;vertical-align:top}canvas{background:#fff;border:1px solid #d8cfc0;display:inline-block;margin-right:4px}h1{font-size:15px;margin:0 0 6px}</style></head><body>
<h1>Teil A, A5 — Topologie des Einsatzes (Startlagen auf A0) · Abnahme offen</h1><div style="margin-bottom:6px">orange = Feld M · hell = Kragen · Gitter: Reihen dunkelbraun, Speichen braun, Lippenschleife rot, Mundwinkel schwarz · rote/blaue Punkte = Fünfer/Dreier am Rand von M · rechts die Karte (U →, V ↓), gelb = Viereck mit Winkel &lt; 20°</div>
${texte.map((t, i) => `<div class="k"><div style="width:900px;height:18px">${t}</div><canvas id="s${i}" width="330" height="290"></canvas><canvas id="v${i}" width="330" height="290"></canvas><canvas id="k${i}" width="230" height="290"></canvas></div>`).join('')}
<script>
const D = ${JSON.stringify(daten)};
const ab = (s, T) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
const TOENE = [[[150, 96, 70], [198, 140, 104], [228, 182, 146], [246, 222, 196]], [[176, 70, 20], [222, 110, 40], [244, 150, 70], [252, 196, 120]], [[150, 120, 90], [196, 168, 136], [226, 206, 178], [244, 234, 216]]];
function ansicht(cv, F, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const dreh = (x, y, z) => { const x1 = cy * x + sy * z, z1 = -sy * x + cy * z; return [x1, cp * y - sp * z1, sp * y + cp * z1]; };
  const L = (() => { const l = [-0.4, 0.8, 0.6]; const n = Math.hypot(...l); return l.map((v) => v / n); })();
  const W = cv.width, H = cv.height, ctx = cv.getContext('2d');
  const pos = ab(F.pos, Float32Array), tri = ab(F.tri, Uint32Array), far = ab(F.farbe, Uint8Array);
  const n = pos.length / 3, P = new Float32Array(3 * n), N = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) P.set(dreh(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]), 3 * i);
  // Ausschnitt: Feld (Farbe 1) samt Rand
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (let t = 0; t < tri.length; t += 3) if (far[t / 3] === 1) for (const p of [tri[t], tri[t+1], tri[t+2]]) { lo = [Math.min(lo[0], P[3*p]), Math.min(lo[1], P[3*p+1])]; hi = [Math.max(hi[0], P[3*p]), Math.max(hi[1], P[3*p+1])]; }
  const rand = 0.25 * Math.max(hi[0] - lo[0], hi[1] - lo[1]); lo = [lo[0] - rand, lo[1] - rand]; hi = [hi[0] + rand, hi[1] + rand];
  for (let t = 0; t < tri.length; t += 3) { const a = tri[t], b = tri[t + 1], c = tri[t + 2]; const ux = P[3*b]-P[3*a], uy = P[3*b+1]-P[3*a+1], uz = P[3*b+2]-P[3*a+2], vx = P[3*c]-P[3*a], vy = P[3*c+1]-P[3*a+1], vz = P[3*c+2]-P[3*a+2]; const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx; for (const p of [a, b, c]) { N[3*p] += nx; N[3*p+1] += ny; N[3*p+2] += nz; } }
  const s = Math.min(W / (hi[0] - lo[0]), H / (hi[1] - lo[1])), ox = (W - s * (hi[0] - lo[0])) / 2 - s * lo[0], oy = (H + s * (hi[1] - lo[1])) / 2 + s * lo[1];
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
  const tief = 0.004 * (hi[0] - lo[0]) * 10;
  const sicht = (x, y, z) => { const xi = Math.round(x - 0.5), yi = Math.round(y - 0.5); if (xi < 1 || yi < 1 || xi >= W - 1 || yi >= H - 1) return false; let m = -Infinity; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m = Math.max(m, zb[(yi+dy)*W+xi+dx]); return z >= m - tief; };
  const S = F.strecken;
  for (const art of [0, 1, 2]) {
    ctx.strokeStyle = art === 2 ? '#d1121b' : art === 1 ? 'rgba(110,60,25,0.9)' : 'rgba(55,30,15,0.95)'; ctx.lineWidth = art === 2 ? 2.2 : 1;
    for (let i = 0; i < S.length; i += 7) {
      if (S[i+6] !== art) continue;
      const p = dreh(S[i], S[i+1], S[i+2]), q = dreh(S[i+3], S[i+4], S[i+5]);
      const x1 = ox + s*p[0], y1 = oy - s*p[1], x2 = ox + s*q[0], y2 = oy - s*q[1];
      if (!sicht((x1+x2)/2, (y1+y2)/2, (p[2]+q[2])/2)) continue;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }
  for (let i = 0; i < F.pole.length; i += 4) for (const sg of [1, -1]) { const q = dreh(F.pole[i], F.pole[i+1], sg * F.pole[i+2]); const x = ox + s*q[0], y = oy - s*q[1]; if (!sicht(x, y, q[2])) continue; ctx.fillStyle = F.pole[i+3] > 4 ? '#e0222a' : '#1d5fd6'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); }
  for (const sg of [1, -1]) { const q = dreh(F.winkel[0], F.winkel[1], sg * F.winkel[2]); const x = ox + s*q[0], y = oy - s*q[1]; if (sicht(x, y, q[2])) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); } }
}
function karte(cv, F) {
  const W = cv.width, H = cv.height, ctx = cv.getContext('2d'), r0 = 12, g = W - 2 * r0, h = H - 2 * r0;
  const X = (u) => r0 + u * g, Y = (v) => r0 + v * h;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#bbb'; ctx.strokeRect(r0, r0, g, h);
  for (let i = 0; i < F.schlecht.length; i += 2) { const r = F.schlecht[i], k = F.schlecht[i+1]; ctx.fillStyle = 'rgba(255,200,0,0.7)'; ctx.beginPath(); ctx.moveTo(X(F.ku[r][k]), Y(F.kv[r][k])); ctx.lineTo(X(F.ku[r][k+1]), Y(F.kv[r][k+1])); ctx.lineTo(X(F.ku[r+1][k+1]), Y(F.kv[r+1][k+1])); ctx.lineTo(X(F.ku[r+1][k]), Y(F.kv[r+1][k])); ctx.closePath(); ctx.fill(); }
  for (let r = 0; r <= F.J; r++) { ctx.strokeStyle = r === 0 ? '#d1121b' : 'rgba(55,30,15,0.95)'; ctx.lineWidth = r === 0 ? 2 : 1; ctx.beginPath(); for (let k = 0; k <= 2 * F.m; k++) { const x = X(F.ku[r][k]), y = Y(F.kv[r][k]); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
  ctx.strokeStyle = 'rgba(110,60,25,0.9)'; ctx.lineWidth = 1;
  for (let k = 0; k <= 2 * F.m; k++) { ctx.beginPath(); for (let r = 0; r <= F.J; r++) { const x = X(F.ku[r][k]), y = Y(F.kv[r][k]); if (r) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(X(F.ku[0][F.m]), Y(F.kv[0][F.m]), 3, 0, 7); ctx.fill();
}
D.forEach((F, i) => { ansicht(document.getElementById('s' + i), F, 0, 0); ansicht(document.getElementById('v' + i), F, -0.9, 0.2); karte(document.getElementById('k' + i), F); });
</script></body></html>`;
const out = resolve(AUSGABE, 'einsatz-topologie.html');
writeFileSync(out, html);
console.log(texte.map((t) => t.replace(/<[^>]+>/g, '')).join('\n'));
console.log('geschrieben', out);
