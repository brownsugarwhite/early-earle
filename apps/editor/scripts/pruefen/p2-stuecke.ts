// P2 „Stücknetz im Maulfeld“, Tag 1: Stücke je Fall als Tabelle und als Bild (Karte mit Stücken, Linien, Ecken) — HTML nach
// apps/editor/pruefen-ausgabe/p2/stuecke.html, danach `node scripts/pruefen/html-shot.mjs --jpg pruefen-ausgabe/p2/stuecke.html`
// aus apps/editor. Umgebung: FAELLE (z. B. rex/mittel/j,robbe/hoch/gerade; Standard die zehn Fälle des Prüfplans).
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/p2-stuecke.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { einsatzFall } from '../../../../packages/shape/src/kern/pruefen/einsatzFall';
import type { KoerperArt } from '../../../../packages/shape/src/kern/pruefen/koerper';
import type { Anfang, Form } from '../../../../packages/shape/src/kern/pruefen/linien';
import { mundwinkelEcke, stueckeFinden, stueckeSvg } from '../../../../packages/shape/src/kern/einsatz/stuecke';

const standard = 'rex/mittel/gerade,rex/mittel/j,robbe/hoch/gerade,robbe/hoch/j,rex/tief/j,robbe/tief/j,kugel/mittel/j,ei/tief/j,langhals/hoch/j,birne/mittel/s';
const faelle = (process.env.FAELLE ?? standard).split(',').map((s) => s.split('/') as [KoerperArt, Anfang, Form]);
const out = resolve(process.cwd(), '../../apps/editor/pruefen-ausgabe/p2');
mkdirSync(out, { recursive: true });
let html = `<!doctype html><meta charset="utf-8"><style>body{font:12px sans-serif;background:#1c2229;color:#eee;margin:12px}h1{font-size:16px}.k{display:inline-block;margin:6px;vertical-align:top}.k p{margin:2px 0 0;color:#ccc;max-width:320px}</style><h1>P2 Tag 1 · Stücke im Maulfeld · 2026-11-03</h1><p>Karte des halben Maulfelds (links der Schlitz: oben Ufer A, unten Ufer B, Kreis = Mundwinkel; rechts der Feldrand; oben und unten die Naht). Stücke gefüllt, Verlängerung blau, Schnitte grün, Falten violett (gestrichelt = Stummel ohne Grenze), Ecken mit Drehung (in der Tangentialebene), rote Ringe = ungelöste konkave Punkte, Seiten mit Feldkanten (K n, dahinter Pole ⁵/³ der Treppenstufen) bzw. Länge in px (frei = Kantenzahl frei).</p>`;
console.log('Fall | Stücke (Seiten) | Ecken je Stück (Drehung) | Mundwinkel | Falten / offen / Schnitte / konkav | Feldkanten Σ / halber Rand · Pole ⁵/³ | Dreiecke ohne Stück | ms');
for (const [art, anfang, form] of faelle) {
  const f = einsatzFall(art, anfang, form);
  if (!f || 'fehler' in f) {
    console.log(`${art}/${anfang}/${form} | kein Fall`);
    continue;
  }
  const fund = stueckeFinden(f.v.kaefig, f.feld, f.netz, f.pfad, f.schnitt, f.karte, f.h1, f.linie);
  const c = f.pfad[f.pfad.length - 1]!;
  const mw = mundwinkelEcke(fund, c);
  const feldSeiten = fund.stuecke.flatMap((st) => st.seiten.filter((se) => se.feldKanten >= 0));
  const feldK = feldSeiten.reduce((q, se) => q + se.feldKanten, 0);
  const pole = feldSeiten.reduce((q, se) => ({ fuenf: q.fuenf + se.pole.fuenf, drei: q.drei + se.pole.drei }), { fuenf: 0, drei: 0 });
  const ecken = fund.stuecke.map((st) => `${st.seiten.length} (${st.winkel.map((w) => w.toFixed(0)).join('/')}°)`).join('; ');
  console.log(
    `${f.name} | ${fund.stuecke.length} (${fund.stuecke.map((st) => st.seiten.length).join('/')}) | ${ecken} | ${mw.map((x) => (x.ecke ? `Ecke ${x.drehung.toFixed(0)}°` : 'glatt')).join(', ')} | ${fund.falten.length} / ${fund.offen.length} / ${fund.schnitte.length} / ${fund.konkav} | ${feldK} / ${f.feld.halbKanten} · ${pole.fuenf}/${pole.drei} | ${fund.ohneStueck} | ${fund.ms.toFixed(0)}`,
  );
  html += `<div class="k">${stueckeSvg(fund, f.karte, f.netz, f.schnitt, c)}<p><b>${f.name}</b> · ${fund.stuecke.length} Stücke (${fund.stuecke.map((st) => st.seiten.length).join('/')} Seiten), Mundwinkel ${mw.map((x) => (x.ecke ? `Ecke ${x.drehung.toFixed(0)}°` : 'glatt')).join('/')}, Falten ${fund.falten.length}, Stummel ${fund.offen.length}, Schnitte ${fund.schnitte.length}, konkav ${fund.konkav}, Feldkanten ${feldK}/${f.feld.halbKanten}, Pole am Rand ${pole.fuenf}⁵ ${pole.drei}³${fund.verworfen.length ? `, verworfen: ${fund.verworfen.join('; ')}` : ''}</p></div>`;
}
const pfad = resolve(out, 'stuecke.html');
writeFileSync(pfad, html);
console.log(`HTML: ${pfad}`);
