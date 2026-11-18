// Prüfplan P1 Tag 2–3, zweiter Anlauf (03.11.2026): der Käfig aus den Schleifen im echten Editor (eigener Vite über run-check.sh).
// Je Fall in Florians Ablauf (Startkugel → Umrisse des Körpers, Röhre): Chip „Körper heute“ → Blätter mit Δ-Titel, Bühne Earle 45°
// und Zebra (Matcap) 45°; Chip „Schleifen-Käfig (P1)“ → dasselbe, dazu die Zahlen der Tafel (Rest, Innen, Bau). Kontaktbogen
// `docs/progress/editor/p1-kaefig-<datum>.jpg`, Zahlen in `apps/editor/pruefen-ausgabe/p1/`. Fälle: die Einteiler (`pruefen/einteiler.ts`);
// mit MODUL=extremreihe FAELLE=langhals,robbe,ente,pilz BOGEN=p1-teile die Teile an der Naht (Tag 4–5).
// Umgebung: FAELLE, AUSGABE, DATUM, MODUL, BOGEN. Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/p1-kaefig-editor.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/p1');
const DATUM = process.env.DATUM ?? '2026-11-03';
const bilderOrdner = resolve(WURZEL, 'docs/progress/editor');
mkdirSync(out, { recursive: true });
const faelle = (process.env.FAELLE ?? 'kugel,ei,wuerfel-scharf,zylinder,vase-rund,kegel,wuerfel,vase').split(',').filter(Boolean);
// MODUL=extremreihe nimmt die Körper der Extremreihe (Teile an der Naht: langhals,robbe,ente,pilz); BOGEN = Name des Kontaktbogens
const modulArt = process.env.MODUL ?? 'einteiler';
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/${modulArt === 'extremreihe' ? 'extremreihe' : 'einteiler'}.ts`;
const BOGEN = process.env.BOGEN ?? 'p1-kaefig';
const TITEL = process.env.TITEL ?? (modulArt === 'extremreihe' ? 'P1 Tag 4–5 · Teile an der Naht auf dem Schleifen-Käfig' : 'P1 Tag 2–3, zweiter Anlauf · Schleifen-Käfig');
const UNTERTITEL =
  modulArt === 'extremreihe'
    ? 'Prüfplan P1, Tag 4–5: je Fall die drei Blätter (Δ im Titel) mit den geplanten Schleifen, die Bühne im Earle-Look und als Zebra bei 45°, oben der heutige Körper, unten der Rumpf mit Kindern über Fenster (Hals, Kopf, Stiel als eigene Röhren; die Flügel der Ente fehlen noch). Abnahme offen.'
    : 'Prüfplan P1, Tag 2–3: je Fall die drei Blätter (Δ im Titel) mit den geplanten Schleifen, die Bühne im Earle-Look und als Zebra bei 45°, oben der heutige Körper, unten der Käfig aus den Schleifen (die drei Umrisse sind Käfigreihen — Naht, Reihe N/4, ein Ring —, dazwischen die gestreckte Ringschleife; Ecken-Knoten werden Falten). Abnahme offen.';
const BLAETTER = ['seite', 'front', 'top'];

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
  await page.waitForFunction((x) => !!window.__editor && window.__editor.netzVersion() > x, v, { timeout: 120_000 });
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
async function ausschnitt(blatt) {
  return page.evaluate((blatt) => {
    const rc = window.__stores.rahmen.getState().rects[blatt];
    const p = window.__editor.umrissPlan();
    const sk = window.__stores.editor.getState().dok.skalierung;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const s of p?.schleifen ?? []) {
      for (const q of s.proben) {
        const r = window.__editor.projizieren(blatt, [q.p[0] * sk, q.p[1] * sk, q.p[2] * sk]);
        if (!r) continue;
        x0 = Math.min(x0, r[0]);
        y0 = Math.min(y0, r[1]);
        x1 = Math.max(x1, r[0]);
        y1 = Math.max(y1, r[1]);
      }
    }
    if (!Number.isFinite(x0)) return { x: rc.x, y: rc.y, width: rc.w, height: rc.h };
    const rand = 30;
    const ax = Math.max(0, x0 - rand);
    const ay = Math.max(0, y0 - rand);
    const bx = Math.min(rc.w, x1 + rand);
    const by = Math.min(rc.h, y1 + rand);
    return { x: rc.x + ax, y: rc.y + ay, width: Math.max(40, bx - ax), height: Math.max(40, by - ay) };
  }, blatt);
}
async function bild(clip) {
  const png = await page.screenshot({ clip });
  return { src: `data:image/png;base64,${png.toString('base64')}`, w: Math.round(clip.width), h: Math.round(clip.height) };
}
async function kamera(az, el) {
  const h = await page.evaluate(() => window.__editor.spiel().hoehe ?? 0.5);
  const dist = Math.max(1.1, 3.6 * h);
  await page.evaluate((k) => window.__stores.ui.getState().setzeKamera(k), { azimut: (az * Math.PI) / 180, elevation: (el * Math.PI) / 180, distanz: dist, ziel: [0, h / 2, 0] });
  await page.waitForTimeout(450);
}
async function buehne() {
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const w = rc.w * 0.72;
  const hh = rc.h * 0.72;
  return bild({ x: rc.x + (rc.w - w) / 2, y: rc.y + (rc.h - hh) / 2, width: w, height: hh });
}
const deltas = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-view] [data-delta]')].map((e) => [e.closest('[data-view]').getAttribute('data-view'), e.getAttribute('data-delta')])));
const tafel = () => page.evaluate(() => ({ rest: document.querySelector('[data-kaefig-rest]')?.getAttribute('data-kaefig-rest') ?? null, innen: document.querySelector('[data-kaefig-innen]')?.getAttribute('data-kaefig-innen') ?? null, achse: document.querySelector('[data-kaefig-achse]')?.getAttribute('data-kaefig-achse') ?? null, ms: document.querySelector('[data-kaefig-ms]')?.getAttribute('data-kaefig-ms') ?? null, ok: document.querySelector('[data-kaefig-ok]')?.getAttribute('data-kaefig-ok') ?? null, stand: window.__editor.schleifenKaefig() }));
async function setzeSchleifen(an) {
  const v = await version();
  const t0 = Date.now();
  const neu = await page.evaluate((an) => {
    const s = window.__stores.kernAnzeige.getState();
    const alt = s.schleifenKaefig;
    s.setzeSchleifenKaefig(an);
    return alt !== an;
  }, an);
  if (neu) await nachBau(v);
  await ruhig();
  return neu ? Date.now() - t0 : 0;
}
/** Blätter (Riss), dann Bühne Earle 45° und Zebra 45° (Matcap). */
async function satz(clips) {
  const bilder = {};
  await page.evaluate(() => window.__stores.ui.getState().maximieren(null));
  await page.waitForTimeout(500);
  for (const b of BLAETTER) bilder[b] = await bild(clips[b]);
  const d = await deltas();
  await page.evaluate(() => window.__stores.ui.getState().maximieren('creation'));
  await page.waitForTimeout(500);
  await kamera(-45, 22);
  bilder.earle = await buehne();
  await page.evaluate(() => window.__stores.kernAnzeige.getState().setzeLook('matcap'));
  await page.evaluate(() => window.__stores.ui.getState().setzeZebra?.(true));
  await page.waitForTimeout(600);
  bilder.zebra = await buehne();
  await page.evaluate(() => window.__stores.ui.getState().setzeZebra?.(false));
  await page.evaluate(() => window.__stores.kernAnzeige.getState().setzeLook('earle'));
  await page.waitForTimeout(400);
  return { bilder, d };
}

const zeilen = [];
for (const name of faelle) {
  console.log(`${name}:`);
  await page.goto(`${url}/?look=earle&palette=blob`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.__stores.ui.getState().libraryUmschalten(false);
    window.__stores.ui.getState().setzeEbene('form');
    window.__stores.ui.getState().maximieren(null);
    window.__stores.ui.setState({ netzUmrisse: 'geplant' });
  });
  await ruhig();
  const v = await version();
  await page.evaluate(
    async ({ modul, name, modulArt }) => {
      const m = await import(modul);
      const dok = (modulArt === 'extremreihe' ? m.extremKoerper(name) : m.einteiler(name)).dok();
      const st = window.__stores.editor.getState();
      st.setzeDokument({ ...st.dok, profile: dok.profile, ...(dok.spanten ? { spanten: dok.spanten } : {}) });
    },
    { modul, name, modulArt },
  );
  await nachBau(v);
  await ruhig();
  const clips = {};
  for (const b of BLAETTER) clips[b] = await ausschnitt(b);
  const heute = await satz(clips);
  const ms = await setzeSchleifen(true);
  const neu = await satz(clips);
  const t = await tafel();
  const st = t.stand?.bericht;
  pruefe(!!st && st.ok, `Schleifen-Käfig: Umschalten ${ms} ms; Δ S/F/T heute ${heute.d.seite}/${heute.d.front}/${heute.d.top} → ${neu.d.seite}/${neu.d.front}/${neu.d.top} px; Tafel Achse ${t.achse ?? '–'}, Rest ${t.rest ?? '–'} px, Innen ${t.innen ?? '–'} px, Bau ${t.ms ?? '–'} ms${st ? `; Ring ${st.ringF}, Silhouette ${st.silhouette.toFixed(1)}°, Kippung ${st.kippung.toFixed(0)} px, Falten Ringe ${JSON.stringify(st.falten.ringe)} Reihen ${JSON.stringify(st.falten.reihen)}${st.ok ? '' : `, nicht gebaut: ${st.grund}`}` : ''}`);
  zeilen.push({ name, ms, heute: { d: heute.d, bilder: heute.bilder }, neu: { d: neu.d, bilder: neu.bilder }, tafel: { rest: t.rest, innen: t.innen, achse: t.achse, ms: t.ms }, bericht: st });
  await setzeSchleifen(false);
}
writeFileSync(resolve(out, `${BOGEN}-editor-${DATUM}.json`), JSON.stringify(zeilen.map((z) => ({ ...z, heute: { d: z.heute.d }, neu: { d: z.neu.d } })), null, 2));

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const stil = `body{margin:0;padding:18px 22px;background:#19232b;color:#f1ead9;font:13px/1.35 -apple-system,'Helvetica Neue',sans-serif;width:max-content}
h1{font-size:20px;margin:0 0 6px} h2{font-size:15px;margin:16px 0 6px;color:#c8f560} .u{color:#c9c2b0;margin:0 0 10px;font-size:12px;max-width:1500px}
.reihe{display:flex;gap:8px;margin-bottom:8px;align-items:flex-start} figure{margin:0} figcaption{font-size:12px;color:#c9c2b0;margin-top:4px} img{display:block;border-radius:6px;background:#2a3540}`;
const tag = (b, breite) => `<img src="${b.src}" width="${breite}" height="${Math.round((b.h * breite) / b.w)}">`;
const sektionen = zeilen
  .map((z) => {
    const reihe = (s, titel, d) => `<div class="reihe">${BLAETTER.map((b) => `<figure>${tag(s.bilder[b], Math.min(360, s.bilder[b].w * 1.4))}<figcaption>${esc(`${titel} · ${b} · Δ ${d[b]} px`)}</figcaption></figure>`).join('')}<figure>${tag(s.bilder.earle, 300)}<figcaption>${esc(`${titel} · Bühne 45°`)}</figcaption></figure><figure>${tag(s.bilder.zebra, 300)}<figcaption>${esc(`${titel} · Zebra 45°`)}</figcaption></figure></div>`;
    const st = z.bericht;
    const text = st ? (st.ok ? `Achse ${st.achse}, Ring der Ringschleife ${st.ringF}, Rest an den Schleifen ${z.tafel.rest} px, Silhouette ${st.silhouette.toFixed(1)}°, Innen ${z.tafel.innen} px, Überstand F/T ${st.ueberstand.front.toFixed(1)}/${st.ueberstand.top.toFixed(1)} px, Kippung ${st.kippung.toFixed(0)} px, Falten Ringe ${st.falten.ringe.join(', ') || '–'} Reihen ${st.falten.reihen.join(', ') || '–'}, Bau ${z.tafel.ms} ms (Unterteilung ${st.msUnterteilung.toFixed(0)}, Lösen ${st.msLoeser.toFixed(0)}), Umschalten ${z.ms} ms` : `nicht gebaut: ${st.grund}`) : 'kein Bericht';
    return `<h2>${esc(z.name)}</h2><p class="u">${esc(text)}</p>${reihe(z.heute, 'heute', z.heute.d)}${reihe(z.neu, 'Schleifen-Käfig (P1)', z.neu.d)}`;
  })
  .join('');
const html = `<!doctype html><meta charset="utf-8"><style>${stil}</style><h1>${TITEL} · ${DATUM}</h1><p class="u">${UNTERTITEL}</p>${sektionen}`;
const p2 = await browser.newPage({ viewport: { width: 1860, height: 600 }, deviceScaleFactor: 1 });
await p2.setContent(html);
await p2.waitForTimeout(400);
const pfad = resolve(bilderOrdner, `${BOGEN}-${DATUM}.jpg`);
await p2.screenshot({ path: pfad, fullPage: true, type: 'jpeg', quality: 86 });
console.log('Bogen', pfad);
await browser.close();
console.log(fehler ? `${fehler} Prüfungen verfehlt` : 'alle Prüfungen ok');
process.exit(fehler ? 1 : 0);
