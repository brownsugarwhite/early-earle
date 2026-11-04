// Form zuerst (04.11.2026): dichte Form aus Florians Zeichnung, ohne vorab festgelegte Topologie.
export { type UmrissPunkt, linienStuecke, polygonFlaeche, punktAufStueck, umrissAbtasten, umrissStuecke } from './umriss';
export { type Naechster, Umrissfeld } from './abstand';
export { Kugeln, kugelRadien } from './kugeln';
export { BREITE_MAX, type Kante3D, type KantenLinie, type KantenPunkt, kantenAnwenden, linieAbtasten } from './kanten';
export { type DichtesNetz, type RundOptionen, rundAusSeite } from './rund';
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
