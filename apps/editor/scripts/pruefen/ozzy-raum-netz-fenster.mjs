// Ozzy, B3 im Plan „Ozzy stabil und schnell“ (17.11.2026): das Kurvennetz im Raum (Taste W), an „strange bird“ (NAME).
// Florian: „das Kurvennetz genau wie in den Projektionsflächen, aber im Raum“: der weiße Körper mit Umriss statt der Seifenhaut, die
// Linien und Punkte des Werks auf der Form, zu greifen wie auf den Flächen.
// Kriterien:
//   1  W schaltet es ein: Es blendet ganz ein, die Linien liegen auf einer räumlichen Fläche (beide Hälften der Form: ein Punkt der
//      Flanke und sein Spiegelbild liegen an verschiedenen Orten), die Zeichnungen an den Wänden sind weg.
//   2  Ein Punkt der Flanke auf der Form: Zeigen hängt ihn an den Zeiger; gezogen bleibt er unter dem Zeiger (höchstens 2 Punkte
//      daneben), ein Schritt im Werk, seine Tiefe (z) bleibt (gezogen wird im Blatt der Achse, die dem Blick am nächsten liegt).
//   3  Daneben auf der Form gilt der Pinsel (Ring); ins Leere gezogen dreht es.
//   4  W noch einmal: zurück zur Seifenhaut, die Zeichnungen an den Wänden sind wieder da.
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: [NAME=…] node scripts/pruefen/ozzy-raum-netz-fenster.mjs [ordner für Bilder]
import { auf } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'strange bird';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '–');

const { browser, s, O, geladen, ruhig, fehler } = await auf({ form: NAME });
await geladen();
const vorher = await O('bearbeiten');
await s.mouse.move(60, 860);
await s.keyboard.press('w');
await s.waitForTimeout(700);
await ruhig();
const an = await O('raumNetz');
const b1 = await O('bearbeiten');
// alle Anker auf der Form: Punkte mit Tiefe, je Hälfte
const L = await O('werkLinienDaten');
const anker = [];
for (const l of L)
  for (const p of l.punkte) {
    if (!p.sichtbar) continue;
    for (const a of await O('ankerImBild', l.id, p.i)) if (a.sichtbar) anker.push({ id: l.id, i: p.i, z: p.z, art: l.art, ...a });
  }
const flanke = anker.filter((a) => a.art !== 'mitte' && Math.abs(a.z) > 10);
const paar = flanke.find((a) => !a.m && flanke.some((b) => b.m && b.id === a.id && b.i === a.i));
const spiegel = paar ? flanke.find((b) => b.m && b.id === paar.id && b.i === paar.i) : null;
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-raum-netz.png` });
ok(
  '1 W: Kurvennetz auf der Form, beide Hälften, Wände leer',
  an.an && an.deckung === 1 && b1.flaechen.length === 1 && !!paar && !!spiegel && Math.hypot(paar.x - spiegel.x, paar.y - spiegel.y) > 5,
  `eingeblendet ${an.deckung}, Flächen ${b1.flaechen.join(',')} (vorher ${vorher.flaechen.join(',')}), ${anker.length} Anker; Flanke und Spiegelbild ${paar && spiegel ? z2(Math.hypot(paar.x - spiegel.x, paar.y - spiegel.y)) : '–'} auseinander`,
);

// 2 ein Punkt der Flanke, der sich greifen lässt (vorn, frei von Nachbarn)
let ziel = null;
for (const a of flanke.sort((p, q) => Math.abs(q.z) - Math.abs(p.z))) {
  // andere Anker dicht daneben (an einer Kreuzung liegen mehrere Punkte des Werks am selben Ort: das ist derselbe Anker)
  const nah = anker.some((b) => {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    return d > 1 && d < 14;
  });
  if (nah) continue;
  await s.mouse.move(a.x + 40, a.y + 40, { steps: 3 });
  await s.mouse.move(a.x + 1, a.y + 1, { steps: 6 });
  await s.waitForTimeout(450);
  const b = await O('bearbeiten');
  if (/^Punkt /.test(b.ziel)) {
    ziel = a;
    break;
  }
}
if (!ziel) ok('2 ein Punkt der Flanke lässt sich greifen und bleibt unter dem Zeiger', false, 'kein Punkt der Flanke hing am Zeiger');
else {
  const schritte0 = (await O('bearbeiten')).schritte;
  const z0 = (await O('werkLinienDaten')).find((l) => l.id === ziel.id).punkte.find((p) => p.i === ziel.i).z;
  await s.mouse.down();
  for (let k = 1; k <= 12; k++) {
    await s.mouse.move(ziel.x + 1 + 2.5 * k, ziel.y + 1 - (20 / 12) * k);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(120);
  await s.mouse.up();
  await ruhig();
  const nach = (await O('ankerImBild', ziel.id, ziel.i)).find((a) => a.m === ziel.m);
  const z1 = (await O('werkLinienDaten')).find((l) => l.id === ziel.id).punkte.find((p) => p.i === ziel.i).z;
  const b = await O('bearbeiten');
  const d = nach ? Math.hypot(nach.x - (ziel.x + 30), nach.y - (ziel.y - 20)) : NaN;
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-raum-netz-gezogen.png` });
  ok(
    '2 ein Punkt der Flanke lässt sich greifen und bleibt unter dem Zeiger',
    d < 2 && b.schritte === schritte0 + 1 && Math.abs(z1 - z0) < 1e-6,
    `${ziel.m ? 'Spiegelhälfte' : 'Hälfte z > 0'}, Tiefe ${z2(ziel.z)}: ${z2(d)} neben dem Zeiger (gezogen um 30 / −20), Schritte ${schritte0} → ${b.schritte}, Tiefe ${z2(z0)} → ${z2(z1)}`,
  );
}

// 3 daneben auf der Form: Pinsel; ins Leere: drehen
let ring = null;
// eine Stelle auf der Form, an der nichts am Zeiger hängt (zwischen den Linien): ein Raster um die Mitte der Form absuchen
const mitteX = anker.reduce((t, a) => t + a.x, 0) / anker.length;
const mitteY = anker.reduce((t, a) => t + a.y, 0) / anker.length;
suche: for (const r of [0, 18, 36, 54]) {
  for (let k = 0; k < (r ? 8 : 1); k++) {
    const x = Math.round(mitteX + r * Math.cos((k * Math.PI) / 4));
    const y = Math.round(mitteY + r * Math.sin((k * Math.PI) / 4));
    await s.mouse.move(x, y, { steps: 4 });
    await s.waitForTimeout(350);
    const z = await O('zeiger');
    const b = await O('bearbeiten');
    if (z.art === 'ring' && !b.haengt) {
      ring = [x, y];
      break suche;
    }
  }
}
const blick0 = await O('blick');
await s.mouse.move(150, 250, { steps: 4 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 10; k++) {
  await s.mouse.move(150 + 6 * k, 250);
  await s.waitForTimeout(25);
}
await s.mouse.up();
await s.waitForTimeout(700);
const blick1 = await O('blick');
ok('3 daneben auf der Form der Pinsel, ins Leere dreht es', !!ring && Math.abs(blick1.gier - blick0.gier) > 0.05, `Ring bei ${ring ? ring.join(' / ') : 'nirgends'}, Gier ${z2(blick0.gier)} → ${z2(blick1.gier)}`);

// 4 zurück
await ruhig();
await s.keyboard.press('w');
await s.waitForTimeout(700);
await ruhig();
const aus = await O('raumNetz');
const b4 = await O('bearbeiten');
ok('4 W: zurück zur Seifenhaut, die Wände zeigen wieder ihre Zeichnungen', !aus.an && aus.deckung === 0 && b4.flaechen.length >= 2, `eingeblendet ${aus.deckung}, Flächen ${b4.flaechen.join(',')}`);
ok('5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
