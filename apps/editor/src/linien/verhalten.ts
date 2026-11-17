/**
 * Verhalten der Probe „Linien, Punkte, Zeiger“ (Florian, 14.11.2026). Drei Stufen, jede weich animiert:
 *
 * 1. **Anflug:** Die Linie, der sich der Zeiger nähert, beginnt anzuschwellen, längs der Linie weich in ihre Grundbreite auslaufend
 *    (0,25 px innen, 1 px Umriss). Je näher, desto mehr. Die Schwellung gleitet mit dem Zeiger die Linie entlang.
 * 2. **Tropfen:** Nahe genug löst sich ein Tropfen aus der Linie und hängt an der Spitze des Zeigers, mit einem Hals zur Linie. Ein
 *    Punkt in der Nähe springt selbst zum Zeiger (Feder mit Überschwingen); dann schwellen alle Linien durch ihn an (an einer Kreuzung
 *    der Stern aus dem Entwurf). Linien neigen sich leicht zum Tropfen. Geht der Zeiger zu weit weg, fließt der Tropfen zurück.
 * 3. **Greifen:** Drücken, solange ein Tropfen hängt: Nicht die Stelle springt zum Zeiger, der Zeiger gleitet zur Stelle (Florian,
 *    14.11.: „umgekehrt wäre es cooler“), der Tropfen fließt mit ihm in seinen Punkt oder seine Linie zurück. Beim Ziehen folgt die
 *    Stelle genau der Bewegung der Maus, der Zeiger sitzt auf ihr. Beim Loslassen bleibt er dort (Florian, 15.11.: „nach dem Klick
 *    auf dem Punkt bleiben statt zurückzugleiten“); erst wenn die Maus sich bewegt, findet er nach und nach wieder zu ihr. Was der
 *    Zeiger trifft, entscheidet der gezeichnete Zeiger, nicht die unsichtbare Maus.
 *
 * Schwellung und Nadel sind eine Form (Florian, 15.11.: „es soll immer fließen und nicht springen“): Mitte, Reichweite und Höhe je
 * Seite und die Taille sind Federn. Am Zeiger ist sie eine Spindel, an einem Punkt die Nadel; wechselt das Ziel, fließt die eine in
 * die andere, statt dass eine verschwindet und die andere erscheint.
 *
 * Werkzeug P (Florian, 15.11.: „die Punkte auf der Linie sollen nur erscheinen, wenn ich mit Werkzeug P einen Punkt auf Linien setzen
 * kann, sonst nur die Verdickung“): Ohne P zeigt eine Linie unter dem Zeiger nur ihre Schwellung, gegriffen und gezogen wird sie wie
 * bisher. Mit P hängt dort der Tropfen.
 *
 * Seit dem 15.11. abends zeichnet P wie in Illustrator (Rechnung in `stift.ts`): An der Feder hängt ein Tropfen; ein Klick lässt ihn
 * als Punkt fallen, vom letzten Punkt spannt sich der Faden (die nächste Linie, genau wie sie wird) zum Zeiger. Ziehen zieht Griffe als
 * Haarlinien mit Perlen aus dem Punkt, ⌥ bricht sie, ⇧ rastet in 45°. Am ersten Punkt öffnet sich ein Ring, ein Klick schließt, eine
 * Welle läuft einmal herum. An Vorhandenem hängt die Linie an (Punkt oder Linie), wo der Faden Linien kreuzt, teilen beide einen Punkt.
 *
 * Auswahl (ohne P, `auswahl.ts`): Klick wählt einen Punkt (er bleibt ein Tropfen, seine Linien schwellen ruhig an), ⇧ nimmt dazu oder
 * weg, Ziehen im Leeren zieht einen Rahmen, Doppelklick auf eine Linie wählt den ganzen Loop. Gewählte gehen beim Ziehen zusammen
 * mit, ⌫ löscht sie.
 *
 * Richtungen (Konzept „Richtungen statt Griffe“, 15.11., `richtung.ts`): Auf der Linie nahe an einem Punkt schwillt sie vom Punkt aus
 * an, so weit ihr Schwung reicht (Nadel): rund auf beiden Seiten, geknickt nur auf einer, mit Taille am Punkt. Drücken: Der Zeiger
 * gleitet an die Spitze des Griffs, Griff (Haarlinie mit Perle) und Ring wachsen aus dem Punkt, Ziehen dreht, die alte Richtung steht
 * grün. ⌥ reißt los, in die Flucht zurück rastet ein, Doppelklick schaltet Knick und rund.
 *
 * Linien vereinigen sich hart (Kreuzungen bleiben scharf wie gezeichnet); Punkte, Tropfen und Hälse verschmelzen weich mit allem.
 * Längen in Punkten des Entwurfs; die Anzeige rechnet in Gerätepunkte um.
 */

import { punkteDerLinie, punkteImLasso, punkteImRahmen, punkteLoeschen, punkteZiehen } from './auswahl';
import { Feder1, Feder2 } from './feder';
import { MAX_FELDER, PRIM_FELDER, type Szene } from './fluessig';
import {
  type LinienProben,
  type LinienTreffer,
  type Netz,
  type Seite,
  armGriff,
  armStueck,
  bezier,
  istKnick,
  kontrollpunkte,
  linieAbtasten,
  naechsteStelle,
  netzKopie,
  punktZiehen,
  stelleZiehen,
} from './netz';
import { type DrehBild, type Dreher, Dreher2D, GEGEN, type RichtungZiel } from './richtung';
import { type EntwurfInfo, type FadenEnde, type FadenProben, Stift2D, type StiftOrt, type StiftWerk, type V2 } from './stift';

export interface Werte {
  /** Florians Vorgaben: Breiten (voll), Punktradius */
  umriss: number;
  innen: number;
  kanteMax: number;
  kanteMin: number;
  punktRadius: number;
  /** Schwellen: zusätzliche Breite (voll), Länge längs der Linie (Radius), Anflug (Faktor auf den Fangradius der Linie) */
  schwellen: number;
  reichweite: number;
  anflug: number;
  /** Tropfen: Größe (× Punkt), Fangradien, Halten (Faktor auf den Fangradius), Hals (volle Breite), Neigung, Dehnung nach Tempo */
  tropfen: number;
  fangPunkt: number;
  fangLinie: number;
  halten: number;
  hals: number;
  spannung: number;
  dehnung: number;
  /** Verschmelzen von Punkten, Tropfen und Hälsen nahe am Zeiger und fern davon */
  weich: number;
  weichGrund: number;
  /** Federn (Hz, Dämpfung); greif: der Zeiger gleitet beim Greifen zur Stelle und beim Loslassen zurück */
  sprungHz: number;
  sprungD: number;
  schwellHz: number;
  schwellD: number;
  zurueckHz: number;
  zurueckD: number;
  greifHz: number;
  greifD: number;
  /** Zeiger: Länge der Seiten und Linienbreite (Bildschirmpunkte) */
  zeigerGroesse: number;
  zeigerLinie: number;
}

/** Grundwerte nach Florians Entwurf (Punkte des Entwurfs; der Entwurf ist dreifach exportiert) */
export const GRUNDWERTE: Werte = {
  umriss: 1,
  innen: 0.25,
  kanteMax: 1,
  kanteMin: 0.25,
  punktRadius: 1.25,
  schwellen: 2.5,
  reichweite: 36,
  anflug: 2.6,
  tropfen: 1.6,
  fangPunkt: 9,
  fangLinie: 5.5,
  halten: 1.8,
  hals: 1.1,
  spannung: 0.1,
  dehnung: 0.008,
  weich: 1.6,
  weichGrund: 0,
  sprungHz: 6.5,
  sprungD: 0.45,
  schwellHz: 7,
  schwellD: 0.85,
  zurueckHz: 5.5,
  zurueckD: 0.38,
  greifHz: 8,
  greifD: 0.72,
  zeigerGroesse: 9.5,
  zeigerLinie: 0.5,
};

export interface Ansicht {
  /** Zoom (Bildschirmpunkte je Punkt des Entwurfs) und Versatz (Bildschirmpunkte) */
  z: number;
  ox: number;
  oy: number;
  dpr: number;
  /** Linien, Punkte und Tropfen wachsen mit dem Zoom (wie eine Illustration) */
  wachsen: boolean;
  /** alles Aussehen (Breiten, Punkte, Tropfen, Fangradien) mal diesem Maß; fehlt: 1 */
  massstab?: number;
}

export type Ziel = { art: 'punkt'; pi: number } | { art: 'linie'; li: number; si: number; t: number; s: number } | RichtungZiel;

/**
 * Der Raum (3D-Probe): Er liefert jedes Bild das projizierte Netz (`setzeNetz`) und verformt selbst, wenn gezogen wird. Die Lagen sind
 * dann Bildschirmpunkte; die Anzeige entscheidet je Bildpunkt nach der Tiefe, was verdeckt ist.
 */
export interface Raum extends Dreher, StiftWerk {
  ziehenBeginnen(ziel: Ziel): void;
  /** Bewegung der Maus seit dem Drücken (Bildschirmpunkte) */
  ziehen(dx: number, dy: number): void;
  ziehenEnden(): void;
  /** wo die gegriffene Stelle jetzt liegt (Bildschirmpunkte) */
  stelle(ziel: Ziel): [number, number] | null;
  /** Werkzeug P: Punkt auf Stück si der Linie li beim Parameter t setzen; Ergebnis: seine Nummer (wie im projizierten Netz) */
  punktEinsetzen(li: number, si: number, t: number): number | null;
  rueckgaengig(): boolean;
  /** Auswahl: mehrere Punkte zusammen ziehen (Bewegung der Maus seit dem Drücken, Bildschirmpunkte) und löschen */
  punkteZiehenBeginnen(pis: number[]): void;
  punkteZiehen(dx: number, dy: number): void;
  punkteZiehenEnden(): void;
  punkteLoeschen(pis: number[]): boolean;
  /** der Punkt liegt vor der Haut (für den Rahmen: im Raum wählt er nur, was man sieht) */
  ankerZuSehen(pi: number): boolean;
  /** Ozzy: alle Punkte im Netz, die dasselbe zeigen wie `pi` (derselbe Punkt auf allen Flächen); fehlt: nur `pi` */
  gleiche?(pi: number): number[];
  /** so weit darf etwas hinter der Haut liegen und gilt doch als auf ihr (Tiefe, Bildschirmpunkte der Anzeige) */
  bias(): number;
  /** Ozzy (S14, Röntgen): solange das gilt, greift man im Raum auch Verdecktes (Punkte und Linien hinter der Form) */
  roentgen?(): boolean;
  /** Ozzy (S17): der Bereich der Anzeige, an dessen Rand eine Linie oder ein Punkt des Netzes abgeschnitten wird (0 = keiner) */
  bereich?(art: 'linie' | 'punkt', i: number): number;
}

/**
 * Schwellung einer Linie: eine Form längs der Bogenlänge. Mitte `c`; nach kleineren Bogenlängen (Seite „ein“) reicht sie `a` weit
 * mit Höhe `ha` und Taille `ta`, nach größeren (Seite „aus“) `b`, `hb`, `tb`. Spindel: a = b = Reichweite, Höhen 1. Nadel: Mitte am
 * Punkt, Reichweite je Seite der Schwung, die Gegenseite niedriger oder null, geknickt mit Taille. `nadel`: Anteil Nadel (für das
 * weiche Feld am Punkt `pi`).
 */
interface Schwellung {
  st: Feder1;
  c: Feder1;
  a: Feder1;
  b: Feder1;
  ha: Feder1;
  hb: Feder1;
  ta: Feder1;
  tb: Feder1;
  nadel: Feder1;
  pi: number;
}
type SchwellZiel = { c: number; a: number; b: number; ha: number; hb: number; ta: number; tb: number; st: number; nadel: number; pi: number };

/** so weit (Bildschirmpunkte, mal Maßstab) muss die Maus gehen, bis der Zeiger zu gut zwei Dritteln wieder bei ihr ist */
const ZURUECK_WEG = 40;
/** unter so vielen Bildschirmpunkten Weg ist Drücken und Loslassen ein Klick (kein Ziehen) */
const KLICK_WEG = 3;

/** was ein Klick mit P gerade täte */
type StiftZiel =
  | { art: 'frei'; x: number; y: number; mitte: boolean }
  | { art: 'punkt'; pi: number; x: number; y: number }
  | { art: 'linie'; li: number; si: number; t: number; x: number; y: number }
  | { art: 'schluss'; x: number; y: number }
  | { art: 'letzter'; x: number; y: number };

/**
 * Ziehen der Griffe an einem Punkt der neuen Linie: am ersten (`erster`), an einem neuen (`neu`), an Vorhandenem (`anschluss`, sein
 * zweites Griffpaar), beim Schließen auf dem ersten (`schluss`) oder auf dem letzten (`letzter`: Klick zieht seinen Griff ein).
 */
interface StiftZug {
  art: 'erster' | 'neu' | 'anschluss' | 'schluss' | 'letzter';
  /** Maus beim Drücken (Netz-Einheiten; die Leertaste schiebt sie mit dem Punkt mit) und im letzten Bild */
  mx: number;
  my: number;
  lx: number;
  ly: number;
  bewegt: boolean;
  gebrochen: boolean;
  /** Griffe, wie sie gerade stehen (vom Punkt aus): `aus` in Zugrichtung, `gegen` die andere Seite; `fest`: beim Brechen stehen geblieben */
  aus: V2;
  gegen: V2;
  fest: V2 | null;
  /** der Punkt ist neu (die Leertaste darf ihn verschieben) */
  frei: boolean;
}

/** was die Zeichenhilfen von `szene` brauchen: Kapsel anhängen, Lagen und Breiten in Gerätepunkte, Felder, neue Gruppe */
interface Zeichnen {
  push: (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, gruppe: number, schicht: number, art: number, z0?: number, z1?: number) => void;
  X: (x: number) => number;
  Y: (y: number) => number;
  R: (r: number) => number;
  felder: number[];
  gruppe: () => number;
  raum: boolean;
}

const LEER: LinienProben = {
  n: 0,
  x: new Float32Array(0),
  y: new Float32Array(0),
  s: new Float32Array(0),
  si: new Int32Array(0),
  t: new Float32Array(0),
  halb: new Float32Array(0),
  schicht: new Uint8Array(0),
  laenge: 0,
  stueckS: new Float32Array(1),
};

interface Tropfen {
  ziel: Ziel;
  verdeckt: boolean;
  /** Anker: Ruhelage des Punkts oder Stelle auf der Linie */
  ax: number;
  ay: number;
  pos: Feder2;
  r: Feder1;
  hals: Feder1;
  zustand: 'folgt' | 'zurueck' | 'gegriffen';
}

const glocke3 = (x: number): number => {
  const a = Math.min(1, Math.abs(x));
  const u = 1 - a * a;
  return u * u * u;
};
const glatt = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const TINTE: [number, number, number] = [0x1f / 255, 0x1a / 255, 0x17 / 255];
const GRUEN: [number, number, number] = [0xb9 / 255, 0xd1 / 255, 0xb4 / 255];
const ZEIGER_WINKEL = [(32 * Math.PI) / 180, (80 * Math.PI) / 180];
/** Richtung des Zeigerkörpers von der Spitze aus */
const ACHSE = [Math.cos((56 * Math.PI) / 180), Math.sin((56 * Math.PI) / 180)];

export class Verhalten {
  netz: Netz;
  readonly ursprung: Netz;
  proben: LinienProben[] = [];
  werte: Werte;
  /** Zeiger in Punkten des Entwurfs; sx, sy in Bildschirmpunkten */
  zeiger = { x: 0, y: 0, sx: 0, sy: 0, da: false, vx: 0, vy: 0, gedrueckt: false };
  private feld = new Feder2(0, 0);
  private feldStaerke = new Feder1(0);
  private zeigerSkala = new Feder1(1);
  /** je Linie: ihre Schwellung (Spindel am Zeiger oder Nadel am Punkt, eine Form) */
  private schwell: Schwellung[] = [];
  tropfen: Tropfen[] = [];
  /** Zug: Ziel, Netz und Stelle beim Drücken, Maus beim Drücken */
  private griff: {
    ziel: Ziel;
    start: Netz;
    ax: number;
    ay: number;
    mx: number;
    my: number;
    /** Richtung: Spitze des Hebels beim Drücken, Zeit seitdem, ob der Zeiger schon gleitet */
    spitze?: [number, number];
    zeit?: number;
    gleitet?: boolean;
    /** gewählte Punkte, die zusammen mitgehen */
    mehrere?: number[] | undefined;
    /** weiter als ein Klick gezogen */
    bewegt?: boolean;
  } | null = null;
  /** Versatz des gezeichneten Zeigers gegen die Maus (Punkte des Entwurfs): beim Greifen sitzt er auf der Stelle */
  private versatz = new Feder2(0, 0);
  private zurueck: Netz[] = [];
  private puffer = new Float32Array(PRIM_FELDER * 8192);
  private schritt0 = 2;
  /** Punkte des Entwurfs je Einheit des Aussehens: 1, wenn alles mit dem Zoom wächst, sonst 1/Zoom */
  private g = 1;
  /** für Vergleichsbilder: den Zeiger nicht zeichnen */
  zeigerZeigen = true;
  /** gesetzt: 3D-Probe (siehe `Raum`) */
  raum: Raum | null = null;
  /** Werkzeug P: Tropfen auf Linien zeigen, Drücken setzt dort einen Punkt */
  stift = false;
  /** ⌥ gehalten (Richtung losreißen, nicht einrasten); ⇧ (im Raum: aus der Haut kippen statt auf ihr drehen, auch während des Drehens) */
  alt = false;
  kippen = false;
  private dreher2d = new Dreher2D(
    () => this.netz,
    (n) => {
      this.netz = n;
      this.abtasten();
    },
  );
  /** Zoom der Ansicht (für den Weg, auf dem der Zeiger zur Maus zurückfindet) */
  private zoom = 1;
  /** Ring und Griff wachsen aus dem Punkt und fließen zurück; nach dem Loslassen bleibt das letzte Bild, bis sie verschwunden sind */
  private ring = new Feder1(0);
  private drehBildLetzt: DrehBild | null = null;
  /** für den Doppelklick auf eine Richtung */
  private klick: { ziel: RichtungZiel; t: number } | null = null;
  private ausrichtung: Feder1 | null = null;

  /** Werkzeug P: die Rechnung (2D auf dem Netz; im Raum setzt raum-main den Raum ein) */
  werk: StiftWerk;
  /** ⇧ gehalten (45°, Auswahl dazu), Leertaste gehalten (beim Ziehen eines Griffs: den Punkt verschieben) */
  umschalt = false;
  leertaste = false;
  private stiftZug: StiftZug | null = null;
  private stiftZiel: StiftZiel | null = null;
  /** wie die Linie begann (Esc: ein Schritt fürs Zurück nur, wenn P dabei einen Punkt auf eine Linie gesetzt hat) */
  private stiftStart: StiftOrt['art'] | null = null;
  /** Ring am ersten Punkt (0 … 1) und wo er steht */
  private schlussRing = new Feder1(0);
  private schlussOrt: [number, number, number] = [0, 0, 0];
  /** Tropfen an der Feder: Lage, Größe (0 … 1) */
  private federPos = new Feder2(0, 0);
  private federR = new Feder1(0);
  /** Wellen längs einer Linie (nach dem Schließen, beim Wählen eines Loops) */
  private wellen: { li: number; s0: number; zeit: number; dauer: number }[] = [];
  /** Griffe, die in ihren Punkt zurückfließen (Netz-Einheiten) */
  private dornenAus: { x: number; y: number; z: number; gx: number; gy: number; f: Feder1 }[] = [];
  /** gelöschte Punkte, die vergehen */
  private geister: { x: number; y: number; z: number; r: Feder1 }[] = [];
  /** gewählte Punkte und wie weit sie angeschwollen sind */
  auswahl = new Set<number>();
  private auswahlF = new Map<number, Feder1>();
  /** Rahmen beim Ziehen im Leeren (Netz-Einheiten); danach zieht er sich um die Auswahl zusammen und vergeht */
  private rahmen: { x0: number; y0: number; x1: number; y1: number; plus: boolean; vorher: Set<number> } | null = null;
  private rahmenAus: { r: [number, number, number, number]; ziel: [number, number, number, number]; f: Feder1 } | null = null;
  /**
   * Lasso (Ozzy, Werkzeug L): die gezeichnete Schlinge (Netz-Einheiten, x, y je Paar); gewählt ist schon beim Ziehen, was sie umschließt
   * (⇧ dazu, ⌥ weg). Beim Loslassen schließt sie sich mit einem Tropfen an der Naht, zieht sich zur Auswahl zusammen und vergeht.
   */
  private lasso: { pfad: number[]; plus: boolean; minus: boolean; vorher: Set<number> } | null = null;
  private lassoAus: { pfad: number[]; mitte: [number, number]; f: Feder1; tropfen: Feder1 } | null = null;
  /** Drücken auf einen Punkt: ob er schon gewählt war (Loslassen ohne Ziehen entscheidet) */
  private klickPunkt: { pi: number; war: boolean; umschalt: boolean } | null = null;
  /** für den Doppelklick auf eine Linie */
  private linienKlick: { li: number; t: number } | null = null;

  private get dreher(): Dreher {
    return this.raum ?? this.dreher2d;
  }

  /** Federn je Linie (Schwellung) für neue Linien anlegen */
  private federnAnlegen(): void {
    const f = (x: number): Feder1 => new Feder1(x);
    while (this.schwell.length < this.proben.length)
      this.schwell.push({ st: f(0), c: f(0), a: f(1), b: f(1), ha: f(1), hb: f(1), ta: f(0), tb: f(0), nadel: f(0), pi: -1 });
  }
  /** für die Anzeige: Stand der letzten Szene */
  stat = { tropfen: 0, ziel: '' };

  constructor(netz: Netz, werte: Werte) {
    this.netz = netz;
    this.ursprung = netzKopie(netz);
    this.werte = werte;
    this.werk = new Stift2D(
      () => this.netz,
      (n) => {
        this.netz = n;
        this.abtasten();
      },
      () => this.proben,
      () => 1 / this.zoom,
    );
    this.abtasten();
  }

  /** Abtastschritt (Punkte des Entwurfs) so, dass auf dem Bildschirm rund 3 Punkte zwischen zwei Proben liegen */
  setzeAnsicht(a: Ansicht): void {
    this.g = (a.wachsen ? 1 : 1 / a.z) * (a.massstab ?? 1);
    this.zoom = a.z;
    if (this.raum) return;
    const s = Math.min(4, Math.max(0.25, 3 / a.z));
    if (Math.abs(s - this.schritt0) / this.schritt0 > 0.25) {
      this.schritt0 = s;
      this.abtasten();
    }
  }

  /** im Raum: das projizierte Netz dieses Bilds */
  setzeNetz(netz: Netz, proben: LinienProben[]): void {
    this.netz = netz;
    this.proben = proben;
    if (this.schwell.length > proben.length) this.schwell.length = proben.length;
    this.federnAnlegen();
  }

  abtasten(): void {
    if (this.raum) return;
    const w = this.werte;
    const br = { umriss: w.umriss, innen: w.innen, kanteMax: w.kanteMax, kanteMin: w.kanteMin };
    this.proben = this.netz.linien.map((_, li) => linieAbtasten(this.netz, li, this.schritt0, br));
    if (this.schwell.length > this.proben.length) this.schwell.length = this.proben.length;
    this.federnAnlegen();
  }

  /**
   * Das Netz von außen ersetzen (Ozzy: Freihand, Formen, Mülleimer); der Stand davor kommt auf den Stapel für ⌘Z. Eine angefangene
   * Linie mit P wird vorher abgebrochen.
   */
  netzErsetzen(neu: Netz): void {
    if (this.werk.entwurf()) this.werk.abbrechen();
    this.stiftZug = null;
    this.zurueck.push(netzKopie(this.netz));
    this.netz = neu;
    this.tropfen = [];
    this.griff = null;
    this.auswahlLeeren();
    this.wellen = [];
    this.abtasten();
  }

  zuruecksetzen(): void {
    if (this.werk.entwurf()) this.werk.abbrechen();
    this.stiftZug = null;
    this.zurueck.push(netzKopie(this.netz));
    this.netz = netzKopie(this.ursprung);
    this.tropfen = [];
    this.griff = null;
    this.auswahlLeeren();
    this.wellen = [];
    this.abtasten();
  }

  rueckgaengig(): boolean {
    if (this.griff || this.stiftZug) return false;
    // beim Zeichnen: den letzten Punkt zurücknehmen (wie ⌘Z mit P in Illustrator)
    if (this.stift && this.werk.entwurf()) return this.eingabe('loeschen');
    this.auswahlLeeren();
    this.wellen = [];
    this.ausrichtung = null;
    this.drehBildLetzt = null;
    if (this.raum) {
      this.tropfen = [];
      return this.raum.rueckgaengig();
    }
    const n = this.zurueck.pop();
    if (!n) return false;
    this.netz = n;
    this.griff = null;
    this.tropfen = this.tropfen.filter((t) => t.ziel.art === 'punkt' && t.zustand !== 'gegriffen' && t.ziel.pi < n.punkte.length);
    this.abtasten();
    return true;
  }

  zeigerSetzen(x: number, y: number, sx: number, sy: number, dt: number): void {
    const z = this.zeiger;
    if (z.da && dt > 0) {
      const a = Math.min(1, dt / 0.05);
      z.vx += ((x - z.x) / dt - z.vx) * a;
      z.vy += ((y - z.y) / dt - z.vy) * a;
    }
    // nach dem Loslassen sitzt der Zeiger noch auf der Stelle; er findet zur Maus zurück, während sie sich bewegt (auf dem Bildschirm
    // gemessen: Verschieben der Ansicht zählt nicht), nie von selbst
    if (z.da && !this.zieht) {
      const weg = Math.hypot(sx - z.sx, sy - z.sy);
      if (weg > 0) {
        const f = Math.exp(-weg / (ZURUECK_WEG * this.g * this.zoom));
        const v = this.versatz;
        v.x *= f;
        v.y *= f;
        v.zx *= f;
        v.zy *= f;
        v.vx *= f;
        v.vy *= f;
      }
    }
    if (!z.da) {
      this.versatz.setzen(0, 0);
      this.feld.setzen(x, y);
    }
    Object.assign(z, { x, y, sx, sy, da: true });
  }

  zeigerWeg(): void {
    if (this.zieht || this.rahmen || this.lasso) return;
    this.zeiger.da = false;
    this.versatz.setzen(0, 0);
  }

  /** ein Zug läuft (Stelle, Richtung oder Griff mit P): Der Zeiger sitzt auf ihm */
  private get zieht(): boolean {
    return !!this.griff || !!this.stiftZug;
  }

  /** hängt gerade ein Tropfen am Zeiger (dann gilt Drücken ihm, nicht dem Leeren) */
  get haengt(): boolean {
    return this.tropfen.some((q) => q.zustand === 'folgt');
  }

  /**
   * Drücken: mit P setzt es einen Punkt (oder schließt, hängt an); sonst greift es den Tropfen, der gerade am Zeiger hängt (der Zeiger
   * gleitet zu seiner Stelle), oder beginnt im Leeren einen Rahmen. Ein Punkt wird dabei gewählt.
   */
  druecken(): boolean {
    this.zeiger.gedrueckt = true;
    if (this.stift) return this.stiftDruecken();
    const t = this.tropfen.find((q) => q.zustand === 'folgt');
    if (!t) return this.rahmenBeginnen();
    if (t.ziel.art === 'richtung') return this.richtungDruecken(t);
    if (t.ziel.art === 'linie' && this.loopKlick(t.ziel.li, t.ziel.s)) return true;
    if (t.ziel.art === 'punkt') this.punktKlick(t.ziel.pi);
    t.zustand = 'gegriffen';
    const z = this.zeiger;
    const mehrere = t.ziel.art === 'punkt' && this.auswahl.size > 1 && this.auswahl.has(t.ziel.pi) ? [...this.auswahl] : undefined;
    if (this.raum) {
      if (mehrere) this.raum.punkteZiehenBeginnen(mehrere);
      else this.raum.ziehenBeginnen({ ...t.ziel });
      this.griff = { ziel: { ...t.ziel }, start: this.netz, ax: t.ax, ay: t.ay, mx: z.x, my: z.y, mehrere, bewegt: false };
    } else {
      this.zurueckMerken();
      this.griff = { ziel: { ...t.ziel }, start: netzKopie(this.netz), ax: t.ax, ay: t.ay, mx: z.x, my: z.y, mehrere, bewegt: false };
    }
    this.versatz.zx = t.ax - z.x;
    this.versatz.zy = t.ay - z.y;
    return true;
  }

  /**
   * Drücken auf eine Richtung: Doppelklick schaltet Knick und rund (beim Runden dreht sie sich animiert in die Flucht); sonst beginnt
   * das Drehen. Der Zeiger gleitet erst an die Spitze des Griffs, wenn man hält oder zieht, damit ein Doppelklick ruhig bleibt.
   */
  private richtungDruecken(t: Tropfen): boolean {
    if (t.ziel.art !== 'richtung') return false;
    const ziel = t.ziel;
    const z = this.zeiger;
    const jetzt = performance.now();
    const k = this.klick;
    if (k && jetzt - k.t < 350 && this.gleichesZiel(k.ziel, ziel)) {
      this.klick = null;
      if (!this.raum) this.zurueckMerken();
      const rund = this.dreher.knickUmschalten(ziel);
      if (rund) {
        this.ausrichtung = new Feder1(0);
        this.ausrichtung.ziel = 1;
      }
      return true;
    }
    this.klick = { ziel: { ...ziel }, t: jetzt };
    const vorher = this.raum ? null : netzKopie(this.netz);
    const spitze = this.dreher.drehenBeginnen(ziel, this.kippen, 22 * this.g);
    if (!spitze) return false;
    if (vorher) {
      this.zurueck.push(vorher);
      if (this.zurueck.length > 60) this.zurueck.shift();
    }
    t.zustand = 'gegriffen';
    this.griff = { ziel: { ...ziel }, start: this.netz, ax: spitze[0], ay: spitze[1], mx: z.x, my: z.y, spitze, zeit: 0, gleitet: false };
    return true;
  }

  private zurueckMerken(): void {
    this.zurueck.push(netzKopie(this.netz));
    if (this.zurueck.length > 60) this.zurueck.shift();
  }

  /**
   * Loslassen: Die Stelle bleibt, wo sie ist, und der Zeiger auf ihr (gleitet er noch hin, kommt er an). Zur Maus findet er erst
   * zurück, wenn sie sich bewegt (`zeigerSetzen`).
   */
  loslassen(): void {
    this.zeiger.gedrueckt = false;
    if (this.stiftZug) {
      this.stiftLoslassen();
      return;
    }
    if (this.rahmen) {
      this.rahmenEnden();
      return;
    }
    if (this.lasso) {
      this.lassoEnden();
      return;
    }
    const g = this.griff;
    if (!g) return;
    if (g.ziel.art === 'richtung') {
      this.drehBildLetzt = this.dreher.drehBild() ?? this.drehBildLetzt;
      this.dreher.drehenEnden();
    } else {
      if (g.mehrere) this.raum?.punkteZiehenEnden();
      else this.raum?.ziehenEnden();
      if (!g.bewegt) {
        // ein Klick: nichts verschoben, kein Schritt fürs Zurück; er entscheidet nur über die Auswahl
        if (this.raum) this.raum.rueckgaengig();
        else {
          this.netz = netzKopie(g.start);
          this.zurueck.pop();
          this.abtasten();
        }
        const k = this.klickPunkt;
        if (k && g.ziel.art === 'punkt' && k.pi === g.ziel.pi) {
          if (k.umschalt && k.war) this.abwaehlen(k.pi);
          else if (!k.umschalt && k.war && this.auswahl.size > 1) this.waehlen([k.pi], false);
        }
      }
    }
    this.klickPunkt = null;
    this.griff = null;
    for (const t of this.tropfen) if (t.zustand === 'gegriffen') t.zustand = 'folgt';
  }

  // ---------- Werkzeug P ----------

  /** am ersten Punkt (Ring): Ein Klick schließt; ein wenig Halten, damit der Ring nicht flackert */
  private schlussNahe(e: EntwurfInfo): boolean {
    if (e.anzahl < 2) return false;
    const P = this.netz.punkte[e.erster];
    if (!P) return false;
    const [zx, zy] = this.gezeichnet();
    return Math.hypot(P.x - zx, P.y - zy) < this.werte.fangPunkt * this.g * (this.schlussRing.ziel > 0.5 ? 1.3 : 1);
  }

  /** was ein Klick mit P gerade täte */
  private stiftZielBestimmen(): StiftZiel | null {
    const [zx, zy] = this.gezeichnet();
    const e = this.werk.entwurf();
    if (e && this.schlussNahe(e)) {
      const P = this.netz.punkte[e.erster]!;
      return { art: 'schluss', x: P.x, y: P.y };
    }
    const t = this.tropfen.find((q) => q.zustand === 'folgt');
    if (t?.ziel.art === 'punkt') return { art: 'punkt', pi: t.ziel.pi, x: t.ax, y: t.ay };
    if (t?.ziel.art === 'linie') return { art: 'linie', li: t.ziel.li, si: t.ziel.si, t: t.ziel.t, x: t.ax, y: t.ay };
    if (e) {
      const L = this.netz.punkte[e.letzter];
      if (L && Math.hypot(L.x - zx, L.y - zy) < 0.6 * this.werte.fangPunkt * this.g) return { art: 'letzter', x: L.x, y: L.y };
    }
    const o = this.werk.ortFrei(zx, zy);
    return o ? { art: 'frei', x: o.x, y: o.y, mitte: o.mitte } : null;
  }

  private stiftDruecken(): boolean {
    const z = this.zeiger;
    const ziel = this.stiftZielBestimmen();
    if (!ziel) return false;
    const e = this.werk.entwurf();
    const ort = (q: StiftZiel): StiftOrt | null =>
      q.art === 'punkt' ? { art: 'punkt', pi: q.pi } : q.art === 'linie' ? { art: 'linie', li: q.li, si: q.si, t: q.t } : q.art === 'frei' ? { art: 'frei', x: q.x, y: q.y } : null;
    let art: StiftZug['art'];
    let p: number | null = null;
    if (!e) {
      const o = ort(ziel);
      if (!o) return false;
      if (!this.raum) this.zurueckMerken();
      p = this.werk.beginnen(o);
      if (p === null) {
        if (!this.raum) this.zurueck.pop();
        return false;
      }
      this.stiftStart = o.art;
      art = 'erster';
    } else if (ziel.art === 'schluss') {
      this.werk.schliessen();
      art = 'schluss';
    } else if (ziel.art === 'letzter') {
      art = 'letzter';
    } else {
      const o = ort(ziel)!;
      // der Griff des bisher letzten Punkts fließt in ihn zurück (er steckt jetzt in der Verbindung)
      this.dornAusblenden(e.letzter, e.aus);
      p = this.werk.weiter(o);
      if (p === null) return false;
      // auf der Mitte (im Raum) hängt die Linie wie an Vorhandenem
      art = ziel.art === 'frei' && !ziel.mitte ? 'neu' : 'anschluss';
    }
    this.stiftZug = { art, mx: z.x, my: z.y, lx: z.x, ly: z.y, bewegt: false, gebrochen: false, aus: [0, 0], gegen: [0, 0], fest: null, frei: ziel.art === 'frei' && !ziel.mitte };
    // der Zeiger gleitet auf den Punkt; ab da ist er die Spitze des Griffs
    this.versatz.zx = ziel.x - z.x;
    this.versatz.zy = ziel.y - z.y;
    if (p !== null) this.tropfenFaellt(p, ziel);
    return true;
  }

  /**
   * Der Tropfen fällt: frei aus der Feder in den neuen Punkt (er fließt hinein und wird so klein wie ein Punkt; an der Feder bildet sich
   * ein neuer); an Vorhandenem fließt der Tropfen, der dort hing, in den Punkt zurück.
   */
  private tropfenFaellt(p: number, ziel: StiftZiel): void {
    const w = this.werte;
    const haengt = this.tropfen.find((q) => q.zustand === 'folgt');
    if (ziel.art === 'frei') {
      if (haengt) haengt.zustand = 'zurueck';
      const t = this.neuerTropfen({ ziel: { art: 'punkt', pi: p }, x: ziel.x, y: ziel.y, verdeckt: false });
      t.pos.setzen(this.federPos.x, this.federPos.y);
      t.pos.vx = this.federPos.vx;
      t.pos.vy = this.federPos.vy;
      t.r.setzen(w.tropfen * Math.max(0.3, this.federR.x));
      t.hals.setzen(1);
      t.zustand = 'zurueck';
      this.federR.setzen(0);
    } else if (haengt) {
      haengt.zustand = 'zurueck';
      haengt.ziel = { art: 'punkt', pi: p };
    }
  }

  /** ein Griff fließt in seinen Punkt zurück */
  private dornAusblenden(pi: number, g: V2): void {
    const P = this.netz.punkte[pi];
    if (!P || Math.hypot(g[0], g[1]) < 1e-6) return;
    const f = new Feder1(1);
    f.ziel = 0;
    this.dornenAus.push({ x: P.x, y: P.y, z: P.z ?? 0, gx: g[0], gy: g[1], f });
  }

  /** Ziehen mit P: der Griff folgt der Maus genau (⇧ rastet in 45°, ⌥ bricht, Leertaste verschiebt den Punkt) */
  private stiftZiehen(): void {
    const sz = this.stiftZug!;
    const z = this.zeiger;
    const e = this.werk.entwurf();
    if (!e) return;
    // Leertaste: der neue Punkt geht mit der Maus, der Griff bleibt
    if (this.leertaste && sz.frei && (sz.art === 'neu' || sz.art === 'erster')) {
      const dx = z.x - sz.lx;
      const dy = z.y - sz.ly;
      if (dx || dy) {
        const P = this.netz.punkte[e.letzter];
        if (P) this.werk.letztenVerschieben(P.x + dx, P.y + dy);
        sz.mx += dx;
        sz.my += dy;
      }
    }
    sz.lx = z.x;
    sz.ly = z.y;
    let h: V2 = [z.x - sz.mx, z.y - sz.my];
    const weg = Math.hypot(h[0], h[1]) * this.zoom;
    if (!sz.bewegt && weg < KLICK_WEG) return;
    sz.bewegt = true;
    if (this.umschalt) {
      const L = Math.hypot(h[0], h[1]);
      const a = Math.round(Math.atan2(h[1], h[0]) / (Math.PI / 4)) * (Math.PI / 4);
      h = [L * Math.cos(a), L * Math.sin(a)];
    }
    const neg: V2 = [-h[0], -h[1]];
    if (this.alt && !sz.gebrochen && sz.art !== 'letzter') {
      sz.gebrochen = true;
      sz.fest = sz.art === 'schluss' ? [sz.aus[0], sz.aus[1]] : [sz.gegen[0], sz.gegen[1]];
    }
    switch (sz.art) {
      case 'erster':
        sz.aus = h;
        sz.gegen = sz.gebrochen ? sz.fest! : neg;
        this.werk.griffeErster(h, sz.gebrochen ? null : neg);
        break;
      case 'neu':
      case 'anschluss':
        sz.aus = h;
        sz.gegen = sz.gebrochen ? sz.fest! : neg;
        this.werk.griffeLetzter(h, sz.gebrochen ? null : neg);
        break;
      case 'schluss':
        // die Zugrichtung ist der Griff zur ersten Verbindung, die andere Seite kommt aus der Schlussverbindung; ⌥: nur sie
        sz.aus = sz.gebrochen ? sz.fest! : h;
        sz.gegen = neg;
        this.werk.griffeErster(sz.gebrochen ? null : h, neg);
        break;
      case 'letzter':
        // ein neuer Griff aus dem letzten Punkt, unabhängig von seinem anderen (Knick)
        sz.aus = h;
        this.werk.griffeLetzter(h, null);
        break;
    }
  }

  private stiftLoslassen(): void {
    const sz = this.stiftZug!;
    this.stiftZug = null;
    const e = this.werk.entwurf();
    if (!e) return;
    const knick = !sz.bewegt || sz.gebrochen;
    switch (sz.art) {
      case 'erster':
        this.werk.knickSetzen(true, knick);
        break;
      case 'neu':
        this.werk.knickSetzen(false, knick);
        break;
      case 'anschluss':
        // an Vorhandenem: fertig, wenn auch der Anfang hängt; frei begonnen zeichnet sie durch den Punkt weiter
        if (e.haengt) this.linieFertig(0);
        else this.werk.knickSetzen(false, knick);
        break;
      case 'schluss':
        if (sz.bewegt) this.werk.knickSetzen(true, sz.gebrochen);
        this.linieFertig(0);
        break;
      case 'letzter':
        if (!sz.bewegt) {
          this.dornAusblenden(e.letzter, e.aus);
          this.werk.griffeLetzter([0, 0], null);
        } else this.werk.knickSetzen(false, true);
        break;
    }
  }

  /** die Linie ist fertig: eine Welle läuft einmal über sie */
  private linieFertig(s0: number): void {
    const e = this.werk.entwurf();
    if (e && e.aus[0] ** 2 + e.aus[1] ** 2 > 0) this.dornAusblenden(e.letzter, e.aus);
    const li = this.werk.fertig();
    this.stiftStart = null;
    if (li >= 0) this.welleStarten(li, s0);
  }

  /** Tasten: ↩ schließt, Esc bricht ab (oder leert die Auswahl), ⌫ nimmt den letzten Punkt zurück (oder löscht die gewählten), ⌘A alle */
  eingabe(taste: 'enter' | 'esc' | 'loeschen' | 'alle'): boolean {
    const e = this.stift ? this.werk.entwurf() : null;
    if (this.stiftZug || this.griff) return false;
    if (taste === 'enter') {
      if (!e || e.anzahl < 2) return false;
      this.dornAusblenden(e.letzter, e.aus);
      this.werk.schliessen();
      this.linieFertig(0);
      return true;
    }
    if (taste === 'esc') {
      if (e) {
        this.dornAusblenden(e.letzter, e.aus);
        this.werk.abbrechen();
        if (!this.raum && this.stiftStart !== 'linie') this.zurueck.pop();
        this.stiftStart = null;
        this.tropfen = this.tropfen.filter((t) => t.ziel.art !== 'punkt' || t.ziel.pi < this.netz.punkte.length);
        return true;
      }
      if (this.auswahl.size) {
        this.auswahlLeeren();
        return true;
      }
      return false;
    }
    if (taste === 'loeschen') {
      if (e) {
        this.dornAusblenden(e.letzter, e.aus);
        if (!this.werk.zurueck()) {
          if (!this.raum && this.stiftStart !== 'linie') this.zurueck.pop();
          this.stiftStart = null;
        }
        this.tropfen = this.tropfen.filter((t) => t.ziel.art !== 'punkt' || t.ziel.pi < this.netz.punkte.length);
        return true;
      }
      if (!this.stift && this.auswahl.size) return this.auswahlLoeschen();
      return false;
    }
    // ⌘A
    if (this.stift) return false;
    this.waehlen(
      this.netz.punkte.flatMap((p, i) => (p.sichtbar ? [i] : [])),
      false,
    );
    return true;
  }

  /** P an oder aus; beim Ausschalten bricht eine angefangene Linie ab */
  stiftSchalten(an: boolean): void {
    if (!an && this.werk.entwurf()) this.eingabe('esc');
    this.stift = an;
    this.stiftZiel = null;
  }

  // ---------- Auswahl ----------

  private waehlen(pis: readonly number[], dazu: boolean): void {
    if (!dazu) this.auswahl.clear();
    for (const p of pis) this.auswahl.add(p);
  }

  private abwaehlen(pi: number): void {
    this.auswahl.delete(pi);
  }

  auswahlLeeren(): void {
    this.auswahl.clear();
  }

  /** Drücken auf einen Punkt: Ein ungewählter wird gewählt (mit ⇧ dazu); ein gewählter bleibt es, damit alle zusammen mitgehen */
  private punktKlick(pi: number): void {
    const war = this.auswahl.has(pi);
    this.klickPunkt = { pi, war, umschalt: this.umschalt };
    if (!war) this.waehlen([pi], this.umschalt);
  }

  /** Doppelklick auf eine Linie: alle ihre Punkte, der ganze Loop; eine Welle läuft die Linie entlang */
  private loopKlick(li: number, s: number): boolean {
    const jetzt = performance.now();
    const k = this.linienKlick;
    this.linienKlick = { li, t: jetzt };
    if (!k || k.li !== li || jetzt - k.t > 350) return false;
    this.linienKlick = null;
    this.waehlen(punkteDerLinie(this.netz, li), this.umschalt);
    this.welleStarten(li, s);
    return true;
  }

  /** Lasso beginnen (Ozzy, Werkzeug L), an der Stelle des Zeigers; ⇧ (`umschalt`) nimmt dazu, ⌥ (`alt`) nimmt weg */
  lassoDruecken(): boolean {
    this.zeiger.gedrueckt = true;
    const [x, y] = this.gezeichnet();
    this.lasso = { pfad: [x, y], plus: this.umschalt, minus: this.alt, vorher: new Set(this.auswahl) };
    this.lassoAus = null;
    return true;
  }

  /** läuft gerade ein Lasso */
  get lassoAn(): boolean {
    return this.lasso !== null;
  }

  /** Loslassen: Die Schlinge schließt sich (ein Tropfen an der Naht), zieht sich zur Mitte der Auswahl zusammen und vergeht */
  private lassoEnden(): void {
    const L = this.lasso!;
    this.lasso = null;
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const p of this.auswahl) {
      const P = this.netz.punkte[p];
      if (!P) continue;
      sx += P.x;
      sy += P.y;
      n++;
    }
    if (!n) {
      for (let i = 0; i + 1 < L.pfad.length; i += 2) {
        sx += L.pfad[i]!;
        sy += L.pfad[i + 1]!;
        n++;
      }
    }
    const f = new Feder1(1);
    f.ziel = 0;
    const tropfen = new Feder1(0);
    tropfen.ziel = 1;
    this.lassoAus = { pfad: [...L.pfad], mitte: [sx / Math.max(1, n), sy / Math.max(1, n)], f, tropfen };
  }

  private rahmenBeginnen(): boolean {
    const [x, y] = this.gezeichnet();
    this.rahmen = { x0: x, y0: y, x1: x, y1: y, plus: this.umschalt, vorher: new Set(this.auswahl) };
    this.rahmenAus = null;
    return true;
  }

  /** Loslassen: Der Rahmen zieht sich um die Auswahl zusammen und vergeht */
  private rahmenEnden(): void {
    const r = this.rahmen!;
    this.rahmen = null;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of this.auswahl) {
      const P = this.netz.punkte[p];
      if (!P) continue;
      x0 = Math.min(x0, P.x);
      x1 = Math.max(x1, P.x);
      y0 = Math.min(y0, P.y);
      y1 = Math.max(y1, P.y);
    }
    const rand = 5 * this.g;
    const mx = (r.x0 + r.x1) / 2;
    const my = (r.y0 + r.y1) / 2;
    const ziel: [number, number, number, number] = Number.isFinite(x0) ? [x0 - rand, y0 - rand, x1 + rand, y1 + rand] : [mx, my, mx, my];
    const f = new Feder1(1);
    f.ziel = 0;
    this.rahmenAus = { r: [Math.min(r.x0, r.x1), Math.min(r.y0, r.y1), Math.max(r.x0, r.x1), Math.max(r.y0, r.y1)], ziel, f };
  }

  /**
   * ⌫: Die gewählten Punkte vergehen, die Linie läuft durch die Nachbarn weiter. Punkte, die zwei Linien teilen (Kreuzungen, Enden
   * von Abzweigungen), bleiben wie im Editor („Kreuzungen bleiben, solange sich die Loops kreuzen“); sie bleiben gewählt.
   */
  private auswahlLoeschen(): boolean {
    const geteilt = (p: number): boolean => this.netz.linien.filter((l) => l.punkte.includes(p)).length >= 2;
    const bleiben = [...this.auswahl].filter(geteilt);
    const weg = [...this.auswahl].filter((p) => !geteilt(p));
    if (!weg.length) return false;
    for (const p of weg) {
      const P = this.netz.punkte[p];
      if (!P) continue;
      const r = new Feder1(1.3);
      r.ziel = 0;
      this.geister.push({ x: P.x, y: P.y, z: P.z ?? 0, r });
    }
    this.auswahlLeeren();
    this.tropfen = [];
    this.wellen = [];
    if (this.raum) {
      const ok = this.raum.punkteLoeschen(weg);
      this.waehlen(bleiben, false);
      return ok;
    }
    this.zurueckMerken();
    const { netz, nummer } = punkteLoeschen(this.netz, new Set(weg));
    this.netz = netz;
    this.abtasten();
    // die geteilten bleiben gewählt (mit ihren neuen Nummern)
    this.auswahlF.clear();
    this.waehlen(
      bleiben.map((p) => nummer[p]!).filter((p) => p >= 0),
      false,
    );
    return true;
  }

  private welleStarten(li: number, s0: number): void {
    this.wellen = this.wellen.filter((w) => w.li !== li);
    this.wellen.push({ li, s0, zeit: 0, dauer: 0.85 });
  }

  get greift(): boolean {
    return !!this.griff || !!this.stiftZug;
  }

  /** wo der Zeiger gezeichnet wird (Punkte des Entwurfs) */
  private gezeichnet(): [number, number] {
    return [this.zeiger.x + this.versatz.x, this.zeiger.y + this.versatz.y];
  }

  private fang(z: Ziel): number {
    return (z.art === 'punkt' ? this.werte.fangPunkt : this.werte.fangLinie) * this.g;
  }

  /** die Proben zum Treffen: ohne die Linie, die P gerade zeichnet */
  private suchProben(): readonly LinienProben[] {
    const e = this.stift ? this.werk.entwurf() : null;
    if (!e || e.li < 0) return this.proben;
    return this.proben.map((P, li) => (li === e.li || li === e.zwilling ? LEER : P));
  }

  /** bester Kandidat unter dem (gezeichneten) Zeiger: Punkte vor Linien, Tinte vor Verdecktem */
  private kandidat(): { ziel: Ziel; x: number; y: number; d: number; verdeckt: boolean } | null {
    const w = this.werte;
    const [x, y] = this.gezeichnet();
    const fp = w.fangPunkt * this.g;
    const fl = w.fangLinie * this.g;
    // beim Zeichnen mit P: nicht die eigene Linie; am ersten Punkt schließt der Ring
    const e = this.stift ? this.werk.entwurf() : null;
    if (e && this.schlussNahe(e)) return null;
    const ohne = new Set<number>();
    if (e) {
      ohne.add(e.erster);
      ohne.add(e.letzter);
      for (const li of [e.li, e.zwilling]) for (const p of li >= 0 ? (this.netz.linien[li]?.punkte ?? []) : []) ohne.add(p);
    }
    const proben = this.suchProben();
    const suche = (schicht: 0 | 1): { ziel: Ziel; x: number; y: number; d: number; verdeckt: boolean } | null => {
      let bp = -1;
      let bd = Infinity;
      this.netz.punkte.forEach((p, i) => {
        if (!p.sichtbar || (p.verdeckt ? 1 : 0) !== schicht || ohne.has(i)) return;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bd) {
          bd = d;
          bp = i;
        }
      });
      const st = naechsteStelle(proben, x, y, schicht);
      const linieOk = st && st.d < fl;
      // ein Punkt gewinnt, wenn er im Fangradius liegt und die Linie nicht deutlich näher ist
      if (bp >= 0 && bd < fp && (!linieOk || bd - st.d < fp * 0.5)) {
        const p = this.netz.punkte[bp]!;
        return { ziel: { art: 'punkt', pi: bp }, x: p.x, y: p.y, d: bd, verdeckt: p.verdeckt };
      }
      if (st && linieOk) {
        // nahe an einem Punkt: seine Richtung (nicht mit P, dort setzt die Linie Punkte)
        const r = this.stift ? null : this.richtungBei(st, this.richtungJetzt());
        if (r) return { ziel: r, x: st.x, y: st.y, d: st.d, verdeckt: st.verdeckt };
        return { ziel: { art: 'linie', li: st.li, si: st.si, t: st.t, s: st.s }, x: st.x, y: st.y, d: st.d, verdeckt: st.verdeckt };
      }
      return null;
    };
    // im Raum greift man nur, was man sieht
    const vorn = suche(0);
    if (!this.raum) return vorn ?? suche(1);
    if (!this.raum.roentgen?.()) return vorn;
    // Ozzy, Röntgen: auch, was dahinter liegt; das Nähere gewinnt, ein Punkt leicht vor einer Linie (eine Nadel direkt unter dem Zeiger
    // bleibt vorn, ⌥ knickt sie weiter)
    const hinten = suche(1);
    if (!vorn || !hinten) return vorn ?? hinten;
    const bonus = (k: { ziel: Ziel; d: number }): number => (k.ziel.art === 'punkt' ? 0.5 * fp : 0);
    return hinten.d - bonus(hinten) < vorn.d - bonus(vorn) ? hinten : vorn;
  }

  private gleichesZiel(a: Ziel, b: Ziel): boolean {
    if (a.art === 'richtung' && b.art === 'richtung') return a.pi === b.pi && a.li === b.li && a.k === b.k && a.seite === b.seite;
    if (a.art === 'punkt' && b.art === 'punkt') return a.pi === b.pi;
    if (a.art === 'linie' && b.art === 'linie') {
      if (a.li !== b.li) return false;
      const L = this.proben[a.li]!.laenge;
      const d = Math.abs(a.s - b.s);
      return Math.min(d, this.netz.linien[a.li]!.zu ? L - d : d) < 19 * this.g;
    }
    return false;
  }

  /**
   * Länge der Nadel einer Richtung (Einheiten der Proben): so weit ihr Schwung reicht, höchstens 45 % des Stücks, aber mindestens
   * Fangradius des Punkts + 10, damit man sie auch an kurzen Stücken greift. 0: keine Richtung (Ende einer offenen Linie).
   */
  private nadelLaenge(li: number, k: number, seite: Seite): number {
    const l = this.netz.linien[li];
    const P = this.proben[li];
    if (!l || !P) return 0;
    const si = armStueck(l, k, seite);
    const g = armGriff(l, k, seite);
    if (si < 0 || !g) return 0;
    const stueck = P.stueckS[si + 1]! - P.stueckS[si]!;
    return Math.max((this.werte.fangPunkt + 10) * this.g, Math.min(Math.hypot(g[0], g[1]), 0.45 * stueck));
  }

  /** die Richtung, an der der Tropfen gerade hängt, oder null */
  private richtungJetzt(): RichtungZiel | null {
    const t = this.tropfen.find((q) => q.zustand === 'folgt');
    return t?.ziel.art === 'richtung' ? t.ziel : null;
  }

  /**
   * Richtung unter einer Stelle der Linie: Die Stelle liegt auf der Nadel eines sichtbaren Punkts dieser Linie. Die Nadel, an der der
   * Zeiger schon hängt (`halten`), reicht ein Siebtel weiter, damit es an ihrem Ende nicht hin und her springt.
   */
  private richtungBei(st: LinienTreffer, halten: RichtungZiel | null = null): RichtungZiel | null {
    const l = this.netz.linien[st.li];
    const P = this.proben[st.li];
    if (!l || !P) return null;
    const L = P.laenge;
    let best: RichtungZiel | null = null;
    let bd = Infinity;
    l.punkte.forEach((pi, k) => {
      if (!this.netz.punkte[pi]?.sichtbar) return;
      let ds = st.s - P.stueckS[k]!;
      if (l.zu) {
        while (ds > L / 2) ds -= L;
        while (ds <= -L / 2) ds += L;
      }
      const seite: Seite = ds >= 0 ? 'aus' : 'ein';
      const gehalten = !!halten && halten.li === st.li && halten.k === k && halten.seite === seite;
      const n = this.nadelLaenge(st.li, k, seite) * (gehalten ? 8 / 7 : 1);
      if (n > 0 && Math.abs(ds) <= n && Math.abs(ds) < bd) {
        bd = Math.abs(ds);
        best = { art: 'richtung', pi, li: st.li, k, seite };
      }
    });
    return best;
  }

  private neuerTropfen(k: { ziel: Ziel; x: number; y: number; verdeckt: boolean }): Tropfen {
    const punkt = k.ziel.art === 'punkt';
    const t: Tropfen = {
      ziel: k.ziel,
      verdeckt: k.verdeckt,
      ax: k.x,
      ay: k.y,
      pos: new Feder2(k.x, k.y),
      r: new Feder1(punkt ? 1 : 0),
      hals: new Feder1(punkt ? 1 : 0),
      zustand: 'folgt',
    };
    this.tropfen.push(t);
    return t;
  }

  /**
   * Wo der Tropfen hängt: an der Spitze des Zeigers, etwas zur Stelle hin, so dass die Spitze knapp in seinem Rand sitzt (wie im
   * Entwurf). Dicht an der Stelle ohne Versatz; liegt die Stelle hinter dem Zeiger, sitzt der Tropfen auf der Spitze.
   */
  private haengtAn(t: Tropfen): [number, number] {
    const [zx, zy] = this.gezeichnet();
    const r = this.werte.punktRadius * this.g;
    const dx = t.ax - zx;
    const dy = t.ay - zy;
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) return [zx, zy];
    const ux = dx / L;
    const uy = dy / L;
    const hinter = Math.min(1, Math.max(0, ux * ACHSE[0]! + uy * ACHSE[1]!));
    const f = glatt(0.6 * r, 2.6 * r, L) * (1 - hinter) * 0.6 * r;
    return [zx + ux * f, zy + uy * f];
  }

  /** Bogenlänge eines Punkts auf einer Linie (erstes Vorkommen) oder −1 */
  private sVonPunkt(li: number, pi: number): number {
    const l = this.netz.linien[li]!;
    const pos = l.punkte.indexOf(pi);
    if (pos < 0) return -1;
    const P = this.proben[li]!;
    return P.stueckS[Math.min(pos, P.stueckS.length - 1)]!;
  }

  /** Ein Bild weiter; true, solange sich etwas bewegt */
  schritt(dt: number): boolean {
    const w = this.werte;
    const z = this.zeiger;
    let bewegt = false;
    // der gezeichnete Zeiger gleitet (beim Greifen zur Stelle, beim Loslassen zurück)
    this.versatz.schritt(dt, w.greifHz, w.greifD);
    const [gx, gy] = this.gezeichnet();
    this.feld.zx = gx;
    this.feld.zy = gy;
    this.feld.schritt(dt, 9, 0.85);
    this.feldStaerke.ziel = z.da ? 1 : 0;
    this.feldStaerke.schritt(dt, 4, 1);
    this.zeigerSkala.ziel = z.gedrueckt ? 0.86 : 1;
    this.zeigerSkala.schritt(dt, 9, 0.55);
    z.vx *= Math.exp(-dt * 8);
    z.vy *= Math.exp(-dt * 8);

    // Zug: die Stelle folgt genau der Bewegung der Maus seit dem Drücken (nichts springt)
    const g = this.griff;
    if (g) {
      const dx = z.x - g.mx;
      const dy = z.y - g.my;
      if (!g.bewegt && Math.hypot(dx, dy) * this.zoom >= KLICK_WEG) g.bewegt = true;
      if (g.ziel.art === 'richtung' && g.spitze) {
        // der Zeiger gleitet an die Spitze des Griffs, sobald man hält oder zieht; die Richtung zeigt auf ihn
        g.zeit = (g.zeit ?? 0) + dt;
        if (!g.gleitet && (g.zeit > 0.12 || Math.hypot(dx, dy) > 2 * this.g)) {
          g.gleitet = true;
          this.versatz.zx = g.spitze[0] - g.mx;
          this.versatz.zy = g.spitze[1] - g.my;
        }
        this.dreher.drehenZiehen(g.spitze[0] + dx, g.spitze[1] + dy, this.alt, dt, this.kippen);
        this.drehBildLetzt = this.dreher.drehBild() ?? this.drehBildLetzt;
      } else if (this.raum) {
        if (g.mehrere) this.raum.punkteZiehen(dx, dy);
        else this.raum.ziehen(dx, dy);
      } else {
        this.netz = netzKopie(g.start);
        if (g.mehrere) punkteZiehen(g.start, this.netz, g.mehrere, dx, dy);
        else if (g.ziel.art === 'punkt') punktZiehen(g.start, this.netz, g.ziel.pi, dx, dy);
        else if (g.ziel.art === 'linie') stelleZiehen(g.start, this.netz, g.ziel.li, g.ziel.si, g.ziel.t, dx, dy);
        this.abtasten();
      }
      bewegt = true;
    }
    // Ziehen mit P: Griffe
    if (this.stiftZug) {
      this.stiftZiehen();
      bewegt = true;
    }
    // Rahmen: gewählt ist, was er umschließt (mit ⇧ dazu), schon während er gezogen wird
    if (this.rahmen) {
      const r = this.rahmen;
      [r.x1, r.y1] = this.gezeichnet();
      const drin = punkteImRahmen(this.netz, r.x0, r.y0, r.x1, r.y1).filter((p) => !this.raum || this.raum.ankerZuSehen(p));
      this.auswahl = new Set(r.plus ? [...r.vorher, ...drin] : drin);
      bewegt = true;
    }
    // Lasso: die Schlinge wächst mit dem Zeiger; gewählt ist, was sie umschließt, schon beim Ziehen
    if (this.lasso) {
      const L = this.lasso;
      const [x, y] = this.gezeichnet();
      const n = L.pfad.length;
      if (Math.hypot(x - L.pfad[n - 2]!, y - L.pfad[n - 1]!) > 1.5 * this.g) L.pfad.push(x, y);
      let drin = punkteImLasso(this.netz, L.pfad).filter((p) => !this.raum || this.raum.ankerZuSehen(p));
      // derselbe Punkt auf allen Flächen (Ozzy): Was die Schlinge an einer Wand umfährt, ist überall gewählt
      if (this.raum?.gleiche) drin = [...new Set(drin.flatMap((p) => this.raum!.gleiche!(p)))];
      if (L.minus) {
        const weg = new Set(drin);
        this.auswahl = new Set([...L.vorher].filter((p) => !weg.has(p)));
      } else this.auswahl = new Set(L.plus ? [...L.vorher, ...drin] : drin);
      bewegt = true;
    }
    // Doppelklick zum Runden: Die Richtung dreht sich in die Flucht ihrer Gegenseite
    if (this.ausrichtung) {
      this.ausrichtung.schritt(dt, 6, 0.9);
      this.dreher.ausrichten(this.ausrichtung.x);
      if (this.ausrichtung.ruhig(0.0005)) {
        this.dreher.ausrichten(1);
        this.ausrichtung = null;
      }
      bewegt = true;
    }

    // Ziel unter dem Zeiger (nicht während eines Zugs); es zählt der gezeichnete Zeiger
    const folgt = this.tropfen.find((t) => t.zustand === 'folgt');
    const [zx, zy] = this.gezeichnet();
    if (!this.zieht && !this.rahmen && !this.lasso) {
      const k = z.da ? this.kandidat() : null;
      if (folgt) {
        const halten = this.fang(folgt.ziel) * w.halten;
        const dAnker = Math.hypot(zx - folgt.ax, zy - folgt.ay);
        if (k && this.gleichesZiel(folgt.ziel, k.ziel)) {
          if (k.ziel.art !== 'punkt') {
            folgt.ziel = k.ziel;
            folgt.ax = k.x;
            folgt.ay = k.y;
          }
        } else if (
          k &&
          (dAnker > halten ||
            (k.ziel.art === 'punkt' && folgt.ziel.art !== 'punkt') ||
            k.ziel.art === 'richtung' ||
            folgt.ziel.art === 'richtung' ||
            k.d < dAnker - 4 * this.g)
        ) {
          folgt.zustand = 'zurueck';
          this.neuerTropfen(k);
        } else if (!z.da || dAnker > halten) {
          folgt.zustand = 'zurueck';
        } else if (folgt.ziel.art === 'linie' && this.proben[folgt.ziel.li]) {
          // ohne neuen Kandidaten gleitet der Anker auf seiner Linie mit
          const st = naechsteStelle([this.proben[folgt.ziel.li]!], zx, zy);
          if (st) {
            folgt.ziel = { art: 'linie', li: folgt.ziel.li, si: st.si, t: st.t, s: st.s };
            folgt.ax = st.x;
            folgt.ay = st.y;
          }
        }
      } else if (k) {
        const alt = this.tropfen.find((t) => t.zustand === 'zurueck' && this.gleichesZiel(t.ziel, k.ziel));
        if (alt) {
          alt.zustand = 'folgt';
          if (k.ziel.art !== 'punkt') {
            alt.ziel = k.ziel;
            alt.ax = k.x;
            alt.ay = k.y;
          }
        } else this.neuerTropfen(k);
      }
    }

    // Tropfen bewegen
    for (const t of this.tropfen) {
      // ohne P zeigt eine Linie keinen Tropfen, nur ihre Schwellung (der Tropfen bleibt als Merker, wohin gegriffen wird)
      const zeigen = t.ziel.art === 'punkt' || (t.ziel.art === 'linie' && this.stift) ? 1 : 0;
      if (t.ziel.art === 'punkt') {
        // im Raum: ein eben gesetzter Punkt kommt erst mit dem nächsten Bild ins projizierte Netz
        const p = this.netz.punkte[t.ziel.pi];
        if (!p) continue;
        t.ax = p.x;
        t.ay = p.y;
      } else if (t.zustand === 'gegriffen' && g && t.ziel.art === 'linie') {
        const st = this.raum ? this.raum.stelle(t.ziel) : bezier(kontrollpunkte(this.netz, this.netz.linien[t.ziel.li]!, t.ziel.si), t.ziel.t);
        if (st) [t.ax, t.ay] = st;
      }
      if (t.zustand === 'gegriffen') {
        // der Tropfen sitzt am gleitenden Zeiger und fließt mit ihm in seine Stelle
        const [gx2, gy2] = this.gezeichnet();
        t.pos.x = t.pos.zx = gx2;
        t.pos.y = t.pos.zy = gy2;
        t.pos.vx = z.vx + this.versatz.vx;
        t.pos.vy = z.vy + this.versatz.vy;
        t.r.ziel = w.tropfen * 1.08 * zeigen;
        t.hals.ziel = zeigen;
      } else if (t.zustand === 'folgt') {
        [t.pos.zx, t.pos.zy] = this.haengtAn(t);
        t.pos.schritt(dt, w.sprungHz, w.sprungD);
        // mit P ist der Tropfen der Punkt, der entsteht: auch dicht an der Linie so groß wie ein Tropfen (eine Perle in der Schwellung,
        // sonst ginge er in ihr unter); löst er sich, hängt er am Zeiger
        t.r.ziel = w.tropfen * zeigen;
        t.hals.ziel = zeigen;
      } else {
        t.pos.zx = t.ax;
        t.pos.zy = t.ay;
        t.pos.schritt(dt, w.zurueckHz, w.zurueckD);
        t.r.ziel = t.ziel.art === 'punkt' ? 1 : 0;
        t.hals.ziel = zeigen;
      }
      t.r.schritt(dt, 8, 0.5);
      t.hals.schritt(dt, 10, 0.9);
      if (!t.pos.ruhig(0.02 * this.g) || !t.r.ruhig(0.005) || t.zustand !== 'zurueck') bewegt = true;
    }
    this.tropfen = this.tropfen.filter(
      (t) => !(t.zustand === 'zurueck' && t.pos.ruhig(0.03 * this.g) && (t.ziel.art === 'punkt' ? t.r.ruhig(0.01) : t.r.x < 0.03)),
    );

    // Werkzeug P: was ein Klick täte, der Tropfen an der Feder, der Ring am ersten Punkt
    if (this.stift && !this.zieht) this.stiftZiel = z.da ? this.stiftZielBestimmen() : null;
    if (!this.stift) this.stiftZiel = null;
    const schluss = this.stiftZiel?.art === 'schluss' || this.stiftZug?.art === 'schluss';
    if (schluss) {
      const e = this.werk.entwurf();
      const P = e ? this.netz.punkte[e.erster] : undefined;
      if (P) this.schlussOrt = [P.x, P.y, P.z ?? 0];
    }
    this.schlussRing.ziel = schluss ? 1 : 0;
    this.schlussRing.schritt(dt, 9, 0.75);
    const haengtEiner = this.tropfen.some((t) => t.zustand === 'folgt');
    const federZeigen = this.stift && z.da && !this.stiftZug && !haengtEiner && (this.stiftZiel?.art === 'frei' || this.stiftZiel?.art === 'letzter');
    this.federR.ziel = federZeigen ? 1 : 0;
    this.federR.schritt(dt, 7, 0.5);
    {
      // er hängt an der Spitze, die Spitze sitzt knapp in seinem Rand (wie im Konzeptbild)
      const rT = w.punktRadius * w.tropfen * this.g;
      this.federPos.zx = zx - ACHSE[0]! * 0.62 * rT;
      this.federPos.zy = zy - ACHSE[1]! * 0.62 * rT;
      if (this.federR.x < 0.02 && this.federR.ziel === 0) this.federPos.setzen(this.federPos.zx, this.federPos.zy);
      this.federPos.schritt(dt, 13, 0.55);
    }
    if (!this.schlussRing.ruhig(0.002) || !this.federR.ruhig(0.002) || (this.federR.x > 0.01 && !this.federPos.ruhig(0.02 * this.g))) bewegt = true;
    // Wellen, zurückfließende Griffe, vergehende Punkte
    for (const W of this.wellen) W.zeit += dt;
    this.wellen = this.wellen.filter((W) => W.zeit < W.dauer && W.li < this.proben.length);
    for (const d of this.dornenAus) d.f.schritt(dt, 7, 1);
    this.dornenAus = this.dornenAus.filter((d) => d.f.x > 0.01);
    for (const q of this.geister) q.r.schritt(dt, 6, 0.9);
    this.geister = this.geister.filter((q) => q.r.x > 0.02);
    if (this.wellen.length || this.dornenAus.length || this.geister.length) bewegt = true;
    // Auswahl: gewählte schwellen ruhig an, abgewählte fließen zurück
    for (const p of this.auswahl) if (!this.auswahlF.has(p)) this.auswahlF.set(p, new Feder1(0));
    for (const [p, F] of this.auswahlF) {
      F.ziel = this.auswahl.has(p) ? 1 : 0;
      F.schritt(dt, 6, 0.8);
      if (F.ziel === 0 && F.x < 0.01) this.auswahlF.delete(p);
      else if (!F.ruhig(0.002)) bewegt = true;
    }
    if (this.rahmenAus) {
      const A = this.rahmenAus;
      A.f.schritt(dt, 4.5, 1);
      const k = 1 - Math.exp(-dt * 14);
      for (let i = 0; i < 4; i++) A.r[i] = A.r[i]! + (A.ziel[i]! - A.r[i]!) * k;
      if (A.f.x < 0.01) this.rahmenAus = null;
      bewegt = true;
    }
    if (this.lassoAus) {
      const A = this.lassoAus;
      // erst schließt der Tropfen die Naht, dann zieht sich die Schlinge zusammen und vergeht
      A.tropfen.schritt(dt, 4.5, 0.75);
      if (A.tropfen.x > 0.6) {
        A.f.schritt(dt, 1.4, 1);
        const k = 1 - Math.exp(-dt * 3.5);
        for (let i = 0; i + 1 < A.pfad.length; i += 2) {
          A.pfad[i] = A.pfad[i]! + (A.mitte[0] - A.pfad[i]!) * k;
          A.pfad[i + 1] = A.pfad[i + 1]! + (A.mitte[1] - A.pfad[i + 1]!) * k;
        }
      }
      if (A.f.x < 0.01) this.lassoAus = null;
      bewegt = true;
    }

    // Schwellung je Linie: Spindel am Ziel und beim Anflug, Nadel an einer Richtung. Eine Form: Wechselt das Ziel, fließt sie hinüber
    const ziele = new Map<number, SchwellZiel>();
    const aktiv = this.tropfen.find((t) => t.zustand === 'gegriffen') ?? this.tropfen.find((t) => t.zustand === 'folgt');
    const bild = this.griff?.ziel.art === 'richtung' ? this.drehBildLetzt : null;
    const Rl = w.reichweite * this.g;
    const spindelZiel = (c: number, st: number): SchwellZiel => ({ c, a: Rl, b: Rl, ha: 1, hb: 1, ta: 0, tb: 0, st, nadel: 0, pi: -1 });
    if (aktiv) {
      if (aktiv.ziel.art === 'linie') {
        const P = this.proben[aktiv.ziel.li]!;
        const si = aktiv.ziel.si;
        const s = aktiv.zustand === 'gegriffen' ? P.stueckS[si]! + aktiv.ziel.t * (P.stueckS[si + 1]! - P.stueckS[si]!) : aktiv.ziel.s;
        ziele.set(aktiv.ziel.li, spindelZiel(s, 1));
      } else if (aktiv.ziel.art === 'punkt') {
        const pi = aktiv.ziel.pi;
        this.netz.linien.forEach((_, li) => {
          const s = this.sVonPunkt(li, pi);
          if (s >= 0) ziele.set(li, spindelZiel(s, 1));
        });
      } else {
        const nz = this.nadelZiel(aktiv.ziel, bild ? bild.rund : null, 1);
        if (nz) ziele.set(aktiv.ziel.li, nz);
      }
    } else if (z.da) {
      // Anflug: Die nächste Linie schwillt schon in der Form an, die sie beim Treffen hat (nahe am Punkt als Nadel)
      const vor = w.fangLinie * w.anflug * this.g;
      const such = this.suchProben();
      const st = naechsteStelle(such, zx, zy, 0) ?? naechsteStelle(such, zx, zy, 1);
      if (st && st.d < vor) {
        const staerke = 0.8 * glatt(0, 1, 1 - st.d / vor);
        const r = this.stift ? null : this.richtungBei(st);
        ziele.set(st.li, (r ? this.nadelZiel(r, null, staerke) : null) ?? spindelZiel(st.s, staerke));
      }
    }
    this.schwell.forEach((S, li) => {
      const zl = ziele.get(li);
      S.st.ziel = zl ? zl.st : 0;
      const formen = [S.c, S.a, S.b, S.ha, S.hb, S.ta, S.tb, S.nadel];
      if (zl) {
        const werte = [zl.c, zl.a, zl.b, zl.ha, zl.hb, zl.ta, zl.tb, zl.nadel];
        if (S.st.x < 0.02) {
          // aus der Ruhe steht die Form gleich da, nur ihre Stärke wächst
          formen.forEach((F, i) => F.setzen(werte[i]!));
        } else {
          // auf geschlossenen Linien nimmt die Mitte den kurzen Weg
          const L = this.proben[li]!.laenge;
          let c = zl.c;
          if (this.netz.linien[li]!.zu) {
            while (c - S.c.x > L / 2) c -= L;
            while (S.c.x - c > L / 2) c += L;
          }
          werte[0] = c;
          formen.forEach((F, i) => (F.ziel = werte[i]!));
        }
        if (zl.pi >= 0) S.pi = zl.pi;
      }
      // die Mitte folgt dem Zeiger straff; fließt sie in eine Nadel hinein oder aus ihr heraus, weicher
      const zurNadel = Math.max(S.nadel.x, S.nadel.ziel);
      S.st.schritt(dt, w.schwellHz, w.schwellD);
      S.c.schritt(dt, 12 - 4.5 * zurNadel, 1);
      S.a.schritt(dt, 9, 0.9);
      S.b.schritt(dt, 9, 0.9);
      S.ha.schritt(dt, 8, 0.85);
      S.hb.schritt(dt, 8, 0.85);
      S.ta.schritt(dt, 9, 0.6);
      S.tb.schritt(dt, 9, 0.6);
      S.nadel.schritt(dt, 8, 0.9);
      if (!S.st.ruhig(0.002)) bewegt = true;
      else if (S.st.x > 0.002 && (formen.slice(0, 3).some((F) => !F.ruhig(0.02)) || formen.slice(3).some((F) => !F.ruhig(0.002)))) bewegt = true;
    });
    // Ring und Griff wachsen beim Drehen aus dem Punkt und fließen danach in ihn zurück
    this.ring.ziel = this.griff?.ziel.art === 'richtung' ? 1 : 0;
    this.ring.schritt(dt, 9, 0.8);
    if (!this.ring.ruhig(0.002)) bewegt = true;
    if (this.ring.x < 0.01 && !this.griff) this.drehBildLetzt = null;

    if (!this.feld.ruhig(0.01) || !this.feldStaerke.ruhig(0.002) || !this.zeigerSkala.ruhig(0.002) || !this.versatz.ruhig(0.005)) bewegt = true;
    if (Math.hypot(z.vx, z.vy) > 0.5) bewegt = true;
    const f = this.tropfen.find((t) => t.zustand !== 'zurueck');
    const zielText = (q: Ziel): string => (q.art === 'punkt' ? `Punkt ${q.pi}` : q.art === 'linie' ? `Linie ${q.li}` : `Richtung ${q.pi} ${q.seite} (Linie ${q.li})`);
    this.stat = { tropfen: this.tropfen.length, ziel: f ? zielText(f.ziel) : '' };
    return bewegt;
  }

  /**
   * Ziel der Schwellung an einer Richtung, die Nadel: Mitte am Punkt; auf der Seite der Richtung voll, so weit ihr Schwung reicht;
   * die Gegenseite rund schwächer (0,7), geknickt gar nicht, dafür eine Taille am Punkt. `rund`: beim Drehen aus dem Drehbild, sonst
   * aus dem Netz.
   */
  private nadelZiel(r: RichtungZiel, rund: boolean | null, st: number): SchwellZiel | null {
    const l = this.netz.linien[r.li];
    const s0 = this.proben[r.li]?.stueckS[r.k];
    if (!l || s0 === undefined) return null;
    const istRund = rund ?? !istKnick(l, r.k);
    const gegen = istRund && armGriff(l, r.k, GEGEN[r.seite]) ? 0.7 : 0;
    const knick = istRund ? 0 : 1;
    const aus = r.seite === 'aus';
    return {
      c: s0,
      a: this.nadelLaenge(r.li, r.k, 'ein'),
      b: this.nadelLaenge(r.li, r.k, 'aus'),
      ha: aus ? gegen : 1,
      hb: aus ? 1 : gegen,
      ta: aus ? 0 : knick,
      tb: aus ? knick : 0,
      st,
      nadel: 1,
      pi: r.pi,
    };
  }

  /**
   * Breite der Schwellung je Probe (halbe Zusatzbreite nach `extra`): von der Mitte aus zu jeder Seite (1 − x)^1,6 über ihre
   * Reichweite, mal ihrer Höhe (in der Mitte spitz wie ein Pinselstrich, am Ende ohne Knick in die Grundbreite); mit Taille schnürt
   * sie sich zur Mitte hin ein.
   */
  private schwellBreite(li: number, P: LinienProben, zu: boolean, extra: Float32Array): void {
    const S = this.schwell[li];
    if (!S || S.st.x < 1e-3) return;
    const w = this.werte;
    const L = P.laenge;
    let mitte = S.c.x;
    if (zu) {
      mitte %= L;
      if (mitte < 0) mitte += L;
    }
    for (let k = 0; k < P.n; k++) {
      let ds = P.s[k]! - mitte;
      if (zu) {
        while (ds > L / 2) ds -= L;
        while (ds <= -L / 2) ds += L;
      }
      const rechts = ds >= 0;
      const weit = rechts ? S.b.x : S.a.x;
      if (weit <= 1e-3) continue;
      const x = Math.abs(ds) / weit;
      if (x >= 1) continue;
      let f = Math.pow(1 - x, 1.6) * Math.max(0, rechts ? S.hb.x : S.ha.x);
      const t = Math.min(1, Math.max(0, rechts ? S.tb.x : S.ta.x));
      if (t > 1e-3) f *= 1 - t * (1 - glatt(0.05, 0.32, x));
      const e = 0.5 * w.schwellen * S.st.x * f;
      if (e > extra[k]!) extra[k] = e;
    }
  }

  /** gewählte Punkte: ihre Linien schwellen ruhig an (kleiner Stern, 0,42 der Reichweite, Höhe 0,3) */
  private auswahlBreite(li: number, P: LinienProben, zu: boolean, extra: Float32Array): void {
    if (!this.auswahlF.size) return;
    const w = this.werte;
    const L = P.laenge;
    const R0 = 0.42 * w.reichweite * this.g;
    for (const [pi, F] of this.auswahlF) {
      if (F.x < 0.005) continue;
      const s0 = this.sVonPunkt(li, pi);
      if (s0 < 0) continue;
      for (let k = 0; k < P.n; k++) {
        let ds = Math.abs(P.s[k]! - s0);
        if (zu) ds = Math.min(ds, L - ds);
        if (ds >= R0) continue;
        const e = 0.5 * w.schwellen * 0.3 * F.x * Math.pow(1 - ds / R0, 1.6);
        if (e > extra[k]!) extra[k] = e;
      }
    }
  }

  /** Wellen: eine Schwellung läuft einmal die Linie entlang (vorn voll, hinten flacher), schwillt an und vergeht */
  private wellenBreite(li: number, P: LinienProben, zu: boolean, extra: Float32Array): void {
    const w = this.werte;
    const L = P.laenge;
    for (const W of this.wellen) {
      if (W.li !== li || L <= 0) continue;
      const u = Math.min(1, W.zeit / W.dauer);
      const fort = glatt(0, 1, u);
      const c = zu ? W.s0 + fort * L : fort * L;
      const reich = Math.min(0.2 * L, 2 * w.reichweite * this.g);
      const st = 0.65 * Math.sin(Math.PI * u);
      for (let k = 0; k < P.n; k++) {
        let ds = P.s[k]! - c;
        if (zu) {
          while (ds > L / 2) ds -= L;
          while (ds <= -L / 2) ds += L;
        }
        if (Math.abs(ds) >= reich) continue;
        const e = 0.5 * w.schwellen * st * Math.pow(1 - Math.abs(ds) / reich, 1.6) * (ds >= 0 ? 1 : 0.55);
        if (e > extra[k]!) extra[k] = e;
      }
    }
  }

  /** Griff als Haarlinie mit weichem Fuß am Punkt und Perle an der Spitze (wie beim Drehen); f: wie weit er da ist */
  private dornZeichnen(c: Zeichnen, hx: number, hy: number, tx: number, ty: number, perle: number, f = 1): void {
    const w = this.werte;
    const L = Math.hypot(tx - hx, ty - hy);
    if (L < 1e-4 || f < 0.01) return;
    const fuss = Math.min(L, 4 * this.g);
    const fx = hx + ((tx - hx) / L) * fuss;
    const fy = hy + ((ty - hy) / L) * fuss;
    c.push(c.X(hx), c.Y(hy), c.X(fx), c.Y(fy), c.R(0.55 * f), c.R(w.innen / 2), c.gruppe(), 0, 1);
    c.push(c.X(fx), c.Y(fy), c.X(tx), c.Y(ty), c.R(w.innen / 2), c.R(w.innen / 2), c.gruppe(), 0, 0);
    c.push(c.X(tx), c.Y(ty), c.X(tx), c.Y(ty), c.R(w.punktRadius * perle * f), c.R(w.punktRadius * perle * f), c.gruppe(), 0, 1);
    if (c.felder.length < MAX_FELDER * 4) c.felder.push(c.X(tx), c.Y(ty), c.R(4), f);
  }

  /** Haarlinie zwischen zwei Lagen, grün (die alte Lage eines Griffs) */
  private geistZeichnen(c: Zeichnen, x0: number, y0: number, x1: number, y1: number): void {
    const w = this.werte;
    c.push(c.X(x0), c.Y(y0), c.X(x1), c.Y(y1), c.R(w.innen / 2), c.R(w.innen / 2), c.gruppe(), 1, 0);
  }

  /** Faden: die nächste Linie genau so, wie sie wird; frei schwillt sein Ende zum Tropfen an der Feder hin an */
  private fadenZeichnen(c: Zeichnen, F: FadenProben, frei: boolean): void {
    const w = this.werte;
    const L = F.laenge;
    const hals = Math.min(0.22 * L, 16 * this.g);
    const rEnde = 0.55 * Math.max(0, this.federR.x);
    const halb = (s: number): number => {
      if (!frei || hals <= 0) return w.innen / 2;
      const f = Math.max(0, (s - (L - hals)) / hals);
      return w.innen / 2 + Math.max(0, rEnde - w.innen / 2) * Math.pow(f, 2.2);
    };
    const g = c.gruppe();
    const sch = c.raum ? 2 : 0;
    for (let k = 0; k + 1 < F.n; k++) {
      c.push(c.X(F.x[k]!), c.Y(F.y[k]!), c.X(F.x[k + 1]!), c.Y(F.y[k + 1]!), c.R(halb(F.s[k]!)), c.R(halb(F.s[k + 1]!)), g, sch, 0, F.z?.[k] ?? 0, F.z?.[k + 1] ?? 0);
    }
    // wo der Faden Linien kreuzt, entsteht dort ein Punkt: er wächst, sobald das Ende über die Linie hinaus ist
    for (const q of this.fadenKreuzungen(F)) {
      const f = glatt(0, 6 * this.g, L - q.s);
      if (f < 0.02) continue;
      const r = w.punktRadius * f;
      c.push(c.X(q.x), c.Y(q.y), c.X(q.x), c.Y(q.y), c.R(r), c.R(r), c.gruppe(), c.raum ? 2 : 0, 1, q.z, q.z);
    }
  }

  /**
   * Wo der Faden (Polygon) die Linien kreuzt (nicht die eigene, nicht verdeckt), mit Bogenlänge auf dem Faden. Im Raum zählt eine
   * Kreuzung auf dem Bildschirm nur, wo beide gleich tief liegen (auf derselben Haut, nicht eine vor der anderen).
   */
  private fadenKreuzungen(F: FadenProben): { x: number; y: number; z: number; s: number }[] {
    const aus: { x: number; y: number; z: number; s: number }[] = [];
    const tief = this.raum ? 2 * this.raum.bias() : Infinity;
    const rand = 1.5 * this.g;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < F.n; i++) {
      x0 = Math.min(x0, F.x[i]!);
      x1 = Math.max(x1, F.x[i]!);
      y0 = Math.min(y0, F.y[i]!);
      y1 = Math.max(y1, F.y[i]!);
    }
    for (const P of this.suchProben()) {
      for (let j = 0; j + 1 < P.n; j++) {
        if (!this.raum && P.schicht[j] === 1) continue;
        const bx = P.x[j]!;
        const by = P.y[j]!;
        const cx = P.x[j + 1]!;
        const cy = P.y[j + 1]!;
        if (Math.max(bx, cx) < x0 || Math.min(bx, cx) > x1 || Math.max(by, cy) < y0 || Math.min(by, cy) > y1) continue;
        const vx = cx - bx;
        const vy = cy - by;
        for (let i = 0; i + 1 < F.n; i++) {
          const ax = F.x[i]!;
          const ay = F.y[i]!;
          const ux = F.x[i + 1]! - ax;
          const uy = F.y[i + 1]! - ay;
          const d = ux * vy - uy * vx;
          if (Math.abs(d) < 1e-12) continue;
          const tt = ((bx - ax) * vy - (by - ay) * vx) / d;
          const ss = ((bx - ax) * uy - (by - ay) * ux) / d;
          if (tt < 0 || tt >= 1 || ss < 0 || ss >= 1) continue;
          const s = F.s[i]! + (F.s[i + 1]! - F.s[i]!) * tt;
          if (s < rand || s > F.laenge - rand) continue;
          const zF = F.z ? F.z[i]! + (F.z[i + 1]! - F.z[i]!) * tt : 0;
          const zP = P.z ? P.z[j]! + (P.z[j + 1]! - P.z[j]!) * ss : 0;
          if (Math.abs(zF - zP) > tief) continue;
          aus.push({ x: ax + ux * tt, y: ay + uy * tt, z: zF, s });
        }
      }
    }
    return aus;
  }

  /** Ring (Haarlinie) um einen Punkt */
  private ringZeichnen(c: Zeichnen, x: number, y: number, z: number, rho: number, halb: number): void {
    const g = c.gruppe();
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      const b = (2 * Math.PI * (i + 1)) / n;
      c.push(c.X(x + rho * Math.cos(a)), c.Y(y + rho * Math.sin(a)), c.X(x + rho * Math.cos(b)), c.Y(y + rho * Math.sin(b)), c.R(halb), c.R(halb), g, c.raum ? 2 : 0, 0, z, z);
    }
  }

  private stiftZeichnen(c: Zeichnen): void {
    const w = this.werte;
    const e = this.stift ? this.werk.entwurf() : null;
    // Faden vom letzten Punkt zum Zeiger (oder zu dem, woran er gleich hängt)
    if (e && !this.stiftZug) {
      const zl = this.stiftZiel;
      let ende: FadenEnde | null = null;
      let gEnde: V2 = [0, 0];
      if (zl?.art === 'schluss') {
        ende = { art: 'schluss' };
        gEnde = e.einErster;
      } else if (zl?.art === 'punkt') ende = { art: 'punkt', pi: zl.pi };
      else if (zl?.art === 'linie') ende = { art: 'linie', li: zl.li, si: zl.si, t: zl.t };
      else if (zl?.art === 'frei') ende = { art: 'frei', x: zl.x, y: zl.y };
      const F = ende ? this.werk.faden(ende, gEnde) : null;
      if (F) this.fadenZeichnen(c, F, zl?.art === 'frei');
      if (F?.spiegel) this.fadenZeichnen(c, F.spiegel, false);
      // wo die Linie schon Linien kreuzt: dort entstehen Punkte, wenn sie fertig ist
      const l = e.li >= 0 ? this.netz.linien[e.li] : undefined;
      const PL = e.li >= 0 ? this.proben[e.li] : undefined;
      if (l && PL) {
        const eigene = l.punkte.map((p) => this.netz.punkte[p]!);
        for (const q of this.fadenKreuzungen(PL)) {
          if (eigene.some((p) => Math.hypot(p.x - q.x, p.y - q.y) < 1.5 * this.g)) continue;
          c.push(c.X(q.x), c.Y(q.y), c.X(q.x), c.Y(q.y), c.R(w.punktRadius), c.R(w.punktRadius), c.gruppe(), c.raum ? 2 : 0, 1, q.z, q.z);
        }
      }
      // der Griff, mit dem die nächste Verbindung den letzten Punkt verlässt
      const P = this.netz.punkte[e.letzter];
      if (P && (e.aus[0] || e.aus[1])) this.dornZeichnen(c, P.x, P.y, P.x + e.aus[0], P.y + e.aus[1], 0.6, 0.85);
    }
    // beim Ziehen: beide Griffe aus dem Punkt; gebrochen steht die alte Lage grün
    const sz = this.stiftZug;
    if (e && sz && sz.bewegt) {
      const pi = sz.art === 'erster' || sz.art === 'schluss' ? e.erster : e.letzter;
      const P = this.netz.punkte[pi];
      if (P) {
        const zug: V2 = sz.art === 'schluss' && sz.gebrochen ? [-sz.gegen[0], -sz.gegen[1]] : sz.aus;
        const andere: V2 = sz.art === 'schluss' ? (sz.gebrochen ? sz.aus : sz.gegen) : sz.gegen;
        if (sz.gebrochen) this.geistZeichnen(c, P.x, P.y, P.x - zug[0], P.y - zug[1]);
        if (sz.art !== 'letzter' && (andere[0] || andere[1])) this.dornZeichnen(c, P.x, P.y, P.x + andere[0], P.y + andere[1], 0.7);
        this.dornZeichnen(c, P.x, P.y, P.x + zug[0], P.y + zug[1], 0.8);
      }
    }
    // Griffe, die in ihren Punkt zurückfließen
    for (const d of this.dornenAus) this.dornZeichnen(c, d.x, d.y, d.x + d.gx * d.f.x, d.y + d.gy * d.f.x, 0.6, d.f.x);
    // im Raum: nahe der Mitte zeigt sie sich als Punktreihe auf der Haut
    if (this.stift && c.raum && this.zeiger.da && !this.stiftZug) {
      const [zx, zy] = this.gezeichnet();
      const m = this.werk.mittePunkte(zx, zy, 42 * this.g);
      for (let i = 0; i + 3 < m.length; i += 4) {
        const r = 0.55 * w.punktRadius * glatt(0, 0.6, m[i + 3]!);
        if (r < 0.03) continue;
        c.push(c.X(m[i]!), c.Y(m[i + 1]!), c.X(m[i]!), c.Y(m[i + 1]!), c.R(r), c.R(r), c.gruppe(), 2, 1, m[i + 2]!, m[i + 2]!);
      }
    }
    // Ring am ersten Punkt: schließen
    const f = this.schlussRing.x;
    if (f > 0.01) {
      const [px, py, pz] = this.schlussOrt;
      this.ringZeichnen(c, px, py, pz, (2.2 + 1.1 * Math.min(1, f)) * w.punktRadius * this.g, (w.innen * 0.45 + 0.1) * Math.min(1, f));
      if (c.felder.length < MAX_FELDER * 4) c.felder.push(c.X(px), c.Y(py), c.R(7), Math.min(1, f));
    }
    // Tropfen an der Feder, mit weichem Hals zur Spitze
    const r = w.punktRadius * w.tropfen * this.federR.x;
    if (r > 0.01 && this.zeiger.da) {
      const [tx, ty] = this.gezeichnet();
      const cx = this.federPos.x;
      const cy = this.federPos.y;
      let ex = -this.federPos.vx * w.dehnung;
      let ey = -this.federPos.vy * w.dehnung;
      const el = Math.hypot(ex, ey);
      const emax = 1.6 * r * this.g;
      if (el > emax) {
        ex *= emax / el;
        ey *= emax / el;
      }
      const rr = r / Math.sqrt(1 + Math.min(el, emax) / this.g / (4 * r));
      c.push(c.X(cx), c.Y(cy), c.X(cx + ex), c.Y(cy + ey), c.R(rr), c.R(rr * 0.5), c.gruppe(), 0, 1);
      c.push(c.X(cx), c.Y(cy), c.X(tx), c.Y(ty), c.R(r * 0.55), c.R(0.12), c.gruppe(), 0, 1);
      if (c.felder.length < MAX_FELDER * 4) c.felder.push(c.X(cx), c.Y(cy), c.R(3.2 * r), Math.min(1, this.federR.x));
    }
  }

  private auswahlZeichnen(c: Zeichnen): void {
    const w = this.werte;
    // gewählte Punkte verschmelzen weich mit ihren Linien (so viele, wie Felder frei sind; die nächsten am Zeiger zuerst)
    if (this.auswahlF.size) {
      const [zx, zy] = this.gezeichnet();
      const liste = [...this.auswahlF].flatMap(([pi, F]) => {
        const p = this.netz.punkte[pi];
        return p && F.x > 0.01 ? [{ p, f: F.x, d: Math.hypot(p.x - zx, p.y - zy) }] : [];
      });
      liste.sort((a, b) => a.d - b.d);
      for (const q of liste) {
        if (c.felder.length >= MAX_FELDER * 4) break;
        c.felder.push(c.X(q.p.x), c.Y(q.p.y), c.R(3.5 * w.punktRadius), q.f);
      }
    }
    // Rahmen: Haarlinie mit runden Ecken
    const rahmen = (x0: number, y0: number, x1: number, y1: number, f: number): void => {
      const [xa, xb] = [Math.min(x0, x1), Math.max(x0, x1)];
      const [ya, yb] = [Math.min(y0, y1), Math.max(y0, y1)];
      const rc = Math.min(6 * this.g, (xb - xa) / 2, (yb - ya) / 2);
      const b = w.innen * 0.75 * f;
      if (b < 0.005) return;
      const g = c.gruppe();
      const linie = (ax: number, ay: number, bx: number, by: number): void => c.push(c.X(ax), c.Y(ay), c.X(bx), c.Y(by), c.R(b), c.R(b), g, 0, 0);
      linie(xa + rc, ya, xb - rc, ya);
      linie(xa + rc, yb, xb - rc, yb);
      linie(xa, ya + rc, xa, yb - rc);
      linie(xb, ya + rc, xb, yb - rc);
      const ecke = (cx: number, cy: number, w0: number): void => {
        for (let i = 0; i < 8; i++) {
          const p = w0 + ((Math.PI / 2) * i) / 8;
          const q = w0 + ((Math.PI / 2) * (i + 1)) / 8;
          linie(cx + rc * Math.cos(p), cy + rc * Math.sin(p), cx + rc * Math.cos(q), cy + rc * Math.sin(q));
        }
      };
      if (rc > 0) {
        ecke(xb - rc, yb - rc, 0);
        ecke(xa + rc, yb - rc, Math.PI / 2);
        ecke(xa + rc, ya + rc, Math.PI);
        ecke(xb - rc, ya + rc, (3 * Math.PI) / 2);
      }
    };
    if (this.rahmen) rahmen(this.rahmen.x0, this.rahmen.y0, this.rahmen.x1, this.rahmen.y1, 1);
    if (this.rahmenAus) rahmen(...this.rahmenAus.r, this.rahmenAus.f.x);
    // Lasso: eine Haarlinie längs der Schlinge; zum Anfang hin offen (ein leiser Faden zeigt, wo sie sich schließt); beim Loslassen fließt
    // ein Tropfen in die Naht
    const schlinge = (pfad: number[], schluss: number, f: number, tropfen: number): void => {
      const b = w.innen * 0.75 * f;
      if (b < 0.005 || pfad.length < 4) return;
      const g = c.gruppe();
      const n = pfad.length;
      for (let i = 0; i + 3 < n; i += 2) c.push(c.X(pfad[i]!), c.Y(pfad[i + 1]!), c.X(pfad[i + 2]!), c.Y(pfad[i + 3]!), c.R(b), c.R(b), g, 0, 0);
      // die Naht: vom Ende zum Anfang, erst als Faden, beim Schließen voll
      const bn = b * (0.35 + 0.65 * schluss);
      c.push(c.X(pfad[n - 2]!), c.Y(pfad[n - 1]!), c.X(pfad[0]!), c.Y(pfad[1]!), c.R(bn), c.R(bn), g, 0, 0);
      if (tropfen > 0.01) {
        const r = w.punktRadius * 1.6 * Math.sin(Math.PI * Math.min(1, tropfen)) * f;
        if (r > 0.01) {
          const mx = (pfad[n - 2]! + pfad[0]!) / 2;
          const my = (pfad[n - 1]! + pfad[1]!) / 2;
          c.push(c.X(mx), c.Y(my), c.X(mx), c.Y(my), c.R(r), c.R(r), c.gruppe(), 0, 1);
        }
      }
    };
    if (this.lasso) schlinge(this.lasso.pfad, 0, 1, 0);
    if (this.lassoAus) schlinge(this.lassoAus.pfad, Math.min(1, this.lassoAus.tropfen.x), Math.min(1, 2.2 * this.lassoAus.f.x), this.lassoAus.tropfen.x);
    // gelöschte Punkte vergehen
    for (const q of this.geister) {
      const r = w.punktRadius * q.r.x;
      c.push(c.X(q.x), c.Y(q.y), c.X(q.x), c.Y(q.y), c.R(r), c.R(r), c.gruppe(), c.raum ? 2 : 0, 1, q.z, q.z);
    }
  }

  /** Neigung der Linien zu den Tropfen hin: Versatz je Probe */
  private neigung(li: number, P: LinienProben, vx: Float32Array, vy: Float32Array): void {
    const w = this.werte;
    const l = this.netz.linien[li]!;
    const L = P.laenge;
    for (const t of this.tropfen) {
      if (t.zustand === 'gegriffen') continue;
      let ox = (t.pos.x - t.ax) * w.spannung * t.hals.x;
      let oy = (t.pos.y - t.ay) * w.spannung * t.hals.x;
      const lo = Math.hypot(ox, oy);
      const max = 1.2 * this.g;
      if (lo > max) {
        ox *= max / lo;
        oy *= max / lo;
      }
      if (lo < 1e-4) continue;
      const orte: number[] = [];
      if (t.ziel.art === 'linie' && t.ziel.li === li) orte.push(t.ziel.s);
      if (t.ziel.art === 'punkt') {
        const s = this.sVonPunkt(li, t.ziel.pi);
        if (s >= 0) orte.push(s);
      }
      if (!orte.length) continue;
      const R = 17 * this.g;
      for (let k = 0; k < P.n; k++) {
        let wk = 0;
        for (const s0 of orte) {
          let ds = Math.abs(P.s[k]! - s0);
          if (l.zu) ds = Math.min(ds, L - ds);
          wk = Math.max(wk, glocke3(ds / R));
        }
        if (wk <= 0) continue;
        vx[k] = vx[k]! + ox * wk;
        vy[k] = vy[k]! + oy * wk;
      }
    }
  }

  szene(a: Ansicht): Szene {
    const w = this.werte;
    const s = (a.wachsen ? a.z : 1) * (a.massstab ?? 1);
    const D = a.dpr;
    const raum = !!this.raum;
    const X = (x: number): number => (x * a.z + a.ox) * D;
    const Y = (y: number): number => (y * a.z + a.oy) * D;
    const R = (r: number): number => r * s * D;
    let n = 0;
    /** art 0: Linie (harte Vereinigung), 1: Punkt, Tropfen, Hals (weich); schicht 2: nach Tiefe (z0, z1) */
    const push = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, gruppe: number, schicht: number, art: number, z0 = 0, z1 = 0, bereich = 0, f0 = 0, f1 = 0): void => {
      if ((n + 1) * PRIM_FELDER > this.puffer.length) {
        const neu = new Float32Array(this.puffer.length * 2);
        neu.set(this.puffer);
        this.puffer = neu;
      }
      const o = n * PRIM_FELDER;
      const b = this.puffer;
      b[o] = x0;
      b[o + 1] = y0;
      b[o + 2] = x1;
      b[o + 3] = y1;
      b[o + 4] = r0;
      b[o + 5] = r1;
      b[o + 6] = gruppe;
      b[o + 7] = schicht + 4 * art + 8 * bereich;
      b[o + 8] = z0;
      b[o + 9] = z1;
      b[o + 10] = f0;
      b[o + 11] = f1;
      n++;
    };
    let gruppe = 0;
    // Linien
    this.proben.forEach((P, li) => {
      const zu = this.netz.linien[li]!.zu;
      const extra = new Float32Array(P.n);
      this.schwellBreite(li, P, zu, extra);
      this.auswahlBreite(li, P, zu, extra);
      this.wellenBreite(li, P, zu, extra);
      const vx = new Float32Array(P.n);
      const vy = new Float32Array(P.n);
      this.neigung(li, P, vx, vy);
      const bl = this.raum?.bereich?.('linie', li) ?? 0;
      for (const sch of raum ? [2] : [0, 1]) {
        let etwas = false;
        for (let k = 0; k + 1 < P.n; k++) {
          if (!raum && P.schicht[k] !== sch) continue;
          push(
            X(P.x[k]! + vx[k]!),
            Y(P.y[k]! + vy[k]!),
            X(P.x[k + 1]! + vx[k + 1]!),
            Y(P.y[k + 1]! + vy[k + 1]!),
            R(P.halb[k]! + extra[k]!),
            R(P.halb[k + 1]! + extra[k + 1]!),
            gruppe,
            sch,
            0,
            P.z?.[k] ?? 0,
            P.z?.[k + 1] ?? 0,
            bl,
            P.fein ? R(P.fein[k]!) : 0,
            P.fein ? R(P.fein[k + 1]!) : 0,
          );
          etwas = true;
        }
        if (etwas) gruppe++;
      }
    });
    // Punkte, die gerade kein Tropfen sind
    const alsTropfen = new Set<number>();
    for (const t of this.tropfen) if (t.ziel.art === 'punkt') alsTropfen.add(t.ziel.pi);
    this.netz.punkte.forEach((p, pi) => {
      if ((!p.sichtbar && !p.zeigen) || alsTropfen.has(pi)) return;
      // gewählt: ein Tropfen, ein wenig größer (Ozzy, S21: dazu seine Größe)
      const r = w.punktRadius * (1 + 0.6 * (this.auswahlF.get(pi)?.x ?? 0)) * (p.gross ?? 1);
      push(X(p.x), Y(p.y), X(p.x), Y(p.y), R(r), R(r), gruppe++, raum ? 2 : p.verdeckt ? 1 : 0, 1, p.z ?? 0, p.z ?? 0, this.raum?.bereich?.('punkt', pi) ?? 0);
    });
    // Tropfen mit Hals
    const felder: number[] = [];
    felder.push(X(this.feld.x), Y(this.feld.y), R(w.reichweite), this.feldStaerke.x);
    for (const t of this.tropfen) {
      // Tropfen und Hals hängen am Zeiger: im Raum immer vorn
      const sch = !raum && t.verdeckt ? 1 : 0;
      const r = w.punktRadius * t.r.x;
      let ox = (t.pos.x - t.ax) * w.spannung * t.hals.x;
      let oy = (t.pos.y - t.ay) * w.spannung * t.hals.x;
      const lo = Math.hypot(ox, oy);
      if (lo > 1.2 * this.g) {
        ox *= (1.2 * this.g) / lo;
        oy *= (1.2 * this.g) / lo;
      }
      if (t.zustand === 'gegriffen') ox = oy = 0;
      const ax = t.ax + ox;
      const ay = t.ay + oy;
      const L = Math.hypot(t.pos.x - ax, t.pos.y - ay);
      const fang = this.fang(t.ziel) * w.halten;
      if (L > 0.05 * this.g && t.hals.x > 0.01) {
        const dick = 0.5 * w.hals * t.hals.x * Math.min(1, Math.max(0.25, 1 - L / (fang * 1.4)));
        push(X(ax), Y(ay), X(t.pos.x), Y(t.pos.y), R(dick * 1.15), R(dick * 0.85), gruppe++, sch, 1);
      }
      if (r > 0.01) {
        // Dehnung nach Tempo: der Tropfen zieht einen Schweif hinter sich her, die Fläche bleibt ungefähr gleich
        let ex = -t.pos.vx * w.dehnung;
        let ey = -t.pos.vy * w.dehnung;
        const el = Math.hypot(ex, ey);
        const emax = 2.2 * r * this.g;
        if (el > emax) {
          ex *= emax / el;
          ey *= emax / el;
        }
        const e = Math.min(el, emax) / this.g;
        const rr = r / Math.sqrt(1 + e / (4 * r));
        push(X(t.pos.x), Y(t.pos.y), X(t.pos.x + ex), Y(t.pos.y + ey), R(rr), R(rr * 0.5), gruppe++, sch, 1);
      }
      if (felder.length < MAX_FELDER * 4) felder.push(X((t.pos.x + ax) / 2), Y((t.pos.y + ay) / 2), R(L / 2 / this.g + 4 * w.punktRadius), Math.max(t.r.x, t.hals.x));
    }
    // Nadel: weich durch den Punkt, wenn rund (geknickt sitzt er hart als Fuge); das Feld wächst mit dem Anteil Nadel
    this.schwell.forEach((S) => {
      const st = S.st.x * Math.min(1, Math.max(0, S.nadel.x)) * (1 - Math.min(1, Math.max(0, S.ta.x, S.tb.x)));
      const p = S.pi >= 0 ? this.netz.punkte[S.pi] : undefined;
      if (st >= 0.01 && p && felder.length < MAX_FELDER * 4) felder.push(X(p.x), Y(p.y), R(5 * w.punktRadius), st);
    });
    // Drehen: Ring (im Raum nach Tiefe verdeckt), alte Richtung grün, Griff als Haarlinie mit weichem Fuß und Perle, Nabe
    const B = this.drehBildLetzt;
    if (B && this.ring.x > 0.01) {
      const f = this.ring.x;
      const [hx, hy, hz] = B.nabe;
      const um = (q: readonly number[], i: number): [number, number, number] => [hx + (q[i]! - hx) * f, hy + (q[i + 1]! - hy) * f, hz + (q[i + 2]! - hz) * f];
      const rg = gruppe++;
      for (let i = 0; i + 5 < B.ring.length; i += 3) {
        const a0 = um(B.ring, i);
        const a1 = um(B.ring, i + 3);
        push(X(a0[0]), Y(a0[1]), X(a1[0]), Y(a1[1]), R(w.innen / 2), R(w.innen / 2), rg, raum ? 2 : 0, 0, a0[2], a1[2]);
      }
      for (let i = 0; i + 5 < B.alt.length; i += 6) {
        const a0 = um(B.alt, i);
        const a1 = um(B.alt, i + 3);
        push(X(a0[0]), Y(a0[1]), X(a1[0]), Y(a1[1]), R(w.innen / 2), R(w.innen / 2), gruppe++, 1, 0);
      }
      const sp = um(B.spitze, 0);
      const L = Math.hypot(sp[0] - hx, sp[1] - hy);
      if (L > 1e-3) {
        const fuss = Math.min(L, 4 * this.g);
        const fx = hx + ((sp[0] - hx) / L) * fuss;
        const fy = hy + ((sp[1] - hy) / L) * fuss;
        push(X(hx), Y(hy), X(fx), Y(fy), R(0.55), R(w.innen / 2), gruppe++, 0, 1);
        push(X(fx), Y(fy), X(sp[0]), Y(sp[1]), R(w.innen / 2), R(w.innen / 2), gruppe++, 0, 0);
        push(X(sp[0]), Y(sp[1]), X(sp[0]), Y(sp[1]), R(w.punktRadius * 0.8 * f), R(w.punktRadius * 0.8 * f), gruppe++, 0, 1);
        if (felder.length < MAX_FELDER * 4) felder.push(X(sp[0]), Y(sp[1]), R(4), f);
      }
      push(X(hx), Y(hy), X(hx), Y(hy), R(w.punktRadius * 1.1), R(w.punktRadius * 1.1), gruppe++, 0, 1);
    }
    // Werkzeug P und Auswahl: Faden, Griffe, Ring, Tropfen an der Feder, Rahmen, vergehende Punkte
    const c: Zeichnen = { push, X, Y, R, felder, gruppe: () => gruppe++, raum };
    this.stiftZeichnen(c);
    this.auswahlZeichnen(c);
    // Zeiger: Spitze oben links, schlicht
    let zeiger: Szene['zeiger'] = null;
    if (this.zeiger.da && this.zeigerZeigen) {
      const L = w.zeigerGroesse * D * this.zeigerSkala.x;
      const ax = (this.zeiger.sx + this.versatz.x * a.z) * D;
      const ay = (this.zeiger.sy + this.versatz.y * a.z) * D;
      zeiger = {
        ax,
        ay,
        bx: ax + L * Math.cos(ZEIGER_WINKEL[0]!),
        by: ay + L * Math.sin(ZEIGER_WINKEL[0]!),
        cx: ax + L * Math.cos(ZEIGER_WINKEL[1]!),
        cy: ay + L * Math.sin(ZEIGER_WINKEL[1]!),
        linie: w.zeigerLinie * D,
      };
    }
    return { prim: this.puffer, anzahl: n, k0: R(w.weichGrund), k1: R(w.weich), felder, tinte: TINTE, gruen: GRUEN, zeiger };
  }
}
