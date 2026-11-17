/**
 * Ozzy, S13 (liquid drop, Idee 10): der Ansichts-Tropfen unten rechts (Entwurf: docs/progress/ozzy/2026-11-17-ansichts-tropfen-entwurf.png,
 * Florian: „Ja, so bauen“). Er zeigt, von wo man schaut: ein Achsenkreuz mit S (Seite), F (Front), T (Top) als gefüllten Tropfen und ihren
 * Gegenseiten als leeren; was zum Betrachter zeigt, ist Tinte, was abgewandt ist, grün und fein wie Verdecktes. Er dreht sich mit der
 * Kamera, die eingerastete Ansicht liegt in seiner Mitte. Über einem Tropfen quillt er auf, ein Schild sagt, wohin er führt. Ziehen an ihm
 * dreht wie Ziehen ins Leere, Tippen rastet ein, ⇧ und Tippen die Gegenseite, Tippen in die Mitte führt zurück in den Raum.
 */

import { type Camera, Vector3 } from 'three';

export type TropfenAnsicht = 'seite' | 'front' | 'top';
export type TropfenZiel = { a: TropfenAnsicht; hinten: boolean } | { a: 'raum' };

/** was der Tropfen in Ozzy auslöst */
export interface TropfenBedienung {
  setzen(ziel: TropfenZiel): void;
  drehenBeginnen(x: number, y: number, t: number): void;
  drehenZiehen(x: number, y: number, t: number): void;
  drehenLos(t: number): void;
  /** ein neues Bild (der Tropfen hat sich geändert, etwa beim Darüberfahren) */
  anstossen(): void;
}

const NS = 'http://www.w3.org/2000/svg';
/** Kantenlänge des Felds, Mitte, Länge der Achsen (CSS-Pixel) */
const GROESSE = 88;
const C = 44;
const R = 30;
const TINTE = '#1f1a17';
const GRUEN = '#9fbf98';
const SCHRIFT = "system-ui, -apple-system, 'Helvetica Neue', sans-serif";

type Achse = {
  a: TropfenAnsicht;
  hinten: boolean;
  buchstabe: string;
  name: string;
  richtung: Vector3;
  linie: SVGLineElement;
  gruppe: SVGGElement;
  kreis: SVGCircleElement;
  text: SVGTextElement | null;
  x: number;
  y: number;
  t: number;
  schwell: number;
};

function element<K extends keyof SVGElementTagNameMap>(art: K, werte: Record<string, string | number>): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, art);
  for (const [k, v] of Object.entries(werte)) e.setAttribute(k, String(v));
  return e;
}

export class AnsichtsTropfen {
  readonly el: HTMLDivElement;
  private readonly linien: SVGGElement;
  private readonly tropfen: SVGGElement;
  private readonly achsen: Achse[];
  private readonly schild: SVGGElement;
  private readonly schildRahmen: SVGRectElement;
  private readonly schildText: SVGTextElement;
  private readonly schildFaden: SVGLineElement;
  /** unter dem Zeiger: ein Tropfen (Nummer), die Mitte oder nichts */
  private ueber: number | 'mitte' | null = null;
  private druck: { x: number; y: number; t: number; dreht: boolean; id: number } | null = null;
  private zuSehen = false;

  constructor(
    eltern: HTMLElement,
    private readonly b: TropfenBedienung,
    /** Finger statt Maus: großzügiger treffen */
    private readonly grob: () => boolean,
  ) {
    this.el = document.createElement('div');
    this.el.id = 'ansichts-tropfen';
    this.el.className = 'weg';
    const svg = element('svg', { width: GROESSE, height: GROESSE, viewBox: `0 0 ${GROESSE} ${GROESSE}` });
    svg.append(element('circle', { cx: C, cy: C, r: R + 9, fill: 'rgba(255,255,255,0.9)', stroke: 'rgba(31,26,23,0.16)', 'stroke-width': 0.5 }));
    this.linien = element('g', {});
    this.tropfen = element('g', {});
    svg.append(this.linien, this.tropfen);
    const achsen: [TropfenAnsicht, boolean, string, string, [number, number, number]][] = [
      ['seite', false, 'S', 'Seite · 1', [0, 0, 1]],
      ['front', false, 'F', 'Front · 3', [1, 0, 0]],
      ['top', false, 'T', 'Top · 7', [0, 1, 0]],
      ['seite', true, '', 'von rechts · ⇧1', [0, 0, -1]],
      ['front', true, '', 'von hinten · ⇧3', [-1, 0, 0]],
      ['top', true, '', 'von unten · ⇧7', [0, -1, 0]],
    ];
    this.achsen = achsen.map(([a, hinten, buchstabe, name, r]) => {
      const linie = element('line', { x1: C, y1: C, x2: C, y2: C });
      const gruppe = element('g', {});
      const kreis = element('circle', { cx: C, cy: C, r: 3, 'stroke-width': 0.6 });
      gruppe.append(kreis);
      let text: SVGTextElement | null = null;
      if (buchstabe) {
        text = element('text', { 'text-anchor': 'middle', 'font-family': SCHRIFT, 'font-weight': 600 });
        text.textContent = buchstabe;
        gruppe.append(text);
      }
      this.linien.append(linie);
      this.tropfen.append(gruppe);
      return { a, hinten, buchstabe, name, richtung: new Vector3(...r), linie, gruppe, kreis, text, x: C, y: C, t: 0, schwell: 0 };
    });
    this.schild = element('g', { visibility: 'hidden' });
    this.schildFaden = element('line', { stroke: TINTE, 'stroke-width': 0.4 });
    this.schildRahmen = element('rect', { height: 20, rx: 10, fill: 'rgba(255,255,255,0.95)', stroke: TINTE, 'stroke-width': 0.5 });
    this.schildText = element('text', { 'text-anchor': 'middle', 'font-family': SCHRIFT, 'font-size': 11, fill: TINTE });
    this.schild.append(this.schildFaden, this.schildRahmen, this.schildText);
    svg.append(this.schild);
    this.el.append(svg);
    eltern.append(this.el);
    this.bedienen();
  }

  /** Ort im Feld des Tropfens (CSS-Pixel) */
  private lage(e: PointerEvent): [number, number] {
    const r = this.el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  /** was unter (x, y) liegt: ein Tropfen (vorn bevorzugt), die Mitte (zurück in den Raum) oder nichts */
  private treffen(x: number, y: number): number | 'mitte' | null {
    if (Math.hypot(x - C, y - C) > R + 14) return null;
    const weit = this.grob() ? 15 : 10;
    let best = -1;
    let bd = Infinity;
    this.achsen.forEach((A, i) => {
      // was genau zur Kamera oder genau von ihr weg zeigt, liegt in der Mitte: das ist die Mitte
      if (Math.abs(A.t) > 0.98) return;
      const d = Math.hypot(x - A.x, y - A.y) - (A.t > -0.02 ? 3 : 0);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best >= 0 && bd < weit) return best;
    if (Math.hypot(x - C, y - C) < weit) return 'mitte';
    return null;
  }

  private bedienen(): void {
    const el = this.el;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // nachgestellte Ereignisse haben keinen echten Zeiger
      }
      this.druck = { x: e.clientX, y: e.clientY, t: e.timeStamp, dreht: false, id: e.pointerId };
    });
    el.addEventListener('pointermove', (e) => {
      const d = this.druck;
      if (d && e.pointerId === d.id) {
        if (!d.dreht && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) {
          d.dreht = true;
          this.ueber = null;
          this.b.drehenBeginnen(d.x, d.y, d.t);
        }
        if (d.dreht) this.b.drehenZiehen(e.clientX, e.clientY, e.timeStamp);
        this.b.anstossen();
        return;
      }
      const [x, y] = this.lage(e);
      const ueber = this.treffen(x, y);
      if (ueber !== this.ueber) {
        this.ueber = ueber;
        this.b.anstossen();
      }
    });
    const los = (e: PointerEvent): void => {
      const d = this.druck;
      if (!d || e.pointerId !== d.id) return;
      this.druck = null;
      if (d.dreht) {
        this.b.drehenLos(e.timeStamp);
        this.b.anstossen();
        return;
      }
      if (e.type !== 'pointerup') return;
      const [x, y] = this.lage(e);
      const hier = this.treffen(x, y);
      if (hier === 'mitte') this.b.setzen({ a: 'raum' });
      else if (hier !== null) {
        const A = this.achsen[hier]!;
        this.b.setzen({ a: A.a, hinten: e.shiftKey ? !A.hinten : A.hinten });
      }
      this.b.anstossen();
    };
    el.addEventListener('pointerup', los);
    el.addEventListener('pointercancel', los);
    el.addEventListener('pointerleave', () => {
      if (this.druck || this.ueber === null) return;
      this.ueber = null;
      this.b.anstossen();
    });
  }

  /**
   * Ein Bild: Lage der Tropfen aus der Kamera, Aufquellen über dem Zeiger, das Schild. `sichtbar`: nur in der Ruhe. Zurück: ob er noch
   * Bilder braucht (ein Tropfen quillt noch auf oder ab).
   */
  zeichnen(cam: Camera, sichtbar: boolean, dt: number): boolean {
    if (sichtbar !== this.zuSehen) {
      this.zuSehen = sichtbar;
      this.el.classList.toggle('weg', !sichtbar);
      if (!sichtbar) {
        this.ueber = null;
        this.druck = null;
      }
    }
    if (!sichtbar) return false;
    const re = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0).normalize();
    const ob = new Vector3().setFromMatrixColumn(cam.matrixWorld, 1).normalize();
    const zu = new Vector3().setFromMatrixColumn(cam.matrixWorld, 2).normalize();
    const k = 1 - Math.exp(-Math.max(0, dt) / 0.07);
    let bewegt = false;
    this.achsen.forEach((A, i) => {
      A.x = C + R * A.richtung.dot(re);
      A.y = C - R * A.richtung.dot(ob);
      A.t = A.richtung.dot(zu);
      const ziel = this.ueber === i ? 1 : 0;
      A.schwell += (ziel - A.schwell) * k;
      if (Math.abs(ziel - A.schwell) > 0.01) bewegt = true;
    });
    // hinten zuerst, vorn zuletzt (die vorderen liegen über den hinteren)
    for (const A of [...this.achsen].sort((p, q) => p.t - q.t)) {
      this.tropfen.append(A.gruppe);
      const vorn = A.t > -0.02;
      const mitte = A.t > 0.98;
      const verdeckt = A.t < -0.98;
      A.gruppe.setAttribute('visibility', verdeckt ? 'hidden' : 'visible');
      A.linie.setAttribute('visibility', verdeckt || mitte ? 'hidden' : 'visible');
      const farbe = vorn ? TINTE : GRUEN;
      A.linie.setAttribute('x2', A.x.toFixed(2));
      A.linie.setAttribute('y2', A.y.toFixed(2));
      A.linie.setAttribute('stroke', farbe);
      A.linie.setAttribute('stroke-width', vorn ? '0.6' : '0.4');
      const gross = Math.max(A.schwell, mitte ? 1 : 0);
      const r = A.buchstabe ? (vorn ? 6.2 : 5) + 2.3 * gross : 3.2 + 2.8 * gross;
      A.kreis.setAttribute('cx', A.x.toFixed(2));
      A.kreis.setAttribute('cy', A.y.toFixed(2));
      A.kreis.setAttribute('r', r.toFixed(2));
      A.kreis.setAttribute('stroke', farbe);
      A.kreis.setAttribute('fill', A.buchstabe && vorn ? TINTE : 'white');
      if (A.text) {
        const gr = vorn ? 7.5 + 1.5 * gross : 6.5;
        A.text.setAttribute('x', A.x.toFixed(2));
        A.text.setAttribute('y', (A.y + gr * 0.36).toFixed(2));
        A.text.setAttribute('font-size', gr.toFixed(2));
        A.text.setAttribute('fill', vorn ? 'white' : GRUEN);
      }
    }
    this.schildZeigen();
    return bewegt;
  }

  /** das Schild links neben dem Kreis, auf der Höhe des Tropfens unter dem Zeiger: wohin er führt */
  private schildZeigen(): void {
    const u = this.ueber;
    if (u === null || this.druck?.dreht) {
      this.schild.setAttribute('visibility', 'hidden');
      return;
    }
    const A = u === 'mitte' ? null : this.achsen[u]!;
    const name = A ? A.name : 'Raum · 0';
    const y = A ? A.y : C;
    if (this.schildText.textContent !== name) this.schildText.textContent = name;
    const w = Math.max(40, this.schildText.getComputedTextLength() + 18);
    const lx = C - R - 9 - w - 8;
    this.schildRahmen.setAttribute('x', lx.toFixed(1));
    this.schildRahmen.setAttribute('y', (y - 10).toFixed(1));
    this.schildRahmen.setAttribute('width', w.toFixed(1));
    this.schildText.setAttribute('x', (lx + w / 2).toFixed(1));
    this.schildText.setAttribute('y', (y + 4).toFixed(1));
    this.schildFaden.setAttribute('x1', (lx + w).toFixed(1));
    this.schildFaden.setAttribute('y1', y.toFixed(1));
    this.schildFaden.setAttribute('x2', ((A ? A.x : C) - 6).toFixed(1));
    this.schildFaden.setAttribute('y2', y.toFixed(1));
    this.schild.setAttribute('visibility', 'visible');
  }

  /** für Proben: die Tropfen im Fenster (CSS-Pixel), ob er zu sehen ist, was das Schild sagt */
  stand(): { sichtbar: boolean; achsen: { buchstabe: string; name: string; x: number; y: number; t: number }[]; mitte: { x: number; y: number }; schild: string | null } {
    const r = this.el.getBoundingClientRect();
    return {
      sichtbar: this.zuSehen,
      achsen: this.achsen.map((A) => ({ buchstabe: A.buchstabe, name: A.name, x: r.left + A.x, y: r.top + A.y, t: A.t })),
      mitte: { x: r.left + C, y: r.top + C },
      schild: this.schild.getAttribute('visibility') === 'visible' ? this.schildText.textContent : null,
    };
  }
}
