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
  ok('4 an der Lippe des neuen Mauls hängt der alte Tropfen nicht', p4.tropfen === null, `Tropfen ${p4.tropfen ?? 'keiner'}`);
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
      for (let i = 0; i < 12 && (await K()).schritte > k8.schritte; i++) {
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
