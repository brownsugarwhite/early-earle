// Bühne: drei Ebenen übereinander. Grund (2D: Papier, Level, Bodenlinie), Figur (WebGL2: flüssig geglättet, ganz auf der
// Grafikkarte), Oben (2D: Wuff!, Zzz, Meldungen). Kamera: Welt in Logo-Koordinaten → Bildschirm.
// Für Prüfblätter und Aufnahmen (`inGrund`) wird jede Figur in den Grund kopiert, damit Ausschnitte und Linien darüber stimmen.
import type { Zeichenteil } from './figur';
import { Fluessig } from './fluessig';
import { type Farben, pfadAus, zeichneTeile } from './zeichnen';

export class Buehne {
  readonly grund: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly oben: HTMLCanvasElement;
  readonly obenCtx: CanvasRenderingContext2D;
  private fluessig: Fluessig | null = null;
  /** Figuren in den Grund kopieren (Prüfblätter, Aufnahme), statt sie auf ihrer eigenen Ebene zu lassen */
  inGrund = false;
  breite = 1;
  hoehe = 1;
  dpr = 1;
  /** Kamera: Weltpunkt in der Mitte, Maßstab (Bildpunkte je Welteinheit) */
  kamera = { x: 900, y: 820, massstab: 0.3 };
  farben: Farben = { schwarz: '#1f1a17', weiss: '#ffffff' };
  hintergrund = '#ffffff';
  /** Glätte der flüssigen Stufe in Welteinheiten (Logo-Bildpunkten): so groß werden die Kehlen zwischen Teilen; 0 = aus */
  glaette = 32;
  /** zusätzlich nach außen runden (Welteinheiten): Ecken werden weich, Spitzen nur wenig stumpfer; 0 = Spitzen ganz spitz */
  glatt = 5;
  /** zur Fehlersuche: Teile bunt und durchscheinend zeichnen */
  bunt = false;

  constructor(grund: HTMLCanvasElement, figurEbene: HTMLCanvasElement, oben: HTMLCanvasElement) {
    this.grund = grund;
    this.ctx = grund.getContext('2d')!;
    this.oben = oben;
    this.obenCtx = oben.getContext('2d')!;
    try {
      this.fluessig = new Fluessig(figurEbene);
    } catch {
      this.fluessig = null;
      figurEbene.style.display = 'none';
    }
    new ResizeObserver(() => this.groesse()).observe(grund);
    this.groesse();
  }

  get fluessigAn(): boolean {
    return !!this.fluessig && this.glaette > 0;
  }

  groesse(): void {
    const r = this.grund.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.breite = Math.max(1, r.width);
    this.hoehe = Math.max(1, r.height);
    const w = Math.round(this.breite * this.dpr);
    const h = Math.round(this.hoehe * this.dpr);
    for (const c of [this.grund, this.oben]) {
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
    }
    this.fluessig?.groesse(w, h);
  }

  /** Ebene für Schrift über der Figur (Wuff!, Zzz, Meldungen): oben, oder der Grund, wenn die Figur dort liegt */
  get schriftCtx(): CanvasRenderingContext2D {
    return this.inGrund || !this.fluessigAn || this.bunt ? this.ctx : this.obenCtx;
  }

  /** Kamera so setzen, dass der Weltrahmen [x0, y0, x1, y1] mit Rand hineinpasst */
  einpassen(x0: number, y0: number, x1: number, y1: number, rand = 0.08, oben = 0): void {
    const w = x1 - x0;
    const h = y1 - y0;
    const verfuegbarH = this.hoehe - oben;
    const m = Math.min(this.breite / (w * (1 + 2 * rand)), verfuegbarH / (h * (1 + 2 * rand)));
    this.kamera.massstab = m;
    this.kamera.x = (x0 + x1) / 2;
    this.kamera.y = (y0 + y1) / 2 - oben / 2 / m;
  }

  private transform(c: CanvasRenderingContext2D): void {
    const { x, y, massstab } = this.kamera;
    const s = massstab * this.dpr;
    c.setTransform(s, 0, 0, s, (this.breite / 2 - x * massstab) * this.dpr, (this.hoehe / 2 - y * massstab) * this.dpr);
  }

  anfangen(): void {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = this.hintergrund;
    c.fillRect(0, 0, this.grund.width, this.grund.height);
    this.obenCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.obenCtx.clearRect(0, 0, this.oben.width, this.oben.height);
    this.fluessig?.leeren();
    this.welt();
  }

  /** Transform für Weltkoordinaten auf allen Ebenen */
  welt(): void {
    this.transform(this.ctx);
    this.transform(this.obenCtx);
  }

  /** Transform für Bildschirmkoordinaten (CSS-Pixel) */
  bildschirm(c: CanvasRenderingContext2D = this.ctx): void {
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** Eine Figur zeichnen. Flüssig: die schwarzen Teile hinter dem Gesicht als eine Maske verschmelzen (Kehlen zwischen den
   *  Teilen, Spitzen bleiben spitz), dann Gesicht, Fenster, Loch und Nase scharf darüber. Gilt die aktuelle Transformation von ctx
   *  (auch auf der Ebene der Figur). */
  figur(teile: Zeichenteil[]): void {
    if (this.bunt) {
      // zur Fehlersuche: jedes Teil in eigener Farbe, durchscheinend, mit Umriss
      const c = this.ctx;
      const farbe: Record<string, string> = {
        kopf: '#333',
        gesicht: '#f4c',
        ohrH: '#29f',
        ohrV: '#0b8',
        schopf: '#f80',
        nase: '#a00',
        rumpf: '#666',
        kehle: '#c60',
        beinVN: '#06c',
        beinHN: '#90c',
        beinVF: '#6af',
        beinHF: '#c8f',
        schwanz: '#8a0',
      };
      for (const t of teile) {
        c.beginPath();
        pfadAus(t, c);
        c.globalAlpha = 0.45;
        c.fillStyle = farbe[t.name] ?? (t.farbe === 'weiss' ? '#ddd' : '#777');
        c.fill();
        c.globalAlpha = 1;
        c.lineWidth = 1.2 / this.kamera.massstab;
        c.strokeStyle = farbe[t.name] ?? '#000';
        c.stroke();
      }
      return;
    }
    if (!this.fluessigAn) {
      zeichneTeile(this.ctx, teile, this.farben);
      return;
    }
    const fl = this.fluessig!;
    const massstab = this.kamera.massstab * this.dpr;
    fl.figur(
      teile,
      this.ctx.getTransform(),
      { sigma: this.glaette * massstab, sigmaGlatt: this.glatt * massstab, schwelle: 0.5, schwarz: this.farben.schwarz, weiss: this.farben.weiss },
      // in der Maske: alle schwarzen Teile außer dem Kinnhaken
      (t) => t.farbe === 'schwarz' && !t.scharf,
      // vorn: Gesicht, Fenster, Loch, Nase (verschmilzt zusätzlich mit dem Haar) und der Kinnhaken
      (t) => t.farbe === 'weiss' || t.name === 'nase' || !!t.scharf,
    );
    if (this.inGrund) {
      const c = this.ctx;
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(fl.leinwand, 0, 0);
      c.restore();
      fl.leeren();
    }
  }

  /** (früher die zweite Ebene; jetzt wird jede Figur sofort fertig gezeichnet) */
  abschliessen(): void {}

  /** Welt → Bildschirm (CSS-Pixel) */
  zuBildschirm(x: number, y: number): [number, number] {
    const { massstab } = this.kamera;
    return [this.breite / 2 + (x - this.kamera.x) * massstab, this.hoehe / 2 + (y - this.kamera.y) * massstab];
  }
}
