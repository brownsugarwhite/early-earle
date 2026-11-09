// Form zuerst (08.11.2026), Beweis „Form unabhängig vom Netz“ (Florian: „Ja, mach mit dem Löser-Beweis weiter: Form unabhängig vom
// Netz, Kriterien Sprung beim Loslassen höchstens ein halber Bildpunkt, je Mausbewegung höchstens 16 ms.“). Nachgestellt wie das
// Fenster: Kugel mit drei Loops (Ring waagerecht, Mitte, Ring senkrecht), ein Zug in 60 Mausschritten mit je zwei Runden über die
// ganze Haut, am Ende vier Runden. Dann:
//   A   Stand beim Loslassen (grobes Netz),
//   A+  dasselbe Netz, 30 Runden weiter (ist das grobe Netz fertig gerechnet?),
//   B   verdichtet (wie das Fenster nach dem Zug) und vier Runden (das Setzen in der Ruhe),
//   B+  dasselbe feine Netz, 30 Runden weiter.
// Gemessen: Abstand jedes Punkts des späteren Stands zur Fläche des früheren (größter, 99 %, Mittel). A → B ist der Sprung, den das
// Fenster zeigt; A+ → B+ ist die Abhängigkeit der Form vom Netz.
// FALL=hals|ruessel, GEWICHTE=gleich|geometrie (Löser), RUNDEN (weiter, Standard 30), FEIN=<Kantenanteil> (noch ein feines Netz C),
// KONVERGENZ=1 (Bewegung je JE_MESSEN Runden nach dem Zug), SPEICHERN/VERGLEICH=<Datei> (über Läufe mit verschiedenen DREIECKE).
// Aufruf aus packages/shape: FALL=hals npx vite-node ../../apps/editor/scripts/pruefen/form-netzunabhaengig.ts
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, type V3, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import {
  type Loop,
  LoopZug,
  festlegen,
  griffeAnlegen,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
  verschiebungLaengs,
} from '../../../../packages/shape/src/dicht/loops';
import { daempfungSetzen, messreiheSetzen } from '../../../../packages/shape/src/dicht/ausKurven';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';

const fall = process.env.FALL ?? 'hals';
if (process.env.DAEMPFUNG) daempfungSetzen(Number(process.env.DAEMPFUNG));
const gewichte = (process.env.GEWICHTE ?? 'gleich') as 'gleich' | 'geometrie';
// RICHTUNG=1 (09.11., Beweis „Linien mit Richtung“): jede Linie gibt der Haut ihre Richtung aus dem Liniennetz vor
const opt = process.env.RICHTUNG ? { richtung: true } : {};

const weiter = Number(process.env.RUNDEN ?? 30);
const kugel = () => {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke: Number(process.env.DREIECKE ?? 6000) },
  );
  return hautAus(n.positionen, n.indizes);
};

type Stand = { h: Haut; loops: Loop[] };
function dreiLoops(): Stand {
  let h = kugel();
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
    ['seite', [10, 200], [10, -200]],
  ] as const) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (let j = 0; j < loops.length; j++) {
    for (let i = 0; i < j; i++)
      for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol)) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
    griffeAnlegen(loops[j]!);
  }
  return { h, loops };
}

const punktZug = (l: Loop, i: number, D: V3): Float64Array => {
  const d = verschiebungLaengs(
    l,
    l.punkte.map((_, k) => (k === i ? D : { x: 0, y: 0, z: 0 })),
  );
  if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
  return d;
};

// ---------- Abstand Punkt → Fläche ----------
function punktDreieck(p: number[], a: number[], b: number[], c: number[]): number {
  const sub = (u: number[], v: number[]) => [u[0]! - v[0]!, u[1]! - v[1]!, u[2]! - v[2]!];
  const dot = (u: number[], v: number[]) => u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  let q: number[];
  if (d1 <= 0 && d2 <= 0) q = a;
  else {
    const bp = sub(p, b);
    const d3 = dot(ab, bp);
    const d4 = dot(ac, bp);
    if (d3 >= 0 && d4 <= d3) q = b;
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        q = [a[0]! + v * ab[0]!, a[1]! + v * ab[1]!, a[2]! + v * ab[2]!];
      } else {
        const cp = sub(p, c);
        const d5 = dot(ab, cp);
        const d6 = dot(ac, cp);
        if (d6 >= 0 && d5 <= d6) q = c;
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            q = [a[0]! + w * ac[0]!, a[1]! + w * ac[1]!, a[2]! + w * ac[2]!];
          } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
              q = [b[0]! + w * (c[0]! - b[0]!), b[1]! + w * (c[1]! - b[1]!), b[2]! + w * (c[2]! - b[2]!)];
            } else {
              const den = 1 / (va + vb + vc);
              const v = vb * den;
              const w = vc * den;
              q = [a[0]! + ab[0]! * v + ac[0]! * w, a[1]! + ab[1]! * v + ac[1]! * w, a[2]! + ab[2]! * v + ac[2]! * w];
            }
          }
        }
      }
    }
  }
  return Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
}
type Schnapp = { P: Float64Array; T: Uint32Array };
const schnapp = (h: Haut): Schnapp => ({ P: Float64Array.from(h.pos), T: Uint32Array.from(h.tri) });
function flaeche(S: Schnapp): (p: number[]) => number {
  const { P, T } = S;
  let kante = 0;
  for (let i = 0; i < T.length; i += 3) kante += Math.hypot(P[3 * T[i]!]! - P[3 * T[i + 1]!]!, P[3 * T[i]! + 1]! - P[3 * T[i + 1]! + 1]!, P[3 * T[i]! + 2]! - P[3 * T[i + 1]! + 2]!);
  const h = (2 * kante) / (T.length / 3);
  const zellen = new Map<string, number[]>();
  const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
  for (let t = 0; t < T.length / 3; t++) {
    const v = [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!];
    const lo = [0, 1, 2].map((c) => Math.floor(Math.min(...v.map((w) => P[3 * w + c]!)) / h));
    const hi = [0, 1, 2].map((c) => Math.floor(Math.max(...v.map((w) => P[3 * w + c]!)) / h));
    for (let i = lo[0]!; i <= hi[0]!; i++)
      for (let j = lo[1]!; j <= hi[1]!; j++)
        for (let k = lo[2]!; k <= hi[2]!; k++) {
          const s = key(i, j, k);
          const l = zellen.get(s);
          if (l) l.push(t);
          else zellen.set(s, [t]);
        }
  }
  const ecke = (w: number) => [P[3 * w]!, P[3 * w + 1]!, P[3 * w + 2]!];
  return (p) => {
    const c = [0, 1, 2].map((k) => Math.floor(p[k]! / h));
    let best = Infinity;
    for (let r = 1; r <= 12; r++) {
      const gesehen = new Set<number>();
      for (let i = c[0]! - r; i <= c[0]! + r; i++)
        for (let j = c[1]! - r; j <= c[1]! + r; j++)
          for (let k = c[2]! - r; k <= c[2]! + r; k++) {
            const l = zellen.get(key(i, j, k));
            if (!l) continue;
            for (const t of l) {
              if (gesehen.has(t)) continue;
              gesehen.add(t);
              best = Math.min(best, punktDreieck(p, ecke(T[3 * t]!), ecke(T[3 * t + 1]!), ecke(T[3 * t + 2]!)));
            }
          }
      if (best <= (r - 0.5) * h) return best;
    }
    return best;
  };
}
/** wie weit sich die Fläche von A nach B bewegt hat (in beide Richtungen, das Größere) */
function bewegung(A: Schnapp, B: Schnapp): { max: number; p99: number; mittel: number; wo: number[] } {
  const w: number[] = [];
  let max = 0;
  let wo: number[] = [];
  for (const [X, Y] of [
    [A, B],
    [B, A],
  ] as const) {
    const d = flaeche(X);
    for (let v = 0; v < Y.P.length / 3; v++) {
      const p = [Y.P[3 * v]!, Y.P[3 * v + 1]!, Y.P[3 * v + 2]!];
      const x = d(p);
      w.push(x);
      if (x > max) {
        max = x;
        wo = p;
      }
    }
  }
  w.sort((a, b) => a - b);
  return { max, p99: w[Math.floor(0.99 * (w.length - 1))]!, mittel: w.reduce((s, x) => s + x, 0) / w.length, wo };
}
const f2 = (x: number) => x.toFixed(2);
const zeile = (name: string, X: Schnapp, Y: Schnapp) => {
  const m = bewegung(X, Y);
  console.log(`  ${name}: bis ${f2(m.max)} (99 % ${f2(m.p99)}, Mittel ${f2(m.mittel)}) bei (${m.wo.map((v) => v.toFixed(0)).join(', ')})`);
  return m;
};

// ---------- der Zug ----------
const st = dreiLoops();
const MK = mittlereKante(st.h);
const mitteNr = () => st.loops.findIndex((l) => l.art === 'mitte');
let verschiebung: (anteil: number) => (Float64Array | null)[];
if (fall === 'hals') {
  // die obere Kreuzung (Mitte und senkrechter Ring) 160 hoch
  const m = st.loops[mitteNr()]!;
  const oben = m.punkte.reduce((b, p) => (p.ref.y > b.ref.y ? p : b)).kreuzung!;
  verschiebung = (anteil) =>
    st.loops.map((l) => {
      const i = l.punkte.findIndex((p) => p.kreuzung === oben);
      return i < 0 ? null : punktZug(l, i, { x: 0, y: 160 * anteil, z: 0 });
    });
} else if (fall === 'ohr') {
  // wie form-loslassen-probe: auf dem senkrechten Ring Punkte bei 40°, 50°, 60°, 70° (Winkel in der Front, von oben), die bei 50° und
  // 60° zusammen 70 nach außen (Richtung 55°)
  const ring = st.loops.find((l) => l.art === 'ring' && l.punkte.some((p) => Math.abs(p.ref.y) > 100))!;
  for (const w of [40, 50, 60, 70]) {
    const th = (w * Math.PI) / 180;
    let best = 0;
    for (let j = 0; j < ring.s.length; j++) {
      const a = Math.atan2(ring.ruhe[3 * j + 2]!, ring.ruhe[3 * j + 1]!);
      const b = Math.atan2(ring.ruhe[3 * best + 2]!, ring.ruhe[3 * best + 1]!);
      if (Math.abs(a - th) < Math.abs(b - th)) best = j;
    }
    const j = Math.min(best, ring.s.length - 2);
    punktEinfuegen(ring, 0.5 * (ring.s[j]! + ring.s[j + 1]!));
  }
  const wahl = ring.punkte
    .map((p, i) => ({ i, w: (Math.atan2(p.ref.z, p.ref.y) * 180) / Math.PI, k: p.kreuzung }))
    .filter((q) => q.k === undefined && q.w > 45 && q.w < 65)
    .map((q) => q.i);
  const r = (55 * Math.PI) / 180;
  verschiebung = (anteil) =>
    st.loops.map((l) => {
      if (l !== ring) return null;
      const D = { x: 0, y: 70 * Math.cos(r) * anteil, z: 70 * Math.sin(r) * anteil };
      return verschiebungLaengs(
        l,
        l.punkte.map((_, k) => (wahl.includes(k) ? D : { x: 0, y: 0, z: 0 })),
      );
    });
} else {
  // ein neuer Punkt der Mitte oben hinten, weit hinaus (+320 / −70)
  const m = st.loops[mitteNr()]!;
  let s0 = 0;
  let best = Infinity;
  for (let j = 0; j < m.proben.length; j++) {
    const d = Math.hypot(m.ruhe[3 * j]! - 106, m.ruhe[3 * j + 1]! - 106);
    if (d < best) {
      best = d;
      s0 = m.s[j]!;
    }
  }
  punktEinfuegen(m, s0);
  const i = m.punkte.findIndex((p) => Math.abs(p.s - s0) < 1e-9);
  verschiebung = (anteil) => st.loops.map((l) => (l === m ? punktZug(l, i, { x: 320 * anteil, y: -70 * anteil, z: 0 }) : null));
}
const SCHRITTE = Number(process.env.SCHRITTE ?? 60);
/** Runden je Mausschritt (das Fenster: eine, nach der Geometrie meist nur eine) */
const JE_SCHRITT = Number(process.env.JE_SCHRITT ?? 2);
const t0 = performance.now();
const z = new LoopZug(st.h, st.loops, null, true, 'kurven', gewichte, opt);
const tZerlegen = performance.now() - t0;
let d: (Float64Array | null)[] = [];
const tz = performance.now();
for (let k = 1; k <= SCHRITTE; k++) {
  d = verschiebung(k / SCHRITTE);
  z.schritt(d, JE_SCHRITT);
}
const jeSchritt = (performance.now() - tz) / SCHRITTE;
// Nachhinken: der Stand nach dem letzten Mausschritt und nach zwei Runden ohne Bewegung, gegen den fertig gerechneten (A+, unten)
const A0 = schnapp(st.h);
z.schritt(d, 2);
const A2 = schnapp(st.h);
z.schritt(d, 2);
{
  const zt = (z.loeser as unknown as { zeiten?: Record<string, number> }).zeiten;
  if (zt) {
    const r = zt.runden || 1;
    console.log(
      `  je Runde: vermessen ${(zt.vermessen! / r).toFixed(2)} ms, intrinsisch ${(zt.intrinsisch! / r).toFixed(2)} ms, Krümmung verteilen ` +
        `${(zt.kruemmung! / r).toFixed(2)} ms (${(zt.schritte! / r).toFixed(1)} Schritte), Lagen lösen ${(zt.loesen! / r).toFixed(2)} ms`,
    );
  }
}
for (const l of st.loops) festlegen(st.h, l);
const A = schnapp(st.h);
// SCHWINGEN=<Runden>: vom Stand A ein Löser, Runde für Runde gemessen (FEST=1: Dämpfung ohne Anpassung, QFEST=1: Quellen fest)
if (process.env.SCHWINGEN) {
  messreiheSetzen({ fest: process.env.FEST === '1', quellenFest: process.env.QFEST === '1' });
  const hS = { ...st.h, pos: Float64Array.from(A.P) };
  const zS = new LoopZug(hS, st.loops, null, true, 'kurven', gewichte, opt);
  let vor = schnapp(hS);
  for (let r = 1; r <= Number(process.env.SCHWINGEN); r++) {
    zS.schritt(
      st.loops.map(() => null),
      1,
    );
    const jetzt = schnapp(hS);
    zeile(`Runde ${r}`, vor, jetzt);
    vor = jetzt;
  }
  messreiheSetzen({ fest: false, quellenFest: false });
}
console.log(`${fall}: ${st.h.n} Punkte, Zerlegen ${tZerlegen.toFixed(0)} ms, je Mausschritt (${JE_SCHRITT} Runden) ${jeSchritt.toFixed(1)} ms`);
/** Runden ohne Zug (ein neuer Löser, wie das Fenster nach jeder Änderung) */
const runden = (h: Haut, loops: Loop[], n: number) => {
  new LoopZug(h, loops, null, true, 'kurven', gewichte, opt).schritt(
    loops.map(() => null),
    n,
  );
};
// A+: dasselbe Netz weiter (KONVERGENZ=1: Bewegung je fünf Runden)
const hA = { ...st.h, pos: Float64Array.from(st.h.pos) };
if (process.env.KONVERGENZ) {
  let vor = schnapp(hA);
  let dVor: Float64Array | null = null;
  const je = Number(process.env.JE_MESSEN ?? 5);
  for (let r = 0; r < weiter; r += je) {
    runden(hA, st.loops, je);
    const jetzt = schnapp(hA);
    const d = jetzt.P.map((x, i) => x - vor.P[i]!);
    let cos = NaN;
    if (dVor) {
      let ab = 0;
      let aa = 0;
      let bb = 0;
      for (let i = 0; i < d.length; i++) {
        ab += d[i]! * dVor[i]!;
        aa += d[i]! * d[i]!;
        bb += dVor[i]! * dVor[i]!;
      }
      cos = ab / Math.sqrt(aa * bb);
    }
    dVor = d;
    zeile(`Runden ${r + 1}–${r + je} (Richtung gegen vorher ${cos.toFixed(2)})`, vor, jetzt);
    vor = jetzt;
  }
} else runden(hA, st.loops, weiter);
const Aplus = schnapp(hA);
// B: verdichtet wie das Fenster, vier Runden; B+: weiter
// GENAU=1: wie das Fenster auch Linienkanten teilen, wo die Linie mehr als MK/40 neben ihrem Pfad liegt
const v = verdichten(st.h, st.loops, 1.75 * MK, { kurz: 0.5 * MK, ...(process.env.GENAU ? { genau: MK / 40 } : {}) });
if (v) {
  st.h = v.haut;
  st.loops = v.loops;
}
runden(st.h, st.loops, 4);
const B = schnapp(st.h);
runden(st.h, st.loops, weiter);
const Bplus = schnapp(st.h);
console.log(`  verdichtet: ${A.P.length / 3} → ${B.P.length / 3} Punkte`);
zeile('A → A+ (grobes Netz weiter gerechnet)', A, Aplus);
zeile('Nachhinken: letzter Mausschritt → A+', A0, Aplus);
zeile('Nachhinken: zwei Runden danach → A+', A2, Aplus);
// Vergleich über Läufe mit verschiedenen Startnetzen (DREIECKE): A+ speichern bzw. mit einem gespeicherten vergleichen
if (process.env.SPEICHERN) {
  const fs = await import('node:fs');
  fs.writeFileSync(process.env.SPEICHERN, JSON.stringify({ P: Array.from(Aplus.P), T: Array.from(Aplus.T) }));
}
if (process.env.VERGLEICH) {
  const fs = await import('node:fs');
  const o = JSON.parse(fs.readFileSync(process.env.VERGLEICH, 'utf8')) as { P: number[]; T: number[] };
  zeile(`A+ gegen ${process.env.VERGLEICH.split('/').pop()}`, { P: Float64Array.from(o.P), T: Uint32Array.from(o.T) }, Aplus);
}
zeile('A → B (Sprung wie im Fenster: verdichtet, vier Runden)', A, B);
zeile('B → B+ (feines Netz weiter gerechnet)', B, Bplus);
zeile('A+ → B+ (Form hängt am Netz)', Aplus, Bplus);
// C: noch feiner (alle Kanten über FEIN · Startkante geteilt), fertig gerechnet: Ist der Rest nur Auflösung, liegt B+ nahe an C+
const fein = Number(process.env.FEIN ?? 0);
if (fein > 0) {
  const c = verdichten(st.h, st.loops, fein * MK, { runden: 12 });
  if (c) {
    st.h = c.haut;
    st.loops = c.loops;
  }
  runden(st.h, st.loops, weiter + 4);
  const Cplus = schnapp(st.h);
  console.log(`  noch feiner (Kanten über ${fein} Startkanten geteilt): ${Cplus.P.length / 3} Punkte`);
  zeile('A+ → C+', Aplus, Cplus);
  zeile('B+ → C+', Bplus, Cplus);
}
// Güte der Dreiecke: Kanten mit negativem Kotangens-Gewicht (Gegenwinkel über 180°)
const guete = (S: Schnapp) => {
  const { P, T } = S;
  const w = new Map<number, number>();
  for (let t = 0; t < T.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = T[t + e]!;
      const b = T[t + ((e + 1) % 3)]!;
      const c = T[t + ((e + 2) % 3)]!;
      const u = [0, 1, 2].map((k) => P[3 * b + k]! - P[3 * a + k]!);
      const v = [0, 1, 2].map((k) => P[3 * c + k]! - P[3 * a + k]!);
      const kr = Math.hypot(u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!);
      const cot = (u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!) / kr;
      const k = Math.min(b, c) * 1e7 + Math.max(b, c);
      w.set(k, (w.get(k) ?? 0) + 0.5 * cot);
    }
  let neg = 0;
  for (const x of w.values()) if (x < 0) neg++;
  return `${neg} von ${w.size} Kanten negativ (${((100 * neg) / w.size).toFixed(1)} %)`;
};
console.log(`  Kotangens negativ: A ${guete(A)}, B ${guete(B)}`);
