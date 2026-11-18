// Ozzy-Figur, Etappe A: Florians SVGs einlesen, Teile benennen, prüfen, formtreu abgleichen, berichten.
// Bedingung an die Dateien (seine sechs vom 18.11. erfüllen sie): ein Pfad je Teil, Reihenfolge je Ansicht wie unten, in allen
// Ansichten dieselben Anker (nur verschoben). Fehlt einem Teil in einer Ansicht genau ein Anker, wird das passende Stück formtreu
// geteilt; alles andere ist ein Fehler im Bericht. Nichts wird still verändert.
import { ankerErgaenzen, type Form, groessterAbstand, kasten, spiegeln, type Teilung } from '../form';
import { svgLesen } from './svg';

export type AnsichtName = 'front' | 'back' | 'logo' | 'profil' | 'lieg1' | 'lieg2';
export type TeilName =
  | 'ohrA' | 'ohrB' | 'ohrSpalt' | 'kopfA' | 'kopfB' | 'bartA' | 'bartB' | 'nase' | 'bohne' | 'schwanz' | 'schwanzW'
  | 'beinRV' | 'beinRH' | 'beinLV' | 'beinLH' | 'fensterRV' | 'fensterRH' | 'fensterLV' | 'fensterLH' | 'keilV' | 'keilH' | 'keilMitte';

/** A ist das im Frontbild linke Teil (Ozzys rechte Seite), B sein Spiegelpartner. Beine: R/L = Ozzys rechts/links, V/H = vorn/hinten */
export const PARTNER: Partial<Record<TeilName, TeilName>> = {
  ohrA: 'ohrB', kopfA: 'kopfB', bartA: 'bartB', beinRV: 'beinLV', beinRH: 'beinLH', fensterRV: 'fensterLV', fensterRH: 'fensterLH',
};

export const WEISS: ReadonlySet<TeilName> = new Set(['ohrSpalt', 'bartA', 'bartB', 'schwanzW', 'fensterRV', 'fensterRH', 'fensterLV', 'fensterLH']);

export interface AnsichtDef {
  datei: string;
  /** Blickwinkel von Körper und Kopf (0 vorn, 90 Seite nach rechts, 180 hinten) */
  koerper: number;
  kopf: number;
  liegend: boolean;
  /** Teile in Dateireihenfolge (= Malreihenfolge) */
  teile: TeilName[];
}

// Zuordnung nach den Dateien vom 18.11. In der Rückansicht anatomisch benannt: Ozzys rechtes Ohr (A) ist dort rechts im Bild.
export const ANSICHTEN: Record<AnsichtName, AnsichtDef> = {
  front: {
    datei: 'ozzy_front.svg', koerper: 0, kopf: 0, liegend: false,
    teile: ['ohrA', 'ohrB', 'bohne', 'keilMitte', 'beinLH', 'beinLV', 'beinRV', 'beinRH', 'fensterRV', 'kopfB', 'fensterLV', 'kopfA', 'bartA', 'bartB', 'nase'],
  },
  back: {
    datei: 'ozzy_back.svg', koerper: 180, kopf: 180, liegend: false,
    teile: ['bohne', 'keilMitte', 'beinRH', 'beinRV', 'beinLH', 'beinLV', 'ohrB', 'ohrA', 'kopfA', 'kopfB', 'nase', 'fensterLH', 'fensterRH', 'schwanz', 'schwanzW'],
  },
  logo: {
    datei: 'ozzy_stand01_logo.svg', koerper: 90, kopf: 0, liegend: false,
    teile: ['schwanz', 'bohne', 'schwanzW', 'beinLH', 'beinLV', 'beinRV', 'beinRH', 'fensterRH', 'keilV', 'keilH', 'ohrA', 'ohrB', 'kopfB', 'kopfA', 'fensterRV', 'bartA', 'bartB', 'nase'],
  },
  profil: {
    datei: 'ozzy_stand02.svg', koerper: 90, kopf: 90, liegend: false,
    teile: ['ohrB', 'ohrSpalt', 'ohrA', 'kopfB', 'schwanz', 'bohne', 'schwanzW', 'beinLH', 'beinLV', 'beinRV', 'beinRH', 'fensterRH', 'keilV', 'keilH', 'kopfA', 'fensterRV', 'bartA', 'bartB', 'nase'],
  },
  lieg1: {
    datei: 'ozzy_laydown01.svg', koerper: 90, kopf: 0, liegend: true,
    teile: ['schwanz', 'bohne', 'schwanzW', 'beinLH', 'beinLV', 'beinRV', 'beinRH', 'fensterRH', 'fensterRV', 'ohrA', 'ohrB', 'kopfB', 'kopfA', 'bartA', 'bartB', 'nase'],
  },
  lieg2: {
    datei: 'ozzy_laydown02.svg', koerper: 90, kopf: 90, liegend: true,
    teile: ['schwanz', 'bohne', 'schwanzW', 'beinLH', 'beinLV', 'beinRV', 'beinRH', 'fensterRH', 'fensterRV', 'ohrB', 'ohrSpalt', 'ohrA', 'kopfB', 'kopfA', 'bartA', 'bartB', 'nase'],
  },
};
export const ANSICHT_NAMEN = Object.keys(ANSICHTEN) as AnsichtName[];

export interface FigurTeil {
  name: TeilName;
  weiss: boolean;
  form: Form;
}
export interface FigurAnsicht {
  name: AnsichtName;
  def: AnsichtDef;
  viewBox: [number, number, number, number];
  /** Boden = Unterkante der Beine (größtes y) */
  boden: number;
  teile: FigurTeil[];
}
export interface BerichtZeile {
  art: 'info' | 'abgleich' | 'warnung' | 'fehler';
  text: string;
}
export interface FigurDaten {
  ansichten: Record<AnsichtName, FigurAnsicht>;
  /** Anker je Teil nach dem Abgleich (in allen Ansichten gleich) */
  anker: Partial<Record<TeilName, number>>;
  abgleiche: { teil: TeilName; ansicht: AnsichtName; teilung: Teilung; vorher: number }[];
  bericht: BerichtZeile[];
}

export function teilVon(a: FigurAnsicht, name: TeilName): FigurTeil | undefined {
  return a.teile.find((t) => t.name === name);
}

/** Alle sechs Dateien einlesen. `texte`: Dateiname → SVG-Text */
export function importieren(texte: Record<string, string>): FigurDaten {
  const bericht: BerichtZeile[] = [];
  const ansichten = {} as Record<AnsichtName, FigurAnsicht>;
  for (const name of ANSICHT_NAMEN) {
    const def = ANSICHTEN[name];
    const text = texte[def.datei];
    if (!text) {
      bericht.push({ art: 'fehler', text: `${def.datei} fehlt` });
      continue;
    }
    const svg = svgLesen(text);
    if (svg.teile.length !== def.teile.length) {
      bericht.push({ art: 'fehler', text: `${def.datei}: ${svg.teile.length} Teile, erwartet ${def.teile.length} (Reihenfolge: ${def.teile.join(', ')})` });
      continue;
    }
    const schluss = svg.teile.filter((t) => t.schlusslinie > 0);
    bericht.push({
      art: 'info',
      text: `${def.datei}: ${svg.teile.length} Teile; ${schluss.length} Schlusslinien des Exports verschmolzen (längste ${Math.max(0, ...schluss.map((t) => t.schlusslinie)).toFixed(3)})`,
    });
    const teile: FigurTeil[] = svg.teile.map((t, k) => {
      const n = def.teile[k]!;
      if (t.weiss !== WEISS.has(n)) bericht.push({ art: 'fehler', text: `${def.datei}, Teil ${k} (${n}): ist ${t.weiss ? 'weiß' : 'schwarz'}, erwartet ${WEISS.has(n) ? 'weiß' : 'schwarz'}` });
      return { name: n, weiss: t.weiss, form: t.form };
    });
    let boden = -Infinity;
    for (const t of teile) if (t.name.startsWith('bein')) boden = Math.max(boden, kasten(t.form)[3]);
    ansichten[name] = { name, def, viewBox: svg.viewBox, boden, teile };
  }
  // Ankerzahl je Teil über alle Ansichten
  const anker: Partial<Record<TeilName, number>> = {};
  const abgleiche: FigurDaten['abgleiche'] = [];
  const alleTeile = new Set<TeilName>();
  for (const a of Object.values(ansichten)) for (const t of a.teile) alleTeile.add(t.name);
  for (const name of alleTeile) {
    const vorkommen = Object.values(ansichten).flatMap((a) => a.teile.filter((t) => t.name === name).map((t) => ({ a, t })));
    const zahlen = vorkommen.map((v) => v.t.form.length);
    const ziel = Math.max(...zahlen);
    anker[name] = ziel;
    for (const v of vorkommen) {
      const n = v.t.form.length;
      if (n === ziel) continue;
      if (ziel - n !== 1) {
        bericht.push({ art: 'fehler', text: `${name} in ${v.a.name}: ${n} Anker, andere Ansichten ${ziel}; mehr als einer fehlt, bitte in Illustrator angleichen` });
        continue;
      }
      // Vergleich mit der ähnlichsten Ansicht, die schon genug Anker hat (gleiche Pose bevorzugt: Seite mit Seite)
      const kandidaten = vorkommen.filter((w) => w.t.form.length === ziel);
      const ref = kandidaten.find((w) => w.a.def.koerper === v.a.def.koerper && w.a.def.liegend === v.a.def.liegend) ?? kandidaten[0]!;
      const { form, teilung } = ankerErgaenzen(v.t.form, ref.t.form);
      v.t.form = form;
      abgleiche.push({ teil: name, ansicht: v.a.name, teilung, vorher: n });
      bericht.push({
        art: 'abgleich',
        text: `${name} in ${v.a.name}: ${n} → ${ziel} Anker, Stück ${teilung.stueck} bei t = ${teilung.t.toFixed(2)} geteilt (Form unverändert; Vergleich mit ${ref.a.name}, Rest ${teilung.rest.toFixed(1)})`,
      });
    }
  }
  // Spiegelpartner in der Front: B gespiegelt muss mit gleicher Ankernummer auf A liegen (gemeldet wird die größte Abweichung)
  const front = ansichten.front;
  if (front) {
    // nur die gespiegelt gezeichneten Kopfteile; Beine und Fenster sind dieselbe Form verschoben, nicht gespiegelt
    for (const [a, b] of [['ohrA', 'ohrB'], ['kopfA', 'kopfB'], ['bartA', 'bartB']] as [TeilName, TeilName][]) {
      const ta = teilVon(front, a);
      const tb = teilVon(front, b);
      if (!ta || !tb || ta.form.length !== tb.form.length) continue;
      // Spiegelachse: Mittel der Mittelpunkte gleich nummerierter Anker; gemeldet werden Median und größte Abweichung.
      // Großer Median hieße: falsche Zuordnung. Einzelne große Abweichungen sind Absicht (seine Hälften sind nicht ganz gleich).
      let achse = 0;
      for (let k = 0; k < ta.form.length; k++) achse += (ta.form[k]!.p[0] + tb.form[k]!.p[0]) / 2;
      achse /= ta.form.length;
      const gespiegelt = spiegeln(tb.form, achse);
      const abw = ta.form.map((x, k) => Math.hypot(x.p[0] - gespiegelt[k]!.p[0], x.p[1] - gespiegelt[k]!.p[1])).sort((u, v) => u - v);
      const median = abw[Math.floor(abw.length / 2)]!;
      bericht.push({
        art: median > 25 ? 'warnung' : 'info',
        text: `Spiegelpartner ${a}/${b} (Front): gleiche Ankerfolge, Achse x = ${achse.toFixed(1)}, Anker im Median ${median.toFixed(1)} und höchstens ${abw[abw.length - 1]!.toFixed(1)} vom Spiegelbild (größter Unterschied der Griffe ${groessterAbstand(ta.form, gespiegelt).toFixed(1)})`,
      });
    }
    const bohne = teilVon(front, 'bohne');
    if (bohne) bericht.push({ art: 'info', text: `Bohne (Front): ${bohne.form.length} Anker, nicht spiegelgleich (links 2, rechts 3); für Drehungen nach links braucht Etappe C einen formtreuen Zusatzanker` });
  }
  return { ansichten, anker, abgleiche, bericht };
}

/** Bericht als Markdown (für docs/look/ozzy-figur/import-bericht.md) */
export function berichtMarkdown(d: FigurDaten): string {
  const zeilen = [
    '# Import-Bericht: Florians Ozzy-SVGs',
    '',
    'Erzeugt von `apps/editor/src/ozzy-figur/vorlagen/import.test.ts` (`BERICHT=1`). Nicht von Hand ändern.',
    '',
    '## Anker je Teil (in allen Ansichten gleich)',
    '',
    '| Teil | Anker | Ansichten |',
    '| --- | --- | --- |',
  ];
  for (const [name, n] of Object.entries(d.anker)) {
    const wo = ANSICHT_NAMEN.filter((a) => d.ansichten[a]?.teile.some((t) => t.name === name));
    zeilen.push(`| ${name} | ${n} | ${wo.join(', ')} |`);
  }
  zeilen.push('', '## Meldungen', '');
  const zeichen = { info: '·', abgleich: '↔', warnung: '!', fehler: '✗' } as const;
  for (const b of d.bericht) zeilen.push(`- ${zeichen[b.art]} ${b.text}`);
  return zeilen.join('\n') + '\n';
}
