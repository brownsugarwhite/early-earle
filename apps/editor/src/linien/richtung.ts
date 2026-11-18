/**
 * „Richtungen statt Griffe“ (Konzept vom 15.11.2026, Florian: „Ja, so bauen“): Eine Richtung ist das Stück Linie, das einen Punkt
 * verlässt. Man fasst die Linie nahe am Punkt an und dreht sie um ihn; der Griff erscheint nur beim Halten, ein Ring zeigt die Ebene.
 *
 * - Der Winkel folgt dem Zeiger genau. Der Schwung (Länge des Griffs) klebt am Ring: Erst mehr als ein Zehntel des Radius nach außen
 *   oder innen ändert ihn.
 * - Rund dreht die Gegenseite mit (die Linie dreht als Ganzes). Mit ⌥ reißt die Richtung los und dreht allein (Knick); die
 *   Gegenseite federt in ihre Lage zurück.
 * - Eine geknickte Richtung, die bis auf 5° in die Flucht ihrer Gegenseite kommt, rastet ein (mit ⌥ nicht) und ist nach dem
 *   Loslassen rund.
 * - Doppelklick schaltet Knick und rund; beim Runden dreht sich die Richtung animiert in die Flucht.
 *
 * Hier die Rechnung in 2D (das Netz der Probe); im Raum rechnet `Raum3D` dasselbe auf der Haut.
 */

import { Feder1 } from './feder';
import { type Netz, type Seite, armGriff, armGriffSetzen, istKnick, netzKopie } from './netz';

export type { Seite };

export interface RichtungZiel {
  art: 'richtung';
  pi: number;
  li: number;
  /** Stelle des Punkts in der Linie */
  k: number;
  seite: Seite;
}

/** Bild des Drehens, in Lagen wie die Proben (2D: Punkte des Entwurfs; Raum: Bildschirm, z = Tiefe) */
export interface DrehBild {
  /** Ring als geschlossener Zug: x, y, z je Punkt */
  ring: number[];
  nabe: [number, number, number];
  /** Spitze des Griffs (auf dem Ring, zum Zeiger hin) */
  spitze: [number, number, number];
  /** alte Richtungen: je Strich x0, y0, z0, x1, y1, z1 */
  alt: number[];
  /** gerade rund (die Gegenseite dreht mit oder ist eingerastet) */
  rund: boolean;
  eingerastet: boolean;
}

/** Drehen einer Richtung; in 2D `Dreher2D`, im Raum `Raum3D` */
export interface Dreher {
  /**
   * Drücken auf eine Richtung. `kippen` (nur im Raum): aus der Haut statt auf ihr; `hebel`: kleinster Ringradius in Einheiten der
   * Proben. Ergebnis: Spitze des Hebels (dorthin gleitet der Zeiger) oder null.
   */
  drehenBeginnen(z: RichtungZiel, kippen: boolean, hebel: number): [number, number] | null;
  /** Zeiger in Einheiten der Proben; `alt`: ⌥ gehalten; `kippen` (nur im Raum): ⇧ gerade gehalten, die Ebene wechselt dynamisch */
  drehenZiehen(cx: number, cy: number, alt: boolean, dt: number, kippen?: boolean): void;
  drehenEnden(): void;
  drehBild(): DrehBild | null;
  /** Doppelklick: Knick ↔ rund. Ergebnis: jetzt rund (dann `ausrichten` von 0 bis 1 animieren), jetzt Knick, oder null */
  knickUmschalten(z: RichtungZiel): boolean | null;
  /** die umgeschaltete Richtung bis t (0 … 1) in die Flucht ihrer Gegenseite drehen */
  ausrichten(t: number): void;
}

export const GEGEN: Record<Seite, Seite> = { aus: 'ein', ein: 'aus' };
/** Einrasten in die Flucht der Gegenseite */
export const RASTEN = (5 * Math.PI) / 180;
/** Schwung klebt am Ring, solange der Zeiger weniger als dieses Maß (Anteil am Radius) nach außen oder innen geht */
export const KLEBEN = 0.1;

export const winkelVon = (v: readonly [number, number]): number => Math.atan2(v[1], v[0]);
export function winkelDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}
const drehe = (v: readonly [number, number], w: number): [number, number] => {
  const c = Math.cos(w);
  const s = Math.sin(w);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1]];
};

/** Schwung aus dem Abstand des Zeigers: am Ring 1, erst jenseits von `KLEBEN` wachsend oder schrumpfend */
export function schwungFaktor(u: number): number {
  const f = u > 1 + KLEBEN ? u - KLEBEN : u < 1 - KLEBEN ? u + KLEBEN : 1;
  return Math.max(0.05, f);
}

export class Dreher2D implements Dreher {
  private zug: {
    z: RichtungZiel;
    start: Netz;
    nabe: [number, number];
    g0: [number, number];
    p0: [number, number] | null;
    rho0: number;
    knick0: boolean;
    los: boolean;
    partner: Feder1;
    winkel: number;
    faktor: number;
    eingerastet: boolean;
  } | null = null;
  private ausr: { z: RichtungZiel; start: Netz; g0: [number, number]; dw: number } | null = null;

  constructor(
    private holen: () => Netz,
    private setzen: (n: Netz) => void,
  ) {}

  drehenBeginnen(z: RichtungZiel, _kippen: boolean, hebel: number): [number, number] | null {
    const netz = this.holen();
    const l = netz.linien[z.li];
    const p = netz.punkte[z.pi];
    const g0 = l ? armGriff(l, z.k, z.seite) : null;
    if (!l || !p || !g0) return null;
    const len = Math.hypot(g0[0], g0[1]);
    if (len < 1e-6) return null;
    const rho0 = Math.max(len, hebel);
    this.zug = {
      z,
      start: netzKopie(netz),
      nabe: [p.x, p.y],
      g0,
      p0: armGriff(l, z.k, GEGEN[z.seite]),
      rho0,
      knick0: istKnick(l, z.k),
      los: false,
      partner: new Feder1(0),
      winkel: 0,
      faktor: 1,
      eingerastet: false,
    };
    return [p.x + (g0[0] / len) * rho0, p.y + (g0[1] / len) * rho0];
  }

  drehenZiehen(cx: number, cy: number, alt: boolean, dt: number): void {
    const zg = this.zug;
    if (!zg) return;
    const vx = cx - zg.nabe[0];
    const vy = cy - zg.nabe[1];
    const r = Math.hypot(vx, vy);
    if (r < 1e-6) return;
    zg.winkel = winkelDiff(Math.atan2(vy, vx), winkelVon(zg.g0));
    zg.faktor = schwungFaktor(r / zg.rho0);
    if (alt && !zg.knick0) zg.los = true;
    const knick = zg.knick0 || zg.los;
    // die Gegenseite: rund genau mit, losgerissen federt sie zurück
    if (knick) {
      zg.partner.ziel = 0;
      zg.partner.schritt(dt, 7, 0.75);
    } else zg.partner.setzen(zg.winkel);
    let g = drehe(zg.g0, zg.winkel);
    g = [g[0] * zg.faktor, g[1] * zg.faktor];
    const p = zg.p0 ? drehe(zg.p0, zg.partner.x) : null;
    zg.eingerastet = false;
    if (knick && p && !alt) {
      const d = winkelDiff(winkelVon(g), winkelVon(p) + Math.PI);
      if (Math.abs(d) < RASTEN) {
        const lg = Math.hypot(g[0], g[1]);
        const lp = Math.hypot(p[0], p[1]) || 1;
        g = [(-p[0] / lp) * lg, (-p[1] / lp) * lg];
        zg.eingerastet = true;
      }
    }
    const netz = netzKopie(zg.start);
    const l = netz.linien[zg.z.li]!;
    armGriffSetzen(l, zg.z.k, zg.z.seite, g);
    if (p) armGriffSetzen(l, zg.z.k, GEGEN[zg.z.seite], p);
    this.setzen(netz);
  }

  drehenEnden(): void {
    const zg = this.zug;
    if (!zg) return;
    const netz = this.holen();
    const l = netz.linien[zg.z.li];
    if (l) {
      if (!l.knick) l.knick = l.punkte.map(() => false);
      if (zg.eingerastet) l.knick[zg.z.k] = false;
      else if (zg.los) {
        l.knick[zg.z.k] = true;
        // die Gegenseite steht wieder, wo sie war (die Feder ist vielleicht noch unterwegs)
        if (zg.p0) armGriffSetzen(l, zg.z.k, GEGEN[zg.z.seite], zg.p0);
      }
      this.setzen(netz);
    }
    this.zug = null;
  }

  drehBild(): DrehBild | null {
    const zg = this.zug;
    if (!zg) return null;
    const [hx, hy] = zg.nabe;
    const R = zg.rho0 * zg.faktor;
    const ring: number[] = [];
    const n = 96;
    for (let i = 0; i <= n; i++) {
      const w = (2 * Math.PI * i) / n;
      ring.push(hx + R * Math.cos(w), hy + R * Math.sin(w), 0);
    }
    const netz = this.holen();
    const g = armGriff(netz.linien[zg.z.li]!, zg.z.k, zg.z.seite) ?? zg.g0;
    const w = winkelVon(g);
    const w0 = winkelVon(zg.g0);
    const rund = !(zg.knick0 || zg.los) || zg.eingerastet;
    const alt = [hx, hy, 0, hx + zg.rho0 * Math.cos(w0), hy + zg.rho0 * Math.sin(w0), 0];
    if (rund && zg.p0) {
      const wp = winkelVon(zg.p0);
      alt.push(hx, hy, 0, hx + zg.rho0 * Math.cos(wp), hy + zg.rho0 * Math.sin(wp), 0);
    }
    return {
      ring,
      nabe: [hx, hy, 0],
      spitze: [hx + R * Math.cos(w), hy + R * Math.sin(w), 0],
      alt,
      rund,
      eingerastet: zg.eingerastet,
    };
  }

  knickUmschalten(z: RichtungZiel): boolean | null {
    const netz = netzKopie(this.holen());
    const l = netz.linien[z.li];
    if (!l) return null;
    const g = armGriff(l, z.k, z.seite);
    const p = armGriff(l, z.k, GEGEN[z.seite]);
    if (!g || !p) return null;
    if (!l.knick) l.knick = l.punkte.map(() => false);
    const rundJetzt = !!l.knick[z.k];
    l.knick[z.k] = !rundJetzt;
    this.setzen(netz);
    this.ausr = rundJetzt ? { z, start: netzKopie(netz), g0: g, dw: winkelDiff(winkelVon(p) + Math.PI, winkelVon(g)) } : null;
    return rundJetzt;
  }

  ausrichten(t: number): void {
    const a = this.ausr;
    if (!a) return;
    const netz = netzKopie(a.start);
    armGriffSetzen(netz.linien[a.z.li]!, a.z.k, a.z.seite, drehe(a.g0, a.dw * Math.min(1, t)));
    this.setzen(netz);
    if (t >= 1) this.ausr = null;
  }
}
