 
// Gegenprüfung „Lineare Algebra“, Messung 1: Füllung, Rechenoperationen und Reihenfolgen an der Kugel mit drei Loops.
// Aufruf: cd packages/shape && npx vite-node <dieses Skript>     DREIECKE=6000,14000  ZEIT=1 (auch Zeiten, mit Vorbehalt)
import { zerlegungsDaten, systemAusDaten } from '../../../../../../packages/shape/src/loeser/zerlegung';
import type { NormalZeile } from '../../../../../../packages/shape/src/loeser/normalSystem';
import {
  type Graph,
  dreiLoops,
  f,
  graphAus,
  huelle,
  kleinsterGrad,
  median,
  natuerlich,
  nnzUnten,
  rcm,
  symbolik,
  systemeAus,
  verschachtelt,
} from './gemeinsam';

const groessen = (process.env.DREIECKE ?? '6000,14000').split(',').map(Number);
const mitZeit = !!process.env.ZEIT;
const anzahlLoops = Number(process.env.LOOPS ?? 3);

function tabelle(name: string, n: number, zeilen: NormalZeile[], daempfung: number, lage: Float64Array | null): void {
  const g: Graph = graphAus(n, zeilen);
  const nnzA = nnzUnten(g);
  console.log(`\n### ${name}: n = ${f(n)}, Zeilen ${f(zeilen.length)}, nnz(A, untere Hälfte mit Diagonale) = ${f(nnzA)} (${(nnzA / n).toFixed(1)} je Zeile; voll ${((2 * nnzA - n) / n).toFixed(1)})`);
  // Code
  const zeiten: { auf: number; zer: number }[] = [];
  let daten = zerlegungsDaten(n, zeilen, daempfung);
  zeiten.push({ auf: daten.zeitAufbau, zer: daten.zeitZerlegen });
  if (mitZeit)
    for (let k = 0; k < 6; k++) {
      daten = zerlegungsDaten(n, zeilen, daempfung);
      zeiten.push({ auf: daten.zeitAufbau, zer: daten.zeitZerlegen });
    }
  const permCode = daten.perm;
  const reihen: [string, Int32Array][] = [
    ['natürlich (wie nummeriert)', natuerlich(n)],
    ['Cuthill-McKee rückwärts (alter Löser normalSystem)', rcm(g)],
    ['verschachtelt, Code (zerlegung.ts, Blatt 16)', permCode],
  ];
  const t0 = performance.now();
  const ndKopie = verschachtelt(g, { blatt: 16, blaetter: 'roh', trenner: 'ebene' });
  const tNd = performance.now() - t0;
  let gleich = true;
  for (let i = 0; i < n; i++) if (ndKopie[i] !== permCode[i]) gleich = false;
  console.log(`(Nachbau der verschachtelten Ordnung stimmt mit dem Code überein: ${gleich ? 'ja' : 'NEIN'}; Ordnung allein ${tNd.toFixed(1)} ms)`);
  reihen.push(['verschachtelt, Blatt 16, Blätter nach kleinstem Grad', verschachtelt(g, { blatt: 16, blaetter: 'grad', trenner: 'ebene' })]);
  reihen.push(['verschachtelt, Blatt 64, Blätter nach kleinstem Grad', verschachtelt(g, { blatt: 64, blaetter: 'grad', trenner: 'ebene' })]);
  reihen.push(['verschachtelt, Blatt 200, Blätter nach kleinstem Grad', verschachtelt(g, { blatt: 200, blaetter: 'grad', trenner: 'ebene' })]);
  if (lage) {
    reihen.push(['verschachtelt, Koordinatenschnitt, Blatt 16 roh', verschachtelt(g, { blatt: 16, blaetter: 'roh', trenner: 'koordinate', lage })]);
    reihen.push(['verschachtelt, Koordinatenschnitt, Blatt 64, kleinster Grad', verschachtelt(g, { blatt: 64, blaetter: 'grad', trenner: 'koordinate', lage })]);
    reihen.push(['verschachtelt, Koordinatenschnitt, Blatt 200, kleinster Grad', verschachtelt(g, { blatt: 200, blaetter: 'grad', trenner: 'koordinate', lage })]);
  }
  const t1 = performance.now();
  const md = kleinsterGrad(g);
  const tMd = performance.now() - t1;
  reihen.push([`kleinster Grad, genau (ganze Matrix; ${tMd.toFixed(0)} ms im Skript)`, md]);
  console.log('| Reihenfolge | nnz(L) | nnz(L)/nnz(A) | je Zeile | Zerlegen: Mult.+Add. | Lösen je Runde: Mult.+Add. (k Spalten) | größte Spalte |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  const k = name.startsWith('Lagen') ? 3 : 1;
  for (const [titel, perm] of reihen) {
    const s = symbolik(g, perm);
    const extra = titel.startsWith('Cuthill') ? ` (Hülle ${f(huelle(g, perm))})` : '';
    console.log(
      `| ${titel}${extra} | ${f(s.nnzL)} | ${(s.nnzL / nnzA).toFixed(2)} | ${(s.nnzL / n).toFixed(1)} | ${f(s.flops / 1e6, 1)} Mio. | ${f((2 * (s.nnzL - n) * k) / 1e6, 2)} Mio. | ${s.maxSpalte} |`,
    );
  }
  // Kontrolle: nnz(L) des Codes = symbolik
  const sCode = symbolik(g, permCode);
  if (sCode.nnzL !== daten.Lp[n]) console.log(`WARNUNG: symbolik ${sCode.nnzL} ≠ Code ${daten.Lp[n]}`);
  if (mitZeit) {
    const auf = median(zeiten.map((z) => z.auf));
    const zer = median(zeiten.map((z) => z.zer));
    const sys = systemAusDaten(daten);
    const rhs = Float64Array.from({ length: k * n }, (_, i) => Math.sin(i));
    const ls: number[] = [];
    for (let r = 0; r < 40; r++) {
      const a = performance.now();
      sys.loesenSpalten(rhs, k);
      ls.push(performance.now() - a);
    }
    console.log(
      `Zeiten (Median aus ${zeiten.length}, MIT VORBEHALT, Maschine belegt): Aufbau (Graph + Ordnung + Einsortieren) ${auf.toFixed(1)} ms, Zerlegen (Baum + Muster + Werte) ${zer.toFixed(1)} ms; Lösen ${k} Spalten Median ${median(ls).toFixed(2)} ms, Minimum ${Math.min(...ls).toFixed(2)} ms`,
    );
    console.log(
      `  daraus: ${((sCode.flops / 1e6 / zer) * 1).toFixed(1)} Mio. Mult.+Add. je ms beim Zerlegen, ${(((2 * (sCode.nnzL - n) * k) / 1e6 / Math.min(...ls)) * 1).toFixed(1)} Mio. je ms beim Lösen (Minimum)`,
    );
  }
}

for (const d of groessen) {
  const s = dreiLoops(d, anzahlLoops);
  const sys = systemeAus(s);
  const n = s.h.n;
  console.log(`\n## Kugel, bestellt ${d} Dreiecke, ${anzahlLoops} Loops eingesetzt: ${f(n)} Punkte, ${f(s.h.tri.length / 3)} Dreiecke, Bindungen ${sys.bind.ecken.length / 3}, Linienpunkte (Quellen) ${n - sys.cFrei.length}`);
  // Bindungen: wie viele auf einem Netzpunkt, Werte b
  let aufPunkt = 0;
  const bWerte = new Set<string>();
  for (let j = 0; j < sys.bind.ecken.length / 3; j++) {
    const v = sys.bind.ecken[3 * j]!;
    if (sys.bind.ecken[3 * j + 1] === v && sys.bind.ecken[3 * j + 2] === v) aufPunkt++;
    bWerte.add([0, 1, 2].map((e) => sys.bind.b[3 * j + e]!.toFixed(3)).join('/'));
  }
  console.log(`Bindungen auf einem Netzpunkt: ${aufPunkt} von ${sys.bind.ecken.length / 3}; Gewichte b: ${[...bWerte].slice(0, 4).join(' · ')}`);
  tabelle('Lagen (Laplace-Zeilen + Bindungen, Σ aᵀa)', n, sys.lagen, 1e-9, s.h.pos);
  const lageC = new Float64Array(3 * sys.cFrei.length);
  sys.cFrei.forEach((v, u) => {
    for (let c = 0; c < 3; c++) lageC[3 * u + c] = s.h.pos[3 * v + c]!;
  });
  tabelle('Krümmung „gleich“ (Σ aᵀa der harmonischen Zeilen + HALT)', sys.cFrei.length, sys.kruemmung, 1e-12, lageC);
  // dieselbe harmonische Aufgabe ohne Quadrieren: symmetrisch (Zeile mal Valenz) als Kantenzeilen — Muster 1-Ring
  const sym: NormalZeile[] = [];
  sys.cFrei.forEach((v, u) => {
    for (const w of s.h.nachbarn[v]!) {
      const q = sys.quelle[w]!;
      if (q > 0) sym.push({ index: [u], wert: [1], gewicht: q });
      else if (q < 0 && sys.cNr[w]! > u) sym.push({ index: [u, sys.cNr[w]!], wert: [1, -1], gewicht: 1 });
    }
    sym.push({ index: [u], wert: [1], gewicht: 1e-6 * s.h.nachbarn[v]!.length });
  });
  tabelle('Krümmung, nicht quadriert (symmetrischer Laplace, Muster 1-Ring; = Vorkonditionierer von „geometrie“)', sys.cFrei.length, sym, 1e-12, lageC);
}
