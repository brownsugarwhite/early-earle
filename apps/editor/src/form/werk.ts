// Das Werk (Ozzy, Phase 1, 16.11.2026): Zustand und Handgriffe einer Form, aus `kurven.ts` gelöst; ohne DOM und ohne three.js.
// Schnittplan: docs/look/ozzy/werk-schnittplan.md. Die Hülle (`kurven.ts`, Ozzy) setzt `anzeige` und liest den Zustand.
// Form zuerst (05.11.2026), Schritt 1 „Nur Loops“ (Fenster `kurven.html`, Florian): Die Kugel hat am Anfang keine Loops. Loops
// werden quer über den Körper geschnitten (in Seite, Front und Top) oder als geschlossene Form gezeichnet; es gibt keine offenen
// Linien. Griffe sind Kreuzungen von Loops (entstehen von selbst) und Punkte, die er auf eine Linie setzt (Doppelklick) oder mit
// einer Form zeichnet; sie lassen sich löschen. Ein ganzer Loop wird angeklickt und gezogen oder mit G/S/R geformt, mit O
// (Einflusskreis) wie in Blender. Der Umriss ist nur Shader. Die Haut löst `LoopZug` im Einflussbereich. Start: `?form=kugel|bohne`.
// (Der Beweis davor, „Kurven als Wahrheit“ mit dem Startumriss als Loop 0, steht in Commit bb0c837d.)
// Griffe (Florian, 05.11.): Jeder gewählte Punkt zeigt seine Bézier-Griffe (gespeichert, Teil A 06.11.); ein Griff biegt nur
// sein Stück. Glatt ● hält die Griffe gegenüber, an einer Ecke ◆ darf die Linie knicken (Doppelklick oder ⌥-Klick schaltet um);
// die Kreuzung mit einer Kante wird von selbst eine Ecke. Kante an/aus ist eine eigene Einstellung (Taste K). Wie in
// Illustrator gehen die Griffe mit ihrem Punkt (S/R drehen und skalieren sie mit), ein Punkt ändert nur die zwei Stücke bis zu
// seinen Nachbarn. Jedes Blatt hat einen eigenen Ausschnitt (Rad/Pinch zoomt, zwei Finger/mittlere Taste verschieben, Pos1).
// Das Netz verdichtet sich selbst (`verdichten`): nach jedem Zug, und bei weiten Zügen in Stufen, in denen der Bereich mitwächst.
// Spiegelpunkte (Ende eines Rings auf der Mittelebene) zeigen beide Griffe, der zweite ist das Spiegelbild; beide sind frei
// ziehbar (die Linie knickt dort spiegelgleich, der Punkt wird eine Ecke), glatt steht der Griff senkrecht zur Mittelebene.
// Doppelklick auf einen Griff schaltet seinen Punkt um (an Kreuzungen liegt oft der Punkt des anderen Loops obenauf).
// Maul (Florian: „Mund = Loop“): eine schmale Form ums Maul (F, vorn über den Umriss oder über die Mitte) wird mit dem Regler „Maul“
// im 3D-Blatt das Maul. Ihr Inneres ist die Öffnung, ihr fernster Punkt der Mundwinkel ◆; die Lippen bleiben Loops wie die anderen.
// Das Netz bleibt geschlossen (die Öffnung wird nicht gezeigt), die Grundform zeigt das Maul zu, so wie es gezeichnet ist.
// Die Linie ist ihr Pfad (07.11., Florian: „ja genau zur Bézier-Kurve machen“): In der Grundform liegt jede Linie genau auf dem
// Bézier-Pfad aus ihren Punkten und Griffen, die Haut folgt; ein neuer Loop springt beim Anlegen örtlich darauf (ohne Zusatzpunkte;
// `?punkte=noetig` zum Vergleich), eine Kreuzung ist ein Ort, O formt über Punkte und Griffspitzen. Die Blätter zeichnen die Linie als
// ihren Bézier-Pfad, und nach einem Zug wird das Netz an den Linien so fein, dass es höchstens MK/40 von ihrer Kurve abweicht (08.11.,
// kleine Details waren eckig).
// Fressen-Pose (Florian: „in der Pose ganz normal die Bézier-Punkte bearbeiten und den Blendshape erstellen“): Knopf „Fressen“ oder
// die Regler Maul und Kopf (Unterkiefer und Schädel als Knochen) zeigen die Pose. Darin wirken alle Werkzeuge wie in der Grundform
// auf das, was zu sehen ist; gespeichert wird der Unterschied zur Grundform vor den Knochen (Blendshape, `poseLoop.ts`). Grundform
// und Pose haben dasselbe Netz; neue Punkte oder Loops gibt es in beiden, die Grundform ändern sie nicht.

import {
  type Ansicht,
  type DirektLoeser,
  type GriffVersatz,
  type HautArt,
  type Einbettung,
  type HautGewichte,
  type HautVorlage,
  type Kurve,
  type Loop,
  type LoopPunkt,
  LoopZug,
  loopStruktur,
  type MaulAmLoop,
  type UmrissPunkt,
  type V3,
  type ZeichnungsStueck,
  bereichUm,
  direktLoeserFuer,
  type AbzweigPunkt,
  abzweigen,
  eckenAuto,
  einfluss,
  ergaenzen,
  festlegen,
  formAusZeichnung,
  griffeAbbilden,
  griffeAnlegen,
  griffeAusZeichnung,
  griffeAusrichten,
  griffeBei,
  griffeErgaenzen,
  griffeNach,
  griffeUebernehmen,
  griffZiehen,
  linieKreuztSich,
  griffeProportional,
  type Haut,
  hatGriffe,
  hatPfad,
  kanteBei,
  kantenKnicken,
  istEcke,
  istSichtbar,
  istEckeVonSelbst,
  hautAus,
  hautFrei,
  spiegelAnwenden,
  hautNormalen,
  knochenDrehen,
  knochenWinkel,
  kreuzungenZwischen,
  hautSeiten,
  kurveAbtasten,
  loopAusSchnitt,
  griffeAufStrich,
  loopAusVorhang,
  stelleImBlatt,
  vorhangWeg,
  wendeStellen,
  loopEinsetzen,
  vorlageAusSystemen,
  hinterDerMitte,
  mitteFestmachen,
  maulFormenSchritte,
  maulAmLoop,
  maulGeformtAmLoop,
  mittlereKante,
  mundwinkelProbe,
  pfadAbweichung,
  pfadKanten,
  pfadLagen,
  pfadParameter,
  pfadVersatz,
  polygonFlaeche,
  punktEinfuegen,
  punkteLoeschen,
  ringEnde,
  rundAusSeite,
  stueckNaechstes,
  stueckPunkt,
  umrissAbtasten,
  nadelnZusammenlegen,
  verdichten,
  type Verdichtet,
  type ZerlegungsDaten,
  einbettungAuswerten,
  systemAusDaten,
  verschiebungLaengs,
  einsetzenGrund,
  endeAufMitte,
  strahl,
  istMaulLinie,
  maulLinieAusZeichnung,
  obereLippe,
  zwillinge,
  zwillingeAngleichen,
  zwillingeFestlegen,
  zwillingeSetzen,
} from '@ee/shape/dicht';
import type {
  V2,
} from '@ee/shape';
import {
  type WesenStand,
  auskunft,
  entpacken,
  packen,
  pruefen,
} from './ablage';
import { type NahtArt, hautImMass, loopImMass, manifoldLaden, objekteVerbindenMit } from './naht';
import { FRESSEN_ANFANG, KIEFER_MAX, MAUL_HAAR, kieferSeiten, kieferTropfenRuhe, kieferWinkel, maulEchtAmLoop, maulLage, maulSchneidenMit } from './maulEcht';
import {
  type AufraeumAuftrag,
  type AufraeumErgebnis,
  type VerdichtenOptionen,
  type VerfeinerAuftrag,
  type VerfeinerErgebnis,
  type Zwischenstand,
  gewichteAusFlach,
  hautAusFlach,
  hautFlach,
  nachbarnFlach,
} from './verfeinern';

/** Zustand, den Werk und Hülle beide setzen (beim Schnitt aus `kurven.ts` hierher geholt) */
export const G = {
  auswahl: [] as Wahl[],
  modus: 'frei' as 'frei' | 'loop' | 'form' | 'stift',
  oAn: false,
  radius: 90,
  meldung: '',
  maul: null as MaulZustand,
  neuZeichnen: true,
  maulGezeigt: null as { m: MaulAmLoop; innenPositionen: Float32Array; innenNormalen: Float32Array; innenIndizes: Uint32Array } | null,
  normalenGezeigt: null as { haut: Haut; nor: Float64Array } | null,
  glattVoll: false,
  entwurf: null as { a: Ansicht; x0: number; y0: number; x1: number; y1: number } | null,
  spur: null as { a: Ansicht; p: [number, number][] } | null,
  davonProbe: false,
  fehlerProbe: false,
  eingetroffen: null as { netz: Haut; fertig: Verfeinert; daten: ZerlegungsDaten[] } | null,
  aufraeumen: null as { id: number; netz: Haut; stand: string; t0: number; setzen: boolean; nurInRuhe: boolean; verdichten: boolean } | null,
  zwischenstand: null as Zwischenstand | null,
  aufgeraeumt: null as AufraeumErgebnis | null,
  gegriffen: null as { a: Ansicht; X: number; Y: number; m: boolean; griff: { id: number; i: number; seite: 'ein' | 'aus' } | null; seit: number } | null,
  /**
   * `vorn` (18.11.): welche Seite der Achse des Blatts zum Betrachter zeigt (+1 oder −1; Seite z, Front x, Top y), wie Ozzys Flächen
   * sie führen. Sie zählt nur an einer freien Form (`vonHinten`): Dort liegt eine Form auf der Seite der Haut, die man sieht.
   */
  stift: null as { a: Ansicht; anker: StiftAnker[]; zieht: boolean; vorn?: number } | null,
  abzweig: null as {
  a: Ansicht;
  von: AbzweigOrt;
  /** die Taste ist seit dem ersten Druck noch unten */
  zieht: boolean;
  /** nach dem ersten Klick: der Punkt, an dem sie beginnt, und der Stand davor (für ⌘Z und den Abbruch) */
  start: { id: number; p: LoopPunkt; m: boolean } | null;
  vorher: Schnappschuss | null;
  /** die gesetzten Punkte dazwischen; `ankerZieht`: Der letzte wird gerade gezogen (sein Griff) */
  anker: StiftAnker[];
  ankerZieht: boolean;
} | null,
  maus: null as { a: Ansicht; X: number; Y: number } | null,
  ablageName: '',
  /**
   * Spiegel mit Clipping (18.11., Plan „Objekte, Spiegel und Nähte“; Florian: „Mit clipping verschmelzen die spiegelkanten zu einem
   * edgeloop … nach dem loslassen entsteht der edgeloop an der spiegelkante von selbst und ist ausgewählt“): Was ein Zug über die
   * Spiegelebene führt, verschmilzt dort beim Loslassen mit seinem Spiegelbild (`mitteFest`), und die Anzeige schneidet bis dahin
   * jede Hälfte an der Ebene ab. Aus (`?clipping=0`, später der Spiegel-Knopf): Die Hälften dürfen sich überragen, nichts verschmilzt
   * von selbst (im Prüffenster gilt dann die Regel vom 13.11.: der Punkt hinter der Mitte ist markiert, ihn löschen macht fest).
   */
  clipping: new URLSearchParams(location.search).get('clipping') !== '0',
  /**
   * Eine freie Form (ein ganzes Netz ohne Spiegelpaare, `istFrei`) zeigt ihr Spiegelbild (18.11., „Spiegel an“ an einem ganzen
   * Objekt): Das Spiegelbild ist nur Anzeige, gerechnet wird das eine Netz. Aus: „Spiegel aus“. Eine verschmolzene Form hat ihr
   * Spiegelbild immer (es ist die andere Hälfte ihres Netzes).
   */
  spiegelbild: true,
};

/** Was das Werk von der Anzeige braucht; die Hülle (oder Ozzy) setzt es. Bis dahin tut es nichts (`skala`: 1). */
export interface Anzeige {
  geometrieNeu: () => void;
  reglerZeigen: () => void;
  allesZeigen: () => void;
  skala: (a: Ansicht) => number;
  ausschnittGeaendert: (a: Ansicht) => void;
  statusZeigen: () => void;
  eingabenSperren: (an: boolean) => void;
  hautZeigen: () => void;
  baenderZeigen: () => void;
  blattZeichnen: (a: Ansicht) => void;
  glattInRuhe: () => void;
  rendern: () => void;
}
export const anzeige: Anzeige = {
  geometrieNeu: () => {},
  reglerZeigen: () => {},
  allesZeigen: () => {},
  skala: () => 1,
  ausschnittGeaendert: () => {},
  statusZeigen: () => {},
  eingabenSperren: () => {},
  hautZeigen: () => {},
  baenderZeigen: () => {},
  blattZeichnen: () => {},
  glattInRuhe: () => {},
  rendern: () => {},
};


/** Auswahl: ein Punkt (i ≥ 0) oder ein ganzer Loop (i = −1), Loop über seine Kennung */
export type Wahl = { l: number; i: number };
/**
 * Kleines Rechennetz (Plan vom 12.11., Schritt 2): Das Startnetz hat ein Drittel der Dreiecke bis dahin (die Startkante ist rund
 * √3-mal so lang), dichter wird das Netz, wo die Form es braucht: an den Linien nach ihrem Pfad (`GENAU`) und in der Haut, wo sie
 * gekrümmt ist (`GENAU_HAUT`). Glatt macht die Form seit Schritt 1 die Anzeige. Eine Form mit kürzerer Startkante (bis zum 12.11.
 * gesichert oder behalten) wird beim Übernehmen auf die Startkante dieser Adresse gebracht (`netzVergroebern`).
 * `?netz=dicht`: das Netz wie bis zum 12.11. (überall gleich dicht, 6 000 Dreiecke bestellt); dort bleibt eine solche Form, wie sie
 * ist.
 */
export const NETZ_KLEIN = new URLSearchParams(location.search).get('netz') !== 'dicht';
/** bestellte Dreiecke des Startnetzes (Surface Nets geben etwa das 1,5-Fache); `?dreiecke=<n>` für Messungen */
export const DREIECKE = Number(new URLSearchParams(location.search).get('dreiecke') ?? (NETZ_KLEIN ? 2000 : 6000));
/**
 * Glatte Anzeige (Plan vom 12.11., Schritt 1; Florian: „Spalte 3 einbauen“, am selben Tag als Standard übernommen): Die Haut wird
 * nur für die Anzeige verfeinert (`glattPlan.ts`: Lagen ohne Glätten, die Fläche geht durch alle Rechenpunkte, Kanten auf Linien
 * liegen auf ihrem Pfad; die Normalen je Rechenpunkt gemessen und beruhigt, `GLATT_RUHE`), die Farbstufe ist einen Bildpunkt breit
 * geglättet, und an der Spiegelebene wird je Bildpunkt geschnitten statt je Netzpunkt. An der Rechnung ändert das nichts.
 * `?anzeige=grob` zeigt zum Vergleich die Rechenpunkte selbst, wie bis zum 12.11.
 */
export const GLATT = new URLSearchParams(location.search).get('anzeige') !== 'grob';
/**
 * Stufen der Verfeinerung (jede vervierfacht die Dreiecke), `?fein=0|1|2|3` legt sie fest. Ohne Angabe: in der Ruhe zwei Stufen,
 * wenn es nicht mehr als `GLATT_HOECHSTENS` Dreiecke werden, sonst eine. Solange sich die Haut ändert, dieselben Stufen, wenn es
 * nicht mehr als `GLATT_IM_ZUG` Dreiecke werden, sonst so viele weniger, dass es passt; `GLATT_RUHE_MS` nach der letzten Änderung
 * kommen dann die Stufen der Ruhe. Gemessen am 12.11. mit dem kleinen Rechennetz (Schritt 2): Zwei Stufen kosten im Zug am
 * „teat firefish“ (7 762 Punkte, 249 792 Dreiecke gezeigt) 4,1 ms je Bild und 1,9 ms für die Linienbänder, am „strange bird“
 * (4 740 Punkte) 2,5 und 1,4 ms; der Abstand der Bilder bleibt bei 17 ms. Bis Schritt 2 gab es im Zug höchstens eine Stufe und
 * über 6 000 Punkten keine (eine Stufe kostete am Vogel mit 16 010 Punkten 7,8 ms je Bild bei einer Löserrunde von 17 ms).
 */
export const FEIN = Number(new URLSearchParams(location.search).get('fein') ?? -1);
export const GLATT_IM_ZUG = 260_000;
export const GLATT_HOECHSTENS = 700_000;
/** Runden je Mausbewegung und beim Loslassen */
export const RUNDEN_ZUG = 2;
export const RUNDEN_ENDE = 4;
/**
 * Aus den Kurven (über die ganze Haut) rechnet der Löser im Bildtakt, nicht im Mausereignis (10.11., Gegenprüfung Schritt G3,
 * `zugRechnen`): je Bild mindestens eine Runde und so viele weitere, wie in `BUDGET_MS` passen; auch wenn die Maus ruht, bis sich
 * die Form in einer Runde um weniger als `RUHE` Einheiten bewegt (0,05 Einheiten = 0,14 px bei 300 %; gemessen längs der
 * Flächennormalen, `rundeMitWeg`). Vorher gab es je Mausbewegung eine Runde (eine zweite nur bei kleinen Netzen) und beim Loslassen
 * vier auf einmal: Der Rest wurde genau beim Loslassen sichtbar.
 */
export const BUDGET_MS = Number(new URLSearchParams(location.search).get('budget') ?? 12);
/**
 * Flüssig zuerst (13.11., mit der Rechnung auf der Hälfte): Eine weitere Runde im selben Bild gibt es nur, wenn sie samt dem, was das
 * Bild sonst kostet (Haut und Blätter anzeigen, zeichnen; gleitend gemessen in `bildRestMs`), in `BILD_MS` passt. Anlass: Am „strange
 * bird“ (7 400 Punkte) passten mit der kürzeren Runde zwei in die 12 ms, das Bild dauerte dann mit der Anzeige länger als ein
 * Bildschirmtakt, und jedes zwanzigste kam erst nach 35 ms statt nach 21. Die erste Runde läuft immer. `?budget=<ms>&bildms=0`: wie
 * vorher nur das feste Budget.
 */
export const BILD_MS = Number(new URLSearchParams(location.search).get('bildms') ?? 14.5);
export let bildRestMs = 6;
/** in diesem Bild hat der Zug gerechnet: so lange (für `bildRestMs`) */
export let bildGerechnetMs = -1;
/**
 * Eine Hülle, die erst nach `bildRechnen` zeichnet (Ozzy), meldet hier nach jedem Bild, was es ohne die Runden des Zugs gekostet hat
 * (ms); das zählt dann statt der Messung in `bildRechnen`. Ohne die Meldung fiel `bildRestMs` dort gegen null, und das Werk rechnete
 * bis `BUDGET_MS` je Bild (17.11., Plan „Ozzy stabil und schnell“, A1). `null`: wieder selbst messen (das Prüffenster meldet nichts).
 */
let bildRestGemeldet: number | null = null;
export function bildRestMelden(ms: number | null): void {
  bildRestGemeldet = ms;
}
export const RUHE = 0.05;

export const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
/** Kopf über Bauch: zwischen ihnen eine Einbuchtung von vorn (Schnauze links) */
export const BOHNE: UmrissPunkt[] = [
  { x: 150, y: 0 },
  { x: 80, y: 130 },
  { x: -40, y: 150 },
  { x: -150, y: 120 },
  { x: -200, y: 60 },
  { x: -170, y: 22 },
  { x: -110, y: 24 },
  { x: -50, y: 15 },
  { x: -110, y: 4 },
  { x: -180, y: -40 },
  { x: -120, y: -130 },
  { x: 0, y: -150 },
  { x: 110, y: -110 },
];
export const FORMEN: Record<string, UmrissPunkt[]> = { kugel: kreis(150), bohne: BOHNE };
export const startUmriss = FORMEN[new URLSearchParams(location.search).get('form') ?? 'kugel'] ?? kreis(150);

// ---------- Haut und Loops ----------

export const netz = rundAusSeite(startUmriss, { dreiecke: DREIECKE });
/** die Haut; jeder neue Loop wird als Kette von Kanten eingesetzt (die Haut wird dabei ersetzt) */
export let haut: Haut = hautAus(netz.positionen, netz.indizes);
/**
 * mittlere Kante des Startnetzes: das Maß für Verdichten, Kreuzungen und die Genauigkeit der Linien. Gehört zum Wesen (ein geladenes
 * bringt seines mit, `standAnwenden`), nicht zur Adresse.
 */
export let MK = mittlereKante(haut);
/** die Startkante dieser Adresse (die des Startnetzes): Auf sie wird eine Form mit feinerem Netz gebracht (`netzVergroebern`) */
export const MK_START = MK;
/** so nah müssen sich zwei Loops kommen, damit sie sich kreuzen */
export let TOL = 0.25 * MK;

export let loops: Loop[] = [];
export let naechsteId = 1;
export let naechsteKreuzung = 1;
/* in G: auswahl */
/* in G: modus */
/* in G: oAn */
/* in G: radius */
/* in G: meldung */
/** Das Maul: der Loop, dessen schmale Form die Öffnung ist. Der Mundwinkel ist ein Punkt dieses Loops (`mundwinkel`). */
/**
 * Das Maul der Form: die Kennung seiner Lippe. `echt`: als echte Form geschnitten (`maulSchneiden`), auch mit getrennten Lippen;
 * `ersteUnten`: Die erste Hälfte der Kette der Lippe ist die Unterlippe (beim Schneiden gelesen und gemerkt: Getrennt gezogen
 * sagt es die Lage nicht mehr sicher).
 */
export type MaulZustand = { id: number; echt?: true; ersteUnten?: boolean; zaehne?: MaulZaehne } | null;
/**
 * Eine Zahnreihe (Plan „Maul, Zähne, Zunge“, Etappe 5): wie viele Zähne, ihre Größe (1 = ein Zahn füllt seinen Platz), ihre
 * Neigung nach außen (Bogenmaß), wie viel kleiner sie nach hinten werden (0 … 0,9), wie weit die Reihe nach hinten reicht (Anteil
 * der Lippe), ihr Sitz (Abstand von der Lippe in Breiten des Zahnfleischs) und ihre Vorlage (Nummer in `ZAHN_FORMEN`).
 * `eigen`: was einzelne Zähne anders haben als ihre Reihe, je Nummer des Zahns (0 … anzahl − 1, von einem hinteren Ende der Reihe
 * um die Spitze zum anderen; das Spiegelbild von i ist anzahl − 1 − i). Wer die Anzahl ändert, lässt `eigen` fallen. `eigen` wird
 * nie am Ort geändert (jede Änderung ist ein neues Objekt: Die Schritte für ⌘Z teilen es sich).
 */
export type ZahnReihe = { anzahl: number; groesse: number; neigung: number; verlauf: number; bis: number; sitz: number; form: number; eigen?: Record<number, ZahnEigen> };
/**
 * Ein einzelner Zahn gegen seine Reihe: gerückt längs der Reihe nach hinten (`ds`, Anteil der Reichweite) und zur Tiefe des Mauls
 * (`dz`, Breiten des Zahnfleischs), mit eigener Vorlage, eigenem Faktor der Größe, oder gezogen (`weg`: Dort ist eine Lücke).
 */
export type ZahnEigen = { ds?: number; dz?: number; form?: number; faktor?: number; weg?: true };
/** die zwei Reihen und, wenn sie eine eigene trägt, die Farbe der Zähne (`#rrggbb`; fehlt: Elfenbein) */
export type MaulZaehne = { oben: ZahnReihe; unten: ZahnReihe; farbe?: string };
/* in G: maul */
/**
 * Die Fressen-Pose: Knochen (Grad) und Blendshape, je Punkt der Haut die Verschiebung gegen die Grundform vor den Knochen (null:
 * keiner).
 */
/** je Linie der Versatz ihrer Punkte und Griffe gegen die Grundform (in der Ruhe der Pose); fehlt eine Linie: ohne Versatz */
export type PoseVersatz = { d: V3; ein: V3 | null; aus: V3 | null };
/** `laenge` und `s`: Länge der Linie und Stelle jedes Punkts, als der Versatz gemerkt wurde (fehlen in Ständen vom 14.11. vormittags) */
export type PoseLinie = { id: number; laenge?: number; punkte: (PoseVersatz & { s?: number })[] };
export type PoseStand = { kiefer: number; schaedel: number; delta: Float64Array | null; linien?: PoseLinie[] | null };
export let pose: PoseStand = { kiefer: 30, schaedel: 0, delta: null };
/** In der Pose: die Grundform. `haut` und `loops` sind dann die Pose, wie sie zu sehen ist (dasselbe Netz, posierte Lagen). */
export let grund: { haut: Haut; loops: Loop[] } | null = null;
/**
 * Die Pose zeigen (Schritt 5, 14.11.): In der Pose sind `haut` und `loops` die Ruhe der Pose (Grundform plus Blendshape), mit ihr
 * wird gerechnet. Die Knochen drehen nur, was gezeigt wird: Solange gezeichnet wird (`alsAnzeige`), stehen in `haut` und `loops`
 * die gedrehten Kopien, und `inAnzeige` ist wahr.
 */
export let inAnzeige = false;
export let anzeigeHaut: { von: Haut; haut: Haut } | null = null;
/** solange `alsAnzeige` zeichnet: die Linien der Ruhe, die Griffe eines laufenden Zugs in der Ruhe und die Knochen (sonst null) */
export let anzeigeVon: {
  loops: Loop[];
  griffeNeu: ({ ein: V3; aus: V3 }[] | null)[] | null;
  theta: Float64Array;
  G: V2;
  /** je Linie, einmal je Zeichnen gerechnet: ihre gebogenen Stücke (`stueckeGezeigt`) */
  gebogen: Map<number, (V3[] | null)[] | null>;
} | null = null;
/** nach jedem Zug verdichten (`?verdichten=0` schaltet es zum Vergleich ab) */
export const VERDICHTEN = new URLSearchParams(location.search).get('verdichten') !== '0';
/** die Krümmung der Haut folgt den Loops (`?kruemmung=0`: jeder Punkt behält seine, zum Vergleich) */
export const KRUEMMUNG = new URLSearchParams(location.search).get('kruemmung') !== '0';
/**
 * Wie die Haut zwischen den Loops entsteht (Beweis B, 06.11.): aus den Kurven = bei jedem Zug über die ganze Haut neu aus den Loops
 * gerechnet, ohne Gedächtnis (`HautAusKurven`, wie FiberMesh); `?haut=gedaechtnis` = jeder Punkt behält die Krümmung beim Anfassen, so
 * weit die Loops sie nicht vorgeben, gelöst im Bereich des Zugs (bis 06.11., zum Vergleich). In der Pose immer mit Gedächtnis.
 */
export const HAUT: HautArt = new URLSearchParams(location.search).get('haut') === 'gedaechtnis' ? 'gedaechtnis' : 'kurven';
/**
 * Wie die Haut aus den Kurven die Krümmung misst und verteilt (08.11., Beweis, Florian: „Form unabhängig vom Netz, Sprung beim
 * Loslassen höchstens ein halber Bildpunkt“): `?gewichte=geometrie` = nach der Geometrie (Laplace–Beltrami auf der intrinsischen
 * Delaunay-Triangulierung); dann hängt die Form nicht mehr am Netz und springt nicht, wenn es sich nach dem Zug verdichtet. Standard
 * bleibt bis zu Florians Wort das Mittel der Nachbarn (Ohr bei schnellem Zug und Linse damit etwas schlechter, Planseite).
 */
export const GEWICHTE: HautGewichte = new URLSearchParams(location.search).get('gewichte') === 'geometrie' ? 'geometrie' : 'gleich';
/**
 * Beweis „Linien mit Richtung“ (09.11.): `?richtung=1` = jede Linie gibt der Haut ihre Richtung vor (aus den Kreuzungen und der
 * Mittelebene, dazwischen gleichmäßig; `dicht/richtung.ts`), die Krümmung wird je Seite der Linie gemessen, die Punkte neben der Linie
 * liegen auf ihrer Ebene. Nur aus den Kurven.
 */
export const RICHTUNG = new URLSearchParams(location.search).get('richtung') === '1';
/** Weg a (09.11.): `?maxnormalen=1` = im Maß des Lösers die Normalen nach Max (sonst wie heute) */
export const MAXNORMALEN = new URLSearchParams(location.search).get('maxnormalen') === '1';
/**
 * Vorsicht bei Unruhe im Löser (10.11., `ausKurven.ts`): Schießt ein Schritt über das Ziel hinaus, wird er zurückgenommen und
 * halbiert; hilft das nicht, bleibt die Haut bei ihrer ruhigsten Lage stehen. `?vorsicht=0`: ohne (wie bis zum 10.11.).
 */
export const VORSICHT = new URLSearchParams(location.search).get('vorsicht') !== '0';
/** `?vorsichtlaut=1` (für Proben): Jedes Eingreifen der Vorsicht, im Fenster und im Hintergrund, steht als Fehler in der Konsole */
export const VORSICHT_LAUT = new URLSearchParams(location.search).get('vorsichtlaut') === '1';
/** `?davon=0`: das Fenster nimmt einen Zug nicht zurück, wenn die Haut davonläuft (wie bis zum 10.11.; nur zum Vergleichen) */
export const DAVON_SCHUTZ = new URLSearchParams(location.search).get('davon') !== '0';
/**
 * Normalfluss im Löser (11.11., `ausKurven.ts`): Die Haut folgt den Linien, und die Korrektur der Krümmung bewegt ihre Punkte nur
 * senkrecht zur Fläche. Der Löser rechnet so von selbst, wenn ein Loop nur auf der Haut liegt (nicht eingesetzt); `?normalfluss=1`
 * immer, `?normalfluss=0` nie (zum Vergleichen).
 */
export const NORMALFLUSS = new URLSearchParams(location.search).get('normalfluss');
/**
 * Die Rechnung auf der Hälfte (13.11., Plan Schritt 4b; `HautOptionen.halb`): Die Grundform ist spiegelgleich, der Löser löst zwei
 * halb so große Systeme statt eines ganzen und verteilt die Krümmung auf der Hälfte; die Form ist dieselbe. Das Netz im Fenster
 * bleibt ganz (Verdichten, Anzeige, Sichern unverändert). Standard; `?halb=0` rechnet zum Vergleichen über die ganze Haut.
 * Gemessen am 13.11. im Fenster an „teat firefish“ (11 400 Punkte): Rechnen je Bild 10,3 → 7,1 ms, Bilder im Median alle 16 statt
 * 18 ms; im Kern Zerlegen rund 50 %, die Häute höchstens 0,08 auseinander (`scripts/pruefen/form-halb.ts`).
 */
export const HALB = new URLSearchParams(location.search).get('halb') !== '0';
export const RICHTUNG_OPT: { richtung?: boolean; maxNormalen?: boolean; vorsicht?: boolean; normalfluss?: boolean; halb?: boolean } = {
  ...(HALB ? { halb: true } : {}),
  ...(RICHTUNG ? { richtung: true } : {}),
  ...(MAXNORMALEN ? { maxNormalen: true } : {}),
  ...(VORSICHT ? {} : { vorsicht: false }),
  ...(NORMALFLUSS === '1' ? { normalfluss: true } : NORMALFLUSS === '0' ? { normalfluss: false } : {}),
};
/** Der Zug löst nur einen Bereich um die bewegten Stellen (mit Gedächtnis und in der Pose); aus den Kurven die ganze Haut */
/**
 * Die Pose rechnet wie bis zum 14.11. (im Bereich, die Linien nicht genau ihr Pfad, ohne Setzen und Aufräumen): nur noch am Maul aus
 * der schmalen Form. Seine verborgene Öffnung verträgt die Rechnung über die ganze Haut nicht (Plan, Schritt 5, Etappe 1: Ein Zug an
 * der Lippe nahm die Haut fern vom Maul mit). An einem geformten Maul ist die Ruhe der Pose eine Form wie die Grundform: dieselbe
 * Rechnung, dieselben Linien (Etappe 2b).
 */
export const altePose = (): boolean => grund !== null && !maulIstGeformt();
/** so weit darf die Haut der Pose beim Betreten neben ihren Linien liegen, bevor sie daraufgesetzt wird */
export const POSE_GENAU = 0.05;
export const mitBereich = (): boolean => altePose() || HAUT !== 'kurven';
/**
 * „Form halten“ (Plan vom 12.11., Anhang A.3: B als Schalter, 13.11.). An: Ein Zug bewegt die Haut direkt mit den Linien (Löser
 * `direkt` im Kern, `direktZug.ts`). Was schon Haut ist, behält seine Wölbung, nichts rundet neu, hin und zurück gibt dieselbe
 * Haut. Nach dem Loslassen wird nur verdichtet; die heutige Rechnung setzt nichts, auch nicht nach einem neuen Loop. Im Zug wird
 * nicht verfeinert. Nur in der Grundform. Neue Haut runden kann dieser Löser nicht (aus der Kugel gezogen entsteht ein Keil).
 * Florian hat es am 13.11. im Bau-Fenster ausprobiert: „Gefällt nicht“. Knopf und Taste sind deshalb wieder weg; der Weg bleibt
 * nur zum Nachrechnen hinter `?ziehen=direkt` (Probe `form-halten-probe.mjs`, Haken `__kurven.halten`).
 */
export let direktAn = new URLSearchParams(location.search).get('ziehen') === 'direkt';
export const direktGilt = (): boolean => direktAn && !mitBereich();
/** der vorbereitete Löser `direkt` für den Stand von jetzt (das Greifen wartet dann nicht auf das Zerlegen) */
export let direktBereit: { stand: string; haut: Haut; loeser: DirektLoeser } | null = null;
/** so lange hielt das letzte Vorbereiten den Hauptthread an (ms, zum Messen) */
export let letztesDirektBereiten = 0;
/** den vorbereiteten Löser nehmen, wenn er zum Stand von jetzt gehört (er gilt für einen Zug) */
export function direktNehmen(): DirektLoeser | null {
  const b = direktBereit;
  direktBereit = null;
  return b && b.haut === haut && b.stand === standZahl() ? b.loeser : null;
}
/** in der Ruhe: den Löser `direkt` für den Stand von jetzt anlegen (einmal je Stand; nicht, solange noch verdichtet oder gesetzt wird) */
export function direktBereiten(): void {
  if (!direktGilt() || zug || nachlauf || ruheOffen || (G.aufraeumen && (G.aufraeumen.verdichten || G.aufraeumen.setzen))) return;
  const stand = standZahl();
  if (direktBereit && direktBereit.haut === haut && direktBereit.stand === stand) return;
  const t0 = performance.now();
  direktBereit = { stand, haut, loeser: direktLoeserFuer(haut, loops) };
  letztesDirektBereiten = Math.round(performance.now() - t0);
}
/**
 * Die Linie ist ihr Pfad (07.11., Florian: „ja genau zur Bézier-Kurve machen“): In der Grundform ist das Ziel jeder Probe eines Loops
 * mit Pfad genau der Pfad an ihrer Stelle, die Haut folgt, und die Punkte bleiben, wohin sie gezogen werden. In der Pose (ihre Linien
 * sind gedrehte Linien der Grundform, die Griffe daran abgelesen) folgen die Linien wie bisher den Änderungen ihres Pfads.
 */
export const exakt = (l: Loop): boolean => !altePose() && hatPfad(l);
/**
 * Zum Vergleich (`?punkte=noetig`): Ein geschnittener oder mit F gezeichneter Loop bekommt beim Anlegen Punkte, bis seine Linie höchstens
 * 0,05 Kanten (≈ 0,4) neben ihrem Pfad liegt. Florians Wahl ist ohne Zusatzpunkte.
 */
export const PUNKTE_NOETIG = new URLSearchParams(location.search).get('punkte') === 'noetig';
/** Nach einem Schritt: Ruhe der Linien; die Punkte bleiben (Grundform) oder werden von der Linie abgelesen (Pose) */
export function festlegenAlle(): void {
  for (const l of loops) festlegen(haut, l, !exakt(l));
}
/** Runden, wenn die Haut ohne Zug neu gerechnet wird (nach einer Kante oder dem Löschen) */
export const RUNDEN_NEU = 12;
/**
 * auch verdichten, wo sich die Fläche stark dreht (`?winkel=1`, Versuch): an einem langen Lappen gemessen schlechter (14 statt 4
 * umgeschlagene Dreiecke), an einem dicken gleich; deshalb aus
 */
export const WINKEL = new URLSearchParams(location.search).get('winkel') === '1';
/**
 * Kanten kürzer als dieser Anteil der Startkante werden nach einem Zug zusammengelegt, auf einer Linie (Kette) nur unter der
 * Hälfte davon (`?kurz=0` schaltet es zum Vergleich ab). Gemessen mit der Maus (`form-explosion-probe.mjs`, Knicke über 60° /
 * umgeklappt): langer Hammer 79/26 → 7/0, Schlaufe 46/16 → 14/2, Rüssel mit gedrehtem Griff 36/6 → 13/0; mit ⅓ bzw. 0,4 im Kern
 * schwächer.
 */
export const KURZ = Number(new URLSearchParams(location.search).get('kurz') ?? 0.5);
/**
 * Genauigkeit der Linien im Netz als Anteil der Startkante (08.11., Florian: „warum es ungenau und eckig wird, wenn ich kleine Details
 * rausziehe“): Nach einem Zug wird eine Kante einer Linie geteilt, wo die Linie zwischen ihren zwei Netzpunkten weiter als MK/40 (≈ 0,2,
 * bei 307 % ≈ 0,6 Bildpunkte) von ihrer Kurve abweicht, und nur zusammengelegt, wo die Abweichung danach höchstens halb so groß ist
 * (`verdichten`, `genau`). `?genau=0` zum Vergleich.
 *
 * Die Haut zwischen den Linien ebenso fein machen (`GENAU_HAUT`): Eine Kante wird geteilt, wo die runde Fläche zwischen ihren Enden
 * weiter als dieselbe Genauigkeit von ihr abweicht (Länge × Drehung der Normale / 8), und nur zusammengelegt, wo es danach höchstens
 * halb so viel ist. Mit dem kleinen Rechennetz Standard (12.11., Schritt 2), `?genauHaut=0` zum Vergleich: Ohne sie fällt ein kleines
 * Detail auf dem groben Netz zusammen (Florians Ohr vom 08.11.: flach auf der Linie, 6 umgeklappte Dreiecke; mit ihr rund wie bisher,
 * 0 umgeklappt, 1 910 Punkte statt 5 270 mit dem Netz bis zum 12.11.). Am 08.11. war sie ein Versuch und wurde verworfen (damals
 * hing die Form noch am Netz: Rüssel mit gedrehtem Griff 108 Knicke über 60° und 46 umgeklappt statt 31 / 0). Nach der Geometrie
 * gerechnet gilt das nicht mehr, gemessen am 12.11. mit `form-explosion-probe.mjs` (kleines Netz mit ihr gegen das Netz bis zum
 * 12.11.; Knicke über 60° / umgeklappt): Rüssel mit um 90° gedrehtem Griff 1/0 gegen 10/0, langer Hammer 0/0 gegen 0/0, Ei mit
 * Überhang 0/0 gegen 4/0, Schlaufe (die Linie kreuzt sich selbst, in jeder Fassung kaputt) 119/26 gegen 128/26; mit der Genauigkeit
 * der Linien statt `GENAU_FLAECHE` entstanden an der Schlaufe mehr Splitter (214/70). Gleich nach dem Anlegen eines Loops zu teilen
 * war schlechter (ohne Setzen danach klappten Splitter um).
 */
export const GENAU = Number(new URLSearchParams(location.search).get('genau') ?? 1 / 40);
export const GENAU_HAUT = ((w) => w === '1' || (w !== '0' && NETZ_KLEIN))(new URLSearchParams(location.search).get('genauHaut'));
/**
 * Genauigkeit der Haut mit `GENAU_HAUT` als Anteil der Startkante (`?genauFlaeche=`). Die Linien behalten ihre eigene, feinere
 * (`GENAU`): An ihnen hängen die Ziele der Haut. In der Fläche zählt nur, dass der Löser genug Punkte hat, um eine Wölbung zu
 * bilden; glatt zeichnet sie die Anzeige. Gemessen am 12.11. (Florians Ohr, `form-detail-probe.mjs`; Punkte seiner Formen nach dem
 * Laden): mit 1/40 wie die Linien bleiben „teat firefish“ 20 122 von 27 770 Punkten (im Zug 34 ms je Bild); mit 1/20 12 965, mit
 * 1/12 9 944 (18 ms), das Ohr ist in beiden rund und ohne umgeklapptes Dreieck; mit 1/8 8 712, am Ohr klappen 4 Dreiecke um.
 * 1/16 lässt Abstand zu dieser Grenze: 11 449 Punkte, 19 ms je Bild.
 */
export const GENAU_FLAECHE = Number(new URLSearchParams(location.search).get('genauFlaeche') ?? 1 / 16);
/**
 * Verfeinern im Zug (08.11., Schritt 3, Florian: „Netz und Linien schon während des Zugs verfeinern, Zerlegung im Hintergrund“): Wird
 * die Haut beim Ziehen gestreckt (eine Kante länger als `LIVE_KANTE` Startkanten), wird der Zug festgehalten, das Netz wie nach dem Zug
 * verdichtet (Teilen, Zusammenlegen, Linien genau) und der Zug auf dem neuen Netz weitergeführt. Nur nach der Geometrie
 * (`?gewichte=geometrie`): Dort hängt die Form nicht am Netz, das Einwechseln springt nicht. `?live=0` zum Vergleich.
 */
export const LIVE = new URLSearchParams(location.search).get('live') !== '0';
export const LIVE_KANTE = Number(new URLSearchParams(location.search).get('liveKante') ?? 2);
/** Linien: verfeinern, sobald sie um so viel Mal die Genauigkeit nach dem Zug (`GENAU`) von ihrer Kurve abweichen */
export const LIVE_GENAU = Number(new URLSearchParams(location.search).get('liveGenau') ?? 1);
/**
 * Eine Linie wird im Zug ungenau: Ihre Ziele liegen auf ihrem Pfad; weicht ein Ziel von der Sehne seiner Nachbarn um d ab, weicht die
 * Kette dort etwa um d/4 von der Kurve ab. Ab `LIVE_GENAU` mal der Genauigkeit nach dem Zug (`GENAU`) wird verfeinert.
 */
export function linieUngenau(z: Zug): boolean {
  if (!(GENAU > 0)) return false;
  const grenze = 4 * LIVE_GENAU * GENAU * MK;
  for (let li = 0; li < loops.length; li++) {
    const l = loops[li]!;
    const L = z.lagen[li];
    if (!L || !exakt(l)) continue;
    const n = l.proben.length;
    const zu = l.art !== 'ring';
    for (let j = zu ? 0 : 1; j < (zu ? n : n - 1); j++) {
      const a = lageAus(L, (j - 1 + n) % n);
      const b = lageAus(L, j);
      const c = lageAus(L, (j + 1) % n);
      const ux = c.x - a.x;
      const uy = c.y - a.y;
      const uz = c.z - a.z;
      const u2 = ux * ux + uy * uy + uz * uz;
      if (!(u2 > 1e-12)) continue;
      const t = Math.max(0, Math.min(1, ((b.x - a.x) * ux + (b.y - a.y) * uy + (b.z - a.z) * uz) / u2));
      const d = Math.hypot(b.x - a.x - t * ux, b.y - a.y - t * uy, b.z - a.z - t * uz);
      if (d > grenze) return true;
    }
  }
  return false;
}

/** eine Kante der Haut ist länger als `LIVE_KANTE` Startkanten */
export function gestreckt(): boolean {
  const P = haut.pos;
  const T = haut.tri;
  const g = (LIVE_KANTE * MK) ** 2;
  for (let t = 0; t < T.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = T[t + e]!;
      const b = T[t + ((e + 1) % 3)]!;
      const dx = P[3 * a]! - P[3 * b]!;
      const dy = P[3 * a + 1]! - P[3 * b + 1]!;
      const dz = P[3 * a + 2]! - P[3 * b + 2]!;
      if (dx * dx + dy * dy + dz * dz > g) return true;
    }
  return false;
}
export let letzteVerdichtung: { neu: number; gelegt: number; ms: number } | null = null;

/**
 * Was der Hintergrund für den Stand noch tun soll (G4.4, über die ganze Haut nach der Geometrie). null: nichts offen, höchstens die
 * Zerlegung für das nächste Greifen fehlt. Gehört zum Stand: Rückgängig bringt es mit zurück.
 * - `setzen`: Die Haut steht nicht zum Stand (nach einer Kante, dem Löschen, einem neuen Loop), der Auftrag setzt sie zuerst;
 *   `ziele`: dabei je Loop ohne Pfad seine Verschiebung.
 * - `nurInRuhe`: Das Setzen gilt nur, wenn die Haut dabei zur Ruhe kommt (nach einem neuen Loop: Dort muss nichts geschehen, und
 *   mit einem einzigen Loop hält nichts die Haut). Nach Kante und Löschen gilt es immer (wie bisher im Fenster).
 * - `verdichten`: danach aufräumen wie nach einem Zug (verdichten, wo die Haut gedehnt oder gestaucht ist, und wieder setzen).
 */
export type RuheOffen = { setzen: boolean; nurInRuhe: boolean; verdichten: boolean; ziele: (Float64Array | null)[] | null };
export let ruheOffen: RuheOffen | null = null;

export type Schnappschuss = {
  haut: Haut;
  loops: Loop[];
  pos: Float64Array;
  auswahl: Wahl[];
  ids: [number, number];
  maul: MaulZustand;
  pose: PoseStand;
  grund: { haut: Haut; pos: Float64Array; loops: Loop[] } | null;
  ruhe: RuheOffen | null;
  /** das Maß des Startnetzes (nach „Laden“ oder „Neu“ kann ein Schritt zurück zu einem Wesen mit anderem Maß führen) */
  mk: number;
};
export const zurueck: Schnappschuss[] = [];
export const kopieLoop = (l: Loop): Loop => ({
  ...l,
  ruhe: Float64Array.from(l.ruhe),
  punkte: l.punkte.map((p) => {
    const q = { ...p, ref: { ...p.ref }, cur: { ...p.cur } };
    if (p.ein) q.ein = { ...p.ein };
    if (p.aus) q.aus = { ...p.aus };
    return q;
  }),
});
export const poseKopie = (p: PoseStand): PoseStand => ({ ...p, delta: p.delta ? Float64Array.from(p.delta) : null });
export const schnappschuss = (): Schnappschuss => ({
  loops: loops.map(kopieLoop),
  haut,
  pos: Float64Array.from(haut.pos),
  auswahl: [...G.auswahl],
  ids: [naechsteId, naechsteKreuzung],
  maul: G.maul ? { ...G.maul } : null,
  pose: poseKopie(pose),
  grund: grund ? { haut: grund.haut, pos: Float64Array.from(grund.haut.pos), loops: grund.loops.map(kopieLoop) } : null,
  ruhe: ruheOffen ? { ...ruheOffen } : null,
  mk: MK,
});
/** Wiederherstellen samt Ziel: ein Schritt aus der Pose führt in die Pose zurück, einer aus der Grundform in die Grundform */
export function wiederherstellen(s: Schnappschuss): void {
  loops = s.loops;
  haut = s.haut;
  haut.pos.set(s.pos);
  if (s.grund) {
    s.grund.haut.pos.set(s.grund.pos);
    grund = { haut: s.grund.haut, loops: s.grund.loops };
  } else grund = null;
  pose = s.pose;
  ruheOffen = s.ruhe ? { ...s.ruhe } : null;
  MK = s.mk;
  TOL = 0.25 * MK;
  anzeige.geometrieNeu();
  G.auswahl = s.auswahl;
  [naechsteId, naechsteKreuzung] = s.ids;
  G.maul = s.maul;
  anzeige.reglerZeigen();
  anzeige.allesZeigen();
}

export const loopNr = (id: number): number => loops.findIndex((l) => l.id === id);
export const lageAus = (L: Float64Array, i: number): V3 => ({ x: L[3 * i]!, y: L[3 * i + 1]!, z: L[3 * i + 2]! });
export const spiegeln = (p: V3): V3 => ({ ...p, z: -p.z });
export const abstand = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
/** Abstand bis auf Spiegelung (an einer freien Form ohne Spiegelbild: der Abstand selbst) */
export const abstandSym = (a: V3, b: V3): number => (istFrei() ? abstand(a, b) : Math.min(abstand(a, b), abstand(a, spiegeln(b))));

// ---------- Spiegel (18.11., Plan „Objekte, Spiegel und Nähte“) ----------

/** Ist die Form frei: ein ganzes Netz ohne Spiegelpaare („Spiegel aus“ oder angewendet), jede Linie ein Loop für sich? */
export const istFrei = (): boolean => {
  // (je Netz einmal gelesen: Die Frage kommt je Probe einer Linie, und eine freie Haut zu lesen heißt, alle ihre Punkte anzusehen)
  if (!freiGemerkt || freiGemerkt.spiegel !== haut.spiegel) freiGemerkt = { spiegel: haut.spiegel, frei: hautFrei(haut) };
  return freiGemerkt.frei;
};
let freiGemerkt: { spiegel: Int32Array; frei: boolean } | null = null;
/**
 * Sieht der Betrachter die Ansicht von der Gegenseite (der Kern sieht die Seite von +z, die Front von −x, den Top von +y)? `vorn`: die
 * Seite der Achse, die zu ihm zeigt, wie Ozzys Flächen sie führen. Das zählt nur an einer freien Form: An einer verschmolzenen liegt,
 * was in der Seite gezeichnet wird, auf beiden Hälften.
 */
export const vonHinten = (a: Ansicht, vorn: number | undefined): boolean => istFrei() && vorn !== undefined && vorn !== (a === 'front' ? -1 : 1);
/** das Spiegelbild einer Stelle im Blatt des Kerns (`uvAus`): in Front und Top die Koordinate, die z ist; in der Seite dieselbe Stelle */
export const uvGespiegelt = (a: Ansicht, q: readonly [number, number]): [number, number] => (a === 'front' ? [-q[0], q[1]] : a === 'top' ? [q[0], -q[1]] : [q[0], q[1]]);
/** Hat die Form ein Spiegelbild: verschmolzen immer (die andere Hälfte ihres Netzes), frei nur als Anzeige (`G.spiegelbild`) */
export const spiegelbildGilt = (): boolean => !istFrei() || G.spiegelbild;
/** der Zustand des Spiegels, wie der Knopf ihn zeigt */
export type SpiegelStand = 'clip' | 'an' | 'aus';
export const spiegelStand = (): SpiegelStand => (istFrei() && !G.spiegelbild ? 'aus' : G.clipping ? 'clip' : 'an');

/**
 * Spiegel aus (Florian, 18.11.: „dass ich mirror modifier applien kann, dann ist es nichtmehr gespiegelt sondern ein ganzes mesh und
 * ich kann asymetrische dinge gestalten“; zur Frage, was „aus“ an einer verschmolzenen Form heißt: „Ja, so bauen“): Die Form bleibt
 * ganz und wird frei (`spiegelAnwenden` im Kern: dieselbe Haut ohne Spiegelpaare, jede Linie ausgeschrieben). Ein Schritt für ⌘Z.
 * Nur in der Grundform und noch nicht mit einem Maul. Eine freie Form verliert nur ihr Spiegelbild. Zurück: ob es geschehen ist.
 */
export function spiegelAus(): boolean {
  if (istFrei()) {
    G.spiegelbild = false;
    return true;
  }
  if (grund || G.maul || zug) {
    G.meldung = grund ? 'In der Pose lässt sich der Spiegel nicht ausschalten (erst zurück in die Grundform)' : 'Mit einem Maul lässt sich der Spiegel noch nicht ausschalten';
    anzeige.statusZeigen();
    return false;
  }
  const r = spiegelAnwenden(haut, loops, { naechsteId, naechsteKreuzung });
  if ('fehler' in r) {
    G.meldung = `Der Spiegel lässt sich hier noch nicht ausschalten: ${r.fehler}`;
    anzeige.statusZeigen();
    return false;
  }
  zurueck.push(schnappschuss());
  // was für die verschmolzene Form bereitlag oder noch rechnete, gilt nicht mehr (dieselben Punkte, aber ein anderes Netz für den Löser)
  hintergrundVerwerfen();
  ruheOffen = null;
  haut = r.haut;
  loops = r.loops;
  naechsteId = r.naechsteId;
  naechsteKreuzung = r.naechsteKreuzung;
  G.auswahl = [];
  G.spiegelbild = false;
  G.meldung = 'Spiegel aus: Die Form ist jetzt ein ganzes Netz, beide Seiten lassen sich verschieden formen · ⌘Z führt zurück';
  anzeige.geometrieNeu();
  anzeige.allesZeigen();
  return true;
}

/** Was der Hintergrund für die Form von eben bereitgelegt hat oder noch rechnet, gilt nicht mehr (ein anderes Netz, eine andere Form) */
export function hintergrundVerwerfen(): void {
  nachlauf = null;
  G.aufgeraeumt = null;
  G.aufraeumen = null;
  G.zwischenstand = null;
  G.gegriffen = null;
  verfeinerung = null;
  G.eingetroffen = null;
  nichtsZuVerfeinern = null;
  verfeinernPause = 0;
  nachLoesenOffen = null;
  vorlageBereit = null;
  vorlageStand = '';
  vorlageNetz = '';
  standFertig = '';
  hintergrundGescheitert = '';
}

// ---------- Objekte (18.11., Plan „Objekte, Spiegel und Nähte“, Etappe 3) ----------

/**
 * Ein ruhendes Objekt: der Stand seiner Form, sein Rückweg (⌘Z) und sein Spiegel. Das Werk rechnet immer an einem Objekt; die anderen
 * liegen so bereit. `objektAblegen` gibt den Stand des aktiven heraus, `objektAufnehmen` macht einen abgelegten zum aktiven: ein
 * Zuweisen, keine Rechnung.
 */
export type ObjektStand = { stand: Schnappschuss; zurueck: Schnappschuss[]; clipping: boolean; spiegelbild: boolean; name: string };

/** Ist eine Haut frei (für ein ruhendes Objekt, dessen Haut nicht im Werk steht)? */
export const hautFreiVon = (h: Haut): boolean => hautFrei(h);
/** Lässt sich das aktive Objekt gerade ablegen (kein Zug, kein Formen, nicht in der Pose)? */
export const objektRuht = (): boolean => !zug && !formZug && !maulLauf && !grund && !G.stift && !G.abzweig;

/**
 * Den Stand des aktiven Objekts herausgeben (es bleibt im Werk stehen, bis ein anderes aufgenommen oder eine neue Form angelegt wird).
 * Rechnete der Hintergrund noch an ihm (Setzen, Aufräumen), steht der Auftrag wieder im Stand: Er läuft weiter, wenn das Objekt wieder
 * aktiv ist. null: Es ruht gerade nicht (`objektRuht`).
 */
export function objektAblegen(): ObjektStand | null {
  if (!objektRuht()) return null;
  const stand = schnappschuss();
  const a = G.aufraeumen;
  if (a && !stand.ruhe) stand.ruhe = { setzen: a.setzen, nurInRuhe: a.nurInRuhe, verdichten: a.verdichten, ziele: null };
  return { stand, zurueck: zurueck.splice(0), clipping: G.clipping, spiegelbild: G.spiegelbild, name: G.ablageName };
}

/** Ein abgelegtes Objekt zum aktiven machen (das bisherige muss vorher abgelegt sein: Sein Stand geht hier verloren) */
export function objektAufnehmen(o: ObjektStand): void {
  hintergrundVerwerfen();
  G.modus = 'frei';
  G.entwurf = null;
  G.spur = null;
  zurueck.length = 0;
  zurueck.push(...o.zurueck);
  G.clipping = o.clipping;
  G.spiegelbild = o.spiegelbild;
  G.ablageName = o.name;
  wiederherstellen(o.stand);
}

// ---------- Naht zwischen zwei Objekten (18.11., Plan „Objekte, Spiegel und Nähte“, Etappe 4) ----------

/**
 * Ein ruhendes Objekt mit dem aktiven verbinden. Florian: „Wenn ich objekte verschmelzen möchte, dann sollte das über einen edgeloop
 * passieren … Ich möchte auch objekte voneinander subtrahieren können, sodass eine saubere kante entsteht.“ `vereinen`: Die zwei
 * werden eine Form; `abziehen`: Das andere wird aus dem aktiven herausgeschnitten. An der Schnittkurve entsteht die Naht: ein Loop mit
 * Kante an, gewählt (K macht ihn weich wie jede Linie; Florian: „Wie Seifenblasen“). Linien, die in die andere Form liefen, enden an
 * der Naht. Ein Schritt für ⌘Z (das andere Objekt gibt die Hülle wieder heraus).
 *
 * `teil`: der Stand des anderen Objekts; `k`, `d`: sein Maß im Maß des aktiven (Ort im aktiven = k · Ort im anderen + d).
 * Der Spiegel: Das Bild bleibt, wie es ist (`objekteVerbinden`); wird das aktive dafür frei, zeigt es kein Spiegelbild mehr.
 * Zurück: ob verbunden wurde (sonst steht der Grund in der Meldung, nichts ist geändert).
 */
export async function objektVerbinden(teil: ObjektStand, k: number, d: V3, art: NahtArt): Promise<boolean> {
  const was = art === 'vereinen' ? 'Verschmelzen' : 'Abziehen';
  const sagen = (text: string): false => {
    G.meldung = text;
    anzeige.statusZeigen();
    return false;
  };
  const bereit = (): string => (!objektRuht() ? `${was}: erst den laufenden Handgriff beenden (und zurück in die Grundform)` : G.maul || teil.stand.maul || pose.delta || teil.stand.pose.delta ? `${was} geht mit einem Maul noch nicht` : '');
  if (bereit()) return sagen(bereit());
  const hautDavor = haut;
  let wasm: Awaited<ReturnType<typeof manifoldLaden>>;
  try {
    wasm = await manifoldLaden();
  } catch (e) {
    return sagen(`${was}: Die Bibliothek für den Schnitt der Netze ließ sich nicht laden (${e instanceof Error ? e.message : String(e)})`);
  }
  // (beim ersten Mal lädt die Bibliothek einen Augenblick: Inzwischen kann ein Handgriff begonnen oder das Objekt gewechselt haben)
  if (haut !== hautDavor) return false;
  if (bereit()) return sagen(bereit());
  const hB: Haut = { ...teil.stand.haut, pos: teil.stand.pos };
  const r = objekteVerbindenMit(
    wasm,
    { haut, loops, spiegelbild: G.spiegelbild },
    { haut: hautImMass(hB, k, d), loops: teil.stand.loops.map((l) => loopImMass(l, k, d)), spiegelbild: teil.spiegelbild },
    art,
    { naechsteId, naechsteKreuzung },
  );
  if ('fehler' in r) return sagen(`${was} geht hier nicht: ${r.fehler}`);
  zurueck.push(schnappschuss());
  // was für die Form von eben bereitlag oder noch rechnete, gilt nicht mehr (ein anderes Netz)
  hintergrundVerwerfen();
  ruheOffen = null;
  haut = r.haut;
  loops = r.loops;
  naechsteId = r.naechsteId;
  naechsteKreuzung = r.naechsteKreuzung;
  if (r.aFrei) G.spiegelbild = false;
  // die Schnittkurve hinterlässt sehr kurze Kanten: zusammenlegen, bevor gerechnet wird
  nadelnWeg();
  // gewählt sind die Nähte als Ganzes und ihre sichtbaren Punkte (Ozzy zeigt gewählte Punkte, keine gewählten Linien)
  G.auswahl = r.naehte.flatMap((id) => {
    const l = loops[loopNr(id)];
    return [{ l: id, i: -1 }, ...(l ? l.punkte.flatMap((q, i) => (istSichtbar(q) ? [{ l: id, i }] : [])) : [])];
  });
  const naht = r.naehte.length === 1 ? 'Die Naht ist ein Loop' : `Die ${r.naehte.length} Nähte sind Loops`;
  G.meldung = `${art === 'vereinen' ? 'Verschmolzen' : 'Abgezogen'}: ${naht} mit Kante, gewählt · K macht sie weich · ⌘Z ${art === 'vereinen' ? 'trennt wieder' : 'holt das Objekt zurück'}`;
  // das Netz an der Naht ist neu: Die Haut setzt sich und räumt auf wie nach einer Kante
  hautNeuRechnen();
  anzeige.geometrieNeu();
  anzeige.allesZeigen();
  // eine freie Form mit Spiegelbild und Clipping, die jetzt über die Spiegelebene reicht, verschmilzt dort (derselbe Schritt für ⌘Z)
  if (istFrei() && G.clipping && ueberDerMitte()) mitteFest(true);
  return true;
}

/**
 * Die Lippe eines Mauls, das als echte Form geschnitten wurde (`maulSchneiden`). Solange ihre Punkte für beide Lippen gelten, ist
 * sie ein Maul aus einer Linie mit dem Haarspalt; sind die Lippen getrennt (`lippenTrennen`), ist sie ein Ring wie jeder andere,
 * und das Maul der Form merkt sich, was sie ist (`G.maul.echt`).
 */
export const istMaulEcht = (l: Loop): boolean => (istMaulLinie(l) && l.maulLinie === MAUL_HAAR) || (!!G.maul?.echt && G.maul.id === l.id);

/**
 * Das Maul als echte Form (Plan „Maul, Zähne, Zunge“, Etappe 1, 20.11.2026): Aus einer Linie, von der Seite gezeichnet, vom
 * Leeren vor der Form bis zum Mundwinkel in ihr, wird ein Maul, das Haut und Linien der Form ist (`maulSchneidenMit`): Die Tasche
 * ist Haut, die Lippe eine Linie mit Kante, deren Punkte für beide Lippen gelten (Zwillinge), im Maul liegen die Mitte von Gaumen
 * und Boden und die Rachenlinie. Gerechnet wird es zu. Ein Schritt für ⌘Z.
 *
 * `anker`: der Strich im Blatt der Ansicht; `innenAmEnde`: Sein letzter Punkt ist der Mundwinkel (sonst der erste).
 * Zurück: ob das Maul entstand (sonst steht der Grund in der Meldung, nichts ist geändert).
 */
export async function maulSchneiden(a: Ansicht, anker: readonly StiftAnker[], innenAmEnde: boolean): Promise<boolean> {
  const sagen = (text: string): false => {
    G.meldung = text;
    anzeige.statusZeigen();
    return false;
  };
  const bereit = (): string =>
    a !== 'seite'
      ? 'Ein Maul zeichnest du von der Seite: vom Leeren vor der Form bis zum Mundwinkel'
      : !objektRuht()
        ? 'Maul: erst den laufenden Handgriff beenden (und zurück in die Grundform)'
        : G.maul || pose.delta || loops.some(istMaulLinie)
          ? 'Diese Form hat schon ein Maul'
          : istFrei()
            ? 'Ein Maul braucht die gespiegelte Form (Spiegel an)'
            : '';
  if (bereit()) return sagen(bereit());
  const strich = stiftStrich(a, anker);
  if (strich.length < 2) return sagen('Maul: Die Linie ist zu kurz');
  // vom Mundwinkel nach vorn
  const linie = (innenAmEnde ? [...strich].reverse() : strich).map(([x, y]) => ({ x, y }));
  const hautDavor = haut;
  let wasm: Awaited<ReturnType<typeof manifoldLaden>>;
  try {
    wasm = await manifoldLaden();
  } catch (e) {
    return sagen(`Maul: Die Bibliothek für den Schnitt der Netze ließ sich nicht laden (${e instanceof Error ? e.message : String(e)})`);
  }
  // (beim ersten Mal lädt die Bibliothek einen Augenblick: Inzwischen kann ein Handgriff begonnen oder das Objekt gewechselt haben)
  if (haut !== hautDavor) return false;
  if (bereit()) return sagen(bereit());
  const t0 = performance.now();
  const r = maulSchneidenMit(wasm, { haut, loops }, linie, { naechsteId, naechsteKreuzung, mk: MK });
  if ('fehler' in r) return sagen(`Maul geht hier nicht: ${r.fehler}`);
  zurueck.push(schnappschuss());
  // was für die Form von eben bereitlag oder noch rechnete, gilt nicht mehr (ein anderes Netz)
  hintergrundVerwerfen();
  ruheOffen = null;
  haut = r.haut;
  loops = r.loops;
  naechsteId = r.naechsteId;
  naechsteKreuzung = r.naechsteKreuzung;
  // (die Lippe ist der letzte Loop: an ihr sieht `nadelnWeg` nach kurzen Kanten)
  nadelnWeg();
  // Mit dem Maul gibt es die Pose „Fressen“ schon fertig (oben wenig, unten weit): Die Lippe ist das Maul der Form
  G.maul = { id: r.lippe, echt: true };
  maulSeitenMerken();
  pose = { kiefer: FRESSEN_ANFANG.unten, schaedel: FRESSEN_ANFANG.oben, delta: null };
  maulBlick = 0;
  // gewählt ist die Lippe als Ganzes mit ihren sichtbaren Punkten (Ozzy zeigt gewählte Punkte, keine gewählten Linien)
  const l = loops[loopNr(r.lippe)];
  G.auswahl = l ? [{ l: r.lippe, i: -1 }, ...l.punkte.flatMap((q, i) => (istSichtbar(q) ? [{ l: r.lippe, i }] : []))] : [];
  G.meldung = `Maul (${((performance.now() - t0) / 1000).toFixed(1)} s): Die Lippe ist eine Linie mit Kante, ihre Punkte gelten für beide Lippen · im Maul liegen zwei Linien · ⌘Z nimmt es zurück`;
  // das Netz am Maul ist neu: Die Haut setzt sich und räumt auf wie nach einer Kante
  hautNeuRechnen();
  anzeige.geometrieNeu();
  anzeige.allesZeigen();
  return true;
}

/**
 * Welche Hälfte der Lippe die Unterlippe ist, am Maul merken: gelesen, solange die Lippen aufeinanderliegen (dann ist es eindeutig),
 * und nur, wenn es noch nicht feststeht.
 */
function maulSeitenMerken(): void {
  const m = G.maul;
  if (!m?.echt || m.ersteUnten !== undefined) return;
  const alle = grund ? grund.loops : loops;
  const l = alle.find((x) => x.id === m.id);
  const L = l && istMaulLinie(l) ? maulLage(grund ? grund.haut : haut, l, mundwinkelVon(l)) : null;
  if (L) G.maul = { ...m, ersteUnten: L.ersteUnten };
}
/** die Lippe des Mauls als echte Form (null: Die Form hat keins) */
export function maulLippe(): Loop | null {
  const l = G.maul?.echt ? loops[loopNr(G.maul.id)] : undefined;
  return l ?? null;
}
/** Die Lippen des Mauls sind getrennt: Jede hat ihre eigenen Punkte (null: kein Maul als echte Form) */
export function lippenGetrennt(): boolean | null {
  const l = maulLippe();
  return l ? !istMaulLinie(l) : null;
}

/**
 * Die Tasche des Mauls als echte Form, für die Ebene „Maul“ im Paint-Modus (Etappe 4): je Punkt des Netzes, ob er zur Tasche oder
 * zur Lippe gehört; die Kette der Lippe (Punktnummern); die Länge der Lippe in der Seite. Null: kein solches Maul, oder die Tasche
 * ist nicht in Gaumen und Boden getrennt. In der Pose an der Grundform gelesen (das Netz ist dasselbe).
 */
export function maulTasche(): { innen: Uint8Array; lippe: number[]; lang: number; kiefer: Int8Array; C: V2 } | null {
  const m = G.maul;
  if (!m?.echt) return null;
  const h = grund ? grund.haut : haut;
  const alle = grund ? grund.loops : loops;
  const l = alle.find((x) => x.id === m.id);
  if (!l) return null;
  const L = maulLage(h, l, mundwinkelVon(l), m.ersteUnten);
  if (!L) return null;
  const erste = L.ersteUnten ? L.unten : L.oben;
  const sk = kieferSeiten(h, alle, l.id, { profil: erste.profil, C: L.C }, erste.links ? 1 : -1);
  if (!sk.getrennt) return null;
  const innen = new Uint8Array(h.n);
  // je Punkt der Tasche sein Kiefer (+1 unten, −1 oben); die Rachenlinie und der Mundwinkel gehören keinem allein
  const kiefer = new Int8Array(h.n);
  const unten = L.untenLinks ? 1 : -1;
  const winkel = sk.winkel >= 0 ? [sk.winkel, h.spiegel[sk.winkel]!] : [];
  for (let v = 0; v < h.n; v++) {
    if (sk.aussen[v] && !sk.lippe.has(v)) continue;
    innen[v] = 1;
    if (!sk.rachen.has(v) && !winkel.includes(v)) kiefer[v] = sk.seite[v] === unten ? 1 : -1;
  }
  return { innen, lippe: l.proben.map((q) => q.ecken[0]), lang: Math.max(L.oben.lang, L.unten.lang), kiefer, C: L.C };
}

/**
 * Die Zähne des Mauls setzen oder nehmen (Etappe 5): Sie stehen am Maul der Form (`G.maul.zaehne`) als Werte je Reihe; wo jeder
 * Zahn sitzt, liest die Anzeige daraus und aus der Tasche. `schritt`: ein Schritt für ⌘Z (falsch, während ein Regler gedreht
 * wird: Dann legt ihn an, wer den Handgriff beginnt). Zurück: ob es geschehen ist.
 */
export function zaehneSetzen(z: MaulZaehne | null, schritt = true): boolean {
  const m = G.maul;
  if (!m?.echt || zug) return false;
  if (schritt) zurueck.push(schnappschuss());
  const { zaehne: _alt, ...rest } = m;
  void _alt;
  G.maul = z ? { ...rest, zaehne: { ...z, oben: { ...z.oben }, unten: { ...z.unten } } } : rest;
  anzeige.allesZeigen();
  return true;
}

/** Ist ein Punkt der Lippe des Mauls gewählt (sie selbst, einer ihrer Punkte, oder ein Punkt einer Linie, die dort an ihr hängt)? */
export function lippeGewaehlt(): boolean {
  const l = maulLippe();
  if (!l) return false;
  return G.auswahl.some((w) => {
    if (w.l === l.id) return true;
    const k = w.i >= 0 ? loops[loopNr(w.l)]?.punkte[w.i]?.kreuzung : undefined;
    return k !== undefined && l.punkte.some((q) => q.kreuzung === k);
  });
}
/** so nah liegen zwei Punkte getrennter Lippen, die noch aufeinanderliegen (Einheiten des Werks; der Haarspalt ist 0,06) */
export const LIPPEN_NAH = 0.3;
/**
 * Getrennte Lippen, die noch aufeinanderliegen: Am selben Ort stehen zwei Punkte, einer je Lippe, und der Zeiger kann sie nicht
 * unterscheiden. Welche Lippe gemeint ist, sagt die Seite der Lippenlinie, auf der der Zeiger beim Beginn des Zugs liegt: zum
 * Oberkiefer hin die Oberlippe, zum Unterkiefer hin die Unterlippe (wie man einen Reißverschluss aufzieht). `dX`, `dY`: der Zeiger
 * gegen den gegriffenen Punkt im Blatt der Ansicht. Gewählt ist danach der Punkt dieser Lippe.
 */
export function lippeNachZeiger(a: Ansicht, dX: number, dY: number): void {
  const l = maulLippe();
  if (!l || grund || istMaulLinie(l) || G.auswahl.length !== 1) return;
  const w = G.auswahl[0]!;
  const p = w.i >= 0 ? loops[loopNr(w.l)]?.punkte[w.i] : undefined;
  const iW = l.punkte.findIndex((q) => q.mundwinkel);
  if (!p || iW < 0) return;
  const nah = (q: LoopPunkt): boolean => abstand(q.ref, p.ref) < LIPPEN_NAH;
  const erste = l.punkte.findIndex((q, i) => i < iW && nah(q));
  const zweite = l.punkte.findIndex((q, i) => i > iW && nah(q));
  if (erste < 0 || zweite < 0) return;
  const L = maulLage(haut, l, mundwinkelVon(l), G.maul?.ersteUnten);
  if (!L) return;
  const d = inWelt(a, dX, dY);
  // quer zur Lippe an dieser Stelle, in der Seite: links ihrer Laufrichtung (vom Mundwinkel nach vorn) positiv
  const K = L.ersteUnten ? L.unten : L.oben;
  const t = K.profil.tangente(K.profil.naechster(p.ref.x, p.ref.y).s);
  const quer = t.x * d.y - t.y * d.x;
  if (quer === 0) return;
  G.auswahl = [{ l: l.id, i: K.links === quer > 0 ? erste : zweite }];
}

/**
 * „Lippen trennen“ (Plan „Maul, Zähne, Zunge“, Etappe 3, 20.11.; Florian: „Man hat dann einen Button ‚Lippen trennen‘ und kann diese
 * dann auch im geschlossenen Zustand separat bearbeiten, um Über- und Unterbiss zu erstellen“): Die Punkte der Lippe gelten nicht
 * mehr für beide Lippen. Aus dem zusammengeklappten Loop wird ein Ring, dessen zwei Hälften (Oberlippe und Unterlippe) sich im
 * Mundwinkel treffen; jede lässt sich für sich ziehen, und die Haut ihres Kiefers geht mit. An der Form ändert sich dabei nichts.
 * Ein Schritt für ⌘Z. Nur in der Grundform. Zurück: ob es geschehen ist.
 */
export function lippenTrennen(): boolean {
  const l = maulLippe();
  const warum = !l ? 'Die Form hat kein Maul' : !istMaulLinie(l) ? 'Die Lippen sind schon getrennt' : grund ? 'Lippen trennst du in der Grundform (erst „Fressen“ aus)' : !objektRuht() ? 'erst den laufenden Handgriff beenden' : '';
  if (warum || !l) {
    G.meldung = `Lippen trennen: ${warum}`;
    anzeige.statusZeigen();
    return false;
  }
  zurueck.push(schnappschuss());
  delete l.maulLinie;
  G.meldung = 'Lippen getrennt: Jede Lippe hat jetzt ihre Punkte. Wo sie noch aufeinanderliegen, greifst du über der Linie die Oberlippe, darunter die Unterlippe · „Lippen verbinden“ legt sie wieder aufeinander';
  anzeige.allesZeigen();
  return true;
}

/**
 * „Lippen verbinden“: Die Unterlippe wird wieder das Abbild der Oberlippe (um den Haarspalt um den Mundwinkel gedreht); hat eine
 * Lippe inzwischen einen Punkt mehr, bekommt ihn die andere an derselben Stelle. Punkte anderer Linien an den Kreuzungen der
 * Unterlippe gehen mit; danach setzt sich die Haut auf die Linien. Ein Schritt für ⌘Z. Nur in der Grundform.
 */
export function lippenVerbinden(): boolean {
  const l = maulLippe();
  const warum = !l ? 'Die Form hat kein Maul' : istMaulLinie(l) ? 'Die Lippen liegen schon aufeinander' : grund ? 'Lippen verbindest du in der Grundform (erst „Fressen“ aus)' : !objektRuht() ? 'erst den laufenden Handgriff beenden' : '';
  if (warum || !l) {
    G.meldung = `Lippen verbinden: ${warum}`;
    anzeige.statusZeigen();
    return false;
  }
  const vorher = schnappschuss();
  // welche Hälfte die Oberlippe ist, sagt das Netz (bei einem Überbiss liegt die Unterlippe vorn höher)
  const lage = maulLage(haut, l, mundwinkelVon(l), G.maul?.ersteUnten);
  l.maulLinie = MAUL_HAAR;
  const bewegt = zwillingeAngleichen(l) < 0 ? null : zwillingeFestlegen(l, lage ? (lage.ersteUnten ? 'zweite' : 'erste') : obereLippe(l));
  if (!bewegt) {
    wiederherstellen(vorher);
    G.meldung = 'Lippen verbinden: Die zwei Lippen ließen sich nicht paaren';
    anzeige.statusZeigen();
    return false;
  }
  zurueck.push(vorher);
  hintergrundVerwerfen();
  for (const i of bewegt) {
    const q = l.punkte[i]!;
    if (q.kreuzung === undefined) continue;
    for (const o of loops) {
      if (o === l) continue;
      for (const r of o.punkte) {
        if (r.kreuzung !== q.kreuzung) continue;
        r.ref = { ...q.ref };
        r.cur = { ...q.ref };
      }
    }
  }
  G.meldung = 'Lippen verbunden: Jeder Punkt gilt wieder für beide Lippen';
  hautNeuRechnen();
  anzeige.geometrieNeu();
  anzeige.allesZeigen();
  return true;
}

/**
 * Das Maul als echte Form (20.11.): Zwei Linien, die an derselben Stelle enden, die eine an der Oberlippe, die andere an der
 * Unterlippe (die zwei Stücke einer Linie, die das Maul kreuzte), kreuzen sich dort nicht. Zu liegen ihre Enden am selben Ort, aber
 * zwischen ihnen liegt das Maul. Ohne das hielt die Suche sie nach jedem Schritt für eine neue Kreuzung, die Linien bekamen immer
 * mehr Punkte, und an der Lippe schlugen Dreiecke um.
 */
function ueberDasMaul(A: Loop, B: Loop, ort: V3): boolean {
  for (const L of loops) {
    if (L === A || L === B || !istMaulEcht(L)) continue;
    const w = L.punkte.find((p) => p.mundwinkel);
    if (!w) continue;
    /** die Stelle auf der Lippe, an der die Linie hier hängt (über eine gemeinsame Kreuzung); null: nicht an dieser Lippe */
    const an = (X: Loop): number | null => {
      for (const p of X.punkte) {
        if (p.kreuzung === undefined || abstand(p.ref, ort) > 8 * TOL) continue;
        const q = L.punkte.find((x) => x.kreuzung === p.kreuzung);
        if (q) return q.s;
      }
      return null;
    };
    const sa = an(A);
    const sb = an(B);
    if (sa !== null && sb !== null && (sa - w.s) * (sb - w.s) < 0) return true;
  }
  return false;
}

/**
 * Kreuzungen suchen (nur mit `nur`, sonst alle Paare); neue werden Punkte auf beiden Loops. In der Grundform ist eine Kreuzung genau
 * ein Ort: Hat ein Loop schon einen Pfad, liegt der Punkt dort, wo er geteilt wird, und der andere bekommt denselben Ort (haben beide
 * einen, die Mitte; sonst kreuzten sich die zwei Pfade nicht genau, und die Haut an der Kreuzung hätte zwei Ziele).
 */
export function kreuzungenSuchen(nur?: Loop): number {
  let zahl = 0;
  for (let i = 0; i < loops.length; i++) {
    for (let j = i + 1; j < loops.length; j++) {
      const A = loops[i]!;
      const B = loops[j]!;
      if (nur && A !== nur && B !== nur) continue;
      for (const f of kreuzungenZwischen(A, A.ruhe, B, B.ruhe, TOL)) {
        const schon = A.punkte.some((p) => p.kreuzung !== undefined && abstand(p.ref, f.p) < 8 * TOL && B.punkte.some((q) => q.kreuzung === p.kreuzung));
        if (schon || ueberDasMaul(A, B, f.p)) continue;
        const k = naechsteKreuzung++;
        const ea = exakt(A);
        const eb = exakt(B);
        const pa = punktEinfuegen(A, f.sa, k, ea);
        const pb = punktEinfuegen(B, f.sb, k, eb);
        if (ea || eb) {
          const c = ea && eb ? { x: (pa.ref.x + pb.ref.x) / 2, y: (pa.ref.y + pb.ref.y) / 2, z: (pa.ref.z + pb.ref.z) / 2 } : ea ? pa.ref : pb.ref;
          for (const p of [pa, pb]) {
            p.ref = { ...c };
            p.cur = { ...c };
          }
        }
        zahl++;
      }
    }
  }
  // am Maul aus einer Linie bekommt ein neuer Punkt einer Lippe (eine Kreuzung) seinen Zwilling auf der anderen
  if (!grund) for (const l of loops) if (istMaulLinie(l) && hatPfad(l)) zwillingeAngleichen(l);
  return zahl;
}
/**
 * Glatte Anzeige: an der Spiegelebene je Bildpunkt schneiden. Jeder gezeigte Punkt trägt seine Seite (`aSeite`: +1 die Hälfte z ≥ 0,
 * −1 ihr Spiegelbild, 0 die Mittelkante); ein Bildpunkt, der auf der anderen Seite der Ebene liegt, fällt weg. Die Hälften reichen
 * um `SCHNITT_RAND` über die Ebene, damit zwischen ihnen keine Fuge bleibt.
 */
export const SCHNITT_RAND = 0.02;
/**
 * Anzeige wie Edge Crease mit Auto Smooth: Ein Netzpunkt auf einer harten Linie wird doppelt gezeigt, jede Seite der Linie mit
 * eigener Normale. Sonst mittelt die Schattierung über den Knick hinweg.
 */
export let anzeigeQuelle = new Int32Array(0);
export let anzeigeKante = new Float32Array(0);
export let anzeigeIndex = new Uint32Array(0);
export function teilungNeu(): void {
  const n = haut.n;
  const tri = haut.tri;
  const um: number[][] = Array.from({ length: n }, () => []);
  for (let f = 0; f < tri.length / 3; f++) for (let e = 0; e < 3; e++) um[tri[3 * f + e]!]!.push(f);
  const index = Uint32Array.from(tri);
  const quelle = Array.from({ length: n }, (_, i) => i);
  const kante: number[] = new Array<number>(n).fill(0);
  const hat = (f: number, x: number) => tri[3 * f] === x || tri[3 * f + 1] === x || tri[3 * f + 2] === x;
  /** Fächer um w von der Kante (w, vor) bis zur Kante (w, nach) = eine Seite; die andere Seite bekommt den Doppelpunkt */
  const teilen = (w: number, vor: number, nach: number, h: number) => {
    const faecher = um[w]!;
    const start = faecher.find((g) => hat(g, vor));
    if (start === undefined) return;
    let f: number = start;
    const seite = new Set<number>();
    let kommt = vor;
    for (let k = 0; k < faecher.length; k++) {
      seite.add(f);
      if (hat(f, nach)) break;
      const jetzt: number = f;
      const weiter: number = [tri[3 * jetzt]!, tri[3 * jetzt + 1]!, tri[3 * jetzt + 2]!].find((x) => x !== w && x !== kommt)!;
      const g: number | undefined = faecher.find((x) => x !== jetzt && hat(x, weiter));
      if (g === undefined) return;
      kommt = weiter;
      f = g;
    }
    if (seite.size === faecher.length) return;
    const d = quelle.length;
    quelle.push(w);
    kante.push(h);
    kante[w] = Math.max(kante[w]!, h);
    for (const g of faecher) if (!seite.has(g)) for (let e = 0; e < 3; e++) if (index[3 * g + e] === w) index[3 * g + e] = d;
  };
  for (const l of loops) {
    if (!l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) continue;
    const hd = kanteBei(l, loops);
    const kette = l.proben.map((p) => p.ecken[0]);
    const m = kette.length;
    const zu = l.art !== 'ring';
    for (let j = 0; j < m; j++) {
      if (!hd[j]) continue;
      const h = 1;
      const w = kette[j]!;
      // an den Enden eines Rings geht die Linie in ihre Spiegelhälfte über
      const vor = j > 0 ? kette[j - 1]! : zu ? kette[m - 1]! : haut.spiegel[kette[1]!]!;
      const nach = j < m - 1 ? kette[j + 1]! : zu ? kette[0]! : haut.spiegel[kette[m - 2]!]!;
      teilen(w, vor, nach, h);
      const ws = haut.spiegel[w]!;
      if (l.art !== 'mitte' && ws >= 0 && ws !== w) teilen(ws, haut.spiegel[vor]!, haut.spiegel[nach]!, h);
    }
  }
  anzeigeQuelle = Int32Array.from(quelle);
  anzeigeKante = Float32Array.from(kante);
  anzeigeIndex = index;
}
/* in G: neuZeichnen */

/**
 * Ausschnitt je Blatt: Mitte in Blattkoordinaten und Zoom (1 = SICHT Welteinheiten auf der kürzeren Seite der Seitenansicht, so
 * zeigen alle Blätter ungezoomt denselben Maßstab). Rad und Pinch zoomen zum Zeiger, zwei Finger und die mittlere Taste
 * verschieben, Pos1 setzt zurück.
 */
export const ausschnitt: Record<Ansicht, { cx: number; cy: number; zoom: number }> = {
  seite: { cx: 0, cy: 0, zoom: 1 },
  front: { cx: 0, cy: 0, zoom: 1 },
  top: { cx: 0, cy: 0, zoom: 1 },
};

/** Weltpunkt → Blattkoordinaten (Welteinheiten, y nach unten) */
export const imBlatt = (a: Ansicht, p: V3): [number, number] => (a === 'seite' ? [p.x, -p.y] : a === 'front' ? [p.z, -p.y] : [p.x, p.z]);
/** Verschiebung im Blatt → Verschiebung in der Welt */
export const inWelt = (a: Ansicht, dx: number, dy: number): V3 =>
  a === 'seite' ? { x: dx, y: -dy, z: 0 } : a === 'front' ? { x: 0, y: -dy, z: dx } : { x: dx, y: 0, z: dy };
/** Verschieben um Bildpunkte (wie das Papier unter dem Zeiger) */
export function schieben(a: Ansicht, dx: number, dy: number): void {
  const s = anzeige.skala(a);
  ausschnitt[a].cx -= dx / s;
  ausschnitt[a].cy -= dy / s;
  anzeige.ausschnittGeaendert(a);
}
/** zuletzt geschnittenes Maul der Grundform: gilt für diese Haut, diese Kette und diesen Mundwinkel, bei dieser Lage der Haut (`fp`) */
export let maulStand: { haut: Haut; proben: Loop['proben']; ecke: number; fp: number; m: MaulAmLoop } | null = null;
/**
 * Das Maul, wie es gezeigt wird: der Schnitt der Grundform (Öffnung, Gewichte) und das Innere — in der Grundform zu, in der Pose aus
 * der Ruhe der Pose geschnitten und mit den Knochen gedreht.
 */
/* in G: maulGezeigt */
export let maulIndex: { aus: Uint32Array; offen: Uint8Array; index: Uint32Array } | null = null;

/** Fingerabdruck der Lagen: ändert sich die Haut, wird das Maul neu geschnitten */
export function fingerabdruck(P: Float64Array): number {
  let f = 0;
  for (let i = 0; i < P.length; i++) f += P[i]! * ((i % 7) + 1);
  return f;
}

/** Probe des Mundwinkels: am Punkt `mundwinkel` (fehlt er, dort, wo der Loop am weitesten von der Mitte seiner Enden liegt) */
export function mundwinkelVon(l: Loop): number {
  const p = l.punkte.find((q) => q.mundwinkel);
  if (!p) return mundwinkelProbe(l);
  let best = Infinity;
  let wo = -1;
  for (let i = 1; i < l.proben.length - 1; i++) {
    const d = Math.abs(l.s[i]! - p.s);
    if (d < best) {
      best = d;
      wo = i;
    }
  }
  return wo;
}

/**
 * Der Maulschnitt der Grundform (in der Pose die gemerkte Grundform): Öffnung und Gewichte der Knochen. Neu geschnitten wird nur,
 * wenn sich Haut, Kette, Mundwinkel oder Lagen geändert haben; in einem Zug in der Grundform gelten die Gewichte vom Anfang weiter
 * (nur Lagen und Inneres neu), danach wird ganz neu geschnitten.
 */
export function maulAktuell(): MaulAmLoop | null {
  if (!G.maul) return null;
  const id = G.maul.id;
  const h = grund ? grund.haut : haut;
  const alle = grund ? grund.loops : loops;
  const l = alle.find((x) => x.id === id);
  if (!l || l.art !== 'ring') return null;
  const ecke = mundwinkelVon(l);
  const fp = fingerabdruck(h.pos);
  const st = maulStand;
  const gleich = st !== null && st.haut === h && st.proben === l.proben && st.ecke === ecke;
  if (gleich && st.fp === fp) return st.m;
  const imZug = gleich && zug !== null && !grund;
  const m = maulSchnitt(h, l, ecke, imZug ? st.m : null, alle);
  maulStand = m ? { haut: h, proben: l.proben, ecke, fp: imZug ? st.fp : fp, m } : null;
  return m;
}

/**
 * Das Maul der Pose ist ein geformtes (nichts wird weggeschnitten, es gibt kein eingesetztes Inneres zu zeigen). Dazu zählt das Maul
 * als echte Form (`istMaulEcht`): Seine Tasche ist Haut der Form.
 */
export const maulIstGeformt = (): boolean => {
  const l = G.maul ? loops[loopNr(G.maul.id)] : undefined;
  return !!l && (!!l.maulGeformt || istMaulEcht(l));
};

/**
 * Der Maulschnitt an einem Ring, nach seiner Art: Am geformten Maul (`maulGeformt`: Was der Ring umschließt, ist echte Haut) wird
 * nichts weggeschnitten und nichts eingesetzt, die Knochen bekommen innen weiche Gewichte vom Boden zum Gaumen
 * (`maulGeformtAmLoop`); an der schmalen Form bisher ist die umschlossene Fläche die Öffnung (`maulAmLoop`).
 */
export function maulSchnitt(h: Haut, l: Loop, ecke: number, wieVorher: MaulAmLoop | null, alle: readonly Loop[] = loops): MaulAmLoop | null {
  // Das Maul als echte Form (Etappe 2, 20.11.): Welcher Kiefer ein Punkt ist, steht in seinen Linien (`maulEchtAmLoop`); zu liegen
  // Gaumen und Boden aufeinander, die Lage sagt dort nichts
  if (istMaulEcht(l)) return maulEchtAmLoop(h, alle, l, ecke, { wieVorher, ersteUnten: G.maul?.id === l.id ? G.maul.ersteUnten : undefined });
  return l.maulGeformt ? maulGeformtAmLoop(h, l, ecke, { zelle: MK / 2, wieVorher }) : maulAmLoop(h, l, ecke, { zelle: MK / 2, wieVorher });
}

/** Die gezeigten Dreiecke ohne die Öffnung (je Dreieck des Netzes eins in `anzeigeIndex`) */
export function indexOhneOeffnung(offen: Uint8Array): Uint32Array {
  if (maulIndex && maulIndex.aus === anzeigeIndex && maulIndex.offen === offen) return maulIndex.index;
  const I = anzeigeIndex;
  const neu: number[] = [];
  for (let f = 0; f < I.length / 3; f++) if (!offen[f]) neu.push(I[3 * f]!, I[3 * f + 1]!, I[3 * f + 2]!);
  maulIndex = { aus: anzeigeIndex, offen, index: new Uint32Array(neu) };
  return maulIndex.index;
}

/**
 * Das Maul anlegen, falls es noch keins gibt: am gewählten Ring (eine schmale Form, mit F über die Mitte oder vorn über den Umriss
 * gezeichnet). Sein Mundwinkel wird ein Punkt (Ecke ◆): der vorhandene an der Stelle, die am weitesten von der Mitte der beiden
 * Enden liegt, sonst ein neuer.
 */
export function maulAnlegen(): boolean {
  if (G.maul && loops[loopNr(G.maul.id)]?.art === 'ring') return true;
  const l = G.auswahl.map((w) => loops[loopNr(w.l)]).find((x) => x?.art === 'ring' && !x.haengt);
  // Ein harter Ring ist ein geformtes Maul (von Hand oder mit „Maul formen“): Was er umschließt, sind Gaumen und Boden, echte Haut.
  // Die Knochen schneiden dort nichts weg (Etappe 2, 13.11.; die schmale Form bisher ist eine weiche Linie auf geschlossener Haut).
  if (l && !l.maulGeformt && l.kante && l.punkte.every((p) => p.kante !== false)) l.maulGeformt = true;
  if (!l) {
    G.meldung = 'Kein Maul: erst mit F eine schmale Form ums Maul zeichnen (vorn über den Umriss oder über die Mitte) und wählen';
    G.maul = null;
    return false;
  }
  // (ein geformtes Maul hat seinen Mundwinkel schon)
  if (!l.punkte.some((q) => q.mundwinkel)) {
    const s = l.s[mundwinkelProbe(l)]!;
    const p = l.punkte.find((q) => Math.abs(q.s - s) < MK) ?? punktEinfuegen(l, s, undefined, exakt(l));
    p.mundwinkel = true;
    if (p.ecke === undefined) p.ecke = true;
  }
  G.maul = { id: l.id };
  G.meldung = '';
  return true;
}

// ---------- Fressen-Pose ----------

/**
 * So weit ist das Maul in der gerechneten Lage offen (Grad): bei einem Maul aus einer Linie ihr Winkel (`Loop.maulLinie`), sonst 0.
 * Der Regler „Maul“ zählt von „zu“: Bei 0 dreht der Kiefer um diesen Winkel zurück, die Lippen liegen aufeinander.
 */
export function maulZu(): number {
  if (!G.maul) return 0;
  const id = G.maul.id;
  return (grund ? grund.loops : loops).find((x) => x.id === id)?.maulLinie ?? 0;
}
/**
 * Der Blick ins Maul (Plan „Maul, Zähne, Zunge“, Etappe 2, 20.11.): In der Grundform öffnet die Anzeige das Maul um diesen Anteil
 * der Pose (0 = zu, 1 = wie in „Fressen“), solange ein Tropfen an einem Kiefer gehalten wird und kurz nach dem Schneiden. Gerechnet
 * und bearbeitet wird dabei nichts: Die Form bleibt zu.
 */
export let maulBlick = 0;
export function maulBlickSetzen(x: number): void {
  maulBlick = Math.max(0, Math.min(1, x));
}
/** Die Anzeige dreht mit den Knochen: in der Pose immer, in der Grundform beim Blick ins Maul */
export const anzeigeDreht = (): boolean => grund !== null || (maulBlick > 0 && G.maul !== null && zug === null);
/** Drehwinkel je Punkt für den Stand der Regler (beim Maul aus einer Linie gegen die gerechnete Lage: Regler minus ihre Öffnung) */
export function knochenJetzt(m: MaulAmLoop): Float64Array {
  const zu = maulZu();
  // (in der Grundform dreht nur der Blick ins Maul, um seinen Anteil)
  const f = grund ? 1 : maulBlick;
  const k = { kiefer: pose.kiefer * f - zu, schaedel: pose.schaedel * f };
  // (am Maul als echte Form laufen die Drehungen mit dem Winkel breiter aus: `kieferWinkel`)
  return kieferWinkel(m, k, zu) ?? knochenWinkel(m, k, zu);
}

/** knapp vor „zu“ rastet ein Kiefer zu (Grad) */
export const KIEFER_RAST = 2;
/**
 * Einen Kiefer stellen (Grad, von „zu“ aus): oben der Schädel, unten der Unterkiefer. Gerechnet wird nichts, nur die Anzeige dreht
 * anders (in der Pose immer, in der Grundform beim Blick ins Maul). Zurück: der gesetzte Winkel.
 */
export function kieferStellen(oben: boolean, grad: number): number {
  const a = !(grad >= KIEFER_RAST) ? 0 : Math.min(oben ? KIEFER_MAX.oben : KIEFER_MAX.unten, grad);
  if (oben) pose.schaedel = a;
  else pose.kiefer = a;
  return a;
}

/**
 * Die zwei Knochen des Mauls als echte Form, wie sie zu zeigen sind (in der Seitenebene des Werks): das Scharnier (der Mundwinkel),
 * die Länge der Lippe und je Kiefer der Ort seines Tropfens in Ruhe (ein Stück vor der Kieferspitze), sein Winkel (Grad, von „zu“)
 * und sein Drehsinn beim Öffnen (+1 gegen den Uhrzeigersinn). `gezeigt`: der Anteil, um den die Anzeige gerade öffnet. `mindVor`,
 * `mindSeit`: so weit sitzt ein Tropfen mindestens vor und neben seiner Kieferspitze (Einheiten des Werks). Null: Die Form hat
 * kein solches Maul.
 */
export function kieferKnochen(mindVor = 0, mindSeit = 0): { C: V2; lang: number; gezeigt: number; oben: { ruhe: V2; grad: number; sinn: 1 | -1 }; unten: { ruhe: V2; grad: number; sinn: 1 | -1 } } | null {
  if (!G.maul) return null;
  const l = loops[loopNr(G.maul.id)];
  if (!l || !istMaulEcht(l)) return null;
  const L = maulLage(haut, l, mundwinkelVon(l), G.maul?.ersteUnten);
  if (!L) return null;
  return {
    C: L.C,
    lang: Math.max(L.oben.lang, L.unten.lang),
    gezeigt: grund ? 1 : maulBlick,
    oben: { ruhe: kieferTropfenRuhe(L.oben, mindVor, mindSeit), grad: pose.schaedel, sinn: L.oben.links ? 1 : -1 },
    unten: { ruhe: kieferTropfenRuhe(L.unten, mindVor, mindSeit), grad: pose.kiefer, sinn: L.unten.links ? 1 : -1 },
  };
}

/**
 * Knochen der Pose: der Maulschnitt der Grundform (seine Gewichte), der Drehwinkel je Punkt und das Gelenk. Das Gelenk ist der
 * Mundwinkel, wie er jetzt liegt (er dreht selbst nicht mit: in der Pose liegt er dort, wo in ihrer Ruhe).
 */
export function poseKnochen(): { m: MaulAmLoop; theta: Float64Array; G: V2; l: Loop; ecke: number } | null {
  const m = maulAktuell();
  if (!m || !G.maul) return null;
  const l = loops[loopNr(G.maul.id)];
  if (!l) return null;
  const ecke = mundwinkelVon(l);
  const v = l.proben[ecke]!.ecken[0];
  return { m, theta: knochenJetzt(m), G: { x: haut.pos[3 * v]!, y: haut.pos[3 * v + 1]! }, l, ecke };
}

/**
 * In die Pose: Die Grundform wird gemerkt; gezeigt und bearbeitet wird die Pose, wie sie zu sehen ist (Grundform + Blendshape, mit
 * den Knochen gedreht). Die Loops sind Kopien mit derselben Kette.
 */
export function poseBetreten(): boolean {
  if (grund) return true;
  if (!maulAnlegen()) return false;
  const m = maulAktuell();
  const l = G.maul ? loops[loopNr(G.maul.id)] : undefined;
  if (!m || !l) {
    G.meldung = 'Das Maul schneidet nicht (ist die Form als Kette ins Netz eingesetzt?)';
    return false;
  }
  const d = pose.delta && pose.delta.length === haut.pos.length ? pose.delta : null;
  const ruhe = d ? Float64Array.from(haut.pos, (x, i) => x + d[i]!) : Float64Array.from(haut.pos);
  const alt = !maulIstGeformt();
  const g = { haut, loops };
  grund = g;
  // die Ruhe der Pose: mit ihr wird gerechnet, gedreht wird erst beim Zeigen (`alsAnzeige`)
  haut = { ...g.haut, pos: ruhe };
  /** Linien, die an der Haut der Pose abgelesen wurden (statt Grundform plus Versatz) */
  const abgelesen = new Set<Loop>();
  loops = g.loops.map((x) => {
    const c = kopieLoop(x);
    if (alt) {
      festlegen(haut, c);
      // die Griffe der Linien der Pose (ohne neue Ecken: was in der Pose knickt, gehört der Pose)
      if (hatGriffe(c)) griffeAnlegen(c, c.ruhe);
      return c;
    }
    // Die Pose ist eine zweite Lage derselben Linien: ihre Punkte und Griffe = die der Grundform plus Versatz
    const v = pose.linien?.find((y) => y.id === x.id);
    const versatz = v ? poseVersatzFuer(v, c) : null;
    if (versatz) {
      c.punkte.forEach((q, i) => {
        const o = versatz[i]!;
        q.ref = { x: q.ref.x + o.d.x, y: q.ref.y + o.d.y, z: q.ref.z + o.d.z };
        q.cur = { ...q.ref };
        if (q.ein && o.ein) q.ein = { x: q.ein.x + o.ein.x, y: q.ein.y + o.ein.y, z: q.ein.z + o.ein.z };
        if (q.aus && o.aus) q.aus = { x: q.aus.x + o.aus.x, y: q.aus.y + o.aus.y, z: q.aus.z + o.aus.z };
      });
      festlegen(haut, c, false);
    } else if (d) {
      // ein Blendshape ohne gespeicherte Linien (eine Pose von vor dem 14.11.): Die Linien werden einmal an der Haut der Pose abgelesen
      festlegen(haut, c);
      if (hatGriffe(c)) griffeAnlegen(c, c.ruhe, true);
      abgelesen.add(c);
    } else festlegen(haut, c, false);
    return c;
  });
  // Die Haut der Pose (Grundform plus Blendshape) setzt sich auf ihre Linien (Grundform plus Versatz). Eine Linie mit Versatz behält
  // dabei die Stelle jeder Probe auf dem Pfad: Es ist dieselbe wie in der Grundform, sonst rückte die Grundform beim Verlassen nach.
  // Nötig, wo die Grundform inzwischen neue Punkte im Netz bekam (ihr Blendshape ist nur aus den Nachbarn gemittelt), und für
  // abgelesene Linien (sie liegen nicht ganz auf ihrem Pfad).
  if (!alt) linienAufPfad(undefined, { behalten: (l) => !abgelesen.has(l), ab: POSE_GENAU });
  anzeige.geometrieNeu();
  G.meldung = '';
  return true;
}

/**
 * Der Versatz einer Linie der Pose für die Punkte, die ihre Linie der Grundform jetzt hat (Schritt 5, Etappe 3: die Pose geht mit).
 * Gemerkt ist er je Punkt, mit der Stelle `s` des Punkts. Ein Punkt an derselben Stelle behält seinen Versatz. Ein neuer Punkt der
 * Grundform (Doppelklick, neue Kreuzung) hat sein Stück dort geteilt (`punktEinfuegen`: de Casteljau beim Anteil von s). Der Versatz
 * der Pose längs eines Stücks ist selbst ein kubisches Stück (seine Kontrollpunkte: der Versatz der zwei Punkte und ihrer
 * Griffspitzen) und wird an derselben Stelle geteilt: Die Linie der Pose bleibt genau, wie sie war, und der neue Punkt liegt auf ihr.
 * Ein gelöschter Punkt fällt weg; seine Nachbarn behalten ihre Griffe wie in der Grundform. Null: kein Zusammenhang mehr (andere
 * Länge, ein Punkt außerhalb der alten Stücke, gemerkt ohne Stellen und mit anderer Punktzahl) — dann wird die Linie an der Haut der
 * Pose abgelesen. Hat die Linie dieselbe Punktzahl, aber fast überall andere Stellen (ein geschlossener Loop hat seinen Anfang
 * verschoben, `pfadParameter`), gilt der Versatz der Reihe nach.
 */
export function poseVersatzFuer(v: PoseLinie, l: Loop): PoseVersatz[] | null {
  const A = v.punkte;
  const m = A.length;
  const n = l.punkte.length;
  const L = v.laenge;
  if (L === undefined || A.some((x) => x.s === undefined)) return m === n ? A : null;
  const eps = 1e-6 * Math.max(1, l.laenge);
  if (Math.abs(L - l.laenge) > eps) return m === n ? A : null;
  const zu = l.art !== 'ring';
  // wo jeder Punkt von jetzt in den alten Stücken liegt: auf einem alten Punkt oder im Stück k (vom alten Punkt k zum nächsten) bei t
  type Ort = { auf: number } | { k: number; t: number };
  let treffer = 0;
  const orte: (Ort | null)[] = l.punkte.map((p) => {
    const auf = A.findIndex((x) => Math.abs(x.s! - p.s) <= eps);
    if (auf >= 0) {
      treffer++;
      return { auf };
    }
    for (let k = 0; k < (zu ? m : m - 1); k++) {
      const s0 = A[k]!.s!;
      const s1 = k + 1 < m ? A[k + 1]!.s! : A[0]!.s! + L;
      // (das letzte Stück eines geschlossenen Loops läuft über das Ende hinaus: Stellen vor dem ersten Punkt zählen dort weiter)
      const x = k === m - 1 && p.s < s0 ? p.s + L : p.s;
      if (x > s0 && x < s1) return { k, t: (x - s0) / (s1 - s0) };
    }
    return null;
  });
  if (m === n && treffer === n) return orte.map((o) => A[(o as { auf: number }).auf]!);
  if (m === n && 2 * treffer <= n) return A;
  if (treffer === 0 || orte.some((o) => o === null)) return null;
  const misch = (p: V3, q: V3, t: number): V3 => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t });
  const mal = (p: V3, f: number): V3 => ({ x: p.x * f, y: p.y * f, z: p.z * f });
  const weg = (p: V3, q: V3): V3 => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
  /** Blüte des Versatzes im alten Stück k (Kontrollpunkte des Teilstücks von a bis b: b(a,a,a), b(a,a,b), b(a,b,b), b(b,b,b)) */
  const bluete = (k: number, t1: number, t2: number, t3: number): V3 | null => {
    const a = A[k]!;
    const b = A[(k + 1) % m]!;
    if (!a.aus || !b.ein) return null;
    const C = [a.d, plus3(a.d, a.aus), plus3(b.d, b.ein), b.d] as const;
    const a01 = misch(C[0], C[1], t1);
    const a12 = misch(C[1], C[2], t1);
    const a23 = misch(C[2], C[3], t1);
    return misch(misch(a01, a12, t2), misch(a12, a23, t2), t3);
  };
  const out: PoseVersatz[] = [];
  for (let i = 0; i < n; i++) {
    const o = orte[i]!;
    const vorher = zu || i > 0 ? orte[(i - 1 + n) % n]! : null;
    const nachher = zu || i < n - 1 ? orte[(i + 1) % n]! : null;
    if ('auf' in o) {
      const a = A[o.auf]!;
      // Die Griffe werden kürzer, wo ein neuer Punkt das Stück daneben geteilt hat. Am Ende eines Rings auf der Mitte ist der zweite
      // Griff das Spiegelbild des ersten: Er wird mit ihm kürzer.
      const fAus = nachher && 'k' in nachher && nachher.k === o.auf ? nachher.t : 1;
      const fEin = vorher && 'k' in vorher && vorher.k === (o.auf - 1 + m) % m && (zu || o.auf > 0) ? 1 - vorher.t : 1;
      const amAnfang = !zu && i === 0 && endeAufMitte(l, 0);
      const amEnde = !zu && i === n - 1 && endeAufMitte(l, 1);
      out.push({ d: a.d, ein: a.ein ? mal(a.ein, amAnfang ? fAus : fEin) : null, aus: a.aus ? mal(a.aus, amEnde ? fEin : fAus) : null });
      continue;
    }
    // ein neuer Punkt im alten Stück k: sein Teilstück reicht bis zu den Nachbarn von jetzt, soweit sie im selben Stück liegen
    const a = vorher && 'k' in vorher && vorher.k === o.k && vorher.t < o.t ? vorher.t : 0;
    const b = nachher && 'k' in nachher && nachher.k === o.k && nachher.t > o.t ? nachher.t : 1;
    const M = bluete(o.k, o.t, o.t, o.t);
    const E = bluete(o.k, a, o.t, o.t);
    const U = bluete(o.k, o.t, o.t, b);
    if (!M || !E || !U) return null;
    out.push({ d: M, ein: weg(E, M), aus: weg(U, M) });
  }
  return out;
}

/**
 * In der Pose (am geformten Maul) gibt es keine neuen Punkte und Linien und kein Löschen: Sie ist dieselbe Form in einer anderen
 * Lage, ihre Linien sind die der Grundform plus Versatz (Florian, 13.11.: „Ich verstehe, dass ich keine neuen Edgeloops oder Punkte
 * in der Pose hinzufügen kann, aber verschieben und bearbeiten sollte ich alles ohne Probleme können“). Wahr: `was` geht hier nicht
 * (die Meldung steht). Am Maul aus der schmalen Form bleibt es wie bisher erlaubt.
 */
export function nurInGrundform(was: string): boolean {
  if (!grund || altePose()) return false;
  G.meldung = `${was} in der Grundform (erst „Fressen“ aus): Die Pose ist dieselbe Form in einer anderen Lage, mit denselben Punkten und Linien`;
  anzeige.statusZeigen();
  return true;
}

/** Nach einem Schritt in der Pose: Blendshape (Ruhe der Pose minus Grundform) merken */
export function poseSichern(): void {
  if (!grund || grund.haut.pos.length !== haut.pos.length) return;
  const d = new Float64Array(haut.pos.length);
  for (let i = 0; i < d.length; i++) d[i] = haut.pos[i]! - grund.haut.pos[i]!;
  pose.delta = d;
  // die Linien der Pose als Versatz gegen die der Grundform (Punkt für Punkt; am Maul aus der schmalen Form wie bisher keine)
  const basis = grund.loops;
  pose.linien = altePose()
    ? null
    : loops.flatMap((l): PoseLinie[] => {
        const b = basis.find((x) => x.id === l.id);
        if (!b || b.punkte.length !== l.punkte.length) return [];
        const weg = (p: V3 | undefined, q: V3 | undefined): V3 | null => (p && q ? { x: p.x - q.x, y: p.y - q.y, z: p.z - q.z } : null);
        return [{ id: l.id, laenge: b.laenge, punkte: l.punkte.map((p, i) => ({ s: b.punkte[i]!.s, d: weg(p.ref, b.punkte[i]!.ref)!, ein: weg(p.ein, b.punkte[i]!.ein), aus: weg(p.aus, b.punkte[i]!.aus) })) }];
      });
}

// ---------- Die Pose zeigen: Die Knochen drehen nur, was gezeigt wird ----------

/** Punkt p um das Gelenk G um den Winkel t gedreht (in der Seite; die Tiefe bleibt), wie `knochenDrehen` je Punkt des Netzes */
export function gedreht(p: V3, t: number, G: V2): V3 {
  if (t === 0) return p;
  const c = Math.cos(t);
  const si = Math.sin(t);
  const dx = p.x - G.x;
  const dy = p.y - G.y;
  return { x: G.x + c * dx - si * dy, y: G.y + si * dx + c * dy, z: p.z };
}
/** ein Vektor (ein Griff, eine Verschiebung) um den Winkel t gedreht */
export function vektorGedreht(v: V3, t: number): V3 {
  if (t === 0) return v;
  const c = Math.cos(t);
  const si = Math.sin(t);
  return { x: c * v.x - si * v.y, y: si * v.x + c * v.y, z: v.z };
}
/** der Drehwinkel je Probe einer Linie (aus den Winkeln der Punkte des Netzes, an denen sie hängt) */
export function winkelJeProbe(theta: Float64Array, l: Loop): Float64Array {
  return Float64Array.from(l.proben, (q) => q.b[0]! * theta[q.ecken[0]]! + q.b[1]! * theta[q.ecken[1]]! + q.b[2]! * theta[q.ecken[2]]!);
}
/** der Drehwinkel an der Stelle s einer Linie: zwischen ihren Proben nach s gemittelt */
export function winkelBei(l: Loop, tj: Float64Array, s: number): number {
  const n = l.proben.length;
  if (n === 0) return 0;
  const zu = l.art !== 'ring';
  for (let j = 0; j < (zu ? n : n - 1); j++) {
    const j2 = (j + 1) % n;
    const s0 = l.s[j]!;
    const s1 = j2 > j ? l.s[j2]! : l.laenge;
    if (s < s0 - 1e-9 || s > s1 + 1e-9) continue;
    const f = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
    return (1 - f) * tj[j]! + f * tj[j2]!;
  }
  return s <= l.s[0]! ? tj[0]! : tj[n - 1]!;
}
/** die gedrehte Kopie einer Linie der Pose: ihre Lagen je Probe, ihre Punkte und Griffe, jedes mit seinem Winkel */
export function loopGedreht(l: Loop, theta: Float64Array, G: V2): Loop {
  const tj = winkelJeProbe(theta, l);
  const ruhe = new Float64Array(l.ruhe.length);
  for (let j = 0; j < tj.length; j++) {
    const q = gedreht(lageAus(l.ruhe, j), tj[j]!, G);
    ruhe[3 * j] = q.x;
    ruhe[3 * j + 1] = q.y;
    ruhe[3 * j + 2] = q.z;
  }
  const punkte = l.punkte.map((q) => {
    const t = winkelBei(l, tj, q.s);
    return { ...q, ref: gedreht(q.ref, t, G), cur: gedreht(q.cur, t, G), ...(q.ein ? { ein: vektorGedreht(q.ein, t) } : {}), ...(q.aus ? { aus: vektorGedreht(q.aus, t) } : {}) };
  });
  return { ...l, ruhe, punkte };
}

/**
 * In der Pose `f` so ausführen, dass `haut` und `loops` die gezeigte (gedrehte) Pose sind; danach stehen wieder die der Ruhe da.
 * Auch was ein laufender Zug zum Zeichnen bereithält (Lagen und Griffe der Linien an ihrem Ziel), ist währenddessen gedreht. In der
 * Grundform und geschachtelt: einfach `f`. Beim Blick ins Maul (`maulBlick`) dreht die Anzeige auch in der Grundform.
 */
export function alsAnzeige<T>(f: () => T): T {
  const k = anzeigeDreht() && !inAnzeige ? poseKnochen() : null;
  if (!k) return f();
  if (!anzeigeHaut || anzeigeHaut.von !== haut) anzeigeHaut = { von: haut, haut: { ...haut, pos: new Float64Array(haut.pos.length) } };
  anzeigeHaut.haut.pos.set(knochenDrehen(haut.pos, k.theta, k.G));
  const ruhe = { haut, loops };
  const z = zug;
  const zr = z ? { lagen: z.lagen, griffeNeu: z.griffeNeu } : null;
  if (z) {
    const tj = loops.map((l) => winkelJeProbe(k.theta, l));
    z.lagen = z.lagen.map((L, li) => {
      const t = tj[li];
      if (!t || L.length !== 3 * t.length) return L;
      const out = new Float64Array(L.length);
      for (let j = 0; j < t.length; j++) {
        const q = gedreht(lageAus(L, j), t[j]!, k.G);
        out[3 * j] = q.x;
        out[3 * j + 1] = q.y;
        out[3 * j + 2] = q.z;
      }
      return out;
    });
    z.griffeNeu = z.griffeNeu.map((g, li) => {
      const l = loops[li];
      const t = tj[li];
      if (!g || !l || !t) return g;
      return g.map((x, i) => {
        const w = winkelBei(l, t, l.punkte[i]?.s ?? 0);
        return { ein: vektorGedreht(x.ein, w), aus: vektorGedreht(x.aus, w) };
      });
    });
  }
  haut = anzeigeHaut.haut;
  loops = ruhe.loops.map((l) => loopGedreht(l, k.theta, k.G));
  anzeigeVon = { loops: ruhe.loops, griffeNeu: zr?.griffeNeu ?? null, theta: k.theta, G: k.G, gebogen: new Map() };
  inAnzeige = true;
  try {
    return f();
  } finally {
    haut = ruhe.haut;
    loops = ruhe.loops;
    inAnzeige = false;
    anzeigeVon = null;
    if (z && zr) {
      z.lagen = zr.lagen;
      z.griffeNeu = zr.griffeNeu;
    }
  }
}

/**
 * Loops der Grundform aus denen der Pose: dieselbe Kette und dieselben Punkte, Lagen der Grundform. Griffe: wo der Punkt in der
 * Grundform schon war, seine (`alt`); neue Punkte und die Nachbarn gelöschter lesen sie aus der Linie der Grundform ab.
 */
export function grundLoopsAus(h: Haut, alt: readonly Loop[]): Loop[] {
  return loops.map((l) => {
    const c = kopieLoop(l);
    festlegen(h, c);
    if (!hatGriffe(c)) return c;
    const vorher = alt.find((x) => x.id === c.id);
    const eps = 1e-6 * Math.max(1, c.laenge);
    const neu = new Set<number>();
    c.punkte.forEach((p, i) => {
      const q = vorher?.punkte.find((x) => Math.abs(x.s - p.s) <= eps && x.ein && x.aus);
      if (q) {
        p.ein = { ...q.ein! };
        p.aus = { ...q.aus! };
        // und ihren Ort (die Linie der Grundform liegt genau auf ihrem Pfad; von ihr abgelesen wanderte er um den Rest des Lösers)
        p.ref = { ...q.ref };
        p.cur = { ...q.ref };
      } else neu.add(i);
    });
    // in der Pose gelöschte Punkte: ihre Nachbarn neu
    for (const q of vorher?.punkte ?? []) {
      if (c.punkte.some((p) => Math.abs(p.s - q.s) <= eps)) continue;
      const nach = c.punkte.findIndex((p) => p.s > q.s);
      const m = c.punkte.length;
      if (nach >= 0) neu.add(nach);
      neu.add(nach > 0 ? nach - 1 : m - 1);
    }
    if (neu.size) griffeErgaenzen(c, c.ruhe, neu);
    return c;
  });
}

/** Zurück in die Grundform: Was in der Pose an Punkten, Ecken, Kanten oder Loops dazukam, gilt dort auch (die Form bleibt). */
export function poseVerlassen(): void {
  if (!grund) return;
  poseSichern();
  const ruhe = haut.pos;
  const basis = grund.haut;
  loops = grundLoopsAus(basis, grund.loops);
  haut = basis;
  grund = null;
  anzeige.geometrieNeu();
  // was in der Pose an Punkten oder Loops dazukam, liest seine Griffe an der Linie der Grundform ab: auch diese Linien genau auf ihren Pfad
  if (linienAufPfad() && pose.delta && ruhe.length === haut.pos.length) {
    // Die Grundform hat sich dabei bewegt: Der Blendshape zählt gegen die Grundform, wie sie jetzt ist (sonst wäre die Pose beim
    // nächsten Betreten eine andere als die verlassene)
    for (let i = 0; i < ruhe.length; i++) pose.delta[i] = ruhe[i]! - haut.pos[i]!;
  }
}

/**
 * In der Pose, nach einem Netzwechsel: Ein neuer Punkt des Netzes auf einer Linie (ab `abPunkt`) liegt in der Grundform genau auf dem
 * Pfad ihrer Linie, an derselben Stelle wie in der Pose (eine Probe hat in beiden dasselbe t). Er bekäme sonst die Lage der Pose
 * minus den Blendshape seiner Nachbarn: Wo sich der Versatz einer Linie längs ändert, liegt das bis 2 neben dem Pfad der Grundform
 * (gemessen an „maul handgemacht test“ nach einem Zug an der Lippe). Beim Verlassen rückte `linienAufPfad` die Grundform dann
 * zurecht, nachdem der Blendshape schon gemerkt war: Verlassen und wieder betreten gab eine andere Pose (Haut bis 1,9 anders, die
 * Lippenlinie 2 neben ihrem Pfad). Die Punkte, die es schon gab, bleiben in der Grundform, wo sie sind.
 */
export function grundAufPfad(abPunkt: number): void {
  const g = grund;
  const d = pose.delta;
  if (!g || !d || altePose()) return;
  const B = g.haut.pos;
  const R = haut.pos;
  const setzen = (v: number, x: number, y: number, z: number): void => {
    B[3 * v] = x;
    B[3 * v + 1] = y;
    B[3 * v + 2] = z;
    d[3 * v] = R[3 * v]! - x;
    d[3 * v + 1] = R[3 * v + 1]! - y;
    d[3 * v + 2] = R[3 * v + 2]! - z;
  };
  let geaendert = false;
  for (const l of g.loops) {
    const P = hatPfad(l) ? pfadLagen(l) : null;
    if (!P) continue;
    l.proben.forEach((pr, j) => {
      // (nur eingesetzte Linien: die Probe ist ein Punkt des Netzes)
      const v = pr.ecken[0];
      if (v < abPunkt || pr.ecken[1] !== v || pr.ecken[2] !== v) return;
      const q = lageAus(P, j);
      if (Math.hypot(B[3 * v]! - q.x, B[3 * v + 1]! - q.y, B[3 * v + 2]! - q.z) <= 1e-9) return;
      setzen(v, q.x, q.y, q.z);
      const w = g.haut.spiegel[v]!;
      if (w !== v && w >= abPunkt) setzen(w, q.x, q.y, -q.z);
      geaendert = true;
    });
  }
  if (geaendert) for (const l of g.loops) festlegen(g.haut, l, false);
}

/** Zuordnung für ein Netz, das nur gewachsen ist: die alten Punkte bleiben vorn, neue ab `nAlt` */
export const nurGewachsen = (n: number, nAlt: number): Int32Array => Int32Array.from({ length: n }, (_, i) => (i < nAlt ? i : -1));

/**
 * Das Netz hat sich geändert (verdichtet, zu kurze Kanten zusammengelegt, Loop eingesetzt). `alt`: je neuer Punkt seine Nummer im
 * alten Netz (−1: neu); die gebliebenen alten stehen vorn in ihrer Reihenfolge. In der Pose bekommt die Grundform dieselben Punkte —
 * die alten bleiben, wo sie sind, die neuen liegen dort, wo sie in der Pose liegen, zurückgedreht und um den Blendshape ihrer
 * Nachbarn verschoben. In der Grundform bekommt der Blendshape Werte für die neuen Punkte. `vorher`: Knochen vor der Änderung.
 */
export function netzGewachsen(nAlt: number, alt: Int32Array, vorher: { theta: Float64Array; G: V2 } | null): void {
  let m = 0;
  while (m < alt.length && alt[m]! >= 0) m++;
  /** Werte je alter Punkt (k je Punkt) in der neuen Reihenfolge der gebliebenen */
  const umordnen = (w: ArrayLike<number>, k: number): Float64Array => {
    const out = new Float64Array(k * m);
    for (let i = 0; i < m; i++) for (let c = 0; c < k; c++) out[k * i + c] = w[k * alt[i]! + c]!;
    return out;
  };
  const g = grund;
  void vorher;
  if (g) {
    // (in der Pose ist `haut` ihre Ruhe: nichts zurückzudrehen)
    const ruhe = haut.pos;
    const dAlt = umordnen(g.haut.pos, 3);
    for (let i = 0; i < dAlt.length; i++) dAlt[i] = ruhe[i]! - dAlt[i]!;
    const d = ergaenzen(haut, dAlt, m, 3, true);
    const basis = Float64Array.from(ruhe, (x, i) => x - d[i]!);
    const gh: Haut = { pos: basis, tri: haut.tri, n: haut.n, nachbarn: haut.nachbarn, spiegel: haut.spiegel };
    grund = { haut: gh, loops: grundLoopsAus(gh, g.loops) };
    pose.delta = d;
    grundAufPfad(m);
  } else if (pose.delta && pose.delta.length === 3 * nAlt) pose.delta = ergaenzen(haut, umordnen(pose.delta, 3), m, 3, true);
}

/** Knochen setzen (Grad); in die Pose, falls nötig. Die Ruhe der Pose bleibt, gerechnet wird nichts: Nur die Anzeige dreht anders. */
export function knochenSetzen(kiefer: number, schaedel: number): boolean {
  if (!poseBetreten()) return false;
  if (!poseKnochen()) return false;
  pose.kiefer = kiefer;
  pose.schaedel = schaedel;
  return true;
}

/**
 * Das Maul am gewählten Ring formen (13.11., Schritt 6). Florian: „Das Maul soll aber an einem gewählten Edgeloop immer noch
 * automatisch entstehen. […] Im Grunde machst du ja nur die Kante hart und verbindest von der Seite die gegenüberliegenden Seiten.
 * […] Das Maul ist dann einfach eine Form wie von Hand gemacht, nur automatisiert.“ Zweite Fassung nach seinem Modell
 * „simple_mouth“ (13.11. abends): keine Punkte im Maul, die Lippen hart. Dritte Fassung nach „simple_mouth_more simple“ (13.11.,
 * spät): Läuft keine Mittellinie durch beide Lippen, kommt auch keine dazu; die Maullinie trägt ihren Knick selbst (95° an den
 * Lippen, 70° am Mundwinkel, `kantenWinkel.ts`), und jede Rechnung des Fensters hält ihn (`LoopZug`). Mit einer Mittellinie durch
 * beide Lippen knickt deren Griff nach innen (zweite Fassung).
 * Gerechnet wird im Kern (`maulFormenSchritte`), die Haut folgt in Schritten; nichts wird geschnitten oder eingesetzt. Das Fenster
 * zeigt die Schritte (Florian: „Es sollte nur schön organisch animiert sein und nicht nach ‚Maul formen‘ einfach in die neue Form
 * springen“); so lange nimmt es keine Eingaben an.
 * `?maulWeg=mitte`: zum Vergleich die zweite Fassung auch ohne vorhandene Mittellinie (sie wird angelegt, die Kugel wird zur Zitrone).
 */
export const MAUL_WEG = new URLSearchParams(location.search).get('maulWeg') === 'mitte' ? ('mitte' as const) : ('kante' as const);
/** je Bild höchstens so viele Runden und so lange weiterrechnen (ms), dann zeigen: An der Startkugel dauert das Formen so rund 2 s */
export const MAUL_BILD_MS = 12;
export const MAUL_BILD_RUNDEN = Number(new URLSearchParams(location.search).get('maulRunden') ?? 2);
export let maulLauf: { lauf: ReturnType<typeof maulFormenSchritte>; id: number; vorher: Schnappschuss; nAlt: number; t0: number } | null = null;
export function maulFormenGewaehlt(standDavor?: Schnappschuss): void {
  if (zug || maulLauf) return;
  if (grund) {
    G.meldung = 'Das Maul wird in der Grundform geformt (erst „Fressen“ aus)';
    anzeige.statusZeigen();
    return;
  }
  const l = G.auswahl.map((w) => loops[loopNr(w.l)]).find((x) => x?.art === 'ring' && !x.haengt);
  if (!l) {
    G.meldung = 'Maul formen: erst mit F eine schmale Form ums Maul zeichnen (vorn über den Umriss oder über die Mitte) und wählen';
    anzeige.statusZeigen();
    return;
  }
  // der Stand davor, samt dem Maul der Anzeige an dieser Linie (Fläche weggeschnitten, Inneres eingesetzt): Es entfällt, seine
  // Fläche wird jetzt die Form
  const vorher = standDavor ?? schnappschuss();
  if (G.maul?.id === l.id) G.maul = null;
  maulLauf = {
    lauf: maulFormenSchritte(haut, loops, l.id, {
      naechsteId,
      naechsteKreuzung,
      gewichte: GEWICHTE,
      loeser: RICHTUNG_OPT,
      weg: MAUL_WEG,
      // verfeinert wird unterwegs wie nach jedem Zug (ohne die Angabe „verborgen“: Das Netz ändert sich dabei)
      ...(VERDICHTEN ? { verdichten: { maxKante: 1.75 * MK, opt: { ...verdichtenOptionen(), verborgen: null } } } : {}),
    }),
    id: l.id,
    vorher,
    nAlt: haut.n,
    t0: performance.now(),
  };
  // was der Hintergrund für den Stand davor noch setzen wollte, entfällt
  ruheOffen = null;
  anzeige.eingabenSperren(true);
  G.meldung = 'Das Maul wird geformt …';
  anzeige.statusZeigen();
}

/** Ein Bild der Animation: so lange weiterrechnen, wie das Bild Zeit hat, dann den Zwischenstand zeigen; am Ende übernehmen. */
export function maulSchritt(): void {
  const m = maulLauf;
  if (!m) return;
  const abbrechen = (text: string): void => {
    maulLauf = null;
    anzeige.eingabenSperren(false);
    wiederherstellen(m.vorher);
    G.meldung = text;
    anzeige.statusZeigen();
  };
  let st: ReturnType<typeof m.lauf.next>;
  let netzNeu = false;
  let stand: { haut: Haut; loops: Loop[] } | null = null;
  try {
    const t = performance.now();
    let zahl = 0;
    do {
      st = m.lauf.next();
      zahl++;
      if (!st.done) {
        netzNeu ||= st.value.netzNeu;
        stand = st.value;
      }
    } while (!st.done && zahl < MAUL_BILD_RUNDEN && performance.now() - t < MAUL_BILD_MS);
  } catch (e) {
    console.error('Fehler beim Formen des Mauls', e);
    abbrechen(`Maul formen: Beim Rechnen ist ein Fehler aufgetreten (${e instanceof Error ? e.message : String(e)}). Die Form steht wieder wie davor.`);
    return;
  }
  if (!st.done) {
    if (!stand) return;
    haut = stand.haut;
    loops = stand.loops;
    if (netzNeu) anzeige.geometrieNeu();
    anzeige.hautZeigen();
    anzeige.baenderZeigen();
    blaetterZeichnen();
    return;
  }
  const r = st.value;
  if ('fehler' in r) {
    abbrechen(`Maul formen geht so nicht: ${r.fehler}`);
    return;
  }
  maulLauf = null;
  anzeige.eingabenSperren(false);
  zurueck.push(m.vorher);
  haut = r.haut;
  loops = r.loops;
  naechsteId = r.naechsteId;
  naechsteKreuzung = r.naechsteKreuzung;
  netzGewachsen(m.nAlt, r.alt, null);
  G.auswahl = [{ l: m.id, i: -1 }];
  const dazu = r.mitte < 0 ? ' und trägt ihren Knick selbst (95° an den Lippen, 70° am Mundwinkel)' : r.mitteNeu ? ', dazu kam die Mittellinie: Sie knickt an beiden Lippen ins Maul' : ', die Mittellinie knickt an beiden Lippen ins Maul';
  G.meldung = `Maul geformt (${((performance.now() - m.t0) / 1000).toFixed(1)} s${r.steht ? '' : '; die Haut steht noch nicht'}): Die Maullinie ist eine Kante${dazu} · ⌘Z führt zurück`;
  // das Maul aus einer Linie: Es ist gleich das Maul der Form (der Regler zählt von „zu“), und seine Lippen bleiben gepaart
  const geformt = loops[loopNr(m.id)];
  if (geformt && istMaulLinie(geformt)) {
    zwillingeAngleichen(geformt);
    G.maul = { id: m.id };
    G.meldung = `Maul aus einer Linie (${((performance.now() - m.t0) / 1000).toFixed(1)} s): Gerechnet wird es ${geformt.maulLinie}° offen, so siehst du es jetzt. „Fressen“ mit dem Regler „Maul“ ganz links zeigt es zu. Zieh an einer Lippe, die andere geht mit · ⌘Z nimmt es zurück`;
  }
  anzeige.geometrieNeu();
  ruheNoetig();
  anzeige.reglerZeigen();
  anzeige.allesZeigen();
}

/**
 * Die Anzeige spiegelt wie der Mirror-Modifier in Blender (11.11., Florian: „ich kann ganz normal über die Spiegelkante ziehen und
 * das Mesh verschmilzt dann“): Die Hälfte z ≥ 0 und ihr Spiegelbild dürfen durch die Spiegelebene laufen, Linien wie Haut; gerechnet
 * wird damit wie überall sonst, nichts wird gequetscht. Erst die Anzeige schneidet jede Hälfte an der Ebene ab: Ein Punkt, der
 * hinüberreicht, wird auf der Ebene gezeigt (dort trifft er sein Spiegelbild), und Dreiecke, die danach ganz auf der Ebene liegen,
 * werden nicht gezeigt. So verschmelzen die Hälften, und zurückgezogen ist alles wie vorher.
 */
export let seitenGemerkt: { tri: Uint32Array; n: number; seite: Int8Array | null } | null = null;
/** Seite je Punkt der Haut (`hautSeiten`: +1 die Hälfte z ≥ 0, −1 ihr Spiegelbild, 0 die Mittelkante); gemerkt je Netz */
export function hautSeite(): Int8Array | null {
  if (!seitenGemerkt || seitenGemerkt.tri !== haut.tri || seitenGemerkt.n !== haut.n) seitenGemerkt = { tri: haut.tri, n: haut.n, seite: hautSeiten(haut) };
  return seitenGemerkt.seite;
}
/** z je Punkt der Haut, wie es gezeigt wird: jede Hälfte an der Spiegelebene abgeschnitten */
export function anzeigeZ(): Float64Array {
  const P = haut.pos;
  const seite = hautSeite();
  const Z = new Float64Array(haut.n);
  for (let v = 0; v < haut.n; v++) {
    const z = P[3 * v + 2]!;
    const s = seite ? seite[v]! : 0;
    Z[v] = s > 0 ? (z < 0 ? 0 : z) : s < 0 ? (z > 0 ? 0 : z) : z;
  }
  return Z;
}
export let anliegendGemerkt: { aus: Uint32Array; kenn: number; index: Uint32Array } | null = null;
/** Der Index ohne die Dreiecke, die in der Anzeige ganz auf der Spiegelebene liegen (derselbe, wenn es keine gibt) */
export function indexOhneAnliegende(I: Uint32Array, Z: Float64Array): Uint32Array {
  const aufEbene = (d: number): boolean => Z[anzeigeQuelle[d]!] === 0;
  let zahl = 0;
  let kenn = 0;
  for (let f = 0; f < I.length / 3; f++)
    if (aufEbene(I[3 * f]!) && aufEbene(I[3 * f + 1]!) && aufEbene(I[3 * f + 2]!)) {
      zahl++;
      kenn = (Math.imul(kenn, 31) + f) | 0;
    }
  if (!zahl) return I;
  if (anliegendGemerkt && anliegendGemerkt.aus === I && anliegendGemerkt.kenn === kenn && anliegendGemerkt.index.length === I.length - 3 * zahl) return anliegendGemerkt.index;
  const neu = new Uint32Array(I.length - 3 * zahl);
  let k = 0;
  for (let f = 0; f < I.length / 3; f++) {
    const a = I[3 * f]!;
    const b = I[3 * f + 1]!;
    const c = I[3 * f + 2]!;
    if (aufEbene(a) && aufEbene(b) && aufEbene(c)) continue;
    neu[k++] = a;
    neu[k++] = b;
    neu[k++] = c;
  }
  anliegendGemerkt = { aus: I, kenn, index: neu };
  return neu;
}

/** die Normalen der Haut, wie sie zuletzt gezeigt wurde (für das Maß, ob die Form noch in Bewegung ist: `rundeMitWeg`) */
/* in G: normalenGezeigt */
/* in G: glattVoll */

/** So viele Stufen bekommt die Anzeige jetzt (`FEIN`, sonst die der Ruhe; ruht die Haut nicht, höchstens `GLATT_IM_ZUG` Dreiecke) */
export function glattStufen(dreiecke: number): number {
  if (FEIN >= 0) return FEIN;
  let stufen = glattZiel(dreiecke);
  if (!G.glattVoll) while (stufen > 0 && 4 ** stufen * dreiecke > GLATT_IM_ZUG) stufen--;
  return stufen;
}
/** Stufen in der Ruhe */
export const glattZiel = (dreiecke: number): number => (16 * dreiecke <= GLATT_HOECHSTENS ? 2 : 1);

/** Die Pfadstücke eines Loops, wie er jetzt ist (im Zug mit den Punkten und Griffen des Zugs), je Probenpaar */
export function pfadStuecke(l: Loop, li: number): ReturnType<typeof pfadKanten> {
  if (!exakt(l)) return null;
  // In der Pose gezeigt: die Stücke des Pfads der Ruhe, jedes an seinen zwei Enden mit dem Winkel der Haut dort gedreht (die Enden
  // liegen damit genau wie die Haut, die inneren Kontrollpunkte gehen mit ihrem Ende). Aus den gedrehten Punkten und Griffen der
  // ganzen Linie gebildet läge der Pfad neben der Haut, wo sich der Winkel der Knochen längs der Linie ändert (`stueckeGezeigt`).
  const R = inAnzeige ? anzeigeVon : null;
  if (R) {
    const lr = R.loops[li];
    if (!lr) return null;
    const st = pfadKanten(lr, zug && !zug.griff ? lr.punkte.map((p) => p.cur) : undefined, (zug ? R.griffeNeu?.[li] : null) ?? undefined);
    if (!st) return null;
    const tj = winkelJeProbe(R.theta, lr);
    return st.map((e) => {
      const ta = tj[e.ja]!;
      const tb = tj[e.jb]!;
      const k: [V3, V3, V3, V3] = [gedreht(e.k[0], ta, R.G), gedreht(e.k[1], ta, R.G), gedreht(e.k[2], tb, R.G), gedreht(e.k[3], tb, R.G)];
      return { ...e, k };
    });
  }
  const P = zug && !zug.griff ? l.punkte.map((p) => p.cur) : undefined;
  return pfadKanten(l, P, zug?.griffeNeu[li] ?? undefined);
}

/** ein Band: Punkte und Breite in Bildpunkten (eine Zahl oder eine je Punkt: Dazwischen läuft sie gleichmäßig) */
export type Band = { p: readonly V3[]; breite: number | readonly number[] };
/** Blattkoordinaten → (u, v) des Kerns: Seite (x, y), Front (z, y), Top (x, z) */
export const uvAus = (a: Ansicht, X: number, Y: number): [number, number] => (a === 'top' ? [X, Y] : [X, -Y]);

/** Linien eines Loops zum Zeichnen: Ring = gespeicherte Hälfte und Spiegelhälfte, Paar = Loop und Zwilling, Mitte geschlossen */
export function linienVon(l: Loop, L: Float64Array): V3[][] {
  const p = Array.from({ length: l.proben.length }, (_, i) => lageAus(L, i));
  if (l.art === 'ring') return [p, p.map(spiegeln)];
  if (l.art === 'mitte') return [[...p, p[0]!]];
  const zu = [...p, p[0]!];
  return [zu, zu.map(spiegeln)];
}

export const aktuelleLagen = (): Float64Array[] => (zug ? zug.lagen : loops.map((l) => l.ruhe));

/** Lage einer Probe zum Zeigen (Grundform und Pose liegen so, wie sie zu sehen sind); `sp`: Spiegelhälfte bzw. Zwilling */
export function zeigeLage(L: Float64Array, i: number, sp: boolean): V3 {
  const p = lageAus(L, i);
  return sp ? spiegeln(p) : p;
}

/** Liegt die Strecke zwischen zwei Proben in der Öffnung des Mauls (dann wird sie nicht gezeigt)? */
export function streckeOffen(l: Loop, j: number, k: number, sp: boolean): boolean {
  const o = G.maulGezeigt;
  if (!o) return false;
  const a = l.proben[j]!;
  const b = l.proben[k]!;
  if (a.ecken[0] !== a.ecken[1] || a.ecken[1] !== a.ecken[2] || b.ecken[0] !== b.ecken[1] || b.ecken[1] !== b.ecken[2]) return false;
  const u = sp ? haut.spiegel[a.ecken[0]]! : a.ecken[0];
  const v = sp ? haut.spiegel[b.ecken[0]]! : b.ecken[0];
  if (u < 0 || v < 0) return false;
  return o.m.kantenOffen.has(u < v ? u * haut.n + v : v * haut.n + u);
}

/**
 * Punkte auf dem Pfadstück zwischen zwei Proben (bei ¼, ½, ¾), an die Lagen der Proben gelegt wie in `glattZeigen` (`sp`: in der
 * Spiegelhälfte gespiegelt); leer ohne Stück
 */
export function zwischenPunkte(k: readonly V3[] | undefined, a: V3, b: V3, sp: boolean): V3[] {
  if (!k) return [];
  const s = sp ? -1 : 1;
  const k1 = { x: k[1]!.x + a.x - k[0]!.x, y: k[1]!.y + a.y - k[0]!.y, z: s * k[1]!.z + a.z - s * k[0]!.z };
  const k2 = { x: k[2]!.x + b.x - k[3]!.x, y: k[2]!.y + b.y - k[3]!.y, z: s * k[2]!.z + b.z - s * k[3]!.z };
  return [0.25, 0.5, 0.75].map((t) => {
    const u = 1 - t;
    const b0 = u * u * u;
    const b1 = 3 * u * u * t;
    const b2 = 3 * u * t * t;
    const b3 = t * t * t;
    return { x: b0 * a.x + b1 * k1.x + b2 * k2.x + b3 * b.x, y: b0 * a.y + b1 * k1.y + b2 * k2.y + b3 * b.y, z: b0 * a.z + b1 * k1.z + b2 * k2.z + b3 * b.z };
  });
}

/**
 * Breite der Linien in Bildpunkten (Florian, 13.11.: „Knicke sollen immer 3px Breite haben, Linien an runden Punkten sollen so dünn
 * und fein wie möglich sein. 0.5px wenn das geht“): am Knick 3, an runden Punkten ein halber Bildpunkt (im 3D mindestens ein
 * Gerätepunkt: schmaler zerfällt das Band), dazwischen verjüngt nach der Härte (`haerteBei`). Eine gewählte Linie ist etwas kräftiger.
 */
export const BREITE_KNICK = 3;
export const plus3 = (p: V3, v: V3): V3 => ({ x: p.x + v.x, y: p.y + v.y, z: p.z + v.z });
/**
 * Der Bézier-Pfad eines Loops im Blatt (08.11., Florian: „Die Linie wird ganz kantig. Der Punkt sitzt nicht mehr exakt auf der Linie“):
 * Das Blatt bildet linear ab, ein Bézier-Stück bleibt ein Bézier-Stück aus den abgebildeten Punkten und Griffen. So ist die Linie bei
 * jedem Zoom glatt und läuft genau durch ihre Punkte wie in Illustrator; das Netz liegt höchstens `GENAU` daneben. `sp`: Spiegelhälfte
 * bzw. Zwilling. Ein Ring läuft vom ersten zum letzten Punkt (seine Enden sind Punkte), ein geschlossener Loop ringsum.
 * Während eines Zugs (10.11., Gegenprüfung Schritt G2) derselbe Pfad aus den Punkten, wo sie gerade sind, und den Griffen, wie sie
 * danach sind (`zug.griffeNeu`, `li` = Nummer des Loops): Die Linie ist im Zug und nach dem Loslassen dieselbe Kurve; vorher zeigte
 * das Blatt im Zug einen Streckenzug durch die Proben.
 */
export function pfadKurven(a: Ansicht, l: Loop, sp: boolean, li = -1): string {
  const P = l.punkte;
  const m = P.length;
  const zu = l.art !== 'ring';
  const B = (v: V3): string => {
    const [x, y] = imBlatt(a, sp ? spiegeln(v) : v);
    return `${x.toFixed(3)} ${y.toFixed(3)}`;
  };
  const neu = zug && li >= 0 ? zug.griffeNeu[li] : null;
  const ort = (p: LoopPunkt): V3 => (zug && !zug.griff ? p.cur : p.ref);
  // in der Pose: Stücke, längs derer sich der Winkel der Knochen ändert, als gedrehte Abtastung des Pfads der Ruhe
  const gebogen = li >= 0 ? stueckeGezeigt(li) : null;
  let d = `M ${B(ort(P[0]!))}`;
  for (let i = 0; i < (zu ? m : m - 1); i++) {
    const k = (i + 1) % m;
    const A = P[i]!;
    const E = P[k]!;
    const g = gebogen?.[i];
    if (g) {
      for (let j = 1; j < g.length; j++) d += ` L ${B(g[j]!)}`;
      continue;
    }
    d += ` C ${B(plus3(ort(A), neu?.[i]?.aus ?? A.aus!))} ${B(plus3(ort(E), neu?.[k]?.ein ?? E.ein!))} ${B(ort(E))}`;
  }
  return zu ? `${d} Z` : d;
}

/** Abtastungen je Stück einer Linie, die sich in der Pose biegt (dazu kommt jede ihrer Proben in dem Stück) */
export const POSE_ABTASTEN = 12;
/** Ort eines kubischen Stücks mit den Kontrollpunkten A, a, b, E beim Parameter t */
export const kubisch = (A: V3, a: V3, b: V3, E: V3, t: number): V3 => {
  const v = 1 - t;
  const c0 = v * v * v;
  const c1 = 3 * v * v * t;
  const c2 = 3 * v * t * t;
  const c3 = t * t * t;
  return { x: c0 * A.x + c1 * a.x + c2 * b.x + c3 * E.x, y: c0 * A.y + c1 * a.y + c2 * b.y + c3 * E.y, z: c0 * A.z + c1 * a.z + c2 * b.z + c3 * E.z };
};
/**
 * In der Pose je Stück der Linie `li` (von Punkt zu Punkt): die gezeigte Kurve als Folge von Orten, wo sich der Winkel der Knochen
 * längs des Stücks ändert, sonst null. Ändert er sich nicht, dreht sich das Stück starr, und die Kurve aus den gedrehten Punkten und
 * Griffen ist genau. Ändert er sich, ist das gedrehte Stück keine Bézier-Kurve aus gedrehten Punkten und Griffen mehr (so gezeichnet
 * lag die Linie an „maul handgemacht test“ bis 13 neben der gezeigten Haut): Dann wird der Pfad der Ruhe abgetastet und jeder Ort
 * mit dem Winkel seiner Stelle gedreht, wie die Haut dort (eine Probe hat ihren Platz bei t = (s − s0) / (s1 − s0) ihres Stücks). Im
 * Zug mit den Punkten und Griffen des Zugs (in der Ruhe). Null außerhalb der Anzeige einer Pose.
 */
export function stueckeGezeigt(li: number): (V3[] | null)[] | null {
  const R = inAnzeige ? anzeigeVon : null;
  if (!R) return null;
  const schon = R.gebogen.get(li);
  if (schon !== undefined) return schon;
  const l = R.loops[li];
  let out: (V3[] | null)[] | null = null;
  if (l && hatPfad(l)) {
    const P = l.punkte;
    const m = P.length;
    const n = l.proben.length;
    const zu = l.art !== 'ring';
    const tj = winkelJeProbe(R.theta, l);
    const neu = zug ? R.griffeNeu?.[li] : null;
    const ort = (p: LoopPunkt): V3 => (zug && !zug.griff ? p.cur : p.ref);
    out = [];
    for (let i = 0; i < (zu ? m : m - 1); i++) {
      const k = (i + 1) % m;
      const s0 = P[i]!.s;
      const s1 = k > i ? P[k]!.s : P[k]!.s + l.laenge;
      const h = s1 - s0;
      // Knoten: die Enden des Stücks und jede Probe darin, mit ihrem Winkel (dazwischen ändert er sich gleichmäßig)
      const kn: { t: number; w: number }[] = [{ t: 0, w: winkelBei(l, tj, s0) }];
      if (h > 1e-9)
        for (let j = 0; j < n; j++) {
          const x = zu && l.s[j]! < s0 ? l.s[j]! + l.laenge : l.s[j]!;
          if (x > s0 + 1e-9 && x < s1 - 1e-9) kn.push({ t: (x - s0) / h, w: tj[j]! });
        }
      kn.push({ t: 1, w: winkelBei(l, tj, P[k]!.s) });
      kn.sort((p, q) => p.t - q.t);
      let min = Infinity;
      let max = -Infinity;
      for (const q of kn) {
        min = Math.min(min, q.w);
        max = Math.max(max, q.w);
      }
      if (max - min < 1e-9) {
        out.push(null);
        continue;
      }
      const A = ort(P[i]!);
      const E = ort(P[k]!);
      const a = plus3(A, neu?.[i]?.aus ?? P[i]!.aus!);
      const b = plus3(E, neu?.[k]?.ein ?? P[k]!.ein!);
      // abgetastet an jeder Probe und dazwischen gleichmäßig
      const folge: V3[] = [];
      let q = 0;
      let gleich = 1;
      const an = (t: number): void => {
        while (q + 2 < kn.length && kn[q + 1]!.t < t) q++;
        const c = kn[q]!;
        const e = kn[q + 1]!;
        const f = e.t - c.t > 1e-12 ? Math.min(1, Math.max(0, (t - c.t) / (e.t - c.t))) : 0;
        folge.push(gedreht(kubisch(A, a, b, E, t), c.w + f * (e.w - c.w), R.G));
      };
      for (let x = 0; x < kn.length; x++) {
        const t = kn[x]!.t;
        for (; gleich < POSE_ABTASTEN && gleich / POSE_ABTASTEN < t - 1e-9; gleich++) an(gleich / POSE_ABTASTEN);
        if (Math.abs(gleich / POSE_ABTASTEN - t) <= 1e-9) gleich++;
        an(t);
      }
      out.push(folge);
    }
  }
  R.gebogen.set(li, out);
  return out;
}
/**
 * Wie `stueckeGezeigt`, aber je gebogenem Stück der Ort der gezeigten Linie bei jedem t des Stücks (0 … 1): für eine Anzeige, die
 * selbst abtastet (Ozzy; 20.11., Maul, Etappe 2: Weit geöffnet liegt viel von der Form im Übergang zwischen Kiefer und Körper).
 * Null außerhalb einer gedrehten Anzeige; je Stück null, wo sich der Winkel längs nicht ändert (dort ist die Kurve aus den gedrehten
 * Punkten und Griffen genau).
 */
export function stueckeGezeigtBei(li: number): (((t: number) => V3) | null)[] | null {
  const R = inAnzeige ? anzeigeVon : null;
  if (!R) return null;
  const l = R.loops[li];
  if (!l || !hatPfad(l)) return null;
  const P = l.punkte;
  const m = P.length;
  const n = l.proben.length;
  const zu = l.art !== 'ring';
  const tj = winkelJeProbe(R.theta, l);
  const neu = zug ? R.griffeNeu?.[li] : null;
  const ort = (p: LoopPunkt): V3 => (zug && !zug.griff ? p.cur : p.ref);
  const G0 = R.G;
  const out: (((t: number) => V3) | null)[] = [];
  for (let i = 0; i < (zu ? m : m - 1); i++) {
    const k = (i + 1) % m;
    const s0 = P[i]!.s;
    const s1 = k > i ? P[k]!.s : P[k]!.s + l.laenge;
    const h = s1 - s0;
    // Knoten wie in `stueckeGezeigt`: die Enden des Stücks und jede Probe darin, mit ihrem Winkel
    const kn: { t: number; w: number }[] = [{ t: 0, w: winkelBei(l, tj, s0) }];
    if (h > 1e-9)
      for (let j = 0; j < n; j++) {
        const x = zu && l.s[j]! < s0 ? l.s[j]! + l.laenge : l.s[j]!;
        if (x > s0 + 1e-9 && x < s1 - 1e-9) kn.push({ t: (x - s0) / h, w: tj[j]! });
      }
    kn.push({ t: 1, w: winkelBei(l, tj, P[k]!.s) });
    kn.sort((p, q) => p.t - q.t);
    let min = Infinity;
    let max = -Infinity;
    for (const q of kn) {
      min = Math.min(min, q.w);
      max = Math.max(max, q.w);
    }
    if (max - min < 1e-9) {
      out.push(null);
      continue;
    }
    const A = ort(P[i]!);
    const E = ort(P[k]!);
    const a = plus3(A, neu?.[i]?.aus ?? P[i]!.aus!);
    const b = plus3(E, neu?.[k]?.ein ?? P[k]!.ein!);
    out.push((t: number): V3 => {
      // der Abschnitt zwischen zwei Knoten, in dem t liegt
      let lo = 0;
      let hi = kn.length - 1;
      while (hi - lo > 1) {
        const mi = (lo + hi) >> 1;
        if (kn[mi]!.t <= t) lo = mi;
        else hi = mi;
      }
      const c = kn[lo]!;
      const e = kn[hi]!;
      const f = e.t - c.t > 1e-12 ? Math.min(1, Math.max(0, (t - c.t) / (e.t - c.t))) : 0;
      return gedreht(kubisch(A, a, b, E, t), c.w + f * (e.w - c.w), G0);
    });
  }
  return out;
}
/** Wie weit die Linie `li`, wie das Blatt sie zeichnet, höchstens neben ihren gezeigten Lagen liegt (für die Probe der Pose) */
export function gezeichnetNeben(l: Loop, li: number): number {
  if (!exakt(l)) return 0;
  const gebogen = stueckeGezeigt(li);
  const P = l.punkte;
  const m = P.length;
  const folge: V3[] = [];
  for (let i = 0; i < (l.art !== 'ring' ? m : m - 1); i++) {
    const k = (i + 1) % m;
    const g = gebogen?.[i];
    if (g) folge.push(...g);
    else for (let j = 0; j <= 48; j++) folge.push(kubisch(P[i]!.ref, plus3(P[i]!.ref, P[i]!.aus!), plus3(P[k]!.ref, P[k]!.ein!), P[k]!.ref, j / 48));
  }
  let neben = 0;
  for (let j = 0; j < l.proben.length; j++) {
    const p = lageAus(l.ruhe, j);
    let d = Infinity;
    for (let q = 0; q + 1 < folge.length; q++) {
      const a = folge[q]!;
      const b = folge[q + 1]!;
      const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
      const ll = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
      const t = ll > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y + (p.z - a.z) * ab.z) / ll)) : 0;
      d = Math.min(d, Math.hypot(p.x - a.x - t * ab.x, p.y - a.y - t * ab.y, p.z - a.z - t * ab.z));
    }
    neben = Math.max(neben, d);
  }
  return neben;
}

/**
 * Fläche um einen Streckenzug im Blatt, mit Breite je Punkt (in Blatteinheiten): der Umriss als Pfad, an beiden Enden rund. So läuft
 * eine Kante vom Knick zum runden Punkt gleichmäßig schmaler (ein Strich hat in SVG nur eine Breite).
 */
export function kantenFlaeche(p: readonly (readonly [number, number])[], breite: readonly number[]): string | null {
  const n = p.length;
  if (n < 2) return null;
  const links: string[] = [];
  const rechts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)]!;
    const b = p[Math.min(n - 1, i + 1)]!;
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty);
    if (tl < 1e-12) {
      tx = 1;
      ty = 0;
    } else {
      tx /= tl;
      ty /= tl;
    }
    const r = breite[i]! / 2;
    links.push(`${(p[i]![0] - ty * r).toFixed(3)} ${(p[i]![1] + tx * r).toFixed(3)}`);
    rechts.push(`${(p[i]![0] + ty * r).toFixed(3)} ${(p[i]![1] - tx * r).toFixed(3)}`);
  }
  const r0 = (breite[0]! / 2).toFixed(3);
  const r1 = (breite[n - 1]! / 2).toFixed(3);
  // links entlang hin, Halbkreis am Ende, rechts entlang zurück, Halbkreis am Anfang
  return `M ${links.join(' L ')} A ${r1} ${r1} 0 0 0 ${rechts[n - 1]} L ${rechts.slice(0, n - 1).reverse().join(' L ')} A ${r0} ${r0} 0 0 0 ${links[0]} Z`;
}

/** Mitte der Auswahl (für den Einflusskreis) */
export function auswahlMitte(): V3 | null {
  const q: V3[] = [];
  for (const w of G.auswahl) {
    const l = loops[loopNr(w.l)];
    if (!l) continue;
    if (w.i >= 0) {
      const p = l.punkte[w.i];
      if (p) q.push(zug ? p.cur : p.ref);
    } else {
      const L = aktuelleLagen()[loopNr(w.l)]!;
      for (let j = 0; j < l.proben.length; j++) q.push(lageAus(L, j));
    }
  }
  if (q.length === 0) return null;
  const m = q.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y, z: s.z + p.z }), { x: 0, y: 0, z: 0 });
  return { x: m.x / q.length, y: m.y / q.length, z: m.z / q.length };
}

/**
 * Griffe zum Zeigen: die der gewählten Punkte, an einer gewählten Kreuzung auch die des anderen Loops (relativ zum Punkt). Die
 * gespeicherten; während eines Zugs, wie sie danach sind, den gerade gezogenen Griff genau (gespeichert + Versatz).
 * Griffe werden in wahrer Länge gezeigt, wie in Illustrator (Florian, 10.11.: „Die Griffe bleiben in wahrer Länge wie in
 * Illustrator“): Die Spitze ist der Kontrollpunkt der Kurve, die Maus wirkt 1:1, beim Loslassen ändert sich nichts. Bis zum 10.11.
 * wurden kurze Griffe auf mindestens 28 px gestreckt gezeigt, mit einem Faktor je Punkt, der nach jedem Zug neu gerechnet wurde
 * (die Spitze sprang, in der Probe um 42 px).
 */
export function griffeZumZeigen(): { li: number; i: number; ein: V3 | null; aus: V3 | null }[] {
  const wahl: { li: number; i: number }[] = [];
  const kreuz = new Set<number>();
  for (const w of G.auswahl) {
    const li = loopNr(w.l);
    const p = loops[li]?.punkte[w.i];
    if (w.i < 0 || !p) continue;
    wahl.push({ li, i: w.i });
    if (p.kreuzung !== undefined) kreuz.add(p.kreuzung);
  }
  loops.forEach((l, li) =>
    l.punkte.forEach((p, i) => {
      if (p.kreuzung !== undefined && kreuz.has(p.kreuzung) && !wahl.some((x) => x.li === li && x.i === i)) wahl.push({ li, i });
    }),
  );
  const plus = (a: V3 | null, b: V3 | undefined): V3 | null => (a && b ? { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z } : a);
  return wahl.map(({ li, i }) => {
    const l = loops[li]!;
    const g = zug?.griff;
    // gespeicherte Griffe: während eines Zugs, wie sie danach sind
    const neu = zug?.griffeNeu[li]?.[i];
    if (neu && hatGriffe(l)) return { li, i, ein: neu.ein, aus: neu.aus };
    if (g && g.li === li && g.i === i) {
      const r = griffeBei(l, i);
      return { li, i, ein: plus(r.ein, zug!.griffVersatz.ein), aus: plus(r.aus, zug!.griffVersatz.aus) };
    }
    return { li, i, ...griffeBei(l, i) };
  });
}

/* in G: entwurf */
/* in G: spur */

/** alle drei Blätter neu zeichnen; in der Pose wird dafür nur einmal gedreht (je Blatt einzeln kostete es an einer Form 0,7 ms mehr) */
export function blaetterZeichnen(): void {
  alsAnzeige(() => {
    for (const a of ['seite', 'front', 'top'] as const) anzeige.blattZeichnen(a);
  });
}

/**
 * Über die ganze Haut hängt die Matrix des Lösers nur am Netz, an den Gewichten und an den Loops, nicht an den Lagen. Nach jeder
 * Änderung wird sie deshalb schon vorgerechnet, sobald nichts gezogen wird (der Kern merkt sie sich): Das nächste Greifen findet
 * sie fertig (gemessen 7–31 ms statt 0,3–1,5 s bei 5 000–28 000 Punkten). Greift man, bevor sie fertig ist, wartet das Greifen
 * nur noch den Rest. Hat ein Zug verdichtet, setzt sich das neue Netz dabei auch gleich (`nachLoesenOffen`).
 */
export let vorrechnenUhr: ReturnType<typeof setTimeout> | null = null;
/** das verdichtete Netz des letzten Zugs, das sich noch setzen soll */
export let nachLoesenOffen: Haut | null = null;
/**
 * Wie oft sich das Netz nach einem Zug noch verfeinert hat: Gesetzt liegen die Linien etwas anders als beim Teilen (die neuen Punkte
 * lagen nur rund zwischen den alten), dann wird es dort noch einmal feiner und setzt sich noch einmal, höchstens dreimal (nur geteilt,
 * nichts zusammengelegt).
 */
export let nachVerfeinert = 0;
/** das Setzen rechnet, bis die Form steht (Vergleich: `?setzen=4`) */
export const SETZEN_RUHE = new URLSearchParams(location.search).get('setzen') !== '4';
export function vorrechnenPlanen(): void {
  vorrechnenAus();
  if (mitBereich() || zug) return;
  // nach dem Loslassen rechnet erst der Nachlauf; er gibt das Aufräumen dann selbst in den Hintergrund
  if (nachlauf) return;
  vorrechnenUhr = setTimeout(() => {
    vorrechnenUhr = null;
    if (mitBereich() || zug || nachlauf) return;
    // über die ganze Haut nach der Geometrie rechnet der Hintergrund, was für den Stand offen ist (G4.4)
    const imHintergrund = ruheImHintergrund();
    // „Form halten“: den Löser für das nächste Greifen anlegen (hier im Fenster; steht noch ein Verdichten an, erst danach)
    direktBereiten();
    if (imHintergrund) return;
    // ohne Hintergrund rechnet das Fenster selbst, was offen ist (wie bis G4)
    if (ruheOffen) {
      const r = ruheOffen;
      ruheOffen = null;
      if (r.setzen && !r.nurInRuhe) {
        hautNeuRechnen(r.ziele ?? loops.map(() => null), true);
        anzeige.geometrieNeu();
        anzeige.allesZeigen();
        return;
      }
      if (r.verdichten) aufraeumenImFenster();
    }
    // die bereite Zerlegung ist für genau diesen Stand gerechnet (sie kam aus dem Hintergrund): nichts zu tun
    if (GEWICHTE === 'geometrie' && vorlageGenau(standZahl())) return;
    const t0 = performance.now();
    const z = new LoopZug(haut, loops, null, KRUEMMUNG, 'kurven', GEWICHTE, RICHTUNG_OPT);
    letztesVorrechnen = Math.round(performance.now() - t0);
    if (GEWICHTE === 'geometrie' && z.vorlage) {
      vorlageBereit = z.vorlage;
      vorlageStand = standZahl();
      vorlageNetz = netzZahl();
    }
    if (nachLoesenOffen !== haut) return;
    nachLoesenOffen = null;
    const ziele = loops.map((l, li) => (exakt(l) ? pfadVersatz(l, z.start[li]!) : null));
    // nach der Geometrie, bis die Form steht (`?setzen=4`: wie bis zum 10.11. genau vier Runden): Ein neuer Löser schwingt in den
    // ersten Runden über (seine Bremse je Punkt beginnt von vorn), nach genau vier Runden blieb davon ein Rest stehen
    if (GEWICHTE === 'geometrie' && SETZEN_RUHE) {
      // läuft die Haut beim Setzen davon, bleibt sie, wie sie war
      const davor = Float64Array.from(haut.pos);
      for (let k = 0; k < RUNDEN_NEU; k++) {
        const weg = rundeMitWeg(z, ziele);
        if (weg === Infinity) {
          haut.pos.set(davor);
          davonZahl++;
          G.meldung = 'Hier kommt die Haut nicht zur Ruhe: Sie bleibt, wie sie war.';
          break;
        }
        if (weg < RUHE) break;
      }
    } else z.schritt(ziele, RUNDEN_ENDE);
    festlegenAlle();
    if (GENAU > 0 && nachVerfeinert < 3) {
      const vor = haut;
      nachVerdichten(true);
      if (haut !== vor) {
        nachVerfeinert++;
        nachLoesenOffen = haut;
        vorrechnenPlanen();
      }
    }
    letztesNachLoesen = Math.round(performance.now() - t0);
    anzeige.hautZeigen();
    anzeige.baenderZeigen();
    blaetterZeichnen();
    anzeige.statusZeigen();
  }, 30);
}
export function vorrechnenAus(): void {
  if (vorrechnenUhr) clearTimeout(vorrechnenUhr);
  vorrechnenUhr = null;
}
export let letztesVorrechnen = 0;
export let letztesNachLoesen = 0;

// ---------- Messen ----------

export const zeiten: number[] = [];
/**
 * Messen, wo die Zeit im Zug bleibt (10.11., G4): Arbeit je Bild (Runden und Anzeige der Haut), je Mausbewegung (Ziele und Blätter),
 * je Auslösen und je Einwechseln beim Verfeinern im Zug (alles im Hauptthread, ms)
 */
export const messung = { bild: [] as number[], maus: [] as number[], ausloesen: [] as number[], einwechseln: [] as number[], nachlauf: [] as number[] };
export function merke(liste: number[], ms: number): void {
  liste.push(ms);
  if (liste.length > 600) liste.shift();
}
export let letzteZerlegung = 0;
export let letzterBereich = 0;
/** `?clipping=0` in der Adresse: die Donut-Regel vom 13.11. (der Punkt hinter der Mitte ist markiert, ihn löschen macht den Schnitt fest) */
export const DONUT_REGEL_1311 = new URLSearchParams(location.search).get('clipping') === '0';
/** so viele Punkte liegen lose hinter der Mitte (eine Kreuzung zählt einmal); in der Pose und an einer freien Form keiner */
export function hinterDerMitteZahl(): number {
  if (grund || istFrei()) return 0;
  const gesehen = new Set<string>();
  loops.forEach((l) => {
    for (const i of hinterDerMitte(l)) {
      const p = l.punkte[i]!;
      if (istSichtbar(p)) gesehen.add(p.kreuzung !== undefined ? `k${p.kreuzung}` : `${l.id}:${i}`);
    }
  });
  return gesehen.size;
}

/** so weit (Anteil der mittleren Kante) muss die Haut einer Hälfte hinter der Spiegelebene liegen, damit dort eine Naht entsteht */
export const NAHT_AB = 0.05;
/**
 * Die Seite der Spiegelebene, auf der eine freie Form liegt (+1: z ≥ 0, nach der Mitte ihrer Punkte): Diese Seite bleibt, wenn sie
 * an der Ebene mit ihrem Spiegelbild verschmilzt.
 */
export function freiSeite(): 1 | -1 {
  let z = 0;
  for (let v = 0; v < haut.n; v++) z += haut.pos[3 * v + 2]!;
  return z < 0 ? -1 : 1;
}
/**
 * Je Punkt der Haut die Seite, an der gemessen wird, ob er hinter der Spiegelebene liegt: verschmolzen die Seite seiner Hälfte
 * (`hautSeite`), frei mit Spiegelbild für alle die Seite der Form (`freiSeite`); null: Es gibt nichts zu verschmelzen (in der Pose,
 * eine freie Form ohne Spiegelbild).
 */
export function clipSeiten(): { von: (v: number) => number } | null {
  if (grund) return null;
  if (istFrei()) {
    if (!G.spiegelbild) return null;
    const s = freiSeite();
    return { von: () => s };
  }
  const seite = hautSeite();
  return seite ? { von: (v) => seite[v]! } : null;
}
/** so tief (Einheiten) reicht die Haut einer Hälfte höchstens hinter die Spiegelebene (0: gar nicht) */
export function tiefeHinterDerMitte(): number {
  const S = clipSeiten();
  if (!S) return 0;
  const P = haut.pos;
  let tief = 0;
  for (let v = 0; v < haut.n; v++) {
    const sv = S.von(v);
    if (sv !== 0) tief = Math.max(tief, -sv * P[3 * v + 2]!);
  }
  return tief;
}
/**
 * Reicht die Haut einer Hälfte über die Spiegelebene (weiter als `NAHT_AB`)? Gelesen an der Haut, nicht an den Punkten der Linien:
 * Auch ein Griff oder die Haut zwischen zwei Linien kann hinüberreichen. In der Pose nie. Eine freie Form mit Spiegelbild reicht
 * hinüber, wenn sie auf beiden Seiten der Ebene liegt (ganz dahinter gibt es nichts zu verschmelzen).
 */
export function ueberDerMitte(): boolean {
  const S = clipSeiten();
  if (!S) return false;
  const P = haut.pos;
  const ab = NAHT_AB * MK;
  let hinter = false;
  let davor = !istFrei();
  for (let v = 0; v < haut.n && !(hinter && davor); v++) {
    const sv = S.von(v);
    if (sv === 0) continue;
    const z = sv * P[3 * v + 2]!;
    if (z < -ab) hinter = true;
    else if (z > ab) davor = true;
  }
  return hinter && davor;
}

// ---------- Ziehen und G/S/R ----------

export type Zug = {
  /** null: direkt gezogen (wie G) */
  modal: 'g' | 's' | 'r' | null;
  achse: 'x' | 'y' | 'z' | null;
  ansicht: Ansicht;
  /** auf einer Spiegelhälfte gegriffen: die Tiefe läuft umgekehrt */
  spiegel: boolean;
  x0: number;
  y0: number;
  pivot: V3;
  vorher: Schnappschuss;
  loeser: LoopZug;
  /** ganz bewegte Loops (Index) */
  ganze: Set<number>;
  /** mit O: Gewicht je Probe der anderen Loops (für den Bereich; Loops ohne Pfad bewegen sich danach je Probe) */
  probenW: (Float64Array | null)[];
  /** Gewicht je Punkt („Loop:Punkt“) */
  punktW: Map<string, number>;
  /** mit O: Gewichte der Griffspitzen der Punkte, die nicht gewählt sind (Loops mit Pfad; Blender: jede Spitze für sich) */
  griffW: Map<string, { ein: number; aus: number }>;
  /** in der Grundform je Loop mit Pfad, was seiner Linie beim Anfang zu ihrem Pfad fehlte (kommt zu jeder Verschiebung dazu) */
  rest: (Float64Array | null)[];
  lagen: Float64Array[];
  versch: (Float64Array | null)[];
  bewegt: boolean;
  mitte: V3 | null;
  /** ein Griff wird gezogen (statt Punkte): Loop (Index), Punkt, Seite; dazu der Versatz der Griffe des Punkts */
  griff: { li: number; i: number; seite: 'ein' | 'aus' } | null;
  griffVersatz: GriffVersatz;
  /** Radius des Bereichs beim Anfang; wie weit schon gezogen wurde (vor dieser Stufe, insgesamt) */
  radius: number;
  weite0: number;
  weite: number;
  /** je Loop die Griffe seiner Punkte, wie sie nach dem Zug sind (null: unverändert); gesetzt erst beim Übernehmen */
  griffeNeu: ({ ein: V3; aus: V3 }[] | null)[];
  /**
   * je Loop die Verschiebung seiner Punkte, wo sie nicht allein aus der Abbildung des Zugs folgt (null: wie üblich): am Maul aus einer
   * Linie zieht ein Punkt seinen Zwilling auf der anderen Lippe mit (`zwillingeSetzen`)
   */
  punktD: (V3[] | null)[];
  /** mit O verschobene Loops (je Probe, nicht über ihre Punkte): ihre Griffe werden danach aus der Linie neu abgelesen */
  neuAblesen: Set<number>;
  /**
   * Über die ganze Haut rechnet der Löser im Bildtakt (`zugRechnen`). `zielNeu`: Die Ziele haben sich seit der letzten Runde geändert
   * (die Linien liegen noch nicht auf ihnen). `offen`: Die Haut steht noch nicht. `nachRunden`: Runden seit der letzten Mausbewegung.
   */
  zielNeu: boolean;
  offen: boolean;
  nachRunden: number;
  /**
   * Eine Linie liegt in diesem Zug gerade an der Mittelebene an (ihr Punkt oder Griff ist über die Mitte gezogen, `zGrenzen` hält sie
   * dort). Solange wird im Zug nicht verfeinert und nichts eingewechselt: Die Haut zwischen Linie und Mitte ist dann auf nichts
   * zusammengeschoben, ein Netz für diesen Augenblick passte nach dem Rückweg nicht mehr (11.11., gemessen an Florians Form: über die
   * Mitte und zurück blieben 9 Knicke über 150° und 3 % mehr Rauminhalt, ohne Verfeinern im Zug nichts).
   */
  begrenzt: boolean;
  /**
   * Umgeschlagene Dreiecke, als der Zug begann (`umgeschlageneZahl`). Sind es im Zug mehr, hat er die Haut gerade umgeklappt (ein
   * sehr weiter Zug, eine Linie überschlägt sich): Solange wird im Zug nicht verfeinert und nichts eingewechselt. Ein Netz für
   * die umgeklappte Haut passte nach dem Rückweg nicht mehr (11.11., gemessen an Florians Form: Punkt der Mitte 160 längs über
   * seinen Nachbarn hinaus und zurück; mit Verfeinern im Zug danach 130 bis 210 umgeschlagene Dreiecke, ohne 36).
   */
  umgAnfang: number;
};
export let zug: Zug | null = null;

/** Abbildung des Zugs für die Maus an (X, Y) im Blatt: Verschieben, Skalieren (um die Mitte der Auswahl) oder Drehen (um die Blickachse) */
export function abbildung(z: Zug, X: number, Y: number): (p: V3) => V3 {
  const a = z.ansicht;
  const [cx, cy] = imBlatt(a, z.pivot);
  if (z.modal === 's') {
    const k = Math.hypot(X - cx, Y - cy) / Math.max(1e-6, Math.hypot(z.x0 - cx, z.y0 - cy));
    const c = z.pivot;
    return (p) => ({
      x: !z.achse || z.achse === 'x' ? c.x + k * (p.x - c.x) : p.x,
      y: !z.achse || z.achse === 'y' ? c.y + k * (p.y - c.y) : p.y,
      z: !z.achse || z.achse === 'z' ? c.z + k * (p.z - c.z) : p.z,
    });
  }
  if (z.modal === 'r') {
    const phi = Math.atan2(Y - cy, X - cx) - Math.atan2(z.y0 - cy, z.x0 - cx);
    const co = Math.cos(phi);
    const si = Math.sin(phi);
    return (p) => {
      const [px, py] = imBlatt(a, p);
      const nx = cx + (px - cx) * co - (py - cy) * si;
      const ny = cy + (px - cx) * si + (py - cy) * co;
      const d = inWelt(a, nx - px, ny - py);
      return { x: p.x + d.x, y: p.y + d.y, z: p.z + d.z };
    };
  }
  const d = inWelt(a, X - z.x0, Y - z.y0);
  if (z.spiegel) d.z = -d.z;
  if (z.achse) for (const k of ['x', 'y', 'z'] as const) if (k !== z.achse) d[k] = 0;
  // spiegelgleiche Loops als Ganzes nicht aus der Mitte schieben
  if ([...z.ganze].some((li) => loops[li]!.art !== 'paar')) d.z = 0;
  return (p) => ({ x: p.x + d.x, y: p.y + d.y, z: p.z + d.z });
}

// ---------- die ganze Form abbilden (18.11., Objekte: verschieben, skalieren, drehen) ----------

/**
 * Ein Zug an der ganzen Form (Florian, 18.11.: „Ohne mirror kann ich ein objekt frei bewegen“), geführt wie G, S, R an Punkten: im
 * Blatt `ansicht` von (x0, y0) aus. Kein Löser rechnet: Jede Lage wird abgebildet (Haut, Linien, Punkte, Griffe; beim Skalieren
 * auch die Längen der Linien und das Maß des Netzes), die Form bleibt genau, was sie war. Eine verschmolzene Form bleibt dabei in
 * der Spiegelebene (verschieben längs und hoch, drehen nur in der Seite, skalieren um einen Ort der Ebene); eine freie ist frei.
 */
export type FormZug = {
  modal: 'g' | 's' | 'r';
  achse: 'x' | 'y' | 'z' | null;
  ansicht: Ansicht;
  /** am Spiegelbild gegriffen: die Tiefe läuft umgekehrt */
  spiegel: boolean;
  x0: number;
  y0: number;
  pivot: V3;
  vorher: Schnappschuss;
  pos0: Float64Array;
  loops0: Loop[];
  mk0: number;
  delta0: Float64Array | null;
  bewegt: boolean;
};
export let formZug: FormZug | null = null;

/** die Mitte der Form (Mitte ihres Kastens); verschmolzen in der Spiegelebene */
export function formMitte(): V3 {
  const P = haut.pos;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i++) {
    const k = i % 3;
    if (P[i]! < lo[k]!) lo[k] = P[i]!;
    if (P[i]! > hi[k]!) hi[k] = P[i]!;
  }
  return { x: (lo[0]! + hi[0]!) / 2, y: (lo[1]! + hi[1]!) / 2, z: istFrei() ? (lo[2]! + hi[2]!) / 2 : 0 };
}

export function formZugStarten(modal: FormZug['modal'], a: Ansicht, X: number, Y: number, spiegel: boolean): boolean {
  if (zug || formZug) return false;
  if (grund) {
    G.meldung = 'In der Pose lässt sich die Form nicht als Ganzes bewegen (erst zurück in die Grundform)';
    anzeige.statusZeigen();
    return false;
  }
  if (modal === 'r' && !istFrei() && a !== 'seite') {
    G.meldung = 'Eine verschmolzene Form dreht sich nur in der Seite (um die Achse quer zur Spiegelebene) · Spiegel aus macht sie frei';
    anzeige.statusZeigen();
    return false;
  }
  formZug = {
    modal,
    achse: null,
    ansicht: a,
    spiegel,
    x0: X,
    y0: Y,
    pivot: formMitte(),
    vorher: schnappschuss(),
    pos0: Float64Array.from(haut.pos),
    loops0: loops.map((l) => ({ ...kopieLoop(l), s: Float64Array.from(l.s) })),
    mk0: MK,
    delta0: pose.delta ? Float64Array.from(pose.delta) : null,
    bewegt: false,
  };
  return true;
}

export function formZugBewegen(X: number, Y: number): void {
  const z = formZug;
  if (!z) return;
  if (!z.bewegt) {
    z.bewegt = true;
    // was für den Stand davor noch rechnete oder bereitlag, gilt nicht mehr
    nachlauf = null;
    G.aufgeraeumt = null;
    G.aufraeumen = null;
    G.zwischenstand = null;
    G.gegriffen = null;
    verfeinerung = null;
    G.eingetroffen = null;
    nichtsZuVerfeinern = null;
    nachLoesenOffen = null;
    ruheOffen = null;
    vorrechnenAus();
  }
  const frei = istFrei();
  // die Abbildung wie bei G, S, R an Punkten (`abbildung`); skaliert wird immer gleichmäßig (sonst wäre die Haut nicht mehr die der Linien)
  const f0 = abbildung({ modal: z.modal, achse: z.modal === 'g' ? z.achse : null, ansicht: z.ansicht, spiegel: z.spiegel, x0: z.x0, y0: z.y0, pivot: z.pivot, ganze: new Set<number>() } as unknown as Zug, X, Y);
  // eine verschmolzene Form bleibt in der Spiegelebene: kein Weg quer zu ihr (Skalieren und Drehen in der Seite lassen z ohnehin, wie es ist)
  const f = frei || z.modal !== 'g' ? f0 : (p: V3): V3 => ({ ...f0(p), z: p.z });
  let k = 1;
  if (z.modal === 's') {
    const [cx, cy] = imBlatt(z.ansicht, z.pivot);
    k = Math.hypot(X - cx, Y - cy) / Math.max(1e-6, Math.hypot(z.x0 - cx, z.y0 - cy));
  }
  const o = f({ x: 0, y: 0, z: 0 });
  const vek = (v: V3): V3 => {
    const q = f(v);
    return { x: q.x - o.x, y: q.y - o.y, z: q.z - o.z };
  };
  const P = haut.pos;
  const P0 = z.pos0;
  for (let v = 0; v < haut.n; v++) {
    const q = f({ x: P0[3 * v]!, y: P0[3 * v + 1]!, z: P0[3 * v + 2]! });
    P[3 * v] = q.x;
    P[3 * v + 1] = q.y;
    P[3 * v + 2] = q.z;
  }
  loops.forEach((l, li) => {
    const l0 = z.loops0[li]!;
    for (let j = 0; j < l0.ruhe.length / 3; j++) {
      const q = f(lageAus(l0.ruhe, j));
      l.ruhe[3 * j] = q.x;
      l.ruhe[3 * j + 1] = q.y;
      l.ruhe[3 * j + 2] = q.z;
    }
    l.punkte.forEach((p, i) => {
      const p0 = l0.punkte[i]!;
      p.ref = f(p0.ref);
      p.cur = { ...p.ref };
      if (p0.ein) p.ein = vek(p0.ein);
      if (p0.aus) p.aus = vek(p0.aus);
      p.s = p0.s * k;
    });
    // (ein neues Feld: Die Stände für ⌘Z teilen sich das alte)
    l.s = Float64Array.from(l0.s, (x) => x * k);
    l.laenge = l0.laenge * k;
  });
  MK = z.mk0 * k;
  TOL = 0.25 * MK;
  if (pose.delta && z.delta0)
    for (let v = 0; v < haut.n; v++) {
      const q = vek({ x: z.delta0[3 * v]!, y: z.delta0[3 * v + 1]!, z: z.delta0[3 * v + 2]! });
      pose.delta[3 * v] = q.x;
      pose.delta[3 * v + 1] = q.y;
      pose.delta[3 * v + 2] = q.z;
    }
  anzeige.hautZeigen();
  anzeige.baenderZeigen();
}

export function formZugEnde(ok: boolean): void {
  const z = formZug;
  if (!z) return;
  formZug = null;
  if (!ok || !z.bewegt) {
    if (z.bewegt) wiederherstellen(z.vorher);
    return;
  }
  zurueck.push(z.vorher);
  // dieselbe Form an einem anderen Ort: Die Haut steht (nichts zu setzen), nur die Zerlegung für den nächsten Griff ist neu zu rechnen
  vorlageBereit = null;
  vorlageStand = '';
  vorlageNetz = '';
  standFertig = '';
  anzeige.allesZeigen();
}

/** Punkt einer Linie in der Mittelebene bzw. am Ende eines Rings: z bleibt 0; Ringe nicht unter die Mitte */
export function zFest(l: Loop, s: number): boolean {
  return l.art === 'mitte' || (s <= 1e-6 && endeAufMitte(l, 0)) || (s >= l.laenge - 1e-6 && endeAufMitte(l, 1));
}

/** größter Abstand der Proben eines Loops von seiner ersten */
export function ausdehnung(l: Loop): number {
  let m = 0;
  for (let j = 0; j < l.proben.length; j += 4) m = Math.max(m, abstand(lageAus(l.ruhe, j), lageAus(l.ruhe, 0)));
  return m;
}

/**
 * Die zwei Stücke um Punkt k (bis zum vorigen und zum nächsten Punkt) in `mark` setzen; Ergebnis: Mindestradius des
 * Einflussbereichs (halber Abstand zum ferneren Nachbarpunkt, ein Punkt allein auf einem geschlossenen Loop: der ganze Loop).
 */
export function stueckUm(l: Loop, k: number, mark: Uint8Array): number {
  const P = l.punkte;
  const n = l.proben.length;
  const zu = l.art !== 'ring';
  if (zu && P.length === 1) {
    mark.fill(1);
    return 0.6 * ausdehnung(l);
  }
  const s0 = k > 0 ? P[k - 1]!.s : zu ? P[P.length - 1]!.s - l.laenge : 0;
  const s1 = k < P.length - 1 ? P[k + 1]!.s : zu ? P[0]!.s + l.laenge : l.laenge;
  for (let j = 0; j < n; j++) {
    const s = l.s[j]!;
    if ((s > s0 && s < s1) || (zu && (s - l.laenge > s0 || s + l.laenge < s1))) mark[j] = 1;
  }
  const vor = k > 0 ? P[k - 1]!.ref : zu ? P[P.length - 1]!.ref : lageAus(l.ruhe, 0);
  const nach = k < P.length - 1 ? P[k + 1]!.ref : zu ? P[0]!.ref : lageAus(l.ruhe, n - 1);
  return 0.5 * Math.max(abstand(P[k]!.ref, vor), abstand(P[k]!.ref, nach));
}

/**
 * Haut für den Löser: in der Pose ohne die Öffnung des Mauls (dieselben Lagen, dieselbe Spiegelung). Die verborgene Fläche der
 * Öffnung überspannt in der Pose das offene Maul und klappt um, wo sich die Lippen weit trennen; mit ihr schaukelte sich der Löser
 * bei einem Maul aus der Front auf (gemessen: ein Punkt 10 000 Einheiten weit). `aus`: Punkte nur in der Öffnung (bleiben stehen).
 */
export let loeserHautStand: { haut: Haut; offen: Uint8Array; h: Haut; aus: Uint8Array } | null = null;
export function loeserHaut(): { h: Haut; aus: Uint8Array | null } {
  const m = altePose() ? maulAktuell() : null;
  if (!m || m.offen.length !== haut.tri.length / 3) return { h: haut, aus: null };
  const st = loeserHautStand;
  if (st && st.haut === haut && st.offen === m.offen) return { h: { ...st.h, pos: haut.pos }, aus: st.aus };
  const tri: number[] = [];
  for (let t = 0; t < haut.tri.length / 3; t++) if (!m.offen[t]) tri.push(haut.tri[3 * t]!, haut.tri[3 * t + 1]!, haut.tri[3 * t + 2]!);
  const nachbarn: number[][] = Array.from({ length: haut.n }, () => []);
  const aus = new Uint8Array(haut.n).fill(1);
  for (let t = 0; t < tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = tri[t + e]!;
      const b = tri[t + ((e + 1) % 3)]!;
      aus[a] = 0;
      if (!nachbarn[a]!.includes(b)) nachbarn[a]!.push(b);
      if (!nachbarn[b]!.includes(a)) nachbarn[b]!.push(a);
    }
  }
  const h: Haut = { pos: haut.pos, tri: Uint32Array.from(tri), n: haut.n, nachbarn, spiegel: haut.spiegel };
  loeserHautStand = { haut, offen: m.offen, h, aus };
  return { h, aus };
}

/**
 * Löser eines Zugs: Einflussbereich um die bewegten Stellen (Radius r) samt den Ecken ihrer Proben. In der Pose behält jeder Punkt
 * seine Krümmung (die Krümmung, die die Loops tragen, gilt für die geschlossene Grundform; am Rand der Öffnung passt sie nicht, die
 * Haut unter einem Maul aus der Front verknitterte, gemessen: ein Punkt 146 Einheiten weit, 16 Dreiecke umgeklappt). Aus den Kurven
 * (`?haut=kurven`) immer über die ganze Haut, wie FiberMesh: Mit einem Bereich trug dessen Rand die alte Wölbung als Krümmung ins
 * Feld (gemessen: Lappen unter einem Pilzrand, 12 umgeklappt; über die ganze Haut keine).
 */
export function loeserFuer(bewegt: readonly V3[], r: number, ecken: Iterable<number>): LoopZug {
  // „Form halten“: die Haut folgt den Linien direkt (in der Grundform ist die Haut des Lösers die ganze Haut)
  if (direktGilt()) return new LoopZug(haut, loops, null, false, 'direkt', GEWICHTE, { direkt: direktNehmen() });
  const { h, aus } = loeserHaut();
  const art: HautArt = mitBereich() ? 'gedaechtnis' : 'kurven';
  const bereich = mitBereich() ? bereichUm(h, bewegt, r, ecken) : null;
  if (aus && bereich) for (let v = 0; v < h.n; v++) if (aus[v]) bereich[v] = 0;
  // die Zerlegung: die vom Einwechseln im Zug, sonst die bereite (letzter Zug oder Hintergrund; der Kern nimmt sie nur, wenn ihre
  // Struktur passt, sonst zerlegt er selbst)
  const vorlage = mitBereich() ? null : (naechsteVorlage ?? (GEWICHTE === 'geometrie' ? vorlageBereit : null));
  naechsteVorlage = null;
  return new LoopZug(h, loops, bereich, KRUEMMUNG && !altePose(), art, GEWICHTE, vorlage ? { vorlage, ...RICHTUNG_OPT } : RICHTUNG_OPT);
}

/** Löser für die Stücke um Punkt k des Loops li (Griff ziehen oder ausrichten) */
export function stueckLoeser(li: number, k: number): LoopZug {
  const l = loops[li]!;
  const mark = new Uint8Array(l.proben.length);
  const r = Math.max(2 * MK, stueckUm(l, k, mark));
  const bewegt: V3[] = [];
  const ecken = new Set<number>();
  for (let j = 0; j < mark.length; j++) {
    if (!mark[j]) continue;
    if (j % 2 === 0) bewegt.push(lageAus(l.ruhe, j));
    for (const v of l.proben[j]!.ecken) ecken.add(v);
  }
  return loeserFuer(bewegt, r, ecken);
}

/** Verschiebung je Probe eines Loops aus dem Versatz der Griffe von Punkt k (die Punkte bleiben) */
export function griffVerschiebung(l: Loop, S: Float64Array, k: number, v: GriffVersatz): Float64Array {
  const d = verschiebungLaengs(
    l,
    l.punkte.map(() => ({ x: 0, y: 0, z: 0 })),
    l.punkte.map((_, i) => (i === k ? v : undefined)),
  );
  zGrenzen(l, S, d);
  return d;
}

/** In der Grundform je Loop mit Pfad: was seiner Linie beim Anfang eines Zugs (`start`) zu ihrem Pfad fehlt; sonst null */
export function restZumPfad(z: LoopZug): (Float64Array | null)[] {
  // (der Pfad, wie er gezeichnet ist: `mitRest` begrenzt das Ziel danach an der Mittelebene, `zGrenzen`)
  return loops.map((l, li) => (exakt(l) ? pfadVersatz(l, z.start[li]!, true) : null));
}

/**
 * Verschiebung je Probe im Zug, mit dem Rest zum Pfad: Die Verschiebungen sind die Änderung des Pfads (`verschiebungLaengs`), mit dem
 * Rest liegt das Ziel jeder Probe genau auf dem neuen Pfad (auch für Loops, die sich nicht bewegen).
 */
export function mitRest(z: Zug, li: number, d: Float64Array | null): Float64Array | null {
  const r = z.rest[li];
  if (!r) return d;
  const out = new Float64Array(r.length);
  for (let k = 0; k < r.length; k++) out[k] = r[k]! + (d ? d[k]! : 0);
  zGrenzen(loops[li]!, z.loeser.start[li]!, out);
  return out;
}

/**
 * Mittelebene und Enden eines Rings bleiben auf z = 0. Sonst darf eine Linie durch die Spiegelebene (11.11.: Erst die Anzeige
 * schneidet dort ab, `anzeigeZ`; bis dahin hielt die Linie Abstand, und die Haut zwischen ihr und der Mitte wurde zerknüllt).
 */
export function zGrenzen(l: Loop, _S: Float64Array, d: Float64Array): void {
  const n = l.proben.length;
  for (let j = 0; j < n; j++) if (l.art === 'mitte' || (j === 0 && endeAufMitte(l, 0)) || (j === n - 1 && endeAufMitte(l, 1))) d[3 * j + 2] = 0;
}
/** `zGrenzen` hat seit dem letzten Zurücksetzen eine Linie an der Mittelebene gehalten (für `Zug.begrenzt`) */
export let anMitteGehalten = false;

/** Griff `seite` von Punkt i des Loops li ziehen */
export function griffZugStarten(a: Ansicht, X: number, Y: number, spiegel: boolean, li: number, i: number, seite: 'ein' | 'aus'): boolean {
  const p = loops[li]?.punkte[i];
  if (!p) return false;
  if (maulLinieInPose(li)) return false;
  const loeser = stueckLoeser(li, i);
  zug = {
    modal: null,
    achse: null,
    ansicht: a,
    spiegel,
    x0: X,
    y0: Y,
    pivot: p.ref,
    vorher: schnappschuss(),
    loeser,
    ganze: new Set(),
    probenW: loops.map(() => null),
    punktW: new Map(),
    griffW: new Map(),
    rest: restZumPfad(loeser),
    lagen: loeser.start,
    versch: loops.map(() => null),
    bewegt: false,
    mitte: null,
    griff: { li, i, seite },
    griffVersatz: {},
    radius: 0,
    weite0: 0,
    weite: 0,
    griffeNeu: loops.map(() => null),
    punktD: loops.map(() => null),
    neuAblesen: new Set(),
    zielNeu: false,
    offen: false,
    nachRunden: 0,
    begrenzt: false,
    umgAnfang: umgeschlageneZahl(),
  };
  letzteZerlegung = loeser.loeser.zeitZerlegen;
  letzterBereich = loeser.loeser.anzahl;
  G.meldung = '';
  return true;
}

/** Punkte an derselben Kreuzung wie Punkt i von Loop li, samt ihm (Loop-Index, Punkt); ohne Kreuzung nur er */
export function punkteAnKreuzung(li: number, i: number): [number, number][] {
  const p = loops[li]?.punkte[i];
  if (!p) return [];
  if (p.kreuzung === undefined) return [[li, i]];
  const out: [number, number][] = [];
  loops.forEach((l, lj) =>
    l.punkte.forEach((q, j) => {
      if (q.kreuzung === p.kreuzung) out.push([lj, j]);
    }),
  );
  return out;
}

/**
 * Wie der Punkt gezeigt wird: An einer Kreuzung liegen die Punkte der Loops übereinander, für Florian ist es ein Punkt. Er ist eine
 * Ecke ◆, sobald einer seiner Loops dort eine hat (z. B. von selbst, wo der andere hart ist), und dann knicken alle seine Griffe.
 */
export function eckeGezeigt(li: number, i: number): boolean {
  return punkteAnKreuzung(li, i).some(([lj, j]) => istEcke(loops[lj]!.punkte[j]!));
}

/**
 * Glatt ↔ Ecke umschalten (von Hand; zweimal = wieder automatisch), an einer Kreuzung für alle ihre Loops (gemessen: die 3 auf der
 * Kreuzung macht den angeklickten Loop hart, der andere wird dort von selbst eine Ecke; die sichtbaren Griffe gehörten oft dem
 * glatten, er knickte nicht). Wird eine Ecke mit Knick glatt, kommen ihre Griffe auf eine Gerade und die Haut folgt.
 */
export function eckeUmschalten(id: number, i: number): void {
  const li0 = loopNr(id);
  if (!loops[li0]?.punkte[i]) return;
  // das Maul aus einer Linie: Der Mundwinkel bleibt eine Ecke (dort kehrt die Linie um), und mit einem Punkt schaltet sein Zwilling
  const zwl = grund ? null : zwillinge(loops[li0]!);
  if (zwl && zwl.iW === i) {
    G.meldung = 'Der Mundwinkel bleibt eine Ecke (dort kehrt die Maullinie um)';
    anzeige.statusZeigen();
    return;
  }
  const vorher = schnappschuss();
  const alle = punkteAnKreuzung(li0, i);
  const paar = zwl?.paare.find(([a, b]) => a === i || b === i);
  if (paar) for (const x of punkteAnKreuzung(li0, paar[0] === i ? paar[1] : paar[0])) if (!alle.some(([lj, k]) => lj === x[0] && k === x[1])) alle.push(x);
  const neu = !eckeGezeigt(li0, i);
  const vorherEcken = new Set(loops.flatMap((l) => l.punkte.filter(istEckeVonSelbst)));
  for (const [lj, j] of alle) {
    const q = loops[lj]!.punkte[j]!;
    if (neu === (q.autoEcke ?? false)) delete q.ecke;
    else q.ecke = neu;
  }
  // wird ein Punkt wieder eine Ecke von selbst, knickt er wie bei K (jede Seite rund); hört er auf, eine zu sein, wird er glatt
  const knick = kantenKnicken(loops, vorherEcken);
  // (im Fenster: Das Ausrichten der Griffe gleich danach rechnet auf diesem Stand weiter)
  if (knick.some((d) => d)) hautNeuRechnen(knick, true);
  // gemessen: ein Schritt bringt 58° auf 0,4°; ein zweiter nur, falls die Haut weit vom Ziel blieb. Liegen die Griffe schon auf
  // einer Geraden, nichts tun: glatte Linien bleiben beim Umschalten unberührt.
  let ausgerichtet = false;
  for (const [li, j] of neu ? [] : alle) {
    const l = loops[li]!;
    for (let runde = 0; runde < 2; runde++) {
      const v = griffeAusrichten(l, j);
      if (!v) break;
      const loeser = stueckLoeser(li, j);
      const d = griffVerschiebung(l, loeser.start[li]!, j, v);
      // in der Grundform dazu, was der Linie noch zu ihrem Pfad fehlt
      const rest = exakt(l) ? pfadVersatz(l, loeser.start[li]!) : null;
      const stufe = (f: number) => d.map((x, k) => f * x + (rest ? rest[k]! : 0));
      for (let s = 1; s <= 3; s++) loeser.schritt(loops.map((_, k) => (k === li ? stufe(s / 3) : null)), RUNDEN_ZUG);
      loeser.schritt(loops.map((_, k) => (k === li ? stufe(1) : null)), RUNDEN_ENDE);
      griffeUebernehmen(
        l,
        l.punkte.map(() => ({ x: 0, y: 0, z: 0 })),
        l.punkte.map((_, k) => (k === j ? v : undefined)),
      );
      festlegenAlle();
      ausgerichtet = true;
    }
  }
  if (ausgerichtet) {
    kreuzungenSuchen();
    poseSichern();
  }
  zurueck.push(vorher);
  G.auswahl = [{ l: id, i }];
  G.meldung = neu ? 'Ecke: die Linie darf hier knicken' : ausgerichtet ? 'glatt: Griffe auf einer Geraden' : 'glatt';
  anzeige.allesZeigen();
}

/** In der Pose gewählt: ein Maul aus einer Linie (seine Lippen werden in der Grundform gezogen, dort gehen beide zusammen) */
export function maulLinieInPose(li: number): boolean {
  const l = loops[li];
  if (!grund || !l || !istMaulLinie(l)) return false;
  G.meldung = 'Die Maullinie ziehst du in der Grundform („Fressen“ aus): Dort gehen beide Lippen zusammen';
  anzeige.statusZeigen();
  return true;
}

export function zugStarten(modal: Zug['modal'], a: Ansicht, X: number, Y: number, spiegel: boolean, rMin = 0): boolean {
  if (G.auswahl.length === 0) return false;
  if (G.auswahl.some((w) => maulLinieInPose(loopNr(w.l)))) return false;
  const ganze = new Set<number>();
  const punktW = new Map<string, number>();
  const kreuzWahl = new Set<number>();
  const zentren: V3[] = [];
  for (const w of G.auswahl) {
    const li = loopNr(w.l);
    const l = loops[li];
    if (!l) continue;
    if (w.i < 0) {
      ganze.add(li);
      l.punkte.forEach((p, i) => {
        punktW.set(`${li}:${i}`, 1);
        if (p.kreuzung !== undefined) kreuzWahl.add(p.kreuzung);
      });
      for (let j = 0; j < l.proben.length; j += 2) zentren.push(lageAus(l.ruhe, j));
    } else {
      const p = l.punkte[w.i];
      if (!p) continue;
      punktW.set(`${li}:${w.i}`, 1);
      zentren.push(p.ref);
      if (p.kreuzung !== undefined) kreuzWahl.add(p.kreuzung);
    }
  }
  if (zentren.length === 0) return false;
  if (modal === 'r' && a !== 'seite' && [...ganze].some((li) => loops[li]!.art !== 'paar')) {
    G.meldung = 'Spiegelgleiche Loops dreht man in der Seite';
    anzeige.statusZeigen();
    return false;
  }
  // an einer Kreuzung geht der Punkt im anderen Loop ganz mit
  loops.forEach((l, li) =>
    l.punkte.forEach((p, i) => {
      if (p.kreuzung !== undefined && kreuzWahl.has(p.kreuzung)) punktW.set(`${li}:${i}`, 1);
    }),
  );
  const probenW: (Float64Array | null)[] = loops.map(() => null);
  const griffW = new Map<string, { ein: number; aus: number }>();
  if (G.oAn) {
    const gewicht = (q: V3): number => {
      let d = Infinity;
      for (const c of zentren) d = Math.min(d, abstandSym(q, c));
      return einfluss(d, G.radius);
    };
    loops.forEach((l, li) => {
      if (ganze.has(li)) return;
      const w = new Float64Array(l.proben.length);
      let irgend = false;
      for (let j = 0; j < l.proben.length; j++) {
        w[j] = gewicht(lageAus(l.ruhe, j));
        if (w[j]! > 0) irgend = true;
      }
      if (irgend) probenW[li] = w;
      // Loops mit Pfad formt O wie Blender eine Kurve: Punkte (auch die Enden eines Rings) und Griffspitzen je nach ihrem Abstand; ein
      // gewählter Punkt geht ganz mit, seine Griffe mit ihm
      const pfad = hatPfad(l);
      l.punkte.forEach((p, i) => {
        const k = `${li}:${i}`;
        if (punktW.has(k) || (!istSichtbar(p) && !pfad)) return;
        const g = gewicht(p.ref);
        if (g > 0) punktW.set(k, g);
        if (!pfad) return;
        const r = griffeBei(l, i);
        const spitze = (v: V3 | null) => (v ? gewicht({ x: p.ref.x + v.x, y: p.ref.y + v.y, z: p.ref.z + v.z }) : 0);
        const ge = spitze(r.ein);
        const ga = spitze(r.aus);
        if (g > 0 || ge > 0 || ga > 0) griffW.set(k, { ein: ge, aus: ga });
      });
    });
  }
  // was sich bewegt: ganze Loops, mit O die Proben im Kreis, sonst die Stücke um die bewegten Punkte bis zu ihren Nachbarn
  const bewegt: V3[] = [];
  const ecken = new Set<number>();
  let r = G.oAn ? G.radius : Math.max(2 * MK, rMin);
  loops.forEach((l, li) => {
    const n = l.proben.length;
    const mark = new Uint8Array(n);
    // ein ganzer Loop nimmt sein Inneres mit (Bereich über seine Mitte hinaus), sonst verdreht sich die Haut auf kurzem Weg
    if (ganze.has(li)) {
      mark.fill(1);
      if (!G.oAn) r = Math.max(r, 0.6 * ausdehnung(l));
    } else if (probenW[li]) {
      for (let j = 0; j < n; j++) if (probenW[li]![j]! > 0) mark[j] = 1;
    } else if (!G.oAn) {
      l.punkte.forEach((_, k) => {
        if (punktW.has(`${li}:${k}`)) r = Math.max(r, stueckUm(l, k, mark));
      });
    }
    for (let j = 0; j < n; j++) {
      if (!mark[j]) continue;
      if (j % 2 === 0) bewegt.push(lageAus(l.ruhe, j));
      for (const v of l.proben[j]!.ecken) ecken.add(v);
    }
  });
  const loeser = loeserFuer(bewegt, r, ecken);
  // die Mitte der Auswahl, um die die Maus dreht und skaliert: wie sie gezeigt wird (in der Pose gedreht, jeder Ort mit seinem Winkel)
  const zentrenGezeigt: V3[] = [];
  {
    const ruhe = inDerRuhe((q) => q);
    const kn = grund ? poseKnochen() : null;
    for (const w of G.auswahl) {
      const l = loops[loopNr(w.l)];
      if (!l) continue;
      if (!kn) continue;
      if (w.i < 0) {
        const tj = winkelJeProbe(kn.theta, l);
        for (let j = 0; j < l.proben.length; j += 2) zentrenGezeigt.push(gedreht(lageAus(l.ruhe, j), tj[j]!, kn.G));
      } else {
        const p = l.punkte[w.i];
        if (p) zentrenGezeigt.push(gedreht(p.ref, ruhe.winkel(l, w.i), kn.G));
      }
    }
  }
  const zg = zentrenGezeigt.length === zentren.length ? zentrenGezeigt : zentren;
  const pivot = zg.reduce((s, p) => ({ x: s.x + p.x / zg.length, y: s.y + p.y / zg.length, z: s.z + p.z / zg.length }), { x: 0, y: 0, z: 0 });
  if (ganze.size > 0 && [...ganze].every((li) => loops[li]!.art !== 'paar')) pivot.z = 0;
  zug = {
    modal,
    achse: null,
    ansicht: a,
    spiegel,
    x0: X,
    y0: Y,
    pivot,
    vorher: schnappschuss(),
    loeser,
    ganze,
    probenW,
    punktW,
    griffW,
    rest: restZumPfad(loeser),
    lagen: loeser.start,
    versch: loops.map(() => null),
    bewegt: false,
    mitte: zg.length === 1 ? { ...zg[0]! } : pivot,
    griff: null,
    griffVersatz: {},
    radius: r,
    weite0: 0,
    weite: 0,
    griffeNeu: loops.map(() => null),
    punktD: loops.map(() => null),
    neuAblesen: new Set(),
    zielNeu: false,
    offen: false,
    nachRunden: 0,
    begrenzt: false,
    umgAnfang: umgeschlageneZahl(),
  };
  letzteZerlegung = loeser.loeser.zeitZerlegen;
  letzterBereich = loeser.loeser.anzahl;
  G.meldung = '';
  return true;
}

/**
 * Die Abbildung eines Zugs gilt für das, was gezeigt wird. In der Pose ist das die gedrehte Lage, gerechnet wird in ihrer Ruhe: Für
 * jeden Punkt einer Linie (und jede Probe) wird sein Ort mit seinem Winkel gedreht, abgebildet und zurückgedreht („Ein Zug im Blatt
 * wird mit dem Winkel seines Punkts zurückgedreht“, Plan Schritt 5). In der Grundform: die Abbildung selbst.
 */
export function inDerRuhe(f: (p: V3) => V3): { punkt: (l: Loop, i: number) => (p: V3) => V3; probe: (l: Loop, j: number) => (p: V3) => V3; winkel: (l: Loop, i: number) => number } {
  const kn = grund && !inAnzeige ? poseKnochen() : null;
  if (!kn) return { punkt: () => f, probe: () => f, winkel: () => 0 };
  const je = new Map<Loop, Float64Array>();
  const tj = (l: Loop): Float64Array => {
    let t = je.get(l);
    if (!t) {
      t = winkelJeProbe(kn.theta, l);
      je.set(l, t);
    }
    return t;
  };
  const mit = (t: number): ((p: V3) => V3) => (t === 0 ? f : (p) => gedreht(f(gedreht(p, t, kn.G)), -t, kn.G));
  const winkel = (l: Loop, i: number): number => winkelBei(l, tj(l), l.punkte[i]?.s ?? 0);
  return { punkt: (l, i) => mit(winkel(l, i)), probe: (l, j) => mit(tj(l)[j] ?? 0), winkel };
}

/** Wohin Punkt p mit dem Gewicht g unter der Abbildung f geht (Mittelebene und Enden eines Rings auf z = 0, Ring und Paar nicht darunter) */
export function punktNach(l: Loop, p: LoopPunkt, g: number, f: (p: V3) => V3): V3 {
  const q = f(p.ref);
  const c = { x: p.ref.x + g * (q.x - p.ref.x), y: p.ref.y + g * (q.y - p.ref.y), z: p.ref.z + g * (q.z - p.ref.z) };
  if (zFest(l, p.s)) c.z = 0;
  return c;
}

/**
 * Verschiebung je Probe je Loop für die Abbildung f (die Änderung seines Pfads; `mitRest` legt das Ziel in der Grundform genau auf
 * den neuen Pfad); dazu je Loop die Griffe, wie sie danach sind (`z.griffeNeu`). Ein Loop mit Pfad bewegt sich über seine Punkte und
 * Griffe: Ein ganzer Loop dreht und skaliert sie mit, gezogene Punkte nehmen sie mit (`griffeNach`), mit O gehen Punkte und
 * Griffspitzen je mit ihrem Gewicht (`griffeProportional`). Ein Loop ohne Pfad (geschlossen, höchstens ein Punkt) folgt je Probe.
 */
export function verschiebungen(z: Zug, f: (p: V3) => V3): (Float64Array | null)[] {
  // in der Pose gilt `f` für die gezeigte Lage: je Punkt und Probe in die Ruhe zurückgedreht
  const ruhe = inDerRuhe(f);
  // Am Maul aus einer Linie zieht ein Punkt seinen Zwilling mit; liegt der an einer Kreuzung, geht der Punkt des anderen Loops mit ihm.
  // Deshalb zuerst die Mäuler aus einer Linie: Sie geben vor, wohin solche Kreuzungen gehen (`kreuzD`).
  const kreuzD = new Map<number, V3>();
  const aus: (Float64Array | null)[] = loops.map(() => null);
  const eine = (l: Loop, li: number): Float64Array | null => {
    const n = l.proben.length;
    const S = z.loeser.start[li]!;
    let d: Float64Array | null = null;
    z.griffeNeu[li] = null;
    z.punktD[li] = null;
    const ganz = z.ganze.has(li);
    if (!hatPfad(l) && (ganz || z.probenW[li])) {
      if (ganz && hatGriffe(l)) {
        const D = l.punkte.map((p, i) => {
          const q = ruhe.punkt(l, i)(p.ref);
          return { x: q.x - p.ref.x, y: q.y - p.ref.y, z: q.z - p.ref.z };
        });
        z.griffeNeu[li] = griffeNach(
          l,
          D,
          l.punkte.map((_, i) => griffeAbbilden(l, i, ruhe.punkt(l, i), 1)),
        );
      } else if (!ganz) z.neuAblesen.add(li);
      const w = ganz ? null : z.probenW[li];
      d = new Float64Array(3 * n);
      for (let j = 0; j < n; j++) {
        const g = w ? w[j]! : 1;
        if (!g) continue;
        const p = lageAus(S, j);
        const q = ruhe.probe(l, j)(p);
        d[3 * j] = g * (q.x - p.x);
        d[3 * j + 1] = g * (q.y - p.y);
        d[3 * j + 2] = g * (q.z - p.z);
      }
    } else {
      let irgend = false;
      let gefuehrt = false;
      const D = l.punkte.map((p, i) => {
        const g = z.punktW.get(`${li}:${i}`);
        if (!g) {
          // ein Punkt an einer Kreuzung, die ein Zwilling mitnimmt
          const k = p.kreuzung !== undefined ? kreuzD.get(p.kreuzung) : undefined;
          if (!k) return { x: 0, y: 0, z: 0 };
          irgend = true;
          gefuehrt = true;
          return { ...k };
        }
        irgend = true;
        const q = punktNach(l, p, g, ruhe.punkt(l, i));
        return { x: q.x - p.ref.x, y: q.y - p.ref.y, z: q.z - p.ref.z };
      });
      // wie in Illustrator: Beim Drehen und Skalieren drehen und skalieren die Griffe der Punkte mit (beim Verschieben gehen sie
      // nur mit, ohne Versatz); mit O jede Griffspitze nach ihrem eigenen Gewicht
      const griffe = l.punkte.map((_, i) => {
        const k = `${li}:${i}`;
        const o = z.griffW.get(k);
        if (o) {
          irgend = true;
          return griffeProportional(l, i, ruhe.punkt(l, i), z.punktW.get(k) ?? 0, o.ein, o.aus);
        }
        const g = z.punktW.get(k);
        return g && (ganz || z.modal === 's' || z.modal === 'r') ? griffeAbbilden(l, i, ruhe.punkt(l, i), g) : undefined;
      });
      // das Maul aus einer Linie: Die geführte Lippe wird das gedrehte Abbild der führenden (die mit dem gezogenen Punkt)
      const zw = irgend && !grund ? zwillinge(l) : null;
      if (zw) {
        const gewicht = (von: number, bis: number): number => {
          let summe = 0;
          for (let i = von; i <= bis; i++) summe += z.punktW.get(`${li}:${i}`) ?? 0;
          return summe;
        };
        const fuehrt = gewicht(zw.iW + 1, l.punkte.length - 1) > gewicht(0, zw.iW - 1) ? 'zweite' : 'erste';
        const G = griffeNach(l, D, griffe);
        const orte = l.punkte.map((p, i) => ({ x: p.ref.x + D[i]!.x, y: p.ref.y + D[i]!.y, z: p.ref.z + D[i]!.z }));
        if (zwillingeSetzen(l, orte, G, fuehrt)) {
          l.punkte.forEach((p, i) => {
            D[i] = { x: orte[i]!.x - p.ref.x, y: orte[i]!.y - p.ref.y, z: orte[i]!.z - p.ref.z };
            const e = p.ein ?? { x: 0, y: 0, z: 0 };
            const a = p.aus ?? { x: 0, y: 0, z: 0 };
            griffe[i] = { ein: { x: G[i]!.ein.x - e.x, y: G[i]!.ein.y - e.y, z: G[i]!.ein.z - e.z }, aus: { x: G[i]!.aus.x - a.x, y: G[i]!.aus.y - a.y, z: G[i]!.aus.z - a.z } };
            if (p.kreuzung !== undefined) kreuzD.set(p.kreuzung, D[i]!);
          });
          z.punktD[li] = D;
        }
      } else if (gefuehrt) z.punktD[li] = D;
      if (irgend) {
        d = verschiebungLaengs(l, D, griffe);
        if (hatGriffe(l)) z.griffeNeu[li] = griffeNach(l, D, griffe);
      }
    }
    if (d) zGrenzen(l, S, d);
    return d;
  };
  loops.forEach((l, li) => {
    if (istMaulLinie(l)) aus[li] = eine(l, li);
  });
  loops.forEach((l, li) => {
    if (!istMaulLinie(l)) aus[li] = eine(l, li);
  });
  return aus;
}

/**
 * Ozzy, S6b (16.11.2026, mit Florians Zustimmung): Ein laufender Zug am Griff wird um eine Verschiebung im Raum gezogen (in der gezeigten
 * Lage, wie `inWelt` sie gibt) statt in der Ebene des Blatts: so kippt ein Griff aus der Ebene der Ansicht. Ein neuer Handgriff aus
 * bestehenden (`zugBewegen` mit derselben Rechnung); `griffImRaum` gilt nur während des Aufrufs.
 */
let griffImRaum: V3 | null = null;
export function zugGriffRaum(d: V3): void {
  const z = zug;
  if (!z?.griff) return;
  griffImRaum = d;
  z.bewegt = true;
  try {
    zugBewegen(z.x0, z.y0);
  } finally {
    griffImRaum = null;
  }
}

export function zugBewegen(X: number, Y: number): void {
  const z = zug;
  if (!z) return;
  const tm = performance.now();
  letzteMaus = [X, Y];
  if (!z.bewegt && Math.hypot(X - z.x0, Y - z.y0) * anzeige.skala(z.ansicht) < 2) return;
  z.bewegt = true;
  anMitteGehalten = false;
  if (z.griff) {
    // Griff: in der Ebene des Blatts verschoben (die Tiefe bleibt), nur sein Loop bewegt sich. Eine Ecke von selbst wird dabei
    // eine Ecke von Hand (ihre Griffe sind dann frei, wie in Blender ein automatischer Griff, den man anfasst). Am Spiegelpunkt geht
    // das Spiegelbild des Griffs mit; schräg zur Mittelebene knickt die Linie dort, der Punkt wird eine Ecke.
    const { li, i, seite } = z.griff;
    const l = loops[li]!;
    const p = l.punkte[i]!;
    // ein glatter Punkt wird eine Ecke, wenn er als Ecke zu sehen ist (an einer Kreuzung mit einer Ecke) oder am Spiegelpunkt liegt
    if (istEckeVonSelbst(p) || (!istEcke(p) && (ringEnde(l, i) || eckeGezeigt(li, i)))) p.ecke = true;
    const dGezeigt = griffImRaum ? { ...griffImRaum } : inWelt(z.ansicht, X - z.x0, Y - z.y0);
    if (z.spiegel) dGezeigt.z = -dGezeigt.z;
    // in der Pose ist der Griff gedreht zu sehen: seine Verschiebung mit dem Winkel seines Punkts zurück in die Ruhe
    const d = vektorGedreht(dGezeigt, -inDerRuhe((q) => q).winkel(l, i));
    z.griffVersatz = griffZiehen(l, i, seite, d);
    let versatz: (GriffVersatz | undefined)[] = l.punkte.map((_, k) => (k === i ? z.griffVersatz : undefined));
    const still = l.punkte.map(() => ({ x: 0, y: 0, z: 0 }));
    // am Maul aus einer Linie geht der Griff des Zwillings mit (am Mundwinkel führt die Lippe, zu der der gezogene Griff zeigt)
    const zw = grund ? null : zwillinge(l);
    if (zw) {
      const G = griffeNach(l, still, versatz);
      const orte = l.punkte.map((q) => ({ ...q.ref }));
      if (zwillingeSetzen(l, orte, G, i < zw.iW || (i === zw.iW && seite === 'ein') ? 'erste' : 'zweite'))
        versatz = l.punkte.map((q, k) => {
          const e = q.ein ?? { x: 0, y: 0, z: 0 };
          const a = q.aus ?? { x: 0, y: 0, z: 0 };
          return { ein: { x: G[k]!.ein.x - e.x, y: G[k]!.ein.y - e.y, z: G[k]!.ein.z - e.z }, aus: { x: G[k]!.aus.x - a.x, y: G[k]!.aus.y - a.y, z: G[k]!.aus.z - a.z } };
        });
    }
    const dGriff = verschiebungLaengs(l, still, versatz);
    zGrenzen(l, z.loeser.start[li]!, dGriff);
    z.versch = loops.map((_, k) => mitRest(z, k, k === li ? dGriff : null));
    z.griffeNeu = loops.map((_, k) => (k === li && hatGriffe(l) ? griffeNach(l, still, versatz) : null));
  } else {
    const f = abbildung(z, X, Y);
    z.versch = verschiebungen(z, f).map((d, li) => mitRest(z, li, d));
    const ruhe = inDerRuhe(f);
    loops.forEach((l, li) =>
      l.punkte.forEach((p, i) => {
        const g = z.punktW.get(`${li}:${i}`) ?? 0;
        const mit = z.punktD[li]?.[i];
        p.cur = mit ? { x: p.ref.x + mit.x, y: p.ref.y + mit.y, z: p.ref.z + mit.z } : g ? punktNach(l, p, g, ruhe.punkt(l, i)) : { ...p.ref };
      }),
    );
    if (z.mitte) z.mitte = f(z.pivot);
  }
  z.lagen = z.loeser.lagen(z.versch);
  z.begrenzt = anMitteGehalten;
  // wie weit die Loops in diesem Zug schon gezogen sind (über alle Stufen)
  let weit = 0;
  for (const d of z.versch) if (d) for (let j = 0; j < d.length; j += 3) weit = Math.max(weit, Math.hypot(d[j]!, d[j + 1]!, d[j + 2]!));
  z.weite = z.weite0 + weit;
  if (!mitBereich()) {
    // über die ganze Haut: Hier werden nur die Ziele gesetzt und die Kurven gezeichnet (Punkte, Griffe, Pfad); die Haut rechnet im
    // Bildtakt nach (`zugRechnen`), auch wenn die Maus ruht
    z.zielNeu = true;
    z.offen = true;
    z.nachRunden = 0;
    blaetterZeichnen();
    merke(messung.maus, performance.now() - tm);
    return;
  }
  const t0 = performance.now();
  z.loeser.schritt(z.versch, RUNDEN_ZUG);
  zeiten.push(performance.now() - t0);
  if (zeiten.length > 200) zeiten.shift();
  // reicht der Zug über den halben Bereich hinaus, eine neue Stufe: der Bereich wächst mit, dabei wird verdichtet
  if (!z.griff && !G.oAn && weit > 0.5 * z.radius) zugStufe(z, X, Y);
  anzeige.hautZeigen();
  anzeige.baenderZeigen();
  blaetterZeichnen();
  anzeige.statusZeigen();
}

/**
 * Runden ohne neue Mausbewegung, nach denen der Löser auf jeden Fall aufhört: nach der Geometrie kommt er vorher zur Ruhe (`RUHE`),
 * mit gleichen Gewichten pendelt er, dort bleibt es bei so vielen Runden wie bisher am Ende
 */
export const NACH_RUNDEN = GEWICHTE === 'geometrie' ? 60 : RUNDEN_ENDE;
export let rundeVorher: Float64Array | null = null;
/**
 * Eine Löserrunde über die ganze Haut zu den Zielen `versch`; zurück kommt, wie weit sich die Form dabei höchstens bewegt hat: die
 * Bewegung der Punkte längs der Flächennormalen. Längs der Fläche gleiten die Punkte nach der Geometrie stetig weiter, ohne dass
 * sich die Form ändert (gemessen im Kern, `gegenpruefung-2026-11-10/loeser/mess7.ts`: bei 23 400 Punkten 0,04 Einheiten je Runde,
 * über 400 Runden gleich, die Form steht nach 25); gegen die ganze Bewegung gemessen käme der Löser dort nie zur Ruhe.
 */
export function rundeMitWeg(loeser: LoopZug, versch: readonly (Float64Array | null)[]): number {
  const P = haut.pos;
  if (!rundeVorher || rundeVorher.length !== P.length) rundeVorher = new Float64Array(P.length);
  rundeVorher.set(P);
  const N = G.normalenGezeigt?.haut === haut ? G.normalenGezeigt.nor : hautNormalen(haut);
  const grenze = DAVON_SCHUTZ ? davonGrenze(loeser, versch) : Infinity;
  loeser.schritt(versch, 1);
  let m = 0;
  let heil = true;
  for (let k = 0; k < P.length; k += 3) {
    const x = P[k]!;
    const y = P[k + 1]!;
    const z = P[k + 2]!;
    // (nicht endliche Lagen vergleichen immer falsch)
    if (!(x <= grenze && x >= -grenze && y <= grenze && y >= -grenze && z <= grenze && z >= -grenze)) heil = false;
    const d = Math.abs((x - rundeVorher[k]!) * N[k]! + (y - rundeVorher[k + 1]!) * N[k + 1]! + (z - rundeVorher[k + 2]!) * N[k + 2]!);
    if (d > m) m = d;
  }
  const u = loeser.unruhe;
  if (unruheLoeser !== loeser) {
    unruheLoeser = loeser;
    letzteUnruhe = { stufen: 0, fest: false };
  }
  if (u.stufen > letzteUnruhe.stufen || (u.fest && !letzteUnruhe.fest)) {
    unruheZahl++;
    // stehen geblieben: Das sagt die Statuszeile, bis der nächste Schritt beginnt
    if (u.fest && !letzteUnruhe.fest) G.meldung = 'Hier kommt die Haut nicht zur Ruhe: Sie bleibt bei ihrer ruhigsten Lage stehen.';
    if (VORSICHT_LAUT) console.error(`Vorsicht im Fenster: Schritt ${u.stufen}-mal halbiert${u.fest ? ', stehen geblieben' : ''}`);
  }
  letzteUnruhe = u;
  if (G.davonProbe) {
    G.davonProbe = false;
    return Infinity;
  }
  return heil || !DAVON_SCHUTZ ? m : Infinity;
}
/** Prüfung: die nächste Runde gilt als davongelaufen; das nächste Bild wirft einen Fehler */
/* in G: davonProbe */
/* in G: fehlerProbe */
/**
 * Vorsicht bei Unruhe im Löser (zum Messen und für die Statuszeile): der Löser der letzten Runde, wie oft er seinen Schritt halbiert
 * hat und ob er stehen geblieben ist; wie oft das insgesamt geschah
 */
export let unruheLoeser: LoopZug | null = null;
export let letzteUnruhe = { stufen: 0, fest: false };
export let unruheZahl = 0;

/**
 * Läuft die Haut davon? (10.11., Florian: „der Kopf bläst sich auf und explodiert, dann ist es weg und die Seite hängt sich auf“;
 * nachgestellt an seiner gesicherten Form, `form-gesichert-stabil.ts`: Der Löser kommt an manchen Stellen nicht zur Ruhe, die Haut
 * bewegt sich je Runde weiter als in der davor, nach 27 Runden liegt sie bei 91 000 statt 754, danach sind die Lagen nicht mehr
 * endlich.) Die Grenze je Löser: das Dreifache der größten Koordinate der Haut, als der Löser begann, und der Ziele seiner Linien,
 * dazu ein Stück. Eine Haut zwischen ihren Linien kommt dort nie hin. `rundeMitWeg` meldet dann unendlich; wer die Runde gerechnet
 * hat, nimmt den Schritt zurück (`davongelaufen`), statt die Haut zu zeigen, festzulegen oder zu verdichten.
 */
export const davonAnfang = new WeakMap<LoopZug, number>();
export function davonGrenze(loeser: LoopZug, versch: readonly (Float64Array | null)[]): number {
  let e0 = davonAnfang.get(loeser);
  if (e0 === undefined) {
    e0 = 0;
    const P = haut.pos;
    for (let k = 0; k < P.length; k++) {
      const v = Math.abs(P[k]!);
      if (v > e0) e0 = v;
    }
    // (eine Haut, die schon nicht mehr endlich ist, hat keine Grenze: Die Runde meldet es selbst)
    if (!Number.isFinite(e0)) e0 = 0;
    davonAnfang.set(loeser, e0);
  }
  let m = e0;
  loeser.start.forEach((S, li) => {
    const d = versch[li];
    for (let k = 0; k < S.length; k++) {
      const v = Math.abs(d ? S[k]! + d[k]! : S[k]!);
      if (v > m) m = v;
    }
  });
  return 3 * m + 35 * MK;
}
/** wie oft die Haut davongelaufen ist und der Schritt zurückgenommen wurde (zum Messen) */
export let davonZahl = 0;
/**
 * Die Haut ist davongelaufen: zurück zum Stand vor dem Schritt (`vorher`; fehlt er: der letzte Schritt von ⌘Z), nichts wird
 * festgelegt, verdichtet oder in den Hintergrund gegeben. Die Meldung bleibt stehen, bis der nächste Schritt beginnt.
 */
export function davongelaufen(vorher: Schnappschuss | null, text = 'Hier ist die Haut auseinandergelaufen. Der Zug ist zurückgenommen, die Form steht wieder wie davor.'): void {
  davonZahl++;
  zug = null;
  nachlauf = null;
  G.gegriffen = null;
  verfeinerung = null;
  G.eingetroffen = null;
  nichtsZuVerfeinern = null;
  verfeinernPause = 0;
  G.aufraeumen = null;
  G.aufgeraeumt = null;
  G.zwischenstand = null;
  const s = vorher ?? zurueck.pop() ?? null;
  if (s) wiederherstellen(s);
  G.meldung = text;
  anzeige.statusZeigen();
}

/** umgeschlagene Dreiecke der Haut: ihre Normale zeigt gegen die mittlere Normale ihrer Ecken */
export function umgeschlageneZahl(): number {
  const P = haut.pos;
  const t = haut.tri;
  const vn = new Float64Array(P.length);
  const fn = new Float64Array(t.length);
  for (let i = 0; i < t.length; i += 3) {
    const a = 3 * t[i]!;
    const b = 3 * t[i + 1]!;
    const c = 3 * t[i + 2]!;
    const ux = P[b]! - P[a]!;
    const uy = P[b + 1]! - P[a + 1]!;
    const uz = P[b + 2]! - P[a + 2]!;
    const vx = P[c]! - P[a]!;
    const vy = P[c + 1]! - P[a + 1]!;
    const vz = P[c + 2]! - P[a + 2]!;
    const fx = uy * vz - uz * vy;
    const fy = uz * vx - ux * vz;
    const fz = ux * vy - uy * vx;
    fn[i] = fx;
    fn[i + 1] = fy;
    fn[i + 2] = fz;
    for (const v of [a, b, c]) {
      vn[v] = vn[v]! + fx;
      vn[v + 1] = vn[v + 1]! + fy;
      vn[v + 2] = vn[v + 2]! + fz;
    }
  }
  let z = 0;
  for (let i = 0; i < t.length; i += 3) {
    const a = 3 * t[i]!;
    const b = 3 * t[i + 1]!;
    const c = 3 * t[i + 2]!;
    if (fn[i]! * (vn[a]! + vn[b]! + vn[c]!) + fn[i + 1]! * (vn[a + 1]! + vn[b + 1]! + vn[c + 1]!) + fn[i + 2]! * (vn[a + 2]! + vn[b + 2]! + vn[c + 2]!) < 0) z++;
  }
  return z;
}

/**
 * Der Löser eines Zugs über die ganze Haut, einmal je Bild (10.11., Gegenprüfung Schritt G3): Runden, solange die Haut nicht steht,
 * auch wenn die Maus ruht; dann die Haut zeigen. So ist beim Loslassen nichts mehr nachzuholen, und die Zahl der Runden hängt nicht
 * an der Zahl der Mausereignisse. Verfeinert wird wie bisher nur nach einer Mausbewegung (nach deren Runden: Die Linien liegen dann
 * auf ihren Zielen und können festgelegt werden). Beim Halten kommt kein weiterer Netzwechsel dazu: Auf einem dichten Netz legt
 * jeder Durchgang auch fern vom Zug zu kurze Kanten zusammen (gemessen bei 23 400 Punkten: Das Startnetz hat 1 442 Kanten unter der
 * halben mittleren Länge; danach Punkte mit drei und vier Nachbarn, an denen die Haut unruhig bleibt, `netz/m7-unruhige-stelle.mjs`).
 */
export function zugRechnen(): void {
  const z = zug;
  if (!z || !z.offen || mitBereich()) return;
  const neuesZiel = z.zielNeu;
  const t0 = performance.now();
  for (;;) {
    const tr = performance.now();
    z.zielNeu = false;
    const weg = rundeMitWeg(z.loeser, z.versch);
    if (weg === Infinity) {
      davongelaufen(z.vorher);
      return;
    }
    z.nachRunden++;
    if (weg < RUHE || z.nachRunden >= NACH_RUNDEN) {
      z.offen = false;
      break;
    }
    const jetzt = performance.now();
    if (jetzt - t0 + (jetzt - tr) > (BILD_MS > 0 ? Math.min(BUDGET_MS, BILD_MS - bildRestMs) : BUDGET_MS)) break;
  }
  bildGerechnetMs = performance.now() - t0;
  zeiten.push(performance.now() - t0);
  if (zeiten.length > 200) zeiten.shift();
  // über die ganze Haut nach der Geometrie: verfeinern, sobald sie gestreckt wird
  if (neuesZiel && LIVE && GEWICHTE === 'geometrie' && z.loeser.art !== 'direkt' && !z.griff && !z.begrenzt && !verfeinerung && !G.eingetroffen && letzteMaus && performance.now() >= verfeinernPause && (gestreckt() || linieUngenau(z)) && umgeschlageneZahl() <= z.umgAnfang) {
    const [X, Y] = letzteMaus;
    if (HINTERGRUND) stufeImHintergrund(z, X, Y);
    else zugStufe(z, X, Y);
  }
  anzeige.hautZeigen();
  anzeige.baenderZeigen();
  anzeige.statusZeigen();
  merke(messung.bild, performance.now() - t0);
}

/**
 * Nach dem Neuaufsetzen eines Zugs über die ganze Haut (Stufe, Einwechseln): Die Ziele der Linien sind ihre Pfade von jetzt, wie nach
 * einer Mausbewegung um null. Der Löser rechnet im Bildtakt weiter, bevor die nächste Mausbewegung kommt; ohne das hielte er die
 * Linien bis dahin dort, wo sie auf dem Netz gerade liegen (auf einem eben feineren Netz: auf den Sehnen des alten).
 */
export function zieleVonJetzt(z: Zug): void {
  z.versch = loops.map((_, li) => mitRest(z, li, null));
  z.lagen = z.loeser.lagen(z.versch);
}

/**
 * Zug in Stufen: Reicht der Zug über den halben Bereich hinaus, wird der Stand festgehalten, verdichtet und der Zug von hier aus
 * weitergeführt (Verschieben, Skalieren und Drehen setzen sich so zusammen), mit einem Bereich, der mindestens so weit reicht, wie
 * schon gezogen wurde (wie das Abziehen in FiberMesh). Sonst hielte der feste Rand des Bereichs, was mitgehen soll (gemessen: die
 * Kappe vor einem Ring blieb 44 Einheiten zurück und faltete sich ein), und die Dehnung läge auf den alten Dreiecken. Stufen schon
 * bei Dehnung der Haut machten es schlechter (jede Stufe nimmt den Stand als neue Ruhe, Ansätze von Falten blieben). ⌘Z und Esc
 * nehmen den ganzen Zug zurück.
 */
export function zugStufe(z: Zug, X: number, Y: number): void {
  const t0 = performance.now();
  zugGriffeUebernehmen(z);
  festlegenAlle();
  zugGriffeAblesen(z);
  nachVerdichten();
  zug = null;
  // der Bereich wächst mit dem Zug (wie das Abziehen in FiberMesh): mindestens so weit, wie schon gezogen wurde
  if (!zugStarten(z.modal, z.ansicht, X, Y, z.spiegel, z.weite)) {
    zug = z;
    return;
  }
  const neu = zug as Zug | null;
  if (!neu) return;
  neu.vorher = z.vorher;
  neu.umgAnfang = z.umgAnfang;
  neu.bewegt = true;
  neu.achse = z.achse;
  neu.weite0 = z.weite;
  neu.weite = z.weite;
  // das neue Netz muss sich setzen (über die ganze Haut im Bildtakt)
  if (!mitBereich()) {
    neu.offen = true;
    zieleVonJetzt(neu);
  }
  zugStufen++;
  letzteStufeMs = Math.round(performance.now() - t0);
}
/**
 * Verfeinern im Zug im Hintergrund (`?hintergrund=0`: wie `zugStufe` im Vordergrund):
 * 1. Haut (flach, mit einer Kopie der Lagen) und Loops gehen an den Worker (`verfeinern.worker.ts`), die Loops als Kopie, festgelegt
 *    auf den Stand von jetzt. Der Zug selbst läuft mit seinem Löser unverändert weiter. (Bis zum 10.11. wurde er hier festgehalten
 *    und mit einem neuen Löser weitergeführt, und Verdichten, Einbetten und Zeilenaufbau liefen im Hauptthread: je Auslösen 40–290 ms
 *    bei 5 200–23 400 Punkten; nur die Zerlegung lief im Hintergrund.)
 * 2. Der Worker verdichtet, merkt sich für jeden Punkt des feineren Netzes seine Stelle auf der alten Haut, baut die Zeilen der
 *    Matrix und zerlegt sie.
 * 3. Ist das Ergebnis zurück, wird mitten im Zug eingewechselt (`einwechseln`): Erst dort wird der Zug festgehalten.
 */
export function stufeImHintergrund(z: Zug, X: number, Y: number): void {
  // ein Aufräumen von vor diesem Zug ist verfallen (der Zug hat den Stand geändert); rechnet der Worker noch daran oder an einem
  // verfallenen Auftrag des letzten Zugs, wird er neu angelegt (der neue Auftrag wartete sonst dahinter)
  G.aufraeumen = null;
  G.aufgeraeumt = null;
  G.zwischenstand = null;
  const w = auftraegeOffen > 0 ? hintergrundFrei() : zerleger();
  if (!w) {
    zugStufe(z, X, Y);
    return;
  }
  // nichts zu tun: Verdichten ist aus, oder auf diesem Netz fand der letzte Auftrag in diesem Zug nichts zu verfeinern
  if (!VERDICHTEN || nichtsZuVerfeinern === haut) return;
  const t0 = performance.now();
  // die Loops, wie sie nach dem Festhalten wären, als Kopie (die echten gehören dem laufenden Zug)
  const echte = loops;
  loops = echte.map(kopieLoop);
  zugGriffeUebernehmen(z);
  festlegenAlle();
  zugGriffeAblesen(z);
  const festgelegt = loops;
  loops = echte;
  const t1 = performance.now();
  const id = ++verfeinerungsNr;
  if (nachbarnGemerkt?.haut !== haut) nachbarnGemerkt = { haut, flach: nachbarnFlach(haut) };
  const auftrag: VerfeinerAuftrag = {
    id,
    haut: hautFlach(haut, nachbarnGemerkt.flach),
    loops: festgelegt,
    maxKante: 1.75 * MK,
    opt: verdichtenOptionen(),
    kruemmung: KRUEMMUNG && !altePose(),
    gewichte: GEWICHTE,
    loeserOpt: RICHTUNG_OPT,
  };
  verfeinerung = { id, netz: haut, t0: performance.now() };
  auftraegeOffen++;
  w.postMessage(auftrag, [auftrag.haut.pos.buffer]);
  ausloesungTeile = [t1 - t0, performance.now() - t1].map(Math.round);
  letzteAusloesungMs = Math.round(performance.now() - t0);
  merke(messung.ausloesen, performance.now() - t0);
}

/** Das im Hintergrund verfeinerte und zerlegte Netz einwechseln: Zug festhalten, die Punkte des feineren Netzes auf der Haut von jetzt, weiter */
export function einwechseln(f: Verfeinert, daten: ZerlegungsDaten[]): void {
  const z = zug;
  if (!z || !letzteMaus) return;
  const t0 = performance.now();
  letzteVerdichtung = { neu: f.neu, gelegt: f.gelegt, ms: 0 };
  // der Löser rechnet im Bildtakt: Kam seit der letzten Runde eine Mausbewegung, liegen die Linien noch nicht auf ihren Zielen
  if (z.zielNeu && !mitBereich()) {
    z.zielNeu = false;
    if (rundeMitWeg(z.loeser, z.versch) === Infinity) {
      davongelaufen(z.vorher);
      return;
    }
  }
  zugGriffeUebernehmen(z);
  festlegenAlle();
  zugGriffeAblesen(z);
  const t1 = performance.now();
  const nAlt = haut.n;
  const pos = einbettungAuswerten(f.einbettung, haut);
  const t2 = performance.now();
  const neu: Haut = { ...f.haut, pos };
  // die Linien des feineren Netzes (ihre Proben) mit dem Stand ihrer Punkte von jetzt
  const neueLoops = f.loops.map((l, li) => {
    const jetzt = loops[li]!;
    return { ...jetzt, proben: l.proben, s: l.s, ruhe: l.ruhe, punkte: jetzt.punkte.map((p) => ({ ...p })) };
  });
  haut = neu;
  loops = neueLoops;
  netzGewachsen(nAlt, f.alt, null);
  anzeige.geometrieNeu();
  festlegenAlle();
  const t3 = performance.now();
  zug = null;
  naechsteVorlage = vorlageAusSystemen(f.gew, daten.map(systemAusDaten), f.struktur);
  const [X, Y] = letzteMaus;
  if (!zugStarten(z.modal, z.ansicht, X, Y, z.spiegel, z.weite)) {
    naechsteVorlage = null;
    zug = null;
    return;
  }
  const t4 = performance.now();
  const n2 = zug as Zug | null;
  if (n2) {
    n2.vorher = z.vorher;
    n2.umgAnfang = z.umgAnfang;
    n2.bewegt = true;
    n2.achse = z.achse;
    n2.weite0 = z.weite;
    n2.weite = z.weite;
    // das feinere Netz muss sich setzen
    if (!mitBereich()) {
      n2.offen = true;
      zieleVonJetzt(n2);
    }
  }
  hintergrundStufen++;
  letzteEinwechslungMs = Math.round(performance.now() - t0);
  letzteHintergrundMs = Math.round(performance.now() - f.t0);
  anzeige.hautZeigen();
  anzeige.baenderZeigen();
  blaetterZeichnen();
  anzeige.statusZeigen();
  merke(messung.einwechseln, performance.now() - t0);
  einwechslungTeile = [t1 - t0, t2 - t1, t3 - t2, t4 - t3, performance.now() - t4].map(Math.round);
}

/** Verfeinern im Hintergrund (`?hintergrund=0`: im Vordergrund) */
export const HINTERGRUND = new URLSearchParams(location.search).get('hintergrund') !== '0';
/** der Auftrag, der gerade im Hintergrund läuft: seine Nummer und das Netz, zu dem er gehört */
export type Verfeinerung = { id: number; netz: Haut; t0: number };
/** sein Ergebnis: das feinere Netz mit Loops, jeder Punkt als Stelle auf der alten Haut, die Gewichte der Matrix */
export type Verfeinert = { haut: Haut; loops: Loop[]; alt: Int32Array; einbettung: Einbettung; gew: Float64Array[]; struktur: string; neu: number; gelegt: number; t0: number };
export let verfeinerung: Verfeinerung | null = null;
export let verfeinerungsNr = 0;
/** auf diesem Netz fand der letzte Auftrag nichts zu verfeinern (bis zum Loslassen nicht noch einmal fragen) */
export let nichtsZuVerfeinern: Haut | null = null;
/**
 * D1, Teil 2 (18.11.): Der letzte Auftrag hätte nur wenige Punkte zusammengelegt (`VerfeinerErgebnis.wenig`): nicht eingewechselt;
 * bis zu diesem Zeitpunkt (`performance.now()`) wird im Zug nicht wieder gefragt
 */
export let verfeinernPause = 0;
export const VERFEINERN_PAUSE_MS = 400;
/** die Nachbarn der Haut als flaches Feld (hängt nur am Netz; je Netz einmal gebaut) */
export let nachbarnGemerkt: { haut: Haut; flach: ReturnType<typeof nachbarnFlach> } | null = null;
/** das Ergebnis eines Auftrags, das im nächsten Bild eingewechselt wird */
/* in G: eingetroffen */
/** die Zerlegung für den nächsten Löser (statt zu zerlegen) */
export let naechsteVorlage: HautVorlage | null = null;
export let letzteMaus: [number, number] | null = null;
export let zerlegerWorker: Worker | null = null;
export let hintergrundStufen = 0;
export let letzteAusloesungMs = 0;
/** Auslösen im Hauptthread in Teilen (ms): Loops kopieren und festlegen, Auftrag packen und abschicken */
export let ausloesungTeile: number[] = [];
/** der letzte Auftrag im Hintergrund in Teilen (ms): verdichten, einbetten, Zeilen, zerlegen */
export let hintergrundTeile: number[] = [];
export let letzteEinwechslungMs = 0;
/** das letzte Einwechseln in Teilen (ms): Linien festlegen, Punkte auf die Haut von jetzt, neues Netz übernehmen, Löser anlegen, zeigen */
export let einwechslungTeile: number[] = [];
/** Auspacken des letzten Ergebnisses aus dem Hintergrund (ms) */
export let letztesAuspacken = 0;
export let letzteHintergrundMs = 0;
export function zerleger(): Worker | null {
  if (!HINTERGRUND || hintergrundAus) return null;
  if (zerlegerWorker) return zerlegerWorker;
  try {
    zerlegerWorker = new Worker(new URL('./verfeinern.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
  zerlegerWorker.onmessage = (e: MessageEvent<VerfeinerErgebnis | AufraeumErgebnis | Zwischenstand | { id: number; fehler: string }>) => {
    const d = e.data;
    // ein Zwischenstand (die gesetzte Haut nach der Vorstufe): Der Auftrag rechnet weiter; angewendet wird im nächsten Bild (`schleife`)
    if ('art' in d && d.art === 'zwischen') {
      if (G.aufraeumen && d.id === G.aufraeumen.id) G.zwischenstand = d;
      return;
    }
    auftraegeOffen = Math.max(0, auftraegeOffen - 1);
    // das Aufräumen: Das Ergebnis wird im nächsten Bild angewendet (`schleife`), wenn der Stand noch derselbe ist
    if (G.aufraeumen && d.id === G.aufraeumen.id) {
      if ('fehler' in d) {
        // dieser Auftrag ist gescheitert: Was für den Stand offen war, rechnet das Fenster selbst (wie ohne Hintergrund), wenn er noch
        // derselbe ist; für diesen Stand beginnt kein neuer Auftrag
        const f = G.aufraeumen;
        G.aufraeumen = null;
        G.aufgeraeumt = null;
        G.zwischenstand = null;
        let imFenster = 'im Fenster gerechnet';
        if (!zug && !altePose() && f.netz === haut && f.stand === standZahl()) {
          const r = ruheOffen;
          ruheOffen = null;
          // scheitert dieselbe Rechnung auch im Fenster, bleibt die Form, wie sie ist (der Fehler darf hier nicht weiterlaufen)
          try {
            if (r?.setzen && !r.nurInRuhe) {
              hautNeuRechnen(r.ziele ?? loops.map(() => null), true);
              anzeige.geometrieNeu();
            } else if (r?.verdichten) aufraeumenImFenster();
          } catch (e) {
            console.error('Fehler beim Rechnen im Fenster', e);
            imFenster = 'die Form bleibt, wie sie ist';
          }
          hintergrundGescheitert = standZahl();
        }
        G.meldung = `Rechnen im Hintergrund fehlgeschlagen (${d.fehler}): ${imFenster}`;
        if (zug) anzeige.statusZeigen();
        else anzeige.allesZeigen();
      } else if ('art' in d) G.aufgeraeumt = d;
      return;
    }
    const f = verfeinerung;
    if (!f || d.id !== f.id || 'art' in d) return;
    verfeinerung = null;
    if ('fehler' in d) {
      // der Zug läuft auf dem alten Netz weiter; verdichtet wird dann beim Loslassen
      nichtsZuVerfeinern = haut;
      G.meldung = `Verfeinern im Hintergrund fehlgeschlagen: ${d.fehler}`;
      anzeige.statusZeigen();
      return;
    }
    hintergrundTeile = d.ms.map(Math.round);
    if (d.leer) {
      // (nur wenige Punkte zusammenzulegen: kein Einwechseln; nach einer Pause wieder fragen, die Haut kann dann gestreckt sein)
      if (d.wenig) verfeinernPause = performance.now() + VERFEINERN_PAUSE_MS;
      else nichtsZuVerfeinern = haut;
      return;
    }
    if (f.netz !== haut) return;
    const ta = performance.now();
    const fertig: Verfeinert = { haut: hautAusFlach(d.haut), loops: d.loops, alt: d.alt, einbettung: d.einbettung, gew: gewichteAusFlach(d.gewStart, d.gewWert), struktur: d.struktur, neu: d.neu, gelegt: d.gelegt, t0: f.t0 };
    letztesAuspacken = Math.round(performance.now() - ta);
    // eingewechselt wird im nächsten Bild, an Stelle der Löserrunde (`schleife`): Beides in einem Bild hielte den Zug doppelt so lang an
    G.eingetroffen = { netz: f.netz, fertig, daten: d.daten };
  };
  zerlegerWorker.onerror = (e) => {
    // der Worker selbst ist ausgefallen (nicht ein einzelner Auftrag): ab jetzt ohne Hintergrund, alles im Fenster wie bis G4
    hintergrundAus = true;
    zerlegerWorker?.terminate();
    zerlegerWorker = null;
    auftraegeOffen = 0;
    verfeinerung = null;
    G.eingetroffen = null;
    nichtsZuVerfeinern = haut;
    G.aufraeumen = null;
    G.aufgeraeumt = null;
    G.zwischenstand = null;
    // was für den Stand offen ist (setzen, aufräumen), rechnet das Fenster gleich in der Ruhe selbst (`vorrechnenPlanen`)
    G.meldung = `Rechnen im Hintergrund ausgefallen (${e.message || 'Worker nicht geladen'}): weiter ohne Hintergrund`;
    if (zug) anzeige.statusZeigen();
    else anzeige.allesZeigen();
  };
  return zerlegerWorker;
}
/** der Worker selbst ist ausgefallen: Bis zum Neuladen läuft alles im Fenster (wie mit `?hintergrund=0`) */
export let hintergrundAus = false;
/** Aufträge, an denen der Worker noch rechnet (auch verfallene) */
export let auftraegeOffen = 0;
/**
 * Der Worker für einen neuen Auftrag: Rechnet er noch an einem verfallenen (der Zug wurde losgelassen, oder man hat nach dem Loslassen
 * gleich wieder gegriffen), wird er beendet und neu angelegt; der neue Auftrag wartete sonst dahinter (bei 23 400 Punkten Sekunden).
 */
export function hintergrundFrei(): Worker | null {
  if (zerlegerWorker && auftraegeOffen > 0) {
    zerlegerWorker.terminate();
    zerlegerWorker = null;
    auftraegeOffen = 0;
  }
  return zerleger();
}

// ---------- Nach dem Loslassen und nach jeder Änderung: Nachlauf im Bildtakt, Rechnen im Hintergrund (G4.2, G4.3, G4.4) ----------

/**
 * Nach dem Loslassen (10.11., Gegenprüfung G4.2 und G4.3; über die ganze Haut nach der Geometrie; `?nachlauf=0`: wie bis dahin):
 * 1. **Nachlauf.** Steht die Haut beim Loslassen noch nicht, rechnet der Löser des Zugs im Bildtakt weiter, bis sie steht (vorher:
 *    höchstens vier Runden auf einmal, der Rest blieb liegen bis zum nächsten Greifen).
 * 2. **Aufräumen im Hintergrund** (`verfeinern.ts`, `aufraeumen`): verdichten, setzen bis zur Ruhe, nachverfeinern, zerlegen. Das
 *    Fenster zeigt so lange die Haut, wie sie ist, und wechselt einmal ein. Vorher lief das im Hauptthread und in Stufen: verdichten
 *    beim Loslassen, 30 ms später zerlegen (0,1–1,2 s Stillstand) und setzen, bis zu dreimal nachverfeinern und wieder zerlegen
 *    und setzen; jede Stufe war zu sehen, auch mitten im Anlauf des neuen Lösers.
 * 3. Die Zerlegung kommt mit (`vorlageBereit`): Das nächste Greifen zerlegt nicht. Greift man vorher, verfällt der Auftrag, und der
 *    Zug nimmt die Zerlegung des letzten Zugs (der Kern prüft, ob ihre Struktur noch passt).
 * Ändert inzwischen jemand den Stand (Rückgängig, ein Werkzeug, ein neuer Zug), enden Nachlauf und Auftrag ohne Wirkung; geprüft
 * wird am Stand selbst (`standZahl`), nicht an jeder Stelle, die ihn ändern kann.
 *
 * Nach jeder anderen Änderung (G4.4): Was für den Stand offen ist (`ruheOffen`), geht in der Ruhe an denselben Auftrag
 * (`ruheImHintergrund`, 30 ms nach der Änderung):
 * - **Kante an oder aus, Löschen** (`hautNeuRechnen`) und **ein neuer Loop**: Die Haut steht nicht mehr zum Stand. Der Auftrag
 *   zerlegt und setzt zuerst (Vorstufe) und meldet die gesetzte Haut samt Zerlegung als Zwischenstand (`zwischenAnwenden`); danach
 *   räumt er auf wie nach dem Loslassen. Bis dahin rechnete das Fenster selbst: Kante an hielt es 0,4 / 0,9 / 2,5 s an (5 200 /
 *   11 000 / 23 400 Punkte), und nach einem neuen Loop setzte erst der erste Griff die Haut, sichtbar als Ruck über die ganze Haut
 *   (5 bis 26 Einheiten je Bild, drei Bilder lang).
 * - **Sonst** (Punkt gesetzt, Rückgängig): nur die Zerlegung für das nächste Greifen (im Fenster 0,1 / 0,3 / 1 s Stillstand).
 * Verfällt ein Auftrag, weil sich der Stand geändert hat, beginnt in der Ruhe einer für den neuen Stand; was offen war, bleibt offen.
 */
export const NACHLAUF = new URLSearchParams(location.search).get('nachlauf') !== '0';
export const mitNachlauf = (): boolean => NACHLAUF && HINTERGRUND && !mitBereich() && GEWICHTE === 'geometrie';
/** der Löser des losgelassenen Zugs, der noch rechnet; Netz, Lagen und Loops, wie er sie zuletzt hinterlassen hat */
export let nachlauf: { loeser: LoopZug; versch: (Float64Array | null)[]; runden: number; netz: Haut; lagen: number; loops: number } | null = null;
/**
 * der Auftrag im Hintergrund: seine Nummer und der Stand, zu dem er gehört (nach dem Zwischenstand der gesetzte Stand); `setzen`:
 * seine Vorstufe läuft noch, `verdichten`: er räumt auf (sonst nur die Zerlegung)
 */
/* in G: aufraeumen */
/** sein Zwischenstand und sein Ergebnis, bis sie im nächsten Bild angewendet werden */
/* in G: zwischenstand */
/* in G: aufgeraeumt */
/** für diesen Stand ist ein Auftrag gescheitert: Das Fenster rechnet ihn selbst zu Ende */
export let hintergrundGescheitert = '';
/** für diesen Stand ist ein Ergebnis angewendet: nichts mehr zu tun, solange nichts Neues offen ist */
export let standFertig = '';
/**
 * Die Zerlegung, die zum Stand passt: die des letzten Zugs oder die aus dem Hintergrund. Das nächste Greifen bietet sie dem Löser an
 * (`loeserFuer`); er nimmt sie nur, wenn ihre Struktur passt. `vorlageStand`: der Stand, für den sie genau gerechnet ist (leer: nur
 * ungefähr, mit den Lagen von früher).
 */
export let vorlageBereit: HautVorlage | null = null;
export let vorlageStand = '';
/**
 * Netz und Lagen, für die die bereite Zerlegung genau gerechnet ist (leer: nur ungefähr). Die Zerlegung hängt am Netz, an den Lagen
 * und an der Struktur (Proben der Linien, Kanten, Ecken), nicht an den Punkten und Griffen der Loops: Nach einem neuen Punkt auf
 * einer Linie ist der Stand ein anderer, die Zerlegung aber dieselbe (10.11., Florian: „beim Firefish warte ich nach dem Zug neuer
 * Punkte Sekunden“; gemessen an seiner Form mit 27 800 Punkten: Der Griff am neuen Punkt wartete 0,9 s bis über 2 s auf den
 * Hintergrund, der dieselbe Zerlegung noch einmal rechnete).
 */
export let vorlageNetz = '';
export const netzZahl = (): string => `${haut.n}:${lagenZahl(haut.pos)}`;
/** die Struktur, die ein Löser über die ganze Haut für den Stand von jetzt hätte (je Stand einmal gerechnet) */
export let strukturGemerkt: { stand: string; struktur: string } | null = null;
export function strukturJetzt(stand: string): string {
  if (strukturGemerkt?.stand !== stand) strukturGemerkt = { stand, struktur: loopStruktur(haut, loops, RICHTUNG_OPT) };
  return strukturGemerkt.struktur;
}
/** nimmt ein Löser für den Stand von jetzt die bereite Zerlegung (ihre Struktur ist dieselbe)? */
export const vorlagePasst = (stand: string): boolean => vorlageBereit !== null && vorlageBereit.struktur !== undefined && vorlageBereit.struktur === strukturJetzt(stand);
/** ist die bereite Zerlegung genau die für diesen Stand (für ihn gerechnet, oder Netz, Lagen und Struktur sind seitdem dieselben)? */
export function vorlageGenau(stand: string): boolean {
  if (!vorlageBereit) return false;
  if (vorlageStand === stand) return true;
  if (VORLAGE_BLEIBT && vorlageNetz !== '' && vorlageNetz === netzZahl() && vorlagePasst(stand)) {
    vorlageStand = stand;
    return true;
  }
  return false;
}
/** `?vorlagebleibt=0`: wie bis zum 10.11. (nach jeder Änderung an den Loops eine neue Zerlegung, der Griff wartet darauf) */
export const VORLAGE_BLEIBT = new URLSearchParams(location.search).get('vorlagebleibt') !== '0';
/** der letzte Auftrag und der letzte Zwischenstand (zum Messen) */
export let letzterAuftrag: {
  nr: number;
  geaendert: boolean;
  vorstufe: string;
  abgebrochen: boolean;
  neu: number;
  gelegt: number;
  durchgaenge: number;
  runden: number;
  ms: number[];
  gesamt: number;
  einwechseln: number;
  angewendet: boolean;
  /** Vorsicht bei Unruhe: wie oft die Löser des Auftrags ihren Schritt halbiert haben oder stehen geblieben sind */
  unruhe: number;
} | null = null;
export let letzterZwischenstand: { nr: number; runden: number; ms: number[]; gesamt: number; einwechseln: number } | null = null;
export let nachlaufRunden = 0;

export const streu = new Float64Array(1);
export const streuBits = new Uint32Array(streu.buffer);
/** Streuwert über Lagen (jedes Bit zählt) */
export function lagenZahl(P: Float64Array): number {
  const u = new Uint32Array(P.buffer, P.byteOffset, 2 * P.length);
  let a = 2166136261;
  for (let i = 0; i < u.length; i++) a = Math.imul(a ^ u[i]!, 16777619);
  return a >>> 0;
}
/** Streuwert über die Loops: Punkte, Griffe, Kanten, Ecken, Zahl der Proben; dazu Maul und Pose */
export function loopsZahl(): number {
  let a = 2166136261;
  const mische = (x: number) => {
    a = Math.imul(a ^ x, 16777619);
  };
  const zahl = (x: number) => {
    streu[0] = x;
    mische(streuBits[0]!);
    mische(streuBits[1]!);
  };
  mische(loops.length);
  for (const l of loops) {
    mische(l.id);
    mische(l.proben.length);
    zahl(l.laenge);
    mische((l.kante ? 1 : 0) | (l.pfad ? 2 : 0));
    mische(l.punkte.length);
    for (const p of l.punkte) {
      zahl(p.s);
      zahl(p.ref.x);
      zahl(p.ref.y);
      zahl(p.ref.z);
      mische((p.kante === undefined ? 2 : p.kante ? 1 : 0) | (p.ecke === undefined ? 8 : p.ecke ? 4 : 0) | (p.autoEcke ? 16 : 0) | (p.vonSelbst ? 32 : 0) | (p.mundwinkel ? 64 : 0));
      if (p.knick !== undefined) mische(Math.round(1000 * p.knick) + 7);
      mische(p.kreuzung ?? -1);
      for (const g of [p.ein, p.aus]) {
        mische(g ? 1 : 0);
        if (g) {
          zahl(g.x);
          zahl(g.y);
          zahl(g.z);
        }
      }
    }
  }
  mische(grund ? 1 : 0);
  mische(G.maul ? G.maul.id : -1);
  return a >>> 0;
}
/** Der Stand, an dem Nachlauf und Auftrag hängen: Netz, Lagen, Loops */
export const standZahl = (): string => `${haut.n}:${lagenZahl(haut.pos)}:${loopsZahl()}`;

/**
 * Das Maul als echte Form (20.11.): Linien, die mit Absicht auf sich selbst liegen. Die Lippe ist ein zusammengeklappter Loop (ihre
 * zwei Lippen liegen zu aufeinander, sie kehrt am Mundwinkel um), ebenso die Mitte von Gaumen und Boden; und eine Linie, die vorn an
 * Ober- und Unterlippe endet (die Mitte der Form), berührt sich dort mit ihren zwei Enden. Zurück: die Probe, an der eine solche
 * Linie in zwei Hälften zerfällt, die jede für sich frei liegen müssen (der Mundwinkel, sonst ihre Mitte); −1: eine Linie wie jede.
 */
function maulFalte(l: Loop): number {
  if (l.art !== 'ring' || l.proben.length < 4) return -1;
  const bei = (s: number): number => {
    let j = 0;
    for (let k = 1; k < l.s.length; k++) if (Math.abs(l.s[k]! - s) < Math.abs(l.s[j]! - s)) j = k;
    return j;
  };
  if (istMaulEcht(l)) {
    const w = l.punkte.find((p) => p.mundwinkel);
    return w ? bei(w.s) : -1;
  }
  if (!l.haengt?.[0] || !l.haengt[1]) return -1;
  const k0 = l.punkte[0]?.kreuzung;
  const k1 = l.punkte[l.punkte.length - 1]?.kreuzung;
  if (k0 === undefined || k1 === undefined) return -1;
  for (const L of loops) {
    if (L === l || !istMaulEcht(L) || L.punkte.length < 2) continue;
    const e0 = L.punkte[0]!.kreuzung;
    const e1 = L.punkte[L.punkte.length - 1]!.kreuzung;
    if ((k0 === e0 && k1 === e1) || (k0 === e1 && k1 === e0)) return bei(0.5 * l.laenge);
  }
  return -1;
}
/** kreuzt oder berührt die Linie sich selbst (`linieKreuztSich`); am Maul als echter Form zählt jede ihrer zwei Hälften für sich */
function kreuztSich(l: Loop): boolean {
  const j = maulFalte(l);
  if (j <= 0 || j >= l.proben.length - 1) return linieKreuztSich(l);
  return linieKreuztSich(l, l.ruhe.slice(0, 3 * (j + 1))) || linieKreuztSich(l, l.ruhe.slice(3 * j));
}
/** Loops, deren Linie sich selbst kreuzt oder berührt (`linieKreuztSich`): ein Griff ist verdreht, ein Punkt über seinen Nachbarn hinaus gezogen */
export const linienGekreuzt = (): number[] => loops.filter((l) => kreuztSich(l)).map((l) => l.id);
export const GEKREUZT_TEXT = (ids: readonly number[]): string =>
  `Loop ${ids.join(', ')} kreuzt sich selbst (ein Griff verdreht?). Die Haut ist dort umgeklappt; das Netz bleibt, wie es ist, bis die Linie wieder frei liegt.`;

/**
 * Nach einem Zug, wenn die Haut steht: aufräumen (verdichten, setzen, zerlegen im Hintergrund). Kreuzt sich eine Linie selbst
 * (11.11., Florian: „es darf nicht jedes Mal, wenn ich versehentlich ein Handle falschherum drehe, das Mesh kaputt gehen“), bleibt
 * alles, wie es ist: kein Aufräumen und keine neue Zerlegung, die bereite bleibt die des Zugs (von vor dem Verdrehen). Die Haut ist
 * dort über sich selbst gefaltet; ein Netz und eine Zerlegung, die für die gefaltete Haut gebaut sind, passen nach dem Zurückdrehen
 * nicht mehr. Gemessen im Kern an Florians Form `test_kaputt` (`form-griff-verdreht.ts`: Griff des obersten Punkts der Mitte
 * verdreht, losgelassen, zurückgedreht): mit einer Zerlegung von der gefalteten Haut bleiben 4 Knicke über 150°, und 1 % Rauminhalt
 * fehlt; mit der Zerlegung von davor ist die Form wieder die alte (0 Knicke, 100,0 %). Liegt die Linie nach einem späteren Zug wieder
 * frei, wird wie sonst aufgeräumt.
 */
export function nachZugAufraeumen(): void {
  const gekreuzt = linienGekreuzt();
  if (gekreuzt.length) {
    ruheOffen = null;
    standFertig = standZahl();
    G.meldung = GEKREUZT_TEXT(gekreuzt);
    return;
  }
  aufraeumenStarten(ruheOffen ?? { setzen: false, nurInRuhe: false, verdichten: true, ziele: null });
}

/** Nachlauf: je Bild Runden des losgelassenen Zugs, bis die Form steht; dann geht das Aufräumen in den Hintergrund */
export function nachlaufRechnen(): void {
  const n = nachlauf;
  if (!n) return;
  // ein neuer Zug bewegt sich, oder jemand hat den Stand geändert: Der Nachlauf endet, wo er ist
  if (zug?.bewegt || altePose() || n.netz !== haut || n.lagen !== lagenZahl(haut.pos) || n.loops !== loopsZahl()) {
    nachlauf = null;
    anzeige.statusZeigen();
    // ohne neuen Zug: die Zerlegung für das nächste Greifen wie sonst in der Ruhe vorrechnen
    if (!zug) vorrechnenPlanen();
    return;
  }
  const t0 = performance.now();
  let steht = false;
  for (;;) {
    const tr = performance.now();
    const weg = rundeMitWeg(n.loeser, n.versch);
    if (weg === Infinity) {
      // der Zug ist schon der letzte Schritt von ⌘Z: dorthin zurück
      davongelaufen(null);
      return;
    }
    n.runden++;
    nachlaufRunden++;
    if (weg < RUHE || n.runden >= NACH_RUNDEN) {
      steht = true;
      break;
    }
    const jetzt = performance.now();
    if (jetzt - t0 + (jetzt - tr) > BUDGET_MS) break;
  }
  if (steht) {
    nachlauf = null;
    festlegenAlle();
    nachZugAufraeumen();
    // ohne Hintergrund hat das Fenster selbst verdichtet: alles neu zeigen (und in der Ruhe setzen)
    if (!G.aufraeumen) anzeige.allesZeigen();
    else blaetterZeichnen();
  } else n.lagen = lagenZahl(haut.pos);
  anzeige.hautZeigen();
  anzeige.baenderZeigen();
  anzeige.statusZeigen();
  merke(messung.nachlauf, performance.now() - t0);
}

/** Aufräumen ohne Hintergrund, wie bis G4.1 im Fenster: verdichten jetzt, setzen in der Ruhe (`vorrechnenPlanen`) */
export function aufraeumenImFenster(): void {
  const vor = haut;
  nachVerdichten();
  if (haut !== vor && !direktGilt()) {
    nachLoesenOffen = haut;
    nachVerfeinert = 0;
  }
}

/**
 * In der Ruhe nach einer Änderung (G4.4): Was für den Stand noch zu rechnen ist, geht in den Hintergrund: setzen, wenn die Haut nicht
 * steht, aufräumen nach einem Zug, sonst nur die Zerlegung für das nächste Greifen. Wahr, wenn der Hintergrund zuständig ist (dann
 * rechnet das Fenster hier nichts).
 */
export function ruheImHintergrund(): boolean {
  if (!mitNachlauf() || !zerleger()) return false;
  const stand = standZahl();
  if (hintergrundGescheitert === stand) return false;
  // der Hintergrund rechnet schon für diesen Stand
  if (G.aufraeumen && G.aufraeumen.stand === stand) return true;
  // das Fenster hat selbst verdichtet (ohne Hintergrund gerechnet, z. B. beim Umschalten einer Ecke): Das Setzen danach übernimmt der
  // Hintergrund
  if (nachLoesenOffen === haut) {
    nachLoesenOffen = null;
    if (!direktGilt()) ruheOffen = { setzen: true, nurInRuhe: false, verdichten: true, ziele: null };
  }
  if (ruheOffen) aufraeumenStarten(ruheOffen);
  else if (standFertig !== stand && !vorlageGenau(stand)) aufraeumenStarten({ setzen: false, nurInRuhe: false, verdichten: false, ziele: null });
  else if (G.aufraeumen) {
    // ein Auftrag für einen früheren Stand läuft noch, und für diesen ist nichts zu tun: Er verfällt
    G.aufraeumen = null;
    G.aufgeraeumt = null;
    G.zwischenstand = null;
    anzeige.statusZeigen();
  }
  return true;
}

/**
 * Den Auftrag an den Hintergrund geben: (`setzen`: zerlegen und setzen, Zwischenstand;) (`verdichten`: verdichten, setzen bis zur
 * Ruhe, nachverfeinern;) zerlegen. Siehe `RuheOffen`.
 */
export function aufraeumenStarten(opt: RuheOffen): void {
  const w = hintergrundFrei();
  if (!w) {
    // kein Hintergrund: im Fenster wie bis G4 (nach einem neuen Loop geschah dort nichts)
    ruheOffen = null;
    if (opt.setzen && !opt.nurInRuhe) {
      hautNeuRechnen(opt.ziele ?? loops.map(() => null), true);
      anzeige.geometrieNeu();
    } else if (opt.verdichten) aufraeumenImFenster();
    return;
  }
  // „Form halten“: Der Hintergrund verdichtet nur; gesetzt wird mit der heutigen Rechnung nichts (keine Runden)
  const halten = direktGilt();
  const id = ++verfeinerungsNr;
  if (nachbarnGemerkt?.haut !== haut) nachbarnGemerkt = { haut, flach: nachbarnFlach(haut) };
  // die Verschiebungen gelten nur für die Loops, für die sie gerechnet sind
  const ziele = opt.ziele && opt.ziele.length === loops.length && opt.ziele.every((d, i) => !d || d.length === 3 * loops[i]!.proben.length) ? opt.ziele : null;
  const verdichtet = opt.verdichten && VERDICHTEN;
  const auftrag: AufraeumAuftrag = {
    art: 'aufraeumen',
    id,
    haut: hautFlach(haut, nachbarnGemerkt.flach),
    loops,
    exakt: loops.map(exakt),
    verdichten: verdichtet,
    aufrichten: VERDICHTEN && !halten,
    maxKante: 1.75 * MK,
    opt: verdichtenOptionen(false),
    optNurTeilen: verdichtenOptionen(true),
    nachverfeinern: GENAU > 0 && !halten ? 3 : 0,
    kruemmung: KRUEMMUNG,
    gewichte: GEWICHTE,
    loeserOpt: RICHTUNG_OPT,
    ruhe: RUHE,
    maxRunden: halten ? 0 : RUNDEN_NEU,
    zuerstSetzen: opt.setzen && !halten,
    ziele,
    maxRundenZuerst: NACH_RUNDEN,
    nurInRuhe: opt.nurInRuhe,
  };
  G.aufraeumen = { id, netz: haut, stand: standZahl(), t0: performance.now(), setzen: opt.setzen && !halten, nurInRuhe: opt.nurInRuhe, verdichten: verdichtet };
  G.aufgeraeumt = null;
  G.zwischenstand = null;
  auftraegeOffen++;
  w.postMessage(auftrag, [auftrag.haut.pos.buffer]);
  anzeige.statusZeigen();
}

/**
 * Der Zwischenstand aus dem Hintergrund (G4.4): die gesetzte Haut auf demselben Netz, samt ihrer Zerlegung für das nächste Greifen.
 * Der Auftrag räumt von diesem Stand aus weiter auf.
 */
export function zwischenAnwenden(): void {
  const f = G.aufraeumen;
  const d = G.zwischenstand;
  G.zwischenstand = null;
  if (!f || !d || d.id !== f.id) return;
  // inzwischen hat jemand den Stand geändert: Der Auftrag gehört nicht mehr dazu (sein Ergebnis verfällt dann auch)
  if (altePose() || f.netz !== haut || d.pos.length !== haut.pos.length || f.stand !== standZahl()) return;
  const t0 = performance.now();
  haut.pos.set(d.pos);
  festlegenAlle();
  // wie nach jedem Neurechnen: neue Kreuzungen suchen (nach dem Löschen eines Punkts kann eine Linie eine andere schneiden)
  const kreuzungNeu = kreuzungenSuchen() > 0;
  if (d.gewStart && d.gewWert && d.daten.length) {
    vorlageBereit = vorlageAusSystemen(gewichteAusFlach(d.gewStart, d.gewWert), d.daten.map(systemAusDaten), d.struktur);
    vorlageStand = kreuzungNeu ? '' : standZahl();
    vorlageNetz = netzZahl();
  }
  if (kreuzungNeu) {
    // die Loops haben neue Punkte: Der Auftrag rechnet für den Stand ohne sie weiter und verfällt; in der Ruhe beginnt ein neuer
    ruheOffen = { setzen: true, nurInRuhe: f.nurInRuhe, verdichten: f.verdichten, ziele: null };
  } else {
    // die Haut steht; offen ist höchstens noch das Aufräumen, der Auftrag rechnet von diesem Stand aus weiter
    f.stand = standZahl();
    f.setzen = false;
    ruheOffen = f.verdichten ? { setzen: false, nurInRuhe: false, verdichten: true, ziele: null } : null;
  }
  letzterZwischenstand = { nr: d.id, runden: d.runden, ms: d.ms.map(Math.round), gesamt: Math.round(performance.now() - f.t0), einwechseln: 0 };
  anzeige.allesZeigen();
  letzterZwischenstand.einwechseln = Math.round(performance.now() - t0);
}

/**
 * Ein Griff, der wartet (G4.4): Wer greift, während der Hintergrund für genau diesen Stand noch rechnet (gleich nach einem neuen Loop,
 * einer Kante, einem gesetzten Punkt, Rückgängig), bekäme einen Löser ohne fertige Zerlegung und, nach Loop oder Kante, auf einer
 * Haut, die nicht steht: Das Fenster zerlegte selbst (gemessen 0,15 / 0,3–0,5 / 0,9–2,5 s Stillstand beim Drücken bei 5 200 /
 * 11 000 / 23 400 Punkten), und die ersten Runden schlügen über die ganze Haut aus (5 / 8 / 25 Einheiten je Bild). Der Griff
 * wartet deshalb, bis der Hintergrund die gesetzte Haut bzw. die Zerlegung gebracht hat (gemessen 0,3 / 0,8 / 1,3 s nach einem
 * neuen Loop), und beginnt dann dort, wo die Maus inzwischen ist. Nach einem Zug wartet er nicht (dort gilt die Zerlegung des
 * letzten Zugs, G4.3). Dauert es länger als `GRIFF_WARTEN_MS`, beginnt er wie früher.
 */
/* in G: gegriffen */
export const GRIFF_WARTEN_MS = 4000;
/** der Hintergrund bringt für genau diesen Stand noch, was der Griff braucht (die gesetzte Haut, die Zerlegung), oder beginnt gleich damit */
export const griffWartet = (): boolean => {
  if (altePose() || !mitNachlauf() || hintergrundAus) return false;
  const stand = standZahl();
  if (hintergrundGescheitert === stand) return false;
  const f = G.aufraeumen && G.aufraeumen.netz === haut && G.aufraeumen.stand === stand ? G.aufraeumen : null;
  // die Haut wird gerade gesetzt, oder das steht an (30 ms nach der Änderung)
  if (f ? f.setzen : ruheOffen !== null && ruheOffen.setzen) return true;
  // offen ist nur das Aufräumen (nach einem Zug, nach dem Zwischenstand): Die Zerlegung dazu ist da
  if (ruheOffen) return false;
  // sonst fehlt höchstens die Zerlegung für diesen Stand; der Hintergrund rechnet sie (oder beginnt gleich). Passt die bereite noch
  // (dieselbe Struktur: nach einem neuen Punkt auf einer Linie, nach Rückgängig auf demselben Netz), nimmt der Löser sie, und der
  // Griff beginnt gleich
  return !vorlageGenau(stand) && standFertig !== stand && !(VORLAGE_BLEIBT && vorlagePasst(stand));
};
/** den wartenden Griff beginnen (die gesetzte Haut ist da, oder der Auftrag ist verfallen): von der Stelle des Drückens zur Maus von jetzt */
export function griffNachholen(): void {
  const g = G.gegriffen;
  G.gegriffen = null;
  if (!g || zug) return;
  const ok = g.griff ? griffZugStarten(g.a, g.X, g.Y, g.m, loopNr(g.griff.id), g.griff.i, g.griff.seite) : G.auswahl.length > 0 && zugStarten(null, g.a, g.X, g.Y, g.m);
  if (ok && G.maus && G.maus.a === g.a && (G.maus.X !== g.X || G.maus.Y !== g.Y)) zugBewegen(G.maus.X, G.maus.Y);
  anzeige.statusZeigen();
}

/** Das Ergebnis des Aufräumens anwenden: einmal einwechseln, die Zerlegung für das nächste Greifen merken */
export function aufgeraeumtAnwenden(): void {
  const f = G.aufraeumen;
  const d = G.aufgeraeumt;
  if (!f || !d) return;
  G.aufraeumen = null;
  G.aufgeraeumt = null;
  const t0 = performance.now();
  // inzwischen hat jemand den Stand geändert: Das Ergebnis gehört nicht mehr dazu (was offen war, bleibt offen: In der Ruhe beginnt
  // ein Auftrag für den neuen Stand)
  const gilt = !altePose() && f.netz === haut && f.stand === standZahl();
  let neueHaut = false;
  if (gilt) {
    if (d.geaendert && d.haut && d.loops) {
      const fertig = d.loops;
      if (d.alt) {
        const nAlt = haut.n;
        haut = hautAusFlach(d.haut);
        // die Linien des feineren Netzes (ihre Proben) mit den Punkten von jetzt
        loops = loops.map((jetzt, li) => ({ ...jetzt, proben: fertig[li]!.proben, s: fertig[li]!.s, ruhe: fertig[li]!.ruhe, punkte: jetzt.punkte.map((p) => ({ ...p })) }));
        // (in der Pose bekommt die Grundform dieselben Punkte)
        netzGewachsen(nAlt, d.alt, grund ? poseKnochen() : null);
        anzeige.geometrieNeu();
        letzteVerdichtung = { neu: d.neu, gelegt: d.gelegt, ms: Math.round(d.ms[0]!) };
      } else haut.pos.set(d.haut.pos); // dasselbe Netz, gesetzt
      festlegenAlle();
      neueHaut = true;
    }
    if (d.gewStart && d.gewWert && d.daten.length) {
      vorlageBereit = vorlageAusSystemen(gewichteAusFlach(d.gewStart, d.gewWert), d.daten.map(systemAusDaten), d.struktur);
      vorlageStand = standZahl();
      vorlageNetz = netzZahl();
    }
    ruheOffen = null;
    standFertig = standZahl();
    // beim Aufräumen lief die Haut davon: Das Ergebnis ist verworfen, die Form bleibt, wie sie ist (nicht aufgeräumt)
    if (d.abgebrochen) G.meldung = 'Hier ließ sich das Netz nicht aufräumen (die Haut lief dabei auseinander). Die Form bleibt, wie sie ist.';
  }
  if (VORSICHT_LAUT && (d.unruhe > 0 || d.abgebrochen)) console.error(`Vorsicht im Hintergrund: ${d.unruhe}-mal${d.abgebrochen ? ', abgebrochen' : ''}`);
  letzterAuftrag = {
    nr: f.id,
    geaendert: d.geaendert,
    vorstufe: d.vorstufe,
    abgebrochen: d.abgebrochen,
    neu: d.neu,
    gelegt: d.gelegt,
    durchgaenge: d.durchgaenge,
    runden: d.runden,
    ms: d.ms.map(Math.round),
    gesamt: Math.round(performance.now() - f.t0),
    einwechseln: 0,
    angewendet: gilt,
    unruhe: d.unruhe,
  };
  // hat sich an der Haut nichts geändert (nur die Zerlegung kam), bleibt alles, wie es gezeigt ist
  if (neueHaut || !gilt) anzeige.allesZeigen();
  else {
    anzeige.statusZeigen();
    // „Form halten“: Das Verdichten hat nichts geändert, der Stand ist fertig: den Löser für das nächste Greifen anlegen
    if (direktGilt()) vorrechnenPlanen();
  }
  letzterAuftrag.einwechseln = Math.round(performance.now() - t0);
}

export let zugStufen = 0;
export let letzteEndrunden = 0;
export let letzteStufeMs = 0;

/** Die Griffe übernehmen, wie der Zug sie verändert hat (vor dem Festlegen der Linien) */
export function zugGriffeUebernehmen(z: Zug): void {
  loops.forEach((l, li) => {
    const g = z.griffeNeu[li];
    if (!g || !hatGriffe(l) || g.length !== l.punkte.length) return;
    l.punkte.forEach((p, i) => {
      p.ein = g[i]!.ein;
      p.aus = g[i]!.aus;
    });
  });
}

/** Am Maul aus einer Linie: Knickt ein Punkt (eine Ecke von Hand), knickt sein Zwilling auch */
export function zwillingsEcken(): void {
  if (grund) return;
  for (const l of loops) {
    const zw = zwillinge(l);
    if (!zw) continue;
    for (const [i, j] of zw.paare) {
      const a = l.punkte[i]!;
      const b = l.punkte[j]!;
      if (a.ecke === true || b.ecke === true) {
        a.ecke = true;
        b.ecke = true;
      }
    }
  }
}

/** Mit O je Probe verschobene Loops: ihre Griffe aus der neuen Linie ablesen (nach dem Festlegen) */
export function zugGriffeAblesen(z: Zug): void {
  for (const li of z.neuAblesen) {
    const l = loops[li];
    if (l && hatGriffe(l)) griffeAnlegen(l, l.ruhe);
  }
}

export function zugEnde(ok: boolean): void {
  const z = zug;
  if (!z) return;
  const tLos = performance.now();
  zug = null;
  // eine Verfeinerung, die noch im Hintergrund rechnet oder noch nicht eingewechselt ist, verfällt (nach dem Zug wird wie bisher
  // verdichtet)
  verfeinerung = null;
  G.eingetroffen = null;
  nichtsZuVerfeinern = null;
  verfeinernPause = 0;
  if (!ok) {
    wiederherstellen(z.vorher);
    return;
  }
  if (z.bewegt) {
    // zum Messen: wie weit sich die Haut in den Runden am Ende noch bewegt (so weit hinkte der Löser im Zug nach)
    const vorEnde = Float64Array.from(haut.pos);
    // nach dem Loslassen im Hintergrund weiter (Nachlauf, Aufräumen)?
    const imHintergrund = mitNachlauf() && zerleger() !== null;
    // über die ganze Haut hat der Löser im Bildtakt mitgerechnet: Runden am Ende nur, wenn die Haut noch nicht steht
    if (mitBereich()) z.loeser.schritt(z.versch, RUNDEN_ENDE);
    else if (imHintergrund) {
      // nur so weit, dass die Linien auf ihren Zielen liegen (dann können sie festgelegt werden); den Rest rechnet der Nachlauf
      if (z.zielNeu) {
        z.zielNeu = false;
        z.nachRunden++;
        const weg = rundeMitWeg(z.loeser, z.versch);
        if (weg === Infinity) {
          davongelaufen(z.vorher);
          return;
        }
        if (weg < RUHE) z.offen = false;
      }
    } else
      for (let k = 0; z.offen && k < RUNDEN_ENDE; k++) {
        const weg = rundeMitWeg(z.loeser, z.versch);
        if (weg === Infinity) {
          davongelaufen(z.vorher);
          return;
        }
        if (weg < RUHE) z.offen = false;
      }
    letzteEndrunden = 0;
    for (let k = 0; k < vorEnde.length; k += 3)
      letzteEndrunden = Math.max(letzteEndrunden, Math.hypot(haut.pos[k]! - vorEnde[k]!, haut.pos[k + 1]! - vorEnde[k + 1]!, haut.pos[k + 2]! - vorEnde[k + 2]!));
    zugGriffeUebernehmen(z);
    festlegenAlle();
    zugGriffeAblesen(z);
    zwillingsEcken();
    kreuzungenSuchen();
    if (imHintergrund) {
      // ein geschlossener Loop, der durch eine neue Kreuzung seinen zweiten Punkt (und damit einen Pfad) bekam: genau auf ihn
      const aufPfad = linienAufPfad();
      poseSichern();
      zurueck.push(z.vorher);
      // die Zerlegung dieses Zugs für ein Greifen, das vor dem Ende des Aufräumens kommt (ungefähr: mit den Lagen vom Greifen)
      vorlageBereit = z.loeser.vorlage ?? vorlageBereit;
      vorlageStand = '';
      vorlageNetz = '';
      // die Ecken an Kreuzungen folgen den Kanten (wie gleich in `allesZeigen`): Erst danach steht der Stand, an dem der Nachlauf hängt
      eckenAuto(loops);
      G.aufgeraeumt = null;
      G.aufraeumen = null;
      G.zwischenstand = null;
      // offen ist jetzt das Aufräumen (der Löser des Zugs hat die Haut zu den Pfaden gerechnet, mit der Struktur von jetzt)
      ruheOffen = { setzen: false, nurInRuhe: false, verdichten: true, ziele: null };
      // hat `linienAufPfad` die Haut örtlich neu gelegt, gelten die Ziele des Zugs dort nicht mehr: gleich aufräumen
      if (z.offen && !aufPfad) nachlauf = { loeser: z.loeser, versch: z.versch, runden: z.nachRunden, netz: haut, lagen: lagenZahl(haut.pos), loops: loopsZahl() };
      else {
        nachlauf = null;
        nachZugAufraeumen();
      }
    } else {
      const vorVerdichten = haut;
      // (kreuzt sich eine Linie selbst, bleibt das Netz, wie es ist: `nachZugAufraeumen`)
      const gekreuzt = linienGekreuzt();
      if (gekreuzt.length) G.meldung = GEKREUZT_TEXT(gekreuzt);
      else nachVerdichten();
      // aus den Kurven: das verdichtete Netz setzt sich gleich danach in der Ruhe (die neuen Punkte liegen erst nur rund zwischen den
      // alten); beim Loslassen zu lösen hieß, dort auf das Zerlegen des neuen Netzes zu warten (0,6 s bei 15 000 Punkten)
      if (!mitBereich() && haut !== vorVerdichten && z.loeser.art !== 'direkt') {
        nachLoesenOffen = haut;
        nachVerfeinert = 0;
      }
      // ein geschlossener Loop, der durch eine neue Kreuzung seinen zweiten Punkt (und damit einen Pfad) bekam: genau auf ihn
      linienAufPfad();
      poseSichern();
      zurueck.push(z.vorher);
    }
  } else {
    for (const l of loops) for (const p of l.punkte) p.cur = { ...p.ref };
    // „Form halten“: nur gewählt, nichts gezogen: Der Löser dieses Griffs hat nichts gerechnet und gilt weiter für den Stand
    if (z.loeser.art === 'direkt' && !direktBereit && direktGilt()) direktBereit = { stand: standZahl(), haut, loeser: z.loeser.loeser as DirektLoeser };
  }
  // Clipping: Was der Zug über die Spiegelebene geführt hat, verschmilzt dort; die Naht entsteht von selbst und ist gewählt
  if (z.bewegt && G.clipping && ueberDerMitte()) mitteFest(true);
  anzeige.allesZeigen();
  letztesLoslassen = Math.round(performance.now() - tLos);
}
/** so lange hielt das letzte Loslassen den Hauptthread an (ms, zum Messen) */
export let letztesLoslassen = 0;

/**
 * Nach einem Zug: Wo Kanten länger als 1,75 Kanten des Startnetzes geworden sind (dort ist die Haut gedehnt), wird das Netz feiner,
 * die neuen Punkte liegen rund (`verdichten`); wo Kanten kürzer als ½ geworden sind (dort ist sie gestaucht), werden sie
 * zusammengelegt. Im unberührten Netz ist keine Kante so lang (Startkugel höchstens 1,67) und kaum eine so kurz (0,1 % unter ½).
 * Dazu wird geteilt, wo das Netz eine Linie ungenauer als `GENAU` wiedergibt. `nurTeilen` (nach dem Setzen): nur das, ohne
 * Zusammenlegen. Mit `?winkel=1` auch, wo sich die Fläche über eine Kante um mehr als 25° dreht (bis ⅓ Startkante; Versuch, dann ohne
 * Zusammenlegen).
 */
export function nachVerdichten(nurTeilen = false): void {
  const t0 = performance.now();
  const vorher = grund ? poseKnochen() : null;
  const nAlt = haut.n;
  const v = verdichtetesNetz(nurTeilen);
  if (!v) return;
  haut = v.haut;
  loops = v.loops;
  netzGewachsen(nAlt, v.alt, vorher);
  anzeige.geometrieNeu();
  letzteVerdichtung = { neu: v.neu, gelegt: v.gelegt, ms: Math.round(performance.now() - t0) };
}

/**
 * Beim Vergröbern fallen Kanten unter diesem Anteil der Startkante zusammen. Gemessen an „strange bird“ im Kern
 * (`form-netz-kleiner.ts`): Mit 0,8 ist die mittlere Kante danach 1,06 Startkanten, wie bei einer Form, die aus dem Startnetz
 * gewachsen ist (32 % der Punkte); mit ½ wie nach einem Zug (`KURZ`) blieben 61 %.
 */
export const GROB_KURZ = 0.8;

/**
 * Kleines Rechennetz (Schritt 2): Hat die Form eine kürzere Startkante als diese Adresse, bekommt sie deren Startkante, und das Netz
 * wird so grob wie eines, das mit ihr gewachsen ist (`verdichten`: Kanten zusammenlegen, die kürzesten zuerst; Linien bleiben auf
 * `GENAU` genau, ihre Punkte, Kreuzungen und Enden bleiben). Die Punkte, die bleiben, bleiben, wo sie sind: Die Form ist danach
 * dieselbe, nur mit weniger Punkten; neu gerechnet wird sie wie bisher erst beim nächsten Griff. Nicht in der Pose.
 */
export function netzVergroebern(): { vorher: number; nachher: number; ms: number } | null {
  if (!VERDICHTEN || grund || !(MK_START > 1.05 * MK)) return null;
  const t0 = performance.now();
  const vorher = haut.n;
  MK = MK_START;
  TOL = 0.25 * MK;
  for (let gang = 0; gang < 8; gang++) {
    const nAlt = haut.n;
    const v = verdichten(haut, loops, 1.75 * MK, { ...verdichtenOptionen(), kurz: GROB_KURZ * MK });
    if (!v) break;
    haut = v.haut;
    loops = v.loops;
    netzGewachsen(nAlt, v.alt, null);
    if (v.gelegt === 0 && v.neu === 0) break;
  }
  anzeige.geometrieNeu();
  return { vorher, nachher: haut.n, ms: Math.round(performance.now() - t0) };
}

/** Wie verdichtet wird (für `verdichten`, im Fenster und im Hintergrund); `nurTeilen`: nichts zusammenlegen */
export function verdichtenOptionen(nurTeilen = false): VerdichtenOptionen {
  // die Öffnung des Mauls wird nicht gezeigt und nicht verdichtet (in der Pose überspannt sie das offene Maul)
  const m = maulAktuell();
  const verborgen = m && m.offen.length === haut.tri.length / 3 ? m.offen : null;
  // nur in der Grundform: Dort ist die Linie ihr Pfad. In der Pose liegt sie neben ihm (die Punkte werden von der posierten Linie
  // abgelesen, die Griffe sind die der Grundform); nach dem Pfad geteilt wurde dort laufend neu vernetzt (Fressen-Probe: 572 neue,
  // 741 zusammengelegte Punkte, danach 2 umgeklappt)
  const genau = GENAU > 0 && !altePose() ? { genau: GENAU * MK, genauHaut: GENAU_HAUT, genauFlaeche: GENAU_FLAECHE * MK } : {};
  return WINKEL ? { winkel: 25, minKante: MK / 3, verborgen, flachSchutz: FLACH_SCHUTZ } : { verborgen, kurz: nurTeilen ? 0 : KURZ * MK, ...genau, flachSchutz: FLACH_SCHUTZ };
}

/** Das verdichtete Netz zum Stand jetzt (wie `nachVerdichten`, ohne es zu übernehmen) */
export function verdichtetesNetz(nurTeilen = false): Verdichtet | null {
  if (!VERDICHTEN) return null;
  return verdichten(haut, loops, 1.75 * MK, verdichtenOptionen(nurTeilen));
}

// ---------- Loops schneiden, Formen zeichnen, Punkte setzen und löschen ----------

export function loopSchneiden(a: Ansicht, A: [number, number], B: [number, number]): void {
  if (nurInGrundform('Einen Loop schneidest du')) return;
  const l = loopAusSchnitt(haut, a, A, B, naechsteId, 10 / anzeige.skala(a));
  if (!l) {
    G.meldung = 'Kein Loop: die Linie quer über den Körper ziehen';
    return;
  }
  if (l.art === 'mitte' && loops.some((x) => x.art === 'mitte')) {
    G.meldung = 'Den Loop in der Mitte gibt es schon';
    return;
  }
  naechsteId++;
  zurueck.push(schnappschuss());
  loops.push(l);
  einsetzenLetzten(PUNKTE_NOETIG);
  linienAufPfad(loops[loops.length - 1]);
  einsetzenNachholen();
  ruheNoetig();
  G.auswahl = [{ l: l.id, i: -1 }];
}

/**
 * Der mit P gezeichnete Strich im Blatt, dicht abgetastet, in den Koordinaten des Kerns (`uvAus`): von Anker zu Anker mit ihren
 * Richtungen (ein Anker ohne Richtung ist eine Ecke), offen.
 */
export function stiftStrich(a: Ansicht, anker: readonly StiftAnker[], schritt = 0.3 * MK): [number, number][] {
  const uv: [number, number][] = [];
  for (let i = 0; i + 1 < anker.length; i++) {
    const c = stiftStueck(anker[i]!, anker[i + 1]!);
    let lang = 0;
    for (let k = 0; k < 3; k++) lang += Math.hypot(c[k + 1]![0] - c[k]![0], c[k + 1]![1] - c[k]![1]);
    const n = Math.max(4, Math.ceil(lang / schritt));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const u = 1 - t;
      const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      uv.push(uvAus(a, b[0]! * c[0]![0] + b[1]! * c[1]![0] + b[2]! * c[2]![0] + b[3]! * c[3]![0], b[0]! * c[0]![1] + b[1]! * c[1]![1] + b[2]! * c[2]![1] + b[3]! * c[3]![1]));
    }
  }
  const z = anker[anker.length - 1];
  if (z) uv.push(uvAus(a, z.X, z.Y));
  return uv;
}

/**
 * Loop schneiden mit einem Strich quer über die Form (C2, 18.11.; gerade oder gebogen, beliebig viele Punkte; Anfang und Ende im
 * Leeren): der Loop rundum, in der Ansicht genau auf dem Strich (`loopAusVorhang`). Die gezeichneten Punkte auf der Form werden
 * Punkte des Loops (vorn). Wahr, wenn ein Loop dazukam.
 */
export function vorhangSchneiden(a: Ansicht, anker: readonly StiftAnker[]): boolean {
  if (nurInGrundform('Einen Loop schneidest du')) return false;
  // An einer freien Form (18.11.) gilt der Strich, wie er gezeichnet ist: ein Loop für sich, ohne Gegenstück. Zeigt sie ihr
  // Spiegelbild und trifft der Strich nur dieses (Front, Top), gilt er als sein Spiegelbild: Der Loop entsteht an der Form
  const frei = istFrei();
  let strich = stiftStrich(a, anker);
  let l = strich.length >= 2 ? loopAusVorhang(haut, a, strich, naechsteId, 10 / anzeige.skala(a)) : null;
  let amSpiegelbild = false;
  if (!l && frei && G.spiegelbild && a !== 'seite' && strich.length >= 2) {
    const drueben = strich.map((q) => uvGespiegelt(a, q));
    l = loopAusVorhang(haut, a, drueben, naechsteId, 10 / anzeige.skala(a));
    if (l) {
      strich = drueben;
      amSpiegelbild = true;
    }
  }
  if (!l) {
    G.meldung =
      strich.length >= 2 && !vorhangWeg(a, strich, 10 / anzeige.skala(a), frei)
        ? 'Kein Loop: Der Strich kreuzt die Mitte mehrmals. Einmal quer über die Mitte ziehen oder ganz auf einer Seite bleiben'
        : 'Kein Loop: den Strich quer über den Körper ziehen (Anfang und Ende im Leeren)';
    return false;
  }
  if (l.art === 'mitte' && loops.some((x) => x.art === 'mitte')) {
    G.meldung = 'Den Loop in der Mitte gibt es schon';
    return false;
  }
  naechsteId++;
  zurueck.push(schnappschuss());
  loops.push(l);
  einsetzenLetzten(PUNKTE_NOETIG);
  const neu = loops[loops.length - 1]!;
  // die gezeichneten Punkte: je Anker auf der Form die Stelle des Loops, die im Blatt bei ihm liegt, vorn; läuft der Loop dort auch
  // hinten über den Strich (in Front und Top, oder ein Loop auf einer Seite), auch hinten. Ein Strich in Front oder Top gilt auch
  // als sein Spiegelbild (er wurde auf der Seite z < 0 gezeichnet, oder über die Mitte). Ein Anker ohne Richtung ist eine Ecke.
  const weit = 0.5 * MK;
  const fang = 1e-3 * Math.max(1, neu.laenge);
  let gesetzt = 0;
  for (const k of anker.slice(1, -1)) {
    const [u0, v0] = amSpiegelbild ? uvGespiegelt(a, uvAus(a, k.X, k.Y)) : uvAus(a, k.X, k.Y);
    const orte: [number, number][] = frei ? [[u0, v0]] : a === 'front' ? [[u0, v0], [-u0, v0]] : a === 'top' ? [[u0, v0], [u0, -v0]] : [[u0, v0]];
    const stellen: number[] = [];
    for (const [u, v] of orte) {
      for (const hinten of [false, true]) {
        const st = stelleImBlatt(neu, a, u, v, weit, neu.ruhe, hinten);
        if (st !== null && !stellen.some((x) => Math.abs(x - st) < fang)) stellen.push(st);
      }
      if (stellen.length) break;
    }
    for (const st of stellen) {
      const p = punktEinfuegen(neu, st);
      // (trifft der gezeichnete Punkt das verdeckte Ende eines Rings, ist es von jetzt an sein Punkt)
      delete p.vonSelbst;
      if (!k.aus && p.kreuzung === undefined) p.ecke = true;
      gesetzt++;
    }
  }
  // Hat der Loop Punkte, braucht sein Pfad auch dort einen, wo er im Blatt umkehrt (am Umriss, von vorn nach hinten): verdeckt,
  // wie die Enden eines Rings. Dann die Griffe noch einmal aus der Linie (jedes Stück für sich angepasst) und im Blatt aus dem
  // Strich: In dieser Ansicht liegt der Pfad auf dem Strich
  const W = vorhangWeg(a, strich, 10 / anzeige.skala(a), frei);
  if (W && W.art !== 'mitte' && neu.punkte.some(istSichtbar)) {
    for (const st of wendeStellen(neu, a, W.weg)) {
      // (liegt dort schon ein Punkt, etwa eine Kreuzung, trägt er die Umkehr)
      const nah = (q: LoopPunkt): boolean => {
        const d = Math.abs(q.s - st);
        return Math.min(d, neu.art === 'ring' ? d : neu.laenge - d) < 0.5 * MK;
      };
      if (neu.punkte.some(nah)) continue;
      const p = punktEinfuegen(neu, st);
      p.vonSelbst = true;
      gesetzt++;
    }
  }
  if (hatGriffe(neu)) {
    if (gesetzt) griffeAnlegen(neu, neu.ruhe, !grund, 0);
    if (W && W.art !== 'mitte') griffeAufStrich(neu, a, W.weg);
  }
  linienAufPfad(neu);
  einsetzenNachholen();
  aufrichtenJetzt();
  ruheNoetig();
  G.auswahl = [{ l: l.id, i: -1 }];
  return true;
}

/**
 * Umgeschlagene Dreiecke gleich aufrichten (C2, 18.11.): Nach dem Einsetzen eines Loops und dem Legen der Linie auf ihren Pfad
 * rücken die Punkte der Kette um Bruchteile einer Kante, und schmale Dreiecke neben ihr können umschlagen; bis zum nächsten
 * Aufräumen blieben sie stehen. Nur aufrichten (`verdichten` ohne Teilen, Zusammenlegen und Drehen zur Wertigkeit), nur wenn eines
 * da ist. Was es nicht löst: Kreuzt der neue Loop eine vorhandene Linie in sehr flachem Winkel, liegen zwischen den zwei Ketten
 * Dreiecke, deren Ecken alle auf Linien liegen (gemessen an „strange bird“: vier, Fläche 0,07 und 0,5 der mittleren); dort lässt
 * sich nichts drehen oder rücken (Liste für den Feinschliff).
 */
export function aufrichtenJetzt(): void {
  if (!VERDICHTEN || umgeschlageneZahl() === 0) return;
  const vorher = grund ? poseKnochen() : null;
  const nAlt = haut.n;
  const v = verdichten(haut, loops, Infinity, { verborgen: verdichtenOptionen().verborgen ?? null, drehen: false, entspannen: false });
  if (!v) return;
  haut = v.haut;
  loops = v.loops;
  netzGewachsen(nAlt, v.alt, vorher);
  anzeige.geometrieNeu();
}

/**
 * Nach einem neuen Loop steht die Haut nicht mehr zum Stand (neues Netz an seiner Kette, eine Linie mehr, die ihre Krümmung trägt): Der
 * Hintergrund setzt sie (G4.4). Bis dahin setzte sie erst der erste Griff, sichtbar als Ruck über die ganze Haut.
 */
export function ruheNoetig(): void {
  // „Form halten“: Ein neuer Loop liegt auf der Haut, wie sie ist; sie setzt sich nicht
  if (direktGilt()) return;
  if (!LOOP_SETZEN || !mitNachlauf() || !zerleger()) return;
  // Erst wenn sich Loops kreuzen, halten sie die Haut. Mit einem einzelnen Ring ist die Form nicht bestimmt: Gemessen schwingt ein
  // neuer Löser dann bis 149 Einheiten je Runde aus, braucht 23 bis 36 Runden und landet je nach Netz woanders (bei 11 000 Punkten
  // im Fenster 11 Einheiten neben der Kugel, bei 5 200 nur 2); die nächsten Loops lägen dann auf der verzogenen Haut. Ohne Kreuzung
  // bleibt die Haut deshalb, wie sie ist (wie bis G4.3).
  if (!loops.some((l) => l.punkte.some((p) => p.kreuzung !== undefined))) return;
  // War schon etwas offen, bleibt es dabei (eine Kante muss sich setzen, ein Zug wird aufgeräumt). Der neue Loop allein setzt nur,
  // wenn die Haut dabei zur Ruhe kommt, und räumt nicht auf (jedes Aufräumen begänne wieder mit einem neuen Löser).
  const alt = ruheOffen;
  ruheOffen = { setzen: true, nurInRuhe: !(alt?.setzen && !alt.nurInRuhe), verdichten: alt?.verdichten ?? false, ziele: alt?.ziele ?? null };
}
/** `?loopsetzen=0`: nach einem neuen Loop setzt sich die Haut nicht von selbst (wie bis G4.3; dann setzt sie der erste Griff) */
export const LOOP_SETZEN = new URLSearchParams(location.search).get('loopsetzen') !== '0';

/**
 * Den neuesten Loop als Kette von Kanten ins Netz einsetzen (dann kann er hart werden), danach seine Kreuzungen suchen. Geht der
 * Weg nicht auf, bleibt er auf der Haut liegen.
 */
export function einsetzenLetzten(punkteNoetig = false): void {
  const vorher = grund ? poseKnochen() : null;
  const nAlt = haut.n;
  const r = loopEinsetzen(haut, loops, loops.length - 1);
  if (r) {
    haut = r.haut;
    loops = r.loops;
    netzGewachsen(nAlt, nurGewachsen(haut.n, nAlt), vorher);
    G.meldung = '';
  } else G.meldung = 'Loop liegt nur auf der Haut (nicht ins Netz eingesetzt): eine Kante wirkt dort kaum';
  // erst die Kreuzungen (in den anderen Loops teilen sie ein Stück), dann liest der neue Loop alle seine Griffe aus der Linie (wo
  // er eine Kante kreuzt, als Ecke je Seite, wie die Linie dort verläuft); ab jetzt speichert er sie. In der Grundform genau
  // (`griffeAnlegen` mit `genau`): Danach legt `linienAufPfad` die Linie auf ihren Pfad, die Haut folgt; in der Pose ändert sich nichts.
  kreuzungenSuchen(loops[loops.length - 1]);
  eckenAuto(loops);
  const neu = loops[loops.length - 1]!;
  griffeAnlegen(neu, neu.ruhe, !grund, punkteNoetig && !grund ? 0.05 * MK : 0);
  if (r) {
    nadelnWeg();
    // die Puffer der Anzeige einmal, für das Netz, wie es jetzt ist (bis G5 gleich nach dem Einsetzen; dazwischen braucht sie niemand)
    anzeige.geometrieNeu();
  }
}

/**
 * Loops, die nur auf der Haut liegen, noch einmal ins Netz einsetzen (11.11.). So lag in Florians Form `test_kaputt` der Loop der
 * Mitte: Als er gezogen wurde, hatte das Verdichten an zwei Stellen eine Kante der Mittelebene quer gedreht, und er ließ sich nicht
 * einsetzen. Eine Linie, die nur aufliegt, hält die Haut fest, gibt ihr aber keine Krümmung: Der Löser kam um sie herum nie zur Ruhe
 * (an dieser Form: von 92 Zügen im Kern keiner). Nach dem Laden einer Form und nach jedem neuen Loop; in der Pose nicht.
 * Zurück: wie viele eingesetzt wurden.
 */
export function einsetzenNachholen(): number {
  if (grund) return 0;
  let zahl = 0;
  for (let li = 0; li < loops.length; li++) {
    if (loops[li]!.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) continue;
    const r = loopEinsetzen(haut, loops, li);
    if (!r) continue;
    haut = r.haut;
    loops = r.loops;
    // die Linie liegt jetzt auf Punkten des Netzes: jede Probe an ihre Stelle auf dem Pfad, die Haut folgt
    linienAufPfad(loops[li]);
    zahl++;
  }
  if (zahl) {
    anzeige.geometrieNeu();
    anzeige.hautZeigen();
    ruheNoetig();
  }
  return zahl;
}

/**
 * Gleich nach dem Einsetzen eines Loops (G5, 10.11.): Wo die Linie eine Kante dicht neben einem Punkt kreuzt oder eine Ecke knapp
 * abschneidet, liegen Punkte der Linie fast aufeinander (gemessen bis 0,002 Startkanten, Dreiecke mit 0,02°). Bis zum ersten Aufräumen
 * nach einem Zug rechnete der Löser mit diesen Nadeln; beim Aufräumen entstanden aus ihnen flache Dreiecke längs der Linie. Hier
 * fallen sie zusammen (`nadelnZusammenlegen`: nur an den Linien, ohne Teilen, Drehen, Entspannen; die Form ändert sich um
 * Hundertstel). `?nadeln=0`: wie vorher.
 */
export const NADELN = new URLSearchParams(location.search).get('nadeln') !== '0';
/**
 * Beim Verdichten kein Dreieck flach werden lassen und vorhandene flache auflösen (G5, 10.11.; `verdichten`, Option `flachSchutz`).
 * `?flach=0`: wie vorher (zum Vergleich, zusammen mit `?nadeln=0`).
 */
export const FLACH_SCHUTZ = new URLSearchParams(location.search).get('flach') !== '0';
export let letzteNadeln = { gelegt: 0, ms: 0 };
export function nadelnWeg(): void {
  if (!VERDICHTEN || !NADELN) return;
  const t0 = performance.now();
  // nur, wenn am neuen Loop eine Kante so kurz ist (sonst kostete schon das Nachsehen im Kern 10 / 22 / 40 ms bei 5 400 / 11 200 /
  // 23 600 Punkten; die älteren Loops sind seit ihrem Einsetzen bereinigt)
  const neu = loops[loops.length - 1]!;
  const P = haut.pos;
  const kurz = 0.22 * MK;
  const noetig = neu.proben.some((p) => {
    const v = p.ecken[0];
    return haut.nachbarn[v]!.some((w) => Math.hypot(P[3 * v]! - P[3 * w]!, P[3 * v + 1]! - P[3 * w + 1]!, P[3 * v + 2]! - P[3 * w + 2]!) < kurz);
  });
  if (!noetig) {
    letzteNadeln = { gelegt: 0, ms: Math.round((performance.now() - t0) * 10) / 10 };
    return;
  }
  const vorher = grund ? poseKnochen() : null;
  const nAlt = haut.n;
  const v = nadelnZusammenlegen(haut, loops, MK, verdichtenOptionen().verborgen ?? null);
  letzteNadeln = { gelegt: v ? v.gelegt : 0, ms: Math.round((performance.now() - t0) * 10) / 10 };
  if (!v) return;
  haut = v.haut;
  loops = v.loops;
  netzGewachsen(nAlt, v.alt, vorher);
}

/**
 * Kante der Auswahl an oder aus (Taste K): ein ganzer Loop samt seinen Punkten, sonst die gewählten Punkte. Eine Kante reicht von
 * einem Punkt bis zu seinen Nachbarpunkten, dort läuft der Knick in der Form aus (gezeigt als Verjüngung der Linie). Sind schon alle
 * gewählten an, gehen sie aus.
 */
export function kanteSetzen(): void {
  if (G.auswahl.length === 0) return;
  const ist = (w: Wahl): boolean => {
    const l = loops[loopNr(w.l)];
    if (!l) return false;
    return w.i < 0 ? !!l.kante && l.punkte.every((p) => p.kante !== false) : (l.punkte[w.i]?.kante ?? l.kante ?? false);
  };
  const an = !G.auswahl.every(ist);
  zurueck.push(schnappschuss());
  // Ecken von selbst vorher: Wer eine wird, knickt (jede Seite so rund wie möglich), wer keine mehr ist, wird wieder glatt
  const vorher = new Set(loops.flatMap((l) => l.punkte.filter(istEckeVonSelbst)));
  for (const w of G.auswahl) {
    const l = loops[loopNr(w.l)];
    if (!l) continue;
    if (w.i < 0) {
      l.kante = an;
      for (const p of l.punkte) {
        p.kante = an;
        // rund heißt: Die Linie gibt auch keinen Knick mehr vor (eine Maullinie, die ihren Winkel selbst trug)
        if (!an) delete p.knick;
      }
    } else {
      const p = l.punkte[w.i];
      if (p) {
        p.kante = an;
        if (!an) delete p.knick;
      }
    }
  }
  eckenAuto(loops);
  // Kante aus, aber eine kreuzende Linie knickt dort noch von Hand: Ihr Knick ist die Kante, die Linie bleibt hart (gemessen und
  // verworfen, 13.11.: die kreuzende Linie dabei von selbst glatt machen. An einem geformten Maul mit einer Mittellinie aus zwei
  // Punkten drehen sich dann deren lange Griffe, und der ganze Körper stülpt sich um.)
  const bleibt =
    !an &&
    G.auswahl.some((w) => {
      const l = loops[loopNr(w.l)];
      if (!l) return false;
      const hd = kanteBei(l, loops);
      if (w.i < 0) return hd.some((x) => x > 0);
      const p = l.punkte[w.i];
      if (!p) return false;
      let j = 0;
      for (let k = 1; k < l.s.length; k++) if (Math.abs(l.s[k]! - p.s) < Math.abs(l.s[j]! - p.s)) j = k;
      return hd[j]! > 0;
    });
  G.meldung = an ? 'Kante' : bleibt ? 'Die Kante bleibt, wo eine kreuzende Linie knickt (ihr Knick ist die Kante)' : 'keine Kante';
  hautNeuRechnen(kantenKnicken(loops, vorher));
  anzeige.geometrieNeu();
  anzeige.allesZeigen();
}

/**
 * Nach einer Kante an oder aus oder dem Löschen von Loops oder Punkten die Haut neu rechnen, über die ganze Haut, bis sie steht:
 * Ohne Zug blieb sie, wie sie war (eine Kante wirkte erst beim nächsten Zug, eine gelöschte Linie hinterließ ihre Form). `versch`: um
 * so viel bewegen sich die Linien dabei (gelöschte Punkte, je Loop 3 je Probe). In der Pose nur, wenn sich Linien bewegen.
 */
export function hautNeuRechnen(versch: readonly (Float64Array | null)[] = loops.map(() => null), sofort = false): void {
  if (altePose()) {
    // in der Pose nur, wenn Linien sich bewegt haben (gelöschte Punkte): um sie herum
    if (!versch.some((d) => d)) return;
    const bewegt: V3[] = [];
    const ecken = new Set<number>();
    let weit = 0;
    loops.forEach((l, li) => {
      const d = versch[li];
      if (!d) return;
      for (let j = 0; j < l.proben.length; j++) {
        const w = Math.hypot(d[3 * j]!, d[3 * j + 1]!, d[3 * j + 2]!);
        if (w < 1e-9) continue;
        weit = Math.max(weit, w);
        bewegt.push(lageAus(l.ruhe, j));
        for (const v of l.proben[j]!.ecken) ecken.add(v);
      }
    });
    const z = loeserFuer(bewegt, Math.max(2 * MK, 3 * weit), ecken);
    z.schritt(versch, RUNDEN_NEU);
    festlegenAlle();
    kreuzungenSuchen();
    poseSichern();
    return;
  }
  vorrechnenAus();
  eckenAuto(loops);
  if (direktGilt()) {
    // „Form halten“: Die Linien gehen auf ihre neuen Pfade (gelöschte Punkte, geknickte Griffe), die Haut folgt ihnen direkt. Eine
    // Kante an oder aus ändert die Haut so nicht; das zeigt erst die heutige Rechnung (Schalter aus).
    const t0 = performance.now();
    const z = new LoopZug(haut, loops, null, false, 'direkt', GEWICHTE, { direkt: direktNehmen() });
    z.schritt(
      loops.map((l, li) => (exakt(l) ? pfadVersatz(l, z.start[li]!) : versch[li]!)),
      12,
    );
    festlegenAlle();
    kreuzungenSuchen();
    nachVerdichten();
    letzteZerlegung = z.loeser.zeitZerlegen;
    letzterBereich = z.loeser.anzahl;
    letztesNeuRechnen = Math.round(performance.now() - t0);
    return;
  }
  // über die ganze Haut nach der Geometrie rechnet das der Hintergrund (G4.4, `ruheImHintergrund`): Das Fenster hielt hier 0,4 / 0,9 /
  // 2,5 s an (Kante an bei 5 200 / 11 000 / 23 400 Punkten). `sofort`: im Fenster wie bis dahin (wer gleich danach weiterrechnet)
  if (!sofort && mitNachlauf() && zerleger()) {
    ruheOffen = { setzen: true, nurInRuhe: false, verdichten: true, ziele: versch.some((d) => d) ? [...versch] : null };
    return;
  }
  const t0 = performance.now();
  const z = new LoopZug(haut, loops, null, KRUEMMUNG, HAUT, GEWICHTE, RICHTUNG_OPT);
  // Punkte und Griffe sind schon die neuen: Das Ziel jeder Linie mit Pfad ist genau ihr Pfad
  z.schritt(
    loops.map((l, li) => (exakt(l) ? pfadVersatz(l, z.start[li]!) : versch[li]!)),
    RUNDEN_NEU,
  );
  festlegenAlle();
  kreuzungenSuchen();
  const vorVerdichten = haut;
  nachVerdichten();
  if (!mitBereich() && haut !== vorVerdichten) {
    nachLoesenOffen = haut;
    nachVerfeinert = 0;
  }
  letzteZerlegung = z.loeser.zeitZerlegen;
  letzterBereich = z.loeser.anzahl;
  letztesNeuRechnen = Math.round(performance.now() - t0);
}
export let letztesNeuRechnen = 0;

/**
 * In der Grundform liegt jede Linie genau auf ihrem Pfad. Ein neuer Loop (`neu`) und jeder, dessen Linie spürbar neben ihrem Pfad liegt
 * (ein geschlossener Loop, der gerade seinen zweiten Punkt bekam; Punkte oder Loops aus der Pose), bekommt seine Stellen auf dem Pfad
 * (`pfadParameter`, dann springen die Proben nur quer zur Linie), und die Haut folgt (Florian, 07.11.: ohne Zusatzpunkte, die Haut darf
 * sich beim Anlegen leicht ändern). Örtlich und mit Gedächtnis (jeder Punkt behält seine Krümmung): Aus den Kurven über die ganze Haut
 * gerechnet zog schon der erste Ring die Kugel um 10 Einheiten weg (mit einem Loop hält nichts sie rund; gemessen an der Kugel nach drei
 * Loops: so bis 2,2, im Mittel 0,4; aus den Kurven bis 8,9, im Mittel 3,5). Was nur um den Rest des Lösers daneben liegt, holt der
 * nächste Zug.
 */
export function linienAufPfad(neu?: Loop, opt: { behalten?: (l: Loop) => boolean; ab?: number } = {}): boolean {
  if (altePose()) return false;
  const versch: (Float64Array | null)[] = loops.map(() => null);
  const bewegt: V3[] = [];
  const ecken = new Set<number>();
  const ab = opt.ab ?? 0.05 * MK;
  let weit = 0;
  loops.forEach((l, li) => {
    if (!exakt(l) || (l !== neu && pfadAbweichung(l) < ab)) return;
    // (`behalten`: Die Proben bleiben an ihrer Stelle auf dem Pfad, die Haut geht dorthin; sonst bekommt jede die nächste Stelle)
    if (!opt.behalten?.(l)) pfadParameter(l);
    const d = pfadVersatz(l)!;
    versch[li] = d;
    for (let j = 0; j < l.proben.length; j++) {
      const w = Math.hypot(d[3 * j]!, d[3 * j + 1]!, d[3 * j + 2]!);
      if (w < 1e-9) continue;
      weit = Math.max(weit, w);
      bewegt.push(lageAus(l.ruhe, j));
      for (const v of l.proben[j]!.ecken) ecken.add(v);
    }
  });
  if (bewegt.length === 0) return false;
  vorrechnenAus();
  const t0 = performance.now();
  const z = new LoopZug(haut, loops, bereichUm(haut, bewegt, Math.max(2 * MK, 3 * weit), ecken), false, 'gedaechtnis');
  z.schritt(versch, RUNDEN_NEU);
  festlegenAlle();
  kreuzungenSuchen();
  letztesNeuRechnen = Math.round(performance.now() - t0);
  return true;
}

/** Ramer–Douglas–Peucker: Nummern der Punkte, die bleiben */
export function vereinfachen(p: readonly [number, number][], tol: number): number[] {
  const bleibt = new Uint8Array(p.length);
  bleibt[0] = 1;
  bleibt[p.length - 1] = 1;
  const stapel: [number, number][] = [[0, p.length - 1]];
  while (stapel.length) {
    const [a, b] = stapel.pop()!;
    const [ax, ay] = p[a]!;
    const [bx, by] = p[b]!;
    const L = Math.hypot(bx - ax, by - ay) || 1;
    let best = -1;
    let wo = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - p[i]![1]) - (ax - p[i]![0]) * (by - ay)) / L;
      if (d > best) {
        best = d;
        wo = i;
      }
    }
    if (best > tol) {
      bleibt[wo] = 1;
      stapel.push([a, wo], [wo, b]);
    }
  }
  return [...bleibt.keys()].filter((i) => bleibt[i]);
}

/**
 * Das Maul aus nur einer Linie (14.11., Florian: „Ein Maul soll auch nur eine Linie sein können. Wenn ich nur eine Linie einzeichne,
 * ist das wie ein an den Mundwinkeln gefalteter Edgeloop, dessen Lippen exakt aufeinander liegen“): Ein offener Strich mit F, in der
 * Seite vom Umriss vorn bis zum Mundwinkel (ein Ende vor dem Körper), in Front und Top über die Mitte oder von ihr aus. Die Linie
 * ist die Oberlippe; die Unterlippe ist ihr um den Mundwinkel gedrehtes Abbild (`maulLinie.ts`), beide zusammen ein Ring, der gleich
 * zum Maul geformt wird (`maulFormenGewaehlt`, animiert). Gerechnet wird diese leicht geöffnete Lage; der Regler „Maul“ zählt von
 * „zu“ (`maulZu`). Zieht man an einer Lippe, geht die andere mit (`verschiebungen`).
 */
export function maulLinieErstellen(a: Ansicht, roh: [number, number][]): void {
  if (grund) {
    G.meldung = 'Ein Maul aus einer Linie entsteht in der Grundform (erst „Fressen“ aus)';
    return;
  }
  if (loops.some(istMaulLinie)) {
    G.meldung = 'Diese Form hat schon ein Maul aus einer Linie';
    return;
  }
  const s = anzeige.skala(a);
  // eine glatte offene Kurve durch die Stützstellen des Strichs
  const idx = vereinfachen(roh, 4 / s);
  const st = idx.map((i) => {
    const [u, v] = uvAus(a, roh[i]![0], roh[i]![1]);
    return { x: u, y: v, z: 0 };
  });
  const m = st.length;
  const drittel = (p: V3, q: V3): V3 => ({ x: (q.x - p.x) / 3, y: (q.y - p.y) / 3, z: 0 });
  const k: Kurve = { art: 'ring', punkte: st.map((p, i) => (i === 0 ? { ...p, aus: drittel(p, st[1]!) } : i === m - 1 ? { ...p, ein: drittel(p, st[m - 2]!) } : p)) };
  const { p, t } = kurveAbtasten(k, 0.6 * MK);
  const uv = p.map((q): [number, number] => [q.x, q.y]);
  // Punkte werden die Stützstellen im Innern des Strichs (seine Enden nicht: das eine liegt vor dem Körper oder auf der Mitte, das
  // andere ist der Mundwinkel)
  const knoten = t.map((x, i) => (x === 0 && i > 0 ? i : -1)).filter((i) => i >= 0);
  const neu = maulLinieAusZeichnung(haut, a, uv, knoten, naechsteId, MK);
  if ('fehler' in neu) {
    G.meldung = `Maul aus einer Linie: ${neu.fehler}`;
    return;
  }
  const vorher = schnappschuss();
  naechsteId++;
  loops.push(neu);
  einsetzenLetzten();
  let l = loops[loops.length - 1]!;
  if (!l.proben.every((q) => q.ecken[0] === q.ecken[1] && q.ecken[1] === q.ecken[2])) {
    wiederherstellen(vorher);
    G.meldung = `Maul aus einer Linie: Die Linie ließ sich hier nicht ins Netz einsetzen${einsetzenGrund ? ` (${einsetzenGrund})` : ''}. Bitte etwas anders zeichnen.`;
    return;
  }
  // die Unterlippe genau als Abbild der gezeichneten Linie (Kreuzungen auf ihr gehen mit), dann alle Linien auf ihre Pfade
  zwillingeAngleichen(l);
  const bewegt = zwillingeFestlegen(l, obereLippe(l));
  if (!bewegt) {
    wiederherstellen(vorher);
    G.meldung = 'Maul aus einer Linie: Die beiden Lippen ließen sich nicht paaren. Bitte etwas anders zeichnen.';
    return;
  }
  for (const i of bewegt) {
    const q = l.punkte[i]!;
    if (q.kreuzung === undefined) continue;
    for (const o of loops) {
      if (o === l) continue;
      for (const r of o.punkte) {
        if (r.kreuzung !== q.kreuzung) continue;
        r.ref = { ...q.ref };
        r.cur = { ...q.ref };
      }
    }
  }
  linienAufPfad(l);
  linienAufPfad();
  einsetzenNachholen();
  l = loops.find((x) => x.id === neu.id)!;
  G.auswahl = [{ l: l.id, i: -1 }];
  // gleich formen (der Stand davor ist der vor dem Strich: ⌘Z nimmt Linie und Maul zusammen zurück)
  maulFormenGewaehlt(vorher);
  if (!maulLauf) {
    // das Formen begann nicht: die Linie bleibt als Kante stehen
    zurueck.push(vorher);
    ruheNoetig();
  }
}

export function formErstellen(a: Ansicht, roh: [number, number][]): void {
  if (roh.length < 8) return;
  if (nurInGrundform('Eine Form zeichnest du')) return;
  // ein offener Strich (Anfang und Ende weiter auseinander als 0,6 seiner Länge): das Maul aus einer Linie
  {
    let lang = 0;
    for (let i = 1; i < roh.length; i++) lang += Math.hypot(roh[i]![0] - roh[i - 1]![0], roh[i]![1] - roh[i - 1]![1]);
    const offen = Math.hypot(roh[roh.length - 1]![0] - roh[0]![0], roh[roh.length - 1]![1] - roh[0]![1]);
    if (offen > 0.6 * lang) {
      maulLinieErstellen(a, roh);
      return;
    }
  }
  const s = anzeige.skala(a);
  // geschlossen: in zwei Hälften vereinfachen (Anfang bis zum fernsten Punkt und zurück), sonst fällt die erste Strecke auf
  // Länge null und es bleiben keine Punkte
  let fern = 0;
  roh.forEach((q, i) => {
    if (Math.hypot(q[0] - roh[0]![0], q[1] - roh[0]![1]) > Math.hypot(roh[fern]![0] - roh[0]![0], roh[fern]![1] - roh[0]![1])) fern = i;
  });
  const vorn = vereinfachen(roh.slice(0, fern + 1), 4 / s);
  const hinten = vereinfachen([...roh.slice(fern), roh[0]!], 4 / s).map((i) => i + fern);
  let idx = [...new Set([...vorn, ...hinten])].filter((i) => i < roh.length).sort((a, b) => a - b);
  if (idx.length < 4) idx = [0, 1, 2, 3].map((k) => Math.floor((k * roh.length) / 4));
  const k: Kurve = {
    art: 'mitte',
    punkte: idx.map((i) => {
      const [u, v] = uvAus(a, roh[i]![0], roh[i]![1]);
      return { x: u, y: v, z: 0 };
    }),
  };
  const { p, t } = kurveAbtasten(k, 0.6 * MK);
  const uv = p.map((q): [number, number] => [q.x, q.y]);
  const knoten = t.map((x, i) => (x === 0 ? i : -1)).filter((i) => i >= 0);
  const l = formAusZeichnung(haut, a, uv, knoten, naechsteId);
  if (!l) {
    G.meldung = 'Keine Form: ganz auf dem Körper zeichnen oder einmal über die Mitte (Front, Top) bzw. vorn über den Umriss (Seite)';
    return;
  }
  naechsteId++;
  zurueck.push(schnappschuss());
  loops.push(l);
  einsetzenLetzten(PUNKTE_NOETIG);
  linienAufPfad(loops[loops.length - 1]);
  einsetzenNachholen();
  ruheNoetig();
  G.auswahl = [{ l: l.id, i: -1 }];
}

/**
 * Stelle s auf dem Bézier-Pfad eines Loops, die im Blatt dem Klick (X, Y) am nächsten liegt: je Stück grob abgetastet, dann nach Newton
 * auf dem abgebildeten Stück (das Blatt bildet linear ab, Tiefe 0). `m`: auf der Spiegelhälfte bzw. dem Zwilling.
 */
export function stelleAmPfad(a: Ansicht, l: Loop, X: number, Y: number, m: boolean): number {
  const P = l.punkte;
  const n = P.length;
  const zu = l.art !== 'ring';
  const flach = (v: V3): V3 => {
    const [x, y] = imBlatt(a, m ? spiegeln(v) : v);
    return { x, y, z: 0 };
  };
  const q = { x: X, y: Y, z: 0 };
  let best = Infinity;
  let bs = 0;
  for (let i = 0; i < (zu ? n : n - 1); i++) {
    const A = P[i]!;
    const E = P[(i + 1) % n]!;
    const [p0, ga, gb, p3] = [flach(A.ref), flach(A.aus!), flach(E.ein!), flach(E.ref)];
    let t0 = 0;
    let d0 = Infinity;
    for (let k = 0; k <= 32; k++) {
      const c = stueckPunkt(p0, ga, gb, p3, k / 32);
      const d = Math.hypot(c.x - X, c.y - Y);
      if (d < d0) {
        d0 = d;
        t0 = k / 32;
      }
    }
    const t = stueckNaechstes(p0, ga, gb, p3, q, t0);
    const c = stueckPunkt(p0, ga, gb, p3, t);
    const d = Math.hypot(c.x - X, c.y - Y);
    if (d < best) {
      best = d;
      bs = A.s + t * ((i + 1 < n ? E.s : E.s + l.laenge) - A.s);
    }
  }
  return zu && bs >= l.laenge ? bs - l.laenge : bs;
}

/**
 * Doppelklick auf eine Linie: dort ein Punkt, genau auf der gezeichneten Linie (in Ruhe ihr Bézier-Pfad). Nur nicht dort, wo schon ein
 * Punkt liegt (im Blatt näher als 3 Bildpunkte). Vorher galt „nicht näher als eine Startkante in s“: s ist aber die Stelle beim Anlegen,
 * nach einem weiten Zug lagen in diesem Abstand bis 25 Einheiten Linie (am herausgezogenen Ohr ließ sich neben den Punkten keiner setzen).
 */
/**
 * Der Punkt der Linie an der Stelle (X, Y) im Blatt: der vorhandene, wenn dort einer liegt (näher als 3 Bildpunkte), sonst ein neuer
 * (wie beim Doppelklick; die Linie ändert sich nicht). `neu`: Er wurde eingefügt.
 */
export function punktAufLinie(a: Ansicht, l: Loop, X: number, Y: number, m: boolean): { p: LoopPunkt; neu: boolean } {
  let bs = 0;
  if (exakt(l)) bs = stelleAmPfad(a, l, X, Y, m);
  else {
    const n = l.proben.length;
    let best = Infinity;
    for (let j = 0; j < (l.art === 'ring' ? n - 1 : n); j++) {
      const k = (j + 1) % n;
      const p = lageAus(l.ruhe, j);
      const q = lageAus(l.ruhe, k);
      const [x0, y0] = imBlatt(a, m ? spiegeln(p) : p);
      const [x1, y1] = imBlatt(a, m ? spiegeln(q) : q);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const t = Math.max(0, Math.min(1, ((X - x0) * dx + (Y - y0) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(X - x0 - t * dx, Y - y0 - t * dy);
      if (d < best) {
        best = d;
        bs = l.s[j]! + t * ((k > j ? l.s[k]! : l.laenge) - l.s[j]!);
      }
    }
  }
  const s = anzeige.skala(a);
  const da = l.punkte.find((p) => {
    if (!istSichtbar(p)) return false;
    const [x, y] = imBlatt(a, m ? spiegeln(p.ref) : p.ref);
    return Math.hypot(x - X, y - Y) * s < 3;
  });
  if (da) return { p: da, neu: false };
  const p = punktEinfuegen(l, bs, undefined, exakt(l));
  // (am Maul aus einer Linie bekommt die andere Lippe den Zwilling)
  if (!grund && istMaulLinie(l)) zwillingeAngleichen(l);
  return { p, neu: true };
}

export function punktAmKlick(a: Ansicht, id: number, X: number, Y: number, m: boolean): void {
  const l = loops[loopNr(id)];
  if (!l) return;
  if (nurInGrundform('Einen Punkt setzt du')) return;
  const vorher = schnappschuss();
  const r = punktAufLinie(a, l, X, Y, m);
  if (!r.neu) return;
  zurueck.push(vorher);
  linienAufPfad();
  G.auswahl = [{ l: id, i: l.punkte.indexOf(r.p) }];
  anzeige.allesZeigen();
}

/**
 * Den Schnitt an der Mitte fest machen (13.11., Florian: „Ich kann ihn [den markierten Punkt] auch löschen, dann ist kein Rückführen
 * mehr möglich“): Die Haut wird an der Mittelebene geschnitten und mit ihrem Spiegelbild verbunden, die Linien enden dort mit ihrem
 * Knick, und der Rand jedes Lochs ist ein Loop mit Kante an (`mitteFestmachen` im Kern). Was hinter der Mitte lag, ist weg; ⌘Z führt
 * zurück. Rund wird der Rand danach mit „Kante aus“ (K). Nur in der Grundform und noch nicht mit einem Maul.
 *
 * `vonSelbst` (18.11., Clipping): gleich nach einem Zug, ohne eigenen Schritt für ⌘Z (ein ⌘Z nimmt Zug und Naht zurück).
 * `mitPunkten`: Mit dem Rand sind auch seine sichtbaren Punkte gewählt. Zurück: ob geschnitten wurde.
 */
export function mitteFest(vonSelbst = false, mitPunkten = vonSelbst): boolean {
  if (grund || G.maul) {
    G.meldung = grund ? 'In der Pose lässt sich der Schnitt an der Mitte nicht fest machen (erst zurück in die Grundform)' : 'Mit einem Maul lässt sich der Schnitt an der Mitte noch nicht fest machen';
    anzeige.statusZeigen();
    return false;
  }
  // (eine freie Form mit Spiegelbild: Die Seite, auf der sie liegt, bleibt und wird mit ihrem Spiegelbild verbunden)
  const warFrei = istFrei();
  const r = mitteFestmachen(haut, loops, warFrei ? { naechsteId, naechsteKreuzung, seite: freiSeite() } : { naechsteId, naechsteKreuzung });
  if ('fehler' in r) {
    G.meldung = vonSelbst ? `Hier verschmilzt die Form an der Mitte noch nicht von selbst (${r.fehler}) · ⌘Z nimmt den Zug zurück` : `Der Schnitt an der Mitte geht so nicht: ${r.fehler}`;
    anzeige.statusZeigen();
    return false;
  }
  if (vonSelbst) {
    // die Naht gehört zum Zug (sein Schritt für ⌘Z liegt schon da); was nach ihm noch rechnen wollte, galt dem Stand davor
    nachlauf = null;
    G.aufgeraeumt = null;
    G.aufraeumen = null;
    G.zwischenstand = null;
    nachLoesenOffen = null;
  } else zurueck.push(schnappschuss());
  const nAlt = haut.n;
  haut = r.haut;
  loops = r.loops;
  naechsteId = r.naechsteId;
  naechsteKreuzung = r.naechsteKreuzung;
  netzGewachsen(nAlt, r.alt, null);
  if (warFrei) {
    // aus der freien Form ist eine verschmolzene geworden: Was für ihr Netz bereitlag, gilt nicht mehr
    vorlageBereit = null;
    vorlageStand = '';
    vorlageNetz = '';
    standFertig = '';
  }
  // gewählt ist der Rand als Ganzes (so wirkt K auch an einem Rand ohne Punkte); von selbst entstanden dazu seine sichtbaren Punkte,
  // damit man die Naht sieht (Ozzy zeigt gewählte Punkte, keine gewählten Linien)
  G.auswahl = r.rand.flatMap((id) => {
    const l = mitPunkten ? loops[loopNr(id)] : undefined;
    return [{ l: id, i: -1 }, ...(l ? l.punkte.flatMap((q, i) => (istSichtbar(q) ? [{ l: id, i }] : [])) : [])];
  });
  const was = r.rand.length === 1 ? 'Der Rand des Lochs ist ein Loop' : `Die Ränder der ${r.rand.length} Löcher sind Loops`;
  G.meldung = vonSelbst
    ? `Naht an der Spiegelebene: ${r.rand.length === 1 ? 'ein Loop' : `${r.rand.length} Loops`} mit Kante, gewählt · K macht ${r.rand.length === 1 ? 'ihn' : 'sie'} rund · ⌘Z nimmt Zug und Naht zurück`
    : `Schnitt an der Mitte fest: ${was} mit Kante (K macht ihn rund, ⌘Z führt zurück)`;
  // die Linien liegen auf ihren Pfaden wie vorher, aber das Netz am Rand ist neu: Die Haut setzt sich und räumt auf wie nach einer Kante
  hautNeuRechnen();
  anzeige.geometrieNeu();
  anzeige.allesZeigen();
  return true;
}

export function loeschen(): void {
  // Die Regel vom 13.11. (nur noch mit `?clipping=0` in der Adresse, im Prüffenster): Einen gewählten Punkt hinter der Mitte löschen
  // macht den Schnitt fest. Seit dem 18.11. entfällt sie (Florian: „Die regel vom donut, dass man den rot markierten punkt dann erst
  // löschen muss entfällt“): Löschen löscht. An einer freien Form gibt es kein „hinter der Mitte“ (gemessen am 18.11.: Dort hatte
  // das Löschen eines Punkts auf der Seite z < 0 die ganze Form an der Ebene verschmolzen).
  if (
    DONUT_REGEL_1311 &&
    !istFrei() &&
    G.auswahl.some((w) => {
      const l = loops[loopNr(w.l)];
      return w.i >= 0 && l !== undefined && !grund && hinterDerMitte(l).includes(w.i);
    })
  ) {
    mitteFest();
    return;
  }
  if (G.auswahl.length && nurInGrundform('Punkte und Linien löschst du')) return;
  const punkte = G.auswahl.filter((w) => w.i >= 0).map((w) => loops[loopNr(w.l)]?.punkte[w.i]);
  const ganz = new Set(G.auswahl.filter((w) => w.i < 0).map((w) => w.l));
  const eigene = new Set(punkte.filter((p) => p && p.kreuzung === undefined));
  // Abzweigungen: Ein hängendes Ende braucht einen Punkt einer anderen Linie. Geht die letzte Linie, an der es hängt, bleibt die
  // Abzweigung nicht ohne Halt zurück: erst sie löschen (oder beide zusammen wählen)
  {
    const lose = loops.filter(
      (x) =>
        x.haengt &&
        !ganz.has(x.id) &&
        ([0, 1] as const).some((ende) => {
          if (!x.haengt![ende]) return false;
          const k = x.punkte[ende === 0 ? 0 : x.punkte.length - 1]?.kreuzung;
          const hielt = (l: Loop): boolean => l !== x && l.punkte.some((q) => q.kreuzung === k);
          return k !== undefined && loops.some((l) => ganz.has(l.id) && hielt(l)) && !loops.some((l) => !ganz.has(l.id) && hielt(l));
        }),
    );
    if (lose.length) {
      G.meldung = `An dieser Linie ${lose.length === 1 ? 'hängt eine Abzweigung' : `hängen ${lose.length} Abzweigungen`}: erst sie löschen oder zusammen mit ihr wählen (⇧-Klick)`;
      anzeige.statusZeigen();
      return;
    }
  }
  // das Maul aus einer Linie: Mit einem Punkt geht sein Zwilling auf der anderen Lippe (ist der eine Kreuzung, bleiben beide); der
  // Mundwinkel bleibt, er hält das Maul
  if (!grund)
    for (const l of loops) {
      const zw = zwillinge(l);
      if (!zw) continue;
      const w = l.punkte[zw.iW]!;
      if (eigene.delete(w)) G.meldung = 'Der Mundwinkel bleibt (er hält das Maul); die ganze Linie lässt sich löschen';
      for (const [i, j] of zw.paare) {
        const a = l.punkte[i]!;
        const b = l.punkte[j]!;
        if (!eigene.has(a) && !eigene.has(b)) continue;
        if (a.kreuzung !== undefined || b.kreuzung !== undefined) {
          eigene.delete(a);
          eigene.delete(b);
          G.meldung = 'Dieser Punkt bleibt: Sein Zwilling auf der anderen Lippe ist eine Kreuzung';
        } else {
          eigene.add(a);
          eigene.add(b);
        }
      }
    }
  if (eigene.size === 0 && ganz.size === 0) {
    if (punkte.length) {
      // der Punkt, an dem eine Abzweigung hängt (ihr eigenes Ende oder der Punkt der anderen Linie)
      const haengtDort = punkte.some((p) => p?.kreuzung !== undefined && loops.some((x) => x.haengt && ([0, 1] as const).some((ende) => x.haengt![ende] && x.punkte[ende === 0 ? 0 : x.punkte.length - 1]?.kreuzung === p.kreuzung)));
      G.meldung = haengtDort ? 'Dieser Punkt bleibt, solange eine Abzweigung an ihm hängt (die Abzweigung selbst lässt sich löschen)' : 'Kreuzungen bleiben, solange sich die Loops kreuzen';
    }
    anzeige.statusZeigen();
    return;
  }
  zurueck.push(schnappschuss());
  // Ecken von selbst vorher: Geht eine Kante mit ihrem Loop, werden ihre Kreuzungen in den anderen wieder glatt (wie Kante aus)
  const vorherEcken = new Set(loops.flatMap((l) => l.punkte.filter(istEckeVonSelbst)));
  // wie in Illustrator: Die Nachbarn verbinden sich über ihre Griffe, die Linie folgt
  const versch = loops.map((l) => (ganz.has(l.id) ? null : punkteLoeschen(l, eigene as Set<LoopPunkt>)));
  const wegKreuz = new Set<number>();
  for (const l of loops) if (ganz.has(l.id)) for (const p of l.punkte) if (p.kreuzung !== undefined) wegKreuz.add(p.kreuzung);
  const bleiben = loops.map((l) => !ganz.has(l.id));
  loops = loops.filter((_, i) => bleiben[i]);
  const verschBleiben = versch.filter((_, i) => bleiben[i]);
  // Kreuzungen mit einem gelöschten Loop werden gewöhnliche Punkte: Die anderen Loops behalten ihre Linie und ihre Griffe. Teilen
  // sich noch zwei Linien den Punkt (eine Abzweigung hing an einer Kreuzung), bleibt er ihr gemeinsamer
  {
    const zahl = new Map<number, number>();
    for (const l of loops) for (const p of l.punkte) if (p.kreuzung !== undefined) zahl.set(p.kreuzung, (zahl.get(p.kreuzung) ?? 0) + 1);
    for (const l of loops) for (const p of l.punkte) if (p.kreuzung !== undefined && wegKreuz.has(p.kreuzung) && (zahl.get(p.kreuzung) ?? 0) < 2) delete p.kreuzung;
  }
  eckenAuto(loops);
  kantenKnicken(loops, vorherEcken).forEach((d, li) => {
    if (!d) return;
    const v = verschBleiben[li];
    if (!v) verschBleiben[li] = d;
    else for (let k = 0; k < d.length; k++) v[k] = v[k]! + d[k]!;
  });
  G.auswahl = [];
  hautNeuRechnen(verschBleiben);
  anzeige.allesZeigen();
}

// ---------- Stift P ----------

/**
 * Stift P (Teil A, 06.11.; Florian: „danach A mit echten Griffen und Stift P“): wie in Illustrator, in einem Blatt. Ein Klick setzt
 * eine Ecke, Klicken und Ziehen einen glatten Punkt (der Griff folgt der Maus, sein Gegenüber zeigt zurück), ein Klick auf den ersten
 * Punkt oder ⏎ schließt die Form; ⌫ nimmt den letzten Punkt zurück, Esc bricht ab. Die geschlossene Form wird wie mit F auf die Haut
 * gelegt (über die Mitte gezeichnet ein Ring, in der Seite vorn über den Umriss auch); ihre Punkte sind die geklickten. Die Linie liegt
 * auf der Haut, wie sie im Blatt gezeichnet ist; die Griffe der glatten Punkte sind die gezogenen, in die Fläche gehoben (im Blatt
 * genau, wie gezeichnet).
 */
export type StiftAnker = { X: number; Y: number; aus: [number, number] | null };
/* in G: stift */

/** Druck mit dem Stift: neuer Punkt, oder am ersten Punkt die Form schließen. Wahr, solange gezogen wird */
export function stiftDruecken(a: Ansicht, X: number, Y: number): boolean {
  if (G.stift && G.stift.a !== a) return false;
  if (!G.stift) G.stift = { a, anker: [], zieht: false };
  const erster = G.stift.anker[0];
  if (erster && G.stift.anker.length >= 3 && Math.hypot(X - erster.X, Y - erster.Y) * anzeige.skala(a) < 8) {
    stiftFertig();
    return false;
  }
  G.stift.anker.push({ X, Y, aus: null });
  G.stift.zieht = true;
  anzeige.blattZeichnen(a);
  return true;
}

/** Ziehen nach dem Druck: der Griff des neuen Punkts (unter 3 px eine Ecke) */
export function stiftBewegen(X: number, Y: number): void {
  const st = G.stift;
  if (!st?.zieht) return;
  const p = st.anker[st.anker.length - 1]!;
  const dx = X - p.X;
  const dy = Y - p.Y;
  p.aus = Math.hypot(dx, dy) * anzeige.skala(st.a) > 3 ? [dx, dy] : null;
}

/** Bézier-Stück von Anker p zu q im Blatt: die vier Kontrollpunkte (eine Ecke ohne Griff) */
export const stiftStueck = (p: StiftAnker, q: StiftAnker): [number, number][] => [
  [p.X, p.Y],
  [p.X + (p.aus?.[0] ?? 0), p.Y + (p.aus?.[1] ?? 0)],
  [q.X - (q.aus?.[0] ?? 0), q.Y - (q.aus?.[1] ?? 0)],
  [q.X, q.Y],
];

/** Form des Stifts schließen: abtasten, auf die Haut legen (wie F), Punkte an den Ankern; Griffe wie gezogen, Ecken als Ecken */
export function stiftFertig(): void {
  const st = G.stift;
  G.stift = null;
  G.modus = 'frei';
  if (nurInGrundform('Eine Form zeichnest du')) {
    anzeige.allesZeigen();
    return;
  }
  if (!st || st.anker.length < 3) {
    G.meldung = 'Stift: mindestens drei Punkte, dann den ersten anklicken (oder ⏎)';
    anzeige.allesZeigen();
    return;
  }
  const a = st.a;
  const A = st.anker;
  const uv: [number, number][] = [];
  const knoten: number[] = [];
  for (let i = 0; i < A.length; i++) {
    const c = stiftStueck(A[i]!, A[(i + 1) % A.length]!);
    let lang = 0;
    for (let k = 0; k < 3; k++) lang += Math.hypot(c[k + 1]![0] - c[k]![0], c[k + 1]![1] - c[k]![1]);
    const n = Math.max(4, Math.ceil(lang / (0.6 * MK)));
    knoten.push(uv.length);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const u = 1 - t;
      const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      const x = b[0]! * c[0]![0] + b[1]! * c[1]![0] + b[2]! * c[2]![0] + b[3]! * c[3]![0];
      const y = b[0]! * c[0]![1] + b[1]! * c[1]![1] + b[2]! * c[2]![1] + b[3]! * c[3]![1];
      uv.push(uvAus(a, x, y));
    }
  }
  // An einer freien Form (18.11.) liegt die Form auf der Seite der Haut, die man sieht (`vorn`), wo sie gezeichnet ist; trifft die
  // Zeichnung nur das gezeigte Spiegelbild (Front, Top), gilt sie als ihr Spiegelbild
  const frei = istFrei();
  const hinten = vonHinten(a, st.vorn);
  let l = formAusZeichnung(haut, a, uv, knoten, naechsteId, hinten);
  if (!l && frei && G.spiegelbild && a !== 'seite') l = formAusZeichnung(haut, a, uv.map((q) => uvGespiegelt(a, q)), knoten, naechsteId, hinten);
  if (!l) {
    G.meldung = frei
      ? 'Keine Form: ganz auf dem Körper zeichnen'
      : 'Keine Form: ganz auf dem Körper zeichnen oder einmal über die Mitte (Front, Top) bzw. vorn über den Umriss (Seite)';
    anzeige.allesZeigen();
    return;
  }
  naechsteId++;
  zurueck.push(schnappschuss());
  loops.push(l);
  einsetzenLetzten();
  const neu = loops.find((x) => x.id === l.id);
  // Griffe genau aus der Zeichnung: Kreuzungen teilen die gezeichneten Stücke (de Casteljau), jeder Griff in der Fläche der Haut. Passt
  // ein Anker nicht (er lag nicht auf dem Körper), bleiben die aus der Linie abgelesenen Griffe
  if (neu && hatGriffe(neu)) {
    const zeichnung = A.map((p, i) => stiftStueck(p, A[(i + 1) % A.length]!).map(([x, y]) => uvAus(a, x, y)) as unknown as ZeichnungsStueck);
    griffeAusZeichnung(haut, neu, a, zeichnung);
  }
  // die Linie genau auf den Pfad (im Blatt ist er genau die gezeichnete Form)
  if (neu) linienAufPfad(neu);
  ruheNoetig();
  G.auswahl = [{ l: l.id, i: -1 }];
  G.meldung = '';
  anzeige.allesZeigen();
}

// ---------- Abzweigung mit P (Zwischenschritt, 14.11.) ----------

/**
 * Abzweigung (Florian, 14.11.: „grundsätzlich soll man von jeder linie und von jedem punkt aus eine verbundene abzweigung erstellen
 * können“). Mit P:
 * - Klick auf einen Punkt oder eine Linie: Dort beginnt sie (auf einer Linie ohne Punkt entsteht er sofort). Das Werkzeug bleibt an.
 * - Klick auf die Haut: ein Punkt dazwischen (Klick = Ecke, Klicken und Ziehen = glatt). ⌫ nimmt den letzten zurück.
 * - Klick auf einen anderen Punkt oder eine andere Linie: Dort endet sie. Esc bricht ab.
 * - Oder in einem Zug: auf dem Anfang drücken, zum Ende ziehen, loslassen.
 * Die neue Linie nimmt von Punkt zu Punkt den geraden Weg über die Haut, hängt an Anfang und Ende und teilt die Punkte mit ihren
 * Linien (`abzweigen` im Kern). Vom Punkt auf das Spiegelbild seiner Linie endet sie auf der Mitte.
 */
export type AbzweigOrt = { id: number; i: number; m: boolean; X: number; Y: number };
/** so weit (in mittleren Kanten) darf der Pfad einer neuen Abzweigung neben ihrem Weg über die Haut liegen, bevor sie Punkte dazwischen bekommt */
export const ABZWEIG_GENAU = 0.25;
/* in G: abzweig */
/** wo der Anfang im Blatt liegt */
export function abzweigAnfangImBlatt(a: Ansicht): [number, number] {
  const ab = G.abzweig!;
  const p = ab.start?.p ?? (ab.von.i >= 0 ? loops[loopNr(ab.von.id)]?.punkte[ab.von.i] : undefined);
  const m = ab.start ? ab.start.m : ab.von.m;
  return p ? imBlatt(a, m ? spiegeln(p.ref) : p.ref) : [ab.von.X, ab.von.Y];
}
/** ist der Ort der Anfang selbst (sein Punkt, ein Punkt einer anderen Linie an derselben Kreuzung, oder die Linie dicht an ihm)? */
export function abzweigIstAnfang(a: Ansicht, o: AbzweigOrt): boolean {
  const ab = G.abzweig;
  if (!ab) return false;
  const [x0, y0] = abzweigAnfangImBlatt(a);
  if (Math.hypot(o.X - x0, o.Y - y0) * anzeige.skala(a) < 6) return true;
  if (!ab.start || o.i < 0) return false;
  const q = loops[loopNr(o.id)]?.punkte[o.i];
  return q === ab.start.p || (q?.kreuzung !== undefined && q.kreuzung === ab.start.p.kreuzung);
}

export const ABZWEIG_WEITER = 'Klick auf die Haut setzt einen Punkt (Klicken und Ziehen: glatt), Klick auf einen anderen Punkt oder eine andere Linie beendet sie · ⌫ letzter Punkt zurück · Esc bricht ab';

/** der erste Klick: Die Abzweigung beginnt hier; auf einer Linie ohne Punkt entsteht er sofort. Das Werkzeug bleibt an */
export function abzweigBeginnen(): void {
  const ab = G.abzweig;
  if (!ab) return;
  const ende = (text: string): void => {
    G.abzweig = null;
    G.modus = 'frei';
    G.meldung = text;
  };
  if (grund) return ende('Eine Abzweigung entsteht in der Grundform (erst „Fressen“ aus)');
  const l = loops[loopNr(ab.von.id)];
  if (!l) return ende('');
  const vorher = schnappschuss();
  let p: LoopPunkt | undefined;
  let neu = false;
  if (ab.von.i >= 0) p = l.punkte[ab.von.i];
  else {
    const r = punktAufLinie(ab.a, l, ab.von.X, ab.von.Y, ab.von.m);
    p = r.p;
    neu = r.neu;
    if (neu) linienAufPfad();
  }
  if (!p) return ende('');
  ab.start = { id: l.id, p, m: ab.von.m };
  ab.vorher = vorher;
  G.meldung = `Abzweigung: Sie beginnt hier${neu ? ' (der Punkt ist gesetzt)' : ''}. ${ABZWEIG_WEITER}`;
}

/** abbrechen: Der Stand von vor dem ersten Klick (ein dafür gesetzter Punkt ist wieder weg) */
export function abzweigAbbrechen(): void {
  const ab = G.abzweig;
  G.abzweig = null;
  if (ab?.vorher) wiederherstellen(ab.vorher);
}

/**
 * Die Abzweigung anlegen: von `von` (oder vom schon gefassten Anfang) über die gesetzten Punkte nach `nach`. `vorher`: der Stand
 * vor dem ersten Klick, falls der Anfang schon gefasst ist.
 */
export function abzweigungErstellen(
  a: Ansicht,
  von: AbzweigOrt,
  nach: AbzweigOrt | null,
  anfang: { id: number; p: LoopPunkt; m: boolean } | null = null,
  standDavor: Schnappschuss | null = null,
  anker: readonly StiftAnker[] = [],
  vorn?: number,
): void {
  const vorher = standDavor ?? schnappschuss();
  const zurueckMit = (text: string): void => {
    wiederherstellen(vorher);
    G.meldung = text;
  };
  if (grund) return zurueckMit('Eine Abzweigung entsteht in der Grundform (erst „Fressen“ aus)');
  if (!nach) return zurueckMit('Abzweigung: Sie endet an einem Punkt oder auf einer Linie (dort klicken oder loslassen)');
  /** der Punkt am Ort: der getroffene, oder der an dieser Stelle der Linie (dort entsteht einer, wenn keiner liegt) */
  const punktAm = (o: AbzweigOrt): { l: Loop; p: LoopPunkt } | null => {
    const l = loops[loopNr(o.id)];
    if (!l) return null;
    const p = o.i >= 0 ? l.punkte[o.i] : punktAufLinie(a, l, o.X, o.Y, o.m).p;
    return p ? { l, p } : null;
  };
  // beide Punkte fassen, erst danach ihre Nummern lesen (ein neuer Punkt verschiebt die Nummern der Punkte seiner Linie)
  const la = anfang ? loops[loopNr(anfang.id)] : undefined;
  const pv = anfang ? (la?.punkte.includes(anfang.p) ? { l: la, p: anfang.p } : null) : punktAm(von);
  const pn = punktAm(nach);
  if (!pv || !pn) return zurueckMit('Abzweigung: Der Punkt am Anfang oder am Ende ließ sich nicht fassen');
  const avJetzt = { loop: loops.indexOf(pv.l), punkt: pv.l.punkte.indexOf(pv.p) };
  const an = { loop: loops.indexOf(pn.l), punkt: pn.l.punkte.indexOf(pn.p) };
  const gleich = avJetzt.loop === an.loop && avJetzt.punkt === an.punkt;
  // (eine freie Form, 18.11.: Sie hat keine Mitte, und ihr Spiegelbild ist nur gezeigt. Eine Abzweigung verbindet zwei Punkte der Form,
  // oder zwei ihres Spiegelbilds: dann entsteht sie an der Form selbst)
  const frei = istFrei();
  const mitte = (x: { loop: number; punkt: number }): boolean => !frei && Math.abs(loops[x.loop]!.punkte[x.punkt]!.ref.z) < 1e-9;
  // über die Mitte: nur zum Spiegelbild des eigenen Anfangs (dann endet die Linie auf der Mitte); Punkte auf der Mitte sind ihr eigenes
  const vonM = anfang ? anfang.m : von.m;
  if (frei && vonM !== nach.m) return zurueckMit('Abzweigung: Anfang und Ende liegen nicht beide auf der Form (eines liegt auf ihrem Spiegelbild)');
  const drueben = !frei && vonM !== nach.m && !mitte(avJetzt) && !mitte(an);
  if (gleich && !drueben) return zurueckMit('Abzweigung: Anfang und Ende sind derselbe Punkt');
  if (drueben && !gleich) return zurueckMit('Abzweigung: Über die Mitte führt sie nur zum Spiegelbild ihres Anfangs (oder sie endet an einem Punkt der Mittellinie)');
  // die gesetzten Punkte: ihr Ort auf der Haut unter dem Blatt, auf der Seite z ≥ 0
  const ueber: AbzweigPunkt[] = [];
  // (an einer freien Form: auf der Seite der Haut, die man sieht; am Spiegelbild gesetzt, an der gespiegelten Stelle der Form)
  const amBild = frei && vonM;
  const hinten = vonHinten(a, vorn) !== (amBild && a === 'seite');
  for (const k of anker) {
    const [u, v] = amBild ? uvGespiegelt(a, uvAus(a, k.X, k.Y)) : uvAus(a, k.X, k.Y);
    const t = strahl(haut, a, u, v, hinten);
    if (!t) return zurueckMit('Abzweigung: Ein gesetzter Punkt liegt nicht auf dem Körper');
    ueber.push({ ort: !frei && t.p.z < 0 ? spiegeln(t.p) : t.p, ecke: k.aus === null });
  }
  const nAlt = haut.n;
  const r = abzweigen(haut, loops, avJetzt, drueben ? 'spiegel' : an, naechsteId, naechsteKreuzung, ueber);
  if ('fehler' in r) return zurueckMit(`Abzweigung geht so nicht: ${r.fehler}`);
  const id = naechsteId++;
  haut = r.haut;
  loops = r.loops;
  naechsteKreuzung = r.naechsteKreuzung;
  netzGewachsen(nAlt, nurGewachsen(haut.n, nAlt), null);
  // wie nach jedem neuen Loop: Kreuzungen mit den anderen Linien, Ecken an Kanten, Griffe aus dem Verlauf, Nadeln weg
  kreuzungenSuchen(loops[loops.length - 1]);
  eckenAuto(loops);
  const neu = loops[loops.length - 1]!;
  // Punkte dazwischen nur, wo die Linie sonst weiter als eine Viertelkante von der Haut wegspränge (ein langer Weg über gewölbte
  // Haut lässt sich mit einem Kurvenstück nicht beschreiben: Am 14.11. verzog eine Abzweigung vom Flügel zur Mitte die ganze Form)
  const punkteVorher = neu.punkte.length;
  griffeAnlegen(neu, neu.ruhe, true, ABZWEIG_GENAU * MK);
  const dazu = neu.punkte.filter(istSichtbar).length - punkteVorher;
  nadelnWeg();
  anzeige.geometrieNeu();
  linienAufPfad(loops.find((x) => x.id === id));
  einsetzenNachholen();
  ruheNoetig();
  zurueck.push(vorher);
  G.auswahl = [{ l: id, i: -1 }];
  const mitPunkten = dazu > 0 ? ` Sie hat ${dazu === 1 ? 'einen Punkt' : `${dazu} Punkte`} dazwischen bekommen, damit sie der Haut folgt.` : '';
  G.meldung = drueben
    ? `Abzweigung zum Spiegelbild: Die Linie endet auf der Mitte und läuft dort rund in ihre andere Hälfte.${mitPunkten} · ⌘Z nimmt sie zurück`
    : `Abzweigung: Die Linie hängt an beiden Punkten und teilt sie (wer einen zieht, zieht beide Linien).${mitPunkten} · Doppelklick setzt Punkte auf sie · ⌘Z nimmt sie zurück`;
}

// ---------- Maus und Tasten ----------

/* in G: maus */

/**
 * Doppelklick selbst zählen: das Blatt wird beim Drücken neu gezeichnet, `dblclick` kommt dann nicht an. Gezählt wird die Zeit des
 * Ereignisses (`t`), nicht die der Bearbeitung: Der erste Klick startet einen Zug, dessen Löser bis einige Hundert Millisekunden
 * zerlegt, der zweite käme sonst zu spät an.
 */
export const letzterKlick = { t: 0, X: 0, Y: 0, was: '' };
export function doppelklick(a: Ansicht, was: string, X: number, Y: number, t: number): boolean {
  const jetzt = t;
  const ja = was === letzterKlick.was && jetzt - letzterKlick.t < 400 && Math.hypot(X - letzterKlick.X, Y - letzterKlick.Y) * anzeige.skala(a) < 6;
  Object.assign(letzterKlick, { t: ja ? 0 : jetzt, X, Y, was });
  return ja;
}
/** „Form halten“ an oder aus (nicht mitten in einem Zug; nur noch über den Test-Haken und `?ziehen=direkt`) */
export function haltenSchalten(an = !direktAn): void {
  if (zug) return;
  direktAn = an;
  direktBereit = null;
  G.meldung = direktAn
    ? grund
      ? 'Form halten: gilt in der Grundform (in der Pose rechnet es wie bisher).'
      : 'Form halten an: Ziehen bewegt die Haut direkt, nichts rundet neu.'
    : 'Form halten aus: Ziehen rundet die Haut wie bisher.';
  anzeige.allesZeigen();
}

// ---------- Wesen behalten, sichern, laden (10.11., vor G5) ----------

/**
 * Bis dahin lebte ein Wesen nur im offenen Fenster: Jedes Neuladen begann wieder mit der Kugel, auch das Neuladen von selbst, wenn
 * sich der Code ändert. Jetzt:
 * - **Behalten:** Der Stand liegt im Browser (IndexedDB) und ist nach dem Neuladen wieder da, solange die Startform der Adresse
 *   dieselbe ist (`form`, `dreiecke`). `?behalten=0`: nicht. Unter einer Fernsteuerung (die Proben mit Playwright,
 *   `navigator.webdriver`) wird nicht behalten: Viele Proben laden die Seite je Fall neu und erwarten die Startform (die Härte-Probe
 *   begann sonst ihren zweiten Fall mit der Form des ersten und blieb hängen). `?behalten=1` schaltet es auch dort ein.
 * - **Sichern / Laden:** unter einem Namen als Datei im Ordner `wesen/` des Arbeitsbaums (über den Dev-Server, `vite.config.ts`;
 *   ohne ihn als Datei über den Browser).
 * - **Neu:** wieder die Startform.
 * Laden und Neu sind Schritte wie andere: ⌘Z bringt das Wesen von vorher zurück. Gesichert wird der Stand, den auch Rückgängig
 * festhält (`ablage.ts`); die Liste der Schritte selbst gehört nicht dazu.
 */
export const BEHALTEN = ((w) => w === '1' || (w !== '0' && !navigator.webdriver))(new URLSearchParams(location.search).get('behalten'));
/**
 * Die Startform dieser Adresse: Ein behaltenes Wesen kommt nur zur selben zurück. Die Dichte des Startnetzes steht zur Auskunft
 * dabei, sie entscheidet nicht (seit Schritt 2: Ein Wesen mit feinerem Netz wird beim Übernehmen vergröbert; vorher wäre das
 * Wesen von vorhin mit dem neuen Standard der Dichte nicht zurückgekommen).
 */
export const START_FORM = new URLSearchParams(location.search).get('form') ?? 'kugel';
export const START_KENNUNG = `${START_FORM}|${DREIECKE}`;

/** Der Stand von jetzt als Wesen (die Lagen als Kopie, die Loops, wie sie sind: gleich packen) */
export function standJetzt(): WesenStand {
  return {
    mk: MK,
    haut: hautFlach(haut),
    loops,
    ids: [naechsteId, naechsteKreuzung],
    maul: G.maul ? { ...G.maul } : null,
    // `inRuhe`: In der Pose sind `haut` und `loops` dieses Stands ihre Ruhe (bis zum 14.11. die gedrehte Lage)
    pose: { kiefer: pose.kiefer, schaedel: pose.schaedel, delta: pose.delta, linien: pose.linien ?? null, inRuhe: true },
    grund: grund ? { haut: hautFlach(grund.haut), loops: grund.loops } : null,
    ruhe: ruheOffen ? { setzen: ruheOffen.setzen, nurInRuhe: ruheOffen.nurInRuhe, verdichten: ruheOffen.verdichten, ziele: ruheOffen.ziele } : null,
    sicht: { seite: { ...ausschnitt.seite }, front: { ...ausschnitt.front }, top: { ...ausschnitt.top } },
    zeit: new Date().toISOString(),
    quelle: `${location.pathname.split('/').pop() ?? ''}${location.search}`,
  };
}
/** der Stand eines ruhenden Objekts (sein Schnappschuss) für die Datei, wie `standJetzt` für das aktive */
export function standAus(s: Schnappschuss): WesenStand {
  return {
    mk: s.mk,
    haut: hautFlach({ ...s.haut, pos: s.pos }),
    loops: s.loops,
    ids: [s.ids[0], s.ids[1]],
    maul: s.maul ? { ...s.maul } : null,
    pose: { kiefer: s.pose.kiefer, schaedel: s.pose.schaedel, delta: s.pose.delta, linien: s.pose.linien ?? null, inRuhe: true },
    grund: s.grund ? { haut: hautFlach({ ...s.grund.haut, pos: s.grund.pos }), loops: s.grund.loops } : null,
    ruhe: s.ruhe ? { setzen: s.ruhe.setzen, nurInRuhe: s.ruhe.nurInRuhe, verdichten: s.ruhe.verdichten, ziele: s.ruhe.ziele } : null,
    sicht: null,
    zeit: new Date().toISOString(),
    quelle: `${location.pathname.split('/').pop() ?? ''}${location.search}`,
  };
}
/** die Startform dieser Sitzung (für „Neu“) */
export const START_STAND: WesenStand = { ...standJetzt(), loops: [] };

/** die offenen Ziele eines Stands, wenn sie zu seinen Loops passen (je Loop nichts oder 3 Zahlen je Probe) */
export function zieleAus(st: WesenStand): (Float64Array | null)[] | null {
  const z = st.ruhe?.ziele;
  if (!Array.isArray(z) || z.length !== st.loops.length) return null;
  const passt = z.every((d, i) => d === null || (d instanceof Float64Array && d.length === 3 * st.loops[i]!.proben.length && d.every(Number.isFinite)));
  return passt ? z.map((d) => (d ? Float64Array.from(d) : null)) : null;
}

/**
 * Ein Wesen ins Fenster übernehmen (geladen, behalten oder die Startform). Was gerade rechnet oder ansteht, endet; die Zerlegung
 * von vorher gilt nicht mehr. Kein Schritt für ⌘Z: Den legt an, wer es will (`zurueck.push(schnappschuss())` davor). Zurück: Text
 * für die Statuszeile, wenn das Netz dabei vergröbert wurde (sonst leer).
 */
export function standAnwenden(st: WesenStand): string {
  const h = hautAusFlach({ ...st.haut, pos: Float64Array.from(st.haut.pos) });
  const g = st.grund ? hautAusFlach({ ...st.grund.haut, pos: Float64Array.from(st.grund.haut.pos) }) : null;
  const s: Schnappschuss = {
    haut: h,
    loops: st.loops.map(kopieLoop),
    pos: Float64Array.from(h.pos),
    auswahl: [],
    ids: [st.ids[0], st.ids[1]],
    maul: st.maul
      ? {
          id: st.maul.id,
          ...(st.maul.echt === true ? { echt: true as const } : {}),
          ...(typeof st.maul.ersteUnten === 'boolean' ? { ersteUnten: st.maul.ersteUnten } : {}),
          ...(st.maul.zaehne ? { zaehne: { ...st.maul.zaehne, oben: { ...st.maul.zaehne.oben }, unten: { ...st.maul.zaehne.unten } } } : {}),
        }
      : null,
    pose: { kiefer: st.pose.kiefer, schaedel: st.pose.schaedel, delta: st.pose.delta ? Float64Array.from(st.pose.delta) : null, linien: st.pose.linien ?? null },
    grund: g && st.grund ? { haut: g, pos: Float64Array.from(g.pos), loops: st.grund.loops.map(kopieLoop) } : null,
    ruhe: st.ruhe ? { setzen: st.ruhe.setzen === true, nurInRuhe: st.ruhe.nurInRuhe === true, verdichten: st.ruhe.verdichten === true, ziele: zieleAus(st) } : null,
    mk: st.mk,
  };
  nachlauf = null;
  G.aufraeumen = null;
  G.aufgeraeumt = null;
  G.zwischenstand = null;
  G.gegriffen = null;
  verfeinerung = null;
  G.eingetroffen = null;
  nichtsZuVerfeinern = null;
  verfeinernPause = 0;
  nachLoesenOffen = null;
  vorlageBereit = null;
  vorlageStand = '';
  vorlageNetz = '';
  standFertig = '';
  hintergrundGescheitert = '';
  G.modus = 'frei';
  G.entwurf = null;
  G.spur = null;
  G.stift = null;
  wiederherstellen(s);
  maulBlick = 0;
  // Ein Maul als echte Form ist das Maul der Form (ein Stand von Etappe 1 vermerkt es noch nicht und kennt seine Pose nicht; einer
  // von Etappe 2 vermerkt noch nicht, dass es echt ist)
  {
    const lippe = (grund ? grund.loops : loops).find((l) => istMaulLinie(l) && l.maulLinie === MAUL_HAAR);
    if (lippe && !G.maul && !grund) {
      G.maul = { id: lippe.id, echt: true };
      if (!pose.delta) pose = { kiefer: FRESSEN_ANFANG.unten, schaedel: FRESSEN_ANFANG.oben, delta: null };
    } else if (lippe && G.maul?.id === lippe.id) G.maul = { ...G.maul, echt: true };
    maulSeitenMerken();
  }
  // Ein Stand, der vor dem 14.11. in der Pose gesichert wurde, enthält ihre gedrehte Lage: einmal in ihre Ruhe zurückgedreht, die
  // Linien dort neu abgelesen
  if (grund && st.pose.inRuhe !== true) {
    const k = poseKnochen();
    if (k) {
      haut.pos.set(knochenDrehen(haut.pos, k.theta, k.G, true));
      const genau = !altePose();
      for (const l of loops) {
        festlegen(haut, l);
        if (hatGriffe(l)) griffeAnlegen(l, l.ruhe, genau);
      }
    }
  }
  // ein Loop, der in diesem Stand nur auf der Haut liegt, wird jetzt eingesetzt (`einsetzenNachholen`)
  if (einsetzenNachholen()) {
    G.meldung = 'Ein Loop lag nur auf der Haut und ist jetzt ins Netz eingesetzt.';
    anzeige.allesZeigen();
  }
  // eine Form mit feinerem Netz, als diese Adresse rechnet, bekommt das kleine Rechennetz
  const grob = netzVergroebern();
  if (grob) anzeige.allesZeigen();
  const netzText = grob ? ` · Rechennetz ${grob.vorher.toLocaleString('de-DE')} → ${grob.nachher.toLocaleString('de-DE')} Punkte` : '';
  if (st.sicht) {
    for (const a of ['seite', 'front', 'top'] as const) {
      const v = st.sicht[a];
      if (v && Number.isFinite(v.cx) && Number.isFinite(v.cy) && v.zoom > 0) Object.assign(ausschnitt[a], { cx: v.cx, cy: v.cy, zoom: v.zoom });
      anzeige.ausschnittGeaendert(a);
    }
  }
  return netzText;
}

// ----- Behalten im Browser -----

/** eine Anfrage an den Speicher des Browsers (ein Fach „stand“, darin `FACH_ZULETZT`, „davor“ und `FACH_MARKE`) */
export function speicher<T>(art: IDBTransactionMode, tun: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise<T>((ok, fehler) => {
    const auf = indexedDB.open('early-earle-kurven', 1);
    auf.onupgradeneeded = () => auf.result.createObjectStore('stand');
    auf.onerror = () => fehler(auf.error ?? new Error('Speicher des Browsers nicht erreichbar'));
    auf.onsuccess = () => {
      const db = auf.result;
      const t = db.transaction('stand', art);
      const q = tun(t.objectStore('stand'));
      t.oncomplete = () => {
        db.close();
        ok(q.result);
      };
      t.onerror = t.onabort = () => {
        db.close();
        fehler(t.error ?? new Error('Speicher des Browsers nicht erreichbar'));
      };
    };
  });
}
export type Behalten = { start: string; daten: ArrayBuffer; name?: string };
/**
 * Das Fach für das Wesen von vorhin. Mit dem kleinen Rechennetz (Schritt 2) ein eigenes: „zuletzt“ behält, was bis zum Wechsel mit
 * dem dichten Netz behalten war, und `?netz=dicht` findet es dort unverändert. Beim ersten Start mit dem kleinen Netz (die Marke
 * `FACH_MARKE` fehlt noch) kommt einmal das Wesen aus „zuletzt“, vergröbert (`standAnwenden`), und wird von da an im eigenen Fach
 * behalten.
 */
export const FACH_ZULETZT = NETZ_KLEIN ? 'zuletzt-klein' : 'zuletzt';
export const FACH_MARKE = 'kleines-netz-seit';
/** das Wesen, das „Laden“ oder „Neu“ zuletzt ersetzt hat (Fach „davor“) */
export type Davor = { daten: ArrayBuffer; zeit: string; punkte: number; loops: number; name: string };
export let behaltenUhr: ReturnType<typeof setTimeout> | null = null;
/** der Stand, der zuletzt in den Speicher ging */
export let behaltenStand = '';
/** erst wenn beim Start nachgesehen ist, ob ein Wesen von vorhin da ist (sonst überschriebe die Startform es) */
export let behaltenBereit = !BEHALTEN;
export let behaltenAus = false;
export let letztesBehalten = 0;
export let behaltenLaeuft: Promise<unknown> = Promise.resolve();
/** der Name, unter dem dieses Wesen zuletzt gesichert oder geladen wurde (er bleibt mit dem Wesen behalten) */
/* in G: ablageName */
export const nameGueltig = (name: string): boolean => /^[\p{L}\p{N}][\p{L}\p{N} _.-]{0,59}$/u.test(name);
export const behaltenSchluessel = (): string => `${standZahl()}:${pose.kiefer}:${pose.schaedel}:${JSON.stringify(ausschnitt)}:${G.ablageName}`;

/**
 * Den Stand im Browser behalten: 0,8 s nach der ersten Änderung seit dem letzten Mal (nicht nach der letzten: Wer zügig arbeitet,
 * ändert öfter als alle 0,8 s etwas, und es würde lange nichts behalten).
 */
export function behaltenPlanen(): void {
  if (!BEHALTEN || !behaltenBereit || behaltenAus || behaltenUhr) return;
  behaltenUhr = setTimeout(behaltenJetzt, 800);
}
export function behaltenJetzt(): void {
  behaltenUhr = null;
  if (!BEHALTEN || !behaltenBereit || behaltenAus) return;
  // nicht mitten im Zug oder solange die Haut nachläuft: Der Stand danach kommt ohnehin
  if (zug || nachlauf || G.gegriffen) {
    behaltenPlanen();
    return;
  }
  // die leere Startform ist kein Wesen: Was behalten ist, bleibt (bis „Neu“ es wegnimmt)
  if (loops.length === 0 && !grund) return;
  const schluessel = behaltenSchluessel();
  if (schluessel === behaltenStand) return;
  behaltenStand = schluessel;
  const t0 = performance.now();
  const st = standJetzt();
  // ein Stand, der nicht in Ordnung ist (z. B. eine Haut mit nicht endlichen Lagen), ersetzt nicht den letzten guten
  if (pruefen(st)) return;
  const datei = new Blob(packen(st) as BlobPart[]);
  letztesBehalten = Math.round((performance.now() - t0) * 10) / 10;
  behaltenLaeuft = datei
    .arrayBuffer()
    .then((daten) => speicher('readwrite', (s) => s.put({ start: START_KENNUNG, daten, name: G.ablageName } satisfies Behalten, FACH_ZULETZT)))
    .catch((e: unknown) => {
      // z. B. privates Fenster ohne Speicher: einmal sagen, dann ohne Behalten weiter
      behaltenAus = true;
      console.warn('Behalten im Browser geht nicht:', e);
    });
}
/**
 * Das Wesen, das „Laden“ oder „Neu“ gleich ersetzt, bleibt im Browser liegen (ein Fach „davor“). ⌘Z bringt es zurück, solange das
 * Fenster offen ist; nach einem Neuladen (dann ist die Liste der Schritte leer) steht es in der Liste von „Laden“ ganz oben. Ohne das
 * ginge ein Wesen, das nie unter einem Namen gesichert wurde, mit einem Klick auf „Laden“ und dem nächsten Neuladen verloren.
 */
export let davorLaeuft: Promise<unknown> = Promise.resolve();
export function davorMerken(): void {
  if (!BEHALTEN || behaltenAus || (loops.length === 0 && !grund)) return;
  const st = standJetzt();
  if (pruefen(st)) return;
  const eintrag = { zeit: st.zeit, punkte: st.haut.n, loops: st.loops.length, name: G.ablageName };
  // der Blob hält die Bytes von jetzt fest (das Fenster ändert die Felder danach)
  davorLaeuft = new Blob(packen(st) as BlobPart[])
    .arrayBuffer()
    .then((daten) => speicher('readwrite', (s) => s.put({ ...eintrag, daten } satisfies Davor, 'davor')))
    .catch(() => undefined);
}
/** Beim Start: Ist ein Wesen von vorhin da (und die Startform dieselbe), kommt es zurück */
export function behaltenesHolen(): void {
  /** das Wesen kommt aus dem Fach des dichten Netzes: Es wird danach im eigenen Fach behalten */
  let ausZuletzt = false;
  speicher<Behalten | undefined>('readonly', (s) => s.get(FACH_ZULETZT) as IDBRequest<Behalten | undefined>)
    .then(async (b) => {
      if (b || !NETZ_KLEIN) return b;
      // das eigene Fach ist leer: beim ersten Start mit dem kleinen Netz einmal das Wesen aus „zuletzt“ (danach nicht mehr, sonst käme
      // es nach „Neu“ beim nächsten Neuladen wieder)
      if (await speicher<unknown>('readonly', (s) => s.get(FACH_MARKE) as IDBRequest<unknown>)) return undefined;
      await speicher('readwrite', (s) => s.put(new Date().toISOString(), FACH_MARKE));
      ausZuletzt = true;
      return speicher<Behalten | undefined>('readonly', (s) => s.get('zuletzt') as IDBRequest<Behalten | undefined>);
    })
    .then((b) => {
      if (!b || b.start.split('|')[0] !== START_FORM) return;
      // inzwischen hat schon jemand angefangen: dann nicht
      if (loops.length > 0 || zurueck.length > 0 || zug) return;
      const st = entpacken(b.daten);
      if (st.loops.length === 0 && !st.grund) return;
      const netzText = standAnwenden(st);
      G.ablageName = typeof b.name === 'string' && nameGueltig(b.name) ? b.name : '';
      // nach dem Vergröbern ist der Stand ein anderer als der behaltene, und aus dem Fach des dichten Netzes kommt er ins eigene:
      // Er wird neu behalten
      behaltenStand = netzText || ausZuletzt ? '' : behaltenSchluessel();
      G.meldung = `${G.ablageName ? `„${G.ablageName}“` : 'Wesen von vorhin'} wieder da (${auskunft(st)})${netzText}`;
      anzeige.statusZeigen();
    })
    .catch((e: unknown) => {
      // nicht lesbar: das Fenster bleibt bei der Startform, der Speicher wird geleert (sonst scheiterte jedes Neuladen daran)
      console.warn('Das Wesen von vorhin ließ sich nicht lesen:', e);
      void speicher('readwrite', (s) => s.delete(FACH_ZULETZT)).catch(() => undefined);
    })
    .finally(() => {
      behaltenBereit = true;
      behaltenPlanen();
    });
}

// ----- Sichern und Laden unter einem Namen -----

export const ABLAGE = '/__wesen/';
export type AblageEintrag = { name: string; bytes: number; zeit: string; punkte: number; loops: number };
/** null: Die Ablage des Dev-Servers ist nicht erreichbar */
export async function ablageListe(): Promise<AblageEintrag[] | null> {
  try {
    const r = await fetch(ABLAGE, { headers: { accept: 'application/json' } });
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    return (await r.json()) as AblageEintrag[];
  } catch {
    return null;
  }
}

/** Ein Wesen übernehmen, als Schritt (⌘Z bringt das jetzige zurück; über das Neuladen hinweg liegt es im Fach „davor“) */
export function wesenUebernehmen(st: WesenStand, name: string): string {
  davorMerken();
  zurueck.push(schnappschuss());
  const netzText = standAnwenden(st);
  G.ablageName = name;
  return netzText;
}
/** eine Datei der Ablage holen und entpacken, ohne sie zu übernehmen (Ozzy: eine Szene mit mehreren Objekten); sonst der Grund als Text */
export async function wesenHolen(name: string): Promise<WesenStand | string> {
  try {
    const r = await fetch(ABLAGE + encodeURIComponent(name));
    if (!r.ok) return `Laden fehlgeschlagen: „${name}“ (${r.status})`;
    return entpacken(await r.arrayBuffer());
  } catch (e) {
    return `Laden fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`;
  }
}
export async function wesenLaden(name: string): Promise<string> {
  const r = await fetch(ABLAGE + encodeURIComponent(name));
  if (!r.ok) return `Laden fehlgeschlagen: „${name}“ (${r.status})`;
  try {
    const st = entpacken(await r.arrayBuffer());
    const netzText = wesenUebernehmen(st, name);
    return `geladen: „${name}“ (${auskunft(st)})${netzText} · ⌘Z bringt das Wesen von vorher zurück`;
  } catch (e) {
    return `Laden fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`;
  }
}
/** Neu: wieder die Startform dieser Sitzung, als Schritt; was im Browser behalten ist, geht weg */
export function wesenNeu(): string {
  wesenUebernehmen(START_STAND, '');
  behaltenStand = behaltenSchluessel();
  if (BEHALTEN) void speicher('readwrite', (s) => s.delete(FACH_ZULETZT)).catch(() => undefined);
  return 'Neues Wesen · ⌘Z bringt das Wesen von vorher zurück';
}

/** Ein Anker einer gezeichneten Silhouette in der Seite (x, y nach oben): Lage und Bézier-Griffe als Vektoren vom Punkt aus */
export type SilhouettenAnker = { x: number; y: number; ein: [number, number]; aus: [number, number] };
/** so dicht wird die Silhouette für das Aufblasen abgetastet (Einheiten) */
export const SILHOUETTE_SCHRITT = 1;

/**
 * Neu aus einer Silhouette (Ozzy, Phase 3): Die Form wird aus der Silhouette rund aufgeblasen (`rundAusSeite`, so dicht wie die
 * Startform dieser Adresse), und die Silhouette selbst wird die Linie der Mitte: Florians Anker sind ihre Punkte, seine Griffe ihre
 * Griffe; wo die Linie an einem Anker die Richtung wechselt, ist der Punkt eine Ecke. Ein Schritt für ⌘Z, wie Laden. Zurück: Text
 * für die Statuszeile.
 */
export function neuAusUmriss(anker: readonly SilhouettenAnker[]): string {
  const n = anker.length;
  if (n < 2) return 'Neu aus der Silhouette: zu wenige Punkte';
  const A = (i: number): SilhouettenAnker => anker[((i % n) + n) % n]!;
  const v3 = (x: number, y: number): V3 => ({ x, y, z: 0 });
  // Richtung, in der die Linie einen Anker erreicht und verlässt (ein Griff der Länge 0 zeigt auf den nächsten Kontrollpunkt)
  const richtung = (...kandidaten: [number, number][]): [number, number] => {
    for (const [x, y] of kandidaten) {
      const L = Math.hypot(x, y);
      if (L > 1e-6) return [x / L, y / L];
    }
    return [0, 0];
  };
  const ecke = anker.map((p, i) => {
    const v = A(i - 1);
    const w = A(i + 1);
    const e = richtung([-p.ein[0], -p.ein[1]], [p.x - v.x - v.aus[0], p.y - v.y - v.aus[1]], [p.x - v.x, p.y - v.y]);
    const a = richtung(p.aus, [w.x + w.ein[0] - p.x, w.y + w.ein[1] - p.y], [w.x - p.x, w.y - p.y]);
    return e[0] * a[0] + e[1] * a[1] < Math.cos((3 * Math.PI) / 180);
  });
  // die Silhouette dicht abgetastet: Die Stücke des Umrisses (durch alle Punkte) gehen dann genau ihren Weg
  const umriss: UmrissPunkt[] = [];
  for (let i = 0; i < n; i++) {
    const p = A(i);
    const q = A(i + 1);
    const grob = Math.hypot(p.aus[0], p.aus[1]) + Math.hypot(q.x + q.ein[0] - p.x - p.aus[0], q.y + q.ein[1] - p.y - p.aus[1]) + Math.hypot(q.ein[0], q.ein[1]);
    const m = Math.max(2, Math.ceil(grob / SILHOUETTE_SCHRITT));
    for (let j = 0; j < m; j++) {
      const c = stueckPunkt(v3(p.x, p.y), v3(p.aus[0], p.aus[1]), v3(q.ein[0], q.ein[1]), v3(q.x, q.y), j / m);
      umriss.push(j === 0 && ecke[i] ? { x: c.x, y: c.y, ecke: true } : { x: c.x, y: c.y });
    }
  }
  const flaeche = polygonFlaeche(umrissAbtasten(umriss, 4).punkte);
  const flaecheStart = polygonFlaeche(umrissAbtasten(startUmriss, 4).punkte);
  if (!(flaeche > 1)) return 'Neu aus der Silhouette: keine Fläche';
  // so dicht wie die Startform: gleiche Rasterweite, also etwa dieselbe mittlere Kante
  const rund = rundAusSeite(umriss, { dreiecke: Math.max(200, Math.round((DREIECKE * flaeche) / flaecheStart)) });
  const h = hautAus(rund.positionen, rund.indizes);
  const netzText = wesenUebernehmen(
    {
      mk: mittlereKante(h),
      haut: hautFlach(h),
      loops: [],
      ids: [1, 1],
      maul: null,
      pose: { kiefer: 0, schaedel: 0, delta: null, linien: null, inRuhe: true },
      grund: null,
      ruhe: null,
      sicht: null,
      zeit: new Date().toISOString(),
      quelle: 'Silhouette',
    },
    '',
  );
  // die Linie der Mitte: der Schnitt der Haut mit der Mittelebene (wie ein senkrechter Schnitt durch die Front)
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const c of umriss) {
    yMin = Math.min(yMin, c.y);
    yMax = Math.max(yMax, c.y);
  }
  const l = loopAusSchnitt(haut, 'front', [0, -(yMax + 2 * MK)], [0, -(yMin - 2 * MK)], naechsteId, 1);
  if (!l || l.art !== 'mitte') return `Neu aus der Silhouette: Die Linie der Mitte ließ sich nicht schneiden${netzText}`;
  naechsteId++;
  loops.push(l);
  einsetzenLetzten(false);
  const mitte = loops[loops.length - 1]!;
  // je Anker die Stelle auf der Linie, die ihm am nächsten liegt
  const R = mitte.ruhe;
  const k = mitte.proben.length;
  const stelle = (x: number, y: number): number => {
    let best = Infinity;
    let bs = 0;
    for (let j = 0; j < k; j++) {
      const j2 = (j + 1) % k;
      const ax = R[3 * j]!;
      const ay = R[3 * j + 1]!;
      const dx = R[3 * j2]! - ax;
      const dy = R[3 * j2 + 1]! - ay;
      const L2 = dx * dx + dy * dy;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)) : 0;
      const d = Math.hypot(ax + t * dx - x, ay + t * dy - y);
      if (d < best) {
        best = d;
        const s1 = j2 === 0 ? mitte.laenge : mitte.s[j2]!;
        bs = mitte.s[j]! + t * (s1 - mitte.s[j]!);
      }
    }
    return bs % mitte.laenge;
  };
  const s = anker.map((p) => stelle(p.x, p.y));
  // läuft die Linie andersherum als die Zeichnung, tauschen die Griffe ihre Rollen
  let vor = 0;
  for (let i = 0; i < n; i++) {
    const d = (((s[(i + 1) % n]! - s[i]!) % mitte.laenge) + mitte.laenge) % mitte.laenge;
    if (d < mitte.laenge / 2) vor++;
  }
  const gleich = 2 * vor >= n;
  mitte.punkte = anker.map((p, i): LoopPunkt => {
    const ein = gleich ? p.ein : p.aus;
    const aus = gleich ? p.aus : p.ein;
    return { s: s[i]!, ref: v3(p.x, p.y), cur: v3(p.x, p.y), ein: v3(ein[0], ein[1]), aus: v3(aus[0], aus[1]), ...(ecke[i] ? { ecke: true } : {}) };
  });
  mitte.punkte.sort((a, b) => a.s - b.s);
  mitte.pfad = true;
  // die Linie genau auf ihren Pfad, die Haut folgt
  linienAufPfad(mitte);
  einsetzenNachholen();
  // Die Form ist, was die Rechnung aus der Linie macht (Florian, 16.11.: kein Unterschied zwischen seinen Kurven und dem Modell wie in
  // Sitzung 4). Ein neuer Loop allein setzt die Haut nicht (`ruheNoetig`: erst wenn sich Linien kreuzen); dann setzte sie der erste
  // Griff, sichtbar als Sprung (gemessen am Fisch bis 17,5). Hier rechnet das Werk sie gleich über die ganze Haut neu, wie nach „Kante
  // an/aus“ (`hautNeuRechnen`, im Hintergrund).
  hautNeuRechnen();
  G.auswahl = [];
  G.meldung = '';
  return `Neue Form aus der Silhouette: ${haut.n.toLocaleString('de-DE')} Punkte, ${n} Punkte auf der Linie${netzText}`;
}

export function bildRechnen(): void {
  if (G.fehlerProbe) {
    G.fehlerProbe = false;
    throw new Error('Probe');
  }
  const bildT0 = performance.now();
  bildGerechnetMs = -1;
  // „Maul formen“ läuft: ein Bild der Animation
  maulSchritt();
  // ein fertig verfeinertes Netz aus dem Hintergrund wird an Stelle der Löserrunde dieses Bilds eingewechselt
  const e = G.eingetroffen;
  G.eingetroffen = null;
  // (nicht, solange eine Linie an der Mittelebene anliegt oder der Zug die Haut gerade umgeklappt hat: `Zug.begrenzt`,
  // `Zug.umgAnfang`; das Netz verfällt dann)
  if (e && zug && e.netz === haut && !zug.begrenzt && umgeschlageneZahl() <= zug.umgAnfang) einwechseln(e.fertig, e.daten);
  else zugRechnen();
  // nach dem Loslassen: der Nachlauf; danach, was aus dem Hintergrund gekommen ist (nicht, solange eine Maustaste einen Zug hält)
  nachlaufRechnen();
  if (G.zwischenstand && !zug && !nachlauf) zwischenAnwenden();
  if (G.aufgeraeumt && !zug && !nachlauf) aufgeraeumtAnwenden();
  // ein wartender Griff beginnt, sobald die gesetzte Haut da ist (oder nichts mehr für diesen Stand gesetzt wird)
  if (G.gegriffen && !zug) {
    if (!griffWartet() || performance.now() - G.gegriffen.seit > GRIFF_WARTEN_MS) griffNachholen();
    else if (!G.aufraeumen && vorrechnenUhr === null) vorrechnenPlanen();
  }
  anzeige.glattInRuhe();
  if (G.neuZeichnen) {
    G.neuZeichnen = false;
    anzeige.rendern();
  }
  // was dieses Bild außer den Runden des Zugs gekostet hat (nur Bilder, in denen der Zug gerechnet hat), gleitend gemittelt
  if (bildGerechnetMs >= 0) bildRestMs += 0.2 * (Math.min(40, bildRestGemeldet ?? performance.now() - bildT0 - bildGerechnetMs) - bildRestMs);
}
