// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V1: Zufallsreihe mit 200 Zügen auf der Extremreihe. Je Zug ein
// Körper (Florians Ablauf, Röhre oder Teile), ein Umrissknoten, ein Versatz von 10–40 px; gekoppelt wie im Editor
// (`gekoppeltMit`, höchstens zwei eingefügte Punkte je Ansicht), dann der schnelle Bau wie während des Zugs und der genaue
// wie beim Loslassen. Gemessen: Selbstschnitte der gekoppelten Umrisse, eingefügte Punkte, Bau scheitert, Δ je Blatt,
// Falten frei (umgeklappt = über 60°), Sprung am Gestenende (größter Abstand der Hautpunkte, schnell gegen genau, px).
// Umgebung: START, ANZAHL. Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/v1-zufallszuege.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { gekoppeltMit } from '../../../../packages/shape/src/kopplungPunkte';
import { selbstschnitte } from '../../../../packages/shape/src/profil';
import { wesenBauen } from '../../../../packages/shape/src/kern/wesen';
import { baumAbleiten, baumFalten } from '../../../../packages/shape/src/kern/grundkoerper/baumBau';
import { teilbaum } from '../../../../packages/shape/src/kern/grundkoerper/teilbaum';
import { EXTREMREIHE } from '../../../../packages/shape/src/kern/pruefen/extremreihe';
import { type Bauart, type EditorBau, editorBauen, editorPlan, imAblauf } from '../../../../packages/shape/src/kern/pruefen/extremMessung';
import { faltenNachZonen, faltenNachZonenRoehre } from '../../../../packages/shape/src/kern/pruefen/zonen';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v1');
mkdirSync(AUSGABE, { recursive: true });
const START = Number(process.env.START ?? 20261020);
const ANZAHL = Number(process.env.ANZAHL ?? 200);
const PX = 461;

/** Größter Abstand eines Punkts der einen Wolke zur anderen (beide Richtungen), px — über ein Raster. */
function sprung(a: Float32Array, b: Float32Array): number {
  const h = 0.02;
  const raster = (p: Float32Array) => {
    const m = new Map<string, number[]>();
    for (let i = 0; i < p.length; i += 3) {
      const k = `${Math.floor(p[i]! / h)},${Math.floor(p[i + 1]! / h)},${Math.floor(p[i + 2]! / h)}`;
      const l = m.get(k);
      if (l) l.push(i);
      else m.set(k, [i]);
    }
    return m;
  };
  const einseitig = (p: Float32Array, q: Float32Array, rq: Map<string, number[]>) => {
    let max = 0;
    for (let i = 0; i < p.length; i += 9) {
      const x = p[i]!;
      const y = p[i + 1]!;
      const z = p[i + 2]!;
      let best = Infinity;
      for (let r = 1; r <= 4 && best === Infinity; r++) {
        const cx = Math.floor(x / h);
        const cy = Math.floor(y / h);
        const cz = Math.floor(z / h);
        for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (const j of rq.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) best = Math.min(best, Math.hypot(q[j]! - x, q[j + 1]! - y, q[j + 2]! - z));
      }
      max = Math.max(max, best === Infinity ? 4 * h : best);
    }
    return max;
  };
  return Math.max(einseitig(a, b, raster(b)), einseitig(b, a, raster(a))) * PX;
}

function freiMax(bau: EditorBau, art: Bauart): number {
  if (art === 'teile' && bau.netz.koerperBaum && !bau.netz.koerperBaum.fehler) {
    const d = bau.dok;
    const b = baumAbleiten(d, { paare: true }, teilbaum(d, d.kaefig?.stationen?.teile ?? null));
    return faltenNachZonen(b.kaefig, b.unterteilung, b.fein, baumFalten(b)).zonen.frei.max;
  }
  return faltenNachZonenRoehre(bau.stand.linien?.abl ?? bau.stand.abl).zonen.frei.max;
}

type Zeile = { i: number; koerper: string; art: Bauart; ansicht: string; knoten: number; px: number; eingefuegt: number; schnitte: number; fehler?: string; delta?: [number, number, number]; frei?: number; sprung?: number; ms?: number };
const zeilen: Zeile[] = [];
const basis = new Map<string, EditorBau>();
const ANSICHTEN = ['seite', 'front', 'top'] as const;
const t0 = Date.now();
for (let i = 0; i < ANZAHL; i++) {
  const r = zufall(START).ableger(`zug ${i}`);
  const k = r.wahl(EXTREMREIHE);
  const art = r.wahl(['roehre', 'teile'] as const);
  const plan = editorPlan(art);
  const schluessel = `${k.name}|${art}`;
  let b0 = basis.get(schluessel);
  if (!b0) {
    b0 = editorBauen(imAblauf(k.dok(), art, 'kugel'), plan);
    basis.set(schluessel, b0);
  }
  const ansicht = r.wahl(ANSICHTEN);
  const pr = b0.dok.profile[ansicht];
  // Halbprofile: Anfang und Ende liegen auf der Achse (die zieht der Editor nur längs der Achse) — hier nicht
  const kandidaten = pr.knoten.map((_, j) => j).filter((j) => pr.art === 'geschlossen' || (j > 0 && j < pr.knoten.length - 1));
  const j = r.wahl(kandidaten);
  const laenge = r.zwischen(10, 40);
  const w = r.zwischen(0, 2 * Math.PI);
  const d = { x: (laenge * Math.cos(w)) / PX, y: (laenge * Math.sin(w)) / PX };
  const neu = { ...pr, knoten: pr.knoten.map((kn, q) => (q === j ? { ...kn, p: { x: kn.p.x + d.x, y: kn.p.y + d.y } } : kn)) };
  const z: Zeile = { i, koerper: k.name, art, ansicht, knoten: j, px: laenge, eingefuegt: 0, schnitte: 0 };
  try {
    const g = gekoppeltMit({ ...b0.dok.profile, [ansicht]: neu }, ansicht, b0.dok.profile, { einfuegen: true, einfuegenMax: { front: 2, top: 2 } });
    z.eingefuegt = g.teilungen.front.length + g.teilungen.top.length;
    z.schnitte = selbstschnitte(g.profile.seite) + selbstschnitte(g.profile.front) + selbstschnitte(g.profile.top);
    const dok: Dokument = { ...b0.dok, profile: g.profile };
    const schnell = wesenBauen(dok, plan, b0.stand, true);
    const t1 = Date.now();
    const genau = editorBauen(dok, plan, b0.stand);
    z.ms = Date.now() - t1;
    const bl = genau.netz.info.blatt;
    if (bl) z.delta = [bl.seite.max, bl.front.max, bl.top.max];
    if (genau.netz.koerperBaum?.fehler) z.fehler = genau.netz.koerperBaum.fehler;
    z.frei = freiMax(genau, art);
    z.sprung = sprung(schnell.netz.positionen, genau.netz.positionen);
  } catch (err) {
    z.fehler = (err as Error).message;
  }
  zeilen.push(z);
  if (i % 20 === 19) console.log(`${i + 1}/${ANZAHL} Züge, ${Math.round((Date.now() - t0) / 1000)} s`);
}

const fehler = zeilen.filter((z) => z.fehler);
const schnitte = zeilen.filter((z) => z.schnitte > 0);
const nach = (a: Bauart) => zeilen.filter((z) => z.art === a);
const p = (xs: number[], q: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))]! : NaN);
const text: string[] = [`V1 Zufallsreihe: ${ANZAHL} Züge (Start ${START}), Florians Ablauf, ${Math.round((Date.now() - t0) / 1000)} s`];
for (const a of ['roehre', 'teile'] as const) {
  const zs = nach(a);
  const s = zs.map((z) => z.sprung ?? NaN).filter(Number.isFinite);
  const dm = zs.map((z) => (z.delta ? Math.max(...z.delta) : NaN)).filter(Number.isFinite);
  text.push(
    `${a === 'roehre' ? 'Röhre' : 'Teile'}: ${zs.length} Züge · Bau scheitert ${zs.filter((z) => z.fehler).length} · umgeklappt (frei > 60°) ${zs.filter((z) => (z.frei ?? 0) > 60).length} · Selbstschnitte nach der Kopplung ${zs.filter((z) => z.schnitte > 0).length} · eingefügte Punkte ${zs.reduce((s2, z) => s2 + z.eingefuegt, 0)} · Sprung am Gestenende Median ${p(s, 0.5).toFixed(1)} px, 90 % ${p(s, 0.9).toFixed(1)} px, max ${Math.max(...s).toFixed(1)} px, > 0,5 px: ${s.filter((x) => x > 0.5).length} · Δ max Median ${p(dm, 0.5).toFixed(1)} px, 90 % ${p(dm, 0.9).toFixed(1)} px · genauer Bau Median ${p(zs.map((z) => z.ms ?? NaN).filter(Number.isFinite), 0.5).toFixed(0)} ms`,
  );
}
const schlimm = [...zeilen].sort((a, b) => (b.frei ?? 0) - (a.frei ?? 0)).slice(0, 8);
text.push('stärkste Falten:', ...schlimm.map((z) => `  #${z.i} ${z.koerper} ${z.art} ${z.ansicht} Knoten ${z.knoten} ${z.px.toFixed(0)} px → frei ${z.frei?.toFixed(0)}°, Δ ${z.delta?.map((x) => x.toFixed(1)).join('/')}, Sprung ${z.sprung?.toFixed(1)} px${z.fehler ? `, FEHLER ${z.fehler}` : ''}`));
const groesste = [...zeilen].sort((a, b) => (b.sprung ?? 0) - (a.sprung ?? 0)).slice(0, 8);
text.push('größte Sprünge:', ...groesste.map((z) => `  #${z.i} ${z.koerper} ${z.art} ${z.ansicht} Knoten ${z.knoten} ${z.px.toFixed(0)} px → Sprung ${z.sprung?.toFixed(1)} px, frei ${z.frei?.toFixed(0)}°`));
if (schnitte.length) text.push('Selbstschnitte nach der Kopplung:', ...schnitte.slice(0, 8).map((z) => `  #${z.i} ${z.koerper} ${z.ansicht} Knoten ${z.knoten} ${z.px.toFixed(0)} px: ${z.schnitte}`));
if (fehler.length) text.push('Bau scheitert:', ...fehler.slice(0, 8).map((z) => `  #${z.i} ${z.koerper} ${z.art}: ${z.fehler}`));
console.log(text.join('\n'));
writeFileSync(resolve(AUSGABE, 'v1-zufallszuege.txt'), text.join('\n') + '\n');
writeFileSync(resolve(AUSGABE, 'v1-zufallszuege.json'), JSON.stringify(zeilen, null, 1));
