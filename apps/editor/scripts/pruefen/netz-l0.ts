// Teil L, L0.1: Bilder „Linie wird Reihe“. Je Prüffall zwei Ansichten der Grenzfläche (Stufe 3) mit Cel-Stufen wie im
// Earle-Look (Stufenkanten zeigen jede Normalenwelle): links ohne Linie (Käfigschleifen auf der Haut, die gezeichnete Linie
// blau gestrichelt), rechts mit eingepasster Reihe (rot). Darunter die Zahlen des Falls.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/netz-l0.ts
// Bild: node ../../apps/editor/scripts/pruefen/html-shot.mjs <html> <jpg> (Pfade werden ausgegeben)
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ableiten } from '../../../../packages/shape/src/kern/ableiten';
import { reiheEinpassen, reihenPunkte } from '../../../../packages/shape/src/kern/netz/einpassen';
import { type RoehrenGitter, roehrenGitter } from '../../../../packages/shape/src/kern/netz/gitter';
import { FAELLE, PX, RING_FAELLE, TOR, abstandZug, formMessung, kasten, linieAusSeite } from '../../../../packages/shape/src/kern/netz/pruefen';
import { ringEinpassen, ringPunkte } from '../../../../packages/shape/src/kern/netz/ringEinpassen';
import { feinesNetz } from '../../../../packages/shape/src/kern/pruefstand';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const DATUM = process.env.DATUM ?? '2026-10-15';

type V3 = [number, number, number];
type Zug = { punkte: number[]; farbe: string; breite: number; strich?: boolean };
type Ansicht = { titel: string; pos: string; nor: string; tri: string; zuege: Zug[] };

const b64 = (a: Float32Array | Uint32Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');

function ansichtDaten(titel: string, abl: ReturnType<typeof ableiten>, fein: Float64Array, g: RoehrenGitter, extra: Zug[]): Ansicht {
  const { flaechen } = feinesNetz(abl, fein);
  const n = fein.length / 3;
  const pos = new Float32Array(fein);
  const nor = new Float32Array(3 * n);
  const tri: number[] = [];
  for (const f of flaechen) {
    for (let k = 1; k + 1 < f.length; k++) tri.push(f[0]!, f[k]!, f[k + 1]!);
    // Flächennormale (Newell) auf die Ecken
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let h = 0; h < f.length; h++) {
      const p = f[h]!;
      const q = f[(h + 1) % f.length]!;
      nx += (fein[3 * p + 1]! - fein[3 * q + 1]!) * (fein[3 * p + 2]! + fein[3 * q + 2]!);
      ny += (fein[3 * p + 2]! - fein[3 * q + 2]!) * (fein[3 * p]! + fein[3 * q]!);
      nz += (fein[3 * p]! - fein[3 * q]!) * (fein[3 * p + 1]! + fein[3 * q + 1]!);
    }
    for (const p of f) {
      nor[3 * p] = nor[3 * p]! + nx;
      nor[3 * p + 1] = nor[3 * p + 1]! + ny;
      nor[3 * p + 2] = nor[3 * p + 2]! + nz;
    }
  }
  // Käfigschleifen auf der Haut: Reihen (v ganzzahlig) und Ringe (u ganzzahlig) im Röhrengitter
  const zuege: Zug[] = [];
  const zugAus = (ids: number[]) => ids.flatMap((id) => [fein[3 * id]!, fein[3 * id + 1]!, fein[3 * id + 2]!]);
  for (let j = 0; j < g.N; j++) {
    const ids: number[] = [];
    for (let a = 0; a < g.breiteA; a++) {
      const id = g.index[a * g.breiteB + j * g.teil]!;
      if (id >= 0) ids.push(id);
    }
    zuege.push({ punkte: zugAus(ids), farbe: 'rgba(40,30,20,0.55)', breite: 1 });
  }
  for (let i = 0; i < g.R; i++) {
    const ids: number[] = [];
    for (let b = 0; b <= g.breiteB; b++) {
      const id = g.index[i * g.teil * g.breiteB + (b % g.breiteB)]!;
      if (id >= 0) ids.push(id);
    }
    zuege.push({ punkte: zugAus(ids), farbe: 'rgba(40,30,20,0.55)', breite: 1 });
  }
  return { titel, pos: b64(pos), nor: b64(nor), tri: b64(Uint32Array.from(tri)), zuege: [...zuege, ...extra] };
}

const zeilen: string[] = [];
const panels: { ansichten: Ansicht[]; text: string }[] = [];
for (const fall of FAELLE) {
  const ohne = ableiten(fall.dok(), { stufen: 3 });
  const linie = linieAusSeite(ohne, fall.zug(kasten(ohne)));
  const e = reiheEinpassen(ohne, linie)!;
  const g = roehrenGitter(ohne.unterteilung, ohne.vorlage.R, ohne.vorlage.N, ohne.kaefig.n);
  const reihe = reihenPunkte(g, e.j, e.uVon, e.uBis);
  let auf = 0;
  for (const f of reihe) auf = Math.max(auf, abstandZug([e.fein[3 * f]!, e.fein[3 * f + 1]!, e.fein[3 * f + 2]!], linie.punkte) * PX);
  const m = formMessung(ohne, e.xyz);
  const linieZug: Zug = { punkte: linie.punkte.flatMap((p: V3) => p), farbe: '#1d5fd6', breite: 2.5, strich: true };
  const reiheIds: number[] = [];
  for (let a = 0; a < g.breiteA; a++) {
    const id = g.index[a * g.breiteB + e.j * g.teil]!;
    if (id >= 0) reiheIds.push(id);
  }
  const reiheZug = (fein: Float64Array): Zug => ({ punkte: reiheIds.flatMap((id) => [fein[3 * id]!, fein[3 * id + 1]!, fein[3 * id + 2]!]), farbe: '#e0222a', breite: 2.5 });
  const tor = `${auf <= TOR.reihe ? '✓' : '✗'} Reihe ${auf.toFixed(2)} px · ${m.haut <= TOR.haut ? '✓' : '✗'} Haut ${m.haut.toFixed(2)} px · ${m.normale <= TOR.normale ? '✓' : '✗'} Normalen ${m.normale.toFixed(2)}°`;
  panels.push({
    ansichten: [ansichtDaten('ohne Linie: Reihe j* (rot) neben der Linie', ohne, ohne.fein, g, [reiheZug(ohne.fein), linieZug]), ansichtDaten('mit Linie: Reihe j* auf der Linie', ohne, e.fein, g, [reiheZug(e.fein), linieZug])],
    text: `<b>${fall.name}</b> · Reihe j*=${e.j} · ${tor} · ${e.zeit.toFixed(0)} ms`,
  });
  zeilen.push(`${fall.name}: ${tor}`);
}

// L0 Fall 4: Querlinie wird Ring (RINGE=0 lässt sie weg)
if (process.env.RINGE !== '0')
  for (const fall of RING_FAELLE) {
    const ohne = ableiten(fall.dok(), { stufen: 3 });
    const linie = linieAusSeite(ohne, fall.zug(ohne));
    const e = ringEinpassen(ohne, linie);
    if (!e) continue;
    const g = roehrenGitter(ohne.unterteilung, ohne.vorlage.R, ohne.vorlage.N, ohne.kaefig.n);
    const ring = ringPunkte(g, e.i, e.vVon, e.vBis);
    let auf = 0;
    for (const f of ring) auf = Math.max(auf, abstandZug([e.fein[3 * f]!, e.fein[3 * f + 1]!, e.fein[3 * f + 2]!], linie.punkte) * PX);
    const m = formMessung(ohne, e.xyz);
    const linieZug: Zug = { punkte: linie.punkte.flatMap((p: V3) => p), farbe: '#1d5fd6', breite: 2.5, strich: true };
    const ringIds: number[] = [];
    for (let b = 0; b <= g.breiteB; b++) {
      const id = g.index[e.i * g.teil * g.breiteB + (b % g.breiteB)]!;
      if (id >= 0) ringIds.push(id);
    }
    const ringZug = (fein: Float64Array): Zug => ({ punkte: ringIds.flatMap((id) => [fein[3 * id]!, fein[3 * id + 1]!, fein[3 * id + 2]!]), farbe: '#e0222a', breite: 2.5 });
    const tor = `${auf <= TOR.reihe ? '✓' : '✗'} Ring ${auf.toFixed(2)} px · ${m.haut <= TOR.haut ? '✓' : '✗'} Haut ${m.haut.toFixed(2)} px · ${m.normale <= TOR.normale ? '✓' : '✗'} Normalen ${m.normale.toFixed(2)}°`;
    panels.push({
      ansichten: [ansichtDaten('ohne Linie: Ring i* (rot) neben der Linie', ohne, ohne.fein, g, [ringZug(ohne.fein), linieZug]), ansichtDaten('mit Linie: Ring i* auf der Linie', ohne, e.fein, g, [ringZug(e.fein), linieZug])],
      text: `<b>Querlinie wird Ring — ${fall.name}</b> · Ring i*=${e.i} · ${tor} · ${e.zeit.toFixed(0)} ms`,
    });
    zeilen.push(`Ring — ${fall.name}: ${tor}`);
  }

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:10px;font:13px/1.35 -apple-system,Helvetica,sans-serif;background:#f4efe6;color:#222}
.fall{margin:0 0 14px}.reihe{display:flex;gap:10px}.bild{background:#fff;border:1px solid #d8cfc0}
.bild div{padding:3px 6px;font-size:12px;color:#555}h1{font-size:16px;margin:0 0 6px}
</style></head><body>
<h1>Teil L, L0.1 und L0 Fall 4 — Linie wird Reihe, Querlinie wird Ring („Die Fläche bleibt, das Netz gleitet“) · ${DATUM} · Abnahme offen</h1>
<div style="margin-bottom:8px">Grenzfläche Stufe 3 mit vier Cel-Stufen (jede Normalenwelle zeigt sich an den Stufenkanten) · dunkle Linien: Käfigschleifen auf der Haut (Reihen und Ringe) · <span style="color:#e0222a">rot: Reihe j* bzw. Ring i*</span> · <span style="color:#1d5fd6">blau gestrichelt: gezeichnete Linie</span> · Tor: Reihe ≤ ${TOR.reihe} px, Haut ≤ ${TOR.haut} px, Normalen ≤ ${TOR.normale}°</div>
${panels.map((p, k) => `<div class="fall"><div>${p.text}</div><div class="reihe">${p.ansichten.map((a, l) => `<div class="bild"><div>${a.titel}</div><canvas id="c${k}_${l}" width="560" height="380"></canvas></div>`).join('')}</div></div>`).join('\n')}
<script>
const DATEN = ${JSON.stringify(panels.map((p) => p.ansichten))};
const ab = (s, T) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
// Blick von rechts (+z), etwas von vorn (−x) und oben
const yaw = -0.45, pitch = 0.32;
const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
const dreh = (x, y, z) => { const x1 = cy * x + sy * z, z1 = -sy * x + cy * z; return [x1, cp * y - sp * z1, sp * y + cp * z1]; };
const licht = (() => { const l = [-0.5, 0.75, 0.6]; const n = Math.hypot(...l); return l.map((v) => v / n); })();
const TOENE = [[138, 74, 52], [196, 110, 66], [232, 156, 92], [250, 206, 140]];
DATEN.forEach((ansichten, k) => {
  // gemeinsamer Ausschnitt je Fall
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  const pos0 = ab(ansichten[0].pos, Float32Array);
  for (let i = 0; i < pos0.length; i += 3) { const q = dreh(pos0[i], pos0[i + 1], pos0[i + 2]); lo = [Math.min(lo[0], q[0]), Math.min(lo[1], q[1])]; hi = [Math.max(hi[0], q[0]), Math.max(hi[1], q[1])]; }
  ansichten.forEach((a, l) => {
    const cv = document.getElementById('c' + k + '_' + l); const W = cv.width, H = cv.height;
    const ctx = cv.getContext('2d'); const img = ctx.createImageData(W, H); const zb = new Float32Array(W * H).fill(-Infinity);
    const s = 0.92 * Math.min(W / (hi[0] - lo[0]), H / (hi[1] - lo[1]));
    const ox = (W - s * (hi[0] - lo[0])) / 2 - s * lo[0], oy = (H + s * (hi[1] - lo[1])) / 2 + s * lo[1];
    const pos = ab(a.pos, Float32Array), nor = ab(a.nor, Float32Array), tri = ab(a.tri, Uint32Array);
    const n = pos.length / 3; const P = new Float32Array(3 * n), Nn = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      const q = dreh(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]); P[3 * i] = ox + s * q[0]; P[3 * i + 1] = oy - s * q[1]; P[3 * i + 2] = q[2];
      const m = dreh(nor[3 * i], nor[3 * i + 1], nor[3 * i + 2]); const L = Math.hypot(...m) || 1; Nn[3 * i] = m[0] / L; Nn[3 * i + 1] = m[1] / L; Nn[3 * i + 2] = m[2] / L;
    }
    for (let i = 0; i < W * H; i++) { img.data[4 * i] = 255; img.data[4 * i + 1] = 255; img.data[4 * i + 2] = 255; img.data[4 * i + 3] = 255; }
    for (let t = 0; t < tri.length; t += 3) {
      const A = tri[t], B = tri[t + 1], C = tri[t + 2];
      const ax = P[3 * A], ay = P[3 * A + 1], bx = P[3 * B], by = P[3 * B + 1], cx = P[3 * C], cyy = P[3 * C + 1];
      const d = (by - cyy) * (ax - cx) + (cx - bx) * (ay - cyy); if (Math.abs(d) < 1e-12) continue;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cyy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cyy)));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const l1 = ((by - cyy) * (px - cx) + (cx - bx) * (py - cyy)) / d, l2 = ((cyy - ay) * (px - cx) + (ax - cx) * (py - cyy)) / d, l3 = 1 - l1 - l2;
        if (l1 < 0 || l2 < 0 || l3 < 0) continue;
        const z = l1 * P[3 * A + 2] + l2 * P[3 * B + 2] + l3 * P[3 * C + 2];
        if (z <= zb[y * W + x]) continue; zb[y * W + x] = z;
        let nx = l1 * Nn[3 * A] + l2 * Nn[3 * B] + l3 * Nn[3 * C], ny = l1 * Nn[3 * A + 1] + l2 * Nn[3 * B + 1] + l3 * Nn[3 * C + 1], nz = l1 * Nn[3 * A + 2] + l2 * Nn[3 * B + 2] + l3 * Nn[3 * C + 2];
        const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
        if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const hell = Math.max(0, nx * licht[0] + ny * licht[1] + nz * licht[2]);
        const ton = TOENE[Math.min(3, Math.floor(hell * 4.2))];
        const o = 4 * (y * W + x); img.data[o] = ton[0]; img.data[o + 1] = ton[1]; img.data[o + 2] = ton[2];
      }
    }
    ctx.putImageData(img, 0, 0);
    const sicht = (x, y, z) => { const xi = Math.round(x - 0.5), yi = Math.round(y - 0.5); if (xi < 0 || yi < 0 || xi >= W || yi >= H) return false; let m = -Infinity; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = xi + dx, yy = yi + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) m = Math.max(m, zb[yy * W + xx]); } return z >= m - 0.004; };
    for (const zug of a.zuege) {
      ctx.strokeStyle = zug.farbe; ctx.lineWidth = zug.breite; ctx.setLineDash(zug.strich ? [6, 4] : []);
      const p = zug.punkte; ctx.beginPath(); let offen = false;
      for (let i = 0; i < p.length; i += 3) {
        const q = dreh(p[i], p[i + 1], p[i + 2]); const x = ox + s * q[0], y = oy - s * q[1];
        if (sicht(x, y, q[2])) { if (offen) ctx.lineTo(x, y); else ctx.moveTo(x, y); offen = true; } else offen = false;
      }
      ctx.stroke();
    }
  });
});
</script></body></html>`;
const out = resolve(AUSGABE, 'netz-l0.html');
writeFileSync(out, html);
console.log(zeilen.join('\n'));
console.log('geschrieben', out);
console.log('Bild:', resolve(WURZEL, `docs/progress/editor/l0-linie-als-reihe-${DATUM}.jpg`));
