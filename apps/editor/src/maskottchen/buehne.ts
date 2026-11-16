// Bühne: drei Ebenen übereinander. Grund (2D: Papier, Level, Bodenlinie), Figur (WebGL: flüssig geglättet, oder direkt auf dem
// Grund), Oben (2D: Sprechblasen, Staub, Zzz). Kamera: Welt in Logo-Koordinaten → Bildschirm.
import type { Zeichenteil } from './figur';
import { Fluessig } from './fluessig';
import { type Farben, zeichneTeile } from './zeichnen';

export class Buehne {
  readonly grund: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly oben: HTMLCanvasElement;
  readonly obenCtx: CanvasRenderingContext2D;
  private quelle = document.createElement('canvas');
  private quelleCtx = this.quelle.getContext('2d')!;
  private fluessig: Fluessig | null = null;
  breite = 1;
  hoehe = 1;
  dpr = 1;
  /** Kamera: Weltpunkt in der Mitte, Maßstab (Bildpunkte je Welteinheit) */
  kamera = { x: 900, y: 820, massstab: 0.3 };
  farben: Farben = { schwarz: '#1f1a17', weiss: '#ffffff' };
  hintergrund = '#ffffff';
  /** Glätte der flüssigen Stufe in Welteinheiten (Logo-Bildpunkten); 0 = aus */
  glaette = 7;
  private figurGezeichnet = false;

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
    for (const c of [this.grund, this.oben, this.quelle]) {
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
    }
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
    this.quelleCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.quelleCtx.clearRect(0, 0, this.quelle.width, this.quelle.height);
    this.figurGezeichnet = false;
    this.welt();
  }

  /** Transform für Weltkoordinaten auf allen Ebenen */
  welt(): void {
    this.transform(this.ctx);
    this.transform(this.obenCtx);
    this.transform(this.quelleCtx);
  }

  /** Transform für Bildschirmkoordinaten (CSS-Pixel) */
  bildschirm(c: CanvasRenderingContext2D = this.ctx): void {
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  figur(teile: Zeichenteil[]): void {
    if (this.fluessigAn) {
      zeichneTeile(this.quelleCtx, teile, { schwarz: '#000000', weiss: '#ffffff' });
      this.figurGezeichnet = true;
    } else zeichneTeile(this.ctx, teile, this.farben);
  }

  /** nach allen Figuren: die flüssige Stufe rechnen (oder die Figurenebene leeren) */
  abschliessen(): void {
    if (!this.fluessig) return;
    const sichtbar = this.fluessigAn && this.figurGezeichnet;
    this.fluessig.leinwand.style.visibility = sichtbar ? 'visible' : 'hidden';
    if (!sichtbar) return;
    const sigma = this.glaette * this.kamera.massstab * this.dpr;
    this.fluessig.zeichnen(this.quelle, sigma, this.farben.schwarz, this.farben.weiss);
  }

  /** Welt → Bildschirm (CSS-Pixel) */
  zuBildschirm(x: number, y: number): [number, number] {
    const { massstab } = this.kamera;
    return [this.breite / 2 + (x - this.kamera.x) * massstab, this.hoehe / 2 + (y - this.kamera.y) * massstab];
  }
}
