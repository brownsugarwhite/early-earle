 
// Gegenprüfung „Lineare Algebra“, Messung 2: Die Haut ist spiegelgleich. Was kostet die Zerlegung, wenn nur eine Hälfte Unbekannte ist
// (x, y gerade, z ungerade gefaltet)? Dazu: Ist das Netz wirklich spiegelgleich, und gibt das gefaltete System dieselbe Lösung?
// Aufruf: cd packages/shape && npx vite-node <dieses Skript>     DREIECKE=6000,14000
import { zerlegungsDaten, systemAusDaten } from '../../../../../../packages/shape/src/loeser/zerlegung';
import type { NormalZeile } from '../../../../../../packages/shape/src/loeser/normalSystem';
import { dreiLoops, f, graphAus, median, nnzUnten, symbolik, systemeAus, verschachtelt } from './gemeinsam';

const groessen = (process.env.DREIECKE ?? '6000,14000').split(',').map(Number);

for (const d of groessen) {
  const s = dreiLoops(d);
  const sys = systemeAus(s);
  const h = s.h;
  const n = h.n;
  // 1. Spiegelgleichheit des Netzes
  let ohne = 0;
  let ebene = 0;
  let kantenFehler = 0;
  let valenzFehler = 0;
  for (let v = 0; v < n; v++) {
    const w = h.spiegel[v]!;
    if (w < 0) {
      ohne++;
      continue;
    }
    if (w === v) ebene++;
    if (h.nachbarn[v]!.length !== h.nachbarn[w]!.length) valenzFehler++;
    for (const j of h.nachbarn[v]!) {
      const js = h.spiegel[j]!;
      if (js < 0 || !h.nachbarn[w]!.includes(js)) kantenFehler++;
    }
  }
  console.log(`\n## ${f(n)} Punkte: ohne Spiegelpartner ${ohne}, auf der Mittelebene ${ebene}, Kanten ohne Spiegelkante ${kantenFehler}, ungleiche Valenz ${valenzFehler}`);
  if (ohne || kantenFehler) {
    console.log('Netz nicht spiegelgleich — Faltung nicht geprüft');
    continue;
  }
  // 2. Faltung: Vertreter = kleinere Nummer des Paars
  const rep = new Int32Array(n);
  const vz = new Int8Array(n);
  for (let v = 0; v < n; v++) {
    const w = h.spiegel[v]!;
    rep[v] = Math.min(v, w);
    vz[v] = v <= w ? 1 : -1;
  }
  const nrG = new Int32Array(n).fill(-1);
  const nrU = new Int32Array(n).fill(-1);
  let nG = 0;
  let nU = 0;
  for (let v = 0; v < n; v++) {
    if (rep[v] !== v) continue;
    nrG[v] = nG++;
    if (h.spiegel[v] !== v) nrU[v] = nU++;
  }
  const falten = (zeilen: readonly NormalZeile[], gerade: boolean): NormalZeile[] =>
    zeilen.flatMap((z) => {
      const m = new Map<number, number>();
      for (let t = 0; t < z.index.length; t++) {
        const v = z.index[t]!;
        const r = rep[v]!;
        const u = gerade ? nrG[r]! : nrU[r]!;
        if (u < 0) continue;
        m.set(u, (m.get(u) ?? 0) + (gerade ? 1 : vz[v]!) * z.wert[t]!);
      }
      if (!m.size) return [];
      return [{ index: [...m.keys()], wert: [...m.values()], gewicht: z.gewicht }];
    });
  const zG = falten(sys.lagen, true);
  const zU = falten(sys.lagen, false);
  // die Dämpfung ε·I der ganzen Haut wird gefaltet zu ε·EᵀE: Paare zählen doppelt (sonst unterscheiden sich die Lösungen um die Wirkung
  // der Dämpfung selbst, gemessen 4e-4 bzw. 1,7e-3 Einheiten)
  if (!process.env.DAEMPFUNG_EINFACH)
    for (let v = 0; v < n; v++) {
      if (rep[v] !== v || h.spiegel[v] === v) continue;
      zG.push({ index: [nrG[v]!], wert: [1], gewicht: 1e-9 });
      zU.push({ index: [nrU[v]!], wert: [1], gewicht: 1e-9 });
    }
  const voll = graphAus(n, sys.lagen);
  const gG = graphAus(nG, zG);
  const gU = graphAus(nU, zU);
  const nd = (g: ReturnType<typeof graphAus>) => symbolik(g, verschachtelt(g, { blatt: 16, blaetter: 'roh', trenner: 'ebene' }));
  const sV = nd(voll);
  const sG = nd(gG);
  const sU = nd(gU);
  console.log('| System | Unbekannte | nnz(A) | nnz(L) | Zerlegen Mult.+Add. | Lösen je Runde Mult.+Add. | größte Spalte |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  console.log(`| ganze Haut, 3 Spalten (heute) | ${f(n)} | ${f(nnzUnten(voll))} | ${f(sV.nnzL)} | ${f(sV.flops / 1e6, 1)} Mio. | ${f((2 * (sV.nnzL - n) * 3) / 1e6, 2)} Mio. | ${sV.maxSpalte} |`);
  console.log(`| halbe Haut, gerade (x, y: 2 Spalten) | ${f(nG)} | ${f(nnzUnten(gG))} | ${f(sG.nnzL)} | ${f(sG.flops / 1e6, 1)} Mio. | ${f((2 * (sG.nnzL - nG) * 2) / 1e6, 2)} Mio. | ${sG.maxSpalte} |`);
  console.log(`| halbe Haut, ungerade (z: 1 Spalte) | ${f(nU)} | ${f(nnzUnten(gU))} | ${f(sU.nnzL)} | ${f(sU.flops / 1e6, 1)} Mio. | ${f((2 * (sU.nnzL - nU) * 1) / 1e6, 2)} Mio. | ${sU.maxSpalte} |`);
  const loesenHalb = 2 * (sG.nnzL - nG) * 2 + 2 * (sU.nnzL - nU);
  console.log(
    `Summe halbe Haut: Zerlegen ${f((sG.flops + sU.flops) / 1e6, 1)} Mio. (${(((sG.flops + sU.flops) / sV.flops) * 100).toFixed(0)} % von heute), Lösen je Runde ${f(loesenHalb / 1e6, 2)} Mio. (${((loesenHalb / (2 * (sV.nnzL - n) * 3)) * 100).toFixed(0)} % von heute), Speicher nnz(L) ${f(sG.nnzL + sU.nnzL)} (${(((sG.nnzL + sU.nnzL) / sV.nnzL) * 100).toFixed(0)} %)`,
  );
  // 3. gleiche Lösung? spiegelgleiche rechte Seite aus zufälligen Zeilenzielen
  const dV = zerlegungsDaten(n, sys.lagen, 1e-9);
  const dG = zerlegungsDaten(nG, zG, 1e-9);
  const dU = zerlegungsDaten(nU, zU, 1e-9);
  const sysV = systemAusDaten(dV);
  const sysG = systemAusDaten(dG);
  const sysU = systemAusDaten(dU);
  // rechte Seite: aus einer spiegelgleichen Lage (die Haut selbst, verrauscht spiegelgleich) → b = Aᵀ g A x
  const X = Float64Array.from(h.pos);
  for (let v = 0; v < n; v++) {
    const w = h.spiegel[v]!;
    if (w < v) continue;
    const r = [Math.sin(v * 1.7) * 3, Math.cos(v * 0.9) * 3, Math.sin(v * 2.3 + 1) * 3];
    X[3 * v] = X[3 * v]! + r[0]!;
    X[3 * v + 1] = X[3 * v + 1]! + r[1]!;
    X[3 * v + 2] = w === v ? 0 : X[3 * v + 2]! + r[2]!;
    X[3 * w] = X[3 * v]!;
    X[3 * w + 1] = X[3 * v + 1]!;
    X[3 * w + 2] = -X[3 * v + 2]!;
  }
  const rhs = new Float64Array(3 * n);
  for (const z of sys.lagen)
    for (let c = 0; c < 3; c++) {
      let t = 0;
      for (let k = 0; k < z.index.length; k++) t += z.wert[k]! * X[3 * z.index[k]! + c]!;
      t *= z.gewicht;
      for (let k = 0; k < z.index.length; k++) rhs[3 * z.index[k]! + c] = rhs[3 * z.index[k]! + c]! + t * z.wert[k]!;
    }
  const xV = sysV.loesenSpalten(rhs, 3);
  // gefaltete rechte Seiten: Eᵀ rhs
  const rG = new Float64Array(2 * nG);
  const rU = new Float64Array(nU);
  for (let v = 0; v < n; v++) {
    const r = rep[v]!;
    rG[2 * nrG[r]!] = rG[2 * nrG[r]!]! + rhs[3 * v]!;
    rG[2 * nrG[r]! + 1] = rG[2 * nrG[r]! + 1]! + rhs[3 * v + 1]!;
    if (nrU[r]! >= 0) rU[nrU[r]!] = rU[nrU[r]!]! + vz[v]! * rhs[3 * v + 2]!;
  }
  const xG = sysG.loesenSpalten(rG, 2);
  const xU = sysU.loesenSpalten(rU, 1);
  let abw = 0;
  let asym = 0;
  for (let v = 0; v < n; v++) {
    const r = rep[v]!;
    abw = Math.max(abw, Math.abs(xV[3 * v]! - xG[2 * nrG[r]!]!), Math.abs(xV[3 * v + 1]! - xG[2 * nrG[r]! + 1]!));
    const zHalb = nrU[r]! >= 0 ? vz[v]! * xU[nrU[r]!]! : 0;
    abw = Math.max(abw, Math.abs(xV[3 * v + 2]! - zHalb));
    const w = h.spiegel[v]!;
    asym = Math.max(asym, Math.abs(xV[3 * v]! - xV[3 * w]!), Math.abs(xV[3 * v + 1]! - xV[3 * w + 1]!), Math.abs(xV[3 * v + 2]! + xV[3 * w + 2]!));
  }
  console.log(`gleiche Lösung: größter Unterschied ganze ↔ halbe Haut ${abw.toExponential(2)} Einheiten; die ganze Lösung selbst ist bis ${asym.toExponential(2)} spiegelgleich`);
  // 4. Zeiten (mit Vorbehalt)
  if (process.env.ZEIT) {
    const mess = (fn: () => void, w = 30) => {
      const t: number[] = [];
      for (let k = 0; k < w; k++) {
        const a = performance.now();
        fn();
        t.push(performance.now() - a);
      }
      return [median(t), Math.min(...t)] as const;
    };
    const [mV, minV] = mess(() => sysV.loesenSpalten(rhs, 3));
    const [mH, minH] = mess(() => {
      sysG.loesenSpalten(rG, 2);
      sysU.loesenSpalten(rU, 1);
    });
    console.log(`Lösen (MIT VORBEHALT): ganze Haut Median ${mV.toFixed(2)} / Minimum ${minV.toFixed(2)} ms; halbe Haut (beide Systeme) ${mH.toFixed(2)} / ${minH.toFixed(2)} ms`);
    console.log(`Zerlegen (ein Lauf): ganz ${(dV.zeitAufbau + dV.zeitZerlegen).toFixed(0)} ms; halb gerade ${(dG.zeitAufbau + dG.zeitZerlegen).toFixed(0)} ms + ungerade ${(dU.zeitAufbau + dU.zeitZerlegen).toFixed(0)} ms`);
  }
}
