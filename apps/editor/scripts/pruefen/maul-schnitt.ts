// Schnittbilder eines Falls der Prüfreihe (pruefreihe.json): Längsschnitte (x, y) bei festen z, zu und offen, feine
// Punkte nach Bereich gefärbt, dazu Schlitzlippe (rot) und untere Kopie (blau). Zeigt, wo der kürzere Kiefer durch die
// Lippe des längeren stößt oder eine Flosse bildet.
// Aus packages/shape: FALL=kugel-ueberbiss-blau-vor-3 OEFF=0,0.5,1 ZS=0.002,0.02 npx vite-node ../../apps/editor/scripts/pruefen/maul-schnitt.ts
// Fenster: XMIN, XMAX, YMIN, YMAX (Welt); Bild danach mit html-shot.mjs (aus apps/editor).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { ableitenMitMaul, maulOptionenVorlage, maulPose } from '../../../../packages/shape/src/kern/maul';
import { maulLinieAusDokument } from '../../../../packages/shape/src/kern/maulDokument';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/test-results/pruefen');
const faelle = JSON.parse(readFileSync(resolve(AUSGABE, 'pruefreihe.json'), 'utf-8')) as Record<string, { dok: Dokument }>;
const FALL = process.env.FALL ?? 'kugel-ueberbiss-blau-vor-3';
const dok = faelle[FALL]?.dok;
if (!dok) throw new Error(`Fall ${FALL} fehlt in pruefreihe.json`);
const linie = maulLinieAusDokument(dok);
if (!linie) throw new Error('kein Maul');
const g = dok.kaefig?.stationen;
const abl = ableitenMitMaul(dok, linie, { stufen: Number(process.env.STUFEN ?? 3), ...(g ? { stationen: g } : {}) }, maulOptionenVorlage('vorn'));
const m = abl.maul;
const M = abl.unterteilung.matrix;
const OEFF = (process.env.OEFF ?? '0,0.5,1').split(',').map(Number);
const ZS = (process.env.ZS ?? '0.002').split(',').map(Number);
const fen = { x0: Number(process.env.XMIN ?? -Infinity), x1: Number(process.env.XMAX ?? Infinity), y0: Number(process.env.YMIN ?? -Infinity), y1: Number(process.env.YMAX ?? Infinity) };
// Bereich je feinem Punkt: Art des Käfigpunkts mit dem größten Gewicht
const nf = abl.fein.length / 3;
const art = new Uint8Array(nf);
for (let i = 0; i < nf; i++) {
  let best = -1;
  let bw = -1;
  for (let q = M.start[i]!; q < M.start[i + 1]!; q++) if (M.wert[q]! > bw) { bw = M.wert[q]!; best = M.index[q]!; }
  art[i] = m.art[best]!;
}
const ARTEN = ['haut', 'lippeO', 'lippeU', 'tascheO', 'tascheU', 'rachen', 'winkel'];
const FARBE = ['#888', '#e0222a', '#2266ee', '#f29a1a', '#19b5b5', '#7a1f7a', '#111'];
const flaechen = alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig);
// Bereich je Fläche: Mehrheit der Eckpunkte
const artF = flaechen.map((fl) => {
  const n = new Uint8Array(8);
  for (const i of fl) n[art[i]!]!++;
  let best = 0;
  for (let a = 1; a < 8; a++) if (n[a]! > n[best]!) best = a;
  return best;
});
const bilder: string[] = [];
for (const oe of OEFF) {
  const pose = maulPose(abl, oe);
  const f = pose.fein;
  const X = pose.xyz;
  for (const zs of ZS) {
    // Schnitt jeder feinen Fläche mit der Ebene z = zs (Strecken)
    const seg: { a: [number, number]; b: [number, number]; art: number }[] = [];
    flaechen.forEach((fl, fi) => {
      const pts: [number, number][] = [];
      for (let k = 0; k < fl.length; k++) {
        const i = fl[k]!;
        const j = fl[(k + 1) % fl.length]!;
        const zi = f[3 * i + 2]! - zs;
        const zj = f[3 * j + 2]! - zs;
        if ((zi < 0) === (zj < 0)) continue;
        const t = zi / (zi - zj);
        pts.push([f[3 * i]! + t * (f[3 * j]! - f[3 * i]!), f[3 * i + 1]! + t * (f[3 * j + 1]! - f[3 * i + 1]!)]);
      }
      if (pts.length >= 2) seg.push({ a: pts[0]!, b: pts[1]!, art: artF[fi]! });
    });
    const imFenster = (p: [number, number]) => p[0] >= fen.x0 && p[0] <= fen.x1 && p[1] >= fen.y0 && p[1] <= fen.y1;
    const sichtbar = seg.filter((q) => imFenster(q.a) || imFenster(q.b));
    if (!sichtbar.length) continue;
    let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
    for (const q of sichtbar) for (const p of [q.a, q.b]) { amin = Math.min(amin, p[0]); amax = Math.max(amax, p[0]); bmin = Math.min(bmin, p[1]); bmax = Math.max(bmax, p[1]); }
    if (Number.isFinite(fen.x0)) { amin = fen.x0; amax = fen.x1; bmin = fen.y0; bmax = fen.y1; }
    const w = 560;
    const sc = w / Math.max(amax - amin, bmax - bmin);
    const h = (bmax - bmin) * sc;
    const ax = (a: number) => ((a - amin) * sc).toFixed(1);
    const by = (b: number) => ((bmax - b) * sc).toFixed(1);
    const kreise = (idx: number[], farbe: string) =>
      idx.filter((i) => Math.abs(X[3 * i + 2]! - zs) < 0.006).map((i) => `<circle cx="${ax(X[3 * i]!)}" cy="${by(X[3 * i + 1]!)}" r="4" fill="none" stroke="${farbe}" stroke-width="1.2"/>`).join('');
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${(h + 22).toFixed(0)}" style="background:#fff;font:12px sans-serif"><text x="4" y="14">${FALL} · Öffnung ${oe} · z = ${zs}</text><g transform="translate(0,22)"><clipPath id="c"><rect width="${w}" height="${h.toFixed(0)}"/></clipPath><g clip-path="url(#c)">`;
    for (const q of sichtbar) s += `<line x1="${ax(q.a[0])}" y1="${by(q.a[1])}" x2="${ax(q.b[0])}" y2="${by(q.b[1])}" stroke="${FARBE[q.art]}" stroke-width="2"/>`;
    s += kreise(m.pfad, '#e0222a') + kreise(m.unten, '#2266ee');
    bilder.push(s + '</g></g></svg>');
  }
}
const legende = ARTEN.map((a, i) => `<span style="color:${FARBE[i]}">● ${a}</span>`).join(' ');
const out = process.env.OUT ?? resolve(AUSGABE, `schnitt-${FALL}.html`);
writeFileSync(out, `<html><body style="margin:8px;font:12px sans-serif"><div>${legende} · Kreise: Käfigpunkte der Schlitzlippe (rot) und der unteren Kopie (blau)</div><div style="display:flex;gap:10px;flex-wrap:wrap">${bilder.join('')}</div></body></html>`);
console.log('geschrieben', out, bilder.length, 'Schnitte');
