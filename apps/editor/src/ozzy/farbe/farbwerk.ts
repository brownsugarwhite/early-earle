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
import { type FarbAnzeige, FarbStapel, type FlussBild, type WeichBild } from './anzeige';
import {
  EBENEN_HOECHSTENS,
  type Bemalung,
  type BemalungDatei,
  type Ebene,
  type Farbe,
  type Farblinie,
  type TrefferPunkt,
  aktiveEbene,
  alleOrte,
  alsDatei,
  ausDatei,
  breitenLaengs,
  ebeneLoeschen,
  ebeneNeu,
  ebeneOrdnen,
  giltFuer,
  istLeer,
  kopie,
  leereBemalung,
  linienAusTreffern,
  ortZahl,
  sichtUebernehmen,
  uebergeben,
} from './bemalung';
import { feinBei } from './fein';
import { type Flaechen, type Saat, flaechenRechnen } from './flaechen';
import { flussWeiten, fuellungBei } from './fliessen';
import { kettenAller, stueckeVon } from './ketten';
import { type Karte, type Naechster, type Netz, type Ort, type V3, dreieckNormale, karteVon, ortGespiegelt, ortLage } from './ort';
import { ParallelTreffer, ortAusFein, strahlAufNetz } from './treffer';
import { weichFeld } from './weich';

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

/** Etappe 5: was aus einer Ebene abgeleitet ist (ihre Flächen, die Farben ihrer Füllungen, ihre weichen Kanten, was sich nicht finden ließ) */
type EbeneStand = { flaechen: Flaechen; farben: Farbe[]; weich: WeichBild | null; fehl: number[] };
/** eine Ebene, wie der Stapel am Rand sie zeigt: von oben nach unten gezählt */
export type EbeneZeile = { id: number; name: string; aktiv: boolean; aus: boolean; leer: boolean; farben: Farbe[] };

/** dieselben Dreiecke (dann gelten die Orte weiter, auch wenn das Werk ein anderes Objekt für die Haut hat: Pose, ⌘Z ohne Netzwechsel) */
function gleicheDreiecke(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Etappe 3: wie eine Füllung einläuft. Die Front läuft mit `tempo` (Einheiten des Werks je Sekunde) über die Haut, nach einem
 * kurzen Stoß am Anfang (der Tropfen trifft auf: `stoss` Einheiten in einer Zehntelsekunde). Eine kleine Fläche braucht
 * mindestens `dauerMin` Sekunden, eine große höchstens `dauerMax` (dann läuft die Front langsamer oder schneller). `welle`: wie
 * wellig die Front ist, `wulst`: wie breit der Wulst hinter ihr (beides Einheiten des Werks), `staerke`: wie deutlich er ist
 * (0 … 1). `an`: aus heißt, die Farbe steht sofort.
 */
export type FliessWerte = { an: boolean; dauerMin: number; dauerMax: number; tempo: number; stoss: number; welle: number; wulst: number; staerke: number };
/** zwei Fassungen zur Wahl (Florian entscheidet): dünn und schnell wie Tinte, oder zäh mit dickem Wulst wie Honig */
export const FLIESSEN: Record<'tinte' | 'honig', FliessWerte> = {
  tinte: { an: true, dauerMin: 0.34, dauerMax: 1.2, tempo: 640, stoss: 14, welle: 3, wulst: 6, staerke: 0.7 },
  honig: { an: true, dauerMin: 0.6, dauerMax: 2.6, tempo: 250, stoss: 8, welle: 8, wulst: 14, staerke: 1 },
};

export class FarbWerk {
  bemalung: Bemalung = leereBemalung();
  /** Etappe 5: der Stapel der Ebenen im Bild (je Ebene ihre Anzeige) */
  readonly anzeige = new FarbStapel();
  /** Etappe 3: wie eine Füllung einläuft (von Ozzy gesetzt: Adresse, Feinregler) */
  fliessWerte: FliessWerte = { ...FLIESSEN.tinte };
  /** die Füllung (ihre Kennung), die beim nächsten Ableiten einlaufen soll */
  private flussWunsch: number | null = null;
  /** die Füllung, die gerade einläuft: ihre Ebene, ihr Bild für die Anzeige, die Zeit seit dem Klick, ihre Dauer, ihr Tempo, die größte Weite */
  private fluss: { ebene: number; bild: FlussBild; zeit: number; dauer: number; tempo: number; groesst: number } | null = null;
  /** was das Vorbereiten des letzten Einlaufens gekostet hat (ms, für Proben) */
  flussMs = 0;
  /** Etappe 4: was die weichen Kanten zuletzt kosteten (ms, für Proben) */
  weichMs = 0;
  /** was das letzte Ableiten im Ganzen gekostet hat (Ketten, Flächen, weiche Kanten; ms, für Proben) */
  ableitenMs = 0;
  private haut: HautJetzt['haut'] | null = null;
  private tri: ArrayLike<number> | null = null;
  private karte: Karte | null = null;
  private gespiegelt = false;
  /** abgeleitet: neu zu rechnen (alle Ebenen) */
  private alt = true;
  /** Etappe 5: nur diese Ebenen sind neu zu rechnen (ein Handgriff an einer Ebene lässt die anderen stehen) */
  private altNur = new Set<number>();
  /** was aus jeder Ebene abgeleitet ist, die gezeichnet wird (eine ausgeblendete oder leere hat keinen Stand: Sie wird gerechnet, sobald es etwas zu zeigen gibt) */
  private staende = new Map<number, EbeneStand>();
  /** wie viele Ebenen das letzte Ableiten neu gerechnet hat (für Proben) */
  abgeleitet = 0;
  private gezeigt = -1;
  /** im Bild davor lief noch eine Füllung ein (das Bild danach ist das erste ohne sie) */
  private flussEben = false;
  private schritte: Schritt[] = [];
  /** die Bemalung, wie sie auf einem Netz war, als das Werk es verließ (für ⌘Z im Werk zurück auf dieses Netz) */
  private jeNetz = new WeakMap<object, Bemalung>();
  /**
   * Was bei den Netzwechseln geschah (für Proben): ihre Zahl; wie viele Orte dabei in ihrem Dreieck blieben (`gehalten`) und wie
   * viele neu gesucht wurden; wie weit der fernste gesuchte neben der neuen Haut lag (zuletzt und je); die Zeit des letzten; wie oft
   * die Bemalung eines früheren Netzes zurückkam (⌘Z im Werk).
   */
  wechsel = { zahl: 0, gehalten: 0, gesucht: 0, weit: 0, groesst: 0, ms: 0, zurueckgeholt: 0, ruck: 0, ruckSonst: 0 };
  /** die Lagen aller Orte in den zwei Bildern davor (Rechennetz): Daran misst `wechsel.ruck`, wie weit die Bemalung im Bild eines
   * Netzwechsels neben dem Weg liegt, den sie bis dahin nahm (und `ruckSonst` dasselbe in den Bildern ohne Wechsel) */
  private lagenVor: Float64Array | null = null;
  private lagenDavor: Float64Array | null = null;
  private lagenFrei: Float64Array | null = null;
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
    this.altNur.clear();
    this.staende.clear();
    this.fluss = null;
    this.flussWunsch = null;
    this.anzeige.leeren();
    this.streckenGemerkt = null;
    this.lagenVor = null;
    this.lagenDavor = null;
  }

  /** läuft gerade eine Füllung ein? */
  get fliesst(): boolean {
    return this.fluss !== null;
  }

  /** Etappe 3, je Bild (vor `schritt`): die Zeit der einlaufenden Füllung geht weiter; ist sie angekommen, steht die Farbe wie immer */
  fliessen(dt: number): void {
    const f = this.fluss;
    if (!f) return;
    f.zeit += dt;
    if (f.zeit >= f.dauer) this.fluss = null;
  }

  /** für Proben: wie weit die einlaufende Füllung ist (null: keine läuft) */
  flussStand(): { zeit: number; dauer: number; groesst: number; front: number } | null {
    const f = this.fluss;
    return f ? { zeit: f.zeit, dauer: f.dauer, groesst: f.groesst, front: this.front(f) } : null;
  }

  /** die Front einer einlaufenden Füllung: ein Stoß, wo der Tropfen auftrifft, dann gleichmäßig über die Haut */
  private front(f: { zeit: number; tempo: number }): number {
    return FarbWerk.stossWeg(this.fliessWerte.stoss, f.zeit) + f.tempo * f.zeit;
  }

  /** wie weit der Stoß am Anfang die Front trägt */
  private static stossWeg(stoss: number, zeit: number): number {
    return stoss * (1 - Math.exp(-zeit / 0.06));
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

  /** die Karte des Rechennetzes, wie es jetzt ist (Nachbarn, Spiegelbilder der Dreiecke) */
  karteFuer(h: HautJetzt): Karte {
    return this.karteJetzt(h);
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
    let gewechselt = false;
    if (this.haut !== h.haut || this.tri !== h.haut.tri) {
      const alt = this.haut;
      if (alt && !this.leer && !gleicheDreiecke(alt.tri, h.haut.tri)) {
        const t0 = performance.now();
        gewechselt = true;
        // der Stand auf dem Netz, das jetzt geht, bleibt gemerkt
        this.jeNetz.set(alt, kopie(this.bemalung));
        const k = this.karteJetzt(h);
        const gemerkt = this.jeNetz.get(h.haut);
        if (gemerkt && giltFuer(h.haut, gemerkt)) {
          // ⌘Z im Werk: zurück auf ein Netz, das es schon gab, mit der Bemalung von damals
          const damals = kopie(gemerkt);
          sichtUebernehmen(this.bemalung, damals);
          this.bemalung = damals;
          this.wechsel.zurueckgeholt++;
        } else {
          const r = uebergeben(alt.pos, alt.n, k, this.naechsterFuer(h.haut), this.bemalung);
          this.wechsel.weit = r.weit;
          this.wechsel.groesst = Math.max(this.wechsel.groesst, r.weit);
          this.wechsel.gehalten += r.gehalten;
          this.wechsel.gesucht += r.gesucht;
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
    if (this.alt || this.altNur.size || this.sichtAlt()) {
      this.ableiten(h);
      neu = true;
    }
    if (!h.netz || !this.staende.size || this.leer) {
      if (!this.anzeige.leer) {
        this.anzeige.leeren();
        neu = true;
      }
      return neu;
    }
    const bewegt = this.gezeigt !== h.version;
    this.gezeigt = h.version;
    if (bewegt || gewechselt) this.ruckMessen(h, gewechselt);
    // (die Anzeige des Werks zeigt alle Dreiecke der Haut in ihrer Reihenfolge, je 4^stufen feine: nur dann passt die Bemalung darauf)
    const f = this.fluss;
    if (h.netz.index.length === h.haut.tri.length * 4 ** h.stufen) {
      // Etappe 5: jede sichtbare Ebene mit ihren Flächen, von unten nach oben
      const E = this.bemalung.ebenen;
      this.anzeige.ordnen(
        E.filter((e) => this.staende.has(e.id)).map((e) => e.id),
        aktiveEbene(this.bemalung).id,
        E.map((e) => e.id),
      );
      const W = this.fliessWerte;
      const x = f ? Math.min(1, f.zeit / f.dauer) : 1;
      // (der Wulst vergeht, wenn die Farbe ankommt)
      const aus = 1 - Math.min(1, Math.max(0, (x - 0.78) / 0.22)) ** 2;
      for (const e of E) {
        const st = this.staende.get(e.id);
        if (!st) continue;
        const hier = f && f.ebene === e.id ? f : null;
        const a = this.anzeige.fuer(e.id);
        a.setzen(h.netz, h.stufen, st.flaechen, st.farben, bewegt, hier?.bild ?? null, st.weich);
        a.flussSetzen(hier ? { front: this.front(hier), welle: W.welle, wulst: W.wulst, staerke: W.staerke * aus, zeit: hier.zeit, mass: h.f } : null);
      }
    } else this.anzeige.leeren();
    // (solange eine Füllung einläuft, ändert sich das Bild)
    if (f || this.flussEben) neu = true;
    this.flussEben = f !== null;
    return neu || bewegt;
  }

  /**
   * Für Proben: wie weit die Orte in diesem Bild neben dem Weg liegen, den sie in den zwei Bildern davor nahmen (die zweite
   * Differenz ihrer Lagen). Im Bild eines Netzwechsels zeigt das einen Ruck der Bemalung; sonst ist es die Beschleunigung des Zugs.
   */
  private ruckMessen(h: HautJetzt, gewechselt: boolean): void {
    const n = ortZahl(this.bemalung);
    // (drei Puffer im Wechsel: Je Bild wird keiner neu angelegt, solange die Zahl der Orte bleibt)
    const frei = this.lagenFrei;
    const jetzt = frei && frei.length === 3 * n ? frei : new Float64Array(3 * n);
    const p: V3 = [0, 0, 0];
    let i = 0;
    for (const o of alleOrte(this.bemalung)) {
      ortLage(h.haut.pos, o, p);
      jetzt[i++] = p[0];
      jetzt[i++] = p[1];
      jetzt[i++] = p[2];
    }
    const a = this.lagenDavor;
    const b = this.lagenVor;
    if (a && b && a.length === jetzt.length && b.length === jetzt.length) {
      let g2 = 0;
      for (let j = 0; j < jetzt.length; j += 3) {
        const x = jetzt[j]! - 2 * b[j]! + a[j]!;
        const y = jetzt[j + 1]! - 2 * b[j + 1]! + a[j + 1]!;
        const z = jetzt[j + 2]! - 2 * b[j + 2]! + a[j + 2]!;
        const d2 = x * x + y * y + z * z;
        if (d2 > g2) g2 = d2;
      }
      const g = Math.sqrt(g2);
      if (gewechselt) this.wechsel.ruck = Math.max(this.wechsel.ruck, g);
      else this.wechsel.ruckSonst = Math.max(this.wechsel.ruckSonst, g);
    }
    this.lagenFrei = a;
    this.lagenDavor = b;
    this.lagenVor = jetzt;
  }

  /** wird diese Ebene gezeichnet (zu sehen, und es liegt etwas auf ihr)? */
  private static zuZeichnen(e: Ebene): boolean {
    return !e.aus && (e.linien.length > 0 || e.fuellungen.length > 0);
  }

  /** Stehen die abgeleiteten Stände nicht mehr für genau die Ebenen, die gezeichnet werden (eine ist aus- oder eingeblendet, gelöscht)? */
  private sichtAlt(): boolean {
    let zahl = 0;
    for (const e of this.bemalung.ebenen) {
      if (!FarbWerk.zuZeichnen(e)) continue;
      zahl++;
      if (!this.staende.has(e.id)) return true;
    }
    return zahl !== this.staende.size;
  }

  private ableiten(h: HautJetzt): void {
    const tAnfang = performance.now();
    const alle = this.alt;
    const nur = this.altNur;
    this.alt = false;
    this.altNur = new Set();
    this.streckenGemerkt = null;
    // (jede Änderung beendet eine einlaufende Füllung; nur eine eben gesetzte läuft neu ein)
    this.fluss = null;
    const wunsch = this.flussWunsch;
    this.flussWunsch = null;
    this.abgeleitet = 0;
    this.weichMs = 0;
    if (this.leer) {
      this.staende.clear();
      this.fehl = [];
      return;
    }
    const k = this.karteJetzt(h);
    const spiegeln = h.gespiegelt && k.spiegel !== null;
    // Etappe 5: jede Ebene, die gezeichnet wird, für sich (ihre eigenen Farblinien, Flächen und weichen Kanten); neu gerechnet
    // wird nur, was sich geändert hat
    const da = new Set<number>();
    for (const e of this.bemalung.ebenen) {
      if (!FarbWerk.zuZeichnen(e)) continue;
      da.add(e.id);
      if (alle || nur.has(e.id) || !this.staende.has(e.id)) this.ebeneAbleiten(h, k, spiegeln, e, wunsch);
    }
    for (const id of [...this.staende.keys()]) if (!da.has(id)) this.staende.delete(id);
    // (für Proben und für das Blatt der Farblinien: was sich an der aktiven Ebene nicht finden ließ)
    this.fehl = this.staende.get(aktiveEbene(this.bemalung).id)?.fehl ?? [];
    this.ableitenMs = performance.now() - tAnfang;
  }

  /** eine Ebene: ihre Ketten, Flächen und weichen Kanten; läuft ihre letzte Füllung gerade ein (`wunsch`), auch deren Weiten */
  private ebeneAbleiten(h: HautJetzt, k: Karte, spiegeln: boolean, ebene: Ebene, wunsch: number | null): void {
    this.abgeleitet++;
    // (Etappe 4: Die Ketten tragen die Breite des Verlaufs, wie sie längs der Farblinie von Punkt zu Punkt fließt)
    const { ketten, fehl } = kettenAller(k, ebene.linien, spiegeln, (l) => breitenLaengs(k.netz.pos, l as Farblinie));
    const saaten: Saat[] = [];
    const farben: Farbe[] = [];
    for (const f of ebene.fuellungen) {
      const nr = farben.length;
      farben.push(f.farbe);
      saaten.push({ ort: f.saat, farbe: nr });
      if (spiegeln) {
        const g = ortGespiegelt(k, f.saat);
        if (g) saaten.push({ ort: g, farbe: nr });
      }
    }
    const flaechen = flaechenRechnen(k, ketten, saaten);
    // Etappe 4: die weichen Kanten zu diesen Flächen
    const tWeich = performance.now();
    const feld = weichFeld(k, flaechen);
    this.weichMs += performance.now() - tWeich;
    this.staende.set(ebene.id, { flaechen, farben, weich: feld ? { feld, tri: h.haut.tri } : null, fehl });
    // Etappe 3: die eben gesetzte Füllung läuft ein, von ihrer Saat (und deren Spiegelbild) über die Haut bis an die Farblinien
    const nr = ebene.fuellungen.length - 1;
    if (wunsch !== null && this.fliessWerte.an && nr >= 0 && ebene.fuellungen[nr]!.id === wunsch) {
      const t0 = performance.now();
      const eigene = saaten.filter((s) => s.farbe === nr).map((s) => s.ort);
      // (was vorher in dieser Fläche lag: die Flächen ohne diese Füllung)
      const vorher = fuellungBei(flaechenRechnen(k, ketten, saaten.filter((s) => s.farbe !== nr)), ebene.fuellungen[nr]!.saat);
      const w = flussWeiten(k, flaechen, nr, eigene);
      const W = this.fliessWerte;
      if (w.groesst > 0) {
        // so weit muss die Front kommen (die Welle zieht sie stellenweise zurück); daraus Dauer und Tempo
        const ziel = w.groesst + 1.4 * W.welle + 1;
        const dauer = Math.min(W.dauerMax, Math.max(W.dauerMin, Math.max(0, ziel - W.stoss) / Math.max(1, W.tempo)));
        this.fluss = {
          ebene: ebene.id,
          bild: { fuell: nr, alt: vorher >= 0 ? (farben[vorher] ?? null) : null, weite: w.weite, rand: w.rand, tri: h.haut.tri, pos: h.haut.pos },
          zeit: 0,
          dauer,
          tempo: Math.max(0, ziel - FarbWerk.stossWeg(W.stoss, dauer)) / dauer,
          groesst: w.groesst,
        };
      }
      this.flussMs = performance.now() - t0;
    }
  }

  /** die aktive Ebene ist von außen geändert worden (ein Handgriff an einer Farblinie, `farbBlatt.ts`): was aus ihr abgeleitet ist, neu */
  geaendert(): void {
    this.altNur.add(aktiveEbene(this.bemalung).id);
    this.streckenGemerkt = null;
  }

  private naechsterGemerkt: { haut: object; version: number; f: Naechster } | null = null;
  /** der nächste Ort auf dem Rechennetz, wie es jetzt liegt (für die Kurve zwischen zwei Punkten einer Farblinie) */
  naechster(h: HautJetzt): Naechster {
    const g = this.naechsterGemerkt;
    if (g && g.haut === h.haut && g.version === h.version) return g.f;
    const f = this.naechsterFuer(h.haut);
    this.naechsterGemerkt = { haut: h.haut, version: h.version, f };
    return f;
  }

  /**
   * Vor einem Handgriff am Bemalen: den Stand merken (ein Schritt für ⌘Z). Wer an einer ausgeblendeten Ebene malt, blendet sie
   * damit ein (`zeigen`: falsch für Handgriffe am Stapel selbst, die nichts auf die Ebene malen).
   */
  merken(h: HautJetzt, zeigen = true): void {
    this.schritt(h);
    this.schritte.push({ vorher: kopie(this.bemalung), haut: h.haut });
    if (zeigen) delete aktiveEbene(this.bemalung).aus;
  }

  /** den letzten Handgriff am Bemalen zurücknehmen; falsch: Es gibt keinen */
  zurueck(h: HautJetzt): boolean {
    const s = this.schritte.pop();
    if (!s) return false;
    this.schritt(h);
    // (welche Ebene aktiv ist und welche ausgeblendet sind, bleibt, wie es jetzt ist: Das sind keine Schritte)
    sichtUebernehmen(this.bemalung, s.vorher);
    this.bemalung = s.vorher;
    // (hat das Netz seitdem gewechselt, ohne dass sich die Form geändert hätte, geht der Stand von damals mit)
    if (s.haut !== h.haut && !istLeer(s.vorher) && !gleicheDreiecke(s.haut.tri, h.haut.tri)) uebergeben(s.haut.pos, s.haut.n, this.karteJetzt(h), this.naechsterFuer(h.haut), this.bemalung);
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
    /** die Punkte der Zeichnung: welcher Treffer jeder ist, und seine Richtungen als Vektoren in der Haut (Einheiten des Werks) */
    const punkte: TrefferPunkt[] = [];
    const eX: V3 = a === 'front' ? [0, 0, 1] : [1, 0, 0];
    const eY: V3 = a === 'top' ? [0, 0, 1] : [0, -1, 0];
    const eA: V3 = [0, 0, 0];
    eA[achse] = 1;
    /** ein Griff im Blatt als Vektor in der Ebene der Haut am Ort: sein Bild im Blatt ist der Griff */
    const inHaut = (o: Ort, hx: number, hy: number): V3 => {
      const nn = dreieckNormale(h.haut.pos, h.haut.tri, o.t);
      const g: V3 = [hx * eX[0] + hy * eY[0], hx * eX[1] + hy * eY[1], hx * eX[2] + hy * eY[2]];
      const gn = g[0] * nn[0] + g[1] * nn[1] + g[2] * nn[2];
      const an = eA[0] * nn[0] + eA[1] * nn[1] + eA[2] * nn[2];
      // (fast von der Kante gesehen: der Griff ohne seinen Anteil aus der Haut heraus)
      if (Math.abs(an) < 0.15) return [g[0] - gn * nn[0], g[1] - gn * nn[1], g[2] - gn * nn[2]];
      const c = -gn / an;
      return [g[0] + c * eA[0], g[1] + c * eA[1], g[2] + c * eA[2]];
    };
    const punktDazu = (nr: number, o: Ort): void => {
      const p = anker[nr]!;
      const g = p.aus && Math.hypot(p.aus[0], p.aus[1]) > 1e-9 ? inHaut(o, p.aus[0], p.aus[1]) : null;
      // (das Werkzeug gibt je Punkt einen Griff nach vorn: Der nach hinten liegt ihm gegenüber, der Punkt ist rund)
      punkte.push({ i: treffer.length - 1, ein: g && (zu || nr > 0) ? [-g[0], -g[1], -g[2]] : null, aus: g && (zu || nr < anker.length - 1) ? g : null, knick: !g });
    };
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
        if (!tr) continue;
        const o = ortAusFein(h.haut, h.stufen, tr);
        treffer.push(o);
        if (j === 0) punktDazu(i, o);
      }
    }
    if (!zu) {
      const e = anker[n - 1]!;
      const tr = raster.treffer(anfang(e.X, e.Y));
      if (tr) {
        const o = ortAusFein(h.haut, h.stufen, tr);
        treffer.push(o);
        punktDazu(n - 1, o);
      }
    }
    if (treffer.length < 3) return 0;
    const k = this.karteJetzt(h);
    const linien = linienAusTreffern(k, treffer, zu, h.gespiegelt && k.spiegel !== null, () => this.bemalung.naechste++, punkte);
    // nur, was sich über die Haut verbinden lässt
    const gut = linien.filter((l) => stueckeVon(k, l) !== null);
    if (!gut.length) return 0;
    this.merken(h);
    aktiveEbene(this.bemalung).linien.push(...gut);
    this.geaendert();
    return gut.length;
  }

  /** eine Füllung an diesem Ort: Die Farbe reicht von dort bis an die Farblinien */
  fuellen(h: HautJetzt, ort: Ort, farbe: Farbe): void {
    this.merken(h);
    const id = this.bemalung.naechste++;
    aktiveEbene(this.bemalung).fuellungen.push({ id, saat: ort, farbe: [farbe[0], farbe[1], farbe[2]] });
    this.geaendert();
    // (Etappe 3: Diese Füllung läuft ein, sobald die Flächen neu gerechnet sind)
    this.flussWunsch = id;
  }

  /**
   * Etappe 4: die Breite des Verlaufs an einem Punkt einer Farblinie setzen (Einheiten des Werks; 0: harte Kante). `linie`: ihre
   * Nummer in der aktiven Ebene. Ohne Schritt für ⌘Z: Den legt an, wer den Handgriff beginnt (`merken`). Zurück: Hat sich etwas geändert?
   */
  breiteSetzen(linie: number, punkt: number, breite: number): boolean {
    const q = aktiveEbene(this.bemalung).linien[linie]?.punkte[punkt];
    if (!q) return false;
    const neu = Number.isFinite(breite) && breite > 1e-6 ? breite : 0;
    if ((q.breite ?? 0) === neu) return false;
    if (neu > 0) q.breite = neu;
    else delete q.breite;
    this.geaendert();
    return true;
  }

  /**
   * Die Farbe der Füllung, die an diesem Ort zu sehen ist (für die Pipette): die der obersten sichtbaren Ebene, die dort eine
   * Füllung hat. null: Dort liegt keine Farbe. `nur`: nur auf dieser Ebene gesucht (Etappe 6: Eine Kopie der Ebenen-Ansicht
   * zeigt allein ihre Ebene).
   */
  farbeBei(h: HautJetzt, ort: Ort, nur: number | null = null): Farbe | null {
    // (steht noch etwas aus, zuerst nachziehen; sonst gilt, was das letzte Bild gerechnet hat)
    if (this.alt || this.altNur.size || this.haut !== h.haut || this.sichtAlt()) this.schritt(h);
    const E = this.bemalung.ebenen;
    for (let i = E.length - 1; i >= 0; i--) {
      const st = nur === null || E[i]!.id === nur ? this.staende.get(E[i]!.id) : undefined;
      if (!st) continue;
      const nr = fuellungBei(st.flaechen, ort);
      const f = nr >= 0 ? st.farben[nr] : undefined;
      if (f) return [f[0], f[1], f[2]];
    }
    return null;
  }

  /**
   * Der Name der obersten sichtbaren Ebene über der aktiven, die an diesem Ort eine Füllung hat: Sie deckt dort, was auf der aktiven
   * liegt. null: Dort deckt nichts.
   */
  deckerUeber(h: HautJetzt, ort: Ort): string | null {
    if (this.alt || this.altNur.size || this.haut !== h.haut || this.sichtAlt()) this.schritt(h);
    const E = this.bemalung.ebenen;
    const aktiv = aktiveEbene(this.bemalung).id;
    for (let i = E.length - 1; i >= 0 && E[i]!.id !== aktiv; i--) {
      const st = this.staende.get(E[i]!.id);
      if (st && fuellungBei(st.flaechen, ort) >= 0) return E[i]!.name;
    }
    return null;
  }

  // ---------- Etappe 5: der Stapel der Ebenen ----------

  /** die Farblinien, die gerade bedient werden: die der aktiven Ebene, solange sie zu sehen ist */
  get bedienbar(): Farblinie[] {
    const e = aktiveEbene(this.bemalung);
    return e.aus ? [] : e.linien;
  }

  /**
   * Etappe 6: die Ebenen, die zu sehen sind (nicht ausgeblendet; auch leere), von unten nach oben: ihre Kennungen. In der
   * Ebenen-Ansicht bekommt jede ihre Kopie der Form.
   */
  sichtbareEbenen(): number[] {
    return this.bemalung.ebenen.filter((e) => !e.aus).map((e) => e.id);
  }

  /** die Ebenen, wie der Stapel am Rand sie zeigt: von oben nach unten, je Ebene die Farben ihrer Füllungen (jede einmal, höchstens vier) */
  ebenenStand(): EbeneZeile[] {
    const aktiv = aktiveEbene(this.bemalung).id;
    const aus: EbeneZeile[] = [];
    for (let i = this.bemalung.ebenen.length - 1; i >= 0; i--) {
      const e = this.bemalung.ebenen[i]!;
      const farben: Farbe[] = [];
      for (let j = e.fuellungen.length - 1; j >= 0 && farben.length < 4; j--) {
        const f = e.fuellungen[j]!.farbe;
        if (!farben.some((g) => g[0] === f[0] && g[1] === f[1] && g[2] === f[2])) farben.push([f[0], f[1], f[2]]);
      }
      aus.push({ id: e.id, name: e.name, aktiv: e.id === aktiv, aus: !!e.aus, leer: !e.linien.length && !e.fuellungen.length, farben });
    }
    return aus;
  }

  /** eine neue, leere Ebene über der aktiven; sie wird die aktive (ein Schritt für ⌘Z). Zurück: ihre Kennung, oder null (schon zu viele) */
  ebeneNeu(h: HautJetzt): number | null {
    if (this.bemalung.ebenen.length >= EBENEN_HOECHSTENS) return null;
    this.merken(h, false);
    return ebeneNeu(this.bemalung)?.id ?? null;
  }

  /** eine Ebene mit allem, was auf ihr liegt, löschen (ein Schritt für ⌘Z; die letzte bleibt). Zurück: gelöscht? */
  ebeneLoeschen(h: HautJetzt, id: number): boolean {
    if (this.bemalung.ebenen.length < 2 || !this.bemalung.ebenen.some((e) => e.id === id)) return false;
    this.merken(h, false);
    ebeneLoeschen(this.bemalung, id);
    this.streckenGemerkt = null;
    return true;
  }

  /**
   * Eine Ebene an einen anderen Platz legen (`platz`: von unten gezählt, 0 ganz unten). `schritt`: einen Schritt für ⌘Z anlegen
   * (beim Ziehen im Stapel nur beim ersten Tausch: Ein Zug ist ein Schritt). Zurück: Liegt sie jetzt woanders?
   */
  ebeneOrdnen(h: HautJetzt, id: number, platz: number, schritt = true): boolean {
    const i = this.bemalung.ebenen.findIndex((e) => e.id === id);
    const nach = Math.max(0, Math.min(this.bemalung.ebenen.length - 1, Math.round(platz)));
    if (i < 0 || i === nach) return false;
    if (schritt) this.merken(h, false);
    return ebeneOrdnen(this.bemalung, id, nach);
  }

  /** an dieser Ebene wird von jetzt an gemalt (kein Schritt für ⌘Z). Zurück: Ist es eine andere als bisher? */
  ebeneWaehlen(id: number): boolean {
    if (aktiveEbene(this.bemalung).id === id || !this.bemalung.ebenen.some((e) => e.id === id)) return false;
    this.bemalung.aktiv = id;
    this.streckenGemerkt = null;
    return true;
  }

  /** eine Ebene aus- oder einblenden (kein Schritt für ⌘Z). Zurück: Hat sich etwas geändert? */
  ebeneZeigen(id: number, an: boolean): boolean {
    const e = this.bemalung.ebenen.find((x) => x.id === id);
    if (!e || !e.aus === an) return false;
    if (an) delete e.aus;
    else e.aus = true;
    this.streckenGemerkt = null;
    return true;
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
      for (const l of this.bedienbar) {
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
  auskunft(h: HautJetzt): {
    linien: number;
    orte: number;
    fuellungen: number;
    schritte: number;
    fehl: number;
    anzeige: FarbAnzeige['zahlen'];
    wechsel: FarbWerk['wechsel'];
    lagen: number[][];
    ebenen: { id: number; name: string; aktiv: boolean; aus: boolean; linien: number; fuellungen: number }[];
  } {
    this.schritt(h);
    const e = aktiveEbene(this.bemalung);
    return {
      // (die Zahlen der aktiven Ebene; alle Ebenen, von unten nach oben, in `ebenen`)
      ebenen: this.bemalung.ebenen.map((x) => ({ id: x.id, name: x.name, aktiv: x.id === e.id, aus: !!x.aus, linien: x.linien.length, fuellungen: x.fuellungen.length })),
      linien: e.linien.length,
      orte: e.linien.reduce((s, l) => s + l.stuetzen.length, 0),
      fuellungen: e.fuellungen.length,
      schritte: this.schritte.length,
      fehl: this.fehl.length,
      anzeige: this.anzeige.zahlen,
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
