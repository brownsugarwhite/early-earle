// Für jedes Teil: Anker je Ansicht, explizite Stücke, Ecke/glatt je Anker, Startpunkt
import { readFileSync } from 'node:fs';
const P = JSON.parse(readFileSync('parsed.json', 'utf8'));
// Zuordnung Teil -> Index je Datei (aus dem farbigen Blatt abgelesen)
const T = {
  ohrL:      { front: 0, back: 6, logo: 10, stand02: 2, lay01: 9, lay02: 11 },
  ohrR:      { front: 1, back: 7, logo: 11, stand02: 0, lay01: 10, lay02: 9 },
  ohrSpalt:  { stand02: 1, lay02: 10 },
  kopfL:     { front: 11, back: 9, logo: 13, stand02: 14, lay01: 12, lay02: 13 },
  kopfR:     { front: 9, back: 8, logo: 12, stand02: 3, lay01: 11, lay02: 12 },
  bartL:     { front: 12, logo: 15, stand02: 16, lay01: 13, lay02: 14 },
  bartR:     { front: 13, logo: 16, stand02: 17, lay01: 14, lay02: 15 },
  nase:      { front: 14, back: 10, logo: 17, stand02: 18, lay01: 15, lay02: 16 },
  bohne:     { front: 2, back: 0, logo: 1, stand02: 5, lay01: 1, lay02: 1 },
  schwanzA:  { back: 13, logo: 0, stand02: 4, lay01: 0, lay02: 0 },
  schwanzI:  { back: 14, logo: 2, stand02: 6, lay01: 2, lay02: 2 },
};
const F = { front: 'ozzy_front.svg', back: 'ozzy_back.svg', logo: 'ozzy_stand01_logo.svg', stand02: 'ozzy_stand02.svg', lay01: 'ozzy_laydown01.svg', lay02: 'ozzy_laydown02.svg' };
function ankerInfo(e) {
  const sp = e.subs[0]; const segs = sp.segs; const n = segs.length;
  const out = [];
  for (let k = 0; k < n; k++) {
    const prev = segs[(k - 1 + n) % n]; const cur = segs[k];
    const a = cur.p[0];
    const vin = [a[0] - prev.p[2][0], a[1] - prev.p[2][1]];
    const vout = [cur.p[1][0] - a[0], cur.p[1][1] - a[1]];
    const lin = Math.hypot(...vin), lout = Math.hypot(...vout);
    let typ;
    if (lin < 0.05 || lout < 0.05) typ = 'E0'; // Ecke ohne Griff
    else { const c = (vin[0] * vout[0] + vin[1] * vout[1]) / (lin * lout); const w = Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI; typ = w < 4 ? 'g' : 'E' + Math.round(w); }
    out.push(typ + (cur.implicit ? '*' : ''));
  }
  return out;
}
for (const [teil, m] of Object.entries(T)) {
  console.log('\n## ' + teil);
  for (const [v, idx] of Object.entries(m)) {
    const e = P[F[v]].els[idx];
    const segs = e.subs[0].segs;
    console.log(v.padEnd(8), String(segs.length).padStart(2), 'Stücke', (e.subs.length > 1 ? `(${e.subs.length} Unterpfade!) ` : ''), ankerInfo(e).join(' '));
  }
}
