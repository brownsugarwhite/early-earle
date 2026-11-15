/**
 * Probe „Anfang einer Form“ (Florian, 15.11.2026): ein fast leeres Blatt mit „draw a silhouette“, ein Loop mit P, ↩ zieht den Ring
 * zurück und der Fahrtwind bläst die Seifenhaut zur Form auf. Seite: `anfang.html`. Konzept:
 * `docs/plans/2026-11-15-anfang-seifenhaut.md`.
 *
 * Zwei Leinwände übereinander: unten die Haut (three.js, `haut.ts`), oben Linien, Punkte und Zeiger (flüssige Anzeige, Kopie aus
 * dem Linien-Strang). Welt = CSS-Pixel des Blatts, y nach oben, Mitte des Fensters im Ursprung; im ersten Bild nach ↩ sieht die
 * Kamera das Blatt genau so, wie es gezeichnet wurde.
 */

import { Matrix4, PerspectiveCamera, Vector2, Vector3, WebGLRenderer } from 'three';
import { DAUER, type Moment, moment } from './aufblasen';
import { reglerBauen, type Werte, werteLesen } from './regler';
import { FluessigeAnzeige, type Koerper as AnzeigeKoerper, type Szene } from './fluessig';
import { Koerper, type Lage, netzAusUmriss } from './form';
import { FASSUNGEN, type Fassung, Haut, type HautWerte } from './haut';
import { Kapseln, LOOK, Stift } from './stift';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
// ?bild=1: ohne Leiste und Zeiger (Vergleichsbilder); ?film=1: ohne Leiste, mit Zeiger
if (params.get('bild') === '1' || params.get('film') === '1') document.body.classList.add('bild');
const mitZeigerImBild = params.get('film') === '1';
const mitInfo = params.get('info') === '1';

const buehne = $<HTMLDivElement>('buehne');
const leinwandHaut = $<HTMLCanvasElement>('haut');
const leinwandLinien = $<HTMLCanvasElement>('linien');
const gruss = $<HTMLDivElement>('gruss');
const hinweis = $<HTMLDivElement>('hinweis');
const infoAnzeige = $<HTMLSpanElement>('info');

const renderer = new WebGLRenderer({ canvas: leinwandHaut, antialias: false, alpha: false, powerPreference: 'high-performance' });
const haut = new Haut(renderer);
const anzeige = new FluessigeAnzeige(leinwandLinien);
const stift = new Stift();
const K = new Kapseln();
const kamera = new PerspectiveCamera(26, 1, 1, 1e6);

type Zustand = 'blatt' | 'auf' | 'ruhe' | 'ab';
let zustand: Zustand = 'blatt';
/** Zeit seit ↩ (s); im Film von außen gesetzt */
let T = 0;
let festeZeit: number | null = null;
let fassung: Fassung = Number(params.get('fassung') ?? 0) as Fassung;
let nacht = params.get('nacht') === '1';
let W = 1;
let H = 1;
let D = 1;
let L0 = 1;
let koerper: Koerper | null = null;
let netzStand = -1;
let netzZeit = 0;
/** Einblenden der Haut nach dem Schließen (0..1) */
let film = 0;
/** Uhr des Materials (s) */
let uhr = 0;
const nutzer = { gier: 0, neigung: 0, zoom: 1 };
let drehen: { x: number; y: number; gier: number; neigung: number } | null = null;
let zug: { x: number; y: number; start: Float32Array; gewicht: Float32Array; zFaktor: Float32Array; hinten: boolean; tiefe: number } | null = null;
const hauch = { pos: new Vector3(1e6, 1e6, 1e6), staerke: 0, ziel: 0 };
const wind = new Vector2();
let letzteDrehung = { gier: 0, neigung: 0 };
let unruhe = 0;
let netzId = 0;
/** Werte der Feinregler (Ablauf und Material), im Browser behalten */
const werte: Werte = werteLesen();
const stat = { fps: 0, bildMs: 0, netzMs: 0, punkte: 0, dreiecke: 0, fehlend: 0, schritte: 0 };

const TINTE: [number, number, number] = [0x1f / 255, 0x1a / 255, 0x17 / 255];
const GRUEN: [number, number, number] = [0xb9 / 255, 0xd1 / 255, 0xb4 / 255];
const TINTE_NACHT: [number, number, number] = [0xf1 / 255, 0xec / 255, 0xe3 / 255];
const GRUEN_NACHT: [number, number, number] = [0x4f / 255, 0x6e / 255, 0x66 / 255];
const PAPIER_RGB: [number, number, number] = [1, 1, 1];
const NACHT_RGB: [number, number, number] = [0x12 / 255, 0x1a / 255, 0x28 / 255];

// ---------- Größe ----------

function groesse(): void {
  const r = buehne.getBoundingClientRect();
  W = Math.max(1, r.width);
  H = Math.max(1, r.height);
  D = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(D);
  renderer.setSize(W, H, false);
  haut.groesse(W, H, D);
  anzeige.groesse(W * D, H * D);
  kamera.aspect = W / H;
  L0 = H / 2 / Math.tan((kamera.fov * Math.PI) / 360);
  kamera.near = L0 * 0.05;
  kamera.far = L0 * 20;
  kamera.updateProjectionMatrix();
  if (zustand === 'blatt') netzStand = -1;
  anstossen();
}

// ---------- Netz ----------

const flachLage = (): Lage => ({ zr: 0, vorn: 0, hinten: 0, quer: 0, welle: 0, phase: 0, zu: 0 });

function netzBauen(): void {
  netzStand = stift.stand;
  if (!stift.geschlossen) {
    koerper = null;
    haut.setzeKoerper(null);
    return;
  }
  const ab = stift.abtasten(1);
  const flach = netzAusUmriss({ x: ab.x.map((x) => x - W / 2), y: ab.y.map((y) => H / 2 - y), anker: ab.anker });
  koerper = new Koerper(flach);
  koerper.fuelle = werte.fuelle;
  koerper.setzen(flachLage());
  koerper.dehnungRechnen();
  haut.setzeKoerper(koerper);
  haut.hochladen();
  netzId++;
  netzZeit = performance.now();
  Object.assign(stat, { netzMs: flach.stat.ms, punkte: flach.stat.punkte, dreiecke: flach.stat.dreiecke, fehlend: flach.stat.fehlendeRandkanten, schritte: flach.stat.schritte });
}

// ---------- Ablauf ----------

function aufblasen(): void {
  if (!stift.geschlossen) return;
  if (!koerper || netzStand !== stift.stand) netzBauen();
  if (!koerper) return;
  koerper.versatz.fill(0);
  koerper.bezugFlach();
  zustand = 'auf';
  T = 0;
  film = 1;
  anstossen();
}

function ablassen(): void {
  if (zustand === 'blatt') return;
  zug = null;
  drehen = null;
  zustand = 'ab';
  T = Math.min(T, DAUER);
  anstossen();
}

function nochEinmal(): void {
  if (zustand === 'blatt') {
    aufblasen();
    return;
  }
  if (!koerper) return;
  koerper.versatz.fill(0);
  koerper.bezugFlach();
  nutzer.gier = 0;
  nutzer.neigung = 0;
  nutzer.zoom = 1;
  zustand = 'auf';
  T = 0;
  anstossen();
}

function neu(): void {
  zustand = 'blatt';
  T = 0;
  stift.abbrechen();
  koerper = null;
  haut.setzeKoerper(null);
  nutzer.gier = 0;
  nutzer.neigung = 0;
  nutzer.zoom = 1;
  film = 0;
  anstossen();
}

// ---------- Kamera ----------

function kameraSetzen(m: Moment | null): void {
  const F = koerper?.flach;
  const Dr = werte.rueck * L0;
  const f = m ? m.fahrt : 0;
  const d = m ? m.dreh : 0;
  const ziel = new Vector3((F?.cx ?? 0) * f, (F?.cy ?? 0) * f, -Dr * f);
  const abstand = (L0 + 0.85 * Dr * f) * (1 + (nutzer.zoom - 1) * d);
  const gier = ((werte.gier * Math.PI) / 180 + nutzer.gier) * d;
  const neigung = ((werte.neigung * Math.PI) / 180 + nutzer.neigung) * d;
  kamera.position.set(ziel.x + abstand * Math.sin(gier) * Math.cos(neigung), ziel.y + abstand * Math.sin(neigung), ziel.z + abstand * Math.cos(gier) * Math.cos(neigung));
  kamera.up.set(0, 1, 0);
  kamera.lookAt(ziel);
  kamera.updateMatrixWorld();
}

// ---------- Bild ----------

let laeuft = false;
let letzte = 0;
let bilder = 0;
let bilderSeit = performance.now();

function anstossen(): void {
  if (laeuft) return;
  laeuft = true;
  letzte = performance.now();
  requestAnimationFrame(schleife);
}

/** Film: der Takt des Browsers rechnet nichts, nur `__anfang.bild` (Bild für Bild genau wiederholbar) */
let angehalten = false;

function schleife(t: number): void {
  const dt = Math.min(1 / 30, Math.max(0, (t - letzte) / 1000));
  letzte = t;
  if (angehalten) {
    laeuft = false;
    return;
  }
  const aktiv = bild(dt);
  bilder++;
  if (t - bilderSeit > 500) {
    stat.fps = (bilder * 1000) / (t - bilderSeit);
    bilder = 0;
    bilderSeit = t;
  }
  if (aktiv || festeZeit !== null) requestAnimationFrame(schleife);
  else laeuft = false;
}

function projizieren(p: Vector3, vp: Matrix4, ansicht: Matrix4): [number, number, number] {
  const c = p.clone().applyMatrix4(vp);
  const e = p.clone().applyMatrix4(ansicht);
  return [(c.x * 0.5 + 0.5) * W * D, (0.5 - c.y * 0.5) * H * D, -e.z];
}

/** ein Bild; true: es bewegt sich noch etwas */
function bild(dt: number): boolean {
  const t0 = performance.now();
  let aktiv = false;
  if (festeZeit !== null) dt = 1 / 60;
  // im Film läuft die Uhr des Materials mit der Zeit des Aufblasens (Bilder genau wiederholbar)
  uhr = festeZeit !== null ? 7 + festeZeit : uhr + dt;
  aktiv = stift.schritt(dt) || aktiv;
  // Netz zum Loop (beim Ziehen von Punkten höchstens alle 120 ms)
  if (zustand === 'blatt' && netzStand !== stift.stand && (!stift.zieht || performance.now() - netzZeit > 120)) netzBauen();
  if (zustand === 'blatt' && stift.geschlossen && film < 1) {
    film = Math.min(1, film + dt / 0.6);
    aktiv = true;
  }
  if (zustand === 'blatt' && !stift.geschlossen) film = 0;
  // Zeit des Aufblasens
  let m: Moment | null = null;
  if (zustand !== 'blatt' && koerper) {
    if (festeZeit !== null) T = festeZeit;
    else if (zustand === 'auf') T += dt;
    else if (zustand === 'ab') T -= dt * 1.5;
    if (zustand === 'auf' && T >= DAUER) zustand = 'ruhe';
    if (zustand === 'ab' && T <= 0) {
      T = 0;
      zustand = 'blatt';
      koerper.versatz.fill(0);
      nutzer.gier = 0;
      nutzer.neigung = 0;
      nutzer.zoom = 1;
    }
    m = moment(Math.max(0, Math.min(T, DAUER)), werte.rueck * L0, werte);
    if (zustand !== 'ruhe' || zug) {
      koerper.setzen(zustand === 'blatt' ? flachLage() : m.lage);
    }
    // Farben der Dehnung: während des Aufblasens bezogen auf den flachen Film, danach beruhigen sie sich
    const tau = zustand === 'auf' && T < 1.1 ? 0 : zug ? 3.5 : 1.6;
    unruhe = koerper.dehnungRechnen(dt, tau);
    haut.hochladen();
    aktiv = aktiv || zustand !== 'ruhe' || unruhe > 2e-3 || zug !== null;
  } else if (koerper && zustand === 'blatt') {
    koerper.setzen(flachLage());
    koerper.dehnungRechnen();
    haut.hochladen();
  }
  kameraSetzen(zustand === 'blatt' ? null : m);
  // Fahrtwind: die Farben fließen gegen die Drehung
  const gierJetzt = Math.atan2(kamera.position.x - (koerper?.flach.cx ?? 0), kamera.position.z);
  const neigungJetzt = kamera.position.y;
  if (dt > 0) {
    const dg = gierJetzt - letzteDrehung.gier;
    const dn = (neigungJetzt - letzteDrehung.neigung) / Math.max(1, L0);
    wind.x -= dg * 0.9;
    wind.y += dn * 0.9;
  }
  letzteDrehung = { gier: gierJetzt, neigung: neigungJetzt };
  // Hauch: Feder zur Lage des Zeigers auf der Haut
  hauch.staerke += (hauch.ziel - hauch.staerke) * (1 - Math.exp(-dt / 0.18));
  if (Math.abs(hauch.ziel - hauch.staerke) > 1e-3) aktiv = true;
  if (zustand === 'ruhe') aktiv = aktiv || hauch.staerke > 1e-3;
  // Haut
  const F = koerper?.flach;
  const w: HautWerte = {
    fassung,
    nacht,
    zeit: uhr,
    vorn: zustand === 'blatt' ? film : 1,
    hinten: m ? m.hintenSichtbar : 0,
    deckung: zustand === 'blatt' ? 0.42 * film : 0.42 + 0.58 * (m?.fertig ?? 1),
    hauch: hauch.pos,
    hauchStaerke: hauch.staerke,
    hauchRadius: Math.max(24, (F?.radius ?? 200) * 0.2),
    wind,
    dicke: werte.dicke,
    spannung: werte.spannung,
    sicht: werte.sicht,
  };
  haut.zeichnen(kamera, w);
  // Linien
  K.leeren();
  let koerperAnzeige: AnzeigeKoerper | null = null;
  if (zustand === 'blatt') {
    stift.kapseln(K, D, true);
  } else if (koerper && F) {
    const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    const ansicht = kamera.matrixWorldInverse;
    const nb = F.nb;
    const sx = new Float32Array(nb);
    const sy = new Float32Array(nb);
    const sz = new Float32Array(nb);
    const p = new Vector3();
    for (let i = 0; i < nb; i++) {
      p.set(koerper.pos[i * 3]!, koerper.pos[i * 3 + 1]!, koerper.pos[i * 3 + 2]!);
      const [a, b, c] = projizieren(p, vp, ansicht);
      sx[i] = a;
      sy[i] = b;
      sz[i] = c;
    }
    const g = K.neueGruppe();
    const r = (LOOK.umriss / 2) * D;
    for (let i = 0; i < nb; i++) {
      const j = (i + 1) % nb;
      K.push(sx[i]!, sy[i]!, sx[j]!, sy[j]!, r, r, g, 2, false, sz[i]!, sz[j]!);
    }
    for (const a of F.anker) K.push(sx[a]!, sy[a]!, sx[a]!, sy[a]!, LOOK.punktRadius * D, LOOK.punktRadius * D, K.neueGruppe(), 2, true, sz[a]!, sz[a]!);
    if (stift.zeiger.da) K.felder.push(stift.zeiger.x * D, stift.zeiger.y * D, 22 * D, 0.7);
    koerperAnzeige = {
      pos: koerper.pos,
      normal: koerper.normal,
      index: koerper.index,
      projektion: new Float32Array(vp.elements),
      ansicht: new Float32Array(ansicht.elements),
      schattierung: 0,
      umriss: 0,
      geaendert: true,
      netz: netzId,
      wicklung: 1,
    };
  }
  const szene: Szene = {
    prim: K.puffer,
    anzahl: K.n,
    k0: 0,
    k1: LOOK.weich * D,
    felder: K.felder,
    tinte: nacht ? TINTE_NACHT : TINTE,
    gruen: nacht ? GRUEN_NACHT : GRUEN,
    zeiger: stift.zeiger.da && (!document.body.classList.contains('bild') || mitZeigerImBild) ? Stift.zeigerForm(stift.zeiger.x, stift.zeiger.y, D) : null,
    koerper: koerperAnzeige,
    bias: Math.max(2, (F?.radius ?? 100) * 0.02),
    koerperZeigen: false,
    papier: nacht ? NACHT_RGB : PAPIER_RGB,
  };
  anzeige.zeichnen(szene);
  // Text
  gruss.classList.toggle('weg', !(zustand === 'blatt' && stift.leer));
  const h =
    zustand === 'blatt'
      ? stift.geschlossen
        ? '↩ aufblasen'
        : stift.leer
          ? ''
          : 'am ersten Punkt schließen · ↩ schließt · ⌫ zurück'
      : zustand === 'ruhe'
        ? 'daneben ziehen: drehen · an der Haut ziehen: dehnen · Leertaste: noch einmal · Esc: zurück aufs Blatt'
        : '';
  if (hinweis.textContent !== h) hinweis.textContent = h;
  stat.bildMs = performance.now() - t0;
  if (mitInfo)
    infoAnzeige.textContent = `${stat.fps.toFixed(0)} B/s · Bild ${stat.bildMs.toFixed(1)} ms · Netz ${stat.punkte} P, ${stat.dreiecke} D, ${stat.netzMs.toFixed(0)} ms, ${stat.schritte} Schritte, ${stat.fehlend} fehlend · ${zustand} ${T.toFixed(2)} s`;
  return aktiv;
}

// ---------- Eingaben ----------

function lageIm(e: PointerEvent | WheelEvent): [number, number] {
  const r = leinwandLinien.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

function strahl(x: number, y: number): { o: Vector3; d: Vector3 } {
  const p = new Vector3((x / W) * 2 - 1, 1 - (y / H) * 2, 0.5).unproject(kamera);
  const o = kamera.position.clone();
  return { o, d: p.sub(o).normalize() };
}

function hauchSuchen(x: number, y: number): void {
  if (!koerper || zustand !== 'ruhe') {
    hauch.ziel = 0;
    return;
  }
  const { o, d } = strahl(x, y);
  const t = koerper.treffen(o.x, o.y, o.z, d.x, d.y, d.z);
  if (t) {
    hauch.pos.set(t.x, t.y, t.z);
    hauch.ziel = 1;
  } else hauch.ziel = 0;
}

leinwandLinien.addEventListener('pointermove', (e) => {
  const [x, y] = lageIm(e);
  stift.alt = e.altKey;
  stift.bewegen(x, y);
  if (drehen) {
    nutzer.gier = drehen.gier - ((x - drehen.x) * Math.PI) / 520;
    nutzer.neigung = Math.max(-1.1, Math.min(1.1, drehen.neigung + ((y - drehen.y) * Math.PI) / 520));
  } else if (zug && koerper) {
    const k = koerper;
    const F = k.flach;
    const s = (zug.tiefe * 2 * Math.tan((kamera.fov * Math.PI) / 360)) / H;
    const rechts = new Vector3().setFromMatrixColumn(kamera.matrixWorld, 0);
    const oben = new Vector3().setFromMatrixColumn(kamera.matrixWorld, 1);
    const dx = (x - zug.x) * s;
    const dy = (y - zug.y) * s;
    const dw = rechts.multiplyScalar(dx).add(oben.multiplyScalar(-dy));
    // weich begrenzt: weiter als ein Viertel der Form gibt die Haut kaum nach (so faltet sie nie)
    const grenze = F.radius * 0.25;
    const l = dw.length();
    if (l > 1e-9) dw.multiplyScalar((grenze * Math.tanh(l / grenze)) / l);
    for (let i = 0; i < F.n; i++) {
      const g = zug.gewicht[i]!;
      k.versatz[i * 3] = zug.start[i * 3]! + g * dw.x;
      k.versatz[i * 3 + 1] = zug.start[i * 3 + 1]! + g * dw.y;
      k.versatz[i * 3 + 2] = zug.start[i * 3 + 2]! + g * zug.zFaktor[i]! * dw.z * (zug.hinten ? -1 : 1);
    }
  } else hauchSuchen(x, y);
  anstossen();
});

leinwandLinien.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  try {
    leinwandLinien.setPointerCapture(e.pointerId);
  } catch {
    // nachgestellte Ereignisse haben keinen echten Zeiger
  }
  const [x, y] = lageIm(e);
  stift.alt = e.altKey;
  stift.bewegen(x, y);
  if (zustand === 'blatt') {
    stift.druecken(x, y);
  } else if (zustand === 'ruhe' && koerper) {
    const { o, d } = strahl(x, y);
    const t = koerper.treffen(o.x, o.y, o.z, d.x, d.y, d.z);
    if (t && !e.shiftKey) {
      // an der Haut ziehen: weiches Feld um die Stelle, spiegelgleich, die Mitte bleibt in der Ebene
      const F = koerper.flach;
      const n = F.n;
      const hinten = t.tri >= F.tri.length / 3;
      const sigma = Math.max(20, F.radius * 0.3);
      const gewicht = new Float32Array(n);
      const zFaktor = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const v = hinten ? n + i : i;
        const dx = koerper.pos[v * 3]! - t.x;
        const dy = koerper.pos[v * 3 + 1]! - t.y;
        const dz = koerper.pos[v * 3 + 2]! - t.z;
        gewicht[i] = Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * sigma * sigma));
        zFaktor[i] = F.qMax > 0 ? Math.sqrt(F.q[i]! / F.qMax) : 0;
      }
      const e2 = new Vector3(t.x, t.y, t.z).applyMatrix4(kamera.matrixWorldInverse);
      zug = { x, y, start: koerper.versatz.slice(), gewicht, zFaktor, hinten, tiefe: -e2.z };
      hauch.ziel = 1;
      hauch.pos.set(t.x, t.y, t.z);
    } else drehen = { x, y, gier: nutzer.gier, neigung: nutzer.neigung };
  }
  anstossen();
});

const loslassen = (e: PointerEvent): void => {
  if (leinwandLinien.hasPointerCapture(e.pointerId)) leinwandLinien.releasePointerCapture(e.pointerId);
  stift.loslassen();
  drehen = null;
  zug = null;
  anstossen();
};
leinwandLinien.addEventListener('pointerup', loslassen);
leinwandLinien.addEventListener('pointercancel', loslassen);
leinwandLinien.addEventListener('pointerleave', () => {
  if (stift.zieht || drehen || zug) return;
  stift.zeiger.da = false;
  hauch.ziel = 0;
  anstossen();
});
leinwandLinien.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (zustand === 'ruhe') {
      nutzer.zoom = Math.max(0.45, Math.min(2.2, nutzer.zoom * Math.exp(e.deltaY * 0.0015)));
      anstossen();
    }
  },
  { passive: false },
);

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey) return;
  stift.alt = e.altKey;
  const k = e.key;
  if (k === 'Enter') {
    if (zustand === 'blatt') {
      if (!stift.geschlossen) stift.schliessen();
      else aufblasen();
    }
  } else if (k === 'Escape') {
    if (zustand === 'blatt') stift.abbrechen();
    else ablassen();
  } else if (k === 'Backspace' || k === 'Delete') {
    if (zustand === 'blatt') stift.zurueck();
    else ablassen();
  } else if (k === ' ') {
    e.preventDefault();
    nochEinmal();
  } else if (k >= '1' && k <= '4') fassungSetzen((Number(k) - 1) as Fassung);
  else if (k === 'n' || k === 'N') nachtSetzen(!nacht);
  else if (k === 'r' || k === 'R') reglerZeigen(regler.hidden);
  else return;
  anstossen();
});
window.addEventListener('keyup', (e) => {
  stift.alt = e.altKey;
});

// ---------- Leiste ----------

const fassungKnoepfe = $<HTMLSpanElement>('fassungen');
FASSUNGEN.forEach((name, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = name;
  b.title = `${name} (${i + 1})`;
  b.addEventListener('click', () => fassungSetzen(i as Fassung));
  fassungKnoepfe.append(b);
});

function fassungSetzen(f: Fassung): void {
  fassung = f;
  [...fassungKnoepfe.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === f)));
  anstossen();
}
function nachtSetzen(n: boolean): void {
  nacht = n;
  document.body.classList.toggle('nacht', n);
  $('knopf-nacht').setAttribute('aria-pressed', String(n));
  anstossen();
}
$('knopf-nacht').addEventListener('click', () => nachtSetzen(!nacht));
$('knopf-nochmal').addEventListener('click', () => nochEinmal());
$('knopf-neu').addEventListener('click', () => neu());
fassungSetzen(fassung);
nachtSetzen(nacht);

const regler = $<HTMLElement>('regler');
const reglerKnopf = $('knopf-regler');
const reglerTeile = reglerBauen($('regler-liste'), werte, (k) => {
  if (k === 'fuelle' && koerper) koerper.fuelle = werte.fuelle;
  if (zustand === 'ruhe' && koerper) {
    koerper.setzen(moment(DAUER, werte.rueck * L0, werte).lage);
    koerper.dehnungRechnen();
    haut.hochladen();
  }
  anstossen();
});
function reglerZeigen(an: boolean): void {
  regler.hidden = !an;
  reglerKnopf.setAttribute('aria-pressed', String(an));
}
reglerKnopf.addEventListener('click', () => reglerZeigen(regler.hidden));
$('knopf-grundwerte').addEventListener('click', () => reglerTeile.grundwerte());
$('knopf-kopieren').addEventListener('click', () => reglerTeile.kopieren());
$('titel').textContent = mitZeigerImBild ? (params.get('titel') ?? '') : '';

new ResizeObserver(groesse).observe(buehne);
groesse();

// ---------- Test-Haken ----------

interface AnkerEin {
  x: number;
  y: number;
  ein?: [number, number];
  aus?: [number, number];
}

const haken = {
  /** Loop setzen (CSS-Pixel des Blatts) und schließen */
  form(anker: AnkerEin[]): void {
    neu();
    stift.anker = anker.map((a) => ({ x: a.x, y: a.y, ein: a.ein ?? [0, 0], aus: a.aus ?? [0, 0] }));
    stift.schliessen();
    stift.welle = -1;
    film = 1;
    netzBauen();
    anstossen();
  },
  aufblasen,
  ablassen,
  neu,
  fassung: fassungSetzen,
  nacht: nachtSetzen,
  /** Zeit des Aufblasens festhalten (null: laufen lassen) */
  zeit(t: number | null): void {
    festeZeit = t;
    if (t !== null && zustand === 'blatt') aufblasen();
    if (t !== null) {
      T = t;
      zustand = t >= DAUER ? 'ruhe' : 'auf';
    }
    anstossen();
  },
  /** ein Bild sofort zeichnen (auch wenn die Seite verborgen ist) */
  bild(dt = 1 / 60): void {
    bild(dt);
  },
  /** Film: true hält den Takt des Browsers an, dann rechnet nur `bild` */
  film(an: boolean): void {
    angehalten = an;
    if (!an) anstossen();
  },
  /** so viele ms Bild für Bild rechnen (60 je Sekunde) */
  vorspulen(ms: number): void {
    for (let t = 0; t < ms; t += 1000 / 60) bild(1 / 60);
  },
  zeiger(x: number, y: number): void {
    stift.bewegen(x, y);
    hauchSuchen(x, y);
  },
  druecken(x: number, y: number): void {
    stift.bewegen(x, y);
    stift.druecken(x, y);
  },
  loslassen(): void {
    stift.loslassen();
  },
  taste(k: string): void {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
  },
  /** Probe 1: Abstand (px) zwischen gezeichnetem Loop und dem Ring im ersten Bild nach ↩ */
  uebergang(): { anker: number; rand: number } {
    if (!stift.geschlossen) return { anker: NaN, rand: NaN };
    if (!koerper || netzStand !== stift.stand) netzBauen();
    const k = koerper!;
    const m = moment(0, werte.rueck * L0, werte);
    k.setzen(m.lage);
    kameraSetzen(m);
    const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    const ab = stift.abtasten(0.25);
    let anker = 0;
    k.flach.anker.forEach((vi, j) => {
      const a = stift.anker[j]!;
      const [sx, sy] = projizieren(new Vector3(k.pos[vi * 3]!, k.pos[vi * 3 + 1]!, k.pos[vi * 3 + 2]!), vp, kamera.matrixWorldInverse);
      anker = Math.max(anker, Math.hypot(sx / D - a.x, sy / D - a.y));
    });
    let rand = 0;
    for (let i = 0; i < k.flach.nb; i++) {
      const [sx, sy] = projizieren(new Vector3(k.pos[i * 3]!, k.pos[i * 3 + 1]!, k.pos[i * 3 + 2]!), vp, kamera.matrixWorldInverse);
      let best = Infinity;
      for (let j = 0; j < ab.x.length; j++) best = Math.min(best, Math.hypot(sx / D - ab.x[j]!, sy / D - ab.y[j]!));
      rand = Math.max(rand, best);
    }
    anstossen();
    return { anker, rand };
  },
  /** ein Punkt der Form im Bild (CSS-Pixel): Anteile (−1..1) des Rahmens um den Schwerpunkt, auf der Vorderseite der Haut */
  aufDerHaut(fx: number, fy: number): { x: number; y: number } | null {
    if (!koerper) return null;
    const F = koerper.flach;
    let best = -1;
    let bd = Infinity;
    const zx = F.cx + fx * F.radius * 0.7;
    const zy = F.cy + fy * F.radius * 0.7;
    for (let i = 0; i < F.n; i++) {
      const d = Math.hypot(F.x[i]! - zx, F.y[i]! - zy);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    const vp = new Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    const [sx, sy] = projizieren(new Vector3(koerper.pos[best * 3]!, koerper.pos[best * 3 + 1]!, koerper.pos[best * 3 + 2]!), vp, kamera.matrixWorldInverse);
    return { x: sx / D, y: sy / D };
  },
  stand(): Record<string, unknown> {
    return { zustand, T, fassung, nacht, ...stat, anker: stift.anker.length, geschlossen: stift.geschlossen };
  },
};
(window as unknown as { __anfang: typeof haken }).__anfang = haken;
