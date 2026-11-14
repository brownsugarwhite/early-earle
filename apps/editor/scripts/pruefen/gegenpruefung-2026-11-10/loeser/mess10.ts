// Gegenprüfung, Schritt G4.4 (10.11.2026): Hält die Haut, wenn man sie nach einem neuen Loop über die ganze Haut setzt?
// Im Fenster lief das Setzen nach dem ersten Loop bei 11 000 Punkten davon (die Punkte glitten 59 Einheiten, die Form ging 11 auf,
// nach dem dritten Loop lief die Haut auseinander); bei 5 200 Punkten blieb es bei 2 Einheiten.
// Kugel, Loops nacheinander wie im Fenster (Ring waagerecht, Mitte, Ring senkrecht; LOOPS wählt die Reihenfolge, z. B. "ring,mitte").
// Nach jedem Loop (SETZEN=jeder) oder nur nach dem letzten (SETZEN=ende) bis RUNDEN Runden zu den Pfaden. Je Runde: Bewegung der
// Form (längs der Normalen), Gleiten (ganze Bewegung der Punkte), dazu am Ende der Halbmesser (kleinster, mittlerer, größter).
// DREIECKE=6000|14000|30000  LOOPS=ring,mitte,ring2  SETZEN=jeder|ende  RUNDEN=60  GENAU=1 (Griffe genau wie im Fenster)
// NADELN=1 (seit G5): gleich nach dem Einsetzen fallen Punkte der Linie, die fast aufeinander liegen, zusammen (wie im Fenster seit G5)
import { loopEinsetzen } from '../../../../../../packages/shape/src/dicht/einsetzen';
import { hautNormalen } from '../../../../../../packages/shape/src/dicht/kurven';
import { type Loop, LoopZug, festlegen, griffeAnlegen, hatPfad, kreuzungenZwischen, loopAusSchnitt, mittlereKante, pfadParameter, pfadVersatz, punktEinfuegen } from '../../../../../../packages/shape/src/dicht/loops';
import { nadelnZusammenlegen } from '../../../../../../packages/shape/src/dicht/verdichten';
import { kugel } from './gemeinsam';

const dreiecke = Number(process.env.DREIECKE ?? 14000);
const folge = (process.env.LOOPS ?? 'ring,mitte,ring2').split(',');
const setzenArt = process.env.SETZEN ?? 'jeder';
const RUNDEN = Number(process.env.RUNDEN ?? 60);
const RUHE = 0.05;
const schnitt: Record<string, ['seite' | 'top', [number, number], [number, number]]> = {
  ring: ['seite', [-200, 0], [200, 0]],
  mitte: ['top', [-200, 0], [200, 0]],
  ring2: ['seite', [10, 200], [10, -200]],
  ring3: ['seite', [-200, 60], [200, 60]],
};

let h = kugel(dreiecke);
let loops: Loop[] = [];
const halbmesser = (): string => {
  let lo = Infinity;
  let hi = 0;
  let s = 0;
  for (let v = 0; v < h.n; v++) {
    const r = Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!);
    lo = Math.min(lo, r);
    hi = Math.max(hi, r);
    s += r;
  }
  return `${lo.toFixed(1)} / ${(s / h.n).toFixed(1)} / ${hi.toFixed(1)}`;
};
const setzen = (name: string): void => {
  const t0 = performance.now();
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
  const tz = performance.now() - t0;
  const ziele = loops.map((l, li) => (hatPfad(l) ? pfadVersatz(l, z.start[li]!) : null));
  const anfang = Float64Array.from(h.pos);
  const form: number[] = [];
  const gleit: number[] = [];
  let runden = 0;
  for (let k = 0; k < RUNDEN; k++) {
    const vor = Float64Array.from(h.pos);
    const N = hautNormalen(h);
    z.schritt(ziele, 1);
    runden++;
    let wn = 0;
    let wg = 0;
    for (let i = 0; i < vor.length; i += 3) {
      const dx = h.pos[i]! - vor[i]!;
      const dy = h.pos[i + 1]! - vor[i + 1]!;
      const dz = h.pos[i + 2]! - vor[i + 2]!;
      wn = Math.max(wn, Math.abs(dx * N[i]! + dy * N[i + 1]! + dz * N[i + 2]!));
      wg = Math.max(wg, Math.hypot(dx, dy, dz));
    }
    form.push(wn);
    gleit.push(wg);
    if (!Number.isFinite(wn) || wn > 1e4) break;
    if (wn < RUHE) break;
  }
  let weit = 0;
  for (let i = 0; i < anfang.length; i += 3) weit = Math.max(weit, Math.hypot(h.pos[i]! - anfang[i]!, h.pos[i + 1]! - anfang[i + 1]!, h.pos[i + 2]! - anfang[i + 2]!));
  loops.forEach((l) => festlegen(h, l, !hatPfad(l)));
  const f = (L: number[]) => L.map((x) => (x >= 10 ? x.toFixed(0) : x.toFixed(2))).join(' ');
  console.log(`  setzen ${name}: ${runden} Runden${form[form.length - 1]! < RUHE ? ' (steht)' : ' (steht NICHT)'}, zerlegt ${tz.toFixed(0)} ms · Punkte wandern insgesamt bis ${weit.toFixed(1)} · Halbmesser ${halbmesser()}`);
  console.log(`    Form je Runde:    ${f(form.slice(0, 24))}${form.length > 24 ? ` … ${f(form.slice(-4))}` : ''}`);
  console.log(`    Gleiten je Runde: ${f(gleit.slice(0, 24))}${gleit.length > 24 ? ` … ${f(gleit.slice(-4))}` : ''}`);
};

console.log(`\n=== ${dreiecke} Dreiecke, Loops ${folge.join(' → ')}, setzen: ${setzenArt}, höchstens ${RUNDEN} Runden ===`);
console.log(`  Kugel: ${h.n} Punkte, Halbmesser (kleinster / Mittel / größter) ${halbmesser()}`);
let kreuz = 1;
folge.forEach((name, nr) => {
  const [a, A, B] = schnitt[name]!;
  const neu = loopAusSchnitt(h, a, A, B, nr + 1, 8);
  if (!neu) throw new Error(`kein Loop ${name}`);
  loops.push(neu);
  const r = loopEinsetzen(h, loops, loops.length - 1)!;
  h = r.haut;
  loops = r.loops;
  const tol = 0.25 * mittlereKante(h);
  const l = loops[loops.length - 1]!;
  for (let i = 0; i < loops.length - 1; i++)
    for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, l, l.ruhe, tol)) {
      punktEinfuegen(loops[i]!, f.sa, kreuz, hatPfad(loops[i]!));
      punktEinfuegen(l, f.sb, kreuz);
      kreuz++;
    }
  griffeAnlegen(l, l.ruhe, true, 0);
  if (process.env.NADELN === '1') {
    const v = nadelnZusammenlegen(h, loops, mittlereKante(kugel(dreiecke)));
    if (v) {
      console.log(`  (Nadeln: ${v.gelegt} Punkte zusammengelegt, ${h.n} → ${v.haut.n})`);
      h = v.haut;
      loops = v.loops;
    }
  }
  if (hatPfad(l)) pfadParameter(l);
  console.log(`  Loop ${nr + 1} (${name}): ${h.n} Punkte, ${l.punkte.length} Punkte am Loop, Pfad ${hatPfad(l) ? 'ja' : 'nein'}`);
  if (setzenArt === 'jeder' || nr === folge.length - 1) setzen(`nach Loop ${nr + 1}`);
});
