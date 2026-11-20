/**
 * Die Wahl der Shader (20.11.2026): eine Tafel unten rechts, solange das Material „Shader“ gilt. Fünf Gruppen (Spider-Verse, Anime &
 * Manga, Materialien, Tiermuster, Effekte), jede klappt auf und zu; offen ist immer die Gruppe des gewählten Shaders. Je Shader ein
 * Knopf; darunter seine Zeile und seine Regler, oben „Bühne“ (der Shader darf seinen eigenen Grund zeichnen). Gemerkt werden Wahl,
 * Bühne, offene Gruppen und die Werte der Regler je Shader (`localStorage`).
 */
import { SHADER_GRUPPEN, type ShaderGruppe, type Voreinstellung } from './kern';

type Gemerkt = { wahl: string; buehne: boolean; offen: string[]; werte: Record<string, Record<string, number>> };

const SPEICHER = 'ozzy.shader';

export class ShaderWahl {
  readonly el: HTMLElement;
  private readonly liste: Voreinstellung[];
  private readonly knoepfe = new Map<string, HTMLButtonElement>();
  private readonly gruppenEl = new Map<ShaderGruppe, { kopf: HTMLButtonElement; reihe: HTMLElement }>();
  private readonly zeileEl: HTMLElement;
  private readonly reglerEl: HTMLElement;
  private readonly buehneKnopf: HTMLButtonElement;
  private g: Gemerkt;
  /** meldet jede Änderung (Ozzy zeichnet neu) */
  aenderung: () => void = () => {};

  constructor(el: HTMLElement, liste: Voreinstellung[], start: string | null) {
    this.el = el;
    this.liste = liste;
    this.g = this.lesen();
    if (start && liste.some((v) => v.id === start)) this.g.wahl = start;
    if (!liste.some((v) => v.id === this.g.wahl)) this.g.wahl = liste[0]!.id;
    el.replaceChildren();
    const kopf = document.createElement('div');
    kopf.className = 'shader-kopf';
    const titel = document.createElement('span');
    titel.className = 'shader-titel';
    titel.textContent = 'Shader';
    this.buehneKnopf = document.createElement('button');
    this.buehneKnopf.type = 'button';
    this.buehneKnopf.textContent = 'Bühne';
    this.buehneKnopf.title = 'Der Shader zeichnet seinen eigenen Grund (dunkel, Studio, Papier …); aus: die Form auf Ozzys Weiß';
    this.buehneKnopf.addEventListener('click', () => {
      this.g.buehne = !this.g.buehne;
      this.zeigen();
    });
    kopf.append(titel, this.buehneKnopf);
    el.append(kopf);
    for (const gruppe of SHADER_GRUPPEN) {
      const teil = liste.filter((v) => v.gruppe === gruppe);
      if (!teil.length) continue;
      const h = document.createElement('button');
      h.type = 'button';
      h.className = 'shader-gruppe';
      h.textContent = `${gruppe} · ${teil.length}`;
      h.addEventListener('click', () => {
        const i = this.g.offen.indexOf(gruppe);
        if (i >= 0) this.g.offen.splice(i, 1);
        else this.g.offen.push(gruppe);
        this.zeigen();
      });
      const reihe = document.createElement('div');
      reihe.className = 'shader-reihe';
      for (const v of teil) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = v.name;
        b.title = v.zeile;
        b.addEventListener('click', () => this.waehlen(v.id));
        this.knoepfe.set(v.id, b);
        reihe.append(b);
      }
      this.gruppenEl.set(gruppe, { kopf: h, reihe });
      el.append(h, reihe);
    }
    this.zeileEl = document.createElement('div');
    this.zeileEl.className = 'shader-zeile';
    this.reglerEl = document.createElement('div');
    this.reglerEl.className = 'shader-regler';
    el.append(this.zeileEl, this.reglerEl);
    this.zeigen();
  }

  private lesen(): Gemerkt {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) {
        const g = JSON.parse(roh) as Partial<Gemerkt>;
        return {
          wahl: typeof g.wahl === 'string' ? g.wahl : '',
          buehne: g.buehne !== false,
          offen: Array.isArray(g.offen) ? g.offen.filter((x) => typeof x === 'string') : [],
          werte: g.werte && typeof g.werte === 'object' ? g.werte : {},
        };
      }
    } catch {
      // ohne Speicher: Grundwerte
    }
    return { wahl: '', buehne: true, offen: [], werte: {} };
  }

  private merken(): void {
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(this.g));
    } catch {
      // ohne Speicher gilt es bis zum Neuladen
    }
  }

  get wahl(): string {
    return this.g.wahl;
  }

  get buehne(): boolean {
    return this.g.buehne;
  }

  set buehne(an: boolean) {
    this.g.buehne = an;
    this.zeigen();
  }

  /** die Werte der Regler des gewählten Shaders (fehlende mit ihrem Grundwert) */
  regler(id = this.g.wahl): Record<string, number> {
    const v = this.liste.find((x) => x.id === id);
    const w = this.g.werte[id] ?? {};
    const r: Record<string, number> = {};
    for (const z of v?.regler ?? []) r[z.k] = Number.isFinite(w[z.k]) ? w[z.k]! : z.grund;
    return r;
  }

  reglerSetzen(k: string, wert: number, id = this.g.wahl): void {
    (this.g.werte[id] ??= {})[k] = wert;
    this.merken();
    this.aenderung();
  }

  waehlen(id: string): void {
    if (!this.liste.some((v) => v.id === id)) return;
    this.g.wahl = id;
    this.zeigen();
  }

  /** der nächste (oder mit -1 der vorige) Shader */
  weiter(schritt = 1): void {
    const i = this.liste.findIndex((v) => v.id === this.g.wahl);
    const j = (i + schritt + this.liste.length) % this.liste.length;
    this.waehlen(this.liste[j]!.id);
  }

  sichtbar(an: boolean): void {
    this.el.hidden = !an;
  }

  private zeigen(): void {
    const v = this.liste.find((x) => x.id === this.g.wahl)!;
    for (const [id, b] of this.knoepfe) b.setAttribute('aria-pressed', String(id === this.g.wahl));
    for (const [gruppe, { kopf, reihe }] of this.gruppenEl) {
      const offen = gruppe === v.gruppe || this.g.offen.includes(gruppe);
      reihe.hidden = !offen;
      kopf.setAttribute('aria-expanded', String(offen));
    }
    this.buehneKnopf.setAttribute('aria-pressed', String(this.g.buehne));
    this.zeileEl.textContent = v.zeile;
    this.reglerEl.replaceChildren();
    const werte = this.regler();
    for (const z of v.regler) {
      const l = document.createElement('label');
      const name = document.createElement('span');
      name.textContent = z.name;
      const eingabe = document.createElement('input');
      eingabe.type = 'range';
      eingabe.min = String(z.min);
      eingabe.max = String(z.max);
      eingabe.step = String(z.schritt);
      eingabe.value = String(werte[z.k]);
      const zahl = document.createElement('span');
      zahl.className = 'zahl';
      const schreiben = (): void => {
        const x = Number(eingabe.value);
        zahl.textContent = z.schritt >= 1 ? String(Math.round(x)) : x.toFixed(z.schritt >= 0.1 ? 1 : 2).replace('.', ',');
      };
      schreiben();
      eingabe.addEventListener('input', () => {
        schreiben();
        this.reglerSetzen(z.k, Number(eingabe.value));
      });
      eingabe.addEventListener('dblclick', () => {
        eingabe.value = String(z.grund);
        schreiben();
        this.reglerSetzen(z.k, z.grund);
      });
      l.append(name, eingabe, zahl);
      this.reglerEl.append(l);
    }
    this.merken();
    this.aenderung();
  }
}
