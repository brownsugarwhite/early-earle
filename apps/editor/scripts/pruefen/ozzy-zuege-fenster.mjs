// Ozzy, C1 im Plan „Ozzy stabil und schnell“ (17.11.2026): Was hinterlassen gewöhnliche Züge? An Florians drei Formen (FORMEN) je
// drei Züge: drei Punkte der Linie der Mitte, über die Linie verteilt, an der Wand der Seite nacheinander ZUG Bildpunkte nach oben
// (Standard 12: an der Wand rund 60 Einheiten, 6 % der Form; 30 sind rund 150 Einheiten und ziehen aus einem einzelnen Punkt eine
// Klinge ohne Dicke, siehe Plan C1). Gegriffen wird nur ein Punkt (hängt eine Richtung am Zeiger, gilt der nächste Punkt der Linie).
// Nach jedem Zug, wenn das Werk ruht, gezählt: Punkte ohne Spiegelbild (dann rechnete der Löser ohne Meldung auf der ganzen Haut) und
// umgeschlagene Dreiecke (Normale gegen die Normalen der Ecken).
// Kriterien je Form:
//   1  Nach keinem Zug gibt es einen Punkt ohne Spiegelbild.
//   2  Nach jedem Zug liegen nicht mehr Dreiecke umgeschlagen als beim Laden (gegen den Stand der Form geprüft: Florians „maul
//      handgemacht test“ bringt 8 am Mundwinkel mit).
//   3  Keine Fehler in der Konsole.
// Meldet das Werk nach einem Zug, dass sich eine Linie selbst kreuzt, räumt es mit Absicht nicht auf (Florian, 11.11.: Ein verdrehter
// Griff darf das Netz nicht kaputt machen; die Haut ist dort gefaltet, bis die Linie wieder frei liegt). Ein solcher Zug ist kein
// gewöhnlicher: Er wird genannt und für Kriterium 2 nicht gewertet.
// Fenster-Proben sind nicht genau wiederholbar (die Runden je Bild hängen an der Uhr): bei einem knappen Befund zweimal laufen lassen.
// Aufruf aus apps/editor, Ozzy auf 5205: [FORMEN="strange bird,teat firefish,maul handgemacht test"] [ZUG=12] node scripts/pruefen/ozzy-zuege-fenster.mjs
import { auf } from './ozzy-teile.mjs';

const ZUG = Number(process.env.ZUG ?? 12);

let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};

for (const form of (process.env.FORMEN ?? 'strange bird,teat firefish,maul handgemacht test').split(',')) {
  const { browser, s, O, geladen, ruhig, fehler } = await auf({ form, dichte: 1 });
  await geladen();
  const vor = await O('standPruefen');
  const vorW = await O('werk');
  const L = await O('werkLinienDaten');
  const mitte = L.find((l) => l.art === 'mitte') ?? L[0];
  const sichtbar = mitte.punkte.filter((x) => x.sichtbar);
  // drei Punkte, über die Linie verteilt (dicht benachbarte Punkte nacheinander weit gezogen lassen die Linie sich kreuzen)
  const start = [0, Math.floor(sichtbar.length / 3), Math.floor((2 * sichtbar.length) / 3)].filter((i, k, A) => A.indexOf(i) === k);
  const zeilen = [];
  let ohne = 0;
  let mehr = 0;
  let gekreuzt = 0;
  for (const i0 of start) {
    // ab der Stelle der erste Punkt, der selbst am Zeiger hängt (nicht eine Richtung)
    let a = null;
    for (let i = i0; i < Math.min(sichtbar.length, i0 + 6) && !a; i++) {
      const q = (await O('ankerImBild', mitte.id, sichtbar[i].i, 'seite'))[0];
      if (!q) continue;
      await s.mouse.move(q.x + 30, q.y + 30, { steps: 2 });
      await s.mouse.move(q.x, q.y, { steps: 4 });
      await s.waitForTimeout(400);
      if (/^Punkt /.test((await O('bearbeiten')).ziel)) a = q;
    }
    if (!a) continue;
    await s.mouse.down();
    for (let j = 1; j <= ZUG; j++) {
      await s.mouse.move(a.x + 0.2 * j, a.y - j);
      await s.waitForTimeout(25);
    }
    await s.waitForTimeout(120);
    await s.mouse.up();
    await ruhig();
    const st = await O('standPruefen');
    const w = await O('werk');
    const kreuzt = /kreuzt sich/.test(String(w.meldung ?? ''));
    if (st.ohne) ohne++;
    if (kreuzt) gekreuzt++;
    else if (w.umgeschlagen > vorW.umgeschlagen) mehr++;
    zeilen.push(`${st.n} Punkte, ohne Spiegelbild ${st.ohne}, umgeschlagen ${w.umgeschlagen}${kreuzt ? ' (eine Linie kreuzt sich: nicht aufgeräumt, nicht gewertet)' : ''}`);
  }
  console.log(`${form}: beim Laden ${vor.n} Punkte, ohne Spiegelbild ${vor.ohne}, umgeschlagen ${vorW.umgeschlagen} · ${zeilen.map((z, i) => `Zug ${i + 1}: ${z}`).join(' · ')}`);
  ok(`${form}: 1 kein Punkt ohne Spiegelbild`, vor.ohne === 0 && ohne === 0, `${ohne} von ${zeilen.length} Zügen mit Punkten ohne Spiegelbild`);
  ok(`${form}: 2 nach keinem Zug mehr umgeschlagene Dreiecke als beim Laden (${vorW.umgeschlagen})`, mehr === 0 && zeilen.length - gekreuzt > 0, `${mehr} von ${zeilen.length - gekreuzt} gewerteten Zügen darüber${gekreuzt ? `, ${gekreuzt} mit gekreuzter Linie nicht gewertet` : ''}`);
  ok(`${form}: 3 keine Fehler in der Konsole`, fehler.length === 0, fehler.slice(0, 2).join(' | ').slice(0, 300));
  await browser.close();
}
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
