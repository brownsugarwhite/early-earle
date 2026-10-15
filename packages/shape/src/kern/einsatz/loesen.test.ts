// Teil A, Schritt A7: Haut des Einsatzes formtreu lösen (Kiefer gleich, zu). Geprüft wird, was das Lösen garantiert: außerhalb
// von M ∪ C bitgleich zu K1, endliche Lagen, Spiegel der gelösten Haut bitgenau. Die Maße nach Entwurf 3.5 (Abstand und
// Normalen gegen A0, Knicke, Lippenwulst) werden je Fall ausgegeben — das Tor (0,25 px, 1°) ist noch nicht erreicht: Am
// Mundwinkel faltet die Grenzfläche (Kritik-Register, Befunde A7).
import { describe, expect, it } from 'vitest';
import { einsatzFaelle, einsatzFall } from '../pruefen/einsatzFall';
import { lippeAnpassen } from './lippe';
import { a0Netz, einsatzLoesen, einsatzMessen } from './loesen';
import { einsatzTopologie } from './topologie';

declare const console: { log: (...a: unknown[]) => void };

describe('Teil A, A7: Haut lösen', () => {
  it('außen bitgleich, Spiegel bitgenau, Maße je Fall (ausgeglichene Felder, Linie auf der Haut)', () => {
    let fehler = '';
    let n = 0;
    const zeilen: string[] = [];
    for (const [art, anfang, form] of einsatzFaelle()) {
      const f = einsatzFall(art, anfang, form);
      if (!f || 'fehler' in f || f.hautAbstand > 1) continue;
      const linie = f.lippenZiel();
      const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie });
      if (t.m > 10) continue;
      n++;
      const fit = lippeAnpassen(linie, t.m, t.lippenAnteile);
      const g = einsatzLoesen(t, f.v.kaefig, f.feld, a0Netz(f.v.kaefig, 2), fit.punkte);
      const ms = einsatzMessen(g, t, f.v.kaefig, f.feld, fit.punkte);
      if (ms.aussen !== 0) fehler += `${f.name}: außen ${ms.aussen}; `;
      for (let v = 0; v < g.kaefig.n; v++) {
        const s = t.spiegel[v]!;
        if (s < 0) continue;
        if (!Number.isFinite(g.xyz[3 * v]!) || g.xyz[3 * s] !== g.xyz[3 * v] || g.xyz[3 * s + 1] !== g.xyz[3 * v + 1] || g.xyz[3 * s + 2] !== -g.xyz[3 * v + 2]!) {
          if (v >= t.nAlt) {
            fehler += `${f.name}: Punkt ${v} nicht gespiegelt; `;
            break;
          }
        }
      }
      zeilen.push(`${f.name} m ${t.m}: Haut ${ms.hautMax.toFixed(2)} px (99 % ${ms.hautP99.toFixed(2)}), Normale ${ms.normaleMax.toFixed(1)}° (99 % ${ms.normaleP99.toFixed(1)}°), Knick ${ms.falten.toFixed(0)}° (A0 ${ms.faltenA0.toFixed(0)}°), Wulst ${ms.wulst.toFixed(2)} px`);
    }
    console.log(`${n} Fälle\n${zeilen.join('\n')}${fehler ? `\nFehler: ${fehler}` : ''}`);
    expect(n).toBeGreaterThan(10);
    expect(fehler).toBe('');
  }, 900_000);
});
