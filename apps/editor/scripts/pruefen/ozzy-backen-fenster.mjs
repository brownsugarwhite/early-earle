// Ozzy, Backen fürs Spiel (Plan „Maul, Zähne, Zunge“, Etappe 9, Scheibe 1, 21.11.2026;
// `docs/plans/2026-11-21-ozzy-maul-etappe-9-backen.md`), an „teat firefish“ (NAME) auf Wachs. In der eingerasteten Seite wird das
// Maul geschnitten, die Zähne sprießen, es gibt „Fressen“ und eine zweite Pose mit anderer Lippe und weiterem Unterkiefer. Dann
// im Raum (dort zeichnen die Materialien), nah am Maul, der Schalter „Wie im Spiel“.
//   B1 Das Spielnetz hat höchstens 8 000 Dreiecke (Haut, Tasche und Zähne zusammen).
//   B2 In jeder Pose liegt jeder Punkt des Spielnetzes dort, wo Ozzy ihn zeigt (höchstens 0,01; Haut und Zähne), seine Normale
//      weicht höchstens 0,5° ab. In der Grundform schließt das Spielnetz den Haarspalt der Rechnung (0,03° am Mundwinkel): Die Haut
//      außen liegt dort höchstens 0,1 daneben, ihre Normalen höchstens 0,5°. Die Lippen selbst liegen in der Grundlage mit Absicht
//      anders (B4: Die Punkte der einen Lippe liegen auf denen der anderen); wie weit, wird berichtet.
//   B3 Nah an der Form: Neun Zehntel der Punkte der glatten Anzeige liegen höchstens 1 Einheit neben der gebackenen Haut, keiner
//      mehr als 5. In der Grundform und in „Fressen“.
//   B4 Zu keine Kante im Licht: Beide Lippen haben an denselben Stellen einen Punkt; die Lippen von außen liegen in der Grundlage
//      paarweise am selben Ort (höchstens 0,001) und tragen dort dieselbe Normale (höchstens 0,05°: die Genauigkeit der Zahlen).
//   B5 Am Faden auf der Hälfte zwischen Grundform und „Fressen“ zeigt Ozzy das Spielnetz mit den Anteilen der Reihe (0,5). Wie weit
//      die Rechnung des Spiels dort von der Fahrt des Editors abweicht, wird gemessen und berichtet (ohne Schwelle).
//   B6 Tempo: Backen dauert höchstens 0,5 s; die Ansicht selbst kostet je Bild höchstens 4 ms (ihr Schlüssel, die Rechnung des
//      Spiels, die Netze beschreiben). Eine Fahrt zwischen den Lagen backt nicht neu und zeigt in jedem Bild das Spielnetz. Wie
//      lange ein Bild der Fahrt mit und ohne Ansicht rechnet, wird berichtet (im Raum kosten Linien und Wände je Bild der Fahrt
//      schon rund 15 ms: Liste, Punkt 157).
//   B7 „Wie im Spiel“ aus: Die gezeigte Haut ist die von vorher (höchstens 0,001). Mit dem grünen Material zeichnet das Spielnetz.
//   K  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;…'] [BIS=B4] [ZOOM=5] node scripts/pruefen/ozzy-backen-fenster.mjs [ordner]
import { chromium } from '@playwright/test';
import { flickenAnlegen } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
const LINIE = (process.env.LINIE ?? '-860,172;-735,156;-700,152;-665,156;-640,165').split(';').map((t) => t.split(',').map(Number));
const BIS = process.env.BIS ?? '';
const ZOOM = Number(process.env.ZOOM ?? 5);
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const fehler = [];
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z3 = (x) => (Number.isFinite(x) ? x.toFixed(3).replace('.', ',') : '—');
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '—');

try {
  const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  s.on('pageerror', (e) => fehler.push(String(e)));
  s.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  await flickenAnlegen(s, undefined, fehler);
  await s.goto(`${basis}?form=${encodeURIComponent(NAME)}&spiel=0&facetten=0`);
  await s.waitForFunction(() => !!window.__ozzy);
  const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
  const ruhig = async (zeit = 120000) => {
    await s.waitForTimeout(300);
    await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: zeit });
    await s.waitForTimeout(200);
  };
  const klick = async (x, y) => {
    await s.mouse.move(x, y);
    await s.waitForTimeout(250);
    await s.mouse.down();
    await s.waitForTimeout(60);
    await s.mouse.up();
    await s.waitForTimeout(250);
  };
  const ziehen = async (x, y, dx, dy, pause = 30) => {
    await s.mouse.move(x - 4, y - 4);
    await s.waitForTimeout(150);
    await s.mouse.move(x, y);
    await s.waitForTimeout(300);
    await s.mouse.down();
    await s.waitForTimeout(80);
    for (let i = 1; i <= 12; i++) {
      await s.mouse.move(x + (dx * i) / 12, y + (dy * i) / 12);
      await s.waitForTimeout(pause);
    }
    await s.waitForTimeout(200);
    await s.mouse.up();
    await s.waitForTimeout(500);
  };
  const heran = async (zoom) => {
    let b = await O('blickSetzen', { zoom });
    await s.waitForTimeout(700);
    for (let i = 0; i < 4; i++) {
      const q = await O('werkImBild', { x: -720, y: 150, z: 0 });
      b = await O('blickSetzen', { schwenkX: b.schwenkX + (640 - q.x), schwenkY: b.schwenkY + (450 - q.y) });
      await s.waitForTimeout(500);
    }
  };
  const lage = async (k) => {
    await s.click(k === 0 ? '#pose-grundform' : `#posen button.pose[data-nr="${k}"]`);
    await s.waitForTimeout(1300);
    await ruhig();
  };
  const imBild = async (id, n) => {
    const aus = [];
    for (let i = 0; i < n; i++) {
      const A = (await O('ankerImBild', id, i, 'seite')).filter((q) => !q.m);
      if (A[0]) aus.push({ i, x: A[0].x, y: A[0].y });
    }
    return aus;
  };
  const bild = async (name) => {
    if (ordner) await s.screenshot({ path: `${ordner}/ozzy-backen-${name}.png` });
  };
  const abwaehlen = async () => {
    const b = await O('bearbeiten');
    if (!(b.auswahl?.length || b.werkAuswahl?.length)) return;
    await s.keyboard.press('Escape');
    await s.waitForTimeout(300);
  };
  const mitte = (sel) =>
    s.evaluate((q) => {
      const r = document.querySelector(q)?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, w: r.width } : null;
    }, sel);
  /** warten, bis Ozzy das Spielnetz zeigt (es backt, sobald die Form eine Weile steht) */
  const gebacken = async () => {
    try {
      await s.waitForFunction(() => window.__ozzy.spiel().zeigt, null, { timeout: 20000 });
    } catch {
      throw new Error(`das Spielnetz wird nicht gezeigt: ${JSON.stringify(await O('spiel')).slice(0, 400)} · Pose ${JSON.stringify(await O('pose')).slice(0, 200)}`);
    }
    await s.waitForTimeout(250);
    return O('spiel');
  };

  await ruhig();
  await O('material', 'wachs');
  await s.keyboard.press('1');
  await s.waitForTimeout(1500);
  await ruhig();
  await s.keyboard.press('p');
  await s.waitForTimeout(300);
  for (const [x, y] of LINIE) {
    const q = await O('werkImBild', { x, y, z: 0 });
    await klick(q.x, q.y);
  }
  await s.keyboard.press('Enter');
  await s.waitForTimeout(500);
  await s.click('#maul-tropfen');
  await s.waitForFunction(() => !window.__ozzy.maulStrich(), null, { timeout: 60000 }).catch(() => {});
  await ruhig();
  await s.waitForTimeout(2500);
  await ruhig();
  await s.keyboard.press('a');
  await s.waitForTimeout(300);
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);
  await s.keyboard.press('1');
  await s.waitForTimeout(1500);
  await ruhig();
  await heran(ZOOM);
  await O('zaehne', 'anfang');
  await s.waitForTimeout(2200);
  await ruhig();
  // „Fressen“, dann eine zweite Pose mit anderer Lippe und weiterem Unterkiefer
  await lage(1);
  await s.click('#pose-plus');
  await s.waitForTimeout(900);
  await ruhig();
  {
    const L = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    const n = L.punkte.length;
    const P = await imBild(L.id, n);
    const innen = P.filter((p) => p.i !== 0 && p.i !== n - 1 && p.i !== (n - 1) / 2);
    const paar = (p) => P.find((q) => q.i === n - 1 - p.i);
    const unten = innen.filter((p) => paar(p) && p.y > paar(p).y + 3).sort((a, b) => a.x - b.x);
    const u = unten[Math.floor(unten.length / 2)];
    await ziehen(u.x, u.y, 0, 24);
    await ruhig();
    await abwaehlen();
    await s.evaluate(() => {
      const r = document.getElementById('fressen-maul');
      r.dispatchEvent(new PointerEvent('pointerdown'));
      r.value = '50';
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await s.waitForTimeout(600);
    await ruhig();
  }
  await lage(0);
  // in den Raum, schräg von vorn auf das Maul
  await s.keyboard.press('0');
  await s.waitForTimeout(1600);
  await O('blickSetzen', { gier: -0.9, neigung: 0.12, zoom: ZOOM });
  await s.waitForTimeout(900);
  await heran(ZOOM);
  await s.waitForTimeout(1500);
  const vorher = await O('hautStand', true);
  const probenVorher = [];
  for (let i = 0; i + 2 < vorher.proben.length; i += 3) probenVorher.push([vorher.proben[i], vorher.proben[i + 1], vorher.proben[i + 2]]);
  const f0 = (await O('werk')).f;
  await bild('0-grundform-glatt');

  // ---------- der Schalter; B1, B6 ----------
  await O('spiel', true);
  const g = await gebacken();
  await bild('1-grundform-spiel');
  ok('B1 das Spielnetz hat höchstens 8 000 Dreiecke', !!g.gebacken && g.gebacken.dreiecke <= 8000 && g.gebacken.dreiecke > 2000 && g.gebacken.posen.join('|') === 'Fressen|Pose 2', `${g.gebacken?.dreiecke} Dreiecke (Haut ${g.gebacken?.dreieckeHaut}, Zähne ${g.gebacken?.dreieckeZaehne}) statt ${g.gebacken?.dreieckeVorher}; ${g.gebacken?.punkte} Punkte; Posen ${g.gebacken?.posen.join(', ')}${g.gebacken?.ohneZaehne ? `; OHNE ZÄHNE: ${g.gebacken.ohneZaehne}` : ''}; Statuszeile „${String(g.meldung).slice(0, 90)}“`);

  // ---------- Grundform: B2 (mit Haarspalt), B3, B4 ----------
  const pG = await O('spielPruefen', true);
  // ---------- „Fressen“ und Pose 2: B2, B3 ----------
  await lage(1);
  await gebacken();
  const pF = await O('spielPruefen', true);
  await bild('2-fressen-spiel');
  await lage(2);
  await gebacken();
  const pP = await O('spielPruefen', true);
  await bild('3-pose-2-spiel');
  ok(
    'B2 in jeder Pose liegt jeder Punkt des Spielnetzes dort, wo Ozzy ihn zeigt, mit derselben Normale; in der Grundform schließt es nur den Haarspalt',
    !!pG && !!pF && !!pP && pF.gleich.haut <= 0.01 && pF.gleich.zaehne >= 0 && pF.gleich.zaehne <= 0.01 && pF.gleich.grad <= 0.5 && pP.gleich.haut <= 0.01 && pP.gleich.zaehne <= 0.01 && pP.gleich.grad <= 0.5 && pG.gleich.hautAussen <= 0.1 && pG.gleich.zaehne <= 0.1 && pG.gleich.gradAussen <= 0.5,
    `„Fressen“: Haut ${z3(pF?.gleich.haut)}, Zähne ${z3(pF?.gleich.zaehne)}, Normalen ${z2(pF?.gleich.grad)}°; Pose 2: Haut ${z3(pP?.gleich.haut)}, Zähne ${z3(pP?.gleich.zaehne)}, Normalen ${z2(pP?.gleich.grad)}°; Grundform: Haut außen ${z3(pG?.gleich.hautAussen)}, Zähne ${z3(pG?.gleich.zaehne)}, Normalen der Haut außen ${z2(pG?.gleich.gradAussen)}°; mit Absicht anders: die Lippen bis ${z2(pG?.gleich.haut)} längs der Lippe verschoben, ihre Normalen bis ${z2(pG?.gleich.grad)}°, in der Tasche bis ${z2(pG?.gleich.gradOhne)}°`,
  );
  ok(
    'B3 nah an der Form: neun Zehntel der Punkte der glatten Anzeige höchstens 1 neben der gebackenen Haut, keiner mehr als 5',
    !!pG?.nah && !!pF?.nah && pG.nah.aussen.neunZehntel <= 1 && pG.nah.aussen.max <= 5 && pF.nah.aussen.neunZehntel <= 1 && pF.nah.aussen.max <= 5,
    `Grundform außen: ${pG?.nah?.aussen.punkte} Punkte, neun Zehntel bis ${z2(pG?.nah?.aussen.neunZehntel)}, im Mittel ${z2(pG?.nah?.aussen.mittel)}, höchstens ${z2(pG?.nah?.aussen.max)}; „Fressen“ außen: neun Zehntel bis ${z2(pF?.nah?.aussen.neunZehntel)}, im Mittel ${z2(pF?.nah?.aussen.mittel)}, höchstens ${z2(pF?.nah?.aussen.max)} bei (${(pF?.nah?.aussen.wo ?? []).map((x) => x.toFixed(0)).join(', ')}); Pose 2 außen: höchstens ${z2(pP?.nah?.aussen.max)} bei (${(pP?.nah?.aussen.wo ?? []).map((x) => x.toFixed(0)).join(', ')}); in der Tasche des Mauls: ${pF?.nah?.tasche?.punkte ?? 0} Punkte, neun Zehntel bis ${z2(pF?.nah?.tasche?.neunZehntel)}, höchstens ${z2(pF?.nah?.tasche?.max)} bei (${(pF?.nah?.tasche?.wo ?? []).map((x) => x.toFixed(0)).join(', ')}); Hälften der Haut ${pG?.seiten.vorn} und ${pG?.seiten.hinten} Dreiecke`,
  );
  ok(
    'B4 zu keine Kante im Licht: die Lippen von außen liegen in der Grundlage paarweise am selben Ort und tragen dort dieselbe Normale',
    !!pG && pG.lippe.paare >= 4 && 2 * pG.lippe.paare >= pG.lippe.aussen - 4 && pG.lippe.lageWeit <= 0.001 && pG.lippe.normaleGrad <= 0.05 && g.gebacken.lippe.punkte >= 8 && !g.gebacken.lippe.ungleich,
    `${pG?.lippe.aussen} Punkte der Lippen von außen, ${pG?.lippe.paare} Paare am selben Ort (höchstens ${pG?.lippe.lageWeit.toExponential(1)} auseinander), Normalen dort höchstens ${z3(pG?.lippe.normaleGrad)}° verschieden; beide Lippen stehen an ${g.gebacken?.lippe.paare} Stellen, ${g.gebacken?.lippe.eingesetzt} davon eingesetzt; vor dem Zusammenlegen lag ein Paar höchstens ${z3(g.gebacken?.lippe.weit)} auseinander; Normalen angeglichen an ${g.gebacken?.lippe.punkte} Punkten um höchstens ${z2(g.gebacken?.lippe.grad)}°${g.gebacken?.lippe.ungleich ? `; NICHT GLEICH GETEILT: ${g.gebacken.lippe.ungleich}` : ''}`,
  );
  if (BIS === 'B4') throw new Error('BIS');

  // ---------- B5: am Faden zwischen Grundform und „Fressen“ ----------
  await lage(1);
  await gebacken();
  const faden = await mitte('#posen .posen-faden[data-nr="1"]');
  await s.mouse.move(faden.l + 0.94 * faden.w, faden.y);
  await s.waitForTimeout(150);
  await s.mouse.down();
  for (let i = 1; i <= 14; i++) {
    await s.mouse.move(faden.l + (0.94 - (0.44 * i) / 14) * faden.w, faden.y);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(600);
  const halb = await O('spiel');
  const pH = await O('spielPruefen', false);
  const poseHalb = await O('pose');
  await bild('4-halb-spiel');
  await s.mouse.move(faden.l + 0.96 * faden.w, faden.y);
  await s.waitForTimeout(200);
  await s.mouse.up();
  await s.waitForTimeout(1100);
  await ruhig();
  const anteilHalb = Number(String(halb.gebacken?.anteile ?? '').split(',')[0]);
  ok(
    'B5 am Faden auf der Hälfte zwischen Grundform und „Fressen“ zeigt Ozzy das Spielnetz mit den Anteilen der Reihe',
    halb.zeigt && Math.abs(anteilHalb - 0.5) <= 0.03 && Math.abs(poseHalb.anteil - anteilHalb) < 1e-6 && !!pH,
    `Anteile ${halb.gebacken?.anteile} (die Reihe: ${z3(poseHalb.anteil)}); die Rechnung des Spiels liegt dort höchstens ${z2(pH?.gleich.haut)} neben der Fahrt des Editors (Haut), ${z2(pH?.gleich.zaehne)} an den Zähnen, Normalen bis ${z2(pH?.gleich.grad)}°`,
  );

  // ---------- B6: Tempo; eine Fahrt backt nicht neu ----------
  /** vier Fahrten (Grundform, „Fressen“, Pose 2, „Fressen“): die Bilder unterwegs */
  const vierFahrten = async () => {
    await O('messen', true);
    await s.click('#pose-grundform');
    await s.waitForTimeout(800);
    await s.click('#fressen-knopf');
    await s.waitForTimeout(800);
    await s.click('#posen button.pose[data-nr="2"]');
    await s.waitForTimeout(800);
    await s.click('#fressen-knopf');
    await s.waitForTimeout(800);
    const b = (await O('messen', false)).filter((q) => q.teile[1] > 1);
    const ms = b.map((q) => q.ms).sort((x, y) => x - y);
    return { b, ms, mittel: ms.reduce((x, y) => x + y, 0) / Math.max(1, ms.length) };
  };
  await s.waitForTimeout(1500);
  const mal0 = (await O('spiel')).mal;
  await s.evaluate(() => {
    window.__spur = [];
    window.__spurEnde = false;
    const f = () => {
      window.__spur.push(window.__ozzy.spiel().zeigt ? 1 : 0);
      if (window.__spur.length < 400 && !window.__spurEnde) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await O('spiel', null, true);
  const mit6 = await vierFahrten();
  const kosten6 = (await O('spiel')).kosten;
  const spur6 = await s.evaluate(() => {
    window.__spurEnde = true;
    return window.__spur;
  });
  await ruhig();
  const g6 = await O('spiel');
  const ohne6 = spur6.filter((x) => x === 0).length;
  // dieselben Fahrten ohne die Ansicht
  await O('spiel', false);
  await s.waitForTimeout(800);
  const ohneAnsicht = await vierFahrten();
  await ruhig();
  await O('spiel', true);
  await gebacken();
  const teile = (b) => ['Werk', 'Haut', 'Linien', 'Seifenhaut', 'Zeichnen', 'Wände'].map((nm, k) => `${nm} ${(b.reduce((x, q) => x + q.teile[k], 0) / Math.max(1, b.length)).toFixed(1)}`).join(', ');
  ok(
    'B6 Tempo: Backen dauert höchstens 0,5 s; die Ansicht selbst kostet je Bild höchstens 4 ms; eine Fahrt backt nicht neu und zeigt immer das Spielnetz',
    g.gebacken.ms <= 500 && kosten6 > 0 && kosten6 <= 4 && g6.mal === mal0 && ohne6 === 0 && spur6.length > 60 && mit6.ms.length > 10 && ohneAnsicht.ms.length > 10,
    `gebacken in ${Math.round(g.gebacken.ms)} ms; die Ansicht selbst im teuersten Bild der Fahrten ${z2(kosten6)} ms; vier Fahrten mit der Ansicht (Grundform, „Fressen“, Pose 2, „Fressen“): neu gebacken ${g6.mal - mal0}-mal, ${spur6.length} Bilder, davon ${ohne6} ohne Spielnetz; unterwegs mit der Ansicht ${mit6.ms.length} Bilder im Mittel ${mit6.mittel.toFixed(1)} ms (das langsamste ${(mit6.ms[mit6.ms.length - 1] ?? 0).toFixed(1)}), ohne ${ohneAnsicht.ms.length} Bilder im Mittel ${ohneAnsicht.mittel.toFixed(1)} ms (${(ohneAnsicht.ms[ohneAnsicht.ms.length - 1] ?? 0).toFixed(1)}); je Bild mit: ${teile(mit6.b)}; ohne: ${teile(ohneAnsicht.b)}`,
  );
  if (BIS === 'B6') throw new Error('BIS');

  // ---------- B7: aus ist wie vorher; das grüne Material ----------
  await O('material', 'grün');
  await s.waitForTimeout(4000);
  const gruen = await O('gruen');
  const gG = await O('spiel');
  await bild('5-fressen-spiel-gruen');
  await O('material', 'wachs');
  await s.waitForTimeout(800);
  await O('dreiecke', true);
  await s.waitForTimeout(800);
  await bild('6-fressen-spiel-dreiecke');
  await O('dreiecke', false);
  await O('spiel', false);
  await s.waitForTimeout(600);
  await bild('7-fressen-glatt');
  await lage(0);
  await s.waitForTimeout(1500);
  const aus = await O('spiel');
  const d7 = (await O('hautAbstand', probenVorher)).map((x) => x * f0);
  const max7 = Math.max(0, ...d7);
  ok(
    'B7 „Wie im Spiel“ aus: die gezeigte Haut ist die von vorher; mit dem grünen Material zeichnet das Spielnetz',
    !aus.an && !aus.zeigt && max7 <= 0.001 && gruen.geladen && gruen.sichtbar && gG.zeigt,
    `aus: Haut höchstens ${max7.toExponential(1)} neben vorher; grün: ${gruen.geladen ? 'geladen' : 'NICHT geladen'}, ${gruen.sichtbar ? 'zu sehen' : 'NICHT zu sehen'}, ${gruen.unterbau ?? ''}, ${gruen.bilder ?? 0} Bilder, das Spielnetz ${gG.zeigt ? 'gezeigt' : 'NICHT gezeigt'}`,
  );
} catch (e) {
  if (String(e?.message) !== 'BIS') {
    schlecht++;
    console.log('FEHL Abbruch:', String(e?.stack ?? e).slice(0, 700));
  }
}
ok('K keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
await browser.close();
console.log(schlecht ? `\n${schlecht} Kriterien nicht erfüllt` : '\nalle Kriterien erfüllt');
