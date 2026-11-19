// Ozzy, der Verbund (Plan „Objekte, Spiegel und Nähte“, Etappe 5, 19.11.2026): Verschmelzen und Abziehen als Zustand des Objekts.
// Die Objekte bleiben Objekte; was zu sehen ist, wird aus ihren gezeigten Häuten abgeleitet und fährt beim Ziehen mit.
// Florian: „… hilfsedgeloop sein, der smooth entsteht wenn ich objekte ineinanderschiebe. Ich kann ihn auch ein und ausschalten pro
// objekt … ich kann objekte dann auch einfach wieder auseinanderschieben und der hilfsedgloop verschwindet“ und „dass ich z.B auch
// ein subtrahiertes loch mit abgerundeten kanten live und flüssig verschieben und bearbeiten kann“.
// Kriterien (nur das Nötigste):
//   0  Zwei Formen, die sich überschneiden: Die Knöpfe stehen in der Leiste, keiner gilt, es gibt keinen Verbund.
//   1  Verschmelzen (Klick): Der Knopf gilt, beide Objekte bleiben, der Verbund steht (rund ist die Vorgabe). Mit K eine Kante:
//      Rauminhalt zwischen dem größeren und der Summe; rund ist er größer (die Kehle ist gefüllt). Eine Naht ist da.
//   2  Auseinanderziehen (V, Ziehen): Die Naht fährt mit, wird stetig kleiner und verschwindet; dann stehen beide für sich. Dabei
//      rechnet der Verbund auf der groben Stufe mit, und das Bild stockt nicht.
//   3  Wieder zusammenschieben: Die Naht ist wieder da (nichts war dafür zu schalten).
//   4  Abziehen: Das gewählte Objekt beißt ein Loch und steht blass im Bild; der Rauminhalt ist der des Verbunds mit Kante minus das
//      Objekt (auf 1 %). K rundet den Rand: weniger Inhalt.
//   5  Das Loch verschieben (V, Ziehen): Sein Rand fährt mit (der Rechner bildet den Körper des Objekts dabei nur ab); nach dem
//      Loslassen steht der Verbund wieder in voller Feinheit, an derselben Stelle.
//   6  Wählen: Ein Klick auf die Wand des Lochs wählt das Objekt, das abzieht (nachdem das andere gewählt war).
//   7  Sichern und Laden: Die Zustände kommen wieder, der Verbund bildet sich neu mit demselben Rauminhalt.
//   8  ⌥ + Klick wendet an (Etappe 4): eine Form, die Naht ein Loop mit Kante.
//   9  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5211/ozzy.html node scripts/pruefen/ozzy-verbund-fenster.mjs [ordner für Bilder]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auf } from './ozzy-teile.mjs';

// (die Probe sichert eine Szene in die Ablage des Arbeitsbaums und räumt sie am Ende wieder weg)
const ablage = fileURLToPath(new URL('../../../../wesen/', import.meta.url));

const ordner = process.argv[2] ?? '';
const EXTRA = process.env.EXTRA ?? 'loops=1';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
let t = await auf({ extra: EXTRA });
let { browser, s, O, geladen, fehler } = t;
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/${name}.png` });
};
/** das Werk ruht und der Verbund zeigt den Stand von jetzt (oder es gibt keinen) */
const steht = async (zeit = 60000) => {
  await s.waitForTimeout(250);
  await s.waitForFunction(
    () => {
      const v = window.__ozzy.verbund();
      return (v.soll === null ? v.bild === null : v.steht) && !v.rechnet && !window.__ozzy.werk().beschaeftigt && !window.__ozzy.werk().griffWartet;
    },
    null,
    { timeout: zeit },
  );
  await s.waitForTimeout(250);
};
const kreis = (cx, cy, R) => {
  const k = 0.5523 * R;
  return [
    { x: cx + R, y: cy, ein: [0, -k], aus: [0, k] },
    { x: cx, y: cy + R, ein: [k, 0], aus: [-k, 0] },
    { x: cx - R, y: cy, ein: [0, k], aus: [0, -k] },
    { x: cx, y: cy - R, ein: [-k, 0], aus: [k, 0] },
  ];
};
const knopf = (art) => s.evaluate((a) => ({ da: !document.getElementById(`naht-${a}`).hidden, an: !document.getElementById(`naht-${a}`).disabled, gilt: document.getElementById(`naht-${a}`).getAttribute('aria-pressed') === 'true' }), art);
const tsd = (x) => `${Math.round(x / 1000)} Tsd.`;
const groesse = (k) => (k ? Math.max(k[1] - k[0], k[3] - k[2], k[5] - k[4]) : 0);
const inhaltVon = (v, id) => v.netze.find((n) => n.id === id)?.inhalt ?? 0;
/** das aktive Objekt mit V ziehen: um einen Weg im Raum (dx, dy), in Schritten; `je`: nach jedem Schritt (er bekommt den Stand des Verbunds) */
const objektZiehen = async (dx, dy, schritte, je = null) => {
  const k = (await O('objekte')).kasten;
  const von = await O('weltImBild', { x: k.cx, y: k.cy, z: 0 });
  const nach = await O('weltImBild', { x: k.cx + dx, y: k.cy + dy, z: 0 });
  await s.mouse.move(von.x, von.y, { steps: 3 });
  await s.waitForTimeout(250);
  await s.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await s.mouse.move(von.x + ((nach.x - von.x) * i) / schritte, von.y + ((nach.y - von.y) * i) / schritte);
    await s.waitForTimeout(je ? 130 : 30);
    if (je) await je(await O('verbund'), i);
  }
  await s.waitForTimeout(60);
  await s.mouse.up();
};

// zwei Formen: eine große und, über das Plus, eine kleinere, die sie überschneidet
await O('form', kreis(600, 450, 130));
await s.waitForTimeout(300);
await O('aufblasen');
await geladen();
await s.click('#plus');
await s.waitForTimeout(700);
await O('form', kreis(760, 400, 80), true);
await s.waitForTimeout(300);
await O('aufblasen');
await geladen();
await steht();
const v0 = await O('verbund');
const k0 = [await knopf('vereinen'), await knopf('abziehen')];
await bild('verbund-0-zwei');
ok('0 zwei Formen: die Knöpfe sind da, keiner gilt, kein Verbund', k0.every((k) => k.da && k.an && !k.gilt) && v0.bild === null && v0.soll === null && (await O('objekte')).aktiv === 2, `Knöpfe ${k0.map((k) => `da ${k.da}, an ${k.an}, gilt ${k.gilt}`).join(' · ')}; Formen: ${v0.netze.map((n) => `${n.id}: ${n.punkte} Punkte, ${tsd(n.inhalt)}`).join(', ')}`);
const VA = inhaltVon(v0, 1);
const VB = inhaltVon(v0, 2);

// ---------- 1 Verschmelzen ----------
await s.click('#naht-vereinen');
await steht();
const rund1 = await O('verbund');
await bild('verbund-1-verschmolzen-rund');
await s.keyboard.press('v');
await s.waitForTimeout(200);
await s.keyboard.press('k');
await steht();
const kante1 = await O('verbund');
await bild('verbund-1-verschmolzen-kante');
const o1 = await O('objekte');
const VU = kante1.bild?.inhalt ?? 0;
ok(
  '1 Verschmelzen: der Knopf gilt, beide Objekte bleiben, der Verbund steht; mit Kante liegt der Inhalt zwischen dem größeren und der Summe, rund ist er größer',
  (await knopf('vereinen')).gilt && o1.ruhende.length === 1 && o1.aktiv === 2 && !!rund1.bild && !!kante1.bild && !rund1.fehler && rund1.bild.naht > 20 && rund1.bild.glieder.length === 2 && VU > Math.max(VA, VB) && VU < VA + VB && rund1.bild.inhalt > VU * 1.002 && rund1.bild.inhalt < VU * 1.06 && rund1.zustand.some((z) => z.id === 2 && z.art === 'vereinen' && z.rund) && kante1.zustand.some((z) => z.id === 2 && !z.rund) && rund1.verdeckt.length === 2 && rund1.bild.umgeklappt.flaeche < 1e-5 && kante1.bild.umgeklappt.zahl === 0,
  `Objekte: aktiv ${o1.aktiv}, ruhend ${o1.ruhende.map((r) => r.id)}; Verbund rund ${tsd(rund1.bild?.inhalt ?? 0)}, mit Kante ${tsd(VU)} (Formen ${tsd(VA)} und ${tsd(VB)}); ${rund1.bild?.punkte} Punkte, Naht ${rund1.bild?.naht} Stücke, ${Math.round(rund1.bild?.ms ?? 0)} ms im Rechner; umgeklappte Dreiecke rund ${rund1.bild?.umgeklappt.zahl} (Fläche ${(rund1.bild?.umgeklappt.flaeche ?? 0).toExponential(1)}), mit Kante ${kante1.bild?.umgeklappt.zahl}; verdeckt ${rund1.verdeckt}; „${(await O('werk')).meldung}“`,
);
// (zurück auf rund: so ist es die Vorgabe, und so wird gezogen)
await s.keyboard.press('k');
await steht();

// ---------- 2 Auseinanderziehen ----------
await s.evaluate(() => {
  window.__takt = [];
  let l = performance.now();
  const f = (z) => {
    window.__takt.push(z - l);
    l = z;
    if (window.__takt.length < 4000) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
});
const vor2 = await O('verbund');
const weg = [];
await objektZiehen(96, 0, 12, async (v, i) => {
  weg.push({ i, naht: v.bild ? groesse(v.bild.nahtKasten) : 0, eilig: v.bild?.eilig ?? null, stuecke: v.bild?.naht ?? 0, ms: v.bild?.ms ?? 0, um: v.bild?.umgeklappt.flaeche ?? 0 });
  if (i >= 3 && i <= 5) await bild(`verbund-2-hals-${i}`);
});
await steht();
const takt = await s.evaluate(() => window.__takt.splice(0));
const nach2 = await O('verbund');
await bild('verbund-2-getrennt');
const mitNaht = weg.filter((w) => w.naht > 0);
const stetig = mitNaht.every((w, i) => i === 0 || w.naht <= mitNaht[i - 1].naht + 0.5);
const sortiert = [...takt].sort((a, b) => a - b);
const taktMitte = sortiert[Math.floor(sortiert.length / 2)] ?? 0;
const taktSpitze = sortiert[Math.floor(sortiert.length * 0.99)] ?? 0;
ok(
  '2 Auseinanderziehen: die Naht fährt mit, wird stetig kleiner und verschwindet; der Verbund rechnet grob mit, das Bild stockt nicht',
  mitNaht.length >= 3 && stetig && weg[weg.length - 1].naht === 0 && nach2.bild === null && nach2.soll === null && nach2.verdeckt.length === 0 && mitNaht.every((w) => w.eilig === true) && nach2.stand.auftraege[0] - vor2.stand.auftraege[0] >= 4 && taktMitte < 20 && taktSpitze < 60 && weg.every((w) => w.um < 1e-4),
  `Größe der Naht je Schritt: ${weg.map((w) => w.naht.toFixed(0)).join(' ')} (vorher ${groesse(vor2.bild?.nahtKasten).toFixed(0)}); umgeklappte Fläche höchstens ${Math.max(...weg.map((w) => w.um)).toExponential(1)}; grobe Aufträge ${nach2.stand.auftraege[0] - vor2.stand.auftraege[0]}, im Rechner zuletzt ${nach2.stand.ms[0].toFixed(0)} ms, hin und zurück ${nach2.stand.runde[0].toFixed(0)} ms; Bildtakt Mitte ${taktMitte.toFixed(1)} ms, 99 % unter ${taktSpitze.toFixed(1)} ms (${takt.length} Bilder)`,
);

// ---------- 3 wieder zusammen ----------
await objektZiehen(-96, 0, 8);
await steht();
const v3 = await O('verbund');
await bild('verbund-3-wieder');
ok('3 wieder zusammengeschoben: die Naht ist wieder da, der Verbund steht in voller Feinheit', !!v3.bild && v3.bild.naht > 20 && v3.bild.eilig === false && Math.abs(v3.bild.inhalt / rund1.bild.inhalt - 1) < 0.02, `Naht ${v3.bild?.naht} Stücke, Inhalt ${tsd(v3.bild?.inhalt ?? 0)} (vor dem Ziehen ${tsd(rund1.bild.inhalt)}), ${v3.bild?.punkte} Punkte`);

// ---------- 4 Abziehen ----------
await s.click('#naht-abziehen');
await steht();
const kante4 = await O('verbund');
await bild('verbund-4-loch-kante');
await s.keyboard.press('k');
await steht();
const rund4 = await O('verbund');
await bild('verbund-4-loch-rund');
const VS = kante4.bild?.inhalt ?? 0;
ok(
  '4 Abziehen: ein Loch, das Objekt steht blass im Bild; Inhalt = Verbund mit Kante minus das Objekt (auf 1 %); rund ist der Rand weggenommen',
  (await knopf('abziehen')).gilt && !(await knopf('vereinen')).gilt && !!kante4.bild && kante4.bild.beisst.includes(2) && kante4.geist && Math.abs(VS - (VU - VB)) / VA < 0.01 && rund4.bild.inhalt < VS * 0.9995 && rund4.bild.inhalt > VS * 0.95 && rund4.bild.umgeklappt.flaeche < 1e-5 && (await O('objekte')).ruhende.length === 1,
  `Loch mit Kante ${tsd(VS)} (erwartet ${tsd(VU - VB)} = Verbund ${tsd(VU)} − Objekt ${tsd(VB)}), rund ${tsd(rund4.bild?.inhalt ?? 0)} (umgeklappt ${rund4.bild?.umgeklappt.zahl}); beißt ${kante4.bild?.beisst}; blass ${kante4.geist}`,
);

// ---------- 5 das Loch verschieben ----------
const vor5 = await O('verbund');
const ort5 = [];
await objektZiehen(0, -70, 8, async (v) => {
  if (v.bild?.nahtKasten) ort5.push({ y: (v.bild.nahtKasten[2] + v.bild.nahtKasten[3]) / 2, eilig: v.bild.eilig, abgebildet: v.abgebildet });
});
await bild('verbund-5-loch-im-zug');
await steht();
const nach5 = await O('verbund');
await bild('verbund-5-loch-verschoben');
const y0 = (vor5.bild.nahtKasten[2] + vor5.bild.nahtKasten[3]) / 2;
const y1 = (nach5.bild.nahtKasten[2] + nach5.bild.nahtKasten[3]) / 2;
ok(
  '5 das Loch verschieben: sein Rand fährt im Zug mit (grob), danach steht der Verbund wieder in voller Feinheit',
  ort5.length >= 5 && ort5.some((o) => o.eilig) && ort5.every((o) => o.abgebildet) && ort5[ort5.length - 1].y < y0 - 30 && y1 < y0 - 40 && Math.abs(ort5[ort5.length - 1].y - y1) < 3 && nach5.bild.eilig === false && !nach5.abgebildet && nach5.bild.beisst.includes(2),
  `Mitte des Rands (y): vorher ${y0.toFixed(0)}, im Zug ${ort5.map((o) => o.y.toFixed(0)).join(' ')}, danach ${y1.toFixed(0)}; im Zug nur abgebildet: ${ort5.every((o) => o.abgebildet)}; danach ${nach5.bild.punkte} Punkte (fein: ${!nach5.bild.eilig}), im Rechner ${Math.round(nach5.bild.ms)} ms`,
);

// ---------- 6 wählen durch die Wand des Lochs ----------
// erst das große Objekt wählen (ein Klick weit weg vom Loch), dann ein Klick in das Loch
const gross = (await O('objekte')).ruhende[0].kasten;
const fern = await O('weltImBild', { x: gross.cx - 0.6 * gross.rx, y: gross.cy + 0.3 * gross.ry, z: 0 });
await s.mouse.move(fern.x, fern.y, { steps: 3 });
await s.waitForTimeout(250);
await s.mouse.down();
await s.mouse.up();
await steht();
const a6 = (await O('objekte')).aktiv;
const v6a = await O('verbund');
await bild('verbund-6-grosses-gewaehlt');
const loch = v6a.bild.nahtKasten;
const imLoch = await O('weltImBild', { x: (loch[0] + loch[1]) / 2, y: (loch[2] + loch[3]) / 2, z: (loch[4] + loch[5]) / 2 });
const unterLoch = await O('objektBei', imLoch.x, imLoch.y);
await s.mouse.move(imLoch.x, imLoch.y, { steps: 3 });
await s.waitForTimeout(250);
await s.mouse.down();
await s.mouse.up();
await steht();
const b6 = (await O('objekte')).aktiv;
ok('6 Wählen: ein Klick auf das große Objekt wählt es (das Loch bleibt, sein Objekt ist nicht zu sehen), ein Klick in das Loch wählt das Objekt, das abzieht', a6 === 1 && !v6a.geist && v6a.verdeckt.includes(2) && unterLoch === 2 && b6 === 2, `nach dem ersten Klick aktiv ${a6}, blass ${v6a.geist}, verdeckt ${v6a.verdeckt}; im Loch liegt Objekt ${unterLoch}; nach dem zweiten Klick aktiv ${b6}`);

// ---------- 7 Sichern und Laden ----------
const name = 'probe verbund';
const vor7 = await O('verbund');
/** der Rauminhalt des Verbunds, gemessen an dem des großen Objekts (die Größe der Szene fällt heraus) */
const anteil = (v) => (v.bild?.inhalt ?? 0) / inhaltVon(v, 1);
const text7 = await O('sichern', name);
await browser.close();
t = await auf({ extra: EXTRA });
({ browser, s, O, geladen, fehler } = t);
const fehler1 = fehler;
const geladenText = await O('laden', name);
await s.waitForFunction(() => window.__ozzy.reihe() === null && window.__ozzy.zustand() === 'ruhe' && window.__ozzy.werk().gezeigt, null, { timeout: 120000 });
await steht(120000);
const nach7 = await O('verbund');
await bild('verbund-7-geladen');
ok(
  '7 Sichern und Laden: die Zustände kommen wieder, der Verbund bildet sich neu',
  /^gesichert/.test(text7) && /^geladen/.test(geladenText) && nach7.zustand.some((z) => z.id === 2 && z.art === 'abziehen' && z.rund) && !!nach7.bild && nach7.bild.beisst.includes(2) && Math.abs(anteil(nach7) / anteil(vor7) - 1) < 0.02,
  `„${text7.slice(0, 60)}“ · „${geladenText.slice(0, 60)}“; Zustand ${JSON.stringify(nach7.zustand)}; Inhalt des Verbunds gemessen am großen Objekt: ${anteil(nach7).toFixed(4)} (gesichert ${anteil(vor7).toFixed(4)}; die Szene wird beim Laden auf die gewohnte Größe gebracht)`,
);
if (fs.existsSync(`${ablage}${name}.eewesen`)) fs.unlinkSync(`${ablage}${name}.eewesen`);

// ---------- 8 anwenden ----------
const aktiv8 = (await O('objekte')).aktiv;
if (aktiv8 !== 2) await O('objektAktivieren', 2);
await steht();
await s.click('#naht-abziehen', { modifiers: ['Alt'] });
await s.waitForFunction(() => window.__ozzy.objekte().ruhende.length === 0 && !window.__ozzy.nahtStand().laeuft, null, { timeout: 60000 });
await steht(120000);
const n8 = await O('nahtStand');
const v8 = await O('verbund');
await bild('verbund-8-angewendet');
ok('8 ⌥ + Klick wendet an: eine Form, die Naht ein Loop mit Kante, kein Verbund mehr', n8.offen === 0 && n8.linien.some((l) => l.kante && l.pfad) && v8.bild === null && (await O('objekte')).aktiv === 1, `offene Kanten ${n8.offen}; Linien: ${n8.linien.map((l) => `${l.art}${l.kante ? ' Kante' : ''} ${l.punkte} P.`).join(', ')}; Verbund ${v8.bild ? 'da' : 'keiner'}`);

ok('9 keine Fehler in der Konsole', fehler.length === 0 && fehler1.length === 0, [...fehler1, ...fehler].slice(0, 4).join(' | '));
await browser.close();
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
process.exit(schlecht ? 1 : 0);
