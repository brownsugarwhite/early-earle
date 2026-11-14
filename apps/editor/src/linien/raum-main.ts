/**
 * Probe „Linien, Punkte, Zeiger“ im Raum (Florian, 14.11.2026): dasselbe Verhalten wie in 2D an einer seiner Formen aus `wesen/`,
 * drehbar. Seite: `raum.html` (`?form=<Name>`, Standard „teat firefish“).
 */

import { entpacken } from '../form/ablage';
import { FluessigeAnzeige } from './fluessig';
import { Raum3D } from './raum';
import { reglerBauen, werteLesen } from './regler';
import { type Ansicht, Verhalten } from './verhalten';

const frage = new URLSearchParams(location.search);
const werte = werteLesen();
const buehne = document.getElementById('buehne') as HTMLDivElement;
const leinwand = document.getElementById('leinwand') as HTMLCanvasElement;
const anzeige = new FluessigeAnzeige(leinwand);
const raum = new Raum3D();
const verhalten = new Verhalten({ punkte: [], linien: [] }, werte);
verhalten.raum = raum;
const ansicht: Ansicht = { z: 1, ox: 0, oy: 0, dpr: Math.min(window.devicePixelRatio || 1, 3), wachsen: false, massstab: 1 };
const info = frage.get('info') === '1';
if (frage.get('bild') === '1') document.body.classList.add('bild');
let geladen = false;

// ---------- Form ----------

const formenFeld = document.getElementById('formen') as HTMLSpanElement;
async function formLaden(name: string): Promise<void> {
  const r = await fetch(`/__wesen/${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error(`Form „${name}“ nicht gefunden`);
  const b = buehne.getBoundingClientRect();
  raum.setzeFenster(b.width, b.height - 64);
  raum.laden(entpacken(await r.arrayBuffer()));
  verhalten.tropfen = [];
  geladen = true;
  for (const k of formenFeld.querySelectorAll('button')) k.setAttribute('aria-pressed', String(k.textContent === name));
  anstossen();
}
async function formenZeigen(): Promise<void> {
  try {
    const r = await fetch('/__wesen/');
    const liste = (await r.json()) as { name: string }[];
    for (const f of liste) {
      const k = document.createElement('button');
      k.type = 'button';
      k.textContent = f.name;
      k.onclick = () => void formLaden(f.name);
      formenFeld.append(k);
    }
  } catch {
    // ohne Liste: nur die eine Form
  }
}

// ---------- Bild für Bild ----------

let laeuft = false;
let letzte = 0;
let bilder = 0;
let bilderSeit = performance.now();
let fps = 0;
function anstossen(): void {
  if (laeuft) return;
  laeuft = true;
  letzte = performance.now();
  requestAnimationFrame(bild);
}

/** ein Bild rechnen und zeichnen; true, solange sich etwas bewegt */
function schritt(dt: number): boolean {
  if (!geladen) return false;
  const r = buehne.getBoundingClientRect();
  const kamera = raum.kameraSchritt(dt);
  const z = verhalten.zeiger;
  const D = ansicht.dpr;
  const m = ansicht.massstab ?? 1;
  let sicht = null;
  if (z.da) {
    const s = anzeige.tiefeBei(z.sx * D, z.sy * D, (werte.fangPunkt * 2.5 * m + 16) * D);
    if (s) sicht = { ...s, dpr: D };
  }
  const { netz, proben } = raum.projizieren(r.width, r.height, werte, m, sicht);
  verhalten.setzeNetz(netz, proben);
  verhalten.setzeAnsicht(ansicht);
  const aktiv = verhalten.schritt(dt);
  const sz = verhalten.szene(ansicht);
  sz.koerper = raum.koerper(D, m, werte.umriss);
  sz.bias = raum.bias();
  anzeige.zeichnen(sz);
  return aktiv || kamera;
}

function bild(t: number): void {
  const dt = Math.min(1 / 30, Math.max(0, (t - letzte) / 1000));
  letzte = t;
  const aktiv = schritt(dt);
  bilder++;
  if (t - bilderSeit > 500) {
    fps = (bilder * 1000) / (t - bilderSeit);
    bilder = 0;
    bilderSeit = t;
  }
  if (info) infoAnzeige.textContent = `${fps.toFixed(0)} B/s · ${anzeige.stat.kapseln} Kapseln · ${verhalten.stat.ziel}`;
  if (aktiv || dreh) requestAnimationFrame(bild);
  else laeuft = false;
}

function groesse(): void {
  const r = buehne.getBoundingClientRect();
  ansicht.dpr = Math.min(window.devicePixelRatio || 1, 3);
  anzeige.groesse(r.width * ansicht.dpr, r.height * ansicht.dpr);
  anstossen();
}

// ---------- Eingaben ----------

let dreh: { x: number; y: number; schieben: boolean } | null = null;
let letzteZeit = 0;
function zeigerAus(e: PointerEvent | WheelEvent): void {
  const r = leinwand.getBoundingClientRect();
  const sx = e.clientX - r.left;
  const sy = e.clientY - r.top;
  const dt = letzteZeit ? (e.timeStamp - letzteZeit) / 1000 : 0;
  letzteZeit = e.timeStamp;
  verhalten.zeigerSetzen(sx, sy, sx, sy, dt);
}
leinwand.addEventListener('pointermove', (e) => {
  if (dreh) {
    const dx = e.clientX - dreh.x;
    const dy = e.clientY - dreh.y;
    dreh.x = e.clientX;
    dreh.y = e.clientY;
    if (dreh.schieben) raum.schieben(dx, dy);
    else raum.drehen(-dx * 0.0075, dy * 0.0075);
  }
  zeigerAus(e);
  anstossen();
});
leinwand.addEventListener('pointerdown', (e) => {
  leinwand.setPointerCapture(e.pointerId);
  zeigerAus(e);
  if (e.button === 0 && !e.shiftKey && verhalten.druecken()) {
    anstossen();
    return;
  }
  dreh = { x: e.clientX, y: e.clientY, schieben: e.shiftKey || e.button === 1 };
  leinwand.classList.add('schwenken');
  anstossen();
});
const los = (): void => {
  dreh = null;
  leinwand.classList.remove('schwenken');
  verhalten.loslassen();
  anstossen();
};
leinwand.addEventListener('pointerup', los);
leinwand.addEventListener('pointercancel', los);
leinwand.addEventListener('pointerleave', () => {
  verhalten.zeigerWeg();
  anstossen();
});
leinwand.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) raum.zoomen(Math.exp(e.deltaY * 0.01));
    else raum.drehen(-e.deltaX * 0.004, -e.deltaY * 0.004);
    zeigerAus(e);
    anstossen();
  },
  { passive: false },
);
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    if (verhalten.rueckgaengig()) anstossen();
    e.preventDefault();
  } else if (e.key === '1') ansichtWechseln('seite');
  else if (e.key === '2') ansichtWechseln('front');
  else if (e.key === '3') ansichtWechseln('top');
  else if (e.key === '4') ansichtWechseln('schraeg');
  else if (e.key.toLowerCase() === 's' && !e.metaKey) knopfSchattierung.click();
  else if (e.key.toLowerCase() === 'r' && !e.metaKey) knopfRegler.click();
});
window.addEventListener('resize', groesse);

// ---------- Leiste ----------

const infoAnzeige = document.getElementById('info') as HTMLSpanElement;
const knopfRegler = document.getElementById('knopf-regler') as HTMLButtonElement;
const knopfSchattierung = document.getElementById('knopf-schattierung') as HTMLButtonElement;
const reglerFeld = document.getElementById('regler') as HTMLElement;
function ansichtWechseln(a: 'seite' | 'front' | 'top' | 'schraeg'): void {
  raum.zeigeAnsicht(a);
  anstossen();
}
(document.getElementById('knopf-seite') as HTMLButtonElement).onclick = () => ansichtWechseln('seite');
(document.getElementById('knopf-front') as HTMLButtonElement).onclick = () => ansichtWechseln('front');
(document.getElementById('knopf-top') as HTMLButtonElement).onclick = () => ansichtWechseln('top');
(document.getElementById('knopf-schraeg') as HTMLButtonElement).onclick = () => ansichtWechseln('schraeg');
(document.getElementById('knopf-zurueck') as HTMLButtonElement).onclick = () => {
  if (verhalten.rueckgaengig()) anstossen();
};
knopfSchattierung.onclick = () => {
  raum.schattierung = raum.schattierung > 0 ? 0 : 1;
  knopfSchattierung.setAttribute('aria-pressed', String(raum.schattierung > 0));
  anstossen();
};
knopfRegler.onclick = () => {
  reglerFeld.hidden = !reglerFeld.hidden;
  knopfRegler.setAttribute('aria-pressed', String(!reglerFeld.hidden));
};
const fein = reglerBauen(document.getElementById('regler-liste') as HTMLDivElement, werte, () => anstossen(), [
  {
    gruppe: 'Raum',
    name: 'Maßstab (Breiten, Punkte, Tropfen)',
    min: 0.5,
    max: 4,
    schritt: 0.05,
    wert: () => ansicht.massstab ?? 1,
    setzen: (v) => {
      ansicht.massstab = v;
    },
  },
  {
    gruppe: 'Raum',
    name: 'Ziehen: Einfluss auf die Haut',
    min: 0.05,
    max: 1,
    schritt: 0.01,
    wert: () => raum.einfluss,
    setzen: (v) => {
      raum.einfluss = v;
    },
  },
]);
(document.getElementById('knopf-grundwerte') as HTMLButtonElement).onclick = fein.grundwerte;
(document.getElementById('knopf-kopieren') as HTMLButtonElement).onclick = fein.kopieren;

// Test-Haken: Zeiger setzen (Bildschirmpunkte), Zeit vorspulen (ohne Bildtakt)
const vorspulen = (ms: number): void => {
  const dt = 1 / 240;
  for (let t = 0; t < ms / 1000; t += dt) {
    raum.kameraSchritt(dt);
    const r = buehne.getBoundingClientRect();
    const { netz, proben } = raum.projizieren(r.width, r.height, werte, ansicht.massstab ?? 1, null);
    verhalten.setzeNetz(netz, proben);
    verhalten.setzeAnsicht(ansicht);
    verhalten.schritt(dt);
  }
  schritt(0);
};
const zeigerHin = (sx: number, sy: number, ms = 0): void => verhalten.zeigerSetzen(sx, sy, sx, sy, ms / 1000);
(window as unknown as { __raum: unknown }).__raum = { raum, verhalten, anzeige, ansicht, werte, vorspulen, zeigerHin, formLaden, schritt };

groesse();
void formenZeigen();
void formLaden(frage.get('form') ?? 'teat firefish');
