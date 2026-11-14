/**
 * Probe „Linien, Punkte, Zeiger“ (Florian, 14.11.2026): Aussehen und Verhalten von Zeiger, Linien und Punkten zuerst in 2D an
 * seinem Fisch, bevor es in den Editor kommt. Seite: `linien.html`.
 */

import entwurfUrl from '../../../../docs/look/linien/2026-11-14-florian-fisch-entwurf.webp?url';
import fischDaten from './fisch.json';
import { FluessigeAnzeige } from './fluessig';
import { type FischDaten, netzAusDaten } from './netz';
import { type Ansicht, GRUNDWERTE, Verhalten, type Werte } from './verhalten';

const SPEICHER = 'linien-probe-werte-3';
const lesen = (): Partial<Werte> => {
  try {
    const roh = localStorage.getItem(SPEICHER);
    return roh ? (JSON.parse(roh) as Partial<Werte>) : {};
  } catch {
    return {};
  }
};
const schreiben = (w: Werte): void => {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(w));
  } catch {
    // ohne Speicher geht es auch
  }
};

const werte: Werte = { ...GRUNDWERTE, ...lesen() };
const buehne = document.getElementById('buehne') as HTMLDivElement;
const leinwand = document.getElementById('leinwand') as HTMLCanvasElement;
const entwurf = document.getElementById('entwurf') as HTMLImageElement;
entwurf.src = entwurfUrl;
const anzeige = new FluessigeAnzeige(leinwand);
const daten = fischDaten as unknown as FischDaten;
const verhalten = new Verhalten(netzAusDaten(daten), werte);
const ansicht: Ansicht = { z: 1, ox: 0, oy: 0, dpr: Math.min(window.devicePixelRatio || 1, 3), wachsen: true };
const info = new URLSearchParams(location.search).get('info') === '1';
// ?bild=1: ohne Leiste (für Vergleichsbilder)
if (new URLSearchParams(location.search).get('bild') === '1') document.body.classList.add('bild');

// ---------- Ansicht ----------

function rahmen(): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const P of verhalten.proben)
    for (let k = 0; k < P.n; k++) {
      x0 = Math.min(x0, P.x[k]!);
      x1 = Math.max(x1, P.x[k]!);
      y0 = Math.min(y0, P.y[k]!);
      y1 = Math.max(y1, P.y[k]!);
    }
  return { x0, y0, x1, y1 };
}

function zeigen(z: number | 'einpassen'): void {
  const r = buehne.getBoundingClientRect();
  const b = rahmen();
  const unten = 56;
  const zz = z === 'einpassen' ? Math.min((r.width - 64) / (b.x1 - b.x0), (r.height - 64 - unten) / (b.y1 - b.y0)) : z;
  ansicht.z = zz;
  ansicht.ox = r.width / 2 - ((b.x0 + b.x1) / 2) * zz;
  ansicht.oy = (r.height - unten) / 2 - ((b.y0 + b.y1) / 2) * zz;
  anstossen();
}

function groesse(): void {
  const r = buehne.getBoundingClientRect();
  ansicht.dpr = Math.min(window.devicePixelRatio || 1, 3);
  anzeige.groesse(r.width * ansicht.dpr, r.height * ansicht.dpr);
  anstossen();
}

function zoomUm(faktor: number, cx: number, cy: number): void {
  const z = Math.min(24, Math.max(0.25, ansicht.z * faktor));
  ansicht.ox = cx - ((cx - ansicht.ox) * z) / ansicht.z;
  ansicht.oy = cy - ((cy - ansicht.oy) * z) / ansicht.z;
  ansicht.z = z;
  anstossen();
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
function bild(t: number): void {
  const dt = Math.min(1 / 30, Math.max(0, (t - letzte) / 1000));
  letzte = t;
  verhalten.setzeAnsicht(ansicht);
  const aktiv = verhalten.schritt(dt);
  const sz = verhalten.szene(ansicht);
  anzeige.zeichnen(sz);
  entwurf.style.transform = `translate(${ansicht.ox}px, ${ansicht.oy}px) scale(${ansicht.z / 3})`;
  zoomAnzeige.textContent = `${Math.round(ansicht.z * 100)} %`;
  bilder++;
  if (t - bilderSeit > 500) {
    fps = (bilder * 1000) / (t - bilderSeit);
    bilder = 0;
    bilderSeit = t;
  }
  if (info) infoAnzeige.textContent = `${fps.toFixed(0)} B/s · ${anzeige.stat.kapseln} Kapseln · ${anzeige.stat.eintraege} Einträge · ${anzeige.stat.verteilenMs.toFixed(1)} ms · ${verhalten.stat.ziel}`;
  if (aktiv || schwenk) requestAnimationFrame(bild);
  else laeuft = false;
}

// ---------- Eingaben ----------

let schwenk: { x: number; y: number } | null = null;
let leertaste = false;
let letzteZeit = 0;

function zeigerAus(e: PointerEvent): void {
  const r = leinwand.getBoundingClientRect();
  const sx = e.clientX - r.left;
  const sy = e.clientY - r.top;
  const dt = letzteZeit ? (e.timeStamp - letzteZeit) / 1000 : 0;
  letzteZeit = e.timeStamp;
  verhalten.zeigerSetzen((sx - ansicht.ox) / ansicht.z, (sy - ansicht.oy) / ansicht.z, sx, sy, dt);
}

leinwand.addEventListener('pointermove', (e) => {
  if (schwenk) {
    ansicht.ox += e.clientX - schwenk.x;
    ansicht.oy += e.clientY - schwenk.y;
    schwenk = { x: e.clientX, y: e.clientY };
  }
  zeigerAus(e);
  anstossen();
});
leinwand.addEventListener('pointerdown', (e) => {
  leinwand.setPointerCapture(e.pointerId);
  zeigerAus(e);
  if (e.button === 1 || leertaste) {
    schwenk = { x: e.clientX, y: e.clientY };
    leinwand.classList.add('schwenken');
  } else if (e.button === 0) verhalten.druecken();
  anstossen();
});
const los = (): void => {
  if (schwenk) {
    schwenk = null;
    leinwand.classList.toggle('schwenken', leertaste);
  }
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
    const r = leinwand.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) zoomUm(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
    else {
      ansicht.ox -= e.deltaX;
      ansicht.oy -= e.deltaY;
    }
    // der Zeiger bleibt auf dem Bildschirm, die Zeichnung wandert unter ihm
    verhalten.zeigerSetzen((e.clientX - r.left - ansicht.ox) / ansicht.z, (e.clientY - r.top - ansicht.oy) / ansicht.z, e.clientX - r.left, e.clientY - r.top, 0);
    anstossen();
  },
  { passive: false },
);
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === 'Space') {
    leertaste = true;
    leinwand.classList.add('schwenken');
    e.preventDefault();
  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    if (verhalten.rueckgaengig()) anstossen();
    e.preventDefault();
  } else if (e.shiftKey && e.code === 'Digit0') zeigen(1);
  else if (e.shiftKey && e.code === 'Digit1') zeigen('einpassen');
  else if (e.key.toLowerCase() === 'e' && !e.metaKey) knopfEntwurf.click();
  else if (e.key.toLowerCase() === 'r' && !e.metaKey) knopfRegler.click();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    leertaste = false;
    if (!schwenk) leinwand.classList.remove('schwenken');
  }
});
window.addEventListener('resize', groesse);

// ---------- Leiste ----------

const zoomAnzeige = document.getElementById('zoom') as HTMLSpanElement;
const infoAnzeige = document.getElementById('info') as HTMLSpanElement;
const knopfEntwurf = document.getElementById('knopf-entwurf') as HTMLButtonElement;
const knopfRegler = document.getElementById('knopf-regler') as HTMLButtonElement;
const knopfWachsen = document.getElementById('knopf-wachsen') as HTMLButtonElement;
const reglerFeld = document.getElementById('regler') as HTMLElement;
(document.getElementById('knopf-100') as HTMLButtonElement).onclick = () => zeigen(1);
(document.getElementById('knopf-einpassen') as HTMLButtonElement).onclick = () => zeigen('einpassen');
(document.getElementById('knopf-zurueck') as HTMLButtonElement).onclick = () => {
  if (verhalten.rueckgaengig()) anstossen();
};
(document.getElementById('knopf-reset') as HTMLButtonElement).onclick = () => {
  verhalten.zuruecksetzen();
  anstossen();
};
knopfEntwurf.onclick = () => {
  const an = !entwurf.classList.contains('an');
  entwurf.classList.toggle('an', an);
  knopfEntwurf.setAttribute('aria-pressed', String(an));
};
knopfWachsen.onclick = () => {
  ansicht.wachsen = !ansicht.wachsen;
  knopfWachsen.setAttribute('aria-pressed', String(ansicht.wachsen));
  anstossen();
};
knopfRegler.onclick = () => {
  reglerFeld.hidden = !reglerFeld.hidden;
  knopfRegler.setAttribute('aria-pressed', String(!reglerFeld.hidden));
};

// ---------- Feinregler ----------

const REGLER: { gruppe: string; k: keyof Werte; name: string; min: number; max: number; schritt: number }[] = [
  { gruppe: 'Florians Vorgaben', k: 'umriss', name: 'Umriss', min: 0.1, max: 3, schritt: 0.05 },
  { gruppe: 'Florians Vorgaben', k: 'innen', name: 'Innen', min: 0.05, max: 2, schritt: 0.05 },
  { gruppe: 'Florians Vorgaben', k: 'kanteMax', name: 'Kante', min: 0.1, max: 3, schritt: 0.05 },
  { gruppe: 'Florians Vorgaben', k: 'kanteMin', name: 'Kante verjüngt auf', min: 0.05, max: 2, schritt: 0.05 },
  { gruppe: 'Florians Vorgaben', k: 'punktRadius', name: 'Punkt (Radius)', min: 0.25, max: 4, schritt: 0.05 },
  { gruppe: 'Schwellen', k: 'schwellen', name: 'Stärke', min: 0, max: 6, schritt: 0.05 },
  { gruppe: 'Schwellen', k: 'reichweite', name: 'Länge längs der Linie', min: 4, max: 100, schritt: 1 },
  { gruppe: 'Schwellen', k: 'anflug', name: 'Anflug (× Tropfenabstand)', min: 1, max: 6, schritt: 0.1 },
  { gruppe: 'Tropfen', k: 'tropfen', name: 'Größe (× Punkt)', min: 0.5, max: 3, schritt: 0.05 },
  { gruppe: 'Tropfen', k: 'fangPunkt', name: 'Punkt springt ab', min: 1, max: 40, schritt: 0.5 },
  { gruppe: 'Tropfen', k: 'fangLinie', name: 'Tropfen aus der Linie ab', min: 0, max: 30, schritt: 0.5 },
  { gruppe: 'Tropfen', k: 'halten', name: 'Hals hält (× Abstand)', min: 1, max: 4, schritt: 0.05 },
  { gruppe: 'Tropfen', k: 'hals', name: 'Hals (Breite)', min: 0, max: 4, schritt: 0.05 },
  { gruppe: 'Tropfen', k: 'spannung', name: 'Linie neigt sich', min: 0, max: 0.6, schritt: 0.01 },
  { gruppe: 'Tropfen', k: 'dehnung', name: 'Dehnung im Tempo', min: 0, max: 0.04, schritt: 0.001 },
  { gruppe: 'Flüssig', k: 'weich', name: 'Verschmelzen am Zeiger', min: 0, max: 6, schritt: 0.05 },
  { gruppe: 'Flüssig', k: 'weichGrund', name: 'Verschmelzen überall', min: 0, max: 2, schritt: 0.05 },
  { gruppe: 'Federn', k: 'sprungHz', name: 'Sprung: Tempo', min: 1, max: 20, schritt: 0.1 },
  { gruppe: 'Federn', k: 'sprungD', name: 'Sprung: Ruhe', min: 0.1, max: 1.5, schritt: 0.01 },
  { gruppe: 'Federn', k: 'schwellHz', name: 'Schwellen: Tempo', min: 1, max: 30, schritt: 0.1 },
  { gruppe: 'Federn', k: 'schwellD', name: 'Schwellen: Ruhe', min: 0.1, max: 1.5, schritt: 0.01 },
  { gruppe: 'Federn', k: 'zurueckHz', name: 'Zurück: Tempo', min: 1, max: 20, schritt: 0.1 },
  { gruppe: 'Federn', k: 'zurueckD', name: 'Zurück: Ruhe', min: 0.1, max: 1.5, schritt: 0.01 },
  { gruppe: 'Federn', k: 'greifHz', name: 'Ziehen: Tempo', min: 2, max: 40, schritt: 0.5 },
  { gruppe: 'Federn', k: 'greifD', name: 'Ziehen: Ruhe', min: 0.1, max: 1.5, schritt: 0.01 },
  { gruppe: 'Zeiger', k: 'zeigerGroesse', name: 'Größe', min: 4, max: 32, schritt: 0.5 },
  { gruppe: 'Zeiger', k: 'zeigerLinie', name: 'Linie', min: 0.1, max: 2, schritt: 0.05 },
];
const BREITEN = new Set<keyof Werte>(['umriss', 'innen', 'kanteMax', 'kanteMin']);
const liste = document.getElementById('regler-liste') as HTMLDivElement;
const regler = new Map<keyof Werte, { input: HTMLInputElement; zahl: HTMLSpanElement }>();
let gruppe = '';
for (const r of REGLER) {
  if (r.gruppe !== gruppe) {
    gruppe = r.gruppe;
    const h = document.createElement('h3');
    h.textContent = gruppe;
    liste.append(h);
  }
  const label = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = r.name;
  const zahl = document.createElement('span');
  zahl.className = 'zahl';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(r.min);
  input.max = String(r.max);
  input.step = String(r.schritt);
  input.value = String(werte[r.k]);
  zahl.textContent = String(werte[r.k]);
  input.addEventListener('input', () => {
    werte[r.k] = Number(input.value);
    zahl.textContent = input.value;
    if (BREITEN.has(r.k)) verhalten.abtasten();
    schreiben(werte);
    anstossen();
  });
  label.append(name, zahl, input);
  liste.append(label);
  regler.set(r.k, { input, zahl });
}
(document.getElementById('knopf-grundwerte') as HTMLButtonElement).onclick = () => {
  Object.assign(werte, GRUNDWERTE);
  for (const [k, { input, zahl }] of regler) {
    input.value = String(werte[k]);
    zahl.textContent = String(werte[k]);
  }
  verhalten.abtasten();
  schreiben(werte);
  anstossen();
};
(document.getElementById('knopf-kopieren') as HTMLButtonElement).onclick = () => {
  const geaendert = Object.fromEntries(Object.entries(werte).filter(([k, v]) => GRUNDWERTE[k as keyof Werte] !== v));
  void navigator.clipboard?.writeText(JSON.stringify(geaendert, null, 1));
};

// Test-Haken für Proben: Zeiger setzen (Bildschirmpunkte) und die Zeit vorspulen (ohne Bildtakt, z. B. im verborgenen Fenster)
const vorspulen = (ms: number): void => {
  const dt = 1 / 240;
  for (let t = 0; t < ms / 1000; t += dt) {
    verhalten.setzeAnsicht(ansicht);
    verhalten.schritt(dt);
  }
  anzeige.zeichnen(verhalten.szene(ansicht));
  entwurf.style.transform = `translate(${ansicht.ox}px, ${ansicht.oy}px) scale(${ansicht.z / 3})`;
};
const zeigerHin = (sx: number, sy: number, ms = 0): void => {
  verhalten.zeigerSetzen((sx - ansicht.ox) / ansicht.z, (sy - ansicht.oy) / ansicht.z, sx, sy, ms / 1000);
};
(window as unknown as { __linien: unknown }).__linien = { verhalten, ansicht, anzeige, zeigen, anstossen, vorspulen, zeigerHin, werte };

groesse();
zeigen('einpassen');
