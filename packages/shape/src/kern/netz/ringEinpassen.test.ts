// Teil L, L0 Fall 4 (steil): Querlinie als Ring — „Die Fläche bleibt, das Netz gleitet“ mit vertauschten Rollen. Gemessen wie
// in L0.1: Ring i* dicht gegen die Linie (keine Treppe), Haut und Normalen gegen den Körper ohne Linie (Stufe 4), Falten,
// kleinster Flächenwinkel und Seitenverhältnis. Tor (Plan Teil L): Ring ≤ 0,5 px, Haut ≤ 0,25 px, Normalen ≤ 1°.
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../../dokument';
import { ableiten } from '../ableiten';
import { faltenMass } from '../pruefstand';
import { koerperDokument } from '../pruefen/koerper';
import { zufall } from '../pruefen/zufall';
import { roehrenGitter } from './gitter';
import { PX, TOR, abstandZug, flaechenGuete, formMessung, hautZ, kasten, linieAusSeite } from './pruefen';
import { ringEinpassen, ringPunkte } from './ringEinpassen';

declare const console: { log: (...a: unknown[]) => void };

type Ableitung = ReturnType<typeof ableiten>;
/** Obere und untere Kontur bei x (Seite): Bereich, in dem die Haut aus der Seite getroffen wird, etwas nach innen. */
function konturBei(abl: Ableitung, x: number): [number, number] | null {
  const k = kasten(abl);
  let lo = Infinity;
  let hi = -Infinity;
  const n = 400;
  for (let s = 0; s <= n; s++) {
    const y = k.y0 + ((k.y1 - k.y0) * s) / n;
    if (hautZ(abl, x, y) !== null) {
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  }
  if (!(hi > lo)) return null;
  const rand = 0.01 * (hi - lo);
  return [lo + rand, hi - rand];
}

type Fall = { name: string; dok: () => Dokument; zug: (abl: Ableitung) => [number, number][]; waechter: { ring: number; haut?: number; normale?: number } };
const quer = (abl: Ableitung, xo: number, xu: number, n = 12): [number, number][] => {
  const k = kasten(abl);
  const xOben = k.x0 + xo * (k.x1 - k.x0);
  const xUnten = k.x0 + xu * (k.x1 - k.x0);
  const o = konturBei(abl, xOben);
  const u = konturBei(abl, xUnten);
  if (!o || !u) return [];
  const pts: [number, number][] = [];
  for (let s = 0; s <= n; s++) {
    const t = s / n;
    pts.push([xOben + (xUnten - xOben) * t, o[1] + (u[0] - o[1]) * t]);
  }
  return pts;
};
const FAELLE: Fall[] = [
  { name: 'Kugel, senkrecht durch die Mitte', dok: () => koerperDokument('kugel', zufall(1)), zug: (a) => quer(a, 0.5, 0.5), waechter: { ring: 0.5 } },
  { name: 'Kugel, schräg', dok: () => koerperDokument('kugel', zufall(1)), zug: (a) => quer(a, 0.42, 0.58), waechter: { ring: 1 } },
  { name: 'Ei, Bogen', dok: () => koerperDokument('ei', zufall(3)), zug: (a) => {
    const g = quer(a, 0.55, 0.55);
    return g.map(([x, y], i) => [x + 0.04 * Math.sin((Math.PI * i) / (g.length - 1)), y]);
  }, waechter: { ring: 1 } },
  { name: 'Langhals, quer zum Hals (entlang der Sprosse eines Halsrings)', dok: () => koerperDokument('langhals', zufall(1)), zug: (a) => halsQuer(a, 0), waechter: { ring: 0.5 } },
  { name: 'Langhals, steil (25° gegen die Sprosse gedreht)', dok: () => koerperDokument('langhals', zufall(1)), zug: (a) => halsQuer(a, 25), waechter: { ring: 1 } },
];

/** Linie quer über den Hals: Sprosse des Rings, dessen Mitte der Halsmitte (55 % der Höhe) am nächsten liegt, um `grad` gedreht. */
function halsQuer(abl: Ableitung, grad: number): [number, number][] {
  const { R, N } = abl.vorlage;
  const g = roehrenGitter(abl.unterteilung, R, N, abl.kaefig.n);
  const k = kasten(abl);
  const yHals = k.y0 + 0.55 * (k.y1 - k.y0);
  const P = (i: number, v: number): [number, number] => {
    const id = g.index[Math.round(i * g.teil) * g.breiteB + Math.round(v * g.teil)]!;
    return [abl.fein[3 * id]!, abl.fein[3 * id + 1]!];
  };
  let best = 1;
  for (let i = 1; i < R - 1; i++) {
    const o = P(i, 0);
    const u = P(i, N / 2);
    if (Math.abs((o[1] + u[1]) / 2 - yHals) < Math.abs((P(best, 0)[1] + P(best, N / 2)[1]) / 2 - yHals)) best = i;
  }
  const o = P(best, 0);
  const u = P(best, N / 2);
  const m: [number, number] = [(o[0] + u[0]) / 2, (o[1] + u[1]) / 2];
  const w = (grad * Math.PI) / 180;
  const dreh = (p: [number, number]): [number, number] => [m[0] + Math.cos(w) * (p[0] - m[0]) - Math.sin(w) * (p[1] - m[1]), m[1] + Math.sin(w) * (p[0] - m[0]) + Math.cos(w) * (p[1] - m[1])];
  // gedreht und etwas innerhalb der Konturen
  const a = dreh([o[0] + 0.03 * (u[0] - o[0]), o[1] + 0.03 * (u[1] - o[1])]);
  const b = dreh([u[0] + 0.03 * (o[0] - u[0]), u[1] + 0.03 * (o[1] - u[1])]);
  const pts: [number, number][] = [];
  for (let s = 0; s <= 12; s++) pts.push([a[0] + ((b[0] - a[0]) * s) / 12, a[1] + ((b[1] - a[1]) * s) / 12]);
  return pts.filter(([x, y]) => hautZ(abl, x, y) !== null);
}

describe('Teil L, L0 Fall 4: Querlinie als Ring (Fläche bleibt, Netz gleitet)', () => {
  for (const fall of FAELLE) {
    it(fall.name, () => {
      const ohne = ableiten(fall.dok(), { stufen: 3 });
      const zug = fall.zug(ohne);
      expect(zug.length).toBeGreaterThan(3);
      const linie = linieAusSeite(ohne, zug);
      expect(linie.punkte.length).toBeGreaterThan(20);
      const e = ringEinpassen(ohne, linie);
      expect(e).not.toBeNull();
      const g = roehrenGitter(ohne.unterteilung, ohne.vorlage.R, ohne.vorlage.N, ohne.kaefig.n);
      const ring = ringPunkte(g, e!.i, e!.vVon, e!.vBis);
      let auf = 0;
      let vorher = 0;
      for (const f of ring) {
        auf = Math.max(auf, abstandZug([e!.fein[3 * f]!, e!.fein[3 * f + 1]!, e!.fein[3 * f + 2]!], linie.punkte) * PX);
        vorher = Math.max(vorher, abstandZug([ohne.fein[3 * f]!, ohne.fein[3 * f + 1]!, ohne.fein[3 * f + 2]!], linie.punkte) * PX);
      }
      const m = formMessung(ohne, e!.xyz);
      const f0 = faltenMass(ohne);
      const f1 = faltenMass(ohne, undefined, e!.fein);
      const q = flaechenGuete(ohne, e!.fein);
      console.log(
        `${fall.name}: Ring i=${e!.i}, v ${e!.vVon.toFixed(2)}–${e!.vBis.toFixed(2)}, ${ring.length} Punkte — auf der Linie ${auf.toFixed(2)} px (ohne Gleiten ${vorher.toFixed(1)} px), Haut ${m.haut.toFixed(3)} px, Normalen ${m.normale.toFixed(2)}°, Winkel ${q.winkel.toFixed(1)}° (vorher ${q.winkelVorher.toFixed(1)}°), Seitenverhältnis ${q.seiten.toFixed(2)} (vorher ${q.seitenVorher.toFixed(2)}), Falten ${f0.max.toFixed(1)}° → ${f1.max.toFixed(1)}°, Linie auf der Haut ${(e!.aufHaut * PX).toFixed(2)} px, ${e!.zeit.toFixed(0)} ms`,
      );
      console.log(`  Tor (Plan): ${[auf <= TOR.reihe ? 'Ring ✓' : 'Ring ✗', m.haut <= TOR.haut ? 'Haut ✓' : 'Haut ✗', m.normale <= TOR.normale ? 'Normalen ✓' : 'Normalen ✗'].join(', ')}`);
      expect(ring.length).toBeGreaterThan(0);
      expect(auf).toBeLessThan(fall.waechter.ring);
    });
  }
});
