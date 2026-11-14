// Plan vom 12.11.2026, Schritt 3: Beweis „Haut direkt aus den Linien“ (`packages/shape/src/dicht/direkt.ts`), im Kern ohne Fenster.
// Die Fälle und Kriterien stehen im Plan, Anhang A.3. Je Fall drei Rechnungen:
//   heute  der Löser des Fensters (`HautAusKurven`, nach der Geometrie): Zug in Schritten, dann Runden bis zur Ruhe
//   A      wie geplant: Richtung aus dem Liniennetz (`linienRichtung`), über die Haut verteilt, daraus die Lagen. Nichts von der Haut.
//   B      nur die zweite Hälfte: die Normalen der Haut beim Anfassen bleiben, daraus und aus den Linien die Lagen
// Ausgabe: je Fall wenige Zeilen; mit BLATT=<pfad ohne Endung> dazu die Bilder als HTML (ein Blatt mit allem und je Fall ein
// eigenes; dann aus apps/editor `HOEHE=100 node scripts/pruefen/html-shot.mjs --jpg <pfad>-*.html`).
// Ergebnis vom 13.11.: `docs/research/2026-11-13-beweis-haut-direkt.md`.
//   FALL=kugel,schlauch,ruessel,horn,formen,viertel (Komma-Liste, Standard alle)     DREIECKE=2000 (Startnetz der Körper)
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-direkt.ts
import { HautDirekt } from '../../../../packages/shape/src/dicht/direkt';
import { type Haut, type V3, hautNormalenMax } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, bindungenAus, festlegen, mittlereKante, verschiebungLaengs, zieleAus } from '../../../../packages/shape/src/dicht/loops';
import { linienRichtung } from '../../../../packages/shape/src/dicht/richtung';
import { flaechenAbstand } from './flaechenabstand';
import { type BlattBild, type BlattZeile, blattSchreiben } from './form-direkt-blatt';
import { type Abbildung, R, SCHLAUCH, abbilden, formLaden, hartePunkte, kugelMit, mitSchnitten, nachVerdichten, schlauchMit } from './form-direkt-faelle';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import { hautAus } from '../../../../packages/shape/src/dicht/kurven';

const FAELLE = (process.env.FALL ?? 'kugel,schlauch,ruessel,horn,formen,viertel').split(',');
const DREIECKE = Number(process.env.DREIECKE ?? 2000);
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const blatt: (BlattZeile & { kurz: string })[] = [];
const NAME_A = 'A · wie geplant: Haut nur aus den Linien';
const NAME_B = 'B · Linien bewegen die Haut direkt, ihre Wölbung bleibt';
const kopie = (h: Haut): Haut => ({ ...h, pos: Float64Array.from(h.pos) });
const loopsKopie = (loops: readonly Loop[]): Loop[] => loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) }));

/** heute: Zug in Schritten zu den neuen Lagen der Linien, dann Runden, bis die Haut steht (höchstens `ende`) */
function heute(h: Haut, loops: readonly Loop[], lagen: readonly Float64Array[], schritte = 16, ende = 150): number {
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
  const versch = loops.map((l, i) => Float64Array.from(lagen[i]!, (x, k) => x - l.ruhe[k]!));
  let bewegt = false;
  for (const d of versch) for (let k = 0; k < d.length; k++) if (d[k] !== 0) bewegt = true;
  if (bewegt) for (let s = 1; s <= schritte; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / schritte)), 2);
  let r = 0;
  for (; r < ende; r++) {
    const vor = Float64Array.from(h.pos);
    z.schritt(versch, 1);
    let w = 0;
    for (let i = 0; i < vor.length; i += 3) w = Math.max(w, Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!));
    if (!(w >= 0.02)) break;
  }
  return r + 1;
}

/** A: Haut nur aus den Linien (Richtung aus dem Liniennetz, verteilt, Lagen) */
function wegA(h: Haut, loops: readonly Loop[], lagen: readonly Float64Array[]): HautDirekt {
  const plan = bindungenAus(h, loops);
  const nor = hautNormalenMax(h);
  const d = new HautDirekt(h, plan.bind, { hart: hartePunkte(h, loops) });
  d.rechnen(zieleAus(plan, lagen), linienRichtung(h, loops, plan, lagen, nor), nor);
  return d;
}

/** B: Lagen aus den Linien und den Normalen der Haut, wie sie ist (`normalen`: von einem früheren Anfassen) */
function wegB(h: Haut, loops: readonly Loop[], lagen: readonly Float64Array[], normalen?: Float64Array): HautDirekt {
  const plan = bindungenAus(h, loops);
  const d = new HautDirekt(h, plan.bind, { hart: hartePunkte(h, loops) });
  d.lagenLoesen(zieleAus(plan, lagen), normalen ?? hautNormalenMax(h));
  return d;
}

const punkte = (h: Haut): [number, number, number][] => Array.from({ length: h.n }, (_, v) => [h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!]);
const dreiecke = (h: Haut): number[][] => Array.from({ length: h.tri.length / 3 }, (_, t) => [h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!]);
/** Abstand der Punkte von `a` zur Fläche von `b`: Mittel, 95 %, größter */
function abstand(a: Haut, b: Haut, zelle = 20): { mittel: number; p95: number; max: number } {
  const d = Array.from(flaechenAbstand(punkte(a), punkte(b), dreiecke(b), zelle)).sort((x, y) => x - y);
  return { mittel: d.reduce((s, x) => s + x, 0) / d.length, p95: d[Math.floor(0.95 * (d.length - 1))]!, max: d[d.length - 1]! };
}
const ab = (a: Haut, b: Haut, zelle?: number): string => {
  const m = abstand(a, b, zelle);
  return `Mittel ${z2(m.mittel)}, 95 % ${z2(m.p95)}, größter ${z2(m.max)}`;
};
const fz = (h: Haut): string => {
  const f = falten(h);
  return `Knicke über 60° ${f.ueber60}, umgestülpt ${f.umgeklappt}`;
};
const setzen = (loops: readonly Loop[], lagen: readonly Float64Array[]): void => loops.forEach((l, i) => (l.ruhe = lagen[i]!));

// ---- Kugel -------------------------------------------------------------------------------------------------------------------
function kugelFehler(h: Haut): number {
  let max = 0;
  for (let v = 0; v < h.n; v++) max = Math.max(max, Math.abs(Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!) - R));
  return max;
}
function kugel(): void {
  for (const was of ['mitte', 'drei'] as const) {
    const { h, loops } = kugelMit(was, DREIECKE);
    const lagen = loops.map((l) => l.ruhe);
    const hH = kopie(h);
    const hA = kopie(h);
    const hB = kopie(h);
    const runden = heute(hH, loops, lagen);
    wegA(hA, loops, lagen);
    wegB(hB, loops, lagen);
    console.log(`Kugel ${was === 'mitte' ? 'nur mit Mittellinie' : 'mit drei Loops'} (${h.n} Punkte, vorher bis ${z2(kugelFehler(h))} von der Kugel): heute ${z2(kugelFehler(hH))} (${runden} Runden) · A ${z2(kugelFehler(hA))} (${z2((100 * kugelFehler(hA)) / R)} % vom Radius) · B ${z2(kugelFehler(hB))}`);
    // A fünfmal neu angelegt: bleibt sie stehen?
    const wege: string[] = [];
    for (let k = 0; k < 5; k++) {
      const vor = kopie(hA);
      wegA(hA, loops, lagen);
      wege.push(z2(abstand(hA, vor).max));
    }
    console.log(`   A fünfmal neu angelegt und gerechnet: Weg der Fläche je Mal ${wege.join(' · ')}, danach ${z2(kugelFehler(hA))} von der Kugel`);
    if (was === 'mitte')
      blatt.push({
        kurz: 'kugel',
        titel: 'Kugel nur mit der Mittellinie, nichts gezogen',
        blicke: [
          ['Seite', 0, 0],
          ['schräg von vorn', -40, 20],
        ],
        bilder: [
          { name: 'heute', h: hH, loops, notiz: `bis ${z2(kugelFehler(hH))} von der Kugel` },
          { name: NAME_A, h: hA, loops, notiz: `bis ${z2(kugelFehler(hA))} von der Kugel` },
          { name: NAME_B, h: hB, loops, notiz: `bis ${z2(kugelFehler(hB))} von der Kugel` },
        ],
      });
  }
}

// ---- Schlauch ----------------------------------------------------------------------------------------------------------------
/** Radius um die x-Achse der Punkte mit von ≤ x ≤ bis: Mittel, kleinster, größter */
function dicke(h: Haut, von: number, bis: number): { mittel: number; min: number; max: number } {
  let s = 0;
  let n = 0;
  let min = Infinity;
  let max = 0;
  for (let v = 0; v < h.n; v++) {
    const x = h.pos[3 * v]!;
    if (x < von || x > bis) continue;
    const r = Math.hypot(h.pos[3 * v + 1]!, h.pos[3 * v + 2]!);
    s += r;
    n++;
    min = Math.min(min, r);
    max = Math.max(max, r);
  }
  return { mittel: s / Math.max(1, n), min, max };
}
/** größter Abstand von der Kapsel (Radius r, Mitten der Kappen bei ±c) */
function kapselFehler(h: Haut, c: number, r: number): number {
  let m = 0;
  for (let v = 0; v < h.n; v++) {
    const x = h.pos[3 * v]!;
    const cx = Math.max(-c, Math.min(c, x));
    m = Math.max(m, Math.abs(Math.hypot(x - cx, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!) - r));
  }
  return m;
}
const strecken: Abbildung = (x, y, z) => [x < -SCHLAUCH.a ? x - SCHLAUCH.a : x > SCHLAUCH.a ? x + SCHLAUCH.a : 2 * x, y, z];
function schlauchLauf(dreieckeZahl: number): { h: Haut; loops: Loop[]; hH: Haut; hA: Haut; hB: Haut; nor: Float64Array; text: string } {
  const { h, loops } = schlauchMit(dreieckeZahl);
  const { r, a, c } = SCHLAUCH;
  const lagen = loops.map((l) => abbilden(l.ruhe, strecken));
  const hH = kopie(h);
  const hA = kopie(h);
  const hB = kopie(h);
  const runden = heute(hH, loops, lagen);
  const dA = wegA(hA, loops, lagen);
  const nor = hautNormalenMax(h);
  const dB = wegB(hB, loops, lagen, nor);
  const d0 = dicke(h, -a, a).mittel;
  const pro = (hh: Haut): string => {
    const d = dicke(hh, -2 * a, 2 * a);
    return `Dicke ${z2(d.mittel)} (${z2(d.min)}–${z2(d.max)}; ${z2((100 * (d.mittel - d0)) / d0)} %, kleinster ${z1((100 * (d.min - d0)) / d0)} %, größter ${z1((100 * (d.max - d0)) / d0)} %), ganz bis ${z2(kapselFehler(hh, c + a, r))} von der Kapsel, ${fz(hh)}`;
  };
  const text =
    `Schlauch (${h.n} Punkte, Radius ${r}, Ringe bei 0 und ±${a}; Dicke zwischen den Ringen vorher ${z2(d0)}), das Stück zwischen den Ringen auf doppelte Länge:\n` +
    `   heute (${runden} Runden): ${pro(hH)}\n` +
    `   A (${dA.zeiten.durchgaenge} Durchgänge, ${(dA.zeiten.verteilen + dA.zeiten.zeilen + dA.zeiten.zerlegen + dA.zeiten.loesen).toFixed(0)} ms): ${pro(hA)}\n` +
    `   B (${(dB.zeiten.zeilen + dB.zeiten.zerlegen + dB.zeiten.loesen).toFixed(0)} ms): ${pro(hB)}`;
  setzen(loops, lagen);
  return { h, loops, hH, hA, hB, nor, text };
}
function schlauch(): void {
  const { loops, hA, hB, nor, text } = schlauchLauf(DREIECKE);
  console.log(text);
  // neu angelegt (Gewichte aus der gestreckten Haut) und noch einmal gerechnet: Was bewegt sich?
  const lagen = loops.map((l) => l.ruhe);
  for (const [name, hh, weg] of [
    ['A dreimal neu angelegt', kopie(hA), (x: Haut) => wegA(x, loops, lagen)],
    ['B dreimal neu angelegt, Normalen behalten', kopie(hB), (x: Haut) => wegB(x, loops, lagen, nor)],
    ['B dreimal neu angelegt, Normalen neu von der Haut gelesen', kopie(hB), (x: Haut) => wegB(x, loops, lagen)],
  ] as const) {
    const wege: string[] = [];
    for (let k = 0; k < 3; k++) {
      const vor = kopie(hh);
      weg(hh);
      const m = abstand(hh, vor);
      wege.push(`${z2(m.mittel)}/${z2(m.max)}`);
    }
    console.log(`   ${name}: Weg der Fläche je Mal (Mittel/größter) ${wege.join(' · ')}, danach bis ${z2(kapselFehler(hh, SCHLAUCH.c + SCHLAUCH.a, SCHLAUCH.r))} von der Kapsel, ${fz(hh)}`);
  }
  // die Bilder zeigen den Stand nach dem ersten Rechnen
  const erst = schlauchLauf(DREIECKE);
  blatt.push({
    kurz: 'schlauch',
    titel: 'Schlauch mit drei Ringen, das Stück zwischen den äußeren Ringen auf doppelte Länge gezogen',
    blicke: [
      ['Seite', 0, 0],
      ['von oben', 0, 90],
    ],
    bilder: (
      [
        ['heute', erst.hH],
        [NAME_A, erst.hA],
        [NAME_B, erst.hB],
      ] as const
    ).map(([name, hh]) => {
      const d = dicke(hh, -2 * SCHLAUCH.a, 2 * SCHLAUCH.a);
      const f = falten(hh);
      return {
        name,
        h: hh,
        loops: erst.loops,
        notiz: `Dicke zwischen den Ringen ${z1(d.mittel)} (vorher ${z1(dicke(erst.h, -SCHLAUCH.a, SCHLAUCH.a).mittel)}). Die Enden weichen bis ${z1(kapselFehler(hh, SCHLAUCH.c + SCHLAUCH.a, SCHLAUCH.r))} von der runden Kappe ab${f.ueber60 ? `, ${f.ueber60} Knicke über 60°` : ''}.`,
      };
    }),
  });
}

// ---- Rüssel aus zwei Profillinien --------------------------------------------------------------------------------------------
/**
 * Kugel mit Mittellinie und einem senkrechten Ring; vorn (x > x0) wird die Kappe in Schritten um `lang` nach vorn geschoben.
 * Zwischen Kugel und Kappe entsteht ein Rüssel, den nur die Mittellinie hält (oben und unten je eine Profillinie). Nach jedem
 * Schritt wird verdichtet wie im Fenster.
 */
function ruesselLauf(art: 'heute' | 'A' | 'B', dreieckeZahl = DREIECKE): { h: Haut; loops: Loop[]; verhaeltnis: number; hoehe: number; breite: number } {
  const n = rundAusSeite(
    [
      { x: R, y: 0 },
      { x: 0, y: R },
      { x: -R, y: 0 },
      { x: 0, y: -R },
    ],
    { dreiecke: dreieckeZahl },
  );
  let { h, loops } = mitSchnitten(hautAus(n.positionen, n.indizes), [
    ['top', [-200, 0], [200, 0]],
    ['seite', [10, 200], [10, -200]],
  ]);
  const mk = mittlereKante(h);
  const x0 = R * Math.cos((22 * Math.PI) / 180);
  const lang = 160;
  const schritte = 8;
  for (let k = 0; k < schritte; k++) {
    const ab0 = x0 + (k * lang) / schritte;
    const lagen = loops.map((l) => abbilden(l.ruhe, (x, y, z) => [x > ab0 ? x + lang / schritte : x, y, z]));
    if (art === 'heute') heute(h, loops, lagen, 8, 60);
    else if (art === 'A') wegA(h, loops, lagen);
    else wegB(h, loops, lagen);
    for (const l of loops) festlegen(h, l);
    const v = nachVerdichten(h, loops, mk);
    h = v.h;
    loops = v.loops;
  }
  // Querschnitt in der Mitte des Rüssels
  const xm = x0 + lang / 2;
  let yMin = Infinity;
  let yMax = -Infinity;
  let zMax = 0;
  for (let v = 0; v < h.n; v++) {
    if (Math.abs(h.pos[3 * v]! - xm) > 12) continue;
    yMin = Math.min(yMin, h.pos[3 * v + 1]!);
    yMax = Math.max(yMax, h.pos[3 * v + 1]!);
    zMax = Math.max(zMax, Math.abs(h.pos[3 * v + 2]!));
  }
  return { h, loops, hoehe: yMax - yMin, breite: 2 * zMax, verhaeltnis: (2 * zMax) / (yMax - yMin) };
}
function ruessel(): void {
  const bilder: BlattBild[] = [];
  const teile: string[] = [];
  for (const [art, name] of [
    ['heute', 'heute'],
    ['A', NAME_A],
    ['B', NAME_B],
  ] as const) {
    const r = ruesselLauf(art);
    teile.push(`${art}: Höhe ${z1(r.hoehe)}, Breite ${z1(r.breite)}, Breite zu Höhe ${z2(r.verhaeltnis)}, ${r.h.n} Punkte, ${fz(r.h)}`);
    bilder.push({ name, h: r.h, loops: r.loops, notiz: `Querschnitt in der Mitte: Höhe ${z1(r.hoehe)}, Breite ${z1(r.breite)} (Breite zu Höhe ${z2(r.verhaeltnis)})` });
  }
  console.log(`Rüssel aus zwei Profillinien (Kappe der Kugel in 8 Schritten um 160 nach vorn, je Schritt verdichtet), Querschnitt in der Mitte:\n   ${teile.join('\n   ')}`);
  blatt.push({
    kurz: 'ruessel',
    titel: 'Rüssel nur aus zwei Profillinien (aus der Kugel gezogen, in 8 Schritten)',
    blicke: [
      ['Seite', 0, 0],
      ['von oben', 0, 90],
    ],
    bilder,
  });
}

// ---- Horn verlängern (strange bird) ------------------------------------------------------------------------------------------
/** Ausdehnung des Horns (Hälfte z > 0) in der Höhe y ± 8: in x und in z */
function hornSchnitt(h: Haut, y: number): { x: number; z: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let zz0 = Infinity;
  let zz1 = -Infinity;
  for (let v = 0; v < h.n; v++) {
    if (Math.abs(h.pos[3 * v + 1]! - y) > 8 || h.pos[3 * v + 2]! < 1) continue;
    x0 = Math.min(x0, h.pos[3 * v]!);
    x1 = Math.max(x1, h.pos[3 * v]!);
    zz0 = Math.min(zz0, h.pos[3 * v + 2]!);
    zz1 = Math.max(zz1, h.pos[3 * v + 2]!);
  }
  return { x: x1 - x0, z: zz1 - zz0 };
}
function horn(): void {
  const { h, loops } = formLaden('strange bird');
  // die Spitze des Horns: der höchste Punkt aller Loops; alle Punkte derselben Kreuzung gehen mit
  let spitze: { li: number; pi: number; y: number; kreuzung?: number } | null = null;
  loops.forEach((l, li) => l.punkte.forEach((p, pi) => (!spitze || p.cur.y > spitze.y ? (spitze = { li, pi, y: p.cur.y, kreuzung: p.kreuzung }) : 0)));
  const sp = spitze!;
  const WEIT = 70;
  const lagenBei = (weit: number): Float64Array[] =>
    loops.map((l, li) => {
      const D: V3[] = l.punkte.map((p, pi) => ((li === sp.li && pi === sp.pi) || (sp.kreuzung !== undefined && p.kreuzung === sp.kreuzung) ? { x: 0, y: weit, z: 0 } : { x: 0, y: 0, z: 0 }));
      const d = verschiebungLaengs(l, D);
      return Float64Array.from(l.ruhe, (x, k) => x + d[k]!);
    });
  const lagen = lagenBei(WEIT);
  const y0 = 250;
  const yS = sp.y;
  const bei = (t: number, weit: number): number => y0 + t * (yS + weit - y0);
  const zeile = (hh: Haut, weit: number): string => [0.4, 0.6, 0.8].map((t) => `${z1(hornSchnitt(hh, bei(t, weit)).x)} × ${z1(hornSchnitt(hh, bei(t, weit)).z)}`).join(' · ');
  console.log(`Horn am strange bird (${h.n} Punkte): Spitze bei y = ${yS.toFixed(0)} um ${WEIT} nach oben. Querschnitt des Horns (Ausdehnung in x × in z) bei 40 %, 60 %, 80 % seiner Länge:`);
  console.log(`   vorher: ${zeile(h, 0)}`);
  const hH = kopie(h);
  const hA = kopie(h);
  const hB = kopie(h);
  const runden = heute(hH, loops, lagen);
  wegA(hA, loops, lagen);
  const nor = hautNormalenMax(h);
  wegB(hB, loops, lagen, nor);
  console.log(`   heute (${runden} Runden): ${zeile(hH, WEIT)} · ${fz(hH)}`);
  {
    // Gegenprobe: dieselbe Rechnung ohne Zug (die gesicherte Form ruht nicht ganz) — wie viel davon ist bloßes Setzen?
    const ohne = kopie(h);
    const r0 = heute(ohne, loops, loops.map((l) => l.ruhe));
    console.log(`   heute ohne Zug (${r0} Runden, nur gesetzt): ${zeile(ohne, 0)}`);
  }
  console.log(`   A: ${zeile(hA, WEIT)} · ${fz(hA)}`);
  console.log(`   B: ${zeile(hB, WEIT)} · ${fz(hB)} (vorher ${fz(h)})`);
  // hin und zurück: dieselbe Haut?
  const zurueck = loops.map((l) => l.ruhe);
  {
    const hh = kopie(h);
    const plan = bindungenAus(hh, loops);
    const d = new HautDirekt(hh, plan.bind, { hart: hartePunkte(hh, loops) });
    d.lagenLoesen(zieleAus(plan, zurueck), nor);
    const erst = kopie(hh);
    d.lagenLoesen(zieleAus(plan, lagen), nor);
    const t = performance.now();
    d.lagenLoesen(zieleAus(plan, zurueck), nor);
    let m = 0;
    for (let i = 0; i < erst.pos.length; i++) m = Math.max(m, Math.abs(erst.pos[i]! - hh.pos[i]!));
    console.log(`   B hin und zurück: größter Unterschied ${m.toExponential(1)} (ein Rechnen ${(performance.now() - t).toFixed(0)} ms, davon Zerlegen ${d.zeiten.zerlegen.toFixed(0)} ms, Einsetzen ${d.zeiten.loesen.toFixed(0)} ms) · ohne Zug gegen die geladene Fläche: ${ab(erst, h)}`);
  }
  {
    const erst = kopie(h);
    wegA(erst, loops, zurueck);
    const hin = kopie(h);
    const plan = bindungenAus(hin, loops);
    const d = new HautDirekt(hin, plan.bind, { hart: hartePunkte(hin, loops) });
    d.rechnen(zieleAus(plan, lagen), linienRichtung(h, loops, plan, lagen, nor), nor);
    d.rechnen(zieleAus(plan, zurueck), linienRichtung(h, loops, plan, zurueck, nor));
    let m = 0;
    for (let i = 0; i < erst.pos.length; i++) m = Math.max(m, Math.abs(erst.pos[i]! - hin.pos[i]!));
    console.log(`   A hin und zurück: größter Unterschied ${m.toExponential(1)}`);
  }
  // B: nach dem Zug neu anlegen (Gewichte aus der neuen Haut) und noch einmal rechnen
  for (const [name, mit] of [
    ['Normalen behalten', true],
    ['Normalen neu von der Haut gelesen', false],
  ] as const) {
    const hh = kopie(hB);
    const ls = loopsKopie(loops);
    setzen(ls, lagen);
    const wege: string[] = [];
    for (let k = 0; k < 3; k++) {
      const vor = kopie(hh);
      wegB(hh, ls, lagen, mit ? nor : undefined);
      const m = abstand(hh, vor);
      wege.push(`${z2(m.mittel)}/${z2(m.max)}`);
    }
    console.log(`   B nach dem Zug dreimal neu angelegt, ${name}: Weg der Fläche je Mal (Mittel/größter) ${wege.join(' · ')} · Horn ${zeile(hh, WEIT)}`);
  }
  const T3 = [0.4, 0.6, 0.8];
  const dick = (hh: Haut, weit: number): string => T3.map((t) => z1(hornSchnitt(hh, bei(t, weit)).z)).join(' · ');
  const mehr = (hh: Haut): string =>
    T3.map((t) => {
      const p = (100 * (hornSchnitt(hh, bei(t, WEIT)).z - hornSchnitt(h, bei(t, 0)).z)) / hornSchnitt(h, bei(t, 0)).z;
      return `${p >= 0 ? '+' : '−'}${Math.abs(p).toFixed(0)} %`;
    }).join(' · ');
  const blicke = [
    ['Seite', 0, 0, 0.8],
    ['von vorn', -90, 0, 0.8],
  ] as const;
  const ls = loopsKopie(loops);
  setzen(ls, lagen);
  blatt.push({
    kurz: 'horn',
    titel: `Horn am „strange bird“: Spitze um ${WEIT} Einheiten nach oben gezogen`,
    blicke,
    bilder: [
      { name: 'vorher', h, loops, notiz: `Dicke des Horns (von vorn gesehen) bei 40 / 60 / 80 % seiner Länge: ${dick(h, 0)}` },
      { name: 'heute', h: hH, loops: ls, notiz: `Dicke ${dick(hH, WEIT)} (${mehr(hH)})` },
      { name: NAME_A, h: hA, loops: ls, notiz: `Dicke ${dick(hA, WEIT)} (${mehr(hA)}); ${falten(hA).umgeklappt} Dreiecke umgestülpt` },
      { name: NAME_B, h: hB, loops: ls, notiz: `Dicke ${dick(hB, WEIT)} (${mehr(hB)})` },
    ],
  });
}

// ---- seine drei Formen, nichts gezogen ---------------------------------------------------------------------------------------
function formen(): void {
  for (const name of ['strange bird', 'teat firefish', 'test_kaputt']) {
    const { h, loops, mk } = formLaden(name);
    const lagen = loops.map((l) => l.ruhe);
    const hH = kopie(h);
    const hA = kopie(h);
    const hB = kopie(h);
    const runden = heute(hH, loops, lagen);
    const dA = wegA(hA, loops, lagen);
    const dB = wegB(hB, loops, lagen);
    console.log(`${name} (${h.n} Punkte, ${loops.length} Loops; geladen: ${fz(h)}), nichts gezogen, Abstand zur geladenen Fläche:`);
    console.log(`   heute (${runden} Runden): ${ab(hH, h, 2 * mk)} · ${fz(hH)}`);
    console.log(`   A (${(dA.zeiten.verteilen + dA.zeiten.zeilen + dA.zeiten.zerlegen + dA.zeiten.loesen).toFixed(0)} ms): ${ab(hA, h, 2 * mk)} · ${fz(hA)}`);
    console.log(`   B (${(dB.zeiten.zeilen + dB.zeiten.zerlegen + dB.zeiten.loesen).toFixed(0)} ms): ${ab(hB, h, 2 * mk)} · ${fz(hB)}`);
    const nor = hautNormalenMax(h);
    for (const [was, mit] of [
      ['Normalen behalten', true],
      ['Normalen neu von der Haut gelesen', false],
    ] as const) {
      const wege: string[] = [];
      const hh = kopie(hB);
      for (let k = 0; k < 3; k++) {
        const vor = kopie(hh);
        wegB(hh, loops, lagen, mit ? nor : undefined);
        const m = abstand(hh, vor, 2 * mk);
        wege.push(`${z2(m.mittel)}/${z2(m.max)}`);
      }
      console.log(`   B noch dreimal neu angelegt, ${was}: Weg der Fläche je Mal (Mittel/größter) ${wege.join(' · ')}, danach ${fz(hh)}`);
    }
    blatt.push({
      kurz: name.replace(' ', '-'),
      titel: `„${name}“, nichts gezogen: einmal gerechnet`,
      blicke: [
        ['Seite', 0, 0],
        ['schräg von vorn', -40, 20],
      ],
      bilder: (
        [
          ['heute', hH],
          [NAME_A, hA],
          [NAME_B, hB],
        ] as const
      ).map(([n, hh]) => {
        const m = abstand(hh, h, 2 * mk);
        return { name: n, h: hh, loops, notiz: `Abstand zur gesicherten Form: im Mittel ${z2(m.mittel)}, größter ${z1(m.max)}. Umgestülpte Dreiecke: ${falten(hh).umgeklappt} (gesichert: ${falten(h).umgeklappt}).` };
      }),
    });
  }
}

// ---- dasselbe auf einem Viertel der Punkte -----------------------------------------------------------------------------------
function viertel(): void {
  const fein = schlauchLauf(6000);
  const grob = schlauchLauf(1500);
  console.log(`Schlauch gestreckt auf ${fein.h.n} und auf ${grob.h.n} Punkten, Punkte des groben Netzes gegen die feine Fläche:`);
  console.log(`   heute: ${ab(grob.hH, fein.hH)} · A: ${ab(grob.hA, fein.hA)} · B: ${ab(grob.hB, fein.hB)}`);
}

const t0 = performance.now();
if (FAELLE.includes('kugel')) kugel();
if (FAELLE.includes('schlauch')) schlauch();
if (FAELLE.includes('ruessel')) ruessel();
if (FAELLE.includes('horn')) horn();
if (FAELLE.includes('formen')) formen();
if (FAELLE.includes('viertel')) viertel();
if (process.env.BLATT) {
  // ein Blatt mit allem und je Fall ein eigenes (BLATT = Pfad ohne Endung)
  const titel = 'Schritt 3: Beweis „Haut direkt aus den Linien“';
  blattSchreiben(`${process.env.BLATT}.html`, titel, blatt);
  blatt.forEach((z, i) => blattSchreiben(`${process.env.BLATT}-${i + 1}-${z.kurz}.html`, titel, [z]));
  console.log(`${process.env.BLATT}.html und ${blatt.length} einzelne`);
}
console.log(`${((performance.now() - t0) / 1000).toFixed(0)} s`);
