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
 */
import { AmbientLight, type BufferGeometry, Color, DataTexture, DirectionalLight, Group, Mesh, MeshMatcapMaterial, PerspectiveCamera, RGBAFormat, SRGBColorSpace, Scene, WebGLRenderer, DoubleSide } from 'three';
import { ZAHN_FORMEN, zahnNetz, zahnUmriss, type ZahnForm } from './zahn';

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
    this.dreh.rotation.set(this.neigZahn, this.gierZahn, 0);
    this.renderer.render(this.szene, this.kamera);
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
    this.zahn = new Mesh(netz, this.material);
    this.zahn.scale.setScalar(4.38 / Math.max(mass, 1e-9));
    this.fleisch.visible = false;
    this.dreh.position.y = 0.5;
    this.dreh.add(this.zahn);
    this.lauf();
  }
  schliessen(): void {
    this.offen = false;
    this.feld.hidden = true;
  }

  /** der Zahn, der in der Linse steht */
  zahnSetzen(form: ZahnForm): void {
    if (this.zahn) {
      this.zahn.removeFromParent();
      this.zahn.geometry.dispose();
    }
    if (this.teilArt !== 'zahn') {
      this.gierZahn = -0.5;
      this.neigZahn = 0.15;
    }
    this.teilArt = 'zahn';
    this.fleisch.visible = true;
    this.zahn = new Mesh(zahnNetz(form, true), this.material);
    // so groß, dass er die Linse füllt
    const hoch = form.laenge + (form.wurzel === 'keine' ? 0 : form.wurzelLaenge);
    const k = 3.6 / Math.max(hoch, 1.6);
    this.zahn.scale.setScalar(k);
    this.fleisch.scale.setScalar(k * 0.62);
    this.dreh.position.y = 0.5 - 0.5 * (form.laenge - (form.wurzel === 'keine' ? 0 : form.wurzelLaenge)) * k;
    this.dreh.add(this.zahn);
    this.lauf();
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
    let zug: { art: 'formen' | 'rad' | 'zahn' | 'groesse'; w: number; x: number; y: number; t: number; weg: number; g0: number; d0: number; zeichen: number | null } | null = null;
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
      this.feld.setPointerCapture(e.pointerId);
      // (das Zeichen unter dem Zeiger jetzt merken: Beim Loslassen meldet der Browser das gefangene Feld, nicht mehr das Zeichen)
      const zeichen = ziel.closest('.ring-zeichen') as SVGGElement | null;
      zug = { art, w: winkel(e), x: e.clientX, y: e.clientY, t: performance.now(), weg: 0, g0: this.groesse, d0: d, zeichen: zeichen ? Number(zeichen.dataset.i) : null };
      this.radSchwung = 0;
      if (art === 'rad') this.griff++;
      if (art === 'formen') this.formZiel = null;
      this.feld.classList.add(`zieht-${art}`);
      e.preventDefault();
      e.stopPropagation();
    });
    this.feld.addEventListener('pointermove', (e) => {
      if (!zug) return;
      const jetzt = performance.now();
      if (zug.art === 'zahn') {
        this.gierZahn += (e.clientX - zug.x) * 0.012;
        this.neigZahn = Math.max(-1.2, Math.min(1.2, this.neigZahn + (e.clientY - zug.y) * 0.012));
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
      this.lauf();
    };
    this.feld.addEventListener('pointerup', ende);
    this.feld.addEventListener('pointercancel', ende);
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
    this.dreh.rotation.set(this.neigZahn, this.gierZahn, 0);
    this.renderer.render(this.szene, this.kamera);
    this.laeuft = false;
    if (weiter) this.lauf();
  }
}
