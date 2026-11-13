// Runde 4: die Ecke (Florians Vision, Plan: docs/look/editor/vision/PLAN-4.md).
// Drei Ansichten sind echte Ansichten des Wesens: Cyan = Seite, Magenta = Front, Gelb = Top. Jede hat einen Projektor, der das
// Wesen sieht und seinen Umriss als Druckfarbe auf eine Tafel wirft (multipliziert, wie Farbe auf Papier).
//   Raum drehen (Tab aus): Die Tafeln liegen auf den unsichtbaren Wänden hinter dem Wesen, ihre Projektoren schauen genau
//     von der Seite, von vorn und von oben. Das Wesen ist ein Drahtmodell (Kurvennetz, Umriss, Transparentpapier).
//   Wesen drehen (Tab an): Licht und Fliese bleiben stehen, nur das Wesen dreht sich. Die Projektoren drehen sich synchron zur
//     Kamera; die Tafeln bleiben an der Wand einer unsichtbaren Kugel und gleiten auf ihr hinter das Wesen, bis alle drei
//     deckungsgleich dahinter liegen (aus dem Blick wirken sie wie im Wesen). Wo alle drei es decken, entsteht auf ihm das Material.
//     Nahe einer Achse liegen sie wieder an ihren Wänden; die Dolly-Fahrt macht die Achsansicht flach (Morph zur Seitenansicht).

import { Werft } from './werft.js';
import { THREE } from '../zeichner.js';
import * as S from '../shader.js';
import * as S2 from './shader2.js';
import { add, sub, mul, dot, norm, dist, spiegel, smooth, lerp } from '../mathe.js';
import { neuerPunkt, neueId, ringEndenRichten, mitteRichten } from '../linien.js';
import { linieAnlegen } from '../schnitt.js';
import { PAR } from '../parameter.js';
import { zeigerSetzen } from './zeiger.js';
import { aufblasen, polygonAus, spantenPfade } from './aufblasen.js';
import { OrthoSicht } from '../ansichten.js';

export const GRUND = [0.965, 0.955, 0.933];
const GRUND_RAND = [0.928, 0.914, 0.885];
export const TINTE = [0.118, 0.112, 0.137];
export const LILA = [0x93 / 255, 0x6f / 255, 0xfb / 255];
export const NAMEN = ['seite', 'front', 'top'];
const ACHSE = { seite: 2, front: 0, top: 1 }; // Weltachse, entlang der die Ansicht schaut
export const FARBE = { seite: [0.0, 0.6, 0.86], front: [0.9, 0.1, 0.52], top: [1.0, 0.82, 0.0] };
const DICHTE = { seite: 0.4, front: 0.32, top: 0.34 }; // Graubalance: die drei übereinander ergeben ein neutrales Grau
const KALT = [0.6, 0.64, 0.72], WARM = [0.975, 0.948, 0.895];
const L_BLICK = norm([-0.5, 0.74, 0.46]); // Licht im Raum, vom Heimblick aus gesehen: links oben vorn
const HEIM_AZ = -0.66;
const TAU0 = Math.tan((0.3 * Math.PI) / 180); // Projektor auf der Achse: fast parallel

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
const quatAus = (e, u) => {
  const Z = new THREE.Vector3(e[0], e[1], e[2]).normalize();
  const X = new THREE.Vector3(u[0], u[1], u[2]).cross(Z).normalize();
  const Y = Z.clone().cross(X);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
};
const vek = (V) => [V.x, V.y, V.z];

export class Ecke extends Werft {
  layoutAnfang() {
    super.layoutAnfang();
    const z = this.z;
    this.farben = { strich: 'rgba(30,28,35,0.6)', schnitt: '#6b4fd8', form: '#1e1c23', kritzeln: '#e8327f', krumen: ['#e8327f', '#6b4fd8'], verdunsten: '#8a8296', ring: 'rgba(30,28,35,0.65)' };
    this.modus = 'raum';
    this.s = 0; // 0 = Tafeln an den Wänden, 1 = deckungsgleich im Wesen
    this.uebergang = null;
    this.psi = HEIM_AZ; // Lage des Raums (Licht, Fliese) um die Hochachse
    this.psiZiel = null;
    this.letztAz = null;
    this.sigma = 1; // Aufblasen: Maß in z (Start)
    this.rueckzug = 1; // Start: die Seitenansicht zieht sich auf ihre Wand zurück (0 → 1)
    this.sichtbarkeit = 1; // Wesen, Tafeln, Fliese (Start: erst nach dem Aufblasen)
    this.grundMat.uniforms.uInnen.value.set(...GRUND);
    this.grundMat.uniforms.uAussen.value.set(...GRUND_RAND);
    this.ebeneMat.uniforms.uFarbe.value.set(0.45, 0.36, 0.9);
    // versteckte Punkte schwächer (eigene Deckkraft, sonst dieselben Einstellungen)
    z.punktMatVerdeckt.uniforms = Object.assign({}, z.punktMat.uniforms, { uDeck: { value: 0.25 } });
    // Tafeln: je eine Druckfarbe und eine Deckung (für die Schnittmenge), ein Projektor, eine Maske
    this.tafeln = {};
    const multipliziert = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor };
    for (const n of NAMEN) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
      g.setAttribute('clip', new THREE.BufferAttribute(new Float32Array(16), 4));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      const druck = new THREE.ShaderMaterial({
        vertexShader: S2.tafelVS, fragmentShader: S2.tafelFS,
        uniforms: { uMaske: { value: null }, uFarbe: { value: new THREE.Vector3(...FARBE[n]) }, uDichte: { value: 0 }, uKante: { value: 0.26 }, uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) }, uLinse: z.U.uLinse, uLinseS: { value: 0 } },
        depthTest: false, depthWrite: false, side: THREE.DoubleSide, transparent: true, ...multipliziert,
      });
      const deck = new THREE.ShaderMaterial({
        vertexShader: S2.tafelVS, fragmentShader: S2.tafelDeckFS,
        uniforms: { uMaske: druck.uniforms.uMaske, uKanal: { value: new THREE.Vector3(n === 'seite' ? 1 : 0, n === 'front' ? 1 : 0, n === 'top' ? 1 : 0) }, uW: { value: 0 } },
        depthTest: false, depthWrite: false, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(g, druck);
      mesh.frustumCulled = false;
      const szene = new THREE.Scene();
      szene.add(mesh);
      this.tafeln[n] = { name: n, mesh, druck, deck, szene, kam: new THREE.PerspectiveCamera(1, 1, 0.01, 100), schl: null, w: 0, maske: null };
    }
    this.goochMat = new THREE.ShaderMaterial({
      vertexShader: S.papierVS, fragmentShader: S2.goochFS,
      uniforms: { uLicht: { value: new THREE.Vector3(0, 1, 0) }, uKalt: { value: new THREE.Vector3(...KALT) }, uWarm: { value: new THREE.Vector3(...WARM) }, uWahl: { value: new THREE.Vector3(...LILA) }, uEinfluss: z.U.uEinfluss },
      side: THREE.DoubleSide,
    });
    this.zusammenMat = new THREE.ShaderMaterial({
      vertexShader: S.vollbildVS, fragmentShader: S2.koerperZusammenFS,
      uniforms: { uKoerper: { value: null }, uDeckung: { value: null }, uSchleier: { value: 0 }, uMaterial: { value: 0 }, uImmer: { value: 0 }, uGrund: { value: new THREE.Vector3(...GRUND) }, uLinse: z.U.uLinse },
      depthTest: false, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const bg = new THREE.PlaneGeometry(2, 2);
    bg.rotateX(-Math.PI / 2);
    this.bodenMat = new THREE.ShaderMaterial({
      vertexShader: S2.bodenEckeVS, fragmentShader: S2.bodenEckeFS,
      uniforms: { uVersatz: { value: new THREE.Vector2() }, uMitte: { value: new THREE.Vector2() }, uRiss: { value: null }, uR: { value: 1 }, uFliese: { value: 1 }, uPsi: { value: 0 }, uSchatten: { value: 0.1 }, uFlieseA: { value: 1 }, uTexel: { value: 1 / 256 }, uTinte: { value: new THREE.Vector3(...TINTE) } },
      transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    });
    this.boden = new THREE.Mesh(bg, this.bodenMat);
    this.boden.frustumCulled = false;
    this.bodenSzene = new THREE.Scene();
    this.bodenSzene.add(this.boden);
    this.konturMat.uniforms.uFarbe.value.set(...TINTE);
    // Viereransicht (Taste 4): Seite oben links, Front oben rechts, Top unten links, Raum unten rechts
    this.vierer = 0;
    this.viererZiel = 0;
    this.viererFahrt = null;
    this.vierSichten = { seite: new OrthoSicht('seite'), front: new OrthoSicht('front'), top: new OrthoSicht('top') };
    // Start: leeres Papier in der Seitenansicht, der Stift ist bereit
    this.phase = PAR.get('start') === '0' ? null : 'stift';
    this.stiftZustand = { punkte: [], zu: false, zug: null, maus: null, klick: null };
    if (this.phase === 'stift') this.sichtbarkeit = 0;
  }

  einpassen(sofort) {
    if (this.phase === 'stift' && this.rs) return this.startKamera();
    return super.einpassen(sofort);
  }
  startKamera() {
    const rs = this.rs;
    rs.azimut = 0; rs.hoehe = 0;
    rs.parallel = 1; this.parallelZiel = 1;
    rs.ziel = [0, 0.15, 0];
    rs.abstand = 6;
    this.kamFahrt = null;
    this.letztAz = null;
  }

  // Die Ecke braucht Platz für die Wände hinter dem Wesen
  passAbstand() {
    const g = this.grenzen();
    const r = Math.hypot(g.max[0] - g.min[0], g.max[1] - g.min[1], g.max[2] - g.min[2]) / 2;
    const asp = Math.min(1, this.W / this.H);
    return (r * 1.42) / Math.sin(((30 * Math.PI) / 360) * Math.max(0.62, asp));
  }

  // ---------------- Zustände ----------------
  layoutTaste(k) {
    if (k === 'Tab') return this.modusWechseln();
    if (k === '4') return this.viererUmschalten();
  }
  viererUmschalten() {
    this.viererZiel = this.viererZiel > 0.5 ? 0 : 1;
    this.viererFahrt = { von: this.vierer, t: 0 };
    this.klang('rasten');
  }
  // Felder der Viereransicht (Bildpunkte)
  felder() {
    const W = this.W, H = this.H, m = 14, g = 12;
    const qw = (W - 2 * m - g) / 2, qh = (H - 2 * m - g) / 2;
    return {
      seite: { x: m, y: m, w: qw, h: qh }, front: { x: m + qw + g, y: m, w: qw, h: qh },
      top: { x: m, y: m + qh + g, w: qw, h: qh }, raum: { x: m + qw + g, y: m + qh + g, w: qw, h: qh },
    };
  }
  // halbe Höhe des Rahmens der Achsprojektoren: eng um die größte Silhouette (alle drei im selben Maßstab)
  rahmenH0(g) {
    const asp = this.W / this.H;
    const ex = g.max[0] - g.min[0], ey = g.max[1] - g.min[1], ez = g.max[2] - g.min[2];
    return 0.56 * Math.max(ey, ez, ex / asp, ez / asp);
  }
  // Tafel im Feld: mit dem Seitenverhältnis des Bilds, mittig
  tafelRechteck(F) {
    const asp = this.W / this.H;
    const h = Math.min(F.h, F.w / asp), w = h * asp;
    return { x: F.x + (F.w - w) / 2, y: F.y + (F.h - h) / 2, w, h };
  }
  sichtBei(x, y) {
    if (this.vierer < 0.5) return super.sichtBei(x, y);
    const F = this.felder();
    for (const n of NAMEN) { const r = F[n]; if (x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h) return this.vierSichten[n]; }
    return this.rs;
  }
  // Der Raum zieht sich ins vierte Feld zusammen: die Projektion der Kamera wird verkleinert und verschoben
  viererProjektion() {
    const v = ease(this.vierer);
    if (v < 1e-4) return;
    const W = this.W, H = this.H, R = this.felder().raum;
    const sc = 1 + (1.5 * Math.min(R.w / W, R.h / H) - 1) * v;
    const ox = (((R.x + R.w / 2) / W) * 2 - 1) * v, oy = (1 - ((R.y + R.h / 2) / H) * 2) * v;
    const k = this.rs.kamera;
    const M = new THREE.Matrix4().set(sc, 0, 0, ox, 0, sc, 0, oy, 0, 0, 1, 0, 0, 0, 0, 1);
    k.projectionMatrix.premultiply(M);
    k.projectionMatrixInverse.copy(k.projectionMatrix).invert();
  }
  modusWechseln(ziel) {
    const neu = ziel || (this.modus === 'raum' ? 'wesen' : 'raum');
    if (neu === this.modus) return;
    this.modus = neu;
    this.uebergang = { t: 0, s0: this.s, dauer: 1.15 };
    // zurück im Raum: die Fliese richtet sich wieder an den Wänden aus (Vierteldrehungen sehen gleich aus)
    if (neu === 'raum') this.psiZiel = HEIM_AZ + Math.round((this.psi - HEIM_AZ) / (Math.PI / 2)) * (Math.PI / 2);
    else this.psiZiel = null;
    this.klang('rasten');
  }
  // Richtung vom Wesen zur Kamera
  blickZumWesen() {
    const g = this.grenzen(), k = this.rs.kamera.position;
    return norm([k.x - g.mitte[0], k.y - g.mitte[1], k.z]);
  }
  sZiel() {
    if (this.modus !== 'wesen' || this.viererZiel > 0.5) return 0;
    const v = this.blickZumWesen();
    const m = Math.max(Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2]));
    const winkel = Math.acos(Math.min(1, m)); // zur nächsten Achse
    return smooth(0.06, 0.62, winkel) * (1 - this.parallelZiel);
  }
  licht() {
    return rotY(L_BLICK, this.psi);
  }

  schrittLayout(dt) {
    super.schrittLayout(dt);
    const rs = this.rs;
    if (this.phase === 'aufblasen') this.aufblasenSchritt(dt);
    // Im Wesen-Modus bleibt der Raum (Licht, Fliese) vor der Kamera stehen: er dreht sich mit dem Blick mit
    if (this.letztAz === null) this.letztAz = rs.azimut;
    if (this.modus === 'wesen') this.psi += rs.azimut - this.letztAz;
    this.letztAz = rs.azimut;
    if (this.psiZiel !== null && this.modus === 'raum') {
      this.psi += (this.psiZiel - this.psi) * (1 - Math.exp(-dt * 7));
      if (Math.abs(this.psiZiel - this.psi) < 1e-4) { this.psi = this.psiZiel; this.psiZiel = null; }
    }
    const sZ = this.sZiel();
    if (this.uebergang) {
      const U = this.uebergang;
      U.t += dt / U.dauer;
      this.s = U.s0 + (sZ - U.s0) * ease(Math.min(1, U.t));
      if (U.t >= 1) this.uebergang = null;
    } else this.s += (sZ - this.s) * (1 - Math.exp(-dt * 9));
    if (Math.abs(this.s - sZ) < 1e-4 && !this.uebergang) this.s = sZ;
    if (this.viererFahrt) {
      const f = this.viererFahrt;
      f.t += dt / 0.62;
      this.vierer = f.von + (this.viererZiel - f.von) * Math.min(1, f.t);
      if (f.t >= 1) { this.vierer = this.viererZiel; this.viererFahrt = null; }
    }
    rs.setzen({ x: 0, y: 0, w: this.W, h: this.H });
    this.viererProjektion();
    // Ansichten der Felder (gleicher Maßstab, Zeilen und Spalten fluchten)
    if (this.vierer > 0) {
      const g = this.grenzen();
      const h0 = this.rahmenH0(g);
      const F = this.felder();
      for (const n of NAMEN) {
        const rc = this.tafelRechteck(F[n]);
        this.vierSichten[n].setzen(rc, rc.h / (2 * h0), [g.mitte[0], g.mitte[1], 0]);
      }
    }
  }

  // ---------------- Tafeln: Projektoren, Masken, Lage ----------------
  tafelnSetzen(B, mw, mh) {
    const z = this.z, r = z.r, rs = this.rs, k = rs.kamera;
    const g = this.grenzen();
    const C = [g.mitte[0], g.mitte[1], 0];
    const ext = [g.max[0] - g.min[0], g.max[1] - g.min[1], g.max[2] - g.min[2]];
    const R = 0.5 * Math.hypot(ext[0], ext[1], ext[2]);
    const luecke = 0.3 * Math.max(ext[0], ext[1], ext[2]);
    const kp = vek(k.position);
    const v = norm(sub(kp, C));
    const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
    k.updateMatrixWorld();
    k.matrixWorld.extractBasis(X, Y, Z);
    const q1 = quatAus(vek(Z), vek(Y));
    const T1 = rs.ziel.slice();
    const tau1 = Math.tan((k.fov * Math.PI) / 360);
    const h1 = dist(kp, T1) * tau1;
    const asp = this.W / this.H;
    const h0 = this.rahmenH0(g);
    const s = this.s;
    const sk = z.koerper.scale;
    // Unsichtbare Kugel um das Wesen (Florian, 13.11.): Die Ansichten bleiben an ihrer Wand und gleiten auf ihr entlang,
    // nie ins Wesen. Auf der Achse berührt die Kugel die Wände der Ecke; zusammengelaufen liegen alle drei genau hinter dem
    // Wesen, und nur der Blick lässt sie im Wesen erscheinen (der Projektor ist dann die Kamera).
    const dSeite = ((this.phase === 'aufblasen' ? this.zBasis : g.max[2]) + luecke) * this.rueckzug;
    const dFront = Math.max(g.max[0] - C[0], C[0] - g.min[0]) + luecke;
    const dKugel = Math.max(dSeite, dFront);
    for (const n of NAMEN) {
      const T = this.tafeln[n];
      const ax = ACHSE[n];
      const sg = this.viererZiel > 0.5 || this.vierer > 0.001 ? (n === 'front' ? -1 : 1) : v[ax] >= 0 ? 1 : -1;
      const A = [0, 0, 0];
      A[ax] = sg;
      // Wand hinter dem Wesen (vom Blick abgewandt); der Boden liegt unter den Füßen
      let D;
      if (n === 'top') D = sg > 0 ? C[1] - g.min[1] + 0.004 * R : g.max[1] - C[1] + luecke;
      else if (n === 'front') D = dFront;
      else D = dSeite;
      // Blick der Achse: oben = y (Seite, Front); Top: vom Betrachter weg (so dreht sie sich ohne Rolle zur Kamera)
      let u0 = [0, 1, 0];
      if (n === 'top') {
        const l = Math.hypot(v[0], v[2]);
        u0 = s > 1e-4 && l > 1e-3 ? [-v[0] / l, 0, -v[2] / l] : [0, 0, -1];
      }
      const q = quatAus(A, u0).slerp(q1, s);
      const e = vek(new THREE.Vector3(0, 0, 1).applyQuaternion(q));
      const u = vek(new THREE.Vector3(0, 1, 0).applyQuaternion(q));
      const rr = vek(new THREE.Vector3(1, 0, 0).applyQuaternion(q));
      const Tz = lerp(C, T1, s);
      const h = h0 + (h1 - h0) * s;
      const tau = Math.exp(Math.log(TAU0) + (Math.log(tau1) - Math.log(TAU0)) * s);
      const L = h / tau;
      const P = add(Tz, mul(e, L));
      // Gewicht: auf der Achse quer liegende Wände verschwinden (man sähe sie nur als Strich); im Wesen voll
      const wA = smooth(0.1, 0.32, Math.abs(v[ax]));
      T.w = (wA + (1 - wA) * Math.max(smooth(0, 0.5, s), smooth(0, 0.6, this.vierer))) * this.sichtbarkeit;
      if (T.w < 0.003) continue;
      // Maske: aus Sicht des Projektors (auf der Achse unverändert, solange das Netz bleibt); deckungsgleich = Körperbild
      if (s >= 0.999) {
        T.maske = B.texture;
        T.druck.uniforms.uTexel.value.set(1 / B.width, 1 / B.height);
      } else {
        const schl = [n, sg, z.netzVersion, sk.x.toFixed(4), sk.y.toFixed(4), sk.z.toFixed(4), asp.toFixed(4), mw, P.map((x) => x.toFixed(4)).join(','), [q.x, q.y, q.z, q.w].map((x) => x.toFixed(5)).join(','), tau.toFixed(7)].join('|');
        const ziel = z.ziel('ecke:maske:' + n, mw, mh, { samples: 4 });
        if (T.schl !== schl) {
          T.schl = schl;
          const kam = T.kam;
          kam.fov = (2 * Math.atan(tau) * 180) / Math.PI;
          kam.aspect = asp;
          kam.near = Math.max(1e-3, L - 1.6 * R);
          kam.far = L + 1.6 * R;
          kam.position.set(P[0], P[1], P[2]);
          kam.quaternion.copy(q);
          kam.updateProjectionMatrix();
          kam.updateMatrixWorld();
          z.koerper.material = this.maskeWeiss;
          r.setRenderTarget(ziel);
          r.setClearColor(0x000000, 0);
          r.clear(true, true, true);
          r.render(z.szeneKoerper, kam);
        }
        T.maske = ziel.texture;
        T.druck.uniforms.uTexel.value.set(1 / mw, 1 / mh);
      }
      T.druck.uniforms.uMaske.value = T.maske;
      // Lage der Tafel: senkrecht zum Projektor, gegenüber dem Projektor an der Kugelwand (Abstand vom Wand- zum Kugelmaß)
      const delta = D + (dKugel - D) * smooth(0, 1, s);
      const Qc = sub(Tz, mul(e, delta));
      const hh = (L + delta) * tau, hw = hh * asp;
      const a = T.mesh.geometry.attributes.position, cl = T.mesh.geometry.attributes.clip;
      const PV = new THREE.Matrix4().multiplyMatrices(k.projectionMatrix, k.matrixWorldInverse);
      const vv = ease(this.vierer);
      const ziel = vv > 0 ? this.tafelRechteck(this.felder()[n]) : null;
      const ecke = (i, sx, sy) => {
        const p = add(Qc, add(mul(rr, sx * hw), mul(u, sy * hh)));
        a.setXYZ(i, p[0], p[1], p[2]);
        const c = new THREE.Vector4(p[0], p[1], p[2], 1).applyMatrix4(PV);
        if (ziel) {
          const bx = ((ziel.x + (sx > 0 ? ziel.w : 0)) / this.W) * 2 - 1, by = 1 - ((ziel.y + (sy > 0 ? 0 : ziel.h)) / this.H) * 2;
          c.set(c.x + (bx - c.x) * vv, c.y + (by - c.y) * vv, c.z * (1 - vv), c.w + (1 - c.w) * vv);
        }
        cl.setXYZW(i, c.x, c.y, c.z, c.w);
      };
      ecke(0, -1, -1); ecke(1, 1, -1); ecke(2, 1, 1); ecke(3, -1, 1);
      a.needsUpdate = true;
      cl.needsUpdate = true;
    }
    r.setRenderTarget(null);
  }

  // Draufsicht für den Kontaktschatten (Maske von oben)
  rissAktualisieren(g, Rr) {
    const z = this.z, r = z.r;
    const ziel = z.ziel('ecke:riss', 256, 256);
    const sk = z.koerper.scale;
    const schl = [z.netzVersion, Rr.toFixed(4), sk.x.toFixed(4), sk.y.toFixed(4), sk.z.toFixed(4)].join('|');
    if (this._riss === schl) return ziel;
    this._riss = schl;
    const k = this.rissKamera;
    k.left = -Rr; k.right = Rr; k.top = Rr; k.bottom = -Rr;
    k.position.set(g.mitte[0], g.max[1] + 5, 0);
    k.up.set(0, 0, -1);
    k.lookAt(g.mitte[0], 0, 0);
    k.near = 0.01; k.far = 60;
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

  koerperSkala() {
    const a = this.wackel || 0;
    this.z.koerper.scale.set(1 - a * 0.5, 1 + a, (1 - a * 0.5) * this.sigma);
  }

  // ---------------- Start: Umriss mit dem Stift ----------------
  // Klick = Eckpunkt, Ziehen = glatter Punkt (Griffe), Klick auf den ersten Punkt = schließen,
  // Enter oder Doppelklick = bestätigen, ⌫ = letzten Punkt weg, Esc = neu anfangen.
  eingabeFangen(art, e, x, y) {
    if (this.phase === 'aufblasen') return art !== 'taste' || e.key !== '?';
    if (this.phase !== 'stift') return false;
    const st = this.stiftZustand;
    const welt = (sx, sy) => { const r = this.rs.strahl(sx, sy); const t = -r.o[2] / (r.d[2] || 1e-9); return [r.o[0] + r.d[0] * t, r.o[1] + r.d[1] * t]; };
    const bild = (p) => this.rs.projizieren([p[0], p[1], 0]);
    const abstand = (P) => { const q = bild(P.p); return Math.hypot(q[0] - x, q[1] - y); };
    if (art === 'taste') {
      const k = e.key;
      if (k === '?') return false;
      if (k === 'Enter') this.stiftBestaetigen();
      else if (k === 'Backspace' || k === 'Delete') { if (st.zu) st.zu = false; else st.punkte.pop(); }
      else if (k === 'Escape') { st.punkte = []; st.zu = false; }
      return true;
    }
    if (art === 'runter') {
      if (e.button === 2) return true;
      const jetzt = window.__filmZeit ?? performance.now();
      const doppelt = st.klick && jetzt - st.klick.t < 400 && Math.hypot(x - st.klick.x, y - st.klick.y) < 9;
      st.klick = { t: jetzt, x, y };
      if (doppelt && st.punkte.length >= 3) { st.zug = null; this.stiftBestaetigen(); return true; }
      if (!st.zu && st.punkte.length >= 3 && abstand(st.punkte[0]) < 12) {
        st.zu = true;
        st.zug = { art: 'schliessen', P: st.punkte[0], x0: x, y0: y };
        this.fx.push({ art: 'stiftZu', t: 0, dauer: 0.6 });
        this.klang('form');
        return true;
      }
      const P = st.punkte.find((Q) => abstand(Q) < 9);
      if (P) { st.zug = { art: 'verschieben', P }; return true; }
      if (st.zu) return true;
      const neu = { p: welt(x, y), ein: [0, 0], aus: [0, 0] };
      st.punkte.push(neu);
      st.zug = { art: 'griff', P: neu, x0: x, y0: y };
      this.klang('punkt');
      return true;
    }
    if (art === 'bewegen') {
      st.maus = [x, y];
      this.maus.x = x; this.maus.y = y; this.maus.drin = true;
      zeigerSetzen(this.canvas, 'stift');
      const z = st.zug;
      if (!z) return true;
      if (z.art === 'verschieben') { z.P.p = welt(x, y); return true; }
      if (Math.hypot(x - z.x0, y - z.y0) < 4) return true;
      const q = welt(x, y);
      const d = [q[0] - z.P.p[0], q[1] - z.P.p[1]];
      z.P.aus = d;
      z.P.ein = [-d[0], -d[1]];
      return true;
    }
    if (art === 'hoch') { st.zug = null; return true; }
    return true;
  }

  stiftBestaetigen() {
    const st = this.stiftZustand;
    if (st.punkte.length < 3) { this.fx.push({ art: 'nein', t: 0, dauer: 0.4 }); this.klang('nein'); return; }
    st.zu = true;
    this.wesenAusUmriss(st.punkte);
  }

  // Der Umriss wird zum Kiel; das Wesen wird aufgeblasen, drei Spanten geben ihm Breite
  wesenAusUmriss(punkte) {
    const poly = polygonAus(punkte);
    const t0 = performance.now();
    const { netz, hoehe } = aufblasen(poly, { ziel: 9000 });
    const ecke = (P) => Math.hypot(...P.ein) + Math.hypot(...P.aus) < 1e-9;
    const kiel = { id: neueId(), art: 'mitte', proben: [], punkte: punkte.map((P) => neuerPunkt([P.p[0], P.p[1], 0], [P.ein[0], P.ein[1], 0], [P.aus[0], P.aus[1], 0], ecke(P))) };
    this.groesse = 2;
    const linien = [kiel];
    for (const pfad of spantenPfade(poly, hoehe, 3)) linien.push(linieAnlegen('ring', pfad, linien, this.groesse).L);
    for (const L of linien) { ringEndenRichten(L); mitteRichten(L); }
    this.netzSetzen(netz);
    this.haut.linien = linien;
    for (const L of linien) this.haut.einbetten(L);
    this.haut.struktur();
    this.auswahl.clear();
    this.haut.verformen();
    this.z.netzAktualisieren();
    this.raum._boxStart = false;
    this.raum.boxSetzen(this.netz);
    this.geschichte = [];
    this.gIndex = -1;
    this.merken();
    this.bauzeit = performance.now() - t0;
    // Animation: Ansicht zieht zurück, Seitenansicht auf ihre Wand, Wesen bläst sich wackelnd auf
    const P = this.netz.pos;
    this.basisPos = new Float32Array(P);
    let zmax = 0, xa = Infinity, xb = -Infinity;
    for (let i = 0; i < P.length; i += 3) { zmax = Math.max(zmax, P[i + 2]); xa = Math.min(xa, P[i]); xb = Math.max(xb, P[i]); }
    this.zBasis = zmax;
    const rs = this.rs;
    this.phase = 'aufblasen';
    this.sichtbarkeit = 1;
    this.sigma = 0;
    this.rueckzug = 0;
    const g = this.grenzen();
    this.anim = { t: 0, xa, xb, von: { az: rs.azimut, h: rs.hoehe, ab: rs.abstand, ziel: rs.ziel.slice(), par: rs.parallel }, nach: { az: HEIM_AZ, h: 0.32, ab: this.passAbstand(), ziel: [g.mitte[0], g.mitte[1] + (g.max[1] - g.min[1]) * 0.04, 0] } };
    this.parallelZiel = 0;
    this.kamFahrt = null;
    this.klang('form');
  }

  // gedämpfte Feder 0 → 1 (Überschwingen gut ein Viertel)
  feder01(t) {
    if (t <= 0) return 0;
    const zeta = 0.36, w = 2 * Math.PI * 1.25, wd = w * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
  }
  // Maß in z an der Stelle x: die Welle läuft vom Kopf zum Schwanz
  sigmaBei(x) {
    const a = this.anim;
    if (!a) return 1;
    const u = (x - a.xa) / Math.max(1e-6, a.xb - a.xa);
    return this.feder01(a.t - 0.22 - 0.16 * u);
  }

  aufblasenSchritt(dt) {
    const a = this.anim, rs = this.rs;
    a.t += dt;
    const t = a.t;
    // Kamera: zurück und in die Ecke (Dolly-Fahrt aus der flachen Seitenansicht)
    const k = ease(Math.min(1, t / 1.9));
    rs.azimut = a.von.az + (a.nach.az - a.von.az) * k;
    rs.hoehe = a.von.h + (a.nach.h - a.von.h) * k;
    rs.abstand = a.von.ab + (a.nach.ab - a.von.ab) * k;
    rs.ziel = lerp(a.von.ziel, a.nach.ziel, k);
    rs.parallel = a.von.par * (1 - ease(Math.min(1, t / 1.3)));
    this.parallelZiel = 0;
    this.psi = HEIM_AZ;
    this.letztAz = rs.azimut;
    // Seitenansicht zieht sich auf ihre Wand zurück
    this.rueckzug = 1 - Math.pow(1 - Math.min(1, Math.max(0, (t - 0.08) / 1.1)), 3);
    // Aufblasen mit Welle
    const B = this.basisPos, P = this.netz.pos;
    for (let i = 0; i < P.length; i += 3) P[i + 2] = B[i + 2] * this.sigmaBei(B[i]);
    this.netz.normalen();
    this.netz.geaendert();
    this.z.netzAktualisieren();
    this.sigma = 1;
    if (t > 3.0) {
      P.set(B);
      this.netz.normalen();
      this.netz.geaendert();
      this.z.netzAktualisieren();
      this.anim = null;
      this.phase = null;
      this.rueckzug = 1;
      rs.parallel = 0;
    }
  }
  flieseA() {
    if (this.phase === 'stift') return 0;
    if (this.phase === 'aufblasen') return smooth(0.5, 1.6, this.anim.t);
    return 1;
  }

  // Anzeige: im Aufblasen gehen die Linien mit, die Spanten zeichnen sich ein
  anzeigeBauen() {
    super.anzeigeBauen();
    const a = this.anim;
    if (this.phase !== 'aufblasen' || !a) return;
    const zeigen = smooth(0.35, 1.3, a.t);
    const ringe = new Set(this.linien.filter((L) => L.art === 'ring'));
    const neu = [];
    for (const zug of this.anzeige.zuege) {
      const pts = zug.pts.map((p) => [p[0], p[1], p[2] * this.sigmaBei(p[0])]);
      neu.push({ ...zug, pts });
    }
    // Ringe: die ersten Züge nach dem Kiel gehören den Ringen (abtasten liefert je Ring einen Zug)
    let i = 0;
    for (const L of this.linien) {
      const anzahl = L.art === 'paar' ? 2 : 1;
      if (ringe.has(L)) for (let k = 0; k < anzahl; k++) {
        const z = neu[i + k];
        const m = Math.max(2, Math.floor(z.pts.length * zeigen));
        neu[i + k] = { ...z, pts: z.pts.slice(0, m), zu: zeigen >= 0.999 ? z.zu : false, kante: z.kante && z.kante.slice(0, m), tusche: z.tusche && z.tusche.slice(0, m) };
      }
      i += anzahl;
    }
    this.anzeige.zuege = neu;
  }

  // der Umriss in Arbeit (2D über dem Papier; die Seitenansicht ist flach, Bild = Ebene z = 0)
  stiftZeichnen(c, alpha) {
    const st = this.stiftZustand, P = st.punkte;
    if (!P.length || alpha <= 0) return;
    const B = (p) => this.rs.projizieren([p[0], p[1], 0]);
    const n = P.length;
    c.save();
    c.globalAlpha = alpha;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    const pfad = (zu) => {
      c.beginPath();
      const a0 = B(P[0].p);
      c.moveTo(a0[0], a0[1]);
      for (let i = 0; i < (zu ? n : n - 1); i++) {
        const a = P[i], b = P[(i + 1) % n];
        const c1 = B([a.p[0] + a.aus[0], a.p[1] + a.aus[1]]), c2 = B([b.p[0] + b.ein[0], b.p[1] + b.ein[1]]), e = B(b.p);
        c.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]);
      }
      if (zu) c.closePath();
    };
    // geschlossen: die Fläche ist schon die Seitenansicht (Cyan, wie gedruckt)
    if (st.zu && n >= 3) {
      c.save();
      c.globalCompositeOperation = 'multiply';
      const d = DICHTE.seite;
      c.fillStyle = `rgb(${FARBE.seite.map((v) => Math.round(255 * (1 - d * (1 - v)))).join(',')})`;
      pfad(true);
      c.fill();
      c.restore();
    }
    c.strokeStyle = 'rgba(30,28,35,0.92)';
    c.lineWidth = 1.6;
    pfad(st.zu);
    c.stroke();
    // Gummiband zum Zeiger
    if (!st.zu && !st.zug && st.maus && this.maus.drin) {
      const a = P[n - 1], s0 = B(a.p), c1 = B([a.p[0] + a.aus[0], a.p[1] + a.aus[1]]), m = st.maus;
      c.strokeStyle = 'rgba(30,28,35,0.32)';
      c.lineWidth = 1.2;
      c.setLineDash([3, 4]);
      c.beginPath();
      c.moveTo(s0[0], s0[1]);
      c.bezierCurveTo(c1[0], c1[1], m[0], m[1], m[0], m[1]);
      c.stroke();
      c.setLineDash([]);
    }
    // Griffe des Punkts in der Hand (oder des letzten)
    const aktiv = st.zug ? st.zug.P : !st.zu ? P[n - 1] : null;
    if (aktiv && Math.hypot(aktiv.aus[0], aktiv.aus[1]) > 1e-6) {
      const m = B(aktiv.p);
      for (const g of [aktiv.ein, aktiv.aus]) {
        const q = B([aktiv.p[0] + g[0], aktiv.p[1] + g[1]]);
        c.strokeStyle = 'rgba(30,28,35,0.5)';
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(m[0], m[1]); c.lineTo(q[0], q[1]); c.stroke();
        c.fillStyle = '#ffffff';
        c.strokeStyle = '#1e1c23';
        c.lineWidth = 1.2;
        c.beginPath(); c.arc(q[0], q[1], 2.8, 0, Math.PI * 2); c.fill(); c.stroke();
      }
    }
    // Punkte: weiße Scheiben mit dunklem Ring, Ecken als Raute; der erste wächst, wenn man ihn zum Schließen anpeilt
    const q0 = B(P[0].p);
    const nahErster = !st.zu && n >= 3 && st.maus && Math.hypot(q0[0] - st.maus[0], q0[1] - st.maus[1]) < 12;
    P.forEach((Q, i) => {
      const q = B(Q.p);
      const r = i === 0 && nahErster ? 6.5 : 4.2;
      const ecke = Math.hypot(Q.aus[0], Q.aus[1]) < 1e-9;
      c.fillStyle = Q === aktiv && st.zug ? 'rgb(147,111,251)' : '#ffffff';
      c.strokeStyle = '#1e1c23';
      c.lineWidth = 1.4;
      c.beginPath();
      if (ecke) { c.moveTo(q[0], q[1] - r * 1.15); c.lineTo(q[0] + r * 1.15, q[1]); c.lineTo(q[0], q[1] + r * 1.15); c.lineTo(q[0] - r * 1.15, q[1]); c.closePath(); }
      else c.arc(q[0], q[1], r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    });
    for (const f of this.fx) if (f.art === 'stiftZu') {
      const t = f.t / f.dauer;
      c.globalAlpha = alpha * (1 - t);
      c.strokeStyle = 'rgb(147,111,251)';
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(q0[0], q0[1], 6 + t * 26, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  }

  // Eine Vorführung aus dem Start (leeres Papier) zeichnet ein Wesen; das bleibt danach (nichts zurückholen)
  standMerken() {
    return this.phase === 'stift' ? null : super.standMerken();
  }

  // ---------------- Vorführung (Geistermaus, Filme) ----------------
  drehbuecher() {
    const app = this;
    const W = () => app.W, H = () => app.H;
    const an = (fx, fy) => () => [W() * fx, H() * fy];
    const proj = (p) => app.rs.projizieren(p);
    // ein Wesen mit dem Stift (Bruchteile der Bildgröße; Seitenansicht)
    const zeichnen = (G) => {
      const Z = [
        ['zieh', 0.328, 0.55, 0.322, 0.494], ['zieh', 0.406, 0.4125, 0.457, 0.3975], ['zieh', 0.547, 0.465, 0.594, 0.49],
        ['klick', 0.6875, 0.3975], ['zieh', 0.625, 0.565, 0.602, 0.5875], ['klick', 0.57, 0.625], ['klick', 0.556, 0.71],
        ['klick', 0.525, 0.64], ['klick', 0.461, 0.645], ['klick', 0.441, 0.715], ['klick', 0.414, 0.644], ['zieh', 0.375, 0.625, 0.353, 0.6075],
      ];
      G.gehe(an(0.3, 0.62), 0.6);
      for (const [art, x, y, x2, y2] of Z) {
        G.gehe(an(x, y), 0.42);
        if (art === 'klick') G.klick(an(x, y));
        else G.zieh(() => [[W() * x, H() * y], [W() * (x + (x2 - x) * 0.5), H() * (y + (y2 - y) * 0.5)], [W() * x2, H() * y2]], 0.42);
      }
      G.gehe(an(0.329, 0.551), 0.5);
      G.warte(0.25);
      G.klick(an(0.328, 0.55));
      G.warte(0.7);
      G.taste('Enter', 0.3);
    };
    // Leere ziehen: drehen (Raum oder Wesen, je nach Tab)
    const drehen = (G, dx, dy, s = 1.6) => {
      G.gehe(an(0.86, 0.84), 0.5);
      G.zieh(() => [[W() * 0.86, H() * 0.84], [W() * 0.86 + dx * 0.5, H() * 0.84 + dy * 0.5], [W() * 0.86 + dx, H() * 0.84 + dy]], s);
    };
    return {
      start(G) {
        // auf leerem Papier: erst zeichnen und aufblasen; sonst nur die Ecke
        if (app.phase === 'stift') { zeichnen(G); G.warte(3.4); }
        G.gehe(an(0.86, 0.84), 0.5);
        G.taste('Tab', 0.3);
        G.warte(1.8);
        drehen(G, 260, 0, 2.2);
        G.warte(1.2);
        G.taste('Tab', 0.3);
        G.warte(1.8);
        G.taste('4', 0.3);
        G.warte(1.6);
        G.taste('4', 0.3);
        G.warte(1.4);
      },
      stift(G) {
        zeichnen(G);
        G.warte(3.6);
      },
      tab(G) {
        G.gehe(an(0.86, 0.84), 0.6);
        G.warte(0.6);
        G.taste('Tab', 0.3);
        G.warte(2.2);
        G.taste('Tab', 0.3);
        G.warte(2.0);
      },
      drehen(G) {
        // Raum drehen: alles dreht sich, die Ansichten bleiben an ihren Wänden
        drehen(G, 230, 30, 2.0);
        G.warte(0.8);
        drehen(G, -230, -30, 2.0);
        G.warte(0.6);
        // Wesen drehen: Licht und Fliese bleiben, nur das Wesen dreht sich; nahe einer Achse lösen sich die Ansichten wieder
        G.taste('Tab', 0.3);
        G.warte(1.6);
        drehen(G, -70, -40, 1.8);
        G.warte(1.0);
        drehen(G, 330, 0, 2.6);
        G.warte(1.0);
        G.taste('Tab', 0.3);
        G.warte(1.6);
      },
      achse(G) {
        G.gehe(an(0.86, 0.84), 0.5);
        // tippen (unter 0,3 s), sonst federt die Ansicht zurück
        G.taste('1', 0.12); G.warte(1.6);
        G.taste('3', 0.12); G.warte(1.6);
        G.taste('7', 0.12); G.warte(1.6);
        G.taste('0', 0.12); G.warte(1.4);
      },
      vier(G) {
        G.gehe(an(0.9, 0.9), 0.5);
        G.taste('4', 0.3);
        G.warte(1.4);
        // im Seitenfeld einen Punkt des Kiels ziehen: alle Ansichten folgen
        const kielPunkt = () => { const L = app.linien.find((x) => x.art === 'mitte'); const P = L.punkte.reduce((u, v) => (v.p[1] > u.p[1] ? v : u)); return app.vierSichten.seite.projizieren(P.p); };
        G.gehe(() => kielPunkt(), 0.8);
        G.warte(0.5);
        G.zieh(() => { const p = kielPunkt(); return [p, [p[0] + 20, p[1] - 30], [p[0] + 30, p[1] - 44]]; }, 1.4);
        G.warte(0.6);
        G.gehe(an(0.9, 0.9), 0.6);
        G.taste('4', 0.3);
        G.warte(1.4);
      },
    };
  }

  // ---------------- Zeichnen ----------------
  zeichnen() {
    const z = this.z, r = z.r, W = this.W, H = this.H, d = z.dpr;
    const w = Math.round(W * d), h = Math.round(H * d);
    const rs = this.rs, kam = rs.kamera;
    const flach = this.flach;
    const s = this.s;
    const g = this.grenzen();
    const fein = Math.min(1, 1024 / Math.max(w, h));
    const mw = Math.max(64, Math.round(w * fein)), mh = Math.max(64, Math.round(h * fein));
    this.koerperSkala();
    // 1. Körper mit Material in ein Ziel (seine Deckung ist Maske für Umriss, Schleier und deckungsgleiche Tafeln)
    const B = z.ziel('ecke:koerper', w, h, { samples: 4 });
    r.setRenderTarget(B);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    this.goochMat.uniforms.uLicht.value.set(...this.licht());
    // Einfluss: Lichtfleck auf der Haut vor dem Formen, im Zug mit
    const ein = z.U.uEinfluss.value;
    if (this.zug && this.zug.art === 'haut') {
      const c0 = this.zug.p0, dd = this.zug.d ? (this.zug.sp ? spiegel(this.zug.d) : this.zug.d) : [0, 0, 0];
      ein.set(c0[0] + dd[0], c0[1] + dd[1], c0[2] + dd[2], this.hautR);
    } else if (!this.zug && !this.strich && this.nahZiel && this.nahZiel.art === 'haut' && this.maus.drin && this.phase === null) {
      ein.set(this.nahZiel.p[0], this.nahZiel.p[1], this.nahZiel.p[2], this.hautR);
    }
    z.koerper.material = this.goochMat;
    if (this.sichtbarkeit > 0.001) r.render(z.szeneKoerper, kam);
    // 2. Grund
    r.setRenderTarget(null);
    r.setViewport(0, 0, W, H);
    r.setClearColor(new THREE.Color(...GRUND), 1);
    r.clear(true, true, true);
    this.grundMat.uniforms.uAufl.value.set(w, h);
    z.vollMesh.material = this.grundMat;
    r.render(z.vollSzene, z.vollKamera);
    if (this.sichtbarkeit > 0.001) {
      // 3. Boden: Fliese und Kontaktschatten
      const ext = Math.max(g.max[0] - g.min[0], g.max[2] - g.min[2]);
      const Rr = 0.62 * ext + 0.08 * this.groesse;
      const riss = this.rissAktualisieren(g, Rr);
      const B2 = this.bodenMat.uniforms;
      const fl = 0.56 * Math.max(g.max[0] - g.min[0], (g.max[2] - g.min[2]) * this.sigma);
      const gross = Math.max(Rr, fl * 1.5) * 1.15;
      this.boden.position.set(g.mitte[0], g.min[1] - 0.003 * this.groesse, 0);
      this.boden.scale.set(gross, 1, gross);
      B2.uMitte.value.set(g.mitte[0], 0);
      B2.uRiss.value = riss.texture;
      B2.uR.value = Rr;
      B2.uFliese.value = fl;
      B2.uPsi.value = this.psi - HEIM_AZ;
      B2.uSchatten.value = (0.07 + 0.09 * s) * (1 - flach * 0.6) * this.sichtbarkeit;
      B2.uFlieseA.value = this.sichtbarkeit * this.flieseA();
      B2.uTexel.value = 1 / 256;
      // Schatten weicht dem Licht aus: im Wesen-Modus bleibt er stehen, während sich das Wesen dreht
      const L = this.licht(), hh = 0.5 * (g.max[1] - g.min[1]);
      const kv = (hh * 0.42) / Math.max(0.35, L[1]);
      B2.uVersatz.value.set(-L[0] * kv, -L[2] * kv);
      r.render(this.bodenSzene, kam);
      // 4. Tafeln: Druck (multipliziert) und Deckung je Farbe
      this.tafelnSetzen(B, mw, mh);
      r.setRenderTarget(null);
      r.setViewport(0, 0, W, H);
      for (const n of NAMEN) {
        const T = this.tafeln[n];
        if (T.w < 0.003) continue;
        T.druck.uniforms.uDichte.value = DICHTE[n] * T.w;
        T.druck.uniforms.uLinseS.value = s;
        T.mesh.material = T.druck;
        r.render(T.szene, kam);
      }
      const A = z.ziel('ecke:deckung', mw, mh, { tiefe: false });
      r.setRenderTarget(A);
      r.setClearColor(0x000000, 0);
      r.clear(true, false, false);
      for (const n of NAMEN) {
        const T = this.tafeln[n];
        if (T.w < 0.003) continue;
        T.deck.uniforms.uW.value = T.w;
        T.mesh.material = T.deck;
        r.render(T.szene, kam);
      }
      r.setRenderTarget(null);
      r.setViewport(0, 0, W, H);
      // 5. Körper: Transparentpapier (Drahtmodell) und Material (Schnittmenge der drei Ansichten)
      const U = this.zusammenMat.uniforms;
      U.uKoerper.value = B.texture;
      U.uDeckung.value = A.texture;
      U.uSchleier.value = 0.4 * (1 - flach) * (1 - smooth(0, 0.6, s)) * this.sichtbarkeit;
      U.uMaterial.value = smooth(0.02, 0.35, s) * (1 - flach);
      U.uImmer.value = smooth(0.3, 1, this.vierer) * (1 - flach);
      U.uSchleier.value *= 1 - smooth(0.3, 1, this.vierer);
      z.vollMesh.material = this.zusammenMat;
      r.render(z.vollSzene, z.vollKamera);
      // 6. Umriss
      const K = this.konturMat.uniforms;
      K.uMaske.value = B.texture;
      K.uAufl.value.set(w, h);
      K.uR.value = 1.5 * d;
      K.uAlpha.value = 0.85 * this.sichtbarkeit;
      z.vollMesh.material = this.konturMat;
      r.render(z.vollSzene, z.vollKamera);
      // 7. Glas der Fläche, in der gerade gezogen wird
      const E = this.ebeneZiel, EU = this.ebeneMat.uniforms;
      if (E && EU.uAlpha.value > 0.01) {
        const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...E.u), new THREE.Vector3(...E.v), new THREE.Vector3(...E.n));
        this.ebene.quaternion.setFromRotationMatrix(m);
        this.ebene.position.set(...E.c);
        this.ebene.scale.set(E.hu, E.hv, 1);
        EU.uGroesse.value.set(E.hu, E.hv);
        EU.uRaster.value = 0.05 * this.groesse;
        // hochkant gesehen wäre das Glas nur ein greller Strich: dann ausblenden
        const kp = kam.position, bl = norm([kp.x - E.c[0], kp.y - E.c[1], kp.z - E.c[2]]);
        const a0 = EU.uAlpha.value;
        EU.uAlpha.value = a0 * smooth(0.12, 0.38, Math.abs(dot(bl, E.n)));
        r.render(this.ebeneSzene, kam);
        EU.uAlpha.value = a0;
      }
      // 8. Linien und Punkte (Tiefe des Körpers zuerst: verdeckte Linien fein und hell)
      r.clearDepth();
      z.koerper.material = z.nurTiefe;
      r.render(z.szeneKoerper, kam);
      this.linienStil(s, flach);
      z.U.uAufl.value.set(w, h);
      this.lampe(true, 150);
      r.render(z.szeneLinien, kam);
      if (this.vierer > 0.01) this.felderLinien(s);
      this.lampe(false);
    }
    z.koerper.scale.set(1, 1, 1);
    r.setViewport(0, 0, W, H);
  }
  // Linien und Punkte in den drei flachen Feldern (bearbeitbar wie im Raum)
  felderLinien(s) {
    const z = this.z, r = z.r, H = this.H, d = z.dpr;
    const F = this.felder();
    const a = smooth(0.55, 1, this.vierer);
    r.setScissorTest(true);
    for (const n of NAMEN) {
      const S = this.vierSichten[n], rc = S.rect, q = F[n];
      r.setViewport(rc.x, H - rc.y - rc.h, rc.w, rc.h);
      r.setScissor(q.x, H - q.y - q.h, q.w, q.h);
      r.clearDepth();
      z.koerper.material = z.nurTiefe;
      r.render(z.szeneKoerper, S.kamera);
      z.U.uAufl.value.set(rc.w * d, rc.h * d);
      this.linienStil(s, 1);
      z.linieSicht.uniforms.uAlpha.value *= a;
      z.punktMat.uniforms.uDeck.value *= a;
      r.render(z.szeneLinien, S.kamera);
    }
    r.setScissorTest(false);
    r.setViewport(0, 0, this.W, this.H);
  }

  linienStil(s, flach) {
    const z = this.z;
    z.breiten(1.25);
    for (const m of [z.linieSicht, z.linieVerdeckt]) {
      const U = m.uniforms;
      U.uFarbe.value.set(...TINTE);
      U.uWahl.value.set(...LILA);
      U.uHell.value.set(0.74, 0.62, 1.0);
      U.uGestrichelt.value = 0;
    }
    // Strichstärke nach Tiefe: näher = kräftiger (nur im Raum, flach ohne Wirkung)
    const kp = this.rs.kamera.position, zl = this.rs.ziel;
    for (const m of [z.linieSicht, z.linieVerdeckt]) {
      m.uniforms.uTiefenGewicht.value = 0.9 * (1 - flach);
      m.uniforms.uRefTiefe.value = Math.hypot(kp.x - zl[0], kp.y - zl[1], kp.z - zl[2]);
    }
    z.linieSicht.uniforms.uAlpha.value = 0.92 * this.sichtbarkeit;
    z.linieVerdeckt.uniforms.uAlpha.value = (this.linse ? 0.3 : 0.17 * (1 - s)) * (1 - flach) * this.sichtbarkeit;
    const P = z.punktMat.uniforms;
    P.uFarbe.value.set(1, 1, 1);
    P.uHell.value.set(...TINTE);
    P.uWahl.value.set(...LILA);
    P.uGriff.value.set(...TINTE);
    P.uGriffEigen.value = 1;
    P.uDeck.value = this.sichtbarkeit * (this.phase === 'aufblasen' ? 0 : 1);
    P.uLampeMin.value = 0;
    z.punktMatVerdeckt.uniforms.uDeck.value = 0.3 * (1 - s) * (1 - flach) * this.sichtbarkeit;
  }

  obenLayout(c) {
    // Chrome zeigt eine nur geleerte 2D-Fläche manchmal mit einem alten Puffer: immer einen unsichtbaren Punkt zeichnen
    c.fillStyle = 'rgba(0,0,0,0.004)';
    c.fillRect(0, 0, 1, 1);
    if (this.vierer > 0.01) {
      const F = this.felder(), a = smooth(0.4, 1, this.vierer);
      c.save();
      c.strokeStyle = `rgba(30,28,35,${0.09 * a})`;
      c.lineWidth = 1;
      const x = (F.seite.x + F.seite.w + F.front.x) / 2, y = (F.seite.y + F.seite.h + F.top.y) / 2;
      c.beginPath();
      c.moveTo(x, F.seite.y + 8); c.lineTo(x, F.top.y + F.top.h - 8);
      c.moveTo(F.seite.x + 8, y); c.lineTo(F.front.x + F.front.w - 8, y);
      c.stroke();
      c.restore();
    }
    if (this.phase === 'stift') this.stiftZeichnen(c, 1);
    else if (this.phase === 'aufblasen' && this.anim.t < 0.3) this.stiftZeichnen(c, 1 - this.anim.t / 0.3);
    if (this.feder && this.zeit - this.feder.t0 > 0.3) {
      c.save();
      c.globalAlpha = 0.9;
      c.strokeStyle = 'rgba(30,28,35,0.55)';
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.lineWidth = 1;
      const x = this.W / 2 - 16, y = this.H - 54;
      c.beginPath(); c.roundRect(x, y, 32, 32, 7); c.fill(); c.stroke();
      c.fillStyle = '#1e1c23';
      c.font = '600 15px ui-monospace, Menlo, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText({ seite: '1', front: '3', top: '7' }[this.feder.n] || '', x + 16, y + 17);
      c.restore();
    }
  }
}
