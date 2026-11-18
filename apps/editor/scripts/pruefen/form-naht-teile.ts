// Plan „Objekte, Spiegel und Nähte“ (18.11.2026), Etappe 4, Beweis: zwei Häute an ihrer Schnittkurve verbinden (verschmelzen) oder
// die eine von der anderen abziehen. Gemeinsame Teile der Probe `form-naht.ts`.
//
// Den Schnitt zweier geschlossener Netze rechnet die Bibliothek Manifold (`manifold-3d`, Apache 2.0): Sie gibt ein geschlossenes Netz
// zurück und sagt je Dreieck, aus welchem Netz und welchem Dreieck es stammt. Hier wird daraus wieder eine Haut des Kerns: Punkte,
// die es schon gab, behalten ihre genaue Lage und sind ihren alten Nummern zugeordnet (die Ketten der Linien bleiben gültig); neu
// sind nur die Punkte auf der Schnittkurve. Die Naht ist die Kette dieser Punkte.
import Module from 'manifold-3d';
import { type Haut, type V3, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, type LoopPunkt, hatPfad, punktEinfuegen } from '../../../../packages/shape/src/dicht/loops';
import { stueckNaechstes, stueckTeilen } from '../../../../packages/shape/src/dicht/pfad';

export type Verbunden = {
  /** die neue Haut (frei: ohne Spiegelpaare) */
  haut: Haut;
  /** je Punkt der neuen Haut: aus welchem Netz er stammt (0: A, 1: B, 2: neu, auf der Naht) und seine Nummer dort (−1: neu) */
  quelle: Int8Array;
  alt: Int32Array;
  /** umgekehrt: je alter Punkt von A und von B seine Nummer in der neuen Haut (−1: weggefallen) */
  neuVonA: Int32Array;
  neuVonB: Int32Array;
  /** je Dreieck der neuen Haut: aus welchem Netz (0: A, 1: B) und aus welchem Dreieck dort */
  triQuelle: Int8Array;
  triAlt: Int32Array;
  /** die Nähte: geschlossene Ketten von Punkten der neuen Haut (jede Schnittkurve eine) */
  naehte: number[][];
  /** Rauminhalt: A, B und das Ergebnis */
  inhalt: { a: number; b: number; aus: number };
  ms: number;
};

type Wasm = Awaited<ReturnType<typeof Module>>;
let wasm: Wasm | null = null;
/** die Bibliothek laden (einmal) */
export async function manifoldLaden(): Promise<Wasm> {
  if (!wasm) {
    wasm = await Module();
    wasm.setup();
  }
  return wasm;
}

const f32 = new Float32Array(3);
/** Schlüssel einer Lage, wie die Bibliothek sie hält (einfache Genauigkeit) */
const schluessel = (x: number, y: number, z: number): string => {
  f32[0] = x;
  f32[1] = y;
  f32[2] = z;
  return `${f32[0]},${f32[1]},${f32[2]}`;
};

/**
 * Zwei geschlossene Häute verbinden. `vereinen`: Was von jeder in der anderen steckt, fällt weg (verschmelzen). `abziehen`: B wird von
 * A abgezogen; von B bleibt die Innenseite als Wand. Beide Häute müssen in denselben Koordinaten liegen.
 */
export async function verbinden(a: Haut, b: Haut, art: 'vereinen' | 'abziehen' = 'vereinen'): Promise<Verbunden | { fehler: string }> {
  const t0 = performance.now();
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
  if (mA.status() !== 'NoError' || mB.status() !== 'NoError') return { fehler: `ein Netz ist nicht geschlossen (A: ${mA.status()}, B: ${mB.status()})` };
  const inhalt = { a: mA.volume(), b: mB.volume(), aus: 0 };
  if (!(inhalt.a > 0) || !(inhalt.b > 0)) return { fehler: 'ein Netz ist nach innen gewendet (Rauminhalt nicht positiv)' };
  const mU = art === 'vereinen' ? Manifold.union(mA, mB) : mA.subtract(mB);
  if (mU.status() !== 'NoError' || mU.isEmpty()) return { fehler: `der Schnitt gab kein Netz (${mU.status()})` };
  inhalt.aus = mU.volume();
  const M = mU.getMesh();
  const nV = M.vertProperties.length / M.numProp;
  const nT = M.triVerts.length / 3;
  if (M.mergeFromVert.length) return { fehler: 'das Ergebnis hat doppelte Punkte' };
  // je Dreieck: aus welchem Netz, aus welchem Dreieck
  const triQuelle = new Int8Array(nT);
  const triAlt = new Int32Array(nT);
  for (let r = 0; r < M.runOriginalID.length; r++) {
    const q = M.runOriginalID[r] === idA ? 0 : 1;
    for (let i = M.runIndex[r]!; i < M.runIndex[r + 1]!; i += 3) {
      triQuelle[i / 3] = q;
      triAlt[i / 3] = M.faceID[i / 3]!;
    }
  }
  // je Punkt: von welchen Netzen seine Dreiecke stammen (beide: er liegt auf der Naht)
  const von = new Uint8Array(nV);
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) von[M.triVerts[3 * t + k]!] |= 1 << triQuelle[t]!;
  // alte Punkte wiederfinden (ihre Lage ist unverändert), mit ihrer genauen Lage
  const karte = (h: Haut): Map<string, number> => {
    const m = new Map<string, number>();
    for (let v = 0; v < h.n; v++) m.set(schluessel(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!), v);
    return m;
  };
  const kA = karte(a);
  const kB = karte(b);
  const pos = new Float64Array(3 * nV);
  const quelle = new Int8Array(nV).fill(2);
  const alt = new Int32Array(nV).fill(-1);
  const neuVonA = new Int32Array(a.n).fill(-1);
  const neuVonB = new Int32Array(b.n).fill(-1);
  for (let v = 0; v < nV; v++) {
    const x = M.vertProperties[3 * v]!;
    const y = M.vertProperties[3 * v + 1]!;
    const z = M.vertProperties[3 * v + 2]!;
    pos[3 * v] = x;
    pos[3 * v + 1] = y;
    pos[3 * v + 2] = z;
    const s = `${x},${y},${z}`;
    // (ein Punkt auf der Naht ist neu, außer die Schnittkurve läuft genau durch einen alten Punkt)
    const iA = von[v]! & 1 ? kA.get(s) : undefined;
    const iB = von[v]! & 2 ? kB.get(s) : undefined;
    if (iA !== undefined) {
      quelle[v] = 0;
      alt[v] = iA;
      neuVonA[iA] = v;
      pos.set(a.pos.subarray(3 * iA, 3 * iA + 3), 3 * v);
    } else if (iB !== undefined) {
      quelle[v] = 1;
      alt[v] = iB;
      neuVonB[iB] = v;
      pos.set(b.pos.subarray(3 * iB, 3 * iB + 3), 3 * v);
    }
  }
  // (beim Abziehen ist B gewendet: Die Bibliothek gibt seine Dreiecke schon mit der Außenseite nach außen zurück)
  const haut = hautAus(pos, M.triVerts, true);
  // die Naht: Kanten zwischen einem Dreieck von A und einem von B, zu geschlossenen Ketten gereiht
  const kanteTri = new Map<number, number[]>();
  for (let t = 0; t < nT; t++)
    for (let k = 0; k < 3; k++) {
      const u = M.triVerts[3 * t + k]!;
      const w = M.triVerts[3 * t + ((k + 1) % 3)]!;
      const key = Math.min(u, w) * nV + Math.max(u, w);
      const l = kanteTri.get(key);
      if (l) l.push(t);
      else kanteTri.set(key, [t]);
    }
  const nachbarn = new Map<number, number[]>();
  for (const [key, ts] of kanteTri) {
    if (ts.length !== 2) return { fehler: `das Ergebnis ist nicht geschlossen (eine Kante hat ${ts.length} Dreiecke)` };
    if (triQuelle[ts[0]!] === triQuelle[ts[1]!]) continue;
    const u = Math.floor(key / nV);
    const w = key % nV;
    nachbarn.set(u, [...(nachbarn.get(u) ?? []), w]);
    nachbarn.set(w, [...(nachbarn.get(w) ?? []), u]);
  }
  const naehte: number[][] = [];
  const besucht = new Set<number>();
  for (const start of nachbarn.keys()) {
    if (besucht.has(start)) continue;
    const kette = [start];
    besucht.add(start);
    let vor = -1;
    let jetzt = start;
    for (let schritt = 0; schritt <= nachbarn.size; schritt++) {
      const nb = nachbarn.get(jetzt)!;
      if (nb.length !== 2) return { fehler: `die Naht verzweigt sich (ein Punkt hat ${nb.length} Nahtkanten)` };
      const weiter = nb[0] === vor ? nb[1]! : nb[0]!;
      if (weiter === start) break;
      if (besucht.has(weiter)) return { fehler: 'die Naht schließt sich nicht' };
      kette.push(weiter);
      besucht.add(weiter);
      vor = jetzt;
      jetzt = weiter;
    }
    naehte.push(kette);
  }
  mA.delete();
  mB.delete();
  mU.delete();
  return { haut, quelle, alt, neuVonA, neuVonB, triQuelle, triAlt, naehte, inhalt, ms: performance.now() - t0 };
}

/** eine Haut verschoben und gleichmäßig skaliert (um den Ursprung), als neue Haut derselben Art */
export function hautVersetzt(h: Haut, k: number, d: { x: number; y: number; z: number }): Haut {
  const pos = Float64Array.from(h.pos);
  for (let v = 0; v < h.n; v++) {
    pos[3 * v] = pos[3 * v]! * k + d.x;
    pos[3 * v + 1] = pos[3 * v + 1]! * k + d.y;
    pos[3 * v + 2] = pos[3 * v + 2]! * k + d.z;
  }
  return { ...h, pos };
}

/** eine Linie wie `hautVersetzt` (Lagen, Griffe, Stellen längs der Linie); ihre Kreuzungen bekommen `kreuzungPlus` dazu (zwei Formen zählen ihre Kreuzungen jede für sich) */
export function loopVersetzt(l: Loop, k: number, d: { x: number; y: number; z: number }, kreuzungPlus = 0): Loop {
  const ort = (p: V3): V3 => ({ x: p.x * k + d.x, y: p.y * k + d.y, z: p.z * k + d.z });
  const griff = (g: V3): V3 => ({ x: g.x * k, y: g.y * k, z: g.z * k });
  return {
    ...l,
    s: Float64Array.from(l.s, (x) => x * k),
    laenge: l.laenge * k,
    ruhe: Float64Array.from(l.ruhe, (x, i) => x * k + (i % 3 === 0 ? d.x : i % 3 === 1 ? d.y : d.z)),
    punkte: l.punkte.map((p) => {
      const q: LoopPunkt = { ...p, s: p.s * k, ref: ort(p.ref), cur: ort(p.cur) };
      if (p.ein) q.ein = griff(p.ein);
      if (p.aus) q.aus = griff(p.aus);
      if (p.kreuzung !== undefined) q.kreuzung = p.kreuzung + kreuzungPlus;
      return q;
    }),
  };
}

// ---------- die Linien an der Naht ----------

const lage = (h: Haut, v: number): V3 => ({ x: h.pos[3 * v]!, y: h.pos[3 * v + 1]!, z: h.pos[3 * v + 2]! });
const punktProbe = (w: number): Loop['proben'][number] => ({ ecken: [w, w, w], b: [1, 0, 0] });
const kopiePunkt = (p: LoopPunkt): LoopPunkt => {
  const q: LoopPunkt = { ...p, ref: { ...p.ref }, cur: { ...p.cur } };
  if (p.ein) q.ein = { ...p.ein };
  if (p.aus) q.aus = { ...p.aus };
  return q;
};

/** ein Loop aus einer Kette von Punkten des Netzes (geschlossen: Art `paar`; offen: Art `ring`, er hängt an beiden Enden) */
export function loopAusKette(h: Haut, id: number, kette: readonly number[], zu: boolean): Loop {
  const n = kette.length;
  const s = new Float64Array(n);
  const ruhe = new Float64Array(3 * n);
  kette.forEach((v, j) => ruhe.set(h.pos.subarray(3 * v, 3 * v + 3), 3 * j));
  for (let j = 1; j < n; j++) s[j] = s[j - 1]! + Math.hypot(ruhe[3 * j]! - ruhe[3 * j - 3]!, ruhe[3 * j + 1]! - ruhe[3 * j - 2]!, ruhe[3 * j + 2]! - ruhe[3 * j - 1]!);
  const schluss = zu ? Math.hypot(ruhe[0]! - ruhe[3 * n - 3]!, ruhe[1]! - ruhe[3 * n - 2]!, ruhe[2]! - ruhe[3 * n - 1]!) : 0;
  const l: Loop = { id, art: zu ? 'paar' : 'ring', proben: kette.map(punktProbe), s, laenge: s[n - 1]! + schluss, ruhe, punkte: [] };
  if (!zu) l.haengt = [true, true];
  return l;
}

export type LinienAnDerNaht = {
  /** alle Linien der verbundenen Form: die ungeschnittenen beider Formen, die Stücke der geschnittenen (offen, sie hängen an der Naht), die Nähte */
  loops: Loop[];
  /** die Kennungen der Nähte */
  naehte: number[];
  /** so viele Linien wurden geschnitten, so viele fielen ganz weg, so viele Kreuzungen hat die Naht mit den Linien */
  geschnitten: number;
  weg: number;
  kreuzungen: number;
  /** wie weit ein neuer Endpunkt einer Linie (auf ihrem Pfad) höchstens neben seinem Punkt der Naht lag */
  neben: number;
  naechsteId: number;
  naechsteKreuzung: number;
};

/**
 * Die Linien zweier verbundener Formen auf die neue Haut bringen. Eine Linie, die ganz außerhalb der anderen Form liegt, bleibt, wie
 * sie ist. Eine Linie, die in die andere Form hineinläuft, wird an der Naht geschnitten: Ihr Pfad wird genau dort geteilt (de
 * Casteljau, das Stück davor bleibt dieselbe Kurve), was in der anderen Form steckt, fällt weg, und jedes Stück draußen ist eine
 * offene Linie, die an beiden Enden an der Naht hängt und den Punkt mit ihr teilt (wie eine Abzweigung). Die Naht ist ein
 * geschlossener Loop mit Kante an und hat an jeder solchen Stelle einen Punkt (noch ohne Griffe: `griffeAnlegen` danach).
 */
export function linienVerbinden(
  r: Verbunden,
  hA: Haut,
  loopsA: readonly Loop[],
  hB: Haut,
  loopsB: readonly Loop[],
  ids: { naechsteId: number; naechsteKreuzung: number },
): LinienAnDerNaht | { fehler: string } {
  const h = r.haut;
  let { naechsteId, naechsteKreuzung } = ids;
  const aufNaht = new Set(r.naehte.flat());
  /** je Punkt der Naht die Kennung seiner Kreuzung (sobald dort eine Linie endet) */
  const kreuzungBei = new Map<number, number>();
  const aus: Loop[] = [];
  let geschnitten = 0;
  let weg = 0;
  let neben = 0;
  for (const [alt, loops, neuVon] of [
    [hA, loopsA, r.neuVonA],
    [hB, loopsB, r.neuVonB],
  ] as const) {
    for (const L of loops) {
      if (L.art !== 'paar' || !L.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) return { fehler: 'eine Linie ist nicht geschlossen oder nicht ins Netz eingesetzt' };
      const n = L.proben.length;
      const alte = L.proben.map((p) => p.ecken[0]);
      const neue = alte.map((v) => neuVon[v]!);
      const lebt = neue.map((v) => v >= 0);
      if (lebt.every((x) => x)) {
        // ganz draußen: dieselbe Linie auf den neuen Punkten
        for (let j = 0; j < n; j++) if (!h.nachbarn[neue[j]!]!.includes(neue[(j + 1) % n]!)) return { fehler: 'eine Linie läuft zwischen zwei ihrer Punkte durch die andere Form (zu dünn für ihr Netz)' };
        aus.push({ ...L, id: naechsteId++, proben: neue.map(punktProbe), s: Float64Array.from(L.s), ruhe: Float64Array.from(L.ruhe), punkte: L.punkte.map(kopiePunkt) });
        continue;
      }
      if (!lebt.some((x) => x)) {
        weg++;
        continue;
      }
      if (!hatPfad(L)) return { fehler: 'eine Linie, die geschnitten wird, hat keinen Pfad' };
      geschnitten++;
      // die Schnitte: an jeder Kante der Kette zwischen einem Punkt draußen und einem drinnen liegt ein Punkt der Naht
      const sVon = (j: number): number => (j < n ? L.s[j]! : L.laenge);
      type Schnitt = { j: number; hinaus: boolean; w: number; s: number; punkt: LoopPunkt | null };
      const schnitte: Schnitt[] = [];
      for (let j = 0; j < n; j++) {
        const k = (j + 1) % n;
        if (lebt[j] === lebt[k]) {
          if (lebt[j] && !h.nachbarn[neue[j]!]!.includes(neue[k]!)) return { fehler: 'eine Linie läuft zwischen zwei ihrer Punkte durch die andere Form (zu dünn für ihr Netz)' };
          continue;
        }
        const draussen = lebt[j] ? j : k;
        const P = lage(alt, alte[j]!);
        const Q = lage(alt, alte[k]!);
        const d = { x: Q.x - P.x, y: Q.y - P.y, z: Q.z - P.z };
        const dd = d.x * d.x + d.y * d.y + d.z * d.z || 1;
        let w = -1;
        let wf = 0;
        let best = Infinity;
        const u = neue[draussen]!;
        for (const kand of aufNaht.has(u) ? [u] : h.nachbarn[u]!) {
          if (!aufNaht.has(kand)) continue;
          const X = lage(h, kand);
          const f = Math.max(0, Math.min(1, ((X.x - P.x) * d.x + (X.y - P.y) * d.y + (X.z - P.z) * d.z) / dd));
          const e = Math.hypot(P.x + f * d.x - X.x, P.y + f * d.y - X.y, P.z + f * d.z - X.z);
          if (e < best) {
            best = e;
            w = kand;
            wf = f;
          }
        }
        if (w < 0 || best > 1e-2) return { fehler: 'an einer Linie fehlt der Punkt der Naht auf ihrer Kette' };
        schnitte.push({ j, hinaus: lebt[j]!, w, s: sVon(j) + wf * (sVon(j + 1) - sVon(j)), punkt: null });
      }
      if (schnitte.length < 2 || schnitte.length % 2 !== 0) return { fehler: 'eine Linie kreuzt die Naht eine ungerade Zahl von Malen' };
      // der Pfad, an jedem Schnitt geteilt: Der neue Punkt liegt auf dem Pfad, dem Punkt der Naht am nächsten; seine Stelle s ist der
      // Parameter im Stück (so behalten alle Proben der Linie ihre Stelle auf dem Pfad)
      const punkte = L.punkte.map(kopiePunkt);
      for (const sn of schnitte) {
        const m = punkte.length;
        let i = m - 1;
        for (let k = 0; k < m; k++) if (punkte[k]!.s <= sn.s) i = k;
        if (sn.s < punkte[0]!.s) i = m - 1;
        const A = punkte[i]!;
        const E = punkte[(i + 1) % m]!;
        const sA = A.s;
        const sE = (i + 1) % m === 0 ? E.s + L.laenge : E.s;
        const sHier = sn.s < sA ? sn.s + L.laenge : sn.s;
        const X = lage(h, sn.w);
        const t = Math.max(1e-4, Math.min(1 - 1e-4, stueckNaechstes(A.ref, A.aus!, E.ein!, E.ref, X, (sHier - sA) / (sE - sA))));
        const teil = stueckTeilen(A.ref, A.aus!, E.ein!, E.ref, t);
        neben = Math.max(neben, Math.hypot(teil.F.x - X.x, teil.F.y - X.y, teil.F.z - X.z));
        A.aus = teil.a1;
        E.ein = teil.b2;
        let k = kreuzungBei.get(sn.w);
        if (k === undefined) {
          k = naechsteKreuzung++;
          kreuzungBei.set(sn.w, k);
        }
        let sNeu = sA + t * (sE - sA);
        if (sNeu >= L.laenge) sNeu -= L.laenge;
        const p: LoopPunkt = { s: sNeu, ref: { ...X }, cur: { ...X }, ein: teil.ein, aus: teil.aus, kreuzung: k };
        punkte.push(p);
        punkte.sort((a, b) => a.s - b.s);
        sn.punkt = p;
        sn.s = sNeu;
      }
      // die Stücke draußen: vom Schnitt, an dem die Linie herauskommt, bis zum nächsten, an dem sie hineinläuft
      for (let a = 0; a < schnitte.length; a++) {
        const ein = schnitte[a]!;
        if (ein.hinaus) continue;
        const hin = schnitte[(a + 1) % schnitte.length]!;
        if (!hin.hinaus) return { fehler: 'die Schnitte einer Linie wechseln nicht ab' };
        const s0 = ein.s;
        const rel = (x: number): number => (((x - s0) % L.laenge) + L.laenge) % L.laenge;
        const lang = rel(hin.s) || L.laenge;
        const kette = [ein.w];
        const sK = [0];
        for (let j = (ein.j + 1) % n; ; j = (j + 1) % n) {
          // (liegt der Punkt draußen selbst auf der Naht, ist er der Schnitt)
          if (neue[j]! !== kette[kette.length - 1]) {
            kette.push(neue[j]!);
            sK.push(rel(L.s[j]!));
          }
          if (j === hin.j) break;
          if (kette.length > n + 2) return { fehler: 'ein Stück einer Linie schließt sich nicht' };
        }
        if (kette[kette.length - 1] !== hin.w) {
          kette.push(hin.w);
          sK.push(lang);
        } else sK[sK.length - 1] = lang;
        for (let j = 0; j + 1 < kette.length; j++) if (!h.nachbarn[kette[j]!]!.includes(kette[j + 1]!)) return { fehler: 'zwei Punkte eines Linienstücks sind im neuen Netz nicht verbunden' };
        const stueck = loopAusKette(h, naechsteId++, kette, false);
        stueck.s = Float64Array.from(sK);
        stueck.laenge = lang;
        if (L.kante !== undefined) stueck.kante = L.kante;
        stueck.pfad = true;
        // seine Punkte: die der Linie zwischen den beiden Schnitten (samt ihnen), ihre Stellen vom ersten Schnitt aus gezählt
        const innen = punkte.filter((p) => p !== ein.punkt && p !== hin.punkt && rel(p.s) > 0 && rel(p.s) < lang).map((p) => ({ ...kopiePunkt(p), s: rel(p.s) }));
        innen.sort((x, y) => x.s - y.s);
        const anfang = { ...kopiePunkt(ein.punkt!), s: 0 };
        const ende = { ...kopiePunkt(hin.punkt!), s: lang };
        stueck.punkte = [anfang, ...innen, ende];
        aus.push(stueck);
      }
    }
  }
  // die Nähte: geschlossene Loops mit Kante an, an jedem Ende einer Linie ein Punkt
  const naehte: number[] = [];
  let kreuzungen = 0;
  for (const kette of r.naehte) {
    const naht = loopAusKette(h, naechsteId++, kette, true);
    naht.kante = true;
    kette.forEach((v, j) => {
      const k = kreuzungBei.get(v);
      if (k === undefined) return;
      const p = punktEinfuegen(naht, naht.s[j]!, k);
      p.ref = lage(h, v);
      p.cur = lage(h, v);
      kreuzungen++;
    });
    aus.push(naht);
    naehte.push(naht.id);
  }
  return { loops: aus, naehte, geschnitten, weg, kreuzungen, neben, naechsteId, naechsteKreuzung };
}
