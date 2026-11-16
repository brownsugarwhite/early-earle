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

/**
 * Trägheit (Übergang zwischen zwei Clips): Der neue Clip gilt sofort; der Unterschied zum alten (Lage x0, Geschwindigkeit v0)
 * klingt über die Dauer T als Polynom 5. Grades ab, das ohne Beschleunigung beginnt und mit Lage, Geschwindigkeit und
 * Beschleunigung null endet: stetig in Lage und Geschwindigkeit. Der Schwung des alten Clips rollt aus (wird nicht abgebremst).
 */
class Abklingen {
  private x0 = 0;
  private v0 = 0;
  private A = 0;
  private B = 0;
  private C = 0;
  private T = 0;
  anlegen(x0: number, v0: number, T: number): void {
    T = Math.max(1e-3, T);
    this.x0 = x0;
    this.v0 = v0;
    this.A = -(6 * v0 * T + 12 * x0) / (2 * T ** 5);
    this.B = (16 * v0 * T + 30 * x0) / (2 * T ** 4);
    this.C = -(12 * v0 * T + 20 * x0) / (2 * T ** 3);
    this.T = Math.abs(x0) > 1e-7 || Math.abs(v0) > 1e-6 ? T : 0;
  }
  wert(t: number): number {
    if (t >= this.T) return 0;
    return ((((this.A * t + this.B) * t + this.C) * t + 0) * t + this.v0) * t + this.x0;
  }
}
/** Kanäle, die der Übergang trägt (Lage x, y rechnen Wurzel und Löser) */
const TRAEG_SCHLUESSEL = POSE_SCHLUESSEL.filter((k) => k !== 'x' && k !== 'y');
const STUFEN = new Set<keyof Pose>(['stufeVN', 'stufeVF', 'stufeHN', 'stufeHF']);
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
  private letztesNeigen = 1;
  private geschw = 0;
  /** Übergang: 'traegheit' (der neue Clip gilt sofort, der Unterschied klingt stetig ab) oder 'blenden' (zwei Clips
   *  überblendet, wie bis Runde 4) */
  uebergang: 'traegheit' | 'blenden' = 'traegheit';
  /** die Pose des Clips im letzten und vorletzten Bild (vor Löser und Federn; Stufen in der Welt) und der Zeitschritt dazwischen */
  private roh: Pose = { ...RUHE };
  private rohVorher: Pose = { ...RUHE };
  private rohDt = 0;
  private rohGueltig = 0;
  private abklingen = TRAEG_SCHLUESSEL.map(() => new Abklingen());
  private abklingenTempo = new Abklingen();
  private traegStart = -Infinity;
  /** Löser-Gewichte des vorigen Clips (werden über den Übergang hinweg gemischt) */
  private freiVorher = 1;
  private neigenVorher = 1;
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
    this.freiVorher = this.letztesFrei;
    this.neigenVorher = this.letztesNeigen;
    this.vorher = this.aktuell;
    this.aktuell = { clip, start: this.zeit, richtung: richtung ?? this.richtung, kontext, stufeVersatz: 0, haft: this.haftNeu() };
    this.richtung = this.aktuell.richtung;
    this.blendStart = this.zeit;
    this.blendDauer = Math.max(0.0001, ueberblenden);
    if (this.uebergang === 'traegheit') {
      this.vorher = null;
      this.traegheitAnlegen(this.blendDauer);
    }
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

  /** Übergang anlegen: Unterschied zwischen dem, was zuletzt galt (mit seiner Geschwindigkeit), und dem neuen Clip am Anfang */
  private traegheitAnlegen(dauer: number): void {
    this.traegStart = this.zeit;
    if (this.rohGueltig < 1) {
      for (const a of this.abklingen) a.anlegen(0, 0, dauer);
      this.abklingenTempo.anlegen(0, 0, dauer);
      return;
    }
    const h = 1 / 120;
    const n0 = this.puffer;
    const n1 = this.puffer2;
    const t0 = this.auswerten(this.aktuell, this.zeit, n0, 0);
    this.auswerten(this.aktuell, this.zeit + h, n1, 0);
    const mitV = this.rohGueltig >= 2 && this.rohDt > 0;
    TRAEG_SCHLUESSEL.forEach((k, i) => {
      // die Stufen des Letzten in der Welt, die neuen zum jetzigen Grund
      const stufe = STUFEN.has(k) ? this.hoehe : 0;
      let x0 = (this.roh[k] as number) - stufe - (n0[k] as number);
      // Winkel über den kürzesten Weg
      if (k === 'theta' || k === 'psi') x0 -= 360 * Math.round(x0 / 360);
      const winkel = k === 'theta' || k === 'psi';
      const diff = (a: number, b: number) => (winkel ? a - b - 360 * Math.round((a - b) / 360) : a - b);
      const vAlt = mitV ? diff(this.roh[k] as number, this.rohVorher[k] as number) / this.rohDt : 0;
      const vNeu = diff(n1[k] as number, n0[k] as number) / h;
      this.abklingen[i]!.anlegen(x0, mitV ? vAlt - vNeu : 0, dauer);
    });
    // Tempo der Wurzel (in der Welt)
    this.abklingenTempo.anlegen(this.geschw - t0 * this.aktuell.richtung, 0, dauer);
  }

  /** Pose eines Eintrags zur Weltzeit T (in Welt-Richtung) und seine Vorwärtsgeschwindigkeit */
  private auswerten(e: Eintrag, T: number, out: Pose, dt: number): number {
    const c = e.clip;
    let t = T - e.start;
    if (c.schleife) t = ((t % c.dauer) + c.dauer) % c.dauer;
    else t = Math.min(t, c.dauer);
    Object.assign(out, RUHE);
    // Clips, die ihre Schritte selbst planen (Gang), fragen den Boden vor und hinter der Wurzel (relativ zum Grund)
    const kontext: ClipKontext = c.gelaende
      ? { ...e.kontext, zeit: T - e.start, boden: (dx: number) => this.bodenBei(this.x + e.richtung * dx) - this.hoehe }
      : e.kontext;
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
    if (this.uebergang === 'traegheit') {
      // der neue Clip sofort, dazu der abklingende Unterschied zum alten
      Object.assign(p, this.puffer);
      const tt = this.zeit - this.traegStart;
      TRAEG_SCHLUESSEL.forEach((k, i) => {
        const d = this.abklingen[i]!.wert(tt);
        if (d) (p[k] as number) += d;
      });
      const gw = glatt(tt / this.blendDauer);
      frei = this.freiVorher + (frei - this.freiVorher) * gw;
      neigen = this.neigenVorher + (neigen - this.neigenVorher) * gw;
      v += this.abklingenTempo.wert(tt) * this.aktuell.richtung;
    } else if (this.vorher && w < 1) {
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
    this.letztesNeigen = neigen;
    // für den nächsten Übergang: was jetzt gilt (Stufen in der Welt)
    const tausch = this.rohVorher;
    this.rohVorher = this.roh;
    this.roh = tausch;
    Object.assign(this.roh, p);
    for (const k of STUFEN) (this.roh[k] as number) += this.hoehe;
    this.rohDt = dt;
    this.rohGueltig = Math.min(2, this.rohGueltig + 1);
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
    // kein Übergang über den Sprung hinweg
    this.rohGueltig = 0;
    for (const a of this.abklingen) a.anlegen(0, 0, 1);
    this.abklingenTempo.anlegen(0, 0, 1);
    if (gelaendeLeeren) {
      this.hoehe = 0;
      this.gelaende = [];
    }
  }

  get frei(): number {
    return this.letztesFrei;
  }
}
