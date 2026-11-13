// Layout 3: Drei Platten.
// Seite, Front und Top sind Druckplatten eines Risographen, jede in ihrer Farbe: Seite Pink, Front Gelb, Top Blau.
// Übereinander gedruckt (Mitte auf Mitte, gleicher Maßstab) mischen sie sich wie Farbe auf Papier. Jede Ansicht hat so den
// ganzen Bildschirm, und was man in einer ändert, sieht man in den anderen an derselben Stelle. Die Platte, an deren Linien
// man arbeitet, druckt kräftig, die anderen blass. An den Passerkreuzen schiebt man die Platten auseinander (nur entlang der
// gemeinsamen Achse, so bleiben sie im Passer); Tab legt sie nebeneinander wie im heutigen Editor oder wieder übereinander.

import { Werkstatt, THREE, HELL } from './basis.js';
import { FreieOrthoSicht, DrehSicht } from './sichten.js';
import { clamp, spiegel, smooth } from '../mathe.js';
import * as S from '../shader.js';
import * as S2 from './shader2.js';

const PLATTEN = [
  { name: 'seite', az: 0, el: 0, farbe: [1.0, 0.27, 0.62], tinte: [0.78, 0.05, 0.4], winkel: 0.26, achse: null },
  { name: 'front', az: -Math.PI / 2, el: 0, farbe: [1.0, 0.86, 0.0], tinte: [0.62, 0.48, 0.0], winkel: 1.31, achse: 'x' },
  { name: 'top', az: 0, el: Math.PI / 2, farbe: [0.0, 0.47, 0.75], tinte: [0.0, 0.27, 0.48], winkel: 0.79, achse: 'y' },
];
const PAPIER = [0.965, 0.95, 0.925];
const weich = (x, z, dt, k = 12) => x + (z - x) * (1 - Math.exp(-dt * k));

export class Platten extends Werkstatt {
  layoutAnfang() {
    this.farben = HELL;
    this.platten = PLATTEN.map((P) => ({ ...P, sicht: new FreieOrthoSicht('platte:' + P.name, P.az, P.el), dichte: P.name === 'seite' ? 1 : 0.4, versatz: [0, 0], zugVersatz: [0, 0] }));
    this.aktiv = this.platten[0];
    this.auszug = 0;
    this.auszugZiel = 0;
    this.dAz = 0;
    this.dEl = 0;
    this.zoomB = 1;
    this.pan = [0, 0];
    this.andruck = new DrehSicht();
    this.andruck.azimut = -0.66;
    this.andruck.hoehe = 0.32;
    this.raum.sichten.raum = this.andruck;
    this.wechsel = null;
    this.koerperMat = new THREE.ShaderMaterial({ vertexShader: S.papierVS, fragmentShader: S2.risoKoerperFS, side: THREE.DoubleSide });
    const mult = { transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor };
    this.platteMat = new THREE.ShaderMaterial({
      vertexShader: S.vollbildVS, fragmentShader: S2.platteFS,
      uniforms: { uKoerper: { value: null }, uAufl: { value: new THREE.Vector2() }, uFarbe: { value: new THREE.Vector3() }, uDichte: { value: 1 }, uWinkel: { value: 0 }, uZelle: { value: 6 }, uTon: { value: 0.4 }, uRand: { value: 2 }, uSaat: { value: 0 } },
      ...mult,
    });
    this.kornMat = new THREE.ShaderMaterial({ vertexShader: S.vollbildVS, fragmentShader: S2.kornFS, uniforms: { uAufl: { value: new THREE.Vector2() }, uStaerke: { value: 0.9 } }, ...mult });
    this.kopie = new THREE.MeshBasicMaterial({ map: null, depthTest: false, depthWrite: false });
  }

  // ---------------- Lage der Platten ----------------
  lageBerechnen(dt) {
    const g = this.grenzen();
    const dx = g.max[0] - g.min[0], dy = g.max[1] - g.min[1], dz = g.max[2] - g.min[2];
    const groesse = { seite: [dx, dy], front: [dz, dy], top: [dx, dz] };
    const W = this.W, H = this.H;
    // übereinander: die größte Platte füllt gut drei Viertel des Bildschirms
    const sU = Math.min(...Object.values(groesse).map(([w, h]) => Math.min((W * 0.74) / w, (H * 0.74) / h)));
    // nebeneinander wie im heutigen Editor (Seite oben links, Front rechts, Top darunter, das Wesen in der freien Ecke)
    const rand = 40, luecke = 0.12 * dy;
    const sA = Math.min((W - 2 * rand) / (dx + dz + luecke), (H - 2 * rand) / (dy + dz + luecke));
    const t = smooth(0, 1, this.auszug);
    const s = (sU + (sA - sU) * t) * this.zoomB;
    const mU = [W / 2 + this.pan[0], H / 2 + this.pan[1]];
    const x0 = W / 2 - ((dx + dz + luecke) * sA) / 2, y0 = H / 2 - ((dy + dz + luecke) * sA) / 2;
    const zA = {
      seite: [x0 + (dx * sA) / 2, y0 + (dy * sA) / 2],
      front: [x0 + (dx + luecke) * sA + (dz * sA) / 2, y0 + (dy * sA) / 2],
      top: [x0 + (dx * sA) / 2, y0 + (dy + luecke) * sA + (dz * sA) / 2],
    };
    for (const P of this.platten) {
      const a = zA[P.name];
      // Auszug: von der gemeinsamen Mitte zur eigenen Stelle; dazu der eigene Versatz (Passerkreuz)
      const zs = this.zoomB;
      const cx = mU[0] + (a[0] - W / 2) * t * zs + P.versatz[0];
      const cy = mU[1] + (a[1] - H / 2) * t * zs + P.versatz[1];
      const [w, h] = groesse[P.name];
      const R = Math.hypot(w, h) * 0.5 * s + 30;
      P.mitte = [cx, cy];
      P.rect = { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R };
      P.feld = { x: cx - (w * s) / 2, y: cy - (h * s) / 2, w: w * s, h: h * s };
      P.sicht.az = P.az + this.dAz;
      P.sicht.el = P.name === 'top' ? Math.PI / 2 : this.dEl;
      P.sicht.setzen(P.rect, s, g.mitte);
      // Passerkreuz: oben links außerhalb der Platte
      P.kreuz = [P.feld.x - 18, P.feld.y - 18];
    }
    this.s = s;
    // Andruck (das Wesen in Farbe): übereinander klein unten rechts, nebeneinander in der freien Ecke
    const klein = { x: W - W * 0.2 - 18, y: H - H * 0.26 - 18, w: W * 0.2, h: H * 0.26 };
    const ecke = { x: x0 + (dx + luecke) * sA, y: y0 + (dy + luecke) * sA, w: dz * sA, h: dz * sA };
    this.andruckRect = { x: klein.x + (ecke.x - klein.x) * t, y: klein.y + (ecke.y - klein.y) * t, w: klein.w + (ecke.w - klein.w) * t, h: klein.h + (ecke.h - klein.h) * t };
    const a = this.andruck;
    a.ziel = [g.mitte[0], g.mitte[1], 0];
    const r = Math.hypot(dx, dy, dz) / 2;
    a.abstand = (r * 1.02) / Math.sin(((30 * Math.PI) / 360) * Math.min(1, this.andruckRect.w / this.andruckRect.h));
    a.setzen(this.andruckRect);
  }

  // ---------------- Kamera ----------------
  drehen(dx, dy) {
    if (this._andruckDreh) {
      this.andruck.azimut -= dx * 0.008;
      this.andruck.hoehe = clamp(this.andruck.hoehe + dy * 0.006, -1.4, 1.4);
      return;
    }
    this.rastZiel = null;
    this.dAz -= dx * 0.008;
    this.dEl = clamp(this.dEl + dy * 0.005, -1.2, 1.2);
  }
  drehenStart(x, y) {
    const r = this.andruckRect;
    this._andruckDreh = r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }
  drehenEnde(v) {
    if (this._andruckDreh) { this._andruckDreh = false; return; }
    if (Math.hypot(v[0], v[1]) > 4) this.schwung = [v[0] * 0.9, v[1] * 0.6];
    else this.rasten();
  }
  rasten() {
    this.rastZiel = { az: Math.round(this.dAz / (2 * Math.PI)) * 2 * Math.PI, el: 0 };
    this.klang('rasten');
  }
  zoomen(f, x, y) {
    const alt = this.zoomB;
    this.zoomB = clamp(this.zoomB * f, 0.4, 6);
    const k = this.zoomB / alt;
    const W = this.W, H = this.H;
    this.pan[0] = (this.pan[0] - (x - W / 2)) * k + (x - W / 2);
    this.pan[1] = (this.pan[1] - (y - H / 2)) * k + (y - H / 2);
    for (const P of this.platten) { P.versatz[0] *= k; P.versatz[1] *= k; }
  }
  schwenken(dx, dy) {
    this.pan[0] += dx;
    this.pan[1] += dy;
  }
  trackpad(dx, dy) { this.schwenken(dx, dy); }
  einpassen(sofort) {
    if (!this.bereit) return;
    this.zielAnsicht = { zoom: 1, pan: [0, 0] };
    for (const P of this.platten) P.versatzZiel = [0, 0];
    this.rastZiel = { az: Math.round(this.dAz / (2 * Math.PI)) * 2 * Math.PI, el: 0 };
    if (sofort) { this.zoomB = 1; this.pan = [0, 0]; this.zielAnsicht = null; }
  }
  ansichtTaste(n) {
    if (n === 'raum') return this.layoutTaste('Tab');
    const P = this.platten.find((p) => p.name === n);
    if (P) this.aktivSetzen(P, true);
  }
  layoutTaste(k) {
    if (k === 'Tab') {
      this.auszugZiel = this.auszugZiel > 0.5 ? 0 : 1;
      for (const P of this.platten) P.versatzZiel = [0, 0];
      this.klang('falten');
    }
  }
  kameraMerken() { return { zoom: this.zoomB, pan: this.pan.slice(), auszug: this.auszugZiel, aktiv: this.aktiv.name }; }
  kameraZurueck(k) {
    this.zielAnsicht = { zoom: k.zoom, pan: k.pan };
    this.auszugZiel = k.auszug;
    this.rastZiel = { az: 0, el: 0 };
    for (const P of this.platten) P.versatzZiel = [0, 0];
    this.aktivSetzen(this.platten.find((p) => p.name === k.aktiv), true);
  }
  aktivSetzen(P, fest) {
    if (!P) return;
    if (P !== this.aktiv) this.klang('wahl');
    this.aktiv = P;
    this.aktivFest = fest ? this.zeit : this.aktivFest;
  }

  // ---------------- Treffer über alle Platten ----------------
  sichtBei(x, y) {
    if (this._nur) return this._nur.sicht === 'andruck' ? this.andruck : this._nur.sicht;
    const r = this.andruckRect;
    if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return this.andruck;
    return this.aktiv.sicht;
  }
  trefferIn(P, x, y, opt) {
    this._nur = P;
    const t = super.treffer(x, y, opt);
    this._nur = null;
    return t;
  }
  treffer(x, y, opt = {}) {
    const r = this.andruckRect;
    if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return this.trefferIn({ sicht: 'andruck' }, x, y, opt);
    const ta = this.trefferIn(this.aktiv, x, y, opt);
    if (ta.art === 'punkt' || ta.art === 'griff' || this.zug || opt.nurAktiv) return ta;
    // Linien der anderen Platten: Wer näher an einer Linie ist, macht ihre Platte zur aktiven (nach kurzem Verweilen)
    const abstand = (t) => (t.art === 'linie' ? Math.hypot(t.sicht.projizieren(t.p)[0] - x, t.sicht.projizieren(t.p)[1] - y) : Infinity);
    let best = { t: ta, d: abstand(ta), P: this.aktiv };
    for (const P of this.platten) {
      if (P === this.aktiv) continue;
      const t = this.trefferIn(P, x, y, { ...opt });
      const d = abstand(t);
      if (d < best.d - 2) best = { t, d, P };
    }
    if (best.P !== this.aktiv) {
      this._kandidat = this._kandidat && this._kandidat.P === best.P ? this._kandidat : { P: best.P, t0: this.zeit };
      if (opt.sofort || this.zeit - this._kandidat.t0 > 0.18) { this.aktivSetzen(best.P); return best.t; }
      return { ...best.t, art: 'linieFremd' };
    }
    this._kandidat = null;
    return ta;
  }
  // ruht der Zeiger über der Linie einer anderen Platte, wechselt sie nach kurzem Verweilen auch ohne Bewegung
  schwebenNachfuehren() {
    if (this._kandidat && this.maus.drin && !this.vorfuehrung) this.schweben(this.maus.x, this.maus.y);
  }
  // Passerkreuze
  layoutTreffer(x, y) {
    for (const P of this.platten) if (Math.hypot(x - P.kreuz[0], y - P.kreuz[1]) < 13) return { art: 'layout', was: 'kreuz', P, sicht: P.sicht };
    return null;
  }
  layoutZeiger() { return 'passer'; }
  layoutKlick(z, n) {
    if (z.was !== 'kreuz') return;
    if (n >= 2) { z.P.versatzZiel = [0, 0]; return; }
    this.aktivSetzen(z.P, true);
  }
  layoutZugStart(z, x, y) {
    this._passer = { P: z.P, x0: x, y0: y, v0: z.P.versatz.slice() };
    this.aktivSetzen(z.P, true);
  }
  layoutZugBewegen(x, y) {
    const p = this._passer;
    if (!p) return;
    const dx = x - p.x0, dy = y - p.y0;
    // im Passer bleiben: Front nur waagerecht (gleiche Höhe), Top nur senkrecht (gleiche Länge); die Seite trägt alle
    if (p.P.achse === 'x') p.P.versatz = [p.v0[0] + dx, p.v0[1]];
    else if (p.P.achse === 'y') p.P.versatz = [p.v0[0], p.v0[1] + dy];
    else { this.pan[0] += x - (p.lx ?? p.x0); this.pan[1] += y - (p.ly ?? p.y0); p.lx = x; p.ly = y; }
    p.P.versatzZiel = null;
  }
  layoutZugEnde() {
    const p = this._passer;
    this._passer = null;
    if (!p) return;
    // nahe der Mitte: zurück in den Passer (einrasten)
    if (Math.hypot(...p.P.versatz) < 28) { p.P.versatzZiel = [0, 0]; this.klang('rasten'); }
  }
  klick(ziel, n, x, y, mod) {
    if ((ziel.art === 'leer' || ziel.art === 'haut') && n >= 2) return this.einpassen();
    return super.klick(ziel, n, x, y, mod);
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
      this.pan = this.pan.map((v, i) => weich(v, a.pan[i], dt, 9));
      if (Math.abs(this.zoomB - a.zoom) < 1e-3 && Math.hypot(this.pan[0] - a.pan[0], this.pan[1] - a.pan[1]) < 0.5) this.zielAnsicht = null;
    }
    // Auszug: mit leichtem Überschwingen
    this.vAus = (this.vAus || 0) * Math.exp(-dt * 10) + (this.auszugZiel - this.auszug) * dt * 90;
    this.auszug += this.vAus * dt;
    if (Math.abs(this.auszug - this.auszugZiel) < 1e-4 && Math.abs(this.vAus) < 1e-3) { this.auszug = this.auszugZiel; this.vAus = 0; }
    for (const P of this.platten) {
      if (P.versatzZiel) P.versatz = P.versatz.map((v, i) => weich(v, P.versatzZiel[i], dt, 12));
      P.dichte = weich(P.dichte, P === this.aktiv ? 1 : 0.34, dt, 14);
    }
    this.lageBerechnen(dt);
  }

  // ---------------- Zeichnen ----------------
  zeichnen() {
    const z = this.z, r = z.r, W = this.W, H = this.H, d = z.dpr;
    const w = Math.round(W * d), h = Math.round(H * d);
    const bild = z.ziel('pl:bild', w, h);
    const schluessel = [z.netzVersion, this.s.toFixed(4), ...this.platten.flatMap((P) => [P.mitte[0].toFixed(2), P.mitte[1].toFixed(2), P.dichte.toFixed(3)]), this.dAz.toFixed(5), this.dEl.toFixed(5), w, h].join('|');
    if (schluessel !== this._schluessel) {
      this._schluessel = schluessel;
      // Papier
      r.setRenderTarget(bild);
      r.setScissorTest(false);
      r.setClearColor(new THREE.Color(...PAPIER), 1);
      r.clear(true, true, true);
      // jede Platte: Körper (Helligkeit, Deckung) → Farbe multipliziert aufs Papier
      const koerper = z.ziel('pl:koerper', w, h);
      const U = this.platteMat.uniforms;
      for (const P of this.platten) {
        r.setRenderTarget(koerper);
        r.setClearColor(0x000000, 0);
        r.clear(true, true, true);
        z.koerper.material = this.koerperMat;
        const rc = P.rect;
        r.setViewport(rc.x, H - rc.y - rc.h, rc.w, rc.h);
        r.render(z.szeneKoerper, P.sicht.kamera);
        U.uKoerper.value = koerper.texture;
        U.uAufl.value.set(w, h);
        U.uFarbe.value.set(...P.farbe);
        U.uDichte.value = P.dichte;
        U.uWinkel.value = P.winkel;
        U.uZelle.value = 5.5 * d;
        U.uTon.value = 0.36;
        U.uRand.value = 2.2 * d;
        U.uSaat.value = P.winkel * 13.1;
        z.voll(this.platteMat, bild, w, h);
      }
      this.kornMat.uniforms.uAufl.value.set(w, h);
      z.voll(this.kornMat, bild, w, h);
    }
    r.setRenderTarget(null);
    r.setViewport(0, 0, W, H);
    this.kopie.map = bild.texture;
    z.vollMesh.material = this.kopie;
    r.render(z.vollSzene, z.vollKamera);
    // Linien und Punkte: die aktive Platte satt in ihrer Tinte, die anderen blass und ohne Punkte
    r.setScissorTest(true);
    const folge = [...this.platten.filter((P) => P !== this.aktiv), this.aktiv];
    for (const P of folge) {
      const rc = P.rect;
      r.setViewport(rc.x, H - rc.y - rc.h, rc.w, rc.h);
      r.setScissor(rc.x, H - rc.y - rc.h, rc.w, rc.h);
      r.clearDepth();
      z.U.uAufl.value.set(rc.w * d, rc.h * d);
      z.koerper.material = z.nurTiefe;
      r.render(z.szeneKoerper, P.sicht.kamera);
      z.breiten(P === this.aktiv ? 1.4 : 1.1);
      const aktiv = P === this.aktiv;
      for (const m of [z.linieSicht, z.linieVerdeckt]) {
        m.uniforms.uFarbe.value.set(...P.tinte);
        m.uniforms.uWahl.value.set(0.08, 0.07, 0.09);
      }
      z.linieSicht.uniforms.uAlpha.value = aktiv ? 1 : 0.38;
      z.linieVerdeckt.uniforms.uAlpha.value = aktiv ? 0.22 : 0.08;
      z.punktMat.uniforms.uFarbe.value.set(...P.tinte);
      z.punktMat.uniforms.uWahl.value.set(0.08, 0.07, 0.09);
      z.punktMat.uniforms.uHell.value.set(...PAPIER);
      z.punktMat.uniforms.uDeck.value = aktiv ? 1 : 0;
      this.lampe(aktiv, 190);
      r.render(z.szeneLinien, P.sicht.kamera);
    }
    z.linieSicht.uniforms.uAlpha.value = 1;
    z.linieVerdeckt.uniforms.uAlpha.value = 0.22;
    z.punktMat.uniforms.uDeck.value = 1;
    this.lampe(false);
    r.setScissorTest(false);
    // Andruck: das Wesen in Farbe (Punkte nur im Licht des Zeigers)
    this.lampe(true, 110);
    this.jellyZeichnen(this.andruck.kamera, this.andruckRect, { durchsicht: 1.1 });
    this.lampe(false);
    r.setViewport(0, 0, W, H);
  }

  // Passerkreuze und der Rand des Andrucks
  obenLayout(c) {
    c.save();
    for (const P of this.platten) {
      const [x, y] = P.kreuz;
      const a = P === this.aktiv ? 0.95 : 0.55;
      c.strokeStyle = `rgba(${P.tinte.map((v) => Math.round(v * 255)).join(',')},${a})`;
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(x, y, 6.5, 0, Math.PI * 2);
      c.moveTo(x - 12, y); c.lineTo(x + 12, y);
      c.moveTo(x, y - 12); c.lineTo(x, y + 12);
      c.stroke();
    }
    const r = this.andruckRect;
    c.strokeStyle = 'rgba(0,63,78,0.35)';
    c.lineWidth = 1;
    c.setLineDash([3, 4]);
    c.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w), Math.round(r.h));
    c.restore();
  }

  // ---------------- Vorführung ----------------
  drehbuecher() {
    const app = this;
    const W = () => app.W, H = () => app.H;
    const platte = (n) => app.platten.find((p) => p.name === n);
    const mittePunkt = (wahl) => {
      const L = app.linien.find((x) => x.art === 'mitte');
      return L.punkte.reduce((a, b) => (wahl === 'oben' ? (b.p[1] > a.p[1] ? b : a) : (b.p[0] < a.p[0] ? b : a)));
    };
    return {
      start(G) {
        // 1. Leere ziehen: alle drei Platten drehen sich zugleich, loslassen: sie federn in den Passer zurück
        G.gehe(() => [W() * 0.12, H() * 0.8], 0.8);
        G.zieh(() => [[W() * 0.12, H() * 0.8], [W() * 0.12 + 150, H() * 0.8 - 20], [W() * 0.12 + 60, H() * 0.8 - 6]], 2.0);
        G.warte(1.2);
        // 2. auf einen Punkt der pinken Platte (Seite) zeigen und ziehen: Gelb und Blau zeigen dasselbe an derselben Stelle
        G.gehe(() => platte('seite').sicht.projizieren(mittePunkt('oben').p), 1.0);
        G.warte(0.5);
        G.zieh(() => { const p = platte('seite').sicht.projizieren(mittePunkt('oben').p); return [p, [p[0] - 30, p[1] - 50]]; }, 1.3);
        G.warte(0.7);
        // 3. Passerkreuz der gelben Platte (Front) nach rechts ziehen: sie gleitet aus dem Passer, bleibt aber auf gleicher Höhe
        G.gehe(() => platte('front').kreuz, 0.9);
        G.zieh(() => { const k = platte('front').kreuz; return [k, [k[0] + W() * 0.28, k[1] + 40]]; }, 1.3);
        G.warte(0.8);
        // 4. Tab: alle Platten nebeneinander (wie heute), noch einmal Tab: wieder übereinander
        G.taste('Tab', 1.6);
        G.taste('Tab', 1.6);
        G.warte(0.8);
      },
    };
  }
}
