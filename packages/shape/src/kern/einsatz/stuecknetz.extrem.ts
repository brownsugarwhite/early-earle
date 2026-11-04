// P2 „Stücknetz im Maulfeld“ (Prüfplan 02.11., Tag 5 — 04.11.2026): die ganze Einsatz-Reihe (sechs Körper × drei Anfänge × drei
// Formen, ausgeglichene Fälle mit Linie ≤ 1 px auf der Haut) mit dem Stücknetz auf K2 — dieselben Tore und dieselbe Messung
// wie der Kernring (`kernring.extrem.ts`): Haut ≤ 0,25 px, Knick ≤ A0 + 2°, Lippe ≤ 1 px, nirgends umgeklappt, außen
// bitgleich, Spiegel bitgenau, Mundwinkel ≤ A0 + 2°, Käfig geschlossen. Läuft im Extrem-Lauf (`pnpm --filter @ee/shape
// test:extrem`); verfehlte Tore stehen als `it.fails` mit den offenen Fällen (Register „Befunde aus P2“).
import { describe, expect, it } from 'vitest';
import { einsatzFaelle, einsatzFall } from '../pruefen/einsatzFall';
import type { EinsatzMasse } from './loesen';
import { stuecknetzAblauf } from './stuecknetz';

declare const console: { log: (...a: unknown[]) => void };

type Zeile = {
  name: string;
  m: number;
  flaechen: number;
  pole: number;
  ebenen: string;
  ms: EinsatzMasse | null;
  umgeklappt: number;
  lippe: number;
  spiegel: number;
  geschlossen: boolean;
  fehler: string;
  msBau: number;
  msLoesen: number;
};

let reihe: Zeile[] | null = null;
/** Alle ausgeglichenen Fälle einmal bauen (alle Tore lesen dieselbe Reihe); ein Fehler beim Bau wird zur Zeile, nicht zum Absturz. */
function ganzeReihe(): Zeile[] {
  if (reihe) return reihe;
  reihe = [];
  for (const [art, anfang, form] of einsatzFaelle()) {
    const f = einsatzFall(art, anfang, form);
    if (!f || 'fehler' in f || f.hautAbstand > 1) continue;
    try {
      const { bau, lippe, g, ms, msLoesen } = stuecknetzAblauf(f);
      const t = bau.t;
      let spiegel = 0;
      for (let v = t.nAlt; v < g.kaefig.n; v++) {
        const s = t.spiegel[v]!;
        if (s >= 0 && s !== v && (g.xyz[3 * s] !== g.xyz[3 * v] || g.xyz[3 * s + 1] !== g.xyz[3 * v + 1] || g.xyz[3 * s + 2] !== -g.xyz[3 * v + 2]!)) spiegel++;
      }
      reihe.push({
        name: f.name,
        m: t.m,
        flaechen: bau.flaechen,
        pole: bau.pole,
        ebenen: bau.ebenen.join(','),
        ms,
        umgeklappt: t.umgeklappt,
        lippe: Math.max(lippe.fehler.seite, lippe.fehler.front, lippe.fehler.top, lippe.fehler.raum),
        spiegel,
        geschlossen: bau.pruefung.geschlossen && bau.pruefung.fehler.length === 0,
        fehler: '',
        msBau: bau.ms.bau,
        msLoesen,
      });
    } catch (e) {
      reihe.push({ name: f.name, m: 0, flaechen: 0, pole: 0, ebenen: '', ms: null, umgeklappt: 0, lippe: 0, spiegel: 0, geschlossen: false, fehler: String(e), msBau: 0, msLoesen: 0 });
    }
  }
  return reihe;
}

const zeile = (z: Zeile) =>
  z.ms
    ? `${z.name.padEnd(22)} m ${String(z.m).padStart(3)} Flächen ${String(z.flaechen).padStart(5)} Pole ${z.pole} [${z.ebenen}]: Haut ${z.ms.hautMax.toFixed(2)} (99 % ${z.ms.hautP99.toFixed(2)}) px · Knick ${z.ms.falten.toFixed(1)}° (A0 ${z.ms.faltenA0.toFixed(1)}°) · Mundwinkel ${z.ms.faltenEcke.toFixed(1)}° (A0 ${z.ms.faltenEckeA0.toFixed(1)}°) · Lippe ${z.lippe.toFixed(2)} px · umgeklappt ${z.umgeklappt} · außen ${z.ms.aussen} · Spiegel ${z.spiegel} · ${z.msBau.toFixed(0)} + ${z.msLoesen.toFixed(0)} ms`
    : `${z.name.padEnd(22)} FEHLER ${z.fehler}`;

describe('P2: Stücknetz im Maulfeld, ganze Reihe auf K2', () => {
  // Stand Tag 5 (04.11.): 43 von 43 bauen, Mundwinkel-Tor 43 von 43, Haut-Tor 32 von 43 (Kernring 41). Offen (Register „Befunde
  // aus P2 Tag 5“): (a) Knicke von 3,7–7,6° auf glatten Körpern (A0 1,6°) an Kugel und Birne — Kanten des Dreieckmusters im Feld;
  // (b) Rex mittel gerade 32,3° an der Falte von A0 (Kernring 29,6°, A0 27,1°); (c) Robbe: Haut 0,44–0,62 px an den Reihen, die
  // am Linienanfang in den Keil zwischen Lippe und Naht laufen; (d) Robbe hoch J: der Pol des Dreieckmusters liegt im 2,3 px engen
  // Hals des J-Hakens, zwei Zellen klappen um (im Kernring derselbe Fall offen). Die Tore gelten ohne diese Fälle; dieselben Tore an
  // allen Fällen stehen als `it.fails`.
  const OFFEN_HAUT = [
    'kugel/hoch/gerade',
    'kugel/mittel/s',
    'birne/hoch/s',
    'birne/mittel/gerade',
    'birne/mittel/s',
    'birne/tief/gerade',
    'rex/mittel/gerade',
    'robbe/hoch/gerade',
    'robbe/hoch/j',
    'robbe/mittel/gerade',
    'robbe/mittel/j',
  ];
  const OFFEN_MUNDWINKEL: string[] = [];
  const torFehler = (zs: Zeile[]) => {
    let fehler = '';
    for (const z of zs) {
      if (!z.ms) {
        fehler += `${z.name}: ${z.fehler}; `;
        continue;
      }
      if (!z.geschlossen) fehler += `${z.name}: Käfig nicht geschlossen; `;
      if (z.ms.aussen !== 0) fehler += `${z.name}: außen ${z.ms.aussen}; `;
      if (z.spiegel) fehler += `${z.name}: ${z.spiegel} nicht gespiegelt; `;
      if (z.umgeklappt) fehler += `${z.name}: ${z.umgeklappt} umgeklappt; `;
      if (z.ms.hautMax > 0.25) fehler += `${z.name}: Haut ${z.ms.hautMax.toFixed(3)} px; `;
      if (z.ms.falten > z.ms.faltenA0 + 2) fehler += `${z.name}: Knick ${z.ms.falten.toFixed(1)}° (A0 ${z.ms.faltenA0.toFixed(1)}°); `;
      if (z.lippe > 1) fehler += `${z.name}: Lippe ${z.lippe.toFixed(2)} px; `;
    }
    return fehler;
  };

  it('baut alle ausgeglichenen Fälle: Käfig geschlossen, außen bitgleich, Spiegel bitgenau', () => {
    const zs = ganzeReihe();
    console.log(zs.map(zeile).join('\n'));
    expect(zs.length).toBeGreaterThan(40);
    let fehler = '';
    for (const z of zs) {
      if (!z.ms) fehler += `${z.name}: ${z.fehler}; `;
      else {
        if (!z.geschlossen) fehler += `${z.name}: Käfig nicht geschlossen; `;
        if (z.ms.aussen !== 0) fehler += `${z.name}: außen ${z.ms.aussen}; `;
        if (z.spiegel) fehler += `${z.name}: ${z.spiegel} nicht gespiegelt; `;
      }
    }
    expect(fehler).toBe('');
  }, 3_600_000);

  it('Haut-Tor: ≤ 0,25 px, Knick ≤ A0 + 2°, Lippe ≤ 1 px, nirgends umgeklappt (ohne die offenen Fälle)', () => {
    const zs = ganzeReihe();
    const verfehlt = zs.filter((z) => torFehler([z]) !== '');
    console.log(`Haut-Tor: ${zs.length - verfehlt.length} von ${zs.length} erfüllt${verfehlt.length ? `; verfehlt: ${verfehlt.map((z) => torFehler([z])).join('')}` : ''}`);
    expect(torFehler(zs.filter((z) => !OFFEN_HAUT.includes(z.name)))).toBe('');
  }, 3_600_000);

  it.fails('Haut-Tor an allen Fällen (offen: Knicke an Kugel und Birne, Rex mittel gerade, Robbe)', () => {
    expect(torFehler(ganzeReihe())).toBe('');
  }, 3_600_000);

  it('Mundwinkel-Tor: Knick um die Spitze ≤ A0 + 2° (ohne die offenen Fälle)', () => {
    const zs = ganzeReihe().filter((z) => z.ms);
    const verfehlt = zs.filter((z) => z.ms!.faltenEcke > z.ms!.faltenEckeA0 + 2);
    console.log(`Mundwinkel-Tor: ${zs.length - verfehlt.length} von ${zs.length} erfüllt${verfehlt.length ? `; verfehlt: ${verfehlt.map((z) => `${z.name} ${z.ms!.faltenEcke.toFixed(1)}° (A0 ${z.ms!.faltenEckeA0.toFixed(1)}°)`).join(', ')}` : ''}`);
    expect(verfehlt.filter((z) => !OFFEN_MUNDWINKEL.includes(z.name)).map((z) => z.name)).toEqual([]);
  }, 3_600_000);

  it('Flächen und Zeit je Fall (Budget: Maulfeld ≤ 300 Flächen auf K1 — hier K2, Vergleich mit dem Kernring in p2-stuecknetz.ts)', () => {
    const zs = ganzeReihe().filter((z) => z.ms);
    const fl = zs.map((z) => z.flaechen).sort((a, b) => a - b);
    const zeit = zs.map((z) => z.msBau + z.msLoesen).sort((a, b) => a - b);
    console.log(`Flächen des Einsatzes: Median ${fl[Math.floor(fl.length / 2)]}, max ${fl[fl.length - 1]}; Zeit Bau + Lösen: Median ${zeit[Math.floor(zeit.length / 2)]!.toFixed(0)} ms, max ${zeit[zeit.length - 1]!.toFixed(0)} ms; Pole je Fall ${[...new Set(zs.map((z) => z.pole))].join('/')}`);
    expect(zs.length).toBeGreaterThan(40);
  }, 3_600_000);
});
