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
 *    Stelle genau der Bewegung der Maus, der Zeiger sitzt auf ihr; beim Loslassen gleitet er zurück unter die Maus.
 *
 * Werkzeug P (Florian, 15.11.: „die Punkte auf der Linie sollen nur erscheinen, wenn ich mit Werkzeug P einen Punkt auf Linien setzen
 * kann, sonst nur die Verdickung“): Ohne P zeigt eine Linie unter dem Zeiger nur ihre Schwellung, gegriffen und gezogen wird sie wie
 * bisher. Mit P hängt dort der Tropfen; Drücken setzt ihn als Punkt auf die Linie (er bleibt gegriffen, Ziehen verschiebt ihn gleich).
 *
 * Richtungen (Konzept „Richtungen statt Griffe“, 15.11., `richtung.ts`): Auf der Linie nahe an einem Punkt schwillt sie vom Punkt aus
 * an, so weit ihr Schwung reicht (Nadel): rund auf beiden Seiten, geknickt nur auf einer, mit Taille am Punkt. Drücken: Der Zeiger
 * gleitet an die Spitze des Griffs, Griff (Haarlinie mit Perle) und Ring wachsen aus dem Punkt, Ziehen dreht, die alte Richtung steht
 * grün. ⌥ reißt los, in die Flucht zurück rastet ein, Doppelklick schaltet Knick und rund.
 *
 * Linien vereinigen sich hart (Kreuzungen bleiben scharf wie gezeichnet); Punkte, Tropfen und Hälse verschmelzen weich mit allem.
 * Längen in Punkten des Entwurfs; die Anzeige rechnet in Gerätepunkte um.
 */

import { Feder1, Feder2 } from './feder';
import { PRIM_FELDER, type Szene } from './fluessig';
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
  punktEinsetzen,
  punktZiehen,
  stelleZiehen,
} from './netz';
import { type DrehBild, type Dreher, Dreher2D, GEGEN, type RichtungZiel } from './richtung';

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
export interface Raum extends Dreher {
  ziehenBeginnen(ziel: Ziel): void;
  /** Bewegung der Maus seit dem Drücken (Bildschirmpunkte) */
  ziehen(dx: number, dy: number): void;
  ziehenEnden(): void;
  /** wo die gegriffene Stelle jetzt liegt (Bildschirmpunkte) */
  stelle(ziel: Ziel): [number, number] | null;
  /** Werkzeug P: Punkt auf Stück si der Linie li beim Parameter t setzen; Ergebnis: seine Nummer (wie im projizierten Netz) */
  punktEinsetzen(li: number, si: number, t: number): number | null;
  rueckgaengig(): boolean;
}

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
/** Verlauf der Schwellung längs der Linie: in der Mitte spitz wie ein Pinselstrich, am Ende ohne Knick in die Grundbreite */
const spindel = (x: number): number => {
  const a = Math.min(1, Math.abs(x));
  return Math.pow(1 - a, 1.6);
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
  /** je Linie: Stärke der Schwellung und ihre Mitte (Bogenlänge) */
  private schwell: { st: Feder1; s: Feder1 }[] = [];
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
  /** ⌥ gehalten (Richtung losreißen, nicht einrasten); ⇧ beim Drücken (im Raum: aus der Haut kippen statt auf ihr drehen) */
  alt = false;
  kippen = false;
  private dreher2d = new Dreher2D(
    () => this.netz,
    (n) => {
      this.netz = n;
      this.abtasten();
    },
  );
  /** je Linie: Nadel einer Richtung (Stärke, Gegenseite, Taille am Punkt) */
  private nadel: { st: Feder1; partner: Feder1; taille: Feder1; k: number; seite: Seite }[] = [];
  /** Ring und Griff wachsen aus dem Punkt und fließen zurück; nach dem Loslassen bleibt das letzte Bild, bis sie verschwunden sind */
  private ring = new Feder1(0);
  private drehBildLetzt: DrehBild | null = null;
  /** für den Doppelklick auf eine Richtung */
  private klick: { ziel: RichtungZiel; t: number } | null = null;
  private ausrichtung: Feder1 | null = null;

  private get dreher(): Dreher {
    return this.raum ?? this.dreher2d;
  }

  /** Federn je Linie (Schwellung, Nadel) für neue Linien anlegen */
  private federnAnlegen(): void {
    while (this.schwell.length < this.proben.length) this.schwell.push({ st: new Feder1(0), s: new Feder1(0) });
    while (this.nadel.length < this.proben.length) this.nadel.push({ st: new Feder1(0), partner: new Feder1(0), taille: new Feder1(0), k: 0, seite: 'aus' });
  }
  /** für die Anzeige: Stand der letzten Szene */
  stat = { tropfen: 0, ziel: '' };

  constructor(netz: Netz, werte: Werte) {
    this.netz = netz;
    this.ursprung = netzKopie(netz);
    this.werte = werte;
    this.abtasten();
  }

  /** Abtastschritt (Punkte des Entwurfs) so, dass auf dem Bildschirm rund 3 Punkte zwischen zwei Proben liegen */
  setzeAnsicht(a: Ansicht): void {
    this.g = (a.wachsen ? 1 : 1 / a.z) * (a.massstab ?? 1);
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
    this.federnAnlegen();
  }

  abtasten(): void {
    if (this.raum) return;
    const w = this.werte;
    const br = { umriss: w.umriss, innen: w.innen, kanteMax: w.kanteMax, kanteMin: w.kanteMin };
    this.proben = this.netz.linien.map((_, li) => linieAbtasten(this.netz, li, this.schritt0, br));
    this.federnAnlegen();
  }

  zuruecksetzen(): void {
    this.zurueck.push(netzKopie(this.netz));
    this.netz = netzKopie(this.ursprung);
    this.tropfen = [];
    this.griff = null;
    this.abtasten();
  }

  rueckgaengig(): boolean {
    if (this.griff) return false;
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
    if (this.zeiger.da && dt > 0) {
      const a = Math.min(1, dt / 0.05);
      this.zeiger.vx += ((x - this.zeiger.x) / dt - this.zeiger.vx) * a;
      this.zeiger.vy += ((y - this.zeiger.y) / dt - this.zeiger.vy) * a;
    }
    if (!this.zeiger.da) this.feld.setzen(x, y);
    Object.assign(this.zeiger, { x, y, sx, sy, da: true });
  }

  zeigerWeg(): void {
    if (this.griff) return;
    this.zeiger.da = false;
  }

  /** Drücken: greift den Tropfen, der gerade am Zeiger hängt; der Zeiger gleitet zu seiner Stelle */
  druecken(): boolean {
    this.zeiger.gedrueckt = true;
    const t = this.tropfen.find((q) => q.zustand === 'folgt');
    if (!t) return false;
    if (t.ziel.art === 'richtung') return this.richtungDruecken(t);
    t.zustand = 'gegriffen';
    const z = this.zeiger;
    // mit P: der Tropfen wird ein Punkt auf der Linie (die Linie behält ihren Verlauf), gegriffen wie jeder Punkt
    if (this.stift && t.ziel.art === 'linie') {
      const { li, si, t: tt } = t.ziel;
      if (!this.raum) {
        this.zurueck.push(netzKopie(this.netz));
        if (this.zurueck.length > 60) this.zurueck.shift();
      }
      const pi = this.raum ? this.raum.punktEinsetzen(li, si, tt) : punktEinsetzen(this.netz, li, si, tt);
      if (pi !== null) {
        t.ziel = { art: 'punkt', pi };
        if (!this.raum) this.abtasten();
      }
      if (this.raum) {
        this.raum.ziehenBeginnen({ ...t.ziel });
        this.griff = { ziel: { ...t.ziel }, start: this.netz, ax: t.ax, ay: t.ay, mx: z.x, my: z.y };
      } else this.griff = { ziel: { ...t.ziel }, start: netzKopie(this.netz), ax: t.ax, ay: t.ay, mx: z.x, my: z.y };
      this.versatz.zx = t.ax - z.x;
      this.versatz.zy = t.ay - z.y;
      return true;
    }
    if (this.raum) {
      this.raum.ziehenBeginnen({ ...t.ziel });
      this.griff = { ziel: { ...t.ziel }, start: this.netz, ax: t.ax, ay: t.ay, mx: z.x, my: z.y };
    } else {
      this.zurueck.push(netzKopie(this.netz));
      if (this.zurueck.length > 60) this.zurueck.shift();
      this.griff = { ziel: { ...t.ziel }, start: netzKopie(this.netz), ax: t.ax, ay: t.ay, mx: z.x, my: z.y };
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

  /** Loslassen: die Stelle bleibt, wo sie ist; der Zeiger gleitet zurück unter die Maus */
  loslassen(): void {
    this.zeiger.gedrueckt = false;
    if (!this.griff) return;
    if (this.griff.ziel.art === 'richtung') {
      this.drehBildLetzt = this.dreher.drehBild() ?? this.drehBildLetzt;
      this.dreher.drehenEnden();
    } else this.raum?.ziehenEnden();
    this.griff = null;
    this.versatz.zx = 0;
    this.versatz.zy = 0;
    for (const t of this.tropfen) if (t.zustand === 'gegriffen') t.zustand = 'folgt';
  }

  get greift(): boolean {
    return !!this.griff;
  }

  /** wo der Zeiger gezeichnet wird (Punkte des Entwurfs) */
  private gezeichnet(): [number, number] {
    return [this.zeiger.x + this.versatz.x, this.zeiger.y + this.versatz.y];
  }

  private fang(z: Ziel): number {
    return (z.art === 'punkt' ? this.werte.fangPunkt : this.werte.fangLinie) * this.g;
  }

  /** bester Kandidat unter dem Zeiger: Punkte vor Linien, Tinte vor Verdecktem */
  private kandidat(): { ziel: Ziel; x: number; y: number; d: number; verdeckt: boolean } | null {
    const w = this.werte;
    const { x, y } = this.zeiger;
    const fp = w.fangPunkt * this.g;
    const fl = w.fangLinie * this.g;
    const suche = (schicht: 0 | 1): { ziel: Ziel; x: number; y: number; d: number; verdeckt: boolean } | null => {
      let bp = -1;
      let bd = Infinity;
      this.netz.punkte.forEach((p, i) => {
        if (!p.sichtbar || (p.verdeckt ? 1 : 0) !== schicht) return;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bd) {
          bd = d;
          bp = i;
        }
      });
      const st = naechsteStelle(this.proben, x, y, schicht);
      const linieOk = st && st.d < fl;
      // ein Punkt gewinnt, wenn er im Fangradius liegt und die Linie nicht deutlich näher ist
      if (bp >= 0 && bd < fp && (!linieOk || bd - st.d < fp * 0.5)) {
        const p = this.netz.punkte[bp]!;
        return { ziel: { art: 'punkt', pi: bp }, x: p.x, y: p.y, d: bd, verdeckt: p.verdeckt };
      }
      if (st && linieOk) {
        // nahe an einem Punkt: seine Richtung (nicht mit P, dort setzt die Linie Punkte)
        const r = this.stift ? null : this.richtungBei(st);
        if (r) return { ziel: r, x: st.x, y: st.y, d: st.d, verdeckt: st.verdeckt };
        return { ziel: { art: 'linie', li: st.li, si: st.si, t: st.t, s: st.s }, x: st.x, y: st.y, d: st.d, verdeckt: st.verdeckt };
      }
      return null;
    };
    // im Raum greift man nur, was man sieht
    return suche(0) ?? (this.raum ? null : suche(1));
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

  /** Richtung unter einer Stelle der Linie: Die Stelle liegt auf der Nadel eines sichtbaren Punkts dieser Linie */
  private richtungBei(st: LinienTreffer): RichtungZiel | null {
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
      const n = this.nadelLaenge(st.li, k, seite);
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
      if (g.ziel.art === 'richtung' && g.spitze) {
        // der Zeiger gleitet an die Spitze des Griffs, sobald man hält oder zieht; die Richtung zeigt auf ihn
        g.zeit = (g.zeit ?? 0) + dt;
        if (!g.gleitet && (g.zeit > 0.12 || Math.hypot(dx, dy) > 2 * this.g)) {
          g.gleitet = true;
          this.versatz.zx = g.spitze[0] - g.mx;
          this.versatz.zy = g.spitze[1] - g.my;
        }
        this.dreher.drehenZiehen(g.spitze[0] + dx, g.spitze[1] + dy, this.alt, dt);
        this.drehBildLetzt = this.dreher.drehBild() ?? this.drehBildLetzt;
      } else if (this.raum) this.raum.ziehen(dx, dy);
      else {
        this.netz = netzKopie(g.start);
        if (g.ziel.art === 'punkt') punktZiehen(g.start, this.netz, g.ziel.pi, dx, dy);
        else if (g.ziel.art === 'linie') stelleZiehen(g.start, this.netz, g.ziel.li, g.ziel.si, g.ziel.t, dx, dy);
        this.abtasten();
      }
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

    // Ziel unter dem Zeiger (nicht während eines Zugs)
    const folgt = this.tropfen.find((t) => t.zustand === 'folgt');
    if (!this.greift) {
      const k = z.da ? this.kandidat() : null;
      if (folgt) {
        const halten = this.fang(folgt.ziel) * w.halten;
        const dAnker = Math.hypot(z.x - folgt.ax, z.y - folgt.ay);
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
        } else if (folgt.ziel.art === 'linie') {
          // ohne neuen Kandidaten gleitet der Anker auf seiner Linie mit
          const st = naechsteStelle([this.proben[folgt.ziel.li]!], z.x, z.y);
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

    // Schwellen: die Linien des Ziels, beim Anflug die nächste Linie
    const ziele = new Map<number, { s: number; staerke: number }>();
    const aktiv = this.tropfen.find((t) => t.zustand === 'gegriffen') ?? this.tropfen.find((t) => t.zustand === 'folgt');
    if (aktiv) {
      if (aktiv.ziel.art === 'linie') {
        const P = this.proben[aktiv.ziel.li]!;
        const si = aktiv.ziel.si;
        const s = aktiv.zustand === 'gegriffen' ? P.stueckS[si]! + aktiv.ziel.t * (P.stueckS[si + 1]! - P.stueckS[si]!) : aktiv.ziel.s;
        ziele.set(aktiv.ziel.li, { s, staerke: 1 });
      } else if (aktiv.ziel.art === 'punkt') {
        const pi = aktiv.ziel.pi;
        this.netz.linien.forEach((_, li) => {
          const s = this.sVonPunkt(li, pi);
          if (s >= 0) ziele.set(li, { s, staerke: 1 });
        });
      }
    } else if (z.da) {
      const vor = w.fangLinie * w.anflug * this.g;
      const st = naechsteStelle(this.proben, z.x, z.y, 0) ?? naechsteStelle(this.proben, z.x, z.y, 1);
      if (st && st.d < vor) ziele.set(st.li, { s: st.s, staerke: 0.8 * glatt(0, 1, 1 - st.d / vor) });
    }
    this.schwell.forEach((S, li) => {
      const zl = ziele.get(li);
      S.st.ziel = zl ? zl.staerke : 0;
      if (zl) {
        if (S.st.x < 0.02) S.s.setzen(zl.s);
        else {
          // auf geschlossenen Linien den kurzen Weg nehmen
          let ziel = zl.s;
          const L = this.proben[li]!.laenge;
          if (this.netz.linien[li]!.zu) {
            while (ziel - S.s.x > L / 2) ziel -= L;
            while (S.s.x - ziel > L / 2) ziel += L;
          }
          S.s.ziel = ziel;
        }
      }
      S.st.schritt(dt, w.schwellHz, w.schwellD);
      S.s.schritt(dt, 12, 1);
      if (!S.st.ruhig(0.002) || !S.s.ruhig(0.02)) bewegt = true;
    });
    // Nadel der Richtung unter dem Zeiger: rund mit der Gegenseite, geknickt allein und mit Taille am Punkt
    const richtung = aktiv?.ziel.art === 'richtung' ? aktiv.ziel : null;
    const bild = this.griff?.ziel.art === 'richtung' ? this.drehBildLetzt : null;
    this.nadel.forEach((N, li) => {
      const an = !!richtung && richtung.li === li;
      if (richtung && an) {
        N.k = richtung.k;
        N.seite = richtung.seite;
        const l = this.netz.linien[li]!;
        const rund = bild ? bild.rund : !istKnick(l, N.k);
        N.partner.ziel = rund && armGriff(l, N.k, GEGEN[N.seite]) ? 0.7 : 0;
        N.taille.ziel = rund ? 0 : 1;
      }
      N.st.ziel = an ? 1 : 0;
      N.st.schritt(dt, w.schwellHz, w.schwellD);
      N.partner.schritt(dt, 8, 0.8);
      N.taille.schritt(dt, 9, 0.6);
      if (!N.st.ruhig(0.002) || !N.partner.ruhig(0.002) || !N.taille.ruhig(0.002)) bewegt = true;
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
   * Nadel: Die Linie schwillt vom Punkt aus an, auf der Seite der Richtung voll, auf der Gegenseite (rund) schwächer, so weit die
   * Nadel reicht, spitz auslaufend; geknickt mit Taille am Punkt. Schreibt in `extra` (halbe Zusatzbreite), wo sie breiter ist.
   */
  private nadelBreite(li: number, P: LinienProben, zu: boolean, extra: Float32Array): void {
    const N = this.nadel[li];
    if (!N || N.st.x < 1e-3) return;
    const w = this.werte;
    const s0 = P.stueckS[N.k];
    if (s0 === undefined) return;
    const laenge = { aus: this.nadelLaenge(li, N.k, 'aus'), ein: this.nadelLaenge(li, N.k, 'ein') };
    const L = P.laenge;
    for (let k = 0; k < P.n; k++) {
      let ds = P.s[k]! - s0;
      if (zu) {
        while (ds > L / 2) ds -= L;
        while (ds <= -L / 2) ds += L;
      }
      const seite: Seite = ds >= 0 ? 'aus' : 'ein';
      const Ln = laenge[seite];
      if (Ln <= 0) continue;
      const x = Math.abs(ds) / Ln;
      if (x >= 1) continue;
      const eigen = seite === N.seite;
      let f = Math.pow(1 - x, 1.6) * (eigen ? 1 : N.partner.x);
      if (eigen) f *= 1 - N.taille.x * (1 - glatt(0.05, 0.32, x));
      const e = 0.5 * w.schwellen * N.st.x * f;
      if (e > extra[k]!) extra[k] = e;
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
    const push = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, gruppe: number, schicht: number, art: number, z0 = 0, z1 = 0): void => {
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
      b[o + 7] = schicht + 4 * art;
      b[o + 8] = z0;
      b[o + 9] = z1;
      b[o + 10] = 0;
      b[o + 11] = 0;
      n++;
    };
    let gruppe = 0;
    // Linien
    this.proben.forEach((P, li) => {
      const zu = this.netz.linien[li]!.zu;
      const S = this.schwell[li]!;
      const st = S.st.x;
      const extra = new Float32Array(P.n);
      if (st > 1e-3) {
        const Rl = w.reichweite * this.g;
        const L = P.laenge;
        let mitte = S.s.x % L;
        if (mitte < 0) mitte += L;
        for (let k = 0; k < P.n; k++) {
          let ds = Math.abs(P.s[k]! - mitte);
          if (zu) ds = Math.min(ds, L - ds);
          if (ds < Rl) extra[k] = 0.5 * w.schwellen * st * spindel(ds / Rl);
        }
      }
      this.nadelBreite(li, P, zu, extra);
      const vx = new Float32Array(P.n);
      const vy = new Float32Array(P.n);
      this.neigung(li, P, vx, vy);
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
      if (!p.sichtbar || alsTropfen.has(pi)) return;
      push(X(p.x), Y(p.y), X(p.x), Y(p.y), R(w.punktRadius), R(w.punktRadius), gruppe++, raum ? 2 : p.verdeckt ? 1 : 0, 1, p.z ?? 0, p.z ?? 0);
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
      if (felder.length < 32) felder.push(X((t.pos.x + ax) / 2), Y((t.pos.y + ay) / 2), R(L / 2 / this.g + 4 * w.punktRadius), Math.max(t.r.x, t.hals.x));
    }
    // Nadel: weich durch den Punkt, wenn rund (geknickt sitzt er hart als Fuge)
    this.nadel.forEach((N, li) => {
      if (N.st.x < 0.01) return;
      const pi = this.netz.linien[li]?.punkte[N.k];
      const p = pi === undefined ? undefined : this.netz.punkte[pi];
      if (p && felder.length < 32) felder.push(X(p.x), Y(p.y), R(5 * w.punktRadius), N.st.x * (1 - N.taille.x));
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
        if (felder.length < 32) felder.push(X(sp[0]), Y(sp[1]), R(4), f);
      }
      push(X(hx), Y(hy), X(hx), Y(hy), R(w.punktRadius * 1.1), R(w.punktRadius * 1.1), gruppe++, 0, 1);
    }
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
