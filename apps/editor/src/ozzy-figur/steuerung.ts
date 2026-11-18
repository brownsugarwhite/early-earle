// Ozzy-Figur, Etappe D: Steuerung der Haltungen per Knopf (Stehen, Sitzen, Liegen) und des Kopfwinkels. Florian (18.11.): „er soll
// beides können. alle posen müssen smooth ineinanderlaufen. das system muss sehr stabil und robust sein.“
//
// Ein Knopf setzt ein Ziel. Ein Leitpunkt fährt den Weg dorthin im Raum der Gewichte ab (Hinsetzen über die Hocke, siehe `weg`; aus
// dem Stehen ins Liegen direkt, aus dem Sitzen ins Liegen mit der Drehung des Hinterbeins), mit weichem Anfahren und Bremsen und ohne
// an den Wegpunkten anzuhalten. Die gezeigten Gewichte folgen ihm wie an einer kritisch gedämpften Feder. Ein neues Ziel mitten im
// Wechsel beginnt dort, wo der Leitpunkt gerade ist, und behält vom Schwung, was in die neue Richtung zeigt: kein Sprung, kein Ruck.
// Der Kopfwinkel folgt seinem Ziel genauso. Ohne DOM und ohne Uhr: Wer zeichnet, ruft `schritt(dt)` je Bild.
import { type Gewichte, gewichtsliste, HALTUNGEN, type HaltungName, weg } from './haltung';

export interface SteuerTempo {
  /** Höchsttempo des Leitpunkts (Haltungswechsel je Sekunde; Hinsetzen sind zwei: Stehen → Hocke → Sitzen) */
  tempo: number;
  /** Anfahren und Bremsen (Haltungswechsel je Sekunde²) */
  beschleunigung: number;
  /** Feder der Gewichte und des Kopfs (1/s): höher folgt enger, kleiner weicher */
  feder: number;
  /** Höchsttempo des Kopfs (Grad je Sekunde) */
  kopfTempo: number;
}
export const STEUER_TEMPO: SteuerTempo = { tempo: 1.4, beschleunigung: 4.5, feder: 14, kopfTempo: 160 };

type Liste = number[];
const N = HALTUNGEN.length;
/** Teilschritt der Rechnung (Sekunden) */
const TEIL = 1 / 240;
const einsVon = (h: HaltungName): Liste => HALTUNGEN.map((x) => (x.name === h ? 1 : 0));
/** Abstand zweier Mischungen: halbe Summe der Unterschiede (zwischen zwei Haltungen genau 1) */
const abstand = (a: Liste, b: Liste): number => a.reduce((s, v, i) => s + Math.abs(v - b[i]!), 0) / 2;
const hin = (a: Liste, b: Liste, s: number): Liste => a.map((v, i) => v + (b[i]! - v) * s);
const einheit = (a: Liste, b: Liste): Liste | null => {
  const d = b.map((v, i) => v - a[i]!);
  const l = Math.hypot(...d);
  return l > 1e-12 ? d.map((v) => v / l) : null;
};
const groesster = (a: Liste): number => a.reduce((best, v, i) => (v > a[best]! + 1e-9 ? i : best), 0);

export class HaltungsSteuerung {
  /** gezeigte Gewichte (Feder) und ihr Tempo */
  private g: Liste;
  private v: Liste;
  /** Leitpunkt, verbleibende Wegpunkte, Tempo längs des Wegs und Richtung des letzten Stücks */
  private leit: Liste;
  private pfad: Liste[] = [];
  private fahrt = 0;
  private richtung: Liste | null = null;
  private zielName: HaltungName;
  /** Kopf: gezeigter Winkel und Tempo, Leitwinkel, Ziel */
  private kopf = { w: 0, v: 0, leit: 0, ziel: 0 };

  constructor(
    start: HaltungName = 'stehen',
    readonly tempo: SteuerTempo = { ...STEUER_TEMPO },
  ) {
    this.g = einsVon(start);
    this.v = new Array<number>(N).fill(0);
    this.leit = einsVon(start);
    this.zielName = start;
  }

  get ziel(): HaltungName {
    return this.zielName;
  }

  /** ruht alles (Gewichte und Kopf am Ziel, ohne Bewegung)? */
  get ruht(): boolean {
    return this.pfad.length === 0 && this.kopf.leit === this.kopf.ziel && this.gewichteRuhen() && this.kopfRuht();
  }

  /** gezeigte Gewichte (nie negativ, Summe 1) */
  gewichte(): Gewichte {
    const w = gewichtsliste(Object.fromEntries(HALTUNGEN.map((x, i) => [x.name, this.g[i]!])) as Gewichte);
    return Object.fromEntries(HALTUNGEN.map((x, i) => [x.name, w[i]!])) as Gewichte;
  }

  /** gezeigter Kopfwinkel (0 vorn … 90 Profil) */
  get kopfWinkel(): number {
    return Math.max(0, Math.min(90, this.kopf.w));
  }

  /** Ziel des Kopfwinkels (0 vorn … 90 Profil) */
  kopfZiel(w: number): void {
    this.kopf.ziel = Number.isFinite(w) ? Math.max(0, Math.min(90, w)) : this.kopf.ziel;
  }

  /** neues Ziel: Weg von der Haltung, die am Leitpunkt gerade führt, ohne zu ihr zurückzugehen */
  setzen(ziel: HaltungName): void {
    if (!HALTUNGEN.some((x) => x.name === ziel)) return;
    this.zielName = ziel;
    const fuehrend = HALTUNGEN[groesster(this.leit)]!.name;
    let punkte = weg(fuehrend, ziel).slice(1).map(einsVon);
    // Ziel ist die führende Haltung: zurück zu ihr
    if (!punkte.length) punkte = [einsVon(ziel)];
    // Schwung nur, soweit er in die neue Richtung zeigt
    const neu = einheit(this.leit, punkte[0]!);
    const cos = neu && this.richtung ? neu.reduce((s, v, i) => s + v * this.richtung![i]!, 0) : 0;
    this.fahrt *= Math.max(0, cos);
    this.pfad = punkte.filter((p, i) => i > 0 || abstand(this.leit, p) > 1e-9);
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
    // Leitpunkt längs des Wegs: anfahren, höchstens `tempo`, rechtzeitig bremsen; kommt sicher an
    if (this.pfad.length) {
      let rest = abstand(this.leit, this.pfad[0]!);
      for (let i = 1; i < this.pfad.length; i++) rest += abstand(this.pfad[i - 1]!, this.pfad[i]!);
      this.fahrt = Math.min(this.fahrt + t.beschleunigung * h, t.tempo, Math.sqrt(2 * t.beschleunigung * rest));
      this.fahrt = Math.max(this.fahrt, 0.05);
      let s = this.fahrt * h;
      while (s > 0 && this.pfad.length) {
        const ziel = this.pfad[0]!;
        const d = abstand(this.leit, ziel);
        this.richtung = einheit(this.leit, ziel) ?? this.richtung;
        if (d <= s) {
          this.leit = ziel.slice();
          this.pfad.shift();
          s -= d;
        } else {
          this.leit = hin(this.leit, ziel, s / d);
          s = 0;
        }
      }
      if (!this.pfad.length) this.fahrt = 0;
    }
    // Gewichte an der Feder (kritisch gedämpft)
    const w = t.feder;
    for (let i = 0; i < N; i++) {
      const a = w * w * (this.leit[i]! - this.g[i]!) - 2 * w * this.v[i]!;
      this.v[i]! += a * h;
      this.g[i]! += this.v[i]! * h;
    }
    // am Ziel genau einrasten (an den Vorlagen gilt dann genau Florians Zeichnung)
    if (!this.pfad.length && this.gewichteRuhen()) {
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
