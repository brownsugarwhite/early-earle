// Szenen für den Distanzfeld-Test: Teile mit Gruppe (Kanal) und Ebene
import { writeFileSync } from 'node:fs';
import { DATEIEN, TEILE, ladeAnsicht, verschiebe, morph, VORLAGEN } from './morph.mjs';
const V = {}; for (const [k, f] of Object.entries(DATEIEN)) V[k] = ladeAnsicht(VORLAGEN, f);
const DY = -9.74;
const form = (ans, name) => { const e = V[ans].els[TEILE[name][ans]]; return ans === 'profil' ? verschiebe(e.form, 0, DY) : e.form; };
const roh = (ans, i) => { const e = V[ans].els[i]; return ans === 'profil' ? verschiebe(e.form, 0, DY) : e.form; };
// Kanäle: 0 Bohne, 1 Beine nah, 2 Beine fern (+Keile), 3 Kopfmasken, 4 OhrA, 5 OhrB, 6 Schwanz, 7 frei,
//         8 Weiß Gesicht, 9 Weiß Beine, 10 Weiß Schwanz, 11 Nase
// Logo-Indizes: 0 Schwanz, 1 Bohne, 2 SchwanzW, 3 Bein nah hinten?, 4 Bein fern vorn, 5 Bein nah vorn, 6 Bein fern hinten, 7 BeinW hinten, 8/9 Keile, 14 BeinW vorn
function koerperLogo(ans) {
  return [
    { n: 'schwanz', k: 6, f: roh(ans, ans === 'profil' ? 4 : 0) },
    { n: 'bohne', k: 0, f: roh(ans, ans === 'profil' ? 5 : 1) },
    { n: 'schwanzW', k: 10, f: roh(ans, ans === 'profil' ? 6 : 2) },
    ...[3, 4, 5, 6].map((i, j) => ({ n: 'bein' + j, k: 0, f: roh(ans, ans === 'profil' ? i + 4 : i) })),
    { n: 'beinW1', k: 9, f: roh(ans, ans === 'profil' ? 11 : 7) },
    { n: 'keil1', k: 2, f: roh(ans, ans === 'profil' ? 12 : 8) },
    { n: 'keil2', k: 2, f: roh(ans, ans === 'profil' ? 13 : 9) },
    { n: 'beinW2', k: 9, f: roh(ans, ans === 'profil' ? 15 : 14) },
  ];
}
function kopf(t, art = 'W') {
  const m = (n) => morph(form('logo', n), form('profil', n), t, art);
  return [
    { n: 'ohrB', k: 5, f: m('ohrB') },
    { n: 'ohrA', k: 4, f: m('ohrA') },
    { n: 'kopfB', k: 3, f: m('kopfB') },
    { n: 'kopfA', k: 3, f: m('kopfA') },
    { n: 'bartA', k: 8, f: m('bartA') },
    { n: 'bartB', k: 8, f: m('bartB') },
    { n: 'nase', k: 11, f: m('nase') },
  ];
}
// Bein-Kanäle genauer: nah = mit Weiß. Im Logo: Weiß 7 liegt im Bein ganz links (Index 6, hinten nah), Weiß 14 im Bein Index 5 (vorn nah)
function beineZuordnen(teile) {
  for (const t of teile) if (t.n.startsWith('bein') && !t.n.startsWith('beinW')) {
    const j = Number(t.n.slice(4)); // 0..3 ↔ Logo 3,4,5,6
    t.k = (j === 2 || j === 3) ? 1 : 2; // 5 und 6 sind die nahen Beine
  }
  return teile;
}
const szenen = {
  logo: beineZuordnen([...koerperLogo('logo'), ...kopf(0)]),
  kopf30: beineZuordnen([...koerperLogo('logo'), ...kopf(1 / 3)]),
  kopf45: beineZuordnen([...koerperLogo('logo'), ...kopf(0.5)]),
  kopf60: beineZuordnen([...koerperLogo('logo'), ...kopf(2 / 3)]),
  profil: beineZuordnen([...koerperLogo('logo'), ...kopf(1)]),
};
// Florians Ohrspalt im Profil zum Vergleich
const spalt = roh('profil', 1);
writeFileSync('szenen.json', JSON.stringify({ szenen, spalt }));
// Referenz-SVG: Logo in Dateireihenfolge
console.log(Object.fromEntries(Object.entries(szenen).map(([k, v]) => [k, v.length])));
