// Naht zwischen zwei Objekten (Plan „Objekte, Spiegel und Nähte“, Etappe 4, 18.11.2026): verschmelzen und abziehen.
// Florian: „Wenn ich objekte verschmelzen möchte, dann sollte das über einen edgeloop passieren … Ich möchte auch objekte
// voneinander subtrahieren können, sodass eine saubere kante entsteht.“
//
// Zwei Häute werden an ihrer Schnittkurve zu einer verbunden. Den Schnitt der Netze rechnet die Bibliothek Manifold (`manifold-3d`,
// Apache 2.0); hier wird daraus wieder eine Form des Kerns:
// - Punkte, die es schon gab, behalten ihre genaue Lage; neu sind nur die Punkte auf der Schnittkurve.
// - Die Naht ist ein Loop wie jeder andere, mit Kante an (K macht sie weich; Florian, 18.11.: „Wie Seifenblasen“).
// - Eine Linie, die in die andere Form hineinläuft, wird genau an der Naht geschnitten (ihr Pfad geteilt, das Stück draußen bleibt
//   dieselbe Kurve) und hängt dort wie eine Abzweigung; die Naht hat an dieser Stelle einen Punkt.
// - Ist die Form gespiegelt, wird die Hälfte z ≥ 0 verbunden und gespiegelt: So bleiben die Spiegelpaare genau (das Ergebnis der
//   Bibliothek ist es von selbst nicht).
// Beweis und Zahlen: `scripts/pruefen/form-naht.ts`, Plan Abschnitt 5 und 10.
import {
  type Haut,
  type Loop,
  type LoopPunkt,
  type V3,
  eckenAuto,
  griffeAnlegen,
  hatPfad,
  hautAus,
  hautFrei,
  mittlereKante,
  pfadParameter,
  punktEinfuegen,
  spiegelAnwenden,
  stueckNaechstes,
  stueckTeilen,
} from '@ee/shape/dicht';
import Module from 'manifold-3d';

export type NahtArt = 'vereinen' | 'abziehen';
/** eine Form, die verbunden wird: ihre Haut (gespiegelt oder frei), ihre Linien, und ob eine freie ihr Spiegelbild zeigt */
export type NahtTeil = { haut: Haut; loops: readonly Loop[]; spiegelbild: boolean };
export type NahtErgebnis = {
  haut: Haut;
  loops: Loop[];
  /** je Punkt der neuen Haut seine Nummer in der Haut von A (−1: neu, oder aus B) */
  alt: Int32Array;
  /** die Kennungen der Nähte */
  naehte: number[];
  naechsteId: number;
  naechsteKreuzung: number;
  /** so viele Linien wurden an der Naht geschnitten, so viele fielen ganz weg, an so vielen Punkten der Nähte enden Linien */
  geschnitten: number;
  weg: number;
  enden: number;
  /** so weit lag ein neues Ende einer Linie (auf ihrem Pfad) höchstens neben seinem Punkt der Naht */
  neben: number;
  /** A war gespiegelt und ist für dieses Verbinden frei geworden (das andere Objekt hat kein Spiegelbild) */
  aFrei: boolean;
  ms: number;
};

type Wasm = Awaited<ReturnType<typeof Module>>;
let geladen: Promise<Wasm> | null = null;
/** die Bibliothek laden (einmal; im Fenster kommt ihre WASM-Datei über Vite) */
export function manifoldLaden(): Promise<Wasm> {
  geladen ??= (async () => {
    const imFenster = typeof window !== 'undefined' && typeof document !== 'undefined';
    const ort = imFenster ? (await import('manifold-3d/manifold.wasm?url')).default : null;
    const w = await Module(ort ? { locateFile: () => ort } : undefined);
    w.setup();
    return w;
  })();
  return geladen;
}

const lage = (h: Haut, v: number): V3 => ({ x: h.pos[3 * v]!, y: h.pos[3 * v + 1]!, z: h.pos[3 * v + 2]! });
const punktProbe = (w: number): Loop['proben'][number] => ({ ecken: [w, w, w], b: [1, 0, 0] });
const istPunktProbe = (p: Loop['proben'][number]): boolean => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2];
const kopiePunkt = (p: LoopPunkt): LoopPunkt => {
  const q: LoopPunkt = { ...p, ref: { ...p.ref }, cur: { ...p.cur } };
  if (p.ein) q.ein = { ...p.ein };
  if (p.aus) q.aus = { ...p.aus };
  return q;
};
const f32 = new Float32Array(3);
/** Schlüssel einer Lage, wie die Bibliothek sie hält (einfache Genauigkeit) */
const schluessel = (x: number, y: number, z: number): string => {
  f32[0] = x;
  f32[1] = y;
  f32[2] = z;
  return `${f32[0]},${f32[1]},${f32[2]}`;
};

/** eine freie Haut an der Ebene z = 0 gespiegelt (die Dreiecke bleiben nach außen gewendet) */
function hautGespiegelt(h: Haut): Haut {
  const pos = Float64Array.from(h.pos);
  for (let v = 0; v < h.n; v++) pos[3 * v + 2] = -pos[3 * v + 2]!;
  const tri = Uint32Array.from(h.tri);
  for (let t = 0; t < tri.length; t += 3) {
    const b = tri[t + 1]!;
    tri[t + 1] = tri[t + 2]!;
    tri[t + 2] = b;
  }
  return { ...h, pos, tri };
}
function loopGespiegelt(l: Loop): Loop {
  const sp = (v: V3): V3 => ({ x: v.x, y: v.y, z: -v.z });
  const ruhe = Float64Array.from(l.ruhe);
  for (let j = 2; j < ruhe.length; j += 3) ruhe[j] = -ruhe[j]!;
  return {
    ...l,
    ruhe,
    punkte: l.punkte.map((p) => {
      const q: LoopPunkt = { ...p, ref: sp(p.ref), cur: sp(p.cur) };
      if (p.ein) q.ein = sp(p.ein);
      if (p.aus) q.aus = sp(p.aus);
      return q;
    }),
  };
}

/**
 * Eine Haut gleichmäßig skaliert und verschoben (ein Objekt im Maß eines anderen: Jedes Objekt rechnet in seiner eigenen Größe), und
 * ihre Linien dazu (Lagen, Griffe, Stellen längs der Linie).
 */
export function hautImMass(h: Haut, k: number, d: V3): Haut {
  const pos = Float64Array.from(h.pos);
  for (let v = 0; v < h.n; v++) {
    pos[3 * v] = pos[3 * v]! * k + d.x;
    pos[3 * v + 1] = pos[3 * v + 1]! * k + d.y;
    pos[3 * v + 2] = pos[3 * v + 2]! * k + d.z;
  }
  return { ...h, pos };
}
export function loopImMass(l: Loop, k: number, d: V3): Loop {
  const ort = (p: V3): V3 => ({ x: p.x * k + d.x, y: p.y * k + d.y, z: p.z * k + d.z });
  const griff = (g: V3): V3 => ({ x: g.x * k, y: g.y * k, z: g.z * k });
  const ruhe = Float64Array.from(l.ruhe);
  for (let j = 0; j < ruhe.length; j += 3) {
    ruhe[j] = ruhe[j]! * k + d.x;
    ruhe[j + 1] = ruhe[j + 1]! * k + d.y;
    ruhe[j + 2] = ruhe[j + 2]! * k + d.z;
  }
  return {
    ...l,
    s: Float64Array.from(l.s, (x) => x * k),
    laenge: l.laenge * k,
    ruhe,
    punkte: l.punkte.map((p) => {
      const q: LoopPunkt = { ...p, s: p.s * k, ref: ort(p.ref), cur: ort(p.cur) };
      if (p.ein) q.ein = griff(p.ein);
      if (p.aus) q.aus = griff(p.aus);
      return q;
    }),
  };
}

/** ein Loop aus einer Kette von Punkten des Netzes: geschlossen (Art `paar`) oder offen (Art `ring`) */
function loopAusKette(h: Haut, id: number, kette: readonly number[], zu: boolean): Loop {
  const n = kette.length;
  const s = new Float64Array(n);
  const ruhe = new Float64Array(3 * n);
  kette.forEach((v, j) => ruhe.set(h.pos.subarray(3 * v, 3 * v + 3), 3 * j));
  for (let j = 1; j < n; j++) s[j] = s[j - 1]! + Math.hypot(ruhe[3 * j]! - ruhe[3 * j - 3]!, ruhe[3 * j + 1]! - ruhe[3 * j - 2]!, ruhe[3 * j + 2]! - ruhe[3 * j - 1]!);
  const schluss = zu ? Math.hypot(ruhe[0]! - ruhe[3 * n - 3]!, ruhe[1]! - ruhe[3 * n - 2]!, ruhe[2]! - ruhe[3 * n - 1]!) : 0;
  return { id, art: zu ? 'paar' : 'ring', proben: kette.map(punktProbe), s, laenge: s[n - 1]! + schluss, ruhe, punkte: [] };
}

/**
 * Punkte für eine Naht, an der keine Linie endet. Florian: „dieser hilfs-edgeloop soll bedienbar sein und möglichst rund“: Ohne Punkt
 * wäre sie nicht zu greifen (und hätte keinen Pfad). Eine geschlossene Naht bekommt vier in gleichen Abständen (wie ein Kreis mit
 * vier Punkten), der erste am Punkt, der am weitesten von ihrer Mitte liegt; eine offene (von der Spiegelebene zur Spiegelebene)
 * einen in ihrer Mitte, zu ihren zwei Enden. Hat sie schon Punkte von Linien, bleibt es bei denen.
 */
function nahtPunkte(naht: Loop, h: Haut, kette: readonly number[], zu: boolean): void {
  const n = kette.length;
  const bei = (s: number): number => {
    let best = 0;
    for (let j = 1; j < n; j++) if (Math.abs(naht.s[j]! - s) < Math.abs(naht.s[best]! - s)) best = j;
    return best;
  };
  const setzen = (j: number): void => {
    if (naht.punkte.some((q) => Math.abs(q.s - naht.s[j]!) < 1e-9)) return;
    const p = punktEinfuegen(naht, naht.s[j]!);
    p.ref = lage(h, kette[j]!);
    p.cur = lage(h, kette[j]!);
  };
  if (!zu) {
    if (!naht.punkte.some((q) => q.s > 1e-6 && q.s < naht.laenge - 1e-6)) setzen(bei(naht.laenge / 2));
    return;
  }
  if (naht.punkte.length >= 2) return;
  let s0 = naht.punkte[0]?.s;
  if (s0 === undefined) {
    const m = { x: 0, y: 0, z: 0 };
    for (const v of kette) {
      m.x += h.pos[3 * v]! / n;
      m.y += h.pos[3 * v + 1]! / n;
      m.z += h.pos[3 * v + 2]! / n;
    }
    let weit = -1;
    let j0 = 0;
    kette.forEach((v, j) => {
      const d = Math.hypot(h.pos[3 * v]! - m.x, h.pos[3 * v + 1]! - m.y, h.pos[3 * v + 2]! - m.z);
      if (d > weit + 1e-9) {
        weit = d;
        j0 = j;
      }
    });
    s0 = naht.s[j0]!;
  }
  for (let q = 0; q < 4; q++) setzen(bei((s0 + (q * naht.laenge) / 4) % naht.laenge));
}

type Schnitt = {
  haut: Haut;
  neuVonA: Int32Array;
  neuVonB: Int32Array;
  alt: Int32Array;
  /** die Nähte: Ketten von Punkten der neuen Haut; `zu`: geschlossen (offen: Die Kette endet beidseits auf der Spiegelebene) */
  naehte: { kette: number[]; zu: boolean }[];
};

/**
 * Der Schnitt zweier geschlossener Netze als Haut des Kerns. `halb`: Beide gehören zu einer gespiegelten Form; behalten wird die
 * Hälfte z ≥ 0 des Ergebnisses und gespiegelt (A ist dann ganz und spiegelgleich, B ganz und spiegelgleich oder ein Teil auf der
 * Seite z ≥ 0).
 */
async function schneiden(a: Haut, b: Haut, art: NahtArt, halb: boolean): Promise<Schnitt | { fehler: string }> {
  const { Manifold, Mesh } = await manifoldLaden();
  const idA = Manifold.reserveIDs(2);
  const idB = idA + 1;
  const netz = (h: Haut, id: number): InstanceType<typeof Mesh> =>
    new Mesh({
      numProp: 3,
      vertProperties: Float32Array.from(h.pos),
      triVerts: Uint32Array.from(h.tri),
      runOriginalID: Uint32Array.of(id),
      // jedes Dreieck sein eigenes Feld: So legt die Bibliothek keine Dreiecke zusammen (die Kanten des Netzes tragen die Linien)
      faceID: Uint32Array.from({ length: h.tri.length / 3 }, (_, t) => t),
    });
  const mA = new Manifold(netz(a, idA));
  const mB = new Manifold(netz(b, idB));
  const frei = (): void => {
    mA.delete();
    mB.delete();
  };
  if (mA.status() !== 'NoError' || mB.status() !== 'NoError') {
    const text = `ein Netz ist nicht geschlossen (${mA.status()}, ${mB.status()})`;
    frei();
    return { fehler: text };
  }
  if (!(mA.volume() > 0) || !(mB.volume() > 0)) {
    frei();
    return { fehler: 'ein Netz ist nach innen gewendet' };
  }
  const mU = art === 'vereinen' ? Manifold.union(mA, mB) : mA.subtract(mB);
  const ende = <T>(x: T): T => {
    frei();
    mU.delete();
    return x;
  };
  if (mU.status() !== 'NoError' || mU.isEmpty()) return ende({ fehler: 'der Schnitt gab kein Netz' });
  const M = mU.getMesh();
  const nV = M.vertProperties.length / M.numProp;
  const nT = M.triVerts.length / 3;
  if (M.mergeFromVert.length) return ende({ fehler: 'das Ergebnis hat doppelte Punkte' });
  const X = (v: number): number => M.vertProperties[3 * v]!;
  const Y = (v: number): number => M.vertProperties[3 * v + 1]!;
  const Z = (v: number): number => M.vertProperties[3 * v + 2]!;
  // je Dreieck: aus welchem Netz; behalten wird alles, auf der Hälfte nur die Seite z ≥ 0
  const quelle = new Int8Array(nT);
  for (let r = 0; r < M.runOriginalID.length; r++) {
    const q = M.runOriginalID[r] === idA ? 0 : 1;
    for (let i = M.runIndex[r]!; i < M.runIndex[r + 1]!; i += 3) quelle[i / 3] = q;
  }
  const EBEN = 1e-6;
  const behalten = new Uint8Array(nT).fill(1);
  if (halb)
    for (let t = 0; t < nT; t++) {
      const [p, q, r] = [M.triVerts[3 * t]!, M.triVerts[3 * t + 1]!, M.triVerts[3 * t + 2]!];
      const zm = (Z(p) + Z(q) + Z(r)) / 3;
      behalten[t] = zm > 0 ? 1 : 0;
      if (behalten[t] && Math.min(Z(p), Z(q), Z(r)) < -EBEN) return ende({ fehler: 'ein Dreieck des Ergebnisses kreuzt die Spiegelebene' });
    }
  // die Punkte der behaltenen Dreiecke, und von welchen Netzen ihre Dreiecke stammen
  const von = new Uint8Array(nV);
  for (let t = 0; t < nT; t++) {
    if (!behalten[t]) continue;
    for (let k = 0; k < 3; k++) {
      const v = M.triVerts[3 * t + k]!;
      von[v] = von[v]! | (1 << quelle[t]!);
    }
  }
  const nr = new Int32Array(nV).fill(-1);
  let n1 = 0;
  for (let v = 0; v < nV; v++) if (von[v]) nr[v] = n1++;
  // alte Punkte wiederfinden (ihre Lage ist unverändert)
  const karte = (h: Haut): Map<string, number> => {
    const m = new Map<string, number>();
    for (let v = 0; v < h.n; v++) m.set(schluessel(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!), v);
    return m;
  };
  const kA = karte(a);
  const kB = karte(b);
  const neuVonA = new Int32Array(a.n).fill(-1);
  const neuVonB = new Int32Array(b.n).fill(-1);
  const pos1: number[] = new Array<number>(3 * n1);
  const alt1 = new Int32Array(n1).fill(-1);
  /** je behaltener Punkt: liegt er auf der Spiegelebene (nur auf der Hälfte) */
  const aufEbene = new Uint8Array(n1);
  for (let v = 0; v < nV; v++) {
    const i = nr[v]!;
    if (i < 0) continue;
    let p: [number, number, number] = [X(v), Y(v), Z(v)];
    const s = `${p[0]},${p[1]},${p[2]}`;
    const iA = von[v]! & 1 ? kA.get(s) : undefined;
    const iB = von[v]! & 2 ? kB.get(s) : undefined;
    if (iA !== undefined) {
      neuVonA[iA] = i;
      alt1[i] = iA;
      p = [a.pos[3 * iA]!, a.pos[3 * iA + 1]!, a.pos[3 * iA + 2]!];
    } else if (iB !== undefined) {
      neuVonB[iB] = i;
      p = [b.pos[3 * iB]!, b.pos[3 * iB + 1]!, b.pos[3 * iB + 2]!];
    }
    if (halb && Math.abs(p[2]) < EBEN) {
      p[2] = 0;
      aufEbene[i] = 1;
    }
    pos1[3 * i] = p[0];
    pos1[3 * i + 1] = p[1];
    pos1[3 * i + 2] = p[2];
  }
  const tri1: number[] = [];
  const triQuelle: number[] = [];
  for (let t = 0; t < nT; t++) {
    if (!behalten[t]) continue;
    tri1.push(nr[M.triVerts[3 * t]!]!, nr[M.triVerts[3 * t + 1]!]!, nr[M.triVerts[3 * t + 2]!]!);
    triQuelle.push(quelle[t]!);
  }
  ende(null);
  // Kanten der behaltenen Dreiecke: die Naht (zwischen A und B), auf der Hälfte dazu der Rand (er muss auf der Spiegelebene liegen)
  const T1 = tri1.length / 3;
  const kanteTri = new Map<number, number[]>();
  for (let t = 0; t < T1; t++)
    for (let k = 0; k < 3; k++) {
      const u = tri1[3 * t + k]!;
      const w = tri1[3 * t + ((k + 1) % 3)]!;
      const key = Math.min(u, w) * n1 + Math.max(u, w);
      const l = kanteTri.get(key);
      if (l) l.push(t);
      else kanteTri.set(key, [t]);
    }
  const nahtNachbarn = new Map<number, number[]>();
  for (const [key, ts] of kanteTri) {
    const u = Math.floor(key / n1);
    const w = key % n1;
    if (ts.length === 1) {
      if (!halb || !aufEbene[u] || !aufEbene[w]) return { fehler: halb ? 'der Rand der Hälfte liegt nicht auf der Spiegelebene' : 'das Ergebnis ist nicht geschlossen' };
      continue;
    }
    if (ts.length !== 2) return { fehler: 'das Ergebnis ist nicht geschlossen (eine Kante hat mehr als zwei Dreiecke)' };
    if (triQuelle[ts[0]!] === triQuelle[ts[1]!]) continue;
    nahtNachbarn.set(u, [...(nahtNachbarn.get(u) ?? []), w]);
    nahtNachbarn.set(w, [...(nahtNachbarn.get(w) ?? []), u]);
  }
  // die Nähte: geschlossene Ketten, oder (auf der Hälfte) offene von der Spiegelebene zur Spiegelebene
  const naehte: { kette: number[]; zu: boolean }[] = [];
  const besucht = new Set<number>();
  const laufe = (start: number): { kette: number[]; zu: boolean } | string => {
    const kette = [start];
    besucht.add(start);
    let vor = -1;
    let jetzt = start;
    for (let schritt = 0; schritt <= nahtNachbarn.size; schritt++) {
      const nb = nahtNachbarn.get(jetzt)!.filter((x) => x !== vor);
      // (am Ende einer offenen Kette gibt es keinen weiteren)
      const weiter = nb[0];
      if (weiter === undefined) return { kette, zu: false };
      if (weiter === start) return { kette, zu: true };
      if (besucht.has(weiter)) return 'die Naht schließt sich nicht';
      kette.push(weiter);
      besucht.add(weiter);
      vor = jetzt;
      jetzt = weiter;
    }
    return 'die Naht schließt sich nicht';
  };
  for (const [v, nb] of nahtNachbarn) {
    if (nb.length > 2) return { fehler: 'die Naht verzweigt sich' };
    if (nb.length === 1 && !(halb && aufEbene[v])) return { fehler: 'die Naht endet neben der Spiegelebene' };
  }
  // erst die offenen Ketten (von ihren Enden aus), dann die geschlossenen
  for (const [v, nb] of nahtNachbarn) {
    if (nb.length !== 1 || besucht.has(v)) continue;
    const r = laufe(v);
    if (typeof r === 'string') return { fehler: r };
    naehte.push(r);
  }
  for (const v of nahtNachbarn.keys()) {
    if (besucht.has(v)) continue;
    const r = laufe(v);
    if (typeof r === 'string') return { fehler: r };
    if (!r.zu) return { fehler: 'die Naht schließt sich nicht' };
    naehte.push(r);
  }
  if (!naehte.length) return { fehler: 'die Formen berühren sich nicht (oder eine steckt ganz in der anderen)' };
  if (!halb) return { haut: hautAus(pos1, tri1, true), neuVonA, neuVonB, alt: alt1, naehte };
  // die Hälfte spiegeln: Punkte auf der Ebene sind ihr eigenes Spiegelbild
  const spiegel = new Int32Array(n1);
  let n = n1;
  for (let i = 0; i < n1; i++) spiegel[i] = aufEbene[i] ? i : n++;
  const pos = new Float64Array(3 * n);
  const alt = new Int32Array(n).fill(-1);
  for (let i = 0; i < n1; i++) {
    pos.set([pos1[3 * i]!, pos1[3 * i + 1]!, pos1[3 * i + 2]!], 3 * i);
    alt[i] = alt1[i]!;
    const j = spiegel[i]!;
    if (j === i) continue;
    pos.set([pos1[3 * i]!, pos1[3 * i + 1]!, -pos1[3 * i + 2]!], 3 * j);
    alt[j] = alt1[i]! >= 0 ? a.spiegel[alt1[i]!]! : -1;
  }
  const tri = new Uint32Array(2 * tri1.length);
  tri.set(tri1);
  for (let t = 0; t < tri1.length; t += 3) {
    tri[tri1.length + t] = spiegel[tri1[t]!]!;
    tri[tri1.length + t + 1] = spiegel[tri1[t + 2]!]!;
    tri[tri1.length + t + 2] = spiegel[tri1[t + 1]!]!;
  }
  // die Paare stehen fest (nicht aus gerundeten Lagen gelesen: Ein Punkt der Naht dicht an der Ebene fände sonst sich selbst)
  const paare = new Int32Array(n);
  for (let i = 0; i < n1; i++) {
    paare[i] = spiegel[i]!;
    paare[spiegel[i]!] = i;
  }
  const haut: Haut = { ...hautAus(pos, tri, true), spiegel: paare };
  // die Punkte beider Formen auf der Seite z < 0: die Spiegelbilder ihrer Partner
  for (const [alte, neuVon] of [
    [a, neuVonA],
    [b, neuVonB],
  ] as const)
    for (let v = 0; v < alte.n; v++) {
      const p = alte.spiegel[v]!;
      if (neuVon[v]! < 0 && p >= 0 && p !== v && neuVon[p]! >= 0) neuVon[v] = spiegel[neuVon[p]!]!;
    }
  return { haut, neuVonA, neuVonB, alt, naehte };
}

type Lauf = {
  h: Haut;
  aufNaht: ReadonlySet<number>;
  /** je Punkt der Naht die Kennung seiner Kreuzung (sobald dort eine Linie endet) */
  kreuzungBei: Map<number, number>;
  naechsteId: number;
  naechsteKreuzung: number;
  geschnitten: number;
  weg: number;
  neben: number;
  /** Linien ohne Griffe (ihre Stücke bekommen sie am Ende aus ihrer Kette) */
  ohnePfad: Loop[];
  /** neue und geschnittene Linien (jede Probe bekommt am Ende ihre Stelle auf dem Pfad) */
  neu: Loop[];
};

/**
 * Eine Linie einer der beiden Formen auf die neue Haut bringen. Ganz draußen: dieselbe Linie auf den neuen Punkten. Läuft sie in die
 * andere Form hinein: an der Naht geschnitten; jedes Stück draußen ist eine offene Linie, die an einem geschnittenen Ende an der Naht
 * hängt (ein Ende, das schon auf der Spiegelebene lag oder an einer anderen Linie hing, bleibt, wie es war). Zurück: die Linien, die
 * aus ihr werden (keine: Sie steckt ganz in der anderen Form).
 */
function linieUebertragen(L: Loop, alt: Haut, neuVon: Int32Array, R: Lauf, idBehalten: boolean): Loop[] | string {
  if (!L.proben.every(istPunktProbe)) return 'eine Linie liegt nur auf der Haut (nicht ins Netz eingesetzt)';
  const h = R.h;
  const n = L.proben.length;
  const zu = L.art !== 'ring';
  const alte = L.proben.map((p) => p.ecken[0]);
  const neue = alte.map((v) => neuVon[v]!);
  const lebt = neue.map((v) => v >= 0);
  const kanten = zu ? n : n - 1;
  const verbunden = (u: number, w: number): boolean => u === w || h.nachbarn[u]!.includes(w);
  const DUENN = 'eine Linie läuft zwischen zwei ihrer Punkte durch die andere Form (das Teil ist dort dünner als ihr Netz)';
  let id0 = idBehalten ? L.id : R.naechsteId++;
  const naechsteId = (): number => {
    const x = id0;
    id0 = -1;
    return x >= 0 ? x : R.naechsteId++;
  };
  if (lebt.every((x) => x)) {
    for (let j = 0; j < kanten; j++) if (!verbunden(neue[j]!, neue[(j + 1) % n]!)) return DUENN;
    return [{ ...L, id: naechsteId(), proben: neue.map(punktProbe), s: Float64Array.from(L.s), ruhe: Float64Array.from(L.ruhe), punkte: L.punkte.map(kopiePunkt) }];
  }
  if (!lebt.some((x) => x)) {
    R.weg++;
    return [];
  }
  R.geschnitten++;
  const mitPfad = hatPfad(L);
  const sVon = (j: number): number => (j < n ? L.s[j]! : L.laenge);
  // die Schnitte: an jeder Kante der Kette zwischen einem Punkt draußen und einem drinnen liegt ein Punkt der Naht
  type Stelle = { j: number; hinaus: boolean; w: number; s: number; punkt: LoopPunkt | null };
  const schnitte: Stelle[] = [];
  for (let j = 0; j < kanten; j++) {
    const k = (j + 1) % n;
    if (lebt[j] === lebt[k]) {
      if (lebt[j] && !verbunden(neue[j]!, neue[k]!)) return DUENN;
      continue;
    }
    const P = lage(alt, alte[j]!);
    const Q = lage(alt, alte[k]!);
    const d = { x: Q.x - P.x, y: Q.y - P.y, z: Q.z - P.z };
    const dd = d.x * d.x + d.y * d.y + d.z * d.z || 1;
    const u = neue[lebt[j] ? j : k]!;
    let w = -1;
    let wf = 0;
    let best = Infinity;
    for (const kand of R.aufNaht.has(u) ? [u] : h.nachbarn[u]!) {
      if (!R.aufNaht.has(kand)) continue;
      const X = lage(h, kand);
      const f = Math.max(0, Math.min(1, ((X.x - P.x) * d.x + (X.y - P.y) * d.y + (X.z - P.z) * d.z) / dd));
      const e = Math.hypot(P.x + f * d.x - X.x, P.y + f * d.y - X.y, P.z + f * d.z - X.z);
      if (e < best) {
        best = e;
        w = kand;
        wf = f;
      }
    }
    if (w < 0 || best > 1e-2) return 'an einer Linie fehlt der Punkt der Naht auf ihrer Kette';
    schnitte.push({ j, hinaus: lebt[j]!, w, s: sVon(j) + wf * (sVon(j + 1) - sVon(j)), punkt: null });
  }
  if (zu && schnitte.length % 2 !== 0) return 'eine Linie kreuzt die Naht eine ungerade Zahl von Malen';
  // der Pfad, an jedem Schnitt geteilt: Der neue Punkt liegt auf dem Pfad, dem Punkt der Naht am nächsten; seine Stelle s ist der
  // Parameter im Stück (so behalten alle Proben der Linie ihre Stelle auf dem Pfad)
  const punkte = L.punkte.map(kopiePunkt);
  for (const sn of schnitte) {
    const X = lage(h, sn.w);
    let k = R.kreuzungBei.get(sn.w);
    if (k === undefined) {
      k = R.naechsteKreuzung++;
      R.kreuzungBei.set(sn.w, k);
    }
    if (!mitPfad) {
      const p: LoopPunkt = { s: sn.s, ref: { ...X }, cur: { ...X }, kreuzung: k };
      punkte.push(p);
      punkte.sort((x, y) => x.s - y.s);
      sn.punkt = p;
      continue;
    }
    const m = punkte.length;
    let i = zu ? m - 1 : 0;
    for (let q = 0; q < (zu ? m : m - 1); q++) if (punkte[q]!.s <= sn.s) i = q;
    const A = punkte[i]!;
    const E = punkte[(i + 1) % m]!;
    const sA = A.s;
    const sE = zu && (i + 1) % m === 0 ? E.s + L.laenge : E.s;
    const sHier = sn.s < sA ? sn.s + L.laenge : sn.s;
    const t = Math.max(1e-4, Math.min(1 - 1e-4, stueckNaechstes(A.ref, A.aus!, E.ein!, E.ref, X, (sHier - sA) / (sE - sA || 1))));
    const teil = stueckTeilen(A.ref, A.aus!, E.ein!, E.ref, t);
    R.neben = Math.max(R.neben, Math.hypot(teil.F.x - X.x, teil.F.y - X.y, teil.F.z - X.z));
    A.aus = teil.a1;
    E.ein = teil.b2;
    let sNeu = sA + t * (sE - sA);
    if (zu && sNeu >= L.laenge) sNeu -= L.laenge;
    const p: LoopPunkt = { s: sNeu, ref: { ...X }, cur: { ...X }, ein: teil.ein, aus: teil.aus, kreuzung: k };
    punkte.push(p);
    punkte.sort((x, y) => x.s - y.s);
    sn.punkt = p;
    sn.s = sNeu;
  }
  // die Stücke draußen: von einem Anfang (ein Schnitt, an dem die Linie herauskommt, oder ihr eigener Anfang) bis zum nächsten Ende
  type Rand = { stelle: Stelle | null; j: number; s: number };
  const stuecke: { von: Rand; bis: Rand }[] = [];
  if (zu) {
    for (let a = 0; a < schnitte.length; a++) {
      const ein = schnitte[a]!;
      if (ein.hinaus) continue;
      const hin = schnitte[(a + 1) % schnitte.length]!;
      if (!hin.hinaus) return 'die Schnitte einer Linie wechseln nicht ab';
      stuecke.push({ von: { stelle: ein, j: (ein.j + 1) % n, s: ein.s }, bis: { stelle: hin, j: hin.j, s: hin.s } });
    }
  } else {
    let von: Rand | null = lebt[0] ? { stelle: null, j: 0, s: 0 } : null;
    for (const sn of schnitte) {
      if (sn.hinaus) {
        if (!von) return 'die Schnitte einer Linie wechseln nicht ab';
        stuecke.push({ von, bis: { stelle: sn, j: sn.j, s: sn.s } });
        von = null;
      } else {
        if (von) return 'die Schnitte einer Linie wechseln nicht ab';
        von = { stelle: sn, j: sn.j + 1, s: sn.s };
      }
    }
    if (von) stuecke.push({ von, bis: { stelle: null, j: n - 1, s: L.laenge } });
  }
  const aus: Loop[] = [];
  const EPS = 1e-9 * Math.max(1, L.laenge);
  for (const st of stuecke) {
    const s0 = st.von.s;
    const rel = (x: number): number => (zu ? (((x - s0) % L.laenge) + L.laenge) % L.laenge : x - s0);
    const lang = rel(st.bis.s) || L.laenge;
    const kette: number[] = [];
    const sK: number[] = [];
    if (st.von.stelle) {
      kette.push(st.von.stelle.w);
      sK.push(0);
    }
    for (let j = st.von.j, schritt = 0; ; j = (j + 1) % n, schritt++) {
      if (schritt > n + 1) return 'ein Stück einer Linie schließt sich nicht';
      // (liegt der Punkt draußen selbst auf der Naht, ist er der Schnitt)
      if (neue[j]! !== kette[kette.length - 1]) {
        kette.push(neue[j]!);
        sK.push(rel(L.s[j]!));
      }
      if (j === st.bis.j) break;
    }
    if (st.bis.stelle) {
      if (kette[kette.length - 1] !== st.bis.stelle.w) {
        kette.push(st.bis.stelle.w);
        sK.push(lang);
      } else sK[sK.length - 1] = lang;
    }
    if (kette.length < 2) continue;
    for (let j = 0; j + 1 < kette.length; j++) if (!verbunden(kette[j]!, kette[j + 1]!)) return 'zwei Punkte eines Linienstücks sind im neuen Netz nicht verbunden';
    const stueck = loopAusKette(h, naechsteId(), kette, false);
    stueck.s = Float64Array.from(sK);
    stueck.laenge = lang;
    // ein geschnittenes Ende hängt an der Naht; ein Ende, das die Linie schon hatte, bleibt, wie es war (auf der Spiegelebene oder hängend)
    const haengt: [boolean, boolean] = [st.von.stelle !== null || (L.haengt?.[0] ?? false), st.bis.stelle !== null || (L.haengt?.[1] ?? false)];
    if (haengt[0] || haengt[1]) stueck.haengt = haengt;
    if (L.kante !== undefined) stueck.kante = L.kante;
    const eigen = new Set<LoopPunkt | null>([st.von.stelle?.punkt ?? null, st.bis.stelle?.punkt ?? null]);
    const innen = punkte.filter((p) => !eigen.has(p) && rel(p.s) > (st.von.stelle ? EPS : -EPS) && rel(p.s) < lang + (st.bis.stelle ? -EPS : EPS)).map((p) => ({ ...kopiePunkt(p), s: Math.max(0, Math.min(lang, rel(p.s))) }));
    innen.sort((x, y) => x.s - y.s);
    stueck.punkte = [...(st.von.stelle ? [{ ...kopiePunkt(st.von.stelle.punkt!), s: 0 }] : []), ...innen, ...(st.bis.stelle ? [{ ...kopiePunkt(st.bis.stelle.punkt!), s: lang }] : [])];
    if (mitPfad) stueck.pfad = true;
    else R.ohnePfad.push(stueck);
    R.neu.push(stueck);
    aus.push(stueck);
  }
  return aus;
}

/**
 * Zwei Formen an ihrer Schnittkurve verbinden. A ist die Form, die bleibt (ihre Linien behalten ihre Kennungen, das Ergebnis liegt in
 * ihrem Maß); B kommt dazu (`vereinen`) oder wird von A abgezogen (`abziehen`: von B bleibt die Innenseite als Wand). B muss schon
 * im Maß von A liegen (`hautImMass`, `loopImMass`).
 *
 * Spiegel (das Bild bleibt dabei, wie es ist): Sind beide gespiegelt, oder ist A gespiegelt und B ein freies Teil mit Spiegelbild
 * ganz auf einer Seite, ist das Ergebnis gespiegelt. Sonst ist es frei wie A; eine gespiegelte Form wird dafür ganz und frei (wie
 * „Spiegel aus“; war es A, sagt das `aFrei`). Zwei freie Formen, von denen nur eine ihr Spiegelbild zeigt: `fehler`.
 */
export async function objekteVerbinden(a: NahtTeil, b: NahtTeil, art: NahtArt, ids: { naechsteId: number; naechsteKreuzung: number }): Promise<NahtErgebnis | { fehler: string }> {
  const t0 = performance.now();
  let { naechsteId, naechsteKreuzung } = ids;
  let A = { haut: a.haut, loops: [...a.loops] };
  let B = { haut: b.haut, loops: [...b.loops] };
  const aGespiegelt = !hautFrei(A.haut);
  const bGespiegelt = !hautFrei(B.haut);
  const halb = aGespiegelt && (bGespiegelt || b.spiegelbild);
  // Das Bild bleibt, wie es ist: Zwei freie Formen, von denen nur eine ihr Spiegelbild zeigt, ergäben eine Form, bei der ein
  // Spiegelbild dazukommt oder verschwindet.
  if (!aGespiegelt && !bGespiegelt && a.spiegelbild !== b.spiegelbild) return { fehler: 'ein Objekt zeigt sein Spiegelbild, das andere nicht: erst bei beiden denselben Spiegel wählen' };
  let aFrei = false;
  const freiMachen = (x: { haut: Haut; loops: Loop[] }, wer: string): { haut: Haut; loops: Loop[] } | string => {
    const f = spiegelAnwenden(x.haut, x.loops, { naechsteId, naechsteKreuzung });
    if ('fehler' in f) return `${wer} lässt sich nicht frei machen: ${f.fehler}`;
    naechsteId = f.naechsteId;
    naechsteKreuzung = f.naechsteKreuzung;
    return { haut: f.haut, loops: f.loops };
  };
  if (aGespiegelt && !halb) {
    const f = freiMachen(A, 'die gespiegelte Form');
    if (typeof f === 'string') return { fehler: f };
    A = f;
    aFrei = true;
  }
  if (!aGespiegelt && bGespiegelt) {
    const f = freiMachen(B, 'das gespiegelte Objekt');
    if (typeof f === 'string') return { fehler: f };
    B = f;
  }
  if (halb && !bGespiegelt) {
    // ein freies Teil mit Spiegelbild: Es muss ganz auf einer Seite der Spiegelebene liegen (dort wird es verbunden, sein Spiegelbild von selbst)
    let lo = Infinity;
    let hi = -Infinity;
    for (let v = 0; v < B.haut.n; v++) {
      lo = Math.min(lo, B.haut.pos[3 * v + 2]!);
      hi = Math.max(hi, B.haut.pos[3 * v + 2]!);
    }
    if (lo < 0 && hi > 0) return { fehler: 'das Objekt reicht über die Spiegelebene: erst sein Clipping einschalten (dann verschmilzt es dort), dann verbinden' };
    if (hi <= 0) B = { haut: hautGespiegelt(B.haut), loops: B.loops.map(loopGespiegelt) };
  }
  for (const l of [...A.loops, ...B.loops]) if (l.maulGeformt || l.maulLinie !== undefined) return { fehler: 'eine Form mit einem Maul lässt sich noch nicht verbinden' };
  const S = await schneiden(A.haut, B.haut, art, halb);
  if ('fehler' in S) return S;
  const h = S.haut;
  // die Kreuzungen von B zählen neu (zwei Formen zählen ihre Kreuzungen jede für sich)
  const kNeu = new Map<number, number>();
  const loopsB = B.loops.map((l) => ({
    ...l,
    punkte: l.punkte.map((p) => {
      if (p.kreuzung === undefined) return p;
      let k = kNeu.get(p.kreuzung);
      if (k === undefined) {
        k = naechsteKreuzung++;
        kNeu.set(p.kreuzung, k);
      }
      return { ...p, kreuzung: k };
    }),
  }));
  const R: Lauf = { h, aufNaht: new Set(S.naehte.flatMap((x) => x.kette)), kreuzungBei: new Map(), naechsteId, naechsteKreuzung, geschnitten: 0, weg: 0, neben: 0, ohnePfad: [], neu: [] };
  const loops: Loop[] = [];
  for (const [alt, ls, neuVon, behalten] of [
    [A.haut, A.loops, S.neuVonA, true],
    [B.haut, loopsB, S.neuVonB, false],
  ] as const)
    for (const L of ls) {
      const r = linieUebertragen(L, alt, neuVon, R, behalten);
      if (typeof r === 'string') return { fehler: r };
      loops.push(...r);
    }
  // die Nähte: Loops mit Kante an; wo eine Linie an ihnen endet, ein Punkt
  const mk = mittlereKante(h);
  const naehte: number[] = [];
  let enden = 0;
  for (const { kette, zu } of S.naehte) {
    const naht = loopAusKette(h, R.naechsteId++, kette, zu);
    naht.kante = true;
    kette.forEach((v, j) => {
      const k = R.kreuzungBei.get(v);
      if (k === undefined) return;
      const p = punktEinfuegen(naht, naht.s[j]!, k);
      p.ref = lage(h, v);
      p.cur = lage(h, v);
      enden++;
    });
    nahtPunkte(naht, h, kette, zu);
    // ihre Griffe aus ihrer Kette (Punkte dazu nur, wo ihr Pfad sonst weiter als ein Viertel einer Kante daneben läge)
    griffeAnlegen(naht, naht.ruhe, true, 0.25 * mk);
    loops.push(naht);
    naehte.push(naht.id);
    R.neu.push(naht);
  }
  for (const l of R.ohnePfad) griffeAnlegen(l, l.ruhe, true, 0.25 * mk);
  // eine Kreuzung, deren zweite Linie weggefallen ist, ist ein gewöhnlicher Punkt
  const zahl = new Map<number, number>();
  for (const l of loops) for (const p of l.punkte) if (p.kreuzung !== undefined) zahl.set(p.kreuzung, (zahl.get(p.kreuzung) ?? 0) + 1);
  for (const l of loops) for (const p of l.punkte) if (p.kreuzung !== undefined && (zahl.get(p.kreuzung) ?? 0) < 2) delete p.kreuzung;
  eckenAuto(loops);
  for (const l of R.neu) if (hatPfad(l)) pfadParameter(l);
  return { haut: h, loops, alt: S.alt, naehte, naechsteId: R.naechsteId, naechsteKreuzung: R.naechsteKreuzung, geschnitten: R.geschnitten, weg: R.weg, enden, neben: R.neben, aFrei, ms: performance.now() - t0 };
}
