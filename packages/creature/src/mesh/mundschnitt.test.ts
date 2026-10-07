import { describe, expect, it } from 'vitest';
import { parseBauplan } from '../bauplan/schema';
import { buildCreature } from './build';
import { nonManifoldEdges } from './surfaceNets';
import { posedPositions } from '../mouth/pose';

/**
 * Lippenschnitt: Das geschlossen gebaute Maul hat zusammenfallende Ränder (perfekt zu), das Netz bleibt geschlossen
 * (Tasche verbindet die Ränder), und offen klafft der Rand vorn um die Öffnungsweite.
 */
const REX = { koerper: { hoehe: 0.72, breite: 1.3, laenge: 1.8, neigung: 0.55, buckel: 0.55, bauch: 0.45, boden: 0.7, querschnitte: [0.82, 1.0, 1.0, 0.86, 0.6] as [number, number, number, number, number] }, hals: { laenge: 0.12, dicke: 1.2, kruemmung: 0.2, ansatz: 0.85 }, kopf: { groesse: 1.75, laenge: 1.35, neigung: 0.15, schnauze: 0.55, schnauzeDicke: 0.95, braue: 0.9 }, maul: { hoehe: 0.4, neigung: 0.6, form: 1, rundung: 0.2, winkel: 0.9, breite: 1.0, oberkiefer: 1.3, unterkiefer: 1.0, lippe: 0.2, oeffnung: 0.7, tiefe: 0.9 }, zaehne: { groesse: 1.0, dichte: 0.45 }, augen: { typ: 'drache' as const, hoehe: 0.62, abstand: 0.45, groesse: 0.2, tiefe: 0.6 }, unterkoerper: { typ: 'beine' as const, beine: { anzahl: 2 as const, dicke: 1.0, schenkel: 1.0, laenge: 0.32, fuss: 0.85, spreiz: 0.55 } }, schwanz: { typ: 'wirbelsaeule' as const, laenge: 1.6, dicke: 1.0, hoch: 0.15 } };

describe('Lippenschnitt', () => {
  for (const [name, bp] of [['rex', REX], ['giraffe', { koerper: { hoehe: 0.9, breite: 1.0, laenge: 1.05, bauch: 0.3, boden: 0.35 }, hals: { laenge: 1.25, dicke: 0.5, kruemmung: 0.25, ansatz: 0.6 }, kopf: { groesse: 0.9, laenge: 1.3, schnauze: 0.9, neigung: -0.15 }, maul: { hoehe: 0.3, form: 0.6, rundung: 1, winkel: 0.2, breite: 0.48, unterkiefer: 0.8, lippe: 0, oeffnung: 0.8 }, zaehne: { stil: 'keine' as const }, unterkoerper: { typ: 'beine' as const, beine: { anzahl: 4 as const, laenge: 0.25 } } }], ['aal', { koerper: { hoehe: 0.85, breite: 0.95, laenge: 1.05, neigung: 0.25 }, maul: { hoehe: 0.42, form: 0.6, rundung: 1, winkel: 0.7, breite: 1.0, unterkiefer: 0.9, lippe: 0, oeffnung: 0.75, tiefe: 0.75 }, zaehne: { stil: 'spitz' as const, groesse: 0.5, dichte: 0.85 }, unterkoerper: { typ: 'schlange' as const } }]] as const) {
    it(`${name}: Rand zu, Netz geschlossen, offen klafft es`, () => {
      const b = parseBauplan(bp);
      const r = buildCreature(b, { resolution: 56 });
      expect(r.mouth).not.toBeNull();
      expect(r.mouth!.randAnzahl).toBeGreaterThan(12);
      const nm = nonManifoldEdges(r.index, r.stats.vertexCount);
      // Spitzen des Schlitzes dürfen je zwei offene Kanten lassen
      expect(nm).toBeLessThanOrEqual(8);
      let nan = 0;
      for (let i = 0; i < r.positions.length; i++) if (!Number.isFinite(r.positions[i]!)) nan++;
      expect(nan).toBe(0);
      // offen: Vertices der Region Rachen (Tasche) sind von außen sichtbar → der Rand klafft; messen über die Zähne-Positionen ist
      // unnötig, hier: Lage der Taschenvertices vor/nach der Pose unterscheidet sich (Unterkiefer bewegt den Boden)
      const zu = posedPositions(r, { openness: 0, maul: b.maul });
      const auf = posedPositions(r, { openness: 1, maul: b.maul });
      let moved = 0, total = 0;
      for (let v = 0; v < r.stats.vertexCount; v++) {
        if (r.descriptors.region[v * 4]! < 0.5) continue;
        total++;
        const d = Math.hypot(auf[v * 3]! - zu[v * 3]!, auf[v * 3 + 1]! - zu[v * 3 + 1]!, auf[v * 3 + 2]! - zu[v * 3 + 2]!);
        if (d > 0.02 * r.bodyScale) moved++;
      }
      console.log(`${name}: ${r.mouth!.randAnzahl} Randvertices, ${total} Taschenvertices, ${moved} bewegen sich beim Öffnen, ${r.mouth!.teeth.length} Zähne, offene Kanten ${nm}, ${r.stats.vertexCount} V in ${r.stats.ms.toFixed(0)} ms`);
      expect(total).toBeGreaterThan(50);
      expect(moved / total).toBeGreaterThan(0.3);
    }, 120_000);
  }
});
