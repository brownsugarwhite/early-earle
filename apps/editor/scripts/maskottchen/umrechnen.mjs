// Teilt die Nachzeichnung des Bilds mit den drei Ansichten in die drei Figuren und rechnet Front und Seite in die Koordinaten
// des großen Logos um (gleicher Maßstab, gleicher Boden; Front mittig auf der Drehachse des Körpers).
//   node scripts/maskottchen/umrechnen.mjs
import fs from 'node:fs';

export const S = 2.678; // Maßstab kleine Figur → Logo (aus den Rahmen der ganzen Figur, x und y gleich)
export const ACHSE_X = 800; // Drehachse des Körpers im Logo (Mitte zwischen den Hüften)
// kleine Figuren: Logo links (x 69…682), Front (803…1280, Mitte 1040,5), Seite (= Logo + 1305)
export const zuLogo = {
  logoKlein: ([x, y]) => [136 + (x - 69) * S, 48 + (y - 116) * S],
  seite: ([x, y]) => [136 + (x - 1374) * S, 48 + (y - 116) * S],
  front: ([x, y]) => [ACHSE_X + (x - 1040.5) * S, 48 + (y - 116) * S],
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const ein = JSON.parse(fs.readFileSync('../../docs/look/maskottchen/spur-ansichten.json', 'utf8'));
  const figuren = { logoKlein: [], front: [], seite: [] };
  for (const u of ein.umrisse) {
    const x0 = Math.min(...u.stuecke.map((c) => c[0][0]));
    const welche = x0 < 700 ? 'logoKlein' : x0 < 1340 ? 'front' : 'seite';
    const f = zuLogo[welche];
    figuren[welche].push({ ...u, stuecke: u.stuecke.map((c) => c.map((p) => f(p).map((v) => Math.round(v * 100) / 100))) });
  }
  for (const [name, umrisse] of Object.entries(figuren)) {
    umrisse.sort((a, b) => Math.abs(b.flaeche) - Math.abs(a.flaeche));
    fs.writeFileSync(`../../docs/look/maskottchen/spur-${name}.json`, JSON.stringify({ breite: 1826, hoehe: 1630, umrisse }));
    console.log(name, umrisse.length, 'Umrisse');
  }
}
