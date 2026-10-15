// Tor von B2 (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B): Zwischenstufen alt gegen neu und Rahmen
// der Pose-Deltas (K6). Start aus packages/shape: `npx vite-node ../../apps/editor/scripts/pruefen/posen-tor-b2.ts`.
//
// Wesen aus dem Prüfstand (Kugel, Rex, Kasten, Drache, Langhals) mit Maul, Haps 1 und einer geformten Fressen-Pose wie aus
// dem heutigen Editor (zwei Pinselzüge in der vollen Pose: Unterlippe weit hinab, Mundwinkel vor und einwärts; gespeichert
// nach den Knochen). Gemessen:
// 1. Zwischenstufen t = 0,1 … 0,9: alt (`maulLageBei`: Knochen, Haps mit t, Deltas mal t nach den Knochen) gegen neu
//    (`maulLageRuhe`: Ruhe-Deltas vor den Knochen) — größte Abweichung (px), Durchdringungen mit Haut je Weg.
// 2. K6: Die Grundform ändert sich (fünf Fälle, als glatte Verformung φ des Ruhe-Käfigs); wie gut folgen die Ruhe-Deltas?
//    Ideal: D' = φ(A + D) − φ(A) (die geformte Pose verformt sich mit dem Körper). Verglichen: Welt (D' = D), starrer
//    Rahmen, Zellbasis mit mittlerer Kantenlänge (`rahmen.ts`), Kantenrahmen (H 4.3: zwei Kanten + Normale·√Fläche).
//    Vorab festgelegt: Ein lokaler Rahmen „verliert“ einen Fall, wenn sein mittlerer Fehler den der Weltrahmen um mehr als
//    0,5 px übersteigt. K6: der beste lokale Rahmen verliert ≥ 1 von 5 Fällen → Weltrahmen.
// Ausgabe: Tabelle, `apps/editor/pruefen-ausgabe/posen-tor-b2.json` und je Wesen ein Dokument `b2-<name>.json` (für Bilder).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument, KaefigDelta } from '../../../../packages/shape/src/dokument';
import { MAUL_STANDARD, type MaulErgebnis, ableitenMitMaul, kieferGewichteSetzen, maulOptionenVorlage } from '../../../../packages/shape/src/kern/maul';
import { maulLinieAusDokument } from '../../../../packages/shape/src/kern/maulDokument';
import { kaefigNormalen, pinselGewichte } from '../../../../packages/shape/src/kern/pinsel';
import { feinesNetz, regionen } from '../../../../packages/shape/src/kern/pruefstand';
import { type Fall, fallDokumente } from '../../../../packages/shape/src/kern/pruefen/faelle';
import { fressenRuheDeltas, maulLageRuhe } from '../../../../packages/shape/src/kern/posen/lage';
import { ausBasis, inBasis, zellbasis } from '../../../../packages/shape/src/kern/posen/rahmen';
import { oertlicheAbbildung, umgebung as umgebungBauen } from '../../../../packages/shape/src/kern/posen/uebertrag';
import { maulLageBei } from '../../../../packages/shape/src/kern/wesen';
import { selbstDurchdringungen } from '../../../../packages/shape/src/versuch/pruefen';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(AUSGABE, { recursive: true });
const PX = 461;
type V3 = [number, number, number];

const WESEN: { name: string; fall: Omit<Fall, 'id' | 'start' | 'bearbeitung'> }[] = [
  { name: 'kugel', fall: { koerper: 'kugel', anfang: 'mittel', form: 'gerade', laenge: 'lang', kiefer: 'ueberbiss' } },
  { name: 'rex', fall: { koerper: 'rex', anfang: 'mittel', form: 'vorlage', laenge: 'lang', kiefer: 'ueberbiss' } },
  { name: 'kasten', fall: { koerper: 'kasten', anfang: 'mittel', form: 'gerade', laenge: 'lang', kiefer: 'gleich' } },
  { name: 'drache', fall: { koerper: 'drache', anfang: 'mittel', form: 'vorlage', laenge: 'lang', kiefer: 'gleich' } },
  { name: 'langhals', fall: { koerper: 'langhals', anfang: 'mittel', form: 'vorlage', laenge: 'lang', kiefer: 'unterbiss' } },
];

function bauen(dok: Dokument): MaulErgebnis {
  const linie = maulLinieAusDokument(dok);
  if (!linie) throw new Error('kein Maul');
  const opt = { ...MAUL_STANDARD, ...maulOptionenVorlage('vorn'), haps: 1 };
  const g = dok.kaefig?.stationen;
  const abl = ableitenMitMaul(dok, linie, { stufen: 2, ...(g ? { stationen: g } : {}) }, opt);
  abl.maul.opt = opt;
  kieferGewichteSetzen(abl.maul, opt);
  return abl;
}

/** Fressen-Deltas wie aus dem heutigen Editor: Pinselzüge in der vollen Pose, gespeichert nach den Knochen (rechte Hälfte + Naht). */
function fressenPinsel(abl: MaulErgebnis): KaefigDelta[] {
  const m = abl.maul;
  const n = abl.kaefig.n;
  const voll = maulLageBei(abl, 1, []).xyz;
  const mm = m.pfad.length - 1;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 1; i < abl.kaefig.xyz.length; i += 3) {
    yMin = Math.min(yMin, abl.kaefig.xyz[i]!);
    yMax = Math.max(yMax, abl.kaefig.xyz[i]!);
  }
  const H = yMax - yMin;
  const K = m.kopfHoehe;
  const p = (i: number): V3 => [voll[3 * i]!, voll[3 * i + 1]!, voll[3 * i + 2]!];
  // Pinsel nach der Kopfhöhe (am Kasten griff ein Radius nach der Körperhöhe bis in Tasche und Hals), höchstens 25 % bzw.
  // 15 % der Körperhöhe wie im Editor
  const zuege: { mitte: V3; radius: number; v: V3 }[] = [
    { mitte: p(m.unten[Math.floor(mm / 2)]!), radius: Math.min(0.25 * H, 0.6 * K), v: [0, -0.3 * K, 0] },
    { mitte: p(m.pfad[mm]!), radius: Math.min(0.15 * H, 0.35 * K), v: [-m.vorn * 0.15 * K, 0, -0.06 * K] },
  ];
  const d = new Float64Array(3 * n);
  for (const z of zuege) {
    const naht = Math.abs(z.mitte[2]) < 1e-6;
    for (const { punkt, w, wSpiegel } of pinselGewichte(voll, n, z.mitte, z.radius)) {
      const ws = naht ? 0 : wSpiegel;
      d[3 * punkt] = d[3 * punkt]! + (w + ws) * z.v[0];
      d[3 * punkt + 1] = d[3 * punkt + 1]! + (w + ws) * z.v[1];
      d[3 * punkt + 2] = d[3 * punkt + 2]! + (w - ws) * z.v[2];
    }
  }
  const out: KaefigDelta[] = [];
  for (let i = 0; i < n; i++) {
    if (abl.kaefig.xyz[3 * i + 2]! < -1e-9) continue;
    const di: V3 = [d[3 * i]!, d[3 * i + 1]!, Math.abs(abl.kaefig.xyz[3 * i + 2]!) < 1e-9 ? 0 : d[3 * i + 2]!];
    if (Math.hypot(...di) > 1e-9) out.push({ punkt: i, d: di });
  }
  return out;
}

function hautPaare(abl: MaulErgebnis, fein: Float64Array, flaechen: number[][], bereiche: string[]): number {
  const pts: V3[] = [];
  for (let i = 0; i < fein.length / 3; i++) pts.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
  try {
    const d = selbstDurchdringungen({ punkte: pts, flaechen, schaerfe: new Map() }, 1e-4, bereiche);
    let haut = 0;
    for (const [k, v] of Object.entries(d.nachBereich)) if (k.includes('haut')) haut += v;
    return haut;
  } catch {
    return Infinity;
  }
}

// ---------- Rahmen für K6 ----------
type Uebertrag = (A: Float64Array, A2: Float64Array, D: Float64Array, i: number) => V3;
function mitFlaechen(abl: MaulErgebnis) {
  const k = abl.kaefig;
  return { fStart: k.fStart, fVerts: k.fVerts, n: k.n };
}

/** Kantenrahmen je Punkt (H 4.3, auf beliebige Flächen verallgemeinert): Kanten zu den Nachbarn in der ersten Fläche, Normale·√Fläche. */
function kantenRahmen(xyz: ArrayLike<number>, fStart: ArrayLike<number>, fVerts: ArrayLike<number>, n: number): Float64Array {
  const normalen = kaefigNormalen(xyz, fStart, fVerts, n);
  const vor = new Int32Array(n).fill(-1);
  const nach = new Int32Array(n).fill(-1);
  for (let f = 0; f < fStart.length - 1; f++) {
    const a = fStart[f]!;
    const b = fStart[f + 1]!;
    for (let h = a; h < b; h++) {
      const i = fVerts[h]!;
      if (nach[i]! >= 0) continue;
      nach[i] = fVerts[h + 1 < b ? h + 1 : a]!;
      vor[i] = fVerts[h > a ? h - 1 : b - 1]!;
    }
  }
  const R = new Float64Array(9 * n);
  for (let i = 0; i < n; i++) {
    const e1: V3 = [xyz[3 * nach[i]!]! - xyz[3 * i]!, xyz[3 * nach[i]! + 1]! - xyz[3 * i + 1]!, xyz[3 * nach[i]! + 2]! - xyz[3 * i + 2]!];
    const e2: V3 = [xyz[3 * vor[i]!]! - xyz[3 * i]!, xyz[3 * vor[i]! + 1]! - xyz[3 * i + 1]!, xyz[3 * vor[i]! + 2]! - xyz[3 * i + 2]!];
    let c: V3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const a = Math.hypot(...c) || 1e-12;
    if (c[0] * normalen[3 * i]! + c[1] * normalen[3 * i + 1]! + c[2] * normalen[3 * i + 2]! < 0) c = [-c[0], -c[1], -c[2]];
    const s = Math.sqrt(a) / a;
    R.set([...e1, ...e2, c[0] * s, c[1] * s, c[2] * s], 9 * i);
  }
  return R;
}
function loese3(B: Float64Array, o: number, d: V3): V3 {
  // Spalten e1 = B[o..o+2], e2 = B[o+3..], e3 = B[o+6..]; löse [e1 e2 e3]·c = d (Cramer)
  const a = (r: number, c: number) => B[o + 3 * c + r]!;
  const det = (m: (r: number, c: number) => number) => m(0, 0) * (m(1, 1) * m(2, 2) - m(1, 2) * m(2, 1)) - m(0, 1) * (m(1, 0) * m(2, 2) - m(1, 2) * m(2, 0)) + m(0, 2) * (m(1, 0) * m(2, 1) - m(1, 1) * m(2, 0));
  const D0 = det(a);
  const mit = (k: number) => det((r, c) => (c === k ? d[r]! : a(r, c)));
  return [mit(0) / D0, mit(1) / D0, mit(2) / D0];
}
function bedingung(B: Float64Array, o: number): number {
  const l = [0, 3, 6].map((k) => Math.hypot(B[o + k]!, B[o + k + 1]!, B[o + k + 2]!));
  return Math.max(...l) / Math.max(1e-12, Math.min(...l));
}

function uebertraege(abl: MaulErgebnis) {
  const { fStart, fVerts, n } = mitFlaechen(abl);
  const cache = new Map<Float64Array, { z: ReturnType<typeof zellbasis>; k: Float64Array }>();
  const basis = (X: Float64Array) => {
    let c = cache.get(X);
    if (!c) {
      c = { z: zellbasis(X, fStart, fVerts, n), k: kantenRahmen(X, fStart, fVerts, n) };
      cache.set(X, c);
    }
    return c;
  };
  const welt: Uebertrag = (_A, _A2, D, i) => [D[3 * i]!, D[3 * i + 1]!, D[3 * i + 2]!];
  const iso: Uebertrag = (A, A2, D, i) => ausBasis(basis(A2).z, i, inBasis(basis(A).z, i, [D[3 * i]!, D[3 * i + 1]!, D[3 * i + 2]!]));
  const starr: Uebertrag = (A, A2, D, i) => {
    // Zellbasis ohne Skalierung: Länge der Achsen herausrechnen
    const z1 = basis(A).z;
    const z2 = basis(A2).z;
    const L1 = Math.hypot(z1.f[9 * i]!, z1.f[9 * i + 1]!, z1.f[9 * i + 2]!) || 1;
    const L2 = Math.hypot(z2.f[9 * i]!, z2.f[9 * i + 1]!, z2.f[9 * i + 2]!) || 1;
    const w = ausBasis(z2, i, inBasis(z1, i, [D[3 * i]!, D[3 * i + 1]!, D[3 * i + 2]!]));
    return [(w[0] * L1) / L2, (w[1] * L1) / L2, (w[2] * L1) / L2];
  };
  const kanten: Uebertrag = (A, A2, D, i) => {
    const B1 = basis(A).k;
    const B2 = basis(A2).k;
    const c = loese3(B1, 9 * i, [D[3 * i]!, D[3 * i + 1]!, D[3 * i + 2]!]);
    const o = 9 * i;
    return [B2[o]! * c[0] + B2[o + 3]! * c[1] + B2[o + 6]! * c[2], B2[o + 1]! * c[0] + B2[o + 4]! * c[1] + B2[o + 7]! * c[2], B2[o + 2]! * c[0] + B2[o + 5]! * c[1] + B2[o + 8]! * c[2]];
  };
  // Umgebung (Kern `kern/posen/uebertrag.ts`): örtliche affine Verformung aus den k nächsten Punkten des Bezugs-Käfigs
  const umgebungen = new Map<string, ReturnType<typeof umgebungBauen>>();
  const umgebungArt = (k: number): Uebertrag => (A, A2, D, i) => {
    const s = `${k}`;
    let u = umgebungen.get(s);
    if (!u) {
      u = umgebungBauen(A, n, k);
      umgebungen.set(s, u);
    }
    const F = oertlicheAbbildung(u, A, A2, i);
    const d: V3 = [D[3 * i]!, D[3 * i + 1]!, D[3 * i + 2]!];
    return [F[0]! * d[0] + F[1]! * d[1] + F[2]! * d[2], F[3]! * d[0] + F[4]! * d[1] + F[5]! * d[2], F[6]! * d[0] + F[7]! * d[1] + F[8]! * d[2]];
  };
  return { welt, starr, iso, kanten, basis, umgebung16: umgebungArt(16), umgebung32: umgebungArt(32), umgebung64: umgebungArt(64) };
}

// ---------- Grundform-Änderungen als glatte Verformungen ----------
type Verformung = { name: string; phi: (p: V3) => V3 };
function verformungen(abl: MaulErgebnis): Verformung[] {
  const m = abl.maul;
  const A = abl.kaefig.xyz;
  const ecke = m.pfad[m.pfad.length - 1]!;
  const cx = A[3 * ecke]!;
  const cy = A[3 * ecke + 1]!;
  const L = m.laenge;
  const v = m.vorn;
  let minY = Infinity;
  for (let i = 1; i < A.length; i += 3) minY = Math.min(minY, A[i]!);
  // Gewicht des Kopfes: 1 bis eine halbe Maullänge hinter dem Mundwinkel, dann glatt auf 0 über eine Maullänge
  const b = (x: number) => {
    const s = (v * (x - cx)) / L;
    if (s <= 0.5) return 1;
    if (s >= 1.5) return 0;
    const t = 1.5 - s;
    return t * t * (3 - 2 * t);
  };
  const hx = cx + v * L;
  const a = (-v * 25 * Math.PI) / 180;
  const xp = cx + v * 0.5 * L;
  return [
    { name: 'größer (×1,3)', phi: ([x, y, z]) => [1.3 * x, minY + 1.3 * (y - minY), 1.3 * z] },
    {
      name: 'Kopf kippt 25°',
      phi: ([x, y, z]) => {
        const w = b(x);
        const rx = hx + Math.cos(a) * (x - hx) - Math.sin(a) * (y - cy);
        const ry = cy + Math.sin(a) * (x - hx) + Math.cos(a) * (y - cy);
        return [x + w * (rx - x), y + w * (ry - y), z];
      },
    },
    { name: 'Schnauze länger (×1,4)', phi: ([x, y, z]) => [x + b(x) * 0.4 * (x - xp), y, z] },
    { name: 'Kopf höher (×1,3)', phi: ([x, y, z]) => [x, y + b(x) * 0.3 * (y - cy), z] },
    { name: 'Kopf breiter (×1,3)', phi: ([x, y, z]) => [x, y, z * (1 + 0.3 * b(x))] },
  ];
}

// ---------- Lauf ----------
const ergebnis: Record<string, unknown>[] = [];
const ARTEN = ['welt', 'starr', 'iso', 'kanten', 'umgebung16', 'umgebung32', 'umgebung64'] as const;
type Art = (typeof ARTEN)[number];
const K6: ({ wesen: string; fall: string } & Record<Art, number> & Record<`${Art}Max`, number>)[] = [];
for (const w of WESEN) {
  let fd: ReturnType<typeof fallDokumente> | null = null;
  for (let s = 1; s <= 12 && (!fd || 'fehler' in fd); s++) fd = fallDokumente({ ...w.fall, id: `b2-${w.name}`, bearbeitung: 'keine', start: 1000 + 37 * s });
  if (!fd || 'fehler' in fd) {
    console.log(`${w.name}: kein Fall baubar (${fd && 'fehler' in fd ? fd.fehler : '?'})`);
    continue;
  }
  const dok: Dokument = { ...fd.dok, name: `b2-${w.name}` };
  const abl = bauen(dok);
  const n = abl.kaefig.n;
  const alt = fressenPinsel(abl);
  const sk = dok.skalierung;
  const pxWelt = PX / sk;
  // Dokument für die Bilder im Editor (Fressen-Deltas wie heute gespeichert, Haps 1)
  const dokBild: Dokument = { ...dok, ausstattung: { ...(dok.ausstattung ?? {}), maulOptionen: { ...(dok.ausstattung?.maulOptionen ?? {}), haps: 1 } }, posen: dok.posen.map((q) => (q.id === 'fressen' ? { ...q, form: alt, formAlt: 'nachKnochen' as const } : q)) };
  writeFileSync(resolve(AUSGABE, `b2-${w.name}.json`), JSON.stringify(dokBild));
  // 1. Zwischenstufen
  const netz = feinesNetz(abl);
  const bereiche = regionen(abl, netz.flaechen);
  const hautPunkt = new Uint8Array(netz.punkte.length);
  netz.flaechen.forEach((f, k) => {
    if (bereiche[k] === 'haut') for (const i of f) hautPunkt[i] = 1;
  });
  const stufen: { t: number; maxHaut: number; maxAlle: number; paareAlt: number; paareNeu: number }[] = [];
  for (let k = 1; k <= 9; k++) {
    const t = k / 10;
    const fa = maulLageBei(abl, t, alt).fein;
    const fn = maulLageRuhe(abl, t, alt).fein;
    let maxHaut = 0;
    let maxAlle = 0;
    for (let i = 0; i < fa.length / 3; i++) {
      const d = Math.hypot(fa[3 * i]! - fn[3 * i]!, fa[3 * i + 1]! - fn[3 * i + 1]!, fa[3 * i + 2]! - fn[3 * i + 2]!) * pxWelt;
      maxAlle = Math.max(maxAlle, d);
      if (hautPunkt[i]) maxHaut = Math.max(maxHaut, d);
    }
    stufen.push({ t, maxHaut, maxAlle, paareAlt: hautPaare(abl, fa, netz.flaechen, bereiche), paareNeu: hautPaare(abl, fn, netz.flaechen, bereiche) });
  }
  const voll = (() => {
    const a = maulLageBei(abl, 1, alt).fein;
    const b2 = maulLageRuhe(abl, 1, alt).fein;
    let m = 0;
    for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]! - b2[i]!));
    return m;
  })();
  console.log(`\n${w.name} (${n} Käfigpunkte, ${alt.length} Deltas, Maullänge ${(abl.maul.laenge * pxWelt).toFixed(0)} px): alt ≡ neu bei 1: ${voll.toExponential(1)}`);
  console.log('  t    max Haut px  max alle px  Paare alt  Paare neu');
  for (const s of stufen) console.log(`  ${s.t.toFixed(1)}  ${s.maxHaut.toFixed(2).padStart(10)}  ${s.maxAlle.toFixed(2).padStart(11)}  ${String(s.paareAlt).padStart(9)}  ${String(s.paareNeu).padStart(9)}`);
  // 2. K6
  const D = fressenRuheDeltas(abl, alt);
  const A = new Float64Array(abl.kaefig.xyz);
  let maxD = 0;
  for (let i = 0; i < n; i++) maxD = Math.max(maxD, Math.hypot(D[3 * i]!, D[3 * i + 1]!, D[3 * i + 2]!));
  const u = uebertraege(abl);
  console.log(`  K6 (|D| max ${(maxD * pxWelt).toFixed(1)} px; mittlerer / größter Fehler in px gegen die mitverformte Pose)`);
  console.log('  Fall                      Welt         starr        Zellbasis    Kantenrahmen Umgebung16   Umgebung32   Umgebung64');
  for (const vf of verformungen(abl)) {
    const A2 = new Float64Array(3 * n);
    const Ideal = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
      const p: V3 = [A[3 * i]!, A[3 * i + 1]!, A[3 * i + 2]!];
      const q = vf.phi(p);
      const r = vf.phi([p[0] + D[3 * i]!, p[1] + D[3 * i + 1]!, p[2] + D[3 * i + 2]!]);
      A2.set(q, 3 * i);
      Ideal.set([r[0] - q[0], r[1] - q[1], r[2] - q[2]], 3 * i);
    }
    const fehler: Record<string, number[]> = Object.fromEntries(ARTEN.map((a2) => [a2, []]));
    for (let i = 0; i < n; i++) {
      if (A[3 * i + 2]! < -1e-9) continue;
      if (Math.hypot(D[3 * i]!, D[3 * i + 1]!, D[3 * i + 2]!) < 0.05 * maxD) continue;
      for (const art of ARTEN) {
        const e = u[art](A, A2, D, i);
        fehler[art]!.push(Math.hypot(e[0] - Ideal[3 * i]!, e[1] - Ideal[3 * i + 1]!, e[2] - Ideal[3 * i + 2]!) * pxWelt);
      }
    }
    const mittel = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
    const groesst = (a: number[]) => a.reduce((s, x) => Math.max(s, x), 0);
    const z = (art: string) => `${mittel(fehler[art]!).toFixed(2)} / ${groesst(fehler[art]!).toFixed(1)}`.padEnd(13);
    console.log(`  ${vf.name.padEnd(26)}${ARTEN.map((a2) => z(a2)).join('')}`);
    const zeile = { wesen: w.name, fall: vf.name } as { wesen: string; fall: string } & Record<Art, number> & Record<`${Art}Max`, number>;
    for (const a2 of ARTEN) {
      zeile[a2] = mittel(fehler[a2]!);
      zeile[`${a2}Max`] = groesst(fehler[a2]!);
    }
    K6.push(zeile);
  }
  let condMax = 0;
  const kb = u.basis(A).k;
  for (let i = 0; i < n; i++) condMax = Math.max(condMax, bedingung(kb, 9 * i));
  console.log(`  Kantenrahmen: größtes Achsenverhältnis ${condMax.toFixed(1)}`);
  ergebnis.push({ wesen: w.name, n, deltas: alt.length, maullaengePx: abl.maul.laenge * pxWelt, vollGleich: voll, stufen, condMax });
}
// Urteil K6 je Fall (über alle Wesen gemittelt)
const faelle = [...new Set(K6.map((k) => k.fall))];
console.log('\nK6 über alle Wesen (mittlerer Fehler px):');
const LOKAL = ARTEN.filter((a2) => a2 !== 'welt');
const summe: Record<string, number> = Object.fromEntries(LOKAL.map((a2) => [a2, 0]));
const mittelFall = (f: string, art: Art) => {
  const z = K6.filter((k) => k.fall === f);
  return z.reduce((s, k) => s + k[art], 0) / z.length;
};
for (const f of faelle) {
  for (const art of LOKAL) summe[art] = summe[art]! + mittelFall(f, art);
  console.log(`  ${f.padEnd(26)} ${ARTEN.map((a2) => `${a2} ${mittelFall(f, a2).toFixed(2)}`).join('  ')}`);
}
const urteil: Record<string, string[]> = {};
for (const art of LOKAL) urteil[art] = faelle.filter((f) => mittelFall(f, art) > mittelFall(f, 'welt') + 0.5);
for (const art of LOKAL) console.log(`  ${art.padEnd(11)} Summe ${summe[art]!.toFixed(2)} px, verliert gegen Welt (> 0,5 px) in: ${urteil[art]!.length ? urteil[art]!.join(', ') : 'keinem Fall'}`);
const bester = LOKAL.slice().sort((a2, b2) => summe[a2]! - summe[b2]!)[0]!;
const verloren = urteil[bester]!;
console.log(`Bester lokaler Übertrag: ${bester} → ${verloren.length ? 'verliert ' + verloren.length + ' Fall/Fälle, K6 greift' : 'verliert keinen Fall'}`);
writeFileSync(resolve(AUSGABE, 'posen-tor-b2.json'), JSON.stringify({ ergebnis, K6, bester, verloren }, null, 1));
