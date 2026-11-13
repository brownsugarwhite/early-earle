// Layout 2: Modellblatt.
// Ein lebendes Turnaround-Blatt, wie es Figurenzeichner anlegen: Front, Dreiviertel, Seite, Dreiviertel hinten, Rücken in
// einer Reihe, darunter die Draufsicht und das Wesen in Farbe. Alle Ansichten im selben Maßstab auf Papier, Konstruktions-
// linien in Non-Photo-Blau verbinden gleiche Höhen über das ganze Blatt. In jeder Ansicht wird gleich gearbeitet.
// Leere ziehen dreht alle Ansichten zugleich (wie eine Drehscheibe); beim Loslassen federt das Blatt zurück.

import { Werkstatt, THREE, HELL } from './basis.js';
import { FreieOrthoSicht, DrehSicht, ausdehnungIn } from './sichten.js';
import { clamp, spiegel, smooth } from '../mathe.js';
import * as S from '../shader.js';
import * as S2 from './shader2.js';

const WINKEL = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2];
const PAPIER = [0.957, 0.941, 0.906];
const BLAU = '95,180,220';
const ROT = '232,80,96';
const weich = (x, z, dt, k = 12) => x + (z - x) * (1 - Math.exp(-dt * k));

export class Modellblatt extends Werkstatt {
  layoutAnfang() {
    this.farben = HELL;
    this.dAz = 0;
    this.dEl = 0;
    this.rastZiel = null;
    this.zoomB = 1;
    this.versatz = [0, 0];
    this.reihe = WINKEL.map((w, i) => new FreieOrthoSicht('blatt' + i, w, 0));
    this.top = new FreieOrthoSicht('blattTop', 0, Math.PI / 2);
    this.farbig = new DrehSicht();
    this.farbig.azimut = -0.66;
    this.farbig.hoehe = 0.3;
    this.farbig2 = new DrehSicht();
    this.raum.sichten.raum = this.farbig;
    this.kopie = new THREE.MeshBasicMaterial({ map: null, depthTest: false, depthWrite: false });
    this.blatt = null;
    const z = this.z;
    this.kornMat = new THREE.ShaderMaterial({
      vertexShader: S.vollbildVS, fragmentShader: S2.kornFS,
      uniforms: { uAufl: { value: new THREE.Vector2() }, uStaerke: { value: 1 } },
      depthTest: false, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor,
    });
    void z;
  }

  // ---------------- Blatt anlegen ----------------
  blattZiel() {
    const g = this.grenzen();
    const m = g.mitte;
    const hY = g.max[1] - g.min[1], tZ = g.max[2] - g.min[2];
    const teile = WINKEL.map((w) => {
      const r = [Math.cos(w), 0, -Math.sin(w)];
      const a = ausdehnungIn(this.netz, r, [0, 1, 0], 2);
      const mr = m[0] * r[0] + m[2] * r[2];
      return { links: mr - a.r0, rechts: a.r1 - mr };
    });
    // Halbmesser um die Mitte: waagerecht (für das Drehen) und im Raum (für das Kippen)
    let rh = 0, r3 = 0;
    const P = this.netz.pos;
    for (let i = 0; i < P.length; i += 6) {
      const dx = P[i] - m[0], dy = P[i + 1] - m[1], dz = P[i + 2] - m[2];
      rh = Math.max(rh, Math.hypot(dx, dz));
      r3 = Math.max(r3, Math.hypot(dx, dy, dz));
    }
    const luecke = 0.13 * hY + 0.03 * this.groesse;
    const breite = teile.reduce((s, t) => s + t.links + t.rechts, 0) + luecke * 4;
    const unten = Math.max(tZ, hY * 0.8);
    const lueckeY = 0.34 * hY;
    const hoch = hY + lueckeY + unten;
    const rand = 30;
    const s0 = Math.min((this.W - 2 * rand) / breite, (this.H - 2 * rand) / hoch);
    return { g, m, hY, tZ, teile, luecke, breite, unten, lueckeY, hoch, s0, rh, r3 };
  }

  blattLegen(dt) {
    const ruhe = !this.zug && !this.strich;
    if (ruhe || !this.blattMass) {
      const z = this.blattZiel();
      if (!this.blattMass) this.blattMass = z;
      else {
        // weich nachführen, damit nichts springt, wenn sich die Form ändert
        const a = this.blattMass;
        for (const k of ['hY', 'tZ', 'luecke', 'breite', 'unten', 'lueckeY', 'hoch', 's0', 'rh', 'r3']) a[k] = weich(a[k], z[k], dt, 10);
        a.teile = a.teile.map((t, i) => ({ links: weich(t.links, z.teile[i].links, dt, 10), rechts: weich(t.rechts, z.teile[i].rechts, dt, 10) }));
        a.m = a.m.map((v, i) => weich(v, z.m[i], dt, 10));
        a.g = z.g;
      }
    }
    const A = this.blattMass;
    const s = A.s0 * this.zoomB;
    const x0 = this.W / 2 - (A.breite * s) / 2 + this.versatz[0];
    const y0 = this.H / 2 - (A.hoch * s) / 2 + this.versatz[1];
    const cy = y0 + (A.hY / 2) * s;
    let x = x0;
    const ansichten = [];
    A.teile.forEach((t, i) => {
      const cx = x + t.links * s;
      const halb = Math.max(t.links, t.rechts) * s + A.luecke * s * 0.5;
      const hh = (A.hY / 2 + A.luecke * 0.45) * s;
      // gezeichnet wird in einem weiten Rahmen (beim Drehen und Kippen wird nichts abgeschnitten), getroffen im engen Feld
      const wb = Math.max(halb, (A.rh + A.luecke * 0.3) * s), wh = Math.max(hh, (A.r3 + A.luecke * 0.3) * s);
      ansichten.push({ i, cx, cy, rect: { x: cx - wb, y: cy - wh, w: 2 * wb, h: 2 * wh }, feld: { x: cx - halb, y: cy - hh, w: 2 * halb, h: 2 * hh }, platz: [x - (A.luecke * s) / 2, x + (t.links + t.rechts) * s + (A.luecke * s) / 2] });
      x += (t.links + t.rechts + A.luecke) * s;
    });
    const seite = ansichten[2];
    const topY = y0 + (A.hY + A.lueckeY) * s + (A.unten / 2) * s;
    const th = (A.unten / 2 + A.luecke * 0.3) * s;
    const topFeld = { x: seite.feld.x, y: topY - th, w: seite.feld.w, h: 2 * th };
    const tr = Math.max(th, (A.rh + A.luecke * 0.3) * s, seite.feld.w / 2);
    const topRect = { x: seite.cx - tr, y: topY - tr, w: 2 * tr, h: 2 * tr };
    // links und rechts der Draufsicht: das Wesen in Farbe, von vorn und von hinten
    const oben = topFeld.y - A.lueckeY * s * 0.25, unten = Math.max(topFeld.y + topFeld.h, Math.min(this.H - 16, topFeld.y + topFeld.h + A.lueckeY * s));
    const fh = unten - oben;
    const l0 = ansichten[0].platz[0], l1 = seite.platz[0] - A.luecke * s * 0.5;
    const r0 = seite.platz[1] + A.luecke * s * 0.5, r1 = ansichten[4].platz[1];
    const fw = Math.min(l1 - l0, r1 - r0, fh * 1.7);
    const farbRect = { x: l1 - fw, y: oben, w: fw, h: fh };
    const farbRect2 = { x: r0, y: oben, w: fw, h: fh };
    this.blatt = { s, x0, y0, cy, ansichten, seite, topRect, topFeld, topY, farbRect, farbRect2, A };
    // Kameras
    const el = this.dEl;
    for (const v of ansichten) {
      const S = this.reihe[v.i];
      S.az = WINKEL[v.i] + this.dAz;
      S.el = el;
      S.setzen(v.rect, s, A.m);
    }
    this.top.az = this.dAz;
    this.top.el = Math.PI / 2;
    this.top.setzen(topRect, s, A.m);
    const r = Math.hypot(A.g.max[0] - A.g.min[0], A.hY, A.tZ) / 2;
    for (const [f, az, rc] of [[this.farbig, -0.66, farbRect], [this.farbig2, Math.PI - 0.66, farbRect2]]) {
      f.azimut = az + this.dAz;
      f.hoehe = 0.34 + el * 0.8;
      f.ziel = [A.m[0], A.m[1] - A.hY * 0.03, 0];
      f.abstand = (r * 0.98) / Math.sin(((30 * Math.PI) / 360) * Math.min(1, rc.w / rc.h));
      f.setzen(rc);
    }
  }

  // ---------------- Kamera (alle Ansichten zugleich) ----------------
  drehen(dx, dy) {
    this.rastZiel = null;
    this.dAz -= dx * 0.008;
    this.dEl = clamp(this.dEl + dy * 0.005, -1.2, 1.2);
  }
  drehenEnde(v) {
    if (Math.hypot(v[0], v[1]) > 4) this.schwung = [v[0] * 0.9, v[1] * 0.6];
    else this.rasten();
  }
  // Das Blatt bleibt das Blatt: nach dem Drehen federt es zurück (auf die nächste ganze Umdrehung)
  rasten() {
    this.rastZiel = { az: Math.round(this.dAz / (2 * Math.PI)) * 2 * Math.PI, el: 0 };
    this.klang('rasten');
  }
  zoomen(f, x, y) {
    const alt = this.zoomB;
    this.zoomB = clamp(this.zoomB * f, 0.5, 6);
    const k = this.zoomB / alt;
    this.versatz[0] = (this.versatz[0] - (x - this.W / 2)) * k + (x - this.W / 2);
    this.versatz[1] = (this.versatz[1] - (y - this.H / 2)) * k + (y - this.H / 2);
  }
  schwenken(dx, dy) {
    this.versatz[0] += dx;
    this.versatz[1] += dy;
  }
  trackpad(dx, dy) {
    this.schwenken(dx, dy);
  }
  einpassen(sofort) {
    if (!this.bereit) return;
    this.zielAnsicht = { zoom: 1, versatz: [0, 0] };
    this.rastZiel = { az: Math.round(this.dAz / (2 * Math.PI)) * 2 * Math.PI, el: 0 };
    if (sofort) { this.zoomB = 1; this.versatz = [0, 0]; this.dAz = this.rastZiel.az; this.dEl = 0; this.zielAnsicht = null; this.rastZiel = null; }
  }
  // 1/3/7: an eine Ansicht heranfahren, 0: das ganze Blatt
  ansichtTaste(n) {
    if (!this.blatt) return;
    if (n === 'raum') return this.einpassen();
    const B = this.blatt;
    const r = n === 'seite' ? B.ansichten[2].feld : n === 'front' ? B.ansichten[0].feld : B.topFeld;
    const k = Math.min((this.W * 0.8) / r.w, (this.H * 0.8) / r.h);
    const zoom = clamp(this.zoomB * k, 0.5, 6);
    const kk = zoom / this.zoomB;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    this.zielAnsicht = { zoom, versatz: [(this.versatz[0] - (cx - this.W / 2)) * kk, (this.versatz[1] - (cy - this.H / 2)) * kk] };
  }
  kameraMerken() {
    return { dAz: this.dAz, dEl: this.dEl, zoom: this.zoomB, versatz: this.versatz.slice() };
  }
  kameraZurueck(k) {
    this.rastZiel = { az: k.dAz, el: k.dEl };
    this.zielAnsicht = { zoom: k.zoom, versatz: k.versatz };
  }
  klick(ziel, n, x, y, mod) {
    if ((ziel.art === 'leer' || ziel.art === 'nichts') && n >= 2) return this.einpassen();
    return super.klick(ziel, n, x, y, mod);
  }

  // ---------------- Wo ist was ----------------
  sichtBei(x, y) {
    const B = this.blatt;
    if (!B) return null;
    let best = null;
    for (const v of B.ansichten) {
      const r = v.feld;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        const d = Math.abs(x - v.cx);
        if (!best || d < best.d) best = { s: this.reihe[v.i], d };
      }
    }
    if (best) return best.s;
    const t = B.topFeld, f = B.farbRect, f2 = B.farbRect2;
    if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return this.top;
    if (x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h) return this.farbig;
    if (x >= f2.x && x <= f2.x + f2.w && y >= f2.y && y <= f2.y + f2.h) return this.farbig2;
    // das leere Blatt gehört zur nächsten Ansicht der Reihe (drehen, zeichnen)
    let n = null;
    for (const v of B.ansichten) {
      const d = Math.hypot(x - v.cx, y - v.cy);
      if (!n || d < n.d) n = { s: this.reihe[v.i], d };
    }
    return n ? n.s : null;
  }

  // ---------------- Bildtakt ----------------
  schrittLayout(dt) {
    if (this.schwung && !this.zug) {
      this.drehen(this.schwung[0], this.schwung[1]);
      this.schwung[0] *= Math.pow(0.04, dt);
      this.schwung[1] *= Math.pow(0.04, dt);
      if (Math.hypot(...this.schwung) < 0.5) { this.schwung = null; this.rasten(); }
    }
    if (this.rastZiel) {
      // Feder: leichtes Überschwingen
      const k = this.rastZiel;
      this.vAz = (this.vAz || 0) * Math.exp(-dt * 9) + (k.az - this.dAz) * dt * 70;
      this.vEl = (this.vEl || 0) * Math.exp(-dt * 9) + (k.el - this.dEl) * dt * 70;
      this.dAz += this.vAz * dt;
      this.dEl += this.vEl * dt;
      if (Math.abs(k.az - this.dAz) < 1e-3 && Math.abs(this.vAz) < 1e-3 && Math.abs(k.el - this.dEl) < 1e-3) { this.dAz = k.az; this.dEl = k.el; this.rastZiel = null; this.vAz = 0; this.vEl = 0; }
    }
    if (this.zielAnsicht) {
      const a = this.zielAnsicht;
      this.zoomB = Math.exp(weich(Math.log(this.zoomB), Math.log(a.zoom), dt, 9));
      this.versatz = this.versatz.map((v, i) => weich(v, a.versatz[i], dt, 9));
      if (Math.abs(this.zoomB - a.zoom) < 1e-3 && Math.hypot(this.versatz[0] - a.versatz[0], this.versatz[1] - a.versatz[1]) < 0.5) this.zielAnsicht = null;
    }
    this.blattLegen(dt);
  }

  // ---------------- Zeichnen ----------------
  zeichnen() {
    const z = this.z, r = z.r, W = this.W, H = this.H, d = z.dpr;
    const B = this.blatt;
    const sichten = [...this.reihe, this.top];
    const w = Math.round(W * d), h = Math.round(H * d);
    const vp = (rc) => {
      r.setViewport(rc.x, H - rc.y - rc.h, rc.w, rc.h);
      r.setScissor(rc.x, H - rc.y - rc.h, rc.w, rc.h);
    };
    // Das Blatt (Masken, Abstandsfeld, Körper, Papierkorn) nur neu, wenn sich Form oder Lage ändern
    const bild = z.ziel('mb:bild', w, h);
    const schluessel = [z.netzVersion, B.s.toFixed(4), this.versatz[0].toFixed(2), this.versatz[1].toFixed(2), this.dAz.toFixed(5), this.dEl.toFixed(5), w, h].join('|');
    if (schluessel !== this._schluessel) {
      this._schluessel = schluessel;
      const maske = z.ziel('mb:maske', w, h);
      r.setRenderTarget(maske);
      r.setScissorTest(false);
      r.setClearColor(0x000000, 0);
      r.clear(true, true, true);
      z.koerper.material = z.maske;
      r.setScissorTest(true);
      for (const S of sichten) {
        z.maske.uniforms.uNah.value = S.kamera.near;
        z.maske.uniforms.uFern.value = S.kamera.far;
        vp(S.rect);
        r.render(z.szeneKoerper, S.kamera);
      }
      r.setScissorTest(false);
      const feld = z.feld('mb:feld', maske, w, h);
      const koerper = z.ziel('mb:koerper', w, h);
      r.setRenderTarget(koerper);
      r.setClearColor(0x000000, 0);
      r.clear(true, true, true);
      z.koerper.material = z.papier;
      z.papier.uniforms.uHinten.value = 0;
      r.setScissorTest(true);
      for (const S of sichten) { vp(S.rect); r.render(z.szeneKoerper, S.kamera); }
      r.setScissorTest(false);
      const U = z.illu.uniforms;
      U.uFeldA.value = feld.texture;
      U.uFeldB.value = feld.texture;
      U.uKoerper.value = koerper.texture;
      U.uMaske.value = maske.texture;
      U.uAufl.value.set(w, h);
      U.uPx.value = B.s * d;
      U.uHinten.value = 0;
      U.uGrund.value.set(...PAPIER);
      U.uSchatten.value = 0.16;
      U.uSchattenLang.value = B.A.hY * B.s * d * 0.32;
      z.voll(z.illu, bild, w, h);
      U.uSchatten.value = 0.36;
      U.uSchattenLang.value = 4000;
      this.kornMat.uniforms.uAufl.value.set(w, h);
      z.voll(this.kornMat, bild, w, h);
    }
    r.setRenderTarget(null);
    r.setViewport(0, 0, W, H);
    this.kopie.map = bild.texture;
    z.vollMesh.material = this.kopie;
    r.render(z.vollSzene, z.vollKamera);
    // das Wesen in Farbe, von vorn und von hinten (Punkte nur im Licht des Zeigers)
    this.lampe(true, 110);
    this.jellyZeichnen(this.farbig.kamera, B.farbRect, { durchsicht: 1.12 });
    this.jellyZeichnen(this.farbig2.kamera, B.farbRect2, { durchsicht: 1.12 });
    // Linien und Punkte je Ansicht
    r.setScissorTest(true);
    this.lampe(true, 150);
    for (const S of sichten) {
      vp(S.rect);
      r.clearDepth();
      z.U.uAufl.value.set(S.rect.w * d, S.rect.h * d);
      z.koerper.material = z.nurTiefe;
      r.render(z.szeneKoerper, S.kamera);
      z.breiten(1.3);
      z.linienFarben('papier');
      r.render(z.szeneLinien, S.kamera);
    }
    this.lampe(false);
    r.setScissorTest(false);
    r.setViewport(0, 0, W, H);
  }

  // ---------------- Konstruktionslinien ----------------
  fokus() {
    const z = this.zug;
    if (z && (z.art === 'punkt' || z.art === 'griff')) return z.ziel.sp ? spiegel(z.ziel.P.p) : z.ziel.P.p;
    if (z && z.art === 'linie' && z.p0) return null;
    const n = this.nah;
    if (n && (n.art === 'punkt' || n.art === 'griff')) return n.sp ? spiegel(n.P.p) : n.P.p;
    if (n && n.art === 'linie') return n.p;
    return null;
  }

  obenLayoutUnten(c) {
    const B = this.blatt;
    if (!B) return;
    // nur im Kanon (alle Ansichten auf ihren Winkeln) fluchten die Höhen
    const schritt = Math.PI / 4;
    const abw = Math.abs(this.dAz - Math.round(this.dAz / schritt) * schritt) + Math.abs(this.dEl);
    const kanon = 1 - smooth(0.015, 0.09, abw);
    const xa = B.ansichten[0].platz[0] - 10, xb = B.ansichten[4].platz[1] + 10;
    const yAus = (yw) => this.reihe[2].projizieren([B.A.m[0], yw, 0])[1];
    c.save();
    c.lineCap = 'round';
    if (kanon > 0.02) {
      // Rahmenlinien: oben und unten
      c.strokeStyle = `rgba(${BLAU},${0.55 * kanon})`;
      c.lineWidth = 1;
      for (const yw of [B.A.g.max[1], B.A.g.min[1]]) {
        const y = Math.round(yAus(yw)) + 0.5;
        c.beginPath(); c.moveTo(xa, y); c.lineTo(xb, y); c.stroke();
      }
      // Höhen der Mittellinie (wie die Hilfslinien für Augen, Kinn, Schultern)
      const L = this.linien.find((x) => x.art === 'mitte');
      if (L) {
        c.setLineDash([2, 5]);
        c.strokeStyle = `rgba(${BLAU},${0.32 * kanon})`;
        const ys = [];
        for (const y of L.punkte.map((P) => yAus(P.p[1])).sort((a, b) => a - b)) if (!ys.length || y - ys[ys.length - 1] > 7) ys.push(Math.round(y));
        for (const y of ys) { c.beginPath(); c.moveTo(xa, y + 0.5); c.lineTo(xb, y + 0.5); c.stroke(); }
        c.setLineDash([]);
      }
      // Mittelachsen in Front und Rücken
      c.strokeStyle = `rgba(${BLAU},${0.4 * kanon})`;
      c.setLineDash([6, 4, 1, 4]);
      for (const i of [0, 4]) {
        const v = B.ansichten[i];
        const x = Math.round(this.reihe[i].projizieren([B.A.m[0], 0, 0])[0]) + 0.5;
        c.beginPath(); c.moveTo(x, v.feld.y + 4); c.lineTo(x, v.feld.y + v.feld.h - 4); c.stroke();
      }
      c.setLineDash([]);
      // Seite ↔ Draufsicht: gleiche Länge
      const s = this.reihe[2];
      c.strokeStyle = `rgba(${BLAU},${0.3 * kanon})`;
      for (const xw of [B.A.g.min[0], B.A.g.max[0]]) {
        const x = Math.round(s.projizieren([xw, 0, 0])[0]) + 0.5;
        c.beginPath(); c.moveTo(x, yAus(B.A.g.min[1]) + 6); c.lineTo(x, B.topFeld.y + B.topFeld.h - 6); c.stroke();
      }
    }
    // der Punkt unter dem Zeiger oder in der Hand: seine Höhe durch alle Ansichten, seine Länge bis in die Draufsicht
    const p = this.fokus();
    if (p) {
      const hand = !!this.zug;
      const farbe = hand ? ROT : BLAU;
      const y = yAus(p[1]);
      c.strokeStyle = `rgba(${farbe},${(hand ? 0.85 : 0.7) * Math.max(kanon, 0.25)})`;
      c.lineWidth = hand ? 1.4 : 1.1;
      if (kanon > 0.5) { c.beginPath(); c.moveTo(xa, y); c.lineTo(xb, y); c.stroke(); }
      const ps = this.reihe[2].projizieren(p), pt = this.top.projizieren(p);
      if (kanon > 0.5) { c.beginPath(); c.moveTo(ps[0], ps[1]); c.lineTo(pt[0], pt[1]); c.stroke(); }
      c.fillStyle = `rgba(${farbe},0.95)`;
      for (const S of [...this.reihe, this.top]) {
        const q = S.projizieren(p);
        c.beginPath();
        c.arc(q[0], q[1], hand ? 3.6 : 3, 0, Math.PI * 2);
        c.fill();
        // Spiegelbild (anderer Körperseite) als Ring
        if (Math.abs(p[2]) > 1e-3) {
          const q2 = S.projizieren(spiegel(p));
          c.beginPath();
          c.arc(q2[0], q2[1], 3, 0, Math.PI * 2);
          c.lineWidth = 1;
          c.strokeStyle = `rgba(${farbe},0.7)`;
          c.stroke();
        }
      }
    }
    c.restore();
  }

  // ---------------- Vorführung ----------------
  drehbuecher() {
    const app = this;
    const W = () => app.W, H = () => app.H;
    const B = () => app.blatt;
    const mittePunkt = (wahl) => {
      const L = app.linien.find((x) => x.art === 'mitte');
      return L.punkte.reduce((a, b) => (wahl === 'oben' ? (b.p[1] > a.p[1] ? b : a) : (b.p[0] > a.p[0] ? b : a)));
    };
    return {
      start(G) {
        // 1. Leere ziehen: alle Ansichten drehen sich zugleich; loslassen: das Blatt federt zurück
        G.gehe(() => [W() * 0.5, B().topFeld.y + B().topFeld.h + 30 > H() - 10 ? H() * 0.9 : B().topFeld.y + B().topFeld.h + 24], 0.8);
        G.zieh(() => { const y = Math.min(H() - 12, B().topFeld.y + B().topFeld.h + 24); return [[W() * 0.5, y], [W() * 0.5 + 120, y], [W() * 0.5 + 40, y + 10]]; }, 2.2);
        G.warte(1.3);
        // 2. auf einen Punkt in der Seite zeigen: seine Höhe läuft durch das ganze Blatt
        G.gehe(() => app.reihe[2].projizieren(mittePunkt('oben').p), 1.0);
        G.warte(1.0);
        // 3. ziehen: alle fünf Ansichten und die Draufsicht folgen
        G.zieh(() => { const p = app.reihe[2].projizieren(mittePunkt('oben').p); return [p, [p[0] - 18, p[1] - 46]]; }, 1.4);
        G.warte(0.8);
        // 4. rechts ziehen in der Dreiviertelansicht: ein neuer Loop, in allen Ansichten zugleich
        G.gehe(() => { const v = B().ansichten[1]; return [v.cx + v.feld.w * 0.08, v.feld.y + 2]; }, 0.9);
        G.zieh(() => { const v = B().ansichten[1]; return [[v.cx + v.feld.w * 0.08, v.feld.y + 2], [v.cx + v.feld.w * 0.02, v.cy], [v.cx - v.feld.w * 0.04, v.feld.y + v.feld.h - 2]]; }, 1.3, 2);
        G.warte(1.2);
        // 5. Rad: ins Blatt hinein und wieder heraus
        G.gehe(() => [B().ansichten[2].cx, B().ansichten[2].cy], 0.6);
        G.rad(() => [B().ansichten[2].cx, B().ansichten[2].cy], 5, 0.8);
        G.warte(0.6);
        G.rad(() => [B().ansichten[2].cx, B().ansichten[2].cy], -5, 0.8);
        G.warte(0.8);
      },
    };
  }
}
