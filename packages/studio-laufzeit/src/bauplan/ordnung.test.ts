// Ordnung des Bauplans (Plan 4.3): Regel je Typ, Nummern, Index, fehlende Besitzer, schrittweise = voll nach zufälligen Diffs, und wo
// die Anker jedes Teils im Puffer liegen (ankerBereiche).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DATENSATZ_TYPEN } from '@ee/studio-format/schema/reihenfolge';
import type { Datensatz, Diff, Dokument } from '@ee/studio-format/typen/dokument';
import type { Teil } from '@ee/studio-format/typen/figur';
import type { Id, Vorsilbe } from '@ee/studio-format/typen/grund';
import type { Band } from '@ee/studio-format/typen/logik';
import { type Strom, strom } from '@ee/studio-rechnen/zufall';
import { leererOrdnungPlan } from '../vertrag/bauplan';
import {
  ankerBereiche, BAND_RANG, indexVon, istGeschlossen, kennungen, ORDNUNG_FOLGE, ordnungGeaendert, ordnungPlanBauen, typVon,
} from './ordnung';

// ---------- kleine Datensätze (nur die Felder, die zählen, sind frei) ----------

const H = 'gebaut' as const;
const RG = 'rg_0000000000' as Id<'rg'>;
const ZEICHEN = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const figur = (id: Id<'fig'>): Datensatz => ({ id, name: id, datei: id, einheitL: 100, lage: { x: RG, y: RG, drehung: RG }, herkunft: H });
const szene = (id: Id<'sz'>): Datensatz => ({ id, name: id, datei: id, welt: 'welt_0000000000', saat: 1, herkunft: H });
const teil = (id: Id<'teil'>, f: Id<'fig'>, name = 't'): Datensatz =>
  ({ id, figur: f, name, art: 'flaeche', farbe: 'schwarz', ebene: 'a0', anker: [], herkunft: H });
const regler = (id: Id<'rg'>, besitzer: Id<'fig'> | Id<'sz'>, name = 'r'): Datensatz => ({
  id, besitzer, name, art: 'linie', bereich: [0, 1], standard: 0, einheit: 'eins', raster: 0.005,
  ausgleich: { dauer: 0.3, federung: 0 }, herkunft: H,
});
const knochen = (id: Id<'kn'>, f: Id<'fig'>): Datensatz => ({ id, figur: f, name: 'k', gelenk: [0, 0], winkel: RG, herkunft: H });
const bindung = (id: Id<'bd'>, t: Id<'teil'>): Datensatz =>
  ({ id, teil: t, achsen: [RG], wirkung: 'ansicht', mischart: 'koordinaten', periodisch: false, herkunft: H });
const schluessel = (id: Id<'sl'>, b: Id<'bd'>): Datensatz => ({ id, bindung: b, an: [0], art: 'form', herkunft: H });
const schicht = (id: Id<'sch'>, f: Id<'fig'>, ordnung: string): Datensatz =>
  ({ id, figur: f, name: 's', ordnung, art: 'ersetzen', regler: [], physik: false, herkunft: H });
const pose = (id: Id<'po'>, s: Id<'sch'>, name = 'p'): Datensatz => ({ id, schicht: s, name, ordnung: 'a0', werte: [], gewicht: RG, herkunft: H });
const ding = (id: Id<'di'>, s: Id<'sz'>): Datensatz =>
  ({ id, szene: s, name: 'd', figur: 'fig_0000000000', rolle: 'fest', lage: { winkel: 0, hoehe: 0, drehung: 0 }, ebene: 'a0', herkunft: H });
const regel = (id: Id<'re'>, s: Id<'sz'>, band: Band, ordnung: string): Datensatz => ({
  id, szene: s, geltung: { art: 'stamm' }, band, ordnung, aktiv: true, herkunft: H, satz: 'sobald', ereignis: 'e', falls: [], dann: [],
});
const aufgabe = (id: Id<'au'>, s: Id<'sz'>, ordnung: string): Datensatz => ({ id, szene: s, text: 'a', ordnung, vorlage: 'mal', herkunft: H });
const baustein = (id: Id<'bs'>, d: Id<'di'>): Datensatz => ({ id, art: 'zaehler', an: d, regler: {}, posen: {}, daten: {}, herkunft: H });

function dokument(ds: readonly Datensatz[]): Dokument {
  return { versionen: { bloecke: { kern: 1, knochen: 1, posen: 1, physik: 1, bild: 1, logik: 1, welt: 1, ton: 1 }, arten: {} }, datensaetze: new Map(ds.map((d) => [d.id, d])) };
}

// ---------- zufällige Dokumente und Diffs ----------

function kennung<V extends Vorsilbe>(z: Strom, v: V): Id<V> {
  let s = '';
  for (let i = 0; i < 10; i++) s += ZEICHEN[z.ganz(62)];
  return `${v}_${s}`;
}

const ORDNUNGEN = ['a0', 'a1', 'a2', 'Zz', 'a0V'];
const BAENDER: Band[] = ['koerper', 'regie', 'spieler', 'laune', 'grund'];

/** zufälliges Dokument aus allen Typen mit Besitzern; ein Zehntel der Besitzer fehlt */
function zufallsDokument(z: Strom): Datensatz[] {
  const wahl = <T>(liste: readonly T[], ersatz: T): T => (liste.length === 0 || z.ganz(10) === 0 ? ersatz : liste[z.ganz(liste.length)]!);
  const fehlt = <V extends Vorsilbe>(v: V): Id<V> => kennung(z, v);
  const figuren = Array.from({ length: z.ganz(4) }, () => kennung(z, 'fig'));
  const szenen = Array.from({ length: z.ganz(3) }, () => kennung(z, 'sz'));
  const teile = Array.from({ length: z.ganz(9) }, () => kennung(z, 'teil'));
  const bindungen = Array.from({ length: z.ganz(6) }, () => kennung(z, 'bd'));
  const schichten = Array.from({ length: z.ganz(5) }, () => kennung(z, 'sch'));
  const dinge = Array.from({ length: z.ganz(4) }, () => kennung(z, 'di'));
  const besitzer = (): Id<'fig'> | Id<'sz'> => (z.ganz(2) === 0 ? wahl(figuren, fehlt('fig')) : wahl(szenen, fehlt('sz')));
  const ds: Datensatz[] = [
    ...figuren.map(figur), ...szenen.map(szene),
    ...teile.map((t) => teil(t, wahl(figuren, fehlt('fig')))),
    ...Array.from({ length: z.ganz(10) }, () => regler(kennung(z, 'rg'), besitzer())),
    ...Array.from({ length: z.ganz(5) }, () => knochen(kennung(z, 'kn'), wahl(figuren, fehlt('fig')))),
    ...bindungen.map((b) => bindung(b, wahl(teile, fehlt('teil')))),
    ...Array.from({ length: z.ganz(8) }, () => schluessel(kennung(z, 'sl'), wahl(bindungen, fehlt('bd')))),
    ...schichten.map((s) => schicht(s, wahl(figuren, fehlt('fig')), ORDNUNGEN[z.ganz(ORDNUNGEN.length)]!)),
    ...Array.from({ length: z.ganz(7) }, () => pose(kennung(z, 'po'), wahl(schichten, fehlt('sch')))),
    ...dinge.map((d) => ding(d, wahl(szenen, fehlt('sz')))),
    ...Array.from({ length: z.ganz(4) }, () => baustein(kennung(z, 'bs'), wahl(dinge, fehlt('di')))),
    ...Array.from({ length: z.ganz(7) }, () =>
      regel(kennung(z, 're'), wahl(szenen, fehlt('sz')), BAENDER[z.ganz(5)]!, ORDNUNGEN[z.ganz(ORDNUNGEN.length)]!)),
    ...Array.from({ length: z.ganz(4) }, () => aufgabe(kennung(z, 'au'), wahl(szenen, fehlt('sz')), ORDNUNGEN[z.ganz(ORDNUNGEN.length)]!)),
  ];
  return ds;
}

/** ändert einen Datensatz: einen Sortierschlüssel (Besitzer, Ordnung, Band) oder nur den Namen */
function aendern(z: Strom, d: Datensatz, alle: readonly Datensatz[], nurName: boolean): Datensatz {
  const andere = (v: string): string => {
    const kandidaten = alle.filter((x) => x.id.startsWith(`${v}_`)).map((x) => x.id);
    return kandidaten.length === 0 || z.ganz(4) === 0 ? kennung(z, v as Vorsilbe) : kandidaten[z.ganz(kandidaten.length)]!;
  };
  if (nurName || z.ganz(3) === 0) return { ...d, ...('name' in d ? { name: `${d.name}+` } : {}) } as Datensatz;
  switch (typVon(d.id)) {
    case 'teil': return { ...d, figur: andere('fig') } as Datensatz;
    case 'rg': return { ...d, besitzer: z.ganz(2) === 0 ? andere('fig') : andere('sz') } as Datensatz;
    case 'kn': return { ...d, figur: andere('fig') } as Datensatz;
    case 'bd': return { ...d, teil: andere('teil') } as Datensatz;
    case 'sl': return { ...d, bindung: andere('bd') } as Datensatz;
    case 'sch': return { ...d, ordnung: ORDNUNGEN[z.ganz(ORDNUNGEN.length)]! } as Datensatz;
    case 'po': return { ...d, schicht: andere('sch') } as Datensatz;
    case 'di': return { ...d, szene: andere('sz') } as Datensatz;
    case 'bs': return { ...d, an: andere('di') } as Datensatz;
    case 're': return { ...d, band: BAENDER[z.ganz(5)]!, ordnung: ORDNUNGEN[z.ganz(ORDNUNGEN.length)]! } as Datensatz;
    case 'au': return { ...d, ordnung: ORDNUNGEN[z.ganz(ORDNUNGEN.length)]! } as Datensatz;
    default: return d;
  }
}

/** zufälliger Diff von `vorher`: löschen, ändern, anlegen; `nurNamen`: nur Namen ändern (die Ordnung bleibt) */
function zufallsDiff(z: Strom, vorher: readonly Datensatz[], nurNamen: boolean): { nachher: Datensatz[]; diff: Diff } {
  const diff: Diff = { neu: [], weg: [], geaendert: [] };
  const nachher: Datensatz[] = [];
  for (const d of vorher) {
    if (!nurNamen && z.ganz(7) === 0) {
      diff.weg.push(d);
      continue;
    }
    if (z.ganz(4) === 0) {
      const n = aendern(z, d, vorher, nurNamen);
      if (n !== d) {
        diff.geaendert.push([d, n]);
        nachher.push(n);
        continue;
      }
    }
    nachher.push(d);
  }
  if (!nurNamen) {
    for (const d of zufallsDokument(z).slice(0, z.ganz(4))) {
      diff.neu.push(d);
      nachher.push(d);
    }
  }
  return { nachher, diff };
}

// ---------- Tests ----------

describe('Regel je Typ', () => {
  it('jeder Datensatztyp kommt genau einmal vor, Besitzer vor ihren Datensätzen', () => {
    expect([...ORDNUNG_FOLGE].sort()).toEqual([...DATENSATZ_TYPEN].sort());
    expect(Object.keys(leererOrdnungPlan().listen).sort()).toEqual([...DATENSATZ_TYPEN].sort());
    const folge: readonly string[] = ORDNUNG_FOLGE;
    const vor = (a: string, b: string): boolean => folge.indexOf(a) < folge.indexOf(b);
    for (const [typ, besitzer] of [['teil', 'fig'], ['rg', 'sz'], ['bd', 'teil'], ['sl', 'bd'], ['po', 'sch'], ['ue', 'sch'], ['ch', 'di'],
      ['kc', 'ue'], ['di', 'sz'], ['bs', 'di'], ['dr', 'sz'], ['re', 'sz'], ['au', 'sz'], ['af', 'teil'], ['ef', 'sz']] as const) {
      expect(vor(besitzer, typ)).toBe(true);
    }
    expect(BAND_RANG).toEqual({ koerper: 0, regie: 1, spieler: 2, laune: 3, grund: 4 });
    expect(typVon('teil_0123456789')).toBe('teil');
    expect(typVon('an_0123456789')).toBeNull();
    expect(typVon('ohneUnterstrich')).toBeNull();
  });

  it('Teile, Regler und Knochen nach Besitzer (Figuren vor Szenen), darin nach Kennung; fehlende Besitzer zuletzt', () => {
    const ds = [
      figur('fig_B000000000'), figur('fig_A000000000'), szene('sz_A000000000'),
      teil('teil_3000000000', 'fig_B000000000'), teil('teil_1000000000', 'fig_A000000000'), teil('teil_2000000000', 'fig_B000000000'),
      teil('teil_0000000000', 'fig_Z000000000'),   // Besitzer fehlt
      regler('rg_1000000000', 'sz_A000000000'), regler('rg_2000000000', 'fig_B000000000'), regler('rg_3000000000', 'fig_A000000000'),
      regler('rg_0000000001', 'fig_X000000000'), regler('rg_0000000000', 'fig_Y000000000'),
      knochen('kn_2000000000', 'fig_A000000000'), knochen('kn_1000000000', 'fig_B000000000'),
    ];
    const o = ordnungPlanBauen(dokument(ds));
    expect(o.figuren).toEqual(['fig_A000000000', 'fig_B000000000']);
    expect(o.teile).toEqual(['teil_1000000000', 'teil_2000000000', 'teil_3000000000', 'teil_0000000000']);
    expect(o.regler).toEqual(['rg_3000000000', 'rg_2000000000', 'rg_1000000000', 'rg_0000000001', 'rg_0000000000']);
    expect(o.knochen).toEqual(['kn_2000000000', 'kn_1000000000']);
    expect(o.listen.sz).toEqual(['sz_A000000000']);
    expect(o.figuren).toBe(o.listen.fig);
    expect(o.teile).toBe(o.listen.teil);
    expect(o.regler).toBe(o.listen.rg);
    expect(o.knochen).toBe(o.listen.kn);
    expect(kennungen(o, 'teil')).toBe(o.teile);
  });

  it('Schichten in ihrer Rechenfolge, Regeln nach Szene, Band und Ordnung, Aufgaben nach Ordnung', () => {
    const ds = [
      figur('fig_A000000000'), szene('sz_B000000000'), szene('sz_A000000000'),
      schicht('sch_1000000000', 'fig_A000000000', 'a2'), schicht('sch_2000000000', 'fig_A000000000', 'a0'),
      schicht('sch_3000000000', 'fig_A000000000', 'a1'),
      regel('re_1000000000', 'sz_A000000000', 'grund', 'a0'), regel('re_2000000000', 'sz_A000000000', 'koerper', 'a1'),
      regel('re_3000000000', 'sz_A000000000', 'koerper', 'a0'), regel('re_4000000000', 'sz_B000000000', 'koerper', 'a0'),
      regel('re_5000000000', 'sz_A000000000', 'laune', 'Zz'),
      aufgabe('au_1000000000', 'sz_A000000000', 'a1'), aufgabe('au_2000000000', 'sz_A000000000', 'a0'),
    ];
    const o = ordnungPlanBauen(dokument(ds));
    expect(o.listen.sch).toEqual(['sch_2000000000', 'sch_3000000000', 'sch_1000000000']);
    expect(o.listen.re).toEqual(['re_3000000000', 're_2000000000', 're_5000000000', 're_1000000000', 're_4000000000']);
    expect(o.listen.au).toEqual(['au_2000000000', 'au_1000000000']);
  });

  it('index gibt jede Kennung mit ihrer Nummer im Typ; indexVon −1 für Unbekanntes', () => {
    fc.assert(fc.property(fc.integer(), (saat) => {
      const ds = zufallsDokument(strom(saat, 'index'));
      const o = ordnungPlanBauen(dokument(ds));
      let zahl = 0;
      for (const typ of ORDNUNG_FOLGE) {
        o.listen[typ].forEach((id, i) => expect(o.index.get(id)).toBe(i));
        zahl += o.listen[typ].length;
      }
      expect(o.index.size).toBe(ds.length);
      expect(zahl).toBe(ds.length);
      for (const d of ds) expect(indexVon(o, d.id)).toBe(o.index.get(d.id));
      expect(indexVon(o, 'teil_nichtDa000')).toBe(-1);
    }), { numRuns: 200 });
  });

  it('unabhängig von der Reihenfolge der Datensätze im Dokument', () => {
    fc.assert(fc.property(fc.integer(), (saat) => {
      const z = strom(saat, 'reihenfolge');
      const ds = zufallsDokument(z);
      const gemischt = [...ds];
      for (let i = gemischt.length - 1; i > 0; i--) {
        const j = z.ganz(i + 1);
        [gemischt[i], gemischt[j]] = [gemischt[j]!, gemischt[i]!];
      }
      expect(ordnungPlanBauen(dokument(gemischt))).toEqual(ordnungPlanBauen(dokument(ds)));
    }), { numRuns: 200 });
  });
});

describe('schrittweise = voll', () => {
  it('nach zufälligen Diffs ergeben voller und schrittweiser Neubau gleiche Felder', () => {
    fc.assert(fc.property(fc.integer(), fc.boolean(), (saat, nurNamen) => {
      const z = strom(saat, 'diff');
      const vorher = zufallsDokument(z);
      const alt = ordnungPlanBauen(dokument(vorher));
      const { nachher, diff } = zufallsDiff(z, vorher, nurNamen);
      const voll = ordnungPlanBauen(dokument(nachher));
      const schrittweise = ordnungPlanBauen(dokument(nachher), alt, diff);
      expect(schrittweise).toEqual(voll);
      if (!ordnungGeaendert(diff)) expect(schrittweise).toBe(alt);
      if (nurNamen) expect(ordnungGeaendert(diff)).toBe(false);
    }), { numRuns: 400 });
  });

  it('ein Diff, der nur Namen ändert, lässt die Ordnung; einer, der einen Besitzer ändert, nicht', () => {
    const vorher = [figur('fig_A000000000'), figur('fig_B000000000'), teil('teil_1000000000', 'fig_A000000000')];
    const alt = ordnungPlanBauen(dokument(vorher));
    const umbenannt = teil('teil_1000000000', 'fig_A000000000', 'neu');
    expect(ordnungPlanBauen(dokument([...vorher.slice(0, 2), umbenannt]), alt, { neu: [], weg: [], geaendert: [[vorher[2]!, umbenannt]] })).toBe(alt);
    const umgezogen = teil('teil_1000000000', 'fig_B000000000');
    const diff: Diff = { neu: [], weg: [], geaendert: [[vorher[2]!, umgezogen]] };
    expect(ordnungGeaendert(diff)).toBe(true);
    expect(ordnungPlanBauen(dokument([...vorher.slice(0, 2), umgezogen]), alt, diff)).not.toBe(alt);
    expect(ordnungPlanBauen(dokument(vorher), alt)).not.toBe(alt);   // ohne Diff: voller Neubau
  });
});

describe('Anker im Puffer (ankerBereiche)', () => {
  /** ein Teil mit n Ankern (Kennungen aus der Kennung des Teils und der Nummer) und weiteren Feldern */
  const mitAnkern = (t: Datensatz, n: number, mehr: object = {}): Datensatz =>
    ({ ...t, anker: Array.from({ length: n }, (_, i) => `an_${t.id.slice(5)}${i}`), ...mehr }) as Datensatz;

  it('Teil für Teil nach OrdnungPlan.teile, je Teil nach Teil.anker; geschlossen ist eine Fläche oder eine Linie mit offen false', () => {
    const ds = [
      figur('fig_B000000000'), figur('fig_A000000000'),
      mitAnkern(teil('teil_3000000000', 'fig_B000000000'), 4, { art: 'linie', linie: { offen: false, breite: [] } }),
      mitAnkern(teil('teil_1000000000', 'fig_A000000000'), 5),
      mitAnkern(teil('teil_2000000000', 'fig_B000000000'), 3, { art: 'linie', linie: { offen: true, breite: [] } }),
      mitAnkern(teil('teil_4000000000', 'fig_B000000000'), 1, { art: 'linie' }),   // ohne `linie`: offen
    ];
    const dok = dokument(ds);
    const o = ordnungPlanBauen(dok);
    expect(o.teile).toEqual(['teil_1000000000', 'teil_2000000000', 'teil_3000000000', 'teil_4000000000']);
    const b = ankerBereiche(dok, o);
    expect([...b.anzahl]).toEqual([5, 3, 4, 1]);
    expect([...b.erster]).toEqual([0, 5, 8, 12]);
    expect([...b.geschlossen]).toEqual([1, 0, 1, 0]);
    expect([...b.stuecke]).toEqual([5, 2, 4, 0]);
    expect([...b.erstesStueck]).toEqual([0, 5, 7, 11]);
    expect([b.ankerZahl, b.stueckZahl]).toEqual([13, 11]);
    expect(istGeschlossen({ art: 'flaeche' })).toBe(true);
    expect(ankerBereiche(dokument([]), ordnungPlanBauen(dokument([])))).toMatchObject({ ankerZahl: 0, stueckZahl: 0 });
  });

  it('nach zufälligen Dokumenten: erster ist die Summe davor; ein Anker mehr lässt die Ordnung und verschiebt nur die Teile dahinter', () => {
    fc.assert(fc.property(fc.integer(), (saat) => {
      const z = strom(saat, 'anker');
      const ds = zufallsDokument(z).map((d) => (typVon(d.id) === 'teil'
        ? mitAnkern(d, z.ganz(7), z.ganz(2) === 0 ? {} : { art: 'linie', linie: { offen: z.ganz(2) === 0, breite: [] } })
        : d));
      const dok = dokument(ds);
      const o = ordnungPlanBauen(dok);
      const b = ankerBereiche(dok, o);
      let anker = 0, stuecke = 0;
      o.teile.forEach((id, i) => {
        const t = dok.datensaetze.get(id) as Teil;
        const zu = t.art === 'flaeche' || t.linie?.offen === false;
        expect([b.erster[i], b.anzahl[i], b.geschlossen[i], b.erstesStueck[i]]).toEqual([anker, t.anker.length, zu ? 1 : 0, stuecke]);
        expect(b.stuecke[i]).toBe(zu ? t.anker.length : Math.max(0, t.anker.length - 1));
        anker += t.anker.length;
        stuecke += b.stuecke[i]!;
      });
      expect([b.ankerZahl, b.stueckZahl]).toEqual([anker, stuecke]);
      if (o.teile.length === 0) return;
      // ein Anker mehr an einem Teil: dieselbe Ordnung (dasselbe Objekt), nur die Teile dahinter rücken um eins
      const k = z.ganz(o.teile.length), vorher = dok.datensaetze.get(o.teile[k]!)!;
      const nachher = mitAnkern(vorher, (vorher as Teil).anker.length + 1);
      const diff: Diff = { neu: [], weg: [], geaendert: [[vorher, nachher]] };
      const dok2 = dokument(ds.map((d) => (d.id === vorher.id ? nachher : d)));
      expect(ordnungPlanBauen(dok2, o, diff)).toBe(o);
      const b2 = ankerBereiche(dok2, o);
      o.teile.forEach((_, i) => {
        expect(b2.erster[i]).toBe(b.erster[i]! + (i > k ? 1 : 0));
        expect(b2.anzahl[i]).toBe(b.anzahl[i]! + (i === k ? 1 : 0));
      });
      expect(b2.ankerZahl).toBe(b.ankerZahl + 1);
    }), { numRuns: 300 });
  });
});
