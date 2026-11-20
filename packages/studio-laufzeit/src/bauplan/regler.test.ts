// ReglerPlan (Plan 4.3, 4.4): Felder je Regler, Rechenfolge nach Drähten und Spiegelregeln, Kreise als Hinweis, und schrittweise = voll
// nach zufälligen Diffs.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Datensatz, Diff, Dokument } from '@ee/studio-format/typen/dokument';
import type { Regler, Spiegelregel } from '@ee/studio-format/typen/form';
import type { Id } from '@ee/studio-format/typen/grund';
import type { Messwert } from '@ee/studio-format/typen/logik';
import { type Strom, strom } from '@ee/studio-rechnen/zufall';
import { ordnungPlanBauen } from './ordnung';
import { federFrequenz, inSpiegelHaelfte, rechenfolge, reglerPlanBauen } from './regler';

const H = 'gebaut' as const;
const FIG = 'fig_A000000000' as Id<'fig'>;
const SZ = 'sz_A000000000' as Id<'sz'>;
const ZEICHEN = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function regler(id: string, mehr: Partial<Regler> = {}): Regler {
  return {
    id: id as Id<'rg'>, besitzer: FIG, name: 'r', art: 'linie', bereich: [-1, 2], standard: 0.5, einheit: 'eins', raster: 0.015,
    ausgleich: { dauer: 0.25, federung: 0.2 }, herkunft: H, ...mehr,
  };
}
const draht = (id: string, quelle: string, ziel: string): Datensatz => ({
  id: id as Id<'dr'>, besitzer: FIG, quelle: quelle as Id<'rg'> | Messwert, ziel: ziel as Id<'rg'>, kennlinie: [[0, 0], [1, 1]],
  kurve: 'linear', glaetten: 0, herkunft: H,
});
const spiegel = (ab: number, um: number, mit: { regler: string; um: number }[] = []): Spiegelregel => ({
  ab, um, achseX: 0, paare: [], umnummern: [], reihenfolgeTauschen: true, regler: mit.map((m) => ({ regler: m.regler as Id<'rg'>, um: m.um })),
});
const figur: Datensatz = { id: FIG, name: 'f', datei: 'f', einheitL: 100, lage: { x: 'rg_x000000000', y: 'rg_y000000000', drehung: 'rg_d000000000' }, herkunft: H };
const szene: Datensatz = { id: SZ, name: 's', datei: 's', welt: 'welt_0000000000', saat: 1, herkunft: H };

function dokument(ds: readonly Datensatz[]): Dokument {
  return { versionen: { bloecke: { kern: 1, knochen: 1, posen: 1, physik: 1, bild: 1, logik: 1, welt: 1, ton: 1 }, arten: {} }, datensaetze: new Map(ds.map((d) => [d.id, d])) };
}

function plan(ds: readonly Datensatz[]): ReturnType<typeof reglerPlanBauen> {
  const dok = dokument(ds);
  return reglerPlanBauen(dok, ordnungPlanBauen(dok));
}

describe('Felder je Regler', () => {
  it('Bereich, Ruhestelle, Kreis, Ausgleich, Höchsttempo, Nachlauf, Raster und Spiegelregel', () => {
    const p = plan([
      figur, szene,
      regler('rg_1000000000', { art: 'kreis', bereich: [0, 360], standard: 0, hoechsttempo: 160, nachlauf: 0.2, raster: 0.5,
        spiegel: spiegel(180, 360) }),
      regler('rg_2000000000', { besitzer: SZ, ausgleich: { dauer: 0, federung: 1 } }),
      regler('rg_3000000000', { ausgleich: { dauer: -1, federung: 0 } }),
    ]);
    expect(p.anzahl).toBe(3);
    // Reihenfolge: Figur vor Szene, darin nach Kennung
    expect(Array.from(p.bereich)).toEqual([0, 360, -1, 2, -1, 2]);
    expect(Array.from(p.standard)).toEqual([0, 0.5, 0.5]);
    expect(Array.from(p.kreis)).toEqual([1, 0, 0]);
    expect(Array.from(p.federF)).toEqual([4, Infinity, Infinity]);
    expect(Array.from(p.federZeta)).toEqual([0.8, 1, 0]);
    expect(Array.from(p.hoechsttempo)).toEqual([160, Infinity, Infinity]);
    expect(Array.from(p.nachlauf)).toEqual([0.2, 0, 0]);
    expect(Array.from(p.raster)).toEqual([0.5, 0.015, 0.015]);
    expect(Array.from(p.spiegelAb)).toEqual([180, NaN, NaN]);
    expect(Array.from(p.spiegelUm)).toEqual([360, NaN, NaN]);
    expect(Array.from(p.folge)).toEqual([0, 1, 2]);
    expect(p.hinweise).toEqual([]);
    expect(federFrequenz(0.5)).toBe(2);
    expect(federFrequenz(Number.NaN)).toBe(Infinity);
  });

  it('gespiegelte Hälfte: Kreisregler ab < w < um, Linienregler ab ≤ w < um', () => {
    const p = plan([figur, regler('rg_1000000000', { art: 'kreis', bereich: [0, 360], spiegel: spiegel(180, 360) }),
      regler('rg_2000000000', { bereich: [-90, 90], spiegel: spiegel(-90, 0) }), regler('rg_3000000000')]);
    expect([180, 180.5, 359.5, 360, 0].map((w) => inSpiegelHaelfte(p, 0, w))).toEqual([false, true, true, false, false]);
    expect([-90, -0.5, 0, 45].map((w) => inSpiegelHaelfte(p, 1, w))).toEqual([true, true, false, false]);
    expect(inSpiegelHaelfte(p, 2, 0.5)).toBe(false);
  });
});

describe('Rechenfolge', () => {
  it('jeder Regler nach der Quelle seines Drahts, sonst nach Nummer; Messwerte ordnen nichts', () => {
    const p = plan([
      figur, regler('rg_1000000000'), regler('rg_2000000000'), regler('rg_3000000000'), regler('rg_4000000000'),
      draht('dr_1000000000', 'rg_4000000000', 'rg_1000000000'),   // 3 → 0
      draht('dr_2000000000', 'rg_1000000000', 'rg_2000000000'),   // 0 → 1
      draht('dr_3000000000', 'bs_1000000000.tempo', 'rg_3000000000'),
    ]);
    expect(Array.from(p.folge)).toEqual([2, 3, 0, 1]);
    expect(p.hinweise).toEqual([]);
  });

  it('der spiegelnde Regler kommt vor dem mitgespiegelten (Befund 8)', () => {
    const p = plan([
      figur, regler('rg_1000000000', { art: 'kreis', bereich: [0, 360] }),   // θ
      regler('rg_2000000000'),                                                  // Nicken
      regler('rg_3000000000', { bereich: [-90, 90], spiegel: spiegel(-90, 0, [{ regler: 'rg_1000000000', um: 360 }, { regler: 'rg_2000000000', um: 0 }]) }),   // ψ
    ]);
    expect(Array.from(p.mitSpiegel)).toEqual([2, 2, -1]);
    expect(Array.from(p.mitUm)).toEqual([360, 0, NaN]);
    expect(Array.from(p.folge)).toEqual([2, 0, 1]);
  });

  it('ein Kreis ist ein Hinweis; jeder Regler kommt genau einmal vor, der Kreis in der Folge seiner Nummern', () => {
    const p = plan([
      figur, regler('rg_1000000000'), regler('rg_2000000000'), regler('rg_3000000000'), regler('rg_4000000000'),
      draht('dr_1000000000', 'rg_3000000000', 'rg_2000000000'), draht('dr_2000000000', 'rg_2000000000', 'rg_3000000000'),
      draht('dr_3000000000', 'rg_4000000000', 'rg_4000000000'), draht('dr_4000000000', 'rg_2000000000', 'rg_1000000000'),
    ]);
    expect(Array.from(p.folge)).toEqual([1, 2, 0, 3]);
    expect(p.hinweise).toHaveLength(2);
    expect(p.hinweise[0]).toContain('rg_2000000000, rg_3000000000');
    expect(p.hinweise[1]).toContain('rg_4000000000');
  });

  it('doppelt mitgespiegelt ist ein Hinweis; es gilt die Spiegelregel des Reglers mit der kleineren Nummer', () => {
    const p = plan([
      figur, regler('rg_1000000000'),
      regler('rg_2000000000', { spiegel: spiegel(0, 1, [{ regler: 'rg_1000000000', um: 1 }]) }),
      regler('rg_3000000000', { spiegel: spiegel(0, 1, [{ regler: 'rg_1000000000', um: 2 }]) }),
    ]);
    expect(p.mitSpiegel[0]).toBe(1);
    expect(p.mitUm[0]).toBe(1);
    expect(p.hinweise).toHaveLength(1);
    expect(p.hinweise[0]).toContain('rg_1000000000');
  });

  it('rechenfolge ist eine Folge aller Knoten, die jede Kante außerhalb eines Kreises achtet', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 40 }), fc.array(fc.tuple(fc.nat(39), fc.nat(39)), { maxLength: 80 }), (n, kanten) => {
      const nach: number[][] = Array.from({ length: n }, () => []);
      for (const [a, b] of kanten) if (a < n && b < n) nach[a]!.push(b);
      const kreise: number[][] = [];
      const folge = rechenfolge(n, nach, (g) => kreise.push(g));
      expect([...folge].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
      const stelle = new Int32Array(n);
      folge.forEach((v, i) => (stelle[v] = i));
      const imKreis = new Set(kreise.flat());
      for (let a = 0; a < n; a++) {
        for (const b of nach[a]!) if (!(imKreis.has(a) && imKreis.has(b))) expect(stelle[a]).toBeLessThan(stelle[b]!);
      }
      if (kanten.length === 0) expect(Array.from(folge)).toEqual(Array.from({ length: n }, (_, i) => i));
    }), { numRuns: 500 });
  });
});

// ---------- schrittweise = voll ----------

function kennung(z: Strom, v: string): string {
  let s = '';
  for (let i = 0; i < 10; i++) s += ZEICHEN[z.ganz(62)];
  return `${v}_${s}`;
}

function zufallsRegler(z: Strom, id: string, ids: readonly string[]): Regler {
  const mehr: Partial<Regler> = {
    besitzer: z.ganz(3) === 0 ? SZ : FIG, standard: z.ganz(5), ausgleich: { dauer: z.ganz(4) * 0.1, federung: z.ganz(3) * 0.25 },
  };
  if (z.ganz(2) === 0) mehr.hoechsttempo = 10 * z.ganz(20);
  if (z.ganz(2) === 0) mehr.nachlauf = 0.1 * z.ganz(5);
  if (z.ganz(3) === 0) mehr.art = 'kreis';
  if (z.ganz(4) === 0 && ids.length > 0) {
    mehr.spiegel = spiegel(z.ganz(10), 10 + z.ganz(10), Array.from({ length: z.ganz(3) }, () => ({ regler: ids[z.ganz(ids.length)]!, um: z.ganz(360) })));
  }
  return regler(id, mehr);
}

function zufallsDokument(z: Strom): Datensatz[] {
  const ids = Array.from({ length: z.ganz(12) }, () => kennung(z, 'rg'));
  const ds: Datensatz[] = [figur, szene, ...ids.map((id) => zufallsRegler(z, id, ids))];
  for (let i = z.ganz(10); i > 0; i--) {
    const quelle = ids.length === 0 || z.ganz(5) === 0 ? `${kennung(z, 'bs')}.tempo` : ids[z.ganz(ids.length)]!;
    const ziel = ids.length === 0 ? kennung(z, 'rg') : ids[z.ganz(ids.length)]!;
    ds.push(draht(kennung(z, 'dr'), quelle, ziel));
  }
  return ds;
}

function zufallsDiff(z: Strom, vorher: readonly Datensatz[]): { nachher: Datensatz[]; diff: Diff } {
  const diff: Diff = { neu: [], weg: [], geaendert: [] };
  const nachher: Datensatz[] = [];
  const reglerIds = vorher.filter((d) => d.id.startsWith('rg_')).map((d) => d.id);
  for (const d of vorher) {
    const fest = d.id === FIG || d.id === SZ;
    const r = z.ganz(8);
    if (!fest && r === 0) {
      diff.weg.push(d);
    } else if (!fest && r === 1) {
      const n = d.id.startsWith('rg_') ? zufallsRegler(z, d.id, reglerIds) : draht(d.id, reglerIds[z.ganz(Math.max(1, reglerIds.length))] ?? 'rg_x000000000', reglerIds[0] ?? 'rg_y000000000');
      diff.geaendert.push([d, n]);
      nachher.push(n);
    } else if (r === 2) {
      const n = { ...d, ...('name' in d ? { name: `${d.name}+` } : {}) } as Datensatz;
      diff.geaendert.push([d, n]);
      nachher.push(n);
    } else {
      nachher.push(d);
    }
  }
  if (z.ganz(3) === 0) {
    const n = zufallsRegler(z, kennung(z, 'rg'), reglerIds);
    diff.neu.push(n);
    nachher.push(n);
  }
  if (z.ganz(3) === 0 && reglerIds.length > 0) {
    const n = draht(kennung(z, 'dr'), reglerIds[z.ganz(reglerIds.length)]!, reglerIds[z.ganz(reglerIds.length)]!);
    diff.neu.push(n);
    nachher.push(n);
  }
  return { nachher, diff };
}

describe('schrittweise = voll', () => {
  it('nach zufälligen Diffs ergeben voller und schrittweiser Neubau gleiche Felder', () => {
    fc.assert(fc.property(fc.integer(), (saat) => {
      const z = strom(saat, 'regler');
      const vorher = zufallsDokument(z);
      const dokVorher = dokument(vorher);
      const ordnungVorher = ordnungPlanBauen(dokVorher);
      const alt = { ordnung: ordnungVorher, regler: reglerPlanBauen(dokVorher, ordnungVorher) };
      const { nachher, diff } = zufallsDiff(z, vorher);
      const dok = dokument(nachher);
      const ordnung = ordnungPlanBauen(dok, ordnungVorher, diff);
      const schrittweise = reglerPlanBauen(dok, ordnung, alt, diff);
      const voll = reglerPlanBauen(dok, ordnungPlanBauen(dok));
      expect(schrittweise).toEqual(voll);
      const betrifft = [...diff.neu, ...diff.weg, ...diff.geaendert.flat()].some((d) => d.id.startsWith('rg_') || d.id.startsWith('dr_'));
      if (!betrifft) expect(schrittweise).toBe(alt.regler);
    }), { numRuns: 400 });
  });
});
