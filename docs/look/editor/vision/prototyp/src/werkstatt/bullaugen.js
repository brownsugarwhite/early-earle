// Layout 1: Bullaugen.
// Eine einzige große Ansicht: das Wesen auf einem Drehteller. Die drei Achsansichten sind runde Bullaugen. In Ruhe liegen
// sie klein am Bildschirmrand, jedes dort, wo seine Kamera steht (dreht man das Wesen, wandern sie am Rand mit).
// Zeigt man auf einen Punkt oder eine Linie, kommen sie zu dieser Stelle, jedes von der Seite, aus der es schaut, und
// zeigen sie vergrößert. Im Bullauge kann man genauso arbeiten wie in der großen Ansicht. Ein Klick hinein fliegt die Kamera
// auf diese Achse; nahe einer Achse rastet das Drehen ein, und die Ansicht wird parallel (Dolly-Zoom).

import { Werkstatt, THREE } from './basis.js';
import { DrehSicht } from './sichten.js';
import { OrthoSicht } from '../ansichten.js';
import { add, mul, clamp, spiegel, dist, smooth } from '../mathe.js';
import * as S from '../shader.js';
import * as S2 from './shader2.js';

const NAMEN = ['seite', 'front', 'top'];
const ACHSE = { seite: [0, 0, 1], front: [-1, 0, 0], top: [0, 1, 0] };
const HEIM = { az: -0.66, h: 0.32 };
const R_DOCK = 50, R_NAH = 104, R_ZUG = 118, R_MAX = 124;
const GRUND_LINSE = [0.075, 0.13, 0.16];
const RAST = 0.16; // etwa 9° wie im Editor

const unwrap = (von, zu) => {
  let d = zu - von;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return von + d;
};
const weich = (x, z, dt, k = 12) => x + (z - x) * (1 - Math.exp(-dt * k));

export class Bullaugen extends Werkstatt {
  layoutAnfang() {
    const rs = new DrehSicht();
    rs.azimut = HEIM.az;
    rs.hoehe = HEIM.h;
    this.rs = rs;
    this.raum.sichten.raum = rs;
    this.parallelZiel = 0;
    this.linsen = NAMEN.map((n) => ({ name: n, sicht: new OrthoSicht(n), x: this.W / 2, y: this.H / 2, r: 0, a: 0, zoom: 80, mitte: [0, 0, 0], faktor: 1, modus: 'dock', sichtbar: 0, winkel: 0 }));
    this.anker = null;
    this.kandidat = null;
    this.loslassenSeit = null;
    this.trackpadRuhe = null;
    const z = this.z;
    this.grundMat = new THREE.ShaderMaterial({
      vertexShader: S.vollbildVS, fragmentShader: S2.tiefenGrundFS,
      uniforms: { uAufl: { value: new THREE.Vector2() }, uInnen: { value: new THREE.Vector3(0.066, 0.16, 0.2) }, uAussen: { value: new THREE.Vector3(0.016, 0.05, 0.07) }, uZeit: z.U.uZeit },
      depthTest: false, depthWrite: false,
    });
    const tg = new THREE.PlaneGeometry(2, 2, 1, 1);
    tg.rotateX(-Math.PI / 2);
    this.tellerMat = new THREE.ShaderMaterial({
      vertexShader: S2.tellerVS, fragmentShader: S2.tellerFS,
      uniforms: { uRast: { value: 0 }, uZielWinkel: { value: 0 }, uAlpha: { value: 1 }, uFarbe: { value: new THREE.Vector3(0.62, 0.93, 0.98) } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.teller = new THREE.Mesh(tg, this.tellerMat);
    this.teller.frustumCulled = false;
    this.tellerSzene = new THREE.Scene();
    this.tellerSzene.add(this.teller);
    this.linsenMat = new THREE.ShaderMaterial({
      vertexShader: S.vollbildVS, fragmentShader: S2.linseFS,
      uniforms: { uBild: { value: null }, uMitte: { value: new THREE.Vector2() }, uR: { value: 1 }, uAlpha: { value: 1 }, uHell: { value: 1 }, uRand: { value: new THREE.Vector3(0.85, 0.95, 1.0) } },
      transparent: true, depthTest: false, depthWrite: false,
    });
  }

  // ---------------- Maße ----------------
  passAbstand() {
    const g = this.grenzen();
    const r = Math.hypot(g.max[0] - g.min[0], g.max[1] - g.min[1], g.max[2] - g.min[2]) / 2;
    const asp = Math.min(1, this.W / this.H);
    return (r * 1.08) / Math.sin(((30 * Math.PI) / 360) * Math.max(0.62, asp));
  }
  einpassen(sofort) {
    if (!this.bereit || !this.rs) return;
    const g = this.grenzen();
    const ziel = [g.mitte[0], g.mitte[1] + (g.max[1] - g.min[1]) * 0.04, 0];
    const ab = this.passAbstand();
    if (sofort) { this.rs.ziel = ziel; this.rs.abstand = ab; return; }
    this.kamFahrt = { zielZ: ziel, ab, t: 0 };
  }
  kameraMerken() {
    const rs = this.rs;
    return { az: rs.azimut, h: rs.hoehe, ab: rs.abstand, ziel: rs.ziel.slice(), par: this.parallelZiel };
  }
  kameraZurueck(k) {
    this.parallelZiel = k.par;
    this.kamFahrt = { zielAz: unwrap(this.rs.azimut, k.az), zielH: k.h, ab: k.ab, zielZ: k.ziel, t: 0 };
  }

  // ---------------- Kamera ----------------
  drehen(dx, dy) {
    const rs = this.rs;
    this.parallelZiel = 0;
    this.kamFahrt = null;
    rs.azimut -= dx * 0.008;
    rs.hoehe = clamp(rs.hoehe + dy * 0.006, -1.5, 1.5);
    this.einrastenPruefen(false);
  }
  drehenEnde(v) {
    if (Math.hypot(v[0], v[1]) > 3.5) this.schwung = [v[0] * 0.9, v[1] * 0.9];
    else this.einrastenPruefen(true);
  }
  trackpad(dx, dy) {
    this.drehen(dx, dy);
    this.trackpadRuhe = this.zeit;
  }
  einrastenPruefen(loslassen) {
    const rs = this.rs;
    const az = ((rs.azimut % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    const kand = [
      { n: 'seite', az: 0, h: 0 }, { n: 'seite', az: Math.PI, h: 0 }, { n: 'seite', az: -Math.PI, h: 0 },
      { n: 'front', az: -Math.PI / 2, h: 0 }, { n: 'front', az: Math.PI / 2, h: 0 },
    ];
    let best = null;
    for (const k of kand) {
      const e = Math.hypot(az - k.az, rs.hoehe - k.h);
      if (!best || e < best.e) best = { ...k, e };
    }
    if (Math.abs(rs.hoehe) > 1.2) {
      // Top: ohne Drehung um die Hochachse (x nach rechts, wie im Editor)
      best = { n: 'top', az: Math.round(az / (Math.PI / 2)) * (Math.PI / 2), h: Math.sign(rs.hoehe) * (Math.PI / 2) * 0.999, e: Math.PI / 2 - Math.abs(rs.hoehe) };
    }
    this.achsNaehe = best && best.e < RAST ? 1 - best.e / RAST : 0;
    this.rastAchse = best;
    if (loslassen && best && best.e < RAST) {
      this.kamFahrt = { zielAz: unwrap(rs.azimut, best.az), zielH: best.h, t: 0, dann: () => { this.parallelZiel = 1; } };
      this.klang('rasten');
    }
  }
  zoomen(f, x, y) {
    const L = this.linseBei(x, y);
    if (L && L.modus === 'nah') { L.faktor = clamp(L.faktor * f, 0.35, 5); return; }
    const rs = this.rs;
    const alt = rs.abstand;
    rs.abstand = clamp(rs.abstand / f, 0.25 * this.groesse, 40 * this.groesse);
    const k = 1 - rs.abstand / alt;
    // um den Zeiger: der Punkt unter dem Zeiger bleibt stehen
    const p = rs.inEbene(rs.ziel, x, y);
    rs.ziel = [rs.ziel[0] + (p[0] - rs.ziel[0]) * k, rs.ziel[1] + (p[1] - rs.ziel[1]) * k, rs.ziel[2] + (p[2] - rs.ziel[2]) * k];
  }
  schwenken(dx, dy) {
    this.rs.schieben(dx, dy);
  }
  ansichtTaste(n) {
    const rs = this.rs;
    if (n === 'raum') {
      this.parallelZiel = 0;
      this.kamFahrt = { zielAz: unwrap(rs.azimut, HEIM.az), zielH: HEIM.h, t: 0 };
      return;
    }
    const z = { seite: [0, 0], front: [-Math.PI / 2, 0], top: [0, (Math.PI / 2) * 0.999] }[n];
    this.kamFahrt = { zielAz: unwrap(rs.azimut, z[0]), zielH: z[1], t: 0, dann: () => { this.parallelZiel = 1; } };
    this.klang('rasten');
  }

  // ---------------- Wo ist was ----------------
  linseBei(x, y) {
    let best = null;
    for (const L of this.linsen) {
      if (L.a < 0.4 || L.r < 8) continue;
      const d = Math.hypot(x - L.x, y - L.y);
      if (d < L.r && (!best || d < best.d)) best = { L, d };
    }
    return best ? best.L : null;
  }
  sichtBei(x, y) {
    const L = this.linseBei(x, y);
    if (L && L.modus === 'nah') return L.sicht;
    return this.rs;
  }
  layoutTreffer(x, y) {
    const L = this.linseBei(x, y);
    if (L && L.modus === 'dock') return { art: 'layout', was: 'dock', L, sicht: this.rs };
    return null;
  }
  layoutZeiger() { return 'linse'; }
  layoutKlick(z) { if (z.was === 'dock') this.ansichtTaste(z.L.name); }
  layoutZugStart(z, x, y) { this._lz = [x, y]; }
  layoutZugBewegen(x, y) { this.drehen(x - this._lz[0], y - this._lz[1]); this._lz = [x, y]; }
  layoutZugEnde() { this.einrastenPruefen(true); }
  linsenSicht(s) { return this.linsen.find((L) => L.sicht === s) || null; }
  klick(ziel, n, x, y, mod) {
    // ein Klick auf die Leere im Bullauge: die Kamera fliegt auf seine Achse
    const L = ziel.sicht && this.linsenSicht(ziel.sicht);
    if (L && (ziel.art === 'leer' || ziel.art === 'haut')) return this.ansichtTaste(L.name);
    return super.klick(ziel, n, x, y, mod);
  }

  // ---------------- Bildtakt ----------------
  schrittLayout(dt) {
    const rs = this.rs;
    if (this.kamFahrt) {
      const k = this.kamFahrt;
      k.t += dt / 0.42;
      const e = Math.min(1, k.t);
      const f = 1 - Math.pow(1 - e, 3);
      if (k.az0 === undefined) { k.az0 = rs.azimut; k.h0 = rs.hoehe; k.ab0 = rs.abstand; k.z0 = rs.ziel.slice(); }
      if (k.zielAz !== undefined) rs.azimut = k.az0 + (k.zielAz - k.az0) * f;
      if (k.zielH !== undefined) rs.hoehe = k.h0 + (k.zielH - k.h0) * f;
      if (k.ab !== undefined) rs.abstand = k.ab0 + (k.ab - k.ab0) * f;
      if (k.zielZ) rs.ziel = k.z0.map((v, i) => v + (k.zielZ[i] - v) * f);
      if (k.t >= 1) { this.kamFahrt = null; if (k.dann) k.dann(); }
    }
    if (this.schwung && !this.zug) {
      this.drehen(this.schwung[0], this.schwung[1]);
      this.schwung[0] *= Math.pow(0.03, dt);
      this.schwung[1] *= Math.pow(0.03, dt);
      if (Math.hypot(...this.schwung) < 0.35) { this.schwung = null; this.einrastenPruefen(true); }
    }
    if (this.trackpadRuhe !== null && this.zeit - this.trackpadRuhe > 0.22) { this.trackpadRuhe = null; this.einrastenPruefen(true); }
    const v = dt / 0.42;
    rs.parallel += clamp(this.parallelZiel - rs.parallel, -v, v);
    rs.setzen({ x: 0, y: 0, w: this.W, h: this.H });
    this.linsenSchritt(dt);
  }

  zugPunkt(z) {
    if (z.art === 'punkt' || z.art === 'griff') return z.ziel.sp ? spiegel(z.ziel.P.p) : z.ziel.P.p.slice();
    if (z.art === 'linie') return z.p0 ? (z.ziel.sp ? spiegel(z.p0) : z.p0.slice()) : null;
    return null;
  }

  // Bildrichtung, in der die Kamera einer Achsansicht steht (vom Punkt p aus), und wie quer sie liegt (0 … 1)
  achsRichtung(n, p) {
    const rs = this.rs;
    const a = rs.projizieren(p);
    const s = 0.3 * this.groesse;
    const b = rs.projizieren(add(p, mul(ACHSE[n], s)));
    const px = rs.pxJeEinheit(p) * s;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return { dx, dy, l: Math.min(1, Math.hypot(dx, dy) / Math.max(1e-6, px)), w: Math.atan2(dy, dx) };
  }

  linsenSchritt(dt) {
    const t = this.zeit, m = this.maus;
    const g = this.grenzen();
    const zug = this.zug;
    const zugInLinse = zug && this.linsenSicht(zug.sicht);
    const strichInLinse = this.strich && this.linsenSicht(this.strich.sicht);
    let fest = !!(zugInLinse || strichInLinse);
    // 1. Anker: die Stelle, auf die die Bullaugen schauen
    if (zug && !zugInLinse) {
      const p = this.zugPunkt(zug);
      if (p) {
        if (!this.anker || this.anker.zug !== zug) this.anker = { p, zug, mitte: p.slice() };
        else this.anker.p = p;
      }
      this.loslassenSeit = null;
    } else if (!fest && !this.vorfuehrungAnker) {
      const n = this.nahZiel;
      const L = this.linseBei(m.x, m.y);
      if (L && L.modus === 'nah' && this.anker) {
        this.loslassenSeit = null;
        this.kandidat = null;
        fest = true;
      } else if (n && n.sicht === this.rs && (n.art === 'punkt' || n.art === 'linie' || n.art === 'griff') && m.drin) {
        const p = n.art === 'linie' ? n.p : n.sp ? spiegel(n.P.p) : n.P.p;
        if (!this.kandidat || dist(this.kandidat.p, p) > 0.05 * this.groesse) this.kandidat = { p: p.slice(), t0: t };
        if (t - this.kandidat.t0 > 0.26 && (!this.anker || dist(this.anker.p, p) > 0.05 * this.groesse)) this.anker = { p: p.slice(), mitte: p.slice() };
        this.loslassenSeit = null;
      } else {
        this.kandidat = null;
        if (this.anker) {
          const a = this.rs.projizieren(this.anker.p);
          const weit = !m.drin || Math.hypot(m.x - a[0], m.y - a[1]) > R_NAH * 2.4;
          if (weit) {
            if (this.loslassenSeit === null) this.loslassenSeit = t;
            if (t - this.loslassenSeit > 0.9) this.anker = null;
          } else this.loslassenSeit = null;
        }
      }
    }
    if (this.anker && this.anker.zug && !zug) this.anker.zug = null;

    // 2. Ziele der Bullaugen
    const p0 = this.anker ? this.anker.p : g.mitte;
    const nah = !!this.anker;
    const sichtbar = [];
    for (const L of this.linsen) {
      const r = this.achsRichtung(L.name, p0);
      L.sichtbar = smooth(0.16, 0.42, r.l);
      L.winkelRoh = r.w;
      if (L.sichtbar > 0.01) sichtbar.push(L);
    }
    // Winkel auseinanderhalten
    const minW = nah ? 1.3 : 0.5;
    for (const L of sichtbar) L.winkel = L.winkelRoh;
    for (let it = 0; it < 12; it++) {
      for (let i = 0; i < sichtbar.length; i++) for (let j = i + 1; j < sichtbar.length; j++) {
        const A = sichtbar[i], B = sichtbar[j];
        let d = B.winkel - A.winkel;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        if (Math.abs(d) < minW) {
          const s = (minW - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1);
          A.winkel -= s;
          B.winkel += s;
        }
      }
    }
    const W = this.W, H = this.H;
    const a = this.rs.projizieren(p0);
    // Stichproben des Umrisses im Bild: Bullaugen setzen sich lieber neben das Wesen als darauf
    if (nah && !fest) {
      const P = this.netz.pos, probe = [];
      const schritt = 3 * Math.max(1, Math.floor(this.netz.nV / 420));
      for (let i = 0; i < P.length; i += schritt) probe.push(this.rs.projizieren([P[i], P[i + 1], P[i + 2]]));
      const rz = this.zug ? R_ZUG : R_NAH;
      const gesetzt = [];
      const folge = [...sichtbar].sort((A, B) => B.sichtbar - A.sichtbar);
      for (const L of folge) {
        let best = null;
        for (const dw of [0, -0.35, 0.35, -0.7, 0.7, -1.05, 1.05]) for (const D of [rz + 50, rz + 90, rz + 140]) {
          const w = L.winkel + dw;
          const x = clamp(a[0] + Math.cos(w) * D, rz + 10, W - rz - 10), y = clamp(a[1] + Math.sin(w) * D, rz + 10, H - rz - 10);
          let deck = 0;
          for (const q of probe) if ((q[0] - x) ** 2 + (q[1] - y) ** 2 < rz * rz) deck++;
          let stoss = 0;
          for (const o of gesetzt) { const d = Math.hypot(o[0] - x, o[1] - y); if (d < 2 * rz + 14) stoss += 1 + (2 * rz + 14 - d) / 20; }
          const zeiger = Math.hypot(x - a[0], y - a[1]) < rz + 24 ? 50 : 0;
          const wert = (deck / probe.length) * 9 + Math.abs(dw) * 1.1 + (D - rz - 50) / 90 + stoss * 30 + zeiger;
          if (!best || wert < best.wert) best = { x, y, wert };
        }
        // Halten: nur wechseln, wenn es deutlich besser ist
        if (L.platz && L.platzAnker === this.anker) {
          let deck = 0;
          for (const q of probe) if ((q[0] - L.platz[0]) ** 2 + (q[1] - L.platz[1]) ** 2 < rz * rz) deck++;
          let stoss = 0;
          for (const o of gesetzt) { const d = Math.hypot(o[0] - L.platz[0], o[1] - L.platz[1]); if (d < 2 * rz + 14) stoss += 1; }
          if (stoss === 0 && (deck / probe.length) * 9 < best.wert + 0.25) best = { x: L.platz[0], y: L.platz[1] };
        }
        L.platz = [best.x, best.y];
        L.platzAnker = this.anker;
        gesetzt.push(L.platz);
      }
    }
    const ausd = { seite: Math.max(g.max[0] - g.min[0], g.max[1] - g.min[1]), front: Math.max(g.max[2] - g.min[2], g.max[1] - g.min[1]), top: Math.max(g.max[0] - g.min[0], g.max[2] - g.min[2]) };
    for (const L of this.linsen) {
      if (fest && L.modus === 'nah') { L.a = weich(L.a, L.sichtbar > 0.01 ? Math.max(L.sichtbar, 0.6) : 0, dt, 10); continue; }
      let tx, ty, tr, tz, tm;
      if (nah) {
        tr = this.zug ? R_ZUG : R_NAH;
        [tx, ty] = L.platz || [a[0], a[1]];
        // ein Bullauge zeigt gut die Hälfte des Wesens (Lage und Nachbarschaft, nicht nur die Stelle)
        tz = ((2 * tr) / (0.62 * g.ausd)) * L.faktor;
        const am = this.anker.mitte || p0;
        // Mitte nachführen, wenn der gezogene Punkt aus dem Bild läuft
        if (this.anker.zug && dist(am, p0) * tz > tr * 0.55) this.anker.mitte = am.map((v, i) => v + (p0[i] - v) * 0.12);
        tm = this.anker.mitte || p0;
        L.modus = 'nah';
      } else {
        tr = R_DOCK;
        const rd = tr + 22;
        const c = [W / 2, H / 2];
        const dx = Math.cos(L.winkel), dy = Math.sin(L.winkel);
        const tX = dx > 0 ? (W - rd - c[0]) / dx : dx < 0 ? (rd - c[0]) / dx : Infinity;
        const tY = dy > 0 ? (H - rd - c[1]) / dy : dy < 0 ? (rd - c[1]) / dy : Infinity;
        const s = Math.min(tX, tY);
        tx = c[0] + dx * s;
        ty = c[1] + dy * s;
        tz = (2 * tr * 0.8) / ausd[L.name];
        tm = g.mitte;
        L.faktor = 1;
        L.modus = 'dock';
      }
      if (L.a < 0.02) { L.x = tx; L.y = ty; L.r = tr * 0.6; L.zoom = tz; L.mitte = tm.slice(); }
      const k = 11;
      L.x = weich(L.x, tx, dt, k);
      L.y = weich(L.y, ty, dt, k);
      L.r = weich(L.r, tr, dt, k);
      L.zoom = Math.exp(weich(Math.log(L.zoom), Math.log(tz), dt, k));
      L.mitte = L.mitte.map((v, i) => weich(v, tm[i], dt, k));
      L.a = weich(L.a, L.sichtbar, dt, 10);
    }
    for (const L of this.linsen) L.sicht.setzen({ x: L.x - L.r, y: L.y - L.r, w: 2 * L.r, h: 2 * L.r }, L.zoom, L.mitte);
    // Rastlicht auf dem Drehteller
    this.tellerMat.uniforms.uRast.value = weich(this.tellerMat.uniforms.uRast.value, (this.achsNaehe || 0) * (this.parallelZiel < 0.5 ? 1 : 0), dt, 14);
    if (this.rastAchse) this.tellerMat.uniforms.uZielWinkel.value = Math.atan2(Math.cos(this.rastAchse.az), Math.sin(this.rastAchse.az));
  }

  // ---------------- Zeichnen ----------------
  zeichnen() {
    const z = this.z, r = z.r, W = this.W, H = this.H;
    // Grund
    r.setViewport(0, 0, W, H);
    r.setClearColor(0x050e14, 1);
    r.clear(true, true, true);
    this.grundMat.uniforms.uAufl.value.set(W * z.dpr, H * z.dpr);
    z.vollMesh.material = this.grundMat;
    r.render(z.vollSzene, z.vollKamera);
    // Drehteller
    const g = this.grenzen();
    const R = 0.5 * Math.max(g.max[0] - g.min[0], (g.max[2] - g.min[2]) * 1.4) * 1.12;
    this.teller.position.set(g.mitte[0], g.min[1] - 0.04 * this.groesse, 0);
    this.teller.scale.set(R, 1, R);
    this.tellerMat.uniforms.uAlpha.value = 1 - 0.65 * this.rs.parallel * (Math.abs(this.rs.hoehe) > 1.2 ? 0 : 1);
    r.render(this.tellerSzene, this.rs.kamera);
    // Wesen
    this.lampe(true, 180);
    this.jellyZeichnen(this.rs.kamera, { x: 0, y: 0, w: W, h: H }, {});
    this.lampe(false);
    // Bullaugen (die nahen zuletzt, damit sie über den Docks liegen)
    const folge = [...this.linsen].sort((A, B) => (A.modus === 'nah') - (B.modus === 'nah') || A.a - B.a);
    for (const L of folge) if (L.a > 0.02 && L.r > 3) this.linseZeichnen(L);
  }

  linseZeichnen(L) {
    const z = this.z, r = z.r, d = z.dpr;
    const T = Math.round(2 * R_MAX * d * (L.modus === 'dock' ? 0.5 : 1));
    const ziel = z.ziel('bullauge:' + L.name + ':' + T, T, T);
    const s = L.sicht;
    const alt = z.skala;
    z.skala = T / (2 * L.r);
    z.illustration({ name: 'bullauge:' + L.name + ':' + T, kamera: s.kamera, w: T, h: T, px: s.zoom * (T / (2 * L.r)), rect: s.rect, hinten: false, grund: GRUND_LINSE, ohneLinien: L.modus === 'dock' }, ziel);
    z.skala = alt;
    const M = this.linsenMat.uniforms;
    M.uBild.value = ziel.texture;
    M.uMitte.value.set(L.x * d, (this.H - L.y) * d);
    M.uR.value = L.r * d;
    M.uAlpha.value = clamp(L.a, 0, 1);
    M.uHell.value = 1;
    const rand = L.r * 1.3;
    r.setRenderTarget(null);
    r.setViewport(L.x - rand, this.H - L.y - rand, 2 * rand, 2 * rand);
    r.setScissor(L.x - rand, this.H - L.y - rand, 2 * rand, 2 * rand);
    r.setScissorTest(true);
    z.vollMesh.material = this.linsenMat;
    r.render(z.vollSzene, z.vollKamera);
    r.setScissorTest(false);
    r.setViewport(0, 0, this.W, this.H);
  }

  // Verbindungen: vom Bullauge zur Stelle, auf die es schaut (wie die Detailkreise einer technischen Zeichnung)
  obenLayout(c) {
    if (!this.anker) return;
    const a = this.rs.projizieren(this.anker.p);
    const nahe = this.linsen.filter((L) => L.modus === 'nah' && L.a > 0.05);
    if (!nahe.length) return;
    c.save();
    for (const L of nahe) {
      const dx = a[0] - L.x, dy = a[1] - L.y, l = Math.hypot(dx, dy);
      if (l < L.r + 12) continue;
      c.globalAlpha = 0.5 * L.a;
      c.strokeStyle = '#cfefff';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(L.x + (dx / l) * (L.r + 3), L.y + (dy / l) * (L.r + 3));
      c.lineTo(a[0] - (dx / l) * 9, a[1] - (dy / l) * 9);
      c.stroke();
    }
    c.globalAlpha = 0.85 * Math.max(...nahe.map((L) => L.a));
    c.strokeStyle = '#cfefff';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(a[0], a[1], 9, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // ---------------- Vorführung ----------------
  drehbuecher() {
    const app = this;
    const W = () => app.W, H = () => app.H;
    const mittePunkt = (wahl) => {
      const L = app.linien.find((x) => x.art === 'mitte');
      const P = L.punkte.reduce((a, b) => (wahl === 'oben' ? (b.p[1] > a.p[1] ? b : a) : wahl === 'vorn' ? (b.p[0] < a.p[0] ? b : a) : (b.p[0] > a.p[0] ? b : a)));
      return P;
    };
    const proj = (p) => app.rs.projizieren(p);
    const rahmen = () => {
      const P = app.netz.pos;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let i = 0; i < P.length; i += 27) {
        const q = proj([P[i], P[i + 1], P[i + 2]]);
        x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);
      }
      return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
    };
    return {
      start(G) {
        // 1. Leere ziehen = drehen; nahe der Seite loslassen = einrasten (parallel)
        G.gehe(() => [W() * 0.2, H() * 0.7], 0.7);
        G.zieh(() => { const rs = app.rs; const dx = (rs.azimut - 0.05) / 0.008, dy = -rs.hoehe / 0.006 + 6; return [[W() * 0.2, H() * 0.7], [W() * 0.2 + dx * 0.5, H() * 0.7 + dy * 0.5], [W() * 0.2 + dx, H() * 0.7 + dy]]; }, 1.5);
        G.warte(1.3);
        // heraus aus der parallelen Ansicht: ein Stück zurückdrehen (die Ansicht wird wieder räumlich)
        G.gehe(() => [W() * 0.16, H() * 0.6], 0.5);
        G.zieh(() => [[W() * 0.16, H() * 0.6], [W() * 0.16 + 62, H() * 0.6 + 34]], 1.0);
        G.warte(0.6);
        // 2. auf einen Punkt zeigen: die Bullaugen kommen
        G.gehe(() => proj(mittePunkt('oben').p), 0.9);
        G.warte(1.4);
        // 3. ziehen: das Wesen folgt, die Bullaugen zeigen es aus den anderen Richtungen
        G.zieh(() => { const p = proj(mittePunkt('oben').p); return [p, [p[0] + 30, p[1] - 70]]; }, 1.3);
        G.warte(0.9);
        // weg vom Wesen: die Bullaugen kehren an den Rand zurück
        G.gehe(() => [W() * 0.9, H() * 0.88], 0.8);
        G.warte(1.3);
        // 4. rechts ziehen = zeichnen: quer über den Körper → ein neuer Loop
        G.gehe(() => { const r = rahmen(); return [r.x0 + r.w * 0.62, r.y0 - 50]; }, 0.8);
        G.zieh(() => { const r = rahmen(); return [[r.x0 + r.w * 0.62, r.y0 - 50], [r.x0 + r.w * 0.6, r.y0 + r.h * 0.5], [r.x0 + r.w * 0.57, r.y1 + 50]]; }, 1.4, 2);
        G.warte(1.2);
        // 5. Rad = Zoom
        G.gehe(() => [W() * 0.5, H() * 0.5], 0.5);
        G.rad(() => [W() * 0.5, H() * 0.5], 4, 0.7);
        G.rad(() => [W() * 0.5, H() * 0.5], -4, 0.7);
        G.warte(0.8);
      },
    };
  }
}
