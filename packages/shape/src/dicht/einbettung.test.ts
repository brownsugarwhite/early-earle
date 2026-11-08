// Form zuerst (08.11.2026), Verfeinern im Zug mit der Zerlegung im Hintergrund: Die Zerlegung als Daten (wie sie ein Worker
// zurückschickt) löst genau wie die direkte, und die Einbettung eines verfeinerten Netzes in das alte gibt seine Punkte genau zurück.
import { describe, expect, it } from 'vitest';
import { flacheZeilen, normalSystemZerlegt, systemAusDaten, zeilenAusFlach, zerlegungsDaten } from '../loeser/zerlegung';
import { einbetten, einbettungAuswerten } from './einbettung';
import { hautAus } from './kurven';
import { LoopZug, mittlereKante } from './loops';
import { rundAusSeite } from './rund';
import { verdichten } from './verdichten';

const kugel = () => {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke: 3000 },
  );
  return hautAus(n.positionen, n.indizes);
};

describe('Verfeinern im Zug (08.11.)', () => {
  it('die Zerlegung als Daten (über flache Zeilen, wie im Worker) löst genau wie die direkte', () => {
    const h = kugel();
    const auftrag = new LoopZug(h, [], null, true, 'kurven', 'geometrie', { nurZeilen: true }).auftrag!;
    expect(auftrag.systeme.length).toBeGreaterThan(0);
    for (const s of auftrag.systeme) {
      const direkt = normalSystemZerlegt(s.n, s.zeilen, s.daempfung);
      const ueberDaten = systemAusDaten(zerlegungsDaten(s.n, zeilenAusFlach(flacheZeilen(s.zeilen)), s.daempfung));
      const rhs = Float64Array.from({ length: 3 * s.n }, (_, i) => Math.sin(i));
      const a = direkt.loesen(rhs);
      const b = ueberDaten.loesen(rhs);
      let d = 0;
      for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i]! - b[i]!));
      expect(d).toBe(0);
    }
  });

  it('ein verfeinertes Netz in das alte eingebettet: auf dem alten ausgewertet genau seine Punkte, mitbewegt mit dem alten', () => {
    const h = kugel();
    const v = verdichten(h, [], 0.8 * mittlereKante(h))!;
    expect(v.haut.n).toBeGreaterThan(h.n);
    for (const hinweis of [undefined, { nachbarn: v.haut.nachbarn, alt: v.alt }]) {
      const e = einbetten(h, v.haut.pos, hinweis);
      const p = einbettungAuswerten(e, h);
      let d = 0;
      for (let i = 0; i < p.length; i++) d = Math.max(d, Math.abs(p[i]! - v.haut.pos[i]!));
      expect(d).toBeLessThan(1e-9);
      // das alte Netz doppelt so groß: die eingebetteten Punkte gehen mit (bis auf die Wölbung zwischen den alten Punkten)
      const gross = { ...h, pos: h.pos.map((x) => 2 * x) };
      const q = einbettungAuswerten(e, gross);
      let r = 0;
      for (let k = 0; k < q.length; k += 3) r = Math.max(r, Math.abs(Math.hypot(q[k]!, q[k + 1]!, q[k + 2]!) - 300));
      expect(r).toBeLessThan(2);
    }
  });
});
