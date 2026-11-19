/**
 * Ozzy, Paint-Modus, Etappe 1 (19.11.2026): das Farbwerk. Es hält die Bemalung des aktiven Objekts und alles, was daraus abgeleitet
 * wird, und folgt der Haut des Werks: je Bild `schritt` (Netzwechsel erkennen und die Orte übergeben, Flächen neu rechnen, die
 * Anzeige nachziehen). Ozzy (`main.ts`) gibt ihm, was es vom Werk braucht (`HautJetzt`), und ruft seine Handgriffe; am Werk und am
 * Rechenkern ändert es nichts.
 *
 * ⌘Z: Jeder Handgriff am Bemalen merkt den Stand davor (`merken`); Ozzy stellt ihn in den gemeinsamen Rückweg. Geht das Werk selbst
 * einen Schritt zurück und stellt dabei ein älteres Netz wieder her, kommt die Bemalung zurück, wie sie auf diesem Netz war (`jeNetz`).
 */
import type { HautNetz } from '../../anfang/haut';
import { FarbAnzeige } from './anzeige';
import { type Bemalung, type BemalungDatei, type Farbe, aktiveEbene, alsDatei, ausDatei, giltFuer, istLeer, kopie, leereBemalung, linienAusTreffern, uebergeben } from './bemalung';
import { feinBei } from './fein';
import { type Flaechen, type Saat, flaechenRechnen } from './flaechen';
import { kettenAller, stueckeVon } from './ketten';
import { type Karte, type Naechster, type Netz, type Ort, type V3, karteVon, ortGespiegelt, ortLage } from './ort';
import { ParallelTreffer, ortAusFein, strahlAufNetz } from './treffer';

/** die Haut des Werks, wie das Farbwerk sie je Bild sieht */
export type HautJetzt = {
  /** die Haut der Rechnung (`werk.haut`): Lagen in Einheiten des Werks, Dreiecke, Spiegelpaare */
  haut: Netz & { pos: Float64Array; tri: Uint32Array };
  /** eine gespiegelte Form (jeder Punkt hat seinen Partner): Gemalt wird auf der Hälfte z ≥ 0, das Spiegelbild kommt dazu */
  gespiegelt: boolean;
  /** die glatte Anzeige dieser Haut (in der Welt) auf der Stufe `stufen`, und ihr Zähler der Lagen */
  netz: HautNetz | null;
  stufen: number;
  version: number;
  /** Welt = Werk / f + Mitte */
  f: number;
  mitte: { x: number; y: number };
};

/** ein Anker einer Zeichnung auf einem Blatt (wie `werk.StiftAnker`): Ort im Blatt und Griff nach vorn */
export type BlattAnker = { X: number; Y: number; aus: [number, number] | null };
export type Achse = 'seite' | 'front' | 'top';

/** was ein ruhendes Objekt von seiner Bemalung behält */
export type FarbStand = { bemalung: Bemalung; haut: HautJetzt['haut'] | null };

type Schritt = { vorher: Bemalung; haut: HautJetzt['haut'] };

/** dieselben Dreiecke (dann gelten die Orte weiter, auch wenn das Werk ein anderes Objekt für die Haut hat: Pose, ⌘Z ohne Netzwechsel) */
function gleicheDreiecke(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export class FarbWerk {
  bemalung: Bemalung = leereBemalung();
  readonly anzeige = new FarbAnzeige();
  private haut: HautJetzt['haut'] | null = null;
  private tri: ArrayLike<number> | null = null;
  private karte: Karte | null = null;
  private gespiegelt = false;
  /** abgeleitet: neu zu rechnen */
  private alt = true;
  private flaechen: Flaechen | null = null;
  private farben: Farbe[] = [];
  private gezeigt = -1;
  private schritte: Schritt[] = [];
  /** die Bemalung, wie sie auf einem Netz war, als das Werk es verließ (für ⌘Z im Werk zurück auf dieses Netz) */
  private jeNetz = new WeakMap<object, Bemalung>();
  /** was beim letzten Netzwechsel geschah (für Proben) */
  wechsel = { zahl: 0, weit: 0, groesst: 0, ms: 0, zurueckgeholt: 0 };
  /** Farblinien, deren Weg sich zuletzt nicht finden ließ */
  fehl: number[] = [];
  /** die Strecken der Farblinien im Raum (für die Striche an Wänden und in Ansichten), und wofür sie gelten */
  private streckenGemerkt: { version: number; netz: HautNetz | null; aus: Float32Array } | null = null;

  constructor(private readonly naechsterFuer: (netz: Netz) => Naechster) {}

  get leer(): boolean {
    return istLeer(this.bemalung);
  }

  /** eine neue Form: Die Bemalung beginnt leer */
  neu(): void {
    this.bemalung = leereBemalung();
    this.haut = null;
    this.tri = null;
    this.karte = null;
    this.schritte = [];
    this.alt = true;
    this.flaechen = null;
    this.anzeige.leeren();
    this.streckenGemerkt = null;
  }

  /** das aktive Objekt ruht von jetzt an: seine Bemalung mitgeben */
  ablegen(): FarbStand {
    const s = { bemalung: this.bemalung, haut: this.haut };
    this.neu();
    return s;
  }

  /** ein Objekt wird das aktive: seine Bemalung aufnehmen (sie gehört zu `s.haut`; ist das Netz inzwischen ein anderes, geht sie mit) */
  aufnehmen(s: FarbStand | undefined): void {
    this.neu();
    if (!s) return;
    this.bemalung = s.bemalung;
    this.haut = s.haut;
    this.tri = s.haut?.tri ?? null;
  }

  private karteJetzt(h: HautJetzt): Karte {
    if (!this.karte || this.karte.netz !== h.haut) this.karte = karteVon(h.haut);
    return this.karte;
  }

  /**
   * Je Bild: Hat das Werk ein anderes Netz, gehen die Orte dorthin; dann die Flächen (wenn sich etwas geändert hat) und die Anzeige.
   * Zurück: Hat sich an der Bemalung im Bild etwas geändert?
   */
  schritt(h: HautJetzt): boolean {
    let neu = false;
    if (this.haut !== h.haut || this.tri !== h.haut.tri) {
      const alt = this.haut;
      if (alt && !this.leer && !gleicheDreiecke(alt.tri, h.haut.tri)) {
        const t0 = performance.now();
        // der Stand auf dem Netz, das jetzt geht, bleibt gemerkt
        this.jeNetz.set(alt, kopie(this.bemalung));
        const k = this.karteJetzt(h);
        const gemerkt = this.jeNetz.get(h.haut);
        if (gemerkt && giltFuer(h.haut, gemerkt)) {
          // ⌘Z im Werk: zurück auf ein Netz, das es schon gab, mit der Bemalung von damals
          this.bemalung = kopie(gemerkt);
          this.wechsel.zurueckgeholt++;
        } else {
          const weit = uebergeben(alt.pos, k, this.naechsterFuer(h.haut), this.bemalung);
          this.wechsel.weit = weit;
          this.wechsel.groesst = Math.max(this.wechsel.groesst, weit);
        }
        this.wechsel.zahl++;
        this.wechsel.ms = performance.now() - t0;
      }
      this.haut = h.haut;
      this.tri = h.haut.tri;
      this.alt = true;
      neu = true;
    }
    if (this.gespiegelt !== h.gespiegelt) {
      this.gespiegelt = h.gespiegelt;
      this.alt = true;
    }
    if (this.alt) {
      this.ableiten(h);
      neu = true;
    }
    if (!h.netz || !this.flaechen || this.leer) {
      if (!this.anzeige.leer) {
        this.anzeige.leeren();
        neu = true;
      }
      return neu;
    }
    const bewegt = this.gezeigt !== h.version;
    this.gezeigt = h.version;
    // (die Anzeige des Werks zeigt alle Dreiecke der Haut in ihrer Reihenfolge, je 4^stufen feine: nur dann passt die Bemalung darauf)
    if (h.netz.index.length === h.haut.tri.length * 4 ** h.stufen) this.anzeige.setzen(h.netz, h.stufen, this.flaechen, this.farben, bewegt);
    else this.anzeige.leeren();
    return neu || bewegt;
  }

  private ableiten(h: HautJetzt): void {
    this.alt = false;
    this.streckenGemerkt = null;
    if (this.leer) {
      this.flaechen = null;
      this.farben = [];
      this.fehl = [];
      return;
    }
    const k = this.karteJetzt(h);
    const spiegeln = h.gespiegelt && k.spiegel !== null;
    // (Etappe 1: eine Ebene; mehrere liegen später übereinander, jede mit ihren eigenen Flächen)
    const ebene = aktiveEbene(this.bemalung);
    const { ketten, fehl } = kettenAller(k, ebene.linien, spiegeln);
    this.fehl = fehl;
    const saaten: Saat[] = [];
    this.farben = [];
    for (const f of ebene.fuellungen) {
      const nr = this.farben.length;
      this.farben.push(f.farbe);
      saaten.push({ ort: f.saat, farbe: nr });
      if (spiegeln) {
        const g = ortGespiegelt(k, f.saat);
        if (g) saaten.push({ ort: g, farbe: nr });
      }
    }
    this.flaechen = flaechenRechnen(k, ketten, saaten);
  }

  /** vor einem Handgriff am Bemalen: den Stand merken (ein Schritt für ⌘Z) */
  merken(h: HautJetzt): void {
    this.schritt(h);
    this.schritte.push({ vorher: kopie(this.bemalung), haut: h.haut });
  }

  /** den letzten Handgriff am Bemalen zurücknehmen; falsch: Es gibt keinen */
  zurueck(h: HautJetzt): boolean {
    const s = this.schritte.pop();
    if (!s) return false;
    this.schritt(h);
    this.bemalung = s.vorher;
    // (hat das Netz seitdem gewechselt, ohne dass sich die Form geändert hätte, geht der Stand von damals mit)
    if (s.haut !== h.haut && !istLeer(s.vorher) && !gleicheDreiecke(s.haut.tri, h.haut.tri)) uebergeben(s.haut.pos, this.karteJetzt(h), this.naechsterFuer(h.haut), this.bemalung);
    this.alt = true;
    return true;
  }

  get schrittZahl(): number {
    return this.schritte.length;
  }

  /** ein Punkt der Welt in Einheiten des Werks */
  private static inWerk(h: HautJetzt, p: V3): V3 {
    return [(p[0] - h.mitte.x) * h.f, (p[1] - h.mitte.y) * h.f, p[2] * h.f];
  }

  /** der Ort auf der Haut unter einem Strahl in der Welt (der vorderste Treffer auf der glatten Anzeige) oder null */
  ortUnterStrahl(h: HautJetzt, o: V3, d: V3): Ort | null {
    if (!h.netz || h.netz.index.length !== h.haut.tri.length * 4 ** h.stufen) return null;
    const tr = strahlAufNetz(h.netz.pos, h.netz.index, o, d);
    return tr ? ortAusFein(h.haut, h.stufen, tr) : null;
  }

  /**
   * Eine Zeichnung auf einem Blatt (Anker mit Griffen, geschlossen) wird eine Farblinie auf der Haut: abgetastet, jeder Punkt längs
   * der Achse des Blatts auf die Haut gelegt, von der Seite, von der man schaut (`vorn`: +1 oder −1 längs der Achse). Zurück: wie
   * viele Farblinien dazukamen (0: Die Zeichnung traf die Form nicht).
   */
  linieAusBlatt(h: HautJetzt, a: Achse, anker: readonly BlattAnker[], vorn: number, zu: boolean): number {
    if (!h.netz || anker.length < (zu ? 3 : 2) || h.netz.index.length !== h.haut.tri.length * 4 ** h.stufen) return 0;
    const achse = a === 'seite' ? 2 : a === 'front' ? 0 : 1;
    const d: V3 = [0, 0, 0];
    d[achse] = -vorn;
    const raster = new ParallelTreffer(h.netz.pos, h.netz.index, d);
    /** Blatt (Einheiten des Werks: Seite (x, −y), Front (z, −y), Top (x, z)) → Anfang des Strahls in der Welt */
    const anfang = (X: number, Y: number): V3 => {
      const w: V3 = a === 'seite' ? [X, -Y, 0] : a === 'front' ? [0, -Y, X] : [X, 0, Y];
      const p: V3 = [w[0] / h.f + h.mitte.x, w[1] / h.f + h.mitte.y, w[2] / h.f];
      p[achse] = vorn * 1e6;
      return p;
    };
    // abtasten: so dicht, dass die Sehne höchstens `GENAU` neben der Kurve liegt, und nie weiter als `WEIT` auseinander
    const GENAU = 0.02;
    const WEIT = 1.5;
    const treffer: Ort[] = [];
    const n = anker.length;
    const bis = zu ? n : n - 1;
    for (let i = 0; i < bis; i++) {
      const p = anker[i]!;
      const q = anker[(i + 1) % n]!;
      const c: [number, number][] = [
        [p.X, p.Y],
        [p.X + (p.aus?.[0] ?? 0), p.Y + (p.aus?.[1] ?? 0)],
        [q.X - (q.aus?.[0] ?? 0), q.Y - (q.aus?.[1] ?? 0)],
        [q.X, q.Y],
      ];
      let lang = 0;
      for (let j = 0; j < 3; j++) lang += Math.hypot(c[j + 1]![0] - c[j]![0], c[j + 1]![1] - c[j]![1]);
      // wie weit die Kurve von ihrer Sehne abweicht (grob: die Griffe gegen die Sehne), daraus die Zahl der Schritte
      const sx = c[3]![0] - c[0]![0];
      const sy = c[3]![1] - c[0]![1];
      const sl = Math.max(1e-9, Math.hypot(sx, sy));
      const bauch = Math.max(Math.abs((c[1]![0] - c[0]![0]) * sy - (c[1]![1] - c[0]![1]) * sx), Math.abs((c[2]![0] - c[0]![0]) * sy - (c[2]![1] - c[0]![1]) * sx)) / sl;
      const schritte = Math.max(1, Math.ceil(lang / WEIT), Math.ceil(Math.sqrt((0.75 * bauch) / GENAU) * 2));
      for (let j = 0; j < schritte; j++) {
        const t = j / schritte;
        const u = 1 - t;
        const b0 = u * u * u;
        const b1 = 3 * u * u * t;
        const b2 = 3 * u * t * t;
        const b3 = t * t * t;
        const tr = raster.treffer(anfang(b0 * c[0]![0] + b1 * c[1]![0] + b2 * c[2]![0] + b3 * c[3]![0], b0 * c[0]![1] + b1 * c[1]![1] + b2 * c[2]![1] + b3 * c[3]![1]));
        if (tr) treffer.push(ortAusFein(h.haut, h.stufen, tr));
      }
    }
    if (!zu) {
      const e = anker[n - 1]!;
      const tr = raster.treffer(anfang(e.X, e.Y));
      if (tr) treffer.push(ortAusFein(h.haut, h.stufen, tr));
    }
    if (treffer.length < 3) return 0;
    const k = this.karteJetzt(h);
    const linien = linienAusTreffern(k, treffer, zu, h.gespiegelt && k.spiegel !== null, () => this.bemalung.naechste++);
    // nur, was sich über die Haut verbinden lässt
    const gut = linien.filter((l) => stueckeVon(k, l) !== null);
    if (!gut.length) return 0;
    this.merken(h);
    aktiveEbene(this.bemalung).linien.push(...gut);
    this.alt = true;
    return gut.length;
  }

  /** eine Füllung an diesem Ort: Die Farbe reicht von dort bis an die Farblinien */
  fuellen(h: HautJetzt, ort: Ort, farbe: Farbe): void {
    this.merken(h);
    aktiveEbene(this.bemalung).fuellungen.push({ id: this.bemalung.naechste++, saat: ort, farbe: [farbe[0], farbe[1], farbe[2]] });
    this.alt = true;
  }

  /** die Lage eines Orts auf der glatten Anzeige (Welt) oder, ohne Anzeige, auf dem Rechennetz */
  lageImRaum(h: HautJetzt, o: Ort): V3 {
    const N = h.netz;
    if (N && N.index.length === h.haut.tri.length * 4 ** h.stufen) {
      const je = 4 ** h.stufen;
      const { j, w } = feinBei(h.stufen, o.w[1], o.w[2]);
      const i = 3 * (o.t * je + j);
      const a = 3 * N.index[i]!;
      const b = 3 * N.index[i + 1]!;
      const c = 3 * N.index[i + 2]!;
      const P = N.pos;
      return [w[0] * P[a]! + w[1] * P[b]! + w[2] * P[c]!, w[0] * P[a + 1]! + w[1] * P[b + 1]! + w[2] * P[c + 1]!, w[0] * P[a + 2]! + w[1] * P[b + 2]! + w[2] * P[c + 2]!];
    }
    const p = ortLage(h.haut.pos, o);
    return [p[0] / h.f + h.mitte.x, p[1] / h.f + h.mitte.y, p[2] / h.f];
  }

  /**
   * Die Farblinien als Strecken im Raum (je 6 Zahlen), samt Spiegelbildern: für die feinen Striche an den Wänden und in den
   * eingerasteten Ansichten, wo die Farbe selbst noch nicht gezeichnet wird.
   */
  strecken(h: HautJetzt): Float32Array {
    const g = this.streckenGemerkt;
    if (g && g.version === h.version && g.netz === h.netz) return g.aus;
    const aus: number[] = [];
    this.schritt(h);
    if (!this.leer && this.haut === h.haut) {
      const spiegeln = h.gespiegelt;
      for (const l of aktiveEbene(this.bemalung).linien) {
        const P = l.stuetzen.map((o) => this.lageImRaum(h, o));
        const n = P.length;
        for (let i = 0; i < (l.zu ? n : n - 1); i++) {
          const p = P[i]!;
          const q = P[(i + 1) % n]!;
          aus.push(p[0], p[1], p[2], q[0], q[1], q[2]);
          if (spiegeln) aus.push(p[0], p[1], -p[2], q[0], q[1], -q[2]);
        }
      }
    }
    const feld = Float32Array.from(aus);
    this.streckenGemerkt = { version: h.version, netz: h.netz, aus: feld };
    return feld;
  }

  /** für die Datei (nichts, wenn nichts gemalt ist) */
  alsDatei(h: HautJetzt): BemalungDatei | undefined {
    this.schritt(h);
    return this.leer ? undefined : alsDatei(this.bemalung);
  }

  /**
   * Aus der Datei: Die Bemalung gehört zum Netz der Datei (`dateiNetz`: seine Lagen und Dreiecke, wie gesichert). Ist die Haut des
   * Werks nach dem Laden ein anderes Netz (vergröbert, aufgeräumt), geht sie dorthin wie bei jedem Netzwechsel. Zurück: geladen?
   */
  ausDatei(d: BemalungDatei | null | undefined, dateiNetz: Netz & { pos: Float64Array; tri: Uint32Array }): boolean {
    this.neu();
    const b = ausDatei(karteVon(dateiNetz), d);
    if (!b) return false;
    this.bemalung = b;
    // (als käme sie vom Netz der Datei: Der erste `schritt` übergibt sie an die Haut des Werks, wenn die eine andere ist)
    this.haut = dateiNetz;
    this.tri = dateiNetz.tri;
    return true;
  }

  /** was gerade gilt, für Proben */
  auskunft(h: HautJetzt): { linien: number; orte: number; fuellungen: number; schritte: number; fehl: number; anzeige: FarbAnzeige['zahlen']; wechsel: FarbWerk['wechsel']; lagen: number[][] } {
    this.schritt(h);
    const e = aktiveEbene(this.bemalung);
    return {
      linien: e.linien.length,
      orte: e.linien.reduce((s, l) => s + l.stuetzen.length, 0),
      fuellungen: e.fuellungen.length,
      schritte: this.schritte.length,
      fehl: this.fehl.length,
      anzeige: { ...this.anzeige.zahlen },
      wechsel: { ...this.wechsel },
      // die Orte jeder Farblinie in Einheiten des Werks, auf dem Rechennetz (daran misst die Probe das Mitgehen)
      lagen: e.linien.map((l) => l.stuetzen.flatMap((o) => Array.from(ortLage(h.haut.pos, o)))),
    };
  }

  /** Rechennetz-Lage → Welt, für Proben */
  static welt(h: HautJetzt, p: V3): V3 {
    return [p[0] / h.f + h.mitte.x, p[1] / h.f + h.mitte.y, p[2] / h.f];
  }
  static werk(h: HautJetzt, p: V3): V3 {
    return FarbWerk.inWerk(h, p);
  }
}
