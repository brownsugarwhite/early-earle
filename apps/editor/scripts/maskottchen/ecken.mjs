// Listet die Ecken (Stoßpunkte der Bézier-Läufe mit Knick) jeder Nachzeichnung in Logo-Koordinaten, zum Zuordnen der Marken.
//   node scripts/maskottchen/ecken.mjs spur.json [min-knick-grad]
import fs from 'node:fs';

const datei = process.argv[2];
const minKnick = Number(process.argv[3] ?? 25);
const spur = JSON.parse(fs.readFileSync(datei, 'utf8'));
spur.umrisse.forEach((u, ui) => {
  const s = u.stuecke;
  const liste = [];
  for (let i = 0; i < s.length; i++) {
    const a = s[(i - 1 + s.length) % s.length];
    const b = s[i];
    const p = b[0];
    const t1 = [a[3][0] - a[2][0], a[3][1] - a[2][1]];
    const t2 = [b[1][0] - b[0][0], b[1][1] - b[0][1]];
    const l1 = Math.hypot(...t1) || 1;
    const l2 = Math.hypot(...t2) || 1;
    const c = (t1[0] * t2[0] + t1[1] * t2[1]) / l1 / l2;
    const knick = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
    // Drehsinn: positiv = Rechtskurve auf dem Bildschirm (y nach unten)
    const kreuz = t1[0] * t2[1] - t1[1] * t2[0];
    if (knick >= minKnick) liste.push(`(${Math.round(p[0])},${Math.round(p[1])})${Math.round(knick)}${kreuz > 0 ? 'R' : 'L'}`);
  }
  console.log(`U${ui} Fläche ${u.flaeche}: ${liste.join(' ')}`);
});
