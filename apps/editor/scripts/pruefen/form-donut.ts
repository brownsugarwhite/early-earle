// Plan vom 12.11.2026, Schritt 4: der kleine Beweis „Donut“ vor dem Umbau auf die halbe Haut, im Kern ohne Fenster.
// Kugel mit drei Loops; der Punkt an ihrer Seite (Kreuzung der beiden Ringe) wird durch die Spiegelebene gezogen. Verglichen wird:
//   heute       die ganze Haut gerechnet, beide Hälften laufen durcheinander; gezeigt wird jede Hälfte bis zur Ebene (so zeigt es
//               das Fenster seit dem 11.11.): Wie sieht der Rand des Lochs aus?
//   verschmolzen  die Hälfte ist die Wahrheit: an der Ebene abgeschnitten, mit ihrem Spiegelbild zu einer Haut verbunden (der Rand
//               des Lochs sind Punkte der Mittelebene), dann rechnet die heutige Rechnung auf dieser Haut weiter
//               · frei: der Rand ist keine Linie   · als Linie der Mittelebene   · als Linie, die keine Wölbung vorgibt (Ecken)
//   zurück      den Punkt wieder an seinen Ort: Ist die Form die von vorher?
// Ergebnis vom 13.11. (`docs/UEBERGABE.md`, Abschnitt 7; Bild `docs/progress/editor/schritt4-donut-2026-11-13.jpg`): Der Rand des
// Lochs ist heute eine scharfe Kante (Knick im Mittel 97°) und bleibt verschmolzen eine (im Mittel 22° bis 77°, größter 84° bis
// 150°); mit freiem Rand verzieht sich das Loch. Zurückgezogen ist die Kugel wieder da (im Mittel 0,11, größter 0,4).
// Aufruf aus packages/shape: BLATT=<pfad ohne Endung> npx vite-node ../../apps/editor/scripts/pruefen/form-donut.ts
//   TIEF=190 (so weit wird der Punkt gezogen; die Kugel hat Radius 150)   DREIECKE=2000
import { type Haut, type V3, hautAus, hautSeiten } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, festlegen, mittlereKante, verschiebungLaengs } from '../../../../packages/shape/src/dicht/loops';
import { flaechenAbstand } from './flaechenabstand';
import { type BlattBild, blattSchreiben } from './form-direkt-blatt';
import { R, kugelMit, nachVerdichten } from './form-direkt-faelle';

const TIEF = Number(process.env.TIEF ?? 190);
const DREIECKE = Number(process.env.DREIECKE ?? 2000);
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const kopie = (h: Haut): Haut => ({ ...h, pos: Float64Array.from(h.pos) });
const loopsKopie = (loops: readonly Loop[]): Loop[] => loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) }));
const fz = (h: Haut): string => {
  const f = falten(h);
  return `Knicke über 60° ${f.ueber60}, umgestülpt ${f.umgeklappt}`;
};

/** die heutige Rechnung: Zug in Schritten zu den neuen Lagen der Linien, dann Runden bis zur Ruhe; zurück: Runden am Ende, steht sie? */
function heute(h: Haut, loops: readonly Loop[], lagen: readonly Float64Array[], schritte = 30, ende = 200): { runden: number; steht: boolean; weg: number } {
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
  const versch = loops.map((l, i) => Float64Array.from(lagen[i]!, (x, k) => x - l.ruhe[k]!));
  let bewegt = false;
  for (const d of versch) for (let k = 0; k < d.length; k++) if (d[k] !== 0) bewegt = true;
  if (bewegt) for (let s = 1; s <= schritte; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / schritte)), 2);
  const anfang = Float64Array.from(h.pos);
  let r = 0;
  let steht = false;
  for (; r < ende; r++) {
    const vor = Float64Array.from(h.pos);
    z.schritt(versch, 1);
    let w = 0;
    for (let i = 0; i < vor.length; i += 3) w = Math.max(w, Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!));
    if (!Number.isFinite(w)) throw new Error('die Haut ist nicht endlich');
    if (w < 0.02) {
      steht = true;
      break;
    }
  }
  let weg = 0;
  for (let i = 0; i < anfang.length; i += 3) weg = Math.max(weg, Math.hypot(h.pos[i]! - anfang[i]!, h.pos[i + 1]! - anfang[i + 1]!, h.pos[i + 2]! - anfang[i + 2]!));
  return { runden: r + 1, steht, weg };
}

/**
 * Die Hälfte z ≥ 0 der Haut an der Spiegelebene abschneiden und mit ihrem Spiegelbild zu einer Haut verbinden. Welche Punkte zur
 * Hälfte gehören, steht am Netz (`hautSeiten`), nicht an der Lage: Was davon unter die Ebene geraten ist, fällt weg, die Kanten,
 * die die Ebene kreuzen, bekommen dort einen Punkt (z = 0). Die Loops werden an denselben Stellen geteilt; ihre Stücke über der
 * Ebene bleiben Linien (Ringe mit Enden auf der Ebene). `rand`: die neuen Punkte auf der Ebene (der Rand des Lochs).
 */
function verschmelzen(h: Haut, loops: readonly Loop[], randLinie: boolean, weich = false): { h: Haut; loops: Loop[]; rand: number[] } {
  const seite = hautSeiten(h);
  if (!seite) throw new Error('die Mittelkante trennt das Netz nicht');
  const P = h.pos;
  const pos: number[] = [];
  const neuNr = new Int32Array(h.n).fill(-1);
  // gebliebene Punkte der Hälfte: auf der Mittelkante oder über der Ebene
  for (let v = 0; v < h.n; v++) {
    if (seite[v]! < 0) continue;
    if (seite[v] === 0 || P[3 * v + 2]! > 0) {
      neuNr[v] = pos.length / 3;
      pos.push(P[3 * v]!, P[3 * v + 1]!, seite[v] === 0 ? 0 : P[3 * v + 2]!);
    }
  }
  const schnitt = new Map<number, number>();
  const rand: number[] = [];
  const schnittPunkt = (a: number, b: number): number => {
    // a liegt über der Ebene, b darunter (beide aus der Hälfte)
    const key = Math.min(a, b) * h.n + Math.max(a, b);
    const da = schnitt.get(key);
    if (da !== undefined) return da;
    const za = P[3 * a + 2]!;
    const zb = P[3 * b + 2]!;
    const t = za / (za - zb);
    const nr = pos.length / 3;
    pos.push(P[3 * a]! + t * (P[3 * b]! - P[3 * a]!), P[3 * a + 1]! + t * (P[3 * b + 1]! - P[3 * a + 1]!), 0);
    schnitt.set(key, nr);
    rand.push(nr);
    return nr;
  };
  const oben = (v: number): boolean => neuNr[v]! >= 0;
  const tri: number[] = [];
  for (let t = 0; t < h.tri.length; t += 3) {
    const e = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
    if (e.some((v) => seite[v]! < 0)) continue;
    const drin = e.map(oben);
    const zahl = drin.filter(Boolean).length;
    if (zahl === 0) continue;
    if (zahl === 3) {
      tri.push(neuNr[e[0]!]!, neuNr[e[1]!]!, neuNr[e[2]!]!);
      continue;
    }
    // das Vieleck des Dreiecks über der Ebene, in seiner Umlaufrichtung
    const vieleck: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = e[k]!;
      const b = e[(k + 1) % 3]!;
      if (oben(a)) vieleck.push(neuNr[a]!);
      if (oben(a) !== oben(b)) {
        // Punkte der Mittelkante liegen schon auf der Ebene: kein neuer Punkt
        if (oben(a) && seite[a] === 0) continue;
        if (oben(b) && seite[b] === 0) continue;
        vieleck.push(oben(a) ? schnittPunkt(a, b) : schnittPunkt(b, a));
      }
    }
    for (let k = 1; k + 1 < vieleck.length; k++) if (vieleck[0] !== vieleck[k] && vieleck[k] !== vieleck[k + 1] && vieleck[0] !== vieleck[k + 1]) tri.push(vieleck[0]!, vieleck[k]!, vieleck[k + 1]!);
  }
  // das Spiegelbild: Punkte über der Ebene noch einmal mit −z, Punkte der Ebene gehören beiden
  const nHalb = pos.length / 3;
  const gegen = new Int32Array(nHalb);
  for (let v = 0; v < nHalb; v++) {
    if (pos[3 * v + 2] === 0) gegen[v] = v;
    else {
      gegen[v] = pos.length / 3;
      pos.push(pos[3 * v]!, pos[3 * v + 1]!, -pos[3 * v + 2]!);
    }
  }
  const nT = tri.length;
  for (let t = 0; t < nT; t += 3) tri.push(gegen[tri[t]!]!, gegen[tri[t + 2]!]!, gegen[tri[t + 1]!]!);
  const neu = hautAus(pos, tri);
  // die Loops: Kette ihrer Punkte, an der Ebene geteilt; Stücke über der Ebene bleiben
  const aus: Loop[] = [];
  let id = 1;
  const stueck = (art: Loop['art'], kette: number[], ohneWoelbung = false): void => {
    if (kette.length < 2) return;
    const ruhe = new Float64Array(3 * kette.length);
    const s = new Float64Array(kette.length);
    kette.forEach((v, i) => {
      for (let c = 0; c < 3; c++) ruhe[3 * i + c] = neu.pos[3 * v + c]!;
      if (i > 0) s[i] = s[i - 1]! + Math.hypot(ruhe[3 * i]! - ruhe[3 * i - 3]!, ruhe[3 * i + 1]! - ruhe[3 * i - 2]!, ruhe[3 * i + 2]! - ruhe[3 * i - 1]!);
    });
    let laenge = s[kette.length - 1]!;
    if (art !== 'ring') laenge += Math.hypot(ruhe[0]! - ruhe[3 * kette.length - 3]!, ruhe[1]! - ruhe[3 * kette.length - 2]!, ruhe[2]! - ruhe[3 * kette.length - 1]!);
    // `ohneWoelbung`: an jeder Probe ein Punkt mit Ecke. Die heutige Rechnung liest an einer Ecke keine Wölbung ab und gibt keine
    // weiter; die Linie hält dann nur den Ort, wie die Haut über sie läuft, folgt aus der Umgebung.
    const punkte = ohneWoelbung ? kette.map((_, i) => ({ s: s[i]!, ref: { x: ruhe[3 * i]!, y: ruhe[3 * i + 1]!, z: ruhe[3 * i + 2]! }, cur: { x: ruhe[3 * i]!, y: ruhe[3 * i + 1]!, z: ruhe[3 * i + 2]! }, ecke: true })) : [];
    aus.push({ id: id++, art, proben: kette.map((v) => ({ ecken: [v, v, v], b: [1, 0, 0] })), s, laenge, ruhe, punkte });
  };
  for (const l of loops) {
    const kette = l.proben.map((p) => p.ecken[0]);
    if (l.art === 'mitte') {
      stueck('mitte', kette.map((v) => neuNr[v]!));
      continue;
    }
    // (ein Paar, das die Ebene kreuzt, zerfällt wie ein Ring in Stücke mit Enden auf der Ebene)
    const n = kette.length;
    const zu = l.art === 'paar';
    let jetzt: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = kette[i]!;
      if (oben(a)) jetzt.push(neuNr[a]!);
      const j = i + 1 < n ? i + 1 : zu ? 0 : -1;
      if (j < 0) break;
      const b = kette[j]!;
      if (oben(a) !== oben(b)) {
        const key = Math.min(a, b) * h.n + Math.max(a, b);
        const sp = schnitt.get(key);
        if (sp !== undefined) {
          if (oben(a)) {
            jetzt.push(sp);
            stueck('ring', jetzt);
            jetzt = [];
          } else jetzt = [sp];
        }
      }
    }
    if (zu && jetzt.length && aus.length === 0) stueck('paar', jetzt);
    else stueck('ring', jetzt);
  }
  // der Rand des Lochs als Loop der Mittelebene: die neuen Punkte auf der Ebene, der Reihe nach über ihre Kanten
  if (randLinie && rand.length > 2) {
    const imRand = new Set(rand);
    const besucht = new Set<number>();
    for (const anfang of rand) {
      if (besucht.has(anfang)) continue;
      const kette = [anfang];
      besucht.add(anfang);
      for (;;) {
        const letzter = kette[kette.length - 1]!;
        const weiter = neu.nachbarn[letzter]!.find((u) => imRand.has(u) && !besucht.has(u));
        if (weiter === undefined) break;
        kette.push(weiter);
        besucht.add(weiter);
      }
      if (kette.length > 2) stueck('mitte', kette, weich);
    }
  }
  return { h: neu, loops: aus, rand };
}

/** Schnitt der Haut mit der Ebene y = 0: Strecken (x, z) */
function schnittY(h: Haut): number[] {
  const P = h.pos;
  const aus: number[] = [];
  for (let t = 0; t < h.tri.length; t += 3) {
    const e = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
    const pt: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = e[k]!;
      const b = e[(k + 1) % 3]!;
      const ya = P[3 * a + 1]!;
      const yb = P[3 * b + 1]!;
      if (ya > 0 !== yb > 0) {
        const u = ya / (ya - yb);
        pt.push(P[3 * a]! + u * (P[3 * b]! - P[3 * a]!), P[3 * a + 2]! + u * (P[3 * b + 2]! - P[3 * a + 2]!));
      }
    }
    if (pt.length === 4) aus.push(...pt);
  }
  return aus;
}

/** Knick quer über den Rand des Lochs (Grad): zwischen den beiden Dreiecken an jeder Kante aus zwei Randpunkten; Mittel, größter */
function randKnick(h: Haut, rand: readonly number[]): { mittel: number; max: number; kanten: number } {
  const imRand = new Set(rand);
  const P = h.pos;
  const normale = (t: number): [number, number, number] => {
    const [a, b, c] = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
    const u = [0, 1, 2].map((k) => P[3 * b + k]! - P[3 * a + k]!);
    const v = [0, 1, 2].map((k) => P[3 * c + k]! - P[3 * a + k]!);
    const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
    const l = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    return [n[0]! / l, n[1]! / l, n[2]! / l];
  };
  const kanten = new Map<number, number[]>();
  for (let t = 0; t < h.tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = h.tri[t + k]!;
      const b = h.tri[t + ((k + 1) % 3)]!;
      if (!imRand.has(a) || !imRand.has(b)) continue;
      const key = Math.min(a, b) * h.n + Math.max(a, b);
      kanten.set(key, [...(kanten.get(key) ?? []), t]);
    }
  let s = 0;
  let m = 0;
  let z = 0;
  for (const ts of kanten.values()) {
    if (ts.length !== 2) continue;
    const p = normale(ts[0]!);
    const q = normale(ts[1]!);
    const w = (Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]))) * 180) / Math.PI;
    s += w;
    m = Math.max(m, w);
    z++;
  }
  return { mittel: z ? s / z : 0, max: m, kanten: z };
}
/** Halbmesser des Lochs: Abstand der Randpunkte von der Achse durch ihre Mitte (kleinster, größter) */
function lochMass(h: Haut, rand: readonly number[]): string {
  if (rand.length === 0) return 'kein Loch';
  let cx = 0;
  let cy = 0;
  for (const v of rand) {
    cx += h.pos[3 * v]!;
    cy += h.pos[3 * v + 1]!;
  }
  cx /= rand.length;
  cy /= rand.length;
  let a = Infinity;
  let b = 0;
  for (const v of rand) {
    const r = Math.hypot(h.pos[3 * v]! - cx, h.pos[3 * v + 1]! - cy);
    a = Math.min(a, r);
    b = Math.max(b, r);
  }
  return `Loch mit Halbmesser ${z1(a)} bis ${z1(b)}`;
}

const start = kugelMit('drei', DREIECKE);
const mk = mittlereKante(start.h);
// der Punkt an der Seite: die Kreuzung mit dem größten z
let wahl: { kreuzung: number; z: number } | null = null;
for (const l of start.loops) for (const p of l.punkte) if (p.kreuzung !== undefined && (!wahl || p.ref.z > wahl.z)) wahl = { kreuzung: p.kreuzung, z: p.ref.z };
const kz = wahl!.kreuzung;
const lagenBei = (loops: readonly Loop[], tief: number): Float64Array[] =>
  loops.map((l) => {
    let irgend = false;
    const D: V3[] = l.punkte.map((p) => {
      const mit = p.kreuzung === kz;
      if (mit) irgend = true;
      return mit ? { x: 0, y: 0, z: -tief } : { x: 0, y: 0, z: 0 };
    });
    if (!irgend) return Float64Array.from(l.ruhe);
    const d = verschiebungLaengs(l, D);
    return Float64Array.from(l.ruhe, (x, k) => x + d[k]!);
  });
console.log(`Kugel mit drei Loops (${start.h.n} Punkte, Radius ${R}); der Punkt an der Seite (z = ${z1(wahl!.z)}) wird um ${TIEF} durch die Spiegelebene gezogen (bis z = ${z1(wahl!.z - TIEF)})`);

// heute: die ganze Haut gerechnet
const wahr = { h: kopie(start.h), loops: loopsKopie(start.loops) };
const lagen = lagenBei(wahr.loops, TIEF);
const rH = heute(wahr.h, wahr.loops, lagen);
let unter = 0;
const seiten = hautSeiten(wahr.h)!;
for (let v = 0; v < wahr.h.n; v++) if (seiten[v]! > 0 && wahr.h.pos[3 * v + 2]! < 0) unter++;
console.log(`heute: ${rH.runden} Runden bis zur Ruhe${rH.steht ? '' : ' (steht nicht)'}; ${unter} Punkte der einen Hälfte liegen auf der Seite der anderen; an der gerechneten Haut ${fz(wahr.h)}`);
for (const l of wahr.loops) festlegen(wahr.h, l);

// gezeigt wie im Fenster: an der Ebene abgeschnitten und zusammengesetzt, nichts weiter gerechnet
const gezeigt = verschmelzen(wahr.h, wahr.loops, false);
const kH = randKnick(gezeigt.h, gezeigt.rand);
console.log(`   gezeigt (jede Hälfte bis zur Ebene): ${gezeigt.h.n} Punkte, ${lochMass(gezeigt.h, gezeigt.rand)}, ${gezeigt.rand.length} Punkte am Rand; Knick quer über den Rand im Mittel ${z1(kH.mittel)}°, größter ${z1(kH.max)}°`);

const bilder: BlattBild[] = [
  { name: 'vorher', h: start.h, loops: start.loops, schnitt: { titel: 'Schnitt quer durch die Mitte (von oben gesehen)', strecken: schnittY(start.h), mass: 420 } },
  {
    name: 'heute: jede Hälfte wird bis zur Mitte gezeigt',
    h: gezeigt.h,
    loops: gezeigt.loops,
    notiz: `${lochMass(gezeigt.h, gezeigt.rand)}. Knick quer über den Rand: im Mittel ${z1(kH.mittel)}°, größter ${z1(kH.max)}°.`,
    schnitt: { titel: 'Schnitt quer durch die Mitte (von oben gesehen)', strecken: schnittY(gezeigt.h), mass: 420 },
  },
];

// verschmolzen: die heutige Rechnung auf der verbundenen Haut (Rand frei / Rand als Linie)
for (const [randLinie, weich, randName] of [
  [false, false, 'frei (keine Linie)'],
  [true, false, 'als Linie der Mittelebene'],
  [true, true, 'als Linie, die keine Wölbung vorgibt'],
] as const) {
  let v = verschmelzen(wahr.h, wahr.loops, randLinie, weich);
  const vor = kopie(v.h);
  let text = '';
  try {
    const r = heute(v.h, v.loops, v.loops.map((l) => l.ruhe), 0, 200);
    // was das Schneiden an schmalen Dreiecken hinterlässt, räumt das Verdichten auf; danach noch einmal bis zur Ruhe
    for (const l of v.loops) festlegen(v.h, l);
    const randOrte = v.rand.map((i) => [v.h.pos[3 * i]!, v.h.pos[3 * i + 1]!] as const);
    const d = nachVerdichten(v.h, v.loops, mk);
    v = { h: d.h, loops: d.loops, rand: [] };
    const r2 = heute(v.h, v.loops, v.loops.map((l) => l.ruhe), 0, 200);
    // der Rand danach: die Punkte der Ebene nahe den alten Randpunkten
    const rand: number[] = [];
    for (let i = 0; i < v.h.n; i++) {
      if (v.h.spiegel[i] !== i) continue;
      if (randLinie ? v.loops.some((l, li) => li >= v.loops.length - 1 && l.art === 'mitte' && l.proben.some((p) => p.ecken[0] === i)) : randOrte.some(([x, y]) => Math.hypot(v.h.pos[3 * i]! - x, v.h.pos[3 * i + 1]! - y) < 0.75 * mk) && Math.hypot(v.h.pos[3 * i]!, v.h.pos[3 * i + 1]!) < 0.8 * R) rand.push(i);
    }
    v.rand = rand;
    const k = randKnick(v.h, rand);
    const d0 = Array.from(flaechenAbstand(Array.from({ length: v.h.n }, (_, i) => [v.h.pos[3 * i]!, v.h.pos[3 * i + 1]!, v.h.pos[3 * i + 2]!] as [number, number, number]), Array.from({ length: vor.n }, (_, i) => [vor.pos[3 * i]!, vor.pos[3 * i + 1]!, vor.pos[3 * i + 2]!] as [number, number, number]), Array.from({ length: vor.tri.length / 3 }, (_, t) => [vor.tri[3 * t]!, vor.tri[3 * t + 1]!, vor.tri[3 * t + 2]!]), 30));
    const weit = Math.max(...d0);
    text = `${r.runden} + ${r2.runden} Runden bis zur Ruhe${r.steht && r2.steht ? '' : ' (steht nicht)'}; ${v.h.n} Punkte, ${lochMass(v.h, rand)}; Knick quer über den Rand im Mittel ${z1(k.mittel)}°, größter ${z1(k.max)}°; die Haut liegt bis ${z1(weit)} neben der gezeigten von heute; ${fz(v.h)}`;
  } catch (e) {
    text = `die heutige Rechnung hält auf der verbundenen Haut nicht: ${(e as Error).message}`;
  }
  console.log(`verschmolzen, Rand ${randName}: ${text}`);
  bilder.push({
    name: `verschmolzen, Rand ${randName}`,
    h: v.h,
    loops: v.loops,
    notiz: text,
    schnitt: { titel: 'Schnitt quer durch die Mitte (von oben gesehen)', strecken: schnittY(v.h), mass: 420 },
  });
}

// zurück: den Punkt wieder an seinen Ort (die Wahrheit ist die ganze Haut von heute; die Verschmelzung ist nur abgeleitet)
{
  const zurueck = lagenBei(start.loops, 0);
  const r = heute(wahr.h, wahr.loops, zurueck);
  const d = flaechenAbstand(Array.from({ length: wahr.h.n }, (_, i) => [wahr.h.pos[3 * i]!, wahr.h.pos[3 * i + 1]!, wahr.h.pos[3 * i + 2]!] as [number, number, number]), Array.from({ length: start.h.n }, (_, i) => [start.h.pos[3 * i]!, start.h.pos[3 * i + 1]!, start.h.pos[3 * i + 2]!] as [number, number, number]), Array.from({ length: start.h.tri.length / 3 }, (_, t) => [start.h.tri[3 * t]!, start.h.tri[3 * t + 1]!, start.h.tri[3 * t + 2]!]), 30);
  let m = 0;
  let s = 0;
  for (const x of d) {
    m = Math.max(m, x);
    s += x;
  }
  const text = `${r.runden} Runden${r.steht ? '' : ' (steht nicht)'}; gegen die Kugel von vorher: im Mittel ${z2(s / d.length)}, größter ${z1(m)}; ${fz(wahr.h)}`;
  console.log(`zurückgezogen (heutige Rechnung, ganze Haut): ${text}`);
  bilder.push({ name: 'zurückgezogen', h: wahr.h, loops: wahr.loops, notiz: text, schnitt: { titel: 'Schnitt quer durch die Mitte (von oben gesehen)', strecken: schnittY(wahr.h), mass: 420 } });
}

if (process.env.BLATT) {
  blattSchreiben(`${process.env.BLATT}.html`, 'Schritt 4, kleiner Beweis: der Donut (ein Punkt der Seite durch die Mitte gezogen)', [
    {
      titel: `Kugel mit drei Loops, der Punkt an der Seite um ${TIEF} durch die Spiegelebene gezogen`,
      blicke: [
        ['schräg von vorn', -40, 20, 0.8],
        ['von der Seite auf die Mitte', 0, 0, 0.8],
      ],
      bilder,
    },
  ]);
  console.log(`${process.env.BLATT}.html`);
}
