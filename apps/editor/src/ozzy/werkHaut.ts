/**
 * Die Haut des Werks in Ozzy (Phase 3). Die glatte Anzeige ist dieselbe wie im Prüffenster `kurven.html` (`glattAnlegen` und
 * `glattZeigen` in `kurven.ts`, mit `GlattPlan`; bei Änderungen dort hier nachziehen): Jede Kante bekommt einen Punkt auf ihrer
 * gewölbten Kante, auf einer Linie in der Mitte ihres Pfadstücks. Dazu je Punkt die Werte der Seifenhaut (`HautNetz`), der Umriss je
 * Achse und der Pfad der Linie der Mitte. Gerechnet wird in Einheiten des Werks; Ozzy rechnet in seine Welt um (Welt = Werk / f +
 * Mitte). An der Rechnung des Werks ändert dieses Modul nichts (Florian, 16.11.): Es liest nur.
 */
import { kanteBei } from '@ee/shape/dicht';
import type { HautNetz } from '../anfang/haut';
import { GlattPlan, type LinienKante } from '../form/glattPlan';
import * as werk from '../form/werk';

/** so oft (ms) wird der Umriss höchstens neu gerechnet, während sich die Haut bewegt (S3); das letzte Bild bekommt den genauen */
const UMRISS_MS = 50;
/** Glätten der Normalen der Anzeige (wie `GLATT_RUHE` im Prüffenster, Standard 3) */
const GLATT_RUHE = 3;

type Plan = {
  index: Uint32Array;
  quelle: Int32Array;
  kenn: string;
  plan: GlattPlan;
  kanten: LinienKante[];
  wo: Map<number, number[]>;
  lagen: Float64Array;
  pfade: Float64Array;
  /** Lage im Blatt je Punkt der Anzeige (für die Muster) und Fläche je Punkt als Bezug der Dehnung */
  blattX: Float32Array;
  blattY: Float32Array;
  bezug: Float64Array;
  flaeche: Float64Array;
  dehnung: Float32Array;
};

/** Schlüssel einer Linienkante: Loop, Probe, Spiegelhälfte (wie `glattOrt` im Prüffenster) */
const ort = (li: number, j: number, sp: boolean): number => (li * 1_000_000 + j) * 2 + (sp ? 1 : 0);
const kennJetzt = (): string => `${werk.grund ? 'p' : 'g'}|${werk.loops.map((l) => `${l.id}.${l.proben.length}.${werk.exakt(l) ? 1 : 0}`).join(',')}`;

export class WerkHaut {
  /** Werk-Einheiten je Pixel der Welt und die Mitte der Form in der Welt */
  f = 1;
  mitte = { x: 0, y: 0 };
  /** das Netz für die Seifenhaut (in der Welt); neu, wenn sich die Zahl der Punkte ändert */
  netz: HautNetz | null = null;
  /** Stufen und Dauer der letzten Rechnung; wann sich die Haut zuletzt bewegt hat */
  stufen = 0;
  ms = 0;
  geaendert = 0;
  /** zählt jede neue Lage der Anzeige (für Zwischenspeicher, die an der Haut hängen: Umriss) */
  version = 0;
  private umrissSpeicher = new Map<number, { version: number; netz: HautNetz | null; seg: Float32Array; t: number }>();
  /** ein Umriss ist älter als die Haut (im Zug höchstens alle `UMRISS_MS` neu): Die Anzeige braucht noch ein Bild */
  umrissVeraltet = false;
  private p: Plan | null = null;
  private kanten: { index: Uint32Array; liste: Int32Array } | null = null;

  /** Neues Netz im Werk (nach `geometrieNeu`): Der Plan wird beim nächsten Rechnen neu angelegt */
  topologieNeu(): void {
    this.p = null;
  }

  private anlegen(I: Uint32Array): Plan {
    const haut = werk.haut;
    const n = haut.n;
    const quelle = werk.anzeigeQuelle;
    const N = quelle.length;
    const skin = (a: number, b: number): number => (a < b ? a * n + b : b * n + a);
    // Kanten der Haut auf Linien mit Pfad: von welcher Probe zu welcher, ob hart
    const linie = new Map<number, { schluessel: number; von: number; hart: boolean }>();
    werk.loops.forEach((l, li) => {
      if (!werk.exakt(l) || !l.proben.every((q) => q.ecken[0] === q.ecken[1] && q.ecken[1] === q.ecken[2])) return;
      const hd = kanteBei(l, werk.loops);
      const kette = l.proben.map((q) => q.ecken[0]);
      const m = kette.length;
      for (let j = 0; j < (l.art === 'ring' ? m - 1 : m); j++) {
        const k = (j + 1) % m;
        const hart = hd[j] === 1 && hd[k] === 1;
        for (const sp of l.art === 'mitte' ? [false] : [false, true]) {
          const a = sp ? haut.spiegel[kette[j]!]! : kette[j]!;
          const b = sp ? haut.spiegel[kette[k]!]! : kette[k]!;
          if (a < 0 || b < 0 || a === b) continue;
          const s = skin(a, b);
          if (linie.has(s)) continue;
          linie.set(s, { schluessel: ort(li, j, sp), von: a, hart });
        }
      }
    });
    const kanten: LinienKante[] = [];
    const wo = new Map<number, number[]>();
    const gesehen = new Set<number>();
    if (linie.size)
      for (let t = 0; t < I.length; t += 3)
        for (let e = 0; e < 3; e++) {
          const da = I[t + e]!;
          const db = I[t + ((e + 1) % 3)]!;
          const qa = quelle[da]!;
          const qb = quelle[db]!;
          const eintrag = linie.get(skin(qa, qb));
          if (!eintrag) continue;
          const s = da < db ? da * N + db : db * N + da;
          if (gesehen.has(s)) continue;
          gesehen.add(s);
          const liste = wo.get(eintrag.schluessel);
          if (liste) liste.push(kanten.length);
          else wo.set(eintrag.schluessel, [kanten.length]);
          kanten.push(qa === eintrag.von ? { a: da, b: db, hart: eintrag.hart } : { a: db, b: da, hart: eintrag.hart });
        }
    const fest = new Uint8Array(N);
    for (let d = 0; d < N; d++) fest[d] = werk.anzeigeKante[d]! > 0 ? 1 : 0;
    const p: Plan = {
      index: I,
      quelle,
      kenn: kennJetzt(),
      plan: new GlattPlan(I, N, fest, kanten),
      kanten,
      wo,
      lagen: new Float64Array(3 * N),
      pfade: new Float64Array(12 * kanten.length),
      blattX: new Float32Array(N),
      blattY: new Float32Array(N),
      bezug: new Float64Array(N),
      flaeche: new Float64Array(N),
      dehnung: new Float32Array(N).fill(1),
    };
    // Lage im Blatt und Bezug der Dehnung: die Haut, wie sie jetzt ist
    this.lagenLesen(p, null);
    this.bezugSetzen(p);
    return p;
  }

  /** die Lagen der Punkte der Anzeige (aus der Haut oder aus vorgegebenen Lagen der Rechenpunkte) */
  private lagenLesen(p: Plan, vorgabe: Float64Array | null): void {
    const P = vorgabe ?? werk.haut.pos;
    const L = p.lagen;
    for (let d = 0; d < p.quelle.length; d++) {
      const q = 3 * p.quelle[d]!;
      L[3 * d] = P[q]!;
      L[3 * d + 1] = P[q + 1]!;
      L[3 * d + 2] = P[q + 2]!;
    }
  }

  /** Fläche je Punkt der Anzeige (ein Drittel seiner Dreiecke) */
  private flaecheRechnen(p: Plan): void {
    const L = p.lagen;
    const I = p.index;
    const A = p.flaeche;
    A.fill(0);
    for (let t = 0; t < I.length; t += 3) {
      const a = 3 * I[t]!;
      const b = 3 * I[t + 1]!;
      const c = 3 * I[t + 2]!;
      const ux = L[b]! - L[a]!;
      const uy = L[b + 1]! - L[a + 1]!;
      const uz = L[b + 2]! - L[a + 2]!;
      const vx = L[c]! - L[a]!;
      const vy = L[c + 1]! - L[a + 1]!;
      const vz = L[c + 2]! - L[a + 2]!;
      const f = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 6;
      A[I[t]!] = A[I[t]!]! + f;
      A[I[t + 1]!] = A[I[t + 1]!]! + f;
      A[I[t + 2]!] = A[I[t + 2]!]! + f;
    }
  }

  /** Bezug der Farben: die Haut, wie sie jetzt ist (Lage im Blatt für die Muster, Fläche je Punkt für die Dehnung) */
  private bezugSetzen(p: Plan): void {
    const L = p.lagen;
    const N = p.quelle.length;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let d = 0; d < N; d++) {
      x0 = Math.min(x0, L[3 * d]!);
      x1 = Math.max(x1, L[3 * d]!);
      y0 = Math.min(y0, L[3 * d + 1]!);
      y1 = Math.max(y1, L[3 * d + 1]!);
    }
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const r = Math.max(1e-6, (x1 - x0) / 2, (y1 - y0) / 2);
    for (let d = 0; d < N; d++) {
      p.blattX[d] = (L[3 * d]! - cx) / r;
      p.blattY[d] = (L[3 * d + 1]! - cy) / r;
    }
    this.flaecheRechnen(p);
    p.bezug.set(p.flaeche);
  }

  /**
   * Die glatte Anzeige rechnen und ins Netz der Seifenhaut legen. `vorgabe`: Lagen der Rechenpunkte (3 je Punkt der Haut des Werks)
   * statt der Haut, wie sie ist (die Übergabe von der Blase). `voll`: die Stufen der Ruhe. `dt`, `beruhigen`: Der Bezug der Dehnung
   * folgt der Fläche mit dieser Zeitkonstante (s; 0: gar nicht). Zurück: Ist das Netz neu (andere Zahl der Punkte)?
   */
  rechnen(vorgabe: Float64Array | null, voll: boolean, dt = 0, beruhigen = 0): boolean {
    const I = werk.anzeigeIndex;
    if (!this.p || this.p.index !== I || this.p.quelle !== werk.anzeigeQuelle || this.p.kenn !== kennJetzt()) this.p = this.anlegen(I);
    const g = this.p;
    const t0 = performance.now();
    this.lagenLesen(g, vorgabe);
    const L = g.lagen;
    // Pfadstücke: erst jede Linienkante gerade, dann die Stücke der Loops, an die Punkte der Haut gelegt, wie sie gerade sind
    const K = g.pfade;
    g.kanten.forEach((k, i) => {
      for (let x = 0; x < 3; x++) {
        const a = L[3 * k.a + x]!;
        const b = L[3 * k.b + x]!;
        K[12 * i + x] = a;
        K[12 * i + 3 + x] = a + (b - a) / 3;
        K[12 * i + 6 + x] = b - (b - a) / 3;
        K[12 * i + 9 + x] = b;
      }
    });
    const vorher = werk.G.glattVoll;
    werk.G.glattVoll = voll;
    const stufen = werk.glattStufen(I.length / 3);
    werk.G.glattVoll = vorher;
    if (g.kanten.length && stufen > 0)
      werk.loops.forEach((l, li) => {
        const stuecke = werk.pfadStuecke(l, li);
        if (!stuecke) return;
        for (const e of stuecke)
          for (const sp of l.art === 'mitte' ? [0] : [0, 1]) {
            const plaetze = g.wo.get(ort(li, e.ja, sp === 1));
            if (!plaetze) continue;
            const c = e.k.map((q) => [q.x, q.y, sp ? -q.z : q.z] as const);
            for (const i of plaetze) {
              const k = g.kanten[i]!;
              for (let x = 0; x < 3; x++) {
                K[12 * i + 3 + x] = c[1]![x]! + (L[3 * k.a + x]! - c[0]![x]!);
                K[12 * i + 6 + x] = c[2]![x]! + (L[3 * k.b + x]! - c[3]![x]!);
              }
            }
          }
      });
    const fein = g.plan.rechnen(L, K, stufen, GLATT_RUHE);
    const index = g.plan.index(stufen);
    // Dehnung je Punkt der Anzeige (der Bezug folgt langsam), weitergereicht in die feinen Punkte
    this.flaecheRechnen(g);
    const k = dt > 0 && beruhigen > 0 ? 1 - Math.exp(-dt / beruhigen) : 0;
    for (let d = 0; d < g.flaeche.length; d++) {
      if (k > 0) g.bezug[d] = g.bezug[d]! + (g.flaeche[d]! - g.bezug[d]!) * k;
      g.dehnung[d] = g.flaeche[d]! / Math.max(1e-9, g.bezug[d]!);
    }
    const n = fein.pos.length / 3;
    let neu = false;
    if (!this.netz || this.netz.pos.length !== fein.pos.length || this.netz.index !== index) {
      this.netz = {
        pos: new Float32Array(3 * n),
        normal: new Float32Array(3 * n),
        index,
        hoehe: new Float32Array(n),
        seite: new Float32Array(n),
        blatt: new Float32Array(2 * n),
        dehnung: new Float32Array(n),
        sicht: new Float32Array(n).fill(1),
      };
      neu = true;
    }
    const z = this.netz;
    const f = this.f;
    let zMax = 1e-6;
    for (let v = 0; v < n; v++) zMax = Math.max(zMax, Math.abs(fein.pos[3 * v + 2]!));
    const bx = g.plan.weiterreichen(stufen, g.blattX);
    const by = g.plan.weiterreichen(stufen, g.blattY);
    const de = g.plan.weiterreichen(stufen, g.dehnung);
    for (let v = 0; v < n; v++) {
      const wz = fein.pos[3 * v + 2]!;
      z.pos[3 * v] = fein.pos[3 * v]! / f + this.mitte.x;
      z.pos[3 * v + 1] = fein.pos[3 * v + 1]! / f + this.mitte.y;
      z.pos[3 * v + 2] = wz / f;
      z.hoehe[v] = Math.abs(wz) / zMax;
      z.seite[v] = wz >= 0 ? 1 : -1;
      z.blatt[2 * v] = bx[v]!;
      z.blatt[2 * v + 1] = by[v]!;
      z.dehnung[v] = de[v]!;
    }
    z.normal.set(fein.nor);
    this.stufen = stufen;
    this.ms = performance.now() - t0;
    if (!voll) this.geaendert = performance.now();
    this.version++;
    return neu;
  }

  /** Lassen sich in der Ruhe mehr Stufen zeigen? */
  feinerMoeglich(): boolean {
    return !!this.p && this.stufen < werk.glattZiel(this.p.index.length / 3);
  }

  /** Umriss der glatten Anzeige von einer Achse (0 = x, Front; 1 = y, Top; 2 = z, Seite): Strecken in der Welt, je 6 Zahlen */
  umriss(achse: 0 | 1 | 2, eilig = false): Float32Array {
    // nur neu, wenn sich die Haut seit dem letzten Mal bewegt hat (S3: vorher jedes Bild aus dem feinen Netz); während sich die Haut
    // bewegt (`eilig`) höchstens alle UMRISS_MS, und dann ist er veraltet, bis das nächste Bild ihn holt
    const alt = this.umrissSpeicher.get(achse);
    if (alt && alt.version === this.version && alt.netz === this.netz) return alt.seg;
    const jetzt = performance.now();
    if (alt && eilig && alt.netz === this.netz && jetzt - alt.t < UMRISS_MS) {
      this.umrissVeraltet = true;
      return alt.seg;
    }
    // Front und Top in einem Durchgang (dieselben Dreiecke, dieselben Kanten)
    const beide = achse !== 2 ? this.umrissRechnen([0, 1]) : this.umrissRechnen([2]);
    beide.forEach((seg, k) => this.umrissSpeicher.set(achse !== 2 ? k : 2, { version: this.version, netz: this.netz, seg, t: jetzt }));
    return this.umrissSpeicher.get(achse)!.seg;
  }

  private umrissRechnen(achsen: (0 | 1 | 2)[]): Float32Array[] {
    const z = this.netz;
    if (!z) return achsen.map(() => new Float32Array(0));
    const I = z.index;
    const P = z.pos;
    if (!this.kanten || this.kanten.index !== I) {
      const karte = new Map<number, number>();
      const liste: number[] = [];
      const m = P.length / 3;
      for (let t = 0; t < I.length / 3; t++)
        for (let k = 0; k < 3; k++) {
          const a = I[t * 3 + k]!;
          const b = I[t * 3 + ((k + 1) % 3)]!;
          const s = Math.min(a, b) * m + Math.max(a, b);
          const vorher = karte.get(s);
          if (vorher === undefined) {
            karte.set(s, liste.length / 4);
            liste.push(a, b, t, -1);
          } else liste[vorher * 4 + 3] = t;
        }
      this.kanten = { index: I, liste: Int32Array.from(liste) };
    }
    const nT = I.length / 3;
    // je Dreieck ein Bit je Achse: zeigt seine Fläche zur Achse hin
    const bits = new Uint8Array(nT);
    for (let t = 0; t < nT; t++) {
      const a = I[t * 3]! * 3;
      const b = I[t * 3 + 1]! * 3;
      const c = I[t * 3 + 2]! * 3;
      const ux = P[b]! - P[a]!;
      const uy = P[b + 1]! - P[a + 1]!;
      const uz = P[b + 2]! - P[a + 2]!;
      const vx = P[c]! - P[a]!;
      const vy = P[c + 1]! - P[a + 1]!;
      const vz = P[c + 2]! - P[a + 2]!;
      bits[t] = (uy * vz - uz * vy > 0 ? 1 : 0) | (uz * vx - ux * vz > 0 ? 2 : 0) | (ux * vy - uy * vx > 0 ? 4 : 0);
    }
    const ausListen: number[][] = achsen.map(() => []);
    const masken = achsen.map((x) => 1 << x);
    const K = this.kanten.liste;
    for (let e = 0; e < K.length; e += 4) {
      const t2 = K[e + 3]!;
      if (t2 < 0) continue;
      const wechsel = bits[K[e + 2]!]! ^ bits[t2]!;
      if (!wechsel) continue;
      const a = K[e]! * 3;
      const b = K[e + 1]! * 3;
      for (let k = 0; k < achsen.length; k++) if (wechsel & masken[k]!) ausListen[k]!.push(P[a]!, P[a + 1]!, P[a + 2]!, P[b]!, P[b + 1]!, P[b + 2]!);
    }
    return ausListen.map((l) => Float32Array.from(l));
  }

  /** Ausdehnung der Haut des Werks in der Welt, um die Mitte (für den Raum) */
  masse(): { rx: number; ry: number; tiefe: number } {
    const P = werk.haut.pos;
    let rx = 0;
    let ry = 0;
    let tiefe = 0;
    for (let i = 0; i < P.length; i += 3) {
      rx = Math.max(rx, Math.abs(P[i]! / this.f));
      ry = Math.max(ry, Math.abs(P[i + 1]! / this.f));
      tiefe = Math.max(tiefe, Math.abs(P[i + 2]! / this.f));
    }
    return { rx, ry, tiefe };
  }
}

/** Die Linie der Mitte (die Silhouette im Werk), wenn es sie gibt */
export function mitteLinie(): { l: (typeof werk.loops)[number]; li: number } | null {
  const li = werk.loops.findIndex((l) => l.art === 'mitte');
  return li < 0 ? null : { l: werk.loops[li]!, li };
}

/**
 * Pfad und Punkte der Linie der Mitte in der Welt (z = 0), wie das Prüffenster sie zeichnet (`pfadKurven`: im Zug die Punkte des Zugs
 * und seine Griffe). `schritte` Abtastungen je Stück. Zurück: Lagen des Pfads (x, y je Paar) und der sichtbaren Punkte mit ihrer Nummer.
 */
export function mittePfad(f: number, mx: number, my: number, schritte = 16): { pfad: number[]; punkte: { i: number; x: number; y: number }[] } | null {
  const m = mitteLinie();
  if (!m) return null;
  const { l, li } = m;
  const P = l.punkte;
  const n = P.length;
  if (n < 2 || !P.every((p) => p.ein && p.aus)) return null;
  const zug = werk.zug;
  const neu = zug ? zug.griffeNeu[li] : null;
  const lage = (p: (typeof P)[number]): { x: number; y: number } => (zug && !zug.griff ? p.cur : p.ref);
  const pfad: number[] = [];
  for (let i = 0; i < n; i++) {
    const A = P[i]!;
    const E = P[(i + 1) % n]!;
    const a = lage(A);
    const e = lage(E);
    const ga = neu?.[i]?.aus ?? A.aus!;
    const gb = neu?.[(i + 1) % n]?.ein ?? E.ein!;
    const c1 = { x: a.x + ga.x, y: a.y + ga.y };
    const c2 = { x: e.x + gb.x, y: e.y + gb.y };
    for (let j = 0; j < schritte; j++) {
      const t = j / schritte;
      const u = 1 - t;
      const b0 = u * u * u;
      const b1 = 3 * u * u * t;
      const b2 = 3 * u * t * t;
      const b3 = t * t * t;
      pfad.push((b0 * a.x + b1 * c1.x + b2 * c2.x + b3 * e.x) / f + mx, (b0 * a.y + b1 * c1.y + b2 * c2.y + b3 * e.y) / f + my);
    }
  }
  const punkte = P.map((p, i) => ({ i, p }))
    .filter(({ p }) => !p.vonSelbst)
    .map(({ i, p }) => ({ i, x: lage(p).x / f + mx, y: lage(p).y / f + my }));
  return { pfad, punkte };
}
