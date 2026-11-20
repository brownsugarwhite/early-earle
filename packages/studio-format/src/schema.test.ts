// Typen und Schemas des Formats v1 decken sich (3.2): auf Typebene in beide Richtungen (Ausgang und Eingang jedes Schemas sind genau
// der Typ; geprüft von tsc über expectTypeOf), und zur Laufzeit gehen gültige Beispieldaten durch, ungültige nicht. Dazu Datei, Diff,
// feste Reihenfolge (3.5 Nr. 1), Bruchindizes (3.3), das Register der Arten und die Versionen (3.4).
import fc from 'fast-check';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { EFFEKTE } from './arten/effekte';
import { artEintragen, artenVon, type ArtSchema, artSchluessel, artVersionen, artVon, aufGezeichnetVon } from './arten/register';
import { effektSchema, verbindungSchema } from './schema/bild';
import { farbeSchema, figurSchema, gruppeSchema, teilSchema } from './schema/figur';
import {
  ankerEckeSchema,
  ankerGlattSchema,
  ankerZeileSchema,
  bindungSchema,
  bindungsAbschnittSchema,
  formSchema,
  listenEintragSchema,
  mischartSchema,
  reglerSchema,
  schluesselSchema,
  spiegelregelSchema,
  spitzenfuehrungSchema,
  versatzEckeSchema,
  versatzGlattSchema,
  versatzZeileSchema,
  wechselSchema,
} from './schema/form';
import {
  artDatenSchema,
  artWertSchema,
  federSchema,
  herkunftSchema,
  istOrdnung,
  kennungSchema,
  kurveSchema,
  ordnungSchema,
  punktSchema,
  vorsilbeSchema,
  wertSchema,
} from './schema/grund';
import { anheftungSchema, aufhaengungSchema, biegeachseSchema, griffSatzSchema, knochenSchema } from './schema/knochen';
import { eingabeEintragSchema, laufDateiSchema } from './schema/lauf';
import {
  aktionSchema,
  aufgabeSchema,
  bandSchema,
  bausteinSchema,
  bedingungSchema,
  drahtSchema,
  messwertSchema,
  regelLauneSchema,
  regelSchema,
  regelSobaldSchema,
  regelSolangeSchema,
  vergleichSchema,
  wertquelleSchema,
} from './schema/logik';
import { huelleSchema, koerpermodellSchema, physikChipSchema } from './schema/physik';
import {
  markeSchema,
  poseSchema,
  schichtSchema,
  spurSchema,
  stehBalkenSchema,
  taktAbschnittSchema,
  taktleisteSchema,
  uebergangSchema,
  zusatzbewegungSchema,
  zyklusSchema,
  zyklusZeileSchema,
} from './schema/posen';
import { klangSchema, projektSchema, vorlageSchema } from './schema/projekt';
import {
  DATENSATZ_SCHEMAS,
  DATENSATZ_TYPEN,
  dateiArtSchema,
  dateiOrdnen,
  dateiSchema,
  datensatzOrdnen,
  datensatzSchema,
  datensatzTypVon,
  diffSchema,
  nachCodepunkten,
  ordnen,
  ordnungenZwischen,
  ordnungZwischen,
} from './schema/reihenfolge';
import { schriftSchema } from './schema/text';
import { klangChipSchema } from './schema/ton';
import { dingSchema, stoffSchema, szeneSchema, weltSchema } from './schema/welt';
import type { Effekt, Verbindung } from './typen/bild';
import type { Datei, DateiArt, Datensatz, DatensatzTabelle, DatensatzTyp, Diff, Versionen, Block } from './typen/dokument';
import type { Figur, Gruppe, Teil } from './typen/figur';
import type {
  AnkerEcke,
  AnkerGlatt,
  AnkerZeile,
  Bindung,
  BindungsAbschnitt,
  Form,
  ListenEintrag,
  Mischart,
  Regler,
  Schluessel,
  Spiegelregel,
  Spitzenfuehrung,
  VersatzEcke,
  VersatzGlatt,
  VersatzZeile,
  Wechsel,
} from './typen/form';
import type { ArtDaten, ArtWert, Feder, Herkunft, Id, Kurve, Punkt, Vorsilbe, Wert } from './typen/grund';
import type { Anheftung, Aufhaengung, Biegeachse, GriffSatz, Knochen } from './typen/knochen';
import type { EingabeEintrag, LaufDatei } from './typen/lauf';
import type {
  Aktion,
  Aufgabe,
  Band,
  Baustein,
  Bedingung,
  Draht,
  Messwert,
  Regel,
  RegelLaune,
  RegelSobald,
  RegelSolange,
  Vergleich,
  Wertquelle,
} from './typen/logik';
import type { Huelle, Koerpermodell, PhysikChip } from './typen/physik';
import type { Marke, Pose, Schicht, Spur, StehBalken, TaktAbschnitt, Taktleiste, Uebergang, Zusatzbewegung, Zyklus, ZyklusZeile } from './typen/posen';
import type { Klang, Projekt, Vorlage } from './typen/projekt';
import type { Schrift } from './typen/text';
import type { KlangChip } from './typen/ton';
import type { Ding, Stoff, Szene, Welt } from './typen/welt';
import {
  aktuelleVersionen,
  type ArtBlock,
  artBlock,
  BLOCK_VERSIONEN,
  BLOECKE,
  blockSchema,
  istArtSchluessel,
  nurLesenNach,
  versionenAbgleichen,
  versionenSchema,
} from './versionen';

/** gültige Kennung mit Nummer: `k('teil', 1)` ist 'teil_0000000001' */
function k<V extends Vorsilbe>(v: V, n: number): Id<V> {
  return `${v}_${String(n).padStart(10, '0')}`;
}

// ---------- Beispieldaten: jeder Datensatztyp, jedes Feld mindestens einmal ----------

const projekt: Projekt = {
  id: k('prj', 1), name: 'Probe', figuren: ['probe', 'huegel'], szenen: ['wiese'], start: k('sz', 1),
  quellen: [{ art: 'prototyp-schluessel', datei: 'docs/look/probe/schluessel.json', figur: k('fig', 1), zuordnung: [['eins', k('bd', 1)]] }],
  umgezogen: ['docs/look/probe/alt.json'],
  fassungen: [{ id: k('sl', 1), geraet: 'mac', zeit: '2026-11-20T18:00:00.000Z', sicherung: '.sicherung/probe/fassungen/a.json' }],
  uebergangen: ['hinweis.eins'], herkunft: 'dein',
};
const vorlage: Vorlage = { id: k('vl', 1), name: 'front', datei: 'vorlagen/0123456789abcdef.svg', hash: '0123456789abcdef', quelle: 'front.svg', herkunft: 'vorlage' };
const klang: Klang = {
  id: k('kl', 1), name: 'tapp', dateien: ['klaenge/0123456789abcdef.m4a'], lautstaerke: -6, streuung: { ton: 1, laut: 2 },
  mindestabstand: 0.05, stimmen: 2, herkunft: 'gebaut',
};
const dreieck: Form = [[0, 0, 90, 10, 10], [50, 0, 0, 0, 180, 0], [25, 40, -90, 5, 90, 5]];
const schrift: Schrift = {
  id: k('sf', 1), name: 'Lobster', quelle: 'assets/fonts/lobster/Lobster-Regular.ttf', geviert: 1000,
  glyphen: [{ zeichen: 'o', vorschub: 500, konturen: [{ form: dreieck, innen: false }, { form: dreieck, innen: true }] }],
  unterschneidung: [['A', 'V', -50]], herkunft: 'gebaut',
};
const figur: Figur = {
  id: k('fig', 1), name: 'Probe', datei: 'probe', einheitL: 120, vorlage: 'vierbeiner', wurzel: k('kn', 1),
  lage: { x: k('rg', 2), y: k('rg', 3), drehung: k('rg', 4) }, herkunft: 'gebaut',
};
const teil: Teil = {
  id: k('teil', 1), figur: k('fig', 1), name: 'eins', art: 'flaeche', farbe: 'schwarz', ebene: 'a0', gruppe: k('gr', 1),
  anker: [k('an', 1), k('an', 2), k('an', 3)], form: dreieck, wieGezeichnet: true,
  klemme: { traeger: k('teil', 2), rand: 0.5, weich: 0.1 }, hinter: { teil: k('teil', 2), tiefe: k('rg', 5) }, partner: k('teil', 2),
  rolle: 'ohr', seite: 'rechts', vorlageName: 'Pfad 1', herkunft: 'vorlage',
};
const linie: Teil = {
  id: k('teil', 3), figur: k('fig', 1), name: 'Lid', art: 'linie', farbe: '#1f1a17', ebene: 'a1', anker: [k('an', 4), k('an', 5)],
  linie: { offen: true, breite: [[0, 1], [1, 2.5]] }, herkunft: 'gebaut',
};
const gruppe: Gruppe = { id: k('gr', 1), figur: k('fig', 1), name: 'Kopf', ordnung: 'a0', herkunft: 'gebaut' };
const spiegelregel: Spiegelregel = {
  ab: 180, um: 360, achseX: 0, paare: [[k('teil', 1), k('teil', 2)]], umnummern: [{ teil: k('teil', 4), folge: [0, 2, 1] }],
  reihenfolgeTauschen: true, regler: [{ regler: k('rg', 6), um: 0 }],
};
const regler: Regler = {
  id: k('rg', 1), besitzer: k('fig', 1), name: 'Drehung', art: 'kreis', bereich: [0, 360], standard: 0, einheit: 'grad', raster: 0.5,
  ausgleich: { dauer: 0.3, federung: 0 }, hoechsttempo: 160, nachlauf: 0.2, spiegel: spiegelregel, rolle: 'kopf.theta', herkunft: 'gebaut',
};
const bindung: Bindung = {
  id: k('bd', 1), teil: k('teil', 1), achsen: [k('rg', 1)], wirkung: 'ansicht', mischart: 'koordinaten', periodisch: false,
  abschnitte: [
    { von: 0, bis: 180, art: 'liste', liste: [{ schluessel: k('sl', 1), an: 0 }, { schluessel: k('sl', 2), an: 90, gespiegelt: true }] },
    { von: 180, bis: 360, art: 'gespiegelt', bindung: k('bd', 2), um: 360 },
  ],
  spitzen: [
    { von: 45, bis: 90, anker: [k('an', 1)], rahmenVon: k('sl', 1), rahmenBis: k('sl', 2) },
    { von: 270, bis: 315, anker: [k('an', 1)], rahmenVon: k('sl', 1), rahmenBis: k('sl', 2), gespiegelt: true },
  ],
  herkunft: 'gebaut',
};
const zusatzBindung: Bindung = {
  id: k('bd', 3), teil: k('teil', 1), achsen: [k('rg', 7), k('rg', 8)], wirkung: 'zusatz', mischart: 'rahmenRest', periodisch: false, herkunft: 'gebaut',
};
const schluessel: Schluessel = {
  id: k('sl', 1), bindung: k('bd', 1), an: [0], art: 'form', gestalt: dreieck, herkunft: 'dein', grund: 'Front', vorlage: k('vl', 1), stuetze: true,
};
const zusatzSchluessel: Schluessel = {
  id: k('sl', 3), bindung: k('bd', 3), an: [10, 20], art: 'falte', versatz: [[0.1, 0, 0, 0, 0], [0, 0.2, 1, 0, -1, 0], [0, 0, 0, 0, 0]], herkunft: 'gebaut',
};
const wechsel: Wechsel = {
  id: k('we', 1), figur: k('fig', 1), regler: k('rg', 1), an: 140, richtung: 'ab', breite: 0, art: 'ueber', teil: k('teil', 1), bezug: k('teil', 2),
  herkunft: 'gebaut',
};
const knochen: Knochen = {
  id: k('kn', 1), figur: k('fig', 1), name: 'Hals', eltern: k('kn', 2), gelenk: [0, -40], winkel: k('rg', 9), verschiebung: [k('rg', 10), k('rg', 11)],
  anheftung: { teil: k('teil', 1), anker: [k('an', 1), k('an', 2)], gewichte: [0.5, 0.5] },
  achse: { laenge: 40, abstand: k('rg', 12), biegungWurzel: k('rg', 13), biegungEnde: k('rg', 14), beugung: -1, boden: true, rMin: 3 },
  rolle: 'hals', gepinnt: true, herkunft: 'gebaut',
};
const aufhaengung: Aufhaengung = {
  id: k('af', 1), teil: k('teil', 1), art: 'achse', knochen: [k('kn', 1), k('kn', 2)],
  gewichte: [[[0, 0.75], [1, 0.25]], [[0, 1], [1, 0]], [[0, 0.5], [1, 0.5]]],
  griffe: ['erben', { paar: [[0, 1]] }, { ein: [[0, 1]], aus: [[1, 1]] }], mischung: 'linear', gepinnt: [k('an', 2)], herkunft: 'gebaut',
};
const koerpermodell: Koerpermodell = {
  id: k('km', 1), figur: k('fig', 1),
  koerper: [
    { rolle: 'rumpf.hinten', knochen: k('kn', 1), huelle: { kapsel: { a: [0, 0], b: [10, 0], r: 5 } }, masseAnteil: 0.6 },
    {
      rolle: 'kopf', knochen: k('kn', 4), huelle: { kreis: { mitte: [0, -30], r: 8 } }, masseAnteil: 0.4,
      gelenk: { an: 'rumpf.hinten', punkt: [5, -20], grenzen: [-10, 10] }, abweichung: [{ regler: k('rg', 15), groesse: 'winkel' }],
    },
  ],
  federbeine: [{ rolle: 'bein.vorn', koerper: 'rumpf.hinten', achse: k('kn', 3), von: [0, 0], laenge: 30, feder: { dauer: 0.2, federung: 0.3 } }],
  glieder: [
    { rolle: 'bein.hinten', knochen: k('kn', 5), huelle: { vieleck: { punkte: [[0, 0], [1, 0], [0, 1]], rundung: 0.5 } }, an: 'rumpf.hinten', punkt: [0, 5] },
    { rolle: 'boden', knochen: k('kn', 6), huelle: { kette: { punkte: [[0, 0], [5, 1]], schleife: false } }, an: 'rumpf.hinten', punkt: [0, 0], grenzen: [-5, 5] },
  ],
  herkunft: 'gebaut',
};
const schicht: Schicht = { id: k('sch', 1), figur: k('fig', 1), name: 'Körper', ordnung: 'a0', art: 'ersetzen', regler: [k('rg', 1)], physik: false, herkunft: 'gebaut' };
const pose: Pose = {
  id: k('po', 1), schicht: k('sch', 1), name: 'Stehen', ordnung: 'a0', gruppe: 'stehen', grundform: true, in: k('ue', 2), werte: [[k('rg', 1), 0]],
  kreuz: [{ achse: k('rg', 2), an: 90, werte: [[k('rg', 1), 5]] }], gewicht: k('rg', 16), verweilen: k('zy', 1), herkunft: 'gebaut',
};
const taktleiste: Taktleiste = {
  abschnitte: [{ nach: k('po', 1), dauer: 0.4, kurve: 'weich' }, { nach: k('po', 2), dauer: { bis: 'landung', hoechstens: 1 }, kurve: 'feder' }],
  zusatz: [{ art: 'huepfer', von: 0, bis: 0.5, staerke: { aus: 'tempo' }, daten: { an: true, hoehe: 2, liste: [1, 2], namen: ['a'], tief: { x: 1 }, um: 'pfoten.hinten' } }],
  steht: [{ rolle: 'pfoten.hinten', von: 0, bis: 0.2 }],
  marken: [{ bei: 0.3, ereignis: 'tapp', klang: k('kl', 1), chance: 0.5 }, { bei: 0.4, ereignis: 'still' }],
  spuren: [{ regler: k('rg', 17), punkte: [[0, 1, 'linear'], [0.5, 0.4, 'weich']] }],
};
const uebergang: Uebergang = {
  id: k('ue', 1), schicht: k('sch', 1), von: 'jede', nach: k('po', 1), art: 'gestaltet', feder: { dauer: 0.7, federung: 0, vorgriff: 0.1 },
  ueber: [k('po', 2)], variante: { name: 'b', gewicht: 0.5 }, unterbrechen: 'halt', umkehrbar: true, nachklang: 0.3, takt: taktleiste, herkunft: 'gebaut',
};
const zyklus: Zyklus = {
  id: k('zy', 1), figur: k('fig', 1), name: 'Gang', phase: k('rg', 18), antrieb: 'weg', frequenz: 2, schritt: 0.8, zweite: k('rg', 19),
  zeilen: [{ an: 0, posen: [{ bei: 0, pose: k('po', 1) }], kontakte: [{ rolle: 'pfote.vorn', von: 0, bis: 0.5 }] }], herkunft: 'gebaut',
};
const physikChip: PhysikChip = {
  id: k('ch', 1), an: k('teil', 1), art: 'schwingen', aktiv: true, feder: { dauer: 0.5, federung: 0.2 }, ausgang: k('rg', 20),
  mehr: { schwerkraft: 1, wind: 0, grenzen: [-30, 30], spitze: 2 }, daten: {}, herkunft: 'gebaut',
};
const verbindung: Verbindung = { id: k('vb', 1), figur: k('fig', 1), a: k('teil', 1), b: k('gr', 1), art: 'verschmelzen', mass: 4, nachKante: true, herkunft: 'gebaut' };
const effekt: Effekt = {
  id: k('ef', 1), besitzer: k('fig', 1), art: 'dicke', aktiv: true, wo: [k('teil', 1), k('gr', 1), k('fig', 1), 'welt', 'kamera'], staerke: 1,
  weichheit: k('rg', 21), profil: [[0, 1], [2, 0]], rauschen: { koernung: 1, tempo: 0 }, zeit: 'gestuft', daten: {}, herkunft: 'gebaut',
};
const klangChip: KlangChip = {
  id: k('kc', 1), an: k('ue', 1), klang: k('kl', 1), ausloeser: { kontakt: { mindest: 0.2 } }, lautstaerke: { aus: 'aufprall' }, aktiv: true, herkunft: 'gebaut',
};
const welt: Welt = {
  id: k('welt', 1), name: 'Hügel', schwerkraft: 9.81, huegel: k('fig', 2),
  rad: { radius: 12, gewicht: 'boden', lagerreibung: 0.1, griff: { feder: { dauer: 0.1, federung: 0 }, hoechstkraft: 50 } },
  stoffe: [{ name: 'gras', haftung: 0.8, rollwiderstand: 0.02, abprall: 0.1 }, { name: 'matsch', haftung: k('rg', 22), rollwiderstand: 0.2, abprall: 0 }],
  standardStoff: 'gras', herkunft: 'gebaut',
};
const szene: Szene = {
  id: k('sz', 1), name: 'Spielwiese', datei: 'spielwiese', welt: k('welt', 1), saat: 7, rahmen: k('di', 2), kamera: k('di', 3), musik: k('di', 4), herkunft: 'gebaut',
};
const ding: Ding = {
  id: k('di', 1), szene: k('sz', 1), name: 'Stamm', figur: k('fig', 3), art: 'stamm', rolle: 'fest', lage: { winkel: 30, hoehe: 0, drehung: 0 }, breite: 10,
  stoff: 'holz', ebene: 'a0', herkunft: 'gebaut',
};
const baustein: Baustein = {
  id: k('bs', 1), art: 'vierbeiner', an: k('di', 1), regler: { bremskraft: 0.3, wunschtempo: k('rg', 23) }, posen: { stehen: k('po', 1) },
  daten: { springenAufTippen: false }, herkunft: 'gebaut',
};
const draht: Draht = {
  id: k('dr', 1), besitzer: k('sz', 1), quelle: `${k('bs', 1)}.hang`, ziel: k('rg', 23), kennlinie: [[0, 0], [1, 2]], kurve: 'weich',
  spiegel: { ab: 180, um: 360, negieren: true }, glaetten: 0.1, herkunft: 'gebaut',
};
/** Felder der Regel-Basis in der Reihenfolge des Typs */
function regelBasis(n: number, geltung: RegelSobald['geltung']) {
  return { id: k('re', n), szene: k('sz', 1), geltung, band: 'grund' as const, ordnung: 'a0', aktiv: true, herkunft: 'gebaut' as const };
}
const regelSobald: RegelSobald = {
  ...regelBasis(1, { art: 'pfuetze' }), satz: 'sobald', ereignis: 'betreten',
  falls: [{ links: { messwert: `${k('di', 1)}.tiefe` }, vergleich: '>', rechts: 0.5, rueckweg: 0.1 }],
  dann: [
    { tun: 'pose', ding: k('di', 1), pose: k('po', 1), variante: 'b' },
    { tun: 'befehl', baustein: k('bs', 1), befehl: 'springen', wert: 1 },
    { tun: 'klang', klang: k('kl', 1), lautstaerke: { aus: `${k('bs', 1)}.tempo` } },
    { tun: 'effekt', effekt: k('ef', 1), staerke: 0.5 },
    { tun: 'zaehler', zaehler: k('bs', 2), plus: 1, setzen: 0 },
    { tun: 'zeitlupe', faktor: 0.5, dauer: 1 },
    { tun: 'kamerastoss', staerke: 1 },
    { tun: 'haptik', staerke: 'leicht' },
    { tun: 'launeBeenden' },
    { tun: 'verbergen', ding: k('di', 1) },
    { tun: 'zeigen', ding: k('di', 1) },
    { tun: 'stoss', ding: k('di', 1), kraft: [1, 0] },
  ],
  hoechstensAlle: 2,
};
const regelSolange: RegelSolange = {
  ...regelBasis(2, { ding: k('di', 1) }), satz: 'solange',
  wenn: [{ links: { zustand: k('bs', 1) }, vergleich: '=', rechts: 'gehen' }, { links: { regler: k('rg', 1) }, vergleich: '<=', rechts: 3 }],
  halte: [{ kanal: `${k('di', 1)}.wunschtempo`, wert: 0 }, { kanal: `${k('di', 1)}.pose.koerper`, wert: k('po', 1) }], mindestens: 1,
};
const regelLaune: RegelLaune = {
  ...regelBasis(3, { art: 'duftstelle' }), satz: 'laune', name: 'Schnüffeln', wenn: { chanceJeSekunde: 0.1 },
  falls: [{ links: { zaehler: k('bs', 2) }, vergleich: '!=', rechts: 0 }], haeufigkeit: { basis: 1, launenRegler: 'neugier' },
  ankuendigung: { pose: k('po', 3), dauer: 0.5 }, wirkung: { soll: [['wunschtempo', 0]], pose: k('po', 4), dauer: [2, 5] },
  ende: [{ zeit: 'um' }, { ereignis: 'gerufen' }], danach: k('po', 1), ruhezeit: 10,
};
const aufgabe: Aufgabe = {
  id: k('au', 1), szene: k('sz', 1), text: 'Dreimal springen', ordnung: 'a0', vorlage: 'mal', ereignis: 'sprung', anzahl: 3, zustand: 'gehen',
  bis: 'ende', messwert: `${k('bs', 2)}.einer`, wert: 3, beweis: 'laeufe/sprung.json', herkunft: 'gebaut',
};
const laufDatei: LaufDatei = {
  format: 'studio-lauf', version: 1, szene: k('sz', 1), inhalt: '0123456789abcdef', saat: 1, takte: 120,
  eingaben: [{ takt: 0, finger: { an: true, x: 1, y: 2 } }, { takt: 3, tippen: [1, 2], knopf: 'a' }],
  pruefsummen: [[60, 123456], [120, -5]], merker: [{ takt: 61, notiz: 'hier' }],
};

/** je Datensatztyp seine Beispiele */
const BEISPIELE: { [T in DatensatzTyp]: DatensatzTabelle[T][] } = {
  prj: [projekt], vl: [vorlage], kl: [klang], sf: [schrift],
  fig: [figur], teil: [teil, linie], gr: [gruppe],
  rg: [
    regler,
    { ...regler, id: k('rg', 30), art: 'linie', bereich: [-1, 1], einheit: 'anteil', besitzer: k('sz', 1) },
    { ...regler, id: k('rg', 31), name: 'Kopfversatz x', art: 'linie', bereich: [-10, 10], einheit: 'figur' },
  ],
  bd: [bindung, zusatzBindung], sl: [schluessel, zusatzSchluessel], we: [wechsel],
  kn: [knochen], af: [aufhaengung], km: [koerpermodell],
  sch: [schicht], po: [pose], ue: [uebergang], zy: [zyklus],
  ch: [physikChip], vb: [verbindung], ef: [effekt], kc: [klangChip],
  welt: [welt], sz: [szene], di: [ding],
  bs: [baustein], dr: [draht], re: [regelSobald, regelSolange, regelLaune], au: [aufgabe],
};

function alleBeispiele(): Datensatz[] {
  return DATENSATZ_TYPEN.flatMap((t) => BEISPIELE[t] as Datensatz[]);
}

function dateiAus(datensaetze: readonly Datensatz[], art: DateiArt = 'figur'): Datei {
  const d: Datei = { format: 'studio', art, versionen: aktuelleVersionen(artVersionen()), datensaetze: {} };
  const tabellen = d.datensaetze as Record<string, Record<string, Datensatz>>;
  for (const ds of datensaetze) {
    const typ = datensatzTypVon(ds.id)!;
    (tabellen[typ] ??= {})[ds.id] = ds;
  }
  return d;
}

/** tiefe Kopie mit umgekehrter Reihenfolge aller Objektfelder */
function umgedreht(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(umgedreht);
  if (typeof x === 'object' && x !== null) {
    const aus: Record<string, unknown> = {};
    for (const [k2, v] of Object.entries(x).reverse()) aus[k2] = umgedreht(v);
    return aus;
  }
  return x;
}

// ---------- Typebene ----------

describe('Typ und Schema decken sich in beide Richtungen (Typebene, geprüft von tsc)', () => {
  it('jeder Datensatztyp: Ausgang und Eingang des Schemas sind genau der Typ', () => {
    type Schemas = typeof DATENSATZ_SCHEMAS;
    expectTypeOf<{ [T in DatensatzTyp]: z.output<Schemas[T]> }>().toEqualTypeOf<DatensatzTabelle>();
    expectTypeOf<{ [T in DatensatzTyp]: z.input<Schemas[T]> }>().toEqualTypeOf<DatensatzTabelle>();
    expectTypeOf<keyof Schemas>().toEqualTypeOf<DatensatzTyp>();
  });

  it('grund', () => {
    type TeilKennung = ReturnType<typeof kennungSchema<'teil'>>;
    type Besitzer = ReturnType<typeof kennungSchema<'fig' | 'sz'>>;
    expectTypeOf<z.output<TeilKennung>>().toEqualTypeOf<Id<'teil'>>();
    expectTypeOf<z.input<TeilKennung>>().toEqualTypeOf<Id<'teil'>>();
    expectTypeOf<z.output<Besitzer>>().toEqualTypeOf<Id<'fig'> | Id<'sz'>>();
    expectTypeOf<z.output<typeof vorsilbeSchema>>().toEqualTypeOf<Vorsilbe>();
    expectTypeOf<z.output<typeof punktSchema>>().toEqualTypeOf<Punkt>();
    expectTypeOf<z.input<typeof punktSchema>>().toEqualTypeOf<Punkt>();
    expectTypeOf<z.output<typeof herkunftSchema>>().toEqualTypeOf<Herkunft>();
    expectTypeOf<z.output<typeof kurveSchema>>().toEqualTypeOf<Kurve>();
    expectTypeOf<z.output<typeof federSchema>>().toEqualTypeOf<Feder>();
    expectTypeOf<z.input<typeof federSchema>>().toEqualTypeOf<Feder>();
    expectTypeOf<z.output<typeof wertSchema>>().toEqualTypeOf<Wert>();
    expectTypeOf<z.input<typeof wertSchema>>().toEqualTypeOf<Wert>();
    expectTypeOf<z.output<typeof artWertSchema>>().toEqualTypeOf<ArtWert>();
    expectTypeOf<z.input<typeof artWertSchema>>().toEqualTypeOf<ArtWert>();
    expectTypeOf<z.output<typeof artDatenSchema>>().toEqualTypeOf<ArtDaten>();
    expectTypeOf<z.input<typeof artDatenSchema>>().toEqualTypeOf<ArtDaten>();
    expectTypeOf<z.output<typeof ordnungSchema>>().toEqualTypeOf<string>();
  });

  it('form, figur, knochen', () => {
    expectTypeOf<z.output<typeof ankerGlattSchema>>().toEqualTypeOf<AnkerGlatt>();
    expectTypeOf<z.output<typeof ankerEckeSchema>>().toEqualTypeOf<AnkerEcke>();
    expectTypeOf<z.output<typeof ankerZeileSchema>>().toEqualTypeOf<AnkerZeile>();
    expectTypeOf<z.input<typeof ankerZeileSchema>>().toEqualTypeOf<AnkerZeile>();
    expectTypeOf<z.output<typeof formSchema>>().toEqualTypeOf<Form>();
    expectTypeOf<z.output<typeof versatzGlattSchema>>().toEqualTypeOf<VersatzGlatt>();
    expectTypeOf<z.output<typeof versatzEckeSchema>>().toEqualTypeOf<VersatzEcke>();
    expectTypeOf<z.output<typeof versatzZeileSchema>>().toEqualTypeOf<VersatzZeile>();
    expectTypeOf<z.output<typeof mischartSchema>>().toEqualTypeOf<Mischart>();
    expectTypeOf<z.output<typeof spiegelregelSchema>>().toEqualTypeOf<Spiegelregel>();
    expectTypeOf<z.input<typeof spiegelregelSchema>>().toEqualTypeOf<Spiegelregel>();
    expectTypeOf<z.output<typeof bindungsAbschnittSchema>>().toEqualTypeOf<BindungsAbschnitt>();
    expectTypeOf<z.input<typeof bindungsAbschnittSchema>>().toEqualTypeOf<BindungsAbschnitt>();
    expectTypeOf<z.output<typeof listenEintragSchema>>().toEqualTypeOf<ListenEintrag>();
    expectTypeOf<z.output<typeof spitzenfuehrungSchema>>().toEqualTypeOf<Spitzenfuehrung>();
    expectTypeOf<z.output<typeof farbeSchema>>().toEqualTypeOf<Teil['farbe']>();
    expectTypeOf<z.output<typeof anheftungSchema>>().toEqualTypeOf<Anheftung>();
    expectTypeOf<z.output<typeof biegeachseSchema>>().toEqualTypeOf<Biegeachse>();
    expectTypeOf<z.output<typeof griffSatzSchema>>().toEqualTypeOf<GriffSatz>();
    expectTypeOf<z.input<typeof griffSatzSchema>>().toEqualTypeOf<GriffSatz>();
    // auch einzeln, damit eine Abweichung ihren Typ nennt
    expectTypeOf<z.output<typeof teilSchema>>().toEqualTypeOf<Teil>();
    expectTypeOf<z.input<typeof teilSchema>>().toEqualTypeOf<Teil>();
    expectTypeOf<z.output<typeof figurSchema>>().toEqualTypeOf<Figur>();
    expectTypeOf<z.output<typeof gruppeSchema>>().toEqualTypeOf<Gruppe>();
    expectTypeOf<z.output<typeof reglerSchema>>().toEqualTypeOf<Regler>();
    expectTypeOf<z.output<typeof bindungSchema>>().toEqualTypeOf<Bindung>();
    expectTypeOf<z.output<typeof schluesselSchema>>().toEqualTypeOf<Schluessel>();
    expectTypeOf<z.output<typeof wechselSchema>>().toEqualTypeOf<Wechsel>();
    expectTypeOf<z.output<typeof knochenSchema>>().toEqualTypeOf<Knochen>();
    expectTypeOf<z.output<typeof aufhaengungSchema>>().toEqualTypeOf<Aufhaengung>();
  });

  it('posen, physik, bild, ton, welt', () => {
    expectTypeOf<z.output<typeof taktleisteSchema>>().toEqualTypeOf<Taktleiste>();
    expectTypeOf<z.input<typeof taktleisteSchema>>().toEqualTypeOf<Taktleiste>();
    expectTypeOf<z.output<typeof taktAbschnittSchema>>().toEqualTypeOf<TaktAbschnitt>();
    expectTypeOf<z.output<typeof zusatzbewegungSchema>>().toEqualTypeOf<Zusatzbewegung>();
    expectTypeOf<z.output<typeof stehBalkenSchema>>().toEqualTypeOf<StehBalken>();
    expectTypeOf<z.output<typeof markeSchema>>().toEqualTypeOf<Marke>();
    expectTypeOf<z.output<typeof spurSchema>>().toEqualTypeOf<Spur>();
    expectTypeOf<z.output<typeof zyklusZeileSchema>>().toEqualTypeOf<ZyklusZeile>();
    expectTypeOf<z.output<typeof schichtSchema>>().toEqualTypeOf<Schicht>();
    expectTypeOf<z.output<typeof poseSchema>>().toEqualTypeOf<Pose>();
    expectTypeOf<z.output<typeof uebergangSchema>>().toEqualTypeOf<Uebergang>();
    expectTypeOf<z.output<typeof zyklusSchema>>().toEqualTypeOf<Zyklus>();
    expectTypeOf<z.output<typeof huelleSchema>>().toEqualTypeOf<Huelle>();
    expectTypeOf<z.input<typeof huelleSchema>>().toEqualTypeOf<Huelle>();
    expectTypeOf<z.output<typeof physikChipSchema>>().toEqualTypeOf<PhysikChip>();
    expectTypeOf<z.output<typeof koerpermodellSchema>>().toEqualTypeOf<Koerpermodell>();
    expectTypeOf<z.output<typeof verbindungSchema>>().toEqualTypeOf<Verbindung>();
    expectTypeOf<z.output<typeof effektSchema>>().toEqualTypeOf<Effekt>();
    expectTypeOf<z.output<typeof klangChipSchema>>().toEqualTypeOf<KlangChip>();
    expectTypeOf<z.output<typeof stoffSchema>>().toEqualTypeOf<Stoff>();
    expectTypeOf<z.output<typeof weltSchema>>().toEqualTypeOf<Welt>();
    expectTypeOf<z.output<typeof szeneSchema>>().toEqualTypeOf<Szene>();
    expectTypeOf<z.output<typeof dingSchema>>().toEqualTypeOf<Ding>();
  });

  it('logik, lauf, text, projekt', () => {
    expectTypeOf<z.output<typeof messwertSchema>>().toEqualTypeOf<Messwert>();
    expectTypeOf<z.input<typeof messwertSchema>>().toEqualTypeOf<Messwert>();
    expectTypeOf<z.output<typeof bandSchema>>().toEqualTypeOf<Band>();
    expectTypeOf<z.output<typeof vergleichSchema>>().toEqualTypeOf<Vergleich>();
    expectTypeOf<z.output<typeof wertquelleSchema>>().toEqualTypeOf<Wertquelle>();
    expectTypeOf<z.output<typeof bedingungSchema>>().toEqualTypeOf<Bedingung>();
    expectTypeOf<z.output<typeof aktionSchema>>().toEqualTypeOf<Aktion>();
    expectTypeOf<z.input<typeof aktionSchema>>().toEqualTypeOf<Aktion>();
    expectTypeOf<z.output<typeof regelSobaldSchema>>().toEqualTypeOf<RegelSobald>();
    expectTypeOf<z.output<typeof regelSolangeSchema>>().toEqualTypeOf<RegelSolange>();
    expectTypeOf<z.output<typeof regelLauneSchema>>().toEqualTypeOf<RegelLaune>();
    expectTypeOf<z.output<typeof regelSchema>>().toEqualTypeOf<Regel>();
    expectTypeOf<z.input<typeof regelSchema>>().toEqualTypeOf<Regel>();
    expectTypeOf<z.output<typeof bausteinSchema>>().toEqualTypeOf<Baustein>();
    expectTypeOf<z.output<typeof drahtSchema>>().toEqualTypeOf<Draht>();
    expectTypeOf<z.output<typeof aufgabeSchema>>().toEqualTypeOf<Aufgabe>();
    expectTypeOf<z.output<typeof laufDateiSchema>>().toEqualTypeOf<LaufDatei>();
    expectTypeOf<z.input<typeof laufDateiSchema>>().toEqualTypeOf<LaufDatei>();
    expectTypeOf<z.output<typeof eingabeEintragSchema>>().toEqualTypeOf<EingabeEintrag>();
    expectTypeOf<z.output<typeof schriftSchema>>().toEqualTypeOf<Schrift>();
    expectTypeOf<z.output<typeof projektSchema>>().toEqualTypeOf<Projekt>();
    expectTypeOf<z.input<typeof projektSchema>>().toEqualTypeOf<Projekt>();
    expectTypeOf<z.output<typeof vorlageSchema>>().toEqualTypeOf<Vorlage>();
    expectTypeOf<z.output<typeof klangSchema>>().toEqualTypeOf<Klang>();
  });

  it('Dokument-Ebene und Versionen', () => {
    expectTypeOf<z.output<typeof blockSchema>>().toEqualTypeOf<Block>();
    expectTypeOf<z.output<typeof versionenSchema>>().toEqualTypeOf<Versionen>();
    expectTypeOf<z.input<typeof versionenSchema>>().toEqualTypeOf<Versionen>();
    expectTypeOf<z.output<typeof dateiArtSchema>>().toEqualTypeOf<DateiArt>();
    expectTypeOf<z.output<typeof dateiSchema>>().toEqualTypeOf<Datei>();
    expectTypeOf<z.input<typeof dateiSchema>>().toEqualTypeOf<Datei>();
    expectTypeOf<z.output<typeof datensatzSchema>>().toEqualTypeOf<Datensatz>();
    expectTypeOf<z.output<typeof diffSchema>>().toEqualTypeOf<Diff>();
    expectTypeOf<z.input<typeof diffSchema>>().toEqualTypeOf<Diff>();
  });
});

// ---------- Laufzeit: gültig ----------

describe('gültige Beispieldaten gehen durch', () => {
  it('jeder Datensatztyp mit seinem Schema und als Datensatz', () => {
    for (const typ of DATENSATZ_TYPEN) {
      const beispiele = BEISPIELE[typ] as Datensatz[];
      expect(beispiele.length).toBeGreaterThan(0);
      for (const b of beispiele) {
        const r = z.safeParse(DATENSATZ_SCHEMAS[typ] as z.ZodType, b);
        expect(r.error?.issues ?? [], `${typ} ${b.id}`).toEqual([]);
        expect(r.data).toEqual(b);
        expect(datensatzSchema.safeParse(b).success).toBe(true);
      }
    }
  });

  it('Teile der Datensätze einzeln', () => {
    expect(taktleisteSchema.parse(taktleiste)).toEqual(taktleiste);
    expect(laufDateiSchema.parse(laufDatei)).toEqual(laufDatei);
    const schleife = { kette: { punkte: [[0, 0], [1, 0], [0, 1]], schleife: true } };
    expect(huelleSchema.parse(schleife)).toEqual(schleife);
    expect(farbeSchema.parse('#A0b1C2')).toBe('#A0b1C2');
    expect(farbeSchema.parse('weiss')).toBe('weiss');
    expect(artDatenSchema.parse({ a: 1, b: 'x', c: [1, 2], d: ['x'], e: { f: { g: true } }, h: [] })).toBeTruthy();
    expect(ankerZeileSchema.parse([0, 0, 180, 0, 0])).toEqual([0, 0, 180, 0, 0]);
    expect(ankerZeileSchema.parse([0, 0, -179.999, 0, 180, 1e-9])).toHaveLength(6);
  });

  it('eine ganze Datei mit allen Typen', () => {
    const d = dateiAus(alleBeispiele());
    const r = dateiSchema.safeParse(d);
    expect(r.error?.issues ?? []).toEqual([]);
    expect(r.data).toEqual(d);
  });

  it('ein Diff', () => {
    const d: Diff = { neu: [teil, regelLaune], weg: [ding], geaendert: [[regler, { ...regler, standard: 10 }]] };
    expect(diffSchema.parse(d)).toEqual(d);
  });
});

// ---------- Laufzeit: ungültig ----------

describe('ungültige Daten werden abgelehnt', () => {
  const faelle: [string, z.ZodType, unknown][] = [
    ['Kennung zu kurz', teilSchema, { ...teil, id: 'teil_123' }],
    ['Kennung mit fremder Vorsilbe', teilSchema, { ...teil, id: k('fig', 1) }],
    ['Kennung mit Sonderzeichen', teilSchema, { ...teil, id: 'teil_0123-45678' }],
    ['Verweis auf den falschen Typ', teilSchema, { ...teil, figur: k('teil', 9) }],
    ['unbekanntes Feld (altes Teil.grundform, Befund 29)', teilSchema, { ...teil, grundform: dreieck }],
    ['ausdrücklich undefined statt fehlend', teilSchema, { ...teil, gruppe: undefined }],
    ['Pflichtfeld fehlt (herkunft)', gruppeSchema, { id: k('gr', 1), figur: k('fig', 1), name: 'x', ordnung: 'a0' }],
    ["Herkunft 'automatik' ist eine Quelle, keine Herkunft", gruppeSchema, { ...gruppe, herkunft: 'automatik' }],
    ['Farbe mit drei Ziffern', teilSchema, { ...teil, farbe: '#fff' }],
    ['Farbe als Wort', teilSchema, { ...teil, farbe: 'rot' }],
    ['Bruchindex mit Null am Ende', teilSchema, { ...teil, ebene: 'a00' }],
    ['Bruchindex leer', gruppeSchema, { ...gruppe, ordnung: '' }],
    ['Bruchindex ohne Kopf', gruppeSchema, { ...gruppe, ordnung: '0a' }],
    ['Bruchindex zu kurz für seinen Kopf', gruppeSchema, { ...gruppe, ordnung: 'b1' }],
    ['Anker doppelt', teilSchema, { ...teil, anker: [k('an', 1), k('an', 1)] }],
    ['Winkel über 180', ankerZeileSchema, [0, 0, 180.5, 1, 1]],
    ['Winkel −180 (gehört als 180 geschrieben)', ankerZeileSchema, [0, 0, -180, 1, 1]],
    ['Winkel des Aus-Griffs einer Ecke außerhalb', ankerZeileSchema, [0, 0, 0, 1, 270, 1]],
    ['negative Grifflänge', ankerZeileSchema, [0, 0, 0, -1, 1]],
    ['Ankerzeile mit 4 Zahlen', ankerZeileSchema, [0, 0, 0, 1]],
    ['Ankerzeile mit 7 Zahlen', ankerZeileSchema, [0, 0, 0, 1, 0, 1, 0]],
    ['Ankerzeile mit Text', ankerZeileSchema, [0, 0, '0', 1, 1]],
    ['Versatzzeile mit 4 Zahlen', versatzZeileSchema, [0, 0, 0, 0]],
    ['Figur.charakter entfällt (16 i)', figurSchema, { ...figur, charakter: { schwer: 0 } }],
    ['Dateiname mit Pfad', figurSchema, { ...figur, datei: '../andere' }],
    ['Dateiname mit Schrägstrich', szeneSchema, { ...szene, datei: 'a/b' }],
    ['Dateiname versteckt', projektSchema, { ...projekt, figuren: ['.sicherung'] }],
    ['Pose.spannung entfällt (16 h)', poseSchema, { ...pose, spannung: 1 }],
    ['Taktleiste ohne Spuren', taktleisteSchema, { abschnitte: [], zusatz: [], steht: [], marken: [] }],
    ['Nachlauf über 0,5 s', reglerSchema, { ...regler, nachlauf: 0.6 }],
    ['Regler mit einer Einheit, die es nicht gibt', reglerSchema, { ...regler, einheit: 'm' }],
    ['Ding ohne Figur (16 d)', dingSchema, (({ figur: _f, ...rest }) => rest)(ding)],
    ['Schlüssel ohne Stelle', schluesselSchema, { ...schluessel, an: [] }],
    ['Bindung mit drei Achsen', bindungSchema, { ...bindung, achsen: [k('rg', 1), k('rg', 2), k('rg', 3)] }],
    ['Abschnitt einer unbekannten Art', bindungSchema, { ...bindung, abschnitte: [{ von: 0, bis: 1, art: 'kopie', liste: [] }] }],
    ['Gewichtsindex negativ', aufhaengungSchema, { ...aufhaengung, gewichte: [[[-1, 1]]] }],
    ['Gewichtsindex keine ganze Zahl', aufhaengungSchema, { ...aufhaengung, gewichte: [[[0.5, 1]]] }],
    ['Griffsatz mit paar und ein', aufhaengungSchema, { ...aufhaengung, griffe: [{ paar: [[0, 1]], ein: [[0, 1]] }] }],
    ["Griffe mit null statt 'erben' (3.5 Nr. 4: kein null)", aufhaengungSchema, { ...aufhaengung, griffe: [null, { paar: [[0, 1]] }, 'erben'] }],
    ['Beugung 0', knochenSchema, { ...knochen, achse: { ...knochen.achse, beugung: 0 } }],
    ['Messwert ohne Namen', drahtSchema, { ...draht, quelle: k('bs', 1) }],
    ['Messwert einer Figur', drahtSchema, { ...draht, quelle: `${k('fig', 1)}.tempo` }],
    ['Regel mit unbekanntem Satz', regelSchema, { ...regelSobald, satz: 'wenn' }],
    ['Aktion mit fremdem Feld', aktionSchema, { tun: 'zeigen', ding: k('di', 1), kraft: [1, 0] }],
    ['Aktion ohne tun', aktionSchema, { ding: k('di', 1) }],
    ['Laune mit charakter statt launenRegler (16 i)', regelLauneSchema, { ...regelLaune, haeufigkeit: { basis: 1, charakter: 'neugier' } }],
    ['Fassung ohne Zeit nach ISO', projektSchema, { ...projekt, fassungen: [{ id: 'x', geraet: 'mac', zeit: 'gestern', sicherung: 'x' }] }],
    ['Quelle einer anderen Art', projektSchema, { ...projekt, quellen: [{ ...projekt.quellen![0]!, art: 'svg' }] }],
    ['Klang ohne Stimme', klangSchema, { ...klang, stimmen: 0 }],
    ['Lauf-Datei Version 2', laufDateiSchema, { ...laufDatei, version: 2 }],
    ['Takt negativ', laufDateiSchema, { ...laufDatei, takte: -1 }],
    ['Daten einer Art mit null', artDatenSchema, { a: null }],
    ['Daten einer Art mit Liste aus Objekten', artDatenSchema, { a: [{ b: 1 }] }],
    ['Daten einer Art mit gemischter Liste', artDatenSchema, { a: [1, 'x'] }],
    ['Zahl unendlich', federSchema, { dauer: Number.POSITIVE_INFINITY, federung: 0 }],
    ['Zahl NaN', punktSchema, [Number.NaN, 0]],
    ['Hülle mit zwei Formen', huelleSchema, { kreis: { mitte: [0, 0], r: 1 }, kapsel: { a: [0, 0], b: [1, 0], r: 1 } }],
    ['Vieleck mit 2 Punkten', huelleSchema, { vieleck: { punkte: [[0, 0], [1, 0]], rundung: 0 } }],
    [
      'Vieleck mit 9 Punkten (Box2D rechnet die Hülle nur bis 8)',
      huelleSchema,
      { vieleck: { punkte: Array.from({ length: 9 }, (_, i) => [i, (i * i) % 7]), rundung: 0 } },
    ],
    ['Kette mit einem Punkt', huelleSchema, { kette: { punkte: [[0, 0]], schleife: false } }],
    ['Schleife mit 2 Punkten', huelleSchema, { kette: { punkte: [[0, 0], [1, 0]], schleife: true } }],
    ['Effekt wirkt an einem Knochen', effektSchema, { ...effekt, wo: [k('kn', 1)] }],
    ['Übergang von einer Schicht', uebergangSchema, { ...uebergang, von: k('sch', 1) }],
    ['Welt ohne Rad', weltSchema, (({ rad: _r, ...rest }) => rest)(welt)],
    ['Chip an einem Übergang', physikChipSchema, { ...physikChip, an: k('ue', 1) }],
  ];
  it.each(faelle)('%s', (_name, schema, wert) => {
    expect(schema.safeParse(wert).success).toBe(false);
  });

  it('Kennungen: Vorsilben, Längen und Zeichen', () => {
    const s = kennungSchema('we');
    expect(s.safeParse('we_0123456789').success).toBe(true);
    expect(s.safeParse('welt_0123456789').success).toBe(false);
    expect(s.safeParse('we_0123456789 ').success).toBe(false);
    expect(s.safeParse(17).success).toBe(false);
    expect(vorsilbeSchema.safeParse('an').success).toBe(true);
    expect(vorsilbeSchema.safeParse('xx').success).toBe(false);
  });
});

describe('Datei, Datensatz, Diff', () => {
  it('Schlüssel einer Tabelle muss die Kennung sein', () => {
    const d = dateiAus([teil]);
    const falsch = { ...d, datensaetze: { teil: { [k('teil', 9)]: teil } } };
    const r = dateiSchema.safeParse(falsch);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['datensaetze', 'teil', k('teil', 9), 'id']);
  });

  it('ein Datensatz in der Tabelle eines anderen Typs, ein unbekannter Typ, ein falscher Kopf', () => {
    const d = dateiAus([teil]);
    expect(dateiSchema.safeParse({ ...d, datensaetze: { fig: { [teil.id]: teil } } }).success).toBe(false);
    expect(dateiSchema.safeParse({ ...d, datensaetze: { an: {} } }).success).toBe(false);
    expect(dateiSchema.safeParse({ ...d, format: 'studio-lauf' }).success).toBe(false);
    expect(dateiSchema.safeParse({ ...d, art: 'welt' }).success).toBe(false);
    expect(dateiSchema.safeParse({ ...d, versionen: { ...d.versionen, bloecke: { kern: 1 } } }).success).toBe(false);
    expect(dateiSchema.safeParse({ ...d, dazu: 1 }).success).toBe(false);
  });

  it('Datensatz nach Vorsilbe: Fehler zeigen auf das Feld; Anker sind keine Datensätze', () => {
    const r = datensatzSchema.safeParse({ ...teil, farbe: 'rot' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((f) => f.path.join('.') === 'farbe')).toBe(true);
    expect(datensatzSchema.safeParse({ id: k('an', 1) }).success).toBe(false);
    expect(datensatzSchema.safeParse({ id: 'nichts' }).success).toBe(false);
    expect(datensatzSchema.safeParse(null).success).toBe(false);
    expect(datensatzTypVon(k('an', 1))).toBeNull();
    expect(datensatzTypVon(k('welt', 1))).toBe('welt');
  });

  it('Diff: ein geändertes Paar trägt dieselbe Kennung', () => {
    expect(diffSchema.safeParse({ neu: [], weg: [], geaendert: [[regler, { ...regler, id: k('rg', 99) }]] }).success).toBe(false);
    expect(diffSchema.safeParse({ neu: [{ ...teil, art: 'kreis' }], weg: [], geaendert: [] }).success).toBe(false);
  });

  it('Datensatztypen in der Reihenfolge von DatensatzTabelle (3.2)', () => {
    expect(DATENSATZ_TYPEN).toEqual([
      'prj', 'vl', 'kl', 'sf', 'fig', 'teil', 'gr', 'rg', 'bd', 'sl', 'we', 'kn', 'af', 'km', 'sch', 'po', 'ue', 'zy',
      'ch', 'vb', 'ef', 'kc', 'welt', 'sz', 'di', 'bs', 'dr', 're', 'au',
    ]);
  });
});

// ---------- feste Reihenfolge (3.5 Nr. 1) ----------

describe('feste Reihenfolge', () => {
  it('Felder eines Datensatzes in der Reihenfolge des Typs, wie auch immer sie kamen', () => {
    // die Beispiele sind in fester Reihenfolge geschrieben (freie Tabellen sortiert)
    for (const b of alleBeispiele()) {
      const geordnet = datensatzOrdnen(umgedreht(b) as Datensatz);
      expect(JSON.stringify(geordnet), b.id).toBe(JSON.stringify(b));
      expect(JSON.stringify(datensatzOrdnen(b))).toBe(JSON.stringify(b));
    }
    expect(Object.keys(datensatzOrdnen(umgedreht(teil) as Teil))).toEqual([
      'id', 'figur', 'name', 'art', 'farbe', 'ebene', 'gruppe', 'anker', 'form', 'wieGezeichnet', 'klemme', 'hinter', 'partner', 'rolle',
      'seite', 'vorlageName', 'herkunft',
    ]);
  });

  it('Regeln: erst die Felder der Basis, dann satz und die eigenen', () => {
    expect(Object.keys(datensatzOrdnen(umgedreht(regelSolange) as Regel))).toEqual([
      'id', 'szene', 'geltung', 'band', 'ordnung', 'aktiv', 'herkunft', 'satz', 'wenn', 'halte', 'mindestens',
    ]);
  });

  it('freie Tabellen nach Codepunkten: Kanäle, Daten der Arten, auch verschachtelt', () => {
    const b: Baustein = { ...baustein, regler: { z: 1, a: 2, B: k('rg', 1) }, daten: { zz: { b: 1, a: 2 }, aa: [3, 1] } };
    const g = datensatzOrdnen(umgedreht(b) as Baustein);
    expect(Object.keys(g.regler)).toEqual(['B', 'a', 'z']);
    expect(Object.keys(g.daten)).toEqual(['aa', 'zz']);
    expect(Object.keys(g.daten['zz'] as object)).toEqual(['a', 'b']);
    expect(g.daten['aa']).toEqual([3, 1]);
  });

  it('Vereinigungen nehmen die passende Möglichkeit: Hülle, Aktion, Ausloeser', () => {
    expect(Object.keys((ordnen(huelleSchema, { kapsel: { r: 1, b: [1, 0], a: [0, 0] } }) as { kapsel: object }).kapsel)).toEqual(['a', 'b', 'r']);
    expect(Object.keys(ordnen(aktionSchema, { kraft: [1, 0], ding: k('di', 1), tun: 'stoss' }) as object)).toEqual(['tun', 'ding', 'kraft']);
  });

  it('eine Datei: Kopf, dann Typen in Tabellenreihenfolge, darin nach Kennung; ändert die Eingabe nicht', () => {
    const teil2: Teil = { ...teil, id: k('teil', 2) };
    const d = dateiAus([aufgabe, teil2, regler, teil, projekt]);
    const vorher = JSON.stringify(d);
    const g = dateiOrdnen(umgedreht(d) as Datei);
    expect(JSON.stringify(d)).toBe(vorher);
    expect(Object.keys(g)).toEqual(['format', 'art', 'versionen', 'datensaetze']);
    expect(Object.keys(g.datensaetze)).toEqual(['prj', 'teil', 'rg', 'au']);
    expect(Object.keys(g.datensaetze.teil!)).toEqual([k('teil', 1), k('teil', 2)]);
    expect(Object.keys(g.versionen.bloecke)).toEqual(['kern', 'knochen', 'posen', 'physik', 'bild', 'logik', 'welt', 'ton']);
    // zweimal geordnet gibt dieselben Bytes
    expect(JSON.stringify(dateiOrdnen(g))).toBe(JSON.stringify(g));
  });

  it('Zeilen und Listen behalten ihre Reihenfolge; Felder ohne Wert fallen weg', () => {
    expect(ordnen(formSchema, dreieck)).toEqual(dreieck);
    expect(ordnen(teilSchema, { ...linie, gruppe: undefined })).toStrictEqual(linie);
  });

  it('Codepunkte statt UTF-16: ein Zeichen außerhalb der BMP steht hinter U+FFFF', () => {
    expect(nachCodepunkten('￿', '😀')).toBe(-1);
    expect('😀' < '￿').toBe(true);
    expect(nachCodepunkten('a', 'ab')).toBe(-1);
    expect(nachCodepunkten('B', 'a')).toBe(-1);
    expect(nachCodepunkten('x😀', 'x😀')).toBe(0);
    expect(['b', 'a', '😀', '￿', 'Z'].sort(nachCodepunkten)).toEqual(['Z', 'a', 'b', '￿', '😀']);
  });
});

// ---------- Bruchindizes (3.3) ----------

describe('Bruchindizes', () => {
  it('erzeugt gültige, aufsteigende Indizes', () => {
    expect(ordnungZwischen(null, null)).toBe('a0');
    const fuenf = ordnungenZwischen(null, null, 5);
    expect(fuenf).toEqual([...fuenf].sort());
    expect(new Set(fuenf).size).toBe(5);
    const mitte = ordnungZwischen('a0', 'a1');
    expect(mitte > 'a0' && mitte < 'a1').toBe(true);
    for (const o of [...fuenf, mitte, ordnungZwischen(null, 'a0'), ordnungZwischen('a1', null)]) expect(istOrdnung(o)).toBe(true);
  });

  it('Eigenschaft: Einfügen an beliebiger Stelle hält die Reihenfolge und gibt gültige Indizes', () => {
    fc.assert(
      fc.property(fc.array(fc.nat(), { maxLength: 60 }), (stellen) => {
        const liste: string[] = [];
        for (const s of stellen) {
          const i = s % (liste.length + 1);
          liste.splice(i, 0, ordnungZwischen(liste[i - 1] ?? null, liste[i] ?? null));
        }
        return liste.every((o, i) => istOrdnung(o) && (i === 0 || liste[i - 1]! < o));
      }),
    );
  });

  it('ungültige Bruchindizes', () => {
    for (const o of ['', 'a', 'a00', 'a10', '0a', 'b1', 'a0 ', 'a-', 'ä0', 'A00000000000000000000000000']) expect(istOrdnung(o), o).toBe(false);
    for (const o of ['a0', 'a1', 'Zz', 'b10', 'a0V', 'a0V1']) expect(istOrdnung(o), o).toBe(true);
  });
});

// ---------- Register der Arten ----------

describe('Register der Arten', () => {
  it('die fünf Effekte von M1: eingetragen, ohne Daten, an Ozzys Zeichnung immer wirksam', () => {
    expect(EFFEKTE.map((a) => a.art)).toEqual(['verschmelzen', 'dicke', 'kanten', 'verdecken', 'weissNachgeben']);
    for (const a of EFFEKTE) {
      expect(artVon('effekt', a.art)).toBe(a);
      expect(a.version).toBe(1);
      expect(a.migrationen).toEqual([]);
      expect(aufGezeichnetVon(a)).toBe('zeichnung');
      expect(a.schema.safeParse({}).success).toBe(true);
      expect(a.schema.safeParse({ staerke: 1 }).success).toBe(false);
    }
    expect(artenVon('effekt')).toHaveLength(5);
    expect(artenVon('chip')).toHaveLength(0);
    expect(artVon('chip', 'dicke')).toBeUndefined();
    expect(artVersionen()['effekt:weissNachgeben']).toBe(1);
  });

  it('eine neue Art: eigene Datei, Schema und eine Zeile; Standard „nurFlorian“; Migrationen lückenlos', () => {
    const probe: ArtSchema = {
      art: 'probeArt', familie: 'baustein', version: 2, schema: z.strictObject({ tempo: z.number() }),
      migrationen: [{ block: 'art:baustein:probeArt', von: 1, nach: 2, schritt: (roh) => roh, pruefdatei: 'pruefdaten/probe.json' }],
    };
    artEintragen(probe);
    artEintragen(probe);
    expect(artVon('baustein', 'probeArt')).toBe(probe);
    expect(aufGezeichnetVon(probe)).toBe('nurFlorian');
    expect(artSchluessel('baustein', 'probeArt')).toBe('baustein:probeArt');
    expect(artVersionen()['baustein:probeArt']).toBe(2);
    // derselbe Name in einer anderen Familie ist eine andere Art (Chip und Effekt „wasser“, M10)
    artEintragen({ ...probe, familie: 'chip', migrationen: [{ ...probe.migrationen[0]!, block: 'art:chip:probeArt' }] });
    expect(artVon('chip', 'probeArt')?.familie).toBe('chip');
  });

  it('lehnt doppelte Arten, falsche Namen, Versionen und Migrationen ab', () => {
    const basis: ArtSchema = { art: 'zweiteProbe', familie: 'zusatz', version: 1, schema: z.strictObject({}), migrationen: [] };
    expect(() => artEintragen({ ...EFFEKTE[0]! })).toThrow(RangeError);
    expect(() => artEintragen({ ...basis, art: 'Gross' })).toThrow(RangeError);
    expect(() => artEintragen({ ...basis, art: 'mit-strich' })).toThrow(RangeError);
    expect(() => artEintragen({ ...basis, familie: 'welt' as string as ArtSchema['familie'] })).toThrow(RangeError);
    expect(() => artEintragen({ ...basis, version: 0 })).toThrow(RangeError);
    expect(() => artEintragen({ ...basis, version: 2 })).toThrow(RangeError);
    const schritt = (roh: unknown): unknown => roh;
    // Block ohne Familie ('art:<art>'): schon der Typ lässt ihn nicht zu (ArtBlock), artEintragen lehnt ihn auch zur Laufzeit ab
    // @ts-expect-error 'art:zweiteProbe' ist kein ArtBlock
    expect(() => artEintragen({ ...basis, version: 2, migrationen: [{ block: 'art:zweiteProbe', von: 1, nach: 2, schritt, pruefdatei: 'x' }] })).toThrow(RangeError);
    expect(() =>
      artEintragen({ ...basis, version: 2, migrationen: [{ block: 'art:zusatz:zweiteProbe', von: 0, nach: 1, schritt, pruefdatei: 'x' }] }),
    ).toThrow(RangeError);
    expect(artVon('zusatz', 'zweiteProbe')).toBeUndefined();
  });
});

// ---------- Versionen (3.4) ----------

describe('Versionen', () => {
  it('Fassung 1 schreibt überall Version 1', () => {
    expect(BLOECKE).toEqual(['kern', 'knochen', 'posen', 'physik', 'bild', 'logik', 'welt', 'ton']);
    for (const b of BLOECKE) expect(BLOCK_VERSIONEN[b]).toBe(1);
    const v = aktuelleVersionen({ 'effekt:dicke': 1 });
    expect(versionenSchema.parse(v)).toEqual(v);
    expect(versionenSchema.safeParse({ ...v, arten: { 'effekt:dicke': 0 } }).success).toBe(false);
    expect(versionenSchema.safeParse({ ...v, arten: { 'effekt:dicke': 1.5 } }).success).toBe(false);
  });

  it('Arten heißen je Familie: <familie>:<art>, ein Name allein ist ein Typfehler und fällt durch das Schema', () => {
    const v = aktuelleVersionen(artVersionen());
    expect(Object.keys(v.arten).every((s) => istArtSchluessel(s))).toBe(true);
    for (const s of ['verschmelzen', 'art:effekt:dicke', 'welt:dicke', 'effekt:', 'effekt:Dicke', 'effekt:mit-strich', 'Effekt:dicke'])
      expect(versionenSchema.safeParse({ ...v, arten: { [s]: 1 } }).success, s).toBe(false);
    for (const s of ['effekt:dicke', 'chip:wasser', 'baustein:vierbeiner', 'zusatz:huepfer'])
      expect(versionenSchema.safeParse({ ...v, arten: { [s]: 1 } }).success, s).toBe(true);
    // die Schreibweise des Bauplans ohne Familie ('art:vierbeiner', 3.4) fängt schon tsc
    // @ts-expect-error eine Art ohne Familie
    const ohneFamilie: Versionen['arten'] = { verschmelzen: 1 };
    // @ts-expect-error ein Block ohne Familie
    const blockOhneFamilie: ArtBlock = 'art:vierbeiner';
    expect([ohneFamilie, blockOhneFamilie]).toHaveLength(2);
    expect(artBlock('chip:wasser')).toBe('art:chip:wasser');
  });

  it('Abgleich: gleich, älter (migrieren), neuer und unbekannt (nur lesen)', () => {
    const aktuell: Versionen = { bloecke: { ...BLOCK_VERSIONEN, posen: 3 }, arten: { 'effekt:dicke': 2, 'baustein:vierbeiner': 1 } };
    expect(versionenAbgleichen(aktuell, aktuell)).toEqual({ neuer: [], unbekannt: [], aelter: [] });
    const datei: Versionen = { bloecke: { ...BLOCK_VERSIONEN, posen: 1, ton: 2 }, arten: { 'effekt:dicke': 1, 'chip:wasser': 1 } };
    const a = versionenAbgleichen(datei, aktuell);
    expect(a.aelter).toEqual([
      { block: 'posen', von: 1, nach: 3 },
      { block: 'art:effekt:dicke', von: 1, nach: 2 },
    ]);
    expect(a.neuer).toEqual([{ block: 'ton', datei: 2, aktuell: 1 }]);
    expect(a.unbekannt).toEqual(['art:chip:wasser']);
    expect(nurLesenNach(a)).toBe(true);
    expect(nurLesenNach(versionenAbgleichen({ ...datei, bloecke: { ...datei.bloecke, ton: 1 }, arten: {} }, aktuell))).toBe(false);
  });
});
