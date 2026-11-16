// Nachschwingen (sekundäre Bewegung): Ohren, Schopf, Schwanz, Bart und der Kopf hängen an gedämpften Federn. Sie werden von der
// Beschleunigung ihres Ankers angetrieben (Kopf bzw. Körper): Beschleunigt der Kopf nach oben, bleiben die Ohren zurück und
// hängen kurz; setzt Ozzy hart auf, wippen sie nach. Die Clips setzen nur die Grundlage, das Leben kommt hier dazu.
// Gerechnet wird in festen kleinen Schritten (240 Hz), damit es bei jeder Bildrate gleich schwingt.
import type { Pose } from './pose';

interface Feder {
  x: number;
  v: number;
  omega: number; // Eigenfrequenz (rad/s)
  zeta: number; // Dämpfung (1 = kritisch)
}

function feder(omega: number, zeta: number): Feder {
  return { x: 0, v: 0, omega, zeta };
}
function schritt(f: Feder, antrieb: number, dt: number): void {
  const a = -f.omega * f.omega * f.x - 2 * f.zeta * f.omega * f.v + antrieb;
  f.v += a * dt;
  f.x += f.v * dt;
}

export class Federn {
  /** Stärke (0 = aus, 1 = normal); pro Clip einstellbar über die Pose nicht nötig */
  staerke = 1;
  private ohrH = feder(13, 0.32);
  private ohrV = feder(12, 0.3);
  private schopf = feder(17, 0.28);
  private schwanz = feder(10, 0.26);
  private bart = feder(14, 0.35);
  private kopfY = feder(19, 0.55);
  private kopfN = feder(15, 0.45);
  private stauchen = feder(16, 0.42);
  private letzte: { kx: number; ky: number; rx: number; ry: number; vkx: number; vky: number; vrx: number; vry: number } | null = null;
  private rest = 0;

  zuruecksetzen(): void {
    for (const f of [this.ohrH, this.ohrV, this.schopf, this.schwanz, this.bart, this.kopfY, this.kopfN, this.stauchen]) {
      f.x = 0;
      f.v = 0;
    }
    this.letzte = null;
  }

  /** Federn um dt weiter, angetrieben von Kopf (kx, ky) und Körper (rx, ry) in Weltkoordinaten; Ergebnis in die Pose */
  anwenden(pose: Pose, dt: number, kopf: [number, number], koerper: [number, number], richtung: number): void {
    const [kx, ky] = kopf;
    const [rx, ry] = koerper;
    if (!this.letzte || dt <= 0) {
      this.letzte = { kx, ky, rx, ry, vkx: 0, vky: 0, vrx: 0, vry: 0 };
      this.schreiben(pose);
      return;
    }
    const l = this.letzte;
    const vkx = (kx - l.kx) / dt;
    const vky = (ky - l.ky) / dt;
    const vrx = (rx - l.rx) / dt;
    const vry = (ry - l.ry) / dt;
    // Beschleunigung (begrenzt, damit ein Sprung im Ablauf nicht explodiert)
    const lim = (a: number) => Math.max(-9000, Math.min(9000, a));
    const akx = lim((vkx - l.vkx) / dt);
    const aky = lim((vky - l.vky) / dt);
    const arx = lim((vrx - l.vrx) / dt);
    const ary = lim((vry - l.vry) / dt);
    this.letzte = { kx, ky, rx, ry, vkx, vky, vrx, vry };
    const k = this.staerke;
    // vorwärts = in Blickrichtung
    const vor = akx * richtung;
    const rvor = arx * richtung;
    this.rest += dt;
    const h = 1 / 240;
    while (this.rest >= h) {
      this.rest -= h;
      // Ohren: hängen beim Hochbeschleunigen (aky < 0), schwingen beim Anfahren nach hinten
      schritt(this.ohrH, k * (-aky * 0.011 + vor * 0.004), h);
      schritt(this.ohrV, k * (-aky * 0.011 - vor * 0.004), h);
      schritt(this.schopf, k * (-aky * 0.006 - vor * 0.006), h);
      schritt(this.schwanz, k * (aky * 0.008 + rvor * 0.006), h);
      schritt(this.bart, k * (-vor * 0.004), h);
      // Kopf bleibt hinter dem Körper zurück (Bildschirm-y nach unten)
      schritt(this.kopfY, k * -ary * 0.035, h);
      schritt(this.kopfN, k * (rvor * 0.0022 + ary * 0.0012), h);
      schritt(this.stauchen, k * ary * 0.000016, h);
    }
    this.schreiben(pose);
  }

  private schreiben(pose: Pose): void {
    pose.ohrH += this.ohrH.x;
    pose.ohrV += this.ohrV.x;
    pose.schopf += this.schopf.x;
    pose.schwanz += this.schwanz.x;
    pose.bart += this.bart.x;
    pose.kopfY += this.kopfY.x;
    pose.kopfNicken += this.kopfN.x;
    pose.stauchen += this.stauchen.x;
  }
}
