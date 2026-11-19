// Ozzys Kopf als Modell (Plan docs/plans/2026-11-19-ozzy-modell.md): der Kopf aus der Front aufgeblasen (von vorn genau Florians Umriss),
// Tiefe aus der Seite angenähert; darauf sein Weiß aus der Front, nach hinten bis zu einer Grenze aus der Seite; ringsum ein schwarzer Rand
// fester Breite (so zeichnet er das Weiß in jeder Ansicht). Nase und Ohren genauso aufgeblasen, schwarz, ohne Rand. Ohne DOM.
import { type Form, verschieben } from '../form';
import { koerperUrsprung } from '../raster';
import { type Gitter, gitterUm, lesen } from '../raum/gitter';
import type { AnsichtName, FigurDaten, TeilName } from '../vorlagen/import';
import {
  abstandVon,
  aufblasen,
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

export interface ModellTeil {
  name: string;
  art: 'gesicht' | 'schwarz';
  teil: Teil3;
  netz: Netz3;
}

export interface KopfModell {
  teile: ModellTeil[];
  /** Florians Weiß von vorn (Abstandsfeld, innen negativ) */
  weiss: Flaeche;
  /** dasselbe, ohne flaches Schwarz am Umriss (für Flächen, die zur Seite schauen) */
  weissRein: Flaeche;
  /** Florians Weiß von der Seite (z, y) */
  weissSeite: Flaeche;
  /** Weiß nur, wo z größer ist als die Grenze dieser Zeile (y = y0 + j·s) */
  grenze: { y0: number; s: number; z: Float32Array };
  /** Breite des schwarzen Rands ums Weiß (Grundbreite) */
  rand: number;
  /** Breite des Rands je Stelle (von vorn, Körperkoordinaten) */
  randFeld: { g: Gitter; w: Float32Array };
  zeiten: Record<string, number>;
}

export interface KopfOptionen {
  /** Breite des schwarzen Rands (Einheiten) */
  rand?: number;
  /** Abstand des Gitters fürs Netz */
  netz?: number;
  /** wie weit das Weiß an der Seite hinter die dickste Stelle reicht */
  hinten?: number;
  /** Schwarz am Umriss, das weniger tief in den Kopf reicht, wird weiß (Einheiten) */
  streifen?: number;
  /** dickste Stelle: so weit vor dem Ende des Weiß in der Seitenzeichnung (ohne Angabe: Mitte der Tiefe) */
  vorZurMitte?: number | undefined;
}

export const KOPF_TEILE: TeilName[] = ['ohrA', 'ohrB', 'ohrSpalt', 'kopfA', 'kopfB', 'bartA', 'bartB', 'nase'];

/**
 * Breite von Florians schwarzem Rand je Stelle (von vorn): am äußeren Umriss der Abstand zu seinem Weiß (zwischen 4 und 26); wo kein Weiß
 * nahe ist (Kappe, weiter als 30), die Grundbreite. Nach innen und außen glatt fortgesetzt (Laplace), auf einem Gitter von 1 Einheit.
 */
export function randBreiten(umriss: Flaeche, weiss: Flaeche, grund: number): { g: Gitter; w: Float32Array } {
  const g = gitterUm(umriss.kasten, 1, 30);
  const N = g.b * g.h;
  const w = new Float32Array(N).fill(grund);
  const fest = new Uint8Array(N);
  for (let j = 0; j < g.h; j++)
    for (let i = 0; i < g.b; i++) {
      const x = g.x0 + (i + 0.5) * g.s;
      const y = g.y0 + (j + 0.5) * g.s;
      if (Math.abs(lesen(umriss.abstand, umriss.g, x, y)) > 0.75) continue;
      const zumWeiss = lesen(weiss.abstand, weiss.g, x, y);
      w[j * g.b + i] = zumWeiss > 30 ? grund : Math.max(4, Math.min(26, zumWeiss));
      fest[j * g.b + i] = 1;
    }
  for (let r = 0; r < 500; r++)
    for (let j = 1; j + 1 < g.h; j++)
      for (let i = 1; i + 1 < g.b; i++) {
        const n = j * g.b + i;
        if (fest[n]) continue;
        w[n] = 0.25 * (w[n - 1]! + w[n + 1]! + w[n - g.b]! + w[n + g.b]!);
      }
  return { g, w };
}

/** größtes zusammenhängendes Stück einer Maske (Nachbarn in vier Richtungen) */
export function groesstesStueck(m: Uint8Array, g: Gitter): Uint8Array {
  const marke = new Int32Array(m.length);
  let beste = 0;
  let besteGroesse = 0;
  let nr = 0;
  const stapel: number[] = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || marke[s]) continue;
    nr++;
    let groesse = 0;
    marke[s] = nr;
    stapel.push(s);
    while (stapel.length) {
      const c = stapel.pop()!;
      groesse++;
      const i = c % g.b;
      for (const n of [i > 0 ? c - 1 : -1, i + 1 < g.b ? c + 1 : -1, c - g.b, c + g.b])
        if (n >= 0 && n < m.length && m[n] && !marke[n]) {
          marke[n] = nr;
          stapel.push(n);
        }
    }
    if (groesse > besteGroesse) {
      besteGroesse = groesse;
      beste = nr;
    }
  }
  const out = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) out[i] = marke[i] === beste ? 1 : 0;
  return out;
}

export function formenVon(d: FigurDaten, n: AnsichtName, namen: TeilName[]): Form[] {
  const a = d.ansichten[n];
  const u = koerperUrsprung(a);
  return a.teile.filter((t) => namen.includes(t.name)).map((t) => verschieben(t.form, -u[0], -u[1]));
}

export function kopfBauen(d: FigurDaten, o: KopfOptionen = {}): KopfModell {
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
  // Der Kopf von vorn: Florians äußerer Umriss (Schwarz und Weiß zusammen), an jeder Stelle um die Breite seines schwarzen Rands dort
  // verkleinert; der Rand kommt beim Zeichnen mit derselben Breite ringsum dazu. So endet der Kopf überall genau an seinem Weiß (kein
  // flaches Schwarz bleibt auf der Fläche, das von der Seite zum Balken würde), und von vorn stimmt sein Rand. Wo kein Weiß nahe ist
  // (Kappe), gilt die Grundbreite. Augenlinien und Zacken sind gemalt, nicht geformt. Nur das größte Stück bleibt, leicht geschlossen.
  const kf0 = flaecheAus(formenVon(d, 'front', KOPF), 0.5, 24);
  const g = kf0.g;
  const bartFront = flaecheAufGitter(formenVon(d, 'front', ['bartA', 'bartB']), g);
  const randFeld = randBreiten(kf0, bartFront, rand);
  const kern0 = new Uint8Array(g.b * g.h);
  for (let j = 0; j < g.h; j++)
    for (let i = 0; i < g.b; i++) {
      const x = g.x0 + (i + 0.5) * g.s;
      const y = g.y0 + (j + 0.5) * g.s;
      kern0[j * g.b + i] = kf0.abstand[j * g.b + i]! < -lesen(randFeld.w, randFeld.g, x, y) ? 1 : 0;
    }
  const RUNDUNG = 8;
  const kern = groesstesStueck(kern0, g);
  const kf = flaecheAusMaske(maskeUnter(flaecheAusMaske(maskeUnter(flaecheAusMaske(kern, g), RUNDUNG), g), -RUNDUNG), g);
  const ks = flaecheAus(formenVon(d, 'profil', KOPF));
  const kh = aufblasen(abstandVon(kf), kf.kasten);
  // Florians Weiß von der Seite: Je Höhe, wo es nach hinten endet. Dorthin kommt die dickste Stelle des Kopfs: Das Gesicht ist lang,
  // der Hinterkopf kurz, und das Weiß der Front (die vordere Hälfte) bedeckt von selbst die Seite des Gesichts bis dorthin
  const ws = flaecheAus(formenVon(d, 'profil', ['bartA', 'bartB']));
  const dw = abstandVon(ws);
  const weissHinten = (y: number): number | null => {
    for (let z = ws.kasten[0] - 1; z <= ws.kasten[2] + 1; z += 0.5) if (dw(z, y) < 0) return z;
    return null;
  };
  const kopf: Teil3 = {
    hoehe: kh,
    tiefe: tiefeAusSeite(kh, ks, { vorn: rand, hinten: rand, glatt: 12, glattMass: 25, massMax: 2.6, mitte: o.vorZurMitte === undefined ? undefined : (y) => { const z = weissHinten(y); return z === null ? null : z + o.vorZurMitte!; } }),
  };
  uhr('kopf');
  const teil = (front: Form[], seite: Form[], S = 1): Teil3 => {
    const f = flaecheAus(front, 0.5);
    const s = flaecheAus(seite, 0.5);
    const hh = aufblasen(abstandVon(f), f.kasten, S);
    return { hoehe: hh, tiefe: tiefeAusSeite(hh, s, { glatt: 6 }) };
  };
  // Ohren: von vorn jedes für sich, Tiefe aus dem nahen Ohr der Seite (Florian zeichnet das ferne schmaler)
  const ohrSeite = formenVon(d, 'profil', ['ohrA']);
  const ohrA = teil(formenVon(d, 'front', ['ohrA']), ohrSeite);
  const ohrB = teil(formenVon(d, 'front', ['ohrB']), ohrSeite);
  const nase = teil(formenVon(d, 'front', ['nase']), formenVon(d, 'profil', ['nase']), 0.5);
  uhr('teile');
  // Weiß von vorn, genau Florians Weiß; an der Seite bis dorthin, wo es in seiner Seitenzeichnung endet
  const weiss = bartFront;
  const weissRein = bartFront;
  const n = kopf.tiefe.mitte.length;
  const grenze = new Float32Array(n);
  // bis dorthin, wo das Weiß in der Seitenzeichnung endet, höchstens `hinten` hinter die dickste Stelle, mindestens 5 hinter ihr
  for (let j = 0; j < n; j++) {
    const y = kopf.tiefe.y0 + j * kopf.tiefe.s;
    const c = kopf.tiefe.mitte[j]!;
    const zw = weissHinten(y);
    grenze[j] = Math.max(c - (o.hinten ?? 60), Math.min(c - 5, zw ?? c - 5));
  }
  // in der Höhe geglättet
  const roh = Float32Array.from(grenze);
  for (let j = 0; j < n; j++) {
    let sw = 0;
    let sv = 0;
    for (let k = Math.max(0, j - 30); k <= Math.min(n - 1, j + 30); k++) {
      const q = Math.exp(-0.5 * (((k - j) * kopf.tiefe.s) / 8) ** 2);
      sw += q;
      sv += q * roh[k]!;
    }
    grenze[j] = sv / sw;
  }
  uhr('weiss');
  const netz = (t: Teil3, hn = h): Netz3 => netzAus((x, y, z) => feld(t, x, y, z), quader(t), hn);
  const teile: ModellTeil[] = [
    { name: 'kopf', art: 'gesicht', teil: kopf, netz: netz(kopf) },
    { name: 'ohrA', art: 'schwarz', teil: ohrA, netz: netz(ohrA) },
    { name: 'ohrB', art: 'schwarz', teil: ohrB, netz: netz(ohrB) },
    { name: 'nase', art: 'schwarz', teil: nase, netz: netz(nase, 0.75) },
  ];
  uhr('netze');
  return { teile, weiss, weissRein, weissSeite: ws, randFeld, grenze: { y0: kopf.tiefe.y0, s: kopf.tiefe.s, z: grenze }, rand, zeiten };
}
