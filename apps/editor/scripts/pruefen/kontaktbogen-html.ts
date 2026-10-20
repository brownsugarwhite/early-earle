// Gemeinsamer Kontaktbogen der Grundkörper-Prüfungen (Teil G, S0–S5): je Fall Seite, Front, Top (orthografisch, gezeichnete
// Umrisse schwarz, Widerspruch rot, Wirbelsäule grün, Sprossen grau) und eine Schrägansicht mit Cel-Stufen; mit `daten.nah`
// ([x, y, z, r] in Welt) eine fünfte Kachel: schräg nah um den Punkt mit Zebrastreifen (Knicke brechen die Streifen); mit
// `daten.zebra` dieselbe Kachel für den ganzen Körper. Plan 20.10., V1: optional `saum` (gelb, je Blatt), `netz` (Netzlinien je
// Blatt mit Farbe) und `linien` (P-Linien je Blatt) — Paare (x, y) im Bild des Blatts, 1e9 trennt Züge.
export type BogenFall = { name: string; text: string; daten: unknown };

export const BOGEN_LEGENDE =
  'je Körper: Seite · Front · Top (orthografisch; schwarz = gezeichneter Umriss, rot = Widerspruch der Zeichnungen, grün = Wirbelsäule, grau = Sprossen der Ringe) · schräg · Δ = größte Abweichung Körper ↔ Zeichnung (px bei 461 je Kachel); Falten nach Zonen: größter Winkel/Kanten über 20°';

export function bogenHtml(titel: string, faelle: readonly BogenFall[], legende = BOGEN_LEGENDE): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:10px;font:13px/1.35 -apple-system,Helvetica,sans-serif;background:#f4efe6;color:#222}
.fall{margin:0 0 12px}.reihe{display:flex;gap:6px}canvas{background:#fff;border:1px solid #d8cfc0}h1{font-size:16px;margin:0 0 6px}
</style></head><body><h1>${titel} · Abnahme offen</h1>
<div style="margin-bottom:8px">${legende}</div>
${faelle.map((f, k) => `<div class="fall"><div>${f.text}</div><div class="reihe">${[0, 1, 2, 3, 4].filter((v) => v < 4 || (f.daten as { nah?: unknown; zebra?: unknown } | null)?.nah || (f.daten as { zebra?: unknown } | null)?.zebra).map((v) => `<canvas id="c${k}_${v}" width="300" height="300"></canvas>`).join('')}</div></div>`).join('\n')}
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
  [...ANSICHTEN, ANSICHTEN[3]].forEach((abb, v) => {
    if (v === 4 && !F.nah && !F.zebra) return;
    const cv = document.getElementById('c' + k + '_' + v); const W = cv.width, H = cv.height; const ctx = cv.getContext('2d');
    const P = new Float32Array(3 * n), Q = new Float32Array(3 * n);
    let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    for (let i = 0; i < n; i++) { const q = abb(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]); P[3 * i] = q[0]; P[3 * i + 1] = q[1]; P[3 * i + 2] = q[2]; lo = [Math.min(lo[0], q[0]), Math.min(lo[1], q[1])]; hi = [Math.max(hi[0], q[0]), Math.max(hi[1], q[1])]; const m = abb(N[3 * i], N[3 * i + 1], N[3 * i + 2]); const L = Math.hypot(...m) || 1; Q[3 * i] = m[0] / L; Q[3 * i + 1] = m[1] / L; Q[3 * i + 2] = m[2] / L; }
    // Zeichnung mit in den Ausschnitt
    const zeich = v === 0 ? [F.seite] : v === 1 ? [F.front, F.front.map((x, i) => (i % 2 ? x : -x))] : v === 2 ? [F.top.map((x, i) => (i % 2 ? -x : x)), F.top] : [];
    for (const z of zeich) for (let i = 0; i < z.length; i += 2) { lo = [Math.min(lo[0], z[i]), Math.min(lo[1], z[i + 1])]; hi = [Math.max(hi[0], z[i]), Math.max(hi[1], z[i + 1])]; }
    let s = 0.9 * Math.min(W / (hi[0] - lo[0]), H / (hi[1] - lo[1]));
    let ox = (W - s * (hi[0] - lo[0])) / 2 - s * lo[0], oy = (H + s * (hi[1] - lo[1])) / 2 + s * lo[1];
    if (v === 4 && F.nah) { const m = abb(F.nah[0], F.nah[1], F.nah[2]); s = W / (2 * F.nah[3]); ox = W / 2 - s * m[0]; oy = H / 2 + s * m[1]; }
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
        if (v === 4) { const streifen = Math.floor((Math.atan2(ny, nz) / Math.PI) * 18 + 100) % 2; const g = streifen ? 40 + 150 * hell : 225 + 30 * hell; img.data[o] = g; img.data[o + 1] = g; img.data[o + 2] = g; continue; }
        img.data[o] = ton[0]; img.data[o + 1] = ton[1]; img.data[o + 2] = ton[2];
      }
    }
    ctx.putImageData(img, 0, 0);
    const zug = (pts, farbe, breite, zu) => { ctx.strokeStyle = farbe; ctx.lineWidth = breite; ctx.beginPath(); let neu = true; for (let i = 0; i < pts.length; i += 2) { if (!(Math.abs(pts[i]) < 1e8)) { neu = true; continue; } const x = ox + s * pts[i], y = oy - s * pts[i + 1]; if (!neu) ctx.lineTo(x, y); else ctx.moveTo(x, y); neu = false; } if (zu) ctx.closePath(); ctx.stroke(); };
    if (v < 3 && F.wid) zug(F.wid[v], 'rgba(255,59,92,0.6)', 7, false);
    if (v < 3 && F.saum) zug(F.saum[v], 'rgba(255,186,0,0.95)', 5, false);
    if (v < 3 && F.netz) for (const nz of F.netz[v]) zug(nz.p, nz.f, 1.6, false);
    if (v < 3 && F.linien) for (const l of F.linien[v]) zug(l, '#3b2a12', 2.4, false);
    for (const z of zeich) zug(z, 'rgba(0,0,0,0.85)', 1.5, v === 0);
    if (v === 0) {
      ctx.globalAlpha = 0.5; for (const sp of F.sprossen) zug([sp[0], sp[1], sp[3], sp[4]], '#666', 1, false); ctx.globalAlpha = 1;
      zug(F.wirbel.filter((_, i) => i % 3 !== 2), '#1a9a3a', 2, false);
    }
  });
});
</script></body></html>`;
}
