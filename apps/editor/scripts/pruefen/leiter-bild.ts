// Leiter eines Falls der Prüfreihe als Bild: Seitenumriss für die Ableitung (mit Schlitzsehne), Rücken (blau) und Bauch
// (rot), Sprossen (grau) und Ringstationen (schwarz, eingefroren wie im Editor). Zeigt, wo der Umriss zurückknickt.
// Aus packages/shape: FALL=kugel-ueberbiss-blau-vor-3-k0 npx vite-node ../../apps/editor/scripts/pruefen/leiter-bild.ts
// Fenster: XMIN, XMAX, YMIN, YMAX (Welt). Mehrere Fälle: FALL=a,b (nebeneinander).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { kernLeiter, stationenAusLeiter, zugBei } from '../../../../packages/shape/src/kern/ableiten';
import { ableitenMitMaul, maulOptionenVorlage } from '../../../../packages/shape/src/kern/maul';
import { maulLinieAusDokument } from '../../../../packages/shape/src/kern/maulDokument';
import { dokFuerKern } from '../../../../packages/shape/src/kern/schlitz';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const faelle = JSON.parse(readFileSync(resolve(AUSGABE, 'pruefreihe.json'), 'utf-8')) as Record<string, { dok: Dokument }>;
const fen = { x0: Number(process.env.XMIN ?? -0.3), x1: Number(process.env.XMAX ?? -0.05), y0: Number(process.env.YMIN ?? 0.1), y1: Number(process.env.YMAX ?? 0.4) };
const bilder: string[] = [];
for (const name of (process.env.FALL ?? 'kugel-ueberbiss-blau-vor-3-k0').split(',')) {
  const roh = faelle[name]!.dok;
  const dok = dokFuerKern(roh).dok;
  const sk = dok.skalierung;
  const l = kernLeiter(dok);
  const g = roh.kaefig?.stationen;
  const abl = ableitenMitMaul(roh, maulLinieAusDokument(roh)!, { stufen: 2, ...(g ? { stationen: g } : {}) }, maulOptionenVorlage('vorn'));
  const ringe = abl.gefroren.ringe;
  const st = stationenAusLeiter(l, ringe);
  const w = 520;
  const sc = w / Math.max(fen.x1 - fen.x0, fen.y1 - fen.y0);
  const X = (x: number) => ((x - fen.x0) * sc).toFixed(1);
  const Y = (y: number) => ((fen.y1 - y) * sc).toFixed(1);
  const pl = (pts: { x: number; y: number }[], farbe: string, breite = 1.5) => `<polyline fill="none" stroke="${farbe}" stroke-width="${breite}" points="${pts.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}"/>`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${(w + 24).toFixed(0)}" style="background:#fff;font:12px sans-serif"><text x="4" y="14">${name}</text><g transform="translate(0,22)"><clipPath id="c${bilder.length}"><rect width="${w}" height="${w}"/></clipPath><g clip-path="url(#c${bilder.length})">`;
  // Sprossen (jede 4.)
  l.paare.forEach((p, i) => {
    if (i % 4) return;
    const o = zugBei(l.ruecken, p.a);
    const u = zugBei(l.bauch, p.b);
    s += `<line x1="${X(o.x)}" y1="${Y(o.y)}" x2="${X(u.x)}" y2="${Y(u.y)}" stroke="#ccc" stroke-width="0.8"/>`;
  });
  s += pl(l.ruecken, '#2266ee') + pl(l.bauch, '#e0222a');
  for (const q of st) {
    const o = zugBei(l.ruecken, q.a);
    const u = zugBei(l.bauch, q.b);
    s += `<line x1="${X(o.x)}" y1="${Y(o.y)}" x2="${X(u.x)}" y2="${Y(u.y)}" stroke="#111" stroke-width="1.6"/>`;
  }
  // Lippenanfänge (markierte Knoten)
  for (const k of roh.profile.seite.knoten) if (k.marke) s += `<circle cx="${X(k.p.x * sk)}" cy="${Y(k.p.y * sk)}" r="5" fill="none" stroke="${k.marke === 'maulOben' ? '#e0222a' : '#2266ee'}" stroke-width="2"/>`;
  bilder.push(s + '</g></g></svg>');
}
const out = resolve(AUSGABE, 'leiter-bild.html');
writeFileSync(out, `<html><body style="margin:8px;font:12px sans-serif"><div>Rücken blau · Bauch rot · Sprossen grau · Ringstationen schwarz · Kreise: Lippenanfänge (rot = Oberlippe, blau = Unterkiefer)</div><div style="display:flex;gap:10px;flex-wrap:wrap">${bilder.join('')}</div></body></html>`);
console.log('geschrieben', out);
