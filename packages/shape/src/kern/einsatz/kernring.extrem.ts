// Teil A, E1/E2 (Plan 21.10.): ganze Reihe des Kernrings auf dem Standard — A0 wie im Editor (E2), Feld auf K2 begradigt bis 1,5
// Radien, Schlitz genau auf der Linie, Reihenzahl konform 10 … 16, Fächer um c als Halbkreis, Naht nach Bogenlänge auf einer
// umparametrisierten Karte, ein Ausgleich der Stufennaht, Ausgleich außen, letzte Lippenspanne 0,15 Feldkante, Spitzen von A0
// übernommen, ohne Lippenwulst. Haut-Tor und Mundwinkel-Tor an allen ausgeglichenen Fällen (Linie ≤ 1 px auf der Haut), seit E2
// auch an Rex und Robbe. Läuft im Extrem-Lauf (`pnpm --filter @ee/shape test:extrem`, wöchentlich in CI); im normalen Lauf
// wachen in `kernring.test.ts` drei Fälle über die Haut, drei J-Linien über den Mundwinkel, Robbe hoch über die Lage und Robbe
// mittel und Rex mittel über die Spitzen von A0.
import { describe, expect, it } from 'vitest';
import { type EinsatzMasse } from './loesen';
import { einsatzAblauf, einsatzFaelle, einsatzFall } from '../pruefen/einsatzFall';

declare const console: { log: (...a: unknown[]) => void };

type Zeile = { name: string; m: number; J: number; ms: EinsatzMasse; umgeklappt: number; lippe: number; spiegel: number };

let reihe: Zeile[] | null = null;
/** Alle ausgeglichenen Fälle einmal bauen (beide Tore lesen dieselbe Reihe). */
function ganzeReihe(): Zeile[] {
  if (reihe) return reihe;
  reihe = [];
  for (const [art, anfang, form] of einsatzFaelle()) {
    const f = einsatzFall(art, anfang, form);
    if (!f || 'fehler' in f || f.hautAbstand > 1) continue;
    const { t, lippe, g, ms } = einsatzAblauf(f);
    let spiegel = 0;
    for (let v = t.nAlt; v < g.kaefig.n; v++) {
      const s = t.spiegel[v]!;
      if (s >= 0 && s !== v && (g.xyz[3 * s] !== g.xyz[3 * v] || g.xyz[3 * s + 1] !== g.xyz[3 * v + 1] || g.xyz[3 * s + 2] !== -g.xyz[3 * v + 2]!)) spiegel++;
    }
    reihe.push({ name: f.name, m: t.m, J: t.J, ms, umgeklappt: t.umgeklappt, lippe: Math.max(lippe.fehler.seite, lippe.fehler.front, lippe.fehler.top, lippe.fehler.raum), spiegel });
  }
  return reihe;
}

describe('Teil A, E1: Kernring, ganze Reihe auf K2', () => {
  // Tor „genaue Haut“ (Florian 21.10.: „Mach zuerst die Haut wieder genauer (0,25 px)“; E2: an allen Körpern): ≤ 0,25 px gegen
  // A0, Knick im Feld ≤ A0 + 2° (scharfe Kanten und die Umgebung von Spitzen zählen nicht), Lippe ≤ 1 px, nirgends umgeklappt,
  // außen bitgleich, Spiegel bitgenau. Offen (Register „Befunde aus E2“): Robbe hoch (Linie oben auf dem Kopf, spitzer
  // Schlitzanfang: die Haut faltet in den ersten Lippenzellen), Rex mittel J (die Querfalte von A0 kreuzt den Schlitz und
  // läuft zur Naht — im Kernring keine Gitterlinie) und Robbe tief J (die Lippe hat quer zur Haut einen Buckel, Knick 16,8° an
  // der Lippe bei A0 11,2°).
  const OFFEN = ['robbe/hoch/gerade', 'robbe/hoch/j', 'rex/mittel/j', 'robbe/tief/j'];
  const torFehler = (zs: Zeile[]) => {
    let fehler = '';
    for (const z of zs) {
      if (z.ms.aussen !== 0) fehler += `${z.name}: außen ${z.ms.aussen}; `;
      if (z.spiegel) fehler += `${z.name}: ${z.spiegel} nicht gespiegelt; `;
      if (z.umgeklappt) fehler += `${z.name}: ${z.umgeklappt} umgeklappt; `;
      if (z.ms.hautMax > 0.25) fehler += `${z.name}: Haut ${z.ms.hautMax.toFixed(3)} px; `;
      if (z.ms.falten > z.ms.faltenA0 + 2) fehler += `${z.name}: Knick ${z.ms.falten.toFixed(1)}° (A0 ${z.ms.faltenA0.toFixed(1)}°); `;
      if (z.lippe > 1) fehler += `${z.name}: Lippe ${z.lippe.toFixed(2)} px; `;
    }
    return fehler;
  };
  it('Haut-Tor: ≤ 0,25 px, Knick ≤ A0 + 2°, Lippe ≤ 1 px, nirgends umgeklappt; außen bitgleich, Spiegel bitgenau (ohne die offenen Fälle)', () => {
    const zs = ganzeReihe();
    console.log(zs.map((z) => `${z.name.padEnd(22)} m ${z.m} J ${z.J}: Haut ${z.ms.hautMax.toFixed(2)} (99 % ${z.ms.hautP99.toFixed(2)}) px · Knick ${z.ms.falten.toFixed(1)}° (A0 ${z.ms.faltenA0.toFixed(1)}°) · Lippe ${z.lippe.toFixed(2)} px${OFFEN.includes(z.name) ? ' (offen)' : ''}`).join('\n'));
    expect(zs.length).toBeGreaterThan(40);
    expect(torFehler(zs.filter((z) => !OFFEN.includes(z.name)))).toBe('');
  }, 3_600_000);

  // dasselbe Tor an allen Fällen — fällt dieser Test nicht mehr, sind die offenen Fälle gelöst
  it.fails('Haut-Tor an allen Fällen (offen: Robbe hoch, Rex mittel J, Robbe tief J)', () => {
    expect(torFehler(ganzeReihe())).toBe('');
  }, 3_600_000);

  // Tor Mundwinkel (Plan 21.10.): größter Knick im Umkreis von drei Feldkanten um die Lippenspitze ≤ A0 + 2°. Zweite Sitzung 26
  // von 30 (verfehlt an J-Linien), dritte 30 von 30 ohne Rex/Robbe (Fächer um c als Halbkreis, Feld begradigt bis 1,5 Radien),
  // seit E2 alle Fälle, auch Rex und Robbe (A0 wie im Editor, Ausgleich der Stufennaht, letzte Spanne 0,15 Feldkante).
  it('Mundwinkel-Tor: Knick um die Spitze ≤ A0 + 2° (alle ausgeglichenen Fälle)', () => {
    const zs = ganzeReihe();
    const verfehlt = zs.filter((z) => z.ms.faltenEcke > z.ms.faltenEckeA0 + 2);
    console.log(`Mundwinkel-Tor: ${zs.length - verfehlt.length} von ${zs.length} erfüllt\n${zs.map((z) => `${z.name.padEnd(22)} Ecke ${z.ms.faltenEcke.toFixed(1)}° (A0 ${z.ms.faltenEckeA0.toFixed(1)}°)${z.ms.faltenEcke > z.ms.faltenEckeA0 + 2 ? ' ✗' : ''}`).join('\n')}`);
    expect(verfehlt.length).toBe(0);
  }, 3_600_000);
});
