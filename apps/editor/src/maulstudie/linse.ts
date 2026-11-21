/**
 * Studie „Maul, Zähne, Zunge“ (20.11.2026): die Linse.
 *
 * Ein rundes Feld oben rechts, in dem ein kleines Teil groß steht (hier: ein Zahn, im Raum, zum Drehen). Um die Linse liegen
 * zwei Ringe:
 * - der **Formenring** (innen): die Vorlagen als kleine Zeichen; man dreht den Ring, was oben an der Marke steht, gilt;
 * - der **Drehregler** (außen, geriffelt): ein Rad ohne Anschlag wie der Lautstärkeknopf eines alten CD-Spielers. Was er
 *   stellt, wählen die Perlen an seinem Rand (Anzahl, Größe, Biegung, Neigung, Verlauf).
 * Das Rad rastet (bei Zahlen je Schritt, sonst fein), läuft nach, wenn man es anschubst, und tickt leise. Ein Tropfen am Rand
 * zieht die Linse größer.
 *
 * Die „Haptik“ kommt aus Bild und Ton: Das iPad hat keinen Motor dafür, und im Browser gibt es am iPhone keinen verlässlichen Weg.
 * Wo ein Gerät vibrieren kann (`navigator.vibrate`), tickt es zusätzlich in der Hand.
 *
 * Seit der zweiten Scheibe von Etappe 5 steht die Linse auch in Ozzy (`ozzy/main.ts`, „Die Linse der Zähne“). Dafür kam dazu: die
 * Perlen der Reihen (`LinsenZiele.reihen`: wem die Linse gilt), die Größe am Anfang, `vorlageZeigen` und `auffrischen` (wenn sich
 * die Werte von außen ändern, etwa mit ⌘Z). Das Aussehen steht in `linse.css`.
 *
 * Seit der zweiten Scheibe von Etappe 6 gilt die Linse nicht mehr nur Zähnen: `LinsenZiele.vorlagen` sind die Zeichen am Formenring
 * (ohne sie: die Formen der Zähne), `zieleSetzen` stellt sie auf ein anderes Teil um (andere Vorlagen, Perlen, Reihen, Farbe), und
 * `teilSetzen` stellt ein beliebiges Netz in die Linse (in Ozzy: die Zunge, gerade gelegt).
 *
 * Seit Etappe 7 (21.11., „ein Zahn als kleine Form“) trägt ein Zahn in der Linse seine drei Linien (`ozzy/zahnGestalt.ts`,
 * `gestaltZeigen`). Wer ihn von Hand nahe an „von vorn“, „von der Seite“ oder „von oben“ dreht, dem rastet er ein wie die Form in
 * Ozzy (die Kamera fährt zurück und wird schmal); ein Tipp auf eine Linie dreht ihn in ihre Ansicht. Eingerastet trägt die Linie
 * dieser Ansicht ihre Punkte, und es gilt das Verhalten der Linien-Studie selbst (`linien/verhalten.ts` in 2D, gezeichnet von
 * `linien/fluessig.ts` auf einer zweiten Leinwand): Das Netz ist die Linie in Bildpunkten der Linse; nach jedem Bild wird es
 * zurückgelesen, und hat es sich geändert, gilt die neue Gestalt (`LinsenZiele.gestalt.setzen`).
 */
import { AmbientLight, BufferAttribute, BufferGeometry, Color, DataTexture, DirectionalLight, Group, Mesh, MeshMatcapMaterial, PerspectiveCamera, RGBAFormat, SRGBColorSpace, Scene, Vector3, WebGLRenderer, DoubleSide } from 'three';
import { FluessigeAnzeige, type Szene } from '../linien/fluessig';
import { type Netz, punktEinsetzen } from '../linien/netz';
import type { StiftWerk } from '../linien/stift';
import { type Ansicht as LinienAnsicht, GRUNDWERTE, Verhalten, type Werte as LinienWerte } from '../linien/verhalten';
import { Kapseln } from '../ozzy/kapseln';
import { type Abbildung, type GestaltLinie, type ZahnGestalt, gestaltAlsNetz, gestaltAusNetz, gestaltBauFein, gestaltLinieGleich, gestaltOhneAnker, netzLagen, normalen } from '../ozzy/zahnGestalt';
import { ZAHN_FORMEN, wurzelBau, wurzelProfil, zahnNetz, zahnUmriss, type ZahnForm } from './zahn';

export type Perle = {
  kurz: string;
  name: string;
  /** Wert lesen und um Schritte ändern; `rastet`: je Rast ein ganzer Schritt (sonst fein, zehn je Rast) */
  wert: () => number;
  setzen: (wert: number) => void;
  min: number;
  max: number;
  schritt: number;
  rastet: boolean;
  zeigen: (w: number) => string;
};

/** wem die Linse gilt: je Reihe eine Perle in ihrer Farbe (`an`: sie gilt ihr gerade; `tippen`: die Perle wurde angetippt) */
export type LinsenReihe = { name: string; farbe: string; an: () => boolean; tippen: () => void };

/**
 * Eine Vorlage am Formenring: ihr Name und ihr Zeichen (ein Pfad, etwa 17 hoch; `ab`: um so viel steht er unter der Mitte des
 * Zeichens, sonst 8; `farbe`: seine Füllung, sonst die der Zähne).
 */
export type LinsenVorlage = { name: string; zeichen: string; ab?: number; farbe?: string };

export type LinsenZiele = {
  /** eine Vorlage ist gewählt (Index in `vorlagen`; ohne sie in `ZAHN_FORMEN`) */
  form: (i: number) => void;
  /** die Vorlagen am Formenring (fehlen sie: die Formen der Zähne) */
  vorlagen?: LinsenVorlage[];
  perlen: Perle[];
  reihen?: LinsenReihe[];
  /** die Farbe des Teils (`#rrggbb`): Eine Perle am Rad zeigt sie und öffnet den Farbwähler des Systems; der Zahn in der Linse trägt sie */
  farbe?: { name: string; wert: () => string; setzen: (hex: string) => void };
  /** Etappe 7: Der Zahn lässt sich an seinen Linien formen (fehlt: Die Linien stehen nur da, oder es gibt keine) */
  gestalt?: LinsenGestalt;
};

/** was die Linse braucht, damit sich ein Zahn an seinen Linien formen lässt */
export type LinsenGestalt = {
  /**
   * Nach einem Griff an einer Linie: Diese Gestalt gilt jetzt dem, dem die Linse gilt. `griff`: der wievielte Griff an den Linien
   * (je Griff ein Schritt für ⌘Z). Zurück: ob sie gesetzt wurde (sonst zeigt die Linse wieder die von vorher).
   */
  setzen: (g: ZahnGestalt, griff: number) => boolean;
  /** Werkzeug P gilt: Ein Klick auf die Linie setzt dort einen Punkt */
  stift: () => boolean;
  /** Aussehen von Linien, Punkten und Zeiger (dieselben Werte wie an der Form) */
  werte: LinienWerte;
  /** in der Linse ist etwas gegriffen: An der Form ist dann nichts mehr gewählt (es ist immer nur eines gewählt) */
  gegriffen?: () => void;
};

/** eine Ansicht, in die der Zahn einrastet: welche Linie dort ihre Punkte trägt und wie er dann steht */
type Blick = { linie: GestaltLinie; gier: number; neig: number };
const BLICKE: Blick[] = [
  { linie: 'vorn', gier: 0, neig: 0 },
  { linie: 'vorn', gier: Math.PI, neig: 0 },
  { linie: 'seite', gier: -Math.PI / 2, neig: 0 },
  { linie: 'seite', gier: Math.PI / 2, neig: 0 },
  { linie: 'quer', gier: 0, neig: Math.PI / 2 },
];
/** unter so vielen Grad rastet der Zahn nach dem Drehen von Hand ein (wie die Form in Ozzy) */
const RASTET_GRAD = 9;
/** der halbe Öffnungswinkel der Kamera frei gedreht und eingerastet (Tangens): eingerastet so schmal, dass die Linie auf dem Rand liegt */
const TAN_FREI = Math.tan((13 * Math.PI) / 180);
const TAN_FLACH = Math.tan((0.1 * Math.PI) / 180);
/** so nah (Bildpunkte) an einer ruhenden Linie gilt ein Tipp ihr */
const LINIE_NAH = 7;
/** unter so vielen Bildpunkten Weg ist Drücken und Loslassen ein Tipp */
const TIPP_WEG = 3;
const TINTE: [number, number, number] = [0x1f / 255, 0x1a / 255, 0x17 / 255];
const GRUEN: [number, number, number] = [0xb9 / 255, 0xd1 / 255, 0xb4 / 255];
const winkelWeg = (a: number, b: number): number => {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
};
/** Werkzeug P in der Linse: Es setzt nur Punkte auf Linien (keine neue Linie beginnt, nirgends hängt ein freier Tropfen an der Feder) */
const KEIN_STIFT: StiftWerk = {
  entwurf: () => null,
  ortFrei: () => null,
  mittePunkte: () => [],
  beginnen: () => null,
  weiter: () => null,
  griffeLetzter: () => {},
  griffeErster: () => {},
  knickSetzen: () => {},
  letztenVerschieben: () => {},
  schliessen: () => {},
  fertig: () => -1,
  abbrechen: () => {},
  zurueck: () => false,
  faden: () => null,
};

/**
 * Ein Kugelbild ohne Farbe (nur Hell, Dunkel und Glanz) aus einem farbigen (`daten`: `groesse` × `groesse`, RGBA): die Matcap für
 * den Zahn in der Linse. Heller gestellt, damit ein Zahn nicht so dunkel schattiert wie das Wachs.
 */
export function grauesKugelbild(daten: Uint8Array, groesse: number): DataTexture {
  const n = groesse * groesse;
  const grau = new Uint8Array(n * 4);
  const hell = (i: number): number => 0.2126 * daten[4 * i]! + 0.7152 * daten[4 * i + 1]! + 0.0722 * daten[4 * i + 2]!;
  let max = 1;
  for (let i = 0; i < n; i++) max = Math.max(max, hell(i));
  for (let i = 0; i < n; i++) {
    const l = Math.round(255 * Math.pow(hell(i) / max, 0.55));
    grau[4 * i] = grau[4 * i + 1] = grau[4 * i + 2] = l;
    grau[4 * i + 3] = 255;
  }
  const bild = new DataTexture(grau, groesse, groesse, RGBAFormat);
  bild.colorSpace = SRGBColorSpace;
  bild.needsUpdate = true;
  return bild;
}

const ZAHN_VORLAGEN: LinsenVorlage[] = ZAHN_FORMEN.map((z) => ({ name: z.name, zeichen: zahnUmriss(z.form, 17) }));

const NS = 'http://www.w3.org/2000/svg';
const el = <K extends keyof SVGElementTagNameMap>(name: K, attr: Record<string, string | number> = {}): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, String(v));
  return e;
};

export class Linse {
  private readonly feld: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly leinwand: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly szene = new Scene();
  private readonly kamera = new PerspectiveCamera(26, 1, 0.1, 100);
  private readonly dreh = new Group();
  private zahn: Mesh | null = null;
  private readonly material: MeshMatcapMaterial;
  private readonly fleisch: Mesh;
  private groesse = 240;
  /** Winkel der zwei Ringe (Bogenmaß) und ihr Schwung */
  private formWinkel = 0;
  private formZiel: number | null = 0;
  private radWinkel = 0;
  private radSchwung = 0;
  private radRest = 0;
  private gewaehlt = 0;
  private perle = 0;
  private zahl: SVGTextElement | null = null;
  private zahlUhr = 0;
  private ton: AudioContext | null = null;
  private tonGeplant = false;
  private letztesBild = 0;
  private offen = false;
  private gierZahn = -0.5;
  private neigZahn = 0.15;
  /** was in der Linse steht: ein Zahn (mit Zahnfleisch) oder ein anderes Teil; wechselt es, steht es wieder in seinem ersten Blick */
  private teilArt: 'zahn' | 'teil' | null = null;
  /** der Tropfen an der Marke: wie weit er vom letzten Rasten noch ausgelenkt ist */
  private tropfenAus = 0;
  /** der wievielte Griff am Drehregler es ist (einmal Greifen und Drehen samt Nachlauf, oder ein Zug am Rad der Maus) */
  private griff = 0;
  private radMausZeit = 0;
  /** das Farbfeld des Systems (unsichtbar, aber in der Seite: Nur so öffnet es den Farbwähler) */
  private farbfeld: HTMLInputElement | null = null;

  // ---------- Etappe 7: der Zahn als kleine Form ----------
  /** die Gestalt, die der Zahn in der Linse zeigt (null: ein Zahn ohne Linien oder ein anderes Teil) */
  private gestalt: ZahnGestalt | null = null;
  /** ihr feines Netz (Maß des Zahns): Lagen, Normalen, Ringe und Punkte je Ring. Auf seinen Punkten stehen die ruhenden Linien */
  private fein: { pos: Float32Array; nor: Float32Array; ringe: number; seg: number } | null = null;
  /** die Leinwand der Linien und ihre Anzeige (die Anzeige erst, wenn ein Zahn Linien trägt) */
  private readonly linienBild: HTMLCanvasElement;
  private anzeige: FluessigeAnzeige | null = null;
  private readonly kapseln = new Kapseln();
  private verhalten: Verhalten | null = null;
  /** das Netz, das das Verhalten hält: für welche Linie, aus welcher Gestalt, mit welcher Abbildung, in welcher Ansicht; `fest`: die geteilten Punkte */
  private netzStand: { linie: GestaltLinie; gestalt: ZahnGestalt; A: Abbildung; fest: number[]; blick: Blick } | null = null;
  /** eingerastet in diese Ansicht (null: frei gedreht); wie weit die Kamera schon schmal ist und wie weit die Ansicht von oben gilt (0 … 1) */
  private rast: Blick | null = null;
  private flach = 0;
  private oben = 0;
  /** Größe und Lage des Zahns in der Linse, wie er steht und wie er die Linse füllte (`oben`: so viel größer steht er von oben) */
  private lage: { k: number; fussY: number; oben: number } | null = null;
  private lageZiel: { k: number; fussY: number; oben: number } | null = null;
  private lageNach = false;
  /** der wievielte Griff an den Linien es ist, und ob gerade einer läuft (Punkt, Stelle oder Richtung gezogen) */
  private linienGriff = 0;
  private linienZug = false;
  /** die ruhenden Linien des letzten Bilds (CSS-Pixel der Linse; `vorn`: dieses Stück liegt auf der zugewandten Seite) */
  private stille: { linie: GestaltLinie; x: number[]; y: number[]; vorn: boolean[] }[] = [];
  private zeigerZeit = 0;
  /** wo der Zeiger zuletzt stand (CSS-Pixel der Leinwand der Linien; null: nicht über der Linse) */
  private zeigerOrt: { x: number; y: number } | null = null;
  /** für welche Linie das Netz des Verhaltens steht (bleibt, wenn es neu gelesen wird: Dann bleibt gewählt, was gewählt war) */
  private netzLinie: GestaltLinie | null = null;
  /** die Szene des Verhaltens für dieses Bild (null: Es formt gerade nicht) */
  private szeneV: Szene | null = null;
  private linienGezeichnet = false;
  /** so lange hat das letzte Bild der Linse gerechnet, und das längste seit dem letzten Lesen (ms; für die Proben) */
  private bildMs = 0;
  private bildMsMax = 0;
  private readonly hilf = new Vector3();

  private ziele: LinsenZiele;

  constructor(
    feld: HTMLElement,
    grau: DataTexture,
    ziele: LinsenZiele,
    /** Durchmesser des runden Felds am Anfang (CSS-Pixel) */
    groesse = 240,
  ) {
    this.ziele = ziele;
    this.groesse = groesse;
    this.feld = feld;
    feld.innerHTML = '';
    this.leinwand = document.createElement('canvas');
    this.leinwand.className = 'linse-bild';
    feld.appendChild(this.leinwand);
    this.linienBild = document.createElement('canvas');
    this.linienBild.className = 'linse-linien';
    feld.appendChild(this.linienBild);
    this.svg = el('svg', { class: 'linse-ringe' });
    feld.appendChild(this.svg);
    {
      // (das Feld der Farbe steht immer in der Seite: Ob es eine Perle dafür gibt, sagen die Ziele, und die können wechseln)
      const f = document.createElement('input');
      f.type = 'color';
      f.className = 'linse-farbfeld';
      f.tabIndex = -1;
      f.setAttribute('aria-label', ziele.farbe?.name ?? 'Farbe');
      f.addEventListener('input', () => {
        this.ziele.farbe?.setzen(f.value);
        this.zeigen();
        this.lauf();
      });
      feld.appendChild(f);
      this.farbfeld = f;
    }
    this.renderer = new WebGLRenderer({ canvas: this.leinwand, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xffffff, 0);
    this.material = new MeshMatcapMaterial({ matcap: grau, color: new Color('#f7efdc'), side: DoubleSide });
    this.szene.add(new AmbientLight(0xffffff, 1), new DirectionalLight(0xffffff, 1));
    this.szene.add(this.dreh);
    // das Zahnfleisch: eine flache Scheibe an der Linie, an der der Zahn aus dem Fleisch tritt
    this.fleisch = new Mesh(zahnNetz({ laenge: 0.001, breite: 2.6, tiefe: 2.2, spitze: 0, kasten: 2.4, bogen: 0, hoecker: 0, wurzel: 'keine', wurzelLaenge: 0 }, false), new MeshMatcapMaterial({ matcap: grau, color: new Color('#b8324a'), transparent: true, opacity: 0.32, side: DoubleSide, depthWrite: false }));
    this.dreh.add(this.fleisch);
    this.kamera.position.set(0, 0.5, 9.5);
    this.kamera.lookAt(0, 0.5, 0);
    this.bauen();
    this.eingaben();
  }

  get istOffen(): boolean {
    return this.offen;
  }
  /** welche Perle des Drehreglers gilt (Nummer in `ziele.perlen`) */
  get perleNr(): number {
    return this.perle;
  }
  /** welche Vorlage an der Marke steht */
  get vorlage(): number {
    return this.gewaehlt;
  }
  /** Durchmesser des runden Felds (CSS-Pixel) */
  get innen(): number {
    return this.groesse;
  }
  /** der wievielte Griff am Drehregler es ist: Wer Schritte für ⌘Z zählt, legt je Griff einen an */
  get griffNr(): number {
    return this.griff;
  }
  /** eine Vorlage an die Marke stellen, ohne sie zu melden (die Werte haben sich von außen geändert) */
  vorlageZeigen(i: number): void {
    if (i === this.gewaehlt) return;
    this.gewaehlt = i;
    let zielW = this.winkelVon(i);
    while (zielW - this.formWinkel > Math.PI) zielW -= 2 * Math.PI;
    while (zielW - this.formWinkel < -Math.PI) zielW += 2 * Math.PI;
    this.formZiel = zielW;
    this.lauf();
  }
  /** Perlen und Reihen neu zeichnen (was gilt, hat sich von außen geändert) */
  auffrischen(): void {
    this.zeigen();
    this.lauf();
  }
  /** jetzt zeichnen, ohne auf das nächste Bild zu warten (für Proben: Danach lässt sich ihr Bild im selben Zug lesen) */
  zeichnen(): void {
    this.zeigen();
    this.blickSchritt(0);
    this.dreh.rotation.set(this.neigZahn, this.gierZahn, 0);
    this.kameraStellen();
    this.linienRechnen(0);
    this.renderer.render(this.szene, this.kamera);
    this.linienZeichnen();
  }
  /** ein kurzes Wort dort, wo sonst die Zahl des Drehreglers steht (in Ozzy: wem die Linse jetzt gilt) */
  melden(text: string): void {
    this.zahlZeigen(text);
  }

  /** die Linse öffnen, mit einem Zahn darin (`null`: Das Teil stellt danach `teilSetzen`) */
  oeffnen(form: ZahnForm | null, vorlage: number): void {
    this.offen = true;
    this.feld.hidden = false;
    this.feld.classList.remove('quillt');
    void this.feld.offsetWidth;
    this.feld.classList.add('quillt');
    this.gewaehlt = vorlage;
    this.formZiel = this.winkelVon(vorlage);
    // Den Ton für das Ticken anlegen, bevor zum ersten Mal gedreht wird: Das dauert (gemessen: 150 ms und mehr), und beim ersten
    // Rasten würde die Linse sonst stocken. Hier geschieht es, wenn gerade nichts zu tun ist.
    if (!this.ton && !this.tonGeplant) {
      this.tonGeplant = true;
      const bereiten = (): void => {
        try {
          this.ton ??= new AudioContext();
        } catch {
          // (kein Ton: dann nur das Bild)
        }
      };
      if ('requestIdleCallback' in window) window.requestIdleCallback(bereiten, { timeout: 2000 });
      else setTimeout(bereiten, 600);
    }
    if (form) this.zahnSetzen(form);
    else if (this.zahn) {
      // (was vorher darin stand, gehört nicht zu dem, was jetzt kommt)
      this.zahn.removeFromParent();
      this.zahn.geometry.dispose();
      this.zahn = null;
      this.fleisch.visible = false;
      this.ohneLinien();
    }
    this.lauf();
  }
  /**
   * Die Linse gilt jetzt etwas anderem: andere Vorlagen, Perlen, Reihen, Farbe. Die Ringe werden neu gebaut, `vorlage` steht an
   * der Marke, die Perle `perle` gilt (wer zwischen zwei Teilen wechselt, gibt die mit, die dort zuletzt galt).
   */
  zieleSetzen(ziele: LinsenZiele, vorlage: number, perle = 0): void {
    this.ziele = ziele;
    this.perle = Math.max(0, Math.min(ziele.perlen.length - 1, perle));
    this.gewaehlt = vorlage;
    this.formWinkel = this.winkelVon(vorlage);
    this.formZiel = this.formWinkel;
    this.radRest = 0;
    this.radSchwung = 0;
    this.tropfenAus = 0;
    this.farbfeld?.setAttribute('aria-label', ziele.farbe?.name ?? 'Farbe');
    this.bauen();
    this.lauf();
  }
  /**
   * Ein beliebiges Teil in der Linse statt eines Zahns: sein Netz um den Nullpunkt (der steht in der Mitte der Linse), `mass` ist
   * die Strecke, die die Höhe der Linse füllt. Ohne Zahnfleisch. `blick`: so gedreht steht es beim ersten Mal (danach bleibt, wie
   * man es gedreht hat).
   */
  teilSetzen(netz: BufferGeometry, mass: number, blick?: { gier: number; neig: number }): void {
    if (this.zahn) {
      this.zahn.removeFromParent();
      this.zahn.geometry.dispose();
    }
    if (blick && this.teilArt !== 'teil') {
      this.gierZahn = blick.gier;
      this.neigZahn = blick.neig;
    }
    this.teilArt = 'teil';
    this.ohneLinien();
    this.zahn = new Mesh(netz, this.material);
    this.zahn.scale.setScalar(4.38 / Math.max(mass, 1e-9));
    this.fleisch.visible = false;
    this.dreh.scale.setScalar(1);
    this.dreh.position.y = 0.5;
    this.dreh.add(this.zahn);
    this.lauf();
  }
  schliessen(): void {
    this.offen = false;
    this.feld.hidden = true;
    this.verhalten?.zeigerWeg();
    this.linienZug = false;
  }

  /** der Zahn, der in der Linse steht: eine Vorlage aus ihren Zahlen, ohne Linien (so in der Studie und während die Vorlage wechselt) */
  zahnSetzen(form: ZahnForm): void {
    const eingerastet = this.teilArt === 'zahn' && !!this.rast;
    this.ohneLinien();
    // (wechselt nur die Vorlage, bleibt der Zahn, wie er steht: Gleich trägt er wieder Linien)
    if (!eingerastet) this.rast = null;
    this.zahnStellen(zahnNetz(form, true), form.laenge, form.wurzel === 'keine' ? 0 : form.wurzelLaenge, 0);
  }

  /**
   * Ein Zahn aus Linien in der Linse (Etappe 7): seine Krone fein, darunter die Wurzel seiner Vorlage. Er trägt seine drei Linien;
   * eingerastet lässt sich die Linie der Ansicht formen, wenn die Ziele es vorsehen (`LinsenZiele.gestalt`).
   */
  gestaltZeigen(g: ZahnGestalt): void {
    if (g === this.gestalt && this.teilArt === 'zahn' && this.zahn) return;
    const b = gestaltBauFein(g);
    // die Wurzel der Vorlage, unter die Linie quer gestellt
    const xl = g.vorn[0]!.x;
    const xr = g.vorn[g.vorn.length - 1]!.x;
    const zh = g.seite[0]!.x;
    const zv = g.seite[g.seite.length - 1]!.x;
    const mx = 0.5 * (xl + xr);
    const mz = 0.5 * (zh + zv);
    let w: { pos: number[]; idx: number[] };
    if (g.wurzel === 'kegel' || g.wurzel === 'knolle') {
      // eine Zinke: Sie beginnt genau am ersten Ring der Krone (der Linie quer) und behält seine Form (kein Spalt am Zahnfleisch)
      w = { pos: [], idx: [] };
      const R = 9;
      for (let i = 0; i < R; i++) {
        const v = i / (R - 1);
        const r = wurzelProfil(g.wurzel === 'knolle', v);
        for (let k = 0; k < b.seg; k++) w.pos.push((b.pos[3 * k]! - mx) * r, -g.wurzelLaenge * v, (b.pos[3 * k + 2]! - mz) * r);
      }
      for (let i = 0; i + 1 < R; i++)
        for (let k = 0; k < b.seg; k++) {
          const a = i * b.seg + k;
          const c = i * b.seg + ((k + 1) % b.seg);
          w.idx.push(a, c, a + b.seg, c, c + b.seg, a + b.seg);
        }
      w.pos.push(0, -g.wurzelLaenge, 0);
      for (let k = 0; k < b.seg; k++) w.idx.push((R - 1) * b.seg + k, (R - 1) * b.seg + ((k + 1) % b.seg), R * b.seg);
    } else w = wurzelBau(g.wurzel, (0.5 * (xr - xl)) / 0.86, (0.5 * (zv - zh)) / 0.86, g.wurzelLaenge);
    const nk = b.pos.length / 3;
    const pos = new Float32Array(b.pos.length + w.pos.length);
    pos.set(b.pos);
    for (let i = 0; i < w.pos.length; i += 3) {
      pos[b.pos.length + i] = w.pos[i]! + mx;
      pos[b.pos.length + i + 1] = w.pos[i + 1]!;
      pos[b.pos.length + i + 2] = w.pos[i + 2]! + mz;
    }
    // (mit Wurzel ohne den Boden der Krone, wie bei den Vorlagen: Er zöge am Zahnfleisch die Normalen nach unten, und der Zahn
    // hätte dort einen dunklen Rand; die Wurzel schließt ihn)
    const krone = g.wurzel === 'keine' ? b.idx : new Uint32Array([...b.idx.subarray(0, b.wand), ...b.idx.subarray(b.wand + 3 * b.seg)]);
    const idx = new Uint32Array(krone.length + w.idx.length);
    idx.set(krone);
    for (let i = 0; i < w.idx.length; i++) idx[krone.length + i] = nk + w.idx[i]!;
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setIndex(new BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    let hoch = 0;
    let breit = 0;
    for (let i = 0; i < b.pos.length; i += 3) {
      hoch = Math.max(hoch, b.pos[i + 1]!);
      breit = Math.max(breit, Math.abs(b.pos[i]!), Math.abs(b.pos[i + 2]!));
    }
    this.gestalt = g;
    // (die Normalen für die ruhenden Linien: nur aus der Wand; der Boden zählt nicht mit)
    this.fein = { pos: b.pos, nor: normalen(b.pos, b.idx.subarray(0, b.wand)), ringe: b.ringe, seg: b.seg };
    // (eine Gestalt von außen, etwa nach ⌘Z oder mit einer anderen Vorlage: Das Netz der Linie wird neu gelesen, und der Zahn füllt
    // wieder die Linse; die eigene nach einem Griff ist schon eingetragen, dann bleibt er stehen, wie er steht)
    const eigen = !!this.netzStand && this.netzStand.gestalt === g;
    if (!eigen) this.netzStand = null;
    this.zahnStellen(geo, hoch, g.wurzel === 'keine' ? 0 : g.wurzelLaenge, breit, eigen);
  }

  /**
   * Der Zahn (sein Netz) in der Linse; `breit`: sein größtes Maß quer (für die Ansicht von oben; 0: keine). `halten`: Eingerastet
   * bleibt er stehen, wie er steht (er kommt aus einem Griff an seiner Linie, und die liegt in Bildpunkten fest).
   */
  private zahnStellen(geo: BufferGeometry, laenge: number, wurzel: number, breit: number, halten = false): void {
    if (this.zahn) {
      this.zahn.removeFromParent();
      this.zahn.geometry.dispose();
    }
    const neu = this.teilArt !== 'zahn';
    if (neu) {
      this.gierZahn = -0.5;
      this.neigZahn = 0.15;
      this.rast = null;
      this.flach = 0;
      this.oben = 0;
    }
    this.teilArt = 'zahn';
    this.fleisch.visible = true;
    this.zahn = new Mesh(geo, this.material);
    // so groß, dass er die Linse füllt
    const k = 3.6 / Math.max(laenge + wurzel, 1.6);
    // (von oben steht er größer; ohne Maß quer, während die Vorlage wechselt, bleibt eingerastet das von eben)
    const oben = breit > 1e-9 ? Math.max(1, Math.min(3.4, (0.6 * 9.5 * TAN_FREI) / (breit * k))) : this.rast && this.lageZiel ? this.lageZiel.oben : 1;
    this.lageZiel = { k, fussY: 0.5 - 0.5 * (laenge - wurzel) * k, oben };
    if (neu || !this.rast || !this.lage || !halten) {
      this.lage = { ...this.lageZiel };
      this.lageNach = false;
    }
    this.lageAnwenden();
    this.dreh.add(this.zahn);
    this.lauf();
  }
  private lageAnwenden(): void {
    const L = this.lage;
    if (!L || !this.zahn || this.teilArt !== 'zahn') return;
    this.zahn.scale.setScalar(L.k);
    this.fleisch.scale.setScalar(L.k * 0.62);
    this.dreh.scale.setScalar(1 + (L.oben - 1) * this.oben);
    this.dreh.position.y = L.fussY + (0.5 - L.fussY) * this.oben;
  }
  /** was in der Linse steht, trägt keine Linien (mehr) */
  private ohneLinien(): void {
    this.gestalt = null;
    this.fein = null;
    this.netzStand = null;
    this.stille = [];
    this.linienZug = false;
    this.verhalten?.zeigerWeg();
    this.feld.classList.remove('formt');
  }

  private vorlagen(): LinsenVorlage[] {
    return this.ziele.vorlagen ?? ZAHN_VORLAGEN;
  }
  private winkelVon(i: number): number {
    return (-2 * Math.PI * i) / this.vorlagen().length;
  }

  private bauen(): void {
    const s = this.svg;
    s.innerHTML = '';
    const G = this.groesse;
    const R = G / 2;
    // (so breit, dass Perlen und Tropfen im Kreis des Felds liegen: Wo eine Seite das Feld rund ausschneidet, bleibt alles heil)
    const rand = 66;
    const W = G + 2 * rand;
    this.feld.style.width = `${W}px`;
    this.feld.style.height = `${W}px`;
    s.setAttribute('viewBox', `${-W / 2} ${-W / 2} ${W} ${W}`);
    s.setAttribute('width', String(W));
    s.setAttribute('height', String(W));
    this.leinwand.style.width = this.leinwand.style.height = `${G}px`;
    this.leinwand.style.left = this.leinwand.style.top = `${rand}px`;
    this.renderer.setSize(G, G, false);
    this.linienBild.style.width = this.linienBild.style.height = `${G}px`;
    this.linienBild.style.left = this.linienBild.style.top = `${rand}px`;
    // (die Linie liegt in Bildpunkten der Linse: Mit ihrer Größe wird das Netz neu gelesen)
    this.anzeige?.groesse(G * this.dichte(), G * this.dichte());
    this.netzStand = null;
    // die Linse: ein Rand aus Tinte, innen ein heller Schimmer wie auf einem Tropfen
    s.appendChild(el('circle', { r: R + 0.5, class: 'linse-rand' }));
    s.appendChild(el('path', { d: `M${-R * 0.72},${-R * 0.42}A${R * 0.86},${R * 0.86} 0 0 1 ${-R * 0.18},${-R * 0.82}`, class: 'linse-glanz' }));
    // Formenring
    const r1 = R + 20;
    const formen = el('g', { class: 'ring-formen' });
    formen.appendChild(el('circle', { r: r1, class: 'ring-bahn' }));
    const vorlagen = this.vorlagen();
    vorlagen.forEach((z, i) => {
      const a = (2 * Math.PI * i) / vorlagen.length - Math.PI / 2;
      const g = el('g', { transform: `translate(${(Math.cos(a) * r1).toFixed(2)},${(Math.sin(a) * r1).toFixed(2)}) rotate(${((a * 180) / Math.PI + 90).toFixed(2)})`, class: 'ring-zeichen', 'data-i': i });
      g.appendChild(el('circle', { r: 13, class: 'zeichen-grund' }));
      g.appendChild(el('path', { d: z.zeichen, transform: `translate(0,${z.ab ?? 8})`, ...(z.farbe ? { style: `fill:${z.farbe}` } : {}) }));
      const t = el('title');
      t.textContent = z.name;
      g.appendChild(t);
      formen.appendChild(g);
    });
    s.appendChild(formen);
    // Drehregler: geriffelt
    const r2 = R + 46;
    const rad = el('g', { class: 'ring-rad' });
    rad.appendChild(el('circle', { r: r2, class: 'rad-band' }));
    for (let i = 0; i < 72; i++) {
      const a = (2 * Math.PI * i) / 72;
      const lang = i % 6 === 0 ? 6 : 3.5;
      rad.appendChild(el('line', { x1: Math.cos(a) * (r2 - lang), y1: Math.sin(a) * (r2 - lang), x2: Math.cos(a) * (r2 + lang), y2: Math.sin(a) * (r2 + lang), class: i % 6 === 0 ? 'riffel lang' : 'riffel' }));
    }
    s.appendChild(rad);
    // die Marke oben und der Tropfen, der an ihr hängt
    s.appendChild(el('path', { d: `M0,${-(r1 + 17)}l-4,-7h8z`, class: 'marke' }));
    s.appendChild(el('circle', { r: 4.5, cy: -(r2 + 12), class: 'rad-tropfen' }));
    // Perlen: was der Drehregler stellt (unten links am Rad)
    const perlen = el('g', { class: 'perlen' });
    this.ziele.perlen.forEach((p, i) => {
      const a = Math.PI * (0.62 + 0.115 * i);
      const g = el('g', { transform: `translate(${(Math.cos(a) * (r2 + 2)).toFixed(2)},${(Math.sin(a) * (r2 + 2)).toFixed(2)})`, class: 'perle', 'data-i': i });
      g.appendChild(el('circle', { r: 12 }));
      const t = el('text', { y: 3.6 });
      t.textContent = p.kurz;
      g.appendChild(t);
      const tt = el('title');
      tt.textContent = p.name;
      g.appendChild(tt);
      perlen.appendChild(g);
    });
    s.appendChild(perlen);
    // wem die Linse gilt: je Reihe eine Perle (oben rechts am Rad, die erste zuoberst)
    const reihen = el('g', { class: 'reihen' });
    (this.ziele.reihen ?? []).forEach((r, i) => {
      const a = -Math.PI * (0.3 - 0.115 * i);
      const g = el('g', { transform: `translate(${(Math.cos(a) * (r2 + 2)).toFixed(2)},${(Math.sin(a) * (r2 + 2)).toFixed(2)})`, class: 'reihe', 'data-i': i, style: `--reihe:${r.farbe}` });
      g.appendChild(el('circle', { r: 9 }));
      const tt = el('title');
      tt.textContent = r.name;
      g.appendChild(tt);
      reihen.appendChild(g);
    });
    s.appendChild(reihen);
    // die Farbe des Teils: eine Perle unten am Rad (zwischen dem Tropfen zum Größerziehen und den Perlen des Drehreglers)
    if (this.ziele.farbe) {
      const a = Math.PI * 0.42;
      const g = el('g', { transform: `translate(${(Math.cos(a) * (r2 + 2)).toFixed(2)},${(Math.sin(a) * (r2 + 2)).toFixed(2)})`, class: 'farbperle' });
      g.appendChild(el('circle', { r: 9 }));
      const tt = el('title');
      tt.textContent = this.ziele.farbe.name;
      g.appendChild(tt);
      s.appendChild(g);
    }
    // die Zahl: steht nur, solange gedreht wird
    this.zahl = el('text', { y: R - 16, class: 'linse-zahl' });
    s.appendChild(this.zahl);
    // der Tropfen zum Größerziehen
    const a = Math.PI * 0.25;
    s.appendChild(el('circle', { r: 6.5, cx: Math.cos(a) * (r2 + 2), cy: Math.sin(a) * (r2 + 2), class: 'linse-griff' }));
    this.zeigen();
  }

  private zeigen(): void {
    const s = this.svg;
    s.querySelector<SVGGElement>('.ring-formen')?.setAttribute('transform', `rotate(${((this.formWinkel * 180) / Math.PI).toFixed(2)})`);
    s.querySelector<SVGGElement>('.ring-rad')?.setAttribute('transform', `rotate(${((this.radWinkel * 180) / Math.PI).toFixed(2)})`);
    s.querySelectorAll<SVGGElement>('.ring-zeichen').forEach((g) => g.classList.toggle('gilt', Number(g.dataset.i) === this.gewaehlt));
    s.querySelectorAll<SVGGElement>('.perle').forEach((g) => g.classList.toggle('gilt', Number(g.dataset.i) === this.perle));
    s.querySelectorAll<SVGGElement>('.reihe').forEach((g) => g.classList.toggle('gilt', !!this.ziele.reihen?.[Number(g.dataset.i)]?.an()));
    if (this.ziele.farbe) {
      const farbe = this.ziele.farbe.wert();
      s.querySelector<SVGCircleElement>('.farbperle circle')?.setAttribute('fill', farbe);
      this.material.color.set(farbe);
    }
    // der Tropfen an der Marke dehnt sich in Drehrichtung und schnappt beim Rasten zurück
    const t = s.querySelector<SVGCircleElement>('.rad-tropfen');
    if (t) {
      const d = Math.max(-1, Math.min(1, this.tropfenAus));
      t.setAttribute('transform', `rotate(${(d * 7).toFixed(2)}) scale(${(1 + 0.5 * Math.abs(d)).toFixed(3)},${(1 - 0.28 * Math.abs(d)).toFixed(3)})`);
      t.style.transformOrigin = `0px ${t.getAttribute('cy')}px`;
    }
  }

  private tick(stark: boolean): void {
    try {
      this.ton ??= new AudioContext();
      const c = this.ton;
      // (vorab angelegt, ohne dass eine Hand im Spiel war, ruht er noch: Jetzt ist eine im Spiel)
      if (c.state === 'suspended') void c.resume();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = stark ? 1500 : 2300;
      g.gain.setValueAtTime(stark ? 0.07 : 0.035, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.035);
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.04);
    } catch {
      // (kein Ton: dann nur das Bild)
    }
    navigator.vibrate?.(stark ? 6 : 3);
  }

  /** den Drehregler um einen Winkel weiterdrehen: je Rast (15°) ein Schritt */
  private radDrehen(dw: number): void {
    const p = this.ziele.perlen[this.perle];
    if (!p) return;
    this.radWinkel += dw;
    const RAST = Math.PI / 12;
    this.radRest += dw / RAST;
    this.tropfenAus = this.radRest;
    const teil = p.rastet ? 1 : 10;
    const schritte = Math.trunc(this.radRest * teil);
    if (schritte !== 0) {
      this.radRest -= schritte / teil;
      const alt = p.wert();
      const neu = Math.max(p.min, Math.min(p.max, alt + (schritte * p.schritt) / (p.rastet ? 1 : 10)));
      if (neu !== alt) {
        p.setzen(neu);
        if (p.rastet || Math.floor(neu / p.schritt) !== Math.floor(alt / p.schritt)) this.tick(p.rastet);
      } else if (p.rastet) this.radSchwung = 0;
      this.zahlZeigen(p.zeigen(p.wert()));
    }
  }

  private zahlZeigen(text: string): void {
    if (!this.zahl) return;
    this.zahl.textContent = text;
    this.zahl.classList.add('da');
    window.clearTimeout(this.zahlUhr);
    this.zahlUhr = window.setTimeout(() => this.zahl?.classList.remove('da'), 900);
  }

  private eingaben(): void {
    const mitteVon = (): [number, number] => {
      const r = this.feld.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    };
    let zug: {
      art: 'formen' | 'rad' | 'zahn' | 'groesse';
      w: number;
      x: number;
      y: number;
      t: number;
      weg: number;
      g0: number;
      d0: number;
      zeichen: number | null;
      /** wo gedrückt wurde, die ruhende Linie dort, und ob der Zahn schon dreht (Etappe 7: Ein Tipp auf eine Linie dreht ihn in ihre Ansicht) */
      x0: number;
      y0: number;
      linie: GestaltLinie | null;
      dreht: boolean;
    } | null = null;
    const winkel = (e: PointerEvent): number => {
      const [mx, my] = mitteVon();
      return Math.atan2(e.clientY - my, e.clientX - mx);
    };
    this.feld.addEventListener('pointerdown', (e) => {
      const [mx, my] = mitteVon();
      const d = Math.hypot(e.clientX - mx, e.clientY - my);
      const R = this.groesse / 2;
      const ziel = e.target as Element;
      let art: 'formen' | 'rad' | 'zahn' | 'groesse';
      if (ziel.closest('.linse-griff')) art = 'groesse';
      else if (ziel.closest('.farbperle')) {
        // (der Farbwähler geht beim Klick auf: Nur der gilt auf jedem Gerät als Eingabe von Hand)
        e.stopPropagation();
        return;
      } else if (ziel.closest('.reihe')) {
        this.ziele.reihen?.[Number((ziel.closest('.reihe') as SVGGElement).dataset.i)]?.tippen();
        this.tick(false);
        this.zeigen();
        e.preventDefault();
        e.stopPropagation();
        return;
      } else if (ziel.closest('.perle')) {
        this.perle = Number((ziel.closest('.perle') as SVGGElement).dataset.i);
        const p = this.ziele.perlen[this.perle]!;
        this.zahlZeigen(`${p.name} ${p.zeigen(p.wert())}`);
        this.tick(false);
        this.zeigen();
        e.preventDefault();
        e.stopPropagation();
        return;
      } else if (d < R) art = 'zahn';
      else if (d < R + 33) art = 'formen';
      else if (d < R + 60) art = 'rad';
      else return;
      // Etappe 7: Eingerastet gehört das Drücken der Linie, wenn dort etwas am Zeiger hängt; sonst dem Zahn (drehen)
      let linie: GestaltLinie | null = null;
      if (art === 'zahn' && this.gestalt) {
        const griff = this.linienDruecken(e);
        if (griff) {
          if (griff === 'zug') {
            this.feld.setPointerCapture(e.pointerId);
            this.linienZug = true;
          }
          e.preventDefault();
          e.stopPropagation();
          this.lauf();
          return;
        }
        const r = this.linienBild.getBoundingClientRect();
        linie = this.linieBei(e.clientX - r.left, e.clientY - r.top);
      }
      this.feld.setPointerCapture(e.pointerId);
      // (das Zeichen unter dem Zeiger jetzt merken: Beim Loslassen meldet der Browser das gefangene Feld, nicht mehr das Zeichen)
      const zeichen = ziel.closest('.ring-zeichen') as SVGGElement | null;
      zug = { art, w: winkel(e), x: e.clientX, y: e.clientY, t: performance.now(), weg: 0, g0: this.groesse, d0: d, zeichen: zeichen ? Number(zeichen.dataset.i) : null, x0: e.clientX, y0: e.clientY, linie, dreht: false };
      this.radSchwung = 0;
      if (art === 'rad') this.griff++;
      if (art === 'formen') this.formZiel = null;
      this.feld.classList.add(`zieht-${art}`);
      e.preventDefault();
      e.stopPropagation();
    });
    this.feld.addEventListener('pointermove', (e) => {
      if (this.linienZug) {
        this.zeigerAn(e);
        this.lauf();
        return;
      }
      if (!zug) {
        // der Zeiger über dem runden Feld: Eingerastet zeigt ihn das Verhalten der Linien (und was an ihm hängt)
        if (!this.gestalt) return;
        const r = this.linienBild.getBoundingClientRect();
        const R = this.groesse / 2;
        if (Math.hypot(e.clientX - r.left - R, e.clientY - r.top - R) < R) this.zeigerAn(e);
        else {
          this.zeigerOrt = null;
          this.verhalten?.zeigerWeg();
        }
        if (this.feld.classList.contains('formt')) this.lauf();
        return;
      }
      const jetzt = performance.now();
      if (zug.art === 'zahn') {
        // (ein Zahn mit Linien dreht erst nach ein paar Bildpunkten Weg: Ein Tipp verrückt ihn nicht; dann löst er sich aus seiner Ansicht)
        if (!zug.dreht && (!this.gestalt || Math.hypot(e.clientX - zug.x0, e.clientY - zug.y0) > TIPP_WEG)) {
          zug.dreht = true;
          this.rast = null;
          this.verhalten?.zeigerWeg();
        }
        if (zug.dreht) {
          this.gierZahn += (e.clientX - zug.x) * 0.012;
          this.neigZahn = Math.max(-1.2, Math.min(this.gestalt ? Math.PI / 2 : 1.2, this.neigZahn + (e.clientY - zug.y) * 0.012));
        }
      } else if (zug.art === 'groesse') {
        const [mx, my] = mitteVon();
        const d = Math.hypot(e.clientX - mx, e.clientY - my);
        const neu = Math.round(Math.max(150, Math.min(520, zug.g0 + 2 * (d - zug.d0))));
        if (neu !== this.groesse) {
          this.groesse = neu;
          this.bauen();
        }
      } else {
        const w = winkel(e);
        let dw = w - zug.w;
        if (dw > Math.PI) dw -= 2 * Math.PI;
        if (dw < -Math.PI) dw += 2 * Math.PI;
        zug.w = w;
        zug.weg += Math.abs(dw);
        if (zug.art === 'formen') this.formWinkel += dw;
        else {
          this.radDrehen(dw);
          const dt = Math.max(1, jetzt - zug.t) / 1000;
          this.radSchwung = 0.6 * this.radSchwung + 0.4 * (dw / dt);
        }
      }
      zug.x = e.clientX;
      zug.y = e.clientY;
      zug.t = jetzt;
      this.lauf();
    });
    const ende = (): void => {
      if (this.linienZug) {
        this.linienZug = false;
        this.verhalten?.loslassen();
        this.linienLoslassen();
        this.lauf();
        return;
      }
      if (!zug) return;
      const z = zug;
      zug = null;
      this.feld.classList.remove('zieht-formen', 'zieht-rad', 'zieht-zahn', 'zieht-groesse');
      if (z.art === 'formen') {
        const n = this.vorlagen().length;
        let i: number;
        if (z.weg < 0.03 && z.zeichen !== null) i = z.zeichen;
        else i = (((Math.round((-this.formWinkel / (2 * Math.PI)) * n) % n) + n) % n);
        // auf dem kürzeren Weg an die Marke
        let zielW = this.winkelVon(i);
        while (zielW - this.formWinkel > Math.PI) zielW -= 2 * Math.PI;
        while (zielW - this.formWinkel < -Math.PI) zielW += 2 * Math.PI;
        this.formZiel = zielW;
        if (i !== this.gewaehlt) {
          this.gewaehlt = i;
          this.tick(true);
          this.ziele.form(i);
        }
      } else if (z.art === 'rad' && performance.now() - z.t > 60) this.radSchwung = 0;
      // Etappe 7: nach dem Drehen von Hand rastet der Zahn nahe einer Ansicht ein; ein Tipp auf eine Linie dreht ihn in ihre Ansicht
      if (z.art === 'zahn' && this.gestalt) {
        if (z.dreht) this.rastPruefen();
        else if (z.linie) this.blickAuf(z.linie);
      }
      this.lauf();
    };
    this.feld.addEventListener('pointerup', ende);
    this.feld.addEventListener('pointercancel', ende);
    this.feld.addEventListener('pointerleave', () => {
      this.zeigerOrt = null;
      if (this.linienZug) return;
      this.verhalten?.zeigerWeg();
      this.lauf();
    });
    // die Perle der Farbe: der Farbwähler des Systems, mit der Farbe von jetzt; was dort gewählt wird, ist ein Griff
    this.feld.addEventListener('click', (e) => {
      const f = this.farbfeld;
      if (!f || !this.ziele.farbe || !(e.target as Element).closest('.farbperle')) return;
      this.griff++;
      f.value = this.ziele.farbe.wert();
      this.tick(false);
      try {
        f.showPicker();
      } catch {
        f.click();
      }
    });
    // das Rad der Maus dreht den Drehregler
    this.feld.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        // (ein Zug am Rad der Maus ist ein Griff: Was nach einer Pause kommt, ist der nächste)
        const jetzt = performance.now();
        if (jetzt - this.radMausZeit > 350) this.griff++;
        this.radMausZeit = jetzt;
        this.radDrehen(-e.deltaY * 0.004);
        this.lauf();
      },
      { passive: false },
    );
  }

  // ---------- Etappe 7: einrasten, Linien zeigen, formen ----------

  private dichte(): number {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  /** die Kamera: frei gedreht wie bisher; eingerastet fährt sie zurück und wird schmal (der Zahn in der Mitte bleibt so groß) */
  private kameraStellen(): void {
    const f = this.teilArt === 'zahn' ? this.flach : 0;
    const k = this.kamera;
    if (f < 1e-4) {
      if (k.fov !== 26 || k.position.z !== 9.5) {
        k.fov = 26;
        k.position.set(0, 0.5, 9.5);
        k.near = 0.1;
        k.far = 100;
        k.updateProjectionMatrix();
      }
      return;
    }
    const t = TAN_FREI + (TAN_FLACH - TAN_FREI) * f;
    const d = (9.5 * TAN_FREI) / t;
    k.fov = (2 * Math.atan(t) * 180) / Math.PI;
    k.position.set(0, 0.5, d);
    k.near = Math.max(0.1, d - 9);
    k.far = d + 9;
    k.updateProjectionMatrix();
  }

  /** der Zahn steht genau in der Ansicht, in die er eingerastet ist */
  private eingerastet(): boolean {
    const r = this.rast;
    return !!r && !!this.gestalt && this.teilArt === 'zahn' && this.flach === 1 && this.gierZahn === r.gier && this.neigZahn === r.neig && this.oben === (r.linie === 'quer' ? 1 : 0) && !this.lageNach;
  }

  /** je Bild: Der Zahn dreht in seine Ansicht, die Kamera wird schmal; frei gedreht zurück. Zurück: ob es weitere Bilder braucht */
  private blickSchritt(dt: number): boolean {
    if (this.teilArt !== 'zahn') return false;
    let weiter = false;
    const r = this.gestalt ? this.rast : null;
    const k = 1 - Math.exp(-dt / 0.07);
    const zu = (ist: number, soll: number, eps: number): number => {
      if (Math.abs(soll - ist) <= eps) return soll;
      weiter = true;
      return ist + (soll - ist) * k;
    };
    if (r) {
      this.gierZahn = zu(this.gierZahn, r.gier, 1e-3);
      this.neigZahn = zu(this.neigZahn, r.neig, 1e-3);
    }
    this.flach = zu(this.flach, r ? 1 : 0, 2e-3);
    this.oben = zu(this.oben, r?.linie === 'quer' ? 1 : 0, 2e-3);
    // die Größe: frei gedreht füllt der Zahn die Linse; eingerastet nur, wenn er nach einem Griff nicht mehr hineinpasst
    const L = this.lage;
    const Z = this.lageZiel;
    if (L && Z && (this.lageNach || !this.rast)) {
      L.k = zu(L.k, Z.k, 1e-3 * Z.k);
      L.fussY = zu(L.fussY, Z.fussY, 1e-3);
      L.oben = zu(L.oben, Z.oben, 1e-3);
      if (L.k === Z.k && L.fussY === Z.fussY && L.oben === Z.oben) this.lageNach = false;
    }
    this.lageAnwenden();
    return weiter;
  }

  /** nach dem Drehen von Hand: nahe an einer Ansicht rastet der Zahn ein */
  private rastPruefen(): void {
    this.rast = null;
    if (!this.gestalt) return;
    let weit = (RASTET_GRAD * Math.PI) / 180;
    for (const b of BLICKE) {
      // (von oben zählt nur die Neigung: Der Zahn rastet in der nächsten Viertelwendung ein)
      const gier = b.linie === 'quer' ? Math.round(this.gierZahn / (Math.PI / 2)) * (Math.PI / 2) : this.gierZahn + winkelWeg(b.gier, this.gierZahn);
      const d = Math.max(Math.abs(this.neigZahn - b.neig), Math.abs(gier - this.gierZahn));
      if (b.linie === 'quer' ? Math.abs(this.neigZahn - b.neig) < weit : d < weit) {
        weit = b.linie === 'quer' ? Math.abs(this.neigZahn - b.neig) : d;
        this.rast = { linie: b.linie, gier, neig: b.neig };
      }
    }
  }

  /** den Zahn in die Ansicht einer Linie drehen (ein Tipp auf sie): in die nächste, in der sie ihre Punkte trägt */
  blickAuf(linie: GestaltLinie): void {
    if (!this.gestalt || this.teilArt !== 'zahn') return;
    let best: Blick | null = null;
    let weit = Infinity;
    for (const b of BLICKE) {
      if (b.linie !== linie) continue;
      const gier = b.linie === 'quer' ? Math.round(this.gierZahn / (Math.PI / 2)) * (Math.PI / 2) : this.gierZahn + winkelWeg(b.gier, this.gierZahn);
      const d = Math.abs(gier - this.gierZahn) + Math.abs(b.neig - this.neigZahn);
      if (d < weit) {
        weit = d;
        best = { linie, gier, neig: b.neig };
      }
    }
    this.rast = best;
    this.tick(false);
    this.lauf();
  }
  /** frei drehen (für Proben): so steht der Zahn, nichts ist eingerastet */
  blickFrei(gier: number, neig: number): void {
    this.rast = null;
    this.gierZahn = gier;
    this.neigZahn = neig;
    this.lauf();
  }

  /** ein Ort im Maß des Zahns im Bild: CSS-Pixel der Leinwand der Linien */
  private bildpunkt(x: number, y: number, z: number): [number, number] {
    const v = this.hilf.set(x, y, z).applyMatrix4(this.zahn!.matrixWorld).project(this.kamera);
    return [(v.x + 1) * 0.5 * this.groesse, (1 - v.y) * 0.5 * this.groesse];
  }
  /** wie die Linie einer Ansicht im Bild liegt (eingerastet: Die Kamera ist so schmal, dass das eine Abbildung ohne Flucht ist) */
  private abbildung(linie: GestaltLinie): Abbildung {
    const o = this.bildpunkt(0, 0, 0);
    const u = linie === 'seite' ? this.bildpunkt(0, 0, 1) : this.bildpunkt(1, 0, 0);
    const v = linie === 'quer' ? this.bildpunkt(0, 0, 1) : this.bildpunkt(0, 1, 0);
    return { ax: u[0] - o[0], ay: u[1] - o[1], bx: v[0] - o[0], by: v[1] - o[1], ox: o[0], oy: o[1] };
  }

  /** das Netz des Verhaltens neu aus der Gestalt lesen (was gewählt war, bleibt gewählt: nach seiner Stelle in der Linie) */
  private netzNeu(): void {
    const g = this.gestalt!;
    const r = this.rast!;
    const z = this.ziele.gestalt!;
    const A = this.abbildung(r.linie);
    const { netz, fest } = gestaltAlsNetz(g, r.linie, A);
    let gewaehlt: number[] = [];
    const alt = this.verhalten;
    if (alt && this.netzLinie === r.linie) {
      const l = alt.netz.linien[0];
      if (l) gewaehlt = [...alt.auswahl].map((pi) => l.punkte.indexOf(pi)).filter((k) => k >= 0 && k < netz.punkte.length);
    }
    if (!alt) {
      this.verhalten = new Verhalten(netz, z.werte);
      this.verhalten.werk = KEIN_STIFT;
      this.verhalten.halten = (n) => this.netzOrdnen(n);
    } else {
      alt.werte = z.werte;
      alt.netz = netz;
      alt.tropfen = [];
      alt.auswahlLeeren();
      alt.abtasten();
    }
    for (const k of gewaehlt) this.verhalten!.auswahl.add(k);
    this.netzStand = { linie: r.linie, gestalt: g, A, fest, blick: r };
    this.netzLinie = r.linie;
  }

  /** während ein Punkt gezogen wird: was nicht frei ist, bleibt, wo es hingehört (die Punkte am Zahnfleisch auf seiner Höhe, die Grenzen) */
  private netzOrdnen(netz: Netz): void {
    const st = this.netzStand;
    const l = netz.linien[0];
    if (!st || !l) return;
    const g = gestaltAusNetz(st.gestalt, st.linie, netz, st.fest, st.A);
    if (!g) return;
    const lagen = netzLagen(g, st.linie, st.A);
    for (let k = 0; k < l.punkte.length; k++) {
      const p = netz.punkte[l.punkte[k]!]!;
      p.x = lagen[k]![0];
      p.y = lagen[k]![1];
    }
  }

  /** das Netz zurücklesen: Hat sich die Linie geändert, gilt die neue Gestalt (der Zahn in der Linse sofort, das Maul über die Ziele) */
  private linienLesen(): void {
    const st = this.netzStand;
    const v = this.verhalten;
    const z = this.ziele.gestalt;
    if (!st || !v || !z) return;
    const g = gestaltAusNetz(st.gestalt, st.linie, v.netz, st.fest, st.A);
    if (!g || gestaltLinieGleich(g, st.gestalt, st.linie)) return;
    const vorher = st.gestalt;
    st.gestalt = g;
    this.gestaltZeigen(g);
    if (!z.setzen(g, this.linienGriff)) {
      // (nicht gesetzt: Es gilt wieder die von vorher, und die Linie wird neu gelesen)
      this.netzStand = null;
      this.gestaltZeigen(vorher);
    }
  }

  /**
   * Die Linien rechnen, vor dem Bild des Zahns: Eingerastet läuft das Verhalten einen Schritt, und die Linie wird zurückgelesen
   * (der Zahn dieses Bilds ist dann schon der neue). Zurück: ob es weitere Bilder braucht.
   */
  private linienRechnen(dt: number): boolean {
    this.szeneV = null;
    const z = this.ziele.gestalt;
    if (!this.gestalt || !this.fein || !this.zahn || this.teilArt !== 'zahn') {
      this.feld.classList.remove('formt');
      return false;
    }
    this.dreh.updateMatrixWorld(true);
    this.kamera.updateMatrixWorld();
    const formt = !!z && this.eingerastet();
    this.feld.classList.toggle('formt', formt);
    const v = this.verhalten;
    if (!formt || !z) {
      if (v && !this.linienZug) v.zeigerWeg();
      return false;
    }
    // (das Netz gilt der Ansicht, in der es gelesen wurde: In einer anderen wird es neu gelesen)
    const neu = !this.netzStand || this.netzStand.blick !== this.rast;
    if (neu) this.netzNeu();
    const V = this.verhalten!;
    if (V.stift !== z.stift()) V.stiftSchalten(z.stift());
    // (eben eingerastet, und der Zeiger steht schon über der Linse: Er ist da, ohne dass sich die Hand bewegt)
    const o = this.zeigerOrt;
    if (neu && o && !V.zeiger.da) V.zeigerSetzen(o.x, o.y, o.x, o.y, 0);
    const a: LinienAnsicht = { z: 1, ox: 0, oy: 0, dpr: this.dichte(), wachsen: false };
    V.setzeAnsicht(a);
    const aktiv = V.schritt(dt);
    this.linienLesen();
    this.szeneV = V.szene(a);
    return aktiv;
  }

  /** die Linien zeichnen: die des Verhaltens (eingerastet) und die ruhenden auf dem Zahn */
  private linienZeichnen(): void {
    const fein = this.fein;
    if (!this.gestalt || !fein || !this.zahn || this.teilArt !== 'zahn') {
      this.stille = [];
      if (this.anzeige && this.linienGezeichnet) {
        this.anzeige.zeichnen({ prim: this.kapseln.puffer, anzahl: 0, k0: 0, k1: 0, felder: [], tinte: TINTE, gruen: GRUEN, zeiger: null });
        this.linienGezeichnet = false;
      }
      return;
    }
    const D = this.dichte();
    const G = this.groesse;
    if (!this.anzeige) {
      this.anzeige = new FluessigeAnzeige(this.linienBild);
      this.anzeige.groesse(G * D, G * D);
    }
    const werte = this.ziele.gestalt?.werte ?? GRUNDWERTE;
    const K = this.kapseln;
    K.leeren();
    const sz = this.szeneV;
    if (sz) K.uebernehmen(sz);
    // die ruhenden Linien: Ketten von Punkten des feinen Netzes (von vorn: links hinauf, rechts hinunter; von der Seite: hinten
    // hinauf, vorn hinunter; quer: der erste Ring), fein; was auf der abgewandten Seite liegt, grün wie Verdecktes an der Form
    const { ringe, seg } = fein;
    const hinauf = (k: number): number[] => Array.from({ length: ringe }, (_, i) => i * seg + k);
    const ketten: { linie: GestaltLinie; nr: number[] }[] = [
      { linie: 'vorn', nr: [...hinauf(seg / 2), ...hinauf(0).reverse()] },
      { linie: 'seite', nr: [...hinauf((3 * seg) / 4), ...hinauf(seg / 4).reverse()] },
      { linie: 'quer', nr: [...Array.from({ length: seg }, (_, k) => k), 0] },
    ];
    const formt = sz ? this.rast?.linie : null;
    const halb = 0.5 * werte.innen * D;
    this.stille = [];
    for (const kette of ketten) {
      if (kette.linie === formt) continue;
      const x: number[] = [];
      const y: number[] = [];
      const vorn: boolean[] = [];
      for (const i of kette.nr) {
        const [px, py] = this.bildpunkt(fein.pos[3 * i]!, fein.pos[3 * i + 1]!, fein.pos[3 * i + 2]!);
        x.push(px);
        y.push(py);
        vorn.push(this.hilf.set(fein.nor[3 * i]!, fein.nor[3 * i + 1]!, fein.nor[3 * i + 2]!).applyQuaternion(this.dreh.quaternion).z > 0.02);
      }
      for (const schicht of [1, 0]) {
        const gruppe = K.neueGruppe();
        for (let j = 0; j + 1 < x.length; j++) {
          const sichtbar = vorn[j]! && vorn[j + 1]!;
          if (sichtbar !== (schicht === 0)) continue;
          K.push(x[j]! * D, y[j]! * D, x[j + 1]! * D, y[j + 1]! * D, halb, halb, gruppe, schicht, false);
        }
      }
      this.stille.push({ linie: kette.linie, x, y, vorn });
    }
    this.anzeige.zeichnen({ prim: K.puffer, anzahl: K.n, k0: sz?.k0 ?? 0, k1: sz?.k1 ?? werte.weich * D, felder: K.felder, tinte: TINTE, gruen: GRUEN, zeiger: sz?.zeiger ?? null, zeigerFarbe: 1 });
    this.linienGezeichnet = true;
  }

  /** die ruhende Linie unter einem Ort (CSS-Pixel der Leinwand der Linien), auf der zugewandten Seite */
  private linieBei(px: number, py: number): GestaltLinie | null {
    let best: GestaltLinie | null = null;
    let nah = LINIE_NAH;
    for (const s of this.stille) {
      for (let j = 0; j + 1 < s.x.length; j++) {
        if (!s.vorn[j] || !s.vorn[j + 1]) continue;
        const ax = s.x[j]!;
        const ay = s.y[j]!;
        const dx = s.x[j + 1]! - ax;
        const dy = s.y[j + 1]! - ay;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
        const d = Math.hypot(px - ax - t * dx, py - ay - t * dy);
        if (d < nah) {
          nah = d;
          best = s.linie;
        }
      }
    }
    return best;
  }

  /** der Zeiger über der Linse, für das Verhalten (CSS-Pixel der Leinwand der Linien) */
  private zeigerAn(e: PointerEvent): { x: number; y: number } {
    const r = this.linienBild.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    this.zeigerOrt = { x, y };
    const v = this.verhalten;
    if (v) {
      const dt = this.zeigerZeit ? (e.timeStamp - this.zeigerZeit) / 1000 : 0;
      this.zeigerZeit = e.timeStamp;
      v.alt = e.altKey;
      v.umschalt = e.shiftKey;
      v.zeigerSetzen(x, y, x, y, Math.max(0, Math.min(0.1, dt)));
    }
    return { x, y };
  }

  /**
   * Drücken im runden Feld: Eingerastet gehört es der Linie, wenn dort etwas am Zeiger hängt (ein Punkt, die Linie, eine Richtung);
   * mit P setzt es einen Punkt auf die Linie. Zurück: `zug` (ein Griff läuft bis zum Loslassen), `getan`, oder null (das Drücken
   * gilt dem Zahn: drehen).
   */
  private linienDruecken(e: PointerEvent): 'zug' | 'getan' | null {
    const v = this.verhalten;
    const z = this.ziele.gestalt;
    if (!v || !z || !this.eingerastet() || !this.netzStand) return null;
    this.zeigerAn(e);
    v.zielJetzt();
    const t = v.tropfen.find((q) => q.zustand === 'folgt');
    if (!t) return null;
    if (v.stift) {
      if (t.ziel.art !== 'linie') return null;
      // P: ein Punkt auf die Linie (sie behält genau ihren Verlauf); der Tropfen, der dort hing, fließt in ihn
      const pi = punktEinsetzen(v.netz, t.ziel.li, t.ziel.si, t.ziel.t);
      v.abtasten();
      t.zustand = 'zurueck';
      t.ziel = { art: 'punkt', pi };
      this.linienGriff++;
      z.gegriffen?.();
      this.tick(false);
      return 'getan';
    }
    if (!v.druecken()) return null;
    this.linienGriff++;
    z.gegriffen?.();
    return 'zug';
  }

  /** nach einem Griff: Passt der Zahn nicht mehr in die Linse (viel größer oder kleiner geworden), stellt sie sich weich nach */
  private linienLoslassen(): void {
    const L = this.lage;
    const Z = this.lageZiel;
    if (!L || !Z || !this.rast) return;
    if (Math.abs(Z.k / L.k - 1) > 0.12 || Math.abs(Z.fussY - L.fussY) > 0.22 || Math.abs(Z.oben / L.oben - 1) > 0.15) {
      this.lageNach = true;
      this.netzStand = null;
    }
  }

  /** die Tasten ⌥ und ⇧, wie sie gerade stehen (ein laufender Griff an einer Richtung reißt mit ⌥ los) */
  tasten(alt: boolean, umschalt: boolean): void {
    const v = this.verhalten;
    if (!v) return;
    v.alt = alt;
    v.umschalt = umschalt;
    if (this.linienZug) this.lauf();
  }
  /** so viele Punkte der Linie sind gewählt (0: keiner, oder der Zahn ist nicht eingerastet) */
  get linienGewaehlt(): number {
    return this.verhalten && this.eingerastet() ? this.verhalten.auswahl.size : 0;
  }
  /** die Auswahl an der Linie aufheben */
  linienAbwaehlen(): void {
    if (!this.verhalten?.auswahl.size) return;
    this.verhalten.auswahlLeeren();
    this.lauf();
  }
  /** ⌫: die gewählten Punkte der Linie löschen (die geteilten bleiben). Zurück: ob die Taste der Linie galt */
  linienLoeschen(): boolean {
    const v = this.verhalten;
    const z = this.ziele.gestalt;
    if (!v || !z || !this.eingerastet() || this.linienZug || !v.auswahl.size) return false;
    this.linienLesen();
    const st = this.netzStand;
    const l = v.netz.linien[0];
    if (!st || !l) return false;
    const stellen = [...v.auswahl].map((pi) => l.punkte.indexOf(pi)).filter((k) => k >= 0).sort((a, b) => b - a);
    let g = st.gestalt;
    let weg = 0;
    for (const k of stellen) {
      const o = gestaltOhneAnker(g, st.linie, k);
      if (o) {
        g = o;
        weg++;
      }
    }
    v.auswahlLeeren();
    if (weg) {
      this.linienGriff++;
      if (z.setzen(g, this.linienGriff)) {
        this.netzStand = null;
        this.gestaltZeigen(g);
      }
      this.tick(false);
    }
    this.lauf();
    return true;
  }
  /** das Zeichen einer Vorlage am Formenring neu zeichnen (ihr Umriss hat sich geändert) */
  zeichenSetzen(i: number, zeichen: string): void {
    const v = this.ziele.vorlagen?.[i];
    if (v) v.zeichen = zeichen;
    this.svg.querySelector(`.ring-zeichen[data-i="${i}"] path`)?.setAttribute('d', zeichen);
  }
  /**
   * Für Proben und die Seite: wie der Zahn steht und was seine Linie trägt. `punkte`: die Anker der Linie der Ansicht in der Folge
   * der Linie (Lagen im Fenster, CSS-Pixel; `fest`: ein geteilter Punkt). `linien`: die ruhenden Linien (je eine Stelle auf der
   * zugewandten Seite, im Fenster), zum Antippen.
   */
  linienStand(): { linie: GestaltLinie | null; eingerastet: boolean; formt: boolean; griff: number; gewaehlt: number; punkte: { x: number; y: number; fest: boolean; gewaehlt: boolean }[]; linien: { linie: GestaltLinie; x: number; y: number }[]; ms: number } {
    const r = this.linienBild.getBoundingClientRect();
    const st = this.netzStand;
    const v = this.verhalten;
    const formt = !!this.szeneV && !!st && !!v && this.eingerastet() && st.blick === this.rast;
    const l = formt ? v!.netz.linien[0] : undefined;
    const punkte = l ? l.punkte.map((pi) => ({ x: r.left + v!.netz.punkte[pi]!.x, y: r.top + v!.netz.punkte[pi]!.y, fest: st!.fest.includes(pi), gewaehlt: v!.auswahl.has(pi) })) : [];
    const linien = this.stille.flatMap((s) => {
      // (eine Stelle mitten in einem zugewandten Lauf)
      const da = s.vorn.map((q, j) => (q && s.vorn[j + 1] ? j : -1)).filter((j) => j >= 0);
      const j = da[Math.floor(da.length / 3)];
      return j === undefined ? [] : [{ linie: s.linie, x: r.left + 0.5 * (s.x[j]! + s.x[j + 1]!), y: r.top + 0.5 * (s.y[j]! + s.y[j + 1]!) }];
    });
    // (`ms`: das längste Bild der Linse seit dem letzten Lesen)
    const ms = this.bildMsMax;
    this.bildMsMax = 0;
    return { linie: this.rast?.linie ?? null, eingerastet: this.eingerastet(), formt, griff: this.linienGriff, gewaehlt: v && formt ? v.auswahl.size : 0, punkte, linien, ms };
  }

  private laeuft = false;
  private lauf(): void {
    if (this.laeuft || !this.offen) return;
    this.laeuft = true;
    this.letztesBild = performance.now();
    requestAnimationFrame(() => this.bild());
  }

  private bild(): void {
    const jetzt = performance.now();
    const dt = Math.min(0.05, (jetzt - this.letztesBild) / 1000);
    this.letztesBild = jetzt;
    let weiter = false;
    // der Formenring fährt weich an die Marke
    if (this.formZiel !== null) {
      const d = this.formZiel - this.formWinkel;
      if (Math.abs(d) > 1e-3) {
        this.formWinkel += d * (1 - Math.exp(-dt / 0.07));
        weiter = true;
      } else this.formWinkel = this.formZiel;
    }
    // der Drehregler läuft nach und kommt an einer Rast zur Ruhe
    if (Math.abs(this.radSchwung) > 0.25 && !this.feld.classList.contains('zieht-rad')) {
      this.radDrehen(this.radSchwung * dt);
      this.radSchwung *= Math.exp(-dt / 0.35);
      weiter = true;
    } else if (!this.feld.classList.contains('zieht-rad')) {
      this.radSchwung = 0;
      if (Math.abs(this.radRest) > 1e-3 || Math.abs(this.tropfenAus) > 1e-3) {
        // zwischen zwei Rasten: zurück zur nächsten
        const k = 1 - Math.exp(-dt / 0.06);
        const dw = -this.radRest * k * (Math.PI / 12);
        this.radWinkel += dw;
        this.radRest *= 1 - k;
        this.tropfenAus = this.radRest;
        weiter = true;
      }
    }
    this.zeigen();
    if (this.blickSchritt(dt)) weiter = true;
    this.dreh.rotation.set(this.neigZahn, this.gierZahn, 0);
    this.kameraStellen();
    // (erst die Linien rechnen: Was ein Griff an ihnen ändert, zeigt der Zahn schon in diesem Bild)
    if (this.linienRechnen(dt)) weiter = true;
    this.renderer.render(this.szene, this.kamera);
    this.linienZeichnen();
    this.bildMs = performance.now() - jetzt;
    this.bildMsMax = Math.max(this.bildMsMax, this.bildMs);
    this.laeuft = false;
    if (weiter) this.lauf();
  }
}
