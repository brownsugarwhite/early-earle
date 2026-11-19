/**
 * Ozzy, Paint-Modus, Etappe 3 (19.11.2026): die Farben als kleine Tropfen, die unter der Leiste hängen. Der gewählte hängt tiefer
 * und ist größer.
 *
 * - Tippen wählt eine Farbe. Den gewählten Tropfen noch einmal tippen: seine Farbe ändern (der Farbwähler des Systems).
 * - Ziehen nimmt den Tropfen aus der Leiste: Über der Form losgelassen, fällt er und füllt dort (wie Farbe ziehen in Procreate);
 *   auf dem Mülleimer losgelassen, ist die Farbe verworfen; sonst kehrt er zurück.
 * - Der hohle Tropfen mit dem Plus legt eine neue Farbe an.
 *
 * Die Farben bleiben über das Neuladen (`localStorage`). Was beim Wählen, Ziehen und Fallen geschieht, bestimmt Ozzy (`FarbZiele`).
 */
import type { Farbe } from './bemalung';

const SVG = 'http://www.w3.org/2000/svg';
/** die Form des Tropfens: dieselbe wie das Zeichen „Farbtropfen“ in der Leiste und der Tropfen am Zeiger (`ozzy.html`) */
const TROPFEN = '<path d="M10 3.3C12.7 6.9 14.5 9.2 14.5 11.8a4.5 4.5 0 0 1-9 0C5.5 9.2 7.3 6.9 10 3.3z" />';
function tropfen(mehr = ''): SVGSVGElement {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '5 2.8 10 14');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = TROPFEN + mehr;
  return s;
}

const SPEICHER = 'ozzy.farben';
/** die Farben am Anfang (Florian stellt seine eigenen ein): hell, Gelb, Orange, Rot, Magenta, Blau, Grün, fast Schwarz */
const GRUND = ['#fbf6ea', '#f6c445', '#f08a3c', '#e4503a', '#d6438a', '#3f7fd0', '#3c9d7a', '#1f1a17'];
const GRUND_WAHL = 1;
/** so viele Farben stehen höchstens in der Leiste (jede weitere ersetzt die gewählte) */
const HOECHSTENS = 14;
/** ab diesem Weg (CSS-Pixel) ist ein Druck auf einen Tropfen ein Ziehen */
const ZUG_AB = 5;

export const alsHex = (f: Farbe): string =>
  '#' +
  f
    .map((c) =>
      Math.round(255 * Math.min(1, Math.max(0, c)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
export const ausHex = (h: string): Farbe => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const istHex = (h: unknown): h is string => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);

export type FarbZiele = {
  /** die gewählte Farbe ist eine andere (gewählt, geändert, aufgenommen) */
  gewaehlt(farbe: Farbe): void;
  /** ein Tropfen wird aus der Leiste gezogen: wo er gerade ist (CSS-Pixel); null: Er ist losgelassen */
  zug(z: { farbe: Farbe; x: number; y: number } | null): void;
  /** ein gezogener Tropfen ist hier losgelassen worden; wahr: Er ist auf die Form gefallen und füllt dort */
  fallen(x: number, y: number, farbe: Farbe): boolean;
  /** liegt an dieser Stelle der Mülleimer? */
  muell(x: number, y: number): boolean;
};

export class FarbLeiste {
  readonly el: HTMLElement;
  private farben: string[] = [...GRUND];
  private nr = GRUND_WAHL;
  private reihe: HTMLSpanElement;
  private plus: HTMLButtonElement;
  private eingabe: HTMLInputElement;
  /** welcher Tropfen im Farbwähler steht (`neu`: Der erste Wert legt einen neuen an) */
  private imWaehler: number | 'neu' = GRUND_WAHL;
  private druck: { i: number; id: number; x: number; y: number; zieht: boolean } | null = null;

  /** `eingabe`: das Farbfeld der Seite (`#farbe-farbe`); es bleibt unsichtbar in der Leiste und öffnet den Farbwähler des Systems */
  constructor(
    eltern: HTMLElement,
    eingabe: HTMLInputElement,
    private ziele: FarbZiele,
  ) {
    const el = document.createElement('nav');
    el.id = 'farbleiste';
    el.hidden = true;
    el.setAttribute('aria-label', 'Farben');
    this.el = el;
    this.reihe = document.createElement('span');
    this.reihe.className = 'reihe';
    this.plus = document.createElement('button');
    this.plus.type = 'button';
    this.plus.className = 'farbe neu';
    this.plus.title = 'Neue Farbe';
    this.plus.setAttribute('aria-label', 'Neue Farbe');
    this.plus.append(tropfen('<path d="M10 9.6v4.4M7.8 11.8h4.4" class="plus" />'));
    this.plus.addEventListener('click', () => this.waehlerOeffnen('neu', this.plus));
    this.eingabe = eingabe;
    eingabe.hidden = false;
    eingabe.tabIndex = -1;
    el.append(this.reihe, this.plus, eingabe);
    eltern.append(el);
    this.laden();
    this.bauen();
    eingabe.value = this.farben[this.nr]!;
    eingabe.addEventListener('input', () => this.ausWaehler(eingabe.value, false));
    eingabe.addEventListener('change', () => this.ausWaehler(eingabe.value, true));
    // (der Farbwähler schließt ohne Wert: Das nächste Mal gilt wieder der gewählte Tropfen)
    eingabe.addEventListener('cancel', () => (this.imWaehler = this.nr));
    // ohne Fokus auf dem Tropfen (sonst löste die Leertaste ihn danach noch einmal aus)
    el.addEventListener('pointerdown', (e) => {
      if (e.target !== eingabe) e.preventDefault();
    });
    this.reihe.addEventListener('pointerdown', (e) => this.druecken(e));
    this.reihe.addEventListener('pointermove', (e) => this.bewegen(e));
    this.reihe.addEventListener('pointerup', (e) => this.loslassen(e, true));
    this.reihe.addEventListener('pointercancel', (e) => this.loslassen(e, false));
  }

  /** die gewählte Farbe */
  get farbe(): Farbe {
    return ausHex(this.farben[this.nr]!);
  }

  /** für Proben: die Farben der Leiste und welche gewählt ist */
  get stand(): { farben: string[]; wahl: number } {
    return { farben: [...this.farben], wahl: this.nr };
  }

  /** zu sehen, solange gemalt wird (je Bild gerufen) */
  zeigen(an: boolean): void {
    if (this.el.hidden === !an) return;
    this.el.hidden = !an;
    if (!an && this.druck) this.zugEnde();
  }

  /** eine Farbe wählen (ihre Nummer in der Leiste) */
  waehlen(i: number): void {
    if (i < 0 || i >= this.farben.length) return;
    this.nr = i;
    this.imWaehler = i;
    this.eingabe.value = this.farben[i]!;
    this.zeichnen();
    this.sichern();
    this.ziele.gewaehlt(this.farbe);
  }

  /** Pipette: Diese Farbe wird die gewählte. Steht sie schon in der Leiste, wird ihr Tropfen gewählt, sonst kommt sie als neuer dazu */
  aufnehmen(f: Farbe): void {
    const h = alsHex(f);
    const da = this.farben.indexOf(h);
    if (da >= 0) {
      this.waehlen(da);
      return;
    }
    this.dazu(h);
    this.sichern();
    this.ziele.gewaehlt(this.farbe);
  }

  /** ein neuer Tropfen in dieser Farbe, gleich gewählt (ist die Leiste voll, ersetzt er den gewählten) */
  private dazu(h: string): void {
    if (this.farben.length >= HOECHSTENS) this.farben[this.nr] = h;
    else {
      this.farben.push(h);
      this.nr = this.farben.length - 1;
    }
    this.imWaehler = this.nr;
    this.eingabe.value = h;
    this.bauen();
  }

  /** ein Wert aus dem Farbwähler (oder von einer Probe, die das Farbfeld setzt): Er gilt dem Tropfen im Wähler, sonst dem gewählten */
  private ausWaehler(h: string, fertig: boolean): void {
    if (!istHex(h)) return;
    if (this.imWaehler === 'neu') this.dazu(h.toLowerCase());
    else {
      const i = this.imWaehler;
      this.farben[i] = h.toLowerCase();
      this.nr = i;
      this.zeichnen();
    }
    if (fertig) {
      this.imWaehler = this.nr;
      this.sichern();
    }
    this.ziele.gewaehlt(this.farbe);
  }

  /** den Farbwähler des Systems öffnen, am Tropfen `bei` */
  private waehlerOeffnen(fuer: number | 'neu', bei: HTMLElement): void {
    this.imWaehler = fuer;
    const e = this.eingabe;
    e.value = fuer === 'neu' ? this.farben[this.nr]! : this.farben[fuer]!;
    e.style.left = `${bei.offsetLeft + bei.offsetWidth / 2}px`;
    try {
      if (typeof e.showPicker === 'function') e.showPicker();
      else e.click();
    } catch {
      e.click();
    }
  }

  private druecken(e: PointerEvent): void {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button.farbe');
    const i = b ? this.knoepfe().indexOf(b) : -1;
    if (i < 0 || this.druck) return;
    this.druck = { i, id: e.pointerId, x: e.clientX, y: e.clientY, zieht: false };
    this.reihe.setPointerCapture(e.pointerId);
  }

  private bewegen(e: PointerEvent): void {
    const d = this.druck;
    if (!d || e.pointerId !== d.id) return;
    if (!d.zieht && Math.hypot(e.clientX - d.x, e.clientY - d.y) >= ZUG_AB) {
      d.zieht = true;
      // (der Tropfen, den man zieht, ist die gewählte Farbe)
      if (d.i !== this.nr) this.waehlen(d.i);
      this.knoepfe()[d.i]?.classList.add('unterwegs');
    }
    if (d.zieht) this.ziele.zug({ farbe: ausHex(this.farben[d.i]!), x: e.clientX, y: e.clientY });
  }

  private loslassen(e: PointerEvent, gilt: boolean): void {
    const d = this.druck;
    if (!d || e.pointerId !== d.id) return;
    this.zugEnde();
    if (!gilt) return;
    if (!d.zieht) {
      // ein Tipp: wählen; am gewählten: seine Farbe ändern
      const b = this.knoepfe()[d.i];
      if (d.i === this.nr && b) this.waehlerOeffnen(d.i, b);
      else this.waehlen(d.i);
      return;
    }
    const farbe = ausHex(this.farben[d.i]!);
    if (this.ziele.fallen(e.clientX, e.clientY, farbe)) return;
    if (this.farben.length > 1 && this.ziele.muell(e.clientX, e.clientY)) {
      this.farben.splice(d.i, 1);
      this.nr = Math.min(this.nr, this.farben.length - 1);
      this.imWaehler = this.nr;
      this.eingabe.value = this.farben[this.nr]!;
      this.bauen();
      this.sichern();
      this.ziele.gewaehlt(this.farbe);
    }
  }

  private zugEnde(): void {
    const d = this.druck;
    this.druck = null;
    if (!d) return;
    if (this.reihe.hasPointerCapture(d.id)) this.reihe.releasePointerCapture(d.id);
    for (const b of this.knoepfe()) b.classList.remove('unterwegs');
    if (d.zieht) this.ziele.zug(null);
  }

  private knoepfe(): HTMLButtonElement[] {
    return [...this.reihe.querySelectorAll<HTMLButtonElement>('button.farbe')];
  }

  /** so viele Tropfen wie Farben (die vorhandenen bleiben stehen: Nur ein neuer wächst) */
  private bauen(): void {
    const da = this.knoepfe();
    for (let i = da.length; i < this.farben.length; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'farbe';
      b.append(tropfen());
      this.reihe.append(b);
    }
    for (let i = da.length - 1; i >= this.farben.length; i--) da[i]!.remove();
    this.zeichnen();
  }

  private zeichnen(): void {
    this.knoepfe().forEach((b, i) => {
      const h = this.farben[i]!;
      const gewaehlt = i === this.nr;
      b.style.setProperty('--farbe', h);
      b.setAttribute('aria-pressed', String(gewaehlt));
      const titel = gewaehlt ? `Farbe ${h} (gewählt) · noch einmal tippen: ändern · ziehen: auf die Form fallen lassen` : `Farbe ${h} · tippen: wählen · ziehen: auf die Form fallen lassen`;
      b.title = titel;
      b.setAttribute('aria-label', titel);
    });
    this.plus.hidden = this.farben.length >= HOECHSTENS;
  }

  private laden(): void {
    try {
      const d: unknown = JSON.parse(localStorage.getItem(SPEICHER) ?? 'null');
      if (!d || typeof d !== 'object') return;
      const { farben, wahl } = d as { farben?: unknown; wahl?: unknown };
      if (!Array.isArray(farben)) return;
      const gut = farben.filter(istHex).slice(0, HOECHSTENS);
      if (!gut.length) return;
      this.farben = gut.map((h) => h.toLowerCase());
      this.nr = typeof wahl === 'number' && wahl >= 0 && wahl < gut.length ? Math.floor(wahl) : 0;
      this.imWaehler = this.nr;
    } catch {
      // ohne Speicher gelten die Farben vom Anfang
    }
  }

  private sichern(): void {
    try {
      localStorage.setItem(SPEICHER, JSON.stringify({ farben: this.farben, wahl: this.nr }));
    } catch {
      // ohne Speicher gilt es nur bis zum Neuladen
    }
  }
}
