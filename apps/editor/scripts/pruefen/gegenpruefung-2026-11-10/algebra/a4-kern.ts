 
// Gegenprüfung „Lineare Algebra“, Messung 4: Rechenkerne. Was bringt besser geschriebenes JavaScript beim Einsetzen (Lösen), was kostet
// eine Runde, welcher Teil einer Zerlegung müsste nach einer örtlichen Netzänderung neu? Dazu die Daten für den Vergleich mit C/WebAssembly.
// Aufruf: cd packages/shape && npx vite-node <dieses Skript>     DREIECKE=6000,14000   AUSGABE=<Ordner für die Binärdaten>
import { writeFileSync } from 'node:fs';
import { HautAusKurven } from '../../../../../../packages/shape/src/dicht/ausKurven';
import { bindungenAus, kantenGewichte, kruemmungsKetten, zieleAus } from '../../../../../../packages/shape/src/dicht/loops';
import { systemAusDaten, zerlegungsDaten } from '../../../../../../packages/shape/src/loeser/zerlegung';
import type { NormalZeile } from '../../../../../../packages/shape/src/loeser/normalSystem';
import { dreiLoops, f, graphAus, median, symbolik, systemeAus } from './gemeinsam';

const groessen = (process.env.DREIECKE ?? '6000,14000').split(',').map(Number);
const ausgabe = process.env.AUSGABE;

const mess = (fn: () => void, w = 40): [number, number] => {
  const t: number[] = [];
  for (let k = 0; k < w; k++) {
    const a = performance.now();
    fn();
    t.push(performance.now() - a);
  }
  return [median(t), Math.min(...t)];
};

/** obere Hälfte der umgeordneten Matrix spaltenweise (wie zerlegung.ts 154–207) */
function obereHaelfte(n: number, zeilen: readonly NormalZeile[], perm: Int32Array, daempfung: number): { Cp: Int32Array; Ci: Int32Array; Cx: Float64Array } {
  const ip = new Int32Array(n);
  for (let k = 0; k < n; k++) ip[perm[k]!] = k;
  const sp: Map<number, number>[] = Array.from({ length: n }, () => new Map());
  for (const z of zeilen)
    for (let s = 0; s < z.index.length; s++) {
      const ka = ip[z.index[s]!]!;
      const ga = z.gewicht * z.wert[s]!;
      for (let t = 0; t < z.index.length; t++) {
        const kb = ip[z.index[t]!]!;
        if (kb <= ka) sp[ka]!.set(kb, (sp[ka]!.get(kb) ?? 0) + ga * z.wert[t]!);
      }
    }
  const Cp = new Int32Array(n + 1);
  for (let k = 0; k < n; k++) {
    if (!sp[k]!.has(k)) sp[k]!.set(k, 0);
    Cp[k + 1] = Cp[k]! + sp[k]!.size;
  }
  const Ci = new Int32Array(Cp[n]!);
  const Cx = new Float64Array(Cp[n]!);
  for (let k = 0; k < n; k++) {
    const e = [...sp[k]!].sort((a, b) => a[0] - b[0]);
    e.forEach(([i, x], q) => {
      Ci[Cp[k]! + q] = i;
      Cx[Cp[k]! + q] = i === k ? x + daempfung : x;
    });
  }
  return { Cp, Ci, Cx };
}

/** Zerlegen wie zerlegung.ts 210–280 (Baum, Muster, Werte), als eigene Funktion zum Messen und für den Vergleich mit C */
function chol(n: number, Cp: Int32Array, Ci: Int32Array, Cx: Float64Array): { Lp: Int32Array; Li: Int32Array; Lx: Float64Array; eltern: Int32Array; zeilenOps: Float64Array } {
  const eltern = new Int32Array(n).fill(-1);
  const vorfahr = new Int32Array(n).fill(-1);
  for (let k = 0; k < n; k++)
    for (let p = Cp[k]!; p < Cp[k + 1]! - 1; p++) {
      let i = Ci[p]!;
      while (i !== -1 && i < k) {
        const weiter = vorfahr[i]!;
        vorfahr[i] = k;
        if (weiter === -1) eltern[i] = k;
        i = weiter;
      }
    }
  const merk = new Int32Array(n).fill(-1);
  const anzahl = new Int32Array(n).fill(1);
  for (let k = 0; k < n; k++) {
    merk[k] = k;
    for (let p = Cp[k]!; p < Cp[k + 1]! - 1; p++) {
      let i = Ci[p]!;
      while (merk[i] !== k) {
        anzahl[i] = anzahl[i]! + 1;
        merk[i] = k;
        i = eltern[i]!;
      }
    }
  }
  const Lp = new Int32Array(n + 1);
  for (let j = 0; j < n; j++) Lp[j + 1] = Lp[j]! + anzahl[j]!;
  const Li = new Int32Array(Lp[n]!);
  const Lx = new Float64Array(Lp[n]!);
  const frei = Lp.slice(0, n);
  const x = new Float64Array(n);
  const muster = new Int32Array(n);
  const pfad = new Int32Array(n);
  const zeilenOps = new Float64Array(n);
  merk.fill(-1);
  for (let k = 0; k < n; k++) {
    let oben = n;
    merk[k] = k;
    for (let p = Cp[k]!; p < Cp[k + 1]!; p++) {
      let i = Ci[p]!;
      x[i] = Cx[p]!;
      if (i === k) continue;
      let len = 0;
      while (merk[i] !== k) {
        pfad[len++] = i;
        merk[i] = k;
        i = eltern[i]!;
      }
      while (len > 0) muster[--oben] = pfad[--len]!;
    }
    let d = x[k]!;
    x[k] = 0;
    let ops = 0;
    for (; oben < n; oben++) {
      const i = muster[oben]!;
      const lki = x[i]! / Lx[Lp[i]!]!;
      x[i] = 0;
      const ende = frei[i]!;
      for (let p = Lp[i]! + 1; p < ende; p++) x[Li[p]!] = x[Li[p]!]! - Lx[p]! * lki;
      ops += ende - Lp[i]!;
      d -= lki * lki;
      frei[i] = ende + 1;
      Li[ende] = k;
      Lx[ende] = lki;
    }
    zeilenOps[k] = ops;
    if (!(d > 0)) throw new Error(`nicht positiv definit in Zeile ${k}`);
    const p = frei[k]!;
    frei[k] = p + 1;
    Li[p] = k;
    Lx[p] = Math.sqrt(d);
  }
  return { Lp, Li, Lx, eltern, zeilenOps };
}

/** V1: drei Spalten ausgeschrieben, drei getrennte Felder; vorwärts spaltenweise (streuen), rückwärts sammeln */
function loesen3(n: number, Lp: Int32Array, Li: Int32Array, Lx: Float64Array, b0: Float64Array, b1: Float64Array, b2: Float64Array): void {
  for (let j = 0; j < n; j++) {
    const a = Lp[j]!;
    const e = Lp[j + 1]!;
    const d = 1 / Lx[a]!;
    const y0 = b0[j]! * d;
    const y1 = b1[j]! * d;
    const y2 = b2[j]! * d;
    b0[j] = y0;
    b1[j] = y1;
    b2[j] = y2;
    for (let p = a + 1; p < e; p++) {
      const l = Lx[p]!;
      const i = Li[p]!;
      b0[i] = b0[i]! - l * y0;
      b1[i] = b1[i]! - l * y1;
      b2[i] = b2[i]! - l * y2;
    }
  }
  for (let j = n - 1; j >= 0; j--) {
    const a = Lp[j]!;
    const e = Lp[j + 1]!;
    let s0 = b0[j]!;
    let s1 = b1[j]!;
    let s2 = b2[j]!;
    for (let p = a + 1; p < e; p++) {
      const l = Lx[p]!;
      const i = Li[p]!;
      s0 -= l * b0[i]!;
      s1 -= l * b1[i]!;
      s2 -= l * b2[i]!;
    }
    const d = 1 / Lx[a]!;
    b0[j] = s0 * d;
    b1[j] = s1 * d;
    b2[j] = s2 * d;
  }
}

/** Superknoten: aufeinanderfolgende Spalten mit verschachtelt gleichem Muster; dichte Blöcke (Dreieck D, Rechteck R zeilenweise) */
type Super = {
  anzahl: number;
  /** je Superknoten: erste Spalte, Breite s, Zeilen darunter r, Stelle von D und R im Wertefeld, Stelle der Zeilenliste */
  j0: Int32Array;
  s: Int32Array;
  r: Int32Array;
  oD: Int32Array;
  oR: Int32Array;
  oZ: Int32Array;
  zeilen: Int32Array;
  werte: Float64Array;
};
function superknoten(n: number, Lp: Int32Array, Li: Int32Array, Lx: Float64Array, maxBreite = 64): Super {
  const j0: number[] = [];
  const s: number[] = [];
  const r: number[] = [];
  for (let j = 0; j < n; ) {
    let e = j;
    while (e + 1 < n && e + 1 - j < maxBreite && Lp[e + 1]! - Lp[e]! === Lp[e + 2]! - Lp[e + 1]! + 1 && Li[Lp[e]! + 1] === e + 1) e++;
    j0.push(j);
    s.push(e - j + 1);
    r.push(Lp[e + 1]! - Lp[e]! - 1);
    j = e + 1;
  }
  const m = j0.length;
  const oD = new Int32Array(m);
  const oR = new Int32Array(m);
  const oZ = new Int32Array(m);
  let w = 0;
  let z = 0;
  for (let k = 0; k < m; k++) {
    oD[k] = w;
    w += s[k]! * s[k]!;
    oR[k] = w;
    w += r[k]! * s[k]!;
    oZ[k] = z;
    z += r[k]!;
  }
  const werte = new Float64Array(w);
  const zeilen = new Int32Array(z);
  for (let k = 0; k < m; k++) {
    const a = j0[k]!;
    const sk = s[k]!;
    const rk = r[k]!;
    for (let c = 0; c < sk; c++) {
      const p0 = Lp[a + c]!;
      for (let q = c; q < sk; q++) werte[oD[k]! + q * sk + c] = Lx[p0 + (q - c)]!;
      for (let q = 0; q < rk; q++) werte[oR[k]! + q * sk + c] = Lx[p0 + (sk - c) + q]!;
    }
    const pl = Lp[a + sk - 1]!;
    for (let q = 0; q < rk; q++) zeilen[oZ[k]! + q] = Li[pl + 1 + q]!;
  }
  return { anzahl: m, j0: Int32Array.from(j0), s: Int32Array.from(s), r: Int32Array.from(r), oD, oR, oZ, zeilen, werte };
}

/** V3: Einsetzen über Superknoten, drei Spalten (getrennte Felder) */
function loesenSuper(S: Super, b0: Float64Array, b1: Float64Array, b2: Float64Array, y: Float64Array): void {
  const { anzahl, j0, s, r, oD, oR, oZ, zeilen, werte } = S;
  for (let k = 0; k < anzahl; k++) {
    const a = j0[k]!;
    const sk = s[k]!;
    const rk = r[k]!;
    const D = oD[k]!;
    // dichtes Dreieck vorwärts
    for (let q = 0; q < sk; q++) {
      let t0 = b0[a + q]!;
      let t1 = b1[a + q]!;
      let t2 = b2[a + q]!;
      const z = D + q * sk;
      for (let c = 0; c < q; c++) {
        const l = werte[z + c]!;
        t0 -= l * y[3 * c]!;
        t1 -= l * y[3 * c + 1]!;
        t2 -= l * y[3 * c + 2]!;
      }
      const d = 1 / werte[z + q]!;
      t0 *= d;
      t1 *= d;
      t2 *= d;
      y[3 * q] = t0;
      y[3 * q + 1] = t1;
      y[3 * q + 2] = t2;
      b0[a + q] = t0;
      b1[a + q] = t1;
      b2[a + q] = t2;
    }
    // Zeilen darunter
    const R = oR[k]!;
    const Z = oZ[k]!;
    for (let q = 0; q < rk; q++) {
      const z = R + q * sk;
      let t0 = 0;
      let t1 = 0;
      let t2 = 0;
      for (let c = 0; c < sk; c++) {
        const l = werte[z + c]!;
        t0 += l * y[3 * c]!;
        t1 += l * y[3 * c + 1]!;
        t2 += l * y[3 * c + 2]!;
      }
      const i = zeilen[Z + q]!;
      b0[i] = b0[i]! - t0;
      b1[i] = b1[i]! - t1;
      b2[i] = b2[i]! - t2;
    }
  }
  for (let k = anzahl - 1; k >= 0; k--) {
    const a = j0[k]!;
    const sk = s[k]!;
    const rk = r[k]!;
    const D = oD[k]!;
    const R = oR[k]!;
    const Z = oZ[k]!;
    for (let c = 0; c < sk; c++) {
      y[3 * c] = b0[a + c]!;
      y[3 * c + 1] = b1[a + c]!;
      y[3 * c + 2] = b2[a + c]!;
    }
    for (let q = 0; q < rk; q++) {
      const i = zeilen[Z + q]!;
      const x0 = b0[i]!;
      const x1 = b1[i]!;
      const x2 = b2[i]!;
      const z = R + q * sk;
      for (let c = 0; c < sk; c++) {
        const l = werte[z + c]!;
        y[3 * c] = y[3 * c]! - l * x0;
        y[3 * c + 1] = y[3 * c + 1]! - l * x1;
        y[3 * c + 2] = y[3 * c + 2]! - l * x2;
      }
    }
    for (let q = sk - 1; q >= 0; q--) {
      const d = 1 / werte[D + q * sk + q]!;
      const x0 = y[3 * q]! * d;
      const x1 = y[3 * q + 1]! * d;
      const x2 = y[3 * q + 2]! * d;
      b0[a + q] = x0;
      b1[a + q] = x1;
      b2[a + q] = x2;
      const z = D + q * sk;
      for (let c = 0; c < q; c++) {
        const l = werte[z + c]!;
        y[3 * c] = y[3 * c]! - l * x0;
        y[3 * c + 1] = y[3 * c + 1]! - l * x1;
        y[3 * c + 2] = y[3 * c + 2]! - l * x2;
      }
    }
  }
}

for (const d of groessen) {
  const st = dreiLoops(d);
  const sys = systemeAus(st);
  const n = st.h.n;
  console.log(`\n## ${f(n)} Punkte (Kugel, drei Loops)`);
  const daten = zerlegungsDaten(n, sys.lagen, 1e-9);
  const { perm, Lp, Li, Lx } = daten;
  const nnzL = Lp[n]!;
  // ---- Zerlegen: Teile ----
  const C = obereHaelfte(n, sys.lagen, perm, 1e-9);
  const eigen = chol(n, C.Cp, C.Ci, C.Cx);
  let dL = 0;
  for (let p = 0; p < nnzL; p++) dL = Math.max(dL, Math.abs(eigen.Lx[p]! - Lx[p]!));
  console.log(`Nachbau der Zerlegung gegen den Code: nnz(L) ${eigen.Lp[n] === nnzL ? 'gleich' : 'VERSCHIEDEN'}, größter Unterschied der Werte ${dL.toExponential(1)}`);
  const zt: { auf: number; zer: number }[] = [];
  for (let k = 0; k < 7; k++) {
    const x = zerlegungsDaten(n, sys.lagen, 1e-9);
    zt.push({ auf: x.zeitAufbau, zer: x.zeitZerlegen });
  }
  const [cm, cmin] = mess(() => chol(n, C.Cp, C.Ci, C.Cx), 7);
  let ops = 0;
  for (let k = 0; k < n; k++) ops += eigen.zeilenOps[k]!;
  console.log(
    `Zerlegen im Kern (Median/Minimum aus 7, mit Vorbehalt): Aufbau ${median(zt.map((z) => z.auf)).toFixed(1)} / ${Math.min(...zt.map((z) => z.auf)).toFixed(1)} ms, Baum + Muster + Werte ${median(zt.map((z) => z.zer)).toFixed(1)} / ${Math.min(...zt.map((z) => z.zer)).toFixed(1)} ms; Nachbau allein ${cm.toFixed(1)} / ${cmin.toFixed(1)} ms; innere Schleife ${f(ops / 1e6, 1)} Mio. Durchläufe`,
  );
  // ---- örtliche Änderung: welcher Teil der Zeilen von L müsste neu? ----
  {
    const ip = new Int32Array(n);
    for (let k = 0; k < n; k++) ip[perm[k]!] = k;
    const anteile: number[] = [];
    const zahl: number[] = [];
    const h = st.h;
    for (let probe = 0; probe < 60; probe++) {
      // Fleck: ein Punkt mit seinen Nachbarn bis zum Ring `ringe` (≈ 20–60 Punkte), dazu zwei Ringe (so weit reicht eine geänderte Zeile)
      const start = Math.floor(((probe + 0.5) / 60) * n);
      const drin = new Uint8Array(n);
      let rand = [start];
      drin[start] = 1;
      for (let ring = 0; ring < 5; ring++) {
        const neu: number[] = [];
        for (const v of rand)
          for (const j of h.nachbarn[v]!) {
            if (drin[j]) continue;
            drin[j] = 1;
            neu.push(j);
          }
        rand = neu;
      }
      const neuZ = new Uint8Array(n);
      let geaendert = 0;
      for (let v = 0; v < n; v++) {
        if (!drin[v]) continue;
        geaendert++;
        for (let k = ip[v]!; k !== -1 && !neuZ[k]; k = eigen.eltern[k]!) neuZ[k] = 1;
      }
      let o = 0;
      for (let k = 0; k < n; k++) if (neuZ[k]) o += eigen.zeilenOps[k]!;
      anteile.push(o / ops);
      zahl.push(geaendert);
    }
    console.log(
      `Örtliche Änderung (Fleck von im Mittel ${f(zahl.reduce((a, b) => a + b, 0) / zahl.length)} Punkten, 60 Stellen): neu zu rechnen wären die Zeilen aller Vorfahren im Eliminationsbaum = ${(Math.min(...anteile) * 100).toFixed(0)}–${(Math.max(...anteile) * 100).toFixed(0)} % der Rechenarbeit (Median ${(median(anteile) * 100).toFixed(0)} %)`,
    );
  }
  // ---- Superknoten ----
  const S = superknoten(n, Lp, Li, Lx);
  let gross = 0;
  for (let k = 0; k < S.anzahl; k++) if (S.s[k]! >= 4) gross += S.s[k]! * (S.s[k]! + 1) / 2 + S.s[k]! * S.r[k]!;
  console.log(`Superknoten: ${f(S.anzahl)} für ${f(n)} Spalten (im Mittel ${(n / S.anzahl).toFixed(1)} breit), ${((gross / nnzL) * 100).toFixed(0)} % der Einträge von L in Superknoten ab Breite 4; dichte Blöcke ${f(S.werte.length)} Werte gegen nnz(L) ${f(nnzL)}`);
  // ---- Lösen: Varianten ----
  const rhs = Float64Array.from({ length: 3 * n }, (_, i) => Math.sin(i * 0.37) * 50);
  const sysObj = systemAusDaten(daten);
  const x0 = sysObj.loesenSpalten(rhs, 3);
  const b0 = new Float64Array(n);
  const b1 = new Float64Array(n);
  const b2 = new Float64Array(n);
  const laden = () => {
    for (let j = 0; j < n; j++) {
      const v = perm[j]!;
      b0[j] = rhs[3 * v]!;
      b1[j] = rhs[3 * v + 1]!;
      b2[j] = rhs[3 * v + 2]!;
    }
  };
  const out = new Float64Array(3 * n);
  const zurueck = () => {
    for (let j = 0; j < n; j++) {
      const v = perm[j]!;
      out[3 * v] = b0[j]!;
      out[3 * v + 1] = b1[j]!;
      out[3 * v + 2] = b2[j]!;
    }
  };
  const abw = () => {
    let m = 0;
    for (let i = 0; i < 3 * n; i++) m = Math.max(m, Math.abs(out[i]! - x0[i]!));
    return m;
  };
  laden();
  loesen3(n, Lp, Li, Lx, b0, b1, b2);
  zurueck();
  const a1 = abw();
  const y = new Float64Array(3 * 64);
  laden();
  loesenSuper(S, b0, b1, b2, y);
  zurueck();
  const a3 = abw();
  // abwechselnd messen (gleiche Störungen für alle)
  const t0: number[] = [];
  const t1: number[] = [];
  const t3: number[] = [];
  for (let w = 0; w < 60; w++) {
    let a = performance.now();
    sysObj.loesenSpalten(rhs, 3);
    t0.push(performance.now() - a);
    a = performance.now();
    laden();
    loesen3(n, Lp, Li, Lx, b0, b1, b2);
    zurueck();
    t1.push(performance.now() - a);
    a = performance.now();
    laden();
    loesenSuper(S, b0, b1, b2, y);
    zurueck();
    t3.push(performance.now() - a);
  }
  console.log('| Lösen, 3 Spalten (JavaScript) | Median ms | Minimum ms | Unterschied zum Code |');
  console.log('| --- | --- | --- | --- |');
  console.log(`| Code heute (\`loesenSpalten(rhs, 3)\`, zerlegung.ts 289–318) | ${median(t0).toFixed(2)} | ${Math.min(...t0).toFixed(2)} | – |`);
  console.log(`| drei Spalten ausgeschrieben, getrennte Felder | ${median(t1).toFixed(2)} | ${Math.min(...t1).toFixed(2)} | ${a1.toExponential(1)} |`);
  console.log(`| Superknoten (dichte Blöcke bis 64 breit) | ${median(t3).toFixed(2)} | ${Math.min(...t3).toFixed(2)} | ${a3.toExponential(1)} |`);
  // ---- eine ganze Runde des Lösers (gleich), in Ruhe ----
  {
    const hk = { ...st.h, pos: Float64Array.from(st.h.pos) };
    const plan = bindungenAus(hk, st.loops);
    const Z = zieleAus(plan, st.loops.map((l) => Float64Array.from(l.ruhe)));
    const loeser = new HautAusKurven(hk, plan.bind, Z, null, 100, kantenGewichte(hk, st.loops), kruemmungsKetten(plan, st.loops), 'gleich', {});
    loeser.schritt(Z, 3);
    const zt0 = { ...loeser.zeiten };
    const [rm, rmin] = mess(() => loeser.schritt(Z, 1), 30);
    const runden = loeser.zeiten.runden - zt0.runden;
    console.log(
      `Eine Runde des Lösers „gleich“ (ganze Haut, in Ruhe): Median ${rm.toFixed(2)} / Minimum ${rmin.toFixed(2)} ms; davon Lagen lösen ${((loeser.zeiten.loesen - zt0.loesen) / runden).toFixed(2)} ms, vermessen ${((loeser.zeiten.vermessen - zt0.vermessen) / runden).toFixed(2)} ms (Mittel)`,
    );
  }
  // ---- Daten für C / WebAssembly ----
  if (ausgabe) {
    const kopf = Int32Array.from([n, C.Cp[n]!, nnzL, S.anzahl, S.werte.length, S.zeilen.length]);
    const teile: ArrayBufferView[] = [kopf, C.Cp, C.Ci, C.Cx, Lp, Li, Lx, perm, rhs, S.j0, S.s, S.r, S.oD, S.oR, S.oZ, S.zeilen, S.werte, x0];
    const bytes = teile.reduce((a, t) => a + t.byteLength + ((8 - (t.byteLength % 8)) % 8), 0);
    const buf = new Uint8Array(bytes);
    let o = 0;
    for (const t of teile) {
      buf.set(new Uint8Array(t.buffer, t.byteOffset, t.byteLength), o);
      o += t.byteLength + ((8 - (t.byteLength % 8)) % 8);
    }
    const datei = `${ausgabe}/matrix-${n}.bin`;
    writeFileSync(datei, buf);
    console.log(`Daten für C/WebAssembly: ${datei} (${f(bytes / 1e6, 1)} MB)`);
  }
}
void graphAus;
void symbolik;
