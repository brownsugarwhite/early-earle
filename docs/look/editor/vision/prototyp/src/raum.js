// Der Raum und seine Faltung: Raumecke (gefaltet) ⇄ Blatt (aufgefaltet, Projektionsmethode 1) ⇄ Blick (eine Ansicht).
// Die Wände tragen die Ansichten wie Schatten. Aufgefaltet liegen sie genau dort, wo das Blatt die Ansichten zeigt.

import { THREE } from './zeichner.js';
import { OrthoSicht, RaumSicht } from './ansichten.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Raum {
  constructor() {
    this.sichten = { seite: new OrthoSicht('seite'), front: new OrthoSicht('front'), top: new OrthoSicht('top'), raum: new RaumSicht() };
    this.modus = 'raum'; // 'raum' | 'blatt' | 'blick'
    this.blick = 'seite';
    this.falte = 0; // 0 Raum, 1 Blatt (animiert)
    this.falteZiel = 0;
    this.box = { min: [-1.4, -1.2, -1.2], max: [1.4, 1.2, 1.2] };
    this.blickAnim = null; // Übergang Blatt ⇄ Blick: { von, zu, t }
    this.blickT = 0; // 0 = Ausschnitt im Blatt, 1 = ganzer Bildschirm
    this.jellyAlpha = 1;
    this.blattZoom = 1; // Zusatzzoom des Blatts
    this.blattVersatz = [0, 0];
    this.blickZoom = 1;
    this.blickVersatz = [0, 0];
  }

  // Raumgröße an die Form anpassen (Rand rundum)
  boxSetzen(netz) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const P = netz.pos;
    for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], P[i + k]);
      max[k] = Math.max(max[k], P[i + k]);
    }
    const ausd = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    const rand = ausd * 0.22;
    // weich nachführen, damit die Wände beim Ziehen nicht springen
    const z = { min: min.map((v) => v - rand), max: max.map((v) => v + rand) };
    // Tiefe (z) mindestens so groß wie ein Drittel der Länge, damit Front und Top lesbar bleiben
    const mitteZ = 0;
    const halbZ = Math.max((z.max[2] - z.min[2]) / 2, (z.max[0] - z.min[0]) * 0.28);
    z.min[2] = mitteZ - halbZ;
    z.max[2] = mitteZ + halbZ;
    if (!this._boxStart) { this.box = z; this._boxStart = true; return; }
    for (const k of ['min', 'max']) for (let i = 0; i < 3; i++) this.box[k][i] += (z[k][i] - this.box[k][i]) * 0.15;
  }

  // Blatt: Rechtecke der vier Ansichten (CSS-Pixel), gemeinsamer Maßstab
  blattLayout(W, H) {
    const b = this.box;
    const a = b.max[0] - b.min[0]; // Länge (Seite, Top)
    const h = b.max[1] - b.min[1]; // Höhe (Seite, Front)
    const c = b.max[2] - b.min[2]; // Breite (Front, Top)
    const rand = Math.min(W, H) * 0.03;
    let s = Math.min((W - 2 * rand) / (a + c), (H - 2 * rand) / (h + c)) * this.blattZoom;
    const bw = (a + c) * s, bh = (h + c) * s;
    const x0 = (W - bw) / 2 + this.blattVersatz[0], y0 = (H - bh) / 2 + this.blattVersatz[1];
    return {
      s,
      seite: { x: x0, y: y0, w: a * s, h: h * s },
      front: { x: x0 + a * s, y: y0, w: c * s, h: h * s },
      top: { x: x0, y: y0 + h * s, w: a * s, h: c * s },
      raum: { x: x0 + a * s, y: y0 + h * s, w: c * s, h: c * s },
      ganz: { x: x0, y: y0, w: bw, h: bh },
    };
  }

  mitteVon(name) {
    const b = this.box;
    return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, 0];
  }

  // Ansichten für das aktuelle Layout setzen. Liefert, was gezeichnet wird.
  layout(W, H) {
    const S = this.sichten;
    const bl = this.blattLayout(W, H);
    this.blatt = bl;
    const voll = { x: 0, y: 0, w: W, h: H };
    if (this.modus === 'blatt' && this.falte >= 0.999 && !this.blickAnim) {
      for (const n of ['seite', 'front', 'top']) S[n].setzen(bl[n], bl.s, this.mitteVon(n));
      S.raum.setzen(bl.raum);
      return { art: 'blatt', direkt: ['seite', 'front', 'top'], raum: bl.raum };
    }
    if (this.modus === 'blick' || this.blickAnim) {
      // Blick: eine Ansicht wächst aus ihrem Feld im Blatt auf den ganzen Bildschirm
      const n = this.blick;
      const t = ease(this.blickT);
      const von = bl[n];
      const rect = lerpRect(von, voll, t);
      if (n === 'raum') {
        S.raum.setzen(rect);
        return { art: 'blickRaum', raum: rect };
      }
      // Maßstab: im Blatt bl.s, im Blick passend zum Bildschirm
      const sv = this.blickMassstab(n, W, H);
      const zoom = bl.s + (sv - bl.s) * t;
      const m = this.mitteVon(n);
      m[0] += this.blickVersatz[0] * t;
      m[1] += this.blickVersatz[1] * t;
      S[n].setzen(rect, zoom, m);
      // die anderen bleiben (verblassend) im Blatt
      const rest = ['seite', 'front', 'top'].filter((k) => k !== n);
      for (const k of rest) S[k].setzen(bl[k], bl.s, this.mitteVon(k));
      S.raum.setzen(bl.raum);
      return { art: 'blick', direkt: t < 0.98 ? [...rest, n] : [n], vorn: n, raum: t < 0.98 ? bl.raum : null, verblassen: t };
    }
    // Raum (gefaltet oder beim Falten)
    S.raum.setzen(voll);
    for (const n of ['seite', 'front', 'top']) S[n].setzen({ x: 0, y: 0, w: 512, h: 512 }, null, this.mitteVon(n));
    return { art: 'raum', raum: voll, falte: ease(this.falte) };
  }

  blickMassstab(n, W, H) {
    const b = this.box;
    const ext = n === 'seite' ? [b.max[0] - b.min[0], b.max[1] - b.min[1]] : n === 'front' ? [b.max[2] - b.min[2], b.max[1] - b.min[1]] : [b.max[0] - b.min[0], b.max[2] - b.min[2]];
    return Math.min(W / ext[0], H / ext[1]) * 0.92 * this.blickZoom;
  }

  schritt(dt) {
    const v = 1 / 0.75;
    if (this.falte < this.falteZiel) this.falte = Math.min(this.falteZiel, this.falte + dt * v);
    if (this.falte > this.falteZiel) this.falte = Math.max(this.falteZiel, this.falte - dt * v);
    if (this.blickAnim) {
      const z = this.blickAnim.zu;
      this.blickT += (z > this.blickT ? 1 : -1) * dt / 0.45;
      if ((z === 1 && this.blickT >= 1) || (z === 0 && this.blickT <= 0)) {
        this.blickT = z;
        const fertig = this.blickAnim.fertig;
        this.blickAnim = null;
        if (fertig) fertig();
      }
    }
  }

  // Wände im Raum platzieren. Die Ecke liegt immer hinter der Form (vom Betrachter aus). Beim Falten (nur in der
  // Grundecke: Kamera vorn links oben) klappen Front und Boden um die Kanten der Seitenwand in deren Ebene.
  // Jede Wand ist ein Viereck mit Ecken [unten links, unten rechts, oben rechts, oben links] im Sinn ihres Bilds.
  waendeSetzen(zeichner, kamPos, falte) {
    const b = this.box;
    let sx = kamPos[0] <= 0 ? 1 : -1;
    let sy = kamPos[1] >= 0 ? -1 : 1;
    let sz = kamPos[2] >= 0 ? -1 : 1;
    if (falte > 0) { sx = 1; sy = -1; sz = -1; }
    const [x0, y0, z0] = b.min, [x1, y1, z1] = b.max;
    const th = (Math.PI / 2) * falte, si = Math.sin(th), co = Math.cos(th);
    const ecken = {};
    // Seite
    const zW = sz < 0 ? z0 : z1;
    ecken.seite = sz < 0
      ? [[x0, y0, zW], [x1, y0, zW], [x1, y1, zW], [x0, y1, zW]]
      : [[x1, y0, zW], [x0, y0, zW], [x0, y1, zW], [x1, y1, zW]];
    // Front
    const xW = sx > 0 ? x1 : x0;
    if (sx > 0) {
      const f = (y, z) => { const dz = z - z0; return [x1 + dz * si, y, z0 + dz * co]; };
      ecken.front = [f(y0, z0), f(y0, z1), f(y1, z1), f(y1, z0)];
    } else ecken.front = [[xW, y0, z1], [xW, y0, z0], [xW, y1, z0], [xW, y1, z1]];
    // Boden (Top) oder Decke (von unten)
    const yW = sy < 0 ? y0 : y1;
    if (sy < 0) {
      const f = (x, z) => { const dz = z - z0; return [x, y0 - dz * si, z0 + dz * co]; };
      ecken.top = [f(x0, z1), f(x1, z1), f(x1, z0), f(x0, z0)];
    } else ecken.top = [[x0, yW, z0], [x1, yW, z0], [x1, yW, z1], [x0, yW, z1]];
    for (const n of ['seite', 'front', 'top']) zeichner.wandSetzen(n, ecken[n]);
    return { sx, sy, sz, hinten: { seite: sz > 0, front: sx < 0, top: sy > 0 }, ecken };
  }

  // Kamera, die beim Falten auf das Blatt schaut (perspektivisch, aber senkrecht → maßstabsgleich mit dem Blatt)
  faltKamera(raumSicht, W, H, f) {
    const bl = this.blattLayout(W, H);
    const b = this.box;
    // Blatt in Weltkoordinaten (Ebene z = b.min[2])
    const L = b.max[0] - b.min[0], Hh = b.max[1] - b.min[1], D = b.max[2] - b.min[2];
    // Mitte des Bildschirms in Weltkoordinaten der Blattebene
    const sx0 = W / 2, sy0 = H / 2;
    const wx = b.min[0] + (sx0 - bl.seite.x) / bl.s;
    const wy = b.max[1] - (sy0 - bl.seite.y) / bl.s;
    const fov = 30;
    const dist = (H / 2) / bl.s / Math.tan((fov / 2) * Math.PI / 180);
    const ziel = { pos: [wx, wy, b.min[2] + dist], blick: [wx, wy, b.min[2]] };
    const k = raumSicht.kamera;
    const start = raumSicht._faltStart;
    const e = ease(f);
    const p = start.pos.map((v, i) => v + (ziel.pos[i] - v) * e);
    const q = start.blick.map((v, i) => v + (ziel.blick[i] - v) * e);
    k.position.set(...p);
    k.up.set(0, 1, 0);
    k.lookAt(...q);
    k.fov = fov;
    k.aspect = W / H;
    k.near = 0.05;
    k.far = 200;
    k.updateProjectionMatrix();
    k.updateMatrixWorld();
    void L; void Hh; void D;
  }
}

export function lerpRect(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t };
}
