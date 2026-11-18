// Der Verbund (Plan „Objekte, Spiegel und Nähte“, Etappe 5, 19.11.2026): die Naht lebt.
// Florian: „Es soll aber nur eine art hilfsedgeloop sein, der smooth entsteht wenn ich objekte ineinanderschiebe. Ich kann ihn auch
// ein und ausschalten pro objekt … ich kann objekte dann auch einfach wieder auseinanderschieben und der hilfsedgloop verschwindet.“
// Und: „dass ich z.B auch ein subtrahiertes loch mit abgerundeten kanten live und flüssig verschieben und bearbeiten kann“.
//
// Die Objekte bleiben Objekte. Was zu sehen ist, wird aus ihren gezeigten Häuten abgeleitet: Die Bibliothek Manifold schneidet sie
// (verschmelzen, abziehen), hier wird daraus wieder ein Netz für die Anzeige: mit der Naht (als Strecken, der Hilfsloop), der
// Rundung an der Naht und den Umrissen für die Wände. Gerechnet wird im Hintergrund (`verbund.worker.ts`), diese Datei läuft auch
// im Test.
//
// Die Rundung ist Geometrie am fertigen Netz, kein Rechnen der Haut (das braucht ein bis zwei Sekunden je Stand und lässt beim
// Abziehen die Höhle zusammenfallen, Plan Abschnitt 12). Sie ist die weiche Vereinigung der zwei Flächen (das weiche Minimum ihrer
// Abstandsfelder u und v mit der Weite k: die Fläche min(u, v) = (k − |u − v|)² / 4k). Jeder Punkt nahe der Naht behält seinen
// Unterschied v − u und rückt so weit, bis er auf dieser Fläche liegt: Er gleitet auf seiner eigenen Fläche von der Naht weg und
// hebt sich dann um (k − v)² / 4k aus ihr heraus (verschmolzen) oder senkt sich in sie hinein (abgezogen). Die andere Fläche kennt
// er aus ihrer Lage, Richtung und Krümmung an der nächsten Stelle der Naht.
// Die Breite R (was das Objekt verlangt) ist der Streifen auf jeder Fläche, den die Rundung fasst: k = R · Sinus des Winkels
// zwischen den Flächen. An einer rechtwinkligen Kante wandert die Naht um 0,35 R; wo die Flächen glatt ineinander übergehen,
// geschieht nichts; wo sich zwei Blasen nur noch wenig überschneiden, entsteht zwischen ihnen ein Hals, doppelt so dick wie ihr
// Schnittkreis. Die Form hängt nicht von der Feinheit des Netzes ab (beim Ziehen grob, in Ruhe fein: dieselbe Rundung), und die
// Weite ist an die Größe der Naht gebunden: Ein Hals, der schmaler wird, rundet schmaler, die Rundung geht mit der Naht gegen null.
import type { Wasm } from '../form/naht';

type ManifoldT = InstanceType<Wasm['Manifold']>;
type MeshT = InstanceType<Wasm['Mesh']>;

/** Werte je Punkt im Schnitt: Lage 3, Normale 3, Höhe 1, Lage im Muster 2, Dehnung 1 */
export const PROP = 10;
/**
 * Die Weite k ist höchstens 4 · NAHT_ANTEIL · (Halbmesser des Rings der Naht) · Sinus des halben Winkels zwischen den Flächen. Wo
 * sich zwei Blasen fast nur berühren, wandert die Naht damit um den NAHT_ANTEIL-fachen Halbmesser ihres Rings nach außen: Der Hals
 * ist dann √(1 + 2 · NAHT_ANTEIL) = 2-mal so dick wie der Schnittkreis und schrumpft mit ihm stetig auf null.
 */
const NAHT_ANTEIL = 1.5;
/** so weit von der Naht reicht die Rundung (in Breiten R); im letzten Drittel läuft sie weich aus */
const REICH = 1.25;
/** die Breite ändert sich längs der Naht höchstens so schnell (je Länge) */
const STEIGUNG = 0.5;

/** die Haut eines Objekts, wie sie gezeigt wird (Lagen im Raum) */
export type VerbundNetz = { pos: Float32Array; normal: Float32Array; index: Uint32Array; hoehe: Float32Array; blatt: Float32Array; dehnung: Float32Array };
export type VerbundTeil = {
  id: number;
  /** Stand seines Netzes (Version, Stufe, Spiegelbild): Derselbe Schlüssel heißt dasselbe Netz, dann darf `netz` fehlen */
  schl: string;
  netz: VerbundNetz | null;
  /** eine freie Form mit Spiegelbild: Es gehört dazu (an der Ebene z = 0) */
  spiegelbild: boolean;
  /** zieht ab (sonst gehört es zum Körper) */
  abzieher: boolean;
  /** Breite der Rundung an seinen Nähten (im Raum; 0: Kante) */
  rund: number;
};
/** ein Körper: was verschmilzt (`halten`) und was davon abgezogen wird; Kennungen der Objekte */
export type VerbundKoerper = { halten: number[]; abziehen: number[] };
/** `alle`: die Kennungen aller Objekte, die es gibt (was der Rechner von anderen noch hält, gibt er frei) */
export type VerbundAuftrag = { nr: number; teile: VerbundTeil[]; koerper: VerbundKoerper[]; alle?: number[] };
export type VerbundErgebnis = {
  nr: number;
  /** alle Körper in einem Netz; null: nichts gerechnet (`fehlt` oder `fehler`) */
  netz: VerbundNetz | null;
  /** die Nähte als Strecken (je 6 Zahlen), nach der Rundung */
  naht: Float32Array;
  /** die Umrisse von den drei Achsen (0 Front, 1 Top, 2 Seite) als Strecken */
  umriss: [Float32Array, Float32Array, Float32Array];
  /** die Abzieher, die wirklich etwas wegnehmen */
  beisst: number[];
  /** Objekte, deren Netz der Rechner nicht (mehr) hat: noch einmal schicken */
  fehlt: number[];
  /** größter Abstand der Dehnung von 1 (sie klingt in der Anzeige nach) */
  dehnungRest: number;
  ms: number;
  fehler?: string;
};

/** Rauminhalt mit Vorzeichen (positiv: die Dreiecke laufen von außen gesehen gegen den Uhrzeigersinn) */
function inhalt(pos: Float32Array, index: Uint32Array): number {
  let v = 0;
  for (let t = 0; t < index.length; t += 3) {
    const a = 3 * index[t]!;
    const b = 3 * index[t + 1]!;
    const c = 3 * index[t + 2]!;
    const ax = pos[a]!;
    const ay = pos[a + 1]!;
    const az = pos[a + 2]!;
    const bx = pos[b]!;
    const by = pos[b + 1]!;
    const bz = pos[b + 2]!;
    const cx = pos[c]!;
    const cy = pos[c + 1]!;
    const cz = pos[c + 2]!;
    v += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return v / 6;
}

type Eintrag = { schl: string; m: ManifoldT; orig: number };

/**
 * Was der Rechner behält: je Objekt seine letzten zwei Stände als fertige Körper der Bibliothek (der, der sich gerade bewegt, wird
 * jedes Mal neu gebaut; die anderen bleiben). Die Körper liegen im Speicher der Bibliothek und müssen von Hand freigegeben werden.
 */
export class VerbundSpeicher {
  private eintraege = new Map<number, Eintrag[]>();
  /** Kennung eines Netzes in der Bibliothek → sein Objekt */
  private herkunft = new Map<number, number>();

  holen(id: number, schl: string): Eintrag | null {
    const liste = this.eintraege.get(id);
    const i = liste ? liste.findIndex((e) => e.schl === schl) : -1;
    if (!liste || i < 0) return null;
    // (zuletzt benutzt nach vorn)
    if (i > 0) liste.unshift(liste.splice(i, 1)[0]!);
    return liste[0]!;
  }

  anlegen(w: Wasm, teil: VerbundTeil): Eintrag {
    const n = teil.netz!;
    const { Manifold, Mesh } = w;
    const N = n.pos.length / 3;
    const vp = new Float32Array(N * PROP);
    for (let i = 0; i < N; i++) {
      const o = PROP * i;
      vp[o] = n.pos[3 * i]!;
      vp[o + 1] = n.pos[3 * i + 1]!;
      vp[o + 2] = n.pos[3 * i + 2]!;
      vp[o + 3] = n.normal[3 * i]!;
      vp[o + 4] = n.normal[3 * i + 1]!;
      vp[o + 5] = n.normal[3 * i + 2]!;
      vp[o + 6] = n.hoehe[i]!;
      vp[o + 7] = n.blatt[2 * i]!;
      vp[o + 8] = n.blatt[2 * i + 1]!;
      vp[o + 9] = n.dehnung[i]!;
    }
    // die Bibliothek will die Dreiecke von außen gesehen gegen den Uhrzeigersinn; die Anzeige führt sie je nach Form andersherum
    const tri = Uint32Array.from(n.index);
    if (inhalt(n.pos, n.index) < 0)
      for (let t = 0; t < tri.length; t += 3) {
        const b = tri[t + 1]!;
        tri[t + 1] = tri[t + 2]!;
        tri[t + 2] = b;
      }
    const orig = Manifold.reserveIDs(1);
    const mesh = new Mesh({ numProp: PROP, vertProperties: vp, triVerts: tri, runOriginalID: Uint32Array.of(orig) });
    // (Punkte auf harten Linien sind in der Anzeige je Seite doppelt: an gleicher Lage wieder verbinden)
    mesh.merge();
    let m = new Manifold(mesh);
    const status = m.status();
    if (status !== 'NoError') {
      m.delete();
      throw new Error(`Die Haut von Form ${teil.id} ist kein geschlossener Körper (${status})`);
    }
    if (teil.spiegelbild) {
      const s = m.mirror([0, 0, 1]);
      const beide = Manifold.union(m, s);
      m.delete();
      s.delete();
      m = beide;
    }
    const e: Eintrag = { schl: teil.schl, m, orig };
    this.herkunft.set(orig, teil.id);
    let liste = this.eintraege.get(teil.id);
    if (!liste) this.eintraege.set(teil.id, (liste = []));
    liste.unshift(e);
    while (liste.length > 2) {
      const alt = liste.pop()!;
      alt.m.delete();
      this.herkunft.delete(alt.orig);
    }
    return e;
  }

  objektVon(orig: number): number | undefined {
    return this.herkunft.get(orig);
  }

  /** alles freigeben (Objekte, die es nicht mehr gibt; Ende) */
  leeren(behalten?: ReadonlySet<number>): void {
    for (const [id, liste] of this.eintraege) {
      if (behalten?.has(id)) continue;
      for (const e of liste) {
        e.m.delete();
        this.herkunft.delete(e.orig);
      }
      this.eintraege.delete(id);
    }
  }
}

/** kleiner Haufen (kleinster Schlüssel zuerst) für die Wellen längs der Naht und über die Haut */
class Haufen {
  private k = new Float64Array(1024);
  private w = new Int32Array(1024);
  n = 0;
  rein(schl: number, wert: number): void {
    if (this.n === this.k.length) {
      const k = new Float64Array(2 * this.n);
      k.set(this.k);
      this.k = k;
      const w = new Int32Array(2 * this.n);
      w.set(this.w);
      this.w = w;
    }
    let i = this.n++;
    const K = this.k;
    const W = this.w;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (K[p]! <= schl) break;
      K[i] = K[p]!;
      W[i] = W[p]!;
      i = p;
    }
    K[i] = schl;
    W[i] = wert;
  }
  /** der kleinste Schlüssel (`this.schl`) und sein Wert */
  schl = 0;
  raus(): number {
    const K = this.k;
    const W = this.w;
    this.schl = K[0]!;
    const aus = W[0]!;
    const n = --this.n;
    if (n > 0) {
      const ks = K[n]!;
      const ws = W[n]!;
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && K[c + 1]! < K[c]!) c++;
        if (K[c]! >= ks) break;
        K[i] = K[c]!;
        W[i] = W[c]!;
        i = c;
      }
      K[i] = ks;
      W[i] = ws;
    }
    return aus;
  }
}

/** der mittlere Eigenwert einer symmetrischen 3×3-Matrix */
function mittlererEigenwert(a00: number, a01: number, a02: number, a11: number, a12: number, a22: number): number {
  const p1 = a01 * a01 + a02 * a02 + a12 * a12;
  if (p1 < 1e-18) {
    const s = [a00, a11, a22].sort((x, y) => x - y);
    return s[1]!;
  }
  const q = (a00 + a11 + a22) / 3;
  const b00 = a00 - q;
  const b11 = a11 - q;
  const b22 = a22 - q;
  const p = Math.sqrt((b00 * b00 + b11 * b11 + b22 * b22 + 2 * p1) / 6);
  const det = (b00 * (b11 * b22 - a12 * a12) - a01 * (a01 * b22 - a12 * a02) + a02 * (a01 * a12 - b11 * a02)) / (p * p * p);
  const phi = Math.acos(Math.max(-1, Math.min(1, det / 2))) / 3;
  const e1 = q + 2 * p * Math.cos(phi);
  const e3 = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3);
  return 3 * q - e1 - e3;
}

type Seite = { id: number; abzieher: boolean; rund: number };
type Kanten = { a: Int32Array; b: Int32Array; t1: Int32Array; t2: Int32Array; n: number };

/**
 * Die Rundung an den Nähten: verschiebt die Punkte nahe einer Naht (`pos`, alle Punkte gleicher Lage gleich weit: keine Risse) und
 * richtet ihre Normalen nach (`nor`). `naht`: Kanten zwischen Dreiecken verschiedener Herkunft.
 */
function runden(pos: Float32Array, nor: Float32Array, tri: Uint32Array, gleich: Int32Array, triLauf: Int32Array, laeufe: readonly Seite[], K: Kanten, naht: readonly number[]): void {
  const nE = naht.length;
  const eK = new Float64Array(nE);
  const eSig = new Int8Array(nE);
  let etwas = false;
  for (let i = 0; i < nE; i++) {
    const e = naht[i]!;
    const s1 = laeufe[triLauf[K.t1[e]!]!]!;
    const s2 = laeufe[triLauf[K.t2[e]!]!]!;
    // die Naht eines Abziehers trägt seine Breite; zwischen zwei Teilen des Körpers (oder zwei Abziehern) die größere
    const k = s1.abzieher !== s2.abzieher ? (s1.abzieher ? s1.rund : s2.rund) : Math.max(s1.rund, s2.rund);
    eK[i] = k;
    // wo abgezogen wird, ist die Kante des Körpers nach außen gewölbt (er verliert dort), wo verschmolzen wird, nach innen
    eSig[i] = s1.abzieher || s2.abzieher ? -1 : 1;
    if (k > 0) etwas = true;
  }
  if (!etwas) return;
  const V = gleich.length;
  const T = tri.length / 3;
  // ---- die Punkte der Naht
  const platz = new Int32Array(V).fill(-1);
  let S = 0;
  for (let i = 0; i < nE; i++) {
    const e = naht[i]!;
    if (platz[K.a[e]!]! < 0) platz[K.a[e]!] = S++;
    if (platz[K.b[e]!]! < 0) platz[K.b[e]!] = S++;
  }
  const sVon = new Int32Array(S);
  for (let c = 0; c < V; c++) if (platz[c]! >= 0) sVon[platz[c]!] = c;
  const sK = new Float64Array(S).fill(Infinity);
  const sSig = new Int8Array(S);
  const sMehr = new Uint8Array(S);
  const grad = new Int32Array(S + 1);
  for (let i = 0; i < nE; i++) {
    const e = naht[i]!;
    grad[platz[K.a[e]!]! + 1]!++;
    grad[platz[K.b[e]!]! + 1]!++;
  }
  for (let s = 0; s < S; s++) grad[s + 1]! += grad[s]!;
  const nb = new Int32Array(2 * nE);
  const zeiger = grad.slice(0, S);
  for (let i = 0; i < nE; i++) {
    const e = naht[i]!;
    const sa = platz[K.a[e]!]!;
    const sb = platz[K.b[e]!]!;
    nb[zeiger[sa]!++] = sb;
    nb[zeiger[sb]!++] = sa;
    for (const s of [sa, sb]) {
      sK[s] = Math.min(sK[s]!, eK[i]!);
      if (sSig[s] !== 0 && sSig[s] !== eSig[i]) sMehr[s] = 1;
      sSig[s] = eSig[i]!;
    }
  }
  // ---- je Punkt der Naht die Normalen der zwei Flächen, die sich dort treffen (nach ihrer Herkunft)
  const sL1 = new Int32Array(S).fill(-1);
  const sL2 = new Int32Array(S).fill(-1);
  const sM = new Float64Array(6 * S);
  const punktLauf = new Int32Array(V).fill(-1);
  for (let t = 0; t < T; t++) {
    const r = triLauf[t]!;
    for (let k = 0; k < 3; k++) {
      const v = tri[3 * t + k]!;
      punktLauf[v] = r;
      const s = platz[gleich[v]!]!;
      if (s < 0) continue;
      let o: number;
      if (sL1[s] === r || sL1[s]! < 0) {
        sL1[s] = r;
        o = 6 * s;
      } else if (sL2[s] === r || sL2[s]! < 0) {
        sL2[s] = r;
        o = 6 * s + 3;
      } else {
        sMehr[s] = 1;
        continue;
      }
      sM[o]! += nor[3 * v]!;
      sM[o + 1]! += nor[3 * v + 1]!;
      sM[o + 2]! += nor[3 * v + 2]!;
    }
  }
  for (let s = 0; s < S; s++) {
    if (sL2[s]! < 0) sMehr[s] = 1;
    // (die Herkunft in fester Reihenfolge: Längs einer Naht haben alle Punkte dieselbe erste und zweite Seite)
    if (sL2[s]! >= 0 && sL1[s]! > sL2[s]!) {
      const l = sL1[s]!;
      sL1[s] = sL2[s]!;
      sL2[s] = l;
      for (let x = 0; x < 3; x++) {
        const m = sM[6 * s + x]!;
        sM[6 * s + x] = sM[6 * s + 3 + x]!;
        sM[6 * s + 3 + x] = m;
      }
    }
    for (const o of [6 * s, 6 * s + 3]) {
      const l = Math.hypot(sM[o]!, sM[o + 1]!, sM[o + 2]!) || 1;
      sM[o]! /= l;
      sM[o + 1]! /= l;
      sM[o + 2]! /= l;
    }
  }
  // ---- die Größe jeder Naht (zusammenhängend): der Halbmesser ihres Rings (aus der Streuung ihrer Stücke; für einen Kreis genau)
  const wurzel = new Int32Array(S);
  for (let s = 0; s < S; s++) wurzel[s] = s;
  const finde = (x: number): number => {
    while (wurzel[x] !== x) {
      wurzel[x] = wurzel[wurzel[x]!]!;
      x = wurzel[x]!;
    }
    return x;
  };
  for (let i = 0; i < nE; i++) {
    const a = finde(platz[K.a[naht[i]!]!]!);
    const b = finde(platz[K.b[naht[i]!]!]!);
    if (a !== b) wurzel[Math.max(a, b)] = Math.min(a, b);
  }
  const summe = new Float64Array(10 * S);
  for (let i = 0; i < nE; i++) {
    const e = naht[i]!;
    const a = 3 * K.a[e]!;
    const b = 3 * K.b[e]!;
    const l = Math.hypot(pos[b]! - pos[a]!, pos[b + 1]! - pos[a + 1]!, pos[b + 2]! - pos[a + 2]!);
    const mx = (pos[a]! + pos[b]!) / 2;
    const my = (pos[a + 1]! + pos[b + 1]!) / 2;
    const mz = (pos[a + 2]! + pos[b + 2]!) / 2;
    const o = 10 * finde(platz[K.a[e]!]!);
    summe[o]! += l;
    summe[o + 1]! += l * mx;
    summe[o + 2]! += l * my;
    summe[o + 3]! += l * mz;
    summe[o + 4]! += l * mx * mx;
    summe[o + 5]! += l * mx * my;
    summe[o + 6]! += l * mx * mz;
    summe[o + 7]! += l * my * my;
    summe[o + 8]! += l * my * mz;
    summe[o + 9]! += l * mz * mz;
  }
  const ring = new Float64Array(S);
  for (let s = 0; s < S; s++) {
    if (finde(s) !== s) continue;
    const o = 10 * s;
    const L = summe[o]!;
    if (!(L > 0)) continue;
    const cx = summe[o + 1]! / L;
    const cy = summe[o + 2]! / L;
    const cz = summe[o + 3]! / L;
    const e = mittlererEigenwert(summe[o + 4]! / L - cx * cx, summe[o + 5]! / L - cx * cy, summe[o + 6]! / L - cx * cz, summe[o + 7]! / L - cy * cy, summe[o + 8]! / L - cy * cz, summe[o + 9]! / L - cz * cz);
    ring[s] = Math.sqrt(Math.max(0, 2 * e));
  }
  // ---- die Breite R an jedem Punkt der Naht: die verlangte; null, wo sich mehr als zwei Flächen treffen, und von dort aus stetig
  const haufen = new Haufen();
  const sR = sK;
  for (let s = 0; s < S; s++) {
    if (sMehr[s]) sR[s] = 0;
    haufen.rein(sR[s]!, s);
  }
  const sx = (s: number, x: number): number => pos[3 * sVon[s]! + x]!;
  while (haufen.n) {
    const s = haufen.raus();
    if (haufen.schl > sR[s]!) continue;
    for (let j = grad[s]!; j < grad[s + 1]!; j++) {
      const q = nb[j]!;
      const k = sR[s]! + STEIGUNG * Math.hypot(sx(q, 0) - sx(s, 0), sx(q, 1) - sx(s, 1), sx(q, 2) - sx(s, 2));
      if (k < sR[q]!) {
        sR[q] = k;
        haufen.rein(k, q);
      }
    }
  }
  // ---- daraus die Weite k der weichen Vereinigung und wie weit sie reicht. Der Winkel zwischen den Flächen kommt aus ihren zwei
  // Normalen: k = R · sin(Winkel), damit eine glatte Stelle glatt bleibt; begrenzt durch die Größe der Naht (ein schmaler Hals
  // rundet schmal, eine Naht, die verschwindet, nimmt ihre Rundung mit). Dazu je Fläche die Richtung, in der sie von der Naht
  // wegführt (quer zur Naht, in der Fläche): aus denselben Normalen.
  const sReich = new Float64Array(S);
  const sBreite = Float64Array.from(sR);
  const sT = new Float64Array(6 * S);
  for (let s = 0; s < S; s++) {
    const o = 6 * s;
    const c0 = sM[o + 1]! * sM[o + 5]! - sM[o + 2]! * sM[o + 4]!;
    const c1 = sM[o + 2]! * sM[o + 3]! - sM[o]! * sM[o + 5]!;
    const c2 = sM[o]! * sM[o + 4]! - sM[o + 1]! * sM[o + 3]!;
    const sinus = Math.hypot(c0, c1, c2);
    const sinHalb = Math.hypot(sM[o]! + sM[o + 3]!, sM[o + 1]! + sM[o + 4]!, sM[o + 2]! + sM[o + 5]!) / 2;
    const cosHalb = Math.hypot(sM[o]! - sM[o + 3]!, sM[o + 1]! - sM[o + 4]!, sM[o + 2]! - sM[o + 5]!) / 2;
    const R = sBreite[s]!;
    const r = ring[finde(s)]!;
    sK[s] = Math.min(R * sinus, 4 * NAHT_ANTEIL * r * sinHalb);
    sReich[s] = REICH * Math.min(R, (2 * NAHT_ANTEIL * r) / Math.max(cosHalb, 0.05));
    // die Richtung längs der Naht: quer zu beiden Normalen; wo sie fast gleich oder entgegengesetzt sind, aus den Nachbarn der Naht
    let t0 = c0;
    let t1 = c1;
    let t2 = c2;
    if (sinus < 0.03) {
      let a0 = 0;
      let a1 = 0;
      let a2 = 0;
      for (let j = grad[s]!; j < grad[s + 1]!; j++) {
        const q = nb[j]!;
        const d0 = sx(q, 0) - sx(s, 0);
        const d1 = sx(q, 1) - sx(s, 1);
        const d2 = sx(q, 2) - sx(s, 2);
        const v = a0 * d0 + a1 * d1 + a2 * d2 >= 0 ? 1 : -1;
        a0 += v * d0;
        a1 += v * d1;
        a2 += v * d2;
      }
      const v = a0 * c0 + a1 * c1 + a2 * c2 >= 0 ? 1 : -1;
      t0 = v * a0;
      t1 = v * a1;
      t2 = v * a2;
    }
    const tl = Math.hypot(t0, t1, t2) || 1;
    t0 /= tl;
    t1 /= tl;
    t2 /= tl;
    // Seite 0: sig · (τ × m0), Seite 1: −sig · (τ × m1) (an Boden und Wand nachgerechnet: beide zeigen von der Kante weg)
    const g = sSig[s]!;
    sT[o] = g * (t1 * sM[o + 2]! - t2 * sM[o + 1]!);
    sT[o + 1] = g * (t2 * sM[o]! - t0 * sM[o + 2]!);
    sT[o + 2] = g * (t0 * sM[o + 1]! - t1 * sM[o]!);
    sT[o + 3] = -g * (t1 * sM[o + 5]! - t2 * sM[o + 4]!);
    sT[o + 4] = -g * (t2 * sM[o + 3]! - t0 * sM[o + 5]!);
    sT[o + 5] = -g * (t0 * sM[o + 4]! - t1 * sM[o + 3]!);
    for (const p of [o, o + 3]) {
      const l = Math.hypot(sT[p]!, sT[p + 1]!, sT[p + 2]!) || 1;
      sT[p]! /= l;
      sT[p + 1]! /= l;
      sT[p + 2]! /= l;
    }
  }
  // ---- Welle von der Naht über die Haut: je Punkt die nächste Stelle der Naht (auf den Stücken an einem ihrer Punkte)
  const anz = new Int32Array(V + 1);
  for (let i = 0; i < tri.length; i++) anz[gleich[tri[i]!]! + 1]!++;
  for (let c = 0; c < V; c++) anz[c + 1]! += anz[c]!;
  const eck = new Int32Array(tri.length);
  const fuell = anz.slice(0, V);
  const seite = new Int32Array(V).fill(-1);
  for (let t = 0; t < T; t++)
    for (let k = 0; k < 3; k++) {
      const c = gleich[tri[3 * t + k]!]!;
      eck[fuell[c]!++] = t;
      seite[c] = triLauf[t]!;
    }
  const weit = new Float64Array(V).fill(Infinity);
  const quelle = new Int32Array(V).fill(-1);
  const zweite = new Int32Array(V).fill(-1);
  const lam = new Float32Array(V);
  for (let s = 0; s < S; s++) {
    if (!(sK[s]! > 0)) continue;
    const c = sVon[s]!;
    weit[c] = 0;
    quelle[c] = s;
    zweite[c] = s;
    haufen.rein(0, c);
  }
  // (Ergebnis der Suche: Abstand, zweiter Punkt des Stücks, Lage auf dem Stück)
  let nd = 0;
  let nq = 0;
  let nl = 0;
  const naechste = (px: number, py: number, pz: number, s: number): void => {
    const ax = sx(s, 0);
    const ay = sx(s, 1);
    const az = sx(s, 2);
    nd = Math.hypot(px - ax, py - ay, pz - az);
    nq = s;
    nl = 0;
    for (let j = grad[s]!; j < grad[s + 1]!; j++) {
      const q = nb[j]!;
      const ux = sx(q, 0) - ax;
      const uy = sx(q, 1) - ay;
      const uz = sx(q, 2) - az;
      const uu = ux * ux + uy * uy + uz * uz;
      if (!(uu > 0)) continue;
      const l = Math.max(0, Math.min(1, ((px - ax) * ux + (py - ay) * uy + (pz - az) * uz) / uu));
      const d = Math.hypot(px - ax - l * ux, py - ay - l * uy, pz - az - l * uz);
      if (d < nd) {
        nd = d;
        nq = q;
        nl = l;
      }
    }
  };
  while (haufen.n) {
    const c = haufen.raus();
    if (haufen.schl > weit[c]!) continue;
    const s = quelle[c]!;
    for (let j = anz[c]!; j < anz[c + 1]!; j++) {
      const t = eck[j]!;
      for (let k = 0; k < 3; k++) {
        const n = gleich[tri[3 * t + k]!]!;
        if (n === c || platz[n]! >= 0) continue;
        const r = seite[n]!;
        if (r !== sL1[s] && r !== sL2[s]) continue;
        naechste(pos[3 * n]!, pos[3 * n + 1]!, pos[3 * n + 2]!, s);
        if (nd < weit[n]! - 1e-7 && nd < sReich[s]! + nl * (sReich[nq]! - sReich[s]!)) {
          weit[n] = nd;
          quelle[n] = s;
          zweite[n] = nq;
          lam[n] = nl;
          haufen.rein(nd, n);
        }
      }
    }
  }
  // (je Lage eine Normale: An einer harten Linie hat ein Punkt mehrere, sie werden gemittelt)
  const nC = new Float32Array(3 * V);
  for (let v = 0; v < V; v++) {
    const c = 3 * gleich[v]!;
    nC[c]! += nor[3 * v]!;
    nC[c + 1]! += nor[3 * v + 1]!;
    nC[c + 2]! += nor[3 * v + 2]!;
  }
  for (let c = 0; c < V; c++) {
    if (quelle[c]! < 0) continue;
    const l = Math.hypot(nC[3 * c]!, nC[3 * c + 1]!, nC[3 * c + 2]!) || 1;
    nC[3 * c]! /= l;
    nC[3 * c + 1]! /= l;
    nC[3 * c + 2]! /= l;
  }
  // ---- die Krümmung jeder der zwei Flächen quer zur Naht, an jedem Punkt der Naht: aus den Normalen der Punkte, die ihm zugehören
  // (für eine Kugel genau der Kehrwert ihres Halbmessers, in jedem Abstand). An der Naht liegen die Punkte sehr ungleich dicht;
  // gezählt wird deshalb nur, wer weit genug von ihr liegt, und gemittelt wird über ein Stück der Naht von der Länge der Breite.
  const krS = new Float64Array(2 * S);
  const gew = new Float64Array(2 * S);
  for (let c = 0; c < V; c++) {
    const s = quelle[c]!;
    if (s < 0 || platz[c]! >= 0 || gleich[c] !== c) continue;
    const i = seite[c] === sL1[s] ? 0 : 1;
    const q = zweite[c]!;
    const l = lam[c]!;
    const o = 6 * s + 3 * i;
    const x0 = pos[3 * c]! - (sx(s, 0) + l * (sx(q, 0) - sx(s, 0)));
    const x1 = pos[3 * c + 1]! - (sx(s, 1) + l * (sx(q, 1) - sx(s, 1)));
    const x2 = pos[3 * c + 2]! - (sx(s, 2) + l * (sx(q, 2) - sx(s, 2)));
    const h = x0 * sM[o]! + x1 * sM[o + 1]! + x2 * sM[o + 2]!;
    const t0 = x0 - h * sM[o]!;
    const t1 = x1 - h * sM[o + 1]!;
    const t2 = x2 - h * sM[o + 2]!;
    const rho2 = t0 * t0 + t1 * t1 + t2 * t2;
    const rho = Math.sqrt(rho2);
    if (!(rho > 0.15 * sBreite[s]!)) continue;
    krS[2 * s + i]! += (rho * ((nC[3 * c]! - sM[o]!) * t0 + (nC[3 * c + 1]! - sM[o + 1]!) * t1 + (nC[3 * c + 2]! - sM[o + 2]!) * t2)) / rho2;
    gew[2 * s + i]! += rho;
  }
  const kr = new Float64Array(2 * S);
  {
    const marke = new Int32Array(S).fill(-1);
    const weg = new Float64Array(S);
    const schlange = new Int32Array(S);
    for (let s = 0; s < S; s++) {
      const R = sBreite[s]!;
      if (!(R > 0)) continue;
      let z0 = 0;
      let z1 = 0;
      let n0 = 0;
      let n1 = 0;
      let kopf = 0;
      let ende = 0;
      schlange[ende++] = s;
      marke[s] = s;
      weg[s] = 0;
      while (kopf < ende) {
        const a = schlange[kopf++]!;
        z0 += krS[2 * a]!;
        n0 += gew[2 * a]!;
        z1 += krS[2 * a + 1]!;
        n1 += gew[2 * a + 1]!;
        for (let j = grad[a]!; j < grad[a + 1]!; j++) {
          const q = nb[j]!;
          if (marke[q] === s || sL1[q] !== sL1[s] || sL2[q] !== sL2[s]) continue;
          const d = weg[a]! + Math.hypot(sx(q, 0) - sx(a, 0), sx(q, 1) - sx(a, 1), sx(q, 2) - sx(a, 2));
          if (d > R) continue;
          marke[q] = s;
          weg[q] = d;
          schlange[ende++] = q;
        }
      }
      // (nie stärker gekrümmt, als die Breite fassen kann: Ein Ausreißer würfe die Punkte sonst weit hinaus)
      const grenze = 2 / R;
      kr[2 * s] = n0 > 0 ? Math.max(-grenze, Math.min(grenze, z0 / n0)) : 0;
      kr[2 * s + 1] = n1 > 0 ? Math.max(-grenze, Math.min(grenze, z1 / n1)) : 0;
    }
  }
  // ---- ein Punkt auf die gerundete Fläche: Er gleitet auf seiner Fläche um ds von der Naht weg (Richtung t, Krümmung ka), dann
  // rückt er um w = (k − delta)² / 4k aus ihr heraus (sig = 1) oder in sie hinein (−1); ds so, dass sein Abstand zur anderen Fläche
  // (um c, Normale m, Krümmung ko) danach delta + w ist. Ergebnis: neue Lage r, Normale der eigenen Fläche dort e, der anderen f.
  let r0 = 0;
  let r1 = 0;
  let r2 = 0;
  let e0 = 0;
  let e1 = 0;
  let e2 = 0;
  let f0 = 0;
  let f1 = 0;
  let f2 = 0;
  const legen = (px: number, py: number, pz: number, nx: number, ny: number, nz: number, tx: number, ty: number, tz: number, ka: number, cx: number, cy: number, cz: number, mx: number, my: number, mz: number, ko: number, sig: number, k: number, delta: number, reich: number): void => {
    const w = ((k - delta) * (k - delta)) / (4 * k);
    const F = (ds: number): number => {
      let a0 = nx + ka * ds * tx;
      let a1 = ny + ka * ds * ty;
      let a2 = nz + ka * ds * tz;
      const al = Math.hypot(a0, a1, a2) || 1;
      a0 /= al;
      a1 /= al;
      a2 /= al;
      e0 = a0;
      e1 = a1;
      e2 = a2;
      r0 = px + ds * tx - 0.5 * ka * ds * ds * nx + sig * w * a0;
      r1 = py + ds * ty - 0.5 * ka * ds * ds * ny + sig * w * a1;
      r2 = pz + ds * tz - 0.5 * ka * ds * ds * nz + sig * w * a2;
      const x0 = r0 - cx;
      const x1 = r1 - cy;
      const x2 = r2 - cz;
      const h = x0 * mx + x1 * my + x2 * mz;
      const u0 = x0 - h * mx;
      const u1 = x1 - h * my;
      const u2 = x2 - h * mz;
      f0 = mx + ko * u0;
      f1 = my + ko * u1;
      f2 = mz + ko * u2;
      return sig * (h + 0.5 * ko * (u0 * u0 + u1 * u1 + u2 * u2)) - (delta + w);
    };
    let lo = 0;
    let flo = F(0);
    if (flo < 0) {
      let hi = Math.max(w, 1e-3 * k);
      let fhi = F(hi);
      for (let n = 0; fhi < 0 && hi < reich && n < 40; n++) {
        lo = hi;
        flo = fhi;
        hi = Math.min(reich, 2 * hi);
        fhi = F(hi);
      }
      // (zwischen lo und hi wechselt das Vorzeichen: die Sehne, mit Halbieren der Seite, die stehen bleibt)
      if (fhi >= 0) {
        let seiteVorher = 0;
        for (let n = 0; n < 24 && hi - lo > 1e-4 * k; n++) {
          const x = (lo * fhi - hi * flo) / (fhi - flo);
          const fx = F(x);
          if (fx < 0) {
            lo = x;
            flo = fx;
            if (seiteVorher === -1) fhi /= 2;
            seiteVorher = -1;
          } else {
            hi = x;
            fhi = fx;
            if (seiteVorher === 1) flo /= 2;
            seiteVorher = 1;
          }
          if (Math.abs(fx) < 1e-5 * k) break;
        }
      }
    }
    const fl = Math.hypot(f0, f1, f2) || 1;
    f0 /= fl;
    f1 /= fl;
    f2 /= fl;
  };
  // ---- die Punkte der Naht: von jeder der zwei Flächen aus gelegt, dazwischen ihre Mitte
  const sNeu = new Float64Array(3 * S);
  const sNor = new Float64Array(6 * S);
  const sGem = new Float64Array(3 * S);
  for (let s = 0; s < S; s++) {
    const k = sK[s]!;
    if (!(k > 0)) continue;
    const c = 3 * sVon[s]!;
    const lage = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 2; i++) {
      const o = 6 * s + 3 * i;
      const p = 6 * s + 3 * (1 - i);
      legen(pos[c]!, pos[c + 1]!, pos[c + 2]!, sM[o]!, sM[o + 1]!, sM[o + 2]!, sT[o]!, sT[o + 1]!, sT[o + 2]!, kr[2 * s + i]!, pos[c]!, pos[c + 1]!, pos[c + 2]!, sM[p]!, sM[p + 1]!, sM[p + 2]!, kr[2 * s + 1 - i]!, sSig[s]!, k, 0, sReich[s]!);
      lage[3 * i] = r0;
      lage[3 * i + 1] = r1;
      lage[3 * i + 2] = r2;
      // (an der Naht: zur Hälfte die eigene Normale, zur Hälfte die der anderen Fläche)
      const n0 = e0 + f0;
      const n1 = e1 + f1;
      const n2 = e2 + f2;
      const nl2 = Math.hypot(n0, n1, n2) || 1;
      sNor[o] = n0 / nl2;
      sNor[o + 1] = n1 / nl2;
      sNor[o + 2] = n2 / nl2;
    }
    // (als Weg des Punkts gemerkt)
    for (let x = 0; x < 3; x++) sNeu[3 * s + x] = (lage[x]! + lage[3 + x]!) / 2 - pos[c + x]!;
    // an der Naht haben beide Seiten dieselbe Normale (die Mitte der zwei Rechnungen: Jeder Unterschied zeigte sich sonst als feine Kante)
    const o = 6 * s;
    const n0 = sNor[o]! + sNor[o + 3]!;
    const n1 = sNor[o + 1]! + sNor[o + 4]!;
    const n2 = sNor[o + 2]! + sNor[o + 5]!;
    const nl2 = Math.hypot(n0, n1, n2) || 1;
    sGem[3 * s] = n0 / nl2;
    sGem[3 * s + 1] = n1 / nl2;
    sGem[3 * s + 2] = n2 / nl2;
  }
  // ---- die Punkte daneben
  const versatz = new Float32Array(3 * V);
  const misch = new Float32Array(V);
  const dreh = new Float32Array(3 * V);
  const fuss = new Float32Array(3 * V);
  const korr = new Float32Array(3 * V);
  for (let c = 0; c < V; c++) {
    const s = quelle[c]!;
    if (s < 0 || gleich[c] !== c) continue;
    if (platz[c]! >= 0) {
      if (!(sK[s]! > 0)) continue;
      versatz[3 * c] = sNeu[3 * s]!;
      versatz[3 * c + 1] = sNeu[3 * s + 1]!;
      versatz[3 * c + 2] = sNeu[3 * s + 2]!;
      continue;
    }
    const q = zweite[c]!;
    const l = lam[c]!;
    const k = sK[s]! + l * (sK[q]! - sK[s]!);
    if (!(k > 1e-6)) continue;
    // beide Flächen an der nächsten Stelle der Naht (längs der Naht gemischt, wo es dieselben zwei sind)
    const i = seite[c] === sL1[s] ? 0 : 1;
    const gleicheNaht = sL1[q] === sL1[s] && sL2[q] === sL2[s] ? 1 : 0;
    const oe = 6 * s + 3 * i;
    const qe = gleicheNaht ? 6 * q + 3 * i : oe;
    const oa = 6 * s + 3 * (1 - i);
    const qa = gleicheNaht ? 6 * q + 3 * (1 - i) : oa;
    let m0 = sM[oa]! + l * (sM[qa]! - sM[oa]!);
    let m1 = sM[oa + 1]! + l * (sM[qa + 1]! - sM[oa + 1]!);
    let m2 = sM[oa + 2]! + l * (sM[qa + 2]! - sM[oa + 2]!);
    const ml = Math.hypot(m0, m1, m2) || 1;
    m0 /= ml;
    m1 /= ml;
    m2 /= ml;
    const ke = kr[2 * s + i]! + l * gleicheNaht * (kr[2 * q + i]! - kr[2 * s + i]!);
    const ko = kr[2 * s + 1 - i]! + l * gleicheNaht * (kr[2 * q + 1 - i]! - kr[2 * s + 1 - i]!);
    const cx = sx(s, 0) + l * (sx(q, 0) - sx(s, 0));
    const cy = sx(s, 1) + l * (sx(q, 1) - sx(s, 1));
    const cz = sx(s, 2) + l * (sx(q, 2) - sx(s, 2));
    const px = pos[3 * c]!;
    const py = pos[3 * c + 1]!;
    const pz = pos[3 * c + 2]!;
    const x0 = px - cx;
    const x1 = py - cy;
    const x2 = pz - cz;
    const h = x0 * m0 + x1 * m1 + x2 * m2;
    const u0 = x0 - h * m0;
    const u1 = x1 - h * m1;
    const u2 = x2 - h * m2;
    const sig = sSig[s]!;
    // so weit ist es von hier bis zur anderen Fläche
    const delta = Math.max(0, sig * (h + 0.5 * ko * (u0 * u0 + u1 * u1 + u2 * u2)));
    if (delta >= k) continue;
    const reich = sReich[s]! + l * (sReich[q]! - sReich[s]!);
    const d = weit[c]!;
    const u = (d - 0.7 * reich) / (0.3 * reich);
    const aus = u <= 0 ? 1 : u >= 1 ? 0 : 1 - u * u * (3 - 2 * u);
    if (aus <= 0) continue;
    // die Richtung auf der eigenen Fläche von der Naht weg: die der Naht an ihrer nächsten Stelle, in die Fläche hier gelegt (aus der
    // eigenen Lage genommen, wäre sie dicht an der Naht zufällig: Dort liegen Punkte in jedem Abstand und jeder Richtung)
    const nx = nC[3 * c]!;
    const ny = nC[3 * c + 1]!;
    const nz = nC[3 * c + 2]!;
    let t0 = sT[oe]! + l * (sT[qe]! - sT[oe]!);
    let t1 = sT[oe + 1]! + l * (sT[qe + 1]! - sT[oe + 1]!);
    let t2 = sT[oe + 2]! + l * (sT[qe + 2]! - sT[oe + 2]!);
    const hn = t0 * nx + t1 * ny + t2 * nz;
    t0 -= hn * nx;
    t1 -= hn * ny;
    t2 -= hn * nz;
    const tl = Math.hypot(t0, t1, t2) || 1;
    // Zuerst die nächste Stelle der Naht selbst, mit denselben Werten gelegt: Der Punkt rückt wie die Naht dort (zwischen ihren zwei
    // Punkten gemischt), dazu um das, worin sich sein eigener Weg von diesem unterscheidet. So gehen Punkte dicht an der Naht genau
    // mit ihr mit: Dort liegen Dreiecke, schmaler als jeder Unterschied zweier Rechnungen, sie klappten sonst um.
    let a0 = sM[oe]! + l * (sM[qe]! - sM[oe]!);
    let a1 = sM[oe + 1]! + l * (sM[qe + 1]! - sM[oe + 1]!);
    let a2 = sM[oe + 2]! + l * (sM[qe + 2]! - sM[oe + 2]!);
    const al = Math.hypot(a0, a1, a2) || 1;
    a0 /= al;
    a1 /= al;
    a2 /= al;
    let b0 = sT[oe]! + l * (sT[qe]! - sT[oe]!);
    let b1 = sT[oe + 1]! + l * (sT[qe + 1]! - sT[oe + 1]!);
    let b2 = sT[oe + 2]! + l * (sT[qe + 2]! - sT[oe + 2]!);
    const ha = b0 * a0 + b1 * a1 + b2 * a2;
    b0 -= ha * a0;
    b1 -= ha * a1;
    b2 -= ha * a2;
    const bl = Math.hypot(b0, b1, b2) || 1;
    legen(cx, cy, cz, a0, a1, a2, b0 / bl, b1 / bl, b2 / bl, ke, cx, cy, cz, m0, m1, m2, ko, sig, k, 0, reich);
    const g0 = r0 - cx;
    const g1 = r1 - cy;
    const g2 = r2 - cz;
    legen(px, py, pz, nx, ny, nz, t0 / tl, t1 / tl, t2 / tl, ke, cx, cy, cz, m0, m1, m2, ko, sig, k, delta, reich);
    versatz[3 * c] = aus * (sNeu[3 * s]! + l * (sNeu[3 * q]! - sNeu[3 * s]!) + (r0 - px) - g0);
    versatz[3 * c + 1] = aus * (sNeu[3 * s + 1]! + l * (sNeu[3 * q + 1]! - sNeu[3 * s + 1]!) + (r1 - py) - g1);
    versatz[3 * c + 2] = aus * (sNeu[3 * s + 2]! + l * (sNeu[3 * q + 2]! - sNeu[3 * s + 2]!) + (r2 - pz) - g2);
    misch[c] = (aus * (k - delta)) / (2 * k);
    dreh[3 * c] = aus * (e0 - nx);
    dreh[3 * c + 1] = aus * (e1 - ny);
    dreh[3 * c + 2] = aus * (e2 - nz);
    fuss[3 * c] = f0;
    fuss[3 * c + 1] = f1;
    fuss[3 * c + 2] = f2;
    // (was die Normale der Naht von der dieser Seite abweicht, klingt mit dem Abstand zur anderen Fläche ab)
    const nah = aus * (1 - delta / k) * (1 - delta / k);
    const og = 3 * s;
    const qg = gleicheNaht && sK[q]! > 0 ? 3 * q : og;
    const qn = gleicheNaht && sK[q]! > 0 ? qe : oe;
    if (sK[s]! > 0)
      for (let x = 0; x < 3; x++) korr[3 * c + x] = nah * (sGem[og + x]! + l * (sGem[qg + x]! - sGem[og + x]!) - (sNor[oe + x]! + l * (sNor[qn + x]! - sNor[oe + x]!)));
  }
  // ---- anwenden: alle Punkte gleicher Lage rücken gleich weit (nichts reißt); jede Normale dreht mit ihrer Fläche und mischt
  // sich mit der der anderen
  for (let v = 0; v < V; v++) {
    const c = gleich[v]!;
    const s0 = quelle[c]!;
    if (s0 < 0) continue;
    pos[3 * v]! += versatz[3 * c]!;
    pos[3 * v + 1]! += versatz[3 * c + 1]!;
    pos[3 * v + 2]! += versatz[3 * c + 2]!;
    const s = platz[c]!;
    if (s >= 0) {
      if (!(sK[s]! > 0) || sMehr[s]) continue;
      nor[3 * v] = sGem[3 * s]!;
      nor[3 * v + 1] = sGem[3 * s + 1]!;
      nor[3 * v + 2] = sGem[3 * s + 2]!;
      continue;
    }
    const mm = misch[c]!;
    if (!(mm > 0)) continue;
    const n0 = (1 - mm) * (nor[3 * v]! + dreh[3 * c]!) + mm * fuss[3 * c]! + korr[3 * c]!;
    const n1 = (1 - mm) * (nor[3 * v + 1]! + dreh[3 * c + 1]!) + mm * fuss[3 * c + 1]! + korr[3 * c + 1]!;
    const n2 = (1 - mm) * (nor[3 * v + 2]! + dreh[3 * c + 2]!) + mm * fuss[3 * c + 2]! + korr[3 * c + 2]!;
    const nl3 = Math.hypot(n0, n1, n2) || 1;
    nor[3 * v] = n0 / nl3;
    nor[3 * v + 1] = n1 / nl3;
    nor[3 * v + 2] = n2 / nl3;
  }
}

type Stueck = { netz: VerbundNetz; naht: number[]; umriss: [number[], number[], number[]]; beisst: number[] };

/** aus dem Netz der Bibliothek das Netz der Anzeige: Naht finden, runden, Umrisse */
function nachbearbeiten(M: MeshT, seiteVon: (orig: number) => Seite): Stueck {
  const vp = M.vertProperties;
  const tri = M.triVerts;
  const V = vp.length / PROP;
  const T = tri.length / 3;
  // Punkte gleicher Lage (an Nähten und harten Linien hat jede Seite ihren eigenen Punkt mit eigenen Werten)
  const gleich = new Int32Array(V);
  for (let v = 0; v < V; v++) gleich[v] = v;
  const finde = (x: number): number => {
    while (gleich[x] !== x) {
      gleich[x] = gleich[gleich[x]!]!;
      x = gleich[x]!;
    }
    return x;
  };
  const von = M.mergeFromVert;
  const zu = M.mergeToVert;
  for (let i = 0; i < von.length; i++) {
    const a = finde(von[i]!);
    const b = finde(zu[i]!);
    if (a !== b) gleich[Math.max(a, b)] = Math.min(a, b);
  }
  for (let v = 0; v < V; v++) gleich[v] = finde(v);
  const laeufe: Seite[] = [];
  const triLauf = new Int32Array(T);
  // (ein Abzieher beißt, wenn von seiner Haut etwas im Ergebnis steht: die Wand des Lochs)
  const beisst: number[] = [];
  for (let r = 0; r < M.runOriginalID.length; r++) {
    const seite = seiteVon(M.runOriginalID[r]!);
    laeufe.push(seite);
    if (seite.abzieher && M.runIndex[r + 1]! > M.runIndex[r]! && !beisst.includes(seite.id)) beisst.push(seite.id);
    for (let i = M.runIndex[r]!; i < M.runIndex[r + 1]!; i += 3) triLauf[i / 3] = r;
  }
  const pos = new Float32Array(3 * V);
  const nor = new Float32Array(3 * V);
  const hoehe = new Float32Array(V);
  const blatt = new Float32Array(2 * V);
  const dehnung = new Float32Array(V);
  // (jeder Punkt mit Werten gehört zu Dreiecken einer Herkunft)
  const punktLauf = new Int32Array(V).fill(-1);
  for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) punktLauf[tri[3 * t + k]!] = triLauf[t]!;
  // Die Normalen kommen, wie sie hineingingen: an einem Spiegelbild noch ungespiegelt, an einer abgezogenen Fläche noch nach
  // außen. Hier werden sie gerichtet: erst mit der Abbildung ihres Laufs (das Spiegelbild), dann je Lauf nach der Fläche selbst
  // (zeigen sie gegen die Dreiecke, ist es die Rückseite: umdrehen).
  const A = M.runTransform;
  for (let v = 0; v < V; v++) {
    const o = PROP * v;
    pos[3 * v] = vp[o]!;
    pos[3 * v + 1] = vp[o + 1]!;
    pos[3 * v + 2] = vp[o + 2]!;
    let n0 = vp[o + 3]!;
    let n1 = vp[o + 4]!;
    let n2 = vp[o + 5]!;
    const r = punktLauf[v]!;
    if (r >= 0 && A && A.length >= 12 * (r + 1)) {
      const a = 12 * r;
      const x = A[a]! * n0 + A[a + 3]! * n1 + A[a + 6]! * n2;
      const y = A[a + 1]! * n0 + A[a + 4]! * n1 + A[a + 7]! * n2;
      const z = A[a + 2]! * n0 + A[a + 5]! * n1 + A[a + 8]! * n2;
      n0 = x;
      n1 = y;
      n2 = z;
    }
    const l = Math.hypot(n0, n1, n2) || 1;
    nor[3 * v] = n0 / l;
    nor[3 * v + 1] = n1 / l;
    nor[3 * v + 2] = n2 / l;
    hoehe[v] = vp[o + 6]!;
    blatt[2 * v] = vp[o + 7]!;
    blatt[2 * v + 1] = vp[o + 8]!;
    dehnung[v] = vp[o + 9]!;
  }
  const stimme = new Float64Array(laeufe.length);
  for (let t = 0; t < T; t++) {
    const a = 3 * tri[3 * t]!;
    const b = 3 * tri[3 * t + 1]!;
    const c = 3 * tri[3 * t + 2]!;
    const ux = pos[b]! - pos[a]!;
    const uy = pos[b + 1]! - pos[a + 1]!;
    const uz = pos[b + 2]! - pos[a + 2]!;
    const vx = pos[c]! - pos[a]!;
    const vy = pos[c + 1]! - pos[a + 1]!;
    const vz = pos[c + 2]! - pos[a + 2]!;
    stimme[triLauf[t]!]! += (uy * vz - uz * vy) * (nor[a]! + nor[b]! + nor[c]!) + (uz * vx - ux * vz) * (nor[a + 1]! + nor[b + 1]! + nor[c + 1]!) + (ux * vy - uy * vx) * (nor[a + 2]! + nor[b + 2]! + nor[c + 2]!);
  }
  for (let v = 0; v < V; v++) {
    const r = punktLauf[v]!;
    if (r < 0 || stimme[r]! >= 0) continue;
    nor[3 * v] = -nor[3 * v]!;
    nor[3 * v + 1] = -nor[3 * v + 1]!;
    nor[3 * v + 2] = -nor[3 * v + 2]!;
  }
  // die Kanten mit ihren zwei Dreiecken (Streutafel über die zwei Enden, Punkte gleicher Lage als einer)
  const H = 3 * T;
  let G = 16;
  while (G < H) G <<= 1;
  const maske = G - 1;
  const tafel = new Int32Array(G).fill(-1);
  const K: Kanten = { a: new Int32Array(H), b: new Int32Array(H), t1: new Int32Array(H), t2: new Int32Array(H), n: 0 };
  for (let t = 0; t < T; t++)
    for (let k = 0; k < 3; k++) {
      const p = gleich[tri[3 * t + k]!]!;
      const q = gleich[tri[3 * t + ((k + 1) % 3)]!]!;
      if (p === q) continue;
      const a = p < q ? p : q;
      const b = p < q ? q : p;
      let h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) & maske;
      for (;;) {
        const e = tafel[h]!;
        if (e < 0) {
          tafel[h] = K.n;
          K.a[K.n] = a;
          K.b[K.n] = b;
          K.t1[K.n] = t;
          K.t2[K.n] = -1;
          K.n++;
          break;
        }
        if (K.a[e] === a && K.b[e] === b && K.t2[e]! < 0) {
          K.t2[e] = t;
          break;
        }
        h = (h + 1) & maske;
      }
    }
  const nahtKanten: number[] = [];
  for (let e = 0; e < K.n; e++) if (K.t2[e]! >= 0 && triLauf[K.t1[e]!] !== triLauf[K.t2[e]!]) nahtKanten.push(e);
  runden(pos, nor, tri, gleich, triLauf, laeufe, K, nahtKanten);
  const naht: number[] = [];
  for (const e of nahtKanten) {
    const a = 3 * K.a[e]!;
    const b = 3 * K.b[e]!;
    naht.push(pos[a]!, pos[a + 1]!, pos[a + 2]!, pos[b]!, pos[b + 1]!, pos[b + 2]!);
  }
  // Umrisse von den drei Achsen: Kanten zwischen einem Dreieck, das zur Achse hin zeigt, und einem, das von ihr weg zeigt
  const bits = new Uint8Array(T);
  for (let t = 0; t < T; t++) {
    const a = 3 * tri[3 * t]!;
    const b = 3 * tri[3 * t + 1]!;
    const c = 3 * tri[3 * t + 2]!;
    const ux = pos[b]! - pos[a]!;
    const uy = pos[b + 1]! - pos[a + 1]!;
    const uz = pos[b + 2]! - pos[a + 2]!;
    const vx = pos[c]! - pos[a]!;
    const vy = pos[c + 1]! - pos[a + 1]!;
    const vz = pos[c + 2]! - pos[a + 2]!;
    bits[t] = (uy * vz - uz * vy > 0 ? 1 : 0) | (uz * vx - ux * vz > 0 ? 2 : 0) | (ux * vy - uy * vx > 0 ? 4 : 0);
  }
  const umriss: [number[], number[], number[]] = [[], [], []];
  for (let e = 0; e < K.n; e++) {
    const t2 = K.t2[e]!;
    if (t2 < 0) continue;
    const wechsel = bits[K.t1[e]!]! ^ bits[t2]!;
    if (!wechsel) continue;
    const a = 3 * K.a[e]!;
    const b = 3 * K.b[e]!;
    for (let x = 0; x < 3; x++) if (wechsel & (1 << x)) umriss[x]!.push(pos[a]!, pos[a + 1]!, pos[a + 2]!, pos[b]!, pos[b + 1]!, pos[b + 2]!);
  }
  return { netz: { pos, normal: nor, index: Uint32Array.from(tri), hoehe, blatt, dehnung }, naht, umriss, beisst };
}

/** Ein Auftrag: alle Körper schneiden und als ein Netz für die Anzeige zurückgeben. */
export function verbundRechnen(w: Wasm, auftrag: VerbundAuftrag, speicher: VerbundSpeicher): VerbundErgebnis {
  const t0 = performance.now();
  const leer = (mehr: Partial<VerbundErgebnis>): VerbundErgebnis => ({
    nr: auftrag.nr,
    netz: null,
    naht: new Float32Array(0),
    umriss: [new Float32Array(0), new Float32Array(0), new Float32Array(0)],
    beisst: [],
    fehlt: [],
    dehnungRest: 0,
    ms: performance.now() - t0,
    ...mehr,
  });
  const { Manifold } = w;
  const temp: ManifoldT[] = [];
  try {
    if (auftrag.alle) speicher.leeren(new Set(auftrag.alle));
    const eintrag = new Map<number, Eintrag>();
    const teilVon = new Map<number, VerbundTeil>();
    const fehlt: number[] = [];
    for (const teil of auftrag.teile) {
      teilVon.set(teil.id, teil);
      const e = speicher.holen(teil.id, teil.schl) ?? (teil.netz ? speicher.anlegen(w, teil) : null);
      if (e) eintrag.set(teil.id, e);
      else fehlt.push(teil.id);
    }
    if (fehlt.length) return leer({ fehlt });
    const seiteVon = (orig: number): Seite => {
      const id = speicher.objektVon(orig);
      const t = id === undefined ? undefined : teilVon.get(id);
      return t ? { id: t.id, abzieher: t.abzieher, rund: t.rund } : { id: -1, abzieher: false, rund: 0 };
    };
    const stuecke: Stueck[] = [];
    const beisst = new Set<number>();
    for (const k of auftrag.koerper) {
      const halten = k.halten.map((id) => eintrag.get(id)!.m);
      if (!halten.length) continue;
      let u = halten[0]!;
      if (halten.length > 1) temp.push((u = Manifold.union(halten)));
      if (k.abziehen.length) temp.push((u = Manifold.difference([u, ...k.abziehen.map((id) => eintrag.get(id)!.m)])));
      if (u.isEmpty()) {
        // (alles weggenommen: Die Abzieher bleiben als solche zu sehen)
        for (const id of k.abziehen) beisst.add(id);
        continue;
      }
      const st = nachbearbeiten(u.getMesh(), seiteVon);
      for (const id of st.beisst) beisst.add(id);
      stuecke.push(st);
    }
    // alle Körper in ein Netz
    let N = 0;
    let I = 0;
    let nN = 0;
    const nU = [0, 0, 0];
    for (const s of stuecke) {
      N += s.netz.pos.length / 3;
      I += s.netz.index.length;
      nN += s.naht.length;
      for (let x = 0; x < 3; x++) nU[x]! += s.umriss[x]!.length;
    }
    if (!N) return leer({ beisst: [...beisst] });
    const netz: VerbundNetz = { pos: new Float32Array(3 * N), normal: new Float32Array(3 * N), index: new Uint32Array(I), hoehe: new Float32Array(N), blatt: new Float32Array(2 * N), dehnung: new Float32Array(N) };
    const naht = new Float32Array(nN);
    const umriss: [Float32Array, Float32Array, Float32Array] = [new Float32Array(nU[0]!), new Float32Array(nU[1]!), new Float32Array(nU[2]!)];
    let v0 = 0;
    let i0 = 0;
    let n0 = 0;
    const u0 = [0, 0, 0];
    let rest = 0;
    for (const s of stuecke) {
      const n = s.netz;
      netz.pos.set(n.pos, 3 * v0);
      netz.normal.set(n.normal, 3 * v0);
      netz.hoehe.set(n.hoehe, v0);
      netz.blatt.set(n.blatt, 2 * v0);
      netz.dehnung.set(n.dehnung, v0);
      for (let i = 0; i < n.index.length; i++) netz.index[i0 + i] = n.index[i]! + v0;
      for (let i = 0; i < n.dehnung.length; i++) rest = Math.max(rest, Math.abs(n.dehnung[i]! - 1));
      naht.set(s.naht, n0);
      for (let x = 0; x < 3; x++) {
        umriss[x]!.set(s.umriss[x]!, u0[x]!);
        u0[x]! += s.umriss[x]!.length;
      }
      v0 += n.pos.length / 3;
      i0 += n.index.length;
      n0 += s.naht.length;
    }
    return { nr: auftrag.nr, netz, naht, umriss, beisst: [...beisst], fehlt: [], dehnungRest: rest, ms: performance.now() - t0 };
  } catch (e) {
    return leer({ fehler: e instanceof Error ? e.message : String(e) });
  } finally {
    for (const m of temp) m.delete();
  }
}
