// P2 „Stücknetz im Maulfeld“, Tag 4: Stücknetz je Fall bauen, Lippe anpassen, Haut lösen, messen — gegen den Kernring
// (gleicher Löser, gleiche Messung). Umgebung: FAELLE (Standard die zehn Fälle), KERNRING=0 lässt den Vergleich aus,
// H=<Faktor> skaliert die Dichte (Ziel-Kantenlänge = Faktor · h1), STUFE=1 baut auf K1 (Budget). Aufruf aus packages/shape:
// npx vite-node ../../apps/editor/scripts/pruefen/p2-stuecknetz.ts
import { einsatzAblauf, einsatzFall } from '../../../../packages/shape/src/kern/pruefen/einsatzFall';
import type { KoerperArt } from '../../../../packages/shape/src/kern/pruefen/koerper';
import type { Anfang, Form } from '../../../../packages/shape/src/kern/pruefen/linien';
import { stuecknetzAblauf } from '../../../../packages/shape/src/kern/einsatz/stuecknetz';

const PX = 461;
const standard = 'rex/mittel/gerade,rex/mittel/j,robbe/hoch/gerade,robbe/hoch/j,rex/tief/j,robbe/tief/j,kugel/mittel/j,ei/tief/j,langhals/hoch/j,birne/mittel/s';
const faelle = (process.env.FAELLE ?? standard).split(',').map((s) => s.split('/') as [KoerperArt, Anfang, Form]);
const mitKernring = process.env.KERNRING !== '0';
const hFaktor = Number(process.env.H ?? '1');
const stufe = process.env.STUFE === '1' ? 1 : 2;
const eckeGrad = process.env.ECKE ? Number(process.env.ECKE) : undefined;
const f2 = (x: number) => x.toFixed(2);
console.log('Fall | Stücke/Seiten | m | Flächen (Einsatz) | Pole | Käfig | umgeklappt | Lippe px (3D/p95) | Rest px je Runde | Haut max/p99 px | Normale max° | Knick frei (A0) | Mundwinkel (A0) | außen px | ms Bau/Lösen || Kernring: Haut max | Mundwinkel (A0) | Flächen');
for (const [art, anfang, form] of faelle) {
  const f = einsatzFall(art, anfang, form, { stufe });
  if (!f || 'fehler' in f) {
    console.log(`${art}/${anfang}/${form} | kein Fall${f && 'fehler' in f ? `: ${f.fehler}` : ''}`);
    continue;
  }
  let zeile = `${f.name}`;
  try {
    const { bau, lippe, g, ms, msLoesen } = stuecknetzAblauf(f, { h: hFaktor * f.h1, ...(eckeGrad !== undefined ? { eckeGrad } : {}) });
    const seiten = bau.fund.stuecke.map((st) => st.seiten.length).join('/');
    const kaefig = bau.pruefung.geschlossen && !bau.pruefung.fehler.length ? 'ok' : `${bau.pruefung.fehler.slice(0, 2).join('; ')}${bau.pruefung.geschlossen ? '' : ' offen'}`;
    zeile += ` | ${bau.fund.stuecke.length} (${seiten}) | ${bau.t.m} | ${bau.flaechen} | ${bau.pole} | ${kaefig} | ${bau.t.umgeklappt} | ${f2(lippe.fehler.raum)}/${f2(lippe.p95)} | ${g.rest.map(f2).join(' ')} | ${f2(ms.hautMax)}/${f2(ms.hautP99)} | ${ms.normaleMax.toFixed(1)} | ${ms.falten.toFixed(1)} (${ms.faltenA0.toFixed(1)}) | ${ms.faltenEcke.toFixed(1)} (${ms.faltenEckeA0.toFixed(1)}) | ${f2(ms.aussen * PX)} | ${(bau.ms.stuecke + bau.ms.zahlen + bau.ms.lage + bau.ms.bau).toFixed(0)}/${msLoesen.toFixed(0)}`;
    if (process.env.WULST) zeile += ` | Wulst ${f2(ms.wulst)}`;
  } catch (e) {
    zeile += ` | FEHLER ${(e as Error).message}`;
  }
  if (mitKernring) {
    try {
      const { t, ms } = einsatzAblauf(f);
      zeile += ` || ${f2(ms.hautMax)} | ${ms.faltenEcke.toFixed(1)} (${ms.faltenEckeA0.toFixed(1)}) | ${t.kaefig.nF - t.alteFlaeche.length}`;
    } catch (e) {
      zeile += ` || Kernring FEHLER ${(e as Error).message}`;
    }
  }
  console.log(zeile);
}
