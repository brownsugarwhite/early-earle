// Die Vision als lauffähiger Prototyp: ein Raum, eine Hand, ein Licht.
// Alle Bedienung ohne Text: Was eine Geste tut, zeigt sich, bevor man loslässt.

import { kugel, Netz } from './netz.js';
import { Haut } from './haut.js';
import { linieAusPfad, abtasten, punktAuf, tangenteAuf, punktEinsetzen, punktLoeschen, glaetten, ringEndenRichten, mitteRichten, linieKopieren, anzahlStuecke, naechsteStelle, idSetzen } from './linien.js';
import { schnittPfade, linieAnlegen, formPfad, trifftKoerper, kreuzId } from './schnitt.js';
import { Zeichner, THREE } from './zeichner.js';
import { Raum } from './raum.js';
import { OrthoSicht } from './ansichten.js';
import { add, sub, mul, dot, len, norm, dist, spiegel, clamp, smooth, mix } from './mathe.js';
import * as S from './shader.js';
import { formHolen, PROBEN } from './formen.js';

const parameter = new URLSearchParams(location.search);
const istTouch = matchMedia('(pointer: coarse)').matches;

export class App {
  constructor(canvas, oben) {
    this.canvas = canvas;
    this.oben = oben;
    this.ctx = oben.getContext('2d');
    this.z = new Zeichner(canvas);
    this.raum = new Raum();
    this.zeit = 0;
    this.auswahl = new Set(); // Punkt-IDs
    this.nah = null; // Ziel unter dem Zeiger (Maus)
    this.zug = null; // laufender Zug
    this.strich = null; // laufender Strich
    this.linse = null; // Röntgen { x, y, r }
    this.hilfe = null; // Gestenhilfe { x, y, t }
    this.fx = []; // vergängliche Effekte
    this.geschichte = [];
    this.gIndex = -1;
    this.zeitSpulen = null;
    this.seife = parameter.get('seife') !== '0';
    this.ton = null;
    this.einfluss = 0; // Halbmesser des Einflusses (Welt), 0 = aus
    this.halt = null; // ruhender Finger { x, y, p }
    this.groesse = 1;
    this.geister = [];
    this.maulAuf = 0;
    this.pose = null;
    this.letzteFingerZeit = 0;
    this.formLaden(parameter.get('form') || 'kugel');
    this.groesseAnpassen();
    this.einpassen(true);
    addEventListener('resize', () => this.groesseAnpassen());
    this.modusSetzen(parameter.get('layout') || 'raum', true);
  }

  // ---------------- Formen ----------------
  async formHolen(name) {
    const { netz, linien } = await formHolen(name);
    PROBEN.je = [0, 0.5];
    this.netzSetzen(netz);
    this.haut.linien = linien;
    for (const L of linien) this.haut.einbetten(L);
    this.haut.struktur();
    this.groesse = 2;
    this.auswahl.clear();
    this.haut.verformen();
    this.z.netzAktualisieren();
    this.raum._boxStart = false;
    this.raum.boxSetzen(this.netz);
    this.einpassen(true);
    this.geschichte = [];
    this.gIndex = -1;
    this.merken();
    this.formName = name;
  }

  formLaden(name) {
    if (name !== 'kugel' && name) {
      // erst die Kugel, dann die Form (asynchron entpackt)
      this.formLaden('kugel');
      this.formHolen(name).catch((e) => console.error('Form', name, e));
      return;
    }
    if (name === 'kugel' || !this.netz) {
      const netz = kugel(5, 1);
      this.netzSetzen(netz);
      // Mittellinie von Anfang an (Florian, 12.11.)
      const pfad = [];
      for (let i = 0; i < 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        pfad.push([Math.cos(a), Math.sin(a), 0]);
      }
      const L = linieAusPfad('mitte', pfad, [], 4);
      mitteRichten(L);
      this.haut.linien = [L];
      this.haut.einbetten(L);
      this.haut.struktur();
      this.groesse = 2;
    }
    this.haut.verformen();
    this.raum.boxSetzen(this.netz);
    this.raum._boxStart = false;
    this.raum.boxSetzen(this.netz);
    if (this.W) this.einpassen(true);
    this.merken();
  }

  netzSetzen(netz) {
    this.netz = netz;
    this.haut = new Haut(netz);
    this.z.netzSetzen(netz);
    this.vorher = new Float32Array(netz.pos);
  }

  get linien() {
    return this.haut.linien;
  }

  groesseAnpassen() {
    const W = innerWidth, H = innerHeight;
    this.W = W;
    this.H = H;
    this.z.groesse(W, H);
    const dpr = this.z.dpr;
    this.oben.width = W * dpr;
    this.oben.height = H * dpr;
    this.oben.style.width = W + 'px';
    this.oben.style.height = H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------------- Layout ----------------
  modusSetzen(m, sofort) {
    const R = this.raum;
    if (m === 'blatt') {
      R.modus = 'blatt';
      R.falteZiel = 1;
      R.sichten.raum._faltStart = { pos: R.sichten.raum.kamera.position.toArray(), blick: R.sichten.raum.ziel.slice() };
      if (sofort) R.falte = 1;
    } else if (m === 'raum') {
      if (R.modus === 'blatt') {
        R.falteZiel = 0;
        R._zurueck = true;
      }
      R.modus = 'raum';
      if (sofort) R.falte = 0;
    } else if (m === 'seite' || m === 'front' || m === 'top') {
      R.modus = 'blick';
      R.blick = m;
      R.blickT = sofort ? 1 : 0;
      if (!sofort) R.blickAnim = { zu: 1 };
    }
  }

  // ---------------- Geschichte ----------------
  stand() {
    return { linien: this.linien.map(linieKopieren), pos: new Float32Array(this.netz.pos), maul: this.maulAuf, pose: this.pose ? JSON.parse(JSON.stringify(this.pose)) : null };
  }
  merken() {
    this.geschichte = this.geschichte.slice(0, this.gIndex + 1);
    this.geschichte.push(this.stand());
    if (this.geschichte.length > 80) this.geschichte.shift();
    this.gIndex = this.geschichte.length - 1;
  }
  zurueckholen(st) {
    this.haut.linien = st.linien.map(linieKopieren);
    for (const L of this.haut.linien) for (const P of L.punkte) idSetzen(P.id + 1);
    this.maulAuf = st.maul || 0;
    this.pose = st.pose ? JSON.parse(JSON.stringify(st.pose)) : null;
    this.haut.struktur();
    this.auswahl.clear();
    this.verformen(true);
  }
  zurueck() {
    if (this.gIndex <= 0) return this.verweigern();
    const alt = this.geschichte[this.gIndex];
    this.gIndex--;
    this.zurueckholen(this.geschichte[this.gIndex]);
    this.geistZeigen(alt.pos);
    this.klang('zurueck');
  }
  vor() {
    if (this.gIndex >= this.geschichte.length - 1) return this.verweigern();
    const alt = this.geschichte[this.gIndex];
    this.gIndex++;
    this.zurueckholen(this.geschichte[this.gIndex]);
    this.geistZeigen(alt.pos);
    this.klang('vor');
  }
  geistZeigen(pos) {
    this.geister.push({ pos: new Float32Array(pos), t: 0, dauer: 0.7 });
  }

  // ---------------- Verformen ----------------
  verformen(sofort) {
    const t0 = performance.now();
    this.vorher.set(this.netz.pos);
    this.haut.verformen();
    this.poseAnwenden();
    this.seifeAus(sofort);
    this.z.netzAktualisieren();
    this.verformZeit = performance.now() - t0;
  }

  seifeAus(sofort) {
    // Bewegung je Netzpunkt → Seifenhaut
    // Seifenhaut nur dort, wo sich die Haut am stärksten neu findet: Bewegung relativ zur stärksten Bewegung dieses Bilds
    const P = this.netz.pos, B = this.z.bewegt, V = this.vorher;
    if (B && !sofort) {
      const n = this.netz.nV;
      const d = this._dBew && this._dBew.length === n ? this._dBew : (this._dBew = new Float32Array(n));
      let dmax = 0;
      for (let v = 0; v < n; v++) {
        d[v] = Math.hypot(P[3 * v] - V[3 * v], P[3 * v + 1] - V[3 * v + 1], P[3 * v + 2] - V[3 * v + 2]);
        if (d[v] > dmax) dmax = d[v];
      }
      const staerke = Math.min(1, dmax / (0.006 * this.groesse));
      if (dmax > 1e-6) for (let v = 0; v < n; v++) {
        const r = d[v] / dmax;
        B[v] = Math.max(B[v], r * r * r * staerke);
      }
    }
  }

  // Pose: Unterkiefer dreht um das Gelenk hinter den Mundwinkeln (vereinfachter Knochen)
  poseAnwenden() {
    if (!this.pose || this.maulAuf <= 0.001) return;
    const { gelenk, gewicht } = this.pose;
    const a = -this.maulAuf * 0.75;
    const c = Math.cos(a), s = Math.sin(a);
    const P = this.netz.pos;
    for (let v = 0; v < this.netz.nV; v++) {
      const w = gewicht[v];
      if (!w) continue;
      const x = P[3 * v] - gelenk[0], y = P[3 * v + 1] - gelenk[1];
      const xr = x * c - y * s, yr = x * s + y * c;
      P[3 * v] = gelenk[0] + x + (xr - x) * w;
      P[3 * v + 1] = gelenk[1] + y + (yr - y) * w;
    }
    this.netz.normalen();
  }

  // ---------------- Ziele unter dem Finger ----------------
  sichtBei(x, y) {
    const R = this.raum;
    const lay = this.lay;
    if (!lay) return null;
    if (lay.art === 'blatt' || (lay.art === 'blick' && lay.verblassen < 0.98)) {
      for (const n of ['seite', 'front', 'top']) if (R.sichten[n].enthaelt(x, y) && (lay.art === 'blatt' || n === lay.vorn || lay.verblassen < 0.5)) return R.sichten[n];
      if (lay.raum && R.sichten.raum.enthaelt(x, y)) return R.sichten.raum;
      return null;
    }
    if (lay.art === 'blick') return R.sichten[lay.vorn];
    if (lay.art === 'blickRaum' || lay.art === 'raum') {
      // Im Raum: Form zuerst, sonst eine Wand
      const rs = R.sichten.raum;
      const st = rs.strahl(x, y);
      const hit = this.netz.strahl(st.o, st.d);
      if (hit) return rs;
      if (lay.art === 'raum' && lay.falte < 0.01 && this.wandSichten) {
        let best = null;
        for (const w of Object.values(this.wandSichten)) {
          const q = w.wandTreffer(st);
          if (q && (!best || q.t < best.t)) best = { w, t: q.t };
        }
        if (best) return best.w;
      }
      return rs;
    }
    return null;
  }

  // Punkte (mit Spiegelzwillingen) im Bild der Ansicht
  punkteIn(sicht) {
    const out = [];
    for (const L of this.linien) {
      L.punkte.forEach((P, i) => {
        const aufEbene = L.art === 'mitte' || (L.art === 'ring' && (i === 0 || i === L.punkte.length - 1));
        out.push({ L, P, i, sp: false, p: P.p });
        if (!aufEbene) out.push({ L, P, i, sp: true, p: spiegel(P.p) });
      });
    }
    for (const q of out) q.s = sicht.projizieren(q.p);
    return out;
  }

  // Ist ein Weltpunkt in dieser Ansicht von der Haut verdeckt?
  verdeckt(sicht, p, s) {
    const st = sicht.strahl(s[0], s[1]);
    const hit = this.netz.strahl(st.o, st.d);
    if (!hit) return false;
    const tp = (p[0] - st.o[0]) * st.d[0] + (p[1] - st.o[1]) * st.d[1] + (p[2] - st.o[2]) * st.d[2];
    return hit.abst < tp - 0.03 * this.groesse;
  }

  treffer(x, y, opt = {}) {
    const sicht = this.sichtBei(x, y);
    if (!sicht) return { art: 'nichts' };
    const r = opt.radius || (istTouch ? 24 : 11);
    const roentgen = !!this.linse && Math.hypot(x - this.linse.x, y - this.linse.y) < this.linse.r;
    // 1. Griffspitzen der gewählten Punkte
    for (const id of this.auswahl) {
      const q = this.punktMitId(id);
      if (!q) continue;
      for (const w of ['ein', 'aus']) {
        const tipp = add(q.P.p, q.P[w]);
        for (const sp of q.zwilling ? [false, true] : [false]) {
          const pp = sp ? spiegel(tipp) : tipp;
          const s = sicht.projizieren(pp);
          if (Math.hypot(s[0] - x, s[1] - y) < r * 0.9) return { art: 'griff', sicht, L: q.L, P: q.P, welcher: w, sp };
        }
      }
    }
    // 2. Punkte (Blasen-Zeiger: der nächste gewinnt)
    let best = null;
    for (const q of this.punkteIn(sicht)) {
      const d = Math.hypot(q.s[0] - x, q.s[1] - y);
      if (d < r && (!best || d < best.d)) best = { ...q, d };
    }
    if (best && (roentgen || !this.verdeckt(sicht, best.p, best.s))) return { art: 'punkt', sicht, L: best.L, P: best.P, i: best.i, sp: best.sp };
    // 3. Linien
    let bl = null;
    for (const L of this.linien) {
      for (const zug of abtasten(L, 16)) {
        const pts = zug.pts.map((p) => sicht.projizieren(p));
        for (let k = 0; k < pts.length - (zug.zu ? 0 : 1); k++) {
          const a = pts[k], b = pts[(k + 1) % pts.length];
          const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9;
          let t = ((x - a[0]) * dx + (y - a[1]) * dy) / l2;
          t = clamp(t, 0, 1);
          const d = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
          if (d < r * 0.8 && (!bl || d < bl.d)) {
            const s0 = zug.s[k], s1 = zug.s[(k + 1) % pts.length];
            let par = s0 + (s1 - s0) * t;
            if (zug.zu && Math.abs(s1 - s0) > 1.5) par = s0;
            const p3 = zug.pts[k].map((v, i) => v + (zug.pts[(k + 1) % pts.length][i] - v) * t);
            bl = { d, L, par, spiegel: zug.spiegel || par < 0, p: p3, tan: [dx, dy] };
          }
        }
      }
    }
    if (bl && (roentgen || !this.verdeckt(sicht, bl.p, sicht.projizieren(bl.p)))) {
      let par = bl.par;
      const sp = bl.spiegel;
      if (par < 0) par = -par - 1;
      const m = anzahlStuecke(bl.L);
      const s = Math.min(m - 1, Math.floor(par));
      return { art: 'linie', sicht, L: bl.L, s, t: par - s, sp, p: bl.p, tan: bl.tan };
    }
    // 4. Haut (Maul?) oder Leere
    const st = sicht.strahl(x, y);
    const hit = this.netz.strahl(st.o, st.d);
    if (hit) {
      if (this.pose && this.imMaul(hit)) return { art: 'maul', sicht, p: hit.p };
      return { art: 'haut', sicht, p: hit.p, hit };
    }
    return { art: 'leer', sicht };
  }

  imMaul(hit) {
    const T = this.netz.tri;
    const g = this.z.maulAttr;
    const v = [T[3 * hit.t], T[3 * hit.t + 1], T[3 * hit.t + 2]];
    return v.some((i) => g[i] > 0.5);
  }

  punktMitId(id) {
    for (const L of this.linien) {
      const i = L.punkte.findIndex((P) => P.id === id);
      if (i >= 0) {
        const aufEbene = L.art === 'mitte' || (L.art === 'ring' && (i === 0 || i === L.punkte.length - 1));
        return { L, P: L.punkte[i], i, zwilling: !aufEbene };
      }
    }
    return null;
  }

  // alle Punkte, die an einer Kreuzung mit P verbunden sind
  verbunden(P) {
    if (!P.kreuz) return [P];
    const out = [];
    for (const L of this.linien) for (const Q of L.punkte) if (Q.kreuz === P.kreuz) out.push(Q);
    return out;
  }
  aufEbene(P) {
    for (const L of this.linien) {
      const i = L.punkte.indexOf(P);
      if (i < 0) continue;
      if (L.art === 'mitte') return true;
      if (L.art === 'ring' && (i === 0 || i === L.punkte.length - 1)) return true;
    }
    return false;
  }

  // ---------------- Züge ----------------
  zugStart(ziel, x, y) {
    const sicht = ziel.sicht;
    if (ziel.art === 'punkt') {
      if (!this.auswahl.has(ziel.P.id)) {
        this.auswahl.clear();
        this.auswahl.add(ziel.P.id);
      }
      const bewegt = new Map(); // Punkt → Gewicht
      for (const id of this.auswahl) {
        const q = this.punktMitId(id);
        if (q) for (const Q of this.verbunden(q.P)) bewegt.set(Q, 1);
      }
      const p0 = ziel.sp ? spiegel(ziel.P.p) : ziel.P.p.slice();
      this.zug = { art: 'punkt', sicht, ziel, p0, bewegt, start: new Map(), x0: x, y0: y };
      this.einflussAnwenden();
      this.klang('greifen');
    } else if (ziel.art === 'griff') {
      const P = ziel.P;
      this.zug = { art: 'griff', sicht, ziel, ein0: P.ein.slice(), aus0: P.aus.slice(), x0: x, y0: y, brechen: this.brechen() };
    } else if (ziel.art === 'linie') {
      const L = ziel.L, n = L.punkte.length;
      const A = L.punkte[ziel.s], B = L.punkte[(ziel.s + 1) % n];
      this.zug = { art: 'linie', sicht, ziel, A, B, aus0: A.aus.slice(), ein0: B.ein.slice(), Aein0: A.ein.slice(), Baus0: B.aus.slice(), p0: punktAuf(L, ziel.s, ziel.t), x0: x, y0: y, richtung: null, weg: [] };
    } else if (ziel.art === 'maul') {
      this.zug = { art: 'maul', sicht, y0: y, auf0: this.maulAuf };
    }
  }

  brechen() {
    return this.tasten.has('Shift') || !!this.halt;
  }

  // Gewichte des Einflusses (proportional), begrenzt durch den ruhenden Finger
  einflussAnwenden() {
    const z = this.zug;
    if (!z || z.art !== 'punkt') return;
    const R = this.einfluss;
    const mitte = z.ziel.sp ? spiegel(z.ziel.P.p) : z.ziel.P.p;
    const fest = new Set();
    for (const id of this.auswahl) {
      const q = this.punktMitId(id);
      if (q) for (const Q of this.verbunden(q.P)) fest.add(Q);
    }
    const neu = new Map();
    for (const Q of fest) neu.set(Q, 1);
    if (R > 0) {
      for (const L of this.linien) for (const Q of L.punkte) {
        if (fest.has(Q)) continue;
        const p0 = z.start.get(Q) || Q.p;
        const d = Math.min(dist(p0, mitte), dist(spiegel(p0), mitte));
        if (d < R) {
          const u = d / R;
          neu.set(Q, (1 - u * u) * (1 - u * u));
        }
      }
    }
    z.bewegt = neu;
    for (const Q of neu.keys()) if (!z.start.has(Q)) z.start.set(Q, Q.p.slice());
    // Basis neu, ausgehend vom Stand beim Greifen (Punkte zurück auf ihren Start, Netz dazu)
    // Punkte, die nicht mehr im Einfluss liegen, zurück an ihren Start
    for (const [Q, p0] of z.start) if (!neu.has(Q)) Q.p = p0.slice();
    const jetzt = new Map();
    for (const [Q] of neu) { jetzt.set(Q, Q.p.slice()); Q.p = z.start.get(Q).slice(); }
    this.haut.verformen();
    this.poseAnwenden();
    z.basis = this.haut.zugBasis(neu, (P) => this.aufEbene(P));
    for (const [Q, p] of jetzt) Q.p = p;
  }

  zugBewegen(x, y) {
    const z = this.zug;
    if (!z) return;
    const sicht = z.sicht;
    if (z.art === 'punkt') {
      const neu = sicht.inEbene(z.p0, x, y);
      let d = sub(neu, z.p0);
      if (z.ziel.sp) d = spiegel(d);
      for (const [Q, w] of z.bewegt) {
        const s0 = z.start.get(Q);
        const e = this.aufEbene(Q);
        Q.p = [s0[0] + d[0] * w, s0[1] + d[1] * w, e ? 0 : s0[2] + d[2] * w];
      }
      // Mittelebene: Punkt vor dem Durchstoßen anhalten (Spiegelglas zeigt die Grenze)
      for (const [Q] of z.bewegt) if (!this.aufEbene(Q) && Q.p[2] < 0.01 * this.groesse) Q.p[2] = 0.01 * this.groesse;
      this.spiegelNaehe = Math.max(0, 1 - Math.abs(z.ziel.P.p[2]) / (0.25 * this.groesse)) * (this.aufEbene(z.ziel.P) ? 0.35 : 1);
      if (z.basis && !this.pose) {
        // schnell: nur pos = pos0 + G·δ
        this.vorher.set(this.netz.pos);
        z.letztesD = d;
        this.haut.zugAnwenden(z.basis, d);
        this.seifeAus(false);
        this.z.netzAktualisieren();
      } else {
        for (const L of this.linien) {
          ringEndenRichten(L);
          mitteRichten(L);
        }
        this.verformen();
      }
    } else if (z.art === 'griff') {
      const P = z.ziel.P;
      const welcher = z.ziel.welcher, anderer = welcher === 'ein' ? 'aus' : 'ein';
      const tipp0 = add(P.p, welcher === 'ein' ? z.ein0 : z.aus0);
      const tippS = z.ziel.sp ? spiegel(tipp0) : tipp0;
      let neu = sicht.inEbene(tippS, x, y);
      if (z.ziel.sp) neu = spiegel(neu);
      let h = sub(neu, P.p);
      if (this.aufEbeneMitte(P)) h[2] = 0;
      P[welcher] = h;
      if (z.brechen || this.brechen()) {
        P.ecke = true;
        P[anderer] = (anderer === 'ein' ? z.ein0 : z.aus0).slice();
      } else if (!P.ecke) {
        const l = len(anderer === 'ein' ? z.ein0 : z.aus0);
        P[anderer] = mul(norm(h), -l);
      }
      for (const Q of this.verbunden(P)) if (Q !== P && !Q.ecke) { /* andere Linie der Kreuzung bleibt */ }
      for (const L of this.linien) ringEndenRichten(L);
      this.verformen();
    } else if (z.art === 'linie') {
      z.weg.push([x, y]);
      if (!z.richtung) {
        const dx = x - z.x0, dy = y - z.y0;
        if (Math.hypot(dx, dy) < 12) return;
        const t = z.ziel.tan, tl = Math.hypot(t[0], t[1]) || 1;
        const cos = Math.abs((dx * t[0] + dy * t[1]) / (Math.hypot(dx, dy) * tl));
        z.richtung = cos > 0.82 ? 'tusche' : 'biegen';
        if (z.richtung === 'tusche') {
          z.tusche = new Set();
          this.klang('tusche');
        }
      }
      if (z.richtung === 'biegen') {
        const L = z.ziel.L;
        const neu = sicht.inEbene(z.ziel.sp ? spiegel(z.p0) : z.p0, x, y);
        let d = sub(neu, z.ziel.sp ? spiegel(z.p0) : z.p0);
        if (z.ziel.sp) d = spiegel(d);
        const t = z.ziel.t;
        const c1 = 3 * (1 - t) * (1 - t) * t, c2 = 3 * (1 - t) * t * t;
        const k = c1 * c1 + c2 * c2 || 1e-6;
        z.A.aus = add(z.aus0, mul(d, c1 / k));
        z.B.ein = add(z.ein0, mul(d, c2 / k));
        if (L.art === 'mitte') { z.A.aus[2] = 0; z.B.ein[2] = 0; }
        if (!z.A.ecke) z.A.ein = mul(norm(z.A.aus), -len(z.Aein0));
        if (!z.B.ecke) z.B.aus = mul(norm(z.B.ein), -len(z.Baus0));
        ringEndenRichten(L);
        this.verformen();
      } else {
        // Tusche: alle Punkte, an denen der Finger entlangfährt, werden Kante
        const t = this.treffer(x, y, { radius: istTouch ? 30 : 16 });
        if (t.art === 'linie' && t.L === z.ziel.L) {
          const L = t.L, n = L.punkte.length;
          const nahe = t.t < 0.5 ? L.punkte[t.s] : L.punkte[(t.s + 1) % n];
          z.tusche.add(nahe);
          z.tuschePar = t.s + t.t;
        } else if (t.art === 'punkt' && t.L === z.ziel.L) z.tusche.add(t.P);
        if (z.tusche.size === 0) {
          const L = z.ziel.L, n = L.punkte.length;
          z.tusche.add(z.ziel.t < 0.5 ? L.punkte[z.ziel.s] : L.punkte[(z.ziel.s + 1) % n]);
        }
      }
    } else if (z.art === 'maul') {
      const dy = (y - z.y0) / (sicht.pxJeEinheit ? sicht.pxJeEinheit(this.pose.gelenk) : 100);
      this.maulAuf = clamp(z.auf0 + dy * 1.4, 0, 1);
      this.verformen();
    }
  }

  aufEbeneMitte(P) {
    for (const L of this.linien) if (L.art === 'mitte' && L.punkte.includes(P)) return true;
    return false;
  }

  zugEnde() {
    const z = this.zug;
    if (!z) return;
    this.zug = null;
    this.spiegelNaehe = 0;
    if (z.art === 'punkt') {
      for (const L of this.linien) { ringEndenRichten(L); mitteRichten(L); }
      this.verformen(true);
    }
    if (z.art === 'linie' && z.richtung === 'tusche') {
      let n = 0;
      for (const Q of z.tusche) for (const R of this.verbunden(Q)) { if (!R.kante) n++; R.kante = true; }
      this.fx.push({ art: 'tusche', L: z.ziel.L, t: 0, dauer: 0.6 });
      if (n) this.klang('kante');
      this.verformen(true);
    }
    if (z.art === 'linie' && !z.richtung) return; // nur angetippt
    this.wackeln();
    this.merken();
    this.raum.boxSetzen(this.netz);
  }

  wackeln() {
    this.fx.push({ art: 'wackeln', t: 0, dauer: 0.5 });
  }

  // ---------------- Tippen ----------------
  tippen(ziel, anzahl, x, y) {
    if (ziel.art === 'punkt') {
      if (anzahl >= 3) {
        for (const L of this.linien) for (const P of L.punkte) this.auswahl.add(P.id);
      } else if (anzahl === 2) {
        this.auswahl.clear();
        for (const P of ziel.L.punkte) this.auswahl.add(P.id);
        this.fx.push({ art: 'loopLicht', L: ziel.L, t: 0, dauer: 0.5 });
      } else {
        this.auswahl.clear();
        this.auswahl.add(ziel.P.id);
      }
      this.klang('wahl');
    } else if (ziel.art === 'linie') {
      if (anzahl >= 2) {
        this.auswahl.clear();
        for (const P of ziel.L.punkte) this.auswahl.add(P.id);
        this.fx.push({ art: 'loopLicht', L: ziel.L, t: 0, dauer: 0.5 });
        // der beim ersten Tippen gesetzte Punkt bleibt nicht
        if (this._letzterNeuer && this._letzterNeuer.L === ziel.L) {
          const i = ziel.L.punkte.indexOf(this._letzterNeuer.P);
          if (i >= 0 && punktLoeschen(ziel.L, i)) { this.haut.einbetten(ziel.L); this.haut.struktur(); this.verformen(true); this.geschichte.pop(); this.gIndex = this.geschichte.length - 1; }
        }
        return;
      }
      // Punkt einsetzen, wo getippt wurde (Form bleibt gleich)
      const P = punktEinsetzen(ziel.L, ziel.s, ziel.t);
      if (ziel.L.art === 'mitte') { P.p[2] = 0; P.ein[2] = 0; P.aus[2] = 0; }
      this.haut.einbetten(ziel.L);
      this.haut.struktur();
      this.verformen(true);
      this.auswahl.clear();
      this.auswahl.add(P.id);
      this._letzterNeuer = { L: ziel.L, P };
      this.fx.push({ art: 'plopp', p: ziel.sp ? spiegel(P.p) : P.p, t: 0, dauer: 0.45 });
      this.klang('punkt');
      this.merken();
    } else if (ziel.art === 'leer' || ziel.art === 'haut') {
      if (anzahl >= 2 && ziel.art === 'leer') {
        // Doppeltippen ins Leere: Ansicht einpassen
        this.einpassen();
        return;
      }
      this.auswahl.clear();
    }
  }

  // Abstand der Kamera, bei dem der ganze Raum ins Bild passt
  passAbstand() {
    const b = this.raum.box;
    const r = Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) / 2;
    const rs = this.raum.sichten.raum;
    const fov = (rs.fov * Math.PI) / 180;
    const asp = Math.min(1, this.W / this.H);
    return (r * 1.02) / Math.sin((fov / 2) * Math.max(0.62, asp));
  }

  einpassen(sofort) {
    const R = this.raum;
    R.blattZoom = 1;
    R.blattVersatz = [0, 0];
    R.blickZoom = 1;
    R.blickVersatz = [0, 0];
    const rs = R.sichten.raum;
    const b = R.box;
    rs.ziel = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2 - (b.max[1] - b.min[1]) * 0.04, 0];
    if (sofort) { rs.abstand = this.passAbstand(); return; }
    this.kamFahrt = { ab: this.passAbstand(), t: 0 };
  }

  // ---------------- Striche: Schnitt, Form, Kritzeln ----------------
  strichStart(ziel, x, y) {
    this.strich = { sicht: ziel.sicht, pts: [[x, y]], start: ziel.art, vorschau: null, art: null, t0: performance.now() };
  }
  strichWeiter(x, y) {
    const s = this.strich;
    if (!s) return;
    const l = s.pts[s.pts.length - 1];
    if (Math.hypot(x - l[0], y - l[1]) < 2) return;
    s.pts.push([x, y]);
    s.art = this.strichArt(s);
    // Vorschau
    if (s.art === 'schnitt') {
      const sicht = this.ortho(s.sicht);
      const pts = this.strichIn(s.sicht, sicht, s.pts);
      if (performance.now() - (s.letzteVorschau || 0) > 40) {
        s.letzteVorschau = performance.now();
        s.vorschau = schnittPfade(this.netz, sicht, pts, this.groesse);
      }
    } else if (s.art === 'form') {
      s.vorschau = null;
    } else s.vorschau = null;
  }

  // Wände: Striche in Bildpunkte der Wandansicht umrechnen
  ortho(sicht) {
    return sicht.wand ? sicht.wand : sicht;
  }
  strichIn(sicht, ziel, pts) {
    if (!sicht.wand) return pts;
    return pts.map((p) => sicht.inWand(p[0], p[1])).filter(Boolean);
  }

  strichArt(s) {
    const P = s.pts;
    if (P.length < 4) return null;
    // Kritzeln: viele Kehren auf kleinem Raum
    let kehren = 0, weg = 0;
    let letzte = null;
    for (let i = 2; i < P.length; i++) {
      const a = [P[i - 1][0] - P[i - 2][0], P[i - 1][1] - P[i - 2][1]], b = [P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]];
      weg += Math.hypot(b[0], b[1]);
      const la = Math.hypot(...a), lb = Math.hypot(...b);
      if (la < 1.5 || lb < 1.5) continue;
      const c = (a[0] * b[0] + a[1] * b[1]) / (la * lb);
      if (c < -0.35 && (!letzte || i - letzte > 2)) { kehren++; letzte = i; }
    }
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (const p of P) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
    const diag = Math.hypot(maxx - minx, maxy - miny);
    if (kehren >= 3 && weg > diag * 2.2) return 'kritzeln';
    const sicht = this.ortho(s.sicht);
    const pts = this.strichIn(s.sicht, sicht, P);
    if (pts.length < 2) return null;
    const a = pts[0], e = pts[pts.length - 1];
    const startDrin = !!trifftKoerper(this.netz, sicht, a[0], a[1]);
    const endeDrin = !!trifftKoerper(this.netz, sicht, e[0], e[1]);
    const zu = Math.hypot(e[0] - a[0], e[1] - a[1]) < Math.max(26, diag * 0.18) && weg > 80;
    if (startDrin && zu) return 'form';
    if (startDrin) return 'formOffen';
    if (!startDrin && !endeDrin) return 'schnitt';
    return 'schnittOffen';
  }

  strichEnde() {
    const s = this.strich;
    this.strich = null;
    if (!s) return;
    const art = this.strichArt(s);
    const sicht = this.ortho(s.sicht);
    const pts = this.strichIn(s.sicht, sicht, s.pts);
    if (art === 'kritzeln') return this.kritzeln(s);
    if (art === 'schnitt') {
      const pfade = schnittPfade(this.netz, sicht, pts, this.groesse);
      if (!pfade.length) return this.verdunsten(s);
      let neu = 0;
      for (const pf of pfade) {
        if (pf.art === 'mitte') continue;
        const { L, geaendert } = linieAnlegen(pf.art, pf.pfad, this.linien, this.groesse);
        this.linien.push(L);
        for (const G of geaendert) this.haut.einbetten(G);
        this.haut.einbetten(L);
        this.fx.push({ art: 'ring', L, t: 0, dauer: 0.9 });
        neu++;
      }
      if (!neu) return this.verdunsten(s);
      this.haut.struktur();
      this.verformen(true);
      this.klang('schnitt');
      this.merken();
      return;
    }
    if (art === 'form') {
      const e = formPfad(this.netz, sicht, pts, this.groesse);
      if (!e || e.art === 'mitte') return this.verdunsten(s);
      const { L, geaendert } = linieAnlegen(e.art, e.pfad, this.linien, this.groesse);
      this.linien.push(L);
      for (const G of geaendert) this.haut.einbetten(G);
      this.haut.einbetten(L);
      this.haut.struktur();
      this.verformen(true);
      this.fx.push({ art: 'formLicht', L, t: 0, dauer: 0.8 });
      this.klang('form');
      this.merken();
      // Eine Form vorn am Kopf, die über die Mitte geht, wird das Maul
      if (e.art === 'ring' && !this.pose) this.maulVersuchen(L);
      return;
    }
    this.verdunsten(s);
  }

  verdunsten(s) {
    this.fx.push({ art: 'verdunsten', pts: s.pts.slice(), t: 0, dauer: 0.5 });
  }

  // Kritzeln nimmt eine Schicht weg: Kante → weich → Linie weg; Punkt weg
  kritzeln(s) {
    const P = s.pts;
    const mx = P.reduce((a, p) => a + p[0], 0) / P.length, my = P.reduce((a, p) => a + p[1], 0) / P.length;
    const t = this.treffer(mx, my, { radius: 40 });
    this.fx.push({ art: 'krumen', pts: P.slice(), t: 0, dauer: 0.6 });
    if (t.art === 'punkt') {
      const L = t.L;
      if (t.P.kreuz || (L.art === 'ring' && (t.i === 0 || t.i === L.punkte.length - 1))) return this.verweigern(t.P);
      if (t.P.ecke) {
        t.P.ecke = false;
        glaetten(t.P, 'aus');
      } else if (t.P.kante) {
        for (const R of this.verbunden(t.P)) R.kante = false;
      } else if (!punktLoeschen(L, t.i)) return this.verweigern(t.P);
      this.auswahl.delete(t.P.id);
      this.haut.einbetten(L);
      this.haut.struktur();
      this.verformen(true);
      this.klang('weg');
      this.merken();
      return;
    }
    if (t.art === 'linie') {
      const L = t.L;
      const kanten = L.punkte.filter((Q) => Q.kante);
      if (kanten.length) {
        for (const Q of kanten) for (const R of this.verbunden(Q)) R.kante = false;
      } else {
        if (L.art === 'mitte') return this.verweigern();
        // Linie weg; Kreuzungspunkte der anderen Linien bleiben als gewöhnliche Punkte
        const ids = new Set(L.punkte.map((Q) => Q.kreuz).filter(Boolean));
        this.haut.linien = this.linien.filter((x) => x !== L);
        for (const M of this.linien) for (const Q of M.punkte) if (ids.has(Q.kreuz) && this.verbunden(Q).length < 2) Q.kreuz = 0;
        if (L.maul) { this.pose = null; this.maulAuf = 0; this.z.maulAttr.fill(0); }
      }
      this.auswahl.clear();
      this.haut.struktur();
      this.verformen(true);
      this.klang('weg');
      this.merken();
      return;
    }
    this.verweigern();
  }

  verweigern(P) {
    this.fx.push({ art: 'nein', P, t: 0, dauer: 0.45 });
    this.klang('nein');
  }

  // ---------------- Maul und Pose ----------------
  maulVersuchen(L) {
    // vorn am Körper (kleinstes x des Körpers in der Nähe), schmale Form → Maul
    const pts = abtasten(L, 12)[0].pts;
    let minx = Infinity;
    for (let i = 0; i < this.netz.pos.length; i += 3) minx = Math.min(minx, this.netz.pos[i]);
    const mx = pts.reduce((a, p) => Math.min(a, p[0]), Infinity);
    const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
    const hoehe = Math.max(...ys) - Math.min(...ys), laenge = Math.max(...xs) - Math.min(...xs);
    if (mx - minx > 0.25 * this.groesse || hoehe > laenge * 0.9) return;
    L.maul = true;
    this.poseAnlegen(L);
  }

  poseAnlegen(L) {
    const pts = abtasten(L, 16)[0].pts;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const ymitte = (Math.max(...ys) + Math.min(...ys)) / 2;
    const xhinten = Math.max(...xs);
    const xvorn = Math.min(...xs);
    const gelenk = [xhinten + (xhinten - xvorn) * 0.35, ymitte, 0];
    const V = this.netz.nV, P = this.netz.pos;
    const gewicht = new Float32Array(V);
    const maul = this.z.maulAttr;
    // Unterkiefer: unter der Maullinie, vor dem Gelenk; weich auslaufend
    const tief = (xhinten - xvorn) * 1.2;
    for (let v = 0; v < V; v++) {
      const x = P[3 * v], y = P[3 * v + 1];
      const unter = smooth(0.0, -0.06 * this.groesse, y - ymitte) * 0 + (y < ymitte ? 1 : 0);
      const vor = smooth(gelenk[0] + 0.1, gelenk[0] - 0.25 * (gelenk[0] - xvorn), x);
      const nah = 1 - smooth(tief * 0.6, tief * 1.4, ymitte - y);
      gewicht[v] = unter * vor * nah;
    }
    // Inneres des Mauls: Haut innerhalb der Maulform (in der Seitenansicht, vorn)
    const halbH = (Math.max(...ys) - Math.min(...ys)) / 2;
    for (let v = 0; v < V; v++) {
      const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
      const imX = x < xhinten && x > xvorn - 0.05;
      const imY = Math.abs(y - ymitte) < halbH * 0.55 * (1 - Math.pow((x - xvorn) / (xhinten - xvorn + 1e-6), 2) * 0.4);
      maul[v] = imX && imY && Math.abs(z) < 0.6 * this.groesse ? 1 : 0;
    }
    this.pose = { gelenk, gewicht: Array.from(gewicht) };
    this.pose.gewicht = gewicht;
    this.z.netzAktualisieren();
  }

  // ---------------- Kamera ----------------
  drehen(dx, dy) {
    const R = this.raum;
    const rs = R.sichten.raum;
    rs.azimut -= dx * 0.008;
    rs.hoehe = clamp(rs.hoehe + dy * 0.006, -1.45, 1.45);
    this.einrastenPruefen(false);
  }

  einrastenPruefen(loslassen) {
    const rs = this.raum.sichten.raum;
    // nächste Achse: Seite (az 0 / π), Front (az −π/2 / π/2), Top (hoehe ±π/2)
    const az = ((rs.azimut % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    const kand = [
      { n: 'seite', az: 0, h: 0, hinten: false },
      { n: 'seite', az: Math.PI, h: 0, hinten: true },
      { n: 'front', az: -Math.PI / 2, h: 0, hinten: false },
      { n: 'front', az: Math.PI / 2, h: 0, hinten: true },
    ];
    let best = null;
    for (const k of kand) {
      let d = Math.abs(az - k.az);
      d = Math.min(d, 2 * Math.PI - d);
      const e = Math.hypot(d, rs.hoehe - k.h);
      if (!best || e < best.e) best = { ...k, e };
    }
    if (Math.abs(rs.hoehe) > 1.2) best = { n: 'top', az: rs.azimut, h: Math.sign(rs.hoehe) * Math.PI / 2, hinten: rs.hoehe < 0, e: Math.PI / 2 - Math.abs(rs.hoehe) };
    this.achsNaehe = best && best.e < 0.16 ? 1 - best.e / 0.16 : 0;
    if (loslassen && best && best.e < 0.16) {
      // einrasten: zur Achse fahren, dann wird die Form zu ihrem Schatten (Blick)
      this.kamFahrt = { zielAz: unwrap(rs.azimut, best.az), zielH: best.h * 0.999, t: 0, dann: () => this.zuBlick(best) };
      this.klang('rasten');
    }
  }

  zuBlick(achse) {
    const R = this.raum;
    R.modus = 'blick';
    R.blick = achse.n;
    R.blickT = 1;
    R.sichten[achse.n].hinten = !!achse.hinten;
    R.blickZoom = 1;
    R.blickVersatz = [0, 0];
    this.fx.push({ art: 'druck', t: 0, dauer: 0.5 });
  }

  // aus dem Blick zurück in den Raum (zwei Finger drehen)
  ausBlick() {
    const R = this.raum;
    const n = R.blick;
    const rs = R.sichten.raum;
    const h = R.sichten[n].hinten;
    if (n === 'seite') { rs.azimut = h ? Math.PI : 0; rs.hoehe = 0; }
    if (n === 'front') { rs.azimut = h ? Math.PI / 2 : -Math.PI / 2; rs.hoehe = 0; }
    if (n === 'top') { rs.hoehe = h ? -1.5 : 1.5; }
    R.modus = 'raum';
    R.falte = 0;
    R.falteZiel = 0;
    for (const k of ['seite', 'front', 'top']) R.sichten[k].hinten = false;
  }

  zoomen(f, x, y) {
    const R = this.raum;
    const lay = this.lay;
    if (lay.art === 'raum' || lay.art === 'blickRaum') {
      const rs = R.sichten.raum;
      rs.abstand = clamp(rs.abstand / f, 1.5 * this.groesse, 30 * this.groesse);
      // weit heraus: der Raum faltet sich auf
      if (rs.abstand > 12 * this.groesse && R.modus === 'raum' && R.falte === 0) {
        rs.abstand = 7.5 * this.groesse / 2 * 1.6;
        this.modusSetzen('blatt');
        this.klang('falten');
      }
      return;
    }
    if (lay.art === 'blatt') {
      // Zoom um den Finger; in eine Ansicht hinein → Blick
      const alt = R.blattZoom;
      R.blattZoom = clamp(R.blattZoom * f, 0.5, 3.5);
      const k = R.blattZoom / alt;
      R.blattVersatz[0] = (R.blattVersatz[0] - (x - this.W / 2)) * k + (x - this.W / 2);
      R.blattVersatz[1] = (R.blattVersatz[1] - (y - this.H / 2)) * k + (y - this.H / 2);
      if (R.blattZoom > 1.6) {
        const s = this.sichtBei(x, y);
        if (s) {
          R.blattZoom = 1;
          R.blattVersatz = [0, 0];
          if (s.art === 'raum') {
            this.modusSetzen('raum');
          } else {
            R.blick = s.name;
            R.modus = 'blick';
            R.blickT = 0.35;
            R.blickAnim = { zu: 1 };
          }
          this.klang('falten');
        }
      }
      if (R.blattZoom < 0.7) { R.blattZoom = 1; R.blattVersatz = [0, 0]; }
      return;
    }
    if (lay.art === 'blick') {
      R.blickZoom = clamp(R.blickZoom * f, 0.4, 8);
      const s = R.sichten[R.blick];
      // Zoom um den Finger: Weltpunkt unter dem Finger bleibt
      const vorher = s.inEbene([0, 0, 0], x, y);
      s.zoom *= f;
      s.aktualisieren();
      const nachher = s.inEbene([0, 0, 0], x, y);
      const u = s.achse.u, v = s.achse.v;
      const d = sub(vorher, nachher);
      R.blickVersatz[0] += dot(d, u) * (s.name === 'front' ? 0 : 1) + (s.name === 'front' ? 0 : 0);
      R.blickVersatz[1] += dot(d, v);
      if (R.blickZoom < 0.62) {
        // herausgezoomt: zurück ins Blatt
        R.blickZoom = 1;
        R.blickVersatz = [0, 0];
        R.blickAnim = { zu: 0, fertig: () => { R.modus = 'blatt'; R.falte = 1; R.falteZiel = 1; } };
        this.klang('falten');
      }
    }
  }

  schwenken(dx, dy) {
    const R = this.raum;
    if (this.lay.art === 'blatt') {
      R.blattVersatz[0] += dx;
      R.blattVersatz[1] += dy;
    } else if (this.lay.art === 'blick') {
      const s = R.sichten[R.blick];
      R.blickVersatz[0] -= dx / s.zoom * (s.name === 'front' ? 0 : 1);
      R.blickVersatz[1] += dy / s.zoom;
    }
  }

  // ---------------- Zeit ----------------
  spulenStart() {
    this.zeitSpulen = { i0: this.gIndex, x: 0 };
    this.klang('zeit');
  }
  spulen(dx) {
    const z = this.zeitSpulen;
    if (!z) return;
    z.x += dx;
    const schritte = Math.round(z.x / 28);
    const ziel = clamp(z.i0 + schritte, 0, this.geschichte.length - 1);
    if (ziel !== this.gIndex) {
      const alt = this.geschichte[this.gIndex];
      this.gIndex = ziel;
      this.zurueckholen(this.geschichte[ziel]);
      this.geistZeigen(alt.pos);
      this.klang('tick');
    }
  }
  spulenEnde() {
    this.zeitSpulen = null;
  }

  // ---------------- Röntgen und Hilfe ----------------
  haltenStart(ziel, x, y) {
    if (ziel.art === 'leer' || ziel.art === 'nichts') {
      this.hilfe = { x, y, t: 0, sicht: ziel.sicht };
      this.klang('hilfe');
    } else {
      this.linse = { x, y, r: 0, ziel: istTouch ? 92 : 80 };
      this.klang('roentgen');
    }
  }
  haltenBewegen(x, y) {
    if (this.linse) { this.linse.x = x; this.linse.y = y; }
    if (this.hilfe) { this.hilfe.x = x; this.hilfe.y = y; }
  }
  haltenEnde() {
    if (this.linse) this.linse.zu = true;
    this.hilfe = null;
  }

  // ---------------- Ton (nur als Zusatz, standardmäßig aus) ----------------
  klang(art) {
    if (!this.ton) return;
    try { this.ton.spielen(art); } catch (e) { /* stumm */ }
  }
}

function unwrap(von, zu) {
  let d = zu - von;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return von + d;
}

export { THREE, OrthoSicht, Netz, S };
