// Etappe D1: An den Haltungen (Sitzen, Liegen; Kopf vorn und im Profil) liefert das Raster genau Florians Vorlagen, und beim
// Hinsetzen bleiben die Vorderpfoten stehen.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FigurRaster } from './raster';
import { ANSICHT_NAMEN, ANSICHTEN, importieren } from './vorlagen/import';

const ORDNER = new URL('../../../../docs/look/ozzy-figur/vorlagen/', import.meta.url);
const texte: Record<string, string> = {};
for (const a of ANSICHT_NAMEN) texte[ANSICHTEN[a].datei] = readFileSync(new URL(ANSICHTEN[a].datei, ORDNER), 'utf8');
const daten = importieren(texte);
const raster = new FigurRaster(daten);

describe('Ozzy-Figur: Haltungen', () => {
  it.each([
    [1, 0, 'sitz1'],
    [2, 0, 'lieg1'],
    [1, 90, 'sitz2'],
    [2, 90, 'lieg2'],
  ] as const)('Haltung %s, Kopf %s° trifft %s Anker für Anker', (haltung, theta, ansicht) => {
    const lage = { psi: 90, theta, haltung };
    const v = raster.vorlage(lage)!;
    expect(v.ansicht).toBe(ansicht);
    const teile = new Map(raster.teile(lage).map((t) => [t.name, t.form]));
    const namen = daten.ansichten[ansicht].teile.map((t) => t.name);
    let groesster = 0;
    namen.forEach((n, i) => {
      const f = teile.get(n)!;
      v.formen[i]!.forEach((a, k) => {
        for (const g of ['p', 'i', 'o'] as const) groesster = Math.max(groesster, Math.hypot(a[g][0] - f[k]![g][0], a[g][1] - f[k]![g][1]));
      });
    });
    expect(groesster).toBeLessThan(1e-6);
  });

  it('beim Hinsetzen bleiben die Vorderpfoten stehen (das ferne Vorderbein ist im Sitzen 0,45 Einheiten anders gezeichnet)', () => {
    const stand = new Map(raster.teile({ psi: 90, theta: 0 }).map((t) => [t.name, t.form]));
    for (let h = 0.05; h <= 1; h += 0.05) {
      const teile = new Map(raster.teile({ psi: 90, theta: 0, haltung: h }).map((t) => [t.name, t.form]));
      for (const [n, grenze] of [['beinRV', 1e-3], ['beinLV', 0.5]] as const)
        teile.get(n)!.forEach((a, k) => expect(Math.hypot(a.p[0] - stand.get(n)![k]!.p[0], a.p[1] - stand.get(n)![k]!.p[1])).toBeLessThan(grenze));
    }
  });
});
