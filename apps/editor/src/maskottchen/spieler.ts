// Der Mischer: spielt Clips, blendet sie im Zahlenraum der Pose ineinander (die Formen folgen daraus, darum gibt es nie einen
// Sprung in der Geometrie), bewegt Ozzy mit (Wurzelbewegung), setzt ihn auf seine Sohlen und legt die Federn darüber.
// Blickrichtung: Clips sind für „nach rechts“ geschrieben; nach links wird die Pose gespiegelt (ψ → −ψ, θ → −θ, nahe und ferne
// Beine getauscht). So geht „Umdrehen“ nahtlos in den nächsten Clip über.
import { CLIP, type Clip, type ClipKontext, KANTE, KONTEXT_STANDARD } from './clips';
import { Federn } from './federn';
import { Figur } from './figur';
import { POSE_SCHLUESSEL, type Pose, RUHE } from './pose';

interface Eintrag {
  clip: Clip;
  start: number;
  richtung: 1 | -1;
  kontext: ClipKontext;
  /** um so viel liegt der Boden dieses Clips höher als der jetzige Grundboden (nach einer Stufe) */
  stufeVersatz: number;
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

  /** Höhe des Bodens unter Ozzy (Stufen hoch und hinunter) und das Gelände, das die Treppen-Clips dabei gebaut haben */
  hoehe = 0;
  gelaende: Bodenwechsel[] = [];

  constructor(figur = new Figur(), start = 'stehen') {
    this.figur = figur;
    this.aktuell = { clip: CLIP[start]!, start: 0, richtung: 1, kontext: KONTEXT_STANDARD, stufeVersatz: 0 };
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
    this.aktuell = { clip, start: this.zeit, richtung: richtung ?? this.richtung, kontext, stufeVersatz: 0 };
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
  private auswerten(e: Eintrag, T: number, out: Pose): number {
    const c = e.clip;
    let t = T - e.start;
    if (c.schleife) t = ((t % c.dauer) + c.dauer) % c.dauer;
    else t = Math.min(t, c.dauer);
    Object.assign(out, RUHE);
    c.pose(t, out, e.kontext);
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
    let v = this.auswerten(this.aktuell, this.zeit, this.puffer);
    let frei = this.aktuell.clip.frei ?? 1;
    const w = this.vorher ? glatt((this.zeit - this.blendStart) / this.blendDauer) : 1;
    if (this.vorher && w < 1) {
      const v0 = this.auswerten(this.vorher, this.zeit, this.puffer2);
      // Winkel über den kürzesten Weg: Nach einmal ganz herum (375°) dreht der Kopf nicht wieder zurück
      for (const k of ['theta', 'psi'] as const) this.puffer2[k] += 360 * Math.round((this.puffer[k] - this.puffer2[k]) / 360);
      for (const k of POSE_SCHLUESSEL) p[k] = this.puffer2[k] + (this.puffer[k] - this.puffer2[k]) * w;
      v = v0 + (v - v0) * w;
      frei = (this.vorher.clip.frei ?? 1) + (frei - (this.vorher.clip.frei ?? 1)) * w;
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
    if (p.boden > 0) this.figur.boden(p, frei);
    if (this.federnAn) {
      const kopf = this.figur.kopfPunkt(p);
      const koerper: [number, number] = [p.x, p.y - p.heben];
      this.federn.anwenden(p, dt, kopf, koerper, this.aktuell.richtung);
    }
    return p;
  }

  /** frei gesetzte Lage (Spiel, Filmstreifen): x und Richtung sofort */
  setzen(x: number, richtung: 1 | -1, gelaendeLeeren = true): void {
    this.x = x;
    this.richtung = richtung;
    this.aktuell.richtung = richtung;
    this.federn.zuruecksetzen();
    if (gelaendeLeeren) {
      this.hoehe = 0;
      this.gelaende = [];
    }
  }

  get frei(): number {
    return this.letztesFrei;
  }
}
