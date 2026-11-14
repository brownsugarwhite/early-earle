// Form zuerst (10.11.2026), G5 Teil 1: die Güte des dichten Netzes an gesicherten Wesen (`wesen/<Name>.eewesen`, „Sichern“ im
// Fenster). Gegenprüfung, Befund 4 zu G3: „zuerst die Güte des Netzes ansehen (kurze Kanten, Punkte mit drei oder vier Nachbarn,
// spitze Dreiecke), dann die Zahl der Punkte.“ Das Skript liest nur; gemessen wird die Grundform (bei einem Wesen, das in der
// Fressen-Pose gesichert wurde, dazu kurz die Pose).
//
// Je Wesen:
//   1  wie viele Punkte, auf wie viel Fläche, gegen ein gleichmäßiges Netz mit der Startkante
//   2  Kanten nach Länge gegen die Regeln des Verdichtens (über 1,75 Startkanten teilen, unter 0,5 zusammenlegen, auf Linien erst
//      unter 0,25; Linien werden bis MK/40 genau aufgelöst, hinunter bis 0,11)
//   3  wo die Punkte liegen: nach dem Abstand zur nächsten Linie (längs der Fläche), mit der Dichte gegen das Startnetz
//   4  Güte: Nachbarn je Punkt, kleinste Winkel, schmale Dreiecke; getrennt an den Linien und fern von ihnen
//   5  Fehler: offene Kanten, entartete und umgeklappte Dreiecke, doppelte Punkte, Spiegel; unruhige Stellen mit Ort
//   6  wie rund die Fläche ist: Drehung der Normale und Sehnenfehler je Kante (zu grob?), und eine Schätzung, wie viele Punkte für
//      einen festen Sehnenfehler genügten (zu dicht?). Die Fehler in Einheiten, für jede Startkante dieselben: 0,2 (so genau löst
//      das Standardnetz seine Linien auf, ein halbes Pixel bei 300 %) und 0,8; Kante höchstens 15 (so lang darf sie im Standardnetz
//      werden)
//   7  die Linien: Punkte, Proben, Abstand der Proben
// Aufruf aus packages/shape:
//   npx vite-node ../../apps/editor/scripts/pruefen/form-netzguete.ts
//   WESEN="Name,Name" (Standard: alle im Ordner)   ORDNER=<anderer Ordner als wesen/, z. B. der der Probewesen>
//   DATEI=<pfad zu einer .eewesen>   BILD=<ordner>: dort je Wesen <Name>-netz.html (drei Ansichten, Dreiecke nach Dichte gefärbt,
//   Linien, unruhige Stellen; als Bild aus apps/editor: node scripts/pruefen/html-shot.mjs --jpg <datei.html>)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Haut } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, kanteBei } from '../../../../packages/shape/src/dicht/loops';
import { type WesenStand, auskunft, entpacken } from '../../src/form/ablage';
import { guete, gueteZeile, quantil, spiegelCheck, topoCheck } from './gegenpruefung-2026-11-10/netz/netzstat';

const ordner = process.env.ORDNER ? path.resolve(process.env.ORDNER) : fileURLToPath(new URL('../../../../wesen/', import.meta.url));
const z = (x: number, d = 0): string => x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const pz = (x: number): string => `${z(100 * x, 1)} %`;
const WURZEL3 = Math.sqrt(3);

type FlacheHaut = WesenStand['haut'];
const hautVon = (f: FlacheHaut): Haut => {
  const nachbarn: number[][] = new Array<number[]>(f.n);
  for (let v = 0; v < f.n; v++) nachbarn[v] = Array.from(f.nb.subarray(f.nbStart[v]!, f.nbStart[v + 1]!));
  return { pos: f.pos, tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel };
};

/** kürzeste Wege längs der Kanten von einer Menge von Punkten aus (Dijkstra) */
function abstaende(h: Haut, start: Uint8Array): Float64Array {
  const P = h.pos;
  const d = new Float64Array(h.n).fill(Infinity);
  // Haufen aus (Abstand, Punkt)
  const hd: number[] = [];
  const hv: number[] = [];
  const rein = (x: number, v: number): void => {
    let i = hd.length;
    hd.push(x);
    hv.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hd[p]! <= x) break;
      hd[i] = hd[p]!;
      hv[i] = hv[p]!;
      i = p;
    }
    hd[i] = x;
    hv[i] = v;
  };
  const raus = (): [number, number] => {
    const x = hd[0]!;
    const v = hv[0]!;
    const lx = hd.pop()!;
    const lv = hv.pop()!;
    const n = hd.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let k = 2 * i + 1;
        if (k >= n) break;
        if (k + 1 < n && hd[k + 1]! < hd[k]!) k++;
        if (hd[k]! >= lx) break;
        hd[i] = hd[k]!;
        hv[i] = hv[k]!;
        i = k;
      }
      hd[i] = lx;
      hv[i] = lv;
    }
    return [x, v];
  };
  for (let v = 0; v < h.n; v++)
    if (start[v]) {
      d[v] = 0;
      rein(0, v);
    }
  while (hd.length) {
    const [x, v] = raus();
    if (x > d[v]!) continue;
    for (const w of h.nachbarn[v]!) {
      const y = x + Math.hypot(P[3 * v]! - P[3 * w]!, P[3 * v + 1]! - P[3 * w + 1]!, P[3 * v + 2]! - P[3 * w + 2]!);
      if (y < d[w]!) {
        d[w] = y;
        rein(y, w);
      }
    }
  }
  return d;
}

type Stelle = { ort: [number, number, number]; dreiecke: number; winkel: number; umgeklappt: number; wenigNachbarn: number; kante: number; zurLinie: number };
type Kurz = {
  name: string;
  punkte: number;
  gleich: number;
  faktor: number;
  anLinien: number;
  dichteNah: number;
  dichteFern: number;
  unter5: number;
  nachbarn34: number;
  umgeklappt: number;
  stellen: number;
  genug: number;
  genugGrob: number;
  zuGrob: number;
};

function messen(name: string, st: WesenStand, herkunft: string): { text: string; kurz: Kurz; bild: string } {
  const aus: string[] = [];
  const sag = (s = ''): void => void aus.push(s);
  const g = st.grund ?? { haut: st.haut, loops: st.loops };
  const h = hautVon(g.haut);
  const loops: Loop[] = g.loops;
  const MK = st.mk;
  const P = h.pos;
  const T = h.tri;
  const n = h.n;
  const m = T.length / 3;
  const L = (a: number, b: number): number => Math.hypot(P[3 * a]! - P[3 * b]!, P[3 * a + 1]! - P[3 * b + 1]!, P[3 * a + 2]! - P[3 * b + 2]!);

  // ---------- Flächen, Normalen, Anteil je Punkt ----------
  const FN = new Float64Array(3 * m);
  const FA = new Float64Array(m);
  const VN = new Float64Array(3 * n);
  const anteil = new Float64Array(n);
  for (let t = 0; t < m; t++) {
    const a = T[3 * t]!;
    const b = T[3 * t + 1]!;
    const c = T[3 * t + 2]!;
    const ab = [P[3 * b]! - P[3 * a]!, P[3 * b + 1]! - P[3 * a + 1]!, P[3 * b + 2]! - P[3 * a + 2]!];
    const ac = [P[3 * c]! - P[3 * a]!, P[3 * c + 1]! - P[3 * a + 1]!, P[3 * c + 2]! - P[3 * a + 2]!];
    const f = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
    const l = Math.hypot(f[0]!, f[1]!, f[2]!);
    FA[t] = l / 2;
    for (let k = 0; k < 3; k++) {
      FN[3 * t + k] = f[k]!;
      for (const v of [a, b, c]) VN[3 * v + k] = VN[3 * v + k]! + f[k]!;
    }
    for (const v of [a, b, c]) anteil[v] = anteil[v]! + l / 6;
  }
  for (let v = 0; v < n; v++) {
    const l = Math.hypot(VN[3 * v]!, VN[3 * v + 1]!, VN[3 * v + 2]!) || 1;
    for (let k = 0; k < 3; k++) VN[3 * v + k] = VN[3 * v + k]! / l;
  }
  const flaeche = FA.reduce((s, x) => s + x, 0);
  // so viel Fläche hat ein Punkt in einem gleichmäßigen Netz gleichseitiger Dreiecke mit der Startkante
  const jePunkt = (WURZEL3 / 2) * MK * MK;
  const gleich = flaeche / jePunkt;

  // ---------- Linien: Punkte der Ketten (mit Spiegelbild), harte Stellen ----------
  const kette = new Uint8Array(n);
  const hart = new Uint8Array(n);
  let probenNeben = 0;
  for (const l of loops) {
    const k = kanteBei(l, loops);
    l.proben.forEach((p, j) => {
      const v = p.ecken[0];
      if (p.b[0] < 0.999) probenNeben++;
      const s = h.spiegel[v]!;
      kette[v] = 1;
      if (s >= 0) kette[s] = 1;
      if (k[j]) {
        hart[v] = 1;
        if (s >= 0) hart[s] = 1;
      }
    });
  }
  const anKette = kette.reduce((s, x) => s + x, 0);
  const zurLinie = anKette > 0 ? abstaende(h, kette) : new Float64Array(n).fill(Infinity);

  // ---------- 1 Zahl der Punkte ----------
  const kantenAlle: number[] = [];
  const lokal = new Float64Array(n);
  for (let v = 0; v < n; v++) {
    let s = 0;
    for (const w of h.nachbarn[v]!) {
      const l = L(v, w);
      s += l;
      if (w > v) kantenAlle.push(l);
    }
    lokal[v] = s / Math.max(1, h.nachbarn[v]!.length);
  }
  const kanteMittel = kantenAlle.reduce((s, x) => s + x, 0) / Math.max(1, kantenAlle.length);
  sag(`== ${name} ==`);
  sag(`   ${herkunft}; ${auskunft(st)}; gesichert ${st.zeit}; Adresse ${st.quelle}`);
  sag(`1  Netz: ${z(n)} Punkte, ${z(m)} Dreiecke. Startkante (das Maß) ${z(MK, 2)}, mittlere Kante jetzt ${z(kanteMittel, 2)} (${z(kanteMittel / MK, 2)} Startkanten).`);
  sag(
    `   Fläche ${z(flaeche)}: Ein gleichmäßiges Netz mit der Startkante hätte dort ${z(gleich)} Punkte, das Wesen hat ${z(n / gleich, 2)}-mal so viele ` +
      `(die Startkugel selbst: rund 1,08-mal).`,
  );

  // ---------- 2 Kanten nach Länge ----------
  const grenzen = [0.11, 0.25, 0.5, 0.75, 1.25, 1.75];
  const namen = ['unter 0,11', '0,11–0,25', '0,25–0,5', '0,5–0,75', '0,75–1,25', '1,25–1,75', 'über 1,75'];
  const fach = (l: number): number => {
    const r = l / MK;
    let i = 0;
    while (i < grenzen.length && r >= grenzen[i]!) i++;
    return i;
  };
  const zaehlen = (werte: number[]): number[] => {
    const c = new Array<number>(namen.length).fill(0);
    for (const l of werte) c[fach(l)] = c[fach(l)]! + 1;
    return c;
  };
  const kantenKette: number[] = [];
  const kantenAn: number[] = [];
  const kantenFrei: number[] = [];
  for (let v = 0; v < n; v++)
    for (const w of h.nachbarn[v]!) {
      if (w <= v) continue;
      const l = L(v, w);
      if (kette[v] && kette[w]) kantenKette.push(l);
      else if (kette[v] || kette[w]) kantenAn.push(l);
      else kantenFrei.push(l);
    }
  const zeile = (titel: string, werte: number[]): string => {
    const c = zaehlen(werte);
    return `   ${titel.padEnd(34)} ${z(werte.length).padStart(7)}   ${c.map((x) => pz(x / Math.max(1, werte.length)).padStart(9)).join(' ')}`;
  };
  sag(`2  Kanten nach Länge in Startkanten (Regeln: über 1,75 teilen, unter 0,5 zusammenlegen, auf einer Linie erst unter 0,25):`);
  sag(`   ${''.padEnd(34)} ${'Kanten'.padStart(7)}   ${namen.map((x) => x.padStart(9)).join(' ')}`);
  sag(zeile('alle', kantenAlle));
  sag(zeile('zwischen zwei Punkten auf Linien', kantenKette));
  sag(zeile('von einer Linie weg', kantenAn));
  sag(zeile('ohne Punkt auf einer Linie', kantenFrei));
  sag(`   kürzeste ${z(Math.min(...kantenAlle), 3)}, längste ${z(Math.max(...kantenAlle), 2)} (${z(Math.max(...kantenAlle) / MK, 2)} Startkanten)`);

  // ---------- 3 wo die Punkte liegen ----------
  const baender: { name: string; bis: number }[] = [
    { name: 'auf einer Linie', bis: 0 },
    { name: 'bis 1 Startkante daneben', bis: 1 },
    { name: '1 bis 2', bis: 2 },
    { name: '2 bis 4', bis: 4 },
    { name: '4 bis 8', bis: 8 },
    { name: 'weiter als 8', bis: Infinity },
  ];
  const bandVon = (v: number): number => {
    const r = zurLinie[v]! / MK;
    if (r === 0) return 0;
    for (let i = 1; i < baender.length; i++) if (r <= baender[i]!.bis) return i;
    return baender.length - 1;
  };
  const bz = baender.map(() => ({ punkte: 0, flaeche: 0, kante: 0 }));
  for (let v = 0; v < n; v++) {
    const b = bz[bandVon(v)]!;
    b.punkte++;
    b.flaeche += anteil[v]!;
    b.kante += lokal[v]!;
  }
  sag(`3  Wo die Punkte liegen (Abstand zur nächsten Linie längs der Fläche; Dichte 1 = wie das Startnetz):`);
  if (anKette === 0) sag('   keine Linien');
  else {
    sag(`   ${''.padEnd(28)} ${'Punkte'.padStart(8)} ${'Anteil'.padStart(8)} ${'Fläche'.padStart(8)} ${'Dichte'.padStart(7)} ${'Kante dort'.padStart(11)}`);
    bz.forEach((b, i) => {
      if (b.punkte === 0) return;
      sag(
        `   ${baender[i]!.name.padEnd(28)} ${z(b.punkte).padStart(8)} ${pz(b.punkte / n).padStart(8)} ${pz(b.flaeche / flaeche).padStart(8)} ` +
          `${z(b.punkte / (b.flaeche / jePunkt), 2).padStart(7)} ${z(b.kante / b.punkte / MK, 2).padStart(11)}`,
      );
    });
  }
  const nah = bz[0]!.punkte + bz[1]!.punkte;
  const nahFlaeche = bz[0]!.flaeche + bz[1]!.flaeche;
  const fern = bz.slice(3).reduce((s, b) => s + b.punkte, 0);
  const fernFlaeche = bz.slice(3).reduce((s, b) => s + b.flaeche, 0);
  const dichteNah = nahFlaeche > 0 ? nah / (nahFlaeche / jePunkt) : NaN;
  const dichteFern = fernFlaeche > 0 ? fern / (fernFlaeche / jePunkt) : NaN;
  // Punkte in Gebieten, die mehr als doppelt (viermal) so dicht sind wie das Startnetz
  let dicht2 = 0;
  let dicht4 = 0;
  for (let v = 0; v < n; v++) {
    const f = jePunkt / Math.max(1e-12, anteil[v]!);
    if (f > 2) dicht2++;
    if (f > 4) dicht4++;
  }
  sag(`   Punkte, deren Umgebung mehr als doppelt so dicht ist wie das Startnetz: ${z(dicht2)} (${pz(dicht2 / n)}); mehr als viermal: ${z(dicht4)} (${pz(dicht4 / n)})`);

  // ---------- 4 Güte ----------
  sag('4  Güte:');
  sag(gueteZeile('   ganzes Netz', guete(h)));
  if (anKette > 0) {
    sag(gueteZeile('   an den Linien (bis 1 Startkante)', guete(h, (v) => zurLinie[v]! <= MK)));
    if (fern > 0) sag(gueteZeile('   fern von Linien (weiter als 2 Startkanten)', guete(h, (v) => zurLinie[v]! > 2 * MK)));
  }

  // ---------- 5 Fehler und unruhige Stellen ----------
  const topo = topoCheck(h);
  const sp = spiegelCheck(h);
  sag(
    `5  Fehler: offene Kanten ${topo.offen}, Kanten mit mehr als zwei Dreiecken ${topo.mehr}, entartete Dreiecke ${topo.entartet}, doppelte Punkte ${topo.doppelt}, ` +
      `umgeklappte Dreiecke ${topo.umgeklappt}; Spiegel: ohne Partner ${sp.ohne}, nicht umkehrbar ${sp.nichtUmkehrbar}, größte Abweichung ${z(sp.schief, 6)}, ` +
      `Dreiecke ohne Spiegelbild ${sp.ohneSpiegelDreieck}${probenNeben ? `; Proben neben Netzpunkten ${probenNeben}` : ''}`,
  );
  // kleinster Winkel je Dreieck, umgeklappt je Dreieck; die spitzen (unter 5°) nach ihrer Art
  const winkel = new Float64Array(m);
  const klapp = new Uint8Array(m);
  const art = { flachLinie: 0, nadelLinie: 0, anLinie: 0, frei: 0 };
  for (let t = 0; t < m; t++) {
    const e = [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!];
    const l = [L(e[1]!, e[2]!), L(e[2]!, e[0]!), L(e[0]!, e[1]!)];
    let wmin = 180;
    let wmax = 0;
    for (let k = 0; k < 3; k++) {
      const a = l[k]!;
      const b = l[(k + 1) % 3]!;
      const c = l[(k + 2) % 3]!;
      const cs = Math.max(-1, Math.min(1, (b * b + c * c - a * a) / Math.max(1e-30, 2 * b * c)));
      const w = (Math.acos(cs) * 180) / Math.PI;
      wmin = Math.min(wmin, w);
      wmax = Math.max(wmax, w);
    }
    winkel[t] = wmin;
    if (wmin < 5) {
      // flach: die drei Ecken liegen fast auf einer Geraden (ein Winkel nahe 180°); Nadel: zwei Ecken liegen fast aufeinander
      const aufLinien = e.filter((v) => kette[v]).length;
      const kurz = Math.min(l[0]!, l[1]!, l[2]!) < 0.11 * MK;
      if (!kurz && aufLinien === 3) art.flachLinie++;
      else if (kurz && aufLinien >= 2) art.nadelLinie++;
      else if (aufLinien >= 1) art.anLinie++;
      else art.frei++;
    }
    let s = 0;
    for (let k = 0; k < 3; k++) s += FN[3 * t + k]! * (VN[3 * e[0]! + k]! + VN[3 * e[1]! + k]! + VN[3 * e[2]! + k]!);
    if (s < 0) klapp[t] = 1;
  }
  const unter = (g0: number): number => winkel.reduce((s, w) => s + (w < g0 ? 1 : 0), 0);
  const nb3 = h.nachbarn.reduce((s, x) => s + (x.length <= 3 ? 1 : 0), 0);
  const nb4 = h.nachbarn.reduce((s, x) => s + (x.length === 4 ? 1 : 0), 0);
  const nb3Linie = h.nachbarn.reduce((s, x, v) => s + (x.length <= 3 && kette[v] ? 1 : 0), 0);
  sag(
    `   Dreiecke mit kleinstem Winkel unter 1°: ${unter(1)}, unter 5°: ${unter(5)}, unter 10°: ${unter(10)}, unter 20°: ${unter(20)} (von ${z(m)}); ` +
      `Punkte mit höchstens drei Nachbarn: ${nb3} (davon auf Linien ${nb3Linie}), mit vier: ${nb4}`,
  );
  sag(
    `   die Dreiecke unter 5° nach ihrer Art: flach längs einer Linie (alle drei Ecken auf Linien, keine Kante sehr kurz) ${art.flachLinie}; ` +
      `Nadel an einer Linie (zwei ihrer Punkte näher als 0,11 Startkanten) ${art.nadelLinie}; sonst mit einer Ecke auf einer Linie ${art.anLinie}; ohne Ecke auf einer Linie ${art.frei}`,
  );
  // unruhige Stellen: Dreiecke unter 5° oder umgeklappt, Punkte mit höchstens drei Nachbarn; was näher als 2,5 Startkanten beieinander
  // liegt, ist eine Stelle
  type Fund = { ort: [number, number, number]; winkel: number; klapp: number; nb: number; kante: number; v: number };
  const funde: Fund[] = [];
  for (let t = 0; t < m; t++) {
    if (winkel[t]! >= 5 && !klapp[t]) continue;
    const e = [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!];
    funde.push({
      ort: [0, 1, 2].map((k) => (P[3 * e[0]! + k]! + P[3 * e[1]! + k]! + P[3 * e[2]! + k]!) / 3) as [number, number, number],
      winkel: winkel[t]!,
      klapp: klapp[t]!,
      nb: 0,
      kante: Math.min(L(e[0]!, e[1]!), L(e[1]!, e[2]!), L(e[2]!, e[0]!)),
      v: e[0]!,
    });
  }
  for (let v = 0; v < n; v++)
    if (h.nachbarn[v]!.length <= 3) funde.push({ ort: [P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!], winkel: 180, klapp: 0, nb: 1, kante: Infinity, v });
  funde.sort((a, b) => b.klapp - a.klapp || a.winkel - b.winkel);
  const stellen: (Stelle & { v: number })[] = [];
  for (const f of funde) {
    let s = stellen.find((x) => Math.hypot(x.ort[0] - f.ort[0], x.ort[1] - f.ort[1], x.ort[2] - f.ort[2]) < 2.5 * MK);
    if (!s) {
      s = { ort: f.ort, dreiecke: 0, winkel: 180, umgeklappt: 0, wenigNachbarn: 0, kante: Infinity, zurLinie: zurLinie[f.v]! / MK, v: f.v };
      stellen.push(s);
    }
    if (f.nb) s.wenigNachbarn++;
    else s.dreiecke++;
    s.winkel = Math.min(s.winkel, f.winkel);
    s.umgeklappt += f.klapp;
    s.kante = Math.min(s.kante, f.kante);
  }
  // die Spiegelseite zählt nicht doppelt
  const einseitig = stellen.filter((s) => s.ort[2] >= -1e-9);
  sag(`   unruhige Stellen (Dreiecke unter 5° oder umgeklappt, Punkte mit höchstens drei Nachbarn; je Seite): ${einseitig.length}`);
  einseitig.slice(0, 10).forEach((s, i) => {
    sag(
      `     ${String(i + 1).padStart(2)}  bei (${z(s.ort[0])}, ${z(s.ort[1])}, ${z(s.ort[2])}): ${s.dreiecke} Dreiecke, kleinster Winkel ${z(s.winkel, 2)}°` +
        `${s.umgeklappt ? `, ${s.umgeklappt} umgeklappt` : ''}${s.wenigNachbarn ? `, ${s.wenigNachbarn} Punkte mit ≤ 3 Nachbarn` : ''}` +
        `, kürzeste Kante ${Number.isFinite(s.kante) ? z(s.kante / MK, 3) : '–'} Startkanten, ${Number.isFinite(s.zurLinie) ? `${z(s.zurLinie, 1)} Startkanten von der nächsten Linie` : 'keine Linie'}`,
    );
  });
  if (einseitig.length > 10) sag(`     … und ${einseitig.length - 10} weitere`);

  // ---------- 6 wie rund: Drehung der Normale und Sehnenfehler je Kante ----------
  // (nicht an harten Stellen: Dort knickt die Fläche gewollt)
  const drehung: number[] = [];
  const sehne: number[] = [];
  const krumm = new Float64Array(n);
  for (let v = 0; v < n; v++)
    for (const w of h.nachbarn[v]!) {
      if (w <= v || hart[v] || hart[w]) continue;
      const c = Math.max(-1, Math.min(1, VN[3 * v]! * VN[3 * w]! + VN[3 * v + 1]! * VN[3 * w + 1]! + VN[3 * v + 2]! * VN[3 * w + 2]!));
      const th = Math.acos(c);
      const l = L(v, w);
      drehung.push((th * 180) / Math.PI);
      sehne.push((l * th) / 8);
      const k = th / Math.max(1e-9, l);
      if (k > krumm[v]!) krumm[v] = k;
      if (k > krumm[w]!) krumm[w] = k;
    }
  const ueber = (werte: number[], g0: number): number => werte.reduce((s, x) => s + (x > g0 ? 1 : 0), 0) / Math.max(1, werte.length);
  // Sehnenfehler in Einheiten (für jede Startkante dieselben, damit Wesen aus verschieden dichten Startnetzen vergleichbar sind)
  const fein = 0.2;
  const LANG = 15;
  sag(
    `6  Rundung (ohne Kanten): Drehung der Normale über eine Kante: Median ${z(quantil(drehung, 0.5), 1)}°, 95 % ${z(quantil(drehung, 0.95), 1)}°, ` +
      `99 % ${z(quantil(drehung, 0.99), 1)}°, größte ${z(Math.max(0, ...drehung), 1)}°; über 15°: ${pz(ueber(drehung, 15))}, über 25°: ${pz(ueber(drehung, 25))}`,
  );
  sag(
    `   Sehnenfehler je Kante (Länge × Drehung / 8): Median ${z(quantil(sehne, 0.5), 3)}, 95 % ${z(quantil(sehne, 0.95), 3)}, 99 % ${z(quantil(sehne, 0.99), 3)}, ` +
      `größter ${z(Math.max(0, ...sehne), 2)}; über ${z(fein, 1)}: ${pz(ueber(sehne, fein))}, über ${z(4 * fein, 1)}: ${pz(ueber(sehne, 4 * fein))} (die Linien dieses Wesens werden auf ${z(MK / 40, 2)} genau aufgelöst)`,
  );
  // Schätzung: so viele Punkte genügten, wenn überall die Kante so lang wäre, dass der Sehnenfehler gerade `eps` ist (Länge
  // √(8·eps/Krümmung), nach der stärksten Krümmung am Punkt), nie länger als `lang` und nie kürzer als 0,5 Einheiten
  const genug = (eps: number, lang: number): number => {
    let s = 0;
    for (let v = 0; v < n; v++) {
      const l = Math.min(lang, Math.max(0.5, krumm[v]! > 0 ? Math.sqrt((8 * eps) / krumm[v]!) : Infinity));
      s += anteil[v]! / ((WURZEL3 / 2) * l * l);
    }
    return s;
  };
  // zu grob für eps: Anteil der Fläche, auf der die Kanten länger sind als das 1,5-Fache des Nötigen
  let zuGrob = 0;
  for (let v = 0; v < n; v++) if (krumm[v]! > 0 && lokal[v]! > 1.5 * Math.sqrt((8 * fein) / krumm[v]!)) zuGrob += anteil[v]!;
  const genugFein = genug(fein, LANG);
  const genugGrob = genug(4 * fein, LANG);
  sag(
    `   Schätzung, wie viele Punkte für die Rundung genügten (Kante überall so lang, dass der Sehnenfehler gerade erreicht wird, höchstens ${LANG} Einheiten): ` +
      `für ${z(fein, 1)}: ${z(genugFein)} Punkte; für ${z(4 * fein, 1)}: ${z(genugGrob)}; ohne Obergrenze der Kante: ${z(genug(fein, Infinity))} bzw. ${z(genug(4 * fein, Infinity))}. ` +
      `Das Wesen hat ${z(n)}.`,
  );
  sag(`   Zu grob für ${z(fein, 1)}: auf ${pz(zuGrob / flaeche)} der Fläche sind die Kanten mehr als 1,5-mal so lang wie dafür nötig.`);

  // ---------- 7 Linien ----------
  sag(`7  Linien: ${loops.length}; Punkte auf Linien im Netz ${z(anKette)} (${pz(anKette / n)})`);
  const abstandAlle: number[] = [];
  const zeilen: string[] = [];
  for (const l of loops) {
    const R = l.ruhe;
    const k = l.proben.length;
    const d: number[] = [];
    for (let j = 0; j + 1 < k; j++) d.push(Math.hypot(R[3 * j + 3]! - R[3 * j]!, R[3 * j + 4]! - R[3 * j + 1]!, R[3 * j + 5]! - R[3 * j + 2]!));
    if (l.art !== 'ring' && k > 2) d.push(Math.hypot(R[0]! - R[3 * k - 3]!, R[1]! - R[3 * k - 2]!, R[2]! - R[3 * k - 1]!));
    abstandAlle.push(...d);
    const lang = d.reduce((s, x) => s + x, 0);
    const hartAnteil = kanteBei(l, loops).reduce((s, x) => s + x, 0) / Math.max(1, k);
    zeilen.push(
      `     Loop ${String(l.id).padStart(3)} ${l.art.padEnd(5)} ${String(l.punkte.filter((p) => !p.vonSelbst).length).padStart(3)} Punkte, ${String(k).padStart(4)} Proben auf ${z(lang).padStart(6)} ` +
        `(Abstand im Mittel ${z(lang / Math.max(1, d.length) / MK, 2)}, kleinster ${z(Math.min(...d) / MK, 3)} Startkanten)${hartAnteil > 0 ? `, Kante auf ${pz(hartAnteil)}` : ''}`,
    );
  }
  if (abstandAlle.length) {
    sag(
      `   Abstand der Proben in Startkanten: Median ${z(quantil(abstandAlle, 0.5) / MK, 2)}, 5 % ${z(quantil(abstandAlle, 0.05) / MK, 2)}, kleinster ${z(Math.min(...abstandAlle) / MK, 3)}; ` +
        `unter 0,25: ${pz(ueber(abstandAlle.map((x) => -x), -0.25 * MK))}, unter 0,5: ${pz(ueber(abstandAlle.map((x) => -x), -0.5 * MK))}`,
    );
    for (const s of zeilen.slice(0, 40)) sag(s);
    if (zeilen.length > 40) sag(`     … und ${zeilen.length - 40} weitere`);
  }

  // ---------- die Pose, wenn das Wesen in ihr gesichert ist ----------
  if (st.grund) {
    const hp = hautVon(st.haut);
    const tp = topoCheck(hp);
    const gp = guete(hp);
    sag(
      `   In der Fressen-Pose (Maul ${st.pose.kiefer}°, Kopf ${st.pose.schaedel}°; dasselbe Netz): umgeklappte Dreiecke ${tp.umgeklappt}, entartete ${tp.entartet}; ` +
        `kleinster Winkel ${z(gp.winkelMin, 2)}°, unter 10°: ${pz(gp.unter10)}; längste Kante ${z(gp.kanteMax / MK, 2)} Startkanten`,
    );
  }

  // ---------- Bild ----------
  const rund = (x: number): number => Math.round(x * 100) / 100;
  const daten = {
    name,
    kopf: `${z(n)} Punkte · ${z(n / gleich, 2)}-mal so viele wie ein gleichmäßiges Netz mit der Startkante · ${loops.length} Linien · ${einseitig.length} unruhige Stellen`,
    mk: MK,
    P: Array.from(P, rund),
    T: Array.from(T),
    linien: loops.map((l) => ({ v: l.proben.map((p) => p.ecken[0]), zu: l.art !== 'ring', hart: Array.from(kanteBei(l, loops)) })),
    spiegel: Array.from(h.spiegel),
    stellen: einseitig.slice(0, 10).map((s) => s.ort.map(rund)),
  };
  return {
    text: aus.join('\n'),
    kurz: {
      name,
      punkte: n,
      gleich,
      faktor: n / gleich,
      anLinien: nah / n,
      dichteNah,
      dichteFern,
      unter5: unter(5),
      nachbarn34: nb3 + nb4,
      umgeklappt: topo.umgeklappt,
      stellen: einseitig.length,
      genug: genugFein,
      genugGrob,
      zuGrob: zuGrob / flaeche,
    },
    bild: bildHtml(daten),
  };
}

/** Seite, Front, Top: die sichtbaren Dreiecke nach Dichte gefärbt, darauf die Linien und die unruhigen Stellen */
function bildHtml(daten: unknown): string {
  return `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#efe9de;font:14px -apple-system,system-ui,sans-serif;color:#1d1b19}
  h1{font-size:20px;margin:14px 20px 2px} p{margin:0 20px 8px;color:#6b655c}
  .reihe{display:flex;gap:10px;margin:0 20px 10px} canvas{background:#f7f3ea;border-radius:10px}
  .leg{display:flex;align-items:center;gap:6px;margin:0 20px 14px;color:#6b655c} .leg i{display:inline-block;width:26px;height:14px;border-radius:3px}
</style>
<h1 id="t"></h1><p id="k"></p>
<div class="leg" id="leg"></div>
<div class="reihe"><canvas id="seite" width="1560" height="900"></canvas></div>
<div class="reihe"><canvas id="front" width="775" height="700"></canvas><canvas id="top" width="775" height="700"></canvas></div>
<script>
const D = ${JSON.stringify(daten)};
document.getElementById('t').textContent = D.name + ' — wo das Netz dicht ist';
document.getElementById('k').textContent = D.kopf + ' · Seite (oben), Front und Top (unten); schwarz: Linien (dick: Kante); Kreise: unruhige Stellen';
const P = D.P, T = D.T, m = T.length / 3, MK = D.mk;
// Dichte je Dreieck gegen das Startnetz (gleichseitig mit der Startkante), als Stufen von 2
const stufen = [[-1, [158, 202, 225]], [0, [240, 237, 228]], [1, [254, 224, 139]], [2, [253, 174, 97]], [3, [244, 109, 67]], [4, [165, 0, 38]]];
const farbe = (f) => {
  const x = Math.max(-1, Math.min(4, Math.log2(f)));
  let i = 0;
  while (i < stufen.length - 2 && x > stufen[i + 1][0]) i++;
  const [a, ca] = stufen[i], [b, cb] = stufen[i + 1];
  const t = (x - a) / (b - a);
  return 'rgb(' + ca.map((c, k) => Math.round(c + (cb[k] - c) * t)).join(',') + ')';
};
document.getElementById('leg').innerHTML = 'Dichte gegen das Startnetz: ' + [0.5, 1, 2, 4, 8, 16].map((f) => '<i style="background:' + farbe(f) + '"></i>' + (f === 0.5 ? '½' : f === 16 ? '16 und mehr' : f)).join(' ');
const FL = new Float64Array(m), NO = new Float64Array(3 * m);
for (let t = 0; t < m; t++) {
  const a = 3 * T[3 * t], b = 3 * T[3 * t + 1], c = 3 * T[3 * t + 2];
  const ab = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], ac = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
  const f = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
  FL[t] = Math.hypot(...f) / 2; NO[3 * t] = f[0]; NO[3 * t + 1] = f[1]; NO[3 * t + 2] = f[2];
}
const gleich = Math.sqrt(3) / 4 * MK * MK;
// Blatt: (u, v) und Tiefe zum Betrachter wie im Fenster (Seite von +z, Front von −x, Top von +y)
const blick = {
  seite: { u: (i) => P[i], v: (i) => P[i + 1], tiefe: (i) => P[i + 2], n: (t) => NO[3 * t + 2] },
  front: { u: (i) => P[i + 2], v: (i) => P[i + 1], tiefe: (i) => -P[i], n: (t) => -NO[3 * t] },
  top: { u: (i) => P[i], v: (i) => -P[i + 2], tiefe: (i) => P[i + 1], n: (t) => NO[3 * t + 1] },
};
let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i + k]); hi[k] = Math.max(hi[k], P[i + k]); }
const weite = { seite: [hi[0] - lo[0], hi[1] - lo[1]], front: [hi[2] - lo[2], hi[1] - lo[1]], top: [hi[0] - lo[0], hi[2] - lo[2]] };
for (const a of ['seite', 'front', 'top']) {
  const c = document.getElementById(a), x = c.getContext('2d'), B = blick[a];
  const s = Math.min((c.width - 40) / weite[a][0], (c.height - 40) / weite[a][1]);
  let ul = Infinity, uh = -Infinity, vl = Infinity, vh = -Infinity;
  for (let i = 0; i < P.length; i += 3) { ul = Math.min(ul, B.u(i)); uh = Math.max(uh, B.u(i)); vl = Math.min(vl, B.v(i)); vh = Math.max(vh, B.v(i)); }
  const X = (i) => c.width / 2 + (B.u(i) - (ul + uh) / 2) * s, Y = (i) => c.height / 2 - (B.v(i) - (vl + vh) / 2) * s;
  const sicht = [];
  for (let t = 0; t < m; t++) if (B.n(t) > 0) sicht.push(t);
  const tiefe = (t) => B.tiefe(3 * T[3 * t]) + B.tiefe(3 * T[3 * t + 1]) + B.tiefe(3 * T[3 * t + 2]);
  sicht.sort((p, q) => tiefe(p) - tiefe(q));
  x.lineJoin = 'round';
  for (const t of sicht) {
    const a0 = 3 * T[3 * t], b0 = 3 * T[3 * t + 1], c0 = 3 * T[3 * t + 2];
    x.beginPath(); x.moveTo(X(a0), Y(a0)); x.lineTo(X(b0), Y(b0)); x.lineTo(X(c0), Y(c0)); x.closePath();
    x.fillStyle = farbe(gleich / Math.max(1e-9, FL[t])); x.fill();
    x.strokeStyle = 'rgba(40,30,20,0.22)'; x.lineWidth = 0.4; x.stroke();
  }
  // Linien: nur Stücke, deren Punkte dem Betrachter zugewandt liegen (Normale aus den Dreiecken am Punkt)
  const zu = new Float64Array(P.length / 3);
  for (let t = 0; t < m; t++) for (let e = 0; e < 3; e++) zu[T[3 * t + e]] += B.n(t);
  const strich = (p, q, hart) => {
    if (zu[p] <= 0 && zu[q] <= 0) return;
    x.beginPath(); x.moveTo(X(3 * p), Y(3 * p)); x.lineTo(X(3 * q), Y(3 * q));
    x.strokeStyle = '#141210'; x.lineWidth = hart ? 3 : 1.4; x.stroke();
  };
  for (const l of D.linien) {
    const k = l.v.length;
    for (let j = 0; j + 1 < k; j++) { strich(l.v[j], l.v[j + 1], l.hart[j] && l.hart[j + 1]); const p = D.spiegel[l.v[j]], q = D.spiegel[l.v[j + 1]]; if (p >= 0 && q >= 0 && (p !== l.v[j] || q !== l.v[j + 1])) strich(p, q, l.hart[j] && l.hart[j + 1]); }
    if (l.zu && k > 2) { strich(l.v[k - 1], l.v[0], l.hart[k - 1] && l.hart[0]); const p = D.spiegel[l.v[k - 1]], q = D.spiegel[l.v[0]]; if (p >= 0 && q >= 0) strich(p, q, l.hart[k - 1] && l.hart[0]); }
  }
  // unruhige Stellen (beide Seiten)
  x.font = 'bold 15px -apple-system, system-ui, sans-serif';
  D.stellen.forEach((o, i) => {
    for (const z of a === 'seite' ? [1] : [1, -1]) {
      const u = a === 'seite' ? o[0] : a === 'front' ? o[2] * z : o[0];
      const v = a === 'seite' ? o[1] : a === 'front' ? o[1] : -o[2] * z;
      const px = c.width / 2 + (u - (ul + uh) / 2) * s, py = c.height / 2 - (v - (vl + vh) / 2) * s;
      x.beginPath(); x.arc(px, py, 13, 0, 2 * Math.PI); x.strokeStyle = '#c2185b'; x.lineWidth = 2.2; x.stroke();
      x.fillStyle = '#c2185b'; x.fillText(String(i + 1), px + 15, py - 9);
    }
  });
  x.fillStyle = '#6b655c'; x.font = '14px -apple-system, system-ui, sans-serif';
  x.fillText(a === 'seite' ? 'Seite' : a === 'front' ? 'Front' : 'Top', 14, 22);
}
</script>`;
}

// ---------- Lauf ----------
const dateien: { name: string; pfad: string }[] = [];
if (process.env.DATEI) dateien.push({ name: path.basename(process.env.DATEI).replace(/\.eewesen$/, ''), pfad: path.resolve(process.env.DATEI) });
else {
  const wahl = process.env.WESEN
    ? process.env.WESEN.split(',').map((s) => s.trim())
    : fs.existsSync(ordner)
      ? fs
          .readdirSync(ordner)
          .filter((f) => f.endsWith('.eewesen'))
          .map((f) => f.slice(0, -'.eewesen'.length))
          .sort()
      : [];
  for (const name of wahl) dateien.push({ name, pfad: path.join(ordner, `${name}.eewesen`) });
}
if (dateien.length === 0) {
  console.log(`Kein gesichertes Wesen in ${ordner} (im Fenster „Sichern“ drücken; oder DATEI=<pfad>).`);
  process.exit(0);
}
const alle: Kurz[] = [];
for (const d of dateien) {
  let st: WesenStand;
  try {
    st = entpacken(new Uint8Array(fs.readFileSync(d.pfad)));
  } catch (e) {
    console.log(`== ${d.name} ==\n   nicht lesbar: ${e instanceof Error ? e.message : String(e)}\n`);
    continue;
  }
  const { text, kurz, bild } = messen(d.name, st, `${path.relative(process.cwd(), d.pfad)}, ${z(fs.statSync(d.pfad).size / 1e6, 2)} MB`);
  console.log(`${text}\n`);
  alle.push(kurz);
  if (process.env.BILD) {
    fs.mkdirSync(process.env.BILD, { recursive: true });
    const ziel = path.join(process.env.BILD, `${d.name.replace(/[^\p{L}\p{N}_.-]+/gu, '-')}-netz.html`);
    fs.writeFileSync(ziel, bild);
    console.log(`   Bild: ${ziel}\n`);
  }
}
if (alle.length > 1) {
  console.log('== Übersicht ==');
  console.log(
    `${'Wesen'.padEnd(26)} ${'Punkte'.padStart(7)} ${'gleichm.'.padStart(8)} ${'×'.padStart(5)} ${'an Linien'.padStart(9)} ${'Dichte nah'.padStart(10)} ${'fern'.padStart(5)} ` +
      `${'< 5°'.padStart(5)} ${'3/4 Nb.'.padStart(7)} ${'umgekl.'.padStart(7)} ${'Stellen'.padStart(7)} ${'genügten'.padStart(9)} ${'(grob)'.padStart(8)} ${'zu grob'.padStart(8)}`,
  );
  for (const k of alle)
    console.log(
      `${k.name.slice(0, 26).padEnd(26)} ${z(k.punkte).padStart(7)} ${z(k.gleich).padStart(8)} ${z(k.faktor, 2).padStart(5)} ${pz(k.anLinien).padStart(9)} ${z(k.dichteNah, 2).padStart(10)} ${z(k.dichteFern, 2).padStart(5)} ` +
        `${String(k.unter5).padStart(5)} ${String(k.nachbarn34).padStart(7)} ${String(k.umgeklappt).padStart(7)} ${String(k.stellen).padStart(7)} ${z(k.genug).padStart(9)} ${z(k.genugGrob).padStart(8)} ${pz(k.zuGrob).padStart(8)}`,
    );
}
