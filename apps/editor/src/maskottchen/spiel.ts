// Spielen: Ozzy im kleinen Level wie in einem Jump'n'Run. Er läuft langsam, aber unbeirrbar; springt steif mit allen vieren;
// rennt er gegen eine Stufe, stolpert er; steht er lange, setzt er sich, legt sich hin und schläft. Steuerung: Pfeile/WASD,
// Umschalt = eilen, Leertaste/↑ = springen, ↓ = setzen/aufstehen, dazu Tasten für die Späße. Coyote-Zeit und Sprung-Puffer.
import { BODEN_Y } from './figur';
import { KANTE } from './clips';
import type { Spieler } from './spieler';

export interface Plattform {
  x0: number;
  x1: number;
  hoehe: number; // über dem Boden
}

export const LEVEL: { plattformen: Plattform[]; ziel: number; links: number; rechts: number } = {
  plattformen: [
    { x0: 4200, x1: 6400, hoehe: 260 },
    { x0: 8200, x1: 10200, hoehe: 520 },
    { x0: 11800, x1: 13800, hoehe: 300 },
    { x0: 15600, x1: 16900, hoehe: 640 },
    { x0: 18600, x1: 20400, hoehe: 240 },
  ],
  ziel: 23500,
  links: -1500,
  rechts: 25500,
};

const SCHWERKRAFT = 7200;
const SPRUNG = 2950;
const LUFT_TEMPO = 520;
const COYOTE = 0.12;
const PUFFER = 0.14;
const FUSS_HALB = 470; // halbe Spanne der Sohlen
/** so hohe Stufen klettert er hinauf (und so tiefe steigt er hinunter); höhere muss er springen */
const KLETTER_MAX = 320;

export interface Eingabe {
  links: boolean;
  rechts: boolean;
  eilen: boolean;
  springen: boolean; // gedrückt (Flanke wird hier erkannt)
  runter: boolean;
  aktion: string | null; // einmalige Taste
}

export class Spiel {
  readonly spieler: Spieler;
  /** Höhe der Sohlen über dem Boden */
  hoehe = 0;
  vy = 0;
  amBoden = true;
  private seitBoden = 0;
  private sprungGedrueckt = -1;
  private warSprung = false;
  private ruhe = 0;
  private stolperSperre = 0;
  private warRunter = false;
  geschafft = false;
  meldung = '';
  private meldungZeit = 0;
  /** steigt gerade eine Stufe hoch oder hinunter: von welcher Höhe, um wie viel */
  private klettern: { von: number; d: number } | null = null;

  constructor(spieler: Spieler) {
    this.spieler = spieler;
  }

  neustart(): void {
    this.spieler.setzen(0, 1);
    this.spieler.spiele('stehen', 0.01, 1);
    this.hoehe = 0;
    this.vy = 0;
    this.amBoden = true;
    this.geschafft = false;
    this.ruhe = 0;
  }

  /** Höhe der Oberfläche unter den Sohlen bei x */
  boden(x: number): number {
    let h = 0;
    for (const p of LEVEL.plattformen) if (x + FUSS_HALB * 0.55 > p.x0 && x - FUSS_HALB * 0.55 < p.x1) h = Math.max(h, p.hoehe);
    return h;
  }

  /** Höhe des Bodens genau bei x (für die Kante vor den Vorderfüßen) */
  private bodenBei(x: number): number {
    let h = 0;
    for (const p of LEVEL.plattformen) if (x > p.x0 && x < p.x1) h = Math.max(h, p.hoehe);
    return h;
  }

  /** Steht vor Ozzy (in Laufrichtung) eine Stufe, die höher ist als ein Schrittchen? */
  private blockiert(x: number, richtung: number): Plattform | null {
    const vorn = x + richtung * FUSS_HALB;
    for (const p of LEVEL.plattformen)
      if (p.hoehe > this.hoehe + 70 && vorn > p.x0 && vorn < p.x1 && (richtung > 0 ? x < p.x0 : x > p.x1)) return p;
    return null;
  }

  private melden(text: string): void {
    this.meldung = text;
    this.meldungZeit = 2.2;
  }

  update(dt: number, e: Eingabe): void {
    const sp = this.spieler;
    const clip = sp.clipName;
    const richtung = e.rechts && !e.links ? 1 : e.links && !e.rechts ? -1 : 0;
    const sprungFlanke = e.springen && !this.warSprung;
    this.warSprung = e.springen;
    if (sprungFlanke) this.sprungGedrueckt = sp.zeit;
    this.meldungZeit -= dt;
    if (this.meldungZeit <= 0) this.meldung = '';
    this.stolperSperre -= dt;
    const beschaeftigt = ['umdrehen', 'zuwenden', 'abwenden', 'stolpern', 'absprung', 'landung', 'hinsetzen', 'aufstehen', 'hinlegen', 'aufwachen', 'erstarren', 'bellen', 'schuetteln', 'kopfSchief', 'umschauen', 'kratzen', 'zielFixieren'].includes(clip);
    const etwas = richtung !== 0 || e.springen || e.runter || !!e.aktion;
    if (etwas) this.ruhe = 0;
    else this.ruhe += dt;

    // Stufe hoch oder hinunter: Solange er klettert, bleibt der Grund, wo er war; danach steht er auf dem neuen
    if (this.klettern) {
      if (clip === 'hochklettern' || clip === 'runtersteigen') {
        this.warRunter = e.runter;
        return;
      }
      this.hoehe = this.klettern.von + this.klettern.d;
      this.klettern = null;
    }

    if (this.amBoden) {
      this.seitBoden = 0;
      // aufwachen / aufstehen bei jeder Eingabe
      if (etwas && clip === 'schlafen') sp.spiele('aufwachen', 0.25);
      else if (etwas && (clip === 'sitzen' || clip === 'hinsetzen') && !e.runter) sp.spiele('aufstehen', 0.25);
      else if (e.runter && !this.warRunter && (clip === 'stehen' || clip === 'anhalten')) sp.spiele('hinsetzen', 0.25);
      else if (e.aktion && !beschaeftigt) {
        const name = { schnueffeln: 'schnueffeln', umschauen: 'umschauen', bellen: 'bellen', schuetteln: 'schuetteln', kopfSchief: 'kopfSchief', ziel: 'zielFixieren', kratzen: 'kratzen', erstarren: 'erstarren', wedeln: 'wedeln', zuwenden: 'zuwenden', abwenden: 'abwenden' }[e.aktion];
        if (name) sp.spiele(name, 0.25);
      }
      // springen (mit Puffer)
      else if (sp.zeit - this.sprungGedrueckt < PUFFER && !['schlafen', 'sitzen', 'hinsetzen', 'aufstehen', 'hinlegen', 'aufwachen'].includes(clip)) {
        this.sprungGedrueckt = -1;
        this.vy = -SPRUNG;
        this.amBoden = false;
        sp.spiele('absprung', 0.1);
      } else if (!beschaeftigt && !['schlafen', 'sitzen'].includes(clip)) {
        if (richtung !== 0 && richtung !== sp.richtung) sp.spiele('umdrehen', 0.2);
        else if (richtung !== 0) {
          const block = this.blockiert(sp.x, richtung);
          const vornTiefer = this.hoehe - this.bodenBei(sp.x + richtung * KANTE);
          if (block && block.hoehe - this.hoehe <= KLETTER_MAX) {
            // nicht springen müssen: angestrengt hochklettern
            const d = block.hoehe - this.hoehe;
            sp.x = richtung > 0 ? block.x0 - KANTE : block.x1 + KANTE;
            sp.spiele('hochklettern', 0.3, richtung, { stufe: d });
            this.klettern = { von: this.hoehe, d };
          } else if (block) {
            if (this.stolperSperre <= 0 && (clip === 'laufen' || clip === 'eilen')) {
              sp.spiele('stolpern', 0.15);
              this.stolperSperre = 3;
              this.melden('Zu hoch. Springen!');
            } else if (clip !== 'stolpern' && clip !== 'stehen') sp.spiele('stehen', 0.3);
          } else if (vornTiefer > 30 && vornTiefer <= KLETTER_MAX) {
            // ein Absatz: vorsichtig hinuntersteigen statt hinunterzufallen
            sp.spiele('runtersteigen', 0.3, richtung, { stufe: vornTiefer });
            this.klettern = { von: this.hoehe, d: -vornTiefer };
          } else sp.spiele(e.eilen ? 'eilen' : 'laufen', clip === 'laufen' || clip === 'eilen' ? 0.4 : 0.3);
        } else if (clip === 'laufen' || clip === 'eilen') sp.spiele('anhalten', 0.25);
        else if (clip === 'schnueffeln' && this.ruhe > 4) sp.spiele('stehen', 0.5);
        // lange Ruhe: hinsetzen, später hinlegen und schlafen
        if (clip === 'stehen' && this.ruhe > 5) sp.spiele('zuwenden', 0.3);
        if (clip === 'vornStehen' && this.ruhe > 11) sp.spiele('hinsetzen', 0.4);
        if (clip === 'sitzen' && this.ruhe > 16) sp.spiele('hinlegen', 0.3);
      } else if (clip === 'sitzen' && this.ruhe > 16) sp.spiele('hinlegen', 0.3);
      // an der Stufe festhalten (Wurzelbewegung nicht durch die Wand)
      const b = this.blockiert(sp.x, sp.richtung);
      if (b) sp.x = sp.richtung > 0 ? Math.min(sp.x, b.x0 - FUSS_HALB) : Math.max(sp.x, b.x1 + FUSS_HALB);
      // Kante: kein Boden mehr unter den Sohlen → fallen
      const unten = this.boden(sp.x);
      if (unten < this.hoehe - 2) {
        this.amBoden = false;
        this.vy = 0;
        this.seitBoden = 0;
        sp.spiele('flug', 0.15);
      } else this.hoehe = unten;
    } else {
      // in der Luft
      this.seitBoden += dt;
      if (sp.zeit - this.sprungGedrueckt < PUFFER && this.seitBoden < COYOTE && this.vy >= 0) {
        this.sprungGedrueckt = -1;
        this.vy = -SPRUNG;
      }
      if (!e.springen && this.vy < -900) this.vy *= Math.exp(-dt * 9); // kurz gedrückt = kleiner Sprung
      this.vy += SCHWERKRAFT * dt;
      this.hoehe -= this.vy * dt;
      if (richtung !== 0) {
        sp.x += richtung * LUFT_TEMPO * dt;
        if (richtung !== sp.richtung) sp.setzen(sp.x, richtung as 1 | -1);
      }
      for (const p of LEVEL.plattformen) {
        // seitlich gegen eine Plattform: abprallen
        if (this.hoehe < p.hoehe - 30 && sp.x + FUSS_HALB > p.x0 && sp.x - FUSS_HALB < p.x1) {
          if (sp.x < p.x0) sp.x = p.x0 - FUSS_HALB;
          else if (sp.x > p.x1) sp.x = p.x1 + FUSS_HALB;
        }
      }
      const unten = this.boden(sp.x);
      if (this.vy > 0 && this.hoehe <= unten) {
        this.hoehe = unten;
        this.vy = 0;
        this.amBoden = true;
        sp.spiele('landung', 0.08);
      }
    }
    this.warRunter = e.runter;
    sp.x = Math.min(LEVEL.rechts, Math.max(LEVEL.links, sp.x));
    if (!this.geschafft && Math.abs(sp.x - LEVEL.ziel) < 500 && this.amBoden) {
      this.geschafft = true;
      sp.spiele('wedeln', 0.3);
      this.melden('Knochen gefunden!');
    }
  }

  /** Level zeichnen (Weltkoordinaten: Boden bei BODEN_Y) */
  zeichnen(c: CanvasRenderingContext2D, tinte: string, x0: number, x1: number): void {
    c.fillStyle = tinte;
    // Boden als dünne Linie
    c.fillRect(x0, BODEN_Y, x1 - x0, 14);
    for (const p of LEVEL.plattformen) {
      const y = BODEN_Y - p.hoehe;
      const r = 70;
      c.beginPath();
      c.moveTo(p.x0, BODEN_Y + 14);
      c.lineTo(p.x0, y + r);
      c.quadraticCurveTo(p.x0, y, p.x0 + r, y);
      c.lineTo(p.x1 - r, y);
      c.quadraticCurveTo(p.x1, y, p.x1, y + r);
      c.lineTo(p.x1, BODEN_Y + 14);
      c.closePath();
      c.fill();
    }
    // Ziel: ein Knochen
    const kx = LEVEL.ziel;
    const ky = BODEN_Y - 120;
    c.save();
    c.translate(kx, ky);
    c.rotate(-0.18);
    c.beginPath();
    for (const [dx, dy] of [
      [-230, -45],
      [-230, 45],
      [230, -45],
      [230, 45],
    ] as const) {
      c.moveTo(dx + 62, dy);
      c.arc(dx, dy, 62, 0, Math.PI * 2);
    }
    c.rect(-230, -42, 460, 84);
    c.fill();
    c.restore();
  }
}
