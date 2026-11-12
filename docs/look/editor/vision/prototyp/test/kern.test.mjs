import { kugel } from '../src/netz.js';
import { Haut } from '../src/haut.js';
import { linieAusPfad, punktAuf, abtasten } from '../src/linien.js';
import { dist } from '../src/mathe.js';

const netz = kugel(5, 1);
console.log('Netz', netz.nV, 'Punkte', netz.nT, 'Dreiecke', 'Spiegel ok:', [...netz.spiegel].every((j) => j >= 0));
const haut = new Haut(netz);
// Mittellinie: Kreis in z = 0
const pfad = [];
for (let i = 0; i < 128; i++) { const a = (i / 128) * Math.PI * 2; pfad.push([Math.cos(a), Math.sin(a), 0]); }
const L = linieAusPfad('mitte', pfad, [], 4);
console.log('Mitte: Punkte', L.punkte.length, L.punkte.map((p) => p.p.map((x) => x.toFixed(2)).join(',')).join(' | '));
haut.linien.push(L);
haut.einbetten(L);
haut.struktur();
let t0 = performance.now();
haut.verformen();
console.log('Aufbau', haut.bauzeit.toFixed(1), 'ms, Zentren', haut.quellen.length, 'Verformen', haut.zeit.toFixed(1), 'ms');
// Abweichung Ruhe (sollte ~0 sein)
let maxd = 0; for (let i = 0; i < netz.pos.length; i++) maxd = Math.max(maxd, Math.abs(netz.pos[i] - netz.ruhe[i]));
console.log('Abweichung ohne Zug', maxd.toExponential(2));
// Punkt vorn (x = -1) nach vorn ziehen
const vorn = L.punkte.reduce((a, b) => (b.p[0] < a.p[0] ? b : a));
vorn.p[0] -= 0.8; vorn.p[1] += 0.2;
t0 = performance.now();
haut.verformen();
console.log('Zug: Verformen', haut.zeit.toFixed(1), 'ms');
// Liegt die Linie auf der Haut? Abstand der Kurvenpunkte zur Haut
let maxAbst = 0;
for (const z of abtasten(L, 16)) for (const p of z.pts) { const n = netz.naechster(p); maxAbst = Math.max(maxAbst, Math.sqrt(n.d2)); }
console.log('größter Abstand Linie–Haut', maxAbst.toFixed(4));
// Spiegelgleich?
let asym = 0; for (let v = 0; v < netz.nV; v++) { const j = netz.spiegel[v]; asym = Math.max(asym, Math.abs(netz.pos[3*v]-netz.pos[3*j]), Math.abs(netz.pos[3*v+2]+netz.pos[3*j+2])); }
console.log('Asymmetrie', asym.toExponential(2));
let minx = Infinity; for (let v = 0; v < netz.nV; v++) minx = Math.min(minx, netz.pos[3*v]);
console.log('vorderster Hautpunkt x', minx.toFixed(3), '(Punkt bei', vorn.p[0].toFixed(3), ')');
