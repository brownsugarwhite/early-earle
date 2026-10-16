// Teil G, Plan „Formgerechte Topologie“, Beweis 1: Nahaufnahme des Ast-Ansatzes. Je Körper Seite, Front, Top und schräg,
// gezoomt auf die Schnittsehne: feines Netz in Cel-Stufen, Käfigkanten (dunkel), Falten über 20° rot (feine Kanten), dazu
// die Zahlen der Ansatzzone. So sieht man, wo und warum der Ansatz faltet.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/knoten-diagnose.ts
// Umgebung: KOERPER (Komma-Liste), BAU (alt | knoten), NAME, LAGEN (ziele | kaefig: Käfigkanten aus Zielen oder Kontrollpunkten)
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { baumAbleiten } from '../../../../packages/shape/src/kern/grundkoerper/baum';
import { knotenAbleiten } from '../../../../packages/shape/src/kern/grundkoerper/knoten';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { faltenMass, feinesNetz } from '../../../../packages/shape/src/kern/pruefstand';
import { G_KOERPER, type GKoerper, gKoerperDokument } from '../../../../packages/shape/src/kern/pruefen/grundkoerper';
import { koerperDokument } from '../../../../packages/shape/src/kern/pruefen/koerper';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const BAU = process.env.BAU ?? 'knoten';
const NAME = process.env.NAME ?? `knoten-${BAU}`;
const LAGEN = process.env.LAGEN ?? 'ziele';
const b64 = (a: Float32Array | Uint32Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');

function dokVon(name: string): Dokument {
  if ((G_KOERPER as readonly string[]).includes(name)) return gKoerperDokument(name as GKoerper);
  return koerperDokument(name as 'kugel', zufall(1));
}

const liste = (process.env.KOERPER ?? 'giraffe-bauch,langhals,drache,s-hals,ente').split(',');
const faelle: unknown[] = [];
const zeilen: string[] = [];
for (const name of liste) {
  const dok = dokVon(name);
  const sk = dok.skalierung;
  const t0 = performance.now();
  let abl: ReturnType<typeof baumAbleiten>;
  try {
    abl = BAU === 'alt' ? baumAbleiten(dok, { stufen: 3 }) : knotenAbleiten(dok, { stufen: 3 });
  } catch (e) {
    zeilen.push(`${name}: Bau scheitert (${(e as Error).message})`);
    continue;
  }
  const zeit = performance.now() - t0;
  const { punkte, flaechen, kaefig: fk } = feinesNetz(abl);
  const d = blattAbweichungen(punkte, flaechen, dok);
  const f = faltenMass(abl);
  // feine Kanten mit Falte > 20°
  const nrm: number[] = [];
  for (let q = 0; q < fk.nF; q++) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    const a = fk.fStart[q]!;
    const b = fk.fStart[q + 1]!;
    for (let h = a; h < b; h++) {
      const p = punkte[fk.fVerts[h]!]!;
      const r = punkte[fk.fVerts[h + 1 < b ? h + 1 : a]!]!;
      nx += (p[1] - r[1]) * (p[2] + r[2]);
      ny += (p[2] - r[2]) * (p[0] + r[0]);
      nz += (p[0] - r[0]) * (p[1] + r[1]);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    nrm.push(nx / l, ny / l, nz / l);
  }
  const falten: number[] = [];
  for (let e = 0; e < fk.nE; e++) {
    if (fk.eFlaechen[e] !== 2 || fk.eSchaerfe[e]! > 0) continue;
    const h = fk.eHalb[e]!;
    const t = fk.hTwin[h]!;
    if (t < 0) continue;
    const f1 = fk.hFace[h]!;
    const f2 = fk.hFace[t]!;
    const c = nrm[3 * f1]! * nrm[3 * f2]! + nrm[3 * f1 + 1]! * nrm[3 * f2 + 1]! + nrm[3 * f1 + 2]! * nrm[3 * f2 + 2]!;
    if ((Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI > 20) falten.push(...punkte[fk.eA[e]!]!, ...punkte[fk.eB[e]!]!);
  }
  // Käfigkanten
  const k = abl.kaefig;
  const lage = LAGEN === 'kaefig' ? k.xyz : abl.ziele;
  const kanten: number[] = [];
  for (let e = 0; e < k.nE; e++) {
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    kanten.push(lage[3 * a]!, lage[3 * a + 1]!, lage[3 * a + 2]!, lage[3 * b]!, lage[3 * b + 1]!, lage[3 * b + 2]!, k.eSchaerfe[e]! > 0 ? 1 : 0);
  }
  const pos = new Float32Array(punkte.length * 3);
  punkte.forEach((p, i) => pos.set(p, 3 * i));
  const tri: number[] = [];
  for (const fl of alleFlaechen(fk)) for (let q = 1; q + 1 < fl.length; q++) tri.push(fl[0]!, fl[q]!, fl[q + 1]!);
  const soll = (a: 'seite' | 'front' | 'top') => pfadAbtasten(vollerPfad(dok.profile[a]), 24).flatMap((p) => [p.x * sk, p.y * sk]);
  const sehnen = abl.zerlegung.aeste.map((a) => [a.schnitt[0].x, a.schnitt[0].y, a.schnitt[1].x, a.schnitt[1].y]);
  const text = `<b>${name}</b> (${BAU}) · Seite Δ ${d.seite.max.toFixed(1)} px · Front Δ ${d.front.max.toFixed(1)} px · Top Δ ${d.top.max.toFixed(1)} px · Falten ${f.max.toFixed(1)}° (über 20°: ${f.ueber20}) · ${zeit.toFixed(0)} ms · Käfig ${k.n} Punkte`;
  zeilen.push(`${name}: Seite ${d.seite.max.toFixed(1)} px, Front ${d.front.max.toFixed(1)} px, Top ${d.top.max.toFixed(1)} px, Falten ${f.max.toFixed(1)}° (>20°: ${f.ueber20}), ${zeit.toFixed(0)} ms`);
  faelle.push({ text, pos: b64(pos), tri: b64(Uint32Array.from(tri)), falten, kanten, sehnen, seite: soll('seite'), front: soll('front'), top: soll('top') });
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:10px;font:13px/1.35 -apple-system,Helvetica,sans-serif;background:#f4efe6;color:#222}
.fall{margin:0 0 12px}.reihe{display:flex;gap:6px;flex-wrap:wrap}canvas{background:#fff;border:1px solid #d8cfc0}h1{font-size:16px;margin:0 0 6px}
</style></head><body><h1>Beweis 1 — Ast-Ansatz in Nahaufnahme · Abnahme offen</h1>
<div style="margin-bottom:8px">je Körper: ganz (Seite) · Ansatz Seite · Ansatz schräg vorn · Ansatz schräg hinten · Ansatz von oben · Front · rot = Falten über 20° (feine Kanten), dunkel = Käfigkanten (${LAGEN === 'kaefig' ? 'Kontrollpunkte' : 'Ziele'}), blau = Schnittsehne</div>
<div id="w"></div>
<script>
const FAELLE = ${JSON.stringify(faelle)};
const ab = (s, T) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
const TOENE = [[138, 74, 52], [196, 110, 66], [232, 156, 92], [250, 206, 140]];
const dreh = (a, b) => (x, y, z) => { const x1 = Math.cos(a) * x + Math.sin(a) * z, z1 = -Math.sin(a) * x + Math.cos(a) * z; return [x1, Math.cos(b) * y - Math.sin(b) * z1, Math.sin(b) * y + Math.cos(b) * z1]; };
const ANSICHTEN = [
  { abb: (x, y, z) => [x, y, z], zoom: false },
  { abb: (x, y, z) => [x, y, z], zoom: true },
  { abb: dreh(-0.7, 0.45), zoom: true },
  { abb: dreh(0.9, 0.45), zoom: true },
  { abb: (x, y, z) => [x, -z, y], zoom: true },
  { abb: (x, y, z) => [z, y, -x], zoom: false },
];
const LICHT = (() => { const l = [-0.45, 0.8, 0.55]; const n = Math.hypot(...l); return l.map((v) => v / n); })();
const w = document.getElementById('w');
FAELLE.forEach((F) => {
  const div = document.createElement('div'); div.className = 'fall'; div.innerHTML = '<div>' + F.text + '</div>'; w.appendChild(div);
  const reihe = document.createElement('div'); reihe.className = 'reihe'; div.appendChild(reihe);
  const pos = ab(F.pos, Float32Array), tri = ab(F.tri, Uint32Array);
  const n = pos.length / 3;
  const N = new Float32Array(3 * n);
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    const ux = pos[3 * b] - pos[3 * a], uy = pos[3 * b + 1] - pos[3 * a + 1], uz = pos[3 * b + 2] - pos[3 * a + 2];
    const vx = pos[3 * c] - pos[3 * a], vy = pos[3 * c + 1] - pos[3 * a + 1], vz = pos[3 * c + 2] - pos[3 * a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const p of [a, b, c]) { N[3 * p] += nx; N[3 * p + 1] += ny; N[3 * p + 2] += nz; }
  }
  // Ansatzbereich: um die Mitte der ersten Sehne, Radius 1,6 Sehnen
  let zm = null;
  if (F.sehnen.length) { const s = F.sehnen[0]; const L = Math.hypot(s[2] - s[0], s[3] - s[1]); zm = { c: [(s[0] + s[2]) / 2, (s[1] + s[3]) / 2, 0], r: Math.max(0.06, 1.6 * L) }; }
  ANSICHTEN.forEach((A) => {
    const cv = document.createElement('canvas'); cv.width = ${Number(process.env.GROESSE ?? 360)}; cv.height = ${Number(process.env.GROESSE ?? 360)}; reihe.appendChild(cv);
    const W = cv.width, H = cv.height, ctx = cv.getContext('2d');
    const abb = A.abb;
    const P = new Float32Array(3 * n), Q = new Float32Array(3 * n);
    let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    for (let i = 0; i < n; i++) { const q = abb(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]); P[3 * i] = q[0]; P[3 * i + 1] = q[1]; P[3 * i + 2] = q[2]; lo = [Math.min(lo[0], q[0]), Math.min(lo[1], q[1])]; hi = [Math.max(hi[0], q[0]), Math.max(hi[1], q[1])]; const m = abb(N[3 * i], N[3 * i + 1], N[3 * i + 2]); const L = Math.hypot(...m) || 1; Q[3 * i] = m[0] / L; Q[3 * i + 1] = m[1] / L; Q[3 * i + 2] = m[2] / L; }
    if (A.zoom && zm) { const c = abb(...zm.c); lo = [c[0] - zm.r, c[1] - zm.r]; hi = [c[0] + zm.r, c[1] + zm.r]; }
    const s = 0.94 * Math.min(W / (hi[0] - lo[0]), H / (hi[1] - lo[1]));
    const ox = (W - s * (hi[0] - lo[0])) / 2 - s * lo[0], oy = (H + s * (hi[1] - lo[1])) / 2 + s * lo[1];
    const img = ctx.createImageData(W, H); const zb = new Float32Array(W * H).fill(-Infinity);
    for (let i = 0; i < W * H; i++) { img.data[4 * i] = 255; img.data[4 * i + 1] = 255; img.data[4 * i + 2] = 255; img.data[4 * i + 3] = 255; }
    const X = (i) => ox + s * P[3 * i], Y = (i) => oy - s * P[3 * i + 1];
    const Lv = abb(LICHT[0], LICHT[1], LICHT[2]);
    for (let t = 0; t < tri.length; t += 3) {
      const a0 = tri[t], b0 = tri[t + 1], c0 = tri[t + 2];
      const ax = X(a0), ay = Y(a0), bx = X(b0), by = Y(b0), cx = X(c0), cy = Y(c0);
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-12) continue;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d, l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d, l3 = 1 - l1 - l2;
        if (l1 < 0 || l2 < 0 || l3 < 0) continue;
        const z = l1 * P[3 * a0 + 2] + l2 * P[3 * b0 + 2] + l3 * P[3 * c0 + 2];
        if (z <= zb[y * W + x]) continue; zb[y * W + x] = z;
        let nx = l1 * Q[3 * a0] + l2 * Q[3 * b0] + l3 * Q[3 * c0], ny = l1 * Q[3 * a0 + 1] + l2 * Q[3 * b0 + 1] + l3 * Q[3 * c0 + 1], nz = l1 * Q[3 * a0 + 2] + l2 * Q[3 * b0 + 2] + l3 * Q[3 * c0 + 2];
        const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const hell = Math.max(0, nx * Lv[0] + ny * Lv[1] + nz * Lv[2]);
        const ton = TOENE[Math.min(3, Math.floor(hell * 4.2))]; const o = 4 * (y * W + x);
        img.data[o] = ton[0]; img.data[o + 1] = ton[1]; img.data[o + 2] = ton[2];
      }
    }
    ctx.putImageData(img, 0, 0);
    // vorne liegende Linien: Tiefe gegen den z-Puffer prüfen (kleiner Spielraum)
    const sichtbar = (q) => { const x = Math.floor(ox + s * q[0]), y = Math.floor(oy - s * q[1]); if (x < 0 || y < 0 || x >= W || y >= H) return false; return q[2] >= zb[y * W + x] - 0.004; };
    const linie = (a, b, farbe, breite) => { const p = abb(...a), q = abb(...b); const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]; if (!sichtbar(m)) return; ctx.strokeStyle = farbe; ctx.lineWidth = breite; ctx.beginPath(); ctx.moveTo(ox + s * p[0], oy - s * p[1]); ctx.lineTo(ox + s * q[0], oy - s * q[1]); ctx.stroke(); };
    for (let i = 0; i < F.kanten.length; i += 7) linie([F.kanten[i], F.kanten[i + 1], F.kanten[i + 2]], [F.kanten[i + 3], F.kanten[i + 4], F.kanten[i + 5]], F.kanten[i + 6] ? 'rgba(20,60,200,0.9)' : 'rgba(40,30,20,0.55)', F.kanten[i + 6] ? 1.6 : 0.8);
    for (let i = 0; i < F.falten.length; i += 6) linie([F.falten[i], F.falten[i + 1], F.falten[i + 2]], [F.falten[i + 3], F.falten[i + 4], F.falten[i + 5]], '#e0101a', 2.2);
    if (A.abb === ANSICHTEN[0].abb || A.abb === ANSICHTEN[1].abb) {
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < F.seite.length; i += 2) { const x = ox + s * F.seite[i], y = oy - s * F.seite[i + 1]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = '#2070ff'; ctx.lineWidth = 2;
      for (const sh of F.sehnen) { ctx.beginPath(); ctx.moveTo(ox + s * sh[0], oy - s * sh[1]); ctx.lineTo(ox + s * sh[2], oy - s * sh[3]); ctx.stroke(); }
    }
  });
});
</script></body></html>`;
const out = resolve(AUSGABE, `${NAME}.html`);
writeFileSync(out, html);
console.log(zeilen.join('\n'));
console.log('geschrieben', out);
