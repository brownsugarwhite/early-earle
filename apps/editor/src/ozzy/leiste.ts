/**
 * Ozzy: die Werkzeugleiste (Florian, 16.11.: „eine kleine dezente horizontale Werkzeugleiste mit dem Werkzeug P, einem Freihandstift,
 * einem Ellipsentool als Ausklappmenü mit weiteren Formen (erstmal nur Würfel), Mülleimer“).
 *
 * liquid drop: Die Leiste ist eine Haarlinie mit Zeichen aus Haarlinien. Unter dem gewählten Werkzeug hängt ein Tropfen; beim Wechsel
 * fließt er mit einer Feder hinüber und dehnt sich dabei in Richtung der Bewegung. Die Formen klappen als kleiner Tropfen auf. Zu Beginn
 * steht die Leiste unter dem Gruß in der Mitte, sobald gezeichnet wird, gleitet sie an den oberen Rand.
 */

import type { Werkzeug } from './blatt';

const SVG = 'http://www.w3.org/2000/svg';

const ZEICHEN: Record<'p' | 'frei' | 'ellipse' | 'wuerfel' | 'muell', string> = {
  // Feder des Zeichenstifts
  p: '<path d="M10 2.6l4.4 6.8-2.3 5.4H7.9L5.6 9.4z" /><path d="M10 2.6v6.1" /><circle cx="10" cy="9.6" r="1.15" class="voll" /><path d="M7.7 17.3h4.6" />',
  // Bleistift
  frei: '<path d="M3.8 16.2l1-3.9 8.8-8.8 2.9 2.9-8.8 8.8z" /><path d="M11.9 5.2l2.9 2.9" /><path d="M3.8 16.2l1-3.9 2.9 2.9z" class="voll" />',
  ellipse: '<ellipse cx="10" cy="10" rx="6.6" ry="4.9" />',
  // Würfel als Haarlinien: vorn ein Quadrat, hinten versetzt
  wuerfel: '<path d="M4.2 7.4h8.4v8.4H4.2z" /><path d="M4.2 7.4l3.2-3.2h8.4v8.4l-3.2 3.2" /><path d="M12.6 7.4l3.2-3.2" />',
  muell: '<path d="M5 5.2h10M8.1 5.2V3.8h3.8v1.4M6.3 7.1l.75 9.4h5.9l.75-9.4" /><path d="M8.6 9v5.4M11.4 9v5.4" class="duenn" />',
};

const NAMEN: Record<Werkzeug | 'muell', string> = {
  p: 'Zeichenstift (P): Klick Ecke, Ziehen rund, am ersten Punkt schließen',
  frei: 'Freihand (N): zeichnen, der Strich wird ein Pfad mit wenigen Punkten',
  ellipse: 'Ellipse (E): ziehen, ⇧ Kreis, ⌥ aus der Mitte',
  wuerfel: 'Würfel (E): ziehen, ⇧ gleichseitig, ⌥ aus der Mitte',
  auswahl: 'Auswahl (V, Esc)',
  muell: 'Mülleimer: verwerfen (⌘Z holt es zurück)',
};

function zeichen(art: keyof typeof ZEICHEN): SVGSVGElement {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 20 20');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ZEICHEN[art];
  return s;
}

/** Feder für eine Zahl (kritisch gedämpft bis leicht überschwingend) */
class Feder {
  x = 0;
  v = 0;
  constructor(
    public ziel: number,
    private hz = 6.5,
    private daempfung = 0.62,
  ) {
    this.x = ziel;
  }
  schritt(dt: number): boolean {
    const w = 2 * Math.PI * this.hz;
    const a = -w * w * (this.x - this.ziel) - 2 * this.daempfung * w * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
    if (Math.abs(this.x - this.ziel) < 0.05 && Math.abs(this.v) < 0.5) {
      this.x = this.ziel;
      this.v = 0;
      return false;
    }
    return true;
  }
}

export class Leiste {
  readonly el: HTMLElement;
  private knoepfe = new Map<Werkzeug | 'formen' | 'muell', HTMLButtonElement>();
  private tropfen: HTMLDivElement;
  private klapp: HTMLDivElement;
  private formenZeichen: HTMLSpanElement;
  private form: 'ellipse' | 'wuerfel' = 'ellipse';
  private aktiv: Werkzeug = 'p';
  private fx = new Feder(0);
  private laeuft = false;
  private letzte = 0;

  constructor(
    eltern: HTMLElement,
    private wahl: (w: Werkzeug) => void,
    private muell: () => void,
  ) {
    const el = document.createElement('nav');
    el.id = 'leiste';
    el.setAttribute('aria-label', 'Werkzeuge');
    this.el = el;
    const knopf = (name: Werkzeug | 'formen' | 'muell', art: keyof typeof ZEICHEN, titel: string): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'werkzeug';
      b.title = titel;
      b.setAttribute('aria-label', titel);
      b.append(zeichen(art));
      this.knoepfe.set(name, b);
      el.append(b);
      return b;
    };
    knopf('p', 'p', NAMEN.p).addEventListener('click', () => this.waehlen('p'));
    knopf('frei', 'frei', NAMEN.frei).addEventListener('click', () => this.waehlen('frei'));
    const formen = knopf('formen', 'ellipse', NAMEN.ellipse);
    this.formenZeichen = document.createElement('span');
    this.formenZeichen.className = 'klapp-pfeil';
    this.formenZeichen.innerHTML = '<svg viewBox="0 0 8 8" aria-hidden="true"><path d="M1.6 3l2.4 2.4L6.4 3" /></svg>';
    formen.append(this.formenZeichen);
    formen.addEventListener('click', (e) => {
      const r = formen.getBoundingClientRect();
      // Klick auf den kleinen Pfeil oder ein zweiter Klick auf das gewählte Werkzeug: aufklappen
      const aufPfeil = e.clientX > r.right - 11;
      if (aufPfeil || this.aktiv === this.form) this.klappen(this.klapp.hidden);
      else this.waehlen(this.form);
    });
    const trenner = document.createElement('span');
    trenner.className = 'trenner';
    el.append(trenner);
    knopf('muell', 'muell', NAMEN.muell).addEventListener('click', () => this.muell());

    // Aufklappen der Formen: ein kleiner Tropfen unter dem Knopf
    this.klapp = document.createElement('div');
    this.klapp.className = 'klapp';
    this.klapp.hidden = true;
    for (const f of ['ellipse', 'wuerfel'] as const) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'werkzeug';
      b.title = NAMEN[f];
      b.setAttribute('aria-label', NAMEN[f]);
      b.append(zeichen(f));
      b.addEventListener('click', () => {
        this.form = f;
        formen.replaceChildren(zeichen(f), this.formenZeichen);
        formen.title = NAMEN[f];
        this.klappen(false);
        this.waehlen(f);
      });
      this.klapp.append(b);
    }
    el.append(this.klapp);

    this.tropfen = document.createElement('div');
    this.tropfen.className = 'leisten-tropfen';
    el.append(this.tropfen);
    eltern.append(el);
    document.addEventListener('pointerdown', (e) => {
      if (!this.klapp.hidden && !this.el.contains(e.target as Node)) this.klappen(false);
    });
    requestAnimationFrame(() => this.setzen(this.aktiv, true));
  }

  private klappen(auf: boolean): void {
    this.klapp.hidden = !auf;
    this.el.classList.toggle('klapp-auf', auf);
  }

  private waehlen(w: Werkzeug): void {
    this.setzen(w);
    this.wahl(w);
  }

  /** das gewählte Werkzeug zeigen (von außen, z. B. über Tasten); `sofort`: ohne Fließen */
  setzen(w: Werkzeug, sofort = false): void {
    this.aktiv = w;
    if (w === 'ellipse' || w === 'wuerfel') {
      this.form = w;
      const formen = this.knoepfe.get('formen')!;
      formen.replaceChildren(zeichen(w), this.formenZeichen);
      formen.title = NAMEN[w];
    }
    const name = w === 'ellipse' || w === 'wuerfel' ? 'formen' : w;
    for (const [n, b] of this.knoepfe) b.setAttribute('aria-pressed', String(n === name));
    const b = this.knoepfe.get(name);
    this.tropfen.style.opacity = b ? '1' : '0';
    if (!b) return;
    const r = b.getBoundingClientRect();
    const r0 = this.el.getBoundingClientRect();
    this.fx.ziel = r.left - r0.left + r.width / 2;
    if (sofort) {
      this.fx.x = this.fx.ziel;
      this.fx.v = 0;
    }
    this.anstossen();
  }

  /** die Zeichenwerkzeuge an oder aus (im Raum wirken sie erst mit dem Werk) */
  zeichnenErlaubt(an: boolean): void {
    for (const n of ['p', 'frei', 'formen'] as const) this.knoepfe.get(n)!.toggleAttribute('disabled', !an);
  }

  /** ein Werkzeug an oder aus (im Raum: P, sobald das Werk die Form zeigt) */
  erlauben(n: 'p' | 'frei' | 'formen', an: boolean): void {
    this.knoepfe.get(n)!.toggleAttribute('disabled', !an);
  }

  /** Lage der Leiste: unter dem Gruß in der Mitte oder oben */
  lage(oben: boolean): void {
    this.el.classList.toggle('oben', oben);
  }

  private anstossen(): void {
    if (this.laeuft) return;
    this.laeuft = true;
    this.letzte = performance.now();
    requestAnimationFrame((t) => this.schritt(t));
  }

  private schritt(t: number): void {
    const dt = Math.min(1 / 30, Math.max(0, (t - this.letzte) / 1000));
    this.letzte = t;
    const weiter = this.fx.schritt(dt);
    // der Tropfen dehnt sich in Richtung der Bewegung und wird dabei schmaler (sein Inhalt bleibt)
    const dehnung = Math.min(2.6, 1 + Math.abs(this.fx.v) / 260);
    this.tropfen.style.transform = `translateX(${this.fx.x.toFixed(2)}px) translateX(-50%) scale(${dehnung.toFixed(3)}, ${(1 / Math.sqrt(dehnung)).toFixed(3)})`;
    if (weiter) requestAnimationFrame((tt) => this.schritt(tt));
    else this.laeuft = false;
  }
}
