// Ansichten: Seite (von +z), Front (von −x), Top (von +y, +z nach unten) wie in der europäischen Projektion, dazu der Raum
// (perspektivisch, frei gedreht). Jede Ansicht kann projizieren, Strahlen werfen und Punkte in ihrer Ebene ziehen.

import { THREE } from './zeichner.js';

export const ACHSEN = {
  seite: { pos: [0, 0, 1], oben: [0, 1, 0], u: [1, 0, 0], v: [0, 1, 0] },
  front: { pos: [-1, 0, 0], oben: [0, 1, 0], u: [0, 0, 1], v: [0, 1, 0] },
  top: { pos: [0, 1, 0], oben: [0, 0, -1], u: [1, 0, 0], v: [0, 0, -1] },
};

export class OrthoSicht {
  constructor(name) {
    this.name = name;
    this.art = 'ortho';
    this.achse = ACHSEN[name];
    this.kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    this.rect = { x: 0, y: 0, w: 100, h: 100 };
    this.zoom = 100; // CSS-Pixel je Einheit
    this.mitte = [0, 0, 0];
    this.hinten = false;
  }
  setzen(rect, zoom, mitte) {
    this.rect = rect;
    if (zoom) this.zoom = zoom;
    if (mitte) this.mitte = mitte.slice();
    this.aktualisieren();
  }
  aktualisieren() {
    const k = this.kamera, { w, h } = this.rect;
    const hw = w / 2 / this.zoom, hh = h / 2 / this.zoom;
    k.left = -hw; k.right = hw; k.top = hh; k.bottom = -hh;
    const a = this.achse, s = this.hinten ? -1 : 1;
    const m = this.mitte;
    k.position.set(m[0] + a.pos[0] * 20 * s, m[1] + a.pos[1] * 20 * s, m[2] + a.pos[2] * 20 * s);
    k.up.set(...a.oben);
    k.near = 0.01; k.far = 40;
    k.lookAt(m[0], m[1], m[2]);
    k.updateProjectionMatrix();
    k.updateMatrixWorld();
  }
  projizieren(p) {
    const v = new THREE.Vector3(p[0], p[1], p[2]).project(this.kamera);
    return [this.rect.x + (v.x * 0.5 + 0.5) * this.rect.w, this.rect.y + (-v.y * 0.5 + 0.5) * this.rect.h, v.z];
  }
  strahl(sx, sy) {
    const nx = ((sx - this.rect.x) / this.rect.w) * 2 - 1, ny = -(((sy - this.rect.y) / this.rect.h) * 2 - 1);
    const o = new THREE.Vector3(nx, ny, -1).unproject(this.kamera);
    const d = new THREE.Vector3();
    this.kamera.getWorldDirection(d);
    return { o: [o.x, o.y, o.z], d: [d.x, d.y, d.z] };
  }
  // Punkt p0 in der Bildebene so verschieben, dass er unter (sx, sy) liegt; Tiefe bleibt
  inEbene(p0, sx, sy) {
    const { o, d } = this.strahl(sx, sy);
    const t = (p0[0] - o[0]) * d[0] + (p0[1] - o[1]) * d[1] + (p0[2] - o[2]) * d[2];
    return [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
  }
  blickrichtung() {
    const d = new THREE.Vector3();
    this.kamera.getWorldDirection(d);
    return [d.x, d.y, d.z];
  }
  pxJeEinheit() {
    return this.zoom;
  }
  enthaelt(sx, sy) {
    const r = this.rect;
    return sx >= r.x && sy >= r.y && sx <= r.x + r.w && sy <= r.y + r.h;
  }
}

export class RaumSicht {
  constructor() {
    this.name = 'raum';
    this.art = 'raum';
    this.kamera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
    this.rect = { x: 0, y: 0, w: 100, h: 100 };
    this.azimut = -0.62; // um y, 0 = von +z (Seite)
    this.hoehe = 0.36;
    this.abstand = 7.5;
    this.ziel = [0, 0, 0];
    this.fov = 30;
  }
  setzen(rect) {
    this.rect = rect;
    this.aktualisieren();
  }
  aktualisieren() {
    const k = this.kamera;
    k.aspect = this.rect.w / Math.max(1, this.rect.h);
    k.fov = this.fov;
    const ch = Math.cos(this.hoehe);
    const p = [
      this.ziel[0] + Math.sin(this.azimut) * ch * this.abstand,
      this.ziel[1] + Math.sin(this.hoehe) * this.abstand,
      this.ziel[2] + Math.cos(this.azimut) * ch * this.abstand,
    ];
    k.position.set(...p);
    k.up.set(0, 1, 0);
    k.lookAt(...this.ziel);
    k.near = Math.max(0.02, this.abstand * 0.02);
    k.far = this.abstand * 8 + 50;
    k.updateProjectionMatrix();
    k.updateMatrixWorld();
  }
  projizieren(p) {
    const v = new THREE.Vector3(p[0], p[1], p[2]).project(this.kamera);
    return [this.rect.x + (v.x * 0.5 + 0.5) * this.rect.w, this.rect.y + (-v.y * 0.5 + 0.5) * this.rect.h, v.z];
  }
  strahl(sx, sy) {
    const nx = ((sx - this.rect.x) / this.rect.w) * 2 - 1, ny = -(((sy - this.rect.y) / this.rect.h) * 2 - 1);
    const a = new THREE.Vector3(nx, ny, -1).unproject(this.kamera);
    const b = new THREE.Vector3(nx, ny, 1).unproject(this.kamera);
    const d = b.sub(a).normalize();
    return { o: [a.x, a.y, a.z], d: [d.x, d.y, d.z] };
  }
  inEbene(p0, sx, sy) {
    const { o, d } = this.strahl(sx, sy);
    const f = new THREE.Vector3();
    this.kamera.getWorldDirection(f);
    const n = [f.x, f.y, f.z];
    const den = d[0] * n[0] + d[1] * n[1] + d[2] * n[2];
    const t = ((p0[0] - o[0]) * n[0] + (p0[1] - o[1]) * n[1] + (p0[2] - o[2]) * n[2]) / (den || 1e-9);
    return [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
  }
  blickrichtung() {
    const d = new THREE.Vector3();
    this.kamera.getWorldDirection(d);
    return [d.x, d.y, d.z];
  }
  pxJeEinheit(p) {
    // Bildpunkte je Einheit an der Stelle p
    const a = this.projizieren(p);
    const r = new THREE.Vector3();
    this.kamera.getWorldDirection(r);
    const up = new THREE.Vector3(0, 1, 0).cross(r).normalize();
    const b = this.projizieren([p[0] + up.x * 0.1, p[1] + up.y * 0.1, p[2] + up.z * 0.1]);
    return Math.hypot(a[0] - b[0], a[1] - b[1]) / 0.1;
  }
  enthaelt(sx, sy) {
    const r = this.rect;
    return sx >= r.x && sy >= r.y && sx <= r.x + r.w && sy <= r.y + r.h;
  }
}
