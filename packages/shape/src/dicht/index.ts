// Form zuerst (04.11.2026): dichte Form aus Florians Zeichnung, ohne vorab festgelegte Topologie.
export { type UmrissPunkt, linienStuecke, polygonFlaeche, punktAufStueck, umrissAbtasten, umrissStuecke } from './umriss';
export { type Naechster, Umrissfeld } from './abstand';
export { Kugeln, kugelRadien } from './kugeln';
export { BREITE_MAX, type Kante3D, type KantenLinie, type KantenPunkt, kantenAnwenden, linieAbtasten } from './kanten';
export { type DichtesNetz, type RundOptionen, type RundTeil, type RundeTeile, rundAusSeite, rundAusTeilen } from './rund';
export { MAUL_WINKEL_MAX, type MaulLinie, type MaulPunkt, type MaulSchnitt, maulOeffnen, maulPunkt, maulSchneiden } from './maul';
export { type MaulAmLoop, maulAmLoop, maulGeformtAmLoop, mundwinkelProbe } from './maulLoop';
export { type Knochen, ergaenzen, innenPosieren, knochenDrehen, knochenWinkel } from './poseLoop';
export { type Netzteil, type Spielnetz, backen, backenBereit, maulBacken } from './backen';
export { type Pose, type PoseZiel, type PoseZug, RUHE, ZUG_MAX, posePunkt, poseWinkel, posieren } from './pose';
export { dichtNachLage, umgeklappt } from './netzpruefung';
export { type HautAuftrag, type HautGewichte, type HautOptionen, type HautVorlage, halbMoeglich, vorlageAusSystemen } from './ausKurven';
export { type Einbettung, einbetten, einbettungAuswerten } from './einbettung';
export { type MaulFormenOptionen, type MaulGeformt, type MaulStand, maulFormen, maulFormenSchritte } from './maulFormen';
export { type KnickFuehrung, type KnickReihe, hatKnick, knickFuehrungen, knickQuer, knickRahmen, knickReihe, knickSoll, knickZiele } from './kantenWinkel';
export {
  type Fuehrt,
  MAUL_LINIE_WINKEL,
  istMaulLinie,
  maulLinieAusZeichnung,
  obereLippe,
  zwillinge,
  zwillingeAngleichen,
  zwillingeFestlegen,
  zwillingeSetzen,
  zwillingsFehler,
  zwillingsWinkel,
} from './maulLinie';
export { type FlacheZeilen, type ZerlegungsDaten, flacheZeilen, systemAusDaten, zeilenAusFlach, zerlegungsDaten } from '../loeser/zerlegung';
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
  type Anheftung,
  type Haut,
  type Kurve,
  type KurvenPunkt,
  type Stueck3,
  type V3,
  HautLoeser,
  aufStueck,
  einfluss,
  einflussBereich,
  hautAus,
  hautSeiten,
  hautNormalen,
  kurveAbtasten,
  kurveAnheften,
  kurveGanz,
  kurvenGriffe,
  kurvenStuecke,
  ringAusSchnitt,
  stelleAufKurve,
  type Bindungen,
  HautZiele,
} from './kurven';
export {
  type Ansicht,
  type BindungsPlan,
  type GriffVersatz,
  type HautArt,
  type Loop,
  type LoopPunkt,
  type Probe,
  type ZeichnungsStueck,
  LoopZug,
  loopStruktur,
  direktLoeserFuer,
  hartePunkte,
  bereichUm,
  bindungenAus,
  blickTiefe,
  blickUV,
  endeAufMitte,
  eckenAuto,
  festlegen,
  formAusZeichnung,
  griffeAnlegen,
  griffeAusZeichnung,
  griffeAusrichten,
  griffeBei,
  griffeErgaenzen,
  griffeNach,
  griffVersatzImZug,
  griffeSetzen,
  griffeUebernehmen,
  griffZiehen,
  hatGriffe,
  hatPfad,
  hautLagen,
  kanteAn,
  haerteBei,
  kanteBei,
  kantenKnicken,
  istEcke,
  istSichtbar,
  istEckeVonSelbst,
  griffeAbbilden,
  griffeProportional,
  kantenGewichte,
  knickWinkel,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  linieKreuztSich,
  pfadAbweichung,
  type PfadKante,
  pfadKanten,
  pfadLagen,
  pfadParameter,
  pfadVersatz,
  probenLage,
  punktEinfuegen,
  punkteLoeschen,
  ringEnde,
  schnittLinien,
  spiegelProbe,
  stelleBei,
  strahl,
  eckenTiefe,
  verschiebungLaengs,
  zieleAus,
} from './loops';
export { type DirektLoeser } from './direktZug';
export { type Anker, abzweigen, einsetzenGrund, loopEinsetzen } from './einsetzen';
export { type MitteSchnitt, hinterDerMitte, mitteFestmachen, mitteKreuzungen } from './mitteSchnitt';
export { bernstein, stueckAnpassen, stueckNaechstes, stueckPunkt, stueckTeilen } from './pfad';
export { type Verdichtet, nadelnZusammenlegen, verdichten } from './verdichten';
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
