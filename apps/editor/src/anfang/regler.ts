/**
 * Feinregler der Probe „Anfang einer Form“: Ablauf des Aufblasens und Material als Schieberegler, im Browser behalten.
 * „Werte kopieren“ legt die geänderten als JSON in die Zwischenablage (zum Weitergeben).
 */

import { GRUNDWERTE as ABLAUF, type Werte as AblaufWerte } from './aufblasen';

export interface Werte extends AblaufWerte {
  /** Höhe = Fülle · √h (1 = ein Kreis wird zur Kugel) */
  fuelle: number;
  /** Grunddicke der Haut (nm), wie stark Dehnung sie dünner macht, wie stark die Seifenhaut spiegelt */
  dicke: number;
  spannung: number;
  sicht: number;
}

export const GRUNDWERTE: Werte = { ...ABLAUF, fuelle: 0.72, dicke: 470, spannung: 1, sicht: 3 };

const SPEICHER = 'anfang-probe-werte-1';

export function werteLesen(): Werte {
  try {
    const roh = localStorage.getItem(SPEICHER);
    return { ...GRUNDWERTE, ...(roh ? (JSON.parse(roh) as Partial<Werte>) : {}) };
  } catch {
    return { ...GRUNDWERTE };
  }
}

function werteSchreiben(w: Werte): void {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(w));
  } catch {
    // ohne Speicher geht es auch
  }
}

const REGLER: { gruppe: string; k: keyof Werte; name: string; min: number; max: number; schritt: number }[] = [
  { gruppe: 'Ring', k: 'rueck', name: 'Rückweg (× Abstand)', min: 0, max: 0.6, schritt: 0.01 },
  { gruppe: 'Haut vorn', k: 'vornAb', name: 'Beginn (s)', min: 0, max: 0.5, schritt: 0.01 },
  { gruppe: 'Haut vorn', k: 'vornHz', name: 'Tempo (Hz)', min: 0.5, max: 5, schritt: 0.05 },
  { gruppe: 'Haut vorn', k: 'vornD', name: 'Ruhe (Dämpfung)', min: 0.1, max: 1, schritt: 0.01 },
  { gruppe: 'Haut hinten', k: 'hintenAb', name: 'löst sich ab (s)', min: 0, max: 0.8, schritt: 0.01 },
  { gruppe: 'Haut hinten', k: 'hintenHz', name: 'Tempo (Hz)', min: 0.5, max: 5, schritt: 0.05 },
  { gruppe: 'Haut hinten', k: 'hintenD', name: 'Ruhe (Dämpfung)', min: 0.1, max: 1, schritt: 0.01 },
  { gruppe: 'Nachschwingen', k: 'quer', name: 'Stauchen in der Ebene', min: 0, max: 0.5, schritt: 0.01 },
  { gruppe: 'Nachschwingen', k: 'welle', name: 'Welle über die Haut', min: 0, max: 0.2, schritt: 0.005 },
  { gruppe: 'Kamera', k: 'gier', name: 'zur Seite (°)', min: -60, max: 60, schritt: 1 },
  { gruppe: 'Kamera', k: 'neigung', name: 'von oben (°)', min: -30, max: 45, schritt: 1 },
  { gruppe: 'Kamera', k: 'kameraDauer', name: 'Dauer (s)', min: 0.3, max: 4, schritt: 0.05 },
  { gruppe: 'Form', k: 'fuelle', name: 'Fülle', min: 0.3, max: 1.3, schritt: 0.01 },
  { gruppe: 'Material', k: 'dicke', name: 'Dicke der Haut (nm)', min: 100, max: 1200, schritt: 5 },
  { gruppe: 'Material', k: 'spannung', name: 'Dehnung färbt', min: 0, max: 3, schritt: 0.05 },
  { gruppe: 'Material', k: 'sicht', name: 'Farben der Seifenhaut', min: 0.5, max: 8, schritt: 0.1 },
];

/** Regler in `liste` bauen; `geaendert` nach jeder Änderung (mit dem Schlüssel) */
export function reglerBauen(liste: HTMLElement, werte: Werte, geaendert: (k: keyof Werte) => void): { grundwerte: () => void; kopieren: () => void } {
  const zeilen: { k: keyof Werte; input: HTMLInputElement; zahl: HTMLSpanElement }[] = [];
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
      werteSchreiben(werte);
      geaendert(r.k);
    });
    label.append(name, zahl, input);
    liste.append(label);
    zeilen.push({ k: r.k, input, zahl });
  }
  return {
    grundwerte(): void {
      Object.assign(werte, GRUNDWERTE);
      werteSchreiben(werte);
      for (const z of zeilen) {
        z.input.value = String(werte[z.k]);
        z.zahl.textContent = String(werte[z.k]);
        geaendert(z.k);
      }
    },
    kopieren(): void {
      const anders: Partial<Werte> = {};
      for (const k of Object.keys(GRUNDWERTE) as (keyof Werte)[]) if (werte[k] !== GRUNDWERTE[k]) anders[k] = werte[k];
      void navigator.clipboard?.writeText(JSON.stringify(anders, null, 1));
    },
  };
}
