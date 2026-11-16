/**
 * Ozzy: der Feinregler (Florian, 16.11.: „die ganzen Regler für die Einstellungen noch nicht löschen, sondern hinter einem Menü
 * verbergen und übersichtlich anordnen, damit ich weiter die optimalen Einstellungen suchen kann“).
 *
 * Ein Fenster für alles, in Bereiche und aufklappbare Gruppen geordnet; jeder Bereich hat seine Werte, Grundwerte und seinen Platz
 * im Browser (eigene Schlüssel, die Studienseiten behalten ihre). „Werte kopieren“ legt alle geänderten Werte als Text in die
 * Zwischenablage, „Grundwerte“ setzt alles zurück.
 */

export interface ReglerZeile<K extends string> {
  gruppe: string;
  k: K;
  name: string;
  min: number;
  max: number;
  schritt: number;
}

export interface Bereich {
  titel: string;
  /** Schlüssel im Browser */
  speicher: string;
  zeilen: ReglerZeile<string>[];
  werte: Record<string, number>;
  grundwerte: Record<string, number>;
}

/** Werte eines Bereichs: die Grundwerte, darüber, was der Browser behalten hat */
export function werteLesen<W extends object>(speicher: string, grund: W): W {
  try {
    const roh = localStorage.getItem(speicher);
    return { ...grund, ...(roh ? (JSON.parse(roh) as Partial<W>) : {}) };
  } catch {
    return { ...grund };
  }
}

function schreiben(b: Bereich): void {
  try {
    localStorage.setItem(b.speicher, JSON.stringify(b.werte));
  } catch {
    // ohne Speicher geht es auch
  }
}

const zahl = (v: number, schritt: number): string => {
  const stellen = Math.max(0, Math.min(4, Math.ceil(-Math.log10(schritt))));
  return v.toFixed(stellen);
};

/** baut den Feinregler in `liste`; `geaendert(bereich, schlüssel)` nach jeder Änderung ('alle' nach Grundwerte) */
export function feinreglerBauen(liste: HTMLElement, bereiche: Bereich[], geaendert: (bereich: string, k: string) => void): { grundwerte: () => void; kopieren: () => void } {
  const zeilen: { b: Bereich; k: string; input: HTMLInputElement; anzeige: HTMLSpanElement; schritt: number }[] = [];
  for (const b of bereiche) {
    const kopf = document.createElement('h2');
    kopf.textContent = b.titel;
    liste.append(kopf);
    let gruppe = '';
    let box: HTMLElement = liste;
    for (const r of b.zeilen) {
      if (r.gruppe !== gruppe) {
        gruppe = r.gruppe;
        const d = document.createElement('details');
        const s = document.createElement('summary');
        s.textContent = gruppe;
        d.append(s);
        liste.append(d);
        box = d;
      }
      const label = document.createElement('label');
      const name = document.createElement('span');
      name.textContent = r.name;
      const anzeige = document.createElement('span');
      anzeige.className = 'zahl';
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(r.min);
      input.max = String(r.max);
      input.step = String(r.schritt);
      const v = b.werte[r.k] ?? b.grundwerte[r.k] ?? 0;
      input.value = String(v);
      anzeige.textContent = zahl(v, r.schritt);
      input.addEventListener('input', () => {
        b.werte[r.k] = Number(input.value);
        anzeige.textContent = zahl(Number(input.value), r.schritt);
        label.classList.toggle('anders', b.werte[r.k] !== b.grundwerte[r.k]);
        schreiben(b);
        geaendert(b.titel, r.k);
      });
      label.classList.toggle('anders', v !== b.grundwerte[r.k]);
      label.append(name, anzeige, input);
      box.append(label);
      zeilen.push({ b, k: r.k, input, anzeige, schritt: r.schritt });
    }
  }
  return {
    grundwerte(): void {
      for (const b of bereiche) {
        Object.assign(b.werte, b.grundwerte);
        schreiben(b);
      }
      for (const z of zeilen) {
        const v = z.b.werte[z.k]!;
        z.input.value = String(v);
        z.anzeige.textContent = zahl(v, z.schritt);
        z.input.closest('label')?.classList.remove('anders');
      }
      for (const b of bereiche) geaendert(b.titel, 'alle');
    },
    kopieren(): void {
      const anders: Record<string, Record<string, number>> = {};
      for (const b of bereiche) {
        const a: Record<string, number> = {};
        for (const k of Object.keys(b.grundwerte)) if (b.werte[k] !== b.grundwerte[k]) a[k] = b.werte[k]!;
        if (Object.keys(a).length) anders[b.titel] = a;
      }
      void navigator.clipboard?.writeText(JSON.stringify(anders, null, 1));
    },
  };
}
