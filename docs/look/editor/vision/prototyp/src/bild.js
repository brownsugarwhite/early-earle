// Bildschleife: Animationen weiterschalten, Layout bestimmen, zeichnen (Raum, Blatt, Blick), Überlagerung in 2D.

import { App, THREE, OrthoSicht } from './app.js';
import { abtasten, punktAuf } from './linien.js';
import { add, spiegel, clamp, dist, mix } from './mathe.js';
import { lerpRect } from './raum.js';

const TEX = 640; // Kantenlänge der Wandbilder

// Eine Wand im Raum, über die man in ihrer Ansicht arbeiten kann (Interactive Shadows)
class WandSicht {
  constructor(app, name) {
    this.app = app;
    this.name = name;
    this.art = 'wand';
    this.wand = new OrthoSicht(name);
  }
  ecken() {
    return this.app.wandEcken[this.name];
  }
  wandTreffer(st) {
    const e = this.ecken();
    if (!e) return null;
    const [a, b, , d] = e;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const den = n[0] * st.d[0] + n[1] * st.d[1] + n[2] * st.d[2];
    if (Math.abs(den) < 1e-9) return null;
    const t = ((a[0] - st.o[0]) * n[0] + (a[1] - st.o[1]) * n[1] + (a[2] - st.o[2]) * n[2]) / den;
    if (t <= 0) return null;
    const p = [st.o[0] + st.d[0] * t, st.o[1] + st.d[1] * t, st.o[2] + st.d[2] * t];
    const w = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const uu = (w[0] * u[0] + w[1] * u[1] + w[2] * u[2]) / (u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
    const vv = (w[0] * v[0] + w[1] * v[1] + w[2] * v[2]) / (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (uu < 0 || uu > 1 || vv < 0 || vv > 1) return null;
    return { t, u: uu, v: vv };
  }
  inWand(sx, sy) {
    const st = this.app.raum.sichten.raum.strahl(sx, sy);
    const q = this.wandTrefferFrei(st);
    if (!q) return null;
    return [q.u * this.wand.rect.w, (1 - q.v) * this.wand.rect.h];
  }
  wandTrefferFrei(st) {
    // wie wandTreffer, aber ohne Begrenzung auf das Viereck (Striche dürfen über den Rand)
    const e = this.ecken();
    const [a, b, , d] = e;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const den = n[0] * st.d[0] + n[1] * st.d[1] + n[2] * st.d[2];
    if (Math.abs(den) < 1e-9) return null;
    const t = ((a[0] - st.o[0]) * n[0] + (a[1] - st.o[1]) * n[1] + (a[2] - st.o[2]) * n[2]) / den;
    const p = [st.o[0] + st.d[0] * t, st.o[1] + st.d[1] * t, st.o[2] + st.d[2] * t];
    const w = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    return { t, u: (w[0] * u[0] + w[1] * u[1] + w[2] * u[2]) / (u[0] ** 2 + u[1] ** 2 + u[2] ** 2), v: (w[0] * v[0] + w[1] * v[1] + w[2] * v[2]) / (v[0] ** 2 + v[1] ** 2 + v[2] ** 2) };
  }
  // Weltpunkt → Bildpunkt auf dem Bildschirm (über die Wand)
  projizieren(p) {
    const q = this.wand.projizieren(p);
    const u = q[0] / this.wand.rect.w, v = 1 - q[1] / this.wand.rect.h;
    const [a, b, , d] = this.ecken();
    const w = [a[0] + (b[0] - a[0]) * u + (d[0] - a[0]) * v, a[1] + (b[1] - a[1]) * u + (d[1] - a[1]) * v, a[2] + (b[2] - a[2]) * u + (d[2] - a[2]) * v];
    return this.app.raum.sichten.raum.projizieren(w);
  }
  strahl(sx, sy) {
    const t = this.inWand(sx, sy) || [0, 0];
    return this.wand.strahl(t[0], t[1]);
  }
  inEbene(p0, sx, sy) {
    const t = this.inWand(sx, sy);
    if (!t) return p0.slice();
    return this.wand.inEbene(p0, t[0], t[1]);
  }
  pxJeEinheit() {
    return 100;
  }
  enthaelt() {
    return true;
  }
}

App.prototype.startOhneTakt = function () {
  this.wandSichten = { seite: new WandSicht(this, 'seite'), front: new WandSicht(this, 'front'), top: new WandSicht(this, 'top') };
  this.wandEcken = {};
  this.tasten = this.tasten || new Set();
  this.letzt = 0;
};
App.prototype.start = function () {
  this.startOhneTakt();
  this.letzt = performance.now();
  const schleife = (t) => {
    if (this.filmTakt) this.filmTakt(t);
    this.bild(t);
    requestAnimationFrame(schleife);
  };
  requestAnimationFrame(schleife);
};

App.prototype.bild = function (tJetzt) {
  const dt = Math.min(0.05, Math.max(0, (tJetzt - this.letzt) / 1000));
  this.letzt = tJetzt;
  this._dt = dt;
  this.zeit += dt;
  const z = this.z, R = this.raum;
  if (this.eingabeTakt) this.eingabeTakt();
  z.U.uZeit.value = this.zeit;
  z.U.uSeife.value = this.seife ? 1 : 0;
  R.schritt(dt);
  // Kamerafahrt (Einrasten, Einpassen)
  if (this.kamFahrt) {
    const k = this.kamFahrt, rs = R.sichten.raum;
    k.t += dt / 0.32;
    const e = Math.min(1, k.t);
    const f = 1 - Math.pow(1 - e, 3);
    if (k.az0 === undefined) { k.az0 = rs.azimut; k.h0 = rs.hoehe; k.ab0 = rs.abstand; }
    if (k.zielAz !== undefined) rs.azimut = k.az0 + (k.zielAz - k.az0) * f;
    if (k.zielH !== undefined) rs.hoehe = k.h0 + (k.zielH - k.h0) * f;
    if (k.ab !== undefined) rs.abstand = k.ab0 + (k.ab - k.ab0) * f;
    if (k.t >= 1) {
      this.kamFahrt = null;
      if (k.dann) k.dann();
    }
  }
  // Schwung beim Drehen
  if (this.schwung && !this.zweiFinger) {
    this.drehen(this.schwung[0], this.schwung[1]);
    this.schwung[0] *= Math.pow(0.02, dt);
    this.schwung[1] *= Math.pow(0.02, dt);
    if (Math.hypot(...this.schwung) < 0.3) {
      this.schwung = null;
      if (R.modus === 'raum') this.einrastenPruefen(true);
    }
  }
  // Seifenhaut klingt ab
  const B = z.bewegt;
  if (B) {
    const k = Math.exp(-dt / 0.32);
    let summe = 0;
    for (let v = 0; v < B.length; v++) {
      B[v] *= k;
      summe += B[v];
    }
    if (summe > 0.01) z.koerper.geometry.attributes.bewegt.needsUpdate = true;
  }
  // Röntgenlinse öffnet und schließt
  if (this.linse) {
    const L = this.linse;
    if (L.zu) {
      L.r -= dt * 900;
      if (L.r <= 0) this.linse = null;
    } else L.r = Math.min(L.ziel, L.r + dt * 700);
  }
  z.U.uLinse.value.set(this.linse ? this.linse.x * z.dpr : 0, this.linse ? (this.H - this.linse.y) * z.dpr : 0, this.linse ? this.linse.r * z.dpr : 0);
  // Einfluss sichtbar machen (nur während eines Zugs mit Zirkel oder Rad)
  if (this.zug && this.zug.art === 'punkt' && this.einfluss > 0) {
    const p = this.zug.ziel.sp ? spiegel(this.zug.ziel.P.p) : this.zug.ziel.P.p;
    z.U.uEinfluss.value.set(p[0], p[1], p[2], this.einfluss);
  } else z.U.uEinfluss.value.set(0, 0, 0, 0);
  for (const f of this.fx) f.t += dt;
  this.fx = this.fx.filter((f) => f.t < f.dauer);
  for (const g of this.geister) g.t += dt;
  this.geister = this.geister.filter((g) => g.t < g.dauer);
  if (this.hilfe) this.hilfe.t += dt;

  // Raum an die Form anpassen (nicht während eines Zugs, sonst laufen die Wände mit)
  if (!this.zug && !this.strich) R.boxSetzen(this.netz);
  const lay = R.layout(this.W, this.H);
  this.lay = lay;

  // Linien und Punkte für dieses Bild (einmal, für alle Ansichten)
  this.anzeigeBauen();
  this.anzeigeSetzen();

  z.r.setScissorTest(false);
  z.r.setRenderTarget(null);
  z.r.setClearColor(new THREE.Color(0x17131b), 1);
  z.r.clear(true, true, true);
  this.wackelSkala();

  if (lay.art === 'raum') this.raumZeichnen(lay);
  else if (lay.art === 'blickRaum') this.raumZeichnen({ ...lay, falte: 0 });
  else {
    for (const n of lay.direkt) {
      const s = R.sichten[n];
      const alpha = lay.art === 'blick' && n !== lay.vorn ? 1 - lay.verblassen : 1;
      if (alpha < 0.02) continue;
      this.orthoZeichnen(s, null);
    }
    if (lay.raum) this.dreiDZeichnen(R.sichten.raum, lay.raum);
    // im Blick zeichnet die vordere Ansicht zuletzt (wächst über die anderen)
    if (lay.art === 'blick' && lay.verblassen < 0.98) this.orthoZeichnen(R.sichten[lay.vorn], null);
  }
  this.obenZeichnen(lay);
};

// Wackeln nach dem Loslassen (nur im 3D)
App.prototype.wackelSkala = function () {
  const w = this.fx.find((f) => f.art === 'wackeln');
  // Atmen: kaum merklich, nur im 3D und nur, wenn niemand zieht (Spore: das Wesen lebt)
  const atmen = this.zug || this.strich ? 0 : Math.sin(this.zeit * 1.7) * 0.006;
  if (!w) { this.wackel = atmen; return; }
  const t = w.t / w.dauer;
  this.wackel = Math.sin(t * Math.PI * 4) * Math.exp(-t * 4) * 0.028 + atmen;
};

App.prototype.orthoZeichnen = function (s, ziel, rectTex) {
  const z = this.z;
  const W = ziel ? rectTex.w : s.rect.w * z.dpr, H = ziel ? rectTex.h : s.rect.h * z.dpr;
  const px = (ziel ? rectTex.zoom : s.zoom * z.dpr);
  z.koerper.scale.set(1, 1, 1);
  const grund = this.pose && this.maulAuf > 0.01 ? (mg, kam, w, h) => this.grundMaske(mg, kam, w, h) : null;
  z.illustration({ name: (ziel ? 'w:' : 'd:') + s.name, kamera: s.kamera, w: W, h: H, px, rect: s.rect, hinten: s.hinten, grundMaske: grund }, ziel, (kam, w, h) => {
  });
};

// Maske der Grundform (ohne Pose) für den Passer
App.prototype.grundMaske = function (ziel, kam, w, h) {
  // die Grundform (vor dem Kiefer) liegt in grundPos, festgehalten beim Anwenden der Pose
  const z = this.z;
  if (!this.grundPos) return;
  const P = this.netz.pos;
  const jetzt = new Float32Array(P);
  P.set(this.grundPos);
  z.koerper.geometry.attributes.position.needsUpdate = true;
  z.koerper.material = z.maske;
  z.r.setRenderTarget(ziel);
  z.r.setClearColor(0x000000, 0);
  z.r.clear(true, true, true);
  z.r.render(z.szeneKoerper, kam);
  P.set(jetzt);
  z.koerper.geometry.attributes.position.needsUpdate = true;
};

App.prototype.dreiDZeichnen = function (rs, rect) {
  const z = this.z;
  rs.setzen(rect);
  const a = this.wackel || 0;
  z.koerper.scale.set(1 - a * 0.5, 1 + a, 1 - a * 0.5);
  this.strahlenSetzen(false);
  z.jelly.uniforms.uDurchsicht.value = 1;
  z.raum(rs.kamera, rect, { strahlen: true, glas: this.spiegelNaehe > 0.01, geister: this.geisterZeichner() });
  z.koerper.scale.set(1, 1, 1);
};

App.prototype.geisterZeichner = function () {
  if (!this.geister.length) return null;
  const z = this.z;
  return this.geister.map((g) => (kam) => {
    const P = this.netz.pos;
    const jetzt = new Float32Array(P);
    P.set(g.pos);
    this.netz.normalen();
    z.netzAktualisieren();
    const u = z.jelly.uniforms;
    u.uGeist.value = 1 - g.t / g.dauer;
    z.r.render(z.szeneKoerper, kam);
    u.uGeist.value = 0;
    P.set(jetzt);
    this.netz.normalen();
    z.netzAktualisieren();
    z.r.clearDepth();
  });
};

App.prototype.raumZeichnen = function (lay) {
  const z = this.z, R = this.raum;
  const rs = R.sichten.raum;
  const f = lay.falte || 0;
  // Wandbilder rendern (ihre Ansicht genau auf die Wand zugeschnitten)
  const kamPos = rs.kamera.position.toArray();
  const w = R.waendeSetzen(z, f > 0 ? [-1, 1, 1] : kamPos, f);
  this.wandEcken = w.ecken;
  const b = R.box;
  const ausd = { seite: [b.max[0] - b.min[0], b.max[1] - b.min[1]], front: [b.max[2] - b.min[2], b.max[1] - b.min[1]], top: [b.max[0] - b.min[0], b.max[2] - b.min[2]] };
  for (const n of ['seite', 'front', 'top']) {
    const ws = this.wandSichten[n].wand;
    const [ew, eh] = ausd[n];
    const k = TEX / Math.max(ew, eh);
    const tw = Math.round(ew * k), th = Math.round(eh * k);
    ws.hinten = w.hinten[n];
    ws.setzen({ x: 0, y: 0, w: tw, h: th }, k, [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2]);
    const ziel = z.ziel('wandbild:' + n, tw, th);
    this.orthoZeichnen(ws, ziel, { w: tw, h: th, zoom: k });
    z.wandMat[n].uniforms.uBild.value = ziel.texture;
    z.wandMat[n].uniforms.uAlpha.value = 1;
  }
  if (f > 0) {
    // Falten: Kamera fährt vor das Blatt, die Form gleitet in ihr Feld unten rechts
    R.faltKamera(rs, this.W, this.H, f);
    z.r.setRenderTarget(null);
    z.r.setViewport(0, 0, this.W, this.H);
    z.r.setScissorTest(false);
    z.r.setClearColor(new THREE.Color(0x0d0b10), 1);
    z.r.clear(true, true, true);
    z.r.render(z.szeneWaende, rs.kamera);
    const bl = R.blattLayout(this.W, this.H);
    const ziel = lerpRect({ x: 0, y: 0, w: this.W, h: this.H }, bl.raum, f);
    // eigene Kamera für die Form (die Faltkamera schaut aufs Blatt)
    const k2 = this._formSicht || (this._formSicht = new (rs.constructor)());
    k2.azimut = -0.62; k2.hoehe = 0.36; k2.abstand = rs.abstand; k2.ziel = rs.ziel;
    k2.setzen(ziel);
    z.raum(k2.kamera, ziel, { klar: false });
    if (R.falte >= 1 && R.modus === 'blatt') rs._faltStart = null;
    if (R.falte <= 0 && R._zurueck) R._zurueck = false;
    return;
  }
  // Raum: Wände, dann Form; nahe einer Achse wird die Form durchsichtig und ihr Schatten an der Wand übernimmt
  const a = this.wackel || 0;
  z.koerper.scale.set(1 - a * 0.5, 1 + a, 1 - a * 0.5);
  this.strahlenSetzen(true);
  const durch = 1 - smooth01(this.achsNaehe || 0) * 0.85;
  z.jelly.uniforms.uDurchsicht.value = durch;
  z.raum(rs.kamera, lay.raum, { waende: true, strahlen: true, glas: this.spiegelNaehe > 0.01, geister: this.geisterZeichner() });
  z.koerper.scale.set(1, 1, 1);
  z.jelly.uniforms.uDurchsicht.value = 1;
};
const smooth01 = (x) => x * x * (3 - 2 * x);

// Ordnungslinien: vom gefassten Punkt zu seinen Bildern an den Wänden
App.prototype.strahlenSetzen = function (mitWaenden) {
  const z = this.z;
  const zuege = [];
  const p = this.fokusPunkt();
  if (p && mitWaenden && this.raum.falte === 0 && this.wandEcken.seite) {
    const e = this.wandEcken;
    const zW = e.seite[0][2], xW = e.front[0][0], yW = e.top[0][1];
    for (const q of [[p[0], p[1], zW], [xW, p[1], p[2]], [p[0], yW, p[2]]]) zuege.push({ pts: [p, q], zu: false, zustand: 0 });
  }
  z.strahlenSetzen(zuege);
  z.glasMat.uniforms.uAlpha.value = this.spiegelNaehe || 0;
  const b = this.raum.box;
  z.glas.position.set((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, 0);
  z.glas.scale.set(b.max[0] - b.min[0], b.max[1] - b.min[1], 1);
};

App.prototype.fokusPunkt = function () {
  if (this.zug && this.zug.art === 'punkt') return this.zug.ziel.sp ? spiegel(this.zug.ziel.P.p) : this.zug.ziel.P.p;
  if (this.auswahl.size === 1) {
    const q = this.punktMitId([...this.auswahl][0]);
    if (q) return q.P.p;
  }
  return null;
};

// Linien- und Punktdaten des Bilds (unabhängig von der Ansicht)
App.prototype.anzeigeBauen = function () {
  const zuege = [];
  const gewaehlteLoops = new Set();
  for (const L of this.linien) if (L.punkte.length && L.punkte.every((P) => this.auswahl.has(P.id))) gewaehlteLoops.add(L);
  const fxRing = new Map();
  for (const f of this.fx) if (f.L && (f.art === 'ring' || f.art === 'loopLicht' || f.art === 'formLicht' || f.art === 'tusche')) fxRing.set(f.L, f);
  for (const L of this.linien) {
    for (const zug of abtasten(L, 22)) {
      const f = fxRing.get(L);
      let zustand = gewaehlteLoops.has(L) ? 2 : 0;
      let tusche = null;
      if (f) {
        const t = f.t / f.dauer;
        // Licht läuft einmal um die Linie
        tusche = zug.pts.map((_, i) => {
          const u = i / zug.pts.length;
          const d = Math.abs(u - t * 1.25);
          return Math.max(0, 1 - d * 6) * (1 - t);
        });
        if (f.art !== 'tusche') zustand = Math.max(zustand, t < 0.6 ? 2 : zustand);
      }
      if (this.nah && this.nah.art === 'linie' && this.nah.L === L && !this.zug) zustand = Math.max(zustand, 1);
      zuege.push({ ...zug, zustand, tusche });
    }
  }
  // Vorschau eines Schnitts
  if (this.strich && this.strich.vorschau && this.strich.art === 'schnitt') {
    for (const v of this.strich.vorschau) {
      const pts = v.pfad;
      const ganz = v.art === 'ring' ? [...pts, ...pts.slice(1, -1).reverse().map(spiegel)] : pts;
      const t = (this.zeit * 1.6) % 1;
      const n = ganz.length;
      zuege.push({ pts: ganz, zu: true, zustand: 2, kante: ganz.map(() => 0.5), tusche: ganz.map((_, i) => Math.max(0, 1 - Math.abs(i / n - t) * 5)) });
      if (v.art === 'paar') zuege.push({ pts: pts.map(spiegel), zu: true, zustand: 2, kante: pts.map(() => 0.5) });
    }
  }
  this.anzeige = { zuege };
};

// Punkte, Griffe, Perle für eine Ansicht (Größe in Bildpunkten)
App.prototype.anzeigeSetzen = function () {
  const z = this.z;
  const punkte = [];
  const nahId = this.nah && this.nah.art === 'punkt' ? this.nah.P.id : null;
  const nein = this.fx.find((f) => f.art === 'nein' && f.P);
  const plopp = this.fx.filter((f) => f.art === 'plopp');
  const basis = istGross() ? 4.2 : 4.6;
  for (const L of this.linien) {
    L.punkte.forEach((P, i) => {
      const aufEbene = L.art === 'mitte' || (L.art === 'ring' && (i === 0 || i === L.punkte.length - 1));
      const gew = this.auswahl.has(P.id);
      let gr = basis * (gew ? 1.35 : 1);
      let zust = gew ? 2 : 0;
      if (P.id === nahId) { gr *= 1.5; zust = Math.max(zust, 1); }
      if (this.zug && this.zug.art === 'punkt' && this.zug.bewegt.has(P) && !gew) { zust = 5; gr *= 1 + 0.4 * this.zug.bewegt.get(P); }
      let p = P.p;
      if (nein && nein.P === P) {
        const t = nein.t / nein.dauer;
        const s = Math.sin(t * Math.PI * 6) * (1 - t) * 0.04 * this.groesse;
        p = [p[0] + s, p[1], p[2]];
      }
      punkte.push({ p, gr, zustand: zust });
      if (!aufEbene) punkte.push({ p: spiegel(p), gr: gr * 0.9, zustand: zust === 2 ? 5 : zust });
    });
  }
  for (const f of plopp) {
    const t = f.t / f.dauer;
    punkte.push({ p: f.p, gr: basis * (1.5 + t * 3), zustand: 3 });
  }
  // Griffe der gewählten Punkte: Stäbe als Linien, Spitzen als Ringe
  const griffZuege = [];
  for (const id of this.auswahl) {
    if (this.auswahl.size > 6) break;
    const q = this.punktMitId(id);
    if (!q) continue;
    const P = q.P;
    for (const sp of q.zwilling ? [false, true] : [false]) {
      for (const w of ['ein', 'aus']) {
        if (Math.hypot(...P[w]) < 1e-6) continue;
        const a = sp ? spiegel(P.p) : P.p, b = sp ? spiegel(add(P.p, P[w])) : add(P.p, P[w]);
        griffZuege.push({ pts: [a, b], zu: false, zustand: 2, kante: [0.35, 0.35] });
        punkte.push({ p: b, gr: basis * 1.15, zustand: 3 });
      }
    }
  }
  // Perle: hier entsteht beim Tippen ein Punkt
  if (this.nah && this.nah.art === 'linie' && !this.zug && !this.strich) punkte.push({ p: this.nah.p, gr: basis * 1.4, zustand: 4 });
  z.linienSetzen([...this.anzeige.zuege, ...griffZuege.map((g) => ({ ...g, kante: [1, 1] }))]);
  z.punkteSetzen(punkte);
};

const istGross = () => innerWidth > 900;

// ---------------- Überlagerung (2D): Striche, Linse, Hilfe, Ordnungslinien im Blatt, Effekte ----------------
App.prototype.obenZeichnen = function (lay) {
  const c = this.ctx;
  c.clearRect(0, 0, this.W, this.H);
  const lila = '#936ffb', flieder = '#d4b3f5', rosa = '#ff72a9';
  // Strich
  if (this.strich) {
    const s = this.strich;
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const art = s.art;
    c.strokeStyle = art === 'kritzeln' ? rosa : art === 'schnitt' ? flieder : art === 'form' ? lila : 'rgba(230,220,255,0.75)';
    c.lineWidth = art === 'kritzeln' ? 5 : 2.2;
    if (art === 'kritzeln') { c.shadowColor = rosa; c.shadowBlur = 12; }
    c.beginPath();
    s.pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.stroke();
    // Magnet: geschlossene Form zieht das Ende zum Anfang
    if (art === 'form' || art === 'formOffen') {
      const a = s.pts[0], e = s.pts[s.pts.length - 1];
      const d = Math.hypot(e[0] - a[0], e[1] - a[1]);
      if (d < 60) {
        c.globalAlpha = 1 - d / 60;
        c.fillStyle = lila;
        c.beginPath();
        c.arc(a[0], a[1], 6 + (1 - d / 60) * 8, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
    }
    c.restore();
  }
  // vergängliche Striche
  for (const f of this.fx) {
    const t = f.t / f.dauer;
    if (f.art === 'verdunsten') {
      c.save();
      c.globalAlpha = (1 - t) * 0.7;
      c.strokeStyle = '#e6ddf4';
      c.setLineDash([2, 6 + t * 20]);
      c.lineWidth = 2;
      c.beginPath();
      f.pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1] - t * 14) : c.moveTo(p[0], p[1] - t * 14)));
      c.stroke();
      c.restore();
    } else if (f.art === 'krumen') {
      c.save();
      for (let i = 0; i < f.pts.length; i += 2) {
        const p = f.pts[i];
        const r = ((i * 7919) % 100) / 100;
        c.globalAlpha = (1 - t) * 0.9;
        c.fillStyle = r > 0.5 ? rosa : flieder;
        c.beginPath();
        c.arc(p[0] + (r - 0.5) * 30 * t, p[1] + t * t * 60 * (0.5 + r), 2.4 * (1 - t), 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    } else if (f.art === 'druck') {
      c.save();
      c.globalAlpha = (1 - t) * 0.18;
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, this.W, this.H);
      c.restore();
    }
  }
  // Röntgenlinse: dünner Ring (die Durchsicht macht der Shader)
  if (this.linse && this.linse.r > 2) {
    c.save();
    c.strokeStyle = 'rgba(212,179,245,0.9)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(this.linse.x, this.linse.y, this.linse.r, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
  // Ordnungslinien im Blatt (waagerecht Seite ↔ Front, senkrecht Seite ↔ Top, Front ↔ Top über die Gehrung)
  if ((lay.art === 'blatt') && this.fokusPunkt()) this.ordnungslinien(this.fokusPunkt());
  // Gestenhilfe: Lichtspuren der Gesten, die hier gehen
  if (this.hilfe) this.hilfeZeichnen();
  if (this.geisterFinger) this.geisterFinger(c, this._dt || 0.016);
  // Faltkanten im Blatt (ganz leise)
  if (lay.art === 'blatt') {
    const bl = this.raum.blatt;
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(bl.front.x, bl.ganz.y); c.lineTo(bl.front.x, bl.ganz.y + bl.ganz.h);
    c.moveTo(bl.ganz.x, bl.top.y); c.lineTo(bl.ganz.x + bl.ganz.w, bl.top.y);
    c.stroke();
    // Gehrungslinie im Feld der Form
    c.strokeStyle = 'rgba(212,179,245,0.10)';
    c.setLineDash([3, 5]);
    c.beginPath();
    c.moveTo(bl.raum.x, bl.raum.y);
    c.lineTo(bl.raum.x + bl.raum.w, bl.raum.y + bl.raum.h);
    c.stroke();
    c.restore();
  }
  // Nein: Kopfschütteln der ganzen Bühne
  const nein = this.fx.find((f) => f.art === 'nein' && !f.P);
  this.canvas.style.transform = nein ? `translateX(${Math.sin(nein.t / nein.dauer * Math.PI * 6) * (1 - nein.t / nein.dauer) * 9}px)` : '';
};

App.prototype.ordnungslinien = function (p) {
  const c = this.ctx, R = this.raum;
  const S = R.sichten;
  const ps = S.seite.projizieren(p), pf = S.front.projizieren(p), pt = S.top.projizieren(p);
  const bl = R.blatt;
  c.save();
  c.lineWidth = 1.2;
  const g = c.createLinearGradient(ps[0], ps[1], pf[0], pf[1]);
  c.strokeStyle = 'rgba(212,179,245,0.55)';
  c.setLineDash([1, 4]);
  c.beginPath();
  c.moveTo(ps[0], ps[1]); c.lineTo(pf[0], pf[1]); // gleiche Höhe
  c.moveTo(ps[0], ps[1]); c.lineTo(pt[0], pt[1]); // gleiche Länge
  // Front → Gehrung → Top (gleiche Breite)
  const gx = pf[0], gy = bl.raum.y + (pf[0] - bl.raum.x) / bl.raum.w * bl.raum.h;
  c.moveTo(pf[0], pf[1]); c.lineTo(gx, gy); c.lineTo(pt[0], pt[1]);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = '#d4b3f5';
  for (const q of [ps, pf, pt]) { c.beginPath(); c.arc(q[0], q[1], 3.2, 0, Math.PI * 2); c.fill(); }
  c.restore();
  void g;
};

App.prototype.hilfeZeichnen = function () {
  const c = this.ctx, h = this.hilfe;
  const t = h.t;
  c.save();
  const leuchte = (x, y, r, a, farbe = '#d4b3f5') => {
    c.globalAlpha = a;
    c.fillStyle = farbe;
    c.shadowColor = farbe;
    c.shadowBlur = 14;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  };
  // Mitte der Form auf dem Bildschirm
  const sicht = h.sicht || this.raum.sichten.raum;
  const m = sicht.projizieren ? sicht.projizieren([0, 0, 0]) : [this.W / 2, this.H / 2];
  const R = 110;
  const zyklus = 3.2;
  const phase = (t % zyklus) / zyklus;
  const welche = Math.floor(t / zyklus) % 4;
  c.lineCap = 'round';
  if (welche === 0) {
    // Strich quer über die Form → Loop
    const x = m[0] - R * 1.6 + phase * R * 3.2;
    c.strokeStyle = 'rgba(212,179,245,0.6)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(m[0] - R * 1.6, m[1] - 10); c.lineTo(x, m[1] - 10 + phase * 20); c.stroke();
    leuchte(x, m[1] - 10 + phase * 20, 7, 0.9);
  } else if (welche === 1) {
    // geschlossener Kreis auf der Haut → Form
    const a = phase * Math.PI * 2;
    c.strokeStyle = 'rgba(147,111,251,0.7)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(m[0] - 20, m[1] - 20, 34, -Math.PI / 2, -Math.PI / 2 + a); c.stroke();
    leuchte(m[0] - 20 + Math.cos(a - Math.PI / 2) * 34, m[1] - 20 + Math.sin(a - Math.PI / 2) * 34, 7, 0.9);
  } else if (welche === 2) {
    // zwei Finger drehen
    const a = phase * Math.PI * 0.8;
    leuchte(m[0] - 40 + a * 40, m[1] + 80, 8, 0.85, '#3bfcf2');
    leuchte(m[0] + 20 + a * 40, m[1] + 80, 8, 0.85, '#3bfcf2');
  } else {
    // kritzeln → weg
    const x = m[0] + 40 + Math.sin(phase * Math.PI * 10) * 22, y = m[1] - 50 + phase * 20;
    leuchte(x, y, 6, 0.9, '#ff72a9');
  }
  c.restore();
};

export { App };
