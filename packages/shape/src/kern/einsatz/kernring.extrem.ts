// Teil A, E1 (Plan 21.10.): ganze Reihe des Kernrings auf dem Standard — Feld auf K2 begradigt bis 1,5 Radien, Schlitz genau
// auf der Linie, Reihenzahl konform 10 … 16, Fächer um c als Halbkreis, Nahtspeichen auf den Kartenlinien, Ausgleich außen,
// letzte Lippenspanne ¼ Feldkante, ohne Lippenwulst. Haut-Tor und Mundwinkel-Tor an allen ausgeglichenen Fällen (Linie ≤ 1 px
// auf der Haut). Läuft im Extrem-Lauf (`pnpm --filter @ee/shape test:extrem`, wöchentlich in CI); im normalen Lauf wachen in
// `kernring.test.ts` drei Fälle über die Haut, drei J-Linien über den Mundwinkel und Robbe hoch über die Faltenfreiheit.
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
  // Tor „genaue Haut“ (Florian 21.10.: „Mach zuerst die Haut wieder genauer (0,25 px)“): ≤ 0,25 px gegen A0, faltenfrei
  // (kein Knick über 30°), Lippe ≤ 1 px — wo A0 keine eigenen Falten im Feld trägt: Rex (Schnauzenkante, 105°) und Robbe
  // (feine Kerbe) bis E2 ausgenommen (Register „Befunde aus E1“). Außen bitgleich, Spiegel bitgenau und keine umgeklappte Zelle
  // gelten überall (seit der dritten Sitzung E1 auch an Rex und Robbe: Nahtspeichen auf den Kartenlinien).
  it('Haut-Tor: ≤ 0,25 px gegen A0, faltenfrei, Lippe ≤ 1 px; außen bitgleich, Spiegel bitgenau, nirgends umgeklappt', () => {
    const zs = ganzeReihe();
    let fehler = '';
    for (const z of zs) {
      if (z.ms.aussen !== 0) fehler += `${z.name}: außen ${z.ms.aussen}; `;
      if (z.spiegel) fehler += `${z.name}: ${z.spiegel} nicht gespiegelt; `;
      if (z.umgeklappt) fehler += `${z.name}: ${z.umgeklappt} umgeklappt; `;
      if (z.name.startsWith('rex/') || z.name.startsWith('robbe/')) continue;
      if (z.ms.hautMax > 0.25) fehler += `${z.name}: Haut ${z.ms.hautMax.toFixed(3)} px; `;
      if (z.ms.falten > 30) fehler += `${z.name}: Knick ${z.ms.falten.toFixed(0)}°; `;
      if (z.lippe > 1) fehler += `${z.name}: Lippe ${z.lippe.toFixed(2)} px; `;
    }
    console.log(zs.map((z) => `${z.name.padEnd(22)} m ${z.m} J ${z.J}: Haut ${z.ms.hautMax.toFixed(2)} (99 % ${z.ms.hautP99.toFixed(2)}) px · Knick ${z.ms.falten.toFixed(1)}° (A0 ${z.ms.faltenA0.toFixed(1)}°) · Lippe ${z.lippe.toFixed(2)} px`).join('\n'));
    expect(zs.length).toBeGreaterThan(30);
    expect(fehler).toBe('');
  }, 3_600_000);

  // Tor Mundwinkel (Plan 21.10.): größter Knick im Umkreis von drei Feldkanten um die Lippenspitze ≤ A0 + 2° (Rex und Robbe
  // bis E2 ausgenommen). Zweite Sitzung 26 von 30 (verfehlt an J-Linien), seit der dritten Sitzung 30 von 30: Fächer um c als
  // Halbkreis, Feld begradigt bis 1,5 Radien (Planseite „Nachtrag E1 (dritte Sitzung)“).
  it('Mundwinkel-Tor: Knick um die Spitze ≤ A0 + 2° (alle ausgeglichenen Fälle ohne Rex/Robbe)', () => {
    const zs = ganzeReihe().filter((z) => !z.name.startsWith('rex/') && !z.name.startsWith('robbe/'));
    const verfehlt = zs.filter((z) => z.ms.faltenEcke > z.ms.faltenEckeA0 + 2);
    console.log(`Mundwinkel-Tor: ${zs.length - verfehlt.length} von ${zs.length} erfüllt\n${zs.map((z) => `${z.name.padEnd(22)} Ecke ${z.ms.faltenEcke.toFixed(1)}° (A0 ${z.ms.faltenEckeA0.toFixed(1)}°)${z.ms.faltenEcke > z.ms.faltenEckeA0 + 2 ? ' ✗' : ''}`).join('\n')}`);
    expect(verfehlt.length).toBe(0);
  }, 3_600_000);
});
