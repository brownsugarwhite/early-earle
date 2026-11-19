/**
 * Ozzy, Paint-Modus, Etappe 2 (19.11.2026): die Farblinien als Modell für das Verhalten der Linien-Studie (`src/linien/verhalten.ts`,
 * Schnittstelle `Raum`, wie `werkBlatt.ts` für die Linien der Form). Im Paint-Modus gehören A und P den Farblinien: Dieselben
 * Schwellen, Tropfen, Nadeln und derselbe Faden, nur an einem anderen Modell.
 *
 * Je Bild (`bauen`) werden die Farblinien der aktiven Ebene auf den Bildschirm gelegt: ihre Punkte als Punkte des Netzes, ihre
 * Orte als Proben (mit Tiefe: Die Anzeige verdeckt je Bildpunkt, was hinter dem Körper liegt; gegriffen wird nur, was zum Betrachter
 * zeigt). Gezeichnet und gezogen wird direkt auf der Form: Ein Bildschirmpunkt wird über den Strahl der Kamera ein Ort auf der Haut.
 * Richtungen sind Vektoren in der Haut (`kurve.ts`); ein Griff auf dem Bildschirm wird die Richtung, deren Bild er ist (wie
 * `griffVektor` in der Vorlage `src/linien/raum.ts`). Die Kurve zwischen zwei Punkten ist `stueckLegen`.
 *
 * Werkzeug P (wie `Raum3D` in der Vorlage): Der Entwurf lebt hier, bis er fertig ist; dann wird er eine Farblinie der Bemalung
 * (ein Schritt für ⌘Z). Anders als Linien der Form darf eine Farblinie offen enden: ↩ beendet sie, wie sie ist; ein Klick auf den
 * ersten Punkt schließt sie.
 *
 * Stand: Punkte setzen, Richtungen ziehen, Faden, Schließen, ⌫, Esc; Punkte ziehen und löschen, ein Punkt mit P auf die
 * Farblinie; Richtungen drehen (Nadel, Ring, Knick und rund). Noch nicht: ein Stück an der Linie ziehen, das Spiegelbild greifen,
 * die Mitte.
 */
import { type Linie, type LinienProben, type Netz as LinienNetz, type Punkt, type Stueck, armGriff } from '../../linien/netz';
import { type DrehBild, Dreher2D, type RichtungZiel } from '../../linien/richtung';
import type { EntwurfInfo, FadenEnde, FadenProben, StiftOrt, V2 } from '../../linien/stift';
import type { Raum, Ziel } from '../../linien/verhalten';
import { type Farblinie, aktiveEbene } from './bemalung';
import type { FarbWerk, HautJetzt } from './farbwerk';
import { type FarbPunkt, richtungAus, richtungVektor, stueckLegen } from './kurve';
import { type Karte, type Ort, type V3, dreieckNormale, ortGespiegelt, ortIn, ortLage } from './ort';
import { strahlAufNetz } from './treffer';

/** was das Blatt je Bild von der Ansicht braucht */
export type Sicht = {
  /** Projektion · Ansicht und Ansicht allein (Spalten, wie three) */
  vp: ArrayLike<number>;
  ansicht: ArrayLike<number>;
  /** Größe des Bilds (CSS-Pixel: die Einheit des Netzes) */
  W: number;
  H: number;
  /** Strahl durch einen Bildpunkt (Welt) */
  strahl(x: number, y: number): { o: V3; d: V3 };
  /** das Auge (Welt); null: gleichgerichtete Strahlen längs `blick` */
  auge: V3 | null;
  blick: V3;
  /** Umlaufsinn der Dreiecke von außen gesehen (1: Ihre Normale zeigt nach außen) */
  wicklung: number;
  /** halbe Breite einer Farblinie (Einheiten des Netzes) und wie weit etwas hinter der Haut liegen darf (Tiefe, Welt) */
  halb: number;
  duldung: number;
};

/** ein Punkt, wie das Blatt ihn führt: Ort, Richtungen als Vektoren (Einheiten des Werks), Knick */
type BPunkt = { ort: Ort; ein: V3 | null; aus: V3 | null; knick: boolean };
/**
 * Eine Farblinie, wie das Netz sie zeigt: ihre Punkte und je Stück die Orte dazwischen; `id` < 0: der Entwurf. `m`: das Spiegelbild
 * einer Farblinie (an einer gespiegelten Form): Es wird gezeigt und gegriffen wie sie; was an ihm geschieht, geht gespiegelt an sie.
 */
type Zeile = { id: number; m: boolean; zu: boolean; punkte: BPunkt[]; teile: Ort[][] };
/** der Entwurf mit P: die Zeile, dazu der Griff, mit dem das nächste Stück den letzten Punkt verlässt, und der am ersten für den Schluss */
type Entwurf = { z: Zeile; aus: V3 | null; einErster: V3 | null; stapel: { z: Zeile; aus: V3 | null; einErster: V3 | null }[] };

const ortKopie = (o: Ort): Ort => ({ t: o.t, e: [o.e[0], o.e[1], o.e[2]], w: [o.w[0], o.w[1], o.w[2]] });
const vKopie = (v: V3 | null): V3 | null => (v ? [v[0], v[1], v[2]] : null);
const zeileKopie = (z: Zeile): Zeile => ({
  id: z.id,
  m: z.m,
  zu: z.zu,
  punkte: z.punkte.map((p) => ({ ort: ortKopie(p.ort), ein: vKopie(p.ein), aus: vKopie(p.aus), knick: p.knick })),
  teile: z.teile.map((t) => t.map(ortKopie)),
});
const lang = (v: V3 | null): number => (v ? Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) : 0);
/** ein Griff zählt erst ab dieser Länge (Einheiten des Werks) */
const GRIFF_MIN = 1e-6;
const griff = (v: V3 | null): V3 | null => (lang(v) > GRIFF_MIN ? v : null);

export class FarbBlatt implements Raum {
  /** das Netz für das Verhalten (dieselben zwei Objekte in jedem Bild, ihr Inhalt wird ersetzt) */
  readonly netz: LinienNetz = { punkte: [], linien: [] };
  proben: LinienProben[] = [];
  /** je Punkt des Netzes: welche Zeile und welcher ihrer Punkte */
  anker: { z: number; k: number }[] = [];
  /** wechselt, wenn sich der Aufbau des Netzes ändert (Zahl der Linien und Punkte): Dann vergisst das Verhalten seine Tropfen */
  struktur = '';
  /** nach einem Handgriff, der die Bemalung geändert hat (ein Schritt für ⌘Z steht bereit): Ozzy trägt ihn in den Rückweg ein */
  nachSchritt: () => void = () => {};
  /** der letzte so eingetragene Schritt gilt doch nicht (ein Klick, der den Punkt kaum bewegt hat): Ozzy nimmt ihn aus dem Rückweg */
  schrittWeg: () => void = () => {};

  private zeilen: Zeile[] = [];
  private h: HautJetzt | null = null;
  private sicht: Sicht | null = null;
  private ent: Entwurf | null = null;
  /** der laufende Zug an Punkten: ihre Lagen im Bild beim Drücken; `gemerkt`: Der Schritt für ⌘Z ist angelegt */
  private zug: { punkte: { z: number; k: number; x: number; y: number }[]; gemerkt: boolean } | null = null;
  private klickRueck = false;
  /** der eben beendete Zug hat einen Schritt angelegt (ein Klick nimmt ihn über `rueckgaengig` wieder zurück) */
  private zugSchritt = false;

  constructor(private readonly fw: FarbWerk) {}

  get entwurfOffen(): boolean {
    return this.ent !== null;
  }

  // ---------- Bildschirm und Haut ----------

  /** Welt → Bildschirm (CSS-Pixel) und Tiefe zum Betrachter */
  private schirm(p: V3): [number, number, number] {
    const S = this.sicht!;
    const m = S.vp;
    const x = m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2] + m[12]!;
    const y = m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2] + m[13]!;
    const w = m[3]! * p[0] + m[7]! * p[1] + m[11]! * p[2] + m[15]!;
    const a = S.ansicht;
    return [((x / w + 1) / 2) * S.W, ((1 - y / w) / 2) * S.H, -(a[2]! * p[0] + a[6]! * p[1] + a[10]! * p[2] + a[14]!)];
  }

  /** die Lage eines Orts in der Welt (auf der glatten Anzeige) */
  private welt(o: Ort): V3 {
    return this.fw.lageImRaum(this.h!, o);
  }

  /** zeigt die Haut am Ort zum Betrachter? */
  private vorn(o: Ort, w: V3): boolean {
    const S = this.sicht!;
    const h = this.h!;
    const n = dreieckNormale(h.haut.pos, h.haut.tri, o.t);
    const b: V3 = S.auge ? [w[0] - S.auge[0], w[1] - S.auge[1], w[2] - S.auge[2]] : S.blick;
    return S.wicklung * (n[0] * b[0] + n[1] * b[1] + n[2] * b[2]) < 0;
  }

  /** der Ort auf der Haut unter einem Bildschirmpunkt; `genau`: auf der glatten Anzeige (sonst auf dem Rechennetz: für jedes Bild billig) */
  private ortUnter(x: number, y: number, genau: boolean): Ort | null {
    const h = this.h;
    const S = this.sicht;
    if (!h || !S) return null;
    const { o, d } = S.strahl(x, y);
    if (genau) return this.fw.ortUnterStrahl(h, o, d);
    const ow: V3 = [(o[0] - h.mitte.x) * h.f, (o[1] - h.mitte.y) * h.f, o[2] * h.f];
    const tr = strahlAufNetz(h.haut.pos, h.haut.tri, ow, d);
    return tr ? ortIn(h.haut, tr.f, tr.w0, tr.w1, tr.w2) : null;
  }

  // ---------- die Mitte (gespiegelte Form) ----------

  private mitteGemerkt: { haut: object; version: number; kanten: Int32Array } | null = null;
  /** die Kanten des Rechennetzes in der Spiegelebene: je Kante das Dreieck auf der Hälfte z ≥ 0 und die Nummer seiner Ecke gegenüber */
  private mitteKanten(): Int32Array {
    const h = this.h!;
    const g = this.mitteGemerkt;
    if (g && g.haut === h.haut && g.version === h.version) return g.kanten;
    const P = h.haut.pos;
    const I = h.haut.tri;
    const aus: number[] = [];
    if (h.gespiegelt)
      for (let t = 0; t < I.length / 3; t++) {
        for (let e = 0; e < 3; e++) {
          const a = I[3 * t + e]!;
          const b = I[3 * t + ((e + 1) % 3)]!;
          const c = I[3 * t + ((e + 2) % 3)]!;
          if (P[3 * a + 2] === 0 && P[3 * b + 2] === 0 && P[3 * c + 2]! > 0) aus.push(t, (e + 2) % 3);
        }
      }
    const kanten = Int32Array.from(aus);
    this.mitteGemerkt = { haut: h.haut, version: h.version, kanten };
    return kanten;
  }

  /** liegt der Ort auf der Spiegelebene (auf einer Kante dort: das Gewicht der Ecke gegenüber ist null)? */
  private aufMitte(o: Ort): boolean {
    const h = this.h!;
    if (!h.gespiegelt) return false;
    const P = h.haut.pos;
    for (let i = 0; i < 3; i++) if (o.w[i] === 0 && P[3 * o.e[(i + 1) % 3]! + 2] === 0 && P[3 * o.e[(i + 2) % 3]! + 2] === 0) return true;
    return false;
  }

  /** der Ort auf der Spiegelebene, der einem Ort am nächsten liegt (im Raum), oder null (keine gespiegelte Form) */
  private zurMitte(o: Ort): Ort | null {
    const h = this.h!;
    const K = this.mitteKanten();
    if (!K.length) return null;
    const P = h.haut.pos;
    const I = h.haut.tri;
    const p = ortLage(P, o);
    let best: Ort | null = null;
    let bestD = Infinity;
    for (let i = 0; i < K.length; i += 2) {
      const t = K[i]!;
      const f = K[i + 1]!;
      const a = I[3 * t + ((f + 1) % 3)]!;
      const b = I[3 * t + ((f + 2) % 3)]!;
      const ax = P[3 * a]!;
      const ay = P[3 * a + 1]!;
      const ex = P[3 * b]! - ax;
      const ey = P[3 * b + 1]! - ay;
      const l2 = ex * ex + ey * ey;
      if (!(l2 > 0)) continue;
      const u = Math.min(1, Math.max(0, ((p[0] - ax) * ex + (p[1] - ay) * ey) / l2));
      const dx = p[0] - ax - u * ex;
      const dy = p[1] - ay - u * ey;
      const d = dx * dx + dy * dy + p[2] * p[2];
      if (d >= bestD) continue;
      bestD = d;
      const w: [number, number, number] = [0, 0, 0];
      w[(f + 1) % 3] = 1 - u;
      w[(f + 2) % 3] = u;
      best = { t, e: [I[3 * t]!, I[3 * t + 1]!, I[3 * t + 2]!], w };
    }
    return best;
  }

  /**
   * Die Enden einer offenen Zeile, die auf der Mitte liegen, stehen im Dreieck der Hälfte, auf der die Farblinie dort läuft (ein Ort
   * auf der Mitte gehört zu beiden Hälften; `zurMitte` gibt ihn auf der Hälfte z ≥ 0)
   */
  private endenRichten(z: Zeile): void {
    const h = this.h!;
    if (z.zu || !h.gespiegelt || z.punkte.length < 2) return;
    const P = h.haut.pos;
    const I = h.haut.tri;
    const seite = (o: Ort): number => (P[3 * I[3 * o.t]! + 2]! + P[3 * I[3 * o.t + 1]! + 2]! + P[3 * I[3 * o.t + 2]! + 2]! >= 0 ? 1 : -1);
    const m = z.punkte.length;
    for (const [k, nachbar] of [
      [0, z.teile[0]?.[0] ?? z.punkte[1]!.ort],
      [m - 1, z.teile[m - 2]?.[z.teile[m - 2]!.length - 1] ?? z.punkte[m - 2]!.ort],
    ] as const) {
      const p = z.punkte[k]!;
      if (!this.aufMitte(p.ort) || seite(p.ort) === seite(nachbar)) continue;
      const g = ortGespiegelt(this.fw.karteFuer(h), p.ort);
      if (g) p.ort = g;
    }
  }

  /** so nah (Einheiten des Netzes) rastet ein neuer Punkt auf der Mitte ein */
  fangMitte = 9;

  /** der Ort unter dem Zeiger, auf der Mitte eingerastet, wenn sie nah genug liegt (und zum Betrachter zeigt) */
  private ortMitFang(x: number, y: number, genau: boolean): { ort: Ort; x: number; y: number; mitte: boolean } | null {
    const o = this.ortUnter(x, y, genau);
    if (!o) return null;
    const m = this.zurMitte(o);
    if (m) {
      const w = this.welt(m);
      const s = this.schirm(w);
      if (Math.hypot(s[0] - x, s[1] - y) < this.fangMitte && this.vorn(m, w)) return { ort: m, x: s[0], y: s[1], mitte: true };
    }
    return { ort: o, x, y, mitte: false };
  }

  /** ein Griff auf dem Bildschirm (vom Punkt aus) als Vektor in der Haut am Ort (Einheiten des Werks): sein Bild ist der Griff */
  private griffVektor(o: Ort, v: V2): V3 | null {
    if (Math.hypot(v[0], v[1]) < 1e-9) return null;
    const h = this.h!;
    const S = this.sicht!;
    const A = this.welt(o);
    const s = this.schirm(A);
    const n0 = dreieckNormale(h.haut.pos, h.haut.tri, o.t);
    const n: V3 = [S.wicklung * n0[0], S.wicklung * n0[1], S.wicklung * n0[2]];
    const { o: so, d } = S.strahl(s[0] + v[0], s[1] + v[1]);
    const nenner = d[0] * n[0] + d[1] * n[1] + d[2] * n[2];
    let g: V3;
    if (Math.abs(nenner) > 0.15) {
      const t = ((A[0] - so[0]) * n[0] + (A[1] - so[1]) * n[1] + (A[2] - so[2]) * n[2]) / nenner;
      g = [so[0] + t * d[0] - A[0], so[1] + t * d[1] - A[1], so[2] + t * d[2] - A[2]];
    } else {
      // fast von der Kante gesehen: in der Ebene quer zum Blick verschoben, dann in die Haut gelegt
      const t = (A[0] - so[0]) * d[0] + (A[1] - so[1]) * d[1] + (A[2] - so[2]) * d[2];
      const q: V3 = [so[0] + t * d[0] - A[0], so[1] + t * d[1] - A[1], so[2] + t * d[2] - A[2]];
      const qn = q[0] * n[0] + q[1] * n[1] + q[2] * n[2];
      g = [q[0] - qn * n[0], q[1] - qn * n[1], q[2] - qn * n[2]];
    }
    return [g[0] * h.f, g[1] * h.f, g[2] * h.f];
  }

  /** das Bild einer Richtung auf dem Bildschirm (vom Punkt aus) */
  private griffImBild(o: Ort, g: V3 | null): V2 {
    if (!g) return [0, 0];
    const h = this.h!;
    const A = this.welt(o);
    const a = this.schirm(A);
    const b = this.schirm([A[0] + g[0] / h.f, A[1] + g[1] / h.f, A[2] + g[2] / h.f]);
    return [b[0] - a[0], b[1] - a[1]];
  }

  /** die Orte der Kurve von A nach B (ohne die zwei) */
  private legen(A: BPunkt, gA: V3 | null, B: BPunkt, gB: V3 | null): Ort[] {
    const h = this.h!;
    return stueckLegen(h.haut, this.fw.naechster(h), A.ort, griff(gA), B.ort, griff(gB));
  }

  // ---------- von der Bemalung zum Netz ----------

  private zeileVon(l: Farblinie): Zeile {
    const pos = this.h!.haut.pos;
    const m = l.punkte.length;
    const punkte: BPunkt[] = l.punkte.map((q) => {
      const ort = l.stuetzen[q.i]!;
      return { ort, ein: q.ein ? richtungVektor(pos, ort, q.ein) : null, aus: q.aus ? richtungVektor(pos, ort, q.aus) : null, knick: q.knick };
    });
    const teile: Ort[][] = [];
    const n = l.zu ? m : m - 1;
    for (let k = 0; k < n; k++) teile.push(l.stuetzen.slice(l.punkte[k]!.i + 1, k + 1 < m ? l.punkte[k + 1]!.i : l.stuetzen.length));
    return { id: l.id, m: false, zu: l.zu, punkte, teile };
  }

  /** das Spiegelbild einer Zeile (jeder Ort im Spiegelbild seines Dreiecks, die Richtungen gespiegelt) oder null */
  private gespiegelt(z: Zeile, k: Karte): Zeile | null {
    const ort = (o: Ort): Ort | null => ortGespiegelt(k, o);
    const v = (g: V3 | null): V3 | null => (g ? [g[0], g[1], -g[2]] : null);
    const punkte: BPunkt[] = [];
    for (const p of z.punkte) {
      const o = ort(p.ort);
      if (!o) return null;
      punkte.push({ ort: o, ein: v(p.ein), aus: v(p.aus), knick: p.knick });
    }
    const teile: Ort[][] = [];
    for (const T of z.teile) {
      const G: Ort[] = [];
      for (const q of T) {
        const o = ort(q);
        if (!o) return null;
        G.push(o);
      }
      teile.push(G);
    }
    return { id: z.id, m: !z.m, zu: z.zu, punkte, teile };
  }

  /** die Zeilen aus der Bemalung: jede Farblinie und, an einer gespiegelten Form, ihr Spiegelbild */
  private zeilenLesen(): Zeile[] {
    const h = this.h!;
    const k = h.gespiegelt ? this.fw.karteFuer(h) : null;
    const aus: Zeile[] = [];
    for (const l of aktiveEbene(this.fw.bemalung).linien) {
      const z = this.zeileVon(l);
      aus.push(z);
      const g = k?.spiegel ? this.gespiegelt(z, k) : null;
      if (g) aus.push(g);
    }
    return aus;
  }

  /** eine Zeile als Farblinie der Bemalung (ihre Orte der Reihe nach, die Richtungen im Maß ihrer Dreiecke) */
  private linieVon(z: Zeile, id: number): Farblinie {
    const pos = this.h!.haut.pos;
    const stuetzen: Ort[] = [];
    const punkte: FarbPunkt[] = [];
    const m = z.punkte.length;
    z.punkte.forEach((p, k) => {
      const hatEin = z.zu || k > 0;
      const hatAus = z.zu || k < m - 1;
      punkte.push({ i: stuetzen.length, ein: hatEin && griff(p.ein) ? richtungAus(pos, p.ort, p.ein!) : null, aus: hatAus && griff(p.aus) ? richtungAus(pos, p.ort, p.aus!) : null, knick: p.knick });
      stuetzen.push(p.ort);
      const t = z.teile[k];
      if (t) for (const o of t) stuetzen.push(o);
    });
    return { id, zu: z.zu, stuetzen, punkte };
  }

  /** je Bild: die Farblinien der aktiven Ebene (und der Entwurf) als Netz auf dem Bildschirm */
  bauen(h: HautJetzt, sicht: Sicht): void {
    this.h = h;
    this.sicht = sicht;
    this.zeilen = this.zeilenLesen();
    if (this.ent) this.zeilen.push(this.ent.z);
    this.netzFuellen();
  }

  private netzFuellen(): void {
    const S = this.sicht;
    if (!S || !this.h) return;
    const punkte: Punkt[] = [];
    const linien: Linie[] = [];
    const proben: LinienProben[] = [];
    const anker: { z: number; k: number }[] = [];
    this.zeilen.forEach((z, zi) => {
      const basis = punkte.length;
      const lagen = z.punkte.map((p) => this.welt(p.ort));
      z.punkte.forEach((p, k) => {
        const s = this.schirm(lagen[k]!);
        // (ein Punkt auf der abgewandten Seite ist nicht zu sehen und nicht zu greifen: Die Bemalung liegt auf der Haut, nicht in ihr)
        const vorn = this.vorn(p.ort, lagen[k]!);
        punkte.push({ x: s[0], y: s[1], sichtbar: vorn, verdeckt: !vorn, z: s[2] });
        anker.push({ z: zi, k });
      });
      const m = z.punkte.length;
      const n = z.teile.length;
      // (ein Entwurf mit einem Punkt ist noch keine Linie)
      if (!n) return;
      const stuecke: Stueck[] = [];
      for (let si = 0; si < n; si++) {
        const a = z.punkte[si]!;
        const b = z.punkte[(si + 1) % m]!;
        const g1 = this.griffImBild(a.ort, a.aus);
        const g2 = this.griffImBild(b.ort, b.ein);
        stuecke.push({ g1x: g1[0], g1y: g1[1], g2x: g2[0], g2y: g2[1], art: 'umriss' });
      }
      linien.push({ zu: z.zu, punkte: z.punkte.map((_, k) => basis + k), stuecke, knick: z.punkte.map((p) => p.knick) });
      // die Proben: je Stück sein Anfang (nur beim ersten), die Orte dazwischen, sein Ende
      const xs: number[] = [];
      const ys: number[] = [];
      const zs: number[] = [];
      const sis: number[] = [];
      const ts: number[] = [];
      const hinten: number[] = [];
      const dazu = (o: Ort, w: V3, si: number, t: number): void => {
        const s = this.schirm(w);
        xs.push(s[0]);
        ys.push(s[1]);
        zs.push(s[2]);
        sis.push(si);
        ts.push(t);
        hinten.push(this.vorn(o, w) ? 0 : 1);
      };
      for (let si = 0; si < n; si++) {
        const T = z.teile[si]!;
        if (si === 0) dazu(z.punkte[0]!.ort, lagen[0]!, 0, 0);
        T.forEach((o, j) => dazu(o, this.welt(o), si, (j + 1) / (T.length + 1)));
        const e = (si + 1) % m;
        dazu(z.punkte[e]!.ort, lagen[e]!, si, 1);
      }
      const N = xs.length;
      const s = new Float32Array(N);
      const stueckS = new Float32Array(n + 1);
      for (let j = 1; j < N; j++) {
        s[j] = s[j - 1]! + Math.hypot(xs[j]! - xs[j - 1]!, ys[j]! - ys[j - 1]!);
        if (ts[j] === 1) stueckS[sis[j]! + 1] = s[j]!;
      }
      proben.push({
        n: N,
        x: Float32Array.from(xs),
        y: Float32Array.from(ys),
        z: Float32Array.from(zs),
        s,
        si: Int32Array.from(sis),
        t: Float32Array.from(ts),
        halb: new Float32Array(N).fill(S.halb),
        // (hinter dem Körper verschwindet die Farblinie, statt grün durchzuscheinen)
        fein: new Float32Array(N).fill(1e-4),
        schicht: Uint8Array.from(hinten),
        laenge: N ? s[N - 1]! : 0,
        stueckS,
      });
    });
    this.netz.punkte = punkte;
    this.netz.linien = linien;
    this.proben = proben;
    this.anker = anker;
    // (der Entwurf steht hinten und zählt nicht zum Aufbau: Seine Punkte kommen dazu, ohne dass die anderen ihre Nummer wechseln)
    this.struktur = this.zeilen
      .filter((z) => z.id >= 0)
      .map((z) => `${z.id}${z.m ? 'm' : ''}.${z.punkte.length}`)
      .join(',');
  }

  /** nach einer Änderung an der Bemalung selbst: Sie wird neu abgeleitet (Flächen, Anzeige), das Netz neu gefüllt */
  private geaendert(): void {
    this.fw.geaendert();
    if (this.h && this.sicht) this.bauen(this.h, this.sicht);
  }

  /** die Farblinie der Bemalung zu einer Zeile (nicht der Entwurf) */
  private linieZu(zi: number): Farblinie | null {
    const z = this.zeilen[zi];
    if (!z || z.id < 0) return null;
    return aktiveEbene(this.fw.bemalung).linien.find((l) => l.id === z.id) ?? null;
  }

  /** eine Zeile zurück in die Bemalung schreiben (nach einem Handgriff an ihr) */
  private zeileSchreiben(zi: number): void {
    const zz = this.zeilen[zi];
    const l = this.linieZu(zi);
    if (!zz || !l) return;
    const z = zz.m ? this.gespiegelt(zz, this.fw.karteFuer(this.h!)) : zz;
    if (!z) return;
    const neu = this.linieVon(z, l.id);
    l.zu = neu.zu;
    l.stuetzen = neu.stuetzen;
    l.punkte = neu.punkte;
  }

  // ---------- Raum: greifen und ziehen ----------

  private zugBeginnen(pis: readonly number[]): void {
    const punkte: { z: number; k: number; x: number; y: number }[] = [];
    const schon = new Set<string>();
    for (const pi of pis) {
      const A = this.anker[pi];
      const p = this.netz.punkte[pi];
      const z = A ? this.zeilen[A.z] : undefined;
      if (!A || !p || !z || z.id < 0) continue;
      // (ein Punkt und sein Spiegelbild zugleich gewählt: Es zieht der erste)
      const schl = `${z.id}.${A.k}`;
      if (schon.has(schl)) continue;
      schon.add(schl);
      punkte.push({ z: A.z, k: A.k, x: p.x, y: p.y });
    }
    this.zug = { punkte, gemerkt: false };
    this.klickRueck = false;
    this.zugSchritt = false;
  }

  private zugBewegen(dx: number, dy: number): void {
    const g = this.zug;
    const h = this.h;
    if (!g || !h || !g.punkte.length) return;
    // (noch nicht bewegt: nichts zu tun, kein Schritt)
    if (!g.gemerkt && dx === 0 && dy === 0) return;
    // erst alle neuen Orte suchen: Verlässt einer die Form, bleibt alles stehen
    const neu: (Ort | null)[] = g.punkte.map((q) => {
      const o = this.ortUnter(q.x + dx, q.y + dy, true);
      // (ein Punkt auf der Mitte bleibt auf ihr: Er gleitet an ihr entlang)
      return o && this.aufMitte(this.zeilen[q.z]!.punkte[q.k]!.ort) ? this.zurMitte(o) : o;
    });
    if (neu.some((o) => !o)) return;
    if (!g.gemerkt) {
      this.fw.merken(h);
      g.gemerkt = true;
      // (die Zeilen hängen an den Orten der Bemalung: nach dem Merken dieselben Objekte)
      this.zeilen = this.zeilenLesen();
    }
    const pos = h.haut.pos;
    const betroffen = new Set<number>();
    g.punkte.forEach((q, i) => {
      const z = this.zeilen[q.z]!;
      const p = z.punkte[q.k]!;
      const o = neu[i]!;
      // die Richtungen bleiben, wie sie im Raum stehen, in die Haut am neuen Ort gelegt
      const legeUm = (v: V3 | null): V3 | null => (v ? richtungVektor(pos, o, richtungAus(pos, o, v)) : null);
      p.ein = legeUm(p.ein);
      p.aus = legeUm(p.aus);
      p.ort = o;
      betroffen.add(q.z);
    });
    for (const zi of betroffen) {
      const z = this.zeilen[zi]!;
      const m = z.punkte.length;
      const bewegt = new Set(g.punkte.filter((q) => q.z === zi).map((q) => q.k));
      for (let si = 0; si < z.teile.length; si++) {
        const b = (si + 1) % m;
        if (!bewegt.has(si) && !bewegt.has(b)) continue;
        z.teile[si] = this.legen(z.punkte[si]!, z.punkte[si]!.aus, z.punkte[b]!, z.punkte[b]!.ein);
      }
      this.endenRichten(z);
      this.zeileSchreiben(zi);
    }
    this.geaendert();
  }

  private zugEnden(): void {
    const g = this.zug;
    this.zug = null;
    if (g?.gemerkt) {
      this.zugSchritt = true;
      this.nachSchritt();
    } else this.klickRueck = true;
  }

  ziehenBeginnen(ziel: Ziel): void {
    this.zugBeginnen(ziel.art === 'punkt' ? [ziel.pi] : []);
  }
  ziehen(dx: number, dy: number): void {
    this.zugBewegen(dx, dy);
  }
  ziehenEnden(): void {
    this.zugEnden();
  }
  punkteZiehenBeginnen(pis: number[]): void {
    this.zugBeginnen(pis);
  }
  punkteZiehen(dx: number, dy: number): void {
    this.zugBewegen(dx, dy);
  }
  punkteZiehenEnden(): void {
    this.zugEnden();
  }

  stelle(ziel: Ziel): [number, number] | null {
    if (ziel.art === 'punkt' || ziel.art === 'richtung') {
      const p = this.netz.punkte[ziel.pi];
      return p ? [p.x, p.y] : null;
    }
    const st = this.probeBei(ziel.li, ziel.si, ziel.t);
    return st ? [st.x, st.y] : null;
  }

  /** die Probe der Linie li am Stück si beim Parameter t: Lage im Bild und die zwei Proben, zwischen denen sie liegt */
  private probeBei(li: number, si: number, t: number): { x: number; y: number; j: number; f: number } | null {
    const P = this.proben[li];
    if (!P || P.n === 0) return null;
    let vor = -1;
    for (let j = 0; j < P.n; j++) {
      if (P.si[j] !== si && !(j === 0 && si === 0)) continue;
      if (P.t[j]! <= t) vor = j;
      else if (vor >= 0) {
        const f = (t - P.t[vor]!) / Math.max(1e-9, P.t[j]! - P.t[vor]!);
        return { x: P.x[vor]! + f * (P.x[j]! - P.x[vor]!), y: P.y[vor]! + f * (P.y[j]! - P.y[vor]!), j: vor, f };
      }
    }
    return vor >= 0 ? { x: P.x[vor]!, y: P.y[vor]!, j: vor, f: 0 } : null;
  }

  /**
   * Werkzeug P auf der Farblinie: am Stück si beim Parameter t entsteht ein Punkt. Die Farblinie behält ihren Verlauf (ihre Orte
   * bleiben, einer von ihnen wird der Punkt); die Richtungen teilen sich wie bei einer Bézier-Kurve.
   */
  punktEinsetzen(li: number, si: number, t: number): number | null {
    const zi = this.zeileDerLinie(li);
    const z = this.zeilen[zi];
    const h = this.h;
    if (!z || z.id < 0 || !h) return null;
    const T = z.teile[si];
    if (!T || !T.length) return null;
    const m = z.punkte.length;
    const a = z.punkte[si]!;
    const b = z.punkte[(si + 1) % m]!;
    // der Ort, der dem Parameter am nächsten liegt
    const j = Math.min(T.length - 1, Math.max(0, Math.round(t * (T.length + 1)) - 1));
    const u = (j + 1) / (T.length + 1);
    this.fw.merken(h);
    this.zeilen = this.zeilenLesen();
    const zz = this.zeilen[zi]!;
    const aa = zz.punkte[si]!;
    const bb = zz.punkte[(si + 1) % m]!;
    const TT = zz.teile[si]!;
    // de Casteljau an den Kontrollpunkten im Raum: die neuen Richtungen
    const pos = h.haut.pos;
    const p0 = ortLage(pos, aa.ort);
    const p3 = ortLage(pos, bb.ort);
    const p1: V3 = aa.aus ? [p0[0] + aa.aus[0], p0[1] + aa.aus[1], p0[2] + aa.aus[2]] : p0;
    const p2: V3 = bb.ein ? [p3[0] + bb.ein[0], p3[1] + bb.ein[1], p3[2] + bb.ein[2]] : p3;
    const mi = (x: V3, y: V3): V3 => [x[0] + (y[0] - x[0]) * u, x[1] + (y[1] - x[1]) * u, x[2] + (y[2] - x[2]) * u];
    const q0 = mi(p0, p1);
    const q1 = mi(p1, p2);
    const q2 = mi(p2, p3);
    const r0 = mi(q0, q1);
    const r1 = mi(q1, q2);
    const mitte = mi(r0, r1);
    const hatGriffe = !!griff(a.aus) || !!griff(b.ein);
    const o = TT[j]!;
    const neu: BPunkt = {
      ort: o,
      ein: hatGriffe ? [r0[0] - mitte[0], r0[1] - mitte[1], r0[2] - mitte[2]] : null,
      aus: hatGriffe ? [r1[0] - mitte[0], r1[1] - mitte[1], r1[2] - mitte[2]] : null,
      knick: !hatGriffe,
    };
    if (aa.aus) aa.aus = [aa.aus[0] * u, aa.aus[1] * u, aa.aus[2] * u];
    if (bb.ein) bb.ein = [bb.ein[0] * (1 - u), bb.ein[1] * (1 - u), bb.ein[2] * (1 - u)];
    zz.punkte.splice(si + 1, 0, neu);
    zz.teile.splice(si, 1, TT.slice(0, j), TT.slice(j + 1));
    this.zeileSchreiben(zi);
    this.geaendert();
    this.nachSchritt();
    // seine Nummer im Netz
    return this.anker.findIndex((A) => A.z === zi && A.k === si + 1);
  }

  /** die Zeile zu einer Linie des Netzes (Zeilen ohne Stück stehen nicht als Linie im Netz) */
  private zeileDerLinie(li: number): number {
    let n = -1;
    for (let zi = 0; zi < this.zeilen.length; zi++) {
      if (!this.zeilen[zi]!.teile.length) continue;
      n++;
      if (n === li) return zi;
    }
    return -1;
  }

  /** gewählte Punkte löschen: Die Farblinie schließt sich über die Lücke; bleibt zu wenig, fällt sie ganz weg */
  punkteLoeschen(pis: number[]): boolean {
    const h = this.h;
    if (!h || this.ent) return false;
    // (je Farblinie: Ein Punkt und sein Spiegelbild sind derselbe; gearbeitet wird an der Zeile, die zuerst genannt ist)
    const weg = new Map<number, { zi: number; ks: Set<number> }>();
    for (const pi of pis) {
      const A = this.anker[pi];
      const z = A ? this.zeilen[A.z] : undefined;
      if (!A || !z || z.id < 0) continue;
      if (!weg.has(z.id)) weg.set(z.id, { zi: A.z, ks: new Set() });
      weg.get(z.id)!.ks.add(A.k);
    }
    if (!weg.size) return false;
    this.fw.merken(h);
    this.zeilen = this.zeilenLesen();
    const ebene = aktiveEbene(this.fw.bemalung);
    for (const { zi, ks } of weg.values()) {
      const z = this.zeilen[zi]!;
      const m = z.punkte.length;
      const bleibt = z.punkte.map((_, k) => k).filter((k) => !ks.has(k));
      // eine offene Farblinie braucht zwei Punkte, eine geschlossene drei (oder zwei mit Richtungen)
      if (bleibt.length < 2 || (z.zu && bleibt.length < 3 && !bleibt.some((k) => griff(z.punkte[k]!.aus) || griff(z.punkte[k]!.ein)))) {
        ebene.linien = ebene.linien.filter((l) => l.id !== z.id);
        continue;
      }
      const punkte = bleibt.map((k) => z.punkte[k]!);
      const teile: Ort[][] = [];
      const n = z.zu ? bleibt.length : bleibt.length - 1;
      for (let i = 0; i < n; i++) {
        const k0 = bleibt[i]!;
        const k1 = bleibt[(i + 1) % bleibt.length]!;
        // (zwischen zwei Nachbarn, die es schon waren, bleibt das Stück; sonst wird es neu gelegt)
        if ((k0 + 1) % m === k1 && z.teile[k0]) teile.push(z.teile[k0]!);
        else teile.push(this.legen(punkte[i]!, punkte[i]!.aus, punkte[(i + 1) % punkte.length]!, punkte[(i + 1) % punkte.length]!.ein));
      }
      // eine offene Farblinie, die ein Ende verliert, endet am neuen letzten Punkt
      z.punkte = punkte;
      z.teile = teile;
      this.zeileSchreiben(zi);
    }
    this.geaendert();
    this.nachSchritt();
    return true;
  }

  rueckgaengig(): boolean {
    // (ein Klick ohne Weg hat nichts geändert: nichts zurückzunehmen)
    if (this.klickRueck) {
      this.klickRueck = false;
      return true;
    }
    // ein Klick, der den Punkt um weniger als einen Klickweg bewegt hat: Der Schritt des Zugs gilt nicht
    if (this.zugSchritt && this.h) {
      this.zugSchritt = false;
      this.fw.zurueck(this.h);
      this.schrittWeg();
      this.geaendert();
      return true;
    }
    return false;
  }

  ankerZuSehen(pi: number): boolean {
    return !this.netz.punkte[pi]?.verdeckt;
  }

  bias(): number {
    return this.sicht?.duldung ?? 1e6;
  }

  // ---------- Dreher: Richtungen ----------
  // Gedreht wird im Bild, mit der Rechnung der Linien-Studie (`Dreher2D`: Winkel folgt dem Zeiger, Schwung klebt am Ring, ⌥ reißt
  // los, in die Flucht rastet ein). Was sie am Netz ändert (die zwei Griffe des Punkts, sein Knick), wird hier die Richtung in der
  // Haut, deren Bild der Griff ist; die zwei Stücke am Punkt werden neu gelegt.

  private dreher = new Dreher2D(
    () => this.netz,
    (n) => this.vomDreher(n),
  );
  private drehZiel: RichtungZiel | null = null;
  private drehGemerkt = false;

  private vomDreher(n: LinienNetz): void {
    const z = this.drehZiel;
    const h = this.h;
    if (!z || !h) return;
    const zi = this.zeileDerLinie(z.li);
    if (zi < 0 || this.zeilen[zi]!.id < 0) return;
    if (!this.drehGemerkt) {
      this.fw.merken(h);
      this.drehGemerkt = true;
      this.zeilen = this.zeilenLesen();
    }
    const zeile = this.zeilen[zi]!;
    const l = n.linien[z.li];
    const p = zeile.punkte[z.k];
    if (!l || !p) return;
    const aus = armGriff(l, z.k, 'aus');
    const ein = armGriff(l, z.k, 'ein');
    if (aus) p.aus = this.griffVektor(p.ort, aus);
    if (ein) p.ein = this.griffVektor(p.ort, ein);
    p.knick = !!l.knick?.[z.k];
    const m = zeile.punkte.length;
    const stuecke = new Set<number>();
    if (z.k < zeile.teile.length) stuecke.add(z.k);
    if (z.k > 0) stuecke.add(z.k - 1);
    else if (zeile.zu) stuecke.add(m - 1);
    for (const si of stuecke) {
      const a = zeile.punkte[si]!;
      const b = zeile.punkte[(si + 1) % m]!;
      zeile.teile[si] = this.legen(a, a.aus, b, b.ein);
    }
    this.zeileSchreiben(zi);
    this.geaendert();
  }

  drehenBeginnen(z: RichtungZiel, kippen: boolean, hebel: number): [number, number] | null {
    const zi = this.zeileDerLinie(z.li);
    if (zi < 0 || this.zeilen[zi]!.id < 0 || !this.h || this.ent) return null;
    const spitze = this.dreher.drehenBeginnen(z, kippen, hebel);
    if (!spitze) return null;
    this.drehZiel = z;
    this.drehGemerkt = false;
    return spitze;
  }
  drehenZiehen(cx: number, cy: number, alt: boolean, dt: number): void {
    this.dreher.drehenZiehen(cx, cy, alt, dt);
  }
  drehenEnden(): void {
    this.dreher.drehenEnden();
    if (this.drehGemerkt) this.nachSchritt();
    this.drehGemerkt = false;
  }
  drehBild(): DrehBild | null {
    return this.dreher.drehBild();
  }
  /** Doppelklick auf eine Richtung: Knick oder rund (beim Runden dreht `ausrichten` sie danach in die Flucht) */
  knickUmschalten(z: RichtungZiel): boolean | null {
    const zi = this.zeileDerLinie(z.li);
    if (zi < 0 || this.zeilen[zi]!.id < 0 || !this.h || this.ent) return null;
    this.drehZiel = z;
    this.drehGemerkt = false;
    const r = this.dreher.knickUmschalten(z);
    if (this.drehGemerkt) this.nachSchritt();
    return r;
  }
  ausrichten(t: number): void {
    this.dreher.ausrichten(t);
  }

  // ---------- Werkzeug P ----------

  /** die Nummer im Netz des Punkts k des Entwurfs */
  private entPunkt(k: number): number {
    const zi = this.zeilen.length - 1;
    return this.anker.findIndex((A) => A.z === zi && A.k === k);
  }

  entwurf(): EntwurfInfo | null {
    const e = this.ent;
    if (!e) return null;
    const z = e.z;
    const m = z.punkte.length;
    const erster = z.punkte[0]!;
    const letzter = z.punkte[m - 1]!;
    return {
      li: z.teile.length ? this.netz.linien.length - 1 : -1,
      zwilling: -1,
      erster: this.entPunkt(0),
      letzter: this.entPunkt(m - 1),
      anzahl: m,
      // (auf der Mitte begonnen: Ein Punkt auf der Mitte macht die Farblinie fertig; ihr Spiegelbild schließt sie)
      haengt: this.aufMitte(erster.ort),
      aus: this.griffImBild(letzter.ort, e.aus),
      einErster: this.griffImBild(erster.ort, e.einErster),
    };
  }

  ortFrei(x: number, y: number): { x: number; y: number; mitte: boolean } | null {
    const o = this.ortMitFang(x, y, false);
    return o ? { x: o.x, y: o.y, mitte: o.mitte } : null;
  }

  mittePunkte(): number[] {
    return [];
  }

  /** der Ort, an dem P ansetzt: frei unter dem Zeiger, oder dort, wo ein Punkt oder eine Linie des Netzes liegt (ein neuer Punkt an derselben Stelle) */
  private ortFuer(o: StiftOrt): Ort | null {
    if (o.art === 'frei') return this.ortMitFang(o.x, o.y, true)?.ort ?? null;
    if (o.art === 'punkt') {
      const A = this.anker[o.pi];
      const p = A ? this.zeilen[A.z]?.punkte[A.k] : undefined;
      return p ? ortKopie(p.ort) : null;
    }
    const st = this.probeBei(o.li, o.si, o.t);
    return st ? this.ortUnter(st.x, st.y, true) : null;
  }

  private entGeaendert(): void {
    if (this.h && this.sicht) {
      this.zeilen = this.zeilenLesen();
      if (this.ent) this.zeilen.push(this.ent.z);
      this.netzFuellen();
    }
  }

  beginnen(o: StiftOrt): number | null {
    if (!this.h) return null;
    const ort = this.ortFuer(o);
    if (!ort) return null;
    this.ent = { z: { id: -1, m: false, zu: false, punkte: [{ ort, ein: null, aus: null, knick: true }], teile: [] }, aus: null, einErster: null, stapel: [] };
    this.entGeaendert();
    return this.entPunkt(0);
  }

  weiter(o: StiftOrt): number | null {
    const e = this.ent;
    if (!e) return null;
    const ort = this.ortFuer(o);
    if (!ort) return null;
    e.stapel.push({ z: zeileKopie(e.z), aus: vKopie(e.aus), einErster: vKopie(e.einErster) });
    const z = e.z;
    const letzter = z.punkte[z.punkte.length - 1]!;
    const neu: BPunkt = { ort, ein: null, aus: null, knick: true };
    letzter.aus = vKopie(e.aus);
    z.teile.push(this.legen(letzter, letzter.aus, neu, null));
    z.punkte.push(neu);
    e.aus = null;
    this.entGeaendert();
    return this.entPunkt(z.punkte.length - 1);
  }

  /** das Stück, das am Punkt k des Entwurfs endet, neu legen */
  private entStueck(si: number): void {
    const z = this.ent!.z;
    const m = z.punkte.length;
    if (si < 0 || si >= z.teile.length) return;
    const a = z.punkte[si]!;
    const b = z.punkte[(si + 1) % m]!;
    z.teile[si] = this.legen(a, a.aus, b, b.ein);
  }

  griffeLetzter(aus: V2 | null, ein: V2 | null): void {
    const e = this.ent;
    if (!e) return;
    const z = e.z;
    const m = z.punkte.length;
    const A = z.punkte[m - 1]!;
    if (aus) e.aus = this.griffVektor(A.ort, aus);
    if (ein) {
      const v = this.griffVektor(A.ort, ein);
      if (m === 1) e.einErster = v;
      else {
        A.ein = v;
        this.entStueck(m - 2);
      }
    }
    this.entGeaendert();
  }

  griffeErster(aus: V2 | null, ein: V2 | null): void {
    const e = this.ent;
    if (!e) return;
    const z = e.z;
    const A = z.punkte[0]!;
    if (aus) {
      const v = this.griffVektor(A.ort, aus);
      if (z.teile.length) {
        A.aus = v;
        this.entStueck(0);
      } else e.aus = v;
    }
    if (ein) {
      e.einErster = this.griffVektor(A.ort, ein);
      if (z.zu) {
        A.ein = vKopie(e.einErster);
        this.entStueck(z.teile.length - 1);
      }
    }
    this.entGeaendert();
  }

  knickSetzen(erster: boolean, an: boolean): void {
    const e = this.ent;
    if (!e) return;
    const p = e.z.punkte[erster ? 0 : e.z.punkte.length - 1];
    if (p) p.knick = an;
  }

  letztenVerschieben(x: number, y: number): void {
    const e = this.ent;
    if (!e) return;
    const o = this.ortUnter(x, y, true);
    if (!o) return;
    const z = e.z;
    const m = z.punkte.length;
    z.punkte[m - 1]!.ort = o;
    this.entStueck(m - 2);
    this.entGeaendert();
  }

  /** `aufErstem`: mit einem Klick auf den ersten Punkt (die Farblinie schließt sich); sonst mit ↩ beendet: Sie bleibt offen */
  schliessen(aufErstem?: boolean): void {
    const e = this.ent;
    if (!e || !aufErstem || e.z.punkte.length < 2) return;
    const z = e.z;
    const m = z.punkte.length;
    const letzter = z.punkte[m - 1]!;
    const erster = z.punkte[0]!;
    letzter.aus = vKopie(e.aus);
    erster.ein = vKopie(e.einErster);
    z.teile.push(this.legen(letzter, letzter.aus, erster, erster.ein));
    z.zu = true;
    e.aus = null;
    this.entGeaendert();
  }

  /** der Entwurf wird eine Farblinie der Bemalung; Ergebnis: ihre Nummer im Netz (−1: nichts entstanden) */
  fertig(): number {
    const e = this.ent;
    const h = this.h;
    this.ent = null;
    if (!e || !h || e.z.punkte.length < 2 || (e.z.zu && e.z.punkte.length < 3 && !e.z.punkte.some((p) => griff(p.aus) || griff(p.ein)))) {
      this.entGeaendert();
      return -1;
    }
    this.fw.merken(h);
    const b = this.fw.bemalung;
    this.endenRichten(e.z);
    aktiveEbene(b).linien.push(this.linieVon(e.z, b.naechste++));
    this.geaendert();
    this.nachSchritt();
    return this.netz.linien.length - 1;
  }

  abbrechen(): void {
    this.ent = null;
    this.entGeaendert();
  }

  zurueck(): boolean {
    const e = this.ent;
    if (!e) return false;
    const s = e.stapel.pop();
    if (!s) {
      this.abbrechen();
      return false;
    }
    e.z = s.z;
    e.aus = s.aus;
    e.einErster = s.einErster;
    this.entGeaendert();
    return true;
  }

  faden(ende: FadenEnde, _gEnde: V2): FadenProben | null {
    const e = this.ent;
    const h = this.h;
    if (!e || !h) return null;
    const z = e.z;
    const A = z.punkte[z.punkte.length - 1]!;
    let B: BPunkt;
    let gB: V3 | null = null;
    if (ende.art === 'schluss') {
      B = z.punkte[0]!;
      gB = e.einErster;
    } else {
      const o = ende.art === 'frei' ? this.ortUnter(ende.x, ende.y, false) : this.ortFuer(ende);
      if (!o) return null;
      B = { ort: o, ein: null, aus: null, knick: true };
    }
    const orte = [A.ort, ...this.legen(A, e.aus, B, gB), B.ort];
    const n = orte.length;
    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const zz = new Float32Array(n);
    const s = new Float32Array(n);
    const welt = new Float64Array(3 * n);
    orte.forEach((o, i) => {
      const w = this.welt(o);
      const q = this.schirm(w);
      x[i] = q[0];
      y[i] = q[1];
      zz[i] = q[2];
      welt.set(w, 3 * i);
      if (i) s[i] = s[i - 1]! + Math.hypot(x[i]! - x[i - 1]!, y[i]! - y[i - 1]!);
    });
    return { n, x, y, z: zz, s, laenge: s[n - 1]!, welt };
  }
}
