// Ozzy, Plan „Ozzy stabil und schnell“ (17.11.2026), Stabilität: Was hinterlassen gewöhnliche Züge? Keine Prüfung, eine Zählung (bis
// Schritt C1 des Plans gebaut ist; dann wird daraus die Probe „nach einem Zug nicht mehr umgeschlagene Dreiecke als davor, kein Punkt
// ohne Spiegelbild“).
// Je Form: drei Punkte der Linie der Mitte an der Wand der Seite nacheinander 30 Bildpunkte nach oben ziehen; nach jedem Zug, wenn das
// Werk ruht: Punkte der Haut, Punkte ohne Spiegelbild (dann rechnet der Löser ohne Meldung auf der ganzen Haut), umgeschlagene Dreiecke.
// Aufruf aus apps/editor, Ozzy auf 5205: [FORMEN="strange bird,teat firefish,maul handgemacht test"] node scripts/pruefen/ozzy-zuege-zaehlen.mjs
import { auf } from './ozzy-teile.mjs';

for (const form of (process.env.FORMEN ?? 'strange bird,teat firefish,maul handgemacht test').split(',')) {
  const { browser, s, O, geladen, ruhig } = await auf({ form, dichte: 1 });
  await geladen();
  const vor = await O('standPruefen');
  const vorW = await O('werk');
  const L = await O('werkLinienDaten');
  const mitte = L.find((l) => l.art === 'mitte') ?? L[0];
  const zeilen = [];
  let k = 0;
  for (const p of mitte.punkte.filter((x) => x.sichtbar).slice(0, 3)) {
    const a = (await O('ankerImBild', mitte.id, p.i, 'seite'))[0];
    if (!a) continue;
    await s.mouse.move(a.x, a.y, { steps: 4 });
    await s.waitForTimeout(400);
    await s.mouse.down();
    for (let j = 1; j <= 30; j++) {
      await s.mouse.move(a.x + 0.2 * j, a.y - j);
      await s.waitForTimeout(25);
    }
    await s.mouse.up();
    await ruhig();
    const st = await O('standPruefen');
    const w = await O('werk');
    zeilen.push(`Zug ${++k}: ${st.n} Punkte, ohne Spiegelbild ${st.ohne}${st.ohne ? ` (z = ${st.lage.map((q) => q[2].toFixed(2)).join(', ')})` : ''}, umgeschlagen ${w.umgeschlagen}`);
  }
  console.log(`${form}: vorher ${vor.n} Punkte, ohne Spiegelbild ${vor.ohne}, umgeschlagen ${vorW.umgeschlagen} · ${zeilen.join(' · ')}`);
  await browser.close();
}
