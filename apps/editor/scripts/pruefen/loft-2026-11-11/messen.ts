// Loft-Messung (11.11.2026): An Florians gesicherter Form die Schläuche (von Hand benannt) als Loft bauen und mit der heutigen Haut
// vergleichen: Abstand, Knick am Ansatz, Zeit; dann derselbe Zug (ein Ringende 30 Einheiten nach außen) mit dem Loft und mit dem
// Löser der Grundform. Schreibt Bilder (HTML) nach apps/editor/pruefen-ausgabe/loft/.
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/loft-2026-11-11/messen.ts   (ZUG=0: ohne den Zug)
import path from 'node:path';
import { type V3, hautNormalen } from '../../../../../packages/shape/src/dicht/kurven';
import { LoopZug, verschiebungLaengs } from '../../../../../packages/shape/src/dicht/loops';
import { type BildLinie, type Tafel, bildSeite } from './bild';
import { AUSGABE, bereich, ebene, flaecheVon, laden, quantil } from './formen';
import { type Netz, type SchlauchEingabe, type V, abstaendeZumNetz, schlauch, schlauchNetz } from './loft';

type Plan = {
  name: string;
  mitte: number;
  ringe: number[];
  spitze: boolean;
  fuehrung?: number;
  blick: [number, number];
  /** Linien, die durch den Schlauch laufen, aber weder Querschnitt noch Führung sind: wie weit liegen sie neben dem Loft? */
  andere?: number[];
  /** Zug: an diesem Ring das Ende mit dem größeren y um so viel nach außen */
  zug?: { ring: number; betrag: number };
};
const WESEN = process.env.WESEN ?? 'teat firefish';
const PLAENE: Record<string, Plan[]> = {
  'teat firefish': [
    { name: 'Hals', mitte: 4, ringe: [14, 16, 17], spitze: true, blick: [25, 20], andere: [15], zug: { ring: 16, betrag: 30 } },
    { name: 'Schwanz', mitte: 4, ringe: [6, 9], spitze: true, fuehrung: 7, blick: [30, 25], zug: { ring: 9, betrag: 30 } },
    { name: 'Halsansatz mit Abzweigung', mitte: 4, ringe: [13, 14], spitze: false, blick: [25, 20] },
  ],
};
const z = (x: number, d = 2): string => x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const f = laden(WESEN);
const h = f.haut;
const ganz = flaecheVon(h);
const pos0 = Float64Array.from(h.pos);
console.log(`${WESEN}: ${h.n} Punkte, Fläche ${z(ganz, 0)}`);
const tafeln: Tafel[] = [];
const tafelnZug: Tafel[] = [];
let schlauchFlaeche = 0;

const eingabeVon = (p: Plan, kurven: Map<number, Float64Array>): SchlauchEingabe => ({
  mitte: kurven.get(p.mitte)!,
  ringe: p.ringe.map((id) => kurven.get(id)!),
  spitze: p.spitze,
  ...(p.fuehrung ? { fuehrung: kurven.get(p.fuehrung)! } : {}),
});

/** Bereich der Haut: hinter dem ersten Ring (ganz hinter ihm), ohne Spitze vor dem letzten */
function bereichVon(p: Plan, kurven: Map<number, Float64Array>): Uint8Array {
  const ringe = p.ringe.map((id) => kurven.get(id)!);
  const hinter = (r: Float64Array, richtung: [number, number], auf: number): { c: [number, number, number]; n: [number, number, number] } => {
    const e = ebene(r);
    if (e.n[0] * richtung[0] + e.n[1] * richtung[1] < 0) e.n = [-e.n[0], -e.n[1], 0];
    let weit = -Infinity;
    for (let j = 0; j < r.length; j += 3) weit = Math.max(weit, (r[j]! - e.c[0]) * e.n[0] + (r[j + 1]! - e.c[1]) * e.n[1]);
    return { c: [e.c[0] + (weit + auf) * e.n[0], e.c[1] + (weit + auf) * e.n[1], 0], n: e.n };
  };
  const c0 = ebene(ringe[0]!).c;
  const c1 = ebene(ringe[1]!).c;
  const ebenen = [hinter(ringe[0]!, [c1[0] - c0[0], c1[1] - c0[1]], 1)];
  if (!p.spitze) {
    const a = ebene(ringe[ringe.length - 1]!).c;
    const b = ebene(ringe[ringe.length - 2]!).c;
    ebenen.push(hinter(ringe[ringe.length - 1]!, [b[0] - a[0], b[1] - a[1]], 1));
  }
  const start: [number, number, number] = p.spitze ? c1 : [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2, 0];
  return bereich(h, start, ebenen);
}

function abstandsZeile(name: string, pos: ArrayLike<number>, wer: number[], netz: Netz, r: number): Float64Array {
  const d = abstaendeZumNetz(pos, wer, netz);
  const ab = Array.from(d, Math.abs);
  const mittelVz = d.reduce((a, b) => a + b, 0) / d.length;
  console.log(
    `  ${name}: Median ${z(quantil(ab, 0.5))}, 90 % ${z(quantil(ab, 0.9))}, 99 % ${z(quantil(ab, 0.99))}, größter ${z(Math.max(...ab))} Einheiten (= ${z((100 * quantil(ab, 0.5)) / r, 1)} / ${z((100 * quantil(ab, 0.9)) / r, 1)} / ${z((100 * quantil(ab, 0.99)) / r, 1)} / ${z((100 * Math.max(...ab)) / r, 1)} % der halben Höhe); im Mittel liegt die Haut ${z(Math.abs(mittelVz))} ${mittelVz >= 0 ? 'außerhalb' : 'innerhalb'} des Lofts`,
  );
  return d;
}

type Stand = { p: Plan; in_: Uint8Array; wer: number[]; rMittel: number; nu: number; nv: number };
const staende: Stand[] = [];
for (const p of PLAENE[WESEN] ?? []) {
  const eingabe = eingabeVon(p, f.kurven);
  const ringe = eingabe.ringe as Float64Array[];
  const s = schlauch(eingabe);
  const in_ = bereichVon(p, f.kurven);
  const wer: number[] = [];
  for (let v = 0; v < h.n; v++) if (in_[v]) wer.push(v);
  const A = flaecheVon(h, in_);
  if (p.spitze) schlauchFlaeche += A;
  const nu = 48;
  const nv = Math.max(8, Math.round(wer.length / (2 * nu)));
  const netz = schlauchNetz(s, nu, nv, p.spitze);
  const fein = schlauchNetz(s, 96, Math.max(24, Math.round(s.tMax / 3)), p.spitze);
  const radien = ringe.map((r) => Math.hypot(r[0]! - r[r.length - 3]!, r[1]! - r[r.length - 2]!) / 2);
  const rMittel = radien.reduce((a, b) => a + b, 0) / radien.length;
  staende.push({ p, in_, wer, rMittel, nu, nv });
  console.log(`\n— ${p.name}: Ringe ${p.ringe.join(', ')}${p.fuehrung ? `, Führung ${p.fuehrung}` : ''}${p.spitze ? ', bis zur Spitze' : ''}; Länge ${z(s.tMax, 0)}, halbe Höhe der Ringe ${radien.map((r) => z(r, 0)).join(' / ')}`);
  console.log(`  Haut dort: ${wer.length} Punkte, ${z((100 * A) / ganz, 1)} % der Fläche · Loft-Netz gleich dicht: ${netz.pos.length / 3} Punkte`);
  console.log(`  Ringenden neben der Seitenlinie: ${z(s.endenNeben, 3)} · größte Korrektur durch die dritte Führung: ${z(s.fuehrungKorrektur)}`);
  const d = abstandsZeile('Abstand heutige Haut → Loft', h.pos, wer, fein, rMittel);
  const rd = ringe.map((r) => Math.max(...Array.from(abstaendeZumNetz(r, Array.from({ length: r.length / 3 }, (_, i) => i), fein), Math.abs)));
  console.log(`  Ringe → Loft (muss 0 sein): ${rd.map((x, k) => `Ring ${p.ringe[k]} ${z(x, 3)}`).join(', ')}`);
  for (const id of p.andere ?? []) {
    // nur die Punkte der Linie, die auf der Haut im Bereich liegen
    const l = f.loops.find((x) => x.id === id)!;
    const L = f.kurven.get(id)!;
    const idx: number[] = [];
    l.proben.forEach((pr, j) => {
      if (in_[pr.ecken[pr.b.indexOf(1)]!]) idx.push(j);
    });
    if (idx.length) {
      const dl = Array.from(abstaendeZumNetz(L, idx, fein), Math.abs);
      console.log(`  Linie ${id} (kein Querschnitt, keine Führung), ${idx.length} ihrer ${l.proben.length} Stützpunkte im Schlauch → Loft: Median ${z(quantil(dl, 0.5))}, größter ${z(Math.max(...dl))} Einheiten`);
    }
  }
  // Knick am Ansatz: Normale des Lofts am ersten Ring gegen die Normale der Haut dort
  const N = hautNormalen(h);
  const winkel: number[] = [];
  for (let j = 1; j < 24; j++) {
    const u = j / 24;
    const a = s.flaeche(u, 0);
    const b = s.flaeche(u + 0.004, 0);
    const c = s.flaeche(u, 0.5);
    const n: V = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    const nl = Math.hypot(...n) || 1;
    let best = Infinity;
    let bv = 0;
    for (let v = 0; v < h.n; v++) {
      const dd = (h.pos[3 * v]! - a[0]) ** 2 + (h.pos[3 * v + 1]! - a[1]) ** 2 + (h.pos[3 * v + 2]! - a[2]) ** 2;
      if (dd < best) {
        best = dd;
        bv = v;
      }
    }
    const cos = Math.abs((n[0] * N[3 * bv]! + n[1] * N[3 * bv + 1]! + n[2] * N[3 * bv + 2]!) / nl);
    winkel.push((Math.acos(Math.min(1, cos)) * 180) / Math.PI);
  }
  console.log(`  Knick am ersten Ring, würde man den Loft dort an die übrige Haut setzen (23 Stellen): Median ${z(quantil(winkel, 0.5), 1)}°, größter ${z(Math.max(...winkel), 1)}°`);
  // Zeit: Loft neu aus den Kurven (Kurven lesen, Fläche, Netz)
  const zeiten: number[] = [];
  for (let i = 0; i < 40; i++) {
    const t = performance.now();
    schlauchNetz(schlauch(eingabe), nu, nv, p.spitze);
    zeiten.push(performance.now() - t);
  }
  zeiten.sort((a, b) => a - b);
  const punkte = netz.pos.length / 3;
  console.log(`  Zeit: Loft neu aus den Kurven ${z(zeiten[0]!, 2)} ms (kleinste von 40; mittlere ${z(zeiten[20]!, 2)} ms) für ${punkte} Punkte`);

  // Bilder
  const tri: number[] = [];
  for (let k = 0; k < h.tri.length; k += 3) if (in_[h.tri[k]!] && in_[h.tri[k + 1]!] && in_[h.tri[k + 2]!]) tri.push(h.tri[k]!, h.tri[k + 1]!, h.tri[k + 2]!);
  const hautNetz = { pos: pos0, tri };
  const wert = new Float32Array(h.n);
  wer.forEach((v, i) => (wert[v] = Math.abs(d[i]!)));
  const lo: V = [Infinity, Infinity, Infinity];
  const hi: V = [-Infinity, -Infinity, -Infinity];
  for (const v of wer) for (let c = 0; c < 3; c++) {
    lo[c] = Math.min(lo[c]!, h.pos[3 * v + c]!);
    hi[c] = Math.max(hi[c]!, h.pos[3 * v + c]!);
  }
  const kasten: [number, number, number, number, number, number] = [lo[0] - 8, hi[0] + 8, lo[1] - 8, hi[1] + 8, lo[2] - 8, hi[2] + 8];
  const linien: BildLinie[] = ringe.map((r, k) => ({ pts: r, farbe: '#0b6b5c', name: String(p.ringe[k]) }));
  if (p.fuehrung) linien.push({ pts: f.kurven.get(p.fuehrung)!, farbe: '#b0306a', name: String(p.fuehrung) });
  const ab = Array.from(d, Math.abs);
  const wMax = Math.max(2, quantil(ab, 0.99));
  const B = 600;
  const H = 400;
  const eigene: Tafel[] = [];
  for (const blick of ['seite', p.blick] as const) {
    eigene.push({ titel: `${p.name} · heutige Haut`, blick, netze: [hautNetz], linien, kasten, breit: B, hoch: H });
    eigene.push({ titel: `${p.name} · Loft durch die Ringe`, blick, netze: [fein], linien, kasten, breit: B, hoch: H });
  }
  eigene.push({ titel: `${p.name} · heutige Haut, Zebra`, blick: p.blick, netze: [{ ...hautNetz, zebra: true }], kasten, breit: B, hoch: H });
  eigene.push({ titel: `${p.name} · Loft, Zebra`, blick: p.blick, netze: [{ ...fein, zebra: true }], kasten, breit: B, hoch: H });
  eigene.push({ titel: `${p.name} · Abstand der heutigen Haut zum Loft (hell 0 … rot ${z(wMax, 1)} Einheiten)`, blick: p.blick, netze: [{ ...hautNetz, wert }], linien, kasten, breit: B, hoch: H, wertMax: wMax });
  eigene.push({ titel: `${p.name} · von oben, beide übereinander (Haut ocker, Loft blau)`, blick: 'top', netze: [hautNetz, { ...fein, farbe: [120, 170, 225] }], linien, kasten, breit: B, hoch: H });
  const d1 = path.join(AUSGABE, `${WESEN.replace(/ /g, '-')}-loft-${p.name.toLowerCase().replace(/ /g, '-')}.html`);
  bildSeite(d1, `${WESEN} — ${p.name}: Loft gegen heutige Haut`, 'Links die heutige Haut (Löser über das dichte Netz), rechts der Loft: Fläche direkt aus den Ringen und der Seitenlinie, ohne Löser.', eigene, 2);
  console.log(`  ${d1}`);
  tafeln.push(...eigene.slice(2, 4));
}
console.log(`\nSchläuche mit Spitze zusammen: ${z((100 * schlauchFlaeche) / ganz, 1)} % der Fläche`);
const datei = path.join(AUSGABE, `${WESEN.replace(/ /g, '-')}-loft.html`);
bildSeite(datei, `${WESEN} — Loft gegen heutige Haut`, 'Links die heutige Haut (Löser über das dichte Netz), rechts der Loft: Fläche direkt aus den Ringen und der Seitenlinie, ohne Löser. Oben Hals, Mitte Schwanz, unten der Halsansatz, an dem zwischen zwei Ringen ein Lappen abzweigt.', tafeln, 2);
console.log(datei);

// ---------- derselbe Zug mit Loft und mit Löser ----------
if (process.env.ZUG !== '0') {
  console.log('\n=== Derselbe Zug: Loft gegen Löser der Grundform (über die ganze Haut, nach der Geometrie) ===');
  let t = performance.now();
  const erster = new LoopZug(h, f.loops, null, true, 'kurven', 'geometrie');
  console.log(`Löser anlegen mit Zerlegen: ${z(performance.now() - t, 0)} ms`);
  const vorlage = erster.vorlage!;
  for (const st of staende) {
    const p = st.p;
    if (!p.zug) continue;
    h.pos.set(pos0);
    t = performance.now();
    const zug = new LoopZug(h, f.loops, null, true, 'kurven', 'geometrie', { vorlage });
    const tAnlegen = performance.now() - t;
    const l = f.loops.find((x) => x.id === p.zug!.ring)!;
    // das Ende mit dem größeren y; Richtung: von der Ringmitte nach außen, in der Mittelebene
    const enden = l.punkte.filter((q) => Math.abs(q.ref.z) < 1e-6 && q.kreuzung !== undefined);
    const oben = enden.reduce((a, b) => (b.ref.y > a.ref.y ? b : a));
    const unten = enden.reduce((a, b) => (b.ref.y < a.ref.y ? b : a));
    const dx = oben.ref.x - unten.ref.x;
    const dy = oben.ref.y - unten.ref.y;
    const dl = Math.hypot(dx, dy) || 1;
    const D: V3 = { x: (p.zug.betrag * dx) / dl, y: (p.zug.betrag * dy) / dl, z: 0 };
    const k = oben.kreuzung!;
    const versch = f.loops.map((x) => {
      const i = x.punkte.findIndex((q) => q.kreuzung === k);
      if (i < 0) return null;
      const d = verschiebungLaengs(
        x,
        x.punkte.map((_, q) => (q === i ? D : { x: 0, y: 0, z: 0 })),
      );
      if (x.art === 'mitte') for (let j = 0; j < x.proben.length; j++) d[3 * j + 2] = 0;
      return d;
    });
    const betroffen = f.loops.filter((_, i) => versch[i]).map((x) => x.id);
    console.log(`\n— ${p.name}: Ring ${p.zug.ring}, oberes Ende (${z(oben.ref.x, 0)}, ${z(oben.ref.y, 0)}) um ${p.zug.betrag} Einheiten nach außen; bewegte Loops: ${betroffen.join(', ')}`);
    // Loft: neue Kurven = alte + Verschiebung
    const kurven1 = new Map(f.kurven);
    f.loops.forEach((x, i) => {
      const d = versch[i];
      if (!d) return;
      const c = Float64Array.from(f.kurven.get(x.id)!);
      for (let j = 0; j < c.length; j++) c[j] = c[j]! + d[j]!;
      kurven1.set(x.id, c);
    });
    const eingabe1 = eingabeVon(p, kurven1);
    const zl: number[] = [];
    for (let i = 0; i < 40; i++) {
      const t1 = performance.now();
      schlauchNetz(schlauch(eingabe1), st.nu, st.nv, p.spitze);
      zl.push(performance.now() - t1);
    }
    zl.sort((a, b) => a - b);
    const s1 = schlauch(eingabe1);
    const fein1 = schlauchNetz(s1, 96, Math.max(24, Math.round(s1.tMax / 3)), p.spitze);
    // Löser: Runden, bis die Haut steht (wie im Fenster: größter Weg je Runde unter 0,05)
    const vor = new Float64Array(h.pos.length);
    const dauer: number[] = [];
    const wege: number[] = [];
    let runden = 0;
    for (let r = 0; r < 80; r++) {
      vor.set(h.pos);
      const t1 = performance.now();
      zug.schritt(versch, 1);
      dauer.push(performance.now() - t1);
      let w = 0;
      for (let i = 0; i < vor.length; i += 3) w = Math.max(w, Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!));
      wege.push(w);
      runden = r + 1;
      if (w < 0.05) break;
    }
    const summe = dauer.reduce((a, b) => a + b, 0);
    console.log(`  Loft: ${z(zl[0]!, 2)} ms je Schritt (kleinste von 40; mittlere ${z(zl[20]!, 2)} ms), fertig in einem Schritt, ändert nur diesen Schlauch`);
    console.log(`  Löser: anlegen ${z(tAnlegen, 0)} ms, dann ${runden} Runden bis zur Ruhe = ${z(summe, 0)} ms (je Runde ${z(summe / runden, 1)} ms; größter Weg je Runde: ${wege.slice(0, 8).map((w) => z(w, 2)).join(' ')} …)`);
    // wie weit reicht die Änderung des Lösers?
    let ausserhalb = 0;
    let weitAussen = 0;
    let innerhalb = 0;
    for (let v = 0; v < h.n; v++) {
      const w = Math.hypot(h.pos[3 * v]! - pos0[3 * v]!, h.pos[3 * v + 1]! - pos0[3 * v + 1]!, h.pos[3 * v + 2]! - pos0[3 * v + 2]!);
      if (st.in_[v]) innerhalb = Math.max(innerhalb, w);
      else {
        weitAussen = Math.max(weitAussen, w);
        if (w > 0.5) ausserhalb++;
      }
    }
    console.log(`  Löser bewegt im Schlauch bis ${z(innerhalb, 1)} Einheiten, außerhalb bis ${z(weitAussen, 1)} (${ausserhalb} Punkte über 0,5)`);
    abstandsZeile('nach dem Zug: Haut des Lösers → Loft', h.pos, st.wer, fein1, st.rMittel);
    // Bilder nach dem Zug
    const tri: number[] = [];
    for (let q = 0; q < h.tri.length; q += 3) if (st.in_[h.tri[q]!] && st.in_[h.tri[q + 1]!] && st.in_[h.tri[q + 2]!]) tri.push(h.tri[q]!, h.tri[q + 1]!, h.tri[q + 2]!);
    const nachher = { pos: Float64Array.from(h.pos), tri };
    const lo: V = [Infinity, Infinity, Infinity];
    const hi: V = [-Infinity, -Infinity, -Infinity];
    for (const v of st.wer) for (let c = 0; c < 3; c++) {
      lo[c] = Math.min(lo[c]!, h.pos[3 * v + c]!, pos0[3 * v + c]!);
      hi[c] = Math.max(hi[c]!, h.pos[3 * v + c]!, pos0[3 * v + c]!);
    }
    const kasten: [number, number, number, number, number, number] = [lo[0] - 8, hi[0] + 8, lo[1] - 8, hi[1] + 8, lo[2] - 8, hi[2] + 8];
    const linien: BildLinie[] = p.ringe.map((id) => ({ pts: kurven1.get(id)!, farbe: '#0b6b5c', name: String(id) }));
    const alt: BildLinie[] = p.ringe.map((id) => ({ pts: f.kurven.get(id)!, farbe: '#999', dick: 1 }));
    for (const blick of ['seite', p.blick] as const) {
      tafelnZug.push({ titel: `${p.name} nach dem Zug · Löser (${runden} Runden, ${z(summe, 0)} ms)`, blick, netze: [nachher], linien: [...alt, ...linien], kasten, breit: 600, hoch: 400 });
      tafelnZug.push({ titel: `${p.name} nach dem Zug · Loft (${z(zl[0]!, 1)} ms)`, blick, netze: [fein1], linien: [...alt, ...linien], kasten, breit: 600, hoch: 400 });
    }
  }
  const datei2 = path.join(AUSGABE, `${WESEN.replace(/ /g, '-')}-loft-zug.html`);
  bildSeite(datei2, `${WESEN} — derselbe Zug: Löser und Loft`, 'Ein Ringende 30 Einheiten nach außen gezogen. Grau: Ringe vorher, grün: nachher.', tafelnZug, 2);
  console.log(datei2);
}
