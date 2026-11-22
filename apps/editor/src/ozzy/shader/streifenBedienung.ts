/**
 * Bedienung der Streifen (22.11.2026, `streifen.ts`): eine Ebene über allem. Finger, Stift und Maus ziehen die Streifen mit
 * Schwung, das Trackpad wischt mit zwei Fingern (mit ⌃ oder Zusammenziehen: Breite), zwei Finger auf dem Glas ändern die Breite,
 * Tippen holt einen Streifen in die Mitte. Tasten: ← → einen Streifen weiter, ↑ ↓ Breite, Leertaste laufen lassen, Esc zurück.
 * Unten in jedem Streifen sein Name.
 */
import type { ShaderStreifen } from './streifen';

/** so schnell laufen die Streifen von selbst (Streifen je Sekunde) */
const LAUF = 0.55;
/** Abklingzeit des Schwungs (s) */
const SCHWUNG_TAU = 0.42;
/** ab hier (CSS-Punkte je Sekunde) warten die bewegten Shader */
const SCHNELL = 900;

export class StreifenBedienung {
  readonly el: HTMLDivElement;
  private readonly namenEl: HTMLDivElement;
  private readonly namen: { el: HTMLDivElement; name: HTMLSpanElement; gruppe: HTMLSpanElement; id: string }[] = [];
  private readonly fortschritt: HTMLDivElement;
  private readonly hinweis: HTMLDivElement;
  private readonly s: ShaderStreifen;
  private readonly anstossen: () => void;
  /** Esc, × oder ⇧Y */
  beenden: () => void = () => {};
  private readonly zeiger = new Map<number, { x: number; y: number }>();
  private zug: { x: number; x0: number; y0: number; t0: number; proben: { x: number; t: number }[]; weit: boolean } | null = null;
  private zange: { abstand: number; breite: number } | null = null;
  /** Schwung nach dem Loslassen (CSS-Punkte je Sekunde, positiv: die Streifen wandern nach rechts) */
  private schwung = 0;
  private ziel: number | null = null;
  private radBis = 0;
  private laufen = false;
  private letzterVersatz = 0;
  private hinweisUhr = 0;
  private readonly tasten: (e: KeyboardEvent) => void;
  private readonly tastenHoch: (e: KeyboardEvent) => void;

  constructor(s: ShaderStreifen, anstossen: () => void) {
    this.s = s;
    this.anstossen = anstossen;
    const el = document.createElement('div');
    el.id = 'streifen-ebene';
    el.hidden = true;
    this.namenEl = document.createElement('div');
    this.namenEl.className = 'streifen-namen';
    this.fortschritt = document.createElement('div');
    this.fortschritt.className = 'streifen-fortschritt';
    this.hinweis = document.createElement('div');
    this.hinweis.className = 'streifen-hinweis';
    const fein = matchMedia('(pointer: coarse)').matches;
    this.hinweis.textContent = fein
      ? 'Wischen · zwei Finger: Breite · Tippen holt einen Streifen in die Mitte'
      : 'Wischen oder ← → · ↑ ↓ Breite · Leertaste: laufen lassen · Klick holt einen Streifen in die Mitte · Esc zurück';
    const zu = document.createElement('button');
    zu.type = 'button';
    zu.className = 'streifen-zu';
    zu.title = 'Zurück zu Ozzy (Esc)';
    zu.setAttribute('aria-label', 'Zurück zu Ozzy');
    zu.textContent = '×';
    zu.addEventListener('pointerdown', (e) => e.stopPropagation());
    zu.addEventListener('click', () => this.beenden());
    el.append(this.namenEl, this.fortschritt, this.hinweis, zu);
    document.body.append(el);
    this.el = el;

    el.addEventListener('pointerdown', (e) => this.runter(e));
    el.addEventListener('pointermove', (e) => this.ziehen(e));
    el.addEventListener('pointerup', (e) => this.hoch(e));
    el.addEventListener('pointercancel', (e) => this.hoch(e));
    el.addEventListener('wheel', (e) => this.rad(e), { passive: false });
    // (Safari: Zusammenziehen auf dem Trackpad kommt als Geste, nicht als Rad mit ⌃)
    el.addEventListener('gesturestart', (e) => e.preventDefault());
    el.addEventListener('gesturechange', (e) => e.preventDefault());
    this.tasten = (e) => this.taste(e);
    this.tastenHoch = (e) => {
      if (!this.el.hidden) e.stopPropagation();
    };
  }

  an(): void {
    this.el.hidden = false;
    this.zeiger.clear();
    this.zug = null;
    this.zange = null;
    this.schwung = 0;
    this.ziel = null;
    this.laufen = false;
    this.letzterVersatz = this.s.versatz;
    this.hinweis.classList.remove('weg');
    clearTimeout(this.hinweisUhr);
    this.hinweisUhr = window.setTimeout(() => this.hinweis.classList.add('weg'), 7000);
    window.addEventListener('keydown', this.tasten, { capture: true });
    window.addEventListener('keyup', this.tastenHoch, { capture: true });
  }

  aus(): void {
    this.el.hidden = true;
    window.removeEventListener('keydown', this.tasten, { capture: true });
    window.removeEventListener('keyup', this.tastenHoch, { capture: true });
  }

  // ---------- Eingaben ----------

  private runter(e: PointerEvent): void {
    e.preventDefault();
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      // (ein Zeiger, den der Browser nicht kennt: ohne Fangen weiter)
    }
    this.zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.schwung = 0;
    this.ziel = null;
    this.laufen = false;
    if (this.zeiger.size === 1) {
      const t = performance.now();
      this.zug = { x: e.clientX, x0: e.clientX, y0: e.clientY, t0: t, proben: [{ x: e.clientX, t }], weit: false };
    } else if (this.zeiger.size === 2) {
      const [a, b] = [...this.zeiger.values()];
      this.zange = { abstand: Math.max(20, Math.hypot(a!.x - b!.x, a!.y - b!.y)), breite: this.s.breite };
      this.zug = null;
    }
    this.anstossen();
  }

  private ziehen(e: PointerEvent): void {
    const z = this.zeiger.get(e.pointerId);
    if (!z) return;
    z.x = e.clientX;
    z.y = e.clientY;
    if (this.zange && this.zeiger.size >= 2) {
      const [a, b] = [...this.zeiger.values()];
      const d = Math.max(20, Math.hypot(a!.x - b!.x, a!.y - b!.y));
      this.s.breiteSetzen((this.zange.breite * d) / this.zange.abstand, (a!.x + b!.x) / 2);
      this.anstossen();
      return;
    }
    const g = this.zug;
    if (!g) return;
    const t = performance.now();
    this.s.versatz -= e.clientX - g.x;
    g.x = e.clientX;
    if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > 6) g.weit = true;
    g.proben.push({ x: e.clientX, t });
    while (g.proben.length > 2 && t - g.proben[0]!.t > 90) g.proben.shift();
    this.anstossen();
  }

  private hoch(e: PointerEvent): void {
    if (!this.zeiger.has(e.pointerId)) return;
    this.zeiger.delete(e.pointerId);
    if (this.zange) {
      if (this.zeiger.size < 2) this.zange = null;
      this.zug = null;
      this.anstossen();
      return;
    }
    const g = this.zug;
    this.zug = null;
    if (!g) return;
    const t = performance.now();
    if (!g.weit && t - g.t0 < 350) {
      // Tippen: diesen Streifen in die Mitte holen
      this.ziel = this.s.versatzFuer(this.s.kBei(e.clientX, e.clientY));
    } else {
      const p = g.proben.filter((q) => t - q.t < 110);
      if (p.length >= 2) {
        const v = ((p[p.length - 1]!.x - p[0]!.x) / Math.max(8, p[p.length - 1]!.t - p[0]!.t)) * 1000;
        this.schwung = Math.abs(v) > 60 ? Math.max(-9000, Math.min(9000, v)) : 0;
      }
    }
    this.anstossen();
  }

  private rad(e: WheelEvent): void {
    e.preventDefault();
    const zeile = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.s.W : 1;
    if (e.ctrlKey) {
      // Zusammenziehen auf dem Trackpad (oder ⌃ + Rad): Breite der Streifen
      this.s.breiteSetzen(this.s.breite * Math.exp(-e.deltaY * zeile * 0.01), e.clientX);
    } else {
      const d = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      this.s.versatz += d * zeile;
      this.radBis = performance.now() + 140;
    }
    this.schwung = 0;
    this.ziel = null;
    this.laufen = false;
    this.anstossen();
  }

  private taste(e: KeyboardEvent): void {
    if (this.el.hidden) return;
    // Ozzys Tasten gelten hier nicht (⌘-Kürzel des Browsers bleiben)
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey) return;
    const s = this.s;
    const k = e.key;
    let genutzt = true;
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      const basis = this.ziel ?? s.versatz;
      const mitte = Math.round((basis + s.W / 2) / s.breite - 0.5);
      this.ziel = s.versatzFuer(mitte + (k === 'ArrowRight' ? 1 : -1));
      this.schwung = 0;
      this.laufen = false;
    } else if (k === 'ArrowUp') s.breiteSetzen(s.breite * 1.25);
    else if (k === 'ArrowDown') s.breiteSetzen(s.breite / 1.25);
    else if (k === ' ') {
      this.laufen = !this.laufen;
      this.ziel = null;
      this.schwung = 0;
    } else if (k === 'Escape' || k === 'Y') this.beenden();
    else genutzt = false;
    if (genutzt) {
      e.preventDefault();
      this.anstossen();
    }
  }

  // ---------- je Bild ----------

  /** Schwung, Ziel und Laufen; true: Es bewegt sich noch */
  schritt(dt: number): boolean {
    const s = this.s;
    let bewegt = false;
    if (this.laufen) {
      s.versatz += LAUF * s.breite * dt;
      bewegt = true;
    }
    if (this.ziel !== null) {
      const d = this.ziel - s.versatz;
      if (Math.abs(d) < 0.3) {
        s.versatz = this.ziel;
        this.ziel = null;
      } else {
        s.versatz += d * (1 - Math.exp(-dt / 0.085));
        bewegt = true;
      }
    } else if (!this.zug && Math.abs(this.schwung) > 4) {
      s.versatz -= this.schwung * dt;
      this.schwung *= Math.exp(-dt / SCHWUNG_TAU);
      bewegt = true;
    } else if (!this.zug) this.schwung = 0;
    const weg = s.versatz - this.letzterVersatz;
    this.letzterVersatz = s.versatz;
    if (Math.abs(weg) > 0.01) s.richtung = weg > 0 ? 1 : -1;
    s.schnell = Math.abs(weg) / Math.max(dt, 1 / 240) > SCHNELL;
    return bewegt || performance.now() < this.radBis || !!this.zug || !!this.zange;
  }

  /** Namen unter die Streifen, Stand des Übersetzens */
  zeigen(): void {
    const s = this.s;
    const y = s.H - 30;
    const lage = s.lage(y);
    while (this.namen.length < lage.length) {
      const el = document.createElement('div');
      el.className = 'streifen-name';
      const name = document.createElement('span');
      name.className = 'name';
      const gruppe = document.createElement('span');
      gruppe.className = 'gruppe';
      el.append(name, gruppe);
      this.namenEl.append(el);
      this.namen.push({ el, name, gruppe, id: '' });
    }
    const schmal = s.breite < 150;
    for (let i = 0; i < this.namen.length; i++) {
      const n = this.namen[i]!;
      const l = lage[i];
      if (!l || l.x < -120 || l.x > s.W + 120) {
        n.el.style.display = 'none';
        continue;
      }
      n.el.style.display = '';
      if (n.id !== l.v.id) {
        n.id = l.v.id;
        n.name.textContent = l.v.name;
        n.gruppe.textContent = l.v.gruppe;
        n.el.title = l.v.zeile;
      }
      n.el.classList.toggle('schmal', schmal);
      n.el.classList.toggle('laedt', !l.bereit);
      n.el.style.transform = `translate3d(${l.x.toFixed(1)}px, ${y}px, 0) translate(-50%, -50%)`;
    }
    const zahl = s.uebersetztZahl;
    const alle = s.liste.length;
    this.fortschritt.hidden = zahl >= alle;
    if (zahl < alle) this.fortschritt.textContent = `Shader übersetzen · ${zahl} von ${alle}`;
  }
}
