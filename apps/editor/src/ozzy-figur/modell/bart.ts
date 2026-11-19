// Ozzys Kopf mit dem Bart als eigener Form (Florian, 19.11.: „Bart als eigene Form“; Plan docs/plans/2026-11-19-ozzy-modell.md, nächster
// Schritt). Sein 3/4 zeigt es: Das Weiß behält fast seine Frontform, und auf der nahen Seite erscheint breites Schwarz, der Kopf hinter dem
// Bart. Also zwei Körper:
//   Bart: ein weißer Block. Von vorn genau Florians Weiß (Zeile für Zeile gefüllt: Augenkerben und Zacken sind gemalt), in die Tiefe so weit,
//   wie sein Weiß in der Seitenzeichnung reicht (Zeile für Zeile), vorn zum Rand hin gewölbt, Kanten gerundet. Vorn trägt er das Weiß der
//   Front, an den Seiten das Weiß der Seitenzeichnung. Ringsum ein schwarzer Rand in der Breite seines Rands von vorn.
//   Schädel: schwarz, von vorn genau sein schwarzer Umriss, aufgeblasen. Breit nur hinter dem Bart, vorn steckt er kurz im Bart.
// Nase und Ohren wie im runden Kopf. Ohne DOM.
import type { Form } from '../form';
import type { Gitter } from '../raum/gitter';
import type { FigurDaten, TeilName } from '../vorlagen/import';
import {
  abstandVon,
  aufblasen,
  type Block,
  blockBei,
  blockFeld,
  blockQuader,
  feld,
  type Flaeche,
  flaecheAufGitter,
  flaecheAus,
  flaecheAusMaske,
  maskeUnter,
  type Netz3,
  netzAus,
  quader,
  type Teil3,
  tiefeAusSeite,
} from './aufblasen';
import { formenVon, groesstesStueck, randBreiten } from './kopf';

export interface BartTeil {
  name: string;
  art: 'bart' | 'schwarz';
  netz: Netz3;
}

export interface BartKopf {
  teile: BartTeil[];
  /** Florians Weiß von vorn (x, y) und von der Seite (z, y) */
  weiss: Flaeche;
  weissSeite: Flaeche;
  /** Breite des schwarzen Rands je Stelle (von vorn) */
  randFeld: { g: Gitter; w: Float32Array };
  zeiten: Record<string, number>;
}

export interface BartOptionen {
  /** Grundbreite des schwarzen Rands */
  rand?: number;
  netz?: number;
  /** Rundung der Kanten des Barts, Wölbung vorn */
  rundung?: number;
  woelbung?: number;
  /** wie weit der Schädel vor das hintere Ende des Barts reicht */
  schaedelVorn?: number;
  /** hinteres Ende des Barts: Anteil der Tiefe aus der Seite, um den es nach vorn rückt (0: wie gezeichnet) */
  flacher?: number;
  /** Schädel nur bis zu dieser Höhe (darunter hängt der Bart) */
  schaedelBis?: number;
  /** Mitte der Nase vor der Vorderseite des Barts */
  naseVor?: number;
}

/** je Zeile von der ersten bis zur letzten Zelle der Maske gefüllt */
function zeilenHuelle(m: Uint8Array, g: Gitter): Uint8Array {
  const out = new Uint8Array(m.length);
  for (let j = 0; j < g.h; j++) {
    let a = -1;
    let e = -1;
    for (let i = 0; i < g.b; i++)
      if (m[j * g.b + i]) {
        if (a < 0) a = i;
        e = i;
      }
    if (a >= 0) out.fill(1, j * g.b + a, j * g.b + e + 1);
  }
  return out;
}

/** gewichtet geglättet (Gauß, σ in Zeilen); Zeilen ohne Wert (NaN) bekommen ihn aus den Nachbarn */
function glaetten(v: Float32Array, sigma: number): Float32Array {
  const out = new Float32Array(v.length);
  for (let j = 0; j < v.length; j++) {
    let sw = 0;
    let sv = 0;
    for (const s of [sigma, 4 * sigma, 16 * sigma]) {
      const r = Math.ceil(3 * s);
      for (let k = Math.max(0, j - r); k <= Math.min(v.length - 1, j + r); k++) {
        if (Number.isNaN(v[k]!)) continue;
        const q = Math.exp(-0.5 * ((k - j) / s) ** 2);
        sw += q;
        sv += q * v[k]!;
      }
      if (sw > 1e-3) break;
    }
    out[j] = sw > 0 ? sv / sw : 0;
  }
  return out;
}

export function bartKopfBauen(d: FigurDaten, o: BartOptionen = {}): BartKopf {
  const rand = o.rand ?? 10;
  const h = o.netz ?? 1.5;
  const zeiten: Record<string, number> = {};
  let t0 = performance.now();
  const uhr = (n: string): void => {
    const t = performance.now();
    zeiten[n] = Math.round(t - t0);
    t0 = t;
  };
  const KOPF: TeilName[] = ['kopfA', 'kopfB', 'bartA', 'bartB'];
  const kf = flaecheAus(formenVon(d, 'front', KOPF), 0.5, 24);
  const g = kf.g;
  const weiss = flaecheAufGitter(formenVon(d, 'front', ['bartA', 'bartB']), g);
  const weissSeite = flaecheAus(formenVon(d, 'profil', ['bartA', 'bartB']));
  const randFeld = randBreiten(kf, weiss, rand);

  // ---- Bart: Florians Weiß von vorn, Zeile für Zeile gefüllt, leicht geschlossen; Tiefe aus dem Weiß der Seite ----
  const huelle = groesstesStueck(zeilenHuelle(maskeUnter(weiss, 0), g), g);
  const bartFlaeche = flaecheAusMaske(maskeUnter(flaecheAusMaske(maskeUnter(flaecheAusMaske(huelle, g), 6), g), -6), g);
  const S = 1;
  const y0 = Math.floor(bartFlaeche.kasten[1]) - 2;
  const n = Math.ceil(bartFlaeche.kasten[3] + 2 - y0) + 1;
  const hinten = new Float32Array(n).fill(Number.NaN);
  const vorn = new Float32Array(n).fill(Number.NaN);
  const ds = abstandVon(weissSeite);
  for (let j = 0; j < n; j++) {
    const y = y0 + j * S;
    for (let z = weissSeite.kasten[0] - 1; z <= weissSeite.kasten[2] + 1; z += 0.5)
      if (ds(z, y) < 0) {
        if (Number.isNaN(hinten[j]!)) hinten[j] = z;
        vorn[j] = z;
      }
  }
  const vornG = glaetten(vorn, 6);
  const hintenG = glaetten(hinten, 6);
  const flacher = o.flacher ?? 0;
  for (let j = 0; j < n; j++) hintenG[j] = hintenG[j]! + flacher * (vornG[j]! - hintenG[j]!);
  const block: Block = {
    flaeche: bartFlaeche,
    y0,
    s: S,
    hinten: hintenG,
    vorn: vornG,
    rundung: o.rundung ?? 8,
    woelbung: o.woelbung ?? 30,
    woelbWeite: 50,
  };
  uhr('bart');

  // ---- Schädel: Florians schwarzer Umriss von vorn, aufgeblasen; hinten aus der Seite, dickste Stelle knapp hinter dem Bart, vorn kurz ----
  const ks = flaecheAus(formenVon(d, 'profil', KOPF));
  const bis = o.schaedelBis ?? Infinity;
  const sm = maskeUnter(kf, 0);
  for (let j = 0; j < g.h; j++) if (g.y0 + (j + 0.5) * g.s > bis) sm.fill(0, j * g.b, (j + 1) * g.b);
  const sf = flaecheAusMaske(maskeUnter(flaecheAusMaske(maskeUnter(flaecheAusMaske(groesstesStueck(sm, g), g), 10), g), -10), g);
  const kh = aufblasen(abstandVon(sf), sf.kasten);
  const imBart = (y: number): boolean => y >= bartFlaeche.kasten[1] + 6 && y <= bartFlaeche.kasten[3] - 6;
  const schaedel: Teil3 = {
    hoehe: kh,
    tiefe: tiefeAusSeite(kh, ks, {
      glatt: 10,
      glattMass: 14,
      massMax: 2.6,
      mitte: (y) => (imBart(y) ? blockBei(block, y)[0] - 5 : null),
      vornBei: (y) => (imBart(y) ? blockBei(block, y)[0] + (o.schaedelVorn ?? 25) : null),
    }),
  };
  uhr('schaedel');

  const teil = (front: Form[], seite: Form[], S2 = 1): Teil3 => {
    const f = flaecheAus(front, 0.5);
    const s = flaecheAus(seite, 0.5);
    const hh = aufblasen(abstandVon(f), f.kasten, S2);
    return { hoehe: hh, tiefe: tiefeAusSeite(hh, s, { glatt: 6 }) };
  };
  const ohrSeite = formenVon(d, 'profil', ['ohrA']);
  const ohrA = teil(formenVon(d, 'front', ['ohrA']), ohrSeite);
  const ohrB = teil(formenVon(d, 'front', ['ohrB']), ohrSeite);
  const nase = teil(formenVon(d, 'front', ['nase']), formenVon(d, 'profil', ['nase']), 0.5);
  // die Nase sitzt vorn auf der Schnauze: ihre Mitte so weit vor der Vorderseite des Barts, wie sie in der Seite vor dem Weiß liegt
  {
    const t = nase.tiefe;
    for (let j = 0; j < t.mitte.length; j++) {
      const y = t.y0 + j * t.s;
      const vor = blockBei(block, y)[1];
      t.mitte[j] = Math.max(t.mitte[j]!, vor + (o.naseVor ?? 6));
    }
  }
  uhr('teile');

  const netz = (t: Teil3, hn = h): Netz3 => netzAus((x, y, z) => feld(t, x, y, z), quader(t), hn);
  const teile: BartTeil[] = [
    { name: 'schaedel', art: 'schwarz', netz: netz(schaedel) },
    { name: 'bart', art: 'bart', netz: netzAus((x, y, z) => blockFeld(block, x, y, z), blockQuader(block), h) },
    { name: 'ohrA', art: 'schwarz', netz: netz(ohrA) },
    { name: 'ohrB', art: 'schwarz', netz: netz(ohrB) },
    { name: 'nase', art: 'schwarz', netz: netz(nase, 0.75) },
  ];
  uhr('netze');

  return { teile, weiss, weissSeite, randFeld, zeiten };
}
