// Der Mischer: spielt Clips, blendet sie im Zahlenraum der Pose ineinander (die Formen folgen daraus, darum gibt es nie einen
// Sprung in der Geometrie), bewegt Ozzy mit (Wurzelbewegung), setzt ihn auf seine Sohlen und legt die Federn darüber.
// Blickrichtung: Clips sind für „nach rechts“ geschrieben; nach links wird die Pose gespiegelt (ψ → −ψ, θ → −θ, nahe und ferne
// Beine getauscht). So geht „Umdrehen“ nahtlos in den nächsten Clip über.
import { CLIP, type Clip } from './clips';
import { Federn } from './federn';
import { Figur } from './figur';
import { POSE_SCHLUESSEL, type Pose, RUHE } from './pose';

interface Eintrag {
  clip: Clip;
  start: number;
  richtung: 1 | -1;
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

  constructor(figur = new Figur(), start = 'stehen') {
    this.figur = figur;
    this.aktuell = { clip: CLIP[start]!, start: 0, richtung: 1 };
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

  /** Clip wechseln; `ueberblenden` in Sekunden; `richtung` optional neu */
  spiele(name: string, ueberblenden = 0.35, richtung?: 1 | -1): void {
    const clip = CLIP[name];
    if (!clip) return;
    if (clip.name === this.aktuell.clip.name && clip.schleife && richtung === undefined) return;
    this.vorher = this.aktuell;
    this.aktuell = { clip, start: this.zeit, richtung: richtung ?? this.richtung };
    this.richtung = this.aktuell.richtung;
    this.blendStart = this.zeit;
    this.blendDauer = Math.max(0.0001, ueberblenden);
  }

  /** Pose eines Eintrags zur Weltzeit T (in Welt-Richtung) und seine Vorwärtsgeschwindigkeit */
  private auswerten(e: Eintrag, T: number, out: Pose): number {
    const c = e.clip;
    let t = T - e.start;
    if (c.schleife) t = ((t % c.dauer) + c.dauer) % c.dauer;
    else t = Math.min(t, c.dauer);
    Object.assign(out, RUHE);
    c.pose(t, out);
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
  setzen(x: number, richtung: 1 | -1): void {
    this.x = x;
    this.richtung = richtung;
    this.aktuell.richtung = richtung;
    this.federn.zuruecksetzen();
  }

  get frei(): number {
    return this.letztesFrei;
  }
}
