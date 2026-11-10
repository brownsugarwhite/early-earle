// Form zuerst (10.11.2026): Läuft die Haut einer gesicherten Form davon, wenn man an einem ihrer Punkte zieht? (Florian: „der Kopf
// bläst sich auf und explodiert“.) Im Kern, ohne Fenster und ohne Verdichten: je sichtbarer Punkt und je Richtung (in seiner Ebene
// hinauf, hinab, vor, zurück; bei Punkten neben der Mitte dazu nach außen und innen) der Zug in SCHRITTE Schritten mit je einer
// Runde, danach RUNDEN weitere Runden mit festem Ziel. Gemeldet wird je Fall: größter Weg je Runde am Ende, größte Koordinate, und
// ob die Haut zur Ruhe kommt (Weg unter 0,02), kriecht (wird langsamer, steht aber nicht), schwingt (bleibt gleich unruhig), wächst
// (am Ende unruhiger als zehn Runden davor, über eine halbe Einheit je Runde) oder davonläuft (die größte Koordinate über dem
// Dreifachen der Form, oder nicht endlich).
// Aufruf aus packages/shape: NAME="teat firefish" npx vite-node ../../apps/editor/scripts/pruefen/form-gesichert-stabil.ts
//   DATEI=<pfad>   WEIT="60,150,300" (Einheiten)   SCHRITTE=20   RUNDEN=80   PUNKTE=<höchstens so viele Punkte, die obersten zuerst>
//   NUR="<loop>:<i>,…" (nur diese Punkte)   ALLE=1 (jede Zeile zeigen, nicht nur die auffälligen)
//   VORSICHT=0: ohne die Vorsicht bei Unruhe im Löser (wie bis zum 10.11.)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, LoopZug, verschiebungLaengs } from '../../../../packages/shape/src/dicht/loops';
import { type WesenStand, entpacken } from '../../src/form/ablage';

const datei = process.env.DATEI ?? fileURLToPath(new URL(`../../../../wesen/${process.env.NAME ?? 'teat firefish'}.eewesen`, import.meta.url));
const WEIT = (process.env.WEIT ?? '60,150,300').split(',').map(Number);
const SCHRITTE = Number(process.env.SCHRITTE ?? 20);
const RUNDEN = Number(process.env.RUNDEN ?? 80);
const HOECHSTENS = Number(process.env.PUNKTE ?? 1e9);
const VORSICHT = process.env.VORSICHT !== '0';
const st: WesenStand = entpacken(new Uint8Array(fs.readFileSync(datei)));
const f = st.haut;
const nachbarn: number[][] = new Array<number[]>(f.n);
for (let v = 0; v < f.n; v++) nachbarn[v] = Array.from(f.nb.subarray(f.nbStart[v]!, f.nbStart[v + 1]!));
const pos0 = Float64Array.from(f.pos);
const loops: Loop[] = st.loops;
let ausdehnung = 0;
for (let i = 0; i < pos0.length; i++) ausdehnung = Math.max(ausdehnung, Math.abs(pos0[i]!));
console.log(`${datei.split('/').pop()}: ${f.n} Punkte, ${loops.length} Loops, größte Koordinate ${ausdehnung.toFixed(0)} · Züge ${WEIT.join('/')} in ${SCHRITTE} Schritten, dann ${RUNDEN} Runden`);

const haut = (): Haut => ({ pos: Float64Array.from(pos0), tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel });
// die Zerlegung einmal (alle Fälle haben dieselbe Struktur)
const t0 = performance.now();
const vorlage = new LoopZug(haut(), loops, null, true, 'kurven', 'geometrie').vorlage!;
console.log(`zerlegt in ${(performance.now() - t0).toFixed(0)} ms`);

type Fall = { l: Loop; i: number; D: V3; name: string };
const faelle: Fall[] = [];
const nur = process.env.NUR ? new Set(process.env.NUR.split(',')) : null;
const gesehen = new Set<number>();
const punkte: { l: Loop; i: number }[] = [];
for (const l of loops)
  l.punkte.forEach((p, i) => {
    if (p.vonSelbst) return;
    if (nur && !nur.has(`${l.id}:${i}`)) return;
    // eine Kreuzung nur einmal
    if (p.kreuzung !== undefined) {
      if (gesehen.has(p.kreuzung)) return;
      gesehen.add(p.kreuzung);
    }
    punkte.push({ l, i });
  });
punkte.sort((a, b) => b.l.punkte[b.i]!.ref.y - a.l.punkte[a.i]!.ref.y);
for (const { l, i } of punkte.slice(0, HOECHSTENS)) {
  const p = l.punkte[i]!;
  const aufMitte = Math.abs(p.ref.z) < 1e-6;
  for (const w of WEIT) {
    const richtungen: [string, V3][] = [
      ['hinauf', { x: 0, y: w, z: 0 }],
      ['hinab', { x: 0, y: -w, z: 0 }],
      ['vor', { x: -w, y: 0, z: 0 }],
      ['zurück', { x: w, y: 0, z: 0 }],
    ];
    if (!aufMitte) richtungen.push(['außen', { x: 0, y: 0, z: w }], ['innen', { x: 0, y: 0, z: -Math.min(w, 0.8 * Math.abs(p.ref.z)) }]);
    for (const [n, D] of richtungen) faelle.push({ l, i, D, name: `${l.id}:${i} (${p.ref.x.toFixed(0)}, ${p.ref.y.toFixed(0)}, ${p.ref.z.toFixed(0)})${p.kreuzung !== undefined ? ' Kreuzung' : ''}${p.ecke ? ' Ecke' : ''} ${n} ${w}` });
  }
}
console.log(`${faelle.length} Fälle an ${Math.min(punkte.length, HOECHSTENS)} Punkten`);

const zaehler = { ruhe: 0, kriecht: 0, schwingt: 0, waechst: 0, davon: 0 };
/** in so vielen Fällen hat der Löser seinen Schritt verkleinert (Vorsicht bei Unruhe) */
let vorsichtig = 0;
for (const fall of faelle) {
  const h = haut();
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorlage, vorsicht: VORSICHT });
  const k = fall.l.punkte[fall.i]!.kreuzung;
  const ziel = (anteil: number) =>
    loops.map((l) => {
      const i = k === undefined ? (l === fall.l ? fall.i : -1) : l.punkte.findIndex((p) => p.kreuzung === k);
      if (i < 0) return null;
      const d = verschiebungLaengs(
        l,
        l.punkte.map((_, q) => (q === i ? { x: fall.D.x * anteil, y: fall.D.y * anteil, z: fall.D.z * anteil } : { x: 0, y: 0, z: 0 })),
      );
      if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
      return d;
    });
  const vor = new Float64Array(h.pos.length);
  const wege: number[] = [];
  let max = 0;
  let kaputt = false;
  const runde = (d: (Float64Array | null)[]): void => {
    vor.set(h.pos);
    z.schritt(d, 1);
    let w = 0;
    max = 0;
    for (let i = 0; i < vor.length; i += 3) {
      const a = Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!);
      if (a !== a) kaputt = true;
      if (a > w) w = a;
      const m = Math.max(Math.abs(h.pos[i]!), Math.abs(h.pos[i + 1]!), Math.abs(h.pos[i + 2]!));
      if (m > max) max = m;
    }
    wege.push(w);
  };
  let d = ziel(0);
  for (let s = 1; s <= SCHRITTE && !kaputt; s++) {
    d = ziel(s / SCHRITTE);
    runde(d);
  }
  const nachZug = wege.length;
  let groesste = max;
  for (let r = 0; r < RUNDEN && !kaputt && max < 50 * ausdehnung; r++) {
    groesste = Math.max(groesste, max);
    runde(d);
    if (wege[wege.length - 1]! < 0.02) break;
  }
  const ende = wege[wege.length - 1]!;
  const nach = wege.slice(nachZug);
  const spaet = nach.slice(-10);
  const frueh = nach.slice(-20, -10);
  const mittel = (a: number[]): number => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
  let urteil: keyof typeof zaehler;
  groesste = Math.max(groesste, max);
  if (kaputt || groesste > 3 * ausdehnung + 300) urteil = 'davon';
  else if (ende < 0.02) urteil = 'ruhe';
  else if (frueh.length && mittel(spaet) > 1.2 * mittel(frueh) && mittel(spaet) > 0.5) urteil = 'waechst';
  else if (frueh.length && mittel(spaet) > 0.8 * mittel(frueh)) urteil = 'schwingt';
  else urteil = 'kriecht';
  zaehler[urteil]++;
  const { stufen, fest } = z.unruhe;
  if (stufen > 0 || fest) vorsichtig++;
  if (urteil === 'davon' || urteil === 'waechst' || process.env.ALLE)
    console.log(`${urteil.toUpperCase().padEnd(8)} ${fall.name}: Runden nach dem Zug ${nach.length}, Weg zuletzt ${ende.toFixed(3)}, größte Koordinate im Verlauf ${groesste.toFixed(0)}${kaputt ? ', NICHT ENDLICH' : ''}${stufen ? `, Schritt ${stufen}-mal halbiert` : ''}${fest ? ', stehen geblieben' : ''} · Wege ${nach.slice(0, 6).map((w) => w.toFixed(2)).join(' ')} … ${spaet.map((w) => w.toFixed(2)).join(' ')}`);
}
console.log(`Ergebnis${VORSICHT ? '' : ' (ohne Vorsicht)'}: zur Ruhe ${zaehler.ruhe}, kriecht ${zaehler.kriecht}, schwingt ${zaehler.schwingt}, wächst ${zaehler.waechst}, davongelaufen ${zaehler.davon} (von ${faelle.length}) · Schritt verkleinert oder stehen geblieben in ${vorsichtig} Fällen`);
