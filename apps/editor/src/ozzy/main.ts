/**
 * Ozzy (16.11.2026): der Editor für Florians Formen, aus einem Guss. Plan: `docs/plans/2026-11-16-ozzy.md`, Stand und nächste
 * Schritte: `docs/look/ozzy/UEBERGABE.md`. Seite: `ozzy.html`.
 *
 * Stand 0 (dieser Bau): Blatt mit „draw something“ und Leiste (P der Linien-Studie, Freihand, Ellipse, Würfel, Mülleimer); ↩ bläst
 * mit dem Ablauf der Aufblas-Studie auf (Seifenhaut, Kuppel von der Mitte, Hals, Abriss, Schnalz), die Kamera fährt dabei in die
 * Ecke. An den drei abgewandten Wänden stehen die Linien der Ansichten (keine Schatten), in der Mitte die Blase. Die Kamera behält
 * die Größe der Form bei jedem Wechsel (G4) und endet beim Einrasten genau parallel (G5). Tab: Vier Ansichten in Flucht (G4), die
 * Felder zeigen nur Linien, das vierte nur die Blase; Haarlinien mit einem Tropfen an der Kreuzung, der die Felder einstellt.
 * Phase 3 (16.11.): Mit ↩ legt Ozzy die Form im Werk an (`neuAusUmriss`: die Silhouette rund aufgeblasen, sie ist die Linie der
 * Mitte; die Form ist, was die Rechnung von Sitzung 4 aus ihr macht). Bis zum Abriss zeigt die Seifenhaut die Blase der Studie, dann
 * die Haut des Werks: Ihre Rechenpunkte liegen zuerst auf der Blase und schnalzen mit deren Feder in die Form. Wände, Felder und die
 * eingerastete Ansicht zeigen dann die Linie und den Umriss des Werks; Punkte der Seite zieht das Werk (`zugStarten` …). An der
 * Rechnung ändert Ozzy nichts (Florian, 16.11.).
 *
 * Zwei Leinwände übereinander: unten die Haut (three.js, `../anfang/haut.ts`), oben Linien, Punkte, Zeiger und Teiler (flüssige
 * Anzeige der Linien-Studie). Welt: CSS-Pixel des Blatts, y nach oben, Mitte des Fensters im Ursprung.
 */

// muss zuerst geladen werden: die Schalter des Werks in der Adresse
import './adresse';
import { MAUL_WINKEL_MAX, eckenAuto, istEcke } from '@ee/shape/dicht';
import { Color, Matrix4, Vector2, Vector3, Vector4, WebGLRenderer } from 'three';
import { glatt, type Masse, type Moment, moment } from '../anfang/aufblasen';
import { FLACH, Koerper, netzAusUmriss } from '../anfang/form';
import { FASSUNGEN, type Fassung, Haut, type HautWerte } from '../anfang/haut';
import { GRUNDWERTE as BLASE_GRUNDWERTE, REGLER as BLASE_REGLER, type Werte as BlasenWerte } from '../anfang/regler';
import { FluessigeAnzeige, type Szene, ZEIGER_PUNKTE } from '../linien/fluessig';
import { REGLER as LINIEN_REGLER } from '../linien/regler';
import { GRUNDWERTE as LINIEN_GRUNDWERTE, type Ansicht as LinienAnsicht, Verhalten, type Werte as LinienWerte } from '../linien/verhalten';
import { auskunft, packen, pruefen } from '../form/ablage';
import * as werk from '../form/werk';
import { WerkHaut, mitteLinie, mittePfad } from './werkHaut';
import { type Flaeche, WerkBlatt } from './werkBlatt';
import { type Anker, Blatt, FREIHAND_GRUNDWERTE, type FreihandWerte, type Strich, type Werkzeug, aufzugPfad, strichBeginnen, strichPfad } from './blatt';
import { Kamera, type KameraLage, perspektiveBei, richtung, winkelZu } from './kamera';
import { Kapseln } from './kapseln';
import { Leiste } from './leiste';
import { type Bereich, type ReglerZeile, feinreglerBauen, werteLesen } from './regler';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
// ?bild=1: ohne Bedienung (Vergleichsbilder); ?film=1: ohne Bedienung, mit Zeiger; ?info=1: Takt
if (params.get('bild') === '1' || params.get('film') === '1') document.body.classList.add('bild');
const mitZeigerImBild = params.get('film') === '1';
const mitInfo = params.get('info') === '1';
if (mitInfo) document.body.classList.add('info');

// ---------- Werte (Feinregler) ----------

interface BuehnenWerte {
  /** Durchmesser der Form (größte halbe Ausdehnung × 2) als Anteil der kürzeren Bildseite im Raum und eingerastet */
  groesse: number;
  /** so nah an einer Achse rastet das Drehen ein (Grad) */
  einrasten: number;
  /** Dauer der Fahrt in eine Ansicht (s) */
  fahrt: number;
  /** Abstand der Wände hinter der Form (× größte halbe Ausdehnung) */
  waende: number;
  /** Stärke der Linien an den Wänden */
  wandLinien: number;
  /** Vier Ansichten: wie weit die Ansichten ihre Felder füllen; Rand (px) */
  vierFuellung: number;
  vierRand: number;
  /** so weit darf der Maßstab vom Ziel abweichen, bevor sich das Bild der Form anpasst (Anteil) */
  band: number;
}

const BUEHNE_GRUND: BuehnenWerte = { groesse: 0.3, einrasten: 9, fahrt: 0.6, waende: 2.2, wandLinien: 1, vierFuellung: 0.82, vierRand: 18, band: 0.3 };
const BUEHNE_REGLER: ReglerZeile<keyof BuehnenWerte>[] = [
  { gruppe: 'Raum', k: 'groesse', name: 'Größe der Form im Bild', min: 0.12, max: 0.8, schritt: 0.01 },
  { gruppe: 'Raum', k: 'waende', name: 'Wände: Abstand (× Form)', min: 0.6, max: 5, schritt: 0.05 },
  { gruppe: 'Raum', k: 'wandLinien', name: 'Wände: Linien', min: 0, max: 2, schritt: 0.05 },
  { gruppe: 'Ansichten', k: 'einrasten', name: 'rastet ein unter (°)', min: 2, max: 25, schritt: 0.5 },
  { gruppe: 'Ansichten', k: 'fahrt', name: 'Fahrt in eine Ansicht (s)', min: 0.15, max: 2, schritt: 0.01 },
  { gruppe: 'Ansichten', k: 'band', name: 'Größe passt sich an ab (Anteil)', min: 0.05, max: 1, schritt: 0.01 },
  { gruppe: 'Vier Ansichten', k: 'vierFuellung', name: 'Ansichten füllen ihr Feld', min: 0.4, max: 1, schritt: 0.01 },
  { gruppe: 'Vier Ansichten', k: 'vierRand', name: 'Rand (px)', min: 0, max: 60, schritt: 1 },
];
const FREIHAND_REGLER: ReglerZeile<keyof FreihandWerte>[] = [
  { gruppe: 'Freihand', k: 'glaettung', name: 'Glättung', min: 0, max: 1, schritt: 0.05 },
  { gruppe: 'Freihand', k: 'treue', name: 'Treue (px)', min: 0.5, max: 10, schritt: 0.5 },
  { gruppe: 'Freihand', k: 'faden', name: 'Faden statt Nachlauf', min: 0, max: 1, schritt: 1 },
];
/** In Ozzy schaut die Kamera schräger in die Ecke als in der Studie, damit die Ansichten an den Wänden neben der Blase liegen */
const BLASE_GRUND: BlasenWerte = { ...BLASE_GRUNDWERTE, gier: 40, neigung: 24, fov: 36, schatten: 0 };

const linienWerte = werteLesen<LinienWerte>('ozzy-linien-1', LINIEN_GRUNDWERTE);
const freihandWerte = werteLesen<FreihandWerte>('ozzy-freihand-1', FREIHAND_GRUNDWERTE);
const werte = werteLesen<BlasenWerte>('ozzy-blase-1', BLASE_GRUND);
const bw = werteLesen<BuehnenWerte>('ozzy-buehne-1', BUEHNE_GRUND);

// ---------- Teile ----------

const buehne = $<HTMLDivElement>('buehne');
const leinwandHaut = $<HTMLCanvasElement>('haut');
const leinwandLinien = $<HTMLCanvasElement>('linien');
const gruss = $<HTMLDivElement>('gruss');
const hinweis = $<HTMLDivElement>('hinweis');
const infoAnzeige = $<HTMLSpanElement>('info');

const renderer = new WebGLRenderer({ canvas: leinwandHaut, antialias: false, alpha: false, powerPreference: 'high-performance' });
const haut = new Haut(renderer);
const anzeige = new FluessigeAnzeige(leinwandLinien);
const blatt = new Blatt(linienWerte, freihandWerte);
const kam = new Kamera();
const K = new Kapseln();
const FOV0 = 26;

type Zustand = 'blatt' | 'auf' | 'ruhe' | 'ab';
let zustand: Zustand = 'blatt';
/** Zeit seit ↩ (s); im Film von außen gesetzt */
let T = 0;
let festeZeit: number | null = null;
let fassung: Fassung = Number(params.get('fassung') ?? 0) as Fassung;
let W = 1;
let H = 1;
let D = 1;
let koerper: Koerper | null = null;
/** die Silhouette, aus der `koerper` gebaut ist, und ihre Kennzahl */
let silhouette: Anker[] | null = null;
let netzStand = -1;
let netzZeit = 0;
/** Einblenden der Haut nach dem Schließen (0..1) */
let film = 0;
/** Uhr des Materials (s) */
let uhr = 0;
/** Drehung von Hand (zur Lage am Ende des Aufblasens), Zoom von Hand und (S12) Schwenk von Hand: Versatz des Bilds in Bildpunkten */
const nutzer = { gier: 0, neigung: 0, zoom: 1, schwenkX: 0, schwenkY: 0 };

/** Ansicht: Raum oder eine Achse; `flach` 0 = Raum, 1 = genau parallel auf der Achse */
type Ansicht = 'raum' | 'seite' | 'front' | 'top';
let ansicht: Ansicht = 'raum';
/** eingerastet auf der Gegenseite (Seite von rechts, Front von hinten, Top von unten): S4, das Wenden */
let gewendet = false;
/** Schwung nach dem Loslassen beim Drehen (rad/s): dreht weiter und klingt ab; das Ziel wird vorausberechnet (S4) */
let schwung: { vg: number; vn: number } | null = null;
/** so lange (s) klingt der Schwung ab; so weit voraus (Zeitkonstante) wird das Ziel gerechnet */
const SCHWUNG_TAU = 0.24;
/**
 * Wenden (S4b, Florian 16.11.): ⇧ + Ziehen in einer eingerasteten Ansicht dreht das Blatt in jede Richtung (die Kamera bleibt parallel,
 * die Linien bleiben zu sehen); beim Loslassen gleitet es zurück oder, über die Hälfte gedreht, auf die Rückseite. Die Rückseite kommt
 * wie in der Blaupause (Blatt 3, „Kante“): Beim Drehen wandert eine gerade harte Kante durchs Bild, dahinter tauschen Papier und Tinte
 * (Grund dunkel, Linien hell, die Haut spiegelt wie in der Nacht). Im Raum gilt dasselbe gegen seine Hausansicht (Florian, 16.11.
 * abends: von unten, von der anderen Seite, von hinten).
 */
let wenden: { x: number; y: number; g0: number; n0: number; a: Ansicht } | null = null;
/** die Linien der Ansicht bleiben zu sehen, solange gewendet wird und die Fahrt danach läuft */
let wendenSicht = false;
/**
 * Die Rückseite in diesem Bild als Fläche (bis zu vier konvexe Flächen sind möglich, je fünf Kanten; Gerätepunkte, y nach unten; Abstand
 * x · px + y · py + z, innen positiv): die harte Kante der Blaupause, eingerastet gegen die Vorderseite der Ansicht, im Raum gegen seine
 * Hausansicht, bei Fahrten dazwischen gedreht. Florian (16.11. abends): keine schwarzen Wände, die Kante im Raum war richtig; nur Front
 * und Rückseite der Front getauscht. null = nichts davon im Bild.
 */
type Hinten = { kanten: number[]; zahl: number };
let hintenJetzt: Hinten | null = null;
/** beim Einrasten schiebt sich das Blatt durch die Blase: Die Haut bleibt nur vor ihm (Welt: n · p ≥ w); null = ganz */
let schnittJetzt: [number, number, number, number] | null = null;
/** wie weit die Mitte der Form hinten liegt (0 … 1, für Proben); ob irgendwo im Bild Rückseite zu sehen ist */
let kanteMitte = 0;
let kanteSichtbar = false;
/** Grund der Rückseite: die Tinte (Papier und Tinte tauschen) */
const KANTE_FARBE = new Color('#1f1a17');
/** wie schnell die Kante beim Drehen durchs Bild wandert (wie in der Blaupause: 3,2, Bezug 1,5 × Halbmesser der Form) */
const KANTE_A = 3.2;
let letzterUmschaltKlick = { t: 0, x: 0, y: 0 };
/** die Blickrichtung der Vorderseite einer Ansicht (Seite schaut nach −z, Front nach +x, Top nach −y) */
// Front schaut seit dem 16.11. abends nach −x (Florian: „front und back tauschen“): von der Seite, von der der Raum in seine Ecke schaut;
// so sieht der Raum in seiner Hausansicht alle drei Projektionen von vorn
const VORN: Record<'seite' | 'front' | 'top', Vector3> = { seite: new Vector3(0, 0, -1), front: new Vector3(-1, 0, 0), top: new Vector3(0, -1, 0) };
let flach = 0;
/** Fahrt in eine Ansicht (Gier, Neigung, flach); `nurFlach`: nur die Parallele löst sich, die Drehung gehört der Hand (S4) */
let ansichtFahrt: { von: [number, number, number]; nach: [number, number, number]; t: number; nurFlach?: boolean; senke?: number; vonAnsicht?: Ansicht; heimVon?: Vector3 } | null = null;
let tasteGehalten: { taste: string; seit: number; vorher: Ansicht } | null = null;
/** Drehung und Neigung jeder Ansicht (Grad), als Ziel der ganzen Kamera */
const ANSICHT_WINKEL: Record<Ansicht, [number, number] | null> = { raum: null, seite: [0, 0], front: [90, 0], top: [0, 90] };

/**
 * S10, das Auffalten (Florian, 16.11. abends: „Die seiten müssen wirklich aufklappen und die projektionen dabei auf der fläche in position
 * sliden. Das muss alles in einer gleichmäßigen bewegung erfolgen“; die zweite Fassung: „ja standard“): Die Felder der Vier Ansichten sind
 * ein aufgeklapptes Kistennetz. Die Wand der Seite bleibt liegen, die der Front klappt um ihre Kante mit der Seite nach links, der Boden
 * um seine nach unten; die Kanten gleiten dabei zu den Teilern, und jede Zeichnung gleitet auf ihrer Wand an ihren Platz. Eine eigene
 * Kamera für die Zeichnungen fährt dabei vom Raum gerade auf die Seite (parallel, im Maßstab der Felder). Alles hängt an einer Zahl
 * (`glatt(vier)`); die Blase gleitet mit der Kamera des Raums ins Raumfeld. Zurück faltet es sich genauso.
 */
/** die Lage der Kamera des Raums in diesem Bild (ohne das Zusammenziehen ins vierte Feld) und wie tief ihre Szene reicht: Anfang der Fahrt */
let lageRaum: KameraLage | null = null;
let tiefeRaum = 1;
/** die Projektion der Kamera des Raums ohne das Zusammenziehen; die Kamera der Zeichnungen beim Auffalten */
const projRaum = new Matrix4();
const kamFalt = new Kamera();

/** Vier Ansichten (Tab): 0 = aus, 1 = an */
let vier = 0;
let vierZiel = 0;
let vierFahrt: { von: number; t: number } | null = null;
/** Lage des Teilers: Florians Abweichung von der Lage aus den Maßen der Form (Anteile) und die Feder dorthin */
const teiler = { bx: 0, by: 0, fx: 0.5, fy: 0.5, zug: false, ueber: 0 };

let drehen: { x: number; y: number; gier: number; neigung: number; vg: number; vn: number; t: number; lx: number; ly: number } | null = null;
/** Neigung von Hand (zur Neigung der Ansicht dazu): so weit, dass Top und Unten erreichbar sind (rad) */
const NEIGUNG_UNTEN = -2.03;
const NEIGUNG_OBEN = 1.25;
let zug: { x: number; y: number; start: Float32Array; gewicht: Float32Array; zFaktor: Float32Array; hinten: boolean; tiefe: number } | null = null;
/** Punkt der Silhouette, der gezogen wird; in welcher Ebene (z der Ebene, Feld der Seite oder Ebene der Ansicht) */
let punktZug: { i: number; ort: 'wand' | 'flach' | 'feld'; z: number } | null = null;
let punktUnterZeiger = -1;
let umbauZeit = 0;
const hauch = { pos: new Vector3(1e6, 1e6, 1e6), staerke: 0, ziel: 0 };
const wind = new Vector2();
let letzteDrehung = { gier: 0, neigung: 0 };
const zeiger = { x: -1e6, y: -1e6, da: false };
/** Maßstab: Ziel aus der Größe der Form und das, was gezeigt wird (passt sich nur in der Ruhe an) */
const massstab = { ziel: 1, jetzt: 1, seitRuhe: 0, nachfuehren: false };
const WEISS = new Color(1, 1, 1);
const stat = { fps: 0, bildMs: 0, netzMs: 0, punkte: 0, dreiecke: 0, werkMs: 0 };
/**
 * Messen (S1 im Plan „wie es weitergeht“): je Bild Rechenzeit und Abstand zum vorigen Bild; mit `pixel` dazu, wie stark sich das Bild
 * der Haut in einem Bereich gegen das vorige ändert (mittlere und 99-%-Änderung je Bildpunkt, 0 bis 255); mit `still` steht die Zeit
 * der Seifenhaut (ihr Fließen), dann ist jede Änderung ohne Bewegung ein Sprung. `netz` zählt die Netzwechsel des Werks.
 */
const mess = {
  an: false,
  pixel: false,
  still: false,
  bereich: null as { x: number; y: number; w: number; h: number } | null,
  vorher: null as Uint8Array | null,
  puffer: null as Uint8Array | null,
  netzWechsel: 0,
  letzte: 0,
  bilder: [] as { t: number; ms: number; abstand: number; diff: number; p99: number; netz: number; stufen: number; punkte: number; teile: number[] }[],
  /** Zeit je Teil des Bilds (ms): Rechnung des Werks, Haut der Anzeige, Linien (Netz und Verhalten), Seifenhaut zeichnen, Linien zeichnen */
  teile: [0, 0, 0, 0, 0, 0],
};

// ---------- Werk (Phase 3) ----------

/** Halbmesser, auf den die Silhouette im Werk kommt (Einheiten des Werks: so groß wie seine Startkugel) */
const WERK_HALBMESSER = 150;
const werkHaut = new WerkHaut();
/**
 * Die Form im Werk: aus welcher Silhouette (Stand des Blatts) und wie viele Schritte für ⌘Z das Werk danach schon hatte (davor liegt
 * seine Startkugel, dorthin geht ⌘Z in Ozzy nicht).
 */
let werkForm: { stand: number; zurueck: number; geladen?: string; ohneLinie?: boolean } | null = null;
/**
 * S9 (zur Wahl, Florian 16.11.: „Könnte ich auch ohne starten wie im editor bei der 4. session“): `?ohneLinie=1` löscht nach dem Aufblasen
 * die Linie der Mitte (ein Handgriff des Werks), sobald die Haut des Werks gezeigt wird; die Haut bleibt, wie sie ist, bis eine Linie kommt.
 */
let hautKopie: Float64Array | null = null;
/** S9 (Florian 16.11. abends: „ohne linie als standard und ein schalter im menü für mit linie“): im Menü gemerkt; `?ohneLinie=0|1` für Proben */
let mitLinie = ((): boolean => {
  const u = new URLSearchParams(location.search).get('ohneLinie');
  if (u === '0') return true;
  if (u === '1') return false;
  try {
    return localStorage.getItem('ozzy.mitLinie') === '1';
  } catch {
    return false;
  }
})();
/** Übergabe von der Blase: je Rechenpunkt des Werks drei Punkte der Blase und ihre Gewichte */
let uebergabe: { koerper: Koerper; haut: typeof werk.haut; idx: Int32Array; gew: Float32Array; lagen: Float64Array } | null = null;
/** zeigt die Seifenhaut die Haut des Werks; muss sie neu gerechnet werden (auch: in den Stufen der Ruhe); wann zuletzt geändert */
let werkGezeigt = false;
/** wann (T) und bei welchem Stand der Feder der Blase die Haut des Werks übernommen hat */
let uebergabeStart: { T: number; w0: number } | null = null;
let werkNeu = false;
let werkVoll = false;
let werkZuletzt = 0;

// ---------- Bearbeiten über das Werk (Phase 5.2) ----------

/**
 * Die Linien des Werks auf Wänden, Feldern und in der eingerasteten Ansicht, bedient wie in der Linien-Studie: ein `Verhalten` im
 * Raum-Modus, dessen Raum das Werk ist (`werkBlatt.ts`). Es bekommt die Flächen nur, wenn sie stehen (keine Fahrt, kein Wechsel);
 * dazwischen zeichnet Ozzy dieselben Linien schlicht.
 */
const werkBlatt = new WerkBlatt(
  () => ({ umriss: linienWerte.umriss, innen: linienWerte.innen, kanteMax: linienWerte.kanteMax, kanteMin: linienWerte.kanteMin }),
  () => [zeiger.x, zeiger.y],
  () => bearbeiten.alt,
  () => werkForm?.zurueck ?? Number.POSITIVE_INFINITY,
  () => {
    werkNeu = true;
    anstossen();
  },
);
const bearbeiten = new Verhalten({ punkte: [], linien: [] }, linienWerte);
bearbeiten.raum = werkBlatt;
bearbeiten.werk = werkBlatt;
const bearbeitenAnsicht: LinienAnsicht = { z: 1, ox: 0, oy: 0, dpr: 1, wachsen: false };
/** hat das Verhalten in diesem Bild die Flächen (sie stehen); wurde auf ihm gedrückt */
let bearbeitenAn = false;
let bearbeitenGedrueckt = false;
let bearbeitenStruktur = '';
let werkWarBeschaeftigt = false;
let pErlaubt = false;
/** Werkzeug im Raum (mit dem Werk): Auswahl, P (über das Verhalten), Freihand, Ellipse, Würfel */
let raumWerkzeug: Werkzeug = 'auswahl';
/** Freihand und Formen im Raum (Etappe 5.3): ein Strich oder ein Aufzug auf einer Fläche (Bildschirm, CSS-Pixel) */
let raumStrich: { fl: number; st: Strich } | null = null;
let raumAufzug: { fl: number; art: 'ellipse' | 'wuerfel'; von: { x: number; y: number }; bis: { x: number; y: number } } | null = null;
const strichWerkzeug = (): boolean => raumWerkzeug === 'frei' || raumWerkzeug === 'ellipse' || raumWerkzeug === 'wuerfel';
/** Pinsel „Ziehen“ an der Blase (Phase 6): Radius in Einheiten des Werks (wie der Einfluss O, [ und ] ändern ihn) */
let pinselRadius = 90;
/** der Punkt einer Linie, den der Pinsel gerade fassen würde (Kennung, Nummer, Spiegelbild, Welt) */
let pinselZiel: { id: number; i: number; m: boolean; welt: Vector3 } | null = null;
/** ein Zug des Pinsels: die Ebene des Blatts, in der gezogen wird */
let pinselZug: { F: Flaeche } | null = null;

/** Rechnet das Werk noch (Zug, Nachlauf, Hintergrund, wartender Griff, Maul)? */
const werkBeschaeftigt = (): boolean =>
  werk.zug !== null || werk.nachlauf !== null || werk.G.aufraeumen !== null || werk.vorrechnenUhr !== null || werk.G.gegriffen !== null || werk.maulLauf !== null;

// Was das Werk von der Anzeige braucht (im Prüffenster tut das `kurven.ts`; `allesZeigen` dort tut auch Arbeit am Werk, die hier
// genauso geschieht: ein gelöschtes Maul aufräumen, Ecken an Kanten, den Löser für den nächsten Griff vorbereiten)
Object.assign(werk.anzeige, {
  geometrieNeu: () => {
    mess.netzWechsel++;
    werk.teilungNeu();
    werkHaut.topologieNeu();
    werkNeu = true;
    anstossen();
  },
  reglerZeigen: () => {},
  allesZeigen: () => {
    if (werk.G.maul && werk.loopNr(werk.G.maul.id) < 0) {
      werk.poseVerlassen();
      werk.G.maul = null;
    }
    eckenAuto(werk.loops);
    werkNeu = true;
    werk.vorrechnenPlanen();
    anstossen();
  },
  skala: () => (massstab.jetzt * nutzer.zoom) / werkHaut.f,
  ausschnittGeaendert: () => {},
  statusZeigen: () => {},
  eingabenSperren: (an: boolean) => {
    buehne.style.pointerEvents = an ? 'none' : '';
  },
  hautZeigen: () => {
    werkNeu = true;
    anstossen();
  },
  baenderZeigen: () => anstossen(),
  blattZeichnen: () => anstossen(),
  glattInRuhe: () => {
    if (!werkGezeigt || werk.zug || werk.nachlauf || !werkHaut.feinerMoeglich() || performance.now() - werkHaut.geaendert < 200) return;
    werkVoll = true;
    werkNeu = true;
  },
  rendern: () => anstossen(),
} satisfies werk.Anzeige);

// ---------- Raum ----------

/**
 * Der Würfel um die Blase: sechs unsichtbare Wände, je Achse trägt die von der Kamera abgewandte die Linien ihrer Ansicht (höchstens
 * drei zugleich, beim Drehen weich auf die Gegenwand). Abstand der Wände: so weit, dass die Zeichnungen neben der Blase liegen.
 */
interface Raum {
  cx: number;
  cy: number;
  L: number;
  rx: number;
  ry: number;
  tiefe: number;
  R: number;
}
let raum: Raum | null = null;
let wandUnterZeiger = -1;
const wandSicht = [0, 0, 0, 0, 0, 0];

/** Maße der Form des Werks in der Welt (Mitte, halbe Ausdehnungen; die Tiefe von der Mittelebene), wenn das Werk eine hat */
function werkMasseWelt(): { cx: number; cy: number; rx: number; ry: number; tiefe: number } | null {
  if (!werkForm) return null;
  const P = werk.haut.pos;
  if (!P.length) return null;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let z = 0;
  for (let i = 0; i < P.length; i += 3) {
    x0 = Math.min(x0, P[i]!);
    x1 = Math.max(x1, P[i]!);
    y0 = Math.min(y0, P[i + 1]!);
    y1 = Math.max(y1, P[i + 1]!);
    z = Math.max(z, Math.abs(P[i + 2]!));
  }
  const f = werkHaut.f;
  return { cx: (x0 + x1) / 2 / f + werkHaut.mitte.x, cy: (y0 + y1) / 2 / f + werkHaut.mitte.y, rx: (x1 - x0) / 2 / f, ry: (y1 - y0) / 2 / f, tiefe: z / f };
}

/**
 * Der Raum um die Form: Mitte, Abstand der Wände, Maße. Hat das Werk die Form, nach ihr (Phase 5: eine geladene Form ist oft tiefer als
 * die Blase aus ihrer Seite), sonst nach der Blase. `band`: nur neu, wenn sich die Größe um mehr als diesen Anteil ändert oder die Mitte
 * um mehr als ihn wandert (nach einem Zug: die Wände sollen nicht bei jedem Handgriff rücken).
 */
function raumRechnen(band = 0): void {
  const w = werkMasseWelt();
  if (w) {
    const R = Math.max(w.rx, w.ry, w.tiefe, 1);
    if (band > 0 && raum && Math.abs(R / raum.R - 1) <= band && Math.hypot(w.cx - raum.cx, w.cy - raum.cy) <= band * raum.R) return;
    raum = { cx: w.cx, cy: w.cy, L: R * (1 + bw.waende), rx: w.rx, ry: w.ry, tiefe: w.tiefe, R };
    massstab.ziel = (bw.groesse * Math.min(W, H)) / (2 * R);
    return;
  }
  if (!koerper) {
    raum = null;
    return;
  }
  const F = koerper.flach;
  let rx = 0;
  let ry = 0;
  for (let i = 0; i < F.nb; i++) {
    rx = Math.max(rx, Math.abs(F.x[i]! - F.cx));
    ry = Math.max(ry, Math.abs(F.y[i]! - F.cy));
  }
  const tiefe = koerper.fuelle * F.qMax;
  const R = Math.max(rx, ry, tiefe, 1);
  raum = { cx: F.cx, cy: F.cy, L: R * (1 + bw.waende), rx, ry, tiefe, R };
  massstab.ziel = (bw.groesse * Math.min(W, H)) / (2 * R);
}

function masse(): Masse {
  const F = koerper!.flach;
  return { a: Math.sqrt(Math.abs(F.flaeche) / Math.PI), Zw: raum!.L };
}

/** Gewicht je Wand (0..5 = Achse · 2 + (Seite > 0)): die von der Kamera abgewandte Seite jeder Achse, weich beim Wechsel */
function wandGewichte(): number[] {
  const e = raum;
  if (!e) return [0, 0, 0, 0, 0, 0];
  const d = kam.aktiv.position.clone().sub(new Vector3(e.cx, e.cy, 0)).normalize();
  const g = (x: number): number => {
    const t = Math.min(1, Math.max(0, (x - 0.03) / 0.17));
    return t * t * (3 - 2 * t);
  };
  return [g(d.x), g(-d.x), g(d.y), g(-d.y), g(d.z), g(-d.z)];
}

/** wie viel vom Raum zu sehen ist: in einer flachen Ansicht nichts */
function raumSicht(): number {
  return (1 - flach) * (1 - flach);
}

// ---------- Größe ----------

function groesse(): void {
  const r = buehne.getBoundingClientRect();
  W = Math.max(1, r.width);
  H = Math.max(1, r.height);
  D = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(D);
  renderer.setSize(W, H, false);
  haut.groesse(W, H, D);
  anzeige.groesse(W * D, H * D);
  if (zustand === 'blatt') netzStand = -1;
  else raumRechnen();
  anstossen();
}

// ---------- Netz der Blase ----------

/** Proben der Silhouette (CSS-Pixel des Blatts), mit den Stellen der Anker */
function abtasten(A: Anker[], schritt: number): { x: number[]; y: number[]; anker: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  const anker: number[] = [];
  const bez = (a: number, b: number, c: number, d: number, t: number): number => {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  };
  for (let i = 0; i < A.length; i++) {
    const a = A[i]!;
    const b = A[(i + 1) % A.length]!;
    const p1 = [a.x + a.aus[0], a.y + a.aus[1]];
    const p2 = [b.x + b.ein[0], b.y + b.ein[1]];
    const grob = Math.hypot(p1[0]! - a.x, p1[1]! - a.y) + Math.hypot(p2[0]! - p1[0]!, p2[1]! - p1[1]!) + Math.hypot(b.x - p2[0]!, b.y - p2[1]!);
    const k = Math.max(2, Math.ceil(grob / schritt));
    anker.push(x.length);
    for (let j = 0; j < k; j++) {
      const t = j / k;
      x.push(bez(a.x, p1[0]!, p2[0]!, b.x, t));
      y.push(bez(a.y, p1[1]!, p2[1]!, b.y, t));
    }
  }
  return { x, y, anker };
}

function netzBauen(): void {
  netzStand = blatt.stand;
  silhouette = blatt.silhouette();
  if (!silhouette) {
    koerper = null;
    raum = null;
    haut.setzeKoerper(null);
    return;
  }
  const ab = abtasten(silhouette, 1);
  const flachNetz = netzAusUmriss({ x: ab.x.map((x) => x - W / 2), y: ab.y.map((y) => H / 2 - y), anker: ab.anker });
  koerper = new Koerper(flachNetz);
  koerper.fuelle = werte.fuelle;
  koerper.setzen(FLACH);
  koerper.dehnungRechnen();
  haut.setzeKoerper(koerper);
  haut.hochladen();
  raumRechnen();
  netzZeit = performance.now();
  Object.assign(stat, { netzMs: flachNetz.stat.ms, punkte: flachNetz.stat.punkte, dreiecke: flachNetz.stat.dreiecke });
}

/** Beim Laden einmal eine kleine Blase unsichtbar zeichnen: So stockt das erste Aufblasen nicht (Shader schon übersetzt) */
function aufwaermen(): void {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < 24; i++) {
    x.push(60 * Math.cos((2 * Math.PI * i) / 24));
    y.push(60 * Math.sin((2 * Math.PI * i) / 24));
  }
  const k = new Koerper(netzAusUmriss({ x, y, anker: [0, 6, 12, 18] }, { punkte: 300 }));
  k.setzen(FLACH);
  k.dehnungRechnen();
  haut.setzeKoerper(k);
  haut.hochladen();
  kam.stellen({ gier: 0, neigung: 0, ziel: new Vector3(), s: 1, p: 1, fov: FOV0 }, W, H, 2000);
  haut.aufwaermen(kam.persp);
  haut.setzeKoerper(null);
}

// ---------- Form im Werk ----------

/**
 * Die Form im Werk aus der Silhouette anlegen: in Einheiten des Werks (größte halbe Ausdehnung `WERK_HALBMESSER`, Mitte der Silhouette
 * im Ursprung), Anker und Griffe wie gezeichnet. Hat sich die Silhouette nicht geändert, bleibt die Form, mit allem, was an ihr
 * geändert wurde.
 */
function werkFormAnlegen(): void {
  if (!silhouette) return;
  if (werkForm && werkForm.stand === blatt.stand && (werkForm.geladen !== undefined || mitteLinie() || werkForm.ohneLinie)) return;
  const ab = abtasten(silhouette, 2);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < ab.x.length; i++) {
    const x = ab.x[i]! - W / 2;
    const y = H / 2 - ab.y[i]!;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const f = WERK_HALBMESSER / Math.max(1, (x1 - x0) / 2, (y1 - y0) / 2);
  werkHaut.f = f;
  werkHaut.mitte = { x: cx, y: cy };
  const anker = silhouette.map((a) => ({
    x: (a.x - W / 2 - cx) * f,
    y: (H / 2 - a.y - cy) * f,
    ein: [a.ein[0] * f, -a.ein[1] * f] as [number, number],
    aus: [a.aus[0] * f, -a.aus[1] * f] as [number, number],
  }));
  const t0 = performance.now();
  werkHaut.neueForm();
  const text = werk.neuAusUmriss(anker);
  werk.anzeige.allesZeigen();
  stat.werkMs = performance.now() - t0;
  werkForm = mitteLinie() ? { stand: blatt.stand, zurueck: werk.zurueck.length } : null;
  pinselNachForm();
  uebergabe = null;
  werkNeu = true;
  if (!werkForm) console.warn(`Ozzy: ${text}`);
}

/** halbe Ausdehnung einer geladenen Form auf dem Blatt, als Anteil der kürzeren Seite des Fensters */
const LADEN_GROESSE = 0.25;

/**
 * Eine gesicherte Form laden (Phase 5.1): Das Werk lädt sie wie das Prüffenster (`wesenLaden`, ein Schritt für ⌘Z dort). Ihre Linie
 * der Mitte kommt als Zeichnung aufs Blatt (ohne Linie der Mitte: eine Ellipse um ihre Seite), und die Form bläst auf wie eine
 * gezeichnete; nach dem Abriss zeigt die Seifenhaut die Haut des Werks. Das Werk legt dabei nichts neu an (`werkForm.geladen`):
 * Solange die Zeichnung nicht geändert wird, bleibt die geladene Form mit allen Linien, auch nach Luftablassen und Aufblasen.
 */
async function formLaden(name: string): Promise<string> {
  neu();
  werkHaut.neueForm();
  const text = await werk.wesenLaden(name);
  if (!text.startsWith('geladen')) return text;
  werk.anzeige.allesZeigen();
  const P = werk.haut.pos;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) {
    x0 = Math.min(x0, P[i]!);
    x1 = Math.max(x1, P[i]!);
    y0 = Math.min(y0, P[i + 1]!);
    y1 = Math.max(y1, P[i + 1]!);
  }
  const f = Math.max((x1 - x0) / 2, (y1 - y0) / 2, 1e-6) / (LADEN_GROESSE * Math.min(W, H));
  werkHaut.f = f;
  werkHaut.mitte = { x: -(x0 + x1) / 2 / f, y: -(y0 + y1) / 2 / f };
  const bx = (x: number): number => W / 2 + x / f + werkHaut.mitte.x;
  const by = (y: number): number => H / 2 - (y / f + werkHaut.mitte.y);
  const m = mitteLinie();
  let A: Anker[];
  let ecken: boolean[];
  if (m && m.l.punkte.length >= 2 && m.l.punkte.every((p) => p.ein && p.aus)) {
    A = m.l.punkte.map((p) => ({ x: bx(p.ref.x), y: by(p.ref.y), ein: [p.ein!.x / f, -p.ein!.y / f], aus: [p.aus!.x / f, -p.aus!.y / f] }));
    ecken = m.l.punkte.map((p) => istEcke(p));
  } else {
    const rx = (x1 - x0) / 2 / f;
    const ry = (y1 - y0) / 2 / f;
    const k = 0.5523;
    const cx = W / 2;
    const cy = H / 2;
    A = [
      { x: cx + rx, y: cy, ein: [0, k * ry], aus: [0, -k * ry] },
      { x: cx, y: cy - ry, ein: [k * rx, 0], aus: [-k * rx, 0] },
      { x: cx - rx, y: cy, ein: [0, -k * ry], aus: [0, k * ry] },
      { x: cx, y: cy + ry, ein: [-k * rx, 0], aus: [k * rx, 0] },
    ];
    ecken = [false, false, false, false];
  }
  blatt.silhouetteErsetzen(A, ecken);
  silhouette = blatt.silhouette();
  netzBauen();
  werkForm = { stand: blatt.stand, zurueck: werk.zurueck.length, geladen: name };
  pinselNachForm();
  uebergabe = null;
  werkNeu = true;
  aufblasen();
  return text;
}

/**
 * Übergabe von der Blase: für jeden Rechenpunkt des Werks seine Stelle auf der Blase, gefunden über das flache Netz der Silhouette
 * (das Dreieck unter dem Punkt, Vorder- oder Rückseite nach seinem z). Der Punkt geht dann mit der Blase, wie sie sich bewegt.
 */
function uebergabeAnlegen(k: Koerper, h: typeof werk.haut): NonNullable<typeof uebergabe> {
  const F = k.flach;
  const n = F.n;
  const T = F.tri;
  const idx = new Int32Array(3 * h.n);
  const gew = new Float32Array(3 * h.n);
  let z0 = 0;
  for (let i = 0; i < n; i++) z0 += k.pos[3 * i + 2]!;
  const vorn = z0 >= 0 ? 0 : n;
  const hinten = z0 >= 0 ? n : 0;
  const f = werkHaut.f;
  for (let q = 0; q < h.n; q++) {
    const x = h.pos[3 * q]! / f + werkHaut.mitte.x;
    const y = h.pos[3 * q + 1]! / f + werkHaut.mitte.y;
    let best = Infinity;
    let bt = 0;
    let b0 = 1;
    let b1 = 0;
    let b2 = 0;
    for (let t = 0; t < T.length; t += 3) {
      const a = T[t]!;
      const b = T[t + 1]!;
      const c = T[t + 2]!;
      const ax = F.x[a]!;
      const ay = F.y[a]!;
      const bx = F.x[b]!;
      const by = F.y[b]!;
      const cx = F.x[c]!;
      const cy = F.y[c]!;
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(d) < 1e-12) continue;
      const w0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
      const w1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
      const w2 = 1 - w0 - w1;
      const aus = Math.max(0, -w0) + Math.max(0, -w1) + Math.max(0, -w2);
      if (aus < best) {
        best = aus;
        bt = t;
        b0 = w0;
        b1 = w1;
        b2 = w2;
        if (aus === 0) break;
      }
    }
    b0 = Math.max(0, b0);
    b1 = Math.max(0, b1);
    b2 = Math.max(0, b2);
    const s = b0 + b1 + b2 || 1;
    const seite = h.pos[3 * q + 2]! >= 0 ? vorn : hinten;
    idx[3 * q] = seite + T[bt]!;
    idx[3 * q + 1] = seite + T[bt + 1]!;
    idx[3 * q + 2] = seite + T[bt + 2]!;
    gew[3 * q] = b0 / s;
    gew[3 * q + 1] = b1 / s;
    gew[3 * q + 2] = b2 / s;
  }
  return { koerper: k, haut: h, idx, gew, lagen: new Float64Array(3 * h.n) };
}

/** Lagen der Rechenpunkte des Werks zwischen der Blase, wie sie gerade ist (w = 0), und der Form des Werks (w = 1), in Einheiten des Werks */
function uebergabeLagen(w: number): Float64Array {
  const h = werk.haut;
  const k = koerper!;
  if (!uebergabe || uebergabe.koerper !== k || uebergabe.haut !== h) uebergabe = uebergabeAnlegen(k, h);
  const u = uebergabe;
  const P = h.pos;
  const f = werkHaut.f;
  const mx = werkHaut.mitte.x;
  const my = werkHaut.mitte.y;
  for (let q = 0; q < h.n; q++) {
    let bx = 0;
    let by = 0;
    let bz = 0;
    for (let j = 0; j < 3; j++) {
      const v = 3 * u.idx[3 * q + j]!;
      const g = u.gew[3 * q + j]!;
      bx += g * k.pos[v]!;
      by += g * k.pos[v + 1]!;
      bz += g * k.pos[v + 2]!;
    }
    bx = (bx - mx) * f;
    by = (by - my) * f;
    bz *= f;
    u.lagen[3 * q] = bx + (P[3 * q]! - bx) * w;
    u.lagen[3 * q + 1] = by + (P[3 * q + 1]! - by) * w;
    u.lagen[3 * q + 2] = bz + (P[3 * q + 2]! - bz) * w;
  }
  return u.lagen;
}

/**
 * Das Werk im Bild: sein Bildtakt (Züge, Nachlauf, was der Hintergrund bringt), dann seine Haut für die Seifenhaut. Ab dem Abriss zeigt
 * die Seifenhaut die Haut des Werks; bis die Blase in der Form ist, liegen ihre Rechenpunkte zwischen der Blase und der Form des Werks,
 * mit der Feder der Blase (`rund` von 1 nach 0, mit Überschwingen). Zurück: Ist noch etwas in Bewegung?
 */
function werkBild(dt: number, m: Moment | null): boolean {
  if (!werkForm) return false;
  const tw = performance.now();
  werk.bildRechnen();
  mess.teile[0] = performance.now() - tw;
  let aktiv = werkBeschaeftigt();
  // übergeben wird erst, wenn das Werk seine Form gerechnet hat (die Blase reißt früh ab, das Werk setzt die Haut dann noch)
  const bereit = !werkBeschaeftigt() && werk.ruheOffen === null;
  const zeigen = zustand !== 'blatt' && !!m && !!koerper && T >= m.riss && (werkGezeigt || bereit || T >= m.dauer);
  if (!zeigen || !m) {
    if (werkGezeigt) {
      haut.blaseErsetzen(null);
      werkGezeigt = false;
    }
    uebergabeStart = null;
    return aktiv;
  }
  const schnalz = zustand !== 'ruhe' && T < m.dauer;
  // die Feder der Blase (von rund zur Form, mit Überschwingen), gezählt ab dem Moment der Übergabe; ist die Blase dann schon fast in
  // ihrer Form, gleitet die Haut kurz hinüber
  let w = 1;
  if (schnalz) {
    const roh = 1 - m.lage.rund;
    if (!uebergabeStart) {
      uebergabeStart = { T, w0: roh };
      // Muster und Dehnung der Haut des Werks von der Blase (Vorder- und Rückseite), damit die Seifenhaut an der Übergabe nicht wechselt
      if (koerper && params.get('uebergabeMuster') !== '0') werkHaut.vonBlase(koerper.pos, koerper.blatt, koerper.dehnung, 2 * koerper.flach.n);
    }
    const { w0, T: Th } = uebergabeStart;
    w = w0 < 0.8 ? (roh - w0) / (1 - w0) : glatt(Math.min(1, Math.abs(T - Th) / 0.4));
  }
  const jetzt = performance.now();
  if (schnalz || werkNeu || werkVoll || !werkGezeigt || jetzt - werkZuletzt < 2500) {
    const voll = werkVoll;
    werkVoll = false;
    if (werkNeu || !werkGezeigt) werkZuletzt = jetzt;
    werkNeu = false;
    // in der Pose die Haut, wie sie zu sehen ist (die Knochen drehen sie; wie `hautZeigen` im Prüffenster)
    const th = performance.now();
    werk.alsAnzeige(() => werkHaut.rechnen(schnalz ? uebergabeLagen(w) : null, voll, dt, schnalz ? 0 : 1.6));
    mess.teile[1] = performance.now() - th;
    if (werkHaut.nurDehnung) haut.dehnungErneuern();
    else haut.blaseErsetzen(werkHaut.netz);
    werkGezeigt = true;
    // S9: ohne Linie an der Spiegelkante (zur Wahl): nach dem Aufblasen die Linie der Mitte löschen, einmal je Form
    if (!mitLinie && werkForm && !werkForm.ohneLinie && werkForm.geladen === undefined && !werk.zug) {
      const m = werk.loops.find((l) => l.art === 'mitte');
      if (m) {
        werk.G.auswahl = [{ l: m.id, i: -1 }];
        werk.loeschen();
        werk.G.auswahl = [];
        werk.anzeige.allesZeigen();
      }
      werkForm.ohneLinie = true;
      werkForm.zurueck = werk.zurueck.length;
    }
    aktiv = aktiv || schnalz || jetzt - werkZuletzt < 2500;
  }
  return aktiv;
}

/** Die Linie des Werks zurück aufs Blatt (beim Luftablassen, wenn sie im Raum geändert wurde): Die Zeichnung ist dann die Form */
function werkAufsBlatt(): void {
  if (!werkForm || werk.zurueck.length <= werkForm.zurueck) return;
  const m = mitteLinie();
  if (!m || !m.l.punkte.every((p) => p.ein && p.aus)) return;
  const f = werkHaut.f;
  const punkte = m.l.punkte.filter((p) => !p.vonSelbst);
  const anker: Anker[] = punkte.map((p) => ({
    x: p.ref.x / f + werkHaut.mitte.x + W / 2,
    y: H / 2 - (p.ref.y / f + werkHaut.mitte.y),
    ein: [p.ein!.x / f, -p.ein!.y / f],
    aus: [p.aus!.x / f, -p.aus!.y / f],
  }));
  blatt.silhouetteErsetzen(
    anker,
    punkte.map((p) => p.ecke ?? p.autoEcke ?? false),
  );
  silhouette = blatt.silhouette();
  werkForm = { stand: blatt.stand, zurueck: werk.zurueck.length };
}

// ---------- Ablauf ----------

function aufblasen(): void {
  if (!blatt.geschlossen) return;
  if (!koerper || netzStand !== blatt.stand) netzBauen();
  if (!koerper) return;
  koerper.versatz.fill(0);
  raumRechnen();
  werkFormAnlegen();
  // die Wände nach der Form des Werks
  raumRechnen();
  massstab.jetzt = massstab.ziel;
  const ms0 = masse();
  koerper.setzen(moment(99, ms0, werte).lage);
  koerper.bezugRuhe();
  koerper.setzen(moment(0, ms0, werte).lage);
  koerper.bezugJetzt();
  zustand = 'auf';
  T = 0;
  film = 1;
  leiste.lage(true);
  leiste.zeichnenErlaubt(false);
  anstossen();
}

function ablassen(): void {
  if (zustand === 'blatt') return;
  // die Werkzeuge des Raums aus; die Leiste zeigt wieder das des Blatts
  if (bearbeiten.stift || strichWerkzeug()) werkzeugImRaum('auswahl');
  leiste.setzen(blatt.werkzeug);
  zug = null;
  drehen = null;
  punktZug = null;
  vierZiel = 0;
  vier = 0;
  vierFahrt = null;
  zustand = 'ab';
  // wurde die Form im Raum geändert, wird ihre Linie die Zeichnung, und die Blase entsteht neu aus ihr
  werkAufsBlatt();
  if (netzStand !== blatt.stand) {
    const t = T;
    netzBauen();
    T = t;
  }
  if (koerper && raum) T = Math.min(T, moment(0, masse(), werte).dauer);
  anstossen();
}

function nochEinmal(): void {
  if (zustand === 'blatt') {
    aufblasen();
    return;
  }
  if (!koerper || !raum) return;
  koerper.versatz.fill(0);
  const ms0 = masse();
  koerper.setzen(moment(99, ms0, werte).lage);
  koerper.bezugRuhe();
  koerper.setzen(moment(0, ms0, werte).lage);
  koerper.bezugJetzt();
  nutzer.gier = 0;
  nutzer.neigung = 0;
  nutzer.schwenkX = 0;
  nutzer.schwenkY = 0;
  ansicht = 'raum';
  flach = 0;
  ansichtFahrt = null;
  vier = 0;
  vierZiel = 0;
  vierFahrt = null;
  zustand = 'auf';
  T = 0;
  anstossen();
}

/** zurück aufs leere Blatt (der Mülleimer im Raum); die Zeichnung bleibt für ⌘Z auf dem Blatt */
function neu(): void {
  if (bearbeiten.stift) bearbeiten.stiftSchalten(false);
  werkHaut.neueForm();
  zustand = 'blatt';
  T = 0;
  blatt.leeren();
  koerper = null;
  silhouette = null;
  raum = null;
  werkForm = null;
  uebergabe = null;
  werkGezeigt = false;
  haut.blaseErsetzen(null);
  haut.setzeKoerper(null);
  nutzer.gier = 0;
  nutzer.neigung = 0;
  nutzer.zoom = 1;
  nutzer.schwenkX = 0;
  nutzer.schwenkY = 0;
  ansicht = 'raum';
  flach = 0;
  ansichtFahrt = null;
  vier = 0;
  vierZiel = 0;
  vierFahrt = null;
  film = 0;
  leiste.lage(false);
  leiste.zeichnenErlaubt(true);
  anstossen();
}

// ---------- Kamera ----------

/**
 * Die Kamera für dieses Bild. Vom Blatt in den Raum: Dolly-Zoom, das Blatt am Anfang genau so, wie es gezeichnet wurde, am Ende die
 * Ecke. Der Maßstab ist am Ende die Größe der Form (G4); Drehen, Einrasten und Vier Ansichten ändern ihn nicht. Eingerastet ist die
 * Perspektive genau 0 (G5).
 */
function kameraSetzen(m: Moment | null): void {
  const e = raum;
  const f = m && e ? m.fahrt : 0;
  const sEnde = massstab.jetzt * nutzer.zoom;
  const s = 1 + (sEnde - 1) * f;
  const t0 = Math.tan((FOV0 * Math.PI) / 360);
  const t1 = Math.tan((werte.fov * Math.PI) / 360);
  const pIntro = t0 / t1 + (1 - t0 / t1) * f;
  const p = pIntro * perspektiveBei(flach);
  const gier = ((m?.gier ?? 0) * Math.PI) / 180 + nutzer.gier * f;
  const neigung = ((m?.neigung ?? 0) * Math.PI) / 180 + nutzer.neigung * f;
  const ziel = new Vector3((e?.cx ?? 0) * f, (e?.cy ?? 0) * f, 0);
  const tiefe = e ? 3 * e.L + e.R : 4000;
  const lage: KameraLage = { gier, neigung, ziel, s, p, fov: werte.fov };
  const c = kam.stellen(lage, W, H, tiefe);
  // S12: Schwenken (zwei Finger): ein Versatz des ganzen Bilds; in den Vier Ansichten gilt er nicht (er vergeht beim Auffalten)
  const sv = (1 - glatt(vier)) * f;
  if (sv > 1e-4 && (nutzer.schwenkX !== 0 || nutzer.schwenkY !== 0)) {
    c.projectionMatrix.premultiply(new Matrix4().makeTranslation((2 * nutzer.schwenkX * sv) / W, (-2 * nutzer.schwenkY * sv) / H, 0));
    c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
  }
  lageRaum = lage;
  tiefeRaum = tiefe;
  projRaum.copy(c.projectionMatrix);
  // Vier Ansichten: der Raum zieht sich ins vierte Feld zusammen (Projektion verkleinert und verschoben)
  const v = glatt(vier);
  if (v > 1e-4 && e) {
    // im vierten Feld füllt die Blase ihr Feld wie die Ansichten die ihren (ohne Wände)
    const R = felder().raum;
    const scZiel = (bw.vierFuellung * 0.8 * Math.min(R.w, R.h)) / (2 * e.R * Math.max(1e-6, sEnde));
    const sc = 1 + (scZiel - 1) * v;
    const ox = (((R.x + R.w / 2) / W) * 2 - 1) * v;
    const oy = (1 - ((R.y + R.h / 2) / H) * 2) * v;
    c.projectionMatrix.premultiply(new Matrix4().set(sc, 0, 0, ox, 0, sc, 0, oy, 0, 0, 1, 0, 0, 0, 0, 1));
    c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
  }
}

// ---------- Vier Ansichten ----------

type Feld = { x: number; y: number; w: number; h: number };
type FeldAchse = 'seite' | 'front' | 'top';

/**
 * Felder der Vier Ansichten (CSS-Pixel): Seite oben links, Front oben rechts, Top unten links, Raum unten rechts. In Flucht (G4): Die
 * Spalten sind so breit, wie die Form lang (x) und tief (z) ist, die Zeilen so hoch, wie sie hoch (y) und tief ist; der Teiler sitzt
 * damit an der Ecke ihres Quaders. Florians Zug am Tropfen verschiebt ihn (`teiler.bx`, `teiler.by`).
 */
function felder(): Record<FeldAchse | 'raum', Feld> & { tx: number; ty: number } {
  const rand = bw.vierRand;
  const oben = document.body.classList.contains('bild') ? rand : 64;
  const bwid = W - 2 * rand;
  const bhoch = H - oben - rand;
  const tx = rand + teiler.fx * bwid;
  const ty = oben + teiler.fy * bhoch;
  // S10 (Florian 16.11. abends: „ja anpassen“): die Lage der aufgeklappten Ecke (Projektionsmethode 1 mit der Seite als Hauptansicht und
  // der Front von rechts): Front oben links, Seite oben rechts, Top unter der Seite, der Raum unten links
  return {
    front: { x: rand, y: oben, w: tx - rand, h: ty - oben },
    seite: { x: tx, y: oben, w: W - rand - tx, h: ty - oben },
    raum: { x: rand, y: ty, w: tx - rand, h: H - rand - ty },
    top: { x: tx, y: ty, w: W - rand - tx, h: H - rand - ty },
    tx,
    ty,
  };
}

/** Lage des Teilers aus den Maßen der Form (Anteile), dazu Florians Abweichung */
function teilerZiel(): [number, number] {
  const e = raum;
  if (!e) return [0.5, 0.5];
  const X = 2 * e.rx;
  const Y = 2 * e.ry;
  const Z = 2 * e.tiefe;
  // links steht die Front (Tiefe Z), rechts die Seite (Länge X)
  const fx = Math.min(0.82, Math.max(0.18, Z / (X + Z) + teiler.bx));
  const fy = Math.min(0.82, Math.max(0.18, Y / (Y + Z) + teiler.by));
  return [fx, fy];
}

/** gemeinsamer Maßstab der drei flachen Felder: Jede Ansicht passt in ihr Feld */
function feldMassstab(F: ReturnType<typeof felder>): number {
  const e = raum!;
  const f = bw.vierFuellung;
  const X = 2 * e.rx;
  const Y = 2 * e.ry;
  const Z = 2 * Math.max(e.tiefe, 1);
  return f * Math.min(F.seite.w / X, F.seite.h / Y, F.front.w / Z, F.front.h / Y, F.top.w / X, F.top.h / Z);
}

/** Punkt der Welt in einem flachen Feld (Gerätepunkte): Seite (x, y), Front (z, y), Top (x, −z); Mitte des Felds = Mitte der Form */
function imFeld(n: FeldAchse, p: Vector3, F: ReturnType<typeof felder>, s: number): [number, number] {
  const e = raum!;
  const r = F[n];
  const mx = r.x + r.w / 2;
  const my = r.y + r.h / 2;
  const [u, v, uc, vc] = n === 'seite' ? [p.x, p.y, e.cx, e.cy] : n === 'front' ? [-p.z, p.y, 0, e.cy] : [p.x, -p.z, e.cx, 0];
  return [(mx + (u - uc) * s) * D, (my - (v - vc) * s) * D];
}

/** im Feld (CSS) → Welt in der Ebene der Ansicht */
function ausFeld(n: FeldAchse, x: number, y: number, F: ReturnType<typeof felder>, s: number): [number, number] {
  const e = raum!;
  const r = F[n];
  const u = (x - (r.x + r.w / 2)) / s;
  const v = -(y - (r.y + r.h / 2)) / s;
  return n === 'seite' ? [e.cx + u, e.cy + v] : n === 'front' ? [-u, e.cy + v] : [e.cx + u, -v];
}

/** S10: das Auffalten in diesem Bild (null = keins): Stand, Kamera der Zeichnungen, Lage der Wände und ihrer Kanten am Ende */
type Falt = {
  /** 0 = Raum, 1 = Felder (`glatt(vier)`) */
  e: number;
  vp: Matrix4;
  sw: [number, number, number];
  F: ReturnType<typeof felder>;
  s4: number;
  /** Lage der Wände der Front (x), des Bodens (y) und der Seite (z) */
  xh: number;
  yh: number;
  zh: number;
  /** die Kanten am Ende, auf den Teilern (Welt, in der Ebene der Seite) */
  xhF: number;
  yhF: number;
  /** Abstand der Mitte einer Zeichnung (z = 0) von ihrer Kante am Ende: Front, Top */
  rFront: number;
  rTop: number;
  /**
   * so weit gleitet die Zeichnung der Front und des Bodens auf ihrer Wand zusätzlich, damit ihre Mitte im Bild auf gerader Bahn an ihren
   * Platz gleitet: von der Kante weg (`kF`, `kT`) und längs der Kante (`uF`, `uT`)
   */
  kF: number;
  kT: number;
  uF: number;
  uT: number;
};
let faltJetzt: Falt | null = null;

/**
 * S10: Die Kamera der Zeichnungen dreht vom Raum gerade auf die Seite, wird parallel, und ihr Maßstab gleitet geometrisch zu dem der
 * Felder. Dabei gleitet die Mitte der Wand der Seite auf gerader Bahn in die Mitte ihres Felds (das Bild wird so verschoben, dass sie
 * dort ist, wo sie sein soll); Drehen und Wachsen geschehen um sie herum. Am Ende zeigt sie die Ebene der Seite genau wie `imFeld`.
 */
function faltRechnen(): Falt | null {
  const e = raum;
  const L0 = lageRaum;
  if (!e || !L0 || vier <= 1e-3) return null;
  const v = glatt(vier);
  const F = felder();
  const s4 = feldMassstab(F);
  const g6 = wandGewichte();
  const sw: [number, number, number] = [g6[0]! >= g6[1]! ? -1 : 1, g6[2]! >= g6[3]! ? -1 : 1, g6[4]! >= g6[5]! ? -1 : 1];
  const S = F.seite;
  const mxS = S.x + S.w / 2;
  const myS = S.y + S.h / 2;
  const c = kamFalt.stellen(
    {
      gier: L0.gier + (winkelZu(L0.gier, 0) - L0.gier) * v,
      neigung: L0.neigung * (1 - v),
      ziel: L0.ziel,
      s: L0.s * Math.pow(s4 / Math.max(1e-6, L0.s), v),
      p: L0.p * (1 - v),
      fov: L0.fov,
    },
    W,
    H,
    tiefeRaum,
  );
  // die Mitte der Wand der Seite: im Raum (ohne das Zusammenziehen) und mit dieser Kamera, Bildkoordinaten −1 … 1
  const anker = new Vector3(e.cx, e.cy, sw[2] * e.L);
  const a0 = anker.clone().applyMatrix4(new Matrix4().multiplyMatrices(projRaum, kam.aktiv.matrixWorldInverse));
  const a = anker.clone().applyMatrix4(new Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse));
  const ox = a0.x + ((2 * mxS) / W - 1 - a0.x) * v - a.x;
  const oy = a0.y + (1 - (2 * myS) / H - a0.y) * v - a.y;
  const proj = c.projectionMatrix.clone().premultiply(new Matrix4().set(1, 0, 0, ox, 0, 1, 0, oy, 0, 0, 1, 0, 0, 0, 0, 1));
  const vp = new Matrix4().multiplyMatrices(proj, c.matrixWorldInverse);
  const f: Falt = {
    e: v,
    vp,
    sw,
    F,
    s4,
    xh: e.cx + sw[0] * e.L,
    yh: e.cy + sw[1] * e.L,
    zh: sw[2] * e.L,
    xhF: e.cx + (F.tx - mxS) / s4,
    yhF: e.cy - (F.ty - myS) / s4,
    rFront: (F.tx - (F.front.x + F.front.w / 2)) / s4,
    rTop: (F.top.y + F.top.h / 2 - F.ty) / s4,
    kF: 0,
    kT: 0,
    uF: 0,
    uT: 0,
  };
  // Die Mitte der Zeichnungen der Front und des Bodens gleitet im Bild auf gerader Bahn gleichmäßig an ihren Platz (ohne das liefe sie
  // erst nach außen und dann zurück, weil die Wand beim Aufklappen größer wird und sich dreht): Dafür gleitet sie auf ihrer Wand etwas
  // mehr oder weniger, in beiden Richtungen der Wand
  const vpRaum = new Matrix4().multiplyMatrices(projRaum, kam.aktiv.matrixWorldInverse);
  for (const n of ['front', 'top'] as const) {
    const front = n === 'front';
    const mitte = front ? e.cy : e.cx;
    const start = (front ? new Vector3(f.xh, e.cy, 0) : new Vector3(e.cx, f.yh, 0)).applyMatrix4(vpRaum);
    const Fd = F[n];
    const X = start.x + ((2 * (Fd.x + Fd.w / 2)) / W - 1 - start.x) * v;
    const Y = start.y + (1 - (2 * (Fd.y + Fd.h / 2)) / H - start.y) * v;
    const r0 = f.zh * sw[2];
    const rm = r0 + ((front ? f.rFront : f.rTop) - r0) * v;
    const q0 = aufWand(n, rm, mitte, f);
    const qr = aufWand(n, rm + 1, mitte, f).sub(q0);
    const qu = aufWand(n, rm, mitte + 1, f).sub(q0);
    const c0 = new Vector4(q0.x, q0.y, q0.z, 1).applyMatrix4(vp);
    const cr = new Vector4(qr.x, qr.y, qr.z, 0).applyMatrix4(vp);
    const cu = new Vector4(qu.x, qu.y, qu.z, 0).applyMatrix4(vp);
    // (c0 + a·cr + b·cu) / w = (X, Y): zwei Gleichungen, linear in a und b
    const a11 = cr.x - X * cr.w;
    const a12 = cu.x - X * cu.w;
    const a21 = cr.y - Y * cr.w;
    const a22 = cu.y - Y * cu.w;
    const b1 = X * c0.w - c0.x;
    const b2 = Y * c0.w - c0.y;
    const det = a11 * a22 - a12 * a21;
    if (Math.abs(det) < 1e-12) continue;
    const ka = (b1 * a22 - a12 * b2) / det;
    const kb = (a11 * b2 - a21 * b1) / det;
    if (front) {
      f.kF = ka;
      f.uF = kb;
    } else {
      f.kT = ka;
      f.uT = kb;
    }
  }
  return f;
}

/**
 * S10: ein Punkt auf der Wand der Front oder des Bodens beim Auffalten, `r` von ihrer Kante mit der Seite, `u` längs der Kante (Front: y,
 * Boden: x). Die Wand dreht um die Kante, bis sie in der Ebene der Seite liegt (Front nach links, Boden nach unten); die Kante gleitet
 * dabei von der Ecke zu ihrem Teiler.
 */
function aufWand(n: 'front' | 'top', r: number, u: number, f: Falt): Vector3 {
  const phi = (Math.PI / 2) * (1 - f.e);
  const z = f.zh - Math.sin(phi) * r * f.sw[2];
  const a = Math.cos(phi) * r;
  return n === 'front' ? new Vector3(f.xh + (f.xhF - f.xh) * f.e - a, u, z) : new Vector3(u, f.yh + (f.yhF - f.yh) * f.e - a, z);
}

/** S10: ein Punkt der Zeichnung einer Wand beim Auffalten (es zählen nur seine Koordinaten in ihrer Ebene); bei e = 1 genau wie `imFeld` */
function faltPunkt(n: FeldAchse, p: Vector3, f: Falt): Vector3 {
  if (n === 'seite') return new Vector3(p.x, p.y, f.zh);
  // Abstand von der Kante: auf der Wand und im Feld; dazwischen gleitet die Zeichnung auf ihrer Wand
  const r0 = -(p.z - f.zh) * f.sw[2];
  const rF = (n === 'front' ? f.rFront : f.rTop) + p.z;
  return n === 'front' ? aufWand(n, r0 + (rF - r0) * f.e + f.kF, p.y + f.uF, f) : aufWand(n, r0 + (rF - r0) * f.e + f.kT, p.x + f.uT, f);
}

/** S10: die Wände beim Auffalten: die der Seite (x von xa bis xb, y von ya bis yb), wie weit die Front (rF) und der Boden (rT) reichen */
function faltRahmen(f: Falt): { xa: number; xb: number; ya: number; yb: number; rF: number; rT: number } {
  const e = raum!;
  const { F, s4 } = f;
  const S = F.seite;
  const mxS = S.x + S.w / 2;
  const myS = S.y + S.h / 2;
  const mix = (a: number, b: number): number => a + (b - a) * f.e;
  return {
    xa: mix(e.cx - e.L, e.cx + (S.x - mxS) / s4),
    xb: mix(e.cx + e.L, e.cx + (S.x + S.w - mxS) / s4),
    ya: mix(e.cy - e.L, e.cy - (S.y + S.h - myS) / s4),
    yb: mix(e.cy + e.L, e.cy - (S.y - myS) / s4),
    rF: mix(2 * e.L, (F.tx - F.front.x) / s4),
    rT: mix(2 * e.L, (F.top.y + F.top.h - F.ty) / s4),
  };
}

/**
 * S10: die Ränder der drei Wände beim Auffalten als Haarlinien. Die drei Kanten der Ecke (Stärke `k0` wie im Raum) gehen in sie über;
 * am Ende liegen sie auf den Feldern und vergehen. Die Teiler (Stärke `rt`) liegen auf den Kanten der Front und des Bodens mit der Seite,
 * bis an den Rand verlängert, und gleiten mit ihnen; zurück gegeben wird ihre Kreuzung (für den Tropfen).
 */
function faltKanten(f: Falt, k0: number, rt: number): [number, number] {
  const { sw } = f;
  const t = f.e;
  const { xa, xb, ya, yb, rF, rT } = faltRahmen(f);
  const haar = (linienWerte.innen / 2) * D * Math.sin(Math.PI * t);
  const ecke = 0.14 * D * k0 * (1 - t);
  const g = K.neueGruppe();
  const strich = (a: Vector3, b: Vector3, anEcke: boolean): void => {
    const r = haar + (anEcke ? ecke : 0);
    if (r < 0.004 * D) return;
    const [ax, ay] = projizieren(a, f.vp);
    const [bx, by] = projizieren(b, f.vp);
    K.push(ax, ay, bx, by, r, r, g, 0, false);
  };
  const z = f.zh;
  // die Seite: Kanten zur Front (x der Front) und zum Boden (y des Bodens) gehören zur Ecke
  strich(new Vector3(xa, ya, z), new Vector3(xa, yb, z), sw[0] < 0);
  strich(new Vector3(xb, ya, z), new Vector3(xb, yb, z), sw[0] > 0);
  strich(new Vector3(xa, ya, z), new Vector3(xb, ya, z), sw[1] < 0);
  strich(new Vector3(xa, yb, z), new Vector3(xb, yb, z), sw[1] > 0);
  // die Front: ihre Kante mit der Seite, mit dem Boden, die beiden anderen
  strich(aufWand('front', 0, ya, f), aufWand('front', 0, yb, f), true);
  strich(aufWand('front', 0, ya, f), aufWand('front', rF, ya, f), sw[1] < 0);
  strich(aufWand('front', 0, yb, f), aufWand('front', rF, yb, f), sw[1] > 0);
  strich(aufWand('front', rF, ya, f), aufWand('front', rF, yb, f), false);
  // der Boden
  strich(aufWand('top', 0, xa, f), aufWand('top', 0, xb, f), true);
  strich(aufWand('top', 0, xa, f), aufWand('top', rT, xa, f), sw[0] < 0);
  strich(aufWand('top', 0, xb, f), aufWand('top', rT, xb, f), sw[0] > 0);
  strich(aufWand('top', rT, xa, f), aufWand('top', rT, xb, f), false);
  // die Teiler: Geraden durch die beiden Kanten im Bild, senkrecht bis oben und unten, waagrecht bis links und rechts
  const [ax, ay] = projizieren(aufWand('front', 0, ya, f), f.vp);
  const [bx, by] = projizieren(aufWand('front', 0, yb, f), f.vp);
  const [cx, cy] = projizieren(aufWand('top', 0, xa, f), f.vp);
  const [dx, dy] = projizieren(aufWand('top', 0, xb, f), f.vp);
  const rand = bw.vierRand * D;
  const oben = (document.body.classList.contains('bild') ? bw.vierRand : 64) * D;
  const mx = Math.abs(by - ay) > 1e-6 ? (bx - ax) / (by - ay) : 0;
  const my = Math.abs(dx - cx) > 1e-6 ? (dy - cy) / (dx - cx) : 0;
  if (rt > 0.004 * D) {
    K.push(ax + mx * (oben - ay), oben, ax + mx * (H * D - rand - ay), H * D - rand, rt, rt, g, 0, false);
    K.push(rand, cy + my * (rand - cx), W * D - rand, cy + my * (W * D - rand - cx), rt, rt, g, 0, false);
  }
  // Kreuzung: x = ax + mx (y − ay), y = cy + my (x − cx)
  const kx = (ax + mx * (cy - my * cx - ay)) / (1 - mx * my);
  return [kx, cy + my * (kx - cx)];
}

function vierUmschalten(an?: boolean): void {
  if (zustand !== 'ruhe') return;
  vierZiel = (an ?? vierZiel < 0.5) ? 1 : 0;
  vierFahrt = { von: vier, t: 0 };
  if (vierZiel > 0.5 && ansicht !== 'raum') ansichtSetzen('raum');
  anstossen();
}

// ---------- Bild ----------

let laeuft = false;
let letzte = 0;
let bilder = 0;
let bilderSeit = performance.now();
let angehalten = false;

function anstossen(): void {
  if (laeuft) return;
  laeuft = true;
  letzte = performance.now();
  requestAnimationFrame(schleife);
}

function schleife(t: number): void {
  const dt = Math.min(1 / 30, Math.max(0, (t - letzte) / 1000));
  letzte = t;
  if (angehalten) {
    laeuft = false;
    return;
  }
  const aktiv = bild(dt);
  bilder++;
  if (t - bilderSeit > 500) {
    stat.fps = (bilder * 1000) / (t - bilderSeit);
    bilder = 0;
    bilderSeit = t;
  }
  if (aktiv || festeZeit !== null) requestAnimationFrame(schleife);
  else laeuft = false;
}

function vpJetzt(): Matrix4 {
  return new Matrix4().multiplyMatrices(kam.aktiv.projectionMatrix, kam.aktiv.matrixWorldInverse);
}

function projizieren(p: Vector3, vp: Matrix4): [number, number, number] {
  const c = p.clone().applyMatrix4(vp);
  return [(c.x * 0.5 + 0.5) * W * D, (0.5 - c.y * 0.5) * H * D, c.z];
}

/** Welt eines Ankers der Silhouette (Ebene z) */
function ankerWelt(a: { x: number; y: number }, z = 0): Vector3 {
  return new Vector3(a.x - W / 2, H / 2 - a.y, z);
}

/**
 * Die Linie der Seite in der Welt (z = 0): Pfad (x, y je Paar) und Punkte mit ihrer Nummer. Sobald die Haut des Werks zu sehen ist,
 * die Linie der Mitte im Werk (wie das Werk sie hat, auch im Zug), sonst die Silhouette des Blatts.
 */
function seitenLinie(schritt: number): { pfad: number[]; punkte: { i: number; x: number; y: number }[] } | null {
  if (werkGezeigt) {
    const w = mittePfad(werkHaut.f, werkHaut.mitte.x, werkHaut.mitte.y);
    if (w) return w;
  }
  if (!silhouette) return null;
  const ab = abtasten(silhouette, schritt);
  const pfad: number[] = [];
  for (let i = 0; i < ab.x.length; i++) pfad.push(ab.x[i]! - W / 2, H / 2 - ab.y[i]!);
  return { pfad, punkte: silhouette.map((a, i) => ({ i, x: a.x - W / 2, y: H / 2 - a.y })) };
}

/** Umriss der Form von einer Achse (0 Front, 1 Top): der Haut des Werks, sobald sie zu sehen ist, sonst der Blase */
/** S9: Hat das Werk eine Linie der Mitte? Ohne sie zeigt auch die Seite den Umriss der Haut (wie Front und Top) */
function mitteDa(): boolean {
  return werk.loops.some((l) => l.art === 'mitte');
}

function umrissJetzt(achse: 0 | 1 | 2): Float32Array {
  // während das Werk rechnet, darf der Umriss ein paar Bilder alt sein (`werkHaut.umrissVeraltet` holt das nächste Bild)
  return werkGezeigt ? werkHaut.umriss(achse, werkBeschaeftigt()) : koerper!.umriss(achse);
}

/** ein Bild; true: es bewegt sich noch etwas */
function bild(dt: number): boolean {
  const t0 = performance.now();
  let aktiv = false;
  if (festeZeit !== null) dt = 1 / 60;
  uhr = festeZeit !== null ? 7 + festeZeit : mess.still ? uhr : uhr + dt;
  if (zustand === 'blatt') aktiv = blatt.schritt(dt) || aktiv;
  // Netz zur Silhouette (beim Ziehen höchstens alle 110 ms)
  const stand = blatt.stand;
  if (zustand === 'blatt' && netzStand !== stand && (!blatt.zeichnet || performance.now() - netzZeit > 110)) netzBauen();
  if (zustand === 'blatt' && blatt.geschlossen && film < 1) {
    film = Math.min(1, film + dt / 0.6);
    aktiv = true;
  }
  if (zustand === 'blatt' && !blatt.geschlossen) film = 0;
  // Zeit des Aufblasens
  let m: Moment | null = null;
  if (zustand !== 'blatt' && koerper && raum) {
    const dauer = moment(0, masse(), werte).dauer;
    if (festeZeit !== null) T = festeZeit;
    else if (zustand === 'auf') T += dt;
    else if (zustand === 'ab') T -= dt * 1.5;
    if (zustand === 'auf' && T >= dauer) zustand = 'ruhe';
    if (zustand === 'ab' && T <= 0) {
      T = 0;
      zustand = 'blatt';
      koerper.versatz.fill(0);
      nutzer.gier = 0;
      nutzer.neigung = 0;
      leiste.lage(!blatt.leer);
      leiste.zeichnenErlaubt(true);
    }
    m = moment(Math.max(0, Math.min(T, dauer)), masse(), werte);
    if (zustand !== 'ruhe' || zug) koerper.setzen(zustand === 'blatt' ? FLACH : m.lage);
    const tau = zustand === 'auf' && T < m.riss + 0.35 ? 0 : zug ? 3.5 : 1.6;
    // zeigt die Seifenhaut die Haut des Werks, ruht die Blase der Studie: nicht mehr rechnen und hochladen (S3)
    if (!(werkGezeigt && zustand === 'ruhe' && !zug)) {
      const unruhe = koerper.dehnungRechnen(dt, tau);
      haut.hochladen();
      aktiv = aktiv || unruhe > 2e-3;
    }
    aktiv = aktiv || zustand !== 'ruhe' || zug !== null;
  } else if (koerper && zustand === 'blatt') {
    koerper.setzen(FLACH);
    koerper.dehnungRechnen();
    haut.hochladen();
  }
  // das Werk: sein Bildtakt und, ab dem Abriss, seine Haut
  mess.teile = [0, 0, 0, 0, 0, 0];
  aktiv = werkBild(dt, m) || aktiv;
  // hat das Werk nach einem Handgriff ausgerechnet: der Raum folgt der Form (nur bei großen Änderungen)
  const beschaeftigt = werkBeschaeftigt();
  if (werkWarBeschaeftigt && !beschaeftigt && zustand === 'ruhe') raumRechnen(bw.band);
  werkWarBeschaeftigt = beschaeftigt;
  // Schwung nach dem Drehen: dreht weiter, klingt ab; nahe einer Ansicht rastet es ein
  if (schwung && !drehen) {
    nutzer.gier += schwung.vg * dt;
    nutzer.neigung = Math.max(NEIGUNG_UNTEN, Math.min(NEIGUNG_OBEN, nutzer.neigung + schwung.vn * dt));
    const k = Math.exp(-dt / SCHWUNG_TAU);
    schwung.vg *= k;
    schwung.vn *= k;
    if (Math.hypot(schwung.vg, schwung.vn) < 0.15) {
      schwung = null;
      einrasten();
    }
    aktiv = true;
  }
  // nach dem Wenden: Die Linien der Ansicht sind wieder nur nahe ihrer Achse zu sehen, sobald die Fahrt zu Ende ist
  if (wendenSicht && !wenden && !ansichtFahrt) wendenSicht = false;
  // Fahrt in eine Ansicht: Drehen und Parallele zugleich, die Größe bleibt
  if (ansichtFahrt) {
    ansichtFahrt.t += dt / Math.max(0.05, bw.fahrt);
    const t = Math.min(1, ansichtFahrt.t);
    const e = t * t * t * (t * (t * 6 - 15) + 10);
    const [g0, n0, f0] = ansichtFahrt.von;
    const [g1, n1, f1] = ansichtFahrt.nach;
    if (!ansichtFahrt.nurFlach) {
      nutzer.gier = g0 + (g1 - g0) * e;
      nutzer.neigung = n0 + (n1 - n0) * e;
    }
    // von einer eingerasteten Ansicht in eine andere: unterwegs löst sich das Blatt ein Stück (die Blase kommt zurück und verdunstet
    // wieder), wie wenn man von Hand herausdreht und einrastet; sonst wäre mitten in der Drehung nichts zu sehen
    flach = Math.max(0, f0 + (f1 - f0) * e - (ansichtFahrt.senke ?? 0) * Math.sin(Math.PI * e));
    if (t >= 1) ansichtFahrt = null;
    aktiv = true;
  }
  if (zustand !== 'ruhe' && zustand !== 'auf' && flach > 0) flach = 0;
  if (vierFahrt) {
    vierFahrt.t += dt / Math.max(0.05, bw.fahrt);
    vier = vierFahrt.von + (vierZiel - vierFahrt.von) * Math.min(1, vierFahrt.t);
    if (vierFahrt.t >= 1) {
      vier = vierZiel;
      vierFahrt = null;
    }
    aktiv = true;
  }
  if (zustand !== 'ruhe' && vier > 0) {
    vier = 0;
    vierZiel = 0;
    vierFahrt = null;
  }
  // Teiler: folgt den Maßen der Form weich (nie während eines Zugs am Tropfen)
  if (raum) {
    const [zx, zy] = teilerZiel();
    if (teiler.zug) {
      teiler.fx = zx;
      teiler.fy = zy;
    } else {
      const k = 1 - Math.exp(-dt / 0.18);
      teiler.fx += (zx - teiler.fx) * k;
      teiler.fy += (zy - teiler.fy) * k;
      if (Math.abs(zx - teiler.fx) + Math.abs(zy - teiler.fy) > 1e-4) aktiv = true;
    }
  }
  // Maßstab: passt sich der Größe der Form nur in der Ruhe an (nie während eines Zugs) und nur, wenn er das Band verlässt
  const imZug = !!(zug || drehen || punktZug || teiler.zug);
  if (imZug) massstab.seitRuhe = performance.now();
  if (zustand === 'ruhe' && !imZug && performance.now() - massstab.seitRuhe > 400) {
    const weg = Math.abs(massstab.jetzt / massstab.ziel - 1);
    if (weg > bw.band || massstab.nachfuehren) massstab.nachfuehren = weg > 0.002;
    if (massstab.nachfuehren) {
      massstab.jetzt += (massstab.ziel - massstab.jetzt) * (1 - Math.exp(-dt / 0.25));
      aktiv = true;
    }
  }
  kameraSetzen(zustand === 'blatt' ? null : m);
  faltJetzt = zustand === 'blatt' ? null : faltRechnen();
  hintenJetzt = hintenRechnen();
  schnittJetzt = schnittRechnen();
  // Fahrtwind: die Farben fließen gegen die Drehung
  const gierJetzt = Math.atan2(kam.aktiv.position.x - (raum?.cx ?? 0), kam.aktiv.position.z);
  const neigungJetzt = Math.asin(Math.max(-1, Math.min(1, (kam.aktiv.position.y - (raum?.cy ?? 0)) / Math.max(1, kam.abstand))));
  if (dt > 0) {
    wind.x -= (gierJetzt - letzteDrehung.gier) * 0.9;
    wind.y += (neigungJetzt - letzteDrehung.neigung) * 0.9;
  }
  letzteDrehung = { gier: gierJetzt, neigung: neigungJetzt };
  hauch.staerke += (hauch.ziel - hauch.staerke) * (1 - Math.exp(-dt / 0.18));
  // in der Pose tönt sich das Papier (E8)
  const tonZiel = werk.grund !== null && zustand === 'ruhe' ? 1 : 0;
  poseTon += (tonZiel - poseTon) * (1 - Math.exp(-dt / 0.22));
  if (Math.abs(tonZiel - poseTon) > 1e-3) aktiv = true;
  else poseTon = tonZiel;
  if (Math.abs(hauch.ziel - hauch.staerke) > 1e-3) aktiv = true;
  for (let i = 0; i < 6; i++) {
    const ziel = zustand === 'ruhe' && wandUnterZeiger === i ? 1 : 0;
    wandSicht[i]! += (ziel - wandSicht[i]!) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(ziel - wandSicht[i]!) > 2e-3) aktiv = true;
  }
  // Haut (keine Schatten an den Wänden: dort stehen die Linien). Eingerastet ist nur der Umriss zu sehen (Florian, 16.11.): Die Blase
  // verdunstet beim Einrasten, die Haut wird dünner (die Farben laufen) und klar, und kommt beim Lösen genauso zurück.
  const F = koerper?.flach;
  // eingerastet schiebt sich das Blatt durch die Blase (`schnittJetzt`), sie verdunstet nicht mehr (Florian, 16.11. abends: harte Kante)
  const weg = 0;
  const w: HautWerte = {
    fassung,
    nacht: false,
    zeit: uhr,
    vorn: 1 - weg,
    hinten: 1 - weg,
    rahmen: m ? 1 - m.schatten : film,
    schatten: 0,
    schlauch: !!m && m.lage.seitRiss < 0.1,
    deckung: (zustand === 'blatt' ? 0.42 * film : 0.42 + 0.58 * glatt(T / 1.4)) * (1 - weg),
    hauch: hauch.pos,
    hauchStaerke: hauch.staerke,
    hauchRadius: werkGezeigt ? pinselRadius / werkHaut.f : Math.max(24, (F?.radius ?? 200) * 0.2),
    wind,
    dicke: werte.dicke * (1 - 0.45 * weg),
    spannung: werte.spannung,
    sicht: werte.sicht,
    wuerfel: null,
    waende: [],
    weich: 0,
    schattenFarbe: WEISS,
    papier: poseTon > 1e-3 ? WEISS.clone().lerp(POSE_PAPIER, poseTon) : null,
    dunkel: hintenJetzt,
    kanteFarbe: KANTE_FARBE,
    schnitt: schnittJetzt,
  };
  const tz = performance.now();
  haut.zeichnen(kam.aktiv, w, []);
  mess.teile[3] = performance.now() - tz;
  let diff = -1;
  let p99 = -1;
  if (mess.an && mess.pixel && mess.bereich) {
    // das Bild der Haut im Bereich gegen das vorige (gleich nach dem Zeichnen, im selben Takt)
    const b = mess.bereich;
    renderer.setRenderTarget(null);
    const gl = renderer.getContext();
    if (!mess.puffer || mess.puffer.length !== b.w * b.h * 4) mess.puffer = new Uint8Array(b.w * b.h * 4);
    gl.readPixels(b.x, b.y, b.w, b.h, gl.RGBA, gl.UNSIGNED_BYTE, mess.puffer);
    const v = mess.vorher;
    if (v && v.length === mess.puffer.length) {
      const hist = new Uint32Array(256);
      let summe = 0;
      const P = mess.puffer;
      for (let i = 0; i < P.length; i += 4) {
        const d = Math.max(Math.abs(P[i]! - v[i]!), Math.abs(P[i + 1]! - v[i + 1]!), Math.abs(P[i + 2]! - v[i + 2]!));
        summe += d;
        hist[d]!++;
      }
      const n = P.length / 4;
      diff = summe / n;
      let k = 0;
      p99 = 255;
      for (let j = 0; j < 256; j++) {
        k += hist[j]!;
        if (k >= 0.99 * n) {
          p99 = j;
          break;
        }
      }
    }
    mess.vorher = Uint8Array.from(mess.puffer);
  }
  // Linien
  let szene: Szene;
  if (zustand === 'blatt') {
    szene = blatt.szene(K, D);
  } else {
    K.leeren();
    const vp = vpJetzt();
    let zeigerBearbeiten: Szene['zeiger'] | undefined;
    werkHaut.umrissVeraltet = false;
    if (koerper && raum && m) {
      const tw = performance.now();
      wandLinien(vp, m);
      if (flach > 0.01) linienDerAnsicht(vp);
      if (faltJetzt) felderLinien(faltJetzt, m);
      mess.teile[5] = performance.now() - tw;
      if (werkHaut.umrissVeraltet) aktiv = true;
    }
    if (koerper && raum && m && werkGezeigt) {
      const tl = performance.now();
      const r = werkLinien(vp, m, dt);
      mess.teile[2] = performance.now() - tl;
      zeigerBearbeiten = r.zeiger;
      aktiv = r.aktiv || aktiv;
    } else bearbeitenAn = false;
    if (zeiger.da && !bearbeitenAn) K.felder.push(zeiger.x * D, zeiger.y * D, 22 * D, 0.7);
    const zeigerZeigen = zeiger.da && (!document.body.classList.contains('bild') || mitZeigerImBild);
    szene = {
      prim: K.puffer,
      anzahl: K.n,
      k0: 0,
      k1: linienWerte.weich * D,
      felder: K.felder,
      tinte: TINTE,
      gruen: GRUEN,
      dunkel: hintenJetzt,
      zeiger: !zeigerZeigen ? null : bearbeitenAn ? (zeigerBearbeiten ?? null) : zeigerForm(zeiger.x, zeiger.y),
    };
    szene.zeigerUmriss = zeigerGestaltSchritt(szene.zeiger, dt);
    if (zeigerGestalt.gleitet) aktiv = true;
  }
  const ta = performance.now();
  anzeige.zeichnen(szene);
  mess.teile[4] = performance.now() - ta;
  hintenZeigen();
  maulUiZeigen();
  tastenStand();
  // Text
  gruss.classList.toggle('weg', !(zustand === 'blatt' && blatt.leer));
  const h =
    zustand === 'ruhe' && werkGezeigt && raumWerkzeug === 'lasso'
      ? 'Lasso: Punkte umfahren · ⇧ dazu · ⌥ weg · ⌫ löschen · K Kante · V oder L: zurück'
      : zustand === 'blatt'
      ? blatt.geschlossen && !blatt.zeichnet
        ? '↩ aufblasen'
        : ''
      : zustand === 'ruhe'
        ? vier > 0.5
          ? werkGezeigt
            ? bearbeiten.stift
              ? 'P: Klick Ecke, Ziehen rund, auf dem ersten Punkt schließen (Form) · auf Punkt oder Linie beginnen und enden (Abzweigung) · Esc'
              : 'Punkte, Linien und Richtungen ziehen · ins Leere ziehen: drehen · P zeichnen · L Lasso · K Kante · ⌫ löschen · ⌘Z · Tab: zurück in den Raum'
            : 'Tab: zurück in den Raum · Tropfen in der Mitte ziehen: Felder · Punkte der Seite ziehen'
          : ansicht === 'raum'
            ? werkGezeigt
              ? bearbeiten.stift
                ? 'P an den Wänden: Klick Ecke, Ziehen rund, auf dem ersten Punkt schließen · auf Punkt oder Linie: Abzweigung · Esc'
                : 'an der Blase ziehen: Pinsel ([ ] Größe) · ins Leere ziehen: drehen · Linien an den Wänden ziehen · P zeichnen · L Lasso · K Kante · ⌫ löschen · ⌘Z · 1 3 7 Ansichten · Tab vier'
              : 'ziehen: drehen · an der Blase ziehen · Punkte an der Wand der Seite ziehen · 1 Seite · 3 Front · 7 Top · Tab vier Ansichten'
            : werkGezeigt
              ? bearbeiten.stift
                ? 'P: Klick Ecke, Ziehen rund, auf dem ersten Punkt schließen (Form) · auf Punkt oder Linie beginnen und enden (Abzweigung) · Esc'
                : 'Punkte, Linien und Richtungen ziehen · ins Leere ziehen: drehen · P zeichnen · L Lasso · K Kante · ⌫ löschen · ⌘Z · 0 Raum · 1 Seite · 3 Front · 7 Top'
              : '0 Raum · 1 Seite · 3 Front · 7 Top · Tab vier Ansichten'
        : '';
  // eine Meldung des Werks (das Maul, P, die Pose) steht ein paar Sekunden statt des Hinweises
  if (werk.G.meldung !== meldung.text) meldung = { text: werk.G.meldung, seit: performance.now() };
  // S12: mit Stift und Fingern gibt es die Tasten nicht, die der Hinweis nennt: dort nur die Meldungen (und „↩ aufblasen“ auf dem Blatt)
  const ohneTasten = zustand !== 'blatt' && (document.body.classList.contains('beruehrung') || GROB.matches);
  const istMeldung = !!meldung.text && zustand === 'ruhe' && performance.now() - meldung.seit < MELDUNG_MS;
  const hm = istMeldung ? meldung.text : ohneTasten ? '' : h;
  if (meldung.text && performance.now() - meldung.seit < MELDUNG_MS) aktiv = true;
  if (hinweisSetzen(hm, istMeldung)) aktiv = true;
  stat.bildMs = performance.now() - t0;
  if (mess.an) {
    const t = performance.now();
    mess.bilder.push({ t, ms: stat.bildMs, abstand: mess.letzte ? t - mess.letzte : 0, diff, p99, netz: mess.netzWechsel, stufen: werkHaut.stufen, punkte: werk.haut.n, teile: [...mess.teile] });
    mess.letzte = t;
  }
  if (mitInfo)
    infoAnzeige.textContent = `Finger ${finger.size}${geste ? ' Geste' : ''} · Zoom ${nutzer.zoom.toFixed(2)} · ${Object.entries(zeigerZaehler).map(([k, v]) => `${k} ${v}`).join(', ')} · ${stat.fps.toFixed(0)} B/s · Bild ${stat.bildMs.toFixed(1)} ms · Netz ${stat.punkte} P, ${stat.dreiecke} D · ${zustand} ${T.toFixed(2)} s · p ${flach.toFixed(2)}${werkForm ? ` · Werk ${werk.haut.n} P, Anzeige ${werkHaut.stufen} St. ${werkHaut.ms.toFixed(1)} ms` : ''}`;
  return aktiv;
}

const TINTE: [number, number, number] = [0x1f / 255, 0x1a / 255, 0x17 / 255];
const GRUEN: [number, number, number] = [0xb9 / 255, 0xd1 / 255, 0xb4 / 255];
const ZEIGER_WINKEL = [(32 * Math.PI) / 180, (80 * Math.PI) / 180];

/** der Zeiger der Linien-Studie: Dreieck, Spitze oben links */
function zeigerForm(x: number, y: number): Szene['zeiger'] {
  const L = linienWerte.zeigerGroesse * D;
  const ax = x * D;
  const ay = y * D;
  return {
    ax,
    ay,
    bx: ax + L * Math.cos(ZEIGER_WINKEL[0]!),
    by: ay + L * Math.sin(ZEIGER_WINKEL[0]!),
    cx: ax + L * Math.cos(ZEIGER_WINKEL[1]!),
    cy: ay + L * Math.sin(ZEIGER_WINKEL[1]!),
    linie: linienWerte.zeigerLinie * D,
  };
}

// ---------- S13 (liquid drop, Idee 8): der Zeiger in der Form des Werkzeugs ----------

/** Pfeil (Auswahl), Spitze (P und Freihand), Schlinge (Lasso), Ring (Pinsel an der Haut; so groß wie sein Einfluss) */
type ZeigerArt = 'pfeil' | 'spitze' | 'schlinge' | 'ring';
/** der Zeiger jetzt: Umriss um die Spitze (Gerätepunkte), Füllung; ob er gerade von einer Form in die andere gleitet */
const zeigerGestalt = { punkte: new Float32Array(2 * ZEIGER_PUNKTE), fuell: 1, bereit: false, gleitet: false };
/** der Zeiger liegt über der Haut des Werks und der Pinsel würde ziehen */
let zeigerPinsel = false;

/** der Umriss einer Art, die Spitze im Ursprung (Gerätepunkte, y nach unten), so groß wie der Pfeil (L) */
function zeigerUmrissVon(art: ZeigerArt, L: number, ring: number): [number, number][] {
  const w0 = ZEIGER_WINKEL[0]!;
  const w1 = ZEIGER_WINKEL[1]!;
  const dw = (w0 + w1) / 2;
  const d: [number, number] = [Math.cos(dw), Math.sin(dw)];
  const q: [number, number] = [-Math.sin(dw), Math.cos(dw)];
  const bei = (a: number, b: number): [number, number] => [a * d[0] + b * q[0], a * d[1] + b * q[1]];
  if (art === 'pfeil')
    return [
      [0, 0],
      [L * Math.cos(w0), L * Math.sin(w0)],
      [L * Math.cos(w1), L * Math.sin(w1)],
    ];
  if (art === 'spitze') return [[0, 0], bei(0.42 * L, 0.2 * L), bei(1.0 * L, 0.2 * L), bei(1.0 * L, -0.2 * L), bei(0.42 * L, -0.2 * L)];
  if (art === 'schlinge') {
    // ein kurzer Faden von der Spitze, dann die Schlinge (der Faden hin und zurück ist eine Linie)
    const ende = bei(0.3 * L, 0);
    const m = bei(0.62 * L, 0);
    const rd = 0.32 * L;
    const rq = 0.44 * L;
    const pkt: [number, number][] = [[0, 0], ende];
    for (let k = 1; k < 20; k++) {
      const t = Math.PI + (2 * Math.PI * k) / 20;
      pkt.push([m[0] + rd * Math.cos(t) * d[0] + rq * Math.sin(t) * q[0], m[1] + rd * Math.cos(t) * d[1] + rq * Math.sin(t) * q[1]]);
    }
    pkt.push(ende);
    return pkt;
  }
  // Ring um die Spitze; der erste Punkt zeigt nach oben links (dorthin, wo die anderen ihre Spitze haben)
  const pkt: [number, number][] = [];
  for (let k = 0; k < ZEIGER_PUNKTE; k++) {
    const t = dw + Math.PI + (2 * Math.PI * k) / ZEIGER_PUNKTE;
    pkt.push([ring * Math.cos(t), ring * Math.sin(t)]);
  }
  return pkt;
}

/** einen geschlossenen Umriss auf `n` Punkte verteilen, je Kante nach ihrer Länge (die Ecken bleiben Ecken) */
function umfangVerteilen(poly: [number, number][], n: number): Float32Array {
  const m = poly.length;
  const len = poly.map((p, i) => Math.hypot(poly[(i + 1) % m]![0] - p[0], poly[(i + 1) % m]![1] - p[1]));
  const summe = len.reduce((a, b) => a + b, 0) || 1;
  const zahl = len.map((l) => Math.max(1, Math.round((n * l) / summe)));
  let rest = n - zahl.reduce((a, b) => a + b, 0);
  while (rest !== 0) {
    let k = 0;
    for (let i = 1; i < m; i++) if (rest > 0 ? len[i]! / zahl[i]! > len[k]! / zahl[k]! : zahl[i]! > zahl[k]!) k = i;
    if (rest < 0 && zahl[k]! <= 1) break;
    zahl[k] = zahl[k]! + Math.sign(rest);
    rest -= Math.sign(rest);
  }
  const aus = new Float32Array(2 * n);
  let j = 0;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % m]!;
    for (let k = 0; k < zahl[i]! && j < n; k++, j++) {
      const t = k / zahl[i]!;
      aus[2 * j] = p[0] + (q[0] - p[0]) * t;
      aus[2 * j + 1] = p[1] + (q[1] - p[1]) * t;
    }
  });
  for (; j < n; j++) {
    aus[2 * j] = aus[2 * j - 2]!;
    aus[2 * j + 1] = aus[2 * j - 1]!;
  }
  return aus;
}

/** welche Form der Zeiger gerade hat */
function zeigerArtJetzt(): ZeigerArt {
  if (zustand !== 'ruhe' || !werkGezeigt || !bearbeitenAn) return 'pfeil';
  if (raumWerkzeug === 'p' || bearbeiten.stift || raumWerkzeug === 'frei') return 'spitze';
  if (raumWerkzeug === 'lasso') return 'schlinge';
  if (raumWerkzeug === 'auswahl' && zeigerPinsel && !bearbeiten.haengt) return 'ring';
  return 'pfeil';
}

/** der Umriss des Zeigers in diesem Bild: Er gleitet in die Form des Werkzeugs (flüssig, etwa 0,1 s), die Spitze bleibt, wo sie ist */
function zeigerGestaltSchritt(z: Szene['zeiger'], dt: number): NonNullable<Szene['zeigerUmriss']> | null {
  if (!z) return null;
  const L = Math.hypot(z.bx - z.ax, z.by - z.ay);
  const art = zeigerArtJetzt();
  const ring = Math.max(0.6 * L, Math.min(10 * L, (pinselRadius / werkHaut.f) * massstab.jetzt * nutzer.zoom * D));
  const ziel = umfangVerteilen(zeigerUmrissVon(art, L, ring), ZEIGER_PUNKTE);
  const fuellZiel = art === 'schlinge' || art === 'ring' ? 0 : 1;
  const G = zeigerGestalt;
  const k = G.bereit ? 1 - Math.exp(-Math.max(0, dt) / 0.06) : 1;
  let weg = 0;
  for (let i = 0; i < 2 * ZEIGER_PUNKTE; i++) {
    G.punkte[i] = G.punkte[i]! + (ziel[i]! - G.punkte[i]!) * k;
    weg = Math.max(weg, Math.abs(ziel[i]! - G.punkte[i]!));
  }
  G.fuell += (fuellZiel - G.fuell) * k;
  G.bereit = true;
  G.gleitet = weg > 0.05 || Math.abs(fuellZiel - G.fuell) > 0.005;
  const punkte = new Float32Array(2 * ZEIGER_PUNKTE);
  for (let i = 0; i < ZEIGER_PUNKTE; i++) {
    punkte[2 * i] = z.ax + G.punkte[2 * i]!;
    punkte[2 * i + 1] = z.ay + G.punkte[2 * i + 1]!;
  }
  return { punkte, fuell: G.fuell };
}

/** sichtbare Wand je Achse (Vorzeichen) und ihre Stärke */
function waendeJetzt(m: Moment, wieImRaum = false): { s: [number, number, number]; staerke: [number, number, number] } {
  const g6 = wandGewichte();
  const r = raumSicht();
  const s: [number, number, number] = [g6[0]! >= g6[1]! ? -1 : 1, g6[2]! >= g6[3]! ? -1 : 1, g6[4]! >= g6[5]! ? -1 : 1];
  const zeit = [m.waende, m.waende, m.schatten];
  // S10: beim Auffalten zeigen die Felder die Zeichnungen der Wände, von Anfang an (`wieImRaum`: die Stärke ohne die Vier Ansichten)
  const weg = wieImRaum || vier <= 1e-3 ? 1 : 0;
  const staerke = [0, 1, 2].map((a) => Math.max(g6[2 * a]!, g6[2 * a + 1]!) * r * zeit[a]! * weg) as [number, number, number];
  return { s, staerke };
}

/**
 * Linien an den Wänden: Seite = die gezeichnete Linie mit ihren Punkten, Front und Top = der Umriss der Blase von ihrer Achse,
 * jeweils auf die abgewandte Wand gelegt. Dazu die drei feinsten Kanten der fernen Ecke.
 */
function wandLinien(vp: Matrix4, m: Moment): void {
  const k = koerper!;
  const e = raum!;
  const { s, staerke } = waendeJetzt(m);
  const r0 = (linienWerte.umriss / 2) * D * bw.wandLinien;
  const mitte = [e.cx, e.cy, 0];
  // der Rahmen (die gezeichnete Linie) auf dem Weg zur Rückwand; dort wird er zur Zeichnung der Seite
  const F = k.flach;
  if (m.linie > 0.01 && F.nb > 2) {
    const n = F.n;
    const xs: number[] = [];
    const ys: number[] = [];
    const p = new Vector3();
    for (let i = 0; i < F.nb; i++) {
      const vi = 2 * n + i;
      p.set(k.pos[vi * 3]!, k.pos[vi * 3 + 1]!, k.pos[vi * 3 + 2]!);
      const [a, b] = projizieren(p, vp);
      xs.push(a);
      ys.push(b);
    }
    K.zug(xs, ys, (linienWerte.umriss / 2) * D * m.linie, true);
    for (const a of F.anker) K.punkt(xs[a]!, ys[a]!, linienWerte.punktRadius * D * m.linie);
  }
  for (const achse of [0, 1, 2] as const) {
    const st = staerke[achse];
    if (st < 0.01) continue;
    // mit dem Werk zeichnet `werkLinien` alle Linien; hier bleibt in Front und Top der Umriss der Haut
    if (werkGezeigt && achse === 2 && mitteDa()) continue;
    const w = achse * 2 + (s[achse] > 0 ? 1 : 0);
    const ueber = wandSicht[w]!;
    const lage = mitte[achse]! + s[achse] * e.L;
    const legen = (x: number, y: number, z: number): [number, number] => {
      const q = new Vector3(x, y, z);
      if (achse === 0) q.x = lage;
      else if (achse === 1) q.y = lage;
      else q.z = lage;
      const [a, b] = projizieren(q, vp);
      return [a, b];
    };
    const r = r0 * st * (0.82 + 0.18 * ueber);
    // die Linie der Seite (die gezeichnete, ab dem Abriss die des Werks) an der Rückwand
    const linie = achse === 2 ? seitenLinie(2) : null;
    if (linie) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i < linie.pfad.length; i += 2) {
        const [a, b] = legen(linie.pfad[i]!, linie.pfad[i + 1]!, 0);
        xs.push(a);
        ys.push(b);
      }
      K.zug(xs, ys, r, true);
      for (const p of linie.punkte) {
        const [px, py] = legen(p.x, p.y, 0);
        const gross = p.i === punktUnterZeiger || punktZug?.i === p.i ? linienWerte.tropfen : 1;
        K.punkt(px, py, linienWerte.punktRadius * D * gross * st * (0.55 + 0.45 * ueber));
      }
    } else {
      const seg = achse === 2 && !werkGezeigt ? k.umriss(2) : umrissJetzt(achse);
      const g = K.neueGruppe();
      for (let i = 0; i < seg.length; i += 6) {
        const [ax, ay] = legen(seg[i]!, seg[i + 1]!, seg[i + 2]!);
        const [bx, by] = legen(seg[i + 3]!, seg[i + 4]!, seg[i + 5]!);
        K.push(ax, ay, bx, by, r, r, g, 0, false);
      }
    }
  }
  // Kanten der fernen Ecke: drei feinste Haarlinien vom Eckpunkt aus
  const kanten = werte.kanten * Math.min(staerke[0], staerke[1], staerke[2]) * raumSicht();
  if (kanten > 0.01) {
    const c = new Vector3(e.cx + s[0] * e.L, e.cy + s[1] * e.L, s[2] * e.L);
    const enden = [c.clone().setX(e.cx - s[0] * e.L), c.clone().setY(e.cy - s[1] * e.L), c.clone().setZ(-s[2] * e.L)];
    const g = K.neueGruppe();
    const r = 0.14 * D * kanten;
    const cam = kam.aktiv;
    for (const b of enden) {
      let vorher: [number, number] | null = null;
      for (let j = 0; j <= 32; j++) {
        const q = c.clone().lerp(b, j / 32);
        const vorKamera = q.clone().applyMatrix4(cam.matrixWorldInverse).z < -cam.near * 1.01;
        const cc = q.clone().applyMatrix4(vp);
        if (!vorKamera || Math.abs(cc.x) > 3 || Math.abs(cc.y) > 3) {
          vorher = null;
          continue;
        }
        const pp: [number, number] = [(cc.x * 0.5 + 0.5) * W * D, (0.5 - cc.y * 0.5) * H * D];
        if (vorher) K.push(vorher[0], vorher[1], pp[0], pp[1], r, r, g, 0, false);
        vorher = pp;
      }
    }
  }
}

/** Linien der eingerasteten Ansicht, auf der Blase: Seite = die gezeichnete Linie mit Punkten, Front und Top = Umriss */
function linienDerAnsicht(vp: Matrix4): void {
  const k = koerper!;
  const blick = new Vector3();
  kam.aktiv.getWorldDirection(blick);
  const achse = ansicht === 'seite' ? new Vector3(0, 0, -1) : ansicht === 'front' ? new Vector3(1, 0, 0) : new Vector3(0, -1, 0);
  const t = wendenSicht ? 1 : Math.min(1, Math.max(0, (Math.abs(blick.dot(achse)) - 0.97) / 0.025));
  const s = flach * flach * t * t * (3 - 2 * t);
  if (s < 0.01) return;
  if (werkGezeigt && ansicht === 'seite' && mitteDa()) return;
  const r0 = (linienWerte.umriss / 2) * D * s;
  const linie = ansicht === 'seite' ? seitenLinie(1.5) : null;
  if (linie) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < linie.pfad.length; i += 2) {
      const [a, b] = projizieren(new Vector3(linie.pfad[i]!, linie.pfad[i + 1]!, 0), vp);
      xs.push(a);
      ys.push(b);
    }
    K.zug(xs, ys, r0, true);
    for (const p of linie.punkte) {
      const [px, py] = projizieren(new Vector3(p.x, p.y, 0), vp);
      const gross = p.i === punktUnterZeiger || punktZug?.i === p.i ? linienWerte.tropfen : 1;
      K.punkt(px, py, linienWerte.punktRadius * D * gross * s);
    }
  } else if (ansicht === 'front' || ansicht === 'top' || (ansicht === 'seite' && werkGezeigt)) {
    void k;
    const seg = umrissJetzt(ansicht === 'front' ? 0 : ansicht === 'top' ? 1 : 2);
    const g = K.neueGruppe();
    for (let i = 0; i < seg.length; i += 6) {
      const [ax, ay] = projizieren(new Vector3(seg[i]!, seg[i + 1]!, seg[i + 2]!), vp);
      const [bx, by] = projizieren(new Vector3(seg[i + 3]!, seg[i + 4]!, seg[i + 5]!), vp);
      K.push(ax, ay, bx, by, r0, r0, g, 0, false);
    }
  }
}

/**
 * Vier Ansichten: In den drei flachen Feldern nur Linien (Seite mit Punkten, Front und Top als Umriss). Beim Auf- und Zuklappen liegen
 * sie auf den Wänden, die sich zu den Feldern aufklappen (S10, `faltPunkt`). Dazu der Teiler: zwei Haarlinien und der Tropfen an ihrer
 * Kreuzung.
 */
function felderLinien(f: Falt, m: Moment): void {
  const k = koerper!;
  const { F, s4, sw } = f;
  const v = f.e;
  const r0 = (linienWerte.umriss / 2) * D;
  // Linien und Punkte werden auf dem Weg von der Wand ins Feld so breit wie im Feld (an der Wand wie in `wandLinien`)
  const st0 = waendeJetzt(m, true).staerke;
  const breite = (achse: number, punkt: boolean): number => {
    const ueber = wandSicht[achse * 2 + (sw[achse]! > 0 ? 1 : 0)]!;
    const w = punkt ? st0[achse]! * (0.55 + 0.45 * ueber) : bw.wandLinien * st0[achse]! * (0.82 + 0.18 * ueber);
    return w + (1 - w) * v;
  };
  // auf der Wand, die sich aufklappt; die Zeichnung gleitet dabei an ihren Platz
  const mischen = (n: FeldAchse, p: Vector3): [number, number] => {
    if (v > 0.999) return imFeld(n, p, F, s4);
    const [x, y] = projizieren(faltPunkt(n, p, f), f.vp);
    return [x, y];
  };
  for (const n of ['seite', 'front', 'top'] as const) {
    if (werkGezeigt && n === 'seite' && mitteDa()) continue;
    const achse = n === 'front' ? 0 : n === 'top' ? 1 : 2;
    const rl = r0 * breite(achse, false);
    const linie = n === 'seite' ? seitenLinie(2) : null;
    if (linie) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i < linie.pfad.length; i += 2) {
        const [a, b] = mischen(n, new Vector3(linie.pfad[i]!, linie.pfad[i + 1]!, 0));
        xs.push(a);
        ys.push(b);
      }
      K.zug(xs, ys, rl, true);
      for (const p of linie.punkte) {
        const [px, py] = mischen(n, new Vector3(p.x, p.y, 0));
        const gross = p.i === punktUnterZeiger || punktZug?.i === p.i ? linienWerte.tropfen : 1;
        K.punkt(px, py, linienWerte.punktRadius * D * gross * breite(achse, true));
      }
    } else if (n !== 'seite' || werkGezeigt) {
      void k;
      const seg = umrissJetzt(achse);
      const g = K.neueGruppe();
      for (let i = 0; i < seg.length; i += 6) {
        const [ax, ay] = mischen(n, new Vector3(seg[i]!, seg[i + 1]!, seg[i + 2]!));
        const [bx, by] = mischen(n, new Vector3(seg[i + 3]!, seg[i + 4]!, seg[i + 5]!));
        K.push(ax, ay, bx, by, rl, rl, g, 0, false);
      }
    }
  }
  // Teiler: zwei Haarlinien, an der Kreuzung ein Tropfen (schwillt beim Anflug, ist beim Ziehen ein Tropfen). S10: beim Auffalten liegen
  // sie auf den Kanten der Wände und gleiten mit ihnen (nichts doppelt)
  const rh = (linienWerte.innen / 2) * D * v;
  const anflug = teiler.zug ? 1 : teiler.ueber;
  const tropfen = linienWerte.punktRadius * D * (1 + (linienWerte.tropfen - 1) * anflug) * v;
  if (v <= 0.999) {
    const [kx, ky] = faltKanten(f, werte.kanten * Math.min(st0[0], st0[1], st0[2]) * raumSicht(), rh);
    K.punkt(kx, ky, tropfen);
    return;
  }
  const g = K.neueGruppe();
  const rand = bw.vierRand;
  const oben = document.body.classList.contains('bild') ? rand : 64;
  const tx = F.tx * D;
  const ty = F.ty * D;
  K.push(tx, oben * D, tx, (H - rand) * D, rh, rh, g, 0, false);
  K.push(rand * D, ty, (W - rand) * D, ty, rh, rh, g, 0, false);
  K.punkt(tx, ty, tropfen);
}

// ---------- Linien des Werks auf den Flächen (Phase 5.2) ----------

/** Blatt einer Achse (Einheiten des Werks, wie `werk.imBlatt`) → Welt, in der Ebene `lage` quer zur Achse */
function blattInWelt(a: Flaeche['a'], X: number, Y: number, lage: number): Vector3 {
  const f = werkHaut.f;
  const { x: mx, y: my } = werkHaut.mitte;
  return a === 'seite' ? new Vector3(X / f + mx, -Y / f + my, lage) : a === 'front' ? new Vector3(lage, -Y / f + my, X / f) : new Vector3(X / f + mx, lage, Y / f);
}
/** Welt → Blatt einer Achse */
function weltInBlatt(a: Flaeche['a'], p: Vector3): [number, number] {
  const f = werkHaut.f;
  const { x: mx, y: my } = werkHaut.mitte;
  return a === 'seite' ? [(p.x - mx) * f, -(p.y - my) * f] : a === 'front' ? [p.z * f, -(p.y - my) * f] : [(p.x - mx) * f, p.z * f];
}
const ACHSE_VON: Record<Flaeche['a'], 0 | 1 | 2> = { front: 0, top: 1, seite: 2 };
const BLATT_DER_ACHSE: Flaeche['a'][] = ['front', 'top', 'seite'];

/** eine Ebene quer zur Achse des Blatts (Wand oder eingerastete Ansicht), wie die Kamera sie sieht; `wand`: nur ihr Viereck zählt */
function ebene(a: Flaeche['a'], lage: number, vp: Matrix4, staerke: number, breite: number, wand: boolean): Flaeche {
  const achse = ACHSE_VON[a];
  const e = raum!;
  const her = (x: number, y: number): [number, number] | null => {
    const { o, d } = kam.strahl(x, y, W, H);
    const dd = achse === 0 ? d.x : achse === 1 ? d.y : d.z;
    const oo = achse === 0 ? o.x : achse === 1 ? o.y : o.z;
    if (Math.abs(dd) < 1e-9) return null;
    return weltInBlatt(a, o.clone().addScaledVector(d, (lage - oo) / dd));
  };
  // S7: zum Betrachter zeigt die Seite der Achse, auf der die Kamera steht (eine Wand liegt immer auf der anderen)
  const kp = kam.aktiv.position;
  const vorn = Math.sign([kp.x, kp.y, kp.z][achse]! - [e.cx, e.cy, 0][achse]!) || 1;
  return {
    a,
    staerke,
    breite,
    vorn,
    enthaelt: (x, y) => {
      if (!wand) return true;
      const XY = her(x, y);
      if (!XY) return false;
      const p = blattInWelt(a, XY[0], XY[1], lage);
      return Math.abs(p.x - e.cx) <= e.L && Math.abs(p.y - e.cy) <= e.L && Math.abs(p.z) <= e.L;
    },
    hin: (X, Y) => {
      const [x, y] = projizieren(blattInWelt(a, X, Y, lage), vp);
      return [x / D, y / D];
    },
    her,
  };
}

/** ein flaches Feld der Vier Ansichten; beim Auf- und Zuklappen auf seiner Wand, die sich aufklappt (wie `felderLinien`) */
function feldFlaeche(n: FeldAchse, f: Falt, st0: number[]): Flaeche {
  const e = raum!;
  const { F, s4, sw } = f;
  const achse = ACHSE_VON[n];
  const lage = [e.cx, e.cy, 0][achse]! + sw[achse] * e.L;
  const r = F[n];
  // auf dem Weg von der Wand ins Feld so stark und breit wie an der Wand, am Ende wie im Feld
  const t = f.e;
  const st = st0[achse]!;
  return {
    a: n,
    staerke: st + (1 - st) * t,
    breite: bw.wandLinien + (1 - bw.wandLinien) * t,
    // S7: ein Feld ist seine Wand, aufgeklappt: Betrachter auf der anderen Seite
    vorn: -sw[achse] || 1,
    enthaelt: (x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
    hin: (X, Y) => {
      if (t > 0.999) {
        const [fx, fy] = imFeld(n, blattInWelt(n, X, Y, 0), F, s4);
        return [fx / D, fy / D];
      }
      const [ux, uy] = projizieren(faltPunkt(n, blattInWelt(n, X, Y, lage), f), f.vp);
      return [ux / D, uy / D];
    },
    her: (x, y) => {
      // ausFeld: Seite (x, y), Front (z, y), Top (x, z) der Welt
      const [u, w] = ausFeld(n, x, y, F, s4);
      return weltInBlatt(n, n === 'seite' ? new Vector3(u, w, 0) : n === 'front' ? new Vector3(0, w, u) : new Vector3(u, 0, w));
    },
  };
}

/** Flächen dieses Bilds mit den Linien des Werks, und ob sie stehen (dann bedient das Verhalten sie) */
function flaechenJetzt(vp: Matrix4, m: Moment): { flaechen: Flaeche[]; stabil: boolean } {
  const e = raum!;
  const liste: Flaeche[] = [];
  // Wände (wie `wandLinien`): die drei abgewandten, mit ihrer Stärke. Die Wand der Ansicht, in die es einrastet (oder aus der es kommt),
  // wird zum Blatt: Ihre Zeichnung wandert zur Mitte der Form und wird so stark wie das Blatt (nichts wird überblendet oder doppelt gezeigt)
  const { s, staerke } = waendeJetzt(m);
  const blatt = blattModus();
  const achsen = blatt ? new Set<number>() : blattAchsen();
  const pb = glatt(flach);
  const g6 = wandGewichte();
  for (const achse of [0, 1, 2] as const) {
    const wandLage = [e.cx, e.cy, 0][achse]! + s[achse] * e.L;
    if (achsen.has(achse)) {
      const mitteLage = [e.cx, e.cy, 0][achse]!;
      const st = Math.max(staerke[achse], Math.max(g6[2 * achse]!, g6[2 * achse + 1]!) * flach * flach);
      if (st >= 0.01) liste.push(ebene(BLATT_DER_ACHSE[achse]!, wandLage + (mitteLage - wandLage) * pb, vp, st, bw.wandLinien + (1 - bw.wandLinien) * pb, pb < 0.5));
      continue;
    }
    if (staerke[achse] < 0.01) continue;
    liste.push(ebene(BLATT_DER_ACHSE[achse]!, wandLage, vp, staerke[achse], bw.wandLinien, true));
  }
  // eingerastet (wie `linienDerAnsicht`): auf der Ebene durch die Mitte der Form
  if (blatt && ansicht !== 'raum') {
    const blick = new Vector3();
    kam.aktiv.getWorldDirection(blick);
    const t = wendenSicht ? 1 : Math.min(1, Math.max(0, (Math.abs(blick.dot(VORN[ansicht])) - 0.97) / 0.025));
    const st = flach * flach * t * t * (3 - 2 * t);
    if (st >= 0.01) liste.push(ebene(ansicht, ansicht === 'seite' ? 0 : ansicht === 'front' ? e.cx : e.cy, vp, st, 1, false));
  }
  // die drei flachen Felder (S10: beim Auffalten von Anfang an, sie zeigen dann die Zeichnungen der Wände)
  if (faltJetzt) {
    const st0 = waendeJetzt(m, true).staerke;
    for (const n of ['seite', 'front', 'top'] as const) liste.push(feldFlaeche(n, faltJetzt, st0));
  }
  const ruhig = zustand === 'ruhe' && !ansichtFahrt && !vierFahrt;
  const stabil = ruhig && (vier > 0.999 || (vier < 0.001 && (flach > 0.999 || flach < 0.001)));
  return { flaechen: liste, stabil };
}

/**
 * Die Linien des Werks auf allen Flächen. Stehen die Flächen, bedient das Verhalten der Linien-Studie sie (Linien, Punkte, Tropfen,
 * Nadel, Auswahl, Zeiger); dazwischen zeichnet Ozzy dieselben Linien und Punkte schlicht.
 */
function werkLinien(vp: Matrix4, m: Moment, dt: number): { zeiger: Szene['zeiger'] | undefined; aktiv: boolean } {
  const { flaechen, stabil } = flaechenJetzt(vp, m);
  werkBlatt.bauen(flaechen, uhr);
  bearbeitenAn = stabil;
  // P in der Leiste, sobald das Werk bedient wird
  if (bearbeitenAn !== pErlaubt) {
    pErlaubt = bearbeitenAn;
    for (const n of ['p', 'frei', 'formen', 'lasso'] as const) leiste.erlauben(n, pErlaubt);
    // im Raum zeigt die Leiste das Werkzeug des Raums (anfangs die Auswahl, kein Tropfen), nicht das des Blatts
    if (pErlaubt) leiste.setzen(raumWerkzeug);
  }
  if (!bearbeitenAn && bearbeitenGedrueckt) {
    bearbeiten.loslassen();
    bearbeitenGedrueckt = false;
  }
  // Linien ohne Pfad (noch keine Griffe): nur zu sehen
  for (const r of werkBlatt.roh) {
    const F = flaechen[r.fl]!;
    K.zug(
      r.x.map((v) => v * D),
      r.y.map((v) => v * D),
      (linienWerte.innen / 2) * D * F.breite * F.staerke,
      false,
    );
  }
  // Freihand und Formen im Zug: der Strich und die Form, dazu ein Tropfen am Zeiger (wie auf dem Blatt)
  const rs = (linienWerte.umriss / 2) * D;
  if (raumStrich) {
    raumStrich.st.spur.push(...raumStrich.st.g.takt(performance.now()));
    const sp = raumStrich.st.spur;
    if (sp.length > 1) K.zug(sp.map((p) => p.x * D), sp.map((p) => p.y * D), rs, false);
  }
  if (raumAufzug) {
    const pf = aufzugPfad(raumAufzug.art, raumAufzug.von, raumAufzug.bis, bearbeiten.umschalt, bearbeiten.alt);
    if (pf) {
      const xs: number[] = [];
      const ys: number[] = [];
      const A = pf.anker;
      for (let i = 0; i < A.length; i++) {
        const a = A[i]!;
        const b = A[(i + 1) % A.length]!;
        const k = [a.x, a.y, a.x + (a.aus?.x ?? 0), a.y + (a.aus?.y ?? 0), b.x + (b.ein?.x ?? 0), b.y + (b.ein?.y ?? 0), b.x, b.y];
        for (let j = 0; j < 24; j++) {
          const t = j / 24;
          const u = 1 - t;
          xs.push((u * u * u * k[0]! + 3 * u * u * t * k[2]! + 3 * u * t * t * k[4]! + t * t * t * k[6]!) * D);
          ys.push((u * u * u * k[1]! + 3 * u * u * t * k[3]! + 3 * u * t * t * k[5]! + t * t * t * k[7]!) * D);
        }
      }
      K.zug(xs, ys, rs, true);
    }
  }
  if (bearbeitenAn && strichWerkzeug() && zeiger.da) K.punkt(zeiger.x * D, zeiger.y * D, linienWerte.punktRadius * linienWerte.tropfen * D);
  // der Pinsel: am Punkt, den er fassen würde (oder gerade zieht), ein Tropfen
  if (pinselZiel && (pinselZug || hauch.ziel > 0)) {
    // im Zug geht der Tropfen mit dem Punkt (so, wie das Werk ihn gerade zeigt)
    const z = pinselZiel;
    const jetzt = pinselZug
      ? werk.alsAnzeige(() => {
          const p = werk.loops[werk.loopNr(z.id)]?.punkte[z.i];
          if (!p) return z.welt;
          const q = werk.zug && !werk.zug.griff ? p.cur : p.ref;
          return werkInWelt(z.m ? { x: q.x, y: q.y, z: -q.z } : q);
        })
      : z.welt;
    const [px, py] = projizieren(jetzt, vp);
    K.punkt(px, py, linienWerte.punktRadius * linienWerte.tropfen * D);
  }
  if (bearbeitenAn) {
    if (werkBlatt.struktur !== bearbeitenStruktur) {
      bearbeiten.tropfen = [];
      bearbeitenStruktur = werkBlatt.struktur;
    }
    bearbeiten.setzeNetz(werkBlatt.netz, werkBlatt.proben);
    bearbeiten.auswahl = werkBlatt.auswahlAbgleichen(bearbeiten.auswahl);
    bearbeitenAnsicht.dpr = D;
    bearbeiten.setzeAnsicht(bearbeitenAnsicht);
    const aktiv = bearbeiten.schritt(dt) || !!raumStrich || !!raumAufzug || werkBlatt.fliesst;
    const sz = bearbeiten.szene(bearbeitenAnsicht);
    K.uebernehmen(sz);
    // mit Freihand und Formen ist es Ozzys Zeiger (das Verhalten hat dann keinen)
    return { zeiger: strichWerkzeug() ? (zeiger.da ? zeigerForm(zeiger.x, zeiger.y) : null) : sz.zeiger, aktiv };
  }
  for (const P of werkBlatt.proben) {
    const g = K.neueGruppe();
    for (let j = 0; j + 1 < P.n; j++) K.push(P.x[j]! * D, P.y[j]! * D, P.x[j + 1]! * D, P.y[j + 1]! * D, P.halb[j]! * D, P.halb[j + 1]! * D, g, 0, false);
  }
  werkBlatt.netz.punkte.forEach((p, pi) => {
    const A = werkBlatt.anker[pi]!;
    const F = flaechen[A.fl]!;
    if (A.zuSehen) K.punkt(p.x * D, p.y * D, linienWerte.punktRadius * D * Math.min(1, F.staerke));
  });
  return { zeiger: undefined, aktiv: werkBlatt.fliesst };
}

// ---------- Pinsel an der Blase (Phase 6) ----------

/** Werk → Welt (in der Pose: so, wie gezeigt) */
const werkInWelt = (q: { x: number; y: number; z: number }): Vector3 => new Vector3(q.x / werkHaut.f + werkHaut.mitte.x, q.y / werkHaut.f + werkHaut.mitte.y, q.z / werkHaut.f);

/** der Strahl unter dem Zeiger trifft die Haut des Werks (wie sie zu sehen ist): Ort in Welt und Werk, oder null */
function werkHautTreffen(x: number, y: number): { welt: Vector3; werk: { x: number; y: number; z: number } } | null {
  const { o, d } = kam.strahl(x, y, W, H);
  const f = werkHaut.f;
  const ox = (o.x - werkHaut.mitte.x) * f;
  const oy = (o.y - werkHaut.mitte.y) * f;
  const oz = o.z * f;
  return werk.alsAnzeige(() => {
    const P = werk.haut.pos;
    const T = werk.haut.tri;
    let best = Infinity;
    for (let t = 0; t < T.length; t += 3) {
      const a = 3 * T[t]!;
      const b = 3 * T[t + 1]!;
      const c = 3 * T[t + 2]!;
      const e1x = P[b]! - P[a]!;
      const e1y = P[b + 1]! - P[a + 1]!;
      const e1z = P[b + 2]! - P[a + 2]!;
      const e2x = P[c]! - P[a]!;
      const e2y = P[c + 1]! - P[a + 1]!;
      const e2z = P[c + 2]! - P[a + 2]!;
      const px = d.y * e2z - d.z * e2y;
      const py = d.z * e2x - d.x * e2z;
      const pz = d.x * e2y - d.y * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det;
      const tx = ox - P[a]!;
      const ty = oy - P[a + 1]!;
      const tz = oz - P[a + 2]!;
      const u = (tx * px + ty * py + tz * pz) * inv;
      if (u < 0 || u > 1) continue;
      const qx = ty * e1z - tz * e1y;
      const qy = tz * e1x - tx * e1z;
      const qz = tx * e1y - ty * e1x;
      const v = (d.x * qx + d.y * qy + d.z * qz) * inv;
      if (v < 0 || u + v > 1) continue;
      const s = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (s > 1e-6 && s < best) best = s;
    }
    if (!Number.isFinite(best)) return null;
    const werkOrt = { x: ox + d.x * best, y: oy + d.y * best, z: oz + d.z * best };
    return { welt: werkInWelt(werkOrt), werk: werkOrt };
  });
}

/** der nächste sichtbare Punkt einer Linie (auch sein Spiegelbild) im Radius des Pinsels um einen Ort im Werk, wie gezeigt */
function pinselPunkt(q: { x: number; y: number; z: number }): { id: number; i: number; m: boolean; welt: Vector3 } | null {
  return werk.alsAnzeige(() => {
    let best: { id: number; i: number; m: boolean; welt: Vector3 } | null = null;
    let bd = pinselRadius;
    for (const l of werk.loops) {
      l.punkte.forEach((p, i) => {
        if (p.vonSelbst) return;
        for (const m of Math.abs(p.ref.z) > 1e-6 ? [false, true] : [false]) {
          const r = m ? { x: p.ref.x, y: p.ref.y, z: -p.ref.z } : p.ref;
          const dd = Math.hypot(r.x - q.x, r.y - q.y, r.z - q.z);
          if (dd < bd) {
            bd = dd;
            best = { id: l.id, i, m, welt: werkInWelt(r) };
          }
        }
      });
    }
    return best;
  });
}

/** der Pinsel nach der Größe der Form: 0,4 ihrer größten halben Ausdehnung (Einheiten des Werks; an der Startkugel 60) */
const PINSEL_ANTEIL = 0.4;
function pinselNachForm(): void {
  const P = werk.haut.pos;
  const a = [Infinity, Infinity, Infinity];
  const b = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3)
    for (let k = 0; k < 3; k++) {
      a[k] = Math.min(a[k]!, P[i + k]!);
      b[k] = Math.max(b[k]!, P[i + k]!);
    }
  const r = Math.max((b[0]! - a[0]!) / 2, (b[1]! - a[1]!) / 2, (b[2]! - a[2]!) / 2);
  if (r > 0 && Number.isFinite(r)) pinselRadius = PINSEL_ANTEIL * r;
}

/** wo der Pinsel wirkt: im Raum und im Feld des Raums der Vier Ansichten (eingerastet nicht: dort gibt es nur Linien) */
function pinselHier(x: number, y: number): boolean {
  if (zustand !== 'ruhe' || flach > 0.5) return false;
  if (vier > 0.5) {
    const R = felder().raum;
    return x >= R.x && y >= R.y && x <= R.x + R.w && y <= R.y + R.h;
  }
  return vier < 0.1;
}

/** Drücken mit dem Pinsel: den nächsten Punkt fassen und mit O ziehen (im Blatt der Achse, die der Kamera am meisten zugewandt ist) */
function pinselBeginnen(x: number, y: number): boolean {
  const t = werkHautTreffen(x, y);
  const z = t ? pinselPunkt(t.werk) : null;
  if (!t) return false;
  if (!z) {
    werk.G.meldung = 'Pinsel: keine Linie in Reichweite. Näher an eine Linie oder den Pinsel größer ([ und ])';
    return false;
  }
  const blick = new Vector3();
  kam.aktiv.getWorldDirection(blick);
  const ax = Math.abs(blick.x) >= Math.abs(blick.y) && Math.abs(blick.x) >= Math.abs(blick.z) ? 0 : Math.abs(blick.y) >= Math.abs(blick.z) ? 1 : 2;
  const a = BLATT_DER_ACHSE[ax]!;
  const F = ebene(a, ax === 0 ? z.welt.x : ax === 1 ? z.welt.y : z.welt.z, vpJetzt(), 1, 1, false);
  const XY = F.her(x, y);
  if (!XY) return false;
  werk.G.auswahl = [{ l: z.id, i: z.i }];
  werk.G.oAn = true;
  werk.G.radius = pinselRadius;
  werk.G.maus = { a, X: XY[0], Y: XY[1] };
  if (werk.griffWartet()) werk.G.gegriffen = { a, X: XY[0], Y: XY[1], m: z.m, griff: null, seit: performance.now() };
  else werk.zugStarten(null, a, XY[0], XY[1], z.m);
  pinselZug = { F };
  werkNeu = true;
  return true;
}

function pinselBewegen(x: number, y: number): void {
  const z = pinselZug;
  const XY = z?.F.her(x, y);
  if (!z || !XY) return;
  werk.G.maus = { a: z.F.a, X: XY[0], Y: XY[1] };
  if (werk.zug && !werk.zug.modal && werk.zug.ansicht === z.F.a) werk.zugBewegen(XY[0], XY[1]);
}

function pinselEnde(): void {
  if (!pinselZug) return;
  pinselZug = null;
  if (werk.G.gegriffen) werk.G.gegriffen = null;
  else if (werk.zug && !werk.zug.modal) werk.zugEnde(true);
  // O ist nur der Pinsel: danach wieder aus (der Zug hat seine Gewichte beim Beginnen genommen)
  werk.G.oAn = false;
  // der Punkt unter dem Pinsel ergibt sich mit der nächsten Bewegung neu
  pinselZiel = null;
  werkNeu = true;
}

// ---------- Eingaben ----------

function lageIm(e: PointerEvent | WheelEvent): [number, number] {
  const r = leinwandLinien.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

/** Winkel einer Ansicht (Grad, Gier und Neigung), auf Wunsch von der Gegenseite */
function ansichtWinkel(ziel: Ansicht, hinten: boolean): [number, number] | null {
  const w = ANSICHT_WINKEL[ziel];
  if (!w || !hinten) return w;
  return ziel === 'top' ? [w[0], -w[1]] : [w[0] + 180, w[1]];
}

/** in eine Ansicht fahren (Raum oder Achse): Drehen und Parallele zugleich, kürzester Weg, die Größe bleibt; `hinten`: Gegenseite */
function ansichtSetzen(ziel: Ansicht, hinten = false): void {
  if (zustand !== 'ruhe' && zustand !== 'auf') return;
  const heimVorher = heimJetzt();
  schwung = null;
  gewendet = ziel !== 'raum' && hinten;
  const w = ansichtWinkel(ziel, hinten);
  const g1 = w ? (w[0] * Math.PI) / 180 - (werte.gier * Math.PI) / 180 : 0;
  const n1 = w ? (w[1] * Math.PI) / 180 - (werte.neigung * Math.PI) / 180 : 0;
  let g0 = nutzer.gier;
  while (g0 - g1 > Math.PI) g0 -= 2 * Math.PI;
  while (g1 - g0 > Math.PI) g0 += 2 * Math.PI;
  // dieselbe Ansicht von der anderen Seite: Das Blatt wendet sich (die Linien bleiben beim Drehen zu sehen)
  if (ziel === ansicht && ziel !== 'raum' && flach > 0.5) wendenSicht = true;
  const winkel = Math.hypot(g1 - g0, n1 - nutzer.neigung);
  const senke = w && flach > 0.5 && !wendenSicht ? Math.min(0.7, (0.7 * winkel) / (Math.PI / 2)) : 0;
  ansichtFahrt = { von: [g0, nutzer.neigung, flach], nach: [g1, n1, w ? 1 : 0], t: 0, senke, vonAnsicht: ansicht, heimVon: heimVorher };
  ansicht = ziel;
  punktZug = null;
  anstossen();
}

/** die Ansicht (von den sechs: Seite, Front, Top und ihre Gegenseiten) nahe dieser Richtung (Gier, Neigung in rad von Hand), oder null */
function ansichtNahe(gierHand: number, neigungHand: number, grenze = bw.einrasten): { a: Ansicht; hinten: boolean } | null {
  const g = ((werte.gier * Math.PI) / 180 + gierHand) * (180 / Math.PI);
  const n = ((werte.neigung * Math.PI) / 180 + neigungHand) * (180 / Math.PI);
  const nah = (a: number, b: number): number => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
  // die nächste der sechs Ansichten innerhalb der Grenze (Top und Unten: nur die Neigung zählt)
  let best: { a: Ansicht; hinten: boolean } | null = null;
  let bd = Infinity;
  for (const a of ['seite', 'front', 'top'] as const)
    for (const hinten of [false, true]) {
      const w = ansichtWinkel(a, hinten)!;
      const dn = Math.abs(n - w[1]);
      const d = a === 'top' ? dn : Math.max(dn, nah(g, w[0]));
      if (d < grenze && d < bd) {
        bd = d;
        best = { a, hinten };
      }
    }
  return best;
}
/** mit Schwung zieht eine Ansicht von weiter her an (Grad um das vorausberechnete Ziel) */
const SCHWUNG_FANG = 20;

/** sieht die Kamera gerade die Rückseite dieser Ansicht (gegen ihre Blickrichtung)? */
function rueckseite(a: Ansicht): boolean {
  if (a === 'raum') return false;
  const blick = new Vector3();
  kam.aktiv.getWorldDirection(blick);
  return blick.dot(VORN[a]) < 0;
}

/** das Schwarz der Rückseite: Feder zum Ziel, die Kante als Vieleck mit Welle (clip-path); true, solange es sich bewegt */
/** eingerastet, ohne Fahrt in eine andere Ansicht (Wenden zählt dazu): Die Rückseite ist die Kante der Blaupause */
function blattModus(): boolean {
  if (ansicht === 'raum') return false;
  if (wenden) return true;
  if (ansichtFahrt) return wendenSicht && flach >= 0.999;
  return flach >= 0.999;
}

/** Achsen, deren Wand gerade zum Blatt wird oder vom Blatt zurück: die Ansicht und, während einer Fahrt, die, aus der sie kommt */
function blattAchsen(): Set<number> {
  const s = new Set<number>();
  if (ansicht !== 'raum') s.add(ACHSE_VON[ansicht]);
  const v = ansichtFahrt?.vonAnsicht;
  if (v && v !== 'raum') s.add(ACHSE_VON[v]);
  return s;
}

/** „vorn“ einer Ansicht als Blickrichtung: eingerastet ihre Vorderseite, im Raum seine Hausansicht */
function heimVon(a: Ansicht): Vector3 {
  if (a !== 'raum') return VORN[a].clone();
  return richtung((werte.gier * Math.PI) / 180, (werte.neigung * Math.PI) / 180).negate();
}

/** zwischen zwei Richtungen auf der Kugel (e = 0 … 1) */
function kugelMitte(a: Vector3, b: Vector3, e: number): Vector3 {
  const w = Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
  if (w < 1e-4) return a.clone().lerp(b, e).normalize();
  const s = Math.sin(w);
  return a.clone().multiplyScalar(Math.sin((1 - e) * w) / s).add(b.clone().multiplyScalar(Math.sin(e * w) / s));
}

/** „vorn“ jetzt: während einer Fahrt dreht es mit von der alten Ansicht zur neuen (so springt die Kante nicht) */
function heimJetzt(): Vector3 {
  const ziel = heimVon(ansicht);
  const f = ansichtFahrt;
  if (!f?.heimVon) return ziel;
  const t = Math.min(1, f.t);
  return kugelMitte(f.heimVon, ziel, t * t * t * (t * (t * 6 - 15) + 10));
}

/**
 * Die Kante der Blaupause (wie `sigmaWerte` in `/editor`): eine Gerade im Bild, senkrecht zur Projektion von „vorn“, im Abstand
 * A · cos · 1,5 · Halbmesser / sin von der Mitte der Form; bei 90° geht sie durch die Mitte. Als Kante einer Fläche (innen = hinten).
 */
function kanteMitHeim(heim: Vector3, vp: Matrix4): number[] {
  const e = raum!;
  const c = kam.aktiv;
  const vor = new Vector3();
  c.getWorldDirection(vor);
  const re = new Vector3().setFromMatrixColumn(c.matrixWorld, 0).normalize();
  const ob = new Vector3().setFromMatrixColumn(c.matrixWorld, 1).normalize();
  // in der Blaupause sind Blick und „vorn“ Richtungen zur Kamera hin
  const fr = heim.clone().negate();
  const mitte = new Vector3(e.cx, e.cy, 0);
  const [mx, my] = projizieren(mitte, vp);
  const [rx, ry] = projizieren(mitte.clone().add(re), vp);
  const ppu = Math.hypot(rx - mx, ry - my);
  const s0 = KANTE_A * vor.dot(heim) * ppu * 1.5 * e.R;
  const nx = re.dot(fr);
  const ny = -ob.dot(fr);
  const len = Math.hypot(nx, ny);
  if (len < 1e-6) return [0, 0, s0 >= 0 ? -1e6 : 1e6];
  return [-nx / len, -ny / len, -Math.max(-1e7, Math.min(1e7, (s0 - nx * mx - ny * my) / len))];
}

/** die Rückseite in diesem Bild: die Kante gegen „vorn“ (eingerastet die Ansicht, im Raum die Hausansicht, bei Fahrten gedreht) */
function hintenRechnen(): Hinten | null {
  const e = raum;
  if (!e || zustand === 'blatt' || vier > 0.02) return null;
  const k = kanteMitHeim(heimJetzt(), vpJetzt());
  const h: Hinten = { kanten: [...k, 0, 0, 1e6, 0, 0, 1e6, 0, 0, 1e6, 0, 0, 1e6], zahl: 1 };
  // nur, wenn sie ins Bild reicht (eine Halbebene: dann an einer Ecke)
  const wd = W * D;
  const hd = H * D;
  return Math.max(hintenBei(h, 0, 0), hintenBei(h, wd, 0), hintenBei(h, 0, hd), hintenBei(h, wd, hd)) > 0 ? h : null;
}

/** das Blatt, das sich beim Einrasten durch die Blase schiebt (beim Lösen zurück): von hinter der Form bis vor sie, mit `flach` */
function schnittRechnen(): [number, number, number, number] | null {
  const e = raum;
  if (!e || zustand === 'blatt') return null;
  const a = ansicht !== 'raum' ? ansicht : ansichtFahrt?.vonAnsicht;
  if (!a || a === 'raum') return null;
  const p = glatt(flach);
  if (p < 1e-3) return null;
  const achse = ACHSE_VON[a];
  const mitte = [e.cx, e.cy, 0][achse]!;
  const c = kam.aktiv.position;
  const t = [c.x, c.y, c.z][achse]! - mitte >= 0 ? 1 : -1;
  const halb = (achse === 0 ? e.rx : achse === 1 ? e.ry : e.tiefe) * 1.15 + 1;
  const q = mitte + t * halb * (2 * p - 1);
  const n = [0, 0, 0];
  n[achse] = t;
  return [n[0]!, n[1]!, n[2]!, t * q];
}

/** wie dunkel ein Bildpunkt ist (Gerätepunkte, wie im Shader) */
function hintenBei(h: Hinten | null, x: number, y: number): number {
  if (!h) return 0;
  let best = 0;
  for (let k = 0; k < Math.min(4, h.zahl); k++) {
    let d = 1;
    for (let j = 0; j < 5; j++) {
      const i = (k * 5 + j) * 3;
      d = Math.min(d, Math.max(0, Math.min(1, 0.5 + h.kanten[i]! * x + h.kanten[i + 1]! * y + h.kanten[i + 2]!)));
    }
    best = Math.max(best, d);
  }
  return best;
}

/** Marke und Hinweis kehren ihre Farbe um, solange Rückseite zu sehen ist; Werte für die Proben */
function hintenZeigen(): void {
  const m = raum ? projizieren(new Vector3(raum.cx, raum.cy, 0), vpJetzt()) : [(W * D) / 2, (H * D) / 2];
  kanteMitte = hintenBei(hintenJetzt, m[0]!, m[1]!);
  kanteSichtbar = !!hintenJetzt && hintenJetzt.zahl > 0;
  document.body.classList.toggle('wende-an', kanteSichtbar);
}

/** nahe einer der sechs Ansichten: einrasten (nach dem Drehen von Hand) */
function einrasten(): void {
  const z = ansichtNahe(nutzer.gier, nutzer.neigung);
  if (z) ansichtSetzen(z.a, z.hinten);
}

/** Punkt der Silhouette unter dem Zeiger: an der Wand der Seite, in der eingerasteten Seite oder im Feld der Seite (−1 = keiner) */
function punktSuchen(x: number, y: number): { i: number; ort: 'wand' | 'flach' | 'feld'; z: number } | null {
  // mit dem Werk greift das Verhalten der Studie (`werkLinien`)
  if (!raum || zustand !== 'ruhe' || werkGezeigt) return null;
  const linie = seitenLinie(4);
  if (!linie) return null;
  const vp = vpJetzt();
  const fang = 11;
  let best: { i: number; ort: 'wand' | 'flach' | 'feld'; z: number } | null = null;
  let bd = fang;
  const pruefen = (i: number, px: number, py: number, ort: 'wand' | 'flach' | 'feld', z: number): void => {
    const d = Math.hypot(px / D - x, py / D - y);
    if (d < bd) {
      bd = d;
      best = { i, ort, z };
    }
  };
  if (vier > 0.9) {
    const F = felder();
    const s4 = feldMassstab(F);
    for (const p of linie.punkte) {
      const [px, py] = imFeld('seite', new Vector3(p.x, p.y, 0), F, s4);
      pruefen(p.i, px, py, 'feld', 0);
    }
    return best;
  }
  if (ansicht === 'seite' && flach > 0.85) {
    for (const p of linie.punkte) {
      const [px, py] = projizieren(new Vector3(p.x, p.y, 0), vp);
      pruefen(p.i, px, py, 'flach', 0);
    }
    return best;
  }
  if (ansicht === 'raum' && flach < 0.2) {
    const g6 = wandGewichte();
    const sz = g6[4]! >= g6[5]! ? -1 : 1;
    if (Math.max(g6[4]!, g6[5]!) < 0.5) return null;
    const z = sz * raum.L;
    for (const p of linie.punkte) {
      const [px, py] = projizieren(new Vector3(p.x, p.y, z), vp);
      pruefen(p.i, px, py, 'wand', z);
    }
  }
  return best;
}

/** Lage des Zeigers im Blatt der Seite des Werks (x, −y in Einheiten des Werks), je nach Ort des Zugs */
function werkLage(x: number, y: number, pz: NonNullable<typeof punktZug>): [number, number] | null {
  const lage = punktLage(x, y, pz);
  if (!lage) return null;
  const f = werkHaut.f;
  const wx = (lage[0] - W / 2 - werkHaut.mitte.x) * f;
  const wy = (H / 2 - lage[1] - werkHaut.mitte.y) * f;
  return [wx, -wy];
}

/** Einen Punkt der Linie der Mitte im Werk greifen (wie im Prüffenster: wählen, dann ziehen; wartet der Griff, beginnt er später) */
function werkGreifen(x: number, y: number, pz: NonNullable<typeof punktZug>): void {
  const m = mitteLinie();
  const XY = werkLage(x, y, pz);
  if (!m || !XY) return;
  werk.G.auswahl = [{ l: m.l.id, i: pz.i }];
  werk.anzeige.allesZeigen();
  werk.G.maus = { a: 'seite', X: XY[0], Y: XY[1] };
  if (werk.griffWartet()) werk.G.gegriffen = { a: 'seite', X: XY[0], Y: XY[1], m: false, griff: null, seit: performance.now() };
  else werk.zugStarten(null, 'seite', XY[0], XY[1], false);
}

/** Wand unter dem Zeiger (nur die sichtbaren, fernen), −1 = keine */
function wandSuchen(x: number, y: number): number {
  const e = raum;
  if (!e || zustand !== 'ruhe' || flach > 0.5 || vier > 0.1) return -1;
  const { o, d } = kam.strahl(x, y, W, H);
  const g6 = wandGewichte();
  const mitte = [e.cx, e.cy, 0];
  let best = -1;
  let bt = Infinity;
  for (let w = 0; w < 6; w++) {
    if (g6[w]! < 0.5) continue;
    const achse = Math.floor(w / 2);
    const seite = w % 2 === 0 ? -1 : 1;
    const dd = achse === 0 ? d.x : achse === 1 ? d.y : d.z;
    const oo = achse === 0 ? o.x : achse === 1 ? o.y : o.z;
    if (Math.abs(dd) < 1e-9) continue;
    const t = (mitte[achse]! + seite * e.L - oo) / dd;
    if (t <= 0 || t >= bt) continue;
    const q = o.clone().addScaledVector(d, t);
    const p = [q.x - mitte[0]!, q.y - mitte[1]!, q.z - mitte[2]!];
    if ([0, 1, 2].every((a) => a === achse || Math.abs(p[a]!) <= e.L + 1)) {
      bt = t;
      best = w;
    }
  }
  return best;
}

/** Treffer auf der Blase (im Raum oder im vierten Feld) */
function blaseTreffen(x: number, y: number): { x: number; y: number; z: number; tri: number } | null {
  // eingerastet ist die Blase ausgeblendet: dort gibt es nur die Linien. An der Haut des Werks zieht (noch) nichts: Sie folgt den
  // Linien (der Pinsel „Ziehen“ kommt mit Phase 6, nur mit dem, was die Rechnung kann)
  if (!koerper || zustand !== 'ruhe' || flach > 0.5 || werkGezeigt) return null;
  if (vier > 0.5) {
    const R = felder().raum;
    if (x < R.x || y < R.y || x > R.x + R.w || y > R.y + R.h) return null;
  }
  const { o, d } = kam.strahl(x, y, W, H);
  return koerper.treffen(o.x, o.y, o.z, d.x, d.y, d.z);
}

function hauchSuchen(x: number, y: number): boolean {
  const t = blaseTreffen(x, y);
  if (t) {
    hauch.pos.set(t.x, t.y, t.z);
    hauch.ziel = 1;
    return true;
  }
  hauch.ziel = 0;
  return false;
}

function amTeiler(x: number, y: number): boolean {
  if (vier < 0.9 || zustand !== 'ruhe') return false;
  const F = felder();
  return Math.hypot(x - F.tx, y - F.ty) < 14;
}

/** nach dem Ziehen eines Punkts: die Blase in Ruhe in der neuen Form (die Kamera bleibt, wo sie ist) */
function blaseNeu(): void {
  if (!koerper) return;
  const alt = raum;
  netzBauen();
  if (!koerper || !alt) return;
  const ms = masse();
  koerper.setzen(moment(99, ms, werte).lage);
  koerper.bezugRuhe();
  koerper.dehnungRechnen();
  haut.hochladen();
  umbauZeit = performance.now();
}

/** Lage des Zeigers als Punkt der Silhouette (CSS-Pixel des Blatts), je nach Ort des Zugs */
function punktLage(x: number, y: number, pz: NonNullable<typeof punktZug>): [number, number] | null {
  if (pz.ort === 'feld') {
    const F = felder();
    const [wx, wy] = ausFeld('seite', x, y, F, feldMassstab(F));
    return [wx + W / 2, H / 2 - wy];
  }
  const { o, d } = kam.strahl(x, y, W, H);
  if (Math.abs(d.z) < 1e-9) return null;
  const t = (pz.z - o.z) / d.z;
  return [o.x + d.x * t + W / 2, H / 2 - (o.y + d.y * t)];
}

let letzteZeit = 0;

/** Drehen von Hand löst eine eingerastete Ansicht: nur die Parallele löst sich (die Drehung gehört der Hand, S4) */
function ansichtLoesen(): void {
  if (ansicht === 'raum') return;
  const vorher = ansicht;
  const heimVorher = heimJetzt();
  ansicht = 'raum';
  gewendet = false;
  ansichtFahrt = { von: [nutzer.gier, nutzer.neigung, flach], nach: [nutzer.gier, nutzer.neigung, 0], t: 0, nurFlach: true, vonAnsicht: vorher, heimVon: heimVorher };
}

// ---------- S12: Stift und Finger (iPad) ----------
//
// Der Stift ist der Zeiger: Er macht alles wie die Maus, schwebend zeigt er Zeiger und Anschwellen. Ein Finger dreht; solange noch kein
// Stift da war, macht er alles wie die Maus (ab dem ersten Stift ändern Finger nichts mehr an der Form). Zwei Finger: auseinander und
// zusammen zoomt zu den Fingern hin, verschieben schwenkt, verdrehen dreht um die Hochachse (wie Apples Vorschau für 3D); beim Loslassen
// rastet es nahe einer Ansicht ein. Diese Weiche hört vor der Bühne zu (Fangphase am Fenster) und lässt alles andere durch.

/** Finger auf der Bühne (Kennung → Lage, CSS); ob schon ein Stift da war */
const finger = new Map<number, { x: number; y: number }>();
let stiftGesehen = false;
/** die Geste mit zwei Fingern; danach tut der verbliebene Finger nichts mehr, bis er abhebt */
let geste: { d0: number; w0: number; m0: { x: number; y: number }; zoom0: number; gier0: number; sx0: number; sy0: number; gedreht: boolean } | null = null;
let gesteRest = false;
/** so weit müssen zwei Finger verdreht sein, bevor es dreht (sonst dreht schon das Zoomen) */
const GESTE_DREHEN_AB = (6 * Math.PI) / 180;

/** zum Prüfen (`?info=1`): die letzten Zeiger nach Art und Ereignis */
const zeigerZaehler: Record<string, number> = {};
// Safari (iPad) hat eigene Gesten für zwei Finger (die Seite zoomen): Ozzy übernimmt sie selbst
for (const art of ['gesturestart', 'gesturechange', 'gestureend'])
  document.addEventListener(art, (e) => e.preventDefault(), { passive: false } as AddEventListenerOptions);

/** auf Geräten mit Stift oder Berührung: die Knöpfe für die Tasten */
function beruehrungZeigen(): void {
  if (!document.body.classList.contains('beruehrung')) document.body.classList.add('beruehrung');
}

function zweiFinger(): [{ x: number; y: number }, { x: number; y: number }] | null {
  const f = [...finger.values()];
  return f.length >= 2 ? [f[0]!, f[1]!] : null;
}

function gesteBeginnen(): void {
  const ab = zweiFinger();
  if (!ab) return;
  const [a, b] = ab;
  geste = {
    d0: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
    w0: Math.atan2(b.y - a.y, b.x - a.x),
    m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    zoom0: nutzer.zoom,
    gier0: nutzer.gier,
    sx0: nutzer.schwenkX,
    sy0: nutzer.schwenkY,
    gedreht: false,
  };
  schwung = null;
}

function gesteBewegen(): void {
  const ab = zweiFinger();
  if (!geste || !ab) return;
  const [a, b] = ab;
  const d = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
  const w = Math.atan2(b.y - a.y, b.x - a.x);
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  // zoomen zu den Fingern hin: Was unter ihrer Mitte lag, bleibt unter ihr
  const z = Math.max(0.3, Math.min(4, (geste.zoom0 * d) / geste.d0));
  const qx = (geste.m0.x - (W / 2 + geste.sx0)) / geste.zoom0;
  const qy = (geste.m0.y - (H / 2 + geste.sy0)) / geste.zoom0;
  nutzer.zoom = z;
  if (vier < 0.5) {
    nutzer.schwenkX = m.x - W / 2 - qx * z;
    nutzer.schwenkY = m.y - H / 2 - qy * z;
  }
  // verdrehen: um die Hochachse, erst ab einem kleinen Winkel (dann ohne Sprung von dort aus)
  let dw = Math.atan2(Math.sin(w - geste.w0), Math.cos(w - geste.w0));
  if (!geste.gedreht && Math.abs(dw) > GESTE_DREHEN_AB) {
    geste.gedreht = true;
    geste.w0 = w;
    geste.gier0 = nutzer.gier;
    dw = 0;
    ansichtLoesen();
  }
  // wie ein Teller auf dem Tisch: im Uhrzeigersinn verdreht, dreht sich die Form von oben gesehen mit (ihre vordere Seite folgt dem unteren
  // Finger)
  if (geste.gedreht) nutzer.gier = geste.gier0 + dw;
}

function gesteEnden(): void {
  if (geste?.gedreht) {
    const ziel = ansichtNahe(nutzer.gier, nutzer.neigung);
    if (ziel) ansichtSetzen(ziel.a, ziel.hinten);
  }
  geste = null;
}

for (const art of ['pointerdown', 'pointerup', 'pointercancel'] as const)
  window.addEventListener(
    art,
    (e) => {
      if (mitInfo) zeigerZaehler[`${e.pointerType} ${art.slice(7)}`] = (zeigerZaehler[`${e.pointerType} ${art.slice(7)}`] ?? 0) + 1;
    },
    { capture: true },
  );
window.addEventListener(
  'pointerdown',
  (e) => {
    if (e.target !== leinwandLinien) return;
    if (e.pointerType === 'pen') {
      stiftGesehen = true;
      beruehrungZeigen();
      return;
    }
    if (e.pointerType !== 'touch') return;
    beruehrungZeigen();
    const [x, y] = lageIm(e);
    finger.set(e.pointerId, { x, y });
    if (finger.size === 2 && zustand === 'ruhe' && !geste) {
      // zwei Finger: Was der erste begonnen hat, endet hier (Drehen hört einfach auf), dann die Geste
      e.stopPropagation();
      if (drehen) drehen = null;
      else if (bearbeitenGedrueckt || pinselZug || wenden || raumStrich || raumAufzug || punktZug || zug || teiler.zug) loslassen(e);
      try {
        leinwandLinien.setPointerCapture(e.pointerId);
      } catch {
        // nachgestellte Ereignisse haben keinen echten Zeiger
      }
      gesteBeginnen();
      anstossen();
      return;
    }
    if (finger.size >= 2 || geste || gesteRest) {
      e.stopPropagation();
      return;
    }
    if (!stiftGesehen) return;
    // ab dem ersten Stift dreht ein Finger nur (wie Ziehen ins Leere), auf dem leeren Blatt tut er nichts
    e.stopPropagation();
    if (zustand !== 'ruhe' || !koerper) return;
    try {
      leinwandLinien.setPointerCapture(e.pointerId);
    } catch {
      // nachgestellte Ereignisse haben keinen echten Zeiger
    }
    if (vier > 0.5) {
      const R = felder().raum;
      if (!(x >= R.x && y >= R.y)) vierUmschalten(false);
    }
    schwung = null;
    drehen = { x, y, gier: nutzer.gier, neigung: nutzer.neigung, vg: 0, vn: 0, t: e.timeStamp, lx: x, ly: y };
    anstossen();
  },
  { capture: true },
);
window.addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType !== 'touch' || !finger.has(e.pointerId)) return;
    const [x, y] = lageIm(e);
    finger.set(e.pointerId, { x, y });
    if (geste) {
      e.stopPropagation();
      gesteBewegen();
      anstossen();
    } else if (gesteRest) e.stopPropagation();
  },
  { capture: true },
);
const fingerWeg = (e: PointerEvent): void => {
  if (e.pointerType !== 'touch' || !finger.has(e.pointerId)) return;
  finger.delete(e.pointerId);
  if (!geste && !gesteRest) return;
  e.stopPropagation();
  if (leinwandLinien.hasPointerCapture(e.pointerId)) leinwandLinien.releasePointerCapture(e.pointerId);
  if (geste && finger.size < 2) {
    gesteEnden();
    gesteRest = finger.size > 0;
  } else if (gesteRest && finger.size === 0) gesteRest = false;
  anstossen();
};
window.addEventListener('pointerup', fingerWeg, { capture: true });
window.addEventListener('pointercancel', fingerWeg, { capture: true });
// unter dem Finger kein Zeiger (er läge unter der Fingerkuppe); nach den Ereignissen der Bühne
for (const art of ['pointerdown', 'pointermove'] as const)
  window.addEventListener(art, (e) => {
    if (e.pointerType === 'touch' && e.target === leinwandLinien) zeiger.da = false;
  });

leinwandLinien.addEventListener('pointermove', (e) => {
  const [x, y] = lageIm(e);
  const dt = letzteZeit ? Math.min(0.1, (e.timeStamp - letzteZeit) / 1000) : 0;
  letzteZeit = e.timeStamp;
  zeiger.x = x;
  zeiger.y = y;
  zeiger.da = true;
  if (zustand === 'blatt') {
    blatt.alt = e.altKey;
    blatt.umschalt = e.shiftKey;
    const ereignisse = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const ev of ereignisse.length ? ereignisse : [e]) {
      const [ex, ey] = lageIm(ev);
      blatt.bewegen(ex, ey, ev.timeStamp, dt);
    }
    anstossen();
    return;
  }
  // das Verhalten der Studie (Linien des Werks): Zeiger, Tropfen, Zug
  if (zustand === 'ruhe' && werkGezeigt) {
    bearbeiten.alt = e.altKey;
    bearbeiten.umschalt = e.shiftKey;
    bearbeiten.kippen = e.shiftKey;
    if (!strichWerkzeug()) bearbeiten.zeigerSetzen(x, y, x, y, dt);
  }
  if (bearbeitenGedrueckt) {
    anstossen();
    return;
  }
  if (pinselZug) {
    pinselBewegen(x, y);
    anstossen();
    return;
  }
  if (wenden) {
    // in jede Richtung; beim Loslassen zurück oder auf die Rückseite, was näher ist
    nutzer.gier = wenden.g0 - ((x - wenden.x) * Math.PI) / 520;
    nutzer.neigung = Math.max(NEIGUNG_UNTEN, Math.min(NEIGUNG_OBEN, wenden.n0 + ((y - wenden.y) * Math.PI) / 520));
    anstossen();
    return;
  }
  // Freihand und Formen im Raum
  if (raumStrich) {
    const ereignisse = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const ev of ereignisse.length ? ereignisse : [e]) {
      const [ex, ey] = lageIm(ev);
      const p = { x: ex, y: ey };
      raumStrich.st.zeiger = p;
      raumStrich.st.roh.push(p);
      raumStrich.st.spur.push(...raumStrich.st.g.folge(p, ev.timeStamp));
    }
    anstossen();
    return;
  }
  if (raumAufzug) {
    raumAufzug.bis = { x, y };
    anstossen();
    return;
  }
  if (teiler.zug) {
    const rand = bw.vierRand;
    const oben = 64;
    const e2 = raum!;
    const X = 2 * e2.rx;
    const Y = 2 * e2.ry;
    const Z = 2 * e2.tiefe;
    teiler.bx = (x - rand) / (W - 2 * rand) - X / (X + Z);
    teiler.by = (y - oben) / (H - oben - rand) - Y / (Y + Z);
  } else if (punktZug && werkGezeigt) {
    // den Punkt der Linie im Werk ziehen (wartet der Griff noch, holt er die Maus später ein)
    const XY = werkLage(x, y, punktZug);
    if (XY) {
      werk.G.maus = { a: 'seite', X: XY[0], Y: XY[1] };
      if (werk.zug && !werk.zug.modal && werk.zug.ansicht === 'seite') werk.zugBewegen(XY[0], XY[1]);
    }
  } else if (punktZug) {
    const lage = punktLage(x, y, punktZug);
    if (lage) {
      blatt.ankerSetzen(punktZug.i, lage[0], lage[1]);
      silhouette = blatt.silhouette();
      if (performance.now() - umbauZeit > 110) blaseNeu();
    }
  } else if (drehen) {
    ansichtLoesen();
    nutzer.gier = drehen.gier - ((x - drehen.x) * Math.PI) / 520;
    nutzer.neigung = Math.max(NEIGUNG_UNTEN, Math.min(NEIGUNG_OBEN, drehen.neigung + ((y - drehen.y) * Math.PI) / 520));
    // Geschwindigkeit (rad/s), geglättet: für den Schwung beim Loslassen
    const dtz = Math.max(1e-3, (e.timeStamp - drehen.t) / 1000);
    const vg = (-(x - drehen.lx) * Math.PI) / 520 / dtz;
    const vn = ((y - drehen.ly) * Math.PI) / 520 / dtz;
    const a = Math.min(1, dtz / 0.05);
    drehen.vg += (vg - drehen.vg) * a;
    drehen.vn += (vn - drehen.vn) * a;
    drehen.t = e.timeStamp;
    drehen.lx = x;
    drehen.ly = y;
  } else if (zug && koerper) {
    const k = koerper;
    const F = k.flach;
    const s = 1 / Math.max(1e-6, massstab.jetzt * nutzer.zoom);
    const cam = kam.aktiv;
    const rechts = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const oben = new Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const dw = rechts.multiplyScalar((x - zug.x) * s).add(oben.multiplyScalar(-(y - zug.y) * s));
    const grenze = F.radius * 0.25;
    const l = dw.length();
    if (l > 1e-9) dw.multiplyScalar((grenze * Math.tanh(l / grenze)) / l);
    for (let i = 0; i < F.n; i++) {
      const g = zug.gewicht[i]!;
      k.versatz[i * 3] = zug.start[i * 3]! + g * dw.x;
      k.versatz[i * 3 + 1] = zug.start[i * 3 + 1]! + g * dw.y;
      k.versatz[i * 3 + 2] = zug.start[i * 3 + 2]! + g * zug.zFaktor[i]! * dw.z * (zug.hinten ? -1 : 1);
    }
  } else {
    const p = punktSuchen(x, y);
    punktUnterZeiger = p ? p.i : -1;
    teiler.ueber = amTeiler(x, y) ? 1 : 0;
    // mit dem Werk: der Pinsel über seiner Haut (der Hauch zeigt Ort und Radius, ein Tropfen den Punkt, den er fassen würde)
    let aufBlase = false;
    pinselZiel = null;
    zeigerPinsel = false;
    if (werkGezeigt && bearbeitenAn && !bearbeiten.haengt && raumWerkzeug === 'auswahl' && !teiler.ueber && pinselHier(x, y)) {
      const t = werkHautTreffen(x, y);
      if (t) {
        hauch.pos.copy(t.welt);
        hauch.ziel = 1;
        pinselZiel = pinselPunkt(t.werk);
        aufBlase = true;
        zeigerPinsel = true;
      } else hauch.ziel = 0;
    } else if (!werkGezeigt) aufBlase = !p && !teiler.ueber && hauchSuchen(x, y);
    else hauch.ziel = 0;
    wandUnterZeiger = aufBlase || p ? -1 : wandSuchen(x, y);
    leinwandLinien.classList.toggle('teiler', teiler.ueber > 0);
  }
  anstossen();
});

leinwandLinien.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  try {
    leinwandLinien.setPointerCapture(e.pointerId);
  } catch {
    // nachgestellte Ereignisse haben keinen echten Zeiger
  }
  const [x, y] = lageIm(e);
  zeiger.x = x;
  zeiger.y = y;
  zeiger.da = true;
  if (zustand === 'blatt') {
    blatt.alt = e.altKey;
    blatt.umschalt = e.shiftKey;
    blatt.druecken(x, y, e.timeStamp);
    if (!blatt.leer) leiste.lage(true);
    anstossen();
    return;
  }
  if (zustand !== 'ruhe' || !koerper) return;
  if (amTeiler(x, y)) {
    teiler.zug = true;
    anstossen();
    return;
  }
  // Lasso (S5, L): Ziehen zeichnet die Schlinge, überall (auch auf Punkten und Linien); ⇧ nimmt dazu, ⌥ weg
  if (bearbeitenAn && raumWerkzeug === 'lasso') {
    bearbeiten.alt = e.altKey;
    bearbeiten.umschalt = e.shiftKey;
    bearbeiten.kippen = e.shiftKey;
    bearbeiten.zeigerSetzen(x, y, x, y, 0);
    bearbeiten.lassoDruecken();
    bearbeitenGedrueckt = true;
    anstossen();
    return;
  }
  // ⇧ in einer eingerasteten Ansicht: wenden (ziehen dreht das Blatt; ⇧ + Doppelklick wendet ganz)
  if (e.shiftKey && ansicht !== 'raum' && flach > 0.9 && vier < 0.5 && !bearbeiten.haengt) {
    const jetzt = e.timeStamp;
    if (jetzt - letzterUmschaltKlick.t < 350 && Math.hypot(x - letzterUmschaltKlick.x, y - letzterUmschaltKlick.y) < 8) {
      letzterUmschaltKlick = { t: 0, x, y };
      wendenSicht = true;
      ansichtSetzen(ansicht, !gewendet);
      anstossen();
      return;
    }
    letzterUmschaltKlick = { t: jetzt, x, y };
    schwung = null;
    ansichtFahrt = null;
    wenden = { x, y, g0: nutzer.gier, n0: nutzer.neigung, a: ansicht };
    wendenSicht = true;
    anstossen();
    return;
  }
  // Linien des Werks: Hängt ein Tropfen am Zeiger, gilt das Drücken ihm; ins Leere im Raum (und im Feld des Raums) dreht es, in einer
  // flachen Ansicht zieht es einen Rahmen (E2)
  // Freihand und Formen: auf einer Fläche beginnt der Strich oder der Aufzug (daneben dreht es weiter)
  if (bearbeitenAn && strichWerkzeug()) {
    const fl = werkBlatt.flaecheUnter(x, y);
    if (fl >= 0) {
      if (raumWerkzeug === 'frei') raumStrich = { fl, st: strichBeginnen(freihandWerte, x, y, e.timeStamp) };
      else raumAufzug = { fl, art: raumWerkzeug === 'ellipse' ? 'ellipse' : 'wuerfel', von: { x, y }, bis: { x, y } };
      anstossen();
      return;
    }
  }
  if (bearbeitenAn) {
    // mit P: auf einer Fläche setzt das Drücken einen Punkt (`ortFrei`), daneben dreht es weiter
    const p = bearbeiten.stift && werkBlatt.ortFrei(x, y) !== null;
    if (bearbeiten.haengt || p) {
      bearbeiten.alt = e.altKey;
      bearbeiten.umschalt = e.shiftKey;
      bearbeiten.kippen = e.shiftKey;
      bearbeiten.zeigerSetzen(x, y, x, y, 0);
      bearbeiten.druecken();
      bearbeitenGedrueckt = true;
      anstossen();
      return;
    }
  }
  // der Pinsel „Ziehen“ an der Haut des Werks (⇧ dreht stattdessen)
  if (werkGezeigt && bearbeitenAn && raumWerkzeug === 'auswahl' && !e.shiftKey && pinselHier(x, y) && pinselBeginnen(x, y)) {
    anstossen();
    return;
  }
  const p = punktSuchen(x, y);
  if (p) {
    punktZug = p;
    if (werkGezeigt) werkGreifen(x, y, p);
    anstossen();
    return;
  }
  const t = blaseTreffen(x, y);
  if (t && !e.shiftKey) {
    // an der Blase ziehen (vorerst die weiche Verformung der Studie; mit dem Werk der Pinsel „Ziehen“)
    const F = koerper.flach;
    const n = F.n;
    const hinten = t.tri >= F.tri.length / 3;
    const sigma = Math.max(20, F.radius * 0.3);
    const gewicht = new Float32Array(n);
    const zFaktor = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v = hinten ? n + i : i;
      const dx = koerper.pos[v * 3]! - t.x;
      const dy = koerper.pos[v * 3 + 1]! - t.y;
      const dz = koerper.pos[v * 3 + 2]! - t.z;
      gewicht[i] = Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * sigma * sigma));
      zFaktor[i] = F.qMax > 0 ? Math.sqrt(F.q[i]! / F.qMax) : 0;
    }
    zug = { x, y, start: koerper.versatz.slice(), gewicht, zFaktor, hinten, tiefe: 0 };
    hauch.ziel = 1;
    hauch.pos.set(t.x, t.y, t.z);
  } else {
    // ins Leere: drehen, in jeder Ansicht (S4). In einem flachen Feld der Vier Ansichten klappen sie dabei zurück in den Raum (F3)
    if (vier > 0.5) {
      const R = felder().raum;
      if (!(x >= R.x && y >= R.y)) vierUmschalten(false);
    }
    schwung = null;
    drehen = { x, y, gier: nutzer.gier, neigung: nutzer.neigung, vg: 0, vn: 0, t: e.timeStamp, lx: x, ly: y };
  }
  anstossen();
});

const loslassen = (e: PointerEvent): void => {
  if (leinwandLinien.hasPointerCapture(e.pointerId)) leinwandLinien.releasePointerCapture(e.pointerId);
  if (zustand === 'blatt') {
    blatt.loslassen();
    anstossen();
    return;
  }
  if (bearbeitenGedrueckt) {
    bearbeiten.loslassen();
    bearbeitenGedrueckt = false;
    anstossen();
    return;
  }
  if (pinselZug) {
    pinselEnde();
    anstossen();
    return;
  }
  if (wenden) {
    const a = wenden.a;
    wenden = null;
    ansichtSetzen(a, rueckseite(a));
    anstossen();
    return;
  }
  // Freihand und Formen: geschlossen wird es eine Linie auf der Haut (wie eine Form mit P)
  if (raumStrich || raumAufzug) {
    const pfad = raumStrich ? strichPfad(raumStrich.st, freihandWerte) : aufzugPfad(raumAufzug!.art, raumAufzug!.von, raumAufzug!.bis, e.shiftKey, e.altKey);
    const fl = raumStrich ? raumStrich.fl : raumAufzug!.fl;
    raumStrich = null;
    raumAufzug = null;
    if (pfad) werkBlatt.pfadAufHaut(fl, pfad);
    anstossen();
    return;
  }
  if (drehen) {
    // mit Schwung: Wohin käme die Drehung? Liegt das nahe einer Ansicht, rastet sie dort ein; sonst klingt sie aus (S4)
    const ruht = e.timeStamp - drehen.t > 60;
    const v = ruht ? { vg: 0, vn: 0 } : { vg: drehen.vg, vn: drehen.vn };
    const gVor = nutzer.gier + v.vg * SCHWUNG_TAU;
    const nVor = Math.max(NEIGUNG_UNTEN, Math.min(NEIGUNG_OBEN, nutzer.neigung + v.vn * SCHWUNG_TAU));
    const schnell = Math.hypot(v.vg, v.vn) > 0.6;
    const ziel = ansichtNahe(gVor, nVor) ?? (schnell ? ansichtNahe(gVor, nVor, SCHWUNG_FANG) : null);
    if (ziel) ansichtSetzen(ziel.a, ziel.hinten);
    else if (schnell) schwung = { vg: v.vg, vn: v.vn };
  }
  if (punktZug && werkGezeigt) {
    // losgelassen, bevor der Griff beginnen konnte: ein Klick (die Auswahl steht); sonst endet der Zug im Werk
    if (werk.G.gegriffen) werk.G.gegriffen = null;
    else if (werk.zug && !werk.zug.modal) werk.zugEnde(true);
  } else if (punktZug) {
    blaseNeu();
    raumRechnen();
  }
  teiler.zug = false;
  punktZug = null;
  drehen = null;
  zug = null;
  anstossen();
};
leinwandLinien.addEventListener('pointerup', loslassen);
leinwandLinien.addEventListener('pointercancel', loslassen);
leinwandLinien.addEventListener('pointerleave', () => {
  if (drehen || zug || punktZug || teiler.zug || bearbeitenGedrueckt) return;
  zeiger.da = false;
  bearbeiten.zeigerWeg();
  blatt.weg();
  hauch.ziel = 0;
  wandUnterZeiger = -1;
  anstossen();
});
leinwandLinien.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (zustand === 'ruhe') {
      // Zoom von Hand: gilt in allen Ansichten, bis „Einpassen“ (Pos1)
      nutzer.zoom = Math.max(0.3, Math.min(4, nutzer.zoom * Math.exp(-e.deltaY * 0.0015)));
      anstossen();
    }
  },
  { passive: false },
);

function werkzeugGewaehlt(w: Werkzeug): void {
  // im Raum (mit dem Werk): P, Freihand, Formen und Lasso auf den Flächen
  if (zustand === 'ruhe' && werkGezeigt) {
    werkzeugImRaum(w);
    return;
  }
  if (zustand !== 'blatt' || w === 'lasso') return;
  blatt.werkzeugSetzen(w);
  anstossen();
}

/** P im Raum an oder aus (Etappe 5.3): eine angefangene Linie wird beim Ausschalten abgebrochen */
function stiftImRaum(an: boolean): void {
  werkzeugImRaum(an ? 'p' : 'auswahl');
}

/** ein Werkzeug im Raum: P geht über das Verhalten der Studie; Freihand, Ellipse und Würfel zeichnen auf der Fläche unter dem Zeiger */
function werkzeugImRaum(w: Werkzeug): void {
  raumWerkzeug = w;
  bearbeiten.stiftSchalten(w === 'p');
  if (strichWerkzeug()) bearbeiten.zeigerWeg();
  raumStrich = null;
  raumAufzug = null;
  leiste.setzen(w);
  anstossen();
}

function muell(): void {
  if (zustand === 'blatt') blatt.leeren();
  else neu();
  leiste.lage(false);
  anstossen();
}

window.addEventListener('keydown', (e) => {
  // ⌘S auch, wenn ein Regler den Fokus hat (sonst sichert der Browser die Seite); im Feld „Sichern“ gilt das Feld
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && e.target !== sichernName) {
    e.preventDefault();
    if (!e.repeat) sichernKurz();
    return;
  }
  if (e.target instanceof HTMLInputElement) return;
  blatt.alt = e.altKey;
  blatt.umschalt = e.shiftKey;
  bearbeiten.alt = e.altKey;
  bearbeiten.umschalt = e.shiftKey;
  bearbeiten.kippen = e.shiftKey;
  const k = e.key;
  if ((e.metaKey || e.ctrlKey) && k === ',') {
    e.preventDefault();
    reglerZeigen(regler.hidden);
    return;
  }
  if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'z') {
    e.preventDefault();
    if (zustand === 'blatt' && blatt.rueckgaengig()) anstossen();
    else if (zustand === 'ruhe' && bearbeitenAn) {
      // über das Verhalten (es räumt Tropfen und Auswahl auf), das im Werk zurückgeht
      if (bearbeiten.rueckgaengig()) anstossen();
    } else if (zustand === 'ruhe' && werkForm && !werk.zug && werk.zurueck.length > werkForm.zurueck) {
      // im Raum: ein Schritt im Werk zurück (nicht hinter die Form aus der Silhouette); die Anzeige gleitet (S13)
      const s = werk.zurueck.pop();
      if (s) {
        werkBlatt.rueckfluss();
        werk.wiederherstellen(s);
      }
      werk.anzeige.allesZeigen();
      anstossen();
    }
    return;
  }
  if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'a' && zustand === 'ruhe' && bearbeitenAn) {
    e.preventDefault();
    if (bearbeiten.eingabe('alle')) anstossen();
    return;
  }
  if (e.metaKey || e.ctrlKey) return;
  if (k === 'Tab') {
    e.preventDefault();
    if (!e.repeat) vierUmschalten();
  } else if (k === 'Enter') {
    if (zustand === 'blatt') {
      if (!blatt.eingabe('enter') && blatt.geschlossen) aufblasen();
    } else if (bearbeitenAn) bearbeiten.eingabe('enter');
  } else if (k === 'Escape') {
    if (zustand === 'blatt') {
      if (!blatt.eingabe('esc')) {
        blatt.werkzeugSetzen('auswahl');
        leiste.setzen('auswahl');
      }
    } else if (bearbeitenAn && (raumStrich || raumAufzug || strichWerkzeug())) {
      // Freihand und Formen: den Strich abbrechen, sonst zurück zur Auswahl
      if (raumStrich || raumAufzug) {
        raumStrich = null;
        raumAufzug = null;
      } else werkzeugImRaum('auswahl');
    } else if (bearbeitenAn && bearbeiten.stift) {
      // mit P: eine angefangene Linie abbrechen, sonst P aus
      if (!bearbeiten.eingabe('esc')) stiftImRaum(false);
    } else if (bearbeitenAn && (bearbeiten.auswahl.size > 0 || werk.G.auswahl.length > 0)) {
      // zuerst die Auswahl leeren
      bearbeiten.eingabe('esc');
      werk.G.auswahl = [];
    } else if (vierZiel > 0.5) vierUmschalten(false);
    else if (ansicht !== 'raum') ansichtSetzen('raum');
    else ablassen();
  } else if (k === 'Backspace' || k === 'Delete') {
    if (zustand === 'blatt') blatt.eingabe('loeschen');
    // gewählte Punkte löschen (im Werk), sonst Luft ablassen
    else if (bearbeitenAn && (bearbeiten.auswahl.size > 0 || (bearbeiten.stift && werkBlatt.entwurf()))) bearbeiten.eingabe('loeschen');
    else ablassen();
  } else if ((k === '[' || k === ']') && zustand === 'ruhe' && werkGezeigt) {
    // Radius des Pinsels (wie O im Prüffenster)
    pinselRadius = Math.max(10, Math.min(600, pinselRadius * (k === ']' ? 1.2 : 1 / 1.2)));
  } else if ((k === 'p' || k === 'P') && zustand === 'ruhe' && werkGezeigt) stiftImRaum(!bearbeiten.stift);
  else if ((k === 'v' || k === 'V') && zustand === 'ruhe' && werkGezeigt) werkzeugImRaum('auswahl');
  else if ((k === 'l' || k === 'L') && zustand === 'ruhe' && werkGezeigt && !e.metaKey && !e.ctrlKey) werkzeugImRaum(raumWerkzeug === 'lasso' ? 'auswahl' : 'lasso');
  else if ((k === 'n' || k === 'N') && zustand === 'ruhe' && werkGezeigt) werkzeugImRaum('frei');
  else if (k === 'e' && zustand === 'ruhe' && werkGezeigt) werkzeugImRaum('ellipse');
  else if (k === 'E' && zustand === 'ruhe' && werkGezeigt) werkzeugImRaum('wuerfel');
  else if ((k === 'k' || k === 'K') && zustand === 'ruhe' && werkGezeigt) {
    // Kante an den gewählten Punkten oder Linien an und aus (im Werk)
    if (werk.G.auswahl.length && !werk.zug) {
      // S13 (5): die Tusche fließt vom Gewählten aus, und ändert die Kante die Lage der Linie (Ecken), gleitet sie wie nach ⌘Z
      werkBlatt.tuscheMerken(werk.G.auswahl);
      werkBlatt.rueckfluss();
      werk.kanteSetzen();
    }
  } else if (k === ' ') {
    e.preventDefault();
    nochEinmal();
  } else if (e.shiftKey && (e.code === 'Digit1' || e.code === 'Digit3' || e.code === 'Digit7' || e.code === 'Numpad1' || e.code === 'Numpad3' || e.code === 'Numpad7') && zustand !== 'blatt') {
    // ⇧ + 1/3/7: die Ansicht von der Gegenseite (ist sie es schon, wendet es zurück)
    if (e.repeat) return;
    if (vierZiel > 0.5) vierUmschalten(false);
    const ziel: Ansicht = e.code.endsWith('1') ? 'seite' : e.code.endsWith('3') ? 'front' : 'top';
    wendenSicht = ansicht === ziel;
    ansichtSetzen(ziel, ansicht === ziel ? !gewendet : true);
  } else if ((k === '1' || k === '3' || k === '7' || k === '0') && zustand !== 'blatt') {
    if (e.repeat) return;
    if (vierZiel > 0.5) vierUmschalten(false);
    const ziel: Ansicht = k === '1' ? 'seite' : k === '3' ? 'front' : k === '7' ? 'top' : 'raum';
    tasteGehalten = { taste: k, seit: performance.now(), vorher: ansicht };
    ansichtSetzen(ziel);
  } else if (k === 'Home') {
    nutzer.zoom = 1;
    nutzer.schwenkX = 0;
    nutzer.schwenkY = 0;
    massstab.nachfuehren = true;
  } else if (zustand === 'blatt' && (k === 'p' || k === 'P')) waehlenTaste('p');
  else if (zustand === 'blatt' && (k === 'n' || k === 'N')) waehlenTaste('frei');
  else if (zustand === 'blatt' && k === 'e') waehlenTaste('ellipse');
  else if (zustand === 'blatt' && k === 'E') waehlenTaste('wuerfel');
  else if (zustand === 'blatt' && (k === 'v' || k === 'V')) waehlenTaste('auswahl');
  else if (k === 'm' || k === 'M') fassungSetzen(((fassung + 1) % FASSUNGEN.length) as Fassung);
  else return;
  anstossen();
});
window.addEventListener('keyup', (e) => {
  blatt.alt = e.altKey;
  blatt.umschalt = e.shiftKey;
  bearbeiten.alt = e.altKey;
  bearbeiten.umschalt = e.shiftKey;
  bearbeiten.kippen = e.shiftKey;
  if (tasteGehalten && e.key === tasteGehalten.taste) {
    if (performance.now() - tasteGehalten.seit > 300) ansichtSetzen(tasteGehalten.vorher);
    tasteGehalten = null;
  }
});

// S12: Tasten als kleine Knöpfe (iPad): Jeder Knopf löst genau das aus, was seine Taste tut
const tasten = $<HTMLElement>('tasten');
function tasteSenden(key: string, meta: boolean): void {
  const art = { key, metaKey: meta, bubbles: true, cancelable: true };
  window.dispatchEvent(new KeyboardEvent('keydown', art));
  window.dispatchEvent(new KeyboardEvent('keyup', art));
}
// ohne Fokus auf dem Knopf (sonst löste eine Taste der Tastatur ihn danach noch einmal aus)
tasten.addEventListener('pointerdown', (e) => e.preventDefault());
tasten.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-taste]');
  if (b?.dataset.taste) tasteSenden(b.dataset.taste, b.dataset.meta === '1');
});
let tastenStandVorher = '';
/** die Ansicht, in der Ozzy steht, als gedrückter Knopf */
function tastenStand(): void {
  const jetzt = zustand === 'blatt' ? '' : vierZiel > 0.5 ? 'vier' : ansicht;
  if (jetzt === tastenStandVorher) return;
  tastenStandVorher = jetzt;
  for (const b of tasten.querySelectorAll<HTMLButtonElement>('button[data-ansicht]')) b.setAttribute('aria-pressed', String(b.dataset.ansicht === jetzt));
}

function waehlenTaste(w: Werkzeug): void {
  blatt.werkzeugSetzen(w);
  leiste.setzen(w);
}

// ---------- Leiste, Menü, Feinregler ----------

const leiste = new Leiste(document.body, werkzeugGewaehlt, muell);

// S9: Schalter im Menü „Linie an der Spiegelkante“ (gilt beim nächsten Aufblasen)
const mitLinieSchalter = $<HTMLInputElement>('mit-linie');
mitLinieSchalter.checked = mitLinie;
mitLinieSchalter.addEventListener('change', () => {
  mitLinie = mitLinieSchalter.checked;
  try {
    localStorage.setItem('ozzy.mitLinie', mitLinie ? '1' : '0');
  } catch {
    // ohne Speicher gilt es nur bis zum Neuladen
  }
  werk.G.meldung = mitLinie ? 'Beim nächsten Aufblasen bleibt die Linie an der Spiegelkante' : 'Beim nächsten Aufblasen ohne Linie an der Spiegelkante';
});

const regler = $<HTMLElement>('regler');
const marke = $<HTMLButtonElement>('marke');
function reglerZeigen(an: boolean): void {
  regler.hidden = !an;
  marke.setAttribute('aria-expanded', String(an));
}
marke.addEventListener('click', () => reglerZeigen(regler.hidden));

// Laden (Phase 5.1): die gesicherten Formen der Ablage, beim Aufklappen frisch gelesen
const ladenListe = $<HTMLDivElement>('laden-liste');
$<HTMLDetailsElement>('laden').addEventListener('toggle', (e) => {
  if (!(e.currentTarget as HTMLDetailsElement).open) return;
  void werk.ablageListe().then((liste) => {
    ladenListe.replaceChildren();
    if (!liste?.length) {
      const leer = document.createElement('span');
      leer.className = 'leer';
      leer.textContent = liste ? 'keine Formen gesichert' : 'Ablage nicht erreichbar';
      ladenListe.append(leer);
      return;
    }
    for (const eintrag of liste) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = eintrag.name;
      b.title = `${eintrag.punkte} Punkte · ${eintrag.loops} Linien`;
      b.addEventListener('click', () => {
        reglerZeigen(false);
        void formLaden(eintrag.name).then((t) => {
          if (!t.startsWith('geladen')) console.warn(`Ozzy: ${t}`);
        });
      });
      ladenListe.append(b);
    }
  });
});

/** eine Meldung sofort in die Hinweiszeile (auch dieselbe noch einmal) */
function meldungZeigen(text: string): void {
  werk.G.meldung = text;
  meldung = { text, seit: performance.now() };
  anstossen();
}

/**
 * Die Form unter einem Namen sichern (S11): der ganze Stand des Werks (Linien, Punkte, Griffe, Kanten, Haut, Maul, Pose) als Datei in der
 * Ablage, wie im Prüffenster (`wesen/<Name>.eewesen`); „Laden“ lädt sie genau so wieder. Zurück: Text für die Meldung.
 */
async function formSichern(name: string): Promise<string> {
  if (zustand !== 'ruhe' || !werkForm) return 'Sichern: erst eine Form aufblasen';
  // rechnet das Werk nach einem Zug noch, erst danach (bis dahin ist die Haut noch nicht die Form, die bleibt)
  const rechnet = (): boolean => werk.zug !== null || werk.nachlauf !== null || werk.maulLauf !== null || werk.G.aufraeumen !== null;
  for (const t0 = performance.now(); rechnet() && performance.now() - t0 < 5000; ) await new Promise((weiter) => setTimeout(weiter, 30));
  if (werk.zug) return 'Sichern: bitte erst den Zug beenden';
  const st = werk.standJetzt();
  // ein Stand, der nicht in Ordnung ist, überschriebe sonst eine gute Datei (und ließe sich nicht wieder laden)
  const mangel = pruefen(st);
  if (mangel) return `Sichern geht so nicht: ${mangel} · ⌘Z führt zu einem Stand davor`;
  const datei = new Blob(packen(st) as BlobPart[], { type: 'application/octet-stream' });
  let antwort: Response | null = null;
  try {
    antwort = await fetch(werk.ABLAGE + encodeURIComponent(name), { method: 'PUT', body: datei });
  } catch {
    antwort = null;
  }
  if (!antwort?.ok) return antwort ? `Sichern fehlgeschlagen (${antwort.status} ${await antwort.text().catch(() => '')})` : 'Sichern: Ablage nicht erreichbar';
  werk.G.ablageName = name;
  return `gesichert: „${name}“ (${auskunft(st)}, ${(datei.size / 1e6).toFixed(1)} MB)`;
}

// Sichern (S11, Florian: „Sichern unter einem Namen, Überschreiben nur nach Frage; ⌘S“): im Menü ein Name und ein Knopf. Einen Namen, den
// es schon gibt und der nicht der eigene ist, überschreibt erst der zweite Druck (die Frage steht auf dem Knopf und in der Meldung). ⌘S
// sichert unter dem Namen der Form (geladen oder schon gesichert), ohne Namen öffnet es das Feld.
const sichernDetails = $<HTMLDetailsElement>('sichern');
const sichernName = $<HTMLInputElement>('sichern-name');
const sichernKnopf = $<HTMLButtonElement>('sichern-knopf');
let sichernVorhanden = new Set<string>();
let sichernBestaetigt = '';
let sichertGerade = false;
sichernDetails.addEventListener('toggle', () => {
  if (!sichernDetails.open) return;
  sichernName.value = werk.G.ablageName;
  sichernBestaetigt = '';
  sichernKnopf.textContent = 'Sichern';
  void werk.ablageListe().then((liste) => {
    sichernVorhanden = new Set((liste ?? []).map((e) => e.name));
  });
  sichernName.focus();
  sichernName.select();
});
function sichernOeffnen(): void {
  reglerZeigen(true);
  if (sichernDetails.open) {
    sichernName.focus();
    sichernName.select();
  } else sichernDetails.open = true;
}
async function sichernUnter(name: string): Promise<void> {
  if (sichertGerade) return;
  sichertGerade = true;
  sichernKnopf.disabled = true;
  meldungZeigen(`sichere „${name}“ …`);
  const text = await formSichern(name);
  sichertGerade = false;
  sichernKnopf.disabled = false;
  meldungZeigen(text);
  if (text.startsWith('gesichert')) {
    sichernDetails.open = false;
    reglerZeigen(false);
  }
}
function sichernLos(): void {
  const name = sichernName.value.trim().replace(/\s+/g, ' ');
  if (!werk.nameGueltig(name)) {
    meldungZeigen('Sichern: bitte einen Namen aus Buchstaben, Ziffern, Leerzeichen, Punkt, Strich (höchstens 60 Zeichen)');
    return;
  }
  if (sichernVorhanden.has(name) && name !== werk.G.ablageName && sichernBestaetigt !== name) {
    sichernBestaetigt = name;
    sichernKnopf.textContent = 'Überschreiben';
    meldungZeigen(`„${name}“ gibt es schon: noch einmal drücken überschreibt`);
    return;
  }
  void sichernUnter(name);
}
sichernKnopf.addEventListener('click', sichernLos);
sichernName.addEventListener('input', () => {
  sichernBestaetigt = '';
  sichernKnopf.textContent = 'Sichern';
});
sichernName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's')) {
    e.preventDefault();
    sichernLos();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    sichernDetails.open = false;
    sichernName.blur();
  }
});
/** ⌘S: ist das Feld offen, gilt, was darin steht; sonst unter dem Namen der Form, ohne Namen öffnet sich das Feld */
function sichernKurz(): void {
  if (zustand !== 'ruhe' || !werkForm) {
    meldungZeigen('Sichern: erst eine Form aufblasen');
    return;
  }
  if (sichernDetails.open && !regler.hidden) sichernLos();
  else if (werk.G.ablageName) void sichernUnter(werk.G.ablageName);
  else sichernOeffnen();
}

const fassungKnoepfe = $<HTMLSpanElement>('fassungen');
FASSUNGEN.forEach((name, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = name;
  b.addEventListener('click', () => fassungSetzen(i as Fassung));
  fassungKnoepfe.append(b);
});
function fassungSetzen(f: Fassung): void {
  fassung = f;
  [...fassungKnoepfe.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === f)));
  anstossen();
}
fassungSetzen(fassung);

const bereiche: Bereich[] = [
  { titel: 'Linien und Punkte', speicher: 'ozzy-linien-1', zeilen: LINIEN_REGLER as ReglerZeile<string>[], werte: linienWerte as unknown as Record<string, number>, grundwerte: LINIEN_GRUNDWERTE as unknown as Record<string, number> },
  { titel: 'Freihand', speicher: 'ozzy-freihand-1', zeilen: FREIHAND_REGLER, werte: freihandWerte as unknown as Record<string, number>, grundwerte: FREIHAND_GRUNDWERTE as unknown as Record<string, number> },
  {
    titel: 'Seifenhaut und Aufblasen',
    speicher: 'ozzy-blase-1',
    zeilen: (BLASE_REGLER as ReglerZeile<string>[]).filter((r) => r.k !== 'schatten' && r.k !== 'weich'),
    werte: werte as unknown as Record<string, number>,
    grundwerte: BLASE_GRUND as unknown as Record<string, number>,
  },
  { titel: 'Raum und Ansichten', speicher: 'ozzy-buehne-1', zeilen: BUEHNE_REGLER, werte: bw as unknown as Record<string, number>, grundwerte: BUEHNE_GRUND as unknown as Record<string, number> },
];
const fein = feinreglerBauen($('regler-liste'), bereiche, (bereich, k) => {
  if (bereich === 'Linien und Punkte') blatt.verhalten.abtasten();
  if (bereich === 'Seifenhaut und Aufblasen' && koerper && raum) {
    koerper.fuelle = werte.fuelle;
    raumRechnen();
    if (zustand === 'ruhe') {
      koerper.setzen(moment(T, masse(), werte).lage);
      koerper.dehnungRechnen();
      haut.hochladen();
    }
  }
  if (bereich === 'Raum und Ansichten') {
    raumRechnen();
    if (k === 'groesse' || k === 'alle') massstab.nachfuehren = true;
  }
  anstossen();
});
$('knopf-grundwerte').addEventListener('click', () => fein.grundwerte());
$('knopf-kopieren').addEventListener('click', () => fein.kopieren());
$('knopf-neu').addEventListener('click', () => {
  neu();
  reglerZeigen(false);
});

// ---------- Maul und Pose (Phase 5.4, E8) ----------

const maulTropfen = $<HTMLButtonElement>('maul-tropfen');
const fressen = $<HTMLElement>('fressen');
const fressenKnopf = $<HTMLButtonElement>('fressen-knopf');
const fressenMaul = $<HTMLInputElement>('fressen-maul');
const fressenKopf = $<HTMLInputElement>('fressen-kopf');
const fressenMaulZahl = $<HTMLSpanElement>('fressen-maul-zahl');
const fressenKopfZahl = $<HTMLSpanElement>('fressen-kopf-zahl');
fressenMaul.max = String(MAUL_WINKEL_MAX);
/** das Papier in der Pose (leicht getönt, aus dem Grün der Linien-Studie) und wie weit es gerade getönt ist */
const POSE_PAPIER = new Color('#f1f6f0');
let poseTon = 0;
/** ein Gerät mit Berührung (S12) */
const GROB = matchMedia('(any-pointer: coarse)');
/** eine Meldung des Werks steht so lange in der Hinweiszeile (ms) */
const MELDUNG_MS = 5000;
let meldung = { text: '', seit: 0 };

/**
 * S13 (liquid drop, Idee 7): Meldungen tropfen von oben in die Hinweiszeile (gestreckt im Fallen, kurz gestaucht beim Landen) und
 * verdunsten am Ende; danach kommt der Hinweis leise zurück. Die Bewegung macht CSS (`#hinweis.tropfen`, `.verdunsten`, `.leise`), die
 * Zeit des Verdunstens zählt die Uhr der Anzeige. Zurück: ob die Zeile noch Bilder braucht.
 */
let hinweisArt: 'hinweis' | 'meldung' | 'verdunsten' = 'hinweis';
let hinweisMeldung = '';
let verdunstenBis = 0;
const VERDUNSTEN_S = 0.65;
function hinweisSetzen(text: string, istMeldung: boolean): boolean {
  if (istMeldung) {
    if (hinweisArt !== 'meldung' || hinweisMeldung !== text) {
      hinweisArt = 'meldung';
      hinweisMeldung = text;
      hinweis.textContent = text;
      hinweisBewegen('tropfen');
    }
    return false;
  }
  if (hinweisArt === 'meldung') {
    hinweisArt = 'verdunsten';
    verdunstenBis = uhr + VERDUNSTEN_S;
    hinweisBewegen('verdunsten');
    return true;
  }
  if (hinweisArt === 'verdunsten') {
    if (uhr < verdunstenBis) return true;
    hinweisArt = 'hinweis';
    hinweis.textContent = text;
    hinweisBewegen(text ? 'leise' : null);
    return false;
  }
  if (hinweis.textContent !== text) hinweis.textContent = text;
  return false;
}
function hinweisBewegen(art: 'tropfen' | 'verdunsten' | 'leise' | null): void {
  hinweis.classList.remove('tropfen', 'verdunsten', 'leise');
  if (!art) return;
  // neu anstoßen, auch wenn dieselbe Bewegung schon lief
  void hinweis.offsetWidth;
  hinweis.classList.add(art);
}

/** der gewählte Ring, an dem ein Maul entstehen kann (offen, nicht hängend), wie ihn `maulAnlegen` im Werk nimmt */
function maulRing(): (typeof werk.loops)[number] | null {
  for (const w of werk.G.auswahl) {
    const l = werk.loops[werk.loopNr(w.l)];
    if (l?.art === 'ring' && !l.haengt) return l;
  }
  return null;
}
/** ein harter Ring ist schon ein geformtes Maul (wie in `maulAnlegen`) */
const maulHart = (l: (typeof werk.loops)[number]): boolean => !!l.maulGeformt || (!!l.kante && l.punkte.every((p) => p.kante !== false));

/** Tropfen und Regler nach dem Stand des Werks (jedes Bild, solange das Verhalten die Flächen hat) */
function maulUiZeigen(): void {
  const an = zustand === 'ruhe' && werkGezeigt && bearbeitenAn;
  // der Tropfen hängt unter dem tiefsten sichtbaren Punkt der gewählten Linie
  const l = an && !werk.grund && !werk.maulLauf && !werk.zug && !bearbeiten.stift ? maulRing() : null;
  let ort: { x: number; y: number } | null = null;
  if (l && werk.G.maul?.id !== l.id) {
    werkBlatt.anker.forEach((A, pi) => {
      const p = werkBlatt.netz.punkte[pi];
      if (!p?.sichtbar || !A.werk.some((w) => w.id === l.id)) return;
      if (!ort || p.y > ort.y) ort = { x: p.x, y: p.y };
    });
  }
  const o = ort as { x: number; y: number } | null;
  maulTropfen.hidden = !o;
  if (o && l) {
    const text = maulHart(l) ? 'Maul' : 'Maul formen';
    if (maulTropfen.textContent !== text) maulTropfen.textContent = text;
    maulTropfen.style.left = `${o.x.toFixed(1)}px`;
    maulTropfen.style.top = `${(o.y + 14).toFixed(1)}px`;
  }
  // oben rechts „Fressen“, sobald es ein Maul gibt
  fressen.hidden = !(an && werk.G.maul);
  fressenKnopf.setAttribute('aria-pressed', String(werk.grund !== null));
  if (!vorRegler) {
    fressenMaul.value = String(werk.pose.kiefer);
    fressenKopf.value = String(werk.pose.schaedel);
  }
  fressenMaulZahl.textContent = `${Number(fressenMaul.value).toFixed(0)}°`;
  fressenKopfZahl.textContent = `${Number(fressenKopf.value).toFixed(0)}°`;
}

maulTropfen.addEventListener('click', () => {
  const l = maulRing();
  if (!l || werk.zug || werk.maulLauf || werk.grund) return;
  // eine weiche Linie: das Maul formen (das Werk zeigt die Schritte und nimmt so lange nichts an); eine harte: sie ist das Maul
  if (maulHart(l)) werk.maulAnlegen();
  else werk.maulFormenGewaehlt();
  werk.anzeige.allesZeigen();
  anstossen();
});
fressenKnopf.addEventListener('click', () => {
  if (werk.zug || werk.maulLauf) return;
  if (werk.grund) werk.poseVerlassen();
  else werk.poseBetreten();
  werk.anzeige.allesZeigen();
  werkNeu = true;
  anstossen();
});
/** Stand vor dem Ziehen eines Reglers: ein Schritt für ⌘Z je Loslassen (wie im Prüffenster) */
let vorRegler: werk.Schnappschuss | null = null;
for (const r of [fressenMaul, fressenKopf]) {
  r.addEventListener('pointerdown', () => {
    vorRegler = werk.schnappschuss();
  });
  r.addEventListener('input', () => {
    vorRegler ??= werk.schnappschuss();
    if (!werk.knochenSetzen(Number(fressenMaul.value), Number(fressenKopf.value))) {
      fressenMaul.value = String(werk.pose.kiefer);
      fressenKopf.value = String(werk.pose.schaedel);
    }
    werkNeu = true;
    anstossen();
  });
  r.addEventListener('change', () => {
    const v = vorRegler;
    vorRegler = null;
    const anders =
      v && (v.pose.kiefer !== werk.pose.kiefer || v.pose.schaedel !== werk.pose.schaedel || (v.grund === null) !== (werk.grund === null) || JSON.stringify(v.maul) !== JSON.stringify(werk.G.maul));
    if (v && anders) werk.zurueck.push(v);
    werk.anzeige.allesZeigen();
    anstossen();
  });
}

new ResizeObserver(groesse).observe(buehne);
groesse();
aufwaermen();
void document.fonts?.ready.then(() => {
  anstossen();
  // ?form=<Name>: diese gesicherte Form gleich laden
  const name = params.get('form');
  if (name) void formLaden(name).then((t) => console.info(`Ozzy: ${t}`));
});

// ---------- Test-Haken ----------

const haken = {
  /** eine gesicherte Form laden (wie Menü → Laden); zurück: die Meldung des Werks */
  laden: (name: string): Promise<string> => formLaden(name),
  /** Bearbeiten über das Werk: ob das Verhalten die Flächen hat, Netz, Flächen, Auswahl (Anker und im Werk) */
  /** die Punkte, wie das Verhalten sie sieht (CSS-Pixel), für die Probe des Lassos */
  /** S7: Proben der Linien hinter der Haut (grün) und davor, über alle Flächen */
  verdecktZahl: () => {
    let hinten = 0;
    let vorn = 0;
    for (const P of werkBlatt.proben) for (let k = 0; k < P.n; k++) if (P.schicht[k] === 1) hinten++; else vorn++;
    return [hinten, vorn];
  },
  netzPunkte: () => werkBlatt.netz.punkte.map((p, i) => ({ x: p.x, y: p.y, sichtbar: p.sichtbar, a: werkBlatt.flaechen[werkBlatt.anker[i]?.fl ?? -1]?.a ?? null, w: (werkBlatt.anker[i]?.werk ?? []).map((v) => `${v.id}.${v.i}`) })),
  bearbeiten: () => ({
    an: bearbeitenAn,
    flaechen: werkBlatt.flaechen.map((f) => f.a),
    punkte: werkBlatt.netz.punkte.length,
    sichtbar: werkBlatt.netz.punkte.filter((p) => p.sichtbar).length,
    linien: werkBlatt.netz.linien.length,
    roh: werkBlatt.roh.length,
    auswahl: [...bearbeiten.auswahl],
    werkAuswahl: werk.G.auswahl.map((w) => ({ ...w })),
    haengt: bearbeiten.haengt,
    ziel: bearbeiten.stat.ziel,
    schritte: werk.zurueck.length - (werkForm?.zurueck ?? 0),
    beschaeftigt: werkBeschaeftigt(),
    meldung: werk.G.meldung,
  }),
  /** wo ein Punkt des Werks (Loop-Kennung, Nummer) auf den Flächen mit diesem Blatt liegt (CSS-Pixel), ohne und mit Spiegelbild */
  ankerImBild: (id: number, i: number, a?: Flaeche['a']): { x: number; y: number; fl: number; a: Flaeche['a']; m: boolean; sichtbar: boolean }[] =>
    werkBlatt.anker.flatMap((A, pi) => {
      const F = werkBlatt.flaechen[A.fl]!;
      const p = werkBlatt.netz.punkte[pi]!;
      return A.werk.some((w) => w.id === id && w.i === i) && (!a || F.a === a) ? [{ x: p.x, y: p.y, fl: A.fl, a: F.a, m: A.m, sichtbar: p.sichtbar }] : [];
    }),
  /** wo ein Ort im Blatt `a` (Einheiten des Werks, wie `werk.imBlatt`) auf der Fläche dieses Blatts liegt (CSS-Pixel); eingerastet oder Feld */
  flaecheHin: (a: Flaeche['a'], X: number, Y: number): { x: number; y: number } | null => {
    const F = werkBlatt.flaechen.find((f) => f.a === a);
    if (!F) return null;
    const [x, y] = F.hin(X, Y);
    return { x, y };
  },
  /** eine Stelle mitten auf einer Linie des Werks (Loop-Kennung) auf der Fläche mit diesem Blatt, weit weg von ihren Punkten (CSS-Pixel) */
  linieImBild: (id: number, a: Flaeche['a']): { x: number; y: number } | null => {
    const li = werkBlatt.linien.findIndex((I) => I.id === id && !I.m && werkBlatt.flaechen[I.fl]?.a === a);
    const P = werkBlatt.proben[li];
    const L = werkBlatt.netz.linien[li];
    if (!P || !L || P.n < 3) return null;
    // die Probe, die von allen Punkten der Linie am weitesten weg liegt
    let best = 0;
    let bd = -1;
    for (let j = 0; j < P.n; j++) {
      let d = Infinity;
      for (const pi of L.punkte) {
        const q = werkBlatt.netz.punkte[pi]!;
        d = Math.min(d, Math.hypot(q.x - P.x[j]!, q.y - P.y[j]!));
      }
      if (d > bd) {
        bd = d;
        best = j;
      }
    }
    return { x: P.x[best]!, y: P.y[best]! };
  },
  /** der Pinsel (Phase 6): Radius (Werk), der Punkt, den er fassen würde, ob er zieht, Hauch, Blatt des Zugs */
  pinsel: (radius?: number) => {
    if (radius !== undefined) pinselRadius = radius;
    return {
      radius: pinselRadius,
      ziel: pinselZiel ? { id: pinselZiel.id, i: pinselZiel.i, m: pinselZiel.m } : null,
      zug: pinselZug !== null,
      blatt: pinselZug?.F.a ?? null,
      hauch: hauch.staerke,
      oAn: werk.G.oAn,
    };
  },
  /** wo ein Ort des Werks (wie gezeigt) im Bild liegt (CSS-Pixel) */
  werkImBild: (q: { x: number; y: number; z: number }): { x: number; y: number } => {
    const [x, y] = projizieren(werkInWelt(q), vpJetzt());
    return { x: x / D, y: y / D };
  },
  /**
   * Messen an oder aus (S1). `pixel`: das Bild der Haut im Bereich vergleichen (Bereich in CSS-Pixeln; ohne: um die Form); `still`:
   * die Zeit der Seifenhaut steht. Aus: die Bilder seit dem Einschalten.
   */
  messen: (an: boolean, o: { pixel?: boolean; still?: boolean; bereich?: { x: number; y: number; w: number; h: number } } = {}) => {
    if (an) {
      let b = o.bereich ?? null;
      if (!b && werkHaut.netz) {
        // um die Form: der Kasten ihrer gezeigten Haut im Bild
        const P = werkHaut.netz.pos;
        const vp = vpJetzt();
        let x0 = Infinity;
        let x1 = -Infinity;
        let y0 = Infinity;
        let y1 = -Infinity;
        for (let i = 0; i < P.length; i += 30) {
          const [x, y] = projizieren(new Vector3(P[i]!, P[i + 1]!, P[i + 2]!), vp);
          x0 = Math.min(x0, x / D);
          x1 = Math.max(x1, x / D);
          y0 = Math.min(y0, y / D);
          y1 = Math.max(y1, y / D);
        }
        b = { x: x0 - 10, y: y0 - 10, w: x1 - x0 + 20, h: y1 - y0 + 20 };
      }
      mess.an = true;
      mess.pixel = !!o.pixel && !!b;
      mess.still = !!o.still;
      mess.bilder = [];
      mess.vorher = null;
      mess.letzte = 0;
      if (b) {
        const x = Math.max(0, Math.round(b.x * D));
        const w = Math.min(Math.round(W * D) - x, Math.round(b.w * D));
        const h = Math.min(Math.round(H * D), Math.round(b.h * D));
        const y = Math.max(0, Math.round((H - b.y - b.h) * D));
        mess.bereich = { x, y, w: Math.max(1, w), h: Math.max(1, h) };
      }
      anstossen();
      return null;
    }
    mess.an = false;
    mess.still = false;
    const b = mess.bilder;
    mess.bilder = [];
    return b;
  },
  /** Blick: Ansicht, gewendet, wie flach, Gier und Neigung von Hand (rad), Maßstab (Bildpunkte je Pixel der Welt), Schwung */
  blick: () => ({ ansicht, gewendet, flach, vier, gier: nutzer.gier, neigung: nutzer.neigung, massstab: massstab.jetzt * nutzer.zoom, schwung: schwung !== null, fahrt: ansichtFahrt !== null, wendet: wenden !== null, schwarz: kanteMitte, kanteSichtbar, rueckseite: rueckseite(ansicht), hinten: hintenJetzt?.zahl ?? 0, blatt: blattModus(), zoom: nutzer.zoom, schwenk: [nutzer.schwenkX, nutzer.schwenkY], stift: stiftGesehen, finger: finger.size, geste: geste !== null }),
  /** wie dunkel die Rückseite an einem Punkt (CSS) ist, und die Mitte der fernen Wand einer Achse im Bild (CSS) */
  dunkelBei: (x: number, y: number) => hintenBei(hintenJetzt, x * D, y * D),
  wandMitte: (achse: 0 | 1 | 2) => {
    const e = raum;
    if (!e) return null;
    const g6 = wandGewichte();
    const q = [e.cx, e.cy, 0];
    q[achse] = q[achse]! + (g6[2 * achse]! >= g6[2 * achse + 1]! ? -1 : 1) * e.L;
    const [x, y] = projizieren(new Vector3(q[0], q[1], q[2]), vpJetzt());
    return { x: x / D, y: y / D };
  },
  /**
   * S10 (Probe des Auffaltens): sechs Bezugspunkte der Zeichnungen (je Wand die Mitte der Form und ein Punkt daneben)
   * in diesem Bild (CSS), so wie die Linien sie zeigen: an der Wand, beim Auffalten oder im Feld
   */
  faltPunkte: () => {
    const e = raum;
    if (!e || zustand !== 'ruhe') return null;
    const F = felder();
    const s4 = feldMassstab(F);
    const v = glatt(vier);
    const g6 = wandGewichte();
    const sw = [g6[0]! >= g6[1]! ? -1 : 1, g6[2]! >= g6[3]! ? -1 : 1, g6[4]! >= g6[5]! ? -1 : 1];
    const f = faltJetzt;
    const vp = vpJetzt();
    const P: [FeldAchse, Vector3][] = [
      ['seite', new Vector3(e.cx, e.cy, 0)],
      ['seite', new Vector3(e.cx + e.rx, e.cy + 0.5 * e.ry, 0)],
      ['front', new Vector3(0, e.cy, 0)],
      ['front', new Vector3(0, e.cy + 0.5 * e.ry, 0.8 * e.tiefe)],
      ['top', new Vector3(e.cx, 0, 0)],
      ['top', new Vector3(e.cx + 0.5 * e.rx, 0, 0.8 * e.tiefe)],
    ];
    const punkte = P.map(([n, p]) => {
      const achse = ACHSE_VON[n];
      let q: [number, number];
      if (vier > 1e-3 && v > 0.999) q = imFeld(n, p, F, s4);
      else if (f) {
        const [x, y] = projizieren(faltPunkt(n, p, f), f.vp);
        q = [x, y];
      } else {
        const w = p.clone();
        w.setComponent(achse, [e.cx, e.cy, 0][achse]! + sw[achse]! * e.L);
        const [x, y] = projizieren(w, vp);
        q = [x, y];
      }
      return { n, x: q[0] / D, y: q[1] / D };
    });
    return { vier, e: f?.e ?? null, punkte };
  },
  /** P an oder aus (wie die Taste P) */
  stift: (an: boolean): boolean => {
    stiftImRaum(an);
    return bearbeiten.stift;
  },
  /** die Linien des Werks: je Loop Kennung, Art und Punkte (Einheiten des Werks, wie sie liegen) */
  werkLinienDaten: () =>
    werk.loops.map((l) => ({
      id: l.id,
      art: l.art,
      punkte: l.punkte.map((p, i) => ({ i, x: p.ref.x, y: p.ref.y, z: p.ref.z, kreuzung: p.kreuzung ?? null, sichtbar: !p.vonSelbst, ecke: werk.eckeGezeigt(werk.loopNr(l.id), i), ein: p.ein ?? null, aus: p.aus ?? null })),
      geformt: l.maulGeformt ?? false,
      kante: l.kante ?? null,
      haengt: l.haengt ?? null,
    })),
  /** S13 (5): Bogenlänge und halbe Breite je Probe einer Linie (Loop-Kennung) auf der Fläche mit diesem Blatt, nicht gespiegelt (CSS-Pixel) */
  linienBreite: (id: number, a: Flaeche['a']) => {
    const li = werkBlatt.linien.findIndex((I) => I.id === id && !I.m && werkBlatt.flaechen[I.fl]?.a === a);
    const PR = werkBlatt.proben[li];
    return PR ? { s: Array.from(PR.s.subarray(0, PR.n)), halb: Array.from(PR.halb.subarray(0, PR.n)), stueckS: Array.from(PR.stueckS), laenge: PR.laenge } : null;
  },
  /** S11: Ist der Stand des Werks so, dass er gesichert werden kann (die Prüfung der Ablage), und welche Punkte der Haut keinen Spiegelpartner haben */
  standPruefen: () => {
    const h = werk.haut;
    const ohne: number[] = [];
    for (let v = 0; v < h.n; v++) if (h.spiegel[v]! < 0 || h.spiegel[v]! >= h.n) ohne.push(v);
    return {
      mangel: pruefen(werk.standJetzt()),
      n: h.n,
      ohne: ohne.length,
      lage: ohne.slice(0, 8).map((v) => [h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!]),
    };
  },
  /** Maul und Pose: das Maul (Loop-Kennung), in der Pose, Winkel der Knochen; die Haut, wie sie zu sehen ist (Einheiten des Werks) */
  pose: (mitHaut = false) => ({
    maul: werk.G.maul?.id ?? null,
    an: werk.grund !== null,
    kiefer: werk.pose.kiefer,
    schaedel: werk.pose.schaedel,
    lauf: werk.maulLauf !== null,
    papier: poseTon,
    tropfen: maulTropfen.hidden ? null : maulTropfen.textContent,
    fressen: !fressen.hidden,
    haut: mitHaut ? Array.from(werk.alsAnzeige(() => werk.haut.pos)) : null,
  }),
  /** eine geschlossene Silhouette setzen (CSS-Pixel des Blatts), wie mit P gezeichnet */
  form(anker: { x: number; y: number; ein?: [number, number]; aus?: [number, number] }[]): void {
    neu();
    const n = { punkte: anker.map((a) => ({ x: a.x, y: a.y, sichtbar: true, verdeckt: false })), linien: [] as never[] };
    const m = anker.length;
    const linie = {
      zu: true,
      punkte: anker.map((_, i) => i),
      knick: anker.map((a) => !a.ein && !a.aus),
      stuecke: anker.map((a, i) => {
        const b = anker[(i + 1) % m]!;
        return { g1x: a.aus?.[0] ?? (b.x - a.x) / 3, g1y: a.aus?.[1] ?? (b.y - a.y) / 3, g2x: b.ein?.[0] ?? (a.x - b.x) / 3, g2y: b.ein?.[1] ?? (a.y - b.y) / 3, art: 'umriss' as const };
      }),
    };
    (n.linien as unknown[]).push(linie);
    blatt.verhalten.netzErsetzen(n as never);
    film = 1;
    netzBauen();
    leiste.lage(true);
    anstossen();
  },
  aufblasen,
  ablassen,
  neu,
  fassung: fassungSetzen,
  zeit(t: number | null): void {
    festeZeit = t;
    if (t !== null && zustand === 'blatt') aufblasen();
    if (t !== null && koerper && raum) {
      T = t;
      zustand = t >= moment(0, masse(), werte).dauer ? 'ruhe' : 'auf';
    }
    anstossen();
  },
  bild(dt = 1 / 60): void {
    bild(dt);
  },
  film(an: boolean): void {
    angehalten = an;
    if (!an) anstossen();
  },
  vorspulen(ms: number): void {
    for (let t = 0; t < ms; t += 1000 / 60) bild(1 / 60);
  },
  ansicht(a: Ansicht): void {
    ansichtSetzen(a);
  },
  vier(an: boolean): void {
    vierUmschalten(an);
  },
  /** Größe der Form im Bild: Abstand (CSS) zweier Punkte der Silhouette, wie sie gerade gezeigt werden (Raum: an der Haut) */
  massJetzt(): { s: number; p: number; flach: number; vier: number } {
    return { s: massstab.jetzt * nutzer.zoom, p: flach, flach, vier };
  },
  /** Punkt i der Silhouette im Bild (CSS) in der eingerasteten Seite oder im Feld der Seite */
  punktImBild(i: number): { x: number; y: number } | null {
    const a = silhouette?.[i];
    if (!a) return null;
    if (vier > 0.9) {
      const F = felder();
      const [px, py] = imFeld('seite', ankerWelt(a), F, feldMassstab(F));
      return { x: px / D, y: py / D };
    }
    const [px, py] = projizieren(ankerWelt(a), vpJetzt());
    return { x: px / D, y: py / D };
  },
  stand(): Record<string, unknown> {
    const m0 = koerper && raum ? moment(0, masse(), werte) : null;
    return { zustand, T, riss: m0?.riss ?? null, dauer: m0?.dauer ?? null, fassung, ...stat, anker: silhouette?.length ?? 0, geschlossen: blatt.geschlossen, ansicht, flach, vier, kamera: kam.aktiv.type };
  },
  /** Das Werk: ist die Form angelegt und zu sehen, Punkte der Haut, Linien, Stufen und Dauer der Anzeige, rechnet es noch */
  werk(): Record<string, unknown> {
    const m = mitteLinie();
    return {
      form: !!werkForm,
      gezeigt: werkGezeigt,
      punkte: werk.haut.n,
      linien: werk.loops.length,
      mittePunkte: m ? m.l.punkte.length : 0,
      stufen: werkHaut.stufen,
      anzeigeMs: werkHaut.ms,
      feinePunkte: werkHaut.netz ? werkHaut.netz.pos.length / 3 : 0,
      griffWartet: werk.griffWartet(),
      beschaeftigt: werkBeschaeftigt(),
      schritte: werkForm ? werk.zurueck.length - werkForm.zurueck : 0,
      f: werkHaut.f,
      mitte: werkHaut.mitte,
      umgeschlagen: werk.umgeschlageneZahl(),
      meldung: werk.G.meldung,
      /** S11: unter diesem Namen wurde die Form geladen oder zuletzt gesichert ('' = noch keiner) */
      name: werk.G.ablageName,
      /** S13: gleitet die Anzeige (⌘Z) oder fließt Tusche (K) */
      fliesst: werkBlatt.fliesst,
      auswahl: werk.G.auswahl.map((w) => `${w.l}.${w.i}`).join(' '),
    };
  },
  /** Punkt i der Linie der Seite (wie gezeigt: aus dem Werk oder dem Blatt) im Bild (CSS): eingerastet, im Feld oder an der Wand */
  seitenPunktImBild(i: number): { x: number; y: number } | null {
    const p = seitenLinie(4)?.punkte.find((q) => q.i === i);
    if (!p || !raum) return null;
    if (vier > 0.9) {
      const F = felder();
      const [px, py] = imFeld('seite', new Vector3(p.x, p.y, 0), F, feldMassstab(F));
      return { x: px / D, y: py / D };
    }
    const g6 = wandGewichte();
    const z = flach > 0.85 ? 0 : (g6[4]! >= g6[5]! ? -1 : 1) * raum.L;
    const [px, py] = projizieren(new Vector3(p.x, p.y, z), vpJetzt());
    return { x: px / D, y: py / D };
  },
  /** Die Linie der Seite in der Welt (Pfad und Punkte), wie sie gerade gezeigt wird */
  seitenLinie: () => seitenLinie(1),
  /** Die Haut des Werks, wie sie ist (Einheiten des Werks): Lagen und Dreiecke */
  werkRoh: () => ({ pos: Array.from(werk.haut.pos), tri: Array.from(werk.haut.tri) }),
  /** Größte Koordinate und nicht endliche Werte: der Haut des Werks (Einheiten des Werks) und ihrer Anzeige (Welt) */
  /** S9: die Haut des Werks merken und wie weit sie sich seitdem bewegt hat (Einheiten des Werks; −1: anderes Netz) */
  hautMerken: () => {
    hautKopie = Float64Array.from(werk.haut.pos);
  },
  hautVersatz: () => {
    const P = werk.haut.pos;
    if (!hautKopie || hautKopie.length !== P.length) return -1;
    let m = 0;
    for (let i = 0; i < P.length; i++) m = Math.max(m, Math.abs(P[i]! - hautKopie[i]!));
    return m;
  },
  werkGrenzen: () => {
    const g = (P: ArrayLike<number>): { max: number; nichtEndlich: number } => {
      let max = 0;
      let nichtEndlich = 0;
      for (let i = 0; i < P.length; i++) {
        const v = P[i]!;
        if (!Number.isFinite(v)) nichtEndlich++;
        else max = Math.max(max, Math.abs(v));
      }
      return { max, nichtEndlich };
    };
    return { haut: g(werk.haut.pos), anzeige: werkHaut.netz ? g(werkHaut.netz.pos) : null, quelle: werk.anzeigeQuelle.length, hautN: werk.haut.n };
  },
  /**
   * Übergabe prüfen: Wie weit liegen die Punkte der Haut des Werks (fein, höchstens `n` davon) neben der Blase, wenn die Rechenpunkte
   * genau auf ihr liegen (w = 0)? In Pixeln der Welt (eingerastet = Bildpunkte mal Maßstab).
   */
  uebergabePruefen(n = 1500): { groesste: number; mittel: number; punkte: number } | null {
    if (!werkForm || !koerper) return null;
    werkHaut.rechnen(uebergabeLagen(0), false);
    const z = werkHaut.netz!;
    const k = koerper;
    const I = k.index;
    const P = k.pos;
    const v = z.pos.length / 3;
    const schritt = Math.max(1, Math.floor(v / n));
    let groesste = 0;
    let summe = 0;
    let zahl = 0;
    for (let q = 0; q < v; q += schritt) {
      const p = [z.pos[3 * q]!, z.pos[3 * q + 1]!, z.pos[3 * q + 2]!] as const;
      let d = Infinity;
      for (let t = 0; t < I.length; t += 3) {
        const a = 3 * I[t]!;
        const b = 3 * I[t + 1]!;
        const c = 3 * I[t + 2]!;
        // Abstand zum Dreieck: über die Ebene, wenn der Fußpunkt drin liegt, sonst zum nächsten Eckpunkt (genügt hier: die Dreiecke sind klein)
        const ux = P[b]! - P[a]!;
        const uy = P[b + 1]! - P[a + 1]!;
        const uz = P[b + 2]! - P[a + 2]!;
        const wx = P[c]! - P[a]!;
        const wy = P[c + 1]! - P[a + 1]!;
        const wz = P[c + 2]! - P[a + 2]!;
        const nx = uy * wz - uz * wy;
        const ny = uz * wx - ux * wz;
        const nz = ux * wy - uy * wx;
        const nl = Math.hypot(nx, ny, nz);
        const px = p[0] - P[a]!;
        const py = p[1] - P[a + 1]!;
        const pz = p[2] - P[a + 2]!;
        let dd: number;
        if (nl > 1e-12) {
          const h = (px * nx + py * ny + pz * nz) / nl;
          const fx = px - (h * nx) / nl;
          const fy = py - (h * ny) / nl;
          const fz = pz - (h * nz) / nl;
          const uu = ux * ux + uy * uy + uz * uz;
          const uw = ux * wx + uy * wy + uz * wz;
          const ww = wx * wx + wy * wy + wz * wz;
          const fu = fx * ux + fy * uy + fz * uz;
          const fw = fx * wx + fy * wy + fz * wz;
          const den = uu * ww - uw * uw;
          const s = (ww * fu - uw * fw) / den;
          const r = (uu * fw - uw * fu) / den;
          dd = s >= -1e-6 && r >= -1e-6 && s + r <= 1 + 1e-6 ? Math.abs(h) : Math.min(Math.hypot(px, py, pz), Math.hypot(p[0] - P[b]!, p[1] - P[b + 1]!, p[2] - P[b + 2]!), Math.hypot(p[0] - P[c]!, p[1] - P[c + 1]!, p[2] - P[c + 2]!));
        } else dd = Math.hypot(px, py, pz);
        if (dd < d) d = dd;
      }
      groesste = Math.max(groesste, d);
      summe += d;
      zahl++;
    }
    werkNeu = true;
    return { groesste, mittel: summe / Math.max(1, zahl), punkte: zahl };
  },
  blatt,
};
(window as unknown as { __ozzy: typeof haken }).__ozzy = haken;
