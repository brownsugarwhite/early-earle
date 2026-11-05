// Form zuerst (04.11.2026): dichte Form aus Florians Zeichnung, ohne vorab festgelegte Topologie.
export { type UmrissPunkt, linienStuecke, polygonFlaeche, punktAufStueck, umrissAbtasten, umrissStuecke } from './umriss';
export { type Naechster, Umrissfeld } from './abstand';
export { Kugeln, kugelRadien } from './kugeln';
export { BREITE_MAX, type Kante3D, type KantenLinie, type KantenPunkt, kantenAnwenden, linieAbtasten } from './kanten';
export { type DichtesNetz, type RundOptionen, rundAusSeite } from './rund';
export { MAUL_WINKEL_MAX, type MaulLinie, type MaulPunkt, type MaulSchnitt, maulOeffnen, maulPunkt, maulSchneiden } from './maul';
export { type Netzteil, type Spielnetz, backen, backenBereit, maulBacken } from './backen';
export { type Pose, type PoseZiel, type PoseZug, RUHE, ZUG_MAX, posePunkt, poseWinkel, posieren } from './pose';
export { dichtNachLage, umgeklappt } from './netzpruefung';
export { type AnsichtName, type GleichesNetz, type GleichOptionen, type Zeichnung, type Zeichnungen, formAusAnsichten, formAusTeilen } from './gleich';
export { type Einbuchtung, type Teilung, anEinbuchtungTeilen, anNahtTeilen, einbuchtungen } from './teile';
export { ganzerUmriss, PRUEFFAELLE, PRUEFFAELLE_HALB, type Prueffall, type PrueffallHalb } from './prueffaelle';
export { umrisseDesKoerpers } from './silhouette';
export {
  type Kontur,
  type RaumLinie,
  type RaumPunkt,
  kreuzungen,
  punktSetzen,
  raumAbtasten,
  raumKanten,
  raumStuecke,
  tiefeAusKontur,
  umrissLinie,
  verbinden,
} from './raumlinien';
export { type LinienArt, type Nachfuehrung, halbeLinie, linieNachfuehren, linienAbstand, linienStueckeVon } from './folgen';
export {
  type Ansichtsbreite,
  type BreitenPunkt,
  type Tiefenstreckung,
  profilAusBreite,
  profilBreite,
  profilUmriss,
  streckungBei,
  tiefeAnpassen,
  tiefeAnwenden,
} from './ansichten';
