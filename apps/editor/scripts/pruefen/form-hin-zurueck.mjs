// Form zuerst (06.11.2026), Florians Frage: „wenn ich einen Punkt rausziehe und dann wieder zurücksetze, ist das Mesh nicht gleich.
// Warum?“ (Bild mit Wellen an der Linie oben). Nachgestellt mit der Maus: Kugel, drei Loops (Ring waagerecht, Mitte, Ring
// senkrecht), der oberste Punkt der Mitte HOCH Einheiten hinauf, loslassen, warten, dann genau zurück auf seinen alten Ort.
// Gemessen: wie weit die Mitte (der Umriss in der Seite) und die Haut danach von der Kugel abweichen (|r − 150|), und wie wellig die
// Mitte ist (größter Ausschlag gegen ihre Nachbarn längs der Linie). Zum Vergleich KURVEN_URL mit ?verdichten=0 oder ?kurz=0.
// Aufruf aus apps/editor: node scripts/pruefen/form-hin-zurueck.mjs <ordner> [name]
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const name = process.argv[3] ?? 'standard';
const hoch = Number(process.env.HOCH ?? 120);
const schritte = Number(process.env.SCHRITTE ?? 60);
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);

const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const loops = () => K('loops');
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], n = schritte) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  await seite.mouse.up();
  // nach dem Loslassen setzt sich das verdichtete Netz in der Ruhe
  await seite.waitForTimeout(1500);
};

// Kugel, drei Loops wie in den anderen Proben
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: -200, y: 0, z: 0 })), xy(await bild('seite', { x: 200, y: 0, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('top', { x: -200, y: 0, z: 0 })), xy(await bild('top', { x: 200, y: 0, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: 10, y: 200, z: 0 })), xy(await bild('seite', { x: 10, y: -200, z: 0 })), 6);
await seite.keyboard.press('Escape');

/** Abweichung von der Kugel: Mitte (je Probe) und Haut (je Punkt), dazu die Welligkeit der Mitte */
const messen = () =>
  seite.evaluate(() => {
    const k = window.__kurven;
    const m = k.loops().find((l) => l.art === 'mitte');
    const R = m.ruhe;
    const n = R.length / 3;
    let mitte = 0;
    const r = [];
    for (let j = 0; j < n; j++) {
      const d = Math.hypot(R[3 * j], R[3 * j + 1]) - 150;
      r.push(d);
      mitte = Math.max(mitte, Math.abs(d));
    }
    // Welligkeit: Ausschlag einer Probe gegen die Mitte ihrer Nachbarn (in r), größter
    let welle = 0;
    for (let j = 0; j < n; j++) welle = Math.max(welle, Math.abs(r[j] - (r[(j + n - 1) % n] + r[(j + 1) % n]) / 2));
    const P = k.lagen();
    let haut = 0;
    let summe = 0;
    for (let v = 0; v < P.length / 3; v++) {
      const d = Math.abs(Math.hypot(P[3 * v], P[3 * v + 1], P[3 * v + 2]) - 150);
      haut = Math.max(haut, d);
      summe += d;
    }
    return { mitte, welle, haut, hautMittel: summe / (P.length / 3), punkte: P.length / 3, proben: n, umgeschlagen: k.umgeschlagen() };
  });
/**
 * Welligkeit der Mitte in der Seite, getrennt nach alten Proben (Stellen s aus `alt`) und neuen: Abstand jeder Probe zur Sehne
 * ihrer Nachbarn (mit Vorzeichen), gegen das Mittel dieses Abstands bei den Nachbarn (eine glatte Linie ändert ihn langsam)
 */
const wellen = (alt) =>
  seite.evaluate((alt2) => {
    const m = window.__kurven.loops().find((l) => l.art === 'mitte');
    const R = m.ruhe;
    const n = R.length / 3;
    const P = (j) => [R[3 * (((j % n) + n) % n)], R[3 * (((j % n) + n) % n) + 1]];
    const d = [];
    for (let j = 0; j < n; j++) {
      const [ax, ay] = P(j - 1);
      const [bx, by] = P(j + 1);
      const [px, py] = P(j);
      const L = Math.hypot(bx - ax, by - ay) || 1;
      d.push(((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / L);
    }
    const altSet = new Set(alt2.map((x) => x.toFixed(6)));
    let altMax = 0;
    let neuMax = 0;
    let wo = null;
    for (let j = 0; j < n; j++) {
      const w = Math.abs(d[j] - (d[(j + n - 1) % n] + d[(j + 1) % n]) / 2);
      const istAlt = altSet.has(m.s[j].toFixed(6));
      if (istAlt) altMax = Math.max(altMax, w);
      else neuMax = Math.max(neuMax, w);
      if (!wo || w > wo.w) wo = { w, x: P(j)[0], y: P(j)[1], alt: istAlt };
    }
    return { altMax, neuMax, wo, neu: n - m.s.filter((s) => altSet.has(s.toFixed(6))).length };
  }, alt);
const wellenZeile = (w) =>
  `Welle an alten Proben bis ${w.altMax.toFixed(2)}, an neuen (${w.neu}) bis ${w.neuMax.toFixed(2)}; größte bei (${w.wo.x.toFixed(0)}, ${w.wo.y.toFixed(0)}) ${w.wo.alt ? 'alt' : 'neu'}`;
const zeile = (m) =>
  `Mitte |r − 150| bis ${m.mitte.toFixed(2)}, Welle ${m.welle.toFixed(2)} · Haut bis ${m.haut.toFixed(2)} (Mittel ${m.hautMittel.toFixed(3)}) · ${m.punkte} Punkte, Mitte ${m.proben} Proben · umgeschlagen ${m.umgeschlagen}`;

// PUNKT=neu: ein neuer Punkt auf der Mitte (Doppelklick) beim Winkel WINKEL (Grad, 90 = oben), radial hinaus statt hinauf
const neu = process.env.PUNKT === 'neu';
const winkel = (Number(process.env.WINKEL ?? 135) * Math.PI) / 180;
if (neu) {
  const q = { x: 150 * Math.cos(winkel), y: 150 * Math.sin(winkel), z: 0 };
  await seite.mouse.click(...xy(await bild('seite', q)));
  await seite.waitForTimeout(450);
  await seite.mouse.dblclick(...xy(await bild('seite', q)));
  await seite.waitForTimeout(450);
  await seite.keyboard.press('Escape');
}
const vorher = await messen();
console.log(`${name} vorher: ${zeile(vorher)}`);
const L = await loops();
const mitte = L.find((l) => l.art === 'mitte');
const sAlt = mitte.s;
/** alte Proben der Mitte (nach s): wie weit sie sich gegen vorher bewegt haben, je Bereich (rechts der oberen Kreuzung: x > 20) */
const ruheAlt = new Map(mitte.s.map((s, j) => [s.toFixed(6), [mitte.ruhe[3 * j], mitte.ruhe[3 * j + 1]]]));
const gewandert = async () => {
  const m = (await loops()).find((l) => l.art === 'mitte');
  let rechts = 0;
  let links = 0;
  m.s.forEach((s, j) => {
    const a = ruheAlt.get(s.toFixed(6));
    if (!a) return;
    const d = Math.hypot(m.ruhe[3 * j] - a[0], m.ruhe[3 * j + 1] - a[1]);
    if (a[0] > 20) rechts = Math.max(rechts, d);
    else links = Math.max(links, d);
  });
  return `alte Proben gewandert: links der oberen Kreuzung bis ${links.toFixed(2)}, rechts (vom Zug nicht berührt) bis ${rechts.toFixed(2)}`;
};
console.log(`  ${wellenZeile(await wellen(sAlt))}`);
const sichtbar = mitte.punkte.filter((p) => p.sichtbar !== false);
const oben = neu
  ? sichtbar.reduce((b, p) => (Math.hypot(p.ref.x - 150 * Math.cos(winkel), p.ref.y - 150 * Math.sin(winkel)) < Math.hypot(b.ref.x - 150 * Math.cos(winkel), b.ref.y - 150 * Math.sin(winkel)) ? p : b))
  : sichtbar.reduce((b, p) => (p.ref.y > b.ref.y ? p : b));
const p0 = { ...oben.ref };
/** Bild der Seite, nah am Punkt (Zoom 4), danach wieder alles */
const nahbild = async (wann) => {
  await K('ausschnitt', 'seite', { cx: p0.x, cy: -p0.y, zoom: 4 });
  await seite.waitForTimeout(300);
  const f = (await K('felder')).seite;
  await seite.screenshot({ path: `${ordner}/form-hin-zurueck-${name}-${wann}-2026-11-06.jpg`, type: 'jpeg', quality: 85, clip: { x: f.x, y: f.y, width: f.w, height: f.h } });
  // gezogen wird mit weitem Blick (ZOOM_ZUG), damit ein weiter Zug im Blatt bleibt
  await K('ausschnitt', 'seite', { cx: 0, cy: 0, zoom: Number(process.env.ZOOM_ZUG ?? 1) });
  await seite.waitForTimeout(200);
};
await nahbild('vorher');
const ziel = neu ? { ...p0, x: p0.x + hoch * Math.cos(winkel), y: p0.y + hoch * Math.sin(winkel) } : { ...p0, y: p0.y + hoch };
const finde = (LL) => {
  const m = LL.find((l) => l.art === 'mitte');
  return (neu ? m.punkte.find((p) => Math.abs(p.s - oben.s) < 1e-6) : m.punkte.find((p) => p.kreuzung === oben.kreuzung))?.ref;
};
await ziehen(xy(await bild('seite', p0)), xy(await bild('seite', ziel)));
const draussen = await messen();
console.log(`${name} ${hoch} hinaus: ${draussen.punkte} Punkte, Mitte ${draussen.proben} Proben, umgeschlagen ${draussen.umgeschlagen}`);
console.log(`  ${wellenZeile(await wellen(sAlt))}`);
const p1 = finde(await loops());
await ziehen(xy(await bild('seite', p1)), xy(await bild('seite', p0)));
const p2 = finde(await loops());
const zurueck = await messen();
console.log(`${name} zurück (Punkt ${Math.hypot(p2.x - p0.x, p2.y - p0.y, p2.z - p0.z).toFixed(2)} neben dem alten Ort): ${zeile(zurueck)}`);
console.log(`  ${wellenZeile(await wellen(sAlt))}`);
console.log(`  ${await gewandert()}`);
// DETAIL=x,y: die Proben der Mitte um diese Stelle (s, Lage, Radius − 150, alt/neu)
if (process.env.DETAIL) {
  const [dx, dy] = process.env.DETAIL.split(',').map(Number);
  const m = (await loops()).find((l) => l.art === 'mitte');
  const altSet = new Set(sAlt.map((s) => s.toFixed(6)));
  const n = m.s.length;
  const zeilen = [];
  for (let j = 0; j < n; j++) {
    const x = m.ruhe[3 * j];
    const y = m.ruhe[3 * j + 1];
    if (Math.hypot(x - dx, y - dy) > 40) continue;
    zeilen.push(`    s ${m.s[j].toFixed(2)} (${x.toFixed(2)}, ${y.toFixed(2)}) r−150 ${(Math.hypot(x, y) - 150).toFixed(3)} ${altSet.has(m.s[j].toFixed(6)) ? 'alt' : 'NEU'}`);
  }
  console.log(zeilen.join('\n'));
}

await nahbild('zurueck');
console.log(fehler.length ? `Fehler im Fenster: ${fehler.join(' | ')}` : 'keine Fehler im Fenster');
await browser.close();
