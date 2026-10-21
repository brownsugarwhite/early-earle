// Teil A, Schritt A7: Bögen der gelösten Haut (Kiefer gleich, Maul zu). Je Fall vier Ansichten, nah am Maul (schräg von vorn):
// A0 (Körper ohne Maul), A (mit Einsatz), Wärmebild |A − A0| (grün ≤ 0,25 px, gelb ≤ 0,5, orange ≤ 1, rot darüber; im Lippenband
// blau = Wulst) und Zebra (Spiegelstreifen) auf A. Cel-Stufen wie in den anderen Bögen.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/einsatz-loesen.ts
// Bild: aus apps/editor: node scripts/pruefen/html-shot.mjs <html> <jpg>
// Umgebung: GITTER (schleifen|kernring), NEU=1 (Standard des Kernrings: K2, Schlitz auf der Linie; sonst Aufbau A1–A7),
// LAGE (karte|band, nur mit NEU), J, ECKE (eckeMin), WULST, NAH, FAELLE; KAPPE (Feld begradigt bis … Radien, 0 = ganz), FAECHER
// (tutte|kreis), NAHT (bogen|karte|bogenKarte) — mit KAPPE=0 FAECHER=tutte NAHT=bogen der Stand vor der dritten Sitzung E1;
// A0 (alt|editor), NR (Ausgleich der Stufennaht), SPITZEN (0 = aus), ANFANG=1 (Ausschnitt um den Linienanfang statt um c) —
// mit A0=alt ECKE=0.25 NAHT=karte NR=0 SPITZEN=0 der Stand vor E2.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { unterteilung } from '../../../../packages/shape/src/subdivision/catmullClark';
import { anwenden3 } from '../../../../packages/shape/src/subdivision/matrix';
import { einsatzFall, FALL_ALT } from '../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { ankerVon, feinNetz } from '../../../../packages/shape/src/kern/einsatz/flaeche';
import { lippeAnpassen, lippenKurve, lippenPunkt } from '../../../../packages/shape/src/kern/einsatz/lippe';
import { a0Netz, einsatzLoesen, einsatzMessen } from '../../../../packages/shape/src/kern/einsatz/loesen';
import { einsatzTopologie } from '../../../../packages/shape/src/kern/einsatz/topologie';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const b64 = (a: Float32Array | Uint32Array | Uint8Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
type V3 = [number, number, number];

const FAELLE = (process.env.FAELLE ?? 'kugel/mittel/gerade,ei/mittel/s,rex/mittel/s,robbe/mittel/j').split(',');
const NEU = !!process.env.NEU;
const daten: unknown[] = [];
const texte: string[] = [];
for (const name of FAELLE) {
  const [art, anfang, form] = name.split('/') as [never, never, never];
  const f = einsatzFall(art, anfang, form, NEU ? { ...(process.env.KAPPE ? { kappe: Number(process.env.KAPPE) } : {}), ...(process.env.A0 === 'alt' || process.env.A0 === 'editor' ? { a0: { art: process.env.A0 } } : {}) } : FALL_ALT);
  if (!f || 'fehler' in f) continue;
  const linie = f.lippenZiel();
  const gitter = (process.env.GITTER ?? (NEU ? 'kernring' : 'schleifen')) as 'schleifen' | 'kernring';
  const ende = gitter === 'kernring' ? 'falte' : 'ecke';
  const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie, gitter, stufe: f.stufe, ...(process.env.J ? { J: Number(process.env.J) } : {}), ...(process.env.ECKE ? { eckeMin: Number(process.env.ECKE) } : {}), ...(process.env.FAECHER ? { faecher: process.env.FAECHER as 'tutte' | 'kreis' } : {}), ...(process.env.NAHT ? { naht: process.env.NAHT as 'bogen' | 'karte' | 'bogenKarte' } : {}), ...(process.env.NR ? { nahtAusgleich: Number(process.env.NR) } : {}), ...(process.env.SPITZEN ? { spitzen: process.env.SPITZEN !== '0' } : {}), ...(process.env.LAGE ? { lage: process.env.LAGE as 'karte' | 'band', feldDreiecke: f.feldDreiecke } : {}) });
  const fit = lippeAnpassen(linie, t.m, t.lippenAnteile, { ende, anfang: t.lippenAnfang });
  const g = einsatzLoesen(t, f.v.kaefig, a0Netz(f.v.kaefig, 3 - f.stufe), fit.punkte, process.env.WULST ? { wulst: Number(process.env.WULST) } : {});
  // Bilder auf derselben Grenzfläche wie Stufe 4 von A0 (K1 auf 3, K2 auf 2)
  const STUFE = 4 - f.stufe;
  const ms = einsatzMessen(g, t, f.v.kaefig, f.feld, fit.punkte);
  // feine Netze auf Stufe 3: A0 (= K1) und A
  const u1 = unterteilung(f.v.kaefig, STUFE);
  const fein1 = anwenden3(u1.grenze, f.v.kaefig.xyz);
  const fl1 = alleFlaechen(u1.stufen[u1.stufen.length - 1]!.kaefig);
  const ua = unterteilung(g.kaefig, STUFE);
  const feinA = anwenden3(ua.grenze, g.kaefig.xyz);
  const flA = alleFlaechen(ua.stufen[ua.stufen.length - 1]!.kaefig);
  const tri = (fl: number[][]) => {
    const out: number[] = [];
    for (const q of fl) for (let k = 1; k + 1 < q.length; k++) out.push(q[0]!, q[k]!, q[k + 1]!);
    return Uint32Array.from(out);
  };
  // Wärme je Punkt von A: Abstand zu A0 in px (Bereich M ∪ C), negativ = im Lippenband (Wulst)
  const bezug = feinNetz(fein1, fl1);
  const bereich = t.bereich;
  const block = flA.length / g.kaefig.nF;
  const waerme = new Float32Array(feinA.length / 3).fill(Number.NaN);
  const kurve = lippenKurve(fit.punkte, 32, ende, t.lippenAnfang);
  const kurveL = kurve.map((p): V3 => [p[0], p[1], -p[2]]);
  const zuZug = (p: V3, zug: V3[]) => {
    let best = Infinity;
    for (let i = 0; i + 1 < zug.length; i++) {
      const q = zug[i]!;
      const r = zug[i + 1]!;
      const e = [r[0] - q[0], r[1] - q[1], r[2] - q[2]];
      const l2 = e[0]! ** 2 + e[1]! ** 2 + e[2]! ** 2;
      const tt = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - q[0]) * e[0]! + (p[1] - q[1]) * e[1]! + (p[2] - q[2]) * e[2]!) / l2)) : 0;
      best = Math.min(best, Math.hypot(q[0] + tt * e[0]! - p[0], q[1] + tt * e[1]! - p[1], q[2] + tt * e[2]! - p[2]));
    }
    return best;
  };
  for (let fc = 0; fc < g.kaefig.nF; fc++) {
    const b = bereich[fc]!;
    if (b === 0 || b === 4) continue;
    for (let q = 0; q < block; q++)
      for (const p of flA[fc * block + q]!) {
        if (!Number.isNaN(waerme[p]!)) continue;
        const pt: V3 = [feinA[3 * p]!, feinA[3 * p + 1]!, feinA[3 * p + 2]!];
        const im = Math.min(zuZug(pt, kurve), zuZug(pt, kurveL)) < g.wulstBreite;
        const d = ankerVon(bezug, pt).abstand * 461;
        waerme[p] = im ? -d - 1e-6 : d;
      }
  }
  // Ausschnitt: Feld M (Käfigpunkte des Einsatzes) mit Rand; mit NAH = k ein Würfel um die Lippenspitze (k Kanten des
  // Feldkäfigs — fest, damit Bilder mit verschiedener Lippenteilung gleich groß sind)
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  if (process.env.NAH) {
    const sp = lippenPunkt(fit.punkte, process.env.ANFANG ? 0 : t.m, ende, t.lippenAnfang);
    const k = f.v.kaefig;
    const kanten: number[] = [];
    for (const fc of f.feld.feld)
      for (let h = k.fStart[fc]!; h < k.fStart[fc + 1]!; h++) {
        const a = k.fVerts[h]!;
        const b = k.fVerts[h + 1 < k.fStart[fc + 1]! ? h + 1 : k.fStart[fc]!]!;
        kanten.push(Math.hypot(k.xyz[3 * a]! - k.xyz[3 * b]!, k.xyz[3 * a + 1]! - k.xyz[3 * b + 1]!, k.xyz[3 * a + 2]! - k.xyz[3 * b + 2]!));
      }
    kanten.sort((x, y) => x - y);
    const r = Number(process.env.NAH) * kanten[kanten.length >> 1]!;
    for (let d = 0; d < 3; d++) {
      lo[d] = sp[d]! - r;
      hi[d] = sp[d]! + r;
    }
    lo[2] = Math.max(0, sp[2]! - r);
  } else
    for (let i = t.nAlt; i < g.kaefig.n; i++) for (let d = 0; d < 3; d++) {
      lo[d] = Math.min(lo[d]!, g.kaefig.xyz[3 * i + d]!);
      hi[d] = Math.max(hi[d]!, g.kaefig.xyz[3 * i + d]!);
    }
  daten.push({ p1: b64(new Float32Array(fein1)), t1: b64(tri(fl1)), pA: b64(new Float32Array(feinA)), tA: b64(tri(flA)), w: b64(waerme), lo, hi, nah: !!process.env.NAH, linie: linie.flat() });
  texte.push(`<b>${name}</b> · ${gitter} · m ${t.m} · Haut max ${ms.hautMax.toFixed(2)} px (99 % ${ms.hautP99.toFixed(2)}) · Normale max ${ms.normaleMax.toFixed(1)}° (99 % ${ms.normaleP99.toFixed(1)}°) · Knick ${ms.falten.toFixed(0)}° (A0 ${ms.faltenA0.toFixed(0)}°) · Wulst ${ms.wulst.toFixed(2)} px · Lippe ${Math.max(fit.fehler.seite, fit.fehler.front, fit.fehler.top).toFixed(2)} px`);
}
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:10px;font:12px -apple-system,Helvetica,sans-serif;background:#f4efe6}.k{margin:0 0 12px 0}canvas{background:#fff;border:1px solid #d8cfc0;margin-right:4px}h1{font-size:15px;margin:0 0 6px}</style></head><body>
<h1>Teil A, A7 — Haut des Einsatzes gelöst (Kiefer gleich, zu) · Abnahme offen</h1><div style="margin-bottom:6px">je Fall: A0 (ohne Maul) · A (mit Einsatz) · Wärmebild |A − A0| (grün ≤ 0,25 px, gelb ≤ 0,5, orange ≤ 1, rot darüber; blau = Lippenband) · Zebra auf A · dünn blau: gezeichnete Linie</div>
${texte.map((t, i) => `<div class="k"><div>${t}</div>${['a', 'b', 'c', 'd'].map((x) => `<canvas id="${x}${i}" width="290" height="260"></canvas>`).join('')}</div>`).join('')}
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
  for (const x of [F.lo[0], F.hi[0]]) for (const y of [F.lo[1], F.hi[1]]) for (const z of (F.nah ? [F.lo[2], F.hi[2]] : [-F.hi[2], F.hi[2]])) { const q = dreh(x, y, z); lo = [Math.min(lo[0], q[0]), Math.min(lo[1], q[1])]; hi = [Math.max(hi[0], q[0]), Math.max(hi[1], q[1])]; }
  const r = 0.1 * Math.max(hi[0] - lo[0], hi[1] - lo[1]); lo = [lo[0] - r, lo[1] - r]; hi = [hi[0] + r, hi[1] + r];
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
D.forEach((F, i) => {
  const p1 = ab(F.p1, Float32Array), t1 = ab(F.t1, Uint32Array), pA = ab(F.pA, Float32Array), tA = ab(F.tA, Uint32Array), w = ab(F.w, Float32Array);
  bild(document.getElementById('a' + i), p1, t1, F, 'cel');
  bild(document.getElementById('b' + i), pA, tA, F, 'cel');
  bild(document.getElementById('c' + i), pA, tA, F, 'waerme', w);
  bild(document.getElementById('d' + i), pA, tA, F, 'zebra');
});
</script></body></html>`;
const out = resolve(AUSGABE, 'einsatz-loesen.html');
writeFileSync(out, html);
console.log(texte.map((t) => t.replace(/<[^>]+>/g, '')).join('\n'));
console.log('geschrieben', out);
