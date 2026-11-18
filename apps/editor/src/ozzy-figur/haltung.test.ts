// Etappe D1: An den Haltungen (Sitzen, Liegen; Kopf vorn und im Profil) liefert das Raster genau Florians Vorlagen, und beim
// Hinsetzen bleiben die Vorderpfoten stehen.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HALTUNGEN } from './haltung';
import { FigurRaster, type Lage } from './raster';
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

  it('jede Mischung der Haltungen (mit Hocke) und jeder Kopfwinkel hat eine Gestalt: endlich, auf dem Boden, nichts darunter', () => {
    let z = 4242;
    const zufall = (): number => ((z = (z * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let n = 0; n < 150; n++) {
      // zufällige Mischung, oft mit nur zwei oder drei Haltungen
      const g = Object.fromEntries(HALTUNGEN.map((h) => [h.name, zufall() < 0.4 ? 0 : zufall() ** 2]));
      const theta = zufall() < 0.3 ? Math.round(zufall()) * 90 : zufall() * 90;
      const lage = { psi: 90, theta, posen: g };
      const teile = raster.teile(lage);
      for (const t of teile) for (const a of t.form) for (const q of [a.p, a.i, a.o]) expect(Number.isFinite(q[0]) && Number.isFinite(q[1])).toBe(true);
      const haltungen = (raster as unknown as { haltungen: { bodenBei: (g: object, t: number) => number } }).haltungen;
      if (!Object.values(g).some((v) => v > 0)) continue;
      expect(Math.abs(FigurRaster.tiefster(teile) - haltungen.bodenBei(g, theta))).toBeLessThan(1e-6);
    }
  });

  it.each([
    ['stehen', 'hocke'],
    ['hocke', 'sitzen'],
    ['stehen', 'sitzen'],
    ['stehen', 'liegen'],
    ['sitzen', 'liegen'],
    ['hocke', 'liegen'],
  ] as const)('%s → %s geht stetig (Kopf vorn, 3/4, Profil): kein Anker springt', (a, b) => {
    for (const theta of [0, 45, 90]) {
      let vor: Map<string, { p: [number, number] }[]> | null = null;
      let groesster = 0;
      for (let i = 0; i <= 200; i++) {
        const t = i / 200;
        const jetzt = new Map(raster.teile({ psi: 90, theta, posen: { [a]: 1 - t, [b]: t } }).map((x) => [x.name, x.form]));
        if (vor)
          for (const [n, f] of jetzt) {
            const alt = vor.get(n);
            if (alt && alt.length === f.length) f.forEach((q, k) => (groesster = Math.max(groesster, Math.hypot(q.p[0] - alt[k]!.p[0], q.p[1] - alt[k]!.p[1]))));
          }
        vor = jetzt;
      }
      // je Zweihundertstel des Wegs höchstens 6 Einheiten (Ozzy ist rund 400 hoch): Ein Sprung bliebe bei jeder Schrittweite so groß.
      // Am schnellsten ist das Hinterbein, das hinter der Kamera wieder auftaucht (rund 4).
      expect(groesster).toBeLessThan(6);
    }
  });

  it('weiche Malreihenfolge: an den Vorlagen keine, dazwischen Anteile zwischen 0 und 1', () => {
    const anteile = (lage: Lage): number[][] | null => {
      const aus: { deckung?: number[][] | null } = {};
      raster.teile(lage, true, false, aus);
      return aus.deckung ?? null;
    };
    expect(anteile({ psi: 90, theta: 0, posen: { sitzen: 1 } })).toBeNull();
    expect(anteile({ psi: 90, theta: 90, posen: { liegen: 1 } })).toBeNull();
    const d = anteile({ psi: 90, theta: 0, posen: { sitzen: 0.5, liegen: 0.5 } });
    expect(d).not.toBeNull();
    const werte = d!.flat();
    expect(werte.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(werte.some((v) => v > 0 && v < 1)).toBe(true);
  });

  it('beim Hinsetzen bleiben die Vorderpfoten stehen (das ferne Vorderbein ist im Sitzen 0,45 Einheiten anders gezeichnet)', () => {
    const stand = new Map(raster.teile({ psi: 90, theta: 0 }).map((t) => [t.name, t.form]));
    for (let h = 0.05; h <= 1; h += 0.05) {
      const teile = new Map(raster.teile({ psi: 90, theta: 0, haltung: h }).map((t) => [t.name, t.form]));
      // die Bodenregel hebt ihn um höchstens 0,15 an, wo der gleitende Hinterfuß sonst knapp unter den Boden käme
      for (const [n, grenze] of [['beinRV', 0.25], ['beinLV', 0.6]] as const)
        teile.get(n)!.forEach((a, k) => expect(Math.hypot(a.p[0] - stand.get(n)![k]!.p[0], a.p[1] - stand.get(n)![k]!.p[1])).toBeLessThan(grenze));
    }
  });
});
