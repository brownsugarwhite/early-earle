/**
 * Feinregler der Probe „Linien, Punkte, Zeiger“ (2D und Raum teilen sich Werte und Regler): alle Werte des Verhaltens als
 * Schieberegler, im Browser behalten; „Werte kopieren“ legt die geänderten als JSON in die Zwischenablage.
 */

import { GRUNDWERTE, type Werte } from './verhalten';

const SPEICHER = 'linien-probe-werte-4';

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

export const REGLER: { gruppe: string; k: keyof Werte; name: string; min: number; max: number; schritt: number }[] = [
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
  { gruppe: 'Federn', k: 'greifHz', name: 'Zeiger gleitet: Tempo', min: 2, max: 40, schritt: 0.5 },
  { gruppe: 'Federn', k: 'greifD', name: 'Zeiger gleitet: Ruhe', min: 0.1, max: 1.5, schritt: 0.01 },
  { gruppe: 'Zeiger', k: 'zeigerGroesse', name: 'Größe', min: 4, max: 32, schritt: 0.5 },
  { gruppe: 'Zeiger', k: 'zeigerLinie', name: 'Linie', min: 0.1, max: 2, schritt: 0.05 },
];

/** Breiten: nach einer Änderung neu abtasten */
export const BREITEN = new Set<keyof Werte>(['umriss', 'innen', 'kanteMax', 'kanteMin']);

/**
 * Regler in `liste` bauen; `extra`: weitere Regler der Seite (nicht in den Werten). `geaendert` nach jeder Änderung (mit dem Schlüssel).
 */
export function reglerBauen(
  liste: HTMLElement,
  werte: Werte,
  geaendert: (k: string) => void,
  extra: { gruppe: string; name: string; min: number; max: number; schritt: number; wert: () => number; setzen: (v: number) => void }[] = [],
): { grundwerte: () => void; kopieren: () => void } {
  const regler: { input: HTMLInputElement; zahl: HTMLSpanElement; lesen: () => number }[] = [];
  let gruppe = '';
  const zeile = (r: { gruppe: string; name: string; min: number; max: number; schritt: number }, lesen: () => number, setzen: (v: number) => void, k: string): void => {
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
    input.value = String(lesen());
    zahl.textContent = String(lesen());
    input.addEventListener('input', () => {
      setzen(Number(input.value));
      zahl.textContent = input.value;
      werteSchreiben(werte);
      geaendert(k);
    });
    label.append(name, zahl, input);
    liste.append(label);
    regler.push({ input, zahl, lesen });
  };
  for (const e of extra) zeile(e, e.wert, e.setzen, e.name);
  for (const r of REGLER)
    zeile(
      r,
      () => werte[r.k],
      (v) => {
        werte[r.k] = v;
      },
      r.k,
    );
  return {
    grundwerte: () => {
      Object.assign(werte, GRUNDWERTE);
      for (const { input, zahl, lesen } of regler) {
        input.value = String(lesen());
        zahl.textContent = String(lesen());
      }
      werteSchreiben(werte);
      geaendert('alle');
    },
    kopieren: () => {
      const geaenderte = Object.fromEntries(Object.entries(werte).filter(([k, v]) => GRUNDWERTE[k as keyof Werte] !== v));
      void navigator.clipboard?.writeText(JSON.stringify(geaenderte, null, 1));
    },
  };
}
