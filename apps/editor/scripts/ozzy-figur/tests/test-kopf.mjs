// Test 2: Kopfdrehung Logo (0°, Kopf frontal auf Seitenkörper) → Profil (90°) aus Florians eigenen Punkten
import { writeFileSync } from 'node:fs';
import { DATEIEN, TEILE, ladeAnsicht, verschiebe, zuPfad, morph, VORLAGEN } from './morph.mjs';
const V = {}; for (const [k, f] of Object.entries(DATEIEN)) V[k] = ladeAnsicht(VORLAGEN, f);
const DY = -9.74; // Profil-Datei: Körper liegt 9,74 tiefer als im Logo → in den Logo-Rahmen holen
const teil = (ans, name) => { const e = V[ans].els[TEILE[name][ans]]; return ans === 'profil' ? verschiebe(e.form, 0, DY) : e.form; };
// Körper (fest, aus dem Logo) in Zeichenreihenfolge
const logo = V.logo.els;
const koerperHinten = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 14].map(i => logo[i]);
const kopfTeile = ['ohrB', 'ohrA', 'kopfB', 'kopfA', 'bartA', 'bartB', 'nase'];
const weiss = { bartA: 1, bartB: 1 };
for (const n of kopfTeile) { const a = teil('logo', n), b = teil('profil', n); console.log(n.padEnd(6), a.length, b.length); }
const T = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
function bild(t, art) {
  let s = '';
  for (const e of koerperHinten) s += `<path d="${zuPfad(e.form)}" fill="${e.weiss ? '#fff' : '#000'}"/>`;
  for (const n of kopfTeile) s += `<path d="${zuPfad(morph(teil('logo', n), teil('profil', n), t, art))}" fill="${weiss[n] ? '#fff' : '#000'}"/>`;
  return s;
}
for (const art of ['L', 'W', 'S']) {
  const W = 400, H = 430;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * T.length * 0.75}" height="${H * 0.75 + 30}" viewBox="0 -10 ${W * T.length} ${H + 40}"><rect x="0" y="-10" width="${W * T.length}" height="${H + 40}" fill="#fff"/>`;
  T.forEach((t, k) => { svg += `<g transform="translate(${k * W},0)">${bild(t, art)}<text x="190" y="${H + 20}" font-size="18" font-family="Helvetica" text-anchor="middle" fill="#888">${Math.round(t * 90)}°</text></g>`; });
  svg += '</svg>';
  writeFileSync(`kopf-${art}.svg`, svg);
}
console.log('ok');
