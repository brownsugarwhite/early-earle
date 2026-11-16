// Der Mischer: spielt Clips, blendet sie im Zahlenraum der Pose ineinander (die Formen folgen daraus, darum gibt es nie einen
// Sprung in der Geometrie), bewegt Ozzy mit (Wurzelbewegung), setzt ihn auf seine Sohlen und legt die Federn darüber.
// Blickrichtung: Clips sind für „nach rechts“ geschrieben; nach links wird die Pose gespiegelt (ψ → −ψ, θ → −θ, nahe und ferne
// Beine getauscht). So geht „Umdrehen“ nahtlos in den nächsten Clip über.
import { CLIP, type Clip, type ClipKontext, KANTE, KONTEXT_STANDARD } from './clips';
import { Federn } from './federn';
import { Figur, KASTEN } from './figur';
import { POSE_SCHLUESSEL, type Pose, RUHE } from './pose';

const FUESSE = ['VN', 'VF', 'HN', 'HF'] as const;
type FussName = (typeof FUESSE)[number];
/** Boden je Fuß für Clips, die ihn nicht selbst planen: Ein Fuß haftet, bis er sich so weit bewegt (kein Flackern an einer
 *  Kante); ändert sich sein Boden, folgt er weich (kritisch gedämpft, `HAFT_W` je Sekunde). */
const HAFT = 24;
const HAFT_W = 26;
/** Eine Sohle steht auf dem Höchsten unter ihrem mittleren Teil (so viel links und rechts der Mitte) */
const SOHLE_HALB = 0.15 * KASTEN.B;
/** wie schnell die Korrektur des Lösers am Nicken und die Höhe des Körpers nachkommen (je Sekunde) */
const KIPP_W = 25;
const REICH_W = 30;

/** kritisch gedämpft auf `ziel` zu (genau für jeden Zeitschritt); ohne Wert: gleich dort */
function nachfuehren(z: { wert: number; v: number }, ziel: number, w: number, dt: number): void {
  if (!Number.isFinite(z.wert)) {
    z.wert = ziel;
    z.v = 0;
    return;
  }
  if (dt <= 0) return;
  const y = z.wert - ziel;
  const c = z.v + w * y;
  const ex = Math.exp(-w * dt);
  z.wert = ziel + (y + c * dt) * ex;
  z.v = (z.v - w * c * dt) * ex;
}
interface Haft {
  x: number;
  /** Boden (Welt, über BODEN_Y), auf den der Fuß zuläuft, und wo er gerade ist */
  ziel: number;
  wert: number;
  v: number;
}

interface Eintrag {
  clip: Clip;
  start: number;
  richtung: 1 | -1;
  kontext: ClipKontext;
  /** um so viel liegt der Boden dieses Clips höher als der jetzige Grundboden (nach einer Stufe) */
  stufeVersatz: number;
  haft: Record<FussName, Haft>;
}

/** Gelände für Bibliothek und Filmstreifen: von x an gilt die Höhe h (bis zum nächsten Wechsel) */
export interface Bodenwechsel {
  x: number;
  h: number;
}

export function spiegelPose(p: Pose): void {
  p.psi = -p.psi;
  p.theta = -p.theta;
  p.kopfNeigen = -p.kopfNeigen;
  p.kopfX = -p.kopfX;
  p.bart = -p.bart;
  p.rollen = -p.rollen;
  const tausch = (a: keyof Pose, b: keyof Pose) => {
    const t = p[a];
    p[a] = p[b];
    p[b] = t;
  };
  tausch('beinVN', 'beinVF');
  tausch('beinHN', 'beinHF');
  tausch('hubVN', 'hubVF');
  tausch('hubHN', 'hubHF');
  tausch('stufeVN', 'stufeVF');
  tausch('stufeHN', 'stufeHF');
  tausch('bahnVN', 'bahnVF');
  tausch('bahnHN', 'bahnHF');
}

const glatt = (x: number) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * (3 - 2 * u);
};

export class Spieler {
  readonly figur: Figur;
  readonly federn = new Federn();
  /** fertige Pose dieses Bilds */
  pose: Pose = { ...RUHE };
  /** Welt: Lage des Körperankers in x, Richtung */
  x = 800;
  richtung: 1 | -1 = 1;
  zeit = 0;
  /** Zeitlupe/Zeitraffer */
  tempo = 1;
  /** Federn an/aus */
  federnAn = true;
  /** Wird gerufen, wenn ein Einmal-Clip endet (vor dem Wechsel zu `danach`) */
  beiEnde: ((name: string) => void) | null = null;
  private aktuell: Eintrag;
  private vorher: Eintrag | null = null;
  private blendStart = 0;
  private blendDauer = 0.35;
  private puffer: Pose = { ...RUHE };
  private puffer2: Pose = { ...RUHE };
  private letztesFrei = 1;
  private geschw = 0;
  /** Korrektur des Lösers am Nicken (Grad) und Höhe des Körpers (in der Welt), weich nachgeführt: Setzt ein Fuß auf oder
   *  wechseln die tragenden Beine, kippt und hebt sich der Körper ohne Ruck */
  private kipp = { wert: NaN, v: 0 };
  private reich = { wert: NaN, v: 0 };

  /** Höhe des Bodens unter Ozzy (Stufen hoch und hinunter) und das Gelände, das die Treppen-Clips dabei gebaut haben */
  hoehe = 0;
  /** der Grund, auf den sich die zuletzt gerechnete Pose bezieht */
  private poseGrund = 0;
  gelaende: Bodenwechsel[] = [];

  /** Gelände von außen (Spiel): Höhe des Bodens über BODEN_Y bei Welt-x; ohne: die Stufen der Treppen-Clips (`gelaende`) */
  bodenFn: ((x: number) => number) | null = null;

  constructor(figur = new Figur(), start = 'stehen') {
    this.figur = figur;
    this.aktuell = { clip: CLIP[start]!, start: 0, richtung: 1, kontext: KONTEXT_STANDARD, stufeVersatz: 0, haft: this.haftNeu() };
  }

  /** Halt der Füße für einen neuen Clip: wo sie gerade stehen */
  private haftNeu(): Record<FussName, Haft> {
    const p = this.pose;
    const h = {} as Record<FussName, Haft>;
    for (const f of FUESSE) {
      const x = this.figur ? this.figur.fussX(p, f) : NaN;
      const g = (p[`stufe${f}`] as number) + (this.poseGrund ?? 0);
      h[f] = { x, ziel: g, wert: g, v: 0 };
    }
    return h;
  }

  /** Höhe des Bodens bei Welt-x (über BODEN_Y) */
  bodenBei(x: number): number {
    return this.bodenFn ? this.bodenFn(x) : this.gelaendeHoehe(x);
  }

  /** Boden unter einer Sohle, deren Mitte bei x steht: das Höchste unter ihrem mittleren Teil */
  sohleBei(x: number): number {
    let g = -Infinity;
    for (let i = -3; i <= 3; i++) g = Math.max(g, this.bodenBei(x + (i / 3) * SOHLE_HALB));
    return g;
  }

  get clipName(): string {
    return this.aktuell.clip.name;
  }
  get clipZeit(): number {
    return this.zeit - this.aktuell.start;
  }
  get geschwindigkeit(): number {
    return this.geschw;
  }

  /** Clip wechseln; `ueberblenden` in Sekunden; `richtung` optional neu; `kontext` (z. B. Höhe der Stufe) */
  spiele(name: string, ueberblenden = 0.35, richtung?: 1 | -1, kontext: ClipKontext = KONTEXT_STANDARD): void {
    const clip = CLIP[name];
    if (!clip) return;
    if (clip.name === this.aktuell.clip.name && clip.schleife && richtung === undefined) return;
    this.vorher = this.aktuell;
    this.aktuell = { clip, start: this.zeit, richtung: richtung ?? this.richtung, kontext, stufeVersatz: 0, haft: this.haftNeu() };
    this.richtung = this.aktuell.richtung;
    this.blendStart = this.zeit;
    this.blendDauer = Math.max(0.0001, ueberblenden);
    // eine Stufe im Gelände: ab der Kante (vor den Vorderfüßen) liegt der Boden höher oder tiefer
    if (clip.treppe) {
      const kante = this.x + this.richtung * KANTE;
      const h = this.hoehe + clip.treppe * kontext.stufe;
      if (this.richtung > 0) {
        this.gelaende = [...this.gelaende.filter((w) => w.x < kante), { x: kante, h }];
      } else {
        const rechts = this.gelaendeHoehe(kante + 1);
        this.gelaende = [{ x: -Infinity, h }, { x: kante, h: rechts }, ...this.gelaende.filter((w) => w.x > kante)];
      }
    }
  }

  /** Höhe des Geländes bei x (Bibliothek, Filmstreifen): Wechsel aufsteigend nach x, der letzte links von x gilt */
  gelaendeHoehe(x: number): number {
    let h = 0;
    for (const w of this.gelaende) if (w.x <= x) h = w.h;
    return h;
  }

  /** Pose eines Eintrags zur Weltzeit T (in Welt-Richtung) und seine Vorwärtsgeschwindigkeit */
  private auswerten(e: Eintrag, T: number, out: Pose, dt: number): number {
    const c = e.clip;
    let t = T - e.start;
    if (c.schleife) t = ((t % c.dauer) + c.dauer) % c.dauer;
    else t = Math.min(t, c.dauer);
    Object.assign(out, RUHE);
    // Clips, die ihre Schritte selbst planen (Gang), fragen den Boden vor und hinter der Wurzel (relativ zum Grund)
    const kontext: ClipKontext = c.gelaende ? { ...e.kontext, boden: (dx: number) => this.bodenBei(this.x + e.richtung * dx) - this.hoehe } : e.kontext;
    c.pose(t, out, kontext);
    if (e.stufeVersatz) {
      out.stufeVN -= e.stufeVersatz;
      out.stufeVF -= e.stufeVersatz;
      out.stufeHN -= e.stufeVersatz;
      out.stufeHF -= e.stufeVersatz;
    }
    // leise Lebenszeichen
    const l = c.leben ?? 0;
    if (l > 0) {
      out.atmen += l * (0.5 + 0.5 * Math.sin((T / 3.4) * Math.PI * 2));
      out.kopfNeigen += l * 1.2 * Math.sin((T / 7.3) * Math.PI * 2);
    }
    if (e.richtung < 0) spiegelPose(out);
    // alle anderen: jeder Fuß auf dem Boden unter seiner Sohle (haftend, weich nachgeführt)
    if (!c.gelaende && !c.treppe) {
      out.x = this.x;
      for (const f of FUESSE) {
        const h = e.haft[f];
        const x = this.figur.fussX(out, f);
        if (!(Math.abs(x - h.x) < HAFT)) {
          h.x = x;
          h.ziel = this.sohleBei(x);
        }
        nachfuehren(h, h.ziel, HAFT_W, dt);
        out[`stufe${f}`] = h.wert - this.hoehe;
      }
    }
    return c.tempo ? c.tempo(t) : 0;
  }

  update(dtWelt: number): Pose {
    const dt = Math.min(0.05, dtWelt) * this.tempo;
    this.zeit += dt;
    // Einmal-Clip zu Ende → weiter
    const c = this.aktuell.clip;
    if (!c.schleife && this.zeit - this.aktuell.start >= c.dauer) {
      const fertig = c.name;
      const naechste = c.danach ?? 'stehen';
      const r = c.wendet ? ((-this.aktuell.richtung) as 1 | -1) : this.aktuell.richtung;
      // nach einer Stufe steht Ozzy auf dem neuen Boden: der wird der Grund, der Clip zählt ab da von ihm aus
      if (c.treppe) {
        const d = c.treppe * this.aktuell.kontext.stufe;
        this.hoehe += d;
        this.aktuell.stufeVersatz += d;
      }
      this.beiEnde?.(fertig);
      // nur weiterschalten, wenn beiEnde nicht schon etwas anderes gestartet hat
      if (this.aktuell.clip.name === fertig) this.spiele(naechste, c.wendet ? 0.12 : 0.3, r);
    }
    const p = this.pose;
    let v = this.auswerten(this.aktuell, this.zeit, this.puffer, dt);
    let frei = this.aktuell.clip.frei ?? 1;
    // Clips, die ihre Stufe selbst planen, kippen selbst; alle anderen folgen dem Gelände
    let neigen = this.aktuell.clip.treppe ? 0 : 1;
    const w = this.vorher ? glatt((this.zeit - this.blendStart) / this.blendDauer) : 1;
    if (this.vorher && w < 1) {
      const v0 = this.auswerten(this.vorher, this.zeit, this.puffer2, dt);
      // Winkel über den kürzesten Weg: Nach einmal ganz herum (375°) dreht der Kopf nicht wieder zurück
      for (const k of ['theta', 'psi'] as const) this.puffer2[k] += 360 * Math.round((this.puffer[k] - this.puffer2[k]) / 360);
      for (const k of POSE_SCHLUESSEL) p[k] = this.puffer2[k] + (this.puffer[k] - this.puffer2[k]) * w;
      v = v0 + (v - v0) * w;
      frei = (this.vorher.clip.frei ?? 1) + (frei - (this.vorher.clip.frei ?? 1)) * w;
      neigen = (this.vorher.clip.treppe ? 0 : 1) + (neigen - (this.vorher.clip.treppe ? 0 : 1)) * w;
    } else {
      Object.assign(p, this.puffer);
      this.vorher = null;
    }
    this.letztesFrei = frei;
    // Wurzelbewegung in Blickrichtung (die Richtung des aktuellen Clips)
    this.geschw = v * this.aktuell.richtung;
    this.x += this.geschw * dt;
    p.x = this.x;
    // Höhe: auf den Sohlen (Boden-Löser, nach boden gewichtet); in der Luft hebt `heben`
    p.y = RUHE.y;
    if (p.boden > 0) {
      // Ziel des Lösers, als Korrektur am Nicken des Clips weich nachgeführt (kritisch gedämpft); die Höhe folgt sofort, so
      // stehen die Füße immer genau
      nachfuehren(this.kipp, this.figur.nickenZiel(p, frei, neigen) - p.nicken, KIPP_W, dt);
      const r = this.figur.kippenAuf(p, p.nicken + this.kipp.wert);
      nachfuehren(this.reich, r + this.hoehe, REICH_W, dt);
      Figur.hoeheSetzen(p, this.reich.wert - this.hoehe);
    } else {
      this.kipp.wert = NaN;
      this.reich.wert = NaN;
    }
    if (this.federnAn) {
      // in der Welt gerechnet (gezeichnet wird um den Grund `hoehe` versetzt): Ein Wechsel des Grunds stößt die Federn nicht an
      const [kx, ky] = this.figur.kopfPunkt(p);
      const koerper: [number, number] = [p.x, p.y - p.heben - this.hoehe];
      this.federn.anwenden(p, dt, [kx, ky - this.hoehe], koerper, this.aktuell.richtung);
    }
    this.poseGrund = this.hoehe;
    return p;
  }

  /** frei gesetzte Lage (Spiel, Filmstreifen): x und Richtung sofort */
  setzen(x: number, richtung: 1 | -1, gelaendeLeeren = true): void {
    this.x = x;
    this.richtung = richtung;
    this.aktuell.richtung = richtung;
    this.federn.zuruecksetzen();
    // die Füße stehen gleich auf dem Boden am neuen Ort, der Löser fängt neu an
    for (const f of FUESSE) this.aktuell.haft[f] = { x: NaN, ziel: 0, wert: NaN, v: 0 };
    this.kipp.wert = NaN;
    this.reich.wert = NaN;
    if (gelaendeLeeren) {
      this.hoehe = 0;
      this.gelaende = [];
    }
  }

  get frei(): number {
    return this.letztesFrei;
  }
}
