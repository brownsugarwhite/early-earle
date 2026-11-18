// Plan „Objekte, Spiegel, Nähte“ (18.11.2026), Beweis 1: Trägt die heutige Rechnung eine Form ohne Spiegelpaare?
// Florian: „dass ich mirror modifier applien kann, dann ist es nicht mehr gespiegelt, sondern ein ganzes Mesh, und ich kann
// asymmetrische Dinge gestalten.“
//
// Der Weg: Die Haut bleibt Punkt für Punkt, wie sie ist, nur ohne Spiegelpaare (`spiegelAnwenden` in
// `packages/shape/src/dicht/frei.ts`), und jede Linie wird ein geschlossener Loop für sich. Kugel mit drei Loops (Mitte, zwei Ringe).
// `DZ=<Abstand>` rechnet sie zum Vergleich quer zur Ebene verschoben (so war der erste Versuch; die Rechnung hängt am Abstand vom
// Ursprung: bei 3 000 wandert die Kugel, bei 20 000 läuft sie davon).
//   ruhe      dieselbe Form, frei gerechnet: Sie darf sich nicht verändern
//   einseitig ein Punkt nur auf einer Seite 40 hinaus: Die andere Seite bleibt, nichts umgeschlagen
//   verdichten das Netz räumt auf, ohne Paare zu erfinden
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-frei.ts
import { spiegelAnwenden } from '../../../../packages/shape/src/dicht/frei';
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import { dreiLoops, falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, festlegen, griffeAnlegen, hatPfad, mittlereKante, pfadLagen } from '../../../../packages/shape/src/dicht/loops';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';

const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
let schlecht = 0;
const ok = (name: string, gut: boolean, text = ''): void => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const pfade = (loops: readonly Loop[]): Float64Array[] => loops.map((l) => pfadLagen(l) ?? Float64Array.from(l.ruhe));

/** die heutige Rechnung zu den Lagen der Linien; zurück: Runden bis zur Ruhe, letzter Weg */
function rechnen(h: Haut, loops: Loop[], lagen: readonly Float64Array[], schritte: number, ende: number): { runden: number; weg: number; ms: number } {
  const t0 = performance.now();
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
  const versch = loops.map((l, i) => Float64Array.from(lagen[i]!, (x, k) => x - l.ruhe[k]!));
  for (let s = 1; s <= schritte; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / schritte)), 2);
  let weg = Infinity;
  let r = 0;
  for (; r < ende && weg > 0.02; r++) {
    const vor = Float64Array.from(h.pos);
    z.schritt(versch, 1);
    weg = 0;
    for (let i = 0; i < vor.length; i++) weg = Math.max(weg, Math.abs(h.pos[i]! - vor[i]!));
    if (!Number.isFinite(weg)) throw new Error('die Haut ist nicht endlich');
  }
  for (const l of loops) festlegen(h, l, !hatPfad(l));
  return { runden: r, weg, ms: performance.now() - t0 };
}
const groessterWeg = (a: Float64Array, b: Float64Array, nur?: (i: number) => boolean): number => {
  let m = 0;
  for (let v = 0; v < a.length / 3; v++) {
    if (nur && !nur(v)) continue;
    m = Math.max(m, Math.hypot(a[3 * v]! - b[3 * v]!, a[3 * v + 1]! - b[3 * v + 1]!, a[3 * v + 2]! - b[3 * v + 2]!));
  }
  return m;
};

// ---------- die Kugel mit drei Loops, gespiegelt, in Ruhe ----------
const d = dreiLoops();
for (const l of d.loops) griffeAnlegen(l, l.ruhe, true);
const ra = rechnen(d.h, d.loops, pfade(d.loops), 4, 400);
console.log(`gespiegelt: ${d.h.n} Punkte, Loops ${d.loops.map((l) => `${l.id} ${l.art} ${l.punkte.length}P`).join(', ')}; ${JSON.stringify(falten(d.h))}; Ruhe nach ${ra.runden} Runden (letzter Weg ${z2(ra.weg)})`);
{
  // Kontrolle: dieselbe gespiegelte Form noch einmal 60 Runden
  const vor = Float64Array.from(d.h.pos);
  const rk = rechnen(d.h, d.loops, pfade(d.loops), 1, 60);
  console.log(`     Kontrolle, gespiegelt noch einmal: größter Weg ${z2(groessterWeg(d.h.pos, vor))}, ${rk.runden} Runden`);
}

// ---------- Spiegel anwenden ----------
const DZ = Number(process.env.DZ ?? 0);
const f = spiegelAnwenden(d.h, d.loops, { naechsteId: 10, naechsteKreuzung: 100, dz: DZ });
if ('fehler' in f) throw new Error(f.fehler);
const h = f.haut;
const loops = f.loops;
ok('frei: kein Punkt hat ein Spiegelbild', h.spiegel.every((s) => s < 0), `${h.n} Punkte`);
ok('frei: jede Linie ist ein geschlossener Loop mit Pfad', loops.every((l) => l.art === 'paar' && hatPfad(l)), loops.map((l) => `${l.id} ${l.art} ${l.punkte.length}P ${l.proben.length} Proben`).join(', '));
{
  // die Pfade der freien Loops liegen, wo die gespiegelten lagen (samt Spiegelbild)
  let neben = 0;
  for (const l of loops) {
    const P = pfadLagen(l);
    if (!P) continue;
    for (let j = 0; j < l.proben.length; j++) neben = Math.max(neben, Math.hypot(P[3 * j]! - l.ruhe[3 * j]!, P[3 * j + 1]! - l.ruhe[3 * j + 1]!, P[3 * j + 2]! - l.ruhe[3 * j + 2]!));
  }
  ok('frei: jeder Pfad liegt auf seiner Linie', neben < 0.5, `höchstens ${z2(neben)} daneben`);
}

// ---------- Ruhe: dieselbe Form, frei gerechnet ----------
const vorher = Float64Array.from(h.pos);
const r0 = rechnen(h, loops, pfade(loops), 1, 400);
ok('ruhe: die Form bleibt, wie sie gespiegelt war', groessterWeg(h.pos, vorher) < 1.5, `größter Weg ${z2(groessterWeg(h.pos, vorher))} (Kugel 150), ${r0.runden} Runden, ${z1(r0.ms)} ms; ${JSON.stringify(falten(h))}`);

// ---------- einseitig: ein Punkt eines früheren Rings nur auf der Seite z > 0 hinaus ----------
const mk = mittlereKante(h);
let wahl: { li: number; i: number; p: V3 } | null = null;
loops.forEach((l, li) =>
  l.punkte.forEach((p, i) => {
    if (p.ref.z - DZ > 40 && (!wahl || p.ref.z > wahl.p.z)) wahl = { li, i, p: p.ref };
  }),
);
if (!wahl) throw new Error('kein Punkt an der Seite');
const w = wahl as { li: number; i: number; p: V3 };
const gezogen = loops.map((l) => l.punkte.map((p): V3 => (Math.hypot(p.ref.x - w.p.x, p.ref.y - w.p.y, p.ref.z - w.p.z) < 1e-6 ? { ...p.ref, z: p.ref.z + 40 } : p.ref)));
const lagen = loops.map((l, i) => pfadLagen(l, gezogen[i]) ?? Float64Array.from(l.ruhe));
loops.forEach((l, i) =>
  l.punkte.forEach((p, j) => {
    p.cur = { ...gezogen[i]![j]! };
  }),
);
const vorZug = Float64Array.from(h.pos);
const r1 = rechnen(h, loops, lagen, 20, 400);
const fa = falten(h);
const seiteDes = (v: number): number => vorZug[3 * v + 2]! - DZ;
const wegHier = groessterWeg(h.pos, vorZug, (v) => seiteDes(v) > 20);
const wegDort = groessterWeg(h.pos, vorZug, (v) => seiteDes(v) < -60);
ok('einseitig: der Punkt ist 40 hinaus, die Haut folgt', wegHier > 30 && wegHier < 60, `größter Weg auf der gezogenen Seite ${z1(wegHier)}`);
ok('einseitig: die andere Seite bleibt (die Form ist nicht mehr spiegelgleich)', wegDort < 0.25 * wegHier, `größter Weg weit auf der anderen Seite ${z2(wegDort)}`);
ok('einseitig: nichts umgeschlagen, kommt zur Ruhe', fa.umgeklappt === 0 && r1.weg < 0.05, `${JSON.stringify(fa)}, ${r1.runden} Runden am Ende, letzter Weg ${z2(r1.weg)}, ${z1(r1.ms)} ms`);

// ---------- verdichten: das Netz räumt auf, ohne Paare ----------
// (feiner als nötig bestellt, damit es etwas zu teilen gibt)
const v = verdichten(h, loops, 0.8 * mk, { kurz: 0.3 * mk, genau: mk / 40 });
if (!v) ok('verdichten: nichts zu tun', true);
else {
  ok('verdichten: kein Punkt hat danach ein Spiegelbild', v.haut.spiegel.every((s) => s < 0), `${h.n} → ${v.haut.n} Punkte, ${v.neu} neu, ${v.gelegt} gelegt`);
  ok('verdichten: die Loops bleiben geschlossene Ketten', v.loops.every((l, i) => l.art === 'paar' && l.punkte.length === loops[i]!.punkte.length), v.loops.map((l) => `${l.proben.length} Proben`).join(', '));
  const r2 = rechnen(v.haut, v.loops, pfade(v.loops), 1, 60);
  ok('verdichten: danach steht die Haut', r2.weg < 0.05 && falten(v.haut).umgeklappt === 0, `${r2.runden} Runden, ${JSON.stringify(falten(v.haut))}`);
}
console.log(schlecht ? `${schlecht} Punkte FEHLEN` : 'alles gut');
process.exit(schlecht ? 1 : 0);
