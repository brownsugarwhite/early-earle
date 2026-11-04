// P2 Tag 5: Ebenen der Stücke (konform und benutzt) mit feinen Dreiecken und Musterzellen als HTML/SVG nach
// apps/editor/pruefen-ausgabe/p2/ebene-<fall>.html (danach `node scripts/pruefen/html-shot.mjs --jpg …` aus apps/editor).
// Aufruf aus packages/shape: FALL=robbe/hoch/j npx vite-node ../../apps/editor/scripts/pruefen/p2-ebenen.ts
// Ebenen der Stücke als SVG: feine Dreiecke (grau), Umlauf (schwarz), Musterzellen (blau; umgeklappt rot), fest = Rand (Punkte)
import { writeFileSync } from 'node:fs';
import { einsatzFall } from '../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { stuecknetzTopologie } from '../../../../packages/shape/src/kern/einsatz/stuecknetz';
const [art, anfang, form] = (process.env.FALL ?? 'rex/mittel/gerade').split('/') as ['rex', 'mittel', 'gerade'];
const f = einsatzFall(art, anfang, form);
if (!f || 'fehler' in f) throw new Error('kein Fall');
const bau = stuecknetzTopologie(f, { diagnose: true });
const PX = 461;
let html = `<!doctype html><meta charset="utf-8"><style>body{background:#fff;font:11px sans-serif}svg{border:1px solid #ccc;margin:4px}</style><h3>${f.name}: Ebenen je Stück (links konform, rechts benutzt: ${bau.ebenen.join(', ')})</h3>`;
for (const e of bau.ebenenDaten!) {
  for (const [titel, eb, musterAuch] of [['konform', e.konform, e.art === 'konform'], [e.art, e.benutzt, true]] as [string, { u: Float64Array; v: Float64Array }, boolean][]) {
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < eb.u.length; i++) { minU = Math.min(minU, eb.u[i]!); maxU = Math.max(maxU, eb.u[i]!); minV = Math.min(minV, eb.v[i]!); maxV = Math.max(maxV, eb.v[i]!); }
    const W = 900, pad = 10;
    const sc = (W - 2 * pad) / Math.max(maxU - minU, maxV - minV);
    const H = (maxV - minV) * sc + 2 * pad;
    const X = (u: number) => pad + (u - minU) * sc;
    const Y = (v: number) => H - pad - (v - minV) * sc;
    let s = `<svg width="${W}" height="${H.toFixed(0)}">`;
    for (let t = 0; t + 2 < e.tri.length; t += 3) {
      const a = e.tri[t]!, b = e.tri[t + 1]!, c = e.tri[t + 2]!;
      s += `<polygon points="${X(eb.u[a]!)},${Y(eb.v[a]!)} ${X(eb.u[b]!)},${Y(eb.v[b]!)} ${X(eb.u[c]!)},${Y(eb.v[c]!)}" fill="none" stroke="#ddd" stroke-width="0.3"/>`;
    }
    s += `<polygon points="${e.rand.map((i) => `${X(eb.u[i]!)},${Y(eb.v[i]!)}`).join(' ')}" fill="none" stroke="#000" stroke-width="1"/>`;
    if (musterAuch) {
      const idx = new Map(e.muster.keys.map((k, i) => [k, i] as [string, number]));
      for (const fl of e.muster.flaechen) {
        const c = fl.map((k) => idx.get(k)!);
        let a = 0;
        for (let i = 0; i < 4; i++) a += e.muster.gu[c[i]!]! * e.muster.gv[c[(i + 1) % 4]!]! - e.muster.gu[c[(i + 1) % 4]!]! * e.muster.gv[c[i]!]!;
        s += `<polygon points="${c.map((i) => `${X(e.muster.gu[i]!)},${Y(e.muster.gv[i]!)}`).join(' ')}" fill="${a <= 0 ? 'rgba(255,0,0,0.5)' : 'none'}" stroke="${a <= 0 ? '#f00' : '#36c'}" stroke-width="0.6"/>`;
      }
      e.muster.keys.forEach((k, i) => { if (/^P:|^alt:/.test(k) || k.endsWith(':C')) s += `<circle cx="${X(e.muster.gu[i]!)}" cy="${Y(e.muster.gv[i]!)}" r="2.5" fill="${k.endsWith(':C') ? '#e80' : '#000'}"/><text x="${X(e.muster.gu[i]!) + 3}" y="${Y(e.muster.gv[i]!) - 3}">${k.slice(0, 12)}</text>`; });
    }
    s += `</svg>`;
    html += `<div><b>Stück ${e.stueck} · ${titel}</b> (${(Math.max(maxU - minU, maxV - minV) * PX).toFixed(0)} px breit)<br>${s}</div>`;
  }
}
const out = `/Users/bsw/Projekte/playground/early-earle/apps/editor/pruefen-ausgabe/p2/ebene-${f.name.replace(/\//g, '-')}.html`;
writeFileSync(out, html);
console.log(out);
