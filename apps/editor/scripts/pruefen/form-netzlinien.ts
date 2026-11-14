// Form zuerst (04.11.2026), Probe „Linien aus dem Netz“: Florians Vierbeiner aus dem Screenshot nachgestellt (Kopf in der
// Seite höher als die gezeichnete Front). Gemessen wird je Ansicht der größte Abstand zwischen gezeichneter Linie und Umriss
// des Körpers, heute (alle Ansichten begrenzen) und mit „die bearbeitete Ansicht führt, die anderen zeigen das Mesh“.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-netzlinien.ts
import { formAusAnsichten } from '../../../../packages/shape/src/dicht/gleich';
import { type LinienArt, halbeLinie, linieNachfuehren, linienAbstand } from '../../../../packages/shape/src/dicht/folgen';
import { profilAusBreite } from '../../../../packages/shape/src/dicht/ansichten';
import { ganzerUmriss } from '../../../../packages/shape/src/dicht/prueffaelle';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import { umrisseDesKoerpers } from '../../../../packages/shape/src/dicht/silhouette';
import { type UmrissPunkt, umrissAbtasten } from '../../../../packages/shape/src/dicht/umriss';

const p = (x: number, y: number, ecke = false): UmrissPunkt => (ecke ? { x, y, ecke } : { x, y });
// aus dem Screenshot abgelesen (Welt-Einheiten, Schnauze links)
const SEITE: UmrissPunkt[] = [
  p(-380.6, 188.3),
  p(-84.5, 195.1),
  p(150.5, 142.7),
  p(362.1, 148.5),
  p(432.0, 83.5),
  p(182.5, 81.6),
  p(141.7, 31.1),
  p(111.7, 20.4, true),
  p(111.7, -98.1, true),
  p(59.2, -98.1, true),
  p(59.2, 8.7, true),
  p(-62.1, 8.7, true),
  p(-62.1, -98.1, true),
  p(-113.6, -98.1, true),
  p(-113.6, 20.4, true),
  p(-144.7, 31.1),
  p(-185.4, 81.6),
];
const FRONT: UmrissPunkt[] = [
  p(0, 196.1),
  p(78.6, 135),
  p(112.6, 81.6),
  p(102.9, 44.7),
  p(86.4, 33.0, true),
  p(86.4, -98.1, true),
  p(35.0, -98.1, true),
  p(35.0, 8.7, true),
  p(0, 8.7),
];

const ganz = (art: 'front' | 'top', h: readonly UmrissPunkt[]) => ganzerUmriss(h, art === 'front' ? 'x' : 'y');
function ausdehnung(u: readonly UmrissPunkt[], k: 'x' | 'y') {
  let lo = Infinity;
  let hi = -Infinity;
  for (const q of umrissAbtasten(u, 1).punkte) {
    lo = Math.min(lo, q[k]);
    hi = Math.max(hi, q[k]);
  }
  return { lo, hi };
}
/** wie das Fenster: das Top folgt dem runden Körper aus Seite und gezeichneter Front */
function topWieFenster(seite: UmrissPunkt[], front: UmrissPunkt[]): UmrissPunkt[] {
  const sy = ausdehnung(seite, 'y');
  const n = 64;
  const dr = (sy.hi - sy.lo) / n;
  const breite = new Float64Array(n + 1);
  for (const q of umrissAbtasten(ganz('front', front), Math.max(0.5, dr / 2)).punkte) {
    const k = Math.round((q.y - sy.lo) / dr);
    if (k >= 0 && k <= n) breite[k] = Math.max(breite[k]!, Math.abs(q.x));
  }
  const fb = profilAusBreite({ r0: sy.lo, dr, breite }, sy.lo, sy.hi, 2, 8);
  const r = rundAusSeite(seite, { dreiecke: 6000, front: fb, top: null });
  const s = r.ansichten.seite;
  return profilAusBreite(r.ansichten.top, s.xMin, s.xMax, 3).map((q) => {
    const pt = { x: s.xMin + q.laengs * (s.xMax - s.xMin), y: q.quer };
    return q.ecke ? { ...pt, ecke: true } : pt;
  });
}

type Stand = { seite: UmrissPunkt[]; front: UmrissPunkt[]; top: UmrissPunkt[] };
type Ansicht = 'seite' | 'front' | 'top';
const ANSICHTEN: Ansicht[] = ['seite', 'front', 'top'];

function bauen(st: Stand, fuehrend: Ansicht | null) {
  const t0 = performance.now();
  const g = formAusAnsichten(
    { seite: [st.seite], front: [ganz('front', st.front)], top: [ganz('top', st.top)] },
    { dreiecke: 40000, fuehrend },
  );
  const ms = performance.now() - t0;
  const t1 = performance.now();
  const umriss: Record<Ansicht, ReturnType<typeof halbeLinie>> = { seite: null, front: null, top: null };
  for (const a of ANSICHTEN) {
    const s = umrisseDesKoerpers(g.liste, a, g.zelle / 2)[0] ?? [];
    umriss[a] = a === 'seite' ? s : halbeLinie(s, a);
  }
  return { g, umriss, ms, msUmriss: performance.now() - t1 };
}

function abweichung(st: Stand, b: ReturnType<typeof bauen>): Record<Ansicht, number> {
  const r = { seite: NaN, front: NaN, top: NaN };
  for (const a of ANSICHTEN) {
    const u = b.umriss[a];
    if (u) r[a] = linienAbstand(st[a], a as LinienArt, u);
  }
  return r;
}
const rund = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v * 10) / 10]));

/** Die anderen Ansichten dem Körper nachführen (die führende bleibt, wie gezeichnet). */
function nachfuehren(st: Stand, b: ReturnType<typeof bauen>, fuehrend: Ansicht | null, tol: number) {
  const neu: Stand = { ...st };
  const info: Record<string, { neu: number; behalten: number; vorher: number; rest: number }> = {};
  for (const a of ANSICHTEN) {
    if (a === fuehrend || !b.umriss[a]) continue;
    const t0 = performance.now();
    const r = linieNachfuehren(st[a], b.umriss[a]!, a as LinienArt, tol);
    neu[a] = r.punkte;
    info[a] = { neu: r.neu, behalten: r.behalten, vorher: st[a].length, rest: Math.round(r.rest * 10) / 10 };
    (info[a] as Record<string, number>).ms = Math.round(performance.now() - t0);
  }
  return { neu, info };
}

const st0: Stand = { seite: SEITE, front: FRONT, top: topWieFenster(SEITE, FRONT) };
console.log('Top (folgt dem runden Körper):', st0.top.length, 'Punkte');

// 1. heute: alle Ansichten begrenzen (Schnittmenge)
const heute = bauen(st0, null);
console.log('heute     Abstand Linie ↔ Mesh', rund(abweichung(st0, heute)), 'zelle', heute.g.zelle.toFixed(2), 'ms', Math.round(heute.ms));

// 2. die Seite führt (Florian hat zuletzt den Kopf in der Seite gezogen), Front und Top zeigen das Mesh
const tol = Math.max(1, 0.5 * heute.g.zelle);
const fuehrt = bauen(st0, 'seite');
console.log('Seite führt Abstand vor dem Nachführen', rund(abweichung(st0, fuehrt)), 'ms', Math.round(fuehrt.ms), 'Umrisse ms', Math.round(fuehrt.msUmriss));
const n1 = nachfuehren(st0, fuehrt, 'seite', tol);
console.log('  nachgeführt', JSON.stringify(n1.info));
console.log('  Abstand danach (gleicher Körper)', rund(abweichung(n1.neu, fuehrt)));

// 3. derselbe Stand ohne führende Ansicht neu gebaut: zeigt er dasselbe? (Rückgängig/Neu laden bauen so)
const neutral = bauen(n1.neu, null);
console.log('neu gebaut ohne Führung, Abstand', rund(abweichung(n1.neu, neutral)));

// 4. Drift: fünfmal bauen und nachführen, ohne etwas zu ändern
let st = n1.neu;
for (let i = 0; i < 5; i++) {
  const b = bauen(st, null);
  const n = nachfuehren(st, b, null, tol);
  const geaendert = ANSICHTEN.filter((a) => n.neu[a] !== st[a]);
  console.log(`Drift Runde ${i + 1}: geänderte Ansichten`, geaendert.join(',') || '—', JSON.stringify(n.info));
  st = n.neu;
}

// 5. Florian zieht danach im Top eine Flosse nach außen (Top führt): Punkt in der Mitte der Hälfte weit hinaus
{
  const top = st.top.map((q) => ({ ...q }));
  const mitte = Math.floor(top.length / 2);
  const q = top[mitte]!;
  top[mitte] = { ...q, y: q.y + 70 };
  const s2: Stand = { ...st, top };
  const b = bauen(s2, 'top');
  console.log('Top führt (Flosse +70): Abstand vor dem Nachführen', rund(abweichung(s2, b)));
  const n = nachfuehren(s2, b, 'top', tol);
  console.log('  nachgeführt', JSON.stringify(n.info));
  const nb = bauen(n.neu, null);
  console.log('  neu gebaut ohne Führung', rund(abweichung(n.neu, nb)));
  st = n.neu;
}

// 6. Kopf in der Seite wieder tiefer (Seite führt): die Front muss den Kopf wieder hergeben
{
  const seite = st.seite.map((q) => ({ ...q }));
  seite[0] = { ...seite[0]!, y: seite[0]!.y - 60 };
  seite[1] = { ...seite[1]!, y: seite[1]!.y - 20 };
  const s2: Stand = { ...st, seite };
  const b = bauen(s2, 'seite');
  console.log('Kopf tiefer (Seite führt): Abstand vor dem Nachführen', rund(abweichung(s2, b)));
  const n = nachfuehren(s2, b, 'seite', tol);
  console.log('  nachgeführt', JSON.stringify(n.info));
  const nb = bauen(n.neu, null);
  console.log('  neu gebaut ohne Führung', rund(abweichung(n.neu, nb)));
}
