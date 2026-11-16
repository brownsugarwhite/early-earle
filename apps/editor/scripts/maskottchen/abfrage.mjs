// Fragt Punkte der Nachzeichnungen ab:  node scripts/maskottchen/abfrage.mjs
import { extrem, ladeSpur } from './spurdaten.mjs';

const fragen = {
  'spur.json': [
    ['Ohr links Spitze', [540, 30, 900, 200], 'oben'],
    ['Ohr rechts Spitze', [1450, 20, 1800, 200], 'oben'],
    ['Ohr links ganz links', [540, 100, 700, 600], 'links'],
    ['Ohr rechts ganz rechts', [1650, 100, 1800, 600], 'rechts'],
    ['Schopf Kerbe', [1220, 395, 1300, 425], 'unten'],
    ['Bart Spitze', [1150, 1150, 1300, 1240], 'unten'],
    ['Nase oben', [1140, 730, 1350, 880], 'oben'],
    ['Nase unten', [1140, 730, 1350, 880], 'unten'],
    ['Nase links', [1140, 730, 1350, 880], 'links'],
    ['Nase rechts', [1140, 730, 1350, 880], 'rechts'],
    ['Kopf rechts aussen', [1650, 600, 1800, 960], 'rechts'],
    ['Kopf links aussen', [600, 620, 700, 760], 'links'],
    ['Kehle unten rechts', [1290, 1240, 1340, 1320], 'rechts'],
    ['Schwanz links', [100, 700, 260, 1050], 'links'],
    ['Schwanz oben', [100, 690, 480, 800], 'oben'],
    ['Schwanzloch oben', [200, 760, 420, 800], 'oben'],
    ['Rumpf hinten', [270, 1050, 330, 1360], 'links'],
    ['Bogen oben', [740, 1290, 860, 1400], 'oben'],
    ['Sohle unten', [300, 1500, 1300, 1600], 'unten'],
  ],
  'spur-seite.json': [
    ['Ohr hinten Spitze', [540, 20, 900, 200], 'oben'],
    ['Ohr vorn Spitze', [950, 0, 1250, 120], 'oben'],
    ['Ohr hinten links', [540, 100, 700, 640], 'links'],
    ['Nase rechts', [1440, 700, 1700, 900], 'rechts'],
    ['Nase unten', [1400, 780, 1700, 900], 'unten'],
    ['Nase links', [1400, 760, 1500, 880], 'links'],
    ['Band aussen bei y=500', [1300, 495, 1600, 505], 'rechts'],
    ['Band aussen bei y=300', [1200, 295, 1500, 305], 'rechts'],
    ['Band innen bei y=500', [1200, 495, 1400, 505], 'links'],
    ['Kopf hinten', [600, 620, 760, 780], 'links'],
  ],
  'spur-front.json': [
    ['Ohr links Spitze', [200, 30, 500, 200], 'oben'],
    ['Ohr rechts Spitze', [1100, 30, 1400, 200], 'oben'],
    ['Ohr links ganz links', [150, 100, 300, 640], 'links'],
    ['Ohr rechts ganz rechts', [1300, 100, 1450, 640], 'rechts'],
    ['Nase oben', [700, 730, 930, 880], 'oben'],
    ['Nase unten', [700, 730, 930, 880], 'unten'],
    ['Nase links', [700, 730, 930, 880], 'links'],
    ['Nase rechts', [700, 730, 930, 880], 'rechts'],
    ['Kopf links aussen', [200, 640, 330, 1000], 'links'],
    ['Kopf rechts aussen', [1270, 640, 1400, 1000], 'rechts'],
    ['Bogen oben', [760, 1300, 840, 1400], 'oben'],
    ['Hals links schmal', [320, 1150, 420, 1260], 'rechts'],
  ],
};
for (const [datei, liste] of Object.entries(fragen)) {
  const u = ladeSpur(datei);
  console.log('==', datei);
  for (const [name, kasten, art] of liste) {
    const p = extrem(u, kasten, art);
    console.log(`  ${name}: ${p ? `(${p[0].toFixed(1)}, ${p[1].toFixed(1)})` : '—'}`);
  }
}
