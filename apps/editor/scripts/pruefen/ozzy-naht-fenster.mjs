// Ozzy, Naht zwischen zwei Objekten (Plan „Objekte, Spiegel und Nähte“, Etappe 4, 18.11.2026): zwei aufgeblasene Formen, die sich
// überschneiden, werden eine (verschmelzen), oder die eine wird aus der anderen herausgeschnitten (abziehen).
// Seit Etappe 5 (19.11.) sind die zwei Knöpfe Schalter am Objekt (der Verbund, `ozzy-verbund-fenster.mjs`); angewendet wird, was
// diese Probe prüft, mit ⌥ + Klick.
// Kriterien:
//   0  Mit einem Objekt stehen die Knöpfe nicht in der Leiste; mit zwei sind sie da und an.
//   1  Verschmelzen: ein Objekt, die Haut geschlossen und spiegelgleich, der Rauminhalt zwischen dem größeren und der Summe; die Naht
//      ist ein Loop mit Kante und Punkten, gewählt; das Werkzeug ist der weiße Zeiger. Die Rechnung kommt zur Ruhe, nichts schlägt um.
//   2  K: Die Naht wird weich (Kante aus), die Rechnung kommt zur Ruhe, nichts schlägt um.
//   3  ⌘Z, ⌘Z: wieder zwei Objekte, jedes mit seinen Punkten; die Knöpfe sind wieder an.
//   4  Abziehen (das zweite ist das Werkzeug): ein Objekt, kleiner als die Kugel allein, geschlossen, die Naht mit Kante. ⌘Z holt das
//      Werkzeug zurück.
//   5  Das zweite Objekt mit „Spiegel aus“: Verschmelzen macht die Form ganz und frei (Spiegel „aus“), geschlossen; ⌘Z stellt den
//      Spiegel der Kugel zurück (Clipping) und gibt das zweite heraus.
//   6  Berührt das gewählte Objekt kein anderes, ändert ⌥ + Klick nichts und sagt es.
//   7  Keine Fehler in der Konsole.
// `LINIE=1`: beide Formen mit ihrer Linie der Mitte (sie wird an der Naht geschnitten und hängt dort).
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5211/ozzy.html [LINIE=1] node scripts/pruefen/ozzy-naht-fenster.mjs [ordner für Bilder]
import { auf, z1 } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const LINIE = process.env.LINIE === '1';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
/** ein Punkt, der noch aussteht (im Plan vermerkt): Er wird gemeldet, zählt aber nicht als Fehler dieser Probe */
const offen = (name, erfuellt, text = '') => console.log(`${erfuellt ? 'gut ' : 'OFFEN'} ${name}${text ? `: ${text}` : ''}`);
const t = await auf({ extra: `ohneLinie=${LINIE ? 0 : 1}` });
const { browser, s, O, geladen, fehler } = t;
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/${name}${LINIE ? '-linie' : ''}.png` });
};
const still = async (zeit = 120000) => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => !window.__ozzy.nahtStand().laeuft && !window.__ozzy.werk().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: zeit });
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
const knopf = (art) => s.evaluate((a) => ({ da: !document.getElementById(`naht-${a}`).hidden, an: !document.getElementById(`naht-${a}`).disabled }), art);
const zurueck = async () => {
  await s.keyboard.press('Meta+z');
  await still();
};
const tsd = (x) => `${Math.round(x / 1000)} Tsd.`;
/** die Linse zweier Kugeln (Halbmesser R1, R2, Abstand der Mitten d) */
const linse = (R1, R2, d) => (Math.PI * (R1 + R2 - d) ** 2 * (d * d + 2 * d * (R1 + R2) - 3 * (R1 - R2) ** 2)) / (12 * d);

// die erste Form: eine Kugel
await O('form', kreis(600, 450, 130));
await s.waitForTimeout(300);
await O('aufblasen');
await geladen();
const k0 = await knopf('vereinen');
const n1 = await O('nahtStand');
// die zweite: kleiner, rechts oben, die Kugel überschneidend
await s.click('#plus');
await s.waitForTimeout(700);
await O('form', kreis(760, 400, 80), true);
await s.waitForTimeout(300);
await O('aufblasen');
await geladen();
await still();
const n2 = await O('nahtStand');
const o2 = await O('objekte');
const k2 = [await knopf('vereinen'), await knopf('abziehen')];
await bild('naht-0-zwei');
// was herauskommen soll (für zwei Kugeln gerechnet): zusammen die Summe ohne die Linse, abgezogen die Kugel ohne die Linse
const L = linse(n1.kasten.rx, n2.kasten.rx, Math.hypot(n2.kasten.cx - n1.kasten.cx, n2.kasten.cy - n1.kasten.cy));
const sollZusammen = n1.inhalt + n2.inhalt - L;
const sollAbgezogen = n1.inhalt - L;
ok(
  '0 die Knöpfe: mit einem Objekt nicht da, mit zwei sich berührenden da und an',
  !k0.da && k2.every((k) => k.da && k.an) && o2.aktiv === 2 && (await O('nahtPartner')) === 1,
  `mit einem: da ${k0.da}; mit zweien: ${k2.map((k) => `da ${k.da}, an ${k.an}`).join(' · ')}; Kugel ${n1.punkte} Punkte, ${tsd(n1.inhalt)}, ${n1.linien.length} Linien; zweites ${n2.punkte} Punkte, ${tsd(n2.inhalt)}`,
);

// ---------- 1 Verschmelzen ----------
const t1 = Date.now();
await s.click('#naht-vereinen', { modifiers: ['Alt'] });
await s.waitForFunction(() => window.__ozzy.objekte().ruhende.length === 0 && !window.__ozzy.nahtStand().laeuft, null, { timeout: 30000 });
const dauer1 = Date.now() - t1;
const gleich = await O('nahtStand');
await bild('naht-1-verschmolzen-gleich');
await still();
const v = await O('nahtStand');
const w1 = await O('werk');
const o1 = await O('objekte');
const naehte1 = v.linien.filter((l) => l.kante && l.pfad);
await bild('naht-1-verschmolzen');
ok(
  '1 Verschmelzen: eine Form, geschlossen und spiegelgleich, die Naht ein Loop mit Kante, gewählt',
  o1.ruhende.length === 0 && o1.aktiv === 1 && v.offen === 0 && v.ohnePaar === 0 && Math.abs(gleich.inhalt / sollZusammen - 1) < 0.02 && Math.abs(v.inhalt / sollZusammen - 1) < 0.06 && naehte1.length >= 1 && naehte1[0].punkte >= 2 && w1.auswahl.includes(`${naehte1[0].id}.-1`) && (await O('objekt')).werkzeug === 'auswahl' && w1.umgeschlagen === 0 && (await O('spiegel')).zustand === 'clip',
  `aktiv ${o1.aktiv}, ruhend ${o1.ruhende.length}; ${v.punkte} Punkte, offene Kanten ${v.offen}, ohne Paar ${v.ohnePaar}; Rauminhalt gleich nach dem Verbinden ${tsd(gleich.inhalt)}, nach dem Setzen ${tsd(v.inhalt)} (erwartet ${tsd(sollZusammen)}: Kugel ${tsd(n1.inhalt)} + zweites ${tsd(n2.inhalt)} − Linse ${tsd(L)}); Linien: ${v.linien.map((l) => `${l.art}${l.kante ? ' Kante' : ''}${l.haengt ? ' hängt' : ''} ${l.punkte} P.`).join(', ')}; Auswahl „${w1.auswahl}“; umgeschlagen ${w1.umgeschlagen}; ${dauer1} ms bis verbunden; „${w1.meldung}“`,
);

// ---------- 2 K: die Naht wird weich ----------
await s.keyboard.press('k');
await still();
const vk = await O('nahtStand');
const wk = await O('werk');
await bild('naht-2-weich');
ok(
  '2 K: Die Kante der Naht ist aus, die Haut bleibt geschlossen, nichts schlägt um',
  vk.linien.filter((l) => l.kante).length === v.linien.filter((l) => l.kante).length - naehte1.length && vk.offen === 0 && wk.umgeschlagen === 0 && Math.abs(vk.inhalt / v.inhalt - 1) < 0.25,
  `Linien mit Kante ${vk.linien.filter((l) => l.kante).length} (vorher ${v.linien.filter((l) => l.kante).length}); Rauminhalt ${tsd(vk.inhalt)} (mit Kante ${tsd(v.inhalt)}); ${vk.punkte} Punkte; umgeschlagen ${wk.umgeschlagen}`,
);
// (steht aus, Plan Abschnitt 10: An Formen ohne eigene Linien läuft die Rechnung beim Weichschalten auseinander; das Werk behält dann die Form)
offen('2b K rundet die Naht (die Rechnung kommt zur Ruhe, die Formen gehen mit)', !/nicht aufräumen|auseinander/.test(String(wk.meldung)), `Meldung: „${wk.meldung}“`);

// ---------- 3 ⌘Z, ⌘Z: wieder zwei ----------
await zurueck();
const v3a = await O('nahtStand');
await zurueck();
const o3 = await O('objekte');
const v3 = await O('nahtStand');
const k3 = await knopf('vereinen');
await bild('naht-3-zurueck');
ok(
  '3 ⌘Z, ⌘Z: die Kante der Naht ist wieder an, dann wieder zwei Objekte',
  v3a.linien.filter((l) => l.kante).length === v.linien.filter((l) => l.kante).length && o3.ruhende.length === 1 && o3.ruhende[0].id === 2 && o3.aktiv === 1 && v3.punkte === n1.punkte && o3.ruhende[0].punkte === n2.punkte && v3.marken === 0 && k3.da && k3.an,
  `nach dem ersten ⌘Z ${v3a.linien.filter((l) => l.kante).length} Linien mit Kante; nach dem zweiten aktiv ${o3.aktiv}, ruhend ${o3.ruhende.map((r) => r.id)}; Kugel ${v3.punkte} Punkte (vorher ${n1.punkte}), zweites ${o3.ruhende[0]?.punkte} (${n2.punkte}); Knopf an ${k3.an}`,
);

// ---------- 4 Abziehen: das zweite ist das Werkzeug ----------
await O('objektAktivieren', 2);
await still();
await s.click('#naht-abziehen', { modifiers: ['Alt'] });
await s.waitForFunction(() => window.__ozzy.objekte().ruhende.length === 0 && !window.__ozzy.nahtStand().laeuft, null, { timeout: 30000 });
await still();
const a4 = await O('nahtStand');
const w4 = await O('werk');
const o4 = await O('objekte');
await bild('naht-4-abgezogen');
ok(
  '4 Abziehen: eine Form, kleiner als die Kugel, geschlossen, der Rand eine Linie mit Kante',
  o4.ruhende.length === 0 && o4.aktiv === 1 && a4.offen === 0 && a4.ohnePaar === 0 && Math.abs(a4.inhalt / sollAbgezogen - 1) < 0.06 && a4.linien.some((l) => l.kante && l.pfad) && w4.umgeschlagen === 0,
  `aktiv ${o4.aktiv}; ${a4.punkte} Punkte, offene Kanten ${a4.offen}, ohne Paar ${a4.ohnePaar}; Rauminhalt nach dem Setzen ${tsd(a4.inhalt)} (erwartet ${tsd(sollAbgezogen)}: Kugel ${tsd(n1.inhalt)} − Linse ${tsd(L)}); Linien: ${a4.linien.map((l) => `${l.art}${l.kante ? ' Kante' : ''}${l.haengt ? ' hängt' : ''} ${l.punkte} P.`).join(', ')}; umgeschlagen ${w4.umgeschlagen}`,
);
await zurueck();
const o4b = await O('objekte');
ok('4b ⌘Z holt das Werkzeug zurück', o4b.ruhende.length === 1 && o4b.ruhende[0].id === 2 && (await O('nahtStand')).punkte === n1.punkte, `aktiv ${o4b.aktiv}, ruhend ${o4b.ruhende.map((r) => r.id)}`);

// ---------- 5 das zweite mit „Spiegel aus“: Die Form wird ganz und frei ----------
await O('objektAktivieren', 2);
await still();
await O('spiegelSetzen', 'aus');
await still();
await s.click('#naht-vereinen', { modifiers: ['Alt'] });
await s.waitForFunction(() => window.__ozzy.objekte().ruhende.length === 0 && !window.__ozzy.nahtStand().laeuft, null, { timeout: 30000 });
await still();
const f5 = await O('nahtStand');
const sp5 = await O('spiegel');
const w5 = await O('werk');
await bild('naht-5-frei');
ok(
  '5 ein freies Objekt verschmolzen: Die Form ist ganz und frei, Spiegel „aus“',
  sp5.zustand === 'aus' && sp5.frei && f5.offen === 0 && f5.ohnePaar === f5.punkte && Math.abs(f5.inhalt / sollZusammen - 1) < 0.06 && f5.linien.some((l) => l.kante && l.art === 'paar') && w5.umgeschlagen === 0,
  `Spiegel ${sp5.zustand}, frei ${sp5.frei}; ${f5.punkte} Punkte, offene Kanten ${f5.offen}; Rauminhalt ${tsd(f5.inhalt)}; Linien: ${f5.linien.map((l) => `${l.art}${l.kante ? ' Kante' : ''} ${l.punkte} P.`).join(', ')}; umgeschlagen ${w5.umgeschlagen}`,
);
await zurueck();
const sp5b = await O('spiegel');
const o5b = await O('objekte');
ok('5b ⌘Z: Die Kugel ist wieder gespiegelt (Clipping), das zweite ruht wieder (Spiegel aus)', sp5b.zustand === 'clip' && !sp5b.frei && o5b.ruhende.length === 1 && o5b.ruhende[0].frei && (await O('nahtStand')).ohnePaar === 0, `Spiegel ${sp5b.zustand}, frei ${sp5b.frei}; ruhend ${o5b.ruhende.map((r) => `${r.id}${r.frei ? ' frei' : ''}`)}`);

// ---------- 6 berührt es kein anderes, ändert das Anwenden nichts ----------
await O('objektAktivieren', 2);
await still();
await s.click('#plus');
await s.waitForTimeout(700);
await O('form', kreis(1050, 250, 50), true);
await s.waitForTimeout(300);
await O('aufblasen');
await geladen();
await still();
const k6 = await knopf('vereinen');
const o6a = await O('objekte');
await s.click('#naht-vereinen', { modifiers: ['Alt'] });
await still();
const o6b = await O('objekte');
const m6 = String((await O('werk')).meldung);
ok('6 ein drittes Objekt abseits: ⌥ + Klick ändert nichts und sagt, dass es kein anderes berührt', k6.da && k6.an && (await O('nahtPartner')) === 0 && o6b.ruhende.length === o6a.ruhende.length && o6b.aktiv === o6a.aktiv && /berührt kein anderes/.test(m6), `da ${k6.da}, an ${k6.an}, Partner ${await O('nahtPartner')}; Objekte ${o6a.ruhende.length + 1} → ${o6b.ruhende.length + 1}; „${m6}“`);

ok('7 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
