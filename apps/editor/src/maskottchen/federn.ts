// Nachschwingen (sekundäre Bewegung): Ohren, Schopf, Schwanz, Bart, Nase, der Kopf und die Bohne selbst hängen an gedämpften
// Federn. Sie werden von der Beschleunigung ihres Ankers angetrieben (Kopf bzw. Körper): Beschleunigt der Kopf nach oben, bleiben
// die Ohren zurück und hängen kurz; setzt Ozzy hart auf, wippen sie nach, die Bohne hängt kurz durch und wabbelt wie ein Tropfen.
// Die Clips setzen nur die Grundlage, das Leben kommt hier dazu. Wenig gedämpft (liquid drop): lieber ein Nachwippen zu viel.
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
  /** Stärke (0 = aus, 1 = normal) */
  staerke = 1;
  private ohrH = feder(12, 0.2);
  private ohrV = feder(11, 0.19);
  private schopf = feder(16, 0.17);
  private schwanz = feder(9.5, 0.18);
  private bart = feder(9, 0.17);
  private nase = feder(22, 0.22);
  private kopfY = feder(17, 0.4);
  private kopfN = feder(13, 0.32);
  private stauchen = feder(15, 0.24);
  private biegen = feder(13, 0.22);
  private alle = [
    this.ohrH,
    this.ohrV,
    this.schopf,
    this.schwanz,
    this.bart,
    this.nase,
    this.kopfY,
    this.kopfN,
    this.stauchen,
    this.biegen,
  ];
  private letzte: { kx: number; ky: number; rx: number; ry: number; vkx: number; vky: number; vrx: number; vry: number } | null = null;
  private rest = 0;

  zuruecksetzen(): void {
    for (const f of this.alle) {
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
    // Beschleunigung aus der Änderung der Geschwindigkeit in diesem Bild; begrenzt wird die Änderung (ein Stoß bleibt ein Stoß,
    // nur ein Sprung im Ablauf, etwa ein harter Schnitt, explodiert nicht)
    const lim = (d: number) => Math.max(-1800, Math.min(1800, d)) / dt;
    const akx = lim(vkx - l.vkx);
    const aky = lim(vky - l.vky);
    const arx = lim(vrx - l.vrx);
    const ary = lim(vry - l.vry);
    this.letzte = { kx, ky, rx, ry, vkx, vky, vrx, vry };
    const k = this.staerke;
    // vorwärts = in Blickrichtung
    const vor = akx * richtung;
    const rvor = arx * richtung;
    this.rest += dt;
    const h = 1 / 240;
    // Kopplungen wie bei einem Pendel: Winkelbeschleunigung ≈ Beschleunigung der Wurzel / Länge (Ohr ~ 350, Bart ~ 200)
    while (this.rest >= h) {
      this.rest -= h;
      // Ohren: hängen beim Hochbeschleunigen (aky < 0), schwingen beim Anfahren nach hinten
      schritt(this.ohrH, k * (-aky * 0.15 + vor * 0.05), h);
      schritt(this.ohrV, k * (-aky * 0.15 - vor * 0.05), h);
      schritt(this.schopf, k * (-aky * 0.09 - vor * 0.08), h);
      schritt(this.schwanz, k * (aky * 0.11 + rvor * 0.08), h);
      // Kinnstück: ein Pendel im Bild (bleibt beim Anfahren zurück), dazu ein wenig beim Aufsetzen
      schritt(this.bart, k * (-akx * 0.09 - aky * 0.03 * richtung), h);
      schritt(this.nase, k * (-aky * 0.0016), h);
      // Kopf bleibt hinter dem Körper zurück (Bildschirm-y nach unten)
      schritt(this.kopfY, k * -ary * 0.32, h);
      schritt(this.kopfN, k * (rvor * 0.02 + ary * 0.012), h);
      // die Bohne: beim Aufsetzen flacher und breiter, die Mitte hängt durch
      schritt(this.stauchen, k * ary * 0.0015, h);
      schritt(this.biegen, k * ary * 0.26, h);
    }
    this.schreiben(pose);
  }

  private schreiben(pose: Pose): void {
    pose.ohrH += this.ohrH.x;
    pose.ohrV += this.ohrV.x;
    pose.schopf += this.schopf.x;
    pose.schwanz += this.schwanz.x;
    // das Bart-Pendel schwingt im Bild: auf Seitwärts (sieht man von vorn) und Vor/Zurück (von der Seite) verteilt
    const th = (pose.theta * Math.PI) / 180;
    pose.bart += this.bart.x * Math.cos(th);
    pose.bartDreh += this.bart.x * Math.sin(th);
    pose.nase += this.nase.x;
    pose.kopfY += this.kopfY.x;
    pose.kopfNicken += this.kopfN.x;
    pose.stauchen += this.stauchen.x;
    pose.biegen += this.biegen.x;
  }
}
