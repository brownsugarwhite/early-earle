/**
 * Ozzy, Paint-Modus, Etappe 5 (19.11.2026): die Ebenen als Stapel liegender Tropfen am rechten Rand. Oben liegt, was deckt.
 *
 * - Jede Ebene ist eine Linse in den Farben ihrer Füllungen (leer: weiß). Die Linse der Ebene, an der gemalt wird, ist größer und
 *   steht vor. Eine ausgeblendete ist hohl.
 * - Tippen auf eine Linse: An dieser Ebene wird gemalt.
 * - Der Punkt neben der Linse blendet die Ebene aus und ein.
 * - Ziehen ordnet: Die Linse geht mit, die anderen rücken; die Form zeigt gleich, was dann oben liegt. Aus dem Stapel heraus auf
 *   den Mülleimer gezogen: Die Ebene ist gelöscht (⌘Z holt sie zurück).
 * - Die hohle Linse mit dem Plus legt eine neue Ebene über die aktive.
 *
 * Was beim Wählen, Ordnen, Anlegen und Löschen geschieht, bestimmt Ozzy (`EbenenZiele`); der Stapel zeigt je Bild, was gilt.
 */
import type { Farbe } from './bemalung';
import type { EbeneZeile } from './farbwerk';

/** ab diesem Weg (CSS-Pixel) ist ein Druck auf eine Linse ein Ziehen */
const ZUG_AB = 5;
/** so weit zur Seite gezogen (CSS-Pixel), löst sich die Linse aus dem Stapel (dann ordnet sie nicht mehr: Sie kann auf den Mülleimer) */
const HERAUS_AB = 36;

const css = (f: Farbe): string => `rgb(${f.map((c) => Math.round(255 * c)).join(' ')})`;

export type EbenenZiele = {
  /** an dieser Ebene wird von jetzt an gemalt */
  waehlen(id: number): void;
  /** eine Ebene aus- oder einblenden */
  zeigen(id: number, an: boolean): void;
  /** eine neue Ebene über der aktiven */
  neu(): void;
  /** eine Ebene an einen anderen Platz legen (`platz`: von oben gezählt, 0 ganz oben); `erster`: der erste Tausch dieses Zugs */
  ordnen(id: number, platz: number, erster: boolean): void;
  /** ein Zug, der geordnet hat, ist zu Ende; `geblieben`: Die Ebene liegt jetzt woanders als vorher (sonst war es kein Schritt) */
  ordnenEnde(geblieben: boolean): void;
  /** eine Ebene mit allem, was auf ihr liegt, löschen */
  loeschen(id: number): void;
  /** liegt an dieser Stelle der Mülleimer? */
  muell(x: number, y: number): boolean;
  /** Etappe 6: die Ebenen-Ansicht auf- oder zuschieben (`andere`: mit ⇧ gedrückt: die andere Anordnung) */
  faecher(andere: boolean): void;
};

type Zeile = { li: HTMLLIElement; knopf: HTMLButtonElement; auge: HTMLButtonElement; linse: HTMLSpanElement };

export class EbenenStapel {
  readonly el: HTMLElement;
  private liste: HTMLOListElement;
  private plus: HTMLButtonElement;
  /** Etappe 6: der Knopf über dem Stapel, der die Form auffächert (je Ebene eine Kopie) */
  private faecher: HTMLButtonElement;
  private zeilen = new Map<number, Zeile>();
  /** die Ebenen von oben nach unten, wie sie zuletzt gezeigt wurden */
  private reihe: number[] = [];
  private gezeigt = '';
  /** `platz0`, `platz`: wo die gezogene Ebene am Anfang lag und wo jetzt (von oben gezählt); `geordnet`: Der Zug hat sie schon einmal umgelegt */
  private druck: { id: number; zeiger: number; x0: number; y0: number; x: number; y: number; zieht: boolean; geordnet: boolean; heraus: boolean; platz0: number; platz: number } | null = null;

  constructor(
    eltern: HTMLElement,
    private ziele: EbenenZiele,
  ) {
    const el = document.createElement('nav');
    el.id = 'ebenen';
    el.hidden = true;
    el.setAttribute('aria-label', 'Ebenen');
    this.el = el;
    this.plus = document.createElement('button');
    this.plus.type = 'button';
    this.plus.className = 'ebene neu';
    this.plus.title = 'Neue Ebene (über der, an der du malst)';
    this.plus.setAttribute('aria-label', 'Neue Ebene');
    this.plus.append(this.linse());
    this.plus.addEventListener('click', () => this.ziele.neu());
    this.liste = document.createElement('ol');
    this.liste.className = 'stapel';
    this.faecher = document.createElement('button');
    this.faecher.type = 'button';
    this.faecher.className = 'faecher';
    this.faecher.setAttribute('aria-pressed', 'false');
    // (drei kleine Linsen, schräg versetzt: die Ebenen, aufgefächert)
    this.faecher.innerHTML = '<svg viewBox="0 0 30 18" aria-hidden="true"><ellipse cx="10.5" cy="5" rx="8" ry="3.3" /><ellipse cx="15" cy="9" rx="8" ry="3.3" /><ellipse cx="19.5" cy="13" rx="8" ry="3.3" /></svg>';
    this.faecher.addEventListener('click', (e) => this.ziele.faecher(e.shiftKey));
    this.faecherTitel(false);
    el.append(this.faecher, this.plus, this.liste);
    eltern.append(el);
    // ohne Fokus auf einem Knopf (sonst löste die Leertaste ihn danach noch einmal aus)
    el.addEventListener('pointerdown', (e) => e.preventDefault());
    this.liste.addEventListener('pointerdown', (e) => this.druecken(e));
    this.liste.addEventListener('pointermove', (e) => this.bewegen(e));
    this.liste.addEventListener('pointerup', (e) => this.loslassen(e, true));
    this.liste.addEventListener('pointercancel', (e) => this.loslassen(e, false));
    this.liste.addEventListener('click', (e) => {
      const auge = (e.target as HTMLElement).closest<HTMLButtonElement>('button.auge');
      const id = Number(auge?.closest('li')?.dataset.id);
      if (auge && Number.isFinite(id)) this.ziele.zeigen(id, auge.getAttribute('aria-pressed') !== 'true');
    });
  }

  /** der Knopf der Ebenen-Ansicht: gedrückt, solange aufgefächert ist, und was er dann tut */
  private faecherTitel(offen: boolean): void {
    this.faecher.setAttribute('aria-pressed', String(offen));
    const titel = offen ? 'Ebenen-Ansicht: wieder zusammenschieben · ⇧: die andere Anordnung' : 'Ebenen-Ansicht: auffächern, je Ebene eine Kopie · ⇧: die andere Anordnung';
    this.faecher.title = titel;
    this.faecher.setAttribute('aria-label', titel);
  }

  private linse(): HTMLSpanElement {
    const s = document.createElement('span');
    s.className = 'linse';
    return s;
  }

  /** für Proben: die Ebenen von oben nach unten, wie der Stapel sie zeigt */
  get stand(): number[] {
    return [...this.reihe];
  }

  /**
   * Je Bild: zu sehen, solange gemalt wird, mit den Ebenen, wie sie gerade sind (von oben nach unten); `voll`: Mehr Ebenen gehen
   * nicht; `offen`: Die Ebenen-Ansicht ist aufgefächert.
   */
  zeigen(an: boolean, ebenen: readonly EbeneZeile[], voll: boolean, offen = false): void {
    if (this.el.hidden === an) {
      this.el.hidden = !an;
      if (!an && this.druck) this.zugEnde();
    }
    if (!an) return;
    if ((this.faecher.getAttribute('aria-pressed') === 'true') !== offen) this.faecherTitel(offen);
    // (der Knopf steht da, sobald es mehr als eine Ebene gibt)
    this.faecher.hidden = ebenen.length < 2;
    const zeichen = `${voll ? 1 : 0}|` + ebenen.map((e) => `${e.id}:${e.aktiv ? 'a' : ''}${e.aus ? 'x' : ''}${e.leer ? 'l' : ''}:${e.name}:${e.farben.map(css).join(';')}`).join('|');
    if (zeichen === this.gezeigt) return;
    this.gezeigt = zeichen;
    this.plus.hidden = voll;
    // wo jede Zeile jetzt steht (damit die anderen weich an ihren neuen Platz rücken)
    const vorher = new Map<number, number>();
    for (const [id, z] of this.zeilen) vorher.set(id, z.li.offsetTop);
    const da = new Set(ebenen.map((e) => e.id));
    for (const [id, z] of this.zeilen) {
      if (da.has(id)) continue;
      z.li.remove();
      this.zeilen.delete(id);
    }
    ebenen.forEach((e, i) => {
      let z = this.zeilen.get(e.id);
      if (!z) {
        const li = document.createElement('li');
        li.className = 'zeile';
        li.dataset.id = String(e.id);
        const knopf = document.createElement('button');
        knopf.type = 'button';
        knopf.className = 'ebene';
        const linse = this.linse();
        knopf.append(linse);
        const auge = document.createElement('button');
        auge.type = 'button';
        auge.className = 'auge';
        li.append(knopf, auge);
        z = { li, knopf, auge, linse };
        this.zeilen.set(e.id, z);
      }
      // (an seinen Platz in der Reihe: nur umhängen, was nicht schon dort steht)
      if (this.liste.children[i] !== z.li) this.liste.insertBefore(z.li, this.liste.children[i] ?? null);
      z.li.classList.toggle('aus', e.aus);
      z.knopf.setAttribute('aria-pressed', String(e.aktiv));
      const titel = e.aktiv ? `${e.name}: Hier malst du · ziehen: ordnen, auf den Mülleimer: löschen` : `${e.name} · tippen: hier malen · ziehen: ordnen, auf den Mülleimer: löschen`;
      z.knopf.title = titel;
      z.knopf.setAttribute('aria-label', titel);
      z.auge.setAttribute('aria-pressed', String(!e.aus));
      z.auge.title = e.aus ? `${e.name} einblenden` : `${e.name} ausblenden`;
      z.auge.setAttribute('aria-label', z.auge.title);
      // die Farben ihrer Füllungen als Streifen (leer: das Papier)
      const n = e.farben.length;
      const streifen = n > 1 ? `linear-gradient(90deg, ${e.farben.map((f, k) => `${css(f)} ${(100 * k) / n}% ${(100 * (k + 1)) / n}%`).join(', ')})` : n === 1 ? css(e.farben[0]!) : '';
      if (streifen) z.linse.style.setProperty('--fuellung', streifen);
      else z.linse.style.removeProperty('--fuellung');
    });
    this.reihe = ebenen.map((e) => e.id);
    // die Zeilen, die ihren Platz gewechselt haben, rücken von dort, wo sie standen
    for (const [id, z] of this.zeilen) {
      if (this.druck?.zieht && this.druck.id === id) continue;
      const alt = vorher.get(id);
      const d = alt === undefined ? 0 : alt - z.li.offsetTop;
      if (!d) continue;
      z.li.style.transition = 'none';
      z.li.style.transform = `translateY(${d}px)`;
      void z.li.offsetHeight;
      z.li.style.transition = '';
      z.li.style.transform = '';
    }
    if (this.druck?.zieht) this.zugLegen();
  }

  private druecken(e: PointerEvent): void {
    const knopf = (e.target as HTMLElement).closest<HTMLButtonElement>('button.ebene');
    const id = Number(knopf?.closest('li')?.dataset.id);
    if (!knopf || !Number.isFinite(id) || this.druck) return;
    const platz = this.reihe.indexOf(id);
    this.druck = { id, zeiger: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, zieht: false, geordnet: false, heraus: false, platz0: platz, platz };
    this.liste.setPointerCapture(e.pointerId);
  }

  private bewegen(e: PointerEvent): void {
    const d = this.druck;
    if (!d || e.pointerId !== d.zeiger) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.zieht && Math.hypot(d.x - d.x0, d.y - d.y0) >= ZUG_AB) {
      d.zieht = true;
      this.zeilen.get(d.id)?.li.classList.add('zieht');
    }
    if (!d.zieht) return;
    const z = this.zeilen.get(d.id);
    if (!z) return;
    const kasten = this.liste.getBoundingClientRect();
    d.heraus = d.x < kasten.left - HERAUS_AB || d.x > kasten.right + HERAUS_AB;
    z.li.classList.toggle('heraus', d.heraus);
    // im Stapel: Über welcher Zeile die Linse jetzt steht, dort liegt ihre Ebene. Aus dem Stapel gezogen (auf dem Weg zum
    // Mülleimer): Die Ebene liegt wieder, wo sie lag
    const hoch = z.li.offsetHeight || 1;
    const platz = d.heraus ? d.platz0 : Math.max(0, Math.min(this.reihe.length - 1, Math.floor((d.y - kasten.top) / hoch)));
    if (platz !== d.platz) {
      this.ziele.ordnen(d.id, platz, !d.geordnet);
      d.geordnet = true;
      d.platz = platz;
    }
    this.zugLegen();
  }

  /** die gezogene Linse liegt unter dem Zeiger: im Stapel nur auf und ab, herausgezogen frei */
  private zugLegen(): void {
    const d = this.druck;
    const z = d ? this.zeilen.get(d.id) : undefined;
    if (!d || !z) return;
    // wo die Linse ohne ihren Versatz stünde (ihr Kasten im Bild enthält ihn schon); sie sitzt rechts in ihrem Knopf
    const r = z.knopf.getBoundingClientRect();
    const mx = r.right - 15 - this.versatz.x;
    const my = r.top + r.height / 2 - this.versatz.y;
    this.versatz = { x: d.heraus ? d.x - mx : 0, y: d.y - my };
    z.li.style.transform = `translate(${this.versatz.x}px, ${this.versatz.y}px)`;
  }
  /** wie weit die gezogene Linse gerade versetzt ist */
  private versatz = { x: 0, y: 0 };

  private loslassen(e: PointerEvent, gilt: boolean): void {
    const d = this.druck;
    if (!d || e.pointerId !== d.zeiger) return;
    // (vor dem Aufräumen gefragt: Danach gleitet die Linse zurück und läge noch unter dem Zeiger, über dem Mülleimer)
    const aufMuell = gilt && d.zieht && d.heraus && this.reihe.length > 1 && this.ziele.muell(e.clientX, e.clientY);
    this.zugEnde();
    if (!gilt) return;
    if (!d.zieht) this.ziele.waehlen(d.id);
    else if (aufMuell) this.ziele.loeschen(d.id);
  }

  private zugEnde(): void {
    const d = this.druck;
    this.druck = null;
    this.versatz = { x: 0, y: 0 };
    if (!d) return;
    if (this.liste.hasPointerCapture(d.zeiger)) this.liste.releasePointerCapture(d.zeiger);
    // (ein Zug, der hin und zurück geordnet hat, war kein Schritt)
    if (d.geordnet) this.ziele.ordnenEnde(d.platz !== d.platz0);
    const z = this.zeilen.get(d.id);
    if (z) {
      z.li.classList.remove('zieht', 'heraus');
      z.li.style.transform = '';
    }
  }
}
