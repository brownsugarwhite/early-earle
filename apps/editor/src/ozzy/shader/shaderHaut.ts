/**
 * Die Shader in Ozzy (20.11.2026): wählt die Voreinstellung, führt ihre Zeit und legt ihr Bild über den Grund. Ozzy ruft je Bild
 * `zeichnen` (wie `FesteHaut.zeichnen`); der Rückgabewert sagt, ob der Shader das nächste Bild auch ohne Änderung braucht.
 */
import type { Camera, WebGLRenderer } from 'three';
import type { HautNetz } from '../../anfang/haut';
import { ShaderKern, type ShaderLauf, type Voreinstellung } from './kern';
import { VOREINSTELLUNGEN } from './voreinstellungen';

export type ShaderHautWerte = {
  schnitt: [number, number, number, number] | null;
  spiegelSchnitt: number | null;
  flach: boolean;
  deckung: number;
  buehne: boolean;
  regler: Record<string, number>;
  /** Bildpunkte (CSS) je Welteinheit in der Ebene durch die Mitte */
  mass: number;
};

export class ShaderHaut {
  readonly kern: ShaderKern;
  private lauf: ShaderLauf | null = null;
  private laufId: string | null = null;
  private t0 = performance.now();
  private letzte = performance.now();
  /** Zeit des letzten Bilds auf dem Prozessor (ms) und Zahl der Bilder */
  readonly mess = { ms: 0, bilder: 0, id: '' };

  constructor(renderer: WebGLRenderer) {
    this.kern = new ShaderKern(renderer);
  }

  static finden(id: string | null | undefined): Voreinstellung {
    return VOREINSTELLUNGEN.find((v) => v.id === id) ?? VOREINSTELLUNGEN[0]!;
  }

  groesse(b: number, h: number, dpr: number): void {
    this.kern.groesse(b, h, dpr);
  }

  netzSetzen(netz: HautNetz | null, wicklung: number): void {
    this.kern.netzSetzen(netz, wicklung);
  }

  get bereit(): boolean {
    return this.kern.bereit;
  }

  /** zeichnet den Shader `id` über den Grund; true: Er braucht das nächste Bild auch ohne Änderung */
  zeichnen(kamera: Camera, id: string, w: ShaderHautWerte): boolean {
    if (!this.kern.bereit) return false;
    const t = performance.now();
    const v = ShaderHaut.finden(id);
    if (this.laufId !== v.id || !this.lauf) {
      this.lauf?.freigeben();
      if (this.laufId) this.kern.zieleFreigeben(`${this.laufId}:`);
      this.lauf = v.bauen(this.kern);
      this.laufId = v.id;
      this.t0 = t;
      this.kern.bildNr = 0;
    }
    const dt = Math.min(0.1, Math.max(0, (t - this.letzte) / 1000));
    this.letzte = t;
    const werte = { zeit: (t - this.t0) / 1000, dt, deckung: w.deckung, buehne: w.buehne, regler: w.regler };
    const zurueck = this.kern.zustandMerken();
    let unruhig = false;
    try {
      this.kern.bildBeginnen(kamera, { zeit: werte.zeit, schnitt: w.schnitt, spiegelSchnitt: w.spiegelSchnitt, flach: w.flach, buehne: w.buehne, mass: w.mass });
      const bild = this.lauf.bild(this.kern, werte);
      if (bild) this.kern.auflegen(bild, w.deckung);
      unruhig = this.lauf.unruhig(werte);
    } finally {
      zurueck();
    }
    this.mess.ms = performance.now() - t;
    this.mess.bilder++;
    this.mess.id = v.id;
    return unruhig;
  }

  /** nicht zu sehen: nichts zu tun (der laufende Shader bleibt für den nächsten Blick) */
  aus(): void {
    this.letzte = performance.now();
  }
}
