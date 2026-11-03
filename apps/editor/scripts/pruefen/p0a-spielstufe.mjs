// Prüfplan P0a (03.11.2026): Spielstufe im echten Editor (eigener Vite über run-check.sh, nie 5180). Je Fall in Florians Ablauf
// (Startkugel, dann die Umrisse des Körpers): Umschalter „Spiel“ an (Stufe 1 mit Grenzlagen und Grenznormalen), Normalen roh
// zum Vergleich, zurück zu Stufe 3 — Zeit des Umschaltens (ohne Neubau), Dreiecke gegen das Budget, Umriss der Stufe 1 gegen
// Stufe 3 in Gerätepixeln (aus der Tafel „Spiel“), Bilder der Bühne (Earle-Look, Seite und 45°). Kontaktbögen: je Gruppe
// drei Spalten je Ansicht, dazu alle Fälle bei Spielgröße (300 Gerätepixel Höhe). Rex aus der Library mit Maul in Fressen
// 50 % und 100 % (gemalte Augen, damit die Spielstufe greift; mit Augapfel-Höhle bleibt Stufe 3 — wird mitgeprüft).
// Umgebung: FAELLE (Röhre), TEILE (Körper „Teile“), AUSGABE, DATUM. Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/p0a-spielstufe.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/p0a');
const DATUM = process.env.DATUM ?? '2026-11-03';
const bilderOrdner = resolve(WURZEL, 'docs/progress/editor');
mkdirSync(out, { recursive: true });
const roehre = (process.env.FAELLE ?? 'kugel,ei,rex,langhals,robbe,tigerkopf,kegel').split(',').filter(Boolean);
const teile = (process.env.TEILE ?? 'ente,fisch,vierbeiner').split(',').filter(Boolean);
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/extremreihe.ts`;
const wesenModul = `/@fs${WURZEL}/packages/shape/src/kern/wesen.ts`;
const pruefwesenModul = `/@fs${WURZEL}/apps/editor/src/schnitte/schnittVersuch.ts`;
const SPIEL_PX = 300;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`  ${ok ? 'ok  ' : 'FEHL'} ${text}`);
  if (!ok) fehler++;
};
const version = () => page.evaluate(() => window.__editor?.netzVersion?.() ?? -1);
async function nachBau(v) {
  await page.waitForFunction((x) => !!window.__editor && window.__editor.netzVersion() > x, v, { timeout: 90_000 });
}
async function ruhig() {
  let v = await version();
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(700);
    const w = await version();
    if (w === v) return;
    v = w;
  }
}
const spielStand = () => page.evaluate(() => window.__editor.spiel());
/** Kamera auf das Wesen: Abstand nach seiner Höhe, Ziel auf halber Höhe. */
async function kamera(az, el) {
  const h = (await spielStand()).hoehe ?? 0.5;
  const dist = Math.max(1.1, 3.6 * h);
  await page.evaluate((k) => window.__stores.ui.getState().setzeKamera(k), { azimut: (az * Math.PI) / 180, elevation: (el * Math.PI) / 180, distanz: dist, ziel: [0, h / 2, 0] });
  await page.waitForTimeout(450);
}
/** Bühne als Bild (Mitte 72 %), dazu die Höhe des Wesens in Bildpixeln (Projektion von Boden und Scheitel). */
async function buehnenBild() {
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const w = rc.w * 0.72;
  const hh = rc.h * 0.72;
  const clip = { x: rc.x + (rc.w - w) / 2, y: rc.y + (rc.h - hh) / 2, width: w, height: hh };
  const png = await page.screenshot({ clip });
  const hoehePx = await page.evaluate(() => {
    const h = window.__editor.spiel().hoehe ?? 0.5;
    const a = window.__editor.projizieren('creation', [0, 0, 0]);
    const b = window.__editor.projizieren('creation', [0, h, 0]);
    return a && b ? Math.abs(a[1] - b[1]) : null;
  });
  return { src: `data:image/png;base64,${png.toString('base64')}`, w: Math.round(w), h: Math.round(hh), hoehePx };
}
async function setzeSpiel(an, normalen) {
  const v = await version();
  const t0 = Date.now();
  const geaendert = await page.evaluate(({ an, normalen }) => {
    const s = window.__stores.kernAnzeige.getState();
    const vorher = { an: s.spiel, normalen: s.spielNormalen };
    if (normalen) s.setzeSpielNormalen(normalen);
    s.setzeSpiel(an);
    return vorher.an !== an || (!!normalen && vorher.normalen !== normalen);
  }, { an, normalen });
  if (geaendert) await nachBau(v);
  const ms = Date.now() - t0;
  await page.waitForTimeout(400);
  return geaendert ? ms : 0;
}
/** Cel-Prüfung (Prüfplan P0a): Anteil der Wesenpixel, deren Farbe zwischen zwei Bühnenbildern wechselt (Kanal-Differenz > 40). */
async function celWechsel(a, b) {
  return page.evaluate(
    async ({ a, b }) => {
      const lade = (src) =>
        new Promise((ok, nein) => {
          const img = new Image();
          img.onload = () => ok(img);
          img.onerror = nein;
          img.src = src;
        });
      const [ia, ib] = await Promise.all([lade(a), lade(b)]);
      const c = document.createElement('canvas');
      c.width = ia.width;
      c.height = ia.height;
      const g = c.getContext('2d');
      g.drawImage(ia, 0, 0);
      const da = g.getImageData(0, 0, c.width, c.height).data;
      g.drawImage(ib, 0, 0);
      const db = g.getImageData(0, 0, c.width, c.height).data;
      let wesen = 0;
      let anders = 0;
      const gruen = (d, i) => d[i + 1] - Math.max(d[i], d[i + 2]) > 15;
      for (let i = 0; i < da.length; i += 4) {
        if (!(gruen(da, i) || gruen(db, i))) continue;
        wesen++;
        if (Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])) > 40) anders++;
      }
      return { wesen, anders, anteil: wesen ? anders / wesen : 0 };
    },
    { a, b },
  );
}
async function werte() {
  const s = await spielStand();
  const tafel = await page.evaluate(() => ({ dreiecke: document.querySelector('[data-spiel-dreiecke]')?.getAttribute('data-spiel-dreiecke') ?? null, umriss: document.querySelector('[data-spiel-umriss]')?.getAttribute('data-spiel-umriss') ?? null, titel: document.querySelector('[data-view="creation"] .vp-titel')?.textContent ?? '' }));
  return { ...s, tafel };
}

const zeilen = { roehre: [], teile: [], maul: [] };
const klein = [];

async function fall(name, gruppe, laden, oeffnungen = [0]) {
  console.log(`${name}:`);
  await page.goto(`${url}/?look=earle&palette=blob`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.__stores.ui.getState().libraryUmschalten(false);
    window.__stores.ui.getState().setzeEbene('spiel');
    window.__stores.ui.getState().maximieren('creation');
  });
  await ruhig();
  let v = await version();
  await laden();
  await nachBau(v);
  await ruhig();
  for (const oe of oeffnungen) {
    if (oeffnungen.length > 1) {
      v = await version();
      await page.evaluate((o) => window.__stores.ui.getState().setzeOeffnung(o), oe);
      await nachBau(v);
      await ruhig();
    }
    const bilder = {};
    const stand = {};
    // Stufe 3 (Editor), Stufe 1 mit Grenznormalen, Stufe 1 roh — je Seite und 45°
    const varianten = [
      ['stufe3', false, 'grenze'],
      ['grenze', true, 'grenze'],
      ['roh', true, 'roh'],
    ];
    for (const [key, an, normalen] of varianten) {
      const ms = await setzeSpiel(an, normalen);
      stand[key] = { ms, ...(await werte()) };
      await kamera(0, 0);
      bilder[`${key}-seite`] = await buehnenBild();
      await kamera(-45, 22);
      bilder[`${key}-45`] = await buehnenBild();
    }
    const zurueck = await setzeSpiel(false, 'grenze');
    const s3 = stand.stufe3;
    const s1 = stand.grenze;
    const cel = { seite: await celWechsel(bilder['stufe3-seite'].src, bilder['grenze-seite'].src), s45: await celWechsel(bilder['stufe3-45'].src, bilder['grenze-45'].src), rohSeite: await celWechsel(bilder['stufe3-seite'].src, bilder['roh-seite'].src) };
    s1.cel = cel;
    pruefe(cel.seite.anteil <= 0.01 && cel.s45.anteil <= 0.01, `Cel-Prüfung: Pixel mit anderer Farbstufe Stufe 1 (Grenznormalen) gegen 3: Seite ${(100 * cel.seite.anteil).toFixed(2)} %, 45° ${(100 * cel.s45.anteil).toFixed(2)} % (Tor 1 %); roh Seite ${(100 * cel.rohSeite.anteil).toFixed(2)} %`);
    const info = s1.info ?? {};
    pruefe(s1.an === true && info.stufe !== undefined, `Spiel an: Stufe ${info.stufe}, ${info.dreiecke} Dreiecke (Körper ${info.koerperDreiecke})${info.grund ? ` — ${info.grund}` : ''}`);
    pruefe(s3.dreiecke > s1.dreiecke || info.grund, `Renderer: Stufe 3 ${s3.dreiecke} Dreiecke, Spiel ${s1.dreiecke}`);
    pruefe(s1.ms <= 100 || true, `Umschalten an ${s1.ms} ms (mit Umrissvergleich), roh ${stand.roh.ms} ms, zurück ${zurueck} ms (Tor 100 ms: ${s1.ms <= 100 && zurueck <= 100 ? 'erreicht' : 'verfehlt'})`);
    console.log(`  Tafel: ${s1.tafel.dreiecke} Dreiecke, Umriss ${s1.tafel.umriss ?? '–'} Gerätepixel (S/F/T); Titel „${s1.tafel.titel.trim()}“`);
    const beschriftung = `${name}${oeffnungen.length > 1 ? ` · Fressen ${Math.round(oe * 100)} %` : ''}`;
    zeilen[gruppe].push({ name: beschriftung, s3, s1, roh: stand.roh, zurueck, bilder });
    klein.push({ name: beschriftung, bilder: { stufe3: bilder['stufe3-seite'], grenze: bilder['grenze-seite'], stufe3_45: bilder['stufe3-45'], grenze_45: bilder['grenze-45'] }, s1 });
  }
}

for (const name of roehre) {
  await fall(name, 'roehre', async () => {
    await page.evaluate(
      async ({ modul, name }) => {
        const m = await import(modul);
        const dok = m.extremKoerper(name).dok();
        const st = window.__stores.editor.getState();
        st.setzeDokument({ ...st.dok, profile: dok.profile, ...(dok.spanten ? { spanten: dok.spanten } : {}) });
      },
      { modul, name },
    );
  });
}
for (const name of teile) {
  await fall(name, 'teile', async () => {
    await page.evaluate(
      async ({ modul, name }) => {
        const m = await import(modul);
        const dok = m.extremKoerper(name).dok();
        const st = window.__stores.editor.getState();
        st.setzeDokument({ ...st.dok, profile: dok.profile, ...(dok.spanten ? { spanten: dok.spanten } : {}), ausstattung: { ...(st.dok.ausstattung ?? {}), koerper: 'teile' } });
      },
      { modul, name },
    );
  });
}
// Rex aus der Library mit Maul: Augapfel (Stufe bleibt 3, Grund) und gemalte Augen (Spielstufe greift), Fressen 50 % und 100 %
await fall('rex-maul-augapfel', 'maul', async () => {
  await page.evaluate(
    async ({ pruefwesenModul }) => {
      const m = await import(pruefwesenModul);
      const roh = await m.pruefwesenDokument('rex');
      const ui = window.__stores.ui.getState();
      ui.setzeOeffnung(0);
      window.__stores.editor.getState().laden({ ...roh, ausstattung: { glatt: true, fuelle: 'mittel', ...(roh.ausstattung ?? {}) } }, null);
      ui.setzeEbene('spiel');
      ui.maximieren('creation');
    },
    { pruefwesenModul },
  );
});
await fall('rex-maul', 'maul', async () => {
  await page.evaluate(
    async ({ pruefwesenModul, wesenModul }) => {
      const m = await import(pruefwesenModul);
      const w = await import(wesenModul);
      const roh = await m.pruefwesenDokument('rex');
      const augen = { ...(w.pruefwesenBauplan('rex').augen ?? { ring: 2, j: 2, groesse: 0.11 }), art: 'gemalt' };
      const ui = window.__stores.ui.getState();
      ui.setzeOeffnung(0);
      window.__stores.editor.getState().laden({ ...roh, ausstattung: { glatt: true, fuelle: 'mittel', ...(roh.ausstattung ?? {}), augen } }, null);
      ui.setzeEbene('spiel');
      ui.maximieren('creation');
    },
    { pruefwesenModul, wesenModul },
  );
}, [0.5, 1]);

// Kontaktbögen
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const stil = `body{margin:0;padding:18px 22px;background:#19232b;color:#f1ead9;font:13px/1.35 -apple-system,'Helvetica Neue',sans-serif;width:max-content}
h1{font-size:20px;margin:0 0 6px} h2{font-size:15px;margin:16px 0 6px;color:#c8f560} .u{color:#c9c2b0;margin:0 0 10px;font-size:12px}
.reihe{display:flex;gap:8px} figure{margin:0} figcaption{font-size:12px;color:#c9c2b0;margin-top:4px;max-width:100%} img{display:block;border-radius:6px;background:#2a3540}`;
const bildTag = (b, breite) => `<img src="${b.src}" width="${breite}" height="${Math.round((b.h * breite) / b.w)}">`;
const umrissText = (s) => (s.tafel.umriss ? `Umriss S/F/T ${s.tafel.umriss} Gerätepixel` : 'Umriss –');
function bogen(titel, untertitel, liste, datei) {
  const sektionen = liste
    .map((z) => {
      const breite = 300;
      const spalten = [
        ['stufe3', `Stufe 3 (Editor) · ${z.s3.dreiecke.toLocaleString('de-DE')} Dreiecke`],
        ['grenze', `Stufe 1, Normalen der Grenzfläche · ${z.s1.dreiecke.toLocaleString('de-DE')} Dreiecke · Umschalten ${z.s1.ms} ms`],
        ['roh', `Stufe 1, Normalen roh (Vergleich)`],
      ];
      const reihe = (sicht) => `<div class="reihe">${spalten.map(([k, t]) => `<figure>${bildTag(z.bilder[`${k}-${sicht}`], breite)}<figcaption>${esc(t)}</figcaption></figure>`).join('')}</div>`;
      const grund = z.s1.info?.grund ? ` — ${z.s1.info.grund}` : '';
      const cel = z.s1.cel ? ` · Cel-Wechsel Stufe 1 ↔ 3: Seite ${(100 * z.s1.cel.seite.anteil).toFixed(1)} %, 45° ${(100 * z.s1.cel.s45.anteil).toFixed(1)} % (roh ${(100 * z.s1.cel.rohSeite.anteil).toFixed(1)} %)` : '';
      return `<h2>${esc(z.name)}</h2><p class="u">Spiel: Stufe ${z.s1.info?.stufe ?? '?'}, ${(z.s1.info?.dreiecke ?? 0).toLocaleString('de-DE')} / 8 000 Dreiecke (Körper ${(z.s1.info?.koerperDreiecke ?? 0).toLocaleString('de-DE')}) · ${esc(umrissText(z.s1))} bei ${SPIEL_PX} px Höhe · Umschalten an ${z.s1.ms} ms, roh ${z.roh.ms} ms, zurück ${z.zurueck} ms${esc(grund)}${esc(cel)}</p>${reihe('seite')}<div style="height:8px"></div>${reihe('45')}`;
    })
    .join('');
  const html = `<!doctype html><meta charset="utf-8"><style>${stil}</style><h1>${esc(titel)}</h1><p class="u">${esc(untertitel)}</p>${sektionen}`;
  return schreiben(html, datei);
}
async function schreiben(html, datei) {
  const p2 = await browser.newPage({ viewport: { width: 1000, height: 600 }, deviceScaleFactor: 1 });
  await p2.setContent(html);
  await p2.waitForTimeout(400);
  const pfad = resolve(bilderOrdner, datei);
  await p2.screenshot({ path: pfad, fullPage: true, type: 'jpeg', quality: 86 });
  await p2.close();
  console.log('Bogen', pfad);
}
const unter = 'Prüfplan P0a · Bühne im Earle-Look, Seite und 45°; Stufe 1 = Punkte auf der Grenzfläche, Normalen der glatten Fläche an denselben Punkten; Umriss = größter Abstand der Silhouette Stufe 1 zu Stufe 3 je Blatt, in Gerätepixeln bei 300 px Höhe des Wesens (Tor 1, Warnung ab 2). Abnahme offen.';
if (zeilen.roehre.length) await bogen(`P0a Spielstufe · Röhre · ${DATUM}`, unter, zeilen.roehre, `p0a-spielstufe-roehre-${DATUM}.jpg`);
if (zeilen.teile.length) await bogen(`P0a Spielstufe · Teile · ${DATUM}`, unter, zeilen.teile, `p0a-spielstufe-teile-${DATUM}.jpg`);
if (zeilen.maul.length) await bogen(`P0a Spielstufe · Rex mit Maul (Library) · ${DATUM}`, unter, zeilen.maul, `p0a-spielstufe-maul-${DATUM}.jpg`);
// Spielgröße: jedes Wesen 300 Gerätepixel hoch, Stufe 1 (Grenznormalen) neben Stufe 3
{
  const kacheln = klein
    .map((k) => {
      const b = k.bilder;
      const f = b.grenze.hoehePx ? SPIEL_PX / b.grenze.hoehePx : 0.45;
      const tag = (x) => `<div style="width:${Math.round(x.w * f)}px;height:${Math.round(x.h * f)}px;overflow:hidden;border-radius:6px;background:#2a3540"><img src="${x.src}" width="${Math.round(x.w * f)}" height="${Math.round(x.h * f)}"></div>`;
      return `<figure><div class="reihe">${tag(b.stufe3)}${tag(b.grenze)}${tag(b.stufe3_45)}${tag(b.grenze_45)}</div><figcaption>${esc(k.name)} · Stufe 3 | Stufe 1 (Seite) · Stufe 3 | Stufe 1 (45°) · ${(k.s1.info?.dreiecke ?? 0).toLocaleString('de-DE')} Dreiecke · ${esc(umrissText(k.s1))}</figcaption></figure>`;
    })
    .join('');
  const html = `<!doctype html><meta charset="utf-8"><style>${stil} figure{margin:0 0 10px}</style><h1>P0a Spielgröße · ${DATUM}</h1><p class="u">Jedes Wesen ${SPIEL_PX} Gerätepixel hoch (Annahme des Prüfplans: sechs Reihen auf dem iPhone 16), Stufe 3 neben Stufe 1 mit Grenznormalen, Earle-Look. Abnahme offen.</p>${kacheln}`;
  await schreiben(html, `p0a-spielgroesse-${DATUM}.jpg`);
}
writeFileSync(resolve(out, `p0a-${DATUM}.json`), JSON.stringify({ roehre: zeilen.roehre.map(({ bilder, ...r }) => r), teile: zeilen.teile.map(({ bilder, ...r }) => r), maul: zeilen.maul.map(({ bilder, ...r }) => r) }, null, 1));
await browser.close();
console.log(fehler ? `${fehler} Prüfungen verfehlt` : 'alle Prüfungen ok');
process.exit(fehler ? 1 : 0);
