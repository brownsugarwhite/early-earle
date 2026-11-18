 
// Gegenprüfung „Lineare Algebra“, Messung 3: Kondition, weiche Bindung (Gewicht 100), Dämpfung 1e-9, HALT 1e-6 im quadrierten
// Krümmungssystem. Aufruf: cd packages/shape && npx vite-node <dieses Skript>   DREIECKE=6000  LOOPS=3
import { HautAusKurven } from '../../../../../../packages/shape/src/dicht/ausKurven';
import { type V3, vermessen } from '../../../../../../packages/shape/src/dicht/kurven';
import { type Loop, bindungenAus, kantenGewichte, kruemmungsKetten, verschiebungLaengs, zieleAus } from '../../../../../../packages/shape/src/dicht/loops';
import { systemAusDaten, zerlegungsDaten } from '../../../../../../packages/shape/src/loeser/zerlegung';
import type { NormalZeile } from '../../../../../../packages/shape/src/loeser/normalSystem';
import { type Stand, type Systeme, HALT, dreiLoops, f, groessterEigenwert, kleinsterEigenwert, systemeAus } from './gemeinsam';

const dreiecke = Number(process.env.DREIECKE ?? 6000);
const anzahl = Number(process.env.LOOPS ?? 3);
const WEIT = Number(process.env.WEIT ?? 160);

const flopsVon = (d: { n: number; Lp: Int32Array }): number => {
  let s = 0;
  for (let j = 0; j < d.n; j++) {
    const c = d.Lp[j + 1]! - d.Lp[j]!;
    s += (c * (c - 1)) / 2;
  }
  return s;
};

const punktZug = (l: Loop, i: number, D: V3): Float64Array => {
  const d = verschiebungLaengs(
    l,
    l.punkte.map((_, k) => (k === i ? D : { x: 0, y: 0, z: 0 })),
  );
  if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
  return d;
};

/** Krümmung verteilen wie ausKurven.ts 713–749, mit wählbarem HALT; `direkt`: die harmonische Gleichung selbst (nicht quadriert) */
function verteilen(s: Stand, sys: Systeme, kap: Float64Array, halt: number, direkt = false): Float64Array {
  const h = s.h;
  const c = Float64Array.from(kap);
  const nc = sys.cFrei.length;
  const b = new Float64Array(nc);
  for (let u = 0; u < nc; u++) {
    const i = sys.cFrei[u]!;
    const g = sys.gew[i]!;
    const nb = h.nachbarn[i]!;
    for (let k = 0; k < nb.length; k++) {
      const q = sys.quelle[nb[k]!]!;
      if (q > 0) b[u] = b[u]! + g[k]! * q * c[nb[k]!]!;
    }
  }
  let x: Float64Array;
  if (!direkt) {
    const zeilen: NormalZeile[] = [];
    sys.cFrei.forEach((v, u) => {
      const g = sys.gew[v]!;
      const index: number[] = [u];
      const wert: number[] = [sys.cDiag[u]!];
      h.nachbarn[v]!.forEach((w, k) => {
        if (sys.cNr[w]! < 0 || g[k] === 0) return;
        index.push(sys.cNr[w]!);
        wert.push(-g[k]!);
      });
      zeilen.push({ index, wert, gewicht: 1 });
      if (halt > 0) zeilen.push({ index: [u], wert: [1], gewicht: halt });
    });
    const rhs = new Float64Array(nc);
    for (let u = 0; u < nc; u++) {
      const i = sys.cFrei[u]!;
      const g = sys.gew[i]!;
      rhs[u] = rhs[u]! + halt * kap[i]! + sys.cDiag[u]! * b[u]!;
      const nb = h.nachbarn[i]!;
      for (let k = 0; k < nb.length; k++) {
        const q = sys.cNr[nb[k]!]!;
        if (q < 0 || g[k] === 0) continue;
        rhs[q] = rhs[q]! - g[k]! * b[u]!;
      }
    }
    x = systemAusDaten(zerlegungsDaten(nc, zeilen, 1e-12)).loesenSpalte(rhs);
  } else {
    // Zeile u mal Valenz: (Valenz·cDiag) c_u − Σ c_w = Valenz·b_u, symmetrisch positiv definit (gleiche Gewichte 1/Valenz, keine harten Kanten);
    // als Kantenzeilen (c_u − c_w)² plus Diagonalzeilen; HALT wie im Code von „geometrie“: halt · Valenz auf der Diagonale
    const zeilen: NormalZeile[] = [];
    const rhs = new Float64Array(nc);
    sys.cFrei.forEach((v, u) => {
      const nb = h.nachbarn[v]!;
      let quellen = 0;
      for (const w of nb) {
        const q = sys.quelle[w]!;
        if (q > 0) quellen += q;
        else if (q < 0 && sys.cNr[w]! > u) zeilen.push({ index: [u, sys.cNr[w]!], wert: [1, -1], gewicht: 1 });
      }
      if (quellen > 0) zeilen.push({ index: [u], wert: [1], gewicht: quellen });
      if (halt > 0) zeilen.push({ index: [u], wert: [1], gewicht: halt * nb.length });
      rhs[u] = nb.length * b[u]! + halt * nb.length * kap[v]!;
    });
    x = systemAusDaten(zerlegungsDaten(nc, zeilen, 1e-12)).loesenSpalte(rhs);
  }
  for (let u = 0; u < nc; u++) c[sys.cFrei[u]!] = x[u]!;
  return c;
}

const s = dreiLoops(dreiecke, anzahl);
const sys = systemeAus(s);
const h = s.h;
const n = h.n;
console.log(`\n## Kugel mit ${anzahl} Loop(s), ${f(n)} Punkte, ${n - sys.cFrei.length} Linienpunkte`);

// ---------- 1. Kondition ----------
{
  const d9 = zerlegungsDaten(n, sys.lagen, 1e-9);
  const l9 = systemAusDaten(d9);
  const max = groessterEigenwert(n, sys.lagen, 0);
  const min = kleinsterEigenwert(n, (b) => l9.loesenSpalte(b), sys.lagen, 0);
  console.log(`Lagen (Σ aᵀa, Bindung 100): größter Eigenwert ${max.toFixed(2)}, kleinster ${min.toExponential(2)}, Kondition ${(max / min).toExponential(2)}; Dämpfung 1e-9 / kleinster Eigenwert = ${(1e-9 / min).toExponential(1)}`);
  // nur Laplace-Teil auf den freien Punkten (Linienpunkte hart, eliminiert)
  const frei = new Int32Array(n).fill(-1);
  let nf = 0;
  for (let v = 0; v < n; v++) if (sys.quelle[v]! < 0) frei[v] = nf++;
  const hart: NormalZeile[] = [];
  for (let r = 0; r < sys.nLaplace; r++) {
    const z = sys.lagen[r]!;
    const index: number[] = [];
    const wert: number[] = [];
    for (let t = 0; t < z.index.length; t++) {
      const u = frei[z.index[t]!]!;
      if (u < 0) continue;
      index.push(u);
      wert.push(z.wert[t]!);
    }
    if (index.length) hart.push({ index, wert, gewicht: 1 });
  }
  const dh = zerlegungsDaten(nf, hart, 1e-12);
  const lh = systemAusDaten(dh);
  const maxH = groessterEigenwert(nf, hart, 0);
  const minH = kleinsterEigenwert(nf, (b) => lh.loesenSpalte(b), hart, 0);
  console.log(`Lagen, Linienpunkte hart (eliminiert, ${f(nf)} Unbekannte): größter ${maxH.toFixed(2)}, kleinster ${minH.toExponential(2)}, Kondition ${(maxH / minH).toExponential(2)}; nnz(L) ${f(dh.Lp[nf]!)} gegen ${f(d9.Lp[n]!)}; Zerlegen ${f(flopsVon(dh) / 1e6, 1)} gegen ${f(flopsVon(d9) / 1e6, 1)} Mio. Mult.+Add.`);
  // Krümmung: quadriert gegen direkt
  const nc = sys.cFrei.length;
  const dc = zerlegungsDaten(nc, sys.kruemmung, 1e-12);
  const lc = systemAusDaten(dc);
  const ohneHalt = sys.kruemmung.filter((z) => z.index.length > 1 || z.gewicht !== HALT);
  const maxC = groessterEigenwert(nc, ohneHalt, 0);
  const minC = kleinsterEigenwert(nc, (b) => lc.loesenSpalte(b), ohneHalt, 0);
  console.log(`Krümmung quadriert (ohne HALT gemessen): größter ${maxC.toFixed(2)}, kleinster ${minC.toExponential(2)}, Kondition ${(maxC / minC).toExponential(2)}; HALT 1e-6 / kleinster Eigenwert = ${(1e-6 / minC).toFixed(3)} → Anteil „bleibt wie gemessen“ in der glattesten Form ${((1e-6 / (minC + 1e-6)) * 100).toFixed(1)} %`);
}

// ---------- 2. HALT: wie viel der gemessenen Krümmung der freien Punkte bleibt in der verteilten ----------
{
  const kap = vermessen(h, sys.gew).kap;
  const c0 = verteilen(s, sys, kap, HALT);
  const cRein = verteilen(s, sys, kap, 0);
  const cDirekt = verteilen(s, sys, kap, HALT, true);
  // Gegenprobe gegen den Code: ein Löser, eine Runde ohne Zug, letzteKruemmung
  const plan = bindungenAus(h, s.loops);
  const hk = { ...h, pos: Float64Array.from(h.pos) };
  const loeser = new HautAusKurven(hk, plan.bind, zieleAus(plan, s.loops.map((l) => Float64Array.from(l.ruhe))), null, 100, kantenGewichte(hk, s.loops), kruemmungsKetten(plan, s.loops), 'gleich', {});
  loeser.schritt(zieleAus(plan, s.loops.map((l) => Float64Array.from(l.ruhe))), 1);
  const cCode = loeser.letzteKruemmung!;
  let dCode = 0;
  let spanne = 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of sys.cFrei) {
    dCode = Math.max(dCode, Math.abs(cCode[v]! - c0[v]!));
    lo = Math.min(lo, cRein[v]!);
    hi = Math.max(hi, cRein[v]!);
  }
  spanne = hi - lo;
  const soll = 1 / 300;
  console.log(`Nachbau der Verteilung gegen den Code (letzteKruemmung): größter Unterschied ${dCode.toExponential(2)} (Krümmung der Kugel im Maß des Lösers ${soll.toExponential(2)})`);
  const stat = (a: Float64Array, b: Float64Array) => {
    let mx = 0;
    let sm = 0;
    for (const v of sys.cFrei) {
      const d = Math.abs(a[v]! - b[v]!);
      mx = Math.max(mx, d);
      sm += d;
    }
    return [mx, sm / sys.cFrei.length] as const;
  };
  const [mx1, mi1] = stat(c0, cRein);
  const [mx2, mi2] = stat(cDirekt, cRein);
  console.log(`verteilte Krümmung (freie Punkte, ×300 = 1 auf der Kugel): rein harmonisch ${(lo * 300).toFixed(3)} … ${(hi * 300).toFixed(3)} (Spanne ${(spanne * 300).toFixed(3)})`);
  console.log(`  Code (quadriert, HALT 1e-6) gegen rein harmonisch: größter ${(mx1 * 300).toFixed(4)}, Mittel ${(mi1 * 300).toFixed(4)}`);
  console.log(`  nicht quadriert mit HALT 1e-6·Valenz gegen rein harmonisch: größter ${(mx2 * 300).toFixed(5)}, Mittel ${(mi2 * 300).toFixed(5)}`);
  // Stoß: die gemessene Krümmung aller freien Punkte um δ anheben (die Linien bleiben). Rein harmonisch: keine Antwort.
  const delta = soll;
  const kapS = Float64Array.from(kap);
  for (const v of sys.cFrei) kapS[v] = kapS[v]! + delta;
  const cS = verteilen(s, sys, kapS, HALT);
  const cSd = verteilen(s, sys, kapS, HALT, true);
  let mxS = 0;
  let smS = 0;
  let mxD = 0;
  for (const v of sys.cFrei) {
    const a = (cS[v]! - c0[v]!) / delta;
    mxS = Math.max(mxS, a);
    smS += a;
    mxD = Math.max(mxD, (cSd[v]! - cDirekt[v]!) / delta);
  }
  console.log(`Gedächtnis durch HALT: gemessene Krümmung aller freien Punkte um δ angehoben → verteilte Krümmung steigt im Code um höchstens ${(mxS * 100).toFixed(1)} % von δ (Mittel ${((smS / sys.cFrei.length) * 100).toFixed(1)} %); nicht quadriert höchstens ${(mxD * 100).toFixed(3)} %; rein harmonisch 0 %`);
}

// ---------- 3. weiche Bindung und Dämpfung in einem Zug ----------
{
  const lauf = (gewicht: number) => {
    const hk = { ...h, pos: Float64Array.from(h.pos) };
    const loops = s.loops;
    const plan = bindungenAus(hk, loops);
    const start = loops.map((l) => Float64Array.from(l.ruhe));
    const ziele0 = zieleAus(plan, start);
    const loeser = new HautAusKurven(hk, plan.bind, ziele0, null, gewicht, kantenGewichte(hk, loops), kruemmungsKetten(plan, loops), 'gleich', {});
    // Zug wie „Hals“ (form-netzunabhaengig.ts): die obere Kreuzung (alle Loops durch sie) WEIT hoch, 30 Mausschritte mit je einer Runde,
    // dann 4 Runden; ohne Kreuzung der höchste Punkt des ersten Loops
    const mitte = loops.find((l) => l.art === 'mitte') ?? loops[0]!;
    const obenP = mitte.punkte.reduce((b, p) => (p.ref.y > b.ref.y ? p : b));
    const kr = obenP.kreuzung;
    const lagen = (t: number) =>
      start.map((S, k) => {
        const l = loops[k]!;
        const i = kr !== undefined ? l.punkte.findIndex((p) => p.kreuzung === kr) : l === mitte ? l.punkte.indexOf(obenP) : -1;
        if (i < 0) return S;
        const d = punktZug(l, i, { x: 0, y: WEIT * t, z: 0 });
        const out = Float64Array.from(S);
        for (let q = 0; q < out.length; q++) out[q] = out[q]! + d[q]!;
        return out;
      });
    let rhsLetzte: Float64Array | null = null;
    let xLetzte: Float64Array | null = null;
    const sysL = (loeser as unknown as { sys: { loesen: (r: Float64Array) => Float64Array } }).sys;
    const orig = sysL.loesen;
    // eigenes Objekt, damit die gemerkte Zerlegung des Kerns nicht verändert wird
    (loeser as unknown as { sys: unknown }).sys = {
      ...sysL,
      loesen: (r: Float64Array) => {
        rhsLetzte = Float64Array.from(r);
        xLetzte = orig(r);
        return xLetzte;
      },
    };
    for (let k = 1; k <= 30; k++) loeser.schritt(zieleAus(plan, lagen(k / 30)), 1);
    const Z = zieleAus(plan, lagen(1));
    const rest = () => {
      let mx = 0;
      let sm = 0;
      const m = plan.bind.ecken.length / 3;
      for (let j = 0; j < m; j++) {
        const v = plan.bind.ecken[3 * j]!;
        // Ziel der Haut = Haut beim Anlegen + Verschiebung des Ziels (ausKurven.ts 994–996)
        let d2 = 0;
        for (let c = 0; c < 3; c++) {
          const ziel = h.pos[3 * v + c]! + Z[3 * j + c]! - ziele0[3 * j + c]!;
          d2 += (hk.pos[3 * v + c]! - ziel) ** 2;
        }
        const d = Math.sqrt(d2);
        mx = Math.max(mx, d);
        sm += d;
      }
      return [mx, sm / m] as const;
    };
    const nachZug = rest();
    const vorEnde = Float64Array.from(hk.pos);
    loeser.schritt(Z, 4);
    let endrunden = 0;
    for (let v = 0; v < n; v++) endrunden = Math.max(endrunden, Math.hypot(hk.pos[3 * v]! - vorEnde[3 * v]!, hk.pos[3 * v + 1]! - vorEnde[3 * v + 1]!, hk.pos[3 * v + 2]! - vorEnde[3 * v + 2]!));
    const nachEnde = rest();
    // weiter bis zum Stillstand: Bewegung je Runde
    const bew: number[] = [];
    for (let r = 0; r < 40; r++) {
      const vor = Float64Array.from(hk.pos);
      loeser.schritt(Z, 1);
      let b = 0;
      for (let v = 0; v < n; v++) b = Math.max(b, Math.hypot(hk.pos[3 * v]! - vor[3 * v]!, hk.pos[3 * v + 1]! - vor[3 * v + 1]!, hk.pos[3 * v + 2]! - vor[3 * v + 2]!));
      bew.push(b);
    }
    const fertig = rest();
    return { hk, nachZug, nachEnde, endrunden, bew, fertig, rhsLetzte: rhsLetzte as Float64Array | null, xLetzte: xLetzte as Float64Array | null };
  };
  const a = lauf(100);
  console.log(`\nZug (obere Kreuzung ${WEIT} hoch, 30 Mausschritte je 1 Runde, dann 4 Runden), Bindung 100:`);
  console.log(`  Linienpunkte neben ihrem Ziel: nach dem letzten Mausschritt höchstens ${a.nachZug[0].toFixed(3)} (Mittel ${a.nachZug[1].toFixed(4)}), nach den 4 Runden ${a.nachEnde[0].toFixed(3)} (${a.nachEnde[1].toFixed(4)}), nach 40 weiteren ${a.fertig[0].toFixed(3)} (${a.fertig[1].toFixed(4)}) Einheiten`);
  console.log(`  Haut bewegt sich in den 4 Runden beim Loslassen noch ${a.endrunden.toFixed(3)}; danach je Runde: ${a.bew.slice(0, 8).map((x) => x.toFixed(3)).join(' ')} … Runde 20: ${a.bew[19]!.toFixed(4)}, Runde 40: ${a.bew[39]!.toFixed(4)}`);
  for (const g of [1e4, 1e6]) {
    const b = lauf(g);
    let diff = 0;
    for (let v = 0; v < n; v++) diff = Math.max(diff, Math.hypot(a.hk.pos[3 * v]! - b.hk.pos[3 * v]!, a.hk.pos[3 * v + 1]! - b.hk.pos[3 * v + 1]!, a.hk.pos[3 * v + 2]! - b.hk.pos[3 * v + 2]!));
    console.log(`  Bindung ${g.toExponential(0)}: Linienpunkte neben dem Ziel nach dem Zug ${b.nachZug[0].toExponential(2)}, fertig ${b.fertig[0].toExponential(2)}; Haut gegen Bindung 100 (beide nach 44 Runden) höchstens ${diff.toFixed(3)} Einheiten anders; Bewegung beim Loslassen ${b.endrunden.toFixed(3)}; je Runde danach ${b.bew.slice(0, 4).map((x) => x.toFixed(3)).join(' ')} … Runde 40: ${b.bew[39]!.toFixed(4)}`);
  }
  // Dämpfung: dieselbe rechte Seite (letzte Runde) mit ε = 1e-9 (Code), 1e-12, 1e-6
  if (a.rhsLetzte && a.xLetzte) {
    const x9 = systemAusDaten(zerlegungsDaten(n, sys.lagen, 1e-9)).loesen(a.rhsLetzte);
    const x12 = systemAusDaten(zerlegungsDaten(n, sys.lagen, 1e-12)).loesen(a.rhsLetzte);
    const x7 = systemAusDaten(zerlegungsDaten(n, sys.lagen, 1e-7)).loesen(a.rhsLetzte);
    const mx = (p: Float64Array, q: Float64Array) => {
      let m = 0;
      for (let i = 0; i < p.length; i++) m = Math.max(m, Math.abs(p[i]! - q[i]!));
      return m;
    };
    console.log(`Dämpfung, letzte rechte Seite des Zugs: Nachbau (ε 1e-9) gegen den Code ${mx(x9, a.xLetzte).toExponential(2)}; ε 1e-9 gegen 1e-12: ${mx(x9, x12).toExponential(2)} Einheiten; ε 1e-7 gegen 1e-12: ${mx(x7, x12).toExponential(2)}`);
    // Rest der Gleichung in doppelter Genauigkeit (Rückwärtsfehler der Zerlegung)
    const y = new Float64Array(3 * n);
    for (const z of sys.lagen)
      for (let c = 0; c < 3; c++) {
        let t = 0;
        for (let k = 0; k < z.index.length; k++) t += z.wert[k]! * x9[3 * z.index[k]! + c]!;
        t *= z.gewicht;
        for (let k = 0; k < z.index.length; k++) y[3 * z.index[k]! + c] = y[3 * z.index[k]! + c]! + t * z.wert[k]!;
      }
    let r = 0;
    let bmax = 0;
    for (let i = 0; i < 3 * n; i++) {
      r = Math.max(r, Math.abs(y[i]! + 1e-9 * x9[i]! - a.rhsLetzte[i]!));
      bmax = Math.max(bmax, Math.abs(a.rhsLetzte[i]!));
    }
    console.log(`Rest der Normalgleichung (ε 1e-9): ${r.toExponential(2)} bei rechter Seite bis ${bmax.toExponential(2)} (relativ ${(r / bmax).toExponential(1)})`);
  }
}
