// Zeichnen mit three.js: Jelly im Raum, Illustration (Papier, Platten, langer Schatten) für Seite, Front, Top,
// Linien als Bänder, Punkte als Scheiben, Wände, Strahlen, Spiegelglas.

import * as THREE from 'three';
import * as S from './shader.js';

THREE.ColorManagement.enabled = false;

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const farbe = (k) => new THREE.Vector3(...S.rgb(k));

// Wiederverwendbare Puffer: Attribute werden nie ersetzt (three.js gäbe ihre GPU-Puffer sonst nie frei),
// sondern nur befüllt; wächst der Bedarf, wird die ganze Geometrie ersetzt und die alte freigegeben.
class Puffer {
  constructor(mesh, attribute) {
    this.mesh = mesh;
    this.attribute = attribute; // { name: itemSize }
    this.kap = 0;
    this.kapIdx = 0;
  }
  sichern(nV, nI) {
    if (this.kap > 0 && nV <= this.kap && nI <= this.kapIdx) return;
    const alt = this.mesh.geometry;
    const g = new THREE.BufferGeometry();
    this.kap = Math.max(1024, Math.ceil(nV * 1.5));
    this.kapIdx = Math.max(2048, Math.ceil(nI * 1.5));
    for (const [name, k] of Object.entries(this.attribute)) {
      const a = new THREE.BufferAttribute(new Float32Array(this.kap * k), k);
      a.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(name, a);
    }
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(this.kapIdx), 1).setUsage(THREE.DynamicDrawUsage));
    for (const m of this.mesh.alle || [this.mesh]) m.geometry = g;
    if (alt) alt.dispose();
  }
  arr(name) { return this.mesh.geometry.attributes[name].array; }
  fertig(nV, nI) {
    const g = this.mesh.geometry;
    for (const name of Object.keys(this.attribute)) {
      const a = g.attributes[name];
      a.needsUpdate = true;
      a.clearUpdateRanges();
      a.addUpdateRange(0, nV * a.itemSize);
    }
    g.index.needsUpdate = true;
    g.index.clearUpdateRanges();
    g.index.addUpdateRange(0, nI);
    g.setDrawRange(0, nI);
  }
}

export class Zeichner {
  constructor(canvas) {
    this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.autoClear = false;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.r = r;
    this.zeit = 0;
    this.skala = 1; // Linien und Punkte in Bildpunkten × skala (Werkstatt: Pixeldichte, damit sie auf Retina gleich groß wirken)
    this.vollKamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.vollGeo = new THREE.PlaneGeometry(2, 2);
    this.ziele = new Map(); // Render-Ziele je Ansicht und Größe

    // gemeinsame Uniforms
    this.U = {
      uZeit: { value: 0 },
      uSeife: { value: 1 },
      uLinse: { value: new THREE.Vector3(0, 0, 0) },
      uAufl: { value: new THREE.Vector2(1, 1) },
      uEinfluss: { value: new THREE.Vector4(0, 0, 0, 0) },
    };

    this.jelly = new THREE.ShaderMaterial({
      vertexShader: S.jellyVS,
      fragmentShader: S.jellyFS,
      uniforms: {
        ...this.U,
        uHell: { value: farbe('jellyHell') },
        uMitte: { value: farbe('jellyMitte') },
        uTief: { value: farbe('jellyTief') },
        uKamera: { value: new THREE.Vector3() },
        uDurchsicht: { value: 1 },
        uGeist: { value: 0 },
        uGeistFarbe: { value: farbe('rosa') },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.papier = new THREE.ShaderMaterial({
      vertexShader: S.papierVS,
      fragmentShader: S.papierFS,
      uniforms: {
        ...this.U,
        uPapier: { value: farbe('papier') },
        uLavendel: { value: farbe('lavendel') },
        uPetrol: { value: farbe('petrol') },
        uBlick: { value: new THREE.Vector3() },
        uHinten: { value: 0 },
      },
      side: THREE.DoubleSide,
    });
    this.maske = new THREE.ShaderMaterial({
      vertexShader: S.papierVS,
      fragmentShader: S.maskeFS,
      uniforms: { uNah: { value: 0 }, uFern: { value: 10 } },
      side: THREE.DoubleSide,
    });
    this.nurTiefe = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });

    this.saat = new THREE.ShaderMaterial({ vertexShader: S.vollbildVS, fragmentShader: S.saatFS, uniforms: { uMaske: { value: null }, uAufl: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
    this.flut = new THREE.ShaderMaterial({ vertexShader: S.vollbildVS, fragmentShader: S.flutFS, uniforms: { uFeld: { value: null }, uAufl: { value: new THREE.Vector2() }, uSchritt: { value: 1 } }, depthTest: false, depthWrite: false });
    this.illu = new THREE.ShaderMaterial({
      vertexShader: S.vollbildVS,
      fragmentShader: S.illuFS,
      uniforms: {
        uFeldA: { value: null }, uFeldB: { value: null }, uKoerper: { value: null }, uMaske: { value: null },
        uAufl: { value: new THREE.Vector2() }, uPx: { value: 1 },
        uGrund: { value: farbe('grund') }, uPetrol: { value: farbe('petrol') }, uRosa: { value: farbe('rosa') }, uLila: { value: farbe('lila') },
        uKontur: { value: 0.07 }, uPasser: { value: 0.016 }, uSchatten: { value: 0.36 }, uHinten: { value: 0 }, uPose: { value: 0 }, uSchattenLang: { value: 4000 }, uDeck: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.vollMesh = new THREE.Mesh(this.vollGeo, this.illu);
    this.vollMesh.frustumCulled = false;
    this.vollSzene = new THREE.Scene();
    this.vollSzene.add(this.vollMesh);

    this.linienMat = (verdeckt) =>
      new THREE.ShaderMaterial({
        vertexShader: S.linieVS,
        fragmentShader: S.linieFS,
        uniforms: {
          uAufl: this.U.uAufl, uZeit: this.U.uZeit,
          uBreite: { value: 1.3 }, uBreiteKante: { value: 3.6 },
          uFarbe: { value: farbe('petrol') }, uWahl: { value: farbe('lila') }, uHell: { value: new THREE.Vector3(1, 1, 1) },
          uVerdeckt: { value: verdeckt ? 1 : 0 }, uStrich: { value: 6 }, uAlpha: { value: verdeckt ? 0.22 : 1 }, uGestrichelt: { value: 1 },
          uTiefe: { value: null }, uMitTiefe: { value: 0 }, uRect: { value: new THREE.Vector4() }, uTiefenGewicht: { value: 0 }, uRefTiefe: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        depthFunc: verdeckt ? THREE.GreaterDepth : THREE.LessEqualDepth,
      });
    this.linieSicht = this.linienMat(false);
    this.linieVerdeckt = this.linienMat(true);
    this.punktMat = new THREE.ShaderMaterial({
      vertexShader: S.punktVS,
      fragmentShader: S.punktFS,
      uniforms: { uAufl: this.U.uAufl, uZeit: this.U.uZeit, uFarbe: { value: farbe('petrol') }, uWahl: { value: farbe('lila') }, uHell: { value: new THREE.Vector3(1, 1, 1) }, uLampe: { value: new THREE.Vector3(0, 0, 0) }, uSkala: { value: 1 }, uDeck: { value: 1 }, uLampeMin: { value: 0.16 }, uGriff: { value: new THREE.Vector3(0, 0, 0) }, uGriffEigen: { value: 0 } },
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });
    this.punktMatVerdeckt = this.punktMat.clone();
    this.punktMatVerdeckt.uniforms = this.punktMat.uniforms;
    this.punktMatVerdeckt.depthFunc = THREE.GreaterDepth;
    this.punktMatVerdeckt.opacity = 0.3;

    this.strahlMat = new THREE.ShaderMaterial({
      vertexShader: S.linieVS,
      fragmentShader: S.strahlFS,
      uniforms: { uAufl: this.U.uAufl, uZeit: this.U.uZeit, uBreite: { value: 1.6 }, uBreiteKante: { value: 1.6 }, uFarbe: { value: farbe('flieder') }, uAlpha: { value: 0.9 } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.glasMat = new THREE.ShaderMaterial({
      vertexShader: S.wandVS,
      fragmentShader: S.glasFS,
      uniforms: { uZeit: this.U.uZeit, uAlpha: { value: 0 }, uFarbe: { value: new THREE.Vector3(0.75, 1.0, 1.0) } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.koerper = null;
    const LA = { position: 3, vor: 3, nach: 3, seite: 1, kante: 1, bogen: 1, zustand: 1, tusche: 1, gewicht: 1 };
    this.linienSicht = new THREE.Mesh(new THREE.BufferGeometry(), this.linieSicht);
    this.linienVerd = new THREE.Mesh(new THREE.BufferGeometry(), this.linieVerdeckt);
    this.linienSicht.alle = [this.linienSicht, this.linienVerd];
    this.linienPuffer = new Puffer(this.linienSicht, LA);
    this.punkte = new THREE.Mesh(new THREE.BufferGeometry(), this.punktMat);
    this.punkteVerd = new THREE.Mesh(new THREE.BufferGeometry(), this.punktMatVerdeckt);
    this.punkte.alle = [this.punkte, this.punkteVerd];
    this.punktPuffer = new Puffer(this.punkte, { position: 3, mitte: 3, groesse: 1, zustand: 1, ecke: 2 });
    this.strahlen = new THREE.Mesh(new THREE.BufferGeometry(), this.strahlMat);
    this.strahlPuffer = new Puffer(this.strahlen, LA);
    this.glas = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.glasMat);
    for (const m of [this.linienSicht, this.linienVerd, this.punkte, this.punkteVerd, this.strahlen, this.glas]) m.frustumCulled = false;
    this.linienSicht.renderOrder = 2;
    this.linienVerd.renderOrder = 1;
    this.punkte.renderOrder = 4;
    this.punkteVerd.renderOrder = 3;
    this.strahlen.renderOrder = 5;

    this.szeneKoerper = new THREE.Scene();
    this.szeneLinien = new THREE.Scene();
    this.szeneLinien.add(this.linienVerd, this.linienSicht, this.punkteVerd, this.punkte);
    this.szeneStrahlen = new THREE.Scene();
    this.szeneStrahlen.add(this.strahlen);
    this.szeneGlas = new THREE.Scene();
    this.szeneGlas.add(this.glas);
    this.szeneWaende = new THREE.Scene();
    this.wandMat = {};
    this.waende = {};
    for (const k of ['seite', 'front', 'top']) {
      const m = new THREE.ShaderMaterial({ vertexShader: S.wandVS, fragmentShader: S.wandFS, uniforms: { uBild: { value: null }, uHell: { value: 1 }, uAlpha: { value: 1 } }, side: THREE.DoubleSide, transparent: true });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      const w = new THREE.Mesh(g, m);
      w.frustumCulled = false;
      this.wandMat[k] = m;
      this.waende[k] = w;
      this.szeneWaende.add(w);
    }
  }

  wandSetzen(name, ecken) {
    const a = this.waende[name].geometry.attributes.position;
    ecken.forEach((p, i) => a.setXYZ(i, p[0], p[1], p[2]));
    a.needsUpdate = true;
  }

  groesse(w, h) {
    this.r.setSize(w, h, false);
    this.breite = w;
    this.hoehe = h;
    this.dpr = this.r.getPixelRatio();
  }

  netzSetzen(netz) {
    if (this.koerper) {
      this.szeneKoerper.remove(this.koerper);
      this.koerper.geometry.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(netz.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(netz.nrm, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('ruhe', new THREE.BufferAttribute(netz.ruhe, 3));
    this.bewegt = new Float32Array(netz.nV);
    this.maulAttr = new Float32Array(netz.nV);
    g.setAttribute('bewegt', new THREE.BufferAttribute(this.bewegt, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('maul', new THREE.BufferAttribute(this.maulAttr, 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(netz.tri, 1));
    const m = new THREE.Mesh(g, this.jelly);
    m.frustumCulled = false;
    this.koerper = m;
    this.szeneKoerper.add(m);
    this.netz = netz;
  }

  netzAktualisieren() {
    this.netzVersion = (this.netzVersion || 0) + 1;
    const g = this.koerper.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.bewegt.needsUpdate = true;
    g.attributes.maul.needsUpdate = true;
  }

  // Züge: [{ pts:[[x,y,z]], kante:[], zu, zustand, tusche:[] }] → ein Bänder-Netz
  linienSetzen(zuege, puffer = this.linienPuffer) {
    let n = 0, ni = 0;
    for (const z of zuege) {
      const m = z.pts.length;
      if (m < 2) continue;
      n += (z.zu ? m + 1 : m) * 2;
      ni += (z.zu ? m : m - 1) * 6;
    }
    puffer.sichern(n, ni);
    const pos = puffer.arr('position'), vor = puffer.arr('vor'), nach = puffer.arr('nach');
    const seite = puffer.arr('seite'), kante = puffer.arr('kante'), bogen = puffer.arr('bogen'), zustand = puffer.arr('zustand'), tusche = puffer.arr('tusche'), gewicht = puffer.arr('gewicht');
    const idx = puffer.mesh.geometry.index.array;
    let o = 0, oi = 0;
    for (const z of zuege) {
      const P = z.pts, m = P.length;
      if (m < 2) continue;
      const zahl = z.zu ? m + 1 : m;
      let b = 0;
      const start = o;
      for (let k = 0; k < zahl; k++) {
        const i = k % m;
        const pv = P[z.zu ? (i - 1 + m) % m : Math.max(0, i - 1)];
        const pn = P[z.zu ? (i + 1) % m : Math.min(m - 1, i + 1)];
        if (k > 0) {
          const q = P[(k - 1) % m];
          b += Math.hypot(P[i][0] - q[0], P[i][1] - q[1], P[i][2] - q[2]);
        }
        const ka = z.kante ? z.kante[i] : 0, zu = z.zustandJe ? z.zustandJe[i] : z.zustand || 0, tu = z.tusche ? z.tusche[i] : 0;
        for (let s = -1; s <= 1; s += 2) {
          const o3 = o * 3;
          pos[o3] = P[i][0]; pos[o3 + 1] = P[i][1]; pos[o3 + 2] = P[i][2];
          vor[o3] = pv[0]; vor[o3 + 1] = pv[1]; vor[o3 + 2] = pv[2];
          nach[o3] = pn[0]; nach[o3 + 1] = pn[1]; nach[o3 + 2] = pn[2];
          seite[o] = s; kante[o] = ka; bogen[o] = b; zustand[o] = zu; tusche[o] = tu; gewicht[o] = z.gewicht ?? 1;
          o++;
        }
      }
      for (let k = 0; k < zahl - 1; k++) {
        const a = start + 2 * k;
        idx[oi++] = a; idx[oi++] = a + 1; idx[oi++] = a + 2;
        idx[oi++] = a + 1; idx[oi++] = a + 3; idx[oi++] = a + 2;
      }
    }
    puffer.fertig(o, oi);
  }

  // Punkte: [{ p:[x,y,z], gr (px), zustand }]
  punkteSetzen(liste) {
    const n = liste.length;
    const P = this.punktPuffer;
    P.sichern(n * 4, n * 6);
    const pos = P.arr('position'), mitte = P.arr('mitte'), gr = P.arr('groesse'), zu = P.arr('zustand'), ecke = P.arr('ecke');
    const idx = this.punkte.geometry.index.array;
    const E = [-1, -1, 1, -1, 1, 1, -1, 1];
    for (let i = 0; i < n; i++) {
      const q = liste[i];
      for (let k = 0; k < 4; k++) {
        const v = 4 * i + k;
        mitte[3 * v] = pos[3 * v] = q.p[0];
        mitte[3 * v + 1] = pos[3 * v + 1] = q.p[1];
        mitte[3 * v + 2] = pos[3 * v + 2] = q.p[2];
        gr[v] = q.gr;
        zu[v] = q.zustand;
        ecke[2 * v] = E[2 * k];
        ecke[2 * v + 1] = E[2 * k + 1];
      }
      idx[6 * i] = 4 * i; idx[6 * i + 1] = 4 * i + 1; idx[6 * i + 2] = 4 * i + 2;
      idx[6 * i + 3] = 4 * i; idx[6 * i + 4] = 4 * i + 2; idx[6 * i + 5] = 4 * i + 3;
    }
    P.fertig(n * 4, n * 6);
  }

  strahlenSetzen(zuege) {
    this.linienSetzen(zuege, this.strahlPuffer);
  }

  ziel(name, w, h, opt = {}) {
    const k = name;
    let z = this.ziele.get(k);
    if (!z || z.width !== w || z.height !== h) {
      if (z) z.dispose();
      z = new THREE.WebGLRenderTarget(w, h, {
        type: opt.typ || THREE.UnsignedByteType,
        minFilter: opt.filter || THREE.LinearFilter,
        magFilter: opt.filter || THREE.LinearFilter,
        depthBuffer: opt.tiefe !== false,
        samples: opt.samples || 0,
      });
      this.ziele.set(k, z);
    }
    return z;
  }

  // Achtung: setViewport rechnet in three.js immer mit der Pixeldichte, auch bei einem Renderziel. In Renderziele deshalb
  // nie setViewport aufrufen; sie zeichnen von selbst über ihre ganze Größe.
  voll(material, ziel, w, h) {
    this.vollMesh.material = material;
    this.r.setRenderTarget(ziel);
    this.r.render(this.vollSzene, this.vollKamera);
  }

  // Abstandsfeld zur Silhouette aus einer Maske (Sprungflutung)
  feld(name, maske, w, h) {
    const a = this.ziel(name + ':a', w, h, { typ: THREE.HalfFloatType, filter: THREE.NearestFilter, tiefe: false });
    const b = this.ziel(name + ':b', w, h, { typ: THREE.HalfFloatType, filter: THREE.NearestFilter, tiefe: false });
    this.saat.uniforms.uMaske.value = maske.texture;
    this.saat.uniforms.uAufl.value.set(w, h);
    this.voll(this.saat, a, w, h);
    let von = a, nach = b;
    let schritt = 1;
    while (schritt * 2 < Math.max(w, h)) schritt *= 2;
    this.flut.uniforms.uAufl.value.set(w, h);
    for (; schritt >= 1; schritt /= 2) {
      this.flut.uniforms.uFeld.value = von.texture;
      this.flut.uniforms.uSchritt.value = schritt;
      this.voll(this.flut, nach, w, h);
      [von, nach] = [nach, von];
    }
    return von;
  }

  // Eine Ansicht als Illustration zeichnen. sicht: { name, kamera, w, h, px (Bildpunkte je Einheit), hinten, pose }
  // ziel: null (Bildschirm, Ausschnitt sicht.rect in CSS-Pixeln) oder ein Render-Ziel.
  illustration(sicht, ziel, ueberlagern) {
    const r = this.r;
    const w = Math.max(8, Math.round(sicht.w)), h = Math.max(8, Math.round(sicht.h));
    const kam = sicht.kamera;
    this.U.uAufl.value.set(w, h);
    // 1. Maske (Pose) und Körper
    const maske = this.ziel(sicht.name + ':maske', w, h);
    this.koerper.material = this.maske;
    this.maske.uniforms.uNah.value = kam.near;
    this.maske.uniforms.uFern.value = kam.far;
    r.setRenderTarget(maske);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(this.szeneKoerper, kam);
    const feldB = this.feld(sicht.name + ':fb', maske, w, h);
    let feldA = feldB;
    if (sicht.grundMaske) {
      // Grundform als zweite Platte (Passer = Pose gegen Grundform)
      const mg = this.ziel(sicht.name + ':maskeGrund', w, h);
      sicht.grundMaske(mg, kam, w, h);
      feldA = this.feld(sicht.name + ':fa', mg, w, h);
    }
    const koerperZiel = this.ziel(sicht.name + ':koerper', w, h);
    this.koerper.material = this.papier;
    this.papier.uniforms.uHinten.value = sicht.hinten ? 1 : 0;
    r.setRenderTarget(koerperZiel);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(this.szeneKoerper, kam);
    // 2. Bild zusammensetzen
    const U = this.illu.uniforms;
    U.uFeldA.value = feldA.texture;
    U.uFeldB.value = feldB.texture;
    U.uKoerper.value = koerperZiel.texture;
    U.uMaske.value = maske.texture;
    U.uAufl.value.set(w, h);
    U.uPx.value = sicht.px;
    U.uHinten.value = sicht.hinten ? 1 : 0;
    U.uGrund.value.set(...(sicht.grund || (sicht.hinten ? S.rgb('grundHinten') : S.rgb('grund'))));
    if (ziel) {
      this.voll(this.illu, ziel, w, h);
    } else {
      const rc = sicht.rect;
      const H = this.hoehe;
      r.setRenderTarget(null);
      r.setViewport(rc.x, H - rc.y - rc.h, rc.w, rc.h);
      r.setScissor(rc.x, H - rc.y - rc.h, rc.w, rc.h);
      r.setScissorTest(true);
      // Feldkoordinaten sind die des Ziels: Shader liest gl_FragCoord → wir zeichnen in ein Zwischenziel und kopieren
      const zw = this.ziel(sicht.name + ':bild', w, h);
      this.voll(this.illu, zw, w, h);
      r.setRenderTarget(null);
      r.setViewport(rc.x, H - rc.y - rc.h, rc.w, rc.h);
      if (!this.kopie) {
        this.kopie = new THREE.MeshBasicMaterial({ map: zw.texture, depthTest: false, depthWrite: false });
      }
      this.kopie.map = zw.texture;
      this.vollMesh.material = this.kopie;
      r.render(this.vollSzene, this.vollKamera);
    }
    // 3. Tiefe des Körpers, dann Linien und Punkte
    if (ziel) r.setRenderTarget(ziel);
    r.clearDepth();
    this.koerper.material = this.nurTiefe;
    r.render(this.szeneKoerper, kam);
    this.breiten(1.3);
    this.linienFarben('papier');
    if (ueberlagern) ueberlagern(kam, w, h);
    if (!sicht.ohneLinien) r.render(this.szeneLinien, kam);
    r.setScissorTest(false);
  }

  breiten(b) {
    for (const m of [this.linieSicht, this.linieVerdeckt]) {
      m.uniforms.uBreite.value = b * this.skala;
      m.uniforms.uBreiteKante.value = 3.6 * this.skala;
    }
    this.punktMat.uniforms.uSkala.value = this.skala;
  }

  linienFarben(art) {
    const papier = art === 'papier';
    const hinten = art === 'hinten';
    for (const m of [this.linieSicht, this.linieVerdeckt]) {
      m.uniforms.uFarbe.value.set(...(papier ? S.rgb('petrol') : hinten ? [1, 1, 1] : [1, 1, 1]));
      m.uniforms.uWahl.value.set(...S.rgb(papier ? 'lila' : 'flieder'));
    }
    this.punktMat.uniforms.uFarbe.value.set(...(papier ? S.rgb('petrol') : [0.02, 0.2, 0.24]));
    this.punktMat.uniforms.uHell.value.set(1, 1, 1);
  }

  // 3D: Raum mit Wänden, Jelly, Linien, Strahlen, Glas
  raum(kam, rect, opt = {}) {
    const r = this.r;
    const H = this.hoehe;
    r.setRenderTarget(null);
    r.setViewport(rect.x, H - rect.y - rect.h, rect.w, rect.h);
    r.setScissor(rect.x, H - rect.y - rect.h, rect.w, rect.h);
    r.setScissorTest(true);
    r.setClearColor(new THREE.Color(...S.rgb('raum')), 1);
    if (opt.klar === false) r.clearDepth();
    else r.clear(true, true, true);
    this.U.uAufl.value.set(rect.w * this.dpr, rect.h * this.dpr);
    if (opt.waende) r.render(this.szeneWaende, kam);
    r.clearDepth();
    this.koerper.material = this.jelly;
    this.jelly.uniforms.uKamera.value.copy(kam.position);
    this.breiten(1.7);
    if (opt.geister) for (const g of opt.geister) g(kam);
    r.render(this.szeneKoerper, kam);
    this.linienFarben('jelly');
    r.render(this.szeneLinien, kam);
    if (opt.glas) r.render(this.szeneGlas, kam);
    if (opt.strahlen) r.render(this.szeneStrahlen, kam);
    r.setScissorTest(false);
  }
}

export { THREE };
