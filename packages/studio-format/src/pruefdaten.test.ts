// Prüfdaten der Testfigur (Bauplan 5.3 M0; 3.1 bis 3.6). `pruefdaten/testfigur.json` ist eine Figur-Datei, von Hand in der
// Schreibweise aus 3.5 geschrieben; ab M1.2 schreibt der Schreiber sie neu (gleiche Daten), bis dahin lesen andere Pakete sie nur als
// Daten. Geprüft wird ohne pruefen.ts: die Schemas, die Verweise (3.6 Nr. 8), die Ankerzahlen (Nr. 1, 4), die übrigen Querregeln für
// die Datensätze, die sie hat (Nr. 2, 3, 5, 11; Schichten und Posen hat sie nicht), und ihr Steckbrief aus 5.3, damit ein Neuschreiben
// dieselben Daten behält. Schreibweise und Versionen prüft der Test nur so weit, wie 3.4 und 3.5 sie wörtlich festlegen; alles Übrige
// (etwa ob `bereich` auf einer Zeile steht, welche Arten der Kopf nennt) entscheidet der Schreiber von M1.2, ohne dass dieser Test rot
// wird. Die Testfigur steht für sich: Sie nennt keinen Datensatz aus projekt.json (Vorlage, Klang, Schrift), damit sie ohne Projekt
// lädt; ihr Vorlage-Schlüssel trägt darum kein Feld `vorlage`.
import { zahlText } from '@ee/studio-rechnen/zahl';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { artVersionen } from './arten/register';
import { istKennung, vorsilbeVon } from './kennung';
import { ankerZeileSchema, formSchema, versatzZeileSchema } from './schema/form';
import { punktSchema } from './schema/grund';
import { kennlinienPaarSchema } from './schema/logik';
import { dateiOrdnen, dateiSchema, datensatzTypVon } from './schema/reihenfolge';
import type { Datei, Datensatz, DatensatzTabelle, DatensatzTyp } from './typen/dokument';
import type { Teil } from './typen/figur';
import type { AnkerZeile, Bindung, Schluessel, VersatzZeile } from './typen/form';
import type { Aufhaengung } from './typen/knochen';
import type { Draht } from './typen/logik';
import { aktuelleVersionen, versionenAbgleichen } from './versionen';

const text = readFileSync(new URL('../pruefdaten/testfigur.json', import.meta.url), 'utf8');
const roh: unknown = JSON.parse(text);
const ergebnis = dateiSchema.safeParse(roh);

/** die Datei nach dem Schema; besteht sie es nicht, sagt der erste Test, woran es liegt */
function datei(): Datei {
  if (!ergebnis.success) throw new Error('testfigur.json besteht das Schema nicht (siehe den ersten Test)');
  return ergebnis.data;
}

function alle<T extends DatensatzTyp>(typ: T): DatensatzTabelle[T][] {
  return Object.values(datei().datensaetze[typ] ?? {});
}

function hole<T extends DatensatzTyp>(typ: T, id: string): DatensatzTabelle[T] {
  const d = datei().datensaetze[typ]?.[id];
  if (d === undefined) throw new Error(`${typ} ${id} fehlt in der Testfigur`);
  return d;
}

/** alle Datensätze der Datei nach Kennung */
function nachKennung(): Map<string, Datensatz> {
  const m = new Map<string, Datensatz>();
  for (const tabelle of Object.values(datei().datensaetze)) for (const d of Object.values(tabelle ?? {}) as Datensatz[]) m.set(d.id, d);
  return m;
}

/** jeder Anker der Figur mit seinem Teil */
function ankerTeile(): Map<string, Teil> {
  const m = new Map<string, Teil>();
  for (const t of alle('teil')) for (const a of t.anker) m.set(a, t);
  return m;
}

function schluesselVon(bd: Bindung): Schluessel[] {
  return alle('sl').filter((s) => s.bindung === bd.id);
}

/**
 * Figur, der ein Datensatz gehört (Besitzerkette, 3.1), für die Typen der Testfigur. Was in eine andere Datei gehört (Projekt, Szene
 * und ihre Datensätze) oder hier nicht vorkommt, gibt undefined, und der Test nennt es.
 */
function figurVon(id: string): string | undefined {
  switch (datensatzTypVon(id)) {
    case 'fig':
      return id;
    case 'teil':
      return hole('teil', id).figur;
    case 'rg':
      return hole('rg', id).besitzer;
    case 'bd':
      return figurVon(hole('bd', id).teil);
    case 'sl':
      return figurVon(hole('sl', id).bindung);
    case 'we':
      return hole('we', id).figur;
    case 'kn':
      return hole('kn', id).figur;
    case 'af':
      return figurVon(hole('af', id).teil);
    case 'vb':
      return hole('vb', id).figur;
    case 'dr':
      return hole('dr', id).besitzer;
    default:
      return undefined;
  }
}

/** jede Zeichenkette in einem Wert mit ihrem Pfad ('.feld[0].unterfeld') */
function zeichenketten(wert: unknown, pfad = '', aus: [pfad: string, text: string][] = []): [pfad: string, text: string][] {
  if (typeof wert === 'string') aus.push([pfad, wert]);
  else if (Array.isArray(wert)) wert.forEach((x, i) => zeichenketten(x, `${pfad}[${i}]`, aus));
  else if (typeof wert === 'object' && wert !== null) for (const [k, x] of Object.entries(wert)) zeichenketten(x, `${pfad}.${k}`, aus);
  return aus;
}

// ---------- Schreibweise (3.5) ----------
// Geprüft wird nur, was 3.5 wörtlich sagt; wie der Schreiber alles Übrige umbricht, ist seine Sache. Nr. 2: zwei Leerzeichen Einzug
// je Ebene; jede Ankerzeile, Versatzzeile, jeder Punkt und jedes Paar einer Kennlinie auf einer Zeile; eine Form mit einer Zeile je
// Anker. Nr. 3: Zahlen ungerundet in kürzester Form (`zahlText`: String(x), −0 als 0). Nr. 4: kein null, ein leeres Pflichtfeld als
// `[]`. Nr. 5 steht im Test selbst. Den Rundweg `schreiben(laden(t)) === t` prüft M1.2 mit seinem Schreiber.

/** ein Wert im Text: Zeilen (ab 1) seines ersten und letzten Zeichens; bei Objekten die Felder, bei Listen die Elemente */
interface TextWert { von: number; bis: number; felder?: Map<string, TextWert>; elemente?: TextWert[] }

interface Schreibweise {
  wurzel: TextWert;
  /** Zeilen, deren Einzug nicht zwei Leerzeichen je offener Ebene ist (vor einer schließenden Klammer eine Ebene weniger) */
  einzug: number[];
  /** Zahlen, die nicht so stehen, wie `zahlText` sie schreibt */
  zahlen: string[];
  /** Zeilen mit null */
  nullen: number[];
  /** Zeilen mit einer leeren Liste, die nicht als `[]` steht */
  leereListen: number[];
}

function zahlRichtig(tok: string): boolean {
  try {
    return zahlText(Number(tok)) === tok;
  } catch {
    return false;
  }
}

/** liest den Text (gültiges JSON, JSON.parse hat ihn schon genommen) mit der Zeile jedes Werts; prüft dabei Einzug, Zahlen, null */
function schreibweiseLesen(text: string): Schreibweise {
  const s: Omit<Schreibweise, 'wurzel'> = { einzug: [], zahlen: [], nullen: [], leereListen: [] };
  let i = 0;
  let zeile = 1;
  let tiefe = 0;
  const leer = (): void => {
    while (text[i] === ' ' || text[i] === '\n') {
      if (text[i] === '\n') {
        zeile++;
        let n = 0;
        while (text[i + 1 + n] === ' ') n++;
        const danach = text[i + 1 + n];
        const soll = 2 * (danach === '}' || danach === ']' ? tiefe - 1 : tiefe);
        if (danach !== undefined && danach !== '\n' && n !== soll) s.einzug.push(zeile);
      }
      i++;
    }
  };
  const kette = (): string => {
    const start = i;
    i++;
    while (text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
    i++;
    return JSON.parse(text.slice(start, i)) as string;
  };
  const wert = (): TextWert => {
    leer();
    const von = zeile;
    const c = text[i];
    if (c === '{' || c === '[') {
      const liste = c === '[';
      const zu = liste ? ']' : '}';
      i++;
      tiefe++;
      const sofortZu = text[i] === zu;
      leer();
      const felder = new Map<string, TextWert>();
      const elemente: TextWert[] = [];
      if (text[i] === zu) {
        if (liste && !sofortZu) s.leereListen.push(von);
      } else {
        for (;;) {
          if (liste) elemente.push(wert());
          else {
            leer();
            const name = kette();
            leer();
            i++; // ':'
            felder.set(name, wert());
          }
          leer();
          if (text[i] !== ',') break;
          i++;
        }
      }
      tiefe--;
      const bis = zeile;
      i++; // schließende Klammer
      return liste ? { von, bis, elemente } : { von, bis, felder };
    }
    if (c === '"') {
      kette();
      return { von, bis: zeile };
    }
    const start = i;
    while (i < text.length && !',]} \n'.includes(text[i]!)) i++;
    const tok = text.slice(start, i);
    if (tok === 'null') s.nullen.push(zeile);
    else if (tok !== 'true' && tok !== 'false' && !zahlRichtig(tok)) s.zahlen.push(tok);
    return { von, bis: zeile };
  };
  if (text.startsWith(' ')) s.einzug.push(1);
  return { wurzel: wert(), ...s };
}

type Pfad = readonly (string | number)[];

/** Werte, die 3.5 Nr. 2 auf eine Zeile stellt, erkannt an ihrem Schema: Ankerzeile, Versatzzeile, Punkt, Paar einer Kennlinie */
const EINZEILIG: ReadonlySet<z.core.$ZodType> = new Set<z.core.$ZodType>([ankerZeileSchema, versatzZeileSchema, punktSchema, kennlinienPaarSchema]);

/** sammelt nach dem Schema die Pfade der Werte, die auf einer Zeile stehen müssen, und die der Formen (eine Zeile je Anker) */
function zeilenregeln(schema: z.core.$ZodType, wert: unknown, pfad: Pfad, aus: { einzeilig: Pfad[]; formen: Pfad[] }): void {
  if (EINZEILIG.has(schema)) {
    aus.einzeilig.push(pfad);
    return;
  }
  if (schema === formSchema) aus.formen.push(pfad);
  const def = schema._zod.def;
  switch (def.type) {
    case 'object': {
      if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) return;
      const felder = (def as z.core.$ZodObjectDef).shape;
      for (const [k, x] of Object.entries(wert)) {
        const s = felder[k];
        if (s !== undefined) zeilenregeln(s, x, [...pfad, k], aus);
      }
      return;
    }
    case 'record': {
      if (typeof wert !== 'object' || wert === null) return;
      for (const [k, x] of Object.entries(wert)) zeilenregeln((def as z.core.$ZodRecordDef).valueType, x, [...pfad, k], aus);
      return;
    }
    case 'array':
      if (Array.isArray(wert)) wert.forEach((x: unknown, i) => zeilenregeln((def as z.core.$ZodArrayDef).element, x, [...pfad, i], aus));
      return;
    case 'tuple': {
      const t = def as z.core.$ZodTupleDef;
      if (Array.isArray(wert))
        wert.forEach((x: unknown, i) => {
          const s = t.items[i] ?? t.rest;
          if (s) zeilenregeln(s, x, [...pfad, i], aus);
        });
      return;
    }
    case 'union': {
      const passend = (def as z.core.$ZodUnionDef).options.find((o) => z.safeParse(o, wert).success);
      if (passend) zeilenregeln(passend, wert, pfad, aus);
      return;
    }
    case 'optional':
    case 'nullable':
    case 'readonly':
    case 'nonoptional':
      zeilenregeln((def as z.core.$ZodOptionalDef).innerType, wert, pfad, aus);
      return;
    case 'lazy':
      zeilenregeln((def as z.core.$ZodLazyDef).getter(), wert, pfad, aus);
      return;
    case 'pipe':
      zeilenregeln((def as z.core.$ZodPipeDef).in, wert, pfad, aus);
      return;
    default:
      return;
  }
}

/** der Wert im Text unter einem Pfad */
function imText(w: TextWert, pfad: Pfad): TextWert {
  let hier = w;
  for (const k of pfad) {
    const weiter = typeof k === 'number' ? hier.elemente?.[k] : hier.felder?.get(k);
    if (weiter === undefined) throw new Error(`${pfad.join('.')} fehlt im Text`);
    hier = weiter;
  }
  return hier;
}

// ---------- Einzelprüfungen ----------

/** Ankerzeile nach 3.6 Nr. 1: glatt 5 Zahlen, Ecke 6; Winkel in (−180, 180], Längen ≥ 0 */
function ankerZeileFehler(z: AnkerZeile): string | null {
  if (!z.every(Number.isFinite)) return 'Zahl nicht endlich';
  const winkel = z.length === 5 ? [z[2]] : [z[2], z[4]];
  const laengen = z.length === 5 ? [z[3], z[4]] : [z[3], z[5]];
  if (winkel.some((w) => !(w > -180 && w <= 180))) return 'Winkel außerhalb (−180, 180]';
  if (laengen.some((l) => !(l >= 0))) return 'Länge unter 0';
  return null;
}

function versatzZeileFehler(z: VersatzZeile): string | null {
  return z.every(Number.isFinite) ? null : 'Zahl nicht endlich';
}

/** Gewichte eines Ankers oder Griffs nach 3.6 Nr. 4 */
function gewichteFehler(paare: readonly [number, number][], af: Aufhaengung): string | null {
  if (paare.length > 4) return 'mehr als vier Paare';
  if (paare.some(([k]) => !Number.isInteger(k) || k < 0 || k >= af.knochen.length)) return 'ungültiger Index';
  if (Math.abs(paare.reduce((s, [, g]) => s + g, 0) - 1) > 1e-6) return 'Summe nicht 1';
  const achsePaare = paare.length === 2 && paare[0]![0] === 0 && paare[1]![0] === 1;
  if (af.art === 'achse' && !achsePaare) return "bei 'achse' nicht [0, w], [1, 1 − w]";
  return null;
}

/** ein Kreis im Graphen der Drähte (Regler → Regler); Messwerte als Quelle sind Blätter */
function kreisInDraehten(draehte: readonly Draht[]): boolean {
  const nach = new Map<string, string[]>();
  for (const d of draehte) nach.set(d.quelle, [...(nach.get(d.quelle) ?? []), d.ziel]);
  const stand = new Map<string, 'offen' | 'fertig'>();
  const besuchen = (r: string): boolean => {
    if (stand.get(r) === 'fertig') return false;
    if (stand.get(r) === 'offen') return true;
    stand.set(r, 'offen');
    const kreis = (nach.get(r) ?? []).some(besuchen);
    stand.set(r, 'fertig');
    return kreis;
  };
  return [...nach.keys()].some(besuchen);
}

const MESSWERT = /^(?:bs|di)_[0-9A-Za-z]{10}\./;

describe('Testfigur (pruefdaten/testfigur.json)', () => {
  it('besteht das Schema einer Figur-Datei samt aller Datensätze (3.2 bis 3.4)', () => {
    const meldungen = ergebnis.success ? [] : ergebnis.error.issues.map((f) => `${f.path.join('.')}: ${f.message}`);
    expect(meldungen).toEqual([]);
    expect(datei().art).toBe('figur');
    expect(alle('fig').map((f) => f.datei)).toEqual(['testfigur']);
  });

  it('trägt die Versionen dieser Fassung im Kopf: überall Version 1, nur bekannte Arten (3.4)', () => {
    // welche Arten der Kopf nennt (keine, die genutzten oder alle eingetragenen), legt der Schreiber fest; jede genannte ist bekannt
    const v = datei().versionen;
    expect(Object.values(v.bloecke).every((x) => x === 1)).toBe(true);
    expect(Object.values(v.arten).every((x) => x === 1)).toBe(true);
    expect(versionenAbgleichen(v, aktuelleVersionen(artVersionen()))).toEqual({ neuer: [], unbekannt: [], aelter: [] });
  });

  it('steht in der Schreibweise aus 3.5', () => {
    // Nr. 5
    expect(text.charCodeAt(0), 'UTF-8 ohne BOM').not.toBe(0xfeff);
    expect(text, 'Zeilenende LF, Einzug mit Leerzeichen').not.toMatch(/[\r\t]/);
    expect(text.endsWith('}\n') && !text.endsWith('\n\n'), 'ein Zeilenumbruch am Schluss').toBe(true);
    // Nr. 1: Kopf, dann die Typen in der Reihenfolge von DatensatzTabelle, darin nach Kennung, Felder in der Reihenfolge ihres Schemas
    expect(JSON.stringify(roh)).toBe(JSON.stringify(dateiOrdnen(roh as Datei)));
    // Nr. 2 bis 4: Einzug, Zahlen, kein null, leere Listen
    const s = schreibweiseLesen(text);
    expect(s.einzug, 'Zeilen mit falschem Einzug').toEqual([]);
    expect(s.zahlen, 'Zahlen nicht in kürzester Form').toEqual([]);
    expect(s.nullen, 'Zeilen mit null').toEqual([]);
    expect(s.leereListen, 'leere Listen nicht als []').toEqual([]);
    // Nr. 2: Ankerzeilen, Versatzzeilen, Punkte und Paare einer Kennlinie je auf einer Zeile, eine Form mit einer Zeile je Anker
    const regeln = { einzeilig: [] as Pfad[], formen: [] as Pfad[] };
    zeilenregeln(dateiSchema, roh, [], regeln);
    const erwartet =
      alle('teil').reduce((n, t) => n + (t.form?.length ?? 0), 0) +
      alle('sl').reduce((n, sl) => n + (sl.gestalt?.length ?? 0) + (sl.versatz?.length ?? 0), 0) +
      alle('kn').length +
      alle('dr').reduce((n, d) => n + d.kennlinie.length, 0);
    expect(regeln.einzeilig, 'alle Zeilen, Punkte und Paare gefunden').toHaveLength(erwartet);
    const mehrzeilig = regeln.einzeilig.filter((p) => imText(s.wurzel, p).von !== imText(s.wurzel, p).bis).map((p) => p.join('.'));
    expect(mehrzeilig, 'über mehrere Zeilen').toEqual([]);
    expect(regeln.formen, 'jede Form gefunden').toHaveLength(alle('teil').filter((t) => t.form).length + alle('sl').filter((sl) => sl.gestalt).length);
    const formenEng = regeln.formen
      .filter((p) => (imText(s.wurzel, p).elemente ?? []).some((zeile, k, alleZeilen) => k > 0 && zeile.von <= alleZeilen[k - 1]!.bis))
      .map((p) => p.join('.'));
    expect(formenEng, 'Formen mit zwei Ankern auf einer Zeile').toEqual([]);
  });

  it('hat Kennungen nach 3.3, jede Kennung und jeden Anker genau einmal', () => {
    for (const [typ, tabelle] of Object.entries(datei().datensaetze)) {
      for (const [schluessel, d] of Object.entries(tabelle ?? {}) as [string, Datensatz][]) {
        expect(istKennung(schluessel), schluessel).toBe(true);
        expect(datensatzTypVon(schluessel), schluessel).toBe(typ);
        expect(d.id).toBe(schluessel);
      }
    }
    // JSON.parse behielte von zwei gleichen Schlüsseln still den letzten: darum im Text zählen
    for (const id of nachKennung().keys()) expect(text.match(new RegExp(`"${id}"\\s*:\\s*\\{`, 'g'))?.length, `${id} im Text`).toBe(1);
    const anker = alle('teil').flatMap((t) => t.anker);
    expect(anker.every((a) => istKennung(a) && vorsilbeVon(a) === 'an')).toBe(true);
    expect(new Set(anker).size).toBe(anker.length);
  });

  it('verweist nur auf Datensätze und Anker, die es gibt, und hält nur, was ihrer Figur gehört (3.1, 3.6 Nr. 8)', () => {
    const datensaetze = nachKennung();
    const anker = ankerTeile();
    const fehlend: string[] = [];
    for (const d of datensaetze.values()) {
      for (const [pfad, s] of zeichenketten(d)) {
        if (pfad === '.id') continue;
        const ziel = istKennung(s) ? s : MESSWERT.test(s) ? s.slice(0, s.indexOf('.')) : null;
        if (ziel === null) continue;
        const da = vorsilbeVon(ziel) === 'an' ? anker.has(ziel) : datensaetze.has(ziel);
        if (!da) fehlend.push(`${d.id}${pfad} → ${s}`);
      }
    }
    expect(fehlend).toEqual([]);

    // Anker an Stellen, die ein Teil nennen, gehören zu diesem Teil
    const ankerVon = (a: string) => anker.get(a)?.id;
    for (const af of alle('af')) for (const a of af.gepinnt) expect(ankerVon(a), `${af.id} gepinnt`).toBe(af.teil);
    for (const kn of alle('kn')) {
      for (const a of kn.anheftung?.anker ?? []) expect(ankerVon(a), `${kn.id} angeheftet`).toBe(kn.anheftung?.teil);
    }
    for (const bd of alle('bd')) {
      for (const s of bd.spitzen ?? []) for (const a of s.anker) expect(ankerVon(a), `${bd.id} Spitze`).toBe(bd.teil);
    }

    // eine Figur; jeder Datensatz gehört über seine Besitzerkette zu ihr
    const figuren = alle('fig');
    expect(figuren).toHaveLength(1);
    for (const id of datensaetze.keys()) expect(figurVon(id), id).toBe(figuren[0]!.id);
  });

  it('hat in jeder Form und jedem Versatz so viele Zeilen wie das Teil Anker (3.6 Nr. 1)', () => {
    const fehler: string[] = [];
    for (const t of alle('teil')) {
      if (t.form === undefined) continue;
      if (t.form.length !== t.anker.length) fehler.push(`${t.id}: ${t.form.length} Zeilen, ${t.anker.length} Anker`);
      t.form.forEach((z, i) => {
        const f = ankerZeileFehler(z);
        if (f !== null) fehler.push(`${t.id} Zeile ${i}: ${f}`);
      });
    }
    for (const sl of alle('sl')) {
      const bd = hole('bd', sl.bindung);
      const anzahl = hole('teil', bd.teil).anker.length;
      // Ansicht ersetzt die Gestalt, Zusatz addiert einen Versatz; ein Schlüssel trägt genau das, was seine Bindung braucht
      const zeilen = bd.wirkung === 'ansicht' ? sl.gestalt : sl.versatz;
      const fremd = bd.wirkung === 'ansicht' ? sl.versatz : sl.gestalt;
      const fremdFeld = bd.wirkung === 'ansicht' ? 'versatz' : 'gestalt';
      if (fremd !== undefined) fehler.push(`${sl.id}: ${fremdFeld} an einer Bindung '${bd.wirkung}'`);
      if (zeilen === undefined || zeilen.length !== anzahl) fehler.push(`${sl.id}: ${zeilen?.length ?? 0} Zeilen, ${anzahl} Anker`);
      sl.gestalt?.forEach((z, i) => {
        const f = ankerZeileFehler(z);
        if (f !== null) fehler.push(`${sl.id} Zeile ${i}: ${f}`);
      });
      sl.versatz?.forEach((z, i) => {
        const f = versatzZeileFehler(z);
        if (f !== null) fehler.push(`${sl.id} Zeile ${i}: ${f}`);
      });
    }
    expect(fehler).toEqual([]);
  });

  it('hängt Teile gültig auf, mit Gewichten und Griffen je Anker (3.6 Nr. 4)', () => {
    const fehler: string[] = [];
    const knochenZahl = { starr: 1, achse: 2 } as const;
    for (const af of alle('af')) {
      const anzahl = hole('teil', af.teil).anker.length;
      const knochenFalsch = af.art === 'gewichte' ? af.knochen.length === 0 : af.knochen.length !== knochenZahl[af.art];
      if (knochenFalsch) fehler.push(`${af.id}: ${af.knochen.length} Knochen bei '${af.art}'`);
      if (af.gewichte !== undefined) {
        if (af.gewichte.length !== anzahl) fehler.push(`${af.id}: Gewichte für ${af.gewichte.length} von ${anzahl} Ankern`);
        af.gewichte.forEach((paare, i) => {
          const f = gewichteFehler(paare, af);
          if (f !== null) fehler.push(`${af.id} Anker ${i}: ${f}`);
        });
      }
      if (af.griffe !== undefined) {
        if (af.griffe.length !== anzahl) fehler.push(`${af.id}: Griffe für ${af.griffe.length} von ${anzahl} Ankern`);
        af.griffe.forEach((g, i) => {
          for (const paare of g === 'erben' ? [] : 'paar' in g ? [g.paar] : [g.ein, g.aus]) {
            const f = gewichteFehler(paare, af);
            if (f !== null) fehler.push(`${af.id} Griff ${i}: ${f}`);
          }
        });
      }
    }
    expect(fehler).toEqual([]);
  });

  it('formt jedes Teil aus genau einer Quelle und hält Spiegelpartner gleich (3.6 Nr. 2)', () => {
    for (const t of alle('teil')) {
      const ansichten = alle('bd').filter((b) => b.teil === t.id && b.wirkung === 'ansicht').length;
      expect(ansichten + (t.form === undefined ? 0 : 1), `${t.name}: Form oder genau eine Ansichtsbindung`).toBe(1);
      expect(t.linie !== undefined, `${t.name}: Breitenprofil genau bei einer Linie`).toBe(t.art === 'linie');
      if (t.partner === undefined) continue;
      const p = hole('teil', t.partner);
      expect(p.partner, `${t.name}: Partner gegenseitig`).toBe(t.id);
      expect(p.anker.length, `${t.name}: Partner mit gleich vielen Ankern`).toBe(t.anker.length);
      expect([p.art, p.figur]).toEqual([t.art, t.figur]);
    }
    const ebenen = alle('teil').map((t) => t.ebene);
    expect(new Set(ebenen).size, 'Malreihenfolge eindeutig').toBe(ebenen.length);
    for (const rg of alle('rg')) {
      const s = rg.spiegel;
      if (s === undefined) continue;
      expect(s.ab).toBeLessThan(s.um);
      for (const [a, b] of s.paare) expect(hole('teil', a).partner, `${rg.name}: Paar sind Partner`).toBe(b);
      for (const u of s.umnummern) expect([...u.folge].sort((x, y) => x - y)).toEqual(hole('teil', u.teil).anker.map((_, i) => i));
      for (const m of s.regler ?? []) expect(m.regler, `${rg.name} spiegelt sich nicht selbst mit`).not.toBe(rg.id);
    }
  });

  it('legt Schlüssel auf ihre Achsen, Zusätze an der Ruhestelle null, nie zwei an eine Stelle (3.6 Nr. 3, 11)', () => {
    for (const bd of alle('bd')) {
      const figur = hole('teil', bd.teil).figur;
      const achsen = bd.achsen.map((id) => hole('rg', id));
      for (const r of achsen) expect(r.besitzer, `${bd.id}: Achse der eigenen Figur`).toBe(figur);
      if (bd.periodisch) for (const r of achsen) expect(r.art, `${bd.id}: periodisch nur an Kreisreglern`).toBe('kreis');
      const schluessel = schluesselVon(bd);
      for (const sl of schluessel) {
        expect(sl.an.length, `${sl.id}: eine Stelle je Achse`).toBe(achsen.length);
        sl.an.forEach((w, i) => {
          const [von, bis] = achsen[i]!.bereich;
          expect(w >= von && w <= bis, `${sl.id}: Stelle ${w} im Bereich [${von}, ${bis}]`).toBe(true);
        });
        // Nr. 3 (Bindungen mit zwei Achsen hat die Testfigur nicht; für sie gälte dazu die Feldregel)
        const ruhe = sl.an.every((w, i) => w === achsen[i]!.standard);
        const versatzNull = sl.versatz?.flat().every((x) => x === 0) === true;
        if (bd.wirkung === 'zusatz' && ruhe) expect(versatzNull, `${sl.id}: an der Ruhestelle null`).toBe(true);
      }
      // Nr. 11: zwei an derselben Stelle nur, wenn genau einer „dein“ ist (dann ruht der andere)
      const nachStelle = new Map<string, Schluessel[]>();
      for (const sl of schluessel) nachStelle.set(sl.an.join(' '), [...(nachStelle.get(sl.an.join(' ')) ?? []), sl]);
      for (const [stelle, gleich] of nachStelle)
        if (gleich.length > 1) expect(gleich.filter((s) => s.herkunft === 'dein').length, `${bd.id} bei ${stelle}`).toBe(1);
    }
  });

  it('hält Regler in ihrem Bereich, Drähte ohne Kreis und je Regler höchstens einen Draht (3.6 Nr. 5)', () => {
    for (const rg of alle('rg')) {
      const [von, bis] = rg.bereich;
      expect(von, rg.name).toBeLessThan(bis);
      expect(rg.standard >= von && rg.standard <= bis, `${rg.name}: Ruhestelle im Bereich`).toBe(true);
      expect(rg.raster, rg.name).toBeGreaterThan(0);
      if (rg.art === 'kreis') expect(rg.bereich, rg.name).toEqual([0, 360]);
    }
    const draehte = alle('dr');
    const ziele = draehte.map((d) => d.ziel);
    expect(new Set(ziele).size, 'je Regler höchstens ein Draht').toBe(ziele.length);
    expect(kreisInDraehten(draehte)).toBe(false);
    for (const d of draehte) {
      expect(d.kennlinie.length, d.id).toBeGreaterThan(0);
      const aufsteigend = d.kennlinie.every(([ein], i) => i === 0 || ein > d.kennlinie[i - 1]![0]);
      expect(aufsteigend, `${d.id}: Kennlinie aufsteigend nach ein`).toBe(true);
      if (d.spiegel !== undefined) expect(d.spiegel.ab).toBeLessThan(d.spiegel.um);
    }
    for (const we of alle('we')) {
      const r = hole('rg', we.regler);
      expect(r.besitzer).toBe(we.figur);
      expect(we.an >= r.bereich[0] && we.an <= r.bereich[1], `${we.id}: Stelle im Bereich`).toBe(true);
      for (const t of [we.teil, ...(we.bezug === undefined ? [] : [we.bezug])]) expect(hole('teil', t).figur).toBe(we.figur);
    }
  });

  it('ist die Testfigur aus dem Bauplan (5.3 M0)', () => {
    // drei Teile: zwei Flächen mit je fünf Ankern, die Spiegelpartner sind, und eine offene Linie mit vier Ankern
    const teile = alle('teil');
    const flaechen = teile.filter((t) => t.art === 'flaeche');
    const linien = teile.filter((t) => t.art === 'linie');
    expect([teile.length, flaechen.length, linien.length]).toEqual([3, 2, 1]);
    const [a, b] = flaechen as [Teil, Teil];
    expect([a.anker.length, b.anker.length, a.partner]).toEqual([5, 5, b.id]);
    expect([linien[0]!.anker.length, linien[0]!.linie?.offen]).toEqual([4, true]);

    // ein Kreisregler 0° bis 360° mit einer Spiegelregel ab 180° um 360° für dieses Paar, die einen Linienregler mitspiegelt
    const kreise = alle('rg').filter((r) => r.art === 'kreis');
    expect(kreise).toHaveLength(1);
    const kreis = kreise[0]!;
    expect(kreis.bereich).toEqual([0, 360]);
    expect([kreis.spiegel?.ab, kreis.spiegel?.um]).toEqual([180, 360]);
    expect(kreis.spiegel?.paare.map((p) => [...p].sort())).toEqual([[a.id, b.id].sort()]);
    const mit = kreis.spiegel?.regler ?? [];
    expect(mit.map((m) => hole('rg', m.regler).art)).toEqual(['linie']);

    // je Fläche eine Ansichtsbindung an diesem Regler: eine mit vier Schlüsseln (dein, vorlage, gebaut, Stütze), eine mit zwei
    const ansichten = flaechen.map((t) => alle('bd').filter((x) => x.teil === t.id && x.wirkung === 'ansicht'));
    for (const liste of ansichten) expect(liste.map((x) => x.achsen)).toEqual([[kreis.id]]);
    const schluessel = ansichten.map((liste) => schluesselVon(liste[0]!)).sort((x, y) => y.length - x.length);
    expect(schluessel.map((s) => s.length)).toEqual([4, 2]);
    const vier = schluessel[0]!;
    expect(vier.filter((s) => s.stuetze === true)).toHaveLength(1);
    expect(vier.filter((s) => s.stuetze !== true).map((s) => s.herkunft).sort()).toEqual(['dein', 'gebaut', 'vorlage']);

    // eine Zusatzform mit zwei Schlüsseln
    const zusaetze = alle('bd').filter((x) => x.wirkung === 'zusatz');
    expect(zusaetze.map((x) => schluesselVon(x).length)).toEqual([2]);

    // ein starrer Knochen mit Verschiebung: ohne Biegeachse, die Teile starr an ihm
    const knochen = alle('kn');
    expect(knochen).toHaveLength(1);
    expect([knochen[0]!.achse, knochen[0]!.verschiebung === undefined]).toEqual([undefined, false]);
    expect(alle('af').length).toBeGreaterThan(0);
    for (const af of alle('af')) expect([af.art, af.knochen]).toEqual(['starr', [knochen[0]!.id]]);

    // ein Draht mit Kennlinie und ein Wechsel
    expect(alle('dr').map((d) => d.kennlinie.length > 1)).toEqual([true]);
    expect(alle('we')).toHaveLength(1);

    // dazu eine Fuge zwischen den beiden Flächen: an ihr prüft M1.4 die Fuge (5.4)
    expect(alle('vb').map((v) => [v.art, [v.a, v.b].sort()])).toEqual([['fuge', [a.id, b.id].sort()]]);
  });
});
