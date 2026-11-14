// Plan vom 12.11.2026, Schritt 6 (13.11., Florian: „ja, dann erst das Maul“): kleiner Beweis „das Maul als eigene Geometrie“.
// Im Kern ohne Fenster.
//
// Heute bleibt die Haut am Maul geschlossen, nur die Anzeige schneidet auf und setzt Gaumen und Boden ein (`maulAmLoop`). Hier wird
// daraus Haut: Die verborgene Fläche der Öffnung fällt weg, Gaumen und Boden werden an den Lippen eingeschweißt (eine Tasche, die
// Haut bleibt geschlossen). Darauf rechnet die Rechnung der Grundform.
//
// Form: die Kugel mit Ring und Maul aus dem Beweis zu den Posen (`formen/pose-maul-kugel.eewesen`).
// Kriterien (vorher festgelegt, Plan, Nachtrag zu Schritt 6): 1. das Maul ist Haut (geschlossen, spiegelgleich, nichts umgeschlagen,
// Lippen auf ihrer Linie); 2. die Höhle hält (Ruhe, Gaumen und Boden durchdringen sich nicht und stülpen sich nicht aus, außen
// höchstens 1 bewegt); 3. Loop um den Unterkiefer; 4. Öffnen und Schließen; 5. Zug an der Lippe bei offenem Maul.
//
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-maul-haut.ts
//   AUS=<datei.html> (Bildblatt)   HOEHLE=flach|gewoelbt (Standard flach; gewölbt: das Innere der Anzeige von heute)
//   DIAG=1 (Runde für Runde, welche Punkte davonlaufen; DIAG_RUNDEN, DIAG_MITTE=0 ohne Mittellinie, DIAG_HALB=0 über die ganze Haut)
import { fileURLToPath } from 'node:url';
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, type V3, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, LoopZug, eckenAuto, hatPfad, hautLagen, istSichtbar, kanteBei, kreuzungenZwischen, loopAusSchnitt, mittlereKante, pfadLagen, punktEinfuegen } from '../../../../packages/shape/src/dicht/loops';
import { type MaulAmLoop, maulAmLoop } from '../../../../packages/shape/src/dicht/maulLoop';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';
import { type BlattBild, type BlattLinie, type BlattSchnitt, type BlattZeile, blattSchreiben } from './form-direkt-blatt';
import { formLadenDatei, verdichtenWieImFenster } from './form-direkt-faelle';

const DATEI = process.env.FORM ?? fileURLToPath(new URL('./formen/pose-maul-kugel.eewesen', import.meta.url));
const AUS = process.env.AUS ?? '';
const RUHE = 0.02;
const MAX_RUNDEN = 400;
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const kopieLoops = (L: readonly Loop[]): Loop[] => L.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) }));
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });

// ---------- die Form von heute, zur Ruhe gerechnet ----------
const geladen = formLadenDatei(DATEI);
const mk = geladen.mk;
const maulNr = geladen.loops.findIndex((l) => l.punkte.some((p) => p.mundwinkel));
if (maulNr < 0) throw new Error('Die Form hat kein Maul (kein Punkt „Mundwinkel“)');

type Stand = { h: Haut; loops: Loop[] };
type Lauf = { runden: number; steht: boolean; letzte: number; unruhe: { stufen: number; fest: boolean } };

/** die Rechnung der Grundform auf einem Stand: Runden zu den Zielen `ziel` (sonst: jede Linie auf ihrem Pfad), bis die Haut steht */
function rechnen(st: Stand, ziel?: readonly Float64Array[], schritte = 0): Lauf {
  const z = new LoopZug(st.h, st.loops, null, true, 'kurven', 'geometrie', { halb: true });
  const Z = ziel ?? st.loops.map((l) => pfadLagen(l) ?? Float64Array.from(l.ruhe));
  const versch = st.loops.map((l, i) => Float64Array.from(Z[i]!, (x, k) => x - l.ruhe[k]!));
  for (let s = 1; s <= schritte; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / schritte)), 2);
  let runden = 2 * schritte;
  let letzte = Infinity;
  const vor = new Float64Array(st.h.pos.length);
  for (let r = 0; r < MAX_RUNDEN && letzte > RUHE; r++) {
    vor.set(st.h.pos);
    z.schritt(versch, 1);
    runden++;
    letzte = 0;
    for (let k = 0; k < vor.length; k += 3) letzte = Math.max(letzte, Math.hypot(st.h.pos[k]! - vor[k]!, st.h.pos[k + 1]! - vor[k + 1]!, st.h.pos[k + 2]! - vor[k + 2]!));
  }
  for (const l of st.loops) l.ruhe = hautLagen(st.h, l);
  return { runden, steht: letzte <= RUHE, letzte, unruhe: z.unruhe };
}

const heute: Stand = { h: { ...geladen.h, pos: Float64Array.from(geladen.h.pos) }, loops: kopieLoops(geladen.loops) };
const laufHeute = rechnen(heute);
console.log(`Form von heute: ${heute.h.n} Punkte, ${heute.loops.length} Loops; zur Ruhe gerechnet in ${laufHeute.runden} Runden`);

// ---------- Maul und Lippen (wie `maulAmLoop`) ----------
const maulLoop = heute.loops[maulNr]!;
const ecke = ((): number => {
  const p = maulLoop.punkte.find((q) => q.mundwinkel)!;
  let best = Infinity;
  let wo = -1;
  for (let i = 1; i < maulLoop.proben.length - 1; i++) {
    const d = Math.abs(maulLoop.s[i]! - p.s);
    if (d < best) {
      best = d;
      wo = i;
    }
  }
  return wo;
})();
const m: MaulAmLoop = maulAmLoop(heute.h, maulLoop, ecke, { zelle: mk / 2 })!;
if (!m) throw new Error('Das Maul schneidet nicht');
// Achse des Mauls in der Seite: vom Mundwinkel zur Mitte der Lippen vorn; `hoch`: quer dazu, zum Gaumen hin
const vK = maulLoop.proben.map((p) => p.ecken[0]);
const G = { x: heute.h.pos[3 * vK[ecke]!]!, y: heute.h.pos[3 * vK[ecke]! + 1]! };
const vorn = { x: (heute.h.pos[3 * vK[0]!]! + heute.h.pos[3 * vK[vK.length - 1]!]!) / 2, y: (heute.h.pos[3 * vK[0]! + 1]! + heute.h.pos[3 * vK[vK.length - 1]! + 1]!) / 2 };
const hochV = ((): { x: number; y: number } => {
  let x = -(vorn.y - G.y);
  let y = vorn.x - G.x;
  const l = Math.hypot(x, y) || 1;
  x /= l;
  y /= l;
  return y < 0 ? { x: -x, y: -y } : { x, y };
})();
const hoehe = (p: V3): number => (p.x - vorn.x) * hochV.x + (p.y - vorn.y) * hochV.y;

// ---------- Teil 1: das Maul als Haut (Gaumen und Boden eingeschweißt) ----------
/** je Punkt der neuen Haut: 0 Körper, 1 Gaumen, 2 Boden, 3 auf der Achse zwischen den Mundwinkeln (Gaumen und Boden treffen sich) */
type Teil = Uint8Array;

/**
 * Das Innere flach: je Lippe die Fläche aus den geraden Strecken von jedem Punkt der Lippe zu seinem Spiegelbild (vorn auf der Mitte
 * ein Punkt, am Mundwinkel die Strecke von Mundwinkel zu Mundwinkel; dort treffen sich Gaumen und Boden). Dieselbe Bauart wie das
 * gewölbte Innere der Anzeige (`maulAmLoop`), ohne die Wölbung in die Kiefer.
 */
function flachesInneres(h: Haut): { positionen: number[]; indizes: number[]; unten: number[]; achse: number[] } {
  const P: number[] = [];
  const I: number[] = [];
  const unten: number[] = [];
  let achse: number[] = [];
  let zMax = 0;
  for (const w of m.lippeOben) zMax = Math.max(zMax, Math.abs(h.pos[3 * w + 2]!));
  const nZ = Math.max(2, 2 * Math.ceil(zMax / (0.6 * mk)));
  for (const [lippe, istUnten] of [
    [m.lippeOben, 0],
    [m.lippeUnten, 1],
  ] as const) {
    // Spalte i: vom Spiegelpunkt (Zeile 0) zum Punkt der Lippe (Zeile nZ); i = 0 ist die Mitte vorn
    const K = (lippe.length + 1) / 2;
    const spalten: number[][] = [];
    for (let i = 0; i < K; i++) {
      const a = lage(h.pos, lippe[K - 1 - i]!);
      const b = lage(h.pos, lippe[K - 1 + i]!);
      const neuP = (q: V3): number => {
        P.push(q.x, q.y, q.z);
        unten.push(istUnten);
        return P.length / 3 - 1;
      };
      if (i === 0) {
        spalten.push(new Array<number>(nZ + 1).fill(neuP(b)));
        continue;
      }
      const sp: number[] = [];
      for (let j = 0; j <= nZ; j++) {
        const t = j / nZ;
        sp.push(neuP({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), z: a.z + t * (b.z - a.z) }));
      }
      spalten.push(sp);
    }
    // die Spalte am Mundwinkel: die Strecke von Mundwinkel zu Mundwinkel (Gaumen und Boden teilen sie sich)
    if (istUnten === 0) achse = spalten[K - 1]!;
    const start = I.length;
    const tri = (a: number, b: number, c: number) => {
      if (a !== b && b !== c && c !== a) I.push(a, b, c);
    };
    for (let i = 0; i + 1 < K; i++) {
      for (let j = 0; j < nZ; j++) {
        tri(spalten[i]![j]!, spalten[i + 1]![j]!, spalten[i + 1]![j + 1]!);
        tri(spalten[i]![j]!, spalten[i + 1]![j + 1]!, spalten[i]![j + 1]!);
      }
    }
    // Umlaufsinn: der Gaumen schaut zum Boden, der Boden zum Gaumen (in die Höhle)
    let summe = 0;
    for (let t = start; t < I.length; t += 3) {
      const [a, b, c] = [lage(P, I[t]!), lage(P, I[t + 1]!), lage(P, I[t + 2]!)];
      const nx = (b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y);
      const ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
      summe += nx * hochV.x + ny * hochV.y;
    }
    if ((istUnten === 0 && summe > 0) || (istUnten === 1 && summe < 0)) {
      for (let t = start; t < I.length; t += 3) {
        const b = I[t + 1]!;
        I[t + 1] = I[t + 2]!;
        I[t + 2] = b;
      }
    }
  }
  return { positionen: P, indizes: I, unten, achse };
}

function maulAlsHaut(h: Haut, flach = false): { haut: Haut; neu: Int32Array; teil: Teil; achse: number[] } {
  const T = h.tri.length / 3;
  const benutzt = new Uint8Array(h.n);
  for (let t = 0; t < T; t++) if (!m.offen[t]) for (let e = 0; e < 3; e++) benutzt[h.tri[3 * t + e]!] = 1;
  const neu = new Int32Array(h.n).fill(-1);
  const pos: number[] = [];
  const teil: number[] = [];
  for (let v = 0; v < h.n; v++) {
    if (!benutzt[v]) continue;
    neu[v] = pos.length / 3;
    pos.push(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!);
    teil.push(0);
  }
  const tri: number[] = [];
  for (let t = 0; t < T; t++) if (!m.offen[t]) tri.push(neu[h.tri[3 * t]!]!, neu[h.tri[3 * t + 1]!]!, neu[h.tri[3 * t + 2]!]!);
  // das Innere: Punkte an den Lippen sind die Punkte der Haut; Gaumen und Boden teilen sich die Punkte zwischen den Mundwinkeln
  const lippe = [...new Set([...m.lippeOben, ...m.lippeUnten])];
  const eigen = flach ? flachesInneres(h) : null;
  const ip: ArrayLike<number> = eigen ? eigen.positionen : m.innen.positionen;
  const innenUnten: ArrayLike<number> = eigen ? eigen.unten : m.innenUnten;
  const nI = ip.length / 3;
  const innenNr = new Int32Array(nI).fill(-1);
  const eigene: number[] = [];
  for (let i = 0; i < nI; i++) {
    const q = lage(ip, i);
    let treffer = -1;
    for (const w of lippe) {
      if (Math.hypot(h.pos[3 * w]! - q.x, h.pos[3 * w + 1]! - q.y, h.pos[3 * w + 2]! - q.z) < 0.01) {
        treffer = neu[w]!;
        break;
      }
    }
    if (treffer < 0) {
      for (const j of eigene) {
        if (Math.hypot(pos[3 * j]! - q.x, pos[3 * j + 1]! - q.y, pos[3 * j + 2]! - q.z) < 0.01) {
          treffer = j;
          break;
        }
      }
      if (treffer >= 0) teil[treffer] = 3;
    }
    if (treffer < 0) {
      treffer = pos.length / 3;
      pos.push(q.x, q.y, q.z);
      teil.push(innenUnten[i] === 1 ? 2 : 1);
      eigene.push(treffer);
    }
    innenNr[i] = treffer;
  }
  const I: ArrayLike<number> = eigen ? eigen.indizes : m.innen.indizes;
  for (let t = 0; t < I.length; t += 3) {
    const a = innenNr[I[t]!]!;
    const b = innenNr[I[t + 1]!]!;
    const c = innenNr[I[t + 2]!]!;
    if (a !== b && b !== c && c !== a) tri.push(a, b, c);
  }
  // spiegelgleich genau (das Innere kommt in einfacher Genauigkeit): je Paar das Mittel, Punkte der Mitte auf z = 0
  let haut = hautAus(pos, tri);
  for (let v = 0; v < haut.n; v++) {
    const w = haut.spiegel[v]!;
    if (w < 0) continue;
    if (w === v) {
      haut.pos[3 * v + 2] = 0;
      continue;
    }
    if (w < v) continue;
    const x = (haut.pos[3 * v]! + haut.pos[3 * w]!) / 2;
    const y = (haut.pos[3 * v + 1]! + haut.pos[3 * w + 1]!) / 2;
    const z = (haut.pos[3 * v + 2]! - haut.pos[3 * w + 2]!) / 2;
    haut.pos.set([x, y, z], 3 * v);
    haut.pos.set([x, y, -z], 3 * w);
  }
  haut = hautAus(haut.pos, haut.tri);
  return { haut, neu, teil: Uint8Array.from(teil), achse: eigen ? eigen.achse.map((i) => innenNr[i]!) : [] };
}

/** Prüfung einer Haut: Kanten, die nicht genau zwei Dreiecke haben oder zweimal gleich herum laufen; Punkte ohne Spiegelbild */
function dicht(h: Haut): { offen: number; verdreht: number; ohneSpiegel: number } {
  const gerichtet = new Map<number, number>();
  const zahl = new Map<number, number>();
  for (let t = 0; t < h.tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = h.tri[t + e]!;
      const b = h.tri[t + ((e + 1) % 3)]!;
      gerichtet.set(a * h.n + b, (gerichtet.get(a * h.n + b) ?? 0) + 1);
      const k = a < b ? a * h.n + b : b * h.n + a;
      zahl.set(k, (zahl.get(k) ?? 0) + 1);
    }
  }
  let ohneSpiegel = 0;
  for (let v = 0; v < h.n; v++) if (h.spiegel[v]! < 0) ohneSpiegel++;
  return { offen: [...zahl.values()].filter((x) => x !== 2).length, verdreht: [...gerichtet.values()].filter((x) => x !== 1).length, ohneSpiegel };
}

/** Dreiecke, die gegenüber den Lagen `vorher` umgeschlagen sind (Normale um mehr als 90° gedreht) */
function umgeschlagen(h: Haut, vorher: ArrayLike<number>): number {
  const nrm = (P: ArrayLike<number>, t: number): [number, number, number] => {
    const [a, b, c] = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
    const ux = P[3 * b]! - P[3 * a]!;
    const uy = P[3 * b + 1]! - P[3 * a + 1]!;
    const uz = P[3 * b + 2]! - P[3 * a + 2]!;
    const vx = P[3 * c]! - P[3 * a]!;
    const vy = P[3 * c + 1]! - P[3 * a + 1]!;
    const vz = P[3 * c + 2]! - P[3 * a + 2]!;
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  };
  let zahl = 0;
  for (let t = 0; t < h.tri.length; t += 3) {
    const p = nrm(h.pos, t);
    const q = nrm(vorher, t);
    if (p[0] * q[0] + p[1] * q[1] + p[2] * q[2] < 0) zahl++;
  }
  return zahl;
}

/**
 * Die Höhle: wie hoch der Gaumen über der Achse des Mauls liegt und wie tief der Boden darunter (größter Wert), und wie viele
 * ihrer Punkte auf der falschen Seite liegen (Gaumen unter der Achse, Boden darüber, um mehr als 1): dort durchdringen sie sich
 */
function hoehle(h: Haut, teil: Teil): { gaumen: number; boden: number; falsch: number; text: string } {
  let gaumen = 0;
  let boden = 0;
  let falsch = 0;
  for (let v = 0; v < h.n; v++) {
    const t = teil[v] ?? 0;
    if (t !== 1 && t !== 2) continue;
    const y = hoehe(lage(h.pos, v));
    if (t === 1) {
      gaumen = Math.max(gaumen, y);
      if (y < -1) falsch++;
    } else {
      boden = Math.max(boden, -y);
      if (y > 1) falsch++;
    }
  }
  return { gaumen, boden, falsch, text: `Gaumen bis ${z1(gaumen)} über der Achse, Boden bis ${z1(boden)} darunter, auf der falschen Seite ${falsch}` };
}

/** Schnitt durch die Mittelebene (Strecken u1, v1, u2, v2 um den Ort `c`) */
function schnittMitte(h: Haut, c: { x: number; y: number }, titel: string, mass: number): BlattSchnitt {
  const strecken: number[] = [];
  for (let t = 0; t < h.tri.length; t += 3) {
    const pkt: [number, number][] = [];
    for (let e = 0; e < 3; e++) {
      const a = lage(h.pos, h.tri[t + e]!);
      const b = lage(h.pos, h.tri[t + ((e + 1) % 3)]!);
      if (Math.abs(a.z) < 1e-9) pkt.push([a.x, a.y]);
      else if (Math.abs(b.z) > 1e-9 && a.z * b.z < 0) {
        const g = a.z / (a.z - b.z);
        pkt.push([a.x + g * (b.x - a.x), a.y + g * (b.y - a.y)]);
      }
    }
    if (pkt.length === 2) strecken.push(pkt[0]![0] - c.x, pkt[0]![1] - c.y, pkt[1]![0] - c.x, pkt[1]![1] - c.y);
  }
  return { titel, strecken, mass, hoch: 0.55 };
}

const zeilen: BlattZeile[] = [];
const bild = (name: string, st: Stand, notiz: string, schnitt = true): BlattBild => {
  const linien: BlattLinie[] = st.loops.flatMap((l) => {
    const p = Array.from(hautLagen(st.h, l));
    const zu = l.art !== 'ring';
    const hart = Math.max(0, ...kanteBei(l, st.loops));
    return l.art === 'mitte' ? [{ p, zu, hart }] : [{ p, zu, hart }, { p: p.map((x, k) => (k % 3 === 2 ? -x : x)), zu, hart }];
  });
  const punkte = st.loops.flatMap((l) => l.punkte.filter(istSichtbar).flatMap((p) => (Math.abs(p.ref.z) < 1e-6 ? [[p.ref.x, p.ref.y, p.ref.z]] : [[p.ref.x, p.ref.y, p.ref.z], [p.ref.x, p.ref.y, -p.ref.z]])));
  return { name, h: st.h, loops: [], notiz, fertig: { linien, punkte }, ...(schnitt ? { schnitt: schnittMitte(st.h, { x: -85, y: -20 }, 'Schnitt durch die Mitte (Maul von der Seite)', 240) } : {}) };
};
const BLICKE = [
  ['Seite', 0, 0, 0.7],
  ['schräg von vorn', 50, 12, 0.7],
] as const;

// die Haut mit Maul, die Loops auf den neuen Nummern
const FLACH = process.env.HOEHLE !== 'gewoelbt';
const A = maulAlsHaut(heute.h, FLACH);
const loopsNeu = kopieLoops(heute.loops).map((l) => ({ ...l, proben: l.proben.map((p) => ({ ecken: p.ecken.map((v) => A.neu[v]!) as [number, number, number], b: p.b })) }));
const fehlend = loopsNeu.reduce((s, l) => s + l.proben.filter((p) => p.ecken.some((v) => v < 0)).length, 0);
const angelegt: Stand = { h: A.haut, loops: loopsNeu };
const d0 = dicht(A.haut);
const innenZahl = A.teil.reduce((s, x) => s + (x ? 1 : 0), 0);
console.log(
  `1. Maul als Haut (Höhle ${FLACH ? 'flach' : 'gewölbt wie in der Anzeige von heute'}): ${A.haut.n} Punkte (${innenZahl} in der Höhle), ${A.haut.tri.length / 3} Dreiecke; offene Kanten ${d0.offen}, verdrehte ${d0.verdreht}, Punkte ohne Spiegelbild ${d0.ohneSpiegel}, ` +
    `Proben ohne Punkt ${fehlend}; ${hoehle(A.haut, A.teil).text}`,
);
let lippeWeit = 0;
{
  const L = hautLagen(A.haut, loopsNeu[maulNr]!);
  const R = heute.loops[maulNr]!.ruhe;
  for (let k = 0; k < L.length; k++) lippeWeit = Math.max(lippeWeit, Math.abs(L[k]! - R[k]!));
}
console.log(`   Lippen neben ihrer Linie: ${z2(lippeWeit)}`);

// ---------- Teil 2: die Höhle in der Rechnung der Grundform ----------
type Fall = { name: string; st: Stand; lauf: Lauf; teil: Teil; aussen: number; text: string };
const faelle: Fall[] = [];
const aussenBewegt = (h: Haut, teil: Teil, vorher: ArrayLike<number>): number => {
  let weit = 0;
  for (let v = 0; v < h.n; v++) {
    if (teil[v]) continue;
    weit = Math.max(weit, Math.hypot(h.pos[3 * v]! - vorher[3 * v]!, h.pos[3 * v + 1]! - vorher[3 * v + 1]!, h.pos[3 * v + 2]! - vorher[3 * v + 2]!));
  }
  return weit;
};
function fall(name: string, st: Stand, teil: Teil, vorher: ArrayLike<number>): Fall {
  const lauf = rechnen(st);
  const ho = hoehle(st.h, teil);
  const aussen = aussenBewegt(st.h, teil, vorher);
  const text = `${lauf.steht ? `steht nach ${lauf.runden} Runden` : `steht nach ${lauf.runden} Runden nicht (letzte ${z2(lauf.letzte)})`}; außen bis ${z2(aussen)} bewegt; ${ho.text}; umgeschlagen ${umgeschlagen(st.h, vorher)}; Vorsicht ${lauf.unruhe.stufen}${lauf.unruhe.fest ? ', steht fest' : ''}`;
  console.log(`   ${name}: ${text}`);
  const f = { name, st, lauf, teil, aussen, text };
  faelle.push(f);
  return f;
}
const kopie = (st: Stand): Stand => ({ h: { ...st.h, pos: Float64Array.from(st.h.pos) }, loops: kopieLoops(st.loops) });

/**
 * Das Netz vergleichmäßigen wie das Fenster nach jedem Zug (zu kurze Kanten zusammenlegen, zu lange teilen): Die Höhle kommt als
 * feines Gitter mit schmalen Dreiecken, darauf misst die Rechnung nach der Geometrie andere Krümmungen als auf dem Körper
 */
function vergleichmaessigen(st0: Stand, teil0: Teil): { st: Stand; teil: Teil } {
  let h = st0.h;
  let loops = st0.loops;
  let teil = teil0;
  for (let g = 0; g < 8; g++) {
    const v = verdichten(h, loops, 1.75 * mk, verdichtenWieImFenster(mk, 0.5));
    if (!v) break;
    const t = new Uint8Array(v.haut.n);
    for (let w = 0; w < v.haut.n; w++) t[w] = v.alt[w]! >= 0 ? teil[v.alt[w]!]! : 255;
    // neue Punkte: wie die meisten ihrer alten Nachbarn
    for (let w = 0; w < v.haut.n; w++) {
      if (t[w] !== 255) continue;
      const zahl = [0, 0, 0, 0];
      for (const x of v.haut.nachbarn[w]!) if (t[x] !== 255) zahl[t[x]!]!++;
      t[w] = zahl.indexOf(Math.max(...zahl));
    }
    teil = t;
    h = v.haut;
    loops = v.loops;
    if (v.gelegt === 0 && v.neu === 0) break;
  }
  return { st: { h, loops }, teil };
}

/**
 * Eine Linie schneiden und ins Netz einsetzen (wie das Werkzeug L): Kreuzungen mit den anderen Loops werden Punkte; wo sie eine
 * Kante kreuzt (die Lippen), darf sie knicken. `hinten`: dazu ein Punkt mit Ecke, wo Gaumen und Boden sich hinten treffen.
 */
function mitLinie(st0: Stand, teil0: Teil, a: 'top' | 'seite', P: [number, number], Q: [number, number], hinten = false): { st: Stand; teil: Teil; nr: number } | null {
  const st = kopie(st0);
  const id = Math.max(...st.loops.map((l) => l.id)) + 1;
  const l = loopAusSchnitt(st.h, a, P, Q, id, 8);
  if (!l) {
    console.log(`      (kein Schnitt: ${a} ${P} → ${Q})`);
    return null;
  }
  st.loops.push(l);
  const nAlt = st.h.n;
  const r = loopEinsetzen(st.h, st.loops, st.loops.length - 1);
  if (!r) {
    const e0 = lage(l.ruhe, 0);
    const e1 = lage(l.ruhe, l.proben.length - 1);
    console.log(`      (geschnitten: ${l.art}, ${l.proben.length} Proben von (${z1(e0.x)}, ${z1(e0.y)}, ${z1(e0.z)}) bis (${z1(e1.x)}, ${z1(e1.y)}, ${z1(e1.z)}), Länge ${z1(l.laenge)}; lässt sich nicht einsetzen)`);
    return null;
  }
  st.h = r.haut;
  st.loops = r.loops;
  const teil = new Uint8Array(st.h.n);
  teil.set(teil0);
  for (let v = nAlt; v < st.h.n; v++) {
    const zahl = [0, 0, 0, 0];
    for (const w of st.h.nachbarn[v]!) if (w < nAlt) zahl[teil0[w]!]!++;
    teil[v] = zahl.indexOf(Math.max(...zahl));
  }
  const tol = 0.25 * mittlereKante(st.h);
  const nr = st.loops.length - 1;
  let k = Math.max(0, ...st.loops.flatMap((x) => x.punkte.map((p) => p.kreuzung ?? 0))) + 1;
  for (let i = 0; i < nr; i++)
    for (const f of kreuzungenZwischen(st.loops[i]!, st.loops[i]!.ruhe, st.loops[nr]!, st.loops[nr]!.ruhe, tol)) {
      punktEinfuegen(st.loops[i]!, f.sa, k, hatPfad(st.loops[i]!));
      punktEinfuegen(st.loops[nr]!, f.sb, k);
      k++;
    }
  eckenAuto(st.loops);
  if (hinten) {
    const ml = st.loops[nr]!;
    let wo = -1;
    let weit = -Infinity;
    ml.proben.forEach((p, j) => {
      if (!teil[p.ecken[0]]) return;
      const q = lage(st.h.pos, p.ecken[0]);
      const d = Math.hypot(q.x - vorn.x, q.y - vorn.y);
      if (d > weit) {
        weit = d;
        wo = j;
      }
    });
    if (wo >= 0) punktEinfuegen(ml, ml.s[wo]!).ecke = true;
  }
  return { st, teil, nr };
}
const mitMittellinie = (st0: Stand, teil0: Teil) => mitLinie(st0, teil0, 'top', [-400, 0], [400, 0], true);
/** Höhe der Achse des Mauls (in der Seite) an der Stelle x */
const achseY = (x: number): number => G.y + ((x - G.x) * (vorn.y - G.y)) / (vorn.x - G.x);
const linieText = (st: Stand, teil: Teil, nr: number): string => {
  const l = st.loops[nr]!;
  return `${l.art}, ${l.proben.length} Proben, davon ${l.proben.filter((p) => teil[p.ecken[0]]).length} in der Höhle, ${l.punkte.length} Punkte (${l.punkte.filter((p) => p.ecke ?? p.autoEcke).length} Ecken)`;
};

console.log('2. Die Höhle in der Rechnung der Grundform');
((): Fall => {
  const st = kopie(angelegt);
  st.loops[maulNr]!.kante = true;
  return fall('wie angelegt (feines Gitter), Lippen als Kante', st, A.teil, angelegt.h.pos);
})();
const V = vergleichmaessigen(angelegt, A.teil);
const dV = dicht(V.st.h);
const innenV = V.teil.reduce((s, x) => s + (x ? 1 : 0), 0);
console.log(`   Netz vergleichmäßigt: ${V.st.h.n} Punkte (${innenV} in der Höhle); offene Kanten ${dV.offen}, verdrehte ${dV.verdreht}, ohne Spiegelbild ${dV.ohneSpiegel}; ${hoehle(V.st.h, V.teil).text}`);
const vorV = Float64Array.from(V.st.h.pos);
const glatt = fall('vergleichmäßigt, Lippen glatt', kopie(V.st), V.teil, vorV);
const kantig = ((): Fall => {
  const st = kopie(V.st);
  st.loops[maulNr]!.kante = true;
  return fall('vergleichmäßigt, Lippen als Kante', st, V.teil, vorV);
})();
let mitte: Fall | null = null;
{
  const st0 = kopie(V.st);
  st0.loops[maulNr]!.kante = true;
  const mitM = mitMittellinie(st0, V.teil);
  if (!mitM) console.log('   Mittellinie durch die Höhle: lässt sich nicht schneiden oder einsetzen');
  else {
    const vorher = Float64Array.from(mitM.st.h.pos);
    const ml = mitM.st.loops[mitM.nr]!;
    const inHoehle = ml.proben.filter((p) => mitM.teil[p.ecken[0]]).length;
    console.log(`   Mittellinie: ${ml.proben.length} Proben, davon ${inHoehle} in der Höhle, ${ml.punkte.length} Punkte (${ml.punkte.filter((p) => p.ecke ?? p.autoEcke).length} Ecken); Netz ${mitM.st.h.n} Punkte; ${JSON.stringify(dicht(mitM.st.h))}`);
    mitte = fall('vergleichmäßigt, Lippen als Kante, Mittellinie durch die Höhle', mitM.st, mitM.teil, vorher);
  }
}

// Florians Beschreibung (13.11.): „Im Grunde machst du ja nur die Kante hart und verbindest von der Seite die gegenüberliegenden
// Seiten.“ Das ist die flache Höhle. Dazu hier: Die Verbindung hinten, von Mundwinkel zu Mundwinkel, ist selbst eine harte Linie
// (im Linienmodell gibt es sie noch nicht: Sie läuft nicht von Mitte zu Mitte; zur Probe als Ring von der Mitte hinten über den
// Mundwinkel und die Unterlippe zur Mitte vorn, sie liegt also auf der Unterlippe doppelt).
let gehalten: Fall | null = null;
let gehaltenTeil: Teil | null = null;
/** der Stand vor der Rechnung (vergleichmäßigt, mit allen Linien), für die Diagnose */
let gehaltenStart: { st: Stand; teil: Teil } | null = null;
if (FLACH && A.achse.length) {
  const st0 = kopie(angelegt);
  st0.loops[maulNr]!.kante = true;
  const nZ = A.achse.length - 1;
  const KU = (m.lippeUnten.length + 1) / 2;
  const kette = [...A.achse.slice(nZ / 2)];
  for (let i = 2 * KU - 3; i >= KU - 1; i--) kette.push(A.neu[m.lippeUnten[i]!]!);
  const pk = kette.map((w) => lage(st0.h.pos, w));
  pk[0]!.z = 0;
  pk[pk.length - 1]!.z = 0;
  const sK = new Float64Array(kette.length);
  for (let i = 1; i < kette.length; i++) sK[i] = sK[i - 1]! + Math.hypot(pk[i]!.x - pk[i - 1]!.x, pk[i]!.y - pk[i - 1]!.y, pk[i]!.z - pk[i - 1]!.z);
  const hinten: Loop = {
    id: Math.max(...st0.loops.map((l) => l.id)) + 1,
    art: 'ring',
    proben: kette.map((w) => ({ ecken: [w, w, w] as [number, number, number], b: [1, 0, 0] as [number, number, number] })),
    s: sK,
    laenge: sK[kette.length - 1]!,
    ruhe: Float64Array.from(pk.flatMap((q) => [q.x, q.y, q.z])),
    punkte: [],
    kante: true,
  };
  const zusammen = new Set(kette).size === kette.length && kette.every((w, i) => i === 0 || st0.h.nachbarn[kette[i - 1]!]!.includes(w));
  console.log(`   Linie hinten von Mundwinkel zu Mundwinkel: ${nZ / 2 + 1} Punkte bis zum Mundwinkel, als Ring mit der Unterlippe ${kette.length} Punkte, Kette über Kanten des Netzes: ${zusammen ? 'ja' : 'NEIN'}`);
  st0.loops.push(hinten);
  // einmal auf dem feinen Gitter, einmal auf dem vergleichmäßigten Netz (die Linien bleiben dabei Ketten des Netzes)
  for (const fein of [true, false]) {
    let stA: Stand = kopie(st0);
    let teilA: Teil = A.teil;
    if (!fein) {
      try {
        const Vg = vergleichmaessigen(stA, teilA);
        stA = Vg.st;
        teilA = Vg.teil;
        console.log(`   vergleichmäßigt mit der Linie hinten: ${stA.h.n} Punkte; ${JSON.stringify(dicht(stA.h))}`);
      } catch (e) {
        console.log(`   vergleichmäßigen mit der Linie hinten scheitert: ${String(e).slice(0, 160)}`);
        continue;
      }
    }
    const mitM = mitMittellinie(stA, teilA);
    if (!mitM) {
      console.log('   Mittellinie: lässt sich nicht schneiden oder einsetzen');
      continue;
    }
    console.log(`   Mittellinie: ${linieText(mitM.st, mitM.teil, mitM.nr)}; Netz ${mitM.st.h.n} Punkte; ${JSON.stringify(dicht(mitM.st.h))}`);
    if (!fein) gehaltenStart = { st: kopie(mitM.st), teil: mitM.teil };
    const f = fall(`Florians Beschreibung (${fein ? 'feines Gitter' : 'vergleichmäßigt'}): Lippen hart, Seiten verbunden, Verbindung hinten als harte Linie, Mittellinie`, mitM.st, mitM.teil, Float64Array.from(mitM.st.h.pos));
    if (!gehalten || (f.lauf.steht && !f.lauf.unruhe.fest)) {
      gehalten = f;
      gehaltenTeil = mitM.teil;
    }
  }
}
void gehaltenTeil;

// dazu je ein Loop um den Unterkiefer und um den Oberkiefer (Schnitt in der Seite quer durch das Maul, auf halber Länge)
let kiefer: Fall | null = null;
{
  let st: Stand = kopie(V.st);
  st.loops[maulNr]!.kante = true;
  let teil: Teil = V.teil;
  const xm = (G.x + vorn.x) / 2;
  const schritte: [string, 'top' | 'seite', [number, number], [number, number], boolean][] = [
    ['Mittellinie', 'top', [-400, 0], [400, 0], true],
    ['Loop um den Unterkiefer', 'seite', [xm, achseY(xm) - 400], [xm, achseY(xm)], false],
    ['Loop um den Oberkiefer', 'seite', [xm, achseY(xm)], [xm, achseY(xm) + 400], false],
  ];
  let gut = true;
  for (const [name, a, P, Q, hinten] of schritte) {
    // (ein Schnitt in der Seite, der sich so nicht einsetzen lässt: ein Stück daneben noch einmal)
    let r: ReturnType<typeof mitLinie> = null;
    for (const dx of a === 'seite' ? [0, 3, -3, 7, -7, 12, -12, 18, -18] : [0]) {
      r = mitLinie(st, teil, a, [P[0] + dx, P[1]], [Q[0] + dx, Q[1]], hinten);
      if (r) {
        if (dx) console.log(`      (eingesetzt bei x = ${z1(P[0] + dx)})`);
        break;
      }
    }
    if (!r) {
      console.log(`   ${name}: lässt sich nicht schneiden oder einsetzen`);
      gut = false;
      break;
    }
    st = r.st;
    teil = r.teil;
    console.log(`   ${name}: ${linieText(st, teil, r.nr)}; Netz ${st.h.n} Punkte; ${JSON.stringify(dicht(st.h))}`);
  }
  if (gut) {
    kiefer = fall('vergleichmäßigt, Lippen als Kante, Mittellinie und je ein Loop um Ober- und Unterkiefer', st, teil, Float64Array.from(st.h.pos));
  }
}

// der Loop um den Unterkiefer, wie der Schnitt ihn gibt (außen ums Kinn, innen über den Boden); gezeigt auf dem angelegten Maul
const kieferBild = ((): BlattBild | null => {
  const xm = (G.x + vorn.x) / 2;
  const l = loopAusSchnitt(V.st.h, 'seite', [xm, achseY(xm) - 400], [xm, achseY(xm)], 99, 8);
  if (!l) return null;
  const b = bild('Loop um den Unterkiefer (geschnitten)', V.st, `Der Schnitt gibt einen Ring außen ums Kinn und innen über den Boden (${l.proben.length} Stellen, Länge ${z1(l.laenge)}). Ins Netz einsetzen lässt er sich im Kern noch nicht.`, false);
  const p = Array.from(l.ruhe);
  b.fertig!.linien.push({ p, zu: false, hart: 1 }, { p: p.map((x, k) => (k % 3 === 2 ? -x : x)), zu: false, hart: 1 });
  return b;
})();

zeilen.push({
  titel: '1. Das Maul als Haut: Gaumen und Boden eingeschweißt, und was die Rechnung der Grundform daraus macht',
  bilder: [
    bild('angelegt und vergleichmäßigt (vor der Rechnung)', V.st, `${V.st.h.n} Punkte, ${innenV} in der Höhle; offene Kanten ${dV.offen}; ${hoehle(V.st.h, V.teil).text}`),
    bild('gerechnet: Lippen glatt', glatt.st, glatt.text),
    bild('gerechnet: Lippen als Kante', kantig.st, kantig.text),
    ...(mitte ? [bild('gerechnet: Lippen als Kante, Mittellinie durch die Höhle', (mitte as Fall).st, (mitte as Fall).text)] : []),
    ...(kiefer ? [bild('gerechnet: dazu je ein Loop um Ober- und Unterkiefer', (kiefer as Fall).st, (kiefer as Fall).text)] : []),
    ...(gehalten ? [bild('gerechnet: Lippen hart, Verbindung hinten als harte Linie, Mittellinie', (gehalten as Fall).st, (gehalten as Fall).text)] : []),
    ...(kieferBild ? [kieferBild] : []),
  ],
  blicke: BLICKE,
  mass: 430,
  mitte: [0, 0, 0],
});

// Diagnose (DIAG=1): wo beginnt die Unruhe? Runde für Runde die Punkte, die sich am weitesten bewegen
if (process.env.DIAG === '1') {
  const st0 = kopie(V.st);
  st0.loops[maulNr]!.kante = true;
  const gs = gehaltenStart as { st: Stand; teil: Teil } | null;
  const mm = process.env.DIAG_FALL === 'hinten' && gs ? { st: kopie(gs.st), teil: gs.teil } : process.env.DIAG_MITTE === '0' ? { st: st0, teil: V.teil } : mitMittellinie(st0, V.teil)!;
  const st = mm.st;
  const teil = mm.teil;
  const hart = new Uint8Array(st.h.n);
  for (const l of st.loops) for (const pr of l.proben) hart[pr.ecken[0]] = 1;
  const z = new LoopZug(st.h, st.loops, null, true, 'kurven', 'geometrie', { halb: process.env.DIAG_HALB !== '0' });
  const ziel = st.loops.map((l) => pfadLagen(l) ?? Float64Array.from(l.ruhe));
  const versch = st.loops.map((l, i) => Float64Array.from(ziel[i]!, (x, k) => x - l.ruhe[k]!));
  const namen = ['Körper', 'Gaumen', 'Boden', 'Achse'];
  for (let r = 1; r <= Number(process.env.DIAG_RUNDEN ?? 4); r++) {
    const vor = Float64Array.from(st.h.pos);
    z.schritt(versch, 1);
    const weg = Array.from({ length: st.h.n }, (_, v) => ({ v, d: Math.hypot(st.h.pos[3 * v]! - vor[3 * v]!, st.h.pos[3 * v + 1]! - vor[3 * v + 1]!, st.h.pos[3 * v + 2]! - vor[3 * v + 2]!) })).sort((a, b) => b.d - a.d);
    const je = [0, 0, 0, 0];
    for (const w of weg) je[teil[w.v]!] = Math.max(je[teil[w.v]!]!, w.d);
    console.log(`Runde ${r}: größte Bewegung je Teil: ${namen.map((n, i) => `${n} ${z2(je[i]!)}`).join(', ')}; Vorsicht ${z.unruhe.stufen}`);
    for (const w of weg.slice(0, 6)) {
      const q = lage(vor, w.v);
      const nb = st.h.nachbarn[w.v]!;
      console.log(`     Punkt ${w.v} (${namen[teil[w.v]!]}${hart[w.v] ? ', auf einer Linie' : ''}): ${z1(w.d)} weit; lag bei (${z1(q.x)}, ${z1(q.y)}, ${z1(q.z)}), Höhe über der Achse ${z1(hoehe(q))}, vom Mundwinkel ${z1(Math.hypot(q.x - G.x, q.y - G.y))}; ${nb.length} Nachbarn, davon auf Linien ${nb.filter((x) => hart[x]).length}`);
    }
  }
}

if (AUS) {
  blattSchreiben(
    AUS,
    'Schritt 6, kleiner Beweis: das Maul als eigene Geometrie (13.11.2026)',
    zeilen,
    1560,
    'Blaue Linien: Loops, schwarz: Kante an. Rot: eine Fläche, deren Rückseite man sieht. Flach schattiert, damit jeder Knick zu sehen ist. Unter jedem Bild der Schnitt durch die Mitte.',
  );
  console.log(`Bildblatt: ${AUS}`);
}
