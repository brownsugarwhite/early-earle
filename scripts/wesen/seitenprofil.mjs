// Seitenprofil aus einer Vermessung (messen.mjs): je Höhe (unten → oben) die Ausdehnung nach vorn und hinten, bezogen auf
// eine Standachse, normiert auf die Höhe. Die Messkurve wird als **Bézier-Kurve** (Grad K−1) nach kleinsten Quadraten
// angenähert — glatte, schwingende Earle-Kurven statt der Zacken der Pixelmaske; Anhängsel (Ohren, Hörner: schmale
// Zeilen ganz oben) werden vorher abgeschnitten, Flügel/Hauer per Klammer begrenzt.
//   node scripts/wesen/seitenprofil.mjs <messung.json> [--vorn rechts|links] [--n 8] [--ab 0] [--bis 1]
//     [--achse auto|<0…1>] [--klammer-vorn X] [--klammer-hinten X] [--min-breite 0.35] [--scheitel 0.6]
// `--scheitel`: ab diesem Höhenanteil schließt der Rumpf mit einer Kreiskappe (runder Kopf); die Kappe wird vor der
// Anpassung herausgerechnet, damit die glatte Kurve nicht die Rundung nachbilden muss (Bézier kann keine senkrechte Tangente).
// Ausgabe: `seitenprofil: { vorn: [...], hinten: [...] }` für den Bauplan (Kontrollwerte, Anteile der Höhe).
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2);
const file = args[0];
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const vornSeite = opt('--vorn', 'rechts');
const K = Number(opt('--n', '8'));
const ab = Number(opt('--ab', '0')), bis = Number(opt('--bis', '1'));
const achseOpt = opt('--achse', 'auto');
const klVorn = Number(opt('--klammer-vorn', 'Infinity')), klHinten = Number(opt('--klammer-hinten', 'Infinity'));
const minBreite = Number(opt('--min-breite', '0.35'));
const scheitel = Number(opt('--scheitel', '0.6'));
const kappe = (t) => (t <= scheitel ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((t - scheitel) / (1 - scheitel), 2))));
const j = JSON.parse(readFileSync(file, 'utf8'));
let rows = j.zeilen.filter((r) => r.breite > 0.02).map((r) => ({ v: r.v, l: r.links, r: r.rechts, b: r.breite })).sort((a, b) => a.v - b.v);
rows = rows.filter((r) => r.v >= ab && r.v <= bis);
// Anhängsel oben: schmale Zeilen über der letzten breiten Zeile abschneiden (Ohren, Hörnchen, Kamm)
const maxB = Math.max(...rows.map((r) => r.b));
let top = rows.length - 1;
while (top > 0 && rows[top].b < minBreite * maxB) top--;
rows = rows.slice(0, top + 1);
const vMin = rows[0].v, vMax = rows[rows.length - 1].v;
const Hs = vMax - vMin;
let achse;
if (achseOpt === 'auto') {
  const unten = rows.slice(0, Math.max(2, Math.floor(rows.length * 0.08)));
  achse = unten.reduce((s, r) => s + (r.l + r.r) / 2, 0) / unten.length;
} else {
  const lo = Math.min(...rows.map((r) => r.l)), hi = Math.max(...rows.map((r) => r.r));
  achse = lo + (hi - lo) * Number(achseOpt);
}
const samples = rows
  .map((r) => {
    const front = vornSeite === 'rechts' ? r.r - achse : achse - r.l;
    const back = vornSeite === 'rechts' ? achse - r.l : r.r - achse;
    const t = (r.v - vMin) / Hs;
    const k = kappe(t);
    return { t, k, vorn: Math.min(klVorn, Math.max(0.01, front / Hs)) / Math.max(k, 1e-3), hinten: Math.min(klHinten, Math.max(0.01, back / Hs)) / Math.max(k, 1e-3) };
  })
  .filter((s) => s.k > 0.2);
// Bernstein-Basis und kleinste Quadrate (K Koeffizienten), leichte Dämpfung gegen Schwingen
const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
const bern = (t) => { const d = K - 1; return Array.from({ length: K }, (_, i) => binom(d, i) * Math.pow(t, i) * Math.pow(1 - t, d - i)); };
function fit(ys) {
  const A = samples.map((s) => bern(s.t));
  const M = Array.from({ length: K }, () => new Array(K).fill(0));
  const b = new Array(K).fill(0);
  // Gewicht = Kappe: Abweichungen zählen im echten Maß (vor dem Herausrechnen der Kappe)
  for (let i = 0; i < samples.length; i++) { const w = samples[i].k * samples[i].k; for (let p = 0; p < K; p++) { b[p] += w * A[i][p] * ys[i]; for (let q = 0; q < K; q++) M[p][q] += w * A[i][p] * A[i][q]; } }
  // Dämpfung: Nachbarkoeffizienten sollen nahe beieinander liegen (Glätte)
  const lam = 0.02 * samples.length / K;
  for (let p = 0; p < K - 1; p++) { M[p][p] += lam; M[p + 1][p + 1] += lam; M[p][p + 1] -= lam; M[p + 1][p] -= lam; }
  // Gauß
  for (let c = 0; c < K; c++) {
    let piv = c;
    for (let r = c + 1; r < K; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]]; [b[c], b[piv]] = [b[piv], b[c]];
    for (let r = c + 1; r < K; r++) { const f = M[r][c] / M[c][c]; for (let q = c; q < K; q++) M[r][q] -= f * M[c][q]; b[r] -= f * b[c]; }
  }
  const x = new Array(K).fill(0);
  for (let r = K - 1; r >= 0; r--) { let s = b[r]; for (let q = r + 1; q < K; q++) s -= M[r][q] * x[q]; x[r] = s / M[r][r]; }
  return x.map((v) => Math.max(0.01, v));
}
const vorn = fit(samples.map((s) => s.vorn)), hinten = fit(samples.map((s) => s.hinten));
const evalB = (c, t) => bern(t).reduce((s, w, i) => s + w * c[i], 0);
let err = 0;
for (const s of samples) err += (Math.abs(evalB(vorn, s.t) - s.vorn) + Math.abs(evalB(hinten, s.t) - s.hinten)) * s.k;
const fmt = (a) => '[' + a.map((x) => x.toFixed(3)).join(', ') + ']';
console.log(`// ${file}: Achse ${achse.toFixed(3)}, Höhe ${Hs.toFixed(3)} (v ${vMin.toFixed(2)} … ${vMax.toFixed(2)}), ${rows.length} Zeilen, Bézier Grad ${K - 1}, mittlerer Fehler ${(err / samples.length / 2).toFixed(3)}`);
console.log(`seitenprofil: { vorn: ${fmt(vorn)}, hinten: ${fmt(hinten)}, scheitel: ${scheitel} },`);
