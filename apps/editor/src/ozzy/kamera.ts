/**
 * Ozzy: eine Kamera für alles (Plan, Grundsatz G5 „Perspektive als Zahl“ und G4 „Größe bleibt“).
 *
 * Die Lage ist Drehung (`gier`, `neigung`), Mitte (`ziel`), Maßstab `s` (Bildpunkte je Welteinheit in der Ebene durch die Mitte)
 * und Perspektive `p` (1 = räumlich mit dem Öffnungswinkel `fov`, 0 = genau parallel). Der Maßstab hängt nicht von `p` ab: Beim
 * Einrasten fährt die Kamera zurück und wird schmal (Dolly-Zoom), die Form in der Mitte bleibt genau so groß. Unter `P_MIN` zeigt
 * eine parallele Kamera dasselbe Bild (der Rest Perspektive davor ist kleiner als ein Viertel Bildpunkt); die Drehung ist stetig über
 * die Pole (Top ohne Sonderfall).
 */

import { type Camera, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';

export interface KameraLage {
  /** Drehung um die Hochachse (Bogenmaß; 0 = von +z, die Seite; −π/2 = von −x, die Front) */
  gier: number;
  /** Höhe (Bogenmaß; π/2 = von oben, die Top-Ansicht) */
  neigung: number;
  ziel: Vector3;
  /** Bildpunkte (CSS) je Welteinheit in der Ebene durch `ziel` */
  s: number;
  /** 1 = räumlich, 0 = parallel */
  p: number;
  /** Öffnungswinkel bei p = 1 (Grad) */
  fov: number;
}

export const P_MIN = 0.004;

/** Richtung vom Ziel zur Kamera */
export function richtung(gier: number, neigung: number): Vector3 {
  return new Vector3(Math.sin(gier) * Math.cos(neigung), Math.sin(neigung), Math.cos(gier) * Math.cos(neigung));
}

/** „Oben“ im Bild, stetig auch über den Polen (von oben zeigt +z nach unten, wie im Editor) */
export function obenAus(gier: number, neigung: number): Vector3 {
  return new Vector3(-Math.sin(neigung) * Math.sin(gier), Math.cos(neigung), -Math.sin(neigung) * Math.cos(gier));
}

export class Kamera {
  readonly persp = new PerspectiveCamera(30, 1, 1, 1e7);
  readonly ortho = new OrthographicCamera(-1, 1, 1, -1, 1, 1e7);
  aktiv: PerspectiveCamera | OrthographicCamera = this.persp;
  /** Abstand der Kamera zur Mitte im letzten Bild */
  abstand = 1;

  /** stellt die Kamera für ein Bild der Größe W × H (CSS) und eine Szene, die um `tiefe` vor und hinter der Mitte reicht */
  stellen(l: KameraLage, W: number, H: number, tiefe: number): PerspectiveCamera | OrthographicCamera {
    const t1 = Math.tan((l.fov * Math.PI) / 360);
    const p = Math.max(P_MIN, l.p);
    const t = t1 * p;
    const D = H / 2 / (Math.max(1e-6, l.s) * t);
    this.abstand = D;
    const d = richtung(l.gier, l.neigung);
    const o = obenAus(l.gier, l.neigung);
    const c = l.p <= P_MIN ? this.ortho : this.persp;
    c.position.copy(l.ziel).addScaledVector(d, D);
    c.up.copy(o);
    c.lookAt(l.ziel);
    const tief = Math.max(1, tiefe);
    c.near = Math.max(D * 1e-3, D - tief);
    c.far = D + tief;
    if (c === this.ortho) {
      const hw = W / 2 / l.s;
      const hh = H / 2 / l.s;
      this.ortho.left = -hw;
      this.ortho.right = hw;
      this.ortho.top = hh;
      this.ortho.bottom = -hh;
    } else {
      this.persp.fov = (2 * Math.atan(t) * 180) / Math.PI;
      this.persp.aspect = W / H;
    }
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
    this.aktiv = c;
    return c;
  }

  /** Strahl durch den Bildpunkt (x, y) in CSS-Pixeln eines Bilds W × H; gilt für beide Kameras */
  strahl(x: number, y: number, W: number, H: number): { o: Vector3; d: Vector3 } {
    const nx = (x / W) * 2 - 1;
    const ny = 1 - (y / H) * 2;
    const a = new Vector3(nx, ny, -1).unproject(this.aktiv as Camera);
    const b = new Vector3(nx, ny, 1).unproject(this.aktiv as Camera);
    return { o: a, d: b.sub(a).normalize() };
  }
}

/** kürzester Winkelweg von a nach b (Bogenmaß) */
export function winkelZu(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d;
}

/**
 * Die Perspektive während einer Fahrt in eine Ansicht: im Tangens gemischt (gleichmäßig für das Auge, wie in der Werft), endet bei
 * genau 0. `t` von 0 (räumlich) bis 1 (parallel).
 */
export function perspektiveBei(t: number): number {
  const b = 0.004;
  const e = Math.pow(b, Math.min(1, Math.max(0, t)));
  return (e - b) / (1 - b);
}
