// C1 im Plan „Ozzy stabil und schnell“ (17.11.2026): umgeschlagene Dreiecke nach gewöhnlichen Zügen, im Kern.
// Lädt gesicherte Stände (Dateien, wie sie das Fenster sichert; aus Ozzy über den Haken `standGepackt`), zählt die umgeschlagenen
// Dreiecke (wie `werk.umgeschlageneZahl`: Normale gegen die Normalen der Ecken) und verdichtet einmal, wie das Fenster nach einem Zug
// (`werk.verdichtenOptionen`: zu lange Kanten teilen, kurze zusammenlegen, genau nach Linien und Fläche). Je Stand: vorher, ohne das
// Aufrichten (wie bis zum 17.11.), mit ihm, und ob das Netz danach noch stimmt (jede Kante an zwei Dreiecken, jeder Punkt mit
// Spiegelbild). `NUR=1`: nur aufrichten, sonst nichts ändern.
// Aufruf aus packages/shape: [NUR=1] npx vite-node ../../apps/editor/scripts/pruefen/form-umgeschlagen.ts <datei> [<datei> …]
import path from 'node:path';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';
import type { Haut } from '../../../../packages/shape/src/dicht/kurven';
import { formLadenDatei } from './form-direkt-faelle';

const umgeschlagen = (h: Haut): number => {
  const P = h.pos;
  const t = h.tri;
  const vn = new Float64Array(P.length);
  const fn = new Float64Array(t.length);
  for (let i = 0; i < t.length; i += 3) {
    const [a, b, c] = [3 * t[i]!, 3 * t[i + 1]!, 3 * t[i + 2]!];
    const [ux, uy, uz] = [P[b]! - P[a]!, P[b + 1]! - P[a + 1]!, P[b + 2]! - P[a + 2]!];
    const [vx, vy, vz] = [P[c]! - P[a]!, P[c + 1]! - P[a + 1]!, P[c + 2]! - P[a + 2]!];
    const f = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    for (let x = 0; x < 3; x++) {
      fn[i + x] = f[x]!;
      for (const v of [a, b, c]) vn[v + x] = vn[v + x]! + f[x]!;
    }
  }
  let z = 0;
  for (let i = 0; i < t.length; i += 3) {
    const [a, b, c] = [3 * t[i]!, 3 * t[i + 1]!, 3 * t[i + 2]!];
    let d = 0;
    for (let x = 0; x < 3; x++) d += fn[i + x]! * (vn[a + x]! + vn[b + x]! + vn[c + x]!);
    if (d < 0) z++;
  }
  return z;
};
/** Stimmt das Netz: jede Kante an genau zwei Dreiecken, jeder Punkt mit Spiegelbild, das Spiegelbild des Spiegelbilds er selbst */
const stimmt = (h: Haut): string => {
  const kanten = new Map<number, number>();
  for (let i = 0; i < h.tri.length; i += 3)
    for (let e = 0; e < 3; e++) {
      const a = h.tri[i + e]!;
      const b = h.tri[i + ((e + 1) % 3)]!;
      const k = a < b ? a * 4194304 + b : b * 4194304 + a;
      kanten.set(k, (kanten.get(k) ?? 0) + 1);
    }
  let offen = 0;
  for (const n of kanten.values()) if (n !== 2) offen++;
  let ohne = 0;
  for (let v = 0; v < h.n; v++) if (!(h.spiegel[v]! >= 0 && h.spiegel[h.spiegel[v]!] === v)) ohne++;
  return offen || ohne ? `${offen} Kanten nicht an zwei Dreiecken, ${ohne} Punkte ohne Spiegelbild` : 'Netz stimmt';
};

let schlecht = 0;
const NUR = process.env.NUR === '1';
for (const datei of process.argv.slice(2)) {
  const { h, loops, mk } = formLadenDatei(datei, false);
  const vor = umgeschlagen(h);
  const wieFenster = { kurz: 0.5 * mk, genau: mk / 40, genauHaut: true, genauFlaeche: mk / 16, flachSchutz: true };
  const lauf = (aufrichten: boolean) => (NUR ? verdichten(h, loops, Infinity, { drehen: false, entspannen: false, aufrichten }) : verdichten(h, loops, 1.75 * mk, { ...wieFenster, aufrichten }));
  const alt = lauf(false);
  const t0 = performance.now();
  let r = lauf(true);
  const ms = performance.now() - t0;
  // MAL=<n>: so oft hintereinander (das Fenster räumt nach einem Zug mehrmals auf)
  const reihe: number[] = [];
  for (let k = 1; k < Number(process.env.MAL ?? 1) && r; k++) {
    reihe.push(umgeschlagen(r.haut));
    const w = NUR ? verdichten(r.haut, r.loops, Infinity, { drehen: false, entspannen: false }) : verdichten(r.haut, r.loops, 1.75 * mk, wieFenster);
    if (!w) break;
    r = w;
  }
  if (reihe.length) console.log(`   ${path.basename(datei)}: nach jedem Durchgang ${reihe.join(' · ')}`);
  if (process.env.REST === '1' && r) {
    // der Rest einzeln: Lage, kleinster Winkel, Kanten, welche Ecken auf einer Linie liegen
    const H = r.haut;
    const aufLinie = new Set<number>();
    for (const l of r.loops) for (const p of l.proben) if (p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2]) { aufLinie.add(p.ecken[0]); aufLinie.add(H.spiegel[p.ecken[0]]!); }
    const P = H.pos;
    const vn = new Float64Array(P.length);
    const fn = new Float64Array(H.tri.length);
    for (let i = 0; i < H.tri.length; i += 3) {
      const [a, b, c] = [3 * H.tri[i]!, 3 * H.tri[i + 1]!, 3 * H.tri[i + 2]!];
      const f = [(P[b + 1]! - P[a + 1]!) * (P[c + 2]! - P[a + 2]!) - (P[b + 2]! - P[a + 2]!) * (P[c + 1]! - P[a + 1]!), (P[b + 2]! - P[a + 2]!) * (P[c]! - P[a]!) - (P[b]! - P[a]!) * (P[c + 2]! - P[a + 2]!), (P[b]! - P[a]!) * (P[c + 1]! - P[a + 1]!) - (P[b + 1]! - P[a + 1]!) * (P[c]! - P[a]!)];
      for (let x = 0; x < 3; x++) { fn[i + x] = f[x]!; for (const v of [a, b, c]) vn[v + x] = vn[v + x]! + f[x]!; }
    }
    for (let i = 0; i < H.tri.length; i += 3) {
      const e = [H.tri[i]!, H.tri[i + 1]!, H.tri[i + 2]!];
      let d = 0;
      for (let x = 0; x < 3; x++) d += fn[i + x]! * (vn[3 * e[0]! + x]! + vn[3 * e[1]! + x]! + vn[3 * e[2]! + x]!);
      if (!(d < 0)) continue;
      const k = [0, 1, 2].map((j) => Math.hypot(P[3 * e[j]!]! - P[3 * e[(j + 1) % 3]!]!, P[3 * e[j]! + 1]! - P[3 * e[(j + 1) % 3]! + 1]!, P[3 * e[j]! + 2]! - P[3 * e[(j + 1) % 3]! + 2]!));
      const nachbarn = e.map((v) => H.nachbarn[v]!.length);
      console.log(`   Rest: bei ${[0, 1, 2].map((x) => ((P[3 * e[0]! + x]! + P[3 * e[1]! + x]! + P[3 * e[2]! + x]!) / 3).toFixed(0)).join('/')}, Kanten ${k.map((v) => v.toFixed(1)).join(' ')}, auf Linie: ${e.map((v) => (aufLinie.has(v) ? 'ja' : 'nein')).join(' ')}, Nachbarn ${nachbarn.join(' ')}, Fläche ${(0.5 * Math.hypot(fn[i]!, fn[i + 1]!, fn[i + 2]!)).toFixed(1)}`);
    }
  }
  const nachAlt = alt ? umgeschlagen(alt.haut) : vor;
  const nach = r ? umgeschlagen(r.haut) : vor;
  const netz = r ? stimmt(r.haut) : 'unverändert';
  if (nach > Math.min(vor, nachAlt) || (r && netz !== 'Netz stimmt')) schlecht++;
  console.log(
    `${path.basename(datei)}: ${h.n} Punkte, umgeschlagen ${vor} → ohne Aufrichten ${nachAlt}, mit ${nach} (gedreht oder gerückt ${r?.aufgerichtet ?? 0}, zusammengelegt ${alt?.gelegt ?? 0} → ${r?.gelegt ?? 0}, neu ${r?.neu ?? 0}), ${netz}, ${ms.toFixed(0)} ms`,
  );
}
console.log(schlecht ? `${schlecht} Stände schlechter als vorher oder Netz stimmt nicht` : 'nirgends mehr als vorher');
