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
  /** wie dunkel die Schatten an den Wänden sind (0 = weiß); wie stark die Kanten des Kastens gezeichnet sind (0 = gar nicht) */
  schatten: number;
  kanten: number;
}

export const GRUNDWERTE: Werte = { ...ABLAUF, fuelle: 0.72, dicke: 470, spannung: 1, sicht: 3, schatten: 0.14, kanten: 0.6 };

const SPEICHER = 'anfang-probe-werte-4';

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
  { gruppe: 'Rahmen', k: 'rahmenDauer', name: 'bis zur Rückwand (s)', min: 0.6, max: 4, schritt: 0.05 },
  { gruppe: 'Hängen und Abreißen', k: 'hals', name: 'reißt ab Länge (× Halbmesser)', min: 0.4, max: 2.5, schritt: 0.05 },
  { gruppe: 'Hängen und Abreißen', k: 'halsDauer', name: 'Hals fällt zusammen (s)', min: 0.04, max: 0.6, schritt: 0.01 },
  { gruppe: 'Hängen und Abreißen', k: 'halsOrt', name: 'Hals sitzt (Anteil vom Rahmen)', min: 0.1, max: 0.9, schritt: 0.01 },
  { gruppe: 'Hängen und Abreißen', k: 'zug', name: 'Schlauch zieht die Blase (× Halbmesser)', min: 0, max: 0.4, schritt: 0.01 },
  { gruppe: 'Kuppel vorn', k: 'vornHz', name: 'Tempo (Hz)', min: 0.3, max: 4, schritt: 0.05 },
  { gruppe: 'Kuppel vorn', k: 'vornD', name: 'Ruhe (Dämpfung)', min: 0.1, max: 1, schritt: 0.01 },
  { gruppe: 'Nach dem Abriss', k: 'nachHz', name: 'Nachschwingen (Hz)', min: 0.5, max: 5, schritt: 0.05 },
  { gruppe: 'Nach dem Abriss', k: 'nachD', name: 'Nachschwingen: Ruhe', min: 0.05, max: 1, schritt: 0.01 },
  { gruppe: 'Nach dem Abriss', k: 'stoss', name: 'Stoß beim Abriss', min: 0, max: 4, schritt: 0.05 },
  { gruppe: 'Nach dem Abriss', k: 'hintenHz', name: 'hinten rund werden (Hz)', min: 0.5, max: 6, schritt: 0.05 },
  { gruppe: 'Nach dem Abriss', k: 'hintenD', name: 'hinten: Ruhe', min: 0.05, max: 1, schritt: 0.01 },
  { gruppe: 'Nach dem Abriss', k: 'rahmenHz', name: 'Rest schnappt in den Rahmen (Hz)', min: 1, max: 12, schritt: 0.1 },
  { gruppe: 'Nach dem Abriss', k: 'rahmenD', name: 'Rest: Ruhe', min: 0.05, max: 1, schritt: 0.01 },
  { gruppe: 'Nach dem Abriss', k: 'quer', name: 'Stauchen in der Ebene', min: 0, max: 0.5, schritt: 0.01 },
  { gruppe: 'Nach dem Abriss', k: 'welle', name: 'Welle über die Haut', min: 0, max: 0.2, schritt: 0.005 },
  { gruppe: 'Kamera', k: 'fov', name: 'Öffnung am Ende (°)', min: 26, max: 80, schritt: 1 },
  { gruppe: 'Kamera', k: 'kameraDauer', name: 'Dauer (s)', min: 0.3, max: 4, schritt: 0.05 },
  { gruppe: 'Kamera', k: 'gier', name: 'zur Seite (°)', min: -45, max: 45, schritt: 1 },
  { gruppe: 'Kamera', k: 'neigung', name: 'von oben (°)', min: -30, max: 30, schritt: 1 },
  { gruppe: 'Form', k: 'fuelle', name: 'Fülle', min: 0.3, max: 1.3, schritt: 0.01 },
  { gruppe: 'Material', k: 'dicke', name: 'Dicke der Haut (nm)', min: 100, max: 1200, schritt: 5 },
  { gruppe: 'Material', k: 'spannung', name: 'Dehnung färbt', min: 0, max: 3, schritt: 0.05 },
  { gruppe: 'Material', k: 'sicht', name: 'Farben der Seifenhaut', min: 0.5, max: 8, schritt: 0.1 },
  { gruppe: 'Material', k: 'schatten', name: 'Schatten an den Wänden', min: 0, max: 0.3, schritt: 0.005 },
  { gruppe: 'Material', k: 'kanten', name: 'Kanten des Kastens', min: 0, max: 1, schritt: 0.05 },
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
