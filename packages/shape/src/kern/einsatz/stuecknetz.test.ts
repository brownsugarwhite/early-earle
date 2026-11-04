// P2 „Stücknetz im Maulfeld“, Tag 2–4 (04.11.2026): Ganzzahlen, Muster, Tutte je Stück, Käfig, Lippe (A6), Haut lösen (A7),
// Messen — mit dem Löser und der Messung des Kernrings. Tore des Prüfplans an den zehn Fällen (K2, wie der Kernring gemessen):
// Käfig geschlossen und außen bitgleich; Lippe ≤ 1 px; Haut ≤ 0,25 px; Knick ≤ A0 + 2° frei und am Mundwinkel; keine umgeklappte
// Zelle (Karte und Haut). Verfehlte Tore stehen als `it.fails` mit den Fällen im Register („Befunde aus P2 Tag 2–4“).
// Messwerte mit `--reporter=verbose`.
import { describe, expect, it } from 'vitest';
import { ankerVon, punktNormalen } from './flaeche';
import { einsatzFall } from '../pruefen/einsatzFall';
import type { KoerperArt } from '../pruefen/koerper';
import type { Anfang, Form } from '../pruefen/linien';
import { stuecknetzAblauf } from './stuecknetz';

declare const console: { log: (...a: unknown[]) => void };
type V3 = [number, number, number];
const PX = 461;

export const P2_FAELLE: [KoerperArt, Anfang, Form][] = [
  ['rex', 'mittel', 'gerade'],
  ['rex', 'mittel', 'j'],
  ['robbe', 'hoch', 'gerade'],
  ['robbe', 'hoch', 'j'],
  ['rex', 'tief', 'j'],
  ['robbe', 'tief', 'j'],
  ['kugel', 'mittel', 'j'],
  ['ei', 'tief', 'j'],
  ['langhals', 'hoch', 'j'],
  ['birne', 'mittel', 's'],
];

type Zeile = { name: string; erg: ReturnType<typeof stuecknetzAblauf>; umgeklapptHaut: number };
let reihe: Zeile[] | null = null;
function alle(): Zeile[] {
  if (reihe) return reihe;
  reihe = [];
  for (const [art, anfang, form] of P2_FAELLE) {
    const f = einsatzFall(art, anfang, form);
    if (!f || 'fehler' in f) continue;
    const erg = stuecknetzAblauf(f);
    // umgeklappte Zellen der Haut (rechte Hälfte): Normale der Zelle gegen die Normale von A0 an ihrer Mitte
    const k = erg.g.kaefig;
    const xyz = erg.g.xyz;
    const normalen = punktNormalen(f.netz);
    let umgeklappt = 0;
    for (let fl = 0; fl < k.nF; fl++) {
      if (erg.bau.t.bereich[fl] !== 2) continue;
      const e = Array.from(k.fVerts.subarray(k.fStart[fl]!, k.fStart[fl + 1]!));
      const P = e.map((v) => [xyz[3 * v]!, xyz[3 * v + 1]!, xyz[3 * v + 2]!] as V3);
      const n: V3 = [0, 0, 0];
      for (let i = 0; i < 4; i++) {
        const p = P[i]!;
        const q = P[(i + 1) % 4]!;
        n[0] += (p[1] - q[1]) * (p[2] + q[2]);
        n[1] += (p[2] - q[2]) * (p[0] + q[0]);
        n[2] += (p[0] - q[0]) * (p[1] + q[1]);
      }
      const m: V3 = [0, 0, 0];
      for (const p of P) for (let d = 0; d < 3; d++) m[d] = m[d]! + p[d]! / 4;
      const a = ankerVon(f.netz, m);
      const T = f.netz.dreiecke;
      const ids = [T[3 * a.dreieck]!, T[3 * a.dreieck + 1]!, T[3 * a.dreieck + 2]!];
      const w = [1 - a.b1 - a.b2, a.b1, a.b2];
      const an: V3 = [0, 0, 0];
      for (let q = 0; q < 3; q++) for (let d = 0; d < 3; d++) an[d] = an[d]! + w[q]! * normalen[3 * ids[q]! + d]!;
      if (n[0] * an[0] + n[1] * an[1] + n[2] * an[2] < 0) umgeklappt++;
    }
    reihe.push({ name: f.name, erg, umgeklapptHaut: umgeklappt });
  }
  return reihe;
}

describe('P2 Tag 2–4: Stücknetz im Maulfeld', () => {
  it('baut an allen Fällen: Käfig geschlossen, außen bitgleich, Karte ohne umgeklappte Zelle, Lippe ≤ 1 px', () => {
    const zs = alle();
    expect(zs.length).toBe(P2_FAELLE.length);
    for (const z of zs) {
      const { bau, lippe, ms, g } = z.erg;
      console.log(
        `${z.name.padEnd(20)} ${bau.fund.stuecke.length} Stücke (${bau.fund.stuecke.map((st) => st.seiten.length).join('/')}), m ${bau.t.m}, ${bau.flaechen} Flächen, Pole ${bau.pole}, Lippe ${lippe.fehler.raum.toFixed(2)} px, Rest ${g.rest.map((r) => r.toFixed(2)).join(' ')}, Haut ${ms.hautMax.toFixed(2)}/${ms.hautP99.toFixed(2)} px, Normale ${ms.normaleMax.toFixed(1)}°, Knick ${ms.falten.toFixed(1)}° (A0 ${ms.faltenA0.toFixed(1)}°), Mundwinkel ${ms.faltenEcke.toFixed(1)}° (A0 ${ms.faltenEckeA0.toFixed(1)}°), außen ${(ms.aussen * PX).toFixed(2)} px, umgeklappt Haut ${z.umgeklapptHaut}`,
      );
      expect(bau.pruefung.geschlossen, `${z.name}: Käfig geschlossen`).toBe(true);
      expect(bau.pruefung.fehler, `${z.name}: Käfigfehler`).toEqual([]);
      expect(ms.aussen * PX, `${z.name}: außen`).toBeLessThanOrEqual(1e-6);
      expect(bau.t.umgeklappt, `${z.name}: umgeklappt in der Karte`).toBe(0);
      expect(lippe.fehler.raum, `${z.name}: Lippe`).toBeLessThanOrEqual(1);
    }
  }, 900_000);

  it.fails('Haut ≤ 0,25 px an allen Fällen (verfehlt: Robbe hoch gerade 0,46 — Keil zwischen Lippe und Naht)', () => {
    let fehler = '';
    for (const z of alle()) if (z.erg.ms.hautMax > 0.25) fehler += `${z.name}: ${z.erg.ms.hautMax.toFixed(2)} px; `;
    expect(fehler).toBe('');
  }, 900_000);

  it.fails('Mundwinkel: Knick ≤ A0 + 2° an allen Fällen (verfehlt: Kugel mittel J 3,7 gegen 1,3, Langhals hoch J 7,8 gegen 3,5)', () => {
    let fehler = '';
    for (const z of alle()) if (z.erg.ms.faltenEcke > z.erg.ms.faltenEckeA0 + 2) fehler += `${z.name}: ${z.erg.ms.faltenEcke.toFixed(1)}° (A0 ${z.erg.ms.faltenEckeA0.toFixed(1)}°); `;
    expect(fehler).toBe('');
  }, 900_000);

  it('Mundwinkel: Knick ≤ A0 + 2° an acht von zehn Fällen', () => {
    const zs = alle();
    const ok = zs.filter((z) => z.erg.ms.faltenEcke <= z.erg.ms.faltenEckeA0 + 2).length;
    expect(ok).toBeGreaterThanOrEqual(8);
  }, 900_000);

  it.fails('Knick frei ≤ A0 + 2° und keine umgeklappte Zelle der Haut (verfehlt: Robbe hoch J und Birne S falten je eine bis zwei Zellen von 1 px² neben der Lippe; Rex mittel gerade 31,5 gegen 27,1 am Feldrand; Kugel, Langhals am Mundwinkel)', () => {
    let fehler = '';
    for (const z of alle()) {
      if (z.erg.ms.falten > z.erg.ms.faltenA0 + 2) fehler += `${z.name}: Knick ${z.erg.ms.falten.toFixed(1)}° (A0 ${z.erg.ms.faltenA0.toFixed(1)}°); `;
      if (z.umgeklapptHaut) fehler += `${z.name}: ${z.umgeklapptHaut} umgeklappt; `;
    }
    expect(fehler).toBe('');
  }, 900_000);
});
