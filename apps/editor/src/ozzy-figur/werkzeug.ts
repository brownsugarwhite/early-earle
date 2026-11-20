// Ozzy-Figur: Vektorwerkzeuge wie in Illustrator (Florian, 19.11. nachts: „posen und unsaubere stellen in den übergängen einfach selbst
// anpassen“; Plan docs/plans/2026-11-19-ozzy-figur-werkzeug.md). Stufe 1: die Kopfteile in den Kopfdrehungen. Jede Änderung wird ein
// Schlüssel des Teils bei diesem Winkel (raster.ts, KopfKorrektur), die Nachbarn blenden weich ein. Gespeichert über den Dev-Server in
// docs/look/ozzy-figur/schluessel.json. Keine Punkte hinzufügen oder löschen: Jedes Teil hat in allen Schlüsseln dieselben Anker.
import { abflachen, type Form, type Punkt } from './form';
import { KORREKTUR_NAH, type KopfKorrektur, type Lage, type SchluesselEintrag } from './raster';
import type { Ansicht, Szene } from './renderer';
import type { TeilName } from './vorlagen/import';

export type WerkzeugArt = 'direkt' | 'auswahl' | 'umwandeln';

export interface WerkzeugKontext {
  /** Lage der gezeigten Szene, wenn sie den Kopf über θ dreht (sonst null: dort gibt es noch nichts zu bearbeiten) */
  lage(): Lage | null;
  /** Kopfteile an der Lage in Figurkoordinaten, in Malreihenfolge */
  kopfteile(lage: Lage): { name: TeilName; weiss: boolean; form: Form }[];
  /** eingepasste Ansicht ohne Zoom */
  ansicht(): Ansicht;
  korrekturenSetzen(liste: readonly KopfKorrektur[]): void;
  korrekturAus(teil: TeilName, lage: Lage, form: Form): KopfKorrektur;
  /** Kopf auf diesen Winkel stellen (0°–360°) und anhalten */
  winkelSetzen(theta: number): void;
  /** alle Schlüssel der Kopfteile mit Herkunft (Zeitleiste) */
  schluessel(): readonly SchluesselEintrag[];
  /** Winkel, bis zu dem die gezeigte Drehung reicht (90° oder 360°) */
  bereich(): number;
  neu(): void;
}

const DATEI = '/__ozzy-figur/schluessel';
const BLAU = '#1f6feb';
const NAMEN: Partial<Record<TeilName, string>> = {
  kopfA: 'Maske A',
  kopfB: 'Maske B',
  ohrA: 'Ohr A',
  ohrB: 'Ohr B',
  ohrSpalt: 'Ohrspalt',
  bartA: 'Bart A',
  bartB: 'Bart B',
  nase: 'Nase',
};
/** ein Griff gilt als „glatt“ mit seinem Gegengriff, wenn beide höchstens so viel Grad von einer Geraden abweichen */
const GLATT_GRAD = 4;
const TINTE = '#1f1a17';
const ROT = '#d0312d';
/** Zeitleiste: eine Zeile je Kopfteil, von oben nach unten wie die Ebenen (was im Bild oben liegt, steht oben) */
const ZEILEN: TeilName[] = ['nase', 'bartB', 'bartA', 'kopfA', 'kopfB', 'ohrA', 'ohrSpalt', 'ohrB'];
/** Maße der Zeitleiste in CSS-Bildpunkten; auf einer kleinen Bühne (iPhone) knapper */
const ZL_GROSS = { lineal: 26, zeile: 15, unten: 7, links: 74, rechts: 20, schrift: 10 };
const ZL_KLEIN = { lineal: 22, zeile: 11, unten: 4, links: 60, rechts: 12, schrift: 9 };

type Zug =
  | { art: 'anker'; teil: TeilName; start: Punkt; form0: Form; welche: number[]; bewegt: boolean }
  | { art: 'griff'; teil: TeilName; start: Punkt; form0: Form; j: number; seite: 'i' | 'o'; brechen: boolean; bewegt: boolean }
  | { art: 'teil'; teil: TeilName; start: Punkt; form0: Form; bewegt: boolean }
  | { art: 'herausziehen'; teil: TeilName; start: Punkt; form0: Form; j: number; bewegt: boolean }
  | { art: 'rahmen'; startPx: Punkt; jetztPx: Punkt; dazu: boolean; teilBeiKlick: TeilName | null }
  | { art: 'schwenk'; startPx: Punkt; zoom0: Zoom };
type Treffer = { art: 'griff'; teil: TeilName; j: number; seite: 'i' | 'o' } | { art: 'anker'; teil: TeilName; j: number } | { art: 'pfad' | 'innen'; teil: TeilName };
interface Zoom {
  z: number;
  dx: number;
  dy: number;
}

const kopie = (f: Form): Form => f.map((a) => ({ p: [a.p[0], a.p[1]], i: [a.i[0], a.i[1]], o: [a.o[0], a.o[1]] }));
const abstand = (a: Punkt, b: Punkt): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const plus = (a: Punkt, v: Punkt): Punkt => [a[0] + v[0], a[1] + v[1]];
const minus = (a: Punkt, b: Punkt): Punkt => [a[0] - b[0], a[1] - b[1]];
function ankerVerschieben(a: { p: Punkt; i: Punkt; o: Punkt }, v: Punkt): void {
  a.p = plus(a.p, v);
  a.i = plus(a.i, v);
  a.o = plus(a.o, v);
}
/** glatt: beide Griffe da und auf einer Geraden durch den Anker */
function istGlatt(a: { p: Punkt; i: Punkt; o: Punkt }): boolean {
  const e = minus(a.p, a.i);
  const u = minus(a.o, a.p);
  const le = Math.hypot(e[0], e[1]);
  const lu = Math.hypot(u[0], u[1]);
  if (le < 0.01 || lu < 0.01) return false;
  return (e[0] * u[0] + e[1] * u[1]) / (le * lu) > Math.cos((GLATT_GRAD * Math.PI) / 180);
}
/** Ankerpunkt umwandeln: mit Griffen → Ecke ohne Griffe; ohne Griffe → glatt, Griffe längs der Nachbarn (ein Drittel ihres Abstands) */
function umwandeln(f: Form, j: number): void {
  const a = f[j]!;
  const hatGriffe = abstand(a.i, a.p) > 0.01 || abstand(a.o, a.p) > 0.01;
  if (hatGriffe) {
    a.i = [a.p[0], a.p[1]];
    a.o = [a.p[0], a.p[1]];
    return;
  }
  const n = f.length;
  const vor = f[(j - 1 + n) % n]!.p;
  const nach = f[(j + 1) % n]!.p;
  const r = minus(nach, vor);
  const l = Math.hypot(r[0], r[1]) || 1;
  const e: Punkt = [r[0] / l, r[1] / l];
  const li = abstand(a.p, vor) / 3;
  const lo = abstand(a.p, nach) / 3;
  a.i = [a.p[0] - e[0] * li, a.p[1] - e[1] * li];
  a.o = [a.p[0] + e[0] * lo, a.p[1] + e[1] * lo];
}
/** mit ⇧ gezogen: auf waagrecht, senkrecht oder 45° */
function einrasten45(v: Punkt): Punkt {
  const l = Math.hypot(v[0], v[1]);
  if (l < 1e-9) return v;
  const w = Math.round(Math.atan2(v[1], v[0]) / (Math.PI / 4)) * (Math.PI / 4);
  const p = v[0] * Math.cos(w) + v[1] * Math.sin(w);
  return [Math.cos(w) * p, Math.sin(w) * p];
}
/** liegt q in der Form (gerade-ungerade über die abgeflachte Kurve) */
function innen(pts: number[], q: Punkt): boolean {
  let drin = false;
  for (let k = 0, m = pts.length - 2; k < pts.length; m = k, k += 2) {
    const xi = pts[k]!, yi = pts[k + 1]!, xj = pts[m]!, yj = pts[m + 1]!;
    if (yi > q[1] !== yj > q[1] && q[0] < ((xj - xi) * (q[1] - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}
/** kleinster Abstand von q zur geschlossenen Linie pts */
function linienAbstand(pts: number[], q: Punkt): number {
  let best = Infinity;
  for (let k = 0; k < pts.length; k += 2) {
    const ax = pts[k]!, ay = pts[k + 1]!;
    const bx = pts[(k + 2) % pts.length]!, by = pts[(k + 3) % pts.length]!;
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(q[0] - ax - t * dx, q[1] - ay - t * dy));
  }
  return best;
}
const runden = (v: number): number => Math.round(v * 100) / 100;
const gradText = (w: number): string => (Number.isInteger(w) ? String(w) : w.toFixed(1)).replace('.', ',');
const gradListe = (ws: number[]): string => {
  const t = ws.map((w) => `${gradText(w)}°`);
  return t.length > 1 ? `${t.slice(0, -1).join(', ')} und ${t[t.length - 1]}` : (t[0] ?? '');
};
/** wessen Schlüssel das ist, in Florians Worten */
function herkunft(e: SchluesselEintrag): string {
  const spiegel = e.von ? ` (gespiegelt aus ${gradText(e.von.w)}°, ${NAMEN[e.von.teil] ?? e.von.teil})` : '';
  if (e.art === 'vorlage') return `deine Vorlage${e.grund ? `: ${e.grund}` : ''}${spiegel}`;
  if (e.art === 'dein') return `dein Schlüssel${spiegel}`;
  if (e.art === 'falte') return `mein verborgener Faltschlüssel${e.grund ? `: ${e.grund}` : ''}`;
  return `mein Schlüssel${e.grund ? `: ${e.grund}` : ''}${spiegel}`;
}

/** Datei: eine Zeile je Schlüssel, jeder Anker als [px, py, ix, iy, ox, oy] */
export function schluesselSchreiben(liste: readonly KopfKorrektur[]): string {
  const zeilen = [...liste]
    .sort((a, b) => a.w - b.w || a.teil.localeCompare(b.teil))
    .map((k) => JSON.stringify({ teil: k.teil, w: k.w, form: k.form.map((a) => [a.p[0], a.p[1], a.i[0], a.i[1], a.o[0], a.o[1]].map(runden)) }));
  return `{"version":1,"kopf":[\n${zeilen.join(',\n')}\n]}\n`;
}
export function schluesselLesen(j: unknown): KopfKorrektur[] {
  const kopf = (j as { kopf?: unknown } | null)?.kopf;
  if (!Array.isArray(kopf)) return [];
  const aus: KopfKorrektur[] = [];
  for (const e of kopf) {
    const x = e as { teil?: unknown; w?: unknown; form?: unknown };
    if (typeof x.teil !== 'string' || typeof x.w !== 'number' || !Array.isArray(x.form)) continue;
    const form: Form = [];
    let gut = true;
    for (const a of x.form as unknown[]) {
      if (!Array.isArray(a) || a.length !== 6 || a.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
        gut = false;
        break;
      }
      const v = a as number[];
      form.push({ p: [v[0]!, v[1]!], i: [v[2]!, v[3]!], o: [v[4]!, v[5]!] });
    }
    if (gut && form.length) aus.push({ teil: x.teil as TeilName, w: x.w, form });
  }
  return aus;
}

export class FigurWerkzeug {
  an = false;
  art: WerkzeugArt = 'direkt';
  teil: TeilName | null = null;
  readonly gewaehlt = new Set<number>();
  /** Zoom über der eingepassten Ansicht: Faktor und Verschiebung (Figurkoordinaten) */
  private zoom: Zoom = { z: 1, dx: 0, dy: 0 };
  private liste: KopfKorrektur[] = [];
  private readonly zurueckStapel: KopfKorrektur[][] = [];
  private readonly vorStapel: KopfKorrektur[][] = [];
  private zug: Zug | null = null;
  /** die Form, die gerade gezogen wird (Figurkoordinaten), bis sie beim Loslassen ein Schlüssel wird */
  private live: { teil: TeilName; form: Form } | null = null;
  private leertaste = false;
  private readonly finger = new Map<number, Punkt>();
  private zwei: { abstand: number; mitte: Punkt; zoom0: Zoom } | null = null;
  private speicherUhr = 0;
  private stand = '';
  private bearbeitbar = false;
  /** Zeitleiste unter der Bühne (nur im Bearbeiten) */
  private readonly zl: HTMLCanvasElement;
  private zlZug: { zeile: number } | null = null;
  private zlHover: SchluesselEintrag | null = null;

  constructor(
    private readonly flaeche: HTMLCanvasElement,
    buehne: HTMLElement,
    private readonly k: WerkzeugKontext,
  ) {
    flaeche.addEventListener('pointerdown', (e) => this.runter(e));
    flaeche.addEventListener('pointermove', (e) => this.bewegen(e));
    flaeche.addEventListener('pointerup', (e) => this.hoch(e, false));
    flaeche.addEventListener('pointercancel', (e) => this.hoch(e, true));
    buehne.addEventListener('wheel', (e) => this.rad(e), { passive: false });
    window.addEventListener('keydown', (e) => this.taste(e));
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.leertaste = false;
        this.zeiger(null);
      }
    });
    this.zl = document.createElement('canvas');
    this.zl.id = 'zeitleiste';
    buehne.appendChild(this.zl);
    this.zl.addEventListener('pointerdown', (e) => this.zlRunter(e));
    this.zl.addEventListener('pointermove', (e) => this.zlBewegen(e));
    this.zl.addEventListener('pointerup', () => (this.zlZug = null));
    this.zl.addEventListener('pointercancel', () => (this.zlZug = null));
    this.zl.addEventListener('pointerleave', () => this.zlHoverSetzen(null));
    this.zl.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      { passive: false },
    );
  }

  /** CSS-Bildpunkte, die die Zeitleiste unten auf der Bühne belegt (die Figur wird darüber eingepasst) */
  untenBelegt(): number {
    if (!this.an) return 0;
    this.zlMasse();
    return this.zlHoehe();
  }
  private zlm = ZL_GROSS;
  private zlMasse(): void {
    this.zlm = (this.zl.parentElement?.clientHeight ?? 1000) < 700 ? ZL_KLEIN : ZL_GROSS;
    const hoehe = `${this.zlHoehe()}px`;
    if (this.zl.style.height !== hoehe) this.zl.style.height = hoehe;
  }
  private zlHoehe(): number {
    return this.zlm.lineal + ZEILEN.length * this.zlm.zeile + this.zlm.unten;
  }

  // ---- Ansicht -------------------------------------------------------------------------------------------------------------

  /** die gezeigte Ansicht: eingepasst, im Bearbeiten mit Zoom */
  mitZoom(a: Ansicht): Ansicht {
    if (!this.an) return a;
    return { massstab: a.massstab * this.zoom.z, x0: a.x0 + this.zoom.dx, y0: a.y0 + this.zoom.dy };
  }
  private get pxJeCss(): number {
    const r = this.flaeche.getBoundingClientRect();
    return this.flaeche.width / Math.max(1, r.width);
  }
  private px(e: { clientX: number; clientY: number }): Punkt {
    const r = this.flaeche.getBoundingClientRect();
    const d = this.flaeche.width / Math.max(1, r.width);
    return [(e.clientX - r.left) * d, (e.clientY - r.top) * d];
  }
  private zuFigur(px: Punkt): Punkt {
    const a = this.mitZoom(this.k.ansicht());
    return [a.x0 + px[0] / a.massstab, a.y0 + px[1] / a.massstab];
  }
  private zuBild(q: Punkt): Punkt {
    const a = this.mitZoom(this.k.ansicht());
    return [(q[0] - a.x0) * a.massstab, (q[1] - a.y0) * a.massstab];
  }
  private zoomUm(px: Punkt, faktor: number): void {
    const vorher = this.zuFigur(px);
    const basis = this.k.ansicht();
    const z = Math.max(0.6, Math.min(40, this.zoom.z * faktor));
    const s = basis.massstab * z;
    this.zoom = { z, dx: vorher[0] - px[0] / s - basis.x0, dy: vorher[1] - px[1] / s - basis.y0 };
    this.k.neu();
  }
  ganz(): void {
    this.zoom = { z: 1, dx: 0, dy: 0 };
    this.k.neu();
  }

  // ---- Teile und Treffer -----------------------------------------------------------------------------------------------------

  private teile(): { name: TeilName; weiss: boolean; form: Form }[] {
    const lage = this.k.lage();
    if (!lage) return [];
    const liste = this.k.kopfteile(lage);
    if (this.live) for (const t of liste) if (t.name === this.live.teil) t.form = this.live.form;
    return liste;
  }
  private treffer(px: Punkt): Treffer | null {
    const r = 8 * this.pxJeCss;
    const teile = this.teile();
    const gewaehltesTeil = teile.find((t) => t.name === this.teil);
    if (gewaehltesTeil && this.art !== 'auswahl') {
      for (const j of this.gewaehlt) {
        const a = gewaehltesTeil.form[j];
        if (!a) continue;
        const p = this.zuBild(a.p);
        for (const seite of ['o', 'i'] as const) {
          const g = this.zuBild(a[seite]);
          if (abstand(g, p) > 1 && abstand(g, px) < r) return { art: 'griff', teil: gewaehltesTeil.name, j, seite };
        }
      }
    }
    if (this.art !== 'auswahl') {
      // Anker: erst im gewählten Teil, dann von oben nach unten
      const reihe = [...(gewaehltesTeil ? [gewaehltesTeil] : []), ...teile.filter((t) => t !== gewaehltesTeil).reverse()];
      let best: Treffer | null = null;
      let bestD = r;
      for (const t of reihe) {
        t.form.forEach((a, j) => {
          const d = abstand(this.zuBild(a.p), px);
          if (d < bestD - (t === gewaehltesTeil ? 0 : 0.5)) {
            bestD = d;
            best = { art: 'anker', teil: t.name, j };
          }
        });
        if (best && t === gewaehltesTeil) return best;
      }
      if (best) return best;
    }
    let pfad: Treffer | null = null;
    let pfadD = r * 0.8;
    for (const t of teile) {
      const d = linienAbstand(abflachen(t.form, (q) => this.zuBild(q), 3), px);
      if (d < pfadD) {
        pfadD = d;
        pfad = { art: 'pfad', teil: t.name };
      }
    }
    if (pfad) return pfad;
    for (const t of [...teile].reverse()) if (innen(abflachen(t.form, (q) => this.zuBild(q), 2), px)) return { art: 'innen', teil: t.name };
    return null;
  }

  // ---- Zeiger ----------------------------------------------------------------------------------------------------------------

  private runter(e: PointerEvent): void {
    if (!this.an) return;
    const px = this.px(e);
    this.finger.set(e.pointerId, px);
    this.flaeche.setPointerCapture(e.pointerId);
    if (this.finger.size === 2) {
      // zwei Finger: zoomen und verschieben; was gerade gezogen wurde, gilt nicht
      this.zug = null;
      this.live = null;
      const [a, b] = [...this.finger.values()] as [Punkt, Punkt];
      this.zwei = { abstand: abstand(a, b), mitte: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], zoom0: { ...this.zoom } };
      this.k.neu();
      return;
    }
    if (this.finger.size > 2) return;
    const lage = this.k.lage();
    if (!lage) return;
    if (this.leertaste || e.button === 1) {
      this.zug = { art: 'schwenk', startPx: px, zoom0: { ...this.zoom } };
      return;
    }
    // Schlüssel liegen auf 0,5°: der Kopf rastet dort ein, bevor etwas gezogen wird
    const th = ((lage.theta % 360) + 360) % 360;
    if (Math.abs(th * 2 - Math.round(th * 2)) > 1e-6) {
      this.k.winkelSetzen(Math.round(th * 2) / 2);
      return;
    }
    const t = this.treffer(px);
    const q = this.zuFigur(px);
    const formVon = (n: TeilName): Form => kopie(this.teile().find((x) => x.name === n)!.form);
    if (this.art === 'auswahl') {
      if (t) {
        this.teilWaehlen(t.teil);
        this.gewaehlt.clear();
        this.teile()
          .find((x) => x.name === t.teil)!
          .form.forEach((_, j) => this.gewaehlt.add(j));
        this.zug = { art: 'teil', teil: t.teil, start: q, form0: formVon(t.teil), bewegt: false };
      } else {
        this.teil = null;
        this.gewaehlt.clear();
      }
      this.k.neu();
      return;
    }
    if (this.art === 'umwandeln') {
      if (t?.art === 'anker') {
        this.teilWaehlen(t.teil);
        this.gewaehlt.clear();
        this.gewaehlt.add(t.j);
        this.zug = { art: 'herausziehen', teil: t.teil, start: q, form0: formVon(t.teil), j: t.j, bewegt: false };
      } else if (t?.art === 'griff') {
        this.zug = { art: 'griff', teil: t.teil, start: q, form0: formVon(t.teil), j: t.j, seite: t.seite, brechen: true, bewegt: false };
      } else if (t) this.teilWaehlen(t.teil);
      this.k.neu();
      return;
    }
    // Direktauswahl
    if (t?.art === 'griff') {
      this.zug = { art: 'griff', teil: t.teil, start: q, form0: formVon(t.teil), j: t.j, seite: t.seite, brechen: e.altKey, bewegt: false };
      return;
    }
    if (t?.art === 'anker') {
      this.teilWaehlen(t.teil);
      if (e.shiftKey) {
        if (this.gewaehlt.has(t.j)) this.gewaehlt.delete(t.j);
        else this.gewaehlt.add(t.j);
      } else if (!this.gewaehlt.has(t.j)) {
        this.gewaehlt.clear();
        this.gewaehlt.add(t.j);
      }
      if (this.gewaehlt.has(t.j)) this.zug = { art: 'anker', teil: t.teil, start: q, form0: formVon(t.teil), welche: [...this.gewaehlt], bewegt: false };
      this.k.neu();
      return;
    }
    // sonst (Pfad, Fläche, daneben): Ziehen zieht einen Rahmen auf; ein Klick auf einen Pfad oder in eine Fläche wählt ihr Teil
    if (!e.shiftKey) this.gewaehlt.clear();
    this.zug = { art: 'rahmen', startPx: px, jetztPx: px, dazu: e.shiftKey, teilBeiKlick: t?.teil ?? null };
    this.k.neu();
  }

  private bewegen(e: PointerEvent): void {
    if (!this.an) return;
    const px = this.px(e);
    if (this.finger.has(e.pointerId)) this.finger.set(e.pointerId, px);
    if (this.zwei && this.finger.size === 2) {
      const [a, b] = [...this.finger.values()] as [Punkt, Punkt];
      const mitte: Punkt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const basis = this.k.ansicht();
      const z0 = this.zwei.zoom0;
      // der Figurpunkt unter der Mitte beim Aufsetzen bleibt unter der Mitte der Finger
      const s0 = basis.massstab * z0.z;
      const X: Punkt = [basis.x0 + z0.dx + this.zwei.mitte[0] / s0, basis.y0 + z0.dy + this.zwei.mitte[1] / s0];
      const z = Math.max(0.6, Math.min(40, z0.z * (abstand(a, b) / Math.max(1, this.zwei.abstand))));
      const s = basis.massstab * z;
      this.zoom = { z, dx: X[0] - mitte[0] / s - basis.x0, dy: X[1] - mitte[1] / s - basis.y0 };
      this.k.neu();
      return;
    }
    const z = this.zug;
    if (!z) {
      if (e.pointerType === 'mouse') this.zeiger(this.treffer(px));
      return;
    }
    if (z.art === 'schwenk') {
      const s = this.k.ansicht().massstab * z.zoom0.z;
      this.zoom = { z: z.zoom0.z, dx: z.zoom0.dx - (px[0] - z.startPx[0]) / s, dy: z.zoom0.dy - (px[1] - z.startPx[1]) / s };
      this.k.neu();
      return;
    }
    if (z.art === 'rahmen') {
      z.jetztPx = px;
      this.k.neu();
      return;
    }
    const q = this.zuFigur(px);
    let v: Punkt = minus(q, z.start);
    if (e.shiftKey && (z.art === 'anker' || z.art === 'teil')) v = einrasten45(v);
    if (abstand(this.zuBild(q), this.zuBild(z.start)) > 2 * this.pxJeCss) z.bewegt = true;
    if (!z.bewegt) return;
    const f = kopie(z.form0);
    if (z.art === 'anker') for (const j of z.welche) ankerVerschieben(f[j]!, v);
    else if (z.art === 'teil') for (const a of f) ankerVerschieben(a, v);
    else if (z.art === 'griff') {
      const a = f[z.j]!;
      const a0 = z.form0[z.j]!;
      a[z.seite] = plus(a0[z.seite], v);
      // glatter Anker: der Gegengriff dreht mit und behält seine Länge (mit ⌥ wird der Anker eine Ecke)
      if (!z.brechen && istGlatt(a0)) {
        const gegen = z.seite === 'i' ? 'o' : 'i';
        const lg = abstand(a0[gegen], a0.p);
        const r = minus(a.p, a[z.seite]);
        const l = Math.hypot(r[0], r[1]);
        if (l > 1e-6) a[gegen] = [a.p[0] + (r[0] / l) * lg, a.p[1] + (r[1] / l) * lg];
      }
    } else if (z.art === 'herausziehen') {
      // aus dem Anker ziehen: der Griff in Zugrichtung folgt dem Zeiger, der Gegengriff spiegelt ihn
      const a = f[z.j]!;
      const d = minus(q, a.p);
      a.o = plus(a.p, d);
      a.i = minus(a.p, d);
    }
    this.live = { teil: z.teil, form: f };
    this.k.neu();
  }

  private hoch(e: PointerEvent, abbruch: boolean): void {
    this.finger.delete(e.pointerId);
    if (this.zwei) {
      if (this.finger.size < 2) this.zwei = null;
      return;
    }
    const z = this.zug;
    this.zug = null;
    if (!z) return;
    if (z.art === 'rahmen') {
      if (!abbruch) {
        const klick = Math.abs(z.jetztPx[0] - z.startPx[0]) < 3 && Math.abs(z.jetztPx[1] - z.startPx[1]) < 3;
        if (!klick) this.rahmenWaehlen(z);
        else if (z.teilBeiKlick) this.teilWaehlen(z.teilBeiKlick);
        else if (!z.dazu) {
          this.teil = null;
          this.gewaehlt.clear();
        }
      }
      this.k.neu();
      return;
    }
    if (z.art === 'schwenk') return;
    if (z.art === 'herausziehen' && !z.bewegt && !abbruch) {
      const f = kopie(z.form0);
      umwandeln(f, z.j);
      this.festhalten(z.teil, f);
      return;
    }
    if (abbruch || !z.bewegt || !this.live) {
      this.live = null;
      this.k.neu();
      return;
    }
    this.festhalten(this.live.teil, this.live.form);
  }

  private rahmenWaehlen(z: { startPx: Punkt; jetztPx: Punkt; dazu: boolean }): void {
    const x0 = Math.min(z.startPx[0], z.jetztPx[0]);
    const x1 = Math.max(z.startPx[0], z.jetztPx[0]);
    const y0 = Math.min(z.startPx[1], z.jetztPx[1]);
    const y1 = Math.max(z.startPx[1], z.jetztPx[1]);
    const drin = (q: Punkt): boolean => {
      const p = this.zuBild(q);
      return p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
    };
    const teile = this.teile();
    // im gewählten Teil, sonst im Teil mit den meisten Ankern im Rahmen
    let ziel = teile.find((t) => t.name === this.teil && t.form.some((a) => drin(a.p)));
    if (!ziel) {
      let meiste = 0;
      for (const t of teile) {
        const n = t.form.filter((a) => drin(a.p)).length;
        if (n > meiste) {
          meiste = n;
          ziel = t;
        }
      }
    }
    if (!ziel) return;
    if (ziel.name !== this.teil) this.teilWaehlen(ziel.name);
    else if (!z.dazu) this.gewaehlt.clear();
    ziel.form.forEach((a, j) => {
      if (drin(a.p)) this.gewaehlt.add(j);
    });
  }

  private rad(e: WheelEvent): void {
    if (!this.an) return;
    e.preventDefault();
    const zeilen = e.deltaMode === 1 ? 16 : 1;
    if (e.ctrlKey || e.metaKey) this.zoomUm(this.px(e), Math.exp(-e.deltaY * zeilen * 0.01));
    else {
      const s = this.k.ansicht().massstab * this.zoom.z;
      const d = this.pxJeCss;
      this.zoom = { ...this.zoom, dx: this.zoom.dx + (e.deltaX * zeilen * d) / s, dy: this.zoom.dy + (e.deltaY * zeilen * d) / s };
      this.k.neu();
    }
  }

  private zeiger(t: Treffer | null): void {
    this.flaeche.style.cursor = this.leertaste ? 'grab' : t?.art === 'anker' || t?.art === 'griff' ? 'pointer' : t ? (this.art === 'auswahl' ? 'move' : 'default') : 'crosshair';
  }

  // ---- Schlüssel ---------------------------------------------------------------------------------------------------------------

  private teilWaehlen(n: TeilName): void {
    if (n !== this.teil) {
      this.teil = n;
      this.gewaehlt.clear();
    }
  }

  /** die bearbeitete Form wird ein Schlüssel des Teils bei diesem Winkel */
  private festhalten(teil: TeilName, form: Form): void {
    const lage = this.k.lage();
    if (!lage) return;
    const k = this.k.korrekturAus(teil, lage, form);
    const neu: KopfKorrektur = { teil: k.teil, w: k.w, form: k.form.map((a) => ({ p: [runden(a.p[0]), runden(a.p[1])], i: [runden(a.i[0]), runden(a.i[1])], o: [runden(a.o[0]), runden(a.o[1])] })) };
    this.zurueckStapel.push(this.liste);
    this.vorStapel.length = 0;
    this.liste = [...this.liste.filter((x) => !(x.teil === neu.teil && x.w === neu.w)), neu];
    this.anwenden();
  }
  private anwenden(): void {
    this.live = null;
    this.k.korrekturenSetzen(this.liste);
    this.listeZeigen();
    this.speichern();
    this.k.neu();
  }
  zurueck(): void {
    const v = this.zurueckStapel.pop();
    if (!v) return;
    this.vorStapel.push(this.liste);
    this.liste = v;
    this.anwenden();
  }
  wieder(): void {
    const n = this.vorStapel.pop();
    if (!n) return;
    this.zurueckStapel.push(this.liste);
    this.liste = n;
    this.anwenden();
  }
  private loeschen(i: number): void {
    if (!this.liste[i]) return;
    this.zurueckStapel.push(this.liste);
    this.vorStapel.length = 0;
    this.liste = this.liste.filter((_, k) => k !== i);
    this.anwenden();
  }
  private verschieben(v: Punkt): void {
    const lage = this.k.lage();
    const t = this.teile().find((x) => x.name === this.teil);
    if (!lage || !t || !this.gewaehlt.size) return;
    const f = kopie(t.form);
    for (const j of this.gewaehlt) if (f[j]) ankerVerschieben(f[j]!, v);
    this.festhalten(t.name, f);
  }

  async laden(): Promise<void> {
    try {
      const r = await fetch(DATEI, { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      this.liste = schluesselLesen(await r.json());
      this.k.korrekturenSetzen(this.liste);
      this.standSetzen(this.liste.length ? `${this.liste.length} Schlüssel geladen` : '');
    } catch {
      this.standSetzen('Schlüsseldatei nicht erreichbar (läuft der Dev-Server?)');
    }
    this.listeZeigen();
    this.k.neu();
  }
  private speichern(): void {
    window.clearTimeout(this.speicherUhr);
    this.standSetzen('speichert …');
    this.speicherUhr = window.setTimeout(() => {
      fetch(DATEI, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: schluesselSchreiben(this.liste) })
        .then((r) => this.standSetzen(r.ok ? `gespeichert: ${this.liste.length} Schlüssel` : `nicht gespeichert (${r.status})`))
        .catch(() => this.standSetzen('nicht gespeichert (Dev-Server nicht erreichbar)'));
    }, 300);
  }
  private standSetzen(text: string): void {
    this.stand = text;
    const el = document.getElementById('speicherStand');
    if (el) el.textContent = text;
  }

  // ---- Tasten ------------------------------------------------------------------------------------------------------------------

  private taste(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const meta = e.metaKey || e.ctrlKey;
    const k = e.key;
    if (!meta && !e.altKey && !e.shiftKey && k.toLowerCase() === 'b') {
      if (this.bearbeitbar) {
        this.umschalten();
        e.preventDefault();
      }
      return;
    }
    if (!this.an) return;
    if (meta && k.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.wieder();
      else this.zurueck();
      return;
    }
    if (meta && k === '0') {
      e.preventDefault();
      this.ganz();
      return;
    }
    if (meta && (k === '=' || k === '+' || k === '-')) {
      e.preventDefault();
      this.zoomUm([this.flaeche.width / 2, this.flaeche.height / 2], k === '-' ? 1 / 1.4 : 1.4);
      return;
    }
    if (meta && k.toLowerCase() === 'a') {
      e.preventDefault();
      const t = this.teile().find((x) => x.name === this.teil);
      if (t) t.form.forEach((_, j) => this.gewaehlt.add(j));
      this.k.neu();
      return;
    }
    if (meta || e.altKey) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!this.leertaste) {
        this.leertaste = true;
        this.zeiger(null);
      }
      return;
    }
    const pfeil: Record<string, Punkt> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (pfeil[k]) {
      e.preventDefault();
      const s = e.shiftKey ? 10 : 1;
      this.verschieben([pfeil[k][0] * s, pfeil[k][1] * s]);
      return;
    }
    const kl = k.toLowerCase();
    if (kl === 'a' && !e.shiftKey) this.artSetzen('direkt');
    else if (kl === 'v' && !e.shiftKey) this.artSetzen('auswahl');
    else if (kl === 'c' && e.shiftKey) this.artSetzen('umwandeln');
    else if ((kl === 'j' || kl === 'k') && !e.shiftKey) this.schluesselSprung(kl === 'j' ? -1 : 1);
    else if (k === 'Escape') {
      if (this.gewaehlt.size) this.gewaehlt.clear();
      else this.teil = null;
      this.k.neu();
    } else if (k === ',' || k === '.' || k === ';' || k === ':') {
      const lage = this.k.lage();
      if (!lage) return;
      const schritt = (k === ',' || k === ';' ? -1 : 1) * (e.shiftKey ? 5 : 1);
      this.k.winkelSetzen(Math.round((lage.theta + schritt) * 2) / 2);
    } else return;
    e.preventDefault();
  }

  // ---- Leiste ------------------------------------------------------------------------------------------------------------------

  artSetzen(a: WerkzeugArt): void {
    this.art = a;
    this.zug = null;
    this.live = null;
    this.k.neu();
  }
  umschalten(): void {
    this.an = !this.an;
    this.zug = null;
    this.live = null;
    this.zlZug = null;
    this.zlHover = null;
    if (this.an) {
      const lage = this.k.lage();
      if (lage) this.k.winkelSetzen(Math.round((((lage.theta % 360) + 360) % 360) * 2) / 2);
    } else {
      this.zoom = { z: 1, dx: 0, dy: 0 };
      this.teil = null;
      this.gewaehlt.clear();
    }
    this.k.neu();
  }

  leisteHtml(): string {
    return `
    <div id="bearbeiten">
      <h2>Bearbeiten</h2>
      <div class="knoepfe"><button type="button" class="knopf" id="bearbeitenAn" title="Taste B">Bearbeiten</button></div>
      <div id="werkzeuge">
        <div class="knoepfe">
          <button type="button" class="knopf" data-werkzeug="direkt" title="Taste A">Direktauswahl</button>
          <button type="button" class="knopf" data-werkzeug="auswahl" title="Taste V">Auswahl</button>
          <button type="button" class="knopf" data-werkzeug="umwandeln" title="⇧C">Ankerpunkt</button>
        </div>
        <div class="knoepfe">
          <button type="button" class="knopf" id="werkzeugZurueck" title="⌘Z">Zurück</button>
          <button type="button" class="knopf" id="werkzeugWieder" title="⇧⌘Z">Wieder</button>
          <button type="button" class="knopf" id="werkzeugGanz" title="⌘0">Ganze Figur</button>
        </div>
        <p class="hinweis">Anker und Griffe ziehen; ⇧ für mehrere oder einen Rahmen aufziehen; Pfeiltasten (⇧ 10). Ein glatter Anker bleibt glatt,
        mit ⌥ am Griff wird er eine Ecke. Ankerpunkt: Klick macht Ecke ↔ glatt, aus dem Anker ziehen zieht Griffe heraus. ⌘ + Scrollen zoomt,
        Scrollen oder Leertaste + Ziehen verschiebt. „,“ und „.“ drehen den Kopf um 1° (⇧ 5°). Jede Änderung ist ein Schlüssel bei diesem
        Winkel, davor und danach blendet es weich ein; die zweite Hälfte gilt gespiegelt mit.</p>
        <p class="hinweis">Zeitleiste unten: alle Schlüssel je Teil. <span class="marke vorlage">◆</span> deine Vorlage,
        <span class="marke gebaut">◇</span> von mir gebaut, <span class="marke falte">•</span> mein verborgener Faltschlüssel,
        <span class="marke dein">◆</span> dein Schlüssel; ab 180° gespiegelt (grau hinterlegt). Klick auf einen Schlüssel springt hin, Ziehen
        dreht den Kopf. J und K springen zum vorigen und nächsten Schlüssel des gewählten Teils. Rot umrandet: meine Schlüssel, die ein Zug
        hier ersetzt (näher als 4°).</p>
        <h3 class="unter">Deine Schlüssel</h3>
        <ul id="schluesselListe"></ul>
        <p class="hinweis" id="speicherStand">${this.stand}</p>
      </div>
    </div>`;
  }
  leisteVerbinden(): void {
    document.getElementById('bearbeitenAn')!.addEventListener('click', () => this.umschalten());
    document.querySelectorAll<HTMLButtonElement>('[data-werkzeug]').forEach((b) => b.addEventListener('click', () => this.artSetzen(b.dataset.werkzeug as WerkzeugArt)));
    document.getElementById('werkzeugZurueck')!.addEventListener('click', () => this.zurueck());
    document.getElementById('werkzeugWieder')!.addEventListener('click', () => this.wieder());
    document.getElementById('werkzeugGanz')!.addEventListener('click', () => this.ganz());
    document.getElementById('schluesselListe')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      if (b.dataset.weg !== undefined) this.loeschen(Number(b.dataset.weg));
      else if (b.dataset.hin !== undefined) {
        const k = this.liste[Number(b.dataset.hin)];
        if (!k) return;
        if (!this.an) this.umschalten();
        this.teilWaehlen(k.teil);
        this.k.winkelSetzen(k.w);
      }
    });
    this.listeZeigen();
  }
  /** Leiste nachführen: sichtbar, wo der Kopf über θ dreht */
  anzeigen(bearbeitbar: boolean): void {
    this.bearbeitbar = bearbeitbar;
    if (!bearbeitbar && this.an) this.umschalten();
    const bereich = document.getElementById('bearbeiten');
    if (bereich) bereich.style.display = bearbeitbar ? '' : 'none';
    const werkzeuge = document.getElementById('werkzeuge');
    if (werkzeuge) werkzeuge.style.display = this.an ? '' : 'none';
    document.getElementById('bearbeitenAn')?.classList.toggle('an', this.an);
    document.querySelectorAll<HTMLButtonElement>('[data-werkzeug]').forEach((b) => b.classList.toggle('an', b.dataset.werkzeug === this.art));
    this.zl.classList.toggle('an', this.an);
    this.flaeche.style.pointerEvents = this.an ? 'auto' : '';
    this.flaeche.style.touchAction = this.an ? 'none' : '';
    if (!this.an) this.flaeche.style.cursor = '';
  }
  private listeZeigen(): void {
    const ul = document.getElementById('schluesselListe');
    if (!ul) return;
    const sortiert = this.liste.map((k, i) => ({ k, i })).sort((a, b) => a.k.w - b.k.w || a.k.teil.localeCompare(b.k.teil));
    ul.innerHTML = sortiert.length
      ? sortiert
          .map(
            ({ k, i }) =>
              `<li><button type="button" class="eintrag" data-hin="${i}">${gradText(k.w)}° · ${NAMEN[k.teil] ?? k.teil}</button><button type="button" class="weg" data-weg="${i}" title="Schlüssel löschen">×</button></li>`,
          )
          .join('')
      : '<li class="leer">noch keine</li>';
  }

  // ---- Bild ----------------------------------------------------------------------------------------------------------------------

  /** Prüfhaken: Ort eines Ankers (oder Griffs) im Bild, in CSS-Bildpunkten vom Rand der Bühne */
  ankerImBild(teil: TeilName, j: number, wo: 'p' | 'i' | 'o' = 'p'): Punkt | null {
    const a = this.teile().find((x) => x.name === teil)?.form[j];
    if (!a) return null;
    const p = this.zuBild(a[wo]);
    const d = this.pxJeCss;
    return [p[0] / d, p[1] / d];
  }
  /** Prüfhaken: die Schlüssel, wie sie gespeichert werden */
  schluessel(): readonly KopfKorrektur[] {
    return this.liste;
  }

  /** die gezogene Form schon im Bild, bevor sie ein Schlüssel ist */
  ersetzen(szene: Szene): void {
    if (!this.an || !this.live) return;
    const t = szene.teile.find((x) => x.name === this.live!.teil);
    if (t) t.form = this.live.form;
  }

  /** Pfade, Anker und Griffe über dem Bild */
  zeichnen(ctx: CanvasRenderingContext2D): void {
    if (!this.an) return;
    const lage = this.k.lage();
    if (!lage) return;
    const d = this.pxJeCss;
    const teile = this.teile();
    const pfad = (f: Form): void => {
      const p = abflachen(f, (q) => this.zuBild(q), 3);
      ctx.beginPath();
      for (let k = 0; k < p.length; k += 2) (k ? ctx.lineTo : ctx.moveTo).call(ctx, p[k]!, p[k + 1]!);
      ctx.closePath();
    };
    const quadrat = (p: Punkt, r: number, voll: boolean, farbe: string): void => {
      ctx.fillStyle = voll ? farbe : '#fff';
      ctx.strokeStyle = farbe;
      ctx.lineWidth = d;
      ctx.fillRect(p[0] - r, p[1] - r, 2 * r, 2 * r);
      ctx.strokeRect(p[0] - r, p[1] - r, 2 * r, 2 * r);
    };
    for (const t of teile) {
      if (t.name === this.teil) continue;
      pfad(t.form);
      ctx.strokeStyle = 'rgba(31, 111, 235, 0.38)';
      ctx.lineWidth = d;
      ctx.stroke();
      for (const a of t.form) quadrat(this.zuBild(a.p), 2 * d, false, 'rgba(31, 111, 235, 0.45)');
    }
    const t = teile.find((x) => x.name === this.teil);
    if (t) {
      pfad(t.form);
      ctx.strokeStyle = BLAU;
      ctx.lineWidth = 1.5 * d;
      ctx.stroke();
      for (const j of this.gewaehlt) {
        const a = t.form[j];
        if (!a) continue;
        const p = this.zuBild(a.p);
        for (const g of [a.i, a.o]) {
          const q = this.zuBild(g);
          if (abstand(p, q) < 1) continue;
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(q[0], q[1]);
          ctx.strokeStyle = BLAU;
          ctx.lineWidth = d;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(q[0], q[1], 3.2 * d, 0, 2 * Math.PI);
          ctx.fillStyle = BLAU;
          ctx.fill();
        }
      }
      t.form.forEach((a, j) => quadrat(this.zuBild(a.p), 3.2 * d, this.gewaehlt.has(j), BLAU));
    }
    if (this.zug?.art === 'rahmen') {
      const z = this.zug;
      ctx.setLineDash([4 * d, 3 * d]);
      ctx.strokeStyle = BLAU;
      ctx.lineWidth = d;
      ctx.strokeRect(Math.min(z.startPx[0], z.jetztPx[0]), Math.min(z.startPx[1], z.jetztPx[1]), Math.abs(z.jetztPx[0] - z.startPx[0]), Math.abs(z.jetztPx[1] - z.startPx[1]));
      ctx.setLineDash([]);
    }
    // oben links: Winkel, Teil, wessen Schlüssel hier liegt (über der Zeitleiste: der Schlüssel unter dem Zeiger)
    const th = ((lage.theta % 360) + 360) % 360;
    const { text, zusatz } = this.status(th);
    ctx.font = `${12 * d}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = BLAU;
    ctx.fillText(text, 20 * d, 76 * d);
    if (zusatz) {
      ctx.fillStyle = this.zlHover ? 'rgba(31, 111, 235, 0.7)' : ROT;
      ctx.fillText(zusatz, 20 * d, 94 * d);
    }
    this.zlZeichnen(th);
  }

  /** Zeilen oben links: Winkel, Teil und wessen Schlüssel hier liegt; darunter, was ein Zug hier ersetzt */
  private status(th: number): { text: string; zusatz: string } {
    let text = `${gradText(Math.round(th * 10) / 10)}°  ·  ${this.teil ? (NAMEN[this.teil] ?? this.teil) : 'Teil oder Anker anklicken'}`;
    let zusatz = '';
    if (this.zlHover) {
      const h = this.zlHover;
      text = `${gradText(Math.round(h.w * 10) / 10)}°  ·  ${NAMEN[h.teil] ?? h.teil}  ·  ${herkunft(h)}`;
      zusatz = 'Klick springt hin';
    } else if (this.teil) {
      const hier = this.k.schluessel().find((x) => x.teil === this.teil && Math.abs(x.w - th) < 0.01);
      text += `  ·  ${hier ? herkunft(hier) : 'zwischen zwei Schlüsseln'}`;
      const weg = this.wegfallend(th);
      if (weg.length) zusatz = `Ziehen hier ersetzt ${weg.length === 1 ? 'meinen Schlüssel' : 'meine Schlüssel'} bei ${gradListe(weg)} (näher als ${KORREKTUR_NAH}°)`;
    }
    if (this.zoom.z !== 1) text += `  ·  Zoom ${Math.round(this.zoom.z * 100)} %`;
    return { text, zusatz };
  }
  /** Prüfhaken: die Zeilen oben links */
  statusText(): string {
    const lage = this.k.lage();
    if (!lage || !this.an) return '';
    const { text, zusatz } = this.status(((lage.theta % 360) + 360) % 360);
    return zusatz ? `${text} | ${zusatz}` : text;
  }

  // ---- Zeitleiste ----------------------------------------------------------------------------------------------------------------

  /**
   * gebaute Schlüssel des gewählten Teils, die ein Schlüssel an diesem Winkel ersetzen würde (raster.ts, korrekturEinsetzen): näher als
   * KORREKTUR_NAH, auf derselben Hälfte, nicht an den gezeichneten Winkeln
   */
  private wegfallend(th: number): number[] {
    if (!this.teil) return [];
    const w = Math.round(th * 2) / 2;
    const fest = [0, 45, 90, 180];
    return this.k
      .schluessel()
      .filter((x) => x.teil === this.teil && x.art === 'gebaut' && x.w !== w && Math.abs(x.w - w) < KORREKTUR_NAH && (w <= 180 ? x.w <= 180 : x.w > 180) && !fest.includes(x.w <= 180 ? x.w : 360 - x.w))
      .map((x) => x.w);
  }
  private zlX(w: number): number {
    const b = this.zl.clientWidth;
    return this.zlm.links + (w / this.k.bereich()) * Math.max(1, b - this.zlm.links - this.zlm.rechts);
  }
  private zlWinkel(x: number): number {
    const b = this.zl.clientWidth;
    const max = this.k.bereich();
    return Math.max(0, Math.min(max, ((x - this.zlm.links) / Math.max(1, b - this.zlm.links - this.zlm.rechts)) * max));
  }
  private zlZeile(y: number): number {
    const i = Math.floor((y - this.zlm.lineal) / this.zlm.zeile);
    return i >= 0 && i < ZEILEN.length ? i : -1;
  }
  private zlPunkt(e: PointerEvent): Punkt {
    const r = this.zl.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  /** der Schlüssel der Zeile, der x am nächsten liegt (höchstens `radius` Bildpunkte daneben: die Maus trifft die Raute, der Finger etwas daneben) */
  private zlTreffer(x: number, zeile: number, radius = 5): SchluesselEintrag | null {
    if (zeile < 0) return null;
    const max = this.k.bereich();
    let best: SchluesselEintrag | null = null;
    let bestD = radius;
    for (const e of this.k.schluessel()) {
      if (e.teil !== ZEILEN[zeile] || e.w > max + 1e-6) continue;
      const d = Math.abs(this.zlX(e.w) - x);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }
  private zlRunter(e: PointerEvent): void {
    if (!this.an || !this.k.lage()) return;
    e.preventDefault();
    this.zl.setPointerCapture(e.pointerId);
    const [x, y] = this.zlPunkt(e);
    const zeile = this.zlZeile(y);
    if (zeile >= 0) this.teilWaehlen(ZEILEN[zeile]!);
    // Klick auf den Namen: nur das Teil wählen, der Winkel bleibt
    if (x < this.zlm.links - 6) {
      this.k.neu();
      return;
    }
    const t = this.zlTreffer(x, zeile, e.pointerType === 'mouse' ? 5 : 9);
    this.zlZug = { zeile };
    this.k.winkelSetzen(t ? t.w : Math.round(this.zlWinkel(x) * 2) / 2);
  }
  private zlBewegen(e: PointerEvent): void {
    if (!this.an) return;
    const [x, y] = this.zlPunkt(e);
    if (this.zlZug) {
      // Ziehen dreht den Kopf (auf 0,5°); nahe einem Schlüssel des gewählten Teils rastet er dort ein
      const t = this.zlTreffer(x, this.teil ? ZEILEN.indexOf(this.teil) : -1);
      this.k.winkelSetzen(t ? t.w : Math.round(this.zlWinkel(x) * 2) / 2);
      return;
    }
    const t = this.zlTreffer(x, this.zlZeile(y));
    this.zl.style.cursor = t || (x < this.zlm.links - 6 && this.zlZeile(y) >= 0) ? 'pointer' : 'ew-resize';
    this.zlHoverSetzen(t);
  }
  private zlHoverSetzen(t: SchluesselEintrag | null): void {
    if (t === this.zlHover) return;
    this.zlHover = t;
    this.k.neu();
  }
  /** zum vorigen (−1) oder nächsten (+1) Schlüssel des gewählten Teils, ohne Teil aller Kopfteile; Faltschlüssel zählen nicht */
  schluesselSprung(richtung: -1 | 1): void {
    const lage = this.k.lage();
    if (!lage) return;
    const th = ((lage.theta % 360) + 360) % 360;
    const max = this.k.bereich();
    const ws = [...new Set(this.k.schluessel().filter((x) => x.art !== 'falte' && x.w <= max && (!this.teil || x.teil === this.teil)).map((x) => x.w))].sort((a, b) => a - b);
    const ziel = richtung < 0 ? ws.filter((w) => w < th - 1e-6).pop() : ws.find((w) => w > th + 1e-6);
    if (ziel !== undefined) this.k.winkelSetzen(ziel);
  }

  private zlZeichnen(th: number): void {
    const c = this.zl;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const b = c.clientWidth;
    const h = c.clientHeight;
    if (!b || !h) return;
    if (c.width !== Math.round(b * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(b * dpr);
      c.height = Math.round(h * dpr);
    }
    this.zlMasse();
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, b, h);
    const max = this.k.bereich();
    const x = (w: number): number => this.zlX(w);
    const y0 = this.zlm.lineal;
    const y1 = this.zlm.lineal + ZEILEN.length * this.zlm.zeile;
    // zweite Hälfte (gespiegelt) grau hinterlegt, das gewählte Teil blau
    if (max > 180) {
      g.fillStyle = 'rgba(31, 26, 23, 0.045)';
      g.fillRect(x(180), y0, x(max) - x(180), y1 - y0);
    }
    const zi = this.teil ? ZEILEN.indexOf(this.teil) : -1;
    if (zi >= 0) {
      g.fillStyle = 'rgba(31, 111, 235, 0.09)';
      g.fillRect(0, y0 + zi * this.zlm.zeile, b, this.zlm.zeile);
    }
    // Lineal
    const fein = max > 90 ? 5 : 1;
    const grob = max > 90 ? 45 : 15;
    g.strokeStyle = 'rgba(31, 26, 23, 0.32)';
    g.lineWidth = 1;
    g.beginPath();
    for (let w = 0; w <= max + 1e-6; w += fein) {
      const xx = Math.round(x(w)) + 0.5;
      g.moveTo(xx, y0);
      g.lineTo(xx, y0 - (w % grob === 0 ? 7 : w % (fein * 2) === 0 ? 4 : 2.5));
    }
    g.stroke();
    g.font = `${this.zlm.schrift}px system-ui, -apple-system, sans-serif`;
    g.fillStyle = 'rgba(31, 26, 23, 0.55)';
    for (let w = 0; w <= max + 1e-6; w += grob) {
      g.textAlign = w === 0 ? 'left' : w >= max ? 'right' : 'center';
      g.fillText(`${w}°`, x(w) + (w === 0 ? -2 : w >= max ? 3 : 0), y0 - 10);
    }
    // Zeilen
    g.textAlign = 'left';
    ZEILEN.forEach((n, i) => {
      const ym = y0 + i * this.zlm.zeile + this.zlm.zeile / 2;
      g.fillStyle = i === zi ? BLAU : 'rgba(31, 26, 23, 0.62)';
      g.fillText(NAMEN[n] ?? n, 12, ym + 3.5);
      g.strokeStyle = 'rgba(31, 26, 23, 0.09)';
      g.beginPath();
      g.moveTo(x(0), Math.round(ym) + 0.5);
      g.lineTo(x(max), Math.round(ym) + 0.5);
      g.stroke();
    });
    // Schlüssel
    const weg = new Set(this.wegfallend(th));
    for (const e of this.k.schluessel()) {
      if (e.w > max + 1e-6) continue;
      const i = ZEILEN.indexOf(e.teil);
      if (i < 0) continue;
      const cx = x(e.w);
      const cy = y0 + i * this.zlm.zeile + this.zlm.zeile / 2;
      const gross = (e === this.zlHover ? 1.45 : 1) * (this.zlm.zeile / 15);
      g.globalAlpha = e.w > 180 && e.w < 360 ? 0.6 : 1;
      if (e.art === 'falte') {
        g.fillStyle = 'rgba(31, 26, 23, 0.5)';
        g.beginPath();
        g.arc(cx, cy, 1.8 * gross, 0, 2 * Math.PI);
        g.fill();
      } else {
        const r = (e.art === 'dein' ? 5 : 4.4) * gross;
        g.beginPath();
        g.moveTo(cx, cy - r);
        g.lineTo(cx + r, cy);
        g.lineTo(cx, cy + r);
        g.lineTo(cx - r, cy);
        g.closePath();
        const ersetzt = e.art === 'gebaut' && e.teil === this.teil && weg.has(e.w);
        g.fillStyle = e.art === 'dein' ? BLAU : e.art === 'vorlage' ? TINTE : ersetzt ? '#fde3e2' : '#fff';
        g.fill();
        g.lineWidth = ersetzt ? 1.6 : 1.1;
        g.strokeStyle = e.art === 'dein' ? BLAU : ersetzt ? ROT : TINTE;
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    // Abspielkopf mit dem Winkel
    const xp = x(Math.min(max, th));
    g.strokeStyle = BLAU;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(xp, y0 - 3);
    g.lineTo(xp, y1);
    g.stroke();
    const txt = `${gradText(Math.round(th * 10) / 10)}°`;
    g.font = '600 10px system-ui, -apple-system, sans-serif';
    const tb = g.measureText(txt).width + 8;
    const fx = Math.max(0, Math.min(b - tb, xp - tb / 2));
    g.fillStyle = BLAU;
    g.beginPath();
    g.roundRect(fx, 1, tb, 13, 3);
    g.fill();
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.fillText(txt, fx + tb / 2, 11);
    g.textAlign = 'left';
  }

  /** Prüfhaken: Ort eines Schlüssels in der Zeitleiste (Bildschirm, CSS-Bildpunkte) */
  zeitleisteOrt(teil: TeilName, w: number): Punkt | null {
    const i = ZEILEN.indexOf(teil);
    if (i < 0 || !this.an) return null;
    const r = this.zl.getBoundingClientRect();
    return [r.left + this.zlX(w), r.top + this.zlm.lineal + i * this.zlm.zeile + this.zlm.zeile / 2];
  }
  /** Prüfhaken: alle Schlüssel mit Herkunft */
  uebersicht(): readonly SchluesselEintrag[] {
    return this.k.schluessel();
  }
}
