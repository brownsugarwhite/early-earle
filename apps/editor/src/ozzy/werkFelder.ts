/**
 * Ozzy, C4 (18.11.2026): Felder. Ein Feld ist die Haut zwischen Linien, wie eine Fläche in Blender (Florian, 17.11.: „Bei Flächen
 * meine ich A“). Die Linien teilen die Haut: Ihre Ketten im Netz (auch die der gespiegelten Hälfte) sind Kanten, über die ein Feld
 * nicht hinausreicht. Gewählt meint ein Feld die Punkte der Linien auf seinem Rand; es ist also eine Auswahl von Punkten des Werks
 * (`werk.G.auswahl`), dazu die Tönung seiner Dreiecke in der Anzeige. Sein Spiegelbild gehört immer dazu (dieselben Punkte).
 *
 * Ein gewähltes Feld überlebt Züge und Netzwechsel über seine Saat: einen Ort auf der Haut tief in seinem Inneren. Nach jedem
 * Netzwechsel wird es von dort neu gefüllt. Es bleibt gewählt, solange alle Punkte seines Rands gewählt sind; ändert sich die
 * Auswahl des Werks anders (ein Klick auf einen Punkt, das Lasso, Esc), fällt die Tönung weg.
 */
import { type Ansicht, istSichtbar } from '@ee/shape/dicht';
import * as werk from '../form/werk';

type V3 = { x: number; y: number; z: number };

/** was je Netz und Stand der Linien einmal gerechnet wird */
type Karte = {
  haut: typeof werk.haut;
  kenn: string;
  /** je Dreieck und Kante e (von Ecke e zu Ecke e + 1): das Dreieck gegenüber (−1: keins) */
  nachbar: Int32Array;
  /** je Dreieck und Kante: Liegt sie auf einer Linie? */
  aufLinie: Uint8Array;
  /** Kante (kleinere Nummer · n + größere) → Linien, auf denen sie liegt: Nummer des Loops und Probe j (die Kante j → j + 1) */
  linien: Map<number, { li: number; j: number }[]>;
  /** je Dreieck sein Spiegelbild (−1: keins); erst gerechnet, wenn ein Feld gefüllt wird */
  spiegel: Int32Array | null;
};

export type FeldTreffer = { tri: number; ort: V3 };
type Feld = {
  karte: Karte;
  /** Stand der Punkte der Linien, für den `punkte` gilt */
  punkteKenn: string;
  /** das Dreieck der Saat und ihr Ort (für das Netz danach) */
  tri: number;
  saat: V3;
  /** je Dreieck 1: gehört zum Feld oder zu seinem Spiegelbild */
  drin: Uint8Array;
  /** die sichtbaren Punkte der Linien auf dem Rand */
  punkte: werk.Wahl[];
};

const kanteNr = (a: number, b: number, n: number): number => (a < b ? a * n + b : b * n + a);
const schl = (w: werk.Wahl): string => `${w.l}.${w.i}`;
const linienKenn = (): string => werk.loops.map((l) => `${l.id}:${l.art}:${l.proben.length}`).join('|');
const punkteKennJetzt = (): string => werk.loops.map((l) => `${l.id}:${l.punkte.length}`).join('|');

export class WerkFelder {
  /** die gewählten Felder */
  private felder: Feld[] = [];
  /** zählt jede Änderung der getönten Dreiecke (für die Puffer der Anzeige) */
  nr = 0;
  private k: Karte | null = null;
  private anzeige: { von: Uint32Array; nr: number; index: Uint32Array | null } | null = null;

  get anzahl(): number {
    return this.felder.length;
  }

  private karte(): Karte {
    const haut = werk.haut;
    const kenn = linienKenn();
    if (this.k && this.k.haut === haut && this.k.kenn === kenn) return this.k;
    const n = haut.n;
    const tri = haut.tri;
    const T = tri.length / 3;
    const nachbar = new Int32Array(3 * T).fill(-1);
    const erste = new Map<number, number>();
    for (let t = 0; t < T; t++)
      for (let e = 0; e < 3; e++) {
        const k = kanteNr(tri[3 * t + e]!, tri[3 * t + ((e + 1) % 3)]!, n);
        const g = erste.get(k);
        if (g === undefined) erste.set(k, 3 * t + e);
        else {
          nachbar[3 * t + e] = Math.floor(g / 3);
          nachbar[g] = t;
        }
      }
    // die Ketten der Linien im Netz, auch die der gespiegelten Hälfte (wie `WerkHaut.anlegen`)
    const linien = new Map<number, { li: number; j: number }[]>();
    werk.loops.forEach((l, li) => {
      if (!l.proben.every((q) => q.ecken[0] === q.ecken[1] && q.ecken[1] === q.ecken[2])) return;
      const kette = l.proben.map((q) => q.ecken[0]);
      const m = kette.length;
      for (let j = 0; j < (l.art === 'ring' ? m - 1 : m); j++) {
        const j2 = (j + 1) % m;
        for (const sp of l.art === 'mitte' ? [false] : [false, true]) {
          const a = sp ? haut.spiegel[kette[j]!]! : kette[j]!;
          const b = sp ? haut.spiegel[kette[j2]!]! : kette[j2]!;
          if (a < 0 || b < 0 || a === b) continue;
          const k = kanteNr(a, b, n);
          const liste = linien.get(k);
          if (!liste) linien.set(k, [{ li, j }]);
          else if (!liste.some((x) => x.li === li && x.j === j)) liste.push({ li, j });
        }
      }
    });
    const aufLinie = new Uint8Array(3 * T);
    if (linien.size) for (let t = 0; t < T; t++) for (let e = 0; e < 3; e++) if (linien.has(kanteNr(tri[3 * t + e]!, tri[3 * t + ((e + 1) % 3)]!, n))) aufLinie[3 * t + e] = 1;
    this.k = { haut, kenn, nachbar, aufLinie, linien, spiegel: null };
    return this.k;
  }

  private spiegelDreiecke(K: Karte): Int32Array {
    if (K.spiegel) return K.spiegel;
    const tri = K.haut.tri;
    const sp = K.haut.spiegel;
    const T = tri.length / 3;
    const drei = (a: number, b: number, c: number): string => {
      const lo = Math.min(a, b, c);
      const hi = Math.max(a, b, c);
      return `${lo},${a + b + c - lo - hi},${hi}`;
    };
    const wo = new Map<string, number>();
    for (let t = 0; t < T; t++) wo.set(drei(tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!), t);
    const aus = new Int32Array(T).fill(-1);
    for (let t = 0; t < T; t++) {
      const a = sp[tri[3 * t]!]!;
      const b = sp[tri[3 * t + 1]!]!;
      const c = sp[tri[3 * t + 2]!]!;
      if (a < 0 || b < 0 || c < 0) continue;
      aus[t] = wo.get(drei(a, b, c)) ?? -1;
    }
    K.spiegel = aus;
    return aus;
  }

  /**
   * Das Dreieck der Haut unter dem Ort (X, Y) im Blatt der Ansicht `a`, von der Seite `vorn` der Achse gesehen (+1 oder −1): das
   * vorderste. null: daneben, oder in der Pose (dort liegt die gezeigte Haut anders).
   */
  treffer(a: Ansicht, X: number, Y: number, vorn: number): FeldTreffer | null {
    if (werk.grund) return null;
    const P = werk.haut.pos;
    const tri = werk.haut.tri;
    // Blatt wie `werk.imBlatt`; die Tiefe längs der Achse: Seite z, Front x, Top y
    const iu = a === 'front' ? 2 : 0;
    const iv = a === 'top' ? 2 : 1;
    const sv = a === 'top' ? 1 : -1;
    const it = a === 'seite' ? 2 : a === 'front' ? 0 : 1;
    let best = -1;
    let bt = -Infinity;
    let w: [number, number, number] = [0, 0, 0];
    for (let t = 0; t < tri.length; t += 3) {
      const i0 = 3 * tri[t]!;
      const i1 = 3 * tri[t + 1]!;
      const i2 = 3 * tri[t + 2]!;
      const u0 = P[i0 + iu]!;
      const u1 = P[i1 + iu]!;
      const u2 = P[i2 + iu]!;
      if ((X < u0 && X < u1 && X < u2) || (X > u0 && X > u1 && X > u2)) continue;
      const v0 = sv * P[i0 + iv]!;
      const v1 = sv * P[i1 + iv]!;
      const v2 = sv * P[i2 + iv]!;
      if ((Y < v0 && Y < v1 && Y < v2) || (Y > v0 && Y > v1 && Y > v2)) continue;
      const d = (v1 - v2) * (u0 - u2) + (u2 - u1) * (v0 - v2);
      if (Math.abs(d) < 1e-12) continue;
      const w0 = ((v1 - v2) * (X - u2) + (u2 - u1) * (Y - v2)) / d;
      const w1 = ((v2 - v0) * (X - u2) + (u0 - u2) * (Y - v2)) / d;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-9 || w1 < -1e-9 || w2 < -1e-9) continue;
      const tiefe = vorn * (w0 * P[i0 + it]! + w1 * P[i1 + it]! + w2 * P[i2 + it]!);
      if (tiefe > bt) {
        bt = tiefe;
        best = t / 3;
        w = [w0, w1, w2];
      }
    }
    if (best < 0) return null;
    const e = [3 * tri[3 * best]!, 3 * tri[3 * best + 1]!, 3 * tri[3 * best + 2]!];
    const ort = { x: 0, y: 0, z: 0 };
    for (let c = 0; c < 3; c++) {
      ort.x += w[c]! * P[e[c]!]!;
      ort.y += w[c]! * P[e[c]! + 1]!;
      ort.z += w[c]! * P[e[c]! + 2]!;
    }
    return { tri: best, ort };
  }

  /** das Feld um das Dreieck `tri0`: gefüllt bis an die Linien, mit Spiegelbild, Saat und den Punkten auf seinem Rand */
  private fuellen(tri0: number): Feld {
    const K = this.karte();
    const tri = K.haut.tri;
    const n = K.haut.n;
    const T = tri.length / 3;
    const drin = new Uint8Array(T);
    // vom Rand nach innen: Die Reihenfolge, in der die Dreiecke erreicht werden, gibt die Tiefe im Feld; zuerst nur füllen
    const feld: number[] = [tri0];
    drin[tri0] = 1;
    const rand = new Map<number, Set<number>>();
    const randDreiecke: number[] = [];
    for (let q = 0; q < feld.length; q++) {
      const t = feld[q]!;
      let amRand = false;
      for (let e = 0; e < 3; e++) {
        if (K.aufLinie[3 * t + e]) {
          amRand = true;
          for (const x of K.linien.get(kanteNr(tri[3 * t + e]!, tri[3 * t + ((e + 1) % 3)]!, n)) ?? []) {
            const s = rand.get(x.li);
            if (s) s.add(x.j);
            else rand.set(x.li, new Set([x.j]));
          }
          continue;
        }
        const g = K.nachbar[3 * t + e]!;
        if (g >= 0 && !drin[g]) {
          drin[g] = 1;
          feld.push(g);
        }
      }
      if (amRand) randDreiecke.push(t);
    }
    // die Saat: das Dreieck, das vom Rand aus zuletzt erreicht wird (tief im Feld; ohne Rand das getroffene)
    let saatTri = tri0;
    if (randDreiecke.length) {
      const besucht = new Uint8Array(T);
      const reihe = [...randDreiecke];
      for (const t of reihe) besucht[t] = 1;
      for (let q = 0; q < reihe.length; q++) {
        const t = reihe[q]!;
        saatTri = t;
        for (let e = 0; e < 3; e++) {
          const g = K.nachbar[3 * t + e]!;
          if (g >= 0 && drin[g] && !besucht[g] && !K.aufLinie[3 * t + e]) {
            besucht[g] = 1;
            reihe.push(g);
          }
        }
      }
    }
    // das Spiegelbild gehört dazu
    const sp = this.spiegelDreiecke(K);
    for (const t of feld) {
      const s = sp[t]!;
      if (s >= 0) drin[s] = 1;
    }
    const f: Feld = { karte: K, punkteKenn: '', tri: saatTri, saat: this.mitteVon(saatTri), drin, punkte: [] };
    this.punkteLesen(f, rand);
    return f;
  }

  /** die sichtbaren Punkte der Linien auf dem Rand: Ein Punkt liegt auf dem Rand, wenn es die Kante der Kette ist, auf der er sitzt */
  private punkteLesen(f: Feld, rand: Map<number, Set<number>>): void {
    const aus: werk.Wahl[] = [];
    for (const [li, S] of rand) {
      const l = werk.loops[li];
      if (!l) continue;
      const m = l.s.length;
      const zu = l.art !== 'ring';
      const eps = 1e-6 * Math.max(1, l.laenge);
      l.punkte.forEach((p, i) => {
        if (!istSichtbar(p)) return;
        // die Kante j → j + 1, auf der der Punkt sitzt (die letzte Probe mit s ≤ seiner Stelle)
        let j = 0;
        for (let x = 1; x < m; x++) if (l.s[x]! <= p.s + eps) j = x;
        const davor = j > 0 ? j - 1 : zu ? m - 1 : -1;
        const danach = j + 1 < m ? j + 1 : zu ? 0 : -1;
        const aufProbe = Math.abs(p.s - l.s[j]!) <= eps;
        const aufNaechster = danach >= 0 && Math.abs((danach > j ? l.s[danach]! : l.laenge) - p.s) <= eps;
        if (S.has(j) || (aufProbe && davor >= 0 && S.has(davor)) || (aufNaechster && S.has(danach))) aus.push({ l: l.id, i });
      });
    }
    f.punkte = aus;
    f.punkteKenn = punkteKennJetzt();
  }

  /** die Kanten der Linien auf dem Rand eines gefüllten Felds (je Loop die Proben j) */
  private randVon(f: Feld): Map<number, Set<number>> {
    const K = f.karte;
    const tri = K.haut.tri;
    const n = K.haut.n;
    const rand = new Map<number, Set<number>>();
    for (let t = 0; t < f.drin.length; t++) {
      if (!f.drin[t]) continue;
      for (let e = 0; e < 3; e++) {
        if (!K.aufLinie[3 * t + e]) continue;
        for (const x of K.linien.get(kanteNr(tri[3 * t + e]!, tri[3 * t + ((e + 1) % 3)]!, n)) ?? []) {
          const s = rand.get(x.li);
          if (s) s.add(x.j);
          else rand.set(x.li, new Set([x.j]));
        }
      }
    }
    return rand;
  }

  private mitteVon(t: number): V3 {
    const P = werk.haut.pos;
    const tri = werk.haut.tri;
    const m = { x: 0, y: 0, z: 0 };
    for (let e = 0; e < 3; e++) {
      const v = 3 * tri[3 * t + e]!;
      m.x += P[v]! / 3;
      m.y += P[v + 1]! / 3;
      m.z += P[v + 2]! / 3;
    }
    return m;
  }

  /** Gehört das Dreieck zu einem gewählten Feld (oder zu dessen Spiegelbild)? */
  istGewaehlt(tri: number): boolean {
    this.nachfuehren();
    return this.felder.some((f) => f.drin[tri] === 1);
  }

  /**
   * Das Feld um das Dreieck wählen: allein, oder mit `dazu` zur Auswahl dazu (ein schon gewähltes fällt mit `dazu` wieder heraus).
   * Die Punkte auf seinem Rand werden die Auswahl des Werks. Zurück: was geschah ('leer': Das Feld hat keinen Punkt auf seinem Rand).
   */
  waehlen(tri: number, dazu = false): 'gewaehlt' | 'abgewaehlt' | 'leer' {
    this.nachfuehren();
    const da = this.felder.findIndex((f) => f.drin[tri] === 1);
    if (dazu && da >= 0) {
      const weg = this.felder[da]!;
      this.felder.splice(da, 1);
      // seine Punkte fallen aus der Auswahl, soweit kein anderes gewähltes Feld sie braucht
      const bleibt = new Set(this.felder.flatMap((f) => f.punkte.map(schl)));
      const fort = new Set(weg.punkte.map(schl).filter((k) => !bleibt.has(k)));
      werk.G.auswahl = werk.G.auswahl.filter((w) => !fort.has(schl(w)));
      this.nr++;
      return 'abgewaehlt';
    }
    const f = this.fuellen(tri);
    if (f.punkte.length === 0) return 'leer';
    if (!dazu) {
      this.felder = [f];
      werk.G.auswahl = f.punkte.map((w) => ({ ...w }));
    } else {
      this.felder.push(f);
      const im = new Set(werk.G.auswahl.map(schl));
      werk.G.auswahl = [...werk.G.auswahl, ...f.punkte.filter((w) => !im.has(schl(w))).map((w) => ({ ...w }))];
    }
    this.nr++;
    return 'gewaehlt';
  }

  leeren(): void {
    if (this.felder.length) this.nr++;
    this.felder = [];
  }

  /**
   * Je Bild, solange Felder gewählt sind: Nach einem Netzwechsel wird jedes von seiner Saat aus neu gefüllt; die Saat wandert mit der
   * Haut; ein Feld, dessen Randpunkte nicht mehr alle gewählt sind, ist nicht mehr gewählt.
   */
  nachfuehren(): void {
    if (this.felder.length === 0) return;
    if (werk.grund) {
      this.leeren();
      return;
    }
    const K = this.karte();
    const pk = punkteKennJetzt();
    const gewaehlt = new Set(werk.G.auswahl.map(schl));
    const ganze = new Set(werk.G.auswahl.filter((w) => w.i < 0).map((w) => w.l));
    const vorher = this.felder.length;
    let geaendert = false;
    this.felder = this.felder.filter((f) => {
      if (f.karte !== K) {
        // ein neues Netz (oder Linien dazu, weg): von der Saat aus neu
        const t = this.naechstes(f.saat);
        if (t < 0) return false;
        let g = this.fuellen(t);
        // Liegt an der Saat jetzt ein anderes Feld (nach ⌘Z steht die Form wieder, wo sie war, die Saat nicht), und die Punkte von
        // vorher sind noch gewählt: das Feld mit genau diesen Punkten auf dem Rand suchen
        const alt = new Set(f.punkte.map(schl));
        const gleich = (x: Feld): boolean => x.punkte.length === alt.size && x.punkte.every((w) => alt.has(schl(w)));
        if (f.punkteKenn === pk && !gleich(g) && f.punkte.every((w) => gewaehlt.has(schl(w)) || ganze.has(w.l))) g = this.mitPunkten(alt, gleich) ?? g;
        f.karte = g.karte;
        f.tri = g.tri;
        f.saat = g.saat;
        f.drin = g.drin;
        f.punkte = g.punkte;
        f.punkteKenn = g.punkteKenn;
        geaendert = true;
      } else {
        f.saat = this.mitteVon(f.tri);
        if (f.punkteKenn !== pk) this.punkteLesen(f, this.randVon(f));
      }
      return f.punkte.length > 0 && f.punkte.every((w) => gewaehlt.has(schl(w)) || ganze.has(w.l));
    });
    if (geaendert || this.felder.length !== vorher) this.nr++;
  }

  /** das Feld, für das `gleich` gilt, unter denen, die an eine Linie der Punkte `punkte` („Loop.Punkt“) grenzen (höchstens 60 Versuche) */
  private mitPunkten(punkte: ReadonlySet<string>, gleich: (f: Feld) => boolean): Feld | null {
    const K = this.karte();
    const tri = K.haut.tri;
    const n = K.haut.n;
    const T = tri.length / 3;
    const ids = new Set([...punkte].map((k) => Number(k.split('.')[0])));
    const loops = new Set(werk.loops.map((l, li) => (ids.has(l.id) ? li : -1)).filter((li) => li >= 0));
    const gesehen = new Uint8Array(T);
    let versuche = 0;
    for (let t = 0; t < T && versuche < 60; t++) {
      if (gesehen[t]) continue;
      let grenzt = false;
      for (let e = 0; e < 3 && !grenzt; e++) if (K.aufLinie[3 * t + e]) grenzt = (K.linien.get(kanteNr(tri[3 * t + e]!, tri[3 * t + ((e + 1) % 3)]!, n)) ?? []).some((x) => loops.has(x.li));
      if (!grenzt) continue;
      versuche++;
      const f = this.fuellen(t);
      for (let x = 0; x < T; x++) if (f.drin[x]) gesehen[x] = 1;
      if (gleich(f)) return f;
    }
    return null;
  }

  /** das Dreieck, dessen Mitte dem Ort am nächsten liegt */
  private naechstes(o: V3): number {
    const P = werk.haut.pos;
    const tri = werk.haut.tri;
    let best = -1;
    let bd = Infinity;
    for (let t = 0; t < tri.length; t += 3) {
      const a = 3 * tri[t]!;
      const b = 3 * tri[t + 1]!;
      const c = 3 * tri[t + 2]!;
      const d = Math.hypot((P[a]! + P[b]! + P[c]!) / 3 - o.x, (P[a + 1]! + P[b + 1]! + P[c + 1]!) / 3 - o.y, (P[a + 2]! + P[b + 2]! + P[c + 2]!) / 3 - o.z);
      if (d < bd) {
        bd = d;
        best = t / 3;
      }
    }
    return best;
  }

  /**
   * Die getönten Dreiecke für die glatte Anzeige: `index` sind ihre Dreiecke nach `stufen` Stufen der Verfeinerung (je Dreieck des
   * Netzes 4^stufen feine, hintereinander, `GlattPlan`). null: nichts gewählt, oder die Anzeige zeigt ein anderes Netz.
   */
  anzeigeIndex(index: Uint32Array, stufen: number): Uint32Array | null {
    if (this.felder.length === 0) return null;
    const A = this.anzeige;
    if (A && A.von === index && A.nr === this.nr) return A.index;
    const T = werk.haut.tri.length / 3;
    const je = 3 * 4 ** stufen;
    let aus: Uint32Array | null = null;
    if (index.length === T * je && this.felder.every((f) => f.drin.length === T)) {
      let zahl = 0;
      for (let t = 0; t < T; t++) if (this.felder.some((f) => f.drin[t])) zahl++;
      aus = new Uint32Array(zahl * je);
      let o = 0;
      for (let t = 0; t < T; t++) {
        if (!this.felder.some((f) => f.drin[t])) continue;
        aus.set(index.subarray(t * je, (t + 1) * je), o);
        o += je;
      }
    }
    this.anzeige = { von: index, nr: this.nr, index: aus };
    return aus;
  }

  /** Für Proben: je gewähltem Feld die Zahl seiner Dreiecke (mit Spiegelbild) und die Punkte auf seinem Rand */
  stand(): { dreiecke: number; punkte: string[] }[] {
    return this.felder.map((f) => ({ dreiecke: f.drin.reduce((s, x) => s + x, 0), punkte: f.punkte.map(schl) }));
  }
}

export const werkFelder = new WerkFelder();
