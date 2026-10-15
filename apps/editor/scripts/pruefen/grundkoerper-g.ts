// Teil G: Kontaktbogen und Zahlen der Grundkörper. Je Körper Seite, Front, Top (orthografisch, gezeichnete Umrisse
// schwarz, Wirbelsäule grün, Ringe der Seite grau) und eine Schrägansicht, alles mit Cel-Stufen wie im Earle-Look. Dazu je
// Blatt Δ (Körper ↔ Zeichnung, px bei 461), Faltenmaß und Bauzeit.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/grundkoerper-g.ts
// Umgebung: NAME (Dateiname, Standard „ausgangslage“), KOERPER (Komma-Liste), TITEL
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { ableiten, kernLeiter, zugBei } from '../../../../packages/shape/src/kern/ableiten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { faltenMass, feinesNetz } from '../../../../packages/shape/src/kern/pruefstand';
import { G_KOERPER, type GKoerper, gKoerperDokument } from '../../../../packages/shape/src/kern/pruefen/grundkoerper';
import { koerperDokument } from '../../../../packages/shape/src/kern/pruefen/koerper';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const NAME = process.env.NAME ?? 'ausgangslage';
const TITEL = process.env.TITEL ?? 'Teil G, G1 — Ausgangslage der Grundkörper (heutiger Bau)';

const b64 = (a: Float32Array | Uint32Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');

function dokVon(name: string): Dokument {
  if ((G_KOERPER as readonly string[]).includes(name)) return gKoerperDokument(name as GKoerper);
  if (name === 'birne') return koerperDokument('birne', zufall(2));
  return koerperDokument(name as 'kugel', zufall(1));
}

const liste = (process.env.KOERPER ?? 'kugel,birne,ente,giraffe-bauch,s-hals,fisch,langhals,rex').split(',');
const faelle: { name: string; text: string; daten: unknown }[] = [];
const zeilen: string[] = [];
for (const name of liste) {
  const dok = dokVon(name);
  const sk = dok.skalierung;
  const t0 = performance.now();
  let abl: ReturnType<typeof ableiten>;
  try {
    abl = ableiten(dok, { stufen: 3 });
  } catch (e) {
    zeilen.push(`${name}: Bau scheitert (${(e as Error).message})`);
    faelle.push({ name, text: `<b>${name}</b> · Bau scheitert: ${(e as Error).message}`, daten: null });
    continue;
  }
  const zeit = performance.now() - t0;
  const { punkte, flaechen } = feinesNetz(abl);
  const d = blattAbweichungen(punkte, flaechen, dok);
  const f = faltenMass(abl);
  const l = kernLeiter(dok);
  const wirbel: number[] = [];
  for (const p of l.paare) {
    const o = zugBei(l.ruecken, p.a);
    const u = zugBei(l.bauch, p.b);
    wirbel.push((o.x + u.x) / 2, (o.y + u.y) / 2, 0);
  }
  // Ringe der Seite (Käfig-Ringe auf der Haut, rechte Hälfte): je Station die Sprosse
  const sprossen: number[][] = abl.stationen.map((s) => {
    const o = zugBei(l.ruecken, s.a);
    const u = zugBei(l.bauch, s.b);
    return [o.x, o.y, 0, u.x, u.y, 0];
  });
  const pos = new Float32Array(punkte.length * 3);
  punkte.forEach((p, i) => pos.set(p, 3 * i));
  const tri: number[] = [];
  for (const fl of flaechen) for (let k = 1; k + 1 < fl.length; k++) tri.push(fl[0]!, fl[k]!, fl[k + 1]!);
  const soll = (a: 'seite' | 'front' | 'top') => pfadAbtasten(vollerPfad(dok.profile[a]), 24).flatMap((p) => [p.x * sk, p.y * sk]);
  const text = `<b>${name}</b> · Seite Δ ${d.seite.max.toFixed(1)} px · Front Δ ${d.front.max.toFixed(1)} px · Top Δ ${d.top.max.toFixed(1)} px · Falten ${f.max.toFixed(1)}° (über 20°: ${f.ueber20}) · ${zeit.toFixed(0)} ms`;
  zeilen.push(`${name}: Seite ${d.seite.max.toFixed(1)} px, Front ${d.front.max.toFixed(1)} px, Top ${d.top.max.toFixed(1)} px, Falten ${f.max.toFixed(1)}° (>20°: ${f.ueber20}), ${zeit.toFixed(0)} ms`);
  faelle.push({ name, text, daten: { pos: b64(pos), tri: b64(Uint32Array.from(tri)), seite: soll('seite'), front: soll('front'), top: soll('top'), wirbel, sprossen } });
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:10px;font:13px/1.35 -apple-system,Helvetica,sans-serif;background:#f4efe6;color:#222}
.fall{margin:0 0 12px}.reihe{display:flex;gap:6px}canvas{background:#fff;border:1px solid #d8cfc0}h1{font-size:16px;margin:0 0 6px}
</style></head><body><h1>${TITEL} · Abnahme offen</h1>
<div style="margin-bottom:8px">je Körper: Seite · Front · Top (orthografisch; schwarz = gezeichneter Umriss, grün = Wirbelsäule, grau = Sprossen der Ringe) · schräg · Δ = größte Abweichung Körper ↔ Zeichnung (px bei 461 je Kachel)</div>
${faelle.map((f, k) => `<div class="fall"><div>${f.text}</div><div class="reihe">${[0, 1, 2, 3].map((v) => `<canvas id="c${k}_${v}" width="300" height="300"></canvas>`).join('')}</div></div>`).join('\n')}
<script>
const FAELLE = ${JSON.stringify(faelle.map((f) => f.daten))};
const ab = (s, T) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
const TOENE = [[138, 74, 52], [196, 110, 66], [232, 156, 92], [250, 206, 140]];
// Ansichten: Abbildung Welt → (Bild-x, Bild-y nach oben, Tiefe zum Betrachter)
const ANSICHTEN = [
  (x, y, z) => [x, y, z],            // Seite: von rechts (+z)
  (x, y, z) => [z, y, -x],           // Front: von vorn (−x), +z rechts
  (x, y, z) => [x, -z, y],           // Top: von oben, +z nach unten
  (x, y, z) => { const a = -0.6, b = 0.35; const x1 = Math.cos(a) * x + Math.sin(a) * z, z1 = -Math.sin(a) * x + Math.cos(a) * z; return [x1, Math.cos(b) * y - Math.sin(b) * z1, Math.sin(b) * y + Math.cos(b) * z1]; },
];
const LICHT = (() => { const l = [-0.45, 0.8, 0.55]; const n = Math.hypot(...l); return l.map((v) => v / n); })();
FAELLE.forEach((F, k) => {
  if (!F) return;
  const pos = ab(F.pos, Float32Array), tri = ab(F.tri, Uint32Array);
  const n = pos.length / 3;
  // Eckennormalen in Welt
  const N = new Float32Array(3 * n);
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    const ux = pos[3 * b] - pos[3 * a], uy = pos[3 * b + 1] - pos[3 * a + 1], uz = pos[3 * b + 2] - pos[3 * a + 2];
    const vx = pos[3 * c] - pos[3 * a], vy = pos[3 * c + 1] - pos[3 * a + 1], vz = pos[3 * c + 2] - pos[3 * a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const p of [a, b, c]) { N[3 * p] += nx; N[3 * p + 1] += ny; N[3 * p + 2] += nz; }
  }
  ANSICHTEN.forEach((abb, v) => {
    const cv = document.getElementById('c' + k + '_' + v); const W = cv.width, H = cv.height; const ctx = cv.getContext('2d');
    const P = new Float32Array(3 * n), Q = new Float32Array(3 * n);
    let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    for (let i = 0; i < n; i++) { const q = abb(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]); P[3 * i] = q[0]; P[3 * i + 1] = q[1]; P[3 * i + 2] = q[2]; lo = [Math.min(lo[0], q[0]), Math.min(lo[1], q[1])]; hi = [Math.max(hi[0], q[0]), Math.max(hi[1], q[1])]; const m = abb(N[3 * i], N[3 * i + 1], N[3 * i + 2]); const L = Math.hypot(...m) || 1; Q[3 * i] = m[0] / L; Q[3 * i + 1] = m[1] / L; Q[3 * i + 2] = m[2] / L; }
    // Zeichnung mit in den Ausschnitt
    const zeich = v === 0 ? [F.seite] : v === 1 ? [F.front, F.front.map((x, i) => (i % 2 ? x : -x))] : v === 2 ? [F.top.map((x, i) => (i % 2 ? -x : x)), F.top] : [];
    for (const z of zeich) for (let i = 0; i < z.length; i += 2) { lo = [Math.min(lo[0], z[i]), Math.min(lo[1], z[i + 1])]; hi = [Math.max(hi[0], z[i]), Math.max(hi[1], z[i + 1])]; }
    const s = 0.9 * Math.min(W / (hi[0] - lo[0]), H / (hi[1] - lo[1]));
    const ox = (W - s * (hi[0] - lo[0])) / 2 - s * lo[0], oy = (H + s * (hi[1] - lo[1])) / 2 + s * lo[1];
    const img = ctx.createImageData(W, H); const zb = new Float32Array(W * H).fill(-Infinity);
    for (let i = 0; i < W * H; i++) { img.data[4 * i] = 255; img.data[4 * i + 1] = 255; img.data[4 * i + 2] = 255; img.data[4 * i + 3] = 255; }
    const X = (i) => ox + s * P[3 * i], Y = (i) => oy - s * P[3 * i + 1];
    const Lv = abb(LICHT[0], LICHT[1], LICHT[2]);
    for (let t = 0; t < tri.length; t += 3) {
      const A = tri[t], B = tri[t + 1], C = tri[t + 2];
      const ax = X(A), ay = Y(A), bx = X(B), by = Y(B), cx = X(C), cy = Y(C);
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-12) continue;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d, l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d, l3 = 1 - l1 - l2;
        if (l1 < 0 || l2 < 0 || l3 < 0) continue;
        const z = l1 * P[3 * A + 2] + l2 * P[3 * B + 2] + l3 * P[3 * C + 2];
        if (z <= zb[y * W + x]) continue; zb[y * W + x] = z;
        let nx = l1 * Q[3 * A] + l2 * Q[3 * B] + l3 * Q[3 * C], ny = l1 * Q[3 * A + 1] + l2 * Q[3 * B + 1] + l3 * Q[3 * C + 1], nz = l1 * Q[3 * A + 2] + l2 * Q[3 * B + 2] + l3 * Q[3 * C + 2];
        const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const hell = Math.max(0, nx * Lv[0] + ny * Lv[1] + nz * Lv[2]);
        const ton = TOENE[Math.min(3, Math.floor(hell * 4.2))]; const o = 4 * (y * W + x);
        img.data[o] = ton[0]; img.data[o + 1] = ton[1]; img.data[o + 2] = ton[2];
      }
    }
    ctx.putImageData(img, 0, 0);
    const zug = (pts, farbe, breite, zu) => { ctx.strokeStyle = farbe; ctx.lineWidth = breite; ctx.beginPath(); for (let i = 0; i < pts.length; i += 2) { const x = ox + s * pts[i], y = oy - s * pts[i + 1]; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } if (zu) ctx.closePath(); ctx.stroke(); };
    for (const z of zeich) zug(z, 'rgba(0,0,0,0.85)', 1.5, v === 0);
    if (v === 0) {
      ctx.globalAlpha = 0.5; for (const sp of F.sprossen) zug([sp[0], sp[1], sp[3], sp[4]], '#666', 1, false); ctx.globalAlpha = 1;
      zug(F.wirbel.filter((_, i) => i % 3 !== 2), '#1a9a3a', 2, false);
    }
  });
});
</script></body></html>`;
const out = resolve(AUSGABE, `grundkoerper-${NAME}.html`);
writeFileSync(out, html);
console.log(zeilen.join('\n'));
console.log('geschrieben', out);
