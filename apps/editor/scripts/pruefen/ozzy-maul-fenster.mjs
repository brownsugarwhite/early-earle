// Ozzy, das Maul als echte Form (Plan „Maul, Zähne, Zunge“, Etappe 1, erste Scheibe, 20.11.2026), an „teat firefish“ (NAME), in
// der eingerasteten Seite. Eine Linie mit P vom Leeren vor der Form bis zum Mundwinkel in ihr, mit ↩ beendet, bleibt als Strich
// stehen und bekommt den Tropfen „Maul“. Der Tropfen macht daraus das Maul (`werk.maulSchneiden`).
// Kriterien:
//   1  Nach ↩ steht der Strich (kein neuer Loop), der Tropfen „Maul“ hängt an seinem Ende in der Form.
//   2  Esc verwirft ihn (kein Tropfen, kein Strich, die Linien wie vorher).
//   3  Noch einmal gezeichnet, Tropfen angetippt: Die Form hat ein Maul. Die Lippe ist ein Ring mit Kante und Zwillingen, sie ist
//      gewählt; im Maul liegen die Rachenlinie (hart) und die Mitte von Gaumen und Boden; die Linien der Form, die das Maul
//      kreuzen, enden an der Lippe. Kein Punkt ohne Spiegelbild. Das Werk kommt zur Ruhe.
//   4  Der alte Tropfen „Maul“ erscheint an dieser Lippe nicht (Öffnen kommt mit Etappe 2).
//   5  Ein Punkt der Lippe, in der Seite gezogen, nimmt seinen Zwilling mit: Beide Lippen bleiben aufeinander (bis auf den
//      Haarspalt), das Werk kommt zur Ruhe. Ein ⌘Z nimmt den Zug zurück.
//   6  Ein ⌘Z nimmt das Maul zurück.
//   7  Keine Fehler in der Konsole.
// Etappe 2 (die Kiefer, 20.11.), zwischen 5 und 6:
//   8  Gleich nach dem Schneiden zeigt sich das Maul einmal (auf und wieder zu). Mit ihm gibt es die Tafel „Fressen“ und an den
//      Kieferspitzen zwei Tropfen (oben und unten); das Maul ist zu.
//   9  Den unteren Tropfen halten: Die Anzeige öffnet das Maul (der Blick), nichts faltet; loslassen: wieder zu. Die Pose bleibt,
//      es gibt keinen Schritt für ⌘Z.
//   10 Den unteren Tropfen um das Scharnier ziehen: Der Winkel des Unterkiefers folgt dem Zeiger; losgelassen ist das Maul in der
//      Grundform wieder zu. Ein ⌘Z gibt den Winkel zurück.
//   11 „Fressen“ an: Das Maul bleibt offen, die Tropfen stehen an den geöffneten Kieferspitzen. Der obere Tropfen dreht den
//      Oberkiefer allein, der untere den Unterkiefer; bis zum größten Winkel faltet nichts; knapp vor „zu“ rastet der Kiefer zu.
//   12 „Fressen“ aus: Die Grundform ist, wie sie war (zu). Das Drehen der Anzeige dauert unter 4 ms.
// Etappe 3 (die Lippen, 20.11.), danach:
//   13 Ein Punkt der Lippe angeklickt: Am Mundwinkel hängt „Lippen trennen“. Angetippt: Die Lippe ist kein zusammengeklappter Loop
//      mehr, die Form hat sich nicht bewegt, der Tropfen heißt „Lippen verbinden“.
//   14 Wo die Lippen noch aufeinanderliegen, nimmt die Seite des Zeigers die Lippe: knapp unter der Linie gegriffen und nach unten
//      gezogen, geht nur der Punkt der Unterlippe; knapp darüber und nach oben nur der der Oberlippe. Das Werk kommt zur Ruhe.
//   15 Überbiss (wie Florians Blatt 06, oben lang, unten zurück): Jeder Punkt der Unterlippe wandert ein Viertel zum Mundwinkel
//      hin. Die Oberlippe bleibt, das Werk kommt zur Ruhe, außen schlägt nichts um; der Tropfen des Unterkiefers sitzt an seiner
//      kürzeren Spitze. Geöffnet faltet nichts.
//   16 „Lippen verbinden“: Die Lippen liegen wieder aufeinander (Zwillinge), das Werk kommt zur Ruhe.
// Etappe 4 (die Ebene „Maul“, 20.11.; mehr dazu in `ozzy-maul-farbe-fenster.mjs`):
//   8b Mit dem Maul ist die Ebene „Maul“ angelegt (die Zahnfleischlinie, zwei Füllungen).
//   17 Nach allem Ziehen an den Lippen: Jede Farblinie der Ebene hat ihren Weg, und von außen trifft kein Strahl Farbe.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;x,y;…' (Werk, von vorn zum Mundwinkel)] node scripts/pruefen/ozzy-maul-fenster.mjs [ordner für Bilder]
//   FRISCH=1: statt einer gesicherten Form eine frisch gezeichnete (ein Oval, aufgeblasen, mit den drei Start-Loops); die Linie
//   des Mauls wird dann aus ihrem Kasten genommen (von links in die Form).
import { chromium } from '@playwright/test';
import { flickenAnlegen } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
// von vorn (im Leeren vor der Schnauze) zum Mundwinkel, in Einheiten des Werks. Der erste Punkt liegt weit genug vor der Form:
// Dicht am Umriss fängt P die Linie der Mitte, und es beginnt eine Abzweigung statt eines freien Strichs.
let LINIE = (process.env.LINIE ?? '-860,172;-735,156;-700,152;-665,156;-640,165').split(';').map((t) => t.split(',').map(Number));
const FRISCH = process.env.FRISCH === '1';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await flickenAnlegen(s, undefined, fehler);
await s.goto(FRISCH ? `${basis}?loops=1` : `${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
if (FRISCH) {
  // ein Oval aufs Blatt, aufblasen, warten, bis die Form mit ihren Start-Loops steht
  const [cx, cy, rx, ry] = [720, 450, 190, 120];
  const kx = 0.5523 * rx;
  const ky = 0.5523 * ry;
  await O('form', [
    { x: cx + rx, y: cy, ein: [0, -ky], aus: [0, ky] },
    { x: cx, y: cy + ry, ein: [kx, 0], aus: [-kx, 0] },
    { x: cx - rx, y: cy, ein: [0, ky], aus: [0, -ky] },
    { x: cx, y: cy - ry, ein: [-kx, 0], aus: [kx, 0] },
  ]);
  await s.waitForTimeout(300);
  await O('aufblasen');
  await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 90000 });
  await s.waitForTimeout(2500);
}
const ruhig = async (zeit = 120000) => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: zeit });
  await s.waitForTimeout(200);
};
await ruhig();
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-maul-${name}.png` });
};
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
const klick = async (x, y) => {
  await s.mouse.move(x, y);
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
const vorher = await O('werkLinienDaten');
const umgVorher = (await O('werk')).umgeschlagen;
if (FRISCH) {
  // die Linie aus dem Kasten der Form (ihrer Linienpunkte): von links im Leeren bis zu einem Drittel in die Form, leicht gebogen
  const P = vorher.flatMap((l) => l.punkte);
  const x0 = Math.min(...P.map((p) => p.x));
  const x1 = Math.max(...P.map((p) => p.x));
  const y0 = Math.min(...P.map((p) => p.y));
  const y1 = Math.max(...P.map((p) => p.y));
  const W = x1 - x0;
  const ym = 0.5 * (y0 + y1) - 0.12 * (y1 - y0);
  LINIE = [
    [x0 - 0.3 * W, ym + 0.02 * W],
    [x0 + 0.1 * W, ym - 0.02 * W],
    [x0 + 0.3 * W, ym + 0.03 * W],
  ];
  console.log(`frische Form: ${vorher.length} Linien, Kasten x ${x0.toFixed(0)} … ${x1.toFixed(0)}, y ${y0.toFixed(0)} … ${y1.toFixed(0)}; Linie des Mauls ${LINIE.map((q) => q.map((v) => v.toFixed(0)).join(',')).join(' ; ')}`);
}
const zeichnen = async () => {
  await s.keyboard.press('p');
  await s.waitForTimeout(300);
  for (const [x, y] of LINIE) {
    const q = await O('werkImBild', { x, y, z: 0 });
    await klick(q.x, q.y);
  }
  await s.keyboard.press('Enter');
  await s.waitForTimeout(500);
};

// 1 der Strich wartet, der Tropfen hängt an seinem Ende
await zeichnen();
const st1 = await O('maulStrich');
const p1 = await O('pose');
const l1 = await O('werkLinienDaten');
const ende = await O('werkImBild', { x: LINIE[LINIE.length - 1][0], y: LINIE[LINIE.length - 1][1], z: 0 });
ok(
  '1 nach ↩ wartet der Strich, der Tropfen „Maul“ hängt an seinem Ende in der Form',
  !!st1 && st1.innenAmEnde && p1.tropfen === 'Maul' && l1.length === vorher.length && !!st1.ort && Math.hypot(st1.ort.x - ende.x, st1.ort.y - ende.y) < 3,
  `Strich ${st1 ? `${st1.anker} Anker, Mundwinkel am ${st1.innenAmEnde ? 'Ende' : 'Anfang'}` : 'keiner'}; Tropfen ${p1.tropfen ?? 'keiner'}; Linien ${vorher.length} → ${l1.length}; Meldung: ${(await O('werk')).meldung}`,
);
await bild('1-strich');

// 2 Esc verwirft ihn
await s.keyboard.press('Escape');
await s.waitForTimeout(400);
const st2 = await O('maulStrich');
const p2 = await O('pose');
ok('2 Esc verwirft den Strich', !st2 && p2.tropfen !== 'Maul' && (await O('werkLinienDaten')).length === vorher.length, `Strich ${st2 ? 'noch da' : 'weg'}; Tropfen ${p2.tropfen ?? 'keiner'}`);

// 3 noch einmal, und der Tropfen macht das Maul
await s.keyboard.press('Escape');
await zeichnen();
const st3 = await O('maulStrich');
if (!st3) ok('3 das Maul entsteht', false, 'kein wartender Strich nach dem zweiten Zeichnen');
else {
  const t0 = Date.now();
  await s.click('#maul-tropfen');
  await s.waitForFunction(() => !window.__ozzy.maulStrich() || /Maul geht hier nicht|Maul:/.test(window.__ozzy.werk().meldung ?? ''), null, { timeout: 60000 }).catch(() => {});
  // Etappe 2: Gleich nach dem Schneiden zeigt sich das Maul einmal (auf und wieder zu); der weiteste Blick in dieser Zeit
  let schauWeit = 0;
  for (let i = 0; i < 40; i++) {
    const b = (await O('kiefer')).blick;
    schauWeit = Math.max(schauWeit, b);
    if (schauWeit > 0.5 && b === 0) break;
    await s.waitForTimeout(80);
  }
  await ruhig();
  const ms = Date.now() - t0;
  const L = await O('werkLinienDaten');
  const w = await O('werk');
  const lippe = L.find((l) => l.maulEcht);
  const rachen = L.filter((l) => l.kante && !l.maulEcht && l.haengt);
  const haengend = L.filter((l) => l.haengt && (l.haengt[0] || l.haengt[1]));
  const zw = lippe ? lippe.punkte.length : 0;
  ok(
    '3 das Maul entsteht: Lippe mit Kante und Zwillingen, zwei Linien im Maul, das Werk kommt zur Ruhe',
    !!lippe && lippe.kante === true && lippe.art === 'ring' && zw >= 3 && zw % 2 === 1 && rachen.length >= 1 && L.length >= vorher.length + 3 && !(await O('maulStrich')),
    `${ms} ms bis zur Ruhe; Linien ${vorher.length} → ${L.length}; Lippe ${lippe ? `${lippe.id} (${lippe.art}, ${zw} Punkte, Haarspalt ${lippe.maulLinie}°)` : 'fehlt'}; hart im Maul ${rachen.length}; ${haengend.length} Linien hängen an einer anderen; umgeschlagen ${umgVorher} → ${w.umgeschlagen}; Meldung: ${w.meldung}`,
  );
  await bild('2-maul-seite');
  // 4 der alte Tropfen erscheint an der gewählten Lippe nicht (auch nicht, wenn P aus ist)
  await s.keyboard.press('a');
  await s.waitForTimeout(500);
  const p4 = await O('pose');
  ok('4 an der Lippe des neuen Mauls hängt der alte Tropfen nicht (dort steht „Lippen trennen“)', p4.tropfen === null || p4.tropfen === 'Lippen trennen', `Tropfen ${p4.tropfen ?? 'keiner'}`);
  // im Raum mit Wachs: das geschlossene Maul von der Seite und von vorn (nur als Bild, kein Kriterium)
  await s.keyboard.press('0');
  await s.waitForTimeout(1800);
  await O('material', 'wachs');
  await O('blickSetzen', { gier: -1.15, neigung: 0.12, zoom: 4 });
  await s.waitForTimeout(1200);
  await bild('3-maul-wachs');
  await O('blickSetzen', { gier: -1.8, neigung: 0.1, zoom: 4 });
  await s.waitForTimeout(1200);
  await bild('4-maul-wachs-vorn');
  await s.keyboard.press('1');
  await s.waitForTimeout(1800);
  // 5 ein Punkt der Lippe gezogen: sein Zwilling geht mit
  {
    const Lv = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    const n = Lv.punkte.length;
    const iW = (n - 1) / 2;
    // ein Punkt der ersten Lippe zwischen Spitze und Mundwinkel, nicht in der Spiegelebene
    const i = Math.max(1, Math.round(iW / 2));
    const j = n - 1 - i;
    const vor = Lv.punkte[i];
    const q = await O('werkImBild', { x: vor.x, y: vor.y, z: vor.z });
    // 8 Einheiten des Werks nach unten (im Bild je nach Größe der Form verschieden weit)
    const z = await O('werkImBild', { x: vor.x, y: vor.y - 8, z: vor.z });
    await s.mouse.move(q.x, q.y);
    await s.waitForTimeout(300);
    await s.mouse.down();
    for (let k = 1; k <= 8; k++) {
      await s.mouse.move(q.x + ((z.x - q.x) * k) / 8, q.y + ((z.y - q.y) * k) / 8);
      await s.waitForTimeout(40);
    }
    await s.mouse.up();
    await ruhig();
    const Ln = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    const w = await O('werk');
    const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    let paarWeit = 0;
    if (Ln && Ln.punkte.length % 2 === 1) for (let k = 0; k < (Ln.punkte.length - 1) / 2; k++) paarWeit = Math.max(paarWeit, d3(Ln.punkte[k], Ln.punkte[Ln.punkte.length - 1 - k]));
    const gegangen = Ln ? d3(Ln.punkte[i] ?? vor, vor) : 0;
    const zwilling = Ln ? d3(Ln.punkte[j] ?? vor, Lv.punkte[j]) : 0;
    ok(
      '5 ein Punkt der Lippe gezogen: der Zwilling geht mit, die Lippen bleiben aufeinander',
      !!Ln && Ln.punkte.length === n && gegangen > 4 && Math.abs(gegangen - zwilling) < 0.2 && paarWeit < 0.2,
      `Punkt ${i} ging ${gegangen.toFixed(2).replace('.', ',')}, sein Zwilling ${j} ging ${zwilling.toFixed(2).replace('.', ',')}; die Paare liegen höchstens ${paarWeit.toFixed(3).replace('.', ',')} auseinander; umgeschlagen ${w.umgeschlagen}; Meldung: ${(w.meldung ?? '').slice(0, 80)}`,
    );
    await bild('6-lippe-gezogen');
    await s.keyboard.press('Meta+z');
    await ruhig();
    const Lz = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    ok('5b ein ⌘Z nimmt den Zug zurück', !!Lz && d3(Lz.punkte[i], vor) < 1e-6, Lz ? `Punkt ${i} liegt ${d3(Lz.punkte[i], vor).toFixed(3)} neben vorher` : 'die Lippe fehlt');
  }
  // ---------- Etappe 2: die Kiefer ----------
  {
    const K = () => O('kiefer');
    const komma = (x, n = 1) => x.toFixed(n).replace('.', ',');
    const dreh = (P, S, grad) => {
      const w = (grad * Math.PI) / 180;
      const dx = P.x - S.x;
      const dy = P.y - S.y;
      return { x: S.x + Math.cos(w) * dx - Math.sin(w) * dy, y: S.y + Math.sin(w) * dx + Math.cos(w) * dy };
    };
    /** am Tropfen drücken, den Zeiger in Schritten um das Scharnier führen (Grad im Bild), `danach` aufrufen, loslassen */
    const ziehen = async (von, S, grad, danach) => {
      await s.mouse.move(von.x, von.y);
      await s.waitForTimeout(250);
      await s.mouse.down();
      await s.waitForTimeout(500);
      const n = Math.max(8, Math.round(Math.abs(grad) / 2));
      for (let k = 1; k <= n; k++) {
        const q = dreh(von, S, (grad * k) / n);
        await s.mouse.move(q.x, q.y);
        await s.waitForTimeout(25);
      }
      await s.waitForTimeout(300);
      const r = danach ? await danach() : null;
      await s.mouse.up();
      await s.waitForTimeout(900);
      return r;
    };
    await s.waitForTimeout(1800);
    await ruhig();
    // 8 Tafel und Tropfen
    const k8 = await K();
    const p8 = await O('pose');
    const ruhe8 = (await O('pose', true)).haut;
    ok(
      '8 mit dem Maul: es zeigt sich einmal; die Tafel „Fressen“, zwei Tropfen an den Kieferspitzen, das Maul zu',
      schauWeit > 0.9 && k8.da && !!k8.oben && !!k8.unten && k8.oben.y < k8.unten.y && k8.blick === 0 && p8.fressen && !p8.an && p8.maul !== null && k8.spalt < 0.2,
      `nach dem Schneiden ging der Blick bis ${komma(schauWeit, 2)} auf; Tropfen oben ${k8.oben ? `${komma(k8.oben.x, 0)}/${komma(k8.oben.y, 0)}` : 'fehlt'}, unten ${k8.unten ? `${komma(k8.unten.x, 0)}/${komma(k8.unten.y, 0)}` : 'fehlt'}; Pose oben ${p8.schaedel}°, unten ${p8.kiefer}°; Lippen vorn ${komma(k8.spalt, 2)} auseinander; Lippe ${komma(k8.lang, 0)} lang`,
    );
    await bild('7-tropfen');
    {
      const f8 = await O('farbe');
      const m8 = f8.ebenen.find((e) => e.name === 'Maul');
      ok('8b mit dem Maul ist die Ebene „Maul“ angelegt', !!m8 && m8.linien === 1 && m8.fuellungen === 2 && f8.fehl === 0, `Ebenen: ${f8.ebenen.map((e) => `${e.name} (${e.linien} Linien, ${e.fuellungen} Füllungen)`).join(', ')}; ohne Weg ${f8.fehl}`);
    }
    if (k8.oben && k8.unten && k8.scharnier) {
      // 9 halten
      await s.mouse.move(k8.unten.x, k8.unten.y);
      await s.waitForTimeout(250);
      await s.mouse.down();
      await s.waitForTimeout(1000);
      const k9 = await K();
      await bild('8-blick');
      if (process.env.DIAG === '1') {
        // die gefalteten Dreiecke einzeln: Fläche in der Seite (Ruhe → gezeigt), je Ecke Nummer und Ort gegen den Mundwinkel
        const C = await s.evaluate(() => {
          const d = window.__ozzy.werkLinienDaten().find((l) => l.maulEcht);
          const p = d.punkte[(d.punkte.length - 1) / 2];
          return { x: p.x, y: p.y, z: p.z };
        });
        console.log(`Mundwinkel ${C.x.toFixed(1)}, ${C.y.toFixed(1)}, ${C.z.toFixed(1)}`);
        for (const w of k9.wo) {
          const e = [0, 1, 2].map((i) => `#${w[2 + 4 * i]} (${(w[3 + 4 * i] - C.x).toFixed(2)}, ${(w[4 + 4 * i] - C.y).toFixed(2)}, z ${w[5 + 4 * i].toFixed(1)})`);
          console.log(`  Fläche ${w[0].toFixed(3)} → ${w[1].toFixed(3)}: ${e.join('  ')}`);
        }
      }
      await s.mouse.up();
      await s.waitForTimeout(1000);
      const k9b = await K();
      const p9 = await O('pose');
      ok(
        '9 den unteren Tropfen halten: das Maul öffnet für einen Blick, nichts faltet; loslassen: zu, die Pose bleibt',
        k9.blick > 0.99 && k9.spalt > 0.3 * k9.lang && k9.gefaltet === 0 && k9b.blick === 0 && k9b.spalt < 0.2 && !p9.an && p9.kiefer === p8.kiefer && p9.schaedel === p8.schaedel && k9b.schritte === k8.schritte,
        `gehalten: Blick ${komma(k9.blick, 2)}, Lippen vorn ${komma(k9.spalt)} auseinander, ${k9.gefaltet} gefaltet (am Umriss in der Seite gekippt: ${k9.gekippt}), größte Dehnung ${komma(k9.gedehnt, 2)}; losgelassen: Blick ${komma(k9b.blick, 2)}, Lippen ${komma(k9b.spalt, 2)}; Schritte ${k8.schritte} → ${k9b.schritte}`,
      );
      // 10 ziehen in der Grundform: Welche Richtung im Bild öffnet, zeigt der Tropfen selbst (unten liegt tiefer als oben)
      const auf = dreh(k8.unten, k8.scharnier, 5).y > k8.unten.y ? 1 : -1;
      const p10 = await ziehen(k8.unten, k8.scharnier, 12 * auf, () => O('pose'));
      const k10 = await K();
      const p10b = await O('pose');
      await s.keyboard.press('Meta+z');
      await s.waitForTimeout(600);
      const p10c = await O('pose');
      ok(
        '10 den unteren Tropfen ziehen: der Unterkiefer folgt dem Zeiger; losgelassen ist das Maul wieder zu; ⌘Z gibt den Winkel zurück',
        Math.abs(p10.kiefer - (p8.kiefer + 12)) < 1.5 && p10.schaedel === p8.schaedel && k10.blick === 0 && k10.spalt < 0.2 && !p10b.an && k10.schritte === k8.schritte + 1 && p10c.kiefer === p8.kiefer,
        `Zeiger 12° um das Scharnier: unten ${p8.kiefer}° → ${komma(p10.kiefer)}°, oben ${p10.schaedel}°; losgelassen: Blick ${komma(k10.blick, 2)}, Lippen ${komma(k10.spalt, 2)}; Schritte ${k8.schritte} → ${k10.schritte}; nach ⌘Z unten ${p10c.kiefer}°`,
      );
      // 11 „Fressen“ an
      await s.click('#fressen-knopf');
      await s.waitForTimeout(1200);
      await ruhig();
      const k11 = await K();
      const p11 = await O('pose');
      await bild('9-fressen');
      if (ordner) {
        // im Raum mit Wachs: das offene Maul schräg von vorn und von der Seite (nur als Bild, kein Kriterium)
        await s.keyboard.press('0');
        await s.waitForTimeout(1800);
        await O('material', 'wachs');
        await O('blickSetzen', { gier: -1.15, neigung: 0.12, zoom: 4 });
        await s.waitForTimeout(1200);
        await bild('9b-fressen-wachs');
        await O('blickSetzen', { gier: -1.75, neigung: 0.05, zoom: 4 });
        await s.waitForTimeout(1200);
        await bild('9c-fressen-wachs-vorn');
        await O('blickSetzen', { gier: -0.5, neigung: 0.25, zoom: 3 });
        await s.waitForTimeout(1200);
        await bild('9d-fressen-wachs-schraeg');
        await s.keyboard.press('1');
        await s.waitForTimeout(1800);
      }
      let text11 = `in der Pose: ${p11.an ? 'ja' : 'nein'}; Lippen vorn ${komma(k11.spalt)} auseinander, ${k11.gefaltet} gefaltet`;
      let gut11 = p11.an && k11.spalt > 0.3 * k11.lang && k11.gefaltet === 0 && !!k11.oben && !!k11.unten && k11.unten.y > k8.unten.y + 5;
      if (k11.oben && k11.unten && k11.scharnier) {
        // der obere Tropfen: 10° weiter auf (im Bild gegen den Sinn des unteren); seine Lage neu gelesen (der Blick war im Raum)
        const kA0 = await K();
        const pA = await ziehen(kA0.oben, kA0.scharnier, -10 * auf, () => O('pose'));
        gut11 &&= Math.abs(pA.schaedel - (p11.schaedel + 10)) < 1.5 && pA.kiefer === p11.kiefer;
        text11 += `; oben ${p11.schaedel}° → ${komma(pA.schaedel)}° (unten bleibt ${pA.kiefer}°)`;
        // der untere bis zum Anschlag
        const kB0 = await K();
        const kB = await ziehen(kB0.unten, kB0.scharnier, 60 * auf, async () => ({ k: await K(), p: await O('pose') }));
        await bild('10-weit');
        gut11 &&= kB.p.kiefer === 70 && kB.k.gefaltet === 0;
        text11 += `; unten bis zum Anschlag: ${kB.p.kiefer}°, ${kB.k.gefaltet} gefaltet (am Umriss gekippt: ${kB.k.gekippt}), größte Dehnung ${komma(kB.k.gedehnt, 2)}`;
        if (process.env.DIAG === '1') for (const w of kB.k.wo) console.log(`  am Anschlag gefaltet: Fläche ${w[0].toFixed(3)} → ${w[1].toFixed(3)}: ${[0, 1, 2].map((i) => `#${w[2 + 4 * i]} (${w[3 + 4 * i].toFixed(1)}, ${w[4 + 4 * i].toFixed(1)}, z ${w[5 + 4 * i].toFixed(1)})`).join('  ')}`);
        // und fast ganz zu: Er rastet zu
        const kC0 = await K();
        const pC = await ziehen(kC0.unten, kC0.scharnier, -69 * auf, () => O('pose'));
        gut11 &&= pC.kiefer === 0;
        text11 += `; 69° zurück: ${pC.kiefer}° (rastet zu)`;
      }
      ok('11 „Fressen“ an: offen, jeder Tropfen dreht seinen Kiefer, bis zum Anschlag keine Falte, knapp vor „zu“ rastet er zu', gut11, text11);
      // 12 „Fressen“ aus: die Grundform wie vorher; Zeit für das Drehen der Anzeige (in der Pose gemessen)
      const k12a = await K();
      await s.click('#fressen-knopf');
      await s.waitForTimeout(1200);
      await ruhig();
      const k12 = await K();
      const p12 = await O('pose', true);
      let weit = 0;
      if (p12.haut && ruhe8 && p12.haut.length === ruhe8.length) for (let i = 0; i < ruhe8.length; i++) weit = Math.max(weit, Math.abs(p12.haut[i] - ruhe8[i]));
      else weit = Infinity;
      ok(
        '12 „Fressen“ aus: die Grundform wie vorher, zu; das Drehen der Anzeige unter 4 ms',
        !p12.an && k12.spalt < 0.2 && weit < 0.05 && k12a.ms < 4,
        `Grundform höchstens ${Number.isFinite(weit) ? komma(weit, 3) : 'anderes Netz'} neben vorher; Lippen ${komma(k12.spalt, 2)}; Drehen der Anzeige ${komma(k12a.ms, 2)} ms`,
      );
      // ---------- Etappe 3: die Lippen ----------
      {
        const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        const lippeJetzt = async () => (await O('werkLinienDaten')).find((l) => l.maulEcht);
        const L0 = await lippeJetzt();
        const n = L0.punkte.length;
        const iW = (n - 1) / 2;
        // ein Punktpaar zwischen Spitze und Mundwinkel und eins näher am Mundwinkel
        const iA = Math.max(1, Math.round(iW / 2));
        const iB = Math.min(iW - 1, iA + 1);
        const imBild = (p) => O('werkImBild', { x: p.x, y: p.y, z: p.z });
        // 13 anklicken, trennen
        const qA = await imBild(L0.punkte[iA]);
        await klick(qA.x, qA.y);
        const p13 = await O('pose');
        const haut13 = (await O('pose', true)).haut;
        if (p13.tropfen === 'Lippen trennen') await s.click('#maul-tropfen');
        await s.waitForTimeout(500);
        const L13 = await lippeJetzt();
        const p13b = await O('pose');
        const haut13b = (await O('pose', true)).haut;
        let bewegt13 = 0;
        if (haut13 && haut13b && haut13.length === haut13b.length) for (let i = 0; i < haut13.length; i++) bewegt13 = Math.max(bewegt13, Math.abs(haut13[i] - haut13b[i]));
        else bewegt13 = Infinity;
        ok(
          '13 an der gewählten Lippe „Lippen trennen“: danach kein zusammengeklappter Loop mehr, die Form unbewegt, der Tropfen „Lippen verbinden“',
          p13.tropfen === 'Lippen trennen' && (await O('lippen')) === true && !!L13 && L13.maulLinie === null && L13.punkte.length === n && bewegt13 < 1e-9 && p13b.tropfen === 'Lippen verbinden',
          `Tropfen vorher „${p13.tropfen ?? 'keiner'}“, danach „${p13b.tropfen ?? 'keiner'}“; Lippe ${L13 ? `maulLinie ${L13.maulLinie}, ${L13.punkte.length} Punkte, echt ${L13.maulEcht}` : 'fehlt'}; Form bewegt ${bewegt13}`,
        );
        /** an einem Punktpaar ziehen: `seite` Bildpunkte neben der Linie drücken (+ unten), um `weg` (Werk) ziehen; zurück: wie weit jeder der zwei Punkte ging */
        const paarZiehen = async (i, seite, weg) => {
          const j = n - 1 - i;
          const V = await lippeJetzt();
          const a = V.punkte[i];
          const von = await imBild(a);
          const nach = await imBild({ x: a.x + weg.x, y: a.y + weg.y, z: a.z });
          await s.mouse.move(von.x - 160, von.y + 160);
          await s.waitForTimeout(250);
          await s.mouse.move(von.x, von.y + seite);
          await s.waitForTimeout(300);
          await s.mouse.down();
          for (let k = 1; k <= 8; k++) {
            await s.mouse.move(von.x + ((nach.x - von.x) * k) / 8, von.y + seite + ((nach.y - von.y) * k) / 8);
            await s.waitForTimeout(40);
          }
          await s.mouse.up();
          await ruhig();
          const N = await lippeJetzt();
          return { i: d3(N.punkte[i], V.punkte[i]), j: d3(N.punkte[j], V.punkte[j]), dyI: N.punkte[i].y - V.punkte[i].y, dyJ: N.punkte[j].y - V.punkte[j].y, n: N.punkte.length };
        };
        if (L13 && L13.maulLinie === null) {
          // 14 die Seite des Zeigers nimmt die Lippe
          const u14 = (await O('werk')).umgeschlagen;
          const zA = await paarZiehen(iA, 3, { x: 0, y: -10 });
          const zB = await paarZiehen(iB, -3, { x: 0, y: 6 });
          const w14 = await O('werk');
          // unten: genau einer der zwei ging (nach unten), oben: genau der andere der Hälfte ging (nach oben)
          const untenI = zA.i > 5 && zA.j < 0.01;
          const untenJ = zA.j > 5 && zA.i < 0.01;
          const obenPasst = untenI ? zB.j > 3 && zB.i < 0.01 : zB.i > 3 && zB.j < 0.01;
          ok(
            '14 wo die Lippen aufeinanderliegen, nimmt die Seite des Zeigers die Lippe: unten gegriffen nur die Unterlippe, oben nur die Oberlippe',
            (untenI || untenJ) && obenPasst && zA.n === n && zB.n === n,
            `unter der Linie nach unten: Punkt ${iA} ging ${zA.i.toFixed(2)}, sein Gegenüber ${zA.j.toFixed(2)}; über der Linie nach oben: Punkt ${iB} ging ${zB.i.toFixed(2)}, sein Gegenüber ${zB.j.toFixed(2)}; umgeschlagen ${u14} → ${w14.umgeschlagen}; Meldung: ${w14.meldung}`,
          );
          await bild('12-lippen-getrennt');
          // 15 Überbiss: die Unterlippe ein Viertel kürzer. Jeder ihrer Punkte wandert ein Viertel seines Wegs zum Mundwinkel hin, vom
          // Mundwinkel aus der Reihe nach (so überholt kein Punkt seinen Nachbarn)
          const kV = await K();
          const V = await lippeJetzt();
          const W = V.punkte[iW];
          const reihe = untenI ? Array.from({ length: iW }, (_, k) => iW - 1 - k) : Array.from({ length: iW }, (_, k) => iW + 1 + k);
          const spitzeUnten = untenI ? 0 : n - 1;
          const u15 = (await O('werk')).umgeschlagen;
          const f = 0.25;
          let fehlZug = 0;
          for (const i of reihe) {
            const vorZug = await lippeJetzt();
            const P = vorZug.punkte[i];
            const ziel = { x: P.x + (W.x - P.x) * f, y: P.y + (W.y - P.y) * f, z: P.z };
            const von = await imBild(P);
            const nach = await imBild(ziel);
            // (der Zeiger hängt noch am zuletzt gegriffenen Punkt, wenn der dicht daneben liegt: erst weg, dann hin)
            await s.mouse.move(von.x - 160, von.y + 160);
            await s.waitForTimeout(250);
            await s.mouse.move(von.x, von.y + 3);
            await s.waitForTimeout(300);
            await s.mouse.down();
            for (let k = 1; k <= 8; k++) {
              await s.mouse.move(von.x + ((nach.x - von.x) * k) / 8, von.y + 3 + ((nach.y - von.y) * k) / 8);
              await s.waitForTimeout(40);
            }
            await s.mouse.up();
            await ruhig();
            const Ln = await lippeJetzt();
            const Pn = Ln.punkte[i];
            fehlZug = Math.max(fehlZug, Math.hypot(Pn.x - ziel.x, Pn.y - ziel.y));
            if (process.env.DIAG === '1') {
              const andere = Ln.punkte.map((q, k) => [k, d3(q, vorZug.punkte[k])]).filter((e) => e[1] > 0.01);
              console.log(`  Zug an Punkt ${i}: Ziel ${Math.hypot(ziel.x - P.x, ziel.y - P.y).toFixed(1)} weit, Rest ${Math.hypot(Pn.x - ziel.x, Pn.y - ziel.y).toFixed(2)}; bewegt: ${andere.map(([k, d]) => `${k}: ${d.toFixed(2)}`).join(', ') || 'nichts'}; im Bild von ${von.x.toFixed(0)}/${von.y.toFixed(0)} nach ${nach.x.toFixed(0)}/${nach.y.toFixed(0)}; Auswahl ${JSON.stringify((await O('werk')).auswahl ?? null)}`);
            }
          }
          const N = await lippeJetzt();
          const w15 = await O('werk');
          const k15 = await K();
          // Was das Werk als umgeschlagen zählt, liegt an der Lippe oder in der Tasche (dort stehen Wände steil gegeneinander: Die
          // Zählung misst jedes Dreieck gegen die Normalen seiner Ecken) oder außen: Außen darf nichts liegen. „An der Lippe“ heißt
          // hier: in der Seite höchstens 15 neben dem Streckenzug durch die Punkte einer Lippe.
          const um15 = (await O('umgeschlagen')).liste;
          const nebenLippe = (x, y) => {
            let best = Infinity;
            for (let k = 0; k + 1 < N.punkte.length; k++) {
              const a = N.punkte[k];
              const b = N.punkte[k + 1];
              const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1;
              const u = Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / l2));
              best = Math.min(best, Math.hypot(x - a.x - u * (b.x - a.x), y - a.y - u * (b.y - a.y)));
            }
            return best;
          };
          const aussen15 = um15.filter((t) => nebenLippe(t.mitte[0], t.mitte[1]) > 15);
          if (process.env.DIAG === '1') for (const t of um15) console.log(`  umgeschlagen: Mitte ${t.mitte.map((v) => v.toFixed(1)).join(', ')}; Fläche ${t.flaeche.toFixed(3)}; ${nebenLippe(t.mitte[0], t.mitte[1]).toFixed(1)} neben der Lippe`);
          const gingUnten = d3(N.punkte[spitzeUnten], V.punkte[spitzeUnten]);
          let gingOben = 0;
          for (let i = 0; i < n; i++) if (i !== iW && !reihe.includes(i)) gingOben = Math.max(gingOben, d3(N.punkte[i], V.punkte[i]));
          await bild('13-ueberbiss');
          if (ordner) {
            // der Überbiss im Raum mit Wachs, zu: schräg von vorn unten (die Unterseite des Oberkiefers liegt frei) und von der Seite
            await s.keyboard.press('0');
            await s.waitForTimeout(1800);
            await O('material', 'wachs');
            await O('blickSetzen', { gier: -1.45, neigung: -0.35, zoom: 4 });
            await s.waitForTimeout(1200);
            await bild('13b-ueberbiss-wachs-unten');
            await O('blickSetzen', { gier: -1.15, neigung: 0.12, zoom: 4 });
            await s.waitForTimeout(1200);
            await bild('13c-ueberbiss-wachs');
            await s.keyboard.press('1');
            await s.waitForTimeout(1800);
          }
          // geöffnet (der untere Tropfen gehalten)
          const k15b = await K();
          let offen = null;
          if (k15b.unten) {
            await s.mouse.move(k15b.unten.x, k15b.unten.y);
            await s.waitForTimeout(250);
            await s.mouse.down();
            await s.waitForTimeout(1000);
            offen = await K();
            await bild('14-ueberbiss-offen');
            await s.mouse.up();
            await s.waitForTimeout(1000);
          }
          const soll = f * Math.hypot(W.x - V.punkte[spitzeUnten].x, W.y - V.punkte[spitzeUnten].y);
          ok(
            '15 Überbiss: die Unterlippe ein Viertel kürzer, die Oberlippe bleibt, das Werk kommt zur Ruhe, nichts schlägt um; geöffnet faltet nichts',
            fehlZug < 0.5 && Math.abs(gingUnten - soll) < 0.1 * soll && gingOben < 0.01 && aussen15.length === 0 && !!k15.unten && !!kV.unten && Math.abs(k15.unten.x - kV.unten.x) > 5 && !!offen && offen.gefaltet === 0,
            `${reihe.length} Punkte der Unterlippe gezogen (größter Rest zum Ziel ${fehlZug.toFixed(2)}); ihre Spitze ging ${gingUnten.toFixed(1)} (soll ${soll.toFixed(1)}), die Oberlippe höchstens ${gingOben.toFixed(3)}; als umgeschlagen gezählt ${u15} → ${um15.length}, davon außen (weiter als 15 von der Lippe) ${aussen15.length}; Tropfen unten ${kV.unten ? kV.unten.x.toFixed(0) : '?'} → ${k15.unten ? k15.unten.x.toFixed(0) : '?'} (oben ${k15.oben ? k15.oben.x.toFixed(0) : '?'}); geöffnet ${offen ? `${offen.gefaltet} gefaltet, Dehnung ${offen.gedehnt.toFixed(2)}` : 'nicht geprüft'}; Meldung: ${w15.meldung}`,
          );
          // 16 verbinden
          await O('lippen', 'verbinden');
          await ruhig();
          const L16 = await lippeJetzt();
          let paarWeit = 0;
          if (L16 && L16.punkte.length % 2 === 1) for (let k = 0; k < (L16.punkte.length - 1) / 2; k++) paarWeit = Math.max(paarWeit, d3(L16.punkte[k], L16.punkte[L16.punkte.length - 1 - k]));
          else paarWeit = Infinity;
          const w16 = await O('werk');
          ok(
            '16 „Lippen verbinden“: die Lippen liegen wieder aufeinander, das Werk kommt zur Ruhe',
            (await O('lippen')) === false && !!L16 && L16.maulLinie !== null && paarWeit < 0.2,
            `Lippe ${L16 ? `maulLinie ${L16.maulLinie}, ${L16.punkte.length} Punkte` : 'fehlt'}; die Paare liegen höchstens ${Number.isFinite(paarWeit) ? paarWeit.toFixed(3) : 'ungepaart'} auseinander; umgeschlagen ${w16.umgeschlagen}; Meldung: ${w16.meldung}`,
          );
          await bild('15-verbunden');
          // 17 die Farben der Ebene „Maul“ sind innen geblieben (die Lippen wurden gezogen, das Netz hat mehrfach gewechselt)
          const f17 = await O('farbe');
          const m17 = f17.ebenen.find((e) => e.name === 'Maul');
          if (m17) await O('farbEbene', 'waehlen', m17.id);
          await s.waitForTimeout(300);
          const fehl17 = (await O('farbe')).fehl;
          const andere17 = f17.ebenen.find((e) => e.name !== 'Maul');
          if (andere17) await O('farbEbene', 'waehlen', andere17.id);
          const r17 = await s.evaluate(() => {
            let farbig = 0;
            let gesamt = 0;
            for (let y = 120; y <= 780; y += 10)
              for (let x = 60; x <= 1380; x += 10) {
                gesamt++;
                if (window.__ozzy.farbUnter(x, y)) farbig++;
              }
            return { farbig, gesamt };
          });
          ok(
            '17 nach dem Ziehen an den Lippen: jede Farblinie der Ebene „Maul“ hat ihren Weg, von außen trifft kein Strahl Farbe',
            !!m17 && m17.linien === 1 && m17.fuellungen === 2 && fehl17 === 0 && r17.farbig === 0,
            `Ebene ${m17 ? `${m17.linien} Linien, ${m17.fuellungen} Füllungen` : 'fehlt'}; ohne Weg ${fehl17}; ${r17.farbig} von ${r17.gesamt} Strahlen treffen Farbe; Netzwechsel der Bemalung ${f17.wechsel.zahl} (gehalten ${f17.wechsel.gehalten}, gesucht ${f17.wechsel.gesucht}, weitester ${f17.wechsel.groesst.toFixed(2)})`,
          );
        }
      }
      if (ordner) {
        // der Blick ins Maul im Raum mit Wachs (Grundform, der untere Tropfen gehalten; nur als Bild)
        await s.keyboard.press('0');
        await s.waitForTimeout(1800);
        await O('blickSetzen', { gier: -1.15, neigung: 0.12, zoom: 4 });
        await s.waitForTimeout(1200);
        const kR = await K();
        if (kR.unten) {
          await s.mouse.move(kR.unten.x, kR.unten.y);
          await s.waitForTimeout(250);
          await s.mouse.down();
          await s.waitForTimeout(1100);
          await bild('11-blick-wachs');
          await s.mouse.up();
          await s.waitForTimeout(900);
        }
        await s.keyboard.press('1');
        await s.waitForTimeout(1800);
      }
      // die Schritte der Kiefer zurücknehmen, bis nur noch das Maul bleibt
      for (let i = 0; i < 24 && (await K()).schritte > k8.schritte; i++) {
        await s.keyboard.press('Meta+z');
        await s.waitForTimeout(500);
      }
      await ruhig();
    }
  }
  // 6 ⌘Z nimmt das Maul zurück
  await s.keyboard.press('Meta+z');
  await ruhig();
  const L5 = await O('werkLinienDaten');
  ok('6 ein ⌘Z nimmt das Maul zurück', L5.length === vorher.length && !L5.some((l) => l.maulEcht), `Linien ${L5.length}`);
  await s.waitForTimeout(600);
  await bild('5-zurueck-wachs-vorn');
}
ok('7 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 4).join(' | '));
await browser.close();
console.log(schlecht ? `${schlecht} Kriterien nicht erfüllt` : 'alle Kriterien erfüllt');
process.exit(schlecht ? 1 : 0);
