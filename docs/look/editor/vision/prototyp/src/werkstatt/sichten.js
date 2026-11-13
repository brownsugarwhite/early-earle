// Ansichten der Werkstatt: eine Parallelansicht aus jedem Winkel (Azimut, Höhe) und Helfer für die Kamera im Raum.
// Azimut 0 = von +z (Seite), −π/2 = von −x (Front, der Kopf liegt bei −x), Höhe π/2 = von oben (Top, +z zeigt nach unten).

import { THREE } from '../zeichner.js';
import { OrthoSicht, RaumSicht } from '../ansichten.js';

export const AZ = { front: -Math.PI / 2, dreiviertel: -Math.PI / 4, seite: 0, dreiviertelHinten: Math.PI / 4, ruecken: Math.PI / 2 };

// Richtung vom Ziel zur Kamera
export const richtungAus = (az, el) => [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
// „Oben“ im Bild: stetig auch über den Polen (für el = π/2 zeigt es nach −z, wie die Top-Ansicht des Editors)
export const obenAus = (az, el) => [-Math.sin(el) * Math.sin(az), Math.cos(el), -Math.sin(el) * Math.cos(az)];

export class FreieOrthoSicht extends OrthoSicht {
  constructor(name, az = 0, el = 0) {
    super('seite');
    this.name = name;
    this.az = az;
    this.el = el;
    this.achse = null;
  }
  aktualisieren() {
    const k = this.kamera, { w, h } = this.rect;
    const hw = w / 2 / this.zoom, hh = h / 2 / this.zoom;
    k.left = -hw; k.right = hw; k.top = hh; k.bottom = -hh;
    const d = richtungAus(this.az, this.el), o = obenAus(this.az, this.el), m = this.mitte;
    k.position.set(m[0] + d[0] * 20, m[1] + d[1] * 20, m[2] + d[2] * 20);
    k.up.set(o[0], o[1], o[2]);
    k.near = 0.01; k.far = 40;
    k.lookAt(m[0], m[1], m[2]);
    k.updateProjectionMatrix();
    k.updateMatrixWorld();
  }
  // rechts und oben in Weltkoordinaten (für Breiten und Konstruktionslinien)
  rechts() {
    return [Math.cos(this.az), 0, -Math.sin(this.az)];
  }
}

// Kamera im Raum mit veränderlichem Öffnungswinkel: Beim Einrasten fährt sie zurück und wird schmal (Dolly-Zoom),
// bis die Ansicht so gut wie parallel ist. Die Größe des Wesens im Bild bleibt dabei gleich.
export class DrehSicht extends RaumSicht {
  constructor() {
    super();
    this.parallel = 0; // 0 = Perspektive (30°), 1 = fast parallel (1,2°)
  }
  get oeffnung() {
    const t = this.parallel;
    // in tan-Raum mischen, damit die Fahrt gleichmäßig wirkt
    const a = Math.tan((30 / 2) * Math.PI / 180), b = Math.tan((1.2 / 2) * Math.PI / 180);
    return (2 * Math.atan(a * Math.pow(b / a, t)) * 180) / Math.PI;
  }
  aktualisieren() {
    this.fov = this.oeffnung;
    const f = Math.tan((30 / 2) * Math.PI / 180) / Math.tan((this.fov / 2) * Math.PI / 180);
    const ab = this.abstand;
    this.abstand = ab * f;
    super.aktualisieren();
    this.abstand = ab;
  }
  // Bildpunkte → Welt: um (dx, dy) Bildpunkte in der Bildebene durch das Ziel schieben
  schieben(dx, dy) {
    const k = this.kamera;
    const r = new THREE.Vector3(), o = new THREE.Vector3(), f = new THREE.Vector3();
    k.matrixWorld.extractBasis(r, o, f);
    const s = 1 / Math.max(1e-6, this.pxJeEinheit(this.ziel));
    this.ziel = [this.ziel[0] - (r.x * dx - o.x * dy) * s, this.ziel[1] - (r.y * dx - o.y * dy) * s, this.ziel[2] - (r.z * dx - o.z * dy) * s];
  }
}

// Die Grenzen des Netzes in einer Ansicht: Breite (rechts), Höhe (oben), Mitte
export function ausdehnungIn(netz, rechts, oben, schritt = 3) {
  const P = netz.pos;
  let r0 = Infinity, r1 = -Infinity, o0 = Infinity, o1 = -Infinity;
  for (let i = 0; i < P.length; i += 3 * schritt) {
    const r = P[i] * rechts[0] + P[i + 1] * rechts[1] + P[i + 2] * rechts[2];
    const o = P[i] * oben[0] + P[i + 1] * oben[1] + P[i + 2] * oben[2];
    if (r < r0) r0 = r;
    if (r > r1) r1 = r;
    if (o < o0) o0 = o;
    if (o > o1) o1 = o;
  }
  return { r0, r1, o0, o1, breite: r1 - r0, hoehe: o1 - o0 };
}
