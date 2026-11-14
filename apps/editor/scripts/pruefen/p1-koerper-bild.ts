// P1 Tag 2–3, Bild: Drahtgitter der Stufe 2 in den drei Ansichten, heute | aus den Schleifen, mit Zeichnung (schwarz) und
// geplanten Schleifen (gezeichnete Proben: Top türkis, Front lila, Seite blau) → SVG je Fall in AUSGABE (Standard
// apps/editor/pruefen-ausgabe/p1). Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/p1-koerper-bild.ts
// Umgebung: FAELLE, AUSGABE, FAIR/GEWICHT/TANGENTE/RUNDEN/RING/REIHE/KAEFIG/ANKER/NUR wie p1-koerper.ts; BAU=kaefig zeichnet den
// Schleifen-Käfig (zweiter Anlauf, `schleifenKaefig`; dann ACHSE, INNEN, KIPPEN) statt des Schleifenkörpers.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { anwenden3, multiplizieren } from '../../../../packages/shape/src/subdivision/matrix';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { editorBauen, editorPlan, imAblauf } from '../../../../packages/shape/src/kern/pruefen/extremMessung';
import { extremKoerper } from '../../../../packages/shape/src/kern/pruefen/extremreihe';
import { EINTEILER } from '../../../../packages/shape/src/kern/pruefen/einteiler';
import { schleifenKoerper } from '../../../../packages/shape/src/kern/schleifenKoerper';
import { schleifenKaefig } from '../../../../packages/shape/src/kern/schleifenKaefig';
import { umrissPlan } from '../../../../packages/shape/src/kern/umrissPlan';
import type { Ableitung } from '../../../../packages/shape/src/kern/ableiten';

const PX = 461;
const faelle = (process.env.FAELLE ?? 'robbe,kegel').split(',');
const out = process.env.AUSGABE ?? resolve(process.cwd(), '../../apps/editor/pruefen-ausgabe/p1');
mkdirSync(out, { recursive: true });
const opt = { fair: Number(process.env.FAIR ?? 30), ziel: Number(process.env.ZIEL ?? 1), gewicht: Number(process.env.GEWICHT ?? 1e3), tangente: Number(process.env.TANGENTE ?? 1e3), runden: Number(process.env.RUNDEN ?? 6), kaefig: Number(process.env.KAEFIG ?? 0), ring: Number(process.env.RING ?? 0), reihe: Number(process.env.REIHE ?? 0), laengs: Number(process.env.LAENGS ?? 0), anker: Number(process.env.ANKER ?? 0), ...(process.env.NUR ? { nur: process.env.NUR.split(',') as ('naht' | 'top' | 'front')[] } : {}) };
const kaefigBau = process.env.BAU === 'kaefig';
const kaefigOpt = { ...(process.env.ACHSE ? { achse: process.env.ACHSE as 'x' | 'y' } : {}), fair: Number(process.env.FAIR ?? 30), innen: Number(process.env.INNEN ?? 1), tangente: Number(process.env.TANGENTE ?? 1e3), gewicht: Number(process.env.GEWICHT ?? 1e3), kippen: Number(process.env.KIPPEN ?? 1) };
const BLATT: Record<'seite' | 'front' | 'top', [number, number]> = { seite: [0, 1], front: [2, 1], top: [0, 2] };

function stufe2(abl: Ableitung, xyz: Float64Array): { p: Float64Array; flaechen: number[][] } {
  const u = abl.unterteilung;
  const s = Math.min(2, u.stufen.length);
  let M = u.stufen[0]!.matrix;
  for (let i = 1; i < s; i++) M = multiplizieren(u.stufen[i]!.matrix, M);
  return { p: anwenden3(M, xyz), flaechen: alleFlaechen(u.stufen[s - 1]!.kaefig) };
}

function tafel(abl: Ableitung, xyz: Float64Array, dok: Parameters<typeof umrissPlan>[0], plan: ReturnType<typeof umrissPlan>, blatt: 'seite' | 'front' | 'top', titel: string): { svg: string; w: number; h: number } {
  const { p, flaechen } = stufe2(abl, xyz);
  const [ax, ay] = BLATT[blatt];
  const blick: [number, number, number] = blatt === 'seite' ? [0, 0, 1] : blatt === 'front' ? [1, 0, 0] : [0, 1, 0];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const nP = p.length / 3;
  for (let i = 0; i < nP; i++) {
    x0 = Math.min(x0, p[3 * i + ax]!);
    x1 = Math.max(x1, p[3 * i + ax]!);
    y0 = Math.min(y0, p[3 * i + ay]!);
    y1 = Math.max(y1, p[3 * i + ay]!);
  }
  const segs = vollerPfad(dok.profile[blatt]);
  const kurve = pfadAbtasten(segs, 24).map((q) => ({ x: q.x * dok.skalierung, y: q.y * dok.skalierung }));
  for (const q of kurve) {
    x0 = Math.min(x0, q.x);
    x1 = Math.max(x1, q.x);
    y0 = Math.min(y0, q.y);
    y1 = Math.max(y1, q.y);
  }
  const rand = 16;
  const W = (x1 - x0) * PX + 2 * rand;
  const H = (y1 - y0) * PX + 2 * rand;
  const X = (x: number) => ((x - x0) * PX + rand).toFixed(1);
  const Y = (y: number) => ((y1 - y) * PX + rand).toFixed(1);
  const teile: string[] = [];
  // Flächen, die dem Blick zugewandt sind: Kanten dunkel, abgewandte hell
  const kanten = new Map<string, boolean>();
  for (const f of flaechen) {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      n0 += (p[3 * a + 1]! - p[3 * b + 1]!) * (p[3 * a + 2]! + p[3 * b + 2]!);
      n1 += (p[3 * a + 2]! - p[3 * b + 2]!) * (p[3 * a]! + p[3 * b]!);
      n2 += (p[3 * a]! - p[3 * b]!) * (p[3 * a + 1]! + p[3 * b + 1]!);
    }
    const vorn = n0 * blick[0] + n1 * blick[1] + n2 * blick[2] > 0;
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      const s = a < b ? `${a},${b}` : `${b},${a}`;
      kanten.set(s, (kanten.get(s) ?? false) || vorn);
    }
  }
  const hinten: string[] = [];
  const vorne: string[] = [];
  for (const [s, vorn] of kanten) {
    const [a, b] = s.split(',').map(Number) as [number, number];
    const d = `M${X(p[3 * a + ax]!)} ${Y(p[3 * a + ay]!)}L${X(p[3 * b + ax]!)} ${Y(p[3 * b + ay]!)}`;
    (vorn ? vorne : hinten).push(d);
  }
  teile.push(`<path d="${hinten.join('')}" fill="none" stroke="#d8c9a8" stroke-width="0.4"/>`);
  teile.push(`<path d="${vorne.join('')}" fill="none" stroke="#5a7a3a" stroke-width="0.5"/>`);
  // Zeichnung
  teile.push(`<path d="${kurve.map((q, i) => `${i ? 'L' : 'M'}${X(q.x)} ${Y(q.y)}`).join('')}Z" fill="none" stroke="#000" stroke-width="1.4"/>`);
  // geplante Schleifen (gezeichnete Proben), projiziert
  const farbe: Record<'seite' | 'front' | 'top', string> = { seite: '#2b50d8', front: '#a03cc8', top: '#0f9e8e' };
  for (const s of plan.schleifen) {
    const pts = s.proben.filter((q) => q.art === 0);
    if (!pts.length) continue;
    teile.push(`<path d="${pts.map((q, i) => `${i ? 'L' : 'M'}${X(q.p[ax]!)} ${Y(q.p[ay]!)}`).join('')}" fill="none" stroke="${farbe[s.ansicht]}" stroke-width="${s.ansicht === blatt ? 0.8 : 1.2}" stroke-dasharray="${s.ansicht === blatt ? '3 2' : ''}" stroke-opacity="0.9"/>`);
  }
  teile.push(`<text x="6" y="14" font-size="12" font-family="sans-serif" fill="#333">${titel}</text>`);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(0)}" height="${H.toFixed(0)}" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}"><rect width="100%" height="100%" fill="#f4efe4"/>${teile.join('')}</svg>`, w: W, h: H };
}

for (const name of faelle) {
  const dok0 = (EINTEILER.find((e) => e.name === name) ?? extremKoerper(name)).dok();
  const bau = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), editorPlan('roehre'));
  const abl = bau.stand.abl;
  const dok = { ...bau.dok, skalierung: 1 };
  const plan = umrissPlan(dok);
  const rk = kaefigBau ? schleifenKaefig(abl, plan, dok, kaefigOpt) : null;
  const r = rk ? null : schleifenKoerper(abl, plan, dok, opt);
  const ablNeu = rk ? rk.abl : r!.abl;
  const titelNeu = (blatt: 'seite' | 'front' | 'top') => (rk ? `${name} · ${blatt} · Schleifen-Käfig (Achse ${rk.bericht.achse}, Ring ${rk.bericht.ringF}, Rest ${rk.bericht.rest.max.toFixed(1)} px, innen ${rk.bericht.innen.max.toFixed(1)} px, Kippung ${rk.bericht.kippung.toFixed(0)} px)` : `${name} · ${blatt} · aus den Schleifen (Rest ${blatt === 'seite' ? '–' : r!.bericht.rest[blatt].max.toFixed(1) + ' px'}, Bewegung ${r!.bericht.bewegung.toFixed(0)} px)`);
  const tafeln: { svg: string; w: number; h: number }[] = [];
  for (const blatt of ['seite', 'front', 'top'] as const) {
    tafeln.push(tafel(abl, abl.kaefig.xyz, dok, plan, blatt, `${name} · ${blatt} · heute`));
    tafeln.push(tafel(ablNeu, ablNeu.kaefig.xyz, dok, plan, blatt, titelNeu(blatt)));
  }
  // zwei Spalten (heute | neu), drei Zeilen
  const spalte = Math.max(...tafeln.map((t) => t.w));
  const zeilen = [0, 2, 4].map((i) => Math.max(tafeln[i]!.h, tafeln[i + 1]!.h));
  const Hges = zeilen.reduce((a, b) => a + b + 8, 0);
  let y = 0;
  const inhalt: string[] = [];
  [0, 2, 4].forEach((i, z) => {
    inhalt.push(`<g transform="translate(0,${y})">${tafeln[i]!.svg.replace('<svg ', '<svg x="0" ')}</g>`);
    inhalt.push(`<g transform="translate(${spalte + 8},${y})">${tafeln[i + 1]!.svg}</g>`);
    y += zeilen[z]! + 8;
  });
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#19232b"><svg xmlns="http://www.w3.org/2000/svg" width="${2 * spalte + 8}" height="${Hges}">${inhalt.join('')}</svg></body>`;
  const pfad = resolve(out, `${kaefigBau ? 'kaefig' : 'koerper'}-${name}.html`);
  writeFileSync(pfad, html);
  console.log(rk ? `${name}: ${pfad} (${rk.bericht.ok ? `Rest ${rk.bericht.rest.max.toFixed(1)} px, innen ${rk.bericht.innen.max.toFixed(1)} px` : rk.bericht.grund})` : `${name}: ${pfad} (Bewegung ${r!.bericht.bewegung.toFixed(0)} px, Rest F/T ${r!.bericht.rest.front.max.toFixed(1)}/${r!.bericht.rest.top.max.toFixed(1)} px)`);
}
