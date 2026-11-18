// Form zuerst (09.11.2026), Beweis „Linien mit Richtung“: der Hörner-Zug aus Florians Fall im Kern, ohne Fenster (kein Verdichten, keine
// Stufen). Kugel mit drei Loops; auf dem senkrechten Ring zwei Punkte bei 45° und 65° (vom Scheitel zur Seite), beide in 30 Schritten
// WEIT (Standard 170) nach oben außen gezogen, je Schritt RUNDEN (Standard 2) Runden. Je Schritt: größte Koordinate, Zeit; bricht ab, sobald
// die Haut wegläuft, und nennt dann die Punkte, die am weitesten draußen liegen (Linie, neben der Linie, frei).
// RICHTUNG=1 mit Richtung (sonst wie heute). Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-richtung-horn.ts
import { dreiLoops } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { gewichteAus, hautNormalenMax, vermessen } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, type V3, LoopZug, festlegen, mittlereKante, punktEinfuegen, verschiebungLaengs } from '../../../../packages/shape/src/dicht/loops';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';

const weit = Number(process.env.WEIT ?? 170);
const runden = Number(process.env.RUNDEN ?? 2);
const winkel = (Number(process.env.WINKEL ?? 35) * Math.PI) / 180;
const gewichte = (process.env.GEWICHTE ?? 'gleich') as 'gleich' | 'geometrie';
const start = dreiLoops();
let h = start.h;
let loops: Loop[] = start.loops;
const ring = loops.find((l) => l.art === 'ring' && !l.punkte.every((p) => Math.abs(p.ref.y) < 30))!;
const R = ring.ruhe;
const winkelVon = (j: number) => (Math.atan2(R[3 * j + 2]!, R[3 * j + 1]!) * 180) / Math.PI;
const neu: number[] = [];
for (const w of [45, 65]) {
  let best = 0;
  for (let j = 0; j < ring.s.length; j++) if (Math.abs(winkelVon(j) - w) < Math.abs(winkelVon(best) - w)) best = j;
  const p = punktEinfuegen(ring, ring.s[best]!);
  neu.push(ring.punkte.indexOf(p));
}
const gezogen = new Set(neu.map((i) => ring.punkte[i]!));
const rich: V3 = { x: 0, y: Math.cos(winkel), z: Math.sin(winkel) };
const z = new LoopZug(h, loops, null, true, 'kurven', gewichte, process.env.RICHTUNG ? { richtung: true } : {});
const ringI = loops.indexOf(ring);
for (let k = 1; k <= 30; k++) {
  const f = (weit * k) / 30;
  const D: V3[] = ring.punkte.map((p) => (gezogen.has(p) ? { x: rich.x * f, y: rich.y * f, z: rich.z * f } : { x: 0, y: 0, z: 0 }));
  const versch = loops.map((_, i) => (i === ringI ? verschiebungLaengs(ring, D) : null));
  const t0 = performance.now();
  z.schritt(versch, runden);
  const ms = performance.now() - t0;
  let gross = 0;
  let iw = 0;
  for (let v = 0; v < h.n; v++) {
    const r = Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!);
    if (!(r <= gross)) {
      gross = r;
      iw = v;
    }
  }
  console.log(`Schritt ${k}: gezogen ${f.toFixed(0)}, größter Abstand zur Mitte ${gross.toFixed(1)} (Punkt ${iw}), ${ms.toFixed(0)} ms`);
  // DIAG=<ab Schritt>: Richtung an den Linien gegen die Normale der Haut, Werte je Seite, Neigung
  if (process.env.DIAG && k >= Number(process.env.DIAG)) {
    const L = z.loeser as unknown as {
      richtung: Float64Array | null;
      seitenMessen(rn: Float64Array, hn: Float64Array, kap: Float64Array): { je: Map<number, { werte: Float64Array; neigung: Float64Array }>; mittel: Map<number, number> };
    };
    const rn = L.richtung!;
    const hn = hautNormalenMax(h);
    let wmax = 0;
    let wo = -1;
    for (let v = 0; v < h.n; v++) {
      if (Number.isNaN(rn[3 * v]!)) continue;
      const c = rn[3 * v]! * hn[3 * v]! + rn[3 * v + 1]! * hn[3 * v + 1]! + rn[3 * v + 2]! * hn[3 * v + 2]!;
      const w = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
      if (w > wmax) {
        wmax = w;
        wo = v;
      }
    }
    const S = L.seitenMessen(rn, hn, vermessen(h, gewichteAus(h, null), hn).kap);
    let kmin = Infinity;
    let kmax = -Infinity;
    let nmax = 0;
    let kwo = -1;
    for (const [v, e] of S.je)
      for (let q = 0; q < e.werte.length; q++) {
        const x = e.werte[q]! * 300;
        if (Number.isNaN(x)) continue;
        if (x < kmin || x > kmax) kwo = v;
        kmin = Math.min(kmin, x);
        kmax = Math.max(kmax, x);
        nmax = Math.max(nmax, Math.hypot(e.neigung[2 * q]!, e.neigung[2 * q + 1]!));
      }
    // Krümmung des Felds (letzte Runde): größter Betrag und wo; Art des weitesten Punkts
    const c = (z.loeser as unknown as { letzteKruemmung: Float64Array }).letzteKruemmung;
    let cm = 0;
    let cwo = -1;
    for (let v = 0; v < h.n; v++)
      if (Math.abs(c[v]! * 300) > cm) {
        cm = Math.abs(c[v]! * 300);
        cwo = v;
      }
    const art = (v: number) =>
      !Number.isNaN(rn[3 * v]!) ? 'Linie' : h.nachbarn[v]!.some((j) => !Number.isNaN(rn[3 * j]!)) ? 'neben der Linie' : 'frei';
    console.log(`  Feld ×300 bis ${cm.toFixed(2)} bei (${[0, 1, 2].map((q) => h.pos[3 * cwo + q]!.toFixed(0)).join(',')}, ${art(cwo)}); weitester Punkt: ${art(iw)}`);
    const lage = (v: number) => [0, 1, 2].map((q) => h.pos[3 * v + q]!.toFixed(0)).join(',');
    console.log(
      `  Richtung gegen Haut: größte ${wmax.toFixed(1)}° bei (${lage(wo)}); Seiten ×300 ${kmin.toFixed(2)} … ${kmax.toFixed(2)} (äußerster bei ${lage(kwo)}), Neigung bis ${nmax.toFixed(3)}`,
    );
  }
  if (!(gross < 1000)) {
    console.log('weggelaufen');
    break;
  }
}

// NACH=<Runden>: wie das Fenster nach dem Loslassen — Linien festlegen, verdichten, neu anlegen und Runden rechnen
if (process.env.NACH) {
  for (const l of loops) festlegen(h, l, false);
  const MK = mittlereKante(start.h);
  const v = verdichten(h, loops, 1.75 * MK, { kurz: 0.5 * MK, genau: MK / 40 });
  if (v) {
    h = v.haut;
    loops = v.loops;
  }
  console.log(`verdichtet: ${h.n} Punkte`);
  const z2 = new LoopZug(h, loops, null, true, 'kurven', gewichte, process.env.RICHTUNG ? { richtung: true } : {});
  const vorher = Float64Array.from(h.pos);
  for (let k = 1; k <= Number(process.env.NACH); k++) {
    z2.schritt(
      loops.map(() => null),
      1,
    );
    let gross = 0;
    let bew = 0;
    for (let q = 0; q < h.n; q++) {
      gross = Math.max(gross, Math.hypot(h.pos[3 * q]!, h.pos[3 * q + 1]!, h.pos[3 * q + 2]!));
      bew = Math.max(bew, Math.hypot(h.pos[3 * q]! - vorher[3 * q]!, h.pos[3 * q + 1]! - vorher[3 * q + 1]!, h.pos[3 * q + 2]! - vorher[3 * q + 2]!));
    }
    if (k <= 10 || k % 5 === 0) console.log(`  Runde ${k}: bewegt bis ${bew.toFixed(2)}, größter Abstand zur Mitte ${gross.toFixed(1)}`);
    if (process.env.RICHTUNG && k <= 4) {
      const L = z2.loeser as unknown as {
        richtung: Float64Array;
        letzteKruemmung: Float64Array;
        seitenMessen(rn: Float64Array, hn: Float64Array, kap: Float64Array): { je: Map<number, { werte: Float64Array; neigung: Float64Array }> };
      };
      const rn = L.richtung;
      const hn = hautNormalenMax(h);
      const art = (q: number) =>
        !Number.isNaN(rn[3 * q]!) ? 'Linie' : h.nachbarn[q]!.some((j) => !Number.isNaN(rn[3 * j]!)) ? 'neben' : 'frei';
      const lage = (q: number) => [0, 1, 2].map((c) => h.pos[3 * q + c]!.toFixed(0)).join(',');
      let cm = 0;
      let cw = 0;
      for (let q = 0; q < h.n; q++)
        if (Math.abs(L.letzteKruemmung[q]! * 300) > cm) {
          cm = Math.abs(L.letzteKruemmung[q]! * 300);
          cw = q;
        }
      let wmax = 0;
      let ww = 0;
      for (let q = 0; q < h.n; q++) {
        if (Number.isNaN(rn[3 * q]!)) continue;
        const c = rn[3 * q]! * hn[3 * q]! + rn[3 * q + 1]! * hn[3 * q + 1]! + rn[3 * q + 2]! * hn[3 * q + 2]!;
        const w = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
        if (w > wmax) {
          wmax = w;
          ww = q;
        }
      }
      let smax = 0;
      let sw = 0;
      for (const [q, e] of L.seitenMessen(rn, hn, vermessen(h, gewichteAus(h, null), hn).kap).je)
        for (const x of e.werte)
          if (Math.abs(x * 300) > smax) {
            smax = Math.abs(x * 300);
            sw = q;
          }
      console.log(
        `    Feld ×300 bis ${cm.toFixed(1)} bei (${lage(cw)}, ${art(cw)}); Seiten bis ${smax.toFixed(1)} bei (${lage(sw)}); Richtung gegen Haut bis ${wmax.toFixed(1)}° bei (${lage(ww)})`,
      );
    }
    if (!(gross < 1000)) {
      console.log('  weggelaufen');
      break;
    }
  }
}
