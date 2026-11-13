// Die Werkstatt: gemeinsame Grundlage der drei Vollbild-Prototypen (Bullaugen, Modellblatt, Drei Platten).
// Sie erbt die ganze Bearbeitung aus Runde 1 (Haut, Linien, Züge, Striche, Kritzeln, Pose, Geschichte) und ersetzt Raum,
// Faltung und Fingergrammatik durch: ein Layout je Seite, Maus zuerst, Klicks wie im Editor.
// Ein Layout liefert: layoutAnfang, sichtBei, layoutTreffer, schrittLayout, zeichnen, obenLayout, drehen/drehenEnde,
// zoomen, schwenken, trackpad, einpassen, ansichtTaste, kameraMerken/kameraZurueck, drehbuecher.

import { App } from '../bild.js';
import { THREE } from '../zeichner.js';
import '../werkzeuge.js';
import { punktEinsetzen, glaetten, ringEndenRichten, mitteRichten } from '../linien.js';
import { spiegel } from '../mathe.js';
import { geistAnbinden } from './geist.js';

export const DUNKEL = { strich: 'rgba(230,220,255,0.75)', schnitt: '#d4b3f5', form: '#936ffb', kritzeln: '#ff72a9', krumen: ['#ff72a9', '#d4b3f5'], verdunsten: '#e6ddf4', ring: 'rgba(212,179,245,0.9)' };
export const HELL = { strich: 'rgba(0,63,78,0.55)', schnitt: '#6b4fd8', form: '#003f4e', kritzeln: '#e8327f', krumen: ['#e8327f', '#6b4fd8'], verdunsten: '#7a6f8f', ring: 'rgba(0,63,78,0.8)' };

export class Werkstatt extends App {
  constructor(canvas, oben) {
    super(canvas, oben);
    this.bereit = true;
    this.nahZiel = null;
    this.farben = DUNKEL;
    this.vorfuehrung = false;
    this.z.skala = this.z.dpr;
    addEventListener('resize', () => { this.z.skala = this.z.dpr; });
    this.layoutAnfang();
    this.einpassen(true);
  }

  // Raum und Faltung gibt es hier nicht
  modusSetzen() {}
  layoutAnfang() {}
  layoutTreffer() { return null; }
  layoutKlick() {}
  layoutZugStart() {}
  layoutZugBewegen() {}
  layoutZugEnde() {}
  schwebenLayout() {}
  schrittLayout() {}
  obenLayout() {}
  obenLayoutUnten() {}
  ansichtTaste() {}
  drehenEnde() {}
  trackpad(dx, dy, x, y) { this.drehen(dx, dy); }
  drehbuecher() { return {}; }

  // ---------------- Klicks (wie im Editor: Doppelklick auf eine Linie setzt einen Punkt, auf einen Punkt Ecke ↔ glatt) ----------------
  klick(ziel, n, x, y, mod = {}) {
    const a = ziel.art;
    if (a === 'punkt' || a === 'griff') {
      if (n >= 2) return this.eckeUmschalten(ziel.P, ziel.sp);
      if (mod.shift) {
        if (this.auswahl.has(ziel.P.id)) this.auswahl.delete(ziel.P.id);
        else this.auswahl.add(ziel.P.id);
      } else {
        this.auswahl.clear();
        this.auswahl.add(ziel.P.id);
      }
      this.klang('wahl');
      return;
    }
    if (a === 'linie') {
      if (n >= 2) {
        const P = punktEinsetzen(ziel.L, ziel.s, ziel.t);
        if (ziel.L.art === 'mitte') { P.p[2] = 0; P.ein[2] = 0; P.aus[2] = 0; }
        this.haut.einbetten(ziel.L);
        this.haut.struktur();
        this.verformen(true);
        this.auswahl.clear();
        this.auswahl.add(P.id);
        this.fx.push({ art: 'plopp', p: ziel.sp ? spiegel(P.p) : P.p, t: 0, dauer: 0.45 });
        this.klang('punkt');
        this.merken();
        return;
      }
      if (!mod.shift) this.auswahl.clear();
      for (const P of ziel.L.punkte) this.auswahl.add(P.id);
      this.fx.push({ art: 'loopLicht', L: ziel.L, t: 0, dauer: 0.5 });
      this.klang('wahl');
      return;
    }
    if (a === 'maul') return;
    if (n >= 2) return this.einpassen();
    if (!mod.shift) this.auswahl.clear();
  }

  eckeUmschalten(P, sp) {
    if (P.ecke) {
      P.ecke = false;
      glaetten(P, 'aus');
    } else P.ecke = true;
    for (const L of this.linien) { ringEndenRichten(L); mitteRichten(L); }
    this.verformen(true);
    this.auswahl.clear();
    this.auswahl.add(P.id);
    this.fx.push({ art: P.ecke ? 'eckeAn' : 'eckeAus', p: sp ? spiegel(P.p) : P.p, t: 0, dauer: 0.5 });
    this.klang('kante');
    this.merken();
  }

  // enge Grenzen des Netzes (ohne Rand)
  grenzen() {
    const P = this.netz.pos;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < P.length; i += 9) for (let k = 0; k < 3; k++) {
      if (P[i + k] < min[k]) min[k] = P[i + k];
      if (P[i + k] > max[k]) max[k] = P[i + k];
    }
    return { min, max, mitte: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, 0], ausd: Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) };
  }
  allesWaehlen() {
    for (const L of this.linien) for (const P of L.punkte) this.auswahl.add(P.id);
  }

  // ---------------- Schweben (Maus ohne Taste) ----------------
  schweben(x, y) {
    const t = this.layoutTreffer(x, y) || this.treffer(x, y);
    this.nahZiel = t;
    this.nah = t.art === 'punkt' || t.art === 'linie' || t.art === 'griff' ? t : null;
    if (this.linse) this.haltenBewegen(x, y);
    this.schwebenLayout(x, y, t);
  }

  // ---------------- Vorführung: Stand merken und zurückholen ----------------
  standMerken() {
    return { g: this.gIndex, n: this.geschichte.length, auswahl: [...this.auswahl], kam: this.kameraMerken ? this.kameraMerken() : null };
  }
  standZurueck(st) {
    this.zug = null;
    this.strich = null;
    this.einfluss = 0;
    if (this.gIndex !== st.g || this.geschichte.length !== st.n) {
      const alt = new Float32Array(this.netz.pos);
      this.zurueckholen(this.geschichte[st.g]);
      this.geschichte.length = st.g + 1;
      this.gIndex = st.g;
      this.geistZeigen(alt);
    }
    this.auswahl = new Set(st.auswahl);
    if (this.kameraZurueck && st.kam) this.kameraZurueck(st.kam);
  }

  // ---------------- Bildschleife ----------------
  start() {
    const f = geistAnbinden(this, this.drehbuecher());
    this.letzt = performance.now();
    if (f.film) return;
    const schleife = (t) => {
      if (this.geistTakt) this.geistTakt(t);
      this.bild(t);
      requestAnimationFrame(schleife);
    };
    requestAnimationFrame(schleife);
  }

  bild(tJetzt) {
    const dt = Math.min(0.05, Math.max(0, (tJetzt - this.letzt) / 1000));
    this.letzt = tJetzt;
    this._dt = dt;
    this.zeit += dt;
    if (this.eingabeTakt) this.eingabeTakt();
    this.schrittLayout(dt);
    this.schrittGemeinsam(dt);
    const r = this.z.r;
    r.setScissorTest(false);
    r.setRenderTarget(null);
    this.zeichnen();
    this.obenZeichnenW();
  }

  schrittGemeinsam(dt) {
    const z = this.z;
    z.U.uZeit.value = this.zeit;
    z.U.uSeife.value = this.seife ? 1 : 0;
    const B = z.bewegt;
    if (B) {
      const k = Math.exp(-dt / 0.32);
      let summe = 0;
      for (let v = 0; v < B.length; v++) { B[v] *= k; summe += B[v]; }
      if (summe > 0.01) { z.koerper.geometry.attributes.bewegt.needsUpdate = true; z.netzVersion = (z.netzVersion || 0) + 1; }
    }
    if (this.linse) {
      const L = this.linse;
      if (L.zu) { L.r -= dt * 900; if (L.r <= 0) this.linse = null; }
      else L.r = Math.min(L.ziel, L.r + dt * 700);
    }
    z.U.uLinse.value.set(this.linse ? this.linse.x * z.dpr : 0, this.linse ? (this.H - this.linse.y) * z.dpr : 0, this.linse ? this.linse.r * z.dpr : 0);
    if (this.zug && this.zug.art === 'punkt' && this.einfluss > 0) {
      const p = this.zug.ziel.sp ? spiegel(this.zug.ziel.P.p) : this.zug.ziel.P.p;
      z.U.uEinfluss.value.set(p[0], p[1], p[2], this.einfluss);
    } else z.U.uEinfluss.value.set(0, 0, 0, 0);
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.dauer);
    for (const g of this.geister) g.t += dt;
    this.geister = this.geister.filter((g) => g.t < g.dauer);
    if (!this.zug && !this.strich) this.raum.boxSetzen(this.netz);
    this.anzeigeBauen();
    this.anzeigeSetzen();
    this.wackelSkala();
  }

  // Taschenlampe der Punkte: an (Bildpunkte, Halbmesser) oder aus
  lampe(an, r = 170) {
    const u = this.z.punktMat.uniforms.uLampe.value;
    if (!an || !this.maus.drin) return u.set(0, 0, 0);
    const d = this.z.dpr;
    u.set(this.maus.x * d, (this.H - this.maus.y) * d, r * d);
  }

  // 3D (Jelly, Linien, Punkte) in ein Rechteck des Bildschirms oder in ein Renderziel
  jellyZeichnen(kam, rect, opt = {}) {
    const z = this.z, r = z.r;
    const a = opt.wackeln === false ? 0 : this.wackel || 0;
    z.koerper.scale.set(1 - a * 0.5, 1 + a, 1 - a * 0.5);
    z.jelly.uniforms.uDurchsicht.value = opt.durchsicht ?? 1;
    if (opt.ziel) {
      r.setRenderTarget(opt.ziel);
      r.setClearColor(opt.grund || new THREE.Color(0x081b25), opt.alpha ?? 1);
      r.clear(true, true, true);
      z.U.uAufl.value.set(opt.ziel.width, opt.ziel.height);
      z.koerper.material = z.jelly;
      z.jelly.uniforms.uKamera.value.copy(kam.position);
      z.breiten(1.7);
      r.render(z.szeneKoerper, kam);
      z.linienFarben('jelly');
      r.render(z.szeneLinien, kam);
    } else {
      z.raum(kam, rect, { klar: false, strahlen: !!opt.strahlen, glas: this.spiegelNaehe > 0.01, geister: this.geisterZeichner() });
    }
    z.koerper.scale.set(1, 1, 1);
    z.jelly.uniforms.uDurchsicht.value = 1;
  }

  // ---------------- Überlagerung ----------------
  obenZeichnenW() {
    const c = this.ctx;
    c.clearRect(0, 0, this.W, this.H);
    this.obenLayoutUnten(c);
    this.strichZeichnen(c);
    this.fxZeichnen(c);
    if (this.linse && this.linse.r > 2) {
      c.save();
      c.strokeStyle = this.farben.ring;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(this.linse.x, this.linse.y, this.linse.r, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    this.obenLayout(c);
    if (this.geistZeichnen) this.geistZeichnen(c, this._dt || 0.016);
    const nein = this.fx.find((f) => f.art === 'nein' && !f.P);
    this.canvas.style.transform = nein ? `translateX(${Math.sin((nein.t / nein.dauer) * Math.PI * 6) * (1 - nein.t / nein.dauer) * 9}px)` : '';
  }

  strichZeichnen(c) {
    const s = this.strich;
    if (!s) return;
    const F = this.farben;
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const art = s.art;
    c.strokeStyle = art === 'kritzeln' ? F.kritzeln : art === 'schnitt' ? F.schnitt : art === 'form' ? F.form : F.strich;
    c.lineWidth = art === 'kritzeln' ? 5 : 2.2;
    if (art === 'kritzeln') { c.shadowColor = F.kritzeln; c.shadowBlur = 12; }
    c.beginPath();
    s.pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.stroke();
    if (art === 'form' || art === 'formOffen') {
      const a = s.pts[0], e = s.pts[s.pts.length - 1];
      const d = Math.hypot(e[0] - a[0], e[1] - a[1]);
      if (d < 60) {
        c.globalAlpha = 1 - d / 60;
        c.fillStyle = F.form;
        c.beginPath();
        c.arc(a[0], a[1], 6 + (1 - d / 60) * 8, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
  }

  fxZeichnen(c) {
    const F = this.farben;
    for (const f of this.fx) {
      const t = f.t / f.dauer;
      if (f.art === 'verdunsten') {
        c.save();
        c.globalAlpha = (1 - t) * 0.7;
        c.strokeStyle = F.verdunsten;
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
          c.fillStyle = r > 0.5 ? F.krumen[0] : F.krumen[1];
          c.beginPath();
          c.arc(p[0] + (r - 0.5) * 30 * t, p[1] + t * t * 60 * (0.5 + r), 2.4 * (1 - t), 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      } else if (f.art === 'stiftBereit') {
        c.save();
        c.globalAlpha = 1 - t;
        c.strokeStyle = F.schnitt;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(f.x, f.y, 10 + t * 26, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
    }
  }
}

export { THREE };
