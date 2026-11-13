// Runde 3: die Werft. Ein Bild über den ganzen Bildschirm, keine Fenster.
// Jede Kurve bringt ihre Fläche mit (Kiel: Mittelebene, Spant: seine Querebene, Form: die Haut); darin wird gezogen, aus jedem
// Blickwinkel. Seite, Front, Top sind Zustände der einen Kamera: Drehen rastet ein, 1/3/7 halten schaut kurz hin, tippen bleibt.
// Auf einer Achse wird das Jelly zu Florians Illustration (ein Material, zwei Zustände). Ziehen auf der Haut formt wie Ton.
// Ein Strich längs einer Kurve zeichnet sie neu. Plan: docs/look/editor/vision/PLAN-3.md

import { Bullaugen } from './bullaugen.js';
import { THREE } from '../zeichner.js';
import * as S from '../shader.js';
import * as S2 from './shader2.js';
import { add, sub, mul, dot, cross, norm, len, dist, spiegel, clamp, smooth } from '../mathe.js';
import { abtasten, punktAuf, tangenteAuf, punktEinsetzen, ringEndenRichten, mitteRichten, anzahlStuecke } from '../linien.js';

const GEWICHT = { mitte: 2.1, ring: 1.0, paar: 1.1 };
const TUERKIS = [0.23, 0.99, 0.95];

// nächster Punkt einer Geraden (p0 + s·d) zum Strahl
function aufGerade(p0, d, st) {
  const w = sub(p0, st.o);
  const a = dot(d, d), b = dot(d, st.d), c = dot(st.d, st.d), dd = dot(d, w), e = dot(st.d, w);
  const den = a * c - b * b;
  if (Math.abs(den) < 1e-9) return p0.slice();
  const s = (b * e - c * dd) / den;
  return add(p0, mul(d, s));
}

export class Werft extends Bullaugen {
  layoutAnfang() {
    super.layoutAnfang();
    this.linsen = [];
    this.hautFormbar = true;
    this.altDreht = true;
    this.mitteDreht = true;
    this.hautR = null; // Reichweite beim Formen (Welt), wird nach dem Laden gesetzt
    this.flach = 0;
    this.feder = null;
    const z = this.z;
    z.illu.transparent = true;
    this.maskeWeiss = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.konturMat = new THREE.ShaderMaterial({
      vertexShader: S.vollbildVS, fragmentShader: S2.konturFS,
      uniforms: { uMaske: { value: null }, uAufl: { value: new THREE.Vector2() }, uR: { value: 3 }, uAlpha: { value: 1 }, uFarbe: { value: new THREE.Vector3(0.0, 0.16, 0.2) } },
      transparent: true, depthTest: false, depthWrite: false,
    });
    this.ebeneMat = new THREE.ShaderMaterial({
      vertexShader: S2.ebeneVS, fragmentShader: S2.ebeneFS,
      uniforms: { uFarbe: { value: new THREE.Vector3(...TUERKIS) }, uAlpha: { value: 0 }, uRaster: { value: 0.1 }, uGroesse: { value: new THREE.Vector2(1, 1) } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.ebene = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.ebeneMat);
    this.ebene.frustumCulled = false;
    this.ebeneSzene = new THREE.Scene();
    this.ebeneSzene.add(this.ebene);
    this.ebeneZiel = null; // { c, n, u, v, hu, hv, a }
    // Boden mit Grundriss
    this.tellerMat.fragmentShader = S2.bodenFS;
    this.tellerMat.uniforms.uGrundriss = { value: null };
    this.tellerMat.uniforms.uTexel = { value: 1 / 512 };
    this.tellerMat.needsUpdate = true;
    this.rissKamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    this.illuKopie = new THREE.MeshBasicMaterial({ map: null, transparent: true, opacity: 1, depthTest: false, depthWrite: false });
  }

  // Das Wesen füllt das Bild (ein Bild statt vier: es darf groß sein)
  passAbstand() {
    const g = this.grenzen();
    const r = Math.hypot(g.max[0] - g.min[0], g.max[1] - g.min[1], g.max[2] - g.min[2]) / 2;
    const asp = Math.min(1, this.W / this.H);
    return (r * 0.8) / Math.sin(((30 * Math.PI) / 360) * Math.max(0.62, asp));
  }

  // ---------------- Flächen der Kurven ----------------
  ringNormale(L) {
    let mx = 0, my = 0;
    const P = L.punkte.map((Q) => Q.p);
    for (const p of P) { mx += p[0]; my += p[1]; }
    mx /= P.length; my /= P.length;
    let xx = 0, xy = 0, yy = 0;
    for (const p of P) { const dx = p[0] - mx, dy = p[1] - my; xx += dx * dx; xy += dx * dy; yy += dy * dy; }
    // Hauptrichtung der Spur in der x-y-Ebene; die Normale steht senkrecht darauf (die Ebene enthält die z-Achse)
    const w = 0.5 * Math.atan2(2 * xy, xx - yy);
    const u = [Math.cos(w), Math.sin(w), 0];
    return { n: norm([-u[1], u[0], 0]), c: [mx, my, 0], u };
  }
  flaecheFuer(L, P, art) {
    if (L.art === 'mitte') return { art: 'ebene', n: [0, 0, 1] };
    if (L.art === 'ring') {
      const { n } = this.ringNormale(L);
      if (art === 'punkt' && P && this.aufEbene(P)) return { art: 'gerade', d: norm(cross(n, [0, 0, 1])), n };
      return { art: 'ebene', n };
    }
    return { art: 'haut' };
  }
  // eine Ansicht, deren „in der Ebene ziehen“ die Fläche der Kurve benutzt (alles andere wie die Kamera)
  flaechenSicht(f, sp) {
    const rs = this.rs, app = this;
    const n = f.n && (sp ? spiegel(f.n) : f.n), d = f.d && (sp ? spiegel(f.d) : f.d);
    const starr = f.art === 'haut' ? new Float32Array(this.netz.pos) : null;
    const s = Object.create(rs);
    s.flaeche = f;
    s.inEbene = (p0, x, y) => {
      const st = rs.strahl(x, y);
      if (app.tasten.has('Shift') && n) return aufGerade(p0, n, st);
      if (f.art === 'ebene') {
        const den = dot(n, st.d);
        if (Math.abs(den) < 0.17) return rs.inEbene(p0, x, y);
        const t = dot(n, sub(p0, st.o)) / den;
        return add(st.o, mul(st.d, t));
      }
      if (f.art === 'gerade') return aufGerade(p0, d, st);
      // Haut: auf der Haut, wie sie beim Greifen war
      const jetzt = app.netz.pos;
      app.netz.pos = starr;
      const h = app.netz.strahl(st.o, st.d);
      app.netz.pos = jetzt;
      return h ? h.p : rs.inEbene(p0, x, y);
    };
    return s;
  }
  ebeneFuer(L, sp) {
    // Glas: Mitte, Normale, zwei Richtungen in der Ebene, halbe Größen
    if (L.art === 'mitte') {
      const g = this.grenzen();
      return { c: [g.mitte[0], g.mitte[1], 0], n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], hu: (g.max[0] - g.min[0]) * 0.62, hv: (g.max[1] - g.min[1]) * 0.66 };
    }
    if (L.art === 'ring') {
      const { n, c, u } = this.ringNormale(L);
      let ru = 0, rz = 0;
      for (const P of L.punkte) { ru = Math.max(ru, Math.abs(dot(sub(P.p, c), u))); rz = Math.max(rz, Math.abs(P.p[2])); }
      return { c, n, u, v: [0, 0, 1], hu: ru * 1.35 + 0.08, hv: rz * 1.35 + 0.08 };
    }
    return null;
  }

  // ---------------- Züge ----------------
  zugStart(ziel, x, y) {
    if (ziel.art === 'haut') return this.hautZugStart(ziel, x, y);
    super.zugStart(ziel, x, y);
    const z = this.zug;
    if (!z || !ziel.L || z.sicht !== this.rs || this.rs.parallel > 0.5) return;
    const f = this.flaecheFuer(ziel.L, ziel.P, z.art);
    z.sicht = this.flaechenSicht(f, ziel.sp);
    z.flaeche = f;
    z.L = ziel.L;
    z.sp = ziel.sp;
  }

  // Haut formen: die Kurvenpunkte im Umkreis gehen mit, weich zum Rand
  hautZugStart(ziel, x, y) {
    const sp = ziel.p[2] < 0;
    const p0 = sp ? spiegel(ziel.p) : ziel.p.slice();
    const z = { art: 'haut', sicht: this.rs, p0: ziel.p.slice(), q0: p0, sp, x0: x, y0: y };
    this.zug = z;
    this.hautGewichte(z);
    if (!z.bewegt.size) { this.zug = null; this.verweigern(); return; }
    this.klang('greifen');
  }
  hautGewichte(z) {
    const R = this.hautR;
    // zurück auf den Start, dann Gewichte und Basis neu
    if (z.start) for (const [Q, p] of z.start) Q.p = p.slice();
    const bewegt = new Map(), start = z.start || new Map();
    for (const L of this.linien) for (const Q of L.punkte) {
      if (bewegt.has(Q)) continue;
      const p = start.get(Q) || Q.p;
      const d = Math.min(dist(p, z.q0), dist(spiegel(p), z.q0));
      if (d < R) {
        const u = d / R;
        bewegt.set(Q, (1 - u * u) * (1 - u * u));
        if (!start.has(Q)) start.set(Q, Q.p.slice());
      }
    }
    z.bewegt = bewegt;
    z.start = start;
    this.haut.verformen();
    this.poseAnwenden();
    z.basis = bewegt.size ? this.haut.zugBasis(bewegt, (P) => this.aufEbene(P)) : null;
  }
  radImZug(dy) {
    const z = this.zug;
    if (!z || z.art !== 'haut') return false;
    this.hautR = clamp(this.hautR * Math.exp(-dy * 0.0035), 0.06 * this.groesse, 2.5 * this.groesse);
    const d = z.d;
    this.hautGewichte(z);
    if (d) this.hautAnwenden(z, d);
    return true;
  }
  hautAnwenden(z, d) {
    for (const [Q, w] of z.bewegt) {
      const s0 = z.start.get(Q);
      Q.p = [s0[0] + d[0] * w, s0[1] + d[1] * w, this.aufEbene(Q) ? 0 : Math.max(0, s0[2] + d[2] * w)];
    }
    this.vorher.set(this.netz.pos);
    if (z.basis) this.haut.zugAnwenden(z.basis, d);
    this.seifeAus(false);
    this.z.netzAktualisieren();
  }
  zugBewegen(x, y) {
    const z = this.zug;
    if (!z || z.art !== 'haut') return super.zugBewegen(x, y);
    let d = sub(this.rs.inEbene(z.p0, x, y), z.p0);
    if (z.sp) d = spiegel(d);
    z.d = d;
    this.hautAnwenden(z, d);
  }
  zugEnde() {
    const z = this.zug;
    if (!z || z.art !== 'haut') return super.zugEnde();
    this.zug = null;
    for (const L of this.linien) { ringEndenRichten(L); mitteRichten(L); }
    this.verformen(true);
    if (z.d && len(z.d) > 1e-4) { this.wackeln(); this.merken(); }
  }

  // ---------------- Nachzeichnen ----------------
  strichArt(s) {
    const a = super.strichArt(s);
    if (a === 'kritzeln' || !s.sicht || s.sicht !== this.rs) { s.nach = null; return a; }
    const nz = this.nachZiel(s);
    s.nach = nz;
    return nz ? 'nachzeichnen' : a;
  }
  // Beginnt und endet ein Strich nahe an derselben Kurve (dieselbe Seite), zeichnet er sie neu
  nachZiel(s) {
    const P = s.pts;
    if (P.length < 6) return null;
    let weg = 0;
    for (let i = 1; i < P.length; i++) weg += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    const a = P[0], e = P[P.length - 1];
    if (weg < 40 || Math.hypot(e[0] - a[0], e[1] - a[1]) < 24) return null;
    // je Kurve: nächste Stelle zum Anfang und zum Ende des Strichs (Kreuzungen sind mehrdeutig, deshalb je Kurve getrennt)
    let best = null;
    for (const L of this.linien) {
      let bA = null, bB = null;
      for (const zug of abtasten(L, 24)) {
        for (let k = 0; k < zug.pts.length; k++) {
          const s2 = this.rs.projizieren(zug.pts[k]);
          let par = zug.s[k];
          const sp = zug.spiegel || par < 0;
          if (par < 0) par = -par - 1;
          const dA = Math.hypot(s2[0] - a[0], s2[1] - a[1]), dB = Math.hypot(s2[0] - e[0], s2[1] - e[1]);
          if (!bA || dA < bA.d) bA = { d: dA, par, sp };
          if (!bB || dB < bB.d) bB = { d: dB, par, sp };
        }
      }
      if (!bA || !bB || bA.d > 22 || bB.d > 22 || bA.sp !== bB.sp || Math.abs(bA.par - bB.par) < 0.05) continue;
      const wert = bA.d + bB.d - (L.art === 'mitte' ? 4 : 0);
      if (!best || wert < best.wert) best = { wert, L, sp: bA.sp, ua: bA.par, ub: bB.par };
    }
    if (!best) return null;
    return { L: best.L, sp: best.sp, ua: best.ua, ub: best.ub };
  }
  strichEnde() {
    const s = this.strich;
    if (s && this.strichArt(s) === 'nachzeichnen' && s.nach) {
      this.strich = null;
      return this.nachzeichnen(s);
    }
    return super.strichEnde();
  }
  nachzeichnen(s) {
    const { L, sp } = s.nach;
    let { ua, ub } = s.nach;
    const zu = L.art !== 'ring';
    const m = anzahlStuecke(L);
    // der Strich in der Fläche der Kurve (vom Strich-Anfang aus gesehen)
    const f = this.flaecheFuer(L, null, 'linie');
    const fs = this.flaechenSicht(f, sp);
    const refA = punktAuf(L, Math.min(m - 1, Math.floor(ua)), ua - Math.min(m - 1, Math.floor(ua)));
    const ref = sp ? spiegel(refA) : refA;
    let pfad = s.pts.map((q) => fs.inEbene(ref, q[0], q[1]));
    if (sp) pfad = pfad.map(spiegel);
    if (L.art === 'mitte') pfad = pfad.map((p) => [p[0], p[1], 0]);
    // Richtung: der Strich läuft von ua nach ub
    let umkehr = false;
    if (!zu && ub < ua) umkehr = true;
    if (zu) {
      // bei geschlossenen Kurven: den Weg nehmen, dessen Mitte dem Strich näher liegt
      const mitteStrich = pfad[Math.floor(pfad.length / 2)];
      const vor = (ub - ua + m) % m, mVor = (ua + vor / 2) % m;
      const pv = punktAuf(L, Math.floor(mVor) % m, mVor % 1), pr = punktAuf(L, Math.floor((ub + (m - vor) / 2) % m) % m, ((ub + (m - vor) / 2) % m) % 1);
      if (dist(pr, mitteStrich) < dist(pv, mitteStrich)) umkehr = true;
    }
    if (umkehr) { [ua, ub] = [ub, ua]; pfad.reverse(); }
    // Randpunkte einsetzen (das spätere zuerst, damit die Stelle des früheren gilt)
    const einsetzen = (u) => {
      const st = Math.min(m - 1, Math.floor(u)), t = u - st;
      if (t < 0.08) return st;
      if (t > 0.92) return (st + 1) % L.punkte.length;
      punktEinsetzen(L, st, t);
      return st + 1;
    };
    let ia, ib;
    if (!zu || ua < ub) {
      ib = einsetzen(ub);
      const vorB = L.punkte.length;
      ia = einsetzen(ua);
      if (L.punkte.length > vorB) ib += 1;
    } else {
      // über den Anfang hinweg: das spätere (ua) zuerst, das frühere (ub) verschiebt ia
      ia = einsetzen(ua);
      const vorA = L.punkte.length;
      ib = einsetzen(ub);
      if (L.punkte.length > vorA) ia += 1;
    }
    const n = L.punkte.length;
    const innen = [];
    for (let i = (ia + 1) % n; i !== ib; i = (i + 1) % n) { innen.push(i); if (innen.length > n) break; }
    if (!innen.length) {
      // keine Punkte dazwischen: einen in die Mitte setzen
      const st = ia, P = punktEinsetzen(L, st, 0.5);
      void P;
      if (ib > ia) ib += 1;
      innen.push((ia + 1) % L.punkte.length);
    }
    // Lage der inneren Punkte nach Bogenlänge auf dem Strich
    const nn = L.punkte.length;
    const kette = [ia, ...innen, ib].map((i) => L.punkte[i % nn]);
    const altL = [0];
    for (let k = 1; k < kette.length; k++) altL.push(altL[k - 1] + dist(kette[k - 1].p, kette[k].p));
    const pl = [0];
    for (let k = 1; k < pfad.length; k++) pl.push(pl[k - 1] + dist(pfad[k - 1], pfad[k]));
    const auf = (f) => {
      const s2 = f * pl[pl.length - 1];
      let k = 1;
      while (k < pl.length - 1 && pl[k] < s2) k++;
      const t = (s2 - pl[k - 1]) / Math.max(1e-9, pl[k] - pl[k - 1]);
      return { p: add(pfad[k - 1], mul(sub(pfad[k], pfad[k - 1]), t)), tan: norm(sub(pfad[Math.min(pfad.length - 1, k + 1)], pfad[Math.max(0, k - 2)])) };
    };
    const ges = altL[altL.length - 1] || 1;
    for (let k = 1; k < kette.length - 1; k++) {
      const Q = kette[k];
      const { p, tan } = auf(altL[k] / ges);
      Q.p = p;
      const lv = dist(kette[k - 1].p, p) / 3, ln = dist(p, kette[k + 1].p) / 3;
      Q.ein = mul(tan, -lv);
      Q.aus = mul(tan, ln);
      Q.ecke = false;
    }
    // Ränder: Griff zur neuen Linie hin ausrichten
    const tA = auf(0.02).tan, tB = auf(0.98).tan;
    const A = kette[0], B = kette[kette.length - 1];
    if (!A.ecke) { const l = len(A.aus) || dist(A.p, kette[1].p) / 3; A.aus = mul(tA, l); A.ein = mul(tA, -(len(A.ein) || l)); }
    if (!B.ecke) { const l = len(B.ein) || dist(B.p, kette[kette.length - 2].p) / 3; B.ein = mul(tB, -l); B.aus = mul(tB, len(B.aus) || l); }
    if (L.art === 'mitte') for (const Q of L.punkte) { Q.p[2] = 0; Q.ein[2] = 0; Q.aus[2] = 0; }
    ringEndenRichten(L);
    mitteRichten(L);
    this.haut.einbetten(L);
    this.haut.struktur();
    this.verformen(true);
    this.fx.push({ art: 'formLicht', L, t: 0, dauer: 0.8 });
    this.klang('form');
    this.merken();
  }

  // ---------------- federnde Ansichten ----------------
  ansichtDruck(n) {
    if (n === 'raum') { this.feder = null; return this.ansichtTaste('raum'); }
    this.feder = { n, t0: this.zeit, vorher: this.kameraMerken() };
    this.ansichtTaste(n);
  }
  ansichtLos(n) {
    const f = this.feder;
    if (!f || f.n !== n) return;
    this.feder = null;
    // gehalten: zurück, wo man war; getippt: bleiben
    if (this.zeit - f.t0 > 0.3) this.kameraZurueck(f.vorher);
  }

  // ---------------- Bildtakt ----------------
  linsenSchritt(dt) {
    const T = this.tellerMat.uniforms;
    T.uRast.value += ((this.achsNaehe || 0) * (this.parallelZiel < 0.5 ? 1 : 0) - T.uRast.value) * (1 - Math.exp(-dt * 14));
    if (this.rastAchse) T.uZielWinkel.value = Math.atan2(Math.cos(this.rastAchse.az), Math.sin(this.rastAchse.az));
    if (this.hautR === null && this.groesse) this.hautR = 0.32 * this.groesse;
    this.flach = smooth(0.2, 0.95, this.rs.parallel);
    // Glas: die Fläche der Kurve in der Hand, sonst (schwächer) der Kurve unter dem Zeiger
    let ziel = null, a = 0;
    const z = this.zug;
    if (z && z.L && z.flaeche && z.flaeche.art !== 'haut') { ziel = this.ebeneFuer(z.L, z.sp); a = 1; }
    else if (!z && this.nah && this.nah.L && this.flach < 0.5) { ziel = this.ebeneFuer(this.nah.L, this.nah.sp); a = 0.45; }
    if (ziel) this.ebeneZiel = ziel;
    const U = this.ebeneMat.uniforms;
    U.uAlpha.value += ((ziel ? a : 0) * (1 - this.flach) - U.uAlpha.value) * (1 - Math.exp(-dt * 12));
  }

  // ---------------- Formensprache: Linien und Punkte ----------------
  anzeigeBauen() {
    const zuege = [];
    const gewaehlt = new Set();
    for (const L of this.linien) if (L.punkte.length && L.punkte.every((P) => this.auswahl.has(P.id))) gewaehlt.add(L);
    const fx = new Map();
    for (const f of this.fx) if (f.L && (f.art === 'ring' || f.art === 'loopLicht' || f.art === 'formLicht' || f.art === 'tusche')) fx.set(f.L, f);
    const nahL = this.nah && !this.zug ? this.nah.L : null;
    const zugL = this.zug && this.zug.L;
    const nachL = this.strich && this.strich.art === 'nachzeichnen' && this.strich.nach ? this.strich.nach.L : null;
    for (const L of this.linien) {
      for (const zug of abtasten(L, 22)) {
        const f = fx.get(L);
        let zustand = gewaehlt.has(L) ? 2 : 0;
        let tusche = null;
        if (f) {
          const t = f.t / f.dauer;
          tusche = zug.pts.map((_, i) => Math.max(0, 1 - Math.abs(i / zug.pts.length - t * 1.25) * 6) * (1 - t));
          if (f.art !== 'tusche') zustand = Math.max(zustand, t < 0.6 ? 2 : zustand);
        }
        let g = GEWICHT[L.art] || 1;
        if (L === nahL || L === zugL) { zustand = Math.max(zustand, 1); g *= 1.5; }
        if (L === nachL) { zustand = 2; g *= 1.4; }
        zuege.push({ ...zug, zustand, tusche, gewicht: g });
      }
    }
    if (this.strich && this.strich.vorschau && this.strich.art === 'schnitt') {
      for (const v of this.strich.vorschau) {
        const pts = v.pfad;
        const ganz = v.art === 'ring' ? [...pts, ...pts.slice(1, -1).reverse().map(spiegel)] : pts;
        const t = (this.zeit * 1.6) % 1, n = ganz.length;
        zuege.push({ pts: ganz, zu: true, zustand: 2, kante: ganz.map(() => 0.5), gewicht: 1.2, tusche: ganz.map((_, i) => Math.max(0, 1 - Math.abs(i / n - t) * 5)) });
      }
    }
    this.anzeige = { zuege };
  }

  anzeigeSetzen() {
    const z = this.z;
    const punkte = [];
    const nahL = this.nah && !this.zug ? this.nah.L : null;
    const zugL = this.zug && this.zug.L;
    const nahId = this.nah && this.nah.art === 'punkt' ? this.nah.P.id : null;
    const basis = 3.4;
    const nein = this.fx.find((f) => f.art === 'nein' && f.P);
    for (const L of this.linien) {
      const sichtbar = L === nahL || L === zugL;
      L.punkte.forEach((P, i) => {
        const aufEbene = L.art === 'mitte' || (L.art === 'ring' && (i === 0 || i === L.punkte.length - 1));
        const gew = this.auswahl.has(P.id);
        let gr = basis * (gew ? 1.4 : sichtbar ? 1.2 : 1);
        let zust = gew ? 2 : sichtbar ? 1 : 0;
        if (P.id === nahId) { gr *= 1.45; zust = Math.max(zust, 1); }
        if (this.zug && this.zug.bewegt && this.zug.bewegt.has(P) && !gew) { zust = 1; gr *= 1 + 0.5 * this.zug.bewegt.get(P); }
        const raute = P.ecke ? 10 : 0;
        let p = P.p;
        if (nein && nein.P === P) { const t = nein.t / nein.dauer; p = [p[0] + Math.sin(t * Math.PI * 6) * (1 - t) * 0.04 * this.groesse, p[1], p[2]]; }
        punkte.push({ p, gr, zustand: zust + raute });
        if (!aufEbene) punkte.push({ p: spiegel(p), gr: gr * 0.9, zustand: (zust === 0 ? 5 : zust === 2 ? 5 : zust) + raute });
      });
    }
    for (const f of this.fx.filter((f) => f.art === 'plopp')) punkte.push({ p: f.p, gr: basis * (1.5 + (f.t / f.dauer) * 3), zustand: 3 });
    // Griffe nur am aktiven Punkt
    const griffZuege = [];
    const aktiv = this.zug && this.zug.ziel && this.zug.ziel.P ? this.zug.ziel.P : this.auswahl.size === 1 ? (this.punktMitId([...this.auswahl][0]) || {}).P : null;
    if (aktiv) {
      const q = this.punktMitId(aktiv.id);
      if (q) for (const sp of q.zwilling ? [false, true] : [false]) for (const w of ['ein', 'aus']) {
        if (Math.hypot(...aktiv[w]) < 1e-6) continue;
        const a = sp ? spiegel(aktiv.p) : aktiv.p, b = sp ? spiegel(add(aktiv.p, aktiv[w])) : add(aktiv.p, aktiv[w]);
        griffZuege.push({ pts: [a, b], zu: false, zustand: 2, kante: [1, 1], gewicht: 0.55 });
        punkte.push({ p: b, gr: basis * 1.2, zustand: 3 });
      }
    }
    if (this.nah && this.nah.art === 'linie' && !this.zug && !this.strich) punkte.push({ p: this.nah.p, gr: basis * 1.5, zustand: 4 });
    z.linienSetzen([...this.anzeige.zuege, ...griffZuege]);
    z.punkteSetzen(punkte);
  }

  // ---------------- Zeichnen ----------------
  grundrissAktualisieren(g, R) {
    const z = this.z, r = z.r;
    const ziel = z.ziel('werft:grundriss', 512, 512);
    const schluessel = z.netzVersion + '|' + R.toFixed(3);
    if (this._riss === schluessel) return ziel;
    this._riss = schluessel;
    const k = this.rissKamera;
    k.left = -R; k.right = R; k.top = R; k.bottom = -R;
    k.position.set(g.mitte[0], g.max[1] + 5, 0);
    k.up.set(0, 0, -1);
    k.lookAt(g.mitte[0], 0, 0);
    k.near = 0.01; k.far = 50;
    k.updateProjectionMatrix();
    k.updateMatrixWorld();
    z.koerper.material = this.maskeWeiss;
    r.setRenderTarget(ziel);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(z.szeneKoerper, k);
    r.setRenderTarget(null);
    return ziel;
  }

  zeichnen() {
    const z = this.z, r = z.r, W = this.W, H = this.H, d = z.dpr;
    const t = this.flach;
    const w = Math.round(W * d), h = Math.round(H * d);
    const rs = this.rs;
    // 1. Raum: Grund und Boden mit Grundriss
    r.setViewport(0, 0, W, H);
    r.setClearColor(0x050e14, 1);
    r.clear(true, true, true);
    this.grundMat.uniforms.uAufl.value.set(w, h);
    z.vollMesh.material = this.grundMat;
    r.render(z.vollSzene, z.vollKamera);
    const g = this.grenzen();
    const R = 0.5 * Math.max(g.max[0] - g.min[0], (g.max[2] - g.min[2]) * 1.4) * 1.12;
    this.teller.position.set(g.mitte[0], g.min[1] - 0.04 * this.groesse, 0);
    this.teller.scale.set(R, 1, R);
    this.tellerMat.uniforms.uGrundriss.value = this.grundrissAktualisieren(g, R).texture;
    this.tellerMat.uniforms.uAlpha.value = 1 - t;
    r.render(this.tellerSzene, rs.kamera);
    // 2. Glas der Fläche (vor dem Jelly, damit es durch das Jelly scheint)
    const E = this.ebeneZiel, U = this.ebeneMat.uniforms;
    if (E && U.uAlpha.value > 0.01) {
      const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...E.u), new THREE.Vector3(...E.v), new THREE.Vector3(...E.n));
      this.ebene.quaternion.setFromRotationMatrix(m);
      this.ebene.position.set(...E.c);
      this.ebene.scale.set(E.hu, E.hv, 1);
      U.uGroesse.value.set(E.hu, E.hv);
      U.uRaster.value = 0.05 * this.groesse;
      r.render(this.ebeneSzene, rs.kamera);
    }
    // 3. Jelly mit Kontur (verblasst auf der Achse)
    if (t < 0.999) {
      const maske = z.ziel('werft:umriss', w, h);
      z.koerper.material = this.maskeWeiss;
      r.setRenderTarget(maske);
      r.setClearColor(0x000000, 0);
      r.clear(true, true, true);
      r.render(z.szeneKoerper, rs.kamera);
      r.setRenderTarget(null);
      r.setViewport(0, 0, W, H);
      // Einfluss: Lichtfleck auf der Haut vor dem Formen, im Zug mit
      const ein = z.U.uEinfluss.value;
      if (this.zug && this.zug.art === 'haut') {
        const c0 = this.zug.p0, dd = this.zug.d ? (this.zug.sp ? spiegel(this.zug.d) : this.zug.d) : [0, 0, 0];
        ein.set(c0[0] + dd[0], c0[1] + dd[1], c0[2] + dd[2], this.hautR);
      }
      else if (!this.zug && !this.strich && this.nahZiel && this.nahZiel.art === 'haut' && this.maus.drin) ein.set(this.nahZiel.p[0], this.nahZiel.p[1], this.nahZiel.p[2], this.hautR);
      // Linien im Raum: durchgezogen, Punkte nur an der Kurve unter der Hand und im Licht
      for (const mtl of [z.linieSicht, z.linieVerdeckt]) mtl.uniforms.uGestrichelt.value = 0;
      z.linieSicht.uniforms.uAlpha.value = 1 - t;
      z.linieVerdeckt.uniforms.uAlpha.value = 0.18 * (1 - t);
      z.punktMat.uniforms.uLampeMin.value = 0;
      z.punktMat.uniforms.uDeck.value = 1 - t;
      this.lampe(true, 150);
      this.jellyZeichnen(rs.kamera, { x: 0, y: 0, w: W, h: H }, { durchsicht: 1 - t });
      this.lampe(false);
      z.linieSicht.uniforms.uAlpha.value = 1;
      z.linieVerdeckt.uniforms.uAlpha.value = 0.22;
      z.punktMat.uniforms.uDeck.value = 1;
      const K = this.konturMat.uniforms;
      K.uMaske.value = maske.texture;
      K.uAufl.value.set(w, h);
      K.uR.value = 2.6 * d;
      K.uAlpha.value = 0.9 * (1 - t);
      r.setViewport(0, 0, W, H);
      z.vollMesh.material = this.konturMat;
      r.render(z.vollSzene, z.vollKamera);
    }
    // 4. Achse: Florians Illustration (weiß, dicke Kontur, Passer, langer Schatten, gestrichelte Linien)
    if (t > 0.001) {
      const ziel = z.ziel('werft:illu', w, h);
      for (const mtl of [z.linieSicht, z.linieVerdeckt]) mtl.uniforms.uGestrichelt.value = 1;
      z.punktMat.uniforms.uLampeMin.value = 0.55;
      this.lampe(true, 220);
      z.illustration({ name: 'werft', kamera: rs.kamera, w, h, px: rs.pxJeEinheit(rs.ziel) * d, rect: { x: 0, y: 0, w: W, h: H }, hinten: false }, ziel);
      this.lampe(false);
      z.punktMat.uniforms.uLampeMin.value = 0.16;
      this.illuKopie.map = ziel.texture;
      this.illuKopie.opacity = t;
      r.setRenderTarget(null);
      r.setViewport(0, 0, W, H);
      z.vollMesh.material = this.illuKopie;
      r.render(z.vollSzene, z.vollKamera);
    }
    r.setViewport(0, 0, W, H);
  }

  obenLayout(c) {
    // Taste der federnden Ansicht (solange gehalten)
    if (this.feder && this.zeit - this.feder.t0 > 0.3) {
      c.save();
      c.globalAlpha = 0.85;
      c.strokeStyle = '#ffffff';
      c.fillStyle = 'rgba(10,28,37,0.6)';
      c.lineWidth = 1.2;
      const x = this.W / 2 - 16, y = this.H - 54;
      c.beginPath(); c.roundRect(x, y, 32, 32, 7); c.fill(); c.stroke();
      c.fillStyle = '#ffffff';
      c.font = '600 15px ui-monospace, Menlo, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText({ seite: '1', front: '3', top: '7' }[this.feder.n] || '', x + 16, y + 17);
      c.restore();
    }
  }

  // ---------------- Vorführung ----------------
  drehbuecher() {
    const app = this;
    const W = () => app.W, H = () => app.H;
    const proj = (p) => app.rs.projizieren(p);
    // ein Spant quer zum Körper (Normale längs x), möglichst in der Mitte: seine Ebene sieht man gut
    const ring = () => {
      const g = app.grenzen();
      const quer = app.linien.filter((L) => L.art === 'ring' && Math.abs(app.ringNormale(L).n[0]) > 0.75);
      const alle = quer.length ? quer : app.linien.filter((L) => L.art === 'ring');
      return alle.sort((a, b) => Math.abs(app.ringNormale(a).c[0] - g.mitte[0]) - Math.abs(app.ringNormale(b).c[0] - g.mitte[0]))[0];
    };
    const ringPunkt = () => { const L = ring(); return L.punkte.reduce((a, b) => (b.p[2] > a.p[2] ? b : a)); };
    const kiel = () => app.linien.find((L) => L.art === 'mitte');
    const kielOben = () => kiel().punkte.reduce((a, b) => (b.p[1] > a.p[1] ? b : a));
    const hautStelle = () => {
      const g = app.grenzen(), m = proj(g.mitte);
      for (let r = 0; r < 220; r += 9) for (let w = 0; w < 6.28; w += 0.45) {
        const x = m[0] + Math.cos(w) * r, y = m[1] - 30 + Math.sin(w) * r;
        if (app.treffer(x, y, { radius: 26 }).art === 'haut') return [x, y];
      }
      return m;
    };
    const kielNachzeichnen = (G) => {
      G.gehe(() => { const L = kiel(), P = kielOben(); const i = L.punkte.indexOf(P), n = L.punkte.length; return proj(L.punkte[(i + n - 1) % n].p); }, 0.9);
      G.zieh(() => {
        const L = kiel(), P = kielOben(); const i = L.punkte.indexOf(P), n = L.punkte.length;
        const a = proj(L.punkte[(i + n - 1) % n].p), b = proj(L.punkte[(i + 1) % n].p), c = proj(P.p);
        // über die alte Linie (a → Spitze → b), in der Mitte gut 40 Bildpunkte höher
        const w = []; for (let k = 0; k <= 24; k++) { const u = k / 24, v = u < 0.5 ? u * 2 : (u - 0.5) * 2, p = u < 0.5 ? [a[0] + (c[0] - a[0]) * v, a[1] + (c[1] - a[1]) * v] : [c[0] + (b[0] - c[0]) * v, c[1] + (b[1] - c[1]) * v]; w.push([p[0], p[1] - Math.sin(u * Math.PI) * 42]); } return w;
      }, 1.6, 2, { gleich: true });
    };
    const rahmen = () => {
      const P = app.netz.pos;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let i = 0; i < P.length; i += 27) { const q = proj([P[i], P[i + 1], P[i + 2]]); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
    };
    return {
      // kurze Filme je Grundsatz (für die Präsentation)
      achse(G) {
        G.gehe(() => [W() * 0.16, H() * 0.74], 0.6);
        G.zieh(() => { const rs = app.rs; const dx = (rs.azimut - 0.04) / 0.008, dy = -rs.hoehe / 0.006 + 5; return [[W() * 0.16, H() * 0.74], [W() * 0.16 + dx, H() * 0.74 + dy]]; }, 1.6);
        G.warte(1.8);
        G.gehe(() => [W() * 0.14, H() * 0.6], 0.5);
        G.zieh(() => [[W() * 0.14, H() * 0.6], [W() * 0.14 + 80, H() * 0.6 + 45]], 1.2);
        G.warte(1.2);
      },
      ebene(G) {
        G.gehe(() => proj(ringPunkt().p), 1.0);
        G.warte(0.9);
        G.zieh(() => { const p = proj(ringPunkt().p); return [p, [p[0] + 40, p[1] - 30], [p[0] + 70, p[1] - 6]]; }, 1.8);
        G.warte(0.6);
        G.gehe(() => proj(kielOben().p), 0.9);
        G.warte(0.8);
        G.zieh(() => { const p = proj(kielOben().p); return [p, [p[0] - 30, p[1] - 40]]; }, 1.5);
        G.warte(0.8);
      },
      haut(G) {
        G.gehe(() => hautStelle(), 1.0);
        G.warte(0.9);
        G.zieh(() => { const p = hautStelle(); return [p, [p[0] - 14, p[1] - 60], [p[0] - 18, p[1] - 70]]; }, 2.2);
        G.warte(0.8);
      },
      nach(G) {
        kielNachzeichnen(G);
        G.warte(1.2);
      },
      spant(G) {
        G.gehe(() => { const r = rahmen(); return [r.x0 + r.w * 0.62, r.y0 - 50]; }, 0.8);
        G.zieh(() => { const r = rahmen(); return [[r.x0 + r.w * 0.62, r.y0 - 50], [r.x0 + r.w * 0.6, r.y0 + r.h * 0.5], [r.x0 + r.w * 0.57, r.y1 + 50]]; }, 1.5, 2);
        G.warte(1.4);
      },
      feder(G) {
        G.gehe(() => [W() * 0.84, H() * 0.82], 0.5);
        G.taste('1', 1.6);
        G.warte(0.7);
        G.taste('3', 1.6);
        G.warte(0.7);
        G.taste('7', 1.6);
        G.warte(0.9);
      },
      start(G) {
        // 1. Leere ziehen: drehen; nahe der Seite loslassen: das Wesen wird zu seiner Illustration
        G.gehe(() => [W() * 0.16, H() * 0.74], 0.7);
        G.zieh(() => { const rs = app.rs; const dx = (rs.azimut - 0.04) / 0.008, dy = -rs.hoehe / 0.006 + 5; return [[W() * 0.16, H() * 0.74], [W() * 0.16 + dx, H() * 0.74 + dy]]; }, 1.5);
        G.warte(1.6);
        G.gehe(() => [W() * 0.14, H() * 0.6], 0.5);
        G.zieh(() => [[W() * 0.14, H() * 0.6], [W() * 0.14 + 70, H() * 0.6 + 40]], 1.0);
        G.warte(0.8);
        // 2. Spant greifen: seine Ebene erscheint als Glas, der Punkt bleibt darin
        G.gehe(() => proj(ringPunkt().p), 1.0);
        G.warte(0.7);
        G.zieh(() => { const p = proj(ringPunkt().p); return [p, [p[0] + 40, p[1] - 30], [p[0] + 60, p[1] - 10]]; }, 1.5);
        G.warte(0.6);
        // 3. Haut formen wie Ton
        G.gehe(() => hautStelle(), 0.9);
        G.warte(0.6);
        G.zieh(() => { const p = hautStelle(); return [p, [p[0] - 10, p[1] - 45]]; }, 1.3);
        G.warte(0.6);
        // 4. Rechte Taste längs des Kiels: nachzeichnen
        kielNachzeichnen(G);
        G.warte(1.0);
        // 5. 1 halten: kurz von der Seite schauen, loslassen: zurück
        G.gehe(() => [W() * 0.84, H() * 0.82], 0.6);
        G.taste('1', 1.8);
        G.warte(1.0);
      },
    };
  }
}
