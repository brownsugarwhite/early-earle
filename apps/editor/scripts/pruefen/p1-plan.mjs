// Prüfplan P1 „Ansichten als Illustration“, Tag 1 (03.11.2026): geplante Umrissschleifen im echten Editor (eigener Vite über
// run-check.sh, nie 5180). Je Fall in Florians Ablauf (Startkugel → Umrisse des Körpers, Röhre): Tafel „umrisse an“ (die
// heutigen V2-Linien) und „umrisse geplant“ (P1), Bilder der drei Blätter; dazu Tor (d) Blatt = SVG (die Vorschläge im Blatt
// gegen den SVG-Export über die Projektion des Blatts, ≤ 0,1 px), Zeit der Planung (e) und die Zahlen der Schleifen.
// Kontaktbogen „heute (V2-Linien) | geplant“ je Fall, SVG-Dateien je Blatt in der Ausgabe.
// Umgebung: FAELLE, AUSGABE, DATUM. Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/p1-plan.mjs
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
const faelle = (process.env.FAELLE ?? 'langhals,ente,kegel,robbe').split(',').filter(Boolean);
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/extremreihe.ts`;
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
/** Ausschnitt eines Blatts um den Körper (Rahmen der geplanten Schleifen in Feldpixeln + Rand), sonst das ganze Blatt. */
async function blattAusschnitt(blatt) {
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
    const rand = 36;
    const ax = Math.max(0, x0 - rand);
    const ay = Math.max(0, y0 - rand);
    const bx = Math.min(rc.w, x1 + rand);
    const by = Math.min(rc.h, y1 + rand);
    return { x: rc.x + ax, y: rc.y + ay, width: Math.max(40, bx - ax), height: Math.max(40, by - ay) };
  }, blatt);
}
async function blattBild(blatt, clip) {
  const png = await page.screenshot({ clip });
  return { src: `data:image/png;base64,${png.toString('base64')}`, w: Math.round(clip.width), h: Math.round(clip.height) };
}
/** Tafel-Chip „umrisse …“; „geplant“ hin oder zurück baut das Liniennetz neu (Zeit in ms), sonst nur Anzeige. */
async function setzeUmrisse(wert) {
  const v = await version();
  const t0 = Date.now();
  const neu = await page.evaluate((w) => {
    const alt = window.__stores.ui.getState().netzUmrisse;
    window.__stores.ui.setState({ netzUmrisse: w });
    return alt !== w && (alt === 'geplant' || w === 'geplant');
  }, wert);
  if (neu) await nachBau(v);
  await page.waitForTimeout(400);
  return neu ? Date.now() - t0 : 0;
}
/** Tor (d): Vorschläge des eigenen Blatts (DOM-Pfade) gegen den SVG-Export, über die Projektion des Blatts in Feldpixel. */
async function blattGegenSvg(blatt) {
  return page.evaluate((blatt) => {
    const text = window.__editor.umrissSvg(blatt);
    if (!text) return null;
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg = doc.documentElement;
    const px = +svg.getAttribute('data-px');
    const x0 = +svg.getAttribute('data-x0');
    const y1 = +svg.getAttribute('data-y1');
    const rand = +svg.getAttribute('data-rand');
    const sk = window.__stores.editor.getState().dok.skalierung;
    const dreiD = (q) => (blatt === 'seite' ? [q.x * sk, q.y * sk, 0] : blatt === 'front' ? [0, q.y * sk, q.x * sk] : [q.x * sk, 0, q.y * sk]);
    const parse = (d) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: +m[1], y: +m[2] }));
    const svgPfade = [...doc.querySelectorAll('path[data-art="verdeckt"], path[data-art="ansatz"]')].map((p) => parse(p.getAttribute('d')).map((q) => window.__editor.projizieren(blatt, dreiD({ x: (q.x - rand) / px + x0, y: y1 - (q.y - rand) / px }))));
    // nur die Vorschläge der eigenen Schleifen dieses Blatts (Kennung p<s|f|t>:…); fremde Schleifen zeigen hier ihre ganze
    // Spur. `[data-view=…]` tragen mehrere Elemente — deshalb die Pfade über den ganzen Baum suchen, nicht unter dem ersten Treffer.
    const domEl = [...document.querySelectorAll(`[data-view="${blatt}"] path[data-plan-art]`)].filter((p) => p.getAttribute('data-plan-art') !== '0' && (p.getAttribute('data-netz-zug') ?? '').startsWith(`p${blatt[0]}:`));
    const svgDom = domEl[0]?.closest('svg') ?? null;
    const rect = svgDom ? svgDom.getBoundingClientRect() : null;
    const feldRect = svgDom?.parentElement ? svgDom.parentElement.getBoundingClientRect() : null;
    const domPfade = domEl.map((p) => parse(p.getAttribute('d')));
    let max = 0;
    let punkte = 0;
    const dx = [];
    const dy = [];
    domPfade.forEach((pf, i) => {
      const sv = svgPfade[i] ?? [];
      pf.forEach((q, j) => {
        const s = sv[j];
        if (!s) return;
        punkte++;
        dx.push(q.x - s[0]);
        dy.push(q.y - s[1]);
        max = Math.max(max, Math.hypot(q.x - s[0], q.y - s[1]));
      });
    });
    const median = (a) => (a.length ? [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)] : 0);
    return { dom: domPfade.length, svg: svgPfade.length, punkte, max, versatz: [median(dx), median(dy)], svgText: text, svgOben: rect && feldRect ? [rect.left - feldRect.left, rect.top - feldRect.top] : null };
  }, blatt);
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
    window.__stores.ui.setState({ netzUmrisse: 'aus' });
  });
  await ruhig();
  let v = await version();
  await page.evaluate(
    async ({ modul, name }) => {
      const m = await import(modul);
      const dok = m.extremKoerper(name).dok();
      const st = window.__stores.editor.getState();
      st.setzeDokument({ ...st.dok, profile: dok.profile, ...(dok.spanten ? { spanten: dok.spanten } : {}) });
    },
    { modul, name },
  );
  await nachBau(v);
  await ruhig();
  const bilder = {};
  // erst geplant (Ausschnitt um die Schleifen), dann mit demselben Ausschnitt die heutigen Linien
  const msGeplant = await setzeUmrisse('geplant');
  await ruhig();
  const clips = {};
  for (const b of BLAETTER) {
    clips[b] = await blattAusschnitt(b);
    bilder[`geplant-${b}`] = await blattBild(b, clips[b]);
  }
  const plan = await page.evaluate(() => {
    const p = window.__editor.umrissPlan();
    if (!p) return null;
    return {
      ms: p.ms,
      tStoesse: p.tStoesse.length / 2,
      widerspruch: p.widerspruch,
      schleifen: p.schleifen.map((s) => ({ id: s.id, ansicht: s.ansicht, teil: s.teil, proben: s.proben.length, verdeckt: s.proben.filter((q) => q.art === 1).length, ansatz: s.proben.filter((q) => q.art === 2).length })),
    };
  });
  const pfade = await page.evaluate((bl) => Object.fromEntries(bl.map((b) => [b, document.querySelectorAll(`[data-view="${b}"] path[data-plan-art]`).length])), BLAETTER);
  pruefe(!!plan && plan.schleifen.length >= 3, `Plan: ${plan?.schleifen.length ?? 0} Schleifen (${plan?.schleifen.map((s) => `${s.id}×${s.proben}${s.verdeckt ? ` v${s.verdeckt}` : ''}${s.ansatz ? ` a${s.ansatz}` : ''}`).join(' ') ?? ''}), ${plan?.tStoesse ?? 0} T-Stoß-Paare, Widerspruch S/F/T ${plan ? `${plan.widerspruch.seite.toFixed(1)}/${plan.widerspruch.front.toFixed(1)}/${plan.widerspruch.top.toFixed(1)}` : '–'} px, Planung ${plan?.ms.toFixed(1) ?? '–'} ms (Tor e 16 ms: ${plan && plan.ms <= 16 ? 'erreicht' : 'verfehlt'}), Umschalten ${msGeplant} ms`);
  pruefe(Object.values(pfade).every((n) => n > 0), `Blätter zeigen Schleifen: ${BLAETTER.map((b) => `${b} ${pfade[b]} Pfade`).join(', ')}`);
  const svg = {};
  for (const b of BLAETTER) {
    const r = await blattGegenSvg(b);
    svg[b] = r;
    if (r?.svgText) writeFileSync(resolve(out, `${name}-${b}.svg`), r.svgText);
    if (!r) {
      pruefe(false, `${b}: kein SVG`);
      continue;
    }
    const text = `${b}: Blatt ${r.dom} Vorschlagspfade, SVG ${r.svg}, ${r.punkte} Punkte verglichen, größter Abstand ${r.max.toFixed(3)} px (Tor d 0,1 px: ${r.max <= 0.1 ? 'erreicht' : 'verfehlt'}; Versatz-Median ${r.versatz.map((x) => x.toFixed(2)).join('/')} px${r.svgOben ? `, Blatt-SVG bei ${r.svgOben.map((x) => x.toFixed(0)).join('/')}` : ''})`;
    if (r.dom === 0 && r.svg === 0) console.log(`  –    ${b}: keine Vorschläge (eine Schleife, nichts verdeckt)`);
    else pruefe(r.dom === r.svg && r.max <= 0.1, text);
  }
  await setzeUmrisse('an');
  for (const b of BLAETTER) bilder[`heute-${b}`] = await blattBild(b, clips[b]);
  zeilen.push({ name, plan, pfade, svg: Object.fromEntries(BLAETTER.map((b) => [b, svg[b] ? { dom: svg[b].dom, svg: svg[b].svg, punkte: svg[b].punkte, max: svg[b].max } : null])), msGeplant, bilder });
  await setzeUmrisse('aus');
}
writeFileSync(resolve(out, `p1-plan-${DATUM}.json`), JSON.stringify(zeilen.map(({ bilder: _b, ...z }) => z), null, 2));

// Kontaktbogen
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const stil = `body{margin:0;padding:18px 22px;background:#19232b;color:#f1ead9;font:13px/1.35 -apple-system,'Helvetica Neue',sans-serif;width:max-content}
h1{font-size:20px;margin:0 0 6px} h2{font-size:15px;margin:16px 0 6px;color:#c8f560} .u{color:#c9c2b0;margin:0 0 10px;font-size:12px;max-width:1400px}
.reihe{display:flex;gap:8px;margin-bottom:8px} figure{margin:0} figcaption{font-size:12px;color:#c9c2b0;margin-top:4px} img{display:block;border-radius:6px;background:#2a3540}`;
const bildTag = (b, breite) => `<img src="${b.src}" width="${breite}" height="${Math.round((b.h * breite) / b.w)}">`;
const sektionen = zeilen
  .map((z) => {
    // Ausschnitte in doppelter Größe (die Linien sind 1–2 px dünn), höchstens 600 px breit
    const reihe = (k, titel) => `<div class="reihe">${BLAETTER.map((b) => { const bi = z.bilder[`${k}-${b}`]; const breite = Math.min(600, bi.w * 2); return `<figure>${bildTag(bi, breite)}<figcaption>${esc(`${titel} · ${b}`)}</figcaption></figure>`; }).join('')}</div>`;
    const p = z.plan;
    const text = p ? `${p.schleifen.length} Schleifen (${p.schleifen.map((s) => `${s.id}: ${s.proben} Proben${s.verdeckt ? `, ${s.verdeckt} verdeckt` : ''}${s.ansatz ? `, ${s.ansatz} Ansatz` : ''}`).join('; ')}), ${p.tStoesse} T-Stoß-Paare, Widerspruch S/F/T ${p.widerspruch.seite.toFixed(1)}/${p.widerspruch.front.toFixed(1)}/${p.widerspruch.top.toFixed(1)} px, Planung ${p.ms.toFixed(1)} ms, Umschalten ${z.msGeplant} ms` : 'kein Plan';
    const d = BLAETTER.map((b) => (z.svg[b] ? `${b} ${z.svg[b].max.toFixed(3)} px` : `${b} –`)).join(', ');
    return `<h2>${esc(z.name)}</h2><p class="u">${esc(text)} · Blatt = SVG: ${esc(d)}</p>${reihe('heute', 'heute (V2-Linien, „umrisse an“)')}${reihe('geplant', 'geplant (P1, „umrisse geplant“)')}`;
  })
  .join('');
const html = `<!doctype html><meta charset="utf-8"><style>${stil}</style><h1>P1 Tag 1 · Umrissschleifen geplant · ${DATUM}</h1><p class="u">Prüfplan P1 „Ansichten als Illustration“, Tag 1: je Fall die drei Blätter mit den heutigen V2-Linien (aus dem Körper geschnitten, Stil „netz farbe“) und darunter mit den geplanten Schleifen aus den Zeichnungen — in fremden Blättern die Schleife auf dem Körper (verdeckt gestrichelt), im eigenen Blatt die Vorschläge: verdeckte Fortsetzung blass, Ansatz gestrichelt. Der Körper ist noch der heutige (Tag 2–3 bindet ihn an die Schleifen). Abnahme offen.</p>${sektionen}`;
const p2 = await browser.newPage({ viewport: { width: 1860, height: 600 }, deviceScaleFactor: 1 });
await p2.setContent(html);
await p2.waitForTimeout(400);
const pfad = resolve(bilderOrdner, `p1-umrissschleifen-${DATUM}.jpg`);
await p2.screenshot({ path: pfad, fullPage: true, type: 'jpeg', quality: 86 });
console.log('Bogen', pfad);
await browser.close();
console.log(fehler ? `${fehler} Prüfungen verfehlt` : 'alle Prüfungen ok');
process.exit(fehler ? 1 : 0);
