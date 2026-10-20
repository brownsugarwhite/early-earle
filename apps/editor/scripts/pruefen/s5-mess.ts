// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S5: Messreihe Mittelebenen-Baum gegen S3 (glatt + Berühren mittel).
// Je Körper: Falten nach Zonen (frei, Ansatz, Kappe), Δ Seite/Front/Top, Käfiggüte (kleinster Winkel, größtes
// Seitenverhältnis, Kantenlängen je Streifen gegen den Median), Bauzeit. Umgebung: KOERPER (Komma-Liste), NAME, OPT (JSON).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/s5-mess.ts
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Kaefig } from '../../../../packages/shape/src/kaefig/halbkanten';
import { GLATTE_HAUT, ableiten } from '../../../../packages/shape/src/kern/ableiten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { baumAbleiten, baumFalten, baumFeinesNetz, paarAusnahme } from '../../../../packages/shape/src/kern/grundkoerper/baumBau';
import { teilbaum } from '../../../../packages/shape/src/kern/grundkoerper/teilbaum';
import { feinesNetz } from '../../../../packages/shape/src/kern/pruefstand';
import { teilSatzDokument } from '../../../../packages/shape/src/kern/pruefen/teilsatz';
import { faltenNachZonen, faltenNachZonenRoehre } from '../../../../packages/shape/src/kern/pruefen/zonen';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const NAME = process.env.NAME ?? 's5-mess';
const OPT = process.env.OPT ? JSON.parse(process.env.OPT) : {};
const liste = (process.env.KOERPER ?? 'giraffe-bauch,ente,s-hals,ueberhang,fisch,vase,langhals,drache').split(',');

/** Käfiggüte: kleinster Innenwinkel (Grad) und größtes Seitenverhältnis (längste / kürzeste Kante) je Viereck. */
export function kaefigGuete(k: Kaefig, flaechen?: (f: number) => boolean): { winkel: number; seiten: number; winkelOrt: number } {
  let winkel = 180;
  let seiten = 1;
  let winkelOrt = -1;
  const P = k.xyz;
  for (let f = 0; f < k.nF; f++) {
    if (flaechen && !flaechen(f)) continue;
    const a = k.fStart[f]!;
    const b = k.fStart[f + 1]!;
    const m = b - a;
    const l: number[] = [];
    for (let h = 0; h < m; h++) {
      const p = k.fVerts[a + h]!;
      const q = k.fVerts[a + ((h + 1) % m)]!;
      const r = k.fVerts[a + ((h + m - 1) % m)]!;
      const u = [P[3 * q]! - P[3 * p]!, P[3 * q + 1]! - P[3 * p + 1]!, P[3 * q + 2]! - P[3 * p + 2]!];
      const v = [P[3 * r]! - P[3 * p]!, P[3 * r + 1]! - P[3 * p + 1]!, P[3 * r + 2]! - P[3 * p + 2]!];
      const lu = Math.hypot(u[0]!, u[1]!, u[2]!);
      const lv = Math.hypot(v[0]!, v[1]!, v[2]!);
      l.push(lu);
      const c = (u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!) / (lu * lv || 1);
      const w = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
      if (w < winkel) {
        winkel = w;
        winkelOrt = f;
      }
    }
    seiten = Math.max(seiten, Math.max(...l) / Math.max(1e-12, Math.min(...l)));
  }
  return { winkel, seiten, winkelOrt };
}

const zeilen: string[] = [`S5 Messreihe „${NAME}“ — Mittelebenen-Baum gegen S3 (glatt + Berühren mittel), frisch`];
zeilen.push('Körper          Bau   frei°  >20  Ansatz° >20  Kappe° >20  Kante° Spitze° | Δ S/F/T px          | Käfig: Winkel°  Seiten  Kanten/Median | Streifen | ms');
const ergebnis: Record<string, unknown> = {};
for (const name of liste) {
  const dok = teilSatzDokument(name);
  // Δ ohne seitliche Paare (Flügel, Brustflossen: S6), für S3 und Baum gleich
  const aus = paarAusnahme(teilbaum(dok));
  // S3
  const abl = ableiten(dok, { ...GLATTE_HAUT, fuelle: 'mittel' });
  const z3 = faltenNachZonenRoehre(abl).zonen;
  const n3 = feinesNetz(abl);
  const d3 = blattAbweichungen(n3.punkte, n3.flaechen, dok, 240, undefined, true, aus);
  const g3 = kaefigGuete(abl.kaefig);
  zeilen.push(`${name.padEnd(15)} S3    ${z3.frei.max.toFixed(1).padStart(5)} ${String(z3.frei.ueber20).padStart(4)}  ${'–'.padStart(6)}  ${'–'.padStart(3)} ${z3.kappe.max.toFixed(1).padStart(6)} ${String(z3.kappe.ueber20).padStart(3)} ${z3.kante.max.toFixed(0).padStart(6)} ${z3.spitze.max.toFixed(0).padStart(6)} | ${[d3.seite.max, d3.front.max, d3.top.max].map((x) => x.toFixed(1).padStart(5)).join(' ')} | ${g3.winkel.toFixed(1).padStart(6)} ${g3.seiten.toFixed(1).padStart(7)} | 1 | ${abl.zeiten.gesamt.toFixed(0)}`);
  // Baum
  try {
    const b = baumAbleiten(dok, OPT);
    const z = faltenNachZonen(b.kaefig, b.unterteilung, b.fein, baumFalten(b)).zonen;
    const nb = baumFeinesNetz(b);
    const d = blattAbweichungen(nb.punkte, nb.flaechen, dok, 240, undefined, true, aus);
    const g = kaefigGuete(b.kaefig);
    // Kantenlängen je Streifen gegen den Median
    const kanten: number[][] = b.ebene.streifen.map(() => []);
    const k = b.kaefig;
    for (let f = 0; f < k.nF; f++) {
      const s = b.bk.flaecheStreifen[f]!;
      for (let h = k.fStart[f]!; h < k.fStart[f + 1]!; h++) {
        const p = k.fVerts[h]!;
        const q = k.fVerts[h + 1 < k.fStart[f + 1]! ? h + 1 : k.fStart[f]!]!;
        kanten[s]!.push(Math.hypot(k.xyz[3 * p]! - k.xyz[3 * q]!, k.xyz[3 * p + 1]! - k.xyz[3 * q + 1]!, k.xyz[3 * p + 2]! - k.xyz[3 * q + 2]!));
      }
    }
    const faktoren = kanten.map((l) => {
      const s = [...l].sort((x, y) => x - y);
      const med = s[Math.floor(s.length / 2)]!;
      return `${(s[0]! / med).toFixed(2)}–${(s[s.length - 1]! / med).toFixed(2)}`;
    });
    zeilen.push(
      `${''.padEnd(15)} Baum  ${z.frei.max.toFixed(1).padStart(5)} ${String(z.frei.ueber20).padStart(4)}  ${z.ansatz.max.toFixed(1).padStart(6)} ${String(z.ansatz.ueber20).padStart(3)} ${z.kappe.max.toFixed(1).padStart(6)} ${String(z.kappe.ueber20).padStart(3)} ${z.kante.max.toFixed(0).padStart(6)} ${z.spitze.max.toFixed(0).padStart(6)} | ${[d.seite.max, d.front.max, d.top.max].map((x) => x.toFixed(1).padStart(5)).join(' ')} | ${g.winkel.toFixed(1).padStart(6)} ${g.seiten.toFixed(1).padStart(7)}  ${faktoren.join(' ')} | ${b.ebene.streifen.length} (${b.ringe.map((r, s) => `${b.ebene.streifen[s]!.N}×${r.sprossen.length}`).join(', ')}) | ${b.zeiten.gesamt.toFixed(0)} (Ebene ${b.zeiten.ebene.toFixed(0)}, Matrix ${b.zeiten.matrix.toFixed(0)}, Löser ${b.zeiten.loeser.toFixed(0)})`,
    );
    ergebnis[name] = { s3: { frei: z3.frei.max, kappe: z3.kappe.max, kante: z3.kante.max, spitze: z3.spitze.max, delta: [d3.seite.max, d3.front.max, d3.top.max] }, baum: { frei: z.frei.max, ansatz: z.ansatz.max, kappe: z.kappe.max, kante: z.kante.max, spitze: z.spitze.max, delta: [d.seite.max, d.front.max, d.top.max], winkel: g.winkel, seiten: g.seiten, ms: b.zeiten.gesamt } };
  } catch (err) {
    zeilen.push(`${''.padEnd(15)} Baum  Fehler: ${(err as Error).message}`);
  }
}
console.log(zeilen.join('\n'));
writeFileSync(`${AUSGABE}/${NAME}.json`, JSON.stringify(ergebnis, null, 1));
writeFileSync(`${AUSGABE}/${NAME}.txt`, zeilen.join('\n'));
