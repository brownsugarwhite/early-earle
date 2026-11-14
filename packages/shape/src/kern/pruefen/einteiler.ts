// Prüfplan P1, Tag 2–3 zweiter Anlauf (03.11.2026): Prüfkörper des Beweises „ein Teil aus drei Schleifen“ — die Grundkörper der
// Extremreihe (Kugel, Ei, Kegel, Würfel, Vase) und drei saubere Einteiler, an denen die Schleifen den Körper ganz bestimmen:
// ein scharfer Würfel (drei Quadrate mit Ecken-Knoten, ohne Stiftrundung), eine runde Vase (Rotationskörper: Front = Seite,
// Top = Kreis am Bauch, Ecken am Rand) und ein stehender Zylinder (Seite und Front Rechteck mit Ecken, Top Kreis). DOM-frei.
import { type Dokument, neuesDokument } from '../../dokument';
import { type Knoten, type Profil, achsenRegeln } from '../../profil';
import { extremKoerper } from './extremreihe';

/** Knoten mit Griffen (`ein`, `aus` relativ zum Punkt) */
const kn = (x: number, y: number, ex: number, ey: number, ax: number, ay: number, art: Knoten['art'] = 'glatt'): Knoten => ({ p: { x, y }, ein: { x: ex, y: ey }, aus: { x: ax, y: ay }, art });
/** Bézier-Kreisfaktor */
const KR = 0.5523;

/** Geschlossenes Rechteck (Seite) mit Ecken-Knoten, im Uhrzeigersinn ab links oben. */
function rechteck(x0: number, y0: number, x1: number, y1: number): Profil {
  return { art: 'geschlossen', knoten: [kn(x0, y1, 0, 0, 0, 0, 'ecke'), kn(x1, y1, 0, 0, 0, 0, 'ecke'), kn(x1, y0, 0, 0, 0, 0, 'ecke'), kn(x0, y0, 0, 0, 0, 0, 'ecke')] };
}

/** Halbes Rechteck der Front (Achse senkrecht): oben auf der Achse → Ecke → Ecke → unten auf der Achse. */
function halbRechteckSenkrecht(r: number, y0: number, y1: number): Profil {
  return achsenRegeln({ art: 'halb', achse: 'senkrecht', knoten: [kn(0, y1, 0, 0, 0, 0), kn(r, y1, 0, 0, 0, 0, 'ecke'), kn(r, y0, 0, 0, 0, 0, 'ecke'), kn(0, y0, 0, 0, 0, 0)] });
}

/** Halbes Rechteck des Tops (Achse waagerecht): vorn auf der Achse → Ecke → Ecke → hinten auf der Achse. */
function halbRechteckWaagerecht(x0: number, x1: number, r: number): Profil {
  return achsenRegeln({ art: 'halb', achse: 'waagerecht', knoten: [kn(x0, 0, 0, 0, 0, 0), kn(x0, r, 0, 0, 0, 0, 'ecke'), kn(x1, r, 0, 0, 0, 0, 'ecke'), kn(x1, 0, 0, 0, 0, 0)] });
}

/** Halbkreis des Tops (Achse waagerecht) um (cx, 0) mit Radius r. */
function halbkreisWaagerecht(cx: number, r: number): Profil {
  return achsenRegeln({ art: 'halb', achse: 'waagerecht', knoten: [kn(cx - r, 0, 0, 0, 0, KR * r), kn(cx, r, -KR * r, 0, KR * r, 0), kn(cx + r, 0, 0, KR * r, 0, 0)] });
}

/** Scharfer Würfel: drei Quadrate (Kantenlänge 0,4) mit Ecken-Knoten, ohne Rundung. */
export function wuerfelScharfDokument(): Dokument {
  const d = neuesDokument('wuerfel-scharf');
  return { ...d, profile: { seite: rechteck(-0.2, 0, 0.2, 0.4), front: halbRechteckSenkrecht(0.2, 0, 0.4), top: halbRechteckWaagerecht(-0.2, 0.2, 0.2) } };
}

/** Stehender Zylinder (Radius 0,15, Höhe 0,8): Seite und Front Rechteck mit Ecken, Top Kreis. */
export function zylinderDokument(): Dokument {
  const d = neuesDokument('zylinder');
  const r = 0.15;
  const h = 0.8;
  return { ...d, profile: { seite: rechteck(-r, 0, r, h), front: halbRechteckSenkrecht(r, 0, h), top: halbkreisWaagerecht(0, r) } };
}

/**
 * Runde Vase (Rotationskörper um y): Rand mit Ecken, Hals, Bauch, Fuß — rechte Hälfte als Knoten mit Griffen, Seite gespiegelt,
 * Front = dieselbe Hälfte, Top = Kreis des Bauchs.
 */
export function vaseRundDokument(): Dokument {
  const d = neuesDokument('vase-rund');
  // rechte Hälfte von oben nach unten (x = Radius): Rand (Ecke), Hals, Bauch, Fuß
  const rechts: Knoten[] = [kn(0.13, 0.95, 0, 0, 0, -0.04, 'ecke'), kn(0.1, 0.62, 0, 0.1, 0, -0.07), kn(0.27, 0.3, 0, 0.12, 0, -0.1), kn(0.12, 0.04, 0.08, 0.03, -0.05, -0.02)];
  const spiegel = (k: Knoten): Knoten => ({ p: { x: -k.p.x, y: k.p.y }, ein: { x: -k.aus.x, y: k.aus.y }, aus: { x: -k.ein.x, y: k.ein.y }, art: k.art });
  const seite: Profil = { art: 'geschlossen', knoten: [kn(-0.13, 0.95, 0, -0.04, 0, 0, 'ecke'), ...rechts, kn(0, 0, 0.06, 0, -0.06, 0), ...rechts.slice(1).map(spiegel).reverse()] };
  const front: Profil = achsenRegeln({ art: 'halb', achse: 'senkrecht', knoten: [kn(0, 0.95, 0, 0, 0.05, 0), ...rechts, kn(0, 0, 0.06, 0, 0, 0)] });
  return { ...d, profile: { seite, front, top: halbkreisWaagerecht(0, 0.27) } };
}

export type Einteiler = { name: string; text: string; /** rund: Flachband-Tor gilt */ rund: boolean; dok: () => Dokument };

/** Prüfkörper des Beweises, in der Reihenfolge der Planseite. */
export const EINTEILER: readonly Einteiler[] = [
  { name: 'kugel', text: 'Startkugel', rund: true, dok: () => extremKoerper('kugel').dok() },
  { name: 'ei', text: 'Ei', rund: true, dok: () => extremKoerper('ei').dok() },
  { name: 'wuerfel-scharf', text: 'Würfel, drei Quadrate mit Ecken', rund: false, dok: wuerfelScharfDokument },
  { name: 'zylinder', text: 'stehender Zylinder (Achse y)', rund: false, dok: zylinderDokument },
  { name: 'vase-rund', text: 'runde Vase (Achse y)', rund: true, dok: vaseRundDokument },
  { name: 'kegel', text: 'Florians Kegel (Firstgrat oben, Kiel unten, runde Ecken ohne Kennzeichnung)', rund: false, dok: () => extremKoerper('kegel').dok() },
  { name: 'wuerfel', text: 'Würfel wie mit dem Stift (Ecken r 0,03 = 14 px)', rund: false, dok: () => extremKoerper('wuerfel').dok() },
  { name: 'vase', text: 'Vase aus der Kugel (Front Ei: Rand als Messerkante)', rund: true, dok: () => extremKoerper('vase').dok() },
];

export function einteiler(name: string): Einteiler {
  const k = EINTEILER.find((e) => e.name === name);
  if (!k) throw new Error(`unbekannter Einteiler: ${name}`);
  return k;
}
