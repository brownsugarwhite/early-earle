// Ozzy-Figur, Etappe D: Steuerung der Haltungen per Knopf (Stehen, Sitzen, Sitzen mit Hüpfer, Liegen, gemütlich Liegen) und des
// Kopfwinkels. Florian (18.11.): „alle posen müssen smooth ineinanderlaufen. das system muss sehr stabil und robust sein.“ – (19.11.)
// „Es soll witziger und schöner sein.“
//
// Ein Knopf setzt ein Ziel. Die Steuerung spielt den passenden Ablauf (ablauf.ts) von dort, wo Ozzy gerade ist: Ist er in einer
// Haltung, den ganzen Ablauf; mitten in einem Wechsel geht sie von der Haltung aus, die gerade führt, ohne zu ihr zurückzukehren.
// Die gezeigten Gewichte folgen dem Ablauf an einer kritisch gedämpften Feder; Zusatzbewegungen eines unterbrochenen Ablaufs klingen
// in kurzer Zeit aus. So springt nichts, auch nicht bei vielen Klicks. Der Kopfwinkel folgt seinem Ziel genauso.
// Ohne DOM und ohne Uhr: Wer zeichnet, ruft `schritt(dt)` je Bild.
import { type Ablauf, ablaufBei, ablaufFuer, type Art, dauerVon } from './ablauf';
import { type Gewichte, gewichtsliste, HALTUNGEN, type HaltungName } from './haltung';
import type { Effekte } from './raster';

export interface SteuerTempo {
  /** Tempo der Abläufe (1 = Florians Zeiten) */
  tempo: number;
  /** Feder der Gewichte und des Kopfs (1/s): höher folgt enger, kleiner weicher */
  feder: number;
  /** Höchsttempo des Kopfs (Grad je Sekunde) */
  kopfTempo: number;
}
export const STEUER_TEMPO: SteuerTempo = { tempo: 1, feder: 16, kopfTempo: 160 };

type Liste = number[];
const N = HALTUNGEN.length;
/** Teilschritt der Rechnung (Sekunden) */
const TEIL = 1 / 240;
/** so lange klingen die Zusatzbewegungen eines unterbrochenen Ablaufs aus (Sekunden) */
const AUSKLANG = 0.25;
const KEINE: Required<Effekte> = { hub: 0, stauchung: 0, kopf: 0, wedeln: 0 };
const alsListe = (g: Gewichte): Liste => gewichtsliste(g);
const alsGewichte = (w: Liste): Gewichte => Object.fromEntries(HALTUNGEN.map((x, i) => [x.name, w[i]!])) as Gewichte;
const einsVon = (h: HaltungName): Liste => HALTUNGEN.map((x) => (x.name === h ? 1 : 0));
/** Abstand zweier Mischungen: halbe Summe der Unterschiede (zwischen zwei Haltungen genau 1) */
const abstand = (a: Liste, b: Liste): number => a.reduce((s, v, i) => s + Math.abs(v - b[i]!), 0) / 2;
const fuehrend = (a: Liste): HaltungName => HALTUNGEN[a.reduce((best, v, i) => (v > a[best]! + 1e-9 ? i : best), 0)]!.name;

export class HaltungsSteuerung {
  /** gezeigte Gewichte (Feder) und ihr Tempo */
  private g: Liste;
  private v: Liste;
  /** laufender Ablauf: Start, Zeit darin (Sekunden bei Tempo 1), Leitpunkt und Zusatzbewegungen nach dem Ablauf */
  private ablauf: Ablauf | null = null;
  private start: Liste;
  private zeit = 0;
  private leit: Liste;
  private eff: Required<Effekte> = { ...KEINE };
  /** Zusatzbewegungen des unterbrochenen Ablaufs, die ausklingen */
  private alt: { eff: Required<Effekte>; rest: number } | null = null;
  private zielName: HaltungName;
  private artName: Art = 'normal';
  /** Kopf: gezeigter Winkel und Tempo, Leitwinkel, Ziel */
  private kopf = { w: 0, v: 0, leit: 0, ziel: 0 };

  constructor(
    start: HaltungName = 'stehen',
    readonly tempo: SteuerTempo = { ...STEUER_TEMPO },
  ) {
    this.g = einsVon(start);
    this.v = new Array<number>(N).fill(0);
    this.start = einsVon(start);
    this.leit = einsVon(start);
    this.zielName = start;
  }

  get ziel(): HaltungName {
    return this.zielName;
  }
  get art(): Art {
    return this.artName;
  }

  /** ruht alles (Ablauf zu Ende, Gewichte und Kopf am Ziel, ohne Bewegung)? */
  get ruht(): boolean {
    return !this.ablauf && !this.alt && this.kopf.leit === this.kopf.ziel && this.gewichteRuhen() && this.kopfRuht();
  }

  /** gezeigte Gewichte (nie negativ, Summe 1) */
  gewichte(): Gewichte {
    return alsGewichte(gewichtsliste(alsGewichte(this.g)));
  }

  /** Zusatzbewegungen jetzt (Ablauf und Ausklang des unterbrochenen) */
  effekte(): Effekte {
    const e = { ...this.eff };
    if (this.alt) {
      const k = this.alt.rest / AUSKLANG;
      const f = k * k * (3 - 2 * k);
      for (const n of Object.keys(e) as (keyof Effekte)[]) e[n] += this.alt.eff[n] * f;
    }
    return e;
  }

  /** gezeigter Kopfwinkel (0 vorn … 90 Profil) */
  get kopfWinkel(): number {
    return Math.max(0, Math.min(90, this.kopf.w));
  }

  /** Ziel des Kopfwinkels (0 vorn … 90 Profil) */
  kopfZiel(w: number): void {
    this.kopf.ziel = Number.isFinite(w) ? Math.max(0, Math.min(90, w)) : this.kopf.ziel;
  }

  /**
   * Neues Ziel: Ablauf von der Haltung, die am Leitpunkt gerade führt, zum Ziel (nach Art: Hinsetzen normal oder mit Hüpfer, Liegen
   * rutschend oder gemütlich). Beginnt am Leitpunkt; liegt er schon auf dem Weg, überspringt er, was hinter ihm liegt.
   */
  setzen(ziel: HaltungName, art: Art = 'normal'): void {
    if (!HALTUNGEN.some((x) => x.name === ziel)) return;
    if (ziel === this.zielName && art === this.artName && this.ablauf) return;
    this.zielName = ziel;
    this.artName = art;
    // Zusatzbewegungen des laufenden Ablaufs klingen aus
    const jetzt = this.effekte();
    this.alt = Object.values(jetzt).some((x) => Math.abs(x ?? 0) > 1e-6) ? { eff: { ...KEINE, ...jetzt }, rest: AUSKLANG } : null;
    this.eff = { ...KEINE };
    const von = fuehrend(this.leit);
    const da = this.leit.slice();
    if (abstand(da, einsVon(ziel)) < 1e-6) {
      this.ablauf = null;
      this.leit = einsVon(ziel);
      return;
    }
    const a = von === ziel ? null : ablaufFuer(von, ziel, art);
    let ablauf: Ablauf = a ?? { abschnitte: [{ nach: { [ziel]: 1 }, dauer: 0.7, kurve: 'weich' }], nachlauf: 0 };
    // mitten in einem Wechsel: der erste Abschnitt beginnt am Leitpunkt, so lang wie sein Rest
    const erster = ablauf.abschnitte[0]!;
    const rest = abstand(da, alsListe(erster.nach));
    const voll = abstand(einsVon(von), alsListe(erster.nach));
    if (voll > 1e-6 && rest < voll - 1e-6) ablauf = { ...ablauf, abschnitte: [{ ...erster, dauer: erster.dauer * Math.max(0.25, rest / voll) }, ...ablauf.abschnitte.slice(1)] };
    this.ablauf = ablauf;
    this.start = da;
    this.zeit = 0;
  }

  /** einen Zeitschritt weiter (Sekunden); große Schritte werden in Teilschritte zerlegt, ungültige ignoriert */
  schritt(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const d = Math.min(dt, 0.25);
    const n = Math.max(1, Math.ceil(d / TEIL));
    for (let k = 0; k < n; k++) this.teilschritt(d / n);
  }

  private teilschritt(h: number): void {
    const t = this.tempo;
    // Ablauf: Leitpunkt und Zusatzbewegungen aus der Zeit
    if (this.ablauf) {
      this.zeit += h * Math.max(0.05, t.tempo);
      const l = ablaufBei(this.ablauf, alsGewichte(this.start), this.zeit);
      this.leit = alsListe(l.gewichte);
      this.eff = { ...KEINE, ...l.effekte };
      if (this.zeit >= dauerVon(this.ablauf)) {
        this.ablauf = null;
        this.eff = { ...KEINE };
      }
    }
    if (this.alt) {
      this.alt.rest -= h;
      if (this.alt.rest <= 0) this.alt = null;
    }
    // Gewichte an der Feder (kritisch gedämpft)
    const w = t.feder;
    for (let i = 0; i < N; i++) {
      const a = w * w * (this.leit[i]! - this.g[i]!) - 2 * w * this.v[i]!;
      this.v[i]! += a * h;
      this.g[i]! += this.v[i]! * h;
    }
    // am Ziel genau einrasten (an den Vorlagen gilt dann genau Florians Zeichnung)
    if (!this.ablauf && this.gewichteRuhen()) {
      this.g = this.leit.slice();
      this.v.fill(0);
    }
    // Kopf: Leitwinkel mit Höchsttempo zum Ziel, gezeigter Winkel an der Feder
    const k = this.kopf;
    const schritt = t.kopfTempo * h;
    k.leit = Math.abs(k.ziel - k.leit) <= schritt ? k.ziel : k.leit + Math.sign(k.ziel - k.leit) * schritt;
    k.v += (w * w * (k.leit - k.w) - 2 * w * k.v) * h;
    k.w += k.v * h;
    if (k.leit === k.ziel && this.kopfRuht()) {
      k.w = k.ziel;
      k.v = 0;
    }
  }

  private gewichteRuhen(): boolean {
    return abstand(this.g, this.leit) < 1e-5 && this.v.every((x) => Math.abs(x) < 1e-4);
  }

  private kopfRuht(): boolean {
    return Math.abs(this.kopf.w - this.kopf.leit) < 1e-3 && Math.abs(this.kopf.v) < 1e-2;
  }
}
