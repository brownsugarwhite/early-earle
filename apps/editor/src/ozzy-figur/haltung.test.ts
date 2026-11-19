// Etappe D: An den Haltungen (Sitzen, Liegen; Kopf vorn und im Profil) liefert das Raster genau Florians Vorlagen, die Wechsel gehen
// stetig, und was in einem Abschnitt eines Ablaufs stehen soll, bleibt in der Welt stehen.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ABLAEUFE, type AblaufName, dauerVon } from './ablauf';
import { type Anker, type Gewichte, HALTUNGEN } from './haltung';
import { FigurRaster, type Lage } from './raster';
import { drehLage } from './szenen';
import { ANSICHT_NAMEN, ANSICHTEN, importieren, type TeilName } from './vorlagen/import';

const ORDNER = new URL('../../../../docs/look/ozzy-figur/vorlagen/', import.meta.url);
const texte: Record<string, string> = {};
for (const a of ANSICHT_NAMEN) texte[ANSICHTEN[a].datei] = readFileSync(new URL(ANSICHTEN[a].datei, ORDNER), 'utf8');
const daten = importieren(texte);
const raster = new FigurRaster(daten);
const anker = (g: Gewichte, a: Anker): number => raster.ankerX(g, 0, a);

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

  // die Abschnitte der Abläufe (Hocke und Diener als Wegpunkte), dazu die direkten Mischungen Stehen–Sitzen (Hüpfer) und Sitzen–Liegen
  // (Rückfall für freie Mischungen: das Hinterbein geht durch die Kamera)
  it.each([
    ['stehen', 'hocke'],
    ['hocke', 'sitzen'],
    ['sitzen', 'diener'],
    ['diener', 'liegen'],
    ['stehen', 'diener'],
    ['diener', 'hocke'],
    ['stehen', 'liegen'],
    ['stehen', 'sitzen'],
    ['sitzen', 'liegen'],
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

  it.each(Object.keys(ABLAEUFE) as AblaufName[])('Ablauf %s: stetig in der Zeit, nichts unter dem Boden, endet in seiner Haltung', (name) => {
    const dauer = dauerVon(ABLAEUFE[name]);
    const schritte = Math.ceil(dauer * 240);
    let vor: Map<string, { p: [number, number] }[]> | null = null;
    let groesster = 0;
    let tiefster = -Infinity;
    for (let i = 0; i <= schritte; i++) {
      const teile = raster.teile(drehLage(name, i / schritte, anker));
      tiefster = Math.max(tiefster, FigurRaster.tiefster(teile));
      const jetzt = new Map(teile.map((x) => [x.name, x.form]));
      if (vor)
        for (const [n, f] of jetzt) {
          const alt = vor.get(n);
          if (alt && alt.length === f.length) f.forEach((q, k) => (groesster = Math.max(groesster, Math.hypot(q.p[0] - alt[k]!.p[0], q.p[1] - alt[k]!.p[1]))));
        }
      vor = jetzt;
    }
    // je 1/240 Sekunde höchstens 6 Einheiten (Aufprall und Hüpfer sind die schnellsten), nichts sinkt in den Boden
    expect(groesster).toBeLessThan(6);
    expect(tiefster).toBeLessThan(0.05);
    const ende = drehLage(name, 1, anker);
    const ziel = name === 'hinsetzen' || name === 'huepfer' || name === 'aufsetzen' ? 'sitzen' : name === 'aufstehen' || name === 'aufstehenSitz' ? 'stehen' : 'liegen';
    expect(ende.posen?.[ziel]).toBeCloseTo(1, 9);
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

  // Sohle eines Beins: Mitte der Anker bis 3 über seinem tiefsten Punkt, und wie tief dieser liegt
  const sohle = (form: { p: [number, number] }[]): { x: number; y: number } => {
    const y = Math.max(...form.map((a) => a.p[1]));
    const unten = form.filter((a) => a.p[1] > y - 3);
    return { x: unten.reduce((s, a) => s + a.p[0], 0) / unten.length, y };
  };

  it('Kette Stehen–Hocke–Sitzen: Die Vorderpfoten bleiben über ihrem Ort und heben sich in der Hocke ein wenig (Schritt zum Sitzen)', () => {
    const stand = new Map(raster.teile({ psi: 90, theta: 0 }).map((t) => [t.name, t.form]));
    let hoch = 0;
    for (let h = 0.05; h <= 1.0001; h += 0.05) {
      const teile = new Map(raster.teile({ psi: 90, theta: 0, haltung: h }).map((t) => [t.name, t.form]));
      for (const n of ['beinRV', 'beinLV'] as const) {
        const a = sohle(teile.get(n)!);
        expect(Math.abs(a.x - sohle(stand.get(n)!).x)).toBeLessThan(1.5);
        hoch = Math.max(hoch, -a.y);
      }
    }
    expect(hoch).toBeGreaterThan(8);
    expect(hoch).toBeLessThan(12);
  });

  // Florian (19.11.): „Die beine rutschen bei manchen animationen weil die posen verschiedenen positionierungen haben.“ Ozzy verschiebt
  // sich je Abschnitt als Ganzes; was dort stehen soll, bleibt in der Welt stehen, solange es den Boden berührt (beim Wegrutschen
  // rutschen die Beine mit Absicht)
  it.each((Object.keys(ABLAEUFE) as AblaufName[]).filter((n) => n !== 'rutschen'))('Ablauf %s: Was in einem Abschnitt stehen soll, rutscht nicht', (name) => {
    const a = ABLAEUFE[name];
    const d = dauerVon(a);
    const GRUPPE: Record<Exclude<Anker, 'koerper'>, TeilName[]> = { vorn: ['beinLV', 'beinRV'], hinten: ['beinLH', 'beinRH'], alle: ['beinLV', 'beinRV', 'beinLH', 'beinRH'] };
    let t0 = 0;
    let proben = 0;
    for (const x of a.abschnitte) {
      const von = t0 / d;
      const bis = (t0 + x.dauer) / d;
      t0 += x.dauer;
      if (!x.steht || x.steht === 'koerper') continue;
      const start: Record<string, number> = {};
      for (let i = 0; i <= 30; i++) {
        const teile = new Map(raster.teile(drehLage(name, von + ((bis - von) * i) / 30, anker)).filter((q) => !q.weiss).map((q) => [q.name, q.form]));
        for (const n of GRUPPE[x.steht]) {
          const q = sohle(teile.get(n)!);
          if (q.y < -1.5) continue;
          proben++;
          start[n] ??= q.x;
          expect(Math.abs(q.x - start[n]!)).toBeLessThan(1);
        }
      }
    }
    expect(proben).toBeGreaterThan(0);
  });
});
