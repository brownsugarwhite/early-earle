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
import { type Camera, Color, Matrix4, Vector2, Vector3, Vector4, WebGLRenderer } from 'three';
import { glatt, type Masse, type Moment, moment } from '../anfang/aufblasen';
import { FLACH, Koerper, netzAusUmriss } from '../anfang/form';
import { FASSUNGEN, type Fassung, Haut, type HautNetz, type HautWerte } from '../anfang/haut';
import { GRUNDWERTE as BLASE_GRUNDWERTE, REGLER as BLASE_REGLER, type Werte as BlasenWerte } from '../anfang/regler';
import { FluessigeAnzeige, type Koerper as LinienKoerper, type Szene, ZEIGER_PUNKTE } from '../linien/fluessig';
import { REGLER as LINIEN_REGLER } from '../linien/regler';
import { GRUNDWERTE as LINIEN_GRUNDWERTE, type Ansicht as LinienAnsicht, Verhalten, type Werte as LinienWerte } from '../linien/verhalten';
import { type OzzyObjekt, type OzzySzene, type WesenStand, auskunft, packen, pruefen, zusammen } from '../form/ablage';
import * as werk from '../form/werk';
import { WerkHaut, mitteLinie, mittePfad } from './werkHaut';
import { type Flaeche, WerkBlatt } from './werkBlatt';
import { type FeldTreffer, werkFelder } from './werkFelder';
import { GAST_MATERIALIEN, GastHaut, type GastMaterial } from './gast';
import type { GruenHaut } from './gruen';
import { FESTE_MATERIALIEN, FesteHaut, type FestesMaterial } from './material';
import { type Anker, Blatt, FREIHAND_GRUNDWERTE, type FreihandWerte, type Strich, type Werkzeug, aufzugPfad, strichBeginnen, strichPfad } from './blatt';
import { Kamera, type KameraLage, perspektiveBei, richtung, winkelZu } from './kamera';
import { Kapseln } from './kapseln';
import { AnsichtsTropfen } from './ansichtsTropfen';
import { Leiste, type SpiegelZustand } from './leiste';
import { reglerDehnung, reglerTropfen } from './reglerTropfen';
import { type Bereich, type ReglerZeile, feinreglerBauen, werteLesen } from './regler';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
// ?bild=1: ohne Bedienung (Vergleichsbilder); ?film=1: ohne Bedienung, mit Zeiger; ?info=1: Takt
if (params.get('bild') === '1' || params.get('film') === '1') document.body.classList.add('bild');
const mitZeigerImBild = params.get('film') === '1';
// B1 (17.11., zum Vergleich): ?zeiger=system: der Zeiger des Systems in der Form des Werkzeugs, solange der gezeichnete genau auf der
// Hand läge (`zeigerSystemSchritt`); ohne den Schalter wie bisher (immer gezeichnet)
const zeigerVomSystem = params.get('zeiger') === 'system';
// Prüfhilfe (17.11.): ?netz=1: im Raum das Rechennetz (Dreiecke) allein, ?netz=2: über blasser Seifenhaut. Das war zuerst als Florians
// „Wireframe im Raum“ missverstanden; er meinte das Kurvennetz (`raumNetz`, Taste W)
const netzArt = (params.get('netz') === '1' ? 1 : params.get('netz') === '2' ? 2 : 0) as 0 | 1 | 2;
/**
 * B3 (Florian, 17.11.: „das Kurvennetz genau wie in den Projektionsflächen, aber im Raum“): die Ansicht „Kurvennetz“ im Raum (Taste W,
 * `?raumnetz=1`): der weiße Körper mit Umriss statt der Seifenhaut, die Linien und Punkte des Werks auf der Form, zu greifen wie auf
 * den Flächen; die Zeichnungen an den Wänden treten dabei zurück. `raumNetzDeckung`: wie weit sie gerade eingeblendet ist (0 … 1).
 */
let raumNetz = params.get('raumnetz') === '1';
let raumNetzDeckung = 0;
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
/** eigene Fläche für Jelly und helles Solid (der Blaupause-Renderer als Gast, `gast.ts`), zwischen Raum und Linien */
const leinwandGast = $<HTMLCanvasElement>('gast');
leinwandGast.style.display = 'none';
/** und eine für das grüne Material (das Earle-Material des alten Editors auf dem WebGPU-Renderer, `gruen.ts`) */
const leinwandGruen = $<HTMLCanvasElement>('gast-earle');
leinwandGruen.style.display = 'none';
const gruss = $<HTMLDivElement>('gruss');
const hinweis = $<HTMLDivElement>('hinweis');
const infoAnzeige = $<HTMLSpanElement>('info');

const renderer = new WebGLRenderer({ canvas: leinwandHaut, antialias: false, alpha: false, powerPreference: 'high-performance' });
const haut = new Haut(renderer);
/** die Haut des Werks mit einem festen Material statt der Seifenhaut (Solid, Zebra) */
const feste = new FesteHaut(renderer);
const gast = new GastHaut(leinwandGast);
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
/**
 * alle Materialien neben der Seifenhaut, in der Reihenfolge des Menüs: Solid, Zebra (`material.ts`), Jelly, helles Solid (`gast.ts`),
 * Grün (`gruen.ts`)
 */
const MATERIAL_GRUEN = 'Grün';
const MATERIALIEN = [...FESTE_MATERIALIEN, ...GAST_MATERIALIEN, MATERIAL_GRUEN] as const;
type Material = FestesMaterial | GastMaterial | typeof MATERIAL_GRUEN;
const istGast = (m: Material): m is GastMaterial => (GAST_MATERIALIEN as readonly string[]).includes(m);
/**
 * Das Material der Haut (Florian, 18.11.): null = die Seifenhaut in ihrer Fassung, sonst eines der festen Materialien. Im Menü gemerkt;
 * `?material=solid|zebra|jelly|helles solid|grün|seifenhaut` für Proben.
 */
let material: Material | null = ((): Material | null => {
  let wahl = params.get('material');
  if (wahl === null) {
    try {
      wahl = localStorage.getItem('ozzy.material');
    } catch {
      wahl = null;
    }
  }
  return MATERIALIEN.find((m) => m.toLowerCase() === (wahl ?? '').toLowerCase()) ?? null;
})();
/** das Netz, das `feste` gerade zeigt (Stand der glatten Anzeige) */
let festeStand: { netz: unknown; version: number } | null = null;
let gastStand: { netz: unknown; version: number } | null = null;
/**
 * Das grüne Material: Sein Renderer (three/webgpu und das Earle-Material aus `@ee/render`) wird erst geladen, wenn es gewählt ist;
 * bis dahin kostet es Ozzy nichts.
 */
let gruen: GruenHaut | null = null;
let gruenLaedt = false;
let gruenStand: { netz: unknown; version: number } | null = null;
function gruenHolen(): GruenHaut | null {
  if (gruen) return gruen;
  if (!gruenLaedt) {
    gruenLaedt = true;
    void import('./gruen').then((m) => {
      gruen = new m.GruenHaut(leinwandGruen);
      gruen.groesse(W, H, D);
      anstossen();
    });
  }
  return null;
}
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
/** A3: Das Blatt hat die Blase ganz weggeschnitten (eingerastet): Von der Seifenhaut ist nichts zu sehen */
let schnittGanz = false;
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
/**
 * S16: Die Kiste klappt nur auf, wenn die Kamera vorn rechts oben steht (dort liegen die Front links, der Boden unten, die Seite hinten).
 * Steht sie woanders, dreht der Raum vorher dorthin (`vorDreh`, Gier und Neigung von Hand), und das Aufklappen wartet (`vierWartet`).
 */
let vorDreh: { t: number; dauer: number; g0: number; n0: number; g1: number; n1: number } | null = null;
let vierWartet = false;
/**
 * so weit (Anteil der Richtung) steht die Kamera vor jeder der drei Wände, sobald die Kiste aufklappt (`VORN_AB`: knapp vor der Ebene,
 * die alte Wand ist dann ausgeblendet), und am Ende der Drehung davor (`VORN_ZIEL`: so klappt sie auf, während die Drehung ausklingt)
 */
const VORN_AB = 0.01;
const VORN_ZIEL = 0.07;
/** Lage des Teilers: Florians Abweichung von der Lage aus den Maßen der Form (Anteile) und die Feder dorthin */
const teiler = { bx: 0, by: 0, fx: 0.5, fy: 0.5, zug: false, ueber: 0 };
/**
 * S17 (Florian, 17.11.: „Jedes Feld für sich“): Zoom und Verschiebung (CSS-Pixel) je Feld der Vier Ansichten. Sie bleiben beim Wechsel in
 * den Raum und zurück; „Einpassen“ setzt sie zurück.
 */
type FeldBlick = { zoom: number; x: number; y: number };
const feldBlick: Record<'seite' | 'front' | 'top' | 'raum', FeldBlick> = {
  seite: { zoom: 1, x: 0, y: 0 },
  front: { zoom: 1, x: 0, y: 0 },
  top: { zoom: 1, x: 0, y: 0 },
  raum: { zoom: 1, x: 0, y: 0 },
};
const FELD_ZOOM_MIN = 0.3;
const FELD_ZOOM_MAX = 8;
/**
 * S17b: Wenden je Feld wie in der Vollansicht: der Winkel (0 vorn, π die Gegenseite; Seite und Front drehen um die Hochachse, der Top um die
 * Querachse) und die Fahrt zum nächsten ganzen Wenden. Ein gewendetes Feld zeigt die Gegenseite, gespiegelt und dunkel wie die Rückseite.
 */
type FeldWende = { phi: number; fahrt: { von: number; nach: number; t: number; dauer: number } | null };
const feldWende: Record<'seite' | 'front' | 'top', FeldWende> = {
  seite: { phi: 0, fahrt: null },
  front: { phi: 0, fahrt: null },
  top: { phi: 0, fahrt: null },
};
let feldWendenZug: { n: 'seite' | 'front' | 'top'; x0: number; y0: number; phi0: number } | null = null;
/** S17b: Zuklappen wartet, bis gewendete Felder wieder vorn sind */
let vierZuWartet = false;
/**
 * S18, S19 und der Rückweg (Florian, 17.11.): ein Zug an der Kreuzung der Vier Ansichten. Aus einer Einzelansicht (`einzel`, S18) zieht man
 * sie aus der Ecke des Bilds ins Bild: Die anderen Ansichten gleiten herein, die eigene wird zu ihrem Feld. Aus dem Raum (`raum`, S19)
 * zieht man die Ecke der Kiste: Sie klappt auf, gekoppelt an den Zug. Aus den Vier Ansichten (`vier`) über den erlaubten Bereich hinaus in
 * eine Ecke: der Rückweg in die Ansicht dieser Ecke (oben rechts der Raum, die Kiste klappt zu). Nach dem Loslassen fährt die Kreuzung
 * weiter (`fahrt`) und endet in den Vier Ansichten, der Einzelansicht oder dem Raum.
 */
type EckAnsicht = 'seite' | 'front' | 'top' | 'raum';
type EckZug = {
  art: 'einzel' | 'raum';
  a: EckAnsicht;
  /** die Einzelansicht: Mitte der Form im Bild (CSS-Pixel), Maßstab (CSS-Pixel je Einheit) */
  einzel: { cx: number; cy: number; s: number } | null;
  /** die Ecke der Kiste im Raum (CSS-Pixel) */
  P0: [number, number];
  /** Versatz vom Zeiger zur Kreuzung beim Greifen */
  dx: number;
  dy: number;
  /** die Kreuzung jetzt (CSS-Pixel, im Bereich der Vier Ansichten) */
  kx: number;
  ky: number;
  /** wie weit die Kiste offen ist (Art `raum`) */
  e: number;
  von: 'einzel' | 'raum' | 'vier';
  fahrt: { kx0: number; ky0: number; kx1: number; ky1: number; e0: number; a0: [number, number]; t: number; dauer: number; ende: 'vier' | 'einzel' | 'raum' } | null;
};
let eckZug: EckZug | null = null;
/** S18 und Rückweg: die Kreuzung frei, auch außerhalb des erlaubten Bereichs (CSS-Pixel); null = wie `teiler` */
let kreuzFrei: [number, number] | null = null;
/** S19: wohin die Ecke der Kiste beim Aufklappen kommt (CSS-Pixel); null = wie in S10 */
let faltAnker: [number, number] | null = null;
/** S18: Die Einzelansicht wird gerade zu ihrem Feld (ihre eigenen Linien schweigen, das Feld zeigt sie) */
let einzelUebergang = false;
/** der Tropfen an der Ecke schwillt beim Anflug (0 … 1) und ein Doppelklick auf ihn */
let eckUeber = 0;
let eckKlick = { t: 0, x: 0, y: 0 };
/** wo der Tropfen der Kreuzung zuletzt gezeichnet wurde (CSS-Pixel; Probe) */
let kreuzBild: [number, number] | null = null;
/** S19: Halbmesser des Kreises, auf dem die Kiste ganz offen ist (Anteil der kürzeren Seite des Bilds) */
const ECK_KREIS = 0.3;
/**
 * S20 (Florian, 17.11.: „in der studie ist mehr verdeckt und die linien laufen sauber durch verjüngung in form“): In den flachen Ansichten
 * liegt die Haut des Werks als weißer Körper in der Anzeige wie in der Studie (Umriss als Hülle, Verdecktes je Bildpunkt). `?koerper=0`
 * schaltet es zum Vergleich ab.
 */
const KOERPER_AN = new URLSearchParams(location.search).get('koerper') !== '0';
/** so weit (Anteil des Halbmessers der Form) darf eine Linie hinter der Haut liegen und gilt doch als auf ihr (wie `bias` der Studie) */
const KOERPER_BIAS = 0.02;
/** über diese Tiefe dahinter (Anteil des Halbmessers) verjüngt sich die Tinte einer Linie ins feine Grün */
const KOERPER_BAND = 0.025;
/** so weit (Anteil des Halbmessers) liegt die Hülle des Umrisses hinter der Haut: Sie zeigt sich nur am Rand und an tiefen Falten */
const HUELLE_TIEFE = 0.06;
let koerperNetz: unknown = null;
let koerperNr = 0;
let koerperVersion = -1;
let koerperWicklung = 1;
/** S20: wie deckend der Körper gerade ist: kommt eine flache Ansicht zur Ruhe, blendet er weich ein, der alte Umriss weich aus */
let koerperDeckung = 0;
/** S17: Nummer des Bereichs der Anzeige je Feld (an seinem Rand wird abgeschnitten) */
const BEREICH_VON = { seite: 1, front: 2, top: 3, raum: 4 } as const;
/** S17: die Bereiche dieses Bilds für die Anzeige (vier Kanten je Feld, Gerätepunkte), leer außerhalb der Vier Ansichten */
let bereicheJetzt: number[] = [];
/** S17: Schwenken mit Leertaste + Ziehen (im Feld unter dem Zeiger oder in der Vollansicht) */
let leertaste = false;
/** seit wann die Leertaste gehalten wird und ob dabei geschwenkt wurde (kurz getippt ohne Schwenken: noch einmal aufblasen, wie bisher) */
let leertasteSeit = 0;
let leertasteGeschwenkt = false;
let schwenkZug: { feld: 'seite' | 'front' | 'top' | 'raum' | null; x0: number; y0: number; bx: number; by: number } | null = null;

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
/**
 * So dick wird die dickste Stelle einer frischen Form mindestens angelegt (halbe Dicke, Einheiten des Werks; Florian, 18.11.: „Ja lege
 * die form größer an“). Die Netzkante des Werks ist fest (rund 15 Einheiten): Ein schlanker Delfin mit halber Länge 150 ist nur 39
 * dick und bekam 600 Rechenpunkte, Flossen und Schnabel waren dünner als eine Kante; seine von Hand geformten Formen sind 60 bis 320
 * dick und haben 3 500 bis 11 400 Punkte. Größer angelegt wird nur, was sonst dünner wäre, höchstens `WERK_GROESSER`-fach; im Bild
 * bleibt die Form gleich groß (`werkHaut.f`).
 */
const WERK_DICKE = 115;
const WERK_GROESSER = 4;
/** die Anzeige des aktiven Objekts (jedes Objekt hat seine eigene, `ruhende`: Beim Wechsel des Objekts wechselt auch sie) */
let werkHaut = new WerkHaut();
/**
 * Die Form im Werk: aus welcher Silhouette (Stand des Blatts) und wie viele Schritte für ⌘Z das Werk danach schon hatte (davor liegt
 * seine Startkugel, dorthin geht ⌘Z in Ozzy nicht).
 */
let werkForm: { stand: number; zurueck: number; geladen?: string; ohneLinie?: boolean; startLoops?: boolean } | null = null;
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
/**
 * Formen beginnen mit Edgeloops (Florian, 18.11. spät: „dass formen ab jetzt schon mit edgeloops beginnen“): nach dem Aufblasen die
 * drei Umrisse der drei Ansichten. Die Linie der Seite ist die gezeichnete Silhouette; dazu ein Loop quer und einer längs, beide
 * durch die dickste Stelle (`startLoopsAnlegen`). Schalter im Menü, `?loops=0|1` für Proben. Die Linie der Mitte bleibt dann immer.
 */
let startLoops = ((): boolean => {
  const u = new URLSearchParams(location.search).get('loops');
  if (u === '1') return true;
  if (u === '0') return false;
  // (eine Probe, die `?ohneLinie` festlegt, meint den Stand von vor den Start-Loops)
  if (new URLSearchParams(location.search).has('ohneLinie')) return false;
  try {
    return localStorage.getItem('ozzy.startLoops') === '1';
  } catch {
    return false;
  }
})();
/** Ist die frische Form des Werks fertig angelegt (ihre Linien sind, wie sie zum Start sein sollen)? */
const startFertig = (): boolean => !!werkForm && (werkForm.geladen !== undefined || (startLoops ? !!werkForm.startLoops : mitLinie || !!werkForm.ohneLinie));
/** Übergabe von der Blase: je Rechenpunkt des Werks drei Punkte der Blase und ihre Gewichte */
let uebergabe: { koerper: Koerper; haut: typeof werk.haut; idx: Int32Array; gew: Float32Array; lagen: Float64Array } | null = null;
/** zeigt die Seifenhaut die Haut des Werks; muss sie neu gerechnet werden (auch: in den Stufen der Ruhe); wann zuletzt geändert */
let werkGezeigt = false;
/** wann (T) und bei welchem Stand der Feder der Blase die Haut des Werks übernommen hat */
let uebergabeStart: { T: number; w0: number } | null = null;
let werkNeu = false;
/** das Netz, das die Seifenhaut gerade zeigt (`werkHaut.zeigeNetz`: mit Spiegelbild ein anderes als ohne) */
let hautZeigt: unknown = null;
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
// B4 (17.11.): nach ⌘Z (und K) fließt die Haut mit den Linien zurück
werkBlatt.mitRueckfluss = () => werkHaut.rueckfluss();
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
/** P, Freihand und Formen in der Leiste an (null: beim nächsten Bild neu setzen) */
let zeichnenErlaubt: boolean | null = null;
/** Werkzeug im Raum (mit dem Werk): Auswahl, P (über das Verhalten), Freihand, Ellipse, Würfel */
let raumWerkzeug: Werkzeug = 'auswahl';
/** Freihand und Formen im Raum (Etappe 5.3): ein Strich oder ein Aufzug auf einer Fläche (Bildschirm, CSS-Pixel) */
let raumStrich: { fl: number; st: Strich } | null = null;
let raumAufzug: { fl: number; art: 'ellipse' | 'wuerfel'; von: { x: number; y: number }; bis: { x: number; y: number } } | null = null;
const strichWerkzeug = (): boolean => raumWerkzeug === 'frei' || raumWerkzeug === 'ellipse' || raumWerkzeug === 'wuerfel';
/**
 * Objekte (18.11., Plan „Objekte, Spiegel und Nähte“; Florian: „V ist schwarzer cursor für das ganze objekt und A ist weißer cursor
 * für die punkte (edit) wie bei illustrator“): Mit V steht der Raum im Objekt-Modus. Der Zeiger ist dunkel und bleibt es, die Linien
 * der Form stehen still (keine Punkte, nichts zu greifen), ein Klick auf die Form wählt sie als Ganzes, ein Doppelklick wechselt zu
 * ihren Punkten (A).
 */
const objektModus = (): boolean => raumWerkzeug === 'objekt';
/** das Objekt ist gewählt (noch gibt es eines: die Form); der letzte Klick darauf (Doppelklick) und ein Drücken im Objekt-Modus */
let objektGewaehlt = false;
let objektKlick = { t: 0, x: 0, y: 0 };
let objektDruck: { x: number; y: number; getroffen: boolean; gespiegelt: boolean } | null = null;
/**
 * Ein Zug am ganzen Objekt (V): Ziehen am Objekt verschiebt es, G, S, R verschieben, skalieren, drehen es mit dem Zeiger (`modal`:
 * Klick oder ↩ beendet, Esc nimmt zurück, X, Y, Z halten das Verschieben längs einer Achse). Geführt im Blatt der Fläche unter dem
 * Zeiger (eine flache Ansicht, ein Feld) oder, im Raum, in der Ebene durch die Mitte des Objekts, die der Kamera am meisten
 * zugewandt ist; das Werk bildet die ganze Form ab (`werk.formZug…`, kein Löser).
 */
let objektZug: { F: Flaeche; modal: boolean; sx: number; sy: number; gespiegelt: boolean } | null = null;

// ---------- mehrere Objekte (18.11., Plan „Objekte, Spiegel und Nähte“, Etappe 3) ----------

/**
 * Ein ruhendes Objekt. Das Werk rechnet immer an einem Objekt, dem aktiven; die anderen ruhen: ihr Stand im Werk (samt Rückweg und
 * Spiegel), ihre fertige Anzeige (eine eigene `WerkHaut`, ihr Netz liegt im Raum), ihre Zeichnung auf dem Blatt und ihre Blase (für
 * „Luft ablassen“). Wer ein ruhendes Objekt anklickt, macht es zum aktiven (`objektAktivieren`): ein Zuweisen, keine Rechnung.
 */
type Ruhend = {
  id: number;
  haut: WerkHaut;
  stand: werk.ObjektStand;
  form: { stand: number; zurueck: number; geladen?: string; ohneLinie?: boolean; startLoops?: boolean };
  marken: { n: number; clipping: boolean; spiegelbild: boolean }[];
  /** die Objekte, die es aufgenommen hat (verschmolzen, abgezogen): ⌘Z hinter den Schritt gibt sie wieder heraus */
  naehte: NahtMarke[];
  koerper: Koerper | null;
  zeichnung: ReturnType<Blatt['netzKopie']>;
  /** seine grobe Haut im Raum, für Treffer: Lagen (3 je Punkt), Dreiecke; ob auch sein Spiegelbild zu treffen ist */
  treffer: { pos: Float32Array; tri: Uint32Array; spiegelbild: boolean };
  /** sein Kasten im Raum: Mitte und halbe Maße (die Tiefe gilt nach beiden Seiten der Spiegelebene) */
  kasten: { cx: number; cy: number; rx: number; ry: number; tiefe: number };
  /**
   * seine Linien im Raum, als Strecken (je 6 Zahlen: Anfang, Ende), samt ihren Spiegelbildern: Solange das Objekt ruht, stehen sie als
   * feine Striche an den Wänden und in den Ansichten (ohne Punkte; zu greifen sind sie, sobald das Objekt aktiv ist)
   */
  linien: Float32Array;
};
/**
 * Etappe 4: Das aktive Objekt hat ein anderes aufgenommen (verschmolzen oder abgezogen). `n`: so viele Schritte hatte das Werk davor;
 * ein ⌘Z dahinter gibt `teil` wieder heraus (es ruht dann wie zuvor) und stellt den Spiegel von davor zurück.
 */
type NahtMarke = { n: number; teil: Ruhend; clipping: boolean; spiegelbild: boolean };
const ruhende: Ruhend[] = [];
const nahtMarken: NahtMarke[] = [];
/**
 * Mehrere Silhouetten auf einem Blatt (Etappe 3; Florian: neue Objekte „aufgeblasen wie das erste, auch mehrere beim ersten
 * Zeichnen“): Jede geschlossene Linie wird ein Objekt. ↩ bläst die größte auf wie immer; die anderen warten hier und folgen der
 * Reihe nach (rascher, die Kamera bleibt dabei im Raum). `erste`: die Kennung der größten, sie ist am Ende das aktive Objekt;
 * `imRaum`: Die erste steht schon, jetzt folgen die anderen; `zahl`: so viele Formen sind es zusammen.
 */
let reihe: { warten: (ReturnType<Blatt['netzKopie']> | Geladen)[]; erste: number; imRaum: boolean; zahl: number; geladen?: string } | null = null;
/** ein Objekt einer geladenen Szene, das noch aufs Aufblasen wartet: sein Stand, seine Kennung, sein Spiegel und sein Maß im Raum */
type Geladen = OzzyObjekt & { stand: WesenStand; name: string };
const istGeladen = (x: ReturnType<Blatt['netzKopie']> | Geladen): x is Geladen => 'stand' in x;
/** der Kasten eines Stands im Raum (aus seiner Haut und seinem Maß) */
function standKasten(st: WesenStand, mass: OzzyObjekt['mass']): { cx: number; cy: number; rx: number; ry: number; tiefe: number } {
  const P = st.haut.pos;
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
  const f = mass.f;
  return { cx: (x0 + x1) / 2 / f + mass.mitte.x, cy: (y0 + y1) / 2 / f + mass.mitte.y, rx: (x1 - x0) / 2 / f, ry: (y1 - y0) / 2 / f, tiefe: z / f };
}
/** so viel rascher blasen die folgenden Formen einer Reihe auf */
const REIHE_TEMPO = 2.5;
/** die Kästen der Formen, die in der Reihe noch warten, im Raum (die Tiefe geschätzt: eine runde Form ist so dick wie schmal) */
function reiheKaesten(): { cx: number; cy: number; rx: number; ry: number; tiefe: number }[] {
  if (!reihe) return [];
  return reihe.warten.flatMap((n) => {
    if (istGeladen(n)) return [standKasten(n.stand, n.mass)];
    const k = Blatt.kasten(n);
    if (!k) return [];
    const rx = (k.x1 - k.x0) / 2;
    const ry = (k.y1 - k.y0) / 2;
    return [{ cx: (k.x0 + k.x1) / 2 - W / 2, cy: H / 2 - (k.y0 + k.y1) / 2, rx, ry, tiefe: Math.min(rx, ry) }];
  });
}
/** läuft gerade ein Verbinden (beim ersten Mal lädt die Bibliothek einen Augenblick)? */
let nahtLaeuft = false;
let aktivId = 1;
/**
 * Die höchste Kennung, die vergeben ist. Eine Kennung wird nicht noch einmal vergeben, solange ihr Objekt zurückkommen kann (ein
 * gelöschtes mit ⌘Z, ein aufgenommenes, wenn das Verbinden zurückgenommen wird); nur ein abgebrochenes Plus gibt seine zurück.
 */
let objektZaehler = 1;

/**
 * Der gemeinsame Rückweg (Etappe 3; bis dahin gehörte ⌘Z dem aktiven Objekt, und ein gelöschtes war weg). Hier steht in der
 * Reihenfolge, in der es geschah: jeder Schritt im Werk mit der Kennung seines Objekts, und jedes gelöschte Objekt. ⌘Z nimmt den
 * letzten Eintrag zurück: einen Schritt an dem Objekt, an dem er geschah (es wird dafür das aktive), oder ein Löschen (das Objekt
 * ist wieder da und aktiv). Die Schritte selbst liegen wie bisher im Rückweg jedes Objekts (`werk.zurueck`); `rueckwegAbgleichen`
 * liest daran ab, was dazugekommen oder schon zurückgenommen ist.
 */
type RueckEintrag = { art: 'schritt'; id: number } | { art: 'geloescht'; teil: Ruhend };
const rueckweg: RueckEintrag[] = [];
/** je Objekt: so viele seiner Schritte stehen im gemeinsamen Rückweg */
const rueckZahl = new Map<number, number>();
function rueckwegAbgleichen(): void {
  if (!werkForm) return;
  const ist = Math.max(0, werk.zurueck.length - werkForm.zurueck);
  let soll = rueckZahl.get(aktivId) ?? 0;
  if (soll === ist) return;
  for (; soll < ist; soll++) rueckweg.push({ art: 'schritt', id: aktivId });
  for (; soll > ist; soll--) {
    // (ein Schritt ist zurückgenommen: Sein letzter Eintrag geht)
    for (let i = rueckweg.length - 1; i >= 0; i--) {
      const e = rueckweg[i]!;
      if (e.art === 'schritt' && e.id === aktivId) {
        rueckweg.splice(i, 1);
        break;
      }
    }
  }
  rueckZahl.set(aktivId, ist);
}
/**
 * ⌘Z, wenn der letzte Eintrag kein Schritt am aktiven Objekt ist: ein gelöschtes Objekt kommt zurück, oder der Schritt lag an einem
 * anderen Objekt (es wird das aktive, dann geht sein Schritt zurück). Wahr, wenn ⌘Z damit erledigt ist.
 */
function rueckwegAnders(): boolean {
  rueckwegAbgleichen();
  for (;;) {
    const e = rueckweg[rueckweg.length - 1];
    if (!e) return false;
    if (e.art === 'geloescht') {
      if (!objektAblegenJetzt()) {
        werk.G.meldung = '⌘Z: erst den laufenden Handgriff beenden';
        return true;
      }
      rueckweg.pop();
      objektAufnehmenJetzt(e.teil);
      objektGewaehlt = false;
      werk.G.meldung = `Form ${e.teil.id} ist wieder da`;
      return true;
    }
    if (e.id === aktivId) return false;
    if (!ruhende.some((r) => r.id === e.id)) {
      // (das Objekt dieses Schritts gibt es nicht mehr: Der Eintrag ist verwaist)
      rueckweg.pop();
      continue;
    }
    if (!objektAktivieren(e.id)) return true;
    const s = werkForm && werk.zurueck.length > werkForm.zurueck ? werk.zurueck.pop() : undefined;
    if (s) {
      werkBlatt.rueckfluss();
      werk.wiederherstellen(s);
    }
    werk.anzeige.allesZeigen();
    werk.G.meldung = `⌘Z: Der letzte Schritt lag an Form ${e.id}; sie ist jetzt gewählt`;
    return true;
  }
}

/** wie deutlich die ruhenden Objekte zu sehen sind (auf dem Blatt blass), weich nachgeführt */
let ruheSicht = 1;
const RUHE_AUF_DEM_BLATT = 0.38;
/** das Netz aller ruhenden Objekte, wie die Seifenhaut es zeigt (neu, wenn sich ihre Reihe ändert) */
let ruheNetzGemerkt: { schl: string; netz: HautNetz | null } = { schl: '', netz: null };
const objektName = (): string => (ruhende.length ? `Form ${aktivId}` : werk.G.ablageName || (aktivId > 1 ? `Form ${aktivId}` : 'Form'));

/** mehrere Netze der Seifenhaut zu einem (die Lagen liegen alle im Raum) */
function netzeVereinen(netze: readonly HautNetz[]): HautNetz {
  let N = 0;
  let I = 0;
  for (const n of netze) {
    N += n.pos.length / 3;
    I += n.index.length;
  }
  const z: HautNetz = { pos: new Float32Array(3 * N), normal: new Float32Array(3 * N), index: new Uint32Array(I), hoehe: new Float32Array(N), seite: new Float32Array(N), blatt: new Float32Array(2 * N), dehnung: new Float32Array(N), sicht: new Float32Array(N) };
  let v0 = 0;
  let i0 = 0;
  for (const n of netze) {
    const k = n.pos.length / 3;
    z.pos.set(n.pos, 3 * v0);
    z.normal.set(n.normal, 3 * v0);
    z.hoehe.set(n.hoehe, v0);
    z.blatt.set(n.blatt, 2 * v0);
    z.sicht.set(n.sicht, v0);
    // (ruhende Objekte schneidet die Anzeige nicht an der Spiegelebene: Sie sind verschmolzen oder überragen sich; die Dehnung ist abgeklungen)
    for (let i = 0; i < n.index.length; i++) z.index[i0 + i] = n.index[i]! + v0;
    v0 += k;
    i0 += n.index.length;
  }
  return z;
}

/**
 * Das Netz aller Objekte in einem (das aktive vorn, dahinter die ruhenden): für alles, was die Haut des Werks als ein Netz zeigt (die
 * festen Materialien, Jelly, Grün, der weiße Körper der Linienansichten). Mit einem Objekt ist es dessen Netz selbst. Ändert sich nur
 * das aktive, wird sein Teil überschrieben; neu angelegt wird nur, wenn sich die Größen oder die Reihe der ruhenden ändern.
 */
let alleNetz: { aktiv: HautNetz; version: number; schl: string; netz: HautNetz } | null = null;
function zeigeNetzAlle(): HautNetz | null {
  const a = werkHaut.zeigeNetz;
  const r = ruheNetzGemerkt.netz;
  if (!a || !ruhende.length || !r) return a;
  const schl = ruheNetzGemerkt.schl;
  let g = alleNetz;
  const passt = g !== null && g.schl === schl && g.netz.pos.length === a.pos.length + r.pos.length && g.netz.index.length === a.index.length + r.index.length;
  if (!g || !passt) {
    g = { aktiv: a, version: -1, schl, netz: netzeVereinen([a, r]) };
    alleNetz = g;
  }
  if (g.version !== werkHaut.version || g.aktiv !== a) {
    g.version = werkHaut.version;
    g.aktiv = a;
    const z = g.netz;
    z.pos.set(a.pos);
    z.normal.set(a.normal);
    z.index.set(a.index);
    z.hoehe.set(a.hoehe);
    z.blatt.set(a.blatt);
    z.sicht.set(a.sicht);
    // (nur das aktive Objekt schneidet die Anzeige an der Spiegelebene, und nur an ihm klingt eine Dehnung)
    z.seite.set(a.seite);
    z.dehnung.set(a.dehnung);
  }
  return g.netz;
}

/** die ruhenden Objekte der Seifenhaut geben (nur, wenn sich ihre Reihe geändert hat) */
function ruheZeigen(): void {
  const schl = ruhende.map((r) => `${r.id}:${r.haut.version}:${r.haut.spiegelbild ? 1 : 0}`).join('|');
  if (schl === ruheNetzGemerkt.schl) return;
  const netze = ruhende.map((r) => r.haut.zeigeNetz).filter((n): n is HautNetz => n !== null);
  ruheNetzGemerkt = { schl, netz: netze.length ? netzeVereinen(netze) : null };
  haut.ruheSetzen(ruheNetzGemerkt.netz);
}

/** die Linien der Form des Werks im Raum als Strecken, samt Spiegelbildern (für ein Objekt, das von jetzt an ruht) */
function linienImRaum(): Float32Array {
  const f = werkHaut.f;
  const mx = werkHaut.mitte.x;
  const my = werkHaut.mitte.y;
  const frei = werk.istFrei();
  const aus: number[] = [];
  for (const l of werk.loops) {
    const L = l.ruhe;
    const n = l.proben.length;
    const m = l.art === 'ring' ? n - 1 : n;
    // gespiegelt: an einer verschmolzenen Form Ring und Paar (die Linie der Mitte liegt in der Ebene), an einer freien alles, wenn sie ihr Spiegelbild zeigt
    const spiegeln = frei ? werkHaut.spiegelbild : l.art !== 'mitte';
    for (const sz of spiegeln ? [1, -1] : [1])
      for (let j = 0; j < m; j++) {
        const k = (j + 1) % n;
        aus.push(L[3 * j]! / f + mx, L[3 * j + 1]! / f + my, (sz * L[3 * j + 2]!) / f, L[3 * k]! / f + mx, L[3 * k + 1]! / f + my, (sz * L[3 * k + 2]!) / f);
      }
  }
  return Float32Array.from(aus);
}

/** das aktive Objekt ablegen: Es ruht von jetzt an (bis ein anderes aufgenommen oder eine neue Form angelegt wird, steht es noch im Werk) */
function objektAblegenJetzt(): Ruhend | null {
  if (!werkForm || !werkGezeigt || !werkHaut.zeigeNetz || tastenZug || objektZug || spiegelFahrt) return null;
  rueckwegAbgleichen();
  const k = werkMasseWeltAktiv();
  const stand = k ? werk.objektAblegen() : null;
  if (!stand || !k) return null;
  const f = werkHaut.f;
  const P = werk.haut.pos;
  const pos = new Float32Array(P.length);
  for (let i = 0; i < P.length; i += 3) {
    pos[i] = P[i]! / f + werkHaut.mitte.x;
    pos[i + 1] = P[i + 1]! / f + werkHaut.mitte.y;
    pos[i + 2] = P[i + 2]! / f;
  }
  const r: Ruhend = {
    id: aktivId,
    haut: werkHaut,
    stand,
    form: werkForm,
    marken: spiegelMarken.splice(0),
    naehte: nahtMarken.splice(0),
    koerper,
    zeichnung: blatt.netzKopie(),
    treffer: { pos, tri: Uint32Array.from(werk.haut.tri), spiegelbild: werkHaut.spiegelbild },
    kasten: k,
    linien: linienImRaum(),
  };
  ruhende.push(r);
  werkFelder.leeren();
  return r;
}

/** ein ruhendes Objekt zum aktiven machen (das bisherige ist abgelegt oder wird verworfen) */
function objektAufnehmenJetzt(r: Ruhend): void {
  const i = ruhende.indexOf(r);
  if (i >= 0) ruhende.splice(i, 1);
  werkHaut = r.haut;
  aktivId = r.id;
  spiegelMarken.length = 0;
  spiegelMarken.push(...r.marken);
  nahtMarken.length = 0;
  nahtMarken.push(...r.naehte);
  spiegelFahrt = null;
  blatt.netzSetzen(r.zeichnung);
  silhouette = blatt.silhouette();
  netzStand = blatt.stand;
  koerper = r.koerper;
  haut.setzeKoerper(koerper);
  haut.hochladen();
  werkForm = r.form;
  werkBlatt.neueForm();
  werkFelder.leeren();
  werk.objektAufnehmen(r.stand);
  werk.anzeige.allesZeigen();
  uebergabe = null;
  uebergabeStart = null;
  hautZeigt = null;
  werkNeu = true;
  ruheZeigen();
  raumRechnen(bw.band);
  if (koerper && raum) T = moment(0, masse(), werte).dauer;
}

/** ein Objekt (seine Kennung) zum aktiven machen; wahr, wenn es jetzt das aktive ist */
function objektAktivieren(id: number): boolean {
  if (id === aktivId) return true;
  const r = ruhende.find((x) => x.id === id);
  if (!r || zustand !== 'ruhe') return false;
  if (!objektAblegenJetzt()) {
    werk.G.meldung = 'Das andere Objekt lässt sich erst wählen, wenn der laufende Handgriff beendet ist';
    return false;
  }
  objektAufnehmenJetzt(r);
  werk.G.meldung = '';
  return true;
}

/** der nächste Treffer eines Strahls (Ursprung o, Richtung d) auf einem Netz: der Weg längs d, sonst unendlich */
function strahlAufNetz(P: ArrayLike<number>, T: ArrayLike<number>, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): number {
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
    const px = dy * e2z - dz * e2y;
    const py = dz * e2x - dx * e2z;
    const pz = dx * e2y - dy * e2x;
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
    const v = (dx * qx + dy * qy + dz * qz) * inv;
    if (v < 0 || u + v > 1) continue;
    const w = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (w > 1e-6 && w < best) best = w;
  }
  return best;
}

/**
 * Das Objekt unter dem Zeiger: seine Kennung (das aktive oder ein ruhendes; das vorderste), 0: keins. Ein Strahl gegen die Häute
 * (auch gegen gezeigte Spiegelbilder): im Raum von der Kamera aus, in einer flachen Fläche (ein Feld der Vier Ansichten) längs ihrer
 * Achse, von der Seite her, die zum Betrachter zeigt.
 */
function objektBei(x: number, y: number): number {
  if (zustand !== 'ruhe' || !werkGezeigt) return 0;
  if (!ruhende.length) return objektUnter(x, y) ? aktivId : 0;
  let o: { x: number; y: number; z: number };
  let d: { x: number; y: number; z: number };
  if (pinselHier(x, y)) ({ o, d } = kam.strahl(x, y, W, H));
  else {
    const F = werkBlatt.flaechen[werkBlatt.flaecheUnter(x, y)];
    if (!F || F.raeumlich || !F.tiefe) return objektUnter(x, y) ? aktivId : 0;
    const XY = F.her(x, y);
    if (!XY) return 0;
    // der Ort im Blatt (im Maß des aktiven Objekts, wie `werkFelder.treffer`: Seite (x, −y), Front (z, −y), Top (x, z)) als Strahl im Raum
    const iu = F.a === 'front' ? 2 : 0;
    const iv = F.a === 'top' ? 2 : 1;
    const it = F.a === 'seite' ? 2 : F.a === 'front' ? 0 : 1;
    const vorn = F.vorn ?? 1;
    const p = [0, 0, 0];
    p[iu] = XY[0];
    p[iv] = (F.a === 'top' ? 1 : -1) * XY[1];
    const f = werkHaut.f;
    const welt = [p[0]! / f + werkHaut.mitte.x, p[1]! / f + werkHaut.mitte.y, p[2]! / f];
    welt[it] = vorn * 1e5;
    const dir = [0, 0, 0];
    dir[it] = -vorn;
    o = { x: welt[0]!, y: welt[1]!, z: welt[2]! };
    d = { x: dir[0]!, y: dir[1]!, z: dir[2]! };
  }
  let best = Infinity;
  let id = 0;
  const f = werkHaut.f;
  const aktiv = (spiegel: boolean): number => {
    const sz = spiegel ? -1 : 1;
    return strahlAufNetz(werk.haut.pos, werk.haut.tri, (o.x - werkHaut.mitte.x) * f, (o.y - werkHaut.mitte.y) * f, sz * o.z * f, d.x, d.y, sz * d.z) / f;
  };
  for (const s of werkHaut.spiegelbild ? [false, true] : [false]) {
    const w = aktiv(s);
    if (w < best) {
      best = w;
      id = aktivId;
    }
  }
  for (const r of ruhende)
    for (const s of r.treffer.spiegelbild ? [1, -1] : [1]) {
      const w = strahlAufNetz(r.treffer.pos, r.treffer.tri, o.x, o.y, s * o.z, d.x, d.y, s * d.z);
      if (w < best) {
        best = w;
        id = r.id;
      }
    }
  return id;
}

/**
 * Das Plus: ein neues Objekt. Das aktive ruht von jetzt an, das Blatt der Seite öffnet sich leer, die vorhandenen Objekte stehen
 * blass darin; gezeichnet wird das neue, ↩ bläst es auf (wie das erste). Esc auf dem leeren Blatt führt zurück in den Raum.
 */
function objektPlus(): void {
  if (zustand !== 'ruhe' || !werkGezeigt || !werkForm) return;
  if (bearbeiten.stift || strichWerkzeug() || objektModus()) werkzeugImRaum('auswahl');
  const r = objektAblegenJetzt();
  if (!r) {
    werk.G.meldung = 'Ein neues Objekt: erst den laufenden Handgriff beenden (und zurück in die Grundform)';
    anstossen();
    return;
  }
  // (die Anzeige des Objekts von eben gehört ihm: Das neue bekommt seine eigene)
  werkHaut = new WerkHaut();
  ruheZeigen();
  neu(true);
  // (eine neue Kennung; nur ein abgebrochenes Plus gibt seine zurück, `objektPlusAbbrechen`)
  aktivId = ++objektZaehler;
  werk.G.meldung = 'Neues Objekt: seine Form zeichnen, ↩ bläst es auf · Esc: zurück';
  anstossen();
}

/** das Plus abbrechen (Esc auf dem leeren Blatt): zurück in den Raum, das zuletzt abgelegte Objekt ist wieder das aktive */
function objektPlusAbbrechen(): boolean {
  const r = ruhende[ruhende.length - 1];
  if (zustand !== 'blatt' || !r || !blatt.leer) return false;
  if (aktivId === objektZaehler) objektZaehler--;
  objektAufnehmenJetzt(r);
  raumRechnen();
  massstab.jetzt = massstab.ziel;
  zustand = 'ruhe';
  if (koerper && raum) T = moment(0, masse(), werte).dauer;
  leiste.lage(true);
  werk.G.meldung = '';
  anstossen();
  return true;
}

/** das aktive Objekt löschen, wenn es noch andere gibt: Das zuletzt abgelegte wird das aktive. Wahr, wenn gelöscht wurde */
function objektLoeschen(): boolean {
  const r = ruhende[ruhende.length - 1];
  if (!r || zustand !== 'ruhe' || !werk.objektRuht() || tastenZug || objektZug) return false;
  // das gelöschte Objekt bleibt für ⌘Z liegen: sein Stand, seine Anzeige, sein eigener Rückweg
  const weg = objektAblegenJetzt();
  if (!weg) return false;
  ruhende.splice(ruhende.indexOf(weg), 1);
  rueckweg.push({ art: 'geloescht', teil: weg });
  objektAufnehmenJetzt(r);
  objektGewaehlt = false;
  werk.G.meldung = `Form ${weg.id} gelöscht · ⌘Z holt sie zurück`;
  return true;
}

// ---------- Naht zwischen zwei Objekten (18.11., Plan „Objekte, Spiegel und Nähte“, Etappe 4) ----------

/** die Spanne eines ruhenden Objekts quer zur Spiegelebene (aus seiner groben Haut, einmal gerechnet) */
const zSpannen = new WeakMap<Ruhend, [number, number]>();
function zSpanne(r: Ruhend): [number, number] {
  let z = zSpannen.get(r);
  if (!z) {
    z = [Infinity, -Infinity];
    const P = r.treffer.pos;
    for (let i = 2; i < P.length; i += 3) {
      z[0] = Math.min(z[0], P[i]!);
      z[1] = Math.max(z[1], P[i]!);
    }
    zSpannen.set(r, z);
  }
  return z;
}

/**
 * Das ruhende Objekt, das das aktive berührt: Ihre Kästen im Raum überlappen sich (auch der eines gezeigten Spiegelbilds); von
 * mehreren das mit der größten Überlappung. null: keins. (Ob sich die Häute wirklich schneiden, sagt erst das Verbinden.)
 */
function nahtPartner(): Ruhend | null {
  if (!ruhende.length || !werkForm) return null;
  const P = werk.haut.pos;
  const f = werkHaut.f;
  const a = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
  for (let i = 0; i < P.length; i += 3) {
    a.x0 = Math.min(a.x0, P[i]!);
    a.x1 = Math.max(a.x1, P[i]!);
    a.y0 = Math.min(a.y0, P[i + 1]!);
    a.y1 = Math.max(a.y1, P[i + 1]!);
    a.z0 = Math.min(a.z0, P[i + 2]!);
    a.z1 = Math.max(a.z1, P[i + 2]!);
  }
  if (!(a.x1 > a.x0)) return null;
  a.x0 = a.x0 / f + werkHaut.mitte.x;
  a.x1 = a.x1 / f + werkHaut.mitte.x;
  a.y0 = a.y0 / f + werkHaut.mitte.y;
  a.y1 = a.y1 / f + werkHaut.mitte.y;
  a.z0 /= f;
  a.z1 /= f;
  const ueber = (p0: number, p1: number, q0: number, q1: number): number => Math.min(p1, q1) - Math.max(p0, q0);
  let best: Ruhend | null = null;
  let weit = 0;
  for (const r of ruhende) {
    const k = r.kasten;
    const ux = ueber(a.x0, a.x1, k.cx - k.rx, k.cx + k.rx);
    const uy = ueber(a.y0, a.y1, k.cy - k.ry, k.cy + k.ry);
    if (ux <= 0 || uy <= 0) continue;
    // quer zur Spiegelebene: die Spannen selbst oder, wo eines sein Spiegelbild zeigt, die gespiegelte
    const z = zSpanne(r);
    let uz = ueber(a.z0, a.z1, z[0], z[1]);
    if (r.treffer.spiegelbild || werkHaut.spiegelbild) uz = Math.max(uz, ueber(a.z0, a.z1, -z[1], -z[0]));
    if (uz <= 0) continue;
    if (ux * uy * uz > weit) {
      weit = ux * uy * uz;
      best = r;
    }
  }
  return best;
}
/** Lässt sich gerade verbinden: im Raum, in Ruhe, und das aktive Objekt berührt ein anderes? */
const nahtErlaubt = (): boolean => !nahtLaeuft && spiegelErlaubt() && !tastenZug && !objektZug && !spiegelFahrt && werk.objektRuht() && nahtPartner() !== null;

/**
 * Verschmelzen oder abziehen (Florian: „Wenn ich objekte verschmelzen möchte, dann sollte das über einen edgeloop passieren … Ich
 * möchte auch objekte voneinander subtrahieren können, sodass eine saubere kante entsteht“). Es geht um das aktive Objekt und das,
 * das es berührt. Verschmelzen: Die zwei werden eine Form; weitergerechnet wird im Maß des größeren. Abziehen: Das aktive Objekt ist
 * das Werkzeug und wird aus dem anderen herausgeschnitten. An der Schnittkurve entsteht die Naht (ein Loop mit Kante, gewählt; K
 * macht sie weich). Ein Schritt für ⌘Z: Er gibt das aufgenommene Objekt wieder heraus (`nahtNachZurueck`).
 */
async function objekteVerbindenJetzt(art: 'vereinen' | 'abziehen'): Promise<boolean> {
  const was = art === 'vereinen' ? 'Verschmelzen' : 'Abziehen';
  if (nahtLaeuft || zustand !== 'ruhe' || !werkGezeigt || !werkForm) return false;
  const partner = nahtPartner();
  if (!partner || tastenZug || objektZug || spiegelFahrt || !werk.objektRuht()) {
    werk.G.meldung = partner ? `${was}: erst den laufenden Handgriff beenden` : `${was}: Das gewählte Objekt berührt kein anderes (mit dem dunklen Zeiger V an ein anderes schieben)`;
    anstossen();
    return false;
  }
  // Wer bleibt: beim Abziehen das berührte Objekt, beim Verschmelzen das größere (in der Seite gemessen)
  const a = werkMasseWeltAktiv();
  const vorher = aktivId;
  const partnerBleibt = art === 'abziehen' || (a !== null && partner.kasten.rx * partner.kasten.ry > a.rx * a.ry);
  if (partnerBleibt && !objektAktivieren(partner.id)) {
    werk.G.meldung = `${was}: erst den laufenden Handgriff beenden`;
    anstossen();
    return false;
  }
  const teil = partnerBleibt ? ruhende.find((x) => x.id === vorher) : partner;
  if (!teil) return false;
  // das Teil im Maß des Objekts, das bleibt (jedes rechnet in seiner eigenen Größe; die Spiegelebene ist für alle dieselbe)
  const f = werkHaut.f;
  const k = f / teil.haut.f;
  const d = { x: (teil.haut.mitte.x - werkHaut.mitte.x) * f, y: (teil.haut.mitte.y - werkHaut.mitte.y) * f, z: 0 };
  const davor: NahtMarke = { n: werk.zurueck.length, teil, clipping: werk.G.clipping, spiegelbild: werk.G.spiegelbild };
  nahtLaeuft = true;
  let ok = false;
  try {
    ok = await werk.objektVerbinden(teil.stand, k, d, art);
  } finally {
    nahtLaeuft = false;
  }
  if (!ok) {
    // nichts ist geändert: Das Objekt von eben ist wieder das gewählte (die Meldung des Werks bleibt stehen)
    const text = werk.G.meldung;
    if (partnerBleibt && objektAktivieren(vorher)) werk.G.meldung = text;
    anstossen();
    return false;
  }
  const i = ruhende.indexOf(teil);
  if (i >= 0) ruhende.splice(i, 1);
  nahtMarken.push(davor);
  // die Naht ist gewählt: mit dem weißen Zeiger sieht man ihre Punkte, und K wirkt sofort
  if (objektModus() || bearbeiten.stift || strichWerkzeug()) werkzeugImRaum('auswahl');
  objektGewaehlt = false;
  werkFelder.leeren();
  werkHaut.ganzNeu();
  werkNeu = true;
  ruheZeigen();
  raumRechnen(bw.band);
  anstossen();
  return true;
}

/** nach einem ⌘Z: Ist ein Verbinden zurückgenommen, ruht das aufgenommene Objekt wieder wie zuvor, und der Spiegel gilt wie davor */
function nahtNachZurueck(): void {
  let m: NahtMarke | undefined;
  let etwas = false;
  while (nahtMarken.length && werk.zurueck.length <= nahtMarken[nahtMarken.length - 1]!.n) {
    m = nahtMarken.pop()!;
    ruhende.push(m.teil);
    werk.G.clipping = m.clipping;
    werk.G.spiegelbild = m.spiegelbild;
    etwas = true;
  }
  if (!etwas) return;
  werkHaut.ganzNeu();
  werkNeu = true;
  ruheZeigen();
  raumRechnen(bw.band);
}

/** Pinsel „Ziehen“ an der Blase (Phase 6): Radius in Einheiten des Werks (wie der Einfluss O, [ und ] ändern ihn) */
let pinselRadius = 90;
/** der Punkt einer Linie, den der Pinsel gerade fassen würde (Kennung, Nummer, Spiegelbild, Welt) */
let pinselZiel: { id: number; i: number; m: boolean; welt: Vector3 } | null = null;
/** ein Zug des Pinsels: die Ebene des Blatts, in der gezogen wird */
let pinselZug: { F: Flaeche } | null = null;
/**
 * C4 (18.11.): Drücken auf ein Feld der Haut (zwischen Linien) in einer flachen Ansicht. Erst die Bewegung entscheidet: Ohne sie ist
 * es ein Klick (das Feld wird gewählt); an einem gewählten Feld zieht sie es (`zieht`), sonst dreht sie wie bisher (dann endet
 * dieser Zustand, und das Drehen beginnt am Ort des Drückens).
 */
let feldDruck: { x: number; y: number; zeit: number; fl: number; t: FeldTreffer; gewaehlt: boolean; zieht: boolean } | null = null;
/** C4: G, S oder R läuft (ein Zug des Werks über die Tastatur): die Fläche, auf der der Zeiger ihn führt, und die Tiefe der Auswahl */
let tastenZug: { F: Flaeche; T: number | undefined } | null = null;
/** C4: ⇧ + Klick hat ein Feld zur Auswahl genommen oder herausgenommen (für den Doppelklick: Er wendet, das Feld bleibt, wie es war) */
let feldUmgeschaltet = { zeit: 0, x: 0, y: 0 };
/** C4: so weit (Bildpunkte) muss der Zeiger gehen, bis aus dem Drücken auf ein Feld ein Zug oder ein Drehen wird */
const FELD_KLICK_WEG = 4;
/** C4: die Tönung eines gewählten Felds über dem weißen Körper (das Grün der verdeckten Linien) und ihre Deckung */
const FELD_DECKUNG = 0.5;
let feldToenung: { index: Uint32Array | null; nr: number } = { index: null, nr: 0 };

/**
 * Der Spiegel-Knopf (18.11., Plan „Objekte, Spiegel und Nähte“; Florian: „mirror an, mirror aus, mirror an mit clipping … Ich kann
 * mirrorhälften erst ohne clipping ineinanderschieben und dann clipping einschalten um sie zu verschmelzen. Gerne mit einer schönen
 * animation“). Der Zustand gehört dem Objekt und steht im Werk (`werk.spiegelStand`): `clip` an mit Clipping, `an` ohne, `aus` ein
 * ganzes Objekt ohne Spiegelbild (eine verschmolzene Form wird dabei frei, `werk.spiegelAus`: dasselbe wie anwenden).
 * Wird das Clipping eingeschaltet, während sich die Hälften überragen, läuft `spiegelFahrt`: Die Anzeige schneidet erst so tief
 * hinter der Ebene, wie die Überschneidung reicht (`tiefe`, Welteinheiten), und wandert in `SPIEGEL_FAHRT` Sekunden zur Ebene; dann
 * macht das Werk den Schnitt fest. `spiegelMarken`: Der Knopf hat einen Schritt für ⌘Z angelegt (verschmelzen, frei machen); `n` so
 * viele Schritte hatte das Werk davor, dazu die Schalter von davor: Ein ⌘Z dahinter stellt auch sie zurück.
 */
const spiegelZustand = (): SpiegelZustand => werk.spiegelStand();
let spiegelFahrt: { t: number; tiefe: number } | null = null;
const SPIEGEL_FAHRT = 0.42;
const spiegelMarken: { n: number; clipping: boolean; spiegelbild: boolean }[] = [];
const spiegelErlaubt = (): boolean => zustand === 'ruhe' && werkGezeigt && !werk.grund && !werk.maulLauf && !reihe;
function spiegelSetzen(ziel: SpiegelZustand): void {
  if (!spiegelErlaubt() || werk.zug || spiegelFahrt || ziel === spiegelZustand()) return;
  const frei = werk.istFrei();
  const davor = { n: werk.zurueck.length, clipping: werk.G.clipping, spiegelbild: werk.G.spiegelbild };
  if (ziel === 'aus') {
    if (!frei) {
      // eine verschmolzene Form wird ganz und frei (ein Schritt für ⌘Z); Muster und Dehnung der Seifenhaut bleiben an ihrem Ort
      if (!werk.spiegelAus()) return;
      spiegelMarken.push(davor);
    } else {
      werk.G.spiegelbild = false;
      werk.G.meldung = 'Spiegel aus: ein ganzes Objekt ohne Spiegelbild';
    }
  } else if (ziel === 'an') {
    werk.G.clipping = false;
    if (frei) werk.G.spiegelbild = true;
    werk.G.meldung = frei ? 'Spiegel an, ohne Clipping: Das Objekt hat sein Spiegelbild; die beiden dürfen sich überragen' : 'Spiegel an, ohne Clipping: Was du über die Mitte ziehst, überragt sich · Clipping verschmilzt es';
  } else {
    werk.G.clipping = true;
    if (frei) werk.G.spiegelbild = true;
    const tief = werk.ueberDerMitte() ? werk.tiefeHinterDerMitte() : 0;
    if (tief > 0) spiegelFahrt = { t: 0, tiefe: tief / werkHaut.f };
    werk.G.meldung = tief > 0 ? 'Spiegel an, mit Clipping: Die Hälften verschmelzen an der Spiegelebene' : 'Spiegel an, mit Clipping: Was über die Mitte reicht, verschmilzt dort';
  }
  // die Anzeige liest Clipping und Spiegelbild beim Rechnen der Haut (auch wenn sie liegt wie zuletzt)
  werkHaut.ganzNeu();
  werkNeu = true;
  anstossen();
}
/** ein Bild der Fahrt; an ihrem Ende wird der Schnitt fest (ein Schritt für ⌘Z), und die Naht ist gewählt */
function spiegelFahrtSchritt(dt: number): boolean {
  const F = spiegelFahrt;
  if (!F) return false;
  F.t += Math.max(0, dt);
  if (F.t < SPIEGEL_FAHRT && !werk.zug) return true;
  spiegelFahrt = null;
  if (!werk.zug && werk.ueberDerMitte()) {
    const n = werk.zurueck.length;
    const bild = werk.G.spiegelbild;
    if (werk.mitteFest(false, true)) {
      spiegelMarken.push({ n, clipping: false, spiegelbild: bild });
      werk.G.meldung = 'Clipping: an der Spiegelebene verschmolzen · die Naht ist gewählt, K macht sie rund · ⌘Z trennt wieder';
    }
  }
  werkNeu = true;
  return true;
}
/** nach einem ⌘Z: Ist ein Schritt des Spiegel-Knopfs zurückgenommen, gelten auch seine Schalter von davor wieder */
function spiegelNachZurueck(): void {
  let m: (typeof spiegelMarken)[number] | undefined;
  while (spiegelMarken.length && werk.zurueck.length <= spiegelMarken[spiegelMarken.length - 1]!.n) m = spiegelMarken.pop();
  if (!m) return;
  werk.G.clipping = m.clipping;
  werk.G.spiegelbild = m.spiegelbild;
  werkHaut.ganzNeu();
  werkNeu = true;
}

/**
 * Clipping (18.11.): Reicht in der gezeigten Haut des Werks eine Hälfte über die Spiegelebene, schneidet die Anzeige sie dort ab (der
 * Rand in Welteinheiten, wie `SCHNITT_RAND` im Prüffenster); sonst null. Seifenhaut, Solid und Zebra; Jelly, helles Solid und Grün
 * laufen in fremden Renderern und zeigen bis zum Loslassen beide Hälften ganz. Während `spiegelFahrt` wandert der Rand von der Tiefe
 * der Überschneidung zur Ebene.
 */
const spiegelSchnittJetzt = (): number | null => {
  if (!werkGezeigt || !werkHaut.spiegelSchnitt) return null;
  const rand = werk.SCHNITT_RAND / werkHaut.f;
  return spiegelFahrt ? rand + spiegelFahrt.tiefe * (1 - glatt(Math.min(1, spiegelFahrt.t / SPIEGEL_FAHRT))) : rand;
};

/** Rechnet das Werk noch (Zug, Nachlauf, Hintergrund, wartender Griff, Maul)? */
const werkBeschaeftigt = (): boolean =>
  werk.zug !== null || werk.formZug !== null || werk.nachlauf !== null || werk.G.aufraeumen !== null || werk.vorrechnenUhr !== null || werk.G.gegriffen !== null || werk.maulLauf !== null;

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
  const a = werkMasseWeltAktiv();
  // mehrere Objekte: der Kasten um alle (der Raum, seine Wände und der Maßstab richten sich nach allen, auch nach denen, die in einer
  // Reihe noch aufs Aufblasen warten: So steht der Raum vom ersten an)
  const andere = [...ruhende.map((r) => r.kasten), ...reiheKaesten()];
  if (!andere.length) return a;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let z = 0;
  for (const k of a ? [a, ...andere] : andere) {
    x0 = Math.min(x0, k.cx - k.rx);
    x1 = Math.max(x1, k.cx + k.rx);
    y0 = Math.min(y0, k.cy - k.ry);
    y1 = Math.max(y1, k.cy + k.ry);
    z = Math.max(z, k.tiefe);
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2, tiefe: z };
}
/** der Kasten des aktiven Objekts im Raum (aus der Haut des Werks) */
function werkMasseWeltAktiv(): { cx: number; cy: number; rx: number; ry: number; tiefe: number } | null {
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
  if (ruhende.length) {
    // die Blase eines neuen Objekts neben den ruhenden: der Kasten um alle
    let x0 = F.cx - rx;
    let x1 = F.cx + rx;
    let y0 = F.cy - ry;
    let y1 = F.cy + ry;
    let z = tiefe;
    for (const { kasten: k } of ruhende) {
      x0 = Math.min(x0, k.cx - k.rx);
      x1 = Math.max(x1, k.cx + k.rx);
      y0 = Math.min(y0, k.cy - k.ry);
      y1 = Math.max(y1, k.cy + k.ry);
      z = Math.max(z, k.tiefe);
    }
    const R2 = Math.max((x1 - x0) / 2, (y1 - y0) / 2, z, 1);
    raum = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, L: R2 * (1 + bw.waende), rx: (x1 - x0) / 2, ry: (y1 - y0) / 2, tiefe: z, R: R2 };
    massstab.ziel = (bw.groesse * Math.min(W, H)) / (2 * R2);
    return;
  }
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
  leinwandRand = null;
  const r = buehne.getBoundingClientRect();
  W = Math.max(1, r.width);
  H = Math.max(1, r.height);
  D = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(D);
  renderer.setSize(W, H, false);
  haut.groesse(W, H, D);
  feste.groesse(W, H, D);
  gast.groesse(W, H, D);
  gruen?.groesse(W, H, D);
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
 * Die Form im Werk aus der Silhouette anlegen: in Einheiten des Werks (größte halbe Ausdehnung mindestens `WERK_HALBMESSER`, größer,
 * solange die Form dünner als `WERK_DICKE` wäre; Mitte der Silhouette im Ursprung), Anker und Griffe wie gezeichnet. Hat sich die Silhouette nicht geändert, bleibt die Form, mit allem, was an ihr
 * geändert wurde.
 */
/**
 * Halbmesser des größten Kreises, der in das Vieleck passt (die dickste Stelle der Silhouette: so dick wird die runde Form dort):
 * ein Raster über den Kasten, dann dreimal um die beste Stelle verfeinert. −1 außen zählt nicht.
 */
function groessterInnenkreis(xs: readonly number[], ys: readonly number[]): number {
  return innenkreis(xs, ys).r;
}
/** dasselbe mit der Mitte des Kreises: die dickste Stelle der Silhouette */
function innenkreis(xs: readonly number[], ys: readonly number[]): { r: number; x: number; y: number } {
  const n = xs.length;
  if (n < 3) return { r: 0, x: 0, y: 0 };
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    x0 = Math.min(x0, xs[i]!);
    x1 = Math.max(x1, xs[i]!);
    y0 = Math.min(y0, ys[i]!);
    y1 = Math.max(y1, ys[i]!);
  }
  // innen (gerade/ungerade): Abstand zum Rand; außen: −1
  const abstand = (px: number, py: number): number => {
    let innen = false;
    let d2 = Infinity;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const ax = xs[j]!;
      const ay = ys[j]!;
      const bx = xs[i]!;
      const by = ys[i]!;
      if (ay > py !== by > py && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) innen = !innen;
      const ex = bx - ax;
      const ey = by - ay;
      const L2 = ex * ex + ey * ey;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / L2)) : 0;
      const qx = ax + t * ex - px;
      const qy = ay + t * ey - py;
      const q = qx * qx + qy * qy;
      if (q < d2) d2 = q;
    }
    return innen ? Math.sqrt(d2) : -1;
  };
  const N = 28;
  let schritt = Math.max(x1 - x0, y1 - y0) / N;
  let best = 0;
  let bx = (x0 + x1) / 2;
  let by = (y0 + y1) / 2;
  for (let i = 0; i <= N; i++)
    for (let j = 0; j <= N; j++) {
      const px = x0 + (i * (x1 - x0)) / N;
      const py = y0 + (j * (y1 - y0)) / N;
      const d = abstand(px, py);
      if (d > best) {
        best = d;
        bx = px;
        by = py;
      }
    }
  for (let runde = 0; runde < 3; runde++) {
    schritt /= 3;
    const mx = bx;
    const my = by;
    for (let i = -3; i <= 3; i++)
      for (let j = -3; j <= 3; j++) {
        const d = abstand(mx + i * schritt, my + j * schritt);
        if (d > best) {
          best = d;
          bx = mx + i * schritt;
          by = my + j * schritt;
        }
      }
  }
  return { r: best, x: bx, y: by };
}

/**
 * Die Start-Loops einer frischen Form: ein Loop quer und einer längs, beide rundum und durch die dickste Stelle der Silhouette (die
 * Mitte ihres größten Innenkreises). Angelegt mit dem Handgriff für „P quer über die Form“ (`werk.vorhangSchneiden`): zwei Striche in
 * der Seite, senkrecht und waagerecht, je vom Leeren ins Leere, mit einem Punkt an der dicksten Stelle (dort kreuzen sich die
 * beiden). Mit der gezeichneten Silhouette sind es die Umrisse der drei Ansichten. Wahr, wenn mindestens ein Loop dazukam.
 */
function startLoopsAnlegen(): boolean {
  if (!silhouette) return false;
  const ab = abtasten(silhouette, 2);
  const K = innenkreis(ab.x, ab.y);
  if (!(K.r > 1)) return false;
  const n = ab.x.length;
  // wo die Senkrechte oder die Waagerechte durch die dickste Stelle den Umriss zuerst trifft, davor und dahinter
  const sehne = (senkrecht: boolean): [number, number] | null => {
    const fest = senkrecht ? K.x : K.y;
    const mitte = senkrecht ? K.y : K.x;
    let vor = -Infinity;
    let nach = Infinity;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const a0 = senkrecht ? ab.x[j]! : ab.y[j]!;
      const a1 = senkrecht ? ab.y[j]! : ab.x[j]!;
      const b0 = senkrecht ? ab.x[i]! : ab.y[i]!;
      const b1 = senkrecht ? ab.y[i]! : ab.x[i]!;
      if (a0 > fest === b0 > fest) continue;
      const w = a1 + ((fest - a0) / (b0 - a0)) * (b1 - a1);
      if (w < mitte) vor = Math.max(vor, w);
      else nach = Math.min(nach, w);
    }
    return Number.isFinite(vor) && Number.isFinite(nach) ? [vor, nach] : null;
  };
  const f = werkHaut.f;
  // Blatt der Seite im Werk: X nach rechts, Y nach unten
  const X = (x: number): number => (x - W / 2 - werkHaut.mitte.x) * f;
  const Y = (y: number): number => -((H / 2 - y - werkHaut.mitte.y) * f);
  // so weit vor dem Umriss beginnt und endet jeder Strich (Bildpunkte des Blatts)
  const rand = Math.max(4, 0.12 * K.r);
  const davor = werk.loops.length;
  for (const senkrecht of [true, false]) {
    const t = sehne(senkrecht);
    if (!t) continue;
    const [vor, nach] = t;
    const anker: werk.StiftAnker[] = senkrecht
      ? [
          { X: X(K.x), Y: Y(vor - rand), aus: null },
          { X: X(K.x), Y: Y(K.y), aus: [0, ((nach - K.y) * f) / 3] },
          { X: X(K.x), Y: Y(nach + rand), aus: null },
        ]
      : [
          { X: X(vor - rand), Y: Y(K.y), aus: null },
          { X: X(K.x), Y: Y(K.y), aus: [((nach - K.x) * f) / 3, 0] },
          { X: X(nach + rand), Y: Y(K.y), aus: null },
        ];
    werk.vorhangSchneiden('seite', anker);
  }
  werk.G.auswahl = [];
  werk.G.meldung = '';
  return werk.loops.length > davor;
}

/** eine neue Form (aufgeblasen, geladen) beginnt wie jede: Spiegel an, mit Clipping */
function spiegelGrundstellung(): void {
  werk.G.clipping = true;
  werk.G.spiegelbild = true;
  spiegelFahrt = null;
  spiegelMarken.length = 0;
  nahtMarken.length = 0;
}

function werkFormAnlegen(): void {
  if (!silhouette) return;
  if (werkForm && werkForm.stand === blatt.stand && (werkForm.geladen !== undefined || mitteLinie() || werkForm.ohneLinie)) return;
  // (eine neu angelegte Form beginnt mit Spiegel und Clipping; bleibt die Form des Werks nach „Luft ablassen“, bleibt auch ihr Spiegel)
  spiegelGrundstellung();
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
  // größer anlegen, was sonst dünner als `WERK_DICKE` würde (die halbe Dicke der runden Form ist der größte Kreis in der Zeichnung)
  const f0 = WERK_HALBMESSER / Math.max(1, (x1 - x0) / 2, (y1 - y0) / 2);
  const dick = groessterInnenkreis(ab.x, ab.y) * f0;
  const f = f0 * Math.min(WERK_GROESSER, Math.max(1, WERK_DICKE / Math.max(1e-6, dick)));
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
  werkBlatt.neueForm();
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
  const st = await werk.wesenHolen(name);
  if (typeof st === 'string') return st;
  neu();
  // die Objekte der Datei: das gesicherte aktive (der Stand selbst) und die weiteren (`ozzy.objekte`); eine ältere Datei hat eins
  const sz: OzzySzene | undefined = st.ozzy;
  const haupt: Geladen = { id: sz?.id ?? 1, spiegel: sz?.spiegel ?? { clipping: true, spiegelbild: true }, mass: sz?.mass ?? { f: 1, mitte: { x: 0, y: 0 } }, stand: st, name };
  const weitere: Geladen[] = (sz?.objekte ?? []).filter((o) => pruefen(o.stand) === null).map((o) => ({ id: o.id, spiegel: o.spiegel, mass: o.mass, stand: o.stand, name }));
  const alle = [...weitere, haupt];
  // die Szene mittig und in der gewohnten Größe aufs Blatt (ohne gesichertes Maß: die Form allein, wie bisher)
  const kaesten = alle.map((o) => standKasten(o.stand, o.mass));
  const x0 = Math.min(...kaesten.map((k) => k.cx - k.rx));
  const x1 = Math.max(...kaesten.map((k) => k.cx + k.rx));
  const y0 = Math.min(...kaesten.map((k) => k.cy - k.ry));
  const y1 = Math.max(...kaesten.map((k) => k.cy + k.ry));
  const q = (LADEN_GROESSE * Math.min(W, H)) / Math.max((x1 - x0) / 2, (y1 - y0) / 2, 1e-6);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  for (const o of alle) o.mass = { f: o.mass.f / q, mitte: { x: (o.mass.mitte.x - cx) * q, y: (o.mass.mitte.y - cy) * q } };
  objektZaehler = Math.max(...alle.map((o) => o.id));
  const erstes = alle.shift()!;
  if (alle.length) reihe = { warten: alle, erste: haupt.id, imRaum: false, zahl: alle.length + 1, geladen: name };
  const text = standAufsBlatt(erstes);
  return `geladen: „${name}“ (${auskunft(st)}${weitere.length ? `, dazu ${weitere.length} weitere${weitere.length === 1 ? 's Objekt' : ' Objekte'}` : ''})${text}`;
}

/**
 * Ein geladenes Objekt wird das aktive und bläst auf: Das Werk übernimmt seinen Stand, seine Linie der Mitte kommt als Zeichnung aufs
 * Blatt (ohne Linie der Mitte: eine Ellipse um seine Seite), an seinem Ort und in seiner Größe (`mass`). Zurück: der Text des Werks.
 */
function standAufsBlatt(o: Geladen): string {
  werkHaut.neueForm();
  werkBlatt.neueForm();
  spiegelGrundstellung();
  aktivId = o.id;
  const text = werk.wesenUebernehmen(o.stand, o.name);
  // (der Schritt, den das Übernehmen angelegt hat, führte zur Form des vorigen Objekts zurück: Jedes Objekt beginnt mit leerem Rückweg)
  werk.zurueck.length = 0;
  werk.G.clipping = o.spiegel.clipping;
  werk.G.spiegelbild = o.spiegel.spiegelbild;
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
  const f = o.mass.f;
  werkHaut.f = f;
  werkHaut.mitte = { ...o.mass.mitte };
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
    const cx = bx((x0 + x1) / 2);
    const cy = by((y0 + y1) / 2);
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
  werkForm = { stand: blatt.stand, zurueck: werk.zurueck.length, geladen: o.name };
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
 * Für die Übergabe von der Blase: der Bezug ihres Musters in Einheiten des Werks (das Muster der Blase ist die Lage ihrer flachen Haut
 * im Blatt, um ihre Mitte, geteilt durch ihren Halbmesser) und ihre Dehnung an der Stelle jedes Rechenpunkts des Werks, mit derselben
 * Zuordnung wie die Lagen der Übergabe (drei Punkte der Blase und ihre Gewichte): beides stetig über die Haut.
 */
function uebergabeMuster(): { bezug: { cx: number; cy: number; r: number }; dehnung: Float32Array } {
  const h = werk.haut;
  const k = koerper!;
  if (!uebergabe || uebergabe.koerper !== k || uebergabe.haut !== h) uebergabe = uebergabeAnlegen(k, h);
  const u = uebergabe;
  const dehnung = new Float32Array(h.n);
  for (let q = 0; q < h.n; q++) {
    let de = 0;
    for (let j = 0; j < 3; j++) de += u.gew[3 * q + j]! * k.dehnung[u.idx[3 * q + j]!]!;
    dehnung[q] = de;
  }
  const F = k.flach;
  const f = werkHaut.f;
  return { bezug: { cx: (F.cx - werkHaut.mitte.x) * f, cy: (F.cy - werkHaut.mitte.y) * f, r: (F.radius || 1) * f }, dehnung };
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
  if (spiegelFahrtSchritt(dt)) aktiv = true;
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
      if (koerper && params.get('uebergabeMuster') !== '0') {
        const mu = uebergabeMuster();
        werkHaut.vonBlase(mu.bezug, mu.dehnung);
      }
    }
    const { w0, T: Th } = uebergabeStart;
    w = w0 < 0.8 ? (roh - w0) / (1 - w0) : glatt(Math.min(1, Math.abs(T - Th) / 0.4));
  }
  const jetzt = performance.now();
  // nach der letzten Änderung klingt die Dehnung aus (2,5 s sicher; seit A2 so lange, bis sie weg ist, höchstens 9 s: vorher blieb
  // rund ein Fünftel für immer in den Farben stehen)
  const klingt = (): boolean => jetzt - werkZuletzt < 2500 || (werkHaut.dehnungRest > 0 && jetzt - werkZuletzt < 9000);
  if (schnalz || werkNeu || werkVoll || !werkGezeigt || klingt()) {
    const voll = werkVoll;
    werkVoll = false;
    if (werkNeu || !werkGezeigt) werkZuletzt = jetzt;
    werkNeu = false;
    // in der Pose die Haut, wie sie zu sehen ist (die Knochen drehen sie; wie `hautZeigen` im Prüffenster)
    const th = performance.now();
    // eine freie Form mit „Spiegel an“ zeigt ihr Spiegelbild (nur Anzeige: `zeigeNetz` ist dann doppelt)
    werkHaut.spiegelbild = werk.istFrei() && werk.G.spiegelbild;
    werk.alsAnzeige(() => werkHaut.rechnen(schnalz ? uebergabeLagen(w) : null, voll, dt, schnalz ? 0 : 1.6, w));
    mess.teile[1] = performance.now() - th;
    const zn = werkHaut.zeigeNetz;
    if (werkHaut.nurDehnung && zn === hautZeigt) haut.dehnungErneuern();
    else {
      hautZeigt = zn;
      haut.blaseErsetzen(zn);
      if (netzArt) haut.netzZeigen(werkHaut.netzKanten());
    }
    werkGezeigt = true;
    // S9: ohne Linie an der Spiegelkante (zur Wahl): nach dem Aufblasen die Linie der Mitte löschen, einmal je Form
    if (!mitLinie && !startLoops && werkForm && !werkForm.ohneLinie && werkForm.geladen === undefined && !werk.zug) {
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
    aktiv = aktiv || schnalz || klingt();
  }
  // Formen beginnen mit Edgeloops: einmal je Form, sobald sie aufgeblasen ist und ihre Haut steht (die Linie der Mitte bleibt)
  if (startLoops && werkGezeigt && werkForm && !werkForm.startLoops && werkForm.geladen === undefined && zustand === 'ruhe' && !werk.zug && !werkBeschaeftigt() && werk.ruheOffen === null) {
    startLoopsAnlegen();
    werk.anzeige.allesZeigen();
    werkForm.startLoops = true;
    werkForm.zurueck = werk.zurueck.length;
    werkNeu = true;
    aktiv = true;
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
  // (die Form bleibt dieselbe: Was beim Start an ihr geschehen ist, die Start-Loops oder das Löschen der Linie der Mitte, geschieht nicht noch einmal)
  werkForm = { stand: blatt.stand, zurueck: werk.zurueck.length, ...(werkForm.startLoops ? { startLoops: true } : {}), ...(werkForm.ohneLinie ? { ohneLinie: true } : {}) };
}

// ---------- Ablauf ----------

function aufblasen(): void {
  if (!blatt.geschlossen) return;
  // mehrere geschlossene Linien auf dem Blatt: Jede wird ein Objekt. Die größte bleibt als Zeichnung dieses Objekts auf dem Blatt und
  // bläst jetzt auf, die anderen folgen der Reihe nach (`reiheSchritt`)
  if (!reihe) {
    const teile = blatt.silhouettenNetze();
    if (teile.length > 1) {
      reihe = { warten: teile.slice(1), erste: aktivId, imRaum: false, zahl: teile.length };
      blatt.netzSetzen(teile[0]!);
    }
  }
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
  // nach dem Aufblasen steht der Raum bei den Punkten (A), nicht bei den Objekten
  raumWerkzeug = 'auswahl';
  objektGewaehlt = false;
  leiste.lage(true);
  leiste.zeichnenErlaubt(false);
  anstossen();
}

function ablassen(): void {
  if (zustand === 'blatt') return;
  // die Werkzeuge des Raums aus; die Leiste zeigt wieder das des Blatts
  if (bearbeiten.stift || strichWerkzeug() || objektModus()) werkzeugImRaum('auswahl');
  objektGewaehlt = false;
  leiste.setzen(blatt.werkzeug);
  zug = null;
  drehen = null;
  punktZug = null;
  vierZiel = 0;
  vier = 0;
  vierFahrt = null;
  vorDreh = null;
  vierWartet = false;
  vierZuWartet = false;
  for (const w of Object.values(feldWende)) {
    w.phi = 0;
    w.fahrt = null;
  }
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
  vorDreh = null;
  vierWartet = false;
  vierZuWartet = false;
  for (const w of Object.values(feldWende)) {
    w.phi = 0;
    w.fahrt = null;
  }
  zustand = 'auf';
  T = 0;
  anstossen();
}

/**
 * zurück aufs leere Blatt (der Mülleimer im Raum); die Zeichnung bleibt für ⌘Z auf dem Blatt. `behalten` (das Plus): Die ruhenden
 * Objekte bleiben stehen, das Blatt ist leer für ein neues.
 */
function neu(behalten = false): void {
  if (bearbeiten.stift) bearbeiten.stiftSchalten(false);
  if (!behalten) {
    ruhende.length = 0;
    aktivId = 1;
    objektZaehler = 1;
    rueckweg.length = 0;
    rueckZahl.clear();
    reihe = null;
    ruheZeigen();
  }
  werkHaut.neueForm();
  werkBlatt.neueForm();
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
  vorDreh = null;
  vierWartet = false;
  vierZuWartet = false;
  for (const w of Object.values(feldWende)) {
    w.phi = 0;
    w.fahrt = null;
  }
  film = 0;
  leiste.lage(false);
  leiste.zeichnenErlaubt(true);
  anstossen();
}

/**
 * Die Reihe der Silhouetten eines Blatts: Steht die Form von eben (gezeigt, das Werk ruht), wird sie abgelegt, und die nächste bläst
 * auf, als eigenes Objekt. Nach der letzten ist die größte wieder das aktive Objekt. Zurück: Läuft die Reihe noch?
 */
function reiheSchritt(): boolean {
  const R = reihe;
  if (!R) return false;
  const steht = zustand === 'ruhe' && werkGezeigt && !!werkForm && !werkBeschaeftigt() && werk.ruheOffen === null && startFertig();
  if (!steht) return true;
  if (!R.warten.length) {
    reihe = null;
    objektAktivieren(R.erste);
    werk.G.meldung = R.geladen !== undefined ? `geladen: „${R.geladen}“ mit ${R.zahl} Objekten` : `${R.zahl} Formen aufgeblasen · V wählt eine Form (Klick), das Plus fügt weitere hinzu`;
    anstossen();
    return false;
  }
  if (!objektAblegenJetzt()) return true;
  const n = R.warten.shift()!;
  R.imRaum = true;
  // (die Anzeige des Objekts von eben gehört ihm: Das nächste bekommt seine eigene)
  werkHaut = new WerkHaut();
  ruheZeigen();
  neu(true);
  if (istGeladen(n)) {
    standAufsBlatt(n);
    return true;
  }
  aktivId = ++objektZaehler;
  blatt.netzSetzen(n);
  aufblasen();
  return true;
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
    // S17: mit Zoom und Verschiebung des Felds
    const b = feldBlick.raum;
    const scZiel = (bw.vierFuellung * 0.8 * Math.min(R.w, R.h) * b.zoom) / (2 * e.R * Math.max(1e-6, sEnde));
    const sc = 1 + (scZiel - 1) * v;
    const ox = (((R.x + R.w / 2 + b.x) / W) * 2 - 1) * v;
    const oy = (1 - ((R.y + R.h / 2 + b.y) / H) * 2) * v;
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
function felder(fest = false): Record<FeldAchse | 'raum', Feld> & { tx: number; ty: number } {
  const rand = bw.vierRand;
  const oben = document.body.classList.contains('bild') ? rand : 64;
  const bwid = W - 2 * rand;
  const bhoch = H - oben - rand;
  // S18: die freie Kreuzung (`fest`: die im erlaubten Bereich, nach der sich der Maßstab richtet)
  const tx = kreuzFrei && !fest ? kreuzFrei[0] : rand + teiler.fx * bwid;
  const ty = kreuzFrei && !fest ? kreuzFrei[1] : oben + teiler.fy * bhoch;
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

/** S18: der Bereich der Vier Ansichten (CSS-Pixel) und darin der Bereich, in dem die Kreuzung liegt (18 % bis 82 %, wie `teilerZiel`) */
function vierFlaeche(): { x0: number; y0: number; x1: number; y1: number; r: { x0: number; y0: number; x1: number; y1: number } } {
  const rand = bw.vierRand;
  const oben = document.body.classList.contains('bild') ? rand : 64;
  const x0 = rand;
  const y0 = oben;
  const x1 = W - rand;
  const y1 = H - rand;
  return { x0, y0, x1, y1, r: { x0: x0 + 0.18 * (x1 - x0), y0: y0 + 0.18 * (y1 - y0), x1: x0 + 0.82 * (x1 - x0), y1: y0 + 0.82 * (y1 - y0) } };
}

/** S18: die Ecke, in der die Kreuzung liegt, wenn diese Ansicht das Bild füllt: Seite unten links, Front unten rechts, Top oben links, Raum oben rechts */
function eckeVon(a: EckAnsicht): [number, number] {
  const B = vierFlaeche();
  return a === 'seite' ? [B.x0, B.y1] : a === 'front' ? [B.x1, B.y1] : a === 'top' ? [B.x0, B.y0] : [B.x1, B.y0];
}

/** S18: in den erlaubten Bereich geklemmt, und wie weit ein Punkt außerhalb liegt */
function inBereich(x: number, y: number): [number, number] {
  const r = vierFlaeche().r;
  return [Math.min(r.x1, Math.max(r.x0, x)), Math.min(r.y1, Math.max(r.y0, y))];
}
function abstandVomBereich(x: number, y: number): number {
  const [cx, cy] = inBereich(x, y);
  return Math.hypot(x - cx, y - cy);
}

/** S18: wie weit die Kreuzung vom erlaubten Bereich in die Ecke der Ansicht gerückt ist (0 im Bereich, 1 in der Ecke) */
function einzelAnteil(x: number, y: number, a: EckAnsicht): number {
  const [ex, ey] = eckeVon(a);
  const d = abstandVomBereich(ex, ey);
  return d < 1e-6 ? 0 : Math.min(1, abstandVomBereich(x, y) / d);
}

/** S18 (Rückweg): die Ecke, der die Kreuzung am nächsten liegt; den Raum nur, wenn kein Feld gewendet ist (die Kiste klappt dorthin zu) */
function naechsteEcke(x: number, y: number): EckAnsicht {
  let best: EckAnsicht = 'seite';
  let bd = Infinity;
  for (const a of ['seite', 'front', 'top', 'raum'] as const) {
    if (a === 'raum' && feldGewendet()) continue;
    const [ex, ey] = eckeVon(a);
    const d = Math.hypot(x - ex, y - ey);
    if (d < bd) {
      bd = d;
      best = a;
    }
  }
  return best;
}

/** S18: der Teiler so, dass die Kreuzung (im erlaubten Bereich) dort liegt, wo sie hin soll (wie der Zug am Tropfen) */
function teilerAus(x: number, y: number): void {
  const e2 = raum;
  if (!e2) return;
  const B = vierFlaeche();
  const [cx, cy] = inBereich(x, y);
  const X = 2 * e2.rx;
  const Y = 2 * e2.ry;
  const Z = 2 * e2.tiefe;
  teiler.bx = (cx - B.x0) / (B.x1 - B.x0) - Z / (X + Z);
  teiler.by = (cy - B.y0) / (B.y1 - B.y0) - Y / (Y + Z);
}

/**
 * S18: Zoom und Verschiebung eines Felds, wie sie gerade wirken: Rückt die Kreuzung in die Ecke der Einzelansicht, gleiten sie mit ihr zur
 * Abbildung der Einzelansicht (Zoom geometrisch, die Mitte der Form auf gerader Bahn); in der Ecke zeigt das Feld genau sie
 */
function blickIn(n: 'seite' | 'front' | 'top' | 'raum', F: ReturnType<typeof felder>, s: number): FeldBlick {
  const b = feldBlick[n];
  const z = eckZug;
  if (!z || z.art !== 'einzel' || z.a !== n || !z.einzel || !kreuzFrei) return b;
  const u = einzelAnteil(kreuzFrei[0], kreuzFrei[1], n);
  if (u <= 0) return b;
  const r = F[n];
  const mx = r.x + r.w / 2;
  const my = r.y + r.h / 2;
  const zs = z.einzel.s / Math.max(1e-9, s);
  return {
    zoom: Math.exp(Math.log(b.zoom) + (Math.log(zs) - Math.log(b.zoom)) * u),
    x: b.x + (z.einzel.cx - (mx + b.x)) * u,
    y: b.y + (z.einzel.cy - (my + b.y)) * u,
  };
}

/** S18, S19: wo der Tropfen der Kreuzung außerhalb der Vier Ansichten sitzt: in einer Einzelansicht an ihrer Ecke, im Raum an der Ecke der Kiste */
function eckTropfenOrt(): [number, number] | null {
  const e = raum;
  if (zustand !== 'ruhe' || !e || eckZug || vier > 1e-3 || vierZiel > 0.5 || ansichtFahrt || vorDreh || wenden || drehen) return null;
  if (ansicht !== 'raum') return flach >= 0.999 ? eckeVon(ansicht) : null;
  // im Raum nur von vorn rechts oben (S16): dort liegen die Wände so, wie die Kiste aufklappt
  if (flach > 1e-3 || !vorKiste(nutzer.gier, nutzer.neigung)) return null;
  const P = projizieren(new Vector3(e.cx - e.L, e.cy - e.L, -e.L), vpJetzt());
  return [P[0] / D, P[1] / D];
}

/** S18, S19: den Tropfen an der Ecke greifen (`eo`: wo er sitzt) */
function eckZugBeginnen(eo: [number, number], x: number, y: number): void {
  schwung = null;
  vierFahrt = null;
  vierWartet = false;
  vierZuWartet = false;
  vorDreh = null;
  const basis = { P0: eo, dx: eo[0] - x, dy: eo[1] - y, kx: eo[0], ky: eo[1], fahrt: null };
  if (ansicht !== 'raum') {
    const a = ansicht;
    const m = einzelAbbildung(a);
    if (!m) return;
    // die Einzelansicht wird ihr Feld: gewendet bleibt sie gewendet
    feldWende[a].phi = m.phi;
    feldWende[a].fahrt = null;
    eckZug = { ...basis, art: 'einzel', a, einzel: { cx: m.cx, cy: m.cy, s: m.s }, e: 1, von: 'einzel' };
    kreuzFrei = [eo[0], eo[1]];
    einzelUebergang = true;
    vier = 1;
  } else {
    for (const w of Object.values(feldWende)) {
      w.phi = 0;
      w.fahrt = null;
    }
    eckZug = { ...basis, art: 'raum', a: 'raum', einzel: null, e: 0, von: 'raum' };
    faltAnker = [eo[0], eo[1]];
    vier = 0;
  }
  vierZiel = 1;
  teiler.zug = true;
  teilerAus(eo[0], eo[1]);
}

/** S18 (Rückweg): aus dem Zug am Tropfen der Vier Ansichten wird ein Zug in eine Ecke, sobald er den erlaubten Bereich verlässt */
function rueckwegBeginnen(x: number, y: number): void {
  eckZug = { art: 'einzel', a: 'seite', einzel: null, P0: [0, 0], dx: 0, dy: 0, kx: x, ky: y, e: 1, von: 'vier', fahrt: null };
  eckZugBewegen(x, y);
}

/** die Abbildung der Einzelansicht `a`, wie die Kamera sie nach dem Einrasten zeigen wird (Mitte der Form in der Mitte, samt Schwenk) */
function einzelZiel(): { cx: number; cy: number; s: number } {
  return { cx: W / 2 + nutzer.schwenkX, cy: H / 2 + nutzer.schwenkY, s: massstab.jetzt * nutzer.zoom };
}

/** die Ecke der Kiste im Raum, wie sie ohne Vier Ansichten im Bild läge (CSS-Pixel) */
function raumEcke(): [number, number] {
  const e = raum!;
  const q = new Vector3(e.cx - e.L, e.cy - e.L, -e.L).applyMatrix4(new Matrix4().multiplyMatrices(projRaum, kam.aktiv.matrixWorldInverse));
  return [((q.x + 1) / 2) * W, ((1 - q.y) / 2) * H];
}

/** S18, S19: der Zeiger ist jetzt bei (x, y) */
function eckZugBewegen(x: number, y: number): void {
  const z = eckZug;
  if (!z) return;
  const B = vierFlaeche();
  const kx = Math.min(B.x1, Math.max(B.x0, x + z.dx));
  const ky = Math.min(B.y1, Math.max(B.y0, y + z.dy));
  z.kx = kx;
  z.ky = ky;
  teilerAus(kx, ky);
  if (z.von === 'raum') {
    // S19: wie weit vom Anfang, auf dem Kreis ganz offen; die Ecke bleibt unter dem Zeiger (am Ende die Kreuzung im erlaubten Bereich)
    z.e = Math.min(1, Math.hypot(kx - z.P0[0], ky - z.P0[1]) / (ECK_KREIS * Math.min(W, H)));
    const [cx, cy] = inBereich(kx, ky);
    const w = glatt(z.e);
    faltAnker = [kx + (cx - kx) * w, ky + (cy - ky) * w];
    vier = z.e;
    return;
  }
  if (z.von === 'vier') {
    // Rückweg: im erlaubten Bereich die Vier Ansichten wie immer; draußen zur nächsten Ecke hin
    const a = abstandVomBereich(kx, ky) > 1e-6 ? naechsteEcke(kx, ky) : z.a;
    if (a === 'raum') {
      const u = einzelAnteil(kx, ky, 'raum');
      z.art = 'raum';
      z.a = 'raum';
      z.einzel = null;
      z.P0 = raumEcke();
      z.e = 1 - u;
      kreuzFrei = null;
      // die Ecke der Kiste rückt vom Zeiger zu ihrem Platz im Raum
      faltAnker = [z.P0[0] + (kx - z.P0[0]) * z.e, z.P0[1] + (ky - z.P0[1]) * z.e];
      vier = z.e;
      return;
    }
    z.art = 'einzel';
    z.a = a;
    z.einzel = einzelZiel();
    faltAnker = null;
    vier = 1;
  }
  kreuzFrei = [kx, ky];
}

/** S18, S19: losgelassen: in den Vier Ansichten bleiben oder in die Einzelansicht oder den Raum fahren */
function eckZugLos(): void {
  const z = eckZug;
  if (!z || z.fahrt) return;
  const a0: [number, number] = faltAnker ? [faltAnker[0], faltAnker[1]] : [z.kx, z.ky];
  if (z.art === 'raum') {
    if (z.e >= 1 - 1e-6) {
      eckZugEnde('vier');
      return;
    }
    // nur gedrückt, nicht gezogen (der erste Klick eines Doppelklicks): gleich wieder zu
    if (z.e < 1e-3) {
      eckZugEnde('raum');
      return;
    }
    // zu, wie die Kiste aufging: die Ecke fährt zurück an ihren Platz im Raum
    z.fahrt = { kx0: z.kx, ky0: z.ky, kx1: z.kx, ky1: z.ky, e0: z.e, a0, t: 0, dauer: Math.max(0.12, 0.5 * z.e), ende: 'raum' };
    return;
  }
  const u = einzelAnteil(z.kx, z.ky, z.a);
  if (u <= 0) {
    eckZugEnde('vier');
    return;
  }
  const [ex, ey] = eckeVon(z.a);
  // nur gedrückt, nicht gezogen (der erste Klick eines Doppelklicks): gleich wieder die Einzelansicht
  if (z.von === 'einzel' && Math.hypot(z.kx - ex, z.ky - ey) < 0.5) {
    eckZugEnde('einzel');
    return;
  }
  let dauer = Math.max(0.12, 0.35 * u);
  if (z.von === 'vier' && z.a !== 'raum') {
    // Rückweg: die Kamera rastet in der Ansicht ein, während die Kreuzung in die Ecke fährt (danach zeigt die Kamera dasselbe Bild)
    ansichtSetzen(z.a, Math.cos(feldWende[z.a].phi) < 0);
    dauer = Math.max(dauer, bw.fahrt + 0.05);
  }
  z.fahrt = { kx0: z.kx, ky0: z.ky, kx1: ex, ky1: ey, e0: 1, a0, t: 0, dauer, ende: 'einzel' };
}

/** S18, S19: eine Fahrt nach dem Loslassen, Bild für Bild; true, solange sie läuft */
function eckZugSchritt(dt: number): boolean {
  const z = eckZug;
  if (!z?.fahrt) return false;
  const f = z.fahrt;
  f.t += dt / f.dauer;
  const t = Math.min(1, f.t);
  const w = t * t * t * (t * (t * 6 - 15) + 10);
  if (z.art === 'raum') {
    z.e = f.e0 * (1 - w);
    const k = f.e0 > 1e-9 ? z.e / f.e0 : 0;
    faltAnker = [z.P0[0] + (f.a0[0] - z.P0[0]) * k, z.P0[1] + (f.a0[1] - z.P0[1]) * k];
    vier = z.e;
  } else {
    z.kx = f.kx0 + (f.kx1 - f.kx0) * w;
    z.ky = f.ky0 + (f.ky1 - f.ky0) * w;
    kreuzFrei = [z.kx, z.ky];
    teilerAus(z.kx, z.ky);
  }
  if (t >= 1) eckZugEnde(f.ende);
  return true;
}

/** S18, S19: am Ende: Vier Ansichten, Einzelansicht oder Raum */
function eckZugEnde(ende: 'vier' | 'einzel' | 'raum'): void {
  const z = eckZug;
  eckZug = null;
  teiler.zug = false;
  kreuzFrei = null;
  faltAnker = null;
  einzelUebergang = false;
  vierFahrt = null;
  if (ende === 'vier') {
    vier = 1;
    vierZiel = 1;
    // aus einer Einzelansicht: das Feld des Raums zeigt wieder den Raum
    if (z?.von === 'einzel' && ansicht !== 'raum') ansichtSetzen('raum');
    return;
  }
  vier = 0;
  vierZiel = 0;
}

/**
 * S18, S19: Zeichen beim Zug: die Haarlinie, ab der es ganz die Vier Ansichten sind (Einzelansicht und Rückweg: der Rand des erlaubten
 * Bereichs; Raum: ein Kreis um die Ecke der Kiste), und der Tropfen an der Ecke, solange nicht gezogen wird
 */
function eckZeichen(): void {
  const h = (linienWerte.innen / 2) * D * 1.4;
  const z = eckZug;
  if (z && !z.fahrt && z.art === 'raum' && z.von === 'raum') {
    const R = ECK_KREIS * Math.min(W, H);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < 96; i++) {
      xs.push((z.P0[0] + R * Math.cos((i / 96) * 2 * Math.PI)) * D);
      ys.push((z.P0[1] + R * Math.sin((i / 96) * 2 * Math.PI)) * D);
    }
    K.zug(xs, ys, h, true);
  } else if ((z && !z.fahrt && z.art === 'einzel') || (teiler.zug && !z)) {
    const r = vierFlaeche().r;
    const g = K.neueGruppe();
    K.push(r.x0 * D, r.y0 * D, r.x1 * D, r.y0 * D, h, h, g, 0, false);
    K.push(r.x1 * D, r.y0 * D, r.x1 * D, r.y1 * D, h, h, g, 0, false);
    K.push(r.x1 * D, r.y1 * D, r.x0 * D, r.y1 * D, h, h, g, 0, false);
    K.push(r.x0 * D, r.y1 * D, r.x0 * D, r.y0 * D, h, h, g, 0, false);
  }
  const P = eckTropfenOrt();
  if (P) K.punkt(P[0] * D, P[1] * D, linienWerte.punktRadius * D * (1 + (linienWerte.tropfen - 1) * eckUeber));
}

/**
 * S18: die Abbildung der Einzelansicht `a`, wie die Kamera sie gerade zeigt: Mitte der Form im Bild (CSS-Pixel), Maßstab (CSS-Pixel je
 * Einheit) und ob sie gegenüber ihrem Feld der Vier Ansichten gespiegelt ist (dann zeigt das Feld sie gewendet, `feldWende`)
 */
function einzelAbbildung(a: 'seite' | 'front' | 'top'): { cx: number; cy: number; s: number; phi: number } | null {
  const e = raum;
  if (!e) return null;
  const vp = vpJetzt();
  const C = new Vector3(e.cx, e.cy, 0);
  const [x0, y0] = projizieren(C, vp);
  const [xu] = projizieren(C.clone().add(a === 'front' ? new Vector3(0, 0, -1) : new Vector3(1, 0, 0)), vp);
  const [, yv] = projizieren(C.clone().add(a === 'top' ? new Vector3(0, 0, -1) : new Vector3(0, 1, 0)), vp);
  const su = (xu - x0) / D;
  const sv = -(yv - y0) / D;
  return { cx: x0 / D, cy: y0 / D, s: Math.max(Math.abs(su), Math.abs(sv)), phi: (a === 'top' ? sv : su) < 0 ? Math.PI : 0 };
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

/** S17: das Feld der Vier Ansichten unter dem Punkt (CSS-Pixel), solange sie offen sind; sonst null */
function feldUnter(x: number, y: number): 'seite' | 'front' | 'top' | 'raum' | null {
  if (vier < 0.999 || !raum || zustand !== 'ruhe') return null;
  const F = felder();
  for (const n of ['seite', 'front', 'top', 'raum'] as const) {
    const r = F[n];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return n;
  }
  return null;
}

/** S17: ein Feld um den Faktor k zoomen, zum Punkt (x, y) hin (CSS-Pixel): Was dort liegt, bleibt dort */
function feldZoomen(n: 'seite' | 'front' | 'top' | 'raum', k: number, x: number, y: number): void {
  const r = felder()[n];
  const b = feldBlick[n];
  const z = Math.max(FELD_ZOOM_MIN, Math.min(FELD_ZOOM_MAX, b.zoom * k));
  const mx = r.x + r.w / 2;
  const my = r.y + r.h / 2;
  const q = z / b.zoom;
  b.x = x - (x - (mx + b.x)) * q - mx;
  b.y = y - (y - (my + b.y)) * q - my;
  b.zoom = z;
}

/** S17: Die Blase bleibt in ihrem Feld (Zoom des Raums): die Haut am Feld des Raums abgeschnitten, beim Aufklappen ab der Hälfte */
let hautSchnitt = '';
function feldHautSchneiden(): void {
  const f = faltJetzt;
  let wert = '';
  if (f && raum) {
    const R = f.F.raum;
    const t = glatt(Math.max(0, Math.min(1, (f.e - 0.5) / 0.5)));
    if (t > 1e-3) wert = `inset(${(R.y * t).toFixed(1)}px ${((W - R.x - R.w) * t).toFixed(1)}px ${((H - R.y - R.h) * t).toFixed(1)}px ${(R.x * t).toFixed(1)}px)`;
  }
  if (wert !== hautSchnitt) {
    hautSchnitt = wert;
    leinwandHaut.style.clipPath = wert;
    leinwandGast.style.clipPath = wert;
    leinwandGruen.style.clipPath = wert;
  }
}

/** gemeinsamer Maßstab der drei flachen Felder: Jede Ansicht passt in ihr Feld */
function feldMassstab(F0: ReturnType<typeof felder>): number {
  const e = raum!;
  // S18: mit freier Kreuzung richtet er sich nach der Lage im erlaubten Bereich (sonst schrumpften die Ansichten mit ihren Feldern)
  const F = kreuzFrei ? felder(true) : F0;
  const f = bw.vierFuellung;
  const X = 2 * e.rx;
  const Y = 2 * e.ry;
  const Z = 2 * Math.max(e.tiefe, 1);
  return f * Math.min(F.seite.w / X, F.seite.h / Y, F.front.w / Z, F.front.h / Y, F.top.w / X, F.top.h / Z);
}

/**
 * B2 (17.11.): die eine Abbildung eines flachen Felds der Vier Ansichten, für Linien, Körper und Tiefe. Das Feld schaut längs seiner
 * Achse auf die Mitte der Form (rechts, oben, zum Betrachter: Seite x, y, z; Front −z, y, x; Top x, −z, y), mit Zoom und Verschiebung
 * des Felds (S17; S18: auf dem Weg zur Einzelansicht zu deren Abbildung hin). Gewendet (`feldWende`, S17b) dreht sich die Form räumlich
 * um die Hochachse (Seite, Front) oder die Querachse (Top) durch ihre Mitte, wie unter der Kamera der einzelnen Ansicht: Was vorn
 * liegt, geht mit der Maus. Bis zum 17.11. wurde nur gestaucht (die Tiefe zählte nicht: ein flaches Blatt).
 * Bild (CSS-Pixel): x = mx + sz · r · (p − m), y = my − sz · o · (p − m); zum Betrachter hin: v · (p − m).
 */
type FeldAbbildung = { mx: number; my: number; sz: number; r: Vector3; o: Vector3; v: Vector3; m: Vector3 };
function feldAbbildung(n: FeldAchse, F: ReturnType<typeof felder>, s: number): FeldAbbildung {
  const e = raum!;
  const q = F[n];
  const b = blickIn(n, F, s);
  const phi = feldWende[n].phi;
  const c = Math.cos(phi);
  const sn = Math.sin(phi);
  const R = n === 'front' ? new Vector3(0, 0, -1) : new Vector3(1, 0, 0);
  const O = n === 'top' ? new Vector3(0, 0, -1) : new Vector3(0, 1, 0);
  const V = n === 'seite' ? new Vector3(0, 0, 1) : n === 'front' ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const oben = n === 'top';
  return {
    mx: q.x + q.w / 2 + b.x,
    my: q.y + q.h / 2 + b.y,
    sz: s * b.zoom,
    r: oben ? R : R.clone().multiplyScalar(c).addScaledVector(V, sn),
    o: oben ? O.clone().multiplyScalar(c).addScaledVector(V, -sn) : O,
    v: oben ? V.clone().multiplyScalar(c).addScaledVector(O, sn) : V.clone().multiplyScalar(c).addScaledVector(R, -sn),
    m: new Vector3(e.cx, e.cy, 0),
  };
}

/** Punkt der Welt in einem flachen Feld (Gerätepunkte), mit `feldAbbildung` */
function imFeld(n: FeldAchse, p: Vector3, F: ReturnType<typeof felder>, s: number): [number, number] {
  const A = feldAbbildung(n, F, s);
  const dx = p.x - A.m.x;
  const dy = p.y - A.m.y;
  const dz = p.z - A.m.z;
  return [(A.mx + A.sz * (A.r.x * dx + A.r.y * dy + A.r.z * dz)) * D, (A.my - A.sz * (A.o.x * dx + A.o.y * dy + A.o.z * dz)) * D];
}

/** im Feld (CSS) → Welt in der Ebene der Ansicht (durch die Mitte der Form; gilt, solange das Feld nicht gerade wendet) */
function ausFeld(n: FeldAchse, x: number, y: number, F: ReturnType<typeof felder>, s: number): [number, number] {
  const e = raum!;
  const r = F[n];
  const b = blickIn(n, F, s);
  const c0 = Math.cos(feldWende[n].phi);
  const c = Math.abs(c0) < 1e-3 ? (c0 < 0 ? -1e-3 : 1e-3) : c0;
  const u = (x - (r.x + r.w / 2 + b.x)) / (s * b.zoom * (n === 'top' ? 1 : c));
  const v = -(y - (r.y + r.h / 2 + b.y)) / (s * b.zoom * (n === 'top' ? c : 1));
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
  let ox = a0.x + ((2 * mxS) / W - 1 - a0.x) * v - a.x;
  let oy = a0.y + (1 - (2 * myS) / H - a0.y) * v - a.y;
  if (faltAnker) {
    // S19: Die Ecke der Kiste (wo die Kanten der Front und des Bodens die Seite treffen; am Ende die Kreuzung) liegt am Ziel des Zugs
    const xh = e.cx + sw[0] * e.L;
    const yh = e.cy + sw[1] * e.L;
    const xhF = e.cx + (F.tx - mxS) / s4;
    const yhF = e.cy - (F.ty - myS) / s4;
    const ecke = new Vector3(xh + (xhF - xh) * v, yh + (yhF - yh) * v, sw[2] * e.L).applyMatrix4(
      new Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse),
    );
    ox = (2 * faltAnker[0]) / W - 1 - ecke.x;
    oy = 1 - (2 * faltAnker[1]) / H - ecke.y;
  }
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
    // S17: die Mitte der Zeichnung landet in der Mitte des Felds samt seiner Verschiebung (`faltPunkt` mit p = Mitte)
    const b = feldBlick[n];
    const mitte = front ? e.cy - (b.y / s4) * v : e.cx + (b.x / s4) * v;
    const start = (front ? new Vector3(f.xh, e.cy, 0) : new Vector3(e.cx, f.yh, 0)).applyMatrix4(vpRaum);
    const Fd = F[n];
    const X = start.x + ((2 * (Fd.x + Fd.w / 2 + b.x)) / W - 1 - start.x) * v;
    const Y = start.y + (1 - (2 * (Fd.y + Fd.h / 2 + b.y)) / H - start.y) * v;
    const r0 = f.zh * sw[2];
    const rm = r0 + ((front ? f.rFront - b.x / s4 : f.rTop + b.y / s4) - r0) * v;
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
  const e = raum!;
  const t = f.e;
  // S17: Zoom und Verschiebung des Felds: Die Zeichnung gleitet und wächst auf ihrer Wand, bis sie im Feld liegt wie `imFeld`
  const b = feldBlick[n];
  if (n === 'seite') {
    const xz = e.cx + b.x / f.s4 + (p.x - e.cx) * b.zoom;
    const yz = e.cy - b.y / f.s4 + (p.y - e.cy) * b.zoom;
    return new Vector3(p.x + (xz - p.x) * t, p.y + (yz - p.y) * t, f.zh);
  }
  // Abstand von der Kante: auf der Wand und im Feld; dazwischen gleitet die Zeichnung auf ihrer Wand
  const r0 = -(p.z - f.zh) * f.sw[2];
  if (n === 'front') {
    const rF = f.rFront - b.x / f.s4 + p.z * b.zoom;
    const uF = e.cy - b.y / f.s4 + (p.y - e.cy) * b.zoom;
    return aufWand(n, r0 + (rF - r0) * t + f.kF, p.y + (uF - p.y) * t + f.uF, f);
  }
  const rT = f.rTop + b.y / f.s4 + p.z * b.zoom;
  const uT = e.cx + b.x / f.s4 + (p.x - e.cx) * b.zoom;
  return aufWand(n, r0 + (rT - r0) * t + f.kT, p.x + (uT - p.x) * t + f.uT, f);
}

/** S17: Kanten eines konvexen Vierecks (Gerätepunkte) für die Anzeige: je Kante x, y, z mit x · p.x + y · p.y + z ≥ 0 innen */
function bereichAus(ecken: [number, number][]): number[] {
  const cx = ecken.reduce((a, q) => a + q[0], 0) / ecken.length;
  const cy = ecken.reduce((a, q) => a + q[1], 0) / ecken.length;
  const k: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = ecken[i]!;
    const [bx, by] = ecken[(i + 1) % 4]!;
    const l = Math.hypot(bx - ax, by - ay);
    if (l < 1e-6) {
      k.push(0, 0, 1e6);
      continue;
    }
    let nx = -(by - ay) / l;
    let ny = (bx - ax) / l;
    if (nx * (cx - ax) + ny * (cy - ay) < 0) {
      nx = -nx;
      ny = -ny;
    }
    k.push(nx, ny, -(nx * ax + ny * ay));
  }
  return k;
}

/**
 * S17: die Bereiche der Felder in diesem Bild (Gerätepunkte): offen die Felder selbst, beim Auf- und Zuklappen die Wände, die sich
 * aufklappen (wie `faltKanten`); das Feld des Raums wächst vom ganzen Bild zu seinem Feld. Außerhalb der Vier Ansichten keine.
 */
function bereicheRechnen(): number[] {
  const f = faltJetzt;
  if (!f || !raum) return [];
  const rand = (r: Feld): [number, number][] => [
    [r.x * D, r.y * D],
    [(r.x + r.w) * D, r.y * D],
    [(r.x + r.w) * D, (r.y + r.h) * D],
    [r.x * D, (r.y + r.h) * D],
  ];
  const B: number[][] = [];
  if (f.e > 0.999) {
    for (const n of ['seite', 'front', 'top'] as const) B[BEREICH_VON[n] - 1] = bereichAus(rand(f.F[n]));
  } else {
    const { xa, xb, ya, yb, rF, rT } = faltRahmen(f);
    const z = f.zh;
    const pr = (q: Vector3): [number, number] => {
      const [x, y] = projizieren(q, f.vp);
      return [x, y];
    };
    B[0] = bereichAus([pr(new Vector3(xa, ya, z)), pr(new Vector3(xb, ya, z)), pr(new Vector3(xb, yb, z)), pr(new Vector3(xa, yb, z))]);
    B[1] = bereichAus([pr(aufWand('front', 0, ya, f)), pr(aufWand('front', rF, ya, f)), pr(aufWand('front', rF, yb, f)), pr(aufWand('front', 0, yb, f))]);
    B[2] = bereichAus([pr(aufWand('top', 0, xa, f)), pr(aufWand('top', rT, xa, f)), pr(aufWand('top', rT, xb, f)), pr(aufWand('top', 0, xb, f))]);
  }
  const R = f.F.raum;
  const t = f.e;
  B[3] = bereichAus(rand({ x: R.x * t, y: R.y * t, w: W + (R.w - W) * t, h: H + (R.h - H) * t }));
  return B.flat();
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
  if (zustand !== 'ruhe' || eckZug) return;
  vierZiel = (an ?? vierZiel < 0.5) ? 1 : 0;
  if (vierZiel > 0.5 && ansicht !== 'raum') ansichtSetzen('raum');
  vierWartet = false;
  if (vierZiel > 0.5 && vier < 1e-3) {
    // S16: von hinten, unten oder links erst auf die Vorderseite der Kiste drehen (wie von Hand); aufgeklappt wird, sobald sie dort ist
    schwung = null;
    // S17b: die Felder klappen ungewendet auf
    for (const w of Object.values(feldWende)) {
      w.phi = 0;
      w.fahrt = null;
    }
    const ziel = ansichtFahrt ? null : vorderseiteZiel();
    if (ziel) {
      const [G, N] = gesamtWinkel(nutzer.gier, nutzer.neigung);
      const [G1, N1] = gesamtWinkel(ziel[0], ziel[1]);
      const winkel = richtung(G, N).angleTo(richtung(G1, N1));
      // so lang wie eine Fahrt in eine Ansicht bei 120°, kürzer bei weniger
      const dauer = Math.min(0.92, Math.max(0.42, (0.8 * winkel) / ((2 * Math.PI) / 3))) * bw.fahrt;
      vorDreh = { t: 0, dauer, g0: nutzer.gier, n0: nutzer.neigung, g1: ziel[0], n1: ziel[1] };
    }
    vierWartet = true;
    vierFahrt = null;
    vierWarten();
  } else {
    vorDreh = null;
    vierZuWartet = false;
    // S17b: gewendete Felder wenden erst zurück, dann klappt die Kiste zu
    if (vierZiel < 0.5 && vier > 0.999 && feldGewendet()) {
      for (const n of ['seite', 'front', 'top'] as const) feldWendenFahrt(n, Math.round(feldWende[n].phi / (2 * Math.PI)) * 2 * Math.PI);
      vierZuWartet = true;
      vierFahrt = null;
    } else vierFahrt = { von: vier, t: 0 };
  }
  anstossen();
}

/** Gier und Neigung der Kamera (rad) aus denen von Hand */
function gesamtWinkel(gierHand: number, neigungHand: number): [number, number] {
  return [(werte.gier * Math.PI) / 180 + gierHand, (werte.neigung * Math.PI) / 180 + neigungHand];
}

/** S16: steht die Kamera vorn rechts oben, vor allen drei Wänden der Kiste (mit `ab` Abstand zu ihren Ebenen)? */
function vorKiste(gierHand: number, neigungHand: number, ab = VORN_AB): boolean {
  const [G, N] = gesamtWinkel(gierHand, neigungHand);
  const d = richtung(G, N);
  return d.x >= ab && d.y >= ab && d.z >= ab;
}

/**
 * S16: wohin der Raum vor dem Aufklappen dreht (Gier und Neigung von Hand), oder null, wenn die Kamera schon vor der Kiste steht: die
 * nächste Lage vorn rechts oben, `VORN_ZIEL` vor den Wänden.
 */
function vorderseiteZiel(): [number, number] | null {
  if (vorKiste(nutzer.gier, nutzer.neigung)) return null;
  const [G, N] = gesamtWinkel(nutzer.gier, nutzer.neigung);
  const ab = VORN_ZIEL;
  const n = Math.min(1.2, Math.max(N, Math.asin(ab)));
  const c = Math.cos(n);
  const lo = Math.asin(Math.min(1, ab / c));
  const hi = Math.acos(Math.min(1, ab / c));
  const g0 = winkelZu(0, G);
  let g = g0;
  if (g0 < lo || g0 > hi) g = Math.abs(winkelZu(g0, lo) - g0) <= Math.abs(winkelZu(g0, hi) - g0) ? lo : hi;
  return [nutzer.gier + (winkelZu(G, g) - G), nutzer.neigung + (n - N)];
}

/** S16: wartet das Aufklappen und steht die Kamera vor der Kiste (oder dreht nichts mehr): jetzt aufklappen */
function vierWarten(): void {
  if (!vierWartet) return;
  if (vierZiel < 0.5 || zustand !== 'ruhe') {
    vierWartet = false;
    return;
  }
  if (vorKiste(nutzer.gier, nutzer.neigung) || (!vorDreh && !ansichtFahrt)) {
    vierWartet = false;
    vierFahrt = { von: vier, t: 0 };
  }
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
  const eigen = werkGezeigt ? werkHaut.umriss(achse, werkBeschaeftigt()) : koerper!.umriss(achse);
  if (!ruhende.length) return eigen;
  // mehrere Objekte: die Umrisse der ruhenden dazu (jede Anzeige merkt sich ihren; zusammengesetzt wird nur, wenn sich einer ändert)
  const teile = [eigen, ...ruhende.map((r) => r.haut.umriss(achse))];
  const g = umrissAlle[achse];
  if (g && g.teile.length === teile.length && g.teile.every((t, i) => t === teile[i])) return g.aus;
  let n = 0;
  for (const t of teile) n += t.length;
  const aus = new Float32Array(n);
  let o = 0;
  for (const t of teile) {
    aus.set(t, o);
    o += t.length;
  }
  umrissAlle[achse] = { teile, aus };
  return aus;
}
const umrissAlle: ({ teile: Float32Array[]; aus: Float32Array } | null)[] = [null, null, null];

/** mehrere Felder von Strecken zu einem, gemerkt, solange es dieselben Felder sind */
function streckenGemerkt(g: { teile: Float32Array[]; aus: Float32Array } | null, teile: Float32Array[]): { teile: Float32Array[]; aus: Float32Array } {
  if (g && g.teile.length === teile.length && g.teile.every((t, i) => t === teile[i])) return g;
  let n = 0;
  for (const t of teile) n += t.length;
  const aus = new Float32Array(n);
  let o = 0;
  for (const t of teile) {
    aus.set(t, o);
    o += t.length;
  }
  return { teile, aus };
}
/** die Linien aller ruhenden Objekte im Raum (Strecken): feine Striche an den Wänden und in den Ansichten */
let ruheLinienGemerkt: { teile: Float32Array[]; aus: Float32Array } | null = null;
function ruheLinien(): Float32Array {
  ruheLinienGemerkt = streckenGemerkt(ruheLinienGemerkt, ruhende.map((r) => r.linien));
  return ruheLinienGemerkt.aus;
}
/** die Umrisse der ruhenden Objekte von einer Achse (wo der Umriss des aktiven nicht über `umrissJetzt` gezeichnet wird) */
const ruheUmrissGemerkt: ({ teile: Float32Array[]; aus: Float32Array } | null)[] = [null, null, null];
function ruheUmrisse(achse: 0 | 1 | 2): Float32Array {
  const g = streckenGemerkt(ruheUmrissGemerkt[achse]!, ruhende.map((r) => r.haut.umriss(achse)));
  ruheUmrissGemerkt[achse] = g;
  return g.aus;
}
/** Strecken im Raum als Striche zeichnen (`legen`: vom Raum ins Bild) */
function streckenZeichnen(seg: Float32Array, legen: (x: number, y: number, z: number) => [number, number], r: number): void {
  if (r < 0.01 || !seg.length) return;
  const g = K.neueGruppe();
  for (let i = 0; i < seg.length; i += 6) {
    const [ax, ay] = legen(seg[i]!, seg[i + 1]!, seg[i + 2]!);
    const [bx, by] = legen(seg[i + 3]!, seg[i + 4]!, seg[i + 5]!);
    K.push(ax, ay, bx, by, r, r, g, 0, false);
  }
}
/** so breit sind die Linien ruhender Objekte, gemessen am Umriss (die feine Linie des Designs: innen 0,25 zu 1) */
const ruheBreite = (): number => linienWerte.innen / Math.max(1e-6, linienWerte.umriss);

/**
 * A3: der Kasten der Haut des Werks im Bild (Gerätepunkte, Ursprung oben links), wenn von der Seifenhaut nur sie zu sehen ist (Ruhe,
 * kein Rahmen, kein Schlauch; nicht in der Pose, dort drehen die Knochen die Haut aus ihrem Kasten). Die Seifenhaut legt ihr teures
 * Ziel dann nur so groß an. null: das ganze Bild.
 */
function hautAusschnitt(m: Moment | null): { x: number; y: number; b: number; h: number } | null {
  if (zustand !== 'ruhe' || !werkGezeigt || !m || 1 - m.schatten > 1e-3 || werk.grund !== null) return null;
  const vp = vpJetzt();
  // die gewölbte Anzeige reicht ein wenig über die Rechenpunkte hinaus
  const k = 1.05;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  const v = new Vector4();
  // der Kasten des aktiven Objekts (um seine Mitte, nach beiden Seiten der Spiegelebene) und die der ruhenden
  const eigen = werkHaut.masse();
  const kaesten = [{ cx: werkHaut.mitte.x, cy: werkHaut.mitte.y, rx: eigen.rx, ry: eigen.ry, tiefe: eigen.tiefe }, ...ruhende.map((r) => r.kasten)];
  for (const b of kaesten)
    for (let e = 0; e < 8; e++) {
      v.set(b.cx + (e & 1 ? k : -k) * b.rx, b.cy + (e & 2 ? k : -k) * b.ry, (e & 4 ? k : -k) * b.tiefe, 1).applyMatrix4(vp);
      // eine Ecke hinter der Kamera: kein verlässlicher Kasten
      if (!(v.w > 1e-6)) return null;
      const x = (v.x / v.w / 2 + 0.5) * W * D;
      const y = (0.5 - v.y / v.w / 2) * H * D;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  const rand = 8 * D + 0.03 * Math.max(x1 - x0, y1 - y0);
  return { x: x0 - rand, y: y0 - rand, b: x1 - x0 + 2 * rand, h: y1 - y0 + 2 * rand };
}

/** ein Bild; true: es bewegt sich noch etwas */
function bild(dt: number): boolean {
  const t0 = performance.now();
  let aktiv = false;
  // A4: was unter dem Zeiger liegt, einmal je Bild (nicht, solange etwas gezogen wird: Dort gilt das Drücken)
  if (schwebenOffen) {
    schwebenOffen = false;
    const zieht = feldWendenZug || schwenkZug || bearbeitenGedrueckt || pinselZug || feldDruck || tastenZug || objektZug || wenden || raumStrich || raumAufzug || eckZug || teiler.zug || punktZug || drehen || (zug && koerper);
    if (zustand !== 'blatt' && !zieht) schweben(zeiger.x, zeiger.y);
  }
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
  let mBuehne: Moment | null = null;
  if (zustand !== 'blatt' && koerper && raum) {
    const dauer = moment(0, masse(), werte).dauer;
    if (festeZeit !== null) T = festeZeit;
    else if (zustand === 'auf') T += dt * (reihe?.imRaum ? REIHE_TEMPO : 1);
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
    // die folgenden Formen einer Reihe blasen im Raum auf: Kamera, Wände und Linien stehen wie am Ende der Fahrt
    mBuehne = reihe?.imRaum ? moment(dauer, masse(), werte) : m;
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
  if (reiheSchritt()) aktiv = true;
  // C4: gewählte Felder folgen der Haut (Netzwechsel, Züge) und der Auswahl des Werks; G, S, R endet, wenn das Werk den Zug beendet hat
  werkFelder.nachfuehren();
  if (tastenZug && !(werk.zug && werk.zug.modal)) tastenZug = null;
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
  // S16: vor dem Aufklappen auf die Vorderseite der Kiste drehen (wie von Hand: die Wände wechseln weich, die Kante wandert aus dem Bild)
  if (vorDreh) {
    vorDreh.t += dt / Math.max(0.05, vorDreh.dauer);
    const t = Math.min(1, vorDreh.t);
    const e = t * t * t * (t * (t * 6 - 15) + 10);
    nutzer.gier = vorDreh.g0 + (vorDreh.g1 - vorDreh.g0) * e;
    nutzer.neigung = vorDreh.n0 + (vorDreh.n1 - vorDreh.n0) * e;
    if (t >= 1) vorDreh = null;
    aktiv = true;
  }
  vierWarten();
  // S18, S19: die Fahrt nach dem Loslassen des Tropfens an der Ecke; sein Anflug
  if (eckZugSchritt(dt)) aktiv = true;
  // S20: der weiße Körper blendet ein, sobald eine flache Ansicht ruht
  if (raumNetzSchritt(dt)) aktiv = true;
  if (koerperSchritt(dt)) aktiv = true;
  {
    const P = eckTropfenOrt();
    const ziel = P && zeiger.da && Math.hypot(zeiger.x - P[0], zeiger.y - P[1]) < 14 ? 1 : 0;
    eckUeber += (ziel - eckUeber) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(ziel - eckUeber) > 2e-3) aktiv = true;
    leinwandLinien.classList.toggle('teiler', ziel > 0 || teiler.ueber > 0 || !!eckZug);
    // in der Front liegt der Tropfen unten rechts: Der Ansichts-Tropfen rückt nach oben
    document.getElementById('ansichts-tropfen')?.classList.toggle('hoch', ansicht === 'front' && flach > 0.5 && vier < 0.5 && !eckZug);
  }
  // S17b: Wenden der Felder
  for (const w of Object.values(feldWende)) {
    if (!w.fahrt) continue;
    w.fahrt.t += dt / w.fahrt.dauer;
    const t = Math.min(1, w.fahrt.t);
    w.phi = w.fahrt.von + (w.fahrt.nach - w.fahrt.von) * t * t * t * (t * (t * 6 - 15) + 10);
    if (t >= 1) {
      w.phi = winkelZu(0, w.fahrt.nach);
      if (Math.abs(w.phi + Math.PI) < 1e-9) w.phi = Math.PI;
      w.fahrt = null;
    }
    aktiv = true;
  }
  if (vierZuWartet && (vierZiel > 0.5 || !feldGewendet())) {
    vierZuWartet = false;
    if (vierZiel < 0.5) vierFahrt = { von: vier, t: 0 };
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
  kameraSetzen(zustand === 'blatt' ? null : mBuehne);
  faltJetzt = zustand === 'blatt' ? null : faltRechnen();
  // A3: wie groß die Haut im Bild ist (Gerätepunkte je Einheit des Werks; in den Vier Ansichten das größte Feld): danach richten sich
  // die Stufen der glatten Anzeige. Passt ihre Zahl nicht mehr (Zoomen, Wechsel der Ansicht), wird in der Ruhe neu gerechnet.
  {
    let mass = massstab.jetzt * nutzer.zoom;
    const f4 = faltJetzt;
    if (f4 && vier > 0.5) for (const n of ['seite', 'front', 'top', 'raum'] as const) mass = Math.max(mass, f4.s4 * blickIn(n, f4.F, f4.s4).zoom);
    werkHaut.bildMass = (mass * D) / werkHaut.f;
    if (werkGezeigt && zustand === 'ruhe' && !werkBeschaeftigt() && werkHaut.stufenWechsel()) {
      werkVoll = true;
      werkNeu = true;
      aktiv = true;
    }
  }
  bereicheJetzt = bereicheRechnen();
  feldHautSchneiden();
  // S13 (10): der Ansichts-Tropfen zeigt, von wo die Kamera schaut (nur in der Ruhe)
  if (ansichtsTropfen.zeichnen(kam.aktiv, zustand === 'ruhe' && !!koerper && !document.body.classList.contains('bild'), dt)) aktiv = true;
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
  // S14: Röntgen (⌥ gehalten oder der Knopf auf dem iPad), weich
  const roentgenZiel = (altGehalten || roentgenFest) && zustand === 'ruhe' && werkGezeigt ? 1 : 0;
  roentgen += (roentgenZiel - roentgen) * (1 - Math.exp(-dt / 0.1));
  if (Math.abs(roentgenZiel - roentgen) > 0.005) aktiv = true;
  else roentgen = roentgenZiel;
  werkBlatt.roentgenWert = roentgen;
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
  // die ruhenden Objekte: auf dem Blatt (für ein neues Objekt, oder wenn dem aktiven die Luft abgelassen ist) blass, sonst wie die Haut
  if (ruhende.length) {
    const ziel = zustand === 'blatt' ? RUHE_AUF_DEM_BLATT : zustand === 'ab' ? RUHE_AUF_DEM_BLATT + (1 - RUHE_AUF_DEM_BLATT) * glatt(Math.min(1, T / 0.8)) : 1;
    ruheSicht += (ziel - ruheSicht) * (1 - Math.exp(-dt / 0.16));
    if (Math.abs(ziel - ruheSicht) > 2e-3) aktiv = true;
    else ruheSicht = ziel;
  } else ruheSicht = 1;
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
    deckung: (zustand === 'blatt' ? 0.42 * film : 0.42 + 0.58 * glatt(T / 1.4)) * (1 - weg) * (1 - 0.7 * roentgen),
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
    dunkel: vier > 0.999 ? null : hintenJetzt,
    kanteFarbe: KANTE_FARBE,
    schnitt: schnittJetzt,
    spiegelSchnitt: spiegelSchnittJetzt(),
    // eingerastet: Das Blatt hat die Blase ganz weggeschnitten und der Rahmen ist weg: nur der Grund
    leer: schnittGanz && zustand === 'ruhe' && vier < 1e-3 && !!m && 1 - m.schatten < 1e-3,
    netz: werkGezeigt ? netzArt : 0,
    blaseAus: raumNetzDeckung >= 0.999,
    ausschnitt: hautAusschnitt(m),
    ruheSicht,
  };
  const tz = performance.now();
  // ein festes Material statt der Seifenhaut (Florian, 18.11.): Die Seifenhaut zeichnet nur ihren Grund (Papier, dunkle Rückseite),
  // darüber liegt die Haut des Werks mit dem Material. Beim Aufblasen selbst bleibt es die Seifenhaut (die Blase der Studie).
  const zeigN = zeigeNetzAlle();
  if (material !== null && werkGezeigt && zustand === 'ruhe' && zeigN && !w.leer) {
    haut.zeichnen(kam.aktiv, { ...w, leer: true }, []);
    // beim Einrasten blenden die Materialien auf eigener Fläche aus, während sich das Blatt durch die Form schiebt (ihre Renderer
    // kennen keinen Schnitt)
    const blende = schnittJetzt ? 1 - glatt(flach) : 1;
    if (material !== MATERIAL_GRUEN || w.blaseAus) gruen?.aus();
    if (w.blaseAus) gast.aus();
    else if (material === MATERIAL_GRUEN) {
      // das grüne Material: das Earle-Material des alten Editors auf seiner eigenen Fläche (`gruen.ts`)
      gast.aus();
      const g = gruenHolen();
      if (!g) aktiv = true;
      else {
        if (!gruenStand || gruenStand.netz !== zeigN || gruenStand.version !== werkHaut.version) {
          g.netzSetzen(zeigN, wicklungVon(zeigN));
          gruenStand = { netz: zeigN, version: werkHaut.version };
        }
        if (g.zeichnen(kam.aktiv, { deckung: (1 - 0.7 * roentgen) * blende })) aktiv = true;
      }
    } else if (istGast(material)) {
      // Jelly und helles Solid: der Blaupause-Renderer auf seiner eigenen Fläche über dem Raum (`gast.ts`)
      if (!gastStand || gastStand.netz !== zeigN || gastStand.version !== werkHaut.version) {
        gast.netzSetzen(zeigN, wicklungVon(zeigN));
        gastStand = { netz: zeigN, version: werkHaut.version };
      }
      const heim = richtung(((mBuehne?.gier ?? 0) * Math.PI) / 180, ((mBuehne?.neigung ?? 0) * Math.PI) / 180);
      const unruhig = gast.zeichnen(kam.aktiv, material, {
        deckung: (1 - 0.7 * roentgen) * blende,
        abstand: kam.abstand,
        kante: werk.MK / werkHaut.f,
        heim: [heim.x, heim.y, heim.z],
        jetzt: performance.now(),
      });
      if (unruhig) aktiv = true;
    } else {
      gast.aus();
      if (!festeStand || festeStand.netz !== zeigN || festeStand.version !== werkHaut.version) {
        feste.netzSetzen(zeigN, wicklungVon(zeigN));
        festeStand = { netz: zeigN, version: werkHaut.version };
      }
      feste.zeichnen(kam.aktiv, material, { schnitt: schnittJetzt, deckung: 1 - 0.7 * roentgen, spiegelSchnitt: spiegelSchnittJetzt() });
    }
  } else {
    gast.aus();
    gruen?.aus();
    haut.zeichnen(kam.aktiv, w, []);
  }
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
    szene.zeigerFarbe = 1;
  } else {
    K.leeren();
    const vp = vpJetzt();
    let zeigerBearbeiten: Szene['zeiger'] | undefined;
    werkHaut.umrissVeraltet = false;
    if (koerper && raum && m) {
      const tw = performance.now();
      wandLinien(vp, mBuehne ?? m);
      if (flach > 0.01 && !einzelUebergang) linienDerAnsicht(vp);
      if (faltJetzt) felderLinien(faltJetzt, mBuehne ?? m);
      eckZeichen();
      mess.teile[5] = performance.now() - tw;
      if (werkHaut.umrissVeraltet) aktiv = true;
    }
    if (koerper && raum && m && werkGezeigt) {
      const tl = performance.now();
      const r = werkLinien(vp, mBuehne ?? m, dt);
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
      gruen: roentgen > 0 ? (GRUEN.map((g, i) => g + (GRUEN_ROENTGEN[i]! - g) * roentgen) as [number, number, number]) : GRUEN,
      dunkel: hintenJetzt,
      zeiger: !zeigerZeigen ? null : bearbeitenAn ? (zeigerBearbeiten ?? null) : zeigerForm(zeiger.x, zeiger.y),
      // zwei Zeiger: dunkel für Objekte (V), weiß für Punkte (A, P); keiner tauscht auf der Rückseite seine Farbe
      zeigerFarbe: objektModus() ? 2 : 1,
      bereiche: bereicheJetzt,
      // S17b: die Rückseite gewendeter Felder malt die Anzeige der Linien selbst (die Haut ist aufs Feld des Raums beschnitten)
      dunkelFuellen: vier > 0.999,
      // S20: der weiße Körper (eingerastet), Linien dürfen ein wenig hinter seiner Haut liegen
      koerper: linienKoerper(),
      // die Verdeckung kommt mit dem Körper: Solange er noch blass ist, liegt alles vorn
      bias: (raum?.R ?? 0) * (KOERPER_BIAS + 2 * (1 - koerperDeckung)),
      band: (raum?.R ?? 1) * KOERPER_BAND,
    };
    szene.zeigerUmriss = zeigerGestaltSchritt(szene.zeiger, dt);
    if (zeigerGestalt.gleitet) aktiv = true;
  }
  if (zeigerVomSystem && zeigerSystemSchritt(szene, dt)) aktiv = true;
  zeigerGezeichnet = !!szene.zeiger;
  const ta = performance.now();
  anzeige.zeichnen(szene);
  mess.teile[4] = performance.now() - ta;
  hintenZeigen();
  maulUiZeigen();
  objektUiZeigen();
  if (zustand === 'ruhe' && !werk.zug) rueckwegAbgleichen();
  leiste.spiegelZeigen(spiegelZustand(), spiegelErlaubt());
  // das Plus: ein neues Objekt gibt es im Raum, sobald eine Form steht (wie der Spiegel)
  leiste.plusErlauben(spiegelErlaubt());
  // Verschmelzen und Abziehen: zu sehen, sobald es mehr als ein Objekt gibt; an, wenn das aktive ein anderes berührt
  leiste.nahtZeigen(ruhende.length > 0 && zustand === 'ruhe', ruhende.length > 0 && nahtErlaubt());
  tastenStand();
  // Text
  // (auf dem Blatt eines weiteren Objekts stehen die vorhandenen blass: Dort schweigt der Schriftzug)
  gruss.classList.toggle('weg', !(zustand === 'blatt' && blatt.leer && !ruhende.length));
  const h =
    zustand === 'ruhe' && werkGezeigt && roentgen > 0.5
      ? 'Röntgen: auch Punkte und Linien hinter der Form greifen · ⌥ loslassen: zurück'
      : zustand === 'ruhe' && werkGezeigt && raumWerkzeug === 'lasso'
      ? 'Lasso: Punkte umfahren · ⇧ dazu · ⌥ weg · ⌫ löschen · K Kante · A oder Q: zurück'
      : zustand === 'ruhe' && werkGezeigt && objektModus()
      ? objektGewaehlt
        ? 'Objekt gewählt · ziehen: verschieben · G S R · Spiegel in der Leiste · Doppelklick oder A: seine Punkte · ⌫ löscht es · daneben ziehen: drehen'
        : 'Objekte: Klick auf die Form wählt sie, ziehen verschiebt sie · Doppelklick oder A: ihre Punkte · daneben ziehen: drehen'
      : zustand === 'blatt'
      ? blatt.geschlossen && !blatt.zeichnet
        ? '↩ aufblasen'
        : ''
      : zustand === 'ruhe'
        ? vier > 0.5
          ? werkGezeigt
            ? bearbeiten.stift
              ? 'P: Klick Ecke, Ziehen rund, auf dem ersten Punkt schließen (Form) · auf Punkt oder Linie beginnen und enden (Abzweigung) · Esc'
              : 'Punkte, Linien und Richtungen ziehen · Klick in ein Feld der Form wählt es · G S R · ins Leere ziehen: drehen · Rad zoomt das Feld · Leertaste + Ziehen schwenkt · ⇧ + Ziehen wendet · Tropfen in eine Ecke: eine Ansicht · V Objekt · P zeichnen · Q Lasso · L Verbundenes · K Kante · ⌥ Röntgen · ⌫ löschen · ⌘Z · Tab: zurück in den Raum'
            : 'Tab: zurück in den Raum · Tropfen in der Mitte ziehen: Felder · Rad zoomt das Feld · Leertaste + Ziehen schwenkt · Punkte der Seite ziehen'
          : ansicht === 'raum'
            ? werkGezeigt
              ? bearbeiten.stift
                ? 'P an den Wänden: Klick Ecke, Ziehen rund, auf dem ersten Punkt schließen · auf Punkt oder Linie: Abzweigung · Esc'
                : raumNetzDeckung > 0.5
                  ? 'Punkte, Linien und Richtungen auf der Form ziehen · daneben an der Form: Pinsel ([ ] Größe) · ins Leere ziehen: drehen · V Objekt · Q Lasso · L Verbundenes · K Kante · ⌥ Röntgen · ⌫ löschen · ⌘Z · W Seifenhaut · 1 3 7 Ansichten · Tab vier'
                  : 'an der Blase ziehen: Pinsel ([ ] Größe) · ins Leere ziehen: drehen · Linien an den Wänden ziehen · Punkt an der Ecke ziehen: aufklappen · V Objekt · P zeichnen · Q Lasso · L Verbundenes · K Kante · ⌫ löschen · ⌘Z · W Kurvennetz · 1 3 7 Ansichten · Tab vier'
              : 'ziehen: drehen · an der Blase ziehen · Punkte an der Wand der Seite ziehen · 1 Seite · 3 Front · 7 Top · Tab vier Ansichten'
            : werkGezeigt
              ? bearbeiten.stift
                ? 'P: Klick Ecke, Ziehen rund, auf dem ersten Punkt schließen (Form) · auf Punkt oder Linie beginnen und enden (Abzweigung) · Esc'
                : 'Punkte, Linien und Richtungen ziehen · Klick in ein Feld der Form wählt es · G S R · ins Leere ziehen: drehen · Tropfen an der Ecke ziehen: Vier Ansichten · V Objekt · P zeichnen · Q Lasso · L Verbundenes · K Kante · ⌥ Röntgen · ⌫ löschen · ⌘Z · 0 Raum · 1 Seite · 3 Front · 7 Top'
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
  // A1 (17.11.): dem Werk melden, was dieses Bild ohne die Runden seines Lösers gekostet hat. Ozzy zeichnet erst nach `bildRechnen`;
  // ohne die Meldung hielt das Werk sein Bild für umsonst und rechnete bis 12 ms je Bild
  werk.bildRestMelden(stat.bildMs - Math.max(0, werk.bildGerechnetMs));
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
/** S14: das Grün des Verdeckten im Röntgen (kräftiger, es ist jetzt greifbar) */
const GRUEN_ROENTGEN: [number, number, number] = [0x5e / 255, 0x8f / 255, 0x57 / 255];
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

// ---------- B1 (17.11., Schalter `?zeiger=system`): der Zeiger des Systems vertritt den gezeichneten ----------
//
// Der gezeichnete Zeiger erscheint erst mit dem nächsten Bild (er hängt der Hand ein bis drei Bilder nach und ruckt mit jedem
// verpassten Bild); den Zeiger des Systems setzt das Betriebssystem selbst, auch wenn Ozzy gerade rechnet. Er bekommt deshalb dieselbe
// Form (Pfeil, Spitze, Schlinge) und steht für den gezeichneten, solange dieser genau auf der Hand läge. Gezeichnet wird weiter, was
// sich von der Hand löst oder zum Bild gehört: beim Drücken und Greifen (der Zeiger gleitet zur Stelle und sitzt auf ihr), auf dem
// Rückweg danach, der Ring des Pinsels über der Haut, und während die Form des Zeigers von einem Werkzeug ins andere gleitet.
// Tropfen, Schwellung und Feld bleiben im Bild. Vom Gezeichneten zum System wird erst gewechselt, wenn die Hand fast ruht (sonst
// spränge der Zeiger um den Weg, den er nachhängt).

/** so langsam (CSS-Punkte je Sekunde) muss die Hand sein, damit der Zeiger des Systems den gezeichneten ablöst */
const ZEIGER_TEMPO_RUHIG = 45;
/** so viele Bilder bleibt der Zeiger des Systems noch stehen, nachdem der gezeichnete übernommen hat (dessen Bild kommt später an) */
const ZEIGER_UEBERLAPPEN = 3;
const zeigerSystem = { an: false, wert: '', ueberlappt: 0, x: 0, y: 0, tempo: 0, war: false, geraet: 'mouse' };
/** für die Proben: Das letzte Bild hat den Zeiger gezeichnet */
let zeigerGezeichnet = false;
const zeigerBilder = new Map<string, string>();

/** der Zeiger einer Art als Bild für das System (CSS `cursor`), auf hellem oder dunklem Grund; die Spitze ist der Ort des Zeigers */
function zeigerBildFuer(art: Exclude<ZeigerArt, 'ring'>, dunkel: boolean, objekt = false): string {
  const name = `${art}${dunkel ? ' dunkel' : ''}${objekt ? ' objekt' : ''}`;
  const da = zeigerBilder.get(name);
  if (da) return da;
  const L = linienWerte.zeigerGroesse;
  const linie = linienWerte.zeigerLinie;
  const umriss = zeigerUmrissVon(art, L, 0);
  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = 0;
  for (const [x, y] of umriss) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const rand = 2;
  const hx = Math.ceil(-x0) + rand;
  const hy = Math.ceil(-y0) + rand;
  const b = hx + Math.ceil(x1) + rand;
  const h = hy + Math.ceil(y1) + rand;
  const farbe = (c: readonly number[]): string => `rgb(${c.map((v) => Math.round(v * 255)).join(',')})`;
  // der Rand ist die Linienfarbe des Grunds, die Füllung bleibt: dunkel für Objekte (V), weiß für Punkte (A)
  const tinte = farbe(dunkel ? [1, 1, 1] : TINTE);
  const papier = farbe(objekt ? TINTE : [1, 1, 1]);
  const gefuellt = art !== 'schlinge';
  const bild = (s: number): string => {
    const c = document.createElement('canvas');
    c.width = b * s;
    c.height = h * s;
    const g = c.getContext('2d');
    if (!g) return '';
    g.scale(s, s);
    g.translate(hx, hy);
    g.beginPath();
    umriss.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.strokeStyle = tinte;
    if (gefuellt) {
      // wie im Bild: gefüllt mit dem Papier, der Rand innen an der Kante (so sitzt die Spitze genau auf der Stelle)
      g.fillStyle = papier;
      g.fill();
      g.clip();
      g.lineWidth = 2 * linie;
    } else g.lineWidth = linie;
    g.stroke();
    return c.toDataURL('image/png');
  };
  const eins = bild(1);
  const zwei = bild(2);
  const satz = `url("${eins}") 1x, url("${zwei}") 2x`;
  const wert =
    [`image-set(${satz}) ${hx} ${hy}, default`, `-webkit-image-set(${satz}) ${hx} ${hy}, default`, `url("${eins}") ${hx} ${hy}, default`].find(
      (k) => typeof CSS !== 'undefined' && CSS.supports('cursor', k),
    ) ?? 'default';
  zeigerBilder.set(name, wert);
  return wert;
}

/**
 * Ein Bild weiter: Zeigt das System den Zeiger, wird er aus der Szene genommen. true, solange ein Wechsel aussteht (das nächste Bild
 * muss kommen, auch wenn sonst nichts läuft).
 */
function zeigerSystemSchritt(sz: Szene, dt: number): boolean {
  const Z = zeigerSystem;
  // die Hand: wie schnell sie gerade ist (geglättet)
  const weg = Z.war && zeiger.da ? Math.hypot(zeiger.x - Z.x, zeiger.y - Z.y) : 0;
  Z.x = zeiger.x;
  Z.y = zeiger.y;
  Z.tempo += (weg / Math.max(dt, 1e-3) - Z.tempo) * Math.min(1, Math.max(dt, 1e-3) / 0.05);
  const V = zustand === 'blatt' ? blatt.verhalten : bearbeitenAn && !strichWerkzeug() ? bearbeiten : null;
  const art = zustand === 'blatt' ? 'pfeil' : zeigerArtJetzt();
  const gleitet = zustand !== 'blatt' && zeigerGestalt.gleitet;
  // nur die Maus hat einen Zeiger des Systems (ein schwebender Stift nicht)
  const moeglich = !!sz.zeiger && Z.geraet === 'mouse' && art !== 'ring' && !gleitet && (V ? V.zeigerAnDerHand : true);
  let offen = false;
  if (Z.an && !moeglich) {
    Z.an = false;
    Z.ueberlappt = ZEIGER_UEBERLAPPEN;
  } else if (!Z.an && moeglich) {
    // gleich, wenn bisher kein Zeiger zu sehen war; sonst erst, wenn die Hand fast ruht
    if (!Z.war || Z.tempo < ZEIGER_TEMPO_RUHIG) Z.an = true;
    else offen = true;
  }
  Z.war = !!sz.zeiger;
  if (Z.an) Z.ueberlappt = 0;
  else if (Z.ueberlappt > 0) {
    Z.ueberlappt--;
    offen = true;
  }
  // solange er überlappt, bleibt er, wie er war (auch wenn das Werkzeug schon ein anderes ist)
  const wert = Z.an && art !== 'ring' ? zeigerBildFuer(art, hintenBei(hintenJetzt, zeiger.x * D, zeiger.y * D) > 0.5, zustand !== 'blatt' && objektModus()) : Z.ueberlappt > 0 ? Z.wert : '';
  if (wert !== Z.wert) {
    Z.wert = wert;
    leinwandLinien.style.cursor = wert;
  }
  if (Z.an) {
    sz.zeiger = null;
    sz.zeigerUmriss = null;
  }
  return offen;
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
    // B3: mit dem Kurvennetz auf der Form treten die Zeichnungen an den Wänden zurück (sie lägen sonst über dem weißen Körper)
    const st = staerke[achse] * (1 - raumNetzDeckung);
    if (st < 0.01) continue;
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
    // ruhende Objekte: ihre Linien als feine Striche an jeder Wand
    if (ruhende.length) streckenZeichnen(ruheLinien(), legen, r * ruheBreite());
    // mit dem Werk zeichnet `werkLinien` alle Linien; hier bleibt in Front und Top der Umriss der Haut (an der Rückwand nur der der
    // ruhenden Objekte: Der des aktiven ist dort seine Linie)
    if (werkGezeigt && achse === 2 && mitteDa()) {
      if (ruhende.length) streckenZeichnen(ruheUmrisse(2), legen, r);
      continue;
    }
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
      if (ruhende.length) streckenZeichnen(ruheUmrisse(2), legen, r);
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
      let vorher: [number, number, number] | null = null;
      for (let j = 0; j <= 32; j++) {
        const q = c.clone().lerp(b, j / 32);
        const zk = q.clone().applyMatrix4(cam.matrixWorldInverse).z;
        const vorKamera = zk < -cam.near * 1.01;
        const cc = q.clone().applyMatrix4(vp);
        if (!vorKamera || Math.abs(cc.x) > 3 || Math.abs(cc.y) > 3) {
          vorher = null;
          continue;
        }
        const pp: [number, number, number] = [(cc.x * 0.5 + 0.5) * W * D, (0.5 - cc.y * 0.5) * H * D, -zk];
        // B3: mit Tiefe: Hinter dem weißen Körper (Kurvennetz im Raum) verschwinden sie, statt über ihm zu liegen
        if (vorher) K.push(vorher[0], vorher[1], pp[0], pp[1], r, r, g, 2, false, vorher[2], pp[2], 1e-4, 1e-4);
        vorher = pp;
      }
    }
  }
}

/** Linien der eingerasteten Ansicht, auf der Blase: Seite = die gezeichnete Linie mit Punkten, Front und Top = Umriss */
/** S20: liegt der weiße Körper in der Anzeige (eingerastet, auch beim Wenden)? */
/**
 * S20: ob der Körper in diesem Bild liegt und, auf einer Fahrt, wie deckend er ist (`direkt`, mit ihr verbunden): eingerastet (auch beim
 * Wenden), auf dem Weg in eine eingerastete Ansicht oder aus ihr (mit `flach`), beim Auf- und Zuklappen (mit dem Stand) und in den
 * offenen Vier Ansichten
 */
function koerperZustand(): { an: boolean; direkt: number | null } {
  const aus = { an: false, direkt: null };
  if (!KOERPER_AN || !werkGezeigt || zustand !== 'ruhe' || !werkHaut.netz || !raum || eckZug) return aus;
  const f = faltJetzt;
  if (vier < 1e-3) {
    if (einzelUebergang) return aus;
    if (blattModus()) return { an: true, direkt: null };
    const zuBlatt = !!ansichtFahrt && (ansicht !== 'raum' || (ansichtFahrt.vonAnsicht !== undefined && ansichtFahrt.vonAnsicht !== 'raum'));
    // erst im letzten Teil der Fahrt (vorher sieht die Kamera den Körper noch schräg, die Linien liegen schon auf dem Blatt)
    if (zuBlatt && flach > 0.6) return { an: true, direkt: glatt((flach - 0.6) / 0.4) };
    // B3: das Kurvennetz im Raum liegt auf dem weißen Körper
    if (raumNetzDeckung > 1e-3) return { an: true, direkt: raumNetzDeckung };
    return aus;
  }
  if (!f) return aus;
  if (f.e > 0.999 && !vierFahrt) return { an: true, direkt: null };
  return { an: true, direkt: glatt(Math.min(1, f.e / 0.35)) };
}
function koerperAn(): boolean {
  return koerperZustand().an;
}

/** B3: gilt die Ansicht „Kurvennetz“ gerade (im ruhenden Raum; auf Fahrten, in Ansichten und beim Aufklappen nicht) */
function raumNetzGilt(): boolean {
  return raumNetz && KOERPER_AN && zustand === 'ruhe' && werkGezeigt && ansicht === 'raum' && !ansichtFahrt && !vorDreh && !eckZug && vier < 1e-3 && flach < 1e-3;
}
/** B3: die Ansicht blendet weich ein und aus (0,2 s); true, solange sie sich ändert */
function raumNetzSchritt(dt: number): boolean {
  const ziel = raumNetzGilt() ? 1 : 0;
  if (raumNetzDeckung === ziel) return false;
  const d = Math.max(0, dt) / 0.2;
  raumNetzDeckung = ziel > raumNetzDeckung ? Math.min(1, raumNetzDeckung + d) : Math.max(0, raumNetzDeckung - d);
  return true;
}
/** B3: das Blatt, in dem im Raum gezogen wird: das der Achse, die dem Blick am nächsten liegt (wie beim Pinsel) */
function raumBlatt(): Flaeche['a'] {
  const blick = new Vector3();
  kam.aktiv.getWorldDirection(blick);
  const ax = Math.abs(blick.x) >= Math.abs(blick.y) && Math.abs(blick.x) >= Math.abs(blick.z) ? 0 : Math.abs(blick.y) >= Math.abs(blick.z) ? 1 : 2;
  return BLATT_DER_ACHSE[ax]!;
}

/** S20: der Körper in diesem Bild: auf Fahrten mit ihnen verbunden; kommt er sonst neu (eine Ansicht ruht schon), blendet er weich ein */
function koerperSchritt(dt: number): boolean {
  const z = koerperZustand();
  if (!z.an) {
    koerperDeckung = 0;
    return false;
  }
  if (z.direkt !== null) {
    koerperDeckung = z.direkt;
    return false;
  }
  if (koerperDeckung >= 1) return false;
  koerperDeckung = Math.min(1, koerperDeckung + dt / 0.25);
  return true;
}

/**
 * S20: beim Auf- und Zuklappen der Körper auf einer Wand, die sich aufklappt: dieselbe Abbildung wie ihre Zeichnung (`faltPunkt`, für
 * einen Ort ohne seine Tiefe längs der Achse affin), mit der Kamera des Aufklappens; Tiefe wie im Feld, nur im Viereck der Wand
 */
function wandAnsicht(n: FeldAchse, f: Falt, rand: number[]): { projektion: Float32Array; ansicht: Float32Array; schere: [number, number, number, number]; tiefeMax: number; rand: number[] } {
  const q0 = faltPunkt(n, new Vector3(0, 0, 0), f);
  const qx = faltPunkt(n, new Vector3(1, 0, 0), f).sub(q0);
  const qy = faltPunkt(n, new Vector3(0, 1, 0), f).sub(q0);
  const qz = faltPunkt(n, new Vector3(0, 0, 1), f).sub(q0);
  const A = new Matrix4().set(qx.x, qy.x, qz.x, q0.x, qx.y, qy.y, qz.y, q0.y, qx.z, qy.z, qz.z, q0.z, 0, 0, 0, 1);
  const P = new Matrix4().multiplyMatrices(f.vp, A);
  const feld = feldAnsicht(n, f);
  return { projektion: Float32Array.from(P.elements), ansicht: feld.ansicht, schere: [0, 0, Math.round(W * D), Math.round(H * D)], tiefeMax: feld.tiefeMax, rand };
}

/**
 * S20: Projektion und Ansicht eines flachen Felds der Vier Ansichten für den Körper (Spalten wie WebGL): genau `imFeld` (mit Zoom,
 * Verschiebung, Wenden), die Tiefe von der Seite, von der das Feld geschaut wird (`tiefeVon`), dazu sein Rechteck
 */
const FELD_TIEFE = 4;
function feldAnsicht(n: FeldAchse, f: Falt): { projektion: Float32Array; ansicht: Float32Array; schere: [number, number, number, number]; tiefeMax: number } {
  const e = raum!;
  const r = f.F[n];
  // B2: aus der einen Abbildung des Felds (gewendet: räumlich gedreht)
  const A = feldAbbildung(n, f.F, f.s4);
  const kx = (2 * A.sz) / W;
  const ky = (2 * A.sz) / H;
  const Z0 = FELD_TIEFE * e.L;
  // NDC: x = 2 · (mx + sz · r · (p − m)) / W − 1, y = 1 − 2 · (my − sz · o · (p − m)) / H; nach hinten wächst z
  const P = new Matrix4().set(
    kx * A.r.x, kx * A.r.y, kx * A.r.z, (2 * A.mx) / W - 1 - kx * A.r.dot(A.m),
    ky * A.o.x, ky * A.o.y, ky * A.o.z, 1 - (2 * A.my) / H - ky * A.o.dot(A.m),
    -A.v.x / Z0, -A.v.y / Z0, -A.v.z / Z0, A.v.dot(A.m) / Z0,
    0, 0, 0, 1,
  );
  // die Ansicht: rechts, oben, zum Betrachter; die Tiefe zum Betrachter ist Z0 − v · (p − m)
  const V = new Matrix4().set(
    A.r.x, A.r.y, A.r.z, -A.r.dot(A.m),
    A.o.x, A.o.y, A.o.z, -A.o.dot(A.m),
    A.v.x, A.v.y, A.v.z, -A.v.dot(A.m) - Z0,
    0, 0, 0, 1,
  );
  return {
    projektion: Float32Array.from(P.elements),
    ansicht: Float32Array.from(V.elements),
    schere: [Math.round(r.x * D), Math.round((H - r.y - r.h) * D), Math.round(r.w * D), Math.round(r.h * D)],
    tiefeMax: 2 * Z0,
  };
}

/** S20: die Tiefe eines Orts des Werks zum Betrachter eines Felds (wie `feldAnsicht` sie in die Anzeige schreibt) */
function tiefeImFeld(A: FeldAbbildung): (p: { x: number; y: number; z: number }) => number {
  const Z0 = FELD_TIEFE * raum!.L;
  const f = werkHaut.f;
  const mx = werkHaut.mitte.x - A.m.x;
  const my = werkHaut.mitte.y - A.m.y;
  const { x: vx, y: vy, z: vz } = A.v;
  return (p) => Z0 - (vx * (p.x / f + mx) + vy * (p.y / f + my) + vz * (p.z / f - A.m.z));
}

/** S20: Umlaufsinn der Dreiecke der glatten Haut von außen (an der Normale ihrer ersten Dreiecke gemessen) */
function wicklungVon(N: { pos: Float32Array; normal: Float32Array; index: Uint32Array }): number {
  let summe = 0;
  for (let t = 0; t < Math.min(N.index.length / 3, 200); t++) {
    const [a, b, c] = [N.index[3 * t]!, N.index[3 * t + 1]!, N.index[3 * t + 2]!];
    const ux = N.pos[3 * b]! - N.pos[3 * a]!;
    const uy = N.pos[3 * b + 1]! - N.pos[3 * a + 1]!;
    const uz = N.pos[3 * b + 2]! - N.pos[3 * a + 2]!;
    const vx = N.pos[3 * c]! - N.pos[3 * a]!;
    const vy = N.pos[3 * c + 1]! - N.pos[3 * a + 1]!;
    const vz = N.pos[3 * c + 2]! - N.pos[3 * a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    summe += nx * N.normal[3 * a]! + ny * N.normal[3 * a + 1]! + nz * N.normal[3 * a + 2]!;
  }
  return summe >= 0 ? 1 : -1;
}

/** S20: der weiße Körper für die Anzeige (die glatte Haut des Werks), eingerastet mit der Kamera; sonst null */
function linienKoerper(): LinienKoerper | null {
  if (!koerperAn() || koerperDeckung <= 0.001) return null;
  const N = zeigeNetzAlle()!;
  if (N !== koerperNetz) {
    koerperNetz = N;
    koerperNr++;
    koerperWicklung = wicklungVon(N);
  }
  const neu = werkHaut.version !== koerperVersion;
  koerperVersion = werkHaut.version;
  const c = kam.aktiv;
  const f = faltJetzt;
  return {
    pos: N.pos,
    normal: N.normal,
    index: N.index,
    projektion: Float32Array.from(new Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse).elements),
    ansicht: Float32Array.from(c.matrixWorldInverse.elements),
    // in den Vier Ansichten je flaches Feld mit seiner Abbildung, eingerastet die Kamera; immer mit eigener Tiefe (für die Hülle)
    ansichten:
      vier >= 0.999 && f
        ? (['seite', 'front', 'top'] as const).map((n) => feldAnsicht(n, f))
        : vier > 1e-3 && f
        ? (['seite', 'front', 'top'] as const).map((n, i) => wandAnsicht(n, f, bereicheJetzt.slice(12 * i, 12 * i + 12)))
        : [
            {
              projektion: Float32Array.from(new Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse).elements),
              ansicht: Float32Array.from(c.matrixWorldInverse.elements),
              schere: [0, 0, Math.round(W * D), Math.round(H * D)],
              tiefeMax: kam.abstand + 4 * raum!.L,
            },
          ],
    huelleTiefe: raum!.R * HUELLE_TIEFE,
    schattierung: 0,
    umriss: linienWerte.umriss * D,
    geaendert: neu,
    netz: koerperNr,
    wicklung: koerperWicklung,
    durchsichtig: true,
    deckung: koerperDeckung,
    toenung: feldToenungJetzt(N.index),
  };
}

/** C4: die getönten Dreiecke der gewählten Felder für den Körper der Anzeige (null: nichts gewählt) */
function feldToenungJetzt(index: Uint32Array): NonNullable<LinienKoerper['toenung']> | null {
  const ix = werkFelder.anzeigeIndex(index, werkHaut.stufen);
  if (ix !== feldToenung.index) feldToenung = { index: ix, nr: feldToenung.nr + 1 };
  return ix ? { index: ix, nr: feldToenung.nr, farbe: GRUEN, deckung: FELD_DECKUNG } : null;
}

/**
 * C4: das Feld der Haut unter dem Zeiger. Nur, wo der weiße Körper liegt und die Fläche längs ihrer Achse gesehen wird (eingerastet,
 * Feld der Vier Ansichten); nicht in der Pose, nicht im Zug.
 */
function feldTreffen(x: number, y: number): { fl: number; t: FeldTreffer } | null {
  if (!werkGezeigt || !bearbeitenAn || werk.zug || werk.grund) return null;
  const fl = werkBlatt.flaecheUnter(x, y);
  const F = werkBlatt.flaechen[fl];
  if (!F || F.raeumlich || !F.tiefe) return null;
  const XY = F.her(x, y);
  if (!XY) return null;
  const t = werkFelder.treffer(F.a, XY[0], XY[1], F.vorn ?? 1);
  return t ? { fl, t } : null;
}

/** C4: ein Klick auf ein Feld: Es wird gewählt (mit `dazu`: zur Auswahl dazu, ein gewähltes wieder weg) */
function feldKlick(tri: number, dazu: boolean): void {
  const r = werkFelder.waehlen(tri, dazu);
  werk.G.meldung = r === 'leer' ? 'Dieses Feld hat keinen Punkt auf seinem Rand: nichts zu greifen' : r === 'gewaehlt' ? 'Feld gewählt · ziehen bewegt es · G verschieben, S skalieren, R drehen · ⇧ + Klick: weitere Felder' : '';
  werkNeu = true;
}

/** C4: ⇧ + Klick (ohne Weg) an der Stelle: das Feld dort zur Auswahl dazu oder wieder weg; zurück: ob dort ein Feld lag */
function feldUmschalten(x: number, y: number, zeit: number): boolean {
  if (raumWerkzeug !== 'auswahl' || bearbeiten.stift) return false;
  const f = feldTreffen(x, y);
  if (!f) return false;
  feldKlick(f.t.tri, true);
  feldUmgeschaltet = { zeit, x, y };
  return true;
}

/** C4: G, S oder R: die Auswahl des Werks verschieben, skalieren oder drehen (wie im Prüffenster), geführt vom Zeiger */
function tastenZugBeginnen(k: 'g' | 's' | 'r'): boolean {
  if (!werkGezeigt || !bearbeitenAn || werk.zug || tastenZug || feldDruck || bearbeitenGedrueckt || pinselZug || bearbeiten.stift || strichWerkzeug() || raumWerkzeug === 'lasso') return false;
  const mitte = werk.auswahlMitte();
  if (!mitte || !zeiger.da) {
    werk.G.meldung = 'G, S, R: erst Punkte, eine Linie oder ein Feld wählen';
    return true;
  }
  // die Fläche unter dem Zeiger (Ansicht, Feld, Wand); sonst die Ebene durch die Mitte der Auswahl, die der Kamera am meisten zugewandt ist
  let F: Flaeche | null = werkBlatt.flaechen[werkBlatt.flaecheUnter(zeiger.x, zeiger.y)] ?? null;
  let T: number | undefined;
  if (F) T = F.raeumlich ? (F.a === 'seite' ? mitte.z : F.a === 'front' ? mitte.x : mitte.y) : undefined;
  else {
    const blick = new Vector3();
    kam.aktiv.getWorldDirection(blick);
    const ax = Math.abs(blick.x) >= Math.abs(blick.y) && Math.abs(blick.x) >= Math.abs(blick.z) ? 0 : Math.abs(blick.y) >= Math.abs(blick.z) ? 1 : 2;
    const w = werkInWelt(mitte);
    F = ebene(BLATT_DER_ACHSE[ax]!, ax === 0 ? w.x : ax === 1 ? w.y : w.z, vpJetzt(), 1, 1, false);
  }
  const XY = F.her(zeiger.x, zeiger.y, T);
  if (!XY) return false;
  werk.G.maus = { a: F.a, X: XY[0], Y: XY[1] };
  if (!werk.zugStarten(k, F.a, XY[0], XY[1], false)) return true;
  tastenZug = { F, T };
  werk.G.meldung = `${k === 'g' ? 'G: verschieben' : k === 's' ? 'S: skalieren' : 'R: drehen'} · X, Y, Z: nur längs dieser Achse · Klick oder ↩: fertig · Esc: zurück`;
  werkNeu = true;
  return true;
}

function tastenZugBewegen(x: number, y: number): void {
  const z = tastenZug;
  const XY = z?.F.her(x, y, z.T);
  if (!z || !XY) return;
  werk.G.maus = { a: z.F.a, X: XY[0], Y: XY[1] };
  if (werk.zug && werk.zug.modal) werk.zugBewegen(XY[0], XY[1]);
}

function tastenZugEnde(ok: boolean): void {
  if (!tastenZug) return;
  tastenZug = null;
  if (werk.zug && werk.zug.modal) werk.zugEnde(ok);
  werk.G.meldung = '';
  werkNeu = true;
}

/** S20: die Tiefe eines Orts des Werks zum Betrachter der Kamera (wie der Körper sie in die Anzeige schreibt) */
function tiefeDerKamera(): (p: { x: number; y: number; z: number }) => number {
  const m = kam.aktiv.matrixWorldInverse.elements;
  const f = werkHaut.f;
  const mx = werkHaut.mitte.x;
  const my = werkHaut.mitte.y;
  return (p) => {
    const x = p.x / f + mx;
    const y = p.y / f + my;
    const z = p.z / f;
    return -(m[2]! * x + m[6]! * y + m[10]! * z + m[14]!);
  };
}

function linienDerAnsicht(vp: Matrix4): void {
  const blick = new Vector3();
  kam.aktiv.getWorldDirection(blick);
  const achse = ansicht === 'seite' ? new Vector3(0, 0, -1) : ansicht === 'front' ? new Vector3(1, 0, 0) : new Vector3(0, -1, 0);
  const t = wendenSicht ? 1 : Math.min(1, Math.max(0, (Math.abs(blick.dot(achse)) - 0.97) / 0.025));
  const s = flach * flach * t * t * (3 - 2 * t);
  if (s < 0.01) return;
  // ruhende Objekte: ihre Linien als feine Striche (ihren Umriss zeichnet die Hülle des weißen Körpers)
  if (ruhende.length)
    streckenZeichnen(
      ruheLinien(),
      (x, y, z) => {
        const [a, b] = projizieren(new Vector3(x, y, z), vp);
        return [a, b];
      },
      (linienWerte.innen / 2) * D * s,
    );
  if (werkGezeigt && ansicht === 'seite' && mitteDa()) return;
  // S20: mit dem Körper zeichnet die Hülle den Umriss (der alte blendet dabei aus)
  const r0 = (linienWerte.umriss / 2) * D * s * (1 - koerperDeckung);
  if (r0 < 0.01) return;
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
    // ruhende Objekte: ihre Linien als feine Striche in jedem Feld
    if (ruhende.length) {
      K.bereich = BEREICH_VON[n];
      streckenZeichnen(ruheLinien(), (x, y, z) => mischen(n, new Vector3(x, y, z)), (linienWerte.innen / 2) * D * breite(n === 'front' ? 0 : n === 'top' ? 1 : 2, false));
      K.bereich = 0;
    }
    if (werkGezeigt && n === 'seite' && mitteDa()) continue;
    // S17: was zu diesem Feld gehört, wird an seinem Rand abgeschnitten
    K.bereich = BEREICH_VON[n];
    const achse = n === 'front' ? 0 : n === 'top' ? 1 : 2;
    // S20: mit dem Körper zeichnet die Hülle den Umriss (der alte blendet dabei aus)
    const rl = r0 * breite(achse, false) * (1 - koerperDeckung);
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
      const seg = umrissJetzt(achse);
      const g = K.neueGruppe();
      for (let i = 0; i < seg.length; i += 6) {
        const [ax, ay] = mischen(n, new Vector3(seg[i]!, seg[i + 1]!, seg[i + 2]!));
        const [bx, by] = mischen(n, new Vector3(seg[i + 3]!, seg[i + 4]!, seg[i + 5]!));
        K.push(ax, ay, bx, by, rl, rl, g, 0, false);
      }
    }
  }
  K.bereich = 0;
  // Teiler: zwei Haarlinien, an der Kreuzung ein Tropfen (schwillt beim Anflug, ist beim Ziehen ein Tropfen). S10: beim Auffalten liegen
  // sie auf den Kanten der Wände und gleiten mit ihnen (nichts doppelt)
  const rh = (linienWerte.innen / 2) * D * v;
  const anflug = teiler.zug ? 1 : teiler.ueber;
  const tropfen = linienWerte.punktRadius * D * (1 + (linienWerte.tropfen - 1) * anflug) * v;
  if (v <= 0.999) {
    const [kx, ky] = faltKanten(f, werte.kanten * Math.min(st0[0], st0[1], st0[2]) * raumSicht(), rh);
    K.punkt(kx, ky, tropfen);
    kreuzBild = [kx / D, ky / D];
    return;
  }
  kreuzBild = [F.tx, F.ty];
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

/**
 * eine Ebene quer zur Achse des Blatts (Wand oder eingerastete Ansicht), wie die Kamera sie sieht; `wand`: nur ihr Viereck zählt.
 * `raeumlich` (B2): Die Kamera schaut nicht längs der Achse (die Ansicht wendet sich): Die Linien liegen an ihrem Ort im Raum, nicht in
 * der Ebene (dort drehten sie sich wie ein flaches Blatt im Körper).
 */
function ebene(a: Flaeche['a'], lage: number, vp: Matrix4, staerke: number, breite: number, wand: boolean, raeumlich = false): Flaeche {
  const achse = ACHSE_VON[a];
  const e = raum!;
  // Tiefe im Werk (längs der Achse) → Welt
  const tf = 1 / werkHaut.f;
  const t0 = a === 'seite' ? 0 : a === 'front' ? werkHaut.mitte.x : werkHaut.mitte.y;
  const her = (x: number, y: number, T?: number): [number, number] | null => {
    const { o, d } = kam.strahl(x, y, W, H);
    const dd = achse === 0 ? d.x : achse === 1 ? d.y : d.z;
    const oo = achse === 0 ? o.x : achse === 1 ? o.y : o.z;
    if (Math.abs(dd) < 1e-9) return null;
    // räumlich: in der Ebene der Tiefe des gegriffenen Orts (er bleibt unter dem Zeiger)
    const ebeneBei = raeumlich && T !== undefined ? T * tf + t0 : lage;
    return weltInBlatt(a, o.clone().addScaledVector(d, (ebeneBei - oo) / dd));
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
    hin: (X, Y, T) => {
      const [x, y] = projizieren(blattInWelt(a, X, Y, raeumlich && T !== undefined ? T * tf + t0 : lage), vp);
      return [x / D, y / D];
    },
    her,
    ...(raeumlich ? { raeumlich: true } : {}),
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
  // B2: die eine Abbildung des Felds, einmal je Bild; `hin` rechnet damit ohne Zwischenobjekte (es läuft für jede Probe jeder Linie).
  // Blatt → Welt, von der Mitte der Form aus: Seite (X, −Y, T), Front (T, −Y, X), Top (X, T, Y), je durch das Maß des Werks
  const A = feldAbbildung(n, F, s4);
  const wf = 1 / werkHaut.f;
  const ox = werkHaut.mitte.x - A.m.x;
  const oy = werkHaut.mitte.y - A.m.y;
  const { x: rx, y: ry, z: rz } = A.r;
  const { x: qx, y: qy, z: qz } = A.o;
  const raeumlich = t > 0.999 && Math.abs(Math.sin(feldWende[n].phi)) > 1e-4;
  return {
    a: n,
    staerke: st + (1 - st) * t,
    breite: bw.wandLinien + (1 - bw.wandLinien) * t,
    // S7: ein Feld ist seine Wand, aufgeklappt: Betrachter auf der anderen Seite
    // S17b: gewendet schaut der Betrachter von der anderen Seite
    vorn: (Math.cos(feldWende[n].phi) >= 0 ? 1 : -1) * (-sw[achse] || 1),
    bereich: BEREICH_VON[n],
    // S20: mit dem Körper entscheidet die Anzeige je Bildpunkt, was verdeckt ist
    ...(koerperAn() && koerperDeckung > 0.001 ? { tiefe: tiefeImFeld(A) } : {}),
    ...(raeumlich ? { raeumlich: true } : {}),
    enthaelt: (x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
    hin: (X, Y, T) => {
      if (t > 0.999) {
        // ohne Tiefe: in der Ebene durch die Mitte der Form
        let dx: number;
        let dy: number;
        let dz: number;
        if (n === 'seite') {
          dx = X * wf + ox;
          dy = -Y * wf + oy;
          dz = T === undefined ? 0 : T * wf - A.m.z;
        } else if (n === 'front') {
          dx = T === undefined ? 0 : T * wf + ox;
          dy = -Y * wf + oy;
          dz = X * wf - A.m.z;
        } else {
          dx = X * wf + ox;
          dy = T === undefined ? 0 : T * wf + oy;
          dz = Y * wf - A.m.z;
        }
        return [A.mx + A.sz * (rx * dx + ry * dy + rz * dz), A.my - A.sz * (qx * dx + qy * dy + qz * dz)];
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
  const { s, staerke: staerkeWand } = waendeJetzt(m);
  // B3: mit dem Kurvennetz auf der Form treten die Zeichnungen an den Wänden zurück (die Wände selbst bleiben)
  const staerke = staerkeWand.map((v) => v * (1 - raumNetzDeckung)) as [number, number, number];
  const blatt = blattModus();
  const achsen = blatt ? new Set<number>() : blattAchsen();
  const pb = glatt(flach);
  const g6 = wandGewichte();
  for (const achse of [0, 1, 2] as const) {
    const wandLage = [e.cx, e.cy, 0][achse]! + s[achse] * e.L;
    if (achsen.has(achse)) {
      const mitteLage = [e.cx, e.cy, 0][achse]!;
      const st = Math.max(staerke[achse], Math.max(g6[2 * achse]!, g6[2 * achse + 1]!) * flach * flach);
      if (st >= 0.01) {
        const fl = ebene(BLATT_DER_ACHSE[achse]!, wandLage + (mitteLage - wandLage) * pb, vp, st, bw.wandLinien + (1 - bw.wandLinien) * pb, pb < 0.5);
        // S20: auf dem Weg in die eingerastete Ansicht und aus ihr entscheidet mit dem Körper die Anzeige, was verdeckt ist
        if (koerperAn() && koerperDeckung > 0.001) fl.tiefe = tiefeDerKamera();
        liste.push(fl);
      }
      continue;
    }
    if (staerke[achse] < 0.01) continue;
    liste.push(ebene(BLATT_DER_ACHSE[achse]!, wandLage, vp, staerke[achse], bw.wandLinien, true));
  }
  // B3: das Kurvennetz auf der Form im Raum: eine räumliche Fläche (jede Linie an ihrem Ort, beide Hälften), gezogen wird im Blatt der
  // Achse, die dem Blick am nächsten liegt. Gezeichnet wird mit P hier noch nicht (`enthaelt`)
  if (raumNetzDeckung > 0.01 && vier < 1e-3) {
    const a = raumBlatt();
    const fl = ebene(a, a === 'seite' ? 0 : a === 'front' ? e.cx : e.cy, vp, raumNetzDeckung, 1, false, true);
    fl.tiefe = tiefeDerKamera();
    fl.enthaelt = () => false;
    liste.push(fl);
  }
  // eingerastet (wie `linienDerAnsicht`): auf der Ebene durch die Mitte der Form
  if (blatt && ansicht !== 'raum' && !einzelUebergang) {
    const blick = new Vector3();
    kam.aktiv.getWorldDirection(blick);
    const t = wendenSicht ? 1 : Math.min(1, Math.max(0, (Math.abs(blick.dot(VORN[ansicht])) - 0.97) / 0.025));
    const st = flach * flach * t * t * (3 - 2 * t);
    if (st >= 0.01) {
      // B2: Schaut die Kamera nicht längs der Achse (die Ansicht wendet sich), liegen die Linien an ihrem Ort im Raum
      const schief = Math.abs(blick.dot(VORN[ansicht])) < 1 - 1e-7;
      const fl = ebene(ansicht, ansicht === 'seite' ? 0 : ansicht === 'front' ? e.cx : e.cy, vp, st, 1, false, schief);
      // S20: mit dem Körper entscheidet die Anzeige je Bildpunkt, was verdeckt ist
      if (koerperAn() && koerperDeckung > 0.001) fl.tiefe = tiefeDerKamera();
      liste.push(fl);
    }
  }
  // die drei flachen Felder (S10: beim Auffalten von Anfang an, sie zeigen dann die Zeichnungen der Wände)
  if (faltJetzt) {
    const st0 = waendeJetzt(m, true).staerke;
    for (const n of ['seite', 'front', 'top'] as const) liste.push(feldFlaeche(n, faltJetzt, st0));
  }
  const ruhig = zustand === 'ruhe' && !ansichtFahrt && !vierFahrt && !eckZug;
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
  // (mit V, im Objekt-Modus, bedient das Verhalten die Linien nicht: Sie stehen still, ohne Punkte)
  bearbeitenAn = stabil && !objektModus();
  // P in der Leiste, sobald das Werk bedient wird
  if (stabil !== pErlaubt) {
    pErlaubt = stabil;
    for (const n of ['lasso', 'objekt'] as const) leiste.erlauben(n, pErlaubt);
    zeichnenErlaubt = null;
    // im Raum zeigt die Leiste das Werkzeug des Raums (anfangs die Auswahl, kein Tropfen), nicht das des Blatts
    if (pErlaubt) leiste.setzen(raumWerkzeug);
  }
  // (P, Freihand und Formen, sobald das Werk bedient wird: auch an einer freien Form, dort entsteht jede Linie für sich)
  if (pErlaubt !== zeichnenErlaubt) {
    zeichnenErlaubt = pErlaubt;
    for (const n of ['p', 'frei', 'formen'] as const) leiste.erlauben(n, pErlaubt);
  }
  if (!bearbeitenAn && bearbeitenGedrueckt) {
    bearbeiten.loslassen();
    bearbeitenGedrueckt = false;
  }
  // Linien ohne Pfad (noch keine Griffe): nur zu sehen
  for (const r of werkBlatt.roh) {
    const F = flaechen[r.fl]!;
    K.bereich = F.bereich ?? 0;
    K.zug(
      r.x.map((v) => v * D),
      r.y.map((v) => v * D),
      (linienWerte.innen / 2) * D * F.breite * F.staerke,
      false,
    );
    K.bereich = 0;
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
    // S13 (4): Tropfen, die zu neuen Kreuzungen fließen und dort verschmelzen
    for (const t of werkBlatt.verschmelzenTropfen(linienWerte.punktRadius * linienWerte.tropfen)) K.punkt(t.x * D, t.y * D, t.r * D);
    ordnungslinien();
    const licht = lichtringZeichnen();
    // mit Freihand und Formen ist es Ozzys Zeiger (das Verhalten hat dann keinen)
    return { zeiger: strichWerkzeug() ? (zeiger.da ? zeigerForm(zeiger.x, zeiger.y) : null) : sz.zeiger, aktiv: aktiv || licht };
  }
  for (const P of werkBlatt.proben) {
    const g = K.neueGruppe();
    for (let j = 0; j + 1 < P.n; j++) K.push(P.x[j]! * D, P.y[j]! * D, P.x[j + 1]! * D, P.y[j + 1]! * D, P.halb[j]! * D, P.halb[j + 1]! * D, g, 0, false);
  }
  werkBlatt.netz.punkte.forEach((p, pi) => {
    const A = werkBlatt.anker[pi]!;
    const F = flaechen[A.fl]!;
    if (A.zuSehen && !objektModus()) K.punkt(p.x * D, p.y * D, linienWerte.punktRadius * D * Math.min(1, F.staerke));
  });
  return { zeiger: undefined, aktiv: werkBlatt.fliesst };
}

/**
 * S13 (liquid drop, Idee 9): Ordnungslinien als feine Fäden, solange Punkte gezogen werden. In den Vier Ansichten von der Seite zur Front
 * (waagrecht) und zum Top (senkrecht), wie in einer technischen Zeichnung; im Raum vom Punkt zu seinem Bild auf jeder Wand. Grün und fein
 * wie Verdecktes, so sind sie keine Linien der Form.
 */
function ordnungslinien(): void {
  const z = werk.zug;
  if (!z || z.griff || zustand !== 'ruhe') return;
  const gewaehlt = werk.G.auswahl.filter((w) => w.i >= 0).slice(0, 12);
  if (!gewaehlt.length) return;
  const imRaum = vier < 0.5 && ansicht === 'raum' && flach < 0.1;
  if (vier < 0.5 && !imRaum) return;
  const r = (linienWerte.innen / 2) * D * 0.8;
  const g = K.neueGruppe();
  const vp = vpJetzt();
  for (const w of gewaehlt) {
    // die Bilder des Punkts auf den Flächen (ohne Spiegelbild), je Blatt
    const orte = new Map<Flaeche['a'], { x: number; y: number }>();
    werkBlatt.anker.forEach((A, pi) => {
      if (A.m || !A.werk.some((q) => q.id === w.l && q.i === w.i)) return;
      const F = werkBlatt.flaechen[A.fl];
      const p = werkBlatt.netz.punkte[pi];
      if (F && p && !orte.has(F.a)) orte.set(F.a, { x: p.x, y: p.y });
    });
    if (!imRaum) {
      const s = orte.get('seite');
      for (const a of ['front', 'top'] as const) {
        const o = orte.get(a);
        if (s && o) K.push(s.x * D, s.y * D, o.x * D, o.y * D, r, r, g, 1, false);
      }
      continue;
    }
    // im Raum: vom Punkt auf der Haut (wie er gerade gezogen wird) zu jeder Wand
    const q = werk.alsAnzeige(() => {
      const p = werk.loops[werk.loopNr(w.l)]?.punkte[w.i];
      return p ? { ...(werk.zug && !werk.zug.griff ? p.cur : p.ref) } : null;
    });
    if (!q) continue;
    const [px, py] = projizieren(werkInWelt(q), vp);
    for (const o of orte.values()) K.push(px, py, o.x * D, o.y * D, r, r, g, 1, false);
  }
}

/**
 * S15, Lichtring: wo der Loop rundum laufen wird, den ↩ aus der Geraden mit P anlegt: auf allen Flächen fein und grün (Wände, Felder, die
 * eingerastete Ebene), im Raum auch auf der Blase, und ein Tropfen läuft auf ihm herum. Zurück: ob er zu sehen ist (dann braucht er Bilder).
 */
function lichtringZeichnen(): boolean {
  const ring = werkBlatt.lichtring();
  if (!ring) return false;
  const n = ring.pos.length / 3;
  // kräftiger als Verdecktes (ein Licht, kein Schatten), aber feiner als eine Linie der Form
  const r = (linienWerte.innen / 2) * D * 3;
  const lauf = (uhr * 0.55) % 1;
  const zeichnen = (abb: (p: { x: number; y: number; z: number }) => [number, number]): void => {
    for (const sp of ring.spiegeln ? [false, true] : [false]) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i < n; i++) {
        const [x, y] = abb({ x: ring.pos[3 * i]!, y: ring.pos[3 * i + 1]!, z: (sp ? -1 : 1) * ring.pos[3 * i + 2]! });
        xs.push(x);
        ys.push(y);
      }
      K.zug(xs, ys, r, ring.zu, 1);
      // der Tropfen, der auf dem Ring herumläuft (auf dem Spiegelbild gegenläufig: so läuft er einmal rundum)
      const m = ring.zu ? n : n - 1;
      const t = (sp ? 1 - lauf : lauf) * m;
      const i0 = Math.floor(t) % n;
      const i1 = (i0 + 1) % n;
      const f = t - Math.floor(t);
      K.punkt(xs[i0]! + (xs[i1]! - xs[i0]!) * f, ys[i0]! + (ys[i1]! - ys[i0]!) * f, linienWerte.punktRadius * D * 1.2);
    }
  };
  for (const F of werkBlatt.flaechen)
    zeichnen((p) => {
      const [x, y] = F.hin(...werk.imBlatt(F.a, p));
      return [x * D, y * D];
    });
  // im Raum (und im Feld des Raums) auch auf der Blase
  if (ansicht === 'raum' && flach < 0.1) {
    const vp = vpJetzt();
    zeichnen((p) => {
      const [x, y] = projizieren(werkInWelt(p), vp);
      return [x, y];
    });
  }
  return true;
}

// ---------- Pinsel an der Blase (Phase 6) ----------

/** Werk → Welt (in der Pose: so, wie gezeigt) */
const werkInWelt = (q: { x: number; y: number; z: number }): Vector3 => new Vector3(q.x / werkHaut.f + werkHaut.mitte.x, q.y / werkHaut.f + werkHaut.mitte.y, q.z / werkHaut.f);

/** der Strahl unter dem Zeiger trifft die Haut des Werks (wie sie zu sehen ist): Ort in Welt und Werk, oder null */
function werkHautTreffen(x: number, y: number, gespiegelt = false): { welt: Vector3; werk: { x: number; y: number; z: number } } | null {
  const { o, d } = kam.strahl(x, y, W, H);
  // `gespiegelt`: gegen das Spiegelbild der Haut (der Strahl an der Ebene z = 0 gespiegelt; der Treffer liegt dann auf der Haut selbst)
  if (gespiegelt) {
    o.z = -o.z;
    d.z = -d.z;
  }
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

/** A4: die Lage der Zeichenfläche im Fenster, gemerkt (neu nach jeder Größenänderung), statt sie bei jedem Mausereignis zu erfragen */
let leinwandRand: { left: number; top: number } | null = null;
function lageIm(e: PointerEvent | WheelEvent): [number, number] {
  if (!leinwandRand) {
    const r = leinwandLinien.getBoundingClientRect();
    leinwandRand = { left: r.left, top: r.top };
  }
  return [e.clientX - leinwandRand.left, e.clientY - leinwandRand.top];
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
function kanteMitHeim(heim: Vector3, vp: Matrix4, c: Camera = kam.aktiv): number[] {
  const e = raum!;
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

/**
 * die Rückseite in diesem Bild: die Kante gegen „vorn“ (eingerastet die Ansicht, im Raum die Hausansicht, bei Fahrten gedreht). S16: Beim
 * Auf- und Zuklappen mit der Kamera des Aufklappens, „vorn“ dreht dabei von der Hausansicht zur Seite: Die Kante wandert aus dem Bild.
 */
function hintenRechnen(): Hinten | null {
  const e = raum;
  const f = faltJetzt;
  if (!e || zustand === 'blatt') return null;
  if (vier > 1e-3 && (!f || f.e > 0.999)) return vier > 0.999 ? feldHinten() : null;
  const k = f ? kanteMitHeim(kugelMitte(heimJetzt(), VORN.seite, f.e), f.vp, kamFalt.aktiv) : kanteMitHeim(heimJetzt(), vpJetzt());
  const h: Hinten = { kanten: [...k, 0, 0, 1e6, 0, 0, 1e6, 0, 0, 1e6, 0, 0, 1e6], zahl: 1 };
  // nur, wenn sie ins Bild reicht (eine Halbebene: dann an einer Ecke)
  const wd = W * D;
  const hd = H * D;
  return Math.max(hintenBei(h, 0, 0), hintenBei(h, wd, 0), hintenBei(h, 0, hd), hintenBei(h, wd, hd)) > 0 ? h : null;
}

/**
 * S17b: die Rückseite gewendeter Felder: je Feld sein Rahmen und die Kante wie in der Vollansicht (`kanteMitHeim`), quer zur Drehrichtung im
 * Abstand A · cos · 1,5 · Halbmesser / sin von der Mitte der Zeichnung; ganz gewendet ist das ganze Feld dunkel
 */
function feldHinten(): Hinten | null {
  const f = faltJetzt;
  if (!raum || !f) return null;
  const kanten: number[] = [];
  let zahl = 0;
  for (const n of ['seite', 'front', 'top'] as const) {
    const phi = feldWende[n].phi;
    const c = Math.cos(phi);
    const sn = Math.sin(phi);
    if (Math.abs(sn) < 1e-4 && c > 0) continue;
    const r = f.F[n];
    kanten.push(1, 0, -r.x * D, -1, 0, (r.x + r.w) * D, 0, 1, -r.y * D, 0, -1, (r.y + r.h) * D);
    const b = blickIn(n, f.F, f.s4);
    const mx = (r.x + r.w / 2 + b.x) * D;
    const my = (r.y + r.h / 2 + b.y) * D;
    const ax = n === 'top' ? 0 : 1;
    const ay = n === 'top' ? 1 : 0;
    if (Math.abs(sn) < 1e-4) kanten.push(0, 0, 1e6);
    else {
      const d = Math.min(1e7, (KANTE_A * c * 1.5 * raum.R * f.s4 * b.zoom * D) / Math.abs(sn));
      const sg = Math.sign(sn);
      kanten.push(sg * ax, sg * ay, -sg * (ax * mx + ay * my) - d);
    }
    zahl++;
  }
  return zahl ? { kanten, zahl } : null;
}

/** S17b: ein Feld fährt zum Winkel `ziel` (ein Vielfaches von π), so lang wie eine Fahrt in eine Ansicht je halbe Drehung */
function feldWendenFahrt(n: 'seite' | 'front' | 'top', ziel: number): void {
  const w = feldWende[n];
  const winkel = Math.abs(ziel - w.phi);
  if (winkel < 1e-4) {
    w.phi = ziel;
    w.fahrt = null;
    return;
  }
  w.fahrt = { von: w.phi, nach: ziel, t: 0, dauer: Math.max(0.15, (bw.fahrt * winkel) / Math.PI) };
}

/** S17b: ist ein Feld gewendet (oder dreht es gerade)? */
function feldGewendet(): boolean {
  return Object.values(feldWende).some((w) => w.fahrt !== null || Math.cos(w.phi) < 0.9999);
}

/** das Blatt, das sich beim Einrasten durch die Blase schiebt (beim Lösen zurück): von hinter der Form bis vor sie, mit `flach` */
function schnittRechnen(): [number, number, number, number] | null {
  schnittGanz = false;
  const e = raum;
  if (!e || zustand === 'blatt') return null;
  const a = ansicht !== 'raum' ? ansicht : ansichtFahrt?.vonAnsicht;
  if (!a || a === 'raum') return null;
  const p = glatt(flach);
  if (p < 1e-3) return null;
  schnittGanz = p > 0.9999;
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
  // S17b: die Rückseite gewendeter Felder kehrt Marke und Hinweis nicht um (sie liegen außerhalb der Felder)
  kanteSichtbar = !!hintenJetzt && hintenJetzt.zahl > 0 && vier < 0.999;
  document.body.classList.toggle('wende-an', kanteSichtbar);
}

/**
 * Rastet die Drehung von Hand ein? In den Vier Ansichten nie (Florian, 18.11.: „der 3d view soll in der viereransicht nicht einrasten“):
 * Das Feld des Raums bleibt, wie er es loslässt; die drei Ansichten stehen ja daneben.
 */
const rastetEin = (): boolean => vier < 1e-3 && vierZiel === 0;

/** nahe einer der sechs Ansichten: einrasten (nach dem Drehen von Hand) */
function einrasten(): void {
  if (!rastetEin()) return;
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

/** Drehen von Hand beginnen (Ziehen ins Leere, ein Finger, der Ansichts-Tropfen): Zeiger bei (x, y), CSS-Pixel */
function drehenBeginnen(x: number, y: number, t: number): void {
  schwung = null;
  // S16: wer während der Drehung vor dem Aufklappen selbst dreht, bricht das Aufklappen ab
  if (vorDreh || vierWartet) {
    vorDreh = null;
    if (vierWartet) {
      vierWartet = false;
      vierZiel = 0;
    }
  }
  drehen = { x, y, gier: nutzer.gier, neigung: nutzer.neigung, vg: 0, vn: 0, t, lx: x, ly: y };
}

/** Drehen von Hand: Der Zeiger ist jetzt bei (x, y); eine eingerastete Ansicht löst sich */
function drehenZiehen(x: number, y: number, t: number): void {
  if (!drehen) return;
  ansichtLoesen();
  nutzer.gier = drehen.gier - ((x - drehen.x) * Math.PI) / 520;
  nutzer.neigung = Math.max(NEIGUNG_UNTEN, Math.min(NEIGUNG_OBEN, drehen.neigung + ((y - drehen.y) * Math.PI) / 520));
  // Geschwindigkeit (rad/s), geglättet: für den Schwung beim Loslassen
  const dtz = Math.max(1e-3, (t - drehen.t) / 1000);
  const vg = (-(x - drehen.lx) * Math.PI) / 520 / dtz;
  const vn = ((y - drehen.ly) * Math.PI) / 520 / dtz;
  const a = Math.min(1, dtz / 0.05);
  drehen.vg += (vg - drehen.vg) * a;
  drehen.vn += (vn - drehen.vn) * a;
  drehen.t = t;
  drehen.lx = x;
  drehen.ly = y;
}

/** Drehen loslassen: mit Schwung. Wohin käme die Drehung? Liegt das nahe einer Ansicht, rastet sie dort ein; sonst klingt sie aus (S4) */
function drehenLos(t: number): void {
  if (!drehen) return;
  const ruht = t - drehen.t > 60;
  const v = ruht ? { vg: 0, vn: 0 } : { vg: drehen.vg, vn: drehen.vn };
  const gVor = nutzer.gier + v.vg * SCHWUNG_TAU;
  const nVor = Math.max(NEIGUNG_UNTEN, Math.min(NEIGUNG_OBEN, nutzer.neigung + v.vn * SCHWUNG_TAU));
  const schnell = Math.hypot(v.vg, v.vn) > 0.6;
  const ziel = rastetEin() ? (ansichtNahe(gVor, nVor) ?? (schnell ? ansichtNahe(gVor, nVor, SCHWUNG_FANG) : null)) : null;
  if (ziel) ansichtSetzen(ziel.a, ziel.hinten);
  else if (schnell) schwung = { vg: v.vg, vn: v.vn };
  drehen = null;
}

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
let geste: {
  d0: number;
  w0: number;
  m0: { x: number; y: number };
  zoom0: number;
  gier0: number;
  sx0: number;
  sy0: number;
  gedreht: boolean;
  /** S17: in den Vier Ansichten das Feld, in dem die Finger liegen, und sein Zoom und seine Verschiebung beim Aufsetzen */
  feld?: { n: 'seite' | 'front' | 'top' | 'raum'; zoom: number; x: number; y: number } | null;
} | null = null;
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
  const n = feldUnter(geste.m0.x, geste.m0.y);
  geste.feld = n ? { n, zoom: feldBlick[n].zoom, x: feldBlick[n].x, y: feldBlick[n].y } : null;
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
  // S17: in den Vier Ansichten zoomt und schwenkt das Feld, in dem die Finger liegen; was unter ihrer Mitte lag, bleibt unter ihr
  const gf = geste.feld;
  if (gf) {
    const r = felder()[gf.n];
    const b = feldBlick[gf.n];
    const z = Math.max(FELD_ZOOM_MIN, Math.min(FELD_ZOOM_MAX, (gf.zoom * d) / geste.d0));
    const qx = (geste.m0.x - (r.x + r.w / 2 + gf.x)) / gf.zoom;
    const qy = (geste.m0.y - (r.y + r.h / 2 + gf.y)) / gf.zoom;
    b.zoom = z;
    b.x = m.x - (r.x + r.w / 2) - qx * z;
    b.y = m.y - (r.y + r.h / 2) - qy * z;
    if (gf.n !== 'raum') return;
  }
  const z = Math.max(0.3, Math.min(4, (geste.zoom0 * d) / geste.d0));
  const qx = (geste.m0.x - (W / 2 + geste.sx0)) / geste.zoom0;
  const qy = (geste.m0.y - (H / 2 + geste.sy0)) / geste.zoom0;
  if (!gf) nutzer.zoom = z;
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
  if (geste?.gedreht && rastetEin()) {
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
    drehenBeginnen(x, y, e.timeStamp);
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
  zeigerSystem.geraet = e.pointerType;
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
  // S17b: ⇧ + Ziehen wendet das Feld (Seite und Front waagrecht, der Top senkrecht), so schnell wie das Wenden in der Vollansicht
  if (feldWendenZug) {
    const z = feldWendenZug;
    feldWende[z.n].phi = z.phi0 + ((z.n === 'top' ? y - z.y0 : x - z.x0) * Math.PI) / 520;
    anstossen();
    return;
  }
  // S17: Leertaste + Ziehen schwenkt
  if (schwenkZug) {
    const dx = x - schwenkZug.x0;
    const dy = y - schwenkZug.y0;
    if (schwenkZug.feld) {
      feldBlick[schwenkZug.feld].x = schwenkZug.bx + dx;
      feldBlick[schwenkZug.feld].y = schwenkZug.by + dy;
    } else {
      nutzer.schwenkX = schwenkZug.bx + dx;
      nutzer.schwenkY = schwenkZug.by + dy;
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
  // C4: G, S oder R folgt dem Zeiger
  if (tastenZug) {
    tastenZugBewegen(x, y);
    anstossen();
    return;
  }
  // Objekte (V): Ziehen am Objekt verschiebt es (ab dem ersten Weg); G, S, R folgen dem Zeiger
  if (objektDruck?.getroffen && !objektZug && Math.hypot(x - objektDruck.x, y - objektDruck.y) >= FELD_KLICK_WEG) objektZugBeginnen('g', objektDruck.x, objektDruck.y, false, objektDruck.gespiegelt);
  if (objektZug) {
    objektZugBewegen(x, y);
    anstossen();
    return;
  }
  // C4: auf ein Feld gedrückt: Mit dem ersten Weg entscheidet sich, ob es gezogen wird (gewählt) oder ob gedreht wird (wie bisher)
  if (feldDruck) {
    const d = feldDruck;
    if (!d.zieht && Math.hypot(x - d.x, y - d.y) >= FELD_KLICK_WEG) {
      if (d.gewaehlt) {
        // (auf der Spiegelhälfte gegriffen, geht es in der Tiefe gespiegelt)
        werkBlatt.feldZiehenBeginnen(d.fl, d.x, d.y, d.t.ort.z < 0);
        d.zieht = true;
      } else {
        feldDruck = null;
        // drehen, in jeder Ansicht (S4); in einem flachen Feld der Vier Ansichten klappen sie dabei zurück in den Raum (F3)
        if (vier > 0.5) {
          const R = felder().raum;
          if (!(d.x >= R.x && d.y >= R.y)) vierUmschalten(false);
        }
        drehenBeginnen(d.x, d.y, d.zeit);
      }
    }
    if (feldDruck?.zieht) werkBlatt.ziehen(x - d.x, y - d.y);
    else if (drehen) drehenZiehen(x, y, e.timeStamp);
    anstossen();
    return;
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
  if (eckZug) {
    if (!eckZug.fahrt) eckZugBewegen(x, y);
  } else if (teiler.zug && raum && abstandVomBereich(x, y) > 0) {
    // S18 (Rückweg): über den erlaubten Bereich hinaus wird es ein Zug in eine Ecke
    rueckwegBeginnen(x, y);
  } else if (teiler.zug) {
    const rand = bw.vierRand;
    const oben = 64;
    const e2 = raum!;
    const X = 2 * e2.rx;
    const Y = 2 * e2.ry;
    const Z = 2 * e2.tiefe;
    // links steht die Front (Tiefe Z), wie in `teilerZiel` (bis 17.11. stand hier die Länge X: Die Kreuzung lief dem Zeiger waagrecht davon)
    teiler.bx = (x - rand) / (W - 2 * rand) - Z / (X + Z);
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
    drehenZiehen(x, y, e.timeStamp);
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
    // was unter dem Zeiger liegt, klärt das nächste Bild (A4: einmal je Bild statt je Mausereignis)
    schwebenOffen = true;
  }
  anstossen();
});

/**
 * Was unter dem ruhenden Zeiger liegt: ein Punkt der Silhouette, der Teiler, die Haut des Werks für den Pinsel (der Hauch zeigt Ort
 * und Radius, ein Tropfen den Punkt, den er fassen würde), eine Wand. A4 (17.11.): einmal je Bild; bis dahin bei jedem Mausereignis
 * (mit einem Stift bis zu 240-mal je Sekunde, jedes Mal ein Strahl gegen alle Dreiecke der Haut, in der Pose samt Drehen der Haut).
 */
let schwebenOffen = false;
function schweben(x: number, y: number): void {
  const p = punktSuchen(x, y);
  punktUnterZeiger = p ? p.i : -1;
  teiler.ueber = amTeiler(x, y) ? 1 : 0;
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
  const eo = eckTropfenOrt();
  leinwandLinien.classList.toggle('teiler', teiler.ueber > 0 || !!eckZug || (!!eo && Math.hypot(x - eo[0], y - eo[1]) < 14));
}

leinwandLinien.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  // (solange die Formen einer Reihe aufblasen, ruht die Bedienung: Jede Form wird gerade erst angelegt)
  if (reihe) return;
  try {
    leinwandLinien.setPointerCapture(e.pointerId);
  } catch {
    // nachgestellte Ereignisse haben keinen echten Zeiger
  }
  const [x, y] = lageIm(e);
  zeiger.x = x;
  zeiger.y = y;
  zeiger.da = true;
  zeigerSystem.geraet = e.pointerType;
  if (zustand === 'blatt') {
    blatt.alt = e.altKey;
    blatt.umschalt = e.shiftKey;
    blatt.druecken(x, y, e.timeStamp);
    if (!blatt.leer) leiste.lage(true);
    anstossen();
    return;
  }
  if (zustand !== 'ruhe' || !koerper) return;
  // C4: G, S oder R läuft: Der Klick beendet den Zug (wie im Prüffenster)
  if (tastenZug) {
    tastenZugEnde(true);
    anstossen();
    return;
  }
  // S17: Leertaste + Ziehen schwenkt das Feld unter dem Zeiger (in den Vier Ansichten) oder die ganze Ansicht
  if (leertaste) {
    const n = feldUnter(x, y);
    schwenkZug = { feld: n, x0: x, y0: y, bx: n ? feldBlick[n].x : nutzer.schwenkX, by: n ? feldBlick[n].y : nutzer.schwenkY };
    leertasteGeschwenkt = true;
    anstossen();
    return;
  }
  // S18, S19: der Tropfen an der Ecke (Einzelansicht) oder der Punkt an der Ecke der Kiste (Raum); Doppelklick wie Tab
  const eo = eckTropfenOrt();
  if (eo && Math.hypot(x - eo[0], y - eo[1]) < 14) {
    const jetzt = e.timeStamp;
    if (jetzt - eckKlick.t < 350 && Math.hypot(x - eckKlick.x, y - eckKlick.y) < 8) {
      eckKlick = { t: 0, x, y };
      vierUmschalten(true);
      anstossen();
      return;
    }
    eckKlick = { t: jetzt, x, y };
    eckZugBeginnen(eo, x, y);
    anstossen();
    return;
  }
  if (amTeiler(x, y)) {
    teiler.zug = true;
    anstossen();
    return;
  }
  // B1 (17.11.): das Ziel für genau diesen Ort bestimmen, bevor gefragt wird, ob etwas am Zeiger hängt. Bis dahin galt, was seit dem
  // Bild davor an ihm hing: Ein Tipp mit Stift oder Finger (kein Zeigen davor) und ein rascher Klick griffen oft nichts. Nicht mit dem
  // Lasso (es greift nichts, es umfährt)
  if (werkGezeigt && bearbeitenAn && !strichWerkzeug() && raumWerkzeug !== 'lasso') {
    bearbeiten.alt = e.altKey;
    bearbeiten.umschalt = e.shiftKey;
    bearbeiten.kippen = e.shiftKey;
    bearbeiten.zeigerSetzen(x, y, x, y, 0);
    bearbeiten.zielJetzt();
  }
  // S17b: ⇧ + Ziehen in einem flachen Feld wendet es, ⇧ + Doppelklick ganz (über einem Punkt oder einer Linie gilt ⇧ der Auswahl)
  if (e.shiftKey && !bearbeiten.haengt) {
    const n = feldUnter(x, y);
    if (n && n !== 'raum') {
      const jetzt = e.timeStamp;
      if (jetzt - letzterUmschaltKlick.t < 350 && Math.hypot(x - letzterUmschaltKlick.x, y - letzterUmschaltKlick.y) < 8) {
        letzterUmschaltKlick = { t: 0, x, y };
        // C4: Der erste Klick hat das Feld dort umgeschaltet: zurück (der Doppelklick wendet nur)
        if (jetzt - feldUmgeschaltet.zeit < 400) feldUmschalten(feldUmgeschaltet.x, feldUmgeschaltet.y, 0);
        feldWendenFahrt(n, Math.round(feldWende[n].phi / Math.PI) * Math.PI + Math.PI);
        anstossen();
        return;
      }
      letzterUmschaltKlick = { t: jetzt, x, y };
      feldWende[n].fahrt = null;
      feldWendenZug = { n, x0: x, y0: y, phi0: feldWende[n].phi };
      anstossen();
      return;
    }
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
      // C4: Der erste Klick hat das Feld dort umgeschaltet: zurück (der Doppelklick wendet nur)
      if (jetzt - feldUmgeschaltet.zeit < 400) feldUmschalten(feldUmgeschaltet.x, feldUmgeschaltet.y, 0);
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
  // Objekte (V): Ein Klick auf die Form wählt sie, einer daneben wählt sie ab, ein Doppelklick auf sie wechselt zu ihren Punkten (A);
  // Ziehen an ihr verschiebt sie
  if (objektModus() && werkGezeigt) {
    // ein Zug mit G, S oder R läuft: Der Klick beendet ihn
    if (objektZug) {
      objektZugEnde(true);
      anstossen();
      return;
    }
    const unter = objektBei(x, y);
    // ein ruhendes Objekt unter dem Zeiger wird das aktive (dann gilt alles Weitere ihm)
    const gewechselt = unter !== 0 && unter !== aktivId && objektAktivieren(unter);
    if (gewechselt) objektKlick = { t: 0, x, y };
    const getroffen = unter !== 0 && unter === aktivId;
    if (getroffen && e.timeStamp - objektKlick.t < 350 && Math.hypot(x - objektKlick.x, y - objektKlick.y) < 8) {
      objektKlick = { t: 0, x, y };
      werkzeugImRaum('auswahl');
      anstossen();
      return;
    }
    if (getroffen) objektKlick = { t: e.timeStamp, x, y };
    // (am Spiegelbild einer freien Form gegriffen: Der Weg quer zur Spiegelebene läuft umgekehrt)
    const gespiegelt = getroffen && werkHaut.spiegelbild && pinselHier(x, y) && werkHautTreffen(x, y) === null;
    objektDruck = { x, y, getroffen, gespiegelt };
    // am Objekt: Der erste Weg verschiebt es (`objektZugBeginnen` im Bewegen); daneben dreht es wie ins Leere
    if (!getroffen) {
      if (vier > 0.5) {
        const R = felder().raum;
        if (!(x >= R.x && y >= R.y)) vierUmschalten(false);
      }
      drehenBeginnen(x, y, e.timeStamp);
    }
    anstossen();
    return;
  }
  // Punkte (A) mit mehreren Objekten: Ein Klick auf ein ruhendes Objekt macht es zum aktiven (seine Linien und Punkte erscheinen).
  // Nicht, wo etwas vom aktiven am Zeiger hängt oder das aktive davor liegt
  if (bearbeitenAn && raumWerkzeug === 'auswahl' && ruhende.length && !bearbeiten.haengt) {
    const unter = objektBei(x, y);
    if (unter !== 0 && unter !== aktivId && objektAktivieren(unter)) {
      anstossen();
      return;
    }
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
    // B4 (17.11.): Mit P ist eine Linie angefangen, der Klick liegt weit neben ihrer Fläche: Er tut nichts. Bis dahin drehte er die
    // Ansicht (und schloss die Vier Ansichten), die angefangene Linie war dann nicht mehr fortzusetzen
    if (bearbeiten.stift && werkBlatt.entwurfOffen) {
      werk.G.meldung = 'P: Die Linie gehört zu der Ansicht, in der sie begonnen wurde. Dort weiterzeichnen · ↩ schließt · Esc bricht ab';
      anstossen();
      return;
    }
  }
  // C4: ein Feld der Haut (zwischen Linien) in einer flachen Ansicht: Der Klick wählt es, an einem gewählten Feld ziehen bewegt es
  if (raumWerkzeug === 'auswahl' && !bearbeiten.stift && !e.shiftKey) {
    const f = feldTreffen(x, y);
    if (f) {
      feldDruck = { x, y, zeit: e.timeStamp, fl: f.fl, t: f.t, gewaehlt: werkFelder.istGewaehlt(f.t.tri), zieht: false };
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
    drehenBeginnen(x, y, e.timeStamp);
  }
  anstossen();
});

const loslassen = (e: PointerEvent): void => {
  if (eckZug) {
    eckZugLos();
    anstossen();
    return;
  }
  if (feldWendenZug) {
    // zur näheren Seite, wie in der Vollansicht
    const n = feldWendenZug.n;
    // C4: ⇧ + Klick ohne Weg auf ein Feld der Haut: zur Auswahl dazu oder wieder weg
    if (Math.hypot(zeiger.x - feldWendenZug.x0, zeiger.y - feldWendenZug.y0) < FELD_KLICK_WEG) feldUmschalten(feldWendenZug.x0, feldWendenZug.y0, e.timeStamp);
    feldWendenZug = null;
    feldWendenFahrt(n, Math.round(feldWende[n].phi / Math.PI) * Math.PI);
    anstossen();
    return;
  }
  if (schwenkZug) {
    schwenkZug = null;
    anstossen();
    return;
  }
  if (leinwandLinien.hasPointerCapture(e.pointerId)) leinwandLinien.releasePointerCapture(e.pointerId);
  if (zustand === 'blatt') {
    blatt.loslassen();
    anstossen();
    return;
  }
  // C4: auf ein Feld gedrückt: ohne Weg ein Klick (es wird gewählt), sonst endet sein Zug
  if (feldDruck) {
    const d = feldDruck;
    feldDruck = null;
    if (d.zieht) werkBlatt.ziehenEnden();
    else feldKlick(d.t.tri, false);
    werkNeu = true;
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
    // C4: ⇧ + Klick ohne Weg auf ein Feld der Haut: zur Auswahl dazu oder wieder weg. Dann ist nichts gewendet: keine Fahrt zurück
    // in die Ansicht (solange sie liefe, drehte ein Ziehen nicht)
    const nurFeld = Math.hypot(zeiger.x - wenden.x, zeiger.y - wenden.y) < FELD_KLICK_WEG && feldUmschalten(wenden.x, wenden.y, e.timeStamp);
    wenden = null;
    if (nurFeld) {
      anstossen();
      return;
    }
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
  // Objekte (V): ein Klick ohne Weg wählt die Form (auf ihr) oder wählt sie ab (daneben)
  if (objektDruck) {
    const d = objektDruck;
    objektDruck = null;
    if (objektZug && !objektZug.modal) {
      objektZugEnde(true);
      anstossen();
      return;
    }
    if (Math.hypot(zeiger.x - d.x, zeiger.y - d.y) < FELD_KLICK_WEG) objektGewaehlt = d.getroffen;
  }
  if (drehen) drehenLos(e.timeStamp);
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
  if (drehen || zug || punktZug || teiler.zug || bearbeitenGedrueckt || feldDruck || tastenZug || objektZug) return;
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
      // Zoom von Hand: gilt in allen Ansichten, bis „Einpassen“ (Pos1); S17: in den Vier Ansichten das Feld unter dem Zeiger, zu ihm hin
      const [x, y] = lageIm(e);
      const n = feldUnter(x, y);
      if (n) feldZoomen(n, Math.exp(-e.deltaY * 0.0015), x, y);
      else nutzer.zoom = Math.max(0.3, Math.min(4, nutzer.zoom * Math.exp(-e.deltaY * 0.0015)));
      anstossen();
    }
  },
  { passive: false },
);

/** die Fläche, in deren Blatt ein Zug am Objekt geführt wird (siehe `objektZug`) */
function objektFlaeche(x: number, y: number): Flaeche {
  const Fu = werkBlatt.flaechen[werkBlatt.flaecheUnter(x, y)];
  if (Fu && !Fu.raeumlich && Fu.tiefe) return Fu;
  const blick = new Vector3();
  kam.aktiv.getWorldDirection(blick);
  const ax = Math.abs(blick.x) >= Math.abs(blick.y) && Math.abs(blick.x) >= Math.abs(blick.z) ? 0 : Math.abs(blick.y) >= Math.abs(blick.z) ? 1 : 2;
  const w = werkInWelt(werk.formMitte());
  return ebene(BLATT_DER_ACHSE[ax]!, ax === 0 ? w.x : ax === 1 ? w.y : w.z, vpJetzt(), 1, 1, false);
}
function objektZugBeginnen(k: 'g' | 's' | 'r', x: number, y: number, modal: boolean, gespiegelt: boolean): boolean {
  if (!werkGezeigt || zustand !== 'ruhe' || werk.zug || werk.formZug || objektZug || spiegelFahrt || werk.maulLauf) return false;
  const F = objektFlaeche(x, y);
  const XY = F.her(x, y);
  if (!XY) return false;
  if (!werk.formZugStarten(k, F.a, XY[0], XY[1], gespiegelt)) return false;
  objektZug = { F, modal, sx: x, sy: y, gespiegelt };
  objektGewaehlt = true;
  if (modal) werk.G.meldung = `${k === 'g' ? 'G: das Objekt verschieben · X, Y, Z: nur längs dieser Achse' : k === 's' ? 'S: das Objekt skalieren' : 'R: das Objekt drehen'} · Klick oder ↩: fertig · Esc: zurück`;
  return true;
}
/**
 * X, Y oder Z beim Verschieben: nur längs dieser Achse (noch einmal: wieder frei). Liegt die Achse nicht im Blatt, in dem der Zug
 * geführt wird (im Raum: Z, wenn die Kamera vor allem längs Z schaut), beginnt er neu in dem Blatt mit dieser Achse, das der Kamera
 * am meisten zugewandt ist; in einer flachen Ansicht bleibt eine Achse quer zum Blatt ohne Wirkung.
 */
function objektZugAchse(kk: 'x' | 'y' | 'z'): void {
  const z = objektZug;
  const fz = werk.formZug;
  if (!z || !fz || fz.modal !== 'g') return;
  const neu = fz.achse === kk ? null : kk;
  const imBlatt = (a: Flaeche['a'], achse: 'x' | 'y' | 'z'): boolean => (a === 'seite' ? achse !== 'z' : a === 'front' ? achse !== 'x' : achse !== 'y');
  if (neu && !imBlatt(z.F.a, neu)) {
    const Fu = werkBlatt.flaechen[werkBlatt.flaecheUnter(z.sx, z.sy)];
    if (Fu && !Fu.raeumlich && Fu.tiefe) return;
    // die zwei Blätter mit dieser Achse: das, auf das die Kamera gerader schaut
    const blick = new Vector3();
    kam.aktiv.getWorldDirection(blick);
    const b = [Math.abs(blick.x), Math.abs(blick.y), Math.abs(blick.z)];
    const wahl = ([0, 1, 2] as const).filter((ax) => ax !== (neu === 'x' ? 0 : neu === 'y' ? 1 : 2)).sort((p, q) => b[q]! - b[p]!)[0]!;
    werk.formZugEnde(false);
    const w = werkInWelt(werk.formMitte());
    const F = ebene(BLATT_DER_ACHSE[wahl]!, wahl === 0 ? w.x : wahl === 1 ? w.y : w.z, vpJetzt(), 1, 1, false);
    const XY = F.her(z.sx, z.sy);
    if (!XY || !werk.formZugStarten('g', F.a, XY[0], XY[1], z.gespiegelt)) {
      objektZug = null;
      return;
    }
    z.F = F;
  }
  if (werk.formZug) werk.formZug.achse = neu;
  objektZugBewegen(zeiger.x, zeiger.y);
}
function objektZugBewegen(x: number, y: number): void {
  const XY = objektZug?.F.her(x, y);
  if (!XY) return;
  werk.formZugBewegen(XY[0], XY[1]);
  werkNeu = true;
}
/** Ende des Zugs; eine freie Form mit Spiegelbild und Clipping, die jetzt über die Spiegelebene reicht, verschmilzt dort (wie nach einem Zug an Punkten) */
function objektZugEnde(ok: boolean): void {
  if (!objektZug) return;
  const modal = objektZug.modal;
  objektZug = null;
  const bewegt = !!werk.formZug?.bewegt;
  werk.formZugEnde(ok);
  if (ok && bewegt && werk.G.clipping && werk.ueberDerMitte()) werk.mitteFest(true);
  else if (modal) werk.G.meldung = '';
  werkNeu = true;
}

/** Liegt die Form unter dem Ort (CSS-Pixel)? Im Raum ein Strahl gegen ihre Haut, in einer flachen Ansicht oder einem Feld der Ort im Blatt */
function objektUnter(x: number, y: number): boolean {
  if (zustand !== 'ruhe' || !werkGezeigt) return false;
  // (im Raum: ein Strahl gegen die Haut, an einer freien Form mit Spiegelbild auch gegen dieses)
  if (pinselHier(x, y)) return werkHautTreffen(x, y) !== null || (werkHaut.spiegelbild && werkHautTreffen(x, y, true) !== null);
  const F = werkBlatt.flaechen[werkBlatt.flaecheUnter(x, y)];
  if (!F || F.raeumlich || !F.tiefe) return false;
  const XY = F.her(x, y);
  return XY ? werkFelder.treffer(F.a, XY[0], XY[1], F.vorn ?? 1) !== null : false;
}

/**
 * L (18.11., Florian: „wie bei blender … mit l auswählen wenn ich darüber fahre. deselektieren auch wie bei blender“): alles
 * Verbundene am Teil unter dem Zeiger wählen, ohne Klick; ⇧ + L nimmt es aus der Auswahl. Unter dem Zeiger heißt: über der Haut
 * des Teils oder an einer seiner Linien oder einem seiner Punkte (auch an den Wänden). Noch hat ein Objekt ein Teil: alle seine Punkte.
 */
function verbundenesWaehlen(weg: boolean): void {
  if (!bearbeitenAn || !zeiger.da || bearbeiten.stift || strichWerkzeug()) return;
  if (!bearbeiten.haengt && !objektUnter(zeiger.x, zeiger.y)) return;
  if (weg) {
    bearbeiten.eingabe('esc');
    werk.G.auswahl = [];
  } else bearbeiten.eingabe('alle');
}

function werkzeugGewaehlt(w: Werkzeug): void {
  // im Raum (mit dem Werk): P, Freihand, Formen und Lasso auf den Flächen
  if (zustand === 'ruhe' && werkGezeigt) {
    werkzeugImRaum(w);
    return;
  }
  if (zustand !== 'blatt' || w === 'lasso') return;
  // auf dem Blatt gibt es noch keine Objekte: Der dunkle Zeiger gilt dort wie der weiße
  if (w === 'objekt') {
    waehlenTaste('auswahl');
    anstossen();
    return;
  }
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
  if (strichWerkzeug() || w === 'objekt') bearbeiten.zeigerWeg();
  if (w === 'objekt') {
    hauch.ziel = 0;
    pinselZiel = null;
    zeigerPinsel = false;
  } else objektGewaehlt = false;
  raumStrich = null;
  raumAufzug = null;
  leiste.setzen(w);
  anstossen();
}

function muell(): void {
  if (reihe) return;
  if (zustand === 'blatt') blatt.leeren();
  else if (ruhende.length && zustand === 'ruhe') {
    // mit mehreren Objekten verwirft der Mülleimer das aktive (wie ⌫ im Objekt-Modus); das letzte geht wie bisher zurück aufs leere Blatt
    if (!objektLoeschen()) werk.G.meldung = 'Das Objekt lässt sich erst löschen, wenn der laufende Handgriff beendet ist';
    anstossen();
    return;
  } else neu();
  leiste.lage(false);
  anstossen();
}

window.addEventListener('keydown', (e) => {
  if (e.altKey !== altGehalten) {
    altGehalten = e.altKey;
    anstossen();
  }
  // ⌘S auch, wenn ein Regler den Fokus hat (sonst sichert der Browser die Seite); im Feld „Sichern“ gilt das Feld
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && e.target !== sichernName) {
    e.preventDefault();
    if (!e.repeat) sichernKurz();
    return;
  }
  if (e.target instanceof HTMLInputElement) return;
  if (reihe) {
    e.preventDefault();
    return;
  }
  blatt.alt = e.altKey;
  blatt.umschalt = e.shiftKey;
  bearbeiten.alt = e.altKey;
  bearbeiten.umschalt = e.shiftKey;
  bearbeiten.kippen = e.shiftKey;
  const k = e.key;
  // Objekte (V): G, S oder R am Objekt läuft: Esc nimmt zurück, ↩ beendet, X, Y, Z halten das Verschieben längs einer Achse
  if (objektZug) {
    e.preventDefault();
    const kk = k.toLowerCase();
    if (k === 'Escape') objektZugEnde(false);
    else if (k === 'Enter') objektZugEnde(true);
    else if (kk === 'x' || kk === 'y' || kk === 'z') objektZugAchse(kk);
    anstossen();
    return;
  }
  // C4: G, S oder R läuft: Esc nimmt zurück, ↩ beendet, X, Y, Z halten den Zug längs einer Achse (noch einmal: wieder frei)
  if (tastenZug) {
    e.preventDefault();
    const kk = k.toLowerCase();
    if (k === 'Escape') tastenZugEnde(false);
    else if (k === 'Enter') tastenZugEnde(true);
    else if ((kk === 'x' || kk === 'y' || kk === 'z') && werk.zug) {
      werk.zug.achse = werk.zug.achse === kk ? null : kk;
      if (werk.G.maus) werk.zugBewegen(werk.G.maus.X, werk.G.maus.Y);
      werkNeu = true;
    }
    anstossen();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && k === ',') {
    e.preventDefault();
    reglerZeigen(!reglerOffen);
    return;
  }
  if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'z') {
    e.preventDefault();
    if (zustand === 'blatt' && blatt.rueckgaengig()) anstossen();
    else if (zustand === 'ruhe' && !werk.zug && !tastenZug && !objektZug && rueckwegAnders()) anstossen();
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
    if (zustand === 'ruhe') {
      spiegelNachZurueck();
      nahtNachZurueck();
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
      // (das Plus abbrechen: auf dem leeren Blatt eines neuen Objekts zurück in den Raum, zum Objekt von eben)
      if (objektPlusAbbrechen()) return;
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
    } else if (objektModus() && objektGewaehlt) objektGewaehlt = false;
    else if (vierZiel > 0.5) vierUmschalten(false);
    else if (ansicht !== 'raum') ansichtSetzen('raum');
    else ablassen();
  } else if (k === 'Backspace' || k === 'Delete') {
    if (zustand === 'blatt') blatt.eingabe('loeschen');
    // gewählte Punkte löschen (im Werk), sonst Luft ablassen
    else if (bearbeitenAn && (bearbeiten.auswahl.size > 0 || (bearbeiten.stift && werkBlatt.entwurf()))) bearbeiten.eingabe('loeschen');
    // im Objekt-Modus (V) löscht ⌫ nur das gewählte Objekt (noch ist es die eine Form: Die Luft geht ab)
    else if (objektModus() && werkGezeigt) {
      // (gibt es noch andere Objekte, geht nur das gewählte; das letzte Objekt lässt wie bisher die Luft ab)
      if (objektGewaehlt && !objektLoeschen()) ablassen();
    } else ablassen();
  } else if ((k === '[' || k === ']') && zustand === 'ruhe' && werkGezeigt) {
    // Radius des Pinsels (wie O im Prüffenster)
    pinselRadius = Math.max(10, Math.min(600, pinselRadius * (k === ']' ? 1.2 : 1 / 1.2)));
  } else if ((k === 'p' || k === 'P') && zustand === 'ruhe' && werkGezeigt) stiftImRaum(!bearbeiten.stift);
  // V: Objekte (dunkler Zeiger), A: Punkte (weißer Zeiger), wie in Illustrator
  else if ((k === 'v' || k === 'V') && zustand === 'ruhe' && werkGezeigt) werkzeugImRaum('objekt');
  else if ((k === 'a' || k === 'A') && zustand === 'ruhe' && werkGezeigt) werkzeugImRaum('auswahl');
  else if ((k === 'w' || k === 'W') && zustand === 'ruhe' && werkGezeigt && !e.metaKey && !e.ctrlKey) {
    // B3: im Raum zwischen Seifenhaut und Kurvennetz wechseln
    raumNetz = !raumNetz;
    werk.G.meldung = raumNetz ? 'Kurvennetz im Raum: Linien und Punkte auf der Form · W: zurück zur Seifenhaut' : '';
  }
  // L wählt alles Verbundene unter dem Zeiger (⇧ nimmt es heraus), wie in Blender; das Lasso liegt auf Q, wie in Illustrator
  else if ((k === 'l' || k === 'L') && zustand === 'ruhe' && werkGezeigt) verbundenesWaehlen(e.shiftKey);
  else if ((k === 'q' || k === 'Q') && zustand === 'ruhe' && werkGezeigt) werkzeugImRaum(raumWerkzeug === 'lasso' ? 'auswahl' : 'lasso');
  else if ((k === 'g' || k === 's' || k === 'r') && zustand === 'ruhe' && werkGezeigt && bearbeitenAn && !e.repeat) {
    // C4: die Auswahl verschieben, skalieren, drehen (Punkte, Linien, Felder)
    if (!tastenZugBeginnen(k)) return;
  } else if ((k === 'g' || k === 's' || k === 'r') && zustand === 'ruhe' && werkGezeigt && objektModus() && !e.repeat) {
    // Objekte (V): das gewählte Objekt (oder das unter dem Zeiger) verschieben, skalieren, drehen
    if (!zeiger.da || !(objektGewaehlt || objektUnter(zeiger.x, zeiger.y))) werk.G.meldung = 'G, S, R: erst das Objekt wählen (Klick)';
    else objektZugBeginnen(k, zeiger.x, zeiger.y, true, false);
  }
  else if ((k === 'n' || k === 'N') && zustand === 'ruhe' && werkGezeigt) werkzeugImRaum('frei');
  else if (k === 'e' && zustand === 'ruhe' && werkGezeigt) werkzeugImRaum('ellipse');
  else if (k === 'E' && zustand === 'ruhe' && werkGezeigt) werkzeugImRaum('wuerfel');
  else if ((k === 'k' || k === 'K') && zustand === 'ruhe' && werkGezeigt && !objektModus()) {
    // Kante an den gewählten Punkten oder Linien an und aus (im Werk)
    if (werk.G.auswahl.length && !werk.zug) {
      // S13 (5): die Tusche fließt vom Gewählten aus, und ändert die Kante die Lage der Linie (Ecken), gleitet sie wie nach ⌘Z
      werkBlatt.tuscheMerken(werk.G.auswahl);
      werkBlatt.rueckfluss();
      werk.kanteSetzen();
    }
  } else if (k === ' ') {
    // S17: gehalten und gezogen schwenkt sie; kurz getippt bläst sie noch einmal auf (beim Loslassen)
    e.preventDefault();
    if (!e.repeat && !leertaste) {
      leertaste = true;
      leertasteSeit = performance.now();
      leertasteGeschwenkt = false;
    }
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
    // S17: auch die Felder der Vier Ansichten
    for (const b of Object.values(feldBlick)) {
      b.zoom = 1;
      b.x = 0;
      b.y = 0;
    }
  } else if (zustand === 'blatt' && (k === 'p' || k === 'P')) waehlenTaste('p');
  else if (zustand === 'blatt' && (k === 'n' || k === 'N')) waehlenTaste('frei');
  else if (zustand === 'blatt' && k === 'e') waehlenTaste('ellipse');
  else if (zustand === 'blatt' && k === 'E') waehlenTaste('wuerfel');
  else if (zustand === 'blatt' && (k === 'v' || k === 'V' || k === 'a' || k === 'A')) waehlenTaste('auswahl');
  else if (k === 'm' || k === 'M') materialWeiter();
  else return;
  anstossen();
});
window.addEventListener('keyup', (e) => {
  if (e.altKey !== altGehalten) {
    altGehalten = e.altKey;
    anstossen();
  }
  if (e.key === ' ' && leertaste) {
    leertaste = false;
    if (!leertasteGeschwenkt && !schwenkZug && performance.now() - leertasteSeit < 300 && !(e.target instanceof HTMLInputElement)) nochEinmal();
  }
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
  if ((e.target as HTMLElement).closest('button[data-roentgen]')) {
    roentgenFest = !roentgenFest;
    roentgenKnopf?.setAttribute('aria-pressed', String(roentgenFest));
    anstossen();
    return;
  }
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-taste]');
  if (b?.dataset.taste) tasteSenden(b.dataset.taste, b.dataset.meta === '1');
});
let tastenStandVorher = '';
/**
 * S14, Röntgen (Florian: „Röntgen zuerst“): Solange ⌥ gehalten wird (auf dem iPad: der Knopf „Röntgen“), greift man auch, was hinter
 * der Form liegt; die Haut wird durchsichtiger, die grünen Linien bekommen ihre volle Breite zurück. Weich (0 … 1).
 */
let altGehalten = false;
let roentgenFest = false;
let roentgen = 0;
const roentgenKnopf = tasten.querySelector<HTMLButtonElement>('button[data-roentgen]');
window.addEventListener('blur', () => {
  altGehalten = false;
  leertaste = false;
  anstossen();
});
/** die Ansicht, in der Ozzy steht, als gedrückter Knopf */
function tastenStand(): void {
  // B3: der Knopf „Netz“ (Kurvennetz im Raum, wie W) zeigt, ob es gewählt ist
  if (raumNetz !== netzKnopfStand) {
    netzKnopfStand = raumNetz;
    tasten.querySelector<HTMLButtonElement>('button[data-netz]')?.setAttribute('aria-pressed', String(raumNetz));
  }
  const jetzt = zustand === 'blatt' ? '' : vierZiel > 0.5 ? 'vier' : ansicht;
  if (jetzt === tastenStandVorher) return;
  tastenStandVorher = jetzt;
  for (const b of tasten.querySelectorAll<HTMLButtonElement>('button[data-ansicht]')) b.setAttribute('aria-pressed', String(b.dataset.ansicht === jetzt));
}
let netzKnopfStand = false;

function waehlenTaste(w: Werkzeug): void {
  blatt.werkzeugSetzen(w);
  leiste.setzen(w);
}

// ---------- Leiste, Menü, Feinregler ----------

const leiste = new Leiste(document.body, werkzeugGewaehlt, muell, (z) => spiegelSetzen(z), objektPlus, (art) => void objekteVerbindenJetzt(art));

// S13 (liquid drop, Idee 10): der Ansichts-Tropfen unten rechts; Tippen rastet ein (⇧ die Gegenseite, die Mitte der Raum), Ziehen dreht
const ansichtsTropfen = new AnsichtsTropfen(
  document.body,
  {
    setzen: (z) => {
      if (zustand !== 'ruhe') return;
      if (vierZiel > 0.5) vierUmschalten(false);
      if (z.a === 'raum') ansichtSetzen('raum');
      else {
        wendenSicht = ansicht === z.a && gewendet !== z.hinten;
        ansichtSetzen(z.a, z.hinten);
      }
    },
    drehenBeginnen,
    drehenZiehen,
    drehenLos,
    anstossen,
  },
  () => GROB.matches || document.body.classList.contains('beruehrung'),
);

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

// Formen beginnen mit Edgeloops (gilt beim nächsten Aufblasen)
const startLoopsSchalter = $<HTMLInputElement>('start-loops');
startLoopsSchalter.checked = startLoops;
startLoopsSchalter.addEventListener('change', () => {
  startLoops = startLoopsSchalter.checked;
  try {
    localStorage.setItem('ozzy.startLoops', startLoops ? '1' : '0');
  } catch {
    // ohne Speicher gilt es nur bis zum Neuladen
  }
  werk.G.meldung = startLoops ? 'Beim nächsten Aufblasen beginnt die Form mit drei Loops (Seite, quer, längs)' : 'Beim nächsten Aufblasen ohne die Start-Loops';
});

const regler = $<HTMLElement>('regler');
const marke = $<HTMLButtonElement>('marke');
/** S13 (liquid drop, Idee 1): Das Menü wächst als Tropfen aus „Ozzy“ und fließt beim Schließen dorthin zurück (CSS `#regler`, `.zu`) */
let reglerOffen = false;
function reglerZeigen(an: boolean): void {
  reglerOffen = an;
  if (an) {
    regler.classList.remove('zu');
    regler.hidden = false;
  } else if (!regler.hidden && !regler.classList.contains('zu')) {
    regler.classList.add('zu');
    const weg = (): void => {
      if (reglerOffen || !regler.classList.contains('zu')) return;
      // läuft die Bewegung noch (oder steht sie still, wie im Film), später noch einmal
      if (regler.getAnimations().some((b) => b.playState !== 'finished')) {
        setTimeout(weg, 200);
        return;
      }
      regler.hidden = true;
      regler.classList.remove('zu');
    };
    // nur das Ende der eigenen Bewegung zählt (die Teile im Menü melden ihre auch)
    const ende = (e: AnimationEvent): void => {
      if (e.target !== regler) return;
      regler.removeEventListener('animationend', ende);
      weg();
    };
    regler.addEventListener('animationend', ende);
    // falls das Ende der Bewegung nicht gemeldet wird (Fenster im Hintergrund)
    setTimeout(weg, 450);
  }
  marke.setAttribute('aria-expanded', String(an));
}
marke.addEventListener('click', () => reglerZeigen(!reglerOffen));

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
  // Ozzy: der Spiegel dieser Form, ihr Maß im Raum und die weiteren Objekte der Szene (jedes mit seinem Stand)
  const weitere = ruhende.map((r) => ({ id: r.id, spiegel: { clipping: r.stand.clipping, spiegelbild: r.stand.spiegelbild }, mass: { f: r.haut.f, mitte: { ...r.haut.mitte } }, stand: werk.standAus(r.stand.stand) }));
  st.ozzy = { id: aktivId, spiegel: { clipping: werk.G.clipping, spiegelbild: werk.G.spiegelbild }, mass: { f: werkHaut.f, mitte: { ...werkHaut.mitte } }, objekte: weitere };
  // ein Stand, der nicht in Ordnung ist, überschriebe sonst eine gute Datei (und ließe sich nicht wieder laden)
  const mangel = pruefen(st) ?? weitere.map((o) => pruefen(o.stand)).find((x) => x !== null) ?? null;
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
  // (die Szene hat einen Namen: Auch die ruhenden Objekte tragen ihn, ⌘S sichert dann von jedem aus dieselbe Datei)
  for (const r of ruhende) r.stand.name = name;
  return `gesichert: „${name}“ (${auskunft(st)}${weitere.length ? `, dazu ${weitere.length} weitere${weitere.length === 1 ? 's Objekt' : ' Objekte'}` : ''}, ${(datei.size / 1e6).toFixed(1)} MB)`;
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
  if (sichernDetails.open && reglerOffen) sichernLos();
  else if (werk.G.ablageName) void sichernUnter(werk.G.ablageName);
  else sichernOeffnen();
}

// S13 (liquid drop, Idee 2): Regler als Tropfen auf einem Faden
reglerTropfen();

const fassungKnoepfe = $<HTMLSpanElement>('fassungen');
FASSUNGEN.forEach((name, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = name;
  b.addEventListener('click', () => fassungSetzen(i as Fassung));
  fassungKnoepfe.append(b);
});
// die festen Materialien in derselben Reihe (Florian, 18.11.: „Du kannst die Materialien erstmal ins Ozzy-Menü packen“)
MATERIALIEN.forEach((name) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = name;
  b.addEventListener('click', () => materialSetzen(name));
  fassungKnoepfe.append(b);
});
function materialZeigen(): void {
  [...fassungKnoepfe.children].forEach((b, i) =>
    b.setAttribute('aria-pressed', String(i < FASSUNGEN.length ? material === null && i === fassung : MATERIALIEN[i - FASSUNGEN.length] === material)),
  );
  try {
    localStorage.setItem('ozzy.material', material ?? 'seifenhaut');
  } catch {
    // ohne Speicher gilt die Wahl bis zum Neuladen
  }
  anstossen();
}
/** die Seifenhaut in dieser Fassung */
function fassungSetzen(f: Fassung): void {
  fassung = f;
  material = null;
  materialZeigen();
}
/** ein festes Material (null: zurück zur Seifenhaut) */
function materialSetzen(m: Material | null): void {
  material = m;
  materialZeigen();
}
/** M: der Reihe nach durch die Seifenhaut mit ihren Fassungen und die festen Materialien */
function materialWeiter(): void {
  const i = material === null ? fassung : FASSUNGEN.length + MATERIALIEN.indexOf(material);
  const j = (i + 1) % (FASSUNGEN.length + MATERIALIEN.length);
  if (j < FASSUNGEN.length) fassungSetzen(j as Fassung);
  else materialSetzen(MATERIALIEN[j - FASSUNGEN.length]!);
}
materialZeigen();

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
/**
 * Objekte (V): Unter dem gewählten Objekt hängt ein dunkles Schild mit seinem Namen (so sieht man, was gewählt ist, auch an der
 * Seifenhaut, die keinen Umriss hat). In den Vier Ansichten steht die Form viermal im Bild: dort kein Schild.
 */
const objektTropfen = $<HTMLDivElement>('objekt-tropfen');
function objektUiZeigen(): void {
  let ort: { x: number; y: number } | null = null;
  if (zustand === 'ruhe' && werkGezeigt && objektModus() && objektGewaehlt && vier < 0.02) {
    const { rx, ry, tiefe } = werkHaut.masse();
    const vp = vpJetzt();
    const v = new Vector4();
    let x0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let gut = true;
    for (let e = 0; e < 8 && gut; e++) {
      v.set(werkHaut.mitte.x + (e & 1 ? rx : -rx), werkHaut.mitte.y + (e & 2 ? ry : -ry), (e & 4 ? tiefe : -tiefe), 1).applyMatrix4(vp);
      if (!(v.w > 1e-6)) gut = false;
      else {
        const x = (v.x / v.w / 2 + 0.5) * W;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, (0.5 - v.y / v.w / 2) * H);
      }
    }
    if (gut) ort = { x: (x0 + x1) / 2, y: Math.min(H - 60, y1 + 10) };
  }
  objektTropfen.hidden = !ort;
  if (!ort) return;
  const text = objektName();
  if (objektTropfen.textContent !== text) objektTropfen.textContent = text;
  objektTropfen.style.left = `${ort.x.toFixed(1)}px`;
  objektTropfen.style.top = `${ort.y.toFixed(1)}px`;
}

function maulUiZeigen(): void {
  const an = zustand === 'ruhe' && werkGezeigt && bearbeitenAn;
  // der Tropfen hängt unter dem tiefsten sichtbaren Punkt der gewählten Linie
  // (nicht, wenn ein Feld gewählt ist: Dann sind die Punkte auf seinem Rand gewählt, kein Ring)
  // (ein Maul braucht noch die gespiegelte Form: an einer freien gibt es den Tropfen nicht)
  const l = an && !werk.grund && !werk.maulLauf && !werk.zug && !bearbeiten.stift && werkFelder.anzahl === 0 && !werk.istFrei() ? maulRing() : null;
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
  if (o) maulLetzterOrt = { x: o.x, y: o.y + 26 };
  if (o && l) {
    const text = maulHart(l) ? 'Maul' : 'Maul formen';
    if (maulTropfen.textContent !== text) maulTropfen.textContent = text;
    maulTropfen.style.left = `${o.x.toFixed(1)}px`;
    maulTropfen.style.top = `${(o.y + 14).toFixed(1)}px`;
  }
  // oben rechts „Fressen“, sobald es ein Maul gibt; es quillt aus dem Tropfen „Maul“ (S13, Idee 1)
  const fressenWar = fressen.hidden;
  fressen.hidden = !(an && werk.G.maul);
  if (fressenWar && !fressen.hidden) fressenQuellen();
  fressenKnopf.setAttribute('aria-pressed', String(werk.grund !== null));
  if (!vorRegler) {
    fressenMaul.value = String(werk.pose.kiefer);
    fressenKopf.value = String(werk.pose.schaedel);
  }
  fressenMaulZahl.textContent = `${Number(fressenMaul.value).toFixed(0)}°`;
  fressenKopfZahl.textContent = `${Number(fressenKopf.value).toFixed(0)}°`;
}

/** wo der Tropfen „Maul“ zuletzt hing (Mitte, CSS-Pixel): Dort quillt „Fressen“ heraus */
let maulLetzterOrt: { x: number; y: number } | null = null;
/** „Fressen“ fliegt aus dem Tropfen „Maul“ an seinen Platz oben rechts und wird dabei vom Tropfen zur Tafel */
function fressenQuellen(): void {
  const r = fressen.getBoundingClientRect();
  const mx = r.left + r.width / 2;
  const my = r.top + r.height / 2;
  const von = maulLetzterOrt ?? { x: mx, y: r.top };
  const dx = von.x - mx;
  const dy = von.y - my;
  fressen.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(0.12, 0.2)`, opacity: 0.2, borderRadius: '999px' },
      { transform: `translate(${dx * 0.12}px, ${dy * 0.12}px) scale(1.04, 0.96)`, opacity: 1, borderRadius: '18px', offset: 0.7 },
      { transform: 'none', opacity: 1, borderRadius: '14px' },
    ],
    { duration: 560, easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)' },
  );
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
  /** C4: die gewählten Felder (Dreiecke mit Spiegelbild, Punkte auf dem Rand als „Loop.Punkt“) */
  felder: () => werkFelder.stand(),
  /** C4: das Feld der Haut unter dem Ort (CSS-Pixel): sein Dreieck, der Ort im Werk, ob es gewählt ist; null: dort liegt keins */
  feldBei: (x: number, y: number) => {
    const f = feldTreffen(x, y);
    return f ? { tri: f.t.tri, ort: f.t.ort, gewaehlt: werkFelder.istGewaehlt(f.t.tri), flaeche: werkBlatt.flaechen[f.fl]?.a ?? null } : null;
  },
  /** C4: läuft G, S oder R? (die Art des Zugs im Werk, sonst null) */
  tastenZug: () => (tastenZug && werk.zug ? werk.zug.modal : null),
  /** eine gesicherte Form laden (wie Menü → Laden); zurück: die Meldung des Werks */
  laden: (name: string): Promise<string> => formLaden(name),
  /** die Szene (alle Objekte) unter einem Namen in die Ablage sichern, wie ⌘S */
  sichern: (name: string): Promise<string> => formSichern(name),
  /** Bearbeiten über das Werk: ob das Verhalten die Flächen hat, Netz, Flächen, Auswahl (Anker und im Werk) */
  /** die Punkte, wie das Verhalten sie sieht (CSS-Pixel), für die Probe des Lassos */
  /** S7: Proben der Linien hinter der Haut (grün) und davor, über alle Flächen */
  verdecktZahl: () => {
    let hinten = 0;
    let vorn = 0;
    for (const P of werkBlatt.proben) for (let k = 0; k < P.n; k++) if (P.schicht[k] === 1) hinten++; else vorn++;
    return [hinten, vorn];
  },
  netzPunkte: () => werkBlatt.netz.punkte.map((p, i) => ({ x: p.x, y: p.y, sichtbar: p.sichtbar, verdeckt: p.verdeckt, a: werkBlatt.flaechen[werkBlatt.anker[i]?.fl ?? -1]?.a ?? null, w: (werkBlatt.anker[i]?.werk ?? []).map((v) => `${v.id}.${v.i}`) })),
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
    /** B4: so viele Punkte hat die Linie, die mit P gerade gezeichnet wird (0: keine) */
    entwurf: werkBlatt.entwurfOffen ? (werkBlatt.entwurf()?.anzahl ?? 0) : 0,
    schritte: werk.zurueck.length - (werkForm?.zurueck ?? 0),
    beschaeftigt: werkBeschaeftigt(),
    meldung: werk.G.meldung,
  }),
  /** B3: die Ansicht „Kurvennetz“ im Raum: gewählt, wie weit eingeblendet, in welchem Blatt gezogen wird; `an` schaltet sie */
  raumNetz: (an?: boolean) => {
    if (an !== undefined) {
      raumNetz = an;
      anstossen();
    }
    return { an: raumNetz, deckung: raumNetzDeckung, blatt: raum ? raumBlatt() : null };
  },
  /** B1: der Zeiger jetzt: Zeigt ihn das System (und mit welchem Bild), hat ihn das letzte Bild gezeichnet, seine Form */
  zeiger: () => ({ system: zeigerSystem.an, bild: zeigerSystem.wert, gezeichnet: zeigerGezeichnet, art: zustand === 'blatt' ? 'pfeil' : zeigerArtJetzt(), tempo: zeigerSystem.tempo, farbe: zustand !== 'blatt' && objektModus() ? 'dunkel' : 'weiss' }),
  /** der Spiegel-Knopf: sein Zustand, ob er etwas schaltet, die Fahrt beim Einschalten des Clippings (0 … 1) */
  spiegel: () => ({
    zustand: spiegelZustand(),
    erlaubt: spiegelErlaubt(),
    fahrt: spiegelFahrt ? Math.min(1, spiegelFahrt.t / SPIEGEL_FAHRT) : null,
    rand: spiegelSchnittJetzt(),
    /** die Form ist frei (ein ganzes Netz ohne Spiegelpaare); ihr Spiegelbild wird gezeigt; so viele Punkte zeigt die Anzeige */
    frei: werk.istFrei(),
    spiegelbild: werkHaut.spiegelbild,
    gezeigt: werkHaut.zeigeNetz ? werkHaut.zeigeNetz.pos.length / 3 : 0,
  }),
  spiegelSetzen,
  /** Etappe 3: die Objekte (das aktive und die ruhenden mit ihren Kästen im Raum), das Plus, ein Objekt zum aktiven machen */
  objekte: () => ({
    aktiv: aktivId,
    name: objektName(),
    ruhende: ruhende.map((r) => ({ id: r.id, kasten: r.kasten, punkte: r.treffer.pos.length / 3, gezeigt: (r.haut.zeigeNetz?.pos.length ?? 0) / 3, spiegelbild: r.treffer.spiegelbild, frei: werk.hautFreiVon(r.stand.stand.haut), clipping: r.stand.clipping })),
    ruheSicht,
    kasten: werkMasseWeltAktiv(),
  }),
  objektPlus,
  objektAktivieren,
  /** der gemeinsame Rückweg: seine Einträge der Reihe nach (für die Probe) */
  rueckweg: () => {
    rueckwegAbgleichen();
    return rueckweg.map((e) => (e.art === 'schritt' ? `s${e.id}` : `x${e.teil.id}`)).join(' ');
  },
  /** Etappe 3: Blasen die Formen einer Reihe noch auf (mehrere Silhouetten auf einem Blatt)? */
  reihe: () => (reihe ? { warten: reihe.warten.length, zahl: reihe.zahl, imRaum: reihe.imRaum } : null),
  /** Etappe 4: das aktive Objekt mit dem verbinden, das es berührt (wie die Knöpfe der Leiste) */
  verbinden: (art: 'vereinen' | 'abziehen') => objekteVerbindenJetzt(art),
  nahtPartner: () => nahtPartner()?.id ?? 0,
  /** der Stand der Form des Werks für die Probe der Naht: ihre Linien, ob die Haut geschlossen ist, ihr Rauminhalt und Kasten im Raum */
  nahtStand: () => {
    const h = werk.haut;
    const f = werkHaut.f;
    const kanten = new Map<number, number>();
    let inhalt = 0;
    for (let t = 0; t < h.tri.length; t += 3) {
      const [a, b, c] = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
      for (const [u, w] of [
        [a, b],
        [b, c],
        [c, a],
      ] as const)
        kanten.set(u * h.n + w, (kanten.get(u * h.n + w) ?? 0) + 1);
      const P = h.pos;
      inhalt += P[3 * a]! * (P[3 * b + 1]! * P[3 * c + 2]! - P[3 * b + 2]! * P[3 * c + 1]!) + P[3 * a + 1]! * (P[3 * b + 2]! * P[3 * c]! - P[3 * b]! * P[3 * c + 2]!) + P[3 * a + 2]! * (P[3 * b]! * P[3 * c + 1]! - P[3 * b + 1]! * P[3 * c]!);
    }
    let offen = 0;
    for (const [key, zahl] of kanten) if (zahl !== 1 || kanten.get((key % h.n) * h.n + Math.floor(key / h.n)) !== 1) offen++;
    let ohnePaar = 0;
    for (let v = 0; v < h.n; v++) if (h.spiegel[v]! < 0 || h.spiegel[h.spiegel[v]!] !== v) ohnePaar++;
    return {
      punkte: h.n,
      offen,
      ohnePaar,
      inhalt: inhalt / 6 / (f * f * f),
      kasten: werkMasseWeltAktiv(),
      linien: werk.loops.map((l) => ({ id: l.id, art: l.art, kante: !!l.kante, haengt: l.haengt ?? null, punkte: l.punkte.length, proben: l.proben.length, pfad: !!l.pfad })),
      marken: nahtMarken.length,
      laeuft: nahtLaeuft,
    };
  },
  objektBei,
  /** Objekte (V): der Modus, ob das Objekt gewählt ist, das Werkzeug des Raums, das Schild am Objekt (Text und Ort, CSS-Pixel) */
  objekt: () => ({
    modus: objektModus(),
    gewaehlt: objektGewaehlt,
    werkzeug: raumWerkzeug,
    schild: objektTropfen.hidden ? null : { text: objektTropfen.textContent, x: parseFloat(objektTropfen.style.left), y: parseFloat(objektTropfen.style.top) },
    unter: zeiger.da ? objektUnter(zeiger.x, zeiger.y) : false,
    zug: objektZug ? (werk.formZug?.modal ?? null) : null,
    mitte: werk.formMitte(),
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
    // in den Vier Ansichten das Feld (beim Einrasten aus ihnen heraus gibt es daneben die Wand, die im Feld des Raums zum Blatt wird)
    const F = werkBlatt.flaechen.find((f) => f.a === a && (vier < 1e-3 || f.bereich !== undefined)) ?? werkBlatt.flaechen.find((f) => f.a === a);
    if (!F) return null;
    const [x, y] = F.hin(X, Y);
    return { x, y };
  },
  /** welche Seite der Achse des Blatts `a` gerade zum Betrachter zeigt (+1 oder −1; Seite z, Front x, Top y) */
  flaecheVorn: (a: Flaeche['a']): number | null => werkBlatt.flaechen.find((f) => f.a === a)?.vorn ?? null,
  /** umgekehrt: welcher Ort im Blatt `a` unter dem Bildschirmpunkt liegt (S17, Probe) */
  flaecheHer: (a: Flaeche['a'], x: number, y: number): { X: number; Y: number } | null => {
    const F = werkBlatt.flaechen.find((f) => f.a === a);
    const XY = F?.her(x, y);
    return XY ? { X: XY[0], Y: XY[1] } : null;
  },
  /** S17: die Felder der Vier Ansichten (CSS-Pixel) und Zoom und Verschiebung je Feld */
  felderJetzt: () => (raum ? felder() : null),
  /** S20: der weiße Körper: an, wie deckend, in wie vielen Ansichten; Zeit des letzten Bilds (Rechnen, ms) */
  koerper: () => {
    const k = linienKoerper();
    return { an: koerperAn(), deckung: koerperDeckung, ansichten: k ? (k.ansichten?.length ?? 1) : 0, bildMs: stat.bildMs };
  },
  /** S18, S19: der Tropfen an der Ecke, der Zug an der Kreuzung, die freie Kreuzung, die Ecke der Kiste beim Aufklappen, der erlaubte Bereich */
  eck: () => ({
    ort: eckTropfenOrt(),
    zug: eckZug ? { art: eckZug.art, a: eckZug.a, von: eckZug.von, e: eckZug.e, kx: eckZug.kx, ky: eckZug.ky, fahrt: !!eckZug.fahrt, P0: eckZug.P0 } : null,
    kreuz: kreuzFrei,
    anker: faltAnker,
    bereich: raum ? vierFlaeche().r : null,
    teiler: { bx: teiler.bx, by: teiler.by },
    bild: vier > 1e-3 ? kreuzBild : null,
    kreis: ECK_KREIS * Math.min(W, H),
  }),
  einzelAbbildung: () => (ansicht !== 'raum' ? einzelAbbildung(ansicht) : null),
  feldBlick: () => JSON.parse(JSON.stringify(feldBlick)) as typeof feldBlick,
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
  /** wo ein Ort des Raums im Bild liegt (CSS-Pixel); der Zustand des Ablaufs (Blatt, Aufblasen, Raum, Ablassen) */
  weltImBild: (q: { x: number; y: number; z: number }): { x: number; y: number } => {
    const [x, y] = projizieren(new Vector3(q.x, q.y, q.z), vpJetzt());
    return { x: x / D, y: y / D };
  },
  zustand: (): string => zustand,
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
  blick: () => ({ ansicht, gewendet, flach, vier, gier: nutzer.gier, neigung: nutzer.neigung, massstab: massstab.jetzt * nutzer.zoom, schwung: schwung !== null, fahrt: ansichtFahrt !== null, wendet: wenden !== null, schwarz: kanteMitte, kanteSichtbar, rueckseite: rueckseite(ansicht), hinten: hintenJetzt?.zahl ?? 0, blatt: blattModus(), zoom: nutzer.zoom, schwenk: [nutzer.schwenkX, nutzer.schwenkY], stift: stiftGesehen, finger: finger.size, geste: geste !== null, vorKiste: vorKiste(nutzer.gier, nutzer.neigung), vorDreh: vorDreh !== null, vierWartet }),
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
  /** C2: die Richtung des letzten Punkts eines Entwurfs mit P, im Bild (CSS-Pixel vom Punkt aus); null ohne Entwurf */
  entwurfGriff: (): [number, number] | null => werkBlatt.entwurf()?.aus ?? null,
  /** C2: die Linie eines Loops, wie sie auf der Haut liegt (Werk, 3 je Probe; die gespeicherte Hälfte) */
  werkLinieLage: (id: number): number[] | null => {
    const l = werk.loops[werk.loopNr(id)];
    return l ? Array.from(l.ruhe) : null;
  },
  /** S15: der Lichtring jetzt: Proben, geschlossen, gespiegelt; seine Lage im Werk (3 je Probe) */
  lichtring: () => {
    const r = werkBlatt.lichtring();
    return r ? { proben: r.pos.length / 3, zu: r.zu, spiegeln: r.spiegeln, pos: Array.from(r.pos) } : null;
  },
  /** S14: Röntgen jetzt (0 … 1) und ob Verdecktes greifbar ist */
  roentgen: () => ({ wert: roentgen, greifbar: werkBlatt.roentgen(), fest: roentgenFest }),
  /** S13 (10): der Ansichts-Tropfen: zu sehen, seine Tropfen im Fenster (CSS-Pixel) mit Tiefe zur Kamera, was das Schild sagt */
  ansichtsTropfen: () => ansichtsTropfen.stand(),
  /** S13 (2): wie weit der Knopf eines Reglers (CSS-Auswahl) gerade gedehnt ist (1 = rund) */
  reglerDehnung: (auswahl: string): number => {
    const el = document.querySelector(auswahl);
    return el instanceof HTMLInputElement ? reglerDehnung(el) : 1;
  },
  /** S13 (4): wie viele Tropfen gerade zu neuen Kreuzungen fließen */
  verschmelzen: (): number => werkBlatt.verschmelzenTropfen(1).length,
  /** S13 (5): Bogenlänge und halbe Breite je Probe einer Linie (Loop-Kennung) auf der Fläche mit diesem Blatt, nicht gespiegelt (CSS-Pixel) */
  linienBreite: (id: number, a: Flaeche['a']) => {
    const li = werkBlatt.linien.findIndex((I) => I.id === id && !I.m && werkBlatt.flaechen[I.fl]?.a === a);
    const PR = werkBlatt.proben[li];
    return PR ? { s: Array.from(PR.s.subarray(0, PR.n)), halb: Array.from(PR.halb.subarray(0, PR.n)), stueckS: Array.from(PR.stueckS), laenge: PR.laenge } : null;
  },
  /** A2: Dehnung und Muster der Seifenhaut je Punkt der Anzeige (für Proben) */
  seifenhaut: () => werkHaut.musterStand(),
  /** S11: Ist der Stand des Werks so, dass er gesichert werden kann (die Prüfung der Ablage), und welche Punkte der Haut keinen Spiegelpartner haben */
  /** C1: der Stand des Werks als Datei (Base64), für Kernproben mit einem Stand aus dem Fenster */
  standGepackt: (): string => {
    const B = zusammen(packen(werk.standJetzt()));
    let t = '';
    for (let i = 0; i < B.length; i += 0x8000) t += String.fromCharCode(...B.subarray(i, i + 0x8000));
    return btoa(t);
  },
  /**
   * C1: die umgeschlagenen Dreiecke der Haut einzeln (wie `werk.umgeschlageneZahl` gezählt): Mitte, Fläche, kürzeste und längste Kante,
   * wie viele ihrer Ecken auf der Mittelebene liegen, die Fläche im Verhältnis zur mittleren Dreiecksfläche
   */
  umgeschlagen: () => {
    const h = werk.haut;
    const P = h.pos;
    const t = h.tri;
    const vn = new Float64Array(P.length);
    const fn = new Float64Array(t.length);
    let flaecheSumme = 0;
    for (let i = 0; i < t.length; i += 3) {
      const [a, b, c] = [3 * t[i]!, 3 * t[i + 1]!, 3 * t[i + 2]!];
      const [ux, uy, uz] = [P[b]! - P[a]!, P[b + 1]! - P[a + 1]!, P[b + 2]! - P[a + 2]!];
      const [vx, vy, vz] = [P[c]! - P[a]!, P[c + 1]! - P[a + 1]!, P[c + 2]! - P[a + 2]!];
      const f = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      flaecheSumme += 0.5 * Math.hypot(f[0]!, f[1]!, f[2]!);
      for (let x = 0; x < 3; x++) {
        fn[i + x] = f[x]!;
        for (const v of [a, b, c]) vn[v + x] = vn[v + x]! + f[x]!;
      }
    }
    const mittel = flaecheSumme / Math.max(1, t.length / 3);
    const aus: { mitte: number[]; flaeche: number; kurz: number; lang: number; aufMitte: number; ecken: number[]; linien: string[]; lagen: number[][] }[] = [];
    for (let i = 0; i < t.length; i += 3) {
      const e = [t[i]!, t[i + 1]!, t[i + 2]!];
      const [a, b, c] = e.map((v) => 3 * v) as [number, number, number];
      let dot = 0;
      for (let x = 0; x < 3; x++) dot += fn[i + x]! * (vn[a + x]! + vn[b + x]! + vn[c + x]!);
      if (!(dot < 0)) continue;
      const kante = (p: number, q: number): number => Math.hypot(P[p]! - P[q]!, P[p + 1]! - P[q + 1]!, P[p + 2]! - P[q + 2]!);
      const k = [kante(a, b), kante(b, c), kante(c, a)];
      aus.push({
        mitte: [0, 1, 2].map((x) => (P[a + x]! + P[b + x]! + P[c + x]!) / 3),
        flaeche: (0.5 * Math.hypot(fn[i]!, fn[i + 1]!, fn[i + 2]!)) / mittel,
        kurz: Math.min(...k),
        lang: Math.max(...k),
        aufMitte: e.filter((v) => Math.abs(P[3 * v + 2]!) < 1e-6).length,
        ecken: e,
        // je Ecke: die Linien, auf denen sie liegt (Kennung; gespiegelt mit ')
        linien: e.map((v) =>
          werk.loops
            .flatMap((l) => (l.proben.some((q) => q.ecken[0] === v && q.ecken[1] === v && q.ecken[2] === v) ? [`${l.id}`] : l.proben.some((q) => q.ecken[0] === q.ecken[1] && q.ecken[1] === q.ecken[2] && h.spiegel[q.ecken[0]] === v) ? [`${l.id}'`] : []))
            .join('+'),
        ),
        lagen: e.map((v) => [P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!]),
      });
    }
    return { zahl: aus.length, dreiecke: t.length / 3, mittel, liste: aus.slice(0, 40) };
  },
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
  /** eine geschlossene Silhouette setzen (CSS-Pixel des Blatts), wie mit P gezeichnet; `dazu`: auf dem Blatt eines neuen Objekts (nach dem Plus), die anderen Objekte bleiben */
  form(anker: { x: number; y: number; ein?: [number, number]; aus?: [number, number] }[], dazu = false): void {
    if (!dazu) neu();
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
  /** ein Ort des Raums in einem Feld der Vier Ansichten (CSS-Pixel), wenn sie aufgeklappt sind */
  weltImFeld(n: 'seite' | 'front' | 'top', p: { x: number; y: number; z: number }): { x: number; y: number } | null {
    if (vier < 0.9) return null;
    const F = felder();
    const [x, y] = imFeld(n, new Vector3(p.x, p.y, p.z), F, feldMassstab(F));
    return { x: x / D, y: y / D };
  },
  /**
   * Wie rund die Form des Werks ist (für die Probe der Start-Loops): Abstand ihrer Punkte von der Mitte ihres Kastens, im Raum:
   * kleinster, mittlerer, größter; dazu der mittlere längs der Achsen (näher als 20° an x, y oder z) und schräg dazwischen (näher
   * als 20° an einer Raumdiagonale).
   */
  radien: () => {
    const P = werk.haut.pos;
    const f = werkHaut.f;
    const k = werkMasseWeltAktiv();
    if (!k) return null;
    const cx = (k.cx - werkHaut.mitte.x) * f;
    const cy = (k.cy - werkHaut.mitte.y) * f;
    let min = Infinity;
    let max = 0;
    let summe = 0;
    const achse = { s: 0, n: 0 };
    const schraeg = { s: 0, n: 0 };
    const cos20 = Math.cos((20 * Math.PI) / 180);
    for (let i = 0; i < P.length; i += 3) {
      const x = P[i]! - cx;
      const y = P[i + 1]! - cy;
      const z = P[i + 2]!;
      const r = Math.hypot(x, y, z);
      min = Math.min(min, r);
      max = Math.max(max, r);
      summe += r;
      const ax = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) / (r || 1);
      const dg = (Math.abs(x) + Math.abs(y) + Math.abs(z)) / Math.sqrt(3) / (r || 1);
      if (ax > cos20) {
        achse.s += r;
        achse.n++;
      } else if (dg > cos20) {
        schraeg.s += r;
        schraeg.n++;
      }
    }
    return { min: min / f, mittel: summe / (P.length / 3) / f, max: max / f, achse: achse.s / Math.max(1, achse.n) / f, schraeg: schraeg.s / Math.max(1, schraeg.n) / f };
  },
  /** die Zeichnung auf dem Blatt: wie viele Linien, wie viele davon geschlossen */
  zeichnung: () => {
    const n = blatt.netzKopie();
    return { linien: n.linien.length, geschlossene: n.linien.filter((l) => l.zu && l.stuecke.length >= 2).length };
  },
  /** eine weitere geschlossene Linie auf dasselbe Blatt (Etappe 3: mehrere Silhouetten auf einem Blatt) */
  formDazu(anker: { x: number; y: number; ein?: [number, number]; aus?: [number, number] }[]): void {
    const n = blatt.netzKopie();
    const p0 = n.punkte.length;
    const m = anker.length;
    for (const a of anker) n.punkte.push({ x: a.x, y: a.y, sichtbar: true, verdeckt: false });
    n.linien.push({
      zu: true,
      punkte: anker.map((_, i) => p0 + i),
      knick: anker.map((a) => !a.ein && !a.aus),
      stuecke: anker.map((a, i) => {
        const b = anker[(i + 1) % m]!;
        return { g1x: a.aus?.[0] ?? (b.x - a.x) / 3, g1y: a.aus?.[1] ?? (b.y - a.y) / 3, g2x: b.ein?.[0] ?? (a.x - b.x) / 3, g2y: b.ein?.[1] ?? (a.y - b.y) / 3, art: 'umriss' as const };
      }),
    });
    blatt.verhalten.netzErsetzen(n);
    anstossen();
  },
  aufblasen,
  ablassen,
  neu,
  fassung: fassungSetzen,
  /** ein festes Material wählen (Name wie im Menü) oder mit null die Seifenhaut; zurück: was jetzt gilt */
  material: (m?: string | null): string => {
    if (m !== undefined) materialSetzen(m === null ? null : (MATERIALIEN.find((x) => x.toLowerCase() === m.toLowerCase()) ?? null));
    return material ?? FASSUNGEN[fassung]!;
  },
  /** Jelly und helles Solid: Zeiten des letzten Bilds (ms) und das Fenster, das der Renderer bekam (Gerätepunkte) */
  /** das grüne Material: Zeit des letzten Bilds (ms), Zahl der Bilder, WebGPU oder WebGL2, und ob seine Fläche zu sehen ist */
  gruen: () => ({ geladen: !!gruen, ...(gruen?.mess ?? {}), sichtbar: leinwandGruen.style.display !== 'none', deckung: Number(leinwandGruen.style.opacity || 1) }),
  gast: (genau?: boolean) => {
    if (genau !== undefined) gast.genau = genau;
    return {
      ...gast.mess,
      sichtbar: leinwandGast.style.display !== 'none',
      deckung: Number(leinwandGast.style.opacity || 1),
      gier: lageRaum?.gier ?? 0,
      neigung: lageRaum?.neigung ?? 0,
      /** wie weit das Bild des Gasts neben Ozzys Bild der Haut liegt (Gerätepunkte) */
      abweichung: gast.abweichung(kam.aktiv),
    };
  },
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
      /** Clipping: Reicht eine Hälfte über die Spiegelebene (Haut des Werks), und schneidet die Anzeige sie gerade ab? */
      ueberDerMitte: werk.ueberDerMitte(),
      spiegelSchnitt: werkHaut.spiegelSchnitt,
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
  /** B4: die gezeigte Haut als Zahl (Summe ihrer Lagen, Welt) und ob sie nach ⌘Z gerade zurückfließt: für die Probe des Rückflusses */
  hautStand: (mitProben = false) => {
    const P = werkHaut.netz?.pos;
    let summe = 0;
    if (P) for (let i = 0; i < P.length; i++) summe += Math.abs(P[i]!);
    const proben: number[] = [];
    if (P && mitProben) for (let v = 0; 3 * v + 2 < P.length; v += 23) proben.push(P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!);
    return { summe, fliesst: werkHaut.fliesst, version: werkHaut.version, punkte: P ? P.length / 3 : 0, proben };
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
